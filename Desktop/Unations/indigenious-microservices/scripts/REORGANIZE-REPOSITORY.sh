#!/bin/bash

# ============================================================================
# REPOSITORY REORGANIZATION SCRIPT
# ============================================================================
# This script reorganizes the repository to Fred's clean structure:
# /IndigeniousCA/
#   - service-1/
#   - service-2/
#   - scripts/
#   - docs/
#   - config/
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  REPOSITORY REORGANIZATION - CLEAN STRUCTURE${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "indigenious-auth-service" ]; then
    echo -e "${RED}Error: Not in the microservices directory${NC}"
    exit 1
fi

echo -e "${YELLOW}This will reorganize the repository to:${NC}"
echo "  📁 IndigeniousCA/"
echo "      📁 indigenious-auth-service/"
echo "      📁 indigenious-payment-service/"
echo "      📁 ... (all microservices)"
echo "      📁 scripts/       (deployment & utilities)"
echo "      📁 docs/          (documentation)"
echo "      📁 config/        (configuration files)"
echo "      📄 README.md"
echo "      📄 .gitignore"
echo ""

read -p "Continue with reorganization? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Reorganization cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Creating directory structure${NC}"
echo "======================================="

# Create new directories
mkdir -p scripts
mkdir -p docs
mkdir -p config
mkdir -p .github/workflows

echo "✅ Created directories: scripts/, docs/, config/, .github/workflows/"

echo ""
echo -e "${BLUE}Step 2: Moving deployment scripts${NC}"
echo "===================================="

# Move all shell scripts to scripts/
echo "Moving deployment and utility scripts..."
mv -f *.sh scripts/ 2>/dev/null || true
mv -f deploy-aws-complete.sh scripts/ 2>/dev/null || true
mv -f aws-quick-setup.sh scripts/ 2>/dev/null || true

# Move deploy-aws directory to scripts/
if [ -d "deploy-aws" ]; then
    mv deploy-aws scripts/
    echo "✅ Moved deploy-aws/ to scripts/"
fi

echo "✅ Moved all .sh scripts to scripts/"

echo ""
echo -e "${BLUE}Step 3: Moving documentation${NC}"
echo "=============================="

# Move all markdown docs except README.md
for file in *.md; do
    if [ "$file" != "README.md" ] && [ -f "$file" ]; then
        mv "$file" docs/
        echo "  Moved $file to docs/"
    fi
done

echo "✅ Moved all documentation to docs/"

echo ""
echo -e "${BLUE}Step 4: Moving configuration files${NC}"
echo "===================================="

# Move configuration files
[ -f ".env" ] && mv .env config/
[ -f ".env.example" ] && mv .env.example config/
[ -f "docker-compose.yml" ] && mv docker-compose.yml config/
[ -f "docker-compose.yaml" ] && mv docker-compose.yaml config/
[ -f "package.json" ] && mv package.json config/package.json.backup
[ -f "package-lock.json" ] && mv package-lock.json config/

# Move any SQL files
[ -d "init-databases.sql" ] && mv init-databases.sql config/

echo "✅ Moved configuration files to config/"

echo ""
echo -e "${BLUE}Step 5: Creating main README${NC}"
echo "=============================="

cat > README.md << 'EOF'
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
EOF

echo "✅ Created new README.md"

echo ""
echo -e "${BLUE}Step 6: Creating .gitignore${NC}"
echo "============================"

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
*/node_modules/

# Build outputs
dist/
build/
*.log
.DS_Store

# Environment files
.env
.env.local
.env.*.local
config/.env

# IDE
.vscode/
.idea/
*.swp
*.swo

# AWS
.aws/
*.pem

# Terraform
*.tfstate
*.tfstate.*
.terraform/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
.cache/
EOF

echo "✅ Created .gitignore"

echo ""
echo -e "${BLUE}Step 7: Updating script paths${NC}"
echo "==============================="

# Update paths in deployment scripts
if [ -f "scripts/deploy-aws-complete.sh" ]; then
    # Update CONFIG_DIR path
    sed -i.bak 's|CONFIG_DIR="${PROJECT_ROOT}/deploy-aws"|CONFIG_DIR="${PROJECT_ROOT}/scripts/deploy-aws"|g' scripts/deploy-aws-complete.sh
    
    # Update TERRAFORM_DIR path
    sed -i.bak 's|TERRAFORM_DIR="${CONFIG_DIR}/terraform"|TERRAFORM_DIR="${CONFIG_DIR}/terraform"|g' scripts/deploy-aws-complete.sh
    
    echo "✅ Updated paths in deploy-aws-complete.sh"
fi

echo ""
echo -e "${BLUE}Step 8: Cleaning up${NC}"
echo "==================="

# Remove backup files
rm -f scripts/*.bak 2>/dev/null

# Remove empty directories
rmdir logs 2>/dev/null || true

echo "✅ Cleanup complete"

echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}  ✅ REPOSITORY REORGANIZATION COMPLETE${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo "New structure:"
echo "  📁 IndigeniousCA/"
echo "      📁 indigenious-*/ (78 microservices)"
echo "      📁 scripts/       (all deployment scripts)"
echo "      📁 docs/          (all documentation)"
echo "      📁 config/        (configuration files)"
echo "      📄 README.md      (main readme)"
echo "      📄 .gitignore     (git ignore rules)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the changes: git status"
echo "2. Commit the reorganization: git add . && git commit -m 'refactor: Clean repository structure'"
echo "3. Push to GitHub: git push origin main"
echo ""
echo -e "${GREEN}The repository is now clean and organized! 🎉${NC}"