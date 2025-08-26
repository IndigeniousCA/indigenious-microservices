import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';
import { CustomerService } from './services/customer.service';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// Set socket server for CustomerService
CustomerService.setSocketServer(io);

// Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const redisStatus = redis.status === 'ready';
    res.json({
      status: 'healthy',
      service: 'indigenious-customer-service',
      timestamp: new Date().toISOString(),
      redis: redisStatus
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API Routes

// Support Tickets
app.post('/api/tickets', async (req, res) => {
  try {
    const ticket = await CustomerService.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create ticket' });
  }
});

app.get('/api/tickets/:ticketNumber', async (req, res) => {
  try {
    const ticket = await CustomerService.getTicket(req.params.ticketNumber);
    res.json(ticket);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Ticket not found' });
  }
});

app.put('/api/tickets/:id', async (req, res) => {
  try {
    const ticket = await CustomerService.updateTicket(req.params.id, req.body);
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update ticket' });
  }
});

app.get('/api/tickets/customer/:customerId', async (req, res) => {
  try {
    const tickets = await CustomerService.getCustomerTickets(req.params.customerId);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get customer tickets' });
  }
});

// Interactions
app.post('/api/tickets/:id/interactions', async (req, res) => {
  try {
    const interaction = await CustomerService.addInteraction(req.params.id, req.body);
    res.status(201).json(interaction);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to add interaction' });
  }
});

app.get('/api/tickets/:id/interactions', async (req, res) => {
  try {
    const interactions = await CustomerService.getTicketInteractions(req.params.id);
    res.json(interactions);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get interactions' });
  }
});

// Agents
app.post('/api/agents', async (req, res) => {
  try {
    const agent = await CustomerService.createAgent(req.body);
    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create agent' });
  }
});

app.get('/api/agents/available', async (req, res) => {
  try {
    const agents = await CustomerService.getAvailableAgents(req.query);
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get available agents' });
  }
});

app.get('/api/agents/indigenous', async (req, res) => {
  try {
    const agents = await CustomerService.getIndigenousAgents();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous agents' });
  }
});

app.put('/api/agents/:id/status', async (req, res) => {
  try {
    const agent = await CustomerService.updateAgentStatus(req.params.id, req.body.status);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update agent status' });
  }
});

// Escalations
app.post('/api/tickets/:id/escalate', async (req, res) => {
  try {
    const escalation = await CustomerService.escalateTicket(req.params.id, req.body);
    res.json(escalation);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to escalate ticket' });
  }
});

app.get('/api/escalations/elder-required', async (req, res) => {
  try {
    const escalations = await CustomerService.getElderEscalations();
    res.json(escalations);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Elder escalations' });
  }
});

// Knowledge Base
app.post('/api/knowledge', async (req, res) => {
  try {
    const article = await CustomerService.createKnowledgeArticle(req.body);
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create article' });
  }
});

app.get('/api/knowledge/search', async (req, res) => {
  try {
    const results = await CustomerService.searchKnowledgeBase(
      req.query.query as string,
      req.query.language as string
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to search knowledge base' });
  }
});

app.get('/api/knowledge/indigenous', async (req, res) => {
  try {
    const articles = await CustomerService.getIndigenousArticles(req.query);
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous articles' });
  }
});

app.post('/api/knowledge/:id/translate', async (req, res) => {
  try {
    const translation = await CustomerService.translateArticle(req.params.id, req.body);
    res.json(translation);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to translate article' });
  }
});

// Chat Sessions
app.post('/api/chat/start', async (req, res) => {
  try {
    const session = await CustomerService.startChatSession(req.body);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start chat session' });
  }
});

app.post('/api/chat/:sessionId/message', async (req, res) => {
  try {
    const message = await CustomerService.sendChatMessage(req.params.sessionId, req.body);
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send message' });
  }
});

app.put('/api/chat/:sessionId/end', async (req, res) => {
  try {
    const session = await CustomerService.endChatSession(req.params.sessionId);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to end chat session' });
  }
});

app.post('/api/chat/:sessionId/transfer', async (req, res) => {
  try {
    const session = await CustomerService.transferChat(req.params.sessionId, req.body);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to transfer chat' });
  }
});

// Feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const feedback = await CustomerService.collectFeedback(req.body);
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to collect feedback' });
  }
});

app.get('/api/feedback/cultural-issues', async (req, res) => {
  try {
    const issues = await CustomerService.getCulturalIssues(req.query);
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get cultural issues' });
  }
});

// Language Support
app.get('/api/languages/available', async (req, res) => {
  try {
    const languages = await CustomerService.getAvailableLanguages();
    res.json(languages);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get available languages' });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    const translation = await CustomerService.translateText(req.body);
    res.json(translation);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to translate text' });
  }
});

// Queue Management
app.get('/api/queues', async (req, res) => {
  try {
    const queues = await CustomerService.getQueues();
    res.json(queues);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get queues' });
  }
});

app.get('/api/queues/indigenous', async (req, res) => {
  try {
    const queues = await CustomerService.getIndigenousQueues();
    res.json(queues);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get Indigenous queues' });
  }
});

// Metrics
app.get('/api/metrics/sla', async (req, res) => {
  try {
    const metrics = await CustomerService.getSLAMetrics(req.query);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get SLA metrics' });
  }
});

app.get('/api/metrics/agent-performance', async (req, res) => {
  try {
    const metrics = await CustomerService.getAgentPerformance(req.query);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get agent performance' });
  }
});

app.get('/api/metrics/language-support', async (req, res) => {
  try {
    const metrics = await CustomerService.getLanguageSupportMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get language metrics' });
  }
});

// WebSocket events for real-time support
io.on('connection', (socket) => {
  console.log('Client connected to customer service');

  // Join rooms
  socket.on('join:agent', (agentId: string) => {
    socket.join(`agent:${agentId}`);
  });

  socket.on('join:customer', (customerId: string) => {
    socket.join(`customer:${customerId}`);
  });

  socket.on('join:session', (sessionId: string) => {
    socket.join(`session:${sessionId}`);
  });

  socket.on('join:ticket', (ticketId: string) => {
    socket.join(`ticket:${ticketId}`);
  });

  // Chat events
  socket.on('chat:typing', (data) => {
    socket.to(`session:${data.sessionId}`).emit('chat:typing', data);
  });

  socket.on('chat:message', async (data) => {
    const message = await CustomerService.sendChatMessage(data.sessionId, data);
    io.to(`session:${data.sessionId}`).emit('chat:message', message);
  });

  // Agent status
  socket.on('agent:status', async (data) => {
    await CustomerService.updateAgentStatus(data.agentId, data.status);
    io.emit('agent:status:changed', data);
  });

  // Ticket updates
  socket.on('ticket:update', (data) => {
    io.to(`ticket:${data.ticketId}`).emit('ticket:updated', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from customer service');
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3036;

httpServer.listen(PORT, () => {
  console.log(`Indigenous Customer Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});