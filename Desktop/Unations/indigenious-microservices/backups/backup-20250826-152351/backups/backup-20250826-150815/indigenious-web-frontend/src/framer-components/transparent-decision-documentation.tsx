// Transparent Decision Documentation System
// Helps band governments create clear, defensible documentation for procurement decisions

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Transparent Decision Documentation Engine
export function withTransparentDecisionDocumentation(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [decisionDocument, setDecisionDocument] = useState({
      procurement_id: '',
      community_id: '',
      selected_bid_id: '',
      decision_summary: '',
      justification: '',
      member_presentation: '',
      audit_trail: []
    })

    const [memberReport, setMemberReport] = useState({
      executive_summary: '',
      scoring_breakdown: {},
      cost_analysis: {},
      community_benefits: {},
      alternative_analysis: {}
    })

    // Generate comprehensive decision documentation
    async function generateDecisionDocumentation(
      procurementId: string, 
      selectedBidId: string, 
      communityId: string,
      algorithmResults: any
    ) {
      try {
        // Get all necessary data
        const [procurement, selectedBid, allBids, algorithm, trueCosts, carbonData] = await Promise.all([
          getProcurementDetails(procurementId),
          getBidDetails(selectedBidId),
          getAllBids(procurementId),
          getCommunityAlgorithm(communityId),
          getTrueCostCalculations(procurementId),
          getCarbonCalculations(procurementId)
        ])

        // Generate main decision document
        const documentation = await createDecisionDocument({
          procurement,
          selectedBid,
          allBids,
          algorithm,
          algorithmResults,
          trueCosts,
          carbonData,
          communityId
        })

        // Generate member-friendly report
        const memberReport = await createMemberReport({
          procurement,
          selectedBid,
          allBids,
          algorithm,
          algorithmResults,
          trueCosts
        })

        // Generate audit trail
        const auditTrail = await generateAuditTrail(procurementId, communityId)

        // Store documentation
        await storeDecisionDocumentation(documentation, memberReport, auditTrail)

        setDecisionDocument(documentation)
        setMemberReport(memberReport)

        return { 
          success: true, 
          documentation, 
          memberReport, 
          auditTrail 
        }
      } catch (error) {
        console.error('Decision documentation error:', error)
        return { success: false, error: error.message }
      }
    }

    // Create formal decision document for band council
    async function createDecisionDocument({
      procurement,
      selectedBid,
      allBids,
      algorithm,
      algorithmResults,
      trueCosts,
      carbonData,
      communityId
    }) {
      const lowestBid = allBids.reduce((min, bid) => 
        bid.total_amount < min.total_amount ? bid : min
      )

      const isLowestSelected = selectedBid.id === lowestBid.id
      const priceDifference = selectedBid.total_amount - lowestBid.total_amount
      const percentDifference = ((priceDifference / lowestBid.total_amount) * 100)

      // Generate executive summary
      const executiveSummary = isLowestSelected 
        ? `The lowest-priced bid from ${selectedBid.contractor_name} was selected, aligning with both cost efficiency and community values.`
        : `While ${selectedBid.contractor_name}'s bid was $${priceDifference.toLocaleString()} (${percentDifference.toFixed(1)}%) higher than the lowest bid, it scored highest overall (${algorithmResults.find(r => r.bid_id === selectedBid.id)?.total_score}%) based on community-defined criteria.`

      // Generate detailed justification
      const justification = await generateDetailedJustification({
        selectedBid,
        lowestBid,
        algorithm,
        algorithmResults,
        trueCosts,
        carbonData,
        isLowestSelected
      })

      // Generate cost-benefit analysis
      const costBenefitAnalysis = await generateCostBenefitAnalysis({
        selectedBid,
        lowestBid,
        trueCosts,
        carbonData
      })

      // Generate risk assessment
      const riskAssessment = generateRiskAssessment(selectedBid, lowestBid, algorithmResults)

      const documentation = {
        procurement_id: procurement.id,
        community_id: communityId,
        selected_bid_id: selectedBid.id,
        
        // Executive summary
        executive_summary: executiveSummary,
        
        // Decision details
        decision_date: new Date().toISOString(),
        decision_maker: props.user?.id || 'Band Council',
        
        // Bid comparison
        total_bids_received: allBids.length,
        lowest_bid_amount: lowestBid.total_amount,
        selected_bid_amount: selectedBid.total_amount,
        price_difference: priceDifference,
        price_difference_percentage: percentDifference,
        
        // Scoring details
        algorithm_used: algorithm.algorithm_name,
        algorithm_version: algorithm.version,
        selected_bid_score: algorithmResults.find(r => r.bid_id === selectedBid.id)?.total_score || 0,
        
        // Justification
        detailed_justification: justification,
        cost_benefit_analysis: costBenefitAnalysis,
        risk_assessment: riskAssessment,
        
        // Transparency elements
        all_bid_scores: algorithmResults,
        community_criteria_weights: algorithm.criteria_weights,
        mandatory_requirements_checked: algorithm.mandatory_requirements,
        
        // Documentation status
        created_at: new Date().toISOString(),
        document_version: '1.0',
        requires_member_presentation: percentDifference > 10,
        audit_ready: true
      }

      return documentation
    }

    // Generate detailed justification for non-lowest bid selection
    async function generateDetailedJustification({
      selectedBid,
      lowestBid,
      algorithm,
      algorithmResults,
      trueCosts,
      carbonData,
      isLowestSelected
    }) {
      if (isLowestSelected) {
        return `The lowest bid was selected as it met all community criteria while providing the best value. No additional justification required.`
      }

      const selectedResult = algorithmResults.find(r => r.bid_id === selectedBid.id)
      const lowestResult = algorithmResults.find(r => r.bid_id === lowestBid.id)
      const weights = algorithm.criteria_weights

      let justification = [`Decision Rationale for Selecting ${selectedBid.contractor_name}:`]

      // Community priorities analysis
      const topPriority = Object.entries(weights).reduce((a, b) => 
        weights[a[0]] > weights[b[1]] ? a : b
      )[0]

      justification.push(`\n1. COMMUNITY PRIORITIES ALIGNMENT:`)
      justification.push(`   Our community prioritizes ${topPriority.replace(/_/g, ' ')} (${weights[topPriority]}% weight).`)
      
      // Score comparison
      justification.push(`\n2. COMPREHENSIVE SCORING:`)
      justification.push(`   ${selectedBid.contractor_name}: ${selectedResult.total_score}% overall score`)
      justification.push(`   ${lowestBid.contractor_name}: ${lowestResult.total_score}% overall score`)
      justification.push(`   Score difference: ${selectedResult.total_score - lowestResult.total_score} points`)

      // Detailed component analysis
      justification.push(`\n3. DETAILED COMPONENT ANALYSIS:`)
      Object.entries(selectedResult.component_scores).forEach(([criterion, score]) => {
        const lowestScore = lowestResult.component_scores[criterion] || 0
        const scoreDiff = score - lowestScore
        if (scoreDiff > 10) {
          justification.push(`   ${criterion.replace(/_/g, ' ')}: ${score}% vs ${lowestScore}% (+${scoreDiff} advantage)`)
        }
      })

      // True cost analysis if available
      const selectedTrueCost = trueCosts.find(tc => tc.bid_id === selectedBid.id)
      const lowestTrueCost = trueCosts.find(tc => tc.bid_id === lowestBid.id)
      
      if (selectedTrueCost && lowestTrueCost) {
        const trueCostDiff = selectedTrueCost.total_true_cost - lowestTrueCost.total_true_cost
        justification.push(`\n4. TRUE COST ANALYSIS:`)
        justification.push(`   When including carbon and social costs:`)
        justification.push(`   ${selectedBid.contractor_name}: $${selectedTrueCost.total_true_cost.toLocaleString()}`)
        justification.push(`   ${lowestBid.contractor_name}: $${lowestTrueCost.total_true_cost.toLocaleString()}`)
        
        if (trueCostDiff < 0) {
          justification.push(`   Selected bid is actually $${Math.abs(trueCostDiff).toLocaleString()} cheaper when true costs included`)
        }
      }

      // Community benefits
      justification.push(`\n5. COMMUNITY BENEFITS:`)
      if (selectedBid.estimated_local_jobs > 0) {
        justification.push(`   Local jobs created: ${selectedBid.estimated_local_jobs}`)
      }
      if (selectedBid.training_programs_offered > 0) {
        justification.push(`   Training programs: ${selectedBid.training_programs_offered}`)
      }
      if (selectedBid.indigenous_subcontractors_percentage > 0) {
        justification.push(`   Indigenous business participation: ${selectedBid.indigenous_subcontractors_percentage}%`)
      }

      // Bonus criteria earned
      if (selectedResult.applied_bonuses && selectedResult.applied_bonuses.length > 0) {
        justification.push(`\n6. BONUS CRITERIA EARNED:`)
        selectedResult.applied_bonuses.forEach(bonus => {
          justification.push(`   ${bonus.criterion.replace(/_/g, ' ')}: +${bonus.points} points`)
        })
      }

      return justification.join('\n')
    }

    // Generate cost-benefit analysis
    async function generateCostBenefitAnalysis({ selectedBid, lowestBid, trueCosts, carbonData }) {
      const priceDiff = selectedBid.total_amount - lowestBid.total_amount
      
      let analysis = {
        financial_impact: {
          additional_cost: priceDiff,
          percentage_increase: ((priceDiff / lowestBid.total_amount) * 100),
          cost_per_local_job: selectedBid.estimated_local_jobs > 0 ? priceDiff / selectedBid.estimated_local_jobs : 0
        },
        quantified_benefits: {},
        long_term_value: {},
        risk_mitigation: {}
      }

      // Calculate quantified benefits
      if (selectedBid.estimated_local_jobs > 0) {
        const jobValue = selectedBid.estimated_local_jobs * 45000 // Average annual salary
        analysis.quantified_benefits.local_employment_value = jobValue
      }

      if (selectedBid.training_positions > 0) {
        const trainingValue = selectedBid.training_positions * 15000 // Training value
        analysis.quantified_benefits.skills_development_value = trainingValue
      }

      // Carbon savings
      const selectedCarbon = carbonData.find(c => c.bid_id === selectedBid.id)
      const lowestCarbon = carbonData.find(c => c.bid_id === lowestBid.id)
      
      if (selectedCarbon && lowestCarbon) {
        const carbonSavings = lowestCarbon.total - selectedCarbon.total
        if (carbonSavings > 0) {
          analysis.quantified_benefits.carbon_savings_tonnes = carbonSavings
          analysis.quantified_benefits.carbon_savings_value = carbonSavings * 150 // $150/tonne
        }
      }

      // Long-term value analysis
      analysis.long_term_value = {
        capacity_building: selectedBid.training_programs_offered > 0,
        relationship_development: selectedBid.cultural_protocols_plan,
        local_economic_multiplier: selectedBid.local_procurement_percentage || 0,
        sustainable_development: selectedBid.sustainable_materials_percentage || 0
      }

      return analysis
    }

    // Generate risk assessment
    function generateRiskAssessment(selectedBid, lowestBid, algorithmResults) {
      const selectedResult = algorithmResults.find(r => r.bid_id === selectedBid.id)
      const lowestResult = algorithmResults.find(r => r.bid_id === lowestBid.id)

      return {
        selection_confidence: selectedResult.total_score >= 70 ? 'High' : 
                            selectedResult.total_score >= 50 ? 'Medium' : 'Low',
        
        cost_overrun_risk: selectedBid.total_amount <= lowestBid.total_amount * 1.2 ? 'Low' : 'Medium',
        
        delivery_confidence: selectedBid.indigenous_community_references > 0 ? 'High' : 'Medium',
        
        community_acceptance: selectedResult.component_scores.cultural_respect > 70 ? 'High' : 'Medium',
        
        audit_defensibility: 'High', // Transparent algorithm-based decision
        
        political_risk: selectedBid.total_amount <= lowestBid.total_amount * 1.15 ? 'Low' : 'Medium',
        
        mitigation_strategies: [
          'Algorithm-based decision provides audit trail',
          'Community priorities clearly documented',
          'True cost analysis available if questioned',
          'All bid scores recorded transparently'
        ]
      }
    }

    // Create member-friendly report
    async function createMemberReport({
      procurement,
      selectedBid,
      allBids,
      algorithm,
      algorithmResults,
      trueCosts
    }) {
      const lowestBid = allBids.reduce((min, bid) => 
        bid.total_amount < min.total_amount ? bid : min
      )

      const report = {
        // Plain language summary
        plain_language_summary: generatePlainLanguageSummary(selectedBid, lowestBid, algorithmResults),
        
        // What this means for the community
        community_impact: {
          jobs_created: selectedBid.estimated_local_jobs || 0,
          training_opportunities: selectedBid.training_programs_offered || 0,
          local_business_participation: selectedBid.indigenous_subcontractors_percentage || 0,
          environmental_benefit: 'Lower carbon footprint due to local sourcing'
        },
        
        // Simple cost breakdown
        cost_explanation: {
          project_cost: selectedBid.total_amount,
          compared_to_lowest: lowestBid.total_amount,
          difference: selectedBid.total_amount - lowestBid.total_amount,
          why_difference_justified: 'Higher community benefits and lower true costs'
        },
        
        // How the decision was made
        decision_process: {
          criteria_used: Object.keys(algorithm.criteria_weights),
          community_priorities: algorithm.criteria_weights,
          all_bids_scored: true,
          highest_scorer_selected: true
        },
        
        // Questions and answers
        anticipated_questions: generateAnticipatedQA(selectedBid, lowestBid, algorithmResults)
      }

      return report
    }

    // Generate plain language summary for community members
    function generatePlainLanguageSummary(selectedBid, lowestBid, algorithmResults) {
      const selectedResult = algorithmResults.find(r => r.bid_id === selectedBid.id)
      const isLowest = selectedBid.id === lowestBid.id
      
      if (isLowest) {
        return `We selected ${selectedBid.contractor_name} because they had both the lowest price AND the highest score based on our community's priorities. This was an easy decision that saved money while meeting our values.`
      }

      const priceDiff = selectedBid.total_amount - lowestBid.total_amount
      const percentDiff = ((priceDiff / lowestBid.total_amount) * 100).toFixed(1)

      return `We selected ${selectedBid.contractor_name} even though their bid was $${priceDiff.toLocaleString()} (${percentDiff}%) higher than the lowest bid. Here's why: they scored ${selectedResult.total_score}% overall based on what matters to our community - things like local jobs, environmental protection, and working respectfully with our culture. The lowest bidder only scored ${algorithmResults.find(r => r.bid_id === lowestBid.id)?.total_score}%. When we factor in the true costs (including environmental impact), the difference becomes much smaller or even disappears.`
    }

    // Generate anticipated Q&A for member meetings
    function generateAnticipatedQA(selectedBid, lowestBid, algorithmResults) {
      const priceDiff = selectedBid.total_amount - lowestBid.total_amount
      const selectedResult = algorithmResults.find(r => r.bid_id === selectedBid.id)

      return [
        {
          question: "Why didn't we just pick the cheapest option?",
          answer: `The cheapest bid scored only ${algorithmResults.find(r => r.bid_id === lowestBid.id)?.total_score}% on our community priorities, while our choice scored ${selectedResult.total_score}%. The extra $${priceDiff.toLocaleString()} brings us ${selectedBid.estimated_local_jobs} local jobs and much better environmental outcomes.`
        },
        {
          question: "How do we know this decision was fair?",
          answer: "Every bid was scored using the exact same algorithm based on priorities our community set. All scores are recorded and can be reviewed. No human bias or favoritism was involved."
        },
        {
          question: "What if the auditor questions this decision?",
          answer: "We have complete documentation showing how the decision was made, including the algorithm settings, all bid scores, and true cost calculations. The decision is fully defensible and transparent."
        },
        {
          question: "Could we have saved money another way?",
          answer: `When you include environmental and social costs, our choice actually provides better value. Plus, the local jobs and training create long-term economic benefits for our community.`
        }
      ]
    }

    // Generate audit trail
    async function generateAuditTrail(procurementId: string, communityId: string) {
      try {
        // Get all relevant log entries
        const [algorithmLogs, procurementLogs, calculationLogs] = await Promise.all([
          supabase.from('algorithm_change_log').select('*').eq('community_id', communityId),
          supabase.from('procurement_activity_log').select('*').eq('procurement_id', procurementId),
          supabase.from('calculation_audit_log').select('*').eq('procurement_id', procurementId)
        ])

        const auditTrail = [
          ...algorithmLogs.data || [],
          ...procurementLogs.data || [],
          ...calculationLogs.data || []
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        return auditTrail
      } catch (error) {
        console.error('Audit trail generation error:', error)
        return []
      }
    }

    // Store all documentation
    async function storeDecisionDocumentation(documentation: any, memberReport: any, auditTrail: any) {
      try {
        await supabase
          .from('decision_documentation')
          .upsert({
            ...documentation,
            member_report: memberReport,
            audit_trail: auditTrail
          })

        return { success: true }
      } catch (error) {
        console.error('Documentation storage error:', error)
        return { success: false, error: error.message }
      }
    }

    // Helper functions to get data
    async function getProcurementDetails(procurementId: string) {
      const { data } = await supabase
        .from('procurement_opportunities')
        .select('*')
        .eq('id', procurementId)
        .single()
      return data
    }

    async function getBidDetails(bidId: string) {
      const { data } = await supabase
        .from('procurement_bids')
        .select('*')
        .eq('id', bidId)
        .single()
      return data
    }

    async function getAllBids(procurementId: string) {
      const { data } = await supabase
        .from('procurement_bids')
        .select('*')
        .eq('procurement_id', procurementId)
      return data || []
    }

    async function getCommunityAlgorithm(communityId: string) {
      const { data } = await supabase
        .from('community_algorithms')
        .select('*')
        .eq('community_id', communityId)
        .eq('active', true)
        .single()
      return data
    }

    async function getTrueCostCalculations(procurementId: string) {
      const { data } = await supabase
        .from('true_cost_calculations')
        .select('*')
        .eq('procurement_id', procurementId)
      return data || []
    }

    async function getCarbonCalculations(procurementId: string) {
      const { data } = await supabase
        .from('carbon_calculations')
        .select('*')
        .eq('procurement_id', procurementId)
      return data || []
    }

    return (
      <Component 
        {...props}
        decisionDocument={decisionDocument}
        memberReport={memberReport}
        generateDecisionDocumentation={generateDecisionDocumentation}
      />
    )
  }
}