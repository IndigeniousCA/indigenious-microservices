'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassButton } from '@/components/ui/glass-button';
import { assistantManager, ASSISTANT_PERSONALITIES } from '@/lib/ai/role-specific-assistants';
import type { AssistantPersonality } from '@/lib/ai/role-specific-assistants';
import { 
  Bot, 
  Sparkles,
  Users,
  Briefcase,
  Shield,
  Heart,
  BookOpen,
  Globe,
  MessageSquare,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const ROLE_ICONS: Record<string, any> = {
  business_owner: Briefcase,
  government_official: Shield,
  band_admin: Users,
  elder: Heart,
  procurement_officer: BookOpen,
  community_member: Globe,
};

export default function AIAssistantsPage() {
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantPersonality | null>(null);
  const allAssistants = assistantManager.getAllAssistants();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <h1 className="text-4xl font-bold text-white">
              Role-Specific AI Assistants
            </h1>
            <Sparkles className="h-8 w-8 text-purple-400" />
          </div>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Meet your specialized AI assistants, each designed with deep understanding of Indigenous procurement, 
            cultural protocols, and specific role requirements.
          </p>
        </motion.div>

        {/* Assistant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {allAssistants.map((assistant, index) => {
            const Icon = ROLE_ICONS[assistant.role] || Bot;
            
            return (
              <motion.div
                key={assistant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassPanel 
                  className="p-6 h-full cursor-pointer hover:bg-white/15 transition-all"
                  onClick={() => setSelectedAssistant(assistant)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-4xl">{assistant.avatar}</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">
                        {assistant.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-white/60" />
                        <span className="text-white/70 text-sm capitalize">
                          {assistant.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-white/80 text-sm mb-4 line-clamp-3">
                    {assistant.greeting}
                  </p>

                  {/* Personality Traits */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-white/60">Tone:</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 capitalize">
                        {assistant.personality.tone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60">Cultural:</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 capitalize">
                        {assistant.personality.culturalAwareness} awareness
                      </span>
                    </div>
                  </div>

                  {/* Capabilities Preview */}
                  <div className="space-y-1 mb-4">
                    {assistant.capabilities.slice(0, 3).map((capability, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/70">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span>{capability}</span>
                      </div>
                    ))}
                    {assistant.capabilities.length > 3 && (
                      <div className="text-xs text-white/50 pl-5">
                        +{assistant.capabilities.length - 3} more capabilities
                      </div>
                    )}
                  </div>

                  <GlassButton 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAssistant(assistant);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat with {assistant.name.split(' ')[0]}
                  </GlassButton>
                </GlassPanel>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Assistant Detail */}
        {selectedAssistant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassPanel className="p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="text-6xl">{selectedAssistant.avatar}</div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {selectedAssistant.name}
                  </h2>
                  <p className="text-xl text-white/80 mb-4">
                    {selectedAssistant.greeting}
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {selectedAssistant.personality.expertise.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm capitalize"
                      >
                        {skill.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Capabilities & Restrictions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    Capabilities
                  </h3>
                  <div className="space-y-2">
                    {selectedAssistant.capabilities.map((capability, index) => (
                      <div key={index} className="flex items-start gap-2 text-white/80">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                        <span className="text-sm">{capability}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-400" />
                    Restrictions
                  </h3>
                  <div className="space-y-2">
                    {selectedAssistant.restrictions.map((restriction, index) => (
                      <div key={index} className="flex items-start gap-2 text-white/80">
                        <span className="text-orange-400">•</span>
                        <span className="text-sm">{restriction}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Example Interactions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Example Conversations
                </h3>
                <div className="space-y-4">
                  {selectedAssistant.exampleInteractions.map((example, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-blue-500/20 rounded-lg p-3 flex-1">
                          <p className="text-white text-sm">{example.user}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">{selectedAssistant.avatar}</div>
                        <div className="bg-white/10 rounded-lg p-3 flex-1">
                          <p className="text-white text-sm whitespace-pre-wrap">{example.assistant}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <GlassButton
                  onClick={() => window.location.href = '/workflows/assistant'}
                  className="flex-1"
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Start Conversation
                  <ArrowRight className="h-5 w-5 ml-2" />
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  onClick={() => setSelectedAssistant(null)}
                >
                  Close
                </GlassButton>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <GlassPanel className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Why Role-Specific AI Assistants?
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Cultural Understanding
                </h3>
                <p className="text-white/70 text-sm">
                  Each assistant respects Indigenous protocols, understands community values, 
                  and communicates with appropriate cultural awareness.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Specialized Expertise
                </h3>
                <p className="text-white/70 text-sm">
                  From procurement policies to traditional knowledge, each assistant brings 
                  deep expertise tailored to specific roles and responsibilities.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Personalized Support
                </h3>
                <p className="text-white/70 text-sm">
                  Assistants adapt to your needs, remember your preferences, and provide 
                  guidance that matches your experience level and goals.
                </p>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}