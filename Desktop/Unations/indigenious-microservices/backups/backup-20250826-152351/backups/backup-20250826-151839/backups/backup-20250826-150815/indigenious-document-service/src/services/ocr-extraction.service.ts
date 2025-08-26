import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { ComprehendClient, DetectDominantLanguageCommand, DetectEntitiesCommand } from '@aws-sdk/client-comprehend';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';

export interface ExtractionResult {
  text: string;
  language?: string;
  confidence: number;
  entities?: Entity[];
  indigenousContent?: IndigenousContent;
  metadata?: Record<string, any>;
}

export interface Entity {
  type: string;
  text: string;
  score: number;
  beginOffset?: number;
  endOffset?: number;
}

export interface IndigenousContent {
  detected: boolean;
  language?: string;
  culturalTerms: string[];
  bandReferences: string[];
  treatyReferences: string[];
  confidence: number;
}

export class OCRExtractionService {
  private static textractClient: TextractClient;
  private static translateClient: TranslateClient;
  private static comprehendClient: ComprehendClient;
  private static readonly CACHE_TTL = 86400; // 24 hours

  /**
   * Initialize OCR and extraction services
   */
  static async initialize(): Promise<void> {
    this.textractClient = new TextractClient({
      region: process.env.AWS_REGION || 'ca-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.translateClient = new TranslateClient({
      region: process.env.AWS_REGION || 'ca-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.comprehendClient = new ComprehendClient({
      region: process.env.AWS_REGION || 'ca-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    logger.info('OCR extraction service initialized');
  }

  /**
   * Extract text from document
   */
  static async extractText(
    fileBuffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<ExtractionResult> {
    try {
      // Check cache
      const cacheKey = `ocr:${filename}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let result: ExtractionResult;

      // Route to appropriate extraction method
      if (mimeType === 'application/pdf') {
        result = await this.extractFromPDF(fileBuffer);
      } else if (mimeType.startsWith('image/')) {
        result = await this.extractFromImage(fileBuffer);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        result = await this.extractFromWord(fileBuffer);
      } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        result = await this.extractFromExcel(fileBuffer);
      } else {
        result = await this.extractWithTextract(fileBuffer);
      }

      // Detect language
      if (result.text) {
        const languageInfo = await this.detectLanguage(result.text);
        result.language = languageInfo.language;
        
        // Check for Indigenous content
        result.indigenousContent = await this.detectIndigenousContent(result.text);
        
        // Extract entities
        result.entities = await this.extractEntities(result.text);
      }

      // Cache result
      await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

      return result;
    } catch (error) {
      logger.error('Failed to extract text', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF
   */
  private static async extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const data = await pdfParse(buffer);
      
      return {
        text: data.text,
        confidence: 0.95, // PDFs typically have high confidence
        metadata: {
          pages: data.numpages,
          info: data.info,
        },
      };
    } catch (error) {
      logger.error('PDF extraction failed', error);
      // Fallback to OCR
      return this.extractWithTextract(buffer);
    }
  }

  /**
   * Extract text from image using Tesseract
   */
  private static async extractFromImage(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const worker = await Tesseract.createWorker();
      await worker.loadLanguage('eng+fra'); // English and French
      await worker.initialize('eng+fra');
      
      const { data } = await worker.recognize(buffer);
      
      await worker.terminate();

      return {
        text: data.text,
        confidence: data.confidence / 100,
        metadata: {
          words: data.words.length,
          lines: data.lines.length,
        },
      };
    } catch (error) {
      logger.error('Image OCR failed', error);
      // Fallback to AWS Textract
      return this.extractWithTextract(buffer);
    }
  }

  /**
   * Extract text from Word document
   */
  private static async extractFromWord(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      return {
        text: result.value,
        confidence: 0.95,
        metadata: {
          messages: result.messages,
        },
      };
    } catch (error) {
      logger.error('Word extraction failed', error);
      throw error;
    }
  }

  /**
   * Extract text from Excel
   */
  private static async extractFromExcel(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let fullText = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        fullText += `Sheet: ${sheetName}\n${csv}\n\n`;
      });

      return {
        text: fullText,
        confidence: 0.95,
        metadata: {
          sheets: workbook.SheetNames,
        },
      };
    } catch (error) {
      logger.error('Excel extraction failed', error);
      throw error;
    }
  }

  /**
   * Extract text using AWS Textract
   */
  private static async extractWithTextract(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: buffer,
        },
        FeatureTypes: ['TABLES', 'FORMS'],
      });

      const response = await this.textractClient.send(command);
      
      // Extract text from blocks
      let text = '';
      const tables: any[] = [];
      const forms: any[] = [];

      response.Blocks?.forEach(block => {
        if (block.BlockType === 'LINE' && block.Text) {
          text += block.Text + '\n';
        } else if (block.BlockType === 'TABLE') {
          tables.push(block);
        } else if (block.BlockType === 'KEY_VALUE_SET') {
          forms.push(block);
        }
      });

      return {
        text,
        confidence: 0.9,
        metadata: {
          tables: tables.length,
          forms: forms.length,
          blocks: response.Blocks?.length,
        },
      };
    } catch (error) {
      logger.error('Textract extraction failed', error);
      throw error;
    }
  }

  /**
   * Detect language in text
   */
  private static async detectLanguage(text: string): Promise<{
    language: string;
    confidence: number;
  }> {
    try {
      const command = new DetectDominantLanguageCommand({
        Text: text.substring(0, 5000), // Comprehend has text limit
      });

      const response = await this.comprehendClient.send(command);
      
      if (response.Languages && response.Languages.length > 0) {
        const dominant = response.Languages[0];
        return {
          language: dominant.LanguageCode || 'unknown',
          confidence: dominant.Score || 0,
        };
      }

      return { language: 'unknown', confidence: 0 };
    } catch (error) {
      logger.error('Language detection failed', error);
      return { language: 'unknown', confidence: 0 };
    }
  }

  /**
   * Detect Indigenous content in text
   */
  static async detectIndigenousContent(text: string): Promise<IndigenousContent> {
    const lowerText = text.toLowerCase();
    const result: IndigenousContent = {
      detected: false,
      culturalTerms: [],
      bandReferences: [],
      treatyReferences: [],
      confidence: 0,
    };

    // Indigenous language patterns
    const indigenousLanguages = {
      ojibwe: {
        patterns: [/\bmigwech\b/i, /\banishinaabe\b/i, /\bboozhoo\b/i, /\bgichi-?\s*manidoo\b/i],
        terms: ['migwech', 'anishinaabe', 'boozhoo', 'gichi-manidoo'],
      },
      cree: {
        patterns: [/\btansi\b/i, /\bkahkiyaw\b/i, /\bekosi\b/i, /\bmaskwacis\b/i],
        terms: ['tansi', 'kahkiyaw', 'ekosi', 'maskwacis'],
      },
      inuktitut: {
        patterns: [/\bᐃᓄᒃᑎᑐᑦ\b/, /\bqujannamiik\b/i, /\bᓄᓇᕗᑦ\b/],
        terms: ['qujannamiik', 'inuktitut', 'nunavut'],
      },
      mikmaq: {
        patterns: [/\bwela'lin\b/i, /\bkwe'\b/i, /\bmsit\b/i, /\bmi'kmaq\b/i],
        terms: ['wela\'lin', 'kwe\'', 'msit', 'mi\'kmaq'],
      },
      mohawk: {
        patterns: [/\bskennen\b/i, /\bnia:wen\b/i, /\bkanien'keha\b/i],
        terms: ['skennen', 'nia:wen', 'kanien\'keha'],
      },
    };

    // Check for Indigenous language patterns
    for (const [language, config] of Object.entries(indigenousLanguages)) {
      for (const pattern of config.patterns) {
        if (pattern.test(text)) {
          result.detected = true;
          result.language = language;
          result.culturalTerms.push(...config.terms.filter(term => 
            lowerText.includes(term.toLowerCase())
          ));
        }
      }
    }

    // Check for band references
    const bandPatterns = [
      /\b(first\s+nation|band|tribe|indigenous\s+community)\b/gi,
      /\b(band\s+council|tribal\s+council)\b/gi,
      /\b(reserve|reservation)\b/gi,
    ];

    for (const pattern of bandPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        result.bandReferences.push(...matches);
        result.detected = true;
      }
    }

    // Check for treaty references
    const treatyPatterns = [
      /\btreaty\s+\d+\b/gi,
      /\bnumbered\s+treat(y|ies)\b/gi,
      /\bmodern\s+treaty\b/gi,
      /\bland\s+claim\b/gi,
    ];

    for (const pattern of treatyPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        result.treatyReferences.push(...matches);
        result.detected = true;
      }
    }

    // Check for cultural terms
    const culturalTerms = [
      'elder', 'elders', 'traditional knowledge', 'ceremony', 'ceremonies',
      'sacred', 'medicine wheel', 'smudging', 'powwow', 'pow-wow',
      'traditional territory', 'ancestral', 'indigenous knowledge',
      'oral history', 'storytelling', 'teachings', 'seven generations',
    ];

    for (const term of culturalTerms) {
      if (lowerText.includes(term)) {
        result.culturalTerms.push(term);
        result.detected = true;
      }
    }

    // Calculate confidence based on findings
    if (result.detected) {
      const totalFindings = 
        result.culturalTerms.length + 
        result.bandReferences.length + 
        result.treatyReferences.length;
      
      result.confidence = Math.min(1, totalFindings * 0.1);
    }

    return result;
  }

  /**
   * Extract named entities from text
   */
  private static async extractEntities(text: string): Promise<Entity[]> {
    try {
      const command = new DetectEntitiesCommand({
        Text: text.substring(0, 5000),
        LanguageCode: 'en',
      });

      const response = await this.comprehendClient.send(command);
      
      if (response.Entities) {
        return response.Entities.map(entity => ({
          type: entity.Type || 'UNKNOWN',
          text: entity.Text || '',
          score: entity.Score || 0,
          beginOffset: entity.BeginOffset,
          endOffset: entity.EndOffset,
        }));
      }

      return [];
    } catch (error) {
      logger.error('Entity extraction failed', error);
      return [];
    }
  }

  /**
   * Translate text to target language
   */
  static async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'auto'
  ): Promise<{
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
  }> {
    try {
      const command = new TranslateTextCommand({
        Text: text.substring(0, 5000), // AWS Translate limit
        SourceLanguageCode: sourceLanguage,
        TargetLanguageCode: targetLanguage,
      });

      const response = await this.translateClient.send(command);

      return {
        translatedText: response.TranslatedText || '',
        sourceLanguage: response.SourceLanguageCode || 'unknown',
        targetLanguage: response.TargetLanguageCode || targetLanguage,
      };
    } catch (error) {
      logger.error('Translation failed', error);
      throw error;
    }
  }

  /**
   * Extract and translate Indigenous content
   */
  static async processIndigenousDocument(
    fileBuffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<{
    originalText: string;
    indigenousContent: IndigenousContent;
    translations?: Record<string, string>;
    culturalContext?: string[];
  }> {
    try {
      // Extract text
      const extraction = await this.extractText(fileBuffer, mimeType, filename);
      
      // Detect Indigenous content
      const indigenousContent = extraction.indigenousContent || 
        await this.detectIndigenousContent(extraction.text);

      const result: any = {
        originalText: extraction.text,
        indigenousContent,
      };

      // If Indigenous content detected, provide translations
      if (indigenousContent.detected && indigenousContent.culturalTerms.length > 0) {
        result.translations = {};
        
        // Translate cultural terms to English if needed
        for (const term of indigenousContent.culturalTerms) {
          if (indigenousContent.language && indigenousContent.language !== 'en') {
            try {
              const translation = await this.translateText(term, 'en');
              result.translations[term] = translation.translatedText;
            } catch (error) {
              logger.error(`Failed to translate term: ${term}`, error);
            }
          }
        }

        // Add cultural context
        result.culturalContext = await this.getCulturalContext(indigenousContent);
      }

      return result;
    } catch (error) {
      logger.error('Failed to process Indigenous document', error);
      throw error;
    }
  }

  /**
   * Get cultural context for Indigenous terms
   */
  private static async getCulturalContext(
    indigenousContent: IndigenousContent
  ): Promise<string[]> {
    const context: string[] = [];

    // Add context based on detected language
    if (indigenousContent.language) {
      const languageContexts: Record<string, string[]> = {
        ojibwe: [
          'Ojibwe is an Algonquian language spoken by the Anishinaabe peoples',
          'Traditional Ojibwe territory spans from Ontario to Saskatchewan',
        ],
        cree: [
          'Cree is the most widely spoken Indigenous language in Canada',
          'Cree nations extend from Alberta to Quebec',
        ],
        inuktitut: [
          'Inuktitut is an Inuit language spoken in the Canadian Arctic',
          'Written in syllabics or Roman orthography',
        ],
        mikmaq: [
          'Mi\'kmaq is spoken in Atlantic Canada',
          'Part of the Wabanaki Confederacy',
        ],
        mohawk: [
          'Mohawk (Kanien\'kéha) is an Iroquoian language',
          'Part of the Haudenosaunee (Six Nations) Confederacy',
        ],
      };

      if (languageContexts[indigenousContent.language]) {
        context.push(...languageContexts[indigenousContent.language]);
      }
    }

    // Add context for treaty references
    if (indigenousContent.treatyReferences.length > 0) {
      context.push('Document references historical or modern treaties with Indigenous peoples');
    }

    return context;
  }
}

export default OCRExtractionService;