// Payment Processing Component
// Handle payments, transactions, and payment methods

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, Building, Wallet, Send, Clock, CheckCircle,
  AlertCircle, Plus, Search, Filter, Download, Shield,
  TrendingUp, DollarSign, Calendar, FileText, ChevronRight,
  Zap, Lock, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { PaymentMethodSetup } from './PaymentMethodSetup'
import { ProcessPayment } from './ProcessPayment'
import { usePayments } from '../hooks/usePayments'
import type { Payment, PaymentMethod, PaymentStatus } from '../types/financial.types'

interface PaymentProcessingProps {
  vendorId: string
  userRole: 'vendor' | 'buyer' | 'admin'
}

export function PaymentProcessing({ vendorId, userRole }: PaymentProcessingProps) {
  const [showMethodSetup, setShowMethodSetup] = useState(false)
  const [showProcessPayment, setShowProcessPayment] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [filter, setFilter] = useState({
    status: 'all' as PaymentStatus | 'all',
    method: 'all' as PaymentMethod | 'all',
    dateRange: 'month' as 'week' | 'month' | 'quarter' | 'year'
  })

  const {
    payments,
    paymentMethods,
    paymentStats,
    loading,
    processPayment,
    addPaymentMethod,
    removePaymentMethod
  } = usePayments(vendorId, filter)

  // Get payment method icon
  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'credit_card':
        return CreditCard
      case 'eft':
      case 'wire':
      case 'ach':
        return Building
      case 'interac':
        return Zap
      case 'crypto':
        return Wallet
      default:
        return DollarSign
    }
  }

  // Get status color
  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-400/30'
      case 'processing':
        return 'text-blue-400 bg-blue-500/20 border-blue-400/30'
      case 'pending':
        return 'text-amber-400 bg-amber-500/20 border-amber-400/30'
      case 'failed':
        return 'text-red-400 bg-red-500/20 border-red-400/30'
      case 'refunded':
        return 'text-purple-400 bg-purple-500/20 border-purple-400/30'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-400/30'
    }
  }

  // Format payment method
  const formatPaymentMethod = (method: PaymentMethod, details?: any) => {
    switch (method) {
      case 'credit_card':
        return `•••• ${details?.cardLast4 || '****'}`
      case 'eft':
        return 'Bank Transfer (EFT)'
      case 'wire':
        return 'Wire Transfer'
      case 'interac':
        return 'Interac e-Transfer'
      case 'crypto':
        return `Crypto (${details?.cryptoNetwork || 'ETH'})`
      default:
        return method.toUpperCase()
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Processed</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${paymentStats.totalProcessed.toLocaleString()}
          </p>
          <p className="text-sm text-white/60 mt-1">
            {paymentStats.transactionCount} transactions
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Pending</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${paymentStats.pendingAmount.toLocaleString()}
          </p>
          <p className="text-sm text-white/60 mt-1">
            {paymentStats.pendingCount} payments
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Success Rate</span>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {paymentStats.successRate.toFixed(1)}%
          </p>
          <p className="text-sm text-white/60 mt-1">
            Last 30 days
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Avg Transaction</span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            ${paymentStats.averageTransaction.toLocaleString()}
          </p>
          <p className="text-sm text-white/60 mt-1">
            Per payment
          </p>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Payment Methods</h3>
          {userRole === 'vendor' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowMethodSetup(true)}
              className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border 
                border-blue-400/50 rounded-lg text-blue-100 text-sm font-medium 
                transition-all duration-200 flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Method
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods.map((method) => {
            const Icon = getMethodIcon(method.type)
            
            return (
              <div
                key={method.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 
                  hover:bg-white/10 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {method.isDefault && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 
                      text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
                
                <p className="font-medium text-white mb-1">
                  {formatPaymentMethod(method.type, method.details)}
                </p>
                <p className="text-sm text-white/60">
                  {method.name || method.type.replace('_', ' ').toUpperCase()}
                </p>
                
                {method.lastUsed && (
                  <p className="text-xs text-white/40 mt-2">
                    Last used {new Date(method.lastUsed).toLocaleDateString()}
                  </p>
                )}
              </div>
            )
          })}

          {/* Add Payment Method Card */}
          {userRole === 'vendor' && (
            <button
              onClick={() => setShowMethodSetup(true)}
              className="bg-white/5 rounded-xl p-4 border border-white/10 
                border-dashed hover:bg-white/10 hover:border-white/20 
                transition-all duration-200 flex flex-col items-center 
                justify-center min-h-[120px]"
            >
              <Plus className="w-8 h-8 text-white/40 mb-2" />
              <span className="text-sm text-white/60">Add Payment Method</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search payments..."
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                  text-white placeholder-white/40 focus:border-blue-400/50 
                  focus:outline-none transition-colors"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value as unknown }))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="all" className="bg-gray-800">All Status</option>
              <option value="pending" className="bg-gray-800">Pending</option>
              <option value="processing" className="bg-gray-800">Processing</option>
              <option value="completed" className="bg-gray-800">Completed</option>
              <option value="failed" className="bg-gray-800">Failed</option>
              <option value="refunded" className="bg-gray-800">Refunded</option>
            </select>

            {/* Method Filter */}
            <select
              value={filter.method}
              onChange={(e) => setFilter(prev => ({ ...prev, method: e.target.value as unknown }))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                focus:border-blue-400/50 focus:outline-none appearance-none"
            >
              <option value="all" className="bg-gray-800">All Methods</option>
              <option value="credit_card" className="bg-gray-800">Credit Card</option>
              <option value="eft" className="bg-gray-800">Bank Transfer</option>
              <option value="interac" className="bg-gray-800">Interac</option>
              <option value="wire" className="bg-gray-800">Wire</option>
              <option value="crypto" className="bg-gray-800">Crypto</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            {/* Process Payment */}
            {userRole === 'buyer' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowProcessPayment(true)}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border 
                  border-emerald-400/50 rounded-lg text-emerald-100 font-medium 
                  transition-all duration-200 flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Make Payment
              </motion.button>
            )}

            {/* Export */}
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
              border-white/20 rounded-lg text-white font-medium 
              transition-all duration-200 flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
            <DollarSign className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">No payments found</p>
          </div>
        ) : (
          payments.map((payment, index) => {
            const Icon = getMethodIcon(payment.paymentMethod)
            const isIncoming = userRole === 'vendor'
            
            return (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedPayment(payment.id)}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl 
                  p-6 cursor-pointer hover:bg-white/15 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${
                      isIncoming ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                    }`}>
                      {isIncoming ? (
                        <ArrowDownRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-6 h-6 text-blue-400" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-white">
                          {payment.description || `Payment from ${payment.payerName}`}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                          border ${getStatusColor(payment.status)}`}>
                          {payment.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-white/60">
                        <span>{payment.payerName}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Icon className="w-3 h-3 mr-1" />
                          {formatPaymentMethod(payment.paymentMethod, payment.paymentDetails)}
                        </span>
                        <span>•</span>
                        <span>{new Date(payment.initiatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${
                        isIncoming ? 'text-emerald-400' : 'text-white'
                      }`}>
                        {isIncoming ? '+' : '-'}${payment.amount.toLocaleString()}
                      </p>
                      {payment.processingFee > 0 && (
                        <p className="text-sm text-white/60">
                          Fee: ${payment.processingFee.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </div>
                </div>

                {/* Additional Info */}
                {payment.invoiceId && (
                  <div className="mt-3 flex items-center space-x-2 text-sm text-white/60">
                    <FileText className="w-4 h-4" />
                    <span>Invoice #{payment.invoiceId}</span>
                  </div>
                )}

                {/* Security Badge */}
                {payment.amlChecked && (
                  <div className="mt-3 flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400">Security Verified</span>
                  </div>
                )}
              </motion.div>
            )
          })
        )}
      </div>

      {/* Payment Method Setup Modal */}
      <AnimatePresence>
        {showMethodSetup && (
          <PaymentMethodSetup
            vendorId={vendorId}
            onClose={() => setShowMethodSetup(false)}
            onSave={addPaymentMethod}
          />
        )}
      </AnimatePresence>

      {/* Process Payment Modal */}
      <AnimatePresence>
        {showProcessPayment && (
          <ProcessPayment
            vendorId={vendorId}
            paymentMethods={paymentMethods}
            onClose={() => setShowProcessPayment(false)}
            onProcess={processPayment}
          />
        )}
      </AnimatePresence>
    </div>
  )
}