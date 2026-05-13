# Teacher Subscriptions — OneGate Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [docs/superpowers/specs/2026-05-13-teacher-subscriptions-onegate-integration-design.md](../specs/2026-05-13-teacher-subscriptions-onegate-integration-design.md)

**Goal:** Ship teacher subscriptions (Free / Pro Monthly R149 / Pro Annual R1,490 + 14-day trial) integrated with OneGate via the Checkout Widget v4, with self-driven recurring billing, dunning, cancellation, entitlement-based feature gating, and a 90-day grandfather window for existing standalone teachers.

**Architecture:** New backend module `subscription/` (models + service + routes + webhook + cron worker) and OneGate client wrapper at `src/lib/onegate/`. Frontend adds `src/components/subscription/`, `src/app/(dashboard)/subscription/`, `src/app/(dashboard)/my/billing/`, plus hooks. Recurring billing driven by a BullMQ scheduled job — not OneGate's payment-schedule — for full control over dunning + cancellations.

**Tech Stack:** Vitest (tests), Mongoose (models), Express (routes), Zod v4 (validation), BullMQ + Redis (cron), Next.js 16 App Router, Zustand (state), axios (HTTP), Tailwind v4, react-hook-form, OneGate Checkout Widget v4.

**Conventions to follow:**
- Backend services are **static-method classes** (e.g. `SubscriptionService.startTrial(...)`) per existing `AuditService` pattern
- Test files at `src/modules/<name>/__tests__/<name>.test.ts` using Vitest + live `MONGODB_TEST_URI`
- Validation: Zod schemas in `validation.ts`, parsed manually in controllers
- Routes mounted in `src/app.ts`; auth via `authenticate` middleware, capability via `requireCapability`
- File size cap: **350 lines** (CLAUDE.md). Split before exceeding.
- No `any` types. `catch (err: unknown)`. Import types with `import type`.
- Commit at the end of every task. Single branch (`master`).

---

## Phase 0 — Tokenisation Spike (P0 Gate)

**This phase must complete and pass before any other phase begins.** Its purpose is to validate that the Checkout Widget v4 can tokenise a card for later token-on-file charges, with or without the R1 verification refund pattern.

---

### Task 0.1: Throwaway spike script — auth header signing

**Files:**
- Create: `campusly-backend/scripts/onegate-spike.ts`

- [ ] **Step 1: Create the spike script**

```ts
// campusly-backend/scripts/onegate-spike.ts
import 'dotenv/config';
import crypto from 'crypto';
import axios from 'axios';

const BASE = process.env.ONEGATE_BASE_URL ?? 'https://payments.onegate.co.za';
const ORG = process.env.ONEGATE_ORG_ID!;
const SALT = process.env.ONEGATE_SALT!;

function signHeaders(): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const token = crypto.createHash('sha256').update(`${SALT}_${ORG}_${ts}`).digest('hex');
  return { 'Auth-Token': token, 'Org-Id': ORG, 'Timestamp': ts };
}

async function main() {
  console.log('Spike 1: GET /organisation/{id}/services');
  const services = await axios.get(`${BASE}/api/v2/organisation/${ORG}/services`, { headers: signHeaders() });
  console.log('Services:', JSON.stringify(services.data, null, 2));
}

main().catch((err) => { console.error(err.response?.data ?? err); process.exit(1); });
```

- [ ] **Step 2: Add env vars to `.env`**

Append to `campusly-backend/.env`:

```
ONEGATE_ORG_ID=21234
ONEGATE_SALT=pytJyMIucGoyxM-4jiYu
ONEGATE_BASE_URL=https://payments.onegate.co.za
```

- [ ] **Step 3: Run the spike**

Run: `npx tsx scripts/onegate-spike.ts` (from `campusly-backend/`)
Expected: JSON list of services for org 21234 (EftX, Direct, Apple Pay, Google Pay, Absa Pay). Confirms auth signing works.

- [ ] **Step 4: Commit**

```bash
git add campusly-backend/scripts/onegate-spike.ts campusly-backend/.env.example
git commit -m "spike: OneGate auth signing smoke test"
```

(Do **not** commit `.env` — add `ONEGATE_*` placeholders to `.env.example` instead.)

---

### Task 0.2: Spike — payment-key + widget tokenisation

**Files:**
- Modify: `campusly-backend/scripts/onegate-spike.ts`
- Create: `campusly-backend/scripts/onegate-widget-test.html`

- [ ] **Step 1: Extend the spike to mint a payment-key**

Append to `campusly-backend/scripts/onegate-spike.ts`:

```ts
async function mintKey() {
  const ref = 'spike_' + Math.random().toString(36).slice(2, 10);
  const res = await axios.post(`${BASE}/api/v2/payment-key`, {
    payment_type: 'credit_card',
    amount: '1.00',
    merchant_reference: ref,
    success_url: 'http://localhost:3500/spike/success',
    error_url: 'http://localhost:3500/spike/error',
    pending_url: 'http://localhost:3500/spike/pending',
    notify_url: 'http://localhost:4500/api/webhooks/onegate-spike',
  }, { headers: signHeaders() });
  console.log('Payment key:', res.data);
  return res.data.key as string;
}

// Replace main() with:
async function main() {
  const key = await mintKey();
  console.log(`\nNow open scripts/onegate-widget-test.html in a browser, paste this key into the prompt: ${key}`);
}
```

- [ ] **Step 2: Create the widget test page**

```html
<!-- campusly-backend/scripts/onegate-widget-test.html -->
<!doctype html>
<html><head><meta charset="utf-8"><title>OneGate Widget Spike</title></head>
<body>
<button id="pay">Pay with widget</button>
<pre id="result"></pre>
<script src="https://payments.onegate.co.za/ext/checkout/v4/checkout.js"></script>
<script>
document.getElementById('pay').onclick = () => {
  const key = prompt('Paste payment_key:');
  if (!key) return;
  Checkout.init({
    paymentKey: key,
    onComplete: (data) => { document.getElementById('result').textContent = 'COMPLETE: ' + JSON.stringify(data, null, 2); },
    onError:    (data) => { document.getElementById('result').textContent = 'ERROR: '    + JSON.stringify(data, null, 2); },
  });
};
</script>
</body></html>
```

- [ ] **Step 3: Run the flow**

Run: `npx tsx scripts/onegate-spike.ts` → copy the key.
Open `scripts/onegate-widget-test.html` in a browser. Click "Pay with widget", paste the key.
Card: `4229989999000012`, CVV `871`, expiry `12/31`, 3DS code `test123`.

- [ ] **Step 4: Document findings — write the validation report**

Create `campusly-backend/scripts/SPIKE_FINDINGS.md` with these answers documented from the test:

1. Does the widget's `onComplete` payload include a token guid we can charge later?
2. Does the webhook payload include the token guid?
3. If neither, do we need to call `/api/v2/customer-token` separately, and if so what does it accept?
4. Is the R1 charge actually settled (visible in OneGate dashboard) or just authorised?
5. Can we refund the R1 charge immediately via `PUT /api/v2/gateway-transaction/{id}/refund`?

- [ ] **Step 5: Decision gate**

Based on findings, choose one:
- **(a) R1 + refund works** → proceed with the plan as written.
- **(b) Widget doesn't return token** → revise spec: tokenise via `/customer-token` after charge, or capture token separately. Update Phase 2 accordingly.
- **(c) Tokenisation requires PCI form on our side** → STOP. Renegotiate gateway or skip trial.

- [ ] **Step 6: Commit findings**

```bash
git add campusly-backend/scripts/SPIKE_FINDINGS.md campusly-backend/scripts/onegate-spike.ts campusly-backend/scripts/onegate-widget-test.html
git commit -m "spike: validate OneGate widget tokenisation flow"
```

**Do not proceed past this task until the decision gate clears.**

---

## Phase 1 — Backend Models + OneGate Client Wrapper

---

### Task 1.1: Create `Plan` model

**Files:**
- Create: `campusly-backend/src/modules/subscription/model.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/plan-model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/plan-model.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Plan } from '../model';

describe('Plan model', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); });
  afterAll(async () => { await Plan.deleteMany({ code: /^test_/ }); await mongoose.disconnect(); });

  it('persists a plan with entitlements', async () => {
    const created = await Plan.create({
      code: 'test_pro', name: 'Test Pro', subscriberType: 'teacher',
      amountExclTax: 14900, taxRate: 0, currency: 'ZAR', interval: 'month',
      trialDays: 14, entitlements: { aiGeneration: true }, isActive: true, displayOrder: 1,
    });
    expect(created.entitlements.aiGeneration).toBe(true);
    expect(created.amountExclTax).toBe(14900);
  });

  it('enforces unique code', async () => {
    await Plan.create({ code: 'test_dup', name: 'A', subscriberType: 'teacher', amountExclTax: 0, taxRate: 0, currency: 'ZAR', interval: null, trialDays: 0, entitlements: {}, isActive: true, displayOrder: 0 });
    await expect(Plan.create({ code: 'test_dup', name: 'B', subscriberType: 'teacher', amountExclTax: 0, taxRate: 0, currency: 'ZAR', interval: null, trialDays: 0, entitlements: {}, isActive: true, displayOrder: 0 })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

Run: `npm test -- src/modules/subscription/__tests__/plan-model.test.ts`
Expected: FAIL — module `../model` not found.

- [ ] **Step 3: Implement the Plan model**

```ts
// campusly-backend/src/modules/subscription/model.ts
import mongoose, { Schema, model, type Document } from 'mongoose';

export type SubscriberType = 'teacher' | 'student' | 'school';
export type PlanInterval = 'month' | 'year' | null;

export interface IPlan extends Document {
  code: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  subscriberType: { type: String, enum: ['teacher', 'student', 'school'], required: true },
  amountExclTax: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, required: true, min: 0, default: 0 },
  currency: { type: String, required: true, default: 'ZAR' },
  interval: { type: String, enum: ['month', 'year', null], default: null },
  trialDays: { type: Number, required: true, default: 0, min: 0 },
  entitlements: { type: Schema.Types.Mixed, required: true, default: {} },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

export const Plan = model<IPlan>('Plan', PlanSchema);
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/plan-model.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): Plan model with entitlements"
```

---

### Task 1.2: Add `Subscription` model

**Files:**
- Modify: `campusly-backend/src/modules/subscription/model.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/subscription-model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/subscription-model.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Subscription } from '../model';

describe('Subscription model', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); });
  afterAll(async () => { await Subscription.deleteMany({}); await mongoose.disconnect(); });

  it('persists a subscription with required fields', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const sub = await Subscription.create({
      schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free',
      retryCount: 0, gatewayProvider: 'onegate',
    });
    expect(sub.status).toBe('free');
    expect(sub.cancelAtPeriodEnd).toBe(false);
  });

  it('enforces unique schoolId', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' });
    await expect(Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

Run: `npm test -- src/modules/subscription/__tests__/subscription-model.test.ts`
Expected: FAIL — `Subscription` is not exported.

- [ ] **Step 3: Append the Subscription model to `model.ts`**

```ts
// Append to campusly-backend/src/modules/subscription/model.ts

export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export interface ISubscription extends Document {
  schoolId: mongoose.Types.ObjectId;
  subscriberType: SubscriberType;
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  nextBillingAt: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
  cardTokenGuid: string | null;
  cardLastFour: string | null;
  cardBrand: string | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  retryCount: number;
  nextRetryAt: Date | null;
  lastFailureReason: string | null;
  processingLockedAt: Date | null;
  gatewayProvider: string;
  gatewayCustomerRef: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, unique: true, index: true },
  subscriberType: { type: String, enum: ['teacher', 'student', 'school'], required: true },
  planCode: { type: String, required: true },
  status: { type: String, enum: ['free', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'], required: true, index: true },
  trialEndsAt: { type: Date, default: null },
  currentPeriodStart: { type: Date, default: null },
  currentPeriodEnd: { type: Date, default: null },
  nextBillingAt: { type: Date, default: null, index: true },
  cancelAtPeriodEnd: { type: Boolean, default: false },
  canceledAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  cardTokenGuid: { type: String, default: null },
  cardLastFour: { type: String, default: null },
  cardBrand: { type: String, default: null },
  cardExpiryMonth: { type: Number, default: null, min: 1, max: 12 },
  cardExpiryYear: { type: Number, default: null },
  retryCount: { type: Number, default: 0, min: 0 },
  nextRetryAt: { type: Date, default: null },
  lastFailureReason: { type: String, default: null },
  processingLockedAt: { type: Date, default: null },
  gatewayProvider: { type: String, default: 'onegate' },
  gatewayCustomerRef: { type: String, default: null },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

export const Subscription = model<ISubscription>('Subscription', SubscriptionSchema);
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/subscription-model.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): Subscription model with state fields"
```

---

### Task 1.3: Add `Invoice` model

**Files:**
- Modify: `campusly-backend/src/modules/subscription/model.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/invoice-model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/invoice-model.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Invoice } from '../model';

describe('Invoice model', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); });
  afterAll(async () => { await Invoice.deleteMany({}); await mongoose.disconnect(); });

  it('persists an invoice and enforces unique merchantReference', async () => {
    const base = {
      subscriptionId: new mongoose.Types.ObjectId(),
      schoolId: new mongoose.Types.ObjectId(),
      planCode: 'pro_monthly',
      subtotal: 14900, tax: 0, taxRate: 0, total: 14900, currency: 'ZAR',
      status: 'pending' as const,
      periodStart: new Date(), periodEnd: new Date(),
      purpose: 'subscription' as const,
    };
    await Invoice.create({ ...base, merchantReference: 'inv_uniq1' });
    await expect(Invoice.create({ ...base, merchantReference: 'inv_uniq1' })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

Run: `npm test -- src/modules/subscription/__tests__/invoice-model.test.ts`
Expected: FAIL — `Invoice` is not exported.

- [ ] **Step 3: Append Invoice model to `model.ts`**

```ts
// Append to campusly-backend/src/modules/subscription/model.ts

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type InvoicePurpose = 'verification' | 'subscription';

export interface IInvoice extends Document {
  subscriptionId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  planCode: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  merchantReference: string;
  gatewayTransactionId: number | null;
  gatewayReference: string | null;
  gatewayResponse: unknown;
  periodStart: Date;
  periodEnd: Date;
  attemptedAt: Date | null;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  refundedAmount: number;
  purpose: InvoicePurpose;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  planCode: { type: String, required: true },
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true, default: 0 },
  taxRate: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true },
  currency: { type: String, required: true, default: 'ZAR' },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'], required: true },
  merchantReference: { type: String, required: true, unique: true, index: true },
  gatewayTransactionId: { type: Number, default: null, index: true },
  gatewayReference: { type: String, default: null },
  gatewayResponse: { type: Schema.Types.Mixed, default: null },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  attemptedAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  failedAt: { type: Date, default: null },
  failureReason: { type: String, default: null },
  refundedAmount: { type: Number, default: 0 },
  purpose: { type: String, enum: ['verification', 'subscription'], required: true },
}, { timestamps: true });

export const Invoice = model<IInvoice>('Invoice', InvoiceSchema);
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/invoice-model.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): Invoice model with tax snapshot"
```

---

### Task 1.4: Add `WebhookEvent` + `CheckoutSession` models

**Files:**
- Modify: `campusly-backend/src/modules/subscription/model.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/webhook-checkoutsession-model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/webhook-checkoutsession-model.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { WebhookEvent, CheckoutSession } from '../model';

describe('WebhookEvent + CheckoutSession models', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); });
  afterAll(async () => {
    await WebhookEvent.deleteMany({});
    await CheckoutSession.deleteMany({});
    await mongoose.disconnect();
  });

  it('WebhookEvent enforces unique gatewayTransactionId', async () => {
    await WebhookEvent.create({ gatewayTransactionId: 111, payloadHash: 'h', rawPayload: {}, status: 'pending', verifiedViaLookup: false });
    await expect(WebhookEvent.create({ gatewayTransactionId: 111, payloadHash: 'h2', rawPayload: {}, status: 'pending', verifiedViaLookup: false })).rejects.toThrow();
  });

  it('CheckoutSession persists with merchantReference unique', async () => {
    const userId = new mongoose.Types.ObjectId();
    const schoolId = new mongoose.Types.ObjectId();
    await CheckoutSession.create({ userId, schoolId, planCode: 'pro_monthly', merchantReference: 'sub_aaa', paymentKey: 'k1', purpose: 'tokenisation', status: 'pending', expiresAt: new Date(Date.now() + 1800000) });
    await expect(CheckoutSession.create({ userId, schoolId, planCode: 'pro_monthly', merchantReference: 'sub_aaa', paymentKey: 'k2', purpose: 'tokenisation', status: 'pending', expiresAt: new Date(Date.now() + 1800000) })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

Run: `npm test -- src/modules/subscription/__tests__/webhook-checkoutsession-model.test.ts`
Expected: FAIL — exports not found.

- [ ] **Step 3: Append WebhookEvent + CheckoutSession to `model.ts`**

```ts
// Append to campusly-backend/src/modules/subscription/model.ts

export type WebhookEventStatus = 'pending' | 'processed' | 'failed' | 'ignored';

export interface IWebhookEvent extends Document {
  gatewayTransactionId: number;
  payloadHash: string;
  rawPayload: unknown;
  receivedAt: Date;
  processedAt: Date | null;
  status: WebhookEventStatus;
  error: string | null;
  verifiedViaLookup: boolean;
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  gatewayTransactionId: { type: Number, required: true, unique: true, index: true },
  payloadHash: { type: String, required: true },
  rawPayload: { type: Schema.Types.Mixed, required: true },
  receivedAt: { type: Date, default: () => new Date() },
  processedAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'processed', 'failed', 'ignored'], required: true },
  error: { type: String, default: null },
  verifiedViaLookup: { type: Boolean, default: false },
});

export const WebhookEvent = model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

export type CheckoutSessionPurpose = 'tokenisation' | 'update_card';
export type CheckoutSessionStatus = 'pending' | 'completed' | 'failed' | 'expired';

export interface ICheckoutSession extends Document {
  userId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  planCode: string;
  merchantReference: string;
  paymentKey: string;
  purpose: CheckoutSessionPurpose;
  status: CheckoutSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CheckoutSessionSchema = new Schema<ICheckoutSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  planCode: { type: String, required: true },
  merchantReference: { type: String, required: true, unique: true, index: true },
  paymentKey: { type: String, required: true },
  purpose: { type: String, enum: ['tokenisation', 'update_card'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'expired'], required: true, default: 'pending' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

export const CheckoutSession = model<ICheckoutSession>('CheckoutSession', CheckoutSessionSchema);
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/webhook-checkoutsession-model.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Confirm `model.ts` is under 350 lines**

Run: `wc -l src/modules/subscription/model.ts`. If over 350, split into `model.plan.ts`, `model.subscription.ts`, etc., with a barrel `model.ts` re-exporting.

- [ ] **Step 6: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): WebhookEvent + CheckoutSession models"
```

---

### Task 1.5: Seed Plan rows

**Files:**
- Create: `campusly-backend/src/modules/subscription/seed.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/seed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/seed.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Plan } from '../model';
import { seedPlans } from '../seed';

describe('seedPlans', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); });
  afterAll(async () => { await Plan.deleteMany({ code: { $in: ['free', 'pro_monthly', 'pro_annual'] } }); await mongoose.disconnect(); });

  it('creates three plans on first run', async () => {
    await seedPlans();
    const codes = (await Plan.find({}).select('code')).map((p) => p.code).sort();
    expect(codes).toEqual(['free', 'pro_annual', 'pro_monthly']);
  });

  it('is idempotent — running twice produces same result', async () => {
    await seedPlans();
    await seedPlans();
    const count = await Plan.countDocuments({ code: { $in: ['free', 'pro_monthly', 'pro_annual'] } });
    expect(count).toBe(3);
  });

  it('pro_monthly is R149 (14900 cents)', async () => {
    await seedPlans();
    const plan = await Plan.findOne({ code: 'pro_monthly' });
    expect(plan?.amountExclTax).toBe(14900);
    expect(plan?.trialDays).toBe(14);
    expect(plan?.entitlements).toMatchObject({ aiGeneration: true });
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

Run: `npm test -- src/modules/subscription/__tests__/seed.test.ts`
Expected: FAIL — `../seed` not found.

- [ ] **Step 3: Implement seed**

```ts
// campusly-backend/src/modules/subscription/seed.ts
import { Plan } from './model';

const PLANS = [
  {
    code: 'free', name: 'Free', subscriberType: 'teacher' as const,
    amountExclTax: 0, taxRate: 0, currency: 'ZAR', interval: null,
    trialDays: 0,
    entitlements: { aiGeneration: false, paperGeneration: false, maxClasses: 1, advancedAnalytics: false },
    isActive: true, displayOrder: 0,
    description: 'Free for individual teachers getting started',
  },
  {
    code: 'pro_monthly', name: 'Pro Monthly', subscriberType: 'teacher' as const,
    amountExclTax: 14900, taxRate: 0, currency: 'ZAR', interval: 'month' as const,
    trialDays: 14,
    entitlements: { aiGeneration: true, paperGeneration: true, maxClasses: null, advancedAnalytics: true },
    isActive: true, displayOrder: 1,
    description: 'Full Pro access, billed monthly',
  },
  {
    code: 'pro_annual', name: 'Pro Annual', subscriberType: 'teacher' as const,
    amountExclTax: 149000, taxRate: 0, currency: 'ZAR', interval: 'year' as const,
    trialDays: 14,
    entitlements: { aiGeneration: true, paperGeneration: true, maxClasses: null, advancedAnalytics: true },
    isActive: true, displayOrder: 2,
    description: 'Full Pro access, billed annually (2 months free)',
  },
];

export async function seedPlans(): Promise<void> {
  for (const plan of PLANS) {
    await Plan.findOneAndUpdate({ code: plan.code }, { $set: plan }, { upsert: true });
  }
}

if (require.main === module) {
  import('mongoose').then(async (m) => {
    await m.default.connect(process.env.MONGODB_URI!);
    await seedPlans();
    console.log('Plans seeded');
    await m.default.disconnect();
  });
}
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/seed.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): seed Plan rows (free, pro_monthly R149, pro_annual R1490)"
```

---

### Task 1.6: OneGate client — auth signing helper

**Files:**
- Create: `campusly-backend/src/lib/onegate/auth.ts`
- Create: `campusly-backend/src/lib/onegate/__tests__/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// campusly-backend/src/lib/onegate/__tests__/auth.test.ts
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { buildAuthHeaders } from '../auth';

describe('buildAuthHeaders', () => {
  it('produces sha256(salt_orgId_timestamp) as Auth-Token', () => {
    const headers = buildAuthHeaders({ salt: 'mysalt', orgId: '21234', nowSeconds: 1700000000 });
    const expected = crypto.createHash('sha256').update('mysalt_21234_1700000000').digest('hex');
    expect(headers['Auth-Token']).toBe(expected);
    expect(headers['Org-Id']).toBe('21234');
    expect(headers['Timestamp']).toBe('1700000000');
  });

  it('uses current time when nowSeconds omitted', () => {
    const headers = buildAuthHeaders({ salt: 's', orgId: '1' });
    const ts = parseInt(headers['Timestamp'], 10);
    expect(Math.abs(ts - Math.floor(Date.now() / 1000))).toBeLessThan(2);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

Run: `npm test -- src/lib/onegate/__tests__/auth.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `auth.ts`**

```ts
// campusly-backend/src/lib/onegate/auth.ts
import crypto from 'crypto';

export interface AuthHeaderInput {
  salt: string;
  orgId: string;
  nowSeconds?: number;
}

export function buildAuthHeaders(input: AuthHeaderInput): Record<string, string> {
  const ts = (input.nowSeconds ?? Math.floor(Date.now() / 1000)).toString();
  const token = crypto.createHash('sha256').update(`${input.salt}_${input.orgId}_${ts}`).digest('hex');
  return {
    'Auth-Token': token,
    'Org-Id': input.orgId,
    'Timestamp': ts,
  };
}
```

- [ ] **Step 4: Run test — confirm pass**

Run: `npm test -- src/lib/onegate/__tests__/auth.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/lib/onegate/
git commit -m "feat(onegate): SHA256 auth header signing"
```

---

### Task 1.7: OneGate client — types + error class

**Files:**
- Create: `campusly-backend/src/lib/onegate/types.ts`
- Create: `campusly-backend/src/lib/onegate/errors.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
// campusly-backend/src/lib/onegate/types.ts
export interface CreatePaymentKeyInput {
  payment_type: 'credit_card' | 'eft' | 'all' | 'absa_pay';
  amount: string;
  merchant_reference: string;
  customer_reference?: string;
  success_url?: string;
  error_url?: string;
  cancel_url?: string;
  pending_url?: string;
  notify_url?: string;
  card_token?: string;
}

export interface PaymentKeyResponse {
  key: string;
  url: string;
  origin: string;
}

export interface ChargeTokenInput {
  amount: number;
  reference: string;
}

export interface ChargeTokenResponse {
  success: 0 | 1;
  amount: string;
  reason: string;
  callpay_transaction_id: number;
  organisation_id: number;
  merchant_reference: string;
  gateway_reference: string;
  gateway_response: Record<string, unknown>;
}

export interface GatewayTransactionResponse {
  id: number;
  successful: 0 | 1;
  status: string;
  amount: string;
  displayAmount: string;
  currency: string;
  merchant_reference: string;
  gateway_reference: string;
  payment_key: string;
  created: string;
  refunded_amount: string;
  refunded: 0 | 1;
  service: string;
  gateway: string;
  gateway_response_parameters: Record<string, unknown>;
  customer_token?: { guid: string; expiry_date: string; last_four?: string; brand?: string };
}

export interface RefundResponse {
  success: 0 | 1;
  refunded_amount: string;
  callpay_transaction_id: number;
  reason: string;
}
```

- [ ] **Step 2: Create `errors.ts`**

```ts
// campusly-backend/src/lib/onegate/errors.ts
export class OneGateError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly gatewayCode: string | number | null,
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'OneGateError';
  }
}
```

- [ ] **Step 3: Commit**

```
git add campusly-backend/src/lib/onegate/
git commit -m "feat(onegate): types + OneGateError class"
```

---

### Task 1.8: OneGate client — wrapper with typed methods

**Files:**
- Create: `campusly-backend/src/lib/onegate/client.ts`
- Create: `campusly-backend/src/lib/onegate/__tests__/client.test.ts`

- [ ] **Step 1: Write the failing test (uses nock for HTTP mocking)**

```ts
// campusly-backend/src/lib/onegate/__tests__/client.test.ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import nock from 'nock';
import { OneGateClient } from '../client';
import { OneGateError } from '../errors';

const BASE = 'https://payments.onegate.test';

function makeClient() {
  return new OneGateClient({ baseUrl: BASE, orgId: '21234', salt: 'testsalt' });
}

describe('OneGateClient', () => {
  beforeAll(() => { nock.disableNetConnect(); });
  afterEach(() => { nock.cleanAll(); });

  it('createPaymentKey POSTs with signed headers', async () => {
    const scope = nock(BASE)
      .post('/api/v2/payment-key')
      .matchHeader('Org-Id', '21234')
      .matchHeader('Auth-Token', /^[a-f0-9]{64}$/)
      .reply(200, { key: 'k1', url: 'u1', origin: BASE });

    const client = makeClient();
    const res = await client.createPaymentKey({ payment_type: 'credit_card', amount: '1.00', merchant_reference: 'sub_x' });
    expect(res.key).toBe('k1');
    expect(scope.isDone()).toBe(true);
  });

  it('throws OneGateError on non-2xx', async () => {
    nock(BASE).post('/api/v2/payment-key').reply(401, { name: 'Unauthorized', message: 'bad' });
    const client = makeClient();
    await expect(client.createPaymentKey({ payment_type: 'credit_card', amount: '1.00', merchant_reference: 'x' })).rejects.toBeInstanceOf(OneGateError);
  });

  it('chargeToken posts amount + reference', async () => {
    const scope = nock(BASE)
      .post('/api/v2/customer-token/guid-1/pay', { amount: 149, reference: 'inv_1' })
      .reply(200, { success: 1, amount: '149.00', reason: 'n/a', callpay_transaction_id: 42, organisation_id: 21234, merchant_reference: 'inv_1', gateway_reference: 'ok', gateway_response: {} });

    const client = makeClient();
    const res = await client.chargeToken('guid-1', { amount: 149, reference: 'inv_1' });
    expect(res.success).toBe(1);
    expect(scope.isDone()).toBe(true);
  });
});
```

- [ ] **Step 2: Install nock if not present**

Check `package.json` for `nock`. If missing:

```
npm install --save-dev nock
```

- [ ] **Step 3: Run test — confirm it fails**

Run: `npm test -- src/lib/onegate/__tests__/client.test.ts`
Expected: FAIL — `OneGateClient` not exported.

- [ ] **Step 4: Implement `client.ts`**

> ⚠ **Spike finding (2026-05-13):** OneGate is Yii-based and expects `application/x-www-form-urlencoded` for POST/PUT bodies, NOT JSON. Sending JSON yields a 400 with field names reported as "blank" because the form parser sees no fields. The implementation below form-encodes all writes via `URLSearchParams`.

```ts
// campusly-backend/src/lib/onegate/client.ts
import axios, { type AxiosInstance, AxiosError } from 'axios';
import { buildAuthHeaders } from './auth';
import { OneGateError } from './errors';
import type {
  CreatePaymentKeyInput, PaymentKeyResponse,
  ChargeTokenInput, ChargeTokenResponse,
  GatewayTransactionResponse, RefundResponse,
} from './types';

export interface OneGateClientConfig {
  baseUrl: string;
  orgId: string;
  salt: string;
  timeoutMs?: number;
}

function toForm(input: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  return params.toString();
}

export class OneGateClient {
  private http: AxiosInstance;

  constructor(private config: OneGateClientConfig) {
    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs ?? 15000,
    });
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return { ...buildAuthHeaders({ salt: this.config.salt, orgId: this.config.orgId }), ...(extra ?? {}) };
  }

  private formHeaders(): Record<string, string> {
    return this.headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
  }

  private async wrap<T>(promise: Promise<{ data: T }>): Promise<T> {
    try {
      const res = await promise;
      return res.data;
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const status = err.response?.status ?? 0;
        const body = err.response?.data as Record<string, unknown> | undefined;
        const message = (body?.message as string) || err.message;
        const code = (body?.code as string | number) ?? null;
        throw new OneGateError(status, code, message, body);
      }
      throw err;
    }
  }

  async createPaymentKey(input: CreatePaymentKeyInput): Promise<PaymentKeyResponse> {
    return this.wrap(this.http.post<PaymentKeyResponse>('/api/v2/payment-key', toForm(input as never), { headers: this.formHeaders() }));
  }

  async chargeToken(guid: string, input: ChargeTokenInput): Promise<ChargeTokenResponse> {
    return this.wrap(this.http.post<ChargeTokenResponse>(`/api/v2/customer-token/${guid}/pay`, toForm(input as never), { headers: this.formHeaders() }));
  }

  async getTransaction(id: number): Promise<GatewayTransactionResponse> {
    return this.wrap(this.http.get<GatewayTransactionResponse>(`/api/v2/gateway-transaction/${id}`, { headers: this.headers() }));
  }

  async refundTransaction(id: number, amount?: number): Promise<RefundResponse> {
    const body = amount != null ? toForm({ amount }) : '';
    return this.wrap(this.http.put<RefundResponse>(`/api/v2/gateway-transaction/${id}/refund`, body, { headers: this.formHeaders() }));
  }
}
```

The nock-based test in Step 1 also needs `chargeToken` updated to match form-encoded body: change `nock(BASE).post('/api/v2/customer-token/guid-1/pay', { amount: 149, reference: 'inv_1' })` to `nock(BASE).post('/api/v2/customer-token/guid-1/pay', 'amount=149&reference=inv_1').matchHeader('Content-Type', /x-www-form-urlencoded/)`.

- [ ] **Step 5: Run tests — confirm pass**

Run: `npm test -- src/lib/onegate/__tests__/client.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```
git add campusly-backend/src/lib/onegate/ campusly-backend/package.json campusly-backend/package-lock.json
git commit -m "feat(onegate): typed client wrapper for 4 endpoints"
```

---

### Task 1.9: OneGate client — singleton + env config

**Files:**
- Create: `campusly-backend/src/lib/onegate/index.ts`
- Modify: `campusly-backend/.env.example`

- [ ] **Step 1: Create the singleton accessor**

```ts
// campusly-backend/src/lib/onegate/index.ts
import { OneGateClient } from './client';

export * from './client';
export * from './types';
export * from './errors';
export * from './auth';

let instance: OneGateClient | null = null;

export function getOneGateClient(): OneGateClient {
  if (instance) return instance;
  const baseUrl = process.env.ONEGATE_BASE_URL;
  const orgId = process.env.ONEGATE_ORG_ID;
  const salt = process.env.ONEGATE_SALT;
  if (!baseUrl || !orgId || !salt) {
    throw new Error('OneGate is not configured: set ONEGATE_BASE_URL, ONEGATE_ORG_ID, ONEGATE_SALT');
  }
  instance = new OneGateClient({ baseUrl, orgId, salt });
  return instance;
}

export function resetOneGateClient(): void { instance = null; }
```

- [ ] **Step 2: Append env placeholders**

Append to `campusly-backend/.env.example`:

```
# OneGate (Callpay) — payment gateway for subscriptions
ONEGATE_ORG_ID=
ONEGATE_SALT=
ONEGATE_BASE_URL=https://payments.onegate.co.za
ONEGATE_WEBHOOK_PATH=/api/webhooks/onegate
ONEGATE_IP_ALLOWLIST=
SUBSCRIPTION_CRON_ENABLED=true
FRONTEND_BASE_URL=http://localhost:3500
```

- [ ] **Step 3: Commit**

```
git add campusly-backend/src/lib/onegate/index.ts campusly-backend/.env.example
git commit -m "feat(onegate): singleton + env configuration"
```

---

## Phase 2 — Subscription Service (State Machine)

---

### Task 2.1: `createInitialFreeSubscription`

**Files:**
- Create: `campusly-backend/src/modules/subscription/service.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/service-init.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/service-init.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Subscription } from '../model';
import { SubscriptionService } from '../service';

describe('SubscriptionService.createInitialFreeSubscription', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); });
  beforeEach(async () => { await Subscription.deleteMany({}); });
  afterAll(async () => { await mongoose.disconnect(); });

  it('creates a free subscription for a school', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await SubscriptionService.createInitialFreeSubscription(schoolId);
    const sub = await Subscription.findOne({ schoolId });
    expect(sub?.status).toBe('free');
    expect(sub?.planCode).toBe('free');
    expect(sub?.cardTokenGuid).toBeNull();
  });

  it('is idempotent — second call returns existing', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await SubscriptionService.createInitialFreeSubscription(schoolId);
    await SubscriptionService.createInitialFreeSubscription(schoolId);
    const count = await Subscription.countDocuments({ schoolId });
    expect(count).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

Run: `npm test -- src/modules/subscription/__tests__/service-init.test.ts`
Expected: FAIL — `SubscriptionService` not exported.

- [ ] **Step 3: Implement the service skeleton**

```ts
// campusly-backend/src/modules/subscription/service.ts
import type mongoose from 'mongoose';
import { Subscription, type ISubscription } from './model';

export class SubscriptionService {
  static async createInitialFreeSubscription(schoolId: mongoose.Types.ObjectId): Promise<ISubscription> {
    const existing = await Subscription.findOne({ schoolId });
    if (existing) return existing;
    return Subscription.create({
      schoolId,
      subscriberType: 'teacher',
      planCode: 'free',
      status: 'free',
      retryCount: 0,
      gatewayProvider: 'onegate',
    });
  }
}
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/service-init.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): createInitialFreeSubscription"
```

---

### Task 2.2: `syncSchoolCache` (denormalised cache writer)

**Files:**
- Modify: `campusly-backend/src/modules/subscription/service.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/service-cache.test.ts`

- [ ] **Step 1: Locate School model**

Run: `grep -rn "subscription:" campusly-backend/src/modules/School/model.ts`. Confirm the embedded `subscription` field shape (should have `tier`, `expiresAt`).

- [ ] **Step 2: Write the failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/service-cache.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Subscription } from '../model';
import { SubscriptionService } from '../service';
import { School } from '../../School/model';

describe('SubscriptionService.syncSchoolCache', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); });
  beforeEach(async () => { await Subscription.deleteMany({}); await School.deleteMany({ name: /^test_/ }); });
  afterAll(async () => { await mongoose.disconnect(); });

  it('writes planCode + status + currentPeriodEnd to School.subscription', async () => {
    const school = await School.create({ name: 'test_cache', plan: 'standalone' });
    const sub = await Subscription.create({
      schoolId: school._id, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'trialing',
      currentPeriodEnd: new Date('2026-06-01'), retryCount: 0, gatewayProvider: 'onegate',
    });
    await SubscriptionService.syncSchoolCache(sub);
    const refreshed = await School.findById(school._id);
    expect(refreshed?.subscription?.tier).toBe('pro_monthly');
    expect(refreshed?.subscription?.status).toBe('trialing');
  });
});
```

- [ ] **Step 3: Run test — confirm it fails**

Run: `npm test -- src/modules/subscription/__tests__/service-cache.test.ts`
Expected: FAIL.

- [ ] **Step 4: Update School model to accept new cache fields**

Modify `campusly-backend/src/modules/School/model.ts` — extend the embedded `subscription` sub-schema with `planCode`, `status`. Keep `tier` and `expiresAt` for backwards compatibility (mirror `tier = planCode`).

Add to ISchool's subscription field type:

```ts
subscription: {
  tier: string;
  status: string;
  planCode: string;
  expiresAt: Date | null;
  currentPeriodEnd: Date | null;
};
```

Update the embedded schema to match.

- [ ] **Step 5: Add `syncSchoolCache` to SubscriptionService**

Append to `service.ts`:

```ts
import { School } from '../School/model';

// Inside SubscriptionService class:
static async syncSchoolCache(sub: ISubscription): Promise<void> {
  await School.updateOne(
    { _id: sub.schoolId },
    {
      $set: {
        'subscription.tier': sub.planCode,
        'subscription.planCode': sub.planCode,
        'subscription.status': sub.status,
        'subscription.expiresAt': sub.currentPeriodEnd,
        'subscription.currentPeriodEnd': sub.currentPeriodEnd,
      },
    },
  );
}
```

- [ ] **Step 6: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/service-cache.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```
git add campusly-backend/src/modules/subscription/ campusly-backend/src/modules/School/
git commit -m "feat(subscription): syncSchoolCache denormalises status to School.subscription"
```

---

### Task 2.3: `startTrial` — transition free → trialing

**Files:**
- Modify: `campusly-backend/src/modules/subscription/service.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/service-trial.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/service-trial.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Subscription, Plan } from '../model';
import { SubscriptionService } from '../service';
import { seedPlans } from '../seed';

describe('SubscriptionService.startTrial', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI!);
    await seedPlans();
  });
  beforeEach(async () => { await Subscription.deleteMany({}); });
  afterAll(async () => {
    await Plan.deleteMany({ code: { $in: ['free', 'pro_monthly', 'pro_annual'] } });
    await mongoose.disconnect();
  });

  it('transitions free → trialing with card details', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await SubscriptionService.createInitialFreeSubscription(schoolId);

    const updated = await SubscriptionService.startTrial({
      schoolId, planCode: 'pro_monthly',
      cardTokenGuid: 'guid-1', cardLastFour: '0012', cardBrand: 'visa',
      cardExpiryMonth: 12, cardExpiryYear: 2031,
    });

    expect(updated.status).toBe('trialing');
    expect(updated.planCode).toBe('pro_monthly');
    expect(updated.cardTokenGuid).toBe('guid-1');
    expect(updated.trialEndsAt).toBeTruthy();
    expect(updated.nextBillingAt?.getTime()).toBe(updated.trialEndsAt?.getTime());

    const expectedTrialEnd = Date.now() + 14 * 24 * 60 * 60 * 1000;
    expect(Math.abs((updated.trialEndsAt as Date).getTime() - expectedTrialEnd)).toBeLessThan(5000);
  });

  it('rejects if subscription already has a card', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await SubscriptionService.createInitialFreeSubscription(schoolId);
    await SubscriptionService.startTrial({
      schoolId, planCode: 'pro_monthly',
      cardTokenGuid: 'guid-1', cardLastFour: '0012', cardBrand: 'visa', cardExpiryMonth: 12, cardExpiryYear: 2031,
    });
    await expect(
      SubscriptionService.startTrial({
        schoolId, planCode: 'pro_annual',
        cardTokenGuid: 'guid-2', cardLastFour: '0099', cardBrand: 'visa', cardExpiryMonth: 6, cardExpiryYear: 2032,
      }),
    ).rejects.toThrow(/already has a card/i);
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

Run: `npm test -- src/modules/subscription/__tests__/service-trial.test.ts`
Expected: FAIL — `startTrial` not defined.

- [ ] **Step 3: Implement `startTrial`**

Append to `service.ts`:

```ts
import { Plan } from './model';

export interface StartTrialInput {
  schoolId: mongoose.Types.ObjectId;
  planCode: string;
  cardTokenGuid: string;
  cardLastFour: string;
  cardBrand: string;
  cardExpiryMonth: number;
  cardExpiryYear: number;
}

// Inside SubscriptionService class:
static async startTrial(input: StartTrialInput): Promise<ISubscription> {
  const sub = await Subscription.findOne({ schoolId: input.schoolId });
  if (!sub) throw new Error(`No subscription for school ${input.schoolId.toString()}`);
  if (sub.cardTokenGuid) throw new Error('Subscription already has a card on file; use updateCard');

  const plan = await Plan.findOne({ code: input.planCode, isActive: true });
  if (!plan) throw new Error(`Plan ${input.planCode} not found`);
  if (plan.trialDays <= 0) throw new Error(`Plan ${input.planCode} does not support a trial`);

  const trialEndsAt = new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000);

  sub.planCode = plan.code;
  sub.status = 'trialing';
  sub.trialEndsAt = trialEndsAt;
  sub.nextBillingAt = trialEndsAt;
  sub.cardTokenGuid = input.cardTokenGuid;
  sub.cardLastFour = input.cardLastFour;
  sub.cardBrand = input.cardBrand;
  sub.cardExpiryMonth = input.cardExpiryMonth;
  sub.cardExpiryYear = input.cardExpiryYear;
  sub.retryCount = 0;
  sub.lastFailureReason = null;
  await sub.save();

  await SubscriptionService.syncSchoolCache(sub);
  return sub;
}
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/service-trial.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): startTrial transitions free → trialing"
```

---

### Task 2.4: `cancel` + `resume`

**Files:**
- Modify: `campusly-backend/src/modules/subscription/service.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/service-cancel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/service-cancel.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Subscription, Plan } from '../model';
import { SubscriptionService } from '../service';
import { seedPlans } from '../seed';

describe('SubscriptionService.cancel + resume', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); await seedPlans(); });
  beforeEach(async () => { await Subscription.deleteMany({}); });
  afterAll(async () => { await Plan.deleteMany({}); await mongoose.disconnect(); });

  async function makeActiveSub() {
    const schoolId = new mongoose.Types.ObjectId();
    const periodEnd = new Date(Date.now() + 20 * 86400000);
    return Subscription.create({
      schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'active',
      currentPeriodStart: new Date(), currentPeriodEnd: periodEnd,
      nextBillingAt: periodEnd, cardTokenGuid: 'g', cardLastFour: '0012', cardBrand: 'visa',
      cardExpiryMonth: 12, cardExpiryYear: 2031, retryCount: 0, gatewayProvider: 'onegate',
    });
  }

  it('cancel sets cancelAtPeriodEnd, status=canceled, nextBillingAt=currentPeriodEnd', async () => {
    const sub = await makeActiveSub();
    const updated = await SubscriptionService.cancel(sub.schoolId);
    expect(updated.status).toBe('canceled');
    expect(updated.cancelAtPeriodEnd).toBe(true);
    expect(updated.canceledAt).toBeTruthy();
    expect(updated.nextBillingAt?.getTime()).toBe(sub.currentPeriodEnd!.getTime());
  });

  it('resume reverts cancel before period end', async () => {
    const sub = await makeActiveSub();
    await SubscriptionService.cancel(sub.schoolId);
    const resumed = await SubscriptionService.resume(sub.schoolId);
    expect(resumed.status).toBe('active');
    expect(resumed.cancelAtPeriodEnd).toBe(false);
    expect(resumed.canceledAt).toBeNull();
  });

  it('resume errors if period already ended', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await Subscription.create({
      schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'canceled',
      cancelAtPeriodEnd: true, canceledAt: new Date(),
      currentPeriodEnd: new Date(Date.now() - 86400000), retryCount: 0, gatewayProvider: 'onegate',
    });
    await expect(SubscriptionService.resume(schoolId)).rejects.toThrow(/period has ended/i);
  });
});
```

- [ ] **Step 2: Run test — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/service-cancel.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `cancel` + `resume`**

Append to `service.ts`:

```ts
// Inside SubscriptionService class:
static async cancel(schoolId: mongoose.Types.ObjectId): Promise<ISubscription> {
  const sub = await Subscription.findOne({ schoolId });
  if (!sub) throw new Error('Subscription not found');
  if (sub.status !== 'active' && sub.status !== 'trialing' && sub.status !== 'past_due') {
    throw new Error(`Cannot cancel from status ${sub.status}`);
  }
  if (!sub.currentPeriodEnd && !sub.trialEndsAt) {
    throw new Error('Subscription has no period end');
  }
  sub.status = 'canceled';
  sub.cancelAtPeriodEnd = true;
  sub.canceledAt = new Date();
  sub.nextBillingAt = sub.currentPeriodEnd ?? sub.trialEndsAt;
  await sub.save();
  await SubscriptionService.syncSchoolCache(sub);
  return sub;
}

static async resume(schoolId: mongoose.Types.ObjectId): Promise<ISubscription> {
  const sub = await Subscription.findOne({ schoolId });
  if (!sub) throw new Error('Subscription not found');
  if (sub.status !== 'canceled') throw new Error(`Cannot resume from status ${sub.status}`);
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= Date.now()) {
    throw new Error('Subscription period has ended; resubscribe instead');
  }
  sub.status = 'active';
  sub.cancelAtPeriodEnd = false;
  sub.canceledAt = null;
  sub.nextBillingAt = sub.currentPeriodEnd;
  await sub.save();
  await SubscriptionService.syncSchoolCache(sub);
  return sub;
}
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/service-cancel.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): cancel + resume"
```

---

### Task 2.5: `chargeSubscription` + `markPaid` + `handleChargeFailure` + `endSubscription`

**Files:**
- Modify: `campusly-backend/src/modules/subscription/service.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/service-charge.test.ts`

- [ ] **Step 1: Write the failing test (mocks OneGate client)**

```ts
// campusly-backend/src/modules/subscription/__tests__/service-charge.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { Subscription, Invoice, Plan } from '../model';
import { SubscriptionService } from '../service';
import { seedPlans } from '../seed';
import * as onegate from '../../../lib/onegate';

describe('SubscriptionService.chargeSubscription', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); await seedPlans(); });
  beforeEach(async () => {
    await Subscription.deleteMany({});
    await Invoice.deleteMany({});
    vi.restoreAllMocks();
  });
  afterAll(async () => { await Plan.deleteMany({}); await mongoose.disconnect(); });

  async function makeSub(status: 'trialing' | 'active' | 'past_due', overrides: Partial<Record<string, unknown>> = {}) {
    const schoolId = new mongoose.Types.ObjectId();
    return Subscription.create({
      schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      nextBillingAt: new Date(Date.now() - 1000),
      cardTokenGuid: 'guid-1', cardLastFour: '0012', cardBrand: 'visa',
      cardExpiryMonth: 12, cardExpiryYear: 2031, retryCount: 0, gatewayProvider: 'onegate',
      ...overrides,
    });
  }

  it('success: trialing → active, invoice paid, period rolled', async () => {
    const sub = await makeSub('trialing');
    vi.spyOn(onegate, 'getOneGateClient').mockReturnValue({
      chargeToken: vi.fn().mockResolvedValue({ success: 1, callpay_transaction_id: 99, amount: '149.00', reason: 'n/a', organisation_id: 21234, merchant_reference: 'x', gateway_reference: 'ok', gateway_response: {} }),
    } as never);

    await SubscriptionService.chargeSubscription(sub._id as mongoose.Types.ObjectId);

    const refreshed = await Subscription.findById(sub._id);
    expect(refreshed?.status).toBe('active');
    expect(refreshed?.retryCount).toBe(0);
    expect(refreshed?.currentPeriodEnd?.getTime()).toBeGreaterThan(Date.now() + 25 * 86400000);

    const inv = await Invoice.findOne({ subscriptionId: sub._id });
    expect(inv?.status).toBe('paid');
    expect(inv?.gatewayTransactionId).toBe(99);
  });

  it('trial failure → free (no retry)', async () => {
    const sub = await makeSub('trialing');
    vi.spyOn(onegate, 'getOneGateClient').mockReturnValue({
      chargeToken: vi.fn().mockResolvedValue({ success: 0, reason: 'declined', callpay_transaction_id: 0, amount: '149.00', organisation_id: 21234, merchant_reference: 'x', gateway_reference: '', gateway_response: {} }),
    } as never);

    await SubscriptionService.chargeSubscription(sub._id as mongoose.Types.ObjectId);

    const refreshed = await Subscription.findById(sub._id);
    expect(refreshed?.status).toBe('free');
    expect(refreshed?.cardTokenGuid).toBeNull();
  });

  it('active failure → past_due, retry scheduled at +2d', async () => {
    const sub = await makeSub('active');
    vi.spyOn(onegate, 'getOneGateClient').mockReturnValue({
      chargeToken: vi.fn().mockResolvedValue({ success: 0, reason: 'declined', callpay_transaction_id: 0, amount: '149.00', organisation_id: 21234, merchant_reference: 'x', gateway_reference: '', gateway_response: {} }),
    } as never);

    await SubscriptionService.chargeSubscription(sub._id as mongoose.Types.ObjectId);

    const refreshed = await Subscription.findById(sub._id);
    expect(refreshed?.status).toBe('past_due');
    expect(refreshed?.retryCount).toBe(1);
    expect(refreshed?.nextRetryAt).toBeTruthy();
  });

  it('past_due failure on 3rd retry → free', async () => {
    const sub = await makeSub('past_due', { retryCount: 3 });
    vi.spyOn(onegate, 'getOneGateClient').mockReturnValue({
      chargeToken: vi.fn().mockResolvedValue({ success: 0, reason: 'declined', callpay_transaction_id: 0, amount: '149.00', organisation_id: 21234, merchant_reference: 'x', gateway_reference: '', gateway_response: {} }),
    } as never);

    await SubscriptionService.chargeSubscription(sub._id as mongoose.Types.ObjectId);

    const refreshed = await Subscription.findById(sub._id);
    expect(refreshed?.status).toBe('free');
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/service-charge.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement charge logic**

Append to `service.ts`:

```ts
import { Invoice, type IInvoice } from './model';
import { getOneGateClient } from '../../lib/onegate';
import crypto from 'crypto';

function nanoId(len = 8): string {
  return crypto.randomBytes(len).toString('hex').slice(0, len);
}

function addInterval(date: Date, interval: 'month' | 'year' | null): Date {
  const d = new Date(date);
  if (interval === 'month') d.setMonth(d.getMonth() + 1);
  else if (interval === 'year') d.setFullYear(d.getFullYear() + 1);
  return d;
}

const RETRY_INTERVALS_DAYS = [2, 4, 7];
const MAX_RETRIES = 3;

// Inside SubscriptionService class:

static isCardExpired(sub: ISubscription): boolean {
  if (!sub.cardExpiryYear || !sub.cardExpiryMonth) return false;
  const now = new Date();
  const expEnd = new Date(sub.cardExpiryYear, sub.cardExpiryMonth, 0, 23, 59, 59);
  return expEnd.getTime() < now.getTime();
}

static async chargeSubscription(subId: mongoose.Types.ObjectId): Promise<void> {
  const sub = await Subscription.findById(subId);
  if (!sub) return;

  if (sub.status === 'canceled') {
    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= Date.now()) {
      await SubscriptionService.endSubscription(sub);
    }
    return;
  }

  if (SubscriptionService.isCardExpired(sub)) {
    sub.status = 'past_due';
    sub.lastFailureReason = 'card_expired';
    sub.nextRetryAt = null;
    sub.nextBillingAt = null;
    await sub.save();
    await SubscriptionService.syncSchoolCache(sub);
    return;
  }

  if (!sub.cardTokenGuid) {
    sub.status = 'free';
    sub.nextBillingAt = null;
    await sub.save();
    await SubscriptionService.syncSchoolCache(sub);
    return;
  }

  const plan = await Plan.findOne({ code: sub.planCode });
  if (!plan) throw new Error(`Plan ${sub.planCode} not found`);

  const merchantReference = 'inv_' + nanoId();
  const periodStart = sub.currentPeriodEnd ?? new Date();
  const periodEnd = addInterval(periodStart, plan.interval);
  const subtotal = plan.amountExclTax;
  const tax = Math.round(subtotal * plan.taxRate);
  const total = subtotal + tax;

  const invoice = await Invoice.create({
    subscriptionId: sub._id, schoolId: sub.schoolId, planCode: sub.planCode,
    subtotal, tax, taxRate: plan.taxRate, total, currency: plan.currency,
    status: 'pending', merchantReference,
    periodStart, periodEnd, attemptedAt: new Date(), purpose: 'subscription',
  });

  try {
    const result = await getOneGateClient().chargeToken(sub.cardTokenGuid, {
      amount: total / 100, reference: merchantReference,
    });
    if (result.success === 1) {
      await SubscriptionService.markPaid(sub, invoice, result, periodEnd);
    } else {
      await SubscriptionService.handleChargeFailure(sub, invoice, result.reason ?? 'declined', result);
    }
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : 'gateway_error';
    await SubscriptionService.handleChargeFailure(sub, invoice, reason, { error: reason });
  }
}

static async markPaid(
  sub: ISubscription,
  invoice: IInvoice,
  result: { callpay_transaction_id: number; gateway_reference: string; gateway_response: unknown },
  periodEnd: Date,
): Promise<void> {
  invoice.status = 'paid';
  invoice.paidAt = new Date();
  invoice.gatewayTransactionId = result.callpay_transaction_id;
  invoice.gatewayReference = result.gateway_reference;
  invoice.gatewayResponse = result.gateway_response;
  await invoice.save();

  sub.status = 'active';
  sub.currentPeriodStart = invoice.periodStart;
  sub.currentPeriodEnd = periodEnd;
  sub.nextBillingAt = periodEnd;
  sub.trialEndsAt = null;
  sub.retryCount = 0;
  sub.nextRetryAt = null;
  sub.lastFailureReason = null;
  await sub.save();
  await SubscriptionService.syncSchoolCache(sub);
}

static async handleChargeFailure(
  sub: ISubscription,
  invoice: IInvoice,
  reason: string,
  raw: unknown,
): Promise<void> {
  invoice.status = 'failed';
  invoice.failedAt = new Date();
  invoice.failureReason = reason;
  invoice.gatewayResponse = raw;
  await invoice.save();

  sub.lastFailureReason = reason;

  if (sub.status === 'trialing') {
    sub.status = 'free';
    sub.cardTokenGuid = null;
    sub.cardLastFour = null;
    sub.cardBrand = null;
    sub.cardExpiryMonth = null;
    sub.cardExpiryYear = null;
    sub.trialEndsAt = null;
    sub.nextBillingAt = null;
  } else {
    sub.retryCount = (sub.retryCount ?? 0) + 1;
    if (sub.retryCount > MAX_RETRIES) {
      sub.status = 'unpaid';
      // Same-cron-run drop to free for the audit trail
      sub.status = 'free';
      sub.cardTokenGuid = null;
      sub.nextBillingAt = null;
      sub.nextRetryAt = null;
    } else {
      sub.status = 'past_due';
      const days = RETRY_INTERVALS_DAYS[Math.min(sub.retryCount - 1, RETRY_INTERVALS_DAYS.length - 1)];
      sub.nextRetryAt = new Date(Date.now() + days * 86400000);
      sub.nextBillingAt = sub.nextRetryAt;
    }
  }

  await sub.save();
  await SubscriptionService.syncSchoolCache(sub);
}

static async endSubscription(sub: ISubscription): Promise<void> {
  sub.status = 'free';
  sub.endedAt = new Date();
  sub.planCode = 'free';
  sub.cardTokenGuid = null;
  sub.cardLastFour = null;
  sub.cardBrand = null;
  sub.cardExpiryMonth = null;
  sub.cardExpiryYear = null;
  sub.currentPeriodStart = null;
  sub.currentPeriodEnd = null;
  sub.nextBillingAt = null;
  sub.trialEndsAt = null;
  sub.cancelAtPeriodEnd = false;
  await sub.save();
  await SubscriptionService.syncSchoolCache(sub);
}
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/service-charge.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Check file size**

Run: `wc -l src/modules/subscription/service.ts`. If > 350, split: move charge logic into `service-billing.ts`, lifecycle into `service-lifecycle.ts`, and have `service.ts` re-export.

- [ ] **Step 6: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): chargeSubscription + dunning state machine"
```

---

## Phase 3 — Endpoints + Webhook + Cron

---

### Task 3.1: Validation schemas

**Files:**
- Create: `campusly-backend/src/modules/subscription/validation.ts`

- [ ] **Step 1: Create schemas**

```ts
// campusly-backend/src/modules/subscription/validation.ts
import { z } from 'zod';

export const checkoutInputSchema = z.object({
  planCode: z.enum(['pro_monthly', 'pro_annual']),
}).strict();
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const cancelInputSchema = z.object({}).strict();

export const onegateWebhookSchema = z.object({
  success: z.number().optional(),
  status: z.string().optional(),
  organisation_id: z.number().optional(),
  amount: z.string().optional(),
  refunded_amount: z.string().optional(),
  callpay_transaction_id: z.number(),
  reason: z.string().optional(),
  user: z.string().optional(),
  merchant_reference: z.string(),
  gateway_reference: z.string().optional(),
  gateway_response: z.unknown().optional(),
  currency: z.string().optional(),
  payment_key: z.string().optional(),
}).passthrough();
export type OneGateWebhookPayload = z.infer<typeof onegateWebhookSchema>;
```

- [ ] **Step 2: Commit**

```
git add campusly-backend/src/modules/subscription/validation.ts
git commit -m "feat(subscription): zod validation schemas"
```

---

### Task 3.2: Read endpoints — GET /subscriptions/me + GET /plans

**Files:**
- Create: `campusly-backend/src/modules/subscription/controller.ts`
- Create: `campusly-backend/src/modules/subscription/routes.ts`
- Modify: `campusly-backend/src/app.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/routes-read.test.ts`

- [ ] **Step 1: Locate the route mounting pattern in `app.ts`**

Run: `grep -n "use.*api" campusly-backend/src/app.ts | head -20`. Note the exact mounting style and authentication middleware pattern used (e.g. `app.use('/api/audit', authenticate, auditRoutes)`).

- [ ] **Step 2: Write failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/routes-read.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../../app';
import { Subscription, Plan } from '../model';
import { seedPlans } from '../seed';
import { signTestToken } from '../../../test-utils/auth';

describe('GET /api/subscriptions/me + GET /api/plans', () => {
  let token: string;
  let schoolId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI!);
    await seedPlans();
    schoolId = new mongoose.Types.ObjectId();
    token = signTestToken({ schoolId, role: 'teacher' });
  });

  beforeEach(async () => { await Subscription.deleteMany({}); });

  afterAll(async () => {
    await Plan.deleteMany({ code: { $in: ['free', 'pro_monthly', 'pro_annual'] } });
    await mongoose.disconnect();
  });

  it('GET /api/plans returns active plans sorted by displayOrder', async () => {
    const res = await request(app).get('/api/plans').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { code: string }) => p.code)).toEqual(['free', 'pro_monthly', 'pro_annual']);
  });

  it('GET /api/subscriptions/me returns the user school subscription + plan', async () => {
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' });
    const res = await request(app).get('/api/subscriptions/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.subscription.status).toBe('free');
    expect(res.body.data.plan.code).toBe('free');
  });
});
```

- [ ] **Step 3: Confirm test-utils auth helper exists**

Run: `ls campusly-backend/src/test-utils/`. If `auth.ts` with `signTestToken` doesn't exist, create one that uses the same JWT_SECRET and shape as production auth middleware. Mirror the actual middleware's expected claims (likely `{ id, schoolId, role }`).

- [ ] **Step 4: Run test — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/routes-read.test.ts`
Expected: FAIL — routes not mounted.

- [ ] **Step 5: Implement controller (read methods)**

```ts
// campusly-backend/src/modules/subscription/controller.ts
import type { Request, Response } from 'express';
import { Subscription, Plan } from './model';
import { SubscriptionService } from './service';

export class SubscriptionController {
  static async listPlans(_req: Request, res: Response): Promise<void> {
    const plans = await Plan.find({ isActive: true }).sort({ displayOrder: 1 });
    res.json({ data: plans });
  }

  static async getMine(req: Request, res: Response): Promise<void> {
    const schoolId = req.user!.schoolId;
    let sub = await Subscription.findOne({ schoolId });
    if (!sub) {
      sub = await SubscriptionService.createInitialFreeSubscription(schoolId);
    }
    const plan = await Plan.findOne({ code: sub.planCode });
    res.json({ data: { subscription: sub, plan } });
  }
}
```

- [ ] **Step 6: Implement routes**

```ts
// campusly-backend/src/modules/subscription/routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { SubscriptionController } from './controller';

const router = Router();

router.get('/plans', authenticate, SubscriptionController.listPlans);
router.get('/subscriptions/me', authenticate, SubscriptionController.getMine);

export default router;
```

- [ ] **Step 7: Mount in `app.ts`**

Add to `campusly-backend/src/app.ts` near other route mounts:

```ts
import subscriptionRoutes from './modules/subscription/routes';
// ...
app.use('/api', subscriptionRoutes);
```

- [ ] **Step 8: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/routes-read.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 9: Commit**

```
git add campusly-backend/src/modules/subscription/ campusly-backend/src/app.ts campusly-backend/src/test-utils/
git commit -m "feat(subscription): GET /plans + GET /subscriptions/me"
```

---

### Task 3.3: POST /api/subscriptions/checkout

**Files:**
- Modify: `campusly-backend/src/modules/subscription/controller.ts`
- Modify: `campusly-backend/src/modules/subscription/routes.ts`
- Modify: `campusly-backend/src/modules/subscription/service.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/routes-checkout.test.ts`

- [ ] **Step 1: Write failing test (mocks OneGate)**

```ts
// campusly-backend/src/modules/subscription/__tests__/routes-checkout.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../../app';
import { Subscription, Plan, CheckoutSession } from '../model';
import { seedPlans } from '../seed';
import { signTestToken } from '../../../test-utils/auth';
import * as onegate from '../../../lib/onegate';

describe('POST /api/subscriptions/checkout', () => {
  let token: string;
  let schoolId: mongoose.Types.ObjectId;
  let userId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI!);
    await seedPlans();
  });
  beforeEach(async () => {
    schoolId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
    token = signTestToken({ id: userId, schoolId, role: 'teacher' });
    await Subscription.deleteMany({});
    await CheckoutSession.deleteMany({});
    vi.restoreAllMocks();
  });
  afterAll(async () => { await Plan.deleteMany({}); await mongoose.disconnect(); });

  it('mints a payment key and returns it', async () => {
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' });
    vi.spyOn(onegate, 'getOneGateClient').mockReturnValue({
      createPaymentKey: vi.fn().mockResolvedValue({ key: 'KEY-1', url: 'https://og/pay', origin: 'https://og' }),
    } as never);

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ planCode: 'pro_monthly' });

    expect(res.status).toBe(200);
    expect(res.body.data.paymentKey).toBe('KEY-1');
    const session = await CheckoutSession.findOne({ paymentKey: 'KEY-1' });
    expect(session?.status).toBe('pending');
    expect(session?.merchantReference).toMatch(/^sub_/);
  });

  it('rejects if user already has a card on file', async () => {
    await Subscription.create({
      schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'active',
      cardTokenGuid: 'existing', retryCount: 0, gatewayProvider: 'onegate',
    });

    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ planCode: 'pro_monthly' });

    expect(res.status).toBe(409);
  });

  it('rejects invalid planCode', async () => {
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' });
    const res = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ planCode: 'free' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/routes-checkout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add `startCheckout` to service**

Append to `service.ts`:

```ts
import { CheckoutSession, type ICheckoutSession } from './model';

export interface StartCheckoutInput {
  userId: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  planCode: string;
}

// Inside SubscriptionService class:
static async startCheckout(input: StartCheckoutInput): Promise<{ paymentKey: string; sessionId: string }> {
  const sub = await Subscription.findOne({ schoolId: input.schoolId });
  if (!sub) throw new Error('Subscription not found');
  if (sub.cardTokenGuid) {
    const err = new Error('Subscription already has a card on file');
    (err as Error & { code: string }).code = 'CARD_EXISTS';
    throw err;
  }

  // De-duplicate: reuse non-expired pending session
  const existing = await CheckoutSession.findOne({
    userId: input.userId, planCode: input.planCode, status: 'pending',
    expiresAt: { $gt: new Date() },
  });
  if (existing) {
    return { paymentKey: existing.paymentKey, sessionId: existing._id!.toString() };
  }

  const plan = await Plan.findOne({ code: input.planCode, isActive: true });
  if (!plan) throw new Error('Plan not found');
  if (!['pro_monthly', 'pro_annual'].includes(plan.code)) {
    const err = new Error('Plan is not purchasable');
    (err as Error & { code: string }).code = 'NOT_PURCHASABLE';
    throw err;
  }

  const merchantReference = 'sub_' + nanoId();
  const frontend = process.env.FRONTEND_BASE_URL ?? 'http://localhost:3500';
  const backend = process.env.BACKEND_BASE_URL ?? 'http://localhost:4500';

  const session = await CheckoutSession.create({
    userId: input.userId,
    schoolId: input.schoolId,
    planCode: input.planCode,
    merchantReference,
    paymentKey: 'pending',
    purpose: 'tokenisation',
    status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  const sessionId = session._id!.toString();
  const result = await getOneGateClient().createPaymentKey({
    payment_type: 'credit_card',
    amount: '1.00',
    merchant_reference: merchantReference,
    success_url: `${frontend}/subscription/success?session=${sessionId}`,
    error_url: `${frontend}/subscription/error?session=${sessionId}`,
    pending_url: `${frontend}/subscription/pending?session=${sessionId}`,
    notify_url: `${backend}/api/webhooks/onegate`,
  });

  session.paymentKey = result.key;
  await session.save();

  return { paymentKey: result.key, sessionId };
}
```

Also add `BACKEND_BASE_URL` to `.env.example`.

- [ ] **Step 4: Add controller method**

Append to `controller.ts`:

```ts
import { checkoutInputSchema } from './validation';

// Inside SubscriptionController class:
static async checkout(req: Request, res: Response): Promise<void> {
  const parsed = checkoutInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const result = await SubscriptionService.startCheckout({
      userId: req.user!.id,
      schoolId: req.user!.schoolId,
      planCode: parsed.data.planCode,
    });
    res.json({ data: result });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'CARD_EXISTS') { res.status(409).json({ error: (err as Error).message }); return; }
    if (code === 'NOT_PURCHASABLE') { res.status(400).json({ error: (err as Error).message }); return; }
    throw err;
  }
}
```

- [ ] **Step 5: Add route**

Append to `routes.ts`:

```ts
router.post('/subscriptions/checkout', authenticate, SubscriptionController.checkout);
```

- [ ] **Step 6: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/routes-checkout.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```
git add campusly-backend/src/modules/subscription/ campusly-backend/.env.example
git commit -m "feat(subscription): POST /checkout mints OneGate payment key"
```

---

### Task 3.4: POST /cancel, POST /resume, GET /invoices, GET /checkout-session/:id

**Files:**
- Modify: `campusly-backend/src/modules/subscription/controller.ts`
- Modify: `campusly-backend/src/modules/subscription/routes.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/routes-lifecycle.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/routes-lifecycle.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../../app';
import { Subscription, Invoice, Plan, CheckoutSession } from '../model';
import { seedPlans } from '../seed';
import { signTestToken } from '../../../test-utils/auth';

describe('Subscription lifecycle routes', () => {
  let token: string;
  let schoolId: mongoose.Types.ObjectId;

  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); await seedPlans(); });
  beforeEach(async () => {
    schoolId = new mongoose.Types.ObjectId();
    token = signTestToken({ id: new mongoose.Types.ObjectId(), schoolId, role: 'teacher' });
    await Subscription.deleteMany({}); await Invoice.deleteMany({}); await CheckoutSession.deleteMany({});
  });
  afterAll(async () => { await Plan.deleteMany({}); await mongoose.disconnect(); });

  it('POST /cancel marks cancel-at-period-end', async () => {
    const pEnd = new Date(Date.now() + 20 * 86400000);
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'active', currentPeriodEnd: pEnd, nextBillingAt: pEnd, cardTokenGuid: 'g', retryCount: 0, gatewayProvider: 'onegate' });
    const res = await request(app).post('/api/subscriptions/cancel').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('canceled');
    expect(res.body.data.cancelAtPeriodEnd).toBe(true);
  });

  it('POST /resume restores active status', async () => {
    const pEnd = new Date(Date.now() + 20 * 86400000);
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'canceled', cancelAtPeriodEnd: true, canceledAt: new Date(), currentPeriodEnd: pEnd, nextBillingAt: pEnd, cardTokenGuid: 'g', retryCount: 0, gatewayProvider: 'onegate' });
    const res = await request(app).post('/api/subscriptions/resume').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('GET /invoices returns user school invoices', async () => {
    const sub = await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'active', retryCount: 0, gatewayProvider: 'onegate' });
    await Invoice.create({
      subscriptionId: sub._id, schoolId, planCode: 'pro_monthly',
      subtotal: 14900, tax: 0, taxRate: 0, total: 14900, currency: 'ZAR',
      status: 'paid', merchantReference: 'inv_test1', periodStart: new Date(), periodEnd: new Date(),
      paidAt: new Date(), purpose: 'subscription',
    });
    const res = await request(app).get('/api/subscriptions/invoices').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe('paid');
  });

  it('GET /checkout-session/:id returns session status', async () => {
    const session = await CheckoutSession.create({
      userId: new mongoose.Types.ObjectId(), schoolId, planCode: 'pro_monthly',
      merchantReference: 'sub_xxx', paymentKey: 'k', purpose: 'tokenisation', status: 'completed',
      expiresAt: new Date(Date.now() + 1000),
    });
    const res = await request(app).get(`/api/subscriptions/checkout-session/${session._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/routes-lifecycle.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add controller methods**

Append to `controller.ts`:

```ts
import { Invoice, CheckoutSession } from './model';

// Inside SubscriptionController class:
static async cancel(req: Request, res: Response): Promise<void> {
  const sub = await SubscriptionService.cancel(req.user!.schoolId);
  res.json({ data: sub });
}

static async resume(req: Request, res: Response): Promise<void> {
  const sub = await SubscriptionService.resume(req.user!.schoolId);
  res.json({ data: sub });
}

static async listInvoices(req: Request, res: Response): Promise<void> {
  const invoices = await Invoice.find({ schoolId: req.user!.schoolId, purpose: 'subscription' }).sort({ createdAt: -1 }).limit(50);
  res.json({ data: invoices });
}

static async getCheckoutSession(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const session = await CheckoutSession.findOne({ _id: id, schoolId: req.user!.schoolId });
  if (!session) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ data: session });
}
```

- [ ] **Step 4: Add routes**

Append to `routes.ts`:

```ts
router.post('/subscriptions/cancel', authenticate, SubscriptionController.cancel);
router.post('/subscriptions/resume', authenticate, SubscriptionController.resume);
router.get('/subscriptions/invoices', authenticate, SubscriptionController.listInvoices);
router.get('/subscriptions/checkout-session/:id', authenticate, SubscriptionController.getCheckoutSession);
```

- [ ] **Step 5: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/routes-lifecycle.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): cancel/resume/invoices/checkout-session endpoints"
```

---

### Task 3.5: Webhook handler with idempotency + lookup verification

**Files:**
- Create: `campusly-backend/src/modules/subscription/webhook.ts`
- Modify: `campusly-backend/src/modules/subscription/routes.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/webhook.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/webhook.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../../app';
import { Subscription, Invoice, CheckoutSession, WebhookEvent, Plan } from '../model';
import { seedPlans } from '../seed';
import * as onegate from '../../../lib/onegate';

const mockLookup = (overrides: Record<string, unknown> = {}) => ({
  getTransaction: vi.fn().mockResolvedValue({
    id: 9001, successful: 1, status: 'complete', amount: '1.00',
    displayAmount: 'R1.00', currency: 'ZAR',
    merchant_reference: 'sub_ABC123', gateway_reference: 'ref',
    payment_key: 'k', created: '2026-05-13', refunded_amount: '0.00', refunded: 0,
    service: 'Direct', gateway: 'Imbeko', gateway_response_parameters: {},
    customer_token: { guid: 'TOK-1', expiry_date: '12-2031', last_four: '0012', brand: 'visa' },
    ...overrides,
  }),
  refundTransaction: vi.fn().mockResolvedValue({ success: 1, refunded_amount: '1.00', callpay_transaction_id: 9001, reason: 'ok' }),
});

describe('POST /api/webhooks/onegate — tokenisation', () => {
  let schoolId: mongoose.Types.ObjectId;
  let userId: mongoose.Types.ObjectId;

  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); await seedPlans(); });
  beforeEach(async () => {
    schoolId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
    await Subscription.deleteMany({}); await Invoice.deleteMany({});
    await CheckoutSession.deleteMany({}); await WebhookEvent.deleteMany({});
    vi.restoreAllMocks();
  });
  afterAll(async () => { await Plan.deleteMany({}); await mongoose.disconnect(); });

  it('processes tokenisation webhook: transitions sub to trialing, refunds R1', async () => {
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' });
    await CheckoutSession.create({
      userId, schoolId, planCode: 'pro_monthly', merchantReference: 'sub_ABC123',
      paymentKey: 'k', purpose: 'tokenisation', status: 'pending',
      expiresAt: new Date(Date.now() + 1800000),
    });
    const mock = mockLookup();
    vi.spyOn(onegate, 'getOneGateClient').mockReturnValue(mock as never);

    const res = await request(app).post('/api/webhooks/onegate').send({
      callpay_transaction_id: 9001, merchant_reference: 'sub_ABC123', amount: '1.00', success: 1,
    });

    expect(res.status).toBe(200);
    const sub = await Subscription.findOne({ schoolId });
    expect(sub?.status).toBe('trialing');
    expect(sub?.cardTokenGuid).toBe('TOK-1');
    expect(sub?.cardLastFour).toBe('0012');
    expect(mock.refundTransaction).toHaveBeenCalledWith(9001);
  });

  it('is idempotent — second webhook with same gatewayTransactionId is noop', async () => {
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' });
    await CheckoutSession.create({
      userId, schoolId, planCode: 'pro_monthly', merchantReference: 'sub_ABC123',
      paymentKey: 'k', purpose: 'tokenisation', status: 'pending',
      expiresAt: new Date(Date.now() + 1800000),
    });
    vi.spyOn(onegate, 'getOneGateClient').mockReturnValue(mockLookup() as never);

    await request(app).post('/api/webhooks/onegate').send({ callpay_transaction_id: 9001, merchant_reference: 'sub_ABC123', amount: '1.00', success: 1 });
    await request(app).post('/api/webhooks/onegate').send({ callpay_transaction_id: 9001, merchant_reference: 'sub_ABC123', amount: '1.00', success: 1 });

    const events = await WebhookEvent.countDocuments({ gatewayTransactionId: 9001 });
    expect(events).toBe(1);
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/webhook.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement webhook handler**

```ts
// campusly-backend/src/modules/subscription/webhook.ts
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { WebhookEvent, Subscription, CheckoutSession, Invoice } from './model';
import { SubscriptionService } from './service';
import { getOneGateClient } from '../../lib/onegate';
import { onegateWebhookSchema } from './validation';

function hashPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function handleOneGateWebhook(req: Request, res: Response): Promise<void> {
  const parsed = onegateWebhookSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'bad payload' }); return; }
  const payload = parsed.data;

  const existing = await WebhookEvent.findOne({ gatewayTransactionId: payload.callpay_transaction_id });
  if (existing && existing.status === 'processed') {
    res.json({ ok: true, idempotent: true }); return;
  }

  const event = existing ?? await WebhookEvent.create({
    gatewayTransactionId: payload.callpay_transaction_id,
    payloadHash: hashPayload(payload),
    rawPayload: payload,
    status: 'pending',
    verifiedViaLookup: false,
  });

  try {
    const lookup = await getOneGateClient().getTransaction(payload.callpay_transaction_id);
    event.verifiedViaLookup = true;

    const isRefund = payload.refunded_amount !== undefined && payload.amount === undefined;
    const ref = lookup.merchant_reference;

    if (ref.startsWith('sub_') && !isRefund) {
      await processTokenisation(ref, lookup);
    } else if (ref.startsWith('sub_') && isRefund) {
      await processVerificationRefund(ref, lookup);
    } else if (ref.startsWith('inv_') && !isRefund) {
      await processInvoiceCharge(ref, lookup);
    } else if (ref.startsWith('inv_') && isRefund) {
      await processInvoiceRefund(ref, lookup);
    }

    event.status = 'processed';
    event.processedAt = new Date();
    await event.save();
    res.json({ ok: true });
  } catch (err: unknown) {
    event.status = 'failed';
    event.error = err instanceof Error ? err.message : String(err);
    await event.save();
    res.status(500).json({ error: 'webhook processing failed' });
  }
}

async function processTokenisation(merchantRef: string, lookup: Awaited<ReturnType<ReturnType<typeof getOneGateClient>['getTransaction']>>): Promise<void> {
  const session = await CheckoutSession.findOne({ merchantReference: merchantRef });
  if (!session) throw new Error(`No CheckoutSession for ${merchantRef}`);

  if (lookup.successful !== 1) {
    session.status = 'failed';
    await session.save();
    return;
  }

  const token = lookup.customer_token;
  if (!token) throw new Error('No customer_token on successful tokenisation');

  const [m, y] = token.expiry_date.split('-').map((s) => parseInt(s, 10));
  await SubscriptionService.startTrial({
    schoolId: session.schoolId,
    planCode: session.planCode,
    cardTokenGuid: token.guid,
    cardLastFour: token.last_four ?? '',
    cardBrand: token.brand ?? '',
    cardExpiryMonth: m,
    cardExpiryYear: y,
  });

  session.status = 'completed';
  await session.save();

  // Refund the R1 verification
  await getOneGateClient().refundTransaction(lookup.id);
}

async function processVerificationRefund(merchantRef: string, _lookup: unknown): Promise<void> {
  // Log only — verification has no Invoice row (R1 charge wasn't an Invoice)
  // Future: write an Invoice with purpose='verification' for audit.
}

async function processInvoiceCharge(merchantRef: string, lookup: Awaited<ReturnType<ReturnType<typeof getOneGateClient>['getTransaction']>>): Promise<void> {
  const invoice = await Invoice.findOne({ merchantReference: merchantRef });
  if (!invoice) return; // unknown reference, ignore
  // If invoice is still pending and the lookup says success, reconcile
  if (invoice.status === 'pending' && lookup.successful === 1) {
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.gatewayTransactionId = lookup.id;
    invoice.gatewayReference = lookup.gateway_reference;
    invoice.gatewayResponse = lookup;
    await invoice.save();
  }
}

async function processInvoiceRefund(merchantRef: string, lookup: Awaited<ReturnType<ReturnType<typeof getOneGateClient>['getTransaction']>>): Promise<void> {
  const invoice = await Invoice.findOne({ merchantReference: merchantRef });
  if (!invoice) return;
  const refunded = parseFloat(lookup.refunded_amount) * 100;
  invoice.refundedAmount = refunded;
  invoice.status = refunded >= invoice.total ? 'refunded' : 'partially_refunded';
  await invoice.save();
}
```

- [ ] **Step 4: Add route**

Append to `routes.ts`:

```ts
import { handleOneGateWebhook } from './webhook';
// Public route — no auth, idempotency in the handler
router.post('/webhooks/onegate', handleOneGateWebhook);
```

- [ ] **Step 5: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/webhook.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): OneGate webhook with idempotency + lookup verify"
```

---

### Task 3.6: Webhook rate limiting

**Files:**
- Modify: `campusly-backend/src/modules/subscription/routes.ts`

- [ ] **Step 1: Check for existing rate-limit middleware**

Run: `grep -rn "express-rate-limit" campusly-backend/src/ | head -5`. If absent: `npm install express-rate-limit`.

- [ ] **Step 2: Wrap the webhook route with rate limit**

Modify `routes.ts`:

```ts
import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    const allow = (process.env.ONEGATE_IP_ALLOWLIST ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    return allow.length > 0 && allow.includes(req.ip ?? '');
  },
});

router.post('/webhooks/onegate', webhookLimiter, handleOneGateWebhook);
```

- [ ] **Step 3: Commit**

```
git add campusly-backend/src/modules/subscription/ campusly-backend/package.json campusly-backend/package-lock.json
git commit -m "feat(subscription): rate-limit OneGate webhook (60/min/IP)"
```

---

### Task 3.7: Cron worker (BullMQ)

**Files:**
- Create: `campusly-backend/src/modules/subscription/cron.ts`
- Modify: `campusly-backend/src/queues.ts` (or wherever workers are registered)
- Create: `campusly-backend/src/modules/subscription/__tests__/cron.test.ts`

- [ ] **Step 1: Find queue registration pattern**

Run: `find campusly-backend/src -name "queues.ts" -o -name "*.queue.ts" | head -5`. Open the file to see how queues + workers are registered and started.

- [ ] **Step 2: Write failing test (calls the processor directly, bypasses BullMQ)**

```ts
// campusly-backend/src/modules/subscription/__tests__/cron.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { Subscription, Plan, Invoice } from '../model';
import { processBillingTick } from '../cron';
import { seedPlans } from '../seed';
import * as onegate from '../../../lib/onegate';

describe('processBillingTick', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); await seedPlans(); });
  beforeEach(async () => {
    await Subscription.deleteMany({}); await Invoice.deleteMany({});
    vi.restoreAllMocks();
    vi.spyOn(onegate, 'getOneGateClient').mockReturnValue({
      chargeToken: vi.fn().mockResolvedValue({ success: 1, callpay_transaction_id: 1, amount: '149.00', reason: 'n/a', organisation_id: 21234, merchant_reference: 'x', gateway_reference: 'ok', gateway_response: {} }),
    } as never);
  });
  afterAll(async () => { await Plan.deleteMany({}); await mongoose.disconnect(); });

  it('charges subscriptions whose nextBillingAt is past', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await Subscription.create({
      schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'trialing',
      nextBillingAt: new Date(Date.now() - 1000), cardTokenGuid: 'g',
      cardLastFour: '0012', cardBrand: 'visa', cardExpiryMonth: 12, cardExpiryYear: 2031,
      retryCount: 0, gatewayProvider: 'onegate',
    });

    await processBillingTick();

    const sub = await Subscription.findOne({ schoolId });
    expect(sub?.status).toBe('active');
  });

  it('skips subscriptions with future nextBillingAt', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await Subscription.create({
      schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'active',
      nextBillingAt: new Date(Date.now() + 1000000), cardTokenGuid: 'g',
      retryCount: 0, gatewayProvider: 'onegate',
    });

    await processBillingTick();

    const sub = await Subscription.findOne({ schoolId });
    expect(sub?.status).toBe('active');
    expect(await Invoice.countDocuments()).toBe(0);
  });

  it('releases stale processingLockedAt older than 10 minutes', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const staleLock = new Date(Date.now() - 11 * 60 * 1000);
    await Subscription.create({
      schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'trialing',
      nextBillingAt: new Date(Date.now() - 1000), cardTokenGuid: 'g',
      cardLastFour: '0012', cardBrand: 'visa', cardExpiryMonth: 12, cardExpiryYear: 2031,
      retryCount: 0, gatewayProvider: 'onegate', processingLockedAt: staleLock,
    });

    await processBillingTick();

    const sub = await Subscription.findOne({ schoolId });
    expect(sub?.processingLockedAt).toBeNull();
    expect(sub?.status).toBe('active');
  });
});
```

- [ ] **Step 3: Run — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/cron.test.ts`
Expected: FAIL — `processBillingTick` not defined.

- [ ] **Step 4: Implement the tick processor**

```ts
// campusly-backend/src/modules/subscription/cron.ts
import { Subscription } from './model';
import { SubscriptionService } from './service';

const STALE_LOCK_MS = 10 * 60 * 1000;
const BATCH_SIZE = 50;

export async function processBillingTick(): Promise<void> {
  await releaseStaleLocks();

  const now = new Date();
  const due = await Subscription.find({
    nextBillingAt: { $lte: now },
    status: { $in: ['trialing', 'active', 'past_due', 'canceled'] },
    processingLockedAt: null,
  }).limit(BATCH_SIZE);

  for (const sub of due) {
    const claimed = await Subscription.findOneAndUpdate(
      { _id: sub._id, processingLockedAt: null },
      { $set: { processingLockedAt: now } },
      { new: true },
    );
    if (!claimed) continue;
    try {
      await SubscriptionService.chargeSubscription(sub._id as never);
    } finally {
      await Subscription.updateOne({ _id: sub._id }, { $set: { processingLockedAt: null } });
    }
  }
}

async function releaseStaleLocks(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_LOCK_MS);
  await Subscription.updateMany(
    { processingLockedAt: { $lt: cutoff } },
    { $set: { processingLockedAt: null } },
  );
}
```

- [ ] **Step 5: Register a BullMQ scheduled job**

Find the queue registration file (from Step 1). Add:

```ts
// In the queue registration file (e.g. campusly-backend/src/queues.ts):
import { Queue, Worker } from 'bullmq';
import { processBillingTick } from './modules/subscription/cron';
import { redisConnection } from './redis';

export const subscriptionBillingQueue = new Queue('subscription-billing', { connection: redisConnection });

export function startSubscriptionBillingWorker(): Worker {
  const worker = new Worker('subscription-billing', async () => {
    await processBillingTick();
  }, { connection: redisConnection });

  // Repeatable job: every 5 minutes
  subscriptionBillingQueue.add(
    'tick',
    {},
    { repeat: { every: 5 * 60 * 1000 }, removeOnComplete: true, removeOnFail: 100 },
  );

  return worker;
}
```

Wire `startSubscriptionBillingWorker()` into the existing worker bootstrap (where other workers are started), gated on `process.env.SUBSCRIPTION_CRON_ENABLED === 'true'`.

- [ ] **Step 6: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/cron.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```
git add campusly-backend/src/modules/subscription/ campusly-backend/src/queues.ts
git commit -m "feat(subscription): BullMQ billing cron (5-min tick)"
```

---

### Task 3.8: Entitlement middleware

**Files:**
- Create: `campusly-backend/src/modules/subscription/entitlements.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/entitlements.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/entitlements.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { Subscription, Plan } from '../model';
import { requireEntitlement, resolveEntitlements } from '../entitlements';
import { seedPlans } from '../seed';

describe('requireEntitlement middleware', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); await seedPlans(); });
  beforeEach(async () => { await Subscription.deleteMany({}); });
  afterAll(async () => { await Plan.deleteMany({}); await mongoose.disconnect(); });

  function makeApp(feature: string) {
    const a = express();
    a.use(express.json());
    a.use((req, _res, next) => { req.user = { schoolId: (req.headers['x-school-id'] as unknown) as mongoose.Types.ObjectId } as never; next(); });
    a.get('/protected', requireEntitlement(feature), (_req, res) => res.json({ ok: true }));
    return a;
  }

  it('blocks free user from aiGeneration', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' });
    const res = await request(makeApp('aiGeneration')).get('/protected').set('x-school-id', schoolId.toString());
    expect(res.status).toBe(402);
  });

  it('allows pro_monthly user', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'active', retryCount: 0, gatewayProvider: 'onegate' });
    const res = await request(makeApp('aiGeneration')).get('/protected').set('x-school-id', schoolId.toString());
    expect(res.status).toBe(200);
  });

  it('allows trialing user', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'pro_monthly', status: 'trialing', retryCount: 0, gatewayProvider: 'onegate' });
    const res = await request(makeApp('aiGeneration')).get('/protected').set('x-school-id', schoolId.toString());
    expect(res.status).toBe(200);
  });

  it('blocks free-tier user even if planCode is pro after canceled+expired (drops to free)', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    await Subscription.create({ schoolId, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' });
    expect((await resolveEntitlements(schoolId)).aiGeneration).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/entitlements.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement middleware**

```ts
// campusly-backend/src/modules/subscription/entitlements.ts
import type { Request, Response, NextFunction } from 'express';
import type mongoose from 'mongoose';
import { Subscription, Plan } from './model';

const ENTITLED_STATUSES = new Set(['trialing', 'active', 'past_due', 'canceled']);

export async function resolveEntitlements(schoolId: mongoose.Types.ObjectId): Promise<Record<string, unknown>> {
  const sub = await Subscription.findOne({ schoolId });
  if (!sub) return {};
  // canceled but still in period → entitled until end
  if (sub.status === 'canceled') {
    if (!sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() <= Date.now()) return {};
  }
  if (!ENTITLED_STATUSES.has(sub.status) && sub.status !== 'free') return {};

  const plan = await Plan.findOne({ code: sub.planCode });
  return (plan?.entitlements ?? {}) as Record<string, unknown>;
}

export function requireEntitlement(feature: string) {
  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const ents = await resolveEntitlements(schoolId);
    if (ents[feature] === true) { next(); return; }
    res.status(402).json({ error: 'Payment required', feature });
  };
}
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/entitlements.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): requireEntitlement middleware + resolver"
```

---

## Phase 4 — Migration + Auth Integration

---

### Task 4.1: Wire `createInitialFreeSubscription` into teacher signup

**Files:**
- Modify: `campusly-backend/src/modules/auth/service.ts`
- Create: `campusly-backend/src/modules/auth/__tests__/standalone-teacher-subscription.test.ts`

- [ ] **Step 1: Locate the standalone-teacher creation function**

Run: `grep -n "standalone\|createStandalone\|registerTeacher" campusly-backend/src/modules/auth/service.ts | head -10`. Identify the function that creates the School + User during teacher signup (referenced in spec at `auth/service.ts:75-100`).

- [ ] **Step 2: Write failing test**

```ts
// campusly-backend/src/modules/auth/__tests__/standalone-teacher-subscription.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { AuthService } from '../service';
import { Subscription } from '../../subscription/model';
import { School } from '../../School/model';
import { User } from '../model';

describe('standalone teacher signup creates Free subscription', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); });
  afterAll(async () => {
    await User.deleteMany({ email: /^t\+.*@test\.local$/ });
    await School.deleteMany({ name: /^t_signup_/ });
    await Subscription.deleteMany({});
    await mongoose.disconnect();
  });

  it('creates Subscription with status=free for the new school', async () => {
    const email = `t+${Date.now()}@test.local`;
    const result = await AuthService.registerStandaloneTeacher({
      email, password: 'Password1!', firstName: 'T', lastName: 'X', schoolName: `t_signup_${Date.now()}`,
    });
    const sub = await Subscription.findOne({ schoolId: result.school._id });
    expect(sub).not.toBeNull();
    expect(sub?.status).toBe('free');
    expect(sub?.planCode).toBe('free');
  });
});
```

- [ ] **Step 3: Run — confirm fail (no subscription yet, may pass with old hardcoded basic tier — examine the result)**

Run: `npm test -- src/modules/auth/__tests__/standalone-teacher-subscription.test.ts`
Expected: FAIL — Subscription not created (only `School.subscription` embedded was set previously).

- [ ] **Step 4: Modify auth service**

In `auth/service.ts`, in the standalone-teacher registration function (referenced in spec lines 75-100), after the `School.create(...)` line, **remove** the hardcoded `subscription: { tier: 'basic', expiresAt: <365d> }` from the school payload, and immediately after creating the School add:

```ts
import { SubscriptionService } from '../subscription/service';

// ... existing code that creates user + school ...
const school = await School.create({ ...schoolPayload /* WITHOUT the subscription object */ });
await SubscriptionService.createInitialFreeSubscription(school._id as mongoose.Types.ObjectId);
```

- [ ] **Step 5: Run tests — confirm pass**

Run: `npm test -- src/modules/auth/__tests__/standalone-teacher-subscription.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full auth test suite to catch regressions**

Run: `npm test -- src/modules/auth/`
Expected: All pass.

- [ ] **Step 7: Commit**

```
git add campusly-backend/src/modules/auth/
git commit -m "feat(auth): standalone teacher signup creates Free subscription"
```

---

### Task 4.2: Include subscription in `/api/auth/me` response

**Files:**
- Modify: `campusly-backend/src/modules/auth/controller.ts` (or wherever `/me` is handled)
- Modify: `campusly-backend/src/modules/auth/__tests__/me.test.ts` (or create)

- [ ] **Step 1: Locate `/auth/me` handler**

Run: `grep -rn "/me\|getMe\|currentUser" campusly-backend/src/modules/auth/ | head -10`.

- [ ] **Step 2: Write/modify test to assert subscription shape**

```ts
// In an existing or new __tests__/me.test.ts:
it('GET /auth/me returns user + subscription + plan', async () => {
  // ... existing setup creating user with schoolId, free subscription
  const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.data.user).toBeTruthy();
  expect(res.body.data.subscription?.status).toBe('free');
  expect(res.body.data.plan?.code).toBe('free');
});
```

- [ ] **Step 3: Run — confirm fail**

Run: `npm test -- src/modules/auth/__tests__/me.test.ts`
Expected: FAIL — subscription not in response.

- [ ] **Step 4: Modify `/me` controller**

```ts
// In auth controller's getMe:
import { Subscription, Plan } from '../subscription/model';
import { SubscriptionService } from '../subscription/service';

// inside getMe, after loading user:
let subscription = null;
let plan = null;
if (user.schoolId) {
  subscription = await Subscription.findOne({ schoolId: user.schoolId })
    ?? await SubscriptionService.createInitialFreeSubscription(user.schoolId);
  plan = await Plan.findOne({ code: subscription.planCode });
}

res.json({ data: { user, subscription, plan, tokens: existingTokensBlock } });
```

(Preserve existing response keys — just augment with `subscription` and `plan`.)

- [ ] **Step 5: Run tests — confirm pass**

Run: `npm test -- src/modules/auth/__tests__/me.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```
git add campusly-backend/src/modules/auth/
git commit -m "feat(auth): include subscription + plan in /auth/me response"
```

---

### Task 4.3: Migration — grandfather existing standalone teachers as Pro

**Files:**
- Create: `campusly-backend/src/modules/subscription/migrate-grandfather.ts`
- Create: `campusly-backend/src/modules/subscription/__tests__/migrate-grandfather.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/migrate-grandfather.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Subscription, Plan } from '../model';
import { School } from '../../School/model';
import { migrateGrandfather, GRANDFATHER_CUTOFF } from '../migrate-grandfather';
import { seedPlans } from '../seed';

describe('migrateGrandfather', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); await seedPlans(); });
  beforeEach(async () => {
    await School.deleteMany({ name: /^mg_/ });
    await Subscription.deleteMany({});
  });
  afterAll(async () => { await Plan.deleteMany({}); await mongoose.disconnect(); });

  it('creates pro_monthly Subscription for existing standalone-teacher school without one', async () => {
    const school = await School.create({ name: 'mg_existing', plan: 'standalone' });
    await migrateGrandfather();
    const sub = await Subscription.findOne({ schoolId: school._id });
    expect(sub?.status).toBe('active');
    expect(sub?.planCode).toBe('pro_monthly');
    expect(sub?.cancelAtPeriodEnd).toBe(true);
    expect(sub?.currentPeriodEnd?.getTime()).toBe(GRANDFATHER_CUTOFF.getTime());
  });

  it('does not overwrite existing Subscription', async () => {
    const school = await School.create({ name: 'mg_has_sub', plan: 'standalone' });
    await Subscription.create({ schoolId: school._id, subscriberType: 'teacher', planCode: 'free', status: 'free', retryCount: 0, gatewayProvider: 'onegate' });
    await migrateGrandfather();
    const sub = await Subscription.findOne({ schoolId: school._id });
    expect(sub?.status).toBe('free');
  });

  it('does not grandfather non-standalone schools (real school accounts get Free)', async () => {
    const school = await School.create({ name: 'mg_real_school', plan: 'school' });
    await migrateGrandfather();
    const sub = await Subscription.findOne({ schoolId: school._id });
    expect(sub?.status).toBe('free');
    expect(sub?.planCode).toBe('free');
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/migrate-grandfather.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement migration**

```ts
// campusly-backend/src/modules/subscription/migrate-grandfather.ts
import mongoose from 'mongoose';
import { Subscription } from './model';
import { School } from '../School/model';
import { SubscriptionService } from './service';

export const GRANDFATHER_CUTOFF = new Date('2026-08-13T00:00:00Z');

export async function migrateGrandfather(): Promise<{ grandfathered: number; freeBackfilled: number }> {
  let grandfathered = 0;
  let freeBackfilled = 0;

  const schools = await School.find({}).select('_id plan createdAt');
  for (const school of schools) {
    const existing = await Subscription.findOne({ schoolId: school._id });
    if (existing) continue;

    if (school.plan === 'standalone') {
      await Subscription.create({
        schoolId: school._id,
        subscriberType: 'teacher',
        planCode: 'pro_monthly',
        status: 'active',
        currentPeriodStart: school.createdAt ?? new Date(),
        currentPeriodEnd: GRANDFATHER_CUTOFF,
        nextBillingAt: GRANDFATHER_CUTOFF,
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        retryCount: 0,
        gatewayProvider: 'onegate',
      });
      const sub = await Subscription.findOne({ schoolId: school._id });
      if (sub) await SubscriptionService.syncSchoolCache(sub);
      grandfathered++;
    } else {
      await SubscriptionService.createInitialFreeSubscription(school._id as mongoose.Types.ObjectId);
      freeBackfilled++;
    }
  }

  return { grandfathered, freeBackfilled };
}

if (require.main === module) {
  import('mongoose').then(async (m) => {
    await m.default.connect(process.env.MONGODB_URI!);
    const result = await migrateGrandfather();
    console.log('Migration:', result);
    await m.default.disconnect();
  });
}
```

- [ ] **Step 4: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/migrate-grandfather.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): grandfather migration (90-day Pro for existing teachers)"
```

---

## Phase 5 — Frontend Foundations (Types + Store + Hooks)

---

### Task 5.1: Frontend types

**Files:**
- Create: `campusly-frontend/src/types/subscription.ts`
- Modify: `campusly-frontend/src/types/index.ts`

- [ ] **Step 1: Create types file**

```ts
// campusly-frontend/src/types/subscription.ts
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

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface Invoice {
  id: string;
  subscriptionId: string;
  planCode: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
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

export interface CheckoutSessionResponse {
  paymentKey: string;
  sessionId: string;
}

export interface CheckoutSessionStatus {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  planCode: string;
}
```

- [ ] **Step 2: Re-export from barrel**

Append to `campusly-frontend/src/types/index.ts`:

```ts
export * from './subscription';
```

- [ ] **Step 3: Commit**

```
git add campusly-frontend/src/types/
git commit -m "feat(subscription): frontend types"
```

---

### Task 5.2: `useAuthStore` subscription slice

**Files:**
- Modify: `campusly-frontend/src/stores/useAuthStore.ts`

- [ ] **Step 1: Read existing store**

Run: `cat campusly-frontend/src/stores/useAuthStore.ts | head -80` to confirm exact shape.

- [ ] **Step 2: Extend store with subscription state**

Modify `useAuthStore.ts`:

```ts
import type { Subscription, Plan } from '@/types/subscription';

// Add to AuthState interface:
interface AuthState {
  // ... existing fields ...
  subscription: Subscription | null;
  plan: Plan | null;
  setSubscription: (sub: Subscription | null, plan: Plan | null) => void;
}

// In create<AuthState>((set, get) => ({ ... })):
subscription: null,
plan: null,
setSubscription: (sub, plan) => set({ subscription: sub, plan }),

// In login(user, tokens, subscription?, plan?), update signature to accept subscription + plan from /auth/me response:
login: (user, tokens, subscription = null, plan = null) => {
  // ... existing localStorage + set logic ...
  set({ user, tokens, permissions: perms, subscription, plan, isAuthenticated: true, isLoading: false });
  scheduleTokenRefresh();
},

// In logout(): clear subscription + plan:
logout: () => {
  // ... existing localStorage cleanup ...
  set({ user: null, tokens: null, subscription: null, plan: null, /* etc */ });
},
```

- [ ] **Step 3: Update session hydration (`/auth/me` consumer)**

Find the session hydration code (e.g. in `src/hooks/useAuth.ts` or `AuthProvider.tsx`). When it receives `/auth/me`, pass `subscription` and `plan` to `login()`.

- [ ] **Step 4: Commit**

```
git add campusly-frontend/src/stores/ campusly-frontend/src/hooks/ campusly-frontend/src/components/auth/
git commit -m "feat(subscription): subscription slice in useAuthStore"
```

---

### Task 5.3: `useSubscription` hook

**Files:**
- Create: `campusly-frontend/src/hooks/useSubscription.ts`

- [ ] **Step 1: Create hook**

```ts
// campusly-frontend/src/hooks/useSubscription.ts
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Subscription, Plan } from '@/types/subscription';

interface MeResponse {
  subscription: Subscription | null;
  plan: Plan | null;
}

export function useSubscription() {
  const subscription = useAuthStore((s) => s.subscription);
  const plan = useAuthStore((s) => s.plan);
  const setSubscription = useAuthStore((s) => s.setSubscription);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/subscriptions/me');
      const data = unwrapResponse<MeResponse>(res);
      setSubscription(data.subscription, data.plan);
    } finally {
      setLoading(false);
    }
  }, [setSubscription]);

  useEffect(() => {
    if (!subscription) refetch();
  }, [subscription, refetch]);

  const isTrialing = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';
  const isPro = isTrialing || isActive ||
    (subscription?.status === 'canceled' && subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() > Date.now()) ||
    subscription?.status === 'past_due';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled';

  let daysLeftInTrial: number | null = null;
  if (isTrialing && subscription?.trialEndsAt) {
    const ms = new Date(subscription.trialEndsAt).getTime() - Date.now();
    daysLeftInTrial = Math.max(0, Math.ceil(ms / 86400000));
  }

  return { subscription, plan, loading, refetch, isPro, isTrialing, isActive, isPastDue, isCanceled, daysLeftInTrial };
}
```

- [ ] **Step 2: Commit**

```
git add campusly-frontend/src/hooks/useSubscription.ts
git commit -m "feat(subscription): useSubscription hook"
```

---

### Task 5.4: `useEntitlement` hook

**Files:**
- Create: `campusly-frontend/src/hooks/useEntitlement.ts`

- [ ] **Step 1: Create hook**

```ts
// campusly-frontend/src/hooks/useEntitlement.ts
import { useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

const ENTITLED_STATUSES = new Set(['trialing', 'active', 'past_due']);

export function useEntitlement(feature: string): boolean {
  const subscription = useAuthStore((s) => s.subscription);
  const plan = useAuthStore((s) => s.plan);

  return useMemo(() => {
    if (!subscription || !plan) return false;

    const status = subscription.status;
    let entitled = ENTITLED_STATUSES.has(status);
    if (status === 'canceled' && subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() > Date.now()) {
      entitled = true;
    }
    if (status === 'free') entitled = true; // free plan features apply

    if (!entitled) return false;
    return plan.entitlements[feature] === true;
  }, [subscription, plan, feature]);
}
```

- [ ] **Step 2: Commit**

```
git add campusly-frontend/src/hooks/useEntitlement.ts
git commit -m "feat(subscription): useEntitlement hook"
```

---

### Task 5.5: `useCheckout` hook (loads widget script + launches modal)

**Files:**
- Create: `campusly-frontend/src/hooks/useCheckout.ts`

- [ ] **Step 1: Create hook**

```ts
// campusly-frontend/src/hooks/useCheckout.ts
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useSubscription } from './useSubscription';

interface CheckoutInitResponse { paymentKey: string; sessionId: string; }

declare global { interface Window { Checkout?: { init: (opts: CheckoutOptions) => void } } }

interface CheckoutOptions {
  paymentKey: string;
  onComplete?: (data: unknown) => void;
  onError?: (data: unknown) => void;
}

const CHECKOUT_JS = process.env.NEXT_PUBLIC_ONEGATE_CHECKOUT_JS
  ?? 'https://payments.onegate.co.za/ext/checkout/v4/checkout.js';

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Checkout) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_JS;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('Failed to load OneGate Checkout')); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const { refetch } = useSubscription();

  const launch = useCallback(async (planCode: 'pro_monthly' | 'pro_annual') => {
    setLoading(true);
    try {
      await loadScript();
      const res = await apiClient.post('/subscriptions/checkout', { planCode });
      const { paymentKey, sessionId } = unwrapResponse<CheckoutInitResponse>(res);
      if (!window.Checkout) throw new Error('Checkout SDK not loaded');

      window.Checkout.init({
        paymentKey,
        onComplete: async () => {
          toast.success('Card added — your trial is active');
          await refetch();
        },
        onError: (err) => {
          console.error('Checkout error:', err);
          toast.error('Payment setup failed. Please try again.');
        },
      });
      return { sessionId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed';
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  return { launch, loading };
}
```

- [ ] **Step 2: Add env var**

Append to `campusly-frontend/.env.local`:

```
NEXT_PUBLIC_ONEGATE_CHECKOUT_JS=https://payments.onegate.co.za/ext/checkout/v4/checkout.js
```

- [ ] **Step 3: Commit**

```
git add campusly-frontend/src/hooks/useCheckout.ts
git commit -m "feat(subscription): useCheckout hook + widget loader"
```

---

### Task 5.6: `useInvoices` hook

**Files:**
- Create: `campusly-frontend/src/hooks/useInvoices.ts`

- [ ] **Step 1: Create hook**

```ts
// campusly-frontend/src/hooks/useInvoices.ts
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Invoice } from '@/types/subscription';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiClient.get('/subscriptions/invoices');
        if (!cancelled) setInvoices(unwrapList<Invoice>(res));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { invoices, loading };
}
```

- [ ] **Step 2: Commit**

```
git add campusly-frontend/src/hooks/useInvoices.ts
git commit -m "feat(subscription): useInvoices hook"
```

---

## Phase 6 — Frontend Pricing Page + Checkout Flow

---

### Task 6.1: `PricingCards` component

**Files:**
- Create: `campusly-frontend/src/components/subscription/PricingCards.tsx`

- [ ] **Step 1: Create component**

```tsx
// campusly-frontend/src/components/subscription/PricingCards.tsx
'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Plan } from '@/types/subscription';

interface Props {
  plans: Plan[];
  currentPlanCode: string | null;
  onSelect: (planCode: 'pro_monthly' | 'pro_annual') => void;
  loading?: boolean;
}

const PRO_FEATURES = [
  'AI question generation',
  'Auto-marking with rubrics',
  'Unlimited classes',
  'Advanced analytics & reports',
  'Paper generation',
  'Email support',
];

const FREE_FEATURES = [
  '1 class',
  'Manual marking',
  'Basic analytics',
];

function formatPrice(amountCents: number, interval: string | null): string {
  if (amountCents === 0) return 'Free';
  const r = (amountCents / 100).toFixed(0);
  return `R${r}/${interval === 'year' ? 'year' : 'month'}`;
}

export function PricingCards({ plans, currentPlanCode, onSelect, loading }: Props) {
  const free = plans.find((p) => p.code === 'free');
  const monthly = plans.find((p) => p.code === 'pro_monthly');
  const annual = plans.find((p) => p.code === 'pro_annual');

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
      {free && (
        <Card className="p-6 flex flex-col">
          <h3 className="text-lg font-semibold">{free.name}</h3>
          <div className="mt-2 text-3xl font-bold">Free</div>
          <p className="mt-1 text-sm text-muted-foreground">Get started, no card needed.</p>
          <ul className="mt-6 space-y-2 text-sm flex-1">
            {FREE_FEATURES.map((f) => <li key={f} className="flex gap-2 items-start"><Check className="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{f}</span></li>)}
          </ul>
          <Button variant="outline" disabled className="mt-6 w-full">
            {currentPlanCode === 'free' ? 'Current plan' : 'Free tier'}
          </Button>
        </Card>
      )}

      {monthly && (
        <Card className="p-6 flex flex-col border-primary">
          <h3 className="text-lg font-semibold">{monthly.name}</h3>
          <div className="mt-2 text-3xl font-bold">{formatPrice(monthly.amountExclTax, monthly.interval)}</div>
          <p className="mt-1 text-sm text-muted-foreground">14-day free trial. Cancel anytime.</p>
          <ul className="mt-6 space-y-2 text-sm flex-1">
            {PRO_FEATURES.map((f) => <li key={f} className="flex gap-2 items-start"><Check className="w-4 h-4 mt-0.5 text-primary" /><span>{f}</span></li>)}
          </ul>
          <Button onClick={() => onSelect('pro_monthly')} disabled={loading || currentPlanCode === 'pro_monthly'} className="mt-6 w-full">
            {currentPlanCode === 'pro_monthly' ? 'Current plan' : 'Start 14-day trial'}
          </Button>
        </Card>
      )}

      {annual && (
        <Card className="p-6 flex flex-col">
          <h3 className="text-lg font-semibold">{annual.name}</h3>
          <div className="mt-2 text-3xl font-bold">{formatPrice(annual.amountExclTax, annual.interval)}</div>
          <p className="mt-1 text-sm text-muted-foreground">2 months free vs monthly.</p>
          <ul className="mt-6 space-y-2 text-sm flex-1">
            {PRO_FEATURES.map((f) => <li key={f} className="flex gap-2 items-start"><Check className="w-4 h-4 mt-0.5 text-primary" /><span>{f}</span></li>)}
          </ul>
          <Button onClick={() => onSelect('pro_annual')} disabled={loading || currentPlanCode === 'pro_annual'} variant="outline" className="mt-6 w-full">
            {currentPlanCode === 'pro_annual' ? 'Current plan' : 'Start 14-day trial'}
          </Button>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add campusly-frontend/src/components/subscription/
git commit -m "feat(subscription): PricingCards component"
```

---

### Task 6.2: `usePlans` hook + Subscription pricing page

**Files:**
- Create: `campusly-frontend/src/hooks/usePlans.ts`
- Create: `campusly-frontend/src/app/(dashboard)/subscription/page.tsx`

- [ ] **Step 1: Create `usePlans` hook**

```ts
// campusly-frontend/src/hooks/usePlans.ts
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Plan } from '@/types/subscription';

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient.get('/plans').then((res) => {
      if (!cancelled) setPlans(unwrapList<Plan>(res));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { plans, loading };
}
```

- [ ] **Step 2: Create pricing page**

```tsx
// campusly-frontend/src/app/(dashboard)/subscription/page.tsx
'use client';

import { PricingCards } from '@/components/subscription/PricingCards';
import { usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useCheckout } from '@/hooks/useCheckout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';

export default function SubscriptionPage() {
  const { plans, loading: plansLoading } = usePlans();
  const { subscription, loading: subLoading } = useSubscription();
  const { launch, loading: launchLoading } = useCheckout();

  if (plansLoading || subLoading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader title="Choose your plan" description="Start a 14-day Pro trial with no commitment. Cancel anytime." />
      <div className="mt-8">
        <PricingCards
          plans={plans}
          currentPlanCode={subscription?.planCode ?? null}
          onSelect={launch}
          loading={launchLoading}
        />
      </div>
      <p className="mt-8 text-xs text-muted-foreground text-center">
        A small verification charge is placed on your card to confirm it; this is automatically refunded.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Run dev server (`npm run dev` in both repos), log in as a teacher, navigate to `/subscription`. Confirm the three plan cards render. Confirm clicking "Start 14-day trial" loads checkout.js (network tab) and opens the OneGate modal.

- [ ] **Step 4: Commit**

```
git add campusly-frontend/src/hooks/usePlans.ts campusly-frontend/src/app/\(dashboard\)/subscription/
git commit -m "feat(subscription): pricing page with checkout launcher"
```

---

### Task 6.3: Success / Error / Pending return pages

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/subscription/success/page.tsx`
- Create: `campusly-frontend/src/app/(dashboard)/subscription/error/page.tsx`
- Create: `campusly-frontend/src/app/(dashboard)/subscription/pending/page.tsx`

- [ ] **Step 1: Create success page**

```tsx
// campusly-frontend/src/app/(dashboard)/subscription/success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useSubscription } from '@/hooks/useSubscription';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscriptionSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { refetch } = useSubscription();
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    const sessionId = params.get('session');
    if (!sessionId) { setStatus('failed'); return; }
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await apiClient.get(`/subscriptions/checkout-session/${sessionId}`);
        const data = unwrapResponse<{ status: string }>(res);
        if (data.status === 'completed') {
          await refetch();
          setStatus('ready');
        } else if (data.status === 'failed' || attempts > 15) {
          setStatus('failed');
        } else {
          setTimeout(poll, 1000);
        }
      } catch {
        if (attempts > 15) setStatus('failed');
        else setTimeout(poll, 1000);
      }
    };
    poll();
  }, [params, refetch]);

  if (status === 'loading') return <div className="py-16 text-center"><LoadingSpinner /><p className="mt-4 text-muted-foreground">Confirming your subscription…</p></div>;

  if (status === 'failed') {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">We couldn't confirm your subscription. Please try again.</p>
        <Button onClick={() => router.push('/subscription')} className="mt-6">Back to plans</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 text-center max-w-md">
      <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
      <h1 className="mt-4 text-2xl font-bold">You're on Pro</h1>
      <p className="mt-2 text-muted-foreground">Your 14-day trial has started. No charge until trial ends.</p>
      <Button onClick={() => router.push('/teacher')} className="mt-6">Go to dashboard</Button>
    </div>
  );
}
```

- [ ] **Step 2: Create error page**

```tsx
// campusly-frontend/src/app/(dashboard)/subscription/error/page.tsx
'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscriptionErrorPage() {
  return (
    <div className="container mx-auto py-16 text-center max-w-md">
      <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
      <h1 className="mt-4 text-2xl font-bold">Payment setup failed</h1>
      <p className="mt-2 text-muted-foreground">Your card couldn't be added. No charge was made.</p>
      <Button asChild className="mt-6"><Link href="/subscription">Try again</Link></Button>
    </div>
  );
}
```

- [ ] **Step 3: Create pending page**

```tsx
// campusly-frontend/src/app/(dashboard)/subscription/pending/page.tsx
'use client';

import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function SubscriptionPendingPage() {
  return (
    <div className="container mx-auto py-16 text-center max-w-md">
      <LoadingSpinner />
      <h1 className="mt-4 text-2xl font-bold">Almost there</h1>
      <p className="mt-2 text-muted-foreground">Your payment is being processed. We'll update your account shortly.</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```
git add campusly-frontend/src/app/\(dashboard\)/subscription/
git commit -m "feat(subscription): success/error/pending return pages"
```

---

## Phase 7 — Banners + Entitlement Gating

---

### Task 7.1: `TrialBanner` + `DunningBanner` components

**Files:**
- Create: `campusly-frontend/src/components/subscription/TrialBanner.tsx`
- Create: `campusly-frontend/src/components/subscription/DunningBanner.tsx`

- [ ] **Step 1: Create TrialBanner**

```tsx
// campusly-frontend/src/components/subscription/TrialBanner.tsx
'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export function TrialBanner() {
  const { isTrialing, daysLeftInTrial } = useSubscription();
  if (!isTrialing || daysLeftInTrial == null) return null;

  const amber = daysLeftInTrial <= 3;
  const bg = amber ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-primary/5 border-primary/20 text-foreground';

  return (
    <div className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm ${bg}`}>
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        <span>{daysLeftInTrial} {daysLeftInTrial === 1 ? 'day' : 'days'} left in your Pro trial.</span>
      </div>
      <Link href="/my/billing" className="font-medium underline">Manage</Link>
    </div>
  );
}
```

- [ ] **Step 2: Create DunningBanner**

```tsx
// campusly-frontend/src/components/subscription/DunningBanner.tsx
'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export function DunningBanner() {
  const { subscription, isPastDue } = useSubscription();
  if (!isPastDue) return null;

  const isExpiredCard = subscription?.lastFailureReason === 'card_expired';
  const nextRetryAt = subscription?.nextRetryAt ? new Date(subscription.nextRetryAt).toLocaleDateString() : null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        <span>
          {isExpiredCard
            ? 'Your card on file has expired.'
            : `Your last payment didn't go through.${nextRetryAt ? ` We'll retry on ${nextRetryAt}.` : ''}`}
        </span>
      </div>
      <Link href="/my/billing" className="font-medium underline">Update card</Link>
    </div>
  );
}
```

- [ ] **Step 3: Mount in dashboard layout**

Modify `campusly-frontend/src/app/(dashboard)/layout.tsx` — add the banners just below the TopBar so they appear on every dashboard page:

```tsx
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { DunningBanner } from '@/components/subscription/DunningBanner';

// Inside the JSX, just below <TopBar /> and above {children}:
<TrialBanner />
<DunningBanner />
```

- [ ] **Step 4: Manual smoke test**

Log in as a trialing user (or manually set status via Mongo):
```
db.subscriptions.updateOne({schoolId: <id>}, {$set: {status: 'trialing', trialEndsAt: new Date(Date.now() + 10*86400000)}})
```
Reload dashboard. Confirm "10 days left in your Pro trial." banner appears.

- [ ] **Step 5: Commit**

```
git add campusly-frontend/src/components/subscription/ campusly-frontend/src/app/\(dashboard\)/layout.tsx
git commit -m "feat(subscription): trial + dunning banners in dashboard layout"
```

---

### Task 7.2: `ProGate` wrapper component + `UpgradeModal`

**Files:**
- Create: `campusly-frontend/src/components/subscription/ProGate.tsx`
- Create: `campusly-frontend/src/components/subscription/UpgradeModal.tsx`

- [ ] **Step 1: Create `ProGate`**

```tsx
// campusly-frontend/src/components/subscription/ProGate.tsx
'use client';

import type { ReactNode } from 'react';
import { useEntitlement } from '@/hooks/useEntitlement';

interface Props {
  feature: string;
  fallback: ReactNode;
  children: ReactNode;
}

export function ProGate({ feature, fallback, children }: Props) {
  const entitled = useEntitlement(feature);
  return <>{entitled ? children : fallback}</>;
}
```

- [ ] **Step 2: Create `UpgradeModal`**

```tsx
// campusly-frontend/src/components/subscription/UpgradeModal.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  aiGeneration: 'AI question generation',
  paperGeneration: 'Paper generation',
  advancedAnalytics: 'Advanced analytics',
};

export function UpgradeModal({ open, onOpenChange, feature }: Props) {
  const router = useRouter();
  const label = feature ? (FEATURE_LABELS[feature] ?? 'this feature') : 'this feature';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Pro feature</DialogTitle>
          <DialogDescription>{label} is a Pro feature. Start a 14-day free trial to use it.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 text-sm text-muted-foreground">
          <ul className="space-y-2 list-disc pl-5">
            <li>14 days free, no charge during the trial</li>
            <li>Cancel anytime from your billing settings</li>
            <li>R149/month or R1,490/year (2 months free)</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Not now</Button>
          <Button onClick={() => { onOpenChange(false); router.push('/subscription'); }}>See plans</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Commit**

```
git add campusly-frontend/src/components/subscription/
git commit -m "feat(subscription): ProGate + UpgradeModal"
```

---

### Task 7.3: Apply entitlement gating to existing Pro features

**Files:**
- Modify: all locations that currently expose AI generation, paper generation, advanced analytics

- [ ] **Step 1: Find Pro feature entry points (frontend)**

Run these searches and list the files that need gating:

```
grep -rn "ai.tools\|generateQuestions\|generatePaper\|GenerateQuestions" campusly-frontend/src/components campusly-frontend/src/app
grep -rn "advancedAnalytics\|deepAnalytics" campusly-frontend/src
```

- [ ] **Step 2: For each entry point, wrap the trigger with `ProGate`**

Example pattern for an AI generation button:

```tsx
import { ProGate } from '@/components/subscription/ProGate';
import { useState } from 'react';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

const [upgradeOpen, setUpgradeOpen] = useState(false);

<ProGate
  feature="aiGeneration"
  fallback={
    <>
      <Button variant="outline" onClick={() => setUpgradeOpen(true)}><Sparkles className="w-4 h-4 mr-2" /> Generate (Pro)</Button>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="aiGeneration" />
    </>
  }
>
  <GenerateQuestionsButton />
</ProGate>
```

Do this for **every** entry point found in Step 1. List each file modified in the commit message.

- [ ] **Step 3: Apply `requireEntitlement` middleware on the matching backend routes**

Find the AI generation / paper generation backend routes:

```
grep -rn "ai-tools\|aiTools\|generateQuestions" campusly-backend/src/modules
```

For each Pro-only route, add the middleware:

```ts
import { requireEntitlement } from '../subscription/entitlements';

router.post('/generate', authenticate, requireEntitlement('aiGeneration'), AIToolsController.generate);
```

- [ ] **Step 4: Manual smoke test**

- Log in as a free user → confirm Pro entry points show "(Pro)" pill / open UpgradeModal
- Hit the backend route directly with a free user's token → expect 402 Payment Required
- Manually flip the user's Subscription to `pro_monthly` / `active` → confirm features unlock

- [ ] **Step 5: Commit**

```
git add campusly-frontend/src campusly-backend/src
git commit -m "feat(subscription): gate Pro features behind entitlement checks"
```

---

## Phase 8 — Billing Settings + Cancel/Resume + Update Card

---

### Task 8.1: `InvoicesTable` component

**Files:**
- Create: `campusly-frontend/src/components/subscription/InvoicesTable.tsx`

- [ ] **Step 1: Create component**

```tsx
// campusly-frontend/src/components/subscription/InvoicesTable.tsx
'use client';

import type { Invoice } from '@/types/subscription';
import { Badge } from '@/components/ui/badge';

interface Props { invoices: Invoice[]; }

function formatAmount(cents: number, currency: string): string {
  return `${currency === 'ZAR' ? 'R' : currency} ${(cents / 100).toFixed(2)}`;
}

function statusVariant(status: Invoice['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid': return 'default';
    case 'failed': return 'destructive';
    case 'refunded':
    case 'partially_refunded': return 'secondary';
    default: return 'outline';
  }
}

export function InvoicesTable({ invoices }: Props) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Period</th>
            <th className="py-2 pr-4">Amount</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
              <td className="py-2 pr-4 text-muted-foreground">
                {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}
              </td>
              <td className="py-2 pr-4">{formatAmount(inv.total, inv.currency)}</td>
              <td className="py-2"><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add campusly-frontend/src/components/subscription/
git commit -m "feat(subscription): InvoicesTable component"
```

---

### Task 8.2: `CancelDialog` component

**Files:**
- Create: `campusly-frontend/src/components/subscription/CancelDialog.tsx`

- [ ] **Step 1: Create component**

```tsx
// campusly-frontend/src/components/subscription/CancelDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelDialog({ open, onOpenChange }: Props) {
  const { subscription, refetch } = useSubscription();
  const [loading, setLoading] = useState(false);

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : 'the end of your current period';

  const cancel = async () => {
    setLoading(true);
    try {
      await apiClient.post('/subscriptions/cancel', {});
      toast.success(`Cancelled. Pro stays active until ${periodEnd}.`);
      await refetch();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Cancel Pro subscription?</DialogTitle>
          <DialogDescription>
            You'll keep Pro features until {periodEnd}, then move to the Free tier.
            You can resume anytime before that date.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Keep subscription</Button>
          <Button variant="destructive" onClick={cancel} disabled={loading}>{loading ? 'Cancelling…' : 'Cancel subscription'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```
git add campusly-frontend/src/components/subscription/
git commit -m "feat(subscription): CancelDialog with period-end messaging"
```

---

### Task 8.3: `/my/billing` page

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/my/billing/page.tsx`

- [ ] **Step 1: Confirm `/my/` route group exists**

Run: `ls campusly-frontend/src/app/\(dashboard\)/my/ 2>/dev/null`. If missing, the page below will need to live elsewhere — adjust path to match an existing settings group.

- [ ] **Step 2: Create the page**

```tsx
// campusly-frontend/src/app/(dashboard)/my/billing/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useInvoices } from '@/hooks/useInvoices';
import { useCheckout } from '@/hooks/useCheckout';
import { CancelDialog } from '@/components/subscription/CancelDialog';
import { InvoicesTable } from '@/components/subscription/InvoicesTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

export default function BillingPage() {
  const router = useRouter();
  const { subscription, plan, loading, refetch, isPro, isTrialing, isCanceled, isPastDue } = useSubscription();
  const { invoices, loading: invLoading } = useInvoices();
  const { launch, loading: launchLoading } = useCheckout();
  const [cancelOpen, setCancelOpen] = useState(false);

  if (loading || !subscription || !plan) return <LoadingSpinner />;

  const card = subscription.cardLastFour
    ? `${subscription.cardBrand?.toUpperCase() ?? 'CARD'} •••• ${subscription.cardLastFour} (exp ${String(subscription.cardExpiryMonth).padStart(2, '0')}/${String(subscription.cardExpiryYear).slice(-2)})`
    : 'No card on file';

  const resume = async () => {
    try {
      await apiClient.post('/subscriptions/resume', {});
      toast.success('Subscription resumed');
      await refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resume');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <PageHeader title="Billing" description="Manage your plan, card and invoices." />

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Current plan</div>
            <div className="text-xl font-semibold">{plan.name}</div>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={isPro ? 'default' : 'outline'}>{subscription.status}</Badge>
              {isTrialing && subscription.trialEndsAt && (
                <span className="text-sm text-muted-foreground">Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}</span>
              )}
              {isCanceled && subscription.currentPeriodEnd && (
                <span className="text-sm text-muted-foreground">Ends {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="text-sm text-muted-foreground">Payment method</div>
            <div className="text-sm">{card}</div>
            {subscription.cardLastFour && (
              <Button variant="outline" size="sm" onClick={() => router.push('/subscription')}>Update card</Button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {!isPro && (
            <Button onClick={() => router.push('/subscription')}>Choose a plan</Button>
          )}
          {(isTrialing || subscription.status === 'active' || isPastDue) && !isCanceled && (
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>Cancel subscription</Button>
          )}
          {isCanceled && (
            <Button onClick={resume} disabled={launchLoading}>Resume subscription</Button>
          )}
          {subscription.status === 'free' && !subscription.cardLastFour && (
            <Button onClick={() => launch('pro_monthly')} disabled={launchLoading}>Start Pro trial</Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <div className="mt-4">
          {invLoading ? <LoadingSpinner /> : <InvoicesTable invoices={invoices} />}
        </div>
      </Card>

      <CancelDialog open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Navigate to `/my/billing` as: free, trialing, active, past_due, canceled users (manually flip status in Mongo as needed). Confirm each state shows the right card + buttons.

- [ ] **Step 4: Commit**

```
git add campusly-frontend/src/app/\(dashboard\)/my/billing/
git commit -m "feat(subscription): /my/billing page with plan, card, invoices, cancel/resume"
```

---

### Task 8.4: Add "Billing" link to teacher sidebar nav

**Files:**
- Modify: `campusly-frontend/src/components/layout/Sidebar.tsx` (or wherever nav items are defined)

- [ ] **Step 1: Locate the sidebar nav config**

Run: `grep -rn "billing\|/my/" campusly-frontend/src/components/layout campusly-frontend/src/app/\(dashboard\)/layout.tsx | head -10`.

- [ ] **Step 2: Add nav item**

Add a "Billing" item to the teacher's sidebar list (or wherever the user-account section sits), routing to `/my/billing`. Match the icon style of neighbouring items (e.g. `CreditCard` from lucide-react).

- [ ] **Step 3: Commit**

```
git add campusly-frontend/src/components/layout/
git commit -m "feat(subscription): Billing nav item for teacher sidebar"
```

---

## Phase 9 — End-to-End UAT Validation

This phase is manual. Each step is performed against the live UAT environment using the OneGate test card. Record screenshots and Mongo state snapshots in a `UAT_RESULTS.md` doc as you go.

---

### Task 9.1: Pre-flight checklist

- [ ] **Step 1: Confirm env is loaded**

In `campusly-backend/.env`:
- `ONEGATE_ORG_ID=21234`
- `ONEGATE_SALT=pytJyMIucGoyxM-4jiYu`
- `ONEGATE_BASE_URL=https://payments.onegate.co.za`
- `SUBSCRIPTION_CRON_ENABLED=true`
- `MONGODB_URI` points to a dev DB (not production)

In `campusly-frontend/.env.local`:
- `NEXT_PUBLIC_API_URL=http://localhost:4500/api`
- `NEXT_PUBLIC_ONEGATE_CHECKOUT_JS=https://payments.onegate.co.za/ext/checkout/v4/checkout.js`

- [ ] **Step 2: Seed plans**

Run: `npx tsx src/modules/subscription/seed.ts` (from `campusly-backend/`)
Expected: 3 plans created/updated.

- [ ] **Step 3: Migrate grandfathered teachers**

Run: `npx tsx src/modules/subscription/migrate-grandfather.ts` (from `campusly-backend/`)
Expected: console logs `{ grandfathered: N, freeBackfilled: M }`.

- [ ] **Step 4: Boot servers**

In separate terminals: `npm run dev` in `campusly-backend/` and `campusly-frontend/`.
Confirm backend boots without errors and worker registration log appears (`startSubscriptionBillingWorker` enabled).

---

### Task 9.2: Happy path — sign up, start trial, convert to active

- [ ] **Step 1: Create a fresh teacher account**

Navigate to frontend `/register-teacher`. Sign up with a fresh email. Confirm landed on teacher dashboard.

Confirm in Mongo:
```
db.subscriptions.findOne({schoolId: <newSchoolId>})
// status: 'free', planCode: 'free', cardTokenGuid: null
```

- [ ] **Step 2: Open pricing page**

Navigate `/subscription`. Confirm 3 plan cards render. Click "Start 14-day trial" on Pro Monthly.

- [ ] **Step 3: Complete checkout**

OneGate modal opens. Enter card `4229989999000012` / CVV `871` / expiry `12/31` / 3DS code `test123`.

- [ ] **Step 4: Verify trial activation**

Browser returns to `/subscription/success?session=<id>`. After polling completes:
- Page shows "You're on Pro" with checkmark
- TrialBanner appears across dashboard: "14 days left in your Pro trial"
- Mongo: `status: 'trialing'`, `cardTokenGuid` set, `trialEndsAt` ≈ now + 14d, `nextBillingAt` = trialEndsAt
- OneGate dashboard: R1 charge visible AND a refund visible for that charge

- [ ] **Step 5: Force trial-end charge**

In Mongo: `db.subscriptions.updateOne({_id: <subId>}, {$set: {nextBillingAt: new Date(Date.now() - 60000), trialEndsAt: new Date(Date.now() - 60000)}})`

Wait up to 5 minutes (next cron tick) OR run manually: `npx tsx -e "import('./src/modules/subscription/cron').then(m => m.processBillingTick())"`.

Expected:
- `status: 'active'`
- `currentPeriodStart` set, `currentPeriodEnd` = +1 month
- `nextBillingAt` = `currentPeriodEnd`
- New Invoice row with `status: 'paid'`, `total: 14900`
- OneGate dashboard: R149 charge succeeded

- [ ] **Step 6: Document in UAT_RESULTS.md**

Record screenshot of subscription doc, invoice doc, and OneGate dashboard.

---

### Task 9.3: Cancel + resume + drop to free

- [ ] **Step 1: Cancel**

Navigate `/my/billing`. Click "Cancel subscription". Confirm in dialog.

Expected:
- Toast: "Cancelled. Pro stays active until <date>"
- Mongo: `status: 'canceled'`, `cancelAtPeriodEnd: true`, `canceledAt` set, `nextBillingAt = currentPeriodEnd`

- [ ] **Step 2: Resume**

Click "Resume subscription". Confirm:
- `status: 'active'`, `cancelAtPeriodEnd: false`, `canceledAt: null`

- [ ] **Step 3: Cancel again, force period end**

Cancel again. Then in Mongo: `db.subscriptions.updateOne({_id}, {$set: {currentPeriodEnd: new Date(Date.now() - 60000), nextBillingAt: new Date(Date.now() - 60000)}})`.

Wait for cron tick (or run manually).

Expected: `status: 'free'`, all billing fields null, `endedAt` set. Pro features re-locked.

---

### Task 9.4: Dunning — recurring charge failure

- [ ] **Step 1: Start a fresh active subscription** (repeat 9.2 with new account, advance through trial)

- [ ] **Step 2: Break the card token to simulate decline**

In Mongo: `db.subscriptions.updateOne({_id}, {$set: {cardTokenGuid: 'invalid-token-xyz', nextBillingAt: new Date(Date.now() - 60000)}})`

Run cron tick.

Expected: `status: 'past_due'`, `retryCount: 1`, `nextRetryAt` ≈ now + 2d, `lastFailureReason` set. DunningBanner shows on dashboard.

- [ ] **Step 3: Force retry 2**

Set `nextBillingAt: new Date(Date.now() - 60000)`, run tick.
Expected: `retryCount: 2`, `nextRetryAt` ≈ now + 4d.

- [ ] **Step 4: Force retry 3**

Same as above.
Expected: `retryCount: 3`, `nextRetryAt` ≈ now + 7d.

- [ ] **Step 5: Force final failure → free**

Same as above.
Expected: `status: 'free'`, `cardTokenGuid: null`. Pro features re-locked.

---

### Task 9.5: Card expiry pre-emption

- [ ] **Step 1: Set up active subscription with expired card**

In Mongo: `db.subscriptions.updateOne({_id}, {$set: {status: 'active', cardExpiryYear: 2024, cardExpiryMonth: 1, nextBillingAt: new Date(Date.now() - 60000)}})`.

Run cron tick.

Expected:
- No charge attempt (no new Invoice row)
- `status: 'past_due'`, `lastFailureReason: 'card_expired'`
- DunningBanner shows: "Your card on file has expired."

---

### Task 9.6: Webhook idempotency

- [ ] **Step 1: Find a recent successful transaction in the OneGate dashboard**

- [ ] **Step 2: Click "Resend webhook" in the OneGate dashboard**

Expected:
- Backend logs show webhook received
- `WebhookEvent.count({gatewayTransactionId: <id>})` is still 1
- No duplicate Invoice or Subscription state change

- [ ] **Step 3: Manually replay (curl)**

```
curl -X POST http://localhost:4500/api/webhooks/onegate \
  -H 'Content-Type: application/json' \
  -d '{"callpay_transaction_id": <known_id>, "merchant_reference": "inv_real_ref", "amount": "149.00", "success": 1}'
```

Expected: HTTP 200, `idempotent: true` in response.

- [ ] **Step 4: Rate-limit test**

Run `for i in {1..100}; do curl -s -X POST http://localhost:4500/api/webhooks/onegate -H 'Content-Type: application/json' -d '{}' & done; wait`.

Expected: Some responses return 429 Too Many Requests after the 60th in a minute.

---

### Task 9.7: Entitlement enforcement

- [ ] **Step 1: As a free user, attempt AI generation**

Find any AI generation entry point. Click it.

Expected: UpgradeModal appears. The underlying API route returns 402 if called directly.

- [ ] **Step 2: As a trialing user**

Same entry point.

Expected: Feature works normally. No upgrade prompt.

- [ ] **Step 3: As a past_due user**

Manually flip status to past_due in Mongo (with valid plan).

Expected: Feature still works (dunning window grace).

- [ ] **Step 4: As a canceled-but-still-in-period user**

Manually flip to canceled with `currentPeriodEnd` in the future.

Expected: Feature works.

- [ ] **Step 5: As a canceled-and-expired user**

Manually flip to `status: 'free'` (post-period).

Expected: Feature blocked, UpgradeModal appears.

---

### Task 9.8: Final commit + release notes

- [ ] **Step 1: Write `UAT_RESULTS.md`**

Create `campusly-backend/UAT_RESULTS.md` documenting:
- Date and version SHA tested
- Each task 9.1–9.7 with PASS/FAIL
- Any failures with root cause + follow-up
- Screenshots from the OneGate dashboard

- [ ] **Step 2: Commit + tag**

```
git add campusly-backend/UAT_RESULTS.md
git commit -m "chore: UAT validation results for teacher subscriptions"
git tag teacher-subscriptions-uat-pass
```

---

## Plan Self-Review

### Spec coverage check

| Spec section | Plan coverage |
|---|---|
| §2 Gateway overview, auth | Task 1.6 (auth.ts) + Task 0.1 (spike validates) |
| §3.1 Plan model | Task 1.1 + Task 1.5 (seed) |
| §3.2 Subscription model | Task 1.2 |
| §3.3 Invoice model with taxRate snapshot | Task 1.3 (`taxRate` field included) |
| §3.4 WebhookEvent | Task 1.4 |
| §3.5 CheckoutSession | Task 1.4 |
| §4 State machine — all 11 transitions | Tasks 2.1, 2.3, 2.4, 2.5 |
| §4 Cron + processingLockedAt | Task 3.7 |
| §5.1 OneGate client wrapper | Tasks 1.6, 1.7, 1.8, 1.9 |
| §5.2 Card capture flow (R1 + refund) | Task 0.1, Task 3.3, Task 3.5 (webhook processes tokenisation + queues refund) |
| §5.3 Recurring charge | Task 2.5 |
| §5.4 Webhook handler (4 routing cases) | Task 3.5 |
| §5.5 Idempotency surfaces | Built into Tasks 3.3 (CheckoutSession dedup), 3.5 (WebhookEvent), 2.5 (Invoice ref unique), 3.7 (processingLockedAt) |
| §6 API surface (8 endpoints) | Tasks 3.2 (2), 3.3 (1), 3.4 (4), 3.5 (1) — all 8 |
| §7 Frontend files | Phases 5, 6, 7, 8 cover all listed components/pages |
| §8 Env config | Task 1.9 (.env.example), Task 5.5 (.env.local) |
| §9 Seed data | Task 1.5 |
| §9 Grandfather migration | Task 4.3 (90-day Pro cutoff 2026-08-13) |
| §10 Testing plan | Each task has unit/integration tests; Phase 9 covers manual UAT |
| §11 Risks — internal alerting on consecutive failures | **GAP** — see addendum below |
| §11 Risks — webhook rate limiting | Task 3.6 |
| §11 PCI guardrail | Documented in this plan header; enforced by NOT building card forms |
| §13 Implementation order | Phases 0–9 match the spec ordering |

### Identified gaps + fixes applied

**Gap 1: Internal alerting on consecutive failures (spec §11 P1 risk).** The plan doesn't have a task that emits `AdminAlert` when N consecutive charges fail. Adding addendum task below.

### Addendum Task — AdminAlert on consecutive failures

**Files:**
- Create: `campusly-backend/src/modules/subscription/alerting.ts`
- Modify: `campusly-backend/src/modules/subscription/service.ts` (call alerting from `handleChargeFailure`)
- Create: `campusly-backend/src/modules/subscription/__tests__/alerting.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// campusly-backend/src/modules/subscription/__tests__/alerting.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Invoice } from '../model';
import { checkConsecutiveFailures, AdminAlert } from '../alerting';

describe('checkConsecutiveFailures', () => {
  beforeAll(async () => { await mongoose.connect(process.env.MONGODB_TEST_URI!); });
  beforeEach(async () => { await Invoice.deleteMany({}); await AdminAlert.deleteMany({}); });
  afterAll(async () => { await mongoose.disconnect(); });

  it('does not alert when fewer than 10 consecutive failures', async () => {
    for (let i = 0; i < 5; i++) {
      await Invoice.create({
        subscriptionId: new mongoose.Types.ObjectId(), schoolId: new mongoose.Types.ObjectId(),
        planCode: 'pro_monthly', subtotal: 14900, tax: 0, taxRate: 0, total: 14900, currency: 'ZAR',
        status: 'failed', merchantReference: `inv_${i}`, periodStart: new Date(), periodEnd: new Date(),
        failedAt: new Date(), purpose: 'subscription',
      });
    }
    await checkConsecutiveFailures();
    expect(await AdminAlert.countDocuments()).toBe(0);
  });

  it('creates an AdminAlert at 10 consecutive failures', async () => {
    for (let i = 0; i < 10; i++) {
      await Invoice.create({
        subscriptionId: new mongoose.Types.ObjectId(), schoolId: new mongoose.Types.ObjectId(),
        planCode: 'pro_monthly', subtotal: 14900, tax: 0, taxRate: 0, total: 14900, currency: 'ZAR',
        status: 'failed', merchantReference: `inv_${i}`, periodStart: new Date(), periodEnd: new Date(),
        failedAt: new Date(Date.now() - i * 1000), purpose: 'subscription',
      });
    }
    await checkConsecutiveFailures();
    const alert = await AdminAlert.findOne({ kind: 'gateway_consecutive_failures' });
    expect(alert).toBeTruthy();
  });

  it('is idempotent — running twice does not create a second alert', async () => {
    for (let i = 0; i < 10; i++) {
      await Invoice.create({
        subscriptionId: new mongoose.Types.ObjectId(), schoolId: new mongoose.Types.ObjectId(),
        planCode: 'pro_monthly', subtotal: 14900, tax: 0, taxRate: 0, total: 14900, currency: 'ZAR',
        status: 'failed', merchantReference: `inv2_${i}`, periodStart: new Date(), periodEnd: new Date(),
        failedAt: new Date(Date.now() - i * 1000), purpose: 'subscription',
      });
    }
    await checkConsecutiveFailures();
    await checkConsecutiveFailures();
    expect(await AdminAlert.countDocuments({ status: 'open' })).toBe(1);
  });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm test -- src/modules/subscription/__tests__/alerting.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement alerting**

```ts
// campusly-backend/src/modules/subscription/alerting.ts
import { Schema, model, type Document } from 'mongoose';
import { Invoice } from './model';

export type AdminAlertKind = 'gateway_consecutive_failures';
export type AdminAlertStatus = 'open' | 'resolved';

export interface IAdminAlert extends Document {
  kind: AdminAlertKind;
  message: string;
  context: Record<string, unknown>;
  status: AdminAlertStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}

const AdminAlertSchema = new Schema<IAdminAlert>({
  kind: { type: String, required: true, index: true },
  message: { type: String, required: true },
  context: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

export const AdminAlert = model<IAdminAlert>('AdminAlert', AdminAlertSchema);

const CONSECUTIVE_FAILURE_THRESHOLD = 10;

export async function checkConsecutiveFailures(): Promise<void> {
  const recent = await Invoice.find({ purpose: 'subscription' })
    .sort({ failedAt: -1, createdAt: -1 })
    .limit(CONSECUTIVE_FAILURE_THRESHOLD);

  if (recent.length < CONSECUTIVE_FAILURE_THRESHOLD) return;
  if (recent.some((inv) => inv.status !== 'failed')) return;

  const existing = await AdminAlert.findOne({ kind: 'gateway_consecutive_failures', status: 'open' });
  if (existing) return;

  await AdminAlert.create({
    kind: 'gateway_consecutive_failures',
    message: `${CONSECUTIVE_FAILURE_THRESHOLD} consecutive subscription charges failed — gateway may be down`,
    context: { sampleInvoiceIds: recent.map((i) => i.id) },
    status: 'open',
  });
  console.error('[ALERT] gateway_consecutive_failures — 10 failures in a row');
}
```

- [ ] **Step 4: Call from `handleChargeFailure`**

Modify `service.ts` `handleChargeFailure` — at the end, call:

```ts
import { checkConsecutiveFailures } from './alerting';

// At the end of handleChargeFailure, after sub.save() + syncSchoolCache:
await checkConsecutiveFailures();
```

- [ ] **Step 5: Run tests — confirm pass**

Run: `npm test -- src/modules/subscription/__tests__/alerting.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```
git add campusly-backend/src/modules/subscription/
git commit -m "feat(subscription): AdminAlert on 10 consecutive charge failures"
```

---

### Placeholder scan

Scanned plan for "TBD", "TODO", "implement later", "add validation", "similar to Task N". None found except in narrative sections describing the plan structure itself. Code blocks contain real implementations.

### Type consistency check

Cross-checked: `SubscriptionStatus` enum, `Plan.code` values, hook return shapes, controller signatures. Consistent across tasks. `useSubscription` returns `isPro` which composes `isTrialing/isActive/canceled-in-period/past_due` — referenced uniformly in components.

### Scope check

This is one cohesive subsystem (subscriptions). Does not need decomposition into multiple specs.

---

## Execution

**Plan complete and committed to `docs/superpowers/plans/2026-05-13-teacher-subscriptions-onegate-integration.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**



