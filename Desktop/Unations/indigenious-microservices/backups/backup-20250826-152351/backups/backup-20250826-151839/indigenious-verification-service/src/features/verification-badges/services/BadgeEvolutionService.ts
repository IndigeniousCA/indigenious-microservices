import { AnimalSpirit, BadgeStage } from '../types';
import { prisma } from '@/lib/prisma';

interface EvolutionPath {
  fromSpirit: AnimalSpirit;
  toSpirit: AnimalSpirit;
  requirements: EvolutionRequirements;
  narrative: string;
  visualEffects: EvolutionVisualEffects;
}

interface EvolutionRequirements {
  minStage: BadgeStage;
  metrics: {
    procurementPercentage?: number;
    indigenousEmployment?: number;
    communityInvestment?: number;
    sustainabilityScore?: number;
    totalImpactValue?: number;
  };
  specialAchievements?: string[];
}

interface EvolutionVisualEffects {
  particleEffect: string;
  transformationDuration: number;
  glowColor: string;
  soundEffect?: string;
  backgroundAnimation: string;
}

export class BadgeEvolutionService {
  // Evolution paths - not all spirits can evolve to all others
  private readonly evolutionPaths: EvolutionPath[] = [
    // Marten can evolve to multiple paths
    {
      fromSpirit: AnimalSpirit.MARTEN,
      toSpirit: AnimalSpirit.FOX,
      requirements: {
        minStage: BadgeStage.AURORA,
        metrics: { indigenousEmployment: 25 }
      },
      narrative: 'Your resourcefulness has grown into clever innovation',
      visualEffects: {
        particleEffect: 'sparks',
        transformationDuration: 3000,
        glowColor: '#FF6347',
        backgroundAnimation: 'forest-transition'
      }
    },
    {
      fromSpirit: AnimalSpirit.MARTEN,
      toSpirit: AnimalSpirit.OTTER,
      requirements: {
        minStage: BadgeStage.AURORA,
        metrics: { procurementPercentage: 7 }
      },
      narrative: 'Quick success has become playful prosperity',
      visualEffects: {
        particleEffect: 'water-ripples',
        transformationDuration: 3000,
        glowColor: '#4682B4',
        backgroundAnimation: 'river-flow'
      }
    },
    
    // Fox evolution paths
    {
      fromSpirit: AnimalSpirit.FOX,
      toSpirit: AnimalSpirit.WOLF,
      requirements: {
        minStage: BadgeStage.GOLDEN,
        metrics: { indigenousEmployment: 50 }
      },
      narrative: 'Clever innovation has built a pack of success',
      visualEffects: {
        particleEffect: 'moon-glow',
        transformationDuration: 4000,
        glowColor: '#708090',
        backgroundAnimation: 'pack-gathering'
      }
    },
    {
      fromSpirit: AnimalSpirit.FOX,
      toSpirit: AnimalSpirit.RAVEN,
      requirements: {
        minStage: BadgeStage.LEGENDARY,
        metrics: { 
          totalImpactValue: 2000000,
          procurementPercentage: 12
        },
        specialAchievements: ['industry_transformer']
      },
      narrative: 'The clever one becomes the transformer of worlds',
      visualEffects: {
        particleEffect: 'shadow-to-light',
        transformationDuration: 5000,
        glowColor: '#4B0082',
        backgroundAnimation: 'dawn-breaking'
      }
    },

    // Beaver evolution
    {
      fromSpirit: AnimalSpirit.BEAVER,
      toSpirit: AnimalSpirit.BEAR,
      requirements: {
        minStage: BadgeStage.GOLDEN,
        metrics: { 
          communityInvestment: 250000,
          sustainabilityScore: 0.8
        }
      },
      narrative: 'The builder has become the protector',
      visualEffects: {
        particleEffect: 'earth-rumble',
        transformationDuration: 4000,
        glowColor: '#654321',
        backgroundAnimation: 'mountain-rise'
      }
    },

    // Wolf evolution
    {
      fromSpirit: AnimalSpirit.WOLF,
      toSpirit: AnimalSpirit.EAGLE,
      requirements: {
        minStage: BadgeStage.GOLDEN,
        metrics: { procurementPercentage: 15 }
      },
      narrative: 'The pack leader soars to new heights',
      visualEffects: {
        particleEffect: 'wind-spirals',
        transformationDuration: 4000,
        glowColor: '#FFD700',
        backgroundAnimation: 'sky-ascension'
      }
    },

    // Multiple paths to Raven (the transformer)
    {
      fromSpirit: AnimalSpirit.EAGLE,
      toSpirit: AnimalSpirit.RAVEN,
      requirements: {
        minStage: BadgeStage.LEGENDARY,
        metrics: { 
          totalImpactValue: 2500000,
          indigenousEmployment: 75
        }
      },
      narrative: 'Vision becomes transformation',
      visualEffects: {
        particleEffect: 'cosmic-shift',
        transformationDuration: 6000,
        glowColor: '#9400D3',
        backgroundAnimation: 'reality-warp'
      }
    },
    {
      fromSpirit: AnimalSpirit.TURTLE,
      toSpirit: AnimalSpirit.RAVEN,
      requirements: {
        minStage: BadgeStage.LEGENDARY,
        metrics: { 
          sustainabilityScore: 0.95,
          totalImpactValue: 2000000
        },
        specialAchievements: ['wisdom_keeper', 'generational_impact']
      },
      narrative: 'Ancient wisdom transforms into new creation',
      visualEffects: {
        particleEffect: 'time-ripples',
        transformationDuration: 7000,
        glowColor: '#8B008B',
        backgroundAnimation: 'ages-passing'
      }
    }
  ];

  /**
   * Check if a badge can evolve
   */
  async checkEvolutionEligibility(badgeId: string): Promise<{
    canEvolve: boolean;
    availablePaths: EvolutionPath[];
    currentProgress: Record<string, number>;
  }> {
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        business: true
      }
    });

    if (!badge) {
      return { canEvolve: false, availablePaths: [], currentProgress: {} };
    }

    // Find available evolution paths
    const availablePaths = this.evolutionPaths.filter(path => 
      path.fromSpirit === badge.animalSpirit &&
      badge.evolutionStage >= path.requirements.minStage
    );

    // Check which paths meet requirements
    const eligiblePaths = [];
    const currentProgress: Record<string, number> = {};

    for (const path of availablePaths) {
      const meetsRequirements = this.checkPathRequirements(badge, path);
      if (meetsRequirements.eligible) {
        eligiblePaths.push(path);
      }
      currentProgress[path.toSpirit] = meetsRequirements.progress;
    }

    return {
      canEvolve: eligiblePaths.length > 0,
      availablePaths: eligiblePaths,
      currentProgress
    };
  }

  /**
   * Execute badge evolution
   */
  async evolveBadge(
    badgeId: string,
    toSpirit: AnimalSpirit
  ): Promise<{
    success: boolean;
    evolution?: {
      fromSpirit: AnimalSpirit;
      toSpirit: AnimalSpirit;
      narrative: string;
      animation: any;
    };
    error?: string;
  }> {
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId }
    });

    if (!badge) {
      return { success: false, error: 'Badge not found' };
    }

    // Find the evolution path
    const evolutionPath = this.evolutionPaths.find(
      path => path.fromSpirit === badge.animalSpirit && path.toSpirit === toSpirit
    );

    if (!evolutionPath) {
      return { success: false, error: 'Invalid evolution path' };
    }

    // Verify requirements
    const meetsRequirements = this.checkPathRequirements(badge, evolutionPath);
    if (!meetsRequirements.eligible) {
      return { success: false, error: 'Requirements not met' };
    }

    // Update badge
    const updatedBadge = await prisma.badge.update({
      where: { id: badgeId },
      data: {
        animalSpirit: toSpirit,
        evolutionStage: BadgeStage.ENTRY // Reset to entry for new spirit
      }
    });

    // Create audit event
    await prisma.badgeAuditEvent.create({
      data: {
        badgeId,
        eventType: 'evolution',
        eventData: {
          fromSpirit: badge.animalSpirit,
          toSpirit,
          narrative: evolutionPath.narrative
        },
        performedByType: 'system'
      }
    });

    // Generate animation data
    const animation = this.generateEvolutionAnimation(evolutionPath);

    return {
      success: true,
      evolution: {
        fromSpirit: badge.animalSpirit,
        toSpirit,
        narrative: evolutionPath.narrative,
        animation
      }
    };
  }

  /**
   * Generate evolution animation data
   */
  generateEvolutionAnimation(path: EvolutionPath): any {
    return {
      duration: path.visualEffects.transformationDuration,
      stages: [
        {
          time: 0,
          effect: 'current-spirit-glow',
          intensity: 1
        },
        {
          time: 0.2,
          effect: path.visualEffects.particleEffect,
          intensity: 0.5
        },
        {
          time: 0.4,
          effect: 'spirit-dissolve',
          intensity: 1
        },
        {
          time: 0.5,
          effect: path.visualEffects.backgroundAnimation,
          intensity: 1
        },
        {
          time: 0.6,
          effect: 'new-spirit-materialize',
          intensity: 0.5
        },
        {
          time: 0.8,
          effect: 'celebration-burst',
          intensity: 1,
          color: path.visualEffects.glowColor
        },
        {
          time: 1,
          effect: 'completion-shine',
          intensity: 1
        }
      ],
      sounds: [
        { time: 0, sound: 'evolution-start' },
        { time: 0.5, sound: path.visualEffects.soundEffect || 'transformation' },
        { time: 0.8, sound: 'evolution-complete' }
      ],
      particles: {
        type: path.visualEffects.particleEffect,
        color: path.visualEffects.glowColor,
        count: 100,
        spread: 360,
        velocity: { min: 5, max: 20 }
      }
    };
  }

  /**
   * Create evolution teaser content
   */
  async createEvolutionTeaser(badge: any): Promise<{
    message: string;
    visualHint: string;
    progress: number;
  }> {
    const eligibility = await this.checkEvolutionEligibility(badge.id);
    
    if (!eligibility.canEvolve && eligibility.availablePaths.length > 0) {
      // Close to evolution
      const closestPath = eligibility.availablePaths[0];
      const progress = eligibility.currentProgress[closestPath.toSpirit];
      
      if (progress > 0.8) {
        return {
          message: `Your ${badge.animalSpirit} spirit is stirring... Something big is coming.`,
          visualHint: 'spirit-shimmer',
          progress
        };
      } else if (progress > 0.6) {
        return {
          message: `The path to ${closestPath.toSpirit} is revealing itself...`,
          visualHint: 'path-glow',
          progress
        };
      }
    }

    if (eligibility.canEvolve) {
      return {
        message: `🌟 Your spirit is ready to transform! Choose your evolution path.`,
        visualHint: 'evolution-ready',
        progress: 1
      };
    }

    return {
      message: `Continue your journey as ${badge.animalSpirit}. Greater things await.`,
      visualHint: 'steady-glow',
      progress: 0.3
    };
  }

  /**
   * Check if requirements are met for a path
   */
  private checkPathRequirements(
    badge: any,
    path: EvolutionPath
  ): { eligible: boolean; progress: number } {
    let requirementsMet = 0;
    let totalRequirements = 0;

    // Check stage
    if (badge.evolutionStage >= path.requirements.minStage) {
      requirementsMet++;
    }
    totalRequirements++;

    // Check metrics
    for (const [metric, required] of Object.entries(path.requirements.metrics || {})) {
      totalRequirements++;
      const current = badge[metric] || 0;
      if (current >= required) {
        requirementsMet++;
      }
    }

    // Check special achievements
    if (path.requirements.specialAchievements) {
      // This would check against an achievements table
      // For now, simulate
      totalRequirements += path.requirements.specialAchievements.length;
    }

    const progress = requirementsMet / totalRequirements;
    return {
      eligible: progress === 1,
      progress
    };
  }

  /**
   * Get evolution story for marketing
   */
  getEvolutionStory(fromSpirit: AnimalSpirit, toSpirit: AnimalSpirit): {
    title: string;
    story: string;
    lesson: string;
  } {
    const stories: Record<string, any> = {
      'marten-fox': {
        title: 'The Quick Become Clever',
        story: 'The Marten\'s speed taught lessons that became Fox\'s wisdom. What started as quick transactions evolved into innovative partnerships.',
        lesson: 'Growth transforms instinct into intelligence.'
      },
      'fox-raven': {
        title: 'The Clever Become Transformers',
        story: 'The Fox who mastered the game realized the game itself must change. Innovation became revolution.',
        lesson: 'True cleverness creates new realities.'
      },
      'eagle-raven': {
        title: 'Vision Becomes Creation',
        story: 'The Eagle who saw all possibilities became the Raven who brings them into being.',
        lesson: 'The highest view reveals the power to transform.'
      },
      'turtle-raven': {
        title: 'Ancient Wisdom Creates New Worlds',
        story: 'The Turtle who carried wisdom through ages became the Raven who shapes tomorrow.',
        lesson: 'True wisdom doesn\'t just endure—it transforms.'
      }
    };

    const key = `${fromSpirit}-${toSpirit}`;
    return stories[key] || {
      title: 'A Spirit Transforms',
      story: `The journey from ${fromSpirit} to ${toSpirit} represents profound growth.`,
      lesson: 'Every spirit carries the seed of transformation.'
    };
  }
}