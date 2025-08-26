// First Nations Community-Controlled RFQ Analysis System
// Communities decide what criteria matter to THEM when evaluating tenders

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Community Analysis Control System
export function withCommunityRFQControl(Component: ComponentType<any>): ComponentType<any> {
  return (props: any) => {
    const [communityPriorities, setCommunityPriorities] = useState({
      // What THIS community values in government contracts
      local_employment_weight: 25,      // Jobs for OUR people
      cultural_respect_weight: 20,      // Respects our traditions
      land_protection_weight: 15,       // Protects our territory  
      local_business_weight: 15,        // Uses our businesses
      skills_transfer_weight: 10,       // Teaches our youth
      language_preservation_weight: 8,   // Supports our language
      community_investment_weight: 7     // Invests back in community
    })

    const [communityContext, setCommunityContext] = useState({
      community_name: '',
      treaty_territory: '',
      traditional_territory: '',
      population: 0,
      unemployment_rate: 0,
      priority_needs: [],              // Housing, health, education, etc.
      cultural_priorities: [],         // Language, ceremony, land use
      economic_goals: [],              // What economic development they want
      environmental_concerns: []        // Specific to their territory
    })

    // Community defines their own evaluation criteria
    async function setCommunityEvaluationCriteria(communityId: string, criteria: any) {
      try {
        const { data, error } = await supabase
          .from('community_rfq_criteria')
          .upsert({
            community_id: communityId,
            evaluation_weights: communityPriorities,
            community_context: communityContext,
            custom_criteria: criteria.custom_criteria || [],
            deal_breakers: criteria.deal_breakers || [],    // Automatic rejections
            bonus_factors: criteria.bonus_factors || [],     // Extra points
            created_by: props.user?.id,
            updated_at: new Date().toISOString()
          })

        if (error) throw error
        return { success: true, data }
      } catch (error) {
        console.error('Community criteria setup error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    // Analyze RFQ from THIS community's perspective
    async function analyzeTenderForCommunity(rfqId: string, communityId: string) {
      try {
        // Get community's evaluation criteria
        const { data: criteria } = await supabase
          .from('community_rfq_criteria')
          .select('*')
          .eq('community_id', communityId)
          .single()

        // Get RFQ details
        const { data: rfq } = await supabase
          .from('rfqs')
          .select('*')
          .eq('id', rfqId)
          .single()

        if (!criteria || !rfq) return null

        const weights = criteria.evaluation_weights
        const context = criteria.community_context
        let totalScore = 0
        let analysis = {
          overall_score: 0,
          component_scores: {} as any,
          community_concerns: [] as string[],
          opportunities: [] as string[],
          recommendations: [] as string[],
          deal_breaker_triggered: false
        }

        // 1. Local Employment Impact
        const employmentScore = analyzeLocalEmployment(rfq, context)
        analysis.component_scores.local_employment = employmentScore
        totalScore += (employmentScore * weights.local_employment_weight / 100)

        // 2. Cultural Respect Assessment
        const culturalScore = analyzeCulturalRespect(rfq, context)
        analysis.component_scores.cultural_respect = culturalScore
        totalScore += (culturalScore * weights.cultural_respect_weight / 100)

        // 3. Land Protection Impact
        const landScore = analyzeLandProtection(rfq, context)
        analysis.component_scores.land_protection = landScore
        totalScore += (landScore * weights.land_protection_weight / 100)

        // 4. Local Business Opportunities
        const businessScore = analyzeLocalBusinessOpportunities(rfq, context)
        analysis.component_scores.local_business = businessScore
        totalScore += (businessScore * weights.local_business_weight / 100)

        // 5. Skills Transfer & Training
        const skillsScore = analyzeSkillsTransfer(rfq, context)
        analysis.component_scores.skills_transfer = skillsScore
        totalScore += (skillsScore * weights.skills_transfer_weight / 100)

        // 6. Language Preservation
        const languageScore = analyzeLanguageImpact(rfq, context)
        analysis.component_scores.language_preservation = languageScore
        totalScore += (languageScore * weights.language_preservation_weight / 100)

        // 7. Community Investment
        const investmentScore = analyzeCommunityInvestment(rfq, context)
        analysis.component_scores.community_investment = investmentScore
        totalScore += (investmentScore * weights.community_investment_weight / 100)

        // Check for deal breakers
        analysis.deal_breaker_triggered = checkDealBreakers(rfq, criteria.deal_breakers)

        analysis.overall_score = analysis.deal_breaker_triggered ? 0 : Math.round(totalScore)

        // Generate community-specific recommendations
        analysis.recommendations = generateCommunityRecommendations(analysis, context)

        // Store analysis
        await supabase
          .from('community_rfq_analyses')
          .upsert({
            rfq_id: rfqId,
            community_id: communityId,
            analysis_results: analysis,
            analyzed_at: new Date().toISOString(),
            analyzed_by: props.user?.id
          })

        return analysis
      } catch (error) {
        console.error('Community RFQ analysis error:', error)
        return null
      }
    }

    // Analyze if this tender will create jobs for OUR people
    function analyzeLocalEmployment(rfq: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Does it require local hiring?
      if (rfq.local_hiring_requirement) score += 30

      // Does it create jobs in our priority areas?
      const ourPriorities = context.priority_needs || []
      const rfqAreas = rfq.service_areas || []
      const areaMatch = ourPriorities.some((priority: any) => rfqAreas.includes(priority))
      if (areaMatch) score += 25

      // Will it reduce our unemployment?
      const estimatedJobs = rfq.estimated_local_jobs || 0
      const ourUnemployment = context.unemployment_rate || 0
      if (estimatedJobs > 0 && ourUnemployment > 10) score += 20

      // Training opportunities for our youth?
      if (rfq.training_opportunities || rfq.apprenticeship_programs) score += 15

      // Sustainable employment (not just temporary)?
      if (rfq.contract_duration_months > 12) score += 10

      return Math.min(score, maxScore)
    }

    // Does this respect our culture and traditions?
    function analyzeCulturalRespect(rfq: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Mentions cultural consultation?
      if (rfq.indigenous_consultation_required) score += 30

      // Requires cultural awareness training?
      if (rfq.cultural_training_required) score += 25

      // Respects sacred sites/traditional areas?
      if (rfq.traditional_territory_acknowledgment) score += 20

      // Involves community elders?
      if (rfq.elder_involvement || rfq.traditional_knowledge_integration) score += 15

      // Uses appropriate protocols?
      if (rfq.cultural_protocols_specified) score += 10

      return Math.min(score, maxScore)
    }

    // Will this protect or harm our land?
    function analyzeLandProtection(rfq: any, context: any): number {
      let score = 50 // Neutral baseline
      const maxScore = 100

      // Environmental benefits
      if (rfq.environmental_benefits) score += 30
      if (rfq.habitat_restoration) score += 20

      // Environmental risks
      if (rfq.environmental_risks?.length > 0) score -= 30
      if (rfq.potential_contamination) score -= 40

      // Our specific environmental concerns
      const ourConcerns = context.environmental_concerns || []
      const rfqActivities = rfq.project_activities || []
      
      ourConcerns.forEach((concern: any) => {
        if (rfqActivities.some((activity: any) => activity.includes(concern))) {
          score -= 20 // Penalize activities that trigger our concerns
        }
      })

      return Math.max(0, Math.min(score, maxScore))
    }

    // Will this create opportunities for our businesses?
    function analyzeLocalBusinessOpportunities(rfq: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Requires Indigenous business participation?
      if (rfq.indigenous_business_requirement > 0) {
        score += Math.min(rfq.indigenous_business_requirement, 40)
      }

      // Local procurement requirements?
      if (rfq.local_procurement_percentage > 0) {
        score += Math.min(rfq.local_procurement_percentage * 0.5, 25)
      }

      // Subcontracting opportunities?
      if (rfq.subcontracting_opportunities) score += 20

      // Capacity building for local businesses?
      if (rfq.business_development_support) score += 15

      return Math.min(score, maxScore)
    }

    // Will this teach skills to our people?
    function analyzeSkillsTransfer(rfq: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Formal training programs?
      if (rfq.training_programs_included) score += 30

      // Skills match our needs?
      const ourNeeds = context.priority_needs || []
      const rfqSkills = rfq.skills_developed || []
      const skillsMatch = ourNeeds.some((need: any) => rfqSkills.includes(need))
      if (skillsMatch) score += 25

      // Certification opportunities?
      if (rfq.certification_opportunities) score += 20

      // Mentorship programs?
      if (rfq.mentorship_programs) score += 15

      // Technology transfer?
      if (rfq.technology_transfer) score += 10

      return Math.min(score, maxScore)
    }

    // Will this support our language and culture?
    function analyzeLanguageImpact(rfq: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Requires services in our language?
      if (rfq.indigenous_language_services) score += 40

      // Supports language preservation?
      if (rfq.language_preservation_component) score += 30

      // Cultural documentation/preservation?
      if (rfq.cultural_documentation) score += 20

      // Community cultural programs?
      if (rfq.cultural_programs_support) score += 10

      return Math.min(score, maxScore)
    }

    // Will this invest back in our community?
    function analyzeCommunityInvestment(rfq: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Direct community investment required?
      const investmentPercentage = rfq.community_investment_percentage || 0
      score += Math.min(investmentPercentage * 2, 40)

      // Supports our priority infrastructure?
      const ourPriorities = context.priority_needs || []
      const rfqInvestments = rfq.infrastructure_investments || []
      const investmentMatch = ourPriorities.some((priority: any) => 
        rfqInvestments.includes(priority)
      )
      if (investmentMatch) score += 30

      // Creates lasting benefits?
      if (rfq.long_term_community_benefits) score += 20

      // Revenue sharing?
      if (rfq.revenue_sharing_model) score += 10

      return Math.min(score, maxScore)
    }

    // Check if this tender violates our absolute requirements
    function checkDealBreakers(rfq: any, dealBreakers: string[]): boolean {
      for (const breaker of dealBreakers || []) {
        switch (breaker) {
          case 'no_environmental_harm':
            if (rfq.environmental_risks?.length > 0) return true
            break
          case 'no_sacred_site_interference':
            if (rfq.affects_sacred_sites) return true
            break
          case 'requires_cultural_consultation':
            if (!rfq.indigenous_consultation_required) return true
            break
          case 'minimum_local_employment':
            if ((rfq.local_hiring_percentage || 0) < 50) return true
            break
        }
      }
      return false
    }

    // Generate recommendations specific to this community
    function generateCommunityRecommendations(analysis: any, context: any): string[] {
      const recommendations = []

      if (analysis.component_scores.local_employment < 60) {
        recommendations.push(`Negotiate higher local employment commitment (current scoring: ${analysis.component_scores.local_employment}%)`)
      }

      if (analysis.component_scores.cultural_respect < 50) {
        recommendations.push("Require cultural awareness training for all personnel")
        recommendations.push("Mandate elder consultation throughout project")
      }

      if (analysis.component_scores.land_protection < 70) {
        recommendations.push("Request detailed environmental protection plan")
        recommendations.push("Require environmental monitoring by community")
      }

      if (analysis.component_scores.local_business < 40) {
        recommendations.push("Increase Indigenous business participation requirements")
        recommendations.push("Create subcontracting opportunities for local businesses")
      }

      return recommendations
    }

    return (
      <Component 
        {...props}
        communityPriorities={communityPriorities}
        setCommunityPriorities={setCommunityPriorities}
        communityContext={communityContext}
        setCommunityContext={setCommunityContext}
        setCommunityEvaluationCriteria={setCommunityEvaluationCriteria}
        analyzeTenderForCommunity={analyzeTenderForCommunity}
      />
    )
  }
}