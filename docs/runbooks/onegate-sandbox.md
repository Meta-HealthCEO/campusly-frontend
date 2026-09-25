# OneGate sandbox check: standalone teacher subscription

The owner runs this once before launch, and again after any change to billing.
It walks one standalone teacher through trial → first charge → Pro active →
renewal → cancel against OneGate's UAT (sandbox) environment. It needs the
sandbox credentials the owner holds; nothing here is automated against
OneGate. The automated part is the backend suite (see "Before you start").

## What the code does

| Step | Where | What happens |
|---|---|---|
| Start trial | `POST /api/subscriptions/checkout` (Billing → "Start Pro trial") | Creates a `CheckoutSession` (`sub_…` reference) and a OneGate payment key for **R1**; the browser goes to OneGate's hosted page. |
| Card + 3DS | OneGate hosted page | Teacher enters the card; 3DS runs at top level. OneGate sends them to `/subscription/success`, `/error` or `/pending`. |
| Tokenisation webhook | `POST /api/webhooks/onegate` | Looks the transaction up (`GET /api/v2/gateway-transaction/{id}`), saves the card token, starts a **14-day trial** (`status: trialing`), refunds the R1. |
| First charge | billing tick every 5 min (`SUBSCRIPTION_CRON_ENABLED=true`, needs Redis) | At `trialEndsAt` it charges the saved card (`inv_…` invoice). Success → `active`, period rolled; a failed first charge → Free (no retry). |
| Renewal | billing tick | At `nextBillingAt` it charges again; failures retry after 2, 4 and 7 days (`past_due`), then Free. |
| Cancel / resume | Billing → "Cancel plan" / "Resume plan" | `status: canceled`; Pro lasts to the end of the paid period, or to the end of the trial when canceled during it. The billing tick then moves the teacher to Free without charging. Resume before then undoes it. |

## Before you start

1. Backend suite green: `npx vitest run src/modules/subscription src/lib/onegate` (checkout, webhook idempotency and lookup, trial, charge, retries, cancel/resume, cancel during trial, AI allowance by plan).
2. Plans seeded (`free`, `pro_monthly`, `pro_annual`) and a standalone teacher account whose Billing shows **Free**.
3. **HTTPS URLs.** OneGate rejects `http://localhost` for the success, error, pending and notify URLs. Put the frontend and backend behind an HTTPS tunnel (cloudflared or ngrok) or use a deployed staging pair.
4. Backend env (restart the backend after editing `.env`: `tsx watch` does not reload it):

| Variable | Value |
|---|---|
| `ONEGATE_BASE_URL` | The UAT base URL OneGate gave you (production is `https://payments.onegate.co.za`) |
| `ONEGATE_ORG_ID` | Sandbox organisation id |
| `ONEGATE_SALT` | Sandbox salt (signs requests) |
| `FRONTEND_BASE_URL` | HTTPS URL of the frontend (success/error/pending pages) |
| `BACKEND_BASE_URL` | HTTPS URL of the backend (webhook: `{BACKEND_BASE_URL}/api/webhooks/onegate`) |
| `ONEGATE_RECURRING_RETURN_URL` | Where OneGate returns a teacher after a 3DS challenge on a recurring charge (default `https://campusly.app/billing/return`) |
| `ONEGATE_IP_ALLOWLIST` | Optional: OneGate's webhook IPs, exempt from the webhook rate limit |
| `SUBSCRIPTION_CRON_ENABLED` | `true` (and `REDIS_URL` set) so the billing tick runs |

The backend logs `[subscription.startCheckout] frontend=… backend=…` on every checkout: if either is `http://localhost`, the env was not reloaded.

## Steps

Record the time, the teacher's email and each result as you go. Check the database with Compass or `mongosh` on the `subscriptions`, `checkoutsessions`, `invoices` and `webhookevents` collections.

1. **Start the trial.** Sign in as the teacher → Billing → "Start Pro trial". Pay the R1 on OneGate's page with the UAT demo card (card, CVV and expiry are in the backend's `scripts/SPIKE_FINDINGS.md`); on the 3DS simulator press **Yes**.
   - You land on `/subscription/success`.
   - `webhookevents`: one row for the transaction, `status: processed`, `verifiedViaLookup: true`. If it's `failed` with "Merchant reference already exists", see "Known risks".
   - `subscriptions`: `status: trialing`, `trialEndsAt` ≈ now + 14 days, `cardLastFour` set. Billing shows "On trial", the card, and "Trial ends {date}".
   - The R1 shows as refunded in the OneGate UAT dashboard.
   - Billing's "AI actions this month" shows the Pro allowance (500).
2. **Replay the webhook.** Resend the same notification from the OneGate dashboard (or POST the same body again). The response is `{ ok: true, idempotent: true }` and nothing else changes.
3. **First charge.** In the database set the subscription's `trialEndsAt` and `nextBillingAt` to one minute ago and wait for the next billing tick (≤ 5 min).
   - `invoices`: one `inv_…` row. With a card that supports merchant-initiated charges: `status: paid`, and the subscription is `status: active` with `currentPeriodEnd` one month on. Billing shows "Active", "Next charge {date}" and the invoice.
   - With the UAT demo card the charge comes back as a 3DS redirect (the demo card forces 3DS on recurring charges): the invoice fails with `requires_3ds` and, as a first charge, the teacher moves to Free. That is the expected sandbox result; confirm MIT exemption with OneGate before launch (see "Known risks").
4. **Webhook for the charge.** If OneGate posts a notification for the `inv_…` transaction, its `webhookevents` row is `processed` and the invoice stays `paid` (no double count).
5. **Renewal.** On an active subscription set `nextBillingAt` to one minute ago; after the tick a second invoice exists and `currentPeriodEnd` moved on by one month.
6. **Cancel.** Billing → "Cancel plan" → confirm.
   - `status: canceled`, `cancelAtPeriodEnd: true`, `nextBillingAt` = the period end. Billing shows "Cancelling" and "Pro stays active until {date}". AI still has the Pro allowance.
   - Set `nextBillingAt` and `currentPeriodEnd` to one minute ago; after the tick: `status: free`, card cleared, no new invoice. Billing shows Free and the free allowance (20).
7. **Cancel during a trial.** Repeat step 1 with a second teacher, then cancel at once: Billing shows "Pro ends {trial end}"; "Resume plan" puts them back on the trial. Cancel again, move `trialEndsAt`/`nextBillingAt` into the past, and after the tick they are on Free with no charge.

## Known risks to check with OneGate

- **Recurring charges and 3DS.** Production cards must allow merchant-initiated charges (MIT exemption) or every renewal fails with `requires_3ds`. Confirm it is enabled for the merchant account and try one real card.
- **Saving the card.** The tokenisation webhook calls `POST /api/v2/customer-token` with the checkout's `sub_…` reference. The May 2026 spike saw that endpoint refuse an existing reference ("Merchant reference already exists") and found the card token on the transaction itself (top-level `token`). If step 1's webhook fails that way, the fix is to take the token from the looked-up transaction instead.
- **CSP.** UAT reports `frame-ancestors 'self'` without enforcing it; check production.

PayFast (school fee payments) is separate and is not part of this check.
