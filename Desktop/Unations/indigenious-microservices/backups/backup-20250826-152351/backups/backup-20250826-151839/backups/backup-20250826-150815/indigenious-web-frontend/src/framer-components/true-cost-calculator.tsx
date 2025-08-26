// True Cost Calculator - Price + Carbon + Social Impact
// Calculate the REAL cost including environmental and social externalities

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// True Cost Calculator Engine
export function withTrueCostCalculator(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [trueCostBreakdown, setTrueCostBreakdown] = useState({
      base_price: 0,
      carbon_cost: 0,
      social_cost: 0,
      opportunity_cost: 0,
      total_true_cost: 0
    })

    const [costComparison, setCostComparison] = useState([])
    const [carbonPricing, setCarbonPricing] = useState({
      carbon_price_per_tonne: 150,    // Current Canadian carbon price
      social_cost_of_carbon: 185,     // Social cost of carbon (USD)
      community_carbon_value: 200     // What THIS community values carbon at
    })

    // Calculate true cost of procurement including all externalities
    async function calculateTrueCost(procurementId: string, bidId: string, communityId?: string) {
      try {
        // Get bid details
        const { data: bid } = await supabase
          .from('procurement_bids')
          .select('*')
          .eq('id', bidId)
          .single()

        // Get procurement details
        const { data: procurement } = await supabase
          .from('procurement_opportunities')
          .select('*')
          .eq('id', procurementId)
          .single()

        // Get community's carbon pricing preferences if available
        let communityPricing = carbonPricing
        if (communityId) {
          const { data: communitySettings } = await supabase
            .from('community_carbon_pricing')
            .select('*')
            .eq('community_id', communityId)
            .single()
          
          if (communitySettings) {
            communityPricing = communitySettings
          }
        }

        // 1. Base Price (what's on the invoice)
        const basePrice = bid.total_amount || 0

        // 2. Carbon Cost (environmental externality)
        const carbonCost = await calculateCarbonCost(bid, procurement, communityPricing)

        // 3. Social Cost (community impact)
        const socialCost = await calculateSocialCost(bid, procurement, communityId)

        // 4. Opportunity Cost (what community loses by not choosing alternatives)
        const opportunityCost = await calculateOpportunityCost(procurementId, bid, communityId)

        // Calculate total true cost
        const totalTrueCost = basePrice + carbonCost + socialCost + opportunityCost

        const breakdown = {
          procurement_id: procurementId,
          bid_id: bidId,
          community_id: communityId,
          base_price: basePrice,
          carbon_cost: carbonCost,
          social_cost: socialCost,
          opportunity_cost: opportunityCost,
          total_true_cost: totalTrueCost,
          carbon_price_used: communityPricing.community_carbon_value,
          calculated_at: new Date().toISOString(),
          methodology: 'true_cost_calculator_v1'
        }

        // Store calculation
        await supabase
          .from('true_cost_calculations')
          .upsert(breakdown)

        setTrueCostBreakdown(breakdown)

        // Generate cost comparison with other bids
        const comparison = await generateTrueCostComparison(procurementId, breakdown, communityId)
        setCostComparison(comparison)

        return { success: true, trueCost: breakdown, comparison }
      } catch (error) {
        console.error('True cost calculation error:', error)
        return { success: false, error: error.message }
      }
    }

    // Calculate carbon cost (carbon emissions × carbon price)
    async function calculateCarbonCost(bid: any, procurement: any, pricing: any): Promise<number> {
      // Get carbon footprint from our carbon tracker
      let carbonEmissions = 0

      // Transportation carbon
      const transportDistance = await getTransportDistance(
        bid.supplier_location,
        procurement.delivery_location
      )
      const transportCarbon = calculateTransportCarbon(transportDistance, bid)

      // Materials carbon
      const materialsCarbon = calculateMaterialsCarbon(bid)

      // Energy carbon
      const energyCarbon = calculateEnergyCarbon(bid, procurement)

      carbonEmissions = transportCarbon + materialsCarbon + energyCarbon

      // Apply carbon price (community can set their own price)
      const carbonCost = carbonEmissions * pricing.community_carbon_value

      return Math.round(carbonCost * 100) / 100
    }

    // Calculate social cost (impact on community well-being)
    async function calculateSocialCost(bid: any, procurement: any, communityId?: string): Promise<number> {
      let socialCost = 0

      // 1. Employment impact cost
      const employmentCost = calculateEmploymentImpactCost(bid, communityId)
      socialCost += employmentCost

      // 2. Local economy leakage cost
      const economicLeakageCost = calculateEconomicLeakageCost(bid)
      socialCost += economicLeakageCost

      // 3. Cultural disruption cost
      const culturalCost = calculateCulturalDisruptionCost(bid)
      socialCost += culturalCost

      // 4. Infrastructure strain cost
      const infrastructureCost = calculateInfrastructureCost(bid, procurement)
      socialCost += infrastructureCost

      return Math.round(socialCost * 100) / 100
    }

    // Calculate opportunity cost (what community loses by not choosing best alternative)
    async function calculateOpportunityCost(procurementId: string, selectedBid: any, communityId?: string): Promise<number> {
      try {
        // Get all bids for this procurement
        const { data: allBids } = await supabase
          .from('procurement_bids')
          .select('*')
          .eq('procurement_id', procurementId)

        if (!allBids || allBids.length <= 1) return 0

        // Calculate community benefits for each bid
        let maxCommunityBenefit = 0
        let selectedBidBenefit = 0

        for (const bid of allBids) {
          const communityBenefit = calculateCommunityBenefit(bid)
          
          if (bid.id === selectedBid.id) {
            selectedBidBenefit = communityBenefit
          }
          
          if (communityBenefit > maxCommunityBenefit) {
            maxCommunityBenefit = communityBenefit
          }
        }

        // Opportunity cost = maximum possible benefit - selected bid benefit
        const opportunityCost = Math.max(0, maxCommunityBenefit - selectedBidBenefit)

        return Math.round(opportunityCost * 100) / 100
      } catch (error) {
        console.error('Opportunity cost calculation error:', error)
        return 0
      }
    }

    // Calculate employment impact cost (unemployment × social cost)
    function calculateEmploymentImpactCost(bid: any, communityId?: string): number {
      // Estimate how many local jobs this bid will create
      const localJobsCreated = bid.estimated_local_jobs || 0
      const jobsNeeded = 20 // Estimate of community unemployment
      const jobsGap = Math.max(0, jobsNeeded - localJobsCreated)

      // Social cost of unemployment (cost of social services, lost productivity, etc.)
      const socialCostPerUnemployed = 35000 // Annual cost per unemployed person

      // Portion of annual cost attributed to this project
      const projectDuration = bid.project_duration_months || 6
      const unemploymentCost = jobsGap * socialCostPerUnemployed * (projectDuration / 12)

      return unemploymentCost
    }

    // Calculate economic leakage cost (money leaving community)
    function calculateEconomicLeakageCost(bid: any): number {
      const totalSpending = bid.total_amount || 0
      const localSpendingPercentage = bid.local_procurement_percentage || 20
      const moneyLeaving = totalSpending * (100 - localSpendingPercentage) / 100

      // Economic multiplier effect - money leaving reduces local economic activity
      const economicMultiplier = 1.4 // Each dollar has 1.4x impact when kept local
      const economicLeakageCost = moneyLeaving * (economicMultiplier - 1)

      return economicLeakageCost
    }

    // Calculate cultural disruption cost
    function calculateCulturalDisruptionCost(bid: any): number {
      let culturalCost = 0

      // No cultural protocols plan
      if (!bid.cultural_protocols_plan) {
        culturalCost += 25000 // Cost of cultural conflicts, delays, relationship damage
      }

      // No Indigenous consultation
      if (!bid.indigenous_consultation_plan) {
        culturalCost += 15000
      }

      // No elder involvement
      if (!bid.elder_consultation_commitment) {
        culturalCost += 10000
      }

      return culturalCost
    }

    // Calculate infrastructure strain cost
    function calculateInfrastructureCost(bid: any, procurement: any): number {
      // Heavy equipment, large teams strain community infrastructure
      const teamSize = bid.team_size || 10
      const equipmentCount = bid.heavy_equipment_count || 0
      
      // Cost per additional person/equipment using community infrastructure
      const infrastructureCostPerPerson = 500  // Roads, utilities, waste management
      const infrastructureCostPerEquipment = 2000

      const totalInfrastructureCost = (teamSize * infrastructureCostPerPerson) + 
                                      (equipmentCount * infrastructureCostPerEquipment)

      return totalInfrastructureCost
    }

    // Calculate community benefit value
    function calculateCommunityBenefit(bid: any): number {
      let benefit = 0

      // Local employment benefit
      const localJobs = bid.estimated_local_jobs || 0
      benefit += localJobs * 45000 // Average annual salary value

      // Training benefit
      const trainingPositions = bid.training_positions || 0
      benefit += trainingPositions * 15000 // Value of skills training

      // Local procurement benefit
      const localSpending = (bid.total_amount || 0) * (bid.local_procurement_percentage || 0) / 100
      benefit += localSpending * 0.4 // 40% multiplier effect

      // Indigenous business participation benefit
      const indigenousSpending = (bid.total_amount || 0) * (bid.indigenous_subcontractor_percentage || 0) / 100
      benefit += indigenousSpending * 0.6 // Higher multiplier for Indigenous businesses

      return benefit
    }

    // Generate true cost comparison across all bids
    async function generateTrueCostComparison(procurementId: string, currentCalculation: any, communityId?: string) {
      try {
        const { data: allBids } = await supabase
          .from('procurement_bids')
          .select('*')
          .eq('procurement_id', procurementId)

        const { data: procurement } = await supabase
          .from('procurement_opportunities')
          .select('*')
          .eq('id', procurementId)
          .single()

        const comparisons = []

        for (const bid of allBids || []) {
          if (bid.id === currentCalculation.bid_id) {
            // Use current detailed calculation
            comparisons.push({
              bid_id: bid.id,
              contractor_name: bid.contractor_name,
              base_price: currentCalculation.base_price,
              carbon_cost: currentCalculation.carbon_cost,
              social_cost: currentCalculation.social_cost,
              opportunity_cost: currentCalculation.opportunity_cost,
              total_true_cost: currentCalculation.total_true_cost,
              is_current: true
            })
          } else {
            // Quick calculation for comparison
            const quickTrueCost = await quickTrueCostEstimate(bid, procurement, communityId)
            comparisons.push({
              bid_id: bid.id,
              contractor_name: bid.contractor_name,
              ...quickTrueCost,
              is_current: false
            })
          }
        }

        // Sort by total true cost (lowest first)
        comparisons.sort((a, b) => a.total_true_cost - b.total_true_cost)

        // Add rankings and savings
        comparisons.forEach((comp, index) => {
          comp.rank = index + 1
          comp.savings_vs_most_expensive = comparisons[comparisons.length - 1].total_true_cost - comp.total_true_cost
          comp.penalty_vs_cheapest = comp.total_true_cost - comparisons[0].total_true_cost
        })

        return comparisons
      } catch (error) {
        console.error('True cost comparison error:', error)
        return []
      }
    }

    // Quick true cost estimate for comparison
    async function quickTrueCostEstimate(bid: any, procurement: any, communityId?: string) {
      const basePrice = bid.total_amount || 0

      // Quick carbon cost estimate
      const estimatedCarbon = (basePrice * 0.0001) + (bid.transport_distance || 1000) * 0.05
      const carbonCost = estimatedCarbon * carbonPricing.community_carbon_value

      // Quick social cost estimate
      const jobsGap = Math.max(0, 20 - (bid.estimated_local_jobs || 0))
      const socialCost = jobsGap * 15000 + (basePrice * 0.1) // Simplified

      const totalTrueCost = basePrice + carbonCost + socialCost

      return {
        base_price: basePrice,
        carbon_cost: carbonCost,
        social_cost: socialCost,
        opportunity_cost: 0, // Skip for quick estimate
        total_true_cost: totalTrueCost
      }
    }

    // Helper functions (simplified versions from carbon tracker)
    async function getTransportDistance(from: string, to: string): Promise<number> {
      // Mock implementation - would use mapping API in production
      return Math.random() * 2000 + 100
    }

    function calculateTransportCarbon(distance: number, bid: any): number {
      const weight = (bid.total_amount || 100000) * 0.01 // Estimate weight from project value
      return distance * weight * 0.0001 // Simplified emission factor
    }

    function calculateMaterialsCarbon(bid: any): number {
      const materialsValue = (bid.total_amount || 0) * 0.6 // 60% typically materials
      const sustainabilityReduction = (bid.sustainable_materials_percentage || 0) / 100 * 0.3
      return materialsValue * 0.0002 * (1 - sustainabilityReduction)
    }

    function calculateEnergyCarbon(bid: any, procurement: any): number {
      const duration = procurement.estimated_duration_days || 30
      const teamSize = bid.team_size || 10
      return duration * teamSize * 0.05 // Simplified energy carbon
    }

    // Community carbon pricing setter
    async function updateCommunityCarbon(communityId: string, newPricing: any) {
      try {
        await supabase
          .from('community_carbon_pricing')
          .upsert({
            community_id: communityId,
            ...newPricing,
            updated_at: new Date().toISOString()
          })

        setCarbonPricing(newPricing)
        return { success: true }
      } catch (error) {
        console.error('Carbon pricing update error:', error)
        return { success: false, error: error.message }
      }
    }

    return (
      <Component 
        {...props}
        trueCostBreakdown={trueCostBreakdown}
        costComparison={costComparison}
        carbonPricing={carbonPricing}
        setCarbonPricing={setCarbonPricing}
        calculateTrueCost={calculateTrueCost}
        updateCommunityCarbon={updateCommunityCarbon}
      />
    )
  }
}