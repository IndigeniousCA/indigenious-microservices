// Community Data Hook
// Manage community information and statistics

import { useState, useEffect, useMemo } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { Community, GeographicFilter } from '../types/geographic.types'

export function useCommunityData(filter?: GeographicFilter) {
  const [communities, setCommunities] = useState<Community[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load communities on mount or filter change
  useEffect(() => {
    loadCommunities()
  }, [filter])

  const loadCommunities = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In production, fetch from API with filters
      const mockCommunities: Community[] = [
        {
          id: 'comm-1',
          name: 'Ohsweken',
          nation: 'Haudenosaunee',
          territoryId: 'territory-1',
          bandNumber: '202',
          location: {
            coordinates: [-80.0992, 43.0658],
            address: 'Six Nations Reserve',
            region: 'Southern Ontario',
            province: 'Ontario',
            postalCode: 'N0A 1M0',
            accessNotes: 'Year-round road access via Highway 54'
          },
          population: {
            total: 12848,
            onReserve: 12848,
            offReserve: 14500,
            workforce: 6500,
            youth: 4200,
            elders: 1800
          },
          economic: {
            businesses: 156,
            employmentRate: 68,
            medianIncome: 42000,
            majorIndustries: ['Construction', 'Retail', 'Tourism', 'Agriculture'],
            businessGrowth: 12.5,
            economicLeakage: 45
          },
          infrastructure: {
            internetSpeed: 'broadband',
            internetReliability: 'good',
            roadAccess: 'year-round',
            utilities: [
              { type: 'electricity', provider: 'Hydro One', reliability: 'excellent' },
              { type: 'water', provider: 'Six Nations Water', reliability: 'good' },
              { type: 'internet', provider: 'Multiple ISPs', reliability: 'good' }
            ],
            nearestCity: {
              name: 'Brantford',
              distance: 25,
              driveTime: 30
            }
          },
          services: {
            healthCenter: true,
            school: true,
            communityCenter: true,
            eldersCare: true,
            youthPrograms: true,
            culturalCenter: true
          },
          contacts: [
            {
              id: 'contact-1',
              name: 'Sarah Johnson',
              role: 'Economic Development Officer',
              department: 'Economic Development',
              email: 'sarah.johnson@sixnations.ca',
              phone: '519-445-2201',
              preferredContact: 'email',
              languages: ['English', 'Mohawk'],
              availability: 'Monday-Friday 9-5',
              pronouns: 'she/her'
            }
          ],
          culturalInfo: {
            languages: [
              { name: 'Mohawk', speakers: 3500, status: 'conversational', revitalization: true, writingSystem: 'both' },
              { name: 'Cayuga', speakers: 200, status: 'endangered', revitalization: true, writingSystem: 'latin' }
            ],
            traditions: ['Longhouse ceremonies', 'Traditional medicine', 'Lacrosse'],
            ceremonies: {
              types: ['Thanksgiving ceremonies', 'Green Corn', 'Strawberry ceremony'],
              season: 'Year-round',
              participation: 'invitation'
            },
            artsCrafts: ['Beadwork', 'Pottery', 'Traditional regalia', 'Carving']
          },
          opportunities: {
            strengths: ['Strong cultural identity', 'Growing business sector', 'Strategic location'],
            challenges: ['Infrastructure gaps', 'Youth retention', 'Economic leakage'],
            priorities: ['Business development', 'Youth employment', 'Infrastructure'],
            partnerships: ['Brantford economic region', 'Indigenous tourism network']
          }
        },
        {
          id: 'comm-2',
          name: 'Tyendinaga',
          nation: 'Mohawk',
          territoryId: 'territory-2',
          bandNumber: '244',
          location: {
            coordinates: [-77.1886, 44.1866],
            address: 'Tyendinaga Mohawk Territory',
            region: 'Eastern Ontario',
            province: 'Ontario',
            postalCode: 'K0K 1X0'
          },
          population: {
            total: 2200,
            onReserve: 2200,
            offReserve: 5000,
            workforce: 1100,
            youth: 700,
            elders: 350
          },
          economic: {
            businesses: 45,
            employmentRate: 72,
            medianIncome: 48000,
            majorIndustries: ['Government', 'Retail', 'Cannabis', 'Services'],
            businessGrowth: 18.2
          },
          infrastructure: {
            internetSpeed: 'fiber',
            internetReliability: 'excellent',
            roadAccess: 'year-round',
            utilities: [
              { type: 'electricity', reliability: 'excellent' },
              { type: 'water', reliability: 'good' },
              { type: 'internet', reliability: 'excellent' }
            ],
            nearestCity: {
              name: 'Belleville',
              distance: 20,
              driveTime: 25
            }
          },
          services: {
            healthCenter: true,
            school: true,
            communityCenter: true,
            eldersCare: true,
            youthPrograms: true,
            culturalCenter: true
          },
          contacts: [
            {
              id: 'contact-2',
              name: 'Michael Thompson',
              role: 'Business Development Manager',
              email: 'michael.t@tyendinaga.net',
              phone: '613-396-3424',
              preferredContact: 'phone',
              languages: ['English', 'Mohawk']
            }
          ]
        },
        {
          id: 'comm-3',
          name: 'Membertou',
          nation: "Mi'kmaq",
          territoryId: 'territory-5',
          bandNumber: '28',
          location: {
            coordinates: [-60.2168, 46.1328],
            address: 'Membertou First Nation',
            region: 'Cape Breton',
            province: 'Nova Scotia',
            postalCode: 'B1S 0A1'
          },
          population: {
            total: 1800,
            onReserve: 800,
            offReserve: 1000,
            workforce: 900,
            youth: 500,
            elders: 250
          },
          economic: {
            businesses: 78,
            employmentRate: 85,
            medianIncome: 55000,
            majorIndustries: ['Gaming', 'Hospitality', 'Retail', 'Fisheries'],
            businessGrowth: 22.5,
            economicLeakage: 25
          },
          infrastructure: {
            internetSpeed: 'fiber',
            internetReliability: 'excellent',
            roadAccess: 'year-round',
            utilities: [
              { type: 'electricity', reliability: 'excellent' },
              { type: 'water', reliability: 'excellent' },
              { type: 'internet', reliability: 'excellent' }
            ],
            nearestCity: {
              name: 'Sydney',
              distance: 5,
              driveTime: 10
            }
          },
          services: {
            healthCenter: true,
            school: true,
            communityCenter: true,
            eldersCare: true,
            youthPrograms: true,
            culturalCenter: true
          },
          contacts: [
            {
              id: 'contact-3',
              name: 'Lisa Bernard',
              role: 'Director of Commerce',
              email: 'lbernard@membertou.ca',
              preferredContact: 'email',
              languages: ['English', "Mi'kmaq", 'French']
            }
          ],
          opportunities: {
            strengths: ['ISO certified governance', 'Diversified economy', 'Urban location'],
            challenges: ['Land constraints', 'Housing shortage'],
            priorities: ['Tech sector growth', 'Youth entrepreneurship'],
            partnerships: ['Cape Breton Partnership', 'Atlantic Canada Opportunities']
          }
        },
        {
          id: 'comm-4',
          name: 'Norway House',
          nation: 'Cree',
          territoryId: 'territory-4',
          bandNumber: '278',
          location: {
            coordinates: [-97.8503, 53.9711],
            address: 'Norway House Cree Nation',
            region: 'Northern Manitoba',
            province: 'Manitoba',
            postalCode: 'R0B 1B0',
            accessNotes: 'Winter road access December-March'
          },
          population: {
            total: 8500,
            onReserve: 5500,
            offReserve: 3000,
            workforce: 3500,
            youth: 3200,
            elders: 900
          },
          economic: {
            businesses: 32,
            employmentRate: 52,
            medianIncome: 35000,
            majorIndustries: ['Fishing', 'Forestry', 'Tourism', 'Transportation'],
            businessGrowth: 8.5
          },
          infrastructure: {
            internetSpeed: 'satellite',
            internetReliability: 'fair',
            roadAccess: 'seasonal',
            utilities: [
              { type: 'electricity', provider: 'Manitoba Hydro', reliability: 'good' },
              { type: 'water', reliability: 'fair' },
              { type: 'internet', reliability: 'poor', notes: 'Satellite only' }
            ],
            nearestCity: {
              name: 'Thompson',
              distance: 450,
              driveTime: 360
            }
          },
          services: {
            healthCenter: true,
            school: true,
            communityCenter: true,
            eldersCare: true,
            youthPrograms: true,
            culturalCenter: false
          },
          contacts: [
            {
              id: 'contact-4',
              name: 'Robert Evans',
              role: 'Economic Development Coordinator',
              phone: '204-359-6701',
              preferredContact: 'phone',
              languages: ['Cree', 'English']
            }
          ],
          opportunities: {
            strengths: ['Natural resources', 'Traditional knowledge', 'Tourism potential'],
            challenges: ['Remote location', 'Infrastructure', 'Internet connectivity'],
            priorities: ['Infrastructure development', 'Youth training', 'Business support'],
            partnerships: ['Northern Manitoba development', 'Resource companies']
          }
        },
        {
          id: 'comm-5',
          name: 'Iqaluit',
          nation: 'Inuit',
          territoryId: 'territory-3',
          location: {
            coordinates: [-68.7072, 63.7467],
            address: 'Iqaluit',
            region: 'Baffin Region',
            province: 'Nunavut',
            postalCode: 'X0A 0H0',
            accessNotes: 'Air access only, sea lift in summer'
          },
          population: {
            total: 7740,
            workforce: 3800,
            youth: 2800,
            elders: 450
          },
          economic: {
            businesses: 125,
            employmentRate: 76,
            medianIncome: 82000,
            majorIndustries: ['Government', 'Construction', 'Transportation', 'Retail'],
            businessGrowth: 15.2
          },
          infrastructure: {
            internetSpeed: 'satellite',
            internetReliability: 'fair',
            roadAccess: 'fly-in',
            utilities: [
              { type: 'electricity', reliability: 'good', notes: 'Diesel generation' },
              { type: 'water', reliability: 'good', notes: 'Trucked delivery' },
              { type: 'internet', reliability: 'poor', notes: 'Expensive satellite' }
            ]
          },
          services: {
            healthCenter: true,
            school: true,
            communityCenter: true,
            eldersCare: true,
            youthPrograms: true,
            culturalCenter: true
          },
          contacts: [
            {
              id: 'contact-5',
              name: 'Mary Iqaluit',
              role: 'Business Development Officer',
              email: 'mary.i@gov.nu.ca',
              preferredContact: 'email',
              languages: ['Inuktitut', 'English', 'French']
            }
          ]
        }
      ]

      // Apply filters
      let filtered = mockCommunities

      if (filter) {
        if (filter.territories?.length) {
          filtered = filtered.filter(c => filter.territories!.includes(c.territoryId))
        }
        if (filter.provinces?.length) {
          filtered = filtered.filter(c => filter.provinces!.includes(c.location.province))
        }
        if (filter.populationMin) {
          filtered = filtered.filter(c => c.population.total >= filter.populationMin!)
        }
        if (filter.populationMax) {
          filtered = filtered.filter(c => c.population.total <= filter.populationMax!)
        }
        if (filter.internetAvailable !== undefined) {
          filtered = filtered.filter(c => 
            filter.internetAvailable ? c.infrastructure.internetSpeed !== 'none' : true
          )
        }
      }

      setCommunities(filtered)
    } catch (err) {
      setError('Failed to load communities')
      logger.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Get community by ID
  const getCommunityById = (id: string) => {
    return communities.find(c => c.id === id)
  }

  // Get communities by nation
  const getCommunitiesByNation = (nation: string) => {
    return communities.filter(c => 
      c.nation.toLowerCase().includes(nation.toLowerCase())
    )
  }

  // Get communities by territory
  const getCommunitiesByTerritory = (territoryId: string) => {
    return communities.filter(c => c.territoryId === territoryId)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const total = communities.length
    const totalPopulation = communities.reduce((sum, c) => sum + c.population.total, 0)
    const totalBusinesses = communities.reduce((sum, c) => sum + c.economic.businesses, 0)
    const avgEmploymentRate = communities.reduce((sum, c) => sum + c.economic.employmentRate, 0) / total
    const withFiberInternet = communities.filter(c => c.infrastructure.internetSpeed === 'fiber').length
    const yearRoundAccess = communities.filter(c => c.infrastructure.roadAccess === 'year-round').length

    return {
      total,
      totalPopulation,
      totalBusinesses,
      avgEmploymentRate,
      withFiberInternet,
      yearRoundAccess,
      internetCoverage: (communities.filter(c => 
        ['fiber', 'broadband'].includes(c.infrastructure.internetSpeed || '')
      ).length / total) * 100
    }
  }, [communities])

  return {
    communities,
    isLoading,
    error,
    getCommunityById,
    getCommunitiesByNation,
    getCommunitiesByTerritory,
    stats,
    refresh: loadCommunities
  }
}