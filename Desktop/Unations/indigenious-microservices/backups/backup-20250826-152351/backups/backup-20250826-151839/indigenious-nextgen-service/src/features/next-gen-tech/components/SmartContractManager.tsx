// Smart Contract Manager Component
// Create, deploy, and manage smart contracts for procurement and payments

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileCode, Plus, Shield, Rocket, Settings, AlertTriangle,
  CheckCircle, Clock, DollarSign, Users, Calendar, Lock,
  Code, Database, Zap, TrendingUp, Award, ChevronRight,
  Copy, ExternalLink, Info, Target, Milestone as MilestoneIcon, XCircle
} from 'lucide-react'
import { ContractType, ContractTerms, Milestone } from '../types/nextgen.types'

interface ContractTemplate {
  id: string
  type: ContractType
  name: string
  description: string
  features: string[]
  gasEstimate: number
  deploymentCost: number
  icon: any
  color: string
}

export function SmartContractManager() {
  const [activeTab, setActiveTab] = useState<'templates' | 'create' | 'deployed'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [contractForm, setContractForm] = useState({
    name: '',
    description: '',
    type: 'procurement' as ContractType,
    value: 0,
    currency: 'CAD',
    participants: [] as string[],
    milestones: [] as Milestone[]
  })
  const [showDeployModal, setShowDeployModal] = useState(false)

  // Contract templates
  const templates: ContractTemplate[] = [
    {
      id: 'temp-1',
      type: 'procurement',
      name: 'Procurement Contract',
      description: 'Automated RFQ evaluation, milestone tracking, and payment release',
      features: [
        'Multi-signature approval',
        'Milestone-based payments',
        'Automated scoring',
        'Dispute resolution',
        'Performance tracking'
      ],
      gasEstimate: 3500000,
      deploymentCost: 45,
      icon: FileCode,
      color: 'blue'
    },
    {
      id: 'temp-2',
      type: 'escrow',
      name: 'Escrow Service',
      description: 'Secure fund holding with conditional release based on deliverables',
      features: [
        'Secure fund locking',
        'Multi-party approval',
        'Time-based release',
        'Refund mechanisms',
        'Interest accrual'
      ],
      gasEstimate: 2800000,
      deploymentCost: 35,
      icon: Lock,
      color: 'emerald'
    },
    {
      id: 'temp-3',
      type: 'revenue_share',
      name: 'Revenue Sharing',
      description: 'Automatic distribution of revenues among Indigenous partners',
      features: [
        'Percentage-based splits',
        'Automatic distribution',
        'Tax withholding',
        'Transparent accounting',
        'Quarterly reporting'
      ],
      gasEstimate: 2200000,
      deploymentCost: 28,
      icon: Users,
      color: 'purple'
    },
    {
      id: 'temp-4',
      type: 'subscription',
      name: 'Subscription Model',
      description: 'Recurring payment automation for ongoing services',
      features: [
        'Auto-renewal',
        'Grace periods',
        'Usage tracking',
        'Tiered pricing',
        'Cancellation handling'
      ],
      gasEstimate: 2500000,
      deploymentCost: 32,
      icon: Calendar,
      color: 'amber'
    }
  ]

  // Mock deployed contracts
  const deployedContracts = [
    {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f5b890',
      name: 'Highway Maintenance RFQ',
      type: 'procurement',
      deployedAt: '2024-01-10',
      status: 'active',
      participants: 5,
      value: 2500000
    },
    {
      address: '0x123d35Cc6634C0532925a3b844Bc9e7595f5b456',
      name: 'IT Services Escrow',
      type: 'escrow',
      deployedAt: '2024-01-08',
      status: 'active',
      participants: 3,
      value: 150000
    }
  ]

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: `ms-${Date.now()}`,
      name: '',
      description: '',
      value: 0,
      dueDate: '',
      status: 'pending'
    }
    setContractForm({
      ...contractForm,
      milestones: [...contractForm.milestones, newMilestone]
    })
  }

  const updateMilestone = (id: string, field: keyof Milestone, value: unknown) => {
    setContractForm({
      ...contractForm,
      milestones: contractForm.milestones.map(m => 
        m.id === id ? { ...m, [field]: value } : m
      )
    })
  }

  const removeMilestone = (id: string) => {
    setContractForm({
      ...contractForm,
      milestones: contractForm.milestones.filter(m => m.id !== id)
    })
  }

  const calculateGasCost = (gasEstimate: number) => {
    const gasPrice = 30 // Gwei
    const maticPrice = 0.8 // USD
    return ((gasEstimate * gasPrice) / 1e9 * maticPrice).toFixed(2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-md 
        border border-indigo-400/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Smart Contract Manager</h2>
            <p className="text-white/70">
              Deploy and manage automated business contracts on blockchain
            </p>
          </div>
          
          <button
            onClick={() => setActiveTab('create')}
            className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 
              border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors 
              flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Contract</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-lg">
        {(['templates', 'create', 'deployed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium capitalize 
              transition-all ${
                activeTab === tab
                  ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30'
                  : 'text-white/60 hover:text-white/80'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'templates' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {templates.map((template, index) => {
              const Icon = template.icon
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                    hover:bg-white/15 transition-all cursor-pointer"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-3 bg-${template.color}-500/20 rounded-xl`}>
                        <Icon className={`w-6 h-6 text-${template.color}-400`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                        <p className="text-white/60 text-sm mt-1">{template.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-white/60 text-sm mb-2">Key Features</p>
                      <div className="space-y-1">
                        {template.features.slice(0, 3).map((feature, i) => (
                          <div key={i} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span className="text-white/80">{feature}</span>
                          </div>
                        ))}
                        {template.features.length > 3 && (
                          <p className="text-white/50 text-sm">
                            +{template.features.length - 3} more features
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-white/60">Gas Estimate</p>
                          <p className="text-white">{template.gasEstimate.toLocaleString()} gas</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60">Deployment Cost</p>
                          <p className="text-white">${template.deploymentCost}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setContractForm({ ...contractForm, type: template.type })
                      setActiveTab('create')
                    }}
                    className="w-full mt-4 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 
                      border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors
                      flex items-center justify-center space-x-2"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>Use Template</span>
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {activeTab === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contract Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/80 text-sm mb-1 block">Contract Name</label>
                    <input
                      type="text"
                      value={contractForm.name}
                      onChange={(e) => setContractForm({ ...contractForm, name: e.target.value })}
                      placeholder="e.g., Highway Maintenance RFQ"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white placeholder-white/50 focus:outline-none 
                        focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="text-white/80 text-sm mb-1 block">Contract Type</label>
                    <select
                      value={contractForm.type}
                      onChange={(e) => setContractForm({ ...contractForm, type: e.target.value as ContractType })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="procurement" className="bg-gray-800">Procurement</option>
                      <option value="escrow" className="bg-gray-800">Escrow</option>
                      <option value="revenue_share" className="bg-gray-800">Revenue Share</option>
                      <option value="subscription" className="bg-gray-800">Subscription</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-1 block">Description</label>
                  <textarea
                    value={contractForm.description}
                    onChange={(e) => setContractForm({ ...contractForm, description: e.target.value })}
                    placeholder="Describe the purpose and scope of this contract"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 
                      rounded-lg text-white placeholder-white/50 focus:outline-none 
                      focus:ring-2 focus:ring-indigo-400 resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/80 text-sm mb-1 block">Total Value</label>
                    <input
                      type="number"
                      value={contractForm.value}
                      onChange={(e) => setContractForm({ ...contractForm, value: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white placeholder-white/50 focus:outline-none 
                        focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="text-white/80 text-sm mb-1 block">Currency</label>
                    <select
                      value={contractForm.currency}
                      onChange={(e) => setContractForm({ ...contractForm, currency: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 
                        rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="CAD" className="bg-gray-800">CAD</option>
                      <option value="USD" className="bg-gray-800">USD</option>
                      <option value="MATIC" className="bg-gray-800">MATIC</option>
                      <option value="INDIG" className="bg-gray-800">INDIG Token</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {contractForm.type === 'procurement' && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Milestones</h3>
                  <button
                    onClick={addMilestone}
                    className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 
                      border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors
                      flex items-center space-x-1 text-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Milestone</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {contractForm.milestones.map((milestone, index) => (
                    <div key={milestone.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <MilestoneIcon className="w-4 h-4 text-indigo-400" />
                          <span className="text-white font-medium">Milestone {index + 1}</span>
                        </div>
                        <button
                          onClick={() => removeMilestone(milestone.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={milestone.name}
                          onChange={(e) => updateMilestone(milestone.id, 'name', e.target.value)}
                          placeholder="Milestone name"
                          className="px-3 py-2 bg-white/10 border border-white/20 
                            rounded-lg text-white placeholder-white/50 focus:outline-none 
                            focus:ring-2 focus:ring-indigo-400 text-sm"
                        />
                        <input
                          type="number"
                          value={milestone.value}
                          onChange={(e) => updateMilestone(milestone.id, 'value', Number(e.target.value))}
                          placeholder="Value"
                          className="px-3 py-2 bg-white/10 border border-white/20 
                            rounded-lg text-white placeholder-white/50 focus:outline-none 
                            focus:ring-2 focus:ring-indigo-400 text-sm"
                        />
                        <input
                          type="date"
                          value={milestone.dueDate}
                          onChange={(e) => updateMilestone(milestone.id, 'dueDate', e.target.value)}
                          className="px-3 py-2 bg-white/10 border border-white/20 
                            rounded-lg text-white placeholder-white/50 focus:outline-none 
                            focus:ring-2 focus:ring-indigo-400 text-sm md:col-span-2"
                        />
                        <textarea
                          value={milestone.description}
                          onChange={(e) => updateMilestone(milestone.id, 'description', e.target.value)}
                          placeholder="Description"
                          className="px-3 py-2 bg-white/10 border border-white/20 
                            rounded-lg text-white placeholder-white/50 focus:outline-none 
                            focus:ring-2 focus:ring-indigo-400 text-sm resize-none md:col-span-2"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}

                  {contractForm.milestones.length === 0 && (
                    <div className="text-center py-8 text-white/50">
                      <MilestoneIcon className="w-8 h-8 mx-auto mb-2" />
                      <p>No milestones added yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="text-amber-200 font-medium mb-1">Smart Contract Benefits</p>
                  <ul className="space-y-1 text-amber-100/80 text-sm">
                    <li>• Automated execution reduces administrative costs by 60%</li>
                    <li>• Transparent terms visible to all participants</li>
                    <li>• Immutable record prevents contract tampering</li>
                    <li>• Instant payments upon milestone completion</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setActiveTab('templates')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                  border-white/20 rounded-lg text-white transition-colors"
              >
                Back to Templates
              </button>
              <button
                onClick={() => setShowDeployModal(true)}
                className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 
                  border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors
                  flex items-center space-x-2"
              >
                <Rocket className="w-4 h-4" />
                <span>Deploy Contract</span>
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'deployed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {deployedContracts.map((contract, index) => (
              <motion.div
                key={contract.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
                  hover:bg-white/15 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{contract.name}</h3>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full capitalize">
                        {contract.type}
                      </span>
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full capitalize">
                        {contract.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <Copy className="w-4 h-4 text-white/60" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <ExternalLink className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-white/60 text-sm">Address</p>
                    <p className="text-white font-mono text-sm">
                      {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Deployed</p>
                    <p className="text-white text-sm">
                      {new Date(contract.deployedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Participants</p>
                    <p className="text-white text-sm">{contract.participants}</p>
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Value</p>
                    <p className="text-white text-sm">
                      ${contract.value.toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deploy Modal */}
      <AnimatePresence>
        {showDeployModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeployModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-lg p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Deploy Smart Contract</h3>
              
              <div className="space-y-4">
                <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-indigo-300">Network</span>
                    <span className="text-white">Polygon Mainnet</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-indigo-300">Gas Estimate</span>
                    <span className="text-white">3,500,000 gas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-300">Deployment Cost</span>
                    <span className="text-white font-medium">$42.00</span>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                    <p className="text-amber-200 text-sm">
                      Contract deployment is permanent. Ensure all details are correct before proceeding.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setShowDeployModal(false)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border 
                      border-white/20 rounded-lg text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 
                    border border-indigo-400/50 rounded-lg text-indigo-200 transition-colors
                    flex items-center space-x-2">
                    <Rocket className="w-4 h-4" />
                    <span>Deploy Now</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}