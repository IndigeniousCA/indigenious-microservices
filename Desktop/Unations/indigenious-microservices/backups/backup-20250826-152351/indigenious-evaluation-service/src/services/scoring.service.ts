import { PrismaClient, ScoringMethod, NormalizationMethod, CriterionCategory } from '@prisma/client';
import { Redis } from 'ioredis';
import { z } from 'zod';
import Decimal from 'decimal.js';
import * as math from 'mathjs';
import CryptoJS from 'crypto-js';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const eventEmitter = new EventEmitter();

// Configure Decimal for precision
Decimal.set({ precision: 10, rounding: 4 });

export class ScoringService {
  private static readonly CACHE_PREFIX = 'scoring:';
  private static readonly CACHE_TTL = 1800; // 30 minutes

  /**
   * Calculate weighted score for a submission
   */
  static async calculateWeightedScore(submissionId: string, evaluationId: string) {
    // Get evaluation configuration
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        criteriaSet: {
          include: {
            criteria: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' }
            }
          }
        }
      }
    });

    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    // Get all criterion scores for submission
    const criterionScores = await prisma.criterionScore.findMany({
      where: {
        submissionEvalId: submissionId
      },
      include: {
        criterion: true
      }
    });

    // Apply community weightings if present
    const communityWeightings = evaluation.communityWeightings as any;
    
    // Calculate weighted scores
    let totalWeightedScore = new Decimal(0);
    let totalWeight = new Decimal(0);
    const categoryScores: Record<string, any> = {};

    for (const score of criterionScores) {
      const weight = this.getAdjustedWeight(
        score.criterion,
        communityWeightings
      );

      const normalizedScore = this.normalizeScore(
        score.score,
        score.maxScore,
        evaluation.criteriaSet.normalizationMethod
      );

      const weightedScore = new Decimal(normalizedScore).mul(weight);
      
      totalWeightedScore = totalWeightedScore.plus(weightedScore);
      totalWeight = totalWeight.plus(weight);

      // Track category scores
      const category = score.criterion.category;
      if (!categoryScores[category]) {
        categoryScores[category] = {
          score: new Decimal(0),
          weight: new Decimal(0),
          count: 0
        };
      }
      categoryScores[category].score = categoryScores[category].score.plus(weightedScore);
      categoryScores[category].weight = categoryScores[category].weight.plus(weight);
      categoryScores[category].count++;
    }

    // Calculate final score
    const finalScore = totalWeight.gt(0) 
      ? totalWeightedScore.div(totalWeight).toNumber()
      : 0;

    // Calculate category breakdowns
    const categoryBreakdown = Object.entries(categoryScores).reduce((acc, [cat, data]) => {
      acc[cat] = data.weight.gt(0) 
        ? data.score.div(data.weight).toNumber()
        : 0;
      return acc;
    }, {} as Record<string, number>);

    // Apply Indigenous bonus if applicable
    const indigenousBonus = await this.calculateIndigenousBonus(
      submissionId,
      evaluation.indigenousRequirement
    );

    const adjustedScore = Math.min(100, finalScore + indigenousBonus);

    return {
      baseScore: finalScore,
      indigenousBonus,
      finalScore: adjustedScore,
      categoryBreakdown,
      passingScore: evaluation.passingScore,
      isPassing: adjustedScore >= evaluation.passingScore,
      methodology: evaluation.criteriaSet.scoringMethod,
      totalCriteria: criterionScores.length
    };
  }

  /**
   * Apply Indigenous procurement preferences
   */
  static async applyIndigenousPreferences(
    submissionId: string,
    preferences: {
      indigenousOwnership?: number;
      localPreference?: number;
      bandAffiliation?: string;
      elderApproval?: boolean;
    }
  ) {
    const submission = await prisma.submissionEvaluation.findUnique({
      where: { id: submissionId }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    let preferenceScore = 0;
    const factors = [];

    // Indigenous ownership scoring (0-40 points)
    if (submission.isIndigenousBusiness && submission.indigenousOwnership) {
      if (submission.indigenousOwnership >= 51) {
        preferenceScore += 40;
        factors.push({
          factor: 'Majority Indigenous-owned',
          points: 40,
          weight: 'HIGH'
        });
      } else if (submission.indigenousOwnership >= 33) {
        preferenceScore += 25;
        factors.push({
          factor: 'Significant Indigenous ownership',
          points: 25,
          weight: 'MEDIUM'
        });
      } else if (submission.indigenousOwnership > 0) {
        preferenceScore += 10;
        factors.push({
          factor: 'Indigenous partnership',
          points: 10,
          weight: 'LOW'
        });
      }
    }

    // Band affiliation bonus (0-20 points)
    if (submission.bandAffiliation && preferences.bandAffiliation) {
      if (submission.bandAffiliation === preferences.bandAffiliation) {
        preferenceScore += 20;
        factors.push({
          factor: 'Same band affiliation',
          points: 20,
          weight: 'HIGH'
        });
      } else {
        // Check if same nation/treaty
        const sameNation = await this.checkSameNation(
          submission.bandAffiliation,
          preferences.bandAffiliation
        );
        if (sameNation) {
          preferenceScore += 10;
          factors.push({
            factor: 'Same nation/treaty',
            points: 10,
            weight: 'MEDIUM'
          });
        }
      }
    }

    // Local preference (0-20 points)
    if (preferences.localPreference && submission.localDistance !== null) {
      const distanceScore = this.calculateDistanceScore(
        submission.localDistance,
        preferences.localPreference
      );
      preferenceScore += distanceScore;
      factors.push({
        factor: `Local preference (${submission.localDistance}km)`,
        points: distanceScore,
        weight: distanceScore > 15 ? 'HIGH' : distanceScore > 10 ? 'MEDIUM' : 'LOW'
      });
    }

    // Elder approval bonus (0-10 points)
    if (preferences.elderApproval) {
      preferenceScore += 10;
      factors.push({
        factor: 'Elder approval obtained',
        points: 10,
        weight: 'HIGH'
      });
    }

    // Cultural alignment bonus (0-10 points)
    const culturalScore = await this.assessCulturalAlignment(submissionId);
    if (culturalScore > 0) {
      preferenceScore += culturalScore;
      factors.push({
        factor: 'Cultural alignment',
        points: culturalScore,
        weight: 'MEDIUM'
      });
    }

    // Update submission with Indigenous scoring
    await prisma.submissionEvaluation.update({
      where: { id: submissionId },
      data: {
        indigenousScore: preferenceScore
      }
    });

    return {
      totalScore: preferenceScore,
      maxPossible: 100,
      percentage: (preferenceScore / 100) * 100,
      factors,
      recommendation: this.getIndigenousRecommendation(preferenceScore)
    };
  }

  /**
   * Perform blind evaluation
   */
  static async performBlindEvaluation(
    evaluatorId: string,
    submissionId: string,
    scores: Array<{
      criterionId: string;
      score: number;
      justification: string;
      evidence: string[];
    }>
  ) {
    // Hash vendor information for blind evaluation
    const blindSubmissionId = this.generateBlindId(submissionId);
    
    // Store mapping securely
    await redis.setex(
      `blind:${blindSubmissionId}`,
      86400, // 24 hours
      submissionId
    );

    // Record scores without vendor identification
    const evaluatorScore = await prisma.evaluatorScore.create({
      data: {
        submissionEvalId: submissionId,
        evaluatorId,
        overallScore: 0, // Will calculate after all criteria scored
        confidence: 0.8,
        isBlind: true,
        comments: 'Blind evaluation completed',
        strengths: [],
        concerns: [],
        recommendations: [],
        wouldRecommend: false,
        completedAt: new Date()
      }
    });

    // Record individual criterion scores
    const criterionScores = [];
    for (const score of scores) {
      const criterion = await prisma.evaluationCriterion.findUnique({
        where: { id: score.criterionId }
      });

      if (!criterion) continue;

      const normalizedScore = this.normalizeScore(
        score.score,
        criterion.maxScore,
        'LINEAR'
      );

      const weightedScore = normalizedScore * (criterion.weight / 100);

      const criterionScore = await prisma.criterionScore.create({
        data: {
          submissionEvalId: submissionId,
          criterionId: score.criterionId,
          evaluatorScoreId: evaluatorScore.id,
          score: score.score,
          maxScore: criterion.maxScore,
          normalizedScore,
          weight: criterion.weight,
          weightedScore,
          justification: score.justification,
          evidence: score.evidence,
          strengthsNoted: [],
          improvementAreas: [],
          isMandatory: criterion.isMandatory,
          passed: criterion.isMandatory 
            ? score.score >= (criterion.minimumScore || 0)
            : true
        }
      });

      criterionScores.push(criterionScore);
    }

    // Calculate overall score
    const overallScore = criterionScores.reduce(
      (sum, cs) => sum + (cs.weightedScore || 0),
      0
    );

    // Update evaluator score
    await prisma.evaluatorScore.update({
      where: { id: evaluatorScore.id },
      data: {
        overallScore,
        wouldRecommend: overallScore >= 70
      }
    });

    return {
      blindId: blindSubmissionId,
      evaluatorScoreId: evaluatorScore.id,
      overallScore,
      criteriaEvaluated: criterionScores.length,
      status: 'completed'
    };
  }

  /**
   * Build consensus among evaluators
   */
  static async buildConsensus(
    evaluationId: string,
    submissionId: string,
    evaluatorIds: string[]
  ) {
    // Get all evaluator scores
    const evaluatorScores = await prisma.evaluatorScore.findMany({
      where: {
        submissionEvalId: submissionId,
        evaluatorId: { in: evaluatorIds }
      },
      include: {
        criterionScores: true
      }
    });

    if (evaluatorScores.length < 2) {
      throw new Error('Insufficient evaluators for consensus');
    }

    // Calculate score statistics
    const scores = evaluatorScores.map(es => es.overallScore);
    const mean = math.mean(scores);
    const median = math.median(scores);
    const stdDev = math.std(scores);
    const variance = math.variance(scores);

    // Identify outliers
    const outliers = this.identifyOutliers(scores);
    
    // Check if consensus is needed
    const consensusNeeded = stdDev > 10 || outliers.length > 0;

    if (consensusNeeded) {
      // Apply consensus building method
      const consensusResult = await this.applyConsensusMethod(
        evaluatorScores,
        'DISCUSSION'
      );

      // Record consensus
      const consensus = await prisma.consensusRecord.create({
        data: {
          evaluationId,
          submissionId,
          roundNumber: 1,
          participantIds: evaluatorIds,
          initialScores: scores,
          discussionNotes: `Variance: ${variance.toFixed(2)}, Outliers: ${outliers.length}`,
          disagreementPoints: this.identifyDisagreementPoints(evaluatorScores),
          resolutionMethod: 'DISCUSSION',
          finalScore: consensusResult.finalScore,
          variance,
          unanimousDecision: consensusResult.unanimous,
          dissenterIds: consensusResult.dissenters,
          recordedAt: new Date()
        }
      });

      // Update submission with consensus score
      await prisma.submissionEvaluation.update({
        where: { id: submissionId },
        data: {
          consensusReached: true,
          consensusScore: consensusResult.finalScore,
          totalScore: consensusResult.finalScore
        }
      });

      return {
        consensusReached: true,
        finalScore: consensusResult.finalScore,
        method: 'DISCUSSION',
        rounds: 1,
        variance,
        unanimous: consensusResult.unanimous,
        consensusId: consensus.id
      };
    } else {
      // No significant disagreement, use average
      const finalScore = mean;
      
      await prisma.submissionEvaluation.update({
        where: { id: submissionId },
        data: {
          consensusReached: true,
          consensusScore: finalScore,
          totalScore: finalScore
        }
      });

      return {
        consensusReached: true,
        finalScore,
        method: 'AUTOMATIC',
        rounds: 0,
        variance,
        unanimous: true
      };
    }
  }

  /**
   * Rank submissions
   */
  static async rankSubmissions(evaluationId: string) {
    // Get all evaluated submissions
    const submissions = await prisma.submissionEvaluation.findMany({
      where: {
        evaluationId,
        status: 'EVALUATED'
      },
      orderBy: {
        totalScore: 'desc'
      }
    });

    // Apply ranking rules
    const rankedSubmissions = [];
    let currentRank = 1;
    let previousScore = null;
    let tieCount = 0;

    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      
      // Check for mandatory criteria failures
      const mandatoryCheck = await this.checkMandatoryCriteria(submission.id);
      if (!mandatoryCheck.passed) {
        submission.status = 'DISQUALIFIED';
        submission.disqualificationReason = mandatoryCheck.reason;
        submission.rank = null;
      } else {
        // Handle ties
        if (previousScore !== null && Math.abs(submission.totalScore! - previousScore) < 0.01) {
          tieCount++;
        } else {
          currentRank += tieCount;
          tieCount = 1;
        }

        submission.rank = currentRank;
        previousScore = submission.totalScore;

        // Determine status based on rank
        if (currentRank === 1) {
          submission.status = 'WINNER';
        } else if (currentRank <= 3) {
          submission.status = 'RUNNER_UP';
        } else {
          submission.status = 'QUALIFIED';
        }
      }

      // Update submission
      await prisma.submissionEvaluation.update({
        where: { id: submission.id },
        data: {
          rank: submission.rank,
          status: submission.status,
          disqualificationReason: submission.disqualificationReason
        }
      });

      rankedSubmissions.push({
        submissionId: submission.id,
        vendorName: submission.vendorName,
        score: submission.totalScore,
        rank: submission.rank,
        status: submission.status,
        isIndigenous: submission.isIndigenousBusiness,
        indigenousOwnership: submission.indigenousOwnership
      });
    }

    // Update evaluation with results
    await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        finalRankings: rankedSubmissions,
        winningSubmissionId: rankedSubmissions.find(s => s.rank === 1)?.submissionId,
        winningScore: rankedSubmissions.find(s => s.rank === 1)?.score,
        averageScore: math.mean(submissions.map(s => s.totalScore || 0)),
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Generate audit trail
    await this.createAuditLog(evaluationId, 'RANKING_COMPLETED', {
      totalSubmissions: submissions.length,
      qualified: rankedSubmissions.filter(s => s.status === 'QUALIFIED').length,
      disqualified: rankedSubmissions.filter(s => s.status === 'DISQUALIFIED').length,
      winner: rankedSubmissions.find(s => s.rank === 1)
    });

    return {
      rankings: rankedSubmissions,
      statistics: {
        total: submissions.length,
        qualified: rankedSubmissions.filter(s => s.status !== 'DISQUALIFIED').length,
        disqualified: rankedSubmissions.filter(s => s.status === 'DISQUALIFIED').length,
        averageScore: math.mean(submissions.map(s => s.totalScore || 0)),
        medianScore: math.median(submissions.map(s => s.totalScore || 0)),
        indigenousWinners: rankedSubmissions.filter(s => s.isIndigenous && s.rank && s.rank <= 3).length
      }
    };
  }

  /**
   * Calibrate evaluator scoring
   */
  static async calibrateEvaluator(evaluatorId: string) {
    // Get evaluator's recent scores
    const recentScores = await prisma.evaluatorScore.findMany({
      where: {
        evaluatorId,
        completedAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      }
    });

    if (recentScores.length < 10) {
      return {
        status: 'INSUFFICIENT_DATA',
        message: 'Need at least 10 evaluations for calibration'
      };
    }

    // Analyze scoring patterns
    const scores = recentScores.map(s => s.overallScore);
    const avgScore = math.mean(scores);
    const stdDev = math.std(scores);
    
    // Compare to peer evaluators
    const peerAverage = await this.getPeerAverageScore();
    const deviation = Math.abs(avgScore - peerAverage);
    
    // Determine evaluator style
    let style = 'MODERATE';
    if (avgScore < peerAverage - 10) {
      style = 'STRICT';
    } else if (avgScore > peerAverage + 10) {
      style = 'LENIENT';
    }

    // Calculate calibration score
    const calibrationScore = Math.max(0, 100 - (deviation * 2) - (stdDev > 15 ? 20 : 0));

    // Generate recommendations
    const recommendations = [];
    if (style === 'STRICT') {
      recommendations.push('Consider full range of scoring scale');
      recommendations.push('Review high-performing submissions for positive attributes');
    } else if (style === 'LENIENT') {
      recommendations.push('Apply criteria more rigorously');
      recommendations.push('Review evaluation guidelines for minimum standards');
    }
    if (stdDev > 15) {
      recommendations.push('Aim for more consistent scoring across submissions');
    }

    // Store calibration result
    await prisma.scoringCalibration.create({
      data: {
        evaluatorId,
        calibrationDate: new Date(),
        testSubmissions: recentScores.slice(0, 5).map(s => s.id),
        referenceScores: { peerAverage },
        evaluatorScores: { average: avgScore, stdDev },
        deviationAnalysis: { deviation, style },
        calibrationScore,
        recommendations,
        requiredTraining: calibrationScore < 70 ? ['Scoring consistency training'] : [],
        nextCalibrationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: calibrationScore >= 70 ? 'PASSED' : 'NEEDS_IMPROVEMENT'
      }
    });

    // Update evaluator profile
    await prisma.evaluator.updateMany({
      where: { userId: evaluatorId },
      data: {
        averageScoreGiven: avgScore,
        evaluationStyle: style
      }
    });

    return {
      calibrationScore,
      style,
      deviation,
      recommendations,
      status: calibrationScore >= 70 ? 'PASSED' : 'NEEDS_IMPROVEMENT'
    };
  }

  // Helper methods
  private static getAdjustedWeight(criterion: any, communityWeightings: any) {
    if (!communityWeightings) {
      return criterion.weight;
    }

    // Apply community-specific weight adjustments
    const categoryWeight = communityWeightings[criterion.category];
    if (categoryWeight) {
      return (criterion.weight * categoryWeight) / 100;
    }

    return criterion.weight;
  }

  private static normalizeScore(
    score: number,
    maxScore: number,
    method: NormalizationMethod | null
  ): number {
    if (!method || method === 'NONE') {
      return score;
    }

    switch (method) {
      case 'MIN_MAX':
        return (score / maxScore) * 100;
      
      case 'Z_SCORE':
        // Would need mean and stddev from all scores
        return score; // Simplified
      
      case 'PERCENTILE':
        // Would need all scores to calculate percentile
        return (score / maxScore) * 100; // Simplified
      
      case 'LINEAR':
      default:
        return (score / maxScore) * 100;
    }
  }

  private static async calculateIndigenousBonus(
    submissionId: string,
    requirement?: number | null
  ): Promise<number> {
    if (!requirement) return 0;

    const submission = await prisma.submissionEvaluation.findUnique({
      where: { id: submissionId }
    });

    if (!submission || !submission.isIndigenousBusiness) return 0;

    const ownership = submission.indigenousOwnership || 0;
    
    // Progressive bonus based on ownership percentage
    if (ownership >= 100) return 15;
    if (ownership >= 75) return 10;
    if (ownership >= 51) return 7;
    if (ownership >= 33) return 5;
    if (ownership >= requirement) return 3;
    
    return 0;
  }

  private static async checkSameNation(band1: string, band2: string): Promise<boolean> {
    // Would check against community service
    return false; // Simplified
  }

  private static calculateDistanceScore(distance: number, maxDistance: number): number {
    if (distance <= maxDistance * 0.25) return 20;
    if (distance <= maxDistance * 0.5) return 15;
    if (distance <= maxDistance * 0.75) return 10;
    if (distance <= maxDistance) return 5;
    return 0;
  }

  private static async assessCulturalAlignment(submissionId: string): Promise<number> {
    // Would assess cultural factors
    return Math.random() * 10; // Simplified
  }

  private static getIndigenousRecommendation(score: number): string {
    if (score >= 80) return 'Excellent Indigenous alignment - strongly recommended';
    if (score >= 60) return 'Good Indigenous participation - recommended';
    if (score >= 40) return 'Moderate Indigenous content - consider for partnership';
    if (score >= 20) return 'Some Indigenous involvement - room for improvement';
    return 'Limited Indigenous participation - encourage partnerships';
  }

  private static generateBlindId(submissionId: string): string {
    const secret = process.env.BLIND_SECRET || 'default-secret';
    return CryptoJS.HmacSHA256(submissionId, secret).toString();
  }

  private static identifyOutliers(scores: number[]): number[] {
    const q1 = math.quantileSeq(scores, 0.25) as number;
    const q3 = math.quantileSeq(scores, 0.75) as number;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return scores.filter(s => s < lowerBound || s > upperBound);
  }

  private static identifyDisagreementPoints(evaluatorScores: any[]): string[] {
    const points = [];
    
    // Find criteria with high variance
    const criteriaScores: Record<string, number[]> = {};
    
    evaluatorScores.forEach(es => {
      es.criterionScores.forEach((cs: any) => {
        if (!criteriaScores[cs.criterionId]) {
          criteriaScores[cs.criterionId] = [];
        }
        criteriaScores[cs.criterionId].push(cs.score);
      });
    });

    Object.entries(criteriaScores).forEach(([criterionId, scores]) => {
      const variance = math.variance(scores);
      if (variance > 100) {
        points.push(`High variance on criterion ${criterionId}`);
      }
    });

    return points;
  }

  private static async applyConsensusMethod(
    evaluatorScores: any[],
    method: string
  ): Promise<any> {
    const scores = evaluatorScores.map(es => es.overallScore);
    
    switch (method) {
      case 'DISCUSSION':
        // Simulate discussion outcome - would involve real collaboration tools
        const trimmedMean = this.calculateTrimmedMean(scores, 0.1);
        return {
          finalScore: trimmedMean,
          unanimous: false,
          dissenters: []
        };
      
      case 'VOTING':
        const median = math.median(scores);
        return {
          finalScore: median,
          unanimous: false,
          dissenters: []
        };
      
      case 'AVERAGING':
      default:
        const mean = math.mean(scores);
        return {
          finalScore: mean,
          unanimous: true,
          dissenters: []
        };
    }
  }

  private static calculateTrimmedMean(scores: number[], trimPercent: number): number {
    const sorted = [...scores].sort((a, b) => a - b);
    const trimCount = Math.floor(sorted.length * trimPercent);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    return math.mean(trimmed);
  }

  private static async checkMandatoryCriteria(submissionId: string): Promise<any> {
    const mandatoryScores = await prisma.criterionScore.findMany({
      where: {
        submissionEvalId: submissionId,
        isMandatory: true
      }
    });

    const failed = mandatoryScores.filter(ms => !ms.passed);
    
    if (failed.length > 0) {
      return {
        passed: false,
        reason: `Failed ${failed.length} mandatory criteria`
      };
    }

    return { passed: true };
  }

  private static async createAuditLog(evaluationId: string, action: string, data: any) {
    await prisma.evaluationAudit.create({
      data: {
        evaluationId,
        action: action as any,
        entityType: 'EVALUATION',
        entityId: evaluationId,
        userId: 'system',
        userName: 'System',
        newValue: data,
        timestamp: new Date()
      }
    });
  }

  private static async getPeerAverageScore(): Promise<number> {
    const result = await prisma.evaluatorScore.aggregate({
      _avg: {
        overallScore: true
      }
    });
    return result._avg.overallScore || 70;
  }
}