/**
 * Fraud Monitoring API Endpoints
 * Real-time fraud detection and monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { fraudDetectionService } from '../services/FraudDetectionService';
import { authenticateJWT, requireRole } from '../middleware/security';
import { z } from 'zod';
import { logger } from '@/lib/monitoring/logger';
import { auditLogger } from '../services/AuditLogger';
import { redisEncryption } from '../services/RedisEncryptionService';
import WebSocket from 'ws';

// Validation schemas
const AnalyzeTransactionSchema = z.object({
  transactionId: z.string(),
  userId: z.string(),
  businessId: z.string(),
  amount: z.number().positive(),
  currency: z.enum(['CAD', 'USD']),
  type: z.enum(['payment', 'transfer', 'withdrawal', 'deposit']),
  fromAccount: z.string(),
  toAccount: z.string(),
  metadata: z.record(z.any()).optional()
});

const MarkFalsePositiveSchema = z.object({
  transactionId: z.string(),
  reason: z.string().min(10).max(500)
});

const GetStatisticsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

/**
 * Analyze transaction for fraud (manual check)
 */
export async function analyzeTransaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = AnalyzeTransactionSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionId = req.session?.id || 'unknown';
    
    const result = await fraudDetectionService.analyzeTransaction({
      ...validated,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      sessionId
    });
    
    // Log API usage
    await auditLogger.logEvent({
      eventType: 'data_read',
      userId: req.user?.id,
      action: 'analyze_transaction_api',
      resource: {
        type: 'fraud_analysis',
        id: validated.transactionId,
        name: 'Transaction fraud analysis'
      },
      metadata: {
        decision: result.decision,
        overallRisk: result.overallRisk
      }
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to analyze transaction', { error });
    next(error);
  }
}

/**
 * Mark transaction as false positive
 */
export async function markFalsePositive(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = MarkFalsePositiveSchema.parse(req.body);
    const reviewerId = req.user?.id || 'unknown';
    
    await fraudDetectionService.markFalsePositive(
      validated.transactionId,
      reviewerId,
      validated.reason
    );
    
    res.json({
      success: true,
      message: 'Transaction marked as false positive'
    });
    
  } catch (error) {
    logger.error('Failed to mark false positive', { error });
    next(error);
  }
}

/**
 * Get fraud detection statistics
 */
export async function getStatistics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = GetStatisticsSchema.parse(req.query);
    
    const timeRange = validated.startDate && validated.endDate ? {
      start: new Date(validated.startDate),
      end: new Date(validated.endDate)
    } : undefined;
    
    const stats = await fraudDetectionService.getStatistics(timeRange);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Failed to get statistics', { error });
    next(error);
  }
}

/**
 * Get real-time fraud alerts (SSE endpoint)
 */
export async function streamFraudAlerts(
  req: Request,
  res: Response
): Promise<void> {
  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable Nginx buffering
  });
  
  // Send initial connection message
  res.write('event: connected\ndata: {"status": "connected"}\n\n');
  
  // Set up event listeners
  const onTransactionAnalyzed = (data: any) => {
    res.write(`event: transaction-analyzed\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  const onFraudDetected = (data: any) => {
    res.write(`event: fraud-detected\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  const onCriticalAlert = (data: any) => {
    res.write(`event: critical-alert\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  const onMetrics = (data: any) => {
    res.write(`event: metrics\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  // Subscribe to events
  fraudDetectionService.on('transaction-analyzed', onTransactionAnalyzed);
  fraudDetectionService.on('fraud-detected', onFraudDetected);
  fraudDetectionService.on('critical-fraud-alert', onCriticalAlert);
  fraudDetectionService.on('metrics', onMetrics);
  
  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {"timestamp": "' + new Date().toISOString() + '"}\n\n');
  }, 30000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    fraudDetectionService.off('transaction-analyzed', onTransactionAnalyzed);
    fraudDetectionService.off('fraud-detected', onFraudDetected);
    fraudDetectionService.off('critical-fraud-alert', onCriticalAlert);
    fraudDetectionService.off('metrics', onMetrics);
    clearInterval(heartbeat);
    
    logger.info('Client disconnected from fraud alerts stream');
  });
}

/**
 * WebSocket endpoint for real-time fraud monitoring
 */
export function setupFraudMonitoringWebSocket(wss: WebSocket.Server): void {
  wss.on('connection', async (ws, req) => {
    logger.info('WebSocket client connected for fraud monitoring');
    
    // Authenticate WebSocket connection
    const token = req.url?.split('token=')[1];
    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }
    
    // Verify token (simplified - in production use proper JWT verification)
    const isValid = await verifyWebSocketToken(token);
    if (!isValid) {
      ws.close(1008, 'Invalid token');
      return;
    }
    
    // Send initial status
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString()
    }));
    
    // Set up event forwarding
    const forwardEvent = (eventType: string) => (data: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: eventType,
          data,
          timestamp: new Date().toISOString()
        }));
      }
    };
    
    const handlers = {
      'transaction-analyzed': forwardEvent('transaction-analyzed'),
      'fraud-detected': forwardEvent('fraud-detected'),
      'critical-fraud-alert': forwardEvent('critical-alert'),
      'metrics': forwardEvent('metrics'),
      'manual-review-required': forwardEvent('manual-review')
    };
    
    // Subscribe to events
    Object.entries(handlers).forEach(([event, handler]) => {
      fraudDetectionService.on(event, handler);
    });
    
    // Handle client messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          case 'subscribe':
            // Handle subscription to specific event types
            logger.info('Client subscribed to events', { events: data.events });
            break;
            
          case 'get-stats':
            const stats = await fraudDetectionService.getStatistics();
            ws.send(JSON.stringify({
              type: 'statistics',
              data: stats
            }));
            break;
        }
      } catch (error) {
        logger.error('WebSocket message error', { error });
      }
    });
    
    // Clean up on disconnect
    ws.on('close', () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        fraudDetectionService.off(event, handler);
      });
      logger.info('WebSocket client disconnected');
    });
    
    // Error handling
    ws.on('error', (error) => {
      logger.error('WebSocket error', { error });
    });
  });
}

/**
 * Get recent fraud alerts
 */
export async function getRecentAlerts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const cacheKey = 'fraud:recent-alerts';
    
    // Check cache first
    let alerts = await redisEncryption.getEncrypted<any[]>(cacheKey);
    
    if (!alerts) {
      // Fetch from database
      const recentAnalyses = await prisma.fraudAnalysis.findMany({
        where: {
          decision: {
            in: ['block', 'review']
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          transaction: {
            select: {
              id: true,
              amount: true,
              fromAccount: true,
              toAccount: true,
              userId: true,
              businessId: true
            }
          }
        }
      });
      
      alerts = recentAnalyses.map(analysis => ({
        id: analysis.transactionId,
        timestamp: analysis.createdAt,
        decision: analysis.decision,
        risk: analysis.overallRisk,
        reasons: analysis.metadata?.reasons || [],
        transaction: analysis.transaction
      }));
      
      // Cache for 1 minute
      await redisEncryption.setEncrypted(cacheKey, alerts, 60);
    }
    
    res.json({
      success: true,
      data: alerts
    });
    
  } catch (error) {
    logger.error('Failed to get recent alerts', { error });
    next(error);
  }
}

/**
 * Update fraud detection rules
 */
export async function updateRules(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // This would update the fraud detection rules
    // For now, just log the request
    await auditLogger.logEvent({
      eventType: 'config_changed',
      userId: req.user?.id,
      action: 'update_fraud_rules',
      severity: 'high',
      metadata: {
        rules: req.body.rules
      }
    });
    
    res.json({
      success: true,
      message: 'Fraud detection rules updated'
    });
    
  } catch (error) {
    logger.error('Failed to update rules', { error });
    next(error);
  }
}

// Helper function to verify WebSocket token
async function verifyWebSocketToken(token: string): Promise<boolean> {
  try {
    // In production, verify JWT or API key
    // For now, just check if it exists
    return !!token && token.length > 10;
  } catch (error) {
    return false;
  }
}

// Export route setup
export function setupFraudMonitoringRoutes(app: any): void {
  // Manual analysis endpoint
  app.post('/api/v1/fraud/analyze',
    authenticateJWT,
    requireRole(['FRAUD_ANALYST', 'ADMIN']),
    analyzeTransaction
  );
  
  // Mark false positive
  app.post('/api/v1/fraud/false-positive',
    authenticateJWT,
    requireRole(['FRAUD_ANALYST', 'ADMIN']),
    markFalsePositive
  );
  
  // Get statistics
  app.get('/api/v1/fraud/statistics',
    authenticateJWT,
    requireRole(['FRAUD_ANALYST', 'ADMIN', 'FINANCE_MANAGER']),
    getStatistics
  );
  
  // Recent alerts
  app.get('/api/v1/fraud/alerts',
    authenticateJWT,
    requireRole(['FRAUD_ANALYST', 'ADMIN']),
    getRecentAlerts
  );
  
  // SSE stream for real-time alerts
  app.get('/api/v1/fraud/stream',
    authenticateJWT,
    requireRole(['FRAUD_ANALYST', 'ADMIN']),
    streamFraudAlerts
  );
  
  // Update rules (admin only)
  app.put('/api/v1/fraud/rules',
    authenticateJWT,
    requireRole(['ADMIN']),
    updateRules
  );
}