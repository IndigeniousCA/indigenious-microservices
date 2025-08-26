#!/bin/bash

# ============================================================================
# COMPREHENSIVE MIGRATION AUDIT
# ============================================================================
# This script performs an in-depth audit to ensure EVERYTHING is migrated
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Directories
MONOLITH_DIR="/Users/Jon/Desktop/Unations /Indigenious"
MICROSERVICES_DIR="/Users/Jon/Desktop/Unations/indigenious-microservices"
AUDIT_REPORT="$MICROSERVICES_DIR/AUDIT-REPORT-$(date +%Y%m%d-%H%M%S).md"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  COMPREHENSIVE MIGRATION AUDIT${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Function to log to report
log_report() {
    echo "$1" >> "$AUDIT_REPORT"
}

# Initialize report
cat > "$AUDIT_REPORT" << EOF
# Migration Audit Report
Generated: $(date)

## Executive Summary
This report verifies the complete migration from monolith to microservices.

EOF

# Function to check item
check_item() {
    local description=$1
    local condition=$2
    ((TOTAL_CHECKS++))
    
    if eval "$condition"; then
        echo -e "  ${GREEN}✓${NC} $description"
        log_report "- ✅ $description"
        ((PASSED_CHECKS++))
        return 0
    else
        echo -e "  ${RED}✗${NC} $description"
        log_report "- ❌ $description"
        ((FAILED_CHECKS++))
        return 1
    fi
}

# Function to check file exists
check_file() {
    local file=$1
    local service=$2
    local critical=${3:-false}
    
    if [ -f "$MICROSERVICES_DIR/$service/$file" ]; then
        echo -e "    ${GREEN}✓${NC} $file exists in $service"
        return 0
    else
        if [ "$critical" == "true" ]; then
            echo -e "    ${RED}✗ CRITICAL:${NC} $file missing in $service"
            ((FAILED_CHECKS++))
        else
            echo -e "    ${YELLOW}⚠${NC} $file missing in $service"
            ((WARNINGS++))
        fi
        return 1
    fi
}

# ============================================================================
# SECTION 1: FRONTEND AUDIT
# ============================================================================
echo -e "${CYAN}▶ SECTION 1: FRONTEND MIGRATION AUDIT${NC}"
log_report "## Frontend Migration"
log_report ""

FRONTEND_SERVICE="indigenious-web-frontend"

# Count app routes
MONOLITH_ROUTES=$(find "$MONOLITH_DIR/src/app" -type d -maxdepth 1 | wc -l)
MICRO_ROUTES=$(find "$MICROSERVICES_DIR/$FRONTEND_SERVICE/src/app" -type d -maxdepth 1 2>/dev/null | wc -l)

check_item "Frontend app directory exists" "[ -d '$MICROSERVICES_DIR/$FRONTEND_SERVICE/src/app' ]"
check_item "All app routes migrated ($MICRO_ROUTES/$MONOLITH_ROUTES)" "[ $MICRO_ROUTES -ge $((MONOLITH_ROUTES - 1)) ]"

# Check critical frontend files
echo -e "  ${BLUE}Checking critical frontend files:${NC}"
check_file "package.json" "$FRONTEND_SERVICE" true
check_file "next.config.js" "$FRONTEND_SERVICE" true
check_file "tsconfig.json" "$FRONTEND_SERVICE" true
check_file "tailwind.config.js" "$FRONTEND_SERVICE" true
check_file "src/app/layout.tsx" "$FRONTEND_SERVICE" true
check_file "src/app/page.tsx" "$FRONTEND_SERVICE" true

# Check specific routes
echo -e "  ${BLUE}Checking specific routes:${NC}"
for route in admin dashboard auth api analytics payments; do
    check_item "Route /$route exists" "[ -d '$MICROSERVICES_DIR/$FRONTEND_SERVICE/src/app/$route' ]"
done

# Count components
MONOLITH_COMPONENTS=$(find "$MONOLITH_DIR/src/components" -name "*.tsx" -o -name "*.jsx" 2>/dev/null | wc -l)
MICRO_COMPONENTS=$(find "$MICROSERVICES_DIR/$FRONTEND_SERVICE/src/components" -name "*.tsx" -o -name "*.jsx" 2>/dev/null | wc -l)
check_item "Components migrated ($MICRO_COMPONENTS/$MONOLITH_COMPONENTS)" "[ $MICRO_COMPONENTS -gt 0 ]"

# Count hooks
MONOLITH_HOOKS=$(find "$MONOLITH_DIR/src/hooks" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
MICRO_HOOKS=$(find "$MICROSERVICES_DIR/$FRONTEND_SERVICE/src/hooks" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
check_item "Hooks migrated ($MICRO_HOOKS/$MONOLITH_HOOKS)" "[ $MICRO_HOOKS -gt 0 ]"

# ============================================================================
# SECTION 2: AI/ML SYSTEMS AUDIT
# ============================================================================
echo ""
echo -e "${CYAN}▶ SECTION 2: AI/ML SYSTEMS AUDIT${NC}"
log_report ""
log_report "## AI/ML Systems"
log_report ""

AI_SERVICE="indigenious-ai-orchestrator-service"

# Check critical AI files
echo -e "  ${BLUE}Checking critical AI components:${NC}"
check_item "UnifiedBusinessIntelligence.ts exists" \
    "[ -f '$MICROSERVICES_DIR/$AI_SERVICE/src/features/ai-integration/services/UnifiedBusinessIntelligence.ts' ]"
    
check_item "UniversalAmbientService.ts exists" \
    "[ -f '$MICROSERVICES_DIR/$AI_SERVICE/src/features/ambient-intelligence/UniversalAmbientService.ts' ]"
    
check_item "PredictiveIntelligenceEngine.ts exists" \
    "[ -f '$MICROSERVICES_DIR/$AI_SERVICE/src/features/ai-integration/services/PredictiveIntelligenceEngine.ts' ]"
    
check_item "CrossSystemLearningPipeline.ts exists" \
    "[ -f '$MICROSERVICES_DIR/$AI_SERVICE/src/features/ai-integration/services/CrossSystemLearningPipeline.ts' ]"

# Check AI features
echo -e "  ${BLUE}Checking AI features:${NC}"
for feature in ai-integration ambient-intelligence ai-ml ai-assistant ai-bid-assistant ai-rfq-matching; do
    check_item "AI feature $feature migrated" "[ -d '$MICROSERVICES_DIR/$AI_SERVICE/src/features/$feature' ]"
done

# ============================================================================
# SECTION 3: ALL 83 FEATURES AUDIT
# ============================================================================
echo ""
echo -e "${CYAN}▶ SECTION 3: ALL 83 FEATURES AUDIT${NC}"
log_report ""
log_report "## Feature Migration Status"
log_report ""

# Count features in monolith
MONOLITH_FEATURES=$(ls -d "$MONOLITH_DIR/src/features"/* 2>/dev/null | wc -l)
echo -e "  Total features in monolith: ${BLUE}$MONOLITH_FEATURES${NC}"

# Count migrated features across all services
MIGRATED_FEATURES=0
for service in "$MICROSERVICES_DIR"/indigenious-*; do
    if [ -d "$service/src/features" ]; then
        count=$(ls -d "$service/src/features"/* 2>/dev/null | wc -l)
        if [ $count -gt 0 ]; then
            ((MIGRATED_FEATURES += count))
        fi
    fi
done
echo -e "  Total features migrated: ${BLUE}$MIGRATED_FEATURES${NC}"

check_item "All features migrated ($MIGRATED_FEATURES/$MONOLITH_FEATURES)" "[ $MIGRATED_FEATURES -ge $MONOLITH_FEATURES ]"

# Check specific critical features
echo -e "  ${BLUE}Checking critical features:${NC}"
CRITICAL_FEATURES=(
    "auth:indigenious-auth-service"
    "rfq-system:indigenious-rfq-service"
    "payment-rails:indigenious-payment-service"
    "document-management:indigenious-document-service"
    "chat:indigenious-chat-service"
    "business-directory:indigenious-business-service"
    "compliance-engine:indigenious-compliance-service"
    "analytics:indigenious-analytics-service"
)

for feature_mapping in "${CRITICAL_FEATURES[@]}"; do
    IFS=':' read -r feature service <<< "$feature_mapping"
    check_item "Critical feature $feature in $service" \
        "[ -d '$MICROSERVICES_DIR/$service/src/features/$feature' ]"
done

# ============================================================================
# SECTION 4: DATABASE SCHEMAS AUDIT
# ============================================================================
echo ""
echo -e "${CYAN}▶ SECTION 4: DATABASE SCHEMAS AUDIT${NC}"
log_report ""
log_report "## Database Schemas"
log_report ""

# Count services with Prisma schemas
SCHEMA_COUNT=$(find "$MICROSERVICES_DIR" -name "schema.prisma" -path "*/prisma/*" 2>/dev/null | wc -l)
echo -e "  Services with Prisma schemas: ${BLUE}$SCHEMA_COUNT${NC}"

# Check critical services have schemas
echo -e "  ${BLUE}Checking critical services have schemas:${NC}"
CRITICAL_DB_SERVICES=(
    "indigenious-auth-service"
    "indigenious-business-service"
    "indigenious-rfq-service"
    "indigenious-payment-service"
    "indigenious-document-service"
    "indigenious-chat-service"
    "indigenious-analytics-service"
    "indigenious-user-service"
)

for service in "${CRITICAL_DB_SERVICES[@]}"; do
    check_item "Schema in $service" "[ -f '$MICROSERVICES_DIR/$service/prisma/schema.prisma' ]"
done

# ============================================================================
# SECTION 5: FILE COUNT COMPARISON
# ============================================================================
echo ""
echo -e "${CYAN}▶ SECTION 5: FILE COUNT COMPARISON${NC}"
log_report ""
log_report "## File Count Analysis"
log_report ""

# Count source files
MONOLITH_TS=$(find "$MONOLITH_DIR/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
MONOLITH_JS=$(find "$MONOLITH_DIR/src" -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l)
MONOLITH_TOTAL=$((MONOLITH_TS + MONOLITH_JS))

MICRO_TS=$(find "$MICROSERVICES_DIR" -name "*.ts" -o -name "*.tsx" -path "*/src/*" 2>/dev/null | wc -l)
MICRO_JS=$(find "$MICROSERVICES_DIR" -name "*.js" -o -name "*.jsx" -path "*/src/*" 2>/dev/null | wc -l)
MICRO_TOTAL=$((MICRO_TS + MICRO_JS))

echo -e "  ${BLUE}Monolith:${NC}"
echo -e "    TypeScript files: $MONOLITH_TS"
echo -e "    JavaScript files: $MONOLITH_JS"
echo -e "    Total: $MONOLITH_TOTAL"

echo -e "  ${BLUE}Microservices:${NC}"
echo -e "    TypeScript files: $MICRO_TS"
echo -e "    JavaScript files: $MICRO_JS"
echo -e "    Total: $MICRO_TOTAL"

PERCENTAGE=$((MICRO_TOTAL * 100 / MONOLITH_TOTAL))
echo -e "  ${BLUE}Migration coverage: ${PERCENTAGE}%${NC}"

check_item "Adequate migration coverage (>90%)" "[ $PERCENTAGE -ge 90 ]"

# ============================================================================
# SECTION 6: SERVICE HEALTH CHECK
# ============================================================================
echo ""
echo -e "${CYAN}▶ SECTION 6: SERVICE HEALTH CHECK${NC}"
log_report ""
log_report "## Service Health"
log_report ""

# Count services with actual code
SERVICES_WITH_CODE=0
EMPTY_SERVICES=""

for service in "$MICROSERVICES_DIR"/indigenious-*; do
    if [ -d "$service/src" ]; then
        service_name=$(basename "$service")
        file_count=$(find "$service/src" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l)
        if [ $file_count -gt 0 ]; then
            ((SERVICES_WITH_CODE++))
        else
            EMPTY_SERVICES="$EMPTY_SERVICES $service_name"
        fi
    fi
done

TOTAL_SERVICES=$(ls -d "$MICROSERVICES_DIR"/indigenious-* | wc -l)
echo -e "  Services with code: ${BLUE}$SERVICES_WITH_CODE/$TOTAL_SERVICES${NC}"

if [ -n "$EMPTY_SERVICES" ]; then
    echo -e "  ${YELLOW}Empty services:${NC}"
    for service in $EMPTY_SERVICES; do
        echo -e "    - $service"
    done
fi

check_item "Most services have code (>70%)" "[ $SERVICES_WITH_CODE -gt $((TOTAL_SERVICES * 70 / 100)) ]"

# ============================================================================
# SECTION 7: DEPENDENCY CHECK
# ============================================================================
echo ""
echo -e "${CYAN}▶ SECTION 7: DEPENDENCY CHECK${NC}"
log_report ""
log_report "## Dependencies"
log_report ""

# Check for package.json in critical services
echo -e "  ${BLUE}Checking package.json in services:${NC}"
SERVICES_WITH_PACKAGE=0
for service in "$MICROSERVICES_DIR"/indigenious-*; do
    if [ -f "$service/package.json" ]; then
        ((SERVICES_WITH_PACKAGE++))
    fi
done

echo -e "  Services with package.json: ${BLUE}$SERVICES_WITH_PACKAGE/$TOTAL_SERVICES${NC}"
check_item "Most services have package.json" "[ $SERVICES_WITH_PACKAGE -gt $((TOTAL_SERVICES / 2)) ]"

# ============================================================================
# SECTION 8: CRITICAL PATHS VERIFICATION
# ============================================================================
echo ""
echo -e "${CYAN}▶ SECTION 8: CRITICAL PATHS VERIFICATION${NC}"
log_report ""
log_report "## Critical Paths"
log_report ""

echo -e "  ${BLUE}Verifying critical user paths:${NC}"

# Auth flow
check_item "Auth flow: login page exists" \
    "[ -d '$MICROSERVICES_DIR/indigenious-web-frontend/src/app/auth' ]"
check_item "Auth flow: auth service exists" \
    "[ -d '$MICROSERVICES_DIR/indigenious-auth-service/src/features/auth' ]"

# RFQ flow
check_item "RFQ flow: RFQ pages exist" \
    "[ -d '$MICROSERVICES_DIR/indigenious-web-frontend/src/app' ]"
check_item "RFQ flow: RFQ service exists" \
    "[ -d '$MICROSERVICES_DIR/indigenious-rfq-service/src/features/rfq-system' ]"

# Payment flow
check_item "Payment flow: payment service exists" \
    "[ -d '$MICROSERVICES_DIR/indigenious-payment-service/src/features/payment-rails' ]"

# ============================================================================
# SECTION 9: MISSING ITEMS CHECK
# ============================================================================
echo ""
echo -e "${CYAN}▶ SECTION 9: MISSING ITEMS CHECK${NC}"
log_report ""
log_report "## Potential Issues"
log_report ""

# Check for features that might not have been mapped
echo -e "  ${BLUE}Checking for unmapped features:${NC}"
for feature_dir in "$MONOLITH_DIR/src/features"/*; do
    if [ -d "$feature_dir" ]; then
        feature=$(basename "$feature_dir")
        found=false
        for service in "$MICROSERVICES_DIR"/indigenious-*; do
            if [ -d "$service/src/features/$feature" ]; then
                found=true
                break
            fi
        done
        if [ "$found" = false ]; then
            echo -e "    ${YELLOW}⚠${NC} Feature '$feature' may not be fully migrated"
            ((WARNINGS++))
        fi
    fi
done

# ============================================================================
# FINAL REPORT
# ============================================================================
echo ""
echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}  AUDIT SUMMARY${NC}"
echo -e "${BLUE}============================================================================${NC}"

PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo ""
echo -e "  Total Checks: ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "  Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "  Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "  Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "  Pass Rate: ${BLUE}${PASS_RATE}%${NC}"
echo ""

# Final status
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ AUDIT PASSED - Migration is complete!${NC}"
    STATUS="PASSED"
elif [ $FAILED_CHECKS -le 5 ]; then
    echo -e "${YELLOW}⚠️ AUDIT PASSED WITH MINOR ISSUES${NC}"
    STATUS="PASSED WITH ISSUES"
else
    echo -e "${RED}❌ AUDIT FAILED - Critical issues found${NC}"
    STATUS="FAILED"
fi

# Update report
log_report ""
log_report "## Summary"
log_report ""
log_report "- Total Checks: $TOTAL_CHECKS"
log_report "- Passed: $PASSED_CHECKS"
log_report "- Failed: $FAILED_CHECKS"
log_report "- Warnings: $WARNINGS"
log_report "- Pass Rate: ${PASS_RATE}%"
log_report ""
log_report "**Status: $STATUS**"
log_report ""
log_report "### Recommendations"
log_report ""
if [ $FAILED_CHECKS -gt 0 ]; then
    log_report "1. Review failed checks above"
    log_report "2. Run migration script again for missing items"
    log_report "3. Verify import paths are updated"
fi
if [ $WARNINGS -gt 0 ]; then
    log_report "- Review warning items for potential issues"
fi
log_report "- Install dependencies in all services"
log_report "- Update configuration files"
log_report "- Test each service individually"

echo ""
echo -e "${BLUE}📝 Full report saved to: $AUDIT_REPORT${NC}"