# Business Hunter Swarm - Security Implementation Guide

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Compliance & Privacy](#compliance--privacy)
6. [Threat Mitigation](#threat-mitigation)
7. [Security Monitoring](#security-monitoring)
8. [Incident Response](#incident-response)
9. [Security Checklist](#security-checklist)

## Security Architecture

### Defense in Depth

The Business Hunter Swarm implements multiple layers of security:

```
┌─────────────────────────────────────────────────────────────┐
│                    External Perimeter                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  WAF / DDoS Protection               │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Load Balancer / TLS                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  API Gateway                         │    │
│  │  • Rate Limiting  • API Key Validation              │    │
│  │  • Request Validation • IP Whitelisting             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Application Security Layer              │    │
│  │  • JWT Auth  • RBAC  • Input Sanitization          │    │
│  │  • CSRF Protection  • XSS Prevention               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Data Layer Security                │    │
│  │  • Encryption at Rest  • Field-level Encryption     │    │
│  │  • Access Control  • Audit Logging                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Security Components

1. **Enhanced Security Layer** (`EnhancedSecurityLayer.ts`)
   - Core security middleware
   - Request validation and sanitization
   - API key management
   - Encryption services

2. **Authentication Service**
   - JWT token generation/validation
   - Session management
   - Multi-factor authentication support

3. **Authorization Service**
   - Role-based access control (RBAC)
   - Permission management
   - Resource-level permissions

4. **Audit Service**
   - Security event logging
   - Compliance reporting
   - Access tracking

## Authentication & Authorization

### API Key Management

```typescript
// Generate API key with specific permissions
const { apiKey, keyId } = await security.generateApiKey({
  name: 'Hunter Production API',
  permissions: [
    'discovery:read',
    'enrichment:write',
    'outreach:write',
    'export:read'
  ],
  expiresAt: new Date('2025-01-01'),
  ipWhitelist: ['10.0.0.0/8', '172.16.0.0/12'],
  rateLimit: 5000 // requests per hour
});

// API key format: bh_prod_<keyId>_<secret>
// Example: bh_prod_a7f3d2b1c9e8_Km9vN2x5Q3J5cHRvU2VjcmV0S2V5
```

### Permission Model

```typescript
interface Permission {
  resource: 'discovery' | 'enrichment' | 'outreach' | 'analytics' | 'export' | 'admin';
  action: 'read' | 'write' | 'delete' | '*';
}

// Permission examples:
'discovery:read'     // Can view discovered businesses
'enrichment:write'   // Can enrich business data
'outreach:*'        // All outreach permissions
'admin'             // Full system access
'export:read'       // Can export data
'pii:read'          // Can view PII data
```

### JWT Authentication

```typescript
// JWT payload structure
interface JWTPayload {
  sub: string;          // User/Service ID
  iss: string;          // Issuer
  aud: string[];        // Audiences
  exp: number;          // Expiration
  iat: number;          // Issued at
  permissions: string[]; // User permissions
  apiKeyId?: string;    // Associated API key
}

// Inter-service authentication
const serviceToken = jwt.sign({
  sub: 'hunter-service',
  iss: 'business-hunter-swarm',
  aud: ['enrichment-service', 'outreach-service'],
  permissions: ['*'],
  exp: Math.floor(Date.now() / 1000) + 3600
}, process.env.JWT_SECRET);
```

## Data Protection

### Encryption Standards

#### At Rest
- **Database**: AES-256 encryption with AWS KMS
- **File Storage**: S3 server-side encryption
- **Redis**: Encryption via AWS ElastiCache
- **Logs**: Encrypted with separate keys

#### In Transit
- **TLS 1.3**: All external communications
- **mTLS**: Inter-service communication
- **Certificate Pinning**: Mobile/API clients

#### Field-Level Encryption

```typescript
// Sensitive fields are encrypted individually
interface EncryptedField {
  data: string;    // Base64 encoded encrypted data
  iv: string;      // Initialization vector
  tag: string;     // Authentication tag
  version: number; // Encryption version
}

// Example: Encrypting contact information
const encryptedEmail = security.encrypt(contact.email);
const stored = {
  name: contact.name, // Not sensitive
  email: {
    encrypted: encryptedEmail.encrypted,
    iv: encryptedEmail.iv,
    tag: encryptedEmail.tag,
    version: 1
  },
  phone: { // Similarly encrypted
    encrypted: encryptedPhone.encrypted,
    iv: encryptedPhone.iv,
    tag: encryptedPhone.tag,
    version: 1
  }
};
```

### Data Classification

```typescript
enum DataClassification {
  PUBLIC = 'public',           // Business name, website
  INTERNAL = 'internal',       // Business metadata
  CONFIDENTIAL = 'confidential', // Contact details
  RESTRICTED = 'restricted'    // Financial info, PII
}

// Encryption requirements by classification
const encryptionPolicy = {
  [DataClassification.PUBLIC]: false,
  [DataClassification.INTERNAL]: false,
  [DataClassification.CONFIDENTIAL]: true,
  [DataClassification.RESTRICTED]: true
};
```

### Key Management

```typescript
// Key rotation schedule
interface KeyRotationPolicy {
  encryptionKeys: '90 days';
  apiKeys: '365 days';
  jwtSecret: '30 days';
  tlsCertificates: '90 days';
}

// Key storage hierarchy
const keyHierarchy = {
  masterKey: 'AWS KMS', // Hardware security module
  dataEncryptionKey: 'Derived from master',
  fieldEncryptionKeys: 'Derived from DEK'
};
```

## API Security

### Rate Limiting

```typescript
// Tiered rate limits
const rateLimits = {
  anonymous: {
    discovery: 10,      // per hour
    enrichment: 0,      // not allowed
    export: 1          // per day
  },
  authenticated: {
    discovery: 1000,    // per hour
    enrichment: 500,    // per hour
    outreach: 100,      // per hour
    export: 50         // per hour
  },
  premium: {
    discovery: 10000,   // per hour
    enrichment: 5000,   // per hour
    outreach: 1000,     // per hour
    export: 500        // per hour
  }
};

// DDoS protection
const ddosProtection = {
  maxRequestsPerIP: 10000,     // per hour
  blockDuration: 3600,         // 1 hour
  suspiciousPatterns: [
    'rapid_endpoint_scanning',
    'malformed_requests',
    'known_attack_signatures'
  ]
};
```

### Input Validation

```typescript
// Request validation schemas
const discoveryRequestSchema = z.object({
  source: z.enum(['linkedin', 'government', 'social', 'registry']),
  filters: z.object({
    businessType: z.array(z.enum(['indigenous_owned', 'canadian_general'])).optional(),
    provinces: z.array(z.string().length(2)).optional(),
    industries: z.array(z.string()).max(10).optional(),
    minEmployees: z.number().min(0).max(10000).optional()
  }).optional(),
  limit: z.number().min(1).max(1000).default(100)
});

// Sanitization rules
const sanitizationRules = {
  removeScripts: true,
  stripHTML: true,
  escapeSpecialChars: true,
  normalizeWhitespace: true,
  maxLength: {
    businessName: 200,
    description: 5000,
    url: 2000
  }
};
```

### CORS Configuration

```typescript
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://platform.indigenous.ca',
      'https://app.indigenous.ca',
      /^https:\/\/.*\.indigenous\.ca$/
    ];
    
    if (!origin || allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 hours
};
```

## Compliance & Privacy

### PIPEDA Compliance

```typescript
// Personal information handling
interface PIIHandling {
  purpose: string;              // Why collecting
  consent: ConsentRecord;       // User consent
  retention: number;            // Days to retain
  access: string[];            // Who can access
  audit: boolean;              // Audit access
}

// Consent management
interface ConsentRecord {
  userId: string;
  timestamp: Date;
  purpose: string;
  scope: string[];
  duration: number;
  withdrawable: boolean;
  method: 'explicit' | 'implicit';
}

// Right to erasure
async function handleDataDeletion(userId: string): Promise<void> {
  // 1. Verify request authenticity
  // 2. Log deletion request
  // 3. Delete from all systems
  // 4. Confirm deletion
  // 5. Retain deletion record
}
```

### CASL Compliance

```typescript
// Anti-spam compliance
interface CASLCompliance {
  consent: {
    type: 'express' | 'implied';
    timestamp: Date;
    method: string;
    evidence: string;
  };
  unsubscribe: {
    mechanism: 'link' | 'reply' | 'portal';
    processingTime: '10 days';
  };
  identification: {
    sender: string;
    contact: string;
    mailingAddress: string;
  };
}
```

### Data Residency

```typescript
// Canadian data residency requirements
const dataResidency = {
  storage: {
    primary: 'ca-central-1',      // Toronto
    backup: 'ca-west-1',          // Vancouver
    disaster: 'ca-central-1b'     // Montreal
  },
  processing: {
    allowed: ['Canada'],
    prohibited: ['*']
  },
  transfer: {
    requiresConsent: true,
    encryptionRequired: true,
    auditRequired: true
  }
};
```

## Threat Mitigation

### OWASP Top 10 Protection

#### 1. Injection Prevention
```typescript
// SQL injection prevention
const safeQuery = db.prepare(
  'SELECT * FROM businesses WHERE id = ? AND type = ?'
).bind(businessId, businessType);

// NoSQL injection prevention
const safeFindQuery = {
  id: { $eq: sanitize(businessId) },
  type: { $in: ['indigenous_owned', 'canadian_general'] }
};

// Command injection prevention
const allowedCommands = ['export', 'analyze'];
if (!allowedCommands.includes(command)) {
  throw new Error('Invalid command');
}
```

#### 2. Broken Authentication
```typescript
// Strong password policy
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommon: true,
  preventUserInfo: true,
  maxAge: 90 // days
};

// Account lockout
const lockoutPolicy = {
  maxAttempts: 5,
  windowMinutes: 15,
  lockoutMinutes: 30,
  increasingDelay: true
};
```

#### 3. Sensitive Data Exposure
```typescript
// Data masking in logs
function maskSensitiveData(data: any): any {
  const masked = { ...data };
  
  // Mask emails
  if (masked.email) {
    masked.email = maskEmail(masked.email);
  }
  
  // Mask phone numbers
  if (masked.phone) {
    masked.phone = maskPhone(masked.phone);
  }
  
  // Remove sensitive fields
  delete masked.password;
  delete masked.apiKey;
  delete masked.creditCard;
  
  return masked;
}
```

#### 4. XML External Entities (XXE)
```typescript
// Disable XML external entities
const xmlParser = new XMLParser({
  processEntities: false,
  resolveExternalEntities: false,
  xmlMode: false
});
```

#### 5. Broken Access Control
```typescript
// Resource-level access control
async function checkResourceAccess(
  userId: string,
  resourceId: string,
  action: string
): Promise<boolean> {
  // Check ownership
  const resource = await getResource(resourceId);
  if (resource.ownerId === userId) return true;
  
  // Check permissions
  const permissions = await getUserPermissions(userId);
  return permissions.includes(`${resource.type}:${action}`);
}
```

### Advanced Threats

#### API Abuse Prevention
```typescript
// Behavioral analysis
interface BehaviorProfile {
  normalRequestRate: number;
  typicalEndpoints: string[];
  accessPatterns: TimePattern[];
  geolocations: string[];
}

async function detectAnomalous behavior(
  userId: string,
  request: Request
): Promise<AnomalyScore> {
  const profile = await getUserBehaviorProfile(userId);
  const score = calculateAnomalyScore(request, profile);
  
  if (score > 0.8) {
    await flagSuspiciousActivity(userId, request, score);
  }
  
  return score;
}
```

#### Supply Chain Security
```typescript
// Dependency scanning
const dependencyPolicy = {
  scanFrequency: 'daily',
  vulnerabilityThreshold: 'high',
  autoUpdate: {
    patch: true,
    minor: false,
    major: false
  },
  blocklist: [
    'package-with-known-vulnerabilities',
    'compromised-package'
  ]
};
```

## Security Monitoring

### Real-time Monitoring

```typescript
// Security event types
enum SecurityEventType {
  AUTH_FAILURE = 'auth_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  DATA_EXFILTRATION = 'data_exfiltration',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  API_ABUSE = 'api_abuse'
}

// Event monitoring
class SecurityMonitor {
  async logEvent(event: SecurityEvent): Promise<void> {
    // Real-time processing
    await this.processEvent(event);
    
    // Check thresholds
    if (await this.isThresholdExceeded(event)) {
      await this.triggerAlert(event);
    }
    
    // Update dashboards
    await this.updateDashboards(event);
  }
}
```

### Security Metrics

```typescript
// Key security metrics
interface SecurityMetrics {
  authenticationFailures: number;
  authorizationDenials: number;
  rateLimitViolations: number;
  suspiciousRequests: number;
  blockedIPs: number;
  dataBreaches: number;
  apiKeyCompromises: number;
  encryptionFailures: number;
}

// Prometheus metrics
const securityMetrics = {
  auth_failures_total: new Counter({
    name: 'security_auth_failures_total',
    help: 'Total authentication failures',
    labelNames: ['method', 'reason']
  }),
  
  suspicious_requests_total: new Counter({
    name: 'security_suspicious_requests_total',
    help: 'Total suspicious requests detected',
    labelNames: ['type', 'severity']
  }),
  
  encryption_operations_total: new Counter({
    name: 'security_encryption_operations_total',
    help: 'Total encryption operations',
    labelNames: ['operation', 'algorithm']
  })
};
```

### Audit Logging

```typescript
// Comprehensive audit log
interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  apiKeyId?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  ip: string;
  userAgent: string;
  requestId: string;
  details: Record<string, any>;
  risk: 'low' | 'medium' | 'high';
}

// Audit log retention
const auditRetention = {
  securityEvents: '7 years',
  accessLogs: '2 years',
  apiLogs: '1 year',
  debugLogs: '30 days'
};
```

## Incident Response

### Incident Response Plan

```typescript
interface IncidentResponsePlan {
  detection: {
    monitoring: 'continuous';
    alertThresholds: ThresholdConfig[];
    escalation: EscalationPolicy;
  };
  
  containment: {
    immediate: [
      'isolate_affected_systems',
      'revoke_compromised_credentials',
      'block_malicious_ips'
    ];
    investigation: [
      'preserve_evidence',
      'analyze_logs',
      'identify_scope'
    ];
  };
  
  eradication: {
    steps: [
      'remove_malicious_code',
      'patch_vulnerabilities',
      'reset_credentials'
    ];
  };
  
  recovery: {
    steps: [
      'restore_from_backup',
      'verify_integrity',
      'monitor_closely'
    ];
  };
  
  lessons: {
    documentation: true;
    updatePolicies: true;
    training: true;
  };
}
```

### Automated Response

```typescript
// Automated incident response
async function handleSecurityIncident(
  incident: SecurityIncident
): Promise<void> {
  // 1. Immediate containment
  if (incident.severity === 'critical') {
    await emergencyShutdown(incident.affectedServices);
  }
  
  // 2. Notify team
  await notifySecurityTeam(incident);
  
  // 3. Preserve evidence
  await captureForensicData(incident);
  
  // 4. Block threats
  if (incident.sourceIP) {
    await blockIP(incident.sourceIP);
  }
  
  // 5. Revoke access
  if (incident.compromisedCredentials) {
    await revokeCredentials(incident.compromisedCredentials);
  }
  
  // 6. Generate report
  await generateIncidentReport(incident);
}
```

## Security Checklist

### Pre-Deployment

- [ ] All dependencies updated and scanned
- [ ] Security headers configured
- [ ] TLS certificates valid
- [ ] API keys rotated
- [ ] Encryption keys secured
- [ ] Rate limiting configured
- [ ] Input validation active
- [ ] CORS properly configured
- [ ] Authentication tested
- [ ] Authorization verified
- [ ] Audit logging enabled
- [ ] Monitoring alerts set
- [ ] Backup encryption verified
- [ ] Incident response tested
- [ ] Security training completed

### Runtime Security

- [ ] Real-time monitoring active
- [ ] Anomaly detection enabled
- [ ] Auto-scaling configured
- [ ] DDoS protection active
- [ ] WAF rules updated
- [ ] Backup jobs running
- [ ] Key rotation scheduled
- [ ] Patch management active
- [ ] Compliance checks passing
- [ ] Security metrics tracked

### Post-Deployment

- [ ] Penetration testing scheduled
- [ ] Security audit planned
- [ ] Vulnerability scanning active
- [ ] Compliance review scheduled
- [ ] Incident drills planned
- [ ] Security training updated
- [ ] Documentation current
- [ ] Recovery procedures tested
- [ ] Insurance coverage verified
- [ ] Legal review completed

### API Security Testing

```bash
# Run security tests
npm run test:security

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.business-hunter.ca

# Dependency check
npm audit
snyk test

# Static analysis
npm run lint:security

# Penetration testing
./scripts/pentest.sh --full
```

### Compliance Verification

```bash
# PIPEDA compliance check
npm run compliance:pipeda

# CASL compliance check
npm run compliance:casl

# Generate compliance report
npm run compliance:report -- --format=pdf

# Audit log analysis
npm run audit:analyze -- --last=30d
```

## Security Contacts

- **Security Team**: security@indigenous-platform.ca
- **Incident Response**: incident@indigenous-platform.ca
- **On-Call**: Use PagerDuty
- **Bug Bounty**: security.indigenous-platform.ca/bugbounty

## Security Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [PIPEDA Compliance Guide](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/)
- [CASL Requirements](https://crtc.gc.ca/eng/internet/anti.htm)
- [CSE Security Guidelines](https://cyber.gc.ca/)

---

Remember: Security is everyone's responsibility. When in doubt, ask the security team.