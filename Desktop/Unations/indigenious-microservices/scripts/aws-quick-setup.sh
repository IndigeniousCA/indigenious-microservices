#!/bin/bash

# Quick AWS Setup Script

echo "🌲 Indigenous Digital Forest - AWS Setup"
echo "========================================"
echo ""
echo "This script will help you set up AWS credentials"
echo ""

# Check if credentials already exist
if [ -f ~/.aws/credentials ]; then
    echo "⚠️  AWS credentials already exist!"
    echo -n "Do you want to overwrite them? (y/n): "
    read -r response
    if [ "$response" != "y" ]; then
        echo "Using existing credentials."
        aws sts get-caller-identity
        exit 0
    fi
fi

# Create AWS config directory
mkdir -p ~/.aws

# Get credentials from user
echo "Please enter your AWS credentials:"
echo "(Get these from IAM console or your AWS admin)"
echo ""
echo -n "AWS Access Key ID: "
read -r AWS_ACCESS_KEY_ID
echo -n "AWS Secret Access Key: "
read -rs AWS_SECRET_ACCESS_KEY
echo ""
echo -n "Default Region [ca-central-1]: "
read -r AWS_REGION
AWS_REGION=${AWS_REGION:-ca-central-1}

# Write credentials file
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = $AWS_ACCESS_KEY_ID
aws_secret_access_key = $AWS_SECRET_ACCESS_KEY
EOF

# Write config file
cat > ~/.aws/config << EOF
[default]
region = $AWS_REGION
output = json
EOF

echo ""
echo "✅ AWS credentials configured!"
echo ""
echo "Testing connection..."
aws sts get-caller-identity

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully connected to AWS!"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./deploy-aws.sh"
    echo "2. Follow the deployment prompts"
else
    echo ""
    echo "❌ Failed to connect to AWS"
    echo "Please check your credentials and try again"
fi