# Indigenous Digital Forest - AWS Infrastructure
# Terraform configuration for AWS GovCloud deployment

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure AWS Provider (Canadian region for Indigenous data sovereignty)
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      DataSovereignty = "Indigenous-Canada"
      OCAP            = "Compliant"  # Ownership, Control, Access, Possession
      Environment     = var.environment
      Project         = "Indigenous-Digital-Forest"
    }
  }
}

# Variables for region selection
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ca-central-1"  # Montreal, Canada - Protected B certified
  
  validation {
    condition = contains([
      "ca-central-1",    # Canada (Montreal) - RECOMMENDED
      "us-gov-west-1",   # US GovCloud (if required)
      "us-west-2"        # US West (for testing only)
    ], var.aws_region)
    error_message = "Must use Canadian region for Indigenous data sovereignty."
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

# VPC for network isolation
resource "aws_vpc" "indigenous_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "indigenous-digital-forest-vpc"
    Environment = "production"
    Sovereignty = "indigenous-controlled"
  }
}

# Public subnet for ALB
resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.indigenous_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-gov-west-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "indigenous-public-subnet-1"
    Type = "public"
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.indigenous_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-gov-west-1b"
  map_public_ip_on_launch = true

  tags = {
    Name = "indigenous-public-subnet-2"
    Type = "public"
  }
}

# Private subnets for RDS and Lambda
resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.indigenous_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-gov-west-1a"

  tags = {
    Name = "indigenous-private-subnet-1"
    Type = "private"
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.indigenous_vpc.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "us-gov-west-1b"

  tags = {
    Name = "indigenous-private-subnet-2"
    Type = "private"
  }
}

# RDS PostgreSQL Database
resource "aws_db_subnet_group" "indigenous_db_subnet" {
  name       = "indigenous-db-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]

  tags = {
    Name = "Indigenous DB subnet group"
  }
}

resource "aws_db_instance" "indigenous_postgres" {
  identifier     = "indigenous-digital-forest-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  storage_encrypted     = true
  storage_type          = "gp3"
  
  db_name  = "indigenous_platform"
  username = "indigenous_admin"
  password = var.db_password  # Store in AWS Secrets Manager
  
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.indigenous_db_subnet.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = true
  skip_final_snapshot = false
  
  tags = {
    Name        = "Indigenous Digital Forest Database"
    Environment = "production"
    DataSovereignty = "indigenous-controlled"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds_sg" {
  name        = "indigenous-rds-sg"
  description = "Security group for Indigenous RDS database"
  vpc_id      = aws_vpc.indigenous_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "indigenous-rds-security-group"
  }
}

# Lambda Security Group
resource "aws_security_group" "lambda_sg" {
  name        = "indigenous-lambda-sg"
  description = "Security group for Lambda functions"
  vpc_id      = aws_vpc.indigenous_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "indigenous-lambda-security-group"
  }
}

# S3 Bucket for Static Assets and Documents
resource "aws_s3_bucket" "indigenous_assets" {
  bucket = "indigenous-digital-forest-assets"

  tags = {
    Name        = "Indigenous Digital Forest Assets"
    Environment = "production"
  }
}

resource "aws_s3_bucket_encryption" "indigenous_assets_encryption" {
  bucket = aws_s3_bucket.indigenous_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "indigenous_assets_versioning" {
  bucket = aws_s3_bucket.indigenous_assets.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Cognito User Pool for Authentication
resource "aws_cognito_user_pool" "indigenous_users" {
  name = "indigenous-digital-forest-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
  
  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }
  
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = false
  }
  
  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
  }
  
  schema {
    name                = "indigenous_nation"
    attribute_data_type = "String"
    mutable             = true
  }
  
  schema {
    name                = "business_id"
    attribute_data_type = "String"
    mutable             = true
  }
  
  tags = {
    Name        = "Indigenous User Pool"
    Environment = "production"
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "indigenous_app_client" {
  name         = "indigenous-web-app"
  user_pool_id = aws_cognito_user_pool.indigenous_users.id
  
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
  
  generate_secret = false
  
  prevent_user_existence_errors = "ENABLED"
  
  refresh_token_validity = 30
  access_token_validity  = 1
  id_token_validity      = 1
  
  token_validity_units {
    refresh_token = "days"
    access_token  = "hours"
    id_token      = "hours"
  }
}

# API Gateway
resource "aws_api_gateway_rest_api" "indigenous_api" {
  name        = "indigenous-digital-forest-api"
  description = "API Gateway for Indigenous Digital Forest"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Lambda Function for API
resource "aws_lambda_function" "api_handler" {
  filename         = "lambda_function.zip"
  function_name    = "indigenous-api-handler"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("lambda_function.zip")
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 512
  
  environment {
    variables = {
      DATABASE_URL = "postgresql://${aws_db_instance.indigenous_postgres.username}:${var.db_password}@${aws_db_instance.indigenous_postgres.endpoint}/${aws_db_instance.indigenous_postgres.db_name}"
      NODE_ENV     = "production"
    }
  }
  
  vpc_config {
    subnet_ids         = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
    security_group_ids = [aws_security_group.lambda_sg.id]
  }
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "indigenous-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda VPC Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_vpc_policy" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws-us-gov:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# CloudFront Distribution for Frontend
resource "aws_cloudfront_distribution" "indigenous_frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  origin {
    domain_name = aws_s3_bucket.indigenous_assets.bucket_regional_domain_name
    origin_id   = "S3-indigenous-frontend"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend_oai.cloudfront_access_identity_path
    }
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-indigenous-frontend"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = true
  }
  
  tags = {
    Name        = "Indigenous Digital Forest CDN"
    Environment = "production"
  }
}

resource "aws_cloudfront_origin_access_identity" "frontend_oai" {
  comment = "OAI for Indigenous Digital Forest Frontend"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/lambda/indigenous-api-handler"
  retention_in_days = 30
}

# Outputs
output "database_endpoint" {
  value       = aws_db_instance.indigenous_postgres.endpoint
  description = "RDS database endpoint"
  sensitive   = true
}

output "api_gateway_url" {
  value       = aws_api_gateway_rest_api.indigenous_api.execution_arn
  description = "API Gateway URL"
}

output "cloudfront_url" {
  value       = aws_cloudfront_distribution.indigenous_frontend.domain_name
  description = "CloudFront distribution URL"
}

output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.indigenous_users.id
  description = "Cognito User Pool ID"
}

output "cognito_client_id" {
  value       = aws_cognito_user_pool_client.indigenous_app_client.id
  description = "Cognito App Client ID"
}