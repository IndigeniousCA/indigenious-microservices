import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import EmailService from '../../src/services/email.service';
import sgMail from '@sendgrid/mail';
import { SESClient } from '@aws-sdk/client-ses';

jest.mock('@sendgrid/mail');
jest.mock('@aws-sdk/client-ses');

describe('Email Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.EMAIL_FROM = 'test@indigenous.ca';
  });

  describe('sendEmail', () => {
    it('should send email via SendGrid successfully', async () => {
      const mockSend = jest.fn().mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-message-id' }
      }]);
      (sgMail.send as jest.Mock) = mockSend;

      const result = await EmailService.sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
      });

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('SENT');
      expect(result.provider).toBe('sendgrid');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple recipients', async () => {
      const mockSend = jest.fn().mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-message-id' }
      }]);
      (sgMail.send as jest.Mock) = mockSend;

      const result = await EmailService.sendEmail({
        to: ['recipient1@test.com', 'recipient2@test.com'],
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
      });

      expect(result.status).toBe('SENT');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['recipient1@test.com', 'recipient2@test.com'],
        })
      );
    });

    it('should process email templates', async () => {
      const mockSend = jest.fn().mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-message-id' }
      }]);
      (sgMail.send as jest.Mock) = mockSend;

      // Mock template processing
      jest.spyOn(EmailService, 'processTemplate').mockResolvedValue({
        html: '<p>Processed HTML</p>',
        text: 'Processed text',
      });

      const result = await EmailService.sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Email',
        template: 'welcome',
        templateData: { name: 'Test User' },
      });

      expect(result.status).toBe('SENT');
      expect(EmailService.processTemplate).toHaveBeenCalledWith(
        'welcome',
        { name: 'Test User' }
      );
    });

    it('should add tracking pixels when enabled', async () => {
      const mockSend = jest.fn().mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-message-id' }
      }]);
      (sgMail.send as jest.Mock) = mockSend;

      await EmailService.sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Email',
        html: '<body><p>Test content</p></body>',
        text: 'Test content',
        trackOpens: true,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('track/open'),
        })
      );
    });

    it('should handle SendGrid failures gracefully', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('SendGrid error'));
      (sgMail.send as jest.Mock) = mockSend;

      await expect(
        EmailService.sendEmail({
          to: 'recipient@test.com',
          subject: 'Test Email',
          html: '<p>Test content</p>',
          text: 'Test content',
        })
      ).rejects.toThrow('SendGrid error');
    });

    it('should fallback to AWS SES when configured', async () => {
      process.env.EMAIL_PROVIDER = 'ses';
      
      const mockSend = jest.fn().mockResolvedValue({
        MessageId: 'test-ses-message-id',
      });
      
      SESClient.prototype.send = mockSend;

      const result = await EmailService.sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
      });

      expect(result.provider).toBe('ses');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendBulkEmails', () => {
    it('should send bulk emails in batches', async () => {
      const mockSend = jest.fn().mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-message-id' }
      }]);
      (sgMail.send as jest.Mock) = mockSend;

      const recipients = Array.from({ length: 250 }, (_, i) => ({
        email: `user${i}@test.com`,
        data: { name: `User ${i}` },
      }));

      const result = await EmailService.sendBulkEmails(recipients, {
        subject: 'Bulk Email',
        template: 'newsletter',
      });

      expect(result).toHaveProperty('batchId');
      expect(result.sent).toBeGreaterThan(0);
      expect(result.sent + result.failed).toBe(250);
    });

    it('should handle rate limiting between batches', async () => {
      const mockSend = jest.fn().mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'test-message-id' }
      }]);
      (sgMail.send as jest.Mock) = mockSend;

      const startTime = Date.now();
      
      const recipients = Array.from({ length: 150 }, (_, i) => ({
        email: `user${i}@test.com`,
      }));

      await EmailService.sendBulkEmails(recipients, {
        subject: 'Bulk Email',
        html: '<p>Test</p>',
        text: 'Test',
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(1000); // Should have at least 1 second delay
    });
  });

  describe('createIndigenousTemplate', () => {
    it('should create Indigenous-specific email templates', async () => {
      const createSpy = jest.spyOn(EmailService, 'createIndigenousTemplate');
      
      await EmailService.createIndigenousTemplate(
        'rfq_indigenous',
        'New RFQ for Indigenous Businesses',
        {
          en: {
            html: '<p>English content</p>',
            text: 'English content',
          },
          fr: {
            html: '<p>Contenu français</p>',
            text: 'Contenu français',
          },
        }
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Email Service - Invalid Inputs', () => {
  it('should reject invalid email addresses', async () => {
    await expect(
      EmailService.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      })
    ).rejects.toThrow();
  });

  it('should handle empty recipient list', async () => {
    await expect(
      EmailService.sendEmail({
        to: [],
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      })
    ).rejects.toThrow('No valid recipients');
  });
});