#!/bin/bash

# Indigenous Microservices Deployment Showcase Script
# Purpose: Deploy selected services to demonstrate the platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Banner
echo -e "${GREEN}"
echo "==========================================================="
echo "    🌲 Indigenous Microservices Platform Showcase 🌲      "
echo "         Where Economics Meets The Land                   "
echo "==========================================================="
echo -e "${NC}"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install Docker Desktop.${NC}"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Docker Compose is not installed.${NC}"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        echo -e "${RED}Docker daemon is not running. Please start Docker Desktop.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
}

# Function to create network
create_network() {
    echo -e "${BLUE}Creating Indigenous network...${NC}"
    docker network create indigenious-network 2>/dev/null || true
    echo -e "${GREEN}✓ Network ready${NC}"
}

# Function to deploy core services
deploy_core() {
    echo -e "${PURPLE}Deploying Core Services Bundle...${NC}"
    
    SERVICES=(
        "indigenious-gateway-service"
        "indigenious-user-service"
        "indigenious-business-service"
        "indigenious-rfq-service"
        "indigenious-payment-service"
        "indigenious-design-system-service"
    )
    
    for service in "${SERVICES[@]}"; do
        echo -e "${BLUE}Starting $service...${NC}"
        if [ -d "$service" ]; then
            cd "$service"
            docker-compose up -d
            cd ..
            echo -e "${GREEN}✓ $service running${NC}"
        else
            echo -e "${YELLOW}⚠ $service directory not found, skipping${NC}"
        fi
    done
    
    echo -e "${GREEN}"
    echo "==========================================================="
    echo "Core Services Bundle Deployed!"
    echo "==========================================================="
    echo -e "${NC}"
}

# Function to deploy design system only
deploy_design() {
    echo -e "${PURPLE}Deploying Design System Showcase...${NC}"
    
    if [ -d "indigenious-design-system-service" ]; then
        cd indigenious-design-system-service
        docker-compose up -d
        cd ..
        echo -e "${GREEN}✓ Design System running${NC}"
    else
        echo -e "${RED}Design System directory not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}"
    echo "==========================================================="
    echo "Elemental Design System Deployed!"
    echo "Access at: http://localhost:3049"
    echo "==========================================================="
    echo -e "${NC}"
}

# Function to deploy all services
deploy_full() {
    echo -e "${PURPLE}Deploying Full Platform (49 Services)...${NC}"
    echo -e "${YELLOW}Warning: This requires significant resources (16GB+ RAM)${NC}"
    
    read -p "Continue with full deployment? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
    
    # Find all service directories
    for dir in indigenious-*-service/; do
        if [ -d "$dir" ]; then
            service_name=$(basename "$dir")
            echo -e "${BLUE}Starting $service_name...${NC}"
            cd "$dir"
            if [ -f "docker-compose.yml" ]; then
                docker-compose up -d
                echo -e "${GREEN}✓ $service_name running${NC}"
            else
                echo -e "${YELLOW}⚠ No docker-compose.yml in $service_name${NC}"
            fi
            cd ..
        fi
    done
    
    echo -e "${GREEN}"
    echo "==========================================================="
    echo "Full Platform Deployed (49 Services)!"
    echo "==========================================================="
    echo -e "${NC}"
}

# Function to show status
show_status() {
    echo -e "${BLUE}Checking service status...${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep indigenious || true
    
    echo -e "${GREEN}"
    echo "==========================================================="
    echo "Service URLs:"
    echo "-----------------------------------------------------------"
    echo "API Gateway:        http://localhost:3000"
    echo "Design System:      http://localhost:3049"
    echo "User Service:       http://localhost:3001"
    echo "Business Service:   http://localhost:3002"
    echo "RFQ Service:        http://localhost:3003"
    echo "Payment Service:    http://localhost:3004"
    echo "-----------------------------------------------------------"
    echo "Default Credentials:"
    echo "Username: admin@indigenous.com"
    echo "Password: Indigenous2024!"
    echo "==========================================================="
    echo -e "${NC}"
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}Stopping all Indigenous services...${NC}"
    
    for dir in indigenious-*-service/; do
        if [ -d "$dir" ] && [ -f "$dir/docker-compose.yml" ]; then
            cd "$dir"
            docker-compose down
            cd ..
        fi
    done
    
    echo -e "${GREEN}✓ All services stopped${NC}"
}

# Function to clean up
cleanup() {
    echo -e "${YELLOW}Cleaning up volumes and networks...${NC}"
    
    read -p "This will delete all data. Continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled."
        exit 0
    fi
    
    for dir in indigenious-*-service/; do
        if [ -d "$dir" ] && [ -f "$dir/docker-compose.yml" ]; then
            cd "$dir"
            docker-compose down -v
            cd ..
        fi
    done
    
    docker network rm indigenious-network 2>/dev/null || true
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Function to show logs
show_logs() {
    SERVICE=$2
    if [ -z "$SERVICE" ]; then
        echo "Usage: ./deploy-showcase.sh logs <service-name>"
        echo "Example: ./deploy-showcase.sh logs design-system"
        exit 1
    fi
    
    docker logs -f "indigenious-${SERVICE}-service" 2>/dev/null || \
    docker logs -f "indigenious-${SERVICE}" 2>/dev/null || \
    echo -e "${RED}Service not found${NC}"
}

# Main script
case "$1" in
    core)
        check_prerequisites
        create_network
        deploy_core
        show_status
        ;;
    design)
        check_prerequisites
        create_network
        deploy_design
        show_status
        ;;
    full)
        check_prerequisites
        create_network
        deploy_full
        show_status
        ;;
    status)
        show_status
        ;;
    stop)
        stop_services
        ;;
    cleanup)
        cleanup
        ;;
    logs)
        show_logs "$@"
        ;;
    *)
        echo "Indigenous Microservices Deployment Showcase"
        echo ""
        echo "Usage: ./deploy-showcase.sh [command]"
        echo ""
        echo "Commands:"
        echo "  core     - Deploy core services bundle (6 essential services)"
        echo "  design   - Deploy design system only (visual showcase)"
        echo "  full     - Deploy all 49 services (requires 16GB+ RAM)"
        echo "  status   - Show status of running services"
        echo "  stop     - Stop all services"
        echo "  cleanup  - Stop and remove all data"
        echo "  logs <service> - Show logs for a specific service"
        echo ""
        echo "Examples:"
        echo "  ./deploy-showcase.sh core      # Start with essential services"
        echo "  ./deploy-showcase.sh design    # Just the design system"
        echo "  ./deploy-showcase.sh status    # Check what's running"
        echo "  ./deploy-showcase.sh logs rfq  # View RFQ service logs"
        echo ""
        echo "Recommended first deployment:"
        echo "  ./deploy-showcase.sh core"
        ;;
esac