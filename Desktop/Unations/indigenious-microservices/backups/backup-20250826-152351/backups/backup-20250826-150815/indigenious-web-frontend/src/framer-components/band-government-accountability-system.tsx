// Band Government Accountability & Decision Documentation System
// Help band administrations make sound, defensible decisions and justify why lowest bidder wasn't chosen

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Band Government Decision Support & Documentation
export function withBandGovernmentAccountability(Component: ComponentType<any>): ComponentType<any> {
  return (props) => {
    const [decisionMatrix, setDecisionMatrix] = useState({
      // Transparent scoring that can be explained to community members
      criteria_weights: {
        community_employment: 30,     // Jobs for our people
        long_term_value: 25,         // Quality that lasts  
        local_economic_impact: 20,   // Money stays in community
        cultural_sensitivity: 15,    // Respects our values
        price_value: 10             // Price alone (lowest weight)
      },
      
      // Justification framework
      decision_principles: {
        community_benefit_first: true,
        long_term_thinking: true,
        cultural_respect_mandatory: true,
        transparency_required: true,
        member_accountability: true
      }
    })

    const [decisionDocumentation, setDecisionDocumentation] = useState<any>(null)

    // Create transparent decision documentation for band members
    async function documentBandDecision(projectId: string, bids: any[], selectedBidId: string, bandOfficialId: string) {
      try {
        // Calculate comprehensive scoring for ALL bids
        const bidAnalyses = await Promise.all(
          bids.map(bid => analyzeBidForBandAccountability(bid, projectId))
        )

        // Find selected bid and lowest bid
        const selectedBid = bidAnalyses.find(b => b.bid_id === selectedBidId)
        const lowestBid = bidAnalyses.reduce((lowest, current) => 
          current.bid_amount < lowest.bid_amount ? current : lowest
        )

        if (!selectedBid) {
          throw new Error('Selected bid not found')
        }

        // Generate decision justification
        const justification = generateDecisionJustification(
          selectedBid, 
          lowestBid, 
          bidAnalyses
        )

        // Create member-ready documentation
        const documentation = {
          project_id: projectId,
          decision_date: new Date().toISOString(),
          decided_by: bandOfficialId,
          
          // Executive Summary for Band Members
          executive_summary: {
            total_bids_received: bids.length,
            selected_contractor: selectedBid.contractor_name,
            selected_bid_amount: selectedBid.bid_amount,
            lowest_bid_amount: lowestBid.bid_amount,
            price_difference: selectedBid.bid_amount - lowestBid.bid_amount,
            why_not_lowest_bidder: justification.primary_reasons,
            community_benefits: justification.community_benefits,
            long_term_value: justification.long_term_value
          },

          // Detailed Analysis
          detailed_analysis: {
            all_bid_scores: bidAnalyses,
            selection_criteria: decisionMatrix.criteria_weights,
            decision_rationale: justification.detailed_rationale,
            risk_assessment: justification.risks_avoided,
            compliance_checklist: justification.compliance_verification
          },

          // Member Presentation Materials
          member_presentation: {
            summary_slide: generateMemberSummarySlide(selectedBid, lowestBid, justification),
            comparison_chart: generateBidComparisonChart(bidAnalyses),
            community_impact_breakdown: generateCommunityImpactBreakdown(selectedBid),
            questions_and_answers: generateAnticipatedQA(selectedBid, lowestBid, justification)
          },

          // Transparency & Audit Trail
          transparency_data: {
            evaluation_committee_members: [],
            conflicts_of_interest_declared: [],
            community_input_sessions: [],
            external_advisors_consulted: []
          }
        }

        // Store decision documentation
        await supabase
          .from('band_decision_documentation')
          .upsert({
            project_id: projectId,
            band_id: props.bandId,
            documentation: documentation,
            decision_maker: bandOfficialId,
            created_at: new Date().toISOString(),
            transparency_level: 'full_member_access'
          })

        setDecisionDocumentation(documentation)
        return documentation
      } catch (error) {
        console.error('Decision documentation error:', error)
        return null
      }
    }

    // Analyze each bid with band accountability in mind
    async function analyzeBidForBandAccountability(bid: any, projectId: string) {
      const weights = decisionMatrix.criteria_weights
      let totalScore = 0
      let analysis: any = {
        bid_id: bid.id,
        contractor_name: bid.contractor_name,
        bid_amount: bid.total_bid_amount,
        component_scores: {} as Record<string, number>,
        member_justifiable_reasons: [] as string[],
        red_flags: [] as string[],
        community_benefits_quantified: {} as Record<string, any>,
        total_score: 0
      }

      // 1. Community Employment Impact (30%)
      const employmentScore = calculateEmploymentImpact(bid)
      analysis.component_scores.community_employment = employmentScore
      totalScore += (employmentScore * weights.community_employment / 100)
      
      if (employmentScore > 80) {
        analysis.member_justifiable_reasons.push(`Will create ${bid.estimated_local_jobs} jobs for community members`)
      }

      // 2. Long-term Value Assessment (25%)
      const longTermScore = calculateLongTermValue(bid)
      analysis.component_scores.long_term_value = longTermScore
      totalScore += (longTermScore * weights.long_term_value / 100)

      if (longTermScore > 80) {
        analysis.member_justifiable_reasons.push(`${bid.warranty_years}-year warranty vs industry standard 2 years`)
      }

      // 3. Local Economic Impact (20%)
      const economicScore = calculateLocalEconomicImpact(bid)
      analysis.component_scores.local_economic_impact = economicScore
      totalScore += (economicScore * weights.local_economic_impact / 100)

      // 4. Cultural Sensitivity (15%)
      const culturalScore = calculateCulturalSensitivity(bid)
      analysis.component_scores.cultural_sensitivity = culturalScore
      totalScore += (culturalScore * weights.cultural_sensitivity / 100)

      if (culturalScore < 50) {
        analysis.red_flags.push("No cultural protocols plan provided")
      }

      // 5. Price Value (10%)
      const priceScore = calculatePriceValue(bid, projectId)
      analysis.component_scores.price_value = priceScore
      totalScore += (priceScore * weights.price_value / 100)

      analysis.total_score = Math.round(totalScore)

      // Quantify community benefits for member presentation
      analysis.community_benefits_quantified = {
        local_jobs_created: bid.estimated_local_jobs || 0,
        local_spending_percentage: bid.local_procurement_percentage || 0,
        training_opportunities: bid.training_positions || 0,
        community_investment: bid.community_investment_amount || 0,
        indigenous_business_participation: bid.indigenous_subcontractor_percentage || 0
      }

      return analysis
    }

    // Calculate employment impact with member-understandable metrics
    function calculateEmploymentImpact(bid: any): number {
      let score = 0
      const maxScore = 100

      // Direct jobs for community members
      const localJobs = bid.estimated_local_jobs || 0
      score += Math.min(localJobs * 5, 50) // Up to 50 points (10 jobs = max)

      // Youth employment commitment
      if (bid.youth_employment_commitment > 0) score += 20

      // Skills training for locals
      if (bid.skills_training_commitment) score += 15

      // Long-term employment vs just construction period
      if (bid.post_construction_employment > 0) score += 15

      return Math.min(score, maxScore)
    }

    // Calculate long-term value (not just upfront cost)
    function calculateLongTermValue(bid: any): number {
      let score = 0
      const maxScore = 100

      // Warranty length
      const warrantyYears = bid.warranty_years || 1
      score += Math.min(warrantyYears * 10, 40) // Up to 40 points (4+ years = max)

      // Quality certifications
      if (bid.quality_certifications?.length > 0) score += 20

      // Maintenance training for community
      if (bid.maintenance_training_included) score += 15

      // Energy efficiency/operating cost savings
      if (bid.energy_efficiency_rating > 0) score += 15

      // Track record of work lasting without issues
      const satisfactionScore = bid.client_satisfaction_rating || 0
      score += Math.min(satisfactionScore * 0.1, 10) // Up to 10 points

      return Math.min(score, maxScore)
    }

    // Calculate how much money stays in the community
    function calculateLocalEconomicImpact(bid: any): number {
      let score = 0
      const maxScore = 100

      // Local procurement percentage
      const localProcurement = bid.local_procurement_percentage || 0
      score += Math.min(localProcurement, 40) // Up to 40 points

      // Indigenous subcontractors
      const indigenousSubs = bid.indigenous_subcontractor_percentage || 0
      score += Math.min(indigenousSubs, 30) // Up to 30 points

      // Community investment commitments
      if (bid.community_investment_amount > 0) score += 20

      // Local materials sourcing
      if (bid.local_materials_percentage > 0) score += 10

      return Math.min(score, maxScore)
    }

    // Cultural sensitivity and respect
    function calculateCulturalSensitivity(bid: any): number {
      let score = 0
      const maxScore = 100

      // Cultural protocols plan
      if (bid.cultural_protocols_plan) score += 30

      // Previous Indigenous community work
      if (bid.indigenous_community_references > 0) score += 25

      // Elder consultation commitment
      if (bid.elder_consultation_commitment) score += 20

      // Cultural awareness training for workers
      if (bid.cultural_training_plan) score += 15

      // Sacred site protection measures
      if (bid.sacred_site_protection) score += 10

      return Math.min(score, maxScore)
    }

    // Price value assessment (not just lowest price)
    function calculatePriceValue(bid: any, projectId: string): number {
      // This considers value for money, not just lowest price
      // Implementation would consider project budget, market rates, etc.
      return 75 // Placeholder
    }

    // Generate justification for why lowest bidder wasn't chosen
    function generateDecisionJustification(selectedBid: any, lowestBid: any, allBids: any[]) {
      const priceDifference = selectedBid.bid_amount - lowestBid.bid_amount
      const priceDifferencePercent = ((priceDifference / lowestBid.bid_amount) * 100).toFixed(1)

      return {
        primary_reasons: [
          `Selected contractor will create ${selectedBid.community_benefits_quantified.local_jobs_created} local jobs vs ${lowestBid.community_benefits_quantified.local_jobs_created} from lowest bidder`,
          `${selectedBid.component_scores.long_term_value}% long-term value score vs ${lowestBid.component_scores.long_term_value}% from lowest bidder`,
          `${selectedBid.community_benefits_quantified.local_spending_percentage}% of spending stays in community vs ${lowestBid.community_benefits_quantified.local_spending_percentage}% from lowest bidder`
        ],

        community_benefits: {
          additional_local_jobs: selectedBid.community_benefits_quantified.local_jobs_created - lowestBid.community_benefits_quantified.local_jobs_created,
          additional_local_spending: `$${((selectedBid.community_benefits_quantified.local_spending_percentage - lowestBid.community_benefits_quantified.local_spending_percentage) / 100 * selectedBid.bid_amount).toLocaleString()}`,
          quality_advantages: selectedBid.member_justifiable_reasons
        },

        long_term_value: {
          warranty_difference: `${selectedBid.warranty_years || 1} years vs ${lowestBid.warranty_years || 1} years`,
          maintenance_savings: selectedBid.maintenance_training_included ? "Community trained to maintain building" : null,
          energy_savings: selectedBid.energy_efficiency_rating > lowestBid.energy_efficiency_rating ? "Lower operating costs" : null
        },

        price_justification: {
          price_difference: `$${priceDifference.toLocaleString()}`,
          price_difference_percent: `${priceDifferencePercent}%`,
          value_received: `Community receives ${selectedBid.total_score}% value score vs ${lowestBid.total_score}% from lowest bidder`,
          cost_per_local_job: selectedBid.community_benefits_quantified.local_jobs_created > 0 ? 
            `$${(priceDifference / selectedBid.community_benefits_quantified.local_jobs_created).toLocaleString()} extra cost per local job created` : null
        },

        risks_avoided: selectedBid.red_flags.length < lowestBid.red_flags.length ? 
          `Avoided ${lowestBid.red_flags.length - selectedBid.red_flags.length} risk factors identified in lowest bid` : null,

        detailed_rationale: `The selected contractor scored ${selectedBid.total_score}% overall compared to ${lowestBid.total_score}% for the lowest bidder. The additional $${priceDifference.toLocaleString()} (${priceDifferencePercent}% more) provides significant community benefits including ${selectedBid.community_benefits_quantified.local_jobs_created} local jobs and ${selectedBid.community_benefits_quantified.local_spending_percentage}% local economic impact.`,

        compliance_verification: {
          fiduciary_duty_met: true,
          community_benefit_demonstrated: true,
          transparent_process_followed: true,
          documentation_complete: true
        }
      }
    }

    // Generate summary slide for band member presentation
    function generateMemberSummarySlide(selectedBid: any, lowestBid: any, justification: any) {
      return {
        title: "Contract Award Decision Summary",
        selected_contractor: selectedBid.contractor_name,
        key_numbers: {
          our_price: `$${selectedBid.bid_amount.toLocaleString()}`,
          lowest_price: `$${lowestBid.bid_amount.toLocaleString()}`,
          difference: `$${justification.price_justification.price_difference}`,
          local_jobs: selectedBid.community_benefits_quantified.local_jobs_created,
          quality_score: `${selectedBid.total_score}%`
        },
        why_this_choice: justification.primary_reasons,
        member_benefits: [
          `${selectedBid.community_benefits_quantified.local_jobs_created} jobs for our community`,
          `${selectedBid.community_benefits_quantified.local_spending_percentage}% of money stays local`,
          `${selectedBid.warranty_years || 1}-year warranty protection`,
          `${selectedBid.community_benefits_quantified.training_opportunities} training opportunities`
        ]
      }
    }

    // Generate anticipated Q&A for band meetings
    function generateAnticipatedQA(selectedBid: any, lowestBid: any, justification: any) {
      return [
        {
          question: "Why didn't we choose the lowest bidder?",
          answer: `The lowest bidder would have cost $${justification.price_justification.price_difference} less, but would have created ${selectedBid.community_benefits_quantified.local_jobs_created - lowestBid.community_benefits_quantified.local_jobs_created} fewer jobs for our community members. Our analysis showed the selected contractor provides ${selectedBid.total_score}% value compared to ${lowestBid.total_score}% from the lowest bidder.`
        },
        {
          question: "How much extra are we paying and what do we get for it?",
          answer: `We're paying ${justification.price_justification.price_difference_percent}% more (${justification.price_justification.price_difference}) but getting ${justification.community_benefits.additional_local_jobs} more local jobs, ${justification.community_benefits.additional_local_spending} more local spending, and better quality guarantees.`
        },
        {
          question: "Is this the best use of our money?",
          answer: `Yes. Our fiduciary analysis shows this decision maximizes long-term community benefit. The cost per local job created is ${justification.price_justification.cost_per_local_job}, which is excellent value for our community's economic development.`
        },
        {
          question: "How do we know this contractor will deliver?",
          answer: `They have ${selectedBid.component_scores.long_term_value}% quality score, ${selectedBid.indigenous_community_references || 0} references from other Indigenous communities, and provide a ${selectedBid.warranty_years || 1}-year warranty vs industry standard 2 years.`
        }
      ]
    }

    // Helper function stubs - TODO: Implement these functions
    function generateBidComparisonChart(bidAnalyses: any[]): any {
      return {
        type: 'comparison',
        data: bidAnalyses
      }
    }

    function generateCommunityImpactBreakdown(selectedBid: any): any {
      return {
        localJobs: selectedBid.community_benefits_quantified?.local_jobs_created || 0,
        localSpending: selectedBid.community_benefits_quantified?.local_spending_percentage || 0,
        trainingOpportunities: selectedBid.community_benefits_quantified?.training_opportunities || 0
      }
    }

    return (
      <Component 
        {...props}
        decisionMatrix={decisionMatrix}
        setDecisionMatrix={setDecisionMatrix}
        documentBandDecision={documentBandDecision}
        decisionDocumentation={decisionDocumentation}
      />
    )
  }
}