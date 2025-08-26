# Business Hunter Swarm - Quality Assurance & Testing Guide

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Coverage Requirements](#test-coverage-requirements)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Compliance Testing](#compliance-testing)
9. [Test Data Management](#test-data-management)
10. [CI/CD Integration](#cicd-integration)
11. [Testing Checklist](#testing-checklist)

## Testing Strategy

### Testing Pyramid

```
         /\
        /E2E\        5% - End-to-End Tests
       /------\
      /  Integ  \    15% - Integration Tests  
     /------------\
    /   Unit Tests  \  80% - Unit Tests
   /------------------\
```

### Testing Principles

1. **Test First**: Write tests before implementation (TDD)
2. **Isolated Tests**: Each test should be independent
3. **Fast Feedback**: Unit tests < 10ms, Integration < 100ms
4. **Comprehensive Coverage**: Minimum 80% code coverage
5. **Meaningful Assertions**: Test behavior, not implementation
6. **Clean Test Code**: Tests are documentation

## Test Coverage Requirements

### Coverage Targets

| Component | Unit | Integration | E2E | Total |
|-----------|------|-------------|-----|-------|
| Contact Discovery | 85% | 90% | 95% | 88% |
| Outreach Engine | 85% | 95% | 90% | 90% |
| Deduplication | 90% | 85% | 80% | 87% |
| Compliance | 95% | 95% | 95% | 95% |
| Prioritization | 85% | 80% | 75% | 82% |
| Social Hunters | 80% | 85% | 90% | 84% |
| Analytics | 85% | 90% | 85% | 87% |
| Security | 95% | 95% | 95% | 95% |

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Check coverage thresholds
npm run test:coverage:check
```

## Unit Testing

### Test Structure

```typescript
describe('ComponentName', () => {
  // Setup
  let component: ComponentType;
  let mockDependency: jest.Mocked<DependencyType>;

  beforeEach(() => {
    // Initialize mocks and component
    mockDependency = createMock<DependencyType>();
    component = new ComponentType(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should perform expected behavior when given valid input', async () => {
      // Arrange
      const input = createValidInput();
      const expectedOutput = createExpectedOutput();
      mockDependency.someMethod.mockResolvedValue(mockResponse);

      // Act
      const result = await component.methodName(input);

      // Assert
      expect(result).toEqual(expectedOutput);
      expect(mockDependency.someMethod).toHaveBeenCalledWith(expectedArgs);
      expect(mockDependency.someMethod).toHaveBeenCalledTimes(1);
    });

    it('should handle error cases gracefully', async () => {
      // Arrange
      const input = createInvalidInput();
      mockDependency.someMethod.mockRejectedValue(new Error('Test error'));

      // Act & Assert
      await expect(component.methodName(input)).rejects.toThrow('Test error');
    });
  });
});
```

### Unit Test Examples

#### Contact Discovery Hunter
```typescript
describe('ContactDiscoveryHunter', () => {
  it('should discover contacts using multiple strategies', async () => {
    const business = businessFactory.build({
      name: 'Test Company',
      website: 'https://test.com'
    });

    const result = await hunter.huntContacts(business);

    expect(result.discoveredContacts).toHaveLength(greaterThan(0));
    expect(result.strategies.emailPatterns.attempted).toBeGreaterThan(0);
    expect(result.confidence).toBeBetween(0, 1);
  });
});
```

#### Outreach Engine
```typescript
describe('OutreachEngine', () => {
  it('should send personalized email', async () => {
    const business = businessFactory.build({
      email: 'test@example.com',
      type: BusinessType.INDIGENOUS_OWNED
    });

    mockSendGrid.send.mockResolvedValue({ statusCode: 202 });

    const result = await engine.sendOutreach(business, ChannelType.EMAIL, {
      templateId: 'welcome',
      personalize: true
    });

    expect(result.success).toBe(true);
    expect(result.personalized).toBe(true);
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
  });
});
```

### Mocking Best Practices

```typescript
// Mock external services
jest.mock('axios');
jest.mock('@sendgrid/mail');
jest.mock('openai');

// Mock time-based functions
jest.useFakeTimers();

// Mock file system
jest.mock('fs/promises');

// Mock database
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  pipeline: jest.fn(() => ({
    exec: jest.fn()
  }))
};
```

## Integration Testing

### Database Integration

```typescript
describe('Database Integration', () => {
  let redis: Redis;
  let postgres: Pool;

  beforeAll(async () => {
    // Use test containers
    redis = await createTestRedis();
    postgres = await createTestPostgres();
    await runMigrations(postgres);
  });

  afterAll(async () => {
    await redis.quit();
    await postgres.end();
  });

  it('should persist and retrieve business data', async () => {
    const business = businessFactory.build();
    
    await saveBusinessToDb(postgres, business);
    await cacheBusinessInRedis(redis, business);

    const retrieved = await getBusinessById(business.id);
    
    expect(retrieved).toMatchObject(business);
  });
});
```

### API Integration

```typescript
describe('API Integration', () => {
  let app: Application;
  let server: Server;

  beforeAll(async () => {
    app = createApp({ env: 'test' });
    server = app.listen(0);
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('should discover businesses via API', async () => {
    const response = await request(app)
      .post('/api/business-hunter/discover')
      .set('X-API-Key', testApiKey)
      .send({
        source: 'linkedin',
        filters: { businessType: 'indigenous_owned' }
      });

    expect(response.status).toBe(200);
    expect(response.body.businesses).toBeDefined();
    expect(response.body.businesses.length).toBeGreaterThan(0);
  });
});
```

### Service Integration

```typescript
describe('Service Integration', () => {
  it('should complete discovery to outreach flow', async () => {
    // 1. Discover business
    const discovered = await discoveryService.discover('test-source');
    
    // 2. Enrich business
    const enriched = await enrichmentService.enrich(discovered[0]);
    
    // 3. Check compliance
    const compliance = await complianceEngine.check(enriched);
    expect(compliance.compliant).toBe(true);
    
    // 4. Send outreach
    const outreach = await outreachEngine.send(enriched, {
      channel: 'email',
      campaign: 'test'
    });
    
    expect(outreach.success).toBe(true);
  });
});
```

## End-to-End Testing

### E2E Test Setup

```typescript
// e2e/setup.ts
import { Browser, chromium, Page } from 'playwright';

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false'
  });
});

afterAll(async () => {
  await browser.close();
});

beforeEach(async () => {
  page = await browser.newPage();
  await page.goto(BASE_URL);
});
```

### E2E Test Scenarios

```typescript
describe('Business Discovery E2E', () => {
  it('should discover and claim a business', async () => {
    // 1. Login as admin
    await loginAsAdmin(page);
    
    // 2. Navigate to discovery
    await page.click('[data-testid="nav-discovery"]');
    
    // 3. Start discovery
    await page.fill('[data-testid="source-input"]', 'linkedin');
    await page.click('[data-testid="start-discovery"]');
    
    // 4. Wait for results
    await page.waitForSelector('[data-testid="discovery-results"]');
    
    // 5. View business details
    await page.click('[data-testid="business-0"]');
    
    // 6. Generate claim link
    await page.click('[data-testid="generate-claim-link"]');
    
    // 7. Verify link generated
    const claimUrl = await page.textContent('[data-testid="claim-url"]');
    expect(claimUrl).toMatch(/https:\/\/.*\/claim\?token=.*/);
  });
});
```

### Visual Regression Testing

```typescript
describe('Visual Regression', () => {
  it('should match dashboard screenshot', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const screenshot = await page.screenshot();
    expect(screenshot).toMatchImageSnapshot({
      threshold: 0.1,
      failureThresholdType: 'percent'
    });
  });
});
```

## Performance Testing

### Load Testing

```typescript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp to 200
    { duration: '5m', target: 200 },  // Stay at 200
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function() {
  const params = {
    headers: { 'X-API-Key': __ENV.API_KEY },
  };

  // Test discovery endpoint
  let res = http.get(`${__ENV.BASE_URL}/api/discover`, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### Stress Testing

```typescript
describe('Stress Tests', () => {
  it('should handle 10,000 concurrent discoveries', async () => {
    const promises = Array(10000).fill(null).map(() =>
      discoveryService.discover('test-source')
    );

    const start = Date.now();
    const results = await Promise.allSettled(promises);
    const duration = Date.now() - start;

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    expect(succeeded / results.length).toBeGreaterThan(0.95); // 95% success
    expect(duration).toBeLessThan(60000); // Under 1 minute
  });
});
```

### Memory Leak Detection

```typescript
describe('Memory Leak Tests', () => {
  it('should not leak memory during bulk operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Run 1000 iterations
    for (let i = 0; i < 1000; i++) {
      await discoveryService.discover('test');
      await enrichmentService.enrichBatch(Array(100).fill({}));
      
      if (i % 100 === 0) {
        global.gc(); // Force garbage collection
      }
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;
    
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
  });
});
```

## Security Testing

### Security Test Suite

```typescript
describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .expect(401);
      
      expect(response.body.error).toBe('API key required');
    });

    it('should reject invalid API keys', async () => {
      const response = await request(app)
        .get('/api/businesses')
        .set('X-API-Key', 'invalid-key')
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should prevent SQL injection', async () => {
      const maliciousInput = "'; DROP TABLE businesses; --";
      
      const response = await request(app)
        .post('/api/search')
        .set('X-API-Key', testApiKey)
        .send({ query: maliciousInput })
        .expect(400);
      
      expect(response.body.error).toContain('Invalid input');
    });

    it('should prevent XSS attacks', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      const response = await request(app)
        .post('/api/businesses')
        .set('X-API-Key', testApiKey)
        .send({ name: xssPayload })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(150).fill(null).map(() =>
        request(app)
          .get('/api/businesses')
          .set('X-API-Key', testApiKey)
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
```

### Penetration Testing

```bash
# OWASP ZAP Security Scan
docker run -v $(pwd):/zap/wrk/:rw -t owasp/zap2docker-stable \
  zap-api-scan.py -t https://api.business-hunter.ca/openapi.json \
  -f openapi -r security-report.html

# Nikto Web Scanner
nikto -h https://api.business-hunter.ca -o nikto-report.txt

# SQLMap for SQL Injection
sqlmap -u "https://api.business-hunter.ca/search?q=test" \
  --headers="X-API-Key: $API_KEY" --batch --random-agent
```

## Compliance Testing

### CASL Compliance Tests

```typescript
describe('CASL Compliance', () => {
  it('should include unsubscribe in all marketing emails', async () => {
    const email = await outreachEngine.prepareEmail({
      to: 'test@example.com',
      template: 'marketing',
      purpose: 'commercial'
    });
    
    expect(email.content).toContain('unsubscribe');
    expect(email.headers['List-Unsubscribe']).toBeDefined();
  });

  it('should respect opt-out preferences', async () => {
    await optOutService.add('opted-out@example.com', 'email');
    
    const result = await outreachEngine.send({
      to: 'opted-out@example.com',
      channel: 'email'
    });
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Recipient has opted out');
  });
});
```

### PIPEDA Compliance Tests

```typescript
describe('PIPEDA Compliance', () => {
  it('should handle data access requests', async () => {
    const request = await privacyService.createAccessRequest({
      email: 'user@example.com',
      verified: true
    });
    
    const data = await privacyService.fulfillAccessRequest(request.id);
    
    expect(data).toHaveProperty('personal_information');
    expect(data).toHaveProperty('usage_history');
    expect(data).toHaveProperty('third_party_sharing');
  });

  it('should delete data upon request', async () => {
    const businessId = 'test-business-123';
    await businessService.create({ id: businessId, name: 'Test' });
    
    await privacyService.deleteBusinessData(businessId);
    
    const exists = await businessService.exists(businessId);
    expect(exists).toBe(false);
  });
});
```

## Test Data Management

### Test Data Factory

```typescript
// test/factories/business.factory.ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/en_CA';
import { EnrichedBusiness, BusinessType } from '../../src/types';

export const businessFactory = Factory.define<EnrichedBusiness>(() => ({
  id: faker.datatype.uuid(),
  name: faker.company.name(),
  legalName: faker.company.name() + ' Inc.',
  businessNumber: faker.helpers.replaceSymbols('############RC####'),
  type: faker.helpers.arrayElement(Object.values(BusinessType)),
  email: faker.internet.email(),
  phone: faker.phone.number('+1 ###-###-####'),
  website: faker.internet.url(),
  address: {
    street: faker.address.streetAddress(),
    city: faker.address.city(),
    province: faker.helpers.arrayElement(['ON', 'BC', 'AB', 'QC']),
    postalCode: faker.address.zipCode('A#A #A#')
  },
  description: faker.company.catchPhrase(),
  industry: faker.helpers.arrayElements([
    'Technology',
    'Construction',
    'Retail',
    'Manufacturing'
  ], 2),
  financialInfo: {
    annualRevenue: faker.datatype.number({ min: 100000, max: 10000000 }),
    employeeCount: faker.datatype.number({ min: 1, max: 500 })
  },
  verified: faker.datatype.boolean(),
  confidence: faker.datatype.float({ min: 0.5, max: 1.0 }),
  discoveredAt: faker.date.recent(),
  lastUpdated: faker.date.recent()
}));

// Specialized variants
export const indigenousBusinessFactory = businessFactory.params({
  type: BusinessType.INDIGENOUS_OWNED,
  indigenousDetails: {
    nation: faker.helpers.arrayElement(['Cree', 'Ojibwe', 'Inuit', 'Métis']),
    communityAffiliation: faker.company.name() + ' First Nation',
    certifications: ['CCAB', 'PAR Gold']
  }
});
```

### Test Data Seeding

```typescript
// test/seed/seed-test-data.ts
export async function seedTestData(db: Database) {
  // Clean existing data
  await db.query('TRUNCATE businesses CASCADE');
  
  // Seed businesses
  const businesses = businessFactory.buildList(100, {
    type: BusinessType.INDIGENOUS_OWNED
  });
  
  for (const business of businesses) {
    await db.businesses.insert(business);
  }
  
  // Seed relationships
  for (let i = 0; i < 50; i++) {
    await db.relationships.insert({
      business1: businesses[i].id,
      business2: businesses[i + 50].id,
      type: 'partner'
    });
  }
  
  console.log('Test data seeded successfully');
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/test
          REDIS_URL: redis://localhost:6379
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Run security audit
        run: npm audit --production
      
      - name: Run OWASP dependency check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'business-hunter'
          path: '.'
          format: 'HTML'
```

### Pre-commit Hooks

```yaml
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests related to changed files
npm run test:related -- --passWithNoTests

# Run linting on staged files
npx lint-staged

# Check types
npm run type-check

# Security check
npm audit --production --audit-level=high
```

## Testing Checklist

### Before Each Feature

- [ ] Write unit tests first (TDD)
- [ ] Create test data factories
- [ ] Define integration test scenarios
- [ ] Plan E2E test flows
- [ ] Identify security test cases
- [ ] Consider performance implications

### During Development

- [ ] Run tests continuously (`npm run test:watch`)
- [ ] Maintain test coverage above 80%
- [ ] Mock external dependencies
- [ ] Test error scenarios
- [ ] Test edge cases
- [ ] Update test documentation

### Before Pull Request

- [ ] All tests passing locally
- [ ] Coverage meets requirements
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] Integration tests updated
- [ ] E2E tests cover new features

### After Deployment

- [ ] Smoke tests passing
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify security alerts
- [ ] Review test failures
- [ ] Update test environments

### Weekly Reviews

- [ ] Review flaky tests
- [ ] Update test data
- [ ] Analyze coverage gaps
- [ ] Review test performance
- [ ] Update security tests
- [ ] Plan test improvements

## Test Debugging

### Debug Unit Tests

```bash
# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test.spec.ts

# Debug with VS Code
# Add breakpoint and run "Debug Jest Tests" configuration
```

### Debug E2E Tests

```typescript
// Add to test for debugging
await page.pause(); // Pauses execution

// Run with headed browser
HEADLESS=false npm run test:e2e

// Slow down execution
const browser = await chromium.launch({
  headless: false,
  slowMo: 100 // milliseconds
});
```

### Common Issues

1. **Flaky Tests**
   - Add explicit waits
   - Mock time-dependent code
   - Increase timeouts for CI
   - Use retry mechanisms

2. **Memory Issues**
   - Clear mocks between tests
   - Close database connections
   - Dispose of resources
   - Use `--runInBand` for debugging

3. **Async Issues**
   - Always await async operations
   - Use proper test timeouts
   - Handle promise rejections
   - Mock timers when needed

## Testing Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Playwright Docs](https://playwright.dev/)
- [k6 Performance Testing](https://k6.io/docs/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

For questions or issues, contact the QA team at qa@indigenous-platform.ca.