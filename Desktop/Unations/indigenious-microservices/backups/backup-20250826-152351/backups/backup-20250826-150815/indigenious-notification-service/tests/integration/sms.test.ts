import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import SMSService from '../../src/services/sms.service';
import twilio from 'twilio';
import { SNSClient } from '@aws-sdk/client-sns';

jest.mock('twilio');
jest.mock('@aws-sdk/client-sns');

describe('SMS Service Integration Tests', () => {
  let mockTwilioClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMS_PROVIDER = 'twilio';
    process.env.TWILIO_ACCOUNT_SID = 'test-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.TWILIO_PHONE_NUMBER = '+15551234567';

    mockTwilioClient = {
      messages: {
        create: jest.fn(),
      },
    };

    (twilio as jest.Mock).mockReturnValue(mockTwilioClient);
  });

  describe('sendSMS', () => {
    it('should send SMS via Twilio successfully', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      });

      const result = await SMSService.sendSMS({
        to: '+14165551234',
        message: 'Test SMS message',
      });

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('SENT');
      expect(result.provider).toBe('twilio');
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+14165551234',
          body: 'Test SMS message',
        })
      );
    });

    it('should normalize Canadian phone numbers', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      });

      await SMSService.sendSMS({
        to: '4165551234', // Missing country code
        message: 'Test message',
      });

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+14165551234', // Should add +1
        })
      );
    });

    it('should handle multiple recipients', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      });

      const result = await SMSService.sendSMS({
        to: ['+14165551234', '+16475559876'],
        message: 'Broadcast message',
      });

      expect(result.status).toBe('SENT');
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(2);
    });

    it('should respect opt-out preferences', async () => {
      // Mock opt-out check
      jest.spyOn(SMSService as any, 'checkOptOutStatus').mockResolvedValue(['+14165551234']);

      const result = await SMSService.sendSMS({
        to: ['+14165551234', '+16475559876'],
        message: 'Test message',
      });

      // Should only send to non-opted-out number
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(1);
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+16475559876',
        })
      );
    });

    it('should handle MMS with media URLs', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test-mms-sid',
        status: 'sent',
      });

      await SMSService.sendSMS({
        to: '+14165551234',
        message: 'Check out this image!',
        mediaUrls: ['https://example.com/image.jpg'],
      });

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaUrl: ['https://example.com/image.jpg'],
        })
      );
    });

    it('should enforce rate limiting', async () => {
      // Mock rate limit check to throw error
      jest.spyOn(SMSService as any, 'enforceRateLimit').mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(
        SMSService.sendSMS({
          to: '+14165551234',
          message: 'Test message',
        })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should use AWS SNS when configured', async () => {
      process.env.SMS_PROVIDER = 'sns';
      
      const mockSend = jest.fn().mockResolvedValue({
        MessageId: 'test-sns-message-id',
      });
      
      SNSClient.prototype.send = mockSend;

      const result = await SMSService.sendSMS({
        to: '+14165551234',
        message: 'Test message',
      });

      expect(result.provider).toBe('sns');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendSMSCampaign', () => {
    it('should send SMS campaign to segmented recipients', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      });

      const recipients = Array.from({ length: 10 }, (_, i) => ({
        phone: `+1416555${String(i).padStart(4, '0')}`,
        name: `User ${i}`,
        language: i % 2 === 0 ? 'en' as const : 'fr' as const,
      }));

      const result = await SMSService.sendSMSCampaign({
        recipients,
        template: 'rfq_notification',
        segment: 'indigenous',
      });

      expect(result).toHaveProperty('campaignId');
      expect(result.sent).toBeGreaterThan(0);
      expect(result.scheduled).toBe(false);
    });

    it('should personalize messages with template data', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      });

      jest.spyOn(SMSService as any, 'personalizeMessage').mockResolvedValue(
        'Hello John, new RFQ available!'
      );

      await SMSService.sendSMSCampaign({
        recipients: [{
          phone: '+14165551234',
          name: 'John',
          customData: { businessName: 'ABC Corp' },
        }],
        template: 'rfq_notification',
        templateData: { rfqTitle: 'Construction Project' },
      });

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Hello John, new RFQ available!',
        })
      );
    });
  });

  describe('handleIncomingSMS', () => {
    it('should handle opt-out requests', async () => {
      const handleOptOutSpy = jest.spyOn(SMSService as any, 'handleOptOut').mockResolvedValue(undefined);
      
      await SMSService.handleIncomingSMS({
        from: '+14165551234',
        to: '+15551234567',
        body: 'STOP',
        provider: 'twilio',
      });

      expect(handleOptOutSpy).toHaveBeenCalledWith('+14165551234');
    });

    it('should handle opt-in requests', async () => {
      const handleOptInSpy = jest.spyOn(SMSService as any, 'handleOptIn').mockResolvedValue(undefined);
      
      await SMSService.handleIncomingSMS({
        from: '+14165551234',
        to: '+15551234567',
        body: 'START',
        provider: 'twilio',
      });

      expect(handleOptInSpy).toHaveBeenCalledWith('+14165551234');
    });

    it('should parse keywords from messages', async () => {
      const parseKeywordsSpy = jest.spyOn(SMSService as any, 'parseKeywords');
      
      await SMSService.handleIncomingSMS({
        from: '+14165551234',
        to: '+15551234567',
        body: 'HELP me with my account STATUS',
        provider: 'twilio',
      });

      expect(parseKeywordsSpy).toHaveBeenCalled();
    });
  });

  describe('Indigenous-specific features', () => {
    it('should send verification codes with bilingual support', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      });

      await SMSService.sendVerificationCode('+14165551234', '123456', 'fr');

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('vérification'),
        })
      );
    });

    it('should send RFQ notifications to Indigenous businesses', async () => {
      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent',
      });

      const businesses = [
        { phone: '+14165551234', name: 'Indigenous Business 1', language: 'en' as const },
        { phone: '+16475559876', name: 'Indigenous Business 2', language: 'fr' as const },
      ];

      await SMSService.sendRFQNotification(businesses, {
        title: 'Construction RFQ',
        deadline: new Date('2024-12-31'),
        value: '$500,000',
        category: 'construction',
      });

      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(2);
      
      // Check English message
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+14165551234',
          body: expect.stringContaining('New RFQ opportunity'),
        })
      );

      // Check French message
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+16475559876',
          body: expect.stringContaining('Nouvelle opportunité RFQ'),
        })
      );
    });
  });
});