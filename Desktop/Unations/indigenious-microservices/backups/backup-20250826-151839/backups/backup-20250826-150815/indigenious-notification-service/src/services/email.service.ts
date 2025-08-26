import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  templateData?: Record<string, any>;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  tags?: string[];
  priority?: 'high' | 'normal' | 'low';
  replyTo?: string;
  headers?: Record<string, string>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  language?: string;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  encoding?: string;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  pending?: string[];
  response?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;
  private static useSendGrid: boolean = false;
  private static templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1000;
  private static readonly RATE_LIMIT_PER_MINUTE = 60;

  /**
   * Initialize email service
   */
  static async initialize(): Promise<void> {
    try {
      // Configure SendGrid if API key available
      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.useSendGrid = true;
        logger.info('Email service initialized with SendGrid');
      } else {
        // Fallback to SMTP
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        // Verify SMTP connection
        await this.transporter.verify();
        logger.info('Email service initialized with SMTP');
      }

      // Load email templates
      await this.loadTemplates();
      
      // Register Handlebars helpers
      this.registerHandlebarsHelpers();

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service', error);
      throw error;
    }
  }

  /**
   * Send email
   */
  static async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Check rate limiting
      await this.checkRateLimit(options.to);

      // Prepare email content
      const emailContent = await this.prepareEmailContent(options);

      // Add tracking pixels if requested
      if (options.trackOpens) {
        emailContent.html = await this.addTrackingPixel(emailContent.html!, options.to);
      }

      // Add click tracking if requested
      if (options.trackClicks) {
        emailContent.html = await this.addClickTracking(emailContent.html!, options.to);
      }

      let result: EmailResult;

      if (this.useSendGrid) {
        result = await this.sendWithSendGrid(options, emailContent);
      } else {
        result = await this.sendWithSMTP(options, emailContent);
      }

      // Log email sent
      await this.logEmailSent(options, result);

      // Store in notification history
      await this.storeNotificationHistory(options, result);

      return result;
    } catch (error) {
      logger.error('Failed to send email', error);
      
      // Retry logic
      if (await this.shouldRetry(error)) {
        return this.retryEmail(options);
      }
      
      throw error;
    }
  }

  /**
   * Send email with SendGrid
   */
  private static async sendWithSendGrid(
    options: EmailOptions,
    content: { html?: string; text?: string }
  ): Promise<EmailResult> {
    const msg: any = {
      to: options.to,
      from: process.env.FROM_EMAIL || 'notifications@indigenousprocurement.ca',
      subject: options.subject,
      html: content.html,
      text: content.text,
    };

    if (options.cc) msg.cc = options.cc;
    if (options.bcc) msg.bcc = options.bcc;
    if (options.replyTo) msg.replyTo = options.replyTo;
    
    if (options.attachments) {
      msg.attachments = await this.prepareSendGridAttachments(options.attachments);
    }

    if (options.tags) {
      msg.categories = options.tags;
    }

    if (options.headers) {
      msg.headers = options.headers;
    }

    // Set priority
    if (options.priority === 'high') {
      msg.headers = { ...msg.headers, 'X-Priority': '1' };
    }

    const response = await sgMail.send(msg);

    return {
      messageId: response[0].headers['x-message-id'] || '',
      accepted: Array.isArray(options.to) ? options.to : [options.to],
      rejected: [],
      response: 'Email sent via SendGrid',
    };
  }

  /**
   * Send email with SMTP
   */
  private static async sendWithSMTP(
    options: EmailOptions,
    content: { html?: string; text?: string }
  ): Promise<EmailResult> {
    const mailOptions: any = {
      from: process.env.FROM_EMAIL || 'notifications@indigenousprocurement.ca',
      to: options.to,
      subject: options.subject,
      html: content.html,
      text: content.text,
    };

    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;
    if (options.replyTo) mailOptions.replyTo = options.replyTo;
    
    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    if (options.headers) {
      mailOptions.headers = options.headers;
    }

    // Set priority
    if (options.priority === 'high') {
      mailOptions.priority = 'high';
    }

    const info = await this.transporter.sendMail(mailOptions);

    return {
      messageId: info.messageId,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      pending: info.pending,
      response: info.response,
    };
  }

  /**
   * Send bulk emails
   */
  static async sendBulkEmails(
    recipients: string[],
    options: Omit<EmailOptions, 'to'>
  ): Promise<{
    successful: string[];
    failed: Array<{ email: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ email: string; error: string }> = [];

    // Process in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (email) => {
          try {
            await this.sendEmail({ ...options, to: email });
            successful.push(email);
          } catch (error: any) {
            failed.push({ email, error: error.message });
            logger.error(`Failed to send email to ${email}`, error);
          }
        })
      );

      // Rate limiting between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { successful, failed };
  }

  /**
   * Send Indigenous language email
   */
  static async sendIndigenousEmail(
    options: EmailOptions & { indigenousLanguage: string }
  ): Promise<EmailResult> {
    try {
      // Get translated content
      const translatedContent = await this.getIndigenousTranslation(
        options.templateData || {},
        options.indigenousLanguage
      );

      // Add cultural elements to template
      const culturalTemplate = await this.addCulturalElements(
        options.template || 'default',
        options.indigenousLanguage
      );

      // Send email with translated content
      return this.sendEmail({
        ...options,
        template: culturalTemplate,
        templateData: translatedContent,
        headers: {
          ...options.headers,
          'X-Indigenous-Language': options.indigenousLanguage,
        },
      });
    } catch (error) {
      logger.error('Failed to send Indigenous language email', error);
      throw error;
    }
  }

  /**
   * Prepare email content
   */
  private static async prepareEmailContent(
    options: EmailOptions
  ): Promise<{ html?: string; text?: string }> {
    let html: string | undefined;
    let text: string | undefined;

    if (options.template) {
      // Use template
      const template = await this.getTemplate(options.template, options.language);
      html = template(options.templateData || {});
      
      // Generate text version from HTML
      text = this.htmlToText(html);
    } else {
      html = options.html;
      text = options.text || (html ? this.htmlToText(html) : undefined);
    }

    // Sanitize HTML content
    if (html) {
      const window = new JSDOM('').window;
      const purify = DOMPurify(window);
      html = purify.sanitize(html);
    }

    // Process markdown if present
    if (options.text && options.text.includes('#')) {
      html = marked(options.text);
    }

    return { html, text };
  }

  /**
   * Load email templates
   */
  private static async loadTemplates(): Promise<void> {
    const templatesDir = path.join(__dirname, '../../templates/email');
    
    try {
      const files = await fs.readdir(templatesDir);
      
      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const templateName = path.basename(file, '.hbs');
          const templateContent = await fs.readFile(
            path.join(templatesDir, file),
            'utf-8'
          );
          
          const compiled = handlebars.compile(templateContent);
          this.templates.set(templateName, compiled);
        }
      }

      logger.info(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates', error);
    }
  }

  /**
   * Get template
   */
  private static async getTemplate(
    templateName: string,
    language?: string
  ): Promise<handlebars.TemplateDelegate> {
    // Try language-specific template first
    if (language) {
      const langTemplate = `${templateName}_${language}`;
      if (this.templates.has(langTemplate)) {
        return this.templates.get(langTemplate)!;
      }
    }

    // Fallback to default template
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    // Load template from database if not in cache
    const dbTemplate = await prisma.emailTemplate.findFirst({
      where: { name: templateName },
    });

    if (dbTemplate) {
      const compiled = handlebars.compile(dbTemplate.content);
      this.templates.set(templateName, compiled);
      return compiled;
    }

    throw new Error(`Template ${templateName} not found`);
  }

  /**
   * Register Handlebars helpers
   */
  private static registerHandlebarsHelpers(): void {
    // Date formatting
    handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      return new Date(date).toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Currency formatting
    handlebars.registerHelper('currency', (amount: number) => {
      return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
      }).format(amount);
    });

    // Indigenous greeting helper
    handlebars.registerHelper('indigenousGreeting', (language: string) => {
      const greetings: Record<string, string> = {
        ojibwe: 'Boozhoo',
        cree: 'Tansi',
        inuktitut: 'ᐊᐃ',
        mikmaq: "Kwe'",
        mohawk: 'Shé:kon',
      };
      return greetings[language] || 'Hello';
    });

    // Conditional helper
    handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Get Indigenous translation
   */
  private static async getIndigenousTranslation(
    data: Record<string, any>,
    language: string
  ): Promise<Record<string, any>> {
    // This would integrate with translation service
    // For now, return with language marker
    return {
      ...data,
      language,
      greeting: this.getIndigenousGreeting(language),
      closing: this.getIndigenousClosing(language),
    };
  }

  /**
   * Get Indigenous greeting
   */
  private static getIndigenousGreeting(language: string): string {
    const greetings: Record<string, string> = {
      ojibwe: 'Boozhoo (Hello)',
      cree: 'Tansi (Hello)',
      inuktitut: 'ᐊᐃ (Hello)',
      mikmaq: "Kwe' (Hello)",
      mohawk: 'Shé:kon (Hello)',
    };
    return greetings[language] || 'Hello';
  }

  /**
   * Get Indigenous closing
   */
  private static getIndigenousClosing(language: string): string {
    const closings: Record<string, string> = {
      ojibwe: 'Migwech (Thank you)',
      cree: 'Ekosi (Thank you)',
      inuktitut: 'Qujannamiik (Thank you)',
      mikmaq: "Wela'lin (Thank you)",
      mohawk: 'Niá:wen (Thank you)',
    };
    return closings[language] || 'Thank you';
  }

  /**
   * Add cultural elements to template
   */
  private static async addCulturalElements(
    templateName: string,
    language: string
  ): Promise<string> {
    // Add cultural borders, symbols, or styling
    return `${templateName}_cultural_${language}`;
  }

  /**
   * Add tracking pixel
   */
  private static async addTrackingPixel(
    html: string,
    recipient: string | string[]
  ): Promise<string> {
    const trackingId = await this.generateTrackingId(recipient);
    const trackingUrl = `${process.env.API_URL}/api/notifications/track/open/${trackingId}`;
    const pixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" />`;
    
    // Add before closing body tag
    return html.replace('</body>', `${pixel}</body>`);
  }

  /**
   * Add click tracking
   */
  private static async addClickTracking(
    html: string,
    recipient: string | string[]
  ): Promise<string> {
    const trackingId = await this.generateTrackingId(recipient);
    
    // Replace all links with tracking links
    return html.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => {
        const trackedUrl = `${process.env.API_URL}/api/notifications/track/click/${trackingId}?url=${encodeURIComponent(url)}`;
        return `href="${trackedUrl}"`;
      }
    );
  }

  /**
   * Generate tracking ID
   */
  private static async generateTrackingId(
    recipient: string | string[]
  ): Promise<string> {
    const recipientStr = Array.isArray(recipient) ? recipient.join(',') : recipient;
    const trackingId = Buffer.from(`${recipientStr}:${Date.now()}`).toString('base64');
    
    // Store tracking info
    await redis.setex(
      `email-tracking:${trackingId}`,
      86400 * 7, // 7 days
      JSON.stringify({
        recipient,
        sentAt: new Date(),
      })
    );
    
    return trackingId;
  }

  /**
   * Convert HTML to text
   */
  private static htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check rate limiting
   */
  private static async checkRateLimit(recipient: string | string[]): Promise<void> {
    const key = `email-rate:${Array.isArray(recipient) ? recipient[0] : recipient}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 60); // 1 minute window
    }
    
    if (count > this.RATE_LIMIT_PER_MINUTE) {
      throw new Error('Email rate limit exceeded');
    }
  }

  /**
   * Should retry email
   */
  private static async shouldRetry(error: any): Promise<boolean> {
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
    ];
    
    return retryableErrors.some(code => error.code === code);
  }

  /**
   * Retry email
   */
  private static async retryEmail(
    options: EmailOptions,
    attempt: number = 1
  ): Promise<EmailResult> {
    if (attempt > this.MAX_RETRY_ATTEMPTS) {
      throw new Error('Max retry attempts exceeded');
    }
    
    await new Promise(resolve => 
      setTimeout(resolve, this.RETRY_DELAY_MS * attempt)
    );
    
    try {
      return await this.sendEmail(options);
    } catch (error) {
      return this.retryEmail(options, attempt + 1);
    }
  }

  /**
   * Log email sent
   */
  private static async logEmailSent(
    options: EmailOptions,
    result: EmailResult
  ): Promise<void> {
    await prisma.emailLog.create({
      data: {
        messageId: result.messageId,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        template: options.template,
        status: result.rejected.length > 0 ? 'partial' : 'sent',
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
        tags: options.tags,
      },
    });
  }

  /**
   * Store notification history
   */
  private static async storeNotificationHistory(
    options: EmailOptions,
    result: EmailResult
  ): Promise<void> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    
    for (const recipient of recipients) {
      await prisma.notificationHistory.create({
        data: {
          userId: recipient, // This would be mapped to actual user ID
          type: 'email',
          channel: 'email',
          subject: options.subject,
          content: options.text || '',
          metadata: {
            messageId: result.messageId,
            template: options.template,
            tags: options.tags,
          },
          status: result.rejected.includes(recipient) ? 'failed' : 'sent',
        },
      });
    }
  }

  /**
   * Prepare SendGrid attachments
   */
  private static async prepareSendGridAttachments(
    attachments: EmailAttachment[]
  ): Promise<any[]> {
    return Promise.all(
      attachments.map(async (attachment) => {
        let content: string;
        
        if (attachment.content) {
          content = Buffer.isBuffer(attachment.content)
            ? attachment.content.toString('base64')
            : attachment.content;
        } else if (attachment.path) {
          const buffer = await fs.readFile(attachment.path);
          content = buffer.toString('base64');
        } else {
          throw new Error('Attachment must have content or path');
        }
        
        return {
          content,
          filename: attachment.filename,
          type: attachment.contentType,
          disposition: 'attachment',
        };
      })
    );
  }
}

export default EmailService;