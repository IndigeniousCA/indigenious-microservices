// Registration Wizard Component
// Progressive registration flow with step-by-step onboarding

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Building, Shield, CreditCard, CheckCircle, 
  ArrowLeft, ArrowRight, Globe, Users, FileText,
  MapPin, Phone, Mail, Calendar, Info, Star
} from 'lucide-react'
import { useAuth } from './AuthenticationProvider'

interface RegistrationWizardProps {
  onComplete?: () => void
  onBack?: () => void
  userType?: 'indigenous_business' | 'non_indigenous_business' | 'government' | 'individual'
}

interface FormData {
  // Basic Info
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  
  // User Type & Role
  userType: string
  role: string
  
  // Business Info (if applicable)
  businessName?: string
  businessType?: string
  businessNumber?: string
  industryClassification?: string[]
  
  // Indigenous Identity (if applicable)
  firstNation?: string
  traditionalTerritory?: string
  statusCardNumber?: string
  indigenousOwnershipPercentage?: number
  
  // Government Info (if applicable)
  department?: string
  position?: string
  procurementAuthority?: number
  
  // Location
  address?: {
    street: string
    city: string
    province: string
    postalCode: string
  }
  
  // Agreements
  termsAccepted: boolean
  privacyAccepted: boolean
  culturalProtocolsAccepted: boolean
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  userType: '',
  role: '',
  termsAccepted: false,
  privacyAccepted: false,
  culturalProtocolsAccepted: false
}

export function RegistrationWizard({ onComplete, onBack, userType }: RegistrationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    userType: userType || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { register, isLoading, error } = useAuth()

  const steps = [
    {
      id: 1,
      title: 'Account Setup',
      description: 'Basic account information',
      icon: User,
      fields: ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword']
    },
    {
      id: 2,
      title: 'User Type',
      description: 'Select your role and type',
      icon: Users,
      fields: ['userType', 'role']
    },
    {
      id: 3,
      title: 'Profile Details',
      description: 'Business or individual information',
      icon: Building,
      fields: ['businessName', 'businessType', 'department', 'position']
    },
    {
      id: 4,
      title: 'Indigenous Identity',
      description: 'Nation affiliation and ownership',
      icon: Globe,
      fields: ['firstNation', 'traditionalTerritory', 'statusCardNumber', 'indigenousOwnershipPercentage'],
      condition: () => formData.userType.includes('indigenous')
    },
    {
      id: 5,
      title: 'Location',
      description: 'Address and service areas',
      icon: MapPin,
      fields: ['address']
    },
    {
      id: 6,
      title: 'Review & Submit',
      description: 'Confirm details and agreements',
      icon: CheckCircle,
      fields: ['termsAccepted', 'privacyAccepted', 'culturalProtocolsAccepted']
    }
  ]

  const visibleSteps = steps.filter(step => !step.condition || step.condition())
  const totalSteps = visibleSteps.length

  const updateFormData = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateStep = (stepNumber: number): boolean => {
    const step = visibleSteps.find(s => s.id === stepNumber)
    if (!step) return true

    const newErrors: Record<string, string> = {}

    // Validate required fields for current step
    step.fields.forEach(field => {
      if (field === 'firstName' && !formData.firstName.trim()) {
        newErrors.firstName = 'First name is required'
      }
      if (field === 'lastName' && !formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required'
      }
      if (field === 'email' && !formData.email.trim()) {
        newErrors.email = 'Email is required'
      }
      if (field === 'email' && formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email'
      }
      if (field === 'password' && !formData.password) {
        newErrors.password = 'Password is required'
      }
      if (field === 'password' && formData.password && formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      }
      if (field === 'confirmPassword' && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
      if (field === 'userType' && !formData.userType) {
        newErrors.userType = 'Please select a user type'
      }
      if (field === 'role' && !formData.role) {
        newErrors.role = 'Please select a role'
      }
    })

    // Final step validations
    if (stepNumber === 6) {
      if (!formData.termsAccepted) {
        newErrors.termsAccepted = 'You must accept the terms of service'
      }
      if (!formData.privacyAccepted) {
        newErrors.privacyAccepted = 'You must accept the privacy policy'
      }
      if (!formData.culturalProtocolsAccepted) {
        newErrors.culturalProtocolsAccepted = 'You must acknowledge cultural protocols'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    try {
      setIsSubmitting(true)
      await register(formData)
      
      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      logger.error('Registration failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getUserTypeOptions = () => [
    {
      value: 'indigenous_business',
      label: 'Indigenous Business',
      description: 'Indigenous-owned business or organization',
      icon: Globe
    },
    {
      value: 'non_indigenous_business',
      label: 'Canadian Business',
      description: 'Non-Indigenous Canadian business',
      icon: Building
    },
    {
      value: 'government',
      label: 'Government Employee',
      description: 'Federal, provincial, or municipal employee',
      icon: Shield
    },
    {
      value: 'individual',
      label: 'Individual',
      description: 'Individual user or consultant',
      icon: User
    }
  ]

  const getRoleOptions = () => {
    switch (formData.userType) {
      case 'indigenous_business':
      case 'non_indigenous_business':
        return [
          { value: 'business_owner', label: 'Business Owner' },
          { value: 'manager', label: 'Manager' },
          { value: 'employee', label: 'Employee' },
          { value: 'authorized_representative', label: 'Authorized Representative' }
        ]
      case 'government':
        return [
          { value: 'procurement_officer', label: 'Procurement Officer' },
          { value: 'project_manager', label: 'Project Manager' },
          { value: 'department_head', label: 'Department Head' },
          { value: 'policy_advisor', label: 'Policy Advisor' }
        ]
      case 'individual':
        return [
          { value: 'consultant', label: 'Consultant' },
          { value: 'job_seeker', label: 'Job Seeker' },
          { value: 'researcher', label: 'Researcher' },
          { value: 'community_member', label: 'Community Member' }
        ]
      default:
        return []
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-blue-400 focus:border-transparent"
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-blue-400 focus:border-transparent"
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData('phone', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:outline-none focus:ring-2 
                  focus:ring-blue-400 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-blue-400 focus:border-transparent"
                  placeholder="Create a password"
                />
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                    text-white placeholder-white/40 focus:outline-none focus:ring-2 
                    focus:ring-blue-400 focus:border-transparent"
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-4">
                What type of user are you? *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getUserTypeOptions().map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateFormData('userType', option.value)}
                    className={`p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                      formData.userType === option.value
                        ? 'border-blue-400 bg-blue-500/20'
                        : 'border-white/20 bg-white/5 hover:border-white/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <option.icon className={`w-6 h-6 ${
                        formData.userType === option.value ? 'text-blue-400' : 'text-white/60'
                      }`} />
                      <div>
                        <h3 className="font-medium text-white">{option.label}</h3>
                        <p className="text-sm text-white/60">{option.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {errors.userType && (
                <p className="text-red-400 text-sm mt-2">{errors.userType}</p>
              )}
            </div>

            {formData.userType && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Your Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => updateFormData('role', e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg 
                    text-white focus:outline-none focus:ring-2 focus:ring-blue-400 
                    focus:border-transparent"
                >
                  <option value="">Select your role</option>
                  {getRoleOptions().map((role) => (
                    <option key={role.value} value={role.value} className="bg-gray-800">
                      {role.label}
                    </option>
                  ))}
                </select>
                {errors.role && (
                  <p className="text-red-400 text-sm mt-1">{errors.role}</p>
                )}
              </div>
            )}
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Review Your Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Name:</span>
                  <span className="text-white">{formData.firstName} {formData.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Email:</span>
                  <span className="text-white">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">User Type:</span>
                  <span className="text-white capitalize">{formData.userType?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Role:</span>
                  <span className="text-white capitalize">{formData.role?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.termsAccepted}
                  onChange={(e) => updateFormData('termsAccepted', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/20 
                    rounded bg-white/10"
                />
                <label htmlFor="terms" className="text-sm text-white">
                  I accept the{' '}
                  <a href="/terms" className="text-blue-400 hover:text-blue-300">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-blue-400 hover:text-blue-300">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {errors.termsAccepted && (
                <p className="text-red-400 text-sm">{errors.termsAccepted}</p>
              )}

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={formData.privacyAccepted}
                  onChange={(e) => updateFormData('privacyAccepted', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/20 
                    rounded bg-white/10"
                />
                <label htmlFor="privacy" className="text-sm text-white">
                  I understand and consent to the collection and use of my personal information
                </label>
              </div>
              {errors.privacyAccepted && (
                <p className="text-red-400 text-sm">{errors.privacyAccepted}</p>
              )}

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="cultural"
                  checked={formData.culturalProtocolsAccepted}
                  onChange={(e) => updateFormData('culturalProtocolsAccepted', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/20 
                    rounded bg-white/10"
                />
                <label htmlFor="cultural" className="text-sm text-white">
                  I acknowledge and respect Indigenous cultural protocols and data sovereignty principles
                </label>
              </div>
              {errors.culturalProtocolsAccepted && (
                <p className="text-red-400 text-sm">{errors.culturalProtocolsAccepted}</p>
              )}
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8">
            <Info className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">This step is under development</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full 
          mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full 
          mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Create Your Account
          </h1>
          <p className="text-white/60">
            Join the Indigenous Toll Booth platform
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {visibleSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                  border-2 transition-all duration-200 ${
                  currentStep > step.id
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : currentStep === step.id
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-white/20 text-white/40'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < visibleSteps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-emerald-500' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-white/60 text-sm">
              Step {currentStep} of {totalSteps}: {visibleSteps[currentStep - 1]?.title}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              {visibleSteps[currentStep - 1]?.title}
            </h2>
            <p className="text-white/60">
              {visibleSteps[currentStep - 1]?.description}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-400/30 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Info className="w-5 h-5 text-red-400" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={currentStep === 1 ? onBack : prevStep}
              className="flex items-center px-4 py-2 text-white/60 hover:text-white 
                transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? 'Back to Login' : 'Previous'}
            </button>

            <div className="flex space-x-3">
              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 
                    to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white 
                    font-medium rounded-lg transition-all duration-200"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 
                    to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white 
                    font-medium rounded-lg transition-all duration-200 disabled:opacity-50 
                    disabled:cursor-not-allowed"
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cultural Note */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-purple-500/10 border 
            border-purple-400/30 rounded-lg px-4 py-2">
            <Star className="w-4 h-4 text-purple-400" />
            <span className="text-purple-200 text-sm">
              Registration respects Indigenous data sovereignty principles
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}