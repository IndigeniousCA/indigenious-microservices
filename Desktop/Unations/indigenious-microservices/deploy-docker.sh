#!/bin/bash

# 🌲 Indigenous Digital Forest - Docker Deployment
# One command to rule them all!

set -e

echo "🌲 ==========================================="
echo "🌲 INDIGENOUS DIGITAL FOREST"
echo "🌲 Docker Deployment Script"
echo "🌲 ==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found. Please install Docker Desktop${NC}"
        echo "   Visit: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose not found${NC}"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running. Please start Docker Desktop${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met!${NC}"
}

# Create necessary Dockerfiles for services that don't have them
create_dockerfiles() {
    echo "📝 Creating Dockerfiles for services..."
    
    # Gateway Service Dockerfile
    if [ ! -f "indigenious-gateway-service/Dockerfile" ]; then
        cat > indigenious-gateway-service/Dockerfile <<EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "src/index.js"]
EOF
        echo -e "${GREEN}✅ Created Gateway Dockerfile${NC}"
    fi
    
    # Banking Service Dockerfile  
    if [ ! -f "indigenious-banking-service/Dockerfile" ]; then
        cat > indigenious-banking-service/Dockerfile <<EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3013
CMD ["node", "src/index.ts"]
EOF
        echo -e "${GREEN}✅ Created Banking Dockerfile${NC}"
    fi
}

# Update frontend next.config.js for standalone build
update_frontend_config() {
    echo "🔧 Updating frontend configuration..."
    
    cat > indigenious-web-frontend/next.config.js <<EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_DESIGN_SYSTEM_URL: process.env.NEXT_PUBLIC_DESIGN_SYSTEM_URL || 'http://localhost:3007'
  }
}

module.exports = nextConfig
EOF
    echo -e "${GREEN}✅ Updated frontend config${NC}"
}

# Create a simplified docker-compose for essential services
create_simple_compose() {
    echo "📄 Creating simplified Docker Compose..."
    
    cat > docker-compose.simple.yml <<EOF
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: indigenous-postgres
    environment:
      POSTGRES_DB: indigenous_platform
      POSTGRES_USER: indigenous_admin
      POSTGRES_PASSWORD: sacred_forest_2024
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U indigenous_admin"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: indigenous-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Frontend
  frontend:
    build: ./indigenious-web-frontend
    container_name: indigenous-frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NEXT_PUBLIC_DESIGN_SYSTEM_URL: http://localhost:3007
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
EOF
    echo -e "${GREEN}✅ Created simplified Docker Compose${NC}"
}

# Build and start services
deploy_services() {
    echo ""
    echo "🚀 Starting deployment..."
    
    # Use docker compose or docker-compose based on what's available
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        DOCKER_COMPOSE="docker-compose"
    fi
    
    # Stop any existing containers
    echo "🛑 Stopping existing containers..."
    $DOCKER_COMPOSE -f docker-compose.simple.yml down 2>/dev/null || true
    
    # Build and start
    echo "🔨 Building services..."
    $DOCKER_COMPOSE -f docker-compose.simple.yml build --no-cache
    
    echo "🌱 Starting services..."
    $DOCKER_COMPOSE -f docker-compose.simple.yml up -d
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    echo ""
    echo "🏥 Checking service health..."
    
    # Check PostgreSQL
    if docker exec indigenous-postgres pg_isready -U indigenous_admin &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
    else
        echo -e "${YELLOW}⚠️ PostgreSQL is starting...${NC}"
    fi
    
    # Check Redis
    if docker exec indigenous-redis redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis is ready${NC}"
    else
        echo -e "${YELLOW}⚠️ Redis is starting...${NC}"
    fi
    
    # Check Frontend
    if curl -s http://localhost:3000 > /dev/null; then
        echo -e "${GREEN}✅ Frontend is ready${NC}"
    else
        echo -e "${YELLOW}⚠️ Frontend is starting...${NC}"
    fi
}

# Display access information
show_access_info() {
    echo ""
    echo "🎉 ==========================================="
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo "🎉 ==========================================="
    echo ""
    echo "🌲 Your Indigenous Digital Forest is ready!"
    echo ""
    echo "📍 Access Points:"
    echo "   Frontend:  http://localhost:3000"
    echo "   Database:  localhost:5432"
    echo "   Redis:     localhost:6379"
    echo ""
    echo "🔧 Docker Commands:"
    echo "   View logs:    docker-compose -f docker-compose.simple.yml logs -f"
    echo "   Stop all:     docker-compose -f docker-compose.simple.yml down"
    echo "   Restart:      docker-compose -f docker-compose.simple.yml restart"
    echo "   Clean all:    docker-compose -f docker-compose.simple.yml down -v"
    echo ""
    echo "🌿 Where Economics Meets The Land 🌿"
}

# Main execution
main() {
    check_prerequisites
    create_dockerfiles
    update_frontend_config
    create_simple_compose
    deploy_services
    show_access_info
}

# Handle errors
trap 'echo -e "${RED}❌ Deployment failed! Check the errors above.${NC}"' ERR

# Run main function
main "$@"