# 28 — SuperAdmin Module

## 1. Module Overview

The SuperAdmin module is the platform-level control plane for Campusly. It sits entirely outside the per-school tenant context and is accessible only to users with the `super_admin` role. It governs the full lifecycle of every school (tenant) on the platform and provides the commercial and operational tooling needed to run Campusly as a SaaS business.

Core responsibilities:

- **Tenant management**: Onboard new schools, update their status (`trial → active → suspended → cancelled`), toggle feature modules, and hard-suspend with a reason.
- **Platform statistics**: Aggregate view of all tenants, invoice health, and support queue — the "mission control" dashboard.
- **Platform billing**: Generate invoices charged to tenants (subscription fees), query per-tenant invoice history, and view cross-tenant revenue aggregated by month.
- **Support tickets**: Create, assign, reply to, and resolve tickets raised against any tenant school.

The module introduces three new MongoDB collections — `Tenant`, `PlatformInvoice`, and `SupportTicket` — that are entirely separate from any school-scoped collection. A `Tenant` record is the bridge between a `School` document (owned by the School module) and the commercial/operational layer managed here.

All backend routes are mounted under `/api/superadmin` and require both `authenticate` and `authorize('super_admin')` middleware. There are no public or lower-role endpoints.

---

## 2. Backend API Endpoints

All routes are prefixed `/api/superadmin`. Every route requires:
- `Authorization: Bearer <token>` header
- The authenticated user must have role `super_admin`

---

### GET /api/superadmin/stats

Returns a single aggregated snapshot of platform health across all three collections.

**Auth**: `super_admin`

**Query params**: none

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Platform stats retrieved successfully",
  "data": {
    "tenants": {
      "total": 42,
      "trial": 8,
      "active": 30,
      "suspended": 3,
      "cancelled": 1
    },
    "revenue": {
      "totalPaid": 182500.00,
      "paidInvoices": 87,
      "overdueInvoices": 4,
      "draftInvoices": 12
    },
    "support": {
      "open": 5,
      "inProgress": 3,
      "resolved": 22,
      "closed": 41
    }
  }
}
```

**Implementation notes**: Built from three parallel MongoDB aggregations — `$group` by `status` on each collection. `revenue.totalPaid` sums the `total` field on `PlatformInvoice` documents where `status === 'paid'`.

---

### POST /api/superadmin/tenants/onboard

Creates a new `Tenant` record linked to an existing `School` document. Puts the school into its trial period with default or supplied limits.

**Auth**: `super_admin`

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | string | yes | 24-char hex ObjectId |
| `trialStartDate` | string (ISO datetime) | no | optional; defaults to `Date.now()` |
| `trialEndDate` | string (ISO datetime) | no | optional; defaults to `trialStartDate + 30 days` |
| `subscription.tier` | string | no* | enum: `starter`, `growth`, `enterprise` |
| `subscription.price` | number | no* | min 0 |
| `subscription.billingCycle` | string | no* | enum: `monthly`, `annual` |
| `subscription.nextBillingDate` | string (ISO datetime) | no | optional within subscription |
| `modulesEnabled` | string[] | no | array of module id strings; defaults to `[]` |
| `limits.maxStudents` | number | no | int, min 1; defaults to 500 |
| `limits.maxStaff` | number | no | int, min 1; defaults to 50 |
| `billingContact.name` | string | no* | min length 1 |
| `billingContact.email` | string | no* | valid email |
| `billingContact.phone` | string | no | optional within billingContact |
| `onboardingStatus` | string | no | enum: `pending`, `in_progress`, `complete`; defaults to `pending` |
| `notes` | string | no | trimmed |

*`subscription` and `billingContact` are optional objects; if either is provided all required fields within must be present.

**Business rule**: Returns `400 Bad Request` if a non-deleted `Tenant` already exists for the given `schoolId`.

**Response** `201 Created`:

```json
{
  "success": true,
  "message": "School onboarded successfully",
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "schoolId": "665f1a2b3c4d5e6f7a8b9c01",
    "status": "trial",
    "trialStartDate": "2026-03-31T00:00:00.000Z",
    "trialEndDate": "2026-04-30T00:00:00.000Z",
    "subscription": null,
    "modulesEnabled": ["fees", "communication"],
    "limits": { "maxStudents": 500, "maxStaff": 50 },
    "usage": { "currentStudents": 0, "currentStaff": 0 },
    "billingContact": null,
    "onboardingStatus": "pending",
    "notes": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T00:00:00.000Z",
    "updatedAt": "2026-03-31T00:00:00.000Z"
  }
}
```

---

### GET /api/superadmin/tenants

Paginated, filterable list of all non-deleted tenants. Populates `schoolId` with `name`, `email`, `phone` from the `School` collection.

**Auth**: `super_admin`

**Query params**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | PAGINATION_DEFAULTS.limit | Results per page (capped at PAGINATION_DEFAULTS.maxLimit) |
| `sort` | string | `-createdAt` | Mongoose sort string (e.g. `name`, `-trialEndDate`) |
| `status` | string | — | Filter by tenant status: `trial`, `active`, `suspended`, `cancelled` |
| `search` | string | — | Accepted by controller but not applied in current filter implementation (reserved) |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Tenants retrieved successfully",
  "data": {
    "data": [ /* ITenant[] with schoolId populated */ ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### GET /api/superadmin/tenants/:id

Fetch a single tenant by its MongoDB `_id`. Populates `schoolId` with `name`, `email`, `phone`, `address`.

**Auth**: `super_admin`

**Path param**: `id` — 24-char hex ObjectId of the Tenant document

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Tenant retrieved successfully",
  "data": { /* full ITenant with schoolId populated */ }
}
```

**Error**: `404 Not Found` if no matching non-deleted tenant exists.

---

### PATCH /api/superadmin/tenants/:id/status

Update a tenant's `status` field. Optionally append an internal note.

**Auth**: `super_admin`

**Path param**: `id` — Tenant ObjectId

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `status` | string | yes | enum: `trial`, `active`, `suspended`, `cancelled` |
| `notes` | string | no | trimmed |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Tenant status updated successfully",
  "data": { /* updated ITenant */ }
}
```

**Error**: `404 Not Found` if tenant does not exist.

---

### PATCH /api/superadmin/tenants/:id/modules

Replace the `modulesEnabled` array for a tenant in full.

**Auth**: `super_admin`

**Path param**: `id` — Tenant ObjectId

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `modulesEnabled` | string[] | yes | array of non-empty strings |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Tenant modules updated successfully",
  "data": { /* updated ITenant */ }
}
```

---

### POST /api/superadmin/tenants/:id/suspend

Hard-suspend a tenant with a mandatory reason. Sets `status` to `suspended` and writes the reason to `notes`. Idempotency guard: returns `400` if the tenant is already suspended.

**Auth**: `super_admin`

**Path param**: `id` — Tenant ObjectId

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `reason` | string | yes | min length 1, trimmed |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Tenant suspended successfully",
  "data": { /* updated ITenant with status: "suspended" */ }
}
```

**Errors**:
- `400 Bad Request` — tenant is already suspended
- `404 Not Found` — tenant not found

---

### POST /api/superadmin/invoices

Generate a new platform invoice for a tenant. Calculates `total` as `amount + (amount * tax / 100)`. Auto-generates a unique invoice number in the format `INV-YYYYMMDD-NNNN` with up to 10 collision retries.

**Auth**: `super_admin`

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `tenantId` | string | yes | 24-char hex ObjectId |
| `lineItems` | object[] | yes | min 1 item |
| `lineItems[].description` | string | yes | min length 1, trimmed |
| `lineItems[].quantity` | number | yes | int, min 1 |
| `lineItems[].unitPrice` | number | yes | min 0 |
| `tax` | number | no | min 0; defaults to 0; treated as a percentage rate |
| `issuedDate` | string (ISO datetime) | no | defaults to `Date.now()` |
| `dueDate` | string (ISO datetime) | yes | — |
| `status` | string | no | enum: `draft`, `sent`, `paid`, `overdue`; defaults to `draft` |

**Business rule**: `lineItem.total` is computed server-side as `quantity * unitPrice`. The client does not send `total` per line item.

**Response** `201 Created`:

```json
{
  "success": true,
  "message": "Platform invoice generated successfully",
  "data": {
    "_id": "665f...",
    "tenantId": "665f...",
    "invoiceNumber": "INV-20260331-4821",
    "amount": 29999.00,
    "tax": 15,
    "total": 34498.85,
    "status": "draft",
    "lineItems": [
      {
        "description": "Starter plan — March 2026",
        "quantity": 1,
        "unitPrice": 29999.00,
        "total": 29999.00
      }
    ],
    "issuedDate": "2026-03-31T00:00:00.000Z",
    "dueDate": "2026-04-07T00:00:00.000Z",
    "paidDate": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T00:00:00.000Z",
    "updatedAt": "2026-03-31T00:00:00.000Z"
  }
}
```

**Error**: `404 Not Found` if `tenantId` does not match an active tenant.

---

### GET /api/superadmin/revenue

Aggregated revenue report. Returns month-by-month breakdown (only paid invoices) plus an all-time status summary across all invoice statuses.

**Auth**: `super_admin`

**Query params**:

| Param | Type | Default | Description |
|---|---|---|---|
| `year` | number | — | Optional. If provided, filters paid invoices to that calendar year via `paidDate` range |
| `month` | number | — | Accepted but not applied to the `matchStage` in current implementation (reserved) |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Platform revenue retrieved successfully",
  "data": {
    "monthly": [
      {
        "_id": { "year": 2026, "month": 1 },
        "revenue": 182500.00,
        "invoiceCount": 31
      },
      {
        "_id": { "year": 2026, "month": 2 },
        "revenue": 197200.00,
        "invoiceCount": 33
      }
    ],
    "summary": {
      "totalPaid": 379700.00,
      "totalPaidCount": 64,
      "totalOverdue": 15000.00,
      "totalOverdueCount": 4,
      "totalDraft": 45000.00,
      "totalDraftCount": 12
    }
  }
}
```

**Note**: `monthly` is sorted ascending by year then month. The `summary` block is always across all time regardless of the `year` filter.

---

### GET /api/superadmin/tenants/:tenantId/invoices

Paginated list of all platform invoices for a specific tenant.

**Auth**: `super_admin`

**Path param**: `tenantId` — Tenant ObjectId

**Query params**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | PAGINATION_DEFAULTS.limit | Results per page |
| `sort` | string | `-createdAt` | Mongoose sort string |
| `status` | string | — | Filter by invoice status: `draft`, `sent`, `paid`, `overdue` |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Tenant invoices retrieved successfully",
  "data": {
    "data": [ /* IPlatformInvoice[] */ ],
    "total": 24,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

---

### POST /api/superadmin/tickets

Create a new support ticket. The `raisedBy` field is set server-side from `req.user.id` (the authenticated super_admin).

**Auth**: `super_admin`

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `tenantId` | string | yes | 24-char hex ObjectId |
| `schoolId` | string | yes | 24-char hex ObjectId |
| `category` | string | yes | min length 1, trimmed |
| `subject` | string | yes | min length 1, trimmed |
| `description` | string | yes | min length 1, trimmed |
| `priority` | string | no | enum: `low`, `medium`, `high`, `urgent`; defaults to `medium` |

**Business rule**: Returns `404` if `tenantId` does not match an active (non-deleted) tenant.

**Response** `201 Created`:

```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "_id": "665f...",
    "tenantId": "665f...",
    "schoolId": "665f...",
    "raisedBy": "665f...",
    "category": "Billing",
    "subject": "Invoice not received for March",
    "description": "The school has not received their March invoice.",
    "priority": "medium",
    "status": "open",
    "assignedTo": null,
    "messages": [],
    "resolvedAt": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T00:00:00.000Z",
    "updatedAt": "2026-03-31T00:00:00.000Z"
  }
}
```

---

### GET /api/superadmin/tickets

Paginated, filterable list of all support tickets. Populates `raisedBy` and `assignedTo` with `firstName`, `lastName`, `email`.

**Auth**: `super_admin`

**Query params**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | PAGINATION_DEFAULTS.limit | Results per page |
| `sort` | string | `-createdAt` | Mongoose sort string |
| `status` | string | — | Filter: `open`, `in_progress`, `resolved`, `closed` |
| `tenantId` | string | — | Filter to a specific tenant's tickets |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Support tickets retrieved successfully",
  "data": {
    "data": [ /* ISupportTicket[] with raisedBy and assignedTo populated */ ],
    "total": 71,
    "page": 1,
    "limit": 20,
    "totalPages": 4
  }
}
```

---

### GET /api/superadmin/tickets/:id

Fetch a single support ticket with full message thread. Populates `raisedBy` and `assignedTo`.

**Auth**: `super_admin`

**Path param**: `id` — SupportTicket ObjectId

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Support ticket retrieved successfully",
  "data": { /* full ISupportTicket with populated refs */ }
}
```

**Error**: `404 Not Found` if ticket does not exist.

---

### POST /api/superadmin/tickets/:id/reply

Append a message to a ticket's `messages` array. If the ticket was `open` it is automatically promoted to `in_progress`. Replies to `closed` tickets are rejected.

**Auth**: `super_admin`

**Path param**: `id` — SupportTicket ObjectId

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `message` | string | yes | min length 1, trimmed |
| `isInternal` | boolean | no | defaults to `false`; `true` marks the message as an internal note not visible to the tenant |

**Business rule**: `senderId` is set server-side from `req.user.id`.

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Reply sent successfully",
  "data": { /* updated ISupportTicket with new message appended */ }
}
```

**Error**: `400 Bad Request` if ticket status is `closed`.

---

### PATCH /api/superadmin/tickets/:id/assign

Assign (or reassign) a ticket to a super_admin user. Automatically sets ticket status to `in_progress`.

**Auth**: `super_admin`

**Path param**: `id` — SupportTicket ObjectId

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `assignedTo` | string | yes | 24-char hex ObjectId of the User to assign |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Ticket assigned successfully",
  "data": { /* updated ISupportTicket */ }
}
```

---

### PATCH /api/superadmin/tickets/:id/status

Update a ticket's status directly. If set to `resolved`, `resolvedAt` is stamped server-side.

**Auth**: `super_admin`

**Path param**: `id` — SupportTicket ObjectId

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `status` | string | yes | enum: `open`, `in_progress`, `resolved`, `closed` |

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Ticket status updated successfully",
  "data": { /* updated ISupportTicket */ }
}
```

---

## 3. Frontend Pages

All pages live under `src/app/(dashboard)/superadmin/` and are `'use client'` components currently using mock data. The sidebar and layout shell is shared with the broader dashboard but the nav items are scoped to `super_admin` role.

---

### `/superadmin` — Platform Overview Dashboard (`page.tsx`)

**Purpose**: Mission-control view of Campusly platform health.

**Stat cards** (top row, 4 columns):
- Total Schools — from `mockPlatformStats.totalSchools`; trend vs last quarter
- Total Students — across all tenants; trend vs last month
- MRR — monthly recurring revenue in rands; ARR shown in description
- Active Trials — count of schools on trial; outstanding invoice value in description

**Charts** (second row, 3 columns):
- MRR Trend — `LineChartComponent` with `month` on x-axis, `mrr` line (from `mockPlatformRevenueTrend`)
- Schools by Tier — `PieChartComponent` (from `mockSchoolsByTier`)

**Chart** (full-width third row):
- Student Growth — `AreaChartComponent` with `month` on x-axis, `students` area (from `mockStudentGrowth`)

**API wiring needed**: `GET /api/superadmin/stats` for stat cards; `GET /api/superadmin/revenue` for MRR trend chart.

---

### `/superadmin/schools` — Schools List (`schools/page.tsx`)

**Purpose**: Searchable, filterable table of all tenant schools.

**Filters**:
- Text search on school name and admin email (client-side against mock data)
- Status filter dropdown: All / Active / Trial / Suspended / Cancelled
- Tier filter dropdown: All / Enterprise / Growth / Starter

**Table columns**: School (name + admin email), Status (badge), Tier (badge), Students (count), MRR (— for trial/suspended), Actions (dropdown)

**Row actions via `DropdownMenu`**:
- View Details — links to `/superadmin/schools/:id`
- Suspend / Activate toggle (label only; no API call yet)

**Header action**: "Onboard School" button links to `/superadmin/onboard`

**Status badge colours**: active=emerald, trial=blue, suspended=red, cancelled=gray
**Tier badge colours**: enterprise=purple, growth=indigo, starter=amber

**API wiring needed**: `GET /api/superadmin/tenants` with `page`, `limit`, `status`, `search` query params; `POST /api/superadmin/tenants/:id/suspend` and `PATCH /api/superadmin/tenants/:id/status` for row actions.

---

### `/superadmin/schools/[id]` — Tenant Detail (`schools/[id]/page.tsx`)

**Purpose**: Full profile of one tenant school with inline actions.

**Sections**:

1. **School Information card** (2/3 width): Admin name, email, student count, joined date, status badge, tier badge.
2. **Subscription card** (1/3 width): Plan tier, monthly rate (or "Free Trial"), trial end date if applicable. Action button: "Suspend School" (destructive) or "Activate School" (default), toggling on click with a `toast.success` confirmation.
3. **Enabled Modules card**: Grid of all `MODULES` constants rendered as `Checkbox` rows (8 modules). Toggle fires `toast.info`; no API call yet.
4. **Usage Stats card**: 4-up stat tiles — Students, Active Modules count, Paid Invoices count, Total Invoices count.
5. **Billing History card** (conditional — shown only if tenant has invoices): List of invoices with invoice number, issue date, amount, and status badge.

**Params**: `id` is resolved via `use(params)` (React 19 async params API).

**Not-found state**: Full-screen message with "Go Back" button if no matching mock tenant.

**API wiring needed**: `GET /api/superadmin/tenants/:id`, `POST /api/superadmin/tenants/:id/suspend`, `PATCH /api/superadmin/tenants/:id/status`, `PATCH /api/superadmin/tenants/:id/modules`, `GET /api/superadmin/tenants/:tenantId/invoices`.

---

### `/superadmin/onboard` — Onboard New School (`onboard/page.tsx`)

**Purpose**: 5-step wizard to provision a new tenant school.

**Steps**:
1. **School Details** — School name, city, province (SA_PROVINCES dropdown), phone, school type (primary/secondary/combined)
2. **Modules** — Checkbox grid of all `MODULES` (defaults: `fees` and `communication` pre-selected)
3. **Admin User** — First name, last name, email, temporary password
4. **Subscription** — Tier selector cards: Starter (R2,999/mo, up to 150 students), Growth (R7,999/mo, up to 500 students), Enterprise (R14,999/mo, unlimited). Defaults to `starter`.
5. **Review** — Read-only summary of all data before confirm

**Step progress bar**: Numbered circles; completed steps show green checkmark. Clicking a completed step navigates back to it.

**State**: Single `WizardData` object managed with `useState` + `update()` partial-patch helper. Module list toggled via `toggleModule()`.

**Submission**: On "Confirm & Onboard" (step 5), fires `toast.success` and shows a success screen with options to View Schools or Onboard Another (resets the wizard state).

**API wiring needed**: `POST /api/superadmin/tenants/onboard` with the assembled payload. Note: the onboard wizard also captures school-level fields (name, city, phone, school type) and an admin user — these will need to call the School module's `POST /api/schools` and User module's create-user endpoint first, then pass the resulting `schoolId` to the onboard endpoint.

---

### `/superadmin/billing` — Billing Dashboard (`billing/page.tsx`)

**Purpose**: Platform revenue overview and invoice management table.

**Stat cards** (3 columns): MRR, ARR, Outstanding (unpaid invoices total)

**Invoice table columns**: Invoice #, School, Tier, Amount, Issued date, Due date, Status badge

**Status badge colours**: paid=emerald, sent=blue, overdue=red, draft=gray

**Header action**: "Generate Invoices" button — fires `toast.success` with "Invoice generation queued for all active tenants" (no API call yet).

**API wiring needed**: `GET /api/superadmin/revenue` for stat cards and trend data; `GET /api/superadmin/tenants/:tenantId/invoices` or a cross-tenant invoice list endpoint; `POST /api/superadmin/invoices` for invoice generation.

---

### `/superadmin/support` — Support Queue (`support/page.tsx`)

**Purpose**: Email-client-style two-panel interface for managing support tickets.

**Left panel** (1/3 width): Scrollable list of ticket buttons. Each shows subject, school name, priority (colour-coded), status badge, relative timestamp. Selected ticket highlighted with primary border + bg.

**Right panel** (2/3 width, `Card`):
- **Header**: Ticket number (mono font), subject, school name, category, status badge, priority label
- **Messages thread**: Chat-style bubbles; `senderRole === 'support'` messages align right (primary colour), tenant messages align left (muted). Shows sender name and relative timestamp below each bubble.
- **Reply form**: `Textarea` (3 rows, no resize) + "Send Reply" button (disabled when empty). On send, fires `toast.success` and clears the textarea.

**Priority colour coding** (frontend `SupportTicket.priority` type includes `normal` not `medium`): low=gray, normal=blue, high=amber, urgent=red

**Note**: The frontend `SupportTicket` type uses `'normal'` as a priority value, while the backend model and validation use `'medium'`. This discrepancy must be resolved during API wiring — normalise to `medium` in backend.

**API wiring needed**: `GET /api/superadmin/tickets` for list; `GET /api/superadmin/tickets/:id` for detail; `POST /api/superadmin/tickets/:id/reply`; `PATCH /api/superadmin/tickets/:id/assign`; `PATCH /api/superadmin/tickets/:id/status`.

---

## 4. User Flows

### 4.1 Onboard a New School

1. Super admin navigates to Schools → clicks "Onboard School" → lands on `/superadmin/onboard`
2. Step 1: Enters school details (name, city, province, phone, type)
3. Step 2: Selects enabled modules via checkboxes
4. Step 3: Creates the initial admin user (name, email, temp password)
5. Step 4: Selects subscription tier (starter/growth/enterprise)
6. Step 5: Reviews all data, confirms
7. System calls `POST /api/schools` to create the School document, then `POST /api/superadmin/tenants/onboard` with the returned `schoolId`
8. Success screen shown; super admin can view in schools list or onboard another

### 4.2 Suspend a Tenant

**From schools list**: Row actions dropdown → "Suspend" → calls `POST /api/superadmin/tenants/:id/suspend` with a reason.

**From tenant detail page**: "Suspend School" button in the Subscription card → opens a reason input dialog (to be built) → calls `POST /api/superadmin/tenants/:id/suspend`.

After suspension, tenant status badge updates to red "suspended" and MRR shows "—" in the list.

### 4.3 Activate / Change Tenant Status

From tenant detail page, "Activate School" button (shown when currently suspended) → calls `PATCH /api/superadmin/tenants/:id/status` with `{ status: 'active' }`.

### 4.4 Update Tenant Modules

On tenant detail page, the Enabled Modules card's checkboxes → toggle any module → calls `PATCH /api/superadmin/tenants/:id/modules` with the complete updated `modulesEnabled` array.

### 4.5 View Platform Revenue

1. Navigate to `/superadmin/billing`
2. Stat cards show MRR, ARR, outstanding balance (from `GET /api/superadmin/revenue` summary)
3. Invoice table lists all cross-tenant invoices (sorted by issue date descending)
4. Optional year filter sends `?year=2026` to `GET /api/superadmin/revenue` to scope the monthly breakdown

### 4.6 Generate a Platform Invoice

From the billing page, "Generate Invoices" button → opens a modal (to be built) where the super admin selects a tenant, adds line items, sets due date and tax → calls `POST /api/superadmin/invoices` → new invoice appears in the table with status `draft`.

### 4.7 Handle a Support Ticket

1. Navigate to `/superadmin/support`
2. Left panel shows all open/in_progress tickets sorted by recency
3. Click a ticket to view its full message thread in the right panel
4. Type a reply and click "Send Reply" → calls `POST /api/superadmin/tickets/:id/reply`
5. If the ticket was `open`, status auto-advances to `in_progress`
6. To resolve: use status dropdown (to be built) or the existing `PATCH /api/superadmin/tickets/:id/status` with `{ status: 'resolved' }`
7. To assign to a colleague: `PATCH /api/superadmin/tickets/:id/assign` with `{ assignedTo: userId }`

---

## 5. Data Models

### Tenant

MongoDB collection: `tenants`

| Field | Type | Default | Notes |
|---|---|---|---|
| `schoolId` | ObjectId (ref: School) | — | Required; unique; one-to-one with School |
| `status` | `'trial' \| 'active' \| 'suspended' \| 'cancelled'` | `'trial'` | Lifecycle state |
| `trialStartDate` | Date | — | Optional |
| `trialEndDate` | Date | — | Optional; service defaults to +30 days from now |
| `subscription.tier` | `'starter' \| 'growth' \| 'enterprise'` | — | Enum enforced in validation |
| `subscription.price` | Number | — | min 0 |
| `subscription.billingCycle` | `'monthly' \| 'annual'` | — | — |
| `subscription.nextBillingDate` | Date | — | Optional |
| `modulesEnabled` | String[] | `[]` | Array of module id strings e.g. `['fees', 'wallet']` |
| `limits.maxStudents` | Number | 500 | int, min 0 |
| `limits.maxStaff` | Number | 50 | int, min 0 |
| `usage.currentStudents` | Number | 0 | Updated by student module |
| `usage.currentStaff` | Number | 0 | Updated by staff module |
| `billingContact.name` | String | — | Optional sub-document |
| `billingContact.email` | String | — | Lowercase, trimmed |
| `billingContact.phone` | String | — | Optional |
| `onboardingStatus` | `'pending' \| 'in_progress' \| 'complete'` | `'pending'` | — |
| `notes` | String | — | Internal notes; overwritten by `suspendTenant` with the reason |
| `isDeleted` | Boolean | `false` | Soft-delete flag |
| `createdAt` / `updatedAt` | Date | — | Mongoose timestamps |

**Indexes**: `{ schoolId: 1 }` (unique), `{ status: 1 }`

### PlatformInvoice

MongoDB collection: `platforminvoices`

| Field | Type | Default | Notes |
|---|---|---|---|
| `tenantId` | ObjectId (ref: Tenant) | — | Required |
| `invoiceNumber` | String | — | Required; unique; format `INV-YYYYMMDD-NNNN` |
| `amount` | Number | — | Pre-tax total (sum of line item totals); min 0 |
| `tax` | Number | 0 | Tax percentage rate (e.g. 15 = 15%); min 0 |
| `total` | Number | — | `amount + (amount * tax / 100)`; min 0 |
| `status` | `'draft' \| 'sent' \| 'paid' \| 'overdue'` | `'draft'` | — |
| `lineItems[].description` | String | — | Required; trimmed |
| `lineItems[].quantity` | Number | — | int, min 1 |
| `lineItems[].unitPrice` | Number | — | min 0 |
| `lineItems[].total` | Number | — | Computed server-side as `quantity * unitPrice`; min 0 |
| `issuedDate` | Date | — | Required |
| `dueDate` | Date | — | Required |
| `paidDate` | Date | — | Optional; set externally when payment confirmed |
| `isDeleted` | Boolean | `false` | Soft-delete flag |
| `createdAt` / `updatedAt` | Date | — | Mongoose timestamps |

**Indexes**: `{ tenantId: 1 }`, `{ status: 1 }`

### SupportTicket

MongoDB collection: `supporttickets`

| Field | Type | Default | Notes |
|---|---|---|---|
| `tenantId` | ObjectId (ref: Tenant) | — | Required |
| `schoolId` | ObjectId (ref: School) | — | Required |
| `raisedBy` | ObjectId (ref: User) | — | Required; set from `req.user.id` server-side |
| `category` | String | — | Free-text; required |
| `subject` | String | — | Required |
| `description` | String | — | Required |
| `priority` | `'low' \| 'medium' \| 'high' \| 'urgent'` | `'medium'` | — |
| `status` | `'open' \| 'in_progress' \| 'resolved' \| 'closed'` | `'open'` | Auto-advances on first reply |
| `assignedTo` | ObjectId (ref: User) | — | Optional; set by assign endpoint; also sets status to `in_progress` |
| `messages[].senderId` | ObjectId (ref: User) | — | Required |
| `messages[].message` | String | — | Required |
| `messages[].timestamp` | Date | `Date.now()` | — |
| `messages[].isInternal` | Boolean | `false` | Internal notes hidden from tenant |
| `resolvedAt` | Date | — | Set by server when status transitions to `resolved` |
| `isDeleted` | Boolean | `false` | Soft-delete flag |
| `createdAt` / `updatedAt` | Date | — | Mongoose timestamps |

**Indexes**: `{ tenantId: 1 }`, `{ schoolId: 1 }`, `{ status: 1 }`, `{ priority: 1 }`

### Frontend TypeScript types (`src/types/index.ts`)

```ts
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';
export type SubscriptionTier = 'starter' | 'growth' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  tier: SubscriptionTier;
  studentCount: number;
  mrr: number;           // cents
  adminEmail: string;
  adminName: string;
  city: string;
  province: string;
  enabledModules: string[];
  createdAt: string;
  trialEndsAt?: string;
  logo?: string;
}

export interface PlatformInvoice {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  tenantName: string;
  amount: number;        // cents
  status: 'paid' | 'sent' | 'overdue' | 'draft';
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  tier: SubscriptionTier;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';  // NOTE: 'normal' on frontend; backend uses 'medium'
  category: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  assignedTo?: string;
}

export interface PlatformStats {
  totalSchools: number;
  totalStudents: number;
  mrr: number;           // cents
  arr: number;           // cents
  activeTrials: number;
  outstanding: number;   // cents
}
```

---

## 6. State Management

There is no dedicated Zustand store for SuperAdmin in the current codebase. All data is sourced from `src/lib/mock-data.ts`. The following store shape is needed when wiring real API calls.

### Proposed `useSuperAdminStore` (Zustand)

```ts
interface SuperAdminState {
  // Platform stats
  stats: PlatformStats | null;
  statsLoading: boolean;

  // Tenants
  tenants: Tenant[];
  tenantsTotal: number;
  tenantsPage: number;
  tenantsLoading: boolean;
  selectedTenant: Tenant | null;

  // Revenue
  revenue: RevenueReport | null;
  revenueLoading: boolean;

  // Invoices
  invoices: PlatformInvoice[];
  invoicesTotal: number;
  invoicesLoading: boolean;

  // Support tickets
  tickets: SupportTicket[];
  ticketsTotal: number;
  ticketsLoading: boolean;
  selectedTicket: SupportTicket | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchTenants: (params?: TenantListParams) => Promise<void>;
  fetchTenantDetail: (id: string) => Promise<void>;
  onboardSchool: (data: OnboardSchoolInput) => Promise<void>;
  updateTenantStatus: (id: string, status: TenantStatus, notes?: string) => Promise<void>;
  updateTenantModules: (id: string, modules: string[]) => Promise<void>;
  suspendTenant: (id: string, reason: string) => Promise<void>;
  fetchRevenue: (params?: { year?: number }) => Promise<void>;
  generateInvoice: (data: GenerateInvoiceInput) => Promise<void>;
  fetchInvoicesByTenant: (tenantId: string, params?: InvoiceListParams) => Promise<void>;
  fetchTickets: (params?: TicketListParams) => Promise<void>;
  fetchTicketDetail: (id: string) => Promise<void>;
  createTicket: (data: CreateTicketInput) => Promise<void>;
  replyToTicket: (id: string, message: string, isInternal?: boolean) => Promise<void>;
  assignTicket: (id: string, assignedTo: string) => Promise<void>;
  updateTicketStatus: (id: string, status: SupportTicket['status']) => Promise<void>;
  setSelectedTenant: (tenant: Tenant | null) => void;
  setSelectedTicket: (ticket: SupportTicket | null) => void;
}
```

**Local component state** (no store needed):
- Onboard wizard: `step: number`, `data: WizardData`, `done: boolean` — managed in the page component
- Support reply textarea: `reply: string` — managed in the page component
- Schools list filters: `search`, `statusFilter`, `tierFilter` — managed in the page component

---

## 7. Components Needed

All components live under `src/components/superadmin/` unless noted.

---

### `TenantTable`

**File**: `src/components/superadmin/TenantTable.tsx`

**Purpose**: Renders the filterable schools table on `/superadmin/schools`.

**Props**:
```ts
interface TenantTableProps {
  tenants: Tenant[];
  loading?: boolean;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
}
```

**Internals**:
- Client-side search and filter (`useMemo` over the `tenants` prop)
- Status and tier badge colour maps already defined in the page
- Row action `DropdownMenu` with "View Details" link and suspend/activate toggle

---

### `TenantCard`

**File**: `src/components/superadmin/TenantCard.tsx`

**Purpose**: Compact card for a tenant, usable in lists or side panels.

**Props**:
```ts
interface TenantCardProps {
  tenant: Tenant;
  onClick?: () => void;
  selected?: boolean;
}
```

Displays: school name, city/province, status badge, tier badge, student count, MRR.

---

### `RevenueChart`

**File**: `src/components/superadmin/RevenueChart.tsx`

**Purpose**: Wrapper around `LineChartComponent` or `AreaChartComponent` for the revenue/MRR trend. Accepts the `monthly` array from `GET /api/superadmin/revenue` and maps it to `{ month: string, mrr: number }` for the chart.

**Props**:
```ts
interface RevenueChartProps {
  monthly: Array<{ _id: { year: number; month: number }; revenue: number; invoiceCount: number }>;
  loading?: boolean;
}
```

---

### `SupportQueue`

**File**: `src/components/superadmin/SupportQueue.tsx`

**Purpose**: The left-panel ticket list on `/superadmin/support`. Scrollable list of clickable ticket buttons with subject, school, priority, status, and relative time.

**Props**:
```ts
interface SupportQueueProps {
  tickets: SupportTicket[];
  selectedId: string;
  onSelect: (ticket: SupportTicket) => void;
  loading?: boolean;
}
```

---

### `TicketThread`

**File**: `src/components/superadmin/TicketThread.tsx`

**Purpose**: The right-panel detail view on `/superadmin/support`. Renders the ticket header, scrollable message thread, and reply textarea.

**Props**:
```ts
interface TicketThreadProps {
  ticket: SupportTicket;
  onReply: (message: string, isInternal?: boolean) => Promise<void>;
  onStatusChange: (status: SupportTicket['status']) => Promise<void>;
  onAssign: (userId: string) => Promise<void>;
}
```

---

### `OnboardingWizard`

**File**: `src/components/superadmin/OnboardingWizard.tsx`

**Purpose**: Extract the 5-step wizard from `onboard/page.tsx` into a standalone component for testability and reuse.

**Props**:
```ts
interface OnboardingWizardProps {
  onComplete: (data: WizardData) => Promise<void>;
}
```

Manages internal `step` and `data` state. On `onComplete` the parent page handles the API call and navigates to the success screen.

---

### `SuspendTenantDialog`

**File**: `src/components/superadmin/SuspendTenantDialog.tsx`

**Purpose**: Dialog/modal to confirm tenant suspension with a required reason field. Currently the page calls `toast.success` directly without prompting for a reason — this component fills that gap.

**Props**:
```ts
interface SuspendTenantDialogProps {
  tenant: Tenant;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}
```

---

### `GenerateInvoiceDialog`

**File**: `src/components/superadmin/GenerateInvoiceDialog.tsx`

**Purpose**: Modal for creating a new platform invoice. Dynamic line-items table (add/remove rows), tax field, due date picker, status selector.

**Props**:
```ts
interface GenerateInvoiceDialogProps {
  tenants: Tenant[];
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GeneratePlatformInvoiceInput) => Promise<void>;
}
```

---

### `ModuleToggleGrid`

**File**: `src/components/superadmin/ModuleToggleGrid.tsx`

**Purpose**: Reusable grid of `Checkbox` + label cards for module selection. Used on both the onboard wizard (step 2) and tenant detail page.

**Props**:
```ts
interface ModuleToggleGridProps {
  selected: string[];
  onChange: (modules: string[]) => void;
  disabled?: boolean;
}
```

---

## 8. Integration Notes

### SuperAdmin is the parent context for all Schools

A school does not exist on the platform commercially until a `Tenant` document is created for it. The `Tenant` record is the authoritative source for:
- Lifecycle status (`trial`, `active`, `suspended`, `cancelled`)
- Subscription details (tier, price, billing cycle)
- Feature flags (`modulesEnabled`) — these are the server-side gating mechanism; school admins cannot self-enable modules
- Usage limits (`maxStudents`, `maxStaff`) — the student and staff modules should check these before creating records

### Onboarding is a multi-step API chain

The onboard wizard collects data that must be split across multiple API calls in order:
1. `POST /api/schools` — create the School document (School module)
2. `POST /api/auth/register` or similar — create the initial admin User (Auth/User module)
3. `POST /api/superadmin/tenants/onboard` — create the Tenant with the `schoolId` from step 1

The frontend wizard currently handles this as a single `toast.success` with no API calls. The real submission handler must chain these calls and roll back (or report errors) if any step fails.

### Module gating

The `modulesEnabled` array on the `Tenant` document is the server-side feature gate. Each module's router or service layer should check whether the requesting school's tenant has that module enabled before processing requests. The SuperAdmin module is the only one that can modify `modulesEnabled` (via `PATCH /api/superadmin/tenants/:id/modules`).

### Priority type mismatch

The backend uses `'medium'` as a priority value; the frontend `SupportTicket` type and `PRIORITY_STYLES` map use `'normal'`. These must be aligned — recommend updating the frontend type to `'medium'` to match the backend enum.

### Monetary values

Backend monetary values (subscription `price`, invoice `amount`/`total`) are stored as floating-point numbers (not cents). The frontend `Tenant.mrr` and `PlatformStats` fields store values in cents. An adapter layer in the API client must handle this conversion consistently.

### Soft-delete pattern

All three collections use `isDeleted: false` as the base filter in every query. There are no hard-delete endpoints. If a school is permanently removed it must be done at the database level.

### Authentication

The `raisedBy` field on `SupportTicket` is set server-side from `req.user.id` — the authenticated user's ObjectId. The frontend does not send this field.

### No tenant-facing ticket creation

In the current implementation, only users with the `super_admin` role can call `POST /api/superadmin/tickets`. If school admin users need to raise support tickets, a separate endpoint with broader role authorisation will be required.

---

## 9. Acceptance Criteria

### Platform Dashboard

- [ ] `GET /api/superadmin/stats` is called on page mount and data is displayed in the four stat cards
- [ ] MRR Trend chart renders with real monthly data from `GET /api/superadmin/revenue`
- [ ] Schools by Tier pie chart reflects live tenant tier distribution
- [ ] All stats show loading skeletons while fetching and error states on failure

### Schools List

- [ ] All tenants are fetched from `GET /api/superadmin/tenants` with default pagination
- [ ] Status filter sends `?status=<value>` to the API (not just client-side filtering)
- [ ] Search input debounces and sends `?search=<value>` to the API
- [ ] Status and tier badges render with the correct colour for all four/three enum values
- [ ] MRR shows "—" for `trial` and `suspended` tenants
- [ ] "Onboard School" button navigates to `/superadmin/onboard`
- [ ] Row "View Details" navigates to `/superadmin/schools/:id`
- [ ] Suspend/Activate row action opens `SuspendTenantDialog` (if suspending) or calls `PATCH /api/superadmin/tenants/:id/status` directly (if activating)

### Tenant Detail

- [ ] `GET /api/superadmin/tenants/:id` is called on mount using the route param
- [ ] `GET /api/superadmin/tenants/:tenantId/invoices` populates the Billing History section
- [ ] Module checkboxes reflect `modulesEnabled` from the API and call `PATCH /api/superadmin/tenants/:id/modules` on change
- [ ] "Suspend School" opens `SuspendTenantDialog`; on confirm calls `POST /api/superadmin/tenants/:id/suspend` with the reason
- [ ] "Activate School" calls `PATCH /api/superadmin/tenants/:id/status` with `{ status: 'active' }` and shows a success toast
- [ ] 404 state is shown if the tenant is not found

### Onboarding Wizard

- [ ] All 5 steps are navigable forward and backward
- [ ] Clicking a completed step circle navigates back to it
- [ ] Required fields are validated before advancing each step
- [ ] School Details step populates province from `SA_PROVINCES` list
- [ ] Modules step defaults to `fees` and `communication` pre-selected
- [ ] Subscription step shows correct prices and descriptions for all three tiers
- [ ] Review step accurately displays all entered data before submission
- [ ] On submit, the API call chain (School → User → Tenant onboard) executes in order
- [ ] Success screen appears with school name and tier; "Onboard Another" resets the wizard
- [ ] Any API error shows an inline error message and does not navigate away

### Billing

- [ ] Revenue stats (MRR, ARR, Outstanding) are populated from the API
- [ ] Invoice table lists all platform invoices across tenants
- [ ] Status filter on the invoice table filters by `status`
- [ ] "Generate Invoices" opens `GenerateInvoiceDialog`; on submit calls `POST /api/superadmin/invoices`
- [ ] New invoice appears in the table after successful creation
- [ ] Invoice status badges render with the correct colour for all four values

### Support Tickets

- [ ] Ticket list is populated from `GET /api/superadmin/tickets`
- [ ] Selecting a ticket in the left panel fetches `GET /api/superadmin/tickets/:id` and renders the thread
- [ ] Reply textarea is disabled for `closed` tickets
- [ ] Sending a reply calls `POST /api/superadmin/tickets/:id/reply` and appends the new message to the thread
- [ ] After first reply, ticket status auto-advances to `in_progress` (reflected in the left panel badge)
- [ ] Status can be changed via a dropdown; `resolved` stamps `resolvedAt`
- [ ] Assign action calls `PATCH /api/superadmin/tickets/:id/assign` and shows the assigned user name in the header
- [ ] Priority `medium` renders correctly (frontend type updated from `normal` to `medium`)

### General

- [ ] All SuperAdmin pages are inaccessible to users with any role other than `super_admin` (protected by layout-level role check)
- [ ] API errors surface as `toast.error` notifications with the message from the server response
- [ ] All monetary values are displayed in South African Rands using the `formatCurrency` util
- [ ] Pagination controls are present on the tenant list, invoice list, and ticket list
