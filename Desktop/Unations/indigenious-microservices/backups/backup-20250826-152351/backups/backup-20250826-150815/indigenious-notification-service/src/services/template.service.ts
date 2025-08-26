import handlebars from 'handlebars';
import mjml2html from 'mjml';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

export interface TemplateData {
  name: string;
  category: 'email' | 'sms' | 'push';
  subject?: string;
  content: {
    html?: string;
    text: string;
    mjml?: string;
  };
  variables?: string[];
  language: 'en' | 'fr';
  tags?: string[];
  active?: boolean;
}

export interface TemplateVariables {
  [key: string]: any;
  user?: {
    name: string;
    email: string;
    phone?: string;
    language?: 'en' | 'fr';
  };
  business?: {
    name: string;
    bandNumber?: string;
    category?: string;
    certified?: boolean;
  };
  rfq?: {
    title: string;
    number: string;
    deadline: Date;
    value: string;
    category: string;
  };
  payment?: {
    amount: string;
    date: Date;
    method: string;
    reference: string;
  };
}

export class TemplateService {
  private static compiledTemplates = new Map<string, handlebars.TemplateDelegate>();

  /**
   * Initialize default templates
   */
  static async initializeDefaultTemplates(): Promise<void> {
    try {
      // RFQ Notification Templates
      await this.createTemplate({
        name: 'rfq_notification',
        category: 'email',
        subject: 'New RFQ Opportunity: {{rfq.title}}',
        content: {
          html: `
            <h2>New RFQ Opportunity</h2>
            <p>Dear {{user.name}},</p>
            <p>A new RFQ matching your business profile has been posted:</p>
            <ul>
              <li><strong>Title:</strong> {{rfq.title}}</li>
              <li><strong>RFQ Number:</strong> {{rfq.number}}</li>
              <li><strong>Category:</strong> {{rfq.category}}</li>
              <li><strong>Estimated Value:</strong> {{rfq.value}}</li>
              <li><strong>Deadline:</strong> {{formatDate rfq.deadline}}</li>
            </ul>
            {{#if business.certified}}
            <p><em>As a certified Indigenous business, you have priority access to this opportunity.</em></p>
            {{/if}}
            <p><a href="{{platformUrl}}/rfq/{{rfq.number}}" style="background: #4A5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View RFQ Details</a></p>
            <p>Best regards,<br>Indigenous Procurement Platform</p>
          `,
          text: `
New RFQ Opportunity

Dear {{user.name}},

A new RFQ matching your business profile has been posted:

Title: {{rfq.title}}
RFQ Number: {{rfq.number}}
Category: {{rfq.category}}
Estimated Value: {{rfq.value}}
Deadline: {{formatDate rfq.deadline}}

{{#if business.certified}}
As a certified Indigenous business, you have priority access to this opportunity.
{{/if}}

View RFQ Details: {{platformUrl}}/rfq/{{rfq.number}}

Best regards,
Indigenous Procurement Platform
          `,
        },
        variables: ['user.name', 'rfq.title', 'rfq.number', 'rfq.category', 'rfq.value', 'rfq.deadline', 'business.certified'],
        language: 'en',
        tags: ['rfq', 'business', 'opportunity'],
      });

      // Payment Confirmation Templates
      await this.createTemplate({
        name: 'payment_confirmation',
        category: 'email',
        subject: 'Payment Confirmation - {{payment.reference}}',
        content: {
          html: `
            <h2>Payment Confirmation</h2>
            <p>Dear {{user.name}},</p>
            <p>Your payment has been successfully processed:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{{payment.amount}}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{{formatDate payment.date}}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Method:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{{payment.method}}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{{payment.reference}}</td>
              </tr>
            </table>
            <p>Thank you for your business!</p>
            <p>Indigenous Procurement Platform</p>
          `,
          text: `
Payment Confirmation

Dear {{user.name}},

Your payment has been successfully processed:

Amount: {{payment.amount}}
Date: {{formatDate payment.date}}
Method: {{payment.method}}
Reference: {{payment.reference}}

Thank you for your business!

Indigenous Procurement Platform
          `,
        },
        variables: ['user.name', 'payment.amount', 'payment.date', 'payment.method', 'payment.reference'],
        language: 'en',
        tags: ['payment', 'confirmation'],
      });

      // Welcome Templates for Indigenous Businesses
      await this.createTemplate({
        name: 'welcome_indigenous_business',
        category: 'email',
        subject: 'Welcome to the Indigenous Procurement Platform',
        content: {
          mjml: `
            <mjml>
              <mj-head>
                <mj-title>Welcome to Indigenous Procurement Platform</mj-title>
                <mj-attributes>
                  <mj-all font-family="Arial, sans-serif" />
                  <mj-button background-color="#4A5568" />
                </mj-attributes>
              </mj-head>
              <mj-body background-color="#f4f4f4">
                <mj-section background-color="#ffffff" padding="20px">
                  <mj-column>
                    <mj-image src="{{logoUrl}}" width="200px" />
                    <mj-text font-size="24px" color="#2D3748" align="center">
                      Welcome {{business.name}}!
                    </mj-text>
                    <mj-text font-size="16px" color="#4A5568">
                      Congratulations on joining the Indigenous Procurement Platform. Your business is now connected to federal, provincial, and corporate procurement opportunities across Canada.
                    </mj-text>
                    {{#if business.bandNumber}}
                    <mj-text font-size="14px" color="#718096">
                      Band Number: {{business.bandNumber}} - Verified ✓
                    </mj-text>
                    {{/if}}
                    <mj-divider border-color="#E2E8F0" />
                    <mj-text font-size="18px" color="#2D3748">
                      Getting Started:
                    </mj-text>
                    <mj-text font-size="14px" color="#4A5568">
                      • Complete your business profile<br/>
                      • Upload certification documents<br/>
                      • Set up notification preferences<br/>
                      • Browse current RFQ opportunities<br/>
                      • Connect with procurement officers
                    </mj-text>
                    <mj-button href="{{platformUrl}}/dashboard">
                      Access Your Dashboard
                    </mj-button>
                    <mj-text font-size="12px" color="#718096" align="center">
                      Need help? Contact us at support@indigenous.ca
                    </mj-text>
                  </mj-column>
                </mj-section>
              </mj-body>
            </mjml>
          `,
          text: `
Welcome {{business.name}}!

Congratulations on joining the Indigenous Procurement Platform. Your business is now connected to federal, provincial, and corporate procurement opportunities across Canada.

{{#if business.bandNumber}}
Band Number: {{business.bandNumber}} - Verified
{{/if}}

Getting Started:
• Complete your business profile
• Upload certification documents
• Set up notification preferences
• Browse current RFQ opportunities
• Connect with procurement officers

Access Your Dashboard: {{platformUrl}}/dashboard

Need help? Contact us at support@indigenous.ca

Indigenous Procurement Platform
          `,
        },
        variables: ['business.name', 'business.bandNumber', 'platformUrl', 'logoUrl'],
        language: 'en',
        tags: ['welcome', 'indigenous', 'onboarding'],
      });

      // SMS Templates
      await this.createTemplate({
        name: 'rfq_reminder_sms',
        category: 'sms',
        content: {
          text: 'Reminder: RFQ {{rfq.number}} deadline is {{formatDate rfq.deadline}}. Submit your proposal at {{shortUrl}}',
        },
        variables: ['rfq.number', 'rfq.deadline', 'shortUrl'],
        language: 'en',
        tags: ['rfq', 'reminder', 'sms'],
      });

      await this.createTemplate({
        name: 'verification_code_sms',
        category: 'sms',
        content: {
          text: 'Your Indigenous Platform verification code: {{code}}. Valid for 10 minutes.',
        },
        variables: ['code'],
        language: 'en',
        tags: ['verification', 'security', 'sms'],
      });

      // Push Templates
      await this.createTemplate({
        name: 'rfq_match_push',
        category: 'push',
        content: {
          text: 'New RFQ match: {{rfq.title}} - Deadline: {{formatDate rfq.deadline}}',
        },
        variables: ['rfq.title', 'rfq.deadline'],
        language: 'en',
        tags: ['rfq', 'push', 'match'],
      });

      // French Templates
      await this.createTemplate({
        name: 'rfq_notification',
        category: 'email',
        subject: 'Nouvelle opportunité RFQ: {{rfq.title}}',
        content: {
          html: `
            <h2>Nouvelle opportunité RFQ</h2>
            <p>Cher {{user.name}},</p>
            <p>Une nouvelle RFQ correspondant à votre profil d'entreprise a été publiée:</p>
            <ul>
              <li><strong>Titre:</strong> {{rfq.title}}</li>
              <li><strong>Numéro RFQ:</strong> {{rfq.number}}</li>
              <li><strong>Catégorie:</strong> {{rfq.category}}</li>
              <li><strong>Valeur estimée:</strong> {{rfq.value}}</li>
              <li><strong>Date limite:</strong> {{formatDate rfq.deadline}}</li>
            </ul>
            {{#if business.certified}}
            <p><em>En tant qu'entreprise autochtone certifiée, vous avez un accès prioritaire à cette opportunité.</em></p>
            {{/if}}
            <p><a href="{{platformUrl}}/rfq/{{rfq.number}}" style="background: #4A5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir les détails RFQ</a></p>
            <p>Cordialement,<br>Plateforme d'approvisionnement autochtone</p>
          `,
          text: `
Nouvelle opportunité RFQ

Cher {{user.name}},

Une nouvelle RFQ correspondant à votre profil d'entreprise a été publiée:

Titre: {{rfq.title}}
Numéro RFQ: {{rfq.number}}
Catégorie: {{rfq.category}}
Valeur estimée: {{rfq.value}}
Date limite: {{formatDate rfq.deadline}}

{{#if business.certified}}
En tant qu'entreprise autochtone certifiée, vous avez un accès prioritaire à cette opportunité.
{{/if}}

Voir les détails RFQ: {{platformUrl}}/rfq/{{rfq.number}}

Cordialement,
Plateforme d'approvisionnement autochtone
          `,
        },
        variables: ['user.name', 'rfq.title', 'rfq.number', 'rfq.category', 'rfq.value', 'rfq.deadline', 'business.certified'],
        language: 'fr',
        tags: ['rfq', 'business', 'opportunity'],
      });

      logger.info('Default templates initialized');
    } catch (error) {
      logger.error('Failed to initialize default templates', error);
    }
  }

  /**
   * Create template
   */
  static async createTemplate(data: TemplateData): Promise<string> {
    try {
      const templateId = uuidv4();

      // Process MJML if provided
      let htmlContent = data.content.html;
      if (data.content.mjml) {
        const mjmlResult = mjml2html(data.content.mjml);
        if (mjmlResult.errors.length > 0) {
          logger.warn('MJML compilation warnings', mjmlResult.errors);
        }
        htmlContent = mjmlResult.html;
      }

      // Store in database
      const template = await prisma.notificationTemplate.create({
        data: {
          id: templateId,
          name: data.name,
          category: data.category,
          subject: data.subject,
          htmlContent,
          textContent: data.content.text,
          mjmlContent: data.content.mjml,
          variables: data.variables || [],
          language: data.language,
          tags: data.tags || [],
          active: data.active !== false,
        },
      });

      // Compile and cache
      await this.compileTemplate(template.id);

      // Clear cache
      await redis.del(`template:${data.name}:${data.language}`);

      logger.info('Template created', { templateId, name: data.name });
      return templateId;
    } catch (error) {
      logger.error('Failed to create template', error);
      throw error;
    }
  }

  /**
   * Update template
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<TemplateData>
  ): Promise<void> {
    try {
      // Process MJML if provided
      let htmlContent = updates.content?.html;
      if (updates.content?.mjml) {
        const mjmlResult = mjml2html(updates.content.mjml);
        if (mjmlResult.errors.length > 0) {
          logger.warn('MJML compilation warnings', mjmlResult.errors);
        }
        htmlContent = mjmlResult.html;
      }

      // Update in database
      const template = await prisma.notificationTemplate.update({
        where: { id: templateId },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.subject && { subject: updates.subject }),
          ...(htmlContent && { htmlContent }),
          ...(updates.content?.text && { textContent: updates.content.text }),
          ...(updates.content?.mjml && { mjmlContent: updates.content.mjml }),
          ...(updates.variables && { variables: updates.variables }),
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.active !== undefined && { active: updates.active }),
        },
      });

      // Recompile
      await this.compileTemplate(templateId);

      // Clear cache
      await redis.del(`template:${template.name}:${template.language}`);

      logger.info('Template updated', { templateId });
    } catch (error) {
      logger.error('Failed to update template', error);
      throw error;
    }
  }

  /**
   * Get template
   */
  static async getTemplate(
    name: string,
    language: 'en' | 'fr' = 'en'
  ): Promise<any> {
    try {
      // Check cache
      const cacheKey = `template:${name}:${language}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const template = await prisma.notificationTemplate.findFirst({
        where: {
          name,
          language,
          active: true,
        },
      });

      if (!template) {
        // Fallback to English if French not found
        if (language === 'fr') {
          return this.getTemplate(name, 'en');
        }
        return null;
      }

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(template));

      return template;
    } catch (error) {
      logger.error('Failed to get template', error);
      throw error;
    }
  }

  /**
   * Render template
   */
  static async renderTemplate(
    templateName: string,
    variables: TemplateVariables,
    language: 'en' | 'fr' = 'en'
  ): Promise<{
    subject?: string;
    html?: string;
    text: string;
  }> {
    try {
      const template = await this.getTemplate(templateName, language);
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      // Get compiled template
      const compiledKey = `${template.id}:compiled`;
      let compiled = this.compiledTemplates.get(compiledKey);
      
      if (!compiled) {
        await this.compileTemplate(template.id);
        compiled = this.compiledTemplates.get(compiledKey);
      }

      // Add helper functions
      const helpers = this.getHelpers();
      handlebars.registerHelper(helpers);

      // Add default variables
      const data = {
        ...variables,
        platformName: 'Indigenous Procurement Platform',
        platformUrl: process.env.APP_URL || 'https://indigenous.ca',
        logoUrl: `${process.env.APP_URL}/logo.png`,
        year: new Date().getFullYear(),
        supportEmail: 'support@indigenous.ca',
        unsubscribeUrl: `${process.env.APP_URL}/unsubscribe`,
      };

      // Render subject
      let subject;
      if (template.subject) {
        const subjectTemplate = handlebars.compile(template.subject);
        subject = subjectTemplate(data);
      }

      // Render HTML
      let html;
      if (template.htmlContent) {
        const htmlTemplate = handlebars.compile(template.htmlContent);
        html = htmlTemplate(data);
      }

      // Render text
      const textTemplate = handlebars.compile(template.textContent);
      const text = textTemplate(data);

      return { subject, html, text };
    } catch (error) {
      logger.error('Failed to render template', error);
      throw error;
    }
  }

  /**
   * Compile template
   */
  private static async compileTemplate(templateId: string): Promise<void> {
    try {
      const template = await prisma.notificationTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) return;

      const key = `${templateId}:compiled`;
      
      if (template.htmlContent) {
        this.compiledTemplates.set(
          `${key}:html`,
          handlebars.compile(template.htmlContent)
        );
      }

      if (template.textContent) {
        this.compiledTemplates.set(
          `${key}:text`,
          handlebars.compile(template.textContent)
        );
      }

      if (template.subject) {
        this.compiledTemplates.set(
          `${key}:subject`,
          handlebars.compile(template.subject)
        );
      }
    } catch (error) {
      logger.error('Failed to compile template', error);
    }
  }

  /**
   * Get Handlebars helpers
   */
  private static getHelpers(): Record<string, any> {
    return {
      formatDate: (date: Date | string, format?: string) => {
        const d = new Date(date);
        if (format === 'short') {
          return d.toLocaleDateString('en-CA');
        }
        return d.toLocaleDateString('en-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
      formatCurrency: (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-CA', {
          style: 'currency',
          currency: 'CAD',
        }).format(num);
      },
      formatPercentage: (value: number) => {
        return `${(value * 100).toFixed(2)}%`;
      },
      capitalize: (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
      },
      eq: (a: any, b: any) => a === b,
      ne: (a: any, b: any) => a !== b,
      lt: (a: any, b: any) => a < b,
      gt: (a: any, b: any) => a > b,
      lte: (a: any, b: any) => a <= b,
      gte: (a: any, b: any) => a >= b,
      and: (...args: any[]) => {
        const options = args.pop();
        return args.every(Boolean);
      },
      or: (...args: any[]) => {
        const options = args.pop();
        return args.some(Boolean);
      },
      shortUrl: (url: string) => {
        // In production, this would use a URL shortener service
        return url.length > 30 ? url.substring(0, 27) + '...' : url;
      },
    };
  }

  /**
   * List templates
   */
  static async listTemplates(filters?: {
    category?: 'email' | 'sms' | 'push';
    language?: 'en' | 'fr';
    tags?: string[];
    active?: boolean;
  }): Promise<any[]> {
    try {
      const where: any = {};

      if (filters?.category) where.category = filters.category;
      if (filters?.language) where.language = filters.language;
      if (filters?.active !== undefined) where.active = filters.active;
      if (filters?.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      return await prisma.notificationTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to list templates', error);
      throw error;
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    try {
      await prisma.notificationTemplate.delete({
        where: { id: templateId },
      });

      // Remove from compiled cache
      const keys = Array.from(this.compiledTemplates.keys());
      keys.forEach(key => {
        if (key.startsWith(templateId)) {
          this.compiledTemplates.delete(key);
        }
      });

      logger.info('Template deleted', { templateId });
    } catch (error) {
      logger.error('Failed to delete template', error);
      throw error;
    }
  }

  /**
   * Clone template
   */
  static async cloneTemplate(
    templateId: string,
    newName: string
  ): Promise<string> {
    try {
      const original = await prisma.notificationTemplate.findUnique({
        where: { id: templateId },
      });

      if (!original) {
        throw new Error('Template not found');
      }

      return await this.createTemplate({
        name: newName,
        category: original.category as 'email' | 'sms' | 'push',
        subject: original.subject || undefined,
        content: {
          html: original.htmlContent || undefined,
          text: original.textContent,
          mjml: original.mjmlContent || undefined,
        },
        variables: original.variables as string[],
        language: original.language as 'en' | 'fr',
        tags: original.tags as string[],
        active: false, // Start as inactive
      });
    } catch (error) {
      logger.error('Failed to clone template', error);
      throw error;
    }
  }
}

export default TemplateService;