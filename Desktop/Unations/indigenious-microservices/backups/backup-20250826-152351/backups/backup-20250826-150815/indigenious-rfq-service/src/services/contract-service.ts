import { query, transaction } from '../utils/database';
import { setCache, getCache, invalidateCache } from '../utils/redis';
import { notifyContractAwarded, sendNotification } from '../utils/notifications';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError, BusinessLogicError } from '../middleware/error-handler';

export interface ContractData {
  rfq_id: string;
  winning_bid_id: string;
  contract_value: number;
  start_date: Date;
  end_date: Date;
  terms_conditions?: string;
  special_clauses?: string;
  payment_schedule?: {
    milestone: string;
    percentage: number;
    due_date: Date;
  }[];
  performance_bond_required?: boolean;
  insurance_requirements?: string;
}

export interface ContractUpdate {
  status?: 'draft' | 'pending_signature' | 'active' | 'completed' | 'terminated' | 'cancelled';
  actual_start_date?: Date;
  actual_end_date?: Date;
  completion_percentage?: number;
  notes?: string;
}

export class ContractService {
  async awardContract(contractData: ContractData, awardedBy: string): Promise<any> {
    // Verify RFQ and bid
    const rfqBidResult = await query(
      `SELECT r.*, b.business_id, b.amount as bid_amount, b.status as bid_status,
        bs.business_name
       FROM rfqs r
       LEFT JOIN bids b ON r.id = b.rfq_id AND b.id = $2
       LEFT JOIN businesses bs ON b.business_id = bs.id
       WHERE r.id = $1`,
      [contractData.rfq_id, contractData.winning_bid_id]
    );

    if (rfqBidResult.rows.length === 0) {
      throw new NotFoundError('RFQ or bid not found');
    }

    const data = rfqBidResult.rows[0];

    if (data.created_by !== awardedBy) {
      throw new ForbiddenError('Only RFQ owner can award contracts');
    }

    if (data.status === 'closed' && data.close_reason === 'contract_awarded') {
      throw new ConflictError('Contract has already been awarded for this RFQ');
    }

    if (data.bid_status !== 'submitted') {
      throw new BusinessLogicError('Can only award contracts to submitted bids');
    }

    return transaction(async (client) => {
      const contractId = uuidv4();

      // Create contract record
      const contractResult = await client.query(
        `INSERT INTO contracts (
          id, rfq_id, winning_bid_id, business_id, awarded_by,
          contract_value, start_date, end_date, terms_conditions,
          special_clauses, performance_bond_required, insurance_requirements,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *`,
        [
          contractId, contractData.rfq_id, contractData.winning_bid_id,
          data.business_id, awardedBy, contractData.contract_value,
          contractData.start_date, contractData.end_date,
          contractData.terms_conditions, contractData.special_clauses,
          contractData.performance_bond_required || false,
          contractData.insurance_requirements, 'draft'
        ]
      );

      const contract = contractResult.rows[0];

      // Add payment schedule
      if (contractData.payment_schedule && contractData.payment_schedule.length > 0) {
        for (const payment of contractData.payment_schedule) {
          await client.query(
            `INSERT INTO contract_payments (
              id, contract_id, milestone, percentage, due_date, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [uuidv4(), contractId, payment.milestone, payment.percentage, payment.due_date, 'pending']
          );
        }
      }

      // Update winning bid status
      await client.query(
        `UPDATE bids SET status = 'awarded', awarded_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [contractData.winning_bid_id]
      );

      // Update other bids for this RFQ
      const otherBidsResult = await client.query(
        `UPDATE bids SET status = 'not_selected', updated_at = NOW()
         WHERE rfq_id = $1 AND id != $2 AND status = 'submitted'
         RETURNING business_id`,
        [contractData.rfq_id, contractData.winning_bid_id]
      );

      // Close the RFQ
      await client.query(
        `UPDATE rfqs SET 
         status = 'closed',
         close_reason = 'contract_awarded',
         closed_at = NOW(),
         updated_at = NOW()
         WHERE id = $1`,
        [contractData.rfq_id]
      );

      // Update business stats
      await client.query(
        `UPDATE business_stats 
         SET contracts_won = contracts_won + 1,
             total_contract_value = total_contract_value + $1,
             updated_at = NOW()
         WHERE business_id = $2`,
        [contractData.contract_value, data.business_id]
      );

      // Send notifications
      const loserBusinessIds = otherBidsResult.rows.map(row => row.business_id);
      await notifyContractAwarded(
        {
          ...contract,
          rfq_title: data.title,
          amount: contractData.contract_value
        },
        data.business_id,
        loserBusinessIds
      );

      return contract;
    });
  }

  async getContractById(contractId: string, userId?: string): Promise<any> {
    const result = await query(
      `SELECT c.*, r.title as rfq_title, r.category as rfq_category,
        b.amount as original_bid_amount, b.timeline_days as original_timeline,
        bs.business_name, bs.indigenous_owned,
        array_agg(DISTINCT json_build_object(
          'id', cp.id, 'milestone', cp.milestone, 'percentage', cp.percentage,
          'due_date', cp.due_date, 'status', cp.status, 'paid_at', cp.paid_at,
          'amount', cp.amount
        )) FILTER (WHERE cp.id IS NOT NULL) as payment_schedule
       FROM contracts c
       LEFT JOIN rfqs r ON c.rfq_id = r.id
       LEFT JOIN bids b ON c.winning_bid_id = b.id
       LEFT JOIN businesses bs ON c.business_id = bs.id
       LEFT JOIN contract_payments cp ON c.id = cp.contract_id
       WHERE c.id = $1
       GROUP BY c.id, r.title, r.category, b.amount, b.timeline_days,
                bs.business_name, bs.indigenous_owned`,
      [contractId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Contract not found');
    }

    return result.rows[0];
  }

  async updateContract(contractId: string, updates: ContractUpdate, userId: string): Promise<any> {
    const contract = await this.getContractById(contractId);
    
    // Check permissions - only RFQ owner or contract business can update
    const canUpdate = contract.awarded_by === userId || 
                      await this.isBusinessOwner(contract.business_id, userId);
    
    if (!canUpdate) {
      throw new ForbiddenError('Insufficient permissions to update contract');
    }

    const allowedFields = [
      'status', 'actual_start_date', 'actual_end_date', 
      'completion_percentage', 'notes'
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
    updateValues.push(contractId);

    const result = await query(
      `UPDATE contracts SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    // Log status changes
    if (updates.status && updates.status !== contract.status) {
      await query(
        `INSERT INTO contract_status_history (
          id, contract_id, previous_status, new_status, changed_by, 
          change_reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [uuidv4(), contractId, contract.status, updates.status, userId, updates.notes]
      );

      // Send notification for significant status changes
      if (['active', 'completed', 'terminated'].includes(updates.status)) {
        await sendNotification({
          type: 'contract.status_changed',
          recipients: [contract.awarded_by, await this.getBusinessOwnerId(contract.business_id)],
          data: {
            contractId,
            rfqTitle: contract.rfq_title,
            newStatus: updates.status,
            notes: updates.notes
          },
          priority: 'normal'
        });
      }
    }

    return result.rows[0];
  }

  async processPayment(
    contractId: string, 
    milestoneId: string, 
    amount: number, 
    processedBy: string
  ): Promise<any> {
    const contract = await this.getContractById(contractId);
    
    if (contract.awarded_by !== processedBy) {
      throw new ForbiddenError('Only contract awarder can process payments');
    }

    return transaction(async (client) => {
      // Update payment milestone
      const paymentResult = await client.query(
        `UPDATE contract_payments 
         SET status = 'paid',
             amount = $1,
             paid_at = NOW(),
             processed_by = $2,
             updated_at = NOW()
         WHERE id = $3 AND contract_id = $4 AND status = 'pending'
         RETURNING *`,
        [amount, processedBy, milestoneId, contractId]
      );

      if (paymentResult.rows.length === 0) {
        throw new NotFoundError('Payment milestone not found or already paid');
      }

      // Update contract total paid
      await client.query(
        `UPDATE contracts 
         SET total_paid = COALESCE(total_paid, 0) + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [amount, contractId]
      );

      // Create payment record for accounting
      await client.query(
        `INSERT INTO contract_payment_records (
          id, contract_id, payment_id, amount, payment_date,
          payment_method, reference_number, processed_by, created_at
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, NOW())`,
        [
          uuidv4(), contractId, milestoneId, amount,
          'electronic_transfer', // Default payment method
          `PAY-${Date.now()}`, // Generate reference
          processedBy
        ]
      );

      // Send notification
      await sendNotification({
        type: 'contract.payment_processed',
        recipients: [await this.getBusinessOwnerId(contract.business_id)],
        data: {
          contractId,
          rfqTitle: contract.rfq_title,
          milestone: paymentResult.rows[0].milestone,
          amount,
          paymentDate: new Date()
        },
        priority: 'high'
      });

      return paymentResult.rows[0];
    });
  }

  async getContractsForBusiness(businessId: string, filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const { status, page = 1, limit = 20 } = filters || {};

    let whereConditions = ['c.business_id = $1'];
    let queryParams: any[] = [businessId];
    let paramCount = 2;

    if (status) {
      whereConditions.push(`c.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT c.*, r.title as rfq_title, r.category,
        COUNT(cp.id) as total_payments,
        COUNT(CASE WHEN cp.status = 'paid' THEN 1 END) as paid_payments,
        COALESCE(SUM(CASE WHEN cp.status = 'paid' THEN cp.amount END), 0) as total_paid
       FROM contracts c
       LEFT JOIN rfqs r ON c.rfq_id = r.id
       LEFT JOIN contract_payments cp ON c.id = cp.contract_id
       WHERE ${whereConditions.join(' AND ')}
       GROUP BY c.id, r.title, r.category
       ORDER BY c.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM contracts c WHERE ${whereConditions.join(' AND ')}`,
      queryParams.slice(0, -2)
    );

    return {
      contracts: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    };
  }

  async getContractsForRFQOwner(ownerId: string, filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const { status, page = 1, limit = 20 } = filters || {};

    let whereConditions = ['c.awarded_by = $1'];
    let queryParams: any[] = [ownerId];
    let paramCount = 2;

    if (status) {
      whereConditions.push(`c.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT c.*, r.title as rfq_title, bs.business_name,
        COUNT(cp.id) as total_payments,
        COUNT(CASE WHEN cp.status = 'paid' THEN 1 END) as paid_payments
       FROM contracts c
       LEFT JOIN rfqs r ON c.rfq_id = r.id
       LEFT JOIN businesses bs ON c.business_id = bs.id
       LEFT JOIN contract_payments cp ON c.id = cp.contract_id
       WHERE ${whereConditions.join(' AND ')}
       GROUP BY c.id, r.title, bs.business_name
       ORDER BY c.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...queryParams, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM contracts c WHERE ${whereConditions.join(' AND ')}`,
      queryParams.slice(0, -2)
    );

    return {
      contracts: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    };
  }

  async getContractStatistics(businessId?: string, ownerId?: string): Promise<any> {
    let whereClause = '1=1';
    let params: any[] = [];

    if (businessId) {
      whereClause += ' AND c.business_id = $1';
      params.push(businessId);
    }

    if (ownerId) {
      whereClause += ` AND c.awarded_by = $${params.length + 1}`;
      params.push(ownerId);
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total_contracts,
        COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_contracts,
        COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_contracts,
        COUNT(CASE WHEN c.status = 'terminated' THEN 1 END) as terminated_contracts,
        SUM(c.contract_value) as total_contract_value,
        SUM(c.total_paid) as total_paid_amount,
        AVG(c.contract_value) as avg_contract_value,
        COUNT(CASE WHEN c.end_date < NOW() AND c.status = 'active' THEN 1 END) as overdue_contracts
       FROM contracts c
       WHERE ${whereClause}`,
      params
    );

    return result.rows[0];
  }

  async generateContractDocument(contractId: string, userId: string): Promise<any> {
    const contract = await this.getContractById(contractId);
    
    // Check permissions
    const canGenerate = contract.awarded_by === userId || 
                        await this.isBusinessOwner(contract.business_id, userId);
    
    if (!canGenerate) {
      throw new ForbiddenError('Insufficient permissions to generate contract document');
    }

    // This would integrate with a document generation service
    // For now, return the contract data formatted for document generation
    return {
      contract_id: contractId,
      document_template: 'standard_contract',
      data: {
        rfq_title: contract.rfq_title,
        business_name: contract.business_name,
        contract_value: contract.contract_value,
        start_date: contract.start_date,
        end_date: contract.end_date,
        terms_conditions: contract.terms_conditions,
        special_clauses: contract.special_clauses,
        payment_schedule: contract.payment_schedule,
        performance_bond_required: contract.performance_bond_required,
        insurance_requirements: contract.insurance_requirements
      },
      generated_at: new Date(),
      generated_by: userId
    };
  }

  private async isBusinessOwner(businessId: string, userId: string): Promise<boolean> {
    const result = await query(
      `SELECT COUNT(*) as count FROM user_businesses 
       WHERE business_id = $1 AND user_id = $2 AND is_primary = true`,
      [businessId, userId]
    );
    
    return parseInt(result.rows[0].count) > 0;
  }

  private async getBusinessOwnerId(businessId: string): Promise<string> {
    const result = await query(
      `SELECT user_id FROM user_businesses 
       WHERE business_id = $1 AND is_primary = true`,
      [businessId]
    );
    
    return result.rows[0]?.user_id;
  }

  async checkContractDeadlines(): Promise<void> {
    // Find contracts ending soon
    const contractsEndingSoon = await query(
      `SELECT c.*, r.title as rfq_title, 
        u.email as owner_email, bu.email as business_email
       FROM contracts c
       LEFT JOIN rfqs r ON c.rfq_id = r.id
       LEFT JOIN users u ON c.awarded_by = u.id
       LEFT JOIN user_businesses ub ON c.business_id = ub.business_id AND ub.is_primary = true
       LEFT JOIN users bu ON ub.user_id = bu.id
       WHERE c.status = 'active'
       AND c.end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'`,
      []
    );

    for (const contract of contractsEndingSoon.rows) {
      await sendNotification({
        type: 'contract.deadline_reminder',
        recipients: [contract.awarded_by, await this.getBusinessOwnerId(contract.business_id)],
        data: {
          contractId: contract.id,
          rfqTitle: contract.rfq_title,
          endDate: contract.end_date,
          daysRemaining: moment(contract.end_date).diff(moment(), 'days')
        },
        priority: 'high'
      });
    }
  }
}