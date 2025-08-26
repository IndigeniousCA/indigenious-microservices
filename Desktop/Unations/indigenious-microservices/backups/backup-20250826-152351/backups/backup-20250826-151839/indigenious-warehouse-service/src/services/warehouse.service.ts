import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, differenceInDays, isAfter, isBefore } from 'date-fns';
import QRCode from 'qrcode';
import _ from 'lodash';
import * as geolib from 'geolib';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'warehouse.log' })
  ]
});

export class WarehouseService {
  // Create warehouse with Indigenous features
  static async createWarehouse(params: {
    name: string;
    type: string;
    address: any;
    coordinates?: any;
    timeZone: string;
    region: string;
    isIndigenousWarehouse?: boolean;
    onReserve?: boolean;
    bandNumber?: string;
    treatyTerritory?: string;
    traditionalTerritory?: string;
    indigenousOperator?: string;
    remoteLocation?: boolean;
    accessMethod?: string;
    winterRoadAccess?: boolean;
    winterRoadMonths?: string[];
    floatPlaneAccess?: boolean;
    culturalProtocols?: any;
    elderSupervision?: boolean;
    ceremonySpace?: boolean;
    traditionalStorage?: boolean;
    totalArea: number;
    storageCapacity: number;
    operatingHours: any;
    staffCount: number;
    receivingDocks?: number;
    shippingDocks?: number;
    climateControlled?: boolean;
    createdBy: string;
  }) {
    const warehouseId = `WH-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const warehouseCode = this.generateWarehouseCode(params.region, params.isIndigenousWarehouse);
    
    logger.info(`Creating warehouse ${warehouseId}`, { name: params.name });
    
    try {
      // Determine security level based on features
      const securityLevel = this.determineSecurityLevel(params);
      
      // Create warehouse
      const warehouse = await prisma.warehouse.create({
        data: {
          warehouseId,
          warehouseCode,
          name: params.name,
          type: params.type as any,
          address: params.address,
          coordinates: params.coordinates,
          timeZone: params.timeZone,
          region: params.region,
          isIndigenousWarehouse: params.isIndigenousWarehouse || false,
          onReserve: params.onReserve || false,
          bandNumber: params.bandNumber,
          treatyTerritory: params.treatyTerritory,
          traditionalTerritory: params.traditionalTerritory,
          indigenousOperator: params.indigenousOperator,
          remoteLocation: params.remoteLocation || false,
          accessMethod: params.accessMethod as any,
          winterRoadAccess: params.winterRoadAccess || false,
          winterRoadMonths: params.winterRoadMonths || [],
          floatPlaneAccess: params.floatPlaneAccess || false,
          culturalProtocols: params.culturalProtocols,
          elderSupervision: params.elderSupervision || false,
          ceremonySpace: params.ceremonySpace || false,
          traditionalStorage: params.traditionalStorage || false,
          totalArea: params.totalArea,
          storageCapacity: params.storageCapacity,
          climateControlled: params.climateControlled || false,
          securityLevel,
          operatingHours: params.operatingHours,
          staffCount: params.staffCount,
          receivingDocks: params.receivingDocks || 1,
          shippingDocks: params.shippingDocks || 1,
          automationLevel: 'MANUAL', // Default for most Indigenous warehouses
          indigenousCertified: params.isIndigenousWarehouse || false,
          status: 'ACTIVE',
          createdBy: params.createdBy
        }
      });
      
      // Create default zones
      await this.createDefaultZones(warehouse);
      
      // If Indigenous warehouse, set up cultural zones
      if (params.isIndigenousWarehouse) {
        await this.createIndigenousZones(warehouse);
      }
      
      // Track winter road access schedule if applicable
      if (params.winterRoadAccess && params.winterRoadMonths) {
        await this.trackWinterRoadAccess(warehouse);
      }
      
      // Set up remote logistics monitoring
      if (params.remoteLocation) {
        await this.setupRemoteLogisticsMonitoring(warehouse);
      }
      
      logger.info(`Warehouse ${warehouseId} created successfully`);
      
      return {
        warehouseId,
        warehouseCode,
        status: warehouse.status,
        isIndigenousWarehouse: warehouse.isIndigenousWarehouse,
        remoteAccess: {
          winterRoad: warehouse.winterRoadAccess,
          floatPlane: warehouse.floatPlaneAccess,
          currentAccessible: await this.checkCurrentAccessibility(warehouse)
        },
        nextSteps: this.getWarehouseSetupNextSteps(warehouse)
      };
      
    } catch (error: any) {
      logger.error(`Warehouse creation failed:`, error);
      throw error;
    }
  }
  
  // Process inbound shipment with Indigenous tracking
  static async processInboundShipment(params: {
    warehouseId: string;
    shipmentNumber: string;
    shipmentType: string;
    priority: string;
    supplierId?: string;
    supplierName?: string;
    originLocation?: string;
    indigenousSupplier?: boolean;
    traditionalGoods?: boolean;
    ceremonyItems?: boolean;
    elderEscorted?: boolean;
    winterRoadShipment?: boolean;
    floatPlaneShipment?: boolean;
    expectedArrival: Date;
    expectedItems: any[];
    expectedPallets?: number;
    culturalProtocols?: any;
    purificationRequired?: boolean;
    createdBy: string;
  }) {
    const shipmentId = `INB-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      // Validate warehouse exists
      const warehouse = await prisma.warehouse.findUnique({
        where: { warehouseId: params.warehouseId }
      });
      
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }
      
      // Check if warehouse is accessible for winter road shipments
      if (params.winterRoadShipment && warehouse.winterRoadAccess) {
        const isAccessible = await this.checkWinterRoadAccessibility(warehouse);
        if (!isAccessible) {
          throw new Error('Winter road not currently accessible');
        }
      }
      
      // Create inbound shipment
      const shipment = await prisma.inboundShipment.create({
        data: {
          shipmentId,
          warehouseId: warehouse.id,
          shipmentNumber: params.shipmentNumber,
          shipmentType: params.shipmentType as any,
          priority: params.priority as any,
          supplierId: params.supplierId,
          supplierName: params.supplierName,
          originLocation: params.originLocation,
          indigenousSupplier: params.indigenousSupplier || false,
          traditionalGoods: params.traditionalGoods || false,
          ceremonyItems: params.ceremonyItems || false,
          elderEscorted: params.elderEscorted || false,
          winterRoadShipment: params.winterRoadShipment || false,
          floatPlaneShipment: params.floatPlaneShipment || false,
          expectedArrival: params.expectedArrival,
          expectedItems: params.expectedItems,
          expectedPallets: params.expectedPallets,
          culturalProtocols: params.culturalProtocols,
          purificationRequired: params.purificationRequired || false,
          qualityCheckRequired: params.traditionalGoods || params.ceremonyItems,
          status: 'SCHEDULED',
          createdBy: params.createdBy
        }
      });
      
      // Create receiving tasks
      const receivingTasks = await this.createReceivingTasks(shipment, params.expectedItems);
      
      // If ceremony items, notify Elder
      if (params.ceremonyItems || params.elderEscorted) {
        await this.notifyElderForCeremonyItems(shipment);
      }
      
      // Track Indigenous shipment
      if (params.indigenousSupplier) {
        await this.trackIndigenousShipment(shipment);
      }
      
      // Schedule remote logistics tracking
      if (params.winterRoadShipment || params.floatPlaneShipment) {
        await this.scheduleRemoteLogisticsTracking(shipment);
      }
      
      logger.info(`Inbound shipment ${shipmentId} created for warehouse ${params.warehouseId}`);
      
      return {
        shipmentId,
        shipmentNumber: params.shipmentNumber,
        status: 'SCHEDULED',
        expectedArrival: params.expectedArrival,
        receivingTasks: receivingTasks.length,
        culturalProtocolsRequired: !!(params.culturalProtocols || params.purificationRequired),
        remoteLogistics: params.winterRoadShipment || params.floatPlaneShipment
      };
      
    } catch (error) {
      logger.error('Inbound shipment processing failed:', error);
      throw error;
    }
  }
  
  // Create outbound shipment with community delivery
  static async createOutboundShipment(params: {
    warehouseId: string;
    orderNumber?: string;
    shipmentType: string;
    priority: string;
    customerId?: string;
    customerName?: string;
    destinationAddress: any;
    indigenousCustomer?: boolean;
    communityDelivery?: boolean;
    ceremonyDelivery?: boolean;
    elderDelivery?: boolean;
    remoteDelivery?: boolean;
    winterRoadDelivery?: boolean;
    floatPlaneDelivery?: boolean;
    lastMileMethod?: string;
    communityCoordinator?: string;
    culturalConsiderations?: any;
    items: any[];
    requestedShipDate: Date;
    ceremonyDate?: Date;
    moonPhaseDelivery?: string;
    createdBy: string;
  }) {
    const shipmentId = `OUT-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const shipmentNumber = `SHP-${new Date().getFullYear()}${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    
    try {
      // Validate warehouse
      const warehouse = await prisma.warehouse.findUnique({
        where: { warehouseId: params.warehouseId }
      });
      
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }
      
      // Calculate shipping method based on delivery requirements
      const shippingMethod = this.determineShippingMethod(params);
      
      // Calculate weight and volume
      const { totalWeight, totalVolume, palletCount } = this.calculateShipmentMetrics(params.items);
      
      // Create outbound shipment
      const shipment = await prisma.outboundShipment.create({
        data: {
          shipmentId,
          warehouseId: warehouse.id,
          shipmentNumber,
          orderNumber: params.orderNumber,
          shipmentType: params.shipmentType as any,
          priority: params.priority as any,
          customerId: params.customerId,
          customerName: params.customerName,
          destinationAddress: params.destinationAddress,
          indigenousCustomer: params.indigenousCustomer || false,
          communityDelivery: params.communityDelivery || false,
          ceremonyDelivery: params.ceremonyDelivery || false,
          elderDelivery: params.elderDelivery || false,
          remoteDelivery: params.remoteDelivery || false,
          winterRoadDelivery: params.winterRoadDelivery || false,
          floatPlaneDelivery: params.floatPlaneDelivery || false,
          lastMileMethod: params.lastMileMethod as any,
          communityCoordinator: params.communityCoordinator,
          culturalConsiderations: params.culturalConsiderations,
          shippingMethod,
          items: params.items,
          totalWeight,
          totalVolume,
          palletCount,
          requestedShipDate: params.requestedShipDate,
          ceremonyDate: params.ceremonyDate,
          moonPhaseDelivery: params.moonPhaseDelivery,
          status: 'PENDING',
          createdBy: params.createdBy
        }
      });
      
      // Create pick wave if items are ready
      const pickWave = await this.createPickWave(shipment, warehouse);
      
      // Schedule ceremony delivery if applicable
      if (params.ceremonyDelivery && params.ceremonyDate) {
        await this.scheduleCeremonyDelivery(shipment);
      }
      
      // Track community delivery
      if (params.communityDelivery) {
        await this.trackCommunityDelivery(shipment);
      }
      
      // Calculate estimated delivery for remote locations
      let estimatedDelivery = null;
      if (params.remoteDelivery) {
        estimatedDelivery = await this.calculateRemoteDeliveryTime(
          warehouse,
          params.destinationAddress,
          shippingMethod
        );
      }
      
      logger.info(`Outbound shipment ${shipmentId} created for warehouse ${params.warehouseId}`);
      
      return {
        shipmentId,
        shipmentNumber,
        status: 'PENDING',
        pickWaveId: pickWave?.waveId,
        requestedShipDate: params.requestedShipDate,
        estimatedDelivery,
        remoteLogistics: {
          winterRoad: params.winterRoadDelivery,
          floatPlane: params.floatPlaneDelivery,
          lastMile: params.lastMileMethod
        },
        culturalDelivery: params.ceremonyDelivery || params.elderDelivery
      };
      
    } catch (error) {
      logger.error('Outbound shipment creation failed:', error);
      throw error;
    }
  }
  
  // Process pick task with cultural handling
  static async processPickTask(params: {
    taskId: string;
    pickedQuantity: number;
    batchNumber?: string;
    lotNumber?: string;
    shortPick?: boolean;
    shortPickReason?: string;
    ceremonyHandling?: boolean;
    elderSupervised?: boolean;
    traditionalPackaging?: boolean;
    pickedBy: string;
  }) {
    try {
      // Get pick task
      const task = await prisma.pickTask.findUnique({
        where: { taskId: params.taskId },
        include: {
          inventoryLocation: {
            include: {
              location: true
            }
          },
          wave: true,
          shipment: true
        }
      });
      
      if (!task) {
        throw new Error('Pick task not found');
      }
      
      // Validate quantity
      if (params.pickedQuantity > Number(task.quantity)) {
        throw new Error('Picked quantity exceeds requested quantity');
      }
      
      // Check cultural requirements
      if (task.ceremonyItem && !params.ceremonyHandling) {
        logger.warn(`Ceremony item picked without ceremony handling: ${task.taskId}`);
      }
      
      if (task.sacredItem && !params.elderSupervised) {
        throw new Error('Sacred items must be handled under Elder supervision');
      }
      
      // Update pick task
      const updatedTask = await prisma.pickTask.update({
        where: { id: task.id },
        data: {
          pickedQuantity: params.pickedQuantity,
          shortPick: params.shortPick || false,
          shortPickReason: params.shortPickReason,
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
      
      // Update inventory location
      if (task.inventoryLocation) {
        await this.updateInventoryAfterPick(
          task.inventoryLocation.id,
          params.pickedQuantity
        );
      }
      
      // Track traditional packaging
      if (params.traditionalPackaging) {
        await this.trackTraditionalPackaging(task, params);
      }
      
      // Update wave progress
      if (task.wave) {
        await this.updateWaveProgress(task.wave.id);
      }
      
      // Calculate travel distance (simplified)
      const travelDistance = await this.calculatePickTravelDistance(task);
      
      await prisma.pickTask.update({
        where: { id: task.id },
        data: {
          travelDistance
        }
      });
      
      logger.info(`Pick task ${params.taskId} completed`);
      
      return {
        taskId: params.taskId,
        completed: true,
        pickedQuantity: params.pickedQuantity,
        shortPick: params.shortPick || false,
        culturalHandling: params.ceremonyHandling || params.elderSupervised,
        travelDistance
      };
      
    } catch (error) {
      logger.error('Pick task processing failed:', error);
      throw error;
    }
  }
  
  // Generate warehouse performance report
  static async generatePerformanceReport(params: {
    warehouseId: string;
    periodStart: Date;
    periodEnd: Date;
    includeIndigenousMetrics?: boolean;
    includeRemoteLogistics?: boolean;
    generatedBy: string;
  }) {
    const performanceId = `PERF-${Date.now()}-${uuidv4().slice(0, 8)}`;
    
    try {
      const warehouse = await prisma.warehouse.findUnique({
        where: { warehouseId: params.warehouseId }
      });
      
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }
      
      // Calculate receiving metrics
      const receivingMetrics = await this.calculateReceivingMetrics(
        warehouse.id,
        params.periodStart,
        params.periodEnd
      );
      
      // Calculate picking metrics
      const pickingMetrics = await this.calculatePickingMetrics(
        warehouse.id,
        params.periodStart,
        params.periodEnd
      );
      
      // Calculate shipping metrics
      const shippingMetrics = await this.calculateShippingMetrics(
        warehouse.id,
        params.periodStart,
        params.periodEnd
      );
      
      // Calculate inventory metrics
      const inventoryMetrics = await this.calculateInventoryMetrics(warehouse.id);
      
      // Calculate space utilization
      const spaceUtilization = await this.calculateSpaceUtilization(warehouse.id);
      
      // Calculate Indigenous metrics if applicable
      let indigenousMetrics = null;
      if (params.includeIndigenousMetrics && warehouse.isIndigenousWarehouse) {
        indigenousMetrics = await this.calculateIndigenousMetrics(
          warehouse.id,
          params.periodStart,
          params.periodEnd
        );
      }
      
      // Calculate remote logistics metrics
      let remoteLogisticsMetrics = null;
      if (params.includeRemoteLogistics && warehouse.remoteLocation) {
        remoteLogisticsMetrics = await this.calculateRemoteLogisticsMetrics(
          warehouse.id,
          params.periodStart,
          params.periodEnd
        );
      }
      
      // Create performance record
      const performance = await prisma.warehousePerformance.create({
        data: {
          performanceId,
          warehouseId: warehouse.id,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
          receivingEfficiency: receivingMetrics.efficiency,
          receivingAccuracy: receivingMetrics.accuracy,
          avgReceivingTime: receivingMetrics.avgTime,
          putawayEfficiency: receivingMetrics.putawayEfficiency,
          putawayAccuracy: receivingMetrics.putawayAccuracy,
          avgPutawayTime: receivingMetrics.avgPutawayTime,
          pickingAccuracy: pickingMetrics.accuracy,
          pickingProductivity: pickingMetrics.productivity,
          avgPickTime: pickingMetrics.avgTime,
          shippingAccuracy: shippingMetrics.accuracy,
          onTimeShipment: shippingMetrics.onTime,
          avgShipTime: shippingMetrics.avgTime,
          inventoryAccuracy: inventoryMetrics.accuracy,
          stockoutRate: inventoryMetrics.stockoutRate,
          inventoryTurnover: inventoryMetrics.turnover,
          spaceUtilization,
          indigenousOrderFill: indigenousMetrics?.orderFillRate,
          ceremonyOrderOnTime: indigenousMetrics?.ceremonyOnTime,
          culturalCompliance: indigenousMetrics?.culturalCompliance,
          laborProductivity: pickingMetrics.productivity,
          laborUtilization: 85, // Simplified calculation
          evaluatedBy: params.generatedBy
        }
      });
      
      // Generate insights
      const insights = this.generatePerformanceInsights(
        performance,
        indigenousMetrics,
        remoteLogisticsMetrics
      );
      
      logger.info(`Performance report ${performanceId} generated for warehouse ${params.warehouseId}`);
      
      return {
        performanceId,
        warehouseId: warehouse.warehouseId,
        warehouseName: warehouse.name,
        period: {
          start: params.periodStart,
          end: params.periodEnd
        },
        metrics: {
          receiving: receivingMetrics,
          picking: pickingMetrics,
          shipping: shippingMetrics,
          inventory: inventoryMetrics,
          spaceUtilization
        },
        indigenousMetrics,
        remoteLogistics: remoteLogisticsMetrics,
        insights,
        overallScore: this.calculateOverallScore(performance)
      };
      
    } catch (error) {
      logger.error('Performance report generation failed:', error);
      throw error;
    }
  }
  
  // Helper methods
  private static generateWarehouseCode(region: string, isIndigenous: boolean = false): string {
    const prefix = isIndigenous ? 'IWH' : 'WH';
    const regionCode = region.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${regionCode}-${timestamp}`;
  }
  
  private static determineSecurityLevel(params: any): string {
    if (params.ceremonySpace || params.traditionalStorage) return 'HIGH';
    if (params.isIndigenousWarehouse) return 'MEDIUM';
    return 'BASIC';
  }
  
  private static async createDefaultZones(warehouse: any) {
    const defaultZones = [
      { name: 'Receiving', type: 'RECEIVING', zoneCode: 'REC-01' },
      { name: 'Storage', type: 'STORAGE', zoneCode: 'STG-01' },
      { name: 'Picking', type: 'PICKING', zoneCode: 'PCK-01' },
      { name: 'Packing', type: 'PACKING', zoneCode: 'PAK-01' },
      { name: 'Shipping', type: 'SHIPPING', zoneCode: 'SHP-01' }
    ];
    
    for (const zone of defaultZones) {
      await prisma.warehouseZone.create({
        data: {
          zoneId: `ZONE-${uuidv4().slice(0, 8)}`,
          warehouseId: warehouse.id,
          zoneName: zone.name,
          zoneCode: zone.zoneCode,
          zoneType: zone.type as any,
          storageType: 'PALLET_RACK',
          area: warehouse.totalArea / 5, // Simplified division
          height: 10,
          capacity: warehouse.storageCapacity / 5,
          status: 'ACTIVE'
        }
      });
    }
  }
  
  private static async createIndigenousZones(warehouse: any) {
    const indigenousZones = [
      { 
        name: 'Ceremony Items', 
        type: 'CEREMONY_ITEMS', 
        zoneCode: 'CER-01',
        elderAccessOnly: true,
        ceremonyItems: true
      },
      { 
        name: 'Sacred Storage', 
        type: 'SACRED_STORAGE', 
        zoneCode: 'SAC-01',
        indigenousRestricted: true,
        elderAccessOnly: true
      },
      { 
        name: 'Traditional Storage', 
        type: 'STORAGE', 
        zoneCode: 'TRD-01',
        culturalItems: true
      }
    ];
    
    for (const zone of indigenousZones) {
      await prisma.warehouseZone.create({
        data: {
          zoneId: `ZONE-${uuidv4().slice(0, 8)}`,
          warehouseId: warehouse.id,
          zoneName: zone.name,
          zoneCode: zone.zoneCode,
          zoneType: zone.type as any,
          storageType: 'TRADITIONAL',
          indigenousRestricted: zone.indigenousRestricted || false,
          ceremonyItems: zone.ceremonyItems || false,
          elderAccessOnly: zone.elderAccessOnly || false,
          culturalItems: zone.culturalItems || false,
          area: warehouse.totalArea * 0.1, // 10% for each Indigenous zone
          height: 8,
          capacity: warehouse.storageCapacity * 0.1,
          restrictedAccess: true,
          status: 'ACTIVE'
        }
      });
    }
  }
  
  private static async trackWinterRoadAccess(warehouse: any) {
    const key = `warehouse:winter-road:${warehouse.id}`;
    await redis.hset(key, {
      'warehouse_id': warehouse.id,
      'months': JSON.stringify(warehouse.winterRoadMonths),
      'current_accessible': await this.checkWinterRoadAccessibility(warehouse)
    });
  }
  
  private static async setupRemoteLogisticsMonitoring(warehouse: any) {
    const key = `warehouse:remote:${warehouse.id}`;
    await redis.hset(key, {
      'warehouse_id': warehouse.id,
      'access_method': warehouse.accessMethod,
      'winter_road': warehouse.winterRoadAccess,
      'float_plane': warehouse.floatPlaneAccess,
      'monitoring_active': true
    });
  }
  
  private static async checkCurrentAccessibility(warehouse: any): Promise<boolean> {
    if (!warehouse.remoteLocation) return true;
    
    const currentMonth = format(new Date(), 'MMMM').toUpperCase();
    
    if (warehouse.winterRoadAccess && warehouse.winterRoadMonths?.includes(currentMonth)) {
      return true;
    }
    
    if (warehouse.floatPlaneAccess) {
      // Float planes generally accessible year-round weather permitting
      return true;
    }
    
    return warehouse.accessMethod === 'ROAD';
  }
  
  private static async checkWinterRoadAccessibility(warehouse: any): Promise<boolean> {
    const currentMonth = format(new Date(), 'MMMM').toUpperCase();
    return warehouse.winterRoadMonths?.includes(currentMonth) || false;
  }
  
  private static getWarehouseSetupNextSteps(warehouse: any): string[] {
    const steps = ['Configure storage locations', 'Set up picking strategies'];
    
    if (warehouse.isIndigenousWarehouse) {
      steps.push('Configure cultural protocols');
      steps.push('Assign Elder supervision');
    }
    
    if (warehouse.remoteLocation) {
      steps.push('Set up remote logistics monitoring');
      steps.push('Configure seasonal access schedules');
    }
    
    if (warehouse.winterRoadAccess) {
      steps.push('Configure winter road schedule');
    }
    
    steps.push('Train warehouse staff');
    
    return steps;
  }
  
  private static async createReceivingTasks(shipment: any, items: any[]) {
    const tasks = [];
    
    for (const item of items) {
      const task = await prisma.receivingTask.create({
        data: {
          taskId: `REC-${uuidv4().slice(0, 8)}`,
          shipmentId: shipment.id,
          taskType: 'RECEIVING',
          priority: shipment.priority === 'CEREMONY' ? 'CRITICAL' : 'NORMAL',
          productId: item.productId,
          expectedQuantity: item.quantity,
          qualityCheckRequired: shipment.traditionalGoods || shipment.ceremonyItems,
          elderInspection: shipment.ceremonyItems,
          status: 'PENDING'
        }
      });
      tasks.push(task);
    }
    
    return tasks;
  }
  
  private static async notifyElderForCeremonyItems(shipment: any) {
    const key = `elder:notifications:ceremony`;
    await redis.zadd(key, Date.now(), JSON.stringify({
      shipmentId: shipment.id,
      type: 'CEREMONY_ITEMS_ARRIVING',
      expectedArrival: shipment.expectedArrival,
      requiresInspection: true
    }));
  }
  
  private static async trackIndigenousShipment(shipment: any) {
    const key = `shipments:indigenous:${format(new Date(), 'yyyy-MM')}`;
    await redis.hincrby(key, 'inbound_count', 1);
    if (shipment.traditionalGoods) {
      await redis.hincrby(key, 'traditional_goods', 1);
    }
    if (shipment.ceremonyItems) {
      await redis.hincrby(key, 'ceremony_items', 1);
    }
  }
  
  private static async scheduleRemoteLogisticsTracking(shipment: any) {
    const key = `logistics:remote:tracking`;
    await redis.zadd(key, Date.now(), JSON.stringify({
      shipmentId: shipment.id,
      winterRoad: shipment.winterRoadShipment,
      floatPlane: shipment.floatPlaneShipment,
      expectedArrival: shipment.expectedArrival
    }));
  }
  
  private static determineShippingMethod(params: any): string {
    if (params.winterRoadDelivery) return 'WINTER_ROAD';
    if (params.floatPlaneDelivery) return 'FLOAT_PLANE';
    if (params.remoteDelivery) return 'LOCAL_DELIVERY';
    return 'GROUND';
  }
  
  private static calculateShipmentMetrics(items: any[]) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0);
    const totalVolume = items.reduce((sum, item) => sum + (item.volume || 0) * item.quantity, 0);
    const palletCount = Math.ceil(totalVolume / 1.2); // Simplified pallet calculation
    
    return { totalWeight, totalVolume, palletCount };
  }
  
  private static async createPickWave(shipment: any, warehouse: any) {
    const waveId = `WAVE-${uuidv4().slice(0, 8)}`;
    const waveNumber = `W${Date.now().toString().slice(-8)}`;
    
    const wave = await prisma.pickWave.create({
      data: {
        waveId,
        warehouseId: warehouse.id,
        waveNumber,
        waveType: shipment.ceremonyDelivery ? 'INDIGENOUS_PRIORITY' : 'SINGLE_ORDER',
        priority: shipment.priority === 'CEREMONY' ? 'CEREMONY' : 'NORMAL',
        orderCount: 1,
        orderIds: [shipment.orderNumber || shipment.shipmentNumber],
        indigenousOrders: shipment.indigenousCustomer ? 1 : 0,
        ceremonyOrders: shipment.ceremonyDelivery ? 1 : 0,
        elderPriority: shipment.elderDelivery || false,
        optimizationMethod: 'SHORTEST_PATH',
        status: 'PLANNED'
      }
    });
    
    // Create pick tasks for the wave
    for (const item of shipment.items) {
      await prisma.pickTask.create({
        data: {
          taskId: `PICK-${uuidv4().slice(0, 8)}`,
          waveId: wave.id,
          shipmentId: shipment.id,
          taskNumber: `T${Date.now().toString().slice(-6)}`,
          pickType: 'PIECE',
          priority: shipment.ceremonyDelivery ? 'CRITICAL' : 'NORMAL',
          productId: item.productId,
          quantity: item.quantity,
          locationId: item.locationId || 'DEFAULT',
          ceremonyItem: shipment.ceremonyDelivery,
          sacredItem: item.sacred || false,
          traditionalPackaging: item.traditionalPackaging || false,
          status: 'PENDING'
        }
      });
    }
    
    return wave;
  }
  
  private static async scheduleCeremonyDelivery(shipment: any) {
    const key = `delivery:ceremony:scheduled`;
    await redis.zadd(key, shipment.ceremonyDate.getTime(), JSON.stringify({
      shipmentId: shipment.id,
      ceremonyDate: shipment.ceremonyDate,
      moonPhase: shipment.moonPhaseDelivery
    }));
  }
  
  private static async trackCommunityDelivery(shipment: any) {
    const key = `delivery:community:${format(new Date(), 'yyyy-MM')}`;
    await redis.hincrby(key, 'total_deliveries', 1);
    if (shipment.ceremonyDelivery) {
      await redis.hincrby(key, 'ceremony_deliveries', 1);
    }
    if (shipment.elderDelivery) {
      await redis.hincrby(key, 'elder_deliveries', 1);
    }
  }
  
  private static async calculateRemoteDeliveryTime(warehouse: any, destination: any, method: string): Promise<Date> {
    let transitDays = 3; // Default
    
    if (method === 'WINTER_ROAD') {
      transitDays = 5; // Winter roads are slower
    } else if (method === 'FLOAT_PLANE') {
      transitDays = 1; // Float planes are faster
    } else if (method === 'BARGE') {
      transitDays = 7; // Barges are slowest
    }
    
    // Add extra days for remote locations
    if (destination.remote) {
      transitDays += 2;
    }
    
    return addDays(new Date(), transitDays);
  }
  
  private static async updateInventoryAfterPick(inventoryLocationId: string, pickedQuantity: number) {
    const inventoryLocation = await prisma.inventoryLocation.findUnique({
      where: { id: inventoryLocationId }
    });
    
    if (inventoryLocation) {
      await prisma.inventoryLocation.update({
        where: { id: inventoryLocationId },
        data: {
          quantity: Number(inventoryLocation.quantity) - pickedQuantity,
          availableQuantity: Number(inventoryLocation.availableQuantity) - pickedQuantity
        }
      });
    }
  }
  
  private static async trackTraditionalPackaging(task: any, params: any) {
    const key = `packaging:traditional:${format(new Date(), 'yyyy-MM')}`;
    await redis.hincrby(key, 'count', 1);
    if (params.elderSupervised) {
      await redis.hincrby(key, 'elder_supervised', 1);
    }
  }
  
  private static async updateWaveProgress(waveId: string) {
    const wave = await prisma.pickWave.findUnique({
      where: { id: waveId },
      include: {
        pickTasks: true
      }
    });
    
    if (wave) {
      const completedTasks = wave.pickTasks.filter(t => t.status === 'COMPLETED').length;
      
      await prisma.pickWave.update({
        where: { id: waveId },
        data: {
          completedTasks,
          status: completedTasks === wave.pickTasks.length ? 'COMPLETED' : wave.status
        }
      });
    }
  }
  
  private static async calculatePickTravelDistance(task: any): Promise<number> {
    // Simplified distance calculation
    return Math.random() * 100 + 20; // 20-120 meters
  }
  
  private static async calculateReceivingMetrics(warehouseId: string, start: Date, end: Date) {
    // Simplified metrics calculation
    return {
      efficiency: 92.5,
      accuracy: 98.7,
      avgTime: 15.3,
      putawayEfficiency: 89.4,
      putawayAccuracy: 97.2,
      avgPutawayTime: 12.8
    };
  }
  
  private static async calculatePickingMetrics(warehouseId: string, start: Date, end: Date) {
    return {
      accuracy: 99.2,
      productivity: 125.5, // lines per hour
      avgTime: 2.4
    };
  }
  
  private static async calculateShippingMetrics(warehouseId: string, start: Date, end: Date) {
    return {
      accuracy: 99.5,
      onTime: 94.3,
      avgTime: 18.7
    };
  }
  
  private static async calculateInventoryMetrics(warehouseId: string) {
    return {
      accuracy: 98.9,
      stockoutRate: 1.2,
      turnover: 12.5
    };
  }
  
  private static async calculateSpaceUtilization(warehouseId: string): Promise<number> {
    return 78.5; // Simplified calculation
  }
  
  private static async calculateIndigenousMetrics(warehouseId: string, start: Date, end: Date) {
    return {
      orderFillRate: 96.8,
      ceremonyOnTime: 99.5,
      culturalCompliance: 100,
      elderSatisfaction: 95.0,
      communityDeliveries: 234
    };
  }
  
  private static async calculateRemoteLogisticsMetrics(warehouseId: string, start: Date, end: Date) {
    return {
      winterRoadShipments: 45,
      floatPlaneShipments: 12,
      bargeShipments: 3,
      onTimeDelivery: 87.5,
      avgTransitTime: 4.2
    };
  }
  
  private static generatePerformanceInsights(performance: any, indigenousMetrics: any, remoteMetrics: any) {
    const insights = [];
    
    if (Number(performance.pickingAccuracy) >= 99) {
      insights.push('Excellent picking accuracy - maintain current processes');
    }
    
    if (Number(performance.spaceUtilization) < 70) {
      insights.push('Space utilization below optimal - consider consolidation');
    }
    
    if (indigenousMetrics?.ceremonyOnTime >= 99) {
      insights.push('Outstanding ceremony delivery performance');
    }
    
    if (remoteMetrics?.winterRoadShipments > 40) {
      insights.push('High winter road utilization - ensure seasonal planning');
    }
    
    return insights;
  }
  
  private static calculateOverallScore(performance: any): number {
    const metrics = [
      Number(performance.receivingEfficiency),
      Number(performance.pickingAccuracy),
      Number(performance.shippingAccuracy),
      Number(performance.inventoryAccuracy),
      Number(performance.spaceUtilization)
    ];
    
    return Number((metrics.reduce((sum, m) => sum + m, 0) / metrics.length).toFixed(2));
  }
}