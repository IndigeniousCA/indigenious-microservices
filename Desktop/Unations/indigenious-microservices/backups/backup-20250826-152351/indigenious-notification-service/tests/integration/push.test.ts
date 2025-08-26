import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import PushService from '../../src/services/push.service';
import * as admin from 'firebase-admin';
import webpush from 'web-push';

jest.mock('firebase-admin');
jest.mock('web-push');

describe('Push Service Integration Tests', () => {
  let mockMessaging: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockMessaging = {
      sendMulticast: jest.fn(),
    };

    (admin.messaging as jest.Mock) = jest.fn().mockReturnValue(mockMessaging);
    (admin.apps as any) = [{}]; // Mock that Firebase is initialized
  });

  describe('sendPushNotification', () => {
    it('should send push notification via FCM successfully', async () => {
      mockMessaging.sendMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [
          { success: true, messageId: 'msg1' },
          { success: true, messageId: 'msg2' },
        ],
      });

      // Mock token validation
      jest.spyOn(PushService as any, 'validateTokens').mockResolvedValue([
        'token1',
        'token2',
      ]);

      // Mock preference check
      jest.spyOn(PushService as any, 'checkPushPreferences').mockResolvedValue([
        'token1',
        'token2',
      ]);

      // Mock token categorization
      jest.spyOn(PushService as any, 'categorizeTokens').mockResolvedValue({
        fcmTokens: ['token1', 'token2'],
        webPushSubscriptions: [],
      });

      const result = await PushService.sendPushNotification({
        tokens: ['token1', 'token2'],
        title: 'New RFQ Available',
        body: 'A new RFQ matching your profile is available',
        data: { rfqId: '123', category: 'construction' },
        priority: 'high',
      });

      expect(result.status).toBe('SENT');
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockMessaging.sendMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['token1', 'token2'],
          notification: expect.objectContaining({
            title: 'New RFQ Available',
            body: 'A new RFQ matching your profile is available',
          }),
        })
      );
    });

    it('should handle partial failures gracefully', async () => {
      mockMessaging.sendMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg1' },
          { 
            success: false, 
            error: { 
              code: 'messaging/invalid-registration-token',
              message: 'Invalid token',
            },
          },
        ],
      });

      jest.spyOn(PushService as any, 'validateTokens').mockResolvedValue(['token1', 'token2']);
      jest.spyOn(PushService as any, 'checkPushPreferences').mockResolvedValue(['token1', 'token2']);
      jest.spyOn(PushService as any, 'categorizeTokens').mockResolvedValue({
        fcmTokens: ['token1', 'token2'],
        webPushSubscriptions: [],
      });

      const removeInvalidTokenSpy = jest.spyOn(PushService as any, 'removeInvalidToken').mockResolvedValue(undefined);

      const result = await PushService.sendPushNotification({
        tokens: ['token1', 'token2'],
        title: 'Test',
        body: 'Test notification',
      });

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(removeInvalidTokenSpy).toHaveBeenCalledWith('token2');
    });

    it('should send via Web Push when appropriate', async () => {
      const mockSendNotification = jest.fn().mockResolvedValue({});
      (webpush.sendNotification as jest.Mock) = mockSendNotification;

      jest.spyOn(PushService as any, 'validateTokens').mockResolvedValue(['http://example.com/push']);
      jest.spyOn(PushService as any, 'checkPushPreferences').mockResolvedValue(['http://example.com/push']);
      jest.spyOn(PushService as any, 'categorizeTokens').mockResolvedValue({
        fcmTokens: [],
        webPushSubscriptions: [{
          endpoint: 'http://example.com/push',
          keys: {
            p256dh: 'test-key',
            auth: 'test-auth',
          },
        }],
      });

      const result = await PushService.sendPushNotification({
        tokens: ['http://example.com/push'],
        title: 'Web Push Test',
        body: 'Testing web push',
        icon: '/icon.png',
      });

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://example.com/push',
        }),
        expect.stringContaining('Web Push Test'),
        expect.any(Object)
      );
    });

    it('should include platform-specific options', async () => {
      mockMessaging.sendMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'msg1' }],
      });

      jest.spyOn(PushService as any, 'validateTokens').mockResolvedValue(['token1']);
      jest.spyOn(PushService as any, 'checkPushPreferences').mockResolvedValue(['token1']);
      jest.spyOn(PushService as any, 'categorizeTokens').mockResolvedValue({
        fcmTokens: ['token1'],
        webPushSubscriptions: [],
      });

      await PushService.sendPushNotification({
        tokens: ['token1'],
        title: 'Test',
        body: 'Test',
        sound: 'default',
        badge: '1',
        priority: 'high',
      });

      expect(mockMessaging.sendMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            priority: 'high',
            notification: expect.objectContaining({
              sound: 'default',
            }),
          }),
          apns: expect.objectContaining({
            payload: expect.objectContaining({
              aps: expect.objectContaining({
                badge: 1,
                sound: 'default',
              }),
            }),
          }),
        })
      );
    });
  });

  describe('registerDevice', () => {
    it('should register device token', async () => {
      const upsertSpy = jest.fn().mockResolvedValue({});
      const saddSpy = jest.fn().mockResolvedValue(1);
      const expireSpy = jest.fn().mockResolvedValue(1);

      // Mock Prisma
      const prisma = require('../../src/config/database').prisma;
      prisma.pushDevice = { upsert: upsertSpy };

      // Mock Redis
      const redis = require('../../src/config/redis').redis;
      redis.sadd = saddSpy;
      redis.expire = expireSpy;

      await PushService.registerDevice({
        userId: 'user123',
        token: 'fcm-token-123',
        platform: 'ios',
        deviceInfo: {
          model: 'iPhone 14',
          osVersion: '16.0',
          appVersion: '1.0.0',
        },
      });

      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: 'fcm-token-123' },
          update: expect.objectContaining({
            userId: 'user123',
            platform: 'ios',
          }),
        })
      );

      expect(saddSpy).toHaveBeenCalledWith('push:user:user123', 'fcm-token-123');
    });
  });

  describe('sendPushCampaign', () => {
    it('should send campaign to segmented audience', async () => {
      // Mock segment token retrieval
      jest.spyOn(PushService as any, 'getSegmentTokens').mockResolvedValue([
        'token1',
        'token2',
        'token3',
      ]);

      // Mock targeting
      jest.spyOn(PushService as any, 'applyTargeting').mockResolvedValue([
        'token1',
        'token2',
      ]);

      // Mock the actual send
      jest.spyOn(PushService, 'sendPushNotification').mockResolvedValue({
        id: 'notif-123',
        status: 'SENT' as any,
        successful: 2,
        failed: 0,
      });

      const result = await PushService.sendPushCampaign({
        segment: 'indigenous',
        notification: {
          title: 'Campaign Test',
          body: 'Testing campaign',
          data: { campaignType: 'test' },
        },
        targeting: {
          platform: 'ios',
          lastActiveWithin: 7,
        },
      });

      expect(result.campaignId).toBeDefined();
      expect(result.targetSize).toBe(2);
      expect(result.status).toBe('sent');
      expect(PushService.sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['token1', 'token2'],
          title: 'Campaign Test',
        })
      );
    });

    it('should schedule campaign for future delivery', async () => {
      jest.spyOn(PushService as any, 'getSegmentTokens').mockResolvedValue(['token1']);
      jest.spyOn(PushService as any, 'applyTargeting').mockResolvedValue(['token1']);
      jest.spyOn(PushService as any, 'scheduleCampaign').mockResolvedValue(undefined);

      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      const result = await PushService.sendPushCampaign({
        segment: 'all',
        notification: {
          title: 'Scheduled',
          body: 'Scheduled notification',
        },
        scheduling: {
          sendAt: futureDate,
          timezone: 'America/Toronto',
        },
      });

      expect(result.scheduled).toBe(true);
      expect(result.status).toBe('scheduled');
    });
  });

  describe('Indigenous-specific features', () => {
    it('should notify Indigenous businesses about RFQs', async () => {
      const prisma = require('../../src/config/database').prisma;
      prisma.indigenousBusiness = {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'user1' },
          { userId: 'user2' },
        ]),
      };

      jest.spyOn(PushService as any, 'getTokensForUsers').mockResolvedValue([
        'token1',
        'token2',
      ]);

      jest.spyOn(PushService, 'sendPushNotification').mockResolvedValue({
        id: 'notif-123',
        status: 'SENT' as any,
        successful: 2,
        failed: 0,
      });

      await PushService.notifyIndigenousBusinesses({
        title: 'New RFQ: Construction Project',
        body: 'A new construction RFQ is available',
        data: {
          rfqId: 'rfq-123',
          category: 'construction',
          value: '$500,000',
        },
        category: 'construction',
        region: 'Ontario',
      });

      expect(prisma.indigenousBusiness.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pushNotificationsEnabled: true,
            categories: { has: 'construction' },
            region: 'Ontario',
          }),
        })
      );

      expect(PushService.sendPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['token1', 'token2'],
          priority: 'high',
          data: expect.objectContaining({
            type: 'indigenous_business',
            category: 'construction',
          }),
        })
      );
    });
  });
});