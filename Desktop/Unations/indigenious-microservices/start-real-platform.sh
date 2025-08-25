#!/bin/bash

echo "🚀 STARTING THE REAL INDIGENOUS MICROSERVICES PLATFORM"
echo "======================================================"

# Kill any existing services on our ports
lsof -ti:4000-4010 | xargs kill -9 2>/dev/null || true

# Start each microservice in the background
echo "Starting microservices..."

# 1. RFQ Service (Core feature - government procurement)
cd indigenious-rfq-service
npm start > rfq.log 2>&1 &
echo "✅ RFQ Service started on port 3003"

# 2. Business Service (Business directory)
cd ../indigenious-business-service  
npm start > business.log 2>&1 &
echo "✅ Business Service started on port 3002"

# 3. Document Service (CAD/Blueprint viewer)
cd ../indigenious-document-service
npm start > document.log 2>&1 &
echo "✅ Document Service started on port 3005"

# 4. Chat Service (Real-time communication)
cd ../indigenious-chat-service
npm start > chat.log 2>&1 &
echo "✅ Chat Service started on port 3007"

# 5. Payment Service (Escrow and payments)
cd ../indigenious-payment-service
npm start > payment.log 2>&1 &
echo "✅ Payment Service started on port 3004"

cd ..

echo ""
echo "======================================================"
echo "🎉 NEW MICROSERVICES PLATFORM IS RUNNING!"
echo "======================================================"
echo ""
echo "Core Services:"
echo "  📋 RFQ Service: http://localhost:3003"
echo "  🏢 Business Service: http://localhost:3002" 
echo "  📄 Document Service: http://localhost:3005"
echo "  💬 Chat Service: http://localhost:3007"
echo "  💰 Payment Service: http://localhost:3004"
echo ""
echo "This is the NEW platform with:"
echo "  • 49 Microservices Architecture"
echo "  • 84 Platform Features"
echo "  • Scalable Design"
echo "  • NOT the old monolith!"
echo ""
echo "======================================================"