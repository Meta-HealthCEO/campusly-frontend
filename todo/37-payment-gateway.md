# TODO 37 — Payment Gateway Integration (Online Payments)

> **Priority:** CRITICAL — If parents can pay from their phone, collection rates increase 30-50%. This is the #1 revenue-enabling feature.

## Context
Todo #05 mentions payment gateway briefly. This document provides the full implementation spec. South African schools need PayFast (dominant), Yoco (growing), and Paystack (pan-African). International: Stripe.

---

## 1. Payment Gateway Abstraction Layer

### 1a. Gateway Provider Interface
- Abstract interface so multiple gateways can be plugged in
- School selects their preferred gateway in settings
- Each gateway implements: `initiatePayment`, `verifyPayment`, `refund`, `getTransactionStatus`
- Webhook handler per gateway for async payment confirmations

### 1b. Supported Gateways
| Gateway | Market | Card | EFT | Instant EFT | QR Code |
|---------|--------|------|-----|-------------|---------|
| PayFast | SA Primary | Yes | Yes | Yes | No |
| Yoco | SA Growing | Yes | No | No | Yes |
| Paystack | Pan-African | Yes | No | No | No |
| Stripe | International | Yes | No | No | No |
| SnapScan | SA QR | No | No | No | Yes |

---

## 2. PayFast Integration (Primary — SA Standard)

### 2a. Configuration
- Merchant ID, Merchant Key, Passphrase per school
- Sandbox mode for testing
- ITN (Instant Transaction Notification) webhook URL

### 2b. Payment Flow
1. Parent clicks "Pay Now" on invoice
2. Backend generates PayFast payment form data (amount, item name, return URLs)
3. Parent redirected to PayFast hosted payment page
4. PayFast processes payment
5. ITN webhook confirms payment → auto-allocate to invoice
6. Parent redirected to success page
7. Receipt auto-generated and sent via WhatsApp/email

### 2c. Recurring Payments (Debit Orders)
- PayFast subscription API for monthly fee collection
- Parent sets up once, auto-collected monthly
- Failed payment notifications
- Retry logic (PayFast handles retries)

---

## 3. Parent Payment Portal

### 3a. Invoice Payment Page
- Parent sees outstanding invoices with amounts
- Select single or multiple invoices to pay
- Choose payment method: card, EFT, instant EFT, SnapScan
- Partial payment support (pay what you can)
- Payment confirmation screen with receipt number

### 3b. Quick Pay
- Deep link from WhatsApp/SMS → direct to payment page
- Pre-filled with invoice details
- One-tap payment for returning parents (saved card via gateway tokenisation)

### 3c. Payment History
- All online payments with status (paid, pending, failed, refunded)
- Downloadable receipts (PDF)
- Transaction reference numbers

### 3d. Multi-Child Payment
- Parent with multiple children sees consolidated view
- Select invoices across children
- Single payment for all selected invoices
- Allocation automatically split per child

---

## 4. Wallet Top-Up via Gateway

### 4a. Online Wallet Loading
- Parent clicks "Top Up Wallet" → redirected to payment gateway
- Select amount (preset: R50, R100, R200, R500, custom)
- Payment processed → wallet balance updated immediately
- Confirmation notification via WhatsApp

### 4b. Auto Top-Up
- Parent sets threshold: "Top up R200 when balance drops below R50"
- Uses saved card token (PayFast tokenisation)
- Auto-charge with notification
- Parent can cancel/modify anytime

---

## 5. Event Ticket & Uniform Payments

### 5a. Event Ticket Purchase
- Integrate gateway into event ticket flow
- Parent buys ticket → payment → QR ticket generated
- Refund capability for cancelled events

### 5b. Uniform Order Payment
- Integrate gateway into uniform ordering
- Pay on order → fulfillment begins
- Payment confirmation triggers order status change

### 5c. Fundraising Donations
- One-click donate via payment gateway
- Recurring donation setup
- Tax certificate auto-generated

---

## 6. Admin Payment Dashboard

### 6a. Online Payment Overview
- Total collected online (today, this week, this month)
- Payment method breakdown (card vs EFT vs QR)
- Failed payment alerts
- Gateway fee tracking (know your costs)

### 6b. Reconciliation
- Auto-match gateway transactions to Campusly invoices
- Flag mismatches
- Settlement reports (when money hits school bank account)
- Gateway payout tracking

### 6c. Refund Management
- Process refunds from Campusly (pushes to gateway)
- Refund reason tracking
- Partial refund support
- Refund approval workflow

---

## Data Models

```typescript
interface PaymentGatewayConfig {
  schoolId: string;
  provider: 'payfast' | 'yoco' | 'paystack' | 'stripe' | 'snapscan';
  credentials: {
    merchantId?: string;
    merchantKey?: string;
    passphrase?: string;
    apiKey?: string;
    secretKey?: string;
  };
  sandboxMode: boolean;
  webhookUrl: string;
  enabled: boolean;
}

interface OnlinePayment {
  schoolId: string;
  parentId: string;
  invoiceIds: string[];
  amount: number; // cents
  currency: 'ZAR';
  provider: string;
  externalTransactionId: string;
  status: 'initiated' | 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'card' | 'eft' | 'instant_eft' | 'qr_code';
  gatewayFee: number; // cents
  netAmount: number; // cents
  receiptNumber: string;
  metadata: Record<string, string>;
  initiatedAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

interface SavedPaymentMethod {
  parentId: string;
  provider: string;
  token: string;
  last4: string;
  cardBrand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}
```

## API Endpoints
- `POST /api/payments/initiate` — Start payment flow
- `POST /api/payments/webhook/:provider` — Receive payment confirmations
- `GET /api/payments/status/:transactionId` — Check payment status
- `POST /api/payments/refund` — Process refund
- `GET /api/payments/online` — List online payments
- `GET /api/payments/reconciliation` — Reconciliation report
- `PUT /api/payments/gateway-config` — Configure gateway
- `GET /api/payments/gateway-config` — Get gateway config
- `POST /api/payments/wallet-topup` — Initiate wallet top-up
- `GET /api/payments/saved-methods` — Get saved payment methods
- `DELETE /api/payments/saved-methods/:id` — Remove saved method

## Frontend Pages
- `/admin/settings/payments` — Gateway configuration
- Enhanced `/parent/fees` — "Pay Now" buttons on invoices
- `/parent/fees/pay` — Payment checkout page
- `/parent/fees/pay/success` — Payment confirmation
- Enhanced `/parent/wallet` — Online top-up button
- Enhanced `/admin/fees` — Online payment analytics tab

## Revenue Model
- Payment gateway is a **core feature** (not bolt-on) — it drives collection
- Campusly takes 0.5-1% convenience fee on top of gateway fee (revenue stream)
- Or: flat monthly fee for unlimited online payments (R500-1500/month per school)
- Gateway fees passed through to parent or absorbed by school (configurable)
