# Indigenious RFQ Service

A comprehensive microservice for managing Request for Quotes (RFQs) in the Indigenious Platform. This service handles RFQ creation, bid management, vendor invitations, contract awards, and analytics.

## 🚀 Features

### Core RFQ Management
- **RFQ Creation & Management**: Create, update, and manage RFQs with rich metadata
- **Advanced Search**: Elasticsearch-powered search with filters, location-based queries, and matching
- **RFQ Templates**: Reusable templates for different procurement categories
- **Real-time Analytics**: View counts, bid statistics, and performance metrics

### Bid Management
- **Bid Submission**: Secure bid submission with rate limiting and validation
- **Bid Evaluation**: Scoring system with detailed criteria and feedback
- **Bid Comparison**: Side-by-side comparison tools for procurement officers
- **Bid Tracking**: Complete audit trail of bid lifecycle

### Vendor & Business Integration
- **Smart Matching**: AI-powered matching of RFQs to relevant businesses
- **Vendor Invitations**: Targeted invitations with customizable criteria
- **Indigenous Business Support**: Special handling for Indigenous-owned businesses
- **Business Analytics**: Performance tracking and insights

### Contract Management
- **Contract Awards**: Streamlined contract award process
- **Payment Tracking**: Milestone-based payment processing
- **Contract Analytics**: Performance and compliance monitoring
- **Document Generation**: Automated contract document creation

### Enterprise Features
- **Multi-tenant Security**: Role-based access control with permissions
- **Audit Logging**: Comprehensive audit trails for compliance
- **Notifications**: Real-time notifications for all stakeholders
- **Caching**: Redis-based caching for optimal performance

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: PostgreSQL with Knex.js migrations
- **Cache**: Redis for performance optimization
- **Search**: Elasticsearch for advanced search capabilities
- **Authentication**: JWT-based with role permissions
- **Monitoring**: Winston logging with health checks

### Service Dependencies
- **Auth Service**: Authentication and authorization
- **Business Service**: Business registration and verification
- **Notification Service**: Email, SMS, and push notifications
- **Document Service**: File upload and management

## 📋 API Endpoints

### RFQ Management
```
POST   /api/rfqs                    - Create new RFQ
GET    /api/rfqs                    - Search RFQs
GET    /api/rfqs/:id                - Get RFQ details
PUT    /api/rfqs/:id                - Update RFQ
POST   /api/rfqs/:id/close          - Close RFQ
GET    /api/rfqs/:id/analytics      - Get RFQ analytics
```

### Bid Management
```
POST   /api/rfqs/:rfqId/bids        - Submit bid
GET    /api/rfqs/:rfqId/bids        - Get RFQ bids
GET    /api/rfqs/bids/:bidId        - Get bid details
PUT    /api/rfqs/bids/:bidId        - Update bid
POST   /api/rfqs/bids/:bidId/withdraw - Withdraw bid
POST   /api/rfqs/bids/:bidId/evaluate - Evaluate bid
```

### Templates
```
GET    /api/rfqs/templates          - Get templates
POST   /api/rfqs/templates          - Create template
GET    /api/rfqs/templates/:id      - Get template
PUT    /api/rfqs/templates/:id      - Update template
POST   /api/rfqs/templates/:id/create-rfq - Create RFQ from template
```

### Invitations
```
POST   /api/rfqs/:rfqId/invitations/bulk - Send bulk invitations
POST   /api/rfqs/:rfqId/invitations - Send direct invitation
POST   /api/rfqs/invitations/:id/respond - Respond to invitation
```

### Contracts
```
POST   /api/rfqs/:rfqId/contract/award - Award contract
GET    /api/rfqs/contracts/:id     - Get contract details
PUT    /api/rfqs/contracts/:id     - Update contract
POST   /api/rfqs/contracts/:id/payments/:milestoneId - Process payment
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Elasticsearch 8+

### Local Development

1. **Clone and install dependencies**
```bash
cd indigenious-rfq-service
npm install
```

2. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database setup**
```bash
npm run migration:run
npm run seed:run
```

4. **Start development server**
```bash
npm run dev
```

### Docker Setup

1. **Build and run with Docker Compose**
```bash
docker-compose up --build
```

2. **Run migrations**
```bash
docker-compose exec rfq-service npm run migration:run
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Integration Tests
```bash
# Run with test database
NODE_ENV=test npm run test
```

## 📊 Database Schema

### Core Tables
- `rfqs` - Main RFQ records
- `rfq_locations` - RFQ geographic data
- `rfq_contacts` - Contact information
- `rfq_skills` - Required skills
- `rfq_documents` - Attached documents
- `rfq_analytics` - View and engagement metrics

### Bid Tables
- `bids` - Bid submissions
- `bid_references` - Past project references
- `bid_documents` - Bid attachments
- `bid_evaluations` - Scoring criteria
- `bid_questions` - Q&A responses

### Supporting Tables
- `rfq_templates` - Reusable RFQ templates
- `rfq_invitations` - Vendor invitations
- `contracts` - Contract awards
- `contract_payments` - Payment schedules

## 🔧 Configuration

### Environment Variables
```bash
# Server
NODE_ENV=development
PORT=3004

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/indigenious_dev

# Cache & Search
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# Services
AUTH_SERVICE_URL=http://localhost:3001
NOTIFICATION_SERVICE_URL=http://localhost:3007

# Security
JWT_SECRET=your-secret-key
INTERNAL_SERVICE_TOKEN=service-token
```

### Feature Flags
- `ENABLE_ELASTICSEARCH` - Enable search functionality
- `ENABLE_REDIS_CACHE` - Enable caching
- `ENABLE_RATE_LIMITING` - Enable API rate limiting

## 🔐 Security Features

### Authentication & Authorization
- JWT token validation
- Role-based permissions (USER, BUSINESS_OWNER, GOVERNMENT_OFFICER, ADMIN)
- Business ownership verification
- Indigenous verification requirements

### Data Protection
- Input validation with Joi schemas
- SQL injection prevention
- XSS protection with Helmet
- Rate limiting per IP and user
- Audit logging for compliance

### API Security
- CORS configuration
- Request size limits
- File upload restrictions
- Secure headers

## 📈 Monitoring & Observability

### Health Checks
- `/health` - Basic service health
- `/ready` - Dependency readiness
- `/metrics` - Performance metrics

### Logging
- Structured JSON logging
- Error tracking with stack traces
- Audit trails for all operations
- Performance monitoring

### Analytics
- RFQ view tracking
- Bid submission analytics
- User engagement metrics
- Business performance insights

## 🚀 Deployment

### CI/CD Pipeline
- Automated testing on pull requests
- Security scanning with Snyk
- Docker image building
- Staging and production deployments

### Production Considerations
- Database connection pooling
- Redis clustering for high availability
- Elasticsearch cluster configuration
- Load balancing with multiple instances
- SSL/TLS termination
- Environment-specific configurations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Run linting and type checking
- Follow conventional commits

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

---

**Status**: ✅ **Production Ready** - Extracted from monolith with full functionality

This service provides comprehensive RFQ management capabilities with enterprise-grade security, performance, and reliability features.