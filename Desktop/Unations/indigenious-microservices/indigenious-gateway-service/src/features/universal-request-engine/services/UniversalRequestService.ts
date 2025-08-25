// Universal Request Service
// Core business logic for the universal request engine

import { createClient } from '@/utils/supabase/server';
import type { 
  UniversalBusinessRequest, 
  RequestType, 
  RequestStatus,
  UniversalServiceProvider,
  UniversalBid,
  UniversalWorkflow,
  WorkflowStage,
  BusinessDataPackage,
  ServiceCategory
} from '../types';

export class UniversalRequestService {
  private supabase;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    this.supabase = await createClient();
  }

  // Create a new universal request
  async createRequest(
    request: Partial<UniversalBusinessRequest>,
    businessId: string
  ): Promise<UniversalBusinessRequest> {
    // Validate request based on type
    this.validateRequest(request);

    // Auto-populate from business data package if available
    const dataPackage = await this.getBusinessDataPackage(businessId);

    const newRequest: UniversalBusinessRequest = {
      id: this.generateId(),
      businessId,
      createdAt: new Date(),
      status: 'Draft',
      dataPackage,
      metrics: {
        viewCount: 0,
        bidCount: 0,
        daysOpen: 0,
        questionsReceived: 0,
        documentsShared: 0,
      },
      ...request,
    } as UniversalBusinessRequest;

    // Save to database
    await this.saveRequest(newRequest);

    // Generate workflow based on request type
    await this.generateWorkflow(newRequest);

    return newRequest;
  }

  // Get or create business data package
  async getBusinessDataPackage(businessId: string): Promise<BusinessDataPackage> {
    // Check if we have cached data package
    const cached = await this.getCachedDataPackage(businessId);
    if (cached) return cached;

    // Build from various sources
    const businessProfile = await this.getBusinessProfile(businessId);
    const financials = await this.getFinancialSnapshot(businessId);
    const capabilities = await this.getBusinessCapabilities(businessId);
    const trackRecord = await this.getTrackRecord(businessId);
    const documents = await this.getBusinessDocuments(businessId);

    const dataPackage: BusinessDataPackage = {
      businessProfile,
      financials,
      capabilities,
      trackRecord,
      documents,
    };

    // Cache for future use
    await this.cacheDataPackage(businessId, dataPackage);

    return dataPackage;
  }

  // Intelligent provider matching
  async matchProviders(
    request: UniversalBusinessRequest
  ): Promise<UniversalServiceProvider[]> {
    const matches: UniversalServiceProvider[] = [];

    // Get base criteria
    const criteria = this.extractMatchingCriteria(request);

    // Query providers based on request type
    let providers = await this.queryProvidersByType(request.request.type, criteria);

    // Apply intelligent filters
    providers = this.applyIntelligentFilters(providers, request);

    // Score and rank providers
    const scoredProviders = await this.scoreProviders(providers, request);

    // Apply preferences
    const finalProviders = this.applyPreferences(scoredProviders, request.preferences);

    return finalProviders;
  }

  // Extract matching criteria from request
  private extractMatchingCriteria(request: UniversalBusinessRequest) {
    const criteria: any = {
      category: this.getServiceCategories(request),
      location: request.location,
      budget: request.budget,
      timeline: request.timeline,
    };

    // Add type-specific criteria
    switch (request.request.type) {
      case 'Partnership':
        criteria.partnershipExperience = true;
        criteria.provinces = [request.requirements.partnership?.province];
        break;
      
      case 'Construction':
        criteria.trades = request.requirements.construction?.trades;
        criteria.bondingRequired = request.budget.amount ? request.budget.amount > 1000000 : false;
        break;
      
      case 'Resource':
        criteria.resourceType = request.requirements.resource?.type;
        criteria.environmentalCertified = true;
        break;
    }

    return criteria;
  }

  // Get relevant service categories for request
  private getServiceCategories(request: UniversalBusinessRequest): ServiceCategory[] {
    const categoryMap: Record<RequestType, ServiceCategory[]> = {
      Partnership: ['Legal', 'Financial', 'Consulting'],
      Construction: ['Construction', 'Technical', 'Management'],
      Professional: ['Consulting', 'Management', 'Technical'],
      Supply: ['Technical', 'Management'],
      Resource: ['Environmental', 'Technical', 'Legal'],
      Community: ['Cultural', 'Construction', 'Consulting'],
    };

    return categoryMap[request.request.type] || [];
  }

  // Apply AI-powered intelligent filters
  private applyIntelligentFilters(
    providers: UniversalServiceProvider[],
    request: UniversalBusinessRequest
  ): UniversalServiceProvider[] {
    return providers.filter(provider => {
      // Check capacity
      if (!this.hasCapacity(provider, request)) return false;

      // Check cultural fit for Indigenous requests
      if (request.preferences.culturalCompetency && 
          !this.hasCulturalCompetency(provider)) return false;

      // Check timeline compatibility
      if (!this.canMeetTimeline(provider, request.timeline)) return false;

      // Check certification requirements
      if (!this.meetsCertificationRequirements(provider, request)) return false;

      return true;
    });
  }

  // Score providers based on multiple factors
  private async scoreProviders(
    providers: UniversalServiceProvider[],
    request: UniversalBusinessRequest
  ): Promise<(UniversalServiceProvider & { score: number })[]> {
    const scoredProviders = await Promise.all(
      providers.map(async provider => {
        let score = 0;

        // Experience score (0-30)
        score += this.calculateExperienceScore(provider, request) * 0.3;

        // Price competitiveness (0-25)
        score += await this.calculatePriceScore(provider, request) * 0.25;

        // Performance history (0-20)
        score += this.calculatePerformanceScore(provider) * 0.2;

        // Indigenous/local content (0-15)
        score += this.calculateLocalContentScore(provider, request) * 0.15;

        // Availability/timeline (0-10)
        score += this.calculateAvailabilityScore(provider, request) * 0.1;

        return { ...provider, score };
      })
    );

    // Sort by score
    return scoredProviders.sort((a, b) => b.score - a.score);
  }

  // Generate workflow based on request type
  private async generateWorkflow(
    request: UniversalBusinessRequest
  ): Promise<UniversalWorkflow> {
    const workflowTemplates = {
      Partnership: this.getPartnershipWorkflow,
      Construction: this.getConstructionWorkflow,
      Professional: this.getProfessionalWorkflow,
      Supply: this.getSupplyWorkflow,
      Resource: this.getResourceWorkflow,
      Community: this.getCommunityWorkflow,
    };

    const templateGenerator = workflowTemplates[request.request.type];
    const stages = templateGenerator.call(this, request);

    const workflow: UniversalWorkflow = {
      id: this.generateId(),
      requestId: request.id,
      type: request.request.type,
      status: 'Planning',
      stages,
      currentStage: stages[0].id,
      participants: [],
      timeline: {
        started: new Date(),
        estimatedCompletion: this.calculateEstimatedCompletion(stages),
      },
      metrics: {
        totalTasks: this.countTotalTasks(stages),
        completedTasks: 0,
        onTimeTasks: 0,
        delayedDays: 0,
        costVariance: 0,
      },
    };

    await this.saveWorkflow(workflow);
    return workflow;
  }

  // Get partnership formation workflow
  private getPartnershipWorkflow(request: UniversalBusinessRequest): WorkflowStage[] {
    return [
      {
        id: 'data-collection',
        name: 'Data Collection & Preparation',
        description: 'Gather all required information and documents',
        order: 1,
        status: 'Active',
        tasks: [
          {
            id: 'business-profiles',
            name: 'Complete partner business profiles',
            status: 'NotStarted',
            dueDate: this.addDays(new Date(), 3),
          },
          {
            id: 'financial-review',
            name: 'Prepare financial documents',
            status: 'NotStarted',
            dueDate: this.addDays(new Date(), 5),
          },
        ],
        assignedTo: [],
        timeline: {
          planned: {
            start: new Date(),
            end: this.addDays(new Date(), 7),
          },
        },
      },
      {
        id: 'professional-selection',
        name: 'Select Legal & Financial Professionals',
        description: 'Choose lawyers, accountants, and other professionals',
        order: 2,
        status: 'Pending',
        tasks: [
          {
            id: 'post-requirements',
            name: 'Post professional service requirements',
            status: 'NotStarted',
          },
          {
            id: 'review-bids',
            name: 'Review and compare bids',
            status: 'NotStarted',
          },
          {
            id: 'select-team',
            name: 'Select professional team',
            status: 'NotStarted',
          },
        ],
        dependencies: ['data-collection'],
        assignedTo: [],
        timeline: {
          planned: {
            start: this.addDays(new Date(), 7),
            end: this.addDays(new Date(), 10),
          },
        },
      },
      {
        id: 'legal-structure',
        name: 'Legal Structure & Agreements',
        description: 'Draft and review partnership agreements',
        order: 3,
        status: 'Pending',
        tasks: [
          {
            id: 'structure-recommendation',
            name: 'Receive structure recommendations',
            status: 'NotStarted',
          },
          {
            id: 'agreement-drafting',
            name: 'Draft partnership agreement',
            status: 'NotStarted',
          },
          {
            id: 'legal-review',
            name: 'Legal review and revisions',
            status: 'NotStarted',
          },
        ],
        dependencies: ['professional-selection'],
        assignedTo: [],
        timeline: {
          planned: {
            start: this.addDays(new Date(), 10),
            end: this.addDays(new Date(), 21),
          },
        },
      },
      {
        id: 'financial-setup',
        name: 'Financial & Administrative Setup',
        description: 'Set up banking, accounting, and tax registration',
        order: 4,
        status: 'Pending',
        tasks: [
          {
            id: 'banking-setup',
            name: 'Open partnership bank accounts',
            status: 'NotStarted',
          },
          {
            id: 'tax-registration',
            name: 'Register for tax accounts',
            status: 'NotStarted',
          },
          {
            id: 'accounting-setup',
            name: 'Set up accounting systems',
            status: 'NotStarted',
          },
        ],
        dependencies: ['legal-structure'],
        assignedTo: [],
        timeline: {
          planned: {
            start: this.addDays(new Date(), 21),
            end: this.addDays(new Date(), 28),
          },
        },
      },
      {
        id: 'finalization',
        name: 'Finalization & Launch',
        description: 'Sign agreements and officially launch partnership',
        order: 5,
        status: 'Pending',
        tasks: [
          {
            id: 'final-review',
            name: 'Final review of all documents',
            status: 'NotStarted',
          },
          {
            id: 'signing-ceremony',
            name: 'Partnership signing',
            status: 'NotStarted',
          },
          {
            id: 'registration',
            name: 'Register with government',
            status: 'NotStarted',
          },
        ],
        dependencies: ['financial-setup'],
        assignedTo: [],
        timeline: {
          planned: {
            start: this.addDays(new Date(), 28),
            end: this.addDays(new Date(), 35),
          },
        },
      },
    ];
  }

  // Helper methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private calculateEstimatedCompletion(stages: WorkflowStage[]): Date {
    const lastStage = stages[stages.length - 1];
    return lastStage.timeline.planned.end;
  }

  private countTotalTasks(stages: WorkflowStage[]): number {
    return stages.reduce((total, stage) => total + stage.tasks.length, 0);
  }

  private hasCapacity(provider: UniversalServiceProvider, request: UniversalBusinessRequest): boolean {
    // Check if provider has capacity for this project
    const activeJobs = provider.performance.activeJobs;
    const size = provider.profile.size;
    
    const capacityLimits = {
      Sole: 3,
      Small: 10,
      Medium: 25,
      Large: 100,
    };

    return activeJobs < capacityLimits[size];
  }

  private hasCulturalCompetency(provider: UniversalServiceProvider): boolean {
    return provider.compliance.indigenousVerification?.ccab || 
           provider.performance.indigenousClients > 20;
  }

  private canMeetTimeline(provider: UniversalServiceProvider, timeline: any): boolean {
    // Complex timeline checking logic
    return true; // Simplified for now
  }

  private meetsCertificationRequirements(
    provider: UniversalServiceProvider, 
    request: UniversalBusinessRequest
  ): boolean {
    // Check if provider has required certifications
    return true; // Simplified for now
  }

  private calculateExperienceScore(
    provider: UniversalServiceProvider,
    request: UniversalBusinessRequest
  ): number {
    // Calculate based on relevant experience
    const relevantJobs = provider.performance.completedJobs;
    const yearsInBusiness = new Date().getFullYear() - (provider.profile.yearEstablished || 2020);
    
    return Math.min(100, (relevantJobs * 0.5) + (yearsInBusiness * 5));
  }

  private async calculatePriceScore(
    provider: UniversalServiceProvider,
    request: UniversalBusinessRequest
  ): Promise<number> {
    // Compare to market rates
    return 80; // Simplified for now
  }

  private calculatePerformanceScore(provider: UniversalServiceProvider): number {
    const rating = provider.performance.averageRating || 0;
    const onTime = provider.performance.onTimeDelivery || 0;
    const disputes = 100 - (provider.performance.disputeRate || 0);
    
    return (rating * 20) + (onTime * 0.4) + (disputes * 0.4);
  }

  private calculateLocalContentScore(
    provider: UniversalServiceProvider,
    request: UniversalBusinessRequest
  ): number {
    let score = 0;
    
    if (provider.profile.indigenousOwned) score += 50;
    if (provider.coverage.provinces.includes(request.location.primary.province)) score += 30;
    if (provider.performance.indigenousClients > 50) score += 20;
    
    return score;
  }

  private calculateAvailabilityScore(
    provider: UniversalServiceProvider,
    request: UniversalBusinessRequest
  ): number {
    const responseTime = provider.performance.responseTime || 24;
    if (responseTime < 2) return 100;
    if (responseTime < 6) return 80;
    if (responseTime < 24) return 60;
    return 40;
  }

  private applyPreferences(
    providers: unknown[],
    preferences: any
  ): UniversalServiceProvider[] {
    // Apply user preferences to final ranking
    return providers; // Simplified for now
  }

  // Database operations (simplified)
  private async saveRequest(request: UniversalBusinessRequest): Promise<void> {
    // Save to database
  }

  private async saveWorkflow(workflow: UniversalWorkflow): Promise<void> {
    // Save to database
  }

  private async getCachedDataPackage(businessId: string): Promise<BusinessDataPackage | null> {
    // Check cache
    return null;
  }

  private async cacheDataPackage(businessId: string, dataPackage: BusinessDataPackage): Promise<void> {
    // Cache data
  }

  private async getBusinessProfile(businessId: string): Promise<unknown> {
    // Get from database
    return {};
  }

  private async getFinancialSnapshot(businessId: string): Promise<unknown> {
    // Get from database
    return {};
  }

  private async getBusinessCapabilities(businessId: string): Promise<unknown> {
    // Get from database
    return {};
  }

  private async getTrackRecord(businessId: string): Promise<unknown> {
    // Get from database
    return {};
  }

  private async getBusinessDocuments(businessId: string): Promise<unknown> {
    // Get from database
    return {};
  }

  private validateRequest(request: Partial<UniversalBusinessRequest>): void {
    // Validation logic
  }

  private async queryProvidersByType(type: RequestType, criteria: any): Promise<UniversalServiceProvider[]> {
    // Query database
    return [];
  }

  private getConstructionWorkflow(request: UniversalBusinessRequest): WorkflowStage[] {
    // Construction-specific workflow
    return [];
  }

  private getProfessionalWorkflow(request: UniversalBusinessRequest): WorkflowStage[] {
    // Professional services workflow
    return [];
  }

  private getSupplyWorkflow(request: UniversalBusinessRequest): WorkflowStage[] {
    // Supply/procurement workflow
    return [];
  }

  private getResourceWorkflow(request: UniversalBusinessRequest): WorkflowStage[] {
    // Resource development workflow
    return [];
  }

  private getCommunityWorkflow(request: UniversalBusinessRequest): WorkflowStage[] {
    // Community development workflow
    return [];
  }
}