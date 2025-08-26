const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3032;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'indigenious-notification-service',
    timestamp: new Date().toISOString(),
    features: {
      platform: 'Indigenous Procurement Platform',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Service info endpoint
app.get('/info', (req, res) => {
  res.json({
    service: 'indigenious-notification-service',
    description: 'Part of the Indigenous Procurement Platform',
    endpoints: ['/health', '/info', '/api'],
    status: 'operational'
  });
});

// Main API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to indigenious-notification-service',
    data: {
      operational: true,
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 indigenious-notification-service running on port', PORT);
  console.log('📡 Health check: http://localhost:' + PORT + '/health');
});
