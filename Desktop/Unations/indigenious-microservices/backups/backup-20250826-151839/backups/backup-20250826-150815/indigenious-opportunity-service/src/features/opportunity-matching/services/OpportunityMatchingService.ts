// Automatic Opportunity Matching Service
import { 
  RFQ, Business, OpportunityMatch, ProposedTeam, TeamPartner,
  WinPrediction, MatchStrength, MatchGap, MatchRisk,
  StreamFilters, StreamSubscription, MatchOutcome, MatchInsights
} from '../types'

export class OpportunityMatchingService {
  private subscribers: Map<string, StreamSubscription> = new Map()
  private matchingEngine: MatchingEngine
  private notificationService: NotificationService
  
  constructor() {
    this.matchingEngine = new MatchingEngine()
    this.notificationService = new NotificationService()
  }

  // Core matching function
  async matchOpportunities(rfq: RFQ, businesses: Business[]): Promise<OpportunityMatch[]> {
    const matches: OpportunityMatch[] = []
    
    for (const business of businesses) {
      const match = await this.evaluateMatch(rfq, business)
      
      if (match.score.overall >= 50) { // Minimum threshold
        matches.push(match)
      }
    }
    
    // Sort by overall score
    return matches.sort((a, b) => b.score.overall - a.score.overall)
  }

  // Evaluate a single business against an RFQ
  private async evaluateMatch(rfq: RFQ, business: Business): Promise<OpportunityMatch> {
    // Calculate individual scores
    const scores = {
      capabilities: this.scoreCapabilities(rfq, business),
      experience: this.scoreExperience(rfq, business),
      certifications: this.scoreCertifications(rfq, business),
      indigenous: this.scoreIndigenous(rfq, business),
      geographic: this.scoreGeographic(rfq, business),
      financial: this.scoreFinancial(rfq, business),
      team: 0 // Will be calculated if team is needed
    }
    
    // Weighted average based on RFQ evaluation criteria
    const overall = this.calculateOverallScore(scores, rfq.evaluation)
    
    // Analyze strengths, gaps, and risks
    const analysis = this.analyzeMatch(rfq, business, scores)
    
    // Get recommendations
    const recommendations = this.generateRecommendations(rfq, business, analysis)
    
    // Build suggested team if gaps exist
    let suggestedTeam: ProposedTeam | undefined
    if (analysis.gaps.length > 0) {
      suggestedTeam = await this.buildWinningTeam(rfq, business)
      scores.team = this.scoreTeam(suggestedTeam, rfq)
    }
    
    return {
      id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      rfq,
      business,
      score: { overall, breakdown: scores },
      analysis,
      recommendations,
      suggestedTeam,
      matchedAt: new Date(),
      deadlineIn: Math.floor((rfq.deadlines.submission.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      urgency: this.calculateUrgency(rfq.deadlines.submission)
    }
  }

  // Build optimal team for an opportunity
  async buildWinningTeam(rfq: RFQ, leadBusiness: Business): Promise<ProposedTeam> {
    // Identify capability gaps
    const requiredCapabilities = this.extractRequiredCapabilities(rfq)
    const leadCapabilities = leadBusiness.capabilities.primary.concat(leadBusiness.capabilities.secondary)
    const gaps = requiredCapabilities.filter(cap => !leadCapabilities.includes(cap))
    
    // Find complementary partners
    const potentialPartners = await this.findComplementaryPartners(leadBusiness, gaps, rfq)
    
    // Select optimal team composition
    const selectedPartners = this.optimizeTeamComposition(
      leadBusiness,
      potentialPartners,
      rfq
    )
    
    // Calculate team metrics
    const composition = this.calculateTeamComposition(leadBusiness, selectedPartners)
    const capabilities = this.calculateTeamCapabilities(leadBusiness, selectedPartners, requiredCapabilities)
    const financial = this.calculateTeamFinancials(leadBusiness, selectedPartners, rfq)
    
    // Determine partnership structure
    const structure = this.determinePartnershipStructure(
      leadBusiness,
      selectedPartners,
      rfq,
      composition
    )
    
    // Calculate win probability
    const winProbability = this.calculateTeamWinProbability(
      { lead: leadBusiness, partners: selectedPartners, composition, capabilities, financial, structure },
      rfq
    )
    
    return {
      lead: leadBusiness,
      partners: selectedPartners,
      composition,
      capabilities,
      financial,
      winProbability,
      structure
    }
  }

  // Real-time opportunity monitoring
  subscribeToOpportunities(filters: StreamFilters): StreamSubscription {
    const subscription: StreamSubscription = {
      id: `sub-${Date.now()}`,
      filters,
      onOpportunity: () => {},
      onMatch: () => {},
      onError: () => {},
      pause: () => this.pauseSubscription(subscription.id),
      resume: () => this.resumeSubscription(subscription.id),
      unsubscribe: () => this.unsubscribe(subscription.id)
    }
    
    this.subscribers.set(subscription.id, subscription)
    
    // Start monitoring
    this.startMonitoring(subscription)
    
    return subscription
  }

  // Predict win probability with detailed analysis
  async predictWinProbability(match: OpportunityMatch): Promise<WinPrediction> {
    const factors = {
      positive: [] as unknown[],
      negative: [] as unknown[],
      neutral: [] as unknown[]
    }
    
    // Analyze positive factors
    if (match.score.overall >= 85) {
      factors.positive.push({
        name: 'Excellent match score',
        impact: 25,
        confidence: 95,
        explanation: 'Your capabilities align exceptionally well with requirements'
      })
    }
    
    if (match.score.breakdown.indigenous >= 90) {
      factors.positive.push({
        name: 'Strong Indigenous partnerships',
        impact: 30,
        confidence: 90,
        explanation: 'Exceeds Indigenous content requirements significantly'
      })
    }
    
    // Analyze negative factors
    if (match.analysis.gaps.filter(g => g.critical).length > 0) {
      factors.negative.push({
        name: 'Critical capability gaps',
        impact: -20,
        confidence: 85,
        explanation: 'Missing mandatory requirements that need addressing'
      })
    }
    
    // Competitive analysis
    const competitiveAnalysis = await this.analyzeCompetition(match.rfq, match.business)
    
    // Historical context
    const historicalContext = await this.getHistoricalContext(match.rfq, match.business)
    
    // Generate recommendations
    const recommendations = this.generateWinningStrategy(match, factors, competitiveAnalysis)
    
    // Calculate overall probability
    const probability = this.calculateWinProbability(factors, competitiveAnalysis, historicalContext)
    
    return {
      probability,
      factors,
      competitiveAnalysis,
      recommendations,
      historicalContext
    }
  }

  // Track and learn from outcomes
  async trackMatchOutcome(outcome: MatchOutcome): Promise<void> {
    // Store outcome for analysis
    await this.storeOutcome(outcome)
    
    // Update machine learning models
    await this.updateModels(outcome)
    
    // Generate insights
    await this.generateOutcomeInsights(outcome)
  }

  // Generate insights for a business
  async generateMatchInsights(businessId: string, period: { start: Date, end: Date }): Promise<MatchInsights> {
    // Fetch historical data
    const matches = await this.getHistoricalMatches(businessId, period)
    const outcomes = await this.getHistoricalOutcomes(businessId, period)
    
    // Calculate summary metrics
    const summary = {
      totalMatches: matches.length,
      submissionRate: outcomes.filter(o => o.result.submitted).length / matches.length,
      winRate: outcomes.filter(o => o.result.won).length / outcomes.filter(o => o.result.submitted).length,
      avgMatchScore: matches.reduce((sum, m) => sum + m.score.overall, 0) / matches.length
    }
    
    // Analyze trends
    const trends = this.analyzeTrends(matches, outcomes, period)
    
    // Identify strengths
    const strengths = this.identifyStrengths(matches, outcomes)
    
    // Find opportunities
    const opportunities = this.identifyOpportunities(matches, outcomes)
    
    // Generate recommendations
    const recommendations = this.generateStrategicRecommendations(summary, trends, strengths, opportunities)
    
    return {
      businessId,
      period,
      summary,
      trends,
      strengths,
      opportunities,
      recommendations
    }
  }

  // Private helper methods
  
  private scoreCapabilities(rfq: RFQ, business: Business): number {
    const required = this.extractRequiredCapabilities(rfq)
    const businessCaps = [...business.capabilities.primary, ...business.capabilities.secondary]
    
    const matched = required.filter(req => 
      businessCaps.some(cap => this.isCapabilityMatch(cap, req))
    )
    
    return (matched.length / required.length) * 100
  }

  private scoreExperience(rfq: RFQ, business: Business): number {
    let score = 0
    
    // Industry experience
    if (rfq.project.industry.some(ind => 
      business.capabilities.primary.some(cap => cap.toLowerCase().includes(ind.toLowerCase()))
    )) {
      score += 30
    }
    
    // Project count
    if (business.performance.completedProjects >= 10) score += 20
    if (business.performance.completedProjects >= 50) score += 10
    
    // Client satisfaction
    score += (business.performance.clientSatisfaction / 5) * 20
    
    // On-time delivery
    score += (business.performance.onTimeDelivery / 100) * 20
    
    return Math.min(score, 100)
  }

  private scoreCertifications(rfq: RFQ, business: Business): number {
    const required = rfq.requirements.certifications
    const businessCerts = business.capabilities.certifications
      .filter(cert => cert.status === 'active')
      .map(cert => cert.type)
    
    const matched = required.filter(req => businessCerts.includes(req))
    
    return required.length > 0 ? (matched.length / required.length) * 100 : 100
  }

  private scoreIndigenous(rfq: RFQ, business: Business): number {
    if (!rfq.indigenousRequirements.minimumPercentage) return 100
    
    let score = 0
    
    // Business type
    if (business.type === 'Indigenous') {
      score = 50
      
      // Ownership percentage
      if (business.indigenous && business.indigenous.ownershipPercentage >= 51) {
        score += 25
      }
      
      // Nation match
      if (rfq.indigenousRequirements.specificNations && business.indigenous) {
        if (rfq.indigenousRequirements.specificNations.includes(business.indigenous.nation)) {
          score += 25
        }
      } else {
        score += 25
      }
    } else if (business.type === 'Joint Venture' && business.indigenous) {
      score = 30 + (business.indigenous.ownershipPercentage / 100) * 50
    }
    
    return score
  }

  private scoreGeographic(rfq: RFQ, business: Business): number {
    const projectLocation = rfq.project.location
    
    // Check exact city match
    if (business.profile.locations.some(loc => loc.city === projectLocation.city)) {
      return 100
    }
    
    // Check province match
    if (business.profile.locations.some(loc => loc.province === projectLocation.province)) {
      return 80
    }
    
    // Check region match
    if (business.profile.locations.some(loc => loc.region === projectLocation.region)) {
      return 60
    }
    
    // Check remote capability
    if (projectLocation.remote && business.profile.locations.some(loc => loc.remote)) {
      return 70
    }
    
    return 40
  }

  private scoreFinancial(rfq: RFQ, business: Business): number {
    const projectValue = (rfq.value.min + rfq.value.max) / 2
    const businessRevenue = business.profile.revenue
    
    // Check if business can handle project size
    if (projectValue > businessRevenue * 0.5) {
      return 40 // Too large for single business
    }
    
    if (projectValue > businessRevenue * 0.3) {
      return 70 // Manageable but significant
    }
    
    return 100 // Comfortable project size
  }

  private calculateOverallScore(scores: any, evaluation: any): number {
    const weights = {
      capabilities: evaluation.technical / 100,
      experience: evaluation.experience / 100,
      certifications: 0.1,
      indigenous: evaluation.indigenous / 100,
      geographic: 0.1,
      financial: evaluation.price / 100,
      team: 0
    }
    
    let totalWeight = 0
    let weightedSum = 0
    
    Object.entries(scores).forEach(([key, score]) => {
      const weight = weights[key as keyof typeof weights] || 0
      weightedSum += (score as number) * weight
      totalWeight += weight
    })
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0
  }

  private analyzeMatch(rfq: RFQ, business: Business, scores: any): any {
    const strengths: MatchStrength[] = []
    const gaps: MatchGap[] = []
    const risks: MatchRisk[] = []
    
    // Identify strengths
    if (scores.capabilities >= 80) {
      strengths.push({
        factor: 'Strong capability match',
        description: 'Your capabilities align well with project requirements',
        impact: 'high',
        evidence: ['Technical expertise matches', 'Relevant experience']
      })
    }
    
    // Identify gaps
    const requiredCerts = rfq.requirements.certifications
    const businessCerts = business.capabilities.certifications.map(c => c.type)
    const missingCerts = requiredCerts.filter(cert => !businessCerts.includes(cert))
    
    if (missingCerts.length > 0) {
      gaps.push({
        requirement: 'Missing certifications',
        current: businessCerts.join(', '),
        needed: missingCerts.join(', '),
        solution: missingCerts.map(cert => ({
          type: 'Obtain Certification',
          description: `Obtain ${cert} certification`,
          timeRequired: 30,
          cost: 5000,
          difficulty: 'medium'
        })),
        critical: true
      })
    }
    
    // Identify risks
    if (scores.financial < 70) {
      risks.push({
        type: 'Financial capacity',
        description: 'Project size may strain financial resources',
        probability: 'medium',
        impact: 'high',
        mitigation: ['Partner with larger firm', 'Secure additional financing']
      })
    }
    
    return { strengths, gaps, risks, opportunities: [] }
  }

  private generateRecommendations(rfq: RFQ, business: Business, analysis: any): any {
    const immediateActions: unknown[] = []
    const partnersNeeded: unknown[] = []
    
    // Address critical gaps
    analysis.gaps.filter((g: unknown) => g.critical).forEach((gap: unknown) => {
      immediateActions.push({
        task: `Address: ${gap.requirement}`,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        responsible: 'Business Development',
        status: 'pending'
      })
    })
    
    // Identify partner needs
    if (analysis.gaps.length > 0) {
      partnersNeeded.push({
        capability: 'Complementary capabilities',
        reason: 'Fill capability gaps',
        suggested: [],
        alternativeOptions: ['Hire specialists', 'Subcontract']
      })
    }
    
    return {
      immediateActions,
      partnersNeeded,
      preparationTime: immediateActions.length * 8, // hours
      successProbability: 100 - (analysis.gaps.filter((g: unknown) => g.critical).length * 10)
    }
  }

  private calculateUrgency(deadline: Date): 'low' | 'medium' | 'high' | 'critical' {
    const daysUntilDeadline = Math.floor((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilDeadline <= 3) return 'critical'
    if (daysUntilDeadline <= 7) return 'high'
    if (daysUntilDeadline <= 14) return 'medium'
    return 'low'
  }

  private extractRequiredCapabilities(rfq: RFQ): string[] {
    const capabilities: string[] = []
    
    // From mandatory requirements
    rfq.requirements.mandatory.forEach(req => {
      capabilities.push(...this.extractCapabilitiesFromText(req.description))
    })
    
    // From technical requirements
    rfq.requirements.technical.forEach(req => {
      capabilities.push(...req.specifications)
    })
    
    return [...new Set(capabilities)]
  }

  private extractCapabilitiesFromText(text: string): string[] {
    // Simple keyword extraction - in production, use NLP
    const keywords = [
      'construction', 'engineering', 'design', 'project management',
      'environmental', 'safety', 'quality', 'procurement'
    ]
    
    return keywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    )
  }

  private isCapabilityMatch(businessCap: string, requiredCap: string): boolean {
    // Fuzzy matching - in production, use semantic similarity
    return businessCap.toLowerCase().includes(requiredCap.toLowerCase()) ||
           requiredCap.toLowerCase().includes(businessCap.toLowerCase())
  }

  private async findComplementaryPartners(
    leadBusiness: Business,
    gaps: string[],
    rfq: RFQ
  ): Promise<Business[]> {
    // Mock implementation - in production, query database
    return [
      {
        id: 'partner-1',
        name: 'Northern Engineering Ltd.',
        type: 'Canadian',
        profile: {
          established: new Date('2010-01-01'),
          employees: 75,
          revenue: 15000000,
          locations: [{
            city: 'Thunder Bay',
            province: 'ON',
            region: 'Northern Ontario',
            remote: true,
            accessibleBy: ['road', 'air']
          }]
        },
        capabilities: {
          primary: ['Engineering', 'Design'],
          secondary: ['Project Management'],
          certifications: [],
          equipment: []
        },
        performance: {
          completedProjects: 45,
          winRate: 0.35,
          clientSatisfaction: 4.2,
          onTimeDelivery: 88
        }
      }
    ]
  }

  private optimizeTeamComposition(
    lead: Business,
    potentialPartners: Business[],
    rfq: RFQ
  ): TeamPartner[] {
    // Simplified optimization - in production, use optimization algorithm
    return potentialPartners.slice(0, 2).map(partner => ({
      business: partner,
      role: 'Sub' as const,
      contribution: {
        capabilities: partner.capabilities.primary,
        resources: [`${partner.profile.employees} employees`],
        percentage: 30,
        critical: true
      },
      terms: {
        share: 30,
        responsibilities: ['Engineering services', 'Technical design'],
        deliverables: ['Design documents', 'Technical specifications']
      },
      compatibility: {
        withLead: 85,
        withTeam: 80,
        cultural: 75,
        operational: 80
      }
    }))
  }

  private calculateTeamComposition(lead: Business, partners: TeamPartner[]): any {
    const totalEmployees = lead.profile.employees + 
      partners.reduce((sum, p) => sum + p.business.profile.employees, 0)
    
    const indigenousEmployees = (lead.indigenous?.ownershipPercentage || 0) / 100 * lead.profile.employees +
      partners.reduce((sum, p) => sum + (p.business.indigenous?.ownershipPercentage || 0) / 100 * p.business.profile.employees, 0)
    
    return {
      totalEmployees,
      indigenousEmployees: Math.round(indigenousEmployees),
      indigenousPercentage: (indigenousEmployees / totalEmployees) * 100,
      nations: [lead.indigenous?.nation, ...partners.map(p => p.business.indigenous?.nation)].filter(Boolean) as string[],
      locations: [
        ...lead.profile.locations,
        ...partners.flatMap(p => p.business.profile.locations)
      ]
    }
  }

  private calculateTeamCapabilities(
    lead: Business,
    partners: TeamPartner[],
    required: string[]
  ): any {
    const allCapabilities = [
      ...lead.capabilities.primary,
      ...lead.capabilities.secondary,
      ...partners.flatMap(p => [...p.business.capabilities.primary, ...p.business.capabilities.secondary])
    ]
    
    const covered = required.filter(req => 
      allCapabilities.some(cap => this.isCapabilityMatch(cap, req))
    )
    
    return {
      required,
      covered,
      gaps: required.filter(req => !covered.includes(req)),
      coverage: (covered.length / required.length) * 100
    }
  }

  private calculateTeamFinancials(
    lead: Business,
    partners: TeamPartner[],
    rfq: RFQ
  ): any {
    const combinedRevenue = lead.profile.revenue +
      partners.reduce((sum, p) => sum + p.business.profile.revenue, 0)
    
    return {
      combinedRevenue,
      bondingCapacity: combinedRevenue * 0.1, // Simplified
      insuranceCoverage: 50000000, // Mock
      meetRequirements: true
    }
  }

  private determinePartnershipStructure(
    lead: Business,
    partners: TeamPartner[],
    rfq: RFQ,
    composition: any
  ): any {
    // Determine optimal structure
    let type: 'Joint Venture' | 'Prime-Sub' | 'Consortium' = 'Prime-Sub'
    
    if (composition.indigenousPercentage < rfq.indigenousRequirements.minimumPercentage) {
      type = 'Joint Venture' // Need JV for Indigenous content
    }
    
    const totalShares = 100
    const leadShare = type === 'Joint Venture' ? 51 : 70
    const remainingShares = totalShares - leadShare
    
    const partnerShares: Record<string, number> = {}
    partners.forEach((partner, index) => {
      partnerShares[partner.business.id] = remainingShares / partners.length
    })
    
    return {
      type,
      leadShare,
      partnerShares,
      indigenousContent: composition.indigenousPercentage
    }
  }

  private calculateTeamWinProbability(team: ProposedTeam, rfq: RFQ): number {
    let probability = 60 // Base probability
    
    // Team composition bonus
    if (team.composition.indigenousPercentage > rfq.indigenousRequirements.minimumPercentage + 10) {
      probability += 10
    }
    
    // Capability coverage
    probability += (team.capabilities.coverage / 100) * 20
    
    // Financial strength
    if (team.financial.meetRequirements) {
      probability += 10
    }
    
    return Math.min(probability, 95)
  }

  private startMonitoring(subscription: StreamSubscription): void {
    // Simulate monitoring - in production, connect to real sources
    setInterval(() => {
      // Mock new opportunity
      const mockRFQ: RFQ = this.generateMockRFQ()
      
      if (this.matchesFilters(mockRFQ, subscription.filters)) {
        subscription.onOpportunity(mockRFQ)
      }
    }, 30000) // Check every 30 seconds
  }

  private matchesFilters(rfq: RFQ, filters: StreamFilters): boolean {
    if (filters.industries && !filters.industries.some(ind => rfq.project.industry.includes(ind))) {
      return false
    }
    
    if (filters.indigenousContent && rfq.indigenousRequirements.minimumPercentage < filters.indigenousContent) {
      return false
    }
    
    return true
  }

  private generateMockRFQ(): RFQ {
    return {
      id: `rfq-${Date.now()}`,
      title: 'Infrastructure Development Project',
      description: 'Construction of new infrastructure in Northern Ontario',
      client: {
        name: 'Government of Ontario',
        type: 'Government',
        department: 'Infrastructure'
      },
      project: {
        type: 'Infrastructure',
        industry: ['Construction', 'Engineering'],
        location: {
          city: 'Thunder Bay',
          province: 'ON',
          region: 'Northern Ontario',
          remote: true,
          accessibleBy: ['road', 'air']
        },
        startDate: new Date('2024-06-01'),
        duration: 18,
        remote: true
      },
      value: {
        min: 10000000,
        max: 25000000,
        currency: 'CAD',
        budgetConfirmed: true
      },
      requirements: {
        mandatory: [],
        desirable: [],
        technical: [],
        certifications: ['ISO 9001', 'ISO 14001'],
        experience: []
      },
      indigenousRequirements: {
        minimumPercentage: 25,
        employmentTargets: [{ category: 'skilled-trades', percentage: 20 }]
      },
      deadlines: {
        questions: new Date('2024-03-01'),
        submission: new Date('2024-03-15'),
        award: new Date('2024-04-01')
      },
      evaluation: {
        technical: 40,
        price: 30,
        indigenous: 20,
        experience: 10
      }
    }
  }

  private pauseSubscription(id: string): void {
    // Implementation
  }

  private resumeSubscription(id: string): void {
    // Implementation
  }

  private unsubscribe(id: string): void {
    this.subscribers.delete(id)
  }

  private async analyzeCompetition(rfq: RFQ, business: Business): Promise<unknown> {
    return {
      estimatedCompetitors: 8,
      strongerCompetitors: 3,
      competitiveAdvantages: [
        'Local presence',
        'Strong Indigenous partnerships',
        'Relevant experience'
      ],
      competitiveWeaknesses: [
        'Smaller than major competitors',
        'Limited bonding capacity'
      ]
    }
  }

  private async getHistoricalContext(rfq: RFQ, business: Business): Promise<unknown> {
    return {
      previousContracts: 2,
      totalValue: 5000000,
      satisfaction: 4.5,
      preferences: ['Local suppliers', 'Strong safety record'],
      incumbentAdvantage: false
    }
  }

  private generateWinningStrategy(match: OpportunityMatch, factors: any, competitive: any): any {
    return {
      mustDo: [
        'Address all mandatory requirements',
        'Form strategic partnerships for gaps',
        'Submit 5 days before deadline'
      ],
      shouldDo: [
        'Exceed Indigenous content by 10%',
        'Include innovation proposals',
        'Provide strong references'
      ],
      couldDo: [
        'Offer additional community benefits',
        'Propose accelerated timeline'
      ],
      avoidDoing: [
        'Underprice to win',
        'Overpromise on timeline'
      ]
    }
  }

  private calculateWinProbability(factors: any, competitive: any, historical: any): number {
    let probability = 50 // Base
    
    // Add positive factors
    factors.positive.forEach((factor: unknown) => {
      probability += factor.impact * (factor.confidence / 100) * 0.01
    })
    
    // Subtract negative factors
    factors.negative.forEach((factor: unknown) => {
      probability += factor.impact * (factor.confidence / 100) * 0.01
    })
    
    // Competitive adjustment
    probability -= competitive.strongerCompetitors * 5
    
    // Historical bonus
    if (historical.satisfaction > 4) {
      probability += 10
    }
    
    return Math.max(5, Math.min(95, probability))
  }

  private async storeOutcome(outcome: MatchOutcome): Promise<void> {
    // Store in database
  }

  private async updateModels(outcome: MatchOutcome): Promise<void> {
    // Update ML models with new data
  }

  private async generateOutcomeInsights(outcome: MatchOutcome): Promise<void> {
    // Generate insights from outcome
  }

  private async getHistoricalMatches(businessId: string, period: any): Promise<OpportunityMatch[]> {
    // Fetch from database
    return []
  }

  private async getHistoricalOutcomes(businessId: string, period: any): Promise<MatchOutcome[]> {
    // Fetch from database
    return []
  }

  private analyzeTrends(matches: OpportunityMatch[], outcomes: MatchOutcome[], period: any): any {
    return {
      matchQuality: { current: 85, previous: 80, change: 5, trend: 'improving' as const },
      winRate: { current: 35, previous: 30, change: 5, trend: 'improving' as const },
      responseTime: { current: 3.5, previous: 4.2, change: -0.7, trend: 'improving' as const }
    }
  }

  private identifyStrengths(matches: OpportunityMatch[], outcomes: MatchOutcome[]): any {
    return {
      topCapabilities: ['Construction', 'Project Management', 'Indigenous Partnerships'],
      bestPartners: [],
      winningCombinations: []
    }
  }

  private identifyOpportunities(matches: OpportunityMatch[], outcomes: MatchOutcome[]): any {
    return {
      missingCapabilities: ['Environmental Assessment', 'Specialized Equipment'],
      potentialPartners: [],
      emergingMarkets: ['Green Energy', 'Critical Minerals']
    }
  }

  private generateStrategicRecommendations(summary: any, trends: any, strengths: any, opportunities: any): any {
    return {
      immediate: [
        'Obtain ISO 14001 certification',
        'Partner with environmental specialist'
      ],
      strategic: [
        'Expand into green energy sector',
        'Build relationships in new territories'
      ],
      partnerships: [
        'Form JV with larger construction firm',
        'Create consortium for mega-projects'
      ]
    }
  }
}

// Supporting classes
class MatchingEngine {
  // Advanced matching algorithms
}

class NotificationService {
  // Handle all notifications
}