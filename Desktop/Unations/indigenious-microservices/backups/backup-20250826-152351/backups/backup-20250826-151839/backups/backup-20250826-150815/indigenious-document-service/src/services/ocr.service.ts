import { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { logger } from '../utils/logger';
import { S3Service } from './s3.service';

const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export class OCRService {
  /**
   * Extract text from PDF using pdf-parse
   */
  static async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      logger.error('PDF text extraction failed', error);
      throw error;
    }
  }

  /**
   * Extract text from image using Tesseract.js
   */
  static async extractTextFromImage(buffer: Buffer): Promise<string> {
    try {
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng+fra', {
        logger: m => logger.debug('Tesseract:', m),
      });
      return text;
    } catch (error) {
      logger.error('Image OCR failed', error);
      throw error;
    }
  }

  /**
   * Extract text using AWS Textract (for complex documents)
   */
  static async extractTextWithTextract(s3Key: string, bucket: string): Promise<{
    text: string;
    tables?: any[];
    forms?: any[];
  }> {
    try {
      const command = new AnalyzeDocumentCommand({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: s3Key,
          },
        },
        FeatureTypes: ['TABLES', 'FORMS'],
      });

      const response = await textractClient.send(command);
      
      // Extract text blocks
      const textBlocks = response.Blocks?.filter(block => block.BlockType === 'LINE')
        .map(block => block.Text)
        .filter(Boolean)
        .join('\n') || '';

      // Extract tables
      const tables = response.Blocks?.filter(block => block.BlockType === 'TABLE') || [];
      
      // Extract forms
      const forms = response.Blocks?.filter(block => block.BlockType === 'KEY_VALUE_SET') || [];

      return { text: textBlocks, tables, forms };
    } catch (error) {
      logger.error('Textract extraction failed', error);
      throw error;
    }
  }

  /**
   * Process document for text extraction
   */
  static async processDocument(
    documentId: string,
    s3Key: string,
    mimeType: string
  ): Promise<{
    extractedText: string;
    metadata?: any;
  }> {
    try {
      logger.info('Starting OCR processing', { documentId, mimeType });

      // Download file from S3
      const buffer = await S3Service.downloadFile(s3Key);
      let extractedText = '';
      let metadata: any = {};

      // Process based on file type
      if (mimeType === 'application/pdf') {
        // For PDFs, try pdf-parse first, then Textract for complex docs
        extractedText = await this.extractTextFromPDF(buffer);
        
        if (!extractedText || extractedText.length < 100) {
          // Fallback to Textract for scanned PDFs
          const textractResult = await this.extractTextWithTextract(
            s3Key,
            process.env.S3_BUCKET_NAME!
          );
          extractedText = textractResult.text;
          metadata = {
            tables: textractResult.tables,
            forms: textractResult.forms,
          };
        }
      } else if (mimeType.startsWith('image/')) {
        // For images, use Tesseract
        extractedText = await this.extractTextFromImage(buffer);
      } else {
        // For other document types, try Textract
        const textractResult = await this.extractTextWithTextract(
          s3Key,
          process.env.S3_BUCKET_NAME!
        );
        extractedText = textractResult.text;
        metadata = textractResult;
      }

      // Process extracted text for Indigenous content
      const indigenousKeywords = this.detectIndigenousContent(extractedText);
      if (indigenousKeywords.length > 0) {
        metadata.indigenousRelevance = indigenousKeywords;
      }

      logger.info('OCR processing completed', {
        documentId,
        textLength: extractedText.length,
        hasIndigenousContent: indigenousKeywords.length > 0,
      });

      return { extractedText, metadata };
    } catch (error) {
      logger.error('Document processing failed', error);
      throw error;
    }
  }

  /**
   * Detect Indigenous-related content
   */
  private static detectIndigenousContent(text: string): string[] {
    const keywords = [
      'first nation', 'indigenous', 'aboriginal', 'métis', 'inuit',
      'band council', 'treaty', 'reserve', 'traditional territory',
      'elder', 'ceremony', 'land acknowledgment', 'reconciliation',
      'première nation', 'autochtone', 'indigène', 'territoire traditionnel',
    ];

    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        found.push(keyword);
      }
    }

    return found;
  }

  /**
   * Extract data from blueprints and CAD files
   */
  static async extractBlueprintData(
    s3Key: string,
    fileType: string
  ): Promise<{
    dimensions?: any;
    layers?: string[];
    metadata?: any;
  }> {
    try {
      // For CAD files, would integrate with specialized CAD processing libraries
      // For now, extract text and metadata using Textract
      const result = await this.extractTextWithTextract(
        s3Key,
        process.env.S3_BUCKET_NAME!
      );

      // Parse dimensions from text
      const dimensions = this.parseDimensions(result.text);
      
      // Extract layer information from tables
      const layers = result.tables?.map((table: any) => 
        table.Cells?.map((cell: any) => cell.Text).filter(Boolean)
      ).flat() || [];

      return {
        dimensions,
        layers,
        metadata: result.forms,
      };
    } catch (error) {
      logger.error('Blueprint data extraction failed', error);
      throw error;
    }
  }

  /**
   * Parse dimensions from text
   */
  private static parseDimensions(text: string): any {
    const dimensionPattern = /(\d+(?:\.\d+)?)\s*(?:m|cm|mm|ft|in|"|')/gi;
    const matches = text.match(dimensionPattern) || [];
    
    return {
      found: matches,
      units: this.detectUnits(text),
    };
  }

  /**
   * Detect measurement units
   */
  private static detectUnits(text: string): 'metric' | 'imperial' | 'mixed' {
    const metricPattern = /\b(m|cm|mm|kilometer|metre|meter)\b/i;
    const imperialPattern = /\b(ft|feet|inch|inches|yard|mile|"|')\b/i;
    
    const hasMetric = metricPattern.test(text);
    const hasImperial = imperialPattern.test(text);
    
    if (hasMetric && hasImperial) return 'mixed';
    if (hasMetric) return 'metric';
    if (hasImperial) return 'imperial';
    return 'metric'; // Default
  }
}

export default OCRService;