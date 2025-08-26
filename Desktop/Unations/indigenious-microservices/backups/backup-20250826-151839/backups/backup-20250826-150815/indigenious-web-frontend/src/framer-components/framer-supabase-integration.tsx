// Code Override for Framer to connect to Supabase
// Copy this into a Code Override in Framer

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

// Initialize Supabase client
const supabase = createClient(
  'YOUR_SUPABASE_URL', // Replace with your Supabase URL
  'YOUR_SUPABASE_ANON_KEY' // Replace with your Supabase anon key
)

// Example: Fetch Indigenous Businesses
export function withBusinessData(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [businesses, setBusinesses] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      fetchBusinesses()
    }, [])

    async function fetchBusinesses() {
      try {
        const { data, error } = await supabase
          .from('indigenous_businesses')
          .select('*')
          .eq('verification_status', 'verified')
          .order('trust_score', { ascending: false })

        if (error) throw error
        setBusinesses(data || [])
      } catch (error) {
        console.error('Error fetching businesses:', error)
      } finally {
        setLoading(false)
      }
    }

    return <Component {...props} businesses={businesses} loading={loading} />
  }
}

// Example: Verify a Business
export function withVerification(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [verifying, setVerifying] = useState(false)

    async function verifyBusiness(businessId: number) {
      setVerifying(true)
      try {
        const { data, error } = await supabase
          .from('indigenous_businesses')
          .update({ 
            verification_status: 'verified',
            last_verified: new Date().toISOString(),
            trust_score: 95
          })
          .eq('id', businessId)
          .select()

        if (error) throw error
        console.log('Business verified:', data)
      } catch (error) {
        console.error('Verification error:', error)
      } finally {
        setVerifying(false)
      }
    }

    return <Component {...props} verifyBusiness={verifyBusiness} verifying={verifying} />
  }
}

// Example: Fetch RFQs with matching
export function withRFQMatching(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [rfqs, setRFQs] = useState([])
    const [matches, setMatches] = useState({})

    useEffect(() => {
      fetchRFQsAndMatch()
    }, [])

    async function fetchRFQsAndMatch() {
      try {
        // Fetch RFQs
        const { data: rfqData, error: rfqError } = await supabase
          .from('rfqs')
          .select('*')
          .gte('deadline', new Date().toISOString())
          .order('deadline', { ascending: true })

        if (rfqError) throw rfqError

        // Fetch verified businesses
        const { data: businessData, error: businessError } = await supabase
          .from('indigenous_businesses')
          .select('*')
          .eq('verification_status', 'verified')

        if (businessError) throw businessError

        // Match RFQs with businesses
        const matchedData = {}
        rfqData?.forEach(rfq => {
          matchedData[rfq.id] = businessData?.filter(business => {
            // Check capability match
            const hasCapability = business.capabilities?.some(cap => 
              rfq.required_capabilities?.includes(cap)
            )
            // Check location match
            const locationMatch = business.location?.includes(rfq.location.split(',')[1]?.trim())
            return hasCapability && locationMatch
          }) || []
        })

        setRFQs(rfqData || [])
        setMatches(matchedData)
      } catch (error) {
        console.error('Error in RFQ matching:', error)
      }
    }

    return <Component {...props} rfqs={rfqs} matches={matches} />
  }
}

// Example: Real-time updates
export function withRealtimeUpdates(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [updates, setUpdates] = useState([])

    useEffect(() => {
      // Subscribe to real-time changes
      const subscription = supabase
        .channel('business-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'indigenous_businesses'
          },
          (payload) => {
            console.log('Real-time update:', payload)
            setUpdates(prev => [...prev, payload])
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }, [])

    return <Component {...props} realtimeUpdates={updates} />
  }
}