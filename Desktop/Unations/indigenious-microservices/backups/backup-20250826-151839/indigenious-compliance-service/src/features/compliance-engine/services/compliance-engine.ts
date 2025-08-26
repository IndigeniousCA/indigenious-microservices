/**
 * Automated Compliance Engine
 * Ensures RFQ submissions meet all government requirements
 * Validates Indigenous business certifications and documentation
 */

import { supabase } from '@/lib/supabase/client'

import { logger } from '@/lib/monitoring/logger';
export interface ComplianceRule {
  id: string
  name: string
  category: 'documentation' | 'certification' | 'financial' | 'technical' | 'indigenous'
  description: string
  severity: 'critical' | 'major' | 'minor' | 'warning'
  validator: (data: unknown) => ValidationResult
  autoFix?: (data: unknown) => any
  references: string[]
}

export interface ValidationResult {
  passed: boolean
  message?: string
  details?: string[]
  suggestedFix?: string
  documentationLink?: string
}

export interface ComplianceReport {
  overallScore: number
  status: 'compliant' | 'non-compliant' | 'needs-review'
  criticalIssues: ComplianceIssue[]
  warnings: ComplianceIssue[]
  suggestions: ComplianceSuggestion[]
  indigenousRequirements: IndigenousCompliance
  timestamp: Date
}

export interface ComplianceIssue {
  ruleId: string
  ruleName: string
  severity: string
  message: string
  section?: string
  lineNumber?: number
  autoFixAvailable: boolean
}

export interface ComplianceSuggestion {
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  estimatedTime: string
  examples?: string[]
}

export interface IndigenousCompliance {
  certificationValid: boolean
  ownershipPercentage: number
  communityBenefitScore: number
  employmentCommitments: boolean
  subcontractingCompliant: boolean
}

export class ComplianceEngine {
  private rules: Map<string, ComplianceRule> = new Map()
  private indigenousRegistry: Set<string> = new Set()
  
  constructor() {
    this.initializeRules()
    this.loadIndigenousRegistry()
  }

  /**
   * Initialize compliance rules based on government requirements
   */
  private initializeRules() {
    // Documentation Rules
    this.addRule({
      id: 'DOC-001',
      name: 'Mandatory Business Registration',
      category: 'documentation',
      description: 'Business must provide valid registration documents',
      severity: 'critical',
      validator: (data) => {
        if (!data.businessRegistration || !data.businessNumber) {
          return {
            passed: false,
            message: 'Missing business registration documentation',
            suggestedFix: 'Upload your business registration certificate and provide your BN/BN9 number'
          }
        }
        
        // Validate BN format (9 digits + optional 4-digit program identifier)
        const bnRegex = /^\d{9}([A-Z]{2}\d{4})?$/
        if (!bnRegex.test(data.businessNumber)) {
          return {
            passed: false,
            message: 'Invalid Business Number format',
            details: ['Business Number must be 9 digits, optionally followed by program identifier (e.g., 123456789RC0001)']
          }
        }
        
        return { passed: true }
      },
      references: ['PSPC Supply Manual 3.10.5', 'CRA Business Number Requirements']
    })

    this.addRule({
      id: 'DOC-002',
      name: 'Insurance Coverage',
      category: 'documentation',
      description: 'Adequate insurance coverage for contract value',
      severity: 'critical',
      validator: (data) => {
        const requiredCoverage = this.calculateRequiredInsurance(data.contractValue)
        
        if (!data.insuranceCoverage) {
          return {
            passed: false,
            message: 'Insurance documentation not provided',
            suggestedFix: `Upload certificate of insurance showing minimum ${requiredCoverage} coverage`
          }
        }
        
        if (data.insuranceCoverage.amount < requiredCoverage) {
          return {
            passed: false,
            message: `Insufficient insurance coverage`,
            details: [
              `Required: ${this.formatCurrency(requiredCoverage)}`,
              `Current: ${this.formatCurrency(data.insuranceCoverage.amount)}`
            ]
          }
        }
        
        // Check expiry
        const expiryDate = new Date(data.insuranceCoverage.expiryDate)
        const contractEnd = new Date(data.contractEndDate)
        if (expiryDate < contractEnd) {
          return {
            passed: false,
            message: 'Insurance expires before contract completion',
            suggestedFix: 'Obtain insurance coverage that extends beyond contract end date'
          }
        }
        
        return { passed: true }
      },
      references: ['TB Contracting Policy 12.3.1']
    })

    // Indigenous Certification Rules
    this.addRule({
      id: 'IND-001',
      name: 'Indigenous Business Certification',
      category: 'indigenous',
      description: 'Valid certification as Indigenous business (51% ownership)',
      severity: 'critical',
      validator: (data) => {
        if (!data.indigenousCertification) {
          return {
            passed: false,
            message: 'Indigenous business certification required',
            details: [
              'Must be certified by CCAB, CAMSC, or recognized Indigenous organization',
              'Business must be at least 51% Indigenous owned and controlled'
            ],
            documentationLink: 'https://www.ccab.com/certification'
          }
        }
        
        // Verify certification is current
        const certDate = new Date(data.indigenousCertification.expiryDate)
        if (certDate < new Date()) {
          return {
            passed: false,
            message: 'Indigenous certification has expired',
            suggestedFix: 'Renew certification with your certifying body'
          }
        }
        
        // Verify against registry
        if (!this.indigenousRegistry.has(data.indigenousCertification.number)) {
          return {
            passed: false,
            message: 'Certification number not found in registry',
            suggestedFix: 'Ensure certification is registered with recognized body'
          }
        }
        
        return { passed: true }
      },
      references: ['Indigenous Procurement Policy', 'CCAB Certification Standards']
    })

    this.addRule({
      id: 'IND-002',
      name: 'Indigenous Employment Commitment',
      category: 'indigenous',
      description: 'Commitment to Indigenous employment targets',
      severity: 'major',
      validator: (data) => {
        if (!data.employmentPlan) {
          return {
            passed: false,
            message: 'Indigenous employment plan not provided',
            suggestedFix: 'Include plan showing how you will achieve Indigenous employment targets'
          }
        }
        
        const currentPercentage = (data.indigenousEmployees / data.totalEmployees) * 100
        const targetPercentage = data.employmentPlan.targetPercentage || 25
        
        if (currentPercentage < 15 && !data.employmentPlan.growthPlan) {
          return {
            passed: false,
            message: 'Low Indigenous employment without growth plan',
            details: [
              `Current: ${currentPercentage.toFixed(1)}% Indigenous employees`,
              `Expected: Clear plan to reach ${targetPercentage}%`
            ]
          }
        }
        
        return { passed: true }
      },
      references: ['Indigenous Services Canada Employment Guidelines']
    })

    // Financial Rules
    this.addRule({
      id: 'FIN-001',
      name: 'Financial Capacity',
      category: 'financial',
      description: 'Demonstrated financial capacity for contract size',
      severity: 'critical',
      validator: (data) => {
        if (!data.financialStatements) {
          return {
            passed: false,
            message: 'Financial statements required for contracts over $100K',
            suggestedFix: 'Provide audited financial statements for past 2 years'
          }
        }
        
        // Check working capital ratio
        const workingCapital = data.financialStatements.currentAssets - data.financialStatements.currentLiabilities
        const monthlyContractValue = data.contractValue / data.contractDuration
        const requiredWorkingCapital = monthlyContractValue * 3 // 3 months coverage
        
        if (workingCapital < requiredWorkingCapital) {
          return {
            passed: false,
            message: 'Insufficient working capital for contract size',
            details: [
              `Available: ${this.formatCurrency(workingCapital)}`,
              `Required: ${this.formatCurrency(requiredWorkingCapital)}`,
              'Consider partnering or obtaining credit facility'
            ]
          }
        }
        
        return { passed: true }
      },
      references: ['PSPC Financial Capacity Guidelines']
    })

    // Technical Rules
    this.addRule({
      id: 'TECH-001',
      name: 'Technical Specifications Compliance',
      category: 'technical',
      description: 'Proposal meets all mandatory technical requirements',
      severity: 'critical',
      validator: (data) => {
        if (!data.technicalProposal) {
          return {
            passed: false,
            message: 'Technical proposal missing',
            suggestedFix: 'Complete all sections of technical requirements'
          }
        }
        
        const mandatoryReqs = data.rfq.mandatoryRequirements || []
        const missing = []
        
        for (const req of mandatoryReqs) {
          if (!data.technicalProposal.responses[req.id]) {
            missing.push(req.title)
          }
        }
        
        if (missing.length > 0) {
          return {
            passed: false,
            message: `Missing ${missing.length} mandatory requirements`,
            details: missing,
            suggestedFix: 'Address all mandatory requirements marked with "M" in RFQ'
          }
        }
        
        return { passed: true }
      },
      references: ['RFQ Technical Evaluation Guide']
    })

    // Security Clearance
    this.addRule({
      id: 'SEC-001',
      name: 'Security Clearance Requirements',
      category: 'documentation',
      description: 'Required security clearances for sensitive contracts',
      severity: 'critical',
      validator: (data) => {
        if (data.rfq.securityLevel === 'none') {
          return { passed: true }
        }
        
        if (!data.securityClearances) {
          return {
            passed: false,
            message: `Security clearance required: ${data.rfq.securityLevel}`,
            suggestedFix: 'Apply for required clearance through PSPC Contract Security Program',
            documentationLink: 'https://www.tpsgc-pwgsc.gc.ca/esc-src/index-eng.html'
          }
        }
        
        // Check clearance levels match
        const requiredLevel = this.getSecurityLevelNumber(data.rfq.securityLevel)
        const actualLevel = this.getSecurityLevelNumber(data.securityClearances.level)
        
        if (actualLevel < requiredLevel) {
          return {
            passed: false,
            message: 'Insufficient security clearance level',
            details: [
              `Required: ${data.rfq.securityLevel}`,
              `Current: ${data.securityClearances.level}`
            ]
          }
        }
        
        return { passed: true }
      },
      references: ['Industrial Security Manual']
    })

    // Subcontracting
    this.addRule({
      id: 'SUB-001',
      name: 'Indigenous Subcontracting',
      category: 'indigenous',
      description: 'Subcontracting to Indigenous businesses',
      severity: 'major',
      validator: (data) => {
        if (!data.subcontractors || data.subcontractors.length === 0) {
          return { passed: true } // No subcontracting
        }
        
        const totalSubcontractValue = data.subcontractors.reduce((sum: number, sub: any) => sum + sub.value, 0)
        const indigenousSubcontractValue = data.subcontractors
          .filter((sub: unknown) => sub.isIndigenous)
          .reduce((sum: number, sub: any) => sum + sub.value, 0)
        
        const indigenousPercentage = (indigenousSubcontractValue / totalSubcontractValue) * 100
        
        if (indigenousPercentage < 33) {
          return {
            passed: false,
            message: 'Insufficient Indigenous subcontracting',
            details: [
              `Current: ${indigenousPercentage.toFixed(1)}% to Indigenous businesses`,
              'Target: Minimum 33% of subcontract value'
            ],
            suggestedFix: 'Partner with Indigenous businesses from the platform directory'
          }
        }
        
        return { passed: true }
      },
      references: ['Indigenous Procurement Transformation']
    })
  }

  /**
   * Validate a complete RFQ submission
   */
  async validateSubmission(submission: unknown): Promise<ComplianceReport> {
    const results: Map<string, ValidationResult> = new Map()
    const criticalIssues: ComplianceIssue[] = []
    const warnings: ComplianceIssue[] = []
    const suggestions: ComplianceSuggestion[] = []
    
    // Run all rules
    for (const [ruleId, rule] of this.rules) {
      try {
        const result = rule.validator(submission)
        results.set(ruleId, result)
        
        if (!result.passed) {
          const issue: ComplianceIssue = {
            ruleId,
            ruleName: rule.name,
            severity: rule.severity,
            message: result.message || 'Validation failed',
            autoFixAvailable: !!rule.autoFix
          }
          
          if (rule.severity === 'critical' || rule.severity === 'major') {
            criticalIssues.push(issue)
          } else {
            warnings.push(issue)
          }
        }
      } catch (error) {
        logger.error(`Error running rule ${ruleId}:`, error)
      }
    }
    
    // Generate suggestions
    suggestions.push(...this.generateSuggestions(submission, results))
    
    // Calculate overall score
    const totalRules = this.rules.size
    const passedRules = Array.from(results.values()).filter(r => r.passed).length
    const overallScore = (passedRules / totalRules) * 100
    
    // Check Indigenous requirements
    const indigenousCompliance = await this.checkIndigenousCompliance(submission)
    
    return {
      overallScore,
      status: criticalIssues.length === 0 ? 'compliant' : 'non-compliant',
      criticalIssues,
      warnings,
      suggestions,
      indigenousRequirements: indigenousCompliance,
      timestamp: new Date()
    }
  }

  /**
   * Auto-fix common compliance issues
   */
  async autoFixIssues(submission: any, issues: ComplianceIssue[]): Promise<unknown> {
    let fixedSubmission = { ...submission }
    
    for (const issue of issues) {
      if (issue.autoFixAvailable) {
        const rule = this.rules.get(issue.ruleId)
        if (rule && rule.autoFix) {
          try {
            fixedSubmission = await rule.autoFix(fixedSubmission)
          } catch (error) {
            logger.error(`Auto-fix failed for ${issue.ruleId}:`, error)
          }
        }
      }
    }
    
    return fixedSubmission
  }

  /**
   * Generate intelligent suggestions based on submission
   */
  private generateSuggestions(submission: any, results: Map<string, ValidationResult>): ComplianceSuggestion[] {
    const suggestions: ComplianceSuggestion[] = []
    
    // Suggest partnerships if capacity is limited
    if (submission.totalEmployees < 10 && submission.contractValue > 500000) {
      suggestions.push({
        title: 'Consider Joint Venture',
        description: 'Your company size suggests partnering could strengthen your bid',
        impact: 'high',
        estimatedTime: '1-2 weeks',
        examples: [
          'Partner with larger Indigenous firm for capacity',
          'Form consortium with complementary businesses',
          'Subcontract specialized portions'
        ]
      })
    }
    
    // Suggest certification upgrades
    if (!submission.certifications || submission.certifications.length < 3) {
      suggestions.push({
        title: 'Enhance Certifications',
        description: 'Additional certifications can improve evaluation scores',
        impact: 'medium',
        estimatedTime: '2-4 weeks',
        examples: [
          'ISO 9001 for quality management',
          'CCAB Progressive Aboriginal Relations',
          'Industry-specific certifications'
        ]
      })
    }
    
    // Suggest value-adds for competitive advantage
    suggestions.push({
      title: 'Indigenous Value Proposition',
      description: 'Highlight unique Indigenous perspectives and community benefits',
      impact: 'high',
      estimatedTime: '2-3 days',
      examples: [
        'Traditional knowledge integration',
        'Community employment programs',
        'Environmental stewardship practices',
        'Elder advisory involvement'
      ]
    })
    
    return suggestions
  }

  /**
   * Check Indigenous-specific compliance requirements
   */
  private async checkIndigenousCompliance(submission: unknown): Promise<IndigenousCompliance> {
    const ownership = submission.indigenousOwnership || 0
    const validCert = await this.verifyIndigenousCertification(submission.certificationNumber)
    
    // Calculate community benefit score
    let benefitScore = 0
    if (submission.localHiring) benefitScore += 20
    if (submission.communityInvestment) benefitScore += 20
    if (submission.skillsTraining) benefitScore += 20
    if (submission.youthPrograms) benefitScore += 20
    if (submission.environmentalCommitments) benefitScore += 20
    
    // Check employment commitments
    const hasEmploymentCommitments = submission.employmentPlan && 
      submission.employmentPlan.indigenousTarget >= 25
    
    // Check subcontracting
    const subcontractingCompliant = this.checkSubcontractingCompliance(submission.subcontractors)
    
    return {
      certificationValid: validCert,
      ownershipPercentage: ownership,
      communityBenefitScore: benefitScore,
      employmentCommitments: hasEmploymentCommitments,
      subcontractingCompliant
    }
  }

  /**
   * Real-time validation for form fields
   */
  validateField(fieldName: string, value: unknown, context?: any): ValidationResult {
    // Business Number validation
    if (fieldName === 'businessNumber') {
      const bnRegex = /^\d{9}([A-Z]{2}\d{4})?$/
      if (!bnRegex.test(value)) {
        return {
          passed: false,
          message: 'Invalid format. Expected: 123456789 or 123456789RC0001'
        }
      }
      return { passed: true }
    }
    
    // Email validation
    if (fieldName === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return {
          passed: false,
          message: 'Invalid email format'
        }
      }
      return { passed: true }
    }
    
    // Contract value validation
    if (fieldName === 'contractValue') {
      if (value < 0) {
        return {
          passed: false,
          message: 'Contract value must be positive'
        }
      }
      if (value > 50000000) {
        return {
          passed: false,
          message: 'Contracts over $50M require special approval process'
        }
      }
      return { passed: true }
    }
    
    return { passed: true }
  }

  // Helper methods
  private addRule(rule: ComplianceRule) {
    this.rules.set(rule.id, rule)
  }
  
  private async loadIndigenousRegistry() {
    // Load from database or external API
    try {
      const { data } = await supabase
        .from('indigenous_business_registry')
        .select('certification_number')
      
      if (data) {
        data.forEach(record => this.indigenousRegistry.add(record.certification_number))
      }
    } catch (error) {
      logger.error('Failed to load Indigenous registry:', error)
    }
  }
  
  private async verifyIndigenousCertification(certNumber: string): Promise<boolean> {
    return this.indigenousRegistry.has(certNumber)
  }
  
  private checkSubcontractingCompliance(subcontractors: unknown[]): boolean {
    if (!subcontractors || subcontractors.length === 0) return true
    
    const totalValue = subcontractors.reduce((sum, sub) => sum + sub.value, 0)
    const indigenousValue = subcontractors
      .filter(sub => sub.isIndigenous)
      .reduce((sum, sub) => sum + sub.value, 0)
    
    return (indigenousValue / totalValue) >= 0.33
  }
  
  private calculateRequiredInsurance(contractValue: number): number {
    if (contractValue < 100000) return 2000000
    if (contractValue < 1000000) return 5000000
    return 10000000
  }
  
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }
  
  private getSecurityLevelNumber(level: string): number {
    const levels: Record<string, number> = {
      'none': 0,
      'reliability': 1,
      'confidential': 2,
      'secret': 3,
      'top-secret': 4
    }
    return levels[level.toLowerCase()] || 0
  }
}