import { query, transaction } from '../utils/database';
import { setCache, getCache, invalidateCache } from '../utils/redis';
import { sendNotification, sendBulkNotifications } from '../utils/notifications';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../middleware/error-handler';

export interface InvitationCriteria {
  industries?: string[];
  skills?: string[];
  location?: {
    province?: string;
    city?: string;
    radius?: number; // km
  };
  business_size?: string[];
  indigenous_only?: boolean;
  verified_only?: boolean;
  min_rating?: number;
  exclude_businesses?: string[];
}

export class InvitationService {
  async inviteBusinessesToRFQ(
    rfqId: string, 
    criteria: InvitationCriteria, 
    invitedBy: string,
    customMessage?: string
  ): Promise<any> {
    // Verify RFQ exists and user has permission
    const rfqResult = await query(
      `SELECT * FROM rfqs WHERE id = $1 AND status = 'open'`,
      [rfqId]
    );

    if (rfqResult.rows.length === 0) {
      throw new NotFoundError('RFQ not found or not open for invitations');
    }

    const rfq = rfqResult.rows[0];
    
    if (rfq.created_by !== invitedBy) {
      throw new ForbiddenError('Only RFQ owner can send invitations');
    }

    // Find matching businesses
    const businesses = await this.findBusinessesByCriteria(criteria);
    
    if (businesses.length === 0) {
      throw new ValidationError('No businesses match the specified criteria');
    }

    return transaction(async (client) => {
      const invitationBatch = [];
      const notifications = [];

      for (const business of businesses) {
        const invitationId = uuidv4();
        
        // Create invitation record
        await client.query(
          `INSERT INTO rfq_invitations (
            id, rfq_id, business_id, invited_by, custom_message,
            status, invited_at, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '7 days')`,
          [
            invitationId, rfqId, business.id, invitedBy, 
            customMessage, 'sent'
          ]
        );

        invitationBatch.push({
          id: invitationId,
          business_id: business.id,
          business_name: business.business_name
        });

        // Prepare notification
        notifications.push({
          type: 'rfq.invitation',
          recipients: [business.owner_id],
          data: {
            rfqId,
            rfqTitle: rfq.title,
            invitationId,
            customMessage,
            closingDate: rfq.closing_date,
            budgetRange: {
              min: rfq.budget_min,
              max: rfq.budget_max
            }
          },
          priority: 'normal' as const
        });
      }

      // Update RFQ analytics
      await client.query(
        `UPDATE rfq_analytics 
         SET invitations_sent = invitations_sent + $1,
             updated_at = NOW()
         WHERE rfq_id = $2`,
        [businesses.length, rfqId]
      );

      // Send notifications in bulk
      if (notifications.length > 0) {
        await sendBulkNotifications(notifications);
      }

      return {
        rfq_id: rfqId,
        invitations_sent: businesses.length,
        businesses: invitationBatch
      };
    });
  }

  async sendDirectInvitation(
    rfqId: string,
    businessId: string,
    invitedBy: string,
    customMessage?: string
  ): Promise<any> {
    // Verify RFQ and permissions
    const rfqResult = await query(
      `SELECT * FROM rfqs WHERE id = $1 AND status = 'open'`,
      [rfqId]
    );

    if (rfqResult.rows.length === 0) {
      throw new NotFoundError('RFQ not found or not open');
    }

    const rfq = rfqResult.rows[0];
    
    if (rfq.created_by !== invitedBy) {
      throw new ForbiddenError('Only RFQ owner can send invitations');
    }

    // Check if business exists
    const businessResult = await query(
      `SELECT b.*, u.id as owner_id FROM businesses b 
       LEFT JOIN user_businesses ub ON b.id = ub.business_id AND ub.is_primary = true
       LEFT JOIN users u ON ub.user_id = u.id
       WHERE b.id = $1 AND b.status != 'deleted'`,
      [businessId]
    );

    if (businessResult.rows.length === 0) {
      throw new NotFoundError('Business not found');
    }

    const business = businessResult.rows[0];

    // Check if already invited
    const existingInvitation = await query(
      `SELECT id FROM rfq_invitations 
       WHERE rfq_id = $1 AND business_id = $2 AND status != 'expired'`,
      [rfqId, businessId]
    );

    if (existingInvitation.rows.length > 0) {
      throw new ConflictError('Business has already been invited to this RFQ');
    }

    const invitationId = uuidv4();

    await query(
      `INSERT INTO rfq_invitations (
        id, rfq_id, business_id, invited_by, custom_message,
        status, invited_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '7 days')`,
      [invitationId, rfqId, businessId, invitedBy, customMessage, 'sent']
    );

    // Send notification
    await sendNotification({
      type: 'rfq.invitation',
      recipients: [business.owner_id],
      data: {
        rfqId,
        rfqTitle: rfq.title,
        invitationId,
        customMessage,
        closingDate: rfq.closing_date,
        budgetRange: {
          min: rfq.budget_min,
          max: rfq.budget_max
        }
      },
      priority: 'normal'
    });

    return {
      invitation_id: invitationId,
      rfq_id: rfqId,
      business_id: businessId,
      business_name: business.business_name,
      invited_at: new Date()
    };
  }

  async respondToInvitation(
    invitationId: string,
    response: 'accepted' | 'declined',
    businessId: string,
    message?: string
  ): Promise<any> {
    const invitationResult = await query(
      `SELECT i.*, r.title as rfq_title, r.created_by as rfq_owner
       FROM rfq_invitations i
       LEFT JOIN rfqs r ON i.rfq_id = r.id
       WHERE i.id = $1 AND i.business_id = $2`,
      [invitationId, businessId]
    );

    if (invitationResult.rows.length === 0) {
      throw new NotFoundError('Invitation not found');
    }

    const invitation = invitationResult.rows[0];

    if (invitation.status !== 'sent') {
      throw new ConflictError('Invitation has already been responded to or expired');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new ConflictError('Invitation has expired');
    }

    const result = await query(
      `UPDATE rfq_invitations 
       SET status = $1,
           response_message = $2,
           responded_at = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [response, message, invitationId]
    );

    // Update RFQ analytics if accepted
    if (response === 'accepted') {
      await query(
        `UPDATE rfq_analytics 
         SET interested_count = interested_count + 1,
             updated_at = NOW()
         WHERE rfq_id = $1`,
        [invitation.rfq_id]
      );

      // Create interest record
      await query(
        `INSERT INTO rfq_interests (rfq_id, business_id, source, created_at)
         VALUES ($1, $2, 'invitation', NOW())
         ON CONFLICT (rfq_id, business_id) DO NOTHING`,
        [invitation.rfq_id, businessId]
      );
    }

    // Notify RFQ owner
    await sendNotification({
      type: `rfq.invitation_${response}`,
      recipients: [invitation.rfq_owner],
      data: {
        rfqId: invitation.rfq_id,
        rfqTitle: invitation.rfq_title,
        businessId,
        response,
        responseMessage: message
      },
      priority: 'normal'
    });

    return result.rows[0];
  }

  async getInvitationsForRFQ(rfqId: string, userId: string): Promise<any[]> {
    // Verify user owns the RFQ
    const rfqResult = await query(
      `SELECT created_by FROM rfqs WHERE id = $1`,
      [rfqId]
    );

    if (rfqResult.rows.length === 0) {
      throw new NotFoundError('RFQ not found');
    }

    if (rfqResult.rows[0].created_by !== userId) {
      throw new ForbiddenError('You can only view invitations for your own RFQs');
    }

    const result = await query(
      `SELECT i.*, b.business_name, b.indigenous_owned
       FROM rfq_invitations i
       LEFT JOIN businesses b ON i.business_id = b.id
       WHERE i.rfq_id = $1
       ORDER BY i.invited_at DESC`,
      [rfqId]
    );

    return result.rows;
  }

  async getInvitationsForBusiness(businessId: string, status?: string): Promise<any[]> {
    let whereClause = 'i.business_id = $1';
    let params: any[] = [businessId];

    if (status) {
      whereClause += ' AND i.status = $2';
      params.push(status);
    }

    const result = await query(
      `SELECT i.*, r.title as rfq_title, r.closing_date, r.budget_min, r.budget_max,
        r.category, r.indigenous_only
       FROM rfq_invitations i
       LEFT JOIN rfqs r ON i.rfq_id = r.id
       WHERE ${whereClause}
       ORDER BY i.invited_at DESC`,
      params
    );

    return result.rows;
  }

  async getInvitationStatistics(rfqId?: string, businessId?: string): Promise<any> {
    let whereClause = '1=1';
    let params: any[] = [];

    if (rfqId) {
      whereClause += ' AND i.rfq_id = $1';
      params.push(rfqId);
    }

    if (businessId) {
      whereClause += ` AND i.business_id = $${params.length + 1}`;
      params.push(businessId);
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total_invitations,
        COUNT(CASE WHEN i.status = 'sent' THEN 1 END) as pending_invitations,
        COUNT(CASE WHEN i.status = 'accepted' THEN 1 END) as accepted_invitations,
        COUNT(CASE WHEN i.status = 'declined' THEN 1 END) as declined_invitations,
        COUNT(CASE WHEN i.status = 'expired' THEN 1 END) as expired_invitations,
        ROUND(
          COUNT(CASE WHEN i.status = 'accepted' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN i.status IN ('accepted', 'declined') THEN 1 END), 0), 
          2
        ) as acceptance_rate
       FROM rfq_invitations i
       WHERE ${whereClause}`,
      params
    );

    return result.rows[0];
  }

  private async findBusinessesByCriteria(criteria: InvitationCriteria): Promise<any[]> {
    let whereConditions = ['b.status = $1'];
    let queryParams: any[] = ['verified'];
    let paramCount = 2;

    // Base query with joins
    let query_text = `
      SELECT DISTINCT b.id, b.business_name, b.indigenous_owned, ub.user_id as owner_id
      FROM businesses b
      LEFT JOIN user_businesses ub ON b.id = ub.business_id AND ub.is_primary = true
      LEFT JOIN business_addresses ba ON b.id = ba.business_id AND ba.is_primary = true
      LEFT JOIN business_industries bi ON b.id = bi.business_id
      LEFT JOIN business_skills bs ON b.id = bs.business_id
    `;

    // Industry filter
    if (criteria.industries && criteria.industries.length > 0) {
      whereConditions.push(`bi.industry_code = ANY($${paramCount})`);
      queryParams.push(criteria.industries);
      paramCount++;
    }

    // Skills filter
    if (criteria.skills && criteria.skills.length > 0) {
      whereConditions.push(`bs.skill_name = ANY($${paramCount})`);
      queryParams.push(criteria.skills);
      paramCount++;
    }

    // Location filters
    if (criteria.location) {
      if (criteria.location.province) {
        whereConditions.push(`ba.province = $${paramCount}`);
        queryParams.push(criteria.location.province);
        paramCount++;
      }
      
      if (criteria.location.city) {
        whereConditions.push(`ba.city = $${paramCount}`);
        queryParams.push(criteria.location.city);
        paramCount++;
      }
    }

    // Indigenous only filter
    if (criteria.indigenous_only) {
      whereConditions.push(`b.indigenous_owned = true`);
    }

    // Verified only filter (already included in base condition)
    if (criteria.verified_only) {
      whereConditions.push(`b.verification_status = 'verified'`);
    }

    // Exclude specific businesses
    if (criteria.exclude_businesses && criteria.exclude_businesses.length > 0) {
      whereConditions.push(`b.id != ALL($${paramCount})`);
      queryParams.push(criteria.exclude_businesses);
      paramCount++;
    }

    const fullQuery = `
      ${query_text}
      WHERE ${whereConditions.join(' AND ')}
      LIMIT 100
    `;

    const result = await query(fullQuery, queryParams);
    return result.rows;
  }

  async expireOldInvitations(): Promise<number> {
    const result = await query(
      `UPDATE rfq_invitations 
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'sent' AND expires_at < NOW()
       RETURNING id`,
      []
    );

    logger.info(`Expired ${result.rows.length} old invitations`);
    return result.rows.length;
  }

  async getTopInvitedBusinesses(limit: number = 10): Promise<any[]> {
    const result = await query(
      `SELECT b.business_name, b.indigenous_owned,
        COUNT(i.id) as total_invitations,
        COUNT(CASE WHEN i.status = 'accepted' THEN 1 END) as accepted_count,
        ROUND(
          COUNT(CASE WHEN i.status = 'accepted' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN i.status IN ('accepted', 'declined') THEN 1 END), 0), 
          2
        ) as acceptance_rate
       FROM businesses b
       LEFT JOIN rfq_invitations i ON b.id = i.business_id
       WHERE i.id IS NOT NULL
       GROUP BY b.id, b.business_name, b.indigenous_owned
       ORDER BY total_invitations DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }
}