// Certifications & Awards Component
// Displays vendor certifications, licenses, and awards

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Award, Shield, CheckCircle, XCircle, AlertCircle,
  Calendar, Download, ExternalLink, Plus, Upload,
  Building, Leaf, HardHat, FileCheck, Users, Globe
} from 'lucide-react'
import type { Certification, Award as AwardType, CertificationCategory } from '../types/performance.types'

interface CertificationsAwardsProps {
  certifications: Certification[]
  awards: AwardType[]
  isOwnProfile: boolean
}

export function CertificationsAwards({ 
  certifications, 
  awards,
  isOwnProfile 
}: CertificationsAwardsProps) {
  const [activeTab, setActiveTab] = useState<'certifications' | 'awards'>('certifications')
  const [selectedCategory, setSelectedCategory] = useState<CertificationCategory | 'all'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedCert, setExpandedCert] = useState<string | null>(null)

  // Group certifications by category
  const certificationsByCategory = certifications.reduce((acc, cert) => {
    if (!acc[cert.category]) acc[cert.category] = []
    acc[cert.category].push(cert)
    return acc
  }, {} as Record<CertificationCategory, Certification[]>)

  // Get category icon
  const getCategoryIcon = (category: CertificationCategory) => {
    switch (category) {
      case 'indigenous_business':
        return Users
      case 'quality':
        return FileCheck
      case 'safety':
        return HardHat
      case 'environmental':
        return Leaf
      case 'trade':
        return Building
      case 'professional':
        return Shield
      default:
        return Shield
    }
  }

  // Get category color
  const getCategoryColor = (category: CertificationCategory) => {
    switch (category) {
      case 'indigenous_business':
        return 'purple'
      case 'quality':
        return 'blue'
      case 'safety':
        return 'red'
      case 'environmental':
        return 'emerald'
      case 'trade':
        return 'amber'
      case 'professional':
        return 'indigo'
      default:
        return 'gray'
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-400/30'
      case 'expired':
        return 'text-red-400 bg-red-500/20 border-red-400/30'
      case 'suspended':
        return 'text-amber-400 bg-amber-500/20 border-amber-400/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-400/30'
    }
  }

  // Filter certifications
  const filteredCertifications = selectedCategory === 'all'
    ? certifications
    : certifications.filter(cert => cert.category === selectedCategory)

  // Sort awards by significance and year
  const sortedAwards = [...awards].sort((a, b) => {
    const significanceOrder = { international: 4, national: 3, regional: 2, local: 1 }
    if (a.year !== b.year) return b.year - a.year
    return significanceOrder[b.significance] - significanceOrder[a.significance]
  })

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white/5 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('certifications')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 
            flex items-center justify-center ${
            activeTab === 'certifications'
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Shield className="w-4 h-4 mr-2" />
          Certifications ({certifications.length})
        </button>
        <button
          onClick={() => setActiveTab('awards')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 
            flex items-center justify-center ${
            activeTab === 'awards'
              ? 'bg-white/20 text-white'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Award className="w-4 h-4 mr-2" />
          Awards ({awards.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'certifications' && (
          <motion.div
            key="certifications"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Category Filter */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 overflow-x-auto">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
                      whitespace-nowrap ${
                      selectedCategory === 'all'
                        ? 'bg-white/20 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    All ({certifications.length})
                  </button>
                  {Object.entries(certificationsByCategory).map(([category, certs]) => {
                    const Icon = getCategoryIcon(category as CertificationCategory)
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category as CertificationCategory)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 
                          whitespace-nowrap flex items-center ${
                          selectedCategory === category
                            ? 'bg-white/20 text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {category.replace('_', ' ').toUpperCase()} ({certs.length})
                      </button>
                    )
                  })}
                </div>

                {isOwnProfile && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                      border-blue-400/50 rounded-lg text-blue-100 font-medium 
                      transition-all duration-200 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </motion.button>
                )}
              </div>
            </div>

            {/* Certifications Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCertifications.map((cert, index) => {
                const Icon = getCategoryIcon(cert.category)
                const color = getCategoryColor(cert.category)
                const isExpanded = expandedCert === cert.id
                
                return (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden"
                  >
                    <div 
                      className="p-6 cursor-pointer"
                      onClick={() => setExpandedCert(isExpanded ? null : cert.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 bg-${color}-500/20 rounded-lg`}>
                            <Icon className={`w-6 h-6 text-${color}-400`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{cert.name}</h3>
                            <p className="text-sm text-white/60">{cert.issuingBody}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(cert.status)}`}>
                          {cert.status.toUpperCase()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-white/60">
                            <Calendar className="w-4 h-4" />
                            <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                          </div>
                          {cert.expiryDate && (
                            <div className="flex items-center space-x-1 text-white/60">
                              <AlertCircle className="w-4 h-4" />
                              <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        {cert.verified && (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-white/10"
                        >
                          <div className="p-6 space-y-4">
                            {/* Days until expiry */}
                            {cert.expiryDate && cert.status === 'active' && (
                              <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg">
                                <p className="text-sm text-amber-300">
                                  {Math.ceil((new Date(cert.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days until expiry
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex space-x-3">
                              {cert.documentUrl && (
                                <button className="flex items-center space-x-2 px-3 py-2 bg-white/10 
                                  hover:bg-white/20 border border-white/20 rounded-lg text-white 
                                  text-sm transition-all duration-200">
                                  <Download className="w-4 h-4" />
                                  <span>Download</span>
                                </button>
                              )}
                              <button className="flex items-center space-x-2 px-3 py-2 bg-white/10 
                                hover:bg-white/20 border border-white/20 rounded-lg text-white 
                                text-sm transition-all duration-200">
                                <ExternalLink className="w-4 h-4" />
                                <span>Verify</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>

            {/* Empty State */}
            {filteredCertifications.length === 0 && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
                <Shield className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No certifications in this category</p>
                {isOwnProfile && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
                      border-blue-400/50 rounded-lg text-blue-100 font-medium 
                      transition-all duration-200"
                  >
                    Add Certification
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'awards' && (
          <motion.div
            key="awards"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Awards Timeline */}
            <div className="space-y-4">
              {sortedAwards.map((award, index) => (
                <motion.div
                  key={award.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${
                      award.significance === 'international' 
                        ? 'bg-purple-500/20' 
                        : award.significance === 'national'
                        ? 'bg-blue-500/20'
                        : award.significance === 'regional'
                        ? 'bg-emerald-500/20'
                        : 'bg-amber-500/20'
                    }`}>
                      <Award className={`w-6 h-6 ${
                        award.significance === 'international' 
                          ? 'text-purple-400' 
                          : award.significance === 'national'
                          ? 'text-blue-400'
                          : award.significance === 'regional'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{award.name}</h3>
                          <p className="text-sm text-white/60">{award.issuingOrganization}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">{award.year}</p>
                          <p className="text-xs text-white/60 capitalize">{award.significance}</p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/80">
                          {award.category}
                        </span>
                      </div>
                      
                      <p className="text-white/80">{award.description}</p>
                      
                      {/* Significance Badge */}
                      <div className="mt-4 flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-white/40" />
                        <span className="text-sm text-white/60">
                          {award.significance === 'international' && 'Recognized internationally'}
                          {award.significance === 'national' && 'National recognition'}
                          {award.significance === 'regional' && 'Regional achievement'}
                          {award.significance === 'local' && 'Local community award'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty State */}
            {awards.length === 0 && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
                <Award className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No awards yet</p>
                {isOwnProfile && (
                  <p className="text-sm text-white/40 mt-2">
                    Awards will appear here when you receive recognition for your work
                  </p>
                )}
              </div>
            )}

            {/* Add Award Button */}
            {isOwnProfile && awards.length > 0 && (
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 
                    rounded-xl text-white font-medium transition-all duration-200 
                    flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Award
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal (placeholder) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-lg w-full"
            >
              <h3 className="text-xl font-semibold text-white mb-4">
                Add {activeTab === 'certifications' ? 'Certification' : 'Award'}
              </h3>
              
              <p className="text-white/60 mb-6">
                Upload documentation to add a new {activeTab === 'certifications' ? 'certification' : 'award'}.
              </p>

              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
                <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">
                  Drag and drop files here or click to browse
                </p>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border 
                    border-white/20 rounded-lg text-white font-medium 
                    transition-all duration-200"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-400/50 rounded-lg text-blue-100 font-medium 
                  transition-all duration-200"
                >
                  Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}