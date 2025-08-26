import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { SMSService } from './services/sms.service';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const smsService = new SMSService();

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
    const stats = await smsService.getSMSStats();
    
    res.json({
      status: 'healthy',
      service: 'indigenious-sms-service',
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

// Send single SMS
app.post('/api/sms/send', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Add user context to SMS data
    const smsData = {
      ...req.body,
      userId
    };
    
    // Check permissions for Indigenous SMS
    if (smsData.elderRecipient && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Elder communications' });
    }
    
    if (smsData.emergencyMessage && !['admin', 'emergency-coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for emergency messages' });
    }
    
    const smsId = await smsService.sendSMS(smsData);
    res.status(201).json({ smsId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send SMS' 
    });
  }
});

// Send bulk SMS
app.post('/api/sms/bulk', async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages must be an array' });
    }
    
    // Check permissions for bulk SMS
    if (!['admin', 'campaign-manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for bulk SMS' });
    }
    
    const smsIds = [];
    for (const smsData of messages) {
      try {
        const smsId = await smsService.sendSMS({ ...smsData, userId });
        smsIds.push(smsId);
      } catch (error) {
        console.error('Failed to process SMS:', error);
      }
    }
    
    res.json({ 
      processed: smsIds.length, 
      total: messages.length,
      smsIds 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process bulk SMS' 
    });
  }
});

// Get SMS status
app.get('/api/sms/:smsId', async (req, res) => {
  try {
    const { smsId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const sms = await smsService.getSMSById(smsId);
    
    if (!sms) {
      return res.status(404).json({ error: 'SMS not found' });
    }
    
    // Check access permissions for Indigenous SMS
    if (sms.indigenousMessage && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Indigenous SMS data' });
    }
    
    res.json(sms);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get SMS' 
    });
  }
});

// Get SMS list
app.get('/api/sms', async (req, res) => {
  try {
    const { status, priority, limit = 50, offset = 0, userId } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    const requestingUserId = req.headers['x-user-id'] as string;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (userId) where.userId = userId;
    
    // Users can only see their own SMS unless they're admin/elder
    if (!['admin', 'elder'].includes(userRole)) {
      where.userId = requestingUserId;
      where.indigenousMessage = false; // Restrict Indigenous SMS
    }
    
    const sms = await prisma.sMSMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        template: {
          select: {
            templateName: true,
            category: true,
            indigenousTemplate: true
          }
        }
      }
    });
    
    const total = await prisma.sMSMessage.count({ where });
    
    res.json({ sms, total, hasMore: sms.length === parseInt(limit as string) });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get SMS' 
    });
  }
});

// SMS webhooks (delivery reports)
app.post('/api/sms/webhooks/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    // Process delivery report based on provider
    let reportData;
    
    switch (provider) {
      case 'twilio':
        reportData = {
          messageId: req.body.MessageSid,
          status: req.body.MessageStatus,
          errorCode: req.body.ErrorCode,
          deliveredAt: req.body.DateSent
        };
        break;
        
      case 'aws':
        const message = JSON.parse(req.body.Message);
        reportData = {
          messageId: message.messageId,
          status: message.status,
          deliveredAt: message.timestamp
        };
        break;
        
      default:
        reportData = req.body;
    }
    
    await smsService.trackDeliveryReport(reportData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process webhook' 
    });
  }
});

// Incoming SMS webhook
app.post('/api/sms/incoming/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    // Process incoming SMS based on provider format
    let incomingData;
    
    switch (provider) {
      case 'twilio':
        incomingData = {
          messageId: req.body.MessageSid,
          from: req.body.From,
          to: req.body.To,
          body: req.body.Body
        };
        break;
        
      default:
        incomingData = req.body;
    }
    
    await smsService.handleIncomingSMS(incomingData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process incoming SMS' 
    });
  }
});

// SMS Templates

// Create template
app.post('/api/sms-templates', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous templates
    if (req.body.indigenousTemplate && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous templates' });
    }
    
    const templateId = await smsService.createTemplate(req.body);
    res.status(201).json({ templateId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create template' 
    });
  }
});

// Get templates
app.get('/api/sms-templates', async (req, res) => {
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
    
    const templates = await prisma.sMSTemplate.findMany({
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

// Get template by ID
app.get('/api/sms-templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const template = await prisma.sMSTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Check access permissions
    if (template.indigenousTemplate && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Indigenous template' });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get template' 
    });
  }
});

// Approve template (Elder only)
app.post('/api/sms-templates/:templateId/approve', async (req, res) => {
  try {
    const { templateId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    if (!['elder', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only Elders can approve templates' });
    }
    
    const template = await prisma.sMSTemplate.update({
      where: { id: templateId },
      data: {
        approvedBy: userId,
        approvedAt: new Date()
      }
    });
    
    res.json({ message: 'Template approved', template });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to approve template' 
    });
  }
});

// SMS Contacts

// Create contact
app.post('/api/sms-contacts', async (req, res) => {
  try {
    const contact = await prisma.sMSContact.create({
      data: req.body
    });
    
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create contact' 
    });
  }
});

// Get contacts
app.get('/api/sms-contacts', async (req, res) => {
  try {
    const { isElder, nation, verified, limit = 50, offset = 0 } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    
    const where: any = {};
    
    if (isElder) where.isElder = isElder === 'true';
    if (nation) where.nation = nation;
    if (verified) where.verified = verified === 'true';
    
    // Restrict access to Indigenous contacts
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      where.indigenousContact = false;
    }
    
    const contacts = await prisma.sMSContact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    const total = await prisma.sMSContact.count({ where });
    
    res.json({ contacts, total, hasMore: contacts.length === parseInt(limit as string) });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get contacts' 
    });
  }
});

// SMS Lists

// Create SMS list
app.post('/api/sms-lists', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous lists
    if (req.body.indigenousList && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous lists' });
    }
    
    const list = await prisma.sMSList.create({
      data: {
        ...req.body,
        ownerId: userId
      }
    });
    
    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create SMS list' 
    });
  }
});

// Get SMS lists
app.get('/api/sms-lists', async (req, res) => {
  try {
    const { listType, nation, active = true } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    const where: any = { active: active === 'true' };
    
    if (listType) where.listType = listType;
    if (nation) where.nation = nation;
    
    // Access control for lists
    if (!['admin', 'elder'].includes(userRole)) {
      where.OR = [
        { accessLevel: 'PUBLIC' },
        { ownerId: userId },
        { moderators: { has: userId } }
      ];
      // Restrict Indigenous lists
      where.indigenousList = false;
      where.eldersList = false;
    }
    
    const lists = await prisma.sMSList.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });
    
    res.json(lists);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get SMS lists' 
    });
  }
});

// SMS Campaigns

// Create campaign
app.post('/api/sms-campaigns', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous campaigns
    if (req.body.indigenousCampaign && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous campaigns' });
    }
    
    const campaign = await prisma.sMSCampaign.create({
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
app.post('/api/sms-campaigns/:campaignId/send', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const campaign = await prisma.sMSCampaign.findUnique({
      where: { id: campaignId }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check permissions for Indigenous campaigns
    if (campaign.indigenousCampaign && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to send Indigenous campaign' });
    }
    
    // Send bulk SMS
    await smsService.sendBulkSMS(campaignId);
    
    res.json({ message: 'Campaign sending started' });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send campaign' 
    });
  }
});

// Indigenous-specific endpoints

// Elder SMS (requires elevated permissions)
app.get('/api/sms/elder', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Elder SMS' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const sms = await prisma.sMSMessage.findMany({
      where: { elderRecipient: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        template: true,
        deliveryReports: true
      }
    });
    
    res.json({ sms });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get Elder SMS' 
    });
  }
});

// Emergency SMS
app.get('/api/sms/emergency', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'emergency-coordinator', 'elder'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to emergency SMS' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const sms = await prisma.sMSMessage.findMany({
      where: { emergencyMessage: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ sms });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get emergency SMS' 
    });
  }
});

// Ceremony SMS
app.get('/api/sms/ceremony', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor', 'ceremony-coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to ceremony SMS' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const sms = await prisma.sMSMessage.findMany({
      where: { ceremonyMessage: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ sms });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get ceremony SMS' 
    });
  }
});

// Nation-specific SMS
app.get('/api/sms/nation/:nation', async (req, res) => {
  try {
    const { nation } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const userNation = req.headers['x-user-nation'] as string;
    
    // Users can only access their own nation's SMS unless they're admin/elder
    if (!['admin', 'elder'].includes(userRole) && userNation !== nation) {
      return res.status(403).json({ error: 'Access denied to other nation SMS' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const sms = await prisma.sMSMessage.findMany({
      where: { nation },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ sms });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get nation SMS' 
    });
  }
});

// SMS keywords management
app.get('/api/sms-keywords', async (req, res) => {
  try {
    const { indigenousKeyword, active = true } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    
    const where: any = { active: active === 'true' };
    
    if (indigenousKeyword) where.indigenousKeyword = indigenousKeyword === 'true';
    
    // Restrict access to Indigenous keywords
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      where.indigenousKeyword = false;
      where.elderKeyword = false;
      where.emergencyKeyword = false;
    }
    
    const keywords = await prisma.sMSKeyword.findMany({
      where,
      orderBy: { usageCount: 'desc' }
    });
    
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get keywords' 
    });
  }
});

// SMS analytics
app.get('/api/sms/analytics', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to SMS analytics' });
    }
    
    const stats = await smsService.getSMSStats();
    
    // Additional Indigenous analytics
    const indigenousStats = {
      ...stats,
      deliveryRates: {
        overall: await this.calculateDeliveryRate(),
        indigenous: await this.calculateDeliveryRate({ indigenousMessage: true }),
        elder: await this.calculateDeliveryRate({ elderRecipient: true }),
        ceremony: await this.calculateDeliveryRate({ ceremonyMessage: true }),
        emergency: await this.calculateDeliveryRate({ emergencyMessage: true })
      },
      messagesByNation: await this.getMessagesByNation()
    };
    
    res.json(indigenousStats);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get analytics' 
    });
  }
});

// Helper methods for analytics
async function calculateDeliveryRate(filter: any = {}): Promise<number> {
  const totalSMS = await prisma.sMSMessage.count({ 
    where: { status: 'SENT', ...filter } 
  });
  
  const deliveredSMS = await prisma.sMSMessage.count({ 
    where: { 
      status: 'DELIVERED',
      ...filter 
    } 
  });
  
  return totalSMS > 0 ? (deliveredSMS / totalSMS) * 100 : 0;
}

async function getMessagesByNation(): Promise<any> {
  const nations = await prisma.sMSMessage.groupBy({
    by: ['nation'],
    where: { nation: { not: null } },
    _count: { id: true }
  });
  
  const messagesByNation: any = {};
  
  for (const nation of nations) {
    if (nation.nation) {
      messagesByNation[nation.nation] = {
        totalMessages: nation._count.id,
        deliveryRate: await calculateDeliveryRate({ nation: nation.nation })
      };
    }
  }
  
  return messagesByNation;
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3045;

app.listen(PORT, () => {
  console.log(`Indigenous SMS Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Features enabled:');
  console.log('- Multi-provider SMS delivery');
  console.log('- Elder priority messaging');
  console.log('- Emergency alert system');
  console.log('- Ceremony-aware communications');
  console.log('- Cultural sensitivity protection');
  console.log('- Traditional language support');
  console.log('- Nation-specific customization');
  console.log('- Keyword auto-responders');
  console.log('- Comprehensive delivery tracking');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  await prisma.$disconnect();
  process.exit(0);
});