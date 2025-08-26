import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationPreferences {
  userId: string;
  email: {
    enabled: boolean;
    frequency?: 'instant' | 'daily' | 'weekly';
    categories?: string[];
  };
  sms: {
    enabled: boolean;
    phoneNumber?: string;
    categories?: string[];
    quietHours?: {
      start: string; // HH:MM
      end: string; // HH:MM
      timezone: string;
    };
  };
  push: {
    enabled: boolean;
    categories?: string[];
    sound?: boolean;
    vibration?: boolean;
  };
  inApp: {
    enabled: boolean;
    categories?: string[];
  };
  language: 'en' | 'fr';
  digestPreference?: 'none' | 'daily' | 'weekly';
  unsubscribeToken?: string;
}

export interface PreferenceCategory {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  channels: ('email' | 'sms' | 'push' | 'inApp')[];
  indigenous?: boolean; // Indigenous-specific category
}

export class PreferenceService {
  private static defaultCategories: PreferenceCategory[] = [
    {
      id: 'rfq_new',
      name: 'New RFQ Opportunities',
      description: 'Notifications about new RFQs matching your profile',
      defaultEnabled: true,
      channels: ['email', 'push', 'inApp'],
      indigenous: true,
    },
    {
      id: 'rfq_reminder',
      name: 'RFQ Deadlines',
      description: 'Reminders about upcoming RFQ deadlines',
      defaultEnabled: true,
      channels: ['email', 'sms', 'push'],
    },
    {
      id: 'bid_status',
      name: 'Bid Status Updates',
      description: 'Updates on your bid submissions',
      defaultEnabled: true,
      channels: ['email', 'push', 'inApp'],
    },
    {
      id: 'payment',
      name: 'Payment Notifications',
      description: 'Payment confirmations and updates',
      defaultEnabled: true,
      channels: ['email', 'sms'],
    },
    {
      id: 'document',
      name: 'Document Updates',
      description: 'Document verification and status updates',
      defaultEnabled: true,
      channels: ['email', 'inApp'],
    },
    {
      id: 'certification',
      name: 'Certification Reminders',
      description: 'Indigenous business certification updates',
      defaultEnabled: true,
      channels: ['email'],
      indigenous: true,
    },
    {
      id: 'marketing',
      name: 'Platform Updates',
      description: 'News and updates about the platform',
      defaultEnabled: false,
      channels: ['email'],
    },
    {
      id: 'security',
      name: 'Security Alerts',
      description: 'Important security notifications',
      defaultEnabled: true,
      channels: ['email', 'sms', 'push'],
    },
  ];

  /**
   * Initialize default preferences for new user
   */
  static async initializeUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Check if preferences already exist
      const existing = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (existing) {
        return this.formatPreferences(existing);
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          indigenousBusiness: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Determine default categories based on user type
      const enabledCategories = this.defaultCategories
        .filter(cat => {
          // Include Indigenous-specific categories only for Indigenous businesses
          if (cat.indigenous && !user.indigenousBusiness) {
            return false;
          }
          return cat.defaultEnabled;
        })
        .map(cat => cat.id);

      // Create default preferences
      const preferences = await prisma.notificationPreference.create({
        data: {
          id: uuidv4(),
          userId,
          emailEnabled: true,
          emailFrequency: 'instant',
          emailCategories: enabledCategories,
          smsEnabled: false,
          smsPhoneNumber: user.phone,
          smsCategories: enabledCategories.filter(cat => 
            this.defaultCategories.find(c => c.id === cat)?.channels.includes('sms')
          ),
          pushEnabled: true,
          pushCategories: enabledCategories.filter(cat =>
            this.defaultCategories.find(c => c.id === cat)?.channels.includes('push')
          ),
          pushSound: true,
          pushVibration: true,
          inAppEnabled: true,
          inAppCategories: enabledCategories,
          language: user.language || 'en',
          digestPreference: 'none',
          unsubscribeToken: uuidv4(),
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          timezone: 'America/Toronto',
        },
      });

      // Cache preferences
      await this.cachePreferences(userId, preferences);

      logger.info('User preferences initialized', { userId });
      return this.formatPreferences(preferences);
    } catch (error) {
      logger.error('Failed to initialize user preferences', error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      // Check cache
      const cached = await redis.get(`preferences:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (!preferences) {
        return null;
      }

      // Cache for 1 hour
      await this.cachePreferences(userId, preferences);

      return this.formatPreferences(preferences);
    } catch (error) {
      logger.error('Failed to get user preferences', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      // Build update data
      const updateData: any = {};

      if (updates.email) {
        if (updates.email.enabled !== undefined) updateData.emailEnabled = updates.email.enabled;
        if (updates.email.frequency) updateData.emailFrequency = updates.email.frequency;
        if (updates.email.categories) updateData.emailCategories = updates.email.categories;
      }

      if (updates.sms) {
        if (updates.sms.enabled !== undefined) updateData.smsEnabled = updates.sms.enabled;
        if (updates.sms.phoneNumber) updateData.smsPhoneNumber = updates.sms.phoneNumber;
        if (updates.sms.categories) updateData.smsCategories = updates.sms.categories;
        if (updates.sms.quietHours) {
          updateData.quietHoursStart = updates.sms.quietHours.start;
          updateData.quietHoursEnd = updates.sms.quietHours.end;
          updateData.timezone = updates.sms.quietHours.timezone;
        }
      }

      if (updates.push) {
        if (updates.push.enabled !== undefined) updateData.pushEnabled = updates.push.enabled;
        if (updates.push.categories) updateData.pushCategories = updates.push.categories;
        if (updates.push.sound !== undefined) updateData.pushSound = updates.push.sound;
        if (updates.push.vibration !== undefined) updateData.pushVibration = updates.push.vibration;
      }

      if (updates.inApp) {
        if (updates.inApp.enabled !== undefined) updateData.inAppEnabled = updates.inApp.enabled;
        if (updates.inApp.categories) updateData.inAppCategories = updates.inApp.categories;
      }

      if (updates.language) updateData.language = updates.language;
      if (updates.digestPreference) updateData.digestPreference = updates.digestPreference;

      // Update in database
      const preferences = await prisma.notificationPreference.update({
        where: { userId },
        data: updateData,
      });

      // Clear cache
      await redis.del(`preferences:${userId}`);

      // Re-cache
      await this.cachePreferences(userId, preferences);

      logger.info('User preferences updated', { userId });
      return this.formatPreferences(preferences);
    } catch (error) {
      logger.error('Failed to update user preferences', error);
      throw error;
    }
  }

  /**
   * Check if user should receive notification
   */
  static async shouldNotify(
    userId: string,
    channel: 'email' | 'sms' | 'push' | 'inApp',
    category: string
  ): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) {
        // No preferences set, use defaults
        return true;
      }

      // Check channel enabled
      const channelEnabled = preferences[channel]?.enabled || false;
      if (!channelEnabled) {
        return false;
      }

      // Check category enabled
      const categories = preferences[channel]?.categories || [];
      if (!categories.includes(category)) {
        return false;
      }

      // Check quiet hours for SMS
      if (channel === 'sms' && preferences.sms.quietHours) {
        const inQuietHours = this.isInQuietHours(
          preferences.sms.quietHours.start,
          preferences.sms.quietHours.end,
          preferences.sms.quietHours.timezone
        );
        if (inQuietHours) {
          logger.info('Notification delayed due to quiet hours', { userId, category });
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Failed to check notification preference', error);
      // Default to sending if error
      return true;
    }
  }

  /**
   * Unsubscribe user
   */
  static async unsubscribe(token: string, categories?: string[]): Promise<void> {
    try {
      const preferences = await prisma.notificationPreference.findFirst({
        where: { unsubscribeToken: token },
      });

      if (!preferences) {
        throw new Error('Invalid unsubscribe token');
      }

      if (categories && categories.length > 0) {
        // Unsubscribe from specific categories
        const emailCategories = preferences.emailCategories.filter(
          cat => !categories.includes(cat)
        );
        const smsCategories = preferences.smsCategories.filter(
          cat => !categories.includes(cat)
        );
        const pushCategories = preferences.pushCategories.filter(
          cat => !categories.includes(cat)
        );

        await prisma.notificationPreference.update({
          where: { id: preferences.id },
          data: {
            emailCategories,
            smsCategories,
            pushCategories,
          },
        });
      } else {
        // Unsubscribe from all
        await prisma.notificationPreference.update({
          where: { id: preferences.id },
          data: {
            emailEnabled: false,
            smsEnabled: false,
            pushEnabled: false,
            inAppEnabled: false,
          },
        });
      }

      // Clear cache
      await redis.del(`preferences:${preferences.userId}`);

      logger.info('User unsubscribed', { userId: preferences.userId, categories });
    } catch (error) {
      logger.error('Failed to unsubscribe', error);
      throw error;
    }
  }

  /**
   * Get notification categories
   */
  static getCategories(userType?: 'indigenous' | 'government' | 'supplier'): PreferenceCategory[] {
    if (userType === 'indigenous') {
      return this.defaultCategories;
    }
    
    // Filter out Indigenous-specific categories for non-Indigenous users
    return this.defaultCategories.filter(cat => !cat.indigenous);
  }

  /**
   * Get users for notification category
   */
  static async getUsersForCategory(
    category: string,
    channel: 'email' | 'sms' | 'push' | 'inApp'
  ): Promise<string[]> {
    try {
      const columnMap = {
        email: 'emailCategories',
        sms: 'smsCategories',
        push: 'pushCategories',
        inApp: 'inAppCategories',
      };

      const enabledColumn = `${channel}Enabled`;
      const categoriesColumn = columnMap[channel];

      const preferences = await prisma.notificationPreference.findMany({
        where: {
          [enabledColumn]: true,
          [categoriesColumn]: {
            has: category,
          },
        },
        select: {
          userId: true,
        },
      });

      return preferences.map(p => p.userId);
    } catch (error) {
      logger.error('Failed to get users for category', error);
      return [];
    }
  }

  /**
   * Create digest for user
   */
  static async createDigest(
    userId: string,
    period: 'daily' | 'weekly'
  ): Promise<any> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences || preferences.digestPreference === 'none') {
        return null;
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (period === 'daily') {
        startDate.setDate(startDate.getDate() - 1);
      } else {
        startDate.setDate(startDate.getDate() - 7);
      }

      // Get notifications for period
      const notifications = await prisma.notification.findMany({
        where: {
          recipients: {
            has: userId,
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (notifications.length === 0) {
        return null;
      }

      // Group by category
      const grouped = notifications.reduce((acc, notif) => {
        const category = notif.metadata?.category || 'general';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(notif);
        return acc;
      }, {} as Record<string, any[]>);

      return {
        userId,
        period,
        startDate,
        endDate,
        totalNotifications: notifications.length,
        categories: grouped,
      };
    } catch (error) {
      logger.error('Failed to create digest', error);
      throw error;
    }
  }

  /**
   * Format preferences for API response
   */
  private static formatPreferences(prefs: any): NotificationPreferences {
    return {
      userId: prefs.userId,
      email: {
        enabled: prefs.emailEnabled,
        frequency: prefs.emailFrequency,
        categories: prefs.emailCategories,
      },
      sms: {
        enabled: prefs.smsEnabled,
        phoneNumber: prefs.smsPhoneNumber,
        categories: prefs.smsCategories,
        quietHours: prefs.quietHoursStart ? {
          start: prefs.quietHoursStart,
          end: prefs.quietHoursEnd,
          timezone: prefs.timezone,
        } : undefined,
      },
      push: {
        enabled: prefs.pushEnabled,
        categories: prefs.pushCategories,
        sound: prefs.pushSound,
        vibration: prefs.pushVibration,
      },
      inApp: {
        enabled: prefs.inAppEnabled,
        categories: prefs.inAppCategories,
      },
      language: prefs.language,
      digestPreference: prefs.digestPreference,
      unsubscribeToken: prefs.unsubscribeToken,
    };
  }

  /**
   * Cache preferences
   */
  private static async cachePreferences(userId: string, prefs: any): Promise<void> {
    const formatted = this.formatPreferences(prefs);
    await redis.setex(
      `preferences:${userId}`,
      3600, // 1 hour
      JSON.stringify(formatted)
    );
  }

  /**
   * Check if current time is in quiet hours
   */
  private static isInQuietHours(
    start: string,
    end: string,
    timezone: string
  ): boolean {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      
      const currentTime = formatter.format(now);
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      const currentMinutes = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = start.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;

      const [endHour, endMinute] = end.split(':').map(Number);
      const endMinutes = endHour * 60 + endMinute;

      // Handle overnight quiet hours
      if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } catch (error) {
      logger.error('Failed to check quiet hours', error);
      return false;
    }
  }

  /**
   * Migrate preferences for Indigenous businesses
   */
  static async migrateIndigenousPreferences(): Promise<void> {
    try {
      // Get all Indigenous businesses
      const businesses = await prisma.indigenousBusiness.findMany({
        select: { userId: true },
      });

      for (const business of businesses) {
        const preferences = await this.getUserPreferences(business.userId);
        
        if (preferences) {
          // Add Indigenous-specific categories
          const indigenousCategories = this.defaultCategories
            .filter(cat => cat.indigenous)
            .map(cat => cat.id);

          const emailCategories = [
            ...new Set([...preferences.email.categories || [], ...indigenousCategories])
          ];

          await this.updateUserPreferences(business.userId, {
            email: {
              ...preferences.email,
              categories: emailCategories,
            },
          });
        }
      }

      logger.info('Indigenous preferences migrated');
    } catch (error) {
      logger.error('Failed to migrate Indigenous preferences', error);
    }
  }
}

export default PreferenceService;