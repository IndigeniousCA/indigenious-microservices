// Community-Controlled Algorithm Engine
// The core system that lets Indigenous communities control their own procurement algorithms

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Core Algorithm Engine that Communities Control
export function withCommunityAlgorithmEngine(Component: ComponentType<any>): ComponentType<any> {
  return (props: any) => {
    const [communityAlgorithm, setCommunityAlgorithm] = useState({
      community_id: '',
      algorithm_name: '',
      
      // Community sets these weights themselves
      criteria_weights: {
        carbon_footprint: 35,        // Climate impact
        local_employment: 30,        // Jobs for our people
        indigenous_business: 20,     // Indigenous-owned suppliers
        cultural_respect: 10,        // Understands our protocols
        price_value: 5              // Price (intentionally lowest)
      },
      
      // Community defines what matters to THEM
      community_values: {
        land_protection: true,
        youth_employment: true,
        elder_involvement: true,
        language_preservation: false,
        traditional_knowledge: true
      },
      
      // Deal breakers that automatically disqualify
      mandatory_requirements: [
        'environmental_protection_plan',
        'indigenous_consultation_required',
        'local_hiring_minimum_30_percent'
      ],
      
      // Bonus points for things community especially values
      bonus_criteria: [
        { criterion: 'youth_training_programs', points: 15 },
        { criterion: 'elder_advisory_role', points: 10 },
        { criterion: 'local_materials_sourcing', points: 12 }
      ]
    })

    const [algorithmResults, setAlgorithmResults] = useState<any[]>([])

    // Community creates/updates their algorithm
    async function saveCommunityAlgorithm(communityId: string, algorithmData: any) {
      try {
        const { data, error } = await supabase
          .from('community_algorithms')
          .upsert({
            community_id: communityId,
            algorithm_name: algorithmData.algorithm_name,
            criteria_weights: algorithmData.criteria_weights,
            community_values: algorithmData.community_values,
            mandatory_requirements: algorithmData.mandatory_requirements,
            bonus_criteria: algorithmData.bonus_criteria,
            created_by: props.user?.id,
            updated_at: new Date().toISOString(),
            version: algorithmData.version || 1,
            active: true
          })
          .select()

        if (error) throw error
        
        // Log algorithm change for transparency
        await logAlgorithmChange(communityId, algorithmData, props.user?.id)
        
        return { success: true, algorithm: data[0] }
      } catch (error) {
        console.error('Algorithm save error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    // Run community's algorithm against procurement opportunities
    async function runCommunityAlgorithm(communityId: string, procurementId: string) {
      try {
        // Get community's algorithm
        const { data: algorithm } = await supabase
          .from('community_algorithms')
          .select('*')
          .eq('community_id', communityId)
          .eq('active', true)
          .single()

        // Get procurement details
        const { data: procurement } = await supabase
          .from('procurement_opportunities')
          .select('*')
          .eq('id', procurementId)
          .single()

        if (!algorithm || !procurement) {
          return { success: false, error: 'Missing algorithm or procurement data' }
        }

        // Get all bids for this procurement
        const { data: bids } = await supabase
          .from('procurement_bids')
          .select('*')
          .eq('procurement_id', procurementId)

        // Score each bid using community's algorithm
        const scoredBids = await Promise.all(
          (bids || []).map(bid => scoreBidWithCommunityAlgorithm(bid, algorithm, procurement))
        )

        // Sort by total score (highest first)
        const rankedBids = scoredBids.sort((a, b) => b.total_score - a.total_score)

        // Generate community explanation
        const explanation = generateCommunityExplanation(rankedBids, algorithm)

        const results = {
          procurement_id: procurementId,
          community_id: communityId,
          algorithm_version: algorithm.version,
          ranked_bids: rankedBids,
          recommended_bid: rankedBids[0],
          explanation: explanation,
          calculated_at: new Date().toISOString()
        }

        // Store results for transparency
        await supabase
          .from('algorithm_results')
          .upsert(results)

        setAlgorithmResults(rankedBids)
        return { success: true, results }
      } catch (error) {
        console.error('Algorithm execution error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    // Score individual bid using community's algorithm
    async function scoreBidWithCommunityAlgorithm(bid: any, algorithm: any, procurement: any) {
      const weights = algorithm.criteria_weights
      let totalScore = 0
      let componentScores: any = {}
      let disqualified = false
      let disqualificationReasons: string[] = []

      // 1. Check mandatory requirements first
      for (const requirement of algorithm.mandatory_requirements) {
        if (!checkMandatoryRequirement(bid, requirement)) {
          disqualified = true
          disqualificationReasons.push(requirement)
        }
      }

      if (disqualified) {
        return {
          bid_id: bid.id,
          contractor_name: bid.contractor_name,
          total_score: 0,
          component_scores: {},
          disqualified: true,
          disqualification_reasons: disqualificationReasons,
          explanation: `Disqualified for not meeting: ${disqualificationReasons.join(', ')}`
        }
      }

      // 2. Calculate component scores
      
      // Carbon Footprint Score
      const carbonScore = await calculateCarbonScore(bid, procurement)
      componentScores.carbon_footprint = carbonScore
      totalScore += (carbonScore * weights.carbon_footprint / 100)

      // Local Employment Score
      const employmentScore = calculateLocalEmploymentScore(bid, algorithm.community_values)
      componentScores.local_employment = employmentScore
      totalScore += (employmentScore * weights.local_employment / 100)

      // Indigenous Business Score
      const indigenousScore = calculateIndigenousBusinessScore(bid)
      componentScores.indigenous_business = indigenousScore
      totalScore += (indigenousScore * weights.indigenous_business / 100)

      // Cultural Respect Score
      const culturalScore = calculateCulturalRespectScore(bid, algorithm.community_values)
      componentScores.cultural_respect = culturalScore
      totalScore += (culturalScore * weights.cultural_respect / 100)

      // Price Value Score
      const priceScore = calculatePriceValueScore(bid, procurement)
      componentScores.price_value = priceScore
      totalScore += (priceScore * weights.price_value / 100)

      // 3. Apply bonus criteria
      let bonusPoints = 0
      let appliedBonuses = []
      
      for (const bonus of algorithm.bonus_criteria) {
        if (checkBonusCriterion(bid, bonus.criterion)) {
          bonusPoints += bonus.points
          appliedBonuses.push(bonus)
        }
      }

      totalScore += bonusPoints

      return {
        bid_id: bid.id,
        contractor_name: bid.contractor_name,
        bid_amount: bid.total_amount,
        total_score: Math.min(Math.round(totalScore), 100), // Cap at 100
        component_scores: componentScores,
        bonus_points: bonusPoints,
        applied_bonuses: appliedBonuses,
        disqualified: false,
        explanation: generateBidExplanation(bid, componentScores, appliedBonuses, weights)
      }
    }

    // Calculate carbon footprint score based on transportation, materials, etc.
    async function calculateCarbonScore(bid: any, procurement: any): Promise<number> {
      let score = 0
      const maxScore = 100

      // Transportation carbon (major factor for remote communities)
      const transportDistance = calculateTransportDistance(
        bid.supplier_location, 
        procurement.delivery_location
      )
      
      // Score based on distance (closer = better)
      if (transportDistance < 50) score += 40        // Local supplier
      else if (transportDistance < 200) score += 30   // Regional
      else if (transportDistance < 1000) score += 20  // Provincial
      else if (transportDistance < 3000) score += 10  // National
      else score += 0                                 // International

      // Materials carbon footprint
      if (bid.sustainable_materials_percentage) {
        score += Math.min(bid.sustainable_materials_percentage * 0.3, 25)
      }

      // Energy usage for project
      if (bid.renewable_energy_commitment > 0) {
        score += Math.min(bid.renewable_energy_commitment * 0.2, 20)
      }

      // Carbon offset commitments
      if (bid.carbon_offset_plan) score += 15

      return Math.min(score, maxScore)
    }

    // Calculate local employment score
    function calculateLocalEmploymentScore(bid: any, communityValues: any): number {
      let score = 0
      const maxScore = 100

      // Local hiring percentage
      const localHiringPercent = bid.local_hiring_percentage || 0
      score += Math.min(localHiringPercent, 50) // Up to 50 points

      // Youth employment (if community values it)
      if (communityValues.youth_employment && bid.youth_employment_commitment) {
        score += 20
      }

      // Training programs
      if (bid.training_programs_offered > 0) {
        score += Math.min(bid.training_programs_offered * 10, 20)
      }

      // Permanent vs temporary jobs
      if (bid.permanent_positions_created > 0) {
        score += 10
      }

      return Math.min(score, maxScore)
    }

    // Calculate Indigenous business participation score
    function calculateIndigenousBusinessScore(bid: any): number {
      let score = 0
      const maxScore = 100

      // Main contractor Indigenous ownership
      const indigenousOwnership = bid.indigenous_ownership_percentage || 0
      score += Math.min(indigenousOwnership, 60) // Up to 60 points

      // Indigenous subcontractors
      if (bid.indigenous_subcontractors_percentage > 0) {
        score += Math.min(bid.indigenous_subcontractors_percentage * 0.4, 25)
      }

      // Indigenous suppliers
      if (bid.indigenous_suppliers_count > 0) {
        score += Math.min(bid.indigenous_suppliers_count * 5, 15)
      }

      return Math.min(score, maxScore)
    }

    // Calculate cultural respect and understanding score
    function calculateCulturalRespectScore(bid: any, communityValues: any): number {
      let score = 0
      const maxScore = 100

      // Cultural protocols plan
      if (bid.cultural_protocols_plan) score += 25

      // Previous Indigenous community work
      if (bid.indigenous_community_references > 0) {
        score += Math.min(bid.indigenous_community_references * 10, 25)
      }

      // Elder involvement (if community values it)
      if (communityValues.elder_involvement && bid.elder_consultation_plan) {
        score += 20
      }

      // Traditional knowledge integration
      if (communityValues.traditional_knowledge && bid.traditional_knowledge_integration) {
        score += 15
      }

      // Language considerations
      if (communityValues.language_preservation && bid.indigenous_language_services) {
        score += 15
      }

      return Math.min(score, maxScore)
    }

    // Calculate price value score (not just lowest price)
    function calculatePriceValueScore(bid: any, procurement: any): number {
      const budgetRange = procurement.budget_range_max || 0
      const bidAmount = bid.total_amount || 0

      if (bidAmount <= budgetRange * 0.8) return 100      // 20% under budget
      if (bidAmount <= budgetRange * 0.9) return 80       // 10% under budget
      if (bidAmount <= budgetRange) return 60             // At budget
      if (bidAmount <= budgetRange * 1.1) return 40       // 10% over budget
      if (bidAmount <= budgetRange * 1.2) return 20       // 20% over budget
      return 0                                            // More than 20% over
    }

    // Check if bid meets mandatory requirement
    function checkMandatoryRequirement(bid: any, requirement: string): boolean {
      switch (requirement) {
        case 'environmental_protection_plan':
          return !!bid.environmental_protection_plan
        case 'indigenous_consultation_required':
          return !!bid.indigenous_consultation_plan
        case 'local_hiring_minimum_30_percent':
          return (bid.local_hiring_percentage || 0) >= 30
        case 'bonding_and_insurance':
          return !!bid.bonding_confirmed && !!bid.insurance_confirmed
        default:
          return true
      }
    }

    // Check if bid qualifies for bonus criterion
    function checkBonusCriterion(bid: any, criterion: string): boolean {
      switch (criterion) {
        case 'youth_training_programs':
          return !!bid.youth_training_programs
        case 'elder_advisory_role':
          return !!bid.elder_advisory_commitment
        case 'local_materials_sourcing':
          return (bid.local_materials_percentage || 0) > 50
        case 'apprenticeship_programs':
          return !!bid.apprenticeship_programs
        default:
          return false
      }
    }

    // Generate explanation for community members
    function generateBidExplanation(bid: any, scores: any, bonuses: any[], weights: any): string {
      const explanations = []

      if (scores.carbon_footprint > 70) {
        explanations.push(`Low carbon footprint (${scores.carbon_footprint}% score)`)
      }
      
      if (scores.local_employment > 70) {
        explanations.push(`Strong local employment commitment (${bid.local_hiring_percentage}% local hiring)`)
      }

      if (scores.indigenous_business > 70) {
        explanations.push(`High Indigenous business participation`)
      }

      if (bonuses.length > 0) {
        explanations.push(`Earned ${bonuses.reduce((sum, b) => sum + b.points, 0)} bonus points`)
      }

      return explanations.join('; ')
    }

    // Generate overall explanation for community
    function generateCommunityExplanation(rankedBids: any[], algorithm: any): string {
      const topBid = rankedBids[0]
      const weights = algorithm.criteria_weights

      const topPriority = Object.entries(weights).reduce((a, b) => 
        weights[a[0] as keyof typeof weights] > weights[b[0] as keyof typeof weights] ? a : b
      )[0]

      return `Based on your community's priorities (${topPriority} weighted at ${weights[topPriority]}%), ${topBid.contractor_name} scored highest with ${topBid.total_score}%. ${topBid.explanation}`
    }

    // Log algorithm changes for transparency
    async function logAlgorithmChange(communityId: string, algorithmData: any, userId: string) {
      await supabase
        .from('algorithm_change_log')
        .insert({
          community_id: communityId,
          changed_by: userId,
          changes: algorithmData,
          change_date: new Date().toISOString(),
          reason: 'Community preference update'
        })
    }

    // Calculate transport distance (simplified)
    function calculateTransportDistance(from: string, to: string): number {
      // In real implementation, would use mapping API
      // For now, return mock distance based on location strings
      if (!from || !to) return 1000 // Default to long distance
      
      // Mock calculation - in real world would use Google Maps API
      return Math.random() * 3000 // Random distance for demo
    }

    return (
      <Component 
        {...props}
        communityAlgorithm={communityAlgorithm}
        setCommunityAlgorithm={setCommunityAlgorithm}
        saveCommunityAlgorithm={saveCommunityAlgorithm}
        runCommunityAlgorithm={runCommunityAlgorithm}
        algorithmResults={algorithmResults}
      />
    )
  }
}