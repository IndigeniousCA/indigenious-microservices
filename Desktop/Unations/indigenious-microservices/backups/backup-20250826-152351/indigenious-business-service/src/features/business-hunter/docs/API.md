# Business Hunter API Documentation

## Authentication

All API endpoints require authentication using an API key. Include the key in the request headers:

```http
X-API-Key: bh_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or use Bearer token format:

```http
Authorization: Bearer bh_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Base URL

```
Production: https://api.business-hunter.indigenous-platform.ca
Staging: https://api-staging.business-hunter.indigenous-platform.ca
Development: http://localhost:3000/api/business-hunter
```

## Rate Limiting

- Default: 1000 requests per hour
- Burst: 100 requests per minute
- Headers returned:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## Endpoints

### System Status

#### Get System Stats

```http
GET /stats
```

Returns current system statistics and progress.

**Response:**
```json
{
  "totalDiscovered": 125432,
  "indigenousIdentified": 8234,
  "targetBusinesses": 150000,
  "activeHunters": 45,
  "totalHunters": 50,
  "discoveryRate": 523,
  "verificationRate": 412,
  "enrichmentRate": 389,
  "queueDepth": 2341,
  "queues": {
    "discovery": 892,
    "validation": 567,
    "enrichment": 443,
    "export": 439
  },
  "percentComplete": 83.62,
  "estimatedCompletion": "2024-03-15T14:30:00Z"
}
```

#### Get System Health

```http
GET /health
```

Returns detailed system health information.

**Response:**
```json
{
  "status": "healthy",
  "cpu": 45.2,
  "memory": 62.8,
  "disk": 38.5,
  "network": {
    "inbound": 125.4,
    "outbound": 89.2
  },
  "services": {
    "redis": true,
    "postgres": true,
    "hunters": true,
    "enrichers": true
  },
  "alerts": []
}
```

### Hunter Management

#### List All Hunters

```http
GET /hunters
```

Returns status of all hunters in the swarm.

**Response:**
```json
[
  {
    "id": "hunter-gov-001",
    "name": "Government Hunter 001",
    "type": "government",
    "status": "active",
    "discovered": 12543,
    "successRate": 94.2,
    "errorRate": 5.8,
    "lastActive": "2024-02-28T10:15:30Z",
    "uptime": 86400,
    "currentTarget": "canada.ca/businesses",
    "metrics": {
      "requestsPerMinute": 45,
      "avgResponseTime": 234,
      "blockedRequests": 12
    }
  }
]
```

#### Get Hunter Details

```http
GET /hunters/:id
```

Returns detailed information about a specific hunter.

#### Pause Hunter

```http
POST /hunters/:id/pause
```

Temporarily pauses a hunter.

**Response:**
```json
{
  "success": true,
  "message": "Hunter paused successfully"
}
```

#### Resume Hunter

```http
POST /hunters/:id/resume
```

Resumes a paused hunter.

#### Restart Hunter

```http
POST /hunters/:id/restart
```

Restarts a hunter (useful for clearing errors).

#### Scale Hunters

```http
POST /hunters/scale
```

Scales the number of hunters of a specific type.

**Request Body:**
```json
{
  "type": "government",
  "count": 20
}
```

**Response:**
```json
{
  "success": true,
  "message": "Scaled government hunters to 20",
  "previousCount": 10,
  "newCount": 20
}
```

### Hunter Logs

```http
GET /hunters/:id/logs
```

Retrieves recent logs from a specific hunter.

**Query Parameters:**
- `limit`: Number of log entries (default: 100, max: 1000)
- `since`: ISO timestamp to get logs after
- `level`: Log level filter (debug, info, warn, error)

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2024-02-28T10:15:30Z",
      "level": "info",
      "message": "Discovered 5 new businesses",
      "metadata": {
        "source": "ontario.ca",
        "count": 5
      }
    }
  ]
}
```

### Business Discovery

#### Search Businesses

```http
GET /businesses/search
```

Search discovered businesses with filters.

**Query Parameters:**
- `query`: Search term
- `indigenous`: Filter Indigenous businesses (true/false)
- `verified`: Filter verified businesses (true/false)
- `province`: Province code (ON, BC, etc.)
- `industry`: Industry category
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 100)

**Response:**
```json
{
  "results": [
    {
      "id": "biz-123456",
      "name": "Eagle Feather Enterprises Ltd.",
      "legalName": "Eagle Feather Enterprises Limited",
      "registrationNumber": "ON1234567",
      "industry": ["construction", "consulting"],
      "indigenousIdentifiers": {
        "selfIdentified": true,
        "communityAffiliation": "Cree Nation",
        "certifications": ["CCAB", "CAMSC"]
      },
      "verified": true,
      "verificationDate": "2024-02-27T14:30:00Z",
      "taxDebtStatus": {
        "hasDebt": false,
        "procurementEligible": true
      },
      "location": {
        "city": "Toronto",
        "province": "ON",
        "country": "Canada"
      },
      "contact": {
        "website": "https://eaglefeather.ca",
        "email": "info@eaglefeather.ca",
        "phone": "+1-416-555-0123"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2341,
    "pages": 47
  }
}
```

#### Get Business Details

```http
GET /businesses/:id
```

Returns detailed information about a specific business.

### Data Export

#### Export Businesses

```http
POST /export
```

Export businesses in various formats with filters.

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "verified": true,
    "indigenous": true,
    "provinces": ["ON", "BC", "AB"],
    "industries": ["construction", "technology"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  },
  "includeFields": [
    "name",
    "registrationNumber",
    "province",
    "indigenousIdentifiers",
    "verificationStatus",
    "contact"
  ]
}
```

**Response:**
- Content-Type: `text/csv`, `application/json`, or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename=businesses.csv`

### Metrics and Analytics

#### Get Discovery Metrics

```http
GET /metrics
```

Returns detailed discovery metrics.

**Query Parameters:**
- `timeRange`: Time range (1h, 6h, 24h, 7d, 30d)

**Response:**
```json
{
  "timeline": [
    {
      "time": "10:00",
      "discovered": 234,
      "verified": 198,
      "enriched": 187
    }
  ],
  "sourceDistribution": [
    {
      "name": "Government",
      "value": 45234
    },
    {
      "name": "Indigenous Orgs",
      "value": 12543
    }
  ],
  "provincialDistribution": [
    {
      "province": "ON",
      "count": 34521,
      "indigenousCount": 2341
    }
  ],
  "errorRates": [
    {
      "time": "10:00",
      "rate": 2.3,
      "count": 12
    }
  ],
  "dataQuality": {
    "completeness": 94,
    "accuracy": 97,
    "duplicates": 3,
    "enriched": 89
  }
}
```

### Queue Management

#### Get Queue Status

```http
GET /queues
```

Returns current queue depths and processing rates.

**Response:**
```json
{
  "queues": [
    {
      "name": "discovery",
      "depth": 892,
      "processingRate": 234,
      "avgWaitTime": 3.8
    },
    {
      "name": "validation",
      "depth": 567,
      "processingRate": 189,
      "avgWaitTime": 3.0
    }
  ]
}
```

#### Clear Queue

```http
DELETE /queues/:name/clear
```

Clears a specific queue (admin only).

#### Reprocess Failed Items

```http
POST /reprocess-failed
```

Reprocesses all failed items from dead letter queue.

### Compliance and Audit

#### Generate Compliance Report

```http
POST /compliance/report
```

Generates a compliance report for auditing.

**Request Body:**
```json
{
  "type": "SOC2",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response:**
```json
{
  "reportId": "rpt-123456",
  "type": "SOC2",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "generatedAt": "2024-02-01T10:00:00Z",
  "downloadUrl": "/compliance/reports/rpt-123456/download"
}
```

#### Download Compliance Report

```http
GET /compliance/reports/:id/download
```

Downloads a generated compliance report.

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 3600 seconds.",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset": 1709136000
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | API key lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INVALID_REQUEST` | 400 | Request validation failed |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## WebSocket API

Connect to real-time updates:

```javascript
const socket = io('wss://api.business-hunter.indigenous-platform.ca', {
  auth: {
    apiKey: 'your-api-key'
  }
});

// Subscribe to channels
socket.emit('subscribe', { channel: 'dashboard' });

// Listen for updates
socket.on('dashboard:update', (data) => {
  console.log('Update:', data);
});

socket.on('hunter:discovery', (data) => {
  console.log('New discovery:', data);
});

socket.on('system:alert', (alert) => {
  console.log('System alert:', alert);
});
```

### Available Channels

- `dashboard`: General dashboard updates
- `hunters`: Hunter status updates
- `discoveries`: New business discoveries
- `alerts`: System alerts and warnings

## SDK Examples

### Node.js

```javascript
const { BusinessHunterClient } = require('@indigenous-platform/business-hunter-sdk');

const client = new BusinessHunterClient({
  apiKey: process.env.BUSINESS_HUNTER_API_KEY,
  baseUrl: 'https://api.business-hunter.indigenous-platform.ca'
});

// Get system stats
const stats = await client.getStats();

// Search businesses
const businesses = await client.searchBusinesses({
  indigenous: true,
  verified: true,
  province: 'ON'
});

// Export data
const csvData = await client.exportBusinesses({
  format: 'csv',
  filters: { indigenous: true }
});
```

### Python

```python
from business_hunter import BusinessHunterClient

client = BusinessHunterClient(
    api_key=os.environ['BUSINESS_HUNTER_API_KEY'],
    base_url='https://api.business-hunter.indigenous-platform.ca'
)

# Get system stats
stats = client.get_stats()

# Search businesses
businesses = client.search_businesses(
    indigenous=True,
    verified=True,
    province='ON'
)

# Export data
csv_data = client.export_businesses(
    format='csv',
    filters={'indigenous': True}
)
```

### cURL

```bash
# Get system stats
curl -H "X-API-Key: $API_KEY" \
  https://api.business-hunter.indigenous-platform.ca/stats

# Search businesses
curl -H "X-API-Key: $API_KEY" \
  "https://api.business-hunter.indigenous-platform.ca/businesses/search?indigenous=true&province=ON"

# Export businesses
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"format":"csv","filters":{"indigenous":true}}' \
  https://api.business-hunter.indigenous-platform.ca/export \
  -o businesses.csv
```