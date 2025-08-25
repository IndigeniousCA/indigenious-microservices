const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

// Services data
const services = {
  users: [],
  businesses: [],
  rfqs: [],
  payments: [],
  documents: []
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    platform: 'Indigenous Platform',
    services: Object.keys(services),
    timestamp: new Date().toISOString()
  });
});

// Main page
app.get('/', (req, res) => {
  res.json({
    platform: '🌍 Indigenous Platform',
    version: '2.0.0',
    features: {
      users: 'User management and authentication',
      businesses: 'Business directory and profiles',
      rfqs: 'Request for Quotations system',
      payments: 'Payment processing',
      documents: 'Document management'
    },
    endpoints: {
      health: '/health',
      users: '/api/users',
      businesses: '/api/businesses',
      rfqs: '/api/rfqs',
      payments: '/api/payments',
      documents: '/api/documents'
    }
  });
});

// User endpoints
app.get('/api/users', (req, res) => {
  res.json(services.users);
});

app.post('/api/users', (req, res) => {
  const user = { id: Date.now(), ...req.body, createdAt: new Date() };
  services.users.push(user);
  res.status(201).json(user);
});

// Business endpoints
app.get('/api/businesses', (req, res) => {
  res.json(services.businesses);
});

app.post('/api/businesses', (req, res) => {
  const business = { id: Date.now(), ...req.body, createdAt: new Date() };
  services.businesses.push(business);
  res.status(201).json(business);
});

// RFQ endpoints
app.get('/api/rfqs', (req, res) => {
  res.json(services.rfqs);
});

app.post('/api/rfqs', (req, res) => {
  const rfq = { id: Date.now(), status: 'open', ...req.body, createdAt: new Date() };
  services.rfqs.push(rfq);
  res.status(201).json(rfq);
});

// Payment endpoints
app.get('/api/payments', (req, res) => {
  res.json(services.payments);
});

app.post('/api/payments', (req, res) => {
  const payment = { id: Date.now(), status: 'pending', ...req.body, createdAt: new Date() };
  services.payments.push(payment);
  res.status(201).json(payment);
});

// Document endpoints
app.get('/api/documents', (req, res) => {
  res.json(services.documents);
});

app.post('/api/documents', (req, res) => {
  const document = { id: Date.now(), ...req.body, uploadedAt: new Date() };
  services.documents.push(document);
  res.status(201).json(document);
});

app.listen(PORT, () => {
  console.log('🚀 Indigenous Platform API running on http://localhost:' + PORT);
  console.log('📍 Health check: http://localhost:' + PORT + '/health');
  console.log('🌐 Main page: http://localhost:' + PORT);
});
