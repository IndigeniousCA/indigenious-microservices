const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json());

// Service registry
const services = {
  users: 'http://localhost:3001',
  businesses: 'http://localhost:3002',
  rfqs: 'http://localhost:3003',
  payments: 'http://localhost:3004',
  documents: 'http://localhost:3005'
};

// Health check
app.get('/health', async (req, res) => {
  const health = {};
  for (const [name, url] of Object.entries(services)) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 1000 });
      health[name] = response.data;
    } catch (error) {
      health[name] = { status: 'unavailable' };
    }
  }
  res.json({
    gateway: 'healthy',
    services: health,
    timestamp: new Date().toISOString()
  });
});

// Main page
app.get('/', (req, res) => {
  res.json({
    platform: '🌍 Indigenous Platform Microservices',
    version: '2.0.0',
    architecture: 'Microservices',
    services: Object.keys(services),
    endpoints: {
      health: '/health',
      users: '/api/users/*',
      businesses: '/api/businesses/*',
      rfqs: '/api/rfqs/*',
      payments: '/api/payments/*',
      documents: '/api/documents/*'
    },
    features: [
      'User Management',
      'Business Directory',
      'RFQ System',
      'Payment Processing',
      'Document Management',
      'Indigenous Language Support',
      'Cultural Preservation',
      'Multi-tenancy',
      'Real-time Chat',
      'Analytics Dashboard'
    ]
  });
});

// Proxy requests to services
app.use('/api/:service', async (req, res) => {
  const { service } = req.params;
  const serviceUrl = services[service];
  
  if (!serviceUrl) {
    return res.status(404).json({ error: 'Service not found' });
  }
  
  const path = req.path.replace(`/api/${service}`, '');
  const url = `${serviceUrl}/api/${service}${path}`;
  
  try {
    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: req.headers,
      params: req.query
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({ error: 'Service unavailable' });
    }
  }
});

app.listen(PORT, () => {
  console.log('🚀 API Gateway running on http://localhost:' + PORT);
  console.log('📍 Services:');
  Object.entries(services).forEach(([name, url]) => {
    console.log(`   - ${name}: ${url}`);
  });
});