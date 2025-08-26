import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { SupplierService } from './services/supplier.service';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3031;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'supplier-service.log' })
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
    service: 'Indigenous Supplier Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Supplier Registration
app.post('/api/suppliers/register', async (req, res) => {
  try {
    const result = await SupplierService.registerSupplier({
      ...req.body,
      createdBy: req.headers['user-id'] as string || 'system'
    });
    
    logger.info('Supplier registered', { supplierId: result.supplierId });
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Supplier registration failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Create Indigenous Supplier Network
app.post('/api/supplier-networks', async (req, res) => {
  try {
    const result = await SupplierService.createSupplierNetwork({
      ...req.body,
      createdBy: req.headers['user-id'] as string || 'system'
    });
    
    logger.info('Supplier network created', { networkId: result.networkId });
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Supplier network creation failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Search Suppliers
app.get('/api/suppliers/search', async (req, res) => {
  try {
    const result = await SupplierService.searchSuppliers({
      query: req.query.query as string,
      supplierCategory: req.query.supplierCategory as string,
      supplierTier: req.query.supplierTier as string,
      indigenousOnly: req.query.indigenousOnly === 'true',
      indigenousClassification: req.query.indigenousClassification as string,
      traditionalProducts: req.query.traditionalProducts === 'true',
      culturalProducts: req.query.culturalProducts === 'true',
      serviceRegions: req.query.serviceRegions ? (req.query.serviceRegions as string).split(',') : undefined,
      capabilities: req.query.capabilities ? (req.query.capabilities as string).split(',') : undefined,
      industryCategory: req.query.industryCategory ? (req.query.industryCategory as string).split(',') : undefined,
      creditRating: req.query.creditRating as string,
      annualRevenueMin: req.query.annualRevenueMin ? parseFloat(req.query.annualRevenueMin as string) : undefined,
      annualRevenueMax: req.query.annualRevenueMax ? parseFloat(req.query.annualRevenueMax as string) : undefined,
      employeeCountMin: req.query.employeeCountMin ? parseInt(req.query.employeeCountMin as string) : undefined,
      employeeCountMax: req.query.employeeCountMax ? parseInt(req.query.employeeCountMax as string) : undefined,
      qualityRating: req.query.qualityRating ? parseFloat(req.query.qualityRating as string) : undefined,
      sustainabilityRating: req.query.sustainabilityRating ? parseFloat(req.query.sustainabilityRating as string) : undefined,
      status: req.query.status as string,
      sortBy: req.query.sortBy as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    });
    
    res.json(result);
  } catch (error: any) {
    logger.error('Supplier search failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Create Purchase Order
app.post('/api/suppliers/:supplierId/purchase-orders', async (req, res) => {
  try {
    const result = await SupplierService.createPurchaseOrder({
      supplierId: req.params.supplierId,
      orderedBy: req.headers['user-id'] as string || 'system',
      ...req.body
    });
    
    logger.info('Purchase order created', { 
      supplierId: req.params.supplierId,
      poNumber: result.poNumber 
    });
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Purchase order creation failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Update Supplier Performance
app.post('/api/suppliers/:supplierId/performance', async (req, res) => {
  try {
    const result = await SupplierService.updateSupplierPerformance({
      supplierId: req.params.supplierId,
      evaluatedBy: req.headers['user-id'] as string || 'system',
      ...req.body
    });
    
    logger.info('Supplier performance updated', { supplierId: req.params.supplierId });
    res.json(result);
  } catch (error: any) {
    logger.error('Supplier performance update failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Generate Network Report
app.get('/api/supplier-networks/report', async (req, res) => {
  try {
    const result = await SupplierService.generateNetworkReport({
      networkId: req.query.networkId as string,
      region: req.query.region as string,
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      quarter: req.query.quarter as string,
      includePerformance: req.query.includePerformance === 'true',
      includeMandateTracking: req.query.includeMandateTracking === 'true',
      format: req.query.format as string
    });
    
    logger.info('Network report generated');
    res.json(result);
  } catch (error: any) {
    logger.error('Network report generation failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Supplier Details
app.get('/api/suppliers/:supplierId', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { supplierId: req.params.supplierId },
      include: {
        productCategories: true,
        serviceOfferings: true,
        capabilities: true,
        certifications: {
          where: { isActive: true }
        },
        diversityCertifications: {
          where: { isActive: true }
        },
        performanceMetrics: {
          orderBy: { periodEnd: 'desc' },
          take: 5
        },
        contracts: {
          orderBy: { startDate: 'desc' },
          take: 10
        },
        purchaseOrders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
          include: {
            lineItems: true
          }
        },
        partnerships: true,
        documents: {
          where: { isValid: true }
        }
      }
    });
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error: any) {
    logger.error('Supplier details fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Update Supplier Status
app.put('/api/suppliers/:supplierId/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const supplier = await prisma.supplier.update({
      where: { supplierId: req.params.supplierId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
    
    logger.info('Supplier status updated', { 
      supplierId: req.params.supplierId, 
      status, 
      reason 
    });
    
    res.json({ supplierId: supplier.supplierId, status: supplier.status });
  } catch (error: any) {
    logger.error('Supplier status update failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Indigenous Supplier Statistics
app.get('/api/suppliers/indigenous/statistics', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    
    const totalIndigenousSuppliers = await prisma.supplier.count({
      where: { isIndigenousSupplier: true }
    });
    
    const activeIndigenousSuppliers = await prisma.supplier.count({
      where: { 
        isIndigenousSupplier: true,
        status: 'ACTIVE'
      }
    });
    
    const traditionalProductSuppliers = await prisma.supplier.count({
      where: { 
        isIndigenousSupplier: true,
        traditionalProducts: true 
      }
    });
    
    const culturalProductSuppliers = await prisma.supplier.count({
      where: { 
        isIndigenousSupplier: true,
        culturalProducts: true 
      }
    });
    
    const classificationStats = await prisma.supplier.groupBy({
      by: ['indigenousClassification'],
      where: {
        isIndigenousSupplier: true
      },
      _count: {
        id: true
      }
    });
    
    const regionStats = await prisma.supplier.groupBy({
      by: ['traditionTerritory'],
      where: {
        isIndigenousSupplier: true,
        traditionTerritory: { not: null }
      },
      _count: {
        id: true
      }
    });
    
    // Get procurement statistics
    const procurementStats = await prisma.purchaseOrder.aggregate({
      where: {
        isIndigenousProcurement: true,
        orderDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      },
      _sum: {
        totalAmount: true,
        mandateContribution: true
      },
      _count: {
        id: true
      }
    });
    
    // Network statistics
    const networkCount = await prisma.indigenousSupplierNetwork.count({
      where: { status: 'ACTIVE' }
    });
    
    res.json({
      year,
      suppliers: {
        total: totalIndigenousSuppliers,
        active: activeIndigenousSuppliers,
        traditional: traditionalProductSuppliers,
        cultural: culturalProductSuppliers,
        activationRate: totalIndigenousSuppliers > 0 ? 
          (activeIndigenousSuppliers / totalIndigenousSuppliers * 100).toFixed(2) : 0
      },
      classification: classificationStats.map(stat => ({
        classification: stat.indigenousClassification,
        count: stat._count.id
      })),
      regions: regionStats.map(stat => ({
        territory: stat.traditionTerritory,
        count: stat._count.id
      })),
      procurement: {
        totalOrders: procurementStats._count.id || 0,
        totalValue: procurementStats._sum.totalAmount || 0,
        mandateContribution: procurementStats._sum.mandateContribution || 0,
        averageOrderValue: procurementStats._count.id && procurementStats._sum.totalAmount ? 
          (Number(procurementStats._sum.totalAmount) / procurementStats._count.id).toFixed(2) : 0
      },
      networks: {
        activeNetworks: networkCount
      }
    });
  } catch (error: any) {
    logger.error('Indigenous supplier statistics fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Supplier Networks
app.get('/api/supplier-networks', async (req, res) => {
  try {
    const where: any = {};
    
    if (req.query.region) where.region = req.query.region;
    if (req.query.networkType) where.networkType = req.query.networkType;
    if (req.query.status) where.status = req.query.status;
    
    const networks = await prisma.indigenousSupplierNetwork.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    res.json({
      networks: networks.map(network => ({
        networkId: network.networkId,
        name: network.name,
        type: network.networkType,
        region: network.region,
        memberCount: network.memberCount,
        territories: network.territories,
        communities: network.communities,
        focusAreas: network.focusAreas,
        status: network.status,
        establishedDate: network.establishedDate
      })),
      totalCount: networks.length
    });
  } catch (error: any) {
    logger.error('Supplier networks fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Purchase Orders
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    
    const where: any = {};
    
    if (req.query.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { supplierId: req.query.supplierId as string }
      });
      if (supplier) where.supplierId = supplier.id;
    }
    
    if (req.query.status) where.status = req.query.status;
    if (req.query.indigenousOnly === 'true') where.isIndigenousProcurement = true;
    
    if (req.query.dateFrom || req.query.dateTo) {
      where.orderDate = {};
      if (req.query.dateFrom) where.orderDate.gte = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) where.orderDate.lte = new Date(req.query.dateTo as string);
    }
    
    const [orders, totalCount] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: {
              supplierId: true,
              companyName: true,
              isIndigenousSupplier: true,
              indigenousClassification: true
            }
          },
          lineItems: {
            select: {
              description: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              isIndigenousProduct: true
            }
          }
        },
        orderBy: { orderDate: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.purchaseOrder.count({ where })
    ]);
    
    res.json({
      orders: orders.map(order => ({
        poNumber: order.poNumber,
        supplier: {
          id: order.supplier.supplierId,
          name: order.supplier.companyName,
          indigenous: order.supplier.isIndigenousSupplier,
          classification: order.supplier.indigenousClassification
        },
        orderType: order.orderType,
        priority: order.priority,
        status: order.status,
        approvalStatus: order.approvalStatus,
        totalAmount: order.totalAmount,
        isIndigenousProcurement: order.isIndigenousProcurement,
        mandateContribution: order.mandateContribution,
        orderDate: order.orderDate,
        requestedDeliveryDate: order.requestedDeliveryDate,
        lineItemsCount: order.lineItems.length
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page < Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    logger.error('Purchase orders fetch failed', error);
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
  logger.info(`Indigenous Supplier Service running on port ${PORT}`);
  logger.info('Service capabilities:', {
    supplierRegistration: true,
    indigenousNetworks: true,
    purchaseOrders: true,
    performanceTracking: true,
    mandateReporting: true,
    supplyChainMapping: true
  });
});

export default app;