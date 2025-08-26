import { prisma } from '@/lib/prisma';
import { BadgeViralCampaignService } from './BadgeViralCampaignService';
import { SocialPressureEngine } from './SocialPressureEngine';

interface MilestoneDefinition {
  id: string;
  name: string;
  type: 'badge_count' | 'industry_penetration' | 'government_adoption' | 'viral_coefficient';
  threshold: number;
  rewards: string[];
  campaignTriggers: string[];
  mediaAlerts: boolean;
}

interface ViralMetrics {
  totalBadges: number;
  weeklyGrowth: number;
  growthRate: number;
  viralCoefficient: number;
  industryPenetration: Record<string, number>;
  governmentAdoption: number;
  mediaVelocity: number;
  socialAmplification: number;
}

export class ViralMilestoneService {
  private campaignService: BadgeViralCampaignService;
  private pressureEngine: SocialPressureEngine;

  constructor() {
    this.campaignService = new BadgeViralCampaignService();
    this.pressureEngine = new SocialPressureEngine();
  }

  private readonly milestones: MilestoneDefinition[] = [
    {
      id: 'first_100',
      name: 'The First 100',
      type: 'badge_count',
      threshold: 100,
      rewards: ['Founding Member Status', 'Priority Support', 'Media Feature'],
      campaignTriggers: ['founder_celebration', 'media_blast', 'peer_pressure_wave_1'],
      mediaAlerts: true
    },
    {
      id: 'viral_spark',
      name: 'Viral Spark',
      type: 'viral_coefficient',
      threshold: 1.5,
      rewards: ['Viral Badge Animation', 'Social Amplification'],
      campaignTriggers: ['viral_momentum', 'influencer_activation'],
      mediaAlerts: true
    },
    {
      id: 'industry_domination',
      name: 'Industry Domination',
      type: 'industry_penetration',
      threshold: 25, // 25% of any industry
      rewards: ['Industry Leader Badge', 'Sector Report'],
      campaignTriggers: ['industry_takeover', 'competitor_fomo'],
      mediaAlerts: true
    },
    {
      id: 'government_tipping_point',
      name: 'Government Tipping Point',
      type: 'government_adoption',
      threshold: 10, // 10 government departments
      rewards: ['Government Endorsement', 'Policy Integration'],
      campaignTriggers: ['mandate_campaign', 'compliance_pressure'],
      mediaAlerts: true
    },
    {
      id: 'thousand_spirits',
      name: 'Thousand Spirits',
      type: 'badge_count',
      threshold: 1000,
      rewards: ['Movement Status', 'National Recognition'],
      campaignTriggers: ['movement_declaration', 'shame_campaign'],
      mediaAlerts: true
    },
    {
      id: 'viral_explosion',
      name: 'Viral Explosion',
      type: 'viral_coefficient',
      threshold: 3.0,
      rewards: ['Unstoppable Status', 'Media Frenzy'],
      campaignTriggers: ['explosion_campaign', 'total_market_pressure'],
      mediaAlerts: true
    },
    {
      id: 'market_standard',
      name: 'Market Standard',
      type: 'badge_count',
      threshold: 10000,
      rewards: ['Industry Standard', 'Mandatory Recognition'],
      campaignTriggers: ['standard_enforcement', 'holdout_exposure'],
      mediaAlerts: true
    }
  ];

  /**
   * Monitor and trigger milestone campaigns
   */
  async monitorMilestones(): Promise<void> {
    const metrics = await this.calculateViralMetrics();
    
    for (const milestone of this.milestones) {
      const achieved = await this.checkMilestone(milestone, metrics);
      
      if (achieved) {
        await this.triggerMilestoneCampaign(milestone, metrics);
      } else {
        // Check if we're close (90% of threshold)
        const progress = await this.getMilestoneProgress(milestone, metrics);
        if (progress > 0.9) {
          await this.triggerAnticipationCampaign(milestone, progress);
        }
      }
    }
  }

  /**
   * Calculate comprehensive viral metrics
   */
  async calculateViralMetrics(): Promise<ViralMetrics> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalBadges,
      weeklyBadges,
      monthlyBadges,
      industryData,
      govAdoption,
      socialData
    ] = await Promise.all([
      prisma.badge.count(),
      prisma.badge.count({
        where: { createdAt: { gte: weekAgo } }
      }),
      prisma.badge.count({
        where: { createdAt: { gte: monthAgo } }
      }),
      this.calculateIndustryPenetration(),
      this.calculateGovernmentAdoption(),
      this.calculateSocialAmplification()
    ]);

    // Calculate growth metrics
    const weeklyGrowth = weeklyBadges;
    const growthRate = monthlyBadges > 0 ? (weeklyBadges * 4) / monthlyBadges : 0;
    
    // Calculate viral coefficient
    const viralCoefficient = await this.calculateViralCoefficient();
    
    // Calculate media velocity
    const mediaVelocity = await this.calculateMediaVelocity();

    return {
      totalBadges,
      weeklyGrowth,
      growthRate,
      viralCoefficient,
      industryPenetration: industryData,
      governmentAdoption: govAdoption,
      mediaVelocity,
      socialAmplification: socialData.amplification
    };
  }

  /**
   * Trigger milestone campaign
   */
  async triggerMilestoneCampaign(
    milestone: MilestoneDefinition,
    metrics: ViralMetrics
  ): Promise<void> {
    console.log(`🎉 MILESTONE ACHIEVED: ${milestone.name}`);

    // Record milestone achievement
    await this.recordMilestoneAchievement(milestone, metrics);

    // Trigger all campaign actions
    for (const trigger of milestone.campaignTriggers) {
      await this.executeCampaignTrigger(trigger, milestone, metrics);
    }

    // Send media alerts if enabled
    if (milestone.mediaAlerts) {
      await this.sendMediaAlerts(milestone, metrics);
    }

    // Distribute rewards
    await this.distributeRewards(milestone);

    // Create viral moment content
    await this.createViralMomentContent(milestone, metrics);
  }

  /**
   * Execute specific campaign triggers
   */
  private async executeCampaignTrigger(
    trigger: string,
    milestone: MilestoneDefinition,
    metrics: ViralMetrics
  ): Promise<void> {
    switch (trigger) {
      case 'founder_celebration':
        await this.executeFounderCelebration();
        break;
      
      case 'media_blast':
        await this.executeMediaBlast(milestone, metrics);
        break;
      
      case 'peer_pressure_wave_1':
        await this.executePeerPressureWave(1, metrics);
        break;
      
      case 'viral_momentum':
        await this.executeViralMomentum(metrics);
        break;
      
      case 'influencer_activation':
        await this.executeInfluencerActivation(milestone);
        break;
      
      case 'industry_takeover':
        await this.executeIndustryTakeover(metrics);
        break;
      
      case 'competitor_fomo':
        await this.executeCompetitorFOMO(metrics);
        break;
      
      case 'mandate_campaign':
        await this.executeMandateCampaign();
        break;
      
      case 'shame_campaign':
        await this.executeShameCampaign(metrics);
        break;
      
      case 'explosion_campaign':
        await this.executeExplosionCampaign(metrics);
        break;
    }
  }

  /**
   * Create anticipation for upcoming milestone
   */
  async triggerAnticipationCampaign(
    milestone: MilestoneDefinition,
    progress: number
  ): Promise<void> {
    const remaining = Math.ceil(milestone.threshold * (1 - progress));
    
    const anticipationContent = {
      'first_100': `🚀 Only ${remaining} badges until we hit 100! Who will claim their place in history?`,
      'thousand_spirits': `📈 ${remaining} badges away from 1,000 Indigenous Verified Businesses! The movement is unstoppable!`,
      'market_standard': `🎯 Just ${remaining} more businesses until verification becomes the market standard!`
    };

    const content = anticipationContent[milestone.id as keyof typeof anticipationContent];
    
    if (content) {
      await this.campaignService.launchBadgeAdoptionCampaign(
        {
          type: milestone.type,
          threshold: milestone.threshold,
          current: milestone.threshold * progress,
          reached: false,
          campaignActions: ['anticipation_blast', 'countdown_pressure']
        },
        []
      );
    }
  }

  /**
   * Calculate viral coefficient
   */
  private async calculateViralCoefficient(): Promise<number> {
    const badges = await prisma.badge.findMany({
      select: {
        clickCount: true,
        conversionCount: true
      }
    });

    if (badges.length === 0) return 0;

    const totalClicks = badges.reduce((sum, b) => sum + b.clickCount, 0);
    const totalConversions = badges.reduce((sum, b) => sum + b.conversionCount, 0);

    return totalClicks > 0 ? totalConversions / totalClicks : 0;
  }

  /**
   * Calculate industry penetration
   */
  private async calculateIndustryPenetration(): Promise<Record<string, number>> {
    const industries = ['construction', 'consulting', 'technology', 'manufacturing', 'retail'];
    const penetration: Record<string, number> = {};

    for (const industry of industries) {
      const [verified, total] = await Promise.all([
        prisma.badge.count({
          where: {
            business: {
              industries: {
                has: industry
              }
            }
          }
        }),
        prisma.business.count({
          where: {
            industries: {
              has: industry
            }
          }
        })
      ]);

      penetration[industry] = total > 0 ? (verified / total) * 100 : 0;
    }

    return penetration;
  }

  /**
   * Calculate government adoption
   */
  private async calculateGovernmentAdoption(): Promise<number> {
    // Count unique government departments that have referenced badges in RFQs
    const govRFQs = await prisma.rFQ.findMany({
      where: {
        description: {
          contains: 'verification badge',
          mode: 'insensitive'
        },
        postedBy: {
          role: 'GOVERNMENT_OFFICER'
        }
      },
      select: {
        department: true
      },
      distinct: ['department']
    });

    return govRFQs.length;
  }

  /**
   * Calculate social amplification
   */
  private async calculateSocialAmplification(): Promise<any> {
    // This would integrate with social media APIs
    // For now, return simulated data
    return {
      amplification: 3.5,
      reach: 1500000,
      engagement: 45000,
      shares: 12000
    };
  }

  /**
   * Calculate media velocity
   */
  private async calculateMediaVelocity(): Promise<number> {
    // This would integrate with media monitoring
    // For now, return simulated data
    return 7.5; // Articles per day
  }

  /**
   * Campaign execution methods
   */
  private async executeFounderCelebration(): Promise<void> {
    console.log('Executing founder celebration campaign');
    // Create special founder badges
    // Send celebration emails
    // Create founder wall of fame
  }

  private async executeMediaBlast(
    milestone: MilestoneDefinition,
    metrics: ViralMetrics
  ): Promise<void> {
    console.log('Executing media blast for milestone:', milestone.name);
    // Generate press release
    // Contact media outlets
    // Schedule interviews
  }

  private async executePeerPressureWave(
    wave: number,
    metrics: ViralMetrics
  ): Promise<void> {
    console.log(`Executing peer pressure wave ${wave}`);
    
    // Get unverified businesses
    const unverified = await prisma.business.findMany({
      where: {
        badge: null,
        status: 'ACTIVE'
      },
      take: 100,
      orderBy: {
        employeeCount: 'desc'
      }
    });

    // Apply pressure to each
    for (const business of unverified) {
      const profile = {
        id: business.id,
        name: business.name,
        industry: business.industries[0] || 'general',
        size: business.employeeCount || 0,
        hasVerificationBadge: false,
        socialAccounts: [],
        pressureScore: 0
      };

      const pressurePoints = await this.pressureEngine.generatePressureCampaign(profile);
      await this.pressureEngine.deployPressureTactics(profile, pressurePoints);
    }
  }

  private async executeViralMomentum(metrics: ViralMetrics): Promise<void> {
    console.log('Executing viral momentum campaign');
    // Create momentum graphics
    // Deploy countdown campaigns
    // Activate referral rewards
  }

  private async executeInfluencerActivation(
    milestone: MilestoneDefinition
  ): Promise<void> {
    console.log('Activating influencer network');
    // Contact indigenous influencers
    // Create influencer packages
    // Track influencer impact
  }

  private async executeIndustryTakeover(metrics: ViralMetrics): Promise<void> {
    // Find industry with highest penetration
    const topIndustry = Object.entries(metrics.industryPenetration)
      .sort(([, a], [, b]) => b - a)[0];

    console.log(`Executing industry takeover for ${topIndustry[0]}`);
    // Create industry-specific campaigns
    // Target industry associations
    // Create competitive pressure
  }

  private async executeCompetitorFOMO(metrics: ViralMetrics): Promise<void> {
    console.log('Executing competitor FOMO campaign');
    // Create leaderboards
    // Send competitor alerts
    // Generate comparison reports
  }

  private async executeMandateCampaign(): Promise<void> {
    console.log('Executing government mandate campaign');
    // Create compliance warnings
    // Send to procurement officers
    // Update RFQ requirements
  }

  private async executeShameCampaign(metrics: ViralMetrics): Promise<void> {
    console.log('Executing strategic shame campaign');
    // Identify major holdouts
    // Create exposure content
    // Deploy carefully
  }

  private async executeExplosionCampaign(metrics: ViralMetrics): Promise<void> {
    console.log('Executing viral explosion campaign');
    // Maximum pressure on all fronts
    // Coordinate all channels
    // Create urgency everywhere
  }

  /**
   * Helper methods
   */
  private async checkMilestone(
    milestone: MilestoneDefinition,
    metrics: ViralMetrics
  ): Promise<boolean> {
    switch (milestone.type) {
      case 'badge_count':
        return metrics.totalBadges >= milestone.threshold;
      
      case 'viral_coefficient':
        return metrics.viralCoefficient >= milestone.threshold;
      
      case 'government_adoption':
        return metrics.governmentAdoption >= milestone.threshold;
      
      case 'industry_penetration':
        return Object.values(metrics.industryPenetration)
          .some(p => p >= milestone.threshold);
      
      default:
        return false;
    }
  }

  private async getMilestoneProgress(
    milestone: MilestoneDefinition,
    metrics: ViralMetrics
  ): Promise<number> {
    switch (milestone.type) {
      case 'badge_count':
        return metrics.totalBadges / milestone.threshold;
      
      case 'viral_coefficient':
        return metrics.viralCoefficient / milestone.threshold;
      
      case 'government_adoption':
        return metrics.governmentAdoption / milestone.threshold;
      
      case 'industry_penetration':
        const maxPenetration = Math.max(...Object.values(metrics.industryPenetration));
        return maxPenetration / milestone.threshold;
      
      default:
        return 0;
    }
  }

  private async recordMilestoneAchievement(
    milestone: MilestoneDefinition,
    metrics: ViralMetrics
  ): Promise<void> {
    // Record in database
    console.log(`Recording milestone achievement: ${milestone.name}`, metrics);
  }

  private async sendMediaAlerts(
    milestone: MilestoneDefinition,
    metrics: ViralMetrics
  ): Promise<void> {
    console.log(`Sending media alerts for milestone: ${milestone.name}`);
  }

  private async distributeRewards(milestone: MilestoneDefinition): Promise<void> {
    console.log(`Distributing rewards for milestone: ${milestone.name}`);
  }

  private async createViralMomentContent(
    milestone: MilestoneDefinition,
    metrics: ViralMetrics
  ): Promise<void> {
    console.log(`Creating viral moment content for: ${milestone.name}`);
  }
}