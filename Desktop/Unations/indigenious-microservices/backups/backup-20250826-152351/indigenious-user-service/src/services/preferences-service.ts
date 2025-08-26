import { query } from '../utils/database';
import { setCache, getCache, invalidateCache } from '../utils/redis';
import { logger } from '../utils/logger';

export class PreferencesService {
  async getPreferences(userId: string): Promise<any> {
    // Check cache first
    const cached = await getCache(`preferences:${userId}`);
    if (cached) {
      return cached;
    }

    const result = await query(
      `SELECT * FROM user_preferences WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      const defaultPrefs = await this.createDefaultPreferences(userId);
      return defaultPrefs;
    }

    const preferences = result.rows[0];
    
    // Cache for 10 minutes
    await setCache(`preferences:${userId}`, preferences, 600);
    
    return preferences;
  }

  async updatePreferences(userId: string, updates: any): Promise<any> {
    const allowedFields = [
      'theme', 'language', 'timezone', 'currency', 'date_format',
      'time_format', 'email_notifications', 'sms_notifications',
      'push_notifications', 'notification_frequency', 'dashboard_layout',
      'default_view', 'items_per_page', 'show_tooltips', 'accessibility_mode'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid preferences to update');
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(userId);

    const result = await query(
      `UPDATE user_preferences SET ${updateFields.join(', ')} 
       WHERE user_id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      // Create preferences if they don't exist
      const newPrefs = await this.createDefaultPreferences(userId, updates);
      return newPrefs;
    }

    // Invalidate cache
    await invalidateCache(`preferences:${userId}`);

    return result.rows[0];
  }

  async createDefaultPreferences(userId: string, overrides: any = {}): Promise<any> {
    const defaults = {
      theme: 'light',
      language: 'en',
      timezone: 'America/Toronto',
      currency: 'CAD',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '12h',
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: false,
      notificationFrequency: 'immediate',
      dashboardLayout: 'grid',
      defaultView: 'dashboard',
      itemsPerPage: 20,
      showTooltips: true,
      accessibilityMode: false,
      ...overrides
    };

    const result = await query(
      `INSERT INTO user_preferences (
        user_id, theme, language, timezone, currency,
        date_format, time_format, email_notifications,
        sms_notifications, push_notifications,
        notification_frequency, dashboard_layout,
        default_view, items_per_page, show_tooltips,
        accessibility_mode, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING *`,
      [
        userId,
        defaults.theme,
        defaults.language,
        defaults.timezone,
        defaults.currency,
        defaults.dateFormat,
        defaults.timeFormat,
        defaults.emailNotifications,
        defaults.smsNotifications,
        defaults.pushNotifications,
        defaults.notificationFrequency,
        defaults.dashboardLayout,
        defaults.defaultView,
        defaults.itemsPerPage,
        defaults.showTooltips,
        defaults.accessibilityMode
      ]
    );

    return result.rows[0];
  }

  async getNotificationSettings(userId: string): Promise<any> {
    const result = await query(
      `SELECT 
        email_notifications,
        sms_notifications,
        push_notifications,
        notification_frequency,
        notification_categories
       FROM user_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: false,
        notificationFrequency: 'immediate',
        notificationCategories: {
          rfqs: true,
          bids: true,
          messages: true,
          systemUpdates: false,
          marketing: false
        }
      };
    }

    return result.rows[0];
  }

  async updateNotificationSettings(userId: string, settings: any): Promise<any> {
    const result = await query(
      `UPDATE user_preferences SET
       email_notifications = COALESCE($1, email_notifications),
       sms_notifications = COALESCE($2, sms_notifications),
       push_notifications = COALESCE($3, push_notifications),
       notification_frequency = COALESCE($4, notification_frequency),
       notification_categories = COALESCE($5, notification_categories),
       updated_at = NOW()
       WHERE user_id = $6
       RETURNING 
        email_notifications,
        sms_notifications,
        push_notifications,
        notification_frequency,
        notification_categories`,
      [
        settings.emailNotifications,
        settings.smsNotifications,
        settings.pushNotifications,
        settings.notificationFrequency,
        settings.notificationCategories,
        userId
      ]
    );

    // Invalidate cache
    await invalidateCache(`preferences:${userId}`);

    return result.rows[0];
  }

  async getDashboardLayout(userId: string): Promise<any> {
    const result = await query(
      `SELECT 
        dashboard_layout,
        dashboard_widgets,
        widget_positions,
        default_view
       FROM user_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        layout: 'grid',
        widgets: ['stats', 'recent-rfqs', 'activities', 'notifications'],
        positions: {},
        defaultView: 'dashboard'
      };
    }

    return {
      layout: result.rows[0].dashboard_layout,
      widgets: result.rows[0].dashboard_widgets,
      positions: result.rows[0].widget_positions,
      defaultView: result.rows[0].default_view
    };
  }

  async updateDashboardLayout(userId: string, layout: any): Promise<any> {
    const result = await query(
      `UPDATE user_preferences SET
       dashboard_layout = COALESCE($1, dashboard_layout),
       dashboard_widgets = COALESCE($2, dashboard_widgets),
       widget_positions = COALESCE($3, widget_positions),
       default_view = COALESCE($4, default_view),
       updated_at = NOW()
       WHERE user_id = $5
       RETURNING 
        dashboard_layout,
        dashboard_widgets,
        widget_positions,
        default_view`,
      [
        layout.layout,
        layout.widgets,
        layout.positions,
        layout.defaultView,
        userId
      ]
    );

    // Invalidate cache
    await invalidateCache(`preferences:${userId}`);

    return result.rows[0];
  }
}