# Business Hunter Swarm - Enhanced Components Documentation

## Table of Contents

1. [Contact Discovery & Enrichment](#contact-discovery--enrichment)
2. [Multi-Channel Outreach Engine](#multi-channel-outreach-engine)
3. [Intelligent Deduplication System](#intelligent-deduplication-system)
4. [Compliance & Legal Engine](#compliance--legal-engine)
5. [Business Prioritization System](#business-prioritization-system)
6. [Social Media Hunters](#social-media-hunters)
7. [Analytics & Performance System](#analytics--performance-system)
8. [Advanced Integration Components](#advanced-integration-components)
9. [Security Implementation](#security-implementation)
10. [Testing Guidelines](#testing-guidelines)

## Contact Discovery & Enrichment

### Overview
The Contact Discovery Hunter uses multiple strategies to find and verify business contacts, ensuring high-quality data for outreach campaigns.

### Features
- **6 Discovery Strategies**: Email patterns, Hunter.io API, Clearbit API, web scraping, social media, and WHOIS lookup
- **Multi-Source Verification**: Cross-references data from multiple sources
- **Confidence Scoring**: Assigns confidence levels based on verification methods
- **Phone/Email Validation**: Verifies contact information using Twilio and email verification APIs

### Usage

```typescript
import { ContactDiscoveryHunter } from './core/hunters/ContactDiscoveryHunter';
import { ContactEnricher } from './enrichment/ContactEnricher';

// Initialize hunter
const contactHunter = new ContactDiscoveryHunter(config, redis);

// Discover contacts for a business
const contactResult = await contactHunter.huntContacts(business);

// Enrich with additional data
const enricher = new ContactEnricher(redis);
const enrichedBusiness = await enricher.enrichBusinessWithContacts(business);
```

### API Endpoints

```http
POST /api/business-hunter/contacts/discover
{
  "businessId": "12345",
  "strategies": ["email_patterns", "apis", "web_scraping"],
  "maxContacts": 10
}

Response:
{
  "discoveredContacts": [
    {
      "name": "John Doe",
      "email": "john.doe@company.com",
      "phone": "+1-555-0123",
      "title": "CEO",
      "confidence": 0.95,
      "verified": true,
      "sources": ["hunter.io", "website"]
    }
  ],
  "strategies": {
    "emailPatterns": { "attempted": 18, "found": 3 },
    "hunterIO": { "attempted": 1, "found": 2 },
    "webScraping": { "attempted": 1, "found": 1 }
  }
}
```

### Security Considerations
- All discovered PII is encrypted using AES-256-GCM
- API keys are stored securely and rotated regularly
- Web scraping respects robots.txt and rate limits
- GDPR/PIPEDA compliant data handling

## Multi-Channel Outreach Engine

### Overview
Comprehensive outreach system supporting 10+ communication channels with GPT-4 personalization and A/B testing capabilities.

### Supported Channels
1. **Email** (SendGrid)
2. **SMS** (Twilio)
3. **LinkedIn** (API & Messages)
4. **WhatsApp** (Business API)
5. **Twitter/X** (DMs)
6. **Facebook Messenger**
7. **Instagram** (Business)
8. **Slack** (Workspace)
9. **Voice Calls** (Twilio)
10. **Direct Mail** (Canada Post API)

### Features

#### Personalization Engine
```typescript
const result = await outreachEngine.sendOutreach(business, ChannelType.EMAIL, {
  templateId: 'partnership-intro',
  personalize: true,
  personalizationContext: {
    recentNews: 'Company won innovation award',
    commonConnections: ['Jane Smith', 'Bob Johnson'],
    sharedInterests: ['sustainability', 'technology']
  }
});
```

#### A/B Testing
```typescript
const campaign = await outreachEngine.createCampaign({
  name: 'Q4 Partnership Drive',
  abTest: {
    id: 'subject-line-test',
    variants: [
      { id: 'a', subject: 'Partnership Opportunity with {{company}}' },
      { id: 'b', subject: '{{firstName}}, let\'s discuss a partnership' }
    ],
    splitRatio: [50, 50]
  }
});
```

#### Campaign Management
```typescript
// Create multi-channel campaign
const campaign = await outreachEngine.createCampaign({
  name: 'Indigenous Business Partnership Program',
  channels: [ChannelType.EMAIL, ChannelType.LINKEDIN],
  targetAudience: {
    businessTypes: [BusinessType.INDIGENOUS_OWNED],
    industries: ['Technology', 'Construction'],
    minEmployees: 10
  },
  schedule: {
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-02-15'),
    timezone: 'America/Toronto',
    sendTimes: ['09:00', '14:00'], // Optimal send times
    excludeWeekends: true
  },
  dailyLimit: 500
});

// Execute campaign
const results = await outreachEngine.executeCampaign(campaign.id);
```

### Template System

```typescript
// Create dynamic template
const template = await outreachEngine.createTemplate({
  name: 'Indigenous Welcome Series',
  channel: ChannelType.EMAIL,
  subject: 'Welcome to the Indigenous Business Network, {{businessName}}',
  content: `
    <h1>Kwe/Hello {{contactName}},</h1>
    <p>We're excited to welcome {{businessName}} to our platform.</p>
    {{#if isIndigenousOwned}}
    <p>As an Indigenous-owned business, you have access to exclusive opportunities.</p>
    {{/if}}
    <p>Your account manager is {{accountManager}}.</p>
  `,
  variables: ['businessName', 'contactName', 'isIndigenousOwned', 'accountManager']
});
```

### Compliance Features
- **Opt-Out Management**: Automatic handling of unsubscribes across all channels
- **Consent Tracking**: Records consent for each communication
- **Suppression Lists**: Global and channel-specific suppression
- **Delivery Hours**: Respects timezone-based delivery windows

### Analytics & Reporting

```typescript
const metrics = await outreachEngine.getCampaignMetrics(campaignId);
// Returns:
{
  sent: 1500,
  delivered: 1485,
  opened: 523,
  clicked: 187,
  responded: 45,
  converted: 12,
  revenue: 125000,
  roi: 3.2,
  channelBreakdown: {
    email: { sent: 1000, conversionRate: 0.015 },
    linkedin: { sent: 500, conversionRate: 0.009 }
  }
}
```

## Intelligent Deduplication System

### Overview
Advanced deduplication engine using multiple algorithms to identify and merge duplicate business records.

### Algorithms Implemented
1. **Fuzzy String Matching** (Levenshtein distance)
2. **Phonetic Matching** (Soundex, Metaphone)
3. **Token-Based Matching** (Jaccard similarity)
4. **ML-Based Scoring** (TensorFlow.js)
5. **Business Number Matching**
6. **Domain Matching**
7. **Phone Number Normalization**

### Usage

```typescript
const deduplicationEngine = new DeduplicationEngine(redis);

// Check for duplicates
const result = await deduplicationEngine.findDuplicates(newBusiness, {
  threshold: 0.85,
  checkFields: ['name', 'phone', 'email', 'website'],
  deepCheck: true
});

// Merge duplicates
if (result.duplicates.length > 0) {
  const merged = await deduplicationEngine.mergeBusinesses(
    newBusiness,
    result.duplicates,
    { preservePrimary: true }
  );
}

// Bulk deduplication
const dedupResults = await deduplicationEngine.deduplicateBatch(businesses, {
  strategy: 'aggressive', // or 'conservative'
  autoMerge: true
});
```

### Match Scoring

```typescript
interface MatchScore {
  overall: number;        // 0-1 overall match score
  breakdown: {
    nameMatch: number;    // Fuzzy name matching
    phoneMatch: number;   // Normalized phone comparison
    emailMatch: number;   // Email domain matching
    addressMatch: number; // Address similarity
    industryMatch: number;// Industry overlap
  };
  confidence: 'high' | 'medium' | 'low';
  recommendation: 'merge' | 'review' | 'keep_separate';
}
```

## Compliance & Legal Engine

### Overview
Ensures all business discovery and outreach activities comply with Canadian and international laws.

### Compliance Checks

#### CASL (Canadian Anti-Spam Legislation)
```typescript
const caslCheck = await complianceEngine.checkCASLCompliance({
  recipient: business,
  message: outreachMessage,
  sender: senderInfo
});

if (!caslCheck.compliant) {
  console.log('CASL Issues:', caslCheck.issues);
  // Handle non-compliance
}
```

#### PIPEDA (Personal Information Protection)
```typescript
const pipedaCheck = await complianceEngine.checkPIPEDACompliance({
  dataCollection: collectedData,
  purpose: 'business_development',
  consent: consentRecord
});
```

#### Indigenous Data Sovereignty (OCAP®)
```typescript
const ocapCheck = await complianceEngine.checkOCAPPrinciples({
  business: indigenousBusiness,
  dataUsage: intendedUsage,
  ownership: dataOwnership,
  control: accessControls,
  access: dataAccessPolicy,
  possession: dataLocation
});
```

### Automated Compliance Reports

```typescript
const report = await complianceEngine.generateComplianceReport({
  period: { start: '2024-01-01', end: '2024-01-31' },
  regulations: ['CASL', 'PIPEDA', 'GDPR', 'CCPA'],
  includeDetails: true
});

// Generates PDF/CSV report with:
// - Compliance summary
// - Violations (if any)
// - Remediation actions
// - Audit trail
```

### Web Scraping Compliance

```typescript
const scrapingCheck = await complianceEngine.checkWebScrapingLegality({
  website: 'https://example.com',
  intendedData: ['contact_info', 'business_details'],
  method: 'automated'
});

// Checks:
// - robots.txt compliance
// - Terms of service
// - Rate limiting requirements
// - Data usage restrictions
```

## Business Prioritization System

### Overview
Sophisticated scoring system that evaluates businesses based on 8 key factors with ML-powered recommendations.

### Scoring Factors

1. **Revenue Potential** (20%)
   - Annual revenue estimates
   - Growth trajectory
   - Market position

2. **Procurement History** (15%)
   - Government contracts won
   - Contract values
   - Success rate

3. **Partnership Compatibility** (15%)
   - Industry alignment
   - Complementary services
   - Geographic overlap

4. **Data Quality** (10%)
   - Information completeness
   - Verification status
   - Last updated

5. **Geographic Advantage** (10%)
   - Proximity to opportunities
   - Regional presence
   - Territory coverage

6. **Industry Alignment** (10%)
   - Target industry match
   - Sector growth potential
   - Market demand

7. **Indigenous Partnership** (15%)
   - Ownership structure
   - Community connections
   - Cultural alignment

8. **Engagement History** (5%)
   - Previous interactions
   - Response rates
   - Relationship status

### Usage

```typescript
const prioritizer = new PrioritizationEngine(redis);

// Score individual business
const score = await prioritizer.calculatePriorityScore(business);
// Returns:
{
  overallScore: 0.87,
  tier: PriorityTier.PLATINUM,
  breakdown: {
    revenuePotential: 0.92,
    procurementHistory: 0.85,
    partnershipCompatibility: 0.88,
    // ... other factors
  },
  recommendations: [
    'High-value target for partnership program',
    'Strong procurement track record',
    'Consider premium onboarding'
  ]
}

// Bulk prioritization
const rankings = await prioritizer.rankBusinesses(businesses, {
  weights: {
    revenuePotential: 0.25, // Increase revenue weight
    indigenousPartnership: 0.20
  },
  minScore: 0.6
});
```

### Dynamic Re-prioritization

```typescript
// Set up real-time prioritization
prioritizer.on('business:updated', async (business) => {
  const newScore = await prioritizer.calculatePriorityScore(business);
  if (newScore.tier !== business.currentTier) {
    await prioritizer.updateBusinessTier(business.id, newScore.tier);
  }
});
```

## Social Media Hunters

### Overview
Specialized hunters for major social media platforms with cross-platform aggregation.

### Platform Capabilities

#### LinkedIn Hunter
```typescript
const linkedInHunter = new LinkedInHunter(config, redis);

// Search strategies
const results = await linkedInHunter.hunt('linkedin', {
  queries: ['Indigenous business Canada', 'First Nations enterprise'],
  filters: {
    companySize: ['11-50', '51-200'],
    industries: ['Technology', 'Construction'],
    locations: ['Canada']
  },
  includeEmployees: true,
  maxResults: 1000
});
```

#### Twitter/X Hunter
```typescript
const twitterHunter = new TwitterHunter(config, redis);

// Real-time monitoring
await twitterHunter.monitorKeywords([
  '#IndigenousBusiness',
  '#BuyIndigenous',
  '#FirstNationsBiz'
], {
  realTime: true,
  sentiment: 'positive',
  minFollowers: 100
});
```

#### Instagram Hunter
```typescript
const instagramHunter = new InstagramHunter(config, redis);

// Hashtag discovery
const businesses = await instagramHunter.discoverByHashtags([
  '#indigenousowned',
  '#nativebusiness',
  '#firstnationsmade'
], {
  businessAccountsOnly: true,
  minPosts: 10,
  engagement: 'high'
});
```

#### TikTok Hunter
```typescript
const tiktokHunter = new TikTokHunter(config, redis);

// Trend monitoring
const trending = await tiktokHunter.findTrendingBusinesses({
  hashtags: ['#indigenoustiktok', '#nativebusiness'],
  minViews: 10000,
  businessCategory: true
});
```

### Cross-Platform Aggregation

```typescript
const aggregator = new SocialMediaAggregator(redis);

// Unified search across platforms
const results = await aggregator.startHunting({
  queries: ['Indigenous tech startup'],
  hashtags: ['#indigenoustech'],
  platforms: ['linkedin', 'twitter', 'instagram'],
  deduplication: true,
  maxResults: 5000
});

// Results include:
{
  businesses: [...], // Deduplicated list
  platformStats: {
    linkedin: { discovered: 234, verified: 210 },
    twitter: { discovered: 156, verified: 98 },
    instagram: { discovered: 89, verified: 67 }
  },
  totalUnique: 421
}
```

## Analytics & Performance System

### Overview
Real-time analytics engine with predictive capabilities and comprehensive dashboards.

### Key Metrics Tracked

#### Hunter Performance
- Discovery rate (businesses/hour)
- Data quality scores
- Error rates by source
- API usage and costs
- Cache hit rates

#### Outreach Performance
- Delivery rates by channel
- Open/click rates
- Response rates
- Conversion metrics
- ROI by campaign

#### System Performance
- Processing queues depth
- Response times (p50, p95, p99)
- Resource utilization
- Error rates and types
- Uptime and availability

### Predictive Analytics

```typescript
const analytics = new AnalyticsEngine(redis);

// Get predictions
const predictions = await analytics.generatePredictiveAnalytics();
// Returns:
{
  discoveryForecast: {
    next7Days: 12500,
    confidence: 0.87,
    factors: ['seasonal_trend', 'current_velocity', 'source_availability']
  },
  optimalChannels: [
    { channel: 'email', predictedConversion: 0.024 },
    { channel: 'linkedin', predictedConversion: 0.018 }
  ],
  resourceRecommendations: {
    hunters: 'Scale to 75 hunters for optimal discovery',
    timing: 'Best outreach window: Tuesday-Thursday, 10am-2pm EST'
  }
}
```

### Performance Dashboard

```typescript
const dashboard = new PerformanceDashboard(redis, analytics);

// Real-time metrics
const metrics = await dashboard.getDashboardData();
// Returns:
{
  overview: {
    status: 'healthy',
    uptime: '45.3d',
    discoveryRate: '523/min',
    conversionRate: '2.3%',
    totalBusinesses: 125432,
    activeHunters: 45
  },
  hunters: {
    activeCount: 45,
    totalDiscovered: 125432,
    discoveryTrend: [...], // Time series data
    topPerformers: [...],
    errorRate: 0.003
  },
  outreach: {
    activeCampaigns: 12,
    totalSent: 45678,
    engagementRate: 0.34,
    conversionFunnel: {
      sent: 45678,
      delivered: 45123,
      opened: 15234,
      clicked: 4567,
      converted: 1045
    }
  }
}
```

### Custom Reports

```typescript
// Generate custom analytics report
const report = await analytics.generateReport({
  period: { start: '2024-01-01', end: '2024-01-31' },
  metrics: ['discovery', 'enrichment', 'outreach', 'conversion'],
  groupBy: ['source', 'businessType', 'province'],
  format: 'pdf',
  insights: true // Include AI-generated insights
});
```

## Advanced Integration Components

### Claim Portal Integration

Seamlessly connects discovered businesses to the main platform:

```typescript
const claimPortal = new ClaimPortalIntegration(redis, {
  baseUrl: 'https://platform.indigenous.ca',
  jwtSecret: process.env.JWT_SECRET,
  enableQRCode: true
});

// Generate claim link
const claimLink = await claimPortal.generateClaimLink(business, {
  expiresIn: '7d',
  customBranding: {
    logo: 'https://...',
    primaryColor: '#007AFF'
  }
});

// Returns:
{
  url: 'https://platform.indigenous.ca/claim?token=...',
  shortUrl: 'https://indig.biz/a4x9k2',
  qrCode: 'data:image/png;base64,...',
  expiresAt: '2024-02-07T12:00:00Z'
}
```

### Geographic Intelligence

Location-based analysis and opportunity identification:

```typescript
const geoIntel = new GeographicIntelligence(redis);

// Analyze business location
const analysis = await geoIntel.analyzeBusinessLocation(business);
// Returns:
{
  traditionalTerritory: 'Treaty 6',
  nearestCommunities: [
    { name: 'Enoch Cree Nation', distance: 12, travelTime: 15 },
    { name: 'Alexander First Nation', distance: 45, travelTime: 50 }
  ],
  procurementZones: ['Edmonton Region', 'Northern Alberta'],
  opportunities: [
    {
      type: 'supply_chain',
      description: 'Potential supplier for 3 businesses within 50km',
      partners: ['Company A', 'Company B', 'Company C']
    }
  ]
}

// Find optimal meeting points
const meetingPoints = await geoIntel.calculateMeetingPoints([
  business1.id,
  business2.id,
  business3.id
]);
```

### Relationship Graph Builder

Maps business relationships for strategic insights:

```typescript
const graphBuilder = new RelationshipGraphBuilder(redis);

// Build relationship graph
const graph = await graphBuilder.buildBusinessGraph(business, {
  depth: 2, // Two degrees of separation
  includeCompetitors: true
});

// Analyze influence
const influence = await graphBuilder.calculateInfluenceScore(business.id);
// Returns:
{
  overallScore: 0.78,
  metrics: {
    centrality: 0.82,
    bridging: 0.71,
    reach: 156,
    community: 0.79
  },
  rank: 23, // Out of all businesses
  topConnections: [...]
}

// Find partnership paths
const paths = await graphBuilder.findPaths(business1.id, business2.id);
```

### Automated Campaign Manager

End-to-end campaign automation:

```typescript
const campaignManager = new AutomatedCampaignManager(
  redis,
  swarmOrchestrator,
  outreachEngine,
  prioritizer,
  analytics
);

// Create automated campaign
const campaign = await campaignManager.createCampaign(
  'Q1 Indigenous Partnership Drive',
  {
    workflow: [
      {
        type: 'discovery',
        parameters: { sources: ['linkedin', 'government'], maxResults: 5000 }
      },
      {
        type: 'enrichment',
        parameters: { tasks: ['contacts', 'financials'] },
        delay: 3600000 // 1 hour
      },
      {
        type: 'segmentation',
        parameters: {
          segments: {
            platinum: { minScore: 0.9 },
            gold: { minScore: 0.7 }
          }
        }
      },
      {
        type: 'outreach',
        parameters: {
          segment: 'platinum',
          channels: ['email', 'linkedin'],
          personalize: true
        }
      }
    ],
    triggers: [
      {
        type: 'threshold',
        condition: { metric: 'discovered', value: 1000 },
        action: { type: 'execute', step: 'enrichment' }
      }
    ],
    schedule: {
      cronExpression: '0 9 * * MON-FRI', // 9 AM weekdays
      timezone: 'America/Toronto'
    }
  }
);

// Start campaign
await campaignManager.startCampaign(campaign.id);
```

## Security Implementation

### Enhanced Security Layer

The new `EnhancedSecurityLayer` provides comprehensive security for all components:

#### API Security
- JWT-based authentication
- API key management with permissions
- Rate limiting per endpoint
- IP whitelisting
- Request size limits

#### Data Protection
- AES-256-GCM encryption for PII
- Field-level encryption
- Secure key storage
- Data masking for exports

#### Input Validation
- Zod schema validation
- XSS prevention
- SQL injection protection
- Path traversal prevention
- Template injection protection

#### Compliance
- GDPR data handling
- PIPEDA compliance
- Audit logging
- Consent management
- Right to erasure

#### Monitoring
- Suspicious activity detection
- Real-time security events
- Automated blocking
- Security dashboards

### Security Best Practices

1. **API Keys**
   ```typescript
   const { apiKey, keyId } = await security.generateApiKey({
     name: 'Production Hunter API',
     permissions: ['discovery:read', 'enrichment:write'],
     expiresAt: new Date('2024-12-31'),
     ipWhitelist: ['10.0.0.0/8'],
     rateLimit: 1000 // per hour
   });
   ```

2. **Data Encryption**
   ```typescript
   // Encrypt sensitive data
   const encrypted = security.encrypt(JSON.stringify(contactInfo));
   
   // Store encrypted
   await redis.setex(`contact:${id}`, 86400, JSON.stringify({
     data: encrypted.encrypted,
     iv: encrypted.iv,
     tag: encrypted.tag
   }));
   ```

3. **Request Validation**
   ```typescript
   // Validate business data
   const validation = security.validateBusinessData(requestBody);
   if (!validation.valid) {
     return res.status(400).json({ errors: validation.errors });
   }
   
   // Validate outreach content
   const outreach = security.validateOutreachContent(message);
   if (!outreach.valid) {
     return res.status(400).json({ errors: outreach.errors });
   }
   ```

## Testing Guidelines

### Test Coverage Requirements
- Unit tests: 80% minimum coverage
- Integration tests: All API endpoints
- E2E tests: Critical user journeys
- Performance tests: Load and stress testing
- Security tests: Penetration testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific component tests
npm test -- ContactDiscoveryHunter
npm test -- OutreachEngine

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run security tests
npm run test:security
```

### Test Data Management

```typescript
// Use factories for test data
import { businessFactory, contactFactory } from '../test/factories';

const testBusiness = businessFactory.build({
  type: BusinessType.INDIGENOUS_OWNED,
  verified: true
});

const testContacts = contactFactory.buildList(5);
```

### Mocking Guidelines

1. **External APIs**: Always mock in tests
2. **Database calls**: Use in-memory Redis for speed
3. **AI services**: Mock OpenAI responses
4. **Time-based**: Use fake timers
5. **Network**: Mock axios/fetch calls

### Performance Testing

```typescript
// Load test example
describe('Performance Tests', () => {
  it('should handle 1000 concurrent discoveries', async () => {
    const promises = Array(1000).fill(null).map(() =>
      hunter.discover('test-source')
    );
    
    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(60000); // Under 1 minute
  });
});
```

## Deployment Considerations

### Environment Variables

```env
# Core Configuration
NODE_ENV=production
LOG_LEVEL=info

# Security
ENCRYPTION_KEY=64-character-hex-key
JWT_SECRET=your-jwt-secret
API_KEY_PREFIX=bh_prod

# External APIs
HUNTER_IO_API_KEY=xxx
CLEARBIT_API_KEY=xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
SENDGRID_API_KEY=xxx
LINKEDIN_ACCESS_TOKEN=xxx
OPENAI_API_KEY=xxx

# Database
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Feature Flags
ENABLE_CONTACT_DISCOVERY=true
ENABLE_SOCIAL_MEDIA_HUNTERS=true
ENABLE_AI_PERSONALIZATION=true
ENABLE_PREDICTIVE_ANALYTICS=true
```

### Scaling Considerations

1. **Contact Discovery**: CPU-intensive, scale horizontally
2. **Outreach Engine**: I/O bound, use queue workers
3. **Deduplication**: Memory-intensive, use dedicated instances
4. **Analytics**: Time-series data, consider InfluxDB
5. **Social Hunters**: Rate-limited, distribute across instances

### Monitoring Setup

```yaml
# Prometheus metrics to track
- hunter_contacts_discovered_total
- outreach_messages_sent_total
- deduplication_matches_found
- compliance_checks_performed
- analytics_predictions_generated
- api_request_duration_seconds
- security_events_total
```

### Health Checks

```typescript
// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/health/detailed', async (req, res) => {
  const health = {
    redis: await checkRedis(),
    apis: await checkExternalAPIs(),
    workers: await checkWorkerHealth(),
    queues: await checkQueueDepth()
  };
  
  const status = Object.values(health).every(h => h.status === 'ok') 
    ? 'healthy' 
    : 'degraded';
    
  res.json({ status, checks: health });
});
```

## Support and Maintenance

### Logging Standards
- Use structured logging (JSON format)
- Include correlation IDs
- Log security events separately
- Implement log rotation
- Ship logs to centralized system

### Error Handling
- Never expose internal errors to clients
- Log full stack traces internally
- Provide meaningful error messages
- Implement retry logic for transient failures
- Use circuit breakers for external services

### Documentation Updates
- Keep API docs in sync with code
- Document all configuration options
- Maintain changelog for each component
- Include examples for common use cases
- Regular security documentation review

### Performance Optimization
- Regular database query optimization
- Cache frequently accessed data
- Implement pagination for large datasets
- Use connection pooling
- Monitor and optimize memory usage

For additional support or questions, contact the development team at dev@indigenous-platform.ca.