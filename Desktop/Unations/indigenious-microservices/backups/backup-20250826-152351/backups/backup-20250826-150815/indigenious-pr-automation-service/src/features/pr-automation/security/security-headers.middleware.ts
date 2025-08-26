/**
 * Nuclear-Grade Security Headers Middleware
 * Implements comprehensive security headers for maximum protection
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import crypto from 'crypto';
import { AuditLogger } from './audit-logger';

interface SecurityHeadersConfig {
  csp?: {
    directives?: Record<string, string[]>;
    reportUri?: string;
    reportOnly?: boolean;
  };
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
  referrerPolicy?: string;
  permissionsPolicy?: Record<string, string[]>;
  customHeaders?: Record<string, string>;
  nonce?: boolean;
}

export class SecurityHeadersMiddleware {
  private static instance: SecurityHeadersMiddleware;
  private auditLogger = AuditLogger.getInstance();
  
  // Strict CSP directives
  private readonly strictCSP = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'strict-dynamic'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Needed for glassmorphism
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "wss:", "https:"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    sandbox: ["allow-forms", "allow-same-origin", "allow-scripts"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
    blockAllMixedContent: []
  };
  
  // Feature policies
  private readonly strictPermissions = {
    accelerometer: [],
    ambientLightSensor: [],
    autoplay: [],
    battery: [],
    camera: [],
    displayCapture: [],
    documentDomain: [],
    encryptedMedia: [],
    executionWhileNotRendered: [],
    executionWhileOutOfViewport: [],
    fullscreen: ["'self'"],
    geolocation: [],
    gyroscope: [],
    layoutAnimations: ["'self'"],
    legacyImageFormats: [],
    magnetometer: [],
    microphone: [],
    midi: [],
    navigationOverride: [],
    oversizedImages: ["'none'"],
    payment: [],
    pictureInPicture: [],
    publickeyCredentials: ["'self'"],
    syncXhr: [],
    usb: [],
    vr: [],
    wakeLock: [],
    screenWakeLock: [],
    webShare: [],
    xrSpatialTracking: []
  };
  
  private constructor() {}
  
  static getInstance(): SecurityHeadersMiddleware {
    if (!this.instance) {
      this.instance = new SecurityHeadersMiddleware();
    }
    return this.instance;
  }

  /**
   * Apply comprehensive security headers
   */
  apply(config: SecurityHeadersConfig = {}): (req: Request, res: Response, next: NextFunction) => void {
    // Configure helmet with strict settings
    const helmetConfig = helmet({
      contentSecurityPolicy: this.configureCSP(config.csp),
      hsts: this.configureHSTS(config.hsts),
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: config.referrerPolicy || 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      hidePoweredBy: true,
      ieNoOpen: true,
      originAgentCluster: true,
      dnsPrefetchControl: { allow: false },
      expectCt: {
        enforce: true,
        maxAge: 86400,
        reportUri: config.csp?.reportUri
      },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: { policy: 'require-corp' }
    });
    
    return (req: Request, res: Response, next: NextFunction) => {
      // Apply helmet
      helmetConfig(req, res, () => {
        // Add nonce if requested
        if (config.nonce) {
          this.addNonce(req, res);
        }
        
        // Add permissions policy
        this.addPermissionsPolicy(res, config.permissionsPolicy);
        
        // Add custom security headers
        this.addCustomHeaders(res, config.customHeaders);
        
        // Add additional security headers
        this.addAdditionalSecurityHeaders(res);
        
        // Add PR-specific headers
        this.addPRSecurityHeaders(res);
        
        // Log security headers application
        this.logSecurityHeaders(req);
        
        next();
      });
    };
  }

  /**
   * CORS configuration for API
   */
  cors(options: {
    origins?: string[];
    credentials?: boolean;
    maxAge?: number;
  } = {}): (req: Request, res: Response, next: NextFunction) => void {
    const allowedOrigins = options.origins || [process.env.FRONTEND_URL || 'https://indigenious.ca'];
    
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      
      // Check if origin is allowed
      if (origin && this.isOriginAllowed(origin, allowedOrigins)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      
      // Set other CORS headers
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Request-ID');
      res.setHeader('Access-Control-Max-Age', String(options.maxAge || 86400));
      res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining');
      
      if (options.credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      
      // Handle preflight
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      
      next();
    };
  }

  /**
   * API-specific security headers
   */
  api(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // API-specific headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      res.setHeader('X-Download-Options', 'noopen');
      res.setHeader('X-DNS-Prefetch-Control', 'off');
      
      // API versioning
      res.setHeader('X-API-Version', process.env.API_VERSION || '1.0');
      
      // Request ID for tracing
      const requestId = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('X-Request-ID', requestId);
      (req as unknown).requestId = requestId;
      
      // Timestamp
      res.setHeader('X-Timestamp', new Date().toISOString());
      
      next();
    };
  }

  /**
   * Configure CSP with nonce support
   */
  private configureCSP(config?: SecurityHeadersConfig['csp']): any {
    if (config === undefined) {
      return {
        directives: this.strictCSP,
        reportUri: config?.reportUri,
        reportOnly: false
      };
    }
    
    const directives = config.directives || this.strictCSP;
    
    return {
      directives,
      reportUri: config.reportUri,
      reportOnly: config.reportOnly || false,
      // Use function to generate nonce per request
      scriptSrc: (req: Request, res: Response) => {
        const nonce = (res as unknown).locals.nonce;
        if (nonce) {
          return ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
        }
        return directives.scriptSrc || ["'self'"];
      }
    };
  }

  /**
   * Configure HSTS with preload
   */
  private configureHSTS(config?: SecurityHeadersConfig['hsts']): any {
    return {
      maxAge: config?.maxAge || 31536000, // 1 year
      includeSubDomains: config?.includeSubDomains !== false,
      preload: config?.preload !== false
    };
  }

  /**
   * Add CSP nonce
   */
  private addNonce(req: Request, res: Response): void {
    const nonce = crypto.randomBytes(16).toString('base64');
    (res as unknown).locals.nonce = nonce;
    
    // Make nonce available to templates
    (res as unknown).locals.cspNonce = nonce;
  }

  /**
   * Add Permissions Policy
   */
  private addPermissionsPolicy(res: Response, customPermissions?: Record<string, string[]>): void {
    const permissions = { ...this.strictPermissions, ...customPermissions };
    
    const policy = Object.entries(permissions)
      .map(([feature, allowList]) => {
        if (allowList.length === 0) {
          return `${this.kebabCase(feature)}=()`;
        }
        return `${this.kebabCase(feature)}=(${allowList.join(' ')})`;
      })
      .join(', ');
    
    res.setHeader('Permissions-Policy', policy);
  }

  /**
   * Add custom security headers
   */
  private addCustomHeaders(res: Response, headers?: Record<string, string>): void {
    if (!headers) return;
    
    Object.entries(headers).forEach(([name, value]) => {
      // Validate header name
      if (this.isValidHeaderName(name)) {
        res.setHeader(name, value);
      }
    });
  }

  /**
   * Add additional security headers
   */
  private addAdditionalSecurityHeaders(res: Response): void {
    // Public Key Pinning (backup)
    res.setHeader('Public-Key-Pins-Report-Only', 
      'pin-sha256="base64=="; max-age=5184000; report-uri="/pkp-report"'
    );
    
    // Feature detection
    res.setHeader('Critical-CH', 'DPR, Viewport-Width, Width');
    res.setHeader('Accept-CH', 'DPR, Viewport-Width, Width, Downlink, Save-Data');
    
    // Cache control for security
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Additional security
    res.setHeader('X-Robots-Tag', 'none');
    res.setHeader('X-UA-Compatible', 'IE=edge');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  }

  /**
   * Add PR-specific security headers
   */
  private addPRSecurityHeaders(res: Response): void {
    // PR operation indicators
    res.setHeader('X-PR-Protection', 'enabled');
    res.setHeader('X-Content-Security', 'strict');
    res.setHeader('X-Operation-Mode', process.env.PR_MODE || 'standard');
    
    // Anti-automation detection
    res.setHeader('X-Automation-Defense', 'active');
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
    // Exact match
    if (allowedOrigins.includes(origin)) {
      return true;
    }
    
    // Wildcard subdomain match
    for (const allowed of allowedOrigins) {
      if (allowed.startsWith('*.')) {
        const domain = allowed.substring(2);
        if (origin.endsWith(domain)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Validate header name
   */
  private isValidHeaderName(name: string): boolean {
    // Prevent header injection
    return /^[a-zA-Z0-9\-]+$/.test(name) && !name.includes('\n') && !name.includes('\r');
  }

  /**
   * Convert camelCase to kebab-case
   */
  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Log security headers application
   */
  private async logSecurityHeaders(req: Request): Promise<void> {
    // Log only for sensitive endpoints
    if (req.path.includes('/api/pr/') || req.path.includes('/api/auth/')) {
      await this.auditLogger.logSecurity({
        event: 'security_headers_applied',
        details: {
          path: req.path,
          method: req.method,
          ip: req.ip
        }
      });
    }
  }
}

// Export instances
export const securityHeaders = SecurityHeadersMiddleware.getInstance();

// Pre-configured middleware
export const nuclearSecurityHeaders = securityHeaders.apply({
  nonce: true,
  csp: {
    reportUri: '/api/security/csp-report'
  }
});

export const apiSecurityHeaders = [
  securityHeaders.api(),
  securityHeaders.cors({
    credentials: true,
    maxAge: 86400
  })
];