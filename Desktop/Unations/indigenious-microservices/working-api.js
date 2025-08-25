const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:indigenous123@localhost:5434/indigenous_platform'
});

app.use(cors());
app.use(express.json());

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

// Homepage
app.get('/', (req, res) => {
  res.json({
    platform: '🌍 Indigenous Procurement Platform',
    status: 'operational',
    endpoints: {
      users: '/api/users',
      businesses: '/api/businesses',
      rfqs: '/api/rfqs'
    }
  });
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all businesses
app.get('/api/businesses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM businesses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all RFQs
app.get('/api/rfqs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM rfqs ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new business
app.post('/api/businesses', async (req, res) => {
  try {
    const { business_name, description } = req.body;
    const result = await pool.query(
      'INSERT INTO businesses (business_name, description) VALUES ($1, $2) RETURNING *',
      [business_name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new RFQ
app.post('/api/rfqs', async (req, res) => {
  try {
    const { title, description, budget_min, budget_max } = req.body;
    const result = await pool.query(
      'INSERT INTO rfqs (title, description, budget_min, budget_max) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, budget_min, budget_max]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Working API running on http://localhost:${PORT}`);
  console.log('📊 Connected to PostgreSQL database with real data');
});