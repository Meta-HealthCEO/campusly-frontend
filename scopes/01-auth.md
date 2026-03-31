# 01 — Auth Module

## 1. Module Overview

The Auth module is the entry point for all Campusly users. It handles registration of new schools (creating the first admin account), login for all roles, session management via rotating JWT tokens, and password reset via email.

**Roles defined on the backend** (`UserRole` enum in `src/common/enums.ts`):

| Backend enum value | Frontend route alias | Dashboard path |
|--------------------|----------------------|----------------|
| `super_admin`      | `super_admin`        | `/superadmin`  |
| `school_admin`     | `admin`              | `/admin`       |
| `teacher`          | `teacher`            | `/teacher`     |
| `parent`           | `parent`             | `/parent`      |
| `student`          | `student`            | `/student`     |

> Note: The frontend normalises `school_admin` → `admin` for routing purposes inside `useAuth`. The `tuckshop` role exists in the frontend type definitions but not in the backend `UserRole` enum — do not send it to the API.

**Token strategy:**
- Access token: short-lived (default `15m`), signed with `JWT_ACCESS_SECRET`, sent as `Authorization: Bearer <token>`.
- Refresh token: long-lived (default `7d`), signed with `JWT_REFRESH_SECRET`, stored server-side per user in `refreshTokens[]`, delivered to the browser as an **HttpOnly cookie** named `refresh_token` on path `/api/auth/refresh`.
- Refresh token rotation is enforced: each refresh call invalidates the old token and issues a new pair. If a used/stolen token is presented, all sessions for that user are immediately revoked (theft detection).

**Rate limiting:** Auth endpoints (`/register`, `/login`, `/forgot-password`, `/reset-password`) share a rate limiter: **10 requests per 15-minute window** per IP.

---

## 2. Backend API Endpoints

Base URL: `http://localhost:4000` (development). Set via `NEXT_PUBLIC_API_URL`.
All auth routes are prefixed `/api/auth`.

---

### POST /api/auth/register

Creates a new user account. In practice, this is used when the Campusly team (super admin) onboards a new school and creates its first admin user. Standard school users (teachers, parents, students) are created by the school admin through their respective module endpoints, not this endpoint.

**Rate limited:** Yes (10 req / 15 min)
**Auth required:** No

**Request body:**

| Field      | Type     | Required | Validation |
|------------|----------|----------|------------|
| `email`    | `string` | Yes      | Valid email format |
| `password` | `string` | Yes      | Min 8 chars, at least one uppercase letter, at least one digit |
| `firstName`| `string` | Yes      | Min 1 char, trimmed |
| `lastName` | `string` | Yes      | Min 1 char, trimmed |
| `role`     | `string` | Yes      | One of: `super_admin`, `school_admin`, `teacher`, `parent`, `student` |
| `schoolId` | `string` | No       | MongoDB ObjectId string |
| `phone`    | `string` | No       | Any string |

Example request:
```json
{
  "email": "admin@greenfield.co.za",
  "password": "Secure123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "school_admin",
  "schoolId": "6642a1f3c4e2b1a3d9e00001",
  "phone": "011 123 4567"
}
```

**Response — 201 Created:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6642a1f3c4e2b1a3d9e00010",
      "email": "admin@greenfield.co.za",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "school_admin",
      "schoolId": "6642a1f3c4e2b1a3d9e00001",
      "phone": "011 123 4567",
      "isActive": true,
      "isDeleted": false,
      "lastLoginAt": null,
      "createdAt": "2026-03-31T08:00:00.000Z",
      "updatedAt": "2026-03-31T08:00:00.000Z"
    },
    "accessToken": "<jwt>"
  },
  "message": "User registered successfully"
}
```

> `password` and `refreshTokens` fields are stripped from the response. The refresh token is set as an HttpOnly cookie `refresh_token` on path `/api/auth/refresh` (maxAge 7 days).

**Error responses:**

| Status | Condition |
|--------|-----------|
| 409    | Email already in use — `{ "success": false, "error": "A user with this email already exists" }` |
| 400    | Validation failure — `{ "success": false, "error": "<zod message>" }` |

---

### POST /api/auth/login

**Rate limited:** Yes (10 req / 15 min)
**Auth required:** No

**Request body:**

| Field      | Type     | Required | Validation |
|------------|----------|----------|------------|
| `email`    | `string` | Yes      | Valid email format |
| `password` | `string` | Yes      | Min 1 char |

Example request:
```json
{
  "email": "admin@greenfield.co.za",
  "password": "Secure123"
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6642a1f3c4e2b1a3d9e00010",
      "email": "admin@greenfield.co.za",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "school_admin",
      "schoolId": "6642a1f3c4e2b1a3d9e00001",
      "phone": "011 123 4567",
      "profileImage": null,
      "isActive": true,
      "isDeleted": false,
      "lastLoginAt": "2026-03-31T08:05:00.000Z",
      "createdAt": "2026-03-31T08:00:00.000Z",
      "updatedAt": "2026-03-31T08:05:00.000Z"
    },
    "accessToken": "<jwt>"
  },
  "message": "Login successful"
}
```

> Refresh token set as HttpOnly cookie. `lastLoginAt` is updated on every successful login.

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401    | Email not found or wrong password — `{ "success": false, "error": "Invalid email or password" }` |
| 401    | Account deactivated — `{ "success": false, "error": "Account is deactivated" }` |
| 400    | Validation failure |

---

### POST /api/auth/refresh

Exchanges a refresh token for a new access token + refresh token pair. Accepts the token either via the `refresh_token` cookie (preferred — browser sets it automatically) or as `refreshToken` in the request body (fallback for clients without cookie support).

**Rate limited:** No
**Auth required:** No (uses refresh token instead)

**Request body (fallback only — prefer cookie):**

| Field          | Type     | Required | Notes |
|----------------|----------|----------|-------|
| `refreshToken` | `string` | No       | Only needed if cookie is not sent |

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "accessToken": "<new-jwt>"
  },
  "message": "Token refreshed successfully"
}
```

> A new `refresh_token` cookie is also set with the rotated refresh token. The old token is invalidated.

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400    | No token provided — `{ "success": false, "error": "Refresh token is required" }` |
| 401    | Token invalid or expired — `{ "success": false, "error": "Invalid or expired refresh token" }` |
| 401    | Token reuse detected (theft) — `{ "success": false, "error": "Refresh token reuse detected — all sessions revoked" }` — all sessions wiped |

---

### POST /api/auth/logout

**Rate limited:** No
**Auth required:** Yes (`Authorization: Bearer <accessToken>`)

Reads the current refresh token from cookie or request body, removes it from the user's `refreshTokens` array in the database, and clears the cookie.

**Request body (optional — cookie is preferred):**

```json
{
  "refreshToken": "<token>"
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

> If no refresh token is provided or user is not found, the endpoint still responds 200 (graceful logout). Cookie `refresh_token` is cleared.

---

### POST /api/auth/forgot-password

**Rate limited:** Yes (10 req / 15 min)
**Auth required:** No

Generates a password reset JWT (1-hour expiry), stores it on the user document, and emails a reset link. Deliberately returns the same message regardless of whether the email exists (prevents email enumeration).

**Request body:**

| Field   | Type     | Required | Validation |
|---------|----------|----------|------------|
| `email` | `string` | Yes      | Valid email format |

Example request:
```json
{
  "email": "admin@greenfield.co.za"
}
```

**Response — 200 OK (always, regardless of email existence):**

```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

The email contains a link to `<APP_URL>/reset-password?token=<resetToken>`.

---

### POST /api/auth/reset-password

**Rate limited:** Yes (10 req / 15 min)
**Auth required:** No

Verifies the reset token (must be signed with `JWT_ACCESS_SECRET`, not expired), sets the new password, clears the reset token fields, and **revokes all existing sessions** (wipes `refreshTokens[]`).

**Request body:**

| Field      | Type     | Required | Validation |
|------------|----------|----------|------------|
| `token`    | `string` | Yes      | Min 1 char (must be the JWT from the reset email) |
| `password` | `string` | Yes      | Min 8 chars, at least one uppercase letter, at least one digit |

Example request:
```json
{
  "token": "<reset-jwt-from-email>",
  "password": "NewSecure456"
}
```

**Response — 200 OK:**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400    | Invalid or expired reset token |
| 404    | User not found |
| 400    | Validation failure |

---

### GET /api/auth/me

Returns the currently authenticated user's profile. Password and refresh tokens are excluded.

**Rate limited:** No
**Auth required:** Yes (`Authorization: Bearer <accessToken>`)

**Response — 200 OK:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6642a1f3c4e2b1a3d9e00010",
      "email": "admin@greenfield.co.za",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "school_admin",
      "schoolId": "6642a1f3c4e2b1a3d9e00001",
      "phone": "011 123 4567",
      "profileImage": null,
      "isActive": true,
      "isDeleted": false,
      "lastLoginAt": "2026-03-31T08:05:00.000Z",
      "createdAt": "2026-03-31T08:00:00.000Z",
      "updatedAt": "2026-03-31T08:05:00.000Z"
    }
  },
  "message": "User retrieved successfully"
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 401    | Missing or invalid access token |
| 404    | User deleted |

---

## 3. Frontend Pages

### `/` — Marketing / Landing Page

**File:** `src/app/page.tsx`
**Status:** Complete (static, no API calls)

Displays the public marketing page: sticky navbar with Login / Get Started buttons, hero section with gradient background, a 6-card features grid (Fee Management, Digital Wallet, Attendance, Academics, Communication, Tuck Shop), a 3-tier pricing section (Starter R2,500/mo, Professional R5,500/mo, Enterprise custom), and footer.

All CTAs link to `/register` or `/login`. No authentication required.

---

### `/login` — Login Page

**File:** `src/app/login/page.tsx`
**Status:** Complete and wired to API

Renders a centered card with the Campusly logo mark, email and password fields (with show/hide password toggle), a "Forgot password?" link to `/forgot-password`, and a Submit button with `Loader2` spinner during submission.

**Forms:**
- Email field (`type="email"`)
- Password field (`type="password"`) with eye/eye-off toggle
- Submit button — disabled while loading

**Validation:** Zod schema imported from `src/lib/validations/index.ts` (`loginSchema`). Client-side only: email format and password min 1 char.

**API calls:** `POST /api/auth/login` via `useAuth().login()`.

**Post-login redirect:** `getRoleDashboardPath(role)` — maps role to dashboard path. `school_admin` is normalised to `admin` before lookup.

**Error handling:** `toast.error()` with the error message from the thrown exception.

---

### `/register` — School Registration Page

**File:** `src/app/register/page.tsx`
**Status:** UI complete, API call is STUBBED (simulated delay, no real API call)

Three-section form in a `max-w-2xl` card:

1. **School Information** — `schoolName` (full width), `phone`, `schoolType` (select: primary / secondary / combined)
2. **Admin Account** — `adminFirstName`, `adminLastName`, `adminEmail` (full width), `adminPassword`, `confirmPassword`
3. **School Address** — `address` (full width), `city`, `province` (SA provinces select), `postalCode`

**Validation:** `registerSchema` from `src/lib/validations/index.ts`. Cross-field rule: `adminPassword === confirmPassword`.

**API calls:** Currently none — the `onSubmit` handler runs a `setTimeout(1500)` and pushes to `/login`. The real API call must be implemented.

**Implementation gap:** The registration form collects school-level data (`schoolName`, `address`, `city`, `province`, `postalCode`, `schoolType`) that is not part of the backend `POST /api/auth/register` endpoint. Registration will likely need a multi-step backend call: first create the School document via `POST /api/schools`, then register the admin user via `POST /api/auth/register` with `role: "school_admin"` and the returned `schoolId`. Confirm this flow with the backend team or check the School module scope.

---

### `/forgot-password` — Forgot Password Page

**File:** `src/app/forgot-password/page.tsx`
**Status:** UI complete, API call is STUBBED

Single email field. On submit, transitions to a success state showing a `Mail` icon and confirmation message ("If an account exists with that email...") plus a "Back to login" button.

**Validation:** Inline Zod schema (`z.string().email()`).

**API calls:** Currently none — uses `setTimeout(1000)` simulation. Must be wired to `POST /api/auth/forgot-password`.

---

### `/reset-password` — Reset Password Page

**File:** Does not exist yet — needs to be created.

This page is linked from the password reset email. The URL will contain a `token` query parameter: `/reset-password?token=<jwt>`.

Must read `token` from `useSearchParams()`, display a new-password form with confirm-password, and call `POST /api/auth/reset-password` with `{ token, password }`. On success redirect to `/login`.

---

## 4. User Flows

### Login Flow

1. User navigates to `/login`.
2. Enters email + password, submits form.
3. `useAuth().login(credentials)` calls `POST /api/auth/login`.
4. On 200: the response body contains `{ data: { user, accessToken } }`. The server also sets an HttpOnly cookie `refresh_token`.
5. `useAuth` normalises `role` (`school_admin` → `admin`).
6. `useAuthStore.login(user, { accessToken, refreshToken })` is called:
   - Stores `accessToken` in `localStorage` under key `"accessToken"`.
   - Stores `refreshToken` in `localStorage` under key `"refreshToken"`.
   - Sets `user`, `tokens`, `isAuthenticated: true`, `isLoading: false` in Zustand.
7. `router.push(getRoleDashboardPath(role))` — redirects to the correct dashboard.
8. `toast.success('Welcome back!')` is displayed.

> Current limitation: the `refreshToken` value stored in `localStorage` comes from the response body. However, the server sends the refresh token as an HttpOnly cookie, not in the JSON body. The response body only contains `accessToken`. The `useAuth` hook attempts `responseData.refreshToken ?? responseData.refresh_token` — both will be `undefined`. The `refreshToken` stored in `localStorage` will be `undefined` as a string. This must be fixed: the axios interceptor already handles refresh via the HttpOnly cookie by calling `POST /api/auth/refresh` without a body (the cookie is sent automatically), so `localStorage` storage of the refresh token is unnecessary and the interceptor works correctly regardless. The `storeLogin` call signature accepts `refreshToken` but the stored value being `undefined` is benign as long as the interceptor does not read it from `localStorage` — it does (`localStorage.getItem('refreshToken')`). If the cookie is present, the backend ignores the body `refreshToken` field and uses the cookie. So in practice, the token refresh works via cookie. The explicit `localStorage` refresh token storage is vestigial but harmless.

---

### Registration Flow (Current — Stubbed)

1. User navigates to `/register`.
2. Fills school information, admin account details, and address.
3. Form submits — currently just waits 1.5 seconds and redirects to `/login`.

**Required implementation:**
1. Call `POST /api/schools` (or equivalent) with school data to create the School document.
2. Take the returned `schoolId`.
3. Call `POST /api/auth/register` with `{ email: adminEmail, password: adminPassword, firstName: adminFirstName, lastName: adminLastName, role: "school_admin", schoolId }`.
4. On success, redirect to `/login` with a toast success.

---

### Forgot Password Flow (Current — Stubbed)

1. User navigates to `/forgot-password`.
2. Enters email, submits.
3. Currently: 1-second delay then shows success UI.

**Required implementation:**
1. Call `POST /api/auth/forgot-password` with `{ email }`.
2. Backend always returns 200. Show the success state regardless of response.
3. User clicks the link in their email → lands on `/reset-password?token=<jwt>`.

---

### Reset Password Flow (Not yet built)

1. User lands on `/reset-password?token=<jwt>` from email.
2. Page reads `token` from `useSearchParams()`.
3. If no token in URL, redirect to `/forgot-password`.
4. User enters new password and confirm password.
5. On submit, call `POST /api/auth/reset-password` with `{ token, password }`.
6. On 200, show success toast, redirect to `/login`.
7. On error (400 invalid/expired token), show error and offer link back to `/forgot-password`.

---

### Token Refresh Flow (Already implemented in api-client)

This is handled automatically by the Axios response interceptor in `src/lib/api-client.ts`:

1. Any API call returns `401`.
2. If the request has not already been retried (`!originalRequest._retry`), set `_retry = true`.
3. Read `refreshToken` from `localStorage` (see note above — may be undefined, but the HttpOnly cookie is sent automatically by the browser).
4. Call `POST /api/auth/refresh` with `{ refreshToken }` as body.
5. On success: store new `accessToken` in `localStorage`, store new `refreshToken` in `localStorage`, retry the original request with the new token in the `Authorization` header.
6. On failure (refresh also 401): clear both tokens from `localStorage`, redirect to `/login` via `window.location.href`.

---

### Logout Flow

1. User clicks logout (in dashboard nav or elsewhere).
2. `useAuth().logout()` is called.
3. `useAuthStore.logout()`:
   - Removes `accessToken` and `refreshToken` from `localStorage`.
   - Clears Zustand state: `user: null`, `tokens: null`, `isAuthenticated: false`.
4. `router.push('/login')`.

> The current implementation does NOT call `POST /api/auth/logout`. This means the refresh token is not revoked on the server. The session remains valid server-side until the refresh token naturally expires (7 days) or the user logs in from another device and the token rotates. **This should be fixed** — call `POST /api/auth/logout` (which requires the access token header) before clearing local state.

---

## 5. Data Models

### User (MongoDB — `users` collection)

Defined in `campusly-backend/src/modules/Auth/model.ts`.

```
Field                  Type              Required  Default   Notes
─────────────────────  ────────────────  ────────  ────────  ─────────────────────────────────────
email                  String            Yes       —         Unique, lowercased, trimmed
password               String            Yes       —         Bcrypt-hashed (saltRounds: 12) on save
firstName              String            Yes       —         Trimmed
lastName               String            Yes       —         Trimmed
role                   String (enum)     Yes       —         UserRole enum values
schoolId               ObjectId (ref)    No        —         Ref: 'School'
profileImage           String            No        —         URL
phone                  String            No        —         Trimmed
isActive               Boolean           No        true
isDeleted              Boolean           No        false     Soft delete flag
refreshTokens          [String]          No        []        Array of active refresh token JWTs
lastLoginAt            Date              No        —         Updated on each login
passwordResetToken     String            No        —         JWT used for password reset
passwordResetExpires   Date              No        —         Expires 1 hour after forgotPassword call
createdAt              Date              —         auto      mongoose timestamps
updatedAt              Date              —         auto      mongoose timestamps
```

**Indexes:**
- `{ email: 1 }` (unique)
- `{ schoolId: 1, role: 1 }`
- `{ email: 1, isDeleted: 1 }`

**Instance method:** `comparePassword(candidatePassword: string): Promise<boolean>` — bcrypt compare.

**Pre-save hook:** Hashes `password` with bcrypt (salt rounds: 12) whenever it is modified.

---

### JWT Payload (access and refresh tokens)

Both access and refresh tokens share the same payload structure:

```
{
  id:       string   // user._id.toString()
  email:    string
  role:     UserRole // e.g. "school_admin"
  schoolId: string | undefined
}
```

**Access token:** signed with `JWT_ACCESS_SECRET`, expires in `JWT_ACCESS_EXPIRY` (default `"15m"`).
**Refresh token:** signed with `JWT_REFRESH_SECRET`, expires in `JWT_REFRESH_EXPIRY` (default `"7d"`).

---

### Frontend `User` type (`src/types/index.ts`)

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;          // 'admin' | 'teacher' | 'parent' | 'student' | 'tuckshop' | 'super_admin'
  avatar?: string;
  phone?: string;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

> Note: The backend sends `_id` but the frontend type uses `id`. The `useAuth` hook spreads the raw user object from the API response directly into the store. Either the backend should use a transform (toJSON virtuals) or the hook must manually map `_id → id` before calling `storeLogin`.

---

### Frontend `AuthTokens` type (`src/types/index.ts`)

```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
```

---

## 6. State Management

The auth Zustand store is at `src/stores/useAuthStore.ts`.

### State Shape

```typescript
interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

### Initial State

```typescript
{
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true    // true on init so layouts can gate rendering while hydrating
}
```

### Actions

| Action | Signature | Behaviour |
|--------|-----------|-----------|
| `login` | `(user: User, tokens: AuthTokens) => void` | Writes both tokens to `localStorage`, sets `user`, `tokens`, `isAuthenticated: true`, `isLoading: false` |
| `logout` | `() => void` | Removes both tokens from `localStorage`, resets to null/false state, `isLoading: false` |
| `setUser` | `(user: User) => void` | Replaces user, sets `isAuthenticated: true` |
| `setTokens` | `(tokens: AuthTokens) => void` | Replaces tokens in store (does not write localStorage) |
| `setLoading` | `(loading: boolean) => void` | Updates `isLoading` |
| `hasRole` | `(role: UserRole) => boolean` | Returns `user?.role === role` |

### Token Persistence

Tokens are stored in `localStorage`:
- Key `"accessToken"` — the JWT access token
- Key `"refreshToken"` — the refresh token (see note in Login Flow about undefined value)

Helper functions in `src/lib/auth.ts`:
- `getStoredTokens()` — returns `{ accessToken, refreshToken }` or `null`
- `setStoredTokens(accessToken, refreshToken)` — writes to localStorage
- `clearStoredTokens()` — removes both keys

### Session Hydration (Missing — Needs Implementation)

On app load, `isLoading` starts as `true`. There is currently no hydration logic to restore the user session from localStorage. The app needs an initialisation effect (typically in a root layout or provider) that:

1. Calls `getStoredTokens()`.
2. If tokens exist, calls `GET /api/auth/me` with the stored access token.
3. On success: calls `setUser(user)` + `setTokens(tokens)` + `setLoading(false)`.
4. On 401: triggers the refresh interceptor (which may succeed and retry `/me`) or calls `logout()` + `setLoading(false)`.
5. If no tokens: calls `setLoading(false)`.

Without this, a page refresh always shows the user as unauthenticated until they log in again.

---

## 7. Components Needed

The following reusable components should be created to support the auth module. Place them in `src/components/auth/`.

### `AuthLayout`

Wrapper providing the centered card layout with the gradient background used by all auth pages. Accepts `children`. Avoids repeating the `flex min-h-screen items-center justify-center bg-gradient-to-br from-[#2563EB]/5 via-white to-[#4F46E5]/5 px-4 py-12` pattern.

### `AuthCard`

Standardised card with logo mark (GraduationCap in blue circle), `CardTitle`, and `CardDescription`. Accepts `title`, `description`, and `children` props.

### `LoginForm`

Extract from `/login/page.tsx`. Props: `onSubmit: (data: LoginFormData) => Promise<void>`, `isLoading: boolean`. Renders email field, password field with show/hide toggle, "Forgot password?" link, submit button.

### `ForgotPasswordForm`

Extract from `/forgot-password/page.tsx`. Props: `onSubmit: (data: { email: string }) => Promise<void>`, `isLoading: boolean`. Renders email field and submit button.

### `ResetPasswordForm`

New component for `/reset-password`. Props: `onSubmit: (data: { password: string; confirmPassword: string }) => Promise<void>`, `isLoading: boolean`. Renders new-password and confirm-password fields with show/hide toggles, submit button.

### `PasswordStrengthIndicator` (optional)

Visual indicator for password strength during registration and reset. Checks: min 8 chars, uppercase, digit. Displays coloured bar or checklist.

### `AuthGuard`

HOC or hook that reads `isAuthenticated` and `isLoading` from the store. If loading, renders a full-screen spinner. If not authenticated, redirects to `/login`. Used in the `(dashboard)` layout.

Currently, route protection is handled by the dashboard layout — confirm the exact implementation location and ensure `isLoading: true` prevents a flash of unauthenticated content.

---

## 8. Integration Notes

The access token must be attached to every protected API request. This is handled globally by the Axios interceptor in `src/lib/api-client.ts`:

```
Authorization: Bearer <accessToken from localStorage>
```

The following modules all require an authenticated user (they call `authenticate` middleware on every route):

| Module          | Base path           | Notes |
|-----------------|---------------------|-------|
| School          | `/api/schools`      | School CRUD — admin only |
| Students        | `/api/students`     | Admin, teacher |
| Parents         | `/api/parents`      | Admin |
| Staff           | `/api/staff`        | Admin |
| Wallet          | `/api/wallets`      | Module-guarded (`wallet`) |
| Fees            | `/api/fees`         | Module-guarded (`fee`) |
| Academic        | `/api/academic`     | Module-guarded (`academic`) |
| Homework        | `/api/homework`     | Module-guarded (`homework`) |
| Attendance      | `/api/attendance`   | Module-guarded (`attendance`) |
| Tuck Shop       | `/api/tuck-shop`    | Module-guarded (`tuckshop`) |
| Notifications   | `/api/notifications`| All roles |
| Announcements   | `/api/announcements`| All roles |
| Reports         | `/api/reports`      | Admin |
| Audit           | `/api/audit`        | Admin |
| Events          | `/api/events`       | Module-guarded (`event`) |
| Transport       | `/api/transport`    | Module-guarded (`transport`) |
| After Care      | `/api/after-care`   | Module-guarded (`aftercare`) |
| Sport           | `/api/sports`       | Module-guarded (`sport`) |
| Fundraising     | `/api/fundraising`  | Module-guarded (`fundraising`) |
| Uniform         | `/api/uniforms`     | Module-guarded (`uniform`) |
| Achiever        | `/api/achiever`     | Module-guarded (`achiever`) |
| Consent         | `/api/consent`      | Module-guarded (`consent`) |
| Migration       | `/api/migration`    | Module-guarded (`migration`) |
| Learning        | `/api/learning`     | Module-guarded (`learning`) |
| Lost & Found    | `/api/lost-found`   | Module-guarded (`lost_found`) |
| AI Tools        | `/api/ai-tools`     | Module-guarded (`ai_tools`) |
| Super Admin     | `/api/superadmin`   | `super_admin` role only |

**Module guard:** In addition to authentication, bolt-on module routes check whether the school has that module enabled in their subscription. If not, the request is rejected with 403. The frontend should handle 403 responses gracefully (show an "upgrade required" message rather than a generic error).

**RBAC:** The backend has an `rbac` middleware (`src/middleware/rbac.ts`) for role-based access within routes. The frontend enforces role visibility at the nav level (different nav configs per role in `src/lib/constants.ts`), but should not rely solely on this — server errors will still surface to the user if a wrong-role request is made.

**`schoolId` context:** The JWT payload includes `schoolId`. All school-scoped queries on the backend use this to filter data. If `schoolId` is absent (e.g. for `super_admin`), the super-admin routes handle it separately. The frontend `User` type has `schoolId: string` (non-optional) — ensure that `super_admin` users don't break components that access `user.schoolId`.

---

## 9. Acceptance Criteria

### Login

- [ ] Submitting valid credentials redirects the user to their role-specific dashboard (admin → `/admin`, teacher → `/teacher`, parent → `/parent`, student → `/student`, super_admin → `/superadmin`)
- [ ] `school_admin` role from the API is normalised to `admin` for routing and stored as `admin` in the Zustand store
- [ ] The access token is stored in `localStorage` under key `"accessToken"` after login
- [ ] `toast.success('Welcome back!')` appears on successful login
- [ ] Submitting with an incorrect password shows `toast.error('Invalid email or password')` (or the exact error from the API)
- [ ] Submitting with a deactivated account shows `toast.error('Account is deactivated')`
- [ ] The Submit button is disabled and shows a spinner while the API call is in progress
- [ ] The password field show/hide toggle works correctly
- [ ] Submitting an invalid email format shows the Zod validation error inline before making any API call
- [ ] "Forgot password?" link navigates to `/forgot-password`
- [ ] "Register your school" link navigates to `/register`

### Registration

- [ ] All three form sections render correctly: School Information, Admin Account, School Address
- [ ] Province dropdown is populated with all 9 South African provinces from `SA_PROVINCES`
- [ ] Mismatched passwords show the "Passwords don't match" error on the `confirmPassword` field
- [ ] Successful submission creates the school and admin user on the backend (once wired)
- [ ] Successful submission redirects to `/login` with a success toast
- [ ] "Sign in" link navigates to `/login`

### Forgot Password

- [ ] Submitting a valid email address shows the success state (email icon + confirmation message)
- [ ] The success message reads: "If an account exists with that email, you will receive a password reset link shortly."
- [ ] "Back to login" link in success state navigates to `/login`
- [ ] Submitting an invalid email format shows the inline validation error
- [ ] The API call is made to `POST /api/auth/forgot-password` (once wired)

### Reset Password (new page)

- [ ] Navigating to `/reset-password` without a `token` query parameter redirects to `/forgot-password`
- [ ] Submitting a valid new password with matching confirm calls `POST /api/auth/reset-password` with the token from the URL
- [ ] On success, redirects to `/login` with `toast.success('Password reset successfully. Please sign in.')`
- [ ] On API error (invalid/expired token), shows an error message and a link to request a new reset email

### Token Refresh

- [ ] When any API call returns 401, the interceptor automatically retries using the refresh token cookie
- [ ] On successful refresh, the original failed request is retried transparently with the new access token
- [ ] If refresh also fails (401), the user is redirected to `/login` and local tokens are cleared
- [ ] Refresh only happens once per failed request (`_retry` flag prevents infinite loops)

### Logout

- [ ] Clicking logout removes `accessToken` and `refreshToken` from `localStorage`
- [ ] Clicking logout calls `POST /api/auth/logout` to revoke the server-side session (once implemented)
- [ ] After logout, the user is redirected to `/login`
- [ ] After logout, accessing a protected dashboard route redirects to `/login`

### Session Persistence

- [ ] Refreshing the browser on a dashboard page does not log the user out (session hydration from stored token)
- [ ] If the stored access token is expired but the refresh token (cookie) is valid, the session is silently refreshed on first API call
- [ ] `isLoading: true` prevents a flash of unauthenticated content before hydration completes
