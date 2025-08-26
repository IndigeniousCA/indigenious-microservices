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

export async function closeElasticsearch(): Promise<void> {
  if (esClient) {
    await esClient.close();
    esClient = null;
    logger.info('Elasticsearch connection closed');
  }
}