// Pronunciation Player Component
// Audio player for Indigenous language pronunciations

import { useState, useRef, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Volume2, VolumeX, Pause, Play, Download,
  Mic, User, Info, Star, RefreshCw
} from 'lucide-react'
import { LanguageCode, PronunciationData } from '../types/translation.types'
import { AUDIO_SUPPORTED_LANGUAGES } from '../config/languages'

interface PronunciationPlayerProps {
  text: string
  language: LanguageCode
  variant?: 'inline' | 'standalone' | 'detailed'
  showSpeakerInfo?: boolean
  allowDownload?: boolean
  onPlay?: () => void
  onComplete?: () => void
}

export function PronunciationPlayer({
  text,
  language,
  variant = 'inline',
  showSpeakerInfo = true,
  allowDownload = false,
  onPlay,
  onComplete
}: PronunciationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pronunciation, setPronunciation] = useState<PronunciationData | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)

  // Check if language supports audio
  const hasAudioSupport = AUDIO_SUPPORTED_LANGUAGES.includes(language)
  
  if (!hasAudioSupport) {
    return null
  }

  // Load pronunciation data
  const loadPronunciation = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In production, this would fetch from API
      // For now, use mock data
      const mockPronunciation: PronunciationData = {
        id: `${language}-${text}`,
        language,
        text,
        audioUrl: `/audio/pronunciations/${language}/${encodeURIComponent(text)}.mp3`,
        speaker: {
          name: 'Elder Mary Smith',
          role: 'elder',
          nation: 'Anishinaabe Nation',
          dialect: 'Eastern Ojibwe'
        },
        recordedAt: new Date().toISOString(),
        approved: true,
        metadata: {
          gender: 'female',
          age: '70+',
          formality: 'traditional',
          context: 'Teaching'
        }
      }

      setPronunciation(mockPronunciation)
      
      // Preload audio
      if (audioRef.current) {
        audioRef.current.src = mockPronunciation.audioUrl
        audioRef.current.load()
      }
    } catch (err) {
      setError('Failed to load pronunciation')
      logger.error('Pronunciation load error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [text, language])

  // Play audio
  const playAudio = useCallback(async () => {
    if (!audioRef.current || isLoading) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        // Load pronunciation if not loaded
        if (!pronunciation) {
          await loadPronunciation()
        }

        await audioRef.current.play()
        setIsPlaying(true)
        onPlay?.()
      }
    } catch (err) {
      setError('Failed to play audio')
      logger.error('Audio play error:', err)
    }
  }, [isPlaying, isLoading, pronunciation, loadPronunciation, onPlay])

  // Handle audio ended
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false)
    onComplete?.()
  }, [onComplete])

  // Download audio
  const downloadAudio = useCallback(() => {
    if (!pronunciation?.audioUrl) return

    const link = document.createElement('a')
    link.href = pronunciation.audioUrl
    link.download = `${language}-${text}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [pronunciation, language, text])

  // Inline variant - simple button
  if (variant === 'inline') {
    return (
      <>
        <button
          onClick={playAudio}
          disabled={isLoading}
          className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
          title="Listen to pronunciation"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 text-white/60 animate-spin" />
          ) : isPlaying ? (
            <VolumeX className="w-4 h-4 text-blue-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-white/60 hover:text-white" />
          )}
        </button>
        
        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          onError={() => setError('Audio playback failed')}
        />
      </>
    )
  }

  // Standalone variant - medium player
  if (variant === 'standalone') {
    return (
      <div className="inline-flex items-center space-x-3 px-4 py-2 bg-white/10 
        backdrop-blur-md border border-white/20 rounded-lg">
        <button
          onClick={playAudio}
          disabled={isLoading}
          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 
            rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-blue-400" />
          ) : (
            <Play className="w-5 h-5 text-blue-400" />
          )}
        </button>

        <div className="flex-1">
          <p className="text-white/90 font-medium">{text}</p>
          {pronunciation?.speaker && showSpeakerInfo && (
            <p className="text-white/60 text-sm">
              {pronunciation.speaker.name} • {pronunciation.speaker.nation}
            </p>
          )}
        </div>

        {allowDownload && pronunciation && (
          <button
            onClick={downloadAudio}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Download pronunciation"
          >
            <Download className="w-4 h-4 text-white/60" />
          </button>
        )}

        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          onError={() => setError('Audio playback failed')}
        />
      </div>
    )
  }

  // Detailed variant - full player with info
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={playAudio}
            disabled={isLoading}
            className="p-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 
              rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 text-blue-400" />
            ) : (
              <Play className="w-6 h-6 text-blue-400" />
            )}
          </button>

          <div>
            <h3 className="text-lg font-semibold text-white">{text}</h3>
            <p className="text-white/60">Audio pronunciation guide</p>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Info className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Speaker info */}
      {pronunciation?.speaker && showSpeakerInfo && (
        <div className="mb-4 p-4 bg-white/5 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-white">{pronunciation.speaker.name}</h4>
                {pronunciation.speaker.role === 'elder' && (
                  <Star className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-white/60 text-sm">
                {pronunciation.speaker.role === 'elder' ? 'Elder' : 
                 pronunciation.speaker.role === 'teacher' ? 'Language Teacher' : 
                 'Native Speaker'}
                {pronunciation.speaker.nation && ` • ${pronunciation.speaker.nation}`}
                {pronunciation.speaker.dialect && ` • ${pronunciation.speaker.dialect}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional details */}
      <AnimatePresence>
        {showDetails && pronunciation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 text-sm">
              {pronunciation.metadata?.context && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/60 mb-1">Context</p>
                  <p className="text-white">{pronunciation.metadata.context}</p>
                </div>
              )}
              
              {pronunciation.metadata?.formality && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/60 mb-1">Formality</p>
                  <p className="text-white capitalize">{pronunciation.metadata.formality}</p>
                </div>
              )}

              {pronunciation.approved && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-white/60 mb-1">Status</p>
                  <p className="text-emerald-400">Elder Approved</p>
                </div>
              )}

              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 mb-1">Recorded</p>
                <p className="text-white">
                  {new Date(pronunciation.recordedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {allowDownload && (
              <button
                onClick={downloadAudio}
                className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-400/50 rounded-lg text-blue-200 text-sm 
                  flex items-center justify-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Audio</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={() => setError('Audio playback failed')}
      />
    </div>
  )
}