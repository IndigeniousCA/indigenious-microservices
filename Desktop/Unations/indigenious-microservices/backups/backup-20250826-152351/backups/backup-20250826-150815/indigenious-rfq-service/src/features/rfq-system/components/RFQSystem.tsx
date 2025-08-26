// Dual-Purpose RFQ System
// 1. Government departments seeking Indigenous suppliers (5% target)
// 2. Band councils posting projects for any supplier

import { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { 
  FileText, Calendar, DollarSign, MapPin, Users, Upload,
  AlertCircle, Plus, X, Building2, Briefcase, Target,
  TrendingUp, Clock, ChevronRight, Filter
} from 'lucide-react'

// Determine user type and permissions
const useRFQPermissions = () => {
  const user = useUser()
  const [permissions, setPermissions] = useState({
    canCreateRFQ: false,
    rfqType: null, // 'government', 'band', 'both'
    organization: null,
  })

  // Check user's organization type
  // This would fetch from database
  return permissions
}

// RFQ Creation Form
export function RFQCreationForm({ rfqType }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    category: '',
    
    // Requirements
    indigenousRequirement: rfqType === 'government' ? true : false,
    minimumIndigenousContent: rfqType === 'government' ? 5 : 0,
    
    // Budget & Timeline
    budgetRange: { min: 0, max: 0 },
    deadline: '',
    projectStartDate: '',
    projectEndDate: '',
    
    // Location
    location: '',
    remoteAcceptable: false,
    
    // Evaluation Criteria
    evaluationCriteria: {
      price: 40,
      experience: 20,
      indigenousParticipation: 20,
      localBenefit: 10,
      sustainability: 10,
    },
    
    // Documents
    attachments: [],
  })

  const isGovernmentRFQ = rfqType === 'government'
  const isBandRFQ = rfqType === 'band'

  const steps = [
    { title: 'Project Details', icon: FileText },
    { title: 'Requirements', icon: Target },
    { title: 'Budget & Timeline', icon: DollarSign },
    { title: 'Location & Logistics', icon: MapPin },
    { title: 'Evaluation Criteria', icon: TrendingUp },
    { title: 'Documents & Review', icon: Upload },
  ]

  // Step 1: Project Details
  const ProjectDetailsStep = () => (
    <div className="space-y-6">
      {/* RFQ Type Indicator */}
      <div className={`p-4 rounded-xl border ${
        isGovernmentRFQ 
          ? 'bg-blue-500/10 border-blue-400/30 text-blue-100'
          : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100'
      }`}>
        <div className="flex items-center space-x-3">
          <Building2 className="w-5 h-5" />
          <div>
            <p className="font-medium">
              {isGovernmentRFQ 
                ? 'Government Indigenous Procurement (5% Target)'
                : 'Band Council Project RFQ'}
            </p>
            <p className="text-sm opacity-80">
              {isGovernmentRFQ 
                ? 'This RFQ will be matched with verified Indigenous suppliers'
                : 'This RFQ is open to all qualified suppliers'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Project Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
            backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50 
            focus:outline-none transition-all duration-200"
          placeholder={isGovernmentRFQ 
            ? "e.g., IT Support Services for Indigenous Services Canada"
            : "e.g., Community Centre Renovation - Phase 2"}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Category <span className="text-red-400">*</span>
        </label>
        <select
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
            backdrop-blur-md text-white focus:border-blue-400/50 focus:outline-none 
            appearance-none transition-all duration-200"
        >
          <option value="" className="bg-gray-800">Select Category</option>
          <option value="construction" className="bg-gray-800">Construction</option>
          <option value="professional_services" className="bg-gray-800">Professional Services</option>
          <option value="it_services" className="bg-gray-800">IT Services</option>
          <option value="maintenance" className="bg-gray-800">Maintenance</option>
          <option value="supplies" className="bg-gray-800">Supplies & Equipment</option>
          <option value="transportation" className="bg-gray-800">Transportation</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Detailed Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={6}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
            backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50 
            focus:outline-none transition-all duration-200"
          placeholder="Provide a detailed description of the project scope, deliverables, and requirements..."
        />
      </div>
    </div>
  )

  // Step 2: Requirements (Different for Gov vs Band)
  const RequirementsStep = () => (
    <div className="space-y-6">
      {isGovernmentRFQ ? (
        // Government-specific requirements
        <>
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
            <h3 className="font-medium text-blue-100 mb-2">Indigenous Procurement Requirements</h3>
            <p className="text-sm text-blue-100/80">
              This RFQ requires Indigenous business participation to meet federal procurement targets.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Minimum Indigenous Content (%)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="5"
                max="100"
                value={formData.minimumIndigenousContent}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  minimumIndigenousContent: parseInt(e.target.value) 
                }))}
                className="flex-1"
              />
              <div className="w-20 text-center">
                <span className="text-2xl font-bold text-white">
                  {formData.minimumIndigenousContent}%
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-white/60">
              {formData.minimumIndigenousContent >= 51 
                ? '✅ Requires majority Indigenous ownership'
                : formData.minimumIndigenousContent >= 33 
                ? '⚡ Allows Indigenous partnerships'
                : '📋 Meets minimum 5% requirement'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Acceptable Indigenous Business Types
            </label>
            <div className="space-y-2">
              {['Band-owned', 'Inuit-owned', 'Métis-owned', 'First Nations-owned', 'Joint Ventures'].map(type => (
                <label key={type} className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-white/80">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      ) : (
        // Band council requirements
        <>
          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-4">
            <h3 className="font-medium text-emerald-100 mb-2">Project Requirements</h3>
            <p className="text-sm text-emerald-100/80">
              Define mandatory requirements for this community project.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Local Benefit Requirements
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input type="checkbox" />
                <span className="text-white/80">Minimum 30% local employment</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" />
                <span className="text-white/80">Youth training positions required</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" />
                <span className="text-white/80">Use of local suppliers where possible</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Cultural Requirements
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input type="checkbox" />
                <span className="text-white/80">Respect for sacred sites</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" />
                <span className="text-white/80">Elder consultation required</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="checkbox" />
                <span className="text-white/80">Work around cultural calendar</span>
              </label>
            </div>
          </div>
        </>
      )}

      {/* Common Requirements */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Mandatory Certifications
        </label>
        <div className="space-y-2">
          <label className="flex items-center space-x-3">
            <input type="checkbox" />
            <span className="text-white/80">Valid Business License</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" />
            <span className="text-white/80">Liability Insurance ($2M minimum)</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="checkbox" />
            <span className="text-white/80">WorkSafe Coverage</span>
          </label>
          {formData.category === 'construction' && (
            <label className="flex items-center space-x-3">
              <input type="checkbox" />
              <span className="text-white/80">COR Safety Certification</span>
            </label>
          )}
        </div>
      </div>
    </div>
  )

  // Step 3: Budget & Timeline
  const BudgetTimelineStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Budget Range <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="number"
                value={formData.budgetRange.min}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  budgetRange: { ...prev.budgetRange, min: parseInt(e.target.value) }
                }))}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                  backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50 
                  focus:outline-none transition-all duration-200"
                placeholder="Minimum"
              />
            </div>
            <p className="text-xs text-white/60 mt-1">Minimum budget</p>
          </div>
          <div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="number"
                value={formData.budgetRange.max}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  budgetRange: { ...prev.budgetRange, max: parseInt(e.target.value) }
                }))}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                  backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50 
                  focus:outline-none transition-all duration-200"
                placeholder="Maximum"
              />
            </div>
            <p className="text-xs text-white/60 mt-1">Maximum budget</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Submission Deadline <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
              backdrop-blur-md text-white focus:border-blue-400/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Project Start Date
          </label>
          <input
            type="date"
            value={formData.projectStartDate}
            onChange={(e) => setFormData(prev => ({ ...prev, projectStartDate: e.target.value }))}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
              backdrop-blur-md text-white focus:border-blue-400/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Project End Date
          </label>
          <input
            type="date"
            value={formData.projectEndDate}
            onChange={(e) => setFormData(prev => ({ ...prev, projectEndDate: e.target.value }))}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
              backdrop-blur-md text-white focus:border-blue-400/50 focus:outline-none"
          />
        </div>
      </div>

      {isBandRFQ && (
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-100">Cultural Calendar Check</h4>
              <p className="text-sm text-amber-100/80 mt-1">
                We'll automatically check for conflicts with community ceremonies and traditional activities.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Step 4: Location & Logistics
  const LocationStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Project Location <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
            backdrop-blur-md text-white placeholder-white/50 focus:border-blue-400/50 
            focus:outline-none transition-all duration-200"
          placeholder={isBandRFQ 
            ? "e.g., Six Nations of the Grand River, Ontario"
            : "e.g., Ottawa, Ontario"}
        />
      </div>

      {isBandRFQ && (
        <>
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
            <h4 className="font-medium text-blue-100 mb-2">Remote Location Considerations</h4>
            <div className="space-y-2 text-sm text-blue-100/80">
              <p>• Winter road access only (January - March)</p>
              <p>• Fly-in community - materials must be flown in</p>
              <p>• Limited accommodation - contractor must provide</p>
              <p>• Nearest supply centre: 300km</p>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.remoteAcceptable}
                onChange={(e) => setFormData(prev => ({ ...prev, remoteAcceptable: e.target.checked }))}
                className="rounded"
              />
              <span className="text-white/80">
                Contractor understands remote location challenges
              </span>
            </label>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Site Visit Requirements
        </label>
        <div className="space-y-2">
          <label className="flex items-center space-x-3">
            <input type="radio" name="siteVisit" value="mandatory" />
            <span className="text-white/80">Mandatory site visit required</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="radio" name="siteVisit" value="optional" />
            <span className="text-white/80">Site visit recommended but optional</span>
          </label>
          <label className="flex items-center space-x-3">
            <input type="radio" name="siteVisit" value="virtual" />
            <span className="text-white/80">Virtual site tour available</span>
          </label>
        </div>
      </div>
    </div>
  )

  // Step 5: Evaluation Criteria
  const EvaluationStep = () => {
    const criteria = isGovernmentRFQ 
      ? formData.evaluationCriteria 
      : {
          price: 30,
          experience: 20,
          localBenefit: 25,
          timeline: 15,
          sustainability: 10,
        }

    const updateCriterion = (key, value) => {
      // Ensure total doesn't exceed 100
      const newCriteria = { ...criteria, [key]: parseInt(value) }
      const total = Object.values(newCriteria).reduce((sum, val) => sum + val, 0)
      
      if (total <= 100) {
        setFormData(prev => ({ 
          ...prev, 
          evaluationCriteria: newCriteria 
        }))
      }
    }

    const totalWeight = Object.values(criteria).reduce((sum, val) => sum + val, 0)

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-4">
            How will you evaluate bids?
          </h3>
          <p className="text-sm text-white/60 mb-6">
            Set the weight for each criterion. Total must equal 100%.
          </p>
        </div>

        <div className="space-y-4">
          {Object.entries(criteria).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-white/80 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <span className="text-white font-medium">{value}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => updateCriterion(key, e.target.value)}
                className="w-full"
              />
            </div>
          ))}
        </div>

        <div className={`p-4 rounded-xl border ${
          totalWeight === 100 
            ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100'
            : 'bg-red-500/10 border-red-400/30 text-red-100'
        }`}>
          <p className="font-medium">
            Total Weight: {totalWeight}%
            {totalWeight !== 100 && ' (Must equal 100%)'}
          </p>
        </div>

        {isBandRFQ && (
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
            <h4 className="font-medium text-blue-100 mb-2">
              Community-Specific Criteria
            </h4>
            <p className="text-sm text-blue-100/80">
              Your evaluation includes local benefit weighting to ensure maximum community impact.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Step navigation
  const currentStepComponent = [
    <ProjectDetailsStep />,
    <RequirementsStep />,
    <BudgetTimelineStep />,
    <LocationStep />,
    <EvaluationStep />,
    <div>Review Step</div> // Would implement full review
  ][currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Create {isGovernmentRFQ ? 'Government' : 'Community'} RFQ
          </h1>
          <p className="text-white/60">
            {isGovernmentRFQ 
              ? 'Post opportunities for Indigenous businesses'
              : 'Find the best suppliers for your community project'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <div key={index} className="flex items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isCompleted 
                      ? 'rgba(34, 197, 94, 0.3)' 
                      : isActive 
                      ? 'rgba(59, 130, 246, 0.3)' 
                      : 'rgba(255, 255, 255, 0.1)',
                  }}
                  className={`w-10 h-10 rounded-xl backdrop-blur-md border flex items-center justify-center
                    ${isCompleted 
                      ? 'border-emerald-400/50' 
                      : isActive 
                      ? 'border-blue-400/50' 
                      : 'border-white/20'}`}
                >
                  <Icon className={`w-5 h-5 ${
                    isCompleted 
                      ? 'text-emerald-400' 
                      : isActive 
                      ? 'text-blue-400' 
                      : 'text-white/50'
                  }`} />
                </motion.div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-0.5 mx-2 ${
                    index < currentStep 
                      ? 'bg-emerald-400/50' 
                      : 'bg-white/10'
                  }`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Form Content */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStepComponent}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 
                rounded-xl text-white font-medium transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (currentStep < steps.length - 1) {
                  setCurrentStep(prev => prev + 1)
                } else {
                  // Submit RFQ
                  logger.info('Submit RFQ:', formData)
                }
              }}
              className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 
                rounded-xl text-blue-100 font-medium transition-all duration-200
                flex items-center space-x-2"
            >
              <span>{currentStep === steps.length - 1 ? 'Publish RFQ' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}

// RFQ Marketplace View (for browsing active RFQs)
export function RFQMarketplace({ userType }) {
  const [rfqs, setRfqs] = useState([])
  const [filter, setFilter] = useState({
    type: 'all', // 'government', 'band', 'all'
    category: '',
    minBudget: 0,
    location: '',
  })

  const RFQCard = ({ rfq }) => {
    const isGovernmentRFQ = rfq.type === 'government'
    const daysLeft = Math.ceil((new Date(rfq.deadline) - new Date()) / (1000 * 60 * 60 * 24))

    return (
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
          hover:border-blue-400/50 transition-all duration-200"
      >
        {/* RFQ Type Badge */}
        <div className="flex justify-between items-start mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium
            ${isGovernmentRFQ 
              ? 'bg-blue-500/20 border border-blue-400/50 text-blue-100' 
              : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-100'}`}>
            <Building2 className="w-4 h-4 mr-1" />
            {isGovernmentRFQ ? 'Government' : 'Band Council'}
          </div>
          
          <div className="flex items-center text-sm text-white/60">
            <Clock className="w-4 h-4 mr-1" />
            {daysLeft} days left
          </div>
        </div>

        {/* RFQ Details */}
        <h3 className="text-lg font-semibold text-white mb-2">{rfq.title}</h3>
        <p className="text-sm text-white/60 mb-4 line-clamp-2">{rfq.description}</p>

        {/* Key Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-white/60">Budget</div>
            <div className="text-sm font-medium text-white">
              ${rfq.budgetRange.min.toLocaleString()} - ${rfq.budgetRange.max.toLocaleString()}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-white/60">Location</div>
            <div className="text-sm font-medium text-white">{rfq.location}</div>
          </div>
        </div>

        {/* Requirements */}
        {isGovernmentRFQ && (
          <div className="bg-blue-500/10 rounded-lg p-2 mb-4">
            <p className="text-xs text-blue-100">
              Requires {rfq.minimumIndigenousContent}% Indigenous content
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-4 text-sm text-white/60">
            <span>{rfq.bidCount} bids</span>
            <span>{rfq.viewCount} views</span>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 
              rounded-lg text-blue-100 text-sm font-medium transition-all duration-200"
          >
            View Details
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Active Opportunities
          </h1>
          <p className="text-lg text-white/60">
            Browse {filter.type === 'government' ? 'government' : filter.type === 'band' ? 'community' : 'all'} procurement opportunities
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <select
            value={filter.type}
            onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
          >
            <option value="all">All RFQs</option>
            <option value="government">Government (5% Target)</option>
            <option value="band">Band Council Projects</option>
          </select>
          
          <select
            value={filter.category}
            onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white"
          >
            <option value="">All Categories</option>
            <option value="construction">Construction</option>
            <option value="professional_services">Professional Services</option>
            <option value="it_services">IT Services</option>
          </select>
        </div>

        {/* RFQ Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mock RFQs - would load from database */}
          <RFQCard rfq={{
            type: 'government',
            title: 'IT Support Services - Indigenous Services Canada',
            description: 'Seeking Indigenous IT service providers for 24/7 help desk support...',
            budgetRange: { min: 100000, max: 250000 },
            location: 'Ottawa, ON',
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            minimumIndigenousContent: 51,
            bidCount: 7,
            viewCount: 234
          }} />
          
          <RFQCard rfq={{
            type: 'band',
            title: 'Community Centre Renovation - Phase 2',
            description: 'Six Nations is seeking qualified contractors for phase 2 renovation...',
            budgetRange: { min: 500000, max: 750000 },
            location: 'Six Nations, ON',
            deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
            bidCount: 12,
            viewCount: 456
          }} />
        </div>
      </div>
    </div>
  )
}