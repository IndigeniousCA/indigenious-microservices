// BOQ Service - Core business logic for Bill of Quantities management

import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/lib/monitoring/logger';
import type { 
  BOQ, BOQSection, BOQItem, BOQStatus, BOQDiscipline,
  UserRole, BOQPermission, BOQHistoryEntry, HistoryAction,
  BOQImportFormat, BOQExportFormat, BOQTemplate, ProjectType,
  IndigenousSupplier, WorkflowStep, BOQAnalytics
} from '../types'

export class BOQService {
  // Create a new BOQ
  async createBOQ(params: {
    projectId: string
    projectName: string
    discipline: BOQDiscipline
    createdBy: string
    createdByRole: UserRole
    organization: string
    projectType: ProjectType
    indigenousContentTarget?: number
    templateId?: string
  }): Promise<BOQ> {
    const boqId = uuidv4()
    
    // Load template if specified
    let sections: BOQSection[] = []
    if (params.templateId) {
      const template = await this.loadTemplate(params.templateId)
      sections = this.createSectionsFromTemplate(template)
    } else {
      sections = this.getDefaultSections(params.discipline)
    }
    
    const boq: BOQ = {
      id: boqId,
      projectId: params.projectId,
      projectName: params.projectName,
      version: 1,
      revision: 'A',
      status: 'draft',
      discipline: params.discipline,
      
      metadata: {
        createdBy: params.createdBy,
        createdByRole: params.createdByRole,
        organization: params.organization,
        project: {
          type: params.projectType,
          location: '',
          indigenousContentTarget: params.indigenousContentTarget || 5 // Default 5% target
        },
        references: {
          drawings: [],
          specifications: [],
          standards: []
        }
      },
      
      sections,
      
      summary: this.calculateSummary(sections),
      
      collaboration: {
        access: [{
          userId: params.createdBy,
          userRole: params.createdByRole,
          permissions: this.getDefaultPermissions(params.createdByRole),
          grantedAt: new Date(),
          grantedBy: 'system'
        }],
        comments: [],
        approvals: [],
        changeRequests: []
      },
      
      history: [{
        id: uuidv4(),
        version: 1,
        revision: 'A',
        action: 'created',
        userId: params.createdBy,
        userName: params.createdBy,
        timestamp: new Date(),
        details: {
          itemsAdded: 0
        }
      }],
      
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    return boq
  }

  // Add item to BOQ
  async addItem(
    boq: BOQ,
    sectionId: string,
    item: Omit<BOQItem, 'id' | 'addedInRevision'>,
    userId: string
  ): Promise<BOQ> {
    const itemId = uuidv4()
    const newItem: BOQItem = {
      ...item,
      id: itemId,
      addedInRevision: boq.revision,
      amount: (item.quantity || 0) * (item.rate || 0),
      totalQuantity: item.quantity * (1 + (item.wasteFactor || 0) / 100)
    }
    
    // Find section and add item
    const updatedSections = this.addItemToSection(boq.sections, sectionId, newItem)
    
    // Create new version with updated sections
    const updatedBOQ: BOQ = {
      ...boq,
      sections: updatedSections,
      summary: this.calculateSummary(updatedSections),
      updatedAt: new Date()
    }
    
    // Add history entry
    updatedBOQ.history.push({
      id: uuidv4(),
      version: boq.version,
      revision: boq.revision,
      action: 'edited',
      userId,
      userName: userId,
      timestamp: new Date(),
      details: {
        itemsAdded: 1,
        changes: [{
          itemId,
          field: 'created',
          oldValue: null,
          newValue: newItem
        }]
      }
    })
    
    return updatedBOQ
  }

  // Update item quantities or rates
  async updateItem(
    boq: BOQ,
    itemId: string,
    updates: Partial<BOQItem>,
    userId: string
  ): Promise<BOQ> {
    let oldItem: BOQItem | null = null
    
    const updatedSections = this.updateItemInSections(
      boq.sections,
      itemId,
      (item) => {
        oldItem = { ...item }
        const updated = {
          ...item,
          ...updates,
          modifiedInRevision: boq.revision
        }
        
        // Recalculate amount if quantity or rate changed
        if (updates.quantity !== undefined || updates.rate !== undefined) {
          updated.amount = (updated.quantity || 0) * (updated.rate || 0)
          updated.totalQuantity = updated.quantity * (1 + (updated.wasteFactor || 0) / 100)
        }
        
        return updated
      }
    )
    
    const updatedBOQ: BOQ = {
      ...boq,
      sections: updatedSections,
      summary: this.calculateSummary(updatedSections),
      updatedAt: new Date()
    }
    
    // Add history entry
    if (oldItem) {
      const changes = Object.entries(updates).map(([field, newValue]) => ({
        itemId,
        field,
        oldValue: (oldItem as unknown)[field],
        newValue
      }))
      
      updatedBOQ.history.push({
        id: uuidv4(),
        version: boq.version,
        revision: boq.revision,
        action: 'edited',
        userId,
        userName: userId,
        timestamp: new Date(),
        details: {
          itemsModified: 1,
          changes
        }
      })
    }
    
    return updatedBOQ
  }

  // Import BOQ from Excel/CSV
  async importBOQ(
    file: File,
    format: BOQImportFormat,
    boq: BOQ,
    userId: string
  ): Promise<BOQ> {
    // Parse file based on format
    const items = await this.parseImportFile(file, format)
    
    // Validate imported items
    const validatedItems = this.validateImportedItems(items)
    
    // Add items to BOQ
    let updatedBOQ = boq
    for (const item of validatedItems) {
      updatedBOQ = await this.addItem(
        updatedBOQ,
        item.sectionId || boq.sections[0].id,
        item,
        userId
      )
    }
    
    // Add import history
    updatedBOQ.history.push({
      id: uuidv4(),
      version: boq.version,
      revision: boq.revision,
      action: 'edited',
      userId,
      userName: userId,
      timestamp: new Date(),
      details: {
        itemsAdded: validatedItems.length
      },
      comment: `Imported ${validatedItems.length} items from ${format.format} file`
    })
    
    return updatedBOQ
  }

  // Export BOQ to various formats
  async exportBOQ(
    boq: BOQ,
    format: BOQExportFormat
  ): Promise<Blob> {
    switch (format.format) {
      case 'excel':
        return this.exportToExcel(boq, format)
      case 'csv':
        return this.exportToCSV(boq, format)
      case 'pdf':
        return this.exportToPDF(boq, format)
      case 'json':
        return this.exportToJSON(boq, format)
      default:
        throw new Error(`Unsupported export format: ${format.format}`)
    }
  }

  // Calculate Indigenous content
  calculateIndigenousContent(boq: BOQ): {
    totalAmount: number
    indigenousAmount: number
    percentage: number
    bySection: Array<{ section: string; amount: number; percentage: number }>
  } {
    let totalAmount = 0
    let indigenousAmount = 0
    const bySection: Array<{ section: string; amount: number; percentage: number }> = []
    
    const calculateSection = (section: BOQSection) => {
      let sectionTotal = 0
      let sectionIndigenous = 0
      
      // Calculate from items
      if (section.items) {
        section.items.forEach(item => {
          const itemAmount = item.amount || 0
          sectionTotal += itemAmount
          sectionIndigenous += itemAmount * (item.indigenousContent.percentage / 100)
        })
      }
      
      // Calculate from subsections
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          const subResult = calculateSection(subsection)
          sectionTotal += subResult.total
          sectionIndigenous += subResult.indigenous
        })
      }
      
      bySection.push({
        section: `${section.code} - ${section.name}`,
        amount: sectionIndigenous,
        percentage: sectionTotal > 0 ? (sectionIndigenous / sectionTotal) * 100 : 0
      })
      
      return { total: sectionTotal, indigenous: sectionIndigenous }
    }
    
    boq.sections.forEach(section => {
      const result = calculateSection(section)
      totalAmount += result.total
      indigenousAmount += result.indigenous
    })
    
    return {
      totalAmount,
      indigenousAmount,
      percentage: totalAmount > 0 ? (indigenousAmount / totalAmount) * 100 : 0,
      bySection
    }
  }

  // Find Indigenous suppliers for items
  async findIndigenousSuppliers(
    item: BOQItem,
    location: string
  ): Promise<IndigenousSupplier[]> {
    // This would connect to the Indigenous supplier database
    // For now, returning mock data
    return [
      {
        id: 'supplier-1',
        name: 'Northern Construction Supplies',
        contact: 'John Smith',
        email: 'john@northernconstruction.ca',
        phone: '705-555-0123',
        isPreferred: true,
        isIndigenous: true,
        communityAffiliation: 'First Nation Community',
        indigenousCertification: {
          type: 'CCAB',
          certNumber: 'CCAB-2024-001',
          validUntil: new Date('2025-12-31')
        },
        localEmployment: 85,
        communityBenefits: [
          'Local employment priority',
          'Skills training programs',
          'Community profit sharing'
        ],
        certifications: ['ISO 9001', 'CCAB Gold']
      }
    ]
  }

  // Create approval workflow
  async createApprovalWorkflow(
    boq: BOQ,
    approvers: Array<{ userId: string; role: UserRole }>
  ): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = []
    
    // Architect/Engineer review
    const technicalReviewers = approvers.filter(a => 
      ['architect', 'engineer', 'quantity_surveyor'].includes(a.role)
    )
    if (technicalReviewers.length > 0) {
      steps.push({
        id: uuidv4(),
        name: 'Technical Review',
        type: 'review',
        assignees: technicalReviewers.map(r => r.userId),
        status: 'pending'
      })
    }
    
    // Project Manager approval
    const pmApprovers = approvers.filter(a => a.role === 'project_manager')
    if (pmApprovers.length > 0) {
      steps.push({
        id: uuidv4(),
        name: 'Project Manager Approval',
        type: 'approval',
        assignees: pmApprovers.map(a => a.userId),
        status: 'pending'
      })
    }
    
    // Client approval
    const clientApprovers = approvers.filter(a => a.role === 'client')
    if (clientApprovers.length > 0) {
      steps.push({
        id: uuidv4(),
        name: 'Client Approval',
        type: 'approval',
        assignees: clientApprovers.map(a => a.userId),
        status: 'pending'
      })
    }
    
    // Indigenous liaison review (if applicable)
    if (boq.metadata.project.indigenousContentTarget && boq.metadata.project.indigenousContentTarget > 0) {
      const liaisonApprovers = approvers.filter(a => a.role === 'indigenous_liaison')
      if (liaisonApprovers.length > 0) {
        steps.push({
          id: uuidv4(),
          name: 'Indigenous Content Review',
          type: 'review',
          assignees: liaisonApprovers.map(a => a.userId),
          status: 'pending'
        })
      }
    }
    
    return steps
  }

  // Generate BOQ analytics
  async generateAnalytics(boq: BOQ): Promise<BOQAnalytics> {
    const indigenousAnalysis = this.calculateIndigenousContent(boq)
    
    // Calculate cost breakdown
    const costBySection = boq.sections.map(section => ({
      section: `${section.code} - ${section.name}`,
      amount: section.totals.amount,
      percentage: (section.totals.amount / boq.summary.totalAmount) * 100
    }))
    
    // Calculate revision metrics
    const revisionChanges = boq.history.filter(h => h.action === 'edited')
    const itemChanges = revisionChanges.flatMap(h => h.details.changes || [])
    const changesByItem = itemChanges.reduce((acc, change) => {
      acc[change.itemId] = (acc[change.itemId] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const mostChangedItems = Object.entries(changesByItem)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([itemId, changeCount]) => ({ itemId, changeCount }))
    
    return {
      projectId: boq.projectId,
      
      costBreakdown: {
        bySection: costBySection,
        byTrade: [], // Would be calculated based on trade classification
        bySupplier: [] // Would be calculated based on supplier assignments
      },
      
      indigenousAnalysis: {
        totalPercentage: indigenousAnalysis.percentage,
        bySection: indigenousAnalysis.bySection,
        bySupplier: [], // Would be calculated based on supplier data
        communityBenefits: [],
        localEmployment: 0
      },
      
      revisionMetrics: {
        totalRevisions: new Set(boq.history.map(h => h.revision)).size,
        averageChangesPerRevision: itemChanges.length / Math.max(1, revisionChanges.length),
        costVariance: 0, // Would calculate variance between revisions
        mostChangedItems
      },
      
      collaborationMetrics: {
        totalUsers: boq.collaboration.access.length,
        totalComments: boq.collaboration.comments.length,
        averageApprovalTime: 0, // Would calculate from approval records
        activeUsers: boq.collaboration.access.filter(a => 
          a.permissions.some(p => ['edit_quantities', 'edit_rates'].includes(p))
        ).length
      }
    }
  }

  // Private helper methods

  private getDefaultSections(discipline: BOQDiscipline): BOQSection[] {
    // Return standard sections based on discipline
    const commonSections: BOQSection[] = [
      {
        id: uuidv4(),
        code: 'A',
        name: 'Preliminaries & General Conditions',
        order: 1,
        totals: { items: 0, quantity: 0, amount: 0, indigenousAmount: 0 }
      },
      {
        id: uuidv4(),
        code: 'B',
        name: 'Site Preparation',
        order: 2,
        totals: { items: 0, quantity: 0, amount: 0, indigenousAmount: 0 }
      }
    ]
    
    // Add discipline-specific sections
    switch (discipline) {
      case 'architectural':
        return [
          ...commonSections,
          {
            id: uuidv4(),
            code: 'C',
            name: 'Substructure',
            order: 3,
            totals: { items: 0, quantity: 0, amount: 0, indigenousAmount: 0 }
          },
          {
            id: uuidv4(),
            code: 'D',
            name: 'Superstructure',
            order: 4,
            totals: { items: 0, quantity: 0, amount: 0, indigenousAmount: 0 }
          },
          {
            id: uuidv4(),
            code: 'E',
            name: 'External Finishes',
            order: 5,
            totals: { items: 0, quantity: 0, amount: 0, indigenousAmount: 0 }
          },
          {
            id: uuidv4(),
            code: 'F',
            name: 'Internal Finishes',
            order: 6,
            totals: { items: 0, quantity: 0, amount: 0, indigenousAmount: 0 }
          }
        ]
      case 'structural':
        return [
          ...commonSections,
          {
            id: uuidv4(),
            code: 'C',
            name: 'Foundations',
            order: 3,
            totals: { items: 0, quantity: 0, amount: 0, indigenousAmount: 0 }
          },
          {
            id: uuidv4(),
            code: 'D',
            name: 'Structural Frame',
            order: 4,
            totals: { items: 0, quantity: 0, amount: 0, indigenousAmount: 0 }
          }
        ]
      default:
        return commonSections
    }
  }

  private getDefaultPermissions(role: UserRole): BOQPermission[] {
    const permissions: Record<UserRole, BOQPermission[]> = {
      architect: ['view', 'comment', 'edit_quantities', 'add_items', 'delete_items', 'export', 'share'],
      engineer: ['view', 'comment', 'edit_quantities', 'add_items', 'export'],
      quantity_surveyor: ['view', 'comment', 'edit_quantities', 'edit_rates', 'add_items', 'delete_items', 'export', 'share'],
      project_manager: ['view', 'comment', 'approve', 'lock', 'export', 'share'],
      contractor: ['view', 'comment', 'edit_rates'],
      subcontractor: ['view', 'comment'],
      client: ['view', 'comment', 'approve'],
      consultant: ['view', 'comment'],
      indigenous_liaison: ['view', 'comment', 'approve']
    }
    
    return permissions[role] || ['view']
  }

  private calculateSummary(sections: BOQSection[]): any {
    let totalItems = 0
    let totalAmount = 0
    
    const calculateSection = (section: BOQSection) => {
      let sectionItems = 0
      let sectionAmount = 0
      
      if (section.items) {
        sectionItems += section.items.length
        sectionAmount += section.items.reduce((sum, item) => sum + (item.amount || 0), 0)
      }
      
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          const subResult = calculateSection(subsection)
          sectionItems += subResult.items
          sectionAmount += subResult.amount
        })
      }
      
      return { items: sectionItems, amount: sectionAmount }
    }
    
    const sectionTotals = sections.map(section => {
      const result = calculateSection(section)
      totalItems += result.items
      totalAmount += result.amount
      
      return {
        sectionCode: section.code,
        sectionName: section.name,
        amount: result.amount,
        percentage: 0 // Will be calculated after total is known
      }
    })
    
    // Calculate percentages
    sectionTotals.forEach(st => {
      st.percentage = totalAmount > 0 ? (st.amount / totalAmount) * 100 : 0
    })
    
    return {
      totalItems,
      totalAmount,
      sectionTotals,
      tradeTotals: [],
      indigenousContent: {
        totalAmount: 0,
        percentage: 0,
        byCategory: []
      },
      itemsByStatus: {
        active: totalItems,
        provisional: 0,
        deleted: 0,
        substituted: 0,
        on_hold: 0
      }
    }
  }

  private addItemToSection(
    sections: BOQSection[],
    sectionId: string,
    item: BOQItem
  ): BOQSection[] {
    return sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: [...(section.items || []), item],
          totals: {
            ...section.totals,
            items: section.totals.items + 1,
            amount: section.totals.amount + (item.amount || 0)
          }
        }
      }
      
      if (section.subsections) {
        return {
          ...section,
          subsections: this.addItemToSection(section.subsections, sectionId, item)
        }
      }
      
      return section
    })
  }

  private updateItemInSections(
    sections: BOQSection[],
    itemId: string,
    updater: (item: BOQItem) => BOQItem
  ): BOQSection[] {
    return sections.map(section => {
      if (section.items) {
        const updatedItems = section.items.map(item =>
          item.id === itemId ? updater(item) : item
        )
        
        // Recalculate section totals
        const amount = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0)
        
        return {
          ...section,
          items: updatedItems,
          totals: {
            ...section.totals,
            amount
          }
        }
      }
      
      if (section.subsections) {
        return {
          ...section,
          subsections: this.updateItemInSections(section.subsections, itemId, updater)
        }
      }
      
      return section
    })
  }

  private async loadTemplate(templateId: string): Promise<BOQTemplate> {
    // In production, this would load from database
    // For now, return a mock template
    return {
      id: templateId,
      name: 'Standard Building Template',
      description: 'Standard template for building construction',
      discipline: 'architectural',
      projectType: 'commercial',
      sections: [],
      createdBy: 'system',
      organization: 'Indigenious',
      isPublic: true,
      isIndigenousOptimized: true,
      tags: ['building', 'commercial', 'standard'],
      usageCount: 0,
      rating: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  private createSectionsFromTemplate(template: BOQTemplate): BOQSection[] {
    return template.sections.map((templateSection, index) => ({
      id: uuidv4(),
      code: templateSection.code,
      name: templateSection.name,
      order: index + 1,
      items: templateSection.items.map(templateItem => ({
        id: uuidv4(),
        code: templateItem.code,
        description: templateItem.description,
        quantity: 0,
        unit: templateItem.unit,
        currency: 'CAD',
        status: 'active',
        indigenousContent: {
          percentage: 0
        },
        addedInRevision: 'A'
      })),
      totals: { items: templateSection.items.length, quantity: 0, amount: 0, indigenousAmount: 0 }
    }))
  }

  private async parseImportFile(file: File, format: BOQImportFormat): Promise<any[]> {
    try {
      const items: unknown[] = [];
      
      switch (format) {
        case 'excel':
          // Parse Excel file
          const excelData = await this.parseExcelFile(file);
          items.push(...excelData);
          break;
          
        case 'csv':
          // Parse CSV file
          const csvData = await this.parseCSVFile(file);
          items.push(...csvData);
          break;
          
        case 'xml':
          // Parse XML file
          const xmlData = await this.parseXMLFile(file);
          items.push(...xmlData);
          break;
          
        case 'json':
          // Parse JSON file
          const jsonData = await this.parseJSONFile(file);
          items.push(...jsonData);
          break;
          
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }
      
      return items;
    } catch (error) {
      logger.error('Error parsing import file:', error);
      throw new Error(`Failed to parse ${format} file: ${error.message}`);
    }
  }
  
  private async parseExcelFile(file: File): Promise<any[]> {
    const items: unknown[] = [];
    const arrayBuffer = await file.arrayBuffer();
    
    // Mock Excel parsing - in production would use a library like xlsx
    // Expected format: Code | Description | Quantity | Unit | Rate
    const mockRows = [
      ['A001', 'Site Preparation', '1000', 'sqm', '25.00'],
      ['A002', 'Excavation', '500', 'cum', '45.00'],
      ['B001', 'Foundation Concrete', '200', 'cum', '350.00'],
      ['B002', 'Reinforcement Steel', '15000', 'kg', '1.50']
    ];
    
    for (const row of mockRows) {
      items.push({
        code: row[0],
        description: row[1],
        quantity: parseFloat(row[2]),
        unit: row[3],
        rate: parseFloat(row[4]),
        currency: 'CAD'
      });
    }
    
    return items;
  }
  
  private async parseCSVFile(file: File): Promise<any[]> {
    const items: unknown[] = [];
    const text = await file.text();
    const lines = text.split('\\n').filter(line => line.trim());
    
    // Skip header if present
    const hasHeader = lines[0].toLowerCase().includes('code') || lines[0].toLowerCase().includes('description');
    const startIndex = hasHeader ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      
      if (columns.length >= 4) {
        items.push({
          code: columns[0],
          description: columns[1],
          quantity: parseFloat(columns[2]) || 0,
          unit: columns[3],
          rate: columns[4] ? parseFloat(columns[4]) : undefined,
          currency: 'CAD'
        });
      }
    }
    
    return items;
  }
  
  private async parseXMLFile(file: File): Promise<any[]> {
    const items: unknown[] = [];
    const text = await file.text();
    
    // Simple XML parsing - in production would use a proper XML parser
    const itemMatches = text.match(/<item>.*?<\/item>/gs) || [];
    
    for (const itemXml of itemMatches) {
      const code = itemXml.match(/<code>(.*?)<\/code>/)?.[1] || '';
      const description = itemXml.match(/<description>(.*?)<\/description>/)?.[1] || '';
      const quantity = parseFloat(itemXml.match(/<quantity>(.*?)<\/quantity>/)?.[1] || '0');
      const unit = itemXml.match(/<unit>(.*?)<\/unit>/)?.[1] || '';
      const rate = itemXml.match(/<rate>(.*?)<\/rate>/)?.[1];
      
      items.push({
        code,
        description,
        quantity,
        unit,
        rate: rate ? parseFloat(rate) : undefined,
        currency: 'CAD'
      });
    }
    
    return items;
  }
  
  private async parseJSONFile(file: File): Promise<any[]> {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Handle different JSON structures
    let items: unknown[] = [];
    
    if (Array.isArray(data)) {
      items = data;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (data.boq && data.boq.items) {
      items = data.boq.items;
    } else if (data.sections && Array.isArray(data.sections)) {
      // Flatten sections into items
      for (const section of data.sections) {
        if (section.items && Array.isArray(section.items)) {
          items.push(...section.items);
        }
      }
    }
    
    // Normalize item structure
    return items.map(item => ({
      code: item.code || item.itemCode || '',
      description: item.description || item.name || '',
      quantity: parseFloat(item.quantity || item.qty || '0'),
      unit: item.unit || item.uom || '',
      rate: item.rate || item.unitRate || item.price ? parseFloat(item.rate || item.unitRate || item.price) : undefined,
      currency: item.currency || 'CAD'
    }));
  }

  private validateImportedItems(items: unknown[]): unknown[] {
    // Validate and transform imported items
    return items
  }

  private async exportToExcel(boq: BOQ, format: BOQExportFormat): Promise<Blob> {
    // Implement Excel export
    return new Blob(['Excel data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  private async exportToCSV(boq: BOQ, format: BOQExportFormat): Promise<Blob> {
    // Implement CSV export
    return new Blob(['CSV data'], { type: 'text/csv' })
  }

  private async exportToPDF(boq: BOQ, format: BOQExportFormat): Promise<Blob> {
    // Implement PDF export
    return new Blob(['PDF data'], { type: 'application/pdf' })
  }

  private async exportToJSON(boq: BOQ, format: BOQExportFormat): Promise<Blob> {
    const data = JSON.stringify(boq, null, 2)
    return new Blob([data], { type: 'application/json' })
  }
}

// Export singleton instance
export const boqService = new BOQService()