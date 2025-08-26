import { PrismaClient, Prisma } from '@prisma/client';
import * as admin from 'firebase-admin';
import apn from 'apn';
import webpush from 'web-push';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import OneSignal from 'onesignal-node';
import Redis from 'ioredis';
import Bull, { Queue } from 'bull';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, isAfter } from 'date-fns';
import winston from 'winston';
import { compile } from 'handlebars';
import sharp from 'sharp';
import axios from 'axios';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface PushNotificationData {
  userId?: string;
  deviceToken?: string;
  topic?: string;
  title: string;
  body: string;
  subtitle?: string;
  badge?: number;
  sound?: string;
  image?: string;
  icon?: string;
  color?: string;
  clickAction?: string;
  data?: any;
  priority?: string;
  ttl?: number;
  // Indigenous context
  indigenousNotification?: boolean;
  elderNotification?: boolean;
  ceremonyNotification?: boolean;
  emergencyNotification?: boolean;
  communityAlert?: boolean;
  culturallySensitive?: boolean;
  traditionalContent?: boolean;
  nation?: string;
  territory?: string;
  language?: string;
  indigenousLanguage?: string;
  campaignId?: string;
}

export class PushNotificationService extends EventEmitter {
  private notificationQueue: Queue;
  private firebaseApp: admin.app.App | null = null;
  private apnsProvider: apn.Provider | null = null;
  private expo: Expo;
  private oneSignalClient: any = null;
  private logger: winston.Logger;
  
  // Indigenous notification priorities
  private readonly ELDER_PRIORITY = 10;
  private readonly EMERGENCY_PRIORITY = 15;
  private readonly CEREMONY_PRIORITY = 9;
  private readonly COMMUNITY_PRIORITY = 8;
  private readonly CULTURAL_SENSITIVE_PRIORITY = 7;
  
  constructor() {
    super();
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'push-notification.log' })
      ]
    });
    
    // Initialize notification queue
    this.notificationQueue = new Bull('notification queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
    
    // Initialize providers
    this.initializeProviders();
    
    // Initialize Expo client
    this.expo = new Expo();
    
    // Process notification queue
    this.processNotificationQueue();
    
    this.logger.info('Indigenous Push Notification Service initialized', {
      service: 'push-notification-service',
      indigenousFeatures: [
        'Elder priority notifications',
        'Emergency alert system',
        'Ceremony-aware notifications',
        'Cultural sensitivity protection',
        'Traditional content delivery',
        'Nation-specific targeting',
        'Multi-platform support'
      ]
    });
  }
  
  // Initialize notification providers
  private async initializeProviders(): Promise<void> {
    try {
      // Initialize Firebase Admin (FCM)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        this.logger.info('Firebase Admin initialized');
      }
      
      // Initialize APNS
      if (process.env.APNS_KEY_PATH && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID) {
        this.apnsProvider = new apn.Provider({
          token: {
            key: process.env.APNS_KEY_PATH,
            keyId: process.env.APNS_KEY_ID,
            teamId: process.env.APNS_TEAM_ID
          },
          production: process.env.NODE_ENV === 'production'
        });
        this.logger.info('APNS Provider initialized');
      }
      
      // Initialize Web Push
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:admin@indigenous.ca',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        this.logger.info('Web Push initialized');
      }
      
      // Initialize OneSignal
      if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_API_KEY) {
        this.oneSignalClient = new OneSignal.Client({
          app: { appId: process.env.ONESIGNAL_APP_ID, appAuthKey: process.env.ONESIGNAL_API_KEY }
        });
        this.logger.info('OneSignal initialized');
      }
    } catch (error) {
      this.logger.error('Failed to initialize providers', { error });
    }
  }
  
  // Send push notification with Indigenous context awareness
  async sendNotification(notificationData: PushNotificationData): Promise<string> {
    const notificationId = uuidv4();
    
    try {
      // Validate notification data
      await this.validateNotificationData(notificationData);
      
      // Check Indigenous requirements
      await this.checkIndigenousRequirements(notificationData);
      
      // Apply Indigenous notification enhancements
      const enhancedData = await this.enhanceIndigenousNotification(notificationData);
      
      // Determine priority based on Indigenous context
      const priority = this.calculateNotificationPriority(enhancedData);
      
      // Get target device(s)
      let deviceTokens: string[] = [];
      let platform: string | undefined;
      
      if (enhancedData.deviceToken) {
        deviceTokens = [enhancedData.deviceToken];
        const device = await prisma.device.findUnique({
          where: { token: enhancedData.deviceToken }
        });
        platform = device?.platform;
      } else if (enhancedData.userId) {
        const devices = await prisma.device.findMany({
          where: { userId: enhancedData.userId, active: true, pushEnabled: true }
        });
        deviceTokens = devices.map(d => d.token);
        platform = devices[0]?.platform;
      } else if (enhancedData.topic) {
        // Topic notifications handled separately
        return await this.sendTopicNotification(notificationId, enhancedData);
      }
      
      // Create notification record
      const notification = await prisma.pushNotification.create({
        data: {
          id: notificationId,
          notificationId: `PUSH-${notificationId}`,
          userId: enhancedData.userId,
          deviceToken: enhancedData.deviceToken,
          topic: enhancedData.topic,
          title: enhancedData.title,
          body: enhancedData.body,
          subtitle: enhancedData.subtitle,
          badge: enhancedData.badge,
          sound: enhancedData.sound,
          image: enhancedData.image,
          icon: enhancedData.icon,
          color: enhancedData.color,
          clickAction: enhancedData.clickAction,
          data: enhancedData.data,
          indigenousNotification: enhancedData.indigenousNotification || false,
          elderNotification: enhancedData.elderNotification || false,
          ceremonyNotification: enhancedData.ceremonyNotification || false,
          emergencyNotification: enhancedData.emergencyNotification || false,
          communityAlert: enhancedData.communityAlert || false,
          culturallySensitive: enhancedData.culturallySensitive || false,
          traditionalContent: enhancedData.traditionalContent || false,
          nation: enhancedData.nation,
          territory: enhancedData.territory,
          language: enhancedData.language || 'en',
          indigenousLanguage: enhancedData.indigenousLanguage,
          priority,
          urgent: priority === 'HIGH' || priority === 'EMERGENCY',
          elderPriority: enhancedData.elderNotification || false,
          ceremonyUrgent: enhancedData.ceremonyNotification && priority === 'HIGH',
          ttl: enhancedData.ttl,
          platform,
          campaignId: enhancedData.campaignId,
          metadata: enhancedData.data
        }
      });
      
      // Add to queue with priority
      await this.queueNotification(notification, deviceTokens, priority);
      
      // Emit event
      this.emit('notificationQueued', notification);
      
      return notificationId;
    } catch (error) {
      this.logger.error('Failed to send notification', { error, notificationData });
      throw error;
    }
  }
  
  // Validate notification data
  private async validateNotificationData(notificationData: PushNotificationData): Promise<void> {
    if (!notificationData.title || notificationData.title.trim().length === 0) {
      throw new Error('Notification title is required');
    }
    
    if (!notificationData.body || notificationData.body.trim().length === 0) {
      throw new Error('Notification body is required');
    }
    
    if (!notificationData.userId && !notificationData.deviceToken && !notificationData.topic) {
      throw new Error('Target (userId, deviceToken, or topic) is required');
    }
    
    // Validate image URL if provided
    if (notificationData.image) {
      try {
        new URL(notificationData.image);
      } catch {
        throw new Error('Invalid image URL');
      }
    }
  }
  
  // Check Indigenous-specific requirements
  private async checkIndigenousRequirements(notificationData: PushNotificationData): Promise<void> {
    // Elder notifications require approval for traditional content
    if (notificationData.elderNotification && notificationData.traditionalContent) {
      const approval = await this.checkElderApproval(notificationData);
      if (!approval) {
        throw new Error('Elder approval required for traditional content notifications');
      }
    }
    
    // Emergency notifications require special handling
    if (notificationData.emergencyNotification) {
      const emergencyAuth = await this.checkEmergencyAuthorization(notificationData);
      if (!emergencyAuth) {
        throw new Error('Emergency notification authorization required');
      }
    }
    
    // Ceremony notifications during ceremony periods
    if (notificationData.ceremonyNotification) {
      const ceremonyStatus = await this.checkCeremonyStatus();
      if (ceremonyStatus.active) {
        notificationData.priority = 'HIGH';
        notificationData.data = {
          ...notificationData.data,
          ceremonyActive: true,
          ceremonyType: ceremonyStatus.type
        };
      }
    }
  }
  
  // Enhance notification with Indigenous features
  private async enhanceIndigenousNotification(notificationData: PushNotificationData): Promise<PushNotificationData> {
    const enhanced = { ...notificationData };
    
    // Add Indigenous greeting for Elder notifications
    if (enhanced.elderNotification) {
      const greeting = this.getIndigenousGreeting(enhanced.nation, enhanced.indigenousLanguage);
      enhanced.title = `${greeting} - ${enhanced.title}`;
    }
    
    // Add emergency prefix for emergency notifications
    if (enhanced.emergencyNotification) {
      enhanced.title = `🚨 EMERGENCY: ${enhanced.title}`;
      enhanced.sound = 'emergency.mp3';
      enhanced.priority = 'EMERGENCY';
    }
    
    // Add ceremony indicator for ceremony notifications
    if (enhanced.ceremonyNotification) {
      enhanced.title = `🪶 ${enhanced.title}`;
    }
    
    // Optimize image for push notifications
    if (enhanced.image) {
      enhanced.image = await this.optimizeNotificationImage(enhanced.image);
    }
    
    // Add cultural icons
    if (enhanced.indigenousNotification && !enhanced.icon) {
      enhanced.icon = await this.getCulturalIcon(enhanced.nation);
    }
    
    return enhanced;
  }
  
  // Calculate notification priority based on Indigenous context
  private calculateNotificationPriority(notificationData: PushNotificationData): string {
    if (notificationData.emergencyNotification) return 'EMERGENCY';
    if (notificationData.elderNotification) return 'HIGH';
    if (notificationData.ceremonyNotification) return 'HIGH';
    if (notificationData.communityAlert) return 'NORMAL';
    if (notificationData.culturallySensitive) return 'NORMAL';
    return notificationData.priority || 'NORMAL';
  }
  
  // Queue notification for delivery
  private async queueNotification(notification: any, deviceTokens: string[], priority: string): Promise<void> {
    const jobPriority = this.getJobPriority(priority, notification);
    
    for (const token of deviceTokens) {
      await this.notificationQueue.add('sendNotification', {
        notification,
        deviceToken: token
      }, {
        priority: jobPriority,
        attempts: notification.maxRetries || 3,
        backoff: {
          type: 'exponential',
          delay: 30000 // 30 seconds
        },
        removeOnComplete: 50,
        removeOnFail: 20
      });
    }
  }
  
  // Send topic notification
  private async sendTopicNotification(notificationId: string, notificationData: PushNotificationData): Promise<string> {
    try {
      const topic = await prisma.topic.findUnique({
        where: { topicName: notificationData.topic! }
      });
      
      if (!topic) {
        throw new Error('Topic not found');
      }
      
      // Check Indigenous topic requirements
      if (topic.indigenousTopic && topic.elderModerated) {
        const approval = await this.checkElderApproval(notificationData);
        if (!approval) {
          throw new Error('Elder approval required for Indigenous topic notifications');
        }
      }
      
      // Get subscribed devices
      const subscriptions = await prisma.topicSubscription.findMany({
        where: {
          topicId: topic.id,
          subscribed: true
        },
        include: {
          device: true
        }
      });
      
      const deviceTokens = subscriptions.map(s => s.device.token);
      
      // Create notification record
      const notification = await prisma.pushNotification.create({
        data: {
          id: notificationId,
          notificationId: `PUSH-${notificationId}`,
          topic: notificationData.topic,
          title: notificationData.title,
          body: notificationData.body,
          subtitle: notificationData.subtitle,
          indigenousNotification: topic.indigenousTopic,
          elderNotification: topic.elderTopic,
          ceremonyNotification: topic.ceremonyTopic,
          emergencyNotification: topic.emergencyTopic,
          nation: topic.nation,
          territory: topic.territory,
          priority: this.calculateNotificationPriority(notificationData),
          metadata: notificationData.data
        }
      });
      
      // Queue notifications for all subscribers
      await this.queueNotification(notification, deviceTokens, notification.priority);
      
      return notificationId;
    } catch (error) {
      this.logger.error('Failed to send topic notification', { error, notificationData });
      throw error;
    }
  }
  
  // Get job priority for queue
  private getJobPriority(priority: string, notification: any): number {
    let jobPriority = 0;
    
    switch (priority) {
      case 'EMERGENCY': jobPriority = 200; break;
      case 'HIGH': jobPriority = 100; break;
      case 'NORMAL': jobPriority = 50; break;
      case 'LOW': jobPriority = 10; break;
    }
    
    // Indigenous priority boosts
    if (notification.emergencyNotification) jobPriority += this.EMERGENCY_PRIORITY;
    if (notification.elderNotification) jobPriority += this.ELDER_PRIORITY;
    if (notification.ceremonyNotification) jobPriority += this.CEREMONY_PRIORITY;
    if (notification.communityAlert) jobPriority += this.COMMUNITY_PRIORITY;
    if (notification.culturallySensitive) jobPriority += this.CULTURAL_SENSITIVE_PRIORITY;
    
    return jobPriority;
  }
  
  // Process notification queue
  private processNotificationQueue(): void {
    this.notificationQueue.process('sendNotification', async (job) => {
      const { notification, deviceToken } = job.data;
      
      try {
        // Get device information
        const device = await prisma.device.findUnique({
          where: { token: deviceToken }
        });
        
        if (!device || !device.active || !device.pushEnabled) {
          throw new Error('Device not available for push notifications');
        }
        
        // Check quiet hours for non-emergency notifications
        if (!notification.emergencyNotification && device.quietHoursEnabled) {
          const inQuietHours = this.isInQuietHours(device.quietHoursStart, device.quietHoursEnd, device.timeZone);
          if (inQuietHours) {
            // Reschedule for after quiet hours
            await this.notificationQueue.add('sendNotification', job.data, {
              delay: this.getDelayUntilAfterQuietHours(device.quietHoursEnd, device.timeZone)
            });
            return;
          }
        }
        
        // Send via appropriate provider
        let result;
        switch (device.platform) {
          case 'IOS':
            result = await this.sendAPNS(device, notification);
            break;
          case 'ANDROID':
            result = await this.sendFCM(device, notification);
            break;
          case 'WEB':
            result = await this.sendWebPush(device, notification);
            break;
          case 'EXPO':
            result = await this.sendExpo(device, notification);
            break;
          default:
            throw new Error(`Unsupported platform: ${device.platform}`);
        }
        
        // Update notification status
        await prisma.pushNotification.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            provider: result.provider,
            providerMessageId: result.messageId,
            providerResponse: result.response
          }
        });
        
        // Track Indigenous delivery
        if (notification.indigenousNotification) {
          await this.trackIndigenousDelivery(notification);
        }
        
        // Update device last seen
        await prisma.device.update({
          where: { id: device.id },
          data: { lastSeen: new Date() }
        });
        
        this.emit('notificationSent', notification);
        
        return result;
      } catch (error) {
        // Update notification status
        await prisma.pushNotification.update({
          where: { id: notification.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            errorMessage: error.message
          }
        });
        
        this.logger.error('Failed to send notification', { notificationId: notification.id, error });
        throw error;
      }
    });
  }
  
  // Send via Firebase Cloud Messaging (Android)
  private async sendFCM(device: any, notification: any): Promise<any> {
    if (!this.firebaseApp) {
      throw new Error('Firebase not configured');
    }
    
    const message: admin.messaging.Message = {
      token: device.token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image
      },
      data: notification.data || {},
      android: {
        priority: notification.priority === 'HIGH' || notification.priority === 'EMERGENCY' ? 'high' : 'normal',
        ttl: notification.ttl ? notification.ttl * 1000 : undefined,
        notification: {
          sound: notification.sound || 'default',
          color: notification.color,
          icon: notification.icon,
          clickAction: notification.clickAction
        }
      }
    };
    
    const response = await admin.messaging().send(message);
    
    return {
      provider: 'FCM',
      messageId: response,
      response: { success: true }
    };
  }
  
  // Send via Apple Push Notification Service (iOS)
  private async sendAPNS(device: any, notification: any): Promise<any> {
    if (!this.apnsProvider) {
      throw new Error('APNS not configured');
    }
    
    const apnsNotification = new apn.Notification();
    apnsNotification.alert = {
      title: notification.title,
      subtitle: notification.subtitle,
      body: notification.body
    };
    apnsNotification.badge = notification.badge;
    apnsNotification.sound = notification.sound || 'default';
    apnsNotification.payload = notification.data || {};
    apnsNotification.topic = process.env.APNS_BUNDLE_ID;
    apnsNotification.expiry = notification.ttl ? Math.floor(Date.now() / 1000) + notification.ttl : undefined;
    apnsNotification.priority = notification.priority === 'HIGH' || notification.priority === 'EMERGENCY' ? 10 : 5;
    
    if (notification.image) {
      apnsNotification.mutableContent = true;
      apnsNotification.payload.imageUrl = notification.image;
    }
    
    const result = await this.apnsProvider.send(apnsNotification, device.token);
    
    return {
      provider: 'APNS',
      messageId: apnsNotification.id,
      response: result
    };
  }
  
  // Send Web Push notification
  private async sendWebPush(device: any, notification: any): Promise<any> {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      image: notification.image,
      data: notification.data,
      actions: notification.actions
    });
    
    const options = {
      TTL: notification.ttl || 60 * 60 * 24, // 24 hours default
      urgency: notification.priority === 'HIGH' || notification.priority === 'EMERGENCY' ? 'high' : 'normal'
    };
    
    const result = await webpush.sendNotification(
      JSON.parse(device.token), // Web push subscription object
      payload,
      options
    );
    
    return {
      provider: 'WEBPUSH',
      messageId: result.headers['x-message-id'],
      response: result
    };
  }
  
  // Send via Expo
  private async sendExpo(device: any, notification: any): Promise<any> {
    const message: ExpoPushMessage = {
      to: device.token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: notification.sound || 'default',
      badge: notification.badge,
      priority: notification.priority === 'HIGH' || notification.priority === 'EMERGENCY' ? 'high' : 'default',
      ttl: notification.ttl
    };
    
    const chunks = this.expo.chunkPushNotifications([message]);
    const tickets = [];
    
    for (const chunk of chunks) {
      const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    
    return {
      provider: 'EXPO',
      messageId: tickets[0]?.id,
      response: tickets[0]
    };
  }
  
  // Register device
  async registerDevice(deviceData: any): Promise<string> {
    const deviceId = uuidv4();
    
    const device = await prisma.device.upsert({
      where: { token: deviceData.token },
      update: {
        userId: deviceData.userId,
        platform: deviceData.platform,
        model: deviceData.model,
        os: deviceData.os,
        appVersion: deviceData.appVersion,
        pushEnabled: true,
        indigenousUser: deviceData.indigenousUser,
        isElder: deviceData.isElder,
        nation: deviceData.nation,
        territory: deviceData.territory,
        preferredLanguage: deviceData.preferredLanguage,
        indigenousLanguage: deviceData.indigenousLanguage,
        active: true,
        lastSeen: new Date()
      },
      create: {
        id: deviceId,
        deviceId: `DEVICE-${deviceId}`,
        token: deviceData.token,
        userId: deviceData.userId,
        platform: deviceData.platform,
        model: deviceData.model,
        os: deviceData.os,
        appVersion: deviceData.appVersion,
        indigenousUser: deviceData.indigenousUser || false,
        isElder: deviceData.isElder || false,
        nation: deviceData.nation,
        territory: deviceData.territory,
        preferredLanguage: deviceData.preferredLanguage || 'en',
        indigenousLanguage: deviceData.indigenousLanguage
      }
    });
    
    return device.id;
  }
  
  // Track notification interaction
  async trackInteraction(notificationId: string, interactionData: any): Promise<void> {
    try {
      await prisma.notificationInteraction.create({
        data: {
          notificationId,
          interactionType: interactionData.type,
          actionId: interactionData.actionId,
          deviceId: interactionData.deviceId,
          userId: interactionData.userId,
          ipAddress: interactionData.ipAddress,
          userAgent: interactionData.userAgent,
          elderInteraction: interactionData.elderInteraction || false,
          ceremonyRelated: interactionData.ceremonyRelated || false
        }
      });
      
      // Update notification status
      if (interactionData.type === 'CLICKED') {
        await prisma.pushNotification.update({
          where: { id: notificationId },
          data: { 
            status: 'CLICKED',
            clickedAt: new Date()
          }
        });
      } else if (interactionData.type === 'DELIVERED') {
        await prisma.pushNotification.update({
          where: { id: notificationId },
          data: { 
            status: 'DELIVERED',
            deliveredAt: new Date()
          }
        });
      }
      
      this.emit('notificationInteraction', { notificationId, interaction: interactionData });
    } catch (error) {
      this.logger.error('Failed to track interaction', { error, notificationId, interactionData });
    }
  }
  
  // Helper methods
  private async checkElderApproval(notificationData: PushNotificationData): Promise<boolean> {
    // Would implement Elder approval workflow
    return true; // Simplified for now
  }
  
  private async checkEmergencyAuthorization(notificationData: PushNotificationData): Promise<boolean> {
    // Would check emergency authorization
    return true; // Simplified for now
  }
  
  private async checkCeremonyStatus(): Promise<{ active: boolean; type?: string }> {
    // Would check ceremony calendar service
    return { active: false };
  }
  
  private getIndigenousGreeting(nation?: string, language?: string): string {
    const greetings: any = {
      'cree': 'Tansi',
      'ojibwe': 'Boozhoo',
      'mohawk': 'Sekoh',
      'default': 'Greetings'
    };
    
    return greetings[language || 'default'] || greetings.default;
  }
  
  private async optimizeNotificationImage(imageUrl: string): Promise<string> {
    // Would optimize image for push notifications
    // For now, return original URL
    return imageUrl;
  }
  
  private async getCulturalIcon(nation?: string): Promise<string> {
    // Would return nation-specific cultural icon
    return 'https://indigenous.ca/icons/default.png';
  }
  
  private isInQuietHours(start?: string, end?: string, timeZone?: string): boolean {
    if (!start || !end) return false;
    
    // Would implement quiet hours check based on timezone
    // Simplified for now
    return false;
  }
  
  private getDelayUntilAfterQuietHours(end: string, timeZone: string): number {
    // Would calculate delay until after quiet hours
    return 8 * 60 * 60 * 1000; // 8 hours default
  }
  
  private async trackIndigenousDelivery(notification: any): Promise<void> {
    // Track Indigenous-specific delivery metrics
    await redis.incr('indigenous:notifications:sent');
    
    if (notification.elderNotification) {
      await redis.incr('indigenous:notifications:elder:sent');
    }
    
    if (notification.ceremonyNotification) {
      await redis.incr('indigenous:notifications:ceremony:sent');
    }
    
    if (notification.emergencyNotification) {
      await redis.incr('indigenous:notifications:emergency:sent');
    }
  }
  
  // Public methods for service management
  public async getNotificationStats(): Promise<any> {
    return {
      totalNotifications: await prisma.pushNotification.count(),
      sentNotifications: await prisma.pushNotification.count({ where: { status: 'SENT' } }),
      deliveredNotifications: await prisma.pushNotification.count({ where: { status: 'DELIVERED' } }),
      clickedNotifications: await prisma.pushNotification.count({ where: { status: 'CLICKED' } }),
      failedNotifications: await prisma.pushNotification.count({ where: { status: 'FAILED' } }),
      indigenousNotifications: await prisma.pushNotification.count({ where: { indigenousNotification: true } }),
      elderNotifications: await prisma.pushNotification.count({ where: { elderNotification: true } }),
      ceremonyNotifications: await prisma.pushNotification.count({ where: { ceremonyNotification: true } }),
      emergencyNotifications: await prisma.pushNotification.count({ where: { emergencyNotification: true } })
    };
  }
  
  public async getNotificationById(notificationId: string): Promise<any> {
    return await prisma.pushNotification.findUnique({
      where: { id: notificationId },
      include: {
        device: true,
        interactions: true
      }
    });
  }
}