// Blockchain Dashboard Component
// Central hub for all blockchain operations and monitoring

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Blocks, Shield, Wallet, Activity, Globe, TrendingUp,
  Clock, AlertCircle, CheckCircle, ChevronRight, Eye,
  Send, ArrowUpRight, ArrowDownRight, Link, Zap,
  Database, Lock, Key, CreditCard, BarChart3, Coins
} from 'lucide-react'
import { BlockchainIdentity, SmartContract, Transaction, CommunityToken } from '../types/nextgen.types'

export function BlockchainDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'identity' | 'contracts' | 'transactions' | 'tokens'>('overview')
  const [selectedContract, setSelectedContract] = useState<SmartContract | null>(null)
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected')

  // Mock blockchain data
  const identity: BlockchainIdentity = {
    did: 'did:indigenous:1234567890',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b123',
    publicKey: '0x04bfcab8b45a9e6c8e7d5a3f2c4d1e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e',
    verifications: [
      {
        type: 'nation',
        issuer: 'Cree Nation Registry',
        issuedAt: '2023-01-15',
        proof: '0xabcdef...',
        metadata: { bandNumber: '123', treaty: '6' }
      },
      {
        type: 'business',
        issuer: 'Indigenous Business Registry',
        issuedAt: '2023-06-20',
        proof: '0x123456...',
        metadata: { businessNumber: 'IB-2023-001' }
      }
    ],
    reputation: 850,
    createdAt: '2023-01-01',
    lastUpdated: '2024-01-15'
  }

  const activeContracts: SmartContract[] = [
    {
      id: 'contract-1',
      address: '0x123...abc',
      type: 'procurement',
      name: 'Highway Construction RFQ',
      description: 'Smart contract for automated bid evaluation and milestone payments',
      creator: '0xGovt...123',
      createdAt: '2024-01-10',
      status: 'active',
      participants: ['0x742...123', '0xAbc...def', '0xXyz...789'],
      terms: {
        value: 2500000,
        currency: 'CAD',
        milestones: [
          {
            id: 'ms-1',
            name: 'Design Completion',
            description: 'Complete architectural designs',
            value: 500000,
            dueDate: '2024-03-01',
            status: 'completed'
          },
          {
            id: 'ms-2',
            name: 'Foundation',
            description: 'Complete foundation work',
            value: 1000000,
            dueDate: '2024-06-01',
            status: 'pending'
          }
        ],
        conditions: [
          'Indigenous content minimum 33%',
          'Environmental assessment required',
          'Monthly progress reports'
        ],
        disputeResolution: 'Indigenous Business Arbitration Council'
      },
      transactions: []
    }
  ]

  const recentTransactions: Transaction[] = [
    {
      hash: '0xabcd...1234',
      from: '0xGovt...123',
      to: '0x742d...123',
      value: 500000,
      timestamp: '2024-01-15T10:30:00Z',
      blockNumber: 12345678,
      gasUsed: 21000,
      status: 'confirmed'
    },
    {
      hash: '0xefgh...5678',
      from: '0x742d...123',
      to: '0xSupp...456',
      value: 50000,
      timestamp: '2024-01-14T15:45:00Z',
      blockNumber: 12345677,
      gasUsed: 45000,
      status: 'confirmed'
    }
  ]

  const communityToken: CommunityToken = {
    symbol: 'INDIG',
    name: 'Indigenous Business Token',
    totalSupply: 100000000,
    decimals: 18,
    holders: 3456,
    price: 1.25,
    marketCap: 125000000,
    uses: [
      { type: 'governance', description: 'Vote on platform decisions', allocation: 30 },
      { type: 'reward', description: 'Community contributions', allocation: 40 },
      { type: 'payment', description: 'Platform services', allocation: 20 },
      { type: 'staking', description: 'Reputation building', allocation: 10 }
    ]
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md 
        border border-purple-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Blocks className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Blockchain Operations</h2>
              <p className="text-white/70">Secure, transparent, sovereign transactions</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full
              ${networkStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-300' :
                networkStatus === 'connecting' ? 'bg-amber-500/20 text-amber-300' :
                'bg-red-500/20 text-red-300'}`}>
              <Activity className="w-4 h-4" />
              <span className="text-sm capitalize">{networkStatus}</span>
            </div>
            <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
              border border-purple-400/50 rounded-lg text-purple-200 transition-colors
              flex items-center space-x-2">
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-xs text-emerald-300">+15</span>
          </div>
          <p className="text-2xl font-bold text-white">{identity.reputation}</p>
          <p className="text-white/60 text-sm">Reputation Score</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Link className="w-5 h-5 text-purple-400" />
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{activeContracts.length}</p>
          <p className="text-white/60 text-sm">Active Contracts</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <Clock className="w-4 h-4 text-white/40" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(activeContracts.reduce((sum, c) => sum + c.terms.value, 0))}
          </p>
          <p className="text-white/60 text-sm">Contract Value</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-emerald-300">+2.3%</span>
          </div>
          <p className="text-2xl font-bold text-white">{communityToken.holders}</p>
          <p className="text-white/60 text-sm">Token Holders</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg overflow-x-auto">
        {(['overview', 'identity', 'contracts', 'transactions', 'tokens'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap
              transition-all ${
                activeTab === tab
                  ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Wallet Overview */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                <span>Wallet Overview</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">Wallet Address</p>
                  <p className="text-white font-mono">{formatAddress(identity.address)}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Network</p>
                  <p className="text-white">Polygon Mainnet</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Gas Balance</p>
                  <p className="text-white">0.25 MATIC</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-400/50 rounded-lg text-blue-200 transition-colors
                  flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
                <button className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 
                  border border-emerald-400/50 rounded-lg text-emerald-200 transition-colors
                  flex items-center space-x-2">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Receive</span>
                </button>
                <button className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 
                  border border-purple-400/50 rounded-lg text-purple-200 transition-colors
                  flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Swap</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <span>Recent Activity</span>
              </h3>

              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div key={tx.hash} className="flex items-center justify-between p-3 
                    bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        tx.to === identity.address 
                          ? 'bg-emerald-500/20' 
                          : 'bg-blue-500/20'
                      }`}>
                        {tx.to === identity.address ? (
                          <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {tx.to === identity.address ? 'Received' : 'Sent'}
                        </p>
                        <p className="text-white/60 text-sm">
                          {tx.to === identity.address ? `From ${formatAddress(tx.from)}` : `To ${formatAddress(tx.to)}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-white font-medium">{formatCurrency(tx.value)}</p>
                      <p className="text-white/60 text-sm">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Balance */}
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-md 
              border border-amber-400/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>Community Token</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">Balance</p>
                  <p className="text-2xl font-bold text-white">5,420</p>
                  <p className="text-amber-300 text-sm">{communityToken.symbol}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Value</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(5420 * communityToken.price)}
                  </p>
                  <p className="text-emerald-300 text-sm">+2.3% today</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Staked</p>
                  <p className="text-2xl font-bold text-white">2,000</p>
                  <p className="text-purple-300 text-sm">APY 12%</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Rewards</p>
                  <p className="text-2xl font-bold text-white">124</p>
                  <p className="text-blue-300 text-sm">This month</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'identity' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Decentralized Identity
                  </h3>
                  <p className="text-white/60">Self-sovereign Indigenous identity on blockchain</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 
                    rounded-full text-sm flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/60 text-sm mb-1">DID</p>
                    <p className="text-white font-mono text-sm break-all">{identity.did}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-white/60 text-sm mb-1">Public Key</p>
                    <p className="text-white font-mono text-sm break-all">
                      {formatAddress(identity.publicKey)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">Verifications</h4>
                  <div className="space-y-3">
                    {identity.verifications.map((verification, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-white font-medium capitalize">
                              {verification.type} Verification
                            </p>
                            <p className="text-white/60 text-sm">
                              Issued by {verification.issuer}
                            </p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                          <div>
                            <p className="text-white/60">Issued</p>
                            <p className="text-white">
                              {new Date(verification.issuedAt).toLocaleDateString()}
                            </p>
                          </div>
                          {verification.metadata.bandNumber && (
                            <div>
                              <p className="text-white/60">Band Number</p>
                              <p className="text-white">{verification.metadata.bandNumber}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-300 font-medium mb-1">Reputation Score</p>
                      <p className="text-3xl font-bold text-white">{identity.reputation}</p>
                      <p className="text-white/60 text-sm">Excellent standing</p>
                    </div>
                    <BarChart3 className="w-12 h-12 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-blue-200 font-medium mb-1">Data Sovereignty</p>
                  <p className="text-blue-100/80 text-sm">
                    Your identity data is stored on-chain and controlled entirely by you. 
                    No central authority can revoke or modify your credentials.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'contracts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {activeContracts.map((contract, index) => (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                  hover:bg-white/15 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{contract.name}</h3>
                    <p className="text-white/60">{contract.description}</p>
                    <div className="flex items-center space-x-3 mt-2 text-sm">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full capitalize">
                        {contract.type}
                      </span>
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full capitalize">
                        {contract.status}
                      </span>
                      <span className="text-white/60">
                        {formatAddress(contract.address)}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedContract(contract)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-white/60" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-white/60 text-sm">Contract Value</p>
                    <p className="text-xl font-bold text-white">
                      {formatCurrency(contract.terms.value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Participants</p>
                    <p className="text-xl font-bold text-white">{contract.participants.length}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Progress</p>
                    <p className="text-xl font-bold text-white">
                      {contract.terms.milestones?.filter(m => m.status === 'completed').length || 0}/
                      {contract.terms.milestones?.length || 0}
                    </p>
                  </div>
                </div>

                {contract.terms.milestones && (
                  <div className="space-y-2">
                    {contract.terms.milestones.map(milestone => (
                      <div key={milestone.id} className="flex items-center justify-between 
                        p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {milestone.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-400" />
                          )}
                          <div>
                            <p className="text-white">{milestone.name}</p>
                            <p className="text-white/60 text-sm">
                              Due {new Date(milestone.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-white font-medium">
                          {formatCurrency(milestone.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}

            <button className="w-full px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 
              border border-purple-400/30 rounded-lg text-purple-200 transition-colors
              flex items-center justify-center space-x-2">
              <Link className="w-4 h-4" />
              <span>Deploy New Contract</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}