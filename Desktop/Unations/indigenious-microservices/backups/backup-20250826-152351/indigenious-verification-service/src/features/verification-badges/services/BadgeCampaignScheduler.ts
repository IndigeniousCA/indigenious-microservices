import { ViralMilestoneService } from './ViralMilestoneService';
import { BadgeViralCampaignService } from './BadgeViralCampaignService';
import { SocialPressureEngine } from './SocialPressureEngine';
import { prisma } from '@/lib/prisma';
import cron from 'node-cron';

export class BadgeCampaignScheduler {
  private milestoneService: ViralMilestoneService;
  private campaignService: BadgeViralCampaignService;
  private pressureEngine: SocialPressureEngine;

  constructor() {
    this.milestoneService = new ViralMilestoneService();
    this.campaignService = new BadgeViralCampaignService();
    this.pressureEngine = new SocialPressureEngine();
  }

  /**
   * Initialize all scheduled campaigns
   */
  initializeSchedules(): void {
    // Every 30 minutes - Check viral milestones
    cron.schedule('*/30 * * * *', async () => {
      console.log('Checking viral milestones...');
      await this.milestoneService.monitorMilestones();
    });

    // Every hour - Apply pressure to top unverified businesses
    cron.schedule('0 * * * *', async () => {
      console.log('Applying hourly pressure campaign...');
      await this.runHourlyPressureCampaign();
    });

    // Every 6 hours - Generate viral content
    cron.schedule('0 */6 * * *', async () => {
      console.log('Generating viral content...');
      await this.generateViralContent();
    });

    // Daily at 9 AM - Morning pressure wave
    cron.schedule('0 9 * * *', async () => {
      console.log('Launching morning pressure wave...');
      await this.runMorningPressureWave();
    });

    // Daily at 2 PM - Success story amplification
    cron.schedule('0 14 * * *', async () => {
      console.log('Amplifying success stories...');
      await this.amplifyDailySuccessStories();
    });

    // Daily at 5 PM - FOMO campaign
    cron.schedule('0 17 * * *', async () => {
      console.log('Running end-of-day FOMO campaign...');
      await this.runFOMOCampaign();
    });

    // Weekly on Monday at 10 AM - Industry leaderboard
    cron.schedule('0 10 * * 1', async () => {
      console.log('Publishing weekly industry leaderboards...');
      await this.publishWeeklyLeaderboards();
    });

    // Weekly on Wednesday at 11 AM - Shame campaign (carefully)
    cron.schedule('0 11 * * 3', async () => {
      console.log('Evaluating targets for shame campaign...');
      await this.evaluateShameCampaignTargets();
    });

    // Weekly on Friday at 3 PM - Viral momentum boost
    cron.schedule('0 15 * * 5', async () => {
      console.log('Boosting viral momentum for weekend...');
      await this.boostWeekendMomentum();
    });

    // First of month at 9 AM - Monthly milestone celebration
    cron.schedule('0 9 1 * *', async () => {
      console.log('Running monthly milestone celebration...');
      await this.celebrateMonthlyMilestones();
    });
  }

  /**
   * Hourly pressure campaign
   */
  private async runHourlyPressureCampaign(): Promise<void> {
    // Get top 5 unverified businesses by influence
    const targets = await prisma.business.findMany({
      where: {
        badge: null,
        status: 'ACTIVE',
        employeeCount: {
          gte: 20 // Focus on medium+ businesses
        }
      },
      orderBy: [
        { employeeCount: 'desc' },
        { contracts: { _count: 'desc' } }
      ],
      take: 5,
      include: {
        contracts: true
      }
    });

    for (const business of targets) {
      const profile = {
        id: business.id,
        name: business.name,
        industry: business.industries[0] || 'general',
        size: business.employeeCount || 0,
        hasVerificationBadge: false,
        socialAccounts: [],
        pressureScore: 0
      };

      const pressureScore = await this.pressureEngine.calculatePressureScore(profile);
      
      // Only apply pressure if score is high enough
      if (pressureScore > 50) {
        const pressurePoints = await this.pressureEngine.generatePressureCampaign(profile);
        await this.pressureEngine.deployPressureTactics(profile, pressurePoints.slice(0, 1)); // One tactic per hour
      }
    }
  }

  /**
   * Generate viral content
   */
  private async generateViralContent(): Promise<void> {
    const metrics = await this.milestoneService.calculateViralMetrics();
    
    // Generate FOMO content
    const fomoContent = await this.campaignService.generateFOMOContent();
    
    // Generate spirit animal teasers
    const spiritTeasers = await this.campaignService.generateSpiritAnimalTeasers();
    
    // Schedule posts across accounts
    for (const content of [...fomoContent, ...spiritTeasers.slice(0, 2)]) {
      // Queue content for posting
      console.log('Queueing viral content:', content);
    }
  }

  /**
   * Morning pressure wave
   */
  private async runMorningPressureWave(): Promise<void> {
    // Get businesses that visited site but didn't convert
    const abandonedVisitors = await this.getAbandonedVisitors();
    
    for (const visitor of abandonedVisitors) {
      // Send targeted morning reminder
      console.log(`Morning reminder for ${visitor.businessName}`);
    }

    // Create urgency content
    const urgencyPost = {
      text: `☀️ Good morning! 

${await this.getRandomUrgencyMessage()}

Don't let another day pass without verification.
indigenious.ca/verify`,
      scheduledFor: new Date()
    };

    console.log('Morning urgency post:', urgencyPost);
  }

  /**
   * Amplify daily success stories
   */
  private async amplifyDailySuccessStories(): Promise<void> {
    // Get recent badge evolutions
    const evolutions = await prisma.badge.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        evolutionStage: {
          gte: 2
        }
      },
      include: {
        business: true
      },
      orderBy: {
        evolutionStage: 'desc'
      },
      take: 3
    });

    for (const evolution of evolutions) {
      await this.campaignService.amplifyViralMoment('badge_evolution', {
        business: evolution.business.name,
        fromStage: evolution.evolutionStage - 1,
        toStage: evolution.evolutionStage,
        spirit: evolution.animalSpirit
      });
    }
  }

  /**
   * End of day FOMO campaign
   */
  private async runFOMOCampaign(): Promise<void> {
    const todayStats = await this.getTodayStats();
    
    const fomoPost = {
      text: `📊 Today's Indigenous Verification Update:

✅ ${todayStats.newBadges} businesses verified
🚀 ${todayStats.totalActive} total verified businesses
🏆 Top spirit: ${todayStats.topSpirit} (${todayStats.topSpiritCount})

Your competitors moved forward today. Did you?

Last chance for same-week verification: indigenious.ca/apply`,
      media: 'daily-stats-graphic.png'
    };

    console.log('End of day FOMO:', fomoPost);
  }

  /**
   * Weekly leaderboards
   */
  private async publishWeeklyLeaderboards(): Promise<void> {
    const industries = ['construction', 'consulting', 'technology', 'manufacturing'];
    
    for (const industry of industries) {
      await this.campaignService.createBadgeRace(industry);
    }
  }

  /**
   * Evaluate shame campaign targets
   */
  private async evaluateShameCampaignTargets(): Promise<void> {
    // Get businesses with government contracts but no badge
    const shameCandidates = await prisma.business.findMany({
      where: {
        badge: null,
        contracts: {
          some: {
            value: {
              gte: 1000000 // $1M+ contracts
            }
          }
        }
      },
      include: {
        contracts: {
          where: {
            value: {
              gte: 1000000
            }
          }
        }
      },
      orderBy: {
        contracts: {
          _count: 'desc'
        }
      },
      take: 5
    });

    if (shameCandidates.length > 0) {
      console.log(`Identified ${shameCandidates.length} shame campaign targets`);
      // Deploy carefully
      const topTarget = shameCandidates[0];
      console.log(`Primary target: ${topTarget.name} with ${topTarget.contracts.length} major contracts`);
    }
  }

  /**
   * Boost weekend momentum
   */
  private async boostWeekendMomentum(): Promise<void> {
    // Create weekend challenge
    const challenge = {
      title: 'Weekend Verification Challenge',
      goal: 'Get 50 new badges by Monday',
      reward: 'Featured in national Indigenous business directory',
      hashtag: '#WeekendWarriors'
    };

    console.log('Launching weekend challenge:', challenge);
    
    // Generate teaser content
    const teasers = await this.campaignService.generateSpiritAnimalTeasers();
    
    // Schedule throughout weekend
    teasers.forEach((teaser, index) => {
      const scheduledTime = new Date(Date.now() + (index * 4 * 60 * 60 * 1000)); // Every 4 hours
      console.log(`Scheduling teaser for ${scheduledTime}:`, teaser);
    });
  }

  /**
   * Monthly milestone celebration
   */
  private async celebrateMonthlyMilestones(): Promise<void> {
    const monthlyStats = await this.getMonthlyStats();
    
    const celebration = {
      title: `🎉 ${monthlyStats.month} Milestones`,
      achievements: [
        `${monthlyStats.newBadges} new verified businesses`,
        `${monthlyStats.topIndustry} leads with ${monthlyStats.industryGrowth}% growth`,
        `${monthlyStats.legendaryBadges} businesses reached Legendary status`
      ],
      nextGoal: `${monthlyStats.nextMilestone} businesses by next month`,
      mediaPackage: 'monthly-celebration-package'
    };

    console.log('Monthly celebration:', celebration);
    
    // Trigger media outreach
    await this.triggerMediaOutreach(celebration);
  }

  /**
   * Helper methods
   */
  private async getAbandonedVisitors(): Promise<any[]> {
    // This would integrate with analytics
    return [
      {
        businessName: 'Example Corp',
        lastVisit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        pagesViewed: 5,
        quizStarted: true,
        quizCompleted: false
      }
    ];
  }

  private async getRandomUrgencyMessage(): Promise<string> {
    const messages = [
      '47 businesses verified over the weekend. The movement is accelerating.',
      'New government RFQ requiring verification badges just posted.',
      'Your top competitor just reached Golden Spirit status.',
      'Limited verification slots remaining this week.',
      'Major media story on unverified businesses coming Thursday.'
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  private async getTodayStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newBadges = await prisma.badge.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    const totalActive = await prisma.badge.count({
      where: {
        status: 'ACTIVE'
      }
    });

    const spiritCounts = await prisma.badge.groupBy({
      by: ['animalSpirit'],
      where: {
        createdAt: {
          gte: today
        }
      },
      _count: true,
      orderBy: {
        _count: {
          animalSpirit: 'desc'
        }
      }
    });

    const topSpirit = spiritCounts[0];

    return {
      newBadges,
      totalActive,
      topSpirit: topSpirit?.animalSpirit || 'beaver',
      topSpiritCount: topSpirit?._count || 0
    };
  }

  private async getMonthlyStats(): Promise<any> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newBadges = await prisma.badge.count({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      }
    });

    const legendaryBadges = await prisma.badge.count({
      where: {
        evolutionStage: 4,
        updatedAt: {
          gte: startOfMonth
        }
      }
    });

    return {
      month: new Date().toLocaleString('default', { month: 'long' }),
      newBadges,
      legendaryBadges,
      topIndustry: 'Construction',
      industryGrowth: 23,
      nextMilestone: Math.ceil((newBadges + 100) / 100) * 100
    };
  }

  private async triggerMediaOutreach(celebration: any): Promise<void> {
    console.log('Triggering media outreach:', celebration);
    // This would integrate with PR system
  }
}