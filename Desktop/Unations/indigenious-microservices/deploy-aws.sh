#!/bin/bash

# Indigenous Digital Forest - AWS Deployment Script
# Complete deployment to AWS GovCloud with proper security

set -e

echo "🌲 ===========================================" 
echo "🌲 INDIGENOUS DIGITAL FOREST"
echo "🌲 AWS GovCloud Deployment"
echo "🌲 ==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found${NC}"
        echo "   Install: brew install awscli"
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}❌ Terraform not found${NC}"
        echo "   Install: brew install terraform"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        echo "   Run: aws configure"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met!${NC}"
}

# Build Lambda functions
build_lambda() {
    echo "🔨 Building Lambda functions..."
    
    # Create Lambda deployment package
    cd indigenious-web-frontend
    
    # Install production dependencies
    npm ci --production
    
    # Create deployment package
    zip -r ../lambda_function.zip . \
        -x "*.git*" \
        -x "node_modules/aws-sdk/*" \
        -x "*.md" \
        -x "test/*"
    
    cd ..
    
    echo -e "${GREEN}✅ Lambda package created${NC}"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    echo "🏗️ Deploying AWS infrastructure..."
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -out=tfplan
    
    # Apply deployment
    terraform apply tfplan
    
    echo -e "${GREEN}✅ Infrastructure deployed${NC}"
}

# Run database migrations
run_migrations() {
    echo "🌱 Running database migrations..."
    
    # Get database endpoint from Terraform
    DB_ENDPOINT=$(terraform output -raw database_endpoint)
    
    # Run Prisma migrations
    cd indigenious-web-frontend
    DATABASE_URL="postgresql://indigenous_admin:${DB_PASSWORD}@${DB_ENDPOINT}/indigenous_platform" \
        npx prisma migrate deploy
    
    cd ..
    
    echo -e "${GREEN}✅ Database migrations complete${NC}"
}

# Create initial admin user
create_admin_user() {
    echo "👤 Creating admin user..."
    
    # Use AWS Cognito to create admin user
    aws cognito-idp admin-create-user \
        --user-pool-id $(terraform output -raw cognito_user_pool_id) \
        --username admin@indigenous.forest \
        --user-attributes \
            Name=email,Value=admin@indigenous.forest \
            Name=custom:role,Value=ADMIN \
        --message-action SUPPRESS \
        --temporary-password "TempPass123!"
    
    echo -e "${GREEN}✅ Admin user created${NC}"
    echo -e "${YELLOW}   Email: admin@indigenous.forest${NC}"
    echo -e "${YELLOW}   Temp Password: TempPass123!${NC}"
}

# Deploy frontend to S3/CloudFront
deploy_frontend() {
    echo "🚀 Deploying frontend..."
    
    cd indigenious-web-frontend
    
    # Build Next.js for production
    npm run build
    
    # Export static files
    npm run export
    
    # Upload to S3
    aws s3 sync out/ s3://indigenous-digital-forest-assets/ \
        --delete \
        --cache-control "public, max-age=31536000"
    
    # Invalidate CloudFront cache
    aws cloudfront create-invalidation \
        --distribution-id $(terraform output -raw cloudfront_distribution_id) \
        --paths "/*"
    
    cd ..
    
    echo -e "${GREEN}✅ Frontend deployed${NC}"
}

# Configure monitoring
setup_monitoring() {
    echo "📊 Setting up monitoring..."
    
    # Create CloudWatch dashboard
    aws cloudwatch put-dashboard \
        --dashboard-name IndigenousDigitalForest \
        --dashboard-body file://cloudwatch-dashboard.json
    
    # Set up alarms
    aws cloudwatch put-metric-alarm \
        --alarm-name "RDS-CPU-High" \
        --alarm-description "Alert when RDS CPU exceeds 80%" \
        --metric-name CPUUtilization \
        --namespace AWS/RDS \
        --statistic Average \
        --period 300 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2
    
    echo -e "${GREEN}✅ Monitoring configured${NC}"
}

# Create test users for collaborators
create_test_users() {
    echo "👥 Creating test users for collaborators..."
    
    USERS=(
        "buyer@test.indigenous:BUYER"
        "supplier@test.indigenous:SUPPLIER"
        "admin@test.indigenous:ADMIN"
    )
    
    for user_role in "${USERS[@]}"; do
        IFS=':' read -r email role <<< "$user_role"
        
        aws cognito-idp admin-create-user \
            --user-pool-id $(terraform output -raw cognito_user_pool_id) \
            --username $email \
            --user-attributes \
                Name=email,Value=$email \
                Name=custom:role,Value=$role \
            --message-action SUPPRESS \
            --temporary-password "TestPass123!"
        
        echo -e "${GREEN}✅ Created: $email (Role: $role)${NC}"
    done
}

# Display deployment information
show_deployment_info() {
    echo ""
    echo "🎉 ===========================================" 
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo "🎉 ==========================================="
    echo ""
    echo "🌲 Your Indigenous Digital Forest is live on AWS!"
    echo ""
    echo "📍 Access Points:"
    echo "   Frontend:  https://$(terraform output -raw cloudfront_url)"
    echo "   API:       $(terraform output -raw api_gateway_url)"
    echo ""
    echo "🔐 Test Accounts:"
    echo "   Admin:     admin@test.indigenous / TestPass123!"
    echo "   Buyer:     buyer@test.indigenous / TestPass123!"
    echo "   Supplier:  supplier@test.indigenous / TestPass123!"
    echo ""
    echo "📊 Monitoring:"
    echo "   CloudWatch: https://console.aws.amazon.com/cloudwatch"
    echo "   Logs:       /aws/lambda/indigenous-api-handler"
    echo ""
    echo "🔒 Security Notes:"
    echo "   - All data encrypted at rest"
    echo "   - VPC isolation enabled"
    echo "   - IAM roles configured"
    echo "   - CloudTrail audit logging active"
    echo ""
    echo "🌿 Where Economics Meets The Land - Now Live! 🌿"
}

# Main execution
main() {
    check_prerequisites
    
    # Get database password securely
    echo -n "Enter database password: "
    read -s DB_PASSWORD
    echo ""
    export TF_VAR_db_password=$DB_PASSWORD
    
    build_lambda
    deploy_infrastructure
    run_migrations
    create_admin_user
    deploy_frontend
    setup_monitoring
    create_test_users
    show_deployment_info
}

# Handle errors
trap 'echo -e "${RED}❌ Deployment failed! Check the errors above.${NC}"' ERR

# Run main function
main "$@"