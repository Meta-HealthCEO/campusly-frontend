# Teacher Subscriptions — OneGate Integration Design Spec

**Date:** 2026-05-13
**Scope:** Phase 1 — teacher subscriptions only. Student and school subscriptions land in later phases using the same model.

---

## 1. Goals & Non-Goals

### Goals
- Let a new standalone teacher start a 14-day Pro trial with a card on file, captured via OneGate's hosted Checkout Widget (v4).
- Auto-convert the trial to a paid subscription at trial end (monthly R149 or annual R1,490).
- Drive recurring billing ourselves via OneGate's tokenised charge API, with dunning, cancellation, and pre-emptive expired-card detection.
- Gate Pro-only features via entitlements resolved from the active plan — never via "is this user on Pro?" checks.
- Build the data model so student and school subscriptions drop in later with no schema migration.

### Non-Goals
- Student or school plans (model is ready; signup hookups deferred)
- Email notifications (domain events emitted; email module subscribes later)
- Plan changes mid-cycle with prorations (v1: cancel + resubscribe)
- Coupons, promo codes, referral credits
- Apple Pay / Google Pay / Absa Pay rails (enabled at gateway, not exposed in UI v1)
- VAT exposure in UI (schema supports it; rate defaults to 0)
- Multi-currency (ZAR only)
- Receipt PDF rendering (data captured; rendering deferred)
- Direct/server-to-server PAN tokenisation (out of PCI scope for v1)

---

## 2. Gateway Overview

> **✅ Spike completed 2026-05-13.** Decision: proceed with R1+refund pattern but **switch from widget to hosted-redirect flow** (Approach A from spec earlier draft). The Checkout Widget v4 cannot complete 3DS because the 3DS method form posts to a nested iframe that the browser sandboxes. Full-page redirect to OneGate's hosted card page handles 3DS at top-window level and works end-to-end. See [SPIKE_FINDINGS.md](../../../../campusly-backend/scripts/SPIKE_FINDINGS.md).
>
> **Additional findings baked into this spec:**
> - All OneGate POST/PUT requests use `application/x-www-form-urlencoded`, not JSON
> - The reusable card token is `transaction.token` (top-level field on the looked-up gateway-transaction), **not** `gateway_response_parameters.gatewayCardToken`
> - `success_url` / `error_url` / `notify_url` must be HTTPS — `http://localhost` is rejected
> - **Production readiness flag:** UAT demo card forces 3DS on recurring charges too. Production cards should use MIT (Merchant Initiated Transaction) exemption to bill silently. Confirm with OneGate support before launch and design dunning to handle a 3DS-required fallback (mark sub as "needs reverification", email user, retry after auth).

OneGate is a Callpay-powered SA payment gateway. API V2.

- **Base URL (UAT):** `https://payments.onegate.co.za`
- **Auth:** every request carries headers `Auth-Token`, `Org-Id`, `Timestamp`. `Auth-Token = sha256(\`${salt}_${orgId}_${unixTs}\`)`. Token valid 15 min from `Timestamp`.
- **Endpoints we use:**
  - `POST /api/v2/payment-key` — mint a card-capture session for the widget
  - `POST /api/v2/customer-token/{guid}/pay` — charge a saved card token
  - `GET /api/v2/gateway-transaction/{id}` — lookup (webhook verification)
  - `PUT /api/v2/gateway-transaction/{id}/refund` — refund (used for R1 verification refund and future support workflows)
- **Webhooks:** unsigned POST to our `notify_url`. We verify by re-fetching the transaction via the lookup endpoint. IP allowlist (`54.72.191.28`, `54.194.139.201`) is defense-in-depth, not load-bearing.
- **UAT credentials (committed to `.env.example` placeholders; live values in `.env`):**
  - `ONEGATE_ORG_ID=21234`
  - `ONEGATE_SALT=pytJyMIucGoyxM-4jiYu`
  - `ONEGATE_BASE_URL=https://payments.onegate.co.za`
- **UAT test card:** PAN `4229989999000012`, CVV `871`, expiry `12/31`, 3DS code `test123`

---

## 3. Data Model

Four new collections in `campusly-backend/src/modules/subscription/`.

### 3.1 `Plan` — seed data, three rows at launch

| Field | Type | Notes |
|---|---|---|
| `code` | string (unique) | `free`, `pro_monthly`, `pro_annual` |
| `name` | string | Display name |
| `description` | string | Display blurb |
| `subscriberType` | enum | `teacher` \| `student` \| `school` |
| `amountExclTax` | number | Cents, ZAR. `0` for free. |
| `taxRate` | number | Default `0`. Set to `0.15` when Campusly registers for VAT. |
| `currency` | string | `ZAR` |
| `interval` | enum \| null | `month` \| `year` \| `null` (free) |
| `trialDays` | number | `14` for paid plans, `0` for free |
| `entitlements` | object | Feature flags — e.g. `{ aiGeneration: true, maxClasses: null, paperGeneration: true, advancedAnalytics: true }` |
| `isActive` | boolean | Soft toggle for retiring plans |
| `displayOrder` | number | UI ordering |

### 3.2 `Subscription` — one per `School` (unique index on `schoolId`)

| Field | Type | Notes |
|---|---|---|
| `schoolId` | ObjectId | Unique index; FK to School |
| `subscriberType` | enum | `teacher` (v1), `student`, `school` |
| `planCode` | string | FK to Plan.code |
| `status` | enum | `free` \| `trialing` \| `active` \| `past_due` \| `canceled` \| `unpaid` |
| `trialEndsAt` | Date \| null | Set when trial starts |
| `currentPeriodStart` | Date \| null | Set on first successful charge |
| `currentPeriodEnd` | Date \| null | Anchor for next billing |
| `nextBillingAt` | Date \| null | Single source of truth for the cron |
| `cancelAtPeriodEnd` | boolean | False by default |
| `canceledAt` | Date \| null | When user clicked cancel |
| `endedAt` | Date \| null | When subscription terminally ended |
| `cardTokenGuid` | string \| null | OneGate token guid |
| `cardLastFour` | string \| null | From tokenisation response |
| `cardBrand` | string \| null | E.g. `visa` |
| `cardExpiryMonth` | number \| null | 1–12 |
| `cardExpiryYear` | number \| null | YYYY |
| `retryCount` | number | Dunning retry attempts (0–3) |
| `nextRetryAt` | Date \| null | When to retry a failed charge |
| `lastFailureReason` | string \| null | Last decline reason (for UI) |
| `processingLockedAt` | Date \| null | Cron concurrency lock |
| `gatewayProvider` | string | `onegate` |
| `gatewayCustomerRef` | string \| null | Future use |
| `schoolId`, `createdAt`, `updatedAt`, `isDeleted` | standard | |

`School.subscription` embedded field stays as a denormalised cache (read-only mirror of `Subscription.{planCode, status, currentPeriodEnd}`) so existing code reading `school.subscription.tier` keeps working. The cache is **eventually consistent** — the subscription service writes the cache immediately after writing the Subscription row, but the two writes aren't transactional. Read code should treat the cache as a fast path and re-read Subscription if it needs strong consistency (which entitlement middleware does on every request — it reads Subscription directly).

### 3.3 `Invoice` — one row per charge attempt (including trial-end first charge)

| Field | Type | Notes |
|---|---|---|
| `subscriptionId` | ObjectId | Index |
| `schoolId` | ObjectId | Index (multi-tenancy scope) |
| `planCode` | string | Plan at time of invoice |
| `subtotal` | number | Cents excl. tax |
| `tax` | number | Cents |
| `taxRate` | number | Rate at time of issuance (snapshot — `Plan.taxRate` may change later) |
| `total` | number | Cents |
| `currency` | string | `ZAR` |
| `status` | enum | `pending` \| `paid` \| `failed` \| `refunded` \| `partially_refunded` |
| `merchantReference` | string (unique) | `inv_<8-char-nanoid>` |
| `gatewayTransactionId` | number \| null | `callpay_transaction_id` |
| `gatewayReference` | string \| null | PSP reference |
| `gatewayResponse` | mixed | Raw response/webhook JSON for audit |
| `periodStart`, `periodEnd` | Date | Period this invoice covers |
| `attemptedAt`, `paidAt`, `failedAt` | Date \| null | Timestamps |
| `failureReason` | string \| null | If failed |
| `refundedAmount` | number | Cents, default 0 |
| `purpose` | enum | `verification` (R1 tokenisation), `subscription` (regular billing) |

### 3.4 `WebhookEvent` — idempotency + audit

| Field | Type | Notes |
|---|---|---|
| `gatewayTransactionId` | number (unique) | Prevents duplicate processing |
| `payloadHash` | string | sha256 of raw body |
| `rawPayload` | mixed | Full webhook body |
| `receivedAt`, `processedAt` | Date | |
| `status` | enum | `pending` \| `processed` \| `failed` \| `ignored` |
| `error` | string \| null | If status=failed |
| `verifiedViaLookup` | boolean | True if we re-fetched the txn |

### 3.5 `CheckoutSession` — short-lived row created when frontend requests a payment-key

| Field | Type | Notes |
|---|---|---|
| `userId`, `schoolId` | ObjectId | Who initiated |
| `planCode` | string | Plan they were checking out |
| `merchantReference` | string (unique) | Same value sent to OneGate |
| `paymentKey` | string | Returned by `/payment-key` |
| `purpose` | enum | `tokenisation` (initial), `update_card` (replace card) |
| `status` | enum | `pending` \| `completed` \| `failed` \| `expired` |
| `expiresAt` | Date | Now + 30 min |

---

## 4. State Machine

```
                       signup (no card)
                              │
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │                        free                          │
   │             (no Pro features, full Free tier)        │
   └──────────────────────────────────────────────────────┘
        ▲                                          │
        │ all retries failed                       │ user clicks "Start Pro Trial",
        │ OR canceled & period ended               │ checkout completes successfully
        │                                          ▼
   ┌─────────────────────┐                ┌──────────────────────┐
   │       unpaid        │                │       trialing       │
   │  (terminal failure  │                │ (card on file, 14d,  │
   │  before drop to     │                │  no charge yet)      │
   │  free; for audit)   │                └──────────────────────┘
   └─────────────────────┘                          │
        ▲                                           │ nextBillingAt reached
        │                                           ▼
        │                                  ┌──────────────────────┐
        │                                  │  charge attempt at   │
        │                                  │     trial end        │
        │                                  └──────────────────────┘
        │                                     success    │ failure
        │                                       │        ▼
        │                                       │     drop to free
        │                                       │     (don't dun a trialer)
        │                                       ▼
        │                              ┌──────────────────────┐
        │                              │       active         │
        │                              │  (paid, recurring)   │
        │                              └──────────────────────┘
        │                                  │  ▲    │
        │                                  │  │    │ user cancels
        │           recurring charge fails │  │    ▼
        │                                  ▼  │ ┌──────────────────────┐
        │                              ┌──────┴─┤      canceled        │
        │                              │past_due│ (Pro until period    │
        │ retry count > 3              │        │  end, then → free)   │
        └─────────────────────────────▶│        │                      │
                                       └────────┴──────────────────────┘
                                          │
                              retry success → active
```

### Transition Rules

1. **`signup` → `free`** — new teacher's School gets a Subscription with `status=free`, `planCode=free`.
2. **`free` → `trialing`** — teacher completes checkout widget. We set `cardTokenGuid`, `planCode=pro_monthly|pro_annual`, `status=trialing`, `trialEndsAt=now+14d`, `nextBillingAt=trialEndsAt`. R1 verification charge refunded.
3. **`trialing` → `active`** — cron fires at `nextBillingAt`. Charge succeeds. Set `currentPeriodStart=now`, `currentPeriodEnd=now + 1mo|1yr`, `nextBillingAt=currentPeriodEnd`, `trialEndsAt=null`.
4. **`trialing` → `free`** — charge fails at trial end. Drop straight to free. Single attempt only — no retries during trial-end conversion.
5. **`active` → `past_due`** — recurring charge fails. `retryCount=1`, `nextRetryAt=now+2d`. Pro access stays enabled.
6. **`past_due` → `active`** — retry succeeds. Reset retry state, roll `currentPeriodEnd` forward.
7. **`past_due` → `unpaid` → `free`** — after 3 failed retries (intervals: +2d, +4d, +7d from previous attempt). `unpaid` is set briefly for audit; same cron run moves to `free`.
8. **`active` → `canceled`** — user clicks cancel. `cancelAtPeriodEnd=true`, `canceledAt=now`, `status=canceled`, `nextBillingAt=currentPeriodEnd` (so the cron picks them up for terminal cleanup). Pro access continues until `currentPeriodEnd`.
9. **`canceled` → `free`** — cron sees `currentPeriodEnd <= now`. Set `status=free`, `endedAt=now`, null out billing fields including `nextBillingAt`.
10. **`canceled` → `active`** — user un-cancels before `currentPeriodEnd`. `cancelAtPeriodEnd=false`, `canceledAt=null`, `status=active`, `nextBillingAt=currentPeriodEnd` (now means "next charge", not "cleanup").
11. **Card expired pre-emption** — cron, before attempting a charge, checks if `cardExpiryYear/Month` is before current month. If so, skip charge, set `status=past_due`, `lastFailureReason='card_expired'`, surface "update card" banner.

### Cron

Single cron job, every 5 minutes:

```ts
const dueSubs = await Subscription.find({
  nextBillingAt: { $lte: now },
  status: { $in: ['trialing', 'active', 'past_due', 'canceled'] },
  processingLockedAt: null,
}).limit(50);

for (const sub of dueSubs) {
  // Claim with optimistic lock
  const claimed = await Subscription.findOneAndUpdate(
    { _id: sub._id, processingLockedAt: null },
    { processingLockedAt: now },
  );
  if (!claimed) continue;
  try {
    await subscriptionService.processDueSubscription(sub._id);
  } finally {
    await Subscription.updateOne({ _id: sub._id }, { processingLockedAt: null });
  }
}
```

Stale lock recovery: a second sweep releases `processingLockedAt` older than 10 minutes.

---

## 5. OneGate Integration

### 5.1 Client wrapper

`campusly-backend/src/lib/onegate/`:

- `client.ts` — axios instance with base URL + per-request auth headers
- `auth.ts` — `signRequest(): { authToken, timestamp }` using sha256 of `${salt}_${orgId}_${unixTs}`
- `types.ts` — request/response shapes for the four endpoints
- `errors.ts` — `OneGateError` class wrapping non-2xx responses with `statusCode`, `gatewayCode`, `message`
- `index.ts` — typed methods: `createPaymentKey(input)`, `chargeToken(guid, input)`, `getTransaction(id)`, `refundTransaction(id, amount?)`

### 5.2 Card capture flow (initial tokenisation)

1. **Frontend:** `POST /api/subscriptions/checkout { planCode }`
2. **Backend:**
   - Validate planCode is a paid plan
   - Reject if existing Subscription has `cardTokenGuid` already (use `/api/subscriptions/update-card` instead)
   - Generate `merchantReference = 'sub_' + nanoid(8)`
   - Create `CheckoutSession` (status=pending, expiresAt=now+30min)
   - Call OneGate `POST /api/v2/payment-key`:
     ```json
     {
       "payment_type": "credit_card",
       "amount": "1.00",
       "merchant_reference": "sub_abc12345",
       "success_url": "{FRONTEND}/subscription/success?session={id}",
       "error_url":   "{FRONTEND}/subscription/error?session={id}",
       "pending_url": "{FRONTEND}/subscription/pending?session={id}",
       "notify_url":  "{BACKEND}/api/webhooks/onegate"
     }
     ```
   - Store returned `key` on CheckoutSession
   - Return `{ paymentKey, sessionId }` to frontend
3. **Frontend:** Receive `{ paymentKey, sessionId, redirectUrl }` from backend. Set `window.location.href = redirectUrl` (the `url` field from OneGate's payment-key response, e.g. `https://payments.onegate.co.za/pay/hosted?payment_key=...&payment_type=credit_card`). User leaves Campusly, enters card on OneGate's hosted page, completes 3DS.
4. **Webhook arrives** at `/api/webhooks/onegate`:
   - Persist `WebhookEvent` row (upsert on `gatewayTransactionId`)
   - If duplicate → 200 OK noop
   - Re-fetch via `GET /api/v2/gateway-transaction/{id}` — trust only this
   - Match `merchant_reference` to `CheckoutSession`
   - Extract token guid, last four, brand, expiry from response
   - If success: update Subscription (`status=trialing`, store card fields, `trialEndsAt=now+14d`), queue refund of the R1 charge, mark CheckoutSession `completed`
   - If failure: CheckoutSession `failed`; frontend redirected to `error_url` already shows the error
5. **R1 refund:** immediately after tokenisation, call `PUT /api/v2/gateway-transaction/{txnId}/refund` for the verification charge. Track via Invoice with `purpose=verification`.

### 5.3 Recurring charge

```ts
async function processDueSubscription(subId: ObjectId) {
  const sub = await Subscription.findById(subId);

  // Terminal cleanup: canceled & period over
  if (sub.status === 'canceled' && sub.currentPeriodEnd <= now) {
    return endSubscription(sub);
  }

  // Card expiry preflight
  if (cardIsExpired(sub)) {
    return markPastDue(sub, 'card_expired');
  }

  const plan = await Plan.findOne({ code: sub.planCode });
  const merchantReference = 'inv_' + nanoid(8);
  const invoice = await Invoice.create({
    subscriptionId: sub._id,
    schoolId: sub.schoolId,
    planCode: sub.planCode,
    subtotal: plan.amountExclTax,
    tax: Math.round(plan.amountExclTax * plan.taxRate),
    total: plan.amountExclTax + Math.round(plan.amountExclTax * plan.taxRate),
    currency: plan.currency,
    status: 'pending',
    merchantReference,
    periodStart: sub.currentPeriodEnd ?? now,
    periodEnd: addInterval(sub.currentPeriodEnd ?? now, plan.interval),
    attemptedAt: now,
    purpose: 'subscription',
  });

  try {
    const result = await oneGate.chargeToken(sub.cardTokenGuid, {
      amount: invoice.total / 100,
      reference: merchantReference,
    });
    if (result.success === 1) {
      await markPaid(sub, invoice, result);   // trialing|active|past_due → active
    } else {
      // Branches on sub.status per state machine rules 4/5/7:
      //   trialing → free (no retry)
      //   active   → past_due, schedule retry
      //   past_due → bump retryCount; > 3 → unpaid → free
      await handleChargeFailure(sub, invoice, result);
    }
  } catch (err: unknown) {
    await handleChargeFailure(sub, invoice, { reason: extractMessage(err) });
  }
}
```

### 5.4 Webhook handler

`POST /api/webhooks/onegate`:

1. Parse body, compute `payloadHash`
2. Upsert `WebhookEvent` on `gatewayTransactionId` (unique). If already `processed` → 200 OK noop.
3. Optional: reject if source IP not in allowlist (configurable via env, off by default in UAT)
4. Re-fetch the transaction via `GET /api/v2/gateway-transaction/{id}`. Use the response as truth.
5. Route on `merchant_reference` prefix **and** payload shape:
   - `sub_*` + `amount` field → tokenisation event (card captured)
   - `sub_*` + `refunded_amount` field → R1 refund event (mark verification Invoice refunded)
   - `inv_*` + `amount` field → subscription charge event (mark Invoice paid/failed)
   - `inv_*` + `refunded_amount` field → support-issued refund (mark Invoice refunded; future)
6. Apply the corresponding state transition. Persist `WebhookEvent.processedAt`.
7. Return 200. Any failure leaves `WebhookEvent.status='failed'`; cron will reconcile via lookup on next billing cycle.

**Rate limiting:** `/api/webhooks/onegate` is public by design (no auth header). Apply a per-IP rate limit (e.g. 60 req/min via existing express-rate-limit middleware) to prevent a hostile actor from forcing us to make unlimited lookup calls. When `ONEGATE_IP_ALLOWLIST` is set, only listed IPs bypass the limit; everything else is rejected with 403.

### 5.5 Idempotency surfaces

| Surface | Mechanism |
|---|---|
| Checkout creation | At most one non-expired `CheckoutSession` per user with `status=pending`; re-request returns the existing session. Expired or completed sessions don't block a new one. |
| Webhook | `WebhookEvent.gatewayTransactionId` unique index |
| Charge attempt | `Invoice.merchantReference` unique index — `inv_*` is never reused |
| Cron concurrency | `Subscription.processingLockedAt` optimistic lock |

---

## 6. Backend API Surface

`campusly-backend/src/modules/subscription/routes.ts`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/subscriptions/me` | Current user's subscription + plan |
| GET | `/api/plans` | List active plans |
| POST | `/api/subscriptions/checkout` | Start tokenisation: returns `{ paymentKey, sessionId }` |
| POST | `/api/subscriptions/update-card` | Same as checkout but for replacing the card on an existing sub |
| POST | `/api/subscriptions/cancel` | Set `cancelAtPeriodEnd=true` |
| POST | `/api/subscriptions/resume` | Undo cancel before period end |
| GET | `/api/subscriptions/invoices` | List user's invoices (history) |
| POST | `/api/webhooks/onegate` | OneGate notify_url target (no auth, idempotent) |
| GET | `/api/subscriptions/checkout-session/:id` | Frontend polls after returning from `success_url` to confirm Subscription state |

Auth middleware: all `/subscriptions/*` routes require authenticated user; multi-tenancy by `schoolId` from JWT.

**Entitlement middleware:** `requireEntitlement('aiGeneration')` reads the active Subscription via the cache on `req.user`, resolves the Plan, checks `plan.entitlements[key]`. Used on AI generation endpoints, paper generation, etc.

---

## 7. Frontend

`campusly-frontend`:

### 7.1 Files added

| Path | Purpose |
|---|---|
| `src/types/subscription.ts` | Shared types: `Plan`, `Subscription`, `Invoice`, `SubscriptionStatus`, etc. |
| `src/hooks/useSubscription.ts` | Fetches `/api/subscriptions/me`; returns `{ subscription, plan, isPro, isTrialing, isPastDue, daysLeftInTrial, refetch }` |
| `src/hooks/useEntitlement.ts` | `useEntitlement('aiGeneration') → boolean` reading from subscription |
| `src/hooks/useCheckout.ts` | Encapsulates the launch flow: backend call → load `checkout.js` → `Checkout.init` → handle callbacks → invalidate subscription |
| `src/hooks/useInvoices.ts` | `/api/subscriptions/invoices` for billing page |
| `src/app/(dashboard)/subscription/page.tsx` | Pricing page — PricingCards + CheckoutLauncher |
| `src/app/(dashboard)/subscription/success/page.tsx` | Polls `/checkout-session/:id`, confirms, redirects to dashboard with toast |
| `src/app/(dashboard)/subscription/error/page.tsx` | Error explanation + "Try again" |
| `src/app/(dashboard)/subscription/pending/page.tsx` | Pending state (rare — 3DS edge cases) |
| `src/app/(dashboard)/my/billing/page.tsx` | Plan, card on file, next billing, invoices, change/cancel |
| `src/components/subscription/PricingCards.tsx` | Free / Pro Monthly / Pro Annual |
| `src/components/subscription/CheckoutLauncher.tsx` | Wires `useCheckout` to a button |
| `src/components/subscription/TrialBanner.tsx` | Sticky top banner with countdown |
| `src/components/subscription/DunningBanner.tsx` | Past-due / unpaid banner |
| `src/components/subscription/ProGate.tsx` | Inline gate wrapper |
| `src/components/subscription/UpgradeModal.tsx` | Generic upsell modal triggered by Pro-locked actions |
| `src/components/subscription/CancelDialog.tsx` | Cancel-at-period-end confirmation |
| `src/components/subscription/InvoicesTable.tsx` | History table on billing page |

`useAuthStore` extended with a `subscription` slice populated from `/api/auth/me` (one fewer roundtrip on first paint). Re-fetched on checkout success, cancel, resume, plan change.

### 7.2 UX flows

| Moment | What the teacher sees |
|---|---|
| **First login (free)** | Dashboard renders normally. Pro-locked menu items show a small "Pro" pill. Clicking opens `UpgradeModal`. |
| **Pricing page** | Three cards; current plan highlighted. Free is "Current". Pro cards show "Start 14-day Pro Trial" → opens checkout widget inline. |
| **Checkout** | OneGate modal opens over Campusly. User enters card. On `onComplete`, modal closes, toast "You're on Pro for 14 days. No charge until [date].", banner appears. |
| **Trialing** | `TrialBanner` shows "14 days of Pro left. [Manage]". At ≤3 days the banner shifts to amber. |
| **Active** | No banner. Billing page shows next charge date and card. |
| **Past-due** | `DunningBanner`: "Your last payment didn't go through. We'll retry on [date]. [Update card]". Pro stays enabled. |
| **Card expired (pre-empted)** | Same banner, copy: "Your card on file has expired. [Update card]". |
| **Canceled** | Banner: "Pro until [date]. [Resume subscription]". Billing page shows status. |
| **Lapsed to free** | Banner: "Your subscription ended. [Reactivate]". Pro features locked again. |

### 7.3 Gating pattern

```tsx
// Component wrapping
<ProGate feature="aiGeneration" fallback={<UpgradeCard feature="aiGeneration" />}>
  <GenerateQuestionsButton />
</ProGate>

// Imperative
const canGenerate = useEntitlement('aiGeneration');
if (!canGenerate) { openUpgradeModal('aiGeneration'); return; }
```

Frontend gating is UX only — backend middleware independently enforces.

---

## 8. Environment & Configuration

`campusly-backend/.env` additions:

```
ONEGATE_ORG_ID=21234
ONEGATE_SALT=pytJyMIucGoyxM-4jiYu
ONEGATE_BASE_URL=https://payments.onegate.co.za
ONEGATE_WEBHOOK_PATH=/api/webhooks/onegate
ONEGATE_IP_ALLOWLIST=          # empty = disabled; production: 54.72.191.28,54.194.139.201
SUBSCRIPTION_CRON_ENABLED=true
SUBSCRIPTION_CRON_INTERVAL_MIN=5
FRONTEND_BASE_URL=https://app.campusly.co.za   # used to build success/error/pending URLs
```

`.env.example` ships with placeholders (no live values committed).

`campusly-frontend/.env.local`:

```
NEXT_PUBLIC_ONEGATE_CHECKOUT_JS=https://payments.onegate.co.za/ext/checkout/v4/checkout.js
```

---

## 9. Seed Data

`campusly-backend/src/modules/subscription/seed.ts` — idempotent upsert on `Plan.code`:

```ts
{ code: 'free',        name: 'Free',        subscriberType: 'teacher', amountExclTax: 0,     interval: null,    trialDays: 0,  entitlements: { aiGeneration: false, paperGeneration: false, maxClasses: 1, advancedAnalytics: false }, isActive: true, displayOrder: 0 },
{ code: 'pro_monthly', name: 'Pro Monthly', subscriberType: 'teacher', amountExclTax: 14900, interval: 'month', trialDays: 14, entitlements: { aiGeneration: true,  paperGeneration: true,  maxClasses: null, advancedAnalytics: true }, isActive: true, displayOrder: 1 },
{ code: 'pro_annual',  name: 'Pro Annual',  subscriberType: 'teacher', amountExclTax: 149000,interval: 'year',  trialDays: 14, entitlements: { aiGeneration: true,  paperGeneration: true,  maxClasses: null, advancedAnalytics: true }, isActive: true, displayOrder: 2 },
```

### Migration of existing standalone teachers

Existing standalone teachers were created with `subscription.tier='basic'` and a hardcoded 365-day expiry, with no actual feature gating. To avoid breaking them on launch (e.g. a teacher with 3 classes when Free is `maxClasses: 1`), the migration grandfathers them:

- For each existing standalone-teacher School: create a Subscription with `status=active`, `planCode=pro_monthly`, `currentPeriodStart=createdAt`, `currentPeriodEnd=<grandfather cutoff>`, `cardTokenGuid=null`, `cancelAtPeriodEnd=true`, `nextBillingAt=<grandfather cutoff>`.
- Grandfather cutoff: **2026-08-13 (90 days from launch)** — gives existing users a 90-day Pro window to choose: add a card (becomes a real paying customer) or accept dropping to Free at cutoff.
- On launch day, all grandfathered users see an in-app banner: "You're on Pro until [date]. Add a card to continue, or you'll move to Free."
- Cron handles the drop to Free at cutoff automatically via existing canceled→free transition.

The existing hardcoded 365-day `basic` tier in `campusly-backend/src/modules/auth/service.ts:75-100` is removed and replaced with a call to `subscriptionService.createInitialFreeSubscription(school._id)` for new signups.

**Hookup point:** `auth/service.ts` (the standalone-teacher creation function) calls `subscriptionService.createInitialFreeSubscription(school._id)` immediately after creating the School document. The Subscription module exposes this single function as its initialisation API — auth never reaches into Subscription internals.

---

## 10. Testing Plan

### Unit tests
- `auth.ts`: sha256 token generation against a known fixture
- State machine: every transition rule, including edge cases (trial-end charge fails, card expired pre-emption, cancel-then-resume)
- Entitlement resolution: free vs trialing vs active vs canceled (with period in future)

### Integration (UAT, manual)
1. New teacher signup → land on free → open pricing → start trial with card `4229989999000012` / CVV 871 / 12/31 / 3DS `test123` → confirm Subscription is `trialing`, banner shows correct day count
2. Time-travel: `db.subscriptions.updateOne({_id}, { $set: { nextBillingAt: new Date(Date.now() - 60000) } })`, run cron, confirm `active`, Invoice paid, charge visible in OneGate dashboard
3. Time-travel into recurring window: same approach, confirm period rolls forward
4. Force failure: invalidate the stored `cardTokenGuid` temporarily, run cron, confirm `past_due` → retries → `unpaid` → `free`
5. Cancel: cancel, confirm `cancelAtPeriodEnd=true`, time-travel past `currentPeriodEnd`, confirm drop to `free`
6. Resume: cancel, then resume before period end, confirm `cancelAtPeriodEnd=false`
7. Card expired pre-emption: set `cardExpiryYear` to 2024, run cron, confirm no charge attempt and `past_due`

### Webhook tests
- Resend same webhook via OneGate dashboard → confirm `WebhookEvent` returns 200 noop
- Direct POST to `/api/webhooks/onegate` with synthetic body → confirm lookup-verification rejects unverified payloads

### Frontend tests
- Loading / empty / error states on every page (per CLAUDE.md)
- Responsive: pricing cards stack on mobile (`grid-cols-1 sm:grid-cols-3`)
- Modal scroll pattern (flex-col, sticky footer)
- Pro-locked features show upsell to Free users; usable to Pro users; usable to trialing users

---

## 11. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| ~~R1 verification flow may not be how OneGate widget tokenisation works~~ **RESOLVED 2026-05-13** | ~~P0~~ | Spike confirmed: R1+refund works via hosted-redirect flow (not widget). Form-encoded bodies required. See §2 callout. |
| **Production cards must support MIT exemption for silent recurring billing** | **P0 (pre-launch)** | UAT demo card forces 3DS on every charge. Production confirmation needed: (1) ask OneGate support to enable MIT for our merchant, (2) verify with real card before launch, (3) design dunning fallback path for cards that DO require 3DS on recurring (mark sub as `needs_reverification`, email user, retry after they auth via redirect link). |
| Webhook lost mid-flight | P1 | Cron reconciles via `GET /gateway-transaction/{id}` at next pass. Charges return inline so we rarely rely on webhook to know success. |
| Concurrent cron processes same subscription | P1 | `processingLockedAt` optimistic lock + stale-lock recovery after 10 min |
| Stored card expires between billing cycles | P1 | Pre-emptive expiry check before each charge; UI banner prompts card update |
| Trial-end charge declines | P2 | Drop to free with explanatory banner. Single attempt — no looping dunning during trial. |
| R1 verification refund never arrives at customer | P2 | Refund logged as Invoice; manual reconciliation possible from billing page. Customer-visible "refund pending" if needed. |
| Salt or API key leaked | P1 | Salt stays server-side. Frontend only receives single-use 15-min `payment_key`. Rotate salt in OneGate dashboard if compromised. |
| OneGate downtime during checkout | P2 | `error_url` redirect plus toast; CheckoutSession marked `failed`; user can retry. |
| Plan code typo | P2 | All gating reads from Plan rows; bad plan code → entitlement lookup returns `false`, fail-safe (locks Pro features) |
| Systemic gateway outage (many charges failing simultaneously) | P1 | Cron emits a domain event when consecutive failures exceed threshold (e.g. 10 in a row); event handler logs `ERROR` level + writes to an `AdminAlert` collection; admin dashboard surfaces unresolved alerts. Email/Slack hookup deferred but the signal is there. |
| Webhook endpoint flooded by hostile actor | P2 | Per-IP rate limit on `/api/webhooks/onegate`; IP allowlist enabled in production. |
| PCI scope creep | P1 | **Hard rule: no card input field anywhere in Campusly UI.** Always use OneGate's Checkout Widget. If a future contributor wants to "save a UX click" by adding a card form, the answer is no — it would force us from SAQ A to SAQ A-EP and is not negotiable without a compliance review. |
| Pricing change retroactively shifts old invoice math | P2 | Plan codes are **immutable** once issued. Price changes = new plan code (e.g. `pro_monthly_v2`); old plan marked `isActive=false`. Existing subscriptions keep their original `planCode`. `Invoice.taxRate` is snapshotted at issuance for the same reason. |
| Cron tick latency (5-min granularity) | P3 | UI may briefly show "0 days left" before transition. Cosmetic only. If users complain, lower cron interval or trigger an on-demand transition when frontend polls `/me`. |

---

## 12. File Layout Summary

**Backend (`campusly-backend/`)**

```
src/lib/onegate/
  client.ts
  auth.ts
  types.ts
  errors.ts
  index.ts
src/modules/subscription/
  model.ts          # Plan, Subscription, Invoice, WebhookEvent, CheckoutSession
  service.ts        # state machine + charge orchestration
  controller.ts     # route handlers
  routes.ts         # express router
  validation.ts     # zod schemas
  webhook.ts        # /webhooks/onegate handler
  cron.ts           # billing cron
  entitlements.ts   # middleware
  seed.ts           # plan seed
```

**Frontend (`campusly-frontend/`)**

```
src/types/subscription.ts
src/hooks/useSubscription.ts
src/hooks/useEntitlement.ts
src/hooks/useCheckout.ts
src/hooks/useInvoices.ts
src/app/(dashboard)/subscription/
  page.tsx
  success/page.tsx
  error/page.tsx
  pending/page.tsx
src/app/(dashboard)/my/billing/page.tsx
src/components/subscription/
  PricingCards.tsx
  CheckoutLauncher.tsx
  TrialBanner.tsx
  DunningBanner.tsx
  ProGate.tsx
  UpgradeModal.tsx
  CancelDialog.tsx
  InvoicesTable.tsx
```

All files target the 350-line CLAUDE.md cap. Anything that would exceed it is decomposed before writing.

---

## 13. Implementation Order

0. **Tokenisation spike (P0 gate).** Wire just enough plumbing — OneGate client auth, one endpoint, the v4 widget on a throwaway page — to validate that we can capture a reusable card token using the UAT test card. Confirm the exact response/webhook shape. Decide whether to proceed with R1+refund, full first-month-upfront, or pivot. **No other work in this spec begins until this completes.**
1. Backend models + Plan seed
2. OneGate client wrapper hardened from the spike code
3. Subscription service (state machine without cron yet)
4. Checkout + webhook endpoints (with rate limiting)
5. Cron worker (including dunning + canceled-cleanup + alert emission on consecutive failures)
6. Migration: grandfather existing standalone teachers as Pro (90-day window), backfill Free for any without subscriptions, remove hardcoded `basic` tier, wire `auth/service.ts` to `subscriptionService.createInitialFreeSubscription`
7. Frontend: types, `useSubscription`, `useEntitlement`, `useAuthStore` subscription slice
8. Frontend: pricing page + checkout launcher
9. Frontend: banners (trial countdown, dunning, grandfather window) + entitlement gating across existing Pro features
10. Frontend: billing settings + cancel/resume
11. End-to-end UAT validation with the OneGate test card

Single-branch development on master per memory:project preference.
