'use client'

import React, { useState, useEffect, useRef } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { LiquidGlass, LiquidGlassCard, LiquidGlassButton } from '@/components/ui/LiquidGlass'
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  Monitor, Users, MessageSquare, Calendar, Globe,
  Sparkles, Volume2, Subtitles, Record, Hand,
  Sun, Moon, Feather, Heart
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { WebRTCConsultationService } from '../services/webrtc-service'

interface ElderConsultationProps {
  roomId: string
  userId: string
  userName: string
  role: 'elder' | 'business' | 'interpreter'
}

export function ElderConsultation({
  roomId,
  userId,
  userName,
  role
}: ElderConsultationProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false)
  const [ceremonyMode, setCeremonyMode] = useState(false)
  const [speakingRequest, setSpeakingRequest] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null)
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent')
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const webrtcService = useRef<WebRTCConsultationService>()
  const recorder = useRef<MediaRecorder>()

  useEffect(() => {
    // Initialize WebRTC service
    webrtcService.current = new WebRTCConsultationService({
      roomId,
      userId,
      userName,
      role,
      ceremonialProtocols: true
    })

    const service = webrtcService.current

    // Set up event listeners
    service.on('localStream', (stream: MediaStream) => {
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    })

    service.on('remoteStream', ({ participantId, stream }) => {
      setRemoteStreams(prev => new Map(prev).set(participantId, stream))
    })

    service.on('connectionQuality', ({ quality }) => {
      setConnectionQuality(quality)
    })

    service.on('ceremonyMode', ({ enabled }) => {
      setCeremonyMode(enabled)
    })

    service.on('transcription', ({ text, language }) => {
      // Handle transcription display
      logger.info(`[${language}] ${text}`)
    })

    // Start consultation
    service.startConsultation({
      video: true,
      audio: true,
      ceremonialMode: role === 'elder'
    })

    setIsConnected(true)

    return () => {
      service.endConsultation()
    }
  }, [roomId, userId, userName, role])

  const toggleVideo = () => {
    webrtcService.current?.toggleVideo()
    setVideoEnabled(!videoEnabled)
  }

  const toggleAudio = () => {
    webrtcService.current?.toggleAudio()
    setAudioEnabled(!audioEnabled)
  }

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      await webrtcService.current?.startScreenShare()
      setIsScreenSharing(true)
    } else {
      // Stop screen share
      setIsScreenSharing(false)
    }
  }

  const toggleRecording = async () => {
    if (!isRecording) {
      recorder.current = await webrtcService.current?.startRecording()
      setIsRecording(true)
    } else {
      recorder.current?.stop()
      setIsRecording(false)
    }
  }

  const toggleTranscription = async () => {
    if (!transcriptionEnabled) {
      await webrtcService.current?.enableTranscription(['en', 'cr', 'oj'])
      setTranscriptionEnabled(true)
    } else {
      setTranscriptionEnabled(false)
    }
  }

  const requestToSpeak = async () => {
    setSpeakingRequest(true)
    const approved = await webrtcService.current?.requestSpeakingPermission()
    setSpeakingRequest(false)
    if (approved) {
      setCurrentSpeaker(userId)
    }
  }

  const startCeremony = async (type: 'smudging' | 'prayer') => {
    await webrtcService.current?.enableCeremonyMode({
      type,
      startTime: new Date(),
      duration: type === 'smudging' ? 10 : 5,
      leader: userName
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <LiquidGlass variant="aurora" intensity="medium" className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Elder Consultation Session
              </h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/70">Traditional Knowledge Sharing</span>
                {ceremonyMode && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full flex items-center gap-2">
                    <Feather className="w-3 h-3" />
                    Ceremony in Progress
                  </span>
                )}
              </div>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionQuality === 'excellent' ? 'bg-green-400' :
                connectionQuality === 'good' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-white/70 text-sm">
                {connectionQuality === 'excellent' ? 'Excellent connection' :
                 connectionQuality === 'good' ? 'Good connection' : 'Poor connection'}
              </span>
            </div>
          </div>
        </LiquidGlass>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Video Area */}
          <div className="col-span-9 space-y-4">
            {/* Remote Video - Elder or Main Speaker */}
            <LiquidGlassCard variant="clear" className="relative aspect-video">
              <video
                className="w-full h-full object-cover rounded-lg"
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && remoteStreams.size > 0) {
                    el.srcObject = Array.from(remoteStreams.values())[0]
                  }
                }}
              />
              
              {/* Speaking Indicator */}
              <div className="absolute top-4 left-4">
                <LiquidGlass variant="frost" intensity="light" className="px-3 py-2 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-green-400 animate-pulse" />
                  <span className="text-white text-sm">Elder Mary Speaking</span>
                </LiquidGlass>
              </div>

              {/* Cultural Elements */}
              {ceremonyMode && (
                <div className="absolute top-4 right-4">
                  <LiquidGlass variant="aurora" intensity="light" className="p-3">
                    <Sun className="w-6 h-6 text-yellow-400" />
                  </LiquidGlass>
                </div>
              )}
            </LiquidGlassCard>

            {/* Local Video - Self View */}
            <div className="flex gap-4">
              <LiquidGlass variant="frost" intensity="light" className="relative w-48 aspect-video">
                <video
                  ref={localVideoRef}
                  className="w-full h-full object-cover rounded-lg"
                  autoPlay
                  playsInline
                  muted
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <VideoOff className="w-8 h-8 text-white/50" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 text-xs text-white/70">You</div>
              </LiquidGlass>

              {/* Other Participants */}
              {Array.from(remoteStreams.entries()).slice(1).map(([id, stream]) => (
                <LiquidGlass key={id} variant="frost" intensity="light" className="relative w-48 aspect-video">
                  <video
                    className="w-full h-full object-cover rounded-lg"
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el) el.srcObject = stream
                    }}
                  />
                </LiquidGlass>
              ))}
            </div>

            {/* Controls */}
            <LiquidGlass variant="clear" intensity="light" className="p-4">
              <div className="flex items-center justify-center gap-4">
                {/* Basic Controls */}
                <LiquidGlassButton
                  onClick={toggleAudio}
                  className={`p-4 ${!audioEnabled ? 'bg-red-500/20 border-red-400/50' : ''}`}
                >
                  {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </LiquidGlassButton>

                <LiquidGlassButton
                  onClick={toggleVideo}
                  className={`p-4 ${!videoEnabled ? 'bg-red-500/20 border-red-400/50' : ''}`}
                >
                  {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </LiquidGlassButton>

                <LiquidGlassButton
                  onClick={() => webrtcService.current?.endConsultation()}
                  className="px-6 py-4 bg-red-500/20 border-red-400/50 hover:bg-red-500/30"
                >
                  <PhoneOff className="w-5 h-5 mr-2" />
                  End Call
                </LiquidGlassButton>

                {/* Advanced Features */}
                <div className="h-8 w-px bg-white/20 mx-2" />

                <LiquidGlassButton
                  onClick={toggleScreenShare}
                  className={`p-4 ${isScreenSharing ? 'bg-blue-500/20 border-blue-400/50' : ''}`}
                >
                  <Monitor className="w-5 h-5" />
                </LiquidGlassButton>

                <LiquidGlassButton
                  onClick={toggleTranscription}
                  className={`p-4 ${transcriptionEnabled ? 'bg-purple-500/20 border-purple-400/50' : ''}`}
                >
                  <Subtitles className="w-5 h-5" />
                </LiquidGlassButton>

                <LiquidGlassButton
                  onClick={toggleRecording}
                  className={`p-4 ${isRecording ? 'bg-red-500/20 border-red-400/50 animate-pulse' : ''}`}
                >
                  <Record className="w-5 h-5" />
                </LiquidGlassButton>
              </div>
            </LiquidGlass>
          </div>

          {/* Side Panel */}
          <div className="col-span-3 space-y-4">
            {/* Cultural Protocols */}
            {role === 'elder' && (
              <LiquidGlassCard variant="aurora">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Feather className="w-5 h-5 text-yellow-400" />
                  Ceremony Options
                </h3>
                <div className="space-y-2">
                  <LiquidGlassButton
                    onClick={() => startCeremony('smudging')}
                    className="w-full justify-start"
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Begin Smudging
                  </LiquidGlassButton>
                  <LiquidGlassButton
                    onClick={() => startCeremony('prayer')}
                    className="w-full justify-start"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Opening Prayer
                  </LiquidGlassButton>
                </div>
              </LiquidGlassCard>
            )}

            {/* Speaking Queue */}
            {ceremonyMode && role !== 'elder' && (
              <LiquidGlassCard variant="frost">
                <h3 className="font-semibold text-white mb-4">Speaking Protocol</h3>
                <p className="text-sm text-white/70 mb-4">
                  Please request permission before speaking during ceremony
                </p>
                <LiquidGlassButton
                  onClick={requestToSpeak}
                  disabled={speakingRequest}
                  className="w-full"
                >
                  <Hand className="w-4 h-4 mr-2" />
                  {speakingRequest ? 'Requesting...' : 'Request to Speak'}
                </LiquidGlassButton>
              </LiquidGlassCard>
            )}

            {/* Language Support */}
            <LiquidGlassCard variant="clear">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                Language Support
              </h3>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 text-white/80">
                  <input type="checkbox" className="rounded" defaultChecked />
                  English
                </label>
                <label className="flex items-center gap-2 text-white/80">
                  <input type="checkbox" className="rounded" />
                  ᓀᐦᐃᔭᐍᐏᐣ (Cree)
                </label>
                <label className="flex items-center gap-2 text-white/80">
                  <input type="checkbox" className="rounded" />
                  ᐊᓂᔑᓈᐯᒧᐎᓐ (Ojibwe)
                </label>
              </div>
            </LiquidGlassCard>

            {/* Elder Comfort Settings */}
            <LiquidGlassCard variant="frost">
              <h3 className="font-semibold text-white mb-4">Comfort Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-white/70">Volume Boost</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    defaultValue="100"
                    className="w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/70">Text Size</label>
                  <div className="flex gap-2 mt-1">
                    <button className="text-sm px-2 py-1 bg-white/10 rounded">A</button>
                    <button className="text-base px-2 py-1 bg-white/20 rounded">A</button>
                    <button className="text-lg px-2 py-1 bg-white/10 rounded">A</button>
                  </div>
                </div>
              </div>
            </LiquidGlassCard>

            {/* Session Info */}
            <LiquidGlassCard variant="clear">
              <h3 className="font-semibold text-white mb-4">Session Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Duration</span>
                  <span className="text-white">24:35</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Participants</span>
                  <span className="text-white">4</span>
                </div>
                {isRecording && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Recording</span>
                    <span className="text-red-400 animate-pulse">● Active</span>
                  </div>
                )}
              </div>
            </LiquidGlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}