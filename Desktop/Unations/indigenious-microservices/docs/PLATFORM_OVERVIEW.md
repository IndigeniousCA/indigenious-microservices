# 🌲 Indigenous Digital Forest - Complete Procurement Platform

## ⚠️ IMPORTANT: Repository Name Clarification

**This repository contains the ENTIRE Indigenous Procurement Platform, not just notification services!**

The repo name `indigenious-notification-service` is a legacy naming issue. This is actually:

## 🎯 What This Really Is

### **Indigenous Digital Forest**
A complete procurement platform with **49 microservices** including:

### Core Services (11 Essential)
1. **Frontend** - Next.js web application
2. **API Gateway** - Routes all requests
3. **User Service** - Authentication & authorization
4. **Business Service** - Indigenous business directory
5. **RFQ Service** - Request for Quotation marketplace
6. **Payment Service** - Financial transactions
7. **Banking Service** - Banking integrations
8. **Notification Service** - Alerts & messaging (just ONE of 49 services!)
9. **Design System** - Elemental UI components
10. **PostgreSQL** - Database
11. **Redis** - Cache & pub/sub

### Additional Services (38 more)
- Document Management Service
- AI Intelligence Service
- Chat Service
- Analytics Service
- Compliance Service
- Carbon Justice Service
- Emergency Response Service
- Cultural Calendar Service
- Supply Chain Service
- Governance Service
- And 28 more...

## 📦 What You're Actually Deploying

When you run `./deploy-aws.sh`, you're deploying:

✅ **Complete procurement platform** for Indigenous businesses
✅ **RFQ marketplace** connecting government to Indigenous suppliers  
✅ **Business directory** with verification
✅ **Payment processing** system
✅ **Document management** with CAD/blueprint viewing
✅ **AI-powered bid assistance**
✅ **Real-time chat** and collaboration
✅ **Analytics dashboards**
✅ **All 49 microservices** working together

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│     Indigenous Digital Forest            │
│         49 Microservices Total           │
└─────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
Core Services   Business Logic   Support Services
(11 services)   (25 services)    (13 services)
    │               │               │
    ▼               ▼               ▼
- Gateway       - RFQ System    - Analytics
- Auth          - Payments      - AI/ML
- Database      - Documents     - Monitoring
- Frontend      - Chat          - Backup
- etc.          - etc.          - etc.
```

## 💰 Business Model

- **Indigenous SMEs**: FREE forever
- **Large Indigenous orgs**: Subscription
- **Government departments**: License fees
- **Canadian businesses**: Paid (with strict verification)

## 🎯 Purpose

This platform enables:
- Government to meet 5% Indigenous procurement targets
- Indigenous businesses to win more contracts
- Band councils to control procurement priorities
- Complete digital sovereignty with OCAP® principles

## 🚀 Deployment

This deploys the **ENTIRE PLATFORM**, not just notifications:

```bash
# Configure for Canadian AWS (data sovereignty)
./configure-aws-canada.sh

# Deploy ALL services
./deploy-aws.sh
```

## 📝 Repository Naming Issue

**Why is it called `indigenious-notification-service`?**
- Historical: Started as a single service
- Evolved: Grew into complete platform
- Reality: Contains entire Indigenous Digital Forest

**Future**: Consider migrating to properly named repository:
- `indigenous-digital-forest`
- `indigenous-procurement-platform`
- `indigenous-marketplace`

## 🌲 The Truth

**You are deploying a complete, production-ready procurement platform with 49 microservices, not just a notification service!**

---

*Where Economics Meets The Land* - Complete Platform Ready for Deployment 🌲