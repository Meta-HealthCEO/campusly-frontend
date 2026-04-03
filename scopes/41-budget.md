# 41 — Budget Management

## 1. Module Overview

The Budget Management module provides comprehensive financial planning and tracking for South African schools. It covers annual budget creation with categorized line items, real-time budget vs actual tracking, expense recording with approval workflows, variance analysis, cash flow projections, and multi-year comparisons.

This module is tightly coupled with the Fee module (Scope 05) for income tracking and provides the expenditure data consumed by the SGB Portal (Scope 40). It is an admin-facing module — teachers/staff interact only through the expense submission workflow.

### Core Capabilities

| Capability | Description |
|---|---|
| Annual Budget | Create budgets with line items per category and subcategory |
| Budget vs Actual | Real-time tracking — actuals pulled from fee payments (income) and recorded expenses (expenditure) |
| Expense Recording | Record non-fee expenses: maintenance, supplies, utilities, service providers |
| Expense Categories | Hierarchical categories and subcategories for expense classification |
| Expense Approval | Teacher/staff submits → admin/bursar approves → recorded against budget |
| Monthly/Quarterly Reports | Period-level budget performance summaries |
| Variance Analysis | Over/under budget per category with percentage and absolute values |
| Cash Flow Projection | Expected fee collection vs planned expenses over time |
| Multi-Year Comparison | Side-by-side budget comparison across financial years |
| Export | Excel export for board reporting |
| Budget Alerts | Notifications when a category exceeds 80% or 100% of budget |

### Roles and Access

| Role | Access |
|---|---|
| `school_admin` | Full read/write — create budgets, approve expenses, manage categories, view all reports |
| `super_admin` | Full access across all schools |
| `teacher` | Submit expense claims, view own claim status |
| `staff` | Submit expense claims, view own claim status |
| `sgb_member` | Read-only via SGB Portal (Scope 40) — no direct access to this module |

All monetary values are stored and transmitted as **integers in cents** (e.g., R10,000.00 = `1000000`). All collections use soft-delete (`isDeleted: boolean`).

---

## 2. Backend API Endpoints

All routes are mounted under `/api/budget`. Authentication is required on every route via the `authenticate` middleware.

---

### 2.1 Budget Categories

#### POST /api/budget/categories

Create an expense category or subcategory.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "name": "Maintenance & Repairs",
  "code": "MAINT",
  "parentId": null,
  "description": "Building and grounds maintenance costs",
  "isDefault": false
}
```

**Validation:** `createCategorySchema` (Zod)
- `name`: required, min 1 char, trimmed
- `code`: required, min 1 char, uppercase, unique within school
- `parentId`: optional, ObjectId — if set, this becomes a subcategory
- `description`: optional
- `isDefault`: optional, boolean — pre-seeded categories are marked default

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664b2g3h4i5j6k7l8m9n0o1p",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "name": "Maintenance & Repairs",
    "code": "MAINT",
    "parentId": null,
    "description": "Building and grounds maintenance costs",
    "isDefault": false,
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z",
    "updatedAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Budget category created successfully"
}
```

---

#### GET /api/budget/categories

List all categories for the school, with subcategories nested.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664b2g3h...",
      "name": "Salaries & Wages",
      "code": "SAL",
      "parentId": null,
      "children": [
        { "_id": "664b2g3i...", "name": "Teaching Staff", "code": "SAL-TEACH", "parentId": "664b2g3h..." },
        { "_id": "664b2g3j...", "name": "Support Staff", "code": "SAL-SUPP", "parentId": "664b2g3h..." }
      ]
    },
    {
      "_id": "664b2g3k...",
      "name": "Maintenance & Repairs",
      "code": "MAINT",
      "parentId": null,
      "children": []
    }
  ],
  "message": "Budget categories retrieved successfully"
}
```

---

#### PUT /api/budget/categories/:id

Update a category (name, code, description, isActive).

**Auth:** `school_admin`, `super_admin`

---

#### DELETE /api/budget/categories/:id

Soft-delete a category. Fails if the category has expenses or budget line items linked to it.

**Auth:** `school_admin`, `super_admin`

---

#### POST /api/budget/categories/seed

Seed default categories for a school. Creates standard South African school budget categories if none exist.

**Auth:** `school_admin`, `super_admin`

**Request body:** `{ "schoolId": "..." }`

**Default categories seeded:**
| Code | Name |
|---|---|
| SAL | Salaries & Wages |
| SAL-TEACH | Teaching Staff |
| SAL-SUPP | Support Staff |
| SAL-ADMIN | Administrative Staff |
| MAINT | Maintenance & Repairs |
| MAINT-BLDG | Building Maintenance |
| MAINT-GRND | Grounds Maintenance |
| SUPP | Supplies & Materials |
| SUPP-EDUC | Educational Supplies |
| SUPP-OFFICE | Office Supplies |
| UTIL | Utilities |
| UTIL-ELEC | Electricity |
| UTIL-WATER | Water & Sewage |
| UTIL-COMM | Communications (Internet, Phone) |
| TRANS | Transport |
| EVENTS | Events & Functions |
| SPORT | Sport & Extramurals |
| PROF | Professional Services |
| PROF-AUDIT | Audit Fees |
| PROF-LEGAL | Legal Fees |
| INSUR | Insurance |
| DEPR | Depreciation |
| OTHER | Other Expenses |

---

### 2.2 Annual Budget

#### POST /api/budget/budgets

Create an annual budget with line items.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "year": 2026,
  "name": "2026 Annual Operating Budget",
  "description": "Approved by SGB on 15 March 2026",
  "lineItems": [
    {
      "categoryId": "664b2g3h...",
      "description": "Teaching staff salaries (15 educators)",
      "annualAmount": 450000000,
      "termAmounts": [112500000, 112500000, 112500000, 112500000],
      "notes": "Includes 5% increase from July"
    },
    {
      "categoryId": "664b2g3k...",
      "description": "General building maintenance",
      "annualAmount": 12000000,
      "termAmounts": [3000000, 3000000, 3000000, 3000000],
      "notes": null
    }
  ]
}
```

**Validation:** `createBudgetSchema` (Zod)
- `year`: required, number, min 2020
- `name`: required, min 1 char
- `lineItems`: required, array min 1
  - `categoryId`: required, ObjectId
  - `annualAmount`: required, positive integer (cents)
  - `termAmounts`: optional, array of 4 integers (must sum to annualAmount)
  - `description`: optional
  - `notes`: optional

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664c3h4i5j6k7l8m9n0o1p2q",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "year": 2026,
    "name": "2026 Annual Operating Budget",
    "description": "Approved by SGB on 15 March 2026",
    "status": "draft",
    "totalBudgeted": 462000000,
    "lineItems": [
      {
        "_id": "664c3h4i...",
        "categoryId": { "_id": "664b2g3h...", "name": "Teaching Staff", "code": "SAL-TEACH" },
        "description": "Teaching staff salaries (15 educators)",
        "annualAmount": 450000000,
        "termAmounts": [112500000, 112500000, 112500000, 112500000],
        "actualAmount": 0,
        "notes": "Includes 5% increase from July"
      }
    ],
    "createdBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z",
    "updatedAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Budget created successfully"
}
```

---

#### GET /api/budget/budgets

List all budgets for the school.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `year`, `status` (`draft` | `approved` | `revised`), `page`, `limit`

---

#### GET /api/budget/budgets/:id

Get a single budget with all line items, populated category names, and current actual amounts.

**Auth:** `school_admin`, `super_admin`

---

#### PUT /api/budget/budgets/:id

Update a budget (name, description, status, lineItems).

**Auth:** `school_admin`, `super_admin`

**Note:** Updating `status` to `approved` is a one-way action that locks the budget from further line item modifications. A `revised` budget can be created as a new version.

---

#### DELETE /api/budget/budgets/:id

Soft-delete a budget. Only `draft` budgets can be deleted.

**Auth:** `school_admin`, `super_admin`

---

### 2.3 Expenses

#### POST /api/budget/expenses

Record a new expense.

**Auth:** `school_admin`, `super_admin`, `teacher`, `staff` (teacher/staff submissions enter approval workflow)

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "categoryId": "664b2g3k...",
  "budgetId": "664c3h4i5j6k7l8m9n0o1p2q",
  "amount": 350000,
  "description": "Plumbing repair — boys' bathroom Block B",
  "vendor": "ABC Plumbing Services",
  "invoiceNumber": "INV-2026-0042",
  "invoiceDate": "2026-03-28",
  "paymentMethod": "eft",
  "receiptUrl": null,
  "term": 1,
  "notes": "Emergency repair — pipe burst"
}
```

**Validation:** `createExpenseSchema` (Zod)
- `categoryId`: required, ObjectId
- `budgetId`: optional, ObjectId — links to a budget line item
- `amount`: required, positive integer (cents)
- `description`: required, min 1 char
- `vendor`: optional
- `invoiceNumber`: optional
- `invoiceDate`: optional, ISO date string
- `paymentMethod`: optional, enum: `cash` | `eft` | `card` | `debit_order` | `cheque` | `other`
- `receiptUrl`: optional, string (file upload path)
- `term`: optional, number 1-4
- `notes`: optional

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664d4i5j6k7l8m9n0o1p2q3r",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "categoryId": { "_id": "664b2g3k...", "name": "Maintenance & Repairs", "code": "MAINT" },
    "budgetId": "664c3h4i5j6k7l8m9n0o1p2q",
    "amount": 350000,
    "description": "Plumbing repair — boys' bathroom Block B",
    "vendor": "ABC Plumbing Services",
    "invoiceNumber": "INV-2026-0042",
    "invoiceDate": "2026-03-28T00:00:00.000Z",
    "paymentMethod": "eft",
    "receiptUrl": null,
    "term": 1,
    "notes": "Emergency repair — pipe burst",
    "status": "approved",
    "submittedBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "approvedBy": null,
    "approvedAt": null,
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z",
    "updatedAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Expense recorded successfully"
}
```

**Note:** When `school_admin` or `super_admin` creates an expense, it is auto-approved (`status: 'approved'`). When `teacher` or `staff` creates an expense, it enters `status: 'pending'`.

---

#### GET /api/budget/expenses

List expenses with filters.

**Auth:** `school_admin`, `super_admin` (sees all), `teacher`, `staff` (sees own only)

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Falls back to `req.user.schoolId` |
| `categoryId` | string | Filter by category |
| `budgetId` | string | Filter by budget |
| `status` | string | `pending` | `approved` | `rejected` |
| `term` | number | Term 1-4 |
| `startDate` | string | ISO date — expenses from this date |
| `endDate` | string | ISO date — expenses until this date |
| `page` | number | Default 1 |
| `limit` | number | Default 20 |

---

#### GET /api/budget/expenses/:id

Get a single expense detail.

---

#### PUT /api/budget/expenses/:id

Update an expense. Only `pending` or `rejected` expenses can be edited by the submitter. Admins can edit any non-deleted expense.

**Auth:** `school_admin`, `super_admin`, or the original submitter (if pending/rejected)

---

#### DELETE /api/budget/expenses/:id

Soft-delete an expense.

**Auth:** `school_admin`, `super_admin`

---

#### POST /api/budget/expenses/:id/approve

Approve a pending expense claim.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "notes": "Approved — within emergency maintenance budget"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "664d4i5j...",
    "status": "approved",
    "approvedBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "approvedAt": "2026-04-02T09:00:00.000Z",
    "approvalNotes": "Approved — within emergency maintenance budget"
  },
  "message": "Expense approved successfully"
}
```

---

#### POST /api/budget/expenses/:id/reject

Reject a pending expense claim.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "reason": "Exceeds budget allocation — please get 3 quotes first"
}
```

---

#### POST /api/budget/expenses/upload-receipt

Upload a receipt/invoice image or PDF for an expense.

**Auth:** `school_admin`, `super_admin`, `teacher`, `staff`

**Content-Type:** `multipart/form-data`

**Field:** `receipt` (JPEG, PNG, PDF; max 5MB)

**Response (200):**
```json
{
  "success": true,
  "data": { "url": "/uploads/budget/receipts/uuid.pdf" },
  "message": "Receipt uploaded successfully"
}
```

---

### 2.4 Budget Reports

#### GET /api/budget/reports/variance

Budget vs actual variance analysis per category.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `budgetId`, `term` (optional — if omitted, returns annual)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "budgetId": "664c3h4i...",
    "year": 2026,
    "term": null,
    "totalBudgeted": 462000000,
    "totalActual": 198500000,
    "totalVariance": 263500000,
    "categories": [
      {
        "categoryId": "664b2g3h...",
        "categoryName": "Teaching Staff",
        "categoryCode": "SAL-TEACH",
        "budgeted": 450000000,
        "actual": 187500000,
        "variance": 262500000,
        "variancePercent": 58.3,
        "utilizationPercent": 41.7,
        "status": "under_budget"
      },
      {
        "categoryId": "664b2g3k...",
        "categoryName": "Maintenance & Repairs",
        "categoryCode": "MAINT",
        "budgeted": 12000000,
        "actual": 11000000,
        "variance": 1000000,
        "variancePercent": 8.3,
        "utilizationPercent": 91.7,
        "status": "warning"
      }
    ]
  },
  "message": "Variance report generated successfully"
}
```

**Status rules:** `under_budget` (< 80%), `warning` (80-99%), `over_budget` (>= 100%).

---

#### GET /api/budget/reports/monthly

Monthly income and expenditure breakdown.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `year`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "months": [
      {
        "month": 1,
        "label": "January",
        "income": 45000000,
        "expenditure": 38000000,
        "surplus": 7000000,
        "cumulativeIncome": 45000000,
        "cumulativeExpenditure": 38000000
      }
    ]
  }
}
```

---

#### GET /api/budget/reports/cashflow

Cash flow projection based on expected fee collection schedule and planned expenses.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `budgetId`, `months` (number of months to project, default 6)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "currentBalance": 55000000,
    "projections": [
      {
        "month": "2026-04",
        "expectedIncome": 42000000,
        "plannedExpenditure": 39000000,
        "projectedBalance": 58000000
      },
      {
        "month": "2026-05",
        "expectedIncome": 40000000,
        "plannedExpenditure": 39500000,
        "projectedBalance": 58500000
      }
    ]
  }
}
```

---

#### GET /api/budget/reports/comparison

Multi-year budget comparison.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `years` (comma-separated, e.g. `2024,2025,2026`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "years": [2024, 2025, 2026],
    "categories": [
      {
        "categoryName": "Salaries & Wages",
        "values": [
          { "year": 2024, "budgeted": 380000000, "actual": 375000000 },
          { "year": 2025, "budgeted": 420000000, "actual": 418000000 },
          { "year": 2026, "budgeted": 462000000, "actual": 187500000 }
        ]
      }
    ],
    "totals": [
      { "year": 2024, "budgeted": 520000000, "actual": 508000000 },
      { "year": 2025, "budgeted": 580000000, "actual": 572000000 },
      { "year": 2026, "budgeted": 650000000, "actual": 285000000 }
    ]
  }
}
```

---

#### GET /api/budget/reports/export

Export budget report to Excel.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `budgetId`, `format` (`xlsx`)

**Response:** File stream with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="budget-2026.xlsx"`.

---

### 2.5 Budget Alerts

#### GET /api/budget/alerts

Get active budget alerts for the school.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `budgetId`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "categoryId": "664b2g3k...",
      "categoryName": "Maintenance & Repairs",
      "categoryCode": "MAINT",
      "budgeted": 12000000,
      "actual": 11000000,
      "utilizationPercent": 91.7,
      "alertLevel": "warning",
      "message": "Maintenance & Repairs has used 91.7% of its annual budget"
    }
  ],
  "message": "Budget alerts retrieved successfully"
}
```

**Alert levels:** `warning` (>= 80%), `critical` (>= 100%).

---

## 3. Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/admin/budget` | Budget Dashboard | Overview cards, variance summary, alerts, quick links |
| `/admin/budget/setup` | Budget Setup | Create/edit annual budget with line items |
| `/admin/budget/categories` | Categories | Manage expense categories and subcategories |
| `/admin/budget/expenses` | Expense Tracker | Record, list, and manage expenses |
| `/admin/budget/expenses/approval` | Expense Approval | Queue of pending expense claims (admin/bursar) |
| `/admin/budget/reports` | Budget Reports | Variance analysis, monthly reports, cash flow, multi-year comparison |
| `/admin/budget/reports/export` | Export | Export configuration and download |

The admin nav entry is `{ label: 'Budget', href: '/admin/budget', icon: Calculator }` — placed under the Finance section of the admin sidebar.

---

## 4. User Flows

### 4.1 Create Annual Budget
1. Admin navigates to `/admin/budget/setup` → clicks **New Budget**.
2. Enters year, name, and optional description.
3. For each budget category, admin adds a line item with annual amount.
4. Optionally breaks annual amount into term amounts (T1-T4).
5. Running total is shown at the bottom.
6. Submits → `POST /api/budget/budgets` with status `draft`.
7. Admin reviews the draft, then clicks **Approve Budget** → `PUT /api/budget/budgets/:id` with `status: 'approved'`.

### 4.2 Seed Default Categories
1. First-time setup: admin navigates to `/admin/budget/categories`.
2. If no categories exist, a prompt shows "Seed default South African school categories?"
3. Admin clicks **Seed Categories** → `POST /api/budget/categories/seed`.
4. Default categories appear in the list. Admin can edit/add as needed.

### 4.3 Record an Expense (Admin)
1. Admin navigates to `/admin/budget/expenses` → clicks **New Expense**.
2. Dialog opens: Category (select), Amount, Description, Vendor, Invoice Number, Invoice Date, Payment Method, Term.
3. Optionally uploads a receipt → `POST /api/budget/expenses/upload-receipt`.
4. Submits → `POST /api/budget/expenses` — auto-approved.
5. Expense appears in the list. Budget vs actual updates automatically.

### 4.4 Submit Expense Claim (Teacher/Staff)
1. Teacher navigates to an expense claim page (accessible from their profile or a "Submit Claim" link).
2. Fills in the expense form: Category, Amount, Description, Vendor, Receipt upload.
3. Submits → `POST /api/budget/expenses` — status `pending`.
4. Teacher sees their claim in a "My Claims" list with status badge.
5. Admin receives the claim in the approval queue.

### 4.5 Approve/Reject Expense Claim
1. Admin navigates to `/admin/budget/expenses/approval`.
2. Sees a list of pending claims with submitter name, amount, category, description.
3. Clicks a claim → views detail with receipt.
4. Clicks **Approve** (with optional notes) → `POST /api/budget/expenses/:id/approve`.
5. Or clicks **Reject** (with required reason) → `POST /api/budget/expenses/:id/reject`.
6. Submitter is notified of the decision.

### 4.6 View Variance Report
1. Admin navigates to `/admin/budget/reports`.
2. Selects the budget year and optionally a specific term.
3. Page loads `GET /api/budget/reports/variance`.
4. Table shows each category with budgeted vs actual, variance amount/percent, utilization bar.
5. Categories over 80% are highlighted with warning styling; over 100% with destructive.
6. A Recharts bar chart shows the top categories by utilization.

### 4.7 Export Budget Report
1. Admin clicks **Export to Excel** on any report page.
2. Dialog confirms the export scope (budget year, format).
3. Frontend calls `GET /api/budget/reports/export?budgetId=...&format=xlsx`.
4. Browser downloads the Excel file.

---

## 5. Data Models

### 5.1 BudgetCategory
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `name` | string | yes | Trimmed |
| `code` | string | yes | Uppercase, unique within school |
| `parentId` | ObjectId → BudgetCategory | no | Null for top-level categories |
| `description` | string | no | |
| `isDefault` | boolean | no | Default `false` — seeded categories are `true` |
| `isActive` | boolean | no | Default `true` |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, code }` (unique), `{ schoolId, parentId }`

---

### 5.2 Budget
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `year` | number | yes | Financial year |
| `name` | string | yes | |
| `description` | string | no | |
| `status` | enum | yes | `draft` | `approved` | `revised` |
| `totalBudgeted` | number | yes | Sum of all line item annualAmounts (cents) |
| `lineItems` | array | yes | See sub-schema below |
| `createdBy` | ObjectId → User | yes | |
| `approvedBy` | ObjectId → User | no | Set when status changes to approved |
| `approvedAt` | Date | no | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Line item sub-schema:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `categoryId` | ObjectId → BudgetCategory | yes | |
| `description` | string | no | Specific line item description |
| `annualAmount` | number | yes | Budgeted amount in cents |
| `termAmounts` | number[4] | no | Per-term breakdown; must sum to annualAmount |
| `notes` | string | no | |

**Indexes:** `{ schoolId, year }`, `{ schoolId, status }`

---

### 5.3 Expense
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `categoryId` | ObjectId → BudgetCategory | yes | |
| `budgetId` | ObjectId → Budget | no | Links expense to a budget |
| `amount` | number | yes | Positive integer in cents |
| `description` | string | yes | |
| `vendor` | string | no | Supplier/service provider name |
| `invoiceNumber` | string | no | External invoice reference |
| `invoiceDate` | Date | no | |
| `paymentMethod` | enum | no | `cash` | `eft` | `card` | `debit_order` | `cheque` | `other` |
| `receiptUrl` | string | no | Path to uploaded receipt file |
| `term` | number | no | 1-4 |
| `notes` | string | no | |
| `status` | enum | yes | `pending` | `approved` | `rejected` |
| `submittedBy` | ObjectId → User | yes | |
| `approvedBy` | ObjectId → User | no | |
| `approvedAt` | Date | no | |
| `approvalNotes` | string | no | Admin notes on approval/rejection |
| `rejectionReason` | string | no | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, categoryId }`, `{ schoolId, status }`, `{ schoolId, createdAt DESC }`, `{ submittedBy, status }`

---

## 6. State Management

### 6.1 Hook: `useBudgetCategories`
Located at `src/hooks/useBudgetCategories.ts`. Fetches and manages expense categories.

```ts
interface BudgetCategoriesState {
  categories: BudgetCategory[];
  flatCategories: BudgetCategory[]; // flattened for select dropdowns
  loading: boolean;
  fetchCategories: () => Promise<void>;
  createCategory: (data: CreateCategoryPayload) => Promise<BudgetCategory>;
  updateCategory: (id: string, data: Partial<BudgetCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  seedCategories: () => Promise<void>;
}
```

### 6.2 Hook: `useBudget`
Located at `src/hooks/useBudget.ts`. CRUD for annual budgets.

```ts
interface BudgetState {
  budgets: Budget[];
  activeBudget: Budget | null;
  loading: boolean;
  fetchBudgets: (year?: number) => Promise<void>;
  fetchBudget: (id: string) => Promise<void>;
  createBudget: (data: CreateBudgetPayload) => Promise<Budget>;
  updateBudget: (id: string, data: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}
```

### 6.3 Hook: `useExpenses`
Located at `src/hooks/useExpenses.ts`. Expense recording, listing, and approval.

```ts
interface ExpensesState {
  expenses: Expense[];
  pendingExpenses: Expense[];
  loading: boolean;
  total: number;
  fetchExpenses: (filters?: ExpenseFilters) => Promise<void>;
  fetchPendingExpenses: () => Promise<void>;
  createExpense: (data: CreateExpensePayload) => Promise<Expense>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  approveExpense: (id: string, notes?: string) => Promise<void>;
  rejectExpense: (id: string, reason: string) => Promise<void>;
  uploadReceipt: (file: File) => Promise<string>;
}
```

### 6.4 Hook: `useBudgetReports`
Located at `src/hooks/useBudgetReports.ts`. Report data fetching.

```ts
interface BudgetReportsState {
  variance: VarianceReport | null;
  monthly: MonthlyReport | null;
  cashflow: CashFlowReport | null;
  comparison: ComparisonReport | null;
  alerts: BudgetAlert[];
  loading: boolean;
  fetchVariance: (budgetId: string, term?: number) => Promise<void>;
  fetchMonthly: (year: number) => Promise<void>;
  fetchCashflow: (budgetId: string, months?: number) => Promise<void>;
  fetchComparison: (years: number[]) => Promise<void>;
  fetchAlerts: (budgetId: string) => Promise<void>;
  exportReport: (budgetId: string) => Promise<void>;
}
```

---

## 7. Components Needed

### 7.1 Page Components

| Component | File | Description |
|---|---|---|
| `BudgetDashboardPage` | `src/app/(dashboard)/admin/budget/page.tsx` | Overview with summary cards, alerts, variance preview |
| `BudgetSetupPage` | `src/app/(dashboard)/admin/budget/setup/page.tsx` | Create/edit budget with line items |
| `CategoriesPage` | `src/app/(dashboard)/admin/budget/categories/page.tsx` | Manage categories |
| `ExpensesPage` | `src/app/(dashboard)/admin/budget/expenses/page.tsx` | Expense list and recording |
| `ExpenseApprovalPage` | `src/app/(dashboard)/admin/budget/expenses/approval/page.tsx` | Pending claims queue |
| `BudgetReportsPage` | `src/app/(dashboard)/admin/budget/reports/page.tsx` | All report views (tabbed) |

### 7.2 Module Components (in `src/components/budget/`)

| Component | Props / Responsibilities |
|---|---|
| `BudgetSummaryCards` | 4 StatCards: Total Budgeted, Total Spent, Remaining, Utilization %. Props: `budget: Budget, totalExpenses: number` |
| `BudgetAlertBanner` | Renders active alerts as warning/destructive banners. Props: `alerts: BudgetAlert[]` |
| `BudgetLineItemEditor` | Editable table of budget line items with category select, amount input, term breakdown. Used in BudgetSetupPage. |
| `LineItemRow` | Single line item row with category, description, annual amount, T1-T4, and actions. |
| `CategoryTree` | Hierarchical list of categories with parent/child indentation. Used in CategoriesPage. |
| `CategoryFormDialog` | Dialog to create/edit a category. Fields: Name, Code, Parent (select), Description. |
| `ExpenseList` | DataTable of expenses. Columns: Date, Category, Description, Amount, Vendor, Status, Actions. |
| `ExpenseFormDialog` | Dialog to create/edit an expense. Fields: Category, Amount, Description, Vendor, Invoice #, Date, Payment Method, Term, Receipt upload. |
| `ExpenseApprovalCard` | Card showing pending expense detail with receipt preview, Approve/Reject buttons. |
| `ReceiptUpload` | File upload component for receipt images/PDFs. |
| `VarianceTable` | Table showing budgeted vs actual per category with variance amount, percent, and utilization bar. |
| `VarianceChart` | Recharts horizontal bar chart of top categories by budget utilization. |
| `MonthlyReportChart` | Recharts bar chart — monthly income vs expenditure with cumulative line overlay. |
| `CashFlowChart` | Recharts area chart showing projected balance over time. |
| `MultiYearComparisonChart` | Recharts grouped bar chart comparing budgets across years. |
| `ExportDialog` | Dialog to configure and trigger Excel export. |

### 7.3 Shared Components to Reuse

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | Page titles and action buttons |
| `StatCard` | `src/components/shared/StatCard` | Dashboard summary cards |
| `DataTable` | `src/components/shared/DataTable` | Expense list, category list |
| `EmptyState` | `src/components/shared/EmptyState` | No budgets, no expenses |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `Dialog` / `DialogContent` | `src/components/ui/dialog` | All form dialogs |
| `Badge` | `src/components/ui/badge` | Status badges (approved/pending/rejected) |
| `Select` / `SelectItem` | `src/components/ui/select` | Category, year, term filters |
| `Input` / `Label` / `Textarea` | `src/components/ui/` | Form fields |
| `Button` | `src/components/ui/button` | All CTAs |
| `Tabs` / `TabsList` | `src/components/ui/tabs` | Reports page tabs |

---

## 8. Integration Notes

### 8.1 Fee Module Integration
Income figures in budget reports are sourced from the `Payment` collection in the Fee module. The `GET /api/budget/reports/monthly` endpoint aggregates payments by month. This means the Fee module must be operational for meaningful income tracking.

### 8.2 SGB Portal Integration
The SGB Portal (Scope 40) consumes budget data via `GET /api/sgb/finance/summary`, which internally queries the Budget and Expense collections. The `budgetComparison` section of the SGB financial summary returns `null` if no approved budget exists for the requested year.

### 8.3 Payroll Integration
Salary expenses can be auto-created from payroll runs (Scope 42). When a payroll run is processed, the payroll module creates an expense entry in the "Salaries & Wages" category for each period. This avoids double-entry.

### 8.4 Monetary Values
All amounts in the API are integers in cents (ZAR). Frontend must format using `formatCurrency()` for display and convert user input (e.g., "3500.00") to cents before submission (`Math.round(parseFloat(value) * 100)`).

### 8.5 Budget Locking
Once a budget status is set to `approved`, line items cannot be modified. To make changes, admins create a `revised` version. The variance report always uses the most recently approved budget for comparison.

### 8.6 Expense Auto-Approval
Expenses created by `school_admin` or `super_admin` are auto-approved. The frontend should not show the approval queue to teacher/staff roles — they only see their own submissions in a "My Claims" view.

### 8.7 Excel Export
The backend uses a library like `exceljs` to generate the XLSX file. The export includes: budget summary, line items with actuals, variance per category, and a monthly breakdown sheet. The file is generated on-demand and streamed to the client.

### 8.8 Budget Alerts
Alerts are computed on-demand when `GET /api/budget/alerts` is called, comparing approved expenses against budget line items. A future enhancement could use BullMQ to run nightly checks and send email/push notifications when thresholds are crossed.

### 8.9 Term Amounts Validation
When `termAmounts` is provided in a budget line item, the sum of the four values must equal `annualAmount`. The backend validates this constraint and returns a 400 error with a clear message if the sums don't match.

---

## 9. Acceptance Criteria

### Categories
- [ ] Admin can create expense categories with name, code, and optional parent
- [ ] Categories display in a hierarchical tree with subcategories indented
- [ ] Admin can seed default South African school categories
- [ ] Admin can edit or deactivate categories
- [ ] Category codes are unique within a school

### Budget Setup
- [ ] Admin can create an annual budget with a name, year, and line items
- [ ] Each line item links to a category with an annual amount
- [ ] Optional term-level breakdown (T1-T4) validates sum equals annual amount
- [ ] Running total displays at the bottom of the line item editor
- [ ] Budget can be saved as draft or approved
- [ ] Approved budgets are locked from line item modifications

### Expenses
- [ ] Admin can record expenses with category, amount, vendor, invoice details, and receipt
- [ ] Admin-created expenses are auto-approved
- [ ] Teacher/staff can submit expense claims that enter pending status
- [ ] Admin can approve or reject pending claims with notes/reason
- [ ] Expense list supports filtering by category, status, term, and date range
- [ ] Receipt upload accepts JPEG, PNG, PDF up to 5MB

### Reports
- [ ] Variance report shows budgeted vs actual per category with variance amount and percent
- [ ] Categories over 80% utilization show warning styling
- [ ] Categories over 100% utilization show destructive styling
- [ ] Monthly report shows income vs expenditure per month with cumulative totals
- [ ] Cash flow projection shows expected balance over next N months
- [ ] Multi-year comparison shows side-by-side budgets for selected years
- [ ] All charts render correctly with Recharts

### Alerts
- [ ] Budget alerts show when categories exceed 80% or 100% of budget
- [ ] Alerts display on the budget dashboard with warning/critical badges

### Export
- [ ] Admin can export budget report as Excel file
- [ ] Excel contains budget summary, line items, variance, and monthly sheets

### General
- [ ] All monetary values display in Rands formatted from cents
- [ ] All pages have loading spinners and empty states
- [ ] All pages are mobile-responsive
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
