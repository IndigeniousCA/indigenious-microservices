/**
 * WebRTC Video Consultation Service
 * Enables video calls with Elders for cultural consultations
 * Includes ceremony scheduling and Indigenous language support
 */

import { EventEmitter } from 'events'

export interface VideoConsultationOptions {
  roomId: string
  userId: string
  userName: string
  role: 'elder' | 'business' | 'interpreter'
  language?: string
  ceremonialProtocols?: boolean
}

export interface Participant {
  id: string
  name: string
  role: string
  stream?: MediaStream
  audioEnabled: boolean
  videoEnabled: boolean
  speaking: boolean
  connectionQuality: 'excellent' | 'good' | 'poor'
}

export interface CeremonySchedule {
  type: 'smudging' | 'prayer' | 'consultation' | 'closing'
  startTime: Date
  duration: number
  leader: string
  requirements?: string[]
}

export class WebRTCConsultationService extends EventEmitter {
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private localStream?: MediaStream
  private participants: Map<string, Participant> = new Map()
  private socket?: WebSocket
  private roomId: string
  private userId: string
  private role: string
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
  
  // Audio processing for Elder accessibility
  private audioContext?: AudioContext
  private noiseSuppressionEnabled = true
  private volumeBoostEnabled = false
  
  constructor(options: VideoConsultationOptions) {
    super()
    this.roomId = options.roomId
    this.userId = options.userId
    this.role = options.role
    
    // Initialize WebSocket for signaling
    this.initializeSignaling()
    
    // Set up audio processing
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext()
    }
  }

  /**
   * Initialize WebSocket connection for signaling
   */
  private initializeSignaling() {
    const wsUrl = process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'wss://signal.indigenous-platform.ca'
    this.socket = new WebSocket(wsUrl)
    
    this.socket.onopen = () => {
      // Join room
      this.socket?.send(JSON.stringify({
        type: 'join',
        roomId: this.roomId,
        userId: this.userId,
        role: this.role
      }))
    }
    
    this.socket.onmessage = async (event) => {
      const message = JSON.parse(event.data)
      await this.handleSignalingMessage(message)
    }
    
    this.socket.onerror = (error) => {
      this.emit('error', { type: 'signaling', error })
    }
  }

  /**
   * Start video consultation
   */
  async startConsultation(options: {
    video?: boolean
    audio?: boolean
    ceremonialMode?: boolean
  } = {}) {
    const { video = true, audio = true, ceremonialMode = false } = options
    
    try {
      // Get user media with Elder-friendly settings
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          // Reduce motion for Elder accessibility
          frameRate: ceremonialMode ? { ideal: 15 } : { ideal: 30 }
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: this.noiseSuppressionEnabled,
          autoGainControl: true,
          // Optimize for speech clarity
          sampleRate: 48000,
          channelCount: 2
        } : false
      })
      
      // Apply audio enhancements for Elders
      if (audio && this.role === 'elder') {
        await this.enhanceAudioForElders(this.localStream)
      }
      
      // Emit local stream
      this.emit('localStream', this.localStream)
      
      // Notify others
      this.socket?.send(JSON.stringify({
        type: 'ready',
        userId: this.userId
      }))
      
    } catch (error) {
      this.emit('error', { type: 'media', error })
    }
  }

  /**
   * Create peer connection for a participant
   */
  private async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10
    })
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!)
      })
    }
    
    // Handle incoming streams
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      this.handleRemoteStream(participantId, remoteStream)
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          to: participantId
        }))
      }
    }
    
    // Monitor connection state
    pc.onconnectionstatechange = () => {
      this.updateConnectionQuality(participantId, pc.connectionState)
    }
    
    // Store connection
    this.peerConnections.set(participantId, pc)
    
    return pc
  }

  /**
   * Handle signaling messages
   */
  private async handleSignalingMessage(message: unknown) {
    switch (message.type) {
      case 'participant-joined':
        await this.handleParticipantJoined(message)
        break
        
      case 'offer':
        await this.handleOffer(message)
        break
        
      case 'answer':
        await this.handleAnswer(message)
        break
        
      case 'ice-candidate':
        await this.handleIceCandidate(message)
        break
        
      case 'participant-left':
        this.handleParticipantLeft(message.userId)
        break
        
      case 'ceremony-schedule':
        this.emit('ceremonySchedule', message.schedule)
        break
        
      case 'speaking-indicator':
        this.updateSpeakingIndicator(message.userId, message.speaking)
        break
    }
  }

  /**
   * Audio enhancements for Elder accessibility
   */
  private async enhanceAudioForElders(stream: MediaStream) {
    if (!this.audioContext) return
    
    const source = this.audioContext.createMediaStreamSource(stream)
    const gainNode = this.audioContext.createGain()
    const compressor = this.audioContext.createDynamicsCompressor()
    
    // Compression for consistent volume
    compressor.threshold.value = -20
    compressor.knee.value = 10
    compressor.ratio.value = 5
    compressor.attack.value = 0.003
    compressor.release.value = 0.25
    
    // Volume boost if enabled
    gainNode.gain.value = this.volumeBoostEnabled ? 1.5 : 1.0
    
    // Connect nodes
    source.connect(compressor)
    compressor.connect(gainNode)
    
    // Create new destination
    const destination = this.audioContext.createMediaStreamDestination()
    gainNode.connect(destination)
    
    // Replace audio track
    const videoTrack = stream.getVideoTracks()[0]
    const enhancedAudioTrack = destination.stream.getAudioTracks()[0]
    
    const enhancedStream = new MediaStream()
    if (videoTrack) enhancedStream.addTrack(videoTrack)
    enhancedStream.addTrack(enhancedAudioTrack)
    
    return enhancedStream
  }

  /**
   * Enable ceremony mode with specific protocols
   */
  async enableCeremonyMode(ceremony: CeremonySchedule) {
    // Notify all participants
    this.socket?.send(JSON.stringify({
      type: 'ceremony-start',
      ceremony
    }))
    
    // Adjust video settings for ceremony
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        await videoTrack.applyConstraints({
          frameRate: { ideal: 15 }, // Lower frame rate for stability
          width: { ideal: 640 },
          height: { ideal: 480 }
        })
      }
    }
    
    // Mute all except ceremony leader
    if (this.userId !== ceremony.leader) {
      this.toggleAudio(false)
    }
    
    this.emit('ceremonyMode', { enabled: true, ceremony })
  }

  /**
   * Real-time transcription with Indigenous language support
   */
  async enableTranscription(languages: string[] = ['en', 'cr', 'oj']) {
    if (!('webkitSpeechRecognition' in window)) {
      this.emit('error', { type: 'transcription', error: 'Not supported' })
      return
    }
    
    const recognition = new (window as unknown).webkitSpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3
    
    // Set primary language (with fallbacks)
    recognition.lang = languages[0] === 'cr' ? 'cr-CA' : 
                      languages[0] === 'oj' ? 'oj-CA' : 
                      'en-CA'
    
    recognition.onresult = (event: unknown) => {
      const result = event.results[event.resultIndex]
      const transcript = result[0].transcript
      
      this.emit('transcription', {
        text: transcript,
        isFinal: result.isFinal,
        confidence: result[0].confidence,
        language: recognition.lang
      })
      
      // Send to other participants
      if (result.isFinal) {
        this.socket?.send(JSON.stringify({
          type: 'transcription',
          text: transcript,
          userId: this.userId,
          language: recognition.lang
        }))
      }
    }
    
    recognition.start()
    this.emit('transcriptionStarted', { languages })
  }

  /**
   * Screen sharing for document review
   */
  async startScreenShare(options: {
    audio?: boolean
    preferCurrentTab?: boolean
  } = {}) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: options.preferCurrentTab ? 'browser' : 'monitor'
        },
        audio: options.audio
      })
      
      // Replace video track in all peer connections
      const screenTrack = screenStream.getVideoTracks()[0]
      
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          sender.replaceTrack(screenTrack)
        }
      })
      
      // Handle screen share ending
      screenTrack.onended = () => {
        this.stopScreenShare()
      }
      
      this.emit('screenShareStarted', screenStream)
      
    } catch (error) {
      this.emit('error', { type: 'screenShare', error })
    }
  }

  /**
   * Recording capabilities for meeting minutes
   */
  async startRecording(options: {
    video?: boolean
    audio?: boolean
    format?: 'webm' | 'mp4'
  } = {}) {
    const { video = true, audio = true, format = 'webm' } = options
    
    // Combine all streams
    const streams: MediaStream[] = []
    
    // Add local stream
    if (this.localStream) {
      streams.push(this.localStream)
    }
    
    // Add remote streams
    this.participants.forEach(p => {
      if (p.stream) streams.push(p.stream)
    })
    
    // Create composite stream
    const composite = new MediaStream()
    streams.forEach(stream => {
      stream.getTracks().forEach(track => {
        if ((track.kind === 'video' && video) || 
            (track.kind === 'audio' && audio)) {
          composite.addTrack(track)
        }
      })
    })
    
    // Start recording
    const mimeType = `video/${format};codecs=vp9,opus`
    const recorder = new MediaRecorder(composite, { mimeType })
    
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => chunks.push(e.data)
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      this.emit('recordingComplete', { blob, duration: chunks.length })
    }
    
    recorder.start(1000) // Collect data every second
    this.emit('recordingStarted')
    
    return recorder
  }

  /**
   * Cultural protocol helpers
   */
  async requestSpeakingPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      this.socket?.send(JSON.stringify({
        type: 'speaking-request',
        userId: this.userId
      }))
      
      // Wait for Elder approval
      const handler = (message: unknown) => {
        if (message.type === 'speaking-approved' && 
            message.userId === this.userId) {
          resolve(message.approved)
        }
      }
      
      this.once('speakingResponse', handler)
    })
  }

  /**
   * Connection quality monitoring
   */
  private updateConnectionQuality(
    participantId: string, 
    state: RTCPeerConnectionState
  ) {
    const quality = state === 'connected' ? 'excellent' :
                   state === 'connecting' ? 'good' : 'poor'
    
    const participant = this.participants.get(participantId)
    if (participant) {
      participant.connectionQuality = quality
      this.emit('connectionQuality', { participantId, quality })
    }
  }

  /**
   * Clean up resources
   */
  async endConsultation() {
    // Stop all tracks
    this.localStream?.getTracks().forEach(track => track.stop())
    
    // Close peer connections
    this.peerConnections.forEach(pc => pc.close())
    
    // Close WebSocket
    this.socket?.close()
    
    // Clean up audio context
    await this.audioContext?.close()
    
    this.emit('consultationEnded')
  }

  // Toggle methods
  toggleVideo(enabled?: boolean) {
    const videoTrack = this.localStream?.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = enabled ?? !videoTrack.enabled
      this.emit('videoToggled', videoTrack.enabled)
    }
  }

  toggleAudio(enabled?: boolean) {
    const audioTrack = this.localStream?.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = enabled ?? !audioTrack.enabled
      this.emit('audioToggled', audioTrack.enabled)
    }
  }
}