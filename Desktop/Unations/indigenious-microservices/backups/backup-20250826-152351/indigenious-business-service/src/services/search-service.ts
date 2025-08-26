import { Client } from '@elastic/elasticsearch';
import { query } from '../utils/database';
import { logger } from '../utils/logger';
import { setCache, getCache } from '../utils/redis';

export class SearchService {
  private esClient: Client;

  constructor() {
    this.esClient = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      }
    });
    this.initializeIndex();
  }

  private async initializeIndex() {
    try {
      const indexExists = await this.esClient.indices.exists({
        index: 'businesses'
      });

      if (!indexExists) {
        await this.esClient.indices.create({
          index: 'businesses',
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                business_name: { 
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' },
                    suggest: { type: 'completion' }
                  }
                },
                legal_name: { type: 'text' },
                description: { type: 'text' },
                slug: { type: 'keyword' },
                industries: { type: 'keyword' },
                services: { type: 'text' },
                city: { 
                  type: 'text',
                  fields: { keyword: { type: 'keyword' } }
                },
                province: { type: 'keyword' },
                country: { type: 'keyword' },
                location: { type: 'geo_point' },
                indigenous_ownership: { type: 'boolean' },
                is_verified: { type: 'boolean' },
                year_established: { type: 'integer' },
                employee_count: { type: 'integer' },
                status: { type: 'keyword' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' },
                average_rating: { type: 'float' },
                review_count: { type: 'integer' }
              }
            },
            settings: {
              number_of_shards: 2,
              number_of_replicas: 1,
              analysis: {
                analyzer: {
                  business_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding', 'business_synonyms']
                  }
                },
                filter: {
                  business_synonyms: {
                    type: 'synonym',
                    synonyms: [
                      'inc,incorporated',
                      'ltd,limited',
                      'corp,corporation',
                      'co,company'
                    ]
                  }
                }
              }
            }
          }
        });

        logger.info('Elasticsearch businesses index created');
      }
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch index:', error);
    }
  }

  async indexBusiness(business: any): Promise<void> {
    try {
      await this.esClient.index({
        index: 'businesses',
        id: business.id,
        body: {
          id: business.id,
          business_name: business.business_name,
          legal_name: business.legal_name,
          description: business.description,
          slug: business.slug,
          industries: business.industries || [],
          services: business.services || [],
          city: business.city,
          province: business.province,
          country: business.country,
          location: business.latitude && business.longitude ? {
            lat: business.latitude,
            lon: business.longitude
          } : null,
          indigenous_ownership: business.indigenous_ownership,
          is_verified: business.is_verified || false,
          year_established: business.year_established,
          employee_count: business.employee_count,
          status: business.status,
          created_at: business.created_at,
          updated_at: business.updated_at,
          average_rating: business.average_rating || 0,
          review_count: business.review_count || 0
        }
      });

      await this.esClient.indices.refresh({ index: 'businesses' });
    } catch (error) {
      logger.error('Failed to index business:', error);
    }
  }

  async searchBusinesses(params: any): Promise<any> {
    const { query: searchQuery, filters, page = 1, limit = 20 } = params;
    
    // Check cache for common searches
    const cacheKey = `search:${JSON.stringify({ searchQuery, filters, page, limit })}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Build Elasticsearch query
      const must: any[] = [];
      const filter: any[] = [];

      // Text search
      if (searchQuery) {
        must.push({
          multi_match: {
            query: searchQuery,
            fields: [
              'business_name^3',
              'legal_name^2',
              'description',
              'services'
            ],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // Apply filters
      if (filters.industries && filters.industries.length > 0) {
        filter.push({
          terms: { industries: filters.industries }
        });
      }

      if (filters.province) {
        filter.push({
          term: { province: filters.province }
        });
      }

      if (filters.city) {
        filter.push({
          match: { city: filters.city }
        });
      }

      if (filters.indigenousOwned !== undefined) {
        filter.push({
          term: { indigenous_ownership: filters.indigenousOwned }
        });
      }

      if (filters.verified !== undefined) {
        filter.push({
          term: { is_verified: filters.verified }
        });
      }

      if (filters.yearEstablishedFrom) {
        filter.push({
          range: {
            year_established: { gte: filters.yearEstablishedFrom }
          }
        });
      }

      if (filters.employeeCountMin) {
        filter.push({
          range: {
            employee_count: { gte: filters.employeeCountMin }
          }
        });
      }

      // Geographic search
      if (filters.location && filters.radius) {
        filter.push({
          geo_distance: {
            distance: `${filters.radius}km`,
            location: {
              lat: filters.location.lat,
              lon: filters.location.lon
            }
          }
        });
      }

      // Status filter (exclude deleted)
      filter.push({
        terms: { status: ['active', 'pending_verification'] }
      });

      // Execute search
      const response = await this.esClient.search({
        index: 'businesses',
        body: {
          query: {
            bool: {
              must,
              filter
            }
          },
          sort: this.buildSort(filters.sortBy, filters.order),
          from: (page - 1) * limit,
          size: limit,
          highlight: {
            fields: {
              business_name: {},
              description: {}
            }
          },
          aggs: {
            industries: {
              terms: { field: 'industries', size: 20 }
            },
            provinces: {
              terms: { field: 'province', size: 13 }
            },
            verified_count: {
              filter: { term: { is_verified: true } }
            },
            indigenous_count: {
              filter: { term: { indigenous_ownership: true } }
            }
          }
        }
      });

      const results = {
        businesses: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score,
          highlights: hit.highlight
        })),
        pagination: {
          total: response.hits.total.value,
          page,
          limit,
          totalPages: Math.ceil(response.hits.total.value / limit)
        },
        aggregations: {
          industries: response.aggregations.industries.buckets,
          provinces: response.aggregations.provinces.buckets,
          verifiedCount: response.aggregations.verified_count.doc_count,
          indigenousCount: response.aggregations.indigenous_count.doc_count
        }
      };

      // Cache for 5 minutes
      await setCache(cacheKey, results, 300);

      return results;
    } catch (error) {
      logger.error('Elasticsearch search failed:', error);
      
      // Fallback to database search
      return this.databaseSearch(params);
    }
  }

  private buildSort(sortBy?: string, order: string = 'desc'): any[] {
    const sortOrder = order === 'asc' ? 'asc' : 'desc';
    
    switch (sortBy) {
      case 'relevance':
        return ['_score'];
      case 'name':
        return [{ 'business_name.keyword': sortOrder }];
      case 'rating':
        return [{ average_rating: sortOrder }, '_score'];
      case 'created':
        return [{ created_at: sortOrder }];
      case 'employees':
        return [{ employee_count: sortOrder }];
      default:
        return ['_score', { created_at: 'desc' }];
    }
  }

  async databaseSearch(params: any): Promise<any> {
    const { query: searchQuery, filters, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE b.deleted_at IS NULL AND b.status != \'deleted\'';
    const values: any[] = [];
    let paramCount = 1;

    // Text search using PostgreSQL full-text search
    if (searchQuery) {
      whereClause += ` AND (
        b.business_name ILIKE $${paramCount} OR
        b.legal_name ILIKE $${paramCount} OR
        b.description ILIKE $${paramCount}
      )`;
      values.push(`%${searchQuery}%`);
      paramCount++;
    }

    // Apply filters
    if (filters.industries && filters.industries.length > 0) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM business_industries bi 
        WHERE bi.business_id = b.id 
        AND bi.industry_code = ANY($${paramCount})
      )`;
      values.push(filters.industries);
      paramCount++;
    }

    if (filters.province) {
      whereClause += ` AND a.province = $${paramCount}`;
      values.push(filters.province);
      paramCount++;
    }

    if (filters.city) {
      whereClause += ` AND a.city ILIKE $${paramCount}`;
      values.push(`%${filters.city}%`);
      paramCount++;
    }

    if (filters.indigenousOwned !== undefined) {
      whereClause += ` AND b.indigenous_ownership = $${paramCount}`;
      values.push(filters.indigenousOwned);
      paramCount++;
    }

    // Add pagination
    values.push(limit, offset);

    const result = await query(
      `SELECT 
        b.*, 
        a.city, a.province, a.country,
        array_agg(DISTINCT i.industry_code) as industries,
        bs.average_rating, bs.review_count,
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
       ORDER BY b.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      values
    );

    // Count total
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

  async autocomplete(prefix: string): Promise<any[]> {
    try {
      const response = await this.esClient.search({
        index: 'businesses',
        body: {
          suggest: {
            business_suggest: {
              prefix: prefix,
              completion: {
                field: 'business_name.suggest',
                size: 10,
                skip_duplicates: true
              }
            }
          }
        }
      });

      return response.suggest.business_suggest[0].options.map((option: any) => ({
        id: option._source.id,
        name: option._source.business_name,
        slug: option._source.slug
      }));
    } catch (error) {
      logger.error('Autocomplete failed:', error);
      
      // Fallback to database
      const result = await query(
        `SELECT id, business_name, slug 
         FROM businesses 
         WHERE business_name ILIKE $1 
         AND deleted_at IS NULL 
         AND status = 'active'
         LIMIT 10`,
        [`${prefix}%`]
      );

      return result.rows;
    }
  }

  async reindexAllBusinesses(): Promise<void> {
    try {
      const businesses = await query(
        `SELECT b.*, 
          a.city, a.province, a.country, a.latitude, a.longitude,
          array_agg(DISTINCT i.industry_code) as industries,
          array_agg(DISTINCT s.service_name) as services,
          bs.average_rating, bs.review_count,
          CASE WHEN v.status = 'approved' THEN true ELSE false END as is_verified
         FROM businesses b
         LEFT JOIN business_addresses a ON b.id = a.business_id AND a.is_primary = true
         LEFT JOIN business_industries i ON b.id = i.business_id
         LEFT JOIN business_services s ON b.id = s.business_id
         LEFT JOIN business_stats bs ON b.id = bs.business_id
         LEFT JOIN business_verifications v ON b.id = v.business_id 
           AND v.verification_type = 'indigenous' 
           AND v.status = 'approved'
         WHERE b.deleted_at IS NULL
         GROUP BY b.id, a.city, a.province, a.country, a.latitude, a.longitude,
                  bs.average_rating, bs.review_count, v.status`
      );

      for (const business of businesses.rows) {
        await this.indexBusiness(business);
      }

      logger.info(`Reindexed ${businesses.rows.length} businesses`);
    } catch (error) {
      logger.error('Failed to reindex businesses:', error);
    }
  }

  async deleteBusiness(businessId: string): Promise<void> {
    try {
      await this.esClient.delete({
        index: 'businesses',
        id: businessId
      });
    } catch (error) {
      logger.error('Failed to delete business from index:', error);
    }
  }
}