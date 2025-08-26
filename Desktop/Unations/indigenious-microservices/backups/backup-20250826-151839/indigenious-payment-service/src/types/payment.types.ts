export interface PaymentProvider {
  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent>;
  
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<boolean>;
  
  refundPayment(refundRequest: RefundRequest): Promise<boolean>;
  
  createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, any>
  ): Promise<any>;
  
  cancelSubscription(subscriptionId: string): Promise<boolean>;
  
  createCustomer(email: string, metadata?: Record<string, any>): Promise<string>;
  
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<boolean>;
  
  getPaymentMethods(customerId: string): Promise<PaymentMethod[]>;
  
  validateAmount(amount: number): Promise<boolean>;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  additionalData?: Record<string, any>;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
  requestedBy: string;
  businessId: string;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'refunding';

export interface Payment {
  id: string;
  externalId: string;
  provider: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  businessId?: string;
  metadata?: Record<string, any>;
  taxAmount?: number;
  createdAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  cancelledAt?: Date;
  failureReason?: string;
}

export interface Subscription {
  id: string;
  externalId: string;
  customerId: string;
  priceId?: string;
  planId?: string;
  status: string;
  provider: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  metadata?: Record<string, any>;
}

export interface Customer {
  id: string;
  externalId: string;
  email: string;
  provider: string;
  metadata?: Record<string, any>;
}

export interface Refund {
  id: string;
  externalId: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: string;
  provider: string;
  requestedBy: string;
  processedAt?: Date;
}

export interface QuickPayRequest {
  contractId: string;
  businessId: string;
  amount: number;
  invoiceNumber: string;
  supportingDocs?: string[];
}

export interface BulkPayment {
  businessId: string;
  amount: number;
  email: string;
  invoiceNumber?: string;
}

export interface TaxExemption {
  isExempt: boolean;
  reason?: string;
  certificateNumber?: string;
  validUntil?: Date;
}