# Campusly Mobile App — v1 Design

**Date:** 2026-05-14
**Status:** Draft, awaiting user review
**Owner:** Shaun Schoeman
**Repo (to be created):** `campusly-mobile`

---

## 1. Context

The Campusly platform today is a Next.js 16 web app (`campusly-frontend`) backed by an Express 5 + MongoDB API (`campusly-backend`) and a SaaS subscription layer billed through OneGate. Phase 1 GTM ships the teacher web portal first; this spec defines the **Phase 2 mobile companion** for the non-staff audience: parents and students.

We are building a **single Expo (React Native) app** that talks directly to the existing REST API, role-aware on login. v1 is intentionally lean — the highest-frequency, most-mobile-native flows (login, push, see-my-kid's-stuff, pay fees, top up wallet, view/submit homework, view grades). Lower-frequency or technically heavier features (classroom live join, AI tutor, messaging, tuck-shop ordering, consent forms, events, library) are deferred to v1.1+.

The backend is largely ready: JWT auth with refresh tokens, multi-tenant `schoolId` scoping, `/api/communication/devices` for FCM/APNs registration, OneGate hosted-page checkout already integrated for SaaS subscriptions, notification preferences modeled. The mobile work centres on the client app plus five small backend changes enumerated in Section 3.

## 2. Decisions

The following decisions were locked during brainstorming and form the foundation of the rest of the design:

| # | Decision | Choice |
|---|---|---|
| 1 | Audience for v1 | Parents + Students (single app, role-aware) |
| 2 | Tech stack | Expo (React Native) + EAS |
| 3 | Scope | Lean v1 — auth, push, parent reads, fees+wallet via OneGate, student homework submit + grades |
| 4 | Repository structure | New separate `campusly-mobile` repo; copy types via sync script |
| 5 | Data fetching | TanStack Query, in-memory cache only (no persistence) |
| 6 | Auth storage | `expo-secure-store` + biometric/PIN lock on cold start |
| 7 | Parent multi-child | Global child picker in header; one active child drives every screen |
| 8 | Payments | OneGate for fees + wallet on mobile (new backend endpoints; web stays on PayFast until migrated later) |
| 9 | App identity | Single "Campusly" app; role selection / context switch at login when both apply |
| 10 | Navigation | Role-specific bottom tabs via Expo Router file-based routes |

## 2a. Prerequisites (must start week 1, blocks week 6)

The following are external dependencies that take real time to procure and cannot be parallelised with engineering work. Start them on day one of week 1.

- **Apple Developer Program** — $99/year, 24–48h approval (or longer if D-U-N-S verification is needed for an organisation account). Required for TestFlight and App Store submission.
- **Google Play Console** — $25 one-time, typically same-day approval. Required for internal testing track and Play Store submission.
- **Firebase project** — Free tier. Hosts the FCM server credentials we configure into EAS.
- **Apple Push Notification key** — Generated from App Store Connect. Recommended over a per-bundle cert (one key handles all bundle IDs).
- **OneGate live (production) organisation** — UAT credentials are in hand; the production org + salt must be issued by OneGate before the production EAS profile can ship. Contact OneGate at the start of week 4.
- **Apple Pay merchant identifier** — Only if/when we add native Apple Pay later. Not required for v1 (Apple Pay renders inside the OneGate hosted page).
- **Universal-links hosting (deferred to v1.x)** — When we move beyond `campusly://` scheme, we'll need `apple-app-site-association` and `assetlinks.json` hosted at `https://app.campusly.co.za/.well-known/`. Backend ops change, out of v1 scope.

## 3. High-level architecture

**Stack**
- Expo SDK 52+ (managed workflow), TypeScript strict
- Expo Router 4 (file-based routing)
- TanStack Query v5 (in-memory)
- Zustand (auth, active child, UI state)
- Axios with the same interceptor pattern as the web client (token refresh, `_id`→`id` normalization)
- React Hook Form + Zod (schemas reused from web where applicable)
- NativeWind 4 (Tailwind for RN, same OKLCH token names as web)
- Expo Secure Store, Expo Local Authentication (biometric), Expo Notifications (FCM/APNs), Expo Web Browser (OneGate hosted checkout)
- Sentry React Native for crash/error reporting

**Backend boundary**
Mobile is a pure consumer of the existing REST API. The backend changes required for v1 are small and listed here in full (Sections 5, 6, and 8 detail each):

1. `GET /api/auth/me/mobile-context` — new consolidated cold-start payload
2. `POST /api/payment-gateway/onegate/fee-payment` — new
3. `POST /api/payment-gateway/onegate/wallet-topup` — new
4. Extension of `POST /api/webhooks/onegate` to dispatch `fee_payment` and `wallet_topup` purposes (handler already exists for `tokenisation`)
5. Add a `data.deepLink` field to the existing push notification payload dispatcher

**Type sharing**
`scripts/sync-types.sh` copies **TypeScript interface declarations only** (not Zod schemas, not hooks) from `../campusly-frontend/src/types/` into `campusly-mobile/src/types/`. The script assumes both repos are checked out as siblings under the same parent directory; if they're not, the script fails with a clear "expected `../campusly-frontend/src/types` to exist" message. CI runs the script before build and fails on any uncommitted diff. Zod schemas are NOT copied because some are RHF-bound to web-specific resolvers; mobile rewrites the small ones it needs. Honest about the boundary; backend is the contract. If drift becomes recurring pain, promote to a monorepo later.

## 4. Routing & screen map

```
app/
  _layout.tsx                     # Root: providers, splash, biometric gate
  index.tsx                       # Routes to (auth) or role group based on session
  (auth)/
    _layout.tsx
    login.tsx
    forgot-password.tsx
    reset-password.tsx
    role-selector.tsx             # When user has both parent + student profiles
  (parent)/
    _layout.tsx                   # Tabs, ChildPickerHeader, role guard
    home.tsx
    homework/
      index.tsx
      [id].tsx
    attendance.tsx
    fees/
      index.tsx
      pay.tsx
      [invoiceId].tsx
    wallet/
      index.tsx
      topup.tsx
    announcements.tsx
    notifications.tsx
    more/
      index.tsx
      profile.tsx
      security.tsx
      notification-prefs.tsx
      children.tsx
      about.tsx
  (student)/
    _layout.tsx                   # Tabs, role guard
    home.tsx
    homework/
      index.tsx
      [id].tsx
      [id]/submit.tsx
    grades.tsx
    notifications.tsx
    more/
      index.tsx
      profile.tsx
      security.tsx
      notification-prefs.tsx
      about.tsx
  payment-return.tsx              # Universal OneGate redirect landing
```

**Tab bars (5 items, iOS HIG cap)**
- Parent: Home · Fees · Wallet · Notifications · More
- Student: Home · Homework · Grades · Notifications · More

Homework, Attendance, and Announcements for parents live as cards on the Home screen that push into stacks — keeps the tab bar to 5 items without sacrificing access.

**Role guard pattern**
`(parent)/_layout.tsx` and `(student)/_layout.tsx` each render a guard component: if no session → `/(auth)/login`; if `session.role` does not match the group → redirect to the correct group's home. Belt-and-braces against malformed deep links.

**Deep linking**
- Scheme: `campusly://`
- Universal links (`https://app.campusly.co.za/...`) configured for production later
- Routes:
  - `campusly://homework/:id` → routes by session role
  - `campusly://payment-return?paymentId=X` → `payment-return.tsx`
  - `campusly://notifications` → notifications tab

## 5. Auth, biometric, session lifecycle

**Cold start sequence**
1. `_layout.tsx` mounts; splash visible.
2. Read `accessToken` + `refreshToken` from `expo-secure-store`. None → `/(auth)/login`.
3. Read `lastActiveAt` from SecureStore. If older than 7 days → clear tokens, route to `/(auth)/login` (long-background policy).
4. If tokens exist AND `settings.biometricEnabled` is true → `expo-local-authentication.authenticateAsync()`. On three consecutive fails: clear tokens (the cached session is destroyed; the account itself is not locked) and route to `/(auth)/login` where the user re-authenticates with email/password.
5. Call `GET /api/auth/me/mobile-context` → hydrate `useAuthStore`.
6. **Role gate:** if `user.role` is not one of `parent` or `student` (e.g., a teacher tries to sign in here), show the "Please use the web portal" screen and `POST /api/auth/logout`. Teachers, admins, and other staff roles use the web app.
7. Determine landing: one role → corresponding group's home; both parent and student profiles present → `/(auth)/role-selector` once, then remember choice in SecureStore.
8. Hide splash. Write `lastActiveAt = now` to SecureStore. Subsequent foreground events update the same key.

**Token refresh**
Verbatim port of the web's axios response interceptor. Swap `localStorage` for the SecureStore adapter (`src/lib/secure-storage.ts`). Deduped concurrent refreshes; clear and redirect on refresh failure.

**Biometric UX**
- First-time post-login prompt: "Use Face ID / Touch ID for fast sign-in?" — toggle stored in SecureStore as `biometricEnabled`.
- Cold start (when biometric enabled and tokens exist): prompt before any app content renders. Three consecutive fails → clear cached tokens, route to email/password login.
- App resume after >5 min in background: re-prompt with the same failure policy.
- App resume within 5 min: no prompt (user just switched apps briefly).
- Long-background expiry: when `lastActiveAt` is older than 7 days at cold start, tokens are cleared regardless of biometric — user must sign in fresh.
- Device-credential fallback (`fallbackLabel: 'Use Passcode'`) offered by `expo-local-authentication` if biometric isn't enrolled or hardware unavailable. If neither is available, the app silently disables the biometric toggle.

**Logout**
- `POST /api/auth/logout` fire-and-forget
- Clear SecureStore, reset QueryClient, reset Zustand stores
- `DELETE /api/communication/devices/:token` to unregister push
- Route to `/(auth)/login`

**Push token registration**
On login (and on app start when already authenticated): permission check → token fetch via `expo-notifications` → `POST /api/communication/devices` with `{ token, platform, deviceId, appVersion, locale }`. Existing backend endpoint.

**New backend endpoint: `GET /api/auth/me/mobile-context`**

Response shape (TypeScript):
```ts
type MobileContextResponse = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'parent' | 'student' | 'teacher' | 'admin' | 'school_admin' | string;
    profileImage: string | null;
    phone: string | null;
  };
  school: {
    id: string;
    name: string;
    logo: string | null;
    settings: {
      currency: string;          // e.g. "ZAR"
      paymentProviders: string[]; // e.g. ["onegate"]
    };
  };
  parent: {
    id: string;
    children: Array<{
      id: string;
      firstName: string;
      lastName: string;
      profileImage: string | null;
      classId: string | null;
      gradeId: string | null;
    }>;
  } | null;
  student: {
    id: string;
    classId: string | null;
    gradeId: string | null;
  } | null;
};
```

Backend implementation: one controller in `src/modules/Auth/controllers/mobileContext.controller.ts`, three internal lookups (User, Parent.find({userId}), Student.find({userId})), one school lookup. All multi-tenant-scoped by `schoolId`. Single fetch saves ~1.5s on cold start vs three sequential client lookups.

## 6. Payments — OneGate end-to-end

The web's existing parent-facing payment flows use PayFast. Mobile cuts a fresh path on OneGate to consolidate the payment stack (per decision 8). The web can migrate later in a follow-on sprint.

### New backend endpoints

```
POST /api/payment-gateway/onegate/fee-payment
  body: { invoiceIds: string[], returnUrl: string }
  → { paymentId, redirectUrl, expiresAt }

POST /api/payment-gateway/onegate/wallet-topup
  body: { walletId, amount, returnUrl }
  → { paymentId, redirectUrl, expiresAt }
```

Both reuse the existing `OneGateClient` (`campusly-backend/src/lib/onegate/client.ts`) — `createPaymentKey()` with SHA256 `Auth-Token` header signing using the existing org ID and salt. They create the same `OnlinePayment` record the PayFast path creates today, with `provider: 'onegate'` and `paymentType: 'fee_payment' | 'wallet_topup'`.

### Status endpoint (reused)
`GET /api/payment-gateway/status/:paymentId` — existing, provider-agnostic, returns `{ status, paidAt, receiptNumber, ... }`. No change required.

### Webhook extension
`POST /api/webhooks/onegate` currently dispatches on `purpose: 'tokenisation'`. Add two branches:
- `purpose: 'fee_payment'` → look up `OnlinePayment`, call `PaymentCompletionService.completeFeePayment(paymentId)`.
- `purpose: 'wallet_topup'` → look up `OnlinePayment`, call `PaymentCompletionService.completeWalletTopup(paymentId)`.

Webhook auth is unchanged: IP allowlist + SHA256 `Auth-Token` header verification.

**Refactor required (avoid duplication):** Today the PayFast webhook handler (`src/modules/PaymentGateway/services/payfast.service.ts` or its consumer) contains the fee-completion and wallet-credit logic inline. We extract that to a new provider-agnostic `PaymentCompletionService` with two methods: `completeFeePayment(paymentId)` and `completeWalletTopup(paymentId)`. Both webhooks (existing PayFast, new OneGate dispatch) call into this service. The service is idempotent — calling it twice on the same paymentId after `status === 'completed'` is a no-op. This refactor is part of the week 4 backend work, not a separate sprint.

### Mobile flow (fee payment)
1. Parent selects invoice(s) on the Fees screen.
2. `useOneGatePayment.payFees(invoiceIds)`:
   ```ts
   const { paymentId, redirectUrl } = await apiClient.post(
     '/payment-gateway/onegate/fee-payment',
     { invoiceIds, returnUrl: 'campusly://payment-return' }
   );
   ```
3. `WebBrowser.openAuthSessionAsync(redirectUrl, 'campusly://payment-return')` — ASWebAuthenticationSession on iOS / Chrome Custom Tabs on Android. System-rendered, HTTPS lock, Apple Pay / Google Pay buttons rendered inline by OneGate.
4. OneGate redirects to `campusly://payment-return?paymentId=X&status=...` on completion or cancel; OS hands control back to the app.
5. App routes to `payment-return.tsx`, which polls `GET /payment-gateway/status/:paymentId` (1s interval, max 6 polls). Shows success / pending / failed state.
6. On success: invalidate `['fees']` and `['wallet']` queries.

Wallet top-up: identical, hits `/onegate/wallet-topup` and invalidates `['wallet']`.

### Edge cases
- App killed mid-payment → unresolved `paymentId` stored in SecureStore; next launch routes to `payment-return.tsx` and resumes polling.
- User cancels in browser → `openAuthSessionAsync` resolves with `type: 'cancel'` → toast, no state change.
- Webhook race (arrives before client polls) → status endpoint already reports `completed`; `OnlinePayment.status` is the single source of truth, no double-credit risk.

### Apple Pay / Google Pay
v1 ships them as buttons inside the OneGate hosted page (no native code). Native Apple Pay sheet ("one-tap from inside the app, no webview") deferred to v1.x.

### Credentials
- UAT: Organisation ID 21234, salt held server-side, redirect base `https://payments.onegate.co.za`. Test card per OneGate UAT documentation (Imbeko Demo Visa 3DS).
- Production: separate organisation + salt, managed via EAS / backend env vars. The salt **never** reaches the mobile bundle — only the backend signs.

## 7. Data layer & offline behaviour

**HTTP client (`src/lib/api-client.ts`)**
Verbatim port of the web's. Differences:
- Storage adapter: `expo-secure-store` via `src/lib/secure-storage.ts`.
- Base URL from `expo-constants.manifest.extra.apiUrl` (per EAS profile).
- Static header on every request: `X-Client: campusly-mobile/<version>`.
- `_id`→`id` response normalizer ported as-is.

**TanStack Query defaults**
```ts
staleTime: 60_000
gcTime:    5 * 60_000
retry:     2
refetchOnWindowFocus: false
refetchOnReconnect:   true
```
No persistence. Cold start = empty cache = brief spinner; compensated by parallel queries on home screens. Pull-to-refresh on every list.

**Mutations**
- Optimistic where safe (mark notification read, toggle notification preference)
- Pessimistic for hard mutations (submit homework, pay fees, top up wallet) — spinner + toast + server confirmation

**Hook organisation**
```
src/hooks/
  auth/        useLogin, useLogout, useSession, useBiometric
  push/        usePushRegistration, useNotificationPrefs
  parent/      useChildren, useActiveChild, useChildHomework,
               useChildAttendance, useFees, useFeesActions,
               useWallet, useWalletActions, useAnnouncements
  student/     useTodaySnapshot, useStudentHomework,
               useHomeworkSubmission, useGrades
  shared/     useNotifications, useNotificationActions,
               useSchool, useProfile
```
All `apiClient` imports live here. Pages and components stay clean (CLAUDE.md separation-of-concerns rule).

**Active child state**
`useActiveChildStore` (Zustand) persists `activeChildId` to SecureStore. Hydrated on cold start before any parent screen renders. Parent hooks scope by it: `queryKey: ['homework', activeChildId]`.

**Connectivity awareness**
- `@react-native-community/netinfo` exposes connection state.
- `useIsOnline()` drives: persistent offline banner ("Showing last known data"), disables mutation buttons, suppresses retries.

**Empty / loading / error states**
Three reusable components — `EmptyState`, `LoadingSpinner`, `ErrorBlock` (with retry). Every list screen renders all three states.

**File uploads (student homework submission)**
- `expo-image-picker` (camera + library), `expo-document-picker` (PDFs/Office)
- `multipart/form-data` to existing homework submission endpoint
- Per-file progress via Axios `onUploadProgress`
- 25 MB single-file cap (matches backend multer config)
- Multi-file submissions: list view with per-file progress and retry-on-fail

## 8. Push notifications

**Provider stack**
- `expo-notifications` (JS surface: permission, token, foreground handler, navigation on tap)
- Native delivery: FCM (Android) + APNs (iOS), credentials configured via EAS
- **Not** using Expo Push Service — backend already integrates with FCM/APNs directly

**Permission flow**
- Don't ask on launch — too early. Ask after the first meaningful action (parent: first child card opened; student: first homework opened).
- Pre-permission rationale sheet → then native prompt.
- Denial: one-time deep link to OS settings from `more/notification-prefs.tsx`. No nagging.

**Token lifecycle**
- On login / app start: permission check → `getDevicePushTokenAsync()` → `POST /api/communication/devices`
- `addPushTokenListener` re-posts on rotation
- On logout: `DELETE /api/communication/devices/:token`

**Notification preferences screen**
Hits existing `/api/notifications/preferences`. v1 categories (one toggle row each): `homework`, `grades`, `attendance`, `billing` (covers both fees and wallet — one user-visible label), `announcements`. Messaging row is disabled with "coming soon." Email/SMS toggles live on web only.

**Payload contract (backend)**
```
{
  notification: { title, body },
  data: {
    category: 'homework' | 'grades' | 'attendance' | 'billing' | 'announcements',
    deepLink: 'campusly://homework/abc123',
    notificationId: '...'
  }
}
```

The category enum is intentionally identical to the prefs toggle keys so the client can short-circuit display when a user has disabled a category. Backend dispatcher tweaks for v1: (a) add the `data.deepLink` field; (b) normalise category names if the existing dispatcher uses different ones (small migration — preferences schema may need a one-line rename). Existing notification records are unaffected; this is a payload-shape change, not a stored-data change.

**Foreground / background / killed behaviour**
- Foreground → in-app toast via `sonner-native` (no jarring system banner)
- Background → OS banner; tap → deep link
- Killed (cold open) → `Notifications.getLastNotificationResponseAsync()` checked during cold start; routes to deep link after auth completes

**Badge counts**
iOS only: `/api/notifications/unread-count` drives the icon badge. Refreshed on foreground and after read mutations. Android skipped.

## 9. Design system, branding, accessibility

**Visual language**
Same OKLCH semantic tokens as the web (primary, destructive, muted, sidebar-*, chart-1..5, plus status and CAPS cognitive-level tokens). NativeWind 4 imports them so class strings (`bg-primary`, `text-destructive`) work unchanged.

**Theming**
- Dark mode supported from day one (`useColorScheme` + `dark:` variant)
- Inter font via `expo-font`; same size scale as web with `text-base` default for body

**Component library (`src/components/ui/`)**
RN-native primitives matching the web's API surface: Button, Card, Input, Textarea, Select (bottom-sheet picker), Badge, Dialog → BottomSheet (via `@gorhom/bottom-sheet`), Modal, Avatar, Skeleton, Switch, Checkbox, Tabs, Toast (`sonner-native`).

Domain primitives: `ChildPickerHeader`, `InvoiceCard`, `HomeworkCard`, `GradeRow`, `EmptyState`, `LoadingSpinner`, `ErrorBlock`, `OfflineBanner`.

All files under 350 lines per CLAUDE.md rule.

**Brand assets**
- Single 1024×1024 logo; EAS auto-generates sizes
- Splash: logo on `bg-primary`, system-handled until JS boots
- App name: "Campusly"
- Bundle IDs: `co.za.campusly.app` (production), `.preview`, `.dev` for non-prod

**Accessibility**
- Every interactive element: `accessibilityLabel` + `accessibilityRole`, minimum 44×44 hit target
- Contrast ≥ 4.5:1 (verified during build)
- Dynamic Type honored with 1.3x cap
- VoiceOver + TalkBack pass on login, pay fees, submit homework before v1 release
- Reduce-motion honored for animations

**Localisation**
v1 ships English only. `i18next` + `expo-localization` wired from day one; strings live in `src/locales/en.json`. Adding isiZulu or Afrikaans later is JSON-only.

## 10. Testing, CI/CD, environments

**Test pyramid**
- **Unit (Jest + jest-expo)** — branching logic in hooks, Zod schemas, secure-storage adapter
- **Component (RNTL)** — `ChildPickerHeader`, `InvoiceCard`, `HomeworkSubmissionForm`, `OfflineBanner`. Loading / empty / error / success. No snapshots.
- **Integration (RNTL + MSW)** — Login, Parent Home, Fees → Pay, Wallet Top-up, Student Homework Submission
- **E2E (Maestro)** — Two golden paths: parent pays fee end-to-end; student submits homework photo end-to-end

**Test fixtures** sourced from actual backend responses captured during dev, stored in `src/test/fixtures/`.

**Environments (`eas.json`)**

| Profile | Bundle ID | API URL | OneGate |
|---|---|---|---|
| development | `co.za.campusly.app.dev` | localhost / 10.0.2.2:4500 | UAT |
| preview | `co.za.campusly.app.preview` | staging.api.campusly.co.za | UAT |
| production | `co.za.campusly.app` | api.campusly.co.za | live |

Distinct bundle IDs allow side-by-side installation on a single device.

**Secrets**
- Build-time env vars via EAS secrets (`eas secret:create`)
- Repo holds `.env.example` only
- OneGate salt is **server-side only** — never bundled into the mobile binary

**CI/CD (GitHub Actions on `campusly-mobile`)**
1. PR: lint + typecheck + unit + component (required passing)
2. Merge to master: above + integration + `eas build --profile preview --platform all`; install link posted to Slack
3. Tag `v*`: `eas build --profile production`, manual approval, `eas submit`
4. Nightly: Maestro E2E against preview build on a real-device farm

**OTA updates**
- `expo-updates` enabled with `runtimeVersion.policy = 'fingerprint'`
- JS-only fixes via `eas update --channel production`
- Native changes trigger a new fingerprint and force a full binary release

**Observability**
- Sentry React Native (errors, crashes, breadcrumbs, source maps via EAS)
- Lightweight `track()` helper posting key product events (login, payment_initiated, payment_completed, homework_submitted) to the backend's existing audit endpoint
- No third-party analytics in v1

## 11. Timeline

6-week v1.

| Week | Theme | Deliverables |
|---|---|---|
| 1 | Foundations | Repo scaffold (Expo SDK 52 + Router + NativeWind + TanStack Query). `apiClient` port. Auth end-to-end. SecureStore + biometric gate. Sync-types script. EAS profiles configured. CI lint+test job. |
| 2 | Parent shell | `(parent)` layout, tabs, child picker. Home with stub cards. Backend `/auth/me/mobile-context` endpoint. Notifications inbox. Push registration + device registration. |
| 3 | Parent reads | Homework list + detail (read-only). Attendance with month picker. Announcements. Empty/loading/error states. Offline banner. |
| 4 | Parent payments | **Backend:** OneGate fee-payment, wallet-topup, webhook extension. **Mobile:** Fees list, pay flow via OneGate, Wallet balance + top-up, status polling, payment-return, resumable mid-payment state. |
| 5 | Student shell + reads | `(student)` layout + tabs. Home (today). Homework list + detail. Grades. Notifications. |
| 6 | Student submit, polish, ship | Submission flow (camera, library, document picker, multipart). Accessibility pass. Maestro E2E. Bug-bash. Production builds. TestFlight + Play Internal upload. Store listings drafted. |

**Backend sub-track (parallel to weeks 1–4)**
- Week 1: scope mobile-context endpoint, draft response shape
- Week 2: ship `/auth/me/mobile-context`; add `data.deepLink` to push payloads
- Week 4 (critical path): OneGate fee + wallet endpoints, webhook branches, end-to-end test on UAT with the Imbeko Demo Visa 3DS card

## 12. Risks

1. **Apple App Store rejection of in-WebView payments.** Mitigation: school fees and top-ups are real-world services, exempt under Review Guideline 3.1.3(e). Submit with reviewer notes citing the exemption and UAT login. `openAuthSessionAsync` (our plan) is the sanctioned modern pattern. Low probability.
2. **Wrong OneGate credentials in wrong build.** Mitigation: three EAS profiles with three bundle IDs make environment confusion physically impossible. Salt is server-side only.
3. **Backend timeline slip on OneGate endpoints (week 4 critical path).** Mitigation: spec endpoints in week 1, prototype against UAT in week 2, harden in weeks 3-4. If backend slips, mobile payment screens build against a mock for one week; read-only fee views still ship.
4. **Push notification setup fiddliness.** Mitigation: complete EAS credential dance in week 1 (early), test on real devices before any feature depends on it. Budget half a day per platform for cold-start deep-link debugging.
5. **Connectivity (SA) without persistence cache.** Mitigation: stale-while-revalidate gives in-session UX wins. If field testing shows persistent pain, AsyncStorage persistence is a one-day add — the data layer is structured to drop it in without rewrites.
6. **TypeScript drift between web and mobile.** Mitigation: CI step re-runs the sync script and fails the build on any uncommitted diff. Quarterly review to consider monorepo promotion if drift recurs.
7. **Scope creep ("while we're at it").** Mitigation: this design doc is the contract. Anything not in v1 is v1.1+. Reopen scope only after v1 ships with real users.

## 13. Out of scope (v1)

Classroom live join (LiveKit). AI tutor. Parent–teacher messaging. Tuck-shop ordering. Consent forms. Events calendar. Conference booking. Library. Transport. Sports / activities sign-up. Teacher portal on mobile. SaaS subscription checkout from inside the parent/student app. Offline mutation queueing. Native Apple Pay / Google Pay sheets. Multi-language. Email / SMS toggles on the mobile notification-prefs screen (web only).
