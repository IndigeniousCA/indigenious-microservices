#!/bin/bash

# REAL MIGRATION SCRIPT - NO BACKUP, JUST MIGRATE!
# Date: 2025-08-26

set -e

echo "🚀 REAL MIGRATION - COPYING ALL 83 FEATURES"
echo "==========================================="
echo ""

MONOLITH_PATH="/Users/Jon/Desktop/Unations /Indigenious"
MICROSERVICES_PATH="/Users/Jon/Desktop/Unations/indigenious-microservices"

# Feature mapping
cat > /tmp/feature_mapping.txt << 'EOF'
business-hunter:indigenious-business-service
canadian-verification:indigenious-verification-service
admin:indigenious-admin-service
admin-dashboard:indigenious-admin-service
advanced-analytics:indigenious-analytics-service
advanced-financial:indigenious-payment-service
agent-monitoring:indigenious-agent-monitoring-service
ai-assistant:indigenious-ai-core-service
ai-bid-assistant:indigenious-rfq-service
ai-integration:indigenious-ai-orchestrator-service
ai-intelligence:indigenious-ai-intelligence-service
ai-ml:indigenious-ai-orchestrator-service
ai-rfq-matching:indigenious-rfq-service
ambient-intelligence:indigenious-ambient-intelligence-service
analytics:indigenious-analytics-service
api-marketplace:indigenious-api-marketplace-service
auth:indigenious-auth-service
bank-integration:indigenious-banking-service
bid-submission:indigenious-rfq-service
blockchain:indigenious-blockchain-service
blockchain-audit:indigenious-blockchain-service
bonding-marketplace:indigenious-bonding-service
boq-management:indigenious-boq-service
business-directory:indigenious-business-service
business-registration:indigenious-business-service
c5-compliance:indigenious-compliance-service
canadian-business-api:indigenious-canadian-api-service
capital-leverage:indigenious-capital-service
chat:indigenious-chat-service
collaboration:indigenious-community-service
collaborative-bid:indigenious-rfq-service
communication:indigenious-notification-service
community-engagement:indigenious-community-service
community-governance:indigenious-community-service
compliance-checker:indigenious-compliance-service
compliance-engine:indigenious-compliance-service
consortium-matching:indigenious-rfq-service
context-help:indigenious-help-service
directory-api:indigenious-business-service
document-management:indigenious-document-service
email:indigenious-email-service
evaluation-scoring:indigenious-evaluation-service
failure-testing:indigenious-testing-service
feature-discovery:indigenious-help-service
financial-integration:indigenious-payment-service
fraud-prevention:indigenious-fraud-service
geographic-community:indigenious-community-service
government-integration:indigenious-compliance-service
i18n:indigenious-cultural-service
intelligence-aggregation:indigenious-market-intelligence-service
market-intelligence:indigenious-market-intelligence-service
mobile-registration:indigenious-mobile-registration-service
mobile-responsive:indigenious-mobile-app
model-viewer:indigenious-showcase-service
multi-language:indigenious-cultural-service
network-visualization:indigenious-network-effects-service
next-gen-tech:indigenious-nextgen-service
operations-dashboard:indigenious-operations-service
opportunity-matching:indigenious-opportunity-service
payment-rails:indigenious-payment-service
peer-help:indigenious-help-service
pipeline-tracker:indigenious-pipeline-service
pr-automation:indigenious-pr-automation-service
predictive-analytics:indigenious-analytics-service
price-transparency:indigenious-price-service
professional-marketplace:indigenious-professional-service
queue:indigenious-queue-service
rfq-system:indigenious-rfq-service
security-compliance:indigenious-compliance-service
showcase:indigenious-showcase-service
simplified-interfaces:indigenious-help-service
sms:indigenious-sms-service
strategic-investments:indigenious-capital-service
testing-qa:indigenious-testing-service
unified-platform:indigenious-gateway-service
universal-request-engine:indigenious-rfq-service
user-authentication:indigenious-user-service
vendor-performance:indigenious-vendor-service
verification-badges:indigenious-verification-service
verification-monopoly:indigenious-verification-service
video-consultations:indigenious-video-service
voice-command:indigenious-voice-service
EOF

echo "📋 Migrating features..."
MIGRATED=0
TOTAL=0

# Copy features
if [ -d "$MONOLITH_PATH/src/features" ]; then
    for feature_dir in "$MONOLITH_PATH/src/features"/*; do
        if [ -d "$feature_dir" ]; then
            feature_name=$(basename "$feature_dir")
            TOTAL=$((TOTAL + 1))
            
            # Find target service from mapping
            target_service=$(grep "^$feature_name:" /tmp/feature_mapping.txt | cut -d: -f2)
            
            if [ -n "$target_service" ]; then
                echo "  → Migrating $feature_name to $target_service..."
                
                target_path="$MICROSERVICES_PATH/$target_service/src/features/$feature_name"
                mkdir -p "$target_path"
                cp -r "$feature_dir"/* "$target_path/" 2>/dev/null && MIGRATED=$((MIGRATED + 1)) || echo "    ⚠️  Copy failed"
            else
                echo "  ⚠️  No mapping for $feature_name"
            fi
        fi
    done
fi

echo ""
echo "✅ Migration Complete!"
echo "  Total features: $TOTAL"
echo "  Migrated: $MIGRATED"
echo "  Success rate: $((MIGRATED * 100 / TOTAL))%"
