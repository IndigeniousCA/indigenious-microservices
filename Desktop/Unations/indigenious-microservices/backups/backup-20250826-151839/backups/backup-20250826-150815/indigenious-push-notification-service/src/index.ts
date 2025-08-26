import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { PushNotificationService } from './services/push-notification.service';
import { PrismaClient } from '@prisma/client';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

const prisma = new PrismaClient();
const pushService = new PushNotificationService();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP'
});

app.use('/api', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const stats = await pushService.getNotificationStats();
    
    res.json({
      status: 'healthy',
      service: 'indigenious-push-notification-service',
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes

// Send push notification
app.post('/api/notifications/send', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Add user context
    const notificationData = {
      ...req.body,
      userId: req.body.userId || userId
    };
    
    // Check permissions for Indigenous notifications
    if (notificationData.elderNotification && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Elder notifications' });
    }
    
    if (notificationData.emergencyNotification && !['admin', 'emergency-coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for emergency notifications' });
    }
    
    const notificationId = await pushService.sendNotification(notificationData);
    res.status(201).json({ notificationId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send notification' 
    });
  }
});

// Send bulk notifications
app.post('/api/notifications/bulk', async (req, res) => {
  try {
    const { notifications } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    if (!Array.isArray(notifications)) {
      return res.status(400).json({ error: 'Notifications must be an array' });
    }
    
    // Check permissions
    if (!['admin', 'campaign-manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for bulk notifications' });
    }
    
    const notificationIds = [];
    for (const notificationData of notifications) {
      try {
        const notificationId = await pushService.sendNotification({ ...notificationData, userId });
        notificationIds.push(notificationId);
      } catch (error) {
        console.error('Failed to process notification:', error);
      }
    }
    
    res.json({ 
      processed: notificationIds.length, 
      total: notifications.length,
      notificationIds 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process bulk notifications' 
    });
  }
});

// Get notification status
app.get('/api/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const notification = await pushService.getNotificationById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Check access permissions for Indigenous notifications
    if (notification.indigenousNotification && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Indigenous notification data' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get notification' 
    });
  }
});

// Track notification interaction
app.post('/api/notifications/:notificationId/interaction', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await pushService.trackInteraction(notificationId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to track interaction' 
    });
  }
});

// Device management

// Register device
app.post('/api/devices/register', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    const deviceData = {
      ...req.body,
      userId: userId || req.body.userId
    };
    
    const deviceId = await pushService.registerDevice(deviceData);
    res.status(201).json({ deviceId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to register device' 
    });
  }
});

// Update device settings
app.put('/api/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.headers['x-user-id'] as string;
    
    const device = await prisma.device.findUnique({
      where: { id: deviceId }
    });
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Users can only update their own devices
    if (device.userId !== userId && !['admin'].includes(req.headers['x-user-role'] as string)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: req.body
    });
    
    res.json(updatedDevice);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update device' 
    });
  }
});

// Topics

// Create topic
app.post('/api/topics', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous topics
    if (req.body.indigenousTopic && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous topics' });
    }
    
    const topic = await prisma.topic.create({
      data: {
        ...req.body,
        ownerId: userId
      }
    });
    
    res.status(201).json(topic);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create topic' 
    });
  }
});

// Subscribe to topic
app.post('/api/topics/:topicName/subscribe', async (req, res) => {
  try {
    const { topicName } = req.params;
    const { deviceId } = req.body;
    
    const topic = await prisma.topic.findUnique({
      where: { topicName }
    });
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // Check if subscription requires approval
    if (topic.requiresApproval) {
      // Would implement approval workflow
    }
    
    const subscription = await prisma.topicSubscription.create({
      data: {
        topicId: topic.id,
        deviceId,
        ceremonyAlerts: req.body.ceremonyAlerts || false,
        elderMessages: req.body.elderMessages || false,
        emergencyOnly: req.body.emergencyOnly || false
      }
    });
    
    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to subscribe to topic' 
    });
  }
});

// Templates

// Create notification template
app.post('/api/notification-templates', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous templates
    if (req.body.indigenousTemplate && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous templates' });
    }
    
    const template = await prisma.notificationTemplate.create({
      data: req.body
    });
    
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create template' 
    });
  }
});

// Get templates
app.get('/api/notification-templates', async (req, res) => {
  try {
    const { category, indigenousTemplate, active = true } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    
    const where: any = { active: active === 'true' };
    
    if (category) where.category = category;
    if (indigenousTemplate) where.indigenousTemplate = indigenousTemplate === 'true';
    
    // Restrict access to Indigenous templates
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      where.indigenousTemplate = false;
      where.elderTemplate = false;
      where.emergencyTemplate = false;
    }
    
    const templates = await prisma.notificationTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(templates);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get templates' 
    });
  }
});

// Campaigns

// Create notification campaign
app.post('/api/notification-campaigns', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous campaigns
    if (req.body.indigenousCampaign && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous campaigns' });
    }
    
    const campaign = await prisma.notificationCampaign.create({
      data: {
        ...req.body,
        createdBy: userId
      }
    });
    
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create campaign' 
    });
  }
});

// Send campaign
app.post('/api/notification-campaigns/:campaignId/send', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const campaign = await prisma.notificationCampaign.findUnique({
      where: { id: campaignId },
      include: { topics: true }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check permissions
    if (campaign.indigenousCampaign && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to send Indigenous campaign' });
    }
    
    // Send notifications to all topic subscribers
    for (const topic of campaign.topics) {
      await pushService.sendNotification({
        topic: topic.topicName,
        title: campaign.title,
        body: campaign.body,
        image: campaign.imageUrl,
        data: campaign.data,
        indigenousNotification: campaign.indigenousCampaign,
        elderNotification: campaign.elderCampaign,
        ceremonyNotification: campaign.ceremonyCampaign,
        emergencyNotification: campaign.emergencyCampaign,
        nation: campaign.nation,
        campaignId: campaign.id
      });
    }
    
    // Update campaign status
    await prisma.notificationCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date()
      }
    });
    
    res.json({ message: 'Campaign sent successfully' });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send campaign' 
    });
  }
});

// Indigenous-specific endpoints

// Elder notifications
app.get('/api/notifications/elder', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Elder notifications' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const notifications = await prisma.pushNotification.findMany({
      where: { elderNotification: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        device: true,
        interactions: true
      }
    });
    
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get Elder notifications' 
    });
  }
});

// Emergency notifications
app.get('/api/notifications/emergency', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'emergency-coordinator', 'elder'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to emergency notifications' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const notifications = await prisma.pushNotification.findMany({
      where: { emergencyNotification: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get emergency notifications' 
    });
  }
});

// Analytics
app.get('/api/notifications/analytics', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to analytics' });
    }
    
    const stats = await pushService.getNotificationStats();
    
    // Calculate engagement rates
    const engagementRate = stats.sentNotifications > 0 
      ? (stats.clickedNotifications / stats.sentNotifications) * 100 
      : 0;
    
    const deliveryRate = stats.sentNotifications > 0 
      ? (stats.deliveredNotifications / stats.sentNotifications) * 100 
      : 0;
    
    res.json({
      ...stats,
      engagementRate,
      deliveryRate,
      platformBreakdown: await this.getPlatformBreakdown(),
      nationEngagement: await this.getNationEngagement()
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get analytics' 
    });
  }
});

// WebSocket events for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected to push notification service');
  
  // Subscribe to notification updates
  socket.on('subscribe:notifications', (userId: string) => {
    socket.join(`user:${userId}`);
  });
  
  // Subscribe to topic notifications
  socket.on('subscribe:topic', (topicName: string) => {
    socket.join(`topic:${topicName}`);
  });
  
  // Subscribe to emergency notifications
  socket.on('subscribe:emergency', () => {
    socket.join('emergency');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from push notification service');
  });
});

// Listen for notification events
pushService.on('notificationSent', (notification) => {
  // Broadcast to user
  if (notification.userId) {
    io.to(`user:${notification.userId}`).emit('notification:sent', notification);
  }
  
  // Broadcast to topic
  if (notification.topic) {
    io.to(`topic:${notification.topic}`).emit('notification:sent', notification);
  }
  
  // Broadcast emergency notifications
  if (notification.emergencyNotification) {
    io.to('emergency').emit('emergency:notification', notification);
  }
});

pushService.on('notificationInteraction', ({ notificationId, interaction }) => {
  io.emit('notification:interaction', { notificationId, interaction });
});

// Helper methods for analytics
async function getPlatformBreakdown(): Promise<any> {
  const platforms = await prisma.device.groupBy({
    by: ['platform'],
    _count: { id: true }
  });
  
  const breakdown: any = {};
  for (const platform of platforms) {
    breakdown[platform.platform] = platform._count.id;
  }
  
  return breakdown;
}

async function getNationEngagement(): Promise<any> {
  const nations = await prisma.pushNotification.groupBy({
    by: ['nation'],
    where: { nation: { not: null } },
    _count: { id: true }
  });
  
  const engagement: any = {};
  for (const nation of nations) {
    if (nation.nation) {
      const clicked = await prisma.pushNotification.count({
        where: { nation: nation.nation, status: 'CLICKED' }
      });
      
      engagement[nation.nation] = {
        total: nation._count.id,
        clicked,
        engagementRate: nation._count.id > 0 ? (clicked / nation._count.id) * 100 : 0
      };
    }
  }
  
  return engagement;
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3046;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Push Notification Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Features enabled:');
  console.log('- Multi-platform support (iOS, Android, Web, Expo)');
  console.log('- Elder priority notifications');
  console.log('- Emergency alert system');
  console.log('- Ceremony-aware notifications');
  console.log('- Cultural sensitivity protection');
  console.log('- Traditional content delivery');
  console.log('- Nation-specific targeting');
  console.log('- Topic-based broadcasting');
  console.log('- Real-time WebSocket updates');
  console.log('- Comprehensive analytics');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  httpServer.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});