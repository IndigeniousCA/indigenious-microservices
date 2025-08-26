export interface DashboardStats {
  totalDiscovered: number;
  indigenousIdentified: number;
  targetBusinesses: number;
  activeHunters: number;
  totalHunters: number;
  discoveryRate: number;
  verificationRate: number;
  enrichmentRate: number;
  queueDepth: number;
  queues: {
    discovery: number;
    validation: number;
    enrichment: number;
    export: number;
  };
}

export interface HunterStatus {
  id: string;
  name: string;
  type: 'government' | 'indigenous_org' | 'social_media' | 'registry';
  status: 'active' | 'idle' | 'error' | 'offline';
  discovered: number;
  successRate: number;
  errorRate: number;
  lastActive: Date;
  uptime: number;
  currentTarget?: string;
  metrics: {
    requestsPerMinute: number;
    avgResponseTime: number;
    blockedRequests: number;
  };
}

export interface DiscoveryMetrics {
  timeline: Array<{
    time: string;
    discovered: number;
    verified: number;
    enriched: number;
  }>;
  sourceDistribution: Array<{
    name: string;
    value: number;
  }>;
  provincialDistribution: Array<{
    province: string;
    count: number;
    indigenousCount: number;
  }>;
  errorRates: Array<{
    time: string;
    rate: number;
    count: number;
  }>;
  dataQuality: {
    completeness: number;
    accuracy: number;
    duplicates: number;
    enriched: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  cpu: number;
  memory: number;
  disk: number;
  network: {
    inbound: number;
    outbound: number;
  };
  services: {
    redis: boolean;
    postgres: boolean;
    hunters: boolean;
    enrichers: boolean;
  };
  alerts: Array<{
    severity: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

export interface RealtimeUpdate {
  type: 'discovery' | 'validation' | 'enrichment' | 'error' | 'hunter_status';
  timestamp: Date;
  data: any;
}

export interface DashboardFilters {
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  hunterType?: string;
  province?: string;
  status?: string;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  filters: {
    verified?: boolean;
    indigenous?: boolean;
    enriched?: boolean;
    provinces?: string[];
    dateRange?: {
      from: Date;
      to: Date;
    };
  };
  includeFields: string[];
}