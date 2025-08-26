#!/bin/bash

# Create and push repositories using existing Git credentials
# This uses the SSH key that's already configured for IndigeniousCA

ORG="IndigeniousCA"
BASE_DIR="/Users/Jon/Desktop/Unations/indigenious-microservices"

echo "🚀 Creating and pushing microservice repositories"
echo "================================================"
echo ""

# Services to create and push (starting with the ones we've prepared)
SERVICES=(
    "indigenious-auth-service"
    "indigenious-user-service"
    "indigenious-business-service"
    "indigenious-rfq-service"
    "indigenious-payment-service"
)

for SERVICE in "${SERVICES[@]}"; do
    echo "📦 Processing $SERVICE..."
    cd "$BASE_DIR/$SERVICE"
    
    # Check if remote already exists
    if git remote get-url origin &>/dev/null; then
        echo "  Remote exists, updating..."
        git remote set-url origin "git@github.com:${ORG}/${SERVICE}.git"
    else
        echo "  Adding remote..."
        git remote add origin "git@github.com:${ORG}/${SERVICE}.git"
    fi
    
    # Try to push (this will fail if repo doesn't exist on GitHub, but that's ok)
    echo "  Attempting push..."
    if git push -u origin main 2>/dev/null; then
        echo "  ✅ Successfully pushed $SERVICE"
    else
        echo "  ⚠️  Repository may not exist on GitHub yet. Create it at:"
        echo "      https://github.com/organizations/${ORG}/repositories/new"
        echo "      Repository name: $SERVICE"
        echo ""
    fi
done

echo ""
echo "================================"
echo "📝 Summary"
echo "================================"
echo ""
echo "If any repos failed to push, you need to:"
echo "1. Create them on GitHub first"
echo "2. Run this script again"
echo ""
echo "Or use GitHub CLI after authentication:"
echo "  gh auth login"
echo "  gh repo create ${ORG}/[repo-name] --public"