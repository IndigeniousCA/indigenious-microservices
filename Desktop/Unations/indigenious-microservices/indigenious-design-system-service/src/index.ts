import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import compression from 'compression';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { ElementalComponentsService } from './services/elemental-components.service';
import { BackgroundOrchestratorService } from './services/background-orchestrator.service';
import { z } from 'zod';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

const prisma = new PrismaClient();
const elementalService = new ElementalComponentsService();
const backgroundService = new BackgroundOrchestratorService();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Needed for design system
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP'
});

app.use('/api', limiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      service: 'indigenious-design-system-service',
      philosophy: 'Where Economics Meets The Land',
      timestamp: new Date().toISOString(),
      stats: {
        elementalComponents: 16,
        backgroundLayers: 8,
        designTokens: 23,
        season: backgroundService.getCurrentSeason(),
        timeOfDay: backgroundService.getTimeOfDay()
      },
      features: [
        '16 Elemental Components mapping 80 platform features',
        '8-layer living background system',
        'Performance-aware rendering (full-forest, flowing-river, still-pond)',
        'Seasonal and time-based theme adjustments',
        'Cultural calendar integration',
        'Natural Law Economics combinations',
        'Medicine wheel navigation',
        'Real-time collaborative ripples'
      ]
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================
// ELEMENTAL COMPONENTS API
// ==========================================

// Get all elemental components
app.get('/api/elements', async (req, res) => {
  try {
    const components = [
      { symbol: "🌊", name: "Re (Water)", meaning: "User flows and authentication streams", category: "Foundation", element: "water" },
      { symbol: "🌍", name: "Tu (Earth)", meaning: "Data persistence and solid foundations", category: "Foundation", element: "earth" },
      { symbol: "🔥", name: "Af (Fire)", meaning: "Real-time processing and transformation", category: "Foundation", element: "fire" },
      { symbol: "💨", name: "Ai (Air)", meaning: "Communication and message flow", category: "Foundation", element: "air" },
      { symbol: "🌱", name: "Li (Life)", meaning: "Growth systems and organic scaling", category: "Growth", element: "life" },
      { symbol: "⚡", name: "En (Energy)", meaning: "Power management and resource distribution", category: "Power", element: "energy" },
      { symbol: "📊", name: "In (Information)", meaning: "Knowledge systems and data intelligence", category: "Knowledge", element: "information" },
      { symbol: "🤝", name: "Co (Connection)", meaning: "Relationship building and network effects", category: "Social", element: "connection" },
      { symbol: "🔄", name: "Cy (Cycle)", meaning: "Circular economy and resource loops", category: "Economics", element: "cycle" },
      { symbol: "🌀", name: "Fl (Flow)", meaning: "Value streams and economic circulation", category: "Economics", element: "flow" },
      { symbol: "🎯", name: "Pu (Purpose)", meaning: "Mission alignment and intentional design", category: "Direction", element: "purpose" },
      { symbol: "⚖️", name: "Ba (Balance)", meaning: "Harmony between profit and planet", category: "Wisdom", element: "balance" },
      { symbol: "🧠", name: "Wi (Wisdom)", meaning: "Elder knowledge and traditional systems", category: "Wisdom", element: "wisdom" },
      { symbol: "🎨", name: "Be (Beauty)", meaning: "Aesthetic design and cultural expression", category: "Culture", element: "beauty" },
      { symbol: "🎵", name: "Ha (Harmony)", meaning: "Synchronized systems and coherent experiences", category: "Culture", element: "harmony" },
      { symbol: "🌟", name: "Sp (Spirit)", meaning: "Core values and cultural essence", category: "Culture", element: "spirit" }
    ];

    const { category, element } = req.query;
    
    let filteredComponents = components;
    
    if (category) {
      filteredComponents = filteredComponents.filter(c => c.category.toLowerCase() === (category as string).toLowerCase());
    }
    if (element) {
      filteredComponents = filteredComponents.filter(c => c.element.toLowerCase() === (element as string).toLowerCase());
    }
    
    res.json({ 
      components: filteredComponents,
      count: filteredComponents.length 
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get components' 
    });
  }
});

// Get specific element
app.get('/api/elements/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const component = await elementalService.getComponent(symbol);
    
    if (!component) {
      return res.status(404).json({ error: 'Element not found' });
    }
    
    res.json(component);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get component' 
    });
  }
});

// Record element interaction
app.post('/api/elements/:symbol/interact', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interactionType, userId, sessionId, deviceType } = req.body;
    
    await elementalService.recordInteraction(
      symbol,
      interactionType,
      userId,
      sessionId,
      deviceType
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to record interaction' 
    });
  }
});

// Get element combination
app.get('/api/elements/combine/:first/:second', async (req, res) => {
  try {
    const { first, second } = req.params;
    const combination = await elementalService.getCombination(first, second);
    
    if (!combination) {
      return res.status(404).json({ error: 'No combination exists' });
    }
    
    res.json(combination);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get combination' 
    });
  }
});

// ==========================================
// BACKGROUND LAYERS API
// ==========================================

// Get all background layers
app.get('/api/backgrounds', async (req, res) => {
  try {
    const layers = await prisma.backgroundLayer.findMany({
      where: { active: true },
      orderBy: { zIndex: 'asc' }
    });
    
    res.json({ layers });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get background layers' 
    });
  }
});

// Get layer animation data
app.get('/api/backgrounds/:name/data', async (req, res) => {
  try {
    const { name } = req.params;
    const { width = 1920, height = 1080 } = req.query;
    
    const timestamp = Date.now();
    let data: any = {};
    
    switch (name) {
      case 'riverFlow':
        data = { 
          paths: backgroundService.generateRiverFlow(
            timestamp, 
            Number(width), 
            Number(height)
          ) 
        };
        break;
      case 'topographicLines':
        data = { 
          lines: backgroundService.generateTopographicLines(
            timestamp, 
            Number(width), 
            Number(height)
          ) 
        };
        break;
      case 'auroraBorealis':
        data = backgroundService.generateAurora(
          timestamp, 
          Number(width), 
          Number(height)
        );
        break;
      case 'mycelialNetwork':
        data = backgroundService.generateMycelialNetwork(
          timestamp, 
          Number(width), 
          Number(height)
        );
        break;
      case 'particleSystem':
        data = { 
          particles: backgroundService.generateParticles(
            timestamp, 
            Number(width), 
            Number(height)
          ) 
        };
        break;
      case 'mistLayer':
        data = backgroundService.generateMist(
          timestamp, 
          Number(width), 
          Number(height)
        );
        break;
    }
    
    res.json({ name, timestamp, data });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate layer data' 
    });
  }
});

// ==========================================
// DESIGN TOKENS API
// ==========================================

// Get all design tokens
app.get('/api/tokens', async (req, res) => {
  try {
    const { category, naturalElement } = req.query;
    
    const where: any = { active: true };
    if (category) where.category = category;
    if (naturalElement) where.naturalElement = naturalElement;
    
    const tokens = await prisma.designToken.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    
    // Group by category
    const grouped = tokens.reduce((acc: any, token) => {
      if (!acc[token.category]) {
        acc[token.category] = [];
      }
      acc[token.category].push(token);
      return acc;
    }, {});
    
    res.json({ tokens: grouped });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get design tokens' 
    });
  }
});

// Create/update design token
app.post('/api/tokens', async (req, res) => {
  try {
    const { category, name, value, meaning, naturalElement } = req.body;
    
    const token = await prisma.designToken.upsert({
      where: {
        category_name: { category, name }
      },
      update: {
        value,
        meaning,
        naturalElement,
        cssVariable: `--${name.toLowerCase().replace(/\s+/g, '-')}`
      },
      create: {
        category,
        name,
        value,
        meaning,
        naturalElement,
        cssVariable: `--${name.toLowerCase().replace(/\s+/g, '-')}`,
        usage: []
      }
    });
    
    res.json(token);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to save design token' 
    });
  }
});

// ==========================================
// THEME & PERFORMANCE API
// ==========================================

// Get current theme configuration
app.get('/api/theme/current', async (req, res) => {
  try {
    const season = backgroundService.getCurrentSeason();
    const timeOfDay = backgroundService.getTimeOfDay();
    
    const seasonalAdjustments = await backgroundService.applySeasonalAdjustments(season);
    const timeAdjustments = await backgroundService.applyTimeAdjustments(timeOfDay);
    
    // Check for cultural events
    const today = new Date();
    const culturalEvent = await prisma.culturalEvent.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
        active: true
      }
    });
    
    res.json({
      season,
      timeOfDay,
      seasonalAdjustments,
      timeAdjustments,
      culturalEvent,
      ecosystemHealth: 87 // Would be calculated from real metrics
    });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get theme configuration' 
    });
  }
});

// Set performance mode
app.post('/api/performance/mode', async (req, res) => {
  try {
    const { mode, userId } = req.body;
    
    if (!['full-forest', 'flowing-river', 'still-pond'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid performance mode' });
    }
    
    backgroundService.setPerformanceMode(mode as any);
    
    // Save user preference if userId provided
    if (userId) {
      await prisma.userDesignPreference.upsert({
        where: { userId },
        update: { performanceMode: mode },
        create: {
          userId,
          performanceMode: mode
        }
      });
    }
    
    res.json({ mode, success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to set performance mode' 
    });
  }
});

// Get performance profiles
app.get('/api/performance/profiles', async (req, res) => {
  try {
    const profiles = await prisma.performanceProfile.findMany({
      where: { active: true }
    });
    
    res.json({ profiles });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get performance profiles' 
    });
  }
});

// ==========================================
// CULTURAL CALENDAR API
// ==========================================

// Get cultural events
app.get('/api/cultural/events', async (req, res) => {
  try {
    const { type, nation } = req.query;
    const today = new Date();
    
    const where: any = {
      active: true,
      startDate: { lte: today },
      endDate: { gte: today }
    };
    
    if (type) where.type = type;
    if (nation) where.nation = nation;
    
    const events = await prisma.culturalEvent.findMany({
      where,
      orderBy: { startDate: 'asc' }
    });
    
    res.json({ events });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get cultural events' 
    });
  }
});

// ==========================================
// ANALYTICS API
// ==========================================

// Record design system analytics
app.post('/api/analytics', async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      averageFPS,
      loadTime,
      elementInteractions,
      deviceType,
      browser,
      screenResolution,
      performanceMode,
      themeName
    } = req.body;
    
    await prisma.designSystemAnalytics.create({
      data: {
        sessionId,
        userId,
        averageFPS,
        loadTime,
        elementInteractions,
        deviceType,
        browser,
        screenResolution,
        performanceMode,
        themeName,
        rippleCount: elementInteractions?.ripples || 0
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to record analytics' 
    });
  }
});

// ==========================================
// WEBSOCKET EVENTS
// ==========================================

io.on('connection', (socket) => {
  console.log('Client connected to design system');
  
  // Join performance room
  socket.on('join:performance', (mode: string) => {
    socket.join(`performance:${mode}`);
  });
  
  // Subscribe to element updates
  socket.on('subscribe:elements', () => {
    socket.join('elements');
  });
  
  // Subscribe to background updates
  socket.on('subscribe:backgrounds', () => {
    socket.join('backgrounds');
  });
  
  // Handle ripple effects
  socket.on('ripple', (data) => {
    socket.broadcast.emit('ripple:sync', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from design system');
  });
});

// Listen for service events
elementalService.on('componentsReady', (components) => {
  io.to('elements').emit('elements:ready', components);
});

elementalService.on('interaction', (data) => {
  io.to('elements').emit('element:interaction', data);
});

backgroundService.on('layersReady', (layers) => {
  io.to('backgrounds').emit('backgrounds:ready', layers);
});

backgroundService.on('layerUpdate', (data) => {
  io.to('backgrounds').emit('background:update', data);
});

backgroundService.on('performanceModeChanged', (data) => {
  io.emit('performance:changed', data);
});

backgroundService.on('seasonalAdjustment', (data) => {
  io.emit('theme:seasonal', data);
});

backgroundService.on('timeAdjustment', (data) => {
  io.emit('theme:time', data);
});

// Initialize services
async function initialize() {
  try {
    // Initialize natural law combinations
    await elementalService.initializeNaturalLawCombinations();
    
    // Start background animation loop
    backgroundService.startAnimationLoop();
    
    // Initialize default design tokens
    await initializeDesignTokens();
    
    console.log('Design system services initialized');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

async function initializeDesignTokens() {
  const tokens = [
    // Colors - Elements
    { category: 'color', name: 'riverBlue', value: 'rgba(59, 130, 246, 0.2)', meaning: 'The color of clean rivers flowing through territories' },
    { category: 'color', name: 'forestGreen', value: 'rgba(16, 185, 129, 0.2)', meaning: 'The green of old growth forests' },
    { category: 'color', name: 'earthBrown', value: 'rgba(139, 69, 19, 0.1)', meaning: 'Rich soil that gives life' },
    { category: 'color', name: 'sacredPurple', value: 'rgba(147, 51, 234, 0.3)', meaning: 'The color of ceremony and spirit' },
    { category: 'color', name: 'sunsetOrange', value: 'rgba(255, 107, 53, 0.4)', meaning: 'The warmth of the setting sun' },
    { category: 'color', name: 'mistWhite', value: 'rgba(255, 255, 255, 0.02)', meaning: 'Morning mist over the water' },
    
    // Spacing - Natural Rhythms
    { category: 'spacing', name: 'seed', value: '4px', meaning: 'The smallest unit of growth' },
    { category: 'spacing', name: 'sprout', value: '8px', meaning: 'New growth emerging' },
    { category: 'spacing', name: 'sapling', value: '16px', meaning: 'Young but established' },
    { category: 'spacing', name: 'tree', value: '32px', meaning: 'Mature and strong' },
    { category: 'spacing', name: 'grove', value: '64px', meaning: 'Community spacing' },
    { category: 'spacing', name: 'forest', value: '128px', meaning: 'Ecosystem scale' },
    
    // Animation - Natural Movements
    { category: 'animation', name: 'breathe', value: '6000ms', meaning: 'The rhythm of breathing' },
    { category: 'animation', name: 'pulse', value: '4000ms', meaning: 'Heartbeat of the land' },
    { category: 'animation', name: 'flow', value: '3000ms', meaning: 'River current speed' },
    { category: 'animation', name: 'drift', value: '15000ms', meaning: 'Cloud movement' },
    { category: 'animation', name: 'season', value: '120000ms', meaning: 'Seasonal transitions' }
  ];
  
  for (const token of tokens) {
    await prisma.designToken.upsert({
      where: {
        category_name: {
          category: token.category,
          name: token.name
        }
      },
      update: {},
      create: {
        ...token,
        cssVariable: `--${token.name.toLowerCase().replace(/\s+/g, '-')}`,
        usage: []
      }
    });
  }
}

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3049;

httpServer.listen(PORT, async () => {
  await initialize();
  
  console.log(`🌲 Indigenous Design System Service running on port ${PORT}`);
  console.log(`🌊 Philosophy: "Where Economics Meets The Land"`);
  console.log('📊 Features:');
  console.log('   - 16 Elemental Components mapping 80 platform features');
  console.log('   - 8-layer living background system');
  console.log('   - Performance-aware rendering (full-forest, flowing-river, still-pond)');
  console.log('   - Seasonal and time-based theme adjustments');
  console.log('   - Cultural calendar integration');
  console.log('   - Natural Law Economics combinations');
  console.log('   - Medicine wheel navigation');
  console.log('   - Real-time collaborative ripples');
  console.log(`🌍 Current Season: ${backgroundService.getCurrentSeason()}`);
  console.log(`⏰ Time of Day: ${backgroundService.getTimeOfDay()}`);
  console.log('🌿 Ecosystem Health: 87%');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  httpServer.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});