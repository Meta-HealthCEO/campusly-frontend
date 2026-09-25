export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
export type PlanInterval = 'month' | 'year' | null;
export type SubscriberType = 'teacher' | 'student' | 'school';

export interface Plan {
  id: string;
  code: 'free' | 'pro_monthly' | 'pro_annual' | string;
  name: string;
  description?: string;
  subscriberType: SubscriberType;
  amountExclTax: number;
  taxRate: number;
  currency: string;
  interval: PlanInterval;
  trialDays: number;
  entitlements: Record<string, unknown>;
  isActive: boolean;
  displayOrder: number;
}

export interface Subscription {
  id: string;
  schoolId: string;
  subscriberType: SubscriberType;
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
  cardLastFour: string | null;
  cardBrand: string | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  retryCount: number;
  nextRetryAt: string | null;
  lastFailureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionInvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  planCode: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency: string;
  status: SubscriptionInvoiceStatus;
  merchantReference: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  refundedAmount: number;
  purpose: 'verification' | 'subscription';
  createdAt: string;
}

export interface CheckoutInitResponse {
  paymentKey: string;
  sessionId: string;
  redirectUrl: string;
}

export interface CheckoutSessionStatus {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  planCode: string;
}
