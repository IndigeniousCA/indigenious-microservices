// Testing & QA Types
// Comprehensive type definitions for automated testing system

export interface TestCase {
  id: string
  name: string
  description: string
  category: TestCategory
  priority: TestPriority
  type: TestType
  tags: string[]
  steps: TestStep[]
  expectedResult: string
  actualResult?: string
  status?: TestStatus
  duration?: number
  error?: TestError
  createdAt: string
  updatedAt: string
  lastRun?: string
}

export type TestCategory = 
  | 'authentication'
  | 'registration'
  | 'rfq-management'
  | 'bidding'
  | 'messaging'
  | 'payment'
  | 'analytics'
  | 'admin'
  | 'security'
  | 'performance'
  | 'accessibility'

export type TestPriority = 'critical' | 'high' | 'medium' | 'low'

export type TestType = 
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'visual'
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'api'

export type TestStatus = 
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'flaky'

export interface TestStep {
  order: number
  action: string
  target?: string
  value?: string
  assertion?: string
  screenshot?: boolean
}

export interface TestError {
  message: string
  stack?: string
  screenshot?: string
  video?: string
  logs?: string[]
}

export interface TestSuite {
  id: string
  name: string
  description: string
  testCases: TestCase[]
  configuration: TestConfiguration
  schedule?: TestSchedule
  lastRun?: TestRun
  metrics: TestMetrics
}

export interface TestConfiguration {
  environment: TestEnvironment
  browser?: BrowserConfig[]
  device?: DeviceConfig[]
  viewport?: ViewportConfig[]
  baseUrl: string
  timeout: number
  retries: number
  parallel: boolean
  headless: boolean
  video: boolean
  screenshots: 'always' | 'on-failure' | 'never'
}

export interface TestEnvironment {
  name: 'development' | 'staging' | 'production'
  variables: Record<string, string>
  features: Record<string, boolean>
}

export interface BrowserConfig {
  name: 'chrome' | 'firefox' | 'safari' | 'edge'
  version?: string
  headless?: boolean
}

export interface DeviceConfig {
  name: string
  userAgent: string
  viewport: ViewportConfig
  hasTouch: boolean
}

export interface ViewportConfig {
  width: number
  height: number
  deviceScaleFactor?: number
  isMobile?: boolean
}

export interface TestSchedule {
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual'
  time?: string
  timezone?: string
  daysOfWeek?: number[]
  enabled: boolean
}

export interface TestRun {
  id: string
  suiteId: string
  startTime: string
  endTime?: string
  duration?: number
  status: TestRunStatus
  results: TestResult[]
  coverage?: CoverageReport
  performance?: PerformanceMetrics
  artifacts: TestArtifact[]
  triggeredBy: string
  environment: TestEnvironment
}

export type TestRunStatus = 
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface TestResult {
  testId: string
  testName: string
  status: TestStatus
  duration: number
  retries: number
  error?: TestError
  steps: TestStepResult[]
  artifacts: TestArtifact[]
}

export interface TestStepResult {
  step: TestStep
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
  screenshot?: string
}

export interface TestArtifact {
  type: 'screenshot' | 'video' | 'log' | 'har' | 'trace'
  path: string
  size: number
  timestamp: string
}

export interface TestMetrics {
  totalTests: number
  passedTests: number
  failedTests: number
  skippedTests: number
  flakyTests: number
  passRate: number
  avgDuration: number
  reliability: number
  trend: 'improving' | 'stable' | 'declining'
}

export interface CoverageReport {
  overall: CoverageMetric
  byFile: Record<string, CoverageMetric>
  byFunction: Record<string, CoverageMetric>
  uncoveredLines: UncoveredLine[]
}

export interface CoverageMetric {
  lines: CoverageDetail
  statements: CoverageDetail
  functions: CoverageDetail
  branches: CoverageDetail
}

export interface CoverageDetail {
  total: number
  covered: number
  percentage: number
}

export interface UncoveredLine {
  file: string
  line: number
  code: string
}

export interface PerformanceMetrics {
  pageLoad: TimingMetric
  apiCalls: ApiMetric[]
  resources: ResourceMetric[]
  lighthouse?: LighthouseScore
}

export interface TimingMetric {
  metric: string
  value: number
  threshold?: number
  status: 'good' | 'warning' | 'poor'
}

export interface ApiMetric {
  endpoint: string
  method: string
  duration: number
  size: number
  status: number
}

export interface ResourceMetric {
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'other'
  url: string
  size: number
  duration: number
}

export interface LighthouseScore {
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
  pwa: number
}

export interface HealthCheck {
  id: string
  name: string
  type: HealthCheckType
  target: string
  interval: number
  timeout: number
  expectedStatus?: number
  expectedResponse?: any
  lastCheck?: HealthCheckResult
  history: HealthCheckResult[]
  alerts: AlertConfig[]
}

export type HealthCheckType = 
  | 'http'
  | 'database'
  | 'service'
  | 'job'
  | 'integration'

export interface HealthCheckResult {
  timestamp: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  message?: string
  details?: Record<string, any>
}

export interface AlertConfig {
  id: string
  name: string
  condition: AlertCondition
  channels: AlertChannel[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  cooldown?: number
  lastTriggered?: string
}

export interface AlertCondition {
  type: 'threshold' | 'consecutive-failures' | 'pattern'
  metric: string
  operator: 'gt' | 'lt' | 'eq' | 'contains'
  value: unknown
  window?: number
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'sms' | 'webhook' | 'pagerduty'
  config: Record<string, any>
}

export interface TestReport {
  id: string
  name: string
  type: ReportType
  period: ReportPeriod
  data: ReportData
  insights: ReportInsight[]
  recommendations: string[]
  generatedAt: string
  format: 'html' | 'pdf' | 'json'
}

export type ReportType = 
  | 'summary'
  | 'detailed'
  | 'coverage'
  | 'performance'
  | 'security'
  | 'trends'

export interface ReportPeriod {
  start: string
  end: string
  granularity: 'hour' | 'day' | 'week' | 'month'
}

export interface ReportData {
  summary: TestMetrics
  testRuns: TestRun[]
  failures: TestFailure[]
  performance: PerformanceMetrics
  coverage: CoverageReport
  trends: TrendData[]
}

export interface TestFailure {
  test: TestCase
  error: TestError
  frequency: number
  firstSeen: string
  lastSeen: string
  impact: 'low' | 'medium' | 'high'
  assignee?: string
  status: 'open' | 'investigating' | 'fixed'
}

export interface TrendData {
  date: string
  metrics: TestMetrics
  performance: PerformanceMetrics
  incidents: number
}

export interface ReportInsight {
  type: 'improvement' | 'degradation' | 'anomaly' | 'achievement'
  title: string
  description: string
  metric?: string
  value?: number
  change?: number
  impact: 'low' | 'medium' | 'high'
}

export interface VisualTest {
  id: string
  name: string
  component: string
  viewport: ViewportConfig
  baseline: string
  current?: string
  diff?: string
  threshold: number
  status?: 'passed' | 'failed' | 'new' | 'updated'
  diffPercentage?: number
  regions?: IgnoreRegion[]
}

export interface IgnoreRegion {
  x: number
  y: number
  width: number
  height: number
  reason?: string
}

export interface AccessibilityTest {
  id: string
  page: string
  rules: A11yRule[]
  violations: A11yViolation[]
  passes: number
  warnings: number
  wcagLevel: 'A' | 'AA' | 'AAA'
}

export interface A11yRule {
  id: string
  description: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  tags: string[]
}

export interface A11yViolation {
  rule: A11yRule
  nodes: A11yNode[]
  help: string
  helpUrl: string
}

export interface A11yNode {
  html: string
  target: string[]
  impact: string
  message: string
}