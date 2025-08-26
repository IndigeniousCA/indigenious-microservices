// Payment Processor Hook
// Handle payment processing and integration

import { useState, useCallback } from 'react'
import { 
  PaymentProcessor, 
  PaymentMethod, 
  PaymentStatus,
  CurrencyCode 
} from '../types/financial.types'

interface ProcessPaymentParams {
  amount: number
  currency: CurrencyCode
  method: PaymentMethod
  invoiceId?: string
  description?: string
  paymentDetails: any
}

interface ProcessPaymentResult {
  id: string
  status: PaymentStatus
  transactionId?: string
  error?: string
  fee?: number
  netAmount?: number
}

export function usePaymentProcessor() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<ProcessPaymentResult | null>(null)

  // Available payment processors
  const processors: PaymentProcessor[] = [
    {
      name: 'stripe',
      enabled: true,
      credentials: {},
      supportedMethods: ['credit_card', 'debit_card'],
      supportedCurrencies: ['CAD', 'USD', 'EUR'],
      fees: {
        percentage: 2.9,
        fixed: 0.30,
        currency: 'CAD' as const,
        indigenousRate: {
          percentage: 2.4,
          fixed: 0.25
        }
      }
    },
    {
      name: 'moneris',
      enabled: true,
      credentials: {},
      supportedMethods: ['credit_card', 'debit_card', 'e_transfer'],
      supportedCurrencies: ['CAD'],
      fees: {
        percentage: 2.65,
        fixed: 0.10,
        currency: 'CAD' as const,
        indigenousRate: {
          percentage: 2.2,
          fixed: 0.10
        }
      }
    },
    {
      name: 'interac',
      enabled: true,
      credentials: {},
      supportedMethods: ['e_transfer', 'bank_transfer'],
      supportedCurrencies: ['CAD'],
      fees: {
        percentage: 0,
        fixed: 1.50,
        currency: 'CAD' as const,
        indigenousRate: {
          percentage: 0,
          fixed: 1.00
        }
      }
    },
    {
      name: 'fnbc',
      enabled: true,
      credentials: {},
      supportedMethods: ['bank_transfer', 'credit_card'],
      supportedCurrencies: ['CAD'],
      fees: {
        percentage: 1.5,
        fixed: 0.50,
        currency: 'CAD' as const,
        indigenousRate: {
          percentage: 0,
          fixed: 0
        }
      }
    }
  ]

  // Validate card number (Luhn algorithm)
  const validateCard = useCallback((cardNumber: string): boolean => {
    const cleaned = cardNumber.replace(/\s/g, '')
    if (!/^\d{16}$/.test(cleaned)) return false

    let sum = 0
    let isEven = false

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i])

      if (isEven) {
        digit *= 2
        if (digit > 9) digit -= 9
      }

      sum += digit
      isEven = !isEven
    }

    return sum % 10 === 0
  }, [])

  // Get processor for payment method
  const getProcessor = useCallback((method: PaymentMethod): PaymentProcessor | null => {
    return processors.find(p => 
      p.supportedMethods.includes(method) && p.enabled
    ) || null
  }, [])

  // Calculate processing fee
  const calculateFee = useCallback((
    amount: number, 
    processor: PaymentProcessor,
    isIndigenous = true
  ): number => {
    const fees = isIndigenous && processor.fees.indigenousRate 
      ? processor.fees.indigenousRate 
      : processor.fees

    return (amount * fees.percentage / 100) + fees.fixed
  }, [])

  // Process payment
  const processPayment = useCallback(async ({
    amount,
    currency,
    method,
    invoiceId,
    description,
    paymentDetails
  }: ProcessPaymentParams): Promise<ProcessPaymentResult> => {
    setIsProcessing(true)

    try {
      // Get appropriate processor
      const processor = getProcessor(method)
      if (!processor) {
        throw new Error(`No processor available for ${method}`)
      }

      // Validate currency support
      if (!processor.supportedCurrencies.includes(currency)) {
        throw new Error(`${processor.name} does not support ${currency}`)
      }

      // Calculate fees
      const fee = calculateFee(amount, processor)
      const netAmount = amount - fee

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // In production, integrate with actual payment APIs
      const result: ProcessPaymentResult = {
        id: `pay-${Date.now()}`,
        status: 'completed',
        transactionId: `${processor.name}-${Date.now()}`,
        fee,
        netAmount
      }

      // Simulate occasional failures for testing
      if (Math.random() > 0.9) {
        result.status = 'failed'
        result.error = 'Payment declined by bank'
      }

      setLastTransaction(result)
      return result

    } catch (error) {
      const result: ProcessPaymentResult = {
        id: `pay-${Date.now()}`,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Payment processing failed'
      }
      
      setLastTransaction(result)
      return result
    } finally {
      setIsProcessing(false)
    }
  }, [getProcessor, calculateFee])

  // Process refund
  const processRefund = useCallback(async (
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<ProcessPaymentResult> => {
    setIsProcessing(true)

    try {
      // In production, integrate with payment processor APIs
      await new Promise(resolve => setTimeout(resolve, 1500))

      const result: ProcessPaymentResult = {
        id: `refund-${Date.now()}`,
        status: 'completed',
        transactionId: `refund-${transactionId}`
      }

      return result
    } catch (error) {
      return {
        id: `refund-${Date.now()}`,
        status: 'failed',
        error: 'Refund processing failed'
      }
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // Verify bank account
  const verifyBankAccount = useCallback(async (
    transitNumber: string,
    institutionNumber: string,
    accountNumber: string
  ): Promise<boolean> => {
    // In production, verify with Interac or bank API
    // Basic validation for now
    return (
      /^\d{5}$/.test(transitNumber) &&
      /^\d{3}$/.test(institutionNumber) &&
      /^\d{7,12}$/.test(accountNumber)
    )
  }, [])

  // Get transaction status
  const getTransactionStatus = useCallback(async (
    transactionId: string
  ): Promise<PaymentStatus> => {
    // In production, check with payment processor
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500))
    return 'completed'
  }, [])

  // Generate payment link
  const generatePaymentLink = useCallback(async (
    amount: number,
    currency: CurrencyCode,
    description: string,
    expiryDays = 30
  ): Promise<string> => {
    // In production, use payment processor API
    const linkId = Date.now().toString(36)
    return `https://pay.indigenious.ca/link/${linkId}`
  }, [])

  return {
    processors,
    isProcessing,
    lastTransaction,
    processPayment,
    processRefund,
    validateCard,
    verifyBankAccount,
    getTransactionStatus,
    generatePaymentLink,
    getProcessor,
    calculateFee
  }
}