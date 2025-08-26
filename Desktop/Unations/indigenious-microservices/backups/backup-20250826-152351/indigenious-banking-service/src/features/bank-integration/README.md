# Bank Integration Module

## Overview

The Bank Integration module provides enterprise-grade virtual account management across major Canadian banks, enabling Indigenous communities to create and manage escrow accounts with full Section 89 compliance.

## Features

- **Multi-Bank Support**: Scotia, RBC, TD, BMO, CIBC, Desjardins
- **Virtual Account Management**: Create, manage, and monitor virtual accounts
- **Payment Processing**: Cross-bank transfers with automatic Interac e-Transfer splitting
- **Risk Scoring**: ML-based Indigenous business verification with 5-component scoring
- **Section 89 Compliance**: Full support for on-reserve tax exemptions
- **Enterprise Security**: Bank-grade security with encryption, rate limiting, and audit trails

## Architecture

```
bank-integration/
├── adapters/           # Bank-specific implementations
│   └── scotia/        # Scotia TranXact adapter
├── middleware/        # Security and authentication
├── schemas/          # Validation schemas
├── services/         # Core business logic
└── types/           # TypeScript interfaces
```

## Quick Start

### 1. Environment Setup

```bash
# Required environment variables
SCOTIA_CLIENT_ID=your_client_id
SCOTIA_CLIENT_SECRET=your_client_secret
SCOTIA_API_BASE_URL=https://api-gateway.scotiabank.com
SCOTIA_SANDBOX_URL=https://sandbox-api.scotiabank.com

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# AWS (for credential management)
AWS_REGION=ca-central-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Redis (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Redis Encryption (SOC 2 Compliance)
REDIS_MASTER_KEY=your_redis_master_key
REDIS_ENCRYPTION_ENABLED=true
```

### 2. Initialize Bank Adapters

```typescript
import { bankAdapterFactory } from '@/features/bank-integration/services/BankAdapterFactory';
import { BankCredentials } from '@/features/bank-integration/types';

// Initialize with credentials
const credentials: BankCredentials = {
  scotia: {
    clientId: process.env.SCOTIA_CLIENT_ID!,
    clientSecret: process.env.SCOTIA_CLIENT_SECRET!,
    environment: 'sandbox'
  }
};

await bankAdapterFactory.initialize(credentials);
```

### 3. Create Virtual Account

```typescript
import { virtualAccountService } from '@/features/bank-integration/services/VirtualAccountService';

const account = await virtualAccountService.createVirtualAccount({
  communityId: 'community-uuid',
  bankId: 'SCOTIA',
  parentAccountNumber: '1234567890',
  name: 'Community Procurement Escrow',
  section89Details: {
    bandNumber: '123',
    reserveName: 'Example First Nation',
    treaty: 'Treaty 6',
    category1A: true,
    offReserveBranch: {
      address: '123 Main St, City, Province',
      transitNumber: '12345',
      distance: 50
    }
  }
});
```

### 4. Process Payment

```typescript
const payment = await virtualAccountService.processPayment({
  fromAccountId: 'account-uuid-1',
  toAccountId: 'account-uuid-2',
  amount: 50000,
  description: 'Contract payment for construction project',
  useQuickPay: true,
  metadata: {
    contractId: 'contract-123',
    invoiceNumber: 'INV-2024-001'
  }
});
```

## API Endpoints

### Authentication

All endpoints require either JWT authentication (for web users) or API key authentication (for service-to-service).

```
Headers:
- Authorization: Bearer <jwt_token>
OR
- X-API-Key: indi_<api_key>
```

### Virtual Accounts

#### Create Virtual Account
```
POST /api/v1/bank/virtual-accounts
Content-Type: application/json
Idempotency-Key: <unique-key>

{
  "communityId": "uuid",
  "bankId": "SCOTIA",
  "parentAccountNumber": "1234567890",
  "name": "Community Escrow Account"
}
```

#### Get Account Balance
```
GET /api/v1/bank/virtual-accounts/:accountId/balance
```

#### List Transactions
```
GET /api/v1/bank/virtual-accounts/:accountId/transactions?from=2024-01-01&to=2024-12-31
```

### Payments

#### Process Payment
```
POST /api/v1/bank/payments
Content-Type: application/json
Idempotency-Key: <unique-key>

{
  "fromAccountId": "uuid",
  "toAccountId": "uuid",
  "amount": 10000,
  "description": "Invoice payment",
  "type": "INTERNAL_TRANSFER"
}
```

### Risk Scoring

#### Verify Business
```
GET /api/v1/bank/verify/business/:businessId
```

#### Bulk Verification
```
POST /api/v1/bank/verify/bulk
Content-Type: application/json

{
  "businessIds": ["uuid1", "uuid2"],
  "webhookUrl": "https://your-domain.com/webhook"
}
```

### Fraud Detection

#### Analyze Transaction
```
POST /api/v1/fraud/analyze
Content-Type: application/json

{
  "transactionId": "txn_123",
  "userId": "user_123",
  "businessId": "biz_123",
  "amount": 5000,
  "currency": "CAD",
  "type": "payment",
  "fromAccount": "acc_123",
  "toAccount": "acc_456"
}

Response:
{
  "success": true,
  "data": {
    "transactionId": "txn_123",
    "overallRisk": 35,
    "fraudProbability": 0.12,
    "decision": "approve",
    "requiresMFA": false,
    "requiresManualReview": false,
    "reasons": ["Transaction approved - low risk"]
  }
}
```

#### Real-Time Monitoring (WebSocket)
```
ws://localhost:3000/api/v1/fraud/monitor?token=<auth_token>

// Client message
{ "type": "ping" }

// Server events
{
  "type": "fraud-detected",
  "data": {
    "transactionId": "txn_456",
    "risk": 85,
    "decision": "block"
  }
}
```

#### Get Fraud Statistics
```
GET /api/v1/fraud/statistics?startDate=2024-01-01&endDate=2024-12-31
```

## Security Features (SOC 2 Type II Compliant)

### 1. Credential Management
- All credentials stored encrypted in AWS Secrets Manager
- Automatic key rotation support
- No hardcoded secrets in code
- AES-256-GCM encryption for sensitive data

### 2. Authentication & Authorization
- JWT authentication for web users
- API key authentication for services
- Role-based access control (RBAC)
- Community-based access restrictions
- Multi-Factor Authentication (MFA) for high-value transactions

### 3. Rate Limiting
- Payment operations: 10 requests/minute
- Account operations: 30 requests/minute
- Read operations: 100 requests/minute
- Verification: 50 requests/hour

### 4. Input Validation
- Comprehensive Zod schemas for all inputs
- XSS protection with DOMPurify
- SQL injection prevention via Prisma ORM

### 5. Audit Trail
- All financial operations logged
- Blockchain audit trail for payments
- Comprehensive error tracking
- SOC 2 compliant retention (7 years)
- Hash chain integrity verification

### 6. Redis Encryption
- All cached data encrypted at rest using AES-256-GCM
- Automatic key rotation every 30 days
- Secure key derivation with PBKDF2
- Authentication tags for data integrity
- Encrypted data migration tools

### 7. Real-Time Fraud Detection
- **ML-based Analysis**: TensorFlow model for fraud prediction
- **Rule-Based Detection**: 5+ configurable fraud patterns
- **Behavioral Analysis**: User pattern recognition
- **Velocity Monitoring**: Transaction frequency/volume checks
- **Risk Scoring**: 5-component risk assessment
- **Automated Actions**: Block, MFA challenge, or manual review
- **Real-time Alerts**: WebSocket/SSE for instant notifications

## Risk Scoring System

The intelligent verification service provides ML-based risk scoring with 5 components:

1. **Ownership Verification** (30% weight)
   - Minimum 51% Indigenous ownership required
   - Community attestation validation
   - Government registry checks

2. **Financial Stability** (20% weight)
   - Revenue analysis
   - Payment history
   - Contract completion rates

3. **Past Performance** (20% weight)
   - Contract success rate
   - Average delays
   - Dispute history

4. **Community Standing** (20% weight)
   - ISC registry verification
   - CCAB membership
   - Community attestations

5. **Capacity Assessment** (10% weight)
   - Employee count vs contract size
   - Historical contract values
   - Current workload

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {} // Optional additional context
}
```

Common error codes:
- `INVALID_INPUT`: Validation failed
- `AUTHENTICATION_ERROR`: Auth failed
- `INSUFFICIENT_PERMISSIONS`: Missing required permissions
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `PAYMENT_FAILED`: Payment processing failed
- `ACCOUNT_NOT_FOUND`: Virtual account doesn't exist

## Monitoring & Observability

### Metrics
- Payment success rate
- Average processing time
- Risk score distribution
- API response times

### Logging
- Structured logging with correlation IDs
- Security event logging
- Performance metrics
- Error tracking with Sentry

### Health Checks
```
GET /api/v1/bank/health
```

Returns health status of all bank adapters and services.

## Testing

### Unit Tests
```bash
npm test src/features/bank-integration
```

### Integration Tests
```bash
npm run test:integration:bank
```

### Load Tests
```bash
npm run test:load:bank
```

## Deployment

### Prerequisites
1. SSL/TLS certificates configured
2. Redis cluster for caching
3. PostgreSQL with migrations applied
4. AWS credentials for Secrets Manager

### Environment-Specific Configuration
- Development: Uses sandbox APIs
- Staging: Uses sandbox APIs with production-like config
- Production: Uses live bank APIs with full security

### Migration Steps
1. Run database migrations
2. Initialize credential vault
3. Configure bank webhooks
4. Enable monitoring
5. Perform health checks

## Compliance

### Section 89 Indian Act
- Full support for on-reserve tax exemptions
- Off-reserve branch validation
- Automated compliance reporting

### FINTRAC
- Transaction monitoring
- Suspicious activity detection
- Automated reporting capabilities

### PCI DSS
- No storage of card numbers
- Encrypted data transmission
- Regular security audits

## Support

For issues or questions:
1. Check error logs in CloudWatch/Datadog
2. Review audit trail for transaction history
3. Contact bank integration team

## Roadmap

### Phase 1 (Complete)
- ✅ Scotia TranXact integration
- ✅ Virtual account management
- ✅ Risk scoring system
- ✅ Security framework

### Phase 2 (In Progress)
- 🔄 RBC adapter implementation
- 🔄 TD adapter implementation
- 🔄 Real-time reconciliation
- 🔄 Webhook management

### Phase 3 (Planned)
- 📋 BMO, CIBC, Desjardins adapters
- 📋 Multi-currency support
- 📋 Advanced fraud detection
- 📋 Mobile SDK

## License

Proprietary - Indigenous Inc. All rights reserved.