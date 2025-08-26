// Invoices Hook
// Manage invoice operations and data

import { useState, useEffect } from 'react'
import { logger } from '@/lib/monitoring/logger';
import { useDataProvider } from '../../../shared/hooks/useDataProvider'
import type { Invoice, InvoiceStatus, InvoiceFilters } from '../types/financial.types'

export function useInvoices(vendorId?: string, filters?: InvoiceFilters) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    outstandingAmount: 0
  })
  
  const dataProvider = useDataProvider()

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true)
      
      // Mock invoice data - would come from data provider
      const mockInvoices: Invoice[] = [
        {
          id: 'inv-001',
          invoiceNumber: 'INV-2024-001',
          vendorId: vendorId || '',
          vendorName: 'Indigenous Construction Co.',
          clientId: 'client-001',
          clientName: 'Government of Canada',
          projectId: 'proj-001',
          projectName: 'Highway Infrastructure',
          status: 'sent',
          issueDate: '2024-01-15',
          dueDate: '2024-02-14',
          paymentTerms: 'net_30',
          lineItems: [
            {
              id: 'item-001',
              description: 'Road construction services',
              category: 'labor',
              quantity: 1,
              unitPrice: 50000,
              amount: 50000,
              taxRate: 0.05,
              taxAmount: 2500,
              total: 52500,
              isIndigenous: true
            }
          ],
          subtotal: 50000,
          taxAmount: 2500,
          totalAmount: 52500,
          paidAmount: 0,
          balanceDue: 52500,
          currency: 'CAD',
          notes: 'Payment terms: Net 30 days',
          attachments: [],
          indigenousContentPercentage: 100,
          indigenousContentValue: 50000,
          createdAt: '2024-01-15T09:00:00Z',
          updatedAt: '2024-01-15T09:00:00Z'
        },
        {
          id: 'inv-002',
          invoiceNumber: 'INV-2024-002',
          vendorId: vendorId || '',
          vendorName: 'Indigenous Construction Co.',
          clientId: 'client-002',
          clientName: 'Ontario Ministry of Transportation',
          status: 'paid',
          issueDate: '2024-01-01',
          dueDate: '2024-01-31',
          paymentTerms: 'net_30',
          lineItems: [
            {
              id: 'item-002',
              description: 'Engineering consultation',
              category: 'other',
              quantity: 40,
              unitPrice: 150,
              amount: 6000,
              taxRate: 0.05,
              taxAmount: 300,
              total: 6300,
              isIndigenous: false
            }
          ],
          subtotal: 6000,
          taxAmount: 300,
          totalAmount: 6300,
          paidAmount: 6300,
          balanceDue: 0,
          currency: 'CAD',
          paidDate: '2024-01-25',
          createdAt: '2024-01-01T09:00:00Z',
          updatedAt: '2024-01-25T15:30:00Z'
        }
      ]
      
      // Apply filters
      let filteredInvoices = mockInvoices
      
      if (filters?.status && filters.status !== 'all') {
        filteredInvoices = filteredInvoices.filter(inv => inv.status === filters.status)
      }
      
      if (filters?.clientId) {
        filteredInvoices = filteredInvoices.filter(inv => inv.clientId === filters.clientId)
      }
      
      if (filters?.dateRange) {
        const now = new Date()
        const startDate = new Date()
        
        switch (filters.dateRange) {
          case 'week':
            startDate.setDate(now.getDate() - 7)
            break
          case 'month':
            startDate.setMonth(now.getMonth() - 1)
            break
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3)
            break
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1)
            break
        }
        
        filteredInvoices = filteredInvoices.filter(inv => 
          new Date(inv.issueDate) >= startDate
        )
      }
      
      setInvoices(filteredInvoices)
      
      // Calculate stats
      const newStats = {
        total: filteredInvoices.length,
        draft: filteredInvoices.filter(inv => inv.status === 'draft').length,
        sent: filteredInvoices.filter(inv => ['sent', 'viewed'].includes(inv.status)).length,
        paid: filteredInvoices.filter(inv => inv.status === 'paid').length,
        overdue: filteredInvoices.filter(inv => inv.status === 'overdue').length,
        totalAmount: filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        paidAmount: filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
        outstandingAmount: filteredInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0)
      }
      
      setStats(newStats)
      
    } catch (error) {
      logger.error('Failed to fetch invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create invoice
  const createInvoice = async (invoiceData: Partial<Invoice>) => {
    try {
      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`
      
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber,
        vendorId: vendorId || '',
        vendorName: 'Your Company', // Would come from vendor profile
        status: 'draft',
        currency: 'CAD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...invoiceData
      } as Invoice
      
      // This would call the data provider to save
      logger.info('Creating invoice:', newInvoice)
      
      // Update local state
      setInvoices(prev => [newInvoice, ...prev])
      
      return newInvoice
    } catch (error) {
      logger.error('Failed to create invoice:', error)
      throw error
    }
  }

  // Update invoice
  const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>) => {
    try {
      const updatedInvoice = {
        ...updates,
        updatedAt: new Date().toISOString()
      }
      
      // This would call the data provider to update
      logger.info('Updating invoice:', invoiceId, updatedInvoice)
      
      // Update local state
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, ...updatedInvoice } : inv
      ))
      
      return updatedInvoice
    } catch (error) {
      logger.error('Failed to update invoice:', error)
      throw error
    }
  }

  // Send invoice
  const sendInvoice = async (invoiceId: string) => {
    try {
      await updateInvoice(invoiceId, {
        status: 'sent',
        sentDate: new Date().toISOString()
      })
      
      // This would trigger email/notification
      logger.info('Sending invoice:', invoiceId)
      
    } catch (error) {
      logger.error('Failed to send invoice:', error)
      throw error
    }
  }

  // Delete invoice
  const deleteInvoice = async (invoiceId: string) => {
    try {
      // This would call the data provider to delete
      logger.info('Deleting invoice:', invoiceId)
      
      // Update local state
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId))
      
    } catch (error) {
      logger.error('Failed to delete invoice:', error)
      throw error
    }
  }

  // Get single invoice
  const getInvoice = (invoiceId: string): Invoice | undefined => {
    return invoices.find(inv => inv.id === invoiceId)
  }

  // Duplicate invoice
  const duplicateInvoice = async (invoiceId: string) => {
    try {
      const originalInvoice = getInvoice(invoiceId)
      if (!originalInvoice) throw new Error('Invoice not found')
      
      const duplicatedInvoice = {
        ...originalInvoice,
        id: undefined,
        invoiceNumber: undefined,
        status: 'draft',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        paidAmount: 0,
        balanceDue: originalInvoice.totalAmount,
        paidDate: undefined,
        sentDate: undefined
      }
      
      return await createInvoice(duplicatedInvoice)
    } catch (error) {
      logger.error('Failed to duplicate invoice:', error)
      throw error
    }
  }

  // Export invoices
  const exportInvoices = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // This would call the export service
      logger.info(`Exporting invoices as ${format}`)
      
      return {
        success: true,
        downloadUrl: `/exports/invoices-${Date.now()}.${format}`
      }
    } catch (error) {
      logger.error('Failed to export invoices:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [vendorId, filters])

  return {
    invoices,
    loading,
    stats,
    createInvoice,
    updateInvoice,
    sendInvoice,
    deleteInvoice,
    getInvoice,
    duplicateInvoice,
    exportInvoices,
    refreshInvoices: fetchInvoices
  }
}