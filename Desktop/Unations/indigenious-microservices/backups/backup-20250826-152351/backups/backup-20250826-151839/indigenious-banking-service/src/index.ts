import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3013;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory data store (replace with database in production)
const accounts = new Map();
const transactions = [];

// Health check - River status
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'indigenious-banking-service',
    element: 'water',
    symbol: '🏦',
    metaphor: 'Financial Rivers',
    timestamp: new Date().toISOString(),
    riverFlow: {
      current: 'steady',
      depth: transactions.length,
      temperature: 'optimal'
    }
  });
});

// Account endpoints - River channels
app.get('/api/accounts', (req, res) => {
  const accountList = Array.from(accounts.values());
  res.json({
    accounts: accountList,
    totalChannels: accountList.length,
    riverHealth: calculateRiverHealth(accountList)
  });
});

app.post('/api/accounts', (req, res) => {
  const { id, name, type, balance = 0, indigenousOwned = false } = req.body;
  
  if (!id || !name || !type) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'The river needs proper channels to flow'
    });
  }
  
  const account = {
    id,
    name,
    type, // 'savings', 'checking', 'business'
    balance,
    indigenousOwned,
    createdAt: new Date().toISOString(),
    flowRate: calculateFlowRate(balance),
    channelDepth: type === 'business' ? 'deep' : 'shallow'
  };
  
  accounts.set(id, account);
  
  res.status(201).json({
    account,
    message: `New ${indigenousOwned ? 'sacred' : 'standard'} river channel opened 💧`
  });
});

app.get('/api/accounts/:id', (req, res) => {
  const account = accounts.get(req.params.id);
  
  if (!account) {
    return res.status(404).json({ 
      error: 'Account not found',
      message: 'This river channel has dried up'
    });
  }
  
  res.json({
    account,
    currentFlow: calculateFlowRate(account.balance),
    tides: getAccountTides(account)
  });
});

// Transaction endpoints - Water flow
app.post('/api/transactions', (req, res) => {
  const { fromAccount, toAccount, amount, type, description } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ 
      error: 'Invalid amount',
      message: 'Water must flow forward, not backward'
    });
  }
  
  const transaction = {
    id: `txn_${Date.now()}`,
    fromAccount,
    toAccount,
    amount,
    type, // 'deposit', 'withdrawal', 'transfer', 'payment'
    description,
    timestamp: new Date().toISOString(),
    flowType: getFlowType(type),
    rippleEffect: calculateRippleEffect(amount)
  };
  
  // Update account balances
  if (fromAccount) {
    const from = accounts.get(fromAccount);
    if (from) {
      if (from.balance < amount) {
        return res.status(400).json({ 
          error: 'Insufficient funds',
          message: 'The river runs dry - not enough water to flow'
        });
      }
      from.balance -= amount;
      accounts.set(fromAccount, from);
    }
  }
  
  if (toAccount) {
    const to = accounts.get(toAccount);
    if (to) {
      to.balance += amount;
      accounts.set(toAccount, to);
    }
  }
  
  transactions.push(transaction);
  
  res.status(201).json({
    transaction,
    message: `💧 ${amount} units flowed ${getFlowDirection(type)}`
  });
});

app.get('/api/transactions', (req, res) => {
  const { accountId, type, limit = 50 } = req.query;
  
  let filtered = transactions;
  
  if (accountId) {
    filtered = filtered.filter(t => 
      t.fromAccount === accountId || t.toAccount === accountId
    );
  }
  
  if (type) {
    filtered = filtered.filter(t => t.type === type);
  }
  
  const recent = filtered.slice(-Number(limit));
  
  res.json({
    transactions: recent,
    totalFlow: recent.reduce((sum, t) => sum + t.amount, 0),
    currentStrength: calculateCurrentStrength(recent),
    tidalPattern: getTidalPattern()
  });
});

// Indigenous banking features
app.post('/api/community-fund', (req, res) => {
  const { contributions, projectName, targetAmount } = req.body;
  
  const totalContributed = contributions.reduce((sum: number, c: any) => sum + c.amount, 0);
  const progress = (totalContributed / targetAmount) * 100;
  
  res.json({
    projectName,
    targetAmount,
    totalContributed,
    progress: Math.min(progress, 100),
    status: progress >= 100 ? 'spring-reached' : 'river-gathering',
    message: progress >= 100 
      ? '🌊 The community river has reached the spring!' 
      : `💧 Rivers converging... ${progress.toFixed(1)}% to the spring`
  });
});

app.get('/api/indigenous-benefits', (req, res) => {
  res.json({
    benefits: [
      {
        name: 'Sacred River Rate',
        description: 'Reduced fees for Indigenous-owned businesses',
        discount: '50%',
        symbol: '🪶'
      },
      {
        name: 'Community Pool',
        description: 'Shared resource pool for community projects',
        available: true,
        symbol: '🌊'
      },
      {
        name: 'Elder Wisdom Loans',
        description: 'Zero-interest loans for elders',
        maxAmount: 10000,
        symbol: '🦅'
      },
      {
        name: 'Youth Growth Savings',
        description: 'High-yield savings for Indigenous youth',
        bonusRate: '2%',
        symbol: '🌱'
      }
    ],
    message: 'Banking that honors the flow of resources through generations'
  });
});

// Helper functions
function calculateFlowRate(balance: number): string {
  if (balance > 100000) return 'rapids';
  if (balance > 10000) return 'steady-current';
  if (balance > 1000) return 'gentle-flow';
  return 'trickle';
}

function calculateRiverHealth(accounts: any[]): number {
  if (accounts.length === 0) return 0;
  const avgBalance = accounts.reduce((sum, a) => sum + a.balance, 0) / accounts.length;
  const indigenousRatio = accounts.filter(a => a.indigenousOwned).length / accounts.length;
  return Math.min(100, (avgBalance / 1000) + (indigenousRatio * 50));
}

function getFlowType(type: string): string {
  const flowTypes: Record<string, string> = {
    deposit: 'spring-fed',
    withdrawal: 'evaporation',
    transfer: 'tributary',
    payment: 'waterfall'
  };
  return flowTypes[type] || 'stream';
}

function getFlowDirection(type: string): string {
  const directions: Record<string, string> = {
    deposit: 'into the river',
    withdrawal: 'to the shore',
    transfer: 'between channels',
    payment: 'downstream'
  };
  return directions[type] || 'through the current';
}

function calculateRippleEffect(amount: number): string {
  if (amount > 10000) return 'tsunami';
  if (amount > 1000) return 'waves';
  if (amount > 100) return 'ripples';
  return 'droplets';
}

function calculateCurrentStrength(transactions: any[]): string {
  const recentVolume = transactions.slice(-10).reduce((sum, t) => sum + t.amount, 0);
  if (recentVolume > 50000) return 'flood-stage';
  if (recentVolume > 10000) return 'high-current';
  if (recentVolume > 1000) return 'moderate-flow';
  return 'low-tide';
}

function getAccountTides(account: any): string {
  const hour = new Date().getHours();
  const isHighTide = hour >= 6 && hour <= 18;
  return isHighTide ? 'high-tide' : 'low-tide';
}

function getTidalPattern(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'ebb';
  if (hour < 12) return 'rising';
  if (hour < 18) return 'high';
  return 'falling';
}

// Start server
app.listen(PORT, () => {
  console.log(`🏦 Indigenous Banking Service - Financial Rivers`);
  console.log(`💧 Flowing on port ${PORT}`);
  console.log(`🌊 Element: Water | Symbol: 🏦`);
  console.log(`📍 Where money flows like rivers to nourish all lands`);
});