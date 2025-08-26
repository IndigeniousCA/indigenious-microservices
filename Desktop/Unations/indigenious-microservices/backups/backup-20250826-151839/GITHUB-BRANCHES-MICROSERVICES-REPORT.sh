#!/bin/bash

# ============================================================================
# GITHUB BRANCHES & MICROSERVICES COMPREHENSIVE REPORT
# ============================================================================
# This script analyzes all branches and provides detailed metrics for each service
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}  GITHUB BRANCHES & MICROSERVICES ANALYSIS REPORT${NC}"
echo -e "${CYAN}  Repository: https://github.com/IndigeniousCA/indigenious-microservices${NC}"
echo -e "${CYAN}  Date: $(date)${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

# Function to count lines of code
count_lines() {
    local dir=$1
    local lines=0
    
    # Count lines in TypeScript/JavaScript files
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            file_lines=$(wc -l < "$file" 2>/dev/null || echo 0)
            lines=$((lines + file_lines))
        fi
    done < <(find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | grep -v node_modules | grep -v dist)
    
    echo $lines
}

# Function to analyze a service
analyze_service() {
    local service=$1
    local branch=$2
    
    if [ ! -d "$service" ]; then
        echo "N/A|0|0|0|0|0|0|MISSING"
        return
    fi
    
    # Count different file types
    local ts_files=$(find "$service" -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
    local js_files=$(find "$service" -name "*.js" -o -name "*.jsx" 2>/dev/null | grep -v node_modules | grep -v dist | wc -l)
    local total_code_files=$((ts_files + js_files))
    
    # Count lines of code
    local lines_of_code=$(count_lines "$service")
    
    # Check for key files
    local has_package_json="N"
    [ -f "$service/package.json" ] && has_package_json="Y"
    
    local has_dockerfile="N"
    [ -f "$service/Dockerfile" ] && has_dockerfile="Y"
    
    local has_src="N"
    [ -d "$service/src" ] && has_src="Y"
    
    # Determine status
    local status="EMPTY"
    if [ $total_code_files -gt 50 ]; then
        status="COMPLETE"
    elif [ $total_code_files -gt 20 ]; then
        status="READY"
    elif [ $total_code_files -gt 5 ]; then
        status="BASIC"
    elif [ $total_code_files -gt 0 ]; then
        status="MINIMAL"
    fi
    
    echo "$branch|$total_code_files|$lines_of_code|$has_package_json|$has_dockerfile|$has_src|$ts_files|$status"
}

# ============================================================================
# SECTION 1: BRANCH ANALYSIS
# ============================================================================

echo -e "${BLUE}📌 SECTION 1: GITHUB BRANCHES${NC}"
echo "================================"
echo ""

# Get current branch
CURRENT_BRANCH=$(git branch --show-current || git rev-parse --abbrev-ref HEAD)
echo -e "Current Branch: ${GREEN}$CURRENT_BRANCH${NC}"
echo ""

# List all branches
echo "Available Branches:"
git branch -a | grep -E "origin" | grep -v HEAD | while read branch; do
    branch_name=${branch#remotes/origin/}
    last_commit=$(git log -1 --format="%h %s" origin/$branch_name 2>/dev/null | head -1)
    echo -e "  ${YELLOW}$branch_name${NC}"
    echo "    Last commit: $last_commit"
done

echo ""

# ============================================================================
# SECTION 2: MICROSERVICES ANALYSIS ON MAIN BRANCH
# ============================================================================

echo -e "${BLUE}📊 SECTION 2: MICROSERVICES ON MAIN BRANCH${NC}"
echo "==========================================="
echo ""

# Ensure we're on main
git checkout main --quiet 2>/dev/null || true

# Create detailed table header
printf "%-40s %8s %8s %8s %7s %7s %7s %10s\n" \
    "SERVICE NAME" "FILES" "LINES" "PKG.JSON" "DOCKER" "SRC" "TS/TSX" "STATUS"
printf "%-40s %8s %8s %8s %7s %7s %7s %10s\n" \
    "------------" "-----" "-----" "--------" "------" "---" "------" "------"

# Array to store statistics
TOTAL_SERVICES=0
COMPLETE_SERVICES=0
READY_SERVICES=0
BASIC_SERVICES=0
MINIMAL_SERVICES=0
EMPTY_SERVICES=0
TOTAL_FILES=0
TOTAL_LINES=0

# Analyze each service
for service_dir in indigenious-*/; do
    if [ -d "$service_dir" ]; then
        service=$(basename "$service_dir")
        TOTAL_SERVICES=$((TOTAL_SERVICES + 1))
        
        # Get analysis
        analysis=$(analyze_service "$service_dir" "main")
        IFS='|' read -r branch files lines has_pkg has_docker has_src ts_count status <<< "$analysis"
        
        # Update statistics
        TOTAL_FILES=$((TOTAL_FILES + files))
        TOTAL_LINES=$((TOTAL_LINES + lines))
        
        case "$status" in
            "COMPLETE") COMPLETE_SERVICES=$((COMPLETE_SERVICES + 1)); color=$GREEN ;;
            "READY") READY_SERVICES=$((READY_SERVICES + 1)); color=$GREEN ;;
            "BASIC") BASIC_SERVICES=$((BASIC_SERVICES + 1)); color=$YELLOW ;;
            "MINIMAL") MINIMAL_SERVICES=$((MINIMAL_SERVICES + 1)); color=$YELLOW ;;
            "EMPTY"|"MISSING") EMPTY_SERVICES=$((EMPTY_SERVICES + 1)); color=$RED ;;
            *) color=$NC ;;
        esac
        
        # Print row
        printf "%-40s %8s %8s %8s %7s %7s %7s " \
            "$service" "$files" "$lines" "$has_pkg" "$has_docker" "$has_src" "$ts_count"
        echo -e "${color}$status${NC}"
    fi
done

echo ""

# ============================================================================
# SECTION 3: DETAILED STATISTICS
# ============================================================================

echo -e "${BLUE}📈 SECTION 3: DETAILED STATISTICS${NC}"
echo "==================================="
echo ""

echo "Overall Statistics:"
echo "  Total Microservices: $TOTAL_SERVICES"
echo -e "  ${GREEN}Complete Services (50+ files):${NC} $COMPLETE_SERVICES"
echo -e "  ${GREEN}Ready Services (20-50 files):${NC} $READY_SERVICES"
echo -e "  ${YELLOW}Basic Services (5-20 files):${NC} $BASIC_SERVICES"
echo -e "  ${YELLOW}Minimal Services (1-5 files):${NC} $MINIMAL_SERVICES"
echo -e "  ${RED}Empty Services (0 files):${NC} $EMPTY_SERVICES"
echo ""
echo "Code Metrics:"
echo "  Total Code Files: $TOTAL_FILES"
echo "  Total Lines of Code: $TOTAL_LINES"
if [ $TOTAL_SERVICES -gt 0 ]; then
    AVG_FILES=$((TOTAL_FILES / TOTAL_SERVICES))
    AVG_LINES=$((TOTAL_LINES / TOTAL_SERVICES))
    echo "  Average Files per Service: $AVG_FILES"
    echo "  Average Lines per Service: $AVG_LINES"
fi

echo ""

# ============================================================================
# SECTION 4: TOP SERVICES BY CODE VOLUME
# ============================================================================

echo -e "${BLUE}🏆 SECTION 4: TOP 15 SERVICES BY LINES OF CODE${NC}"
echo "=============================================="
echo ""

echo "Analyzing services..."
declare -a SERVICE_LINES=()

for service_dir in indigenious-*/; do
    if [ -d "$service_dir" ]; then
        service=$(basename "$service_dir")
        lines=$(count_lines "$service_dir")
        if [ $lines -gt 0 ]; then
            SERVICE_LINES+=("$lines|$service")
        fi
    fi
done

# Sort and display top 15
printf "%-5s %-40s %10s\n" "RANK" "SERVICE NAME" "LINES OF CODE"
printf "%-5s %-40s %10s\n" "----" "------------" "-------------"

rank=1
for entry in $(printf '%s\n' "${SERVICE_LINES[@]}" | sort -t'|' -k1 -rn | head -15); do
    IFS='|' read -r lines service <<< "$entry"
    printf "%-5s %-40s %10s\n" "#$rank" "$service" "$(printf "%'d" $lines)"
    rank=$((rank + 1))
done

echo ""

# ============================================================================
# SECTION 5: BRANCH COMPARISON
# ============================================================================

echo -e "${BLUE}🔄 SECTION 5: BRANCH COMPARISON${NC}"
echo "================================"
echo ""

# Compare main vs migration branch
echo "Checking migration/complete-microservices-sync branch..."
git checkout origin/migration/complete-microservices-sync --quiet 2>/dev/null || {
    echo "Could not checkout migration branch"
}

MIGRATION_FILES=0
MIGRATION_SERVICES=0

for service_dir in indigenious-*/; do
    if [ -d "$service_dir" ]; then
        MIGRATION_SERVICES=$((MIGRATION_SERVICES + 1))
        files=$(find "$service_dir" \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | grep -v node_modules | wc -l)
        MIGRATION_FILES=$((MIGRATION_FILES + files))
    fi
done

# Switch back to main
git checkout main --quiet 2>/dev/null || true

echo "Branch Comparison:"
printf "%-30s %15s %15s\n" "BRANCH" "SERVICES" "CODE FILES"
printf "%-30s %15s %15s\n" "------" "--------" "----------"
printf "%-30s %15s %15s\n" "main" "$TOTAL_SERVICES" "$TOTAL_FILES"
printf "%-30s %15s %15s\n" "migration/complete-microservices-sync" "$MIGRATION_SERVICES" "$MIGRATION_FILES"

echo ""

# ============================================================================
# SECTION 6: SERVICE HEALTH SUMMARY
# ============================================================================

echo -e "${BLUE}❤️ SECTION 6: SERVICE HEALTH SUMMARY${NC}"
echo "====================================="
echo ""

# Calculate health score
if [ $TOTAL_SERVICES -gt 0 ]; then
    HEALTH_SCORE=$(( (COMPLETE_SERVICES * 100 + READY_SERVICES * 80 + BASIC_SERVICES * 50 + MINIMAL_SERVICES * 20) / TOTAL_SERVICES ))
    
    echo "Platform Health Score: $HEALTH_SCORE/100"
    echo ""
    
    if [ $HEALTH_SCORE -ge 80 ]; then
        echo -e "${GREEN}✅ Platform is PRODUCTION READY${NC}"
    elif [ $HEALTH_SCORE -ge 60 ]; then
        echo -e "${GREEN}✅ Platform is READY FOR TESTING${NC}"
    elif [ $HEALTH_SCORE -ge 40 ]; then
        echo -e "${YELLOW}⚠️ Platform needs more development${NC}"
    else
        echo -e "${RED}❌ Platform is NOT READY${NC}"
    fi
fi

echo ""

# ============================================================================
# SECTION 7: DEPLOYMENT READINESS
# ============================================================================

echo -e "${BLUE}🚀 SECTION 7: DEPLOYMENT READINESS${NC}"
echo "===================================="
echo ""

echo "Services Ready for Deployment (20+ files):"
for service_dir in indigenious-*/; do
    if [ -d "$service_dir" ]; then
        service=$(basename "$service_dir")
        files=$(find "$service_dir" \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | grep -v node_modules | wc -l)
        if [ $files -ge 20 ]; then
            echo -e "  ${GREEN}✓${NC} $service ($files files)"
        fi
    fi
done

echo ""
echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}  REPORT COMPLETE${NC}"
echo -e "${CYAN}============================================================================${NC}"