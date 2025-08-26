// Context-Aware Help System Types

export interface ContextualHelp {
  // Core help engine
  engine: {
    // Analyze current context
    analyzeContext: (context: UserContext) => HelpContext
    
    // Get relevant help
    getHelp: (helpContext: HelpContext) => HelpContent
    
    // Track user behavior
    trackInteraction: (interaction: HelpInteraction) => void
    
    // Learn from usage
    improveRecommendations: (feedback: HelpFeedback) => void
  }
  
  // Help delivery methods
  delivery: {
    // Inline tooltips
    tooltip: TooltipHelp
    
    // Guided tours
    tour: GuidedTour
    
    // Interactive tutorials
    tutorial: InteractiveTutorial
    
    // Smart suggestions
    suggestions: SmartSuggestions
    
    // Video guides
    video: VideoHelp
    
    // Chat assistant
    assistant: HelpAssistant
  }
  
  // Help content types
  content: {
    // Step-by-step guides
    guides: HelpGuide[]
    
    // FAQ database
    faqs: FAQ[]
    
    // Best practices
    bestPractices: BestPractice[]
    
    // Common mistakes
    commonMistakes: CommonMistake[]
    
    // Tips & tricks
    tips: Tip[]
  }
}

export interface UserContext {
  // Current location
  page: string
  component: string
  action?: string
  
  // User profile
  user: {
    id: string
    type: 'indigenous_business' | 'canadian_business' | 'government' | 'admin'
    experience: 'beginner' | 'intermediate' | 'expert'
    role: string
    preferences: UserPreferences
  }
  
  // Current task
  task?: {
    type: string
    stage: string
    progress: number
    blockers?: string[]
  }
  
  // Session data
  session: {
    duration: number
    actionsCount: number
    errorsCount: number
    previousPages: string[]
  }
  
  // Feature usage
  features: {
    used: string[]
    unused: string[]
    frequently: string[]
  }
  
  // Environmental context
  environment: {
    device: 'desktop' | 'tablet' | 'mobile'
    browser: string
    screenSize: string
    connection: 'fast' | 'slow' | 'offline'
  }
}

export interface HelpContext {
  // What the user is trying to do
  intent: UserIntent
  
  // Relevant help topics
  topics: HelpTopic[]
  
  // User's skill level for this task
  skillLevel: 'novice' | 'intermediate' | 'advanced'
  
  // Urgency of help needed
  urgency: 'low' | 'medium' | 'high' | 'critical'
  
  // Related features
  relatedFeatures: string[]
  
  // Common issues
  commonIssues: Issue[]
  
  // Suggested next steps
  nextSteps: NextStep[]
}

export interface UserIntent {
  primary: string
  secondary?: string[]
  confidence: number
  
  // Specific intents
  intents: {
    learning?: boolean // New to feature
    troubleshooting?: boolean // Something went wrong
    optimizing?: boolean // Wants to work faster
    exploring?: boolean // Discovering features
    completing?: boolean // Finishing a task
  }
}

export interface HelpContent {
  // Primary help
  primary: {
    title: string
    content: string
    type: 'text' | 'video' | 'interactive' | 'tour'
    estimatedTime?: number
    difficulty?: 'easy' | 'medium' | 'hard'
  }
  
  // Additional resources
  related: RelatedResource[]
  
  // Quick actions
  actions: QuickAction[]
  
  // Contact options
  contact?: ContactOption[]
  
  // Feedback mechanism
  feedback: FeedbackOption
}

// Tooltip Help System
export interface TooltipHelp {
  // Smart tooltips that appear on hover/focus
  show: (element: HTMLElement, context: UserContext) => Tooltip
  
  // Types of tooltips
  types: {
    definition: DefinitionTooltip
    instruction: InstructionTooltip
    warning: WarningTooltip
    tip: TipTooltip
    shortcut: ShortcutTooltip
  }
  
  // Tooltip behavior
  behavior: {
    delay: number
    position: 'top' | 'bottom' | 'left' | 'right' | 'auto'
    trigger: 'hover' | 'focus' | 'click' | 'auto'
    persist: boolean
  }
}

export interface Tooltip {
  id: string
  content: string
  type: 'info' | 'warning' | 'tip' | 'error'
  
  // Rich content
  media?: {
    image?: string
    video?: string
    gif?: string
  }
  
  // Actions
  actions?: {
    primary?: TooltipAction
    secondary?: TooltipAction[]
  }
  
  // Don't show again option
  dismissible: boolean
  neverShowAgain?: boolean
}

// Guided Tour System
export interface GuidedTour {
  // Available tours
  tours: {
    welcome: Tour // First time user
    feature: Tour // New feature introduction
    workflow: Tour // Complete workflow
    tips: Tour // Power user tips
  }
  
  // Tour management
  start: (tourId: string, context: UserContext) => TourInstance
  pause: (tourId: string) => void
  resume: (tourId: string) => void
  skip: (tourId: string) => void
  
  // Progress tracking
  progress: TourProgress
}

export interface Tour {
  id: string
  name: string
  description: string
  
  // Tour steps
  steps: TourStep[]
  
  // Tour settings
  settings: {
    skippable: boolean
    resumable: boolean
    interactive: boolean
    estimated_time: number
  }
  
  // Completion rewards
  rewards?: {
    badge?: string
    points?: number
    unlock?: string[]
  }
}

export interface TourStep {
  id: string
  title: string
  content: string
  
  // Target element
  target?: {
    selector: string
    highlight: boolean
    dim_background: boolean
  }
  
  // Step content
  media?: {
    image?: string
    video?: string
    animation?: string
  }
  
  // User actions
  action?: {
    type: 'click' | 'input' | 'select' | 'drag' | 'scroll'
    validation?: (value: unknown) => boolean
  }
  
  // Navigation
  navigation: {
    next: boolean
    previous: boolean
    skip: boolean
  }
  
  // Position
  position: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto'
}

// Interactive Tutorial System
export interface InteractiveTutorial {
  // Tutorial types
  types: {
    sandbox: SandboxTutorial // Safe environment to practice
    scenario: ScenarioTutorial // Real-world scenarios
    challenge: ChallengeTutorial // Test skills
    certification: CertificationTutorial // Earn certificates
  }
  
  // Tutorial engine
  engine: {
    load: (tutorialId: string) => TutorialInstance
    validate: (action: UserAction) => ValidationResult
    provide_hint: () => Hint
    complete: () => CompletionResult
  }
}

export interface SandboxTutorial {
  id: string
  name: string
  
  // Safe environment setup
  environment: {
    data: 'mock' | 'anonymized' | 'sample'
    features: string[]
    restrictions: string[]
  }
  
  // Learning objectives
  objectives: LearningObjective[]
  
  // Practice exercises
  exercises: Exercise[]
}

// Smart Suggestions System
export interface SmartSuggestions {
  // Proactive help based on behavior
  suggest: (context: UserContext) => Suggestion[]
  
  // Suggestion types
  types: {
    next_step: NextStepSuggestion
    shortcut: ShortcutSuggestion
    optimization: OptimizationSuggestion
    feature: FeatureSuggestion
    correction: CorrectionSuggestion
  }
  
  // ML-powered recommendations
  ml: {
    predict_need: (behavior: UserBehavior) => PredictedNeed
    personalize: (userId: string) => PersonalizedHelp
    improve: (feedback: SuggestionFeedback) => void
  }
}

export interface Suggestion {
  id: string
  type: 'next_step' | 'shortcut' | 'optimization' | 'feature' | 'correction'
  
  // Suggestion content
  title: string
  description: string
  
  // Why this suggestion
  reason: string
  confidence: number
  
  // Action to take
  action: {
    type: 'navigate' | 'execute' | 'learn' | 'enable'
    payload: unknown
  }
  
  // Timing
  timing: 'immediate' | 'after_action' | 'idle' | 'scheduled'
}

// Video Help System
export interface VideoHelp {
  // Video library
  library: {
    categories: VideoCategory[]
    search: (query: string) => Video[]
    recommend: (context: UserContext) => Video[]
  }
  
  // Video player
  player: {
    play: (videoId: string) => VideoPlayer
    bookmark: (timestamp: number) => void
    annotate: (note: string, timestamp: number) => void
    share: (videoId: string, timestamp?: number) => ShareLink
  }
  
  // Interactive features
  interactive: {
    chapters: VideoChapter[]
    transcripts: Transcript
    captions: Caption[]
    hotspots: InteractiveHotspot[]
  }
}

export interface Video {
  id: string
  title: string
  description: string
  duration: number
  
  // Video metadata
  metadata: {
    category: string
    tags: string[]
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    language: string
    subtitles: string[]
  }
  
  // Engagement
  engagement: {
    views: number
    likes: number
    completion_rate: number
    avg_watch_time: number
  }
  
  // Related content
  related: {
    videos: string[]
    articles: string[]
    tutorials: string[]
  }
}

// Help Assistant (Chatbot)
export interface HelpAssistant {
  // Conversation management
  conversation: {
    start: (context: UserContext) => Conversation
    continue: (conversationId: string, message: string) => Response
    end: (conversationId: string) => void
  }
  
  // Assistant capabilities
  capabilities: {
    answer_questions: boolean
    guide_through_tasks: boolean
    troubleshoot_issues: boolean
    provide_recommendations: boolean
    escalate_to_human: boolean
  }
  
  // AI features
  ai: {
    natural_language: boolean
    context_aware: boolean
    learning: boolean
    multilingual: boolean
    sentiment_analysis: boolean
  }
}

export interface Conversation {
  id: string
  startTime: Date
  
  // Conversation state
  state: {
    topic: string
    mood: 'positive' | 'neutral' | 'frustrated'
    progress: number
    resolved: boolean
  }
  
  // Message history
  messages: Message[]
  
  // Context
  context: {
    page: string
    task?: string
    previous_interactions: string[]
  }
}

// Help Interaction Tracking
export interface HelpInteraction {
  userId: string
  timestamp: Date
  
  // Interaction details
  type: 'view' | 'click' | 'complete' | 'dismiss' | 'feedback'
  helpType: 'tooltip' | 'tour' | 'tutorial' | 'video' | 'assistant'
  helpId: string
  
  // Context
  context: UserContext
  
  // Outcome
  outcome: {
    helpful: boolean | null
    completed: boolean
    time_spent: number
    actions_taken: string[]
  }
}

// Feedback System
export interface HelpFeedback {
  // Feedback collection
  collect: {
    rating: (score: number) => void
    comment: (text: string) => void
    suggestion: (text: string) => void
    report_issue: (issue: Issue) => void
  }
  
  // Feedback analysis
  analyze: {
    sentiment: (feedback: string) => Sentiment
    categorize: (feedback: string) => FeedbackCategory
    prioritize: (feedbacks: Feedback[]) => PrioritizedFeedback[]
  }
}

// Supporting Types
export interface UserPreferences {
  help_level: 'minimal' | 'standard' | 'detailed'
  show_tips: boolean
  auto_tours: boolean
  video_quality: 'auto' | 'high' | 'medium' | 'low'
  language: string
  accessibility: AccessibilityPreferences
}

export interface AccessibilityPreferences {
  high_contrast: boolean
  large_text: boolean
  screen_reader: boolean
  keyboard_navigation: boolean
  reduced_motion: boolean
}

export interface HelpTopic {
  id: string
  title: string
  category: string
  relevance: number
  content_types: ('text' | 'video' | 'interactive')[]
}

export interface Issue {
  type: string
  description: string
  frequency: 'rare' | 'occasional' | 'common' | 'very_common'
  solution: string
}

export interface NextStep {
  action: string
  description: string
  importance: 'optional' | 'recommended' | 'required'
  help_available: boolean
}

export interface RelatedResource {
  type: 'article' | 'video' | 'tutorial' | 'faq' | 'contact'
  title: string
  url: string
  estimated_time?: number
}

export interface QuickAction {
  label: string
  action: () => void
  icon?: string
  keyboard_shortcut?: string
}

export interface ContactOption {
  type: 'chat' | 'email' | 'phone' | 'community'
  availability: 'immediate' | 'business_hours' | 'async'
  estimated_response: string
}

export interface FeedbackOption {
  type: 'rating' | 'thumbs' | 'detailed'
  required: boolean
  incentive?: string
}