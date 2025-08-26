import EmailService from './email.service';
import SMSService from './sms.service';
import PushNotificationService from './push.service';
import InAppNotificationService from './in-app.service';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import Bull from 'bull';
import { v4 as uuidv4 } from 'uuid';
import i18next from 'i18next';
import dayjs from 'dayjs';

export interface NotificationRequest {
  id?: string;
  userId?: string;
  userIds?: string[];
  bandId?: string;
  channels: Array<'email' | 'sms' | 'push' | 'inApp'>;
  template: string;
  data: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  expiresAt?: Date;
  language?: string;
  isIndigenous?: boolean;
  indigenousMetadata?: {
    language?: string;
    bandName?: string;
    treatyNumber?: string;
    culturalContext?: string;
  };
  retry?: {
    attempts?: number;
    backoff?: number;
  };
}

export interface NotificationResult {
  id: string;
  status: 'sent' | 'partial' | 'failed' | 'scheduled';
  channels: {
    email?: { success: boolean; messageId?: string; error?: string };
    sms?: { success: boolean; messageId?: string; error?: string };
    push?: { success: boolean; messageId?: string; error?: string };
    inApp?: { success: boolean; notificationId?: string; error?: string };
  };
  timestamp: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: string;
  channels: {
    email?: {
      subject: string;
      html?: string;
      text?: string;
    };
    sms?: {
      message: string;
    };
    push?: {
      title: string;
      body: string;
    };
    inApp?: {
      title: string;
      body: string;
      type: string;
    };
  };
  variables: string[];
  indigenousVersions?: Record<string, any>;
  isActive: boolean;
}

export class NotificationOrchestratorService {
  private static notificationQueue: Bull.Queue;
  private static templates: Map<string, NotificationTemplate> = new Map();
  private static readonly QUEUE_CONCURRENCY = 10;
  private static readonly DEFAULT_TTL = 86400; // 24 hours
  
  // Indigenous notification categories
  private static readonly INDIGENOUS_CATEGORIES = {
    RFQ: 'rfq_indigenous',
    CERTIFICATION: 'certification_indigenous',
    BAND_ANNOUNCEMENT: 'band_announcement',
    CULTURAL_EVENT: 'cultural_event',
    ELDER_MESSAGE: 'elder_message',
    TREATY_UPDATE: 'treaty_update',
  };

  /**
   * Initialize notification orchestrator
   */
  static async initialize(): Promise<void> {
    try {
      // Initialize all services
      await Promise.all([
        EmailService.initialize(),
        SMSService.initialize(),
        PushNotificationService.initialize(),
      ]);

      // Initialize queue
      this.notificationQueue = new Bull('notifications', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      });

      // Setup queue processors
      this.setupQueueProcessors();

      // Load templates
      await this.loadTemplates();

      // Initialize i18n
      await this.initializeI18n();

      logger.info('Notification orchestrator initialized');
    } catch (error) {
      logger.error('Failed to initialize notification orchestrator', error);
      throw error;
    }
  }

  /**
   * Send notification
   */
  static async sendNotification(request: NotificationRequest): Promise<NotificationResult> {
    try {
      const notificationId = request.id || uuidv4();

      // Validate request
      this.validateRequest(request);

      // Get user preferences
      const preferences = await this.getUserPreferences(request.userId || request.userIds?.[0]);

      // Filter channels based on preferences
      const enabledChannels = this.filterChannelsByPreferences(request.channels, preferences);

      if (enabledChannels.length === 0) {
        logger.warn('No enabled channels for notification', { notificationId });
        return {
          id: notificationId,
          status: 'failed',
          channels: {},
          timestamp: new Date(),
        };
      }

      // Schedule if needed
      if (request.scheduledAt && request.scheduledAt > new Date()) {
        await this.scheduleNotification(request);
        return {
          id: notificationId,
          status: 'scheduled',
          channels: {},
          timestamp: new Date(),
        };
      }

      // Get template
      const template = await this.getTemplate(request.template, request.language);

      // Process template with data
      const processedContent = await this.processTemplate(template, request.data, request.language);

      // Send to each channel
      const results = await this.sendToChannels(
        enabledChannels,
        processedContent,
        request,
        preferences
      );

      // Log notification
      await this.logNotification(notificationId, request, results);

      // Determine overall status
      const status = this.determineOverallStatus(results);

      return {
        id: notificationId,
        status,
        channels: results,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to send notification', error);
      throw error;
    }
  }

  /**
   * Send Indigenous notification
   */
  static async sendIndigenousNotification(
    request: NotificationRequest & {
      indigenousLanguage: string;
      bandId: string;
      elderApproval?: boolean;
    }
  ): Promise<NotificationResult> {
    try {
      // Add Indigenous metadata
      const enrichedRequest: NotificationRequest = {
        ...request,
        isIndigenous: true,
        indigenousMetadata: {
          language: request.indigenousLanguage,
          bandName: await this.getBandName(request.bandId),
          culturalContext: this.getCulturalContext(request.indigenousLanguage),
        },
      };

      // Check for elder approval if required
      if (request.elderApproval) {
        const approved = await this.checkElderApproval(request.bandId, request.template);
        if (!approved) {
          throw new Error('Elder approval required for this notification');
        }
      }

      // Get Indigenous template
      const template = await this.getIndigenousTemplate(
        request.template,
        request.indigenousLanguage
      );

      // Send notification
      return this.sendNotification({
        ...enrichedRequest,
        template: template.name,
      });
    } catch (error) {
      logger.error('Failed to send Indigenous notification', error);
      throw error;
    }
  }

  /**
   * Send band-wide notification
   */
  static async sendBandNotification(
    bandId: string,
    notification: Omit<NotificationRequest, 'userId' | 'userIds'>
  ): Promise<{
    totalSent: number;
    successful: number;
    failed: number;
    results: NotificationResult[];
  }> {
    try {
      // Get band members
      const members = await prisma.user.findMany({
        where: { bandId, isActive: true },
        select: { id: true, email: true, phone: true },
      });

      const results: NotificationResult[] = [];
      let successful = 0;
      let failed = 0;

      // Send to each member
      for (const member of members) {
        try {
          const result = await this.sendNotification({
            ...notification,
            userId: member.id,
            indigenousMetadata: {
              ...notification.indigenousMetadata,
              bandName: await this.getBandName(bandId),
            },
          });

          if (result.status === 'sent' || result.status === 'partial') {
            successful++;
          } else {
            failed++;
          }

          results.push(result);
        } catch (error) {
          logger.error(`Failed to send to band member ${member.id}`, error);
          failed++;
        }
      }

      return {
        totalSent: members.length,
        successful,
        failed,
        results,
      };
    } catch (error) {
      logger.error('Failed to send band notification', error);
      throw error;
    }
  }

  /**
   * Send RFQ notification
   */
  static async sendRFQNotification(
    rfqData: {
      id: string;
      title: string;
      description: string;
      deadline: Date;
      value: number;
      isIndigenous: boolean;
      bandId?: string;
    },
    recipients: string[]
  ): Promise<void> {
    try {
      const template = rfqData.isIndigenous ? 'rfq_indigenous' : 'rfq_standard';
      
      for (const userId of recipients) {
        await this.sendNotification({
          userId,
          channels: ['email', 'push', 'inApp'],
          template,
          data: {
            rfqId: rfqData.id,
            rfqTitle: rfqData.title,
            rfqDescription: rfqData.description,
            deadline: dayjs(rfqData.deadline).format('YYYY-MM-DD'),
            value: rfqData.value,
            viewUrl: `${process.env.APP_URL}/rfqs/${rfqData.id}`,
          },
          priority: 'high',
          isIndigenous: rfqData.isIndigenous,
          indigenousMetadata: rfqData.bandId ? {
            bandName: await this.getBandName(rfqData.bandId),
          } : undefined,
        });
      }
    } catch (error) {
      logger.error('Failed to send RFQ notification', error);
      throw error;
    }
  }

  /**
   * Send certification expiry reminder
   */
  static async sendCertificationExpiryReminder(
    userId: string,
    certificationData: {
      type: string;
      expiryDate: Date;
      daysUntilExpiry: number;
      renewalUrl: string;
    }
  ): Promise<void> {
    try {
      await this.sendNotification({
        userId,
        channels: ['email', 'push', 'inApp'],
        template: 'certification_expiry',
        data: {
          certificationType: certificationData.type,
          expiryDate: dayjs(certificationData.expiryDate).format('YYYY-MM-DD'),
          daysRemaining: certificationData.daysUntilExpiry,
          renewalUrl: certificationData.renewalUrl,
        },
        priority: certificationData.daysUntilExpiry <= 7 ? 'high' : 'normal',
      });
    } catch (error) {
      logger.error('Failed to send certification expiry reminder', error);
      throw error;
    }
  }

  /**
   * Setup queue processors
   */
  private static setupQueueProcessors(): void {
    // Process notification queue
    this.notificationQueue.process(this.QUEUE_CONCURRENCY, async (job) => {
      const { request } = job.data;
      return this.sendNotification(request);
    });

    // Handle failed jobs
    this.notificationQueue.on('failed', (job, error) => {
      logger.error('Notification job failed', {
        jobId: job.id,
        error: error.message,
      });
    });

    // Handle completed jobs
    this.notificationQueue.on('completed', (job, result) => {
      logger.info('Notification job completed', {
        jobId: job.id,
        result,
      });
    });
  }

  /**
   * Send to channels
   */
  private static async sendToChannels(
    channels: string[],
    content: any,
    request: NotificationRequest,
    preferences: any
  ): Promise<any> {
    const results: any = {};

    await Promise.all(
      channels.map(async (channel) => {
        try {
          switch (channel) {
            case 'email':
              const emailResult = await EmailService.sendEmail({
                to: request.userId ? await this.getUserEmail(request.userId) : '',
                subject: content.email.subject,
                html: content.email.html,
                text: content.email.text,
                priority: request.priority,
                language: request.language,
              });
              results.email = {
                success: true,
                messageId: emailResult.messageId,
              };
              break;

            case 'sms':
              const smsResult = await SMSService.sendSMS({
                to: request.userId ? await this.getUserPhone(request.userId) : '',
                message: content.sms.message,
                priority: request.priority,
                language: request.language,
                isIndigenous: request.isIndigenous,
              });
              results.sms = {
                success: true,
                messageId: smsResult.messageId,
              };
              break;

            case 'push':
              const pushTokens = await this.getUserPushTokens(request.userId!);
              if (pushTokens.length > 0) {
                const pushResult = await PushNotificationService.sendNotification({
                  tokens: pushTokens,
                  title: content.push.title,
                  body: content.push.body,
                  data: request.data,
                  priority: request.priority,
                  language: request.language,
                  isIndigenous: request.isIndigenous,
                });
                results.push = {
                  success: pushResult.success,
                  messageId: pushResult.messageId,
                };
              }
              break;

            case 'inApp':
              const inAppResult = await InAppNotificationService.sendNotification(
                request.userId!,
                {
                  type: content.inApp.type,
                  title: content.inApp.title,
                  body: content.inApp.body,
                  data: request.data,
                  priority: request.priority,
                  language: request.language,
                }
              );
              results.inApp = {
                success: true,
                notificationId: inAppResult.id,
              };
              break;
          }
        } catch (error: any) {
          logger.error(`Failed to send to ${channel}`, error);
          results[channel] = {
            success: false,
            error: error.message,
          };
        }
      })
    );

    return results;
  }

  /**
   * Load templates
   */
  private static async loadTemplates(): Promise<void> {
    try {
      // Load from database
      const templates = await prisma.notificationTemplate.findMany({
        where: { isActive: true },
      });

      for (const template of templates) {
        this.templates.set(template.name, template as NotificationTemplate);
      }

      // Create default Indigenous templates if not exist
      await this.createDefaultIndigenousTemplates();

      logger.info(`Loaded ${this.templates.size} notification templates`);
    } catch (error) {
      logger.error('Failed to load templates', error);
    }
  }

  /**
   * Create default Indigenous templates
   */
  private static async createDefaultIndigenousTemplates(): Promise<void> {
    const indigenousTemplates = [
      {
        name: 'rfq_indigenous',
        category: this.INDIGENOUS_CATEGORIES.RFQ,
        channels: {
          email: {
            subject: '>¶ New Indigenous Business Opportunity: {{rfqTitle}}',
            html: `
              <h2>Boozhoo!</h2>
              <p>A new RFQ opportunity is available for Indigenous businesses:</p>
              <h3>{{rfqTitle}}</h3>
              <p>{{rfqDescription}}</p>
              <p><strong>Deadline:</strong> {{deadline}}</p>
              <p><strong>Estimated Value:</strong> ${{value}}</p>
              <a href="{{viewUrl}}">View RFQ Details</a>
              <p>Migwech!</p>
            `,
          },
          sms: {
            message: '<? New Indigenous RFQ: {{rfqTitle}}. Deadline: {{deadline}}. View: {{viewUrl}}',
          },
          push: {
            title: '>¶ Indigenous Business Opportunity',
            body: 'New RFQ: {{rfqTitle}} - Deadline: {{deadline}}',
          },
          inApp: {
            title: 'Indigenous RFQ Opportunity',
            body: '{{rfqTitle}} - Apply by {{deadline}}',
            type: 'indigenous',
          },
        },
        variables: ['rfqTitle', 'rfqDescription', 'deadline', 'value', 'viewUrl'],
        isActive: true,
      },
      {
        name: 'elder_message',
        category: this.INDIGENOUS_CATEGORIES.ELDER_MESSAGE,
        channels: {
          email: {
            subject: '>¶ Message from Elder {{elderName}}',
            html: `
              <h2>Traditional Greeting</h2>
              <p>{{elderName}} has shared a message with the community:</p>
              <blockquote>{{message}}</blockquote>
              <p>With respect and gratitude</p>
            `,
          },
          inApp: {
            title: 'Elder Message',
            body: '{{elderName}}: {{message}}',
            type: 'indigenous',
          },
        },
        variables: ['elderName', 'message'],
        isActive: true,
      },
    ];

    for (const template of indigenousTemplates) {
      if (!this.templates.has(template.name)) {
        await prisma.notificationTemplate.create({
          data: {
            id: uuidv4(),
            ...template,
          },
        });
        this.templates.set(template.name, template as NotificationTemplate);
      }
    }
  }

  /**
   * Initialize i18n
   */
  private static async initializeI18n(): Promise<void> {
    await i18next.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: {
          translation: {
            greeting: 'Hello',
            closing: 'Thank you',
          },
        },
        fr: {
          translation: {
            greeting: 'Bonjour',
            closing: 'Merci',
          },
        },
        ojibwe: {
          translation: {
            greeting: 'Boozhoo',
            closing: 'Migwech',
          },
        },
        cree: {
          translation: {
            greeting: 'Tansi',
            closing: 'Ekosi',
          },
        },
      },
    });
  }

  /**
   * Get template
   */
  private static async getTemplate(
    templateName: string,
    language?: string
  ): Promise<NotificationTemplate> {
    // Try language-specific template first
    if (language) {
      const langTemplate = this.templates.get(`${templateName}_${language}`);
      if (langTemplate) {
        return langTemplate;
      }
    }

    // Fallback to default template
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    return template;
  }

  /**
   * Get Indigenous template
   */
  private static async getIndigenousTemplate(
    templateName: string,
    indigenousLanguage: string
  ): Promise<NotificationTemplate> {
    // Look for Indigenous-specific template
    const indigenousTemplateName = `${templateName}_indigenous_${indigenousLanguage}`;
    let template = this.templates.get(indigenousTemplateName);

    if (!template) {
      // Fallback to generic Indigenous template
      template = this.templates.get(`${templateName}_indigenous`);
    }

    if (!template) {
      // Fallback to standard template
      template = this.templates.get(templateName);
    }

    if (!template) {
      throw new Error(`Indigenous template ${templateName} not found`);
    }

    return template;
  }

  /**
   * Process template
   */
  private static async processTemplate(
    template: NotificationTemplate,
    data: Record<string, any>,
    language?: string
  ): Promise<any> {
    const processed: any = {};

    // Process each channel
    for (const [channel, content] of Object.entries(template.channels)) {
      if (content) {
        processed[channel] = {};
        
        for (const [key, value] of Object.entries(content)) {
          if (typeof value === 'string') {
            // Replace variables
            processed[channel][key] = this.replaceVariables(value, data);
            
            // Translate if needed
            if (language && language !== 'en') {
              processed[channel][key] = await this.translateContent(
                processed[channel][key],
                language
              );
            }
          }
        }
      }
    }

    return processed;
  }

  /**
   * Replace variables in template
   */
  private static replaceVariables(
    template: string,
    data: Record<string, any>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Translate content
   */
  private static async translateContent(
    content: string,
    language: string
  ): Promise<string> {
    // Use i18next for known translations
    const greeting = i18next.t('greeting', { lng: language });
    const closing = i18next.t('closing', { lng: language });

    // Replace greetings and closings
    content = content.replace(/Hello|Hi/gi, greeting);
    content = content.replace(/Thank you|Thanks/gi, closing);

    return content;
  }

  /**
   * Helper methods
   */
  private static async getUserEmail(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email || '';
  }

  private static async getUserPhone(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    return user?.phone || '';
  }

  private static async getUserPushTokens(userId: string): Promise<string[]> {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });
    return tokens.map(t => t.token);
  }

  private static async getUserPreferences(userId?: string): Promise<any> {
    if (!userId) {
      return {
        email: true,
        sms: true,
        push: true,
        inApp: true,
      };
    }

    return InAppNotificationService.getUserPreferences(userId);
  }

  private static filterChannelsByPreferences(
    channels: string[],
    preferences: any
  ): string[] {
    return channels.filter(channel => {
      switch (channel) {
        case 'email':
          return preferences.email;
        case 'sms':
          return preferences.sms;
        case 'push':
          return preferences.push;
        case 'inApp':
          return preferences.inApp;
        default:
          return true;
      }
    });
  }

  private static async getBandName(bandId: string): Promise<string> {
    const band = await prisma.band.findUnique({
      where: { id: bandId },
      select: { name: true },
    });
    return band?.name || '';
  }

  private static getCulturalContext(language: string): string {
    const contexts: Record<string, string> = {
      ojibwe: 'Anishinaabe tradition',
      cree: 'Nêhiyaw tradition',
      inuktitut: 'Inuit tradition',
      mikmaq: "Mi'kmaq tradition",
      mohawk: 'Haudenosaunee tradition',
    };
    return contexts[language] || 'Indigenous tradition';
  }

  private static async checkElderApproval(
    bandId: string,
    templateName: string
  ): Promise<boolean> {
    // Check if template requires elder approval
    const approval = await prisma.elderApproval.findFirst({
      where: {
        bandId,
        templateName,
        isApproved: true,
        expiresAt: { gte: new Date() },
      },
    });
    return !!approval;
  }

  private static async scheduleNotification(request: NotificationRequest): Promise<void> {
    const delay = request.scheduledAt!.getTime() - Date.now();
    
    await this.notificationQueue.add(
      'scheduled',
      { request },
      { delay }
    );
  }

  private static async logNotification(
    id: string,
    request: NotificationRequest,
    results: any
  ): Promise<void> {
    await prisma.notificationLog.create({
      data: {
        id,
        userId: request.userId,
        channels: request.channels,
        template: request.template,
        data: request.data,
        results,
        status: this.determineOverallStatus(results),
        isIndigenous: request.isIndigenous || false,
        indigenousMetadata: request.indigenousMetadata,
      },
    });
  }

  private static determineOverallStatus(results: any): 'sent' | 'partial' | 'failed' {
    const statuses = Object.values(results).map((r: any) => r.success);
    
    if (statuses.every(s => s === true)) {
      return 'sent';
    } else if (statuses.some(s => s === true)) {
      return 'partial';
    } else {
      return 'failed';
    }
  }

  private static validateRequest(request: NotificationRequest): void {
    if (!request.userId && !request.userIds && !request.bandId) {
      throw new Error('Must specify userId, userIds, or bandId');
    }

    if (!request.channels || request.channels.length === 0) {
      throw new Error('Must specify at least one channel');
    }

    if (!request.template) {
      throw new Error('Template is required');
    }
  }
}

export default NotificationOrchestratorService;