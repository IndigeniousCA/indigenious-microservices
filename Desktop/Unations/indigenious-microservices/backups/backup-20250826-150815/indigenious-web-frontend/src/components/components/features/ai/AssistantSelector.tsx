'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GlassButton } from '@/components/ui/GlassButton';
import { assistantManager } from '@/lib/ai/role-specific-assistants';
import type { AssistantPersonality } from '@/lib/ai/role-specific-assistants';
import { 
  Bot, 
  CheckCircle,
  Users,
  Briefcase,
  Shield,
  Heart,
  BookOpen,
  Globe,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface AssistantSelectorProps {
  userId: string;
  onAssistantSelect?: (assistant: AssistantPersonality) => void;
  currentAssistant?: AssistantPersonality;
  allowChange?: boolean;
}

const ROLE_ICONS: Record<string, any> = {
  business_owner: Briefcase,
  government_official: Shield,
  band_admin: Users,
  elder: Heart,
  procurement_officer: BookOpen,
  community_member: Globe,
};

export default function AssistantSelector({
  userId,
  onAssistantSelect,
  currentAssistant,
  allowChange = true,
}: AssistantSelectorProps) {
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantPersonality | null>(currentAssistant || null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    loadUserAssistant();
  }, [userId]);

  const loadUserAssistant = async () => {
    try {
      setIsLoading(true);
      const assistant = await assistantManager.getAssistantForUser(userId);
      setSelectedAssistant(assistant);
      setUserRole(assistant.role);
      onAssistantSelect?.(assistant);
    } catch (error) {
      logger.error('Error loading assistant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssistantChange = async (assistant: AssistantPersonality) => {
    setSelectedAssistant(assistant);
    setShowSelector(false);
    
    // Save preference
    await assistantManager.updateUserAssistantPreferences(userId, {
      preferredAssistantId: assistant.id,
    });
    
    onAssistantSelect?.(assistant);
  };

  const allAssistants = assistantManager.getAllAssistants();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-white/70">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span className="text-sm">Loading assistant...</span>
      </div>
    );
  }

  return (
    <>
      {/* Current Assistant Display */}
      {selectedAssistant && !showSelector && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="text-3xl">{selectedAssistant.avatar}</div>
          <div className="flex-1">
            <div className="text-white font-semibold">{selectedAssistant.name}</div>
            <div className="text-white/70 text-sm capitalize">
              {selectedAssistant.role.replace('_', ' ')}
            </div>
          </div>
          {allowChange && (
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => setShowSelector(true)}
              className="text-xs"
            >
              Change Assistant
            </GlassButton>
          )}
        </motion.div>
      )}

      {/* Assistant Selector Modal */}
      <AnimatePresence>
        {showSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                    Choose Your AI Assistant
                  </h2>
                  <button
                    onClick={() => setShowSelector(false)}
                    className="text-white/60 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                  {allAssistants.map((assistant) => {
                    const Icon = ROLE_ICONS[assistant.role] || Bot;
                    const isSelected = selectedAssistant?.id === assistant.id;
                    const isRecommended = assistant.role === userRole;

                    return (
                      <motion.button
                        key={assistant.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAssistantChange(assistant)}
                        className={`relative text-left p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-white/20 border-purple-400'
                            : 'bg-white/10 border-white/20 hover:bg-white/15'
                        }`}
                      >
                        {isRecommended && (
                          <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                            Recommended
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{assistant.avatar}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-semibold">
                                {assistant.name}
                              </h3>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Icon className="h-4 w-4 text-white/60" />
                              <span className="text-white/70 text-sm capitalize">
                                {assistant.role.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-white/60 text-sm mt-3 line-clamp-2">
                          {assistant.greeting}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {assistant.personality.expertise.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70"
                            >
                              {skill.replace('_', ' ')}
                            </span>
                          ))}
                          {assistant.personality.expertise.length > 3 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                              +{assistant.personality.expertise.length - 3} more
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <span>Tone: {assistant.personality.tone}</span>
                            <span>•</span>
                            <span>Cultural: {assistant.personality.culturalAwareness}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-white/40" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-white/5 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">About AI Assistants</h4>
                  <p className="text-white/70 text-sm">
                    Each assistant is specialized for different roles and brings unique expertise. 
                    They understand cultural protocols, speak multiple languages, and adapt to your needs. 
                    You can change your assistant anytime to match your current task.
                  </p>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}