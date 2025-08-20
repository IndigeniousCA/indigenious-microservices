import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import winston from 'winston';

export interface ElementalConfig {
  symbol: string;
  name: string;
  atomicWeight: string;
  ecosystem: string;
  ecosystemRole: string;
  element: string;
  direction: string;
  primaryColor: string;
  description: string;
  traditionalWisdom: string;
  metaphor: string;
  featureIds: number[];
  featureNames: string[];
  category: string;
  displayOrder: number;
}

export class ElementalComponentsService extends EventEmitter {
  private prisma: PrismaClient;
  private logger: winston.Logger;
  private components: Map<string, ElementalConfig> = new Map();
  
  // The 16 Elemental Components - Complete Natural Economic System
  private readonly ELEMENTAL_SYSTEM: ElementalConfig[] = [
    // CORE OPERATIONS ROW
    {
      symbol: 'Au',
      name: 'Authentication',
      atomicWeight: '7',
      ecosystem: 'ROOTS',
      ecosystemRole: 'Deep Root System',
      element: 'Earth',
      direction: 'North',
      primaryColor: '#8B4513', // Deep Earth Brown
      description: '7-factor authentication creating unbreakable trust. Like ancient root systems that connect entire forests, our authentication weaves community validation into digital truth.',
      traditionalWisdom: 'The roots remember who belongs to the forest.',
      metaphor: 'Ancient root systems',
      featureIds: [1, 57, 66],
      featureNames: ['User authentication', 'Data sovereignty', 'Security'],
      category: 'CORE',
      displayOrder: 1
    },
    {
      symbol: 'Ve',
      name: 'Verification',
      atomicWeight: '48',
      ecosystem: 'SOIL',
      ecosystemRole: 'Soil Health Layer',
      element: 'Earth',
      direction: 'North',
      primaryColor: '#3E2723', // Dark Rich Soil
      description: '48-second business verification through sacred ceremony. Healthy soil determines what can grow - our verification ensures only authentic Indigenous businesses flourish.',
      traditionalWisdom: 'Good soil knows the difference between medicine and poison.',
      metaphor: 'Healthy soil foundation',
      featureIds: [2, 3, 10, 12],
      featureNames: ['Registration', 'Directory', 'Certification', 'Compliance'],
      category: 'CORE',
      displayOrder: 2
    },
    {
      symbol: 'Pa',
      name: 'Payment',
      atomicWeight: '24',
      ecosystem: 'RIVER',
      ecosystemRole: 'River System',
      element: 'Water',
      direction: 'West',
      primaryColor: '#006994', // Deep River Blue
      description: '24-hour payment cycles flowing like rivers through territories. Money moves with the natural rhythm of water, nourishing communities along its path.',
      traditionalWisdom: 'Rivers know no borders, only destinations.',
      metaphor: 'Flowing river systems',
      featureIds: [13, 18, 19, 20, 27],
      featureNames: ['Payments', 'Invoices', 'Expenses', 'Banking'],
      category: 'CORE',
      displayOrder: 3
    },
    {
      symbol: 'Ma',
      name: 'Matching',
      atomicWeight: '∞',
      ecosystem: 'POLLEN',
      ecosystemRole: 'Pollination Network',
      element: 'Air',
      direction: 'East',
      primaryColor: '#FFD700', // Bright Golden Pollen
      description: 'Infinite opportunity pollination. Like bees carrying pollen between flowers, our AI matches RFQs to Indigenous businesses following natural patterns.',
      traditionalWisdom: 'The bee doesn\'t seek the flower; they find each other.',
      metaphor: 'Pollination patterns',
      featureIds: [9, 23, 28, 44],
      featureNames: ['RFQ matching', 'Bids', 'Partners', 'Alerts'],
      category: 'CORE',
      displayOrder: 4
    },
    
    // INTELLIGENCE & ENVIRONMENT ROW
    {
      symbol: 'Ca',
      name: 'Carbon Justice',
      atomicWeight: 'CO₂',
      ecosystem: 'BALANCE',
      ecosystemRole: 'Environmental Balance',
      element: 'Spirit',
      direction: 'Center',
      primaryColor: '#228B22', // Forest Green
      description: 'Making carbon crimes visible from space. Every unnecessary kilometer becomes environmental debt, funding Indigenous conservation through forced accountability.',
      traditionalWisdom: 'The Earth keeps perfect accounts.',
      metaphor: 'Ecological balance sheets',
      featureIds: [25, 50, 72],
      featureNames: ['Carbon calculator', 'Environmental tracking', 'Sustainability'],
      category: 'INTELLIGENCE',
      displayOrder: 5
    },
    {
      symbol: 'Ai',
      name: 'AI Assistant',
      atomicWeight: '87',
      ecosystem: 'SUN',
      ecosystemRole: 'Solar Energy',
      element: 'Fire',
      direction: 'South',
      primaryColor: '#FF6B35', // Sunset Orange-Red
      description: '87% win rate through photosynthetic intelligence. Converting opportunity sunlight into business growth, powered by traditional knowledge algorithms.',
      traditionalWisdom: 'Plants teach us to turn light into life.',
      metaphor: 'Photosynthetic growth',
      featureIds: [14, 15, 16, 26],
      featureNames: ['AI assistant', 'Predictive', 'Recommendations', 'Automation'],
      category: 'INTELLIGENCE',
      displayOrder: 6
    },
    {
      symbol: 'Ne',
      name: 'Network',
      atomicWeight: '²',
      ecosystem: 'WEB',
      ecosystemRole: 'Mycelial Network',
      element: 'Earth',
      direction: 'Below',
      primaryColor: '#C8B2DB', // Soft Purple Mycelial
      description: 'N² exponential growth through mycelial connections. Underground networks sharing resources, warnings, and opportunities - the wood wide web goes digital.',
      traditionalWisdom: 'The forest is one organism with many bodies.',
      metaphor: 'Mycelial communication',
      featureIds: [38, 39, 40, 60],
      featureNames: ['Forums', 'Networks', 'Referrals', 'Mesh'],
      category: 'INTELLIGENCE',
      displayOrder: 7
    },
    {
      symbol: 'In',
      name: 'Intelligence',
      atomicWeight: '∞',
      ecosystem: 'OWL',
      ecosystemRole: 'Night Vision',
      element: 'Air',
      direction: 'Night',
      primaryColor: '#483D8B', // Dark Slate Blue
      description: 'Infinite wisdom through data. Like the owl seeing in darkness, our intelligence systems reveal opportunities invisible to others.',
      traditionalWisdom: 'The owl sees what daylight cannot reveal.',
      metaphor: 'Nocturnal perception',
      featureIds: [6, 22, 61, 62],
      featureNames: ['Analytics', 'Market intel', 'PR automation', 'Competitive'],
      category: 'INTELLIGENCE',
      displayOrder: 8
    },
    
    // GOVERNANCE & KNOWLEDGE ROW
    {
      symbol: 'Da',
      name: 'Data Sovereignty',
      atomicWeight: '∞',
      ecosystem: 'CEDAR',
      ecosystemRole: 'Sacred Knowledge',
      element: 'Spirit',
      direction: 'Sacred',
      primaryColor: '#A0522D', // Sienna Cedar Wood
      description: 'Eternal protection of sacred knowledge. Like cedar trees living thousands of years, our data sovereignty ensures Indigenous wisdom remains under Indigenous control forever.',
      traditionalWisdom: 'Cedar protects what must never be forgotten.',
      metaphor: 'Ancient cedar protection',
      featureIds: [57, 65, 68],
      featureNames: ['Data sovereignty', 'Privacy', 'Audit trails'],
      category: 'GOVERNANCE',
      displayOrder: 9
    },
    {
      symbol: 'Go',
      name: 'Governance',
      atomicWeight: '7G',
      ecosystem: 'CANOPY',
      ecosystemRole: 'Forest Canopy',
      element: 'Air',
      direction: 'Above',
      primaryColor: '#2E7D32', // Deep Forest Green
      description: '7 generations thinking encoded in code. The old growth canopy protecting all below, making decisions that will nurture prosperity until 2224.',
      traditionalWisdom: 'Today\'s decisions are tomorrow\'s ancestors.',
      metaphor: 'Old growth wisdom',
      featureIds: [33, 34, 49, 70],
      featureNames: ['Council', 'Voting', 'Policy', 'Treaty'],
      category: 'GOVERNANCE',
      displayOrder: 10
    },
    {
      symbol: 'Co',
      name: 'Collaboration',
      atomicWeight: '33',
      ecosystem: 'HIVE',
      ecosystemRole: 'Hive Mind System',
      element: 'Air',
      direction: 'Collective',
      primaryColor: '#B8860B', // Dark Goldenrod Honey
      description: '33-person collaboration circles. Like bees working in perfect harmony, our collaboration tools unite teams across vast territories in shared purpose.',
      traditionalWisdom: 'The hive thinks as one, acts as many.',
      metaphor: 'Collective intelligence',
      featureIds: [5, 30, 31, 52],
      featureNames: ['Communications', 'Team tools', 'Projects', 'Virtual events'],
      category: 'GOVERNANCE',
      displayOrder: 11
    },
    {
      symbol: 'Ed',
      name: 'Education',
      atomicWeight: '7',
      ecosystem: 'SEEDS',
      ecosystemRole: 'Knowledge Seeds',
      element: 'Earth',
      direction: 'Future',
      primaryColor: '#7CB342', // Fresh Sprout Green
      description: '7-generation knowledge transfer. Seeds of wisdom planted today grow into forests of expertise tomorrow.',
      traditionalWisdom: 'Every Elder was once a seed.',
      metaphor: 'Seed to forest journey',
      featureIds: [11, 35, 36, 45, 53],
      featureNames: ['Training', 'Capacity', 'Mentorship', 'Skills', 'Knowledge base'],
      category: 'GOVERNANCE',
      displayOrder: 12
    },
    
    // OPERATIONS & COMPLIANCE ROW
    {
      symbol: 'Su',
      name: 'Supply Chain',
      atomicWeight: '24',
      ecosystem: 'TRAILS',
      ecosystemRole: 'Trade Routes',
      element: 'Earth',
      direction: 'Paths',
      primaryColor: '#795548', // Dusty Trail Brown
      description: '24-hour supply trails. Ancient trade routes reimagined as digital pathways, ensuring resources flow where needed.',
      traditionalWisdom: 'The trail remembers every footstep.',
      metaphor: 'Ancient trade networks',
      featureIds: [17, 24, 29, 54],
      featureNames: ['Supply chain', 'Inventory', 'Logistics', 'Equipment'],
      category: 'OPERATIONS',
      displayOrder: 13
    },
    {
      symbol: 'Em',
      name: 'Emergency',
      atomicWeight: '111',
      ecosystem: 'SIGNAL',
      ecosystemRole: 'Smoke Signals',
      element: 'Fire',
      direction: 'Alert',
      primaryColor: '#D32F2F', // Fire Signal Red
      description: '111-second response time. Like smoke signals of old, our emergency systems unite communities in times of crisis.',
      traditionalWisdom: 'One flame can alert a thousand warriors.',
      metaphor: 'Signal fire networks',
      featureIds: [58, 59, 60],
      featureNames: ['Emergency response', 'Satellite', 'Mesh networking'],
      category: 'OPERATIONS',
      displayOrder: 14
    },
    {
      symbol: 'Pr',
      name: 'Procurement',
      atomicWeight: '5',
      ecosystem: 'HUNT',
      ecosystemRole: 'Strategic Hunt',
      element: 'Spirit',
      direction: 'Strategy',
      primaryColor: '#607D8B', // Blue-Gray Stone
      description: '5% procurement target achievement. Strategic hunting where patience and preparation ensure successful capture of opportunities.',
      traditionalWisdom: 'The successful hunter thinks like the prey.',
      metaphor: 'Strategic hunting wisdom',
      featureIds: [21, 32, 41, 42, 43],
      featureNames: ['Pipeline', 'Contracts', 'Vendors', 'Performance', 'QA'],
      category: 'OPERATIONS',
      displayOrder: 15
    },
    {
      symbol: 'Re',
      name: 'Reporting',
      atomicWeight: '∞',
      ecosystem: 'STORIES',
      ecosystemRole: 'Story Keeping',
      element: 'Spirit',
      direction: 'Memory',
      primaryColor: '#7B1FA2', // Deep Purple Twilight
      description: 'Infinite stories told through data. Like oral traditions preserved in winter lodges, our reports carry truth across time.',
      traditionalWisdom: 'Numbers are stories waiting to be told.',
      metaphor: 'Winter lodge storytelling',
      featureIds: [4, 46, 47, 48],
      featureNames: ['Documents', 'Report generation', 'Compliance', 'Archives'],
      category: 'OPERATIONS',
      displayOrder: 16
    }
  ];
  
  constructor() {
    super();
    this.prisma = new PrismaClient();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    this.initializeComponents();
  }
  
  private async initializeComponents() {
    try {
      // Load components into memory
      for (const component of this.ELEMENTAL_SYSTEM) {
        this.components.set(component.symbol, component);
        
        // Sync with database
        await this.syncComponentToDatabase(component);
      }
      
      this.logger.info('Elemental components initialized', {
        count: this.components.size
      });
      
      this.emit('componentsReady', Array.from(this.components.values()));
    } catch (error) {
      this.logger.error('Failed to initialize elemental components:', error);
    }
  }
  
  private async syncComponentToDatabase(config: ElementalConfig) {
    try {
      await this.prisma.elementalComponent.upsert({
        where: { symbol: config.symbol },
        update: {
          name: config.name,
          atomicWeight: config.atomicWeight,
          ecosystem: config.ecosystem,
          ecosystemRole: config.ecosystemRole,
          element: config.element,
          direction: config.direction,
          primaryColor: config.primaryColor,
          description: config.description,
          traditionalWisdom: config.traditionalWisdom,
          metaphor: config.metaphor,
          featureIds: config.featureIds,
          featureNames: config.featureNames,
          category: config.category,
          displayOrder: config.displayOrder,
          animationType: this.getAnimationType(config.ecosystem),
          animationDuration: this.getAnimationDuration(config.ecosystem),
          fullForestMode: this.getFullForestConfig(config),
          flowingRiverMode: this.getFlowingRiverConfig(config),
          stillPondMode: this.getStillPondConfig(config)
        },
        create: {
          symbol: config.symbol,
          name: config.name,
          atomicWeight: config.atomicWeight,
          ecosystem: config.ecosystem,
          ecosystemRole: config.ecosystemRole,
          element: config.element,
          direction: config.direction,
          primaryColor: config.primaryColor,
          description: config.description,
          traditionalWisdom: config.traditionalWisdom,
          metaphor: config.metaphor,
          featureIds: config.featureIds,
          featureNames: config.featureNames,
          category: config.category,
          displayOrder: config.displayOrder,
          animationType: this.getAnimationType(config.ecosystem),
          animationDuration: this.getAnimationDuration(config.ecosystem),
          fullForestMode: this.getFullForestConfig(config),
          flowingRiverMode: this.getFlowingRiverConfig(config),
          stillPondMode: this.getStillPondConfig(config)
        }
      });
    } catch (error) {
      this.logger.error(`Failed to sync component ${config.symbol}:`, error);
    }
  }
  
  private getAnimationType(ecosystem: string): string {
    const animationMap: Record<string, string> = {
      'ROOTS': 'pulse',
      'SOIL': 'breathe',
      'RIVER': 'flow',
      'POLLEN': 'float',
      'BALANCE': 'rotate',
      'SUN': 'radiate',
      'WEB': 'network',
      'OWL': 'blink',
      'CEDAR': 'sway',
      'CANOPY': 'rustle',
      'HIVE': 'buzz',
      'SEEDS': 'grow',
      'TRAILS': 'trace',
      'SIGNAL': 'flash',
      'HUNT': 'stalk',
      'STORIES': 'spiral'
    };
    return animationMap[ecosystem] || 'pulse';
  }
  
  private getAnimationDuration(ecosystem: string): number {
    const durationMap: Record<string, number> = {
      'ROOTS': 4000,
      'SOIL': 6000,
      'RIVER': 3000,
      'POLLEN': 5000,
      'BALANCE': 8000,
      'SUN': 4500,
      'WEB': 3500,
      'OWL': 7000,
      'CEDAR': 9000,
      'CANOPY': 5500,
      'HIVE': 2500,
      'SEEDS': 10000,
      'TRAILS': 6500,
      'SIGNAL': 1500,
      'HUNT': 7500,
      'STORIES': 12000
    };
    return durationMap[ecosystem] || 4000;
  }
  
  private getFullForestConfig(config: ElementalConfig): any {
    return {
      particles: true,
      particleCount: 5,
      glow: true,
      glowIntensity: 0.8,
      pulse: true,
      pulseSpeed: 1.0,
      rippleOnHover: true,
      depthEffect: true,
      shadows: true,
      reflections: true,
      blur: true,
      blurAmount: 20
    };
  }
  
  private getFlowingRiverConfig(config: ElementalConfig): any {
    return {
      particles: true,
      particleCount: 2,
      glow: true,
      glowIntensity: 0.5,
      pulse: true,
      pulseSpeed: 0.8,
      rippleOnHover: true,
      depthEffect: false,
      shadows: false,
      reflections: false,
      blur: true,
      blurAmount: 10
    };
  }
  
  private getStillPondConfig(config: ElementalConfig): any {
    return {
      particles: false,
      particleCount: 0,
      glow: false,
      glowIntensity: 0,
      pulse: false,
      pulseSpeed: 0,
      rippleOnHover: false,
      depthEffect: false,
      shadows: false,
      reflections: false,
      blur: false,
      blurAmount: 0
    };
  }
  
  // Public methods
  async getComponent(symbol: string): Promise<ElementalConfig | undefined> {
    return this.components.get(symbol);
  }
  
  async getAllComponents(): Promise<ElementalConfig[]> {
    return Array.from(this.components.values());
  }
  
  async getComponentsByCategory(category: string): Promise<ElementalConfig[]> {
    return Array.from(this.components.values())
      .filter(c => c.category === category);
  }
  
  async getComponentsByElement(element: string): Promise<ElementalConfig[]> {
    return Array.from(this.components.values())
      .filter(c => c.element === element);
  }
  
  async getComponentsByEcosystem(ecosystem: string): Promise<ElementalConfig[]> {
    return Array.from(this.components.values())
      .filter(c => c.ecosystem === ecosystem);
  }
  
  async recordInteraction(
    symbol: string,
    interactionType: string,
    userId?: string,
    sessionId?: string,
    deviceType?: string
  ) {
    try {
      const component = await this.getComponent(symbol);
      if (!component) {
        throw new Error(`Component ${symbol} not found`);
      }
      
      const dbComponent = await this.prisma.elementalComponent.findUnique({
        where: { symbol }
      });
      
      if (dbComponent) {
        await this.prisma.elementInteraction.create({
          data: {
            elementId: dbComponent.id,
            interactionType,
            userId,
            sessionId,
            deviceType
          }
        });
        
        this.emit('interaction', {
          symbol,
          interactionType,
          userId,
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.logger.error('Failed to record interaction:', error);
    }
  }
  
  async getCombination(firstSymbol: string, secondSymbol: string): Promise<any> {
    try {
      const first = await this.prisma.elementalComponent.findUnique({
        where: { symbol: firstSymbol }
      });
      
      const second = await this.prisma.elementalComponent.findUnique({
        where: { symbol: secondSymbol }
      });
      
      if (!first || !second) {
        return null;
      }
      
      // Order symbols alphabetically for consistent lookup
      const [sym1, sym2] = [firstSymbol, secondSymbol].sort();
      
      const combination = await this.prisma.elementCombination.findFirst({
        where: {
          OR: [
            { firstElementId: first.id, secondElementId: second.id },
            { firstElementId: second.id, secondElementId: first.id }
          ]
        }
      });
      
      return combination;
    } catch (error) {
      this.logger.error('Failed to get combination:', error);
      return null;
    }
  }
  
  // Natural Law Economics combinations
  async initializeNaturalLawCombinations() {
    const combinations = [
      {
        first: 'Da', // Data Sovereignty
        second: 'Go', // Governance
        result: 'Digital Self-Determination',
        description: 'When data sovereignty meets governance, Indigenous nations achieve complete digital autonomy.',
        naturalLaw: 'Sovereignty flows from the land to the data'
      },
      {
        first: 'Ca', // Carbon Justice
        second: 'Pa', // Payment
        result: 'Environmental Economics',
        description: 'Carbon accountability becomes economic reality through automated payment systems.',
        naturalLaw: 'Every action has equal economic and ecological consequence'
      },
      {
        first: 'Au', // Authentication
        second: 'Ve', // Verification
        result: 'Unbreakable Trust',
        description: 'Deep roots authenticate while healthy soil verifies, creating trust as strong as the land itself.',
        naturalLaw: 'Trust grows from the ground up'
      },
      {
        first: 'Ma', // Matching
        second: 'Ai', // AI Assistant
        result: 'Opportunity Photosynthesis',
        description: 'AI-powered matching converts raw opportunities into business growth like sunlight into energy.',
        naturalLaw: 'Opportunities flow to those prepared to receive them'
      },
      {
        first: 'Ne', // Network
        second: 'Co', // Collaboration
        result: 'Mycelial Economy',
        description: 'Networks and collaboration create an underground economy of mutual support.',
        naturalLaw: 'The forest succeeds together or fails alone'
      }
    ];
    
    for (const combo of combinations) {
      await this.createCombination(combo);
    }
  }
  
  private async createCombination(combo: any) {
    try {
      const first = await this.prisma.elementalComponent.findUnique({
        where: { symbol: combo.first }
      });
      
      const second = await this.prisma.elementalComponent.findUnique({
        where: { symbol: combo.second }
      });
      
      if (first && second) {
        await this.prisma.elementCombination.upsert({
          where: {
            firstElementId_secondElementId: {
              firstElementId: first.id,
              secondElementId: second.id
            }
          },
          update: {
            resultName: combo.result,
            resultDescription: combo.description,
            naturalLaw: combo.naturalLaw,
            visualEffect: 'merge-and-glow'
          },
          create: {
            firstElementId: first.id,
            secondElementId: second.id,
            resultName: combo.result,
            resultDescription: combo.description,
            naturalLaw: combo.naturalLaw,
            visualEffect: 'merge-and-glow'
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to create combination:', error);
    }
  }
}