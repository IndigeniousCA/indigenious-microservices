#!/bin/bash

# Simple Local Deployment for Indigenous Microservices
# Uses the showcase docker-compose file

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "==========================================================="
echo "    🌲 Indigenous Platform - Local Deployment 🌲          "
echo "         Running on Your Laptop!                          "
echo "==========================================================="
echo -e "${NC}"

# Check Docker
if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is not running. Please ensure Docker Desktop is started.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"

# Deploy using the showcase compose file
echo -e "${BLUE}Starting core services...${NC}"
echo -e "${YELLOW}This will run: PostgreSQL, Redis, and the Design System${NC}"

# Use the showcase docker-compose
docker-compose -f docker-compose.showcase.yml up -d gateway design-system postgres redis

echo -e "${GREEN}"
echo "==========================================================="
echo "Services are starting! This may take 1-2 minutes."
echo ""
echo "Once ready, you can access:"
echo "-----------------------------------------------------------"
echo "🎨 Design System: http://localhost:3049"
echo "🌐 API Gateway:   http://localhost:3000"
echo "-----------------------------------------------------------"
echo ""
echo "To check status:  docker ps"
echo "To view logs:     docker logs indigenous-design-system"
echo "To stop:          docker-compose -f docker-compose.showcase.yml down"
echo "==========================================================="
echo -e "${NC}"

# Show running containers
echo -e "${BLUE}Running containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "indigenous|postgres|redis" || echo "Services are still starting..."