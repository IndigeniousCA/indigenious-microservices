/**
 * Legal Structure Service
 * Creates appropriate investment vehicles for different opportunity types
 * Ensures tax efficiency and regulatory compliance
 */

import prisma from '@/lib/prisma';
import { logger } from '@/lib/monitoring/logger';
import { indigenousLedger } from '@/lib/security/sealed-logs/indigenous-ledger';
import type { InvestmentOpportunity } from '../types';

interface InvestmentVehicle {
  id: string;
  type: 'corporation' | 'lp' | 'trust' | 'jv' | 'spv';
  jurisdiction: string;
  
  structure: {
    name: string;
    registrationNumber?: string;
    taxId?: string;
    indigenousOwnership?: number;
  };
  
  ownership: {
    platform: number; // Our ownership %
    indigenous: number; // Indigenous partner %
    other: number; // Other investors %
  };
  
  governance: {
    boardSeats: number;
    votingRights: string;
    vetoRights: string[];
    reportingRequirements: string[];
  };
  
  tax: {
    structure: 'flow-through' | 'corporate' | 'hybrid';
    estimatedRate: number;
    benefits: string[];
    section89Exempt?: boolean; // For reserve lands
  };
  
  compliance: {
    regulations: string[];
    filingRequirements: string[];
    restrictions: string[];
  };
}

export class LegalStructureService {
  private static instance: LegalStructureService;
  
  // Preferred structures by opportunity type
  private structureMap = {
    equity: {
      small: 'corporation', // <$1M
      medium: 'lp', // $1-10M
      large: 'spv' // >$10M
    },
    land: {
      reserve: 'trust', // Section 89 compliant
      adjacent: 'corporation',
      development: 'jv'
    },
    jv: {
      indigenous: 'lp', // Tax efficient for Indigenous partners
      general: 'corporation'
    },
    debt: {
      secured: 'spv',
      unsecured: 'corporation'
    }
  };
  
  private constructor() {}
  
  static getInstance(): LegalStructureService {
    if (!this.instance) {
      this.instance = new LegalStructureService();
    }
    return this.instance;
  }
  
  /**
   * Create optimal structure for investment opportunity
   */
  async createInvestmentVehicle(
    opportunity: InvestmentOpportunity,
    investmentAmount: number,
    partners?: Array<{
      name: string;
      type: 'indigenous' | 'institutional' | 'private';
      amount: number;
    }>
  ): Promise<InvestmentVehicle> {
    // Determine optimal structure
    const vehicleType = this.determineOptimalStructure(opportunity, investmentAmount);
    const jurisdiction = this.selectJurisdiction(opportunity, vehicleType);
    
    // Calculate ownership structure
    const ownership = this.calculateOwnership(investmentAmount, partners);
    
    // Create the vehicle
    const vehicle: InvestmentVehicle = {
      id: `vehicle-${Date.now()}`,
      type: vehicleType,
      jurisdiction,
      
      structure: {
        name: this.generateVehicleName(opportunity, vehicleType),
        indigenousOwnership: ownership.indigenous
      },
      
      ownership,
      
      governance: this.defineGovernance(vehicleType, ownership),
      
      tax: await this.optimizeTaxStructure(opportunity, vehicleType, jurisdiction),
      
      compliance: this.identifyCompliance(vehicleType, jurisdiction, opportunity)
    };
    
    // Register the vehicle
    await this.registerVehicle(vehicle);
    
    // Log to blockchain
    await indigenousLedger.log(
      'investment.vehicle.created',
      'info',
      'Investment vehicle created',
      {
        vehicleId: vehicle.id,
        type: vehicle.type,
        jurisdiction: vehicle.jurisdiction,
        indigenousOwnership: vehicle.ownership.indigenous
      }
    );
    
    return vehicle;
  }
  
  /**
   * Structure for Indigenous joint ventures
   */
  async createIndigenousJV(
    opportunity: InvestmentOpportunity,
    indigenousPartner: {
      name: string;
      nation: string;
      contribution: 'land' | 'capital' | 'operations';
    },
    terms: {
      profitShare: { platform: number; indigenous: number };
      exitRights: string[];
      culturalProtections: string[];
    }
  ): Promise<{
    structure: InvestmentVehicle;
    agreements: string[];
    benefits: string[];
  }> {
    // Special structure for Indigenous partnerships
    const vehicle: InvestmentVehicle = {
      id: `ijv-${Date.now()}`,
      type: 'jv',
      jurisdiction: 'Canada', // Usually federal for Indigenous JVs
      
      structure: {
        name: `${indigenousPartner.nation} Development Partnership`,
        indigenousOwnership: terms.profitShare.indigenous
      },
      
      ownership: {
        platform: terms.profitShare.platform,
        indigenous: terms.profitShare.indigenous,
        other: 0
      },
      
      governance: {
        boardSeats: 5, // Equal representation
        votingRights: 'Unanimous on major decisions',
        vetoRights: [
          'Cultural site development',
          'Environmental impact',
          'Community employment targets'
        ],
        reportingRequirements: [
          'Quarterly community impact report',
          'Annual Indigenous employment metrics',
          'Environmental stewardship report'
        ]
      },
      
      tax: {
        structure: 'flow-through',
        estimatedRate: 0, // Tax exempt on reserve
        benefits: [
          'Section 87 tax exemption for on-reserve income',
          'Flow-through to Indigenous beneficiaries',
          'GST/HST exemption on reserve'
        ],
        section89Exempt: true
      },
      
      compliance: {
        regulations: [
          'First Nations Land Management Act',
          'Indian Act provisions',
          'Environmental assessment requirements'
        ],
        filingRequirements: [
          'Band council resolutions',
          'Community consultation records',
          'Impact benefit agreement'
        ],
        restrictions: [
          'No alienation of reserve lands',
          'Community benefit requirements',
          'Traditional use protections'
        ]
      }
    };
    
    // Create necessary agreements
    const agreements = await this.createJVAgreements(vehicle, indigenousPartner, terms);
    
    // Calculate unique benefits
    const benefits = [
      `${terms.profitShare.indigenous}% profit participation for ${indigenousPartner.nation}`,
      'Tax-efficient structure maximizing community returns',
      'Cultural protections embedded in governance',
      'Capacity building and knowledge transfer provisions',
      'Guaranteed community employment targets'
    ];
    
    // Register with Indigenous Services Canada
    await this.registerIndigenousPartnership(vehicle, indigenousPartner);
    
    return { structure: vehicle, agreements, benefits };
  }
  
  /**
   * Create Section 89 compliant structure for reserve lands
   */
  async createSection89Structure(
    landDetails: {
      reserve: string;
      bandNumber: string;
      hectares: number;
      currentUse: string;
      proposedUse: string;
    },
    investmentAmount: number
  ): Promise<{
    structure: InvestmentVehicle;
    bankableFeatures: string[];
    lendingCapacity: number;
  }> {
    // Special trust structure that maintains Section 89 protection
    const vehicle: InvestmentVehicle = {
      id: `s89-${Date.now()}`,
      type: 'trust',
      jurisdiction: 'Federal - Indian Act',
      
      structure: {
        name: `${landDetails.reserve} Development Trust`,
        indigenousOwnership: 51 // Majority Indigenous to maintain benefits
      },
      
      ownership: {
        platform: 49,
        indigenous: 51,
        other: 0
      },
      
      governance: {
        boardSeats: 7,
        votingRights: 'Indigenous majority on land use decisions',
        vetoRights: [
          'Change in land use',
          'Environmental degradation',
          'Sale or long-term lease'
        ],
        reportingRequirements: [
          'Monthly to band council',
          'Quarterly to lenders',
          'Annual community meeting'
        ]
      },
      
      tax: {
        structure: 'flow-through',
        estimatedRate: 0,
        benefits: [
          'Section 87 tax exemption maintained',
          'No property tax on improvements',
          'GST/HST exemption for on-reserve activities',
          'Flow-through of tax benefits to Indigenous members'
        ],
        section89Exempt: true
      },
      
      compliance: {
        regulations: [
          'Section 89 of Indian Act',
          'First Nations Land Management Act',
          'Reserve land use bylaws'
        ],
        filingRequirements: [
          'Band Council Resolution',
          'Land use permit',
          'Environmental assessment'
        ],
        restrictions: [
          'Cannot mortgage land directly',
          'No seizure by non-Indigenous creditors',
          'Community use provisions'
        ]
      }
    };
    
    // Calculate bankable features despite Section 89
    const bankableFeatures = [
      'Revenue stream from land use fees (not the land itself)',
      'Government payment guarantees through our escrow',
      'Performance bonds from contractors',
      'Business interruption insurance',
      'Platform guarantee on minimum returns'
    ];
    
    // Lending capacity based on revenue, not land value
    const annualRevenue = investmentAmount * 0.15; // 15% return
    const lendingCapacity = annualRevenue * 5; // 5x revenue multiple
    
    return {
      structure: vehicle,
      bankableFeatures,
      lendingCapacity
    };
  }
  
  /**
   * Optimize for tax efficiency
   */
  private async optimizeTaxStructure(
    opportunity: InvestmentOpportunity,
    vehicleType: string,
    jurisdiction: string
  ): Promise<InvestmentVehicle['tax']> {
    let taxStructure: InvestmentVehicle['tax'] = {
      structure: 'corporate',
      estimatedRate: 0.26, // Default corporate rate
      benefits: [],
      section89Exempt: false
    };
    
    // Optimize based on opportunity type
    if (opportunity.structure.indigenousParticipation && opportunity.structure.indigenousParticipation > 50) {
      taxStructure = {
        structure: 'flow-through',
        estimatedRate: 0,
        benefits: [
          'Section 87 tax exemption for Indigenous beneficiaries',
          'Flow-through of resource tax credits',
          'No withholding tax on distributions'
        ],
        section89Exempt: opportunity.projectLocation?.isReserve
      };
    } else if (vehicleType === 'lp') {
      taxStructure = {
        structure: 'flow-through',
        estimatedRate: 0.15, // Capital gains rate
        benefits: [
          'Flow-through taxation to partners',
          'Capital gains treatment on exit',
          'Deductible investment expenses'
        ]
      };
    } else if (jurisdiction === 'Delaware') {
      taxStructure = {
        structure: 'corporate',
        estimatedRate: 0.21,
        benefits: [
          'No state tax on non-Delaware income',
          'Privacy protections',
          'Flexible corporate structure'
        ]
      };
    }
    
    return taxStructure;
  }
  
  /**
   * Helper methods
   */
  private determineOptimalStructure(
    opportunity: InvestmentOpportunity,
    amount: number
  ): InvestmentVehicle['type'] {
    // For reserve land investments
    if (opportunity.projectLocation?.isReserve) {
      return 'trust';
    }
    
    // For Indigenous JVs
    if (opportunity.structure.indigenousParticipation && opportunity.structure.indigenousParticipation > 25) {
      return 'jv';
    }
    
    // Size-based for equity investments
    if (opportunity.target.type === 'equity') {
      if (amount < 1000000) return 'corporation';
      if (amount < 10000000) return 'lp';
      return 'spv';
    }
    
    // Default
    return 'corporation';
  }
  
  private selectJurisdiction(
    opportunity: InvestmentOpportunity,
    vehicleType: string
  ): string {
    // Indigenous opportunities stay in Canada
    if (opportunity.structure.indigenousParticipation) {
      return 'Canada';
    }
    
    // SPVs often in Delaware
    if (vehicleType === 'spv') {
      return 'Delaware';
    }
    
    // Default to opportunity location
    return opportunity.structure.jurisdiction;
  }
  
  private calculateOwnership(
    platformAmount: number,
    partners?: unknown[]
  ): InvestmentVehicle['ownership'] {
    if (!partners || partners.length === 0) {
      return { platform: 100, indigenous: 0, other: 0 };
    }
    
    const totalAmount = platformAmount + partners.reduce((sum, p) => sum + p.amount, 0);
    const indigenousAmount = partners
      .filter(p => p.type === 'indigenous')
      .reduce((sum, p) => sum + p.amount, 0);
    const otherAmount = partners
      .filter(p => p.type !== 'indigenous')
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      platform: (platformAmount / totalAmount) * 100,
      indigenous: (indigenousAmount / totalAmount) * 100,
      other: (otherAmount / totalAmount) * 100
    };
  }
  
  private defineGovernance(
    vehicleType: string,
    ownership: InvestmentVehicle['ownership']
  ): InvestmentVehicle['governance'] {
    // Fair governance even with majority ownership
    return {
      boardSeats: vehicleType === 'jv' ? 5 : 3,
      votingRights: ownership.platform > 50 ? 'Platform majority' : 'Proportional',
      vetoRights: ownership.indigenous > 25 ? [
        'Major asset sales',
        'Change in business purpose',
        'Environmental policy changes'
      ] : [],
      reportingRequirements: [
        'Quarterly financial statements',
        'Annual audit',
        vehicleType === 'jv' ? 'Community impact report' : 'Investor report'
      ]
    };
  }
  
  private identifyCompliance(
    vehicleType: string,
    jurisdiction: string,
    opportunity: InvestmentOpportunity
  ): InvestmentVehicle['compliance'] {
    const compliance = {
      regulations: ['Securities regulations', 'AML/KYC requirements'],
      filingRequirements: ['Annual returns', 'Tax filings'],
      restrictions: []
    };
    
    // Add specific requirements
    if (jurisdiction === 'Canada') {
      compliance.regulations.push('Investment Canada Act');
    }
    
    if (opportunity.structure.indigenousParticipation) {
      compliance.regulations.push('First Nations consultation requirements');
      compliance.filingRequirements.push('Indigenous partnership reports');
    }
    
    if (vehicleType === 'trust') {
      compliance.restrictions.push('Trustee fiduciary duties');
    }
    
    return compliance;
  }
  
  private generateVehicleName(
    opportunity: InvestmentOpportunity,
    vehicleType: string
  ): string {
    const suffix = {
      corporation: 'Holdings Inc.',
      lp: 'Investment LP',
      trust: 'Development Trust',
      jv: 'Joint Venture',
      spv: 'SPV Ltd.'
    };
    
    const prefix = opportunity.target.name.split(' ')[0];
    return `${prefix} ${suffix[vehicleType]}`;
  }
  
  private async registerVehicle(vehicle: InvestmentVehicle): Promise<void> {
    // In production, would integrate with corporate registries
    await prisma.investmentVehicle.create({
      data: {
        vehicleId: vehicle.id,
        type: vehicle.type,
        jurisdiction: vehicle.jurisdiction,
        structure: vehicle.structure,
        status: 'active',
        createdAt: new Date()
      }
    });
  }
  
  private async createJVAgreements(
    vehicle: InvestmentVehicle,
    partner: any,
    terms: any
  ): Promise<string[]> {
    return [
      'Joint Venture Agreement',
      'Profit Sharing Agreement',
      'Management Services Agreement',
      'Cultural Protection Protocol',
      'Exit and Buy-Sell Agreement'
    ];
  }
  
  private async registerIndigenousPartnership(
    vehicle: InvestmentVehicle,
    partner: any
  ): Promise<void> {
    // Register with Indigenous Services Canada
    logger.info('Registering Indigenous partnership:', vehicle.id);
  }
}

export default LegalStructureService;