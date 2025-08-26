const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'indigenious-gateway-service',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('indigenious-gateway-service running on port', PORT);
});
