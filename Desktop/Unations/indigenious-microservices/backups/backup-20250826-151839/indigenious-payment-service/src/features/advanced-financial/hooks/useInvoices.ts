// Invoices Hook
// Manage invoice operations

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { Invoice, InvoiceStatus, LineItem, Payment } from '../types/financial.types'

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load invoices on mount
  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    setIsLoading(true)
    try {
      // In production, fetch from API
      const mockInvoices: Invoice[] = [
        {
          id: 'inv-001',
          invoiceNumber: 'INV-2024-001',
          clientId: 'client-001',
          clientName: 'Public Services and Procurement Canada',
          projectId: 'proj-001',
          status: 'sent',
          issueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          dueDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
          terms: 'net_30',
          currency: 'CAD',
          lineItems: [
            {
              id: 'item-1',
              description: 'IT Support Services - January 2024',
              quantity: 160,
              rate: 125,
              amount: 20000,
              taxable: true,
              category: 'services'
            },
            {
              id: 'item-2',
              description: 'Network Infrastructure Setup',
              quantity: 1,
              rate: 5000,
              amount: 5000,
              taxable: true,
              category: 'services'
            }
          ],
          subtotal: 25000,
          taxDetails: {
            gst: { rate: 5, amount: 1250 },
            pst: { rate: 7, amount: 1750 },
            totalTax: 3000
          },
          total: 28000,
          amountPaid: 0,
          balance: 28000,
          notes: 'Thank you for your business',
          reminders: [],
          payments: [],
          indigenousBusiness: true,
          governmentContract: true
        },
        {
          id: 'inv-002',
          invoiceNumber: 'INV-2024-002',
          clientId: 'client-002',
          clientName: 'Indigenous Services Canada',
          status: 'paid',
          issueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          terms: 'net_30',
          currency: 'CAD',
          lineItems: [
            {
              id: 'item-3',
              description: 'Cultural Training Program Development',
              quantity: 1,
              rate: 15000,
              amount: 15000,
              taxable: false,
              category: 'training'
            }
          ],
          subtotal: 15000,
          taxDetails: {
            exemptions: [{
              type: 'cultural_services',
              reason: 'Cultural training exempt from GST/PST',
              documentId: 'exempt-001'
            }],
            totalTax: 0
          },
          total: 15000,
          amountPaid: 15000,
          balance: 0,
          payments: [{
            id: 'pay-001',
            invoiceId: 'inv-002',
            amount: 15000,
            currency: 'CAD',
            method: 'e_transfer',
            status: 'completed',
            processedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            reference: 'ET-123456',
            netAmount: 15000
          }],
          reminders: [],
          indigenousBusiness: true,
          governmentContract: true
        },
        {
          id: 'inv-003',
          invoiceNumber: 'INV-2024-003',
          clientId: 'client-003',
          clientName: 'First Nations Construction Ltd',
          status: 'overdue',
          issueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          terms: 'net_45',
          currency: 'CAD',
          lineItems: [
            {
              id: 'item-4',
              description: 'Project Management Consulting',
              quantity: 80,
              rate: 150,
              amount: 12000,
              taxable: true
            }
          ],
          subtotal: 12000,
          taxDetails: {
            gst: { rate: 5, amount: 600 },
            totalTax: 600
          },
          total: 12600,
          amountPaid: 0,
          balance: 12600,
          reminders: [{
            id: 'rem-001',
            sentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'overdue',
            method: 'email'
          }],
          payments: [],
          indigenousBusiness: true,
          governmentContract: false
        }
      ]

      setInvoices(mockInvoices)
    } catch (err) {
      setError('Failed to load invoices')
      logger.error('Failed to generate invoice', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Create new invoice
  const createInvoice = useCallback(async (invoice: Partial<Invoice>): Promise<Invoice | null> => {
    try {
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-2024-${String(invoices.length + 1).padStart(3, '0')}`,
        status: 'draft',
        issueDate: new Date().toISOString(),
        currency: 'CAD',
        lineItems: [],
        subtotal: 0,
        taxDetails: { totalTax: 0 },
        total: 0,
        amountPaid: 0,
        balance: 0,
        reminders: [],
        payments: [],
        indigenousBusiness: false,
        governmentContract: false,
        ...invoice
      } as Invoice

      setInvoices(prev => [...prev, newInvoice])
      return newInvoice
    } catch (err) {
      logger.error('Failed to create invoice:', err)
      return null
    }
  }, [invoices.length])

  // Update invoice
  const updateInvoice = useCallback(async (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === id ? { ...inv, ...updates } : inv
    ))
  }, [])

  // Send invoice
  const sendInvoice = useCallback(async (id: string): Promise<boolean> => {
    try {
      // In production, this would send via email/API
      setInvoices(prev => prev.map(inv => 
        inv.id === id 
          ? { 
              ...inv, 
              status: 'sent' as InvoiceStatus,
              reminders: [
                ...inv.reminders,
                {
                  id: `rem-${Date.now()}`,
                  sentDate: new Date().toISOString(),
                  type: 'friendly',
                  method: 'email'
                }
              ]
            }
          : inv
      ))
      return true
    } catch (err) {
      logger.error('Failed to send invoice:', err)
      return false
    }
  }, [])

  // Delete invoice
  const deleteInvoice = useCallback(async (id: string): Promise<boolean> => {
    try {
      setInvoices(prev => prev.filter(inv => inv.id !== id))
      return true
    } catch (err) {
      logger.error('Failed to delete invoice:', err)
      return false
    }
  }, [])

  // Record payment
  const recordPayment = useCallback(async (
    invoiceId: string, 
    payment: Partial<Payment>
  ) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id !== invoiceId) return inv

      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        invoiceId,
        amount: payment.amount || 0,
        currency: payment.currency || 'CAD',
        method: payment.method || 'bank_transfer',
        status: 'completed' as const,
        processedDate: new Date().toISOString(),
        reference: payment.reference || `REF-${Date.now()}`
      }

      const totalPaid = inv.amountPaid + (payment.amount || 0)
      const balance = inv.total - totalPaid

      return {
        ...inv,
        payments: [...inv.payments, newPayment],
        amountPaid: totalPaid,
        balance,
        status: balance === 0 ? 'paid' : balance < inv.total ? 'partial' : inv.status
      }
    }))
  }, [])

  // Calculate invoice totals
  const calculateTotals = useCallback((lineItems: LineItem[], taxRates: { gst?: number; pst?: number; hst?: number }) => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    
    const taxableAmount = lineItems
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.amount, 0)

    const gst = taxRates.gst ? (taxableAmount * taxRates.gst / 100) : 0
    const pst = taxRates.pst ? (taxableAmount * taxRates.pst / 100) : 0
    const hst = taxRates.hst ? (taxableAmount * taxRates.hst / 100) : 0
    const totalTax = gst + pst + hst

    return {
      subtotal,
      taxDetails: {
        gst: gst > 0 ? { rate: taxRates.gst!, amount: gst } : undefined,
        pst: pst > 0 ? { rate: taxRates.pst!, amount: pst } : undefined,
        hst: hst > 0 ? { rate: taxRates.hst!, amount: hst } : undefined,
        totalTax
      },
      total: subtotal + totalTax
    }
  }, [])

  // Get invoice stats
  const getStats = useCallback(() => {
    const total = invoices.length
    const totalValue = invoices.reduce((sum, inv) => sum + inv.total, 0)
    const outstanding = invoices
      .filter(inv => ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.balance, 0)
    const overdue = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.balance, 0)

    return { total, totalValue, outstanding, overdue }
  }, [invoices])

  return {
    invoices,
    isLoading,
    error,
    createInvoice,
    updateInvoice,
    sendInvoice,
    deleteInvoice,
    recordPayment,
    calculateTotals,
    getStats,
    refresh: loadInvoices
  }
}