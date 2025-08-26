// Event Calendar Component
// Community events, workshops, and networking opportunities

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, MapPin, Video, Users, Clock, ChevronRight,
  ChevronLeft, Plus, Filter, Search, Globe, Building,
  Award, GraduationCap, Handshake, Mic, Coffee, Sparkles,
  Bell, Share, Download, CheckCircle, XCircle, Info
} from 'lucide-react'
import { CommunityEvent, EventType, EventRegistration } from '../types/community.types'

export function EventCalendar() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null)
  const [filterType, setFilterType] = useState<EventType | 'all'>('all')
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)

  // Mock events
  const events: CommunityEvent[] = [
    {
      id: 'event-1',
      title: 'Government Procurement Workshop',
      description: 'Learn the fundamentals of responding to government RFQs and winning contracts',
      type: 'workshop',
      format: 'virtual',
      startDate: '2024-01-20T14:00:00Z',
      endDate: '2024-01-20T16:00:00Z',
      timezone: 'EST',
      location: {
        virtualLink: 'https://zoom.us/example'
      },
      organizer: {
        id: 'platform',
        name: 'Indigenious',
        type: 'platform'
      },
      capacity: 100,
      registrations: [
        {
          userId: '1',
          userName: 'John Smith',
          businessName: 'Smith Construction',
          registeredAt: '2024-01-10',
          status: 'registered'
        }
      ],
      agenda: [
        {
          time: '2:00 PM',
          duration: 15,
          title: 'Welcome & Introduction',
          type: 'presentation'
        },
        {
          time: '2:15 PM',
          duration: 45,
          title: 'Understanding Government Procurement',
          type: 'presentation',
          speakers: ['Lisa White Feather']
        },
        {
          time: '3:00 PM',
          duration: 30,
          title: 'Q&A Session',
          type: 'panel'
        },
        {
          time: '3:30 PM',
          duration: 30,
          title: 'Networking',
          type: 'networking'
        }
      ],
      speakers: [
        {
          name: 'Lisa White Feather',
          title: 'CEO',
          organization: 'Indigenous Tech Solutions',
          bio: 'Expert in government procurement with 15+ years experience'
        }
      ]
    },
    {
      id: 'event-2',
      title: 'Indigenous Business Excellence Awards',
      description: 'Annual celebration recognizing outstanding Indigenous businesses',
      type: 'celebration',
      format: 'hybrid',
      startDate: '2024-01-25T18:00:00Z',
      endDate: '2024-01-25T21:00:00Z',
      timezone: 'EST',
      location: {
        venue: 'Four Seasons Hotel',
        address: '60 Yorkville Ave',
        city: 'Toronto',
        province: 'ON',
        virtualLink: 'https://livestream.example.com'
      },
      organizer: {
        id: 'community',
        name: 'Indigenous Business Network',
        type: 'community'
      },
      capacity: 300,
      registrations: [],
      sponsors: ['TD Bank', 'RBC', 'Scotiabank']
    },
    {
      id: 'event-3',
      title: 'Financial Planning for Growth',
      description: 'Master financial management and planning for sustainable business growth',
      type: 'training',
      format: 'virtual',
      startDate: '2024-02-01T13:00:00Z',
      endDate: '2024-02-01T17:00:00Z',
      timezone: 'CST',
      location: {
        virtualLink: 'https://teams.microsoft.com/example'
      },
      organizer: {
        id: 'partner',
        name: 'BDC',
        type: 'partner'
      },
      capacity: 50,
      registrations: []
    }
  ]

  const eventTypeInfo: Record<EventType, { name: string; icon: any; color: string }> = {
    workshop: { name: 'Workshop', icon: GraduationCap, color: 'blue' },
    networking: { name: 'Networking', icon: Handshake, color: 'emerald' },
    training: { name: 'Training', icon: Award, color: 'purple' },
    conference: { name: 'Conference', icon: Mic, color: 'indigo' },
    celebration: { name: 'Celebration', icon: Sparkles, color: 'amber' },
    ceremony: { name: 'Ceremony', icon: Globe, color: 'orange' },
    meetup: { name: 'Meetup', icon: Coffee, color: 'pink' }
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate)
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear()
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const filteredEvents = events.filter(event => {
    if (filterType !== 'all' && event.type !== filterType) return false
    const eventDate = new Date(event.startDate)
    return eventDate.getMonth() === selectedMonth.getMonth() &&
           eventDate.getFullYear() === selectedMonth.getFullYear()
  })

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth)
    const firstDay = getFirstDayOfMonth(selectedMonth)
    const days = []

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day)
      const dayEvents = getEventsForDate(date)
      const isToday = new Date().toDateString() === date.toDateString()

      days.push(
        <motion.div
          key={day}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: day * 0.01 }}
          className={`p-2 border border-white/10 rounded-lg min-h-[100px] 
            hover:bg-white/5 transition-all cursor-pointer ${
            isToday ? 'bg-blue-500/10 border-blue-400/30' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-medium ${
              isToday ? 'text-blue-300' : 'text-white'
            }`}>
              {day}
            </span>
            {dayEvents.length > 0 && (
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
            )}
          </div>
          
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map(event => {
              const typeInfo = eventTypeInfo[event.type]
              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`p-1 bg-${typeInfo.color}-500/20 border border-${typeInfo.color}-400/30 
                    rounded text-xs text-white truncate hover:bg-${typeInfo.color}-500/30 transition-colors`}
                >
                  {event.title}
                </div>
              )
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-white/60">+{dayEvents.length - 2} more</div>
            )}
          </div>
        </motion.div>
      )
    }

    return days
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-md 
        border border-pink-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Community Events</h2>
            <p className="text-white/70">
              Workshops, networking, and celebrations
            </p>
          </div>
          
          <button className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 
            border border-pink-400/50 rounded-lg text-pink-200 transition-colors 
            flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Host Event</span>
          </button>
        </div>
      </div>

      {/* View Toggle and Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between space-y-3 md:space-y-0">
        <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-pink-500/20 text-pink-200 border border-pink-400/30'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-pink-500/20 text-pink-200 border border-pink-400/30'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            List View
          </button>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as unknown)}
          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
            text-white focus:outline-none focus:ring-2 focus:ring-pink-400"
        >
          <option value="all" className="bg-gray-800">All Events</option>
          {Object.entries(eventTypeInfo).map(([key, info]) => (
            <option key={key} value={key} className="bg-gray-800">{info.name}</option>
          ))}
        </select>
      </div>

      {viewMode === 'calendar' ? (
        <>
          {/* Calendar Navigation */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              
              <h3 className="text-xl font-semibold text-white">
                {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-white/60 text-sm font-medium p-2">
                  {day}
                </div>
              ))}
              {renderCalendarDays()}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* List View */}
          <div className="space-y-4">
            {filteredEvents.map((event, index) => {
              const typeInfo = eventTypeInfo[event.type]
              const TypeIcon = typeInfo.icon
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                    hover:bg-white/15 transition-all cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 bg-${typeInfo.color}-500/20 rounded-xl`}>
                        <TypeIcon className={`w-6 h-6 text-${typeInfo.color}-400`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                          <span className={`px-2 py-1 bg-${typeInfo.color}-500/20 
                            text-${typeInfo.color}-300 text-xs rounded-full`}>
                            {typeInfo.name}
                          </span>
                          <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full capitalize">
                            {event.format}
                          </span>
                        </div>
                        
                        <p className="text-white/70 mb-3">{event.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(event.startDate).toLocaleDateString()}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {new Date(event.startDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })} {event.timezone}
                            </span>
                          </span>
                          {event.location.venue ? (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location.city}, {event.location.province}</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1">
                              <Video className="w-4 h-4" />
                              <span>Virtual Event</span>
                            </span>
                          )}
                          {event.capacity && (
                            <span className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>
                                {event.registrations.length}/{event.capacity} registered
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-white/40 ml-4" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      {/* Upcoming Events Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold text-white">
              {events.filter(e => e.type === 'workshop').length}
            </span>
          </div>
          <p className="text-white/60 text-sm">Workshops This Month</p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Handshake className="w-5 h-5 text-emerald-400" />
            <span className="text-2xl font-bold text-white">
              {events.filter(e => e.type === 'networking').length}
            </span>
          </div>
          <p className="text-white/60 text-sm">Networking Events</p>
        </div>

        <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-5 h-5 text-purple-400" />
            <span className="text-2xl font-bold text-white">
              {events.reduce((sum, e) => sum + e.registrations.length, 0)}
            </span>
          </div>
          <p className="text-white/60 text-sm">Total Registrations</p>
        </div>
      </div>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedEvent(null)}
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
                    <span className={`px-3 py-1 bg-${eventTypeInfo[selectedEvent.type].color}-500/20 
                      text-${eventTypeInfo[selectedEvent.type].color}-300 rounded-full`}>
                      {eventTypeInfo[selectedEvent.type].name}
                    </span>
                    <span className="px-3 py-1 bg-white/10 text-white/70 rounded-full capitalize">
                      {selectedEvent.format} Event
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold text-white">{selectedEvent.title}</h3>
                  <p className="text-white/60 mt-1">
                    Organized by {selectedEvent.organizer.name}
                  </p>
                </div>
                
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-white/60" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-white/80">{selectedEvent.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Date & Time</span>
                    </h4>
                    <p className="text-white/80">
                      {new Date(selectedEvent.startDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-white/60 text-sm mt-1">
                      {new Date(selectedEvent.startDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} - {new Date(selectedEvent.endDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} {selectedEvent.timezone}
                    </p>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                      {selectedEvent.location.venue ? <MapPin className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      <span>Location</span>
                    </h4>
                    {selectedEvent.location.venue ? (
                      <>
                        <p className="text-white/80">{selectedEvent.location.venue}</p>
                        <p className="text-white/60 text-sm">
                          {selectedEvent.location.address}<br />
                          {selectedEvent.location.city}, {selectedEvent.location.province}
                        </p>
                      </>
                    ) : (
                      <p className="text-white/80">Virtual Event</p>
                    )}
                  </div>
                </div>

                {selectedEvent.agenda && (
                  <div>
                    <h4 className="text-white font-medium mb-3">Agenda</h4>
                    <div className="space-y-2">
                      {selectedEvent.agenda.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 bg-white/5 rounded-lg"
                        >
                          <span className="text-white/60 text-sm w-20">{item.time}</span>
                          <div className="flex-1">
                            <p className="text-white">{item.title}</p>
                            {item.speakers && (
                              <p className="text-white/60 text-sm">
                                Speakers: {item.speakers.join(', ')}
                              </p>
                            )}
                          </div>
                          <span className="text-white/60 text-sm">{item.duration} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.speakers && (
                  <div>
                    <h4 className="text-white font-medium mb-3">Speakers</h4>
                    <div className="space-y-3">
                      {selectedEvent.speakers.map((speaker, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-500/20 
                            rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-pink-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{speaker.name}</p>
                            <p className="text-white/60 text-sm">
                              {speaker.title} at {speaker.organization}
                            </p>
                            {speaker.bio && (
                              <p className="text-white/70 text-sm mt-1">{speaker.bio}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.capacity && (
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span className="text-white">
                          {selectedEvent.registrations.length} / {selectedEvent.capacity} registered
                        </span>
                      </div>
                      <span className="text-white/60 text-sm">
                        {selectedEvent.capacity - selectedEvent.registrations.length} spots left
                      </span>
                    </div>
                    <div className="mt-2 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-blue-400 transition-all"
                        style={{ 
                          width: `${(selectedEvent.registrations.length / selectedEvent.capacity) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div className="flex items-center space-x-3">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Share className="w-5 h-5 text-white/60" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Download className="w-5 h-5 text-white/60" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Bell className="w-5 h-5 text-white/60" />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowRegistrationModal(true)}
                    className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 
                      border border-pink-400/50 rounded-lg text-pink-200 transition-colors"
                  >
                    Register for Event
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