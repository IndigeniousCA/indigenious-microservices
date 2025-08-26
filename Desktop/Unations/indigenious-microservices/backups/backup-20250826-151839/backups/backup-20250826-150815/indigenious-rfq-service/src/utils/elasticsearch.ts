import { Client } from '@elastic/elasticsearch';
import { logger } from './logger';

let esClient: Client | null = null;

export async function initializeElasticsearch(): Promise<void> {
  try {
    esClient = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      },
      maxRetries: 5,
      requestTimeout: 60000,
      sniffOnStart: true,
      sniffInterval: 60000,
      sniffOnConnectionFault: true
    });

    // Test connection
    const health = await esClient.cluster.health();
    logger.info(`Elasticsearch connected: ${health.cluster_name} (${health.status})`);

    // Initialize RFQ indices
    await initializeRFQIndices();
  } catch (error) {
    logger.error('Failed to connect to Elasticsearch:', error);
    throw error;
  }
}

export function getElasticsearchClient(): Client {
  if (!esClient) {
    throw new Error('Elasticsearch client not initialized');
  }
  return esClient;
}

async function initializeRFQIndices(): Promise<void> {
  if (!esClient) return;

  try {
    // RFQ index
    const rfqExists = await esClient.indices.exists({ index: 'rfqs' });
    if (!rfqExists) {
      await esClient.indices.create({
        index: 'rfqs',
        body: {
          mappings: {
            properties: {
              title: { type: 'text', analyzer: 'standard' },
              description: { type: 'text', analyzer: 'standard' },
              category: { type: 'keyword' },
              subcategory: { type: 'keyword' },
              location: { type: 'geo_point' },
              budget_min: { type: 'float' },
              budget_max: { type: 'float' },
              closing_date: { type: 'date' },
              status: { type: 'keyword' },
              government_entity: { type: 'keyword' },
              indigenous_only: { type: 'boolean' },
              skills_required: { type: 'keyword' },
              created_at: { type: 'date' },
              updated_at: { type: 'date' }
            }
          }
        }
      });
      logger.info('RFQ index created');
    }

    // Bid index
    const bidExists = await esClient.indices.exists({ index: 'bids' });
    if (!bidExists) {
      await esClient.indices.create({
        index: 'bids',
        body: {
          mappings: {
            properties: {
              rfq_id: { type: 'keyword' },
              business_id: { type: 'keyword' },
              amount: { type: 'float' },
              timeline: { type: 'integer' },
              score: { type: 'float' },
              status: { type: 'keyword' },
              submitted_at: { type: 'date' },
              updated_at: { type: 'date' }
            }
          }
        }
      });
      logger.info('Bid index created');
    }
  } catch (error) {
    logger.error('Failed to initialize indices:', error);
  }
}

export async function indexRFQ(rfq: any): Promise<void> {
  if (!esClient) return;

  try {
    await esClient.index({
      index: 'rfqs',
      id: rfq.id,
      body: {
        title: rfq.title,
        description: rfq.description,
        category: rfq.category,
        subcategory: rfq.subcategory,
        location: rfq.location ? {
          lat: rfq.location.latitude,
          lon: rfq.location.longitude
        } : null,
        budget_min: rfq.budget_min,
        budget_max: rfq.budget_max,
        closing_date: rfq.closing_date,
        status: rfq.status,
        government_entity: rfq.government_entity,
        indigenous_only: rfq.indigenous_only,
        skills_required: rfq.skills_required,
        created_at: rfq.created_at,
        updated_at: rfq.updated_at
      }
    });
  } catch (error) {
    logger.error('Failed to index RFQ:', error);
  }
}

export async function searchRFQs(params: {
  query?: string;
  category?: string;
  location?: { lat: number; lon: number; distance?: string };
  budget_range?: { min?: number; max?: number };
  indigenous_only?: boolean;
  skills?: string[];
  page?: number;
  limit?: number;
}): Promise<any> {
  if (!esClient) throw new Error('Elasticsearch not initialized');

  const { query, category, location, budget_range, indigenous_only, skills, page = 1, limit = 20 } = params;

  const searchBody: any = {
    query: {
      bool: {
        must: [],
        filter: []
      }
    },
    sort: [
      { created_at: { order: 'desc' } }
    ],
    from: (page - 1) * limit,
    size: limit
  };

  // Text search
  if (query) {
    searchBody.query.bool.must.push({
      multi_match: {
        query,
        fields: ['title^2', 'description', 'skills_required'],
        type: 'best_fields',
        fuzziness: 'AUTO'
      }
    });
  }

  // Category filter
  if (category) {
    searchBody.query.bool.filter.push({
      term: { category }
    });
  }

  // Location filter
  if (location) {
    searchBody.query.bool.filter.push({
      geo_distance: {
        distance: location.distance || '50km',
        location: {
          lat: location.lat,
          lon: location.lon
        }
      }
    });
  }

  // Budget range filter
  if (budget_range) {
    const budgetFilter: any = {};
    if (budget_range.min !== undefined) {
      budgetFilter.gte = budget_range.min;
    }
    if (budget_range.max !== undefined) {
      budgetFilter.lte = budget_range.max;
    }
    if (Object.keys(budgetFilter).length > 0) {
      searchBody.query.bool.filter.push({
        range: { budget_max: budgetFilter }
      });
    }
  }

  // Indigenous only filter
  if (indigenous_only !== undefined) {
    searchBody.query.bool.filter.push({
      term: { indigenous_only }
    });
  }

  // Skills filter
  if (skills && skills.length > 0) {
    searchBody.query.bool.filter.push({
      terms: { skills_required: skills }
    });
  }

  // Only show open RFQs
  searchBody.query.bool.filter.push({
    term: { status: 'open' }
  });

  try {
    const response = await esClient.search({
      index: 'rfqs',
      body: searchBody
    });

    return {
      rfqs: response.hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source
      })),
      total: response.hits.total?.value || 0,
      page,
      limit
    };
  } catch (error) {
    logger.error('RFQ search error:', error);
    throw error;
  }
}

export async function findMatchingRFQs(businessProfile: {
  industries: string[];
  skills: string[];
  location?: { lat: number; lon: number };
  capacity?: string;
}): Promise<any[]> {
  if (!esClient) return [];

  const searchBody: any = {
    query: {
      bool: {
        should: [],
        filter: [
          { term: { status: 'open' } }
        ]
      }
    },
    sort: [
      { closing_date: { order: 'asc' } }
    ],
    size: 50
  };

  // Match industries/categories
  if (businessProfile.industries.length > 0) {
    searchBody.query.bool.should.push({
      terms: { category: businessProfile.industries }
    });
  }

  // Match skills
  if (businessProfile.skills.length > 0) {
    searchBody.query.bool.should.push({
      terms: { skills_required: businessProfile.skills }
    });
  }

  // Location proximity boost
  if (businessProfile.location) {
    searchBody.query.bool.should.push({
      geo_distance: {
        distance: '100km',
        location: businessProfile.location,
        boost: 2.0
      }
    });
  }

  try {
    const response = await esClient.search({
      index: 'rfqs',
      body: searchBody
    });

    return response.hits.hits.map((hit: any) => ({
      id: hit._id,
      score: hit._score,
      ...hit._source
    }));
  } catch (error) {
    logger.error('RFQ matching error:', error);
    return [];
  }
}

export async function closeElasticsearch(): Promise<void> {
  if (esClient) {
    await esClient.close();
    esClient = null;
    logger.info('Elasticsearch connection closed');
  }
}