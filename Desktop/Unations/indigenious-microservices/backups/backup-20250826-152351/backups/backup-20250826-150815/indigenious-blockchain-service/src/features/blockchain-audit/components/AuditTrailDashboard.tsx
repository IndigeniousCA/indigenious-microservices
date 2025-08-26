'use client'

import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { LiquidGlass, LiquidGlassCard, LiquidGlassButton } from '@/components/ui/LiquidGlass'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, Lock, CheckCircle, Clock, 
  FileText, Award, Users, TrendingUp,
  Download, ExternalLink, Search, Filter,
  Activity, Zap, AlertCircle, Database
} from 'lucide-react'
import { BlockchainAuditService, AuditRecord } from '../services/blockchain-service'
import QRCode from 'qrcode.react'

interface AuditTrailDashboardProps {
  rfqId?: string
  businessId?: string
}

export function AuditTrailDashboard({ rfqId, businessId }: AuditTrailDashboardProps) {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null)
  const [filter, setFilter] = useState<'all' | 'rfq' | 'bid' | 'contract' | 'compliance'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [blockchainStats, setBlockchainStats] = useState<unknown>(null)
  const [verificationResult, setVerificationResult] = useState<unknown>(null)
  const [certificate, setCertificate] = useState<unknown>(null)
  
  const blockchainService = new BlockchainAuditService({
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
    ipfsGateway: 'https://ipfs.io/ipfs/',
    chainId: 80001, // Polygon Mumbai
  })

  useEffect(() => {
    loadAuditTrail()
    loadBlockchainStats()
  }, [rfqId, businessId])

  const loadAuditTrail = async () => {
    setLoading(true)
    try {
      // Mock data for demo - in production, fetch from blockchain
      const mockRecords: AuditRecord[] = [
        {
          id: 'audit-1',
          rfqId: 'RFQ-2024-HC-125',
          action: 'rfq_created',
          actor: {
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
            businessName: 'Health Canada',
            role: 'government',
          },
          timestamp: new Date('2024-01-15T10:00:00'),
          blockNumber: 12345678,
          transactionHash: '0xabc123def456...',
          ipfsHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          details: {
            title: 'Solar Panel Installation',
            budget: { min: 250000, max: 500000 },
            requirements: ['Indigenous business', 'Solar certification'],
          },
          verified: true,
        },
        {
          id: 'audit-2',
          rfqId: 'RFQ-2024-HC-125',
          action: 'bid_submitted',
          actor: {
            address: '0x892d45Cc6634C0532925a3b844Bc9e7595f6E456',
            businessName: 'Northern Solar Tech',
            role: 'bidder',
          },
          timestamp: new Date('2024-01-20T14:30:00'),
          blockNumber: 12346789,
          transactionHash: '0xdef789ghi012...',
          details: {
            bidId: 'BID-001',
            bidHash: '0x789abc...',
          },
          verified: true,
        },
        {
          id: 'audit-3',
          rfqId: 'RFQ-2024-HC-125',
          action: 'compliance_verified',
          actor: {
            address: '0xsystem',
            businessName: 'Compliance Engine',
            role: 'system',
          },
          timestamp: new Date('2024-01-21T09:15:00'),
          blockNumber: 12347890,
          transactionHash: '0xghi345jkl678...',
          details: {
            score: 95,
            passed: true,
            issues: [],
          },
          verified: true,
        },
        {
          id: 'audit-4',
          rfqId: 'RFQ-2024-HC-125',
          action: 'contract_awarded',
          actor: {
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
            businessName: 'Health Canada',
            role: 'evaluator',
          },
          timestamp: new Date('2024-01-25T16:00:00'),
          blockNumber: 12348901,
          transactionHash: '0xjkl901mno234...',
          ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
          details: {
            winner: 'Northern Solar Tech',
            contractValue: 425000,
            evaluationScore: 92.5,
          },
          verified: true,
        },
      ]
      
      setAuditRecords(mockRecords)
    } catch (error) {
      logger.error('Error loading audit trail:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBlockchainStats = async () => {
    try {
      // Mock stats for demo
      setBlockchainStats({
        totalTransactions: 15234,
        totalRFQs: 1847,
        totalBids: 8756,
        totalContracts: 892,
        gasUsed: '125000000',
        averageBlockTime: 2.5,
        verifiedDocuments: 3421,
        activeParticipants: 487,
      })
    } catch (error) {
      logger.error('Error loading blockchain stats:', error)
    }
  }

  const generateCertificate = async () => {
    try {
      const cert = await blockchainService.generateCertificate(rfqId || 'RFQ-2024-HC-125')
      setCertificate(cert)
    } catch (error) {
      logger.error('Error generating certificate:', error)
    }
  }

  const verifyDocument = async (documentHash: string) => {
    try {
      const result = await blockchainService.verifyDocumentIntegrity(
        documentHash,
        rfqId || 'RFQ-2024-HC-125'
      )
      setVerificationResult(result)
    } catch (error) {
      logger.error('Error verifying document:', error)
    }
  }

  const getActionIcon = (action: AuditRecord['action']) => {
    switch (action) {
      case 'rfq_created':
        return FileText
      case 'bid_submitted':
        return Users
      case 'contract_awarded':
        return Award
      case 'compliance_verified':
        return Shield
      default:
        return Activity
    }
  }

  const getActionColor = (action: AuditRecord['action']) => {
    switch (action) {
      case 'rfq_created':
        return 'text-blue-400'
      case 'bid_submitted':
        return 'text-purple-400'
      case 'contract_awarded':
        return 'text-green-400'
      case 'compliance_verified':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  const filteredRecords = auditRecords.filter(record => {
    if (filter !== 'all' && !record.action.includes(filter)) return false
    if (searchTerm && !JSON.stringify(record).toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <LiquidGlass variant="aurora" intensity="strong" className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Blockchain Audit Trail
                </h1>
                <p className="text-sm text-white/60">
                  Immutable record of all procurement activities
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-green-400">Connected to Polygon</span>
              </div>
              <LiquidGlassButton onClick={generateCertificate}>
                <Download className="w-4 h-4 mr-2" />
                Generate Certificate
              </LiquidGlassButton>
            </div>
          </div>
        </LiquidGlass>

        {/* Stats Overview */}
        {blockchainStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <LiquidGlassCard variant="clear">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">
                    {blockchainStats.totalTransactions.toLocaleString()}
                  </p>
                  <p className="text-sm text-white/60">Total Transactions</p>
                </div>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard variant="frost">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">
                    {blockchainStats.totalRFQs.toLocaleString()}
                  </p>
                  <p className="text-sm text-white/60">RFQs Recorded</p>
                </div>
                <FileText className="w-8 h-8 text-purple-400" />
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard variant="aurora">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">
                    {blockchainStats.totalContracts.toLocaleString()}
                  </p>
                  <p className="text-sm text-white/60">Contracts Awarded</p>
                </div>
                <Award className="w-8 h-8 text-green-400" />
              </div>
            </LiquidGlassCard>

            <LiquidGlassCard variant="clear">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white">
                    {blockchainStats.verifiedDocuments.toLocaleString()}
                  </p>
                  <p className="text-sm text-white/60">Verified Documents</p>
                </div>
                <CheckCircle className="w-8 h-8 text-yellow-400" />
              </div>
            </LiquidGlassCard>
          </div>
        )}

        {/* Filter and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2 flex-1">
            {['all', 'rfq', 'bid', 'contract', 'compliance'].map((f) => (
              <LiquidGlassButton
                key={f}
                onClick={() => setFilter(f as unknown)}
                className={`px-4 py-2 ${
                  filter === f ? 'border-2 border-blue-400/50' : ''
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </LiquidGlassButton>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50"
            />
          </div>
        </div>

        {/* Audit Trail Timeline */}
        <LiquidGlassCard variant="clear">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-400" />
            Transaction Timeline
          </h2>
          
          {loading ? (
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-4"
              >
                <Shield className="w-16 h-16 text-blue-400" />
              </motion.div>
              <p className="text-white/60">Loading blockchain data...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record, index) => {
                const Icon = getActionIcon(record.action)
                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {index < filteredRecords.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-white/10" />
                    )}
                    
                    <div className="flex gap-4">
                      <div className={`p-3 rounded-full bg-white/10 ${getActionColor(record.action)}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1">
                        <LiquidGlass 
                          variant="frost" 
                          intensity="light" 
                          className="p-4 cursor-pointer hover:border-blue-400/50 transition-colors"
                          onClick={() => setSelectedRecord(record)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-white mb-1">
                                {record.action.split('_').map(word => 
                                  word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                              </h3>
                              <p className="text-sm text-white/70 mb-2">
                                by {record.actor.businessName} ({record.actor.role})
                              </p>
                              <div className="flex items-center gap-4 text-xs text-white/50">
                                <span>Block #{record.blockNumber}</span>
                                <span>{record.timestamp.toLocaleString()}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {record.verified && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                  <span className="text-xs text-green-400">Verified</span>
                                </div>
                              )}
                              <ExternalLink className="w-4 h-4 text-white/40" />
                            </div>
                          </div>
                          
                          {record.ipfsHash && (
                            <div className="mt-3 flex items-center gap-2 text-xs">
                              <Database className="w-3 h-3 text-blue-400" />
                              <span className="text-blue-400">IPFS: {record.ipfsHash.slice(0, 8)}...</span>
                            </div>
                          )}
                        </LiquidGlass>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </LiquidGlassCard>

        {/* Selected Record Details */}
        <AnimatePresence>
          {selectedRecord && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <LiquidGlassCard variant="aurora">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Transaction Details
                  </h3>
                  <LiquidGlassButton
                    onClick={() => setSelectedRecord(null)}
                    className="text-sm"
                  >
                    Close
                  </LiquidGlassButton>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-white/60 mb-1">Transaction Hash</p>
                    <p className="text-white font-mono text-sm break-all">
                      {selectedRecord.transactionHash}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60 mb-1">Actor Address</p>
                    <p className="text-white font-mono text-sm">
                      {selectedRecord.actor.address}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60 mb-1">Block Number</p>
                    <p className="text-white">{selectedRecord.blockNumber.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60 mb-1">Timestamp</p>
                    <p className="text-white">{selectedRecord.timestamp.toLocaleString()}</p>
                  </div>
                </div>
                
                {selectedRecord.details && (
                  <div className="mt-4">
                    <p className="text-sm text-white/60 mb-2">Details</p>
                    <pre className="bg-black/30 p-4 rounded-lg text-white/80 text-sm overflow-auto">
                      {JSON.stringify(selectedRecord.details, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <LiquidGlassButton className="text-sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Explorer
                  </LiquidGlassButton>
                  {selectedRecord.ipfsHash && (
                    <LiquidGlassButton className="text-sm">
                      <Database className="w-4 h-4 mr-2" />
                      View IPFS Data
                    </LiquidGlassButton>
                  )}
                </div>
              </LiquidGlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Certificate Generation */}
        {certificate && (
          <LiquidGlassCard variant="frost">
            <h3 className="text-lg font-semibold text-white mb-4">
              Blockchain Certificate
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <pre className="bg-black/30 p-4 rounded-lg text-white/80 text-xs overflow-auto">
                  {certificate.certificate}
                </pre>
                <div className="flex gap-2 mt-4">
                  <LiquidGlassButton className="text-sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </LiquidGlassButton>
                  <LiquidGlassButton className="text-sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Share Certificate
                  </LiquidGlassButton>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg">
                  <QRCode value={certificate.verificationUrl} size={200} />
                </div>
                <p className="text-sm text-white/60 mt-4 text-center">
                  Scan to verify authenticity
                </p>
                <a 
                  href={certificate.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm mt-2 hover:underline"
                >
                  {certificate.verificationUrl}
                </a>
              </div>
            </div>
          </LiquidGlassCard>
        )}
      </div>
    </div>
  )
}