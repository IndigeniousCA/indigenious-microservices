# Canadian Universal Verification API Documentation

## Overview

The Canadian Universal Verification System provides enterprise-grade business verification across all 13 provinces and territories of Canada. This API enables comprehensive verification of businesses, their workers, Indigenous partnerships, and regulatory compliance.

## Base URL

```
https://api.indigenousprocurement.ca/v1/verification
```

## Authentication

All API requests require authentication using an API key.

```http
Authorization: Bearer YOUR_API_KEY
X-API-Version: 1.0
```

## Rate Limits

- **Standard**: 10 requests per minute
- **Heavy Verification**: 100 requests per hour
- **Batch Operations**: 1000 verifications per day

## Endpoints

### 1. Verify Business Entity

Performs comprehensive verification across all applicable jurisdictions.

#### Request

```http
POST /verify
Content-Type: application/json
```

```json
{
  "businessName": "Northern Construction Inc",
  "businessNumber": "123456789RC0001",
  "legalName": "Northern Construction Incorporated",
  "location": {
    "province": "ON",
    "city": "Thunder Bay",
    "postalCode": "P7B 1A1"
  },
  "indigenousPartnership": {
    "partnerName": "Eagle Lake First Nation",
    "nation": "Ojibway",
    "agreementDate": "2020-01-15",
    "agreementType": "Joint Venture",
    "ownershipPercentage": 51,
    "benefitAgreement": {
      "type": "Revenue Sharing",
      "value": 1000000,
      "duration": "10 years"
    }
  },
  "workers": [
    {
      "name": "John Smith",
      "trades": ["electrician", "plumber"],
      "provinces": ["ON", "MB"],
      "certifications": [
        {
          "type": "Journeyman Electrician",
          "number": "ON-12345",
          "province": "ON",
          "expiry": "2025-12-31",
          "redSeal": true
        }
      ]
    }
  ],
  "projectDetails": {
    "name": "Northern Infrastructure Project",
    "location": "Thunder Bay, ON",
    "value": 5000000,
    "requiredCertifications": ["electrician", "plumber", "carpenter"]
  }
}
```

#### Response

```json
{
  "verificationId": "ver_2024_01_15_uuid",
  "verified": true,
  "confidence": 0.95,
  "confidenceLevel": "very_high",
  "details": {
    "businessVerification": {
      "type": "business",
      "verified": true,
      "confidence": 0.98,
      "businessId": "ON-123456",
      "legalName": "Northern Construction Incorporated",
      "status": "Active",
      "goodStanding": true,
      "registrationDate": "1995-01-01",
      "registeredAddress": {
        "street": "100 Main Street",
        "city": "Thunder Bay",
        "province": "ON",
        "postalCode": "P7B 1A1"
      }
    },
    "indigenousVerification": {
      "type": "indigenous",
      "verified": true,
      "confidence": 0.92,
      "indigenousOwnership": 51,
      "verifiedPartnership": true,
      "nation": "Ojibway",
      "communityEndorsement": true,
      "benefitAgreementValid": true,
      "registryListing": {
        "source": "CCAB",
        "listingDate": "2020-02-01",
        "status": "Active"
      }
    },
    "workerVerifications": [
      {
        "type": "worker",
        "workerName": "John Smith",
        "verified": true,
        "confidence": 0.95,
        "verifiedTrades": [
          {
            "trade": "electrician",
            "province": "ON",
            "certificateNumber": "ON-12345",
            "valid": true,
            "expiry": "2025-12-31"
          }
        ],
        "redSealStatus": true
      }
    ],
    "safetyCompliance": {
      "type": "safety",
      "verified": true,
      "confidence": 0.90,
      "compliantProvinces": [
        {
          "province": "ON",
          "safetyBody": "WSIB",
          "status": "compliant",
          "clearanceNumber": "WSIB-123456",
          "expiryDate": "2024-12-31"
        }
      ]
    },
    "fraudAssessment": {
      "type": "fraud",
      "riskScore": 0.15,
      "riskLevel": "low",
      "indicators": [],
      "recommendations": []
    }
  },
  "systemsChecked": [
    "ON-Provincial",
    "MB-Provincial", 
    "CRA",
    "ISED",
    "ISC",
    "Indigenous-Validator",
    "Trade-Harmonizer",
    "Safety-Compliance",
    "Fraud-Detection"
  ],
  "timeElapsed": 3542,
  "timestamp": "2024-01-15T10:30:00Z",
  "expiresAt": "2025-01-15T10:30:00Z",
  "certificate": "cert_uuid_123",
  "certificateUrl": "https://api.indigenousprocurement.ca/v1/certificates/cert_uuid_123"
}
```

### 2. Batch Verification

Verify multiple businesses in a single request.

#### Request

```http
POST /verify/batch
Content-Type: application/json
```

```json
{
  "requests": [
    {
      "businessName": "Company A",
      "location": { "province": "BC" }
    },
    {
      "businessName": "Company B",
      "businessNumber": "987654321RC0001",
      "location": { "province": "AB" }
    }
  ],
  "options": {
    "parallel": true,
    "stopOnError": false,
    "priority": "normal"
  }
}
```

#### Response

```json
{
  "batchId": "batch_2024_01_15_uuid",
  "totalRequests": 2,
  "successfulVerifications": 2,
  "failedVerifications": 0,
  "results": [
    {
      "request": { "businessName": "Company A" },
      "result": { "verified": true, "confidence": 0.89 }
    },
    {
      "request": { "businessName": "Company B" },
      "result": { "verified": true, "confidence": 0.94 }
    }
  ],
  "timeElapsed": 5234
}
```

### 3. Get Verification Certificate

Retrieve a verification certificate by ID.

#### Request

```http
GET /certificates/{certificateId}
```

#### Response

```json
{
  "id": "cert_uuid_123",
  "issuedAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2025-01-15T10:30:00Z",
  "businessName": "Northern Construction Inc",
  "confidence": 0.95,
  "verificationSummary": {
    "businessRegistration": "Verified",
    "indigenousPartnership": "Verified (51% ownership)",
    "safetyCompliance": "Compliant in ON, MB",
    "tradeQualifications": "1 Red Seal tradesperson verified"
  },
  "signature": "cryptographic_signature_here",
  "verificationUrl": "https://verify.indigenousprocurement.ca/cert_uuid_123"
}
```

### 4. Check Verification Status

Check the status of an ongoing verification.

#### Request

```http
GET /verify/{verificationId}/status
```

#### Response

```json
{
  "verificationId": "ver_2024_01_15_uuid",
  "status": "completed",
  "progress": 100,
  "systemsChecked": 9,
  "systemsTotal": 9,
  "currentSystem": null,
  "estimatedTimeRemaining": 0
}
```

## Error Responses

### Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "errors": [
        {
          "field": "businessNumber",
          "message": "Invalid business number format"
        }
      ]
    }
  }
}
```

### Rate Limit Error

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "retryAfter": 3600,
      "limit": "10 per minute",
      "reset": "2024-01-15T11:00:00Z"
    }
  }
}
```

### Authentication Error

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key",
    "details": {
      "help": "Include valid API key in Authorization header"
    }
  }
}
```

## Data Types

### Province Codes

- `BC` - British Columbia
- `AB` - Alberta
- `SK` - Saskatchewan
- `MB` - Manitoba
- `ON` - Ontario
- `QC` - Quebec
- `NB` - New Brunswick
- `NS` - Nova Scotia
- `PE` - Prince Edward Island
- `NL` - Newfoundland and Labrador
- `YT` - Yukon
- `NT` - Northwest Territories
- `NU` - Nunavut

### Confidence Levels

- `very_high` - 95%+ confidence
- `high` - 80-94% confidence
- `medium` - 60-79% confidence
- `low` - 40-59% confidence
- `very_low` - Below 40% confidence

### Agreement Types

- `Joint Venture`
- `Partnership`
- `Subcontract`
- `Employment`
- `Other`

## Webhooks

Configure webhooks to receive verification events.

### Event Types

- `verification.completed` - Verification finished successfully
- `verification.failed` - Verification failed
- `verification.expired` - Certificate expired

### Webhook Payload

```json
{
  "id": "evt_123",
  "type": "verification.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "verificationId": "ver_2024_01_15_uuid",
    "businessName": "Northern Construction Inc",
    "result": {
      "verified": true,
      "confidence": 0.95
    }
  },
  "signature": "webhook_signature"
}
```

## SDKs

Official SDKs are available for:

- Node.js/TypeScript
- Python
- Go
- Java
- .NET

### Node.js Example

```typescript
import { CanadianVerificationClient } from '@indigenousprocurement/verification';

const client = new CanadianVerificationClient({
  apiKey: process.env.VERIFICATION_API_KEY
});

const result = await client.verifyEntity({
  businessName: 'Northern Construction Inc',
  businessNumber: '123456789RC0001',
  location: { province: 'ON' }
});

console.log(`Verified: ${result.verified}`);
console.log(`Confidence: ${result.confidence}`);
```

## Best Practices

1. **Cache Results**: Verification results are valid for 24 hours. Cache them to avoid unnecessary API calls.

2. **Use Batch Operations**: For multiple verifications, use the batch endpoint for better performance.

3. **Handle Timeouts**: Set appropriate timeouts (recommended: 2 minutes) for verification requests.

4. **Implement Retry Logic**: Use exponential backoff for transient failures.

5. **Monitor Rate Limits**: Track your usage to avoid hitting rate limits.

6. **Validate Input**: Validate business numbers and province codes before sending requests.

7. **Store Certificates**: Keep verification certificates for audit purposes.

## Support

- **Documentation**: https://docs.indigenousprocurement.ca/verification
- **API Status**: https://status.indigenousprocurement.ca
- **Support Email**: api-support@indigenousprocurement.ca
- **Emergency**: 1-800-VERIFY-1 (24/7 for critical issues)

## Changelog

### v1.0.0 (2024-01-15)
- Initial release
- Support for all 13 provinces/territories
- Indigenous partnership verification
- Trade harmonization
- Fraud detection
- Multi-language support (EN/FR)