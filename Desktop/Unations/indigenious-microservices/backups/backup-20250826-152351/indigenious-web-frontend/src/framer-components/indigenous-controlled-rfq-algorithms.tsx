// Indigenous-Controlled RFQ Matching Algorithms
// This gives Indigenous businesses control over their own scoring and matching

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Indigenous Business Self-Assessment and Algorithm Control
export function withIndigenousAlgorithmControl(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [businessProfile, setBusinessProfile] = useState(null)
    const [algorithmSettings, setAlgorithmSettings] = useState({
      climate_weight: 30,        // How much climate impact matters to THIS business
      local_jobs_weight: 25,     // How much local hiring matters
      indigenous_employment_weight: 20,  // Indigenous hiring priority
      community_benefit_weight: 15,      // Community impact
      price_competitiveness_weight: 10   // Price (lowest weight = not just cheapest)
    })
    const [climatePriorities, setClimatePriorities] = useState({
      carbon_neutral: true,
      renewable_energy: true,
      sustainable_materials: true,
      waste_reduction: true,
      land_protection: true
    })

    // Indigenous Business Profile Setup
    async function setupBusinessProfile(businessId: number, profileData: any) {
      try {
        const { data, error } = await supabase
          .from('indigenous_business_profiles')
          .upsert({
            business_id: businessId,
            community_name: profileData.community_name,
            treaty_territory: profileData.treaty_territory,
            traditional_knowledge_areas: profileData.traditional_knowledge_areas,
            climate_commitments: profileData.climate_commitments,
            local_hiring_goals: profileData.local_hiring_goals,
            indigenous_employment_target: profileData.indigenous_employment_target,
            community_investment_percentage: profileData.community_investment_percentage,
            algorithm_preferences: algorithmSettings,
            climate_priorities: climatePriorities,
            updated_at: new Date().toISOString()
          })
          .select()

        if (error) throw error
        setBusinessProfile(data[0])
        return data[0]
      } catch (error) {
        console.error('Profile setup error:', error)
      }
    }

    // Calculate Indigenous-Controlled Match Score
    async function calculateIndigenousMatchScore(rfqId: string, businessId: number) {
      try {
        // Get RFQ details
        const { data: rfq } = await supabase
          .from('rfqs')
          .select('*')
          .eq('id', rfqId)
          .single()

        // Get business profile with algorithm preferences
        const { data: business } = await supabase
          .from('indigenous_business_profiles')
          .select('*')
          .eq('business_id', businessId)
          .single()

        if (!rfq || !business) return 0

        let totalScore = 0
        const weights = business.algorithm_preferences || algorithmSettings

        // 1. Climate Impact Score (Indigenous-prioritized)
        const climateScore = calculateClimateImpactScore(rfq, business)
        totalScore += (climateScore * weights.climate_weight / 100)

        // 2. Local Job Creation Score
        const localJobsScore = calculateLocalJobsScore(rfq, business)
        totalScore += (localJobsScore * weights.local_jobs_weight / 100)

        // 3. Indigenous Employment Score
        const indigenousJobsScore = calculateIndigenousEmploymentScore(rfq, business)
        totalScore += (indigenousJobsScore * weights.indigenous_employment_weight / 100)

        // 4. Community Benefit Score
        const communityScore = calculateCommunityBenefitScore(rfq, business)
        totalScore += (communityScore * weights.community_benefit_weight / 100)

        // 5. Price Competitiveness (lowest weight)
        const priceScore = calculatePriceCompetitivenessScore(rfq, business)
        totalScore += (priceScore * weights.price_competitiveness_weight / 100)

        // Store the calculated score
        await supabase
          .from('rfq_match_scores')
          .upsert({
            rfq_id: rfqId,
            business_id: businessId,
            total_score: Math.round(totalScore),
            climate_score: climateScore,
            local_jobs_score: localJobsScore,
            indigenous_jobs_score: indigenousJobsScore,
            community_score: communityScore,
            price_score: priceScore,
            algorithm_version: 'indigenous_controlled_v1',
            calculated_at: new Date().toISOString()
          })

        return Math.round(totalScore)
      } catch (error) {
        console.error('Match score calculation error:', error)
        return 0
      }
    }

    // Climate Impact Scoring (Mark Carney would love this)
    function calculateClimateImpactScore(rfq: any, business: any): number {
      let score = 0
      const maxScore = 100

      // Indigenous traditional ecological knowledge bonus
      if (business.traditional_knowledge_areas?.includes('environmental_stewardship')) {
        score += 20
      }

      // Climate commitments alignment
      const businessClimate = business.climate_commitments || {}
      const rfqClimate = rfq.climate_requirements || {}

      // Carbon neutrality
      if (businessClimate.carbon_neutral && rfqClimate.requires_carbon_neutral) {
        score += 25
      }

      // Renewable energy usage
      if (businessClimate.renewable_energy_percentage > 50) {
        score += 20
      }

      // Sustainable materials
      if (businessClimate.sustainable_materials && rfqClimate.sustainable_materials_required) {
        score += 15
      }

      // Land/water protection initiatives
      if (businessClimate.land_protection_initiatives) {
        score += 10
      }

      // Indigenous climate leadership bonus
      if (business.climate_leadership_recognition) {
        score += 10
      }

      return Math.min(score, maxScore)
    }

    // Local Jobs Score (Community-first approach)
    function calculateLocalJobsScore(rfq: any, business: any): number {
      let score = 0
      const maxScore = 100

      // Local hiring percentage
      const localHiringRate = business.local_hiring_goals?.target_percentage || 0
      score += Math.min(localHiringRate, 80) // Max 80 points for local hiring

      // Job creation commitments
      const estimatedJobs = rfq.estimated_job_creation || 0
      const businessJobCommitment = business.local_hiring_goals?.jobs_committed || 0
      
      if (businessJobCommitment >= estimatedJobs) {
        score += 20
      }

      return Math.min(score, maxScore)
    }

    // Indigenous Employment Score
    function calculateIndigenousEmploymentScore(rfq: any, business: any): number {
      let score = 0
      const maxScore = 100

      // Indigenous employment percentage
      const indigenousEmploymentRate = business.indigenous_employment_target || 0
      score += Math.min(indigenousEmploymentRate * 2, 60) // Max 60 points

      // Indigenous leadership in project
      if (business.indigenous_leadership_commitment) {
        score += 20
      }

      // Training/mentorship programs
      if (business.indigenous_training_programs) {
        score += 20
      }

      return Math.min(score, maxScore)
    }

    // Community Benefit Score
    function calculateCommunityBenefitScore(rfq: any, business: any): number {
      let score = 0
      const maxScore = 100

      // Community investment percentage
      const communityInvestment = business.community_investment_percentage || 0
      score += Math.min(communityInvestment * 4, 40) // Max 40 points

      // Local procurement commitment
      if (business.local_procurement_commitment > 50) {
        score += 20
      }

      // Community partnerships
      if (business.community_partnerships?.length > 0) {
        score += 20
      }

      // Cultural preservation initiatives
      if (business.cultural_preservation_programs) {
        score += 20
      }

      return Math.min(score, maxScore)
    }

    // Price Competitiveness (intentionally lowest weight)
    function calculatePriceCompetitivenessScore(rfq: any, business: any): number {
      // This is intentionally simple - price shouldn't dominate
      const estimatedBid = business.estimated_bid_amount || 0
      const rfqBudget = rfq.budget_range_max || 0
      
      if (estimatedBid <= rfqBudget * 0.8) return 100  // 20% under budget
      if (estimatedBid <= rfqBudget * 0.9) return 80   // 10% under budget
      if (estimatedBid <= rfqBudget) return 60         // At budget
      return 20 // Over budget but still considered
    }

    return (
      <Component 
        {...props}
        setupBusinessProfile={setupBusinessProfile}
        calculateIndigenousMatchScore={calculateIndigenousMatchScore}
        algorithmSettings={algorithmSettings}
        setAlgorithmSettings={setAlgorithmSettings}
        climatePriorities={climatePriorities}
        setClimatePriorities={setClimatePriorities}
        businessProfile={businessProfile}
      />
    )
  }
}

// Government RFQ Creation with Indigenous Requirements
export function withGovernmentRFQCreation(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [rfqData, setRfqData] = useState({
      title: '',
      department: '',
      description: '',
      budget_range_min: 0,
      budget_range_max: 0,
      deadline: '',
      location: '',
      required_capabilities: [],
      indigenous_requirement: true,
      climate_requirements: {
        requires_carbon_neutral: false,
        sustainable_materials_required: false,
        environmental_assessment_needed: false,
        indigenous_knowledge_valued: true
      },
      job_creation_requirements: {
        minimum_jobs: 0,
        local_hiring_preference: true,
        indigenous_employment_target: 0,
        training_opportunities: false
      },
      community_benefit_requirements: {
        community_investment_required: false,
        local_procurement_preference: true,
        cultural_sensitivity_required: true
      }
    })

    async function createGovernmentRFQ(rfqData: any) {
      try {
        // Generate unique RFQ ID
        const rfqId = `RFQ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

        const { data, error } = await supabase
          .from('rfqs')
          .insert({
            id: rfqId,
            ...rfqData,
            status: 'open',
            created_by: props.user?.id,
            created_at: new Date().toISOString(),
            applications_deadline: rfqData.deadline,
            indigenous_priority_scoring: true,
            algorithm_version: 'indigenous_controlled_v1'
          })
          .select()

        if (error) throw error

        // Trigger matching for all eligible Indigenous businesses
        await triggerIndigenousMatching(rfqId)

        return { success: true, rfq: data[0] }
      } catch (error) {
        console.error('RFQ creation error:', error)
        return { success: false, error: error.message }
      }
    }

    async function triggerIndigenousMatching(rfqId: string) {
      try {
        // Get all verified Indigenous businesses
        const { data: businesses } = await supabase
          .from('indigenous_businesses')
          .select('id')
          .eq('verification_status', 'verified')

        // Calculate match scores for each business
        for (const business of businesses || []) {
          // This would trigger the calculateIndigenousMatchScore function
          // for each business asynchronously
          setTimeout(() => {
            // Use the algorithm from the previous component
            // calculateIndigenousMatchScore(rfqId, business.id)
          }, 100)
        }

        // Send notifications to high-matching businesses
        await sendMatchNotifications(rfqId)
      } catch (error) {
        console.error('Matching trigger error:', error)
      }
    }

    async function sendMatchNotifications(rfqId: string) {
      try {
        // Get businesses with high match scores (>70%)
        const { data: highMatches } = await supabase
          .from('rfq_match_scores')
          .select(`
            *,
            indigenous_business_profiles (business_id, community_name)
          `)
          .eq('rfq_id', rfqId)
          .gte('total_score', 70)

        for (const match of highMatches || []) {
          await supabase
            .from('notifications')
            .insert({
              business_id: match.business_id,
              rfq_id: rfqId,
              type: 'high_priority_rfq_match',
              title: 'High-Priority RFQ Match Found',
              message: `Your business scored ${match.total_score}% for a new RFQ opportunity`,
              priority: 'high',
              created_at: new Date().toISOString()
            })
        }
      } catch (error) {
        console.error('Notification sending error:', error)
      }
    }

    return (
      <Component 
        {...props}
        createGovernmentRFQ={createGovernmentRFQ}
        rfqData={rfqData}
        setRfqData={setRfqData}
        triggerIndigenousMatching={triggerIndigenousMatching}
      />
    )
  }
}

// Real-time RFQ Dashboard for Indigenous Businesses
export function withIndigenousRFQDashboard(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [matchedRFQs, setMatchedRFQs] = useState([])
    const [appliedRFQs, setAppliedRFQs] = useState([])
    const [algorithmInsights, setAlgorithmInsights] = useState(null)

    async function fetchBusinessRFQMatches(businessId: number) {
      try {
        const { data } = await supabase
          .from('rfq_match_scores')
          .select(`
            *,
            rfqs (
              id, title, department, deadline, budget_range_max,
              climate_requirements, job_creation_requirements
            )
          `)
          .eq('business_id', businessId)
          .gte('total_score', 50) // Only show decent matches
          .order('total_score', { ascending: false })

        setMatchedRFQs(data || [])
        
        // Generate insights for the business
        generateAlgorithmInsights(data || [])
      } catch (error) {
        console.error('RFQ fetch error:', error)
      }
    }

    function generateAlgorithmInsights(matches: any[]) {
      if (matches.length === 0) return

      const avgClimateScore = matches.reduce((sum, m) => sum + m.climate_score, 0) / matches.length
      const avgCommunityScore = matches.reduce((sum, m) => sum + m.community_score, 0) / matches.length
      
      const insights = {
        strongest_area: avgClimateScore > 80 ? 'Climate Leadership' : 
                      avgCommunityScore > 80 ? 'Community Impact' : 'Balanced Approach',
        improvement_suggestions: [],
        competitive_advantages: []
      }

      if (avgClimateScore < 60) {
        insights.improvement_suggestions.push('Consider strengthening climate commitments')
      }
      
      if (avgClimateScore > 85) {
        insights.competitive_advantages.push('Strong climate leadership')
      }

      setAlgorithmInsights(insights)
    }

    return (
      <Component 
        {...props}
        matchedRFQs={matchedRFQs}
        appliedRFQs={appliedRFQs}
        algorithmInsights={algorithmInsights}
        fetchBusinessRFQMatches={fetchBusinessRFQMatches}
      />
    )
  }
}