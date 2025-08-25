#!/bin/bash

echo "🌲 Indigenous Digital Forest - AWS Canada Configuration"
echo "======================================================"
echo "Complete Procurement Platform with 49 Microservices"
echo "======================================================"
echo ""
echo "Please have your AWS credentials ready from:"
echo "https://console.aws.amazon.com/ → Security Credentials → Access Keys"
echo ""

# Get Access Key
echo -n "Enter your AWS Access Key ID: "
read AWS_ACCESS_KEY_ID

# Get Secret Key
echo -n "Enter your AWS Secret Access Key: "
read -s AWS_SECRET_ACCESS_KEY
echo ""

# Configure AWS CLI for Canada
aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
aws configure set region ca-central-1
aws configure set output json

echo ""
echo "✅ Configured for Canadian region (ca-central-1)"
echo ""
echo "Testing connection..."

# Test the credentials
if aws sts get-caller-identity; then
    echo ""
    echo "✅ Successfully connected to AWS!"
    echo ""
    echo "Your account details:"
    aws sts get-caller-identity --output table
    echo ""
    echo "Ready to deploy! Run:"
    echo "  ./deploy-aws.sh"
else
    echo ""
    echo "❌ Failed to connect. Please check your credentials."
    echo "Make sure you created access keys in the AWS Console."
fi