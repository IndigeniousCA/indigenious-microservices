/**
 * Blockchain Audit Trail Service
 * Immutable record of all procurement activities
 * Built on Ethereum/Polygon for transparency and trust
 */

import { ethers } from 'ethers'
import { logger } from '@/lib/monitoring/logger';
import { create } from 'ipfs-http-client'
import CryptoJS from 'crypto-js'

// Contract ABI for the Procurement Audit smart contract
const AUDIT_CONTRACT_ABI = [
  'event ProcurementRecorded(bytes32 indexed rfqId, address indexed business, uint256 timestamp, string ipfsHash)',
  'event BidSubmitted(bytes32 indexed rfqId, address indexed bidder, uint256 timestamp, bytes32 bidHash)',
  'event ContractAwarded(bytes32 indexed rfqId, address indexed winner, uint256 value, uint256 timestamp)',
  'event ComplianceVerified(bytes32 indexed rfqId, address indexed verifier, bool passed, uint256 timestamp)',
  'function recordProcurement(bytes32 rfqId, string memory ipfsHash) public',
  'function submitBid(bytes32 rfqId, bytes32 bidHash) public',
  'function awardContract(bytes32 rfqId, address winner, uint256 value) public',
  'function verifyCompliance(bytes32 rfqId, bool passed, string memory details) public',
  'function getAuditTrail(bytes32 rfqId) public view returns (tuple(uint256 timestamp, string action, address actor, string details)[] memory)',
]

export interface AuditRecord {
  id: string
  rfqId: string
  action: 'rfq_created' | 'bid_submitted' | 'contract_awarded' | 'compliance_verified' | 'document_signed' | 'milestone_completed'
  actor: {
    address: string
    businessName: string
    role: string
  }
  timestamp: Date
  blockNumber: number
  transactionHash: string
  ipfsHash?: string
  details: Record<string, unknown>
  verified: boolean
}

export interface BlockchainConfig {
  rpcUrl: string
  contractAddress: string
  privateKey?: string
  ipfsGateway: string
  chainId: number
}

export class BlockchainAuditService {
  private provider: ethers.Provider
  private contract: ethers.Contract
  private ipfs: any
  private signer?: ethers.Signer
  
  constructor(config: BlockchainConfig) {
    // Initialize provider (Polygon Mumbai testnet by default)
    this.provider = new ethers.JsonRpcProvider(
      config.rpcUrl || 'https://rpc-mumbai.maticvigil.com'
    )
    
    // Initialize contract
    this.contract = new ethers.Contract(
      config.contractAddress,
      AUDIT_CONTRACT_ABI,
      this.provider
    )
    
    // Initialize IPFS client
    this.ipfs = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: `Basic ${Buffer.from(
          process.env.INFURA_PROJECT_ID + ':' + process.env.INFURA_PROJECT_SECRET
        ).toString('base64')}`,
      },
    })
    
    // Initialize signer if private key provided
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider)
      this.contract = this.contract.connect(this.signer)
    }
  }

  /**
   * Record RFQ creation on blockchain
   */
  async recordRFQCreation(rfq: {
    id: string
    title: string
    department: string
    budget: { min: number; max: number }
    closingDate: string
    requirements: unknown[]
    createdBy: string
  }): Promise<AuditRecord> {
    try {
      // Store detailed data on IPFS
      const ipfsData = {
        type: 'rfq_creation',
        rfq: {
          ...rfq,
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
        metadata: {
          platform: 'Indigenous Procurement Platform',
          contractVersion: '1.0.0',
        },
      }
      
      const ipfsHash = await this.storeOnIPFS(ipfsData)
      
      // Record on blockchain
      const rfqIdBytes = ethers.id(rfq.id)
      const tx = await this.contract.recordProcurement(rfqIdBytes, ipfsHash)
      const receipt = await tx.wait()
      
      // Create audit record
      const auditRecord: AuditRecord = {
        id: `audit-${Date.now()}`,
        rfqId: rfq.id,
        action: 'rfq_created',
        actor: {
          address: await this.signer!.getAddress(),
          businessName: rfq.department,
          role: 'government',
        },
        timestamp: new Date(),
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        ipfsHash,
        details: rfq,
        verified: true,
      }
      
      return auditRecord
    } catch (error) {
      logger.error('Error recording RFQ creation:', error)
      throw error
    }
  }

  /**
   * Record bid submission with privacy
   */
  async recordBidSubmission(bid: {
    id: string
    rfqId: string
    businessId: string
    businessName: string
    submittedBy: string
    amount: number
    technicalScore?: number
  }): Promise<AuditRecord> {
    try {
      // Hash sensitive bid details for privacy
      const bidHash = this.hashBidDetails(bid)
      
      // Store encrypted bid details on IPFS
      const encryptedBid = this.encryptBidData(bid)
      const ipfsHash = await this.storeOnIPFS({
        type: 'bid_submission',
        encryptedData: encryptedBid,
        publicData: {
          rfqId: bid.rfqId,
          businessId: bid.businessId,
          submissionTime: new Date().toISOString(),
          bidHash,
        },
      })
      
      // Record on blockchain
      const rfqIdBytes = ethers.id(bid.rfqId)
      const tx = await this.contract.submitBid(rfqIdBytes, bidHash)
      const receipt = await tx.wait()
      
      return {
        id: `audit-${Date.now()}`,
        rfqId: bid.rfqId,
        action: 'bid_submitted',
        actor: {
          address: await this.signer!.getAddress(),
          businessName: bid.businessName,
          role: 'bidder',
        },
        timestamp: new Date(),
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        ipfsHash,
        details: { bidId: bid.id, bidHash },
        verified: true,
      }
    } catch (error) {
      logger.error('Error recording bid submission:', error)
      throw error
    }
  }

  /**
   * Record contract award
   */
  async recordContractAward(award: {
    rfqId: string
    winnerId: string
    winnerName: string
    contractValue: number
    awardedBy: string
    evaluationScores: any
  }): Promise<AuditRecord> {
    try {
      // Store evaluation details on IPFS
      const ipfsHash = await this.storeOnIPFS({
        type: 'contract_award',
        award: {
          ...award,
          timestamp: new Date().toISOString(),
        },
        evaluationProcess: {
          scores: award.evaluationScores,
          methodology: 'weighted_scoring',
          transparency: 'full',
        },
      })
      
      // Record on blockchain
      const rfqIdBytes = ethers.id(award.rfqId)
      const winnerAddress = await this.getBusinessAddress(award.winnerId)
      const tx = await this.contract.awardContract(
        rfqIdBytes,
        winnerAddress,
        ethers.parseEther(award.contractValue.toString())
      )
      const receipt = await tx.wait()
      
      return {
        id: `audit-${Date.now()}`,
        rfqId: award.rfqId,
        action: 'contract_awarded',
        actor: {
          address: await this.signer!.getAddress(),
          businessName: award.awardedBy,
          role: 'evaluator',
        },
        timestamp: new Date(),
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        ipfsHash,
        details: award,
        verified: true,
      }
    } catch (error) {
      logger.error('Error recording contract award:', error)
      throw error
    }
  }

  /**
   * Record compliance verification
   */
  async recordComplianceCheck(compliance: {
    rfqId: string
    businessId: string
    verifiedBy: string
    passed: boolean
    score: number
    issues: string[]
    suggestions: string[]
  }): Promise<AuditRecord> {
    try {
      const ipfsHash = await this.storeOnIPFS({
        type: 'compliance_verification',
        compliance: {
          ...compliance,
          timestamp: new Date().toISOString(),
        },
        verificationMethod: 'automated_engine_v2',
      })
      
      const rfqIdBytes = ethers.id(compliance.rfqId)
      const tx = await this.contract.verifyCompliance(
        rfqIdBytes,
        compliance.passed,
        ipfsHash
      )
      const receipt = await tx.wait()
      
      return {
        id: `audit-${Date.now()}`,
        rfqId: compliance.rfqId,
        action: 'compliance_verified',
        actor: {
          address: await this.signer!.getAddress(),
          businessName: 'Compliance Engine',
          role: 'system',
        },
        timestamp: new Date(),
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.hash,
        ipfsHash,
        details: compliance,
        verified: true,
      }
    } catch (error) {
      logger.error('Error recording compliance check:', error)
      throw error
    }
  }

  /**
   * Get complete audit trail for an RFQ
   */
  async getAuditTrail(rfqId: string): Promise<AuditRecord[]> {
    try {
      const rfqIdBytes = ethers.id(rfqId)
      const events = await this.contract.queryFilter(
        this.contract.filters.ProcurementRecorded(rfqIdBytes)
      )
      
      const auditTrail: AuditRecord[] = []
      
      for (const event of events) {
        const block = await this.provider.getBlock(event.blockNumber)
        const ipfsData = await this.fetchFromIPFS(event.args?.ipfsHash)
        
        auditTrail.push({
          id: `audit-${event.blockNumber}-${event.logIndex}`,
          rfqId,
          action: this.determineAction(event.event),
          actor: {
            address: event.args?.business || '',
            businessName: ipfsData?.businessName || 'Unknown',
            role: ipfsData?.role || 'participant',
          },
          timestamp: new Date(block!.timestamp * 1000),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          ipfsHash: event.args?.ipfsHash,
          details: ipfsData,
          verified: true,
        })
      }
      
      return auditTrail.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    } catch (error) {
      logger.error('Error fetching audit trail:', error)
      throw error
    }
  }

  /**
   * Verify document integrity
   */
  async verifyDocumentIntegrity(
    documentHash: string,
    rfqId: string
  ): Promise<{
    valid: boolean
    timestamp?: Date
    signer?: string
    blockNumber?: number
  }> {
    try {
      // Search for document in audit trail
      const auditTrail = await this.getAuditTrail(rfqId)
      
      for (const record of auditTrail) {
        if (record.ipfsHash) {
          const ipfsData = await this.fetchFromIPFS(record.ipfsHash)
          if (ipfsData?.documentHash === documentHash) {
            return {
              valid: true,
              timestamp: record.timestamp,
              signer: record.actor.address,
              blockNumber: record.blockNumber,
            }
          }
        }
      }
      
      return { valid: false }
    } catch (error) {
      logger.error('Error verifying document:', error)
      return { valid: false }
    }
  }

  /**
   * Generate blockchain certificate
   */
  async generateCertificate(rfqId: string): Promise<{
    certificate: string
    qrCode: string
    verificationUrl: string
  }> {
    try {
      const auditTrail = await this.getAuditTrail(rfqId)
      const latestRecord = auditTrail[auditTrail.length - 1]
      
      const certificate = {
        rfqId,
        totalRecords: auditTrail.length,
        firstRecord: {
          timestamp: auditTrail[0].timestamp,
          blockNumber: auditTrail[0].blockNumber,
          transactionHash: auditTrail[0].transactionHash,
        },
        latestRecord: {
          timestamp: latestRecord.timestamp,
          blockNumber: latestRecord.blockNumber,
          transactionHash: latestRecord.transactionHash,
        },
        verificationHash: this.generateVerificationHash(auditTrail),
        issuedAt: new Date().toISOString(),
        platform: 'Indigenous Procurement Platform',
        blockchain: 'Polygon',
      }
      
      // Store certificate on IPFS
      const ipfsHash = await this.storeOnIPFS(certificate)
      
      // Generate QR code for verification
      const verificationUrl = `https://indigenous-procurement.ca/verify/${rfqId}/${ipfsHash}`
      const qrCode = await this.generateQRCode(verificationUrl)
      
      return {
        certificate: JSON.stringify(certificate, null, 2),
        qrCode,
        verificationUrl,
      }
    } catch (error) {
      logger.error('Error generating certificate:', error)
      throw error
    }
  }

  // Helper methods
  private async storeOnIPFS(data: unknown): Promise<string> {
    try {
      const jsonString = JSON.stringify(data)
      const result = await this.ipfs.add(jsonString)
      return result.path
    } catch (error) {
      logger.error('IPFS storage error:', error)
      throw error
    }
  }

  private async fetchFromIPFS(hash: string): Promise<unknown> {
    try {
      const chunks = []
      for await (const chunk of this.ipfs.cat(hash)) {
        chunks.push(chunk)
      }
      const data = Buffer.concat(chunks).toString()
      return JSON.parse(data)
    } catch (error) {
      logger.error('IPFS fetch error:', error)
      return null
    }
  }

  private hashBidDetails(bid: unknown): string {
    const bidString = JSON.stringify({
      rfqId: bid.rfqId,
      businessId: bid.businessId,
      amount: bid.amount,
      timestamp: Date.now(),
    })
    return ethers.id(bidString)
  }

  private encryptBidData(bid: unknown): string {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret'
    return CryptoJS.AES.encrypt(JSON.stringify(bid), secret).toString()
  }

  private decryptBidData(encryptedData: string): any {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret'
    const decrypted = CryptoJS.AES.decrypt(encryptedData, secret)
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8))
  }

  private async getBusinessAddress(businessId: string): Promise<string> {
    // In production, this would look up the business's Ethereum address
    // For now, generate a deterministic address from the business ID
    return ethers.getAddress(
      '0x' + ethers.id(businessId).slice(2, 42)
    )
  }

  private determineAction(eventName?: string): AuditRecord['action'] {
    const actionMap: Record<string, AuditRecord['action']> = {
      'ProcurementRecorded': 'rfq_created',
      'BidSubmitted': 'bid_submitted',
      'ContractAwarded': 'contract_awarded',
      'ComplianceVerified': 'compliance_verified',
    }
    return actionMap[eventName || ''] || 'rfq_created'
  }

  private generateVerificationHash(auditTrail: AuditRecord[]): string {
    const trailString = auditTrail.map(record => ({
      blockNumber: record.blockNumber,
      transactionHash: record.transactionHash,
      timestamp: record.timestamp.toISOString(),
    }))
    return ethers.id(JSON.stringify(trailString))
  }

  private async generateQRCode(data: string): Promise<string> {
    // In production, use a QR code library
    // For now, return a placeholder
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`
  }

  /**
   * Get blockchain statistics
   */
  async getBlockchainStats(): Promise<{
    totalTransactions: number
    totalRFQs: number
    totalBids: number
    totalContracts: number
    gasUsed: bigint
    averageBlockTime: number
  }> {
    try {
      const latestBlock = await this.provider.getBlockNumber()
      
      // Get all events
      const procurementEvents = await this.contract.queryFilter(
        this.contract.filters.ProcurementRecorded(),
        latestBlock - 10000, // Last 10k blocks
        latestBlock
      )
      
      const bidEvents = await this.contract.queryFilter(
        this.contract.filters.BidSubmitted(),
        latestBlock - 10000,
        latestBlock
      )
      
      const contractEvents = await this.contract.queryFilter(
        this.contract.filters.ContractAwarded(),
        latestBlock - 10000,
        latestBlock
      )
      
      // Calculate stats
      let totalGas = 0n
      const allEvents = [...procurementEvents, ...bidEvents, ...contractEvents]
      
      for (const event of allEvents) {
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash)
        if (receipt) {
          totalGas += receipt.gasUsed
        }
      }
      
      return {
        totalTransactions: allEvents.length,
        totalRFQs: procurementEvents.length,
        totalBids: bidEvents.length,
        totalContracts: contractEvents.length,
        gasUsed: totalGas,
        averageBlockTime: 2.5, // Polygon average
      }
    } catch (error) {
      logger.error('Error getting blockchain stats:', error)
      throw error
    }
  }
}