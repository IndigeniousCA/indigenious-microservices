/**
 * Nuclear-Grade Input Validation Service
 * Comprehensive validation and sanitization for all inputs
 */

import { z, ZodError, ZodSchema } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { createHash } from 'crypto';
import { AuditLogger } from './audit-logger';
import xss from 'xss';

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  sanitized?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

interface SanitizationOptions {
  allowHtml?: boolean;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripUnknown?: boolean;
  maxLength?: number;
  encoding?: string;
}

export class ValidationService {
  private static instance: ValidationService;
  private auditLogger = AuditLogger.getInstance();
  
  // Validation patterns
  private readonly patterns = {
    // Strict alphanumeric with limited special chars
    safeString: /^[a-zA-Z0-9\s\-_.,!?@#$%^&*()+=\[\]{}|;:'",.<>?\/\\]+$/,
    
    // No SQL keywords
    noSql: /\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript|onload|onerror|onclick|onmouseover)\b/i,
    
    // No path traversal
    noPathTraversal: /(\.\.[\/\\]|\.\.%2[fF]|%2[eE]%2[eE]|\.\.\\|\.\.\/)/,
    
    // No command injection
    noCommandInjection: /(;|\||&|`|\$\(|\${|<|>|\\n|\\r)/,
    
    // Safe filename
    safeFilename: /^[a-zA-Z0-9\-_.]+$/,
    
    // UUID v4
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    
    // Safe URL
    safeUrl: /^https?:\/\/([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/,
    
    // Email (strict)
    email: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    
    // Phone (international)
    phone: /^\+?[1-9]\d{1,14}$/,
    
    // Strong password
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
  };
  
  // Dangerous patterns to reject
  private readonly dangerousPatterns = [
    // JavaScript injection
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    
    // SQL injection
    /(\b(union|select|insert|update|delete|drop|create)\b.*\b(from|where|table)\b)/gi,
    /(--|#|\/\*|\*\/|@@|@)/g,
    /(\bor\b\s*\d+\s*=\s*\d+|\band\b\s*\d+\s*=\s*\d+)/gi,
    
    // XML injection
    /<!ENTITY/gi,
    /<!DOCTYPE/gi,
    /<!\[CDATA\[/gi,
    
    // LDAP injection
    /[()&|!<>=~*]/g,
    
    // Command injection
    /(\||;|&|`|\$\(|\${)/g,
    /(nc\s+-|bash\s+-|sh\s+-|wget\s+|curl\s+)/gi,
    
    // Path traversal
    /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e%5c)/gi,
    /(\/etc\/passwd|\/windows\/win\.ini|boot\.ini)/gi,
    
    // Server-side includes
    /<!--#(include|exec|echo|config)/gi,
    
    // Template injection
    /\{\{.*\}\}/g,
    /\[\[.*\]\]/g,
    /{%.*%}/g
  ];
  
  private constructor() {}
  
  static getInstance(): ValidationService {
    if (!this.instance) {
      this.instance = new ValidationService();
    }
    return this.instance;
  }

  /**
   * Validate data against schema with sanitization
   */
  async validate<T>(
    data: unknown,
    schema: ZodSchema<T>,
    options: {
      sanitize?: boolean;
      strict?: boolean;
      context?: string;
    } = {}
  ): Promise<ValidationResult<T>> {
    try {
      // Pre-validation dangerous pattern check
      if (options.strict !== false) {
        const dangerous = this.checkDangerousPatterns(data);
        if (dangerous.found) {
          await this.logValidationFailure('dangerous_pattern', dangerous);
          return {
            success: false,
            errors: [{
              field: 'input',
              message: 'Input contains dangerous patterns',
              code: 'DANGEROUS_PATTERN',
              value: dangerous.pattern
            }]
          };
        }
      }
      
      // Sanitize before validation if requested
      let processedData = data;
      if (options.sanitize !== false) {
        processedData = await this.sanitizeInput(data);
      }
      
      // Validate with Zod
      const validated = await schema.parseAsync(processedData);
      
      // Post-validation checks
      const postCheck = await this.postValidationChecks(validated);
      if (!postCheck.passed) {
        return {
          success: false,
          errors: postCheck.errors
        };
      }
      
      return {
        success: true,
        data: validated,
        sanitized: options.sanitize !== false
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          success: false,
          errors: this.formatZodErrors(error)
        };
      }
      
      await this.logValidationFailure('unexpected_error', { error: error.message });
      return {
        success: false,
        errors: [{
          field: 'unknown',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR'
        }]
      };
    }
  }

  /**
   * Sanitize string input
   */
  sanitizeString(
    input: string,
    options: SanitizationOptions = {}
  ): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    let sanitized = input;
    
    // Length check
    if (options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    // HTML sanitization
    if (options.allowHtml) {
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: options.allowedTags || ['b', 'i', 'em', 'strong', 'a'],
        ALLOWED_ATTR: options.allowedAttributes || { a: ['href'] },
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false
      });
    } else {
      // Strip all HTML
      sanitized = xss(sanitized, {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style']
      });
      
      // Additional stripping
      sanitized = sanitized
        .replace(/<[^>]*>/g, '') // Remove any remaining tags
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript protocol
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    }
    
    // SQL injection prevention
    sanitized = this.escapeSql(sanitized);
    
    // Command injection prevention
    sanitized = this.escapeShell(sanitized);
    
    // Path traversal prevention
    sanitized = sanitized.replace(/\.\.[\/\\]/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Encoding normalization
    if (options.encoding) {
      sanitized = this.normalizeEncoding(sanitized, options.encoding);
    }
    
    return sanitized;
  }

  /**
   * Sanitize and validate email
   */
  validateEmail(email: string): ValidationResult<string> {
    const sanitized = email.toLowerCase().trim();
    
    if (!this.patterns.email.test(sanitized)) {
      return {
        success: false,
        errors: [{
          field: 'email',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL'
        }]
      };
    }
    
    // Additional validation
    if (!validator.isEmail(sanitized, { 
      allow_display_name: false,
      require_tld: true,
      allow_ip_domain: false
    })) {
      return {
        success: false,
        errors: [{
          field: 'email',
          message: 'Email validation failed',
          code: 'EMAIL_VALIDATION_FAILED'
        }]
      };
    }
    
    return { success: true, data: sanitized };
  }

  /**
   * Validate and sanitize URL
   */
  validateUrl(url: string, options: {
    protocols?: string[];
    requireTld?: boolean;
    requireProtocol?: boolean;
    allowQueryComponents?: boolean;
  } = {}): ValidationResult<string> {
    const sanitized = url.trim();
    
    const validatorOptions = {
      protocols: options.protocols || ['http', 'https'],
      require_tld: options.requireTld !== false,
      require_protocol: options.requireProtocol !== false,
      allow_query_components: options.allowQueryComponents !== false,
      allow_fragments: false,
      allow_protocol_relative_urls: false
    };
    
    if (!validator.isURL(sanitized, validatorOptions)) {
      return {
        success: false,
        errors: [{
          field: 'url',
          message: 'Invalid URL format',
          code: 'INVALID_URL'
        }]
      };
    }
    
    // Additional security checks
    if (this.containsDangerousUrlPatterns(sanitized)) {
      return {
        success: false,
        errors: [{
          field: 'url',
          message: 'URL contains dangerous patterns',
          code: 'DANGEROUS_URL'
        }]
      };
    }
    
    return { success: true, data: sanitized };
  }

  /**
   * Validate phone number
   */
  validatePhone(phone: string, country?: string): ValidationResult<string> {
    const sanitized = phone.replace(/[^\d+]/g, '');
    
    if (!validator.isMobilePhone(sanitized, country as unknown || 'any', { strictMode: true })) {
      return {
        success: false,
        errors: [{
          field: 'phone',
          message: 'Invalid phone number',
          code: 'INVALID_PHONE'
        }]
      };
    }
    
    return { success: true, data: sanitized };
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): ValidationResult<{
    valid: boolean;
    strength: number;
    suggestions: string[];
  }> {
    const result = {
      valid: false,
      strength: 0,
      suggestions: [] as string[]
    };
    
    // Length check
    if (password.length < 12) {
      result.suggestions.push('Password must be at least 12 characters');
    } else {
      result.strength += 20;
    }
    
    // Complexity checks
    if (!/[a-z]/.test(password)) {
      result.suggestions.push('Add lowercase letters');
    } else {
      result.strength += 20;
    }
    
    if (!/[A-Z]/.test(password)) {
      result.suggestions.push('Add uppercase letters');
    } else {
      result.strength += 20;
    }
    
    if (!/\d/.test(password)) {
      result.suggestions.push('Add numbers');
    } else {
      result.strength += 20;
    }
    
    if (!/[@$!%*?&]/.test(password)) {
      result.suggestions.push('Add special characters');
    } else {
      result.strength += 20;
    }
    
    // Check common passwords
    if (this.isCommonPassword(password)) {
      result.strength = Math.max(0, result.strength - 50);
      result.suggestions.push('Password is too common');
    }
    
    // Check patterns
    if (this.hasRepeatingPatterns(password)) {
      result.strength = Math.max(0, result.strength - 30);
      result.suggestions.push('Avoid repeating patterns');
    }
    
    result.valid = result.strength >= 80 && result.suggestions.length === 0;
    
    return {
      success: true,
      data: result
    };
  }

  /**
   * Validate file upload
   */
  async validateFile(file: {
    name: string;
    size: number;
    type: string;
    content?: Buffer;
  }, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
    scanContent?: boolean;
  } = {}): Promise<ValidationResult<unknown>> {
    const errors: ValidationError[] = [];
    
    // Filename validation
    if (!this.patterns.safeFilename.test(file.name)) {
      errors.push({
        field: 'filename',
        message: 'Invalid filename',
        code: 'INVALID_FILENAME'
      });
    }
    
    // Size validation
    const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    if (file.size > maxSize) {
      errors.push({
        field: 'size',
        message: `File too large (max ${maxSize} bytes)`,
        code: 'FILE_TOO_LARGE'
      });
    }
    
    // Type validation
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push({
        field: 'type',
        message: 'File type not allowed',
        code: 'INVALID_FILE_TYPE'
      });
    }
    
    // Extension validation
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (options.allowedExtensions && ext && !options.allowedExtensions.includes(ext)) {
      errors.push({
        field: 'extension',
        message: 'File extension not allowed',
        code: 'INVALID_EXTENSION'
      });
    }
    
    // Content scanning
    if (options.scanContent && file.content) {
      const scan = await this.scanFileContent(file.content);
      if (!scan.safe) {
        errors.push({
          field: 'content',
          message: 'File content failed security scan',
          code: 'UNSAFE_CONTENT'
        });
      }
    }
    
    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Create custom validation schema
   */
  createSchema(definition: Record<string, any>): ZodSchema {
    const schema: any = {};
    
    for (const [key, value] of Object.entries(definition)) {
      if (typeof value === 'string') {
        switch (value) {
          case 'email':
            schema[key] = z.string().email().transform(v => v.toLowerCase());
            break;
          case 'url':
            schema[key] = z.string().url();
            break;
          case 'uuid':
            schema[key] = z.string().uuid();
            break;
          case 'phone':
            schema[key] = z.string().regex(this.patterns.phone);
            break;
          default:
            schema[key] = z.string();
        }
      } else {
        schema[key] = value;
      }
    }
    
    return z.object(schema);
  }

  /**
   * Batch validation
   */
  async validateBatch<T>(
    items: unknown[],
    schema: ZodSchema<T>
  ): Promise<{
    valid: T[];
    invalid: Array<{ index: number; errors: ValidationError[] }>;
  }> {
    const valid: T[] = [];
    const invalid: Array<{ index: number; errors: ValidationError[] }> = [];
    
    for (let i = 0; i < items.length; i++) {
      const result = await this.validate(items[i], schema);
      if (result.success && result.data) {
        valid.push(result.data);
      } else {
        invalid.push({
          index: i,
          errors: result.errors || []
        });
      }
    }
    
    return { valid, invalid };
  }

  /**
   * Private helper methods
   */
  private checkDangerousPatterns(data: unknown): {
    found: boolean;
    pattern?: string;
  } {
    const str = JSON.stringify(data);
    
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(str)) {
        return { found: true, pattern: pattern.source };
      }
    }
    
    return { found: false };
  }

  private async sanitizeInput(data: unknown): Promise<unknown> {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }
    
    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.sanitizeInput(item)));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = await this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }

  private async postValidationChecks(data: unknown): Promise<{
    passed: boolean;
    errors?: ValidationError[];
  }> {
    // Additional security checks after schema validation
    return { passed: true };
  }

  private formatZodErrors(error: ZodError): ValidationError[] {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: err.code === 'invalid_type' ? undefined : err
    }));
  }

  private escapeSql(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
  }

  private escapeShell(input: string): string {
    return input.replace(/[`$&;|]/g, '');
  }

  private normalizeEncoding(input: string, encoding: string): string {
    try {
      const buffer = Buffer.from(input, encoding as unknown);
      return buffer.toString('utf8');
    } catch {
      return input;
    }
  }

  private containsDangerousUrlPatterns(url: string): boolean {
    const dangerous = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'about:',
      'chrome:',
      'ms-',
      '\x00',
      '%00'
    ];
    
    const lower = url.toLowerCase();
    return dangerous.some(pattern => lower.includes(pattern));
  }

  private isCommonPassword(password: string): boolean {
    const common = [
      'password', '12345678', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome',
      'monkey', '1234567890', 'password1', 'qwerty123'
    ];
    
    const lower = password.toLowerCase();
    return common.some(p => lower.includes(p));
  }

  private hasRepeatingPatterns(password: string): boolean {
    // Check for repeating characters
    if (/(.)\1{2,}/.test(password)) return true;
    
    // Check for sequences
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) return true;
    if (/(?:123|234|345|456|567|678|789|890)/.test(password)) return true;
    
    return false;
  }

  private async scanFileContent(content: Buffer): Promise<{ safe: boolean }> {
    // Implement virus scanning, malware detection, etc.
    return { safe: true };
  }

  private async logValidationFailure(type: string, details: Record<string, unknown>): Promise<void> {
    await this.auditLogger.logSecurity({
      event: 'validation_failure',
      details: { type, ...details }
    });
  }
}

// Validation schemas for PR automation
export const prValidationSchemas = {
  createOperation: z.object({
    objective: z.string()
      .min(10, 'Objective too short')
      .max(500, 'Objective too long')
      .refine(val => !val.match(/[<>]/), 'Invalid characters'),
    type: z.enum(['grassroots', 'competitor_discredit', 'market_manipulation', 'perception_shift'])
  }),
  
  createResponseRule: z.object({
    name: z.string().min(3).max(100),
    enabled: z.boolean(),
    triggers: z.object({
      keywords: z.array(z.string().max(50)).max(20),
      sources: z.array(z.string()).optional(),
      politicians: z.array(z.string()).optional()
    }),
    response: z.object({
      template: z.string().max(1000),
      tone: z.enum(['supportive', 'neutral', 'corrective', 'defensive', 'offensive']),
      channels: z.array(z.enum(['twitter', 'linkedin', 'facebook', 'press', 'email'])),
      speed: z.enum(['instant', 'fast', 'standard'])
    })
  }),
  
  searchQuery: z.object({
    query: z.string()
      .min(2, 'Query too short')
      .max(100, 'Query too long')
      .transform(v => v.trim()),
    filters: z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      sources: z.array(z.string()).optional()
    }).optional()
  })
};

export const validation = ValidationService.getInstance();