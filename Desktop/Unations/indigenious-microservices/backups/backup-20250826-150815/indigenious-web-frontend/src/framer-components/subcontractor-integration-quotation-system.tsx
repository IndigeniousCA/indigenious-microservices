// Subcontractor Integration & Quotation System
// AI-powered system for seamlessly integrating subcontractors and gathering competitive quotes
// Built with Apple liquid glass UI for consistent design language

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, FileText, Calculator, CheckCircle, Clock, 
  Network, DollarSign, TrendingUp, Shield, Zap 
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Subcontractor Integration & Quotation Engine with Apple Glass UI
export function withSubcontractorIntegrationSystem(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [quotationState, setQuotationState] = useState({
      isGatheringQuotes: false,
      totalSubcontractors: 0,
      quotesReceived: 0,
      analysisProgress: 0,
      estimatedCompletion: null
    })

    const [subcontractorNetwork, setSubcontractorNetwork] = useState([])
    const [quotationResults, setQuotationResults] = useState([])
    const [integrationRecommendations, setIntegrationRecommendations] = useState([])

    // AI-Powered Subcontractor Discovery and Integration
    async function discoverAndIntegrateSubcontractors(opportunityId: string, primeContractorId: string) {
      try {
        setQuotationState({ 
          isGatheringQuotes: true, 
          totalSubcontractors: 0, 
          quotesReceived: 0, 
          analysisProgress: 0,
          estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        })

        // Get opportunity requirements and breakdown
        const opportunityBreakdown = await analyzeOpportunityRequirements(opportunityId)
        
        setQuotationState(prev => ({ ...prev, analysisProgress: 15 }))

        // Identify required subtrades and specializations
        const requiredSubtrades = await identifyRequiredSubtrades(opportunityBreakdown)
        
        setQuotationState(prev => ({ ...prev, analysisProgress: 25 }))

        // Discover qualified subcontractors for each subtrade
        const qualifiedSubcontractors = await discoverQualifiedSubcontractors(requiredSubtrades, opportunityId)
        
        setQuotationState(prev => ({ 
          ...prev, 
          totalSubcontractors: qualifiedSubcontractors.length, 
          analysisProgress: 40 
        }))

        // Generate quotation packages
        const quotationPackages = await generateQuotationPackages(qualifiedSubcontractors, opportunityBreakdown)
        
        setQuotationState(prev => ({ ...prev, analysisProgress: 55 }))

        // Send automated quotation requests
        const quotationRequests = await sendAutomatedQuotationRequests(quotationPackages)
        
        setQuotationState(prev => ({ ...prev, analysisProgress: 70 }))

        // Analyze and optimize combinations
        const optimizedCombinations = await analyzeAndOptimizeCombinations(quotationRequests, opportunityBreakdown)
        
        setQuotationState(prev => ({ ...prev, analysisProgress: 85 }))

        // Generate integration recommendations
        const recommendations = await generateIntegrationRecommendations(optimizedCombinations, primeContractorId)
        
        setSubcontractorNetwork(qualifiedSubcontractors)
        setQuotationResults(optimizedCombinations)
        setIntegrationRecommendations(recommendations)
        
        setQuotationState(prev => ({ 
          ...prev, 
          isGatheringQuotes: false, 
          quotesReceived: optimizedCombinations.length,
          analysisProgress: 100 
        }))

        return { 
          success: true, 
          subcontractors: qualifiedSubcontractors,
          quotations: optimizedCombinations,
          recommendations: recommendations
        }
      } catch (error) {
        console.error('Subcontractor integration error:', error)
        setQuotationState({ isGatheringQuotes: false, totalSubcontractors: 0, quotesReceived: 0, analysisProgress: 0, estimatedCompletion: null })
        return { success: false, error: error.message }
      }
    }

    // Analyze opportunity requirements and break down into subtrades
    async function analyzeOpportunityRequirements(opportunityId: string) {
      const { data: opportunity } = await supabase
        .from('procurement_opportunities_extended')
        .select(`
          *,
          technical_specifications(*),
          work_breakdown_structure(*),
          project_phases(*),
          deliverables(*),
          quality_requirements(*),
          compliance_requirements(*)
        `)
        .eq('id', opportunityId)
        .single()

      // AI analysis of project scope
      const breakdown = {
        opportunity_id: opportunityId,
        project_scope: opportunity,
        primary_trades: await identifyPrimaryTrades(opportunity),
        secondary_trades: await identifySecondaryTrades(opportunity),
        specialized_services: await identifySpecializedServices(opportunity),
        work_packages: await createWorkPackages(opportunity),
        integration_points: await identifyIntegrationPoints(opportunity),
        risk_factors: await assessProjectRisks(opportunity),
        timeline_constraints: await analyzeTimelineConstraints(opportunity),
        budget_allocation: await analyzeBudgetAllocation(opportunity)
      }

      return breakdown
    }

    // Identify all required subtrades based on project analysis
    async function identifyRequiredSubtrades(breakdown: any) {
      const subtrades = []

      // Primary construction trades
      if (breakdown.primary_trades.includes('construction')) {
        subtrades.push(
          { category: 'excavation', priority: 'high', timing: 'early', estimated_duration: '2-4 weeks' },
          { category: 'concrete', priority: 'high', timing: 'early', estimated_duration: '3-6 weeks' },
          { category: 'structural_steel', priority: 'high', timing: 'mid', estimated_duration: '4-8 weeks' },
          { category: 'mechanical', priority: 'medium', timing: 'mid', estimated_duration: '6-12 weeks' },
          { category: 'electrical', priority: 'medium', timing: 'mid', estimated_duration: '4-8 weeks' },
          { category: 'finishing', priority: 'medium', timing: 'late', estimated_duration: '3-6 weeks' }
        )
      }

      // Infrastructure trades
      if (breakdown.primary_trades.includes('infrastructure')) {
        subtrades.push(
          { category: 'earthworks', priority: 'high', timing: 'early', estimated_duration: '4-8 weeks' },
          { category: 'utilities', priority: 'high', timing: 'early', estimated_duration: '6-10 weeks' },
          { category: 'paving', priority: 'medium', timing: 'late', estimated_duration: '2-4 weeks' },
          { category: 'landscaping', priority: 'low', timing: 'late', estimated_duration: '2-3 weeks' }
        )
      }

      // Specialized services
      if (breakdown.specialized_services.includes('environmental')) {
        subtrades.push(
          { category: 'environmental_monitoring', priority: 'high', timing: 'continuous', estimated_duration: 'project_duration' },
          { category: 'remediation', priority: 'medium', timing: 'early', estimated_duration: '2-8 weeks' }
        )
      }

      // Cultural and community services
      subtrades.push(
        { category: 'cultural_monitoring', priority: 'high', timing: 'continuous', estimated_duration: 'project_duration' },
        { category: 'community_liaison', priority: 'medium', timing: 'continuous', estimated_duration: 'project_duration' },
        { category: 'training_delivery', priority: 'medium', timing: 'early', estimated_duration: '4-12 weeks' }
      )

      return subtrades
    }

    // Discover qualified subcontractors with AI matching
    async function discoverQualifiedSubcontractors(requiredSubtrades: any[], opportunityId: string) {
      const qualifiedSubs = []

      for (const subtrade of requiredSubtrades) {
        // Query subcontractors by category with comprehensive filters
        const { data: candidates } = await supabase
          .from('subcontractors_extended')
          .select(`
            *,
            indigenous_certification(*),
            capabilities(*),
            past_projects(*),
            certifications(*),
            safety_records(*),
            financial_capacity(*),
            equipment_inventory(*),
            geographic_coverage(*),
            cultural_competency(*),
            availability_calendar(*),
            pricing_history(*),
            performance_metrics(*)
          `)
          .contains('service_categories', [subtrade.category])
          .eq('active_status', true)

        // AI scoring and filtering
        for (const candidate of candidates || []) {
          const qualificationScore = await scoreSubcontractorQualification(candidate, subtrade, opportunityId)
          
          if (qualificationScore.overall_score >= 70) { // Minimum qualification threshold
            qualifiedSubs.push({
              ...candidate,
              subtrade_category: subtrade.category,
              subtrade_priority: subtrade.priority,
              qualification_score: qualificationScore,
              estimated_availability: await checkAvailability(candidate, subtrade),
              pricing_estimate: await generatePricingEstimate(candidate, subtrade),
              integration_compatibility: await assessIntegrationCompatibility(candidate, subtrade)
            })
          }
        }
      }

      return qualifiedSubs
    }

    // Generate comprehensive quotation packages
    async function generateQuotationPackages(qualifiedSubs: any[], breakdown: any) {
      const packages = []

      for (const subcontractor of qualifiedSubs) {
        const workPackage = breakdown.work_packages.find(wp => 
          wp.category === subcontractor.subtrade_category
        )

        if (workPackage) {
          const quotationPackage = {
            subcontractor_id: subcontractor.id,
            subcontractor_name: subcontractor.company_name,
            subtrade_category: subcontractor.subtrade_category,
            
            // Detailed scope of work
            scope_of_work: {
              work_package: workPackage,
              deliverables: workPackage.deliverables,
              specifications: workPackage.technical_specs,
              quality_standards: workPackage.quality_requirements,
              timeline: workPackage.timeline,
              integration_requirements: workPackage.integration_points
            },

            // Pricing structure request
            pricing_request: {
              unit_pricing: workPackage.unit_pricing_required,
              lump_sum_components: workPackage.lump_sum_components,
              time_and_materials: workPackage.tm_components,
              contingency_provisions: workPackage.contingency_requirements,
              price_escalation_terms: workPackage.escalation_terms
            },

            // Performance requirements
            performance_requirements: {
              key_performance_indicators: workPackage.kpis,
              quality_metrics: workPackage.quality_metrics,
              safety_requirements: workPackage.safety_requirements,
              environmental_compliance: workPackage.environmental_requirements,
              cultural_protocols: workPackage.cultural_requirements
            },

            // Integration requirements
            integration_requirements: {
              coordination_protocols: generateCoordinationProtocols(workPackage),
              communication_requirements: generateCommunicationRequirements(workPackage),
              reporting_structure: generateReportingStructure(workPackage),
              scheduling_coordination: generateSchedulingCoordination(workPackage)
            },

            // AI-generated insights
            ai_insights: await generateQuotationInsights(subcontractor, workPackage),
            
            // Response timeline
            response_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            clarification_period: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days for questions
          }

          packages.push(quotationPackage)
        }
      }

      return packages
    }

    // Send automated quotation requests with AI personalization
    async function sendAutomatedQuotationRequests(packages: any[]) {
      const sentRequests = []

      for (const packageData of packages) {
        // Generate personalized message
        const personalizedMessage = await generatePersonalizedQuotationRequest(packageData)
        
        // Create digital quotation document
        const quotationDocument = await createDigitalQuotationDocument(packageData)
        
        // Send notification
        await sendQuotationNotification(packageData.subcontractor_id, personalizedMessage, quotationDocument)
        
        // Track request
        const requestRecord = {
          quotation_package_id: packageData.id,
          subcontractor_id: packageData.subcontractor_id,
          sent_at: new Date().toISOString(),
          response_deadline: packageData.response_deadline,
          status: 'sent',
          ai_personalization_used: true,
          expected_response_quality: packageData.ai_insights.response_quality_prediction
        }

        // Store in database
        await supabase
          .from('quotation_requests')
          .insert(requestRecord)

        sentRequests.push(requestRecord)
      }

      return sentRequests
    }

    // Analyze and optimize subcontractor combinations
    async function analyzeAndOptimizeCombinations(quotationRequests: any[], breakdown: any) {
      // Get responses (simulate for demo - in real world would wait for actual responses)
      const responses = await simulateQuotationResponses(quotationRequests)
      
      // Group by subtrade category
      const responsesByCategory = groupResponsesByCategory(responses)
      
      // Generate all possible combinations
      const allCombinations = generateAllCombinations(responsesByCategory)
      
      // Score each combination
      const scoredCombinations = await Promise.all(
        allCombinations.map(async (combination) => {
          const score = await scoreCombination(combination, breakdown)
          return {
            combination,
            scores: score,
            total_cost: calculateTotalCost(combination),
            total_timeline: calculateTotalTimeline(combination),
            risk_assessment: await assessCombinationRisk(combination),
            integration_complexity: assessIntegrationComplexity(combination),
            cultural_alignment: assessCulturalAlignment(combination),
            capacity_building_potential: assessCapacityBuilding(combination)
          }
        })
      )

      // Sort by optimization criteria
      const optimizedResults = scoredCombinations.sort((a, b) => {
        // Multi-criteria optimization: cost (30%), timeline (25%), quality (25%), cultural fit (20%)
        const scoreA = (a.scores.cost_score * 0.3) + (a.scores.timeline_score * 0.25) + 
                      (a.scores.quality_score * 0.25) + (a.scores.cultural_score * 0.2)
        const scoreB = (b.scores.cost_score * 0.3) + (b.scores.timeline_score * 0.25) + 
                      (b.scores.quality_score * 0.25) + (b.scores.cultural_score * 0.2)
        return scoreB - scoreA
      })

      return optimizedResults.slice(0, 5) // Top 5 combinations
    }

    // Generate integration recommendations
    async function generateIntegrationRecommendations(optimizedCombinations: any[], primeContractorId: string) {
      const recommendations = []

      for (const combination of optimizedCombinations) {
        const recommendation = {
          combination_id: combination.id,
          prime_contractor_id: primeContractorId,
          subcontractor_team: combination.combination,
          
          // Integration strategy
          integration_strategy: {
            management_approach: await suggestManagementApproach(combination),
            communication_protocols: await designCommunicationProtocols(combination),
            coordination_mechanisms: await designCoordinationMechanisms(combination),
            performance_monitoring: await designPerformanceMonitoring(combination),
            risk_mitigation: await designRiskMitigation(combination)
          },

          // Contract structure recommendations
          contract_structure: {
            prime_subcontractor_agreements: await designSubcontractAgreements(combination),
            payment_structures: await recommendPaymentStructures(combination),
            performance_incentives: await designPerformanceIncentives(combination),
            penalty_structures: await designPenaltyStructures(combination)
          },

          // Capacity building plan
          capacity_building: {
            training_programs: await identifyTrainingOpportunities(combination),
            mentorship_pairings: await suggestMentorshipPairings(combination),
            knowledge_transfer: await designKnowledgeTransfer(combination),
            business_development: await identifyBusinessDevelopment(combination)
          },

          // Success metrics
          success_metrics: {
            project_kpis: await defineProjectKPIs(combination),
            relationship_metrics: await defineRelationshipMetrics(combination),
            capacity_building_metrics: await defineCapacityMetrics(combination),
            community_impact_metrics: await defineCommunityMetrics(combination)
          }
        }

        recommendations.push(recommendation)
      }

      return recommendations
    }

    // Score subcontractor qualification
    async function scoreSubcontractorQualification(candidate: any, subtrade: any, opportunityId: string) {
      const scores = {
        technical_capability: 0,
        financial_capacity: 0,
        safety_record: 0,
        cultural_fit: 0,
        availability: 0,
        geographic_proximity: 0,
        past_performance: 0
      }

      // Technical capability (25%)
      const techCapability = candidate.capabilities?.filter(cap => 
        cap.category === subtrade.category && cap.proficiency_level >= 3
      ).length || 0
      scores.technical_capability = Math.min(techCapability * 25, 100)

      // Financial capacity (20%)
      const projectValue = await getEstimatedSubtradeValue(subtrade, opportunityId)
      const bondingCapacity = candidate.financial_capacity?.bonding_limit || 0
      scores.financial_capacity = bondingCapacity >= projectValue ? 100 : (bondingCapacity / projectValue) * 100

      // Safety record (15%)
      const safetyScore = candidate.safety_records?.ltir_rate || 0
      scores.safety_record = Math.max(0, 100 - (safetyScore * 20)) // Lower LTIR is better

      // Cultural fit (15%)
      if (candidate.indigenous_certification?.certified) scores.cultural_fit += 60
      if (candidate.cultural_competency?.training_completed) scores.cultural_fit += 40

      // Availability (10%)
      const availability = await checkDetailedAvailability(candidate, subtrade)
      scores.availability = availability.availability_percentage

      // Geographic proximity (10%)
      const distance = await calculateDistance(candidate.location, opportunityId)
      scores.geographic_proximity = Math.max(0, 100 - (distance / 50)) // Penalty after 50km

      // Past performance (5%)
      const avgRating = candidate.performance_metrics?.average_rating || 70
      scores.past_performance = avgRating

      const overall_score = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length

      return {
        individual_scores: scores,
        overall_score,
        strengths: identifyStrengths(scores),
        concerns: identifyConcerns(scores),
        recommendation: overall_score >= 85 ? 'Highly Recommended' : 
                       overall_score >= 70 ? 'Recommended' : 'Consider with Conditions'
      }
    }

    // UI Component for displaying quotation progress with Apple Glass design
    const QuotationProgressDisplay = () => (
      <motion.div 
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Quotation Progress</h3>
          <div className="flex items-center space-x-2">
            {quotationState.isGatheringQuotes ? (
              <Clock className="w-5 h-5 text-blue-400 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
            <span className="text-sm text-white/70">
              {quotationState.isGatheringQuotes ? 'Processing...' : 'Complete'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-2 mb-4">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${quotationState.analysisProgress}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl font-light text-white">{quotationState.totalSubcontractors}</div>
            <div className="text-xs text-white/60">Subcontractors</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl font-light text-emerald-400">{quotationState.quotesReceived}</div>
            <div className="text-xs text-white/60">Quotes Received</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl font-light text-blue-400">{quotationState.analysisProgress}%</div>
            <div className="text-xs text-white/60">Complete</div>
          </div>
        </div>
      </motion.div>
    )

    return (
      <Component 
        {...props}
        quotationState={quotationState}
        subcontractorNetwork={subcontractorNetwork}
        quotationResults={quotationResults}
        integrationRecommendations={integrationRecommendations}
        discoverAndIntegrateSubcontractors={discoverAndIntegrateSubcontractors}
        QuotationProgressDisplay={QuotationProgressDisplay}
      />
    )
  }
}