import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import winston from 'winston';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { PaymentService } from './services/payment.service';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';

// Load environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Initialize Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'combined.log' 
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Strict rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many payment requests, please try again later'
});
app.use('/api/payments/process', paymentLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    
    res.json({ 
      status: 'healthy',
      service: 'payment-service',
      timestamp: new Date().toISOString(),
      features: {
        multiProvider: true,
        indigenousIncentives: true,
        reconciliation: true,
        mandateTracking: true
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Database or Redis connection failed'
    });
  }
});

// Process payment
app.post('/api/payments/process', async (req, res) => {
  try {
    const result = await PaymentService.processPayment({
      amount: req.body.amount,
      currency: req.body.currency || 'CAD',
      method: req.body.method,
      provider: req.body.provider,
      payerId: req.body.payerId,
      payeeId: req.body.payeeId,
      invoiceId: req.body.invoiceId,
      orderId: req.body.orderId,
      rfqId: req.body.rfqId,
      description: req.body.description,
      isIndigenousBusiness: req.body.isIndigenousBusiness,
      indigenousBusinessId: req.body.indigenousBusinessId,
      bandNumber: req.body.bandNumber,
      metadata: req.body.metadata
    });
    
    // Emit real-time update
    io.emit('payment:processed', {
      paymentId: result.paymentId,
      status: result.status,
      indigenousContribution: result.indigenousContribution
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Payment processed successfully'
    });
  } catch (error: any) {
    logger.error('Payment processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create payment split
app.post('/api/payments/:paymentId/split', async (req, res) => {
  try {
    const result = await PaymentService.createPaymentSplit({
      paymentId: req.params.paymentId,
      splits: req.body.splits
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Payment split created successfully'
    });
  } catch (error: any) {
    logger.error('Payment split error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process refund
app.post('/api/payments/:paymentId/refund', async (req, res) => {
  try {
    const result = await PaymentService.processRefund({
      paymentId: req.params.paymentId,
      amount: req.body.amount,
      reason: req.body.reason,
      description: req.body.description,
      requestedBy: req.body.userId || req.headers['x-user-id'] as string || 'system'
    });
    
    // Emit refund event
    io.emit('payment:refunded', {
      paymentId: req.params.paymentId,
      refundId: result.refundId,
      indigenousImpact: result.indigenousImpact
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Refund processed successfully'
    });
  } catch (error: any) {
    logger.error('Refund processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle dispute
app.post('/api/payments/:paymentId/dispute', async (req, res) => {
  try {
    const result = await PaymentService.handleDispute({
      paymentId: req.params.paymentId,
      type: req.body.type,
      reason: req.body.reason,
      amount: req.body.amount,
      disputedBy: req.body.userId || req.headers['x-user-id'] as string || 'system',
      evidence: req.body.evidence
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Dispute filed successfully'
    });
  } catch (error: any) {
    logger.error('Dispute handling error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Perform reconciliation
app.post('/api/reconciliation/perform', async (req, res) => {
  try {
    const result = await PaymentService.performReconciliation({
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      type: req.body.type || 'DAILY',
      reconciledBy: req.body.userId || req.headers['x-user-id'] as string || 'system'
    });
    
    // Emit reconciliation results
    io.emit('reconciliation:completed', {
      reconciliationId: result.reconciliationId,
      mandate5Compliance: result.mandate5Compliance,
      indigenousPercentage: result.indigenousPercentage
    });
    
    res.json({
      success: true,
      ...result,
      message: 'Reconciliation completed'
    });
  } catch (error: any) {
    logger.error('Reconciliation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment details
app.get('/api/payments/:paymentId', async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { paymentId: req.params.paymentId },
      include: {
        splits: true,
        refunds: true,
        disputes: true
      }
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({
      success: true,
      payment: {
        ...payment,
        amount: payment.amount.toString(),
        netAmount: payment.netAmount.toString()
      }
    });
  } catch (error: any) {
    logger.error('Error fetching payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// List payments
app.get('/api/payments', async (req, res) => {
  try {
    const { status, isIndigenous, startDate, endDate, limit = 20, offset = 0 } = req.query;
    
    const payments = await prisma.payment.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(isIndigenous !== undefined && { 
          isIndigenousBusiness: isIndigenous === 'true' 
        }),
        ...(startDate && endDate && {
          processedAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        })
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        paymentId: true,
        amount: true,
        currency: true,
        status: true,
        method: true,
        provider: true,
        isIndigenousBusiness: true,
        processedAt: true,
        payerName: true,
        payeeName: true
      }
    });
    
    res.json({
      success: true,
      payments: payments.map(p => ({
        ...p,
        amount: p.amount.toString()
      })),
      count: payments.length
    });
  } catch (error: any) {
    logger.error('Error listing payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get reconciliation history
app.get('/api/reconciliation/history', async (req, res) => {
  try {
    const reconciliations = await prisma.reconciliation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        reconciliationId: true,
        startDate: true,
        endDate: true,
        status: true,
        totalPayments: true,
        totalAmount: true,
        indigenousPercentage: true,
        mandate5Compliance: true,
        reconciledAt: true
      }
    });
    
    res.json({
      success: true,
      reconciliations: reconciliations.map(r => ({
        ...r,
        totalAmount: r.totalAmount.toString(),
        indigenousPercentage: r.indigenousPercentage.toString()
      }))
    });
  } catch (error: any) {
    logger.error('Error fetching reconciliation history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Indigenous metrics endpoint
app.get('/api/metrics/indigenous', async (req, res) => {
  try {
    const currentMonth = format(new Date(), 'yyyy-MM');
    
    // Get metrics from Redis
    const monthlyMetrics = await redis.hgetall(`indigenous:procurement:${currentMonth}`);
    const dailyMetrics = await redis.hgetall(`indigenous:daily:${format(new Date(), 'yyyy-MM-dd')}`);
    const mandateStatus = await redis.get('mandate:status');
    
    // Calculate current percentage
    const totalSpend = await redis.hget(`procurement:${currentMonth}`, 'total');
    const indigenousSpend = monthlyMetrics.amount || '0';
    const percentage = totalSpend 
      ? (parseFloat(indigenousSpend) / parseFloat(totalSpend)) * 100
      : 0;
    
    res.json({
      success: true,
      metrics: {
        monthly: {
          count: parseInt(monthlyMetrics.count || '0'),
          amount: monthlyMetrics.amount || '0',
          percentage: percentage.toFixed(2)
        },
        daily: {
          payments: parseInt(dailyMetrics.payments || '0'),
          total: dailyMetrics.total || '0'
        },
        mandateStatus: mandateStatus || 'UNKNOWN',
        target: 5,
        gap: Math.max(0, 5 - percentage).toFixed(2)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching Indigenous metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Payment methods endpoints
app.get('/api/payment-methods', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    
    const methods = await prisma.paymentMethod.findMany({
      where: { 
        userId: userId as string,
        isVerified: true
      },
      select: {
        id: true,
        type: true,
        provider: true,
        isDefault: true,
        cardLast4: true,
        cardBrand: true,
        bankName: true,
        accountLast4: true,
        indigenousPreferred: true
      }
    });
    
    res.json({
      success: true,
      methods
    });
  } catch (error: any) {
    logger.error('Error fetching payment methods:', error);
    res.status(500).json({ error: error.message });
  }
});

// Incentives endpoint
app.get('/api/incentives/indigenous', async (req, res) => {
  try {
    const incentives = await prisma.indigenousPaymentIncentive.findMany({
      where: {
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        discountPercent: true,
        bonusAmount: true,
        feeWaiver: true,
        minAmount: true,
        maxAmount: true
      }
    });
    
    res.json({
      success: true,
      incentives: incentives.map(i => ({
        ...i,
        discountPercent: i.discountPercent?.toString(),
        bonusAmount: i.bonusAmount?.toString(),
        minAmount: i.minAmount?.toString(),
        maxAmount: i.maxAmount?.toString()
      }))
    });
  } catch (error: any) {
    logger.error('Error fetching incentives:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compliance check endpoint
app.get('/api/compliance/check/:paymentId', async (req, res) => {
  try {
    const compliance = await prisma.paymentCompliance.findUnique({
      where: { paymentId: req.params.paymentId }
    });
    
    if (!compliance) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }
    
    res.json({
      success: true,
      compliance: {
        ...compliance,
        mandateAmount: compliance.mandateAmount.toString()
      }
    });
  } catch (error: any) {
    logger.error('Error checking compliance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reports endpoint
app.post('/api/reports/generate', async (req, res) => {
  try {
    const { type, startDate, endDate } = req.body;
    
    const payments = await prisma.payment.findMany({
      where: {
        processedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        status: 'COMPLETED'
      }
    });
    
    const indigenousPayments = payments.filter(p => p.isIndigenousBusiness);
    const totalAmount = payments.reduce((sum, p) => sum.add(p.amount), new Decimal(0));
    const indigenousAmount = indigenousPayments.reduce((sum, p) => sum.add(p.amount), new Decimal(0));
    
    const report = await prisma.paymentReport.create({
      data: {
        reportId: `RPT-${Date.now()}`,
        type: type as any,
        name: `${type} Report`,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalPayments: payments.length,
        totalAmount,
        averageAmount: payments.length > 0 ? totalAmount.div(payments.length) : new Decimal(0),
        indigenousPayments: indigenousPayments.length,
        indigenousAmount,
        indigenousPercentage: totalAmount.gt(0) ? indigenousAmount.div(totalAmount).mul(100) : new Decimal(0),
        mandate5Status: indigenousAmount.div(totalAmount).mul(100).gte(5) ? 'COMPLIANT' : 'NON_COMPLIANT',
        byMethod: {},
        byProvider: {},
        byCurrency: {},
        byIndigenousCategory: {},
        generatedBy: req.body.userId || 'system'
      }
    });
    
    res.json({
      success: true,
      reportId: report.reportId,
      message: 'Report generated successfully'
    });
  } catch (error: any) {
    logger.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
  logger.info('New WebSocket connection:', socket.id);
  
  // Subscribe to payment updates
  socket.on('subscribe:payments', () => {
    socket.join('payments:all');
  });
  
  // Subscribe to Indigenous metrics
  socket.on('subscribe:indigenous-metrics', () => {
    socket.join('metrics:indigenous');
  });
  
  // Subscribe to reconciliation updates
  socket.on('subscribe:reconciliation', () => {
    socket.join('reconciliation:all');
  });
  
  // Subscribe to mandate compliance
  socket.on('subscribe:mandate', () => {
    socket.join('mandate:compliance');
  });
  
  socket.on('disconnect', () => {
    logger.info('Socket disconnected:', socket.id);
  });
});

// Scheduled tasks
// Daily reconciliation (runs at 2 AM)
cron.schedule('0 2 * * *', async () => {
  logger.info('Running daily reconciliation');
  try {
    const yesterday = subDays(new Date(), 1);
    const result = await PaymentService.performReconciliation({
      startDate: new Date(yesterday.setHours(0, 0, 0, 0)),
      endDate: new Date(yesterday.setHours(23, 59, 59, 999)),
      type: 'DAILY',
      reconciledBy: 'system-scheduler'
    });
    
    logger.info(`Daily reconciliation completed: ${result.reconciliationId}`);
    
    // Broadcast results
    io.to('reconciliation:all').emit('reconciliation:daily', result);
  } catch (error) {
    logger.error('Daily reconciliation failed:', error);
  }
});

// Monthly mandate compliance check (runs on 1st of each month)
cron.schedule('0 0 1 * *', async () => {
  logger.info('Running monthly mandate compliance check');
  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const result = await PaymentService.performReconciliation({
      startDate: startOfMonth(lastMonth),
      endDate: endOfMonth(lastMonth),
      type: 'MONTHLY',
      reconciledBy: 'system-scheduler'
    });
    
    // Send compliance report
    if (!result.mandate5Compliance) {
      io.emit('mandate:alert', {
        type: 'MONTHLY_NON_COMPLIANCE',
        percentage: result.indigenousPercentage,
        gap: (5 - parseFloat(result.indigenousPercentage)).toFixed(2),
        month: format(lastMonth, 'MMMM yyyy')
      });
    }
    
    logger.info(`Monthly compliance check: ${result.indigenousPercentage}%`);
  } catch (error) {
    logger.error('Monthly compliance check failed:', error);
  }
});

// Hourly metrics update
cron.schedule('0 * * * *', async () => {
  logger.info('Updating payment metrics');
  try {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const metrics = await redis.hgetall(`indigenous:procurement:${currentMonth}`);
    
    // Broadcast metrics
    io.to('metrics:indigenous').emit('metrics:update', {
      monthly: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Metrics update failed:', error);
  }
});

// Process scheduled payments (every 10 minutes)
cron.schedule('*/10 * * * *', async () => {
  logger.info('Processing scheduled payments');
  try {
    const schedules = await prisma.paymentSchedule.findMany({
      where: {
        isActive: true,
        nextPaymentDate: { lte: new Date() }
      }
    });
    
    for (const schedule of schedules) {
      // Process scheduled payment
      logger.info(`Processing scheduled payment: ${schedule.scheduleId}`);
      
      // Update next payment date based on frequency
      let nextDate = new Date(schedule.nextPaymentDate!);
      switch (schedule.frequency) {
        case 'DAILY':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'WEEKLY':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'MONTHLY':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }
      
      await prisma.paymentSchedule.update({
        where: { id: schedule.id },
        data: {
          lastExecutedAt: new Date(),
          nextPaymentDate: nextDate,
          executionCount: { increment: 1 }
        }
      });
    }
    
    logger.info(`Processed ${schedules.length} scheduled payments`);
  } catch (error) {
    logger.error('Scheduled payment processing failed:', error);
  }
});

// Clean up old disputes (weekly)
cron.schedule('0 0 * * 0', async () => {
  logger.info('Cleaning up expired disputes');
  try {
    const expired = await prisma.dispute.updateMany({
      where: {
        status: 'OPEN',
        responseDeadline: { lt: new Date() }
      },
      data: {
        status: 'EXPIRED',
        outcome: 'WITHDRAWN'
      }
    });
    
    logger.info(`Marked ${expired.count} disputes as expired`);
  } catch (error) {
    logger.error('Dispute cleanup failed:', error);
  }
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3025;
httpServer.listen(PORT, () => {
  logger.info(`💳 Payment Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Features enabled:');
  logger.info('  - Multi-provider payment processing');
  logger.info('  - Indigenous business fee reductions');
  logger.info('  - 5% procurement mandate tracking');
  logger.info('  - Real-time reconciliation');
  logger.info('  - Payment splits and marketplace');
  logger.info('  - Refunds and dispute management');
  logger.info('  - Scheduled recurring payments');
  logger.info('  - Compliance monitoring');
  logger.info('  - WebSocket real-time updates');
  logger.info('  - Comprehensive audit logging');
});

import Decimal from 'decimal.js';