import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import winston from 'winston';
import { createNoise2D } from 'simplex-noise';

export interface BackgroundLayerConfig {
  name: string;
  zIndex: number;
  type: 'video' | 'canvas' | 'css' | 'webgl' | 'particles';
  animationType: string;
  duration: number;
  opacity: number;
  filters?: any;
  blendMode?: string;
}

export class BackgroundOrchestratorService extends EventEmitter {
  private prisma: PrismaClient;
  private logger: winston.Logger;
  private layers: Map<string, BackgroundLayerConfig> = new Map();
  private noise2D: any;
  private animationFrames: Map<string, number> = new Map();
  private performanceMode: 'full-forest' | 'flowing-river' | 'still-pond' = 'full-forest';
  
  // The 8 Living Background Layers
  private readonly BACKGROUND_LAYERS: BackgroundLayerConfig[] = [
    {
      name: 'riverFlow',
      zIndex: 0,
      type: 'video',
      animationType: 'flow',
      duration: 120000, // 2 minutes
      opacity: 0.4,
      filters: {
        brightness: 0.4,
        contrast: 1.2,
        saturate: 1.3,
        hueRotate: 190 // Blue tint
      },
      blendMode: 'normal'
    },
    {
      name: 'topographicLines',
      zIndex: 1,
      type: 'canvas',
      animationType: 'shift',
      duration: 60000, // 1 minute
      opacity: 0.03,
      blendMode: 'overlay'
    },
    {
      name: 'waterFlowGradients',
      zIndex: 2,
      type: 'css',
      animationType: 'rotate',
      duration: 45000,
      opacity: 0.15,
      blendMode: 'screen'
    },
    {
      name: 'riverCurrentLines',
      zIndex: 3,
      type: 'canvas',
      animationType: 'translate',
      duration: 20000,
      opacity: 0.08,
      blendMode: 'multiply'
    },
    {
      name: 'auroraBorealis',
      zIndex: 4,
      type: 'webgl',
      animationType: 'wave',
      duration: 30000,
      opacity: 0.4,
      blendMode: 'color-dodge',
      filters: {
        blur: 25
      }
    },
    {
      name: 'mycelialNetwork',
      zIndex: 5,
      type: 'canvas',
      animationType: 'pulse',
      duration: 4000,
      opacity: 0.2,
      blendMode: 'add'
    },
    {
      name: 'particleSystem',
      zIndex: 6,
      type: 'particles',
      animationType: 'float',
      duration: 15000,
      opacity: 0.6,
      blendMode: 'screen'
    },
    {
      name: 'mistLayer',
      zIndex: 7,
      type: 'css',
      animationType: 'breathe',
      duration: 60000,
      opacity: 0.4,
      blendMode: 'overlay'
    }
  ];
  
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.noise2D = createNoise2D();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    this.initializeLayers();
  }
  
  private async initializeLayers() {
    try {
      for (const layer of this.BACKGROUND_LAYERS) {
        this.layers.set(layer.name, layer);
        await this.syncLayerToDatabase(layer);
      }
      
      this.logger.info('Background layers initialized', {
        count: this.layers.size
      });
      
      this.emit('layersReady', Array.from(this.layers.values()));
    } catch (error) {
      this.logger.error('Failed to initialize background layers:', error);
    }
  }
  
  private async syncLayerToDatabase(config: BackgroundLayerConfig) {
    try {
      await this.prisma.backgroundLayer.upsert({
        where: { name: config.name },
        update: {
          zIndex: config.zIndex,
          type: config.type,
          animationType: config.animationType,
          duration: config.duration,
          opacity: config.opacity,
          filters: config.filters,
          blendMode: config.blendMode,
          fullForestEnabled: true,
          flowingRiverEnabled: this.shouldEnableInFlowingRiver(config.name),
          stillPondEnabled: this.shouldEnableInStillPond(config.name),
          easing: 'ease-in-out',
          infinite: true
        },
        create: {
          name: config.name,
          zIndex: config.zIndex,
          type: config.type,
          animationType: config.animationType,
          duration: config.duration,
          opacity: config.opacity,
          filters: config.filters,
          blendMode: config.blendMode,
          fullForestEnabled: true,
          flowingRiverEnabled: this.shouldEnableInFlowingRiver(config.name),
          stillPondEnabled: this.shouldEnableInStillPond(config.name),
          easing: 'ease-in-out',
          infinite: true
        }
      });
    } catch (error) {
      this.logger.error(`Failed to sync layer ${config.name}:`, error);
    }
  }
  
  private shouldEnableInFlowingRiver(layerName: string): boolean {
    const enabledLayers = [
      'waterFlowGradients',
      'riverCurrentLines',
      'mistLayer',
      'particleSystem'
    ];
    return enabledLayers.includes(layerName);
  }
  
  private shouldEnableInStillPond(layerName: string): boolean {
    const enabledLayers = ['mistLayer'];
    return enabledLayers.includes(layerName);
  }
  
  // Generate river flow animation data
  generateRiverFlow(time: number, width: number, height: number): string {
    const paths: string[] = [];
    const waveCount = 5;
    
    for (let i = 0; i < waveCount; i++) {
      const y = (height / (waveCount + 1)) * (i + 1);
      const amplitude = 20 + i * 5;
      const frequency = 0.002 + i * 0.0005;
      const speed = time * 0.001 * (1 + i * 0.2);
      
      let path = `M 0 ${y}`;
      
      for (let x = 0; x <= width; x += 10) {
        const noise = this.noise2D(x * frequency, speed) * amplitude;
        const yPos = y + noise;
        path += ` L ${x} ${yPos}`;
      }
      
      paths.push(path);
    }
    
    return paths.join(' ');
  }
  
  // Generate topographic lines
  generateTopographicLines(time: number, width: number, height: number): any[] {
    const lines: any[] = [];
    const levels = 8;
    const baseElevation = time * 0.00005;
    
    for (let level = 0; level < levels; level++) {
      const points: Array<{ x: number; y: number }> = [];
      const elevation = baseElevation + level * 0.1;
      
      for (let x = 0; x < width; x += 20) {
        for (let y = 0; y < height; y += 20) {
          const noiseValue = this.noise2D(
            x * 0.003 + elevation,
            y * 0.003 + elevation
          );
          
          if (Math.abs(noiseValue - level * 0.2) < 0.05) {
            points.push({ x, y });
          }
        }
      }
      
      lines.push({
        level,
        points,
        opacity: 0.03 + level * 0.005
      });
    }
    
    return lines;
  }
  
  // Generate aurora borealis effect
  generateAurora(time: number, width: number, height: number): any {
    const ribbons: any[] = [];
    const ribbonCount = 3;
    
    for (let i = 0; i < ribbonCount; i++) {
      const baseY = height * 0.2 + i * 50;
      const points: Array<{ x: number; y: number; color: string }> = [];
      
      for (let x = 0; x < width; x += 5) {
        const wave1 = Math.sin((x + time * 0.1) * 0.01) * 30;
        const wave2 = Math.sin((x + time * 0.15) * 0.005) * 20;
        const noise = this.noise2D(x * 0.002, time * 0.0001) * 15;
        
        const y = baseY + wave1 + wave2 + noise;
        
        // Aurora colors: green, blue, purple, pink
        const hue = 120 + Math.sin(x * 0.01 + time * 0.001) * 60;
        const saturation = 70 + Math.sin(x * 0.02) * 30;
        const lightness = 50 + Math.sin(x * 0.015) * 20;
        
        points.push({
          x,
          y,
          color: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`
        });
      }
      
      ribbons.push({ points, width: 40 + i * 20 });
    }
    
    return { ribbons };
  }
  
  // Generate mycelial network nodes
  generateMycelialNetwork(time: number, width: number, height: number): any {
    const nodes: any[] = [];
    const connections: any[] = [];
    const nodeCount = 30;
    const pulsePhase = (time % 4000) / 4000;
    
    // Generate nodes
    for (let i = 0; i < nodeCount; i++) {
      const x = (width / nodeCount) * i + this.noise2D(i, time * 0.0001) * 50;
      const y = height * 0.7 + this.noise2D(i + 100, time * 0.0001) * 100;
      const size = 3 + Math.sin(pulsePhase * Math.PI * 2 + i * 0.5) * 2;
      
      nodes.push({
        id: i,
        x,
        y,
        size,
        opacity: 0.6 + Math.sin(pulsePhase * Math.PI * 2 + i * 0.3) * 0.4
      });
    }
    
    // Generate connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = Math.sqrt(
          Math.pow(nodes[i].x - nodes[j].x, 2) +
          Math.pow(nodes[i].y - nodes[j].y, 2)
        );
        
        if (distance < 150) {
          connections.push({
            from: i,
            to: j,
            opacity: Math.max(0, 1 - distance / 150) * 0.3,
            pulse: Math.sin(pulsePhase * Math.PI * 2 + i * 0.2) * 0.5 + 0.5
          });
        }
      }
    }
    
    return { nodes, connections };
  }
  
  // Generate particle system
  generateParticles(time: number, width: number, height: number, count: number = 30): any[] {
    const particles: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const lifespan = 15000 + i * 500; // 15-30 seconds
      const age = (time + i * 1000) % lifespan;
      const progress = age / lifespan;
      
      const x = (width / count) * i + Math.sin(time * 0.0001 + i) * 50;
      const y = height - (height * progress);
      const size = 2 + Math.sin(progress * Math.PI) * 3;
      const opacity = Math.sin(progress * Math.PI) * 0.6;
      
      particles.push({
        x,
        y,
        size,
        opacity,
        glow: opacity > 0.3
      });
    }
    
    return particles;
  }
  
  // Generate mist effect
  generateMist(time: number, width: number, height: number): any {
    const layers: any[] = [];
    const layerCount = 3;
    const breathPhase = (time % 60000) / 60000;
    
    for (let i = 0; i < layerCount; i++) {
      const opacity = 0.1 + Math.sin(breathPhase * Math.PI * 2 + i * 0.5) * 0.05;
      const scale = 1 + Math.sin(breathPhase * Math.PI * 2 + i * 0.3) * 0.1;
      const translateX = Math.sin(time * 0.00005 + i) * 50;
      
      layers.push({
        id: i,
        opacity,
        scale,
        translateX,
        gradient: `radial-gradient(circle at ${50 + translateX}% 50%, 
          rgba(255, 255, 255, ${opacity}) 0%, 
          transparent 70%)`
      });
    }
    
    return { layers };
  }
  
  // Set performance mode
  setPerformanceMode(mode: 'full-forest' | 'flowing-river' | 'still-pond') {
    this.performanceMode = mode;
    
    this.emit('performanceModeChanged', {
      mode,
      activeLayers: this.getActiveLayersForMode(mode)
    });
    
    this.logger.info(`Performance mode changed to ${mode}`);
  }
  
  private getActiveLayersForMode(mode: string): string[] {
    switch (mode) {
      case 'full-forest':
        return Array.from(this.layers.keys());
      
      case 'flowing-river':
        return [
          'waterFlowGradients',
          'riverCurrentLines',
          'mistLayer',
          'particleSystem'
        ];
      
      case 'still-pond':
        return ['mistLayer'];
      
      default:
        return ['mistLayer'];
    }
  }
  
  // Get current season
  getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
  
  // Get time of day
  getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 24) return 'evening';
    return 'night';
  }
  
  // Apply seasonal adjustments
  async applySeasonalAdjustments(season: string) {
    const adjustments: Record<string, any> = {
      spring: {
        hueShift: 0,
        saturation: 1.2,
        brightness: 1.1,
        particleCount: 40
      },
      summer: {
        hueShift: -10,
        saturation: 1.3,
        brightness: 1.2,
        particleCount: 30
      },
      fall: {
        hueShift: 30,
        saturation: 1.1,
        brightness: 0.9,
        particleCount: 50
      },
      winter: {
        hueShift: 180,
        saturation: 0.8,
        brightness: 0.95,
        particleCount: 60
      }
    };
    
    const adjustment = adjustments[season] || adjustments.spring;
    
    this.emit('seasonalAdjustment', {
      season,
      adjustment
    });
    
    return adjustment;
  }
  
  // Apply time of day adjustments
  async applyTimeAdjustments(timeOfDay: string) {
    const adjustments: Record<string, any> = {
      morning: {
        warmth: 1.2,
        brightness: 1.1,
        contrast: 1.05
      },
      afternoon: {
        warmth: 1.0,
        brightness: 1.0,
        contrast: 1.0
      },
      evening: {
        warmth: 1.3,
        brightness: 0.9,
        contrast: 1.1
      },
      night: {
        warmth: 0.8,
        brightness: 0.7,
        contrast: 1.2
      }
    };
    
    const adjustment = adjustments[timeOfDay] || adjustments.afternoon;
    
    this.emit('timeAdjustment', {
      timeOfDay,
      adjustment
    });
    
    return adjustment;
  }
  
  // Start animation loop
  startAnimationLoop() {
    const animate = (timestamp: number) => {
      // Update all layers
      for (const [name, layer] of this.layers) {
        if (this.shouldAnimateLayer(name)) {
          this.animationFrames.set(name, timestamp);
          
          this.emit('layerUpdate', {
            name,
            timestamp,
            data: this.generateLayerData(name, timestamp)
          });
        }
      }
      
      // Continue loop
      if (this.performanceMode !== 'still-pond') {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  private shouldAnimateLayer(layerName: string): boolean {
    const activeLayers = this.getActiveLayersForMode(this.performanceMode);
    return activeLayers.includes(layerName);
  }
  
  private generateLayerData(layerName: string, timestamp: number): any {
    // This would be called by the actual rendering system
    const width = 1920; // Default viewport
    const height = 1080;
    
    switch (layerName) {
      case 'riverFlow':
        return { paths: this.generateRiverFlow(timestamp, width, height) };
      case 'topographicLines':
        return { lines: this.generateTopographicLines(timestamp, width, height) };
      case 'auroraBorealis':
        return this.generateAurora(timestamp, width, height);
      case 'mycelialNetwork':
        return this.generateMycelialNetwork(timestamp, width, height);
      case 'particleSystem':
        return { particles: this.generateParticles(timestamp, width, height) };
      case 'mistLayer':
        return this.generateMist(timestamp, width, height);
      default:
        return {};
    }
  }
}