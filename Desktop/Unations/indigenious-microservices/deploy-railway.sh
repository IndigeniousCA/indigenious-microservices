#!/bin/bash

# Railway Cloud Deployment Script
# Deploys core services to Railway for cloud showcase

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "==========================================================="
echo "    🚂 Railway Cloud Deployment for Indigenous Platform    "
echo "==========================================================="
echo -e "${NC}"

# Check if Railway CLI is installed
check_railway() {
    if ! command -v railway &> /dev/null; then
        echo -e "${YELLOW}Railway CLI not installed. Installing...${NC}"
        curl -fsSL https://railway.app/install.sh | sh
    fi
}

# Login to Railway
login_railway() {
    echo -e "${BLUE}Logging into Railway...${NC}"
    railway login
}

# Create Railway project
create_project() {
    echo -e "${BLUE}Creating Railway project...${NC}"
    railway init -n "indigenous-platform"
}

# Deploy core services
deploy_services() {
    CORE_SERVICES=(
        "indigenious-gateway-service"
        "indigenious-user-service" 
        "indigenious-business-service"
        "indigenious-rfq-service"
        "indigenious-payment-service"
        "indigenious-design-system-service"
    )
    
    for service in "${CORE_SERVICES[@]}"; do
        if [ -d "$service" ]; then
            echo -e "${BLUE}Deploying $service to Railway...${NC}"
            cd "$service"
            
            # Create service in Railway
            railway add
            
            # Set environment variables
            railway variables set NODE_ENV=production
            railway variables set PORT=\${{PORT}}
            
            # Deploy
            railway up --detach
            
            cd ..
            echo -e "${GREEN}✓ $service deployed${NC}"
        fi
    done
}

# Get deployment URLs
get_urls() {
    echo -e "${GREEN}"
    echo "==========================================================="
    echo "Deployment Complete! Your services are available at:"
    echo "==========================================================="
    railway status
    echo -e "${NC}"
}

# Main execution
main() {
    check_railway
    login_railway
    create_project
    deploy_services
    get_urls
    
    echo -e "${GREEN}"
    echo "==========================================================="
    echo "Next Steps:"
    echo "1. Visit https://railway.app/dashboard to manage services"
    echo "2. Configure custom domains if desired"
    echo "3. Set up PostgreSQL and Redis addons"
    echo "4. Monitor logs and metrics"
    echo "==========================================================="
    echo -e "${NC}"
}

# Run if not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi