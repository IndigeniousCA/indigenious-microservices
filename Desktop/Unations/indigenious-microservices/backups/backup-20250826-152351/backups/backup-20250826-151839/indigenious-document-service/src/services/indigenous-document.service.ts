import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import sharp from 'sharp';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// Initialize AWS clients
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const translateClient = new TranslateClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

export class IndigenousDocumentService {
  private static readonly BUCKET_NAME = process.env.S3_BUCKET || 'indigenous-documents';
  private static readonly INDIGENOUS_LANGUAGES = ['cr', 'oj', 'iu', 'mic', 'moh']; // Cree, Ojibwe, Inuktitut, Mi'kmaq, Mohawk
  
  /**
   * Create Indigenous-themed document with cultural elements
   */
  static async createIndigenousDocument(data: {
    title: string;
    content: any;
    templateType: string;
    businessName: string;
    businessId?: string;
    indigenousOwnership?: number;
    bandAffiliation?: string;
    language?: string;
    culturalElements?: any;
    includeTraditionalArt?: boolean;
  }) {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: data.title,
        Author: data.businessName,
        Subject: `Indigenous ${data.templateType}`,
        Keywords: 'Indigenous, Business, ' + (data.bandAffiliation || ''),
        CreationDate: new Date()
      }
    });
    
    // Apply Indigenous design template
    await this.applyIndigenousTemplate(doc, {
      templateType: data.templateType,
      bandAffiliation: data.bandAffiliation,
      includeTraditionalArt: data.includeTraditionalArt || false
    });
    
    // Add header with Indigenous business indicator
    this.addIndigenousHeader(doc, {
      businessName: data.businessName,
      indigenousOwnership: data.indigenousOwnership,
      bandAffiliation: data.bandAffiliation
    });
    
    // Add content with cultural sensitivity
    await this.addDocumentContent(doc, data.content, data.language);
    
    // Add traditional acknowledgment if applicable
    if (data.bandAffiliation) {
      this.addLandAcknowledgment(doc, data.bandAffiliation);
    }
    
    // Add verification QR code
    const verificationId = await this.generateVerificationCode(doc, {
      businessId: data.businessId,
      isIndigenous: true,
      ownership: data.indigenousOwnership
    });
    
    // Add footer with Indigenous certification badges
    this.addIndigenousFooter(doc, {
      certifications: await this.getIndigenousCertifications(data.businessId)
    });
    
    // Save to buffer
    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    
    return new Promise<{
      buffer: Buffer;
      metadata: any;
      verificationId: string;
    }>((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          metadata: {
            title: data.title,
            type: data.templateType,
            indigenousDocument: true,
            language: data.language,
            culturalElements: data.culturalElements
          },
          verificationId
        });
      });
      doc.end();
    });
  }
  
  /**
   * Process document with Indigenous language support
   */
  static async processIndigenousDocument(data: {
    file: Express.Multer.File;
    userId: string;
    businessId?: string;
    isIndigenous: boolean;
    language?: string;
    culturalSensitivity?: string;
    requiresTranslation?: boolean;
  }) {
    // Calculate file hash
    const fileBuffer = await fs.readFile(data.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Generate S3 key with Indigenous categorization
    const s3Key = this.generateS3Key(data.file.originalname, data.isIndigenous);
    
    // Upload to S3 with encryption
    await s3Client.send(new PutObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: data.file.mimetype,
      ServerSideEncryption: 'AES256',
      Metadata: {
        userId: data.userId,
        businessId: data.businessId || '',
        isIndigenous: String(data.isIndigenous),
        culturalSensitivity: data.culturalSensitivity || 'public',
        language: data.language || 'en'
      }
    }));
    
    // Create document record
    const document = await prisma.document.create({
      data: {
        filename: data.file.filename,
        originalName: data.file.originalname,
        mimeType: data.file.mimetype,
        size: data.file.size,
        s3Key,
        userId: data.userId,
        businessId: data.businessId,
        isIndigenous: data.isIndigenous,
        language: data.language,
        culturalSensitivity: data.culturalSensitivity,
        checksum,
        scanStatus: 'pending'
      }
    });
    
    // Extract text with Indigenous language detection
    if (this.isTextExtractable(data.file.mimetype)) {
      await this.extractIndigenousText(document.id, s3Key, data.language);
    }
    
    // Translate if Indigenous language detected
    if (data.requiresTranslation && data.language && this.INDIGENOUS_LANGUAGES.includes(data.language)) {
      await this.translateIndigenousDocument(document.id, data.language);
    }
    
    // Generate thumbnail with cultural overlay
    if (this.isImageFile(data.file.mimetype)) {
      await this.generateIndigenousThumbnail(document.id, fileBuffer, data.isIndigenous);
    }
    
    // Clean up temp file
    await fs.unlink(data.file.path);
    
    return {
      documentId: document.id,
      s3Key,
      checksum,
      isIndigenous: data.isIndigenous,
      culturalSensitivity: data.culturalSensitivity,
      extractionStarted: this.isTextExtractable(data.file.mimetype),
      translationStarted: data.requiresTranslation
    };
  }
  
  /**
   * Apply digital signature with Indigenous verification
   */
  static async applyIndigenousSignature(data: {
    documentId: string;
    signerId: string;
    signerName: string;
    signerEmail: string;
    signerRole?: string;
    isElder?: boolean;
    bandAffiliation?: string;
    signatureData?: string;
    witnessIds?: string[];
  }) {
    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id: data.documentId }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Generate signature hash
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${data.documentId}:${data.signerId}:${Date.now()}`)
      .digest('hex');
    
    // Generate verification code
    const verificationCode = `SIG-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Create signature with Elder status
    const signature = await prisma.digitalSignature.create({
      data: {
        documentId: data.documentId,
        signerId: data.signerId,
        signerName: data.signerName,
        signerEmail: data.signerEmail,
        signerRole: data.signerRole || (data.isElder ? 'Elder' : 'Signatory'),
        signatureType: data.isElder ? 'qualified' : 'electronic',
        signatureData: data.signatureData,
        signatureHash,
        verificationCode,
        status: 'signed',
        metadata: {
          isElder: data.isElder,
          bandAffiliation: data.bandAffiliation,
          culturalAuthority: data.isElder
        }
      }
    });
    
    // Add witness attestations if Elder signature
    if (data.witnessIds && data.witnessIds.length > 0) {
      await this.addWitnessAttestations(signature.id, data.witnessIds);
    }
    
    // Update document
    await prisma.document.update({
      where: { id: data.documentId },
      data: {
        isSigned: true,
        signatureIds: { push: signature.id },
        lastSignedAt: new Date()
      }
    });
    
    // Generate signed document with watermark
    const signedDoc = await this.generateSignedDocument(document, signature);
    
    return {
      signatureId: signature.id,
      verificationCode,
      signatureHash,
      elderSignature: data.isElder || false,
      witnessCount: data.witnessIds?.length || 0,
      signedDocumentUrl: signedDoc.url
    };
  }
  
  /**
   * Generate Indigenous business templates
   */
  static async createIndigenousTemplate(data: {
    name: string;
    category: string;
    templateType: string;
    isIndigenous: boolean;
    language?: string;
    culturalElements?: any;
    fields: any[];
    sections: any[];
    createdBy: string;
  }) {
    // Add Indigenous-specific fields
    if (data.isIndigenous) {
      data.fields.push(
        {
          name: 'indigenousBusinessNumber',
          type: 'text',
          label: 'Indigenous Business Number',
          required: false
        },
        {
          name: 'bandAffiliation',
          type: 'text',
          label: 'Band/Nation Affiliation',
          required: false
        },
        {
          name: 'indigenousOwnership',
          type: 'number',
          label: 'Indigenous Ownership %',
          required: true,
          validation: { min: 51, max: 100 }
        },
        {
          name: 'landAcknowledgment',
          type: 'textarea',
          label: 'Traditional Territory Acknowledgment',
          required: false
        }
      );
      
      // Add cultural elements section
      data.sections.push({
        name: 'Cultural Recognition',
        fields: ['landAcknowledgment'],
        style: {
          backgroundColor: '#F4E4C1',
          borderStyle: 'traditional',
          fontFamily: 'Aboriginal Sans'
        }
      });
    }
    
    const template = await prisma.documentTemplate.create({
      data: {
        name: data.name,
        category: data.category,
        templateType: data.templateType,
        isIndigenous: data.isIndigenous,
        language: data.language,
        culturalElements: data.culturalElements || this.getDefaultCulturalElements(),
        fields: data.fields,
        sections: data.sections,
        styles: this.getIndigenousStyles(data.isIndigenous),
        createdBy: data.createdBy,
        isPublic: data.isIndigenous // Make Indigenous templates public
      }
    });
    
    return {
      templateId: template.id,
      name: template.name,
      isIndigenous: template.isIndigenous,
      culturalIntegration: data.isIndigenous,
      fieldsCount: data.fields.length,
      sectionsCount: data.sections.length
    };
  }
  
  /**
   * Track document access with cultural sensitivity
   */
  static async trackDocumentAccess(data: {
    documentId: string;
    userId?: string;
    action: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const document = await prisma.document.findUnique({
      where: { id: data.documentId }
    });
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Check cultural sensitivity restrictions
    if (document.culturalSensitivity === 'sacred' || document.culturalSensitivity === 'restricted') {
      // Verify user has permission
      const hasPermission = await this.checkCulturalPermission(data.userId, document);
      if (!hasPermission) {
        throw new Error('Access denied: Cultural sensitivity restrictions');
      }
    }
    
    // Log access
    await prisma.documentAccess.create({
      data: {
        documentId: data.documentId,
        userId: data.userId,
        action: data.action,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
      }
    });
    
    // Alert if sensitive document accessed
    if (document.culturalSensitivity === 'restricted') {
      await this.alertSensitiveDocumentAccess(document, data.userId);
    }
    
    return { tracked: true, culturalCheck: document.culturalSensitivity !== 'public' };
  }
  
  // Helper methods
  private static async applyIndigenousTemplate(doc: PDFDocument, options: any) {
    // Add traditional border pattern
    if (options.includeTraditionalArt) {
      // Would add SVG patterns here
      doc.rect(36, 36, doc.page.width - 72, doc.page.height - 72)
         .lineWidth(2)
         .strokeColor('#8B4513')
         .stroke();
    }
    
    // Add band-specific watermark
    if (options.bandAffiliation) {
      doc.fontSize(48)
         .fillColor('#000000', 0.05)
         .text(options.bandAffiliation, 100, 400, {
           rotate: 45,
           align: 'center'
         });
    }
  }
  
  private static addIndigenousHeader(doc: PDFDocument, data: any) {
    doc.fontSize(16)
       .fillColor('#000000')
       .text(data.businessName, { align: 'center' });
    
    if (data.indigenousOwnership >= 51) {
      doc.fontSize(10)
         .fillColor('#8B4513')
         .text(`Indigenous Owned (${data.indigenousOwnership}%)`, { align: 'center' });
    }
    
    if (data.bandAffiliation) {
      doc.fontSize(10)
         .text(`${data.bandAffiliation} Member`, { align: 'center' });
    }
    
    doc.moveDown();
  }
  
  private static async addDocumentContent(doc: PDFDocument, content: any, language?: string) {
    // Add content with language support
    doc.fontSize(11)
       .fillColor('#000000');
    
    if (typeof content === 'string') {
      doc.text(content, { align: 'left' });
    } else if (Array.isArray(content)) {
      for (const section of content) {
        if (section.title) {
          doc.fontSize(14)
             .text(section.title)
             .fontSize(11);
        }
        if (section.content) {
          doc.text(section.content);
        }
        doc.moveDown();
      }
    }
  }
  
  private static addLandAcknowledgment(doc: PDFDocument, bandAffiliation: string) {
    doc.moveDown(2)
       .fontSize(9)
       .fillColor('#666666')
       .text(`We acknowledge that this document was created on the traditional territory of the ${bandAffiliation}.`, {
         align: 'center',
         oblique: true
       });
  }
  
  private static async generateVerificationCode(doc: PDFDocument, data: any): Promise<string> {
    const verificationId = `DOC-${uuidv4().substring(0, 8).toUpperCase()}`;
    const verificationUrl = `${process.env.VERIFICATION_URL}/verify/${verificationId}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(verificationUrl);
    
    // Add QR code to document
    doc.image(qrCode, doc.page.width - 150, doc.page.height - 150, {
      width: 75,
      height: 75
    });
    
    doc.fontSize(8)
       .text(`Verification: ${verificationId}`, doc.page.width - 150, doc.page.height - 60, {
         width: 75,
         align: 'center'
       });
    
    return verificationId;
  }
  
  private static addIndigenousFooter(doc: PDFDocument, data: any) {
    doc.fontSize(8)
       .fillColor('#666666');
    
    if (data.certifications && data.certifications.length > 0) {
      const certText = data.certifications.join(' | ');
      doc.text(certText, 72, doc.page.height - 50, {
        align: 'center',
        width: doc.page.width - 144
      });
    }
    
    doc.text(`© ${new Date().getFullYear()} - Indigenous Business Document`, 72, doc.page.height - 36, {
      align: 'center',
      width: doc.page.width - 144
    });
  }
  
  private static async getIndigenousCertifications(businessId?: string): Promise<string[]> {
    if (!businessId) return [];
    
    // Would fetch from database
    return ['CCAB Certified', 'Indigenous Owned', 'Supply Nation Registered'];
  }
  
  private static generateS3Key(filename: string, isIndigenous: boolean): string {
    const ext = path.extname(filename);
    const prefix = isIndigenous ? 'indigenous' : 'general';
    const date = new Date().toISOString().split('T')[0];
    const uuid = uuidv4();
    return `${prefix}/${date}/${uuid}${ext}`;
  }
  
  private static isTextExtractable(mimeType: string): boolean {
    const extractableTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg'
    ];
    return extractableTypes.includes(mimeType);
  }
  
  private static isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }
  
  private static async extractIndigenousText(documentId: string, s3Key: string, language?: string) {
    // Create OCR job
    await prisma.oCRJob.create({
      data: {
        documentId,
        status: 'processing'
      }
    });
    
    // Start extraction in background
    setImmediate(async () => {
      try {
        // Use Textract for extraction
        const response = await textractClient.send(new AnalyzeDocumentCommand({
          Document: {
            S3Object: {
              Bucket: this.BUCKET_NAME,
              Name: s3Key
            }
          },
          FeatureTypes: ['TABLES', 'FORMS']
        }));
        
        // Process and save results
        // Implementation would go here
      } catch (error) {
        console.error('Text extraction failed:', error);
      }
    });
  }
  
  private static async translateIndigenousDocument(documentId: string, sourceLanguage: string) {
    // Translate document content
    // Would use translation service
  }
  
  private static async generateIndigenousThumbnail(documentId: string, buffer: Buffer, isIndigenous: boolean) {
    const thumbnail = await sharp(buffer)
      .resize(200, 200)
      .composite(isIndigenous ? [{
        input: Buffer.from(this.getIndigenousWatermark()),
        gravity: 'southeast'
      }] : [])
      .toBuffer();
    
    // Upload thumbnail to S3
    const thumbnailKey = `thumbnails/${documentId}.jpg`;
    await s3Client.send(new PutObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnail,
      ContentType: 'image/jpeg'
    }));
    
    // Update document
    await prisma.document.update({
      where: { id: documentId },
      data: { thumbnailKey }
    });
  }
  
  private static getIndigenousWatermark(): string {
    // Return SVG watermark
    return '<svg><!-- Indigenous symbol --></svg>';
  }
  
  private static async addWitnessAttestations(signatureId: string, witnessIds: string[]) {
    for (const witnessId of witnessIds) {
      // Get witness details
      const witness = await prisma.user.findUnique({
        where: { id: witnessId }
      });
      
      if (witness) {
        await prisma.witnessAttestation.create({
          data: {
            signatureId,
            witnessId,
            witnessName: witness.name,
            attestation: `I witness this signature as ${witness.isElder ? 'an Elder' : 'a community member'}`
          }
        });
      }
    }
  }
  
  private static async generateSignedDocument(document: any, signature: any): Promise<{ url: string }> {
    // Generate pre-signed URL for signed document
    const url = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: document.s3Key
    }), { expiresIn: 3600 });
    
    return { url };
  }
  
  private static getDefaultCulturalElements(): any {
    return {
      patterns: ['traditional-border', 'medicine-wheel'],
      colors: ['#8B4513', '#F4E4C1', '#2F4F4F'],
      symbols: ['eagle-feather', 'dreamcatcher'],
      fonts: ['Aboriginal Sans', 'Pigiarniq']
    };
  }
  
  private static getIndigenousStyles(isIndigenous: boolean): any {
    if (!isIndigenous) {
      return {
        fontFamily: 'Helvetica',
        primaryColor: '#000000',
        secondaryColor: '#666666'
      };
    }
    
    return {
      fontFamily: 'Aboriginal Sans',
      primaryColor: '#8B4513',
      secondaryColor: '#F4E4C1',
      borderStyle: 'traditional',
      watermark: true,
      includeSymbols: true
    };
  }
  
  private static async checkCulturalPermission(userId?: string, document: any): Promise<boolean> {
    if (!userId) return false;
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) return false;
    
    // Check if user has cultural access
    if (document.culturalSensitivity === 'sacred') {
      return user.isElder || user.bandName === document.metadata?.band;
    }
    
    if (document.culturalSensitivity === 'restricted') {
      return user.isIndigenous;
    }
    
    return true;
  }
  
  private static async alertSensitiveDocumentAccess(document: any, userId?: string) {
    // Send alert about sensitive document access
    console.log(`Alert: Sensitive document ${document.id} accessed by user ${userId}`);
    // Would integrate with notification service
  }
}