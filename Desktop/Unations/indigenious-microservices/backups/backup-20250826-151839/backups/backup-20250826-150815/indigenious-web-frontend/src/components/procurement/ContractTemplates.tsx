// Contract Templates Component
// Pre-approved templates for Indigenous procurement contracts

import { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion } from 'framer-motion'
import { FileText, Download, Edit3, Copy, Check, Calendar, DollarSign, Users, Building, Shield } from 'lucide-react'
import { GlassPanel } from '../ui/GlassPanel'
import { GlassButton } from '../ui/GlassButton'

interface ContractTemplate {
  id: string
  name: string
  description: string
  category: 'construction' | 'services' | 'supplies' | 'consulting' | 'joint-venture'
  version: string
  lastUpdated: string
  downloads: number
  features: string[]
  indigenousProvisions: string[]
  estimatedValue: {
    min: number
    max: number
  }
}

const templates: ContractTemplate[] = [
  {
    id: '1',
    name: 'Standard Construction Contract',
    description: 'Comprehensive construction contract with Indigenous workforce requirements',
    category: 'construction',
    version: '2.1',
    lastUpdated: '2024-01-15',
    downloads: 234,
    features: [
      'Payment milestones',
      'Quality assurance',
      'Safety requirements',
      'Environmental protection'
    ],
    indigenousProvisions: [
      '25% Indigenous workforce requirement',
      'Subcontracting preferences',
      'Cultural site protection',
      'Elder consultation clause'
    ],
    estimatedValue: { min: 100000, max: 5000000 }
  },
  {
    id: '2',
    name: 'Professional Services Agreement',
    description: 'For consulting, engineering, and professional services',
    category: 'services',
    version: '1.8',
    lastUpdated: '2024-01-10',
    downloads: 156,
    features: [
      'Deliverable schedules',
      'Intellectual property',
      'Confidentiality terms',
      'Performance metrics'
    ],
    indigenousProvisions: [
      'Knowledge transfer requirements',
      'Capacity building components',
      'Indigenous IP protection',
      'Community benefit sharing'
    ],
    estimatedValue: { min: 50000, max: 500000 }
  },
  {
    id: '3',
    name: 'Supply & Procurement Agreement',
    description: 'Standard template for goods and supplies procurement',
    category: 'supplies',
    version: '1.5',
    lastUpdated: '2024-01-08',
    downloads: 189,
    features: [
      'Delivery schedules',
      'Quality standards',
      'Warranty provisions',
      'Return policies'
    ],
    indigenousProvisions: [
      'Indigenous supplier preferences',
      'Local sourcing requirements',
      'Traditional material considerations',
      'Fair trade provisions'
    ],
    estimatedValue: { min: 10000, max: 1000000 }
  },
  {
    id: '4',
    name: 'Joint Venture Agreement',
    description: 'Partnership template for Indigenous-led joint ventures',
    category: 'joint-venture',
    version: '3.0',
    lastUpdated: '2024-01-20',
    downloads: 98,
    features: [
      'Equity structures',
      'Governance framework',
      'Profit sharing',
      'Exit strategies'
    ],
    indigenousProvisions: [
      'Indigenous majority ownership',
      'Traditional governance integration',
      'Community benefit agreements',
      'Cultural protocol adherence'
    ],
    estimatedValue: { min: 500000, max: 10000000 }
  }
]

export function ContractTemplates() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const categories = [
    { id: 'all', name: 'All Templates', icon: FileText },
    { id: 'construction', name: 'Construction', icon: Building },
    { id: 'services', name: 'Services', icon: Users },
    { id: 'supplies', name: 'Supplies', icon: DollarSign },
    { id: 'joint-venture', name: 'Joint Ventures', icon: Shield }
  ]

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory)

  const handleDownload = (template: ContractTemplate) => {
    // In production, this would download the actual template file
    logger.info('Downloading template:', template.name)
    // Increment download count
  }

  const handleCopy = (templateId: string) => {
    // In production, this would copy template to user's drafts
    setCopied(templateId)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(value)
  }

  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Contract Templates</h2>
          <p className="text-white/70">
            Pre-approved templates with Indigenous procurement provisions
          </p>
        </div>
        <GlassButton variant="primary">
          <FileText className="w-4 h-4 mr-2" />
          Request Custom Template
        </GlassButton>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 whitespace-nowrap ${
              selectedCategory === category.id
                ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            }`}
          >
            <category.icon className="w-4 h-4" />
            {category.name}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTemplates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassPanel className="p-6 hover:bg-white/10 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {template.name}
                  </h3>
                  <p className="text-white/60 text-sm">{template.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-white/50">v{template.version}</span>
                </div>
              </div>

              {/* Value Range */}
              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Contract Value Range</span>
                  <span className="text-white font-medium">
                    {formatCurrency(template.estimatedValue.min)} - {formatCurrency(template.estimatedValue.max)}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-white/80 mb-2">Standard Features</h4>
                <div className="flex flex-wrap gap-2">
                  {template.features.map((feature, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-white/10 rounded-md text-xs text-white/70"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Indigenous Provisions */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-emerald-400 mb-2">
                  Indigenous Provisions
                </h4>
                <ul className="space-y-1">
                  {template.indigenousProvisions.slice(0, 2).map((provision, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/70">{provision}</span>
                    </li>
                  ))}
                  {template.indigenousProvisions.length > 2 && (
                    <li className="text-sm text-white/50 ml-5">
                      +{template.indigenousProvisions.length - 2} more provisions
                    </li>
                  )}
                </ul>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-4 text-sm text-white/50">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(template.lastUpdated).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {template.downloads} downloads
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopy(template.id)}
                  >
                    {copied === template.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="primary"
                    onClick={() => handleDownload(template)}
                  >
                    <Download className="w-4 h-4" />
                  </GlassButton>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      {/* Preview Modal */}
      {selectedTemplate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTemplate(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-semibold text-white">
                {selectedTemplate.name}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-white/70 mb-4">
                Full template preview would be displayed here
              </p>
              <div className="flex gap-3">
                <GlassButton variant="primary" onClick={() => handleDownload(selectedTemplate)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </GlassButton>
                <GlassButton variant="secondary" onClick={() => setSelectedTemplate(null)}>
                  Close
                </GlassButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </GlassPanel>
  )
}