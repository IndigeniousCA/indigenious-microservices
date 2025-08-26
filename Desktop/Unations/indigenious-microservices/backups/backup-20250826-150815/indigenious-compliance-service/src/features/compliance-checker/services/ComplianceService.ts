// Automated Compliance Checking Service
import { 
  ComplianceCheck, RequirementCheck, DocumentCheck, 
  CertificationCheck, EligibilityCheck, FormattingCheck,
  CompletenessCheck, ComplianceRecommendation, AutoFix,
  ComplianceTemplate, ComplianceReport, CheckResult
} from '../types'

export class ComplianceService {
  private templates: Map<string, ComplianceTemplate> = new Map()
  
  constructor() {
    this.loadComplianceTemplates()
  }

  // Main compliance check function
  async checkCompliance(
    rfqId: string,
    businessId: string,
    bidContent: any,
    documents: unknown[],
    certifications: unknown[]
  ): Promise<ComplianceCheck> {
    const template = this.selectTemplate(rfqId)
    if (!template) {
      throw new Error('No compliance template found for this RFQ')
    }

    // Run all checks
    const requirements = await this.checkRequirements(bidContent, template)
    const documentChecks = await this.checkDocuments(documents, template)
    const certChecks = await this.checkCertifications(certifications, template)
    const eligibility = await this.checkEligibility(businessId, template)
    const formatting = await this.checkFormatting(bidContent, template)
    const completeness = await this.checkCompleteness(bidContent, template)

    // Calculate overall score
    const score = this.calculateComplianceScore(
      requirements,
      documentChecks,
      certChecks,
      eligibility,
      formatting,
      completeness
    )

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      requirements,
      documentChecks,
      certChecks,
      eligibility,
      formatting,
      completeness
    )

    // Check for auto-fix opportunities
    const autoFixAvailable = this.checkAutoFixAvailability(
      requirements,
      documentChecks,
      formatting
    )

    return {
      id: `compliance-${Date.now()}`,
      rfqId,
      businessId,
      checkDate: new Date(),
      overallStatus: this.determineOverallStatus(score, requirements),
      score,
      requirements,
      documents: documentChecks,
      certifications: certChecks,
      eligibility,
      formatting,
      completeness,
      recommendations,
      autoFixAvailable,
      autoFixesApplied: []
    }
  }

  private async checkRequirements(
    bidContent: any,
    template: ComplianceTemplate
  ): Promise<RequirementCheck[]> {
    const checks: RequirementCheck[] = []
    
    // Mock requirement checks - in production would use NLP and pattern matching
    const mandatoryRequirements = [
      {
        requirement: 'Valid business registration number',
        regex: /\b\d{9}\b/,
        suggestion: 'Include your 9-digit business registration number'
      },
      {
        requirement: 'Proof of insurance coverage',
        keywords: ['insurance', 'liability', 'coverage'],
        suggestion: 'Attach insurance certificate and mention coverage details'
      },
      {
        requirement: 'Indigenous business certification',
        keywords: ['indigenous', 'certification', 'certified'],
        suggestion: 'Include your Indigenous business certification number'
      },
      {
        requirement: 'Technical approach description',
        minWords: 500,
        suggestion: 'Expand technical approach section to at least 500 words'
      },
      {
        requirement: 'Project timeline with milestones',
        keywords: ['timeline', 'milestone', 'schedule', 'phase'],
        suggestion: 'Add detailed project timeline with key milestones'
      }
    ]

    mandatoryRequirements.forEach((req, index) => {
      const contentStr = JSON.stringify(bidContent).toLowerCase()
      let status: RequirementCheck['status'] = 'not-met'
      let evidence: string | undefined
      
      if (req.regex && req.regex.test(contentStr)) {
        status = 'met'
        const match = contentStr.match(req.regex)
        evidence = match ? `Found: ${match[0]}` : undefined
      } else if (req.keywords) {
        const foundKeywords = req.keywords.filter(kw => contentStr.includes(kw))
        if (foundKeywords.length === req.keywords.length) {
          status = 'met'
          evidence = `Found keywords: ${foundKeywords.join(', ')}`
        } else if (foundKeywords.length > 0) {
          status = 'partial'
          evidence = `Found ${foundKeywords.length}/${req.keywords.length} keywords`
        }
      } else if (req.minWords) {
        const wordCount = contentStr.split(/\s+/).length
        if (wordCount >= req.minWords) {
          status = 'met'
          evidence = `Word count: ${wordCount}`
        } else {
          status = 'partial'
          evidence = `Word count: ${wordCount} (minimum: ${req.minWords})`
        }
      }
      
      checks.push({
        id: `req-${index}`,
        requirement: req.requirement,
        category: 'mandatory',
        status,
        evidence,
        suggestion: status !== 'met' ? req.suggestion : undefined,
        autoFixable: false
      })
    })
    
    // Add some rated requirements
    const ratedRequirements = [
      {
        requirement: 'Environmental sustainability plan',
        keywords: ['sustainable', 'environment', 'green'],
        maxScore: 10
      },
      {
        requirement: 'Community benefit description',
        keywords: ['community', 'benefit', 'local', 'employment'],
        maxScore: 15
      },
      {
        requirement: 'Innovation in approach',
        keywords: ['innovative', 'novel', 'cutting-edge', 'unique'],
        maxScore: 10
      }
    ]
    
    ratedRequirements.forEach((req, index) => {
      const contentStr = JSON.stringify(bidContent).toLowerCase()
      const foundKeywords = req.keywords.filter(kw => contentStr.includes(kw))
      const score = (foundKeywords.length / req.keywords.length) * req.maxScore
      
      checks.push({
        id: `rated-${index}`,
        requirement: req.requirement,
        category: 'rated',
        status: score > 0 ? 'met' : 'not-met',
        score: Math.round(score),
        maxScore: req.maxScore,
        evidence: foundKeywords.length > 0 ? `Found: ${foundKeywords.join(', ')}` : undefined,
        autoFixable: false
      })
    })
    
    return checks
  }

  private async checkDocuments(
    documents: unknown[],
    template: ComplianceTemplate
  ): Promise<DocumentCheck[]> {
    const checks: DocumentCheck[] = []
    
    const requiredDocs = [
      {
        type: 'Business Registration',
        formats: ['pdf', 'jpg', 'png'],
        maxSize: 5 * 1024 * 1024, // 5MB
        requiresDate: true
      },
      {
        type: 'Insurance Certificate',
        formats: ['pdf'],
        maxSize: 10 * 1024 * 1024,
        requiresSignature: true
      },
      {
        type: 'Financial Statements',
        formats: ['pdf', 'xlsx'],
        maxSize: 20 * 1024 * 1024,
        requiresDate: true
      },
      {
        type: 'Indigenous Certification',
        formats: ['pdf'],
        maxSize: 5 * 1024 * 1024,
        requiresSignature: true
      }
    ]
    
    requiredDocs.forEach((reqDoc, index) => {
      const providedDoc = documents.find(d => 
        d.type === reqDoc.type || d.name.toLowerCase().includes(reqDoc.type.toLowerCase())
      )
      
      if (providedDoc) {
        const issues: DocumentIssue[] = []
        
        // Check format
        const fileExt = providedDoc.name.split('.').pop()?.toLowerCase()
        if (!reqDoc.formats.includes(fileExt || '')) {
          issues.push({
            type: 'format',
            severity: 'critical',
            description: `Invalid format: ${fileExt}. Accepted: ${reqDoc.formats.join(', ')}`,
            suggestion: `Convert to ${reqDoc.formats[0].toUpperCase()} format`
          })
        }
        
        // Check size
        if (providedDoc.size > reqDoc.maxSize) {
          issues.push({
            type: 'size',
            severity: 'major',
            description: `File too large: ${(providedDoc.size / (1024 * 1024)).toFixed(1)}MB`,
            suggestion: `Compress file to under ${reqDoc.maxSize / (1024 * 1024)}MB`
          })
        }
        
        checks.push({
          id: `doc-${index}`,
          documentType: reqDoc.type,
          required: true,
          status: issues.length === 0 ? 'provided' : 'invalid',
          fileName: providedDoc.name,
          issues,
          autoFixable: issues.some(i => i.type === 'size')
        })
      } else {
        checks.push({
          id: `doc-${index}`,
          documentType: reqDoc.type,
          required: true,
          status: 'missing',
          issues: [{
            type: 'content',
            severity: 'critical',
            description: 'Document not provided',
            suggestion: `Upload ${reqDoc.type} in ${reqDoc.formats.join(' or ')} format`
          }],
          autoFixable: false
        })
      }
    })
    
    return checks
  }

  private async checkCertifications(
    certifications: unknown[],
    template: ComplianceTemplate
  ): Promise<CertificationCheck[]> {
    const checks: CertificationCheck[] = []
    
    const requiredCerts = [
      {
        type: 'Indigenous Business Certification',
        issuers: ['CCAB', 'CAMSC', 'Provincial Certifiers'],
        minValidityDays: 30
      },
      {
        type: 'ISO 9001 Quality Management',
        issuers: ['Accredited Certification Bodies'],
        minValidityDays: 90,
        alternativeAccepted: true
      },
      {
        type: 'Security Clearance',
        issuers: ['Government of Canada'],
        minValidityDays: 180
      }
    ]
    
    requiredCerts.forEach((reqCert, index) => {
      const providedCert = certifications.find(c => 
        c.type === reqCert.type || c.name?.includes(reqCert.type)
      )
      
      if (providedCert) {
        const expiryDate = new Date(providedCert.expiryDate)
        const today = new Date()
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        let status: CertificationCheck['status'] = 'valid'
        if (daysUntilExpiry < 0) {
          status = 'expired'
        } else if (daysUntilExpiry < reqCert.minValidityDays) {
          status = 'valid' // But will note the upcoming expiry
        }
        
        checks.push({
          id: `cert-${index}`,
          certificationType: reqCert.type,
          required: true,
          status,
          certificationNumber: providedCert.number,
          issuer: providedCert.issuer,
          issueDate: new Date(providedCert.issueDate),
          expiryDate,
          daysUntilExpiry,
          renewalLink: this.getCertificationRenewalLink(reqCert.type),
          alternativeAccepted: reqCert.alternativeAccepted
        })
      } else {
        checks.push({
          id: `cert-${index}`,
          certificationType: reqCert.type,
          required: true,
          status: 'missing',
          renewalLink: this.getCertificationRenewalLink(reqCert.type),
          alternativeAccepted: reqCert.alternativeAccepted
        })
      }
    })
    
    return checks
  }

  private async checkEligibility(
    businessId: string,
    template: ComplianceTemplate
  ): Promise<EligibilityCheck[]> {
    // Mock eligibility checks - in production would query business profile
    return [
      {
        id: 'elig-1',
        criteria: 'Indigenous business (51% or more Indigenous owned)',
        category: 'indigenous-status',
        status: 'eligible',
        evidence: '100% Indigenous owned',
        waiverable: false
      },
      {
        id: 'elig-2',
        criteria: 'Small or Medium Enterprise (< 500 employees)',
        category: 'business-size',
        status: 'eligible',
        evidence: '45 employees',
        waiverable: false
      },
      {
        id: 'elig-3',
        criteria: 'Located in eligible region',
        category: 'location',
        status: 'eligible',
        evidence: 'Headquarters in Ontario',
        waiverable: true
      },
      {
        id: 'elig-4',
        criteria: 'Minimum 3 years in business',
        category: 'experience',
        status: 'eligible',
        evidence: 'Incorporated 2018 (6 years)',
        waiverable: true,
        waiverProcess: 'Submit alternative experience documentation'
      },
      {
        id: 'elig-5',
        criteria: 'Financial capacity for project size',
        category: 'financial',
        status: 'conditional',
        evidence: 'May require bonding for projects over $1M',
        reason: 'Project value exceeds typical contract size',
        waiverable: true,
        waiverProcess: 'Provide bonding or parent company guarantee'
      }
    ]
  }

  private async checkFormatting(
    bidContent: any,
    template: ComplianceTemplate
  ): Promise<FormattingCheck[]> {
    return [
      {
        id: 'fmt-1',
        element: 'Page numbering',
        requirement: 'All pages must be numbered (Page X of Y)',
        status: 'incorrect',
        location: 'Throughout document',
        example: 'Page 1 of 45',
        autoFixed: false
      },
      {
        id: 'fmt-2',
        element: 'Font size',
        requirement: 'Minimum 11pt font, 12pt preferred',
        status: 'correct',
        autoFixed: false
      },
      {
        id: 'fmt-3',
        element: 'Margins',
        requirement: 'Minimum 1 inch margins on all sides',
        status: 'correct',
        autoFixed: false
      },
      {
        id: 'fmt-4',
        element: 'Section headers',
        requirement: 'All sections must have clear headers',
        status: 'correct',
        autoFixed: false
      },
      {
        id: 'fmt-5',
        element: 'File naming',
        requirement: 'Follow naming convention: [RFQ#]_[Company]_[Section]',
        status: 'incorrect',
        example: 'RFQ2024-001_Indigenious_TechnicalProposal.pdf',
        autoFixed: true
      }
    ]
  }

  private async checkCompleteness(
    bidContent: any,
    template: ComplianceTemplate
  ): Promise<CompletenessCheck[]> {
    return [
      {
        section: 'Executive Summary',
        required: true,
        status: 'complete',
        completionPercentage: 100,
        missingElements: [],
        wordCount: { current: 523, minimum: 300, maximum: 600 },
        suggestions: []
      },
      {
        section: 'Technical Approach',
        required: true,
        status: 'incomplete',
        completionPercentage: 75,
        missingElements: ['Risk mitigation plan', 'Quality assurance process'],
        wordCount: { current: 1876, minimum: 1500 },
        suggestions: [
          'Add detailed risk mitigation strategies',
          'Include QA/QC procedures and checkpoints'
        ]
      },
      {
        section: 'Project Team',
        required: true,
        status: 'complete',
        completionPercentage: 100,
        missingElements: [],
        wordCount: { current: 892 },
        suggestions: []
      },
      {
        section: 'Past Performance',
        required: true,
        status: 'incomplete',
        completionPercentage: 60,
        missingElements: ['Client references', 'Performance metrics'],
        suggestions: [
          'Add 3-5 client references with contact information',
          'Include specific performance metrics (on-time, on-budget %)'
        ]
      },
      {
        section: 'Indigenous Benefits Plan',
        required: false,
        status: 'complete',
        completionPercentage: 100,
        missingElements: [],
        wordCount: { current: 678 },
        suggestions: []
      }
    ]
  }

  private calculateComplianceScore(
    requirements: RequirementCheck[],
    documents: DocumentCheck[],
    certifications: CertificationCheck[],
    eligibility: EligibilityCheck[],
    formatting: FormattingCheck[],
    completeness: CompletenessCheck[]
  ): number {
    let totalScore = 0
    let totalWeight = 0
    
    // Requirements (40% weight)
    const mandatoryReqs = requirements.filter(r => r.category === 'mandatory')
    const mandatoryMet = mandatoryReqs.filter(r => r.status === 'met').length
    const reqScore = (mandatoryMet / mandatoryReqs.length) * 100
    totalScore += reqScore * 0.4
    totalWeight += 0.4
    
    // Documents (20% weight)
    const docsMet = documents.filter(d => d.status === 'provided').length
    const docScore = (docsMet / documents.length) * 100
    totalScore += docScore * 0.2
    totalWeight += 0.2
    
    // Certifications (15% weight)
    const certsValid = certifications.filter(c => c.status === 'valid').length
    const certScore = (certsValid / certifications.length) * 100
    totalScore += certScore * 0.15
    totalWeight += 0.15
    
    // Eligibility (15% weight)
    const eligible = eligibility.filter(e => e.status === 'eligible').length
    const eligScore = (eligible / eligibility.length) * 100
    totalScore += eligScore * 0.15
    totalWeight += 0.15
    
    // Completeness (10% weight)
    const avgCompleteness = completeness.reduce((sum, c) => sum + c.completionPercentage, 0) / completeness.length
    totalScore += avgCompleteness * 0.1
    totalWeight += 0.1
    
    return Math.round(totalScore / totalWeight)
  }

  private determineOverallStatus(
    score: number,
    requirements: RequirementCheck[]
  ): ComplianceCheck['overallStatus'] {
    const mandatoryFailed = requirements.filter(r => 
      r.category === 'mandatory' && r.status === 'not-met'
    ).length
    
    if (mandatoryFailed > 0) return 'fail'
    if (score >= 80) return 'pass'
    if (score >= 60) return 'warning'
    return 'fail'
  }

  private generateRecommendations(
    requirements: RequirementCheck[],
    documents: DocumentCheck[],
    certifications: CertificationCheck[],
    eligibility: EligibilityCheck[],
    formatting: FormattingCheck[],
    completeness: CompletenessCheck[]
  ): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = []
    
    // Check mandatory requirements
    requirements
      .filter(r => r.category === 'mandatory' && r.status !== 'met')
      .forEach(req => {
        recommendations.push({
          id: `rec-req-${req.id}`,
          priority: 'critical',
          category: 'Requirements',
          issue: `Mandatory requirement not met: ${req.requirement}`,
          impact: 'Bid will be disqualified',
          recommendation: req.suggestion || 'Address this requirement immediately',
          effort: 'medium',
          timeEstimate: '1-2 hours',
          automatable: req.autoFixable
        })
      })
    
    // Check missing documents
    documents
      .filter(d => d.status === 'missing')
      .forEach(doc => {
        recommendations.push({
          id: `rec-doc-${doc.id}`,
          priority: 'critical',
          category: 'Documentation',
          issue: `Missing required document: ${doc.documentType}`,
          impact: 'Bid may be rejected',
          recommendation: doc.issues[0]?.suggestion || 'Upload required document',
          effort: 'low',
          timeEstimate: '30 minutes',
          automatable: false
        })
      })
    
    // Check expiring certifications
    certifications
      .filter(c => c.daysUntilExpiry && c.daysUntilExpiry < 90)
      .forEach(cert => {
        recommendations.push({
          id: `rec-cert-${cert.id}`,
          priority: cert.daysUntilExpiry! < 30 ? 'high' : 'medium',
          category: 'Certifications',
          issue: `Certification expiring soon: ${cert.certificationType}`,
          impact: `Expires in ${cert.daysUntilExpiry} days`,
          recommendation: 'Renew certification before bid submission',
          effort: 'high',
          timeEstimate: '1-4 weeks',
          resources: cert.renewalLink ? [cert.renewalLink] : undefined,
          automatable: false
        })
      })
    
    // Check incomplete sections
    completeness
      .filter(c => c.status === 'incomplete' && c.required)
      .forEach(section => {
        recommendations.push({
          id: `rec-complete-${section.section}`,
          priority: 'high',
          category: 'Completeness',
          issue: `Incomplete section: ${section.section}`,
          impact: `Only ${section.completionPercentage}% complete`,
          recommendation: section.suggestions.join('; '),
          effort: 'medium',
          timeEstimate: '2-4 hours',
          automatable: false
        })
      })
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  private checkAutoFixAvailability(
    requirements: RequirementCheck[],
    documents: DocumentCheck[],
    formatting: FormattingCheck[]
  ): boolean {
    return requirements.some(r => r.autoFixable) ||
           documents.some(d => d.autoFixable) ||
           formatting.some(f => f.status === 'incorrect' && f.autoFixed !== false)
  }

  // Auto-fix functionality
  async applyAutoFixes(
    checkId: string,
    selectedFixes: string[]
  ): Promise<AutoFix[]> {
    const fixes: AutoFix[] = []
    
    // Mock auto-fix implementation
    selectedFixes.forEach(fixId => {
      fixes.push({
        id: fixId,
        type: 'formatting',
        description: 'Fixed file naming convention',
        status: 'applied',
        before: 'TechnicalProposal_Final.pdf',
        after: 'RFQ2024-001_Indigenious_TechnicalProposal.pdf',
        timestamp: new Date(),
        reversible: true
      })
    })
    
    return fixes
  }

  // Generate compliance report
  async generateReport(
    checkId: string,
    format: 'pdf' | 'html' | 'json' | 'excel'
  ): Promise<ComplianceReport> {
    // In production, would generate actual report files
    return {
      id: `report-${Date.now()}`,
      checkId,
      generatedDate: new Date(),
      format,
      sections: [
        {
          title: 'Executive Summary',
          status: 'warning',
          findings: 8,
          criticalIssues: 2,
          content: 'Overall compliance score: 72%. Critical issues found in mandatory requirements.'
        },
        {
          title: 'Requirements Compliance',
          status: 'warning',
          findings: 5,
          criticalIssues: 2,
          content: 'Missing business registration number and insurance proof.'
        },
        {
          title: 'Documentation Review',
          status: 'fail',
          findings: 3,
          criticalIssues: 1,
          content: 'Missing required documents: Financial Statements'
        }
      ],
      summary: {
        overallScore: 72,
        totalRequirements: 25,
        metRequirements: 18,
        partialRequirements: 4,
        failedRequirements: 3,
        mandatoryFailures: 2,
        estimatedFixTime: '4-6 hours',
        readyToSubmit: false
      },
      detailedFindings: [],
      actionPlan: []
    }
  }

  private getCertificationRenewalLink(certType: string): string {
    const renewalLinks = {
      'Indigenous Business Certification': 'https://www.ccab.com/certification',
      'ISO 9001 Quality Management': 'https://www.iso.org/certification',
      'Security Clearance': 'https://www.tpsgc-pwgsc.gc.ca/esc-src'
    }
    return renewalLinks[certType] || '#'
  }

  private selectTemplate(rfqId: string): ComplianceTemplate {
    // In production, would select based on RFQ type
    return this.templates.get('default')!
  }

  private loadComplianceTemplates() {
    // Load default template
    this.templates.set('default', {
      id: 'default',
      name: 'Standard Government RFQ',
      category: 'general',
      rfqType: 'services',
      version: '1.0',
      lastUpdated: new Date(),
      rules: [],
      documentRequirements: [],
      certificationRequirements: [],
      scoringCriteria: []
    })
  }
}