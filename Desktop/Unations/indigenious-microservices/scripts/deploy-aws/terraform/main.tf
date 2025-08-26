# ======================================================================
# MAIN TERRAFORM CONFIGURATION - INDIGENOUS MICROSERVICES PLATFORM
# ======================================================================
# AWS Provider and Backend Configuration
# ======================================================================

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # S3 backend for state management with DynamoDB locking
  backend "s3" {
    bucket         = "indigenous-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "ca-central-1"
    dynamodb_table = "indigenous-terraform-locks"
    encrypt        = true
  }
}

# ======================================================================
# AWS PROVIDER CONFIGURATION
# ======================================================================

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Indigenous-Platform"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

# ======================================================================
# VARIABLES
# ======================================================================

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ca-central-1"
}

variable "environment" {
  description = "Environment name (dev/staging/production)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "indigenous"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for deployment"
  type        = list(string)
  default     = ["ca-central-1a", "ca-central-1b"]
}

# ======================================================================
# DATA SOURCES
# ======================================================================

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# ======================================================================
# NETWORKING MODULE
# ======================================================================

module "networking" {
  source = "./modules/networking"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr          = var.vpc_cidr
  availability_zones = var.availability_zones
}

# ======================================================================
# ECS CLUSTER
# ======================================================================

module "ecs_cluster" {
  source = "./modules/ecs-cluster"
  
  project_name = var.project_name
  environment  = var.environment
  
  # Enable Container Insights
  container_insights = true
  
  # Fargate Spot configuration
  enable_fargate_spot = true
  fargate_spot_weight = 70  # 70% Spot, 30% On-Demand
}

# ======================================================================
# SERVICE DISCOVERY (AWS Cloud Map)
# ======================================================================

module "service_discovery" {
  source = "./modules/service-discovery"
  
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
  
  namespace_name = "${var.project_name}.local"
}

# ======================================================================
# APPLICATION LOAD BALANCER
# ======================================================================

module "alb" {
  source = "./modules/alb"
  
  project_name       = var.project_name
  environment        = var.environment
  vpc_id            = module.networking.vpc_id
  public_subnet_ids = module.networking.public_subnet_ids
  
  # SSL Certificate
  certificate_arn = module.acm.certificate_arn
  
  # WAF
  enable_waf = true
}

# ======================================================================
# DATABASE (RDS Aurora Serverless v2)
# ======================================================================

module "database" {
  source = "./modules/database"
  
  project_name        = var.project_name
  environment         = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  
  # Aurora Serverless v2 configuration
  engine_mode          = "provisioned"
  engine_version       = "15.4"
  min_capacity         = 0.5
  max_capacity         = 4
  
  # Backup configuration
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Security
  enable_encryption = true
  master_username   = "indigenous_admin"
}

# ======================================================================
# REDIS (ElastiCache)
# ======================================================================

module "redis" {
  source = "./modules/redis"
  
  project_name        = var.project_name
  environment         = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  
  # Redis configuration
  node_type           = "cache.t3.micro"
  num_cache_nodes     = 2
  engine_version      = "7.0"
  
  # Automatic failover for Multi-AZ
  automatic_failover_enabled = true
  
  # Backup configuration
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
}

# ======================================================================
# S3 BUCKETS
# ======================================================================

module "s3" {
  source = "./modules/s3"
  
  project_name = var.project_name
  environment  = var.environment
  
  buckets = [
    {
      name = "${var.project_name}-documents-${var.environment}"
      versioning = true
      lifecycle_rules = [
        {
          id = "archive-old-documents"
          status = "Enabled"
          transition_days = 90
          storage_class = "GLACIER"
        }
      ]
    },
    {
      name = "${var.project_name}-media-${var.environment}"
      versioning = false
      cors_enabled = true
    },
    {
      name = "${var.project_name}-models-${var.environment}"
      versioning = true
    },
    {
      name = "${var.project_name}-backups-${var.environment}"
      versioning = true
      lifecycle_rules = [
        {
          id = "delete-old-backups"
          status = "Enabled"
          expiration_days = 90
        }
      ]
    }
  ]
}

# ======================================================================
# OPENSEARCH (Elasticsearch)
# ======================================================================

module "opensearch" {
  source = "./modules/opensearch"
  
  project_name        = var.project_name
  environment         = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  
  # OpenSearch configuration
  engine_version    = "OpenSearch_2.11"
  instance_type     = "t3.small.search"
  instance_count    = 2
  
  # Storage
  ebs_enabled     = true
  volume_type     = "gp3"
  volume_size     = 20
  
  # Security
  encrypt_at_rest = true
  node_to_node_encryption = true
}

# ======================================================================
# SECRETS MANAGER
# ======================================================================

module "secrets" {
  source = "./modules/secrets-manager"
  
  project_name = var.project_name
  environment  = var.environment
  
  secrets = [
    "jwt-secret",
    "database-url",
    "stripe-api-key",
    "sendgrid-api-key",
    "twilio-credentials",
    "openai-api-key"
  ]
}

# ======================================================================
# ACM CERTIFICATE
# ======================================================================

module "acm" {
  source = "./modules/acm"
  
  domain_name = var.environment == "production" ? "api.indigenous.ca" : "${var.environment}.api.indigenous.ca"
  
  subject_alternative_names = [
    "*.indigenous.ca",
    "www.indigenous.ca"
  ]
}

# ======================================================================
# CLOUDWATCH MONITORING
# ======================================================================

module "monitoring" {
  source = "./modules/monitoring"
  
  project_name = var.project_name
  environment  = var.environment
  
  # Log retention
  log_retention_days = 30
  
  # Alarms configuration
  enable_alarms = true
  alarm_email   = "ops@indigenous.ca"
  
  # X-Ray tracing
  enable_xray = true
}

# ======================================================================
# IAM ROLES AND POLICIES
# ======================================================================

module "iam" {
  source = "./modules/iam"
  
  project_name = var.project_name
  environment  = var.environment
  
  # ECS Task Execution Role
  create_ecs_task_execution_role = true
  
  # ECS Task Role
  create_ecs_task_role = true
  
  # Secrets access
  secrets_arns = module.secrets.secret_arns
  
  # S3 access
  s3_bucket_arns = module.s3.bucket_arns
}

# ======================================================================
# ECR REPOSITORIES
# ======================================================================

module "ecr" {
  source = "./modules/ecr"
  
  project_name = var.project_name
  environment  = var.environment
  
  # Create repositories for all services
  create_repositories = true
  
  # Image scanning
  scan_on_push = true
  
  # Lifecycle policy
  untagged_image_expiry_days = 7
  image_count_limit         = 10
}

# ======================================================================
# CLOUDFRONT CDN
# ======================================================================

module "cloudfront" {
  source = "./modules/cloudfront"
  
  project_name = var.project_name
  environment  = var.environment
  
  # Origin configuration
  alb_domain_name = module.alb.dns_name
  
  # Cache behaviors
  default_ttl = 86400
  max_ttl     = 31536000
  
  # Security
  enable_waf        = true
  price_class       = "PriceClass_100"  # Use only North America and Europe edge locations
  
  # SSL
  certificate_arn = module.acm.certificate_arn
}

# ======================================================================
# OUTPUTS
# ======================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = module.ecs_cluster.cluster_name
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.domain_name
}

output "database_endpoint" {
  description = "RDS Aurora endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "opensearch_endpoint" {
  description = "OpenSearch endpoint"
  value       = module.opensearch.endpoint
  sensitive   = true
}

output "service_discovery_namespace" {
  description = "Service discovery namespace"
  value       = module.service_discovery.namespace_name
}