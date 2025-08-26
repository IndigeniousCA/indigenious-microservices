import { prisma } from '@/lib/prisma';

interface PressurePoint {
  type: 'competitor' | 'customer' | 'partner' | 'government' | 'media';
  intensity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  size: number;
  hasVerificationBadge: boolean;
  socialAccounts: {
    platform: string;
    handle: string;
    followers: number;
  }[];
  pressureScore: number;
}

export class SocialPressureEngine {
  /**
   * Calculate pressure score for unverified business
   */
  async calculatePressureScore(business: BusinessProfile): Promise<number> {
    let score = 0;

    // Competitor pressure
    const competitorPressure = await this.getCompetitorPressure(business);
    score += competitorPressure * 0.3;

    // Customer expectations
    const customerPressure = await this.getCustomerPressure(business);
    score += customerPressure * 0.25;

    // Government requirements
    const governmentPressure = await this.getGovernmentPressure(business);
    score += governmentPressure * 0.25;

    // Industry penetration
    const industryPressure = await this.getIndustryPressure(business);
    score += industryPressure * 0.2;

    return Math.min(score, 100);
  }

  /**
   * Generate pressure campaign for specific business
   */
  async generatePressureCampaign(
    business: BusinessProfile
  ): Promise<PressurePoint[]> {
    const pressurePoints: PressurePoint[] = [];
    const score = await this.calculatePressureScore(business);

    // Competitor comparison
    if (score > 30) {
      const competitors = await this.getVerifiedCompetitors(business);
      pressurePoints.push({
        type: 'competitor',
        intensity: score > 70 ? 'high' : 'medium',
        message: `${competitors.length} of your direct competitors are already Indigenous Verified. ${competitors[0]?.name} reports 23% increase in Indigenous partnerships since getting their ${competitors[0]?.badge} badge.`,
        action: 'public_comparison'
      });
    }

    // Customer expectations
    if (score > 50) {
      pressurePoints.push({
        type: 'customer',
        intensity: 'high',
        message: `Survey: 78% of procurement officers now check for Indigenous Verification Badges before sending RFQs. No badge = missed opportunities.`,
        action: 'customer_testimonial'
      });
    }

    // Government mandate
    if (business.industry === 'construction' || business.industry === 'consulting') {
      pressurePoints.push({
        type: 'government',
        intensity: 'critical',
        message: `URGENT: Federal government making Indigenous Verification mandatory for all contracts over $1M. Deadline approaching fast.`,
        action: 'compliance_warning'
      });
    }

    // Media attention
    if (business.size > 50 && !business.hasVerificationBadge) {
      pressurePoints.push({
        type: 'media',
        intensity: 'high',
        message: `Media investigating "Why major companies avoid Indigenous verification". Your absence is becoming noticeable.`,
        action: 'media_inquiry'
      });
    }

    return pressurePoints;
  }

  /**
   * Deploy automated pressure tactics
   */
  async deployPressureTactics(
    business: BusinessProfile,
    pressurePoints: PressurePoint[]
  ): Promise<void> {
    for (const point of pressurePoints) {
      switch (point.action) {
        case 'public_comparison':
          await this.deployPublicComparison(business, point);
          break;
        
        case 'customer_testimonial':
          await this.deployCustomerTestimonial(business, point);
          break;
        
        case 'compliance_warning':
          await this.deployComplianceWarning(business, point);
          break;
        
        case 'media_inquiry':
          await this.deployMediaInquiry(business, point);
          break;
      }
    }
  }

  /**
   * Create viral comparison graphics
   */
  async createComparisonGraphic(
    unverifiedBusiness: string,
    verifiedCompetitors: any[]
  ): Promise<any> {
    return {
      title: 'Who\'s Verified in Your Industry?',
      layout: 'grid',
      businesses: [
        ...verifiedCompetitors.map(c => ({
          name: c.name,
          status: 'VERIFIED',
          badge: c.badge,
          stage: c.stage,
          benefits: [
            '+23% Indigenous partnerships',
            '+45% RFQ invitations',
            'Priority in federal contracts'
          ]
        })),
        {
          name: unverifiedBusiness,
          status: 'UNVERIFIED',
          badge: null,
          stage: null,
          benefits: [
            'Missing opportunities',
            'Losing to competitors',
            'Questions about commitment'
          ]
        }
      ],
      callToAction: 'Get verified in 48 hours: indigenious.ca/verify'
    };
  }

  /**
   * Monitor and escalate pressure
   */
  async monitorPressureEffectiveness(
    business: BusinessProfile,
    campaignId: string
  ): Promise<void> {
    // Track engagement metrics
    const metrics = await this.trackCampaignMetrics(campaignId);
    
    // If no response after 48 hours, escalate
    if (!metrics.businessResponded && metrics.hoursElapsed > 48) {
      await this.escalatePressure(business);
    }
    
    // If competitor got verified, use as ammunition
    if (metrics.competitorConversions > 0) {
      await this.leverageCompetitorConversion(business, metrics);
    }
  }

  /**
   * Escalation tactics
   */
  private async escalatePressure(business: BusinessProfile): Promise<void> {
    // Phase 1: Direct employee outreach
    await this.targetEmployees(business, {
      message: 'Your employer hasn\'t verified their Indigenous commitment. Ask why.',
      platform: 'linkedin'
    });

    // Phase 2: Board member attention
    await this.targetBoardMembers(business, {
      message: 'Governance question: Why is your company avoiding Indigenous verification?',
      platform: 'twitter'
    });

    // Phase 3: Investor relations
    await this.targetInvestors(business, {
      message: 'ESG Alert: Company failing Indigenous verification requirements',
      platform: 'email'
    });
  }

  /**
   * Create FOMO through success stories
   */
  async amplifySuccessStories(
    industry: string,
    excludeBusiness: string
  ): Promise<void> {
    const successStories = await this.getIndustrySuccessStories(industry);
    
    // Create carousel of wins
    const carousel = {
      title: `This Week's Indigenous Verification Wins in ${industry}`,
      stories: successStories.map(story => ({
        business: story.name,
        badge: story.badge,
        metric: story.keyMetric,
        quote: story.testimonial,
        image: story.celebrationPhoto
      })),
      footer: `Everyone's winning except ${excludeBusiness}`
    };

    await this.distributeCarousel(carousel);
  }

  /**
   * Deploy psychological triggers
   */
  async deployPsychologicalTriggers(business: BusinessProfile): Promise<void> {
    const triggers = [
      {
        type: 'scarcity',
        message: 'Only 50 verification slots left this month. First come, first served.'
      },
      {
        type: 'social_proof',
        message: '312 businesses verified this week. Fastest growing business movement in Canada.'
      },
      {
        type: 'authority',
        message: 'Indigenous leaders calling unverified businesses "part of the problem, not the solution"'
      },
      {
        type: 'loss_aversion',
        message: 'Verified competitors stealing your Indigenous partnership opportunities daily'
      },
      {
        type: 'reciprocity',
        message: 'Indigenous businesses supported you. Time to return the commitment.'
      }
    ];

    // Deploy triggers strategically
    for (const trigger of triggers) {
      await this.scheduleTrigger(business, trigger);
    }
  }

  /**
   * Helper methods
   */
  private async getCompetitorPressure(business: BusinessProfile): Promise<number> {
    const verifiedCompetitors = await prisma.badge.count({
      where: {
        business: {
          industries: {
            has: business.industry
          }
        }
      }
    });

    const totalCompetitors = await prisma.business.count({
      where: {
        industries: {
          has: business.industry
        }
      }
    });

    return (verifiedCompetitors / totalCompetitors) * 100;
  }

  private async getCustomerPressure(business: BusinessProfile): Promise<number> {
    // Simulate customer pressure based on RFQ requirements
    const rfqsRequiringBadge = await prisma.rFQ.count({
      where: {
        description: {
          contains: 'verification badge',
          mode: 'insensitive'
        }
      }
    });

    const totalRfqs = await prisma.rFQ.count();
    
    return (rfqsRequiringBadge / totalRfqs) * 100;
  }

  private async getGovernmentPressure(business: BusinessProfile): Promise<number> {
    // Check if business has government contracts
    const hasGovContracts = await prisma.contract.count({
      where: {
        businessId: business.id,
        rfq: {
          postedBy: {
            role: 'GOVERNMENT_OFFICER'
          }
        }
      }
    });

    return hasGovContracts > 0 ? 80 : 20;
  }

  private async getIndustryPressure(business: BusinessProfile): Promise<number> {
    const industryBadges = await prisma.badge.count({
      where: {
        business: {
          industries: {
            has: business.industry
          }
        }
      }
    });

    // Industry-specific thresholds
    const thresholds: Record<string, number> = {
      construction: 100,
      consulting: 150,
      technology: 200,
      manufacturing: 80
    };

    const threshold = thresholds[business.industry] || 100;
    return Math.min((industryBadges / threshold) * 100, 100);
  }

  private async getVerifiedCompetitors(business: BusinessProfile): Promise<any[]> {
    const competitors = await prisma.badge.findMany({
      where: {
        business: {
          industries: {
            has: business.industry
          },
          id: {
            not: business.id
          }
        }
      },
      include: {
        business: {
          select: {
            name: true,
            employeeCount: true
          }
        }
      },
      orderBy: {
        evolutionStage: 'desc'
      },
      take: 5
    });

    return competitors.map(c => ({
      name: c.business.name,
      badge: c.animalSpirit,
      stage: c.evolutionStage,
      size: c.business.employeeCount
    }));
  }

  private async deployPublicComparison(
    business: BusinessProfile,
    point: PressurePoint
  ): Promise<void> {
    console.log(`Deploying public comparison for ${business.name}:`, point);
  }

  private async deployCustomerTestimonial(
    business: BusinessProfile,
    point: PressurePoint
  ): Promise<void> {
    console.log(`Deploying customer testimonial for ${business.name}:`, point);
  }

  private async deployComplianceWarning(
    business: BusinessProfile,
    point: PressurePoint
  ): Promise<void> {
    console.log(`Deploying compliance warning for ${business.name}:`, point);
  }

  private async deployMediaInquiry(
    business: BusinessProfile,
    point: PressurePoint
  ): Promise<void> {
    console.log(`Deploying media inquiry for ${business.name}:`, point);
  }

  private async trackCampaignMetrics(campaignId: string): Promise<any> {
    return {
      businessResponded: false,
      hoursElapsed: 72,
      competitorConversions: 3,
      socialMentions: 45,
      employeeEngagement: 12
    };
  }

  private async leverageCompetitorConversion(
    business: BusinessProfile,
    metrics: any
  ): Promise<void> {
    console.log(`Leveraging competitor conversion against ${business.name}`);
  }

  private async targetEmployees(business: BusinessProfile, config: any): Promise<void> {
    console.log(`Targeting employees of ${business.name}:`, config);
  }

  private async targetBoardMembers(business: BusinessProfile, config: any): Promise<void> {
    console.log(`Targeting board members of ${business.name}:`, config);
  }

  private async targetInvestors(business: BusinessProfile, config: any): Promise<void> {
    console.log(`Targeting investors of ${business.name}:`, config);
  }

  private async getIndustrySuccessStories(industry: string): Promise<any[]> {
    const stories = await prisma.badge.findMany({
      where: {
        business: {
          industries: {
            has: industry
          }
        },
        evolutionStage: {
          gte: 3
        }
      },
      include: {
        business: true
      },
      take: 5
    });

    return stories.map(s => ({
      name: s.business.name,
      badge: s.animalSpirit,
      keyMetric: '+45% Indigenous partnerships',
      testimonial: 'Best business decision we ever made',
      celebrationPhoto: `celebration-${s.id}.jpg`
    }));
  }

  private async distributeCarousel(carousel: any): Promise<void> {
    console.log('Distributing success carousel:', carousel);
  }

  private async scheduleTrigger(
    business: BusinessProfile,
    trigger: any
  ): Promise<void> {
    console.log(`Scheduling ${trigger.type} trigger for ${business.name}`);
  }
}