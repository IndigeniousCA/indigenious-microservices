import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { VendorService } from './services/vendor.service';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3030;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'vendor-service.log' })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'Indigenous Vendor Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Vendor Registration
app.post('/api/vendors/register', async (req, res) => {
  try {
    const result = await VendorService.registerVendor({
      ...req.body,
      createdBy: req.headers['user-id'] as string || 'system'
    });
    
    logger.info('Vendor registered', { vendorId: result.vendorId });
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Vendor registration failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Indigenous Business Verification
app.post('/api/vendors/:vendorId/verify-indigenous', async (req, res) => {
  try {
    const result = await VendorService.verifyIndigenousBusiness({
      vendorId: req.params.vendorId,
      verifierId: req.headers['user-id'] as string || 'system',
      ...req.body
    });
    
    logger.info('Indigenous business verification completed', { 
      vendorId: req.params.vendorId, 
      approved: result.approved 
    });
    res.json(result);
  } catch (error: any) {
    logger.error('Indigenous business verification failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Search Vendors
app.get('/api/vendors/search', async (req, res) => {
  try {
    const result = await VendorService.searchVendors({
      query: req.query.query as string,
      businessType: req.query.businessType as string,
      indigenousOnly: req.query.indigenousOnly === 'true',
      indigenousClassification: req.query.indigenousClassification as string,
      capabilities: req.query.capabilities ? (req.query.capabilities as string).split(',') : undefined,
      serviceAreas: req.query.serviceAreas ? (req.query.serviceAreas as string).split(',') : undefined,
      certifications: req.query.certifications ? (req.query.certifications as string).split(',') : undefined,
      creditRating: req.query.creditRating as string,
      status: req.query.status as string,
      verificationStatus: req.query.verificationStatus as string,
      sortBy: req.query.sortBy as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    });
    
    res.json(result);
  } catch (error: any) {
    logger.error('Vendor search failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Update Vendor Performance
app.post('/api/vendors/:vendorId/performance', async (req, res) => {
  try {
    const result = await VendorService.updateVendorPerformance({
      vendorId: req.params.vendorId,
      evaluatedBy: req.headers['user-id'] as string || 'system',
      ...req.body
    });
    
    logger.info('Vendor performance updated', { vendorId: req.params.vendorId });
    res.json(result);
  } catch (error: any) {
    logger.error('Vendor performance update failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Track Mandate Contribution
app.post('/api/vendors/:vendorId/mandate-contribution', async (req, res) => {
  try {
    const result = await VendorService.trackMandateContribution({
      vendorId: req.params.vendorId,
      reportedBy: req.headers['user-id'] as string || 'system',
      ...req.body
    });
    
    logger.info('Mandate contribution tracked', { vendorId: req.params.vendorId });
    res.json(result);
  } catch (error: any) {
    logger.error('Mandate contribution tracking failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Generate Indigenous Business Report
app.get('/api/vendors/indigenous-report', async (req, res) => {
  try {
    const result = await VendorService.generateIndigenousBusinessReport({
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      quarter: req.query.quarter as string,
      classification: req.query.classification as string,
      region: req.query.region as string,
      includePerformance: req.query.includePerformance === 'true',
      format: req.query.format as string
    });
    
    logger.info('Indigenous business report generated');
    res.json(result);
  } catch (error: any) {
    logger.error('Indigenous business report generation failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Vendor Details
app.get('/api/vendors/:vendorId', async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { vendorId: req.params.vendorId },
      include: {
        capabilities: true,
        certifications: true,
        performanceMetrics: {
          orderBy: { periodEnd: 'desc' },
          take: 5
        },
        mandateContributions: {
          orderBy: { year: 'desc' },
          take: 3
        },
        complianceChecks: {
          orderBy: { performedAt: 'desc' },
          take: 5
        }
      }
    });
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json(vendor);
  } catch (error: any) {
    logger.error('Vendor details fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Update Vendor Status
app.put('/api/vendors/:vendorId/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const vendor = await prisma.vendor.update({
      where: { vendorId: req.params.vendorId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
    
    logger.info('Vendor status updated', { 
      vendorId: req.params.vendorId, 
      status, 
      reason 
    });
    
    res.json({ vendorId: vendor.vendorId, status: vendor.status });
  } catch (error: any) {
    logger.error('Vendor status update failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Indigenous Business Statistics
app.get('/api/vendors/indigenous/statistics', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    
    const stats = await prisma.vendor.groupBy({
      by: ['indigenousClassification', 'verificationStatus'],
      where: {
        isIndigenousBusiness: true,
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      },
      _count: {
        id: true
      }
    });
    
    const totalIndigenousVendors = await prisma.vendor.count({
      where: { isIndigenousBusiness: true }
    });
    
    const verifiedVendors = await prisma.vendor.count({
      where: { 
        isIndigenousBusiness: true,
        verificationStatus: 'VERIFIED'
      }
    });
    
    const mandateContributions = await prisma.mandateContribution.aggregate({
      where: { year },
      _sum: {
        totalContracts: true,
        mandateContribution: true,
        contractCount: true
      }
    });
    
    res.json({
      year,
      totalIndigenousVendors,
      verifiedVendors,
      verificationRate: totalIndigenousVendors > 0 ? 
        (verifiedVendors / totalIndigenousVendors * 100).toFixed(2) : 0,
      classificationBreakdown: stats,
      mandateContributions: {
        totalValue: mandateContributions._sum.totalContracts || 0,
        mandateValue: mandateContributions._sum.mandateContribution || 0,
        contractCount: mandateContributions._sum.contractCount || 0
      }
    });
  } catch (error: any) {
    logger.error('Indigenous business statistics fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', error);
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Indigenous Vendor Service running on port ${PORT}`);
  logger.info('Service capabilities:', {
    vendorRegistration: true,
    indigenousVerification: true,
    performanceTracking: true,
    mandateReporting: true,
    businessRegistry: true
  });
});

export default app;