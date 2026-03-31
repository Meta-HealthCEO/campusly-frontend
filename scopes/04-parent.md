# 04 — Parent Module

## 1. Module Overview

The Parent module manages the relationship between adult caregivers and enrolled students within a school. A `Parent` record is a profile layer that sits on top of a `User` account and links one or more `Student` records to that account. The module drives the parent-facing portal, which surfaces read-only views of each child's academic performance, attendance, fees, wallet, library borrowings, tuckshop spend, transport, consent forms, school events, messages, and lost-and-found — and provides actionable write operations (wallet top-ups, fee payments, consent signing, lost-item reporting).

**Roles involved**

| Role | Capabilities |
|---|---|
| `super_admin` | Full CRUD on parent records; link/unlink children |
| `school_admin` | Full CRUD on parent records; link/unlink children |
| Any authenticated user | Read own parent record by ID |
| `parent` (portal user) | Access all read/write operations in the parent portal for their own children |

---

## 2. Backend API Endpoints

All routes are mounted under the prefix `/parents` (e.g. `POST /parents`).

---

### 2.1 Create Parent

**`POST /parents`**

Creates a new parent profile and associates it with an existing user account.

**Auth required:** `super_admin`, `school_admin`

**Request body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `userId` | string | Yes | 24-char hex ObjectId |
| `schoolId` | string | Yes | 24-char hex ObjectId |
| `relationship` | string | Yes | `"mother"` \| `"father"` \| `"guardian"` \| `"other"` |
| `childrenIds` | string[] | No | Array of 24-char hex ObjectIds |
| `occupation` | string | No | Trimmed string |
| `employer` | string | No | Trimmed string |
| `workPhone` | string | No | Trimmed string |
| `alternativeEmail` | string | No | Valid email format |
| `communicationPreference` | string | No | `"email"` \| `"sms"` \| `"whatsapp"` \| `"push"` |
| `isMainCaregiver` | boolean | No | — |

**Example request body**

```json
{
  "userId": "64a1f2c3b4e5f6a7b8c9d0e1",
  "schoolId": "64a1f2c3b4e5f6a7b8c9d0e2",
  "relationship": "mother",
  "occupation": "Accountant",
  "employer": "KPMG",
  "workPhone": "011 555 0123",
  "alternativeEmail": "jane.doe.work@example.com",
  "communicationPreference": "email",
  "isMainCaregiver": true
}
```

**Response `201 Created`**

```json
{
  "success": true,
  "data": {
    "_id": "64b2a3d4c5e6f7a8b9c0d1e2",
    "userId": "64a1f2c3b4e5f6a7b8c9d0e1",
    "schoolId": "64a1f2c3b4e5f6a7b8c9d0e2",
    "childrenIds": [],
    "relationship": "mother",
    "occupation": "Accountant",
    "employer": "KPMG",
    "workPhone": "011 555 0123",
    "alternativeEmail": "jane.doe.work@example.com",
    "communicationPreference": "email",
    "isMainCaregiver": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Parent created successfully"
}
```

---

### 2.2 List Parents

**`GET /parents`**

Returns a paginated list of all non-deleted parents for a school. Populates the linked `User` (firstName, lastName, email, phone) and each child's `Student` record with its nested `User` fields.

**Auth required:** `super_admin`, `school_admin`

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `schoolId` | string | `req.user.schoolId` | Overrides the authenticated user's school |
| `page` | number | `PAGINATION_DEFAULTS.page` | Page number (min 1) |
| `limit` | number | `PAGINATION_DEFAULTS.limit` | Page size (capped at `PAGINATION_DEFAULTS.maxLimit`) |
| `sort` | string | `"-createdAt"` | Mongoose sort string |
| `search` | string | — | Not yet applied server-side (reserved) |

**Example response `200 OK`**

```json
{
  "success": true,
  "data": {
    "parents": [
      {
        "_id": "64b2a3d4c5e6f7a8b9c0d1e2",
        "userId": {
          "_id": "64a1f2c3b4e5f6a7b8c9d0e1",
          "firstName": "Jane",
          "lastName": "Doe",
          "email": "jane.doe@example.com",
          "phone": "082 123 4567"
        },
        "schoolId": "64a1f2c3b4e5f6a7b8c9d0e2",
        "childrenIds": [
          {
            "_id": "64c3b4e5f6a7b8c9d0e1f2a3",
            "userId": {
              "_id": "64c3b4e5f6a7b8c9d0e1f2a4",
              "firstName": "Tom",
              "lastName": "Doe",
              "email": "tom.doe@school.ac.za"
            }
          }
        ],
        "relationship": "mother",
        "communicationPreference": "email",
        "isMainCaregiver": true,
        "isDeleted": false,
        "createdAt": "2026-03-31T08:00:00.000Z",
        "updatedAt": "2026-03-31T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Parents retrieved successfully"
}
```

---

### 2.3 Get Parent by ID

**`GET /parents/:id`**

Returns a single non-deleted parent record, fully populated. Populates the `User` with `profileImage`.

**Auth required:** Any authenticated user

**Path parameter:** `id` — 24-char hex ObjectId of the parent record

**Example response `200 OK`**

```json
{
  "success": true,
  "data": {
    "_id": "64b2a3d4c5e6f7a8b9c0d1e2",
    "userId": {
      "_id": "64a1f2c3b4e5f6a7b8c9d0e1",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane.doe@example.com",
      "phone": "082 123 4567",
      "profileImage": "https://cdn.example.com/avatars/jane.jpg"
    },
    "schoolId": "64a1f2c3b4e5f6a7b8c9d0e2",
    "childrenIds": [
      {
        "_id": "64c3b4e5f6a7b8c9d0e1f2a3",
        "userId": {
          "_id": "64c3b4e5f6a7b8c9d0e1f2a4",
          "firstName": "Tom",
          "lastName": "Doe",
          "email": "tom.doe@school.ac.za",
          "phone": null
        }
      }
    ],
    "relationship": "mother",
    "occupation": "Accountant",
    "employer": "KPMG",
    "workPhone": "011 555 0123",
    "alternativeEmail": "jane.doe.work@example.com",
    "communicationPreference": "email",
    "isMainCaregiver": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Parent retrieved successfully"
}
```

**Error `404 Not Found`** (parent not found or soft-deleted)

```json
{
  "success": false,
  "error": "Parent not found"
}
```

---

### 2.4 Update Parent

**`PUT /parents/:id`**

Partially updates any fields on the parent record. All fields from `createParentSchema` are optional (`updateParentSchema = createParentSchema.partial()`).

**Auth required:** `super_admin`, `school_admin`

**Path parameter:** `id` — 24-char hex ObjectId

**Request body** — any subset of create fields, e.g.:

```json
{
  "communicationPreference": "whatsapp",
  "isMainCaregiver": false,
  "workPhone": "082 999 8888"
}
```

**Response `200 OK`** — returns the updated, fully-populated parent document (same shape as Get by ID).

```json
{
  "success": true,
  "data": { "...updated parent document..." },
  "message": "Parent updated successfully"
}
```

---

### 2.5 Delete Parent (Soft Delete)

**`DELETE /parents/:id`**

Soft-deletes a parent by setting `isDeleted: true`. The record is retained in the database but excluded from all list/get queries.

**Auth required:** `super_admin`, `school_admin`

**Path parameter:** `id` — 24-char hex ObjectId

**Response `200 OK`**

```json
{
  "success": true,
  "data": undefined,
  "message": "Parent deleted successfully"
}
```

---

### 2.6 Link Child

**`POST /parents/:id/link-child`**

Adds a student to the parent's `childrenIds` array (via `$addToSet`). Simultaneously adds the parent to the student's `guardianIds` array. Both records are validated to exist and not be soft-deleted before the update.

**Auth required:** `super_admin`, `school_admin`

**Path parameter:** `id` — parent ObjectId

**Request body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `childId` | string | Yes | 24-char hex ObjectId of the Student record |

```json
{
  "childId": "64c3b4e5f6a7b8c9d0e1f2a3"
}
```

**Response `200 OK`** — returns the fully-populated parent document after linking.

```json
{
  "success": true,
  "data": {
    "_id": "64b2a3d4c5e6f7a8b9c0d1e2",
    "childrenIds": [
      {
        "_id": "64c3b4e5f6a7b8c9d0e1f2a3",
        "userId": { "firstName": "Tom", "lastName": "Doe", "email": "tom.doe@school.ac.za", "phone": null }
      }
    ],
    "...other parent fields..."
  },
  "message": "Child linked successfully"
}
```

**Error `404 Not Found`** — if parent or student is not found/is deleted.

---

### 2.7 Unlink Child

**`POST /parents/:id/unlink-child`**

Removes a student from the parent's `childrenIds` array (via `$pull`). Simultaneously removes the parent from the student's `guardianIds`. Both records must exist and not be soft-deleted.

**Auth required:** `super_admin`, `school_admin`

**Path parameter:** `id` — parent ObjectId

**Request body** — identical shape to link-child:

```json
{
  "childId": "64c3b4e5f6a7b8c9d0e1f2a3"
}
```

**Response `200 OK`** — returns the fully-populated parent document after unlinking.

```json
{
  "success": true,
  "data": {
    "_id": "64b2a3d4c5e6f7a8b9c0d1e2",
    "childrenIds": [],
    "...other parent fields..."
  },
  "message": "Child unlinked successfully"
}
```

---

## 3. Frontend Pages

All parent portal pages live under the route segment `/parent/` and are nested inside the `(dashboard)` layout group.

---

### 3.1 Parent Dashboard

**Route:** `/parent`
**File:** `src/app/(dashboard)/parent/page.tsx`

**Displays**

- `PageHeader` — "Parent Dashboard"
- Four `StatCard` components: Children Enrolled, Total Wallet Balance (combined), Outstanding Fees (combined), Unread Notifications count
- "My Children" section — one `Card` per child showing avatar initials, name, grade/class, admission number badge, and three inline stats (wallet balance, next unpaid invoice balance + due date, average grade %)
- "Quick Actions" card — `Link` buttons to `/parent/fees`, `/parent/wallet`, `/parent/academics`, `/parent/attendance`, `/parent/library`
- "Recent Notifications" card — up to 5 notifications with type badge (info/success/warning/error) and relative timestamp

**Data source (current state):** mock data (`mockStudents`, `mockWallets`, `mockInvoices`, `mockNotifications`, `mockStudentGrades`)

**API endpoints called:** None currently (mock only — to be wired)

---

### 3.2 Fee Management

**Route:** `/parent/fees`
**File:** `src/app/(dashboard)/parent/fees/page.tsx`

**Displays**

- `PageHeader` — "Fee Management"
- Four `StatCard` components: Outstanding Balance, Total Paid (completed payments), Invoices count, Overdue count
- Invoices `DataTable` — columns: Invoice No., Student name, Description (item descriptions joined), Amount, Paid, Balance (red if > 0), Status badge, Due Date, "Pay Now" action button (only when balance > 0 and not cancelled)
- Payment History `DataTable` — columns: Date, Reference (monospace), Method badge, Amount (green), Status badge

**Forms / Dialogs**

`PayDialog` — opens when "Pay Now" is clicked on an invoice row:
  - Shows invoice total, already paid, and balance due
  - Number input for payment amount (ZAR, min 1 cent, max = balance due)
  - "Pay" button (disabled if amount invalid)

**API endpoints called**

- `GET /fees/invoices/school/:schoolId` — fetch all invoices for the school (scoped by `user.schoolId` from auth store)
- `GET /fees/payments/:invoiceId` — called for each invoice to collect payment history

---

### 3.3 Wallet Management

**Route:** `/parent/wallet`
**File:** `src/app/(dashboard)/parent/wallet/page.tsx`

**Displays**

- `PageHeader` — "Wallet Management"
- Three `StatCard` components: Total Balance (combined), Active Wallets count, Daily Limit (first child's wallet)
- `Tabs` — one tab per child
  - Per-child: Current Balance hero display, wristband ID, last top-up date, "Load Money" button
  - Spending Limits card — Daily Limit and Wallet Status (active/inactive)
  - Transaction History `DataTable` — columns: Date, Description, Type badge (topup/purchase/refund), Amount (+/- coloured), running Balance

**Forms / Dialogs**

Load Money `Dialog` (per child):
  - Number input for amount (ZAR, min R10, step R10)
  - Preset buttons: R50, R100, R200, R500
  - "Load" confirm button

**API endpoints called**

- `GET /parents` — to find the authenticated parent's record
- `GET /students` — to resolve the parent's child list
- `GET /wallets/student/:studentId` — per child, to get wallet record
- `GET /wallets/:walletId/transactions` — per wallet, to get transaction history
- `POST /wallets/:walletId/load` — to top up a wallet (`{ amount: number (cents), description: string }`)

---

### 3.4 Academic Overview

**Route:** `/parent/academics`
**File:** `src/app/(dashboard)/parent/academics/page.tsx`

**Displays**

- `PageHeader` — "Academic Overview"
- `Tabs` — one tab per child
  - Overall Average card — shows percentage, grade/class
  - Subject Performance grid — one `Card` per subject showing average %, latest %, trend icon (TrendingUp/Down/Minus), and a progress bar coloured by pass/fail bracket
  - Assessment Results `DataTable` — columns: Assessment name, Subject, Type badge (test/exam/assignment/project/quiz), Marks fraction, Percentage (colour-coded), Date
  - Homework `DataTable` — columns: Title, Subject, Due Date, Status badge (published/closed/draft)

**API endpoints called:** None currently (mock data — `mockStudentGrades`, `mockHomework` — to be wired)

---

### 3.5 Attendance

**Route:** `/parent/attendance`
**File:** `src/app/(dashboard)/parent/attendance/page.tsx`

**Displays**

- `PageHeader` — "Attendance"
- `Tabs` — one tab per child
  - Five `StatCard` components: Total Days, Present (+ rate %), Absent, Late, Attendance Rate (with descriptor: Excellent/Good/Needs improvement)
  - Monthly calendar heatmap — 7-column grid for a fixed month (currently March 2025); cells coloured by status (present=emerald, absent=red, late=amber, excused=blue); weekends shown as muted
  - Legend for status codes (P/A/L/E)
  - Attendance Records `DataTable` — columns: Date (EEEE format), Status badge, Period or "Full Day", Note

**API endpoints called:** None currently (mock data — `mockAttendance` — to be wired)

---

### 3.6 Communication (Messages)

**Route:** `/parent/communication`
**File:** `src/app/(dashboard)/parent/communication/page.tsx`

**Displays**

- `PageHeader` — "Messages"
- Three summary count cards: Total Messages, Unread count, Urgent count
- Inbox list — each message row shows: read/unread mail icon, subject (bold if unread), priority badge (low/normal/high/urgent), type badge (message/announcement/alert with icon), sender name, body preview, relative date
- Clicking a message row opens a read-only `Dialog` showing full subject, priority badge, sender, date, body (whitespace-preserved), and attachments list

**API endpoints called:** None currently (mock data — `mockMessages` — to be wired)

---

### 3.7 Consent Forms

**Route:** `/parent/consent`
**File:** `src/app/(dashboard)/parent/consent/page.tsx`

**Displays**

- `PageHeader` — "Consent Forms"
- Three summary count cards: Pending, Signed, Declined
- "Pending Consent Forms" section — one `Card` per pending form with title, description, due date
  - "Decline" button (red outlined) and "Sign" button per form
- "Completed Forms" section — compact rows showing status icon, title, description, status badge, and sign date

**Actions**

- Sign: updates form status to `"signed"` and sets `signedAt` to current timestamp (currently client-side state only — to be wired to Consent API)
- Decline: updates form status to `"declined"` (client-side only — to be wired)

**API endpoints called:** None currently (mock data — `mockConsentForms` — to be wired)

---

### 3.8 School Events

**Route:** `/parent/events`
**File:** `src/app/(dashboard)/parent/events/page.tsx`

**Displays**

- `PageHeader` — "School Events"
- Events grid (2 columns on md+) — one `Card` per event with a colour-coded top stripe by type (academic/sports/cultural/social/meeting), title, description, type badge, date, time or "All Day", location, max attendees, "Consent Required" badge if applicable, ticket price
  - "Buy Ticket" button on events with `ticketPrice`

**Forms / Dialogs**

Ticket Purchase `Dialog`:
  - Shows event title, date, location
  - Displays ticket price
  - "Confirm Purchase" button (currently closes dialog — to be wired to payment API)

**API endpoints called:** None currently (mock data — `mockEvents` — to be wired)

---

### 3.9 Library

**Route:** `/parent/library`
**File:** `src/app/(dashboard)/parent/library/page.tsx`

**Displays**

- `PageHeader` — "Library"
- Three `StatCard` components: Currently Borrowed (combined), Overdue Books (combined), Books Returned (combined)
- Overdue alert banner (red) shown when `totalOverdue > 0`
- `Tabs` — one tab per child
  - Currently Borrowed/Overdue grid cards — each card shows book icon (red if overdue), title, author, category, borrowed date, due date (red if overdue), status badge
  - Reading History `DataTable` — columns: Title + Author, Category badge, Borrowed date, Due Date (red if overdue), Returned date or "–", Status badge

**API endpoints called:** None currently (mock data — `mockBorrowings`, `mockBooks` — to be wired)

---

### 3.10 Lost & Found

**Route:** `/parent/lost-found`
**File:** `src/app/(dashboard)/parent/lost-found/page.tsx`

**Displays**

- `PageHeader` — "Lost & Found" with "Report Lost Item" button
- Match notification banner (blue) shown when any lost report has status `"matched"`
- My Lost Reports `DataTable` — columns: Item name, Category badge, Child name, Location, Date Lost, Status badge (open/matched/resolved/closed)
- Browse Found Items section with:
  - Category filter `Select` (all / clothing / stationery / lunch_box / electronics / sports / bags / other)
  - Gallery / List view toggle
  - Gallery view: photo card grid with name, description, category badge, location, date found, "This is mine!" claim button (if unclaimed)
  - List view: `DataTable` with same columns plus claim action

**Forms / Dialogs**

Report Lost Item `Dialog` (react-hook-form + zod validation — `lostReportSchema`):
  - Child `Select` (from parent's children list)
  - Item Name `Input`
  - Description `Textarea`
  - Category `Select` (7 options)
  - Date Lost `Input[type=date]`
  - Location `Input`

Claim Item `Dialog` (per found item):
  - Shows item name, location, date found
  - "Confirm Claim" submits claim with `toast.success` notification

**API endpoints called:** None currently (mock data — to be wired to LostFound API)

---

### 3.11 Transport

**Route:** `/parent/transport`
**File:** `src/app/(dashboard)/parent/transport/page.tsx`

**Displays**

- `PageHeader` — "Transport"
- Child route assignment cards (one per child) — shows avatar initials, name, grade/class, and assigned route badge (or "No Route")
- Route Detail cards (one per unique route used by this parent's children):
  - Route name, description, active/inactive badge
  - Driver Information panel: name, phone (tel: link)
  - Vehicle Information panel: registration number, student count on route
  - Stops Timeline — ordered list of stops with stop name, address, time; connected by a vertical line; last stop uses filled circle
  - Footer line listing which of the parent's children are on this route

**API endpoints called:** None currently (mock data — `mockTransportRoutes` — to be wired)

---

### 3.12 Tuckshop

**Route:** `/parent/tuckshop`
**File:** `src/app/(dashboard)/parent/tuckshop/page.tsx`

**Displays**

- `PageHeader` — "Tuckshop"
- Three `StatCard` components: Total Spent (combined, this month), Total Orders (combined), Allergen Alerts (count of children with recorded allergies)
- `Tabs` — one tab per child
  - Allergen Information card — shows allergy badges (red) from `child.medicalInfo.allergies`, or "No known allergies" message
  - Spending Summary card — large spend total + order count
  - Recent Orders — detailed order cards (date, item list with quantities and line prices) followed by a `DataTable` (Date, Items summary, Total, Item Count badge)

**API endpoints called:** None currently (mock data — `mockTuckshopOrders` — to be wired)

---

## 4. User Flows

### 4.1 Creating a Parent Account (Admin)

1. Admin navigates to the admin staff/parents management area.
2. Admin clicks "Add Parent" and submits the create form (which calls `POST /parents`).
3. The form requires selecting an existing `User` account (`userId`) and the school (`schoolId`), plus the relationship type.
4. On success, the new parent profile appears in the parents list.

### 4.2 Linking a Parent to a Student (Admin)

1. Admin opens an existing parent record.
2. Admin clicks "Link Child" and selects a student from a student picker.
3. The UI calls `POST /parents/:id/link-child` with `{ childId }`.
4. The service atomically adds `childId` to `parent.childrenIds` and adds `parentId` to `student.guardianIds`.
5. The updated parent record (with populated children) is returned and reflected in the UI.
6. To remove the link, admin clicks "Unlink Child", which calls `POST /parents/:id/unlink-child`.

### 4.3 Parent Portal Navigation

1. Parent logs in; `useAuthStore` stores the authenticated `User` and tokens.
2. The dashboard layout detects `role === "parent"` and renders the parent sidebar with links to all portal sections.
3. The dashboard (`/parent`) auto-fetches the parent's children and displays summary stats.
4. The parent uses the Quick Actions card or the sidebar to navigate to Fees, Wallet, Academics, Attendance, etc.

### 4.4 Loading a Child's Wallet

1. Parent navigates to `/parent/wallet`.
2. The page fetches the parent record via `GET /parents`, then fetches each child's wallet via `GET /wallets/student/:studentId`.
3. Parent selects the appropriate child tab and clicks "Load Money".
4. In the dialog, parent enters an amount (≥ R10) or clicks a preset (R50/R100/R200/R500).
5. On confirm, the page calls `POST /wallets/:walletId/load` with `{ amount: <cents>, description: "Parent top-up" }`.
6. On success a `toast.success` is shown and the wallet balance is refreshed.

### 4.5 Paying a Fee Invoice

1. Parent navigates to `/parent/fees`.
2. The page fetches all school invoices via `GET /fees/invoices/school/:schoolId` and their payment histories.
3. For any invoice with `balanceDue > 0` and status not `"cancelled"`, a "Pay Now" button is shown.
4. Parent clicks "Pay Now", sees the PayDialog with total/paid/balance breakdown.
5. Parent adjusts the amount and confirms — the payment call is wired to the Fee API (to be completed).

### 4.6 Signing a Consent Form

1. Parent navigates to `/parent/consent`.
2. Pending forms are listed with title, description, and due date.
3. Parent clicks "Sign" — the form status transitions to `"signed"` with the current timestamp.
4. Parent clicks "Decline" — the form status transitions to `"declined"`.
5. Completed forms move to the "Completed Forms" section.
6. (Both actions are currently client-side only and need to be wired to the Consent API.)

### 4.7 Reporting a Lost Item

1. Parent navigates to `/parent/lost-found`.
2. Parent clicks "Report Lost Item" to open the form dialog.
3. Parent selects the child, enters item name, description, category, date lost, and suspected location.
4. On submit, a `toast.success` confirmation is shown and the dialog closes.
5. The new report appears in "My Lost Reports" with status `"open"`.
6. If a match is found, the report transitions to `"matched"` and a notification banner appears.

---

## 5. Data Models

### 5.1 Parent (Mongoose Schema)

```typescript
interface IParent extends Document {
  userId: Types.ObjectId;           // ref: 'User' — required
  schoolId: Types.ObjectId;         // ref: 'School' — required
  childrenIds: Types.ObjectId[];    // ref: 'Student' — default []
  relationship: 'mother' | 'father' | 'guardian' | 'other';  // required
  occupation?: string;              // trim
  employer?: string;                // trim
  workPhone?: string;               // trim
  alternativeEmail?: string;        // trim, lowercase
  communicationPreference: 'email' | 'sms' | 'whatsapp' | 'push';  // default 'email'
  isMainCaregiver: boolean;         // default false
  isDeleted: boolean;               // default false — soft-delete flag
  createdAt: Date;                  // auto (timestamps: true)
  updatedAt: Date;                  // auto (timestamps: true)
}
```

**Indexes**

- `{ userId: 1 }`
- `{ schoolId: 1 }`

**Populated shapes used in API responses**

- `userId` → `{ firstName, lastName, email, phone, profileImage? }`
- `childrenIds[n]` → `{ userId: { firstName, lastName, email, phone? } }`

### 5.2 Relationship to Student

The `linkChild` / `unlinkChild` operations maintain a **bidirectional** link:

- `Parent.childrenIds` contains an array of `Student._id` values
- `Student.guardianIds` contains an array of `Parent._id` values

Both are updated atomically using `$addToSet` / `$pull` in the same service method.

---

## 6. State Management

### 6.1 Auth Store (`useAuthStore`)

File: `src/stores/useAuthStore.ts`

```typescript
interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  hasRole: (role: UserRole) => boolean;
}
```

- `login()` persists `accessToken` and `refreshToken` to `localStorage`.
- `logout()` removes both tokens from `localStorage`.
- Parent pages consume `user.id` and `user.schoolId` from this store to scope API requests.

### 6.2 Parent-Specific State (To Be Built)

A dedicated `useParentStore` should be created to hold:

```typescript
interface ParentState {
  parentRecord: Parent | null;          // the authenticated user's parent document
  children: Student[];                  // resolved child records
  wallets: Record<string, Wallet>;      // keyed by studentId
  transactions: Record<string, WalletTransaction[]>; // keyed by walletId
  invoices: Invoice[];
  payments: Payment[];
  isLoading: boolean;
  error: string | null;

  fetchParentData: (userId: string) => Promise<void>;
  loadWallet: (walletId: string, amountCents: number) => Promise<void>;
  refreshWallet: (walletId: string, studentId: string) => Promise<void>;
}
```

Currently, all parent pages manage their own local `useState` with individual `useEffect` fetches. Centralising into a Zustand store would eliminate duplicate API calls and allow the dashboard summary stats to share the same data as sub-pages.

### 6.3 UI Store (`useUIStore`)

File: `src/stores/useUIStore.ts` — manages sidebar open/close and other global UI flags. Parent pages do not directly consume this store beyond the layout layer.

---

## 7. Components Needed

### 7.1 Shared (already exist)

| Component | Used on pages |
|---|---|
| `PageHeader` | All parent pages |
| `StatCard` | Dashboard, Fees, Wallet, Attendance, Library, Tuckshop |
| `DataTable` | Fees, Wallet, Attendance, Academics, Library, Lost & Found, Tuckshop |
| `EmptyState` | All pages with tabular/list content |

### 7.2 Parent-Specific (to build)

| Component | Purpose |
|---|---|
| `ChildSelectorTabs` | Reusable `Tabs` wrapper that renders one tab per child — currently duplicated across Wallet, Academics, Attendance, Library, Tuckshop |
| `ChildSummaryCard` | The per-child card on the dashboard (avatar initials, name, grade/class, admission badge, wallet/fees/grade stats) |
| `PayInvoiceDialog` | Currently inlined in fees page — extract as standalone with proper API wiring |
| `LoadWalletDialog` | Currently inlined in wallet page — extract as standalone |
| `ConsentFormCard` | Pending and completed consent form display with Sign/Decline actions |
| `AttendanceCalendar` | Monthly heatmap calendar — currently hardcoded to March 2025; needs to accept a `month` prop and real attendance data |
| `SubjectPerformanceCard` | Per-subject grade card with trend icon and progress bar |
| `LostItemCard` (FoundItemCard) | Gallery card for found items with optional photo — currently inlined |
| `ClaimItemDialog` | Currently inlined — extract for reuse |
| `ReportLostItemDialog` | Currently inlined in lost-found page — extract |
| `RouteStopsTimeline` | Transport route stops vertical timeline — currently inlined |
| `ParentNotificationBell` | Quick access to unread notification count on the dashboard header |

---

## 8. Integration Notes

### 8.1 Parent–Student Relationship

- A `Parent` record belongs to a single school (`schoolId`) but can have children in multiple classes/grades within that school.
- The `linkChild` / `unlinkChild` endpoints are the sole mechanism for managing this relationship — never modify `childrenIds` or `guardianIds` directly via the update endpoint.
- A student can have multiple parents/guardians (`Student.guardianIds` is an array).
- The `isMainCaregiver` flag on the parent record identifies the primary contact but carries no access restriction — all linked parents see the same portal data.

### 8.2 Parent Access to Cross-Module Data

The parent portal reads data from several other modules. The frontend must resolve the parent's child list first, then scope all subsequent requests by `studentId`:

| Portal section | Module | Key endpoints |
|---|---|---|
| Fees | Fee module | `GET /fees/invoices/school/:schoolId`, `GET /fees/payments/:invoiceId` |
| Wallet | TuckShop / Wallet module | `GET /wallets/student/:studentId`, `GET /wallets/:id/transactions`, `POST /wallets/:id/load` |
| Academics — grades | Academic module | `GET /academic/grades/student/:studentId` (to be wired) |
| Academics — homework | Homework module | `GET /homework/class/:classId` or `GET /homework/student/:studentId` (to be wired) |
| Attendance | Attendance module | `GET /attendance/student/:studentId` (to be wired) |
| Library | Library module | `GET /library/borrowings/student/:studentId` (to be wired) |
| Lost & Found | LostFound module | `GET /lost-found/reports?reportedBy=:userId`, `GET /lost-found/found-items` (to be wired) |
| Transport | Transport module | `GET /transport/routes?schoolId=:schoolId` (to be wired) |
| Consent | Consent module | `GET /consent/forms?studentId=:studentId` (to be wired) |
| Events | Event module | `GET /events?schoolId=:schoolId` (to be wired) |
| Communication | Communication module | `GET /communication/messages?recipientId=:userId` (to be wired) |

### 8.3 Authentication and Authorisation

- The parent portal requires an authenticated session (`isAuthenticated: true` in auth store).
- The `GET /parents/:id` route has no role restriction — any authenticated user can read a parent record by ID, which the wallet and dashboard pages rely on to discover the parent record for the current user.
- The `GET /parents` list route is restricted to admin roles. Parent portal pages that need to find the current parent record by `userId` call this endpoint; this will fail if the user has `role === "parent"`. **Recommended fix:** add a `GET /parents/me` endpoint or a `GET /parents?userId=:userId` filter that all authenticated users can call.
- `communicationPreference` on the parent record controls which notification channel the backend uses for out-of-band alerts (email / SMS / WhatsApp / push).

### 8.4 Currency Handling

All monetary amounts in the API are stored and transmitted in **cents** (integer). The frontend's `formatCurrency()` utility divides by 100 for display. The wallet load endpoint expects `amount` in cents: `Math.round(parseFloat(inputZAR) * 100)`.

### 8.5 Soft Deletes

The Parent model uses `isDeleted: boolean` for soft deletion. All service queries include `isDeleted: false` in their filters. Deleted parents do not appear in list or get-by-ID responses and raise a `NotFoundError`.

---

## 9. Acceptance Criteria

### 9.1 Backend — Parent CRUD

- [ ] `POST /parents` creates a parent and returns `201` with the new document; rejects missing `userId`, `schoolId`, or `relationship` with a validation error.
- [ ] `GET /parents?schoolId=X` returns only non-deleted parents for school X, paginated correctly; `page`, `limit`, and `sort` query parameters work as documented.
- [ ] `GET /parents/:id` returns the full populated document; returns `404` for a non-existent or soft-deleted ID.
- [ ] `PUT /parents/:id` updates only the supplied fields; returns the updated, populated document; returns `404` for a non-existent or deleted ID.
- [ ] `DELETE /parents/:id` sets `isDeleted: true`; subsequent `GET /parents/:id` on that ID returns `404`.
- [ ] `POST /parents/:id/link-child` adds `childId` to `parent.childrenIds` and `parentId` to `student.guardianIds`; is idempotent (duplicate calls do not create duplicate entries, thanks to `$addToSet`).
- [ ] `POST /parents/:id/unlink-child` removes both associations; is idempotent.
- [ ] Link/unlink return `404` when either the parent or the student is not found or is soft-deleted.

### 9.2 Frontend — Parent Dashboard

- [ ] Dashboard shows correct count of enrolled children, combined wallet balance, combined outstanding fees, and unread notification count sourced from real API data.
- [ ] Each child card displays the child's current wallet balance, next unpaid invoice balance, and average grade percentage.
- [ ] Quick Actions links navigate to the correct portal pages.
- [ ] Recent Notifications list shows up to 5 notifications with type badge and relative timestamp.

### 9.3 Frontend — Fees Page

- [ ] Invoices table populates from `GET /fees/invoices/school/:schoolId`.
- [ ] Payment history table populates from `GET /fees/payments/:invoiceId` for each invoice.
- [ ] "Pay Now" button is visible only on invoices with `balanceDue > 0` and status not `"cancelled"`.
- [ ] PayDialog disables the confirm button when amount is empty, ≤ 0, or exceeds the balance due.
- [ ] Summary stats (outstanding, total paid, invoice count, overdue count) are computed from live API data.

### 9.4 Frontend — Wallet Page

- [ ] Page resolves the current parent's record and child list from the API before rendering.
- [ ] Wallet balance, wristband ID, last top-up date, daily limit, and active status are populated from `GET /wallets/student/:studentId`.
- [ ] Transaction history is populated from `GET /wallets/:id/transactions`.
- [ ] Submitting the Load Money dialog calls `POST /wallets/:id/load` with the correct amount in cents.
- [ ] On successful top-up, wallet balance refreshes without a full page reload and a success toast appears.
- [ ] Load Money button is disabled when amount is empty or < R10.

### 9.5 Frontend — Academics Page

- [ ] Grade data is fetched from the Academics API scoped to each child's student ID (not mock data).
- [ ] Homework data is fetched from the Homework API scoped to each child's class ID (not mock data).
- [ ] Subject performance cards show correct average, latest grade, and trend compared to the prior assessment.
- [ ] Assessment results table is searchable.

### 9.6 Frontend — Attendance Page

- [ ] Attendance records are fetched from the Attendance API for each child.
- [ ] Summary stats (total, present, absent, late, excused, rate) are computed from live data.
- [ ] Monthly calendar renders the correct month dynamically (not hardcoded to March 2025).
- [ ] Attendance rate descriptor changes correctly (≥ 90% → Excellent, ≥ 75% → Good, < 75% → Needs improvement).

### 9.7 Frontend — Communication Page

- [ ] Messages are fetched from the Communication API filtered to the current parent's user ID.
- [ ] Unread messages are visually distinguished (bold subject, filled mail icon, muted background).
- [ ] Clicking a message opens the detail dialog; the message should be marked as read (API call).
- [ ] Urgent message count is shown in the summary card.

### 9.8 Frontend — Consent Page

- [ ] Consent forms are fetched from the Consent API for all children of the current parent.
- [ ] Signing a form calls the Consent API to persist the signature and timestamp.
- [ ] Declining a form calls the Consent API to persist the declined state.
- [ ] Pending and completed forms are displayed in their correct sections.

### 9.9 Frontend — Events Page

- [ ] Events are fetched from the Event API for the school.
- [ ] Events are sorted by `startDate` ascending.
- [ ] "Buy Ticket" action calls the Event/Payment API and confirms the purchase.
- [ ] Events requiring consent display the "Consent Required" badge.

### 9.10 Frontend — Library Page

- [ ] Borrowings are fetched from the Library API for each child.
- [ ] Overdue alert banner appears only when there are overdue books.
- [ ] Overdue items are shown before currently-borrowed items within the per-child grid.

### 9.11 Frontend — Lost & Found Page

- [ ] Lost reports are fetched from the LostFound API filtered to the current parent's user ID.
- [ ] Found items are fetched from the LostFound API.
- [ ] Submitting the Report Lost Item form calls the LostFound API and adds the new report to the table.
- [ ] Claiming a found item calls the LostFound API claim endpoint.
- [ ] Match notification banner appears when any report has status `"matched"`.
- [ ] Gallery/list toggle persists for the session.

### 9.12 Frontend — Transport Page

- [ ] Transport routes are fetched from the Transport API for the school.
- [ ] Only routes that include at least one of the parent's children are displayed.
- [ ] Route stops are sorted by `order` ascending.
- [ ] Driver phone number is rendered as a tappable `tel:` link on mobile.

### 9.13 Frontend — Tuckshop Page

- [ ] Tuckshop orders are fetched from the TuckShop API for each child.
- [ ] Allergen information is sourced from the student's medical info (via Student API).
- [ ] Total Spent and Total Orders stats are computed from live data.
- [ ] Both the detailed order cards and the DataTable are populated from the same fetched data.

### 9.14 Cross-Cutting

- [ ] All parent portal pages show a loading skeleton or spinner while data is being fetched.
- [ ] All pages handle API errors gracefully (toast notification or inline error state — no silent failures).
- [ ] The parent portal is inaccessible to users without the `parent` role (route guard enforced in layout).
- [ ] Currency amounts are always displayed via `formatCurrency()` (i.e. divided by 100 from cent-integer values).
- [ ] A `GET /parents/me` (or equivalent filtered endpoint) is available so the parent portal can resolve the current user's parent record without requiring admin-only list access.
