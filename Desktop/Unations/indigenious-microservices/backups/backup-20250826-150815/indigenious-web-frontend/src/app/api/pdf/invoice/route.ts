/**
 * Invoice PDF Generation API
 * Generate invoice PDFs on demand
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pdfService } from '@/lib/pdf/pdf-service'
import { InvoiceData, PDFGenerationOptions, PDFTemplate } from '@/lib/pdf/types'
import { z } from 'zod'

// Validation schema
const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  invoiceDate: z.string().transform(str => new Date(str)),
  dueDate: z.string().transform(str => new Date(str)),
  from: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
    country: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    businessNumber: z.string().optional(),
    gstNumber: z.string().optional(),
  }),
  to: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
    country: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    businessNumber: z.string().optional(),
  }),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      amount: z.number(),
      taxable: z.boolean().optional(),
    })
  ),
  subtotal: z.number(),
  taxRate: z.number().optional(),
  taxAmount: z.number().optional(),
  discount: z.number().optional(),
  discountAmount: z.number().optional(),
  total: z.number(),
  paymentTerms: z.string().optional(),
  paymentInstructions: z.string().optional(),
  notes: z.string().optional(),
  indigenousBusiness: z.boolean().optional(),
  bandNumber: z.string().optional(),
  territoryAcknowledgment: z.string().optional(),
})

// POST /api/pdf/invoice - Generate invoice PDF
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    
    // Validate invoice data
    const validationResult = invoiceSchema.safeParse(body.data)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid invoice data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Prepare invoice data with metadata
    const invoiceData: InvoiceData = {
      ...validationResult.data,
      metadata: {
        title: `Invoice ${validationResult.data.invoiceNumber}`,
        author: session.user.email || 'Indigenous Procurement Platform',
        creator: 'Indigenous Procurement Platform',
        creationDate: new Date(),
        keywords: ['invoice', validationResult.data.invoiceNumber],
      },
    }

    // Parse options
    const options: PDFGenerationOptions = {
      format: body.options?.format || 'Letter',
      orientation: 'portrait',
      draft: body.options?.draft || false,
      watermark: body.options?.watermark,
    }

    // Generate PDF
    let result
    if (body.saveToS3) {
      result = await pdfService.generateAndSave(PDFTemplate.INVOICE, invoiceData, options)
      
      return NextResponse.json({
        success: true,
        url: result.url,
        key: result.key,
        size: result.buffer.length,
      })
    } else {
      const buffer = await pdfService.generateInvoice(invoiceData, options)
      
      // Return PDF as response
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice_${invoiceData.invoiceNumber}.pdf"`,
          'Content-Length': buffer.length.toString(),
        },
      })
    }
  } catch (error) {
    logger.error('Failed to generate invoice PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET /api/pdf/invoice/preview - Preview invoice PDF
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create sample invoice data for preview
    const sampleInvoice: InvoiceData = {
      metadata: {
        title: 'Sample Invoice',
        author: session.user.email || 'Indigenous Procurement Platform',
        creator: 'Indigenous Procurement Platform',
        creationDate: new Date(),
        keywords: ['invoice', 'sample', 'preview'],
      },
      invoiceNumber: 'INV-2024-001',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      from: {
        name: 'Indigenous Construction Ltd.',
        address: '123 Main Street',
        city: 'Winnipeg',
        province: 'MB',
        postalCode: 'R3C 1A5',
        country: 'Canada',
        phone: '(204) 555-0123',
        email: 'info@indigenousconstruction.ca',
        businessNumber: 'IND123456789',
        gstNumber: '123456789RT0001',
      },
      to: {
        name: 'Government of Canada',
        address: '456 Government Blvd',
        city: 'Ottawa',
        province: 'ON',
        postalCode: 'K1A 0A9',
        country: 'Canada',
      },
      items: [
        {
          description: 'Construction Services - Phase 1',
          quantity: 1,
          unitPrice: 50000,
          amount: 50000,
          taxable: true,
        },
        {
          description: 'Materials and Supplies',
          quantity: 1,
          unitPrice: 15000,
          amount: 15000,
          taxable: true,
        },
        {
          description: 'Indigenous Workforce Training',
          quantity: 40,
          unitPrice: 100,
          amount: 4000,
          taxable: false,
        },
      ],
      subtotal: 69000,
      taxRate: 5,
      taxAmount: 3250,
      total: 72250,
      paymentTerms: 'Net 30 days',
      paymentInstructions: 'Please remit payment to the account details provided separately.',
      notes: 'Thank you for supporting Indigenous businesses.',
      indigenousBusiness: true,
      bandNumber: 'Band #123',
      territoryAcknowledgment: 'We acknowledge that this work is being performed on Treaty 1 territory.',
    }

    // Generate preview with watermark
    const buffer = await pdfService.generateInvoice(sampleInvoice, {
      watermark: 'PREVIEW',
      draft: true,
    })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="invoice_preview.pdf"',
      },
    })
  } catch (error) {
    logger.error('Failed to generate invoice preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}