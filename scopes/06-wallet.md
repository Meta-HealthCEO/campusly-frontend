# 06 — Wallet Module

## 1. Module Overview

The Wallet module provides a prepaid, cashless spending system for students. Each student has exactly one wallet (enforced by a unique index on `studentId`). Parents and admins load money onto the wallet; students spend from it at the tuck shop using either the in-app wallet ID or a linked NFC wristband. A configurable daily spending limit controls how much a student may spend in a single calendar day — the backend enforces this at the point of deduction using a real-time aggregate of the day's `PURCHASE` transactions. All balance mutations run inside MongoDB transactions to guarantee atomicity.

Three Mongoose models underpin the module: **Wallet**, **WalletTransaction**, and **Wristband**. All amounts are stored and transmitted in **cents (ZAR)** — the frontend multiplies user-entered rand values by 100 before sending them to the API.

---

## 2. Backend API Endpoints

Base path prefix: `/api/wallets` (assumed — the router is mounted by the application; routes are relative to that mount point).

---

### 2.1 `POST /`

Create a wallet for a student.

**Auth:** Required. Roles: `super_admin`, `school_admin`, `parent`.

**Request body:**

| Field | Type | Validation |
|---|---|---|
| `studentId` | `string` | Required, min length 1 |
| `schoolId` | `string` | Required, min length 1 |
| `dailyLimit` | `integer` | Optional, positive. Defaults to `10000` (R100.00) |
| `currency` | `string` | Optional. Defaults to `"ZAR"` |
| `autoTopUpEnabled` | `boolean` | Optional. Defaults to `false` |
| `autoTopUpAmount` | `integer` | Optional, positive (cents) |
| `autoTopUpThreshold` | `integer` | Optional, positive (cents) |

**Business logic:** Throws `409 Conflict` if a non-deleted wallet already exists for the student.

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "studentId": "663f...",
    "schoolId": "662e...",
    "balance": 0,
    "dailyLimit": 10000,
    "currency": "ZAR",
    "autoTopUpEnabled": false,
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Wallet created successfully"
}
```

**Example request:**
```json
POST /api/wallets
{
  "studentId": "663f1a2b3c4d5e6f7a8b9c0d",
  "schoolId": "662e0f1a2b3c4d5e6f7a8b9c",
  "dailyLimit": 5000
}
```

---

### 2.2 `GET /student/:studentId`

Retrieve the wallet for a given student.

**Auth:** Required. No role restriction — any authenticated user may call this (typically called by the student themselves, their parent, or an admin).

**Path param:** `studentId` — the student's MongoDB `_id`.

**Business logic:** Throws `404 Not Found` if no non-deleted wallet exists for the student.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "studentId": "663f...",
    "schoolId": "662e...",
    "balance": 25000,
    "dailyLimit": 10000,
    "currency": "ZAR",
    "autoTopUpEnabled": false,
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-01-10T07:00:00.000Z",
    "updatedAt": "2026-03-31T09:15:00.000Z"
  }
}
```

---

### 2.3 `POST /:walletId/load`

Add funds to a wallet (top-up).

**Auth:** Required. Roles: `super_admin`, `school_admin`, `parent`.

**Path param:** `walletId` — the wallet's MongoDB `_id`.

**Request body:**

| Field | Type | Validation |
|---|---|---|
| `amount` | `integer` | Required, positive (cents) |
| `description` | `string` | Optional. Defaults to `"Wallet top-up"` |

**Business logic:**
- Uses a MongoDB session/transaction.
- Wallet must exist, not be deleted, and be active — otherwise `404`.
- Increments `balance` atomically using `$inc`.
- Creates a `WalletTransaction` record with `type: "load"`.
- Returns the updated wallet document.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "balance": 35000,
    "dailyLimit": 10000,
    ...
  },
  "message": "Money loaded successfully"
}
```

**Example request:**
```json
POST /api/wallets/664a1b2c3d4e5f6a7b8c9d0e/load
{
  "amount": 10000,
  "description": "Parent top-up"
}
```

---

### 2.4 `POST /:walletId/deduct`

Deduct funds from a wallet (purchase).

**Auth:** Required. Roles: `super_admin`, `school_admin` only. Parents and students cannot call this directly.

**Path param:** `walletId` — the wallet's MongoDB `_id`.

**Request body:**

| Field | Type | Validation |
|---|---|---|
| `amount` | `integer` | Required, positive (cents) |
| `description` | `string` | Required, min length 1 |

**Business logic:**
- Uses a MongoDB session/transaction.
- Wallet must exist, not be deleted, and be active — otherwise `404`.
- Checks `wallet.balance >= amount` — throws `400 Bad Request` with message `"Insufficient funds"` on failure.
- Aggregates today's `PURCHASE` transactions (since midnight) for the wallet to compute `spentToday`. Throws `400 Bad Request` with message `"Daily spending limit exceeded. Limit: {n}, spent today: {n}, requested: {n}"` if `spentToday + amount > wallet.dailyLimit`.
- Decrements `wallet.balance` and saves.
- Creates a `WalletTransaction` record with `type: "purchase"`.
- Returns the updated wallet document.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "balance": 28500,
    ...
  },
  "message": "Money deducted successfully"
}
```

**Example request:**
```json
POST /api/wallets/664a1b2c3d4e5f6a7b8c9d0e/deduct
{
  "amount": 1500,
  "description": "Tuck shop - Chicken roll"
}
```

---

### 2.5 `GET /:walletId/transactions`

Retrieve paginated transaction history for a wallet.

**Auth:** Required. No role restriction.

**Path param:** `walletId` — the wallet's MongoDB `_id`.

**Query params:**

| Param | Type | Default |
|---|---|---|
| `page` | `number` | `1` |
| `limit` | `number` | Determined by `paginationHelper` |

**Business logic:** Returns non-deleted transactions sorted by `createdAt` descending.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "665b2c3d4e5f6a7b8c9d0e1f",
        "walletId": "664a1b2c3d4e5f6a7b8c9d0e",
        "type": "purchase",
        "amount": 1500,
        "description": "Tuck shop - Chicken roll",
        "balanceAfter": 28500,
        "performedBy": "661d...",
        "isDeleted": false,
        "createdAt": "2026-03-31T10:30:00.000Z",
        "updatedAt": "2026-03-31T10:30:00.000Z"
      }
    ],
    "total": 14,
    "page": 1,
    "limit": 20
  }
}
```

---

### 2.6 `POST /wristband/link`

Link a wristband to a student.

**Auth:** Required. Roles: `super_admin`, `school_admin`.

**Request body:**

| Field | Type | Validation |
|---|---|---|
| `wristbandId` | `string` | Required, min length 1 |
| `studentId` | `string` | Required, min length 1 |

**Business logic:**
- Deactivates any currently active wristband already linked to the student (sets `isActive: false`, `deactivatedAt: now`).
- Throws `409 Conflict` if the provided `wristbandId` is already active on a different student.
- Requires the student to already have a wallet — throws `404 Not Found` if not. The wallet's `schoolId` is used to populate the wristband's `schoolId`.
- Creates a new `Wristband` document with `activatedAt: now`.

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "666c3d4e5f6a7b8c9d0e1f2a",
    "wristbandId": "WB-00123",
    "studentId": "663f...",
    "schoolId": "662e...",
    "isActive": true,
    "activatedAt": "2026-03-31T08:00:00.000Z",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Wristband linked successfully"
}
```

**Example request:**
```json
POST /api/wallets/wristband/link
{
  "wristbandId": "WB-00123",
  "studentId": "663f1a2b3c4d5e6f7a8b9c0d"
}
```

---

### 2.7 `POST /wristband/:wristbandId/unlink`

Deactivate a wristband.

**Auth:** Required. Roles: `super_admin`, `school_admin`.

**Path param:** `wristbandId` — the string wristband identifier (e.g. `"WB-00123"`), not the MongoDB `_id`.

**Business logic:** Finds the wristband by `wristbandId` where `isActive: true` and `isDeleted: false`. Sets `isActive: false` and `deactivatedAt: now`. Throws `404 Not Found` if no matching active wristband is found.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "666c3d4e5f6a7b8c9d0e1f2a",
    "wristbandId": "WB-00123",
    "isActive": false,
    "deactivatedAt": "2026-03-31T15:00:00.000Z",
    ...
  },
  "message": "Wristband unlinked successfully"
}
```

---

### 2.8 `PATCH /:walletId/daily-limit`

Update the daily spending limit on a wallet.

**Auth:** Required. Roles: `super_admin`, `school_admin`, `parent`.

**Path param:** `walletId` — the wallet's MongoDB `_id`.

**Request body:**

| Field | Type | Validation |
|---|---|---|
| `dailyLimit` | `integer` | Required, positive (cents) |

**Business logic:** Finds the non-deleted wallet by `_id` and updates `dailyLimit`. Throws `404 Not Found` if not found.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "664a1b2c3d4e5f6a7b8c9d0e",
    "dailyLimit": 5000,
    ...
  },
  "message": "Daily limit updated successfully"
}
```

**Example request:**
```json
PATCH /api/wallets/664a1b2c3d4e5f6a7b8c9d0e/daily-limit
{
  "dailyLimit": 5000
}
```

---

## 3. Frontend Pages

### 3.1 Admin — `/admin/wallet`

**File:** `src/app/(dashboard)/admin/wallet/page.tsx`

A school-wide fleet view for all student wallets. The page fetches the full student list from `GET /students` and maps each student's embedded wallet data into rows for a searchable data table.

**Stat cards (top of page):**
- Total Loaded — sum of all wallet balances (labelled "Total Loaded", though currently calculated the same as Total Balance)
- Total Balance — sum of all wallet balances
- Active Wallets — count of wallets where `isActive === true`

**Data table columns:**
- Student (full name, searchable)
- Wristband ID (currently shows `"-"` as wristband data is not yet joined from a separate endpoint)
- Balance (formatted as ZAR currency)
- Daily Limit (formatted as ZAR currency)
- Status badge — "Active" (emerald) / "Inactive" (red)
- Last Top-up (formatted date, or `"-"` if absent)

**Current limitations:**
- Only students who have a `walletId` field are shown (`filter((s) => s.walletId)`).
- Wristband IDs are not loaded; they display as `"-"`.
- No create-wallet, top-up, or deduct actions are exposed from this page; it is read-only.
- `totalLoaded` and `totalBalance` stat cards are computed from the same value.

---

### 3.2 Parent — `/parent/wallet`

**File:** `src/app/(dashboard)/parent/wallet/page.tsx`

A per-child wallet management view for the logged-in parent. The page identifies the parent by matching `user.id` against the parents list, then fetches each linked child's wallet and transaction history in parallel.

**Stat cards:**
- Total Balance — sum across all children's wallets
- Active Wallets — count of active wallets
- Daily Limit — daily limit of the first child's wallet

**Per-child tab layout** (one tab per child):
- **Balance card:** displays current balance, wristband ID, last top-up date, and a "Load Money" button that opens a dialog.
- **Load Money dialog:** amount field (number, min R10, step R10) plus quick-select preset buttons (R50, R100, R200, R500). On submit, calls `POST /:walletId/load` with `amount * 100` (converting rand to cents). Shows a toast on success/failure. Refreshes the wallet after a successful top-up.
- **Spending Limits card:** reads-only display of `dailyLimit` and `isActive` status badge.
- **Transaction History table:** date, description, type badge (`topup` / `purchase` / `refund`), signed amount (green for positive, red for negative), running balance. Searchable by description. Shows `EmptyState` if no transactions.

---

### 3.3 Student — `/student/wallet`

**File:** `src/app/(dashboard)/student/wallet/page.tsx`

A read-only self-service view for the logged-in student.

**Hero balance card** (blue gradient):
- Available balance (large, prominent)
- Daily limit
- Wristband ID (shown only if linked)

**Tabs:**

**Transaction History tab:**
- Chronological list (newest first) with icon, description, date/time, signed amount, and running balance.
- Icons: `ArrowUpCircle` (topup, emerald), `ArrowDownCircle` (purchase, red), `RotateCcw` (refund, blue).
- Shows `EmptyState` if no transactions.

**Tuck Shop Menu tab:**
- Fetches available items from `GET /tuck-shop/menu`, filtered to `isAvailable === true`.
- Renders item cards in a responsive grid: item name, category badge, price, and allergen badges.
- This is a browse-only view; no ordering capability is wired.

---

## 4. User Flows

### 4.1 Top-Up Wallet (Parent)

1. Parent navigates to `/parent/wallet`.
2. Page loads, fetches parent record, linked children, their wallets, and transaction histories.
3. Parent selects the relevant child's tab.
4. Parent clicks "Load Money".
5. Dialog opens. Parent enters an amount (or taps a preset: R50/R100/R200/R500). Minimum is R10.
6. Parent clicks the "Load R{amount}" button.
7. Frontend sends `POST /wallets/{walletId}/load` with `{ amount: <cents>, description: "Parent top-up" }`.
8. On success: toast notification fires, the specific wallet is re-fetched via `GET /wallets/student/{studentId}`, and the balance card updates.
9. On failure: error toast. Dialog stays open.

### 4.2 Top-Up Wallet (Admin)

Currently no admin top-up form exists in the frontend; admins would need to call the API directly or the top-up flow needs to be added to the admin page. The backend endpoint (`POST /:walletId/load`) permits `school_admin` and `super_admin` roles.

### 4.3 Spend from Wallet (Tuck Shop Purchase)

1. Student arrives at the tuck shop. Staff member uses the tuck shop admin interface (separate module) or a wristband tap initiates the flow.
2. Staff or system calls `POST /wallets/{walletId}/deduct` with the purchase `amount` and `description` (e.g., `"Tuck shop - Chicken roll"`).
3. Backend checks: wallet active, sufficient balance, daily limit not exceeded.
4. On success: balance decremented atomically, a `PURCHASE` transaction recorded.
5. On failure: error returned (`"Insufficient funds"` or `"Daily spending limit exceeded"`). No balance change.
6. Student can view the resulting transaction in `/student/wallet` under Transaction History.

### 4.4 View Transaction History

- **Student:** navigates to `/student/wallet` > "Transaction History" tab. Transactions displayed as a styled list (icon, description, date, amount, running balance).
- **Parent:** navigates to `/parent/wallet` > selects child tab > scrolls to "Transaction History" card. Displayed in a sortable/searchable data table.
- **Admin:** no transaction-level detail view is currently implemented on the admin wallet page.

### 4.5 Link a Wristband

1. Admin navigates to the admin wallet/wristband management screen (not yet implemented as a dedicated page; endpoint exists in backend).
2. Admin calls `POST /wallets/wristband/link` with `{ wristbandId, studentId }`.
3. Backend deactivates any existing wristband for that student, validates the `wristbandId` is not in use, creates a new active `Wristband` record.
4. The linked wristband can then be used at the tuck shop via `getWalletByWristband` (internal service method).

### 4.6 Unlink a Wristband

1. Admin calls `POST /wallets/wristband/{wristbandId}/unlink`.
2. Backend sets `isActive: false` on the wristband.
3. Subsequent tuck shop taps with that wristband will return `404`.

### 4.7 Update Daily Limit

- **Parent or Admin** calls `PATCH /wallets/{walletId}/daily-limit` with `{ dailyLimit: <cents> }`.
- Backend updates the wallet's `dailyLimit` field.
- The new limit takes effect immediately on the next deduct call.
- No frontend form for this currently exists in the parent or admin pages; it needs to be built.

---

## 5. Data Models

### 5.1 Wallet

MongoDB collection: `wallets`

| Field | Type | Default | Notes |
|---|---|---|---|
| `_id` | `ObjectId` | auto | |
| `studentId` | `ObjectId` (ref: Student) | required | Unique index — one wallet per student |
| `schoolId` | `ObjectId` (ref: School) | required | |
| `balance` | `Number` | `0` | Stored in cents (ZAR) |
| `dailyLimit` | `Number` | `10000` | Cents. Default R100.00 |
| `currency` | `String` | `"ZAR"` | |
| `autoTopUpEnabled` | `Boolean` | `false` | Not yet enforced by service logic |
| `autoTopUpAmount` | `Number` | optional | Cents |
| `autoTopUpThreshold` | `Number` | optional | Cents — trigger auto top-up when balance falls below this |
| `isActive` | `Boolean` | `true` | Inactive wallets cannot be loaded or deducted |
| `isDeleted` | `Boolean` | `false` | Soft delete |
| `createdAt` | `Date` | auto | |
| `updatedAt` | `Date` | auto | |

Indexes: `{ studentId: 1 }` (unique), `{ schoolId: 1 }`.

### 5.2 WalletTransaction

MongoDB collection: `wallettransactions`

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | auto |
| `walletId` | `ObjectId` (ref: Wallet) | required |
| `type` | `String` enum | `"load"` \| `"purchase"` \| `"refund"` — from `TransactionType` enum |
| `amount` | `Number` | required, in cents |
| `description` | `String` | required |
| `reference` | `String` | optional, for external payment reference |
| `balanceAfter` | `Number` | required, balance after this transaction in cents |
| `performedBy` | `ObjectId` (ref: User) | required — the user who triggered the transaction |
| `isDeleted` | `Boolean` | `false` |
| `createdAt` | `Date` | auto |
| `updatedAt` | `Date` | auto |

Index: `{ walletId: 1, createdAt: -1 }` — optimises paginated transaction history queries.

### 5.3 Wristband

MongoDB collection: `wristbands`

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | auto |
| `wristbandId` | `String` | required, unique — the physical NFC/barcode identifier |
| `studentId` | `ObjectId` (ref: Student) | required |
| `schoolId` | `ObjectId` (ref: School) | required |
| `isActive` | `Boolean` | `true` — only one active wristband per student enforced by `linkWristband` logic |
| `activatedAt` | `Date` | required |
| `deactivatedAt` | `Date` | optional — set when unlinked |
| `isDeleted` | `Boolean` | `false` |
| `createdAt` | `Date` | auto |
| `updatedAt` | `Date` | auto |

Indexes: `{ wristbandId: 1 }` (unique), `{ studentId: 1 }`.

### 5.4 Frontend TypeScript Interfaces

Defined in `src/types/index.ts`:

```ts
interface Wallet {
  id: string;
  studentId: string;
  balance: number;       // cents
  wristbandId?: string;
  dailyLimit: number;    // cents
  isActive: boolean;
  lastTopUp?: string;
}

interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'topup' | 'purchase' | 'refund';
  amount: number;        // cents
  balance: number;       // cents (running balance after this transaction)
  description: string;
  reference?: string;
  createdAt: string;
}
```

Note: The frontend `type` values (`'topup'`, `'purchase'`, `'refund'`) differ in casing/naming from the backend enum values (`'load'`, `'purchase'`, `'refund'`). The backend uses `'load'`; the frontend type definition and UI label it as `'topup'`. This mismatch must be reconciled — either normalise the type string on the frontend after fetching, or align the frontend type to `'load' | 'purchase' | 'refund'`.

---

## 6. State Management

No dedicated wallet Zustand store exists yet. The three wallet pages currently manage all wallet state with local `useState` hooks and `useEffect` calls that fetch data on mount. This is sufficient for the current read-heavy pages but will become unwieldy as more interactions are added (e.g. admin top-up forms, daily limit editing, wristband management).

A `useWalletStore` should be created with the following shape:

```ts
interface WalletState {
  // Data
  wallets: Wallet[];
  transactions: Record<string, WalletTransaction[]>; // keyed by walletId
  wristbands: Wristband[];

  // Loading / error
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWalletByStudent: (studentId: string) => Promise<void>;
  fetchAllWallets: () => Promise<void>;           // admin use
  fetchTransactions: (walletId: string, page?: number) => Promise<void>;
  loadMoney: (walletId: string, amount: number, description?: string) => Promise<void>;
  deductMoney: (walletId: string, amount: number, description: string) => Promise<void>;
  updateDailyLimit: (walletId: string, dailyLimit: number) => Promise<void>;
  linkWristband: (wristbandId: string, studentId: string) => Promise<void>;
  unlinkWristband: (wristbandId: string) => Promise<void>;
  clearError: () => void;
}
```

Until the store is built, the existing `useState` + `useEffect` pattern in each page remains the active approach. `useAuthStore` is used on the parent and student pages to resolve `user.id` before fetching.

---

## 7. Components Needed

The components below are either already partially in use or need to be built to complete the wallet module.

### 7.1 Existing (Shared, Already Used)

- **`PageHeader`** — title + description bar at the top of each page.
- **`StatCard`** — icon + value + title card for the summary row.
- **`DataTable`** — sortable, searchable generic table used on admin and parent pages.
- **`EmptyState`** — empty-list placeholder used on parent and student pages.
- **`Badge`** — status/type labels.

### 7.2 To Be Built

**`WalletBalanceCard`**
- Props: `wallet: Wallet`, `studentName?: string`, `onTopUp?: () => void`
- Displays balance, daily limit, wristband ID, last top-up date.
- Optional "Load Money" trigger button.
- Used on parent page (already partially inlined as JSX; should be extracted).

**`TopUpDialog`**
- Props: `walletId: string`, `studentName: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`, `onSuccess: (wallet: Wallet) => void`
- Contains amount input, min R10 / step R10, four preset buttons (R50, R100, R200, R500).
- Validates on submit, converts to cents, calls `POST /:walletId/load`.
- Shows loading state on the submit button.
- Currently inlined in the parent page; should be extracted.

**`TransactionList`**
- Props: `transactions: WalletTransaction[]`
- Renders the icon-based transaction feed used on the student page.
- Each row: icon (coloured by type), description, date, signed amount, running balance.
- Should be shared between student and parent views (currently the parent uses `DataTable` with columns and the student has a custom `div`-based list).

**`DailyLimitEditor`**
- Props: `walletId: string`, `currentLimit: number`, `onSuccess: (wallet: Wallet) => void`
- Inline editable field or small form + confirm button.
- Calls `PATCH /:walletId/daily-limit`.
- Needed on both the admin and parent pages.

**`WristbandManager`** (Admin only)
- Props: `studentId: string`, `currentWristbandId?: string`
- Displays active wristband ID.
- "Link Wristband" form: text input for `wristbandId`, submit calls `POST /wristband/link`.
- "Unlink" button calls `POST /wristband/{wristbandId}/unlink`.
- Needed on the admin wallet page and possibly on a student detail page.

**`WalletAdminActions`** (Admin only)
- Wraps top-up and manual deduct forms for use by school admins.
- Calls `POST /:walletId/load` or `POST /:walletId/deduct` depending on action type.
- The deduct form must include a required description field.

---

## 8. Integration Notes

### 8.1 TuckShop Module

The TuckShop is the primary consumer of the deduct endpoint. When a student purchases items:
- The TuckShop service (or controller) calls `WalletService.deductMoney` (or its HTTP equivalent) with the order total and a description such as `"Tuck shop order #123"`.
- The `TuckshopOrder` model stores a `walletTransactionId` linking back to the resulting `WalletTransaction`.
- The student wallet page already fetches `GET /tuck-shop/menu` alongside the wallet to show the menu browse tab, indicating the two modules are visually coupled on the student portal.
- `PaymentMethod.WRISTBAND` and `PaymentMethod.WALLET` in the shared enums both route through the wallet deduct flow; the tuck shop uses `getWalletByWristband` (internal `WalletService` method) to resolve a wristband tap to a wallet before deducting.

### 8.2 Fees Module

- `PaymentMethod.WALLET` exists in the enums, suggesting fee invoice payments can be settled from the wallet balance.
- The fee payment flow (invoice settlement) is likely to call the deduct endpoint with `type: PURCHASE` and a reference to the invoice ID.
- The `WalletTransaction.reference` field is available for storing the invoice or order ID.
- This integration needs to be confirmed when the Fees module is scoped.

### 8.3 Student Module

- The `Student` model includes optional `walletId` and `wallet` fields, allowing wallet data to be embedded when listing students (as used by the admin wallet page).
- Creating a student does not automatically create a wallet; `POST /wallets` must be called separately (or as part of an onboarding flow).

### 8.4 Authentication and Authorisation

- All eight endpoints require a valid JWT (`authenticate` middleware).
- Role-based restrictions:
  - **Create wallet / Load money / Update daily limit:** `super_admin`, `school_admin`, `parent`
  - **Deduct money / Link wristband / Unlink wristband:** `super_admin`, `school_admin` only
  - **Get wallet / Get transactions:** any authenticated role
- The `performedBy` field on every transaction is populated from `req.user.id`, providing a full audit trail.

### 8.5 Currency and Amount Handling

- All monetary values are stored and transmitted in **integer cents (ZAR)**.
- The parent page enforces a minimum top-up of R10 (`parseFloat(loadAmount) < 10`) and converts to cents via `Math.round(amount * 100)` before posting.
- `formatCurrency` from `@/lib/utils` is used consistently across all three pages to render cent values as formatted rand strings (e.g. `10000` → `"R100.00"`).
- The backend validation enforces `z.int().positive()` on all amount fields — floating-point cent values will fail validation.

### 8.6 Auto Top-Up (Not Yet Implemented)

The `Wallet` model includes `autoTopUpEnabled`, `autoTopUpAmount`, and `autoTopUpThreshold` fields. As of the current backend service, no logic exists that acts on these fields automatically (e.g. no scheduled job or trigger on low balance). The fields are stored but dormant; this is a future feature.

---

## 9. Acceptance Criteria

### 9.1 Wallet Creation

- [ ] A wallet can be created for a student by a `super_admin`, `school_admin`, or `parent`.
- [ ] Creating a second wallet for the same student returns `409 Conflict`.
- [ ] Default `dailyLimit` is `10000` cents (R100.00) if not provided.
- [ ] Default `currency` is `"ZAR"`.
- [ ] Default `balance` is `0`.

### 9.2 Load Money

- [ ] `super_admin`, `school_admin`, and `parent` can load funds.
- [ ] Attempting to load into an inactive or deleted wallet returns `404`.
- [ ] `amount` must be a positive integer (cents); non-integers and zero amounts are rejected.
- [ ] `description` defaults to `"Wallet top-up"` if not provided.
- [ ] A `WalletTransaction` with `type: "load"` is created atomically alongside the balance increment.
- [ ] The updated `balance` is returned in the response.
- [ ] On the parent portal, the minimum top-up amount is R10 (enforced in the UI).
- [ ] On the parent portal, preset buttons (R50, R100, R200, R500) populate the amount field correctly.
- [ ] A success toast is shown after a successful top-up and the balance card reflects the new value without a full page reload.

### 9.3 Deduct Money

- [ ] Only `super_admin` and `school_admin` may call the deduct endpoint; `parent` and `student` receive `403`.
- [ ] Deducting more than the current balance returns `400` with message `"Insufficient funds"`.
- [ ] Deducting an amount that would push today's `PURCHASE` total above `dailyLimit` returns `400` with a message quoting the limit, spent-today, and requested amounts.
- [ ] `description` is required; omitting it returns a validation error.
- [ ] A `WalletTransaction` with `type: "purchase"` is created atomically.
- [ ] `balanceAfter` on the transaction matches the wallet's new `balance`.

### 9.4 Transaction History

- [ ] Transactions are returned sorted newest-first.
- [ ] Soft-deleted transactions (`isDeleted: true`) are excluded from results.
- [ ] Pagination works: `page` and `limit` query params control the slice; `total` in the response reflects the unfiltered count.
- [ ] A wallet with no transactions returns an empty `transactions` array (not a `404`).
- [ ] The student portal renders a transaction list with correct icons and colours by type.
- [ ] The parent portal renders transactions in a searchable data table.

### 9.5 Daily Limit

- [ ] `super_admin`, `school_admin`, and `parent` can update the daily limit.
- [ ] `dailyLimit` must be a positive integer (cents).
- [ ] The new limit is enforced immediately on the next deduct call.
- [ ] The parent portal shows the current `dailyLimit` in a read-only "Spending Limits" card.

### 9.6 Wristband

- [ ] Linking a wristband automatically deactivates any previously active wristband for that student.
- [ ] Attempting to link a `wristbandId` already active on another student returns `409 Conflict`.
- [ ] Linking a wristband to a student with no wallet returns `404`.
- [ ] Unlinking a wristband sets `isActive: false` and records `deactivatedAt`.
- [ ] Attempting to unlink a wristband that is not active returns `404`.
- [ ] The student portal displays the linked wristband ID in the balance hero card when one is linked.

### 9.7 Admin Wallet Page

- [ ] The admin wallet page shows all students who have an associated wallet.
- [ ] Each row displays student name, wristband ID, balance, daily limit, status, and last top-up date.
- [ ] The three stat cards (Total Loaded, Total Balance, Active Wallets) aggregate correctly from the loaded data.
- [ ] The table is searchable by student name.

### 9.8 Parent Wallet Page

- [ ] The parent wallet page shows only the wallets belonging to the logged-in parent's children.
- [ ] Each child has its own tab.
- [ ] The top-up dialog is accessible per child.
- [ ] The spending limits card displays correctly.
- [ ] The transaction history table is visible per child, with an empty state when there are no transactions.

### 9.9 Student Wallet Page

- [ ] The student wallet page shows only the logged-in student's wallet.
- [ ] The balance hero card displays current balance, daily limit, and wristband ID (if linked).
- [ ] The transaction history tab renders a list of all transactions with icons, descriptions, amounts, and running balances.
- [ ] The Tuck Shop Menu tab shows only items where `isAvailable === true`, with price and allergen information.
- [ ] An empty state is shown when there are no transactions.

### 9.10 Error and Edge Cases

- [ ] All pages handle API errors gracefully (no unhandled exceptions; console errors are acceptable for the current implementation but toast notifications are preferred).
- [ ] A student with no wallet (no wallet record exists) causes the student and parent wallet pages to show an appropriate empty/error state rather than crashing.
- [ ] `formatCurrency` is used for all monetary display — no raw cent values are shown to users.
- [ ] The frontend correctly converts rand input values to cents before sending to the API (`Math.round(amount * 100)`).
