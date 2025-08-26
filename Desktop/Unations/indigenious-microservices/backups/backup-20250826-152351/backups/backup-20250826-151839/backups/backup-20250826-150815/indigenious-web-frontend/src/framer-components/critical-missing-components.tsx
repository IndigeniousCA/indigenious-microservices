// Critical Missing Components for Framer
// These are essential for your Indigenous platform functionality

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// 1. Document Upload Component for Business Verification
export function withDocumentUpload(Component: ComponentType<any>): ComponentType<any> {
  return (props: any) => {
    const [uploading, setUploading] = useState(false)
    const [documents, setDocuments] = useState<any[]>([])

    async function uploadDocument(file: File, documentType: string) {
      setUploading(true)
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `documents/${documentType}/${fileName}`

        const { data, error } = await supabase.storage
          .from('business-documents')
          .upload(filePath, file)

        if (error) throw error

        // Save document record to database
        const { error: dbError } = await supabase
          .from('business_documents')
          .insert({
            file_path: filePath,
            document_type: documentType,
            file_name: file.name,
            file_size: file.size,
            uploaded_at: new Date().toISOString()
          })

        if (dbError) throw dbError

        alert('Document uploaded successfully!')
        fetchDocuments()
      } catch (error) {
        console.error('Upload error:', error)
        alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
      } finally {
        setUploading(false)
      }
    }

    async function fetchDocuments() {
      const { data } = await supabase
        .from('business_documents')
        .select('*')
        .order('uploaded_at', { ascending: false })
      
      setDocuments(data || [])
    }

    useEffect(() => {
      fetchDocuments()
    }, [])

    return (
      <Component 
        {...props}
        uploadDocument={uploadDocument}
        uploading={uploading}
        documents={documents}
      />
    )
  }
}

// 2. Fraud Detection Component
export function withFraudDetection(Component: ComponentType<any>): ComponentType<any> {
  return (props: any) => {
    const [riskAnalysis, setRiskAnalysis] = useState<any>(null)
    const [checking, setChecking] = useState(false)

    async function analyzeFraudRisk(businessId: number) {
      setChecking(true)
      try {
        // Get business data
        const { data: business } = await supabase
          .from('indigenous_businesses')
          .select('*')
          .eq('id', businessId)
          .single()

        if (!business) throw new Error('Business not found')

        // Calculate risk factors
        const riskFactors = {
          // High revenue per employee (red flag)
          highRevenuePerEmployee: business.revenue_per_employee > 400000,
          
          // Low local employment
          lowLocalEmployment: business.local_employees < 5,
          
          // Recent incorporation with high contracts
          recentHighActivity: business.contracts > 10 && 
            new Date(business.created_at) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          
          // Check for address sharing
          sharedAddress: await checkSharedAddress(business.location),
          
          // Director overlap
          directorOverlap: await checkDirectorOverlap(businessId)
        }

        // Calculate overall risk score
        const riskScore = Object.values(riskFactors).filter(Boolean).length * 20

        setRiskAnalysis({
          businessId,
          riskScore,
          riskFactors,
          recommendation: riskScore > 60 ? 'HIGH_RISK' : riskScore > 30 ? 'MEDIUM_RISK' : 'LOW_RISK',
          analysis: generateRiskAnalysis(riskFactors)
        })

        // Update business risk score
        await supabase
          .from('indigenous_businesses')
          .update({ risk_score: riskScore })
          .eq('id', businessId)

      } catch (error) {
        console.error('Risk analysis error:', error)
      } finally {
        setChecking(false)
      }
    }

    async function checkSharedAddress(address: string) {
      const { data } = await supabase
        .from('indigenous_businesses')
        .select('id, name')
        .ilike('location', `%${address.split(',')[0]}%`)
      
      return (data?.length || 0) > 1
    }

    async function checkDirectorOverlap(businessId: number) {
      // This would check against a directors table
      // For now, return false as placeholder
      return false
    }

    function generateRiskAnalysis(factors: any) {
      const issues = []
      if (factors.highRevenuePerEmployee) issues.push('Unusually high revenue per employee')
      if (factors.lowLocalEmployment) issues.push('Very few local employees')
      if (factors.recentHighActivity) issues.push('Recent incorporation with high contract volume')
      if (factors.sharedAddress) issues.push('Shares address with other businesses')
      if (factors.directorOverlap) issues.push('Director overlap with other companies')
      
      return issues
    }

    return (
      <Component 
        {...props}
        analyzeFraudRisk={analyzeFraudRisk}
        riskAnalysis={riskAnalysis}
        checking={checking}
      />
    )
  }
}

// 3. Community Validation Component
export function withCommunityValidation(Component: ComponentType<any>): ComponentType<any> {
  return (props: any) => {
    const [validationRequests, setValidationRequests] = useState<any[]>([])
    const [submitting, setSubmitting] = useState(false)

    async function requestCommunityValidation(businessId: number, communityLeaderEmail: string) {
      setSubmitting(true)
      try {
        const { data, error } = await supabase
          .from('community_validations')
          .insert({
            business_id: businessId,
            community_leader_email: communityLeaderEmail,
            status: 'pending',
            requested_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          })
          .select()

        if (error) throw error

        // Send email notification (would integrate with email service)
        await sendValidationEmail(communityLeaderEmail, businessId)
        
        alert('Community validation request sent!')
        fetchValidationRequests()
      } catch (error) {
        console.error('Validation request error:', error)
      } finally {
        setSubmitting(false)
      }
    }

    async function sendValidationEmail(email: string, businessId: number) {
      // This would integrate with an email service like SendGrid or Resend
      console.log(`Sending validation request to ${email} for business ${businessId}`)
    }

    async function fetchValidationRequests() {
      const { data } = await supabase
        .from('community_validations')
        .select(`
          *,
          indigenous_businesses (name, location)
        `)
        .order('requested_at', { ascending: false })
      
      setValidationRequests(data || [])
    }

    useEffect(() => {
      fetchValidationRequests()
    }, [])

    return (
      <Component 
        {...props}
        requestCommunityValidation={requestCommunityValidation}
        validationRequests={validationRequests}
        submitting={submitting}
      />
    )
  }
}

// 4. RFQ Notification System
export function withRFQNotifications(Component: ComponentType<any>): ComponentType<any> {
  return (props: any) => {
    const [notifications, setNotifications] = useState<any[]>([])
    const [preferences, setPreferences] = useState({
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true
    })

    async function checkForMatches(businessId: number) {
      try {
        // Get business capabilities
        const { data: business } = await supabase
          .from('indigenous_businesses')
          .select('capabilities, location')
          .eq('id', businessId)
          .single()

        // Find matching RFQs
        const { data: rfqs } = await supabase
          .from('rfqs')
          .select('*')
          .gte('deadline', new Date().toISOString())
          .eq('indigenous_requirement', true)

        const matches = rfqs?.filter((rfq: any) => {
          if (!business) return false
          const capabilityMatch = business.capabilities?.some((cap: any) => 
            rfq.required_capabilities?.includes(cap)
          )
          const locationMatch = business.location?.includes(rfq.location.split(',')[1]?.trim())
          return capabilityMatch && locationMatch
        }) || []

        if (matches.length > 0) {
          // Create notifications
          for (const match of matches) {
            await supabase
              .from('notifications')
              .insert({
                business_id: businessId,
                rfq_id: match.id,
                type: 'rfq_match',
                message: `New RFQ match: ${match.title}`,
                created_at: new Date().toISOString(),
                read: false
              })
          }

          fetchNotifications(businessId)
        }
      } catch (error) {
        console.error('Match checking error:', error)
      }
    }

    async function fetchNotifications(businessId: number) {
      const { data } = await supabase
        .from('notifications')
        .select(`
          *,
          rfqs (title, deadline, value)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      setNotifications(data || [])
    }

    async function markAsRead(notificationId: number) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
    }

    return (
      <Component 
        {...props}
        notifications={notifications}
        checkForMatches={checkForMatches}
        markAsRead={markAsRead}
        preferences={preferences}
        setPreferences={setPreferences}
      />
    )
  }
}

// 5. Field Agent GPS Verification
export function withGPSVerification(Component: ComponentType<any>): ComponentType<any> {
  return (props: any) => {
    const [location, setLocation] = useState<any>(null)
    const [verifying, setVerifying] = useState(false)

    async function verifyLocation(businessId: number) {
      setVerifying(true)
      try {
        // Get current GPS location
        const position = await getCurrentPosition()
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        }

        setLocation(currentLocation)

        // Record location verification
        await supabase
          .from('location_verifications')
          .insert({
            business_id: businessId,
            verified_latitude: currentLocation.latitude,
            verified_longitude: currentLocation.longitude,
            accuracy_meters: currentLocation.accuracy,
            verified_at: currentLocation.timestamp,
            agent_id: props.user?.id
          })

        alert('Location verified successfully!')
      } catch (error) {
        console.error('GPS verification error:', error)
        alert('Could not verify location: ' + (error instanceof Error ? error.message : 'Unknown error'))
      } finally {
        setVerifying(false)
      }
    }

    function getCurrentPosition(): Promise<GeolocationPosition> {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'))
          return
        }

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        )
      })
    }

    return (
      <Component 
        {...props}
        verifyLocation={verifyLocation}
        location={location}
        verifying={verifying}
      />
    )
  }
}