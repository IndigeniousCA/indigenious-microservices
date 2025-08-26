export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationRecipient {
  id: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  userId?: string;
}

export interface NotificationContent {
  subject?: string;
  title?: string;
  body: string;
  html?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
  url?: string;
}

export interface NotificationOptions {
  channel: NotificationChannel;
  recipients: NotificationRecipient[];
  content: NotificationContent;
  priority?: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  templateId?: string;
  templateData?: Record<string, any>;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface NotificationResult {
  id: string;
  status: NotificationStatus;
  channel: NotificationChannel;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface NotificationEvent {
  id: string;
  notificationId: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  timestamp: Date;
  data?: Record<string, any>;
}

export interface BulkNotificationOptions {
  channel: NotificationChannel;
  recipients: NotificationRecipient[];
  template: string;
  templateData?: Record<string, any>;
  personalizations?: Array<{
    recipientId: string;
    data: Record<string, any>;
  }>;
  priority?: NotificationPriority;
  scheduledFor?: Date;
  batchSize?: number;
  metadata?: Record<string, any>;
}

export interface NotificationStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
}

export interface NotificationFilter {
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  category?: string;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
  recipientId?: string;
  limit?: number;
  offset?: number;
}

export interface IndigenousNotificationData {
  businessName?: string;
  bandNumber?: string;
  category?: string;
  region?: string;
  certified?: boolean;
  rfqMatch?: {
    score: number;
    reasons: string[];
  };
}

export interface RFQNotificationData {
  rfqId: string;
  rfqNumber: string;
  title: string;
  category: string;
  deadline: Date;
  estimatedValue: string;
  indigenousSetAside?: boolean;
  matchScore?: number;
}

export interface PaymentNotificationData {
  paymentId: string;
  amount: string;
  currency: string;
  method: string;
  reference: string;
  status: string;
  taxExempt?: boolean;
}

export interface DocumentNotificationData {
  documentId: string;
  documentName: string;
  documentType: string;
  action: 'uploaded' | 'verified' | 'rejected' | 'expired';
  reason?: string;
  expiresAt?: Date;
}