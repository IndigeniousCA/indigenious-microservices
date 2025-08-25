// Banking Integration Component
// Connect and manage bank accounts

import { useState } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building, Plus, RefreshCw, Shield, CheckCircle, 
  AlertCircle, XCircle, Link2, Wallet, TrendingUp,
  Eye, EyeOff, Download, Clock, DollarSign, Activity
} from 'lucide-react'
import { useBanking } from '../hooks/useBanking'
import type { BankingIntegration as BankingIntegrationType, ConnectedBankAccount } from '../types/financial.types'

interface BankingIntegrationProps {
  vendorId: string
}

export function BankingIntegration({ vendorId }: BankingIntegrationProps) {
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [showBalances, setShowBalances] = useState(true)
  
  const {
    integrations,
    loading,
    connectBank,
    disconnectBank,
    syncAccounts,
    getTransactions
  } = useBanking(vendorId)

  // Calculate total balance
  const totalBalance = integrations.reduce((sum, integration) => 
    sum + integration.accounts.reduce((accSum, acc) => 
      accSum + (acc.currentBalance || 0), 0
    ), 0
  )

  const availableBalance = integrations.reduce((sum, integration) => 
    sum + integration.accounts.reduce((accSum, acc) => 
      accSum + (acc.availableBalance || 0), 0
    ), 0
  )

  // Provider info
  const providers = [
    {
      id: 'plaid',
      name: 'Plaid',
      description: 'Connect to 11,000+ financial institutions',
      logo: '🏦',
      popular: true
    },
    {
      id: 'flinks',
      name: 'Flinks',
      description: 'Canadian banking integration',
      logo: '🍁',
      popular: true
    },
    {
      id: 'manual',
      name: 'Manual Entry',
      description: 'Manually add bank account details',
      logo: '✏️',
      popular: false
    }
  ]

  const handleConnect = async (provider: string) => {
    try {
      await connectBank(provider)
      setShowConnectModal(false)
      setSelectedProvider(null)
    } catch (error) {
      logger.error('Failed to connect bank:', error)
    }
  }

  const handleSync = async (integrationId: string) => {
    try {
      await syncAccounts(integrationId)
    } catch (error) {
      logger.error('Failed to sync accounts:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Balance</span>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {showBalances ? (
                <Eye className="w-4 h-4 text-white/60" />
              ) : (
                <EyeOff className="w-4 h-4 text-white/60" />
              )}
            </button>
          </div>
          <p className="text-2xl font-bold text-white">
            {showBalances ? `$${totalBalance.toLocaleString()}` : '••••••'}
          </p>
          <p className="text-sm text-white/60 mt-1">
            Across {integrations.reduce((sum, i) => sum + i.accounts.length, 0)} accounts
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Available</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {showBalances ? `$${availableBalance.toLocaleString()}` : '••••••'}
          </p>
          <p className="text-sm text-white/60 mt-1">
            Ready to use
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Connected Banks</span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{integrations.length}</p>
          <p className="text-sm text-white/60 mt-1">
            {integrations.filter(i => i.connectionStatus === 'connected').length} active
          </p>
        </div>
      </div>

      {/* Connected Banks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Connected Banks</h3>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowConnectModal(true)}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border 
              border-blue-400/50 rounded-lg text-blue-100 font-medium 
              transition-all duration-200 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Connect Bank
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : integrations.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 text-center">
            <Building className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No banks connected</h3>
            <p className="text-white/60 mb-6">
              Connect your bank accounts to track transactions and manage payments
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowConnectModal(true)}
              className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border 
                border-blue-400/50 rounded-xl text-blue-100 font-medium 
                transition-all duration-200"
            >
              Connect Your First Bank
            </motion.button>
          </div>
        ) : (
          integrations.map((integration, index) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden"
            >
              {/* Bank Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {integration.institutionLogo ? (
                      <img 
                        src={integration.institutionLogo} 
                        alt={integration.institutionName}
                        className="w-12 h-12 rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                        <Building className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-white">
                        {integration.institutionName || 'Financial Institution'}
                      </h3>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full 
                          text-xs font-medium ${
                          integration.connectionStatus === 'connected'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : integration.connectionStatus === 'error'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {integration.connectionStatus === 'connected' && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {integration.connectionStatus === 'error' && (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {integration.connectionStatus.toUpperCase()}
                        </span>
                        {integration.lastSync && (
                          <span className="text-xs text-white/60">
                            Last synced {new Date(integration.lastSync).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSync(integration.id)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Sync Accounts"
                    >
                      <RefreshCw className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={() => disconnectBank(integration.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Disconnect"
                    >
                      <XCircle className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Accounts */}
              <div className="p-6">
                <div className="space-y-3">
                  {integration.accounts.map((account) => (
                    <div 
                      key={account.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{account.accountName}</p>
                        <p className="text-sm text-white/60">
                          {account.accountType} • ••••{account.accountId.slice(-4)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          {showBalances 
                            ? `$${(account.currentBalance || 0).toLocaleString()}`
                            : '••••••'
                          }
                        </p>
                        <p className="text-sm text-white/60">
                          {account.currency || 'CAD'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Permissions */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-sm font-medium text-white mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-2">
                    {integration.permissions.viewBalance && (
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 
                        text-xs rounded-full flex items-center">
                        <Eye className="w-3 h-3 mr-1" />
                        View Balance
                      </span>
                    )}
                    {integration.permissions.viewTransactions && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-300 
                        text-xs rounded-full flex items-center">
                        <Activity className="w-3 h-3 mr-1" />
                        View Transactions
                      </span>
                    )}
                    {integration.permissions.initiatePayments && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 
                        text-xs rounded-full flex items-center">
                        <DollarSign className="w-3 h-3 mr-1" />
                        Make Payments
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Security Notice */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-100 mb-2">Bank-Level Security</h4>
            <p className="text-sm text-blue-100/80">
              Your banking credentials are never stored on our servers. We use industry-leading 
              encryption and secure tokens to access your financial data. You can revoke access 
              at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Connect Bank Modal */}
      <AnimatePresence>
        {showConnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConnectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-white/20 rounded-2xl max-w-2xl w-full"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building className="w-6 h-6 text-white" />
                    <h2 className="text-xl font-semibold text-white">Connect Bank Account</h2>
                  </div>
                  <button
                    onClick={() => setShowConnectModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {!selectedProvider ? (
                  <>
                    <p className="text-white/60 mb-6">
                      Choose a provider to securely connect your bank accounts
                    </p>
                    
                    <div className="space-y-3">
                      {providers.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedProvider(provider.id)}
                          className="w-full p-4 bg-white/5 hover:bg-white/10 border 
                            border-white/10 hover:border-white/20 rounded-xl 
                            transition-all duration-200 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="text-2xl">{provider.logo}</div>
                              <div>
                                <h3 className="font-medium text-white">{provider.name}</h3>
                                <p className="text-sm text-white/60">{provider.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {provider.popular && (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 
                                  text-xs rounded-full">
                                  Popular
                                </span>
                              )}
                              <ChevronRight className="w-5 h-5 text-white/40" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 mb-6">
                      <button
                        onClick={() => setSelectedProvider(null)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        ← Back
                      </button>
                      <span className="text-white/40">/</span>
                      <span className="text-white">
                        {providers.find(p => p.id === selectedProvider)?.name}
                      </span>
                    </div>

                    {selectedProvider === 'manual' ? (
                      <div className="space-y-4">
                        <p className="text-white/60">
                          Manually enter your bank account details for payment processing
                        </p>
                        
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                              text-white placeholder-white/40 focus:border-blue-400/50 
                              focus:outline-none transition-colors"
                            placeholder="Enter bank name"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Transit Number
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                                text-white placeholder-white/40 focus:border-blue-400/50 
                                focus:outline-none transition-colors"
                              placeholder="12345"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Institution Number
                            </label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                                text-white placeholder-white/40 focus:border-blue-400/50 
                                focus:outline-none transition-colors"
                              placeholder="001"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Account Number
                          </label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg 
                              text-white placeholder-white/40 focus:border-blue-400/50 
                              focus:outline-none transition-colors"
                            placeholder="1234567890"
                          />
                        </div>
                        
                        <button
                          onClick={() => handleConnect('manual')}
                          className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border 
                            border-blue-400/50 rounded-xl text-blue-100 font-medium 
                            transition-all duration-200"
                        >
                          Add Bank Account
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 
                          bg-blue-500/20 rounded-full mb-4">
                          <Link2 className="w-8 h-8 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Ready to Connect
                        </h3>
                        <p className="text-white/60 mb-6">
                          You'll be redirected to {providers.find(p => p.id === selectedProvider)?.name} 
                          to securely connect your bank account
                        </p>
                        <button
                          onClick={() => handleConnect(selectedProvider)}
                          className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border 
                            border-blue-400/50 rounded-xl text-blue-100 font-medium 
                            transition-all duration-200"
                        >
                          Continue to {providers.find(p => p.id === selectedProvider)?.name}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Security Note */}
                <div className="mt-6 p-4 bg-white/5 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-white/60 mt-0.5" />
                    <p className="text-xs text-white/60">
                      Your data is encrypted and secure. We never store your banking credentials.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}