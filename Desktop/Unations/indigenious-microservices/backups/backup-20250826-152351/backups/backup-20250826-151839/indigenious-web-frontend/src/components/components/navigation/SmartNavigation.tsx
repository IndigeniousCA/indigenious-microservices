'use client'

import React, { useState, useEffect } from 'react'
import { 
  Home, Search, FileText, MessageSquare, BarChart3, 
  Shield, Settings, ChevronRight, Sparkles, Users,
  Calendar, Brain, Lock, Globe, DollarSign, Map,
  Smartphone, Languages, TestTube, Zap, HelpCircle,
  Star, ChevronDown, Menu, X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GlassPanel } from '@/components/ui/glass-panel'

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  href?: string
  badge?: string | number
  tag?: 'new' | 'beta' | 'pro'
  description?: string
  children?: NavItem[]
  requiredRole?: string[]
}

interface NavCategory {
  id: string
  title: string
  description: string
  items: NavItem[]
  defaultExpanded?: boolean
}

export function SmartNavigation() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<'business' | 'government' | 'elder' | 'admin'>('business')
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['core']))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Feature categories organized by complexity
  const allCategories: NavCategory[] = [
    {
      id: 'core',
      title: 'Getting Started',
      description: 'Essential features to begin',
      defaultExpanded: true,
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: Home,
          href: '/dashboard',
          description: 'Your personalized overview'
        },
        {
          id: 'rfqs',
          label: 'Find Opportunities',
          icon: Search,
          href: '/rfqs',
          description: 'Browse government RFQs',
          badge: 12,
          tag: 'new'
        },
        {
          id: 'bids',
          label: 'My Bids',
          icon: FileText,
          href: '/bids',
          description: 'Track your submissions'
        },
        {
          id: 'messages',
          label: 'Messages',
          icon: MessageSquare,
          href: '/messages',
          description: 'Communication hub',
          badge: 3
        }
      ]
    },
    {
      id: 'business',
      title: 'Business Tools',
      description: 'Grow your business',
      items: [
        {
          id: 'profile',
          label: 'Business Profile',
          icon: Users,
          href: '/profile',
          description: 'Manage your information'
        },
        {
          id: 'documents',
          label: 'Documents',
          icon: FileText,
          href: '/documents',
          description: 'Certificates & compliance'
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          href: '/analytics',
          description: 'Performance insights',
          tag: 'pro'
        },
        {
          id: 'financial',
          label: 'Financial Tools',
          icon: DollarSign,
          href: '/financial',
          description: 'Invoicing & payments'
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced Features',
      description: 'Power user tools',
      items: [
        {
          id: 'ai-insights',
          label: 'AI Insights',
          icon: Brain,
          href: '/ai-insights',
          description: 'Market intelligence',
          tag: 'beta'
        },
        {
          id: 'vendor-network',
          label: 'Vendor Network',
          icon: Users,
          href: '/vendors',
          description: 'Connect with partners'
        },
        {
          id: 'compliance',
          label: 'Compliance Center',
          icon: Shield,
          href: '/compliance',
          description: 'Certifications & audits'
        },
        {
          id: 'multi-language',
          label: 'Language Support',
          icon: Languages,
          href: '/languages',
          description: 'Cree, French & more'
        }
      ]
    },
    {
      id: 'innovation',
      title: 'Innovation Lab',
      description: 'Cutting-edge features',
      items: [
        {
          id: 'blockchain',
          label: 'Blockchain Contracts',
          icon: Lock,
          href: '/blockchain',
          description: 'Smart contract RFQs',
          tag: 'new'
        },
        {
          id: 'mobile-apps',
          label: 'Mobile Apps',
          icon: Smartphone,
          href: '/mobile',
          description: 'iOS & Android apps'
        },
        {
          id: 'api-integration',
          label: 'API & Integrations',
          icon: Zap,
          href: '/api',
          description: 'Connect your systems'
        },
        {
          id: 'vr-showroom',
          label: 'VR Showroom',
          icon: Globe,
          href: '/vr',
          description: '3D product demos',
          tag: 'beta'
        }
      ]
    },
    {
      id: 'governance',
      title: 'Governance & Security',
      description: 'Admin & compliance tools',
      items: [
        {
          id: 'security',
          label: 'Security Center',
          icon: Shield,
          href: '/admin/security',
          description: 'Advanced protections',
          requiredRole: ['admin', 'elder']
        },
        {
          id: 'ai-governance',
          label: 'AI Governance',
          icon: Brain,
          href: '/admin/ai-governance',
          description: 'ISO 42001 prep',
          requiredRole: ['admin']
        },
        {
          id: 'ceremony-calendar',
          label: 'Ceremony Calendar',
          icon: Calendar,
          href: '/ceremony',
          description: 'Cultural scheduling',
          requiredRole: ['elder', 'admin']
        }
      ]
    }
  ]

  // Filter categories based on user role and experience
  const getVisibleCategories = () => {
    let categories = [...allCategories]
    
    // Filter by role
    categories = categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
        !item.requiredRole || item.requiredRole.includes(userRole)
      )
    })).filter(cat => cat.items.length > 0)
    
    // Filter by experience level
    if (experience === 'beginner') {
      return categories.filter(cat => ['core', 'business'].includes(cat.id))
    } else if (experience === 'intermediate') {
      return categories.filter(cat => !['governance'].includes(cat.id))
    }
    
    return categories
  }

  // Search functionality
  const searchItems = (query: string) => {
    if (!query) return []
    
    const results: (NavItem & { category: string })[] = []
    const lowerQuery = query.toLowerCase()
    
    allCategories.forEach(category => {
      category.items.forEach(item => {
        if (
          item.label.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery)
        ) {
          results.push({ ...item, category: category.title })
        }
      })
    })
    
    return results
  }

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const isActive = (href?: string) => {
    if (!href || !pathname) return false
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-md rounded-lg"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Navigation Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-80 overflow-y-auto
        bg-black/20 backdrop-blur-xl border-r border-white/10
        transform transition-transform duration-300 z-40
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Indigenious
            </h2>
            <p className="text-white/60 text-sm">
              Welcome back, TechNation Inc
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50"
            />
          </div>

          {/* Search Results */}
          {searchQuery && (
            <GlassPanel className="p-4 space-y-2">
              <h3 className="text-sm font-medium text-white/60 mb-2">Search Results</h3>
              {searchItems(searchQuery).map(item => (
                <Link
                  key={item.id}
                  href={item.href || '#'}
                  className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setSearchQuery('')
                    setMobileMenuOpen(false)
                  }}
                >
                  {React.createElement(item.icon, { className: "w-4 h-4 text-blue-400" })}
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-xs text-white/40">{item.category}</p>
                  </div>
                </Link>
              ))}
            </GlassPanel>
          )}

          {/* Experience Level Selector */}
          <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
            {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
              <button
                key={level}
                onClick={() => setExperience(level)}
                className={`flex-1 px-3 py-1.5 rounded text-sm capitalize transition-all ${
                  experience === level
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Navigation Categories */}
          <div className="space-y-4">
            {getVisibleCategories().map(category => (
              <div key={category.id}>
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-white">
                      {category.title}
                    </h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      {category.description}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${
                    expandedCategories.has(category.id) ? 'rotate-180' : ''
                  }`} />
                </button>

                {expandedCategories.has(category.id) && (
                  <div className="mt-2 space-y-1">
                    {category.items.map(item => (
                      <Link
                        key={item.id}
                        href={item.href || '#'}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                          ${isActive(item.href)
                            ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-400'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                          }
                        `}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {React.createElement(item.icon, { className: "w-4 h-4 flex-shrink-0" })}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate">{item.label}</span>
                            {item.tag && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                item.tag === 'new' ? 'bg-green-500/20 text-green-400' :
                                item.tag === 'beta' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {item.tag}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-white/40 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.badge && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Help Section */}
          <div className="pt-4 border-t border-white/10">
            <Link
              href="/help"
              className="flex items-center gap-3 px-3 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm">Help & Tutorials</span>
            </Link>
          </div>

          {/* Quick Stats */}
          <GlassPanel className="p-4">
            <h4 className="text-sm font-medium text-white mb-3">Quick Stats</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Active Bids</span>
                <span className="text-white">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Success Rate</span>
                <span className="text-green-400">78%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Compliance</span>
                <span className="text-blue-400">100%</span>
              </div>
            </div>
          </GlassPanel>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  )
}