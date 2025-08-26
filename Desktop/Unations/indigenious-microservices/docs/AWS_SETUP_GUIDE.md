# AWS Setup Guide for Indigenous Digital Forest

## Step 1: Create AWS Account (if you don't have one)

1. Go to: https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Use your business email
4. Choose "Business" account type (for Indigenous organization)

## Step 2: Set up IAM User for Deployment

1. Go to AWS Console: https://console.aws.amazon.com/
2. Search for "IAM" and click on it
3. Click "Users" → "Add User"
4. Username: `indigenous-deploy`
5. Check "Programmatic access"
6. Attach these policies:
   - AdministratorAccess (for initial setup)
   - Later we'll restrict to minimum permissions

## Step 3: Get Access Keys

1. After creating the user, download the CSV with:
   - Access Key ID
   - Secret Access Key
2. Keep these safe!

## Step 4: Configure AWS CLI

Run this command and enter your credentials:
```bash
aws configure
```

Enter:
- AWS Access Key ID: [from CSV]
- AWS Secret Access Key: [from CSV]
- Default region: us-west-2 (or us-gov-west-1 for GovCloud)
- Default output format: json

## Step 5: For AWS GovCloud (Recommended for Indigenous Data Sovereignty)

AWS GovCloud provides:
- ITAR compliance
- FedRAMP High authorization
- Data stays in US jurisdiction
- Better for government contracts

To get GovCloud access:
1. You need a standard AWS account first
2. Apply at: https://aws.amazon.com/govcloud-us/getting-started/
3. Approval takes 1-2 business days
4. Use region: us-gov-west-1

## Cost Estimates

### Development/Testing (What we'll start with):
- RDS (db.t3.micro): ~$15/month
- Lambda: ~$5/month (first 1M requests free)
- S3 + CloudFront: ~$10/month
- Cognito: Free for first 50,000 users
- **Total: ~$30-50/month**

### Production (When you scale):
- RDS (db.t3.medium): ~$70/month
- Lambda: ~$20-50/month
- S3 + CloudFront: ~$20-50/month
- Cognito: ~$25/month
- **Total: ~$150-200/month**

## Free Tier Benefits (First Year)

AWS offers free tier for 12 months:
- 750 hours of RDS db.t3.micro
- 1 million Lambda requests/month
- 5GB S3 storage
- 50GB CloudFront transfer

## Security Best Practices

1. **Enable MFA**: 
   - Go to IAM → Your User → Security Credentials
   - Set up MFA device

2. **Use Budget Alerts**:
   - Go to AWS Budgets
   - Set alert at $50/month to start

3. **Enable CloudTrail**:
   - Logs all API calls for audit

## Next Steps

Once configured, run:
```bash
# Test connection
aws sts get-caller-identity

# Should return your account info
```

Then we can deploy!