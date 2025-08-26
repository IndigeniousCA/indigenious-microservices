# Canadian Universal Verification System

Enterprise-grade business verification across all 13 Canadian provinces and territories with comprehensive Indigenous partnership validation.

## Overview

The Canadian Universal Verification System provides:

- ✅ **Provincial Verification** - All 13 provinces/territories
- ✅ **Federal Verification** - CRA, ISED, ISC, ESDC
- ✅ **Indigenous Validation** - CCAB, band affiliations, partnerships
- ✅ **Trade Harmonization** - Red Seal and provincial trade verification
- ✅ **Safety Compliance** - WSIB/WCB across all provinces
- ✅ **Fraud Detection** - AI-powered risk assessment
- ✅ **Bilingual Support** - English and French

## Quick Start

```typescript
import { canadianVerifier } from './services/CanadianUniversalVerifier';

// Simple verification
const result = await canadianVerifier.verifyEntity({
  businessName: 'Northern Construction Inc',
  businessNumber: '123456789RC0001',
  location: { province: 'ON' }
});

console.log(`Verified: ${result.verified}`);
console.log(`Confidence: ${result.confidence}`);
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Canadian Universal Verifier                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Provincial │  │   Federal   │  │ Specialized │            │
│  │   Agents    │  │   Agents    │  │   Agents    │            │
│  │  (13 P/T)   │  │ (CRA, ISED) │  │(Fraud, etc) │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                      Security & Monitoring                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │    Rate     │  │   Circuit   │  │    Audit    │            │
│  │  Limiting   │  │  Breakers   │  │   Logging   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Multi-Provincial Verification

Verify businesses operating across multiple provinces:

```typescript
const result = await canadianVerifier.verifyEntity({
  businessName: 'National Contractors Ltd',
  location: { province: 'ON' },
  workers: [{
    name: 'Jane Smith',
    trades: ['electrician'],
    provinces: ['ON', 'QC', 'BC'],
    certifications: [{
      type: 'Journeyman Electrician',
      number: 'ON-12345',
      province: 'ON',
      expiry: new Date('2025-12-31'),
      redSeal: true
    }]
  }]
});

// Systems checked: ON-Provincial, QC-Provincial, BC-Provincial, Trade-Harmonizer
```

### 2. Indigenous Partnership Verification

Comprehensive validation of Indigenous partnerships:

```typescript
const result = await canadianVerifier.verifyEntity({
  businessName: 'Resource Development Corp',
  location: { province: 'MB' },
  indigenousPartnership: {
    partnerName: 'Eagle Lake First Nation',
    nation: 'Ojibway',
    agreementDate: new Date('2020-01-15'),
    agreementType: 'Joint Venture',
    ownershipPercentage: 51,
    benefitAgreement: {
      type: 'Revenue Sharing',
      value: 5000000,
      duration: '20 years'
    }
  }
});

// Validates with ISC, CCAB, and Indigenous verification networks
```

### 3. Fraud Detection

AI-powered risk assessment:

```typescript
// High-risk indicators detected automatically:
// - Recent incorporation (< 90 days)
// - No verifiable trade certifications
// - Phantom Indigenous partnerships
// - Suspicious timing patterns
```

### 4. Quebec Bilingual Support

Special handling for Quebec requirements:

```typescript
const result = await canadianVerifier.verifyEntity({
  businessName: 'Construction Québécoise Inc',
  location: { province: 'QC', city: 'Montréal' },
  tradeQualifications: ['électricien', 'plombier']
});

// Returns bilingual results with language compliance check
```

## Security

### Authentication

```typescript
// API key required for all requests
const verifier = new CanadianUniversalVerifier({
  apiKey: process.env.VERIFICATION_API_KEY
});
```

### Rate Limiting

- 10 verifications per minute
- 100 heavy verifications per hour
- Automatic blocking for abuse

### Data Protection

- All SIN numbers encrypted with AES-256-GCM
- PII redacted in logs
- Audit trail for all verifications
- Indigenous data sovereignty compliance

## Provincial Agents

| Province | Registry | Safety Board | Trade Authority | Status |
|----------|----------|--------------|-----------------|---------|
| BC | BC Registry | WorkSafeBC | ITA BC | ✅ Complete |
| AB | Alberta Registry | WCB Alberta | AIT | ✅ Complete |
| SK | ISC | WCB Sask | SATCC | 🚧 Basic |
| MB | Companies Office | WCB Manitoba | Apprenticeship MB | 🚧 Basic |
| ON | ServiceOntario | WSIB | Skilled Trades ON | ✅ Complete |
| QC | REQ | CNESST | CCQ | ✅ Complete |
| NB | SNB | WorkSafeNB | PETL | 🚧 Basic |
| NS | Registry of JS | WCB NS | NSAA | 🚧 Basic |
| PE | Corporate Registry | WCB PEI | - | 🚧 Basic |
| NL | Registry of Companies | WorkplaceNL | - | 🚧 Basic |
| YT | Corporate Affairs | YWCHSB | - | 🚧 Basic |
| NT | Corporate Registry | WSCC | - | 🚧 Basic |
| NU | Legal Registries | WSCC | - | 🚧 Basic |

## Performance

- Average verification time: 3-5 seconds
- Parallel execution across all systems
- Redis caching (24-hour TTL)
- Circuit breakers prevent cascade failures

## Error Handling

```typescript
try {
  const result = await canadianVerifier.verifyEntity(request);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Wait and retry
  } else if (error.code === 'VALIDATION_ERROR') {
    // Fix input data
  } else if (error.code === 'TIMEOUT') {
    // Verification took too long
  }
}
```

## Monitoring

Built-in metrics and monitoring:

```typescript
// Prometheus metrics exposed
canadian_verification_total{status="success"} 1234
canadian_verification_duration_seconds{p95} 3.2
canadian_verification_cache_hits_total 5678
```

## Testing

```bash
# Run all tests
npm test canadian-verification

# Run specific test suite
npm test canadian-verification -- --testNamePattern="Indigenous"

# Run with coverage
npm test canadian-verification -- --coverage
```

## Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Provincial APIs
BC_REGISTRY_API_KEY=
AB_REGISTRY_API_KEY=
ON_REGISTRY_API_KEY=
QC_REQ_API_KEY=

# Federal APIs
CRA_API_KEY=
ISED_API_KEY=
ISC_API_KEY=

# Specialized APIs
CCAB_API_KEY=
FNBC_API_KEY=

# Security
ENCRYPTION_KEY=
VERIFICATION_PRIVATE_KEY=
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: canadian-verification
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: verifier
        image: canadian-verification:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

Proprietary - Indigenous Procurement Platform

## Support

- Documentation: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Implementation Plan: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- Support: verification-support@indigenousprocurement.ca