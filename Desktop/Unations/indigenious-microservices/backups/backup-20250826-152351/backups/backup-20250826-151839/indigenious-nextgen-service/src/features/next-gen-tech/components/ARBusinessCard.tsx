// AR Business Card Component
// Augmented reality business profiles with interactive elements

import { useState, useRef } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, Scan, Download, Share, Phone, Mail, Globe,
  Linkedin, MapPin, Award, Users, TrendingUp, Star,
  Play, Pause, Volume2, VolumeX, QrCode, Smartphone,
  Building, Calendar, ChevronRight, Info, CheckCircle
} from 'lucide-react'
import { ARMarker, ARContent } from '../types/nextgen.types'

interface BusinessProfile {
  id: string
  name: string
  company: string
  title: string
  nation: string
  territory: string
  bio: string
  contact: {
    phone: string
    email: string
    website: string
    linkedin?: string
  }
  stats: {
    yearsInBusiness: number
    employees: number
    contractsWon: number
    certifications: string[]
  }
  arContent: {
    logo: string
    video?: string
    model?: string
    culturalStory?: string
  }
}

export function ARBusinessCard() {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedProfile, setScannedProfile] = useState<BusinessProfile | null>(null)
  const [showQRCode, setShowQRCode] = useState(false)
  const [activeView, setActiveView] = useState<'info' | 'stats' | 'story'>('info')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Mock business profiles
  const mockProfiles: BusinessProfile[] = [
    {
      id: 'profile-1',
      name: 'Sarah Cardinal',
      company: 'Cardinal Construction Ltd.',
      title: 'CEO & Founder',
      nation: 'Cree Nation',
      territory: 'Treaty 6',
      bio: 'Leading Indigenous construction company specializing in sustainable infrastructure projects across Western Canada.',
      contact: {
        phone: '+1 (780) 555-0123',
        email: 'sarah@cardinalconstruction.ca',
        website: 'cardinalconstruction.ca',
        linkedin: 'sarah-cardinal'
      },
      stats: {
        yearsInBusiness: 15,
        employees: 45,
        contractsWon: 127,
        certifications: ['ISO 9001', 'Indigenous Business', 'LEED Gold']
      },
      arContent: {
        logo: '/logos/cardinal.png',
        video: '/videos/cardinal-intro.mp4',
        model: '/models/building.glb',
        culturalStory: 'Our company embodies the Eagle teaching - vision and leadership in building for future generations.'
      }
    }
  ]

  // Mock AR marker data
  const arMarkers: ARMarker[] = [
    {
      id: 'marker-1',
      type: 'qr',
      target: 'profile-1',
      content: {
        type: 'info',
        source: '/ar/business-card.json',
        scale: 1,
        offset: { x: 0, y: 0.1, z: 0 },
        animations: [
          {
            name: 'float',
            trigger: 'auto',
            loop: true,
            duration: 3
          }
        ]
      },
      analytics: {
        views: 234,
        interactions: 156,
        averageViewTime: 45,
        conversionRate: 68
      }
    }
  ]

  const startARScan = async () => {
    setIsScanning(true)
    
    // Check for camera permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      
      // Simulate QR code detection after 2 seconds
      setTimeout(() => {
        setScannedProfile(mockProfiles[0])
        setIsScanning(false)
        
        // Stop camera stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }
      }, 2000)
    } catch (error) {
      logger.error('Camera access denied:', error)
      setIsScanning(false)
      alert('Camera access is required for AR features')
    }
  }

  const downloadVCard = () => {
    if (!scannedProfile) return
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${scannedProfile.name}
ORG:${scannedProfile.company}
TITLE:${scannedProfile.title}
TEL:${scannedProfile.contact.phone}
EMAIL:${scannedProfile.contact.email}
URL:${scannedProfile.contact.website}
END:VCARD`
    
    const blob = new Blob([vcard], { type: 'text/vcard' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${scannedProfile.name.replace(' ', '_')}.vcf`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md 
        border border-blue-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Scan className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AR Business Cards</h2>
              <p className="text-white/70">Scan business cards for immersive profiles</p>
            </div>
          </div>

          <button
            onClick={() => setShowQRCode(true)}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
              border border-blue-400/50 rounded-lg text-blue-200 transition-colors
              flex items-center space-x-2"
          >
            <QrCode className="w-4 h-4" />
            <span>My AR Card</span>
          </button>
        </div>
      </div>

      {/* Scanner Interface */}
      {!scannedProfile ? (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
          overflow-hidden" style={{ height: '400px' }}>
          {isScanning ? (
            <div className="relative h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* AR Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-64 h-64 border-2 border-blue-400 rounded-lg animate-pulse" />
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 
                    border-blue-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 
                    border-blue-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 
                    border-blue-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 
                    border-blue-400 rounded-br-lg" />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t 
                from-black/80 to-transparent">
                <p className="text-white text-center">Scanning for AR markers...</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Camera className="w-16 h-16 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Scan AR Business Card
              </h3>
              <p className="text-white/60 mb-6 max-w-md">
                Point your camera at an AR-enabled business card to see interactive 
                3D content and connect instantly
              </p>
              <button
                onClick={startARScan}
                className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-400/50 rounded-lg text-blue-200 transition-colors
                  flex items-center space-x-2"
              >
                <Scan className="w-5 h-5" />
                <span>Start Scanning</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        // Scanned Profile View
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden"
        >
          {/* AR Preview */}
          <div className="relative h-64 bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <div className="absolute inset-0 flex items-center justify-center">
              <Building className="w-32 h-32 text-blue-400/30" />
            </div>
            
            {/* Profile Avatar */}
            <div className="absolute bottom-4 left-4 flex items-end space-x-4">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 
                rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {scannedProfile.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="pb-2">
                <h3 className="text-xl font-semibold text-white">{scannedProfile.name}</h3>
                <p className="text-white/80">{scannedProfile.title}</p>
                <p className="text-white/60 text-sm">{scannedProfile.company}</p>
              </div>
            </div>

            {/* AR Indicators */}
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full 
                text-sm flex items-center space-x-1">
                <CheckCircle className="w-4 h-4" />
                <span>Verified</span>
              </span>
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full 
                text-sm flex items-center space-x-1">
                <Award className="w-4 h-4" />
                <span>Indigenous Owned</span>
              </span>
            </div>
          </div>

          {/* Profile Navigation */}
          <div className="flex items-center bg-white/5 p-1">
            {(['info', 'stats', 'story'] as const).map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`flex-1 px-4 py-2 font-medium capitalize transition-all ${
                  activeView === view
                    ? 'bg-blue-500/20 text-blue-200 border-b-2 border-blue-400'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {view === 'info' && 'Contact Info'}
                {view === 'stats' && 'Business Stats'}
                {view === 'story' && 'Cultural Story'}
              </button>
            ))}
          </div>

          {/* Profile Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeView === 'info' && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <p className="text-white/80">{scannedProfile.bio}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a
                      href={`tel:${scannedProfile.contact.phone}`}
                      className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg 
                        hover:bg-white/10 transition-colors"
                    >
                      <Phone className="w-5 h-5 text-blue-400" />
                      <span className="text-white">{scannedProfile.contact.phone}</span>
                    </a>
                    
                    <a
                      href={`mailto:${scannedProfile.contact.email}`}
                      className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg 
                        hover:bg-white/10 transition-colors"
                    >
                      <Mail className="w-5 h-5 text-blue-400" />
                      <span className="text-white">{scannedProfile.contact.email}</span>
                    </a>
                    
                    <a
                      href={`https://${scannedProfile.contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg 
                        hover:bg-white/10 transition-colors"
                    >
                      <Globe className="w-5 h-5 text-blue-400" />
                      <span className="text-white">{scannedProfile.contact.website}</span>
                    </a>
                    
                    {scannedProfile.contact.linkedin && (
                      <a
                        href={`https://linkedin.com/in/${scannedProfile.contact.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg 
                          hover:bg-white/10 transition-colors"
                      >
                        <Linkedin className="w-5 h-5 text-blue-400" />
                        <span className="text-white">LinkedIn Profile</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 pt-4">
                    <button
                      onClick={downloadVCard}
                      className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                        border border-blue-400/50 rounded-lg text-blue-200 transition-colors
                        flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Save Contact</span>
                    </button>
                    <button className="flex-1 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                      border border-emerald-400/50 rounded-lg text-emerald-200 transition-colors
                      flex items-center justify-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Connect</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {activeView === 'stats' && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">
                        {scannedProfile.stats.yearsInBusiness}
                      </p>
                      <p className="text-white/60 text-sm">Years in Business</p>
                    </div>
                    
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <Users className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">
                        {scannedProfile.stats.employees}
                      </p>
                      <p className="text-white/60 text-sm">Employees</p>
                    </div>
                    
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">
                        {scannedProfile.stats.contractsWon}
                      </p>
                      <p className="text-white/60 text-sm">Contracts Won</p>
                    </div>
                    
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <Award className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">
                        {scannedProfile.stats.certifications.length}
                      </p>
                      <p className="text-white/60 text-sm">Certifications</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3">Certifications</h4>
                    <div className="flex flex-wrap gap-2">
                      {scannedProfile.stats.certifications.map((cert, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-sm"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3">Business Location</h4>
                    <div className="flex items-center space-x-2 text-white/80">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <span>{scannedProfile.nation} • {scannedProfile.territory}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === 'story' && (
                <motion.div
                  key="story"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 
                    backdrop-blur-md border border-purple-400/30 rounded-lg p-4">
                    <p className="text-white/90 italic">
                      "{scannedProfile.arContent.culturalStory}"
                    </p>
                  </div>

                  {scannedProfile.arContent.video && (
                    <div>
                      <h4 className="text-white font-medium mb-3">Company Story</h4>
                      <div className="relative bg-black/50 rounded-lg overflow-hidden" 
                        style={{ paddingBottom: '56.25%' }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-16 h-16 text-white/50" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3 
                          bg-gradient-to-t from-black/80 to-transparent">
                          <div className="flex items-center justify-between">
                            <button className="p-2 bg-white/10 hover:bg-white/20 
                              rounded-lg transition-colors">
                              <Play className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={() => setAudioEnabled(!audioEnabled)}
                              className="p-2 bg-white/10 hover:bg-white/20 
                                rounded-lg transition-colors"
                            >
                              {audioEnabled ? (
                                <Volume2 className="w-4 h-4 text-white" />
                              ) : (
                                <VolumeX className="w-4 h-4 text-white" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* AR Features Info */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">AR Features</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center 
              justify-center mx-auto mb-3">
              <Camera className="w-6 h-6 text-blue-400" />
            </div>
            <h4 className="text-white font-medium mb-1">3D Models</h4>
            <p className="text-white/60 text-sm">
              View products and projects in augmented reality
            </p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center 
              justify-center mx-auto mb-3">
              <Play className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="text-white font-medium mb-1">Video Stories</h4>
            <p className="text-white/60 text-sm">
              Watch company stories and testimonials
            </p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center 
              justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <h4 className="text-white font-medium mb-1">Instant Connect</h4>
            <p className="text-white/60 text-sm">
              Save contacts and connect on social platforms
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQRCode(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Your AR Business Card</h3>
              
              <div className="bg-white p-8 rounded-lg mb-4">
                <div className="w-48 h-48 bg-gray-300 mx-auto" />
              </div>

              <p className="text-white/60 text-center mb-4">
                Share this QR code to let others scan your AR business card
              </p>

              <div className="flex items-center space-x-3">
                <button className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-400/50 rounded-lg text-blue-200 transition-colors
                  flex items-center justify-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 
                  border border-white/20 rounded-lg text-white transition-colors
                  flex items-center justify-center space-x-2">
                  <Share className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}