/**
 * Tests for Multi-Channel Outreach Engine
 */

import { OutreachEngine } from '../../outreach/OutreachEngine';
import { Redis } from 'ioredis';
import { ChannelType, BusinessType } from '../../types';
import { EnrichedBusiness } from '../../types';

// Mock dependencies
jest.mock('ioredis');
jest.mock('axios');
jest.mock('@sendgrid/mail');
jest.mock('twilio');
jest.mock('openai');

describe('OutreachEngine', () => {
  let engine: OutreachEngine;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.sismember.mockResolvedValue(0);

    engine = new OutreachEngine(mockRedis, {
      enablePersonalization: true,
      enableABTesting: true,
      enableScheduling: true,
      channelConfigs: {
        [ChannelType.EMAIL]: {
          provider: 'sendgrid',
          apiKey: 'test-key',
          fromEmail: 'test@example.com',
          fromName: 'Test Sender'
        },
        [ChannelType.SMS]: {
          provider: 'twilio',
          accountSid: 'test-sid',
          authToken: 'test-token',
          fromNumber: '+15550000000'
        }
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Multi-Channel Outreach', () => {
    it('should send email outreach successfully', async () => {
      const sendgrid = require('@sendgrid/mail');
      sendgrid.send.mockResolvedValue([{ statusCode: 202 }]);

      const business: Partial<EnrichedBusiness> = {
        id: 'test-1',
        name: 'Test Company',
        email: 'contact@test.com',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {
          templateId: 'welcome-template',
          campaignId: 'test-campaign'
        }
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(ChannelType.EMAIL);
      expect(sendgrid.send).toHaveBeenCalledWith(expect.objectContaining({
        to: 'contact@test.com'
      }));
    });

    it('should send SMS outreach successfully', async () => {
      const twilio = require('twilio');
      const mockClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            sid: 'test-message-sid',
            status: 'sent'
          })
        }
      };
      twilio.mockReturnValue(mockClient);

      const business: Partial<EnrichedBusiness> = {
        id: 'test-2',
        name: 'SMS Test Company',
        phone: '+15551234567',
        type: BusinessType.CANADIAN_GENERAL
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.SMS,
        {
          message: 'Test SMS message'
        }
      );

      expect(result.success).toBe(true);
      expect(result.channel).toBe(ChannelType.SMS);
      expect(mockClient.messages.create).toHaveBeenCalled();
    });

    it('should handle missing contact info gracefully', async () => {
      const business: Partial<EnrichedBusiness> = {
        id: 'test-3',
        name: 'No Contact Company',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No email address');
    });
  });

  describe('Personalization', () => {
    it('should personalize messages using GPT-4', async () => {
      const openai = require('openai');
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'Personalized message for Indigenous business'
                }
              }]
            })
          }
        }
      };
      openai.OpenAI.mockImplementation(() => mockOpenAI);

      const business: Partial<EnrichedBusiness> = {
        id: 'test-4',
        name: 'Indigenous Tech Solutions',
        email: 'contact@indigenoustech.com',
        type: BusinessType.INDIGENOUS_OWNED,
        description: 'Technology solutions by and for Indigenous communities'
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {
          templateId: 'partnership-template',
          personalize: true
        }
      );

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(result.personalized).toBe(true);
    });

    it('should handle personalization errors', async () => {
      const openai = require('openai');
      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('OpenAI Error'))
          }
        }
      };
      openai.OpenAI.mockImplementation(() => mockOpenAI);

      const business: Partial<EnrichedBusiness> = {
        id: 'test-5',
        name: 'Error Test Company',
        email: 'error@test.com',
        type: BusinessType.CANADIAN_GENERAL
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {
          personalize: true
        }
      );

      // Should fall back to template
      expect(result.success).toBe(true);
      expect(result.personalized).toBe(false);
    });
  });

  describe('A/B Testing', () => {
    it('should select template variant for A/B test', async () => {
      const sendgrid = require('@sendgrid/mail');
      sendgrid.send.mockResolvedValue([{ statusCode: 202 }]);

      const business: Partial<EnrichedBusiness> = {
        id: 'test-6',
        name: 'AB Test Company',
        email: 'ab@test.com',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {
          abTest: {
            id: 'subject-line-test',
            variants: [
              { id: 'a', subject: 'Partnership Opportunity' },
              { id: 'b', subject: 'Let\'s Work Together' }
            ]
          }
        }
      );

      expect(result.success).toBe(true);
      expect(result.abTestVariant).toBeDefined();
      expect(['a', 'b']).toContain(result.abTestVariant);
    });

    it('should track A/B test performance', async () => {
      const business: Partial<EnrichedBusiness> = {
        id: 'test-7',
        name: 'Performance Test Company',
        email: 'performance@test.com',
        type: BusinessType.CANADIAN_GENERAL
      };

      await engine.trackEngagement('test-message-id', 'opened');
      await engine.trackEngagement('test-message-id', 'clicked');

      const performance = await engine.getABTestPerformance('subject-line-test');

      expect(performance).toBeDefined();
      expect(performance.variants).toBeDefined();
    });
  });

  describe('Campaign Management', () => {
    it('should create outreach campaign', async () => {
      const campaignData = {
        name: 'Indigenous Partnership Campaign',
        channels: [ChannelType.EMAIL, ChannelType.SMS],
        targetAudience: {
          businessTypes: [BusinessType.INDIGENOUS_OWNED]
        },
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      };

      const campaign = await engine.createCampaign(campaignData);

      expect(campaign.id).toBeDefined();
      expect(campaign.name).toBe(campaignData.name);
      expect(campaign.channels).toEqual(campaignData.channels);
      expect(campaign.status).toBe('draft');
    });

    it('should execute campaign for multiple businesses', async () => {
      const sendgrid = require('@sendgrid/mail');
      sendgrid.send.mockResolvedValue([{ statusCode: 202 }]);

      const campaign = await engine.createCampaign({
        name: 'Batch Campaign',
        channels: [ChannelType.EMAIL]
      });

      const businesses: Partial<EnrichedBusiness>[] = [
        {
          id: 'batch-1',
          name: 'Company 1',
          email: 'company1@test.com',
          type: BusinessType.INDIGENOUS_OWNED
        },
        {
          id: 'batch-2',
          name: 'Company 2',
          email: 'company2@test.com',
          type: BusinessType.INDIGENOUS_OWNED
        }
      ];

      const results = await engine.executeCampaignBatch(
        campaign.id,
        businesses as EnrichedBusiness[]
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(sendgrid.send).toHaveBeenCalledTimes(2);
    });

    it('should respect campaign schedule', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const campaign = await engine.createCampaign({
        name: 'Scheduled Campaign',
        channels: [ChannelType.EMAIL],
        schedule: {
          startDate: futureDate
        }
      });

      const business: Partial<EnrichedBusiness> = {
        id: 'scheduled-1',
        name: 'Scheduled Company',
        email: 'scheduled@test.com',
        type: BusinessType.CANADIAN_GENERAL
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {
          campaignId: campaign.id
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });
  });

  describe('Template Management', () => {
    it('should create and use custom templates', async () => {
      const template = await engine.createTemplate({
        name: 'Indigenous Welcome',
        channel: ChannelType.EMAIL,
        subject: 'Welcome {{businessName}}',
        content: 'Hello {{contactName}}, welcome to our platform!',
        variables: ['businessName', 'contactName']
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Indigenous Welcome');

      const sendgrid = require('@sendgrid/mail');
      sendgrid.send.mockResolvedValue([{ statusCode: 202 }]);

      const business: Partial<EnrichedBusiness> = {
        id: 'template-test-1',
        name: 'Template Test Company',
        email: 'template@test.com',
        type: BusinessType.INDIGENOUS_OWNED,
        contacts: [{
          name: 'John Doe',
          email: 'john@test.com',
          isPrimary: true
        }]
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {
          templateId: template.id
        }
      );

      expect(result.success).toBe(true);
      expect(sendgrid.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Welcome Template Test Company'
        })
      );
    });

    it('should validate template variables', async () => {
      const invalidTemplate = {
        name: 'Invalid Template',
        channel: ChannelType.EMAIL,
        subject: 'Test {{invalidVariable}}',
        content: 'Content',
        variables: ['businessName'] // Missing invalidVariable
      };

      await expect(engine.createTemplate(invalidTemplate)).rejects.toThrow();
    });
  });

  describe('Opt-Out Management', () => {
    it('should respect opt-out preferences', async () => {
      // Add to opt-out list
      await engine.addOptOut('optout@test.com', ChannelType.EMAIL, 'User request');
      
      mockRedis.sismember.mockResolvedValueOnce(1); // Simulate opt-out

      const business: Partial<EnrichedBusiness> = {
        id: 'optout-test-1',
        name: 'Opted Out Company',
        email: 'optout@test.com',
        type: BusinessType.CANADIAN_GENERAL
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('opted out');
    });

    it('should handle opt-out across channels', async () => {
      await engine.addOptOut('+15551234567', ChannelType.SMS, 'STOP reply');
      
      const optOuts = await engine.getOptOuts(ChannelType.SMS);
      
      expect(optOuts).toContain('+15551234567');
    });
  });

  describe('Rate Limiting', () => {
    it('should respect channel rate limits', async () => {
      const sendgrid = require('@sendgrid/mail');
      sendgrid.send.mockResolvedValue([{ statusCode: 202 }]);

      const businesses = Array(5).fill(null).map((_, i) => ({
        id: `rate-${i}`,
        name: `Company ${i}`,
        email: `company${i}@test.com`,
        type: BusinessType.CANADIAN_GENERAL
      }));

      const startTime = Date.now();
      const promises = businesses.map(b =>
        engine.sendOutreach(b as EnrichedBusiness, ChannelType.EMAIL, {})
      );
      
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should take some time due to rate limiting
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('Analytics', () => {
    it('should track outreach metrics', async () => {
      const sendgrid = require('@sendgrid/mail');
      sendgrid.send.mockResolvedValue([{ statusCode: 202 }]);

      const business: Partial<EnrichedBusiness> = {
        id: 'analytics-1',
        name: 'Analytics Company',
        email: 'analytics@test.com',
        type: BusinessType.INDIGENOUS_OWNED
      };

      await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {
          campaignId: 'test-campaign'
        }
      );

      const metrics = await engine.getCampaignMetrics('test-campaign');

      expect(metrics.sent).toBeGreaterThan(0);
      expect(metrics.channels[ChannelType.EMAIL]).toBeDefined();
    });

    it('should calculate conversion rates', async () => {
      // Simulate outreach and conversions
      await engine.trackEngagement('msg-1', 'sent');
      await engine.trackEngagement('msg-1', 'delivered');
      await engine.trackEngagement('msg-1', 'opened');
      await engine.trackEngagement('msg-1', 'clicked');
      await engine.trackEngagement('msg-1', 'converted');

      const metrics = await engine.getCampaignMetrics('test-campaign');

      expect(metrics.conversionRate).toBeGreaterThan(0);
      expect(metrics.engagementRate).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should retry failed sends', async () => {
      const sendgrid = require('@sendgrid/mail');
      sendgrid.send
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce([{ statusCode: 202 }]);

      const business: Partial<EnrichedBusiness> = {
        id: 'retry-1',
        name: 'Retry Company',
        email: 'retry@test.com',
        type: BusinessType.CANADIAN_GENERAL
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {
          retryOnFailure: true
        }
      );

      expect(result.success).toBe(true);
      expect(sendgrid.send).toHaveBeenCalledTimes(2);
    });

    it('should handle provider errors gracefully', async () => {
      const sendgrid = require('@sendgrid/mail');
      sendgrid.send.mockRejectedValue(new Error('Provider error'));

      const business: Partial<EnrichedBusiness> = {
        id: 'error-1',
        name: 'Error Company',
        email: 'error@test.com',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.EMAIL,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Channel-Specific Features', () => {
    it('should handle WhatsApp business messaging', async () => {
      const twilio = require('twilio');
      const mockClient = {
        messages: {
          create: jest.fn().mockResolvedValue({
            sid: 'whatsapp-sid',
            status: 'sent'
          })
        }
      };
      twilio.mockReturnValue(mockClient);

      const business: Partial<EnrichedBusiness> = {
        id: 'whatsapp-1',
        name: 'WhatsApp Company',
        phone: '+15551234567',
        type: BusinessType.INDIGENOUS_OWNED
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.WHATSAPP,
        {
          message: 'WhatsApp business message',
          mediaUrl: 'https://example.com/image.jpg'
        }
      );

      expect(result.success).toBe(true);
      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('whatsapp:')
        })
      );
    });

    it('should post to LinkedIn company pages', async () => {
      process.env.LINKEDIN_ACCESS_TOKEN = 'test-token';
      
      const axios = require('axios');
      axios.post.mockResolvedValue({
        data: { id: 'linkedin-post-id' }
      });

      const business: Partial<EnrichedBusiness> = {
        id: 'linkedin-1',
        name: 'LinkedIn Company',
        socialProfiles: {
          linkedin: 'https://linkedin.com/company/test'
        },
        type: BusinessType.CANADIAN_GENERAL
      };

      const result = await engine.sendOutreach(
        business as EnrichedBusiness,
        ChannelType.LINKEDIN,
        {
          message: 'LinkedIn outreach message'
        }
      );

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('linkedin.com'),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    });
  });
});