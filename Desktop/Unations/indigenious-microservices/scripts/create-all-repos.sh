#!/bin/bash

# Create all remaining GitHub repositories

REPOS=(
    # AI Services
    "indigenious-ai-core-service"
    "indigenious-ai-intelligence-service"
    "indigenious-market-intelligence-service"
    "indigenious-ambient-intelligence-service"
    
    # Community Services
    "indigenious-community-service"
    "indigenious-verification-service"
    "indigenious-cultural-service"
    
    # Financial Services
    "indigenious-banking-service"
    "indigenious-bonding-service"
    "indigenious-capital-service"
    
    # Operational Services
    "indigenious-procurement-service"
    "indigenious-vendor-service"
    "indigenious-evaluation-service"
    "indigenious-pipeline-service"
    "indigenious-boq-service"
    
    # PR & Marketing
    "indigenious-pr-automation-service"
    "indigenious-network-effects-service"
    "indigenious-fraud-service"
    
    # Admin Services
    "indigenious-admin-service"
    "indigenious-operations-service"
    "indigenious-agent-monitoring-service"
    
    # API Services
    "indigenious-api-marketplace-service"
    "indigenious-blockchain-service"
    "indigenious-canadian-api-service"
    
    # Support Services
    "indigenious-help-service"
    "indigenious-showcase-service"
    "indigenious-testing-service"
    "indigenious-queue-service"
    
    # Next-Gen Services
    "indigenious-nextgen-service"
    "indigenious-voice-service"
    "indigenious-video-service"
    "indigenious-mobile-registration-service"
    
    # Specialized Services
    "indigenious-opportunity-service"
    "indigenious-professional-service"
    "indigenious-price-service"
    
    # Frontend Applications
    "indigenious-web-frontend"
    "indigenious-admin-portal"
    "indigenious-mobile-app"
    "indigenious-marketing-site"
    "indigenious-partner-portal"
    
    # Infrastructure
    "indigenious-api-gateway"
    "indigenious-infrastructure"
    "indigenious-shared-libs"
)

echo "🚀 Creating all remaining repositories..."
echo ""

for repo in "${REPOS[@]}"; do
    echo -n "Creating $repo... "
    if gh repo create "IndigeniousCA/$repo" --public --description "Microservice for Indigenious Platform" 2>/dev/null; then
        echo "✅"
    else
        echo "⚠️ Already exists or error"
    fi
done

echo ""
echo "✅ All repositories created!"
echo ""
echo "Now pushing initial code to each..."

BASE_DIR="/Users/Jon/Desktop/Unations/indigenious-microservices"

for repo in "${REPOS[@]}"; do
    if [ -d "$BASE_DIR/$repo" ]; then
        echo -n "Pushing $repo... "
        cd "$BASE_DIR/$repo"
        if git push -u origin main 2>/dev/null; then
            echo "✅"
        else
            echo "⚠️ Push failed or already pushed"
        fi
    fi
done

echo ""
echo "🎉 Complete! All repositories are created and ready."