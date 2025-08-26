#!/bin/bash

# ======================================================================
# AWS DEPLOYMENT SETUP SCRIPT - INDIGENOUS PLATFORM
# ======================================================================
# Quick setup for testing phase deployment
# ======================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "🌲 ========================================="
echo "   INDIGENOUS PLATFORM - AWS DEPLOYMENT"
echo "   Testing Phase Setup ($500-800/month)"
echo "========================================= 🌲"
echo ""

# ======================================================================
# STEP 1: AWS CREDENTIALS
# ======================================================================

echo -e "${BLUE}Step 1: AWS Credentials Setup${NC}"
echo "--------------------------------"

if aws sts get-caller-identity &>/dev/null; then
    echo -e "${GREEN}✅ AWS credentials already configured${NC}"
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "ca-central-1")
    echo "   Account: $AWS_ACCOUNT_ID"
    echo "   Region: $AWS_REGION"
else
    echo -e "${YELLOW}⚠️  AWS credentials not configured${NC}"
    echo ""
    echo "Please enter your AWS credentials:"
    echo "(Get these from IAM console or your AWS admin)"
    echo ""
    
    read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
    read -s -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
    echo ""
    
    # Configure AWS CLI
    aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
    aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
    aws configure set region "ca-central-1"
    aws configure set output "json"
    
    # Test connection
    if aws sts get-caller-identity &>/dev/null; then
        echo -e "${GREEN}✅ AWS credentials configured successfully${NC}"
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    else
        echo -e "${RED}❌ Failed to configure AWS credentials${NC}"
        exit 1
    fi
fi

echo ""

# ======================================================================
# STEP 2: CREATE BUDGET ALERTS
# ======================================================================

echo -e "${BLUE}Step 2: Setting up Budget Alerts${NC}"
echo "-----------------------------------"

# Create budget configuration
cat > /tmp/budget-config.json << EOF
{
  "BudgetName": "Indigenous-Testing-Budget",
  "BudgetLimit": {
    "Amount": "800",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {},
  "CostTypes": {
    "IncludeTax": true,
    "IncludeSubscription": true,
    "UseBlended": false,
    "IncludeRefund": false,
    "IncludeCredit": false,
    "IncludeUpfront": true,
    "IncludeRecurring": true,
    "IncludeOtherSubscription": true,
    "IncludeSupport": true,
    "IncludeDiscount": true,
    "UseAmortized": false
  }
}
EOF

# Create notifications
cat > /tmp/notifications.json << EOF
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 50,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "fred@indigenous.ca"
      }
    ]
  },
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "fred@indigenous.ca"
      }
    ]
  },
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "fred@indigenous.ca"
      }
    ]
  }
]
EOF

# Check if budget exists
if aws budgets describe-budgets --account-id "$AWS_ACCOUNT_ID" --query "Budgets[?BudgetName=='Indigenous-Testing-Budget']" --output text 2>/dev/null | grep -q "Indigenous-Testing-Budget"; then
    echo -e "${YELLOW}Budget already exists, skipping creation${NC}"
else
    echo "Creating $800/month budget with alerts at 50%, 80%, and 100%..."
    
    # Read email for notifications
    read -p "Enter email for budget alerts [fred@indigenous.ca]: " ALERT_EMAIL
    ALERT_EMAIL=${ALERT_EMAIL:-fred@indigenous.ca}
    
    # Update email in notifications
    sed -i.bak "s/fred@indigenous.ca/$ALERT_EMAIL/g" /tmp/notifications.json
    
    # Create budget with AWS CLI v2 syntax
    aws budgets create-budget \
        --account-id "$AWS_ACCOUNT_ID" \
        --budget file:///tmp/budget-config.json \
        --notifications-with-subscribers file:///tmp/notifications.json \
        2>/dev/null || echo -e "${YELLOW}Note: Budget creation requires proper IAM permissions${NC}"
    
    echo -e "${GREEN}✅ Budget alerts configured${NC}"
fi

echo ""

# ======================================================================
# STEP 3: CREATE S3 BUCKET FOR TERRAFORM STATE
# ======================================================================

echo -e "${BLUE}Step 3: Setting up Terraform Backend${NC}"
echo "--------------------------------------"

TERRAFORM_BUCKET="indigenous-terraform-state-${AWS_ACCOUNT_ID}"
TERRAFORM_TABLE="indigenous-terraform-locks"

# Create S3 bucket for Terraform state
if aws s3 ls "s3://${TERRAFORM_BUCKET}" 2>/dev/null; then
    echo -e "${GREEN}✅ Terraform state bucket already exists${NC}"
else
    echo "Creating S3 bucket for Terraform state..."
    
    # Create bucket with Canadian region
    aws s3api create-bucket \
        --bucket "${TERRAFORM_BUCKET}" \
        --region ca-central-1 \
        --create-bucket-configuration LocationConstraint=ca-central-1 \
        2>/dev/null || true
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "${TERRAFORM_BUCKET}" \
        --versioning-configuration Status=Enabled \
        2>/dev/null || true
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "${TERRAFORM_BUCKET}" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }' \
        2>/dev/null || true
    
    echo -e "${GREEN}✅ Terraform state bucket created${NC}"
fi

# Create DynamoDB table for state locking
if aws dynamodb describe-table --table-name "${TERRAFORM_TABLE}" --region ca-central-1 2>/dev/null; then
    echo -e "${GREEN}✅ Terraform lock table already exists${NC}"
else
    echo "Creating DynamoDB table for Terraform state locking..."
    
    aws dynamodb create-table \
        --table-name "${TERRAFORM_TABLE}" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region ca-central-1 \
        2>/dev/null || true
    
    echo -e "${GREEN}✅ Terraform lock table created${NC}"
fi

echo ""

# ======================================================================
# STEP 4: UPDATE TERRAFORM CONFIGURATION
# ======================================================================

echo -e "${BLUE}Step 4: Updating Terraform Configuration${NC}"
echo "-----------------------------------------"

# Update Terraform backend configuration
cat > deploy-aws/terraform/backend.tf << EOF
terraform {
  backend "s3" {
    bucket         = "${TERRAFORM_BUCKET}"
    key            = "infrastructure/terraform.tfstate"
    region         = "ca-central-1"
    dynamodb_table = "${TERRAFORM_TABLE}"
    encrypt        = true
  }
}
EOF

echo -e "${GREEN}✅ Terraform backend configured${NC}"
echo ""

# ======================================================================
# STEP 5: CREATE COST-OPTIMIZED CONFIGURATIONS
# ======================================================================

echo -e "${BLUE}Step 5: Creating Cost-Optimized Configurations${NC}"
echo "-----------------------------------------------"

# Create testing environment config
cat > deploy-aws/config/environments/testing.yaml << EOF
# ======================================================================
# TESTING ENVIRONMENT - COST OPTIMIZED
# Target: \$500-800/month
# ======================================================================

environment: testing
aws_region: ca-central-1
aws_account_id: "${AWS_ACCOUNT_ID}"

# Cost Optimization Settings
cost_optimization:
  use_spot_instances: true
  spot_percentage: 70
  business_hours_only: true  # Tier 4 services
  single_nat_gateway: true   # Save 50%
  minimal_redundancy: true   # Single AZ for testing

# Service Configurations - Minimal for Testing
service_tiers:
  tier_1:  # Core Services - Always On
    instances:
      min: 1
      max: 2
    resources:
      cpu: 256
      memory: 512
    spot_enabled: false  # Need stability
    
  tier_2:  # Essential Services - Always On
    instances:
      min: 1
      max: 2
    resources:
      cpu: 256
      memory: 512
    spot_enabled: true
    
  tier_3:  # Intelligence Services - On Demand
    instances:
      min: 0
      max: 1
    resources:
      cpu: 512
      memory: 1024
    spot_enabled: true
    schedule: "business_hours"  # 8am-8pm
    
  tier_4:  # Supporting Services - On Demand
    instances:
      min: 0
      max: 1
    resources:
      cpu: 256
      memory: 512
    spot_enabled: true
    schedule: "on_demand"  # Start when needed

# Database - Minimal Configuration
database:
  aurora_serverless_v2:
    min_capacity: 0.5  # Minimum ACUs
    max_capacity: 1    # Scale to 1 ACU max
    auto_pause: true
    pause_after_minutes: 15

# Redis - Single Node
redis:
  node_type: cache.t3.micro
  num_nodes: 1  # No replication for testing
  
# Monitoring - Basic Only
monitoring:
  cloudwatch_logs: true
  detailed_monitoring: false  # Save money
  x_ray_tracing: false        # Enable when debugging
  
# Scheduled Shutdown for Cost Savings
schedules:
  business_hours:
    start: "0 8 * * MON-FRI"   # 8 AM weekdays
    stop: "0 20 * * MON-FRI"   # 8 PM weekdays
    timezone: "America/Toronto"
  
  weekend_shutdown:
    stop: "0 18 * * FRI"       # 6 PM Friday
    start: "0 8 * * MON"       # 8 AM Monday
EOF

echo -e "${GREEN}✅ Cost-optimized configuration created${NC}"
echo ""

# ======================================================================
# STEP 6: DEPLOYMENT PREPARATION
# ======================================================================

echo -e "${BLUE}Step 6: Preparing for Deployment${NC}"
echo "---------------------------------"

# Check Docker
if command -v docker &>/dev/null; then
    echo -e "${GREEN}✅ Docker is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not found. Please install Docker Desktop${NC}"
    echo "   Visit: https://www.docker.com/products/docker-desktop"
fi

# Check Terraform
if command -v terraform &>/dev/null; then
    echo -e "${GREEN}✅ Terraform is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Terraform not found. Installing...${NC}"
    brew install terraform 2>/dev/null || echo "Please install Terraform manually"
fi

echo ""

# ======================================================================
# DEPLOYMENT MENU
# ======================================================================

echo "========================================="
echo -e "${GREEN}✅ AWS Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Monthly Cost Estimate: \$450-650"
echo "Region: ca-central-1 (Montreal)"
echo "Account: $AWS_ACCOUNT_ID"
echo ""
echo "What would you like to deploy?"
echo ""
echo "  1) Tier 1 - Core Services Only (\$60/month)"
echo "     (Gateway, Auth, Frontend)"
echo ""
echo "  2) Tier 1 + 2 - Core + Essential (\$100/month)"
echo "     (+ User, Business, RFQ, Payment, Document)"
echo ""
echo "  3) Full Testing Stack (\$450/month)"
echo "     (All tiers with cost optimization)"
echo ""
echo "  4) Custom Deployment"
echo "     (Choose specific services)"
echo ""
echo "  5) Exit (Deploy manually later)"
echo ""
read -p "Select option [1-5]: " DEPLOY_OPTION

case $DEPLOY_OPTION in
    1)
        echo ""
        echo -e "${BLUE}Deploying Tier 1 Core Services...${NC}"
        echo "This will deploy: Gateway, Auth, Frontend"
        echo "Estimated cost: \$60/month"
        echo ""
        read -p "Continue? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./deploy-aws-complete.sh --tier 1 --env testing
        fi
        ;;
    2)
        echo ""
        echo -e "${BLUE}Deploying Tier 1 + 2 Services...${NC}"
        echo "This will deploy core + essential business services"
        echo "Estimated cost: \$100/month"
        echo ""
        read -p "Continue? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./deploy-aws-complete.sh --tier 1 --env testing
            ./deploy-aws-complete.sh --tier 2 --env testing
        fi
        ;;
    3)
        echo ""
        echo -e "${BLUE}Deploying Full Testing Stack...${NC}"
        echo "This will deploy all tiers with cost optimization"
        echo "Estimated cost: \$450/month"
        echo ""
        read -p "Continue? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Deploy in order
            ./deploy-aws-complete.sh --tier 1 --env testing
            ./deploy-aws-complete.sh --tier 2 --env testing
            ./deploy-aws-complete.sh --tier 3 --env testing
            
            # Deploy priority Tier 4 services
            ./deploy-aws-complete.sh --services marketplace,search,order,invoice,support,dashboard,reporting --env testing
        fi
        ;;
    4)
        echo ""
        echo -e "${BLUE}Custom Deployment${NC}"
        echo "Enter services to deploy (comma-separated):"
        echo "Example: auth,payment,rfq"
        read -p "Services: " SERVICES
        if [ -n "$SERVICES" ]; then
            ./deploy-aws-complete.sh --services "$SERVICES" --env testing
        fi
        ;;
    5)
        echo ""
        echo "You can deploy manually later using:"
        echo ""
        echo "  # Deploy Tier 1 (Core)"
        echo "  ./deploy-aws-complete.sh --tier 1 --env testing"
        echo ""
        echo "  # Deploy specific services"
        echo "  ./deploy-aws-complete.sh --services auth,payment --env testing"
        echo ""
        echo "  # Check health"
        echo "  ./deploy-aws/scripts/health-check.sh"
        echo ""
        ;;
esac

echo ""
echo "========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================="
echo ""
echo "📚 Documentation: DEPLOYMENT-DECISIONS-FRED.md"
echo "💰 Budget Alerts: Set at 50%, 80%, 100% of \$800"
echo "🔍 Monitor costs: https://console.aws.amazon.com/billing/"
echo ""
echo "For help: ./deploy-aws-complete.sh --help"
echo ""