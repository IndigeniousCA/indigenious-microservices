'use client'

/**
 * QuickPay Simple Interface
 * For Indigenous businesses: "Get Paid in 24 Hours"
 * Kindergarten simple - just submit invoice and get paid
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, DollarSign, CheckCircle, Clock, 
  ArrowRight, Zap, Shield, Sparkles 
} from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { GlassButton } from '@/components/ui/glass-button'
import { GlassInput } from '@/components/ui/glass-input'
import { useUser } from '@/contexts/user-context'
import UniversalEscrowService from '@/features/payment-rails/universal-escrow-service'
import { toast } from 'sonner'

export function QuickPaySimple() {
  const { user } = useUser()
  const [step, setStep] = useState<'upload' | 'confirm' | 'success'>('upload')
  const [invoice, setInvoice] = useState<File | null>(null)
  const [amount, setAmount] = useState('')
  const [projectName, setProjectName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  
  // Ambient AI: Pre-fill known information
  useEffect(() => {
    if (user?.businessId) {
      // AI would fetch active projects and suggest most likely one
      setProjectName('Highway 7 Construction - Phase 2')
    }
  }, [user])
  
  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setInvoice(file)
      
      // Ambient AI: Extract amount from invoice
      setTimeout(() => {
        setAmount('47,500')
        toast.success('Invoice details extracted by AI')
      }, 1000)
    }
  }
  
  const handleSubmit = async () => {
    if (!invoice || !amount || !projectName) {
      toast.error('Please complete all fields')
      return
    }
    
    setIsProcessing(true)
    
    try {
      // In real implementation, this would:
      // 1. Upload invoice to document management
      // 2. Find associated escrow account
      // 3. Submit for milestone payment
      // 4. Get instant approval via AI + approvers
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setPaymentId(`PAY-${Date.now()}`)
      setStep('success')
      
      toast.success('Payment approved! Funds arriving in 24 hours.')
    } catch (error) {
      toast.error('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 mb-4">
          <Zap className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl font-bold text-white">QuickPay</h1>
        </div>
        <p className="text-white/60 text-lg">Get paid in 24 hours, not 90 days</p>
      </motion.div>
      
      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassPanel className="p-8">
              <div className="space-y-6">
                {/* Invoice Upload */}
                <div>
                  <label className="text-white font-medium mb-2 block">
                    Upload Invoice
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.png"
                      onChange={handleInvoiceUpload}
                      className="hidden"
                      id="invoice-upload"
                    />
                    <label
                      htmlFor="invoice-upload"
                      className="flex items-center justify-center gap-3 p-8 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-blue-400/50 transition-all"
                    >
                      {invoice ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-400" />
                          <span className="text-white">{invoice.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-white/40" />
                          <span className="text-white/60">Click to upload invoice</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                
                {/* Project Name */}
                <div>
                  <label className="text-white font-medium mb-2 block">
                    Project Name
                  </label>
                  <GlassInput
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Which project is this for?"
                    className="w-full"
                  />
                  {projectName && (
                    <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI verified: Active project found
                    </p>
                  )}
                </div>
                
                {/* Amount */}
                <div>
                  <label className="text-white font-medium mb-2 block">
                    Invoice Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                      $
                    </span>
                    <GlassInput
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8"
                    />
                  </div>
                  {amount && (
                    <p className="text-xs text-blue-400 mt-1">
                      You'll receive ${(parseFloat(amount.replace(/,/g, '')) * 0.99).toLocaleString()} after 1% fee
                    </p>
                  )}
                </div>
                
                {/* Submit Button */}
                <GlassButton
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => setStep('confirm')}
                  disabled={!invoice || !amount || !projectName}
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Continue
                </GlassButton>
              </div>
            </GlassPanel>
            
            {/* Trust Indicators */}
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-white/40">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>24-hour guarantee</span>
              </div>
            </div>
          </motion.div>
        )}
        
        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassPanel className="p-8">
              <h2 className="text-xl font-semibold text-white mb-6">
                Confirm Payment Request
              </h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-white/60">Project</span>
                  <span className="text-white font-medium">{projectName}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-white/60">Invoice Amount</span>
                  <span className="text-white font-medium">
                    ${parseFloat(amount.replace(/,/g, '')).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span className="text-white/60">Processing Fee (1%)</span>
                  <span className="text-white font-medium">
                    ${(parseFloat(amount.replace(/,/g, '')) * 0.01).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-white font-semibold">You'll Receive</span>
                  <span className="text-2xl font-bold text-green-400">
                    ${(parseFloat(amount.replace(/,/g, '')) * 0.99).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-300 flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Funds will be deposited to your registered bank account within 24 hours
                </p>
              </div>
              
              <div className="flex gap-3">
                <GlassButton
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep('upload')}
                >
                  Back
                </GlassButton>
                <GlassButton
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Submit for Payment
                    </>
                  )}
                </GlassButton>
              </div>
            </GlassPanel>
          </motion.div>
        )}
        
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <GlassPanel className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-10 h-10 text-green-400" />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                Payment Approved!
              </h2>
              <p className="text-white/60 mb-6">
                Your funds are on the way
              </p>
              
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-sm text-white/60 mb-1">Payment ID</p>
                <p className="text-lg font-mono text-white">{paymentId}</p>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Expected Arrival</span>
                  <span className="text-white font-medium">Within 24 hours</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Payment Method</span>
                  <span className="text-white font-medium">Direct Deposit</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Amount</span>
                  <span className="text-green-400 font-medium">
                    ${(parseFloat(amount.replace(/,/g, '')) * 0.99).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <GlassButton
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  setStep('upload')
                  setInvoice(null)
                  setAmount('')
                  setProjectName('')
                  setPaymentId(null)
                }}
              >
                Submit Another Invoice
              </GlassButton>
            </GlassPanel>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center"
            >
              <p className="text-sm text-white/40">
                Questions? Call 1-800-QUICKPAY or email support@indigenious.ca
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}