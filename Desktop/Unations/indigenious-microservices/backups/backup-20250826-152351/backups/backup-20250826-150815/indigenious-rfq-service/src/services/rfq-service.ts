import { query, transaction } from '../utils/database';
import { cacheRFQ, getCachedRFQ, invalidateRFQCache, getCachedRFQMatches, cacheRFQMatches } from '../utils/redis';
import { indexRFQ, searchRFQs, findMatchingRFQs } from '../utils/elasticsearch';
import { notifyNewRFQ, notifyRFQClosure, notifyRFQDeadlineReminder } from '../utils/notifications';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';
import moment from 'moment';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../middleware/error-handler';

export interface RFQData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location: {
    address: string;
    city: string;
    province: string;
    postal_code: string;
    latitude?: number;
    longitude?: number;
  };
  budget_min?: number;
  budget_max?: number;
  timeline_days: number;
  skills_required?: string[];
  requirements?: string;
  deliverables?: string;
  evaluation_criteria?: string;
  indigenous_only?: boolean;
  closing_date: Date;
  documents?: {
    name: string;
    url: string;
    type: string;
  }[];
  contact_info: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface RFQFilters {
  category?: string;
  location?: string;
  budget_min?: number;
  budget_max?: number;
  indigenous_only?: boolean;
  skills?: string[];
  status?: string;
  government_entity?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

export class RFQService {
  async createRFQ(rfqData: RFQData, createdBy: string, governmentEntity: string): Promise<any> {
    return transaction(async (client) => {
      const rfqId = uuidv4();
      const rfqSlug = slug(`${rfqData.title}-${rfqId.slice(0, 8)}`);
      
      // Create main RFQ record
      const rfqResult = await client.query(
        `INSERT INTO rfqs (
          id, created_by, government_entity, title, slug, description,
          category, subcategory, budget_min, budget_max, timeline_days,
          requirements, deliverables, evaluation_criteria,
          indigenous_only, closing_date, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *`,
        [
          rfqId, createdBy, governmentEntity, rfqData.title, rfqSlug,
          rfqData.description, rfqData.category, rfqData.subcategory,
          rfqData.budget_min, rfqData.budget_max, rfqData.timeline_days,
          rfqData.requirements, rfqData.deliverables, rfqData.evaluation_criteria,
          rfqData.indigenous_only || false, rfqData.closing_date, 'open'
        ]
      );

      const rfq = rfqResult.rows[0];

      // Add location
      await client.query(
        `INSERT INTO rfq_locations (
          rfq_id, address, city, province, postal_code, latitude, longitude
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          rfqId, rfqData.location.address, rfqData.location.city,
          rfqData.location.province, rfqData.location.postal_code,
          rfqData.location.latitude, rfqData.location.longitude
        ]
      );

      // Add contact info
      await client.query(
        `INSERT INTO rfq_contacts (
          rfq_id, name, email, phone
        ) VALUES ($1, $2, $3, $4)`,
        [rfqId, rfqData.contact_info.name, rfqData.contact_info.email, rfqData.contact_info.phone]
      );

      // Add skills required
      if (rfqData.skills_required && rfqData.skills_required.length > 0) {
        for (const skill of rfqData.skills_required) {
          await client.query(
            `INSERT INTO rfq_skills (rfq_id, skill_name) VALUES ($1, $2)`,
            [rfqId, skill]
          );
        }
      }

      // Add documents
      if (rfqData.documents && rfqData.documents.length > 0) {
        for (const doc of rfqData.documents) {
          await client.query(
            `INSERT INTO rfq_documents (
              id, rfq_id, name, url, document_type, uploaded_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())`,
            [uuidv4(), rfqId, doc.name, doc.url, doc.type]
          );
        }
      }

      // Create initial analytics record
      await client.query(
        `INSERT INTO rfq_analytics (
          rfq_id, views, unique_views, interested_count, bid_count,
          avg_bid_amount, created_at, updated_at
        ) VALUES ($1, 0, 0, 0, 0, 0, NOW(), NOW())`,
        [rfqId]
      );

      // Index in Elasticsearch
      await indexRFQ({
        ...rfq,
        location: rfqData.location,
        skills_required: rfqData.skills_required
      });

      // Cache the RFQ
      await cacheRFQ(rfqId, rfq);

      // Send notifications to matching businesses
      const matchingBusinesses = await this.findMatchingBusinesses(rfq);
      if (matchingBusinesses.length > 0) {
        await notifyNewRFQ(rfq, matchingBusinesses.map(b => b.id));
      }

      return rfq;
    });
  }

  async getRFQById(rfqId: string, userId?: string): Promise<any> {
    // Check cache first
    const cached = await getCachedRFQ(rfqId);
    if (cached) {
      // Increment view counter asynchronously
      this.incrementViewCount(rfqId, userId);
      return cached;
    }

    const result = await query(
      `SELECT r.*, 
        l.address, l.city, l.province, l.postal_code, l.latitude, l.longitude,
        c.name as contact_name, c.email as contact_email, c.phone as contact_phone,
        array_agg(DISTINCT s.skill_name) FILTER (WHERE s.skill_name IS NOT NULL) as skills_required,
        array_agg(DISTINCT json_build_object(
          'id', d.id, 'name', d.name, 'url', d.url, 
          'type', d.document_type, 'uploaded_at', d.uploaded_at
        )) FILTER (WHERE d.id IS NOT NULL) as documents,
        a.views, a.unique_views, a.interested_count, a.bid_count, a.avg_bid_amount
       FROM rfqs r
       LEFT JOIN rfq_locations l ON r.id = l.rfq_id
       LEFT JOIN rfq_contacts c ON r.id = c.rfq_id
       LEFT JOIN rfq_skills s ON r.id = s.rfq_id
       LEFT JOIN rfq_documents d ON r.id = d.rfq_id
       LEFT JOIN rfq_analytics a ON r.id = a.rfq_id
       WHERE r.id = $1 AND r.deleted_at IS NULL
       GROUP BY r.id, l.address, l.city, l.province, l.postal_code, 
                l.latitude, l.longitude, c.name, c.email, c.phone,
                a.views, a.unique_views, a.interested_count, a.bid_count, a.avg_bid_amount`,
      [rfqId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('RFQ not found');
    }

    const rfq = result.rows[0];
    
    // Cache for 10 minutes
    await cacheRFQ(rfqId, rfq, 600);
    
    // Increment view counter
    this.incrementViewCount(rfqId, userId);
    
    return rfq;
  }

  async updateRFQ(rfqId: string, updates: Partial<RFQData>, userId: string): Promise<any> {
    // Check if RFQ exists and user has permission
    const existing = await this.getRFQById(rfqId);
    if (existing.created_by !== userId) {
      throw new ForbiddenError('You can only update your own RFQs');
    }

    if (existing.status !== 'open') {
      throw new ConflictError('Cannot update closed or cancelled RFQ');
    }

    const allowedFields = [
      'title', 'description', 'budget_min', 'budget_max', 'timeline_days',
      'requirements', 'deliverables', 'evaluation_criteria', 'closing_date'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(rfqId);

    const result = await query(
      `UPDATE rfqs SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('RFQ not found');
    }

    // Invalidate cache
    await invalidateRFQCache(rfqId);

    // Re-index in Elasticsearch
    const updatedRFQ = await this.getRFQById(rfqId);
    await indexRFQ(updatedRFQ);

    return result.rows[0];
  }

  async closeRFQ(rfqId: string, userId: string, reason?: string): Promise<any> {
    const existing = await this.getRFQById(rfqId);
    if (existing.created_by !== userId) {
      throw new ForbiddenError('You can only close your own RFQs');
    }

    if (existing.status !== 'open') {
      throw new ConflictError('RFQ is already closed');
    }

    const result = await query(
      `UPDATE rfqs SET 
       status = 'closed',
       closed_at = NOW(),
       close_reason = $1,
       updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason, rfqId]
    );

    // Get all bidders to notify
    const bidders = await query(
      `SELECT DISTINCT b.business_id FROM bids b WHERE b.rfq_id = $1`,
      [rfqId]
    );

    if (bidders.rows.length > 0) {
      await notifyRFQClosure(result.rows[0], bidders.rows.map(b => b.business_id));
    }

    // Invalidate cache
    await invalidateRFQCache(rfqId);

    return result.rows[0];
  }

  async searchRFQs(filters: RFQFilters, userId?: string): Promise<any> {
    const {
      category, location, budget_min, budget_max, indigenous_only,
      skills, page = 1, limit = 20, sort = 'created', order = 'desc'
    } = filters;

    // Use Elasticsearch for complex search
    if (filters.category || filters.location || skills) {
      const searchParams: any = {
        page,
        limit
      };

      if (filters.category) searchParams.category = filters.category;
      if (budget_min || budget_max) {
        searchParams.budget_range = {};
        if (budget_min) searchParams.budget_range.min = budget_min;
        if (budget_max) searchParams.budget_range.max = budget_max;
      }
      if (indigenous_only !== undefined) searchParams.indigenous_only = indigenous_only;
      if (skills) searchParams.skills = skills;

      return await searchRFQs(searchParams);
    }

    // Use database for simple queries
    let whereConditions = ['r.deleted_at IS NULL', 'r.status = $1'];
    let queryParams: any[] = ['open'];
    let paramCount = 2;

    if (budget_min) {
      whereConditions.push(`r.budget_max >= $${paramCount}`);
      queryParams.push(budget_min);
      paramCount++;
    }

    if (budget_max) {
      whereConditions.push(`r.budget_min <= $${paramCount}`);
      queryParams.push(budget_max);
      paramCount++;
    }

    if (indigenous_only !== undefined) {
      whereConditions.push(`r.indigenous_only = $${paramCount}`);
      queryParams.push(indigenous_only);
      paramCount++;
    }

    const orderClause = sort === 'created' ? 'r.created_at' :
                       sort === 'closing' ? 'r.closing_date' :
                       sort === 'budget' ? 'r.budget_max' : 'r.created_at';

    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT r.*, 
        l.city, l.province,
        a.views, a.bid_count
       FROM rfqs r
       LEFT JOIN rfq_locations l ON r.id = l.rfq_id
       LEFT JOIN rfq_analytics a ON r.id = a.rfq_id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY ${orderClause} ${order.toUpperCase()}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM rfqs r WHERE ${whereConditions.join(' AND ')}`,
      queryParams.slice(0, -2) // Remove limit and offset
    );

    return {
      rfqs: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    };
  }

  async getMatchingRFQs(businessId: string): Promise<any[]> {
    // Check cache first
    const cached = await getCachedRFQMatches(businessId);
    if (cached) {
      return cached;
    }

    // Get business profile
    const businessResult = await query(
      `SELECT b.*, 
        array_agg(DISTINCT i.industry_code) as industries,
        array_agg(DISTINCT s.skill_name) as skills,
        l.latitude, l.longitude
       FROM businesses b
       LEFT JOIN business_industries i ON b.id = i.business_id
       LEFT JOIN business_skills s ON b.id = s.business_id  
       LEFT JOIN business_addresses l ON b.id = l.business_id AND l.is_primary = true
       WHERE b.id = $1
       GROUP BY b.id, l.latitude, l.longitude`,
      [businessId]
    );

    if (businessResult.rows.length === 0) {
      return [];
    }

    const business = businessResult.rows[0];
    const businessProfile = {
      industries: business.industries || [],
      skills: business.skills || [],
      location: business.latitude && business.longitude ? {
        lat: business.latitude,
        lon: business.longitude
      } : undefined,
      capacity: business.capacity
    };

    // Use Elasticsearch for matching
    const matches = await findMatchingRFQs(businessProfile);

    // Cache for 5 minutes
    await cacheRFQMatches(businessId, matches, 300);

    return matches;
  }

  async getRFQAnalytics(rfqId: string, userId: string): Promise<any> {
    const rfq = await this.getRFQById(rfqId);
    if (rfq.created_by !== userId) {
      throw new ForbiddenError('You can only view analytics for your own RFQs');
    }

    const result = await query(
      `SELECT 
        r.title,
        r.created_at,
        r.closing_date,
        r.status,
        a.views,
        a.unique_views,
        a.interested_count,
        a.bid_count,
        a.avg_bid_amount,
        COUNT(DISTINCT b.id) as total_bids,
        MIN(b.amount) as min_bid,
        MAX(b.amount) as max_bid,
        AVG(b.amount) as current_avg_bid
       FROM rfqs r
       LEFT JOIN rfq_analytics a ON r.id = a.rfq_id
       LEFT JOIN bids b ON r.id = b.rfq_id AND b.status != 'withdrawn'
       WHERE r.id = $1
       GROUP BY r.id, r.title, r.created_at, r.closing_date, r.status,
                a.views, a.unique_views, a.interested_count, a.bid_count, a.avg_bid_amount`,
      [rfqId]
    );

    // Get daily view stats
    const dailyStats = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as views
       FROM rfq_views 
       WHERE rfq_id = $1 
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`,
      [rfqId]
    );

    // Get bid timeline
    const bidTimeline = await query(
      `SELECT 
        DATE(submitted_at) as date,
        COUNT(*) as bids_submitted,
        AVG(amount) as avg_amount
       FROM bids 
       WHERE rfq_id = $1 AND status != 'withdrawn'
       GROUP BY DATE(submitted_at)
       ORDER BY date`,
      [rfqId]
    );

    return {
      summary: result.rows[0],
      daily_views: dailyStats.rows,
      bid_timeline: bidTimeline.rows
    };
  }

  private async incrementViewCount(rfqId: string, userId?: string): Promise<void> {
    try {
      // Record the view
      await query(
        `INSERT INTO rfq_views (rfq_id, viewer_id, ip_address, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [rfqId, userId, null] // IP will be added by middleware if needed
      );

      // Update analytics
      if (userId) {
        // Check if this is a unique view
        const uniqueCheck = await query(
          `SELECT COUNT(*) as count FROM rfq_views 
           WHERE rfq_id = $1 AND viewer_id = $2`,
          [rfqId, userId]
        );

        const isUniqueView = parseInt(uniqueCheck.rows[0].count) === 1;

        await query(
          `UPDATE rfq_analytics 
           SET views = views + 1,
               unique_views = unique_views + $1,
               updated_at = NOW()
           WHERE rfq_id = $2`,
          [isUniqueView ? 1 : 0, rfqId]
        );
      } else {
        await query(
          `UPDATE rfq_analytics 
           SET views = views + 1,
               updated_at = NOW()
           WHERE rfq_id = $1`,
          [rfqId]
        );
      }
    } catch (error) {
      logger.error('Failed to increment view count:', error);
    }
  }

  private async findMatchingBusinesses(rfq: any): Promise<any[]> {
    const result = await query(
      `SELECT DISTINCT b.id, b.business_name
       FROM businesses b
       LEFT JOIN business_industries i ON b.id = i.business_id
       LEFT JOIN business_skills s ON b.id = s.business_id
       WHERE (i.industry_code = $1 OR s.skill_name = ANY($2))
       AND b.status = 'verified'
       AND ($3 = false OR b.indigenous_owned = true)
       LIMIT 100`,
      [rfq.category, rfq.skills_required || [], rfq.indigenous_only]
    );

    return result.rows;
  }

  async scheduleDeadlineReminders(): Promise<void> {
    // Find RFQs closing in 24 hours
    const rfqsClosingSoon = await query(
      `SELECT r.*, array_agg(DISTINCT ri.business_id) as interested_businesses
       FROM rfqs r
       LEFT JOIN rfq_interests ri ON r.id = ri.rfq_id
       WHERE r.status = 'open'
       AND r.closing_date BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
       GROUP BY r.id`,
      []
    );

    for (const rfq of rfqsClosingSoon.rows) {
      if (rfq.interested_businesses && rfq.interested_businesses.length > 0) {
        await notifyRFQDeadlineReminder(rfq, rfq.interested_businesses);
      }
    }
  }
}