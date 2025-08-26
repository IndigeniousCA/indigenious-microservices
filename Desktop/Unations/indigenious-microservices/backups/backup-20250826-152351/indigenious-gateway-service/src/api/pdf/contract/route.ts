/**
 * Contract PDF Generation API
 * Generate contract PDFs on demand
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/monitoring/logger';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pdfService } from '@/lib/pdf/pdf-service'
import { ContractData, PDFGenerationOptions, PDFTemplate } from '@/lib/pdf/types'
import { z } from 'zod'

// Validation schemas
const contractPartySchema = z.object({
  type: z.enum(['contractor', 'client', 'witness']),
  name: z.string().min(1).max(200),
  legalName: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  representative: z.object({
    name: z.string().min(1).max(100),
    title: z.string().min(1).max(100),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
  }),
});

const contractSectionSchema = z.object({
  number: z.string().max(20),
  title: z.string().max(200),
  content: z.union([
    z.string().max(10000),
    z.array(z.object({
      number: z.string().max(20),
      text: z.string().max(5000),
    })),
  ]),
});

const contractSignatureSchema = z.object({
  party: z.string().max(200),
  signatory: z.string().max(100),
  title: z.string().max(100),
  signed: z.boolean().optional(),
  signedDate: z.string().datetime().optional(),
});

const contractDataSchema = z.object({
  contractNumber: z.string().min(1).max(50),
  contractDate: z.string().datetime(),
  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),
  title: z.string().min(1).max(200),
  parties: z.array(contractPartySchema).min(2).max(10),
  preamble: z.string().max(2000).optional(),
  sections: z.array(contractSectionSchema).min(1).max(50),
  signatures: z.array(contractSignatureSchema).min(1).max(10),
  indigenousContent: z.boolean().optional(),
  landAcknowledgment: z.string().max(1000).optional(),
  culturalConsiderations: z.array(z.string().max(500)).max(10).optional(),
  metadata: z.object({
    title: z.string().max(200).optional(),
    author: z.string().max(100).optional(),
    keywords: z.array(z.string().max(50)).max(20).optional(),
  }).optional(),
});

const generateContractSchema = z.object({
  data: contractDataSchema,
  options: z.object({
    format: z.enum(['Letter', 'Legal', 'A4']).optional(),
    orientation: z.enum(['portrait', 'landscape']).optional(),
    draft: z.boolean().optional(),
    watermark: z.string().max(50).optional(),
  }).optional(),
  saveToS3: z.boolean().optional(),
});

// POST /api/pdf/contract - Generate contract PDF
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    
    const validationResult = generateContractSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid contract data', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { data, options = {}, saveToS3 } = validationResult.data

    // Prepare contract data with metadata
    const contractData: ContractData = {
      ...data,
      metadata: {
        title: data.metadata?.title || data.title || `Contract ${data.contractNumber}`,
        author: data.metadata?.author || session.user.email || 'Indigenous Procurement Platform',
        creator: 'Indigenous Procurement Platform',
        creationDate: new Date(),
        keywords: data.metadata?.keywords || ['contract', data.contractNumber],
      },
      contractDate: new Date(data.contractDate),
      effectiveDate: new Date(data.effectiveDate),
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
    }

    // Prepare PDF options with defaults
    const pdfOptions: PDFGenerationOptions = {
      format: options.format || 'Letter',
      orientation: options.orientation || 'portrait',
      draft: options.draft || false,
      watermark: options.watermark,
    };

    // Generate PDF
    if (saveToS3) {
      const result = await pdfService.generateAndSave(PDFTemplate.CONTRACT, contractData, pdfOptions)
      
      return NextResponse.json({
        success: true,
        url: result.url,
        key: result.key,
        size: result.buffer.length,
      })
    } else {
      const buffer = await pdfService.generateContract(contractData, pdfOptions)
      
      // Sanitize filename
      const safeFilename = contractData.contractNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      
      // Return PDF as response
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="contract_${safeFilename}.pdf"`,
          'Content-Length': buffer.length.toString(),
        },
      })
    }
  } catch (error) {
    logger.error('Failed to generate contract PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET /api/pdf/contract/preview - Preview contract PDF
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create sample contract data for preview
    const sampleContract: ContractData = {
      metadata: {
        title: 'Service Agreement',
        author: session.user.email || 'Indigenous Procurement Platform',
        creator: 'Indigenous Procurement Platform',
        creationDate: new Date(),
        keywords: ['contract', 'sample', 'preview'],
      },
      contractNumber: 'CTR-2024-001',
      contractDate: new Date(),
      effectiveDate: new Date(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      title: 'PROFESSIONAL SERVICES AGREEMENT',
      parties: [
        {
          type: 'contractor',
          name: 'Indigenous Tech Solutions Inc.',
          legalName: 'Indigenous Technology Solutions Incorporated',
          address: '789 Innovation Drive, Saskatoon, SK S7K 1J9, Canada',
          representative: {
            name: 'Jane Smith',
            title: 'President',
            email: 'jane.smith@indtech.ca',
            phone: '(306) 555-0123',
          },
        },
        {
          type: 'client',
          name: 'Federal Government Department',
          legalName: 'Her Majesty the Queen in Right of Canada',
          address: '123 Government Plaza, Ottawa, ON K1A 0A9, Canada',
          representative: {
            name: 'John Doe',
            title: 'Procurement Officer',
            email: 'john.doe@canada.ca',
          },
        },
      ],
      preamble: 'WHEREAS the Client requires professional technology services; AND WHEREAS the Contractor has the expertise to provide such services; NOW THEREFORE, in consideration of the mutual covenants and agreements herein, the parties agree as follows:',
      sections: [
        {
          number: '1',
          title: 'SCOPE OF SERVICES',
          content: [
            {
              number: '1.1',
              text: 'The Contractor shall provide software development services as detailed in Schedule A.',
            },
            {
              number: '1.2',
              text: 'The Contractor shall ensure that at least 50% of the workforce assigned to this project identifies as Indigenous.',
            },
          ],
        },
        {
          number: '2',
          title: 'COMPENSATION',
          content: [
            {
              number: '2.1',
              text: 'The Client shall pay the Contractor a total fee of $250,000 CAD plus applicable taxes.',
            },
            {
              number: '2.2',
              text: 'Payment shall be made in monthly installments upon receipt of approved invoices.',
            },
          ],
        },
        {
          number: '3',
          title: 'TERM AND TERMINATION',
          content: 'This Agreement shall commence on the Effective Date and continue for one (1) year unless terminated earlier in accordance with this section.',
        },
      ],
      signatures: [
        {
          party: 'Indigenous Tech Solutions Inc.',
          signatory: 'Jane Smith',
          title: 'President',
          signed: false,
        },
        {
          party: 'Federal Government Department',
          signatory: 'John Doe',
          title: 'Procurement Officer',
          signed: false,
        },
      ],
      indigenousContent: true,
      landAcknowledgment: 'The parties acknowledge that this agreement is being executed on the traditional territory of the Algonquin Anishinaabe People.',
      culturalConsiderations: [
        'Flexible scheduling to accommodate Indigenous ceremonies and cultural events',
        'Incorporation of Indigenous knowledge and perspectives in project delivery',
      ],
    }

    // Generate preview with watermark
    const buffer = await pdfService.generateContract(sampleContract, {
      watermark: 'PREVIEW',
      draft: true,
    })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="contract_preview.pdf"',
      },
    })
  } catch (error) {
    logger.error('Failed to generate contract preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}