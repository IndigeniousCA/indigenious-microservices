// Payment Processor Component
// Handle various payment methods and processing

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Building, Smartphone, Globe, Shield,
  Lock, Check, X, AlertCircle, Loader, ChevronRight,
  DollarSign, Zap, Info, Copy, ExternalLink
} from 'lucide-react'
import { 
  PaymentMethod, 
  PaymentStatus,
  CurrencyCode,
  PaymentProcessor as PaymentProcessorType 
} from '../types/financial.types'
import { usePaymentProcessor } from '../hooks/usePaymentProcessor'
import { formatCurrency } from '../utils/formatters'

interface PaymentProcessorProps {
  amount: number
  currency: CurrencyCode
  invoiceId?: string
  description?: string
  onSuccess?: (paymentId: string) => void
  onError?: (error: string) => void
  allowedMethods?: PaymentMethod[]
}

export function PaymentProcessor({
  amount,
  currency,
  invoiceId,
  description,
  onSuccess,
  onError,
  allowedMethods
}: PaymentProcessorProps) {
  const {
    processors,
    processPayment,
    validateCard,
    isProcessing
  } = usePaymentProcessor()

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credit_card')
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: '',
    saveCard: false
  })
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    transitNumber: '',
    institutionNumber: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending')

  // Payment method configurations
  const paymentMethods: Record<PaymentMethod, {
    label: string
    icon: any
    color: string
    processor?: PaymentProcessorType['name']
    description: string
  }> = {
    credit_card: {
      label: 'Credit/Debit Card',
      icon: CreditCard,
      color: 'blue',
      processor: 'stripe',
      description: 'Secure payment via Stripe'
    },
    debit_card: {
      label: 'Debit Card',
      icon: CreditCard,
      color: 'blue',
      processor: 'moneris',
      description: 'Direct debit payment'
    },
    bank_transfer: {
      label: 'Bank Transfer',
      icon: Building,
      color: 'emerald',
      processor: 'interac',
      description: 'EFT or wire transfer'
    },
    e_transfer: {
      label: 'Interac e-Transfer',
      icon: Smartphone,
      color: 'red',
      processor: 'interac',
      description: 'Email money transfer'
    },
    cryptocurrency: {
      label: 'Cryptocurrency',
      icon: Globe,
      color: 'purple',
      description: 'Bitcoin or Ethereum'
    },
    barter: {
      label: 'Traditional Exchange',
      icon: Shield,
      color: 'amber',
      description: 'Goods or services exchange'
    },
    cheque: {
      label: 'Cheque',
      icon: Building,
      color: 'gray',
      description: 'Mail or deposit cheque'
    },
    cash: {
      label: 'Cash',
      icon: DollarSign,
      color: 'green',
      description: 'In-person payment'
    },
    other: {
      label: 'Other',
      icon: Globe,
      color: 'gray',
      description: 'Alternative payment method'
    }
  }

  // Filter allowed methods
  const availableMethods = allowedMethods 
    ? Object.entries(paymentMethods).filter(([method]) => 
        allowedMethods.includes(method as PaymentMethod)
      )
    : Object.entries(paymentMethods)

  // Validate payment details
  const validatePayment = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (selectedMethod === 'credit_card' || selectedMethod === 'debit_card') {
      if (!paymentDetails.cardNumber) {
        newErrors.cardNumber = 'Card number is required'
      } else if (!/^\d{16}$/.test(paymentDetails.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Invalid card number'
      }

      if (!paymentDetails.expiryDate) {
        newErrors.expiryDate = 'Expiry date is required'
      } else if (!/^\d{2}\/\d{2}$/.test(paymentDetails.expiryDate)) {
        newErrors.expiryDate = 'Invalid expiry date (MM/YY)'
      }

      if (!paymentDetails.cvv) {
        newErrors.cvv = 'CVV is required'
      } else if (!/^\d{3,4}$/.test(paymentDetails.cvv)) {
        newErrors.cvv = 'Invalid CVV'
      }

      if (!paymentDetails.cardholderName) {
        newErrors.cardholderName = 'Cardholder name is required'
      }
    }

    if (selectedMethod === 'bank_transfer') {
      if (!bankDetails.accountNumber) {
        newErrors.accountNumber = 'Account number is required'
      }
      if (!bankDetails.transitNumber) {
        newErrors.transitNumber = 'Transit number is required'
      }
      if (!bankDetails.institutionNumber) {
        newErrors.institutionNumber = 'Institution number is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Process payment
  const handlePayment = async () => {
    if (!validatePayment()) return

    setPaymentStatus('processing')

    try {
      const result = await processPayment({
        amount,
        currency,
        method: selectedMethod,
        invoiceId,
        description,
        paymentDetails: selectedMethod === 'credit_card' ? paymentDetails : bankDetails
      })

      if (result.status === 'completed') {
        setPaymentStatus('completed')
        onSuccess?.(result.id)
      } else {
        setPaymentStatus('failed')
        onError?.(result.error || 'Payment failed')
      }
    } catch (error) {
      setPaymentStatus('failed')
      onError?.(error instanceof Error ? error.message : 'Payment processing error')
    }
  }

  // Format card number input
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const groups = cleaned.match(/.{1,4}/g) || []
    return groups.join(' ')
  }

  // Format expiry date input
  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`
    }
    return cleaned
  }

  // Get processor fee
  const getProcessorFee = () => {
    const method = paymentMethods[selectedMethod]
    if (!method.processor) return 0

    const processor = processors.find(p => p.name === method.processor)
    if (!processor) return 0

    const fees = processor.fees.indigenousRate || processor.fees
    return (amount * fees.percentage / 100) + fees.fixed
  }

  const processorFee = getProcessorFee()
  const totalAmount = amount + processorFee

  return (
    <div className="space-y-6">
      {/* Amount Summary */}
      <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 
        backdrop-blur-md border border-blue-400/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Summary</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Amount</span>
            <span className="text-white font-medium">
              {formatCurrency(amount, currency)}
            </span>
          </div>

          {processorFee > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-white/70">Processing Fee</span>
              <span className="text-white/80">
                {formatCurrency(processorFee, currency)}
              </span>
            </div>
          )}

          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Total</span>
              <span className="text-2xl font-bold text-white">
                {formatCurrency(totalAmount, currency)}
              </span>
            </div>
          </div>

          {description && (
            <p className="text-white/60 text-sm pt-2">{description}</p>
          )}
        </div>
      </div>

      {/* Payment Method Selection */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Select Payment Method</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableMethods.map(([method, config]) => {
            const Icon = config.icon
            const isSelected = selectedMethod === method

            return (
              <button
                key={method}
                onClick={() => setSelectedMethod(method as PaymentMethod)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? `bg-${config.color}-500/20 border-${config.color}-400/50`
                    : 'bg-white/10 border-white/20 hover:bg-white/15'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isSelected 
                      ? `bg-${config.color}-500/20`
                      : 'bg-white/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isSelected
                        ? `text-${config.color}-400`
                        : 'text-white/60'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      isSelected ? 'text-white' : 'text-white/80'
                    }`}>
                      {config.label}
                    </p>
                    <p className={`text-sm ${
                      isSelected ? 'text-white/70' : 'text-white/50'
                    }`}>
                      {config.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Payment Details Form */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMethod}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6"
        >
          {/* Credit/Debit Card Form */}
          {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && (
            <div className="space-y-4">
              <div>
                <label className="text-white/80 text-sm mb-2 block">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={paymentDetails.cardNumber}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      cardNumber: formatCardNumber(e.target.value.replace(/\s/g, '').slice(0, 16))
                    }))}
                    placeholder="1234 5678 9012 3456"
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg 
                      text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400 ${
                        errors.cardNumber ? 'border-red-400/50' : 'border-white/20'
                      }`}
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 
                    w-5 h-5 text-white/40" />
                </div>
                {errors.cardNumber && (
                  <p className="text-red-400 text-sm mt-1">{errors.cardNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Expiry Date</label>
                  <input
                    type="text"
                    value={paymentDetails.expiryDate}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      expiryDate: formatExpiryDate(e.target.value)
                    }))}
                    placeholder="MM/YY"
                    maxLength={5}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg 
                      text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400 ${
                        errors.expiryDate ? 'border-red-400/50' : 'border-white/20'
                      }`}
                  />
                  {errors.expiryDate && (
                    <p className="text-red-400 text-sm mt-1">{errors.expiryDate}</p>
                  )}
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-2 block">CVV</label>
                  <input
                    type="text"
                    value={paymentDetails.cvv}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      cvv: e.target.value.replace(/\D/g, '').slice(0, 4)
                    }))}
                    placeholder="123"
                    maxLength={4}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg 
                      text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400 ${
                        errors.cvv ? 'border-red-400/50' : 'border-white/20'
                      }`}
                  />
                  {errors.cvv && (
                    <p className="text-red-400 text-sm mt-1">{errors.cvv}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Cardholder Name</label>
                <input
                  type="text"
                  value={paymentDetails.cardholderName}
                  onChange={(e) => setPaymentDetails(prev => ({
                    ...prev,
                    cardholderName: e.target.value
                  }))}
                  placeholder="John Doe"
                  className={`w-full px-4 py-3 bg-white/10 border rounded-lg 
                    text-white placeholder-white/50 focus:outline-none 
                    focus:ring-2 focus:ring-blue-400 ${
                      errors.cardholderName ? 'border-red-400/50' : 'border-white/20'
                    }`}
                />
                {errors.cardholderName && (
                  <p className="text-red-400 text-sm mt-1">{errors.cardholderName}</p>
                )}
              </div>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={paymentDetails.saveCard}
                  onChange={(e) => setPaymentDetails(prev => ({
                    ...prev,
                    saveCard: e.target.checked
                  }))}
                  className="w-4 h-4 bg-white/10 border-white/20 rounded 
                    text-blue-500 focus:ring-blue-400"
                />
                <span className="text-white/80 text-sm">
                  Save card for future payments
                </span>
              </label>
            </div>
          )}

          {/* Bank Transfer Form */}
          {selectedMethod === 'bank_transfer' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                <p className="text-blue-200 text-sm">
                  <Info className="w-4 h-4 inline mr-1" />
                  Enter your bank account details for direct deposit
                </p>
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Account Number</label>
                <input
                  type="text"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails(prev => ({
                    ...prev,
                    accountNumber: e.target.value.replace(/\D/g, '')
                  }))}
                  placeholder="1234567890"
                  className={`w-full px-4 py-3 bg-white/10 border rounded-lg 
                    text-white placeholder-white/50 focus:outline-none 
                    focus:ring-2 focus:ring-blue-400 ${
                      errors.accountNumber ? 'border-red-400/50' : 'border-white/20'
                    }`}
                />
                {errors.accountNumber && (
                  <p className="text-red-400 text-sm mt-1">{errors.accountNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Transit Number</label>
                  <input
                    type="text"
                    value={bankDetails.transitNumber}
                    onChange={(e) => setBankDetails(prev => ({
                      ...prev,
                      transitNumber: e.target.value.replace(/\D/g, '').slice(0, 5)
                    }))}
                    placeholder="12345"
                    maxLength={5}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg 
                      text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400 ${
                        errors.transitNumber ? 'border-red-400/50' : 'border-white/20'
                      }`}
                  />
                  {errors.transitNumber && (
                    <p className="text-red-400 text-sm mt-1">{errors.transitNumber}</p>
                  )}
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-2 block">Institution Number</label>
                  <input
                    type="text"
                    value={bankDetails.institutionNumber}
                    onChange={(e) => setBankDetails(prev => ({
                      ...prev,
                      institutionNumber: e.target.value.replace(/\D/g, '').slice(0, 3)
                    }))}
                    placeholder="001"
                    maxLength={3}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg 
                      text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-blue-400 ${
                        errors.institutionNumber ? 'border-red-400/50' : 'border-white/20'
                      }`}
                  />
                  {errors.institutionNumber && (
                    <p className="text-red-400 text-sm mt-1">{errors.institutionNumber}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* e-Transfer Instructions */}
          {selectedMethod === 'e_transfer' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-400/30 rounded-lg">
                <p className="text-amber-200 font-medium mb-2">
                  Send e-Transfer to:
                </p>
                <div className="flex items-center justify-between bg-black/20 
                  rounded px-3 py-2 mb-2">
                  <span className="text-white font-mono">payments@indigenious.ca</span>
                  <button
                    onClick={() => navigator.clipboard.writeText('payments@indigenious.ca')}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Copy className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <p className="text-amber-100/80 text-sm">
                  Use invoice #{invoiceId} as the transfer message
                </p>
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Your Email</label>
                <input
                  type="email"
                  value={paymentDetails.email}
                  onChange={(e) => setPaymentDetails(prev => ({
                    ...prev,
                    email: e.target.value
                  }))}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 
                    rounded-lg text-white placeholder-white/50 focus:outline-none 
                    focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Security Badge */}
      <div className="flex items-center justify-center space-x-4 text-white/60 text-sm">
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4" />
          <span>256-bit SSL Encryption</span>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>PCI DSS Compliant</span>
        </div>
      </div>

      {/* Process Payment Button */}
      <button
        onClick={handlePayment}
        disabled={isProcessing || paymentStatus === 'completed'}
        className={`w-full py-4 rounded-xl font-medium transition-all 
          flex items-center justify-center space-x-2 ${
            paymentStatus === 'completed'
              ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
              : 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 text-blue-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isProcessing ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : paymentStatus === 'completed' ? (
          <>
            <Check className="w-5 h-5" />
            <span>Payment Successful</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            <span>Pay {formatCurrency(totalAmount, currency)}</span>
          </>
        )}
      </button>

      {/* Error Message */}
      {paymentStatus === 'failed' && (
        <div className="p-4 bg-red-500/10 border border-red-400/30 rounded-lg">
          <p className="text-red-300">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Payment failed. Please check your details and try again.
          </p>
        </div>
      )}
    </div>
  )
}