#!/bin/bash

# ======================================================================
# AWS DEPLOYMENT SCRIPT - INDIGENOUS MICROSERVICES PLATFORM
# ======================================================================
# Version: 2.0
# Date: August 25, 2025
# Purpose: Deploy microservices to AWS with tier-based selective deployment
# ======================================================================

set -e  # Exit on error

# ======================================================================
# CONFIGURATION
# ======================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"
CONFIG_DIR="${PROJECT_ROOT}/scripts/deploy-aws"
TERRAFORM_DIR="${CONFIG_DIR}/terraform"
LOGS_DIR="${PROJECT_ROOT}/logs/deployment"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOGS_DIR}/deploy_${TIMESTAMP}.log"

# AWS Configuration
AWS_REGION="${AWS_REGION:-ca-central-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ======================================================================
# HELPER FUNCTIONS
# ======================================================================

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# ======================================================================
# SERVICE TIER DEFINITIONS
# ======================================================================

declare -a TIER_1_SERVICES=(
    "indigenious-gateway-service"
    "indigenious-auth-service"
    "indigenious-web-frontend"
)

declare -a TIER_2_SERVICES=(
    "indigenious-user-service"
    "indigenious-business-service"
    "indigenious-rfq-service"
    "indigenious-payment-service"
    "indigenious-document-service"
)

declare -a TIER_3_SERVICES=(
    "indigenious-ai-orchestrator-service"
    "indigenious-analytics-service"
    "indigenious-notification-service"
    "indigenious-chat-service"
)

# Tier 4 services are all others not in Tier 1-3

# ======================================================================
# SERVICE DEPENDENCY MAP
# ======================================================================

get_service_dependencies() {
    local service=$1
    case "$service" in
        "indigenious-gateway-service")
            echo ""  # No dependencies
            ;;
        "indigenious-auth-service")
            echo "database redis"
            ;;
        "indigenious-web-frontend")
            echo "indigenious-gateway-service indigenious-auth-service"
            ;;
        "indigenious-user-service")
            echo "indigenious-auth-service database"
            ;;
        "indigenious-business-service")
            echo "indigenious-auth-service database"
            ;;
        "indigenious-rfq-service")
            echo "indigenious-auth-service indigenious-business-service database"
            ;;
        "indigenious-payment-service")
            echo "indigenious-auth-service indigenious-user-service database"
            ;;
        "indigenious-document-service")
            echo "indigenious-auth-service s3"
            ;;
        "indigenious-ai-orchestrator-service")
            echo "indigenious-auth-service indigenious-user-service indigenious-business-service database redis"
            ;;
        "indigenious-analytics-service")
            echo "database redis"
            ;;
        "indigenious-notification-service")
            echo "indigenious-auth-service indigenious-user-service"
            ;;
        "indigenious-chat-service")
            echo "indigenious-auth-service websocket"
            ;;
        *)
            echo "indigenious-auth-service database"  # Default dependencies
            ;;
    esac
}

# ======================================================================
# AWS PREREQUISITES CHECK
# ======================================================================

check_aws_prerequisites() {
    log "🔍 Checking AWS prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    info "✅ All prerequisites checked"
    info "   AWS Account: $AWS_ACCOUNT_ID"
    info "   AWS Region: $AWS_REGION"
}

# ======================================================================
# SERVICE DISCOVERY
# ======================================================================

discover_all_services() {
    local services=()
    
    # Find all service directories (handle nested structure)
    for dir in "${PROJECT_ROOT}"/indigenious-*/; do
        if [ -d "$dir" ]; then
            local service_name=$(basename "$dir")
            
            # Skip non-service directories
            if [[ "$service_name" == "indigenious-infrastructure" ]] || \
               [[ "$service_name" == "indigenious-marketing-site" ]] || \
               [[ "$service_name" == "indigenious-shared-libs" ]]; then
                continue
            fi
            
            # Check if it has actual code
            if [ -f "$dir/package.json" ] || [ -f "$dir/Dockerfile" ]; then
                services+=("$service_name")
            fi
        fi
    done
    
    echo "${services[@]}"
}

# ======================================================================
# TIER CLASSIFICATION
# ======================================================================

get_service_tier() {
    local service=$1
    
    # Check Tier 1
    for s in "${TIER_1_SERVICES[@]}"; do
        if [ "$s" == "$service" ]; then
            echo "1"
            return
        fi
    done
    
    # Check Tier 2
    for s in "${TIER_2_SERVICES[@]}"; do
        if [ "$s" == "$service" ]; then
            echo "2"
            return
        fi
    done
    
    # Check Tier 3
    for s in "${TIER_3_SERVICES[@]}"; do
        if [ "$s" == "$service" ]; then
            echo "3"
            return
        fi
    done
    
    # Default to Tier 4
    echo "4"
}

get_services_by_tier() {
    local tier=$1
    local all_services=($(discover_all_services))
    local tier_services=()
    
    for service in "${all_services[@]}"; do
        local service_tier=$(get_service_tier "$service")
        if [ "$service_tier" == "$tier" ]; then
            tier_services+=("$service")
        fi
    done
    
    echo "${tier_services[@]}"
}

# ======================================================================
# DEPENDENCY RESOLUTION
# ======================================================================

resolve_dependencies() {
    local service=$1
    local -a resolved=()
    local -a queue=("$service")
    local -a visited=()
    
    while [ ${#queue[@]} -gt 0 ]; do
        local current="${queue[0]}"
        queue=("${queue[@]:1}")  # Remove first element
        
        # Skip if already visited
        for v in "${visited[@]}"; do
            if [ "$v" == "$current" ]; then
                continue 2
            fi
        done
        
        visited+=("$current")
        
        # Get dependencies
        local deps=$(get_service_dependencies "$current")
        if [ -n "$deps" ]; then
            for dep in $deps; do
                # Skip infrastructure dependencies
                if [[ "$dep" == "database" ]] || \
                   [[ "$dep" == "redis" ]] || \
                   [[ "$dep" == "s3" ]] || \
                   [[ "$dep" == "websocket" ]]; then
                    continue
                fi
                
                # Add to queue if not visited
                local found=0
                for v in "${visited[@]}"; do
                    if [ "$v" == "$dep" ]; then
                        found=1
                        break
                    fi
                done
                
                if [ $found -eq 0 ]; then
                    queue+=("$dep")
                fi
            done
        fi
        
        # Add to resolved list (in reverse order for deployment)
        resolved=("$current" "${resolved[@]}")
    done
    
    # Reverse array to get correct deployment order
    local final=()
    for ((i=${#resolved[@]}-1; i>=0; i--)); do
        final+=("${resolved[$i]}")
    done
    
    echo "${final[@]}"
}

# ======================================================================
# DOCKER BUILD & PUSH
# ======================================================================

build_and_push_service() {
    local service=$1
    local service_dir="${PROJECT_ROOT}/${service}"
    
    log "🐳 Building Docker image for $service..."
    
    # Check if Dockerfile exists
    if [ ! -f "${service_dir}/Dockerfile" ]; then
        warn "No Dockerfile found for $service, creating default Node.js Dockerfile..."
        create_default_dockerfile "$service_dir"
    fi
    
    # Build Docker image
    local image_tag="${ECR_REGISTRY}/${service}:${TIMESTAMP}"
    docker build -t "$image_tag" "$service_dir"
    
    if [ $? -eq 0 ]; then
        log "✅ Docker image built successfully"
        
        # Push to ECR
        log "📤 Pushing image to ECR..."
        
        # Login to ECR
        aws ecr get-login-password --region "$AWS_REGION" | \
            docker login --username AWS --password-stdin "$ECR_REGISTRY"
        
        # Create repository if it doesn't exist
        aws ecr describe-repositories --repository-names "$service" \
            --region "$AWS_REGION" &>/dev/null || \
            aws ecr create-repository --repository-name "$service" \
                --region "$AWS_REGION" &>/dev/null
        
        # Push image
        docker push "$image_tag"
        
        if [ $? -eq 0 ]; then
            log "✅ Image pushed successfully"
            echo "$image_tag"
        else
            error "Failed to push Docker image for $service"
            return 1
        fi
    else
        error "Failed to build Docker image for $service"
        return 1
    fi
}

create_default_dockerfile() {
    local dir=$1
    cat > "${dir}/Dockerfile" << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build if necessary
RUN if [ -f "tsconfig.json" ]; then npm run build || true; fi

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
EOF
}

# ======================================================================
# TERRAFORM DEPLOYMENT
# ======================================================================

deploy_infrastructure() {
    log "🏗️  Deploying infrastructure with Terraform..."
    
    # Initialize Terraform if needed
    if [ ! -d "${TERRAFORM_DIR}/.terraform" ]; then
        log "Initializing Terraform..."
        cd "$TERRAFORM_DIR"
        terraform init
    fi
    
    # Apply infrastructure
    cd "$TERRAFORM_DIR"
    terraform apply -auto-approve
    
    if [ $? -eq 0 ]; then
        log "✅ Infrastructure deployed successfully"
    else
        error "Failed to deploy infrastructure"
        return 1
    fi
}

deploy_service_to_ecs() {
    local service=$1
    local image_tag=$2
    
    log "🚀 Deploying $service to ECS Fargate..."
    
    # Use Terraform to deploy service
    cd "${TERRAFORM_DIR}/services/${service}"
    
    # Create service-specific Terraform configuration if it doesn't exist
    if [ ! -f "main.tf" ]; then
        create_service_terraform "$service" "$image_tag"
    fi
    
    terraform init
    terraform apply -auto-approve -var="image_tag=${image_tag}"
    
    if [ $? -eq 0 ]; then
        log "✅ $service deployed successfully"
    else
        error "Failed to deploy $service"
        return 1
    fi
}

create_service_terraform() {
    local service=$1
    local image_tag=$2
    
    mkdir -p "${TERRAFORM_DIR}/services/${service}"
    
    cat > "${TERRAFORM_DIR}/services/${service}/main.tf" << EOF
module "ecs_service" {
  source = "../../modules/ecs-service"
  
  service_name = "${service}"
  image_tag    = var.image_tag
  cpu          = var.cpu
  memory       = var.memory
  desired_count = var.desired_count
  
  environment = var.environment
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
}

variable "cpu" {
  description = "CPU units for the task"
  type        = string
  default     = "256"
}

variable "memory" {
  description = "Memory for the task"
  type        = string
  default     = "512"
}

variable "desired_count" {
  description = "Number of tasks to run"
  type        = number
  default     = 1
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}
EOF
}

# ======================================================================
# HEALTH CHECKS
# ======================================================================

check_service_health() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    log "🏥 Checking health of $service..."
    
    while [ $attempt -le $max_attempts ]; do
        # Get service endpoint from AWS
        local endpoint=$(aws ecs describe-services \
            --cluster indigenous-cluster \
            --services "$service" \
            --query 'services[0].loadBalancers[0].targetGroupArn' \
            --output text 2>/dev/null)
        
        if [ "$endpoint" != "None" ] && [ -n "$endpoint" ]; then
            # Check health endpoint
            local health_url="http://${endpoint}/health"
            local response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" 2>/dev/null)
            
            if [ "$response" == "200" ]; then
                log "✅ $service is healthy"
                return 0
            fi
        fi
        
        echo -n "."
        sleep 10
        ((attempt++))
    done
    
    warn "⚠️  $service health check timed out"
    return 1
}

# ======================================================================
# ROLLBACK FUNCTIONALITY
# ======================================================================

rollback_service() {
    local service=$1
    local version=${2:-"previous"}
    
    log "🔄 Rolling back $service to $version..."
    
    # Get previous task definition
    local task_def=$(aws ecs describe-services \
        --cluster indigenous-cluster \
        --services "$service" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    if [ -n "$task_def" ]; then
        # Get previous revision
        local current_revision=$(echo "$task_def" | grep -oE '[0-9]+$')
        local target_revision=$((current_revision - 1))
        
        if [ "$version" != "previous" ]; then
            target_revision=$version
        fi
        
        # Update service with previous task definition
        aws ecs update-service \
            --cluster indigenous-cluster \
            --service "$service" \
            --task-definition "${service}:${target_revision}" \
            --force-new-deployment
        
        if [ $? -eq 0 ]; then
            log "✅ Rollback initiated for $service"
            check_service_health "$service"
        else
            error "Failed to rollback $service"
            return 1
        fi
    else
        error "No task definition found for $service"
        return 1
    fi
}

# ======================================================================
# MAIN DEPLOYMENT FLOW
# ======================================================================

deploy_services() {
    local services_to_deploy=("$@")
    local failed_services=()
    local successful_services=()
    
    for service in "${services_to_deploy[@]}"; do
        log "="
        log "📦 Processing $service..."
        
        # Build and push Docker image
        local image_tag=$(build_and_push_service "$service")
        
        if [ $? -eq 0 ] && [ -n "$image_tag" ]; then
            # Deploy to ECS
            deploy_service_to_ecs "$service" "$image_tag"
            
            if [ $? -eq 0 ]; then
                # Health check
                check_service_health "$service"
                
                if [ $? -eq 0 ]; then
                    successful_services+=("$service")
                else
                    failed_services+=("$service")
                    warn "Service deployed but health check failed: $service"
                fi
            else
                failed_services+=("$service")
            fi
        else
            failed_services+=("$service")
        fi
    done
    
    # Report results
    log "="
    log "📊 DEPLOYMENT SUMMARY"
    log "="
    
    if [ ${#successful_services[@]} -gt 0 ]; then
        log "✅ Successfully deployed (${#successful_services[@]}):"
        for s in "${successful_services[@]}"; do
            echo "   - $s"
        done
    fi
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        error "❌ Failed deployments (${#failed_services[@]}):"
        for s in "${failed_services[@]}"; do
            echo "   - $s"
        done
        return 1
    fi
    
    return 0
}

# ======================================================================
# COMMAND LINE INTERFACE
# ======================================================================

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
    --tier <1|2|3|4|all>       Deploy services by tier
    --services <service1,service2,...>  Deploy specific services
    --service <service>         Deploy a single service
    --with-dependencies         Include all dependencies
    --env <environment>         Environment (dev|staging|production)
    --rollback <service>        Rollback a service
    --health-check              Run health checks only
    --list-services             List all available services
    --list-tier <tier>          List services in a specific tier
    --dry-run                   Show what would be deployed
    --help                      Show this help message

EXAMPLES:
    # Deploy only core services (Tier 1)
    $0 --tier 1

    # Deploy specific services
    $0 --services auth,rfq,payment

    # Deploy a service with its dependencies
    $0 --service payment --with-dependencies

    # Deploy all services to production
    $0 --env production --tier all

    # Rollback a service
    $0 --rollback rfq-service

    # List all Tier 2 services
    $0 --list-tier 2

EOF
}

# ======================================================================
# MAIN EXECUTION
# ======================================================================

main() {
    # Create logs directory
    mkdir -p "$LOGS_DIR"
    
    # Parse command line arguments
    local TIER=""
    local SERVICES=""
    local SERVICE=""
    local WITH_DEPS=false
    local ENVIRONMENT="production"
    local ROLLBACK=""
    local HEALTH_CHECK_ONLY=false
    local LIST_SERVICES=false
    local LIST_TIER=""
    local DRY_RUN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --tier)
                TIER="$2"
                shift 2
                ;;
            --services)
                SERVICES="$2"
                shift 2
                ;;
            --service)
                SERVICE="$2"
                shift 2
                ;;
            --with-dependencies)
                WITH_DEPS=true
                shift
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --rollback)
                ROLLBACK="$2"
                shift 2
                ;;
            --health-check)
                HEALTH_CHECK_ONLY=true
                shift
                ;;
            --list-services)
                LIST_SERVICES=true
                shift
                ;;
            --list-tier)
                LIST_TIER="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Header
    log "🌲 Indigenous Digital Forest - AWS Deployment"
    log "============================================"
    log "Environment: $ENVIRONMENT"
    log "Timestamp: $TIMESTAMP"
    log ""
    
    # Check prerequisites
    check_aws_prerequisites
    
    # Handle list commands
    if [ "$LIST_SERVICES" = true ]; then
        log "📋 Available services:"
        local all_services=($(discover_all_services))
        for service in "${all_services[@]}"; do
            local tier=$(get_service_tier "$service")
            echo "   - $service (Tier $tier)"
        done
        exit 0
    fi
    
    if [ -n "$LIST_TIER" ]; then
        log "📋 Tier $LIST_TIER services:"
        local tier_services=($(get_services_by_tier "$LIST_TIER"))
        for service in "${tier_services[@]}"; do
            echo "   - $service"
        done
        exit 0
    fi
    
    # Handle rollback
    if [ -n "$ROLLBACK" ]; then
        rollback_service "$ROLLBACK"
        exit $?
    fi
    
    # Handle health check only
    if [ "$HEALTH_CHECK_ONLY" = true ]; then
        log "🏥 Running health checks..."
        local all_services=($(discover_all_services))
        for service in "${all_services[@]}"; do
            check_service_health "$service"
        done
        exit 0
    fi
    
    # Determine services to deploy
    local services_to_deploy=()
    
    if [ -n "$TIER" ]; then
        if [ "$TIER" == "all" ]; then
            services_to_deploy=($(discover_all_services))
        else
            services_to_deploy=($(get_services_by_tier "$TIER"))
        fi
    elif [ -n "$SERVICES" ]; then
        IFS=',' read -ra services_to_deploy <<< "$SERVICES"
        # Add indigenious- prefix if not present
        for i in "${!services_to_deploy[@]}"; do
            if [[ ! "${services_to_deploy[$i]}" == indigenious-* ]]; then
                services_to_deploy[$i]="indigenious-${services_to_deploy[$i]}"
            fi
        done
    elif [ -n "$SERVICE" ]; then
        # Add indigenious- prefix if not present
        if [[ ! "$SERVICE" == indigenious-* ]]; then
            SERVICE="indigenious-${SERVICE}"
        fi
        
        if [ "$WITH_DEPS" = true ]; then
            services_to_deploy=($(resolve_dependencies "$SERVICE"))
        else
            services_to_deploy=("$SERVICE")
        fi
    else
        error "No services specified. Use --tier, --services, or --service"
        show_usage
        exit 1
    fi
    
    # Show deployment plan
    log "📋 Deployment Plan:"
    log "   Services to deploy: ${#services_to_deploy[@]}"
    for service in "${services_to_deploy[@]}"; do
        local tier=$(get_service_tier "$service")
        echo "   - $service (Tier $tier)"
    done
    log ""
    
    if [ "$DRY_RUN" = true ]; then
        log "✅ Dry run completed. No changes made."
        exit 0
    fi
    
    # Confirm deployment
    read -p "Do you want to proceed with deployment? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled."
        exit 0
    fi
    
    # Deploy infrastructure first
    deploy_infrastructure
    
    # Deploy services
    deploy_services "${services_to_deploy[@]}"
    
    if [ $? -eq 0 ]; then
        log ""
        log "🎉 Deployment completed successfully!"
        log "   Check the AWS console for service status"
        log "   Logs saved to: $LOG_FILE"
    else
        error "Deployment completed with errors. Check the log file: $LOG_FILE"
        exit 1
    fi
}

# Run main function
main "$@"