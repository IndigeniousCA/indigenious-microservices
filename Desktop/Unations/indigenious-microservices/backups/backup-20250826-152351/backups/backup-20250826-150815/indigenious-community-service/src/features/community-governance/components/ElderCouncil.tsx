// Elder Council Component
// Cultural guidance and traditional wisdom interface

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Feather, Calendar, Video, MessageCircle, Book, Shield,
  Heart, Star, Clock, Users, ChevronRight, Info, Phone,
  Globe, Sparkles, Sun, Moon, Cloud, Mountain, Trees,
  Waves, Flame, Wind, Circle
} from 'lucide-react'
import { Elder, CulturalGuidance, CulturalProtocol } from '../types/community.types'

export function ElderCouncil() {
  const [selectedElder, setSelectedElder] = useState<Elder | null>(null)
  const [activeTab, setActiveTab] = useState<'elders' | 'guidance' | 'protocols'>('elders')
  const [showBooking, setShowBooking] = useState(false)

  // Mock Elders
  const elders: Elder[] = [
    {
      id: 'elder-1',
      name: 'Mary Standing Bear',
      nation: 'Cree Nation',
      community: 'James Bay Cree',
      expertise: ['Business Ethics', 'Traditional Governance', 'Conflict Resolution'],
      bio: 'Mary has 40+ years of experience bridging traditional knowledge with modern business practices. Former Chief and successful entrepreneur.',
      photoUrl: '/images/elder1.jpg',
      isActive: true,
      joinedCouncil: '2020-01-15',
      availability: {
        schedule: 'Tuesdays & Thursdays, 10am-2pm EST',
        preferredContact: 'video'
      }
    },
    {
      id: 'elder-2',
      name: 'Robert Eagle Feather',
      nation: 'Mi\'kmaq',
      community: 'Membertou',
      expertise: ['Cultural Protocols', 'Ceremony Integration', 'Language Preservation'],
      bio: 'Robert specializes in helping businesses maintain cultural integrity while growing in the modern economy.',
      photoUrl: '/images/elder2.jpg',
      isActive: true,
      joinedCouncil: '2019-06-20',
      availability: {
        schedule: 'Weekdays, 1pm-5pm AST',
        preferredContact: 'phone'
      }
    },
    {
      id: 'elder-3',
      name: 'Sarah White Cloud',
      nation: 'Anishinaabe',
      community: 'Wikwemikong',
      expertise: ['Women in Business', 'Community Relations', 'Youth Mentorship'],
      bio: 'Sarah brings wisdom from three decades of supporting Indigenous women entrepreneurs.',
      photoUrl: '/images/elder3.jpg',
      isActive: true,
      joinedCouncil: '2021-03-10',
      availability: {
        schedule: 'Monday, Wednesday, Friday mornings',
        preferredContact: 'video'
      }
    }
  ]

  // Mock Cultural Guidance
  const recentGuidance: CulturalGuidance[] = [
    {
      id: 'guide-1',
      topic: 'Incorporating ceremony into business meetings',
      question: 'How can we respectfully open important business meetings with ceremony?',
      guidance: 'Opening with ceremony honors our ancestors and sets the right intention. Consider starting with a smudge, acknowledgment of territory, and brief prayer. Always ensure participants are comfortable and provide alternatives for those who may have different practices.',
      elderId: 'elder-1',
      elderName: 'Mary Standing Bear',
      date: '2024-01-14',
      category: 'ceremony',
      isPublic: true
    },
    {
      id: 'guide-2',
      topic: 'Balancing profit with community benefit',
      question: 'How do we maintain traditional values while pursuing business growth?',
      guidance: 'Remember the Seven Generations principle - every decision should benefit seven generations into the future. Profit is not wrong, but it should flow back to strengthen our communities. Consider implementing a community dividend or mentorship program.',
      elderId: 'elder-2',
      elderName: 'Robert Eagle Feather',
      date: '2024-01-13',
      category: 'business',
      isPublic: true
    }
  ]

  // Mock Protocols
  const protocols: CulturalProtocol[] = [
    {
      id: 'protocol-1',
      title: 'Business Meeting Protocols',
      description: 'Guidelines for conducting culturally appropriate business meetings',
      context: 'When meeting with Indigenous partners or on traditional territories',
      guidelines: [
        'Begin with territorial acknowledgment',
        'Allow for opening prayers or ceremonies if appropriate',
        'Respect speaking order and not interrupting',
        'Consider circular seating arrangements',
        'Allow for consensus-building time'
      ],
      doList: [
        'Ask about preferred protocols in advance',
        'Bring tobacco or appropriate offering',
        'Listen more than you speak',
        'Be patient with decision-making process'
      ],
      dontList: [
        'Rush through agenda items',
        'Interrupt speakers',
        'Make decisions without consensus',
        'Ignore cultural practices'
      ],
      relatedTo: 'meeting'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-md 
        border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Feather className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Elder Council</h2>
              <p className="text-white/70">Traditional wisdom for modern business</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <Circle className="w-6 h-6 text-purple-400/40" />
            <Sun className="w-6 h-6 text-amber-400/40" />
            <Moon className="w-6 h-6 text-blue-400/40" />
            <Mountain className="w-6 h-6 text-emerald-400/40" />
          </div>
        </div>
      </div>

      {/* Wisdom Quote */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-md 
        border border-amber-400/30 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-amber-400 mt-1" />
          <div>
            <p className="text-amber-200 italic">
              "We do not inherit the earth from our ancestors, we borrow it from our children."
            </p>
            <p className="text-amber-300/60 text-sm mt-2">- Seven Generations Principle</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
        {(['elders', 'guidance', 'protocols'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium capitalize 
              transition-all ${
                activeTab === tab
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {tab === 'elders' && 'Meet Our Elders'}
            {tab === 'guidance' && 'Recent Guidance'}
            {tab === 'protocols' && 'Cultural Protocols'}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'elders' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {elders.map((elder, index) => (
              <motion.div
                key={elder.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                  hover:bg-white/15 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 
                    rounded-full flex items-center justify-center">
                    <Feather className="w-8 h-8 text-purple-400" />
                  </div>
                  {elder.isActive && (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs 
                      rounded-full flex items-center space-x-1">
                      <Circle className="w-2 h-2 fill-current" />
                      <span>Available</span>
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-white mb-1">{elder.name}</h3>
                <p className="text-purple-300 text-sm mb-3">
                  {elder.nation} • {elder.community}
                </p>
                
                <p className="text-white/70 text-sm mb-4 line-clamp-3">{elder.bio}</p>

                <div className="space-y-2 mb-4">
                  <p className="text-white/60 text-xs uppercase tracking-wider">Expertise</p>
                  <div className="flex flex-wrap gap-2">
                    {elder.expertise.map(skill => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Availability</span>
                    <span className="text-white/80">{elder.availability.schedule}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Preferred</span>
                    <span className="text-white/80 capitalize flex items-center space-x-1">
                      {elder.availability.preferredContact === 'video' && <Video className="w-3 h-3" />}
                      {elder.availability.preferredContact === 'phone' && <Phone className="w-3 h-3" />}
                      {elder.availability.preferredContact === 'message' && <MessageCircle className="w-3 h-3" />}
                      <span>{elder.availability.preferredContact}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedElder(elder)
                    setShowBooking(true)
                  }}
                  className="w-full mt-4 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                    border border-purple-400/50 rounded-lg text-purple-200 transition-colors
                    flex items-center justify-center space-x-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Session</span>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'guidance' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {recentGuidance.map((guidance, index) => (
              <motion.div
                key={guidance.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{guidance.topic}</h3>
                    <div className="flex items-center space-x-3 text-sm text-white/60">
                      <span className="flex items-center space-x-1">
                        <Feather className="w-3 h-3" />
                        <span>{guidance.elderName}</span>
                      </span>
                      <span>•</span>
                      <span>{new Date(guidance.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="capitalize px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">
                        {guidance.category}
                      </span>
                    </div>
                  </div>

                  <Heart className="w-5 h-5 text-pink-400" />
                </div>

                <div className="bg-white/5 rounded-lg p-4 mb-4">
                  <p className="text-white/60 text-sm mb-2">Question:</p>
                  <p className="text-white/80 italic">{guidance.question}</p>
                </div>

                <p className="text-white/90 leading-relaxed">{guidance.guidance}</p>

                <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-white/10">
                  <button className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors">
                    <Star className="w-4 h-4" />
                    <span className="text-sm">Helpful</span>
                  </button>
                  <button className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm">Discuss</span>
                  </button>
                  <button className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors">
                    <Book className="w-4 h-4" />
                    <span className="text-sm">Save</span>
                  </button>
                </div>
              </motion.div>
            ))}

            <button className="w-full px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 
              border border-purple-400/30 rounded-lg text-purple-200 transition-colors
              flex items-center justify-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Ask the Elders a Question</span>
            </button>
          </motion.div>
        )}

        {activeTab === 'protocols' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {protocols.map((protocol, index) => (
              <motion.div
                key={protocol.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{protocol.title}</h3>
                    <p className="text-white/70">{protocol.description}</p>
                  </div>
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>

                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-4">
                  <p className="text-blue-200 text-sm mb-1">Context:</p>
                  <p className="text-white/80">{protocol.context}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-4">
                    <h4 className="text-emerald-300 font-medium mb-2 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Do</span>
                    </h4>
                    <ul className="space-y-1">
                      {protocol.doList.map((item, i) => (
                        <li key={i} className="text-white/80 text-sm flex items-start space-x-2">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                    <h4 className="text-red-300 font-medium mb-2 flex items-center space-x-2">
                      <X className="w-4 h-4" />
                      <span>Don't</span>
                    </h4>
                    <ul className="space-y-1">
                      {protocol.dontList.map((item, i) => (
                        <li key={i} className="text-white/80 text-sm flex items-start space-x-2">
                          <span className="text-red-400 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-2">Guidelines</h4>
                  <ul className="space-y-1">
                    {protocol.guidelines.map((guideline, i) => (
                      <li key={i} className="text-white/80 text-sm flex items-start space-x-2">
                        <ChevronRight className="w-4 h-4 text-purple-400 mt-0.5" />
                        <span>{guideline}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}

            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-amber-200 font-medium mb-1">Remember</p>
                  <p className="text-amber-100/80 text-sm">
                    These protocols are general guidelines. Always ask about specific protocols 
                    for each Nation and community, as practices vary across different Indigenous peoples.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <AnimatePresence>
        {showBooking && selectedElder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowBooking(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-4">
                Book Session with {selectedElder.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-white/80 text-sm mb-1 block">Purpose of Session</label>
                  <select className="w-full px-3 py-2 bg-white/10 border border-white/20 
                    rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="" className="bg-gray-800">Select a topic</option>
                    <option value="business-ethics" className="bg-gray-800">Business Ethics Guidance</option>
                    <option value="conflict" className="bg-gray-800">Conflict Resolution</option>
                    <option value="ceremony" className="bg-gray-800">Ceremony Integration</option>
                    <option value="general" className="bg-gray-800">General Wisdom</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-1 block">Preferred Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-1 block">Preferred Time</label>
                  <select className="w-full px-3 py-2 bg-white/10 border border-white/20 
                    rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                    <option value="" className="bg-gray-800">Select a time</option>
                    <option value="morning" className="bg-gray-800">Morning (9am-12pm)</option>
                    <option value="afternoon" className="bg-gray-800">Afternoon (12pm-5pm)</option>
                    <option value="evening" className="bg-gray-800">Evening (5pm-8pm)</option>
                  </select>
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-1 block">Brief Description</label>
                  <textarea
                    placeholder="What would you like to discuss?"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-purple-400 resize-none"
                    rows={3}
                  />
                </div>

                <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3">
                  <p className="text-purple-200 text-sm">
                    <strong>Note:</strong> Sessions are typically 30-60 minutes. Please be respectful 
                    of the Elder's time and come prepared with specific questions or topics.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowBooking(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                    border-white/20 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                  border border-purple-400/50 rounded-lg text-purple-200 transition-colors">
                  Request Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}