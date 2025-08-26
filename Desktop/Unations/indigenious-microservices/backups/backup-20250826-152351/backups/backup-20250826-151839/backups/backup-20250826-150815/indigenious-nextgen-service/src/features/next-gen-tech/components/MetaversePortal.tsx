// Metaverse Portal Component
// Virtual worlds for trade shows, meetings, and networking

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Users, Building, Calendar, ShoppingBag, Mic,
  Video, VolumeX, Volume2, Settings, Map, Navigation,
  Star, TrendingUp, Clock, Eye, Play, Gamepad2,
  Sparkles, Award, MessageSquare, Share, ChevronRight
} from 'lucide-react'
import { MetaverseSpace, SpaceFeature, MetaverseVisitor } from '../types/nextgen.types'

interface VirtualEvent {
  id: string
  name: string
  type: 'trade-show' | 'conference' | 'networking' | 'workshop'
  date: string
  attendees: number
  maxCapacity: number
  host: string
  description: string
  features: string[]
  status: 'upcoming' | 'live' | 'past'
}

export function MetaversePortal() {
  const [activeTab, setActiveTab] = useState<'worlds' | 'events' | 'my-spaces' | 'create'>('worlds')
  const [selectedSpace, setSelectedSpace] = useState<MetaverseSpace | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<VirtualEvent | null>(null)
  const [isInWorld, setIsInWorld] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)

  // Mock metaverse spaces
  const metaverseSpaces: MetaverseSpace[] = [
    {
      id: 'space-1',
      name: 'Indigenous Business Expo',
      type: 'exhibition',
      world: 'Business District',
      coordinates: { x: 100, y: 0, z: 200 },
      capacity: 500,
      visitors: [
        {
          id: 'visitor-1',
          avatar: 'avatar-1',
          wallet: '0x123...456',
          joinedAt: new Date().toISOString(),
          interactions: 23,
          purchases: 2
        }
      ],
      features: [
        {
          type: 'vendor',
          location: { x: 10, y: 0, z: 20 },
          configuration: { boothSize: 'large', products: 15 }
        },
        {
          type: 'stage',
          location: { x: 0, y: 0, z: 50 },
          configuration: { seats: 100, screens: 3 }
        }
      ],
      economy: {
        currency: 'INDIG',
        totalSales: 125000,
        averageTransaction: 250,
        topProducts: ['Art NFTs', 'Crafts', 'Services'],
        conversionRate: 15.5
      }
    },
    {
      id: 'space-2',
      name: 'Cultural Heritage Museum',
      type: 'gallery',
      world: 'Heritage Quarter',
      coordinates: { x: -200, y: 0, z: 100 },
      capacity: 200,
      visitors: [],
      features: [
        {
          type: 'gallery',
          location: { x: 0, y: 0, z: 0 },
          configuration: { exhibits: 50, interactive: true }
        }
      ],
      economy: {
        currency: 'INDIG',
        totalSales: 0,
        averageTransaction: 0,
        topProducts: [],
        conversionRate: 0
      }
    },
    {
      id: 'space-3',
      name: 'Networking Lounge',
      type: 'social',
      world: 'Community Hub',
      coordinates: { x: 0, y: 50, z: 0 },
      capacity: 50,
      visitors: [],
      features: [
        {
          type: 'portal',
          location: { x: 0, y: 0, z: -10 },
          configuration: { destination: 'Business District' }
        }
      ],
      economy: {
        currency: 'INDIG',
        totalSales: 0,
        averageTransaction: 0,
        topProducts: [],
        conversionRate: 0
      }
    }
  ]

  // Mock virtual events
  const virtualEvents: VirtualEvent[] = [
    {
      id: 'event-1',
      name: 'Indigenous Tech Summit 2024',
      type: 'conference',
      date: '2024-02-15T14:00:00Z',
      attendees: 234,
      maxCapacity: 500,
      host: 'Indigenous Innovation Network',
      description: 'Annual gathering of Indigenous tech entrepreneurs and innovators',
      features: ['Keynote speakers', '3D product demos', 'Networking rooms', 'Virtual booths'],
      status: 'upcoming'
    },
    {
      id: 'event-2',
      name: 'Weekly Business Mixer',
      type: 'networking',
      date: '2024-01-20T18:00:00Z',
      attendees: 45,
      maxCapacity: 100,
      host: 'Community Leaders',
      description: 'Casual networking event for Indigenous business owners',
      features: ['Speed networking', 'Virtual coffee chat', 'Business card exchange'],
      status: 'live'
    },
    {
      id: 'event-3',
      name: 'Procurement Workshop',
      type: 'workshop',
      date: '2024-01-18T15:00:00Z',
      attendees: 89,
      maxCapacity: 100,
      host: 'CCAB',
      description: 'Learn how to win government contracts in the metaverse',
      features: ['Interactive tutorials', 'Q&A with experts', 'Resource library'],
      status: 'past'
    }
  ]

  const enterMetaverse = (space: MetaverseSpace) => {
    setSelectedSpace(space)
    setIsInWorld(true)
    // In production, this would launch the actual metaverse client
  }

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'emerald'
      case 'upcoming': return 'blue'
      case 'past': return 'gray'
      default: return 'gray'
    }
  }

  const getSpaceTypeIcon = (type: string) => {
    switch (type) {
      case 'storefront': return ShoppingBag
      case 'exhibition': return Building
      case 'meeting': return Users
      case 'social': return MessageSquare
      default: return Globe
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-md 
        border border-indigo-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl">
              <Globe className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Metaverse Portal</h2>
              <p className="text-white/70">Virtual worlds for Indigenous business</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 
              border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors
              flex items-center space-x-2">
              <Gamepad2 className="w-4 h-4" />
              <span>Launch Metaverse</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span className="text-xs text-emerald-300">Live</span>
          </div>
          <p className="text-2xl font-bold text-white">342</p>
          <p className="text-white/60 text-sm">Users Online</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Building className="w-5 h-5 text-purple-400" />
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">28</p>
          <p className="text-white/60 text-sm">Active Spaces</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <Clock className="w-4 h-4 text-white/40" />
          </div>
          <p className="text-2xl font-bold text-white">12</p>
          <p className="text-white/60 text-sm">Events Today</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span className="text-xs text-emerald-300">+15%</span>
          </div>
          <p className="text-2xl font-bold text-white">$45K</p>
          <p className="text-white/60 text-sm">Daily Sales</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
        {(['worlds', 'events', 'my-spaces', 'create'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium capitalize 
              transition-all ${
                activeTab === tab
                  ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {tab === 'my-spaces' ? 'My Spaces' : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'worlds' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* World Map */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Map className="w-5 h-5 text-indigo-400" />
                  <span>Metaverse Map</span>
                </h3>
                <button className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 
                  border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors
                  flex items-center space-x-2 text-sm">
                  <Navigation className="w-3 h-3" />
                  <span>Navigate</span>
                </button>
              </div>

              {/* Map Placeholder */}
              <div className="relative h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 
                rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Globe className="w-32 h-32 text-indigo-400/20" />
                </div>
                
                {/* Space Markers */}
                {metaverseSpaces.map((space, index) => (
                  <div
                    key={space.id}
                    className="absolute animate-pulse"
                    style={{
                      left: `${30 + index * 25}%`,
                      top: `${40 + index * 10}%`
                    }}
                  >
                    <div className="relative group">
                      <div className="w-3 h-3 bg-indigo-400 rounded-full" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                        opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded 
                          whitespace-nowrap">
                          {space.name}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spaces Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metaverseSpaces.map((space, index) => {
                const Icon = getSpaceTypeIcon(space.type)
                
                return (
                  <motion.div
                    key={space.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                      hover:bg-white/15 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                          <Icon className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">{space.name}</h4>
                          <p className="text-white/60 text-sm capitalize">{space.type}</p>
                        </div>
                      </div>
                      
                      {space.visitors.length > 0 && (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 
                          rounded-full text-xs flex items-center space-x-1">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          <span>{space.visitors.length} live</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">World</span>
                        <span className="text-white">{space.world}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Capacity</span>
                        <span className="text-white">
                          {space.visitors.length}/{space.capacity}
                        </span>
                      </div>
                      {space.economy.totalSales > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/60">Sales Today</span>
                          <span className="text-emerald-300">
                            ${space.economy.totalSales.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {space.features.slice(0, 3).map((feature, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 
                          text-xs rounded-full capitalize">
                          {feature.type}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => enterMetaverse(space)}
                      className="w-full px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 
                        border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors
                        flex items-center justify-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Enter World</span>
                    </button>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'events' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {virtualEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                  hover:bg-white/15 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{event.name}</h3>
                      <span className={`px-2 py-1 bg-${getEventStatusColor(event.status)}-500/20 
                        text-${getEventStatusColor(event.status)}-300 rounded-full text-xs capitalize`}>
                        {event.status}
                      </span>
                    </div>
                    
                    <p className="text-white/60 mb-3">{event.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center space-x-1 text-white/60">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-white/60">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(event.date).toLocaleTimeString()}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-white/60">
                        <Users className="w-4 h-4" />
                        <span>{event.attendees}/{event.maxCapacity}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-white/60">
                        <Building className="w-4 h-4" />
                        <span>{event.host}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {event.features.map((feature, i) => (
                        <span key={i} className="px-2 py-1 bg-white/10 text-white/70 
                          text-xs rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="ml-4 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 
                      border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors
                      flex items-center space-x-2"
                  >
                    {event.status === 'live' ? (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Join Now</span>
                      </>
                    ) : event.status === 'upcoming' ? (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>Register</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'my-spaces' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 
              backdrop-blur-md border border-purple-400/30 rounded-xl p-8 text-center">
              <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Create Your Virtual Space</h3>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                Build your own storefront, showroom, or meeting space in the metaverse
              </p>
              <button className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 
                border border-purple-400/50 rounded-lg text-purple-200 transition-colors">
                Get Started
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                text-center">
                <ShoppingBag className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h4 className="text-white font-semibold mb-2">Virtual Storefront</h4>
                <p className="text-white/60 text-sm">
                  Showcase products in 3D with instant checkout
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                text-center">
                <Building className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <h4 className="text-white font-semibold mb-2">Exhibition Hall</h4>
                <p className="text-white/60 text-sm">
                  Host trade shows and product launches
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                text-center">
                <Users className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-white font-semibold mb-2">Meeting Rooms</h4>
                <p className="text-white/60 text-sm">
                  Private spaces for business meetings
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-World Overlay */}
      <AnimatePresence>
        {isInWorld && selectedSpace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-500 
                  rounded-full flex items-center justify-center mb-6 mx-auto"
              >
                <Globe className="w-16 h-16 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Entering {selectedSpace.name}
              </h3>
              <p className="text-white/60 mb-6">Loading metaverse client...</p>
              
              <button
                onClick={() => setIsInWorld(false)}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 
                  border border-white/20 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}