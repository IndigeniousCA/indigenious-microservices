import { query, transaction } from '../utils/database';
import { cacheBid, getCachedBid, trackBidSubmission, checkBidRateLimit } from '../utils/redis';
import { notifyBidSubmission, notifyBidStatusUpdate } from '../utils/notifications';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError, BusinessLogicError } from '../middleware/error-handler';

export interface BidData {
  rfq_id: string;
  amount: number;
  timeline_days: number;
  proposal: string;
  methodology?: string;
  team_info?: string;
  references?: {
    project_name: string;
    client_name: string;
    contact_email?: string;
    completion_date: Date;
    value?: number;
    description?: string;
  }[];
  documents?: {
    name: string;
    url: string;
    type: string;
  }[];
  questions?: {
    question: string;
    answer: string;
  }[];
}

export interface BidEvaluation {
  score: number;
  feedback?: string;
  criteria_scores?: Record<string, number>;
  notes?: string;
}

export interface BidFilters {
  rfq_id?: string;
  business_id?: string;
  status?: string;
  min_amount?: number;
  max_amount?: number;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

export class BidService {
  async submitBid(bidData: BidData, businessId: string, userId: string): Promise<any> {
    // Check rate limiting
    const canSubmit = await checkBidRateLimit(businessId);
    if (!canSubmit) {
      throw new BusinessLogicError('Rate limit exceeded. Maximum 10 bids per hour.');
    }

    // Verify RFQ exists and is open
    const rfqResult = await query(
      `SELECT * FROM rfqs WHERE id = $1 AND status = 'open' AND closing_date > NOW()`,
      [bidData.rfq_id]
    );

    if (rfqResult.rows.length === 0) {
      throw new NotFoundError('RFQ not found or no longer accepting bids');
    }

    const rfq = rfqResult.rows[0];

    // Check if business already submitted a bid
    const existingBid = await query(
      `SELECT id FROM bids WHERE rfq_id = $1 AND business_id = $2 AND status != 'withdrawn'`,
      [bidData.rfq_id, businessId]
    );

    if (existingBid.rows.length > 0) {
      throw new ConflictError('You have already submitted a bid for this RFQ');
    }

    // Check indigenous-only requirement
    if (rfq.indigenous_only) {
      const businessCheck = await query(
        `SELECT indigenous_owned FROM businesses WHERE id = $1`,
        [businessId]
      );

      if (!businessCheck.rows[0]?.indigenous_owned) {
        throw new ForbiddenError('This RFQ is restricted to Indigenous-owned businesses');
      }
    }

    return transaction(async (client) => {
      const bidId = uuidv4();
      
      // Create main bid record
      const bidResult = await client.query(
        `INSERT INTO bids (
          id, rfq_id, business_id, submitted_by, amount, timeline_days,
          proposal, methodology, team_info, status, submitted_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          bidId, bidData.rfq_id, businessId, userId, bidData.amount,
          bidData.timeline_days, bidData.proposal, bidData.methodology,
          bidData.team_info, 'submitted'
        ]
      );

      const bid = bidResult.rows[0];

      // Add references
      if (bidData.references && bidData.references.length > 0) {
        for (const ref of bidData.references) {
          await client.query(
            `INSERT INTO bid_references (
              id, bid_id, project_name, client_name, contact_email,
              completion_date, value, description, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              uuidv4(), bidId, ref.project_name, ref.client_name,
              ref.contact_email, ref.completion_date, ref.value, ref.description
            ]
          );
        }
      }

      // Add documents
      if (bidData.documents && bidData.documents.length > 0) {
        for (const doc of bidData.documents) {
          await client.query(
            `INSERT INTO bid_documents (
              id, bid_id, name, url, document_type, uploaded_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())`,
            [uuidv4(), bidId, doc.name, doc.url, doc.type]
          );
        }
      }

      // Add question responses
      if (bidData.questions && bidData.questions.length > 0) {
        for (const qa of bidData.questions) {
          await client.query(
            `INSERT INTO bid_questions (
              id, bid_id, question, answer, created_at
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [uuidv4(), bidId, qa.question, qa.answer]
          );
        }
      }

      // Update RFQ analytics
      await client.query(
        `UPDATE rfq_analytics 
         SET bid_count = bid_count + 1,
             avg_bid_amount = (
               SELECT AVG(amount) FROM bids 
               WHERE rfq_id = $1 AND status != 'withdrawn'
             ),
             updated_at = NOW()
         WHERE rfq_id = $1`,
        [bidData.rfq_id]
      );

      // Track bid submission in Redis
      await trackBidSubmission(bidData.rfq_id, bidId);

      // Cache the bid
      await cacheBid(bidId, bid);

      // Send notification to RFQ owner
      await notifyBidSubmission({
        ...bid,
        business_name: await this.getBusinessName(businessId)
      }, rfq.created_by);

      return bid;
    });
  }

  async getBidById(bidId: string, userId?: string): Promise<any> {
    // Check cache first
    const cached = await getCachedBid(bidId);
    if (cached) {
      return cached;
    }

    const result = await query(
      `SELECT b.*, 
        bs.business_name, bs.indigenous_owned,
        r.title as rfq_title, r.created_by as rfq_owner,
        array_agg(DISTINCT json_build_object(
          'id', br.id, 'project_name', br.project_name, 'client_name', br.client_name,
          'contact_email', br.contact_email, 'completion_date', br.completion_date,
          'value', br.value, 'description', br.description
        )) FILTER (WHERE br.id IS NOT NULL) as references,
        array_agg(DISTINCT json_build_object(
          'id', bd.id, 'name', bd.name, 'url', bd.url, 
          'type', bd.document_type, 'uploaded_at', bd.uploaded_at
        )) FILTER (WHERE bd.id IS NOT NULL) as documents,
        array_agg(DISTINCT json_build_object(
          'id', bq.id, 'question', bq.question, 'answer', bq.answer
        )) FILTER (WHERE bq.id IS NOT NULL) as questions
       FROM bids b
       LEFT JOIN businesses bs ON b.business_id = bs.id
       LEFT JOIN rfqs r ON b.rfq_id = r.id
       LEFT JOIN bid_references br ON b.id = br.bid_id
       LEFT JOIN bid_documents bd ON b.id = bd.bid_id
       LEFT JOIN bid_questions bq ON b.id = bq.bid_id
       WHERE b.id = $1
       GROUP BY b.id, bs.business_name, bs.indigenous_owned, r.title, r.created_by`,
      [bidId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Bid not found');
    }

    const bid = result.rows[0];
    
    // Cache for 5 minutes
    await cacheBid(bidId, bid, 300);
    
    return bid;
  }

  async updateBid(bidId: string, updates: Partial<BidData>, userId: string): Promise<any> {
    // Check if bid exists and user has permission
    const existing = await this.getBidById(bidId);
    if (existing.submitted_by !== userId) {
      throw new ForbiddenError('You can only update your own bids');
    }

    if (existing.status !== 'submitted') {
      throw new ConflictError('Cannot update bid that has been evaluated or withdrawn');
    }

    // Check if RFQ is still open
    const rfqResult = await query(
      `SELECT status, closing_date FROM rfqs WHERE id = $1`,
      [existing.rfq_id]
    );

    if (rfqResult.rows[0].status !== 'open' || 
        moment(rfqResult.rows[0].closing_date).isBefore(moment())) {
      throw new ConflictError('Cannot update bid for closed RFQ');
    }

    const allowedFields = [
      'amount', 'timeline_days', 'proposal', 'methodology', 'team_info'
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
    updateValues.push(bidId);

    const result = await query(
      `UPDATE bids SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    // Update RFQ analytics if amount changed
    if (updates.amount !== undefined) {
      await query(
        `UPDATE rfq_analytics 
         SET avg_bid_amount = (
           SELECT AVG(amount) FROM bids 
           WHERE rfq_id = $1 AND status != 'withdrawn'
         ),
         updated_at = NOW()
         WHERE rfq_id = $1`,
        [existing.rfq_id]
      );
    }

    return result.rows[0];
  }

  async withdrawBid(bidId: string, userId: string, reason?: string): Promise<any> {
    const existing = await this.getBidById(bidId);
    if (existing.submitted_by !== userId) {
      throw new ForbiddenError('You can only withdraw your own bids');
    }

    if (existing.status === 'withdrawn') {
      throw new ConflictError('Bid is already withdrawn');
    }

    if (existing.status === 'awarded') {
      throw new ConflictError('Cannot withdraw awarded bid');
    }

    const result = await query(
      `UPDATE bids SET 
       status = 'withdrawn',
       withdrawal_reason = $1,
       withdrawn_at = NOW(),
       updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reason, bidId]
    );

    // Update RFQ analytics
    await query(
      `UPDATE rfq_analytics 
       SET bid_count = bid_count - 1,
           avg_bid_amount = (
             SELECT AVG(amount) FROM bids 
             WHERE rfq_id = $1 AND status != 'withdrawn'
           ),
           updated_at = NOW()
       WHERE rfq_id = $1`,
      [existing.rfq_id]
    );

    return result.rows[0];
  }

  async evaluateBid(bidId: string, evaluation: BidEvaluation, evaluatorId: string): Promise<any> {
    const bid = await this.getBidById(bidId);
    
    // Check if evaluator is RFQ owner
    if (bid.rfq_owner !== evaluatorId) {
      throw new ForbiddenError('Only RFQ owner can evaluate bids');
    }

    if (bid.status === 'withdrawn') {
      throw new ConflictError('Cannot evaluate withdrawn bid');
    }

    return transaction(async (client) => {
      // Update bid with evaluation
      const result = await client.query(
        `UPDATE bids SET 
         score = $1,
         feedback = $2,
         evaluation_notes = $3,
         evaluated_by = $4,
         evaluated_at = NOW(),
         updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [evaluation.score, evaluation.feedback, evaluation.notes, evaluatorId, bidId]
      );

      // Add detailed criteria scores if provided
      if (evaluation.criteria_scores) {
        for (const [criterion, score] of Object.entries(evaluation.criteria_scores)) {
          await client.query(
            `INSERT INTO bid_evaluations (
              id, bid_id, criterion, score, created_at
            ) VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (bid_id, criterion) 
            DO UPDATE SET score = $3, updated_at = NOW()`,
            [uuidv4(), bidId, criterion, score]
          );
        }
      }

      // Send notification to bidder
      await notifyBidStatusUpdate(result.rows[0], bid.business_id);

      return result.rows[0];
    });
  }

  async getBidsForRFQ(rfqId: string, userId: string, includePrivate: boolean = false): Promise<any[]> {
    // Check if user is RFQ owner or has permission to view all bids
    const rfqResult = await query(`SELECT created_by FROM rfqs WHERE id = $1`, [rfqId]);
    if (rfqResult.rows.length === 0) {
      throw new NotFoundError('RFQ not found');
    }

    const isOwner = rfqResult.rows[0].created_by === userId;
    
    let selectFields = `
      b.id, b.amount, b.timeline_days, b.status, b.score, 
      b.submitted_at, b.evaluated_at,
      bs.business_name, bs.indigenous_owned
    `;

    if (isOwner || includePrivate) {
      selectFields += `, b.proposal, b.methodology, b.team_info, b.feedback, b.evaluation_notes`;
    }

    const result = await query(
      `SELECT ${selectFields}
       FROM bids b
       LEFT JOIN businesses bs ON b.business_id = bs.id
       WHERE b.rfq_id = $1 AND b.status != 'withdrawn'
       ORDER BY b.score DESC NULLS LAST, b.submitted_at ASC`,
      [rfqId]
    );

    return result.rows;
  }

  async getBidsForBusiness(businessId: string, filters: BidFilters): Promise<any> {
    const {
      status, page = 1, limit = 20, sort = 'submitted', order = 'desc'
    } = filters;

    let whereConditions = ['b.business_id = $1'];
    let queryParams: any[] = [businessId];
    let paramCount = 2;

    if (status) {
      whereConditions.push(`b.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    const orderClause = sort === 'submitted' ? 'b.submitted_at' :
                       sort === 'amount' ? 'b.amount' :
                       sort === 'score' ? 'b.score' : 'b.submitted_at';

    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT b.*, r.title as rfq_title, r.status as rfq_status, r.closing_date
       FROM bids b
       LEFT JOIN rfqs r ON b.rfq_id = r.id
       WHERE ${whereConditions.join(' AND ')}
       ORDER BY ${orderClause} ${order.toUpperCase()} NULLS LAST
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM bids b WHERE ${whereConditions.join(' AND ')}`,
      queryParams.slice(0, -2)
    );

    return {
      bids: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    };
  }

  async getBidStatistics(businessId?: string, rfqId?: string): Promise<any> {
    let whereClause = '1=1';
    let params: any[] = [];

    if (businessId) {
      whereClause += ' AND b.business_id = $1';
      params.push(businessId);
    }

    if (rfqId) {
      whereClause += ` AND b.rfq_id = $${params.length + 1}`;
      params.push(rfqId);
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total_bids,
        COUNT(CASE WHEN b.status = 'submitted' THEN 1 END) as submitted_bids,
        COUNT(CASE WHEN b.status = 'awarded' THEN 1 END) as awarded_bids,
        COUNT(CASE WHEN b.status = 'withdrawn' THEN 1 END) as withdrawn_bids,
        AVG(b.amount) as avg_bid_amount,
        MIN(b.amount) as min_bid_amount,
        MAX(b.amount) as max_bid_amount,
        AVG(b.score) as avg_score,
        COUNT(CASE WHEN b.score >= 80 THEN 1 END) as high_score_bids
       FROM bids b
       WHERE ${whereClause}`,
      params
    );

    return result.rows[0];
  }

  private async getBusinessName(businessId: string): Promise<string> {
    const result = await query(
      `SELECT business_name FROM businesses WHERE id = $1`,
      [businessId]
    );
    return result.rows[0]?.business_name || 'Unknown Business';
  }

  async getTopBidsForRFQ(rfqId: string, limit: number = 5): Promise<any[]> {
    const result = await query(
      `SELECT b.*, bs.business_name, bs.indigenous_owned
       FROM bids b
       LEFT JOIN businesses bs ON b.business_id = bs.id
       WHERE b.rfq_id = $1 AND b.status != 'withdrawn'
       ORDER BY b.score DESC NULLS LAST, b.amount ASC
       LIMIT $2`,
      [rfqId, limit]
    );

    return result.rows;
  }

  async generateBidComparison(rfqId: string, bidIds: string[]): Promise<any> {
    if (bidIds.length === 0) {
      throw new ValidationError('At least one bid ID is required');
    }

    const placeholders = bidIds.map((_, index) => `$${index + 2}`).join(',');
    
    const result = await query(
      `SELECT 
        b.id, b.amount, b.timeline_days, b.score, b.proposal,
        bs.business_name, bs.indigenous_owned,
        array_agg(DISTINCT json_build_object(
          'project_name', br.project_name,
          'client_name', br.client_name,
          'completion_date', br.completion_date,
          'value', br.value
        )) FILTER (WHERE br.id IS NOT NULL) as references
       FROM bids b
       LEFT JOIN businesses bs ON b.business_id = bs.id
       LEFT JOIN bid_references br ON b.id = br.bid_id
       WHERE b.rfq_id = $1 AND b.id IN (${placeholders})
       GROUP BY b.id, b.amount, b.timeline_days, b.score, b.proposal,
                bs.business_name, bs.indigenous_owned
       ORDER BY b.score DESC NULLS LAST`,
      [rfqId, ...bidIds]
    );

    return {
      rfq_id: rfqId,
      compared_at: new Date(),
      bids: result.rows
    };
  }
}