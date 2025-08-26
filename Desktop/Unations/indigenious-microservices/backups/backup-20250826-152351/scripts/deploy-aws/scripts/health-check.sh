#!/bin/bash

# ======================================================================
# HEALTH CHECK SCRIPT - INDIGENOUS MICROSERVICES PLATFORM
# ======================================================================
# Comprehensive health checking for all deployed services
# ======================================================================

set -e

# ======================================================================
# CONFIGURATION
# ======================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../config"
LOGS_DIR="${SCRIPT_DIR}/../../logs/health-checks"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${LOGS_DIR}/health_report_${TIMESTAMP}.json"

# AWS Configuration
AWS_REGION="${AWS_REGION:-ca-central-1}"
CLUSTER_NAME="${CLUSTER_NAME:-indigenous-production}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Health check configuration
MAX_RETRIES=3
RETRY_DELAY=5
TIMEOUT=10

# ======================================================================
# HELPER FUNCTIONS
# ======================================================================

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# ======================================================================
# JSON HELPERS
# ======================================================================

init_report() {
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "cluster": "$CLUSTER_NAME",
  "region": "$AWS_REGION",
  "services": {},
  "infrastructure": {},
  "summary": {}
}
EOF
}

update_report() {
    local path=$1
    local value=$2
    local temp_file="${REPORT_FILE}.tmp"
    
    jq "$path = $value" "$REPORT_FILE" > "$temp_file" && mv "$temp_file" "$REPORT_FILE"
}

# ======================================================================
# ECS SERVICE HEALTH CHECK
# ======================================================================

check_ecs_service() {
    local service_name=$1
    local retries=0
    local status="unknown"
    local running_count=0
    local desired_count=0
    local health_status="unknown"
    
    log "Checking ECS service: $service_name"
    
    while [ $retries -lt $MAX_RETRIES ]; do
        # Get service status
        local service_info=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$service_name" \
            --region "$AWS_REGION" \
            --query 'services[0]' \
            --output json 2>/dev/null || echo "{}")
        
        if [ "$service_info" != "{}" ] && [ "$service_info" != "null" ]; then
            status=$(echo "$service_info" | jq -r '.status // "unknown"')
            running_count=$(echo "$service_info" | jq -r '.runningCount // 0')
            desired_count=$(echo "$service_info" | jq -r '.desiredCount // 0')
            
            # Check if service is healthy
            if [ "$status" == "ACTIVE" ] && [ "$running_count" -eq "$desired_count" ] && [ "$desired_count" -gt 0 ]; then
                health_status="healthy"
                
                # Check target health if load balancer is attached
                local target_health=$(check_target_health "$service_name")
                if [ "$target_health" == "unhealthy" ]; then
                    health_status="degraded"
                fi
            elif [ "$running_count" -lt "$desired_count" ]; then
                health_status="degraded"
            elif [ "$desired_count" -eq 0 ]; then
                health_status="stopped"
            else
                health_status="unhealthy"
            fi
            
            break
        fi
        
        ((retries++))
        sleep $RETRY_DELAY
    done
    
    # Update report
    local service_json=$(cat << EOF
{
  "status": "$status",
  "health": "$health_status",
  "running_count": $running_count,
  "desired_count": $desired_count,
  "checked_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
)
    
    update_report ".services.\"$service_name\"" "$service_json"
    
    # Display result
    if [ "$health_status" == "healthy" ]; then
        echo -e "  ${GREEN}✓${NC} $service_name: HEALTHY ($running_count/$desired_count tasks)"
    elif [ "$health_status" == "degraded" ]; then
        echo -e "  ${YELLOW}⚠${NC} $service_name: DEGRADED ($running_count/$desired_count tasks)"
    elif [ "$health_status" == "stopped" ]; then
        echo -e "  ${BLUE}○${NC} $service_name: STOPPED (0 tasks)"
    else
        echo -e "  ${RED}✗${NC} $service_name: UNHEALTHY ($running_count/$desired_count tasks)"
    fi
    
    echo "$health_status"
}

# ======================================================================
# TARGET GROUP HEALTH CHECK
# ======================================================================

check_target_health() {
    local service_name=$1
    
    # Get target group ARN for the service
    local target_group_arn=$(aws elbv2 describe-target-groups \
        --region "$AWS_REGION" \
        --query "TargetGroups[?contains(TargetGroupName, '$service_name')].TargetGroupArn | [0]" \
        --output text 2>/dev/null)
    
    if [ -z "$target_group_arn" ] || [ "$target_group_arn" == "None" ]; then
        echo "unknown"
        return
    fi
    
    # Check target health
    local unhealthy_count=$(aws elbv2 describe-target-health \
        --target-group-arn "$target_group_arn" \
        --region "$AWS_REGION" \
        --query "length(TargetHealthDescriptions[?TargetHealth.State != 'healthy'])" \
        --output text 2>/dev/null || echo "0")
    
    if [ "$unhealthy_count" -gt 0 ]; then
        echo "unhealthy"
    else
        echo "healthy"
    fi
}

# ======================================================================
# HTTP ENDPOINT HEALTH CHECK
# ======================================================================

check_http_endpoint() {
    local service_name=$1
    local endpoint=$2
    local health_path=${3:-"/health"}
    
    log "Checking HTTP endpoint for $service_name"
    
    local url="${endpoint}${health_path}"
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" \
        --connect-timeout $TIMEOUT \
        --max-time $TIMEOUT \
        "$url" 2>/dev/null || echo "000")
    
    local health_status="unhealthy"
    if [ "$response_code" == "200" ]; then
        health_status="healthy"
    elif [ "$response_code" == "503" ]; then
        health_status="degraded"
    fi
    
    # Display result
    if [ "$health_status" == "healthy" ]; then
        echo -e "  ${GREEN}✓${NC} $service_name HTTP: $response_code"
    else
        echo -e "  ${RED}✗${NC} $service_name HTTP: $response_code"
    fi
    
    echo "$health_status"
}

# ======================================================================
# DATABASE HEALTH CHECK
# ======================================================================

check_database() {
    log "Checking RDS Aurora database"
    
    local db_status=$(aws rds describe-db-clusters \
        --db-cluster-identifier "indigenous-production" \
        --region "$AWS_REGION" \
        --query 'DBClusters[0].Status' \
        --output text 2>/dev/null || echo "unknown")
    
    local health_status="unhealthy"
    if [ "$db_status" == "available" ]; then
        health_status="healthy"
    elif [ "$db_status" == "backing-up" ] || [ "$db_status" == "configuring-enhanced-monitoring" ]; then
        health_status="degraded"
    fi
    
    # Update report
    update_report '.infrastructure.database' "{\"status\": \"$db_status\", \"health\": \"$health_status\"}"
    
    # Display result
    if [ "$health_status" == "healthy" ]; then
        echo -e "  ${GREEN}✓${NC} Database: $db_status"
    elif [ "$health_status" == "degraded" ]; then
        echo -e "  ${YELLOW}⚠${NC} Database: $db_status"
    else
        echo -e "  ${RED}✗${NC} Database: $db_status"
    fi
    
    echo "$health_status"
}

# ======================================================================
# REDIS HEALTH CHECK
# ======================================================================

check_redis() {
    log "Checking ElastiCache Redis"
    
    local cache_status=$(aws elasticache describe-cache-clusters \
        --cache-cluster-id "indigenous-production-redis" \
        --region "$AWS_REGION" \
        --query 'CacheClusters[0].CacheClusterStatus' \
        --output text 2>/dev/null || echo "unknown")
    
    local health_status="unhealthy"
    if [ "$cache_status" == "available" ]; then
        health_status="healthy"
    elif [ "$cache_status" == "modifying" ] || [ "$cache_status" == "snapshotting" ]; then
        health_status="degraded"
    fi
    
    # Update report
    update_report '.infrastructure.redis' "{\"status\": \"$cache_status\", \"health\": \"$health_status\"}"
    
    # Display result
    if [ "$health_status" == "healthy" ]; then
        echo -e "  ${GREEN}✓${NC} Redis: $cache_status"
    elif [ "$health_status" == "degraded" ]; then
        echo -e "  ${YELLOW}⚠${NC} Redis: $cache_status"
    else
        echo -e "  ${RED}✗${NC} Redis: $cache_status"
    fi
    
    echo "$health_status"
}

# ======================================================================
# COMPREHENSIVE HEALTH CHECK
# ======================================================================

run_comprehensive_check() {
    log "🏥 Starting comprehensive health check"
    log "=================================="
    
    # Initialize report
    mkdir -p "$LOGS_DIR"
    init_report
    
    # Counters
    local total_services=0
    local healthy_services=0
    local degraded_services=0
    local unhealthy_services=0
    
    # Check infrastructure
    log ""
    log "Infrastructure Health:"
    log "---------------------"
    
    check_database
    check_redis
    
    # Get all running services
    log ""
    log "Service Health:"
    log "--------------"
    
    local services=$(aws ecs list-services \
        --cluster "$CLUSTER_NAME" \
        --region "$AWS_REGION" \
        --query 'serviceArns[]' \
        --output text 2>/dev/null | tr '\t' '\n')
    
    if [ -z "$services" ]; then
        warn "No services found in cluster $CLUSTER_NAME"
    else
        for service_arn in $services; do
            local service_name=$(echo "$service_arn" | awk -F'/' '{print $NF}')
            local health=$(check_ecs_service "$service_name")
            
            ((total_services++))
            
            case "$health" in
                "healthy")
                    ((healthy_services++))
                    ;;
                "degraded")
                    ((degraded_services++))
                    ;;
                "unhealthy"|"stopped")
                    ((unhealthy_services++))
                    ;;
            esac
        done
    fi
    
    # Update summary
    local summary_json=$(cat << EOF
{
  "total_services": $total_services,
  "healthy": $healthy_services,
  "degraded": $degraded_services,
  "unhealthy": $unhealthy_services,
  "health_percentage": $(echo "scale=2; ($healthy_services * 100) / $total_services" | bc 2>/dev/null || echo 0)
}
EOF
)
    
    update_report '.summary' "$summary_json"
    
    # Display summary
    log ""
    log "=================================="
    log "Health Check Summary:"
    log "=================================="
    echo -e "Total Services: $total_services"
    echo -e "${GREEN}Healthy:${NC} $healthy_services"
    echo -e "${YELLOW}Degraded:${NC} $degraded_services"
    echo -e "${RED}Unhealthy:${NC} $unhealthy_services"
    
    if [ $total_services -gt 0 ]; then
        local health_percentage=$(echo "scale=0; ($healthy_services * 100) / $total_services" | bc)
        echo -e "Health Score: ${health_percentage}%"
        
        if [ $health_percentage -ge 90 ]; then
            log ""
            log "✅ Platform is HEALTHY"
            return 0
        elif [ $health_percentage -ge 70 ]; then
            log ""
            warn "⚠️  Platform is DEGRADED"
            return 1
        else
            log ""
            error "❌ Platform is UNHEALTHY"
            return 2
        fi
    else
        error "No services to check"
        return 3
    fi
}

# ======================================================================
# SERVICE-SPECIFIC HEALTH CHECK
# ======================================================================

check_specific_service() {
    local service_name=$1
    
    log "🏥 Checking health of $service_name"
    log "=================================="
    
    mkdir -p "$LOGS_DIR"
    init_report
    
    local health=$(check_ecs_service "$service_name")
    
    # Try HTTP health check if service has ALB
    local alb_dns=$(aws elbv2 describe-load-balancers \
        --region "$AWS_REGION" \
        --query "LoadBalancers[0].DNSName" \
        --output text 2>/dev/null)
    
    if [ -n "$alb_dns" ] && [ "$alb_dns" != "None" ]; then
        check_http_endpoint "$service_name" "http://$alb_dns" "/health"
    fi
    
    log ""
    log "Report saved to: $REPORT_FILE"
    
    if [ "$health" == "healthy" ]; then
        return 0
    elif [ "$health" == "degraded" ]; then
        return 1
    else
        return 2
    fi
}

# ======================================================================
# MAIN EXECUTION
# ======================================================================

main() {
    # Parse arguments
    if [ $# -eq 0 ]; then
        run_comprehensive_check
    elif [ "$1" == "--service" ] && [ -n "$2" ]; then
        check_specific_service "$2"
    elif [ "$1" == "--help" ]; then
        cat << EOF
Usage: $0 [OPTIONS]

OPTIONS:
    --service <name>    Check a specific service
    --help             Show this help message

EXAMPLES:
    # Check all services
    $0
    
    # Check specific service
    $0 --service indigenious-auth-service

ENVIRONMENT VARIABLES:
    AWS_REGION       AWS region (default: ca-central-1)
    CLUSTER_NAME     ECS cluster name (default: indigenous-production)

EOF
        exit 0
    else
        error "Invalid arguments. Use --help for usage information."
        exit 1
    fi
    
    exit_code=$?
    
    log ""
    log "Health check completed. Report saved to: $REPORT_FILE"
    
    exit $exit_code
}

# Run main function
main "$@"