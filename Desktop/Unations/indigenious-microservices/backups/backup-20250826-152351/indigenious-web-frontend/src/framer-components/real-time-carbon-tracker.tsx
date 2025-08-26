// Real-Time Carbon Tracking System
// Track carbon emissions for every procurement decision in real-time

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Real-Time Carbon Tracking Engine
export function withRealTimeCarbonTracker(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [carbonData, setCarbonData] = useState({
      transportation: 0,
      materials: 0,
      energy: 0,
      waste: 0,
      total: 0
    })

    const [carbonComparison, setCarbonComparison] = useState(null)
    const [trackingActive, setTrackingActive] = useState(false)

    // Calculate real-time carbon footprint for procurement
    async function calculateProcurementCarbon(procurementId: string, bidId: string) {
      try {
        setTrackingActive(true)

        // Get procurement and bid details
        const { data: procurement } = await supabase
          .from('procurement_opportunities')
          .select('*')
          .eq('id', procurementId)
          .single()

        const { data: bid } = await supabase
          .from('procurement_bids')
          .select('*')
          .eq('id', bidId)
          .single()

        if (!procurement || !bid) {
          throw new Error('Missing procurement or bid data')
        }

        // Calculate each carbon component
        const transportationCarbon = await calculateTransportationCarbon(bid, procurement)
        const materialsCarbon = await calculateMaterialsCarbon(bid)
        const energyCarbon = await calculateEnergyCarbon(bid, procurement)
        const wasteCarbon = await calculateWasteCarbon(bid, procurement)

        const totalCarbon = transportationCarbon + materialsCarbon + energyCarbon + wasteCarbon

        const carbonBreakdown = {
          procurement_id: procurementId,
          bid_id: bidId,
          transportation: transportationCarbon,
          materials: materialsCarbon,
          energy: energyCarbon,
          waste: wasteCarbon,
          total: totalCarbon,
          calculated_at: new Date().toISOString(),
          carbon_intensity: totalCarbon / (bid.total_amount || 1), // tonnes per dollar
          methodology: 'real_time_tracker_v1'
        }

        // Store carbon calculation
        await supabase
          .from('carbon_calculations')
          .upsert(carbonBreakdown)

        setCarbonData(carbonBreakdown)

        // Generate comparison with alternatives
        const comparison = await generateCarbonComparison(procurementId, carbonBreakdown)
        setCarbonComparison(comparison)

        return { success: true, carbon: carbonBreakdown, comparison }
      } catch (error) {
        console.error('Carbon calculation error:', error)
        return { success: false, error: error.message }
      } finally {
        setTrackingActive(false)
      }
    }

    // Calculate transportation carbon emissions
    async function calculateTransportationCarbon(bid: any, procurement: any): Promise<number> {
      // Get distance between supplier and delivery location
      const distance = await getTransportDistance(
        bid.supplier_location,
        procurement.delivery_location
      )

      // Estimate shipment weight/volume based on project
      const estimatedWeight = estimateShipmentWeight(bid, procurement)
      
      // Calculate emissions based on transport mode
      const transportMode = bid.transport_mode || 'truck' // truck, rail, air, ship
      const emissionFactor = getTransportEmissionFactor(transportMode)

      // Carbon = distance × weight × emission factor
      const transportCarbon = distance * estimatedWeight * emissionFactor / 1000 // Convert to tonnes

      return Math.round(transportCarbon * 100) / 100 // Round to 2 decimals
    }

    // Calculate materials carbon emissions
    async function calculateMaterialsCarbon(bid: any): Promise<number> {
      let materialsCarbon = 0

      // Material quantities and types from bid
      const materials = bid.materials_list || []

      for (const material of materials) {
        const quantity = material.quantity || 0
        const materialType = material.type || 'generic'
        const emissionFactor = getMaterialEmissionFactor(materialType)
        
        // Check if local sourcing (reduces emissions)
        const localSourcingReduction = material.local_sourcing ? 0.3 : 0 // 30% reduction
        
        const materialCarbon = quantity * emissionFactor * (1 - localSourcingReduction)
        materialsCarbon += materialCarbon
      }

      // Sustainable materials bonus
      const sustainablePercentage = bid.sustainable_materials_percentage || 0
      const sustainabilityReduction = sustainablePercentage / 100 * 0.4 // Up to 40% reduction

      materialsCarbon *= (1 - sustainabilityReduction)

      return Math.round(materialsCarbon * 100) / 100
    }

    // Calculate energy carbon emissions during project
    async function calculateEnergyCarbon(bid: any, procurement: any): Promise<number> {
      // Estimate energy usage based on project type and duration
      const projectDuration = procurement.estimated_duration_days || 30
      const energyIntensity = getProjectEnergyIntensity(procurement.project_type)
      
      // Total energy estimate (kWh)
      const totalEnergyKwh = projectDuration * energyIntensity * (bid.team_size || 10)

      // Grid emission factor (varies by province/territory)
      const gridEmissionFactor = getGridEmissionFactor(procurement.delivery_location)

      // Calculate base energy emissions
      let energyCarbon = totalEnergyKwh * gridEmissionFactor / 1000 // Convert to tonnes

      // Renewable energy commitment reduces emissions
      const renewablePercentage = bid.renewable_energy_commitment || 0
      energyCarbon *= (1 - renewablePercentage / 100)

      return Math.round(energyCarbon * 100) / 100
    }

    // Calculate waste carbon emissions
    async function calculateWasteCarbon(bid: any, procurement: any): Promise<number> {
      // Estimate waste generation based on project type
      const wasteIntensity = getProjectWasteIntensity(procurement.project_type)
      const projectSize = bid.total_amount || 100000 // Use project value as size proxy
      
      // Total waste estimate (tonnes)
      const totalWaste = projectSize * wasteIntensity / 100000

      // Waste emission factor (methane from landfills, etc.)
      const wasteEmissionFactor = 0.5 // tonnes CO2e per tonne waste

      // Calculate base waste emissions
      let wasteCarbon = totalWaste * wasteEmissionFactor

      // Waste diversion reduces emissions
      const wasteDiversionRate = bid.waste_diversion_percentage || 20 // Default 20%
      wasteCarbon *= (1 - wasteDiversionRate / 100)

      return Math.round(wasteCarbon * 100) / 100
    }

    // Generate comparison with alternative scenarios
    async function generateCarbonComparison(procurementId: string, currentCarbon: any) {
      try {
        // Get all bids for this procurement
        const { data: allBids } = await supabase
          .from('procurement_bids')
          .select('*')
          .eq('procurement_id', procurementId)

        // Calculate carbon for each bid
        const { data: procurement } = await supabase
          .from('procurement_opportunities')
          .select('*')
          .eq('id', procurementId)
          .single()

        const carbonComparisons = []

        for (const bid of allBids || []) {
          if (bid.id === currentCarbon.bid_id) {
            carbonComparisons.push({
              bid_id: bid.id,
              contractor_name: bid.contractor_name,
              carbon_total: currentCarbon.total,
              is_current: true
            })
          } else {
            // Quick carbon estimate for comparison
            const quickCarbon = await quickCarbonEstimate(bid, procurement)
            carbonComparisons.push({
              bid_id: bid.id,
              contractor_name: bid.contractor_name,
              carbon_total: quickCarbon,
              is_current: false
            })
          }
        }

        // Sort by carbon (lowest first)
        carbonComparisons.sort((a, b) => a.carbon_total - b.carbon_total)

        // Find current bid position
        const currentPosition = carbonComparisons.findIndex(c => c.is_current) + 1
        const lowestCarbon = carbonComparisons[0]
        const highestCarbon = carbonComparisons[carbonComparisons.length - 1]

        return {
          current_carbon: currentCarbon.total,
          current_position: currentPosition,
          total_bids: carbonComparisons.length,
          lowest_carbon: lowestCarbon.carbon_total,
          highest_carbon: highestCarbon.carbon_total,
          carbon_savings_vs_highest: highestCarbon.carbon_total - currentCarbon.total,
          carbon_penalty_vs_lowest: currentCarbon.total - lowestCarbon.carbon_total,
          all_comparisons: carbonComparisons
        }
      } catch (error) {
        console.error('Carbon comparison error:', error)
        return null
      }
    }

    // Quick carbon estimate for comparison purposes
    async function quickCarbonEstimate(bid: any, procurement: any): Promise<number> {
      // Simplified calculation for quick comparison
      const distance = await getTransportDistance(bid.supplier_location, procurement.delivery_location)
      const transportCarbon = distance * 0.1 // Simplified factor
      
      const baseMaterialsCarbon = (bid.total_amount || 0) * 0.0001 // Rough estimate
      const sustainabilityReduction = (bid.sustainable_materials_percentage || 0) / 100 * 0.3
      const materialsCarbon = baseMaterialsCarbon * (1 - sustainabilityReduction)
      
      return Math.round((transportCarbon + materialsCarbon) * 100) / 100
    }

    // Get transport distance between two locations
    async function getTransportDistance(from: string, to: string): Promise<number> {
      // In production, would use Google Maps API or similar
      // For now, return mock data based on location patterns
      
      if (!from || !to) return 1000 // Default distance
      
      // Mock logic - in real world would call mapping service
      if (from.includes(to.split(',')[1]?.trim() || '')) {
        return Math.random() * 100 + 10 // Local: 10-110 km
      } else if (from.includes(to.split(',')[0]?.trim() || '')) {
        return Math.random() * 500 + 100 // Regional: 100-600 km
      } else {
        return Math.random() * 2500 + 500 // Long distance: 500-3000 km
      }
    }

    // Get emission factor by transport mode (kg CO2e per tonne-km)
    function getTransportEmissionFactor(mode: string): number {
      const factors = {
        truck: 0.089,      // Road freight
        rail: 0.022,       // Rail freight
        ship: 0.015,       // Marine freight
        air: 0.602,        // Air freight
        pipeline: 0.005    // Pipeline
      }
      return factors[mode] || factors.truck
    }

    // Get material emission factor (kg CO2e per unit)
    function getMaterialEmissionFactor(materialType: string): number {
      const factors = {
        concrete: 0.13,     // kg CO2e per kg
        steel: 1.85,        // kg CO2e per kg
        aluminum: 11.5,     // kg CO2e per kg
        wood: -0.9,         // Negative (carbon sequestration)
        plastic: 1.8,       // kg CO2e per kg
        glass: 0.85,        // kg CO2e per kg
        copper: 2.95,       // kg CO2e per kg
        gravel: 0.004,      // kg CO2e per kg
        generic: 0.5        // Default factor
      }
      return factors[materialType] || factors.generic
    }

    // Estimate shipment weight based on project
    function estimateShipmentWeight(bid: any, procurement: any): number {
      // Estimate weight in tonnes based on project type and value
      const projectValue = bid.total_amount || 100000
      const projectType = procurement.project_type || 'general'
      
      const weightFactors = {
        construction: 0.1,    // 0.1 tonnes per $1000
        infrastructure: 0.15,  // Heavy materials
        technology: 0.001,     // Light but valuable
        services: 0.01,        // Minimal materials
        manufacturing: 0.05,   // Medium weight
        general: 0.05
      }
      
      return projectValue * (weightFactors[projectType] || weightFactors.general) / 1000
    }

    // Get project energy intensity (kWh per day per person)
    function getProjectEnergyIntensity(projectType: string): number {
      const intensities = {
        construction: 50,      // High energy use
        infrastructure: 75,    // Very high energy
        technology: 25,        // Moderate energy
        services: 10,          // Low energy
        manufacturing: 100,    // Highest energy
        general: 30
      }
      return intensities[projectType] || intensities.general
    }

    // Get grid emission factor by location (kg CO2e per kWh)
    function getGridEmissionFactor(location: string): number {
      // Canadian provincial grid factors (2023 data)
      const gridFactors = {
        'AB': 0.632,  // Alberta (coal/gas heavy)
        'SK': 0.620,  // Saskatchewan (coal heavy)
        'NS': 0.640,  // Nova Scotia (coal heavy)
        'NB': 0.290,  // New Brunswick (nuclear/hydro)
        'ON': 0.040,  // Ontario (nuclear/hydro heavy)
        'QC': 0.014,  // Quebec (hydro dominant)
        'MB': 0.002,  // Manitoba (hydro dominant)
        'BC': 0.013,  // British Columbia (hydro dominant)
        'PE': 0.000,  // Prince Edward Island (wind)
        'NL': 0.025,  // Newfoundland (hydro heavy)
        'NT': 0.150,  // Northwest Territories (mixed)
        'NU': 0.200,  // Nunavut (diesel heavy)
        'YT': 0.020   // Yukon (hydro heavy)
      }
      
      // Extract province/territory from location
      const province = location?.split(',')[1]?.trim().toUpperCase()
      return gridFactors[province] || 0.150 // Default factor
    }

    // Get project waste intensity (tonnes waste per $100k project value)
    function getProjectWasteIntensity(projectType: string): number {
      const wasteFactors = {
        construction: 15,      // High waste generation
        infrastructure: 20,    // Very high waste
        technology: 2,         // Low waste
        services: 1,           // Minimal waste
        manufacturing: 10,     // Moderate waste
        general: 8
      }
      return wasteFactors[projectType] || wasteFactors.general
    }

    // Real-time carbon monitoring dashboard
    const [liveMetrics, setLiveMetrics] = useState({
      current_rate: 0,           // tonnes CO2e per hour
      daily_total: 0,            // tonnes CO2e today
      weekly_trend: 'decreasing', // increasing/decreasing/stable
      efficiency_score: 85       // 0-100 scale
    })

    // Update live metrics
    useEffect(() => {
      if (trackingActive) {
        const interval = setInterval(() => {
          setLiveMetrics(prev => ({
            ...prev,
            current_rate: Math.random() * 2,
            daily_total: prev.daily_total + Math.random() * 0.1,
            efficiency_score: Math.min(100, prev.efficiency_score + Math.random() * 2 - 1)
          }))
        }, 5000) // Update every 5 seconds

        return () => clearInterval(interval)
      }
    }, [trackingActive])

    return (
      <Component 
        {...props}
        carbonData={carbonData}
        carbonComparison={carbonComparison}
        trackingActive={trackingActive}
        liveMetrics={liveMetrics}
        calculateProcurementCarbon={calculateProcurementCarbon}
      />
    )
  }
}