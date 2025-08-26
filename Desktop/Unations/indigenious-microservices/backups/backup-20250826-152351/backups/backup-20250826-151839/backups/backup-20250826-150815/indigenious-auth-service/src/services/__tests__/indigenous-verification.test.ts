import { verifyIndigenousStatus, validateCommunityAffiliation } from '../indigenous-verification'

describe('Indigenous Verification', () => {
  describe('verifyIndigenousStatus', () => {
    it('should verify valid Indigenous business', async () => {
      const businessData = {
        name: 'Northern Star Construction',
        registrationNumber: 'IND-2024-001',
        communityAffiliation: 'Six Nations',
        indigenousOwnership: 75,
        documents: ['status-card.pdf', 'band-letter.pdf']
      }

      const result = await verifyIndigenousStatus(businessData)
      
      expect(result.isValid).toBe(true)
      expect(result.verificationLevel).toBe('verified')
      expect(result.trustScore).toBeGreaterThanOrEqual(80)
    })

    it('should reject insufficient Indigenous ownership', async () => {
      const businessData = {
        name: 'Test Corp',
        indigenousOwnership: 30, // Below 51% threshold
      }

      const result = await verifyIndigenousStatus(businessData)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Minimum 51% Indigenous ownership required')
    })

    it('should require community validation for high-value contracts', async () => {
      const businessData = {
        name: 'Eagle Eye Security',
        indigenousOwnership: 100,
        contractValue: 1000000, // $1M+
        communityValidation: null
      }

      const result = await verifyIndigenousStatus(businessData)
      
      expect(result.requiresAdditionalValidation).toBe(true)
      expect(result.validationRequired).toContain('community-elder-approval')
    })
  })

  describe('validateCommunityAffiliation', () => {
    it('should validate known First Nations', () => {
      const validNations = [
        'Six Nations of the Grand River',
        'Mohawks of the Bay of Quinte',
        'Mississaugas of the Credit'
      ]

      validNations.forEach(nation => {
        expect(validateCommunityAffiliation(nation)).toBe(true)
      })
    })

    it('should validate Métis organizations', () => {
      const metisOrgs = [
        'Métis Nation of Ontario',
        'Manitoba Métis Federation',
        'Métis Nation Saskatchewan'
      ]

      metisOrgs.forEach(org => {
        expect(validateCommunityAffiliation(org, 'metis')).toBe(true)
      })
    })

    it('should validate Inuit communities', () => {
      const inuitCommunities = [
        'Inuit Tapiriit Kanatami',
        'Nunavut Tunngavik Inc.',
        'Makivik Corporation'
      ]

      inuitCommunities.forEach(community => {
        expect(validateCommunityAffiliation(community, 'inuit')).toBe(true)
      })
    })

    it('should reject invalid affiliations', () => {
      expect(validateCommunityAffiliation('Fake Nation')).toBe(false)
      expect(validateCommunityAffiliation('')).toBe(false)
      expect(validateCommunityAffiliation(null)).toBe(false)
    })
  })

  describe('Security Tests', () => {
    it('should prevent verification bypass attempts', async () => {
      const maliciousData = {
        name: 'Fake Indigenous Corp',
        indigenousOwnership: 100,
        // Attempting to inject verification status
        verificationStatus: 'verified',
        trustScore: 100,
        isValid: true
      }

      const result = await verifyIndigenousStatus(maliciousData)
      
      // Should go through proper verification regardless of injected values
      expect(result.requiresDocumentation).toBe(true)
      expect(result.verificationLevel).not.toBe('verified')
    })

    it('should sanitize business names', async () => {
      const xssAttempt = {
        name: '<script>alert("xss")</script>Corp',
        indigenousOwnership: 51
      }

      const result = await verifyIndigenousStatus(xssAttempt)
      
      expect(result.businessName).not.toContain('<script>')
      expect(result.businessName).toBe('Corp')
    })
  })
})