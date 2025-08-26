/**
 * Indigenous Business Verification Flow
 * Blockchain-based verification interface
 */

'use client'

import React, { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Upload,
  FileCheck,
  Users,
  MapPin,
  Percent,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Wallet,
  ExternalLink
} from 'lucide-react'
import { useWallet, useVerification } from '../hooks/useSmartContracts'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GlassButton } from '@/components/ui/GlassButton'
import { formatAddress, formatDate } from '@/lib/utils/format'

interface VerificationFlowProps {
  businessId: string
  onComplete?: () => void
}

export default function VerificationFlow({ businessId, onComplete }: VerificationFlowProps) {
  const { address, isConnected, connectWallet } = useWallet()
  const { 
    submitVerification, 
    verificationStatus, 
    isSubmitting, 
    isVerified 
  } = useVerification()

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    nation: '',
    territory: '',
    ownershipPercentage: 51,
    documents: [] as File[]
  })

  const handleSubmit = async () => {
    if (!isConnected) {
      await connectWallet()
      return
    }

    try {
      const result = await submitVerification(formData)
      logger.info('Verification submitted:', result)
      
      setStep(4) // Success step
      onComplete?.()
    } catch (error) {
      logger.error('Verification error:', error)
    }
  }

  // Already verified
  if (isVerified && verificationStatus) {
    return (
      <GlassPanel className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">
            Business Verified
          </h2>
          
          <p className="text-gray-300 mb-8">
            Your Indigenous business status has been verified on the blockchain.
          </p>

          <div className="bg-white/5 rounded-lg p-6 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Nation</span>
              <span className="text-white font-medium">{verificationStatus.nation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Territory</span>
              <span className="text-white font-medium">{verificationStatus.territory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ownership</span>
              <span className="text-white font-medium">{verificationStatus.ownershipPercentage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Verified By</span>
              <span className="text-white font-medium">{verificationStatus.elders.length} Elders</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Valid Until</span>
              <span className="text-white font-medium">
                {verificationStatus.expiryDate 
                  ? formatDate(new Date(verificationStatus.expiryDate * 1000))
                  : 'No expiry'
                }
              </span>
            </div>
          </div>

          <div className="mt-6">
            <a
              href={`https://etherscan.io/address/${businessId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-400 hover:text-blue-300"
            >
              View on Blockchain
              <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </div>
        </div>
      </GlassPanel>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex items-center ${i < 4 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  step >= i
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                {step > i ? <CheckCircle className="h-5 w-5" /> : i}
              </div>
              {i < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > i ? 'bg-blue-500' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Connect</span>
          <span className="text-gray-400">Details</span>
          <span className="text-gray-400">Submit</span>
          <span className="text-gray-400">Complete</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Connect Wallet */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassPanel>
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/20 rounded-full mb-6">
                  <Wallet className="h-10 w-10 text-blue-400" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">
                  Connect Your Wallet
                </h2>

                <p className="text-gray-300 mb-8 max-w-md mx-auto">
                  To verify your Indigenous business status on the blockchain, 
                  please connect your wallet.
                </p>

                {isConnected ? (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-center justify-center space-x-2 text-green-400">
                        <CheckCircle className="h-5 w-5" />
                        <span>Wallet Connected</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-2">
                        {formatAddress(address!)}
                      </div>
                    </div>

                    <GlassButton
                      variant="primary"
                      size="lg"
                      onClick={() => setStep(2)}
                    >
                      Continue
                    </GlassButton>
                  </div>
                ) : (
                  <GlassButton
                    variant="primary"
                    size="lg"
                    onClick={connectWallet}
                  >
                    <Wallet className="h-5 w-5 mr-2" />
                    Connect Wallet
                  </GlassButton>
                )}
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* Step 2: Business Details */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassPanel>
              <h2 className="text-2xl font-bold text-white mb-6">
                Business Information
              </h2>

              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Indigenous Nation
                  </label>
                  <input
                    type="text"
                    value={formData.nation}
                    onChange={(e) => setFormData({ ...formData, nation: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                    placeholder="e.g., Cree Nation"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Traditional Territory
                  </label>
                  <input
                    type="text"
                    value={formData.territory}
                    onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                    placeholder="e.g., Treaty 6 Territory"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Percent className="inline h-4 w-4 mr-1" />
                    Indigenous Ownership Percentage
                  </label>
                  <input
                    type="number"
                    min="51"
                    max="100"
                    value={formData.ownershipPercentage}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      ownershipPercentage: parseInt(e.target.value) 
                    })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Minimum 51% Indigenous ownership required
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Upload className="inline h-4 w-4 mr-1" />
                    Supporting Documents
                  </label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        setFormData({ ...formData, documents: files })
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer"
                    >
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-300">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, JPG, PNG up to 10MB each
                      </p>
                    </label>
                  </div>
                  
                  {formData.documents.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.documents.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white/5 rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <FileCheck className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-gray-300">
                              {file.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <GlassButton
                    variant="secondary"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    onClick={() => setStep(3)}
                    disabled={
                      !formData.nation || 
                      !formData.territory || 
                      formData.documents.length === 0
                    }
                  >
                    Continue
                  </GlassButton>
                </div>
              </form>
            </GlassPanel>
          </motion.div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassPanel>
              <h2 className="text-2xl font-bold text-white mb-6">
                Review & Submit
              </h2>

              <div className="bg-white/5 rounded-lg p-6 space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Verification Details
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nation</span>
                    <span className="text-white font-medium">{formData.nation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Territory</span>
                    <span className="text-white font-medium">{formData.territory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ownership</span>
                    <span className="text-white font-medium">{formData.ownershipPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Documents</span>
                    <span className="text-white font-medium">{formData.documents.length} files</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-200">
                    <p className="font-medium mb-1">Important Notice</p>
                    <p>
                      By submitting this verification, you confirm that all information 
                      provided is accurate. False claims may result in permanent 
                      disqualification from the platform.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-medium mb-1">Blockchain Verification</p>
                    <p>
                      Your verification will be recorded on the blockchain and reviewed 
                      by community elders. This process typically takes 2-3 business days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <GlassButton
                  variant="secondary"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                >
                  Back
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5 mr-2" />
                      Submit Verification
                    </>
                  )}
                </GlassButton>
              </div>
            </GlassPanel>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <GlassPanel>
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">
                  Verification Submitted!
                </h2>

                <p className="text-gray-300 mb-8 max-w-md mx-auto">
                  Your Indigenous business verification has been submitted to the 
                  blockchain and is now pending elder review.
                </p>

                <div className="bg-white/5 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Transaction Hash</span>
                    <a
                      href="#"
                      className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                    >
                      0x1234...5678
                    </a>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2 text-blue-300">
                    <Clock className="h-5 w-5" />
                    <span className="text-sm">
                      Expected review time: 2-3 business days
                    </span>
                  </div>
                </div>

                <GlassButton
                  variant="primary"
                  onClick={onComplete}
                >
                  Done
                </GlassButton>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}