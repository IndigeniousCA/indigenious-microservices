import { query } from '../utils/database';
import { setCache, getCache } from '../utils/redis';
import { logger } from '../utils/logger';
import { getDistance } from 'geolib';

export class DirectoryService {
  async listBusinesses(filters: any): Promise<any> {
    const { page, limit, industries, province, city, indigenousOwned, verified, sortBy, order } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE b.deleted_at IS NULL AND b.status = \'active\'';
    const values: any[] = [];
    let paramCount = 1;

    // Build filters
    if (industries && industries.length > 0) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM business_industries bi 
        WHERE bi.business_id = b.id 
        AND bi.industry_code = ANY($${paramCount})
      )`;
      values.push(industries);
      paramCount++;
    }

    if (province) {
      whereClause += ` AND a.province = $${paramCount}`;
      values.push(province);
      paramCount++;
    }

    if (city) {
      whereClause += ` AND a.city = $${paramCount}`;
      values.push(city);
      paramCount++;
    }

    if (indigenousOwned !== undefined) {
      whereClause += ` AND b.indigenous_ownership = $${paramCount}`;
      values.push(indigenousOwned);
      paramCount++;
    }

    if (verified !== undefined) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM business_verifications v 
        WHERE v.business_id = b.id 
        AND v.verification_type = 'indigenous'
        AND v.status = 'approved'
        AND (v.expiry_date IS NULL OR v.expiry_date > NOW())
      )`;
    }

    // Determine sort column
    let sortColumn = 'b.created_at';
    switch (sortBy) {
      case 'name':
        sortColumn = 'b.business_name';
        break;
      case 'rating':
        sortColumn = 'bs.average_rating';
        break;
      case 'employees':
        sortColumn = 'b.employee_count';
        break;
    }

    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Add pagination parameters
    values.push(limit, offset);

    // Main query
    const result = await query(
      `SELECT 
        b.id, b.business_name, b.slug, b.description,
        b.indigenous_ownership, b.ownership_percentage,
        b.year_established, b.employee_count,
        b.website, b.email, b.phone,
        a.city, a.province, a.country,
        array_agg(DISTINCT i.industry_code) as industries,
        bs.average_rating, bs.review_count,
        v.status as verification_status,
        CASE WHEN v.status = 'approved' THEN true ELSE false END as is_verified
       FROM businesses b
       LEFT JOIN business_addresses a ON b.id = a.business_id AND a.is_primary = true
       LEFT JOIN business_industries i ON b.id = i.business_id
       LEFT JOIN business_stats bs ON b.id = bs.business_id
       LEFT JOIN business_verifications v ON b.id = v.business_id 
         AND v.verification_type = 'indigenous'
         AND v.status = 'approved'
       ${whereClause}
       GROUP BY b.id, a.city, a.province, a.country, 
                bs.average_rating, bs.review_count, v.status
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    // Count query
    const countResult = await query(
      `SELECT COUNT(DISTINCT b.id) 
       FROM businesses b
       LEFT JOIN business_addresses a ON b.id = a.business_id AND a.is_primary = true
       ${whereClause}`,
      values.slice(0, -2)
    );

    return {
      businesses: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  async getNearbyBusinesses(params: any): Promise<any> {
    const { latitude, longitude, radius, limit } = params;
    
    // Get businesses within bounding box (rough filter)
    const result = await query(
      `SELECT 
        b.id, b.business_name, b.slug, b.description,
        b.indigenous_ownership,
        a.street, a.city, a.province,
        a.latitude, a.longitude,
        bs.average_rating, bs.review_count
       FROM businesses b
       INNER JOIN business_addresses a ON b.id = a.business_id AND a.is_primary = true
       LEFT JOIN business_stats bs ON b.id = bs.business_id
       WHERE b.deleted_at IS NULL 
       AND b.status = 'active'
       AND a.latitude IS NOT NULL 
       AND a.longitude IS NOT NULL
       AND a.latitude BETWEEN $1 AND $2
       AND a.longitude BETWEEN $3 AND $4`,
      [
        latitude - (radius / 111), // rough conversion km to degrees
        latitude + (radius / 111),
        longitude - (radius / (111 * Math.cos(latitude * Math.PI / 180))),
        longitude + (radius / (111 * Math.cos(latitude * Math.PI / 180)))
      ]
    );

    // Calculate exact distances and filter
    const businessesWithDistance = result.rows
      .map(business => {
        const distance = getDistance(
          { latitude, longitude },
          { latitude: business.latitude, longitude: business.longitude }
        ) / 1000; // Convert to km
        
        return {
          ...business,
          distance: Math.round(distance * 10) / 10 // Round to 1 decimal
        };
      })
      .filter(b => b.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return businessesWithDistance;
  }

  async getFeaturedBusinesses(): Promise<any[]> {
    // Check cache first
    const cached = await getCache('featured-businesses');
    if (cached) {
      return cached;
    }

    const result = await query(
      `SELECT 
        b.id, b.business_name, b.slug, b.description,
        b.indigenous_ownership, b.year_established,
        a.city, a.province,
        array_agg(DISTINCT i.industry_code) as industries,
        bs.average_rating, bs.review_count,
        v.status as verification_status
       FROM businesses b
       LEFT JOIN business_addresses a ON b.id = a.business_id AND a.is_primary = true
       LEFT JOIN business_industries i ON b.id = i.business_id
       LEFT JOIN business_stats bs ON b.id = bs.business_id
       LEFT JOIN business_verifications v ON b.id = v.business_id 
         AND v.verification_type = 'indigenous'
       WHERE b.deleted_at IS NULL 
       AND b.status = 'active'
       AND b.is_featured = true
       GROUP BY b.id, a.city, a.province, 
                bs.average_rating, bs.review_count, v.status
       ORDER BY b.featured_order ASC, bs.average_rating DESC
       LIMIT 12`
    );

    const featured = result.rows;
    
    // Cache for 1 hour
    await setCache('featured-businesses', featured, 3600);
    
    return featured;
  }

  async getCategories(): Promise<any[]> {
    // Check cache first
    const cached = await getCache('business-categories');
    if (cached) {
      return cached;
    }

    const result = await query(
      `SELECT 
        ic.code, ic.name, ic.description,
        ic.parent_code, ic.level,
        COUNT(DISTINCT bi.business_id) as business_count
       FROM industry_categories ic
       LEFT JOIN business_industries bi ON ic.code = bi.industry_code
       LEFT JOIN businesses b ON bi.business_id = b.id 
         AND b.deleted_at IS NULL 
         AND b.status = 'active'
       GROUP BY ic.code, ic.name, ic.description, ic.parent_code, ic.level
       ORDER BY ic.level, ic.name`
    );

    const categories = this.buildCategoryTree(result.rows);
    
    // Cache for 6 hours
    await setCache('business-categories', categories, 21600);
    
    return categories;
  }

  private buildCategoryTree(categories: any[]): any[] {
    const tree: any[] = [];
    const map: any = {};

    // Create map
    categories.forEach(cat => {
      map[cat.code] = { ...cat, children: [] };
    });

    // Build tree
    categories.forEach(cat => {
      if (cat.parent_code && map[cat.parent_code]) {
        map[cat.parent_code].children.push(map[cat.code]);
      } else if (!cat.parent_code) {
        tree.push(map[cat.code]);
      }
    });

    return tree;
  }

  async getProvinceStats(): Promise<any[]> {
    const result = await query(
      `SELECT 
        a.province,
        COUNT(DISTINCT b.id) as business_count,
        COUNT(DISTINCT CASE WHEN b.indigenous_ownership THEN b.id END) as indigenous_count,
        COUNT(DISTINCT CASE WHEN v.status = 'approved' THEN b.id END) as verified_count
       FROM business_addresses a
       INNER JOIN businesses b ON a.business_id = b.id
       LEFT JOIN business_verifications v ON b.id = v.business_id 
         AND v.verification_type = 'indigenous'
       WHERE b.deleted_at IS NULL 
       AND b.status = 'active'
       AND a.is_primary = true
       GROUP BY a.province
       ORDER BY business_count DESC`
    );

    return result.rows;
  }
}