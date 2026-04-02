// ============================================================
// Payment Gateway Types
// ============================================================

export type PaymentProvider = 'payfast' | 'yoco' | 'paystack' | 'stripe';
export type OnlinePaymentStatus = 'initiated' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type PaymentType = 'fee_payment' | 'wallet_topup' | 'event_ticket' | 'uniform_order' | 'donation';

export interface PaymentGatewayConfig {
  id: string;
  provider: PaymentProvider;
  credentials: {
    merchantId: string;
    merchantKey: string;
    passphrase: string;
    sandboxMode: boolean;
  };
  enabled: boolean;
}

export interface OnlinePayment {
  id: string;
  parentId: string;
  studentId?: string;
  invoiceIds: string[];
  walletId?: string;
  paymentType: PaymentType;
  amount: number;
  currency: string;
  provider: string;
  externalTransactionId?: string;
  status: OnlinePaymentStatus;
  paymentMethod?: string;
  gatewayFee: number;
  netAmount: number;
  receiptNumber?: string;
  initiatedAt: string;
  completedAt?: string;
  failureReason?: string;
  parentName?: string;
}

export interface PaymentAnalytics {
  todayTotal: number;
  weekTotal: number;
  monthTotal: number;
  methodBreakdown: { method: string; total: number; count: number }[];
  failedCount: number;
}

export interface InitiatePaymentPayload {
  invoiceIds: string[];
  returnUrl: string;
  cancelUrl: string;
}

export interface InitiateWalletTopupPayload {
  walletId: string;
  amount: number;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentFormData {
  paymentId: string;
  formData: Record<string, string>;
  paymentUrl: string;
}
