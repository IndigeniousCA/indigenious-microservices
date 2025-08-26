import { logger } from '@/lib/monitoring/logger';

// Security check to ensure PR automation is explicitly enabled
export function isPRAutomationEnabled(): boolean {
  const enabled = process.env.PR_AUTOMATION_ENABLED === 'true';
  const securityOverride = process.env.PR_AUTOMATION_SECURITY_OVERRIDE === 'true';
  
  if (!enabled) {
    logger.warn('PR Automation is DISABLED. Set PR_AUTOMATION_ENABLED=true to enable.');
    return false;
  }
  
  // Additional security checks
  const requiredEnvVars = [
    'PR_ENCRYPTION_KEY',
    'JWT_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ];
  
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0 && !securityOverride) {
    logger.error('PR Automation BLOCKED - Missing required environment variables:', missingVars);
    return false;
  }
  
  // Check if running in production without proper setup
  if (process.env.NODE_ENV === 'production' && !process.env.PR_PRODUCTION_READY) {
    logger.error('PR Automation BLOCKED - Not marked as production ready');
    return false;
  }
  
  logger.info('PR Automation security checks PASSED - System enabled');
  return true;
}

// Initialize PR automation only if enabled
export async function initializePRAutomation(): Promise<boolean> {
  if (!isPRAutomationEnabled()) {
    return false;
  }
  
  try {
    // Run security self-test
    const { encryptionService } = await import('../services/encryption');
    const testData = 'security-test';
    const encrypted = encryptionService.encrypt(testData);
    const decrypted = encryptionService.decrypt(encrypted.encrypted, encrypted.iv, encrypted.tag);
    
    if (decrypted !== testData) {
      throw new Error('Encryption self-test failed');
    }
    
    logger.info('PR Automation initialized successfully with security features');
    return true;
  } catch (error) {
    logger.error('Failed to initialize PR Automation:', error);
    return false;
  }
}

// Export security status
export const PR_AUTOMATION_STATUS = {
  enabled: isPRAutomationEnabled(),
  securityFeatures: {
    authentication: true,
    authorization: true,
    encryption: true,
    rateLimiting: true,
    auditLogging: true,
    inputValidation: true,
    csrfProtection: true,
    securityHeaders: true
  },
  warnings: [
    'This system contains powerful PR automation features',
    'Ensure proper legal review before enabling strategic operations',
    'Monitor audit logs regularly for suspicious activity',
    'Limit access to authorized PR personnel only'
  ]
};