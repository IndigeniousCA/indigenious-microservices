#!/bin/bash

# Quick AWS Setup - Run this first if you haven't configured AWS

echo "🌲 Quick AWS Setup for Indigenous Platform"
echo "=========================================="
echo ""
echo "This will help you configure AWS credentials"
echo ""

# Check if already configured
if aws sts get-caller-identity &>/dev/null; then
    echo "✅ AWS is already configured!"
    aws sts get-caller-identity
    echo ""
    echo "Ready to deploy! Run:"
    echo "  ./deploy-aws-complete.sh --tier 1 --env testing"
else
    echo "Let's configure AWS credentials..."
    echo ""
    echo "You'll need:"
    echo "1. AWS Access Key ID"
    echo "2. AWS Secret Access Key"
    echo ""
    echo "Get these from: AWS Console → IAM → Users → Your User → Security credentials"
    echo ""
    
    aws configure
    
    echo ""
    if aws sts get-caller-identity &>/dev/null; then
        echo "✅ Success! AWS is configured."
        echo ""
        echo "Next steps:"
        echo "1. Run: ./setup-aws-deployment.sh"
        echo "2. Or deploy directly: ./deploy-aws-complete.sh --tier 1 --env testing"
    else
        echo "❌ Configuration failed. Please check your credentials."
    fi
fi