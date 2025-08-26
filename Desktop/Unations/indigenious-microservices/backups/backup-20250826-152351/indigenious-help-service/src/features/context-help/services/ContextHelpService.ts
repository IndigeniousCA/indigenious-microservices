// Context-Aware Help Service
import { 
  UserContext, HelpContext, HelpContent, UserIntent,
  Tooltip, Tour, Suggestion, Video, Conversation,
  HelpInteraction, HelpFeedback, Issue, NextStep
} from '../types'

import { logger } from '@/lib/monitoring/logger';
export class ContextHelpService {
  private userHistory: Map<string, HelpInteraction[]> = new Map()
  private activeTooltips: Map<string, Tooltip> = new Map()
  private activeTours: Map<string, Tour> = new Map()
  private mlModel: HelpMLModel
  
  constructor() {
    this.mlModel = new HelpMLModel()
  }

  // Analyze user context to determine help needs
  analyzeContext(context: UserContext): HelpContext {
    // Determine user intent based on behavior
    const intent = this.detectUserIntent(context)
    
    // Get relevant help topics
    const topics = this.getRelevantTopics(context, intent)
    
    // Assess skill level
    const skillLevel = this.assessSkillLevel(context)
    
    // Determine urgency
    const urgency = this.calculateUrgency(context)
    
    // Find related features
    const relatedFeatures = this.findRelatedFeatures(context)
    
    // Identify common issues
    const commonIssues = this.getCommonIssues(context)
    
    // Suggest next steps
    const nextSteps = this.suggestNextSteps(context, intent)
    
    return {
      intent,
      topics,
      skillLevel,
      urgency,
      relatedFeatures,
      commonIssues,
      nextSteps
    }
  }

  // Get contextual help content
  getHelp(helpContext: HelpContext): HelpContent {
    // Select primary help based on context
    const primary = this.selectPrimaryHelp(helpContext)
    
    // Find related resources
    const related = this.findRelatedResources(helpContext)
    
    // Generate quick actions
    const actions = this.generateQuickActions(helpContext)
    
    // Determine contact options
    const contact = this.getContactOptions(helpContext.urgency)
    
    // Create feedback mechanism
    const feedback = this.createFeedbackOption(helpContext)
    
    return {
      primary,
      related,
      actions,
      contact,
      feedback
    }
  }

  // Show contextual tooltip
  showTooltip(element: HTMLElement, context: UserContext): Tooltip {
    const elementId = element.getAttribute('data-help-id') || element.id || 'unknown'
    
    // Check if tooltip already exists
    if (this.activeTooltips.has(elementId)) {
      return this.activeTooltips.get(elementId)!
    }
    
    // Generate tooltip content based on context
    const tooltip = this.generateTooltip(element, context)
    
    // Store active tooltip
    this.activeTooltips.set(elementId, tooltip)
    
    // Track interaction
    this.trackInteraction({
      userId: context.user.id,
      timestamp: new Date(),
      type: 'view',
      helpType: 'tooltip',
      helpId: tooltip.id,
      context,
      outcome: {
        helpful: null,
        completed: false,
        time_spent: 0,
        actions_taken: []
      }
    })
    
    return tooltip
  }

  // Start guided tour
  startTour(tourId: string, context: UserContext): Tour {
    const tour = this.getTour(tourId, context)
    
    // Personalize tour based on user
    const personalizedTour = this.personalizeTour(tour, context)
    
    // Store active tour
    this.activeTours.set(tourId, personalizedTour)
    
    // Track tour start
    this.trackInteraction({
      userId: context.user.id,
      timestamp: new Date(),
      type: 'view',
      helpType: 'tour',
      helpId: tourId,
      context,
      outcome: {
        helpful: null,
        completed: false,
        time_spent: 0,
        actions_taken: ['start']
      }
    })
    
    return personalizedTour
  }

  // Generate smart suggestions
  async generateSuggestions(context: UserContext): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = []
    
    // Next step suggestions
    if (context.task) {
      const nextStepSuggestion = this.suggestNextTaskStep(context)
      if (nextStepSuggestion) suggestions.push(nextStepSuggestion)
    }
    
    // Shortcut suggestions
    const shortcuts = this.suggestShortcuts(context)
    suggestions.push(...shortcuts)
    
    // Optimization suggestions
    if (context.session.actionsCount > 10) {
      const optimizations = this.suggestOptimizations(context)
      suggestions.push(...optimizations)
    }
    
    // Feature discovery
    const unusedFeatures = this.suggestUnusedFeatures(context)
    suggestions.push(...unusedFeatures)
    
    // Error corrections
    if (context.session.errorsCount > 0) {
      const corrections = this.suggestCorrections(context)
      suggestions.push(...corrections)
    }
    
    // Sort by relevance and confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
  }

  // AI-powered help chat
  async startHelpChat(context: UserContext): Promise<Conversation> {
    const conversation: Conversation = {
      id: `conv-${Date.now()}`,
      startTime: new Date(),
      state: {
        topic: this.detectTopic(context),
        mood: 'neutral',
        progress: 0,
        resolved: false
      },
      messages: [
        {
          id: '1',
          sender: 'assistant',
          content: this.generateGreeting(context),
          timestamp: new Date()
        }
      ],
      context: {
        page: context.page,
        task: context.task?.type,
        previous_interactions: this.getPreviousInteractions(context.user.id)
      }
    }
    
    return conversation
  }

  // Continue chat conversation
  async continueChat(conversationId: string, message: string): Promise<unknown> {
    // In production, this would use AI/NLP
    const response = await this.generateChatResponse(conversationId, message)
    return response
  }

  // Private helper methods
  
  private detectUserIntent(context: UserContext): UserIntent {
    const intent: UserIntent = {
      primary: 'unknown',
      confidence: 0,
      intents: {
        learning: false,
        troubleshooting: false,
        optimizing: false,
        exploring: false,
        completing: false
      }
    }
    
    // New user or new feature
    if (context.user.experience === 'beginner' || context.features.unused.length > 0) {
      intent.primary = 'learning'
      intent.intents.learning = true
      intent.confidence = 0.85
    }
    
    // High error rate indicates troubleshooting
    else if (context.session.errorsCount > 2) {
      intent.primary = 'troubleshooting'
      intent.intents.troubleshooting = true
      intent.confidence = 0.90
    }
    
    // Many actions indicate optimization desire
    else if (context.session.actionsCount > 20) {
      intent.primary = 'optimizing'
      intent.intents.optimizing = true
      intent.confidence = 0.75
    }
    
    // Task in progress
    else if (context.task && context.task.progress < 100) {
      intent.primary = 'completing'
      intent.intents.completing = true
      intent.confidence = 0.80
    }
    
    // Default to exploring
    else {
      intent.primary = 'exploring'
      intent.intents.exploring = true
      intent.confidence = 0.60
    }
    
    return intent
  }

  private assessSkillLevel(context: UserContext): 'novice' | 'intermediate' | 'advanced' {
    // Based on experience and behavior
    if (context.user.experience === 'beginner') return 'novice'
    if (context.user.experience === 'expert') return 'advanced'
    
    // Check feature usage
    const featureUsageRatio = context.features.used.length / 
      (context.features.used.length + context.features.unused.length)
    
    if (featureUsageRatio < 0.3) return 'novice'
    if (featureUsageRatio > 0.7) return 'advanced'
    
    return 'intermediate'
  }

  private calculateUrgency(context: UserContext): 'low' | 'medium' | 'high' | 'critical' {
    // Task deadline approaching
    if (context.task?.type === 'bid_submission' && context.task.progress < 50) {
      return 'high'
    }
    
    // Multiple errors
    if (context.session.errorsCount > 5) {
      return 'critical'
    }
    
    // Stuck on same page
    if (context.session.duration > 600 && context.session.actionsCount < 5) {
      return 'medium'
    }
    
    return 'low'
  }

  private getRelevantTopics(context: UserContext, intent: UserIntent): unknown[] {
    const topics = []
    
    // Page-specific topics
    const pageTopics = this.getPageTopics(context.page)
    topics.push(...pageTopics)
    
    // Intent-based topics
    if (intent.intents.learning) {
      topics.push(
        { id: 'getting-started', title: 'Getting Started', relevance: 0.9 },
        { id: 'basic-features', title: 'Basic Features', relevance: 0.8 }
      )
    }
    
    if (intent.intents.troubleshooting) {
      topics.push(
        { id: 'common-issues', title: 'Common Issues', relevance: 0.95 },
        { id: 'error-messages', title: 'Understanding Errors', relevance: 0.85 }
      )
    }
    
    return topics
  }

  private getPageTopics(page: string): unknown[] {
    const topicMap = {
      '/rfq': [
        { id: 'rfq-search', title: 'Searching RFQs', relevance: 0.9 },
        { id: 'rfq-filters', title: 'Using Filters', relevance: 0.8 }
      ],
      '/bid-submission': [
        { id: 'bid-creation', title: 'Creating a Bid', relevance: 0.95 },
        { id: 'bid-compliance', title: 'Compliance Check', relevance: 0.85 }
      ],
      '/partnerships': [
        { id: 'find-partners', title: 'Finding Partners', relevance: 0.9 },
        { id: 'partnership-agreements', title: 'Partnership Types', relevance: 0.8 }
      ]
    }
    
    return topicMap[page] || []
  }

  private generateTooltip(element: HTMLElement, context: UserContext): Tooltip {
    const elementType = element.tagName.toLowerCase()
    const elementRole = element.getAttribute('role')
    const helpText = element.getAttribute('data-help')
    
    let content = helpText || 'No help available'
    let type: 'info' | 'warning' | 'tip' | 'error' = 'info'
    
    // Smart content generation based on element
    if (elementType === 'button') {
      content = `Click to ${element.textContent?.toLowerCase() || 'perform action'}`
      type = 'info'
    } else if (element.classList.contains('required')) {
      content = 'This field is required'
      type = 'warning'
    } else if (element.classList.contains('indigenous-content')) {
      content = 'Indigenous content requirements apply here'
      type = 'tip'
    }
    
    return {
      id: `tooltip-${Date.now()}`,
      content,
      type,
      dismissible: true,
      neverShowAgain: false
    }
  }

  private personalizeTour(tour: Tour, context: UserContext): Tour {
    // Skip steps user already knows
    if (context.user.experience !== 'beginner') {
      tour.steps = tour.steps.filter(step => 
        !step.id.includes('basic') && !step.id.includes('beginner')
      )
    }
    
    // Add extra steps for specific user types
    if (context.user.type === 'indigenous_business') {
      tour.steps.push({
        id: 'indigenous-features',
        title: 'Indigenous Business Features',
        content: 'Special features available for Indigenous businesses',
        position: 'center',
        navigation: { next: true, previous: true, skip: true }
      })
    }
    
    return tour
  }

  private suggestNextTaskStep(context: UserContext): Suggestion | null {
    if (!context.task) return null
    
    const taskSteps = {
      'bid_creation': [
        'Upload required documents',
        'Complete Indigenous content plan',
        'Review compliance checklist',
        'Submit for internal review'
      ],
      'partner_search': [
        'Define capability requirements',
        'Search for compatible partners',
        'Send partnership invitations',
        'Negotiate terms'
      ]
    }
    
    const steps = taskSteps[context.task.type as keyof typeof taskSteps] || []
    const currentStep = Math.floor((context.task.progress / 100) * steps.length)
    
    if (currentStep < steps.length) {
      return {
        id: `next-step-${Date.now()}`,
        type: 'next_step',
        title: 'Next Step',
        description: steps[currentStep],
        reason: 'Complete this to progress your task',
        confidence: 0.9,
        action: {
          type: 'navigate',
          payload: { step: currentStep + 1 }
        },
        timing: 'immediate'
      }
    }
    
    return null
  }

  private suggestShortcuts(context: UserContext): Suggestion[] {
    const shortcuts: Suggestion[] = []
    
    // Suggest keyboard shortcuts for frequent actions
    if (context.session.actionsCount > 5) {
      shortcuts.push({
        id: 'shortcut-save',
        type: 'shortcut',
        title: 'Quick Save',
        description: 'Press Ctrl+S to save your work',
        reason: 'You\'ve made several changes',
        confidence: 0.8,
        action: {
          type: 'learn',
          payload: { shortcut: 'Ctrl+S' }
        },
        timing: 'idle'
      })
    }
    
    return shortcuts
  }

  private suggestOptimizations(context: UserContext): Suggestion[] {
    const optimizations: Suggestion[] = []
    
    // Suggest bulk actions if doing repetitive tasks
    if (context.session.actionsCount > 20) {
      optimizations.push({
        id: 'bulk-action',
        type: 'optimization',
        title: 'Use Bulk Actions',
        description: 'Select multiple items and perform actions at once',
        reason: 'Save time with repetitive tasks',
        confidence: 0.85,
        action: {
          type: 'enable',
          payload: { feature: 'bulk-actions' }
        },
        timing: 'after_action'
      })
    }
    
    return optimizations
  }

  private suggestUnusedFeatures(context: UserContext): Suggestion[] {
    return context.features.unused.slice(0, 2).map(feature => ({
      id: `feature-${feature}`,
      type: 'feature',
      title: `Try ${this.formatFeatureName(feature)}`,
      description: this.getFeatureDescription(feature),
      reason: 'This feature could help with your current task',
      confidence: 0.7,
      action: {
        type: 'navigate',
        payload: { feature }
      },
      timing: 'idle'
    }))
  }

  private suggestCorrections(context: UserContext): Suggestion[] {
    // Suggest fixes for common errors
    return [{
      id: 'error-correction',
      type: 'correction',
      title: 'Fix Common Issue',
      description: 'Missing required fields in your submission',
      reason: 'Prevent submission errors',
      confidence: 0.9,
      action: {
        type: 'execute',
        payload: { action: 'highlight-required-fields' }
      },
      timing: 'immediate'
    }]
  }

  private formatFeatureName(feature: string): string {
    return feature.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  private getFeatureDescription(feature: string): string {
    const descriptions: Record<string, string> = {
      'ai-bid-assistant': 'AI helps write winning bids faster',
      'partnership-matching': 'Find perfect partners automatically',
      'compliance-checker': 'Ensure your bid meets all requirements',
      'visual-pipeline': 'Track all opportunities visually'
    }
    
    return descriptions[feature] || 'Discover new capabilities'
  }

  private generateGreeting(context: UserContext): string {
    const greetings = {
      learning: "Hi! I see you're exploring our platform. What would you like to learn about?",
      troubleshooting: "I noticed you're having some issues. How can I help?",
      optimizing: "Looking to work more efficiently? I have some tips for you.",
      completing: `Let's get your ${context.task?.type.replace('_', ' ')} completed. Where are you stuck?`,
      exploring: "Welcome! What can I help you with today?"
    }
    
    const intent = this.detectUserIntent(context)
    return greetings[intent.primary as keyof typeof greetings] || greetings.exploring
  }

  private trackInteraction(interaction: HelpInteraction): void {
    const userInteractions = this.userHistory.get(interaction.userId) || []
    userInteractions.push(interaction)
    this.userHistory.set(interaction.userId, userInteractions)
    
    // Send to analytics
    this.sendAnalytics(interaction)
  }

  private sendAnalytics(interaction: HelpInteraction): void {
    // In production, send to analytics service
    logger.info('Help interaction tracked:', interaction)
  }

  private getPreviousInteractions(userId: string): string[] {
    const interactions = this.userHistory.get(userId) || []
    return interactions.map(i => i.helpId).slice(-5)
  }

  private detectTopic(context: UserContext): string {
    if (context.page.includes('rfq')) return 'RFQ Management'
    if (context.page.includes('bid')) return 'Bid Submission'
    if (context.page.includes('partner')) return 'Partnerships'
    return 'General Help'
  }

  private async generateChatResponse(conversationId: string, message: string): Promise<string> {
    // In production, use AI/NLP service
    const responses = {
      'help': 'I can help you with RFQ search, bid submission, finding partners, and more. What specifically do you need help with?',
      'rfq': 'To search for RFQs, use the filters on the left to narrow down by industry, location, and Indigenous content requirements.',
      'partner': 'Our AI-powered partnership matching can help you find the perfect partners. Would you like me to show you how?',
      'bid': 'Creating a winning bid involves several steps. First, ensure you meet all mandatory requirements. Need help with a specific part?'
    }
    
    const lowercaseMessage = message.toLowerCase()
    for (const [keyword, response] of Object.entries(responses)) {
      if (lowercaseMessage.includes(keyword)) {
        return response
      }
    }
    
    return "I'm here to help! Could you be more specific about what you're trying to do?"
  }

  private findRelatedResources(context: HelpContext): unknown[] {
    return [
      {
        type: 'article',
        title: 'Complete Guide to ' + context.topics[0]?.title,
        url: '/help/guides/' + context.topics[0]?.id,
        estimated_time: 5
      },
      {
        type: 'video',
        title: 'Video Tutorial: ' + context.intent.primary,
        url: '/help/videos/' + context.intent.primary,
        estimated_time: 3
      }
    ]
  }

  private generateQuickActions(context: HelpContext): unknown[] {
    const actions = []
    
    if (context.intent.intents.troubleshooting) {
      actions.push({
        label: 'Report Issue',
        action: () => logger.info('Opening issue reporter'),
        icon: 'bug'
      })
    }
    
    actions.push({
      label: 'Contact Support',
      action: () => logger.info('Opening support chat'),
      icon: 'message-circle'
    })
    
    return actions
  }

  private getContactOptions(urgency: string): unknown[] {
    const options = []
    
    if (urgency === 'critical' || urgency === 'high') {
      options.push({
        type: 'chat',
        availability: 'immediate',
        estimated_response: '< 1 minute'
      })
    }
    
    options.push(
      {
        type: 'email',
        availability: 'business_hours',
        estimated_response: '2-4 hours'
      },
      {
        type: 'community',
        availability: 'immediate',
        estimated_response: '15-30 minutes'
      }
    )
    
    return options
  }

  private createFeedbackOption(context: HelpContext): any {
    return {
      type: context.urgency === 'critical' ? 'detailed' : 'thumbs',
      required: false,
      incentive: 'Help us improve our assistance'
    }
  }

  private selectPrimaryHelp(context: HelpContext): any {
    // Select based on intent and urgency
    if (context.intent.intents.learning) {
      return {
        title: 'Getting Started Guide',
        content: 'Let\'s walk through the basics together',
        type: 'tour',
        estimatedTime: 5,
        difficulty: 'easy'
      }
    }
    
    if (context.intent.intents.troubleshooting) {
      return {
        title: 'Troubleshooting Guide',
        content: 'Let\'s solve this issue step by step',
        type: 'interactive',
        estimatedTime: 3,
        difficulty: 'medium'
      }
    }
    
    return {
      title: 'Quick Help',
      content: 'Here\'s what you need to know',
      type: 'text',
      estimatedTime: 1,
      difficulty: 'easy'
    }
  }

  private getTour(tourId: string, context: UserContext): Tour {
    // In production, fetch from database
    return {
      id: tourId,
      name: 'Platform Tour',
      description: 'Learn the key features',
      steps: [
        {
          id: 'step-1',
          title: 'Welcome',
          content: 'Welcome to the Indigenous Procurement Platform',
          position: 'center',
          navigation: { next: true, previous: false, skip: true }
        }
      ],
      settings: {
        skippable: true,
        resumable: true,
        interactive: true,
        estimated_time: 5
      }
    }
  }

  private getCommonIssues(context: UserContext): Issue[] {
    return [
      {
        type: 'missing-fields',
        description: 'Required fields not completed',
        frequency: 'common',
        solution: 'Check all fields marked with asterisk'
      }
    ]
  }

  private suggestNextSteps(context: UserContext, intent: UserIntent): NextStep[] {
    return [
      {
        action: 'Complete your profile',
        description: 'Add certifications and capabilities',
        importance: 'recommended',
        help_available: true
      }
    ]
  }

  private findRelatedFeatures(context: UserContext): string[] {
    const featureMap: Record<string, string[]> = {
      '/rfq': ['ai-bid-assistant', 'partnership-matching'],
      '/bid-submission': ['compliance-checker', 'document-management'],
      '/partnerships': ['consortium-builder', 'success-predictor']
    }
    
    return featureMap[context.page] || []
  }
}

// ML Model for help predictions
class HelpMLModel {
  predict(context: UserContext): any {
    // Simplified ML prediction
    return {
      needs_help: true,
      confidence: 0.85,
      help_type: 'guided_tour'
    }
  }
}