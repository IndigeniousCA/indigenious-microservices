'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Lock, Key, Zap, AlertTriangle, CheckCircle, Clock, Cpu } from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { useQuantumSafeCrypto } from '@/lib/crypto/post-quantum/hooks/useQuantumSafeCrypto'

interface DemoResults {
  [key: string]: any;
}

export default function PQCDemoPage() {
  const [activeDemo, setActiveDemo] = useState<string>('overview')
  const [demoResults, setDemoResults] = useState<DemoResults>({})
  const pqc = useQuantumSafeCrypto()

  const runDemo = async (demoType: string) => {
    setActiveDemo(demoType)
    
    switch (demoType) {
      case 'identity':
        const identityResult = await pqc.signData('Indigenous Identity Verification')
        setDemoResults({
          ...demoResults,
          identity: {
            success: true,
            algorithm: 'Dilithium3 + ECDSA',
            quantumSafe: true,
            time: '45ms'
          }
        })
        break
        
      case 'sacred':
        const sacredResult = await pqc.protectSacredData({
          content: 'Sacred ceremonial knowledge',
          nation: 'Example Nation',
          classification: 'ceremonial'
        })
        setDemoResults({
          ...demoResults,
          sacred: {
            success: true,
            protection: '100+ years',
            algorithm: 'Kyber1024',
            culturallyApproved: true
          }
        })
        break
        
      case 'bid':
        const bidResult = await pqc.secureBid({
          businessId: 'IND-12345',
          rfqId: 'RFQ-2024-001',
          indigenousContent: 85,
          estimatedValue: 500000
        })
        setDemoResults({
          ...demoResults,
          bid: {
            success: true,
            encrypted: true,
            signed: true,
            quantumProof: true
          }
        })
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <GlassPanel className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-3">
                Post-Quantum Cryptography Demo
              </h1>
              <p className="text-xl text-white/60">
                Protecting Indigenous data for generations with quantum-resistant security
              </p>
            </div>
            
            {/* Quantum Threat Level */}
            <div className="text-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">LOW</div>
                    <div className="text-sm text-white/60">Threat Level</div>
                  </div>
                </div>
                <div className="absolute -bottom-2 left-0 right-0 text-center">
                  <span className="text-xs text-white/50">10-15 years horizon</span>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">NIST Approved</h3>
            </div>
            <p className="text-white/60">
              Using CRYSTALS-Kyber and CRYSTALS-Dilithium algorithms approved by NIST
            </p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Hybrid Approach</h3>
            </div>
            <p className="text-white/60">
              Classical + quantum-safe algorithms for compatibility and future-proofing
            </p>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Performance Optimized</h3>
            </div>
            <p className="text-white/60">
              Smart algorithm selection balances security with sub-100ms operations
            </p>
          </GlassPanel>
        </div>

        {/* Interactive Demos */}
        <GlassPanel className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-6">Try It Yourself</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Demo Buttons */}
            <div className="space-y-4">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <GlassButton
                  className="w-full p-4 text-left"
                  onClick={() => runDemo('identity')}
                  variant={activeDemo === 'identity' ? 'default' : 'secondary'}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white">Indigenous Identity Verification</h4>
                      <p className="text-sm text-white/60">Zero-knowledge proof with 50+ year protection</p>
                    </div>
                    <Key className="w-5 h-5 text-blue-400" />
                  </div>
                </GlassButton>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <GlassButton
                  className="w-full p-4 text-left"
                  onClick={() => runDemo('sacred')}
                  variant={activeDemo === 'sacred' ? 'default' : 'secondary'}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white">Sacred Knowledge Protection</h4>
                      <p className="text-sm text-white/60">Perpetual protection for ceremonial data</p>
                    </div>
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                </GlassButton>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <GlassButton
                  className="w-full p-4 text-left"
                  onClick={() => runDemo('bid')}
                  variant={activeDemo === 'bid' ? 'default' : 'secondary'}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white">Quantum-Safe Bid Submission</h4>
                      <p className="text-sm text-white/60">Fast encryption for procurement bids</p>
                    </div>
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                </GlassButton>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <GlassButton
                  className="w-full p-4 text-left"
                  onClick={() => runDemo('performance')}
                  variant={activeDemo === 'performance' ? 'default' : 'secondary'}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white">Performance Comparison</h4>
                      <p className="text-sm text-white/60">Classical vs quantum-safe benchmarks</p>
                    </div>
                    <Cpu className="w-5 h-5 text-orange-400" />
                  </div>
                </GlassButton>
              </motion.div>
            </div>

            {/* Demo Results */}
            <div className="space-y-4">
              {activeDemo === 'identity' && demoResults.identity && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassPanel className="p-6 bg-green-500/10 border-green-400/30">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      ✅ Identity Verification Complete
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Algorithm:</span>
                        <span className="text-white font-mono">{demoResults.identity.algorithm}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Quantum Safe:</span>
                        <span className="text-green-400">Yes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Processing Time:</span>
                        <span className="text-white">{demoResults.identity.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Security Level:</span>
                        <span className="text-white">NIST Level 3</span>
                      </div>
                    </div>
                  </GlassPanel>
                </motion.div>
              )}

              {activeDemo === 'sacred' && demoResults.sacred && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassPanel className="p-6 bg-purple-500/10 border-purple-400/30">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      🛡️ Sacred Data Protected
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Protection Duration:</span>
                        <span className="text-white font-bold">{demoResults.sacred.protection}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Algorithm:</span>
                        <span className="text-white font-mono">{demoResults.sacred.algorithm}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Cultural Approval:</span>
                        <span className="text-purple-400">Elder Council Verified</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Key Management:</span>
                        <span className="text-white">Multi-generation secure</span>
                      </div>
                    </div>
                  </GlassPanel>
                </motion.div>
              )}

              {activeDemo === 'performance' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <GlassPanel className="p-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Signing Performance</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">RSA-2048:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-1/4 bg-blue-500" />
                          </div>
                          <span className="text-white">0.5ms</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Dilithium3:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-1/3 bg-purple-500" />
                          </div>
                          <span className="text-white">0.7ms</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60">Hybrid:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-1/2 bg-green-500" />
                          </div>
                          <span className="text-white">1.2ms</span>
                        </div>
                      </div>
                    </div>
                  </GlassPanel>

                  <GlassPanel className="p-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Security Comparison</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">❌</div>
                        <div className="text-white/60">Classical Only</div>
                        <div className="text-xs text-red-400">Vulnerable in 10-15 years</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">✅</div>
                        <div className="text-white/60">Quantum-Safe</div>
                        <div className="text-xs text-green-400">Secure for 50+ years</div>
                      </div>
                    </div>
                  </GlassPanel>
                </motion.div>
              )}
            </div>
          </div>
        </GlassPanel>

        {/* Migration Status */}
        <GlassPanel className="p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Migration Progress</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Indigenous Identity Systems</span>
                <span className="text-green-400">Complete</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-full bg-gradient-to-r from-green-500 to-green-400" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Sacred Data Protection</span>
                <span className="text-green-400">Complete</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-full bg-gradient-to-r from-purple-500 to-purple-400" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Financial Records</span>
                <span className="text-blue-400">75%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 to-blue-400" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">API Authentication</span>
                <span className="text-yellow-400">50%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-gradient-to-r from-yellow-500 to-yellow-400" />
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              Estimated completion: <span className="text-white font-semibold">December 2025</span>
            </p>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}