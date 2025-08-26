// Knowledge Base Component
// Central repository of resources, guides, and best practices

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, FileText, Video, Download, Star, Search,
  Filter, ChevronRight, Clock, Eye, ThumbsUp, Bookmark,
  Award, TrendingUp, Users, Lightbulb, PlayCircle,
  FileCheck, Calendar, Tag, Share, AlertCircle, CheckCircle
} from 'lucide-react'
import { KnowledgeResource, ResourceCategory, ResourceType } from '../types/community.types'

export function KnowledgeBase() {
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | 'all'>('all')
  const [selectedType, setSelectedType] = useState<ResourceType | 'all'>('all')
  const [selectedResource, setSelectedResource] = useState<KnowledgeResource | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'rating'>('recent')

  // Mock resources
  const resources: KnowledgeResource[] = [
    {
      id: 'res-1',
      title: 'Complete Guide to Government Procurement',
      description: 'Step-by-step guide to winning your first government contract, from registration to bid submission',
      category: 'procurement',
      type: 'guide',
      content: 'Detailed content here...',
      authorId: 'platform',
      authorName: 'Platform Team',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
      tags: ['procurement', 'government', 'beginners'],
      views: 2341,
      downloads: 567,
      ratings: [
        { userId: '1', rating: 5, helpful: 45, date: '2024-01-16' },
        { userId: '2', rating: 4, helpful: 32, date: '2024-01-17' }
      ],
      isOfficial: true,
      isFeatured: true,
      relatedResources: ['res-2', 'res-3'],
      estimatedTime: '45 minutes'
    },
    {
      id: 'res-2',
      title: 'RFQ Response Template Pack',
      description: 'Professional templates for responding to RFQs, including executive summaries and pricing sheets',
      category: 'procurement',
      type: 'template',
      fileUrl: '/templates/rfq-pack.zip',
      authorId: 'mentor-1',
      authorName: 'Lisa White Feather',
      createdAt: '2024-01-10',
      updatedAt: '2024-01-10',
      tags: ['templates', 'rfq', 'procurement'],
      views: 1893,
      downloads: 423,
      ratings: [
        { userId: '3', rating: 5, helpful: 67, date: '2024-01-11' }
      ],
      isOfficial: false,
      isFeatured: true,
      relatedResources: ['res-1'],
      estimatedTime: '10 minutes'
    },
    {
      id: 'res-3',
      title: 'Financial Planning for Indigenous Businesses',
      description: 'Comprehensive video course on financial management, cash flow, and growth planning',
      category: 'financial',
      type: 'video',
      videoUrl: 'https://example.com/video',
      authorId: 'mentor-3',
      authorName: 'Sarah Cardinal',
      createdAt: '2024-01-08',
      updatedAt: '2024-01-08',
      tags: ['finance', 'planning', 'video', 'course'],
      views: 1234,
      downloads: 0,
      ratings: [
        { userId: '4', rating: 5, helpful: 89, date: '2024-01-09' }
      ],
      isOfficial: false,
      isFeatured: false,
      relatedResources: ['res-4'],
      estimatedTime: '2.5 hours',
      prerequisites: ['Basic accounting knowledge']
    },
    {
      id: 'res-4',
      title: 'Grant Writing Masterclass',
      description: 'Learn how to write winning grant proposals for Indigenous business programs',
      category: 'financial',
      type: 'course',
      content: 'Course content...',
      authorId: 'platform',
      authorName: 'Platform Team',
      createdAt: '2024-01-05',
      updatedAt: '2024-01-05',
      tags: ['grants', 'funding', 'writing'],
      views: 987,
      downloads: 234,
      ratings: [],
      isOfficial: true,
      isFeatured: false,
      relatedResources: ['res-3'],
      estimatedTime: '4 hours'
    }
  ]

  const categoryInfo: Record<ResourceCategory, { name: string; icon: any; color: string }> = {
    procurement: { name: 'Procurement', icon: FileCheck, color: 'blue' },
    business_development: { name: 'Business Development', icon: TrendingUp, color: 'emerald' },
    financial: { name: 'Financial', icon: Award, color: 'amber' },
    legal: { name: 'Legal', icon: FileText, color: 'purple' },
    marketing: { name: 'Marketing', icon: Lightbulb, color: 'pink' },
    technology: { name: 'Technology', icon: BookOpen, color: 'indigo' },
    cultural: { name: 'Cultural', icon: Users, color: 'orange' },
    certification: { name: 'Certification', icon: CheckCircle, color: 'teal' }
  }

  const typeInfo: Record<ResourceType, { name: string; icon: any }> = {
    guide: { name: 'Guide', icon: BookOpen },
    template: { name: 'Template', icon: FileText },
    video: { name: 'Video', icon: Video },
    webinar: { name: 'Webinar', icon: PlayCircle },
    checklist: { name: 'Checklist', icon: FileCheck },
    case_study: { name: 'Case Study', icon: Users },
    tool: { name: 'Tool', icon: Lightbulb },
    course: { name: 'Course', icon: Award }
  }

  const filteredResources = resources.filter(resource => {
    if (selectedCategory !== 'all' && resource.category !== selectedCategory) return false
    if (selectedType !== 'all' && resource.type !== selectedType) return false
    if (searchTerm && !resource.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !resource.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false
    }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.views - a.views
      case 'rating':
        const avgA = a.ratings.length ? a.ratings.reduce((sum, r) => sum + r.rating, 0) / a.ratings.length : 0
        const avgB = b.ratings.length ? b.ratings.reduce((sum, r) => sum + r.rating, 0) / b.ratings.length : 0
        return avgB - avgA
      default: // recent
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const getAverageRating = (ratings: unknown[]) => {
    if (!ratings.length) return 0
    return (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/20 to-blue-500/20 backdrop-blur-md 
        border border-indigo-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Knowledge Base</h2>
            <p className="text-white/70">
              Resources, guides, and tools to help you succeed
            </p>
          </div>
          
          <button className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 
            border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors 
            flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Contribute Resource</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{resources.length}</p>
          <p className="text-white/60 text-sm">Total Resources</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-emerald-300">+23%</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {resources.reduce((sum, r) => sum + r.views, 0).toLocaleString()}
          </p>
          <p className="text-white/60 text-sm">Total Views</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <Clock className="w-4 h-4 text-white/40" />
          </div>
          <p className="text-2xl font-bold text-white">
            {resources.reduce((sum, r) => sum + r.downloads, 0).toLocaleString()}
          </p>
          <p className="text-white/60 text-sm">Downloads</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">4.7</p>
          <p className="text-white/60 text-sm">Avg Rating</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resources..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 
                rounded-lg text-white placeholder-white/50 focus:outline-none 
                focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as unknown)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all" className="bg-gray-800">All Categories</option>
            {Object.entries(categoryInfo).map(([key, info]) => (
              <option key={key} value={key} className="bg-gray-800">{info.name}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as unknown)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all" className="bg-gray-800">All Types</option>
            {Object.entries(typeInfo).map(([key, info]) => (
              <option key={key} value={key} className="bg-gray-800">{info.name}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as unknown)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="recent" className="bg-gray-800">Most Recent</option>
            <option value="popular" className="bg-gray-800">Most Popular</option>
            <option value="rating" className="bg-gray-800">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Category Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Object.entries(categoryInfo).map(([key, info]) => {
          const Icon = info.icon
          const isActive = selectedCategory === key
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as ResourceCategory)}
              className={`p-3 rounded-lg border transition-all ${
                isActive
                  ? `bg-${info.color}-500/20 border-${info.color}-400/50`
                  : 'bg-white/10 border-white/20 hover:bg-white/15'
              }`}
            >
              <Icon className={`w-5 h-5 text-${info.color}-400 mx-auto mb-1`} />
              <p className="text-white text-xs">{info.name}</p>
            </button>
          )
        })}
      </div>

      {/* Featured Resources */}
      {filteredResources.filter(r => r.isFeatured).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span>Featured Resources</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredResources.filter(r => r.isFeatured).map((resource) => {
              const TypeIcon = typeInfo[resource.type].icon
              const avgRating = getAverageRating(resource.ratings)
              
              return (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-md 
                    border border-amber-400/30 rounded-xl p-6 hover:from-amber-500/15 
                    hover:to-orange-500/15 transition-all cursor-pointer"
                  onClick={() => setSelectedResource(resource)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 bg-${categoryInfo[resource.category].color}-500/20 rounded-lg`}>
                        <TypeIcon className={`w-6 h-6 text-${categoryInfo[resource.category].color}-400`} />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{resource.title}</h4>
                        {resource.isOfficial && (
                          <span className="inline-flex items-center space-x-1 text-xs text-amber-300 mt-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Official Resource</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-white text-sm">{avgRating || 'New'}</span>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm mb-3">{resource.description}</p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-3 text-white/60">
                      <span className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{resource.views.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{resource.estimatedTime}</span>
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.filter(r => !r.isFeatured).map((resource, index) => {
          const TypeIcon = typeInfo[resource.type].icon
          const CategoryIcon = categoryInfo[resource.category].icon
          const avgRating = getAverageRating(resource.ratings)
          const categoryColor = categoryInfo[resource.category].color
          
          return (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5
                hover:bg-white/15 transition-all cursor-pointer"
              onClick={() => setSelectedResource(resource)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 bg-${categoryColor}-500/20 rounded`}>
                    <TypeIcon className={`w-4 h-4 text-${categoryColor}-400`} />
                  </div>
                  <span className={`text-xs text-${categoryColor}-300`}>
                    {typeInfo[resource.type].name}
                  </span>
                </div>
                
                {avgRating > 0 && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-white text-xs">{avgRating}</span>
                  </div>
                )}
              </div>

              <h4 className="text-white font-medium mb-2 line-clamp-2">{resource.title}</h4>
              <p className="text-white/60 text-sm mb-3 line-clamp-2">{resource.description}</p>

              <div className="flex items-center justify-between text-xs text-white/50">
                <span>by {resource.authorName}</span>
                <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center space-x-2 mt-3">
                {resource.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {resource.tags.length > 2 && (
                  <span className="text-white/50 text-xs">+{resource.tags.length - 2}</span>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center space-x-3 text-xs text-white/60">
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>{resource.views}</span>
                  </span>
                  {resource.downloads > 0 && (
                    <span className="flex items-center space-x-1">
                      <Download className="w-3 h-3" />
                      <span>{resource.downloads}</span>
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/60">{resource.estimatedTime}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Resource Detail Modal */}
      <AnimatePresence>
        {selectedResource && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedResource(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-3 py-1 bg-${categoryInfo[selectedResource.category].color}-500/20 
                      text-${categoryInfo[selectedResource.category].color}-300 text-sm rounded-full`}>
                      {categoryInfo[selectedResource.category].name}
                    </span>
                    <span className="px-3 py-1 bg-white/10 text-white/70 text-sm rounded-full">
                      {typeInfo[selectedResource.type].name}
                    </span>
                    {selectedResource.isOfficial && (
                      <span className="inline-flex items-center space-x-1 text-sm text-amber-300">
                        <CheckCircle className="w-4 h-4" />
                        <span>Official</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    {selectedResource.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-white/60">
                    <span>by {selectedResource.authorName}</span>
                    <span>•</span>
                    <span>{new Date(selectedResource.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{selectedResource.estimatedTime}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedResource(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white/60 rotate-90" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-white/80">{selectedResource.description}</p>

                {selectedResource.prerequisites && (
                  <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-4">
                    <h4 className="text-amber-300 font-medium mb-2 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Prerequisites</span>
                    </h4>
                    <ul className="space-y-1">
                      {selectedResource.prerequisites.map((prereq, i) => (
                        <li key={i} className="text-white/80 text-sm flex items-start space-x-2">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>{prereq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <Eye className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">{selectedResource.views.toLocaleString()}</p>
                    <p className="text-white/60 text-sm">Views</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <Download className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">{selectedResource.downloads.toLocaleString()}</p>
                    <p className="text-white/60 text-sm">Downloads</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <Star className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">
                      {getAverageRating(selectedResource.ratings) || 'N/A'}
                    </p>
                    <p className="text-white/60 text-sm">Rating</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedResource.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center space-x-3">
                    <button className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 
                      border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors
                      flex items-center space-x-2">
                      {selectedResource.type === 'video' ? (
                        <>
                          <PlayCircle className="w-4 h-4" />
                          <span>Watch Video</span>
                        </>
                      ) : selectedResource.fileUrl ? (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4" />
                          <span>Read More</span>
                        </>
                      )}
                    </button>

                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Bookmark className="w-5 h-5 text-white/60" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Share className="w-5 h-5 text-white/60" />
                    </button>
                  </div>

                  <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                    border-white/20 rounded-lg text-white transition-colors
                    flex items-center space-x-2">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Rate Resource</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}