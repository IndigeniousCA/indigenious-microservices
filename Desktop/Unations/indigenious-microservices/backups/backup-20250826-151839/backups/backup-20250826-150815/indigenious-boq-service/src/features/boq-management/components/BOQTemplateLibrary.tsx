'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, Download, Star, Clock, Users, Filter,
  Search, Building, Home, Hospital, School, Factory,
  Trees, Shield, Plus, Eye
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import type { BOQTemplate, ProjectType, BOQDiscipline } from '../types'

interface BOQTemplateLibraryProps {
  onSelectTemplate: (template: BOQTemplate) => void
  onCreateTemplate?: () => void
}

// Mock templates data
const mockTemplates: BOQTemplate[] = [
  {
    id: 'template-1',
    name: 'Standard Commercial Building',
    description: 'Complete BOQ template for commercial construction projects',
    discipline: 'architectural',
    projectType: 'commercial',
    sections: [
      {
        code: 'A',
        name: 'Preliminaries',
        items: []
      },
      {
        code: 'B',
        name: 'Substructure',
        items: []
      }
    ],
    createdBy: 'Indigenious Team',
    organization: 'Indigenious',
    isPublic: true,
    isIndigenousOptimized: true,
    tags: ['commercial', 'building', 'standard'],
    usageCount: 245,
    rating: 4.8,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-15')
  },
  {
    id: 'template-2',
    name: 'Indigenous Community Center',
    description: 'Specialized template for Indigenous community buildings with cultural considerations',
    discipline: 'architectural',
    projectType: 'community_center',
    sections: [
      {
        code: 'A',
        name: 'Site Preparation & Cultural Protocols',
        items: []
      },
      {
        code: 'B',
        name: 'Traditional Materials',
        items: []
      }
    ],
    createdBy: 'Elder Council',
    organization: 'First Nations Construction Alliance',
    isPublic: true,
    isIndigenousOptimized: true,
    tags: ['indigenous', 'community', 'cultural'],
    usageCount: 89,
    rating: 4.9,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-20')
  },
  {
    id: 'template-3',
    name: 'Residential Housing Project',
    description: 'Template for residential construction including Indigenous housing',
    discipline: 'architectural',
    projectType: 'residential',
    sections: [],
    createdBy: 'Housing Department',
    organization: 'Northern Communities',
    isPublic: true,
    isIndigenousOptimized: true,
    tags: ['residential', 'housing', 'indigenous'],
    usageCount: 156,
    rating: 4.7,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-02-18')
  }
]

const projectTypeIcons = {
  'commercial': Building,
  'residential': Home,
  'community_center': Users,
  'health_facility': Hospital,
  'education_facility': School,
  'industrial': Factory,
  'infrastructure': Shield,
  'indigenous_housing': Trees
}

export function BOQTemplateLibrary({ 
  onSelectTemplate,
  onCreateTemplate 
}: BOQTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<ProjectType | 'all'>('all')
  const [selectedDiscipline, setSelectedDiscipline] = useState<BOQDiscipline | 'all'>('all')
  const [showIndigenousOnly, setShowIndigenousOnly] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<BOQTemplate | null>(null)

  // Filter templates
  const filteredTemplates = mockTemplates.filter(template => {
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !template.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    if (selectedType !== 'all' && template.projectType !== selectedType) {
      return false
    }
    
    if (selectedDiscipline !== 'all' && template.discipline !== selectedDiscipline) {
      return false
    }
    
    if (showIndigenousOnly && !template.isIndigenousOptimized) {
      return false
    }
    
    return true
  })

  const renderTemplateCard = (template: BOQTemplate) => {
    const Icon = projectTypeIcons[template.projectType] || FileText
    
    return (
      <motion.div
        key={template.id}
        whileHover={{ y: -4 }}
        className="h-full"
      >
        <GlassPanel className="p-6 h-full flex flex-col cursor-pointer hover:border-blue-400/50 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-blue-400" />
            </div>
            
            {template.isIndigenousOptimized && (
              <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                Indigenous Optimized
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            {template.name}
          </h3>
          
          <p className="text-white/60 text-sm mb-4 flex-1">
            {template.description}
          </p>

          <div className="space-y-3">
            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3 text-white/50">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {template.usageCount}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  {template.rating}
                </span>
              </div>
              
              <span className="text-white/50 capitalize">
                {template.discipline}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <GlassButton
                size="sm"
                className="flex-1"
                onClick={() => onSelectTemplate(template)}
              >
                Use Template
              </GlassButton>
              <GlassButton
                size="sm"
                variant="secondary"
                onClick={() => setPreviewTemplate(template)}
              >
                <Eye className="w-4 h-4" />
              </GlassButton>
            </div>
          </div>

          {/* Author info */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>By {template.organization}</span>
              <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">BOQ Template Library</h1>
            <p className="text-white/60 mt-1">
              Start with a pre-built template optimized for your project type
            </p>
          </div>
          
          {onCreateTemplate && (
            <GlassButton onClick={onCreateTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </GlassButton>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassInput
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:col-span-2"
          />
          
          <select
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as unknown)}
          >
            <option value="all">All Project Types</option>
            <option value="commercial">Commercial</option>
            <option value="residential">Residential</option>
            <option value="community_center">Community Center</option>
            <option value="health_facility">Health Facility</option>
            <option value="education_facility">Education</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="indigenous_housing">Indigenous Housing</option>
          </select>
          
          <select
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value as unknown)}
          >
            <option value="all">All Disciplines</option>
            <option value="architectural">Architectural</option>
            <option value="structural">Structural</option>
            <option value="mechanical">Mechanical</option>
            <option value="electrical">Electrical</option>
            <option value="civil">Civil</option>
          </select>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={showIndigenousOnly}
              onChange={(e) => setShowIndigenousOnly(e.target.checked)}
              className="rounded border-white/20"
            />
            Indigenous Optimized Only
          </label>
          
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm text-white/80 transition-colors">
              Most Popular
            </button>
            <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm text-white/80 transition-colors">
              Recently Updated
            </button>
            <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm text-white/80 transition-colors">
              Highest Rated
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => renderTemplateCard(template))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <GlassPanel className="p-12 text-center">
          <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No templates found
          </h3>
          <p className="text-white/60">
            Try adjusting your filters or search terms
          </p>
        </GlassPanel>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <GlassPanel className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Template Preview: {previewTemplate.name}
                </h2>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Template Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-2">
                    Description
                  </h3>
                  <p className="text-white/80">{previewTemplate.description}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-2">
                    Section Structure
                  </h3>
                  <div className="space-y-2">
                    {previewTemplate.sections.map((section, index) => (
                      <div key={index} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {section.code}
                          </span>
                          <span className="text-white/80">{section.name}</span>
                          <span className="text-white/50 text-sm">
                            ({section.items.length} items)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <GlassButton
                    className="flex-1"
                    onClick={() => {
                      onSelectTemplate(previewTemplate)
                      setPreviewTemplate(null)
                    }}
                  >
                    Use This Template
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    onClick={() => setPreviewTemplate(null)}
                  >
                    Close
                  </GlassButton>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      )}
    </div>
  )
}