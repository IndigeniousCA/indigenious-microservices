import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, differenceInDays, isAfter, startOfMonth, endOfMonth } from 'date-fns';
import QRCode from 'qrcode';
import _ from 'lodash';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'inventory.log' })
  ]
});

export class InventoryService {
  // Create Indigenous product with traditional tracking
  static async createProduct(params: {
    name: string;
    description?: string;
    category: string;
    subcategory?: string;
    productType: string;
    isIndigenousProduct?: boolean;
    indigenousClassification?: string;
    originCommunity?: string;
    bandNumber?: string;
    treatyTerritory?: string;
    traditionalProduct?: boolean;
    traditionalMethods?: boolean;
    culturalSignificance?: string;
    culturalProtocols?: any;
    elderApprovalRequired?: boolean;
    incorporatesTraditionalKnowledge?: boolean;
    traditionalKnowledgeSource?: string;
    seasonalProduct?: boolean;
    seasonalPattern?: any;
    harvestSeason?: string;
    weight?: number;
    dimensions?: any;
    basePrice?: number;
    communityPrice?: number;
    ceremonyPrice?: number;
    primarySupplierId?: string;
    sustainabilityScore?: number;
    harvestSustainability?: string;
    createdBy: string;
  }) {
    const productId = `PRD-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const sku = this.generateSKU(params.category, params.isIndigenousProduct);
    
    logger.info(`Creating product ${productId}`, { name: params.name });
    
    try {
      // Generate QR code for Indigenous products
      let qrCodeData = null;
      if (params.isIndigenousProduct) {
        const qrData = {
          productId,
          name: params.name,
          community: params.originCommunity,
          traditional: params.traditionalProduct,
          verificationUrl: `https://indigenous.verify/${productId}`
        };
        qrCodeData = await QRCode.toDataURL(JSON.stringify(qrData));
      }
      
      // Create product
      const product = await prisma.product.create({
        data: {
          productId,
          sku,
          name: params.name,
          description: params.description,
          category: params.category,
          subcategory: params.subcategory,
          productType: params.productType as any,
          isIndigenousProduct: params.isIndigenousProduct || false,
          indigenousClassification: params.indigenousClassification as any,
          originCommunity: params.originCommunity,
          bandNumber: params.bandNumber,
          treatyTerritory: params.treatyTerritory,
          traditionalProduct: params.traditionalProduct || false,
          traditionalMethods: params.traditionalMethods || false,
          culturalSignificance: params.culturalSignificance as any,
          culturalProtocols: params.culturalProtocols,
          elderApprovalRequired: params.elderApprovalRequired || false,
          incorporatesTraditionalKnowledge: params.incorporatesTraditionalKnowledge || false,
          traditionalKnowledgeSource: params.traditionalKnowledgeSource,
          seasonalProduct: params.seasonalProduct || false,
          seasonalPattern: params.seasonalPattern,
          harvestSeason: params.harvestSeason,
          weight: params.weight,
          dimensions: params.dimensions,
          basePrice: params.basePrice,
          communityPrice: params.communityPrice,
          ceremonyPrice: params.ceremonyPrice,
          primarySupplierId: params.primarySupplierId,
          sustainabilityScore: params.sustainabilityScore,
          harvestSustainability: params.harvestSustainability as any,
          qrCodeData,
          status: params.elderApprovalRequired ? 'PENDING_APPROVAL' : 'ACTIVE',
          createdBy: params.createdBy
        }
      });
      
      // If Elder approval required, queue for review
      if (params.elderApprovalRequired) {
        await this.queueElderApproval(product);
      }
      
      // Create initial certifications for Indigenous products
      if (params.isIndigenousProduct) {
        await this.createIndigenousAuthentication(product);
      }
      
      // Track Indigenous product creation
      if (params.isIndigenousProduct) {
        await this.trackIndigenousProductCreation(product);
      }
      
      logger.info(`Product ${productId} created successfully`);
      
      return {
        productId,
        sku,
        status: product.status,
        qrCodeGenerated: !!qrCodeData,
        elderApprovalRequired: params.elderApprovalRequired || false,
        nextSteps: this.getProductCreationNextSteps(product)
      };
      
    } catch (error: any) {
      logger.error(`Product creation failed:`, error);
      throw error;
    }
  }
  
  // Add inventory item with traditional tracking
  static async addInventoryItem(params: {
    productId: string;
    locationId: string;
    quantityOnHand: number;
    unitOfMeasure?: string;
    reorderPoint?: number;
    reorderQuantity?: number;
    maximumStock?: number;
    minimumStock?: number;
    safetyStock?: number;
    communityReservedStock?: number;
    ceremonyReservedStock?: number;
    elderAccessStock?: number;
    harvestBatch?: string;
    harvestDate?: Date;
    harvestLocation?: string;
    harvestBy?: string;
    blessedByElder?: boolean;
    ceremonyPerformed?: boolean;
    averageCost?: number;
    lotTracking?: boolean;
    batchTracking?: boolean;
    serialTracking?: boolean;
    createdBy: string;
  }) {
    const inventoryId = `INV-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      // Validate product exists
      const product = await prisma.product.findUnique({
        where: { productId: params.productId }
      });
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Validate location exists
      const location = await prisma.location.findUnique({
        where: { locationId: params.locationId }
      });
      
      if (!location) {
        throw new Error('Location not found');
      }
      
      // Calculate available quantity
      const quantityReserved = (params.communityReservedStock || 0) + 
                              (params.ceremonyReservedStock || 0) + 
                              (params.elderAccessStock || 0);
      const quantityAvailable = Math.max(0, params.quantityOnHand - quantityReserved);
      
      // Determine ABC classification based on value and movement
      const abcClassification = this.calculateABCClassification(
        product,
        params.quantityOnHand,
        params.averageCost || 0
      );
      
      // Create inventory item
      const inventoryItem = await prisma.inventoryItem.create({
        data: {
          inventoryId,
          productId: product.id,
          locationId: location.id,
          quantityOnHand: params.quantityOnHand,
          quantityReserved,
          quantityAvailable,
          unitOfMeasure: params.unitOfMeasure || 'EA',
          reorderPoint: params.reorderPoint,
          reorderQuantity: params.reorderQuantity,
          maximumStock: params.maximumStock,
          minimumStock: params.minimumStock,
          safetyStock: params.safetyStock,
          communityReservedStock: params.communityReservedStock,
          ceremonyReservedStock: params.ceremonyReservedStock,
          elderAccessStock: params.elderAccessStock,
          lotTracking: params.lotTracking || false,
          batchTracking: params.batchTracking || false,
          serialTracking: params.serialTracking || false,
          harvestBatch: params.harvestBatch,
          harvestDate: params.harvestDate,
          harvestLocation: params.harvestLocation,
          harvestBy: params.harvestBy,
          blessedByElder: params.blessedByElder || false,
          ceremonyPerformed: params.ceremonyPerformed || false,
          averageCost: params.averageCost,
          totalValue: params.quantityOnHand * (params.averageCost || 0),
          abcClassification,
          status: 'ACTIVE'
        }
      });
      
      // Create initial stock movement
      await this.createStockMovement({
        productId: product.id,
        inventoryId: inventoryItem.id,
        locationId: location.id,
        movementType: 'RECEIPT',
        direction: 'IN',
        quantity: params.quantityOnHand,
        unitCost: params.averageCost,
        reasonCode: 'RECEIPT',
        isIndigenousTransaction: product.isIndigenousProduct,
        harvestBatch: params.harvestBatch,
        harvestLocation: params.harvestLocation,
        harvestDate: params.harvestDate,
        authorizedBy: params.createdBy
      });
      
      // Set up automated alerts
      await this.setupInventoryAlerts(inventoryItem, product, location);
      
      // If Indigenous product, track in community inventory
      if (product.isIndigenousProduct) {
        await this.trackCommunityInventory(inventoryItem, product);
      }
      
      logger.info(`Inventory item ${inventoryId} added for product ${params.productId}`);
      
      return {
        inventoryId,
        productId: product.productId,
        locationId: location.locationId,
        quantityOnHand: params.quantityOnHand,
        quantityAvailable,
        abcClassification,
        alertsSetup: true,
        traditionTracking: !!(params.harvestBatch || params.blessedByElder)
      };
      
    } catch (error) {
      logger.error('Inventory item creation failed:', error);
      throw error;
    }
  }
  
  // Process stock movement with cultural protocols
  static async processStockMovement(params: {
    productId: string;
    inventoryId?: string;
    locationId: string;
    movementType: string;
    direction: string;
    quantity: number;
    unitCost?: number;
    referenceType?: string;
    referenceId?: string;
    referenceNumber?: string;
    reasonCode: string;
    reasonDescription?: string;
    isIndigenousTransaction?: boolean;
    communityTransaction?: boolean;
    ceremonyTransaction?: boolean;
    elderAuthorized?: boolean;
    batchNumber?: string;
    lotNumber?: string;
    harvestBatch?: string;
    harvestLocation?: string;
    traditionalPreparation?: string;
    culturalSignificance?: string;
    authorizedBy: string;
  }) {
    const movementId = `MOV-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      // Validate product
      const product = await prisma.product.findUnique({
        where: { productId: params.productId }
      });
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Check Elder approval for traditional products
      if (product.traditionalProduct && params.ceremonyTransaction && !params.elderAuthorized) {
        throw new Error('Elder authorization required for ceremonial transactions with traditional products');
      }
      
      // Check cultural protocols
      if (product.culturalProtocols) {
        await this.validateCulturalProtocols(product, params);
      }
      
      // Get inventory item if specified
      let inventoryItem = null;
      if (params.inventoryId) {
        inventoryItem = await prisma.inventoryItem.findUnique({
          where: { inventoryId: params.inventoryId }
        });
      }
      
      // Check availability for outbound movements
      if (params.direction === 'OUT' && inventoryItem) {
        if (inventoryItem.quantityAvailable < params.quantity) {
          throw new Error('Insufficient available quantity');
        }
        
        // Check special access restrictions
        if (params.quantity > (inventoryItem.elderAccessStock || 0) && 
            product.culturalSignificance === 'SACRED' && 
            !params.elderAuthorized) {
          throw new Error('Elder authorization required for sacred items');
        }
      }
      
      // Create stock movement
      const stockMovement = await prisma.stockMovement.create({
        data: {
          movementId,
          productId: product.id,
          inventoryId: inventoryItem?.id,
          locationId: params.locationId,
          movementType: params.movementType as any,
          direction: params.direction as any,
          quantity: params.quantity,
          unitCost: params.unitCost,
          totalCost: params.unitCost ? params.unitCost * params.quantity : null,
          referenceType: params.referenceType as any,
          referenceId: params.referenceId,
          referenceNumber: params.referenceNumber,
          isIndigenousTransaction: params.isIndigenousTransaction || false,
          communityTransaction: params.communityTransaction || false,
          ceremonyTransaction: params.ceremonyTransaction || false,
          elderAuthorized: params.elderAuthorized || false,
          batchNumber: params.batchNumber,
          lotNumber: params.lotNumber,
          harvestBatch: params.harvestBatch,
          harvestLocation: params.harvestLocation,
          traditionalPreparation: params.traditionalPreparation,
          culturalSignificance: params.culturalSignificance,
          reasonCode: params.reasonCode as any,
          reasonDescription: params.reasonDescription,
          authorizedBy: params.authorizedBy,
          status: 'PENDING'
        }
      });
      
      // Update inventory quantities
      if (inventoryItem) {
        await this.updateInventoryQuantities(inventoryItem.id, stockMovement);
      }
      
      // Process the movement
      await this.executeStockMovement(stockMovement);
      
      // Track Indigenous transaction
      if (params.isIndigenousTransaction) {
        await this.trackIndigenousTransaction(stockMovement, product);
      }
      
      // Update community tracking
      if (params.communityTransaction) {
        await this.updateCommunityInventoryTracking(stockMovement, product);
      }
      
      logger.info(`Stock movement ${movementId} processed for product ${params.productId}`);
      
      return {
        movementId,
        status: 'COMPLETED',
        quantityMoved: params.quantity,
        direction: params.direction,
        movementType: params.movementType,
        culturalProtocolsFollowed: !!product.culturalProtocols,
        elderAuthorized: params.elderAuthorized || false
      };
      
    } catch (error) {
      logger.error('Stock movement processing failed:', error);
      throw error;
    }
  }
  
  // Perform cycle count with traditional methods
  static async performCycleCount(params: {
    inventoryId: string;
    countType: string;
    countMethod: string;
    countedQuantity: number;
    traditionalCount?: boolean;
    countingCeremony?: boolean;
    elderSupervision?: boolean;
    communityCount?: boolean;
    countedBy: string;
    elderVerifiedBy?: string;
    notes?: string;
  }) {
    const countId = `CNT-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      // Get inventory item
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { inventoryId: params.inventoryId },
        include: {
          product: true,
          location: true
        }
      });
      
      if (!inventoryItem) {
        throw new Error('Inventory item not found');
      }
      
      // Check if Elder supervision required for traditional products
      if (inventoryItem.product.traditionalProduct && !params.elderSupervision && !params.elderVerifiedBy) {
        logger.warn(`Traditional product count without Elder supervision: ${inventoryItem.product.name}`);
      }
      
      // Calculate variance
      const systemQuantity = inventoryItem.quantityOnHand;
      const variance = params.countedQuantity - Number(systemQuantity);
      const variancePercentage = systemQuantity > 0 ? (variance / Number(systemQuantity)) * 100 : 0;
      
      // Create cycle count record
      const cycleCount = await prisma.cycleCount.create({
        data: {
          countId,
          inventoryId: inventoryItem.id,
          locationId: inventoryItem.locationId,
          productId: inventoryItem.productId,
          countType: params.countType as any,
          countMethod: params.countMethod as any,
          systemQuantity,
          countedQuantity: params.countedQuantity,
          variance,
          variancePercentage,
          traditionalCount: params.traditionalCount || false,
          countingCeremony: params.countingCeremony || false,
          elderSupervision: params.elderSupervision || false,
          communityCount: params.communityCount || false,
          countDate: new Date(),
          countedBy: params.countedBy,
          elderVerification: !!params.elderVerifiedBy,
          elderVerifiedBy: params.elderVerifiedBy,
          elderVerificationDate: params.elderVerifiedBy ? new Date() : null,
          unitCost: inventoryItem.averageCost,
          varianceCost: variance * Number(inventoryItem.averageCost || 0),
          adjustmentRequired: Math.abs(variance) > 0,
          status: 'COMPLETED',
          notes: params.notes
        }
      });
      
      // Create adjustment if variance exists
      let adjustmentId = null;
      if (Math.abs(variance) > 0) {
        adjustmentId = await this.createStockAdjustment({
          inventoryId: inventoryItem.id,
          productId: inventoryItem.productId,
          locationId: inventoryItem.locationId,
          adjustmentType: variance > 0 ? 'POSITIVE' : 'NEGATIVE',
          adjustmentReason: 'CYCLE_COUNT',
          quantityBefore: Number(systemQuantity),
          quantityAfter: params.countedQuantity,
          adjustmentQuantity: Math.abs(variance),
          cycleCountId: cycleCount.id,
          elderApprovalRequired: inventoryItem.product.traditionalProduct,
          authorizedBy: params.countedBy,
          elderApprovedBy: params.elderVerifiedBy
        });
        
        await prisma.cycleCount.update({
          where: { id: cycleCount.id },
          data: {
            adjustmentCreated: true,
            adjustmentId
          }
        });
      }
      
      // Update inventory item count date
      await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          lastCountDate: new Date(),
          countVariance: variance
        }
      });
      
      // Track traditional counting methods
      if (params.traditionalCount || params.countingCeremony) {
        await this.trackTraditionalCounting(cycleCount, inventoryItem.product);
      }
      
      logger.info(`Cycle count ${countId} completed for inventory ${params.inventoryId}`);
      
      return {
        countId,
        variance,
        variancePercentage: Number(variancePercentage.toFixed(2)),
        adjustmentRequired: Math.abs(variance) > 0,
        adjustmentId,
        traditionalMethodsUsed: params.traditionalCount || params.countingCeremony,
        elderVerified: !!params.elderVerifiedBy,
        accuracyScore: this.calculateCountAccuracy(variancePercentage)
      };
      
    } catch (error) {
      logger.error('Cycle count failed:', error);
      throw error;
    }
  }
  
  // Generate Indigenous inventory report
  static async generateIndigenousInventoryReport(params: {
    reportType?: string;
    locationIds?: string[];
    productCategories?: string[];
    indigenousOnly?: boolean;
    traditionalOnly?: boolean;
    communityBreakdown?: boolean;
    culturalSignificance?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    includeForecasting?: boolean;
    format?: string;
    generatedBy: string;
  }) {
    const reportId = `RPT-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      // Build query filters
      const where: any = {};
      
      if (params.indigenousOnly) {
        where.product = {
          isIndigenousProduct: true
        };
      }
      
      if (params.traditionalOnly) {
        where.product = {
          ...where.product,
          traditionalProduct: true
        };
      }
      
      if (params.productCategories && params.productCategories.length > 0) {
        where.product = {
          ...where.product,
          category: { in: params.productCategories }
        };
      }
      
      if (params.locationIds && params.locationIds.length > 0) {
        where.location = {
          locationId: { in: params.locationIds }
        };
      }
      
      if (params.culturalSignificance && params.culturalSignificance.length > 0) {
        where.product = {
          ...where.product,
          culturalSignificance: { in: params.culturalSignificance }
        };
      }
      
      // Get inventory data
      const inventoryItems = await prisma.inventoryItem.findMany({
        where,
        include: {
          product: {
            include: {
              certifications: {
                where: { isActive: true }
              }
            }
          },
          location: true,
          stockMovements: params.dateFrom || params.dateTo ? {
            where: {
              transactionDate: {
                gte: params.dateFrom,
                lte: params.dateTo
              }
            }
          } : false
        }
      });
      
      // Calculate summary statistics
      const totalItems = inventoryItems.length;
      const totalValue = inventoryItems.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
      const indigenousItems = inventoryItems.filter(item => item.product.isIndigenousProduct).length;
      const traditionalItems = inventoryItems.filter(item => item.product.traditionalProduct).length;
      const ceremonyItems = inventoryItems.filter(item => Number(item.ceremonyReservedStock || 0) > 0).length;
      
      // Community breakdown
      let communityBreakdown = null;
      if (params.communityBreakdown) {
        const communities = _.groupBy(
          inventoryItems.filter(item => item.product.isIndigenousProduct),
          'product.originCommunity'
        );
        
        communityBreakdown = Object.keys(communities).map(community => ({
          community,
          items: communities[community].length,
          totalValue: communities[community].reduce((sum, item) => sum + Number(item.totalValue || 0), 0),
          traditionalItems: communities[community].filter(item => item.product.traditionalProduct).length
        }));
      }
      
      // Cultural significance breakdown
      const culturalBreakdown = _.groupBy(
        inventoryItems.filter(item => item.product.culturalSignificance),
        'product.culturalSignificance'
      );
      
      const culturalStats = Object.keys(culturalBreakdown).map(significance => ({
        significance,
        items: culturalBreakdown[significance].length,
        totalValue: culturalBreakdown[significance].reduce((sum, item) => sum + Number(item.totalValue || 0), 0)
      }));
      
      // Seasonal analysis
      const seasonalItems = inventoryItems.filter(item => item.product.seasonalProduct);
      const seasonalAnalysis = {
        totalSeasonalItems: seasonalItems.length,
        currentSeason: this.getCurrentSeason(),
        inSeasonItems: seasonalItems.filter(item => 
          this.isProductInSeason(item.product.seasonalPattern, item.product.harvestSeason)
        ).length
      };
      
      // Stock level analysis
      const stockLevels = {
        lowStock: inventoryItems.filter(item => 
          Number(item.quantityOnHand) <= Number(item.reorderPoint || 0)
        ).length,
        overstock: inventoryItems.filter(item => 
          Number(item.quantityOnHand) > Number(item.maximumStock || Infinity)
        ).length,
        elderRestricted: inventoryItems.filter(item => 
          Number(item.elderAccessStock || 0) > 0
        ).length,
        ceremonyReserved: inventoryItems.filter(item => 
          Number(item.ceremonyReservedStock || 0) > 0
        ).length
      };
      
      // Forecasting data
      let forecastingData = null;
      if (params.includeForecasting) {
        forecastingData = await this.generateInventoryForecast(inventoryItems);
      }
      
      // Build report data
      const reportData = {
        reportId,
        title: `Indigenous Inventory Report - ${format(new Date(), 'yyyy-MM-dd')}`,
        generatedAt: new Date(),
        parameters: params,
        summary: {
          totalItems,
          totalValue,
          indigenousItems,
          indigenousPercentage: totalItems > 0 ? (indigenousItems / totalItems * 100).toFixed(2) : 0,
          traditionalItems,
          ceremonyItems
        },
        inventory: inventoryItems.map(item => ({
          inventoryId: item.inventoryId,
          productId: item.product.productId,
          productName: item.product.name,
          category: item.product.category,
          isIndigenous: item.product.isIndigenousProduct,
          isTraditional: item.product.traditionalProduct,
          culturalSignificance: item.product.culturalSignificance,
          originCommunity: item.product.originCommunity,
          quantityOnHand: item.quantityOnHand,
          quantityAvailable: item.quantityAvailable,
          ceremonyReserved: item.ceremonyReservedStock,
          elderAccess: item.elderAccessStock,
          location: item.location.name,
          totalValue: item.totalValue,
          harvestBatch: item.harvestBatch,
          blessedByElder: item.blessedByElder,
          abcClassification: item.abcClassification
        })),
        communityBreakdown,
        culturalAnalysis: culturalStats,
        seasonalAnalysis,
        stockLevels,
        forecasting: forecastingData
      };
      
      // Save report
      const report = await prisma.inventoryReport.create({
        data: {
          reportId,
          reportType: params.reportType || 'INDIGENOUS_PRODUCTS',
          title: reportData.title,
          description: 'Indigenous inventory analysis and tracking report',
          parameters: params,
          data: reportData,
          summary: reportData.summary,
          indigenousData: {
            communityBreakdown,
            culturalAnalysis: culturalStats,
            seasonalAnalysis
          },
          generatedBy: params.generatedBy,
          format: params.format || 'PDF',
          status: 'COMPLETED'
        }
      });
      
      // Generate document
      const documentUrl = await this.generateReportDocument(reportData, params.format || 'PDF');
      
      await prisma.inventoryReport.update({
        where: { id: report.id },
        data: {
          fileUrl: documentUrl,
          fileSize: 1024 * 100 // Estimated 100KB
        }
      });
      
      logger.info(`Indigenous inventory report ${reportId} generated`);
      
      return {
        reportId,
        title: reportData.title,
        summary: reportData.summary,
        documentUrl,
        totalItems,
        indigenousItems,
        traditionalItems,
        communityCount: communityBreakdown ? communityBreakdown.length : 0,
        culturalSignificanceCount: culturalStats.length
      };
      
    } catch (error) {
      logger.error('Indigenous inventory report generation failed:', error);
      throw error;
    }
  }
  
  // Helper methods
  private static generateSKU(category: string, isIndigenous: boolean = false): string {
    const prefix = isIndigenous ? 'IND' : 'STD';
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${categoryCode}-${timestamp}`;
  }
  
  private static calculateABCClassification(product: any, quantity: number, cost: number): string {
    const value = quantity * cost;
    
    // Special classification for Indigenous/Traditional products
    if (product.culturalSignificance === 'SACRED' || product.culturalSignificance === 'CEREMONIAL') {
      return 'CEREMONIAL_PRIORITY';
    }
    
    if (product.traditionalProduct && value > 1000) {
      return 'TRADITIONAL_HIGH_VALUE';
    }
    
    // Standard ABC classification
    if (value > 10000) return 'A';
    if (value > 1000) return 'B';
    return 'C';
  }
  
  private static async queueElderApproval(product: any) {
    await redis.zadd('elder:approvals:pending', Date.now(), JSON.stringify({
      productId: product.id,
      type: 'PRODUCT_APPROVAL',
      urgency: product.culturalSignificance === 'SACRED' ? 'HIGH' : 'MEDIUM'
    }));
  }
  
  private static async createIndigenousAuthentication(product: any) {
    await prisma.productCertification.create({
      data: {
        certificationId: `CERT-${uuidv4().slice(0, 8)}`,
        productId: product.id,
        name: 'Indigenous Product Authentication',
        type: 'INDIGENOUS_AUTHENTIC',
        issuingBody: 'Indigenous Procurement Platform',
        certificationNumber: `IPA-${Date.now()}`,
        isIndigenousCertification: true,
        traditionalAuthentication: product.traditionalProduct,
        issueDate: new Date(),
        isActive: true,
        scope: 'Product authenticity and Indigenous origin verification'
      }
    });
  }
  
  private static async trackIndigenousProductCreation(product: any) {
    const key = `products:indigenous:${format(new Date(), 'yyyy-MM')}`;
    await redis.hincrby(key, 'created', 1);
    if (product.traditionalProduct) {
      await redis.hincrby(key, 'traditional', 1);
    }
  }
  
  private static getProductCreationNextSteps(product: any): string[] {
    const steps = ['Configure inventory locations'];
    
    if (product.elderApprovalRequired) {
      steps.push('Await Elder approval');
    }
    
    if (product.isIndigenousProduct) {
      steps.push('Complete authentication certification');
      steps.push('Setup community pricing');
    }
    
    if (product.traditionalProduct) {
      steps.push('Document traditional knowledge source');
      steps.push('Setup cultural protocols');
    }
    
    steps.push('Add to inventory system');
    
    return steps;
  }
  
  private static async createStockMovement(params: any) {
    return await prisma.stockMovement.create({
      data: {
        movementId: `MOV-${Date.now()}-${uuidv4().slice(0, 8)}`,
        productId: params.productId,
        inventoryId: params.inventoryId,
        locationId: params.locationId,
        movementType: params.movementType,
        direction: params.direction,
        quantity: params.quantity,
        unitCost: params.unitCost,
        totalCost: params.unitCost ? params.unitCost * params.quantity : null,
        reasonCode: params.reasonCode,
        isIndigenousTransaction: params.isIndigenousTransaction,
        harvestBatch: params.harvestBatch,
        harvestLocation: params.harvestLocation,
        harvestDate: params.harvestDate,
        authorizedBy: params.authorizedBy,
        transactionDate: new Date(),
        status: 'COMPLETED'
      }
    });
  }
  
  private static async setupInventoryAlerts(inventoryItem: any, product: any, location: any) {
    // Low stock alert
    if (inventoryItem.reorderPoint) {
      await prisma.inventoryAlert.create({
        data: {
          alertId: `ALT-${uuidv4().slice(0, 8)}`,
          inventoryId: inventoryItem.id,
          alertType: 'LOW_STOCK',
          severity: 'MEDIUM',
          title: 'Low Stock Alert',
          message: `${product.name} at ${location.name} is below reorder point`,
          triggerCondition: `quantity <= ${inventoryItem.reorderPoint}`,
          status: 'ACTIVE',
          indigenousAlert: product.isIndigenousProduct,
          communityAlert: product.isIndigenousProduct && product.originCommunity,
          elderNotification: product.culturalSignificance === 'SACRED'
        }
      });
    }
    
    // Ceremony shortage alert for traditional products
    if (product.traditionalProduct && inventoryItem.ceremonyReservedStock) {
      await prisma.inventoryAlert.create({
        data: {
          alertId: `ALT-${uuidv4().slice(0, 8)}`,
          inventoryId: inventoryItem.id,
          alertType: 'CEREMONY_SHORTAGE',
          severity: 'HIGH',
          title: 'Ceremony Stock Alert',
          message: `${product.name} ceremony stock running low`,
          triggerCondition: `ceremonyStock <= 5`,
          status: 'ACTIVE',
          indigenousAlert: true,
          elderNotification: true,
          culturalConsideration: 'Ceremonial usage requirements'
        }
      });
    }
  }
  
  private static async trackCommunityInventory(inventoryItem: any, product: any) {
    if (product.originCommunity) {
      const key = `community:inventory:${product.originCommunity}:${format(new Date(), 'yyyy-MM')}`;
      await redis.hincrbyfloat(key, 'total_value', Number(inventoryItem.totalValue || 0));
      await redis.hincrby(key, 'items_count', 1);
      if (product.traditionalProduct) {
        await redis.hincrby(key, 'traditional_items', 1);
      }
    }
  }
  
  private static async validateCulturalProtocols(product: any, params: any) {
    const protocols = product.culturalProtocols;
    
    if (protocols?.requiresElderApproval && !params.elderAuthorized) {
      throw new Error('Elder authorization required by cultural protocols');
    }
    
    if (protocols?.ceremonialUseOnly && !params.ceremonyTransaction) {
      throw new Error('Product restricted to ceremonial use only');
    }
    
    if (protocols?.communityAccessOnly && !params.communityTransaction) {
      throw new Error('Product restricted to community access only');
    }
  }
  
  private static async updateInventoryQuantities(inventoryId: string, movement: any) {
    const currentInventory = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId }
    });
    
    if (!currentInventory) return;
    
    let quantityChange = movement.direction === 'IN' ? movement.quantity : -movement.quantity;
    
    await prisma.inventoryItem.update({
      where: { id: inventoryId },
      data: {
        quantityOnHand: Number(currentInventory.quantityOnHand) + quantityChange,
        quantityAvailable: Math.max(0, 
          Number(currentInventory.quantityOnHand) + quantityChange - 
          Number(currentInventory.quantityReserved || 0)
        ),
        lastCostUpdate: movement.unitCost ? new Date() : currentInventory.lastCostUpdate,
        averageCost: movement.unitCost || currentInventory.averageCost,
        totalValue: (Number(currentInventory.quantityOnHand) + quantityChange) * 
                   Number(movement.unitCost || currentInventory.averageCost || 0)
      }
    });
  }
  
  private static async executeStockMovement(movement: any) {
    await prisma.stockMovement.update({
      where: { id: movement.id },
      data: {
        status: 'COMPLETED',
        effectiveDate: new Date()
      }
    });
  }
  
  private static async trackIndigenousTransaction(movement: any, product: any) {
    const key = `transactions:indigenous:${format(new Date(), 'yyyy-MM')}`;
    await redis.hincrby(key, 'count', 1);
    await redis.hincrbyfloat(key, 'value', Number(movement.totalCost || 0));
    
    if (movement.ceremonyTransaction) {
      await redis.hincrby(key, 'ceremony_count', 1);
    }
    
    if (product.traditionalProduct) {
      await redis.hincrby(key, 'traditional_count', 1);
    }
  }
  
  private static async updateCommunityInventoryTracking(movement: any, product: any) {
    if (product.originCommunity) {
      const key = `community:movements:${product.originCommunity}:${format(new Date(), 'yyyy-MM')}`;
      await redis.hincrby(key, movement.direction.toLowerCase(), 1);
      await redis.hincrbyfloat(key, `${movement.direction.toLowerCase()}_value`, Number(movement.totalCost || 0));
    }
  }
  
  private static async createStockAdjustment(params: any): Promise<string> {
    const adjustmentId = `ADJ-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    await prisma.stockAdjustment.create({
      data: {
        adjustmentId,
        productId: params.productId,
        inventoryId: params.inventoryId,
        locationId: params.locationId,
        adjustmentType: params.adjustmentType,
        adjustmentReason: params.adjustmentReason,
        quantityBefore: params.quantityBefore,
        quantityAfter: params.quantityAfter,
        adjustmentQuantity: params.adjustmentQuantity,
        unitCost: params.unitCost,
        totalCostImpact: params.adjustmentQuantity * (params.unitCost || 0),
        cycleCountId: params.cycleCountId,
        elderApprovalRequired: params.elderApprovalRequired || false,
        elderApprovalStatus: params.elderApprovedBy ? 'APPROVED' : 'PENDING',
        elderApprovedBy: params.elderApprovedBy,
        authorizedBy: params.authorizedBy,
        status: params.elderApprovalRequired && !params.elderApprovedBy ? 'PENDING' : 'APPROVED'
      }
    });
    
    return adjustmentId;
  }
  
  private static async trackTraditionalCounting(cycleCount: any, product: any) {
    const key = `traditional:counts:${format(new Date(), 'yyyy-MM')}`;
    await redis.hincrby(key, 'total', 1);
    
    if (cycleCount.countingCeremony) {
      await redis.hincrby(key, 'ceremony', 1);
    }
    
    if (cycleCount.elderSupervision) {
      await redis.hincrby(key, 'elder_supervised', 1);
    }
    
    if (cycleCount.communityCount) {
      await redis.hincrby(key, 'community', 1);
    }
  }
  
  private static calculateCountAccuracy(variancePercentage: number): number {
    const absVariance = Math.abs(variancePercentage);
    if (absVariance === 0) return 100;
    if (absVariance <= 1) return 95;
    if (absVariance <= 5) return 90;
    if (absVariance <= 10) return 80;
    return 70;
  }
  
  private static getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'SPRING';
    if (month >= 5 && month <= 7) return 'SUMMER';
    if (month >= 8 && month <= 10) return 'FALL';
    return 'WINTER';
  }
  
  private static isProductInSeason(seasonalPattern: any, harvestSeason?: string): boolean {
    if (!seasonalPattern && !harvestSeason) return true;
    
    const currentSeason = this.getCurrentSeason();
    
    if (harvestSeason) {
      return harvestSeason.toUpperCase() === currentSeason;
    }
    
    if (seasonalPattern?.availableSeasons) {
      return seasonalPattern.availableSeasons.includes(currentSeason);
    }
    
    return true;
  }
  
  private static async generateInventoryForecast(inventoryItems: any[]) {
    // Simple forecasting logic - would be more sophisticated in production
    const forecasts = inventoryItems.map(item => ({
      productId: item.product.productId,
      productName: item.product.name,
      currentStock: item.quantityOnHand,
      forecastedDemand: this.calculateSimpleForecast(item),
      recommendedOrder: Math.max(0, this.calculateSimpleForecast(item) - Number(item.quantityAvailable)),
      isTraditional: item.product.traditionalProduct,
      seasonal: item.product.seasonalProduct
    }));
    
    return forecasts.filter(f => f.recommendedOrder > 0).slice(0, 20); // Top 20 items needing reorder
  }
  
  private static calculateSimpleForecast(item: any): number {
    // Simplified forecasting - would use more sophisticated algorithms in production
    const baseForcast = Number(item.reorderQuantity || item.quantityOnHand * 0.3);
    
    // Adjust for seasonal products
    if (item.product.seasonalProduct) {
      const currentSeason = this.getCurrentSeason();
      const inSeason = this.isProductInSeason(item.product.seasonalPattern, item.product.harvestSeason);
      return inSeason ? baseForcast * 1.5 : baseForcast * 0.5;
    }
    
    // Adjust for traditional/ceremonial products
    if (item.product.traditionalProduct) {
      return baseForcast * 1.2; // Higher demand for traditional products
    }
    
    return baseForcast;
  }
  
  private static async generateReportDocument(reportData: any, format: string): Promise<string> {
    // Generate report document URL
    return `/reports/inventory/${reportData.reportId}.${format.toLowerCase()}`;
  }
}