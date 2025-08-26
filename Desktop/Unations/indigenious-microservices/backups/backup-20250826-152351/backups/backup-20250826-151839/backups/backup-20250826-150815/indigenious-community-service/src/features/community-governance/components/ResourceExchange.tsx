// Resource Exchange Component
// Share equipment, skills, spaces, and services within the community

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Handshake, Package, Wrench, Building, Users, Search,
  Filter, Plus, MapPin, Calendar, DollarSign, Clock,
  Star, ChevronRight, Shield, Info, CheckCircle, XCircle,
  Truck, Briefcase, Cpu, Camera, Hammer, Heart, Share
} from 'lucide-react'
import { ResourceSharing, ResourceAvailability, ResourceTerms } from '../types/community.types'

export function ResourceExchange() {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-resources' | 'requests'>('browse')
  const [selectedResource, setSelectedResource] = useState<ResourceSharing | null>(null)
  const [resourceType, setResourceType] = useState<'all' | 'equipment' | 'skill' | 'space' | 'service'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Mock resources
  const resources: ResourceSharing[] = [
    {
      id: 'res-1',
      type: 'equipment',
      title: '3D Printer - Industrial Grade',
      description: 'Markforged X7 3D printer available for prototyping and small production runs',
      category: 'Manufacturing',
      ownerId: 'user-1',
      ownerName: 'TechCraft Solutions',
      availability: {
        status: 'available',
        schedule: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          hours: '9 AM - 5 PM'
        }
      },
      terms: {
        type: 'rental',
        price: 50,
        priceUnit: 'hour',
        deposit: 500,
        conditions: [
          'Must provide own materials',
          'Training required for first-time users',
          'Clean after use'
        ],
        insurance: true,
        delivery: 'pickup'
      },
      images: ['/images/3d-printer.jpg'],
      location: {
        city: 'Toronto',
        province: 'ON',
        radius: 50
      },
      requests: [],
      reviews: [
        {
          userId: 'user-2',
          userName: 'Sarah Johnson',
          rating: 5,
          comment: 'Great equipment, well maintained. Owner very helpful!',
          date: '2024-01-10'
        }
      ]
    },
    {
      id: 'res-2',
      type: 'skill',
      title: 'Grant Writing Expertise',
      description: 'Professional grant writer with 10+ years experience in Indigenous business grants',
      category: 'Business Services',
      ownerId: 'user-3',
      ownerName: 'Mary Cardinal',
      availability: {
        status: 'available',
        schedule: {
          days: ['Flexible'],
          hours: 'By appointment'
        }
      },
      terms: {
        type: 'trade',
        conditions: [
          'Exchange for marketing services preferred',
          'Can also accept hourly rate',
          'Initial consultation free'
        ],
        insurance: false,
        delivery: 'both'
      },
      location: {
        city: 'Winnipeg',
        province: 'MB'
      },
      requests: [
        {
          id: 'req-1',
          requesterId: 'user-4',
          requesterName: 'Northern Lights Co.',
          requestDate: '2024-01-15',
          startDate: '2024-02-01',
          endDate: '2024-02-15',
          purpose: 'Need help with ISET grant application',
          status: 'pending',
          messages: []
        }
      ],
      reviews: []
    },
    {
      id: 'res-3',
      type: 'space',
      title: 'Conference Room - 20 Person Capacity',
      description: 'Modern conference room with AV equipment, perfect for meetings and workshops',
      category: 'Meeting Space',
      ownerId: 'user-5',
      ownerName: 'Indigenous Business Hub',
      availability: {
        status: 'available',
        blackoutDates: ['2024-01-25', '2024-01-26']
      },
      terms: {
        type: 'free',
        conditions: [
          'Indigenous businesses only',
          'Must book 48 hours in advance',
          'Clean up required'
        ],
        insurance: false,
        delivery: 'pickup'
      },
      images: ['/images/conference-room.jpg'],
      location: {
        city: 'Vancouver',
        province: 'BC'
      },
      requests: [],
      reviews: []
    },
    {
      id: 'res-4',
      type: 'service',
      title: 'Photography & Videography',
      description: 'Professional media services for events, products, and marketing',
      category: 'Creative Services',
      ownerId: 'user-6',
      ownerName: 'Eagle Eye Media',
      availability: {
        status: 'available'
      },
      terms: {
        type: 'negotiable',
        price: 150,
        priceUnit: 'hour',
        conditions: [
          'Travel costs extra for locations > 50km',
          '50% deposit required',
          'Rights usage to be discussed'
        ],
        insurance: true,
        delivery: 'delivery'
      },
      location: {
        city: 'Calgary',
        province: 'AB',
        radius: 200
      },
      requests: [],
      reviews: []
    }
  ]

  const resourceIcons = {
    equipment: Wrench,
    skill: Users,
    space: Building,
    service: Briefcase
  }

  const categoryIcons: Record<string, any> = {
    'Manufacturing': Hammer,
    'Business Services': Briefcase,
    'Meeting Space': Building,
    'Creative Services': Camera,
    'Technology': Cpu,
    'Transportation': Truck
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'emerald'
      case 'in_use': return 'amber'
      case 'maintenance': return 'orange'
      default: return 'red'
    }
  }

  const filteredResources = resources.filter(resource => {
    if (resourceType !== 'all' && resource.type !== resourceType) return false
    if (searchTerm && !resource.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !resource.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md 
        border border-orange-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Resource Exchange</h2>
            <p className="text-white/70">
              Share equipment, skills, and services to strengthen our community
            </p>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 
              border border-orange-400/50 rounded-lg text-orange-200 transition-colors 
              flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Share Resource</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-5 h-5 text-orange-400" />
            <span className="text-2xl font-bold text-white">{resources.length}</span>
          </div>
          <p className="text-white/60 text-sm">Available Resources</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Handshake className="w-5 h-5 text-emerald-400" />
            <span className="text-2xl font-bold text-white">234</span>
          </div>
          <p className="text-white/60 text-sm">Successful Shares</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <span className="text-2xl font-bold text-white">$45K</span>
          </div>
          <p className="text-white/60 text-sm">Value Exchanged</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-pink-400" />
            <span className="text-2xl font-bold text-white">98%</span>
          </div>
          <p className="text-white/60 text-sm">Satisfaction Rate</p>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between space-y-3 md:space-y-0">
        <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
          {(['browse', 'my-resources', 'requests'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-orange-500/20 text-orange-200 border border-orange-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
            >
              {tab === 'browse' && 'Browse Resources'}
              {tab === 'my-resources' && 'My Resources'}
              {tab === 'requests' && 'Requests'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resources..."
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value as unknown)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
              text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="all" className="bg-gray-800">All Types</option>
            <option value="equipment" className="bg-gray-800">Equipment</option>
            <option value="skill" className="bg-gray-800">Skills</option>
            <option value="space" className="bg-gray-800">Spaces</option>
            <option value="service" className="bg-gray-800">Services</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'browse' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredResources.map((resource, index) => {
              const TypeIcon = resourceIcons[resource.type]
              const CategoryIcon = categoryIcons[resource.category] || Package
              const statusColor = getStatusColor(resource.availability.status)
              
              return (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                    overflow-hidden hover:bg-white/15 transition-all cursor-pointer"
                  onClick={() => setSelectedResource(resource)}
                >
                  {resource.images && resource.images.length > 0 && (
                    <div className="h-48 bg-gradient-to-br from-orange-500/20 to-red-500/20 
                      flex items-center justify-center">
                      <CategoryIcon className="w-24 h-24 text-orange-400/30" />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-orange-500/20 rounded">
                          <TypeIcon className="w-4 h-4 text-orange-400" />
                        </div>
                        <span className="text-xs text-orange-300 capitalize">{resource.type}</span>
                      </div>
                      
                      <span className={`px-2 py-1 bg-${statusColor}-500/20 text-${statusColor}-300 
                        text-xs rounded-full capitalize`}>
                        {resource.availability.status}
                      </span>
                    </div>

                    <h3 className="text-white font-semibold mb-2">{resource.title}</h3>
                    <p className="text-white/60 text-sm mb-3 line-clamp-2">{resource.description}</p>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">By {resource.ownerName}</span>
                        {resource.reviews.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-white">
                              {(resource.reviews.reduce((sum, r) => sum + r.rating, 0) / resource.reviews.length).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3 text-xs text-white/50">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{resource.location.city}, {resource.location.province}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10">
                      {resource.terms.type === 'free' ? (
                        <span className="text-emerald-300 font-medium">Free</span>
                      ) : resource.terms.type === 'trade' ? (
                        <span className="text-blue-300 font-medium">Trade/Barter</span>
                      ) : resource.terms.type === 'rental' ? (
                        <span className="text-white font-medium">
                          ${resource.terms.price}/{resource.terms.priceUnit}
                        </span>
                      ) : (
                        <span className="text-amber-300 font-medium">Negotiable</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {activeTab === 'my-resources' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-6 text-center">
              <Package className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Share Your Resources</h3>
              <p className="text-white/70 mb-4">
                Help fellow Indigenous businesses by sharing equipment, skills, or services
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 
                  border border-amber-400/50 rounded-lg text-amber-200 transition-colors"
              >
                Add Your First Resource
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-blue-200 font-medium mb-1">Resource Requests</p>
                  <p className="text-blue-100/80 text-sm">
                    View and manage requests for your shared resources here. 
                    Respond promptly to maintain a good community standing.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full capitalize">
                      {selectedResource.type}
                    </span>
                    <span className={`px-3 py-1 bg-${getStatusColor(selectedResource.availability.status)}-500/20 
                      text-${getStatusColor(selectedResource.availability.status)}-300 rounded-full capitalize`}>
                      {selectedResource.availability.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold text-white">{selectedResource.title}</h3>
                  <p className="text-white/60 mt-1">Shared by {selectedResource.ownerName}</p>
                </div>
                
                <button
                  onClick={() => setSelectedResource(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-white/60" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-white/80">{selectedResource.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Availability</h4>
                    {selectedResource.availability.schedule && (
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-white/60">Days</p>
                          <p className="text-white">{selectedResource.availability.schedule.days.join(', ')}</p>
                        </div>
                        <div>
                          <p className="text-white/60">Hours</p>
                          <p className="text-white">{selectedResource.availability.schedule.hours}</p>
                        </div>
                      </div>
                    )}
                    {selectedResource.availability.blackoutDates && (
                      <div className="mt-2">
                        <p className="text-white/60 text-sm">Unavailable Dates</p>
                        <p className="text-white text-sm">
                          {selectedResource.availability.blackoutDates.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Terms</h4>
                    <div className="space-y-2 text-sm">
                      {selectedResource.terms.type === 'free' ? (
                        <p className="text-emerald-300 font-medium text-lg">Free to Use</p>
                      ) : selectedResource.terms.type === 'trade' ? (
                        <p className="text-blue-300 font-medium">Available for Trade/Barter</p>
                      ) : selectedResource.terms.price ? (
                        <div>
                          <p className="text-white text-lg font-medium">
                            ${selectedResource.terms.price} per {selectedResource.terms.priceUnit}
                          </p>
                          {selectedResource.terms.deposit && (
                            <p className="text-white/60">Deposit: ${selectedResource.terms.deposit}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-amber-300 font-medium">Price Negotiable</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-white/60">
                        {selectedResource.terms.insurance && (
                          <span className="flex items-center space-x-1">
                            <Shield className="w-4 h-4" />
                            <span>Insurance required</span>
                          </span>
                        )}
                        <span className="capitalize">{selectedResource.terms.delivery}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Conditions</h4>
                  <ul className="space-y-1">
                    {selectedResource.terms.conditions.map((condition, i) => (
                      <li key={i} className="text-white/80 text-sm flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                        <span>{condition}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Location</h4>
                  <div className="flex items-center space-x-2 text-white/80">
                    <MapPin className="w-4 h-4 text-orange-400" />
                    <span>{selectedResource.location.city}, {selectedResource.location.province}</span>
                    {selectedResource.location.radius && (
                      <span className="text-white/60">
                        • Delivery within {selectedResource.location.radius}km
                      </span>
                    )}
                  </div>
                </div>

                {selectedResource.reviews.length > 0 && (
                  <div>
                    <h4 className="text-white font-medium mb-3">Reviews</h4>
                    <div className="space-y-3">
                      {selectedResource.reviews.map((review, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">{review.userName}</span>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-white/20'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-white/70 text-sm">{review.comment}</p>
                          <p className="text-white/50 text-xs mt-1">
                            {new Date(review.date).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center space-x-3">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Share className="w-5 h-5 text-white/60" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Heart className="w-5 h-5 text-white/60" />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 
                      border border-orange-400/50 rounded-lg text-orange-200 transition-colors"
                  >
                    Request This Resource
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