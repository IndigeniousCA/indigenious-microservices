/**
 * Nuclear-Grade Security Configuration
 * Production-ready security settings for PR automation
 */

import crypto from 'crypto';

import { logger } from '@/lib/monitoring/logger';
export const securityConfig = {
  // Environment checks
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // JWT Configuration
  jwt: {
    algorithm: 'RS256' as const,
    expiresIn: '15m',
    refreshExpiresIn: '7d',
    issuer: 'indigenious-pr',
    audience: 'indigenious-platform',
    // Keys should be loaded from secure storage in production
    privateKey: process.env.JWT_PRIVATE_KEY || generateDevKey('private'),
    publicKey: process.env.JWT_PUBLIC_KEY || generateDevKey('public')
  },
  
  // Encryption Configuration
  encryption: {
    masterKey: process.env.MASTER_ENCRYPTION_KEY || generateDevKey('master'),
    algorithm: 'aes-256-gcm',
    keyRotationDays: 7,
    keyDerivationIterations: 310000,
    saltLength: 32
  },
  
  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || generateDevKey('session'),
    name: 'indigenous.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: true, // Always use HTTPS
      httpOnly: true,
      sameSite: 'strict' as const,
      maxAge: 1800000, // 30 minutes
      domain: process.env.COOKIE_DOMAIN || '.indigenious.ca'
    }
  },
  
  // Rate Limiting Configuration
  rateLimiting: {
    // Global limits
    global: {
      windowMs: 60000, // 1 minute
      max: 100,
      message: 'Too many requests from this IP'
    },
    
    // Auth endpoints
    auth: {
      login: {
        windowMs: 900000, // 15 minutes
        max: 5,
        skipSuccessfulRequests: true
      },
      register: {
        windowMs: 3600000, // 1 hour
        max: 3
      },
      passwordReset: {
        windowMs: 3600000, // 1 hour
        max: 3
      }
    },
    
    // PR operations
    pr: {
      createOperation: {
        windowMs: 3600000, // 1 hour
        max: 5
      },
      executeOperation: {
        windowMs: 86400000, // 24 hours
        max: 10
      },
      contentGeneration: {
        windowMs: 3600000, // 1 hour
        max: 50
      },
      bulkOperations: {
        windowMs: 86400000, // 24 hours
        max: 10
      }
    }
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'https://indigenious.ca',
      'https://www.indigenious.ca',
      'https://app.indigenious.ca'
    ],
    credentials: true,
    maxAge: 86400,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID',
      'X-Device-Fingerprint'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-New-Token'
    ]
  },
  
  // CSP Configuration
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For glassmorphism
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss://indigenious.ca", "https://api.indigenious.ca"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      sandbox: ["allow-forms", "allow-same-origin", "allow-scripts"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    },
    reportUri: '/api/security/csp-report'
  },
  
  // Security Headers
  headers: {
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      accelerometer: [],
      gyroscope: []
    }
  },
  
  // File Upload Security
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    allowedExtensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx'
    ],
    scanForViruses: true,
    quarantinePath: '/var/quarantine/uploads'
  },
  
  // Audit Configuration
  audit: {
    retentionDays: 2555, // 7 years
    criticalRetentionDays: 3650, // 10 years
    logPath: '/var/log/indigenious/audit',
    securityLogPath: '/var/log/indigenious/security',
    forensicLogPath: '/var/log/indigenious/forensic',
    realTimeAlerts: true,
    alertChannels: ['email', 'slack', 'pagerduty']
  },
  
  // MFA Configuration
  mfa: {
    required: true,
    requiredForRoles: ['admin', 'pr_operator', 'finance'],
    totpWindow: 2,
    backupCodes: 10,
    rememberDeviceDays: 30
  },
  
  // IP Security
  ipSecurity: {
    enableGeoBlocking: true,
    blockedCountries: [], // Add country codes as needed
    allowedCountries: ['CA', 'US'], // Canada and US only
    enableIPWhitelist: false,
    whitelist: process.env.IP_WHITELIST?.split(',') || [],
    enableIPBlacklist: true,
    checkAbuseIPDB: true,
    checkThreatFeeds: true
  },
  
  // DDoS Protection
  ddos: {
    burst: 100,
    rate: 50,
    maxEventLoopDelay: 100,
    checkInterval: 1000,
    cloudflareEnabled: true
  },
  
  // Database Security
  database: {
    encryptAtRest: true,
    encryptInTransit: true,
    backupEncryption: true,
    auditQueries: true,
    slowQueryThreshold: 1000, // ms
    connectionLimit: 100,
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DB_CA_CERT,
      cert: process.env.DB_CLIENT_CERT,
      key: process.env.DB_CLIENT_KEY
    }
  },
  
  // PR Operation Specific Security
  prOperations: {
    requireMfaForSensitive: true,
    requireApprovalForCritical: true,
    approvalTimeout: 300000, // 5 minutes
    maxOperationsPerDay: 50,
    maxContentPerDay: 1000,
    enableEmergencyShutdown: true,
    monitoringLevel: 'high',
    anomalyDetection: true
  },
  
  // Security Monitoring
  monitoring: {
    enableRealTimeMonitoring: true,
    anomalyThreshold: 0.7,
    alertThreshold: 0.8,
    scanInterval: 60000, // 1 minute
    retentionDays: 90,
    dashboardUrl: 'https://security.indigenious.ca',
    integrateWithSIEM: true,
    siemEndpoint: process.env.SIEM_ENDPOINT
  },
  
  // Compliance
  compliance: {
    gdpr: true,
    pipeda: true,
    dataRetentionDays: 365,
    rightToDelete: true,
    dataPortability: true,
    consentRequired: true,
    ageVerification: true,
    minimumAge: 16
  }
};

/**
 * Generate development keys (NOT FOR PRODUCTION)
 */
function generateDevKey(type: string): string {
  logger.warn(`⚠️  Generating development ${type} key - NOT FOR PRODUCTION`);
  
  if (type === 'private' || type === 'public') {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return type === 'private' ? privateKey : publicKey;
  }
  
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(): void {
  const required = [
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'MASTER_ENCRYPTION_KEY',
    'SESSION_SECRET',
    'AUDIT_SIGNING_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && securityConfig.isProduction) {
    throw new Error(`Missing required security configuration: ${missing.join(', ')}`);
  }
  
  // Validate key formats
  if (process.env.JWT_PRIVATE_KEY && !process.env.JWT_PRIVATE_KEY.includes('BEGIN RSA PRIVATE KEY')) {
    throw new Error('Invalid JWT private key format');
  }
  
  if (process.env.JWT_PUBLIC_KEY && !process.env.JWT_PUBLIC_KEY.includes('BEGIN PUBLIC KEY')) {
    throw new Error('Invalid JWT public key format');
  }
  
  if (process.env.MASTER_ENCRYPTION_KEY && Buffer.from(process.env.MASTER_ENCRYPTION_KEY, 'base64').length !== 32) {
    throw new Error('Master encryption key must be 32 bytes (base64 encoded)');
  }
}

/**
 * Get environment-specific configuration
 */
export function getSecurityConfig(env: 'development' | 'staging' | 'production' = 'production') {
  const baseConfig = { ...securityConfig };
  
  if (env === 'development') {
    // Relax some settings for development
    baseConfig.session.cookie.secure = false;
    baseConfig.ipSecurity.enableGeoBlocking = false;
    baseConfig.mfa.required = false;
    baseConfig.prOperations.requireMfaForSensitive = false;
  }
  
  if (env === 'staging') {
    // Staging should mirror production but with different endpoints
    baseConfig.cors.origin.push('https://staging.indigenious.ca');
  }
  
  return baseConfig;
}

export default securityConfig;