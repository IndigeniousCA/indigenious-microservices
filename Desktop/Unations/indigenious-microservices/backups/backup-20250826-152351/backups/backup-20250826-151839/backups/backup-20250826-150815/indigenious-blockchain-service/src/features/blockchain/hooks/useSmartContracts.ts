/**
 * Smart Contract Hooks
 * React hooks for blockchain interactions
 */

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { ethers } from 'ethers'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { contractManager } from '@/lib/blockchain/contract-manager'
import { toast } from 'react-hot-toast'

// Hook for wallet connection
export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<string>('0')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectWallet = useCallback(async () => {
    try {
      setIsConnecting(true)
      setError(null)
      
      const walletAddress = await contractManager.connectBrowserWallet()
      setAddress(walletAddress)
      
      // Get balance
      const provider = new ethers.BrowserProvider(window.ethereum)
      const balance = await provider.getBalance(walletAddress)
      setBalance(ethers.formatEther(balance))
      
      toast.success('Wallet connected successfully')
    } catch (err: unknown) {
      setError(err.message || 'Failed to connect wallet')
      toast.error('Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setAddress(null)
    setBalance('0')
    toast.success('Wallet disconnected')
  }, [])

  // Auto-connect if wallet was previously connected
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          connectWallet()
        }
      })
    }
  }, [connectWallet])

  return {
    address,
    balance,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    isConnected: !!address
  }
}

// Hook for Indigenous business verification
export function useVerification() {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<unknown>(null)
  const [isLoading, setIsLoading] = useState(false)

  const submitVerification = useCallback(async (data: {
    nation: string
    territory: string
    ownershipPercentage: number
    documents: File[]
  }) => {
    if (!user?.businessId) {
      throw new Error('Business ID required')
    }

    try {
      setIsSubmitting(true)
      
      const result = await contractManager.submitVerification({
        businessId: user.businessId,
        ...data,
        metadata: {
          submittedBy: user.email,
          submittedAt: new Date().toISOString(),
          businessName: user.businessName
        }
      })

      toast.success('Verification submitted successfully')
      
      // Update local state
      await checkVerificationStatus(user.businessId)
      
      return result
    } catch (error: Error | unknown) {
      toast.error(error.message || 'Verification submission failed')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [user])

  const checkVerificationStatus = useCallback(async (businessId: string) => {
    try {
      setIsLoading(true)
      const status = await contractManager.getVerificationStatus(businessId)
      setVerificationStatus(status)
      return status
    } catch (error: Error | unknown) {
      logger.error('Error checking verification:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const approveVerification = useCallback(async (
    businessId: string,
    approved: boolean,
    reason?: string
  ) => {
    try {
      setIsSubmitting(true)
      const txHash = await contractManager.approveVerification(businessId, approved, reason)
      
      toast.success(approved ? 'Verification approved' : 'Verification rejected')
      
      // Refresh status
      await checkVerificationStatus(businessId)
      
      return txHash
    } catch (error: Error | unknown) {
      toast.error(error.message || 'Approval failed')
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [checkVerificationStatus])

  // Auto-check verification status
  useEffect(() => {
    if (user?.businessId) {
      checkVerificationStatus(user.businessId)
    }
  }, [user?.businessId, checkVerificationStatus])

  return {
    submitVerification,
    checkVerificationStatus,
    approveVerification,
    verificationStatus,
    isSubmitting,
    isLoading,
    isVerified: verificationStatus?.indigenousStatus === 'verified'
  }
}

// Hook for escrow management
export function useEscrow() {
  const [isCreating, setIsCreating] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [escrowDetails, setEscrowDetails] = useState<unknown>(null)

  const createEscrow = useCallback(async (data: {
    rfqId: string
    seller: string
    amount: bigint
    milestones: Array<{
      description: string
      amount: bigint
      dueDate: number
    }>
    releaseConditions: string[]
  }) => {
    try {
      setIsCreating(true)
      
      const result = await contractManager.createEscrow(data)
      
      toast.success('Escrow created successfully')
      
      // Fetch details
      await getEscrowDetails(result.escrowId)
      
      return result
    } catch (error: Error | unknown) {
      toast.error(error.message || 'Failed to create escrow')
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [])

  const fundEscrow = useCallback(async (escrowId: string, amount: bigint) => {
    try {
      setIsFunding(true)
      
      const txHash = await contractManager.fundEscrow(escrowId, amount)
      
      toast.success('Escrow funded successfully')
      
      // Refresh details
      await getEscrowDetails(escrowId)
      
      return txHash
    } catch (error: Error | unknown) {
      toast.error(error.message || 'Failed to fund escrow')
      throw error
    } finally {
      setIsFunding(false)
    }
  }, [])

  const getEscrowDetails = useCallback(async (escrowId: string) => {
    try {
      const details = await contractManager.getEscrowDetails(escrowId)
      setEscrowDetails(details)
      return details
    } catch (error: Error | unknown) {
      logger.error('Error fetching escrow details:', error)
      return null
    }
  }, [])

  const submitMilestone = useCallback(async (
    escrowId: string,
    milestoneIndex: number,
    evidence: string[]
  ) => {
    try {
      const txHash = await contractManager.completeMilestone(
        escrowId,
        milestoneIndex,
        evidence
      )
      
      toast.success('Milestone submitted successfully')
      
      // Refresh details
      await getEscrowDetails(escrowId)
      
      return txHash
    } catch (error: Error | unknown) {
      toast.error(error.message || 'Failed to submit milestone')
      throw error
    }
  }, [getEscrowDetails])

  const approveMilestone = useCallback(async (
    escrowId: string,
    milestoneIndex: number
  ) => {
    try {
      const txHash = await contractManager.approveMilestone(
        escrowId,
        milestoneIndex
      )
      
      toast.success('Milestone approved')
      
      // Refresh details
      await getEscrowDetails(escrowId)
      
      return txHash
    } catch (error: Error | unknown) {
      toast.error(error.message || 'Failed to approve milestone')
      throw error
    }
  }, [getEscrowDetails])

  const releaseFunds = useCallback(async (
    escrowId: string,
    milestoneIndex: number
  ) => {
    try {
      const txHash = await contractManager.releaseMilestoneFunds(
        escrowId,
        milestoneIndex
      )
      
      toast.success('Funds released successfully')
      
      // Refresh details
      await getEscrowDetails(escrowId)
      
      return txHash
    } catch (error: Error | unknown) {
      toast.error(error.message || 'Failed to release funds')
      throw error
    }
  }, [getEscrowDetails])

  return {
    createEscrow,
    fundEscrow,
    getEscrowDetails,
    submitMilestone,
    approveMilestone,
    releaseFunds,
    escrowDetails,
    isCreating,
    isFunding
  }
}

// Hook for compliance tracking
export function useCompliance() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [complianceStatus, setComplianceStatus] = useState<unknown>(null)

  const registerCompliance = useCallback(async (data: {
    organizationId: string
    year: number
    totalProcurement: bigint
    indigenousProcurement: bigint
    details: Record<string, any>
  }) => {
    try {
      setIsRegistering(true)
      
      const txHash = await contractManager.registerCompliance(data)
      
      toast.success('Compliance data registered')
      
      // Fetch updated status
      await getComplianceStatus(data.organizationId, data.year)
      
      return txHash
    } catch (error: Error | unknown) {
      toast.error(error.message || 'Failed to register compliance')
      throw error
    } finally {
      setIsRegistering(false)
    }
  }, [])

  const getComplianceStatus = useCallback(async (
    organizationId: string,
    year: number
  ) => {
    try {
      const status = await contractManager.getComplianceStatus(
        organizationId,
        year
      )
      setComplianceStatus(status)
      return status
    } catch (error: Error | unknown) {
      logger.error('Error fetching compliance:', error)
      return null
    }
  }, [])

  return {
    registerCompliance,
    getComplianceStatus,
    complianceStatus,
    isRegistering,
    isCompliant: complianceStatus?.compliant || false,
    percentage: complianceStatus?.percentage || 0
  }
}

// Hook for impact tracking
export function useImpactTracking() {
  const [isRecording, setIsRecording] = useState(false)
  const [communityImpact, setCommunityImpact] = useState<unknown>(null)

  const recordImpact = useCallback(async (data: {
    communityId: string
    contractValue: bigint
    jobsCreated: number
    localSpend: bigint
    category: 'construction' | 'services' | 'supplies' | 'technology'
    metadata?: Record<string, any>
  }) => {
    try {
      setIsRecording(true)
      
      const txHash = await contractManager.recordImpact(data)
      
      toast.success('Impact recorded on blockchain')
      
      // Refresh community impact
      await getCommunityImpact(data.communityId)
      
      return txHash
    } catch (error: Error | unknown) {
      toast.error(error.message || 'Failed to record impact')
      throw error
    } finally {
      setIsRecording(false)
    }
  }, [])

  const getCommunityImpact = useCallback(async (communityId: string) => {
    try {
      const impact = await contractManager.getCommunityImpact(communityId)
      setCommunityImpact(impact)
      return impact
    } catch (error: Error | unknown) {
      logger.error('Error fetching impact:', error)
      return null
    }
  }, [])

  return {
    recordImpact,
    getCommunityImpact,
    communityImpact,
    isRecording
  }
}

// Hook for transaction monitoring
export function useTransaction() {
  const [txHash, setTxHash] = useState<string | null>(null)
  const [status, setStatus] = useState<'pending' | 'success' | 'failed' | null>(null)
  const [receipt, setReceipt] = useState<unknown>(null)

  const monitorTransaction = useCallback(async (hash: string) => {
    setTxHash(hash)
    setStatus('pending')
    
    try {
      const receipt = await contractManager.getTransactionReceipt(hash)
      
      if (receipt) {
        setReceipt(receipt)
        setStatus(receipt.status === 1 ? 'success' : 'failed')
      }
    } catch (error) {
      setStatus('failed')
    }
  }, [])

  return {
    txHash,
    status,
    receipt,
    monitorTransaction,
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isFailed: status === 'failed'
  }
}

// Hook for gas estimation
export function useGasEstimate() {
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null)
  const [gasPriceGwei, setGasPriceGwei] = useState<string>('0')
  const [estimatedCost, setEstimatedCost] = useState<string>('0')

  const estimateGas = useCallback(async (
    contract: 'identity' | 'escrow' | 'compliance' | 'impact',
    method: string,
    params: unknown[]
  ) => {
    try {
      const estimate = await contractManager.estimateGas(contract, method, params)
      setGasEstimate(estimate)
      
      // Get current gas price
      const provider = new ethers.BrowserProvider(window.ethereum)
      const gasPrice = await provider.getGasPrice()
      setGasPriceGwei(ethers.formatUnits(gasPrice, 'gwei'))
      
      // Calculate estimated cost
      const cost = estimate * gasPrice
      setEstimatedCost(ethers.formatEther(cost))
      
      return {
        gasLimit: estimate,
        gasPrice,
        estimatedCost: cost
      }
    } catch (error: Error | unknown) {
      logger.error('Gas estimation error:', error)
      return null
    }
  }, [])

  return {
    gasEstimate,
    gasPriceGwei,
    estimatedCost,
    estimateGas
  }
}