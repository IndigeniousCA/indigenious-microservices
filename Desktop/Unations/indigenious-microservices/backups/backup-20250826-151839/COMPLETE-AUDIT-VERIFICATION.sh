#!/bin/bash

# ============================================================================
# COMPLETE AUDIT & VERIFICATION SCRIPT - NEVER MISS ANYTHING AGAIN
# ============================================================================
# This script ensures we NEVER forget features from ANY branch EVER again
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Directories
MONOLITH_DIR="/Users/Jon/Desktop/Unations /Indigenious"
MICROSERVICES_DIR="/Users/Jon/Desktop/Unations/indigenious-microservices"

echo -e "${RED}============================================================================${NC}"
echo -e "${RED}     COMPLETE PLATFORM AUDIT - FINDING EVERY SINGLE FEATURE${NC}"
echo -e "${RED}============================================================================${NC}"
echo ""

# Create audit report
AUDIT_FILE="$MICROSERVICES_DIR/docs/COMPLETE-PLATFORM-AUDIT-$(date +%Y%m%d-%H%M%S).md"

# Start report
cat > "$AUDIT_FILE" << 'EOF'
# 🔍 COMPLETE PLATFORM AUDIT REPORT

**Generated:** DATE_PLACEHOLDER
**Purpose:** Ensure ZERO features are missed in migration

---

## 📊 BRANCH ANALYSIS

EOF

# Replace date
sed -i '' "s/DATE_PLACEHOLDER/$(date '+%Y-%m-%d %H:%M:%S')/g" "$AUDIT_FILE"

echo -e "${CYAN}Step 1: Analyzing ALL branches in monolith...${NC}"
echo "=========================================="

cd "$MONOLITH_DIR"

# Get all branches
ALL_BRANCHES=$(git branch -a | grep -v HEAD | sed 's/^[ *]*//' | grep -v "remotes/origin" | sort -u)

echo "### Branches Found" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

for branch in $ALL_BRANCHES; do
    echo "- $branch" >> "$AUDIT_FILE"
done

echo "" >> "$AUDIT_FILE"
echo "---" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

# Track all unique features across branches (using arrays for compatibility)
ALL_FEATURES=""
FEATURE_BRANCHES=""
FEATURE_FILES=""
FEATURE_LIST=()

echo -e "${CYAN}Step 2: Scanning features in each branch...${NC}"
echo "=========================================="

echo "## 🎯 FEATURES BY BRANCH" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

for branch in $ALL_BRANCHES; do
    echo -e "${YELLOW}Checking branch: $branch${NC}"
    
    git checkout "$branch" --quiet 2>/dev/null || continue
    
    echo "### Branch: $branch" >> "$AUDIT_FILE"
    echo "" >> "$AUDIT_FILE"
    
    # Count commits unique to this branch
    UNIQUE_COMMITS=$(git log --oneline "$branch" ^main 2>/dev/null | wc -l | tr -d ' ')
    echo "**Unique commits:** $UNIQUE_COMMITS" >> "$AUDIT_FILE"
    echo "" >> "$AUDIT_FILE"
    
    if [ -d "src/features" ]; then
        echo "#### Features in src/features/:" >> "$AUDIT_FILE"
        for feature in src/features/*; do
            if [ -d "$feature" ]; then
                feature_name=$(basename "$feature")
                ALL_FEATURES[$feature_name]=1
                FEATURE_BRANCHES[$feature_name]+="$branch "
                
                # Count files in feature
                file_count=$(find "$feature" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | wc -l | tr -d ' ')
                FEATURE_FILES[$feature_name]=$file_count
                
                echo "- **$feature_name** ($file_count files)" >> "$AUDIT_FILE"
            fi
        done
        echo "" >> "$AUDIT_FILE"
    fi
    
    # Check for microservices directory
    if [ -d "microservices" ]; then
        echo "#### Microservices in branch:" >> "$AUDIT_FILE"
        for ms in microservices/*; do
            if [ -d "$ms" ]; then
                ms_name=$(basename "$ms")
                echo "- $ms_name" >> "$AUDIT_FILE"
            fi
        done
        echo "" >> "$AUDIT_FILE"
    fi
    
    # Check for unique directories
    for dir in business-hunter* swarm* agent*; do
        if [ -d "$dir" ]; then
            echo "#### Special directory: $dir" >> "$AUDIT_FILE"
            file_count=$(find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null | wc -l | tr -d ' ')
            echo "- Files: $file_count" >> "$AUDIT_FILE"
            echo "" >> "$AUDIT_FILE"
        fi
    done
    
    echo "---" >> "$AUDIT_FILE"
    echo "" >> "$AUDIT_FILE"
done

# Go back to main
git checkout main --quiet 2>/dev/null

echo -e "${CYAN}Step 3: Analyzing unique features across all branches...${NC}"
echo "=========================================="

echo "## 📦 COMPLETE FEATURE INVENTORY" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"
echo "### All Features Found (${#ALL_FEATURES[@]} total)" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

# Sort features by name
for feature in $(echo ${!ALL_FEATURES[@]} | tr ' ' '\n' | sort); do
    branches="${FEATURE_BRANCHES[$feature]}"
    file_count="${FEATURE_FILES[$feature]}"
    echo "1. **$feature**" >> "$AUDIT_FILE"
    echo "   - Files: $file_count" >> "$AUDIT_FILE"
    echo "   - Branches: $branches" >> "$AUDIT_FILE"
done

echo "" >> "$AUDIT_FILE"
echo "---" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

echo -e "${CYAN}Step 4: Checking what made it to microservices...${NC}"
echo "=========================================="

echo "## ✅ MIGRATION STATUS" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

cd "$MICROSERVICES_DIR"

echo "### Microservices Status" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

TOTAL_MIGRATED=0
PARTIAL_MIGRATED=0
NOT_MIGRATED=0

for feature in ${!ALL_FEATURES[@]}; do
    # Check if feature exists in any microservice
    found=0
    service_location=""
    
    for service in indigenious-*; do
        if [ -d "$service/src" ]; then
            if find "$service/src" -type d -name "*$feature*" 2>/dev/null | grep -q .; then
                found=1
                service_location="$service"
                
                # Count files to determine if fully migrated
                migrated_files=$(find "$service/src" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | grep -i "$feature" | wc -l | tr -d ' ')
                original_files="${FEATURE_FILES[$feature]}"
                
                if [ "$migrated_files" -ge "$original_files" ]; then
                    TOTAL_MIGRATED=$((TOTAL_MIGRATED + 1))
                    status="✅ FULLY MIGRATED"
                else
                    PARTIAL_MIGRATED=$((PARTIAL_MIGRATED + 1))
                    status="⚠️ PARTIALLY MIGRATED ($migrated_files/$original_files files)"
                fi
                break
            fi
        fi
    done
    
    if [ $found -eq 0 ]; then
        NOT_MIGRATED=$((NOT_MIGRATED + 1))
        status="❌ NOT MIGRATED"
        service_location="N/A"
    fi
    
    echo "- **$feature**: $status" >> "$AUDIT_FILE"
    if [ "$service_location" != "N/A" ]; then
        echo "  - Location: $service_location" >> "$AUDIT_FILE"
    fi
done

echo "" >> "$AUDIT_FILE"
echo "---" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

echo -e "${CYAN}Step 5: Identifying critical missing features...${NC}"
echo "=========================================="

echo "## 🚨 CRITICAL MISSING FEATURES" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

# Critical features to check
CRITICAL_FEATURES=(
    "business-hunter"
    "canadian-verification"
    "bill-c5"
    "tax-debt"
    "aws-deployment"
    "agent-monitoring"
    "blockchain-audit"
    "swarm"
)

echo "### Must-Have Features Status" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

for critical in ${CRITICAL_FEATURES[@]}; do
    found=0
    for feature in ${!ALL_FEATURES[@]}; do
        if [[ "$feature" == *"$critical"* ]]; then
            found=1
            # Check migration status
            migrated=$(find "$MICROSERVICES_DIR" -type d -name "*$critical*" 2>/dev/null | wc -l | tr -d ' ')
            if [ $migrated -gt 0 ]; then
                echo "- ✅ **$critical**: Found and migrated" >> "$AUDIT_FILE"
            else
                echo "- ❌ **$critical**: Found in monolith but NOT MIGRATED" >> "$AUDIT_FILE"
                echo "  - Required for: Launch critical functionality" >> "$AUDIT_FILE"
            fi
            break
        fi
    done
    if [ $found -eq 0 ]; then
        echo "- ⚠️ **$critical**: Not found in any branch" >> "$AUDIT_FILE"
    fi
done

echo "" >> "$AUDIT_FILE"
echo "---" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

echo -e "${CYAN}Step 6: Generating migration commands...${NC}"
echo "=========================================="

echo "## 🔧 MIGRATION COMMANDS" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"
echo "Run these commands to migrate missing features:" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"
echo '```bash' >> "$AUDIT_FILE"

cd "$MONOLITH_DIR"

# Generate commands for missing features
for feature in ${!ALL_FEATURES[@]}; do
    migrated=$(find "$MICROSERVICES_DIR" -type d -name "*$feature*" 2>/dev/null | wc -l | tr -d ' ')
    if [ $migrated -eq 0 ]; then
        branches="${FEATURE_BRANCHES[$feature]}"
        first_branch=$(echo $branches | cut -d' ' -f1)
        
        echo "# Migrate $feature from branch $first_branch" >> "$AUDIT_FILE"
        echo "cd \"$MONOLITH_DIR\"" >> "$AUDIT_FILE"
        echo "git checkout $first_branch" >> "$AUDIT_FILE"
        echo "cp -r src/features/$feature \"$MICROSERVICES_DIR/[appropriate-service]/src/features/\"" >> "$AUDIT_FILE"
        echo "" >> "$AUDIT_FILE"
    fi
done

echo '```' >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"
echo "---" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

# Summary statistics
echo -e "${CYAN}Step 7: Generating summary statistics...${NC}"
echo "=========================================="

echo "## 📈 SUMMARY STATISTICS" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

TOTAL_FEATURES=${#ALL_FEATURES[@]}
MIGRATION_PERCENTAGE=$(( (TOTAL_MIGRATED * 100) / TOTAL_FEATURES ))

echo "### Overall Migration Status" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"
echo "- **Total Features Found:** $TOTAL_FEATURES" >> "$AUDIT_FILE"
echo "- **Fully Migrated:** $TOTAL_MIGRATED ($(( (TOTAL_MIGRATED * 100) / TOTAL_FEATURES ))%)" >> "$AUDIT_FILE"
echo "- **Partially Migrated:** $PARTIAL_MIGRATED ($(( (PARTIAL_MIGRATED * 100) / TOTAL_FEATURES ))%)" >> "$AUDIT_FILE"
echo "- **Not Migrated:** $NOT_MIGRATED ($(( (NOT_MIGRATED * 100) / TOTAL_FEATURES ))%)" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

if [ $MIGRATION_PERCENTAGE -lt 60 ]; then
    echo "### ⚠️ WARNING" >> "$AUDIT_FILE"
    echo "" >> "$AUDIT_FILE"
    echo "**Migration is less than 60% complete!**" >> "$AUDIT_FILE"
    echo "" >> "$AUDIT_FILE"
    echo "Platform is missing critical functionality and is NOT ready for launch." >> "$AUDIT_FILE"
elif [ $MIGRATION_PERCENTAGE -lt 80 ]; then
    echo "### ⚠️ CAUTION" >> "$AUDIT_FILE"
    echo "" >> "$AUDIT_FILE"
    echo "**Migration is partially complete but missing important features.**" >> "$AUDIT_FILE"
else
    echo "### ✅ GOOD PROGRESS" >> "$AUDIT_FILE"
    echo "" >> "$AUDIT_FILE"
    echo "**Migration is mostly complete but verify all critical features.**" >> "$AUDIT_FILE"
fi

echo "" >> "$AUDIT_FILE"
echo "---" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"

echo "## 🎯 NEXT STEPS" >> "$AUDIT_FILE"
echo "" >> "$AUDIT_FILE"
echo "1. Review all missing critical features above" >> "$AUDIT_FILE"
echo "2. Run the migration commands provided" >> "$AUDIT_FILE"
echo "3. Merge all feature branches to main" >> "$AUDIT_FILE"
echo "4. Re-run this audit to verify completion" >> "$AUDIT_FILE"
echo "5. Never develop features on branches without merging!" >> "$AUDIT_FILE"

# Console output
echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}                         AUDIT COMPLETE${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}📊 RESULTS:${NC}"
echo "  Total Features Found: $TOTAL_FEATURES"
echo "  Fully Migrated: $TOTAL_MIGRATED"
echo "  Partially Migrated: $PARTIAL_MIGRATED"
echo "  Not Migrated: $NOT_MIGRATED"
echo ""

if [ $NOT_MIGRATED -gt 0 ]; then
    echo -e "${RED}⚠️  WARNING: $NOT_MIGRATED features are completely missing!${NC}"
    echo -e "${RED}   Platform is NOT ready for launch!${NC}"
else
    echo -e "${GREEN}✅ All features have been migrated!${NC}"
fi

echo ""
echo -e "${CYAN}📄 Full audit report saved to:${NC}"
echo "   $AUDIT_FILE"
echo ""
echo -e "${MAGENTA}Run this script regularly to ensure nothing is missed!${NC}"