import { query, transaction } from '../utils/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '../utils/notifications';

export class VerificationService {
  async requestIndigenousVerification(data: any): Promise<any> {
    return transaction(async (client) => {
      const verificationId = uuidv4();
      
      // Check for existing pending verification
      const existing = await client.query(
        `SELECT * FROM business_verifications 
         WHERE business_id = $1 
         AND verification_type = 'indigenous'
         AND status = 'pending'`,
        [data.businessId]
      );

      if (existing.rows.length > 0) {
        throw new Error('A verification request is already pending');
      }

      // Create verification request
      const result = await client.query(
        `INSERT INTO business_verifications (
          id, business_id, verification_type, requested_by,
          document_type, document_url, additional_info,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *`,
        [
          verificationId,
          data.businessId,
          'indigenous',
          data.userId,
          data.documentType,
          data.documentUrl,
          data.additionalInfo,
          'pending'
        ]
      );

      // Create audit log
      await client.query(
        `INSERT INTO verification_audit_log (
          verification_id, action, performed_by, details, created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          verificationId,
          'requested',
          data.userId,
          JSON.stringify({ documentType: data.documentType })
        ]
      );

      // Notify admins
      await sendNotification({
        type: 'verification_request',
        recipients: ['admin'],
        data: {
          businessId: data.businessId,
          verificationId: verificationId
        }
      });

      return result.rows[0];
    });
  }

  async reviewVerification(data: any): Promise<any> {
    return transaction(async (client) => {
      // Get verification request
      const verification = await client.query(
        `SELECT * FROM business_verifications 
         WHERE business_id = $1 
         AND verification_type = 'indigenous'
         AND status = 'pending'`,
        [data.businessId]
      );

      if (verification.rows.length === 0) {
        throw new Error('No pending verification found');
      }

      const verificationId = verification.rows[0].id;

      // Update verification status
      const result = await client.query(
        `UPDATE business_verifications SET
         status = $1,
         reviewed_by = $2,
         review_notes = $3,
         verified_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
         expiry_date = $4,
         updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          data.status,
          data.reviewerId,
          data.notes,
          data.expiryDate || null,
          verificationId
        ]
      );

      // Update business status if approved
      if (data.status === 'approved') {
        await client.query(
          `UPDATE businesses SET
           status = 'active',
           is_verified = true,
           verified_at = NOW(),
           updated_at = NOW()
           WHERE id = $1`,
          [data.businessId]
        );
      }

      // Create audit log
      await client.query(
        `INSERT INTO verification_audit_log (
          verification_id, action, performed_by, details, created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          verificationId,
          data.status === 'approved' ? 'approved' : 'rejected',
          data.reviewerId,
          JSON.stringify({ notes: data.notes })
        ]
      );

      // Notify business owner
      const business = await client.query(
        `SELECT owner_id FROM businesses WHERE id = $1`,
        [data.businessId]
      );

      await sendNotification({
        type: data.status === 'approved' ? 'verification_approved' : 'verification_rejected',
        recipients: [business.rows[0].owner_id],
        data: {
          businessId: data.businessId,
          status: data.status,
          notes: data.notes
        }
      });

      return result.rows[0];
    });
  }

  async getVerificationStatus(businessId: string): Promise<any> {
    const result = await query(
      `SELECT 
        v.*,
        u.first_name as reviewer_first_name,
        u.last_name as reviewer_last_name
       FROM business_verifications v
       LEFT JOIN users u ON v.reviewed_by = u.id
       WHERE v.business_id = $1
       AND v.verification_type = 'indigenous'
       ORDER BY v.created_at DESC
       LIMIT 1`,
      [businessId]
    );

    if (result.rows.length === 0) {
      return {
        status: 'not_verified',
        verified: false
      };
    }

    const verification = result.rows[0];
    
    // Check if verification has expired
    if (verification.status === 'approved' && verification.expiry_date) {
      const expiryDate = new Date(verification.expiry_date);
      if (expiryDate < new Date()) {
        // Mark as expired
        await query(
          `UPDATE business_verifications SET
           status = 'expired',
           updated_at = NOW()
           WHERE id = $1`,
          [verification.id]
        );
        
        return {
          status: 'expired',
          verified: false,
          expiredAt: verification.expiry_date
        };
      }
    }

    return {
      status: verification.status,
      verified: verification.status === 'approved',
      verifiedAt: verification.verified_at,
      expiryDate: verification.expiry_date,
      reviewer: verification.reviewer_first_name ? {
        firstName: verification.reviewer_first_name,
        lastName: verification.reviewer_last_name
      } : null
    };
  }

  async getVerificationHistory(businessId: string): Promise<any[]> {
    const result = await query(
      `SELECT 
        v.*,
        u1.first_name as requester_first_name,
        u1.last_name as requester_last_name,
        u2.first_name as reviewer_first_name,
        u2.last_name as reviewer_last_name
       FROM business_verifications v
       LEFT JOIN users u1 ON v.requested_by = u1.id
       LEFT JOIN users u2 ON v.reviewed_by = u2.id
       WHERE v.business_id = $1
       ORDER BY v.created_at DESC`,
      [businessId]
    );

    return result.rows.map(row => ({
      id: row.id,
      type: row.verification_type,
      status: row.status,
      documentType: row.document_type,
      requestedAt: row.created_at,
      requestedBy: {
        firstName: row.requester_first_name,
        lastName: row.requester_last_name
      },
      reviewedAt: row.verified_at,
      reviewedBy: row.reviewer_first_name ? {
        firstName: row.reviewer_first_name,
        lastName: row.reviewer_last_name
      } : null,
      notes: row.review_notes,
      expiryDate: row.expiry_date
    }));
  }

  async getPendingVerifications(filters: any = {}): Promise<any> {
    let whereClause = `WHERE v.status = 'pending'`;
    const values: any[] = [];
    let paramCount = 1;

    if (filters.verificationType) {
      whereClause += ` AND v.verification_type = $${paramCount}`;
      values.push(filters.verificationType);
      paramCount++;
    }

    if (filters.dateFrom) {
      whereClause += ` AND v.created_at >= $${paramCount}`;
      values.push(filters.dateFrom);
      paramCount++;
    }

    const result = await query(
      `SELECT 
        v.*,
        b.business_name,
        b.business_number,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name
       FROM business_verifications v
       INNER JOIN businesses b ON v.business_id = b.id
       INNER JOIN users u ON b.owner_id = u.id
       ${whereClause}
       ORDER BY v.created_at ASC`,
      values
    );

    return result.rows;
  }

  async bulkApproveVerifications(verificationIds: string[], reviewerId: string): Promise<any> {
    return transaction(async (client) => {
      const results = [];
      
      for (const id of verificationIds) {
        const result = await client.query(
          `UPDATE business_verifications SET
           status = 'approved',
           reviewed_by = $1,
           verified_at = NOW(),
           updated_at = NOW()
           WHERE id = $2 AND status = 'pending'
           RETURNING business_id`,
          [reviewerId, id]
        );

        if (result.rows.length > 0) {
          // Update business status
          await client.query(
            `UPDATE businesses SET
             status = 'active',
             is_verified = true,
             verified_at = NOW()
             WHERE id = $1`,
            [result.rows[0].business_id]
          );

          results.push({
            verificationId: id,
            businessId: result.rows[0].business_id,
            status: 'approved'
          });

          // Create audit log
          await client.query(
            `INSERT INTO verification_audit_log (
              verification_id, action, performed_by, details, created_at
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [id, 'bulk_approved', reviewerId, JSON.stringify({ bulkAction: true })]
          );
        }
      }

      return results;
    });
  }

  async extendVerification(businessId: string, newExpiryDate: Date): Promise<any> {
    const result = await query(
      `UPDATE business_verifications SET
       expiry_date = $1,
       updated_at = NOW()
       WHERE business_id = $2
       AND verification_type = 'indigenous'
       AND status = 'approved'
       RETURNING *`,
      [newExpiryDate, businessId]
    );

    if (result.rows.length === 0) {
      throw new Error('No approved verification found to extend');
    }

    // Create audit log
    await query(
      `INSERT INTO verification_audit_log (
        verification_id, action, performed_by, details, created_at
      ) VALUES ($1, $2, $3, $4, NOW())`,
      [
        result.rows[0].id,
        'extended',
        'system',
        JSON.stringify({ newExpiryDate })
      ]
    );

    return result.rows[0];
  }

  async getVerificationMetrics(): Promise<any> {
    const metrics = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
        AVG(
          CASE 
            WHEN status IN ('approved', 'rejected') 
            THEN EXTRACT(EPOCH FROM (verified_at - created_at))/3600
            ELSE NULL 
          END
        ) as avg_review_time_hours,
        COUNT(*) FILTER (
          WHERE status = 'approved' 
          AND expiry_date > NOW()
        ) as active_verifications
       FROM business_verifications
       WHERE verification_type = 'indigenous'`
    );

    const recentActivity = await query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE status = 'pending') as requested,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
       FROM business_verifications
       WHERE verification_type = 'indigenous'
       AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    return {
      summary: metrics.rows[0],
      recentActivity: recentActivity.rows
    };
  }
}