// Excel Integration Service for BOQ Import/Export
// Handles Excel file parsing and generation with smart mapping

import * as XLSX from 'xlsx'
import { logger } from '@/lib/monitoring/logger';
import type { 
  BOQ, BOQItem, BOQSection, BOQImportFormat, BOQExportFormat 
} from '../types'

interface ExcelRow {
  [key: string]: any
}

interface ParsedItem {
  code: string
  description: string
  quantity: number
  unit: string
  rate?: number
  amount?: number
  [key: string]: any
}

export class ExcelService {
  // Import Excel file to BOQ items
  async importFromExcel(
    file: File,
    mapping: BOQImportFormat['mapping'],
    options: BOQImportFormat['options']
  ): Promise<ParsedItem[]> {
    const data = await this.readExcelFile(file)
    const worksheet = data.Sheets[options.sheetName || data.SheetNames[0]]
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
      header: options.hasHeaders ? undefined : 1,
      range: options.startRow ? options.startRow - 1 : 0,
      blankrows: false
    })
    
    // Map Excel columns to BOQ fields
    const items: ParsedItem[] = jsonData.map((row, index) => {
      try {
        return this.mapRowToItem(row, mapping)
      } catch (error) {
        logger.error(`Error parsing row ${index + 1}:`, error)
        throw new Error(`Failed to parse row ${index + 1}: ${error}`)
      }
    })
    
    // Validate items
    return this.validateItems(items)
  }

  // Export BOQ to Excel
  async exportToExcel(
    boq: BOQ,
    options: BOQExportFormat['options'],
    template?: string
  ): Promise<Blob> {
    const workbook = XLSX.utils.book_new()
    
    // Create main BOQ sheet
    const boqData = this.prepareBOQData(boq, options)
    const boqSheet = XLSX.utils.json_to_sheet(boqData)
    
    // Apply formatting
    this.formatBOQSheet(boqSheet, boq)
    
    XLSX.utils.book_append_sheet(workbook, boqSheet, 'Bill of Quantities')
    
    // Add summary sheet
    if (options.includeAmounts) {
      const summarySheet = this.createSummarySheet(boq)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
    }
    
    // Add Indigenous content report
    if (options.indigenousContentReport) {
      const indigenousSheet = this.createIndigenousContentSheet(boq)
      XLSX.utils.book_append_sheet(workbook, indigenousSheet, 'Indigenous Content')
    }
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array',
      cellStyles: true
    })
    
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
  }

  // Generate Excel template for BOQ import
  generateTemplate(discipline: string, projectType: string): Blob {
    const workbook = XLSX.utils.book_new()
    
    // Create template with headers and sample data
    const templateData = [
      {
        'Item Code': 'A.1.1',
        'Description': 'Site Clearance',
        'Quantity': 1000,
        'Unit': 'm²',
        'Rate': 15.50,
        'Amount': 15500,
        'Supplier': 'ABC Construction',
        'Indigenous %': 50,
        'Notes': 'Including removal of vegetation'
      },
      {
        'Item Code': 'A.1.2',
        'Description': 'Excavation to reduced level',
        'Quantity': 500,
        'Unit': 'm³',
        'Rate': 45.00,
        'Amount': 22500,
        'Supplier': 'Northern Excavation',
        'Indigenous %': 100,
        'Notes': 'Maximum depth 2m'
      }
    ]
    
    const sheet = XLSX.utils.json_to_sheet(templateData)
    
    // Apply column widths
    sheet['!cols'] = [
      { wch: 10 }, // Item Code
      { wch: 40 }, // Description
      { wch: 10 }, // Quantity
      { wch: 8 },  // Unit
      { wch: 10 }, // Rate
      { wch: 12 }, // Amount
      { wch: 20 }, // Supplier
      { wch: 12 }, // Indigenous %
      { wch: 30 }  // Notes
    ]
    
    // Add instructions sheet
    const instructions = [
      ['BOQ Import Template Instructions'],
      [''],
      ['1. Fill in your BOQ items in the "Template" sheet'],
      ['2. Item Code: Use hierarchical numbering (e.g., A.1.1, B.2.3)'],
      ['3. Units: Use standard units (m, m², m³, kg, hr, ea, etc.)'],
      ['4. Indigenous %: Enter percentage of Indigenous content (0-100)'],
      ['5. Save as Excel file and import into Indigenious platform'],
      [''],
      ['Tips:'],
      ['- Keep descriptions clear and concise'],
      ['- Ensure quantities are numeric values'],
      ['- Rates should exclude taxes'],
      ['- Amount formula: Quantity × Rate']
    ]
    
    const instructionSheet = XLSX.utils.aoa_to_sheet(instructions)
    
    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions')
    XLSX.utils.book_append_sheet(workbook, sheet, 'Template')
    
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    })
    
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
  }

  // Smart column mapping detection
  async detectColumnMapping(file: File): Promise<{
    mapping: BOQImportFormat['mapping']
    confidence: number
  }> {
    const data = await this.readExcelFile(file)
    const worksheet = data.Sheets[data.SheetNames[0]]
    
    // Get headers (first row)
    const headers = this.getHeaders(worksheet)
    
    // Common header patterns
    const patterns = {
      code: /^(item[\s_]*)?(code|no|number|ref)/i,
      description: /^(item[\s_]*)?(desc|description|name|work)/i,
      quantity: /^(qty|quantity|amount)/i,
      unit: /^(unit|uom|measure)/i,
      rate: /^(rate|price|unit[\s_]*price|cost)/i,
      amount: /^(amount|total|value|sum)/i
    }
    
    const mapping: any = {}
    let matches = 0
    
    headers.forEach(header => {
      Object.entries(patterns).forEach(([field, pattern]) => {
        if (pattern.test(header) && !mapping[field]) {
          mapping[field] = header
          matches++
        }
      })
    })
    
    const confidence = (matches / Object.keys(patterns).length) * 100
    
    return { mapping, confidence }
  }

  // Private helper methods
  
  private async readExcelFile(file: File): Promise<XLSX.WorkBook> {
    const arrayBuffer = await file.arrayBuffer()
    return XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  }

  private mapRowToItem(row: ExcelRow, mapping: BOQImportFormat['mapping']): ParsedItem {
    const item: ParsedItem = {
      code: String(row[mapping.code] || ''),
      description: String(row[mapping.description] || ''),
      quantity: this.parseNumber(row[mapping.quantity]),
      unit: String(row[mapping.unit] || 'ea'),
      rate: mapping.rate ? this.parseNumber(row[mapping.rate]) : undefined,
      amount: mapping.amount ? this.parseNumber(row[mapping.amount]) : undefined
    }
    
    // Map additional fields
    Object.entries(mapping).forEach(([field, column]) => {
      if (column && !['code', 'description', 'quantity', 'unit', 'rate', 'amount'].includes(field)) {
        item[field] = row[column]
      }
    })
    
    // Calculate amount if not provided
    if (!item.amount && item.rate && item.quantity) {
      item.amount = item.quantity * item.rate
    }
    
    return item
  }

  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      // Remove currency symbols and commas
      const cleaned = value.replace(/[$,]/g, '').trim()
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  private validateItems(items: ParsedItem[]): ParsedItem[] {
    return items.filter((item, index) => {
      const errors = []
      
      if (!item.code) errors.push('Missing item code')
      if (!item.description) errors.push('Missing description')
      if (item.quantity < 0) errors.push('Invalid quantity')
      if (!item.unit) errors.push('Missing unit')
      
      if (errors.length > 0) {
        logger.warn(`Row ${index + 1} validation errors:`, errors)
      }
      
      return errors.length === 0
    })
  }

  private prepareBOQData(boq: BOQ, options: BOQExportFormat['options']): unknown[] {
    const rows: unknown[] = []
    
    // Add header information
    rows.push({
      'Item Code': 'PROJECT:',
      'Description': boq.projectName,
      'Quantity': '',
      'Unit': '',
      'Rate': '',
      'Amount': ''
    })
    
    rows.push({
      'Item Code': 'REVISION:',
      'Description': boq.revision,
      'Quantity': '',
      'Unit': '',
      'Rate': '',
      'Amount': ''
    })
    
    rows.push({}) // Empty row
    
    // Process sections and items
    const processSection = (section: BOQSection, prefix = '') => {
      // Section header
      rows.push({
        'Item Code': section.code,
        'Description': section.name.toUpperCase(),
        'Quantity': '',
        'Unit': '',
        'Rate': '',
        'Amount': options.includeAmounts ? section.totals.amount : ''
      })
      
      // Items
      if (section.items) {
        section.items.forEach(item => {
          const row: any = {
            'Item Code': item.code,
            'Description': item.description,
            'Quantity': item.quantity,
            'Unit': item.unit
          }
          
          if (options.includeRates) {
            row['Rate'] = item.rate || ''
          }
          
          if (options.includeAmounts) {
            row['Amount'] = item.amount || ''
          }
          
          if (options.includeSuppliers && item.supplier) {
            row['Supplier'] = item.supplier.name
            row['Indigenous'] = item.supplier.isIndigenous ? 'Yes' : 'No'
          }
          
          if (item.notes) {
            row['Notes'] = item.notes
          }
          
          rows.push(row)
        })
      }
      
      // Subsections
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          processSection(subsection, prefix + section.code + '.')
        })
      }
      
      rows.push({}) // Empty row after section
    }
    
    boq.sections.forEach(section => processSection(section))
    
    // Add totals
    if (options.includeAmounts) {
      rows.push({
        'Item Code': '',
        'Description': 'TOTAL',
        'Quantity': '',
        'Unit': '',
        'Rate': '',
        'Amount': boq.summary.totalAmount
      })
    }
    
    return rows
  }

  private formatBOQSheet(sheet: XLSX.WorkSheet, boq: BOQ): void {
    // Apply cell formatting
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = sheet[cellAddress]
        
        if (!cell) continue
        
        // Format numbers
        if (typeof cell.v === 'number') {
          if (C === 4 || C === 5) { // Rate and Amount columns
            cell.z = '#,##0.00'
          } else if (C === 2) { // Quantity column
            cell.z = '#,##0.00'
          }
        }
        
        // Bold section headers
        if (C === 0 && cell.v && /^[A-Z]$/.test(String(cell.v))) {
          cell.s = { font: { bold: true } }
        }
      }
    }
    
    // Set column widths
    sheet['!cols'] = [
      { wch: 12 }, // Item Code
      { wch: 50 }, // Description
      { wch: 12 }, // Quantity
      { wch: 8 },  // Unit
      { wch: 12 }, // Rate
      { wch: 15 }  // Amount
    ]
  }

  private createSummarySheet(boq: BOQ): XLSX.WorkSheet {
    const summaryData = [
      ['BOQ SUMMARY'],
      [''],
      ['Project:', boq.projectName],
      ['Discipline:', boq.discipline],
      ['Revision:', boq.revision],
      ['Date:', new Date().toLocaleDateString()],
      [''],
      ['SECTION BREAKDOWN'],
      ['Section', 'Amount', 'Percentage']
    ]
    
    boq.summary.sectionTotals.forEach(section => {
      summaryData.push([
        section.sectionName,
        section.amount,
        `${section.percentage.toFixed(1)}%`
      ])
    })
    
    summaryData.push([''])
    summaryData.push(['TOTAL', boq.summary.totalAmount, '100.0%'])
    
    const sheet = XLSX.utils.aoa_to_sheet(summaryData)
    
    // Merge title cell
    sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]
    
    return sheet
  }

  private createIndigenousContentSheet(boq: BOQ): XLSX.WorkSheet {
    const indigenousData = [
      ['INDIGENOUS CONTENT REPORT'],
      [''],
      ['Project:', boq.projectName],
      ['Target:', `${boq.metadata.project.indigenousContentTarget}%`],
      ['Actual:', `${boq.summary.indigenousContent.percentage.toFixed(1)}%`],
      [''],
      ['BREAKDOWN BY SECTION'],
      ['Section', 'Total Amount', 'Indigenous Amount', 'Percentage']
    ]
    
    // Add section data (would be calculated from actual items)
    boq.sections.forEach(section => {
      indigenousData.push([
        `${section.code} - ${section.name}`,
        section.totals.amount,
        section.totals.indigenousAmount,
        section.totals.amount > 0 
          ? `${(section.totals.indigenousAmount / section.totals.amount * 100).toFixed(1)}%`
          : '0.0%'
      ])
    })
    
    return XLSX.utils.aoa_to_sheet(indigenousData)
  }

  private getHeaders(worksheet: XLSX.WorkSheet): string[] {
    const headers: string[] = []
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
      const cell = worksheet[cellAddress]
      headers.push(cell ? String(cell.v) : '')
    }
    
    return headers
  }
}

// Export singleton instance
export const excelService = new ExcelService()