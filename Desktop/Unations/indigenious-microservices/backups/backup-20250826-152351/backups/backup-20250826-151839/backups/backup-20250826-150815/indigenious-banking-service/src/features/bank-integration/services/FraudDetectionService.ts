/**
 * Real-Time Fraud Detection Service
 * SOC 2 Type II Compliant Financial Fraud Prevention
 * 
 * SOC 2 Controls Addressed:
 * - CC6.1: Logical and physical access controls
 * - CC6.8: Prevention and detection of malicious software
 * - CC7.1: Detection and monitoring of security events
 * - CC7.2: Monitoring of system performance
 * - A1.1: Capacity planning and monitoring
 */

import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { auditLogger } from './AuditLogger';
import { redisEncryption } from './RedisEncryptionService';
import { mfaService } from './MFAService';
import { intelligentVerificationService } from './IntelligentVerificationService';
import prisma from '@/lib/prisma';
import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs-node';
import { createHash } from 'crypto';

// Fraud detection schemas
const TransactionContextSchema = z.object({
  transactionId: z.string(),
  userId: z.string(),
  businessId: z.string(),
  amount: z.number().positive(),
  currency: z.enum(['CAD', 'USD']),
  type: z.enum(['payment', 'transfer', 'withdrawal', 'deposit']),
  fromAccount: z.string(),
  toAccount: z.string(),
  timestamp: z.date(),
  ipAddress: z.string(),
  userAgent: z.string(),
  geolocation: z.object({
    country: z.string(),
    region: z.string(),
    city: z.string(),
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  deviceFingerprint: z.string().optional(),
  sessionId: z.string(),
  metadata: z.record(z.any()).optional()
});

const FraudRiskScoreSchema = z.object({
  transactionId: z.string(),
  overallRisk: z.number().min(0).max(100),
  fraudProbability: z.number().min(0).max(1),
  riskFactors: z.array(z.object({
    factor: z.string(),
    score: z.number(),
    weight: z.number(),
    description: z.string()
  })),
  mlScore: z.number().min(0).max(1),
  ruleBasedScore: z.number().min(0).max(100),
  behavioralScore: z.number().min(0).max(100),
  velocityScore: z.number().min(0).max(100),
  decision: z.enum(['approve', 'review', 'challenge', 'block']),
  reasons: z.array(z.string()),
  requiresMFA: z.boolean(),
  requiresManualReview: z.boolean(),
  confidence: z.number().min(0).max(1),
  timestamp: z.date()
});

type TransactionContext = z.infer<typeof TransactionContextSchema>;
type FraudRiskScore = z.infer<typeof FraudRiskScoreSchema>;

// Fraud patterns and rules
interface FraudRule {
  id: string;
  name: string;
  description: string;
  evaluate: (context: TransactionContext, history: TransactionHistory) => Promise<number>;
  weight: number;
  threshold: number;
  action: 'flag' | 'block' | 'mfa' | 'review';
}

interface TransactionHistory {
  recentTransactions: any[];
  dailyVolume: number;
  weeklyVolume: number;
  monthlyVolume: number;
  averageTransaction: number;
  locationHistory: string[];
  deviceHistory: string[];
  failedAttempts: number;
}

export class FraudDetectionService extends EventEmitter {
  private static instance: FraudDetectionService;
  private mlModel: tf.LayersModel | null = null;
  private rules: Map<string, FraudRule> = new Map();
  private readonly CACHE_PREFIX = 'fraud:';
  private readonly VELOCITY_WINDOW = 3600; // 1 hour in seconds
  private readonly ML_THRESHOLD = 0.7;
  private readonly BLOCK_THRESHOLD = 85;
  private readonly REVIEW_THRESHOLD = 60;
  private readonly MFA_THRESHOLD = 40;
  
  // Real-time monitoring
  private metrics = {
    transactionsAnalyzed: 0,
    fraudsDetected: 0,
    falsePositives: 0,
    processingTime: [] as number[],
    blockedTransactions: 0
  };
  
  private constructor() {
    super();
    this.initializeRules();
    this.loadMLModel();
    this.setupMetricsReporting();
  }
  
  static getInstance(): FraudDetectionService {
    if (!FraudDetectionService.instance) {
      FraudDetectionService.instance = new FraudDetectionService();
    }
    return FraudDetectionService.instance;
  }
  
  /**
   * Analyze transaction for fraud in real-time
   * SOC 2 CC7.1: Real-time security event detection
   */
  async analyzeTransaction(
    context: TransactionContext,
    options?: {
      skipMLAnalysis?: boolean;
      forceManualReview?: boolean;
      enhancedChecks?: boolean;
    }
  ): Promise<FraudRiskScore> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedContext = TransactionContextSchema.parse(context);
      
      // Get transaction history
      const history = await this.getTransactionHistory(
        validatedContext.userId,
        validatedContext.businessId
      );
      
      // Check if transaction is in cache (duplicate detection)
      const isDuplicate = await this.checkDuplicateTransaction(validatedContext);
      if (isDuplicate) {
        return this.createBlockedScore(
          validatedContext.transactionId,
          'Duplicate transaction detected'
        );
      }
      
      // Run parallel analysis
      const [
        mlScore,
        ruleBasedScore,
        behavioralScore,
        velocityScore,
        businessRiskScore
      ] = await Promise.all([
        options?.skipMLAnalysis ? 0 : this.runMLAnalysis(validatedContext, history),
        this.runRuleBasedAnalysis(validatedContext, history),
        this.runBehavioralAnalysis(validatedContext, history),
        this.runVelocityAnalysis(validatedContext, history),
        this.getBusinessRiskScore(validatedContext.businessId)
      ]);
      
      // Calculate overall risk
      const riskFactors = this.calculateRiskFactors({
        mlScore,
        ruleBasedScore,
        behavioralScore,
        velocityScore,
        businessRiskScore
      });
      
      const overallRisk = this.calculateOverallRisk(riskFactors);
      const fraudProbability = mlScore;
      
      // Determine action
      const decision = this.determineDecision(overallRisk, fraudProbability);
      const requiresMFA = decision === 'challenge' || overallRisk >= this.MFA_THRESHOLD;
      const requiresManualReview = decision === 'review' || options?.forceManualReview || false;
      
      // Create risk score
      const riskScore: FraudRiskScore = {
        transactionId: validatedContext.transactionId,
        overallRisk,
        fraudProbability,
        riskFactors,
        mlScore,
        ruleBasedScore,
        behavioralScore,
        velocityScore,
        decision,
        reasons: this.generateReasons(riskFactors, decision),
        requiresMFA,
        requiresManualReview,
        confidence: this.calculateConfidence(riskFactors),
        timestamp: new Date()
      };
      
      // Store analysis result
      await this.storeAnalysisResult(riskScore);
      
      // Log high-risk transactions
      if (overallRisk >= this.REVIEW_THRESHOLD) {
        await this.logHighRiskTransaction(validatedContext, riskScore);
      }
      
      // Emit events for real-time monitoring
      this.emit('transaction-analyzed', {
        transactionId: validatedContext.transactionId,
        risk: overallRisk,
        decision
      });
      
      if (decision === 'block') {
        this.emit('fraud-detected', {
          transaction: validatedContext,
          score: riskScore
        });
      }
      
      // Update metrics
      this.updateMetrics(Date.now() - startTime, decision);
      
      // Audit log
      await auditLogger.logEvent({
        eventType: 'fraud_detected',
        action: 'analyze_transaction',
        result: decision === 'approve' ? 'success' : 'failure',
        metadata: {
          transactionId: validatedContext.transactionId,
          overallRisk,
          decision,
          processingTime: Date.now() - startTime
        }
      });
      
      return riskScore;
      
    } catch (error) {
      logger.error('Fraud detection error', { error, context });
      
      // Fail-safe: allow with manual review for system errors
      return {
        transactionId: context.transactionId,
        overallRisk: 50,
        fraudProbability: 0.5,
        riskFactors: [],
        mlScore: 0,
        ruleBasedScore: 0,
        behavioralScore: 0,
        velocityScore: 0,
        decision: 'review',
        reasons: ['System error - manual review required'],
        requiresMFA: true,
        requiresManualReview: true,
        confidence: 0,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Run ML-based fraud analysis
   * SOC 2 CC7.2: Advanced threat detection
   */
  private async runMLAnalysis(
    context: TransactionContext,
    history: TransactionHistory
  ): Promise<number> {
    if (!this.mlModel) {
      logger.warn('ML model not loaded, skipping ML analysis');
      return 0;
    }
    
    try {
      // Prepare features for ML model
      const features = this.prepareMLFeatures(context, history);
      
      // Run prediction
      const prediction = this.mlModel.predict(features) as tf.Tensor;
      const fraudProbability = (await prediction.data())[0];
      
      // Clean up tensors
      features.dispose();
      prediction.dispose();
      
      return fraudProbability;
      
    } catch (error) {
      logger.error('ML analysis failed', { error });
      return 0;
    }
  }
  
  /**
   * Run rule-based fraud detection
   */
  private async runRuleBasedAnalysis(
    context: TransactionContext,
    history: TransactionHistory
  ): Promise<number> {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [ruleId, rule] of this.rules) {
      try {
        const score = await rule.evaluate(context, history);
        
        if (score > rule.threshold) {
          totalScore += score * rule.weight;
          totalWeight += rule.weight;
          
          // Log rule trigger
          logger.info('Fraud rule triggered', {
            ruleId,
            ruleName: rule.name,
            score,
            threshold: rule.threshold
          });
        }
      } catch (error) {
        logger.error('Rule evaluation failed', { error, ruleId });
      }
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
  
  /**
   * Analyze user behavior patterns
   */
  private async runBehavioralAnalysis(
    context: TransactionContext,
    history: TransactionHistory
  ): Promise<number> {
    let behaviorScore = 0;
    
    // Time-based analysis
    const hour = context.timestamp.getHours();
    if (hour < 6 || hour > 23) {
      behaviorScore += 15; // Unusual hours
    }
    
    // Amount analysis
    if (context.amount > history.averageTransaction * 5) {
      behaviorScore += 25; // Significantly higher than average
    }
    
    // Location analysis
    if (context.geolocation && !history.locationHistory.includes(context.geolocation.country)) {
      behaviorScore += 30; // New country
    }
    
    // Device analysis
    if (context.deviceFingerprint && !history.deviceHistory.includes(context.deviceFingerprint)) {
      behaviorScore += 20; // New device
    }
    
    // Pattern analysis
    const recentSimilar = history.recentTransactions.filter(t => 
      Math.abs(t.amount - context.amount) < 0.01 &&
      t.toAccount === context.toAccount
    );
    
    if (recentSimilar.length > 2) {
      behaviorScore += 15; // Repeated pattern
    }
    
    return Math.min(100, behaviorScore);
  }
  
  /**
   * Analyze transaction velocity
   */
  private async runVelocityAnalysis(
    context: TransactionContext,
    history: TransactionHistory
  ): Promise<number> {
    let velocityScore = 0;
    
    // Check transaction frequency
    const recentCount = history.recentTransactions.filter(t => 
      t.timestamp > new Date(Date.now() - this.VELOCITY_WINDOW * 1000)
    ).length;
    
    if (recentCount > 10) {
      velocityScore += 30; // High frequency
    } else if (recentCount > 5) {
      velocityScore += 15;
    }
    
    // Check volume velocity
    if (history.dailyVolume > history.monthlyVolume * 0.2) {
      velocityScore += 25; // 20% of monthly volume in one day
    }
    
    // Check failed attempts
    if (history.failedAttempts > 3) {
      velocityScore += 20;
    }
    
    // Check for velocity spikes
    const currentHourVolume = history.recentTransactions
      .filter(t => t.timestamp > new Date(Date.now() - 3600000))
      .reduce((sum, t) => sum + t.amount, 0);
    
    if (currentHourVolume > history.dailyVolume * 0.5) {
      velocityScore += 25; // 50% of daily volume in one hour
    }
    
    return Math.min(100, velocityScore);
  }
  
  /**
   * Get business risk score from verification service
   */
  private async getBusinessRiskScore(businessId: string): Promise<number> {
    try {
      const riskScore = await intelligentVerificationService.verifyIndigenousBusiness(businessId);
      // Invert the score (high verification score = low risk)
      return 100 - riskScore.overallScore;
    } catch (error) {
      logger.error('Failed to get business risk score', { error, businessId });
      return 50; // Default medium risk
    }
  }
  
  /**
   * Initialize fraud detection rules
   */
  private initializeRules() {
    // High-value transaction rule
    this.rules.set('high_value', {
      id: 'high_value',
      name: 'High Value Transaction',
      description: 'Detects unusually high transaction amounts',
      evaluate: async (context, history) => {
        const threshold = Math.max(history.averageTransaction * 10, 50000);
        if (context.amount > threshold) {
          return (context.amount / threshold) * 100;
        }
        return 0;
      },
      weight: 0.3,
      threshold: 50,
      action: 'mfa'
    });
    
    // Rapid succession rule
    this.rules.set('rapid_succession', {
      id: 'rapid_succession',
      name: 'Rapid Succession',
      description: 'Multiple transactions in short time',
      evaluate: async (context, history) => {
        const recentCount = history.recentTransactions.filter(t => 
          t.timestamp > new Date(Date.now() - 300000) // 5 minutes
        ).length;
        return recentCount > 3 ? recentCount * 20 : 0;
      },
      weight: 0.2,
      threshold: 60,
      action: 'review'
    });
    
    // Geographic anomaly rule
    this.rules.set('geo_anomaly', {
      id: 'geo_anomaly',
      name: 'Geographic Anomaly',
      description: 'Transaction from unusual location',
      evaluate: async (context, history) => {
        if (!context.geolocation) return 0;
        
        // Check for impossible travel
        const lastTransaction = history.recentTransactions[0];
        if (lastTransaction?.geolocation) {
          const distance = this.calculateDistance(
            lastTransaction.geolocation,
            context.geolocation
          );
          const timeDiff = (context.timestamp.getTime() - lastTransaction.timestamp.getTime()) / 1000 / 3600; // hours
          const speed = distance / timeDiff;
          
          if (speed > 1000) { // Faster than commercial flight
            return 100;
          }
        }
        
        // Check for new country
        if (!history.locationHistory.includes(context.geolocation.country)) {
          return 75;
        }
        
        return 0;
      },
      weight: 0.25,
      threshold: 50,
      action: 'block'
    });
    
    // Account takeover pattern
    this.rules.set('account_takeover', {
      id: 'account_takeover',
      name: 'Account Takeover Pattern',
      description: 'Detects potential account takeover',
      evaluate: async (context, history) => {
        let score = 0;
        
        // New device + high value
        if (context.deviceFingerprint && 
            !history.deviceHistory.includes(context.deviceFingerprint) &&
            context.amount > history.averageTransaction * 3) {
          score += 50;
        }
        
        // Failed attempts followed by success
        if (history.failedAttempts > 2) {
          score += 30;
        }
        
        // Unusual time + new location
        const hour = context.timestamp.getHours();
        if ((hour < 6 || hour > 23) && 
            context.geolocation && 
            !history.locationHistory.includes(context.geolocation.city)) {
          score += 40;
        }
        
        return score;
      },
      weight: 0.35,
      threshold: 70,
      action: 'block'
    });
    
    // Money mule pattern
    this.rules.set('money_mule', {
      id: 'money_mule',
      name: 'Money Mule Pattern',
      description: 'Detects potential money mule activity',
      evaluate: async (context, history) => {
        // Quick in-and-out pattern
        const recentDeposits = history.recentTransactions.filter(t => 
          t.type === 'deposit' && 
          t.timestamp > new Date(Date.now() - 86400000) // 24 hours
        );
        
        const recentWithdrawals = history.recentTransactions.filter(t => 
          t.type === 'withdrawal' && 
          t.timestamp > new Date(Date.now() - 86400000)
        );
        
        if (recentDeposits.length > 0 && recentWithdrawals.length > 0) {
          const depositTotal = recentDeposits.reduce((sum, t) => sum + t.amount, 0);
          const withdrawalTotal = recentWithdrawals.reduce((sum, t) => sum + t.amount, 0);
          
          if (withdrawalTotal > depositTotal * 0.9) {
            return 80;
          }
        }
        
        return 0;
      },
      weight: 0.3,
      threshold: 60,
      action: 'review'
    });
  }
  
  /**
   * Load ML model for fraud detection
   */
  private async loadMLModel() {
    try {
      // In production, load from S3 or model serving platform
      // For now, create a simple neural network
      this.mlModel = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [20], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.3 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' })
        ]
      });
      
      logger.info('ML fraud detection model loaded');
    } catch (error) {
      logger.error('Failed to load ML model', { error });
    }
  }
  
  /**
   * Prepare features for ML model
   */
  private prepareMLFeatures(
    context: TransactionContext,
    history: TransactionHistory
  ): tf.Tensor2D {
    const features = [
      // Transaction features
      context.amount / 100000, // Normalize amount
      context.type === 'withdrawal' ? 1 : 0,
      context.type === 'transfer' ? 1 : 0,
      context.timestamp.getHours() / 24,
      context.timestamp.getDay() / 7,
      
      // History features
      history.recentTransactions.length / 100,
      history.dailyVolume / 1000000,
      history.averageTransaction / 10000,
      history.failedAttempts / 10,
      context.amount / (history.averageTransaction || 1),
      
      // Behavioral features
      history.deviceHistory.includes(context.deviceFingerprint || '') ? 0 : 1,
      history.locationHistory.includes(context.geolocation?.country || '') ? 0 : 1,
      
      // Velocity features
      history.recentTransactions.filter(t => 
        t.timestamp > new Date(Date.now() - 3600000)
      ).length / 20,
      
      // Risk features
      context.ipAddress.startsWith('10.') || context.ipAddress.startsWith('192.168.') ? 1 : 0,
      
      // Padding to reach 20 features
      0, 0, 0, 0, 0, 0
    ];
    
    return tf.tensor2d([features.slice(0, 20)]);
  }
  
  /**
   * Calculate risk factors from individual scores
   */
  private calculateRiskFactors(scores: {
    mlScore: number;
    ruleBasedScore: number;
    behavioralScore: number;
    velocityScore: number;
    businessRiskScore: number;
  }): FraudRiskScore['riskFactors'] {
    return [
      {
        factor: 'ML Analysis',
        score: scores.mlScore * 100,
        weight: 0.3,
        description: 'Machine learning fraud prediction'
      },
      {
        factor: 'Rule-Based Checks',
        score: scores.ruleBasedScore,
        weight: 0.25,
        description: 'Pattern and rule matching'
      },
      {
        factor: 'Behavioral Analysis',
        score: scores.behavioralScore,
        weight: 0.2,
        description: 'User behavior anomalies'
      },
      {
        factor: 'Velocity Checks',
        score: scores.velocityScore,
        weight: 0.15,
        description: 'Transaction frequency and volume'
      },
      {
        factor: 'Business Risk',
        score: scores.businessRiskScore,
        weight: 0.1,
        description: 'Business verification status'
      }
    ];
  }
  
  /**
   * Calculate overall risk score
   */
  private calculateOverallRisk(riskFactors: FraudRiskScore['riskFactors']): number {
    const weightedSum = riskFactors.reduce((sum, factor) => 
      sum + (factor.score * factor.weight), 0
    );
    
    return Math.round(weightedSum);
  }
  
  /**
   * Determine action based on risk scores
   */
  private determineDecision(
    overallRisk: number,
    fraudProbability: number
  ): FraudRiskScore['decision'] {
    // ML model has high confidence in fraud
    if (fraudProbability > this.ML_THRESHOLD) {
      return 'block';
    }
    
    // Rule-based blocking
    if (overallRisk >= this.BLOCK_THRESHOLD) {
      return 'block';
    }
    
    // Manual review required
    if (overallRisk >= this.REVIEW_THRESHOLD) {
      return 'review';
    }
    
    // MFA challenge
    if (overallRisk >= this.MFA_THRESHOLD) {
      return 'challenge';
    }
    
    return 'approve';
  }
  
  /**
   * Generate human-readable reasons for decision
   */
  private generateReasons(
    riskFactors: FraudRiskScore['riskFactors'],
    decision: FraudRiskScore['decision']
  ): string[] {
    const reasons: string[] = [];
    
    // Add high-scoring factors
    const highRiskFactors = riskFactors
      .filter(f => f.score > 60)
      .sort((a, b) => b.score - a.score);
    
    for (const factor of highRiskFactors) {
      reasons.push(`${factor.factor}: ${factor.description} (Risk: ${Math.round(factor.score)}%)`);
    }
    
    // Add decision reason
    switch (decision) {
      case 'block':
        reasons.push('Transaction blocked due to high fraud risk');
        break;
      case 'review':
        reasons.push('Manual review required due to suspicious patterns');
        break;
      case 'challenge':
        reasons.push('Additional authentication required');
        break;
      case 'approve':
        if (reasons.length === 0) {
          reasons.push('Transaction approved - low risk');
        }
        break;
    }
    
    return reasons;
  }
  
  /**
   * Calculate confidence in the risk assessment
   */
  private calculateConfidence(riskFactors: FraudRiskScore['riskFactors']): number {
    // Higher variance in scores = lower confidence
    const scores = riskFactors.map(f => f.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize standard deviation to confidence (0-1)
    const confidence = Math.max(0, 1 - (stdDev / 50));
    
    return Math.round(confidence * 100) / 100;
  }
  
  /**
   * Get transaction history for analysis
   */
  private async getTransactionHistory(
    userId: string,
    businessId: string
  ): Promise<TransactionHistory> {
    // Check cache first
    const cacheKey = `${this.CACHE_PREFIX}history:${userId}`;
    const cached = await redisEncryption.getEncrypted<TransactionHistory>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Fetch from database
    const [transactions, locations, devices] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          OR: [
            { userId },
            { businessId }
          ],
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.loginHistory.findMany({
        where: { userId },
        select: { ipAddress: true, location: true },
        distinct: ['location'],
        take: 10
      }),
      prisma.deviceHistory.findMany({
        where: { userId },
        select: { deviceFingerprint: true },
        distinct: ['deviceFingerprint'],
        take: 10
      })
    ]);
    
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const history: TransactionHistory = {
      recentTransactions: transactions,
      dailyVolume: transactions
        .filter(t => t.createdAt > dayAgo)
        .reduce((sum, t) => sum + t.amount, 0),
      weeklyVolume: transactions
        .filter(t => t.createdAt > weekAgo)
        .reduce((sum, t) => sum + t.amount, 0),
      monthlyVolume: transactions
        .filter(t => t.createdAt > monthAgo)
        .reduce((sum, t) => sum + t.amount, 0),
      averageTransaction: transactions.length > 0
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
        : 0,
      locationHistory: locations.map(l => l.location).filter(Boolean),
      deviceHistory: devices.map(d => d.deviceFingerprint),
      failedAttempts: transactions.filter(t => t.status === 'failed').length
    };
    
    // Cache for 5 minutes
    await redisEncryption.setEncrypted(cacheKey, history, 300);
    
    return history;
  }
  
  /**
   * Check for duplicate transactions
   */
  private async checkDuplicateTransaction(context: TransactionContext): Promise<boolean> {
    const hashKey = this.generateTransactionHash(context);
    const duplicateKey = `${this.CACHE_PREFIX}dup:${hashKey}`;
    
    const exists = await redisEncryption.getEncrypted(duplicateKey);
    if (exists) {
      return true;
    }
    
    // Store hash for 24 hours
    await redisEncryption.setEncrypted(duplicateKey, true, 86400);
    return false;
  }
  
  /**
   * Generate hash for duplicate detection
   */
  private generateTransactionHash(context: TransactionContext): string {
    const data = `${context.userId}:${context.amount}:${context.toAccount}:${Math.floor(context.timestamp.getTime() / 60000)}`; // 1-minute window
    return createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Store analysis result for audit and learning
   */
  private async storeAnalysisResult(score: FraudRiskScore): Promise<void> {
    try {
      await prisma.fraudAnalysis.create({
        data: {
          transactionId: score.transactionId,
          overallRisk: score.overallRisk,
          fraudProbability: score.fraudProbability,
          decision: score.decision,
          requiresMFA: score.requiresMFA,
          requiresManualReview: score.requiresManualReview,
          confidence: score.confidence,
          metadata: {
            riskFactors: score.riskFactors,
            reasons: score.reasons,
            mlScore: score.mlScore,
            ruleBasedScore: score.ruleBasedScore,
            behavioralScore: score.behavioralScore,
            velocityScore: score.velocityScore
          }
        }
      });
    } catch (error) {
      logger.error('Failed to store fraud analysis', { error });
    }
  }
  
  /**
   * Log high-risk transactions for investigation
   */
  private async logHighRiskTransaction(
    context: TransactionContext,
    score: FraudRiskScore
  ): Promise<void> {
    await auditLogger.logSecurityEvent({
      eventType: 'high_risk_transaction',
      userId: context.userId,
      severity: score.overallRisk >= this.BLOCK_THRESHOLD ? 'critical' : 'high',
      ipAddress: context.ipAddress,
      action: `Transaction ${score.decision}`,
      metadata: {
        transactionId: context.transactionId,
        amount: context.amount,
        overallRisk: score.overallRisk,
        decision: score.decision,
        reasons: score.reasons
      }
    });
    
    // Alert security team for critical risks
    if (score.overallRisk >= this.BLOCK_THRESHOLD) {
      this.emit('critical-fraud-alert', {
        transaction: context,
        score
      });
    }
  }
  
  /**
   * Create blocked transaction score
   */
  private createBlockedScore(transactionId: string, reason: string): FraudRiskScore {
    return {
      transactionId,
      overallRisk: 100,
      fraudProbability: 1,
      riskFactors: [],
      mlScore: 1,
      ruleBasedScore: 100,
      behavioralScore: 100,
      velocityScore: 100,
      decision: 'block',
      reasons: [reason],
      requiresMFA: false,
      requiresManualReview: false,
      confidence: 1,
      timestamp: new Date()
    };
  }
  
  /**
   * Calculate distance between two geographic points
   */
  private calculateDistance(loc1: any, loc2: any): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);
    const lat1 = this.toRad(loc1.latitude);
    const lat2 = this.toRad(loc2.latitude);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }
  
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(processingTime: number, decision: string) {
    this.metrics.transactionsAnalyzed++;
    this.metrics.processingTime.push(processingTime);
    
    if (decision === 'block') {
      this.metrics.fraudsDetected++;
      this.metrics.blockedTransactions++;
    }
    
    // Keep only last 1000 processing times
    if (this.metrics.processingTime.length > 1000) {
      this.metrics.processingTime = this.metrics.processingTime.slice(-1000);
    }
  }
  
  /**
   * Setup periodic metrics reporting
   */
  private setupMetricsReporting() {
    setInterval(() => {
      const avgProcessingTime = this.metrics.processingTime.length > 0
        ? this.metrics.processingTime.reduce((a, b) => a + b, 0) / this.metrics.processingTime.length
        : 0;
      
      logger.info('Fraud detection metrics', {
        transactionsAnalyzed: this.metrics.transactionsAnalyzed,
        fraudsDetected: this.metrics.fraudsDetected,
        blockedTransactions: this.metrics.blockedTransactions,
        avgProcessingTime: Math.round(avgProcessingTime),
        fraudRate: this.metrics.transactionsAnalyzed > 0
          ? (this.metrics.fraudsDetected / this.metrics.transactionsAnalyzed * 100).toFixed(2) + '%'
          : '0%'
      });
      
      // Emit metrics for monitoring
      this.emit('metrics', {
        ...this.metrics,
        avgProcessingTime
      });
    }, 60000); // Every minute
  }
  
  /**
   * Mark transaction as false positive
   * SOC 2: Continuous improvement
   */
  async markFalsePositive(
    transactionId: string,
    reviewerId: string,
    reason: string
  ): Promise<void> {
    try {
      await prisma.fraudAnalysis.update({
        where: { transactionId },
        data: {
          metadata: {
            falsePositive: true,
            reviewerId,
            reviewReason: reason,
            reviewedAt: new Date()
          }
        }
      });
      
      this.metrics.falsePositives++;
      
      await auditLogger.logEvent({
        eventType: 'data_update',
        userId: reviewerId,
        action: 'mark_false_positive',
        resource: {
          type: 'fraud_analysis',
          id: transactionId,
          name: 'Transaction fraud analysis'
        },
        metadata: { reason }
      });
      
    } catch (error) {
      logger.error('Failed to mark false positive', { error, transactionId });
    }
  }
  
  /**
   * Get fraud detection statistics
   */
  async getStatistics(timeRange?: { start: Date; end: Date }): Promise<any> {
    const where = timeRange ? {
      createdAt: {
        gte: timeRange.start,
        lte: timeRange.end
      }
    } : {};
    
    const [total, blocked, reviewed, falsePositives] = await Promise.all([
      prisma.fraudAnalysis.count({ where }),
      prisma.fraudAnalysis.count({ 
        where: { ...where, decision: 'block' } 
      }),
      prisma.fraudAnalysis.count({ 
        where: { ...where, decision: 'review' } 
      }),
      prisma.fraudAnalysis.count({ 
        where: { 
          ...where, 
          metadata: { 
            path: '$.falsePositive',
            equals: true 
          } 
        } 
      })
    ]);
    
    return {
      totalAnalyzed: total,
      totalBlocked: blocked,
      totalReviewed: reviewed,
      totalFalsePositives: falsePositives,
      blockRate: total > 0 ? (blocked / total * 100).toFixed(2) + '%' : '0%',
      reviewRate: total > 0 ? (reviewed / total * 100).toFixed(2) + '%' : '0%',
      falsePositiveRate: blocked > 0 ? (falsePositives / blocked * 100).toFixed(2) + '%' : '0%',
      currentMetrics: {
        ...this.metrics,
        avgProcessingTime: this.metrics.processingTime.length > 0
          ? Math.round(this.metrics.processingTime.reduce((a, b) => a + b, 0) / this.metrics.processingTime.length)
          : 0
      }
    };
  }
}

// Export singleton instance
export const fraudDetectionService = FraudDetectionService.getInstance();