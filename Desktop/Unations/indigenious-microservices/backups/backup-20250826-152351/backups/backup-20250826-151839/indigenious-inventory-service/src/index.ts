import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { InventoryService } from './services/inventory.service';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3032;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'inventory-service.log' })
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
    service: 'Indigenous Inventory Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Create Product
app.post('/api/products', async (req, res) => {
  try {
    const result = await InventoryService.createProduct({
      ...req.body,
      createdBy: req.headers['user-id'] as string || 'system'
    });
    
    logger.info('Product created', { productId: result.productId });
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Product creation failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Add Inventory Item
app.post('/api/inventory/items', async (req, res) => {
  try {
    const result = await InventoryService.addInventoryItem({
      ...req.body,
      createdBy: req.headers['user-id'] as string || 'system'
    });
    
    logger.info('Inventory item added', { inventoryId: result.inventoryId });
    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Inventory item creation failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Process Stock Movement
app.post('/api/inventory/movements', async (req, res) => {
  try {
    const result = await InventoryService.processStockMovement({
      ...req.body,
      authorizedBy: req.headers['user-id'] as string || 'system'
    });
    
    logger.info('Stock movement processed', { movementId: result.movementId });
    res.json(result);
  } catch (error: any) {
    logger.error('Stock movement processing failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Perform Cycle Count
app.post('/api/inventory/cycle-counts', async (req, res) => {
  try {
    const result = await InventoryService.performCycleCount({
      ...req.body,
      countedBy: req.headers['user-id'] as string || 'system'
    });
    
    logger.info('Cycle count performed', { countId: result.countId });
    res.json(result);
  } catch (error: any) {
    logger.error('Cycle count failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Generate Indigenous Inventory Report
app.get('/api/inventory/reports/indigenous', async (req, res) => {
  try {
    const result = await InventoryService.generateIndigenousInventoryReport({
      reportType: req.query.reportType as string,
      locationIds: req.query.locationIds ? (req.query.locationIds as string).split(',') : undefined,
      productCategories: req.query.productCategories ? (req.query.productCategories as string).split(',') : undefined,
      indigenousOnly: req.query.indigenousOnly === 'true',
      traditionalOnly: req.query.traditionalOnly === 'true',
      communityBreakdown: req.query.communityBreakdown === 'true',
      culturalSignificance: req.query.culturalSignificance ? (req.query.culturalSignificance as string).split(',') : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      includeForecasting: req.query.includeForecasting === 'true',
      format: req.query.format as string,
      generatedBy: req.headers['user-id'] as string || 'system'
    });
    
    logger.info('Indigenous inventory report generated', { reportId: result.reportId });
    res.json(result);
  } catch (error: any) {
    logger.error('Indigenous inventory report generation failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Product Details
app.get('/api/products/:productId', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { productId: req.params.productId },
      include: {
        certifications: {
          where: { isActive: true }
        },
        inventoryItems: {
          include: {
            location: true,
            alerts: {
              where: { status: 'ACTIVE' }
            }
          }
        },
        stockMovements: {
          orderBy: { transactionDate: 'desc' },
          take: 10
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error: any) {
    logger.error('Product details fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Inventory Item Details
app.get('/api/inventory/items/:inventoryId', async (req, res) => {
  try {
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { inventoryId: req.params.inventoryId },
      include: {
        product: {
          include: {
            certifications: {
              where: { isActive: true }
            }
          }
        },
        location: true,
        stockMovements: {
          orderBy: { transactionDate: 'desc' },
          take: 20
        },
        cycleCounts: {
          orderBy: { countDate: 'desc' },
          take: 5
        },
        alerts: {
          where: { status: 'ACTIVE' }
        }
      }
    });
    
    if (!inventoryItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    res.json(inventoryItem);
  } catch (error: any) {
    logger.error('Inventory item details fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Search Products
app.get('/api/products/search', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    
    const where: any = {};
    
    // Text search
    if (req.query.query) {
      where.OR = [
        { name: { contains: req.query.query as string, mode: 'insensitive' } },
        { description: { contains: req.query.query as string, mode: 'insensitive' } },
        { sku: { contains: req.query.query as string, mode: 'insensitive' } }
      ];
    }
    
    // Filters
    if (req.query.category) where.category = req.query.category;
    if (req.query.productType) where.productType = req.query.productType;
    if (req.query.status) where.status = req.query.status;
    
    // Indigenous filters
    if (req.query.indigenousOnly === 'true') where.isIndigenousProduct = true;
    if (req.query.traditionalOnly === 'true') where.traditionalProduct = true;
    if (req.query.indigenousClassification) where.indigenousClassification = req.query.indigenousClassification;
    if (req.query.culturalSignificance) where.culturalSignificance = req.query.culturalSignificance;
    if (req.query.originCommunity) where.originCommunity = req.query.originCommunity;
    if (req.query.seasonalOnly === 'true') where.seasonalProduct = true;
    
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          certifications: {
            where: { isActive: true },
            take: 3
          },
          inventoryItems: {
            select: {
              quantityOnHand: true,
              quantityAvailable: true,
              location: {
                select: {
                  name: true,
                  locationId: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.product.count({ where })
    ]);
    
    const enrichedProducts = products.map(product => ({
      productId: product.productId,
      sku: product.sku,
      name: product.name,
      category: product.category,
      productType: product.productType,
      isIndigenousProduct: product.isIndigenousProduct,
      traditionalProduct: product.traditionalProduct,
      culturalSignificance: product.culturalSignificance,
      originCommunity: product.originCommunity,
      seasonalProduct: product.seasonalProduct,
      status: product.status,
      basePrice: product.basePrice,
      communityPrice: product.communityPrice,
      certifications: product.certifications.length,
      totalInventory: product.inventoryItems.reduce((sum, item) => sum + Number(item.quantityOnHand), 0),
      totalAvailable: product.inventoryItems.reduce((sum, item) => sum + Number(item.quantityAvailable), 0),
      locations: product.inventoryItems.length,
      createdAt: product.createdAt
    }));
    
    res.json({
      products: enrichedProducts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page < Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    logger.error('Product search failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Inventory Summary
app.get('/api/inventory/summary', async (req, res) => {
  try {
    const locationId = req.query.locationId as string;
    const where: any = {};
    
    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { locationId }
      });
      if (location) {
        where.locationId = location.id;
      }
    }
    
    const inventoryItems = await prisma.inventoryItem.findMany({
      where,
      include: {
        product: true
      }
    });
    
    // Calculate summary statistics
    const totalItems = inventoryItems.length;
    const totalValue = inventoryItems.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
    const indigenousItems = inventoryItems.filter(item => item.product.isIndigenousProduct).length;
    const traditionalItems = inventoryItems.filter(item => item.product.traditionalProduct).length;
    const lowStockItems = inventoryItems.filter(item => 
      Number(item.quantityOnHand) <= Number(item.reorderPoint || 0)
    ).length;
    const ceremonyReservedItems = inventoryItems.filter(item => 
      Number(item.ceremonyReservedStock || 0) > 0
    ).length;
    const elderRestrictedItems = inventoryItems.filter(item => 
      Number(item.elderAccessStock || 0) > 0
    ).length;
    
    // ABC Analysis
    const abcAnalysis = {
      A: inventoryItems.filter(item => item.abcClassification === 'A').length,
      B: inventoryItems.filter(item => item.abcClassification === 'B').length,
      C: inventoryItems.filter(item => item.abcClassification === 'C').length,
      traditional: inventoryItems.filter(item => item.abcClassification === 'TRADITIONAL_HIGH_VALUE').length,
      ceremonial: inventoryItems.filter(item => item.abcClassification === 'CEREMONIAL_PRIORITY').length
    };
    
    // Cultural significance breakdown
    const culturalBreakdown = inventoryItems.reduce((acc: any, item) => {
      if (item.product.culturalSignificance) {
        acc[item.product.culturalSignificance] = (acc[item.product.culturalSignificance] || 0) + 1;
      }
      return acc;
    }, {});
    
    res.json({
      summary: {
        totalItems,
        totalValue: totalValue.toFixed(2),
        indigenousItems,
        traditionalItems,
        lowStockItems,
        ceremonyReservedItems,
        elderRestrictedItems,
        indigenousPercentage: totalItems > 0 ? (indigenousItems / totalItems * 100).toFixed(1) : 0,
        traditionalPercentage: totalItems > 0 ? (traditionalItems / totalItems * 100).toFixed(1) : 0
      },
      abcAnalysis,
      culturalBreakdown,
      topCategories: this.getTopCategories(inventoryItems),
      recentActivity: await this.getRecentActivity()
    });
  } catch (error: any) {
    logger.error('Inventory summary fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Active Alerts
app.get('/api/inventory/alerts', async (req, res) => {
  try {
    const alerts = await prisma.inventoryAlert.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        inventoryItem: {
          include: {
            product: {
              select: {
                productId: true,
                name: true,
                isIndigenousProduct: true,
                traditionalProduct: true
              }
            },
            location: {
              select: {
                locationId: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { triggeredAt: 'desc' }
      ],
      take: 50
    });
    
    const enrichedAlerts = alerts.map(alert => ({
      alertId: alert.alertId,
      alertType: alert.alertType,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      product: alert.inventoryItem ? {
        productId: alert.inventoryItem.product.productId,
        name: alert.inventoryItem.product.name,
        isIndigenous: alert.inventoryItem.product.isIndigenousProduct,
        isTraditional: alert.inventoryItem.product.traditionalProduct
      } : null,
      location: alert.inventoryItem ? {
        locationId: alert.inventoryItem.location.locationId,
        name: alert.inventoryItem.location.name
      } : null,
      status: alert.status,
      triggeredAt: alert.triggeredAt,
      indigenousAlert: alert.indigenousAlert,
      elderNotification: alert.elderNotification
    }));
    
    res.json({
      alerts: enrichedAlerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length,
        indigenousAlerts: alerts.filter(a => a.indigenousAlert).length,
        elderNotifications: alerts.filter(a => a.elderNotification).length
      }
    });
  } catch (error: any) {
    logger.error('Inventory alerts fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Locations
app.get('/api/locations', async (req, res) => {
  try {
    const where: any = {};
    
    if (req.query.type) where.type = req.query.type;
    if (req.query.status) where.status = req.query.status;
    if (req.query.indigenousOnly === 'true') where.isIndigenousLocation = true;
    
    const locations = await prisma.location.findMany({
      where,
      include: {
        inventoryItems: {
          select: {
            quantityOnHand: true,
            totalValue: true,
            product: {
              select: {
                isIndigenousProduct: true,
                traditionalProduct: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    const enrichedLocations = locations.map(location => ({
      locationId: location.locationId,
      name: location.name,
      code: location.code,
      type: location.type,
      isIndigenousLocation: location.isIndigenousLocation,
      onReserve: location.onReserve,
      traditionalName: location.traditionalName,
      bandTerritory: location.bandTerritory,
      status: location.status,
      totalItems: location.inventoryItems.length,
      totalValue: location.inventoryItems.reduce((sum, item) => sum + Number(item.totalValue || 0), 0),
      indigenousItems: location.inventoryItems.filter(item => item.product.isIndigenousProduct).length,
      traditionalItems: location.inventoryItems.filter(item => item.product.traditionalProduct).length,
      address: location.address
    }));
    
    res.json({
      locations: enrichedLocations
    });
  } catch (error: any) {
    logger.error('Locations fetch failed', error);
    res.status(400).json({ error: error.message });
  }
});

// Helper methods for the summary endpoint
function getTopCategories(inventoryItems: any[]): any[] {
  const categoryTotals = inventoryItems.reduce((acc: any, item) => {
    const category = item.product.category;
    acc[category] = (acc[category] || 0) + Number(item.totalValue || 0);
    return acc;
  }, {});
  
  return Object.entries(categoryTotals)
    .map(([category, value]) => ({ category, value }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5);
}

async function getRecentActivity(): Promise<any[]> {
  const recentMovements = await prisma.stockMovement.findMany({
    orderBy: { transactionDate: 'desc' },
    take: 10,
    include: {
      product: {
        select: {
          productId: true,
          name: true,
          isIndigenousProduct: true
        }
      }
    }
  });
  
  return recentMovements.map(movement => ({
    movementId: movement.movementId,
    productName: movement.product.name,
    movementType: movement.movementType,
    direction: movement.direction,
    quantity: movement.quantity,
    isIndigenous: movement.product.isIndigenousProduct,
    transactionDate: movement.transactionDate
  }));
}

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
  logger.info(`Indigenous Inventory Service running on port ${PORT}`);
  logger.info('Service capabilities:', {
    productManagement: true,
    inventoryTracking: true,
    stockMovements: true,
    cycleCounting: true,
    indigenousProductTracking: true,
    traditionalKnowledgeProtection: true,
    culturalProtocols: true,
    elderApprovalWorkflows: true,
    communityInventoryTracking: true
  });
});

export default app;