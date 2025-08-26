'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { WifiOff, Download, RefreshCw, Database } from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        <GlassPanel className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <WifiOff className="w-10 h-10 text-blue-400" />
          </motion.div>

          <h1 className="text-2xl font-bold text-white mb-4">
            You're Offline
          </h1>
          
          <p className="text-white/60 mb-8">
            Don't worry! You can still access your saved data and continue working. 
            Your changes will sync automatically when you're back online.
          </p>

          <div className="space-y-4 mb-8">
            <GlassPanel className="p-4 bg-white/5">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-green-400" />
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-white">Local Data Available</p>
                  <p className="text-xs text-white/60">Access your BOQs, templates, and recent projects</p>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-4 bg-white/5">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-blue-400" />
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-white">Offline Mode Active</p>
                  <p className="text-xs text-white/60">All features work without internet</p>
                </div>
              </div>
            </GlassPanel>
          </div>

          <GlassButton onClick={handleRefresh} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </GlassButton>

          <div className="mt-6 text-xs text-white/40">
            <p>Offline features include:</p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              <span>• BOQ Editing</span>
              <span>• Excel Export</span>
              <span>• Template Access</span>
              <span>• Local Search</span>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  )
}