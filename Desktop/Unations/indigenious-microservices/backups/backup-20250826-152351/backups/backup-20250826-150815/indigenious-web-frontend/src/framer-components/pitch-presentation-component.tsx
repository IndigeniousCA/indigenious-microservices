// Interactive Pitch Presentation Component for Framer
// Brings "THE PITCH THAT CHANGES EVERYTHING" to life with data visualization

import { useState, useEffect, ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, DollarSign, Leaf, Users, Shield, 
  BarChart3, Globe, Target, Award, CheckCircle 
} from 'lucide-react'

export function withPitchPresentation(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isPresenting, setIsPresenting] = useState(false)
    const [animationKey, setAnimationKey] = useState(0)

    const slides = [
      {
        id: 'hook',
        title: 'THE HOOK',
        subtitle: 'Indigenous Procurement: From Compliance Burden to Economic Sovereignty',
        content: '"Minister, what if I told you we could end Indigenous economic dependency, solve procurement fraud, hit climate targets, AND make your department the hero of reconciliation - all with one platform?"',
        visual: 'hook',
        duration: 30
      },
      {
        id: 'perfect-storm',
        title: 'The Perfect Storm of Opportunity',
        subtitle: 'Three Crises Converging',
        content: {
          crises: [
            { title: 'GC Strategies Scandal', desc: 'Parliament demanding answers on phantom partnerships', impact: '$1.6B fraud risk' },
            { title: 'Climate Emergency', desc: '3000km transport routes past local suppliers', impact: '450 tonnes CO2' },
            { title: 'Economic Apartheid', desc: '$300B in Indigenous assets locked by Bill 89', impact: '150 years exclusion' }
          ],
          solution: 'One Revolutionary Solution: "We\'ve built the platform that solves all three. And communities control it themselves."'
        },
        visual: 'crisis-solution',
        duration: 90
      },
      {
        id: 'innovation',
        title: 'The Game-Changing Innovation',
        subtitle: 'Community-Controlled Procurement Algorithms',
        content: {
          dashboard: {
            community: 'James Bay Cree',
            settings: {
              carbonFootprint: 35,
              localEmployment: 30,
              price: 20,
              culturalRespect: 10,
              trainingPrograms: 5
            },
            result: {
              winner: 'Local supplier wins despite being 10% more expensive',
              why: '95% less carbon, 25 local jobs created'
            }
          },
          powerStatement: 'Communities encode THEIR values into procurement decisions. Every choice transparent, justified, defensible.'
        },
        visual: 'live-dashboard',
        duration: 120
      },
      {
        id: 'carbon-revolution',
        title: 'The Carbon Revolution',
        subtitle: 'Real Example - Live Calculation',
        content: {
          current: {
            source: 'Ship concrete 3000km from Quebec City',
            cost: 2400000,
            carbon: 450,
            localJobs: 0,
            trueCost: 2467500
          },
          platform: {
            source: 'Local gravel pit 14km away',
            cost: 1800000,
            carbon: 28,
            localJobs: 25,
            trueCost: 1804200
          },
          savings: {
            money: 663300,
            carbon: 422,
            jobs: 25
          }
        },
        visual: 'carbon-comparison',
        duration: 120
      },
      {
        id: 'dependency-breakthrough',
        title: 'The Dependency Breakthrough',
        subtitle: 'From Subsidies to Sovereignty',
        content: {
          phase1: {
            title: 'Clean Procurement (Immediate)',
            items: ['Verify legitimate businesses', 'Track carbon in real-time', 'Communities control algorithms', 'Create creditworthy history']
          },
          phase2: {
            title: 'Unlock Capital (Game-changer)',
            items: ['Escrow system with major bank ready', '$300B in assets become bankable', 'End 150 years of economic exclusion', 'From subsidies to sovereignty']
          },
          timeline: {
            year1: { dependency: 100, privateCapital: 0 },
            year3: { dependency: 50, privateCapital: 50 },
            year10: { dependency: 0, privateCapital: 100 }
          }
        },
        visual: 'dependency-timeline',
        duration: 150
      },
      {
        id: 'community-adoption',
        title: 'Why Communities Will Adopt Instantly',
        subtitle: 'Built by Indigenous-majority company that actually understands',
        content: {
          communities: [
            {
              type: 'Northern Communities',
              message: 'Finally, technology that understands winter roads, goose break, and why shipping past local suppliers is insane'
            },
            {
              type: 'Urban Indigenous Orgs',
              message: 'Flexible algorithms for diverse populations and complex needs'
            },
            {
              type: 'Band Councils',
              message: 'Your values, your priorities, transparent decisions you can defend'
            }
          ]
        },
        visual: 'community-testimonials',
        duration: 90
      },
      {
        id: 'political-wins',
        title: 'Your Political Wins',
        subtitle: 'Immediate, Medium-term, and Legacy Impact',
        content: {
          immediate: ['Answer GC Strategies scandal with action', 'First government tracking procurement carbon', '1,300+ Indigenous jobs created'],
          mediumTerm: ['Achieve 5% target with verified businesses', '40% reduction in procurement emissions', 'Communities praising transparency'],
          legacy: ['End Indigenous economic dependency', 'Global first: community-controlled procurement', 'Nobel Prize conversation starter']
        },
        visual: 'political-timeline',
        duration: 120
      },
      {
        id: 'september-30',
        title: 'The September 30 Announcement',
        subtitle: 'On Truth & Reconciliation Day, We Give Communities Control',
        content: {
          speech: '"Today, we don\'t just acknowledge truth - we transfer power. Indigenous communities will now control how procurement decisions are made in their territories. They set the algorithms. They weight the values. They drive the outcomes. This platform proves reconciliation isn\'t just words - it\'s code, it\'s transparency, it\'s economic sovereignty."',
          headlines: [
            'Trudeau Government Ends Economic Apartheid',
            'Communities Now Control Federal Procurement',
            'Canada First to Price Carbon in Real-Time'
          ]
        },
        visual: 'announcement',
        duration: 120
      },
      {
        id: 'the-ask',
        title: 'The Ask',
        subtitle: 'Your Legacy Decision',
        content: {
          thisWeek: ['30-minute briefing with Indigenous Services Minister', 'API access authorization letter', 'Assign senior liaison from your office'],
          investment: {
            phase1: { amount: '2.5M', duration: '4 months', desc: 'pilot' },
            phase2: { amount: '6M', duration: '8 months', desc: 'scale' },
            roi: '$3.65B savings + end dependency'
          },
          legacy: 'Be the Minister who gave Indigenous communities control over their economic future'
        },
        visual: 'investment-roi',
        duration: 120
      },
      {
        id: 'closing',
        title: 'Your Moment of Truth',
        subtitle: 'This isn\'t software. It\'s sovereignty.',
        content: {
          statement: '"Minister, every government has managed Indigenous poverty. You can end it. Every government has promised reconciliation. You can code it. Every government has talked about climate action. You can price it. This isn\'t software. It\'s sovereignty. And it starts with your signature."',
          callToAction: '"The communities are waiting. The technology is ready. History is watching. What happens next?"'
        },
        visual: 'closing',
        duration: 60
      }
    ]

    const nextSlide = () => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
      setAnimationKey(prev => prev + 1)
    }

    const prevSlide = () => {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
      setAnimationKey(prev => prev + 1)
    }

    const startPresentation = () => {
      setIsPresenting(true)
      setCurrentSlide(0)
    }

    // Auto-advance slides during presentation
    useEffect(() => {
      if (isPresenting) {
        const timer = setTimeout(() => {
          if (currentSlide < slides.length - 1) {
            nextSlide()
          } else {
            setIsPresenting(false)
          }
        }, slides[currentSlide].duration * 1000)

        return () => clearTimeout(timer)
      }
    }, [isPresenting, currentSlide, animationKey])

    const renderSlideVisual = (slide) => {
      switch (slide.visual) {
        case 'hook':
          return (
            <div className="flex items-center justify-center h-full">
              <motion.div
                key={animationKey}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="text-center"
              >
                <div className="text-6xl mb-4">🎯</div>
                <div className="text-2xl font-light text-emerald-400">
                  Four Problems, One Solution
                </div>
              </motion.div>
            </div>
          )

        case 'crisis-solution':
          return (
            <div className="grid grid-cols-2 gap-8 h-full">
              <motion.div
                key={`crisis-${animationKey}`}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-medium text-red-400 mb-4">Current Chaos</h3>
                {slide.content.crises.map((crisis, index) => (
                  <motion.div
                    key={crisis.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.3, duration: 0.5 }}
                    className="bg-red-900/20 border border-red-600/30 rounded-lg p-4"
                  >
                    <h4 className="font-medium text-red-300">{crisis.title}</h4>
                    <p className="text-sm opacity-80">{crisis.desc}</p>
                    <p className="text-xs text-red-400 mt-1">{crisis.impact}</p>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                key={`solution-${animationKey}`}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex items-center justify-center"
              >
                <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-6 text-center">
                  <h3 className="text-xl font-medium text-emerald-400 mb-4">Revolutionary Solution</h3>
                  <div className="text-4xl mb-4">⚡</div>
                  <p className="text-emerald-300">{slide.content.solution}</p>
                </div>
              </motion.div>
            </div>
          )

        case 'live-dashboard':
          const dashboard = slide.content.dashboard
          return (
            <div className="h-full">
              <motion.div
                key={`dashboard-${animationKey}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 mb-6"
              >
                <h3 className="text-lg font-medium text-emerald-400 mb-4">
                  {dashboard.community} Community Settings
                </h3>
                <div className="space-y-3">
                  {Object.entries(dashboard.settings).map(([key, value], index) => (
                    <motion.div
                      key={key}
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: index * 0.2, duration: 0.8 }}
                      className="flex items-center justify-between"
                    >
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-white/20 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${value}%` }}
                            transition={{ delay: index * 0.2 + 0.5, duration: 0.8 }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                        <span className="text-sm font-medium">{value}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4"
              >
                <h4 className="font-medium text-emerald-300 mb-2">Result:</h4>
                <p className="text-emerald-200">{dashboard.result.winner}</p>
                <p className="text-sm opacity-80 mt-1">Why: {dashboard.result.why}</p>
              </motion.div>
            </div>
          )

        case 'carbon-comparison':
          const { current, platform, savings } = slide.content
          return (
            <div className="grid grid-cols-2 gap-8 h-full">
              <motion.div
                key={`current-${animationKey}`}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="bg-red-900/20 border border-red-600/30 rounded-xl p-6"
              >
                <h3 className="text-lg font-medium text-red-400 mb-4">Current Method</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-medium">${current.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Carbon:</span>
                    <span className="font-medium text-red-400">{current.carbon} tonnes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Local Jobs:</span>
                    <span className="font-medium">{current.localJobs}</span>
                  </div>
                  <div className="border-t border-red-600/30 pt-2 mt-4">
                    <div className="flex justify-between font-medium">
                      <span>TRUE Cost:</span>
                      <span className="text-red-300">${current.trueCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                key={`platform-${animationKey}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6"
              >
                <h3 className="text-lg font-medium text-emerald-400 mb-4">Platform Method</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span className="font-medium">${platform.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Carbon:</span>
                    <span className="font-medium text-emerald-400">{platform.carbon} tonnes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Local Jobs:</span>
                    <span className="font-medium text-emerald-400">{platform.localJobs}</span>
                  </div>
                  <div className="border-t border-emerald-600/30 pt-2 mt-4">
                    <div className="flex justify-between font-medium">
                      <span>TRUE Cost:</span>
                      <span className="text-emerald-300">${platform.trueCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                key={`savings-${animationKey}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="col-span-2 bg-amber-900/20 border border-amber-600/30 rounded-xl p-6 text-center"
              >
                <h3 className="text-lg font-medium text-amber-400 mb-4">TOTAL SAVINGS</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-light text-amber-300">${savings.money.toLocaleString()}</div>
                    <div className="text-sm opacity-80">Cost Savings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-light text-amber-300">{savings.carbon} tonnes</div>
                    <div className="text-sm opacity-80">CO2 Reduced</div>
                  </div>
                  <div>
                    <div className="text-2xl font-light text-amber-300">{savings.jobs}</div>
                    <div className="text-sm opacity-80">Jobs Created</div>
                  </div>
                </div>
              </motion.div>
            </div>
          )

        default:
          return (
            <div className="flex items-center justify-center h-full">
              <motion.div
                key={animationKey}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="text-center"
              >
                <div className="text-4xl mb-4">📊</div>
                <div className="text-xl">Visual placeholder</div>
              </motion.div>
            </div>
          )
      }
    }

    return (
      <Component 
        {...props}
        slides={slides}
        currentSlide={currentSlide}
        isPresenting={isPresenting}
        nextSlide={nextSlide}
        prevSlide={prevSlide}
        startPresentation={startPresentation}
        renderSlideVisual={renderSlideVisual}
      />
    )
  }
}