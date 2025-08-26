# Tax Debt Verification API Documentation

## Overview

The Tax Debt Verification System provides comprehensive verification of business tax debt status across all Canadian jurisdictions - federal, provincial, and territorial. This enterprise-grade system ensures procurement eligibility and compliance verification for Canadian businesses.

## Authentication

All API endpoints require authentication using an API key or JWT token.

```http
X-API-Key: your-api-key
Authorization: Bearer your-jwt-token
```

## Base URL

```
Production: https://api.indigenous-platform.ca/tax-debt
Staging: https://staging.indigenous-platform.ca/tax-debt
Development: http://localhost:3000/api/tax-debt
```

## Endpoints

### Verify Tax Debt Status

#### POST `/verify`

Verify tax debt status across all applicable Canadian jurisdictions.

**Request Body:**
```json
{
  "businessNumber": "123456789RC0001",
  "legalName": "Example Corporation Inc.",
  "province": "ON",
  "verificationTypes": ["federal", "provincial"],
  "requestId": "req-12345",
  "requestor": {
    "organizationId": "org-456",
    "userId": "user-789"
  }
}
```

**Response:**
```json
{
  "verificationId": "vrf-987654321",
  "timestamp": "2024-03-15T10:30:00Z",
  "status": "completed",
  "business": {
    "businessNumber": "123456789RC0001",
    "legalName": "Example Corporation Inc.",
    "province": "ON"
  },
  "results": {
    "federal": {
      "jurisdiction": "Canada Revenue Agency",
      "status": "verified",
      "taxDebtStatus": {
        "hasDebt": false,
        "procurementEligible": true,
        "lastVerified": "2024-03-15T10:30:00Z"
      },
      "details": {
        "gstHstStatus": "compliant",
        "payrollDeductionsStatus": "compliant",
        "corporateIncomeTaxStatus": "compliant"
      }
    },
    "provincial": {
      "jurisdiction": "Ontario Ministry of Finance",
      "status": "verified", 
      "taxDebtStatus": {
        "hasDebt": false,
        "procurementEligible": true,
        "lastVerified": "2024-03-15T10:30:00Z"
      },
      "details": {
        "corporationTax": "compliant",
        "employerHealthTax": "compliant",
        "retailSalesTax": "not_applicable"
      }
    }
  },
  "overallStatus": {
    "procurementEligible": true,
    "hasAnyDebt": false,
    "riskLevel": "low"
  },
  "metadata": {
    "processingTime": 2340,
    "dataSource": "live_api",
    "confidence": 0.98
  }
}
```

### Bulk Verification

#### POST `/verify/bulk`

Verify multiple businesses in a single request.

**Request Body:**
```json
{
  "businesses": [
    {
      "businessNumber": "123456789RC0001",
      "legalName": "Company A Inc.",
      "province": "ON"
    },
    {
      "businessNumber": "987654321RC0001", 
      "legalName": "Company B Ltd.",
      "province": "BC"
    }
  ],
  "verificationTypes": ["federal", "provincial"],
  "requestId": "bulk-req-12345"
}
```

**Response:**
```json
{
  "batchId": "batch-987654321",
  "timestamp": "2024-03-15T10:30:00Z",
  "totalRequests": 2,
  "completed": 2,
  "failed": 0,
  "results": [
    {
      "businessNumber": "123456789RC0001",
      "status": "completed",
      "result": { /* Full verification result */ }
    },
    {
      "businessNumber": "987654321RC0001",
      "status": "completed", 
      "result": { /* Full verification result */ }
    }
  ],
  "summary": {
    "procurementEligible": 2,
    "hasDebt": 0,
    "processingTime": 4680
  }
}
```

### Get Verification History

#### GET `/history/:businessNumber`

Retrieve verification history for a specific business.

**Query Parameters:**
- `limit` - Number of records to return (default: 10, max: 100)
- `startDate` - Filter results from this date
- `endDate` - Filter results to this date

**Response:**
```json
{
  "businessNumber": "123456789RC0001",
  "verifications": [
    {
      "verificationId": "vrf-987654321",
      "timestamp": "2024-03-15T10:30:00Z",
      "procurementEligible": true,
      "hasAnyDebt": false,
      "requestor": "procurement-system"
    }
  ],
  "pagination": {
    "current": 1,
    "total": 1,
    "hasMore": false
  }
}
```

### Get Supported Jurisdictions

#### GET `/jurisdictions`

List all supported tax jurisdictions and their capabilities.

**Response:**
```json
{
  "jurisdictions": [
    {
      "code": "CA",
      "name": "Canada Revenue Agency",
      "type": "federal",
      "taxTypes": [
        "GST/HST",
        "Payroll Deductions", 
        "Corporate Income Tax",
        "Excise Tax"
      ],
      "realTimeVerification": true,
      "batchProcessing": true
    },
    {
      "code": "ON",
      "name": "Ontario Ministry of Finance",
      "type": "provincial",
      "taxTypes": [
        "Corporation Tax",
        "Employer Health Tax",
        "Retail Sales Tax"
      ],
      "realTimeVerification": true,
      "batchProcessing": true
    }
  ]
}
```

### Get Verification Status

#### GET `/status/:verificationId`

Check the status of an ongoing verification.

**Response:**
```json
{
  "verificationId": "vrf-987654321",
  "status": "in_progress", 
  "progress": {
    "total": 2,
    "completed": 1,
    "failed": 0,
    "pending": 1
  },
  "estimatedCompletion": "2024-03-15T10:32:00Z",
  "completedJurisdictions": ["CA"],
  "pendingJurisdictions": ["ON"]
}
```

## Tax Debt Response Fields

### Federal Tax Debt (CRA)
```json
{
  "federal": {
    "jurisdiction": "Canada Revenue Agency",
    "status": "verified",
    "taxDebtItems": [
      {
        "taxType": "GST/HST",
        "accountNumber": "RT0001",
        "amountOwing": 0,
        "status": "compliant",
        "lastFiling": "2024-02-28",
        "paymentArrangements": null
      }
    ],
    "overallCompliance": "compliant",
    "procurementEligible": true,
    "clearanceLetterRequired": false
  }
}
```

### Provincial Tax Debt Examples

#### Ontario
```json
{
  "provincial": {
    "jurisdiction": "Ontario Ministry of Finance", 
    "status": "verified",
    "taxDebtItems": [
      {
        "taxType": "Corporation Tax",
        "amountOwing": 0,
        "status": "compliant",
        "lastReturn": "2024-01-31"
      },
      {
        "taxType": "Employer Health Tax",
        "amountOwing": 2500.00,
        "status": "payment_arrangement",
        "paymentArrangement": {
          "agreementDate": "2024-01-15",
          "monthlyPayment": 500.00,
          "nextPaymentDue": "2024-04-15",
          "compliantWithArrangement": true
        }
      }
    ]
  }
}
```

#### Quebec
```json
{
  "provincial": {
    "jurisdiction": "Revenu Québec",
    "status": "verified",
    "taxDebtItems": [
      {
        "taxType": "Quebec Sales Tax (QST)", 
        "registrationNumber": "1234567890TQ0001",
        "amountOwing": 0,
        "status": "compliant"
      },
      {
        "taxType": "Quebec Income Tax",
        "amountOwing": 0,
        "status": "compliant"
      }
    ],
    "certificateOfCompliance": {
      "available": true,
      "validUntil": "2024-06-15"
    }
  }
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "TAX_DEBT_VERIFICATION_FAILED",
    "message": "Unable to verify tax debt status",
    "details": {
      "jurisdiction": "ON",
      "reason": "Business not found in provincial registry",
      "retryable": false
    },
    "timestamp": "2024-03-15T10:30:00Z",
    "verificationId": "vrf-987654321"
  }
}
```

### Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `INVALID_BUSINESS_NUMBER` | Business number format invalid | No |
| `BUSINESS_NOT_FOUND` | Business not found in jurisdiction | No |
| `JURISDICTION_UNAVAILABLE` | Tax system temporarily unavailable | Yes |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Yes |
| `AUTHENTICATION_FAILED` | Invalid API credentials | No |
| `INSUFFICIENT_PERMISSIONS` | Missing required permissions | No |
| `TAX_DEBT_VERIFICATION_FAILED` | Verification process failed | Maybe |

## Rate Limits

- Standard: 100 requests per minute
- Bulk: 10 batch requests per minute
- Enterprise: Custom limits available

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1646394000
```

## Webhooks

Register webhooks to receive real-time updates on verification status.

### Webhook Events

#### `tax_debt.verification.completed`
```json
{
  "event": "tax_debt.verification.completed",
  "timestamp": "2024-03-15T10:30:00Z",
  "data": {
    "verificationId": "vrf-987654321",
    "businessNumber": "123456789RC0001",
    "procurementEligible": true,
    "hasAnyDebt": false
  }
}
```

#### `tax_debt.verification.failed`
```json
{
  "event": "tax_debt.verification.failed",
  "timestamp": "2024-03-15T10:30:00Z",
  "data": {
    "verificationId": "vrf-987654321",
    "businessNumber": "123456789RC0001",
    "error": {
      "code": "BUSINESS_NOT_FOUND",
      "message": "Business not found in federal registry"
    }
  }
}
```

## SDK Examples

### Node.js
```javascript
const { TaxDebtClient } = require('@indigenous-platform/tax-debt-sdk');

const client = new TaxDebtClient({
  apiKey: process.env.TAX_DEBT_API_KEY,
  baseUrl: 'https://api.indigenous-platform.ca'
});

// Single verification
const result = await client.verifyTaxDebt({
  businessNumber: '123456789RC0001',
  legalName: 'Example Corp',
  province: 'ON'
});

// Bulk verification
const results = await client.verifyBulkTaxDebt({
  businesses: [
    { businessNumber: '123456789RC0001', province: 'ON' },
    { businessNumber: '987654321RC0001', province: 'BC' }
  ]
});
```

### Python
```python
from tax_debt_sdk import TaxDebtClient

client = TaxDebtClient(
    api_key=os.environ['TAX_DEBT_API_KEY'],
    base_url='https://api.indigenous-platform.ca'
)

# Single verification
result = client.verify_tax_debt(
    business_number='123456789RC0001',
    legal_name='Example Corp',
    province='ON'
)

# Check status
status = client.get_verification_status('vrf-987654321')
```

### cURL
```bash
# Verify tax debt
curl -X POST https://api.indigenous-platform.ca/tax-debt/verify \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "businessNumber": "123456789RC0001",
    "legalName": "Example Corp",
    "province": "ON"
  }'

# Check verification status  
curl -H "X-API-Key: $API_KEY" \
  https://api.indigenous-platform.ca/tax-debt/status/vrf-987654321
```

## Compliance & Security

### Data Protection
- All data encrypted in transit (TLS 1.3) and at rest (AES-256)
- PII handling complies with PIPEDA and provincial privacy laws
- Audit logging for all verification requests
- Data retention policies enforced

### Regulatory Compliance
- **PIPEDA**: Personal Information Protection and Electronic Documents Act
- **Provincial Privacy Acts**: BC PIPA, Alberta PIPA, Quebec Act 25
- **Government Procurement**: Treasury Board Secretariat guidelines
- **Tax Confidentiality**: CRA confidentiality requirements

### Security Features
- API key authentication with scoped permissions
- Rate limiting and DDoS protection
- Request signing and integrity validation
- Real-time fraud detection
- IP whitelisting support

## Support & SLA

### Service Level Agreement
- **Uptime**: 99.9% availability
- **Response Time**: < 2 seconds average
- **Support**: 24/7 for enterprise customers

### Support Channels
- Documentation: [docs.indigenous-platform.ca](https://docs.indigenous-platform.ca)
- API Status: [status.indigenous-platform.ca](https://status.indigenous-platform.ca)  
- Email: api-support@indigenous-platform.ca
- Enterprise: Dedicated support manager

### Monitoring
- Real-time status dashboard
- Performance metrics
- Error rate monitoring
- Jurisdiction availability status