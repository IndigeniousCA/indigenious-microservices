import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface PushNotificationOptions {
  tokens: string | string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  badge?: number;
  sound?: string | boolean;
  priority?: 'high' | 'normal';
  ttl?: number;
  collapseKey?: string;
  clickAction?: string;
  icon?: string;
  color?: string;
  tag?: string;
  requireInteraction?: boolean;
  isIndigenous?: boolean;
  language?: string;
}

export interface PushNotificationResult {
  messageId?: string;
  success: boolean;
  token: string;
  error?: string;
}

export interface MulticastResult {
  successCount: number;
  failureCount: number;
  results: PushNotificationResult[];
  failedTokens: string[];
}

export interface TopicNotificationOptions {
  topic: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  condition?: string;
  imageUrl?: string;
}

export class PushNotificationService {
  private static app: admin.app.App;
  private static messaging: admin.messaging.Messaging;
  private static readonly MAX_BATCH_SIZE = 500; // FCM limit
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 1000;
  private static readonly TOKEN_EXPIRY_DAYS = 60;

  /**
   * Initialize push notification service
   */
  static async initialize(): Promise<void> {
    try {
      // Initialize Firebase Admin
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
        './firebase-service-account.json';

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      this.messaging = admin.messaging();

      logger.info('Push notification service initialized');
    } catch (error) {
      logger.error('Failed to initialize push notification service', error);
      throw error;
    }
  }

  /**
   * Send push notification to single device
   */
  static async sendNotification(
    options: PushNotificationOptions
  ): Promise<PushNotificationResult> {
    try {
      const token = Array.isArray(options.tokens) ? options.tokens[0] : options.tokens;
      
      // Validate token
      if (!await this.validateToken(token)) {
        throw new Error('Invalid device token');
      }

      // Prepare message
      const message = this.prepareMessage(token, options);

      // Send notification
      const response = await this.messaging.send(message);

      // Log notification
      await this.logNotificationSent(token, options, response);

      return {
        messageId: response,
        success: true,
        token,
      };
    } catch (error: any) {
      logger.error('Failed to send push notification', error);
      
      // Handle token errors
      if (this.isTokenError(error)) {
        await this.handleInvalidToken(
          Array.isArray(options.tokens) ? options.tokens[0] : options.tokens
        );
      }

      return {
        success: false,
        token: Array.isArray(options.tokens) ? options.tokens[0] : options.tokens,
        error: error.message,
      };
    }
  }

  /**
   * Send multicast notification
   */
  static async sendMulticastNotification(
    options: PushNotificationOptions
  ): Promise<MulticastResult> {
    try {
      const tokens = Array.isArray(options.tokens) ? options.tokens : [options.tokens];
      
      // Validate tokens
      const validTokens = await this.validateTokens(tokens);
      
      if (validTokens.length === 0) {
        return {
          successCount: 0,
          failureCount: tokens.length,
          results: [],
          failedTokens: tokens,
        };
      }

      // Process in batches
      const results: PushNotificationResult[] = [];
      const failedTokens: string[] = [];
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < validTokens.length; i += this.MAX_BATCH_SIZE) {
        const batch = validTokens.slice(i, i + this.MAX_BATCH_SIZE);
        
        const message = this.prepareMulticastMessage(batch, options);
        const response = await this.messaging.sendEachForMulticast(message);

        // Process results
        response.responses.forEach((res, index) => {
          const token = batch[index];
          
          if (res.success) {
            successCount++;
            results.push({
              messageId: res.messageId,
              success: true,
              token,
            });
          } else {
            failureCount++;
            failedTokens.push(token);
            results.push({
              success: false,
              token,
              error: res.error?.message,
            });

            // Handle invalid token
            if (res.error && this.isTokenError(res.error)) {
              this.handleInvalidToken(token);
            }
          }
        });
      }

      // Log bulk notification
      await this.logBulkNotification(options, successCount, failureCount);

      return {
        successCount,
        failureCount,
        results,
        failedTokens,
      };
    } catch (error) {
      logger.error('Failed to send multicast notification', error);
      throw error;
    }
  }

  /**
   * Send notification to topic
   */
  static async sendTopicNotification(
    options: TopicNotificationOptions
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        topic: options.topic,
        notification: {
          title: options.title,
          body: options.body,
          imageUrl: options.imageUrl,
        },
        data: options.data,
      };

      // Add condition if provided
      if (options.condition) {
        delete message.topic;
        message.condition = options.condition;
      }

      const response = await this.messaging.send(message);

      // Log topic notification
      await this.logTopicNotification(options, response);

      return response;
    } catch (error) {
      logger.error('Failed to send topic notification', error);
      throw error;
    }
  }

  /**
   * Send Indigenous notification with cultural elements
   */
  static async sendIndigenousNotification(
    options: PushNotificationOptions & {
      indigenousLanguage: string;
      bandId?: string;
    }
  ): Promise<PushNotificationResult | MulticastResult> {
    try {
      // Add cultural elements
      const culturalTitle = this.addCulturalPrefix(options.title, options.indigenousLanguage);
      const culturalBody = this.formatIndigenousMessage(options.body, options.indigenousLanguage);

      // Add cultural data
      const culturalData = {
        ...options.data,
        indigenousLanguage: options.indigenousLanguage,
        culturalIdentifier: '🪶',
      };

      if (options.bandId) {
        culturalData.bandId = options.bandId;
      }

      // Send notification with cultural elements
      const modifiedOptions = {
        ...options,
        title: culturalTitle,
        body: culturalBody,
        data: culturalData,
        isIndigenous: true,
      };

      if (Array.isArray(options.tokens) && options.tokens.length > 1) {
        return this.sendMulticastNotification(modifiedOptions);
      } else {
        return this.sendNotification(modifiedOptions);
      }
    } catch (error) {
      logger.error('Failed to send Indigenous notification', error);
      throw error;
    }
  }

  /**
   * Subscribe tokens to topic
   */
  static async subscribeToTopic(
    tokens: string | string[],
    topic: string
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ token: string; error: string }>;
  }> {
    try {
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await this.messaging.subscribeToTopic(tokenArray, topic);

      const errors: Array<{ token: string; error: string }> = [];
      
      if (response.errors && response.errors.length > 0) {
        response.errors.forEach((error, index) => {
          errors.push({
            token: tokenArray[index],
            error: error.error.message,
          });
        });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors,
      };
    } catch (error) {
      logger.error('Failed to subscribe to topic', error);
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from topic
   */
  static async unsubscribeFromTopic(
    tokens: string | string[],
    topic: string
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ token: string; error: string }>;
  }> {
    try {
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      const response = await this.messaging.unsubscribeFromTopic(tokenArray, topic);

      const errors: Array<{ token: string; error: string }> = [];
      
      if (response.errors && response.errors.length > 0) {
        response.errors.forEach((error, index) => {
          errors.push({
            token: tokenArray[index],
            error: error.error.message,
          });
        });
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors,
      };
    } catch (error) {
      logger.error('Failed to unsubscribe from topic', error);
      throw error;
    }
  }

  /**
   * Register device token
   */
  static async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    deviceInfo?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.deviceToken.upsert({
        where: { token },
        update: {
          userId,
          platform,
          deviceInfo,
          lastActive: new Date(),
        },
        create: {
          id: uuidv4(),
          userId,
          token,
          platform,
          deviceInfo,
          isActive: true,
        },
      });

      // Cache token
      await redis.setex(
        `device-token:${userId}`,
        86400 * 30, // 30 days
        JSON.stringify({ token, platform })
      );

      logger.info('Device token registered', { userId, platform });
    } catch (error) {
      logger.error('Failed to register device token', error);
      throw error;
    }
  }

  /**
   * Prepare message for single device
   */
  private static prepareMessage(
    token: string,
    options: PushNotificationOptions
  ): admin.messaging.Message {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: options.title,
        body: options.body,
      },
      data: options.data,
    };

    // Add Android specific options
    if (options.priority || options.ttl || options.collapseKey) {
      message.android = {
        priority: options.priority === 'high' ? 'high' : 'normal',
        ttl: options.ttl ? options.ttl * 1000 : undefined,
        collapseKey: options.collapseKey,
        notification: {
          icon: options.icon,
          color: options.color,
          sound: options.sound === true ? 'default' : options.sound as string,
          tag: options.tag,
          imageUrl: options.imageUrl,
          clickAction: options.clickAction,
        },
      };
    }

    // Add iOS specific options
    if (options.badge !== undefined || options.sound) {
      message.apns = {
        payload: {
          aps: {
            badge: options.badge,
            sound: options.sound === true ? 'default' : options.sound as string,
            contentAvailable: true,
            mutableContent: true,
          },
        },
      };
    }

    // Add web specific options
    if (options.requireInteraction || options.icon) {
      message.webpush = {
        notification: {
          title: options.title,
          body: options.body,
          icon: options.icon,
          badge: options.icon,
          requireInteraction: options.requireInteraction,
          image: options.imageUrl,
          tag: options.tag,
        },
        fcmOptions: {
          link: options.clickAction,
        },
      };
    }

    return message;
  }

  /**
   * Prepare multicast message
   */
  private static prepareMulticastMessage(
    tokens: string[],
    options: PushNotificationOptions
  ): admin.messaging.MulticastMessage {
    const { tokens: _, ...messageOptions } = options;
    const baseMessage = this.prepareMessage('', messageOptions);
    const { token, ...messageWithoutToken } = baseMessage;

    return {
      ...messageWithoutToken,
      tokens,
    };
  }

  /**
   * Validate single token
   */
  private static async validateToken(token: string): Promise<boolean> {
    try {
      // Check if token exists in database
      const deviceToken = await prisma.deviceToken.findUnique({
        where: { token },
      });

      if (!deviceToken || !deviceToken.isActive) {
        return false;
      }

      // Check if token is not expired
      const lastActive = new Date(deviceToken.lastActive);
      const daysSinceActive = Math.floor(
        (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActive > this.TOKEN_EXPIRY_DAYS) {
        await this.handleInvalidToken(token);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate token', error);
      return false;
    }
  }

  /**
   * Validate multiple tokens
   */
  private static async validateTokens(tokens: string[]): Promise<string[]> {
    const validTokens: string[] = [];

    for (const token of tokens) {
      if (await this.validateToken(token)) {
        validTokens.push(token);
      }
    }

    return validTokens;
  }

  /**
   * Check if error is token-related
   */
  private static isTokenError(error: any): boolean {
    const tokenErrorCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
    ];

    return tokenErrorCodes.includes(error.code);
  }

  /**
   * Handle invalid token
   */
  private static async handleInvalidToken(token: string): Promise<void> {
    try {
      await prisma.deviceToken.update({
        where: { token },
        data: {
          isActive: false,
          invalidatedAt: new Date(),
        },
      });

      // Remove from cache
      const deviceToken = await prisma.deviceToken.findUnique({
        where: { token },
      });

      if (deviceToken) {
        await redis.del(`device-token:${deviceToken.userId}`);
      }

      logger.info('Invalid token handled', { token });
    } catch (error) {
      logger.error('Failed to handle invalid token', error);
    }
  }

  /**
   * Add cultural prefix
   */
  private static addCulturalPrefix(title: string, language: string): string {
    const prefixes: Record<string, string> = {
      ojibwe: '🪶 ',
      cree: '🪶 ',
      inuktitut: '🪶 ',
      mikmaq: '🪶 ',
      mohawk: '🪶 ',
    };

    return (prefixes[language] || '') + title;
  }

  /**
   * Format Indigenous message
   */
  private static formatIndigenousMessage(body: string, language: string): string {
    const greetings: Record<string, string> = {
      ojibwe: 'Boozhoo! ',
      cree: 'Tansi! ',
      inuktitut: 'ᐊᐃ! ',
      mikmaq: "Kwe'! ",
      mohawk: 'Shé:kon! ',
    };

    return (greetings[language] || '') + body;
  }

  /**
   * Log notification sent
   */
  private static async logNotificationSent(
    token: string,
    options: PushNotificationOptions,
    messageId: string
  ): Promise<void> {
    await prisma.pushNotificationLog.create({
      data: {
        messageId,
        token,
        title: options.title,
        body: options.body,
        data: options.data,
        platform: 'fcm',
        status: 'sent',
        isIndigenous: options.isIndigenous || false,
        language: options.language,
      },
    });
  }

  /**
   * Log bulk notification
   */
  private static async logBulkNotification(
    options: PushNotificationOptions,
    successCount: number,
    failureCount: number
  ): Promise<void> {
    await prisma.bulkNotificationLog.create({
      data: {
        title: options.title,
        body: options.body,
        totalRecipients: Array.isArray(options.tokens) ? options.tokens.length : 1,
        successCount,
        failureCount,
        isIndigenous: options.isIndigenous || false,
        language: options.language,
      },
    });
  }

  /**
   * Log topic notification
   */
  private static async logTopicNotification(
    options: TopicNotificationOptions,
    messageId: string
  ): Promise<void> {
    await prisma.topicNotificationLog.create({
      data: {
        messageId,
        topic: options.topic,
        title: options.title,
        body: options.body,
        data: options.data,
        condition: options.condition,
      },
    });
  }
}

export default PushNotificationService;