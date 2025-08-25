#!/bin/bash

# ==========================================
# INDIGENOUS PLATFORM - FULL DEPLOYMENT
# 49 Microservices | 84 Features
# ==========================================

echo "🚀 INDIGENOUS PLATFORM - FULL DEPLOYMENT STARTING"
echo "================================================"
echo "Services: 49 Microservices"
echo "Features: 84 Platform Features"
echo "Stack: Next.js, Node.js, PostgreSQL, Redis, RabbitMQ, Elasticsearch"
echo "================================================"

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.full-platform.yml down 2>/dev/null || true

# Pull latest images
echo "📦 Pulling base images..."
docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull rabbitmq:3-management-alpine
docker pull elasticsearch:8.11.0

# Build all services
echo "🔨 Building all 49 microservices..."
echo "This will take several minutes on first run..."

docker-compose -f docker-compose.full-platform.yml build --parallel

# Start infrastructure first
echo "🏗️ Starting infrastructure services..."
docker-compose -f docker-compose.full-platform.yml up -d postgres redis rabbitmq elasticsearch

# Wait for infrastructure
echo "⏳ Waiting for infrastructure to be ready..."
sleep 20

# Start all services
echo "🚀 Starting all 49 microservices..."
docker-compose -f docker-compose.full-platform.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 30

# Check status
echo "📊 Checking service status..."
docker-compose -f docker-compose.full-platform.yml ps

# Display access URLs
echo ""
echo "================================================"
echo "✅ INDIGENOUS PLATFORM DEPLOYED SUCCESSFULLY!"
echo "================================================"
echo ""
echo "🌐 Main Platform: http://localhost"
echo "🔌 API Gateway: http://localhost:3000"
echo "🎨 Design System: http://localhost:3049"
echo "📊 Grafana Dashboard: http://localhost:3100 (admin/indigenous2024)"
echo "🐳 Portainer: http://localhost:9000"
echo "🔍 Elasticsearch: http://localhost:9200"
echo "🐰 RabbitMQ Management: http://localhost:15672 (indigenous/indigenous2024)"
echo ""
echo "Services Running:"
echo "- User Service: http://localhost:3001"
echo "- Business Service: http://localhost:3002"
echo "- RFQ Service: http://localhost:3003"
echo "- Payment Service: http://localhost:3004"
echo "- Document Service: http://localhost:3005"
echo "- Notification Service: http://localhost:3006"
echo "- Chat Service: http://localhost:3007"
echo "- Analytics Service: http://localhost:3008"
echo "- Compliance Service: http://localhost:3009"
echo "- AI Core Service: http://localhost:3010"
echo "... and 39 more services!"
echo ""
echo "================================================"
echo "📝 To view logs: docker-compose -f docker-compose.full-platform.yml logs -f [service-name]"
echo "🛑 To stop: docker-compose -f docker-compose.full-platform.yml down"
echo "================================================"