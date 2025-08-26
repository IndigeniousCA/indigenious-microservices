'use client'

import React, { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronRight, ChevronLeft, Check, Users, Building, 
  FileText, Search, Award, DollarSign, Shield, Heart,
  Sparkles, ArrowRight, X
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { UserRole } from '@/components/dashboards/DashboardRouter'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  content: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

interface InteractiveOnboardingProps {
  userRole: UserRole
  onComplete: () => void
}

export function InteractiveOnboarding({ userRole, onComplete }: InteractiveOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [showTips, setShowTips] = useState(true)
  
  // Role-specific onboarding flows
  const getOnboardingSteps = (): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: 'Welcome to Indigenious',
        description: 'Your gateway to Indigenous procurement opportunities',
        icon: Heart,
        content: (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Heart className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">
                Boozhoo! Welcome!
              </h3>
              <p className="text-white/80">
                We're excited to have you join our growing community of Indigenous businesses,
                government buyers, and partners working together.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-3xl mb-2">🎯</div>
                <p className="text-sm text-white/80">5% Target</p>
                <p className="text-xs text-white/60">Federal procurement goal</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-3xl mb-2">💼</div>
                <p className="text-sm text-white/80">$2B+ Opportunity</p>
                <p className="text-xs text-white/60">Annual contracts</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-3xl mb-2">🤝</div>
                <p className="text-sm text-white/80">1000+ Members</p>
                <p className="text-xs text-white/60">Growing daily</p>
              </div>
            </div>
          </div>
        )
      }
    ]
    
    // Add role-specific steps
    switch (userRole) {
      case 'indigenous-sme':
      case 'indigenous-large':
        return [
          ...baseSteps,
          {
            id: 'profile',
            title: 'Complete Your Profile',
            description: 'Tell buyers about your business',
            icon: Users,
            content: (
              <div className="space-y-4">
                <p className="text-white/80">
                  A complete profile increases your chances of winning contracts by 73%
                </p>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm text-white/60">Business Name</span>
                    <input 
                      type="text" 
                      className="mt-1 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                      placeholder="TechNation Inc."
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-white/60">Indigenous Community</span>
                    <input 
                      type="text" 
                      className="mt-1 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                      placeholder="Cree Nation"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-white/60">Primary Industry</span>
                    <select className="mt-1 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                      <option>Information Technology</option>
                      <option>Construction</option>
                      <option>Professional Services</option>
                      <option>Manufacturing</option>
                    </select>
                  </label>
                </div>
              </div>
            ),
            action: {
              label: 'Save Profile',
              onClick: () => logger.info('Profile saved')
            }
          },
          {
            id: 'search',
            title: 'Find Your First RFQ',
            description: 'Learn how to search for opportunities',
            icon: Search,
            content: (
              <div className="space-y-4">
                <p className="text-white/80">
                  Our AI-powered search helps you find RFQs that match your capabilities
                </p>
                <div className="p-4 bg-white/5 rounded-lg border border-blue-400/30">
                  <p className="text-sm text-blue-400 mb-2">💡 Pro Tips:</p>
                  <ul className="space-y-1 text-sm text-white/80">
                    <li>• Use filters to narrow by industry and budget</li>
                    <li>• Save searches to get alerts for new matches</li>
                    <li>• Look for "Indigenous Business Set-Aside" tags</li>
                    <li>• Check closing dates - start with longer deadlines</li>
                  </ul>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-green-400" />
                  <p className="text-sm text-white/80">
                    We found <span className="text-green-400 font-semibold">12 RFQs</span> that match your profile!
                  </p>
                </div>
              </div>
            )
          },
          {
            id: 'bid',
            title: 'Submit Your First Bid',
            description: 'Step-by-step bid preparation',
            icon: FileText,
            content: (
              <div className="space-y-4">
                <p className="text-white/80">
                  We'll guide you through your first bid submission
                </p>
                <div className="space-y-3">
                  {[
                    { step: '1', label: 'Review requirements carefully', done: true },
                    { step: '2', label: 'Gather required documents', done: true },
                    { step: '3', label: 'Prepare pricing breakdown', done: false },
                    { step: '4', label: 'Write executive summary', done: false },
                    { step: '5', label: 'Submit before deadline', done: false }
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.done ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                      }`}>
                        {item.done ? <Check className="w-4 h-4" /> : item.step}
                      </div>
                      <p className={`text-sm ${item.done ? 'text-white' : 'text-white/60'}`}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        ]
        
      case 'government':
        return [
          ...baseSteps,
          {
            id: 'target',
            title: 'Your 5% Target',
            description: 'Understanding your Indigenous procurement goals',
            icon: Award,
            content: (
              <div className="space-y-4">
                <p className="text-white/80">
                  The federal government has committed to awarding 5% of contracts to Indigenous businesses
                </p>
                <div className="p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Your Department's Progress</p>
                      <div className="mt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/60">Current: 3.2%</span>
                          <span className="text-white">Target: 5%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3">
                          <div className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full" style={{ width: '64%' }} />
                        </div>
                      </div>
                      <p className="text-sm text-white/60 mt-2">
                        You need $1.8M more in Indigenous contracts this fiscal year
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'post',
            title: 'Post Your First RFQ',
            description: 'Reach qualified Indigenous vendors',
            icon: FileText,
            content: (
              <div className="space-y-4">
                <p className="text-white/80">
                  Our platform connects you with 1000+ verified Indigenous businesses
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-sm font-medium text-white mb-1">✅ Auto-match vendors</p>
                    <p className="text-xs text-white/60">AI finds qualified businesses for your RFQ</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-sm font-medium text-white mb-1">📊 Track compliance</p>
                    <p className="text-xs text-white/60">Real-time dashboard for your 5% target</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-sm font-medium text-white mb-1">🔒 Simplified process</p>
                    <p className="text-xs text-white/60">Templates designed for Indigenous procurement</p>
                  </div>
                </div>
              </div>
            )
          }
        ]
        
      case 'elder':
        return [
          ...baseSteps,
          {
            id: 'wisdom',
            title: 'Your Sacred Role',
            description: 'Guiding business with traditional wisdom',
            icon: Heart,
            content: (
              <div className="space-y-4">
                <p className="text-white/80">
                  As an Elder, you provide crucial cultural oversight to ensure business aligns with our values
                </p>
                <div className="p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
                  <p className="text-purple-400 font-medium mb-3">The Seven Sacred Teachings in Business</p>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">Love:</span>
                      <span className="text-white/80">Caring for community in all decisions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">Respect:</span>
                      <span className="text-white/80">Honoring all stakeholders</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60">Truth:</span>
                      <span className="text-white/80">Transparent business practices</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'review',
            title: 'Review & Guide',
            description: 'How to provide cultural oversight',
            icon: Shield,
            content: (
              <div className="space-y-4">
                <p className="text-white/80">
                  You'll review projects, AI systems, and business practices for cultural alignment
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">Project Reviews</p>
                      <p className="text-xs text-white/60">Ensure respect for sacred sites and traditions</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">AI Ethics</p>
                      <p className="text-xs text-white/60">Verify AI respects ceremony periods and sacred data</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <Heart className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">Youth Mentorship</p>
                      <p className="text-xs text-white/60">Share wisdom with next generation of leaders</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        ]
        
      default:
        return baseSteps
    }
  }
  
  const steps = getOnboardingSteps()
  const isLastStep = currentStep === steps.length - 1
  
  const handleNext = () => {
    setCompletedSteps(new Set(Array.from(completedSteps).concat(currentStep)))
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleSkip = () => {
    onComplete()
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl"
      >
        <GlassPanel className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Getting Started</h2>
              <p className="text-sm text-white/60">Step {currentStep + 1} of {steps.length}</p>
            </div>
            <button
              onClick={handleSkip}
              className="text-white/40 hover:text-white/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded-full transition-all ${
                  index < currentStep ? 'bg-blue-400' :
                  index === currentStep ? 'bg-blue-400/50' :
                  'bg-white/10'
                }`}
              />
            ))}
          </div>
          
          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  {React.createElement(steps[currentStep].icon, {
                    className: 'w-8 h-8 text-blue-400'
                  })}
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {steps[currentStep].title}
                    </h3>
                    <p className="text-sm text-white/60">
                      {steps[currentStep].description}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6">
                  {steps[currentStep].content}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 text-sm ${
                currentStep === 0
                  ? 'text-white/20 cursor-not-allowed'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                className="text-sm text-white/40 hover:text-white/60"
              >
                Skip tour
              </button>
              
              {steps[currentStep].action ? (
                <GlassButton
                  onClick={steps[currentStep].action!.onClick}
                  variant="secondary"
                  size="sm"
                >
                  {steps[currentStep].action.label}
                </GlassButton>
              ) : (
                <GlassButton
                  onClick={handleNext}
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </GlassButton>
              )}
            </div>
          </div>
        </GlassPanel>
        
        {/* Tips */}
        {showTips && currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <GlassPanel className="p-4 border-yellow-400/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">💡 Quick Tip</p>
                    <p className="text-sm text-white/60">
                      Complete this onboarding to unlock personalized recommendations and faster success!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTips(false)}
                  className="text-white/40 hover:text-white/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}