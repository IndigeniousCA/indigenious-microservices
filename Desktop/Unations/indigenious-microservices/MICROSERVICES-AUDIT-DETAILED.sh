#!/bin/bash

# ============================================================================
# MICROSERVICES DETAILED AUDIT - Find what we're missing
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

echo -e "${RED}============================================================================${NC}"
echo -e "${RED}         MICROSERVICES DETAILED AUDIT${NC}"
echo -e "${RED}============================================================================${NC}"
echo ""

# Output file
AUDIT_REPORT="$MICROSERVICES_DIR/docs/AUDIT-$(date +%Y%m%d-%H%M%S).md"

# Start audit report
cat > "$AUDIT_REPORT" << 'EOF'
# 🔍 MICROSERVICES AUDIT REPORT

**Generated:** DATE_PLACEHOLDER

---

## 📊 MONOLITH ANALYSIS

EOF

sed -i '' "s/DATE_PLACEHOLDER/$(date '+%Y-%m-%d %H:%M:%S')/g" "$AUDIT_REPORT"

echo -e "${CYAN}Step 1: Analyzing monolith branches...${NC}"
cd "$MONOLITH_DIR"

echo "### Available Branches" >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"
echo '```' >> "$AUDIT_REPORT"
git branch -a | grep -v HEAD | sed 's/^[ *]*//' >> "$AUDIT_REPORT"
echo '```' >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"

# Count branches
BRANCH_COUNT=$(git branch -a | grep -v HEAD | wc -l | tr -d ' ')
echo "Total branches: $BRANCH_COUNT"

echo -e "${CYAN}Step 2: Analyzing current branch features...${NC}"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo "" >> "$AUDIT_REPORT"
echo "### Current Branch: $CURRENT_BRANCH" >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"

# Count features in monolith
if [ -d "src/features" ]; then
    echo "#### Features in src/features/" >> "$AUDIT_REPORT"
    echo "" >> "$AUDIT_REPORT"
    
    FEATURE_COUNT=0
    for feature in src/features/*; do
        if [ -d "$feature" ]; then
            feature_name=$(basename "$feature")
            file_count=$(find "$feature" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | wc -l | tr -d ' ')
            echo "- **$feature_name** - $file_count files" >> "$AUDIT_REPORT"
            FEATURE_COUNT=$((FEATURE_COUNT + 1))
        fi
    done
    echo "" >> "$AUDIT_REPORT"
    echo "Total features on current branch: $FEATURE_COUNT" >> "$AUDIT_REPORT"
fi

echo -e "${CYAN}Step 3: Checking critical branches for unique features...${NC}"
echo "" >> "$AUDIT_REPORT"
echo "## 🎯 CRITICAL BRANCHES ANALYSIS" >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"

# Critical branches to check
CRITICAL_BRANCHES=(
    "swarm-orchestrator-qa"
    "feature/business-hunter-microservice"
    "standalone-microservices"
)

for branch in "${CRITICAL_BRANCHES[@]}"; do
    echo "" >> "$AUDIT_REPORT"
    echo "### Branch: $branch" >> "$AUDIT_REPORT"
    echo "" >> "$AUDIT_REPORT"
    
    if git show-ref --verify --quiet "refs/heads/$branch"; then
        # Get unique commits
        UNIQUE_COMMITS=$(git log --oneline "$branch" ^main 2>/dev/null | wc -l | tr -d ' ')
        echo "**Unique commits:** $UNIQUE_COMMITS" >> "$AUDIT_REPORT"
        echo "" >> "$AUDIT_REPORT"
        
        # Get last 5 unique commits
        echo "#### Recent unique commits:" >> "$AUDIT_REPORT"
        echo '```' >> "$AUDIT_REPORT"
        git log --oneline "$branch" ^main 2>/dev/null | head -5 >> "$AUDIT_REPORT"
        echo '```' >> "$AUDIT_REPORT"
        echo "" >> "$AUDIT_REPORT"
    else
        echo "**Status:** Branch not found locally" >> "$AUDIT_REPORT"
    fi
done

echo -e "${CYAN}Step 4: Analyzing microservices current state...${NC}"
cd "$MICROSERVICES_DIR"

echo "" >> "$AUDIT_REPORT"
echo "## 📦 MICROSERVICES STATUS" >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"

# Count microservices and their content
TOTAL_SERVICES=0
EMPTY_SERVICES=0
POPULATED_SERVICES=0

echo "### Service Analysis" >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"
echo "| Service | Files | Status |" >> "$AUDIT_REPORT"
echo "|---------|-------|--------|" >> "$AUDIT_REPORT"

for service in indigenious-*; do
    if [ -d "$service" ]; then
        TOTAL_SERVICES=$((TOTAL_SERVICES + 1))
        
        if [ -d "$service/src" ]; then
            file_count=$(find "$service/src" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | wc -l | tr -d ' ')
            
            if [ "$file_count" -eq 0 ]; then
                status="❌ EMPTY"
                EMPTY_SERVICES=$((EMPTY_SERVICES + 1))
            elif [ "$file_count" -lt 5 ]; then
                status="⚠️ MINIMAL"
            else
                status="✅ POPULATED"
                POPULATED_SERVICES=$((POPULATED_SERVICES + 1))
            fi
            
            echo "| $service | $file_count | $status |" >> "$AUDIT_REPORT"
        else
            echo "| $service | 0 | ❌ NO SRC |" >> "$AUDIT_REPORT"
            EMPTY_SERVICES=$((EMPTY_SERVICES + 1))
        fi
    fi
done

echo "" >> "$AUDIT_REPORT"
echo "## 🚨 CRITICAL MISSING FEATURES" >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"

# Check for specific critical features
echo "### Business Hunter Swarm" >> "$AUDIT_REPORT"
if find . -name "*business-hunter*" -type d 2>/dev/null | grep -q .; then
    echo "✅ Found some business-hunter directories" >> "$AUDIT_REPORT"
else
    echo "❌ **NOT FOUND** - Critical for populating 150K businesses!" >> "$AUDIT_REPORT"
fi
echo "" >> "$AUDIT_REPORT"

echo "### Canadian Verification System" >> "$AUDIT_REPORT"
if find . -name "*canadian*verification*" -type d 2>/dev/null | grep -q .; then
    echo "✅ Found canadian verification" >> "$AUDIT_REPORT"
else
    echo "❌ **NOT FOUND** - Required for business legitimacy!" >> "$AUDIT_REPORT"
fi
echo "" >> "$AUDIT_REPORT"

echo "### Agent Monitoring Service" >> "$AUDIT_REPORT"
agent_files=$(find indigenious-agent-monitoring-service -type f -name "*.ts" -o -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
if [ "$agent_files" -gt 5 ]; then
    echo "✅ Has $agent_files files" >> "$AUDIT_REPORT"
else
    echo "❌ **EMPTY** - Only $agent_files files found!" >> "$AUDIT_REPORT"
fi
echo "" >> "$AUDIT_REPORT"

echo "" >> "$AUDIT_REPORT"
echo "## 📈 SUMMARY" >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"
echo "- **Total Microservices:** $TOTAL_SERVICES" >> "$AUDIT_REPORT"
echo "- **Populated Services:** $POPULATED_SERVICES" >> "$AUDIT_REPORT"
echo "- **Empty/Minimal Services:** $EMPTY_SERVICES" >> "$AUDIT_REPORT"
echo "- **Monolith Branches:** $BRANCH_COUNT" >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"

COMPLETION_PERCENT=$((POPULATED_SERVICES * 100 / TOTAL_SERVICES))
echo "### Migration Completion: ~$COMPLETION_PERCENT%" >> "$AUDIT_REPORT"
echo "" >> "$AUDIT_REPORT"

if [ $COMPLETION_PERCENT -lt 60 ]; then
    echo "⚠️ **WARNING:** Platform is less than 60% complete!" >> "$AUDIT_REPORT"
    echo "" >> "$AUDIT_REPORT"
    echo "Critical features are missing. Immediate action required for Sept 30 launch." >> "$AUDIT_REPORT"
fi

# Console summary
echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}                    AUDIT COMPLETE${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo "📊 RESULTS:"
echo "  Microservices Total: $TOTAL_SERVICES"
echo "  Populated: $POPULATED_SERVICES"
echo "  Empty/Minimal: $EMPTY_SERVICES"
echo "  Completion: ~$COMPLETION_PERCENT%"
echo ""

if [ $EMPTY_SERVICES -gt 20 ]; then
    echo -e "${RED}⚠️  CRITICAL: $EMPTY_SERVICES services are empty or minimal!${NC}"
fi

echo ""
echo "📄 Full report saved to: $AUDIT_REPORT"
echo ""