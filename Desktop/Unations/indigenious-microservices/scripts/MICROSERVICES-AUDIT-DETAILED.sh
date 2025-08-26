#!/bin/bash

# ============================================================================
# COMPREHENSIVE MICROSERVICES AUDIT SCRIPT
# ============================================================================
# This script audits EVERY microservice to ensure none are empty
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_SERVICES=0
SERVICES_WITH_CODE=0
EMPTY_SERVICES=0
README_ONLY_SERVICES=0

echo "============================================================================"
echo "  COMPREHENSIVE MICROSERVICES AUDIT"
echo "  Branch: $(git branch --show-current || git rev-parse --abbrev-ref HEAD)"
echo "  Date: $(date)"
echo "============================================================================"
echo ""

# Create arrays to store service categories
declare -a HEALTHY_SERVICES=()
declare -a MINIMAL_SERVICES=()
declare -a EMPTY_SERVICES_LIST=()
declare -a README_ONLY_LIST=()

# Function to analyze a service
analyze_service() {
    local service=$1
    local ts_files=$(find "$service" -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
    local js_files=$(find "$service" -name "*.js" -o -name "*.jsx" 2>/dev/null | grep -v node_modules | grep -v dist | wc -l)
    local total_code_files=$((ts_files + js_files))
    
    # Check for package.json
    local has_package_json=0
    if [ -f "$service/package.json" ]; then
        has_package_json=1
    fi
    
    # Check for Dockerfile
    local has_dockerfile=0
    if [ -f "$service/Dockerfile" ]; then
        has_dockerfile=1
    fi
    
    # Check for README
    local has_readme=0
    if [ -f "$service/README.md" ] || [ -f "$service/readme.md" ]; then
        has_readme=1
    fi
    
    # Check for source directory
    local has_src=0
    if [ -d "$service/src" ]; then
        has_src=1
    fi
    
    # Count all files (excluding common non-code files)
    local total_files=$(find "$service" -type f 2>/dev/null | \
        grep -v node_modules | \
        grep -v ".git" | \
        grep -v ".DS_Store" | \
        wc -l)
    
    echo "$service|$total_code_files|$has_package_json|$has_dockerfile|$has_readme|$has_src|$total_files|$ts_files|$js_files"
}

echo "Analyzing all microservices..."
echo ""

# Header for the table
printf "%-40s %8s %8s %8s %8s %8s %8s\n" "SERVICE" "CODE" "PKG.JSON" "DOCKER" "README" "SRC" "STATUS"
printf "%-40s %8s %8s %8s %8s %8s %8s\n" "-------" "----" "--------" "------" "------" "---" "------"

# Analyze each service
for service_dir in indigenious-*/; do
    if [ -d "$service_dir" ]; then
        service=${service_dir%/}
        TOTAL_SERVICES=$((TOTAL_SERVICES + 1))
        
        # Get analysis
        analysis=$(analyze_service "$service")
        IFS='|' read -r name code_files has_package has_docker has_readme has_src total_files ts_count js_count <<< "$analysis"
        
        # Determine status
        status=""
        status_color=""
        
        if [ "$code_files" -gt 20 ]; then
            status="✅ HEALTHY"
            status_color=$GREEN
            SERVICES_WITH_CODE=$((SERVICES_WITH_CODE + 1))
            HEALTHY_SERVICES+=("$service ($code_files files)")
        elif [ "$code_files" -gt 0 ]; then
            status="⚠️  MINIMAL"
            status_color=$YELLOW
            SERVICES_WITH_CODE=$((SERVICES_WITH_CODE + 1))
            MINIMAL_SERVICES+=("$service ($code_files files)")
        elif [ "$total_files" -le 2 ] && [ "$has_readme" -eq 1 ]; then
            status="📄 README"
            status_color=$YELLOW
            README_ONLY_SERVICES=$((README_ONLY_SERVICES + 1))
            README_ONLY_LIST+=("$service")
        else
            status="❌ EMPTY"
            status_color=$RED
            EMPTY_SERVICES=$((EMPTY_SERVICES + 1))
            EMPTY_SERVICES_LIST+=("$service")
        fi
        
        # Print row with color
        printf "%-40s %8s %8s %8s %8s %8s " "$name" "$code_files" \
            "$([ $has_package -eq 1 ] && echo '✓' || echo '-')" \
            "$([ $has_docker -eq 1 ] && echo '✓' || echo '-')" \
            "$([ $has_readme -eq 1 ] && echo '✓' || echo '-')" \
            "$([ $has_src -eq 1 ] && echo '✓' || echo '-')"
        echo -e "${status_color}${status}${NC}"
    fi
done

echo ""
echo "============================================================================"
echo "  AUDIT SUMMARY"
echo "============================================================================"
echo ""

# Summary statistics
echo -e "${BLUE}📊 STATISTICS:${NC}"
echo "  Total Microservices: $TOTAL_SERVICES"
echo -e "  ${GREEN}Services with Code: $SERVICES_WITH_CODE${NC}"
echo -e "  ${YELLOW}README-only Services: $README_ONLY_SERVICES${NC}"
echo -e "  ${RED}Empty Services: $EMPTY_SERVICES${NC}"
echo ""

# Calculate percentage
if [ $TOTAL_SERVICES -gt 0 ]; then
    COMPLETION_PERCENT=$((SERVICES_WITH_CODE * 100 / TOTAL_SERVICES))
    echo -e "${BLUE}📈 COMPLETION RATE: ${GREEN}${COMPLETION_PERCENT}%${NC}"
fi

echo ""

# List healthy services (20+ files)
if [ ${#HEALTHY_SERVICES[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ HEALTHY SERVICES (20+ files):${NC}"
    for service in "${HEALTHY_SERVICES[@]}"; do
        echo "  - $service"
    done | sort -t'(' -k2 -rn | head -20
    if [ ${#HEALTHY_SERVICES[@]} -gt 20 ]; then
        echo "  ... and $((${#HEALTHY_SERVICES[@]} - 20)) more"
    fi
    echo ""
fi

# List minimal services (1-19 files)
if [ ${#MINIMAL_SERVICES[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  MINIMAL SERVICES (1-19 files):${NC}"
    for service in "${MINIMAL_SERVICES[@]}"; do
        echo "  - $service"
    done
    echo ""
fi

# List empty services
if [ ${#EMPTY_SERVICES_LIST[@]} -gt 0 ]; then
    echo -e "${RED}❌ EMPTY SERVICES:${NC}"
    for service in "${EMPTY_SERVICES_LIST[@]}"; do
        echo "  - $service"
    done
    echo ""
fi

# List README-only services
if [ ${#README_ONLY_LIST[@]} -gt 0 ]; then
    echo -e "${YELLOW}📄 README-ONLY SERVICES:${NC}"
    for service in "${README_ONLY_LIST[@]}"; do
        echo "  - $service"
    done
    echo ""
fi

# Top 10 services by file count
echo -e "${BLUE}🏆 TOP 10 SERVICES BY CODE FILES:${NC}"
for service_dir in indigenious-*/; do
    if [ -d "$service_dir" ]; then
        service=${service_dir%/}
        count=$(find "$service" \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | grep -v node_modules | wc -l)
        if [ $count -gt 0 ]; then
            echo "$count|$service"
        fi
    fi
done | sort -t'|' -k1 -rn | head -10 | while IFS='|' read count name; do
    printf "  %-40s %6d files\n" "$name" "$count"
done

echo ""
echo "============================================================================"

# Final verdict
echo ""
if [ $EMPTY_SERVICES -eq 0 ] && [ $README_ONLY_SERVICES -eq 0 ]; then
    echo -e "${GREEN}✅ SUCCESS: All services contain code!${NC}"
elif [ $SERVICES_WITH_CODE -gt 60 ]; then
    echo -e "${GREEN}✅ MOSTLY COMPLETE: $SERVICES_WITH_CODE/$TOTAL_SERVICES services have code${NC}"
else
    echo -e "${RED}⚠️  NEEDS ATTENTION: Only $SERVICES_WITH_CODE/$TOTAL_SERVICES services have code${NC}"
fi

echo ""
echo "Audit complete!"