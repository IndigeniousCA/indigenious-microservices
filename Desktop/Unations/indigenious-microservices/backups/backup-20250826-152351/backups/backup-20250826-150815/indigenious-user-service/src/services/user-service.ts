import { query, transaction } from '../utils/database';
import { getRedis, setCache, getCache, invalidateCache } from '../utils/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export class UserService {
  async getUserById(userId: string): Promise<any> {
    // Check cache first
    const cached = await getCache(`user:${userId}`);
    if (cached) {
      return cached;
    }

    const result = await query(
      `SELECT u.*, p.* FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];
    
    // Cache for 5 minutes
    await setCache(`user:${userId}`, user, 300);
    
    return user;
  }

  async createUser(userData: any): Promise<any> {
    return transaction(async (client) => {
      // Create user
      const userId = uuidv4();
      const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null;
      
      const userResult = await client.query(
        `INSERT INTO users (
          id, email, password_hash, role, type, status, 
          email_verified, phone_verified, mfa_enabled,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          userId,
          userData.email,
          hashedPassword,
          userData.role || 'individual',
          userData.type || 'individual',
          'pending',
          false,
          false,
          false
        ]
      );

      // Create profile
      await client.query(
        `INSERT INTO user_profiles (
          user_id, first_name, last_name, display_name,
          primary_language, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          userId,
          userData.firstName,
          userData.lastName,
          `${userData.firstName} ${userData.lastName}`,
          userData.language || 'en'
        ]
      );

      // Create default preferences
      await client.query(
        `INSERT INTO user_preferences (
          user_id, theme, language, timezone, currency,
          email_notifications, sms_notifications, push_notifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          'light',
          userData.language || 'en',
          userData.timezone || 'America/Toronto',
          'CAD',
          true,
          false,
          false
        ]
      );

      return userResult.rows[0];
    });
  }

  async updateUser(userId: string, updates: any): Promise<any> {
    const allowedFields = ['email', 'phone', 'role', 'type', 'status'];
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(userId);

    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Invalidate cache
    await invalidateCache(`user:${userId}`);

    return result.rows[0];
  }

  async deleteUser(userId: string): Promise<void> {
    return transaction(async (client) => {
      // Soft delete - mark as deleted
      await client.query(
        `UPDATE users SET 
         status = 'deactivated',
         deleted_at = NOW(),
         updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      // Anonymize personal data
      await client.query(
        `UPDATE user_profiles SET
         first_name = 'Deleted',
         last_name = 'User',
         display_name = 'Deleted User',
         email = NULL,
         phone = NULL,
         avatar = NULL,
         bio = NULL,
         updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // Invalidate all sessions
      const redis = getRedis();
      const sessions = await redis.keys(`session:*:${userId}`);
      if (sessions.length > 0) {
        await redis.del(...sessions);
      }

      // Invalidate cache
      await invalidateCache(`user:${userId}`);
    });
  }

  async searchUsers(params: any): Promise<any> {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (params.query) {
      whereClause += ` AND (
        u.email ILIKE $${paramCount} OR 
        p.first_name ILIKE $${paramCount} OR 
        p.last_name ILIKE $${paramCount} OR
        p.display_name ILIKE $${paramCount}
      )`;
      values.push(`%${params.query}%`);
      paramCount++;
    }

    if (params.role) {
      whereClause += ` AND u.role = $${paramCount}`;
      values.push(params.role);
      paramCount++;
    }

    if (params.type) {
      whereClause += ` AND u.type = $${paramCount}`;
      values.push(params.type);
      paramCount++;
    }

    if (params.status) {
      whereClause += ` AND u.status = $${paramCount}`;
      values.push(params.status);
      paramCount++;
    }

    values.push(params.limit, params.offset);

    const result = await query(
      `SELECT 
        u.id, u.email, u.role, u.type, u.status,
        p.first_name, p.last_name, p.display_name, p.avatar,
        u.created_at, u.last_active_at
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       ${whereClause}`,
      values.slice(0, -2)
    );

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: params.limit,
      offset: params.offset
    };
  }

  async listUsers(params: any): Promise<any> {
    const { limit, offset, sortBy, order } = params;
    const allowedSortFields = ['createdAt', 'lastActiveAt', 'email', 'firstName', 'lastName'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT 
        u.id, u.email, u.role, u.type, u.status,
        u.email_verified, u.phone_verified, u.mfa_enabled,
        p.first_name, p.last_name, p.display_name, p.avatar,
        u.created_at, u.updated_at, u.last_active_at
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.deleted_at IS NULL
       ORDER BY u.${sortField} ${sortOrder}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`
    );

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  async suspendUser(userId: string, reason: string, duration?: number, adminId?: string): Promise<void> {
    const suspendUntil = duration 
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null;

    await transaction(async (client) => {
      // Update user status
      await client.query(
        `UPDATE users SET 
         status = 'suspended',
         suspended_until = $1,
         suspended_reason = $2,
         suspended_by = $3,
         updated_at = NOW()
         WHERE id = $4`,
        [suspendUntil, reason, adminId, userId]
      );

      // Log the action
      await client.query(
        `INSERT INTO user_actions_log (
          user_id, action, performed_by, reason, created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [userId, 'suspend', adminId, reason]
      );

      // Invalidate all sessions
      const redis = getRedis();
      const sessions = await redis.keys(`session:*:${userId}`);
      if (sessions.length > 0) {
        await redis.del(...sessions);
      }

      // Invalidate cache
      await invalidateCache(`user:${userId}`);
    });
  }

  async reactivateUser(userId: string, adminId?: string): Promise<void> {
    await transaction(async (client) => {
      // Update user status
      await client.query(
        `UPDATE users SET 
         status = 'active',
         suspended_until = NULL,
         suspended_reason = NULL,
         suspended_by = NULL,
         updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      // Log the action
      await client.query(
        `INSERT INTO user_actions_log (
          user_id, action, performed_by, created_at
        ) VALUES ($1, $2, $3, NOW())`,
        [userId, 'reactivate', adminId]
      );

      // Invalidate cache
      await invalidateCache(`user:${userId}`);
    });
  }

  async updatePrivacySettings(userId: string, settings: any): Promise<any> {
    const result = await query(
      `UPDATE user_privacy_settings SET
       profile_visibility = COALESCE($1, profile_visibility),
       show_email = COALESCE($2, show_email),
       show_phone = COALESCE($3, show_phone),
       show_location = COALESCE($4, show_location),
       allow_messages = COALESCE($5, allow_messages),
       allow_connection_requests = COALESCE($6, allow_connection_requests),
       updated_at = NOW()
       WHERE user_id = $7
       RETURNING *`,
      [
        settings.profileVisibility,
        settings.showEmail,
        settings.showPhone,
        settings.showLocation,
        settings.allowMessages,
        settings.allowConnectionRequests,
        userId
      ]
    );

    if (result.rows.length === 0) {
      // Create default privacy settings
      const insertResult = await query(
        `INSERT INTO user_privacy_settings (
          user_id, profile_visibility, show_email, show_phone,
          show_location, allow_messages, allow_connection_requests
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          userId,
          settings.profileVisibility || 'registered',
          settings.showEmail ?? true,
          settings.showPhone ?? false,
          settings.showLocation ?? true,
          settings.allowMessages ?? true,
          settings.allowConnectionRequests ?? true
        ]
      );
      return insertResult.rows[0];
    }

    return result.rows[0];
  }

  async exportUserData(userId: string): Promise<any> {
    // GDPR compliance - export all user data
    const userData = await query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    const profileData = await query(
      `SELECT * FROM user_profiles WHERE user_id = $1`,
      [userId]
    );

    const preferencesData = await query(
      `SELECT * FROM user_preferences WHERE user_id = $1`,
      [userId]
    );

    const privacyData = await query(
      `SELECT * FROM user_privacy_settings WHERE user_id = $1`,
      [userId]
    );

    const activityData = await query(
      `SELECT * FROM user_activity_log WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return {
      user: userData.rows[0],
      profile: profileData.rows[0],
      preferences: preferencesData.rows[0],
      privacy: privacyData.rows[0],
      activity: activityData.rows,
      exportedAt: new Date().toISOString()
    };
  }
}