// First Nations Community Construction RFQ Analysis
// Communities control how they evaluate contractors for THEIR construction projects

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Community Construction Project RFQ Control
export function withCommunityConstructionRFQ(Component: ComponentType<any>): ComponentType<any> {
  return (props: any) => {
    const [communityProjectCriteria, setCommunityProjectCriteria] = useState({
      // What THIS community values when choosing contractors
      local_workers_weight: 30,         // Hire our people first
      indigenous_contractors_weight: 25, // Use Indigenous-owned companies  
      community_respect_weight: 20,     // Understands our protocols
      quality_track_record_weight: 15,  // Good work history
      price_competitiveness_weight: 10  // Price matters but not everything
    })

    const [projectContext, setProjectContext] = useState({
      project_type: '',              // Housing, community center, etc.
      project_value: 0,
      community_name: '',
      local_workforce_available: 0,   // How many local workers we have
      priority_hiring: [],           // Youth, women, specific trades
      cultural_considerations: [],    // Sacred areas, protocols, etc.
      local_materials_available: [], // What we can source locally
      community_goals: []            // What we want to achieve beyond building
    })

    // Community sets up their construction project RFQ analysis
    async function setupCommunityProjectAnalysis(projectId: string, criteria: any) {
      try {
        const { data, error } = await supabase
          .from('community_construction_criteria')
          .upsert({
            project_id: projectId,
            community_id: criteria.community_id,
            evaluation_weights: communityProjectCriteria,
            project_context: projectContext,
            mandatory_requirements: criteria.mandatory_requirements || [],
            bonus_criteria: criteria.bonus_criteria || [],
            community_priorities: criteria.community_priorities || [],
            created_by: props["user"]?.id,
            updated_at: new Date().toISOString()
          })

        if (error) throw error
        return { success: true, data }
      } catch (error) {
        console.error('Community project criteria setup error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    // Analyze contractor bids for THIS community's construction project
    async function analyzeContractorBid(bidId: string, projectId: string) {
      try {
        // Get community's evaluation criteria for this project
        const { data: criteria } = await supabase
          .from('community_construction_criteria')
          .select('*')
          .eq('project_id', projectId)
          .single()

        // Get contractor bid details
        const { data: bid } = await supabase
          .from('construction_bids')
          .select('*')
          .eq('id', bidId)
          .single()

        if (!criteria || !bid) return null

        const weights = criteria.evaluation_weights
        const context = criteria.project_context
        let totalScore = 0
        let analysis = {
          overall_score: 0,
          component_scores: {} as any,
          community_benefits: [] as string[],
          concerns: [] as string[],
          recommendations: [] as string[],
          meets_requirements: true
        }

        // 1. Local Workers Commitment
        const localWorkersScore = analyzeLocalWorkersCommitment(bid, context)
        analysis.component_scores.local_workers = localWorkersScore
        totalScore += (localWorkersScore * weights.local_workers_weight / 100)

        // 2. Indigenous Contractor Participation
        const indigenousScore = analyzeIndigenousContractors(bid, context)
        analysis.component_scores.indigenous_contractors = indigenousScore
        totalScore += (indigenousScore * weights.indigenous_contractors_weight / 100)

        // 3. Community Respect & Understanding
        const respectScore = analyzeCommunityRespect(bid, context)
        analysis.component_scores.community_respect = respectScore
        totalScore += (respectScore * weights.community_respect_weight / 100)

        // 4. Quality & Track Record
        const qualityScore = analyzeQualityTrackRecord(bid, context)
        analysis.component_scores.quality_track_record = qualityScore
        totalScore += (qualityScore * weights.quality_track_record_weight / 100)

        // 5. Price Competitiveness
        const priceScore = analyzePriceCompetitiveness(bid, context)
        analysis.component_scores.price_competitiveness = priceScore
        totalScore += (priceScore * weights.price_competitiveness_weight / 100)

        // Check mandatory requirements
        analysis.meets_requirements = checkMandatoryRequirements(bid, criteria.mandatory_requirements)

        analysis.overall_score = analysis.meets_requirements ? Math.round(totalScore) : 0

        // Generate community-specific insights
        analysis.community_benefits = identifyCommunityBenefits(bid, context)
        analysis.concerns = identifyCommunityConerns(bid, context)
        analysis.recommendations = generateContractorRecommendations(analysis, context)

        // Store analysis
        await supabase
          .from('community_contractor_analyses')
          .upsert({
            bid_id: bidId,
            project_id: projectId,
            community_id: criteria.community_id,
            analysis_results: analysis,
            analyzed_at: new Date().toISOString(),
            analyzed_by: props["user"]?.id
          })

        return analysis
      } catch (error) {
        console.error('Contractor bid analysis error:', error)
        return null
      }
    }

    // How many of OUR people will get jobs?
    function analyzeLocalWorkersCommitment(bid: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Percentage of local workers committed
      const localWorkerPercentage = bid.local_workers_percentage || 0
      score += Math.min(localWorkerPercentage, 60) // Up to 60 points

      // Specific hiring commitments for our priority groups
      const ourPriorities = context.priority_hiring || []
      const bidCommitments = bid.priority_hiring_commitments || []
      
      ourPriorities.forEach((priority: any) => {
        if (bidCommitments.includes(priority)) {
          score += 10 // 10 points per priority group
        }
      })

      // Training/apprenticeship for locals
      if (bid.local_training_programs) score += 15

      // Permanent vs temporary jobs
      if (bid.permanent_job_opportunities > 0) score += 15

      return Math.min(score, maxScore)
    }

    // Are they using Indigenous-owned contractors/suppliers?
    function analyzeIndigenousContractors(bid: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Main contractor is Indigenous-owned
      if (bid.contractor_indigenous_owned) score += 40

      // Indigenous subcontractors percentage
      const indigenousSubPercentage = bid.indigenous_subcontractors_percentage || 0
      score += Math.min(indigenousSubPercentage, 30)

      // Local Indigenous suppliers
      if (bid.local_indigenous_suppliers > 0) {
        score += Math.min(bid.local_indigenous_suppliers * 5, 20)
      }

      // Indigenous materials sourcing
      if (bid.indigenous_materials_sourcing) score += 10

      return Math.min(score, maxScore)
    }

    // Do they understand and respect our community?
    function analyzeCommunityRespect(bid: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Previous work with Indigenous communities
      if (bid.indigenous_community_experience) score += 25

      // Cultural protocols understanding
      if (bid.cultural_protocols_plan) score += 20

      // Community liaison commitment
      if (bid.community_liaison_designated) score += 15

      // Elder consultation process
      if (bid.elder_consultation_process) score += 15

      // Sacred site awareness
      if (bid.sacred_site_protection_plan) score += 15

      // Local community involvement
      if (bid.community_involvement_plan) score += 10

      return Math.min(score, maxScore)
    }

    // Do they do good quality work?
    function analyzeQualityTrackRecord(bid: any, context: any): number {
      let score = 0
      const maxScore = 100

      // Similar project experience
      const similarProjects = bid.similar_projects_completed || 0
      score += Math.min(similarProjects * 5, 30)

      // Quality certifications
      if (bid.quality_certifications?.length > 0) {
        score += Math.min(bid.quality_certifications.length * 10, 25)
      }

      // References from other Indigenous communities
      if (bid.indigenous_community_references > 0) {
        score += Math.min(bid.indigenous_community_references * 10, 25)
      }

      // On-time completion record
      const onTimePercentage = bid.on_time_completion_percentage || 0
      score += Math.min(onTimePercentage * 0.2, 20)

      return Math.min(score, maxScore)
    }

    // Is their price reasonable for what we're getting?
    function analyzePriceCompetitiveness(bid: any, context: any): number {
      let score = 50 // Neutral baseline
      const maxScore = 100

      const bidAmount = bid.total_bid_amount || 0
      const projectBudget = context.project_budget || 0

      if (bidAmount <= projectBudget * 0.8) score += 30        // 20% under budget
      else if (bidAmount <= projectBudget * 0.9) score += 20   // 10% under budget  
      else if (bidAmount <= projectBudget) score += 10         // At budget
      else if (bidAmount <= projectBudget * 1.1) score -= 10   // 10% over budget
      else score -= 30                                         // More than 10% over

      // Value for money considerations
      if (bid.warranty_years > 2) score += 10
      if (bid.maintenance_included) score += 10

      return Math.max(0, Math.min(score, maxScore))
    }

    // Check if bid meets our absolute requirements
    function checkMandatoryRequirements(bid: any, requirements: string[]): boolean {
      for (const requirement of requirements || []) {
        switch (requirement) {
          case 'minimum_local_workers_50':
            if ((bid.local_workers_percentage || 0) < 50) return false
            break
          case 'indigenous_owned_contractor':
            if (!bid.contractor_indigenous_owned) return false
            break
          case 'cultural_protocols_plan':
            if (!bid.cultural_protocols_plan) return false
            break
          case 'environmental_protection':
            if (!bid.environmental_protection_plan) return false
            break
          case 'bonding_insurance':
            if (!bid.bonding_and_insurance_confirmed) return false
            break
        }
      }
      return true
    }

    // What benefits will this bring to our community?
    function identifyCommunityBenefits(bid: any, context: any): string[] {
      const benefits = []

      const localJobs = bid.estimated_local_jobs || 0
      if (localJobs > 0) {
        benefits.push(`${localJobs} jobs for community members`)
      }

      const trainingOpportunities = bid.training_opportunities || 0
      if (trainingOpportunities > 0) {
        benefits.push(`${trainingOpportunities} training/apprenticeship opportunities`)
      }

      if (bid.local_materials_percentage > 0) {
        benefits.push(`${bid.local_materials_percentage}% local materials sourcing`)
      }

      if (bid.community_investment_amount > 0) {
        benefits.push(`$${bid.community_investment_amount.toLocaleString()} community investment`)
      }

      if (bid.long_term_maintenance_training) {
        benefits.push("Local maintenance training for ongoing building care")
      }

      return benefits
    }

    // What should we be concerned about?
    function identifyCommunityConerns(bid: any, context: any): string[] {
      const concerns = []

      if ((bid.local_workers_percentage || 0) < 30) {
        concerns.push("Low commitment to local hiring")
      }

      if (!bid.indigenous_community_experience) {
        concerns.push("No previous experience with Indigenous communities")
      }

      if (!bid.cultural_protocols_plan) {
        concerns.push("No plan for respecting cultural protocols")
      }

      if (bid.total_bid_amount > context.project_budget) {
        concerns.push("Bid exceeds project budget")
      }

      if (!bid.environmental_protection_plan) {
        concerns.push("No environmental protection measures outlined")
      }

      return concerns
    }

    // Recommendations for the contractor/community
    function generateContractorRecommendations(analysis: any, context: any): string[] {
      const recommendations = []

      if (analysis.component_scores.local_workers < 70) {
        recommendations.push("Request higher commitment to local hiring")
        recommendations.push("Negotiate training programs for community members")
      }

      if (analysis.component_scores.community_respect < 60) {
        recommendations.push("Require cultural awareness training for all workers")
        recommendations.push("Establish regular community liaison meetings")
      }

      if (analysis.component_scores.indigenous_contractors < 50) {
        recommendations.push("Increase Indigenous subcontractor participation")
        recommendations.push("Source more materials from Indigenous suppliers")
      }

      if (analysis.concerns.length > 0) {
        recommendations.push("Address all identified concerns before contract award")
      }

      return recommendations
    }

    return (
      <Component 
        {...props}
        communityProjectCriteria={communityProjectCriteria}
        setCommunityProjectCriteria={setCommunityProjectCriteria}
        projectContext={projectContext}
        setProjectContext={setProjectContext}
        setupCommunityProjectAnalysis={setupCommunityProjectAnalysis}
        analyzeContractorBid={analyzeContractorBid}
      />
    )
  }
}

// Community Construction Project Management
export function withCommunityConstructionProjects(Component: ComponentType<any>): ComponentType<any> {
  return (props: any) => {
    const [communityProjects, setCommunityProjects] = useState<any[]>([])
    const [activeProject, setActiveProject] = useState<any>(null)

    // Create new community construction project
    async function createCommunityProject(projectData: any) {
      try {
        const projectId = `PROJ-${projectData.community_id}-${Date.now()}`

        const { data, error } = await supabase
          .from('community_construction_projects')
          .insert({
            id: projectId,
            community_id: projectData.community_id,
            project_name: projectData.project_name,
            project_type: projectData.project_type,
            project_description: projectData.project_description,
            estimated_budget: projectData.estimated_budget,
            target_completion: projectData.target_completion,
            rfq_deadline: projectData.rfq_deadline,
            community_priorities: projectData.community_priorities,
            mandatory_requirements: projectData.mandatory_requirements,
            status: 'planning',
            created_by: props["user"]?.id,
            created_at: new Date().toISOString()
          })
          .select()

        if (error) throw error
        setActiveProject(data[0])
        return { success: true, project: data[0] }
      } catch (error) {
        console.error('Project creation error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    // Fetch community's construction projects
    async function fetchCommunityProjects(communityId: string) {
      try {
        const { data, error } = await supabase
          .from('community_construction_projects')
          .select(`
            *,
            construction_bids (
              id, contractor_name, total_bid_amount, status
            )
          `)
          .eq('community_id', communityId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCommunityProjects(data || [])
        return data
      } catch (error) {
        console.error('Projects fetch error:', error)
        return []
      }
    }

    // Generate RFQ document for community project
    async function generateProjectRFQ(projectId: string) {
      try {
        const { data: project } = await supabase
          .from('community_construction_projects')
          .select('*')
          .eq('id', projectId)
          .single()

        if (!project) return null

        const rfqDocument = {
          project_id: projectId,
          rfq_title: `${project.project_name} - Request for Proposals`,
          project_overview: project.project_description,
          submission_deadline: project.rfq_deadline,
          budget_range: `Up to $${project.estimated_budget?.toLocaleString()}`,
          evaluation_criteria: project.evaluation_criteria || {},
          mandatory_requirements: project.mandatory_requirements || [],
          community_priorities: project.community_priorities || [],
          submission_requirements: [
            "Detailed project timeline",
            "Local hiring plan",
            "Cultural protocols compliance plan",
            "Environmental protection measures",
            "References from Indigenous communities",
            "Proof of bonding and insurance"
          ]
        }

        // Store RFQ document
        await supabase
          .from('community_rfq_documents')
          .upsert({
            project_id: projectId,
            rfq_content: rfqDocument,
            published_at: new Date().toISOString(),
            published_by: props["user"]?.id
          })

        return rfqDocument
      } catch (error) {
        console.error('RFQ generation error:', error)
        return null
      }
    }

    return (
      <Component 
        {...props}
        communityProjects={communityProjects}
        activeProject={activeProject}
        createCommunityProject={createCommunityProject}
        fetchCommunityProjects={fetchCommunityProjects}
        generateProjectRFQ={generateProjectRFQ}
      />
    )
  }
}