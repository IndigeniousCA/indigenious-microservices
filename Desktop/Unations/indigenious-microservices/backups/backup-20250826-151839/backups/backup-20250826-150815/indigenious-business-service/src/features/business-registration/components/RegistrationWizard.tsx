// Indigenous Business Registration with Progressive Data Collection
// Gathers all critical data while keeping UX smooth

import { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, Check, AlertCircle, Building2, Users, Briefcase, Shield } from 'lucide-react'

// Validation schemas for each step
const basicInfoSchema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  businessNumber: z.string().regex(/^\d{9}[A-Z]{2}\d{4}$/, 'Invalid format (e.g., 123456789RC0001)').optional(),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Phone number required'),
  website: z.string().url().optional().or(z.literal('')),
})

const indigenousInfoSchema = z.object({
  isIndigenousBusiness: z.boolean(),
  indigenousOwnershipPercentage: z.number().min(0).max(100),
  communityAffiliation: z.object({
    primaryNation: z.string().min(1, 'Primary nation required'),
    territory: z.string().min(1, 'Territory required'), 
    bandNumber: z.string().optional(),
    treatyArea: z.string().optional(),
  }),
  verificationDocuments: z.array(z.object({
    type: z.string(),
    fileUrl: z.string(),
  })).optional(),
})

const capabilitySchema = z.object({
  industries: z.array(z.string()).min(1, 'Select at least one industry'),
  certifications: z.array(z.string()),
  workforceSize: z.enum(['1-10', '11-50', '51-200', '200+']),
  indigenousEmployees: z.number().min(0),
  certifiedTrades: z.record(z.string(), z.number()).optional(),
  keyEquipment: z.array(z.string()).optional(),
})

// Glass UI Components
const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 ${className}`}>
    {children}
  </div>
)

const GlassButton = ({ children, onClick, variant = 'primary', disabled = false, className = '' }) => {
  const variants = {
    primary: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border-blue-400/50',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/20',
    success: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border-emerald-400/50',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-xl backdrop-blur-md border transition-all duration-200 font-medium
        ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </motion.button>
  )
}

// Main Registration Component
export function BusinessRegistration() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = useSupabaseClient()
  const user = useUser()

  // Form data state
  const [formData, setFormData] = useState({
    basicInfo: {},
    indigenousInfo: {},
    capabilities: {},
  })

  const steps = [
    { id: 'basic', title: 'Basic Information', icon: Building2, schema: basicInfoSchema },
    { id: 'indigenous', title: 'Indigenous Verification', icon: Shield, schema: indigenousInfoSchema },
    { id: 'capabilities', title: 'Capabilities & Workforce', icon: Users, schema: capabilitySchema },
    { id: 'review', title: 'Review & Submit', icon: Check, schema: null },
  ]

  const currentStepConfig = steps[currentStep]

  // Step progress indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = index === currentStep
        const isCompleted = index < currentStep

        return (
          <div key={step.id} className="flex items-center">
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1.1 : 1,
                backgroundColor: isCompleted ? 'rgba(34, 197, 94, 0.3)' : isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              }}
              className={`w-12 h-12 rounded-xl backdrop-blur-md border flex items-center justify-center
                ${isCompleted ? 'border-emerald-400/50' : isActive ? 'border-blue-400/50' : 'border-white/20'}`}
            >
              {isCompleted ? (
                <Check className="w-6 h-6 text-emerald-400" />
              ) : (
                <Icon className={`w-6 h-6 ${isActive ? 'text-blue-400' : 'text-white/50'}`} />
              )}
            </motion.div>
            {index < steps.length - 1 && (
              <div className={`w-24 h-0.5 mx-2 ${index < currentStep ? 'bg-emerald-400/50' : 'bg-white/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )

  // Step Components
  const BasicInfoStep = () => {
    const { register, formState: { errors } } = useForm({
      resolver: zodResolver(basicInfoSchema),
      defaultValues: formData.basicInfo,
    })

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Business Name <span className="text-red-400">*</span>
          </label>
          <input
            {...register('businessName')}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md
              text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
            placeholder="Your business name"
          />
          {errors.businessName && (
            <p className="mt-1 text-sm text-red-400">{errors.businessName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Business Number (optional)
          </label>
          <input
            {...register('businessNumber')}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md
              text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
            placeholder="e.g., 123456789RC0001"
          />
          <p className="mt-1 text-xs text-white/60">
            Don't have one? You can add it later.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md
                text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
              placeholder="contact@yourbusiness.ca"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Phone <span className="text-red-400">*</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md
                text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>
    )
  }

  const IndigenousInfoStep = () => {
    const [ownershipPercentage, setOwnershipPercentage] = useState(51)
    const { register, formState: { errors } } = useForm({
      resolver: zodResolver(indigenousInfoSchema),
      defaultValues: formData.indigenousInfo,
    })

    // Common First Nations in Canada (would load from database)
    const nations = [
      'Cree', 'Ojibway', 'Inuit', 'Métis', 'Mi\'kmaq', 'Haudenosaunee',
      'Blackfoot', 'Dene', 'Coast Salish', 'Haida', 'Other'
    ]

    const territories = [
      'Treaty 1', 'Treaty 2', 'Treaty 3', 'Treaty 4', 'Treaty 5',
      'Treaty 6', 'Treaty 7', 'Treaty 8', 'Treaty 9', 'Treaty 10',
      'Treaty 11', 'Robinson-Huron', 'Robinson-Superior', 'Other'
    ]

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-4">
            Indigenous Ownership Percentage
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={ownershipPercentage}
              onChange={(e) => setOwnershipPercentage(e.target.value)}
              className="flex-1"
            />
            <div className="w-20 text-center">
              <span className="text-2xl font-bold text-white">{ownershipPercentage}%</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-white/60">
            {ownershipPercentage >= 51 ? '✅ Qualifies as Indigenous-owned' : 
             ownershipPercentage >= 33 ? '⚡ Qualifies as Indigenous partnership' :
             '❌ Does not qualify for Indigenous procurement'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Primary Nation/Community <span className="text-red-400">*</span>
            </label>
            <select
              {...register('communityAffiliation.primaryNation')}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md
                text-white focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="">Select Nation</option>
              {nations.map(nation => (
                <option key={nation} value={nation} className="bg-gray-800">{nation}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Territory/Treaty <span className="text-red-400">*</span>
            </label>
            <select
              {...register('communityAffiliation.territory')}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md
                text-white focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="">Select Territory</option>
              {territories.map(territory => (
                <option key={territory} value={territory} className="bg-gray-800">{territory}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Band Number (if applicable)
          </label>
          <input
            {...register('communityAffiliation.bandNumber')}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md
              text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
            placeholder="e.g., 123"
          />
        </div>

        {/* Document Upload Section */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-lg font-medium text-white mb-4">Verification Documents</h3>
          <p className="text-sm text-white/60 mb-4">
            Upload any documents that verify Indigenous ownership (Status cards, band membership, etc.)
          </p>
          <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
            <button className="text-blue-400 hover:text-blue-300">
              Click to upload or drag and drop
            </button>
            <p className="text-xs text-white/50 mt-2">PDF, JPG, PNG up to 10MB</p>
          </div>
        </div>
      </div>
    )
  }

  const CapabilitiesStep = () => {
    const [selectedIndustries, setSelectedIndustries] = useState([])
    const [certifications, setCertifications] = useState([])

    const industries = [
      { id: 'mining', label: 'Mining', icon: '⛏️' },
      { id: 'construction', label: 'Construction', icon: '🏗️' },
      { id: 'energy', label: 'Energy', icon: '⚡' },
      { id: 'forestry', label: 'Forestry', icon: '🌲' },
      { id: 'transportation', label: 'Transportation', icon: '🚛' },
      { id: 'technology', label: 'Technology', icon: '💻' },
      { id: 'professional', label: 'Professional Services', icon: '💼' },
      { id: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
    ]

    const commonCertifications = [
      'ISO 9001', 'ISO 14001', 'ISO 45001', 'COR Safety',
      'Indigenous Business Certification', 'CCAB Certified',
      'Environmental Certification', 'Other'
    ]

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Industries You Serve</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {industries.map(industry => (
              <motion.button
                key={industry.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedIndustries(prev =>
                    prev.includes(industry.id)
                      ? prev.filter(i => i !== industry.id)
                      : [...prev, industry.id]
                  )
                }}
                className={`p-4 rounded-xl backdrop-blur-md border transition-all duration-200
                  ${selectedIndustries.includes(industry.id)
                    ? 'bg-blue-500/20 border-blue-400/50 text-blue-100'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
              >
                <div className="text-2xl mb-1">{industry.icon}</div>
                <div className="text-sm">{industry.label}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Total Workforce Size
            </label>
            <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md
              text-white focus:border-blue-400/50 focus:outline-none appearance-none">
              <option value="1-10" className="bg-gray-800">1-10 employees</option>
              <option value="11-50" className="bg-gray-800">11-50 employees</option>
              <option value="51-200" className="bg-gray-800">51-200 employees</option>
              <option value="200+" className="bg-gray-800">200+ employees</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Indigenous Employees
            </label>
            <input
              type="number"
              min="0"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl backdrop-blur-md
                text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
              placeholder="Number of Indigenous employees"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-white mb-4">Certifications</h3>
          <div className="flex flex-wrap gap-2">
            {commonCertifications.map(cert => (
              <motion.button
                key={cert}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCertifications(prev =>
                    prev.includes(cert)
                      ? prev.filter(c => c !== cert)
                      : [...prev, cert]
                  )
                }}
                className={`px-4 py-2 rounded-lg backdrop-blur-md border transition-all duration-200
                  ${certifications.includes(cert)
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
              >
                {cert}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Workforce Skills Section */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-lg font-medium text-white mb-4">Certified Trades & Skills</h3>
          <p className="text-sm text-white/60 mb-4">
            This helps us match you with the right opportunities
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {['Carpenters', 'Electricians', 'Plumbers', 'Heavy Equipment Operators', 'Welders', 'Safety Officers'].map(trade => (
              <div key={trade}>
                <label className="block text-sm text-white/80 mb-1">{trade}</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg backdrop-blur-md
                    text-white placeholder-white/50 focus:border-blue-400/50 focus:outline-none"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const ReviewStep = () => {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Almost There!</h2>
          <p className="text-white/60">Review your information before submitting</p>
        </div>

        {/* Summary Cards */}
        <div className="space-y-4">
          <GlassCard>
            <h3 className="text-lg font-medium text-white mb-3">Business Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Business Name:</span>
                <span className="text-white">{formData.basicInfo?.businessName || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Email:</span>
                <span className="text-white">{formData.basicInfo?.email || 'Not provided'}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-medium text-white mb-3">Indigenous Verification</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Ownership:</span>
                <span className="text-white">{formData.indigenousInfo?.indigenousOwnershipPercentage || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Primary Nation:</span>
                <span className="text-white">{formData.indigenousInfo?.communityAffiliation?.primaryNation || 'Not provided'}</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm text-amber-100">
                By submitting, you confirm that all information is accurate. False information will result in permanent ban from the platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      // Save current step data
      const stepKey = steps[currentStep].id
      setFormData(prev => ({
        ...prev,
        [stepKey]: {}, // Would capture form data here
      }))
      setCurrentStep(prev => prev + 1)
    } else {
      // Submit final data
      await handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Create business profile
      const { data: business, error } = await supabase
        .from('indigenous_businesses')
        .insert({
          user_id: user?.id,
          ...formData.basicInfo,
          ...formData.indigenousInfo,
          ...formData.capabilities,
          verification_status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Trigger verification for Indigenous businesses
      if (formData.indigenousInfo?.indigenousOwnershipPercentage >= 51 && business) {
        try {
          // Import verification engine dynamically
          const { VerificationMonopolyEngine } = await import('@/features/verification-monopoly/services/VerificationMonopolyEngine')
          
          // Request verification
          await VerificationMonopolyEngine.requestVerification({
            businessId: business.id,
            verificationType: 'standard',
            documents: formData.documents || [],
            requestedBy: {
              organizationId: 'platform',
              type: 'platform',
              purpose: 'registration',
            },
          })
          
          // Update status to show verification initiated
          await supabase
            .from('indigenous_businesses')
            .update({ 
              verification_status: 'verifying',
              verification_requested_at: new Date().toISOString()
            })
            .eq('id', business.id)
            
        } catch (verifyError) {
          logger.error('Verification initiation failed:', verifyError)
          // Don't block registration if verification fails
        }
      }

      // Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (error) {
      logger.error('Registration error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Join the Indigenous Business Network
            </h1>
            <p className="text-lg text-white/60">
              Get verified, get discovered, grow your business
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator />

          {/* Main Content */}
          <GlassCard>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  {currentStepConfig.title}
                </h2>

                {currentStep === 0 && <BasicInfoStep />}
                {currentStep === 1 && <IndigenousInfoStep />}
                {currentStep === 2 && <CapabilitiesStep />}
                {currentStep === 3 && <ReviewStep />}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <GlassButton
                variant="secondary"
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
              >
                Back
              </GlassButton>

              <GlassButton
                variant={currentStep === steps.length - 1 ? 'success' : 'primary'}
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex items-center space-x-2"
              >
                <span>{currentStep === steps.length - 1 ? 'Submit' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </GlassButton>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}