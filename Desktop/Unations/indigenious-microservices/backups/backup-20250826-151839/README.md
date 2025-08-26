# 🌲 Indigenous Microservices Platform

## 📁 Repository Structure

```
/IndigeniousCA/
├── indigenious-*/           # All microservices (78 services)
├── scripts/                 # Deployment & utility scripts
│   ├── deploy-aws/         # AWS deployment configuration
│   ├── deploy-aws-complete.sh
│   ├── setup-aws-deployment.sh
│   └── health-check.sh
├── docs/                    # Documentation
│   ├── AWS-DEPLOYMENT-STRATEGY.md
│   ├── DEPLOYMENT-PROCEDURE.md
│   └── AUDIT-REPORTS.md
├── config/                  # Configuration files
│   ├── .env.example
│   └── docker-compose.yml
├── .github/                 # GitHub Actions workflows
│   └── workflows/
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Setup AWS
```bash
cd scripts
./setup-aws-deployment.sh
```

### 2. Deploy Services
```bash
# Deploy core services only
./scripts/deploy-aws-complete.sh --tier 1

# Deploy all services
./scripts/deploy-aws-complete.sh --tier all
```

### 3. Check Health
```bash
./scripts/health-check.sh
```

## 📊 Services Overview

- **Total Services:** 78
- **Services with Code:** 73
- **Ready for Deployment:** 13 core services
- **Platform Status:** 93% complete

## 📚 Documentation

- [Deployment Strategy](docs/AWS-DEPLOYMENT-STRATEGY.md)
- [Deployment Procedure](docs/DEPLOYMENT-PROCEDURE-FOR-FRED.md)
- [Audit Report](docs/GITHUB-AUDIT-REPORT-FRED.md)
- [Architecture Overview](docs/PLATFORM_OVERVIEW.md)

## 💰 Cost Estimates

| Configuration | Monthly Cost | Services |
|--------------|--------------|----------|
| Testing | $60 | Core only (3 services) |
| Staging | $200 | Core + Essential (13 services) |
| Production | $450-650 | All active services |
| Full Scale | $1,500 | All services + HA |

## 🛠️ Development

Each microservice follows this structure:
```
indigenious-[service-name]/
├── src/              # Source code
├── tests/            # Test files
├── package.json      # Dependencies
├── Dockerfile        # Container config
├── README.md         # Service docs
└── .env.example      # Environment vars
```

## 🔧 Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup-aws-deployment.sh` | Initial AWS setup |
| `scripts/deploy-aws-complete.sh` | Deploy services to AWS |
| `scripts/health-check.sh` | Check service health |
| `scripts/audit-services.sh` | Audit all services |

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/IndigeniousCA/indigenious-microservices/issues)
- **Documentation:** [docs/](docs/)
- **AWS Console:** [AWS Management Console](https://console.aws.amazon.com)

## 🎯 Next Steps

1. Configure AWS credentials
2. Deploy Tier 1 services
3. Run health checks
4. Deploy remaining services as needed

---

**Platform Launch Target:** September 30, 2025  
**Current Status:** Ready for deployment 🚀
