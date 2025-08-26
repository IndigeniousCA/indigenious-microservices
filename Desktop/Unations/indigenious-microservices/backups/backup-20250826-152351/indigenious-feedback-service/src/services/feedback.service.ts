import { PrismaClient, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, differenceInHours } from 'date-fns';
import axios from 'axios';
import Redis from 'ioredis';
import * as Sentiment from 'sentiment';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const sentiment = new Sentiment();

export class FeedbackService {
  // Indigenous community weights for ratings
  private static readonly ELDER_WEIGHT = 2.0;
  private static readonly INDIGENOUS_WEIGHT = 1.5;
  private static readonly COMMUNITY_IMPACT_WEIGHT = 1.3;
  
  // Create review with Indigenous features
  static async createReview(data: any) {
    // Verify Indigenous status if claimed
    let indigenousVerified = false;
    if (data.indigenousReviewer) {
      indigenousVerified = await this.verifyIndigenousStatus(data.customerId);
    }
    
    // Analyze sentiment
    const sentimentAnalysis = sentiment.analyze(data.content);
    
    // Check for story elements
    const hasStory = await this.detectStoryElements(data.content);
    
    const review = await prisma.review.create({
      data: {
        reviewId: uuidv4(),
        productId: data.productId,
        serviceId: data.serviceId,
        vendorId: data.vendorId,
        orderId: data.orderId,
        customerId: data.customerId,
        customerName: data.customerName,
        isVerifiedPurchase: data.isVerifiedPurchase || false,
        indigenousReviewer: indigenousVerified,
        statusCardVerified: indigenousVerified,
        bandMembership: data.bandMembership,
        treatyTerritory: data.treatyTerritory,
        elderReview: data.elderReview || false,
        elderWisdom: data.elderWisdom,
        generationalImpact: data.generationalImpact,
        overallRating: data.overallRating,
        qualityRating: data.qualityRating,
        valueRating: data.valueRating,
        authenticityRating: data.authenticityRating,
        culturalAuthenticity: data.culturalAuthenticity,
        respectfulPractices: data.respectfulPractices,
        communityBenefit: data.communityBenefit,
        traditionHonored: data.traditionHonored,
        title: data.title,
        content: data.content,
        pros: data.pros || [],
        cons: data.cons || [],
        storyShared: hasStory,
        photos: data.photos || [],
        videos: data.videos || [],
        audioReview: data.audioReview,
        language: data.language || 'en',
        indigenousLanguage: data.indigenousLanguage,
        translatedContent: data.translatedContent,
        verified: indigenousVerified || data.isVerifiedPurchase,
        verificationMethod: indigenousVerified ? 'STATUS_CARD' : 
                          data.isVerifiedPurchase ? 'PURCHASE' : null,
        status: data.elderReview ? 'PENDING' : 'APPROVED' // Elder reviews auto-approved
      }
    });
    
    // Create story if shared
    if (hasStory && data.story) {
      await this.createStory(review.id, data.story);
    }
    
    // Create community impact assessment
    if (data.communityImpact) {
      await this.createCommunityImpact(review.id, data.communityImpact);
    }
    
    // Award badges
    await this.checkAndAwardBadges(data.customerId, review);
    
    // Update product/vendor ratings
    await this.updateRatings(review);
    
    // Notify vendor
    if (review.vendorId) {
      await this.notifyVendor(review);
    }
    
    // Cache for quick access
    await redis.set(
      `review:${review.reviewId}`,
      JSON.stringify(review),
      'EX',
      86400 * 30 // 30 days
    );
    
    return review;
  }
  
  // Create story with traditional elements
  static async createStory(reviewId: string, storyData: any) {
    const story = await prisma.story.create({
      data: {
        storyId: uuidv4(),
        reviewId,
        title: storyData.title,
        content: storyData.content,
        teachingShared: storyData.teachingShared || false,
        teaching: storyData.teaching,
        medicineWheelDirection: storyData.medicineWheelDirection,
        season: storyData.season,
        element: storyData.element,
        culturalSignificance: storyData.culturalSignificance,
        ceremonyRelated: storyData.ceremonyRelated || false,
        sacredStory: storyData.sacredStory || false,
        publicSharing: storyData.publicSharing ?? true,
        elderApproved: storyData.elderApproved || false,
        elderApprovedBy: storyData.elderApprovedBy,
        audioStory: storyData.audioStory,
        videoStory: storyData.videoStory
      }
    });
    
    // If sacred story, request Elder approval
    if (story.sacredStory && !story.elderApproved) {
      await this.requestElderApproval(story);
    }
    
    return story;
  }
  
  // Create community impact assessment
  static async createCommunityImpact(reviewId: string, impactData: any) {
    // Calculate seven generations score
    const sevenGenScore = await this.calculateSevenGenerationsScore(impactData);
    
    const impact = await prisma.communityImpact.create({
      data: {
        impactId: uuidv4(),
        reviewId,
        localJobsSupported: impactData.localJobsSupported,
        indigenousJobsCreated: impactData.indigenousJobsCreated,
        communityRevenue: impactData.communityRevenue,
        youthEngagement: impactData.youthEngagement || false,
        elderInvolvement: impactData.elderInvolvement || false,
        culturalPreservation: impactData.culturalPreservation || false,
        languageRevitalization: impactData.languageRevitalization || false,
        sustainablePractices: impactData.sustainablePractices || false,
        landStewardship: impactData.landStewardship || false,
        traditionalHarvesting: impactData.traditionalHarvesting || false,
        ceremonySupport: impactData.ceremonySupport || false,
        traditionalKnowledge: impactData.traditionalKnowledge || false,
        artisanSupport: impactData.artisanSupport || false,
        sevenGenScore,
        futureImpact: impactData.futureImpact,
        communityBenefitRate: impactData.communityBenefitRate
      }
    });
    
    return impact;
  }
  
  // Create talking circle for community feedback
  static async createTalkingCircle(data: any) {
    const circle = await prisma.talkingCircle.create({
      data: {
        circleId: uuidv4(),
        topic: data.topic,
        description: data.description,
        circleType: data.circleType,
        productId: data.productId,
        vendorId: data.vendorId,
        categoryFocus: data.categoryFocus,
        facilitatorId: data.facilitatorId,
        facilitatorName: data.facilitatorName,
        isElder: data.isElder || false,
        maxParticipants: data.maxParticipants || 20,
        smudgingCeremony: data.smudgingCeremony ?? true,
        openingPrayer: data.openingPrayer ?? true,
        eagleFeatherUsed: data.eagleFeatherUsed || false,
        scheduledDate: data.scheduledDate,
        duration: data.duration || 90, // 90 minutes default
        isVirtual: data.isVirtual || false,
        location: data.location,
        virtualLink: data.virtualLink,
        recordingConsent: data.recordingConsent || false,
        status: 'SCHEDULED'
      }
    });
    
    // Invite participants
    if (data.invitees && data.invitees.length > 0) {
      await this.inviteToCircle(circle.id, data.invitees);
    }
    
    // Notify community
    await this.notifyCommunityAboutCircle(circle);
    
    // Schedule reminders
    await this.scheduleCircleReminders(circle);
    
    return circle;
  }
  
  // Join talking circle
  static async joinTalkingCircle(circleId: string, participantData: any) {
    const circle = await prisma.talkingCircle.findUnique({
      where: { id: circleId },
      include: { participants: true }
    });
    
    if (!circle) throw new Error('Circle not found');
    
    if (circle.participants.length >= circle.maxParticipants) {
      throw new Error('Circle is full');
    }
    
    const participant = await prisma.circleParticipant.create({
      data: {
        participantId: uuidv4(),
        circleId,
        userId: participantData.userId,
        userName: participantData.userName,
        role: participantData.role || 'LISTENER',
        indigenousParticipant: participantData.indigenousParticipant || false,
        bandMembership: participantData.bandMembership,
        attended: false
      }
    });
    
    return participant;
  }
  
  // Complete talking circle
  static async completeTalkingCircle(circleId: string, data: any) {
    const circle = await prisma.talkingCircle.update({
      where: { id: circleId },
      data: {
        consensusReached: data.consensusReached,
        recommendations: data.recommendations || [],
        actionItems: data.actionItems || [],
        audioRecording: data.audioRecording,
        transcript: data.transcript,
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });
    
    // Generate report
    const report = await this.generateCircleReport(circle);
    
    // Share with community if appropriate
    if (data.shareWithCommunity) {
      await this.shareCircleOutcomes(circle, report);
    }
    
    // Create follow-up actions
    if (circle.actionItems.length > 0) {
      await this.createFollowUpActions(circle);
    }
    
    return circle;
  }
  
  // Create survey with Indigenous focus
  static async createSurvey(data: any) {
    // Add medicine wheel questions if aligned
    let wheelQuestions = null;
    if (data.medicineWheelAligned) {
      wheelQuestions = this.generateMedicineWheelQuestions(data.surveyType);
    }
    
    const survey = await prisma.survey.create({
      data: {
        surveyId: uuidv4(),
        title: data.title,
        description: data.description,
        purpose: data.purpose,
        surveyType: data.surveyType,
        targetAudience: data.targetAudience || [],
        indigenousFocused: data.indigenousFocused || false,
        questions: data.questions,
        culturalQuestions: data.culturalQuestions,
        medicineWheelAligned: data.medicineWheelAligned || false,
        wheelQuestions,
        anonymous: data.anonymous || false,
        requiresAuth: data.requiresAuth ?? true,
        multipleSubmissions: data.multipleSubmissions || false,
        hasIncentive: data.hasIncentive || false,
        incentiveType: data.incentiveType,
        incentiveValue: data.incentiveValue,
        startDate: data.startDate,
        endDate: data.endDate,
        targetResponses: data.targetResponses,
        status: 'ACTIVE',
        createdBy: data.createdBy
      }
    });
    
    // Notify target audience
    await this.notifyTargetAudience(survey);
    
    return survey;
  }
  
  // Submit survey response
  static async submitSurveyResponse(surveyId: string, data: any) {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId }
    });
    
    if (!survey) throw new Error('Survey not found');
    if (survey.status !== 'ACTIVE') throw new Error('Survey not active');
    
    // Check for duplicate submission
    if (!survey.multipleSubmissions) {
      const existing = await prisma.surveyResponse.findFirst({
        where: {
          surveyId,
          respondentId: data.respondentId
        }
      });
      
      if (existing) throw new Error('Already submitted response');
    }
    
    const response = await prisma.surveyResponse.create({
      data: {
        responseId: uuidv4(),
        surveyId,
        respondentId: data.respondentId,
        indigenousRespondent: data.indigenousRespondent || false,
        ageGroup: data.ageGroup,
        gender: data.gender,
        community: data.community,
        responses: data.responses,
        culturalResponses: data.culturalResponses,
        additionalComments: data.additionalComments,
        storyContribution: data.storyContribution,
        dataUseConsent: data.dataUseConsent ?? true,
        anonymousSubmission: data.anonymousSubmission || false,
        completed: true,
        completionTime: data.completionTime,
        submittedAt: new Date()
      }
    });
    
    // Process incentive if applicable
    if (survey.hasIncentive) {
      await this.processIncentive(response, survey);
    }
    
    // Check if target responses reached
    const responseCount = await prisma.surveyResponse.count({
      where: { surveyId }
    });
    
    if (survey.targetResponses && responseCount >= survey.targetResponses) {
      await this.closeSurvey(surveyId);
    }
    
    return response;
  }
  
  // Vendor response to review
  static async createVendorResponse(reviewId: string, data: any) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });
    
    if (!review) throw new Error('Review not found');
    
    const response = await prisma.vendorResponse.create({
      data: {
        responseId: uuidv4(),
        reviewId,
        content: data.content,
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        respondedBy: data.respondedBy,
        indigenousVendor: data.indigenousVendor || false,
        elderResponse: data.elderResponse || false,
        culturalAcknowledgment: data.culturalAcknowledgment,
        commitmentMade: data.commitmentMade,
        public: data.public ?? true
      }
    });
    
    // Notify reviewer
    await this.notifyReviewerOfResponse(review, response);
    
    // Update vendor response metrics
    await this.updateVendorMetrics(data.vendorId);
    
    return response;
  }
  
  // Generate feedback analytics
  static async generateAnalytics(startDate: Date, endDate: Date) {
    // Get all reviews in period
    const reviews = await prisma.review.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        communityImpact: true
      }
    });
    
    // Calculate metrics
    const totalReviews = reviews.length;
    const indigenousReviews = reviews.filter(r => r.indigenousReviewer).length;
    const elderReviews = reviews.filter(r => r.elderReview).length;
    
    // Calculate average ratings
    const avgRating = reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews || 0;
    const indigenousAvgRating = indigenousReviews > 0 ?
      reviews.filter(r => r.indigenousReviewer)
        .reduce((sum, r) => sum + r.overallRating, 0) / indigenousReviews : null;
    
    // Cultural metrics
    const culturalScores = reviews
      .filter(r => r.culturalAuthenticity !== null)
      .map(r => r.culturalAuthenticity!);
    const avgCulturalScore = culturalScores.length > 0 ?
      culturalScores.reduce((a, b) => a + b, 0) / culturalScores.length : null;
    
    // Community impact
    const impactScores = reviews
      .filter(r => r.communityImpact?.sevenGenScore)
      .map(r => r.communityImpact!.sevenGenScore!);
    const sevenGenAvgScore = impactScores.length > 0 ?
      impactScores.reduce((a, b) => a + b, 0) / impactScores.length : null;
    
    // Sentiment analysis
    const sentiments = reviews.map(r => sentiment.analyze(r.content));
    const positive = sentiments.filter(s => s.score > 0).length;
    const negative = sentiments.filter(s => s.score < 0).length;
    const neutral = sentiments.filter(s => s.score === 0).length;
    
    // Get talking circles
    const circles = await prisma.talkingCircle.count({
      where: {
        scheduledDate: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      }
    });
    
    // Get surveys
    const surveyResponses = await prisma.surveyResponse.count({
      where: {
        submittedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    const analytics = await prisma.feedbackAnalytics.create({
      data: {
        analyticsId: uuidv4(),
        periodStart: startDate,
        periodEnd: endDate,
        totalReviews,
        totalRatings: reviews.reduce((sum, r) => sum + r.overallRating, 0),
        avgRating,
        indigenousReviews,
        elderReviews,
        indigenousAvgRating,
        avgCulturalScore,
        avgAuthenticityScore: avgCulturalScore, // Placeholder
        avgCommunityBenefit: avgCulturalScore, // Placeholder
        storiesShared: reviews.filter(r => r.storyShared).length,
        teachingsShared: 0, // Placeholder
        circlesHeld: circles,
        circleParticipants: 0, // Placeholder
        consensusRate: 85, // Placeholder
        surveysCompleted: surveyResponses,
        surveyResponseRate: 65, // Placeholder
        positiveSentiment: (positive / totalReviews) * 100,
        neutralSentiment: (neutral / totalReviews) * 100,
        negativeSentiment: (negative / totalReviews) * 100,
        communityImpactScore: 7.5, // Placeholder
        sevenGenAvgScore,
        vendorResponseRate: 75, // Placeholder
        avgResponseTime: 24, // Placeholder (hours)
        keyInsights: this.generateKeyInsights(reviews),
        recommendations: this.generateRecommendations(reviews)
      }
    });
    
    return analytics;
  }
  
  // Award badges for achievements
  static async awardBadge(userId: string, badgeType: string) {
    const badge = await prisma.badgeEarned.create({
      data: {
        badgeId: uuidv4(),
        userId,
        badgeType: badgeType as any,
        badgeName: this.getBadgeName(badgeType),
        indigenousBadge: this.isIndigenousBadge(badgeType),
        culturalBadge: this.isCulturalBadge(badgeType),
        achievementCriteria: this.getBadgeCriteria(badgeType),
        elderValidated: badgeType === 'ELDER_REVIEWER'
      }
    });
    
    // Notify user
    await this.notifyBadgeEarned(userId, badge);
    
    return badge;
  }
  
  // Helper functions
  private static async verifyIndigenousStatus(customerId: string): Promise<boolean> {
    // Verify with status card database
    // Placeholder implementation
    return Math.random() > 0.5;
  }
  
  private static async detectStoryElements(content: string): Promise<boolean> {
    // Look for story indicators
    const storyKeywords = ['once', 'story', 'grandmother', 'grandfather', 
                          'elder', 'teaching', 'lesson', 'journey'];
    return storyKeywords.some(keyword => 
      content.toLowerCase().includes(keyword));
  }
  
  private static async calculateSevenGenerationsScore(impactData: any): Promise<number> {
    let score = 5; // Base score
    
    if (impactData.youthEngagement) score += 1;
    if (impactData.elderInvolvement) score += 1;
    if (impactData.culturalPreservation) score += 1;
    if (impactData.sustainablePractices) score += 1;
    if (impactData.traditionalKnowledge) score += 1;
    
    return Math.min(score, 10);
  }
  
  private static async checkAndAwardBadges(customerId: string, review: any) {
    // Check for first review
    const reviewCount = await prisma.review.count({
      where: { customerId }
    });
    
    if (reviewCount === 1) {
      await this.awardBadge(customerId, 'TRUSTED_REVIEWER');
    }
    
    if (review.elderReview) {
      await this.awardBadge(customerId, 'ELDER_REVIEWER');
    }
    
    if (review.storyShared) {
      await this.awardBadge(customerId, 'STORY_KEEPER');
    }
    
    if (review.communityImpact?.sevenGenScore && review.communityImpact.sevenGenScore >= 8) {
      await this.awardBadge(customerId, 'SEVEN_GEN_THINKER');
    }
  }
  
  private static async updateRatings(review: any) {
    // Update product/vendor ratings with weighted average
    let weight = 1.0;
    if (review.elderReview) weight = this.ELDER_WEIGHT;
    else if (review.indigenousReviewer) weight = this.INDIGENOUS_WEIGHT;
    
    // Update logic would go here
    console.log('Updating ratings with weight:', weight);
  }
  
  private static async notifyVendor(review: any) {
    console.log('Notifying vendor of new review:', review.vendorId);
  }
  
  private static async requestElderApproval(story: any) {
    console.log('Requesting Elder approval for story:', story.storyId);
  }
  
  private static async inviteToCircle(circleId: string, invitees: string[]) {
    console.log('Inviting participants to circle:', circleId);
  }
  
  private static async notifyCommunityAboutCircle(circle: any) {
    console.log('Notifying community about talking circle:', circle.topic);
  }
  
  private static async scheduleCircleReminders(circle: any) {
    console.log('Scheduling reminders for circle:', circle.circleId);
  }
  
  private static async generateCircleReport(circle: any): Promise<any> {
    return {
      topic: circle.topic,
      consensus: circle.consensusReached,
      recommendations: circle.recommendations,
      actionItems: circle.actionItems
    };
  }
  
  private static async shareCircleOutcomes(circle: any, report: any) {
    console.log('Sharing circle outcomes with community');
  }
  
  private static async createFollowUpActions(circle: any) {
    console.log('Creating follow-up actions from circle');
  }
  
  private static generateMedicineWheelQuestions(surveyType: string): any {
    return {
      east: 'How does this support new beginnings and youth?',
      south: 'How does this nurture growth and community?',
      west: 'How does this honor our teachings and traditions?',
      north: 'How does this serve our Elders and wisdom keepers?'
    };
  }
  
  private static async notifyTargetAudience(survey: any) {
    console.log('Notifying target audience about survey:', survey.title);
  }
  
  private static async processIncentive(response: any, survey: any) {
    console.log('Processing incentive for survey response');
  }
  
  private static async closeSurvey(surveyId: string) {
    await prisma.survey.update({
      where: { id: surveyId },
      data: { status: 'CLOSED' }
    });
  }
  
  private static async notifyReviewerOfResponse(review: any, response: any) {
    console.log('Notifying reviewer of vendor response');
  }
  
  private static async updateVendorMetrics(vendorId: string) {
    console.log('Updating vendor response metrics');
  }
  
  private static generateKeyInsights(reviews: any[]): any {
    return {
      topThemes: ['Quality', 'Authenticity', 'Community Impact'],
      concerns: ['Shipping delays', 'Price'],
      opportunities: ['More Elder involvement', 'Youth programs']
    };
  }
  
  private static generateRecommendations(reviews: any[]): string[] {
    return [
      'Increase Indigenous vendor participation',
      'Enhance cultural authenticity verification',
      'Expand Elder review program'
    ];
  }
  
  private static getBadgeName(badgeType: string): string {
    const names: Record<string, string> = {
      TRUSTED_REVIEWER: 'Trusted Community Voice',
      ELDER_REVIEWER: 'Elder Wisdom Keeper',
      STORY_KEEPER: 'Story Keeper',
      SEVEN_GEN_THINKER: 'Seven Generations Thinker'
    };
    return names[badgeType] || badgeType;
  }
  
  private static isIndigenousBadge(badgeType: string): boolean {
    return ['ELDER_REVIEWER', 'STORY_KEEPER', 'SEVEN_GEN_THINKER'].includes(badgeType);
  }
  
  private static isCulturalBadge(badgeType: string): boolean {
    return ['CULTURAL_EXPERT', 'STORY_KEEPER', 'WISDOM_SHARER'].includes(badgeType);
  }
  
  private static getBadgeCriteria(badgeType: string): string {
    const criteria: Record<string, string> = {
      TRUSTED_REVIEWER: 'Posted first review',
      ELDER_REVIEWER: 'Recognized Elder sharing wisdom',
      STORY_KEEPER: 'Shared traditional story',
      SEVEN_GEN_THINKER: 'Demonstrated seven generations thinking'
    };
    return criteria[badgeType] || 'Achievement unlocked';
  }
  
  private static async notifyBadgeEarned(userId: string, badge: any) {
    console.log('Notifying user of badge earned:', userId, badge.badgeName);
  }
}