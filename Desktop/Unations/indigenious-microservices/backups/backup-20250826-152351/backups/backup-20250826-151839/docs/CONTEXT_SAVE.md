# Indigenous Platform - Context Save

## Current Status ✅
The Indigenous Procurement Platform is **fully operational** with all features working.

## Running Services

### 1. PostgreSQL Database (Docker)
- **Port**: 5434
- **Database**: indigenous_platform
- **Credentials**: postgres / indigenous123
- **Status**: Running with seeded data

### 2. Next.js Frontend
- **URL**: http://localhost:8081
- **Directory**: `/Users/Jon/Desktop/Unations/indigenious-microservices/indigenious-web-frontend`
- **Command**: `npm run dev`
- **Status**: Running

## To Start Everything in New Terminal

```bash
# 1. Navigate to project directory
cd /Users/Jon/Desktop/Unations/indigenious-microservices/indigenious-web-frontend

# 2. Start PostgreSQL (if not running)
cd ..
docker-compose -f docker-compose-infrastructure.yml up -d

# 3. Start the Next.js app
cd indigenious-web-frontend
npm run dev

# The app will be available at http://localhost:8081
```

## Test Credentials

### Buyer Account
- **Email**: buyer@gov.ca
- **Password**: buyer123
- **Role**: BUYER (can create RFQs)

### Supplier Account 1
- **Email**: supplier1@indigenous.ca
- **Password**: supplier123
- **Business**: Eagle Tech Solutions (IT Services)

### Supplier Account 2
- **Email**: supplier2@indigenous.ca
- **Password**: supplier123
- **Business**: Northern Construction Group

## Key URLs

- **Homepage**: http://localhost:8081
- **Login**: http://localhost:8081/auth/login
- **Register**: http://localhost:8081/auth/register
- **Dashboard**: http://localhost:8081/dashboard (requires login)
- **RFQs**: http://localhost:8081/rfqs (requires login)

## API Endpoints

All APIs are on port 8081:
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Check authentication
- `POST /api/auth/logout` - Logout
- `GET /api/businesses` - List businesses
- `POST /api/businesses` - Create business
- `GET /api/rfqs` - List RFQs
- `POST /api/rfqs` - Create RFQ
- `GET /api/rfqs/[id]/bids` - List bids for RFQ
- `POST /api/rfqs/[id]/bids` - Submit bid

## Database Info

### Connection String
```
postgresql://postgres:indigenous123@localhost:5434/indigenous_platform
```

### Key Tables
- `users` - User accounts
- `businesses` - Business profiles
- `rfqs` - Request for Quotations
- `bids` - Bid submissions
- `categories` - Business/RFQ categories
- `profiles` - User profiles
- `documents` - Uploaded documents
- `messages` - User messages
- `notifications` - System notifications

## Project Structure

```
indigenious-microservices/
├── indigenious-web-frontend/     # Next.js frontend app
│   ├── app/                      # App router pages
│   │   ├── api/                  # API routes
│   │   ├── auth/                 # Auth pages
│   │   ├── dashboard/            # Dashboard
│   │   └── rfqs/                 # RFQ pages
│   ├── prisma/                   # Database schema
│   │   ├── schema.prisma         # Prisma schema
│   │   └── seed.ts              # Seed script
│   ├── lib/                      # Utilities
│   │   └── auth-simple.ts       # Auth functions
│   └── contexts/                 # React contexts
│       └── auth-context.tsx     # Auth context
├── docker-compose-infrastructure.yml
└── CONTEXT_SAVE.md              # This file
```

## Authentication System

We're using a **custom JWT authentication** system (not NextAuth):
- JWT tokens stored in HTTP-only cookies
- Token verification on protected routes
- Role-based access control (BUYER/SUPPLIER/ADMIN)

## Recent Changes

1. **Removed NextAuth v5** due to Next.js 15 compatibility issues
2. **Implemented custom JWT auth** with bcrypt and jsonwebtoken
3. **Fixed all API routes** to use the new auth system
4. **Updated frontend** to properly handle API responses
5. **Seeded database** with test users and data

## Environment Variables

File: `.env.local`
```env
DATABASE_URL="postgresql://postgres:indigenous123@localhost:5434/indigenous_platform"
NEXTAUTH_URL="http://localhost:8081"
NEXTAUTH_SECRET="indigenous-platform-secret-key-change-in-production"
JWT_SECRET="indigenous-platform-jwt-secret"
API_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
```

## Common Commands

```bash
# Run development server
npm run dev

# Run database migrations
DATABASE_URL="postgresql://postgres:indigenous123@localhost:5434/indigenous_platform" npx prisma migrate dev

# Seed database
DATABASE_URL="postgresql://postgres:indigenous123@localhost:5434/indigenous_platform" npm run seed

# Generate Prisma client
npx prisma generate

# Check database in Prisma Studio
DATABASE_URL="postgresql://postgres:indigenous123@localhost:5434/indigenous_platform" npx prisma studio
```

## Testing the Platform

1. **Test Login**:
```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@gov.ca","password":"buyer123"}'
```

2. **Test API Access**:
```bash
# Get businesses
curl http://localhost:8081/api/businesses

# Get RFQs
curl http://localhost:8081/api/rfqs
```

## Current Data in Database

- **3 Users**: 1 buyer, 2 suppliers
- **2 Businesses**: Both Indigenous-certified
- **3 RFQs**: Various budgets from $25k to $750k
- **2 Bids**: Submitted on different RFQs
- **5 Categories**: IT, Construction, Professional Services, Office Supplies, Transportation

## AWS Deployment (NEW)

### AWS Infrastructure Created
- **Terraform Configuration**: `aws-infrastructure.tf`
  - AWS GovCloud (us-gov-west-1) for data sovereignty
  - RDS PostgreSQL (encrypted, 30-day backups)
  - Cognito User Pool for authentication
  - Lambda functions for API
  - S3 + CloudFront for frontend
  - VPC with public/private subnets
  - Security groups for network isolation

### Deployment Scripts
1. **`aws-quick-setup.sh`** - Configure AWS credentials
2. **`deploy-aws.sh`** - Complete one-command deployment
3. **`AWS_SETUP_GUIDE.md`** - Comprehensive setup documentation

### To Deploy to AWS:
```bash
# 1. Configure AWS credentials
./aws-quick-setup.sh

# 2. Deploy everything
./deploy-aws.sh
```

### AWS Cost Estimates
- **Development**: ~$30-50/month
- **Production**: ~$150-200/month
- **Free Tier**: First year covers most services

### Test Accounts (after deployment)
- Admin: admin@test.indigenous / TestPass123!
- Buyer: buyer@test.indigenous / TestPass123!
- Supplier: supplier@test.indigenous / TestPass123!

## Docker Deployment (Alternative)

### Simple Docker Setup
- **File**: `docker-compose.simple.yml`
- Only 3 containers: PostgreSQL, Redis, Frontend
- Quick local testing without full microservices

```bash
docker-compose -f docker-compose.simple.yml up
```

## Next Steps

### Immediate (with Fred):
- [x] Create AWS deployment infrastructure
- [ ] Configure AWS credentials
- [ ] Deploy to AWS
- [ ] Test with collaborators

### Short-term:
- [ ] Connect all 16 periodic table elements to services
- [ ] Implement remaining microservices
- [ ] Add real-time messaging
- [ ] Create business verification workflow

### Long-term:
- [ ] AWS GovCloud migration for full sovereignty
- [ ] Add monitoring and logging
- [ ] Set up CI/CD pipeline
- [ ] Scale to production load

## Troubleshooting

### If PostgreSQL is not running:
```bash
cd /Users/Jon/Desktop/Unations/indigenious-microservices
docker-compose -f docker-compose-infrastructure.yml up -d
```

### If Next.js won't start:
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### If authentication fails:
- Check cookies are enabled in browser
- Verify JWT_SECRET in .env.local
- Try clearing browser cookies

---

**Platform is ready to use!** Just start the services and navigate to http://localhost:8081