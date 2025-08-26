// Indigenous Business Directory API Types

export interface APIClient {
  id: string
  organizationName: string
  contactName: string
  email: string
  phone?: string
  apiKey: string
  secretKey: string
  status: 'active' | 'suspended' | 'pending' | 'expired'
  tier: 'basic' | 'professional' | 'enterprise'
  createdDate: Date
  expiryDate?: Date
  billing: BillingInfo
  usage: UsageStats
  permissions: APIPermissions
  webhooks?: Webhook[]
  ipWhitelist?: string[]
}

export interface BillingInfo {
  plan: 'monthly' | 'annual' | 'pay-per-use'
  amount: number
  currency: string
  nextBillingDate?: Date
  paymentMethod?: string
  invoices: Invoice[]
  credits?: number
}

export interface Invoice {
  id: string
  date: Date
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  downloadUrl?: string
}

export interface UsageStats {
  currentPeriod: {
    requests: number
    uniqueBusinessesAccessed: number
    dataDownloaded: number // MB
    lastRequest?: Date
  }
  limits: {
    requestsPerMonth: number
    requestsPerMinute: number
    resultsPerRequest: number
    dataDownloadLimit: number // MB
  }
  historical: UsagePeriod[]
}

export interface UsagePeriod {
  period: string
  requests: number
  businesses: number
  dataVolume: number
  cost: number
}

export interface APIPermissions {
  endpoints: EndpointPermission[]
  dataFields: string[]
  exportFormats: ('json' | 'csv' | 'xml')[]
  features: APIFeature[]
}

export interface EndpointPermission {
  path: string
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[]
  rateLimit?: number
  requiresApproval?: boolean
}

export interface APIFeature {
  name: string
  enabled: boolean
  config?: Record<string, any>
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  lastPing?: Date
  failureCount: number
}

// API Request/Response Types
export interface APIRequest {
  endpoint: string
  method: string
  headers: Record<string, string>
  query?: Record<string, any>
  body?: any
  timestamp: Date
  ip: string
  userAgent: string
}

export interface APIResponse {
  status: number
  data?: any
  error?: APIError
  metadata: ResponseMetadata
  timestamp: Date
}

export interface APIError {
  code: string
  message: string
  details?: Record<string, any>
  documentation?: string
}

export interface ResponseMetadata {
  requestId: string
  processingTime: number
  version: string
  rateLimit: {
    limit: number
    remaining: number
    reset: Date
  }
  pagination?: {
    page: number
    perPage: number
    total: number
    hasMore: boolean
  }
}

// Business Directory Types
export interface BusinessSearchParams {
  query?: string
  categories?: string[]
  certifications?: string[]
  location?: {
    latitude?: number
    longitude?: number
    radius?: number
    city?: string
    province?: string
  }
  size?: 'micro' | 'small' | 'medium' | 'large'
  indigenousOwnership?: {
    min?: number
    max?: number
  }
  capabilities?: string[]
  naicsCode?: string[]
  verified?: boolean
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface BusinessResult {
  id: string
  businessName: string
  legalName?: string
  description?: string
  logo?: string
  website?: string
  email?: string
  phone?: string
  address: {
    street?: string
    city: string
    province: string
    postalCode?: string
    country: string
  }
  indigenousInfo: {
    ownershipPercentage: number
    nation?: string
    certifications: Certification[]
    communityAffiliation?: string
  }
  businessInfo: {
    established?: Date
    employeeCount?: number
    revenue?: string
    naicsCode?: string[]
    categories: string[]
    capabilities: string[]
  }
  verification: {
    status: 'verified' | 'pending' | 'unverified'
    lastVerified?: Date
    verifiedBy?: string
  }
  performance?: {
    completedContracts?: number
    totalValue?: number
    avgRating?: number
    onTimeDelivery?: number
  }
}

export interface Certification {
  type: string
  issuer: string
  number?: string
  issueDate?: Date
  expiryDate?: Date
  status: 'active' | 'expired' | 'pending'
}

// API Management Types
export interface APIEndpoint {
  path: string
  method: string
  description: string
  authentication: 'apiKey' | 'oauth' | 'jwt'
  parameters: Parameter[]
  responses: ResponseSchema[]
  examples: Example[]
  rateLimit?: string
  version: string
  deprecated?: boolean
  tags: string[]
}

export interface Parameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required: boolean
  description: string
  location: 'query' | 'path' | 'header' | 'body'
  default?: any
  enum?: unknown[]
  validation?: string
}

export interface ResponseSchema {
  status: number
  description: string
  schema: any // JSON Schema
  examples?: unknown[]
}

export interface Example {
  title: string
  description?: string
  request: {
    params?: Record<string, any>
    headers?: Record<string, string>
    body?: any
  }
  response: {
    status: number
    body: any
  }
}

// Analytics Types
export interface APIAnalytics {
  overview: {
    totalClients: number
    activeClients: number
    totalRequests: number
    revenue: number
    avgResponseTime: number
    uptime: number
  }
  topEndpoints: EndpointStats[]
  topClients: ClientStats[]
  errorRates: ErrorStats[]
  geographicDistribution: GeoStats[]
  timeSeriesData: TimeSeriesData[]
}

export interface EndpointStats {
  endpoint: string
  requests: number
  avgResponseTime: number
  errorRate: number
  dataTransferred: number
}

export interface ClientStats {
  clientId: string
  organizationName: string
  requests: number
  revenue: number
  lastActive: Date
  tier: string
}

export interface ErrorStats {
  errorCode: string
  count: number
  percentage: number
  trend: 'increasing' | 'stable' | 'decreasing'
}

export interface GeoStats {
  country: string
  region?: string
  requests: number
  uniqueClients: number
}

export interface TimeSeriesData {
  timestamp: Date
  requests: number
  errors: number
  responseTime: number
  activeClients: number
}

// Subscription Plans
export interface SubscriptionPlan {
  id: string
  name: string
  tier: 'basic' | 'professional' | 'enterprise'
  price: {
    monthly: number
    annual: number
    currency: string
  }
  features: PlanFeature[]
  limits: {
    requestsPerMonth: number
    requestsPerMinute: number
    resultsPerRequest: number
    dataExportGB: number
    supportLevel: 'community' | 'email' | 'priority' | 'dedicated'
    sla?: number // uptime percentage
  }
  popular?: boolean
}

export interface PlanFeature {
  name: string
  included: boolean
  limit?: number
  description: string
}

// SDK Types
export interface SDKConfig {
  language: 'javascript' | 'python' | 'java' | 'csharp' | 'go' | 'ruby'
  version: string
  downloadUrl: string
  documentation: string
  examples: string
  lastUpdated: Date
}

export interface SDKClient {
  apiKey: string
  baseUrl?: string
  timeout?: number
  retries?: number
  debug?: boolean
}