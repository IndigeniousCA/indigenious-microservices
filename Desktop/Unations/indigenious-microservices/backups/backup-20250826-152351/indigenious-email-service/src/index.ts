import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { EmailService } from './services/email.service';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const emailService = new EmailService();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
    const stats = await emailService.getEmailStats();
    
    res.json({
      status: 'healthy',
      service: 'indigenious-email-service',
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

// Send single email
app.post('/api/emails/send', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Add user context to email data
    const emailData = {
      ...req.body,
      userId
    };
    
    // Check permissions for Indigenous emails
    if (emailData.elderRecipient && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Elder communications' });
    }
    
    const emailId = await emailService.sendEmail(emailData);
    res.status(201).json({ emailId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    });
  }
});

// Send bulk emails
app.post('/api/emails/bulk', async (req, res) => {
  try {
    const { emails } = req.body;
    const userId = req.headers['x-user-id'] as string;
    
    if (!Array.isArray(emails)) {
      return res.status(400).json({ error: 'Emails must be an array' });
    }
    
    const emailIds = [];
    for (const emailData of emails) {
      try {
        const emailId = await emailService.sendEmail({ ...emailData, userId });
        emailIds.push(emailId);
      } catch (error) {
        console.error('Failed to process email:', error);
      }
    }
    
    res.json({ 
      processed: emailIds.length, 
      total: emails.length,
      emailIds 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process bulk emails' 
    });
  }
});

// Get email status
app.get('/api/emails/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const email = await emailService.getEmailById(emailId);
    
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Check access permissions for Indigenous emails
    if (email.indigenousEmail && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Indigenous email data' });
    }
    
    res.json(email);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get email' 
    });
  }
});

// Get emails list
app.get('/api/emails', async (req, res) => {
  try {
    const { status, priority, limit = 50, offset = 0, userId } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    const requestingUserId = req.headers['x-user-id'] as string;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (userId) where.userId = userId;
    
    // Users can only see their own emails unless they're admin/elder
    if (!['admin', 'elder'].includes(userRole)) {
      where.userId = requestingUserId;
      where.indigenousEmail = false; // Restrict Indigenous emails
    }
    
    const emails = await prisma.email.findMany({
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
    
    const total = await prisma.email.count({ where });
    
    res.json({ emails, total, hasMore: emails.length === parseInt(limit as string) });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get emails' 
    });
  }
});

// Track email events (webhooks)
app.post('/api/emails/:emailId/events', async (req, res) => {
  try {
    const { emailId } = req.params;
    const { eventType, eventData } = req.body;
    
    await emailService.trackEmailEvent(eventType, emailId, eventData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to track event' 
    });
  }
});

// Email Templates

// Create template
app.post('/api/email-templates', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous templates
    if (req.body.indigenousTemplate && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous templates' });
    }
    
    const templateId = await emailService.createTemplate(req.body);
    res.status(201).json({ templateId });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create template' 
    });
  }
});

// Get templates
app.get('/api/email-templates', async (req, res) => {
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
      where.traditionalKnowledge = false;
    }
    
    const templates = await prisma.emailTemplate.findMany({
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
app.get('/api/email-templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const template = await prisma.emailTemplate.findUnique({
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

// Update template
app.put('/api/email-templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Check permissions
    if (existingTemplate.indigenousTemplate && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to modify Indigenous template' });
    }
    
    const template = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: req.body
    });
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update template' 
    });
  }
});

// Approve template (Elder only)
app.post('/api/email-templates/:templateId/approve', async (req, res) => {
  try {
    const { templateId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    if (!['elder', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Only Elders can approve templates' });
    }
    
    const template = await prisma.emailTemplate.update({
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

// Email Lists

// Create email list
app.post('/api/email-lists', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous lists
    if (req.body.indigenousList && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous lists' });
    }
    
    const list = await prisma.emailList.create({
      data: {
        ...req.body,
        ownerId: userId
      }
    });
    
    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create email list' 
    });
  }
});

// Get email lists
app.get('/api/email-lists', async (req, res) => {
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
    
    const lists = await prisma.emailList.findMany({
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
      error: error instanceof Error ? error.message : 'Failed to get email lists' 
    });
  }
});

// Subscribe to email list
app.post('/api/email-lists/:listId/subscribe', async (req, res) => {
  try {
    const { listId } = req.params;
    const subscriptionData = req.body;
    
    const list = await prisma.emailList.findUnique({
      where: { id: listId }
    });
    
    if (!list) {
      return res.status(404).json({ error: 'Email list not found' });
    }
    
    // Check if Elder moderation is required
    let confirmed = !list.doubleOptIn;
    if (list.elderModerated || list.moderatedJoin) {
      confirmed = false;
    }
    
    const subscription = await prisma.emailSubscription.create({
      data: {
        listId,
        ...subscriptionData,
        confirmed,
        confirmationToken: confirmed ? null : uuidv4()
      }
    });
    
    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to subscribe to list' 
    });
  }
});

// Unsubscribe from email list
app.post('/api/email-lists/unsubscribe/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    
    const subscription = await prisma.emailSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date(),
        unsubscribeReason: reason
      }
    });
    
    res.json({ message: 'Successfully unsubscribed', subscription });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to unsubscribe' 
    });
  }
});

// Email Campaigns

// Create campaign
app.post('/api/email-campaigns', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    // Check permissions for Indigenous campaigns
    if (req.body.indigenousCampaign && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions for Indigenous campaigns' });
    }
    
    const campaign = await prisma.emailCampaign.create({
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

// Get campaigns
app.get('/api/email-campaigns', async (req, res) => {
  try {
    const { status, indigenousCampaign } = req.query;
    const userRole = req.headers['x-user-role'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (indigenousCampaign) where.indigenousCampaign = indigenousCampaign === 'true';
    
    // Users can only see their own campaigns unless they're admin/elder
    if (!['admin', 'elder'].includes(userRole)) {
      where.createdBy = userId;
      where.indigenousCampaign = false;
    }
    
    const campaigns = await prisma.emailCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get campaigns' 
    });
  }
});

// Send campaign
app.post('/api/email-campaigns/:campaignId/send', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Check permissions for Indigenous campaigns
    if (campaign.indigenousCampaign && !['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to send Indigenous campaign' });
    }
    
    // Send bulk emails
    await emailService.sendBulkEmails(campaignId);
    
    res.json({ message: 'Campaign sending started' });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send campaign' 
    });
  }
});

// Indigenous-specific endpoints

// Elder emails (requires elevated permissions)
app.get('/api/emails/elder', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to Elder emails' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const emails = await prisma.email.findMany({
      where: { elderRecipient: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        template: true,
        opens: true,
        clicks: true,
        bounces: true
      }
    });
    
    res.json({ emails });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get Elder emails' 
    });
  }
});

// Ceremony emails
app.get('/api/emails/ceremony', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor', 'ceremony-coordinator'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to ceremony emails' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const emails = await prisma.email.findMany({
      where: { ceremonyRelated: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ emails });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get ceremony emails' 
    });
  }
});

// Nation-specific emails
app.get('/api/emails/nation/:nation', async (req, res) => {
  try {
    const { nation } = req.params;
    const userRole = req.headers['x-user-role'] as string;
    const userNation = req.headers['x-user-nation'] as string;
    
    // Users can only access their own nation's emails unless they're admin/elder
    if (!['admin', 'elder'].includes(userRole) && userNation !== nation) {
      return res.status(403).json({ error: 'Access denied to other nation emails' });
    }
    
    const { limit = 50, offset = 0 } = req.query;
    
    const emails = await prisma.email.findMany({
      where: { nation },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });
    
    res.json({ emails });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get nation emails' 
    });
  }
});

// Email analytics
app.get('/api/emails/analytics', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] as string;
    
    if (!['admin', 'elder', 'cultural-advisor'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied to email analytics' });
    }
    
    const stats = await emailService.getEmailStats();
    
    // Additional Indigenous analytics
    const indigenousStats = {
      ...stats,
      openRates: {
        overall: await this.calculateOpenRate(),
        indigenous: await this.calculateOpenRate({ indigenousEmail: true }),
        elder: await this.calculateOpenRate({ elderRecipient: true }),
        ceremony: await this.calculateOpenRate({ ceremonyRelated: true })
      },
      engagementByNation: await this.getEngagementByNation()
    };
    
    res.json(indigenousStats);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get analytics' 
    });
  }
});

// Helper methods for analytics
async function calculateOpenRate(filter: any = {}): Promise<number> {
  const totalEmails = await prisma.email.count({ 
    where: { status: 'DELIVERED', ...filter } 
  });
  
  const openedEmails = await prisma.email.count({ 
    where: { 
      status: 'DELIVERED', 
      openedAt: { not: null },
      ...filter 
    } 
  });
  
  return totalEmails > 0 ? (openedEmails / totalEmails) * 100 : 0;
}

async function getEngagementByNation(): Promise<any> {
  const nations = await prisma.email.groupBy({
    by: ['nation'],
    where: { nation: { not: null } },
    _count: { id: true }
  });
  
  const engagement: any = {};
  
  for (const nation of nations) {
    if (nation.nation) {
      engagement[nation.nation] = {
        totalEmails: nation._count.id,
        openRate: await calculateOpenRate({ nation: nation.nation })
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

const PORT = process.env.PORT || 3044;

app.listen(PORT, () => {
  console.log(`Indigenous Email Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Features enabled:');
  console.log('- Multi-provider email delivery');
  console.log('- Indigenous template system');
  console.log('- Elder priority communications');
  console.log('- Ceremony-aware scheduling');
  console.log('- Cultural sensitivity protection');
  console.log('- Traditional design elements');
  console.log('- Nation-specific customization');
  console.log('- Comprehensive tracking and analytics');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  await prisma.$disconnect();
  process.exit(0);
});