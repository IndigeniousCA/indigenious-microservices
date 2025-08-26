/**
 * Community Engagement API Routes
 * Ethical, transparent community communication endpoints
 */

import { Router } from 'express';
import { asyncHandler } from '@/lib/async-handler';
import { auditLogger } from '@/lib/audit';
import { messaging } from '@/lib/messaging/nats-client';

// Services
import { EthicalCommunityEngagement } from '../services/EthicalCommunityEngagement';

const router = Router();
const communityEngagement = EthicalCommunityEngagement.getInstance();

/**
 * Create community engagement campaign
 */
router.post('/campaigns', asyncHandler(async (req, res) => {
  const { campaign } = req.body;
  
  // Validate ethical requirements
  if (!campaign.ethics?.transparency || !campaign.ethics?.consent || !campaign.ethics?.communityControl) {
    return res.status(400).json({
      error: 'Campaign must meet ethical requirements: transparency, consent, and community control'
    });
  }
  
  const campaignId = await communityEngagement.createCommunityEngagementCampaign(campaign);
  
  await auditLogger.logEvent({
    type: 'community_campaign_created',
    campaignId,
    community: campaign.community,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    campaignId,
    message: 'Community engagement campaign created successfully'
  });
}));

/**
 * Send transparent community message
 */
router.post('/messages', asyncHandler(async (req, res) => {
  const { community, message } = req.body;
  
  // Validate transparency requirements
  if (!message.transparency?.author || !message.transparency?.purpose) {
    return res.status(400).json({
      error: 'Message must include complete transparency information'
    });
  }
  
  const messageId = await communityEngagement.sendCommunityMessage(message, community);
  
  await auditLogger.logEvent({
    type: 'community_message_sent',
    messageId,
    community,
    messageType: message.type,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    messageId,
    message: 'Community message sent successfully'
  });
}));

/**
 * Collect community feedback
 */
router.post('/campaigns/:campaignId/feedback', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const { feedback } = req.body;
  
  // Validate consent for feedback collection
  if (!feedback.demographics?.anonymous && !feedback.consentGiven) {
    return res.status(400).json({
      error: 'Explicit consent required for non-anonymous feedback'
    });
  }
  
  await communityEngagement.collectCommunityFeedback(campaignId, feedback);
  
  await auditLogger.logEvent({
    type: 'community_feedback_collected',
    campaignId,
    community: feedback.community,
    anonymous: feedback.demographics?.anonymous || false,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    message: 'Feedback collected successfully'
  });
}));

/**
 * Analyze community feedback
 */
router.get('/campaigns/:campaignId/analysis', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  
  const analysis = await communityEngagement.analyzeCommunityFeedback(campaignId);
  
  await auditLogger.logEvent({
    type: 'feedback_analysis_requested',
    campaignId,
    totalResponses: analysis.summary.totalResponses,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.json({
    success: true,
    analysis,
    transparency: {
      methodology: 'AI-powered thematic analysis with cultural sensitivity',
      dataProtection: 'Anonymous aggregation with cultural protocol respect',
      communityControl: 'Analysis available to community members'
    }
  });
}));

/**
 * Get campaign status
 */
router.get('/campaigns/:campaignId', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  
  const status = await communityEngagement.getCampaignStatus(campaignId);
  
  if (!status.campaign) {
    return res.status(404).json({
      error: 'Campaign not found'
    });
  }
  
  res.json({
    success: true,
    status,
    transparency: {
      ethicalCompliance: status.campaign.ethics,
      communityControl: true,
      publicAccountability: true
    }
  });
}));

/**
 * Create culturally appropriate announcement
 */
router.post('/announcements', asyncHandler(async (req, res) => {
  const { community, content, culturalContext } = req.body;
  
  // Validate cultural requirements
  if (!culturalContext.traditionalProtocols) {
    return res.status(400).json({
      error: 'Cultural protocols must be followed for announcements'
    });
  }
  
  const announcement = await communityEngagement.createCulturallyAppropriateAnnouncement(
    community,
    content,
    culturalContext
  );
  
  await auditLogger.logEvent({
    type: 'cultural_announcement_created',
    community,
    culturalCompliance: true,
    elderApproved: culturalContext.elderReview,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    announcement,
    culturalCompliance: {
      protocolsFollowed: true,
      elderReview: culturalContext.elderReview,
      traditionalRespect: true
    }
  });
}));

/**
 * Schedule community consultation
 */
router.post('/consultations', asyncHandler(async (req, res) => {
  const { community, topic, details } = req.body;
  
  // Validate consultation requirements
  if (!details.culturalProtocols || details.culturalProtocols.length === 0) {
    return res.status(400).json({
      error: 'Cultural protocols must be specified for consultations'
    });
  }
  
  const consultationId = await communityEngagement.scheduleCommunityConsultation(
    community,
    topic,
    details
  );
  
  await auditLogger.logEvent({
    type: 'community_consultation_scheduled',
    consultationId,
    community,
    topic,
    duration: details.duration,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    consultationId,
    message: 'Community consultation scheduled successfully',
    ethicalCompliance: {
      culturalProtocols: details.culturalProtocols,
      accessibility: details.accessibility,
      multiLanguage: details.languages
    }
  });
}));

/**
 * Share success story (with consent)
 */
router.post('/success-stories', asyncHandler(async (req, res) => {
  const { community, story } = req.body;
  
  // Validate explicit consent
  if (!story.consentGiven) {
    return res.status(400).json({
      error: 'Explicit consent required to share success stories'
    });
  }
  
  // Validate consent documentation
  if (!story.consentDocumentation) {
    return res.status(400).json({
      error: 'Consent documentation required for transparency'
    });
  }
  
  const storyId = await communityEngagement.shareSuccessStory(community, story);
  
  await auditLogger.logEvent({
    type: 'success_story_shared',
    storyId,
    community,
    businessName: story.businessName,
    contractValue: story.contractValue,
    consentVerified: true,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    storyId,
    message: 'Success story shared with full consent and transparency',
    ethics: {
      consentGiven: true,
      transparencyMaintained: true,
      communityBenefitFocused: true
    }
  });
}));

/**
 * Monitor community sentiment (ethically)
 */
router.get('/communities/:community/sentiment', asyncHandler(async (req, res) => {
  const { community } = req.params;
  
  const sentiment = await communityEngagement.monitorSentiment(community);
  
  await auditLogger.logEvent({
    type: 'community_sentiment_monitored',
    community,
    consentBased: sentiment.transparency.consentBased,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.json({
    success: true,
    sentiment,
    ethics: {
      consentBased: true,
      noManipulation: true,
      transparentMethodology: true,
      communityControlled: true
    }
  });
}));

/**
 * Get transparent engagement metrics
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const { period } = req.query;
  
  const metrics = await communityEngagement.getMetrics(period as unknown);
  
  await auditLogger.logEvent({
    type: 'engagement_metrics_requested',
    period: period || 'monthly',
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.json({
    success: true,
    metrics,
    transparency: {
      methodology: 'Aggregated anonymous data with community consent',
      dataProtection: 'Privacy-preserving analytics',
      communityBenefit: 'Metrics used to improve community engagement',
      noCommercialExploitation: true
    }
  });
}));

/**
 * Handle news opportunities ethically
 */
router.post('/news-opportunities', asyncHandler(async (req, res) => {
  const { newsItem, community } = req.body;
  
  const response = await communityEngagement.handleNewsOpportunity(newsItem, community);
  
  await auditLogger.logEvent({
    type: 'news_opportunity_handled',
    community,
    action: response.action,
    factChecked: response.transparency.factChecked,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.json({
    success: true,
    response,
    ethics: {
      noManipulation: true,
      factBased: true,
      transparentMotives: true,
      communityBenefitFocused: true
    }
  });
}));

/**
 * Create educational content
 */
router.post('/educational-content', asyncHandler(async (req, res) => {
  const { topic, community, culturalContext } = req.body;
  
  // Validate cultural requirements
  if (culturalContext.traditionalKnowledge && !culturalContext.elderGuidance) {
    return res.status(400).json({
      error: 'Elder guidance required when traditional knowledge is involved'
    });
  }
  
  const content = await communityEngagement.createEducationalContent(
    topic,
    community,
    culturalContext
  );
  
  await auditLogger.logEvent({
    type: 'educational_content_created',
    topic,
    community,
    culturallyAppropriate: content.culturalAppropriateness > 0.8,
    traditionalKnowledge: culturalContext.traditionalKnowledge,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(201).json({
    success: true,
    content,
    culturalCompliance: {
      appropriatenessScore: content.culturalAppropriateness,
      elderGuidance: culturalContext.elderGuidance,
      traditionalKnowledgeRespect: culturalContext.traditionalKnowledge
    }
  });
}));

/**
 * Health check
 */
router.get('/health', asyncHandler(async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Ethical Community Engagement',
    ethics: {
      transparency: 'full',
      consent: 'required',
      manipulation: 'prohibited',
      communityControl: 'maintained'
    },
    timestamp: new Date().toISOString()
  });
}));

export default router;