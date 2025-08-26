// Feature Discovery UI Types

export interface FeatureDiscovery {
  // Core discovery engine
  engine: {
    // Analyze user's feature usage
    analyzeUsage: (userId: string) => FeatureUsageAnalysis
    
    // Recommend features based on behavior
    recommendFeatures: (analysis: FeatureUsageAnalysis) => FeatureRecommendation[]
    
    // Personalize discovery experience
    personalizeExperience: (userProfile: UserProfile) => PersonalizedDiscovery
    
    // Track feature engagement
    trackEngagement: (interaction: FeatureInteraction) => void
  }
  
  // Discovery presentation modes
  presentation: {
    // Interactive feature gallery
    gallery: FeatureGallery
    
    // Contextual feature hints
    hints: ContextualHints
    
    // Feature spotlight
    spotlight: FeatureSpotlight
    
    // Progressive disclosure
    progressive: ProgressiveDisclosure
    
    // Gamified discovery
    gamified: GamifiedDiscovery
  }
  
  // Feature content management
  content: {
    // Feature definitions
    features: Feature[]
    
    // Feature categories
    categories: FeatureCategory[]
    
    // Interactive demos
    demos: FeatureDemo[]
    
    // Success stories
    stories: SuccessStory[]
  }
}

// Core Feature Types
export interface Feature {
  id: string
  name: string
  description: string
  category: string
  
  // Feature metadata
  metadata: {
    version: string
    releaseDate: Date
    maturity: 'beta' | 'stable' | 'mature'
    complexity: 'simple' | 'moderate' | 'advanced'
    timeToValue: number // minutes to see value
  }
  
  // Usage requirements
  requirements: {
    userTypes: ('indigenous_business' | 'canadian_business' | 'government' | 'admin')[]
    permissions: string[]
    prerequisites: string[] // Other features needed first
    subscriptionTier?: 'basic' | 'professional' | 'enterprise'
  }
  
  // Value proposition
  value: {
    benefits: Benefit[]
    useCases: UseCase[]
    metrics: ValueMetric[]
    testimonials: Testimonial[]
  }
  
  // Discovery content
  discovery: {
    tagline: string
    highlights: string[]
    screenshots: string[]
    videoUrl?: string
    demoUrl?: string
    tutorialUrl?: string
  }
  
  // Engagement tracking
  engagement: {
    views: number
    trials: number
    adoptions: number
    rating: number
    feedback: FeatureFeedback[]
  }
}

export interface FeatureCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  
  // Category organization
  order: number
  featured: boolean
  
  // Category metrics
  metrics: {
    totalFeatures: number
    newFeatures: number
    popularFeatures: string[]
    adoptionRate: number
  }
}

export interface FeatureUsageAnalysis {
  userId: string
  analysisDate: Date
  
  // Usage patterns
  usage: {
    activeFeatures: string[]
    inactiveFeatures: string[]
    recentlyUsed: string[]
    frequentlyUsed: string[]
    strugglingWith: string[]
  }
  
  // User characteristics
  profile: {
    experience: 'novice' | 'intermediate' | 'expert'
    role: string
    primaryGoals: string[]
    timeSpent: number
    completedOnboarding: boolean
  }
  
  // Behavioral insights
  behavior: {
    explorationRate: number
    featureStickiness: number
    helpSeeking: number
    experimentationLevel: 'low' | 'medium' | 'high'
  }
  
  // Recommendations context
  context: {
    currentWorkflow: string
    recentActions: string[]
    blockers: string[]
    opportunities: string[]
  }
}

export interface FeatureRecommendation {
  feature: Feature
  
  // Recommendation strength
  score: number
  confidence: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  
  // Recommendation reasoning
  reasoning: {
    primaryReason: RecommendationReason
    supportingReasons: RecommendationReason[]
    personalizedMessage: string
  }
  
  // Expected impact
  impact: {
    timeToValue: number
    valueScore: number
    effortRequired: 'low' | 'medium' | 'high'
    prerequisites: PrerequisiteCheck[]
  }
  
  // Call to action
  cta: {
    primary: CallToAction
    secondary?: CallToAction[]
    urgency: 'none' | 'low' | 'medium' | 'high'
  }
}

export interface RecommendationReason {
  type: 'workflow_enhancement' | 'gap_filling' | 'efficiency_boost' | 'trend_based' | 'peer_usage'
  description: string
  evidence: string[]
  weight: number
}

// Discovery Presentation Types
export interface FeatureGallery {
  // Gallery organization
  layout: 'grid' | 'carousel' | 'masonry' | 'timeline'
  
  // Filtering and sorting
  filters: {
    categories: string[]
    complexity: string[]
    userType: string[]
    status: string[]
  }
  
  sorting: {
    options: ('popularity' | 'newest' | 'relevance' | 'alphabetical')[]
    default: string
  }
  
  // Gallery content
  items: FeatureGalleryItem[]
  
  // Interactive features
  interactions: {
    quickPreview: boolean
    inlineDemo: boolean
    favoriting: boolean
    sharing: boolean
  }
}

export interface FeatureGalleryItem {
  feature: Feature
  
  // Visual presentation
  visual: {
    thumbnail: string
    badge?: string
    status: 'new' | 'updated' | 'popular' | 'trending'
  }
  
  // Quick info
  summary: {
    oneLinePitch: string
    keyBenefits: string[]
    quickStats: string[]
  }
  
  // Actions
  actions: {
    try: CallToAction
    learn: CallToAction
    bookmark: CallToAction
  }
}

export interface ContextualHints {
  // Hint types
  types: {
    tooltip: FeatureTooltip
    popover: FeaturePopover
    inline: InlineHint
    overlay: OverlayHint
  }
  
  // Trigger conditions
  triggers: {
    workflow: WorkflowTrigger[]
    location: LocationTrigger[]
    behavior: BehaviorTrigger[]
    time: TimeTrigger[]
  }
  
  // Hint management
  management: {
    frequency: 'once' | 'periodic' | 'contextual'
    dismissible: boolean
    snooze: boolean
    neverShow: boolean
  }
}

export interface FeatureSpotlight {
  // Spotlight content
  content: {
    title: string
    subtitle: string
    description: string
    media: SpotlightMedia
  }
  
  // Targeting
  targeting: {
    audience: string[]
    conditions: string[]
    schedule: SpotlightSchedule
  }
  
  // Presentation
  presentation: {
    style: 'modal' | 'banner' | 'slide-in' | 'full-screen'
    duration: number
    dismissible: boolean
  }
  
  // Call to action
  actions: CallToAction[]
}

export interface ProgressiveDisclosure {
  // Disclosure levels
  levels: {
    basic: FeatureInfo
    intermediate: FeatureInfo
    advanced: FeatureInfo
  }
  
  // Progression rules
  progression: {
    triggers: ProgressionTrigger[]
    requirements: ProgressionRequirement[]
    rewards: ProgressionReward[]
  }
  
  // Adaptive content
  adaptive: {
    personalizedPath: boolean
    skipBasics: boolean
    focusAreas: string[]
  }
}

export interface GamifiedDiscovery {
  // Gamification elements
  elements: {
    points: PointSystem
    badges: BadgeSystem
    levels: LevelSystem
    challenges: ChallengeSystem
    leaderboards: LeaderboardSystem
  }
  
  // Discovery missions
  missions: {
    daily: Mission[]
    weekly: Mission[]
    milestone: Mission[]
    exploration: Mission[]
  }
  
  // Rewards
  rewards: {
    discovery: DiscoveryReward[]
    completion: CompletionReward[]
    mastery: MasteryReward[]
  }
}

// Demo and Preview Types
export interface FeatureDemo {
  id: string
  featureId: string
  
  // Demo content
  type: 'interactive' | 'video' | 'guided' | 'sandbox'
  duration: number
  
  // Demo steps
  steps: DemoStep[]
  
  // Demo environment
  environment: {
    data: 'mock' | 'sample' | 'user'
    sandbox: boolean
    resetAfter: boolean
  }
  
  // Tracking
  analytics: {
    views: number
    completions: number
    dropoffPoints: number[]
    averageTime: number
  }
}

export interface DemoStep {
  id: string
  title: string
  description: string
  
  // Step content
  content: {
    instruction: string
    highlight?: string
    interaction?: DemoInteraction
  }
  
  // Navigation
  navigation: {
    previous: boolean
    next: boolean
    skip: boolean
  }
  
  // Validation
  validation?: {
    required: boolean
    checker: (state: Record<string, unknown>) => boolean
    hint: string
  }
}

export interface DemoInteraction {
  type: 'click' | 'input' | 'hover' | 'scroll' | 'wait'
  target?: string
  value?: any
  timeout?: number
}

// Success Stories and Social Proof
export interface SuccessStory {
  id: string
  featureId: string
  
  // Story content
  content: {
    title: string
    summary: string
    fullStory: string
    quote: string
  }
  
  // Story subject
  subject: {
    name: string
    company: string
    role: string
    avatar?: string
    verified: boolean
  }
  
  // Impact metrics
  impact: {
    timeSaved: string
    efficiencyGain: string
    revenueImpact: string
    satisfactionScore: number
  }
  
  // Media
  media: {
    images: string[]
    video?: string
    screenshots: string[]
  }
}

// User Interaction Tracking
export interface FeatureInteraction {
  userId: string
  featureId: string
  timestamp: Date
  
  // Interaction details
  type: 'view' | 'preview' | 'demo' | 'trial' | 'adopt' | 'abandon'
  source: 'gallery' | 'hint' | 'spotlight' | 'recommendation' | 'search'
  
  // Context
  context: {
    page: string
    workflow?: string
    session: string
  }
  
  // Outcome
  outcome: {
    duration: number
    completed: boolean
    nextAction?: string
    feedback?: FeatureFeedback
  }
}

export interface FeatureFeedback {
  rating: number
  comment?: string
  helpful: boolean
  suggestions: string[]
  wouldRecommend: boolean
}

// Supporting Types
export interface UserProfile {
  id: string
  type: 'indigenous_business' | 'canadian_business' | 'government' | 'admin'
  experience: 'novice' | 'intermediate' | 'expert'
  role: string
  goals: string[]
  preferences: DiscoveryPreferences
}

export interface DiscoveryPreferences {
  showHints: boolean
  gamification: boolean
  emailNotifications: boolean
  frequency: 'low' | 'medium' | 'high'
  categories: string[]
}

export interface Benefit {
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  quantified?: string
}

export interface UseCase {
  title: string
  description: string
  scenario: string
  outcome: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface ValueMetric {
  name: string
  value: string
  unit: string
  context: string
}

export interface Testimonial {
  quote: string
  author: string
  company: string
  verified: boolean
}

export interface CallToAction {
  label: string
  action: 'navigate' | 'demo' | 'trial' | 'learn' | 'bookmark'
  target: string
  style: 'primary' | 'secondary' | 'text'
}

export interface PrerequisiteCheck {
  requirement: string
  met: boolean
  action?: string
}

export interface PersonalizedDiscovery {
  userId: string
  recommendations: FeatureRecommendation[]
  discoveryPath: DiscoveryPath[]
  gamification: GamificationState
  preferences: DiscoveryPreferences
}

export interface DiscoveryPath {
  step: number
  feature: Feature
  reason: string
  timeEstimate: number
  dependencies: string[]
}

export interface GamificationState {
  points: number
  level: number
  badges: string[]
  streak: number
  achievements: Achievement[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: Date
  category: string
}