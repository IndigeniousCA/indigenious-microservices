// AI Bid Assistant Service
// Helps Indigenous businesses write winning bids with AI-powered assistance

import { 
  BidTemplate, BidAnalysis, BidContext, AIBidRequest, 
  BidDraft, WinningBidPattern, ComplianceCheck, BidImprovement,
  BidSuggestion, BidSectionContent, BidSection
} from '../types'

import { logger } from '@/lib/monitoring/logger';
export class BidAssistantService {
  private apiKey: string
  private winningPatterns: Map<string, WinningBidPattern> = new Map()
  private templates: Map<string, BidTemplate> = new Map()
  
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
    this.loadWinningPatterns()
    this.loadTemplates()
  }

  // Generate a complete bid based on context
  async generateBid(request: AIBidRequest): Promise<BidDraft> {
    const { context, template, sections, tone, length, language } = request
    
    // Select appropriate template
    const bidTemplate = template 
      ? this.templates.get(template)
      : this.selectBestTemplate(context)
    
    if (!bidTemplate) {
      throw new Error('No suitable template found')
    }
    
    // Generate content for each section
    const sectionContents: BidSectionContent[] = []
    
    for (const section of bidTemplate.sections) {
      if (sections.length === 0 || sections.includes(section.id)) {
        const content = await this.generateSection(
          section,
          context,
          tone,
          length,
          language,
          request.includeIndigenousContent
        )
        sectionContents.push(content)
      }
    }
    
    // Create bid draft
    const draft: BidDraft = {
      id: this.generateId(),
      rfqId: context.rfqDetails.id,
      businessId: context.businessId,
      title: `Bid for ${context.rfqDetails.title}`,
      sections: sectionContents,
      lastUpdated: new Date(),
      status: 'draft',
      collaborators: [],
      version: 1,
      language
    }
    
    // Analyze and score the draft
    const analysis = await this.analyzeBid(draft, context)
    draft.aiScore = analysis.score
    
    return draft
  }

  // Generate content for a specific section
  private async generateSection(
    section: BidSection,
    context: BidContext,
    tone: string,
    length: string,
    language: string,
    includeIndigenousContent: boolean
  ): Promise<BidSectionContent> {
    const prompt = this.buildSectionPrompt(section, context, tone, length, includeIndigenousContent)
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(language, includeIndigenousContent)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: this.getMaxTokens(length),
        })
      })
      
      const data = await response.json()
      const content = data.choices[0].message.content
      
      // Apply winning patterns
      const improvedContent = this.applyWinningPatterns(content, context.rfqDetails.category)
      
      return {
        sectionId: section.id,
        content: improvedContent,
        aiGenerated: true,
        humanEdited: false,
        confidence: this.calculateConfidence(improvedContent, section, context)
      }
    } catch (error) {
      logger.error('Error generating section:', error)
      throw new Error(`Failed to generate ${section.title}`)
    }
  }

  // Analyze a bid for improvements
  async analyzeBid(draft: BidDraft, context: BidContext): Promise<BidAnalysis> {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const suggestions: BidSuggestion[] = []
    const missingRequirements: string[] = []
    const complianceIssues: string[] = []
    
    // Check mandatory requirements
    const complianceChecks = this.checkCompliance(draft, context)
    complianceChecks.forEach(check => {
      if (check.status === 'not-met') {
        missingRequirements.push(check.requirement)
        if (check.suggestion) {
          suggestions.push({
            section: 'Compliance',
            issue: `Missing: ${check.requirement}`,
            suggestion: check.suggestion,
            priority: check.mandatory ? 'critical' : 'high'
          })
        }
      }
    })
    
    // Analyze each section
    for (const section of draft.sections) {
      const sectionAnalysis = await this.analyzeSection(section, context)
      strengths.push(...sectionAnalysis.strengths)
      weaknesses.push(...sectionAnalysis.weaknesses)
      suggestions.push(...sectionAnalysis.suggestions)
    }
    
    // Calculate scores
    const readabilityScore = this.calculateReadability(draft)
    const technicalAccuracy = this.calculateTechnicalAccuracy(draft, context)
    const culturalAlignment = this.calculateCulturalAlignment(draft, context)
    
    // Overall score
    const score = this.calculateOverallScore({
      compliance: complianceChecks,
      readability: readabilityScore,
      technical: technicalAccuracy,
      cultural: culturalAlignment,
      completeness: (draft.sections.length / context.rfqDetails.evaluationCriteria.length) * 100
    })
    
    return {
      score,
      strengths,
      weaknesses,
      suggestions,
      missingRequirements,
      complianceIssues,
      readabilityScore,
      technicalAccuracy,
      culturalAlignment
    }
  }

  // Improve specific text with AI
  async improveBidText(
    text: string,
    improvementType: 'clarity' | 'compliance' | 'persuasion' | 'technical' | 'cultural',
    context?: Partial<BidContext>
  ): Promise<BidImprovement> {
    const prompt = this.buildImprovementPrompt(text, improvementType, context)
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert bid writer specializing in government procurement for Indigenous businesses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 1000,
        })
      })
      
      const data = await response.json()
      const improved = data.choices[0].message.content
      
      return {
        original: text,
        improved,
        reason: this.getImprovementReason(improvementType),
        impact: this.assessImpact(text, improved),
        category: improvementType
      }
    } catch (error) {
      logger.error('Error improving text:', error)
      throw new Error('Failed to improve text')
    }
  }

  // Check compliance with RFQ requirements
  private checkCompliance(draft: BidDraft, context: BidContext): ComplianceCheck[] {
    const checks: ComplianceCheck[] = []
    const fullContent = draft.sections.map(s => s.content).join(' ')
    
    // Check mandatory requirements
    context.rfqDetails.mandatoryRequirements.forEach(req => {
      const found = this.findRequirementEvidence(fullContent, req)
      checks.push({
        requirement: req,
        status: found ? 'met' : 'not-met',
        evidence: found,
        mandatory: true,
        suggestion: found ? undefined : this.generateRequirementSuggestion(req)
      })
    })
    
    // Check evaluation criteria coverage
    context.rfqDetails.evaluationCriteria.forEach(criteria => {
      const coverage = this.assessCriteriaCoverage(fullContent, criteria.description)
      checks.push({
        requirement: criteria.name,
        status: coverage > 0.7 ? 'met' : coverage > 0.3 ? 'partial' : 'not-met',
        mandatory: false,
        suggestion: coverage < 0.7 ? `Strengthen content addressing: ${criteria.description}` : undefined
      })
    })
    
    return checks
  }

  // Load winning bid patterns from historical data
  private loadWinningPatterns() {
    // In production, this would load from database
    const patterns: WinningBidPattern[] = [
      {
        category: 'construction',
        patterns: {
          openingStyle: [
            'We are pleased to submit our proposal',
            'Our team brings X years of experience',
            'As a certified Indigenous business'
          ],
          keyPhrases: [
            'on-time and under budget',
            'safety-first approach',
            'local workforce development',
            'sustainable practices'
          ],
          structureElements: [
            'Executive Summary',
            'Technical Approach',
            'Project Timeline',
            'Team Qualifications',
            'Past Performance'
          ],
          closingStyle: [
            'We look forward to partnering',
            'committed to exceeding expectations',
            'delivering lasting value'
          ],
          differentiators: [
            'Indigenous workforce percentage',
            'Community benefit programs',
            'Environmental stewardship'
          ]
        },
        avgScore: 87,
        winRate: 0.73
      },
      {
        category: 'it-services',
        patterns: {
          openingStyle: [
            'Our innovative solution',
            'Leveraging cutting-edge technology',
            'Proven track record in'
          ],
          keyPhrases: [
            'scalable architecture',
            'user-centered design',
            'agile methodology',
            'cybersecurity best practices'
          ],
          structureElements: [
            'Technical Solution',
            'Implementation Plan',
            'Security Measures',
            'Support Model',
            'Cost Breakdown'
          ],
          closingStyle: [
            'ensuring seamless delivery',
            'your trusted technology partner',
            'driving digital transformation'
          ],
          differentiators: [
            'Indigenous data sovereignty',
            'Cultural sensitivity in design',
            'Remote community experience'
          ]
        },
        avgScore: 85,
        winRate: 0.68
      }
    ]
    
    patterns.forEach(p => this.winningPatterns.set(p.category, p))
  }

  // Load bid templates
  private loadTemplates() {
    // In production, load from database
    const templates: BidTemplate[] = [
      {
        id: 'construction-general',
        name: 'General Construction',
        category: 'construction',
        description: 'Standard template for construction projects',
        sections: [
          {
            id: 'executive-summary',
            title: 'Executive Summary',
            description: 'High-level overview of your proposal',
            required: true,
            order: 1,
            contentType: 'text',
            prompts: [
              'Summarize your understanding of the project',
              'Highlight your key qualifications',
              'State your value proposition'
            ],
            examples: [
              'ABC Construction is pleased to submit this proposal for...',
              'With over 20 years of experience in similar projects...'
            ],
            scoringWeight: 15,
            wordLimit: 500
          },
          {
            id: 'technical-approach',
            title: 'Technical Approach',
            description: 'Detailed methodology and approach',
            required: true,
            order: 2,
            contentType: 'text',
            prompts: [
              'Describe your construction methodology',
              'Explain quality control measures',
              'Detail safety protocols'
            ],
            examples: [],
            scoringWeight: 30,
            wordLimit: 2000
          },
          {
            id: 'project-schedule',
            title: 'Project Schedule',
            description: 'Timeline and milestones',
            required: true,
            order: 3,
            contentType: 'table',
            prompts: [
              'Create a detailed project timeline',
              'Identify key milestones',
              'Show critical path'
            ],
            examples: [],
            scoringWeight: 20
          },
          {
            id: 'team-qualifications',
            title: 'Team Qualifications',
            description: 'Key personnel and their experience',
            required: true,
            order: 4,
            contentType: 'text',
            prompts: [
              'List key team members',
              'Describe relevant experience',
              'Include certifications'
            ],
            examples: [],
            scoringWeight: 20,
            wordLimit: 1500
          },
          {
            id: 'past-performance',
            title: 'Past Performance',
            description: 'Similar projects completed',
            required: true,
            order: 5,
            contentType: 'list',
            prompts: [
              'List 3-5 similar projects',
              'Include client references',
              'Highlight successful outcomes'
            ],
            examples: [],
            scoringWeight: 15
          }
        ],
        successRate: 0.73,
        usageCount: 234,
        avgScore: 87,
        tags: ['construction', 'infrastructure', 'building'],
        language: 'en'
      }
    ]
    
    templates.forEach(t => this.templates.set(t.id, t))
  }

  // Helper methods
  private buildSectionPrompt(
    section: BidSection,
    context: BidContext,
    tone: string,
    length: string,
    includeIndigenousContent: boolean
  ): string {
    let prompt = `Write the "${section.title}" section for a government bid proposal.\n\n`
    
    prompt += `Context:\n`
    prompt += `- Business: ${context.businessProfile.name}\n`
    prompt += `- RFQ: ${context.rfqDetails.title}\n`
    prompt += `- Budget: ${context.rfqDetails.budget}\n`
    prompt += `- Our Capabilities: ${context.businessProfile.capabilities.join(', ')}\n`
    
    if (includeIndigenousContent) {
      prompt += `- Indigenous Business: ${context.businessProfile.indigenousPercentage}% Indigenous owned\n`
      prompt += `- Emphasize Indigenous values, community benefit, and cultural alignment\n`
    }
    
    prompt += `\nSection Requirements:\n`
    prompt += `- ${section.description}\n`
    prompt += `- Tone: ${tone}\n`
    prompt += `- Length: ${length} (approximately ${section.wordLimit || 'standard'} words)\n`
    
    if (section.prompts.length > 0) {
      prompt += `\nAddress these points:\n`
      section.prompts.forEach(p => {
        prompt += `- ${p}\n`
      })
    }
    
    if (section.examples.length > 0) {
      prompt += `\nStyle examples:\n`
      section.examples.forEach(e => {
        prompt += `- "${e}"\n`
      })
    }
    
    return prompt
  }

  private getSystemPrompt(language: string, includeIndigenousContent: boolean): string {
    let prompt = `You are an expert bid writer specializing in government procurement.`
    
    if (includeIndigenousContent) {
      prompt += ` You understand Indigenous business values and incorporate cultural elements appropriately.`
      prompt += ` Emphasize community benefit, sustainable practices, and respectful partnerships.`
    }
    
    prompt += ` Write in a professional, clear, and persuasive manner.`
    prompt += ` Use active voice and specific examples.`
    prompt += ` Avoid jargon unless necessary.`
    
    if (language === 'fr') {
      prompt += ` Répondez en français.`
    } else if (language === 'cr') {
      prompt += ` Include some Cree phrases where appropriate, with English translations.`
    }
    
    return prompt
  }

  private applyWinningPatterns(content: string, category: string): string {
    const pattern = this.winningPatterns.get(category)
    if (!pattern) return content
    
    // This is simplified - in production would be more sophisticated
    let improved = content
    
    // Add key phrases if missing
    pattern.patterns.keyPhrases.forEach(phrase => {
      if (!improved.toLowerCase().includes(phrase.toLowerCase())) {
        // Intelligently insert phrase in appropriate context
        // This would use NLP in production
      }
    })
    
    return improved
  }

  private calculateConfidence(content: string, section: BidSection, context: BidContext): number {
    let confidence = 0.5 // Base confidence
    
    // Check if all prompts are addressed
    const addressedPrompts = section.prompts.filter(prompt => {
      return content.toLowerCase().includes(prompt.toLowerCase().split(' ')[0])
    }).length
    confidence += (addressedPrompts / section.prompts.length) * 0.3
    
    // Check word count
    const wordCount = content.split(' ').length
    if (section.wordLimit) {
      const ratio = Math.min(wordCount / section.wordLimit, 1)
      confidence += ratio * 0.2
    }
    
    return Math.min(confidence, 1)
  }

  private async analyzeSection(
    section: BidSectionContent,
    context: BidContext
  ): Promise<{ strengths: string[], weaknesses: string[], suggestions: BidSuggestion[] }> {
    // In production, this would use NLP analysis
    const strengths: string[] = []
    const weaknesses: string[] = []
    const suggestions: BidSuggestion[] = []
    
    // Check content length
    const wordCount = section.content.split(' ').length
    if (wordCount < 100) {
      weaknesses.push(`Section may be too brief (${wordCount} words)`)
      suggestions.push({
        section: section.sectionId,
        issue: 'Content too brief',
        suggestion: 'Expand with more specific details and examples',
        priority: 'high'
      })
    }
    
    // Check for specific keywords
    const importantKeywords = ['experience', 'qualified', 'certified', 'proven']
    const foundKeywords = importantKeywords.filter(kw => 
      section.content.toLowerCase().includes(kw)
    )
    if (foundKeywords.length > 2) {
      strengths.push('Strong qualification language')
    }
    
    return { strengths, weaknesses, suggestions }
  }

  private calculateReadability(draft: BidDraft): number {
    // Simplified readability calculation
    const fullText = draft.sections.map(s => s.content).join(' ')
    const sentences = fullText.split(/[.!?]+/).length
    const words = fullText.split(/\s+/).length
    const avgWordsPerSentence = words / sentences
    
    // Ideal is 15-20 words per sentence
    if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20) {
      return 90
    } else if (avgWordsPerSentence < 15) {
      return 80 // Too choppy
    } else {
      return 70 - (avgWordsPerSentence - 20) * 2 // Penalize long sentences
    }
  }

  private calculateTechnicalAccuracy(draft: BidDraft, context: BidContext): number {
    // Check if technical requirements are addressed
    let score = 70 // Base score
    const fullText = draft.sections.map(s => s.content).join(' ').toLowerCase()
    
    // Check for capability matches
    const mentionedCapabilities = context.businessProfile.capabilities.filter(cap =>
      fullText.includes(cap.toLowerCase())
    )
    score += (mentionedCapabilities.length / context.businessProfile.capabilities.length) * 20
    
    // Check for certification mentions
    const mentionedCerts = context.businessProfile.certifications.filter(cert =>
      fullText.includes(cert.toLowerCase())
    )
    score += (mentionedCerts.length / Math.max(context.businessProfile.certifications.length, 1)) * 10
    
    return Math.min(score, 100)
  }

  private calculateCulturalAlignment(draft: BidDraft, context: BidContext): number {
    const fullText = draft.sections.map(s => s.content).join(' ').toLowerCase()
    let score = 60 // Base score
    
    // Check for cultural keywords
    const culturalKeywords = [
      'indigenous', 'first nations', 'community', 'elders', 'traditional',
      'sustainable', 'seven generations', 'cultural', 'ceremony', 'respect'
    ]
    
    const foundKeywords = culturalKeywords.filter(kw => fullText.includes(kw))
    score += foundKeywords.length * 4
    
    // Bonus for Indigenous ownership mention
    if (fullText.includes('indigenous owned') || fullText.includes('indigenous business')) {
      score += 10
    }
    
    return Math.min(score, 100)
  }

  private calculateOverallScore(scores: {
    compliance: ComplianceCheck[],
    readability: number,
    technical: number,
    cultural: number,
    completeness: number
  }): number {
    // Weighted average
    const complianceScore = scores.compliance.filter(c => c.status === 'met').length / 
      scores.compliance.length * 100
    
    return (
      complianceScore * 0.4 +
      scores.technical * 0.25 +
      scores.readability * 0.15 +
      scores.cultural * 0.1 +
      scores.completeness * 0.1
    )
  }

  private findRequirementEvidence(content: string, requirement: string): string | undefined {
    // Simple keyword matching - in production would use NLP
    const keywords = requirement.toLowerCase().split(' ')
    const contentLower = content.toLowerCase()
    
    const found = keywords.filter(kw => contentLower.includes(kw)).length > keywords.length * 0.5
    
    if (found) {
      // Extract relevant sentence
      const sentences = content.split('.')
      const relevantSentence = sentences.find(s => 
        keywords.some(kw => s.toLowerCase().includes(kw))
      )
      return relevantSentence?.trim()
    }
    
    return undefined
  }

  private generateRequirementSuggestion(requirement: string): string {
    // Generate helpful suggestion based on requirement type
    if (requirement.toLowerCase().includes('insurance')) {
      return 'Include your insurance coverage details and policy numbers'
    } else if (requirement.toLowerCase().includes('certification')) {
      return 'List all relevant certifications with expiry dates'
    } else if (requirement.toLowerCase().includes('experience')) {
      return 'Provide specific examples of similar projects completed'
    } else {
      return `Ensure you explicitly address: ${requirement}`
    }
  }

  private assessCriteriaCoverage(content: string, criteria: string): number {
    // Simple keyword overlap - in production would use embeddings
    const criteriaWords = criteria.toLowerCase().split(' ')
    const contentWords = content.toLowerCase().split(' ')
    
    const overlap = criteriaWords.filter(word => 
      contentWords.includes(word) && word.length > 3
    ).length
    
    return overlap / criteriaWords.length
  }

  private selectBestTemplate(context: BidContext): BidTemplate | undefined {
    // Find best matching template based on category
    const templates = Array.from(this.templates.values())
    
    return templates.find(t => 
      t.category === context.rfqDetails.category.toLowerCase()
    ) || templates[0]
  }

  private buildImprovementPrompt(
    text: string,
    type: string,
    context?: Partial<BidContext>
  ): string {
    let prompt = `Improve the following bid text for ${type}:\n\n"${text}"\n\n`
    
    switch (type) {
      case 'clarity':
        prompt += 'Make it clearer and more concise without losing meaning.'
        break
      case 'compliance':
        prompt += 'Ensure it fully addresses government procurement requirements.'
        break
      case 'persuasion':
        prompt += 'Make it more compelling and persuasive while remaining factual.'
        break
      case 'technical':
        prompt += 'Enhance technical accuracy and use appropriate industry terminology.'
        break
      case 'cultural':
        prompt += 'Add appropriate Indigenous cultural elements and values.'
        break
    }
    
    if (context?.businessProfile) {
      prompt += `\n\nBusiness context: ${context.businessProfile.name} with capabilities in ${context.businessProfile.capabilities?.join(', ')}`
    }
    
    return prompt
  }

  private getImprovementReason(type: string): string {
    const reasons: Record<string, string> = {
      clarity: 'Simplified language and structure for better readability',
      compliance: 'Enhanced to meet government procurement requirements',
      persuasion: 'Strengthened value proposition and differentiation',
      technical: 'Improved technical accuracy and terminology',
      cultural: 'Added Indigenous perspective and cultural alignment'
    }
    return reasons[type] || 'General improvement'
  }

  private assessImpact(original: string, improved: string): 'high' | 'medium' | 'low' {
    // Simple length comparison - in production would use semantic similarity
    const lengthChange = Math.abs(original.length - improved.length) / original.length
    
    if (lengthChange > 0.3) return 'high'
    if (lengthChange > 0.1) return 'medium'
    return 'low'
  }

  private getMaxTokens(length: string): number {
    switch (length) {
      case 'concise': return 500
      case 'standard': return 1500
      case 'detailed': return 3000
      default: return 1500
    }
  }

  private generateId(): string {
    return `bid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}