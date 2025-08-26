import { AnimalSpirit } from '../types';
import { prisma } from '@/lib/prisma';

interface QuizQuestion {
  id: string;
  question: string;
  category: 'leadership' | 'values' | 'approach' | 'growth' | 'community';
  answers: QuizAnswer[];
}

interface QuizAnswer {
  id: string;
  text: string;
  spirits: Partial<Record<AnimalSpirit, number>>;
  traits: string[];
}

interface QuizResult {
  primarySpirit: AnimalSpirit;
  secondarySpirit?: AnimalSpirit;
  scores: Record<AnimalSpirit, number>;
  traits: string[];
  narrative: string;
  businessAlignment: string;
  growthPath: string;
}

export class SpiritAnimalQuizService {
  private readonly questions: QuizQuestion[] = [
    {
      id: 'q1',
      question: 'How does your business approach new opportunities?',
      category: 'approach',
      answers: [
        {
          id: 'a1',
          text: 'We build solid foundations and grow steadily',
          spirits: { [AnimalSpirit.BEAVER]: 3, [AnimalSpirit.TURTLE]: 2 },
          traits: ['methodical', 'builder']
        },
        {
          id: 'a2',
          text: 'We soar high to see the full landscape before deciding',
          spirits: { [AnimalSpirit.EAGLE]: 3, [AnimalSpirit.RAVEN]: 2 },
          traits: ['visionary', 'strategic']
        },
        {
          id: 'a3',
          text: 'We adapt quickly and find clever solutions',
          spirits: { [AnimalSpirit.FOX]: 3, [AnimalSpirit.MARTEN]: 2 },
          traits: ['adaptable', 'innovative']
        },
        {
          id: 'a4',
          text: 'We gather our team and move forward together',
          spirits: { [AnimalSpirit.WOLF]: 3, [AnimalSpirit.OTTER]: 2 },
          traits: ['collaborative', 'team-oriented']
        }
      ]
    },
    {
      id: 'q2',
      question: 'What drives your commitment to Indigenous partnerships?',
      category: 'values',
      answers: [
        {
          id: 'a1',
          text: 'Creating lasting transformation and bringing new light',
          spirits: { [AnimalSpirit.RAVEN]: 3, [AnimalSpirit.EAGLE]: 1 },
          traits: ['transformative', 'pioneering']
        },
        {
          id: 'a2',
          text: 'Building prosperity that benefits everyone',
          spirits: { [AnimalSpirit.BEAVER]: 3, [AnimalSpirit.BEAR]: 1 },
          traits: ['inclusive', 'prosperity-focused']
        },
        {
          id: 'a3',
          text: 'Protecting and nurturing for future generations',
          spirits: { [AnimalSpirit.TURTLE]: 3, [AnimalSpirit.BEAR]: 2 },
          traits: ['protective', 'long-term thinking']
        },
        {
          id: 'a4',
          text: 'Creating joyful, successful partnerships',
          spirits: { [AnimalSpirit.OTTER]: 3, [AnimalSpirit.FOX]: 1 },
          traits: ['joyful', 'relationship-focused']
        }
      ]
    },
    {
      id: 'q3',
      question: 'How does your leadership style manifest?',
      category: 'leadership',
      answers: [
        {
          id: 'a1',
          text: 'Leading from the front with clear vision',
          spirits: { [AnimalSpirit.EAGLE]: 3, [AnimalSpirit.WOLF]: 1 },
          traits: ['decisive', 'visionary leadership']
        },
        {
          id: 'a2',
          text: 'Building consensus and moving as one',
          spirits: { [AnimalSpirit.WOLF]: 3, [AnimalSpirit.BEAVER]: 1 },
          traits: ['consensus-builder', 'unity-focused']
        },
        {
          id: 'a3',
          text: 'Protecting and providing for our community',
          spirits: { [AnimalSpirit.BEAR]: 3, [AnimalSpirit.TURTLE]: 1 },
          traits: ['protective', 'provider']
        },
        {
          id: 'a4',
          text: 'Fierce dedication to our mission',
          spirits: { [AnimalSpirit.WOLVERINE]: 3, [AnimalSpirit.MARTEN]: 1 },
          traits: ['dedicated', 'mission-driven']
        }
      ]
    },
    {
      id: 'q4',
      question: 'What best describes your business growth strategy?',
      category: 'growth',
      answers: [
        {
          id: 'a1',
          text: 'Steady expansion with deep roots in community',
          spirits: { [AnimalSpirit.TURTLE]: 3, [AnimalSpirit.BEAVER]: 2 },
          traits: ['steady', 'community-rooted']
        },
        {
          id: 'a2',
          text: 'Rapid adaptation to emerging opportunities',
          spirits: { [AnimalSpirit.MARTEN]: 3, [AnimalSpirit.FOX]: 2 },
          traits: ['agile', 'opportunity-driven']
        },
        {
          id: 'a3',
          text: 'Strategic positioning for maximum impact',
          spirits: { [AnimalSpirit.EAGLE]: 3, [AnimalSpirit.RAVEN]: 2 },
          traits: ['strategic', 'impact-focused']
        },
        {
          id: 'a4',
          text: 'Growing our pack through strong partnerships',
          spirits: { [AnimalSpirit.WOLF]: 3, [AnimalSpirit.OTTER]: 1 },
          traits: ['partnership-driven', 'network-builder']
        }
      ]
    },
    {
      id: 'q5',
      question: 'How do you measure success?',
      category: 'values',
      answers: [
        {
          id: 'a1',
          text: 'By the lasting structures we build',
          spirits: { [AnimalSpirit.BEAVER]: 3, [AnimalSpirit.BEAR]: 1 },
          traits: ['legacy-focused', 'builder']
        },
        {
          id: 'a2',
          text: 'By the transformations we enable',
          spirits: { [AnimalSpirit.RAVEN]: 3, [AnimalSpirit.FOX]: 1 },
          traits: ['transformation-focused', 'change-maker']
        },
        {
          id: 'a3',
          text: 'By the wisdom passed to next generations',
          spirits: { [AnimalSpirit.TURTLE]: 3, [AnimalSpirit.EAGLE]: 1 },
          traits: ['wisdom-keeper', 'generational']
        },
        {
          id: 'a4',
          text: 'By the joy and prosperity we create together',
          spirits: { [AnimalSpirit.OTTER]: 3, [AnimalSpirit.WOLF]: 1 },
          traits: ['joy-creator', 'collective-prosperity']
        }
      ]
    },
    {
      id: 'q6',
      question: 'What role does your business play in the community?',
      category: 'community',
      answers: [
        {
          id: 'a1',
          text: 'We unite and strengthen our community bonds',
          spirits: { [AnimalSpirit.WOLF]: 3, [AnimalSpirit.BEAR]: 2 },
          traits: ['unifier', 'strength-giver']
        },
        {
          id: 'a2',
          text: 'We find clever solutions to community challenges',
          spirits: { [AnimalSpirit.FOX]: 3, [AnimalSpirit.WOLVERINE]: 1 },
          traits: ['problem-solver', 'resourceful']
        },
        {
          id: 'a3',
          text: 'We preserve and share traditional knowledge',
          spirits: { [AnimalSpirit.TURTLE]: 3, [AnimalSpirit.BEAR]: 2 },
          traits: ['knowledge-keeper', 'tradition-bearer']
        },
        {
          id: 'a4',
          text: 'We bring new possibilities and light',
          spirits: { [AnimalSpirit.RAVEN]: 3, [AnimalSpirit.EAGLE]: 2 },
          traits: ['possibility-creator', 'illuminator']
        }
      ]
    },
    {
      id: 'q7',
      question: 'How do you handle challenges and obstacles?',
      category: 'approach',
      answers: [
        {
          id: 'a1',
          text: 'With fierce determination and relentless spirit',
          spirits: { [AnimalSpirit.WOLVERINE]: 3, [AnimalSpirit.BEAR]: 1 },
          traits: ['determined', 'relentless']
        },
        {
          id: 'a2',
          text: 'By finding creative paths others don\'t see',
          spirits: { [AnimalSpirit.FOX]: 3, [AnimalSpirit.RAVEN]: 2 },
          traits: ['creative', 'unconventional']
        },
        {
          id: 'a3',
          text: 'With patience and enduring wisdom',
          spirits: { [AnimalSpirit.TURTLE]: 3, [AnimalSpirit.BEAVER]: 1 },
          traits: ['patient', 'enduring']
        },
        {
          id: 'a4',
          text: 'By rising above to gain perspective',
          spirits: { [AnimalSpirit.EAGLE]: 3, [AnimalSpirit.RAVEN]: 1 },
          traits: ['perspective-seeker', 'rises-above']
        }
      ]
    }
  ];

  /**
   * Get quiz questions
   */
  getQuestions(): QuizQuestion[] {
    return this.questions;
  }

  /**
   * Calculate quiz results
   */
  calculateResults(answers: Record<string, string>): QuizResult {
    // Initialize scores
    const scores: Record<AnimalSpirit, number> = {
      [AnimalSpirit.BEAVER]: 0,
      [AnimalSpirit.EAGLE]: 0,
      [AnimalSpirit.FOX]: 0,
      [AnimalSpirit.WOLF]: 0,
      [AnimalSpirit.BEAR]: 0,
      [AnimalSpirit.TURTLE]: 0,
      [AnimalSpirit.OTTER]: 0,
      [AnimalSpirit.WOLVERINE]: 0,
      [AnimalSpirit.MARTEN]: 0,
      [AnimalSpirit.RAVEN]: 0
    };

    const collectedTraits: string[] = [];

    // Calculate scores from answers
    for (const [questionId, answerId] of Object.entries(answers)) {
      const question = this.questions.find(q => q.id === questionId);
      if (!question) continue;

      const answer = question.answers.find(a => a.id === answerId);
      if (!answer) continue;

      // Add spirit scores
      for (const [spirit, points] of Object.entries(answer.spirits)) {
        scores[spirit as AnimalSpirit] += points;
      }

      // Collect traits
      collectedTraits.push(...answer.traits);
    }

    // Determine primary and secondary spirits
    const sortedSpirits = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);
    
    const primarySpirit = sortedSpirits[0][0] as AnimalSpirit;
    const secondarySpirit = sortedSpirits[1][1] > 0 
      ? sortedSpirits[1][0] as AnimalSpirit 
      : undefined;

    // Generate narrative
    const narrative = this.generateNarrative(primarySpirit, secondarySpirit, collectedTraits);
    const businessAlignment = this.generateBusinessAlignment(primarySpirit);
    const growthPath = this.generateGrowthPath(primarySpirit, secondarySpirit);

    return {
      primarySpirit,
      secondarySpirit,
      scores,
      traits: [...new Set(collectedTraits)], // Remove duplicates
      narrative,
      businessAlignment,
      growthPath
    };
  }

  /**
   * Save quiz results
   */
  async saveQuizResults(
    results: QuizResult,
    email?: string,
    businessId?: string
  ): Promise<string> {
    const quizResult = await prisma.spiritAnimalQuiz.create({
      data: {
        email,
        businessId,
        answers: {}, // Would store actual answers
        assignedAnimal: results.primarySpirit,
        traits: results.traits,
        converted: false
      }
    });

    return quizResult.id;
  }

  /**
   * Generate personalized narrative
   */
  private generateNarrative(
    primary: AnimalSpirit,
    secondary: AnimalSpirit | undefined,
    traits: string[]
  ): string {
    const narratives: Record<AnimalSpirit, string> = {
      [AnimalSpirit.BEAVER]: 'You are a builder of prosperity, creating lasting foundations that benefit entire communities. Your methodical approach and dedication to craft make you a cornerstone of economic reconciliation.',
      [AnimalSpirit.EAGLE]: 'You soar above with visionary leadership, seeing opportunities others miss. Your ability to rise above challenges while maintaining sharp focus makes you a natural guide for others.',
      [AnimalSpirit.FOX]: 'Your clever innovation and adaptability allow you to find success where others see obstacles. You bring creative solutions that transform challenges into opportunities.',
      [AnimalSpirit.WOLF]: 'You understand that true strength comes from unity. Your ability to build and lead strong teams creates a pack mentality that achieves what individuals cannot.',
      [AnimalSpirit.BEAR]: 'You are the protector and provider, combining strength with nurturing wisdom. Your presence brings security and stability to all who work with you.',
      [AnimalSpirit.TURTLE]: 'Your wisdom spans generations, understanding that true success is measured in centuries, not quarters. You carry the knowledge that guides sustainable prosperity.',
      [AnimalSpirit.OTTER]: 'You bring joy to success, understanding that prosperity should be playful. Your positive energy creates partnerships that thrive on mutual happiness.',
      [AnimalSpirit.WOLVERINE]: 'Your fierce dedication and relentless spirit overcome any obstacle. When others give up, you dig deeper, making you unstoppable in pursuit of your mission.',
      [AnimalSpirit.MARTEN]: 'Quick and resourceful, you navigate rapid changes with grace. Your agility in business matches your ability to seize fleeting opportunities.',
      [AnimalSpirit.RAVEN]: 'You are the transformer, bringing light where there was darkness. Your role is to fundamentally change how business is done, creating new realities.'
    };

    let narrative = narratives[primary];
    
    if (secondary) {
      narrative += ` With traces of ${secondary} spirit, you also ${this.getSecondaryTrait(secondary)}.`;
    }

    return narrative;
  }

  /**
   * Generate business alignment insights
   */
  private generateBusinessAlignment(spirit: AnimalSpirit): string {
    const alignments: Record<AnimalSpirit, string> = {
      [AnimalSpirit.BEAVER]: 'Your business thrives in construction, infrastructure, and long-term development projects. Focus on building lasting partnerships with Indigenous communities.',
      [AnimalSpirit.EAGLE]: 'Leadership positions in any industry suit you. Consider advisory roles, strategic consulting, or businesses that require vision and high-level perspective.',
      [AnimalSpirit.FOX]: 'Innovation, technology, and creative industries align with your spirit. Look for opportunities to solve old problems with new approaches.',
      [AnimalSpirit.WOLF]: 'Team-based enterprises, cooperatives, and collaborative ventures match your spirit. Build businesses that strengthen community bonds.',
      [AnimalSpirit.BEAR]: 'Industries focused on protection, security, healthcare, or resource management align with your nurturing strength.',
      [AnimalSpirit.TURTLE]: 'Sustainable businesses, education, cultural preservation, and long-term investments match your generational thinking.',
      [AnimalSpirit.OTTER]: 'Tourism, hospitality, entertainment, and businesses that bring joy align with your playful success approach.',
      [AnimalSpirit.WOLVERINE]: 'Challenging industries requiring persistence - mining, energy, or difficult service sectors - match your relentless spirit.',
      [AnimalSpirit.MARTEN]: 'Fast-paced industries like logistics, communications, or rapid-response services suit your quick adaptability.',
      [AnimalSpirit.RAVEN]: 'Transformative industries - renewable energy, social enterprises, or revolutionary technologies - need your ability to bring change.'
    };

    return alignments[spirit];
  }

  /**
   * Generate growth path
   */
  private generateGrowthPath(
    primary: AnimalSpirit,
    secondary?: AnimalSpirit
  ): string {
    const paths: Record<AnimalSpirit, string> = {
      [AnimalSpirit.BEAVER]: 'Start with solid foundations. Your first badge evolution comes from consistent building. Focus on procurement percentage growth through steady partnerships.',
      [AnimalSpirit.EAGLE]: 'Your path to legendary status requires lifting others as you rise. Focus on mentoring other businesses while growing your procurement impact.',
      [AnimalSpirit.FOX]: 'Innovation is your evolution trigger. Each clever solution that benefits Indigenous partners moves you closer to transformation.',
      [AnimalSpirit.WOLF]: 'Pack growth equals badge evolution. Focus on Indigenous employment and creating team opportunities.',
      [AnimalSpirit.BEAR]: 'Community investment drives your evolution. Protective actions that benefit many will advance your stage.',
      [AnimalSpirit.TURTLE]: 'Time and wisdom advance you. Sustained partnerships over years, not months, trigger your evolution.',
      [AnimalSpirit.OTTER]: 'Joyful success metrics matter. High satisfaction scores and positive partnership feedback fuel your growth.',
      [AnimalSpirit.WOLVERINE]: 'Overcoming major obstacles advances you. Each "impossible" partnership you achieve adds to your legend.',
      [AnimalSpirit.MARTEN]: 'Speed of positive impact matters. Rapid Indigenous partnership growth triggers your evolution.',
      [AnimalSpirit.RAVEN]: 'Transformation scale drives evolution. Industry-changing partnerships and revolutionary approaches advance your stage.'
    };

    let path = paths[primary];
    
    if (secondary && this.canEvolve(primary, secondary)) {
      path += ` Your secondary ${secondary} spirit hints at a possible evolution path - achieve excellence to transform.`;
    }

    return path;
  }

  /**
   * Get secondary trait description
   */
  private getSecondaryTrait(spirit: AnimalSpirit): string {
    const traits: Record<AnimalSpirit, string> = {
      [AnimalSpirit.BEAVER]: 'bring methodical building to your approach',
      [AnimalSpirit.EAGLE]: 'possess visionary foresight',
      [AnimalSpirit.FOX]: 'show clever adaptability',
      [AnimalSpirit.WOLF]: 'value pack unity',
      [AnimalSpirit.BEAR]: 'protect what matters',
      [AnimalSpirit.TURTLE]: 'carry ancient wisdom',
      [AnimalSpirit.OTTER]: 'find joy in success',
      [AnimalSpirit.WOLVERINE]: 'show fierce determination',
      [AnimalSpirit.MARTEN]: 'move with quick agility',
      [AnimalSpirit.RAVEN]: 'seek transformation'
    };

    return traits[spirit];
  }

  /**
   * Check if spirits can evolve to each other
   */
  private canEvolve(from: AnimalSpirit, to: AnimalSpirit): boolean {
    const evolutionPaths: Record<AnimalSpirit, AnimalSpirit[]> = {
      [AnimalSpirit.MARTEN]: [AnimalSpirit.FOX, AnimalSpirit.OTTER],
      [AnimalSpirit.FOX]: [AnimalSpirit.WOLF, AnimalSpirit.RAVEN],
      [AnimalSpirit.OTTER]: [AnimalSpirit.BEAVER, AnimalSpirit.WOLF],
      [AnimalSpirit.BEAVER]: [AnimalSpirit.BEAR, AnimalSpirit.TURTLE],
      [AnimalSpirit.WOLF]: [AnimalSpirit.EAGLE, AnimalSpirit.BEAR],
      [AnimalSpirit.WOLVERINE]: [AnimalSpirit.BEAR, AnimalSpirit.WOLF],
      [AnimalSpirit.BEAR]: [AnimalSpirit.EAGLE, AnimalSpirit.TURTLE],
      [AnimalSpirit.TURTLE]: [AnimalSpirit.RAVEN, AnimalSpirit.EAGLE],
      [AnimalSpirit.EAGLE]: [AnimalSpirit.RAVEN],
      [AnimalSpirit.RAVEN]: [] // Raven is the ultimate form
    };

    return evolutionPaths[from]?.includes(to) || false;
  }

  /**
   * Generate shareable result
   */
  generateShareableResult(result: QuizResult): {
    text: string;
    image: string;
    hashtags: string[];
  } {
    const shareText = `I'm a ${result.primarySpirit.toUpperCase()} spirit in business! 🪶 My Indigenous partnership approach: "${result.traits.slice(0, 3).join(', ')}". Discover your business spirit animal and join the movement for economic reconciliation.`;

    return {
      text: shareText,
      image: `/api/badges/quiz/share-image/${result.primarySpirit}`,
      hashtags: [
        'IndigenousVerified',
        `${result.primarySpirit}Spirit`,
        'EconomicReconciliation',
        'BusinessSpiritAnimal',
        'ShowYourSpirit'
      ]
    };
  }
}