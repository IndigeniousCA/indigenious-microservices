// Feature Discovery Service
import { 
  Feature, FeatureUsageAnalysis, FeatureRecommendation, UserProfile,
  FeatureInteraction, FeatureCategory, SuccessStory, FeatureDemo,
  PersonalizedDiscovery, GamificationState, Achievement
} from '../types'

import { logger } from '@/lib/monitoring/logger';
export class FeatureDiscoveryService {
  private features: Map<string, Feature> = new Map()
  private userAnalytics: Map<string, FeatureUsageAnalysis> = new Map()
  private gamificationStates: Map<string, GamificationState> = new Map()
  
  constructor() {
    this.initializeFeatures()
  }

  // Analyze user's feature usage patterns
  analyzeUsage(userId: string): FeatureUsageAnalysis {
    // In production, this would analyze real user data
    const mockAnalysis: FeatureUsageAnalysis = {
      userId,
      analysisDate: new Date(),
      
      usage: {
        activeFeatures: [
          'rfq-search',
          'bid-submission',
          'document-management'
        ],
        inactiveFeatures: [
          'ai-bid-assistant',
          'partnership-matching',
          'compliance-checker',
          '3d-model-viewer',
          'visual-pipeline',
          'opportunity-matching',
          'predictive-analytics'
        ],
        recentlyUsed: [
          'rfq-search',
          'bid-submission'
        ],
        frequentlyUsed: [
          'rfq-search',
          'document-management'
        ],
        strugglingWith: [
          'bid-submission'
        ]
      },
      
      profile: {
        experience: 'intermediate',
        role: 'Business Development Manager',
        primaryGoals: [
          'Find more RFQ opportunities',
          'Improve bid win rate',
          'Build strategic partnerships'
        ],
        timeSpent: 45, // minutes per session
        completedOnboarding: true
      },
      
      behavior: {
        explorationRate: 0.3, // Uses 30% of available features
        featureStickiness: 0.7, // 70% retention for tried features
        helpSeeking: 0.4, // Moderate help usage
        experimentationLevel: 'medium'
      },
      
      context: {
        currentWorkflow: 'opportunity-discovery',
        recentActions: [
          'searched-rfqs',
          'filtered-by-location',
          'viewed-rfq-details'
        ],
        blockers: [
          'complex-bid-requirements',
          'missing-partnerships'
        ],
        opportunities: [
          'automate-bid-writing',
          'find-indigenous-partners',
          'improve-compliance'
        ]
      }
    }
    
    this.userAnalytics.set(userId, mockAnalysis)
    return mockAnalysis
  }

  // Generate personalized feature recommendations
  recommendFeatures(analysis: FeatureUsageAnalysis): FeatureRecommendation[] {
    const recommendations: FeatureRecommendation[] = []
    
    // AI Bid Assistant - High priority for struggling users
    if (analysis.usage.strugglingWith.includes('bid-submission')) {
      const aiBidFeature = this.features.get('ai-bid-assistant')!
      recommendations.push({
        feature: aiBidFeature,
        score: 95,
        confidence: 0.9,
        priority: 'critical',
        
        reasoning: {
          primaryReason: {
            type: 'gap_filling',
            description: 'Struggling with bid submissions',
            evidence: ['High time spent on bids', 'Multiple incomplete submissions'],
            weight: 0.8
          },
          supportingReasons: [
            {
              type: 'efficiency_boost',
              description: 'AI can reduce bid writing time by 70%',
              evidence: ['User testimonials', 'Time tracking data'],
              weight: 0.6
            }
          ],
          personalizedMessage: 'Based on your recent bid struggles, our AI assistant can help you write winning proposals faster'
        },
        
        impact: {
          timeToValue: 15, // minutes
          valueScore: 9.2,
          effortRequired: 'low',
          prerequisites: [
            { requirement: 'Complete profile', met: true },
            { requirement: 'Upload sample bids', met: false, action: 'Upload documents' }
          ]
        },
        
        cta: {
          primary: {
            label: 'Try AI Bid Assistant',
            action: 'trial',
            target: '/ai-bid-assistant',
            style: 'primary'
          },
          secondary: [
            {
              label: 'Watch Demo',
              action: 'demo',
              target: '/demos/ai-bid-assistant',
              style: 'secondary'
            }
          ],
          urgency: 'high'
        }
      })
    }
    
    // Partnership Matching - For users seeking partnerships
    if (analysis.context.opportunities.includes('find-indigenous-partners')) {
      const partnershipFeature = this.features.get('partnership-matching')!
      recommendations.push({
        feature: partnershipFeature,
        score: 88,
        confidence: 0.85,
        priority: 'high',
        
        reasoning: {
          primaryReason: {
            type: 'workflow_enhancement',
            description: 'Actively seeking Indigenous partnerships',
            evidence: ['Search patterns', 'Goal alignment'],
            weight: 0.9
          },
          supportingReasons: [],
          personalizedMessage: 'Our AI can match you with verified Indigenous partners who complement your capabilities'
        },
        
        impact: {
          timeToValue: 10,
          valueScore: 8.7,
          effortRequired: 'low',
          prerequisites: [
            { requirement: 'Complete capability profile', met: true }
          ]
        },
        
        cta: {
          primary: {
            label: 'Find Partners',
            action: 'navigate',
            target: '/partnerships',
            style: 'primary'
          },
          urgency: 'medium'
        }
      })
    }
    
    // Predictive Analytics - For data-driven users
    if (analysis.behavior.experimentationLevel === 'high') {
      const analyticsFeature = this.features.get('predictive-analytics')!
      recommendations.push({
        feature: analyticsFeature,
        score: 82,
        confidence: 0.8,
        priority: 'medium',
        
        reasoning: {
          primaryReason: {
            type: 'trend_based',
            description: 'High experimentation suggests interest in advanced features',
            evidence: ['Feature exploration patterns', 'Time spent in analytics'],
            weight: 0.7
          },
          supportingReasons: [],
          personalizedMessage: 'Your analytical approach suggests you\'d benefit from our predictive success tools'
        },
        
        impact: {
          timeToValue: 20,
          valueScore: 8.1,
          effortRequired: 'medium',
          prerequisites: [
            { requirement: 'Historical bid data', met: true },
            { requirement: 'Advanced subscription', met: false, action: 'Upgrade plan' }
          ]
        },
        
        cta: {
          primary: {
            label: 'Explore Analytics',
            action: 'navigate',
            target: '/analytics',
            style: 'primary'
          },
          urgency: 'low'
        }
      })
    }
    
    // Sort by score and return top recommendations
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5)
  }

  // Create personalized discovery experience
  personalizeExperience(userProfile: UserProfile): PersonalizedDiscovery {
    const analysis = this.analyzeUsage(userProfile.id)
    const recommendations = this.recommendFeatures(analysis)
    const gamificationState = this.getGamificationState(userProfile.id)
    
    // Create discovery path
    const discoveryPath = this.createDiscoveryPath(recommendations, userProfile)
    
    return {
      userId: userProfile.id,
      recommendations,
      discoveryPath,
      gamification: gamificationState,
      preferences: userProfile.preferences
    }
  }

  // Track feature interaction
  trackEngagement(interaction: FeatureInteraction): void {
    // Update feature analytics
    const feature = this.features.get(interaction.featureId)
    if (feature) {
      feature.engagement.views++
      
      if (interaction.type === 'trial') {
        feature.engagement.trials++
      }
      
      if (interaction.type === 'adopt') {
        feature.engagement.adoptions++
      }
    }
    
    // Update user gamification
    this.updateGamification(interaction.userId, interaction)
    
    // Store interaction for analysis
    this.storeInteraction(interaction)
  }

  // Get feature categories with metrics
  getFeatureCategories(): FeatureCategory[] {
    return [
      {
        id: 'ai-powered',
        name: 'AI-Powered',
        description: 'Intelligent features that learn and adapt',
        icon: 'brain',
        color: 'purple',
        order: 1,
        featured: true,
        metrics: {
          totalFeatures: 5,
          newFeatures: 2,
          popularFeatures: ['ai-bid-assistant', 'opportunity-matching'],
          adoptionRate: 0.67
        }
      },
      {
        id: 'partnerships',
        name: 'Partnerships',
        description: 'Build and manage business relationships',
        icon: 'users',
        color: 'green',
        order: 2,
        featured: true,
        metrics: {
          totalFeatures: 4,
          newFeatures: 1,
          popularFeatures: ['partnership-matching', 'consortium-builder'],
          adoptionRate: 0.54
        }
      },
      {
        id: 'compliance',
        name: 'Compliance',
        description: 'Ensure regulatory and policy compliance',
        icon: 'shield',
        color: 'blue',
        order: 3,
        featured: false,
        metrics: {
          totalFeatures: 3,
          newFeatures: 0,
          popularFeatures: ['compliance-checker'],
          adoptionRate: 0.43
        }
      },
      {
        id: 'visualization',
        name: 'Visualization',
        description: 'Visual tools for better understanding',
        icon: 'eye',
        color: 'orange',
        order: 4,
        featured: false,
        metrics: {
          totalFeatures: 3,
          newFeatures: 1,
          popularFeatures: ['visual-pipeline'],
          adoptionRate: 0.38
        }
      }
    ]
  }

  // Get all features
  getAllFeatures(): Feature[] {
    return Array.from(this.features.values())
  }

  // Get feature by ID
  getFeature(id: string): Feature | undefined {
    return this.features.get(id)
  }

  // Get features by category
  getFeaturesByCategory(categoryId: string): Feature[] {
    return Array.from(this.features.values()).filter(f => f.category === categoryId)
  }

  // Get success stories
  getSuccessStories(featureId?: string): SuccessStory[] {
    const stories: SuccessStory[] = [
      {
        id: 'story-1',
        featureId: 'ai-bid-assistant',
        content: {
          title: 'AI Bid Assistant Transformed Our Win Rate',
          summary: 'Northern Construction increased their bid win rate from 15% to 42% using AI assistance',
          fullStory: 'After struggling with complex government bids, Northern Construction adopted our AI Bid Assistant...',
          quote: 'The AI helped us write more compelling proposals and catch compliance issues we would have missed.'
        },
        subject: {
          name: 'Sarah Beargrease',
          company: 'Northern Construction Group',
          role: 'CEO',
          verified: true
        },
        impact: {
          timeSaved: '15 hours per bid',
          efficiencyGain: '180% faster writing',
          revenueImpact: '$2.3M additional contracts',
          satisfactionScore: 4.8
        },
        media: {
          images: ['/images/success-story-1.jpg'],
          screenshots: ['/images/ai-assistant-demo.png']
        }
      }
    ]
    
    return featureId ? stories.filter(s => s.featureId === featureId) : stories
  }

  // Get feature demo
  getFeatureDemo(featureId: string): FeatureDemo | undefined {
    const demos: Record<string, FeatureDemo> = {
      'ai-bid-assistant': {
        id: 'demo-ai-bid',
        featureId: 'ai-bid-assistant',
        type: 'interactive',
        duration: 300, // 5 minutes
        steps: [
          {
            id: 'step-1',
            title: 'Upload RFQ',
            description: 'Start by uploading the RFQ document',
            content: {
              instruction: 'Click the upload button and select your RFQ file',
              highlight: '#upload-button'
            },
            navigation: { previous: false, next: true, skip: true }
          },
          {
            id: 'step-2',
            title: 'AI Analysis',
            description: 'Watch as AI analyzes requirements',
            content: {
              instruction: 'The AI will extract key requirements automatically'
            },
            navigation: { previous: true, next: true, skip: true }
          },
          {
            id: 'step-3',
            title: 'Generate Response',
            description: 'AI creates your bid response',
            content: {
              instruction: 'Review and customize the AI-generated content'
            },
            navigation: { previous: true, next: false, skip: false }
          }
        ],
        environment: {
          data: 'mock',
          sandbox: true,
          resetAfter: true
        },
        analytics: {
          views: 1247,
          completions: 892,
          dropoffPoints: [15, 45, 78],
          averageTime: 4.2
        }
      }
    }
    
    return demos[featureId]
  }

  // Private helper methods
  
  private initializeFeatures(): void {
    const features: Feature[] = [
      {
        id: 'ai-bid-assistant',
        name: 'AI Bid Writing Assistant',
        description: 'AI-powered tool that helps write winning bids faster with intelligent suggestions',
        category: 'ai-powered',
        
        metadata: {
          version: '2.1.0',
          releaseDate: new Date('2024-01-15'),
          maturity: 'stable',
          complexity: 'simple',
          timeToValue: 15
        },
        
        requirements: {
          userTypes: ['indigenous_business', 'canadian_business'],
          permissions: ['bid:create', 'documents:upload'],
          prerequisites: [],
          subscriptionTier: 'professional'
        },
        
        value: {
          benefits: [
            {
              title: 'Write bids 70% faster',
              description: 'AI generates content based on RFQ requirements',
              impact: 'high',
              quantified: '15 hours saved per bid'
            },
            {
              title: 'Improve win rates',
              description: 'AI ensures compliance and compelling language',
              impact: 'high',
              quantified: '180% increase in win rate'
            }
          ],
          useCases: [
            {
              title: 'Government RFQ Response',
              description: 'Responding to complex government tenders',
              scenario: 'Upload RFQ, AI analyzes requirements, generates tailored response',
              outcome: 'Professional bid ready in minutes instead of days',
              difficulty: 'easy'
            }
          ],
          metrics: [
            { name: 'Time Saved', value: '15', unit: 'hours', context: 'per bid' },
            { name: 'Win Rate Increase', value: '180', unit: '%', context: 'average improvement' }
          ],
          testimonials: [
            {
              quote: 'This AI changed everything. We went from 15% to 42% win rate.',
              author: 'Sarah Beargrease',
              company: 'Northern Construction',
              verified: true
            }
          ]
        },
        
        discovery: {
          tagline: 'Write winning bids in minutes, not days',
          highlights: [
            'AI analyzes RFQ requirements automatically',
            'Generates compliant, compelling content',
            'Built-in Indigenous content optimization'
          ],
          screenshots: [
            '/images/ai-bid-assistant-1.png',
            '/images/ai-bid-assistant-2.png'
          ],
          videoUrl: '/videos/ai-bid-demo.mp4',
          demoUrl: '/demos/ai-bid-assistant',
          tutorialUrl: '/tutorials/ai-bid-writing'
        },
        
        engagement: {
          views: 2156,
          trials: 892,
          adoptions: 456,
          rating: 4.7,
          feedback: []
        }
      },
      
      {
        id: 'partnership-matching',
        name: 'AI Partnership Matching',
        description: 'Find perfect business partners using AI-powered compatibility analysis',
        category: 'partnerships',
        
        metadata: {
          version: '1.8.0',
          releaseDate: new Date('2024-02-01'),
          maturity: 'stable',
          complexity: 'moderate',
          timeToValue: 10
        },
        
        requirements: {
          userTypes: ['indigenous_business', 'canadian_business'],
          permissions: ['partnerships:create', 'profile:read'],
          prerequisites: ['complete-profile'],
          subscriptionTier: 'basic'
        },
        
        value: {
          benefits: [
            {
              title: 'Find compatible partners instantly',
              description: 'AI matches based on capabilities and culture',
              impact: 'high',
              quantified: '5x faster partner discovery'
            }
          ],
          useCases: [
            {
              title: 'Indigenous Content Requirements',
              description: 'Finding Indigenous partners for government contracts',
              scenario: 'Enter project needs, AI finds verified Indigenous businesses',
              outcome: 'Qualified partnerships formed in days',
              difficulty: 'easy'
            }
          ],
          metrics: [
            { name: 'Match Accuracy', value: '87', unit: '%', context: 'successful partnerships' }
          ],
          testimonials: []
        },
        
        discovery: {
          tagline: 'Build winning partnerships with AI precision',
          highlights: [
            'AI analyzes 50+ compatibility factors',
            'Verified Indigenous business network',
            'Cultural fit assessment included'
          ],
          screenshots: ['/images/partnership-matching.png'],
          demoUrl: '/demos/partnership-matching'
        },
        
        engagement: {
          views: 1834,
          trials: 645,
          adoptions: 298,
          rating: 4.5,
          feedback: []
        }
      },
      
      {
        id: 'compliance-checker',
        name: 'Automated Compliance Checker',
        description: 'Ensure your bids meet all requirements with AI-powered compliance verification',
        category: 'compliance',
        
        metadata: {
          version: '1.5.0',
          releaseDate: new Date('2024-01-20'),
          maturity: 'stable',
          complexity: 'simple',
          timeToValue: 5
        },
        
        requirements: {
          userTypes: ['indigenous_business', 'canadian_business'],
          permissions: ['compliance:check', 'documents:read'],
          prerequisites: [],
          subscriptionTier: 'basic'
        },
        
        value: {
          benefits: [
            {
              title: 'Prevent costly mistakes',
              description: 'Catch compliance issues before submission',
              impact: 'high',
              quantified: '95% error reduction'
            }
          ],
          useCases: [
            {
              title: 'Pre-submission Validation',
              description: 'Check bid compliance before submitting',
              scenario: 'Upload documents, AI verifies all requirements met',
              outcome: 'Confident submissions with zero rejections',
              difficulty: 'easy'
            }
          ],
          metrics: [
            { name: 'Error Reduction', value: '95', unit: '%', context: 'compliance mistakes caught' }
          ],
          testimonials: []
        },
        
        discovery: {
          tagline: 'Never miss a requirement again',
          highlights: [
            'Scans all documents automatically',
            'Indigenous content verification',
            'Real-time compliance scoring'
          ],
          screenshots: ['/images/compliance-checker.png']
        },
        
        engagement: {
          views: 1456,
          trials: 567,
          adoptions: 389,
          rating: 4.6,
          feedback: []
        }
      },
      
      {
        id: 'visual-pipeline',
        name: 'Visual Pipeline Tracker',
        description: 'Track all your opportunities and bids in an intuitive visual pipeline',
        category: 'visualization',
        
        metadata: {
          version: '2.0.0',
          releaseDate: new Date('2024-02-10'),
          maturity: 'stable',
          complexity: 'simple',
          timeToValue: 3
        },
        
        requirements: {
          userTypes: ['indigenous_business', 'canadian_business'],
          permissions: ['pipeline:read', 'opportunities:read'],
          prerequisites: [],
          subscriptionTier: 'basic'
        },
        
        value: {
          benefits: [
            {
              title: 'Never lose track of opportunities',
              description: 'Visual overview of all active pursuits',
              impact: 'medium',
              quantified: '40% better opportunity management'
            }
          ],
          useCases: [
            {
              title: 'Opportunity Management',
              description: 'Track RFQs from discovery to award',
              scenario: 'Visual kanban board with drag-drop functionality',
              outcome: 'Clear visibility into pipeline health',
              difficulty: 'easy'
            }
          ],
          metrics: [
            { name: 'Tracking Improvement', value: '40', unit: '%', context: 'better opportunity management' }
          ],
          testimonials: []
        },
        
        discovery: {
          tagline: 'See your entire pipeline at a glance',
          highlights: [
            'Drag-and-drop kanban interface',
            'Automated status updates',
            'Deadline and milestone tracking'
          ],
          screenshots: ['/images/visual-pipeline.png']
        },
        
        engagement: {
          views: 1234,
          trials: 456,
          adoptions: 234,
          rating: 4.3,
          feedback: []
        }
      },
      
      {
        id: 'opportunity-matching',
        name: 'Automatic Opportunity Matching',
        description: 'AI automatically finds and matches relevant RFQs to your business',
        category: 'ai-powered',
        
        metadata: {
          version: '1.3.0',
          releaseDate: new Date('2024-02-15'),
          maturity: 'stable',
          complexity: 'moderate',
          timeToValue: 20
        },
        
        requirements: {
          userTypes: ['indigenous_business', 'canadian_business'],
          permissions: ['opportunities:read', 'profile:read'],
          prerequisites: ['complete-profile'],
          subscriptionTier: 'professional'
        },
        
        value: {
          benefits: [
            {
              title: 'Never miss an opportunity',
              description: 'AI monitors all procurement sites 24/7',
              impact: 'high',
              quantified: '300% more opportunities found'
            }
          ],
          useCases: [
            {
              title: 'Automated RFQ Discovery',
              description: 'AI finds matching opportunities across all sites',
              scenario: 'Set preferences, AI monitors and alerts on matches',
              outcome: 'Constant flow of relevant opportunities',
              difficulty: 'moderate'
            }
          ],
          metrics: [
            { name: 'Opportunity Discovery', value: '300', unit: '%', context: 'more opportunities found' }
          ],
          testimonials: []
        },
        
        discovery: {
          tagline: 'Your AI-powered opportunity hunter',
          highlights: [
            'Monitors 15+ procurement sites',
            'Smart matching algorithms',
            'Real-time notifications'
          ],
          screenshots: ['/images/opportunity-matching.png']
        },
        
        engagement: {
          views: 987,
          trials: 234,
          adoptions: 123,
          rating: 4.8,
          feedback: []
        }
      },
      
      {
        id: 'predictive-analytics',
        name: 'Predictive Success Analytics',
        description: 'AI predicts your bid success probability and suggests improvements',
        category: 'ai-powered',
        
        metadata: {
          version: '1.1.0',
          releaseDate: new Date('2024-01-25'),
          maturity: 'beta',
          complexity: 'advanced',
          timeToValue: 30
        },
        
        requirements: {
          userTypes: ['indigenous_business', 'canadian_business'],
          permissions: ['analytics:read', 'bids:read'],
          prerequisites: ['historical-data'],
          subscriptionTier: 'enterprise'
        },
        
        value: {
          benefits: [
            {
              title: 'Predict bid success',
              description: 'Know your chances before you submit',
              impact: 'high',
              quantified: '25% higher win rates'
            }
          ],
          useCases: [
            {
              title: 'Bid Optimization',
              description: 'Improve bids before submission using AI insights',
              scenario: 'Upload draft bid, get success prediction and improvement tips',
              outcome: 'Data-driven bid optimization',
              difficulty: 'advanced'
            }
          ],
          metrics: [
            { name: 'Win Rate Improvement', value: '25', unit: '%', context: 'with AI insights' }
          ],
          testimonials: []
        },
        
        discovery: {
          tagline: 'Know your odds before you bid',
          highlights: [
            'ML-powered success prediction',
            'Competitive analysis',
            'Improvement recommendations'
          ],
          screenshots: ['/images/predictive-analytics.png']
        },
        
        engagement: {
          views: 567,
          trials: 89,
          adoptions: 34,
          rating: 4.9,
          feedback: []
        }
      }
    ]
    
    features.forEach(feature => {
      this.features.set(feature.id, feature)
    })
  }

  private createDiscoveryPath(recommendations: FeatureRecommendation[], userProfile: UserProfile): unknown[] {
    return recommendations.map((rec, index) => ({
      step: index + 1,
      feature: rec.feature,
      reason: rec.reasoning.personalizedMessage,
      timeEstimate: rec.impact.timeToValue,
      dependencies: rec.impact.prerequisites.map(p => p.requirement)
    }))
  }

  private getGamificationState(userId: string): GamificationState {
    if (!this.gamificationStates.has(userId)) {
      this.gamificationStates.set(userId, {
        points: 150,
        level: 2,
        badges: ['first-feature', 'explorer'],
        streak: 3,
        achievements: [
          {
            id: 'first-feature',
            name: 'First Steps',
            description: 'Tried your first feature',
            icon: 'star',
            unlockedAt: new Date('2024-02-01'),
            category: 'discovery'
          }
        ]
      })
    }
    
    return this.gamificationStates.get(userId)!
  }

  private updateGamification(userId: string, interaction: FeatureInteraction): void {
    const state = this.getGamificationState(userId)
    
    // Award points based on interaction type
    const pointsAwarded = {
      'view': 5,
      'preview': 10,
      'demo': 20,
      'trial': 50,
      'adopt': 100
    }
    
    state.points += pointsAwarded[interaction.type] || 0
    
    // Check for level up
    const newLevel = Math.floor(state.points / 100) + 1
    if (newLevel > state.level) {
      state.level = newLevel
      // Award level up badge
    }
    
    // Check for new achievements
    this.checkAchievements(userId, interaction)
  }

  private checkAchievements(userId: string, interaction: FeatureInteraction): void {
    const state = this.getGamificationState(userId)
    
    // Feature Explorer achievement
    if (interaction.type === 'trial' && !state.achievements.find(a => a.id === 'feature-explorer')) {
      state.achievements.push({
        id: 'feature-explorer',
        name: 'Feature Explorer',
        description: 'Tried 3 different features',
        icon: 'compass',
        unlockedAt: new Date(),
        category: 'discovery'
      })
    }
  }

  private storeInteraction(interaction: FeatureInteraction): void {
    // In production, store in database for analytics
    logger.info('Feature interaction tracked:', interaction)
  }
}