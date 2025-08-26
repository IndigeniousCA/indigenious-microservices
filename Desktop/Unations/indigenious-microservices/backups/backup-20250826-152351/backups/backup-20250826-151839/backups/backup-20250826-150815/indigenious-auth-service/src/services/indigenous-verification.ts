import DOMPurify from 'isomorphic-dompurify'

// Types for Indigenous verification
export interface BusinessData {
  name: string
  registrationNumber?: string
  communityAffiliation?: string
  indigenousOwnership: number
  documents?: string[]
  contractValue?: number
  communityValidation?: any
  // Security: Ignore injected fields
  verificationStatus?: string
  trustScore?: number
  isValid?: boolean
}

export interface VerificationResult {
  isValid: boolean
  verificationLevel?: 'pending' | 'basic' | 'verified' | 'certified'
  trustScore?: number
  errors?: string[]
  requiresAdditionalValidation?: boolean
  validationRequired?: string[]
  requiresDocumentation?: boolean
  businessName?: string
}

// Known Indigenous communities and organizations
const FIRST_NATIONS = [
  'Six Nations of the Grand River',
  'Six Nations',
  'Mohawks of the Bay of Quinte',
  'Mississaugas of the Credit',
  'Oneida Nation of the Thames',
  'Chippewas of the Thames',
  'Munsee-Delaware Nation',
  'Caldwell First Nation',
  'Walpole Island First Nation',
]

const METIS_ORGANIZATIONS = [
  'Métis Nation of Ontario',
  'Manitoba Métis Federation', 
  'Métis Nation Saskatchewan',
  'Métis Nation of Alberta',
  'Métis Nation British Columbia',
  'Métis National Council',
]

const INUIT_COMMUNITIES = [
  'Inuit Tapiriit Kanatami',
  'Nunavut Tunngavik Inc.',
  'Makivik Corporation',
  'Inuvialuit Regional Corporation',
  'Nunatsiavut Government',
  'Qikiqtani Inuit Association',
]

/**
 * Verify Indigenous business status
 */
export async function verifyIndigenousStatus(businessData: BusinessData): Promise<VerificationResult> {
  // Sanitize business name to prevent XSS
  const sanitizedName = businessData.name ? 
    DOMPurify.sanitize(businessData.name, { ALLOWED_TAGS: [] }) : ''

  // Initialize result
  const result: VerificationResult = {
    isValid: false,
    businessName: sanitizedName,
    errors: [],
  }

  // Validate minimum Indigenous ownership (51%)
  if (businessData.indigenousOwnership < 51) {
    result.errors?.push('Minimum 51% Indigenous ownership required')
    return result
  }

  // Check if high-value contract requires community validation
  if (businessData.contractValue && businessData.contractValue >= 1000000) {
    if (!businessData.communityValidation) {
      result.requiresAdditionalValidation = true
      result.validationRequired = ['community-elder-approval']
      return result
    }
  }

  // Check if documentation is provided
  const hasDocuments = businessData.documents && businessData.documents.length > 0
  const hasRegistration = !!businessData.registrationNumber
  const hasCommunityAffiliation = !!businessData.communityAffiliation

  // Calculate trust score
  let trustScore = 0
  if (businessData.indigenousOwnership >= 75) trustScore += 30
  else if (businessData.indigenousOwnership >= 51) trustScore += 20
  
  if (hasDocuments) trustScore += 30
  if (hasRegistration) trustScore += 20
  if (hasCommunityAffiliation) trustScore += 20

  // Determine verification level
  let verificationLevel: VerificationResult['verificationLevel'] = 'pending'
  
  if (trustScore >= 80 && hasDocuments && hasRegistration) {
    verificationLevel = 'verified'
    result.isValid = true
  } else if (trustScore >= 60) {
    verificationLevel = 'basic'
    result.isValid = true
  } else {
    result.requiresDocumentation = true
  }

  result.verificationLevel = verificationLevel
  result.trustScore = trustScore

  return result
}

/**
 * Validate community affiliation
 */
export function validateCommunityAffiliation(
  affiliation: any,
  type?: 'first-nation' | 'metis' | 'inuit'
): boolean {
  // Handle null/undefined/empty
  if (!affiliation || typeof affiliation !== 'string') {
    return false
  }

  const normalizedAffiliation = affiliation.trim().toLowerCase()

  // Check based on type
  if (type === 'metis') {
    return METIS_ORGANIZATIONS.some(org => 
      org.toLowerCase() === normalizedAffiliation
    )
  }

  if (type === 'inuit') {
    return INUIT_COMMUNITIES.some(community => 
      community.toLowerCase() === normalizedAffiliation
    )
  }

  // Default to checking all (First Nations and general)
  const allCommunities = [
    ...FIRST_NATIONS,
    ...METIS_ORGANIZATIONS,
    ...INUIT_COMMUNITIES,
  ]

  return allCommunities.some(community => 
    community.toLowerCase() === normalizedAffiliation
  )
}