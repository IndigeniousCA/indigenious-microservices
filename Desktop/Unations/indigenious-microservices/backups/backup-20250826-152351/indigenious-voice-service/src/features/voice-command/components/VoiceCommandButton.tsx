'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Loader2, ChevronDown, Award } from 'lucide-react';
import VoiceRecognitionService from '../services/voice-recognition/VoiceRecognitionService';
import { getLanguageByCode, CREE_LANGUAGES, PRIORITY_LANGUAGES } from '../config/languages';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GlassButton } from '@/components/ui/GlassButton';

interface VoiceCommandButtonProps {
  onCommand?: (command: string, language: string) => void;
  onTranscript?: (transcript: string, confidence: number) => void;
  defaultLanguage?: string;
  className?: string;
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  onCommand,
  onTranscript,
  defaultLanguage = 'crj-coastal', // Default to Coastal James Bay Cree
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);
  const [selectedDialect, setSelectedDialect] = useState<string | undefined>();
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionService = useRef<VoiceRecognitionService | null>(null);
  const animationFrame = useRef<number | null>(null);

  // Initialize recognition service
  useEffect(() => {
    const initService = async () => {
      try {
        recognitionService.current = new VoiceRecognitionService({
          language: selectedLanguage,
          dialect: selectedDialect,
          continuous: true,
          interimResults: true,
          confidenceThreshold: 0.7
        });

        // Setup event listeners
        recognitionService.current.on('initialized', () => {
          setIsInitialized(true);
        });

        recognitionService.current.on('result', (result: any) => {
          setTranscript(result.transcript);
          setConfidence(result.confidence);
          setIsProcessing(!result.isFinal);
          
          if (onTranscript) {
            onTranscript(result.transcript, result.confidence);
          }
        });

        recognitionService.current.on('final-result', (result: any) => {
          if (onCommand) {
            onCommand(result.transcript, result.language);
          }
          
          // Award points for successful recognition
          if (result.confidence > 0.8) {
            setUserPoints(prev => prev + 10);
          }
        });

        recognitionService.current.on('dialect-detected', (dialect: string) => {
          setSelectedDialect(dialect);
        });

        recognitionService.current.on('error', (err: any) => {
          console.error('Voice recognition error:', err);
          setError('Voice recognition error. Please try again.');
          setIsListening(false);
        });

        await recognitionService.current.initialize();
      } catch (err) {
        console.error('Failed to initialize voice recognition:', err);
        setError('Failed to initialize voice recognition');
      }
    };

    initService();

    return () => {
      if (recognitionService.current) {
        recognitionService.current.dispose();
      }
    };
  }, [selectedLanguage, selectedDialect, onCommand, onTranscript]);

  // Audio level visualization
  useEffect(() => {
    if (isListening) {
      const updateAudioLevel = () => {
        // Simulate audio level (would be real data from audio context)
        setAudioLevel(Math.random() * 0.5 + 0.5);
        animationFrame.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
    } else {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      setAudioLevel(0);
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [isListening]);

  // Toggle listening
  const toggleListening = useCallback(async () => {
    if (!recognitionService.current || !isInitialized) {
      setError('Voice recognition not ready');
      return;
    }

    if (isListening) {
      recognitionService.current.stopListening();
      setIsListening(false);
      setTranscript('');
      setIsProcessing(false);
    } else {
      try {
        await recognitionService.current.startListening();
        setIsListening(true);
        setError(null);
      } catch (err) {
        console.error('Failed to start listening:', err);
        setError('Failed to access microphone');
      }
    }
  }, [isListening, isInitialized]);

  // Get language display info
  const getLanguageInfo = (code: string) => {
    const language = getLanguageByCode(code);
    return language || { name: 'Unknown', nativeName: '', speakers: 0 };
  };

  const currentLanguage = getLanguageInfo(selectedLanguage);

  return (
    <div className={`relative ${className}`}>
      {/* Main Voice Button */}
      <div className="flex flex-col items-center space-y-4">
        <motion.button
          onClick={toggleListening}
          disabled={!isInitialized}
          className={`
            relative p-8 rounded-full
            bg-gradient-to-br from-blue-500/20 to-purple-500/20
            border-2 border-white/20 backdrop-blur-md
            transition-all duration-300
            ${isListening ? 'scale-110 shadow-2xl' : 'hover:scale-105'}
            ${!isInitialized ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          whileHover={{ scale: isInitialized ? 1.05 : 1 }}
          whileTap={{ scale: isInitialized ? 0.95 : 1 }}
        >
          {/* Ripple effect when listening */}
          <AnimatePresence>
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-blue-400/20"
                  initial={{ scale: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-purple-400/20"
                  initial={{ scale: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1, delay: 0.5, repeat: Infinity }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Audio level indicator */}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-blue-400"
              animate={{ scale: 1 + audioLevel * 0.2 }}
              transition={{ duration: 0.1 }}
            />
          )}

          {/* Icon */}
          <div className="relative z-10">
            {isListening ? (
              <Mic className="w-12 h-12 text-red-400 animate-pulse" />
            ) : (
              <MicOff className="w-12 h-12 text-white/80" />
            )}
          </div>
        </motion.button>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            className="
              flex items-center space-x-2 px-4 py-2
              bg-white/10 backdrop-blur-md rounded-xl
              border border-white/20 hover:bg-white/20
              transition-all duration-200
            "
          >
            <span className="text-sm font-medium text-white">
              {currentLanguage.nativeName || currentLanguage.name}
            </span>
            <ChevronDown className={`
              w-4 h-4 text-white/60 transition-transform
              ${showLanguageSelector ? 'rotate-180' : ''}
            `} />
          </button>

          {/* Language Dropdown */}
          <AnimatePresence>
            {showLanguageSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="
                  absolute top-full mt-2 left-0 right-0
                  min-w-[300px] max-h-[400px] overflow-y-auto
                  bg-white/10 backdrop-blur-xl rounded-xl
                  border border-white/20 shadow-2xl
                  z-50
                "
              >
                {/* Cree Languages Section */}
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-white/60 px-2 py-1">
                    Cree Languages
                  </h3>
                  {Object.entries(CREE_LANGUAGES.languages).map(([key, lang]) => (
                    <div key={key} className="mb-2">
                      <h4 className="text-xs text-white/40 px-2">{lang.name}</h4>
                      {lang.dialects.map(dialect => (
                        <button
                          key={dialect.code}
                          onClick={() => {
                            setSelectedLanguage(dialect.code);
                            setShowLanguageSelector(false);
                          }}
                          className={`
                            w-full text-left px-3 py-2 rounded-lg
                            transition-all duration-200
                            ${selectedLanguage === dialect.code 
                              ? 'bg-blue-500/30 text-white' 
                              : 'text-white/80 hover:bg-white/10'
                            }
                          `}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium">
                                {dialect.nativeName}
                              </div>
                              <div className="text-xs text-white/60">
                                {dialect.name} • {dialect.speakers.toLocaleString()} speakers
                              </div>
                            </div>
                            {PRIORITY_LANGUAGES.includes(dialect.code) && (
                              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">
                                Priority
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Display */}
        <GlassPanel className="w-full max-w-md p-4">
          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-sm text-white/60">Processing...</span>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Volume2 className="w-4 h-4 text-white/60 mt-1" />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {transcript}
                  </p>
                  {confidence > 0 && (
                    <div className="mt-1 flex items-center space-x-2">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            confidence > 0.8 ? 'bg-green-400' :
                            confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${confidence * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-xs text-white/40">
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Instructions */}
          {!transcript && !error && !isProcessing && (
            <div className="text-center text-white/60 text-sm">
              {isListening ? (
                <span>Speak your command in {currentLanguage.name}...</span>
              ) : (
                <span>Press the microphone to start</span>
              )}
            </div>
          )}
        </GlassPanel>

        {/* User Points (Gamification) */}
        {userPoints > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/20 rounded-full"
          >
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">
              {userPoints} points
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VoiceCommandButton;