# Business Hunter Swarm System

> Enterprise-grade distributed system for discovering and verifying 150,000+ Canadian businesses with Indigenous business identification capabilities.

## 🚀 Latest Updates

We've implemented comprehensive enhancements including:
- ✅ **10 Critical Components**: Contact Discovery, Multi-Channel Outreach, Deduplication, Compliance Engine, and more
- ✅ **Enterprise Security**: Enhanced security layer with encryption, authentication, and threat protection
- ✅ **Comprehensive Testing**: Full test coverage for all components with unit, integration, and E2E tests
- ✅ **Complete Documentation**: Security implementation guide, QA testing guide, and enhanced component docs

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Enhanced Components](#enhanced-components)
- [Security](#security)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Compliance](#compliance)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)

## Overview

The Business Hunter Swarm System is a sophisticated, scalable solution designed to discover, validate, enrich, and classify Canadian businesses at scale. Built with enterprise-grade security and compliance in mind, it integrates seamlessly with the Indigenous Business Platform's Canadian Universal Verification System.

### Key Features

- **Distributed Hunter Architecture**: Multiple specialized hunter types working in parallel
- **Real-time Tax Debt Verification**: Integration with all 13 Canadian jurisdictions
- **ML-based Indigenous Classification**: Advanced machine learning for business identification
- **Enterprise Security**: OWASP-compliant security with SOC2, ISO 27001, PIPEDA, and GDPR support
- **Horizontal Scaling**: Kubernetes-based auto-scaling from 10 to 500 hunters
- **Comprehensive Monitoring**: Real-time dashboards with Prometheus and Grafana
- **Multi-format Export**: CSV, JSON, and Excel export capabilities

### System Capabilities

- **Target**: 150,000+ Canadian businesses
- **Discovery Rate**: Up to 10,000 businesses per hour at peak
- **Accuracy**: 95%+ data validation accuracy
- **Uptime**: 99.9% availability SLA
- **Security**: End-to-end encryption, API key management, rate limiting
- **Compliance**: Full audit logging with regulatory report generation

## Enhanced Components

The system now includes 10 critical components for comprehensive business discovery:

1. **Contact Discovery & Enrichment** - Multi-strategy contact finding with verification
2. **Multi-Channel Outreach Engine** - 10+ channels with GPT-4 personalization
3. **Intelligent Deduplication System** - ML-powered duplicate detection
4. **Compliance & Legal Engine** - CASL, PIPEDA, OCAP compliance
5. **Business Prioritization System** - 8-factor scoring with AI recommendations
6. **Enhanced Social Media Hunters** - LinkedIn, Twitter, Instagram, TikTok
7. **Analytics & Performance System** - Real-time metrics with predictive analytics
8. **Performance Dashboard** - Live monitoring and visualization
9. **Claim Portal Integration** - Seamless platform connection with QR codes
10. **Geographic Intelligence** - Location-based opportunities and optimization

For detailed documentation, see [ENHANCED_COMPONENTS.md](docs/ENHANCED_COMPONENTS.md)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Business Hunter Swarm                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Hunters   │  │ Validators  │  │  Enrichers  │         │
│  │             │  │             │  │             │         │
│  │ - Government│  │ - Schema    │  │ - Canadian  │         │
│  │ - Indigenous│  │ - Business  │  │   Verification│        │
│  │ - Social    │  │ - Duplicate │  │ - Tax Debt  │         │
│  │ - Registry  │  │ - Quality   │  │ - ML Class  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │                 │
│         └─────────────────┴─────────────────┘                │
│                           │                                   │
│                    ┌──────▼──────┐                          │
│                    │   Queues    │                          │
│                    │             │                          │
│                    │ - Discovery │                          │
│                    │ - Validation│                          │
│                    │ - Enrichment│                          │
│                    │ - Export    │                          │
│                    └──────┬──────┘                          │
│                           │                                   │
│         ┌─────────────────┴─────────────────┐               │
│         │                                     │               │
│    ┌────▼─────┐                    ┌─────────▼──────┐       │
│    │ Storage  │                    │  Orchestrator  │       │
│    │          │                    │                │       │
│    │ - Redis  │                    │ - Coordination │       │
│    │ - PostgreSQL                 │ - Scaling      │       │
│    └──────────┘                    │ - Monitoring  │       │
│                                    └────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Hunter Types

1. **GovernmentHunter**: Discovers businesses from federal and provincial government sources
2. **IndigenousOrgHunter**: Searches Indigenous organization databases and directories
3. **SocialMediaHunter**: Identifies businesses through social media platforms
4. **BusinessRegistryHunter**: Queries official business registries across Canada

### Data Pipeline

```
Discovery → Validation → Enrichment → Classification → Export
    ↓           ↓            ↓             ↓            ↓
  Queue      Queue        Queue         Queue      Platform
```

## Security

The system now includes an **Enhanced Security Layer** providing comprehensive protection:

### Security Features

- **API Key Management**: Secure generation, rotation, and revocation with granular permissions
- **Data Encryption**: AES-256-GCM encryption for all sensitive data
- **Input Validation**: Zod-based schema validation with XSS and injection prevention
- **Rate Limiting**: Configurable per-endpoint limits with DDoS protection
- **Threat Detection**: Real-time suspicious activity monitoring and automated blocking
- **Compliance**: GDPR, PIPEDA, and CASL compliant data handling
- **Audit Logging**: Comprehensive security event tracking and reporting

For complete security documentation, see [SECURITY_IMPLEMENTATION.md](docs/SECURITY_IMPLEMENTATION.md)

### Authentication & Authorization

The system implements multiple layers of security:

```typescript
// API Key Generation
const apiKey = security.generateApiKey({
  name: 'Production API Key',
  permissions: ['read', 'write'],
  rateLimit: 1000,
  ipWhitelist: ['10.0.0.0/8'],
  expiresAt: new Date('2025-12-31')
});
```

### Security Features

- **API Key Management**: Secure generation, rotation, and revocation
- **Rate Limiting**: Per-key and per-IP rate limiting
- **IP Whitelisting**: Restrict access to specific IP ranges
- **Request Validation**: Zod-based schema validation
- **Input Sanitization**: XSS and injection prevention
- **Encryption**: AES-256-GCM for sensitive data
- **JWT Tokens**: Inter-service authentication
- **Audit Logging**: Complete security event tracking
- **Suspicious Activity Detection**: Automatic IP blocking

### Compliance

- **SOC2 Type II**: Security, availability, and confidentiality controls
- **ISO 27001**: Information security management
- **PIPEDA**: Canadian privacy law compliance
- **GDPR**: European data protection (if applicable)

## Installation

### Prerequisites

- Node.js 18+
- Redis 6+
- PostgreSQL 14+
- Docker & Docker Compose
- Kubernetes cluster (for production)

### Local Development

```bash
# Clone the repository
git clone https://github.com/indigenous-platform/business-hunter.git
cd business-hunter

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Start development environment
docker-compose up -d

# Start the orchestrator
npm run dev:orchestrator
```

### Docker Setup

```bash
# Build images
./scripts/build-hunters.sh

# Run with Docker Compose
docker-compose -f deployment/docker/docker-compose.yml up
```

## Configuration

### Environment Variables

```bash
# Core Configuration
NODE_ENV=production
TARGET_BUSINESSES=150000
HUNTER_COUNT=50

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/business_hunter
REDIS_URL=redis://localhost:6379

# Security
ENCRYPTION_KEY=your-64-char-hex-key
JWT_SECRET=your-jwt-secret
API_KEY_PREFIX=bh_prod

# Canadian Verification System
VERIFICATION_API_URL=https://api.indigenous-platform.ca
VERIFICATION_API_KEY=your-verification-key

# Main Platform Integration
MAIN_PLATFORM_WEBHOOK=https://platform.indigenous.ca/webhook
MAIN_PLATFORM_API_KEY=your-platform-key

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_PASSWORD=secure-password
```

### Hunter Configuration

```typescript
const config: HunterConfig = {
  targetBusinesses: 150000,
  hunterCount: 50,
  enabledHunters: ['government', 'indigenous_org', 'social_media', 'registry'],
  hunterSettings: {
    government: {
      sources: ['federal', 'provincial'],
      rateLimit: 60,
      timeout: 30000
    },
    indigenous_org: {
      organizations: ['AFN', 'ITK', 'MNC'],
      respectfulDelay: 2000
    }
  }
};
```

## API Reference

### Authentication

All API requests require authentication via API key:

```http
GET /api/business-hunter/stats
X-API-Key: bh_prod_xxxxxxxxxxxxx
```

### Endpoints

#### Get System Stats
```http
GET /api/business-hunter/stats

Response:
{
  "totalDiscovered": 125432,
  "indigenousIdentified": 8234,
  "targetBusinesses": 150000,
  "activeHunters": 45,
  "discoveryRate": 523,
  "percentComplete": 83.6
}
```

#### Hunter Management
```http
POST /api/business-hunter/hunters/scale
{
  "type": "government",
  "count": 20
}

POST /api/business-hunter/hunters/:id/pause
POST /api/business-hunter/hunters/:id/resume
POST /api/business-hunter/hunters/:id/restart
```

#### Export Data
```http
POST /api/business-hunter/export
{
  "format": "csv",
  "filters": {
    "verified": true,
    "indigenous": true,
    "provinces": ["ON", "BC"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  }
}
```

### WebSocket Events

Real-time updates via WebSocket:

```javascript
const socket = io('wss://api.business-hunter.ca');

socket.on('dashboard:update', (data) => {
  console.log('New discovery:', data);
});

socket.on('hunter:status', (status) => {
  console.log('Hunter status:', status);
});
```

## Testing

The system includes comprehensive testing at all levels:

### Test Coverage
- **Unit Tests**: 80%+ coverage for all components
- **Integration Tests**: API and service integration
- **E2E Tests**: Critical user journeys
- **Security Tests**: OWASP compliance and penetration testing
- **Performance Tests**: Load and stress testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:performance
```

For complete testing documentation, see [QA_TESTING_GUIDE.md](docs/QA_TESTING_GUIDE.md)

## Deployment

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
./scripts/deploy-hunters.sh production 100

# Scale hunters
kubectl scale deployment/hunter-swarm --replicas=200 -n business-hunter

# Monitor deployment
kubectl get pods -n business-hunter -w
```

### Production Architecture

```yaml
# Recommended Production Setup
- Hunters: 50-500 pods (auto-scaling)
- Redis: Cluster mode with 6 nodes
- PostgreSQL: Primary + 2 read replicas
- Load Balancer: nginx/HAProxy
- CDN: CloudFront/Cloudflare
- Monitoring: Prometheus + Grafana
```

### High Availability

- **Multi-region deployment**: Deploy across 3+ regions
- **Database replication**: PostgreSQL streaming replication
- **Redis Sentinel**: Automatic failover
- **Circuit breakers**: Prevent cascade failures
- **Health checks**: Kubernetes liveness/readiness probes

## Monitoring

### Metrics

Key metrics exposed via Prometheus:

- `hunter_businesses_discovered_total`: Total businesses discovered
- `hunter_discovery_rate`: Current discovery rate per hour
- `hunter_validation_success_rate`: Percentage of valid businesses
- `hunter_enrichment_duration_seconds`: Time to enrich businesses
- `hunter_queue_depth`: Current queue sizes
- `hunter_errors_total`: Error count by type

### Dashboards

Access Grafana dashboards:

```bash
kubectl port-forward -n business-hunter svc/grafana 3000:80
# Open http://localhost:3000
# Default login: admin / <GRAFANA_PASSWORD>
```

Available dashboards:
- **Hunter Swarm Overview**: System-wide metrics
- **Hunter Performance**: Individual hunter metrics
- **Data Quality**: Validation and enrichment stats
- **Infrastructure**: Resource usage and health

### Alerts

Configure alerts in Prometheus/AlertManager:

```yaml
groups:
  - name: business_hunter
    rules:
      - alert: HighErrorRate
        expr: rate(hunter_errors_total[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: LowDiscoveryRate
        expr: hunter_discovery_rate < 100
        for: 15m
        annotations:
          summary: "Discovery rate below threshold"
```

## Compliance

### Audit Logging

All security-relevant events are logged:

```typescript
// Generate compliance reports
const report = await auditLogger.generateComplianceReport(
  startDate,
  endDate,
  'SOC2' // or 'ISO27001', 'PIPEDA', 'GDPR'
);
```

### Data Privacy

- **Data Minimization**: Only collect necessary business information
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Access Control**: Role-based access with principle of least privilege
- **Data Retention**: Configurable retention policies
- **Right to Erasure**: Support for data deletion requests

### Regular Audits

- Security assessments: Quarterly
- Penetration testing: Annually
- Compliance reviews: Semi-annually
- Access reviews: Monthly

## Troubleshooting

### Common Issues

#### Hunters Not Starting
```bash
# Check hunter logs
kubectl logs -n business-hunter -l component=hunter -f

# Common causes:
# - Redis connection issues
# - Invalid API credentials
# - Rate limiting from sources
```

#### High Queue Depth
```bash
# Check queue sizes
redis-cli -h redis.business-hunter.svc.cluster.local
> LLEN queue:discovery
> LLEN queue:validation

# Scale up processors
kubectl scale deployment/business-validator --replicas=20
```

#### Memory Issues
```bash
# Increase memory limits
kubectl edit deployment/hunter-swarm
# Update resources.limits.memory
```

### Performance Tuning

1. **Hunter Optimization**
   - Adjust rate limits based on source capacity
   - Implement caching for frequently accessed data
   - Use connection pooling

2. **Database Optimization**
   - Create appropriate indexes
   - Partition large tables by date
   - Regular VACUUM and ANALYZE

3. **Queue Optimization**
   - Adjust batch sizes
   - Implement priority queues
   - Monitor queue latency

### Support

For production support:
- Email: support@indigenous-platform.ca
- Slack: #business-hunter-support
- On-call: See PagerDuty rotation

## License

Copyright © 2024 Indigenous Business Platform. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.