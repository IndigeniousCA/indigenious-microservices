import { prisma } from '../config/database';
import { redis } from '../config/redis';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import dayjs from 'dayjs';

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  templateType: 'rfq' | 'contract' | 'invoice' | 'certification' | 'report' | 'custom';
  isIndigenous: boolean;
  language?: string;
  fields: TemplateField[];
  sections: TemplateSection[];
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TemplateField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'signature' | 'image';
  label: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

export interface TemplateSection {
  id: string;
  title: string;
  content: string;
  order: number;
  fields?: string[];
  isRepeatable?: boolean;
}

export class DocumentTemplateService {
  private static readonly CACHE_TTL = 86400; // 24 hours

  /**
   * Create Indigenous-specific templates
   */
  static async createIndigenousTemplates(): Promise<void> {
    const templates = [
      {
        name: 'Indigenous Business Certification',
        category: 'certification',
        templateType: 'certification' as const,
        isIndigenous: true,
        fields: [
          { name: 'businessName', type: 'text' as const, label: 'Business Name', required: true },
          { name: 'bandName', type: 'text' as const, label: 'First Nation/Band Name', required: true },
          { name: 'bandNumber', type: 'text' as const, label: 'Band Number', required: true },
          { name: 'chiefName', type: 'text' as const, label: 'Chief/Leader Name', required: false },
          { name: 'ownershipPercentage', type: 'number' as const, label: 'Indigenous Ownership %', required: true, validation: { min: 51, max: 100 } },
          { name: 'territory', type: 'text' as const, label: 'Traditional Territory', required: false },
          { name: 'treaty', type: 'select' as const, label: 'Treaty', required: false, options: ['Treaty 1', 'Treaty 2', 'Treaty 3', 'Treaty 4', 'Treaty 5', 'Treaty 6', 'Treaty 7', 'Treaty 8', 'Treaty 9', 'Treaty 10', 'Treaty 11', 'Modern Treaty', 'No Treaty'] },
        ],
        sections: [
          { id: '1', title: 'Business Information', content: 'Basic information about the Indigenous business', order: 1 },
          { id: '2', title: 'Indigenous Affiliation', content: 'Details about First Nation/Band affiliation', order: 2 },
          { id: '3', title: 'Ownership Structure', content: 'Information about Indigenous ownership', order: 3 },
          { id: '4', title: 'Certification', content: 'Certification details and attestation', order: 4 },
        ],
      },
      {
        name: 'Traditional Knowledge Agreement',
        category: 'contract',
        templateType: 'contract' as const,
        isIndigenous: true,
        fields: [
          { name: 'elderName', type: 'text' as const, label: 'Elder/Knowledge Keeper Name', required: true },
          { name: 'knowledgeType', type: 'select' as const, label: 'Type of Knowledge', required: true, options: ['Traditional Medicine', 'Cultural Practices', 'Language', 'Storytelling', 'Crafts', 'Other'] },
          { name: 'purpose', type: 'text' as const, label: 'Purpose of Knowledge Sharing', required: true },
          { name: 'restrictions', type: 'text' as const, label: 'Usage Restrictions', required: false },
          { name: 'compensation', type: 'text' as const, label: 'Compensation/Honorarium', required: false },
          { name: 'witnessSignature', type: 'signature' as const, label: 'Witness Signature', required: true },
        ],
        sections: [
          { id: '1', title: 'Knowledge Keeper Information', content: 'Information about the Elder or Knowledge Keeper', order: 1 },
          { id: '2', title: 'Knowledge Description', content: 'Description of traditional knowledge being shared', order: 2 },
          { id: '3', title: 'Terms and Conditions', content: 'Terms for knowledge use and protection', order: 3 },
          { id: '4', title: 'Cultural Protocols', content: 'Respect for cultural protocols and practices', order: 4 },
        ],
      },
    ];

    for (const template of templates) {
      await this.createTemplate(template as any, 'system');
    }
  }

  /**
   * Create a document template
   */
  static async createTemplate(
    templateData: Partial<DocumentTemplate>,
    userId: string
  ): Promise<DocumentTemplate> {
    try {
      const templateId = uuidv4();

      const template = await prisma.documentTemplate.create({
        data: {
          id: templateId,
          name: templateData.name!,
          category: templateData.category!,
          description: templateData.description,
          templateType: templateData.templateType!,
          isIndigenous: templateData.isIndigenous || false,
          language: templateData.language,
          fields: templateData.fields || [],
          sections: templateData.sections || [],
          metadata: templateData.metadata || {},
          createdBy: userId,
        },
      });

      // Cache template
      await this.cacheTemplate(template);

      logger.info('Document template created', {
        templateId,
        name: template.name,
        isIndigenous: template.isIndigenous,
      });

      return this.formatTemplate(template);
    } catch (error) {
      logger.error('Failed to create template', error);
      throw error;
    }
  }

  /**
   * Generate document from template
   */
  static async generateDocument(
    templateId: string,
    data: Record<string, any>,
    options: {
      format?: 'pdf' | 'docx' | 'html';
      includeWatermark?: boolean;
      includeCulturalElements?: boolean;
    } = {}
  ): Promise<Buffer> {
    try {
      const template = await this.getTemplate(templateId);

      // Validate required fields
      this.validateTemplateData(template, data);

      // Generate based on format
      let document: Buffer;
      switch (options.format || 'pdf') {
        case 'pdf':
          document = await this.generatePDF(template, data, options);
          break;
        case 'html':
          document = await this.generateHTML(template, data, options);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      logger.info('Document generated from template', {
        templateId,
        format: options.format || 'pdf',
      });

      return document;
    } catch (error) {
      logger.error('Failed to generate document from template', error);
      throw error;
    }
  }

  /**
   * Generate PDF from template
   */
  private static async generatePDF(
    template: DocumentTemplate,
    data: Record<string, any>,
    options: any
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Add header with Indigenous elements if applicable
        if (template.isIndigenous && options.includeCulturalElements) {
          this.addIndigenousHeader(doc);
        }

        // Document title
        doc.fontSize(20)
           .text(template.name, { align: 'center' })
           .moveDown();

        // Add sections
        for (const section of template.sections.sort((a, b) => a.order - b.order)) {
          doc.fontSize(16)
             .text(section.title)
             .fontSize(12)
             .moveDown(0.5);

          // Add section content
          let content = section.content;
          
          // Replace field placeholders with data
          if (section.fields) {
            for (const fieldName of section.fields) {
              const field = template.fields.find(f => f.name === fieldName);
              if (field && data[fieldName]) {
                content = content.replace(`{{${fieldName}}}`, data[fieldName]);
              }
            }
          }

          doc.text(content)
             .moveDown();

          // Add field values
          if (section.fields) {
            for (const fieldName of section.fields) {
              const field = template.fields.find(f => f.name === fieldName);
              if (field && data[fieldName]) {
                doc.fontSize(10)
                   .text(`${field.label}: `, { continued: true })
                   .fontSize(11)
                   .text(String(data[fieldName]))
                   .fontSize(12);
              }
            }
          }

          doc.moveDown();
        }

        // Add watermark if requested
        if (options.includeWatermark) {
          this.addWatermark(doc, 'DRAFT');
        }

        // Add footer
        this.addFooter(doc, template);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate HTML from template
   */
  private static async generateHTML(
    template: DocumentTemplate,
    data: Record<string, any>,
    options: any
  ): Promise<Buffer> {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${template.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { text-align: center; color: #333; }
          h2 { color: #555; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
          .field { margin: 10px 0; }
          .field-label { font-weight: bold; }
          .field-value { margin-left: 10px; }
          .indigenous-header { 
            text-align: center; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            margin-bottom: 30px;
          }
          .footer { 
            margin-top: 50px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            text-align: center; 
            color: #666; 
            font-size: 12px;
          }
        </style>
      </head>
      <body>
    `;

    // Add Indigenous header if applicable
    if (template.isIndigenous && options.includeCulturalElements) {
      html += `
        <div class="indigenous-header">
          <h2>Indigenous Procurement Platform</h2>
          <p>Honouring Traditional Knowledge and Business Excellence</p>
        </div>
      `;
    }

    html += `<h1>${template.name}</h1>`;

    // Add sections
    for (const section of template.sections.sort((a, b) => a.order - b.order)) {
      html += `<h2>${section.title}</h2>`;
      html += `<p>${section.content}</p>`;

      // Add fields
      if (section.fields) {
        for (const fieldName of section.fields) {
          const field = template.fields.find(f => f.name === fieldName);
          if (field && data[fieldName]) {
            html += `
              <div class="field">
                <span class="field-label">${field.label}:</span>
                <span class="field-value">${data[fieldName]}</span>
              </div>
            `;
          }
        }
      }
    }

    // Add footer
    html += `
      <div class="footer">
        <p>Generated on ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
        <p>Indigenous Procurement Platform - Document Template System</p>
      </div>
    </body>
    </html>
    `;

    return Buffer.from(html);
  }

  /**
   * Get template by ID
   */
  static async getTemplate(templateId: string): Promise<DocumentTemplate> {
    try {
      // Check cache
      const cacheKey = `template:${templateId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const template = await prisma.documentTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      const formatted = this.formatTemplate(template);
      
      // Cache template
      await this.cacheTemplate(template);

      return formatted;
    } catch (error) {
      logger.error('Failed to get template', error);
      throw error;
    }
  }

  /**
   * Search templates
   */
  static async searchTemplates(
    filters: {
      category?: string;
      templateType?: string;
      isIndigenous?: boolean;
      language?: string;
      search?: string;
    } = {}
  ): Promise<DocumentTemplate[]> {
    try {
      const where: any = {};

      if (filters.category) where.category = filters.category;
      if (filters.templateType) where.templateType = filters.templateType;
      if (filters.isIndigenous !== undefined) where.isIndigenous = filters.isIndigenous;
      if (filters.language) where.language = filters.language;

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const templates = await prisma.documentTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return templates.map(t => this.formatTemplate(t));
    } catch (error) {
      logger.error('Failed to search templates', error);
      throw error;
    }
  }

  /**
   * Helper: Validate template data
   */
  private static validateTemplateData(
    template: DocumentTemplate,
    data: Record<string, any>
  ): void {
    for (const field of template.fields) {
      if (field.required && !data[field.name]) {
        throw new Error(`Required field missing: ${field.label}`);
      }

      if (data[field.name] && field.validation) {
        const value = data[field.name];
        
        if (field.type === 'number') {
          if (field.validation.min !== undefined && value < field.validation.min) {
            throw new Error(`${field.label} must be at least ${field.validation.min}`);
          }
          if (field.validation.max !== undefined && value > field.validation.max) {
            throw new Error(`${field.label} must be at most ${field.validation.max}`);
          }
        }

        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(String(value))) {
            throw new Error(field.validation.message || `${field.label} format is invalid`);
          }
        }
      }
    }
  }

  /**
   * Helper: Add Indigenous header to PDF
   */
  private static addIndigenousHeader(doc: any): void {
    doc.fontSize(14)
       .text('ᐊᓂᔑᓈᐯ', { align: 'center' }) // Anishinaabe in syllabics
       .fontSize(12)
       .text('Indigenous Business Excellence', { align: 'center' })
       .moveDown();
  }

  /**
   * Helper: Add watermark to PDF
   */
  private static addWatermark(doc: any, text: string): void {
    doc.save();
    doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.fontSize(60)
       .fillColor('#cccccc')
       .opacity(0.3)
       .text(text, doc.page.width / 4, doc.page.height / 2);
    doc.restore();
  }

  /**
   * Helper: Add footer to PDF
   */
  private static addFooter(doc: any, template: DocumentTemplate): void {
    const y = doc.page.height - 50;
    doc.fontSize(8)
       .fillColor('#666666')
       .text(`Generated from template: ${template.name}`, 50, y)
       .text(`Date: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 50, y + 10)
       .text('Indigenous Procurement Platform', 50, y + 20);
  }

  /**
   * Helper: Cache template
   */
  private static async cacheTemplate(template: any): Promise<void> {
    const formatted = this.formatTemplate(template);
    await redis.setex(
      `template:${template.id}`,
      this.CACHE_TTL,
      JSON.stringify(formatted)
    );
  }

  /**
   * Helper: Format template
   */
  private static formatTemplate(template: any): DocumentTemplate {
    return {
      id: template.id,
      name: template.name,
      category: template.category,
      description: template.description,
      templateType: template.templateType,
      isIndigenous: template.isIndigenous,
      language: template.language,
      fields: template.fields,
      sections: template.sections,
      metadata: template.metadata,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}

export default DocumentTemplateService;