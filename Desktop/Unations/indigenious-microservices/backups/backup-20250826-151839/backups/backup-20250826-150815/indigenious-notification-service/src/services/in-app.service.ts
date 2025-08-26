import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { logger } from '../utils/logger';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

export interface InAppNotification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'rfq' | 'message' | 'indigenous';
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  image?: string;
  priority?: 'high' | 'normal' | 'low';
  isRead: boolean;
  isArchived: boolean;
  expiresAt?: Date;
  createdAt: Date;
  readAt?: Date;
  indigenousMetadata?: {
    language?: string;
    bandId?: string;
    culturalContext?: string;
  };
}

export interface NotificationPreferences {
  userId: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  categories: {
    rfq: boolean;
    messages: boolean;
    system: boolean;
    indigenous: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
  };
  language: string;
}

export class InAppNotificationService {
  private static io: Server;
  private static connectedUsers: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private static pubClient: Redis;
  private static subClient: Redis;
  private static readonly NOTIFICATION_CACHE_TTL = 86400; // 24 hours
  private static readonly MAX_NOTIFICATIONS_PER_USER = 100;

  /**
   * Initialize in-app notification service
   */
  static async initialize(io: Server): Promise<void> {
    try {
      this.io = io;

      // Setup Redis adapter for Socket.IO
      this.pubClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      });

      this.subClient = this.pubClient.duplicate();

      io.adapter(createAdapter(this.pubClient, this.subClient));

      // Setup Socket.IO event handlers
      this.setupSocketHandlers();

      // Setup Redis pub/sub for cross-server communication
      await this.setupRedisPubSub();

      logger.info('In-app notification service initialized');
    } catch (error) {
      logger.error('Failed to initialize in-app notification service', error);
      throw error;
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  private static setupSocketHandlers(): void {
    this.io.on('connection', async (socket: Socket) => {
      const userId = socket.handshake.auth.userId;
      
      if (!userId) {
        socket.disconnect();
        return;
      }

      // Add to connected users
      this.addConnectedUser(userId, socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Join band room if applicable
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { bandId: true },
      });

      if (user?.bandId) {
        socket.join(`band:${user.bandId}`);
      }

      // Send pending notifications
      await this.sendPendingNotifications(userId, socket);

      // Handle events
      socket.on('notification:read', async (notificationId: string) => {
        await this.markAsRead(notificationId, userId);
      });

      socket.on('notification:read-all', async () => {
        await this.markAllAsRead(userId);
      });

      socket.on('notification:archive', async (notificationId: string) => {
        await this.archiveNotification(notificationId, userId);
      });

      socket.on('notification:delete', async (notificationId: string) => {
        await this.deleteNotification(notificationId, userId);
      });

      socket.on('preferences:update', async (preferences: Partial<NotificationPreferences>) => {
        await this.updatePreferences(userId, preferences);
      });

      socket.on('disconnect', () => {
        this.removeConnectedUser(userId, socket.id);
      });

      logger.info(`User ${userId} connected for in-app notifications`);
    });
  }

  /**
   * Setup Redis pub/sub for cross-server communication
   */
  private static async setupRedisPubSub(): Promise<void> {
    const subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    await subscriber.subscribe('notifications');

    subscriber.on('message', async (channel, message) => {
      if (channel === 'notifications') {
        const notification = JSON.parse(message);
        await this.handleCrossServerNotification(notification);
      }
    });
  }

  /**
   * Send in-app notification
   */
  static async sendNotification(
    userId: string,
    notification: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead' | 'isArchived'>
  ): Promise<InAppNotification> {
    try {
      // Check user preferences
      const preferences = await this.getUserPreferences(userId);
      
      if (!preferences.inApp) {
        logger.info(`In-app notifications disabled for user ${userId}`);
        return null as any;
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        await this.queueNotificationForLater(userId, notification);
        return null as any;
      }

      // Create notification
      const fullNotification: InAppNotification = {
        id: uuidv4(),
        userId,
        ...notification,
        isRead: false,
        isArchived: false,
        createdAt: new Date(),
      };

      // Store in database
      await prisma.inAppNotification.create({
        data: fullNotification,
      });

      // Cache notification
      await this.cacheNotification(fullNotification);

      // Send to connected clients
      this.io.to(`user:${userId}`).emit('notification:new', fullNotification);

      // Publish to Redis for cross-server delivery
      await this.pubClient.publish('notifications', JSON.stringify({
        type: 'user',
        userId,
        notification: fullNotification,
      }));

      // Update unread count
      await this.updateUnreadCount(userId);

      logger.info(`In-app notification sent to user ${userId}`);

      return fullNotification;
    } catch (error) {
      logger.error('Failed to send in-app notification', error);
      throw error;
    }
  }

  /**
   * Send notification to band members
   */
  static async sendBandNotification(
    bandId: string,
    notification: Omit<InAppNotification, 'id' | 'userId' | 'createdAt' | 'isRead' | 'isArchived'>
  ): Promise<void> {
    try {
      // Get band members
      const members = await prisma.user.findMany({
        where: { bandId },
        select: { id: true },
      });

      // Send to each member
      for (const member of members) {
        await this.sendNotification(member.id, {
          ...notification,
          indigenousMetadata: {
            ...notification.indigenousMetadata,
            bandId,
          },
        });
      }

      // Broadcast to band room
      this.io.to(`band:${bandId}`).emit('notification:band', {
        ...notification,
        bandId,
      });

      logger.info(`Band notification sent to ${bandId}`);
    } catch (error) {
      logger.error('Failed to send band notification', error);
      throw error;
    }
  }

  /**
   * Send Indigenous-specific notification
   */
  static async sendIndigenousNotification(
    userId: string,
    notification: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead' | 'isArchived'> & {
      indigenousLanguage: string;
      culturalElements?: {
        greeting?: string;
        closing?: string;
        symbols?: string[];
      };
    }
  ): Promise<InAppNotification> {
    // Format with cultural elements
    const formattedNotification = {
      ...notification,
      type: 'indigenous' as const,
      title: this.formatIndigenousTitle(notification.title, notification.indigenousLanguage),
      body: this.formatIndigenousBody(
        notification.body,
        notification.indigenousLanguage,
        notification.culturalElements
      ),
      indigenousMetadata: {
        language: notification.indigenousLanguage,
        culturalContext: this.getCulturalContext(notification.indigenousLanguage),
      },
    };

    return this.sendNotification(userId, formattedNotification);
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    notifications: InAppNotification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {
        userId,
        isArchived: false,
      };

      if (options.unreadOnly) {
        where.isRead = false;
      }

      if (options.type) {
        where.type = options.type;
      }

      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = options.startDate;
        if (options.endDate) where.createdAt.lte = options.endDate;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.inAppNotification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.inAppNotification.count({ where }),
        prisma.inAppNotification.count({
          where: { userId, isRead: false, isArchived: false },
        }),
      ]);

      return {
        notifications: notifications as InAppNotification[],
        total,
        unreadCount,
      };
    } catch (error) {
      logger.error('Failed to get user notifications', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    try {
      await prisma.inAppNotification.update({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Update cache
      await this.updateCachedNotification(notificationId, { isRead: true, readAt: new Date() });

      // Update unread count
      await this.updateUnreadCount(userId);

      // Emit event
      this.io.to(`user:${userId}`).emit('notification:read', notificationId);

      logger.info(`Notification ${notificationId} marked as read`);
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      await prisma.inAppNotification.updateMany({
        where: {
          userId,
          isRead: false,
          isArchived: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Clear unread count
      await redis.set(`notifications:unread:${userId}`, '0');

      // Emit event
      this.io.to(`user:${userId}`).emit('notification:all-read');

      logger.info(`All notifications marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }

  /**
   * Archive notification
   */
  static async archiveNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    try {
      await prisma.inAppNotification.update({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      // Update unread count if necessary
      const notification = await prisma.inAppNotification.findUnique({
        where: { id: notificationId },
        select: { isRead: true },
      });

      if (!notification?.isRead) {
        await this.updateUnreadCount(userId);
      }

      // Emit event
      this.io.to(`user:${userId}`).emit('notification:archived', notificationId);

      logger.info(`Notification ${notificationId} archived`);
    } catch (error) {
      logger.error('Failed to archive notification', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    try {
      await prisma.inAppNotification.delete({
        where: {
          id: notificationId,
          userId,
        },
      });

      // Remove from cache
      await redis.del(`notification:${notificationId}`);

      // Update unread count
      await this.updateUnreadCount(userId);

      // Emit event
      this.io.to(`user:${userId}`).emit('notification:deleted', notificationId);

      logger.info(`Notification ${notificationId} deleted`);
    } catch (error) {
      logger.error('Failed to delete notification', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Check cache
      const cached = await redis.get(`preferences:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const preferences = await prisma.notificationPreferences.findUnique({
        where: { userId },
      });

      if (!preferences) {
        // Return default preferences
        const defaultPreferences: NotificationPreferences = {
          userId,
          inApp: true,
          email: true,
          sms: false,
          push: true,
          categories: {
            rfq: true,
            messages: true,
            system: true,
            indigenous: true,
          },
          language: 'en',
        };

        // Create default preferences
        await prisma.notificationPreferences.create({
          data: defaultPreferences,
        });

        return defaultPreferences;
      }

      // Cache preferences
      await redis.setex(
        `preferences:${userId}`,
        3600,
        JSON.stringify(preferences)
      );

      return preferences as NotificationPreferences;
    } catch (error) {
      logger.error('Failed to get user preferences', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const updated = await prisma.notificationPreferences.update({
        where: { userId },
        data: preferences,
      });

      // Update cache
      await redis.setex(
        `preferences:${userId}`,
        3600,
        JSON.stringify(updated)
      );

      // Emit event
      this.io.to(`user:${userId}`).emit('preferences:updated', updated);

      logger.info(`Preferences updated for user ${userId}`);

      return updated as NotificationPreferences;
    } catch (error) {
      logger.error('Failed to update preferences', error);
      throw error;
    }
  }

  /**
   * Send pending notifications
   */
  private static async sendPendingNotifications(
    userId: string,
    socket: Socket
  ): Promise<void> {
    try {
      const unreadNotifications = await prisma.inAppNotification.findMany({
        where: {
          userId,
          isRead: false,
          isArchived: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      if (unreadNotifications.length > 0) {
        socket.emit('notifications:pending', unreadNotifications);
      }

      // Send unread count
      const unreadCount = await prisma.inAppNotification.count({
        where: {
          userId,
          isRead: false,
          isArchived: false,
        },
      });

      socket.emit('notifications:unread-count', unreadCount);
    } catch (error) {
      logger.error('Failed to send pending notifications', error);
    }
  }

  /**
   * Handle cross-server notification
   */
  private static async handleCrossServerNotification(data: any): Promise<void> {
    if (data.type === 'user') {
      // Check if user is connected to this server
      const socketIds = this.connectedUsers.get(data.userId);
      if (socketIds && socketIds.size > 0) {
        this.io.to(`user:${data.userId}`).emit('notification:new', data.notification);
      }
    }
  }

  /**
   * Add connected user
   */
  private static addConnectedUser(userId: string, socketId: string): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);
  }

  /**
   * Remove connected user
   */
  private static removeConnectedUser(userId: string, socketId: string): void {
    const sockets = this.connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }

  /**
   * Check if in quiet hours
   */
  private static isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Handles overnight quiet hours
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Queue notification for later
   */
  private static async queueNotificationForLater(
    userId: string,
    notification: any
  ): Promise<void> {
    await redis.lpush(
      `notifications:queued:${userId}`,
      JSON.stringify({
        ...notification,
        queuedAt: new Date(),
      })
    );
  }

  /**
   * Cache notification
   */
  private static async cacheNotification(notification: InAppNotification): Promise<void> {
    await redis.setex(
      `notification:${notification.id}`,
      this.NOTIFICATION_CACHE_TTL,
      JSON.stringify(notification)
    );
  }

  /**
   * Update cached notification
   */
  private static async updateCachedNotification(
    notificationId: string,
    updates: Partial<InAppNotification>
  ): Promise<void> {
    const cached = await redis.get(`notification:${notificationId}`);
    if (cached) {
      const notification = JSON.parse(cached);
      const updated = { ...notification, ...updates };
      await redis.setex(
        `notification:${notificationId}`,
        this.NOTIFICATION_CACHE_TTL,
        JSON.stringify(updated)
      );
    }
  }

  /**
   * Update unread count
   */
  private static async updateUnreadCount(userId: string): Promise<void> {
    const count = await prisma.inAppNotification.count({
      where: {
        userId,
        isRead: false,
        isArchived: false,
      },
    });

    await redis.set(`notifications:unread:${userId}`, count.toString());
    
    this.io.to(`user:${userId}`).emit('notifications:unread-count', count);
  }

  /**
   * Format Indigenous title
   */
  private static formatIndigenousTitle(title: string, language: string): string {
    const symbols: Record<string, string> = {
      ojibwe: '>¶',
      cree: '>¶',
      inuktitut: '>¶',
      mikmaq: '>¶',
      mohawk: '>¶',
    };

    return `${symbols[language] || ''} ${title}`;
  }

  /**
   * Format Indigenous body
   */
  private static formatIndigenousBody(
    body: string,
    language: string,
    culturalElements?: any
  ): string {
    let formatted = body;

    if (culturalElements?.greeting) {
      formatted = `${culturalElements.greeting}\n\n${formatted}`;
    }

    if (culturalElements?.closing) {
      formatted = `${formatted}\n\n${culturalElements.closing}`;
    }

    return formatted;
  }

  /**
   * Get cultural context
   */
  private static getCulturalContext(language: string): string {
    const contexts: Record<string, string> = {
      ojibwe: 'Anishinaabe tradition',
      cree: 'Nêhiyaw tradition',
      inuktitut: 'Inuit tradition',
      mikmaq: "Mi'kmaq tradition",
      mohawk: 'Haudenosaunee tradition',
    };

    return contexts[language] || 'Indigenous tradition';
  }
}

export default InAppNotificationService;