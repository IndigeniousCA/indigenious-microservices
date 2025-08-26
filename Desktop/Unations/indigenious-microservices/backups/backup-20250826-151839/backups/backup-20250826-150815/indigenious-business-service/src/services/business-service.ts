import { query, transaction } from '../utils/database';
import { setCache, getCache, invalidateCache } from '../utils/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';

export class BusinessService {
  async registerBusiness(businessData: any): Promise<any> {
    return transaction(async (client) => {
      const businessId = uuidv4();
      const businessSlug = slug(`${businessData.businessName}-${businessId.slice(0, 8)}`);
      
      // Create business record
      const businessResult = await client.query(
        `INSERT INTO businesses (
          id, owner_id, legal_name, business_name, slug,
          business_number, tax_number, description,
          year_established, employee_count, indigenous_employee_count,
          website, email, phone, indigenous_ownership,
          ownership_percentage, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *`,
        [
          businessId,
          businessData.ownerId,
          businessData.legalName,
          businessData.businessName,
          businessSlug,
          businessData.businessNumber,
          businessData.taxNumber,
          businessData.description,
          businessData.yearEstablished,
          businessData.employeeCount,
          businessData.indigenousEmployeeCount,
          businessData.website,
          businessData.email,
          businessData.phone,
          businessData.indigenousOwnership,
          businessData.ownershipPercentage,
          'pending_verification'
        ]
      );

      // Add address
      await client.query(
        `INSERT INTO business_addresses (
          business_id, street, city, province, postal_code,
          country, latitude, longitude, is_primary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          businessId,
          businessData.address.street,
          businessData.address.city,
          businessData.address.province,
          businessData.address.postalCode,
          businessData.address.country,
          businessData.address.latitude,
          businessData.address.longitude,
          true
        ]
      );

      // Add industries
      if (businessData.industries && businessData.industries.length > 0) {
        for (const industry of businessData.industries) {
          await client.query(
            `INSERT INTO business_industries (business_id, industry_code, is_primary)
             VALUES ($1, $2, $3)`,
            [businessId, industry, businessData.industries[0] === industry]
          );
        }
      }

      // Add services offered
      if (businessData.servicesOffered && businessData.servicesOffered.length > 0) {
        for (const service of businessData.servicesOffered) {
          await client.query(
            `INSERT INTO business_services (business_id, service_name, description)
             VALUES ($1, $2, $3)`,
            [businessId, service.name, service.description]
          );
        }
      }

      // Create initial stats record
      await client.query(
        `INSERT INTO business_stats (
          business_id, profile_views, directory_clicks,
          rfq_invitations, bids_submitted, contracts_won
        ) VALUES ($1, 0, 0, 0, 0, 0)`,
        [businessId]
      );

      return businessResult.rows[0];
    });
  }

  async getBusinessById(businessId: string): Promise<any> {
    // Check cache first
    const cached = await getCache(`business:${businessId}`);
    if (cached) {
      // Increment view counter asynchronously
      this.incrementViewCount(businessId);
      return cached;
    }

    const result = await query(
      `SELECT b.*, 
        a.street, a.city, a.province, a.postal_code, a.country,
        a.latitude, a.longitude,
        array_agg(DISTINCT i.industry_code) as industries,
        array_agg(DISTINCT s.service_name) as services,
        v.status as verification_status,
        v.verified_at,
        v.expiry_date as verification_expiry
       FROM businesses b
       LEFT JOIN business_addresses a ON b.id = a.business_id AND a.is_primary = true
       LEFT JOIN business_industries i ON b.id = i.business_id
       LEFT JOIN business_services s ON b.id = s.business_id
       LEFT JOIN business_verifications v ON b.id = v.business_id AND v.verification_type = 'indigenous'
       WHERE b.id = $1 AND b.deleted_at IS NULL
       GROUP BY b.id, a.street, a.city, a.province, a.postal_code, 
                a.country, a.latitude, a.longitude, v.status, v.verified_at, v.expiry_date`,
      [businessId]
    );

    if (result.rows.length === 0) {
      throw new Error('Business not found');
    }

    const business = result.rows[0];
    
    // Cache for 5 minutes
    await setCache(`business:${businessId}`, business, 300);
    
    // Increment view counter
    this.incrementViewCount(businessId);
    
    return business;
  }

  async updateBusiness(businessId: string, updates: any): Promise<any> {
    const allowedFields = [
      'legal_name', 'business_name', 'business_number', 'tax_number',
      'description', 'year_established', 'employee_count',
      'indigenous_employee_count', 'website', 'email', 'phone',
      'indigenous_ownership', 'ownership_percentage'
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
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(businessId);

    const result = await query(
      `UPDATE businesses SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      throw new Error('Business not found');
    }

    // Invalidate cache
    await invalidateCache(`business:${businessId}`);

    return result.rows[0];
  }

  async deleteBusiness(businessId: string): Promise<void> {
    await transaction(async (client) => {
      // Soft delete
      await client.query(
        `UPDATE businesses SET 
         status = 'deleted',
         deleted_at = NOW(),
         updated_at = NOW()
         WHERE id = $1`,
        [businessId]
      );

      // Anonymize sensitive data
      await client.query(
        `UPDATE businesses SET
         email = NULL,
         phone = NULL,
         business_number = NULL,
         tax_number = NULL
         WHERE id = $1`,
        [businessId]
      );

      // Invalidate cache
      await invalidateCache(`business:${businessId}`);
    });
  }

  async addCertification(businessId: string, certData: any): Promise<any> {
    const result = await query(
      `INSERT INTO business_certifications (
        id, business_id, name, issuer, issue_date,
        expiry_date, document_url, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        uuidv4(),
        businessId,
        certData.name,
        certData.issuer,
        certData.issueDate,
        certData.expiryDate,
        certData.documentUrl,
        'active'
      ]
    );

    // Invalidate cache
    await invalidateCache(`business:${businessId}`);

    return result.rows[0];
  }

  async getBusinessStats(businessId: string): Promise<any> {
    const result = await query(
      `SELECT * FROM business_stats WHERE business_id = $1`,
      [businessId]
    );

    if (result.rows.length === 0) {
      // Create default stats
      const newStats = await query(
        `INSERT INTO business_stats (
          business_id, profile_views, directory_clicks,
          rfq_invitations, bids_submitted, contracts_won,
          total_contract_value, average_rating, review_count
        ) VALUES ($1, 0, 0, 0, 0, 0, 0, 0, 0)
        RETURNING *`,
        [businessId]
      );
      return newStats.rows[0];
    }

    return result.rows[0];
  }

  private async incrementViewCount(businessId: string): Promise<void> {
    try {
      await query(
        `UPDATE business_stats 
         SET profile_views = profile_views + 1,
             last_viewed_at = NOW()
         WHERE business_id = $1`,
        [businessId]
      );
    } catch (error) {
      logger.error('Failed to increment view count:', error);
    }
  }

  async getBusinessesByOwner(ownerId: string): Promise<any[]> {
    const result = await query(
      `SELECT b.*, 
        v.status as verification_status
       FROM businesses b
       LEFT JOIN business_verifications v ON b.id = v.business_id 
         AND v.verification_type = 'indigenous'
       WHERE b.owner_id = $1 AND b.deleted_at IS NULL
       ORDER BY b.created_at DESC`,
      [ownerId]
    );

    return result.rows;
  }

  async updateBusinessStatus(businessId: string, status: string, reason?: string): Promise<any> {
    const result = await query(
      `UPDATE businesses SET 
       status = $1,
       status_reason = $2,
       status_updated_at = NOW(),
       updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, reason, businessId]
    );

    if (result.rows.length === 0) {
      throw new Error('Business not found');
    }

    // Invalidate cache
    await invalidateCache(`business:${businessId}`);

    return result.rows[0];
  }
}