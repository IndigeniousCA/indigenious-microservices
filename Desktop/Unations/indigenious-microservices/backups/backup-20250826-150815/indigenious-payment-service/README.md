# Indigenous Payment Service

Critical payment processing microservice for the Indigenous Procurement Platform with comprehensive support for Stripe, Interac e-Transfer, and Canadian tax calculations with Indigenous business exemptions.

## 🚨 CRITICAL SERVICE

This is a **CRITICAL** service requiring:
- **80%+ test coverage** ✅
- **Full security validation** ✅  
- **PCI compliance patterns** ✅
- **Comprehensive integration tests** ✅

## Features

### Payment Processing
- **Stripe Integration**: Credit/debit card payments with subscription support
- **Interac e-Transfer**: Canadian bank transfers with security questions
- **Quick Pay**: 24-hour payment processing for government contracts
- **Bulk Payments**: Process multiple Indigenous business payments
- **Refunds**: Full and partial refund support

### Canadian Tax System
- **All Provinces/Territories**: GST, PST, HST calculations
- **Indigenous Exemptions**: 
  - On-reserve delivery exemptions
  - Tax-exempt certificate validation
  - Band number verification
- **Quebec Special Handling**: PST on GST+subtotal calculation

### Security & Compliance
- **PCI DSS Patterns**: No card data storage, tokenization only
- **Webhook Validation**: Signature verification for all providers
- **Rate Limiting**: Protection against abuse
- **Audit Logging**: Complete payment trail
- **JWT Authentication**: Secure API access

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Docker Setup

```bash
# Start all services
docker-compose up

# Start with monitoring
docker-compose --profile monitoring up

# Run tests in Docker
docker-compose exec payment-service npm test
```

## Testing

```bash
# Run all tests with coverage
npm test

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:security    # Security/PCI compliance tests

# Coverage report (>80% required)
npm run test:coverage
```

## Service Status

**Status**: ✅ Production Ready
**Test Coverage**: >80%
**Security Validation**: Complete
**Last Updated**: 2024-08-18
