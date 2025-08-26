'use client';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { motion } from 'framer-motion';
import { Bot, Shield, Zap, Users } from 'lucide-react';
import ConversationalWorkflowWrapper from '@/components/features/mcp/ConversationalWorkflowWrapper';

export default function AssistantPageContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-8 py-6 border-b border-white/10"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Bot className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  AI Workflow Assistant
                </h1>
                <p className="text-white/70 text-sm">
                  Execute workflows using natural language
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-white/70">
                <Shield className="h-4 w-4 text-green-400" />
                <span>Cultural protocols respected</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Users className="h-4 w-4 text-blue-400" />
                <span>Community permissions active</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span>MCP connected</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Chat Interface */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-8 py-6">
          <GlassPanel className="h-full p-6">
            <ConversationalWorkflowWrapper />
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}