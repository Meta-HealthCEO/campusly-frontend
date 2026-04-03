# 42 — Payroll Integration

## 1. Module Overview

The Payroll module manages the complete payroll lifecycle for South African schools: staff salary records, monthly payroll calculations with SA tax compliance (PAYE, UIF, SDL), payslip generation, bulk bank file exports, and year-end tax certificate generation (IRP5/IT3a). It integrates with the Staff module for employee data, the Budget module for salary expense recording, and the Leave module for unpaid leave deductions.

South African payroll is governed by SARS (South African Revenue Service) tax tables, the Basic Conditions of Employment Act (BCEA), and the Unemployment Insurance Fund Act. This module implements the standard monthly payroll calculation:

**Gross Pay** = Basic Salary + Allowances
**Taxable Income** = Gross Pay - Pre-tax Deductions (pension, medical aid)
**PAYE** = Tax per SARS annual tax tables (divided by 12)
**UIF** = 1% of remuneration (employee contribution; employer contributes matching 1%)
**Net Pay** = Gross Pay - PAYE - UIF Employee - Post-tax Deductions

### Core Capabilities

| Capability | Description |
|---|---|
| Salary Records | Basic salary, allowances, deductions per staff member |
| Tax Configuration | SA tax year brackets, rebates, thresholds — configurable per tax year |
| Monthly Payroll Run | Draft → Review → Approved → Processed workflow |
| Payslip Generation | PDF payslip per employee per pay period |
| Bank File Export | Standard SA bank format (ACB/Bankserv) for bulk EFT |
| Leave Deduction | Unpaid leave days reduce salary proportionally |
| IRP5/IT3a Generation | Year-end tax certificates for SARS submission |
| Payroll History | Full audit trail of every payroll run |
| Cost-to-Company | Dashboard showing total employment cost per department |

### Roles and Access

| Role | Access |
|---|---|
| `school_admin` | Full read/write — configure salaries, run payroll, approve, export |
| `super_admin` | Full access across all schools |
| `teacher` / `staff` | View own payslip, view own salary details (limited) |

All monetary values are stored as **integers in cents** (ZAR). All collections use soft-delete (`isDeleted: boolean`).

---

## 2. Backend API Endpoints

All routes are mounted under `/api/payroll`. Authentication is required on every route.

---

### 2.1 Tax Configuration

#### GET /api/payroll/tax-tables

Get the active tax table configuration for a tax year.

**Auth:** `school_admin`, `super_admin`

**Query params:** `taxYear` (e.g., `2027` for March 2026 – February 2027)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "664a1f2e...",
    "taxYear": 2027,
    "brackets": [
      { "from": 0, "to": 23780000, "rate": 18, "baseAmount": 0 },
      { "from": 23780100, "to": 37060000, "rate": 26, "baseAmount": 4280400 },
      { "from": 37060100, "to": 51280000, "rate": 31, "baseAmount": 7733200 },
      { "from": 51280100, "to": 67310000, "rate": 36, "baseAmount": 12141400 },
      { "from": 67310100, "to": 85780000, "rate": 39, "baseAmount": 17912200 },
      { "from": 85780100, "to": 185720000, "rate": 41, "baseAmount": 25115500 },
      { "from": 185720100, "to": null, "rate": 45, "baseAmount": 66100900 }
    ],
    "rebates": {
      "primary": 1771400,
      "secondary": 978300,
      "tertiary": 326100
    },
    "taxThresholds": {
      "under65": 9560000,
      "age65to74": 14845800,
      "age75plus": 16614600
    },
    "uifRate": 1,
    "uifCeiling": 1778833,
    "sdlRate": 1,
    "medicalCredits": {
      "main": 36400,
      "firstDependant": 36400,
      "additionalDependant": 24500
    }
  },
  "message": "Tax table retrieved successfully"
}
```

All monetary values in cents. Tax brackets use annual amounts. Rates are percentages.

---

#### POST /api/payroll/tax-tables

Create or update tax table for a year (upsert by taxYear + schoolId).

**Auth:** `super_admin`

**Request body:** Full tax table configuration (same shape as response data).

---

### 2.2 Salary Records

#### POST /api/payroll/salaries

Create a salary record for a staff member.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "staffId": "664a1f2e3b4c5d6e7f8a9b0e",
  "basicSalary": 3500000,
  "allowances": [
    { "name": "Housing Allowance", "amount": 500000, "taxable": true },
    { "name": "Transport Allowance", "amount": 250000, "taxable": true },
    { "name": "Cell Phone Allowance", "amount": 50000, "taxable": true }
  ],
  "deductions": [
    { "name": "Pension Fund", "amount": 262500, "preTax": true },
    { "name": "Medical Aid", "amount": 350000, "preTax": true },
    { "name": "Union Fee", "amount": 15000, "preTax": false }
  ],
  "bankDetails": {
    "bankName": "FNB",
    "accountNumber": "62123456789",
    "branchCode": "250655",
    "accountType": "cheque"
  },
  "taxNumber": "1234567890",
  "uifNumber": "U1234567",
  "dateOfBirth": "1985-06-15",
  "startDate": "2023-01-15",
  "department": "Mathematics"
}
```

**Validation:** `createSalarySchema` (Zod)
- `staffId`: required, ObjectId
- `basicSalary`: required, positive integer (cents)
- `allowances`: optional array of `{ name, amount, taxable }`
- `deductions`: optional array of `{ name, amount, preTax }`
- `bankDetails`: required, `{ bankName, accountNumber, branchCode, accountType }`
- `accountType`: enum: `cheque` | `savings` | `transmission`
- `taxNumber`: optional, string (10 digits)
- `dateOfBirth`: required, ISO date
- `startDate`: required, ISO date

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664b2g3h...",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "staffId": { "_id": "664a1f2e...", "firstName": "Sarah", "lastName": "Nkosi", "email": "s.nkosi@school.com" },
    "basicSalary": 3500000,
    "grossPay": 4300000,
    "allowances": [...],
    "deductions": [...],
    "bankDetails": { "bankName": "FNB", "accountNumber": "****6789", "branchCode": "250655", "accountType": "cheque" },
    "taxNumber": "****7890",
    "uifNumber": "U1234567",
    "dateOfBirth": "1985-06-15T00:00:00.000Z",
    "startDate": "2023-01-15T00:00:00.000Z",
    "department": "Mathematics",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Salary record created successfully"
}
```

**Note:** `grossPay` is computed: `basicSalary + sum(allowances.amount)`. Bank account numbers and tax numbers are masked in list responses (last 4 digits only). Full details are returned only in individual GET responses to authorized users.

---

#### GET /api/payroll/salaries

List all salary records for the school.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `department`, `isActive`, `page`, `limit`

---

#### GET /api/payroll/salaries/:id

Get a single salary record (unmasked for admin).

**Auth:** `school_admin`, `super_admin`, or the staff member themselves (for own record)

---

#### PUT /api/payroll/salaries/:id

Update salary details (basic salary, allowances, deductions, bank details).

**Auth:** `school_admin`, `super_admin`

**Note:** Salary changes take effect from the next payroll run. A history entry is created to track the change.

---

#### GET /api/payroll/salaries/:id/history

Get salary change history for a staff member.

**Auth:** `school_admin`, `super_admin`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "changedAt": "2026-04-01T08:00:00.000Z",
      "changedBy": "664a1f2e...",
      "field": "basicSalary",
      "previousValue": 3200000,
      "newValue": 3500000,
      "reason": "Annual increase — April 2026"
    }
  ]
}
```

---

### 2.3 Payroll Runs

#### POST /api/payroll/runs

Create a new payroll run (draft).

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "month": 4,
  "year": 2026,
  "description": "April 2026 Monthly Payroll"
}
```

**Validation:** `createPayrollRunSchema` (Zod)
- `month`: required, 1-12
- `year`: required, min 2020
- `description`: optional

The backend:
1. Fetches all active salary records for the school.
2. For each staff member, calculates: gross pay, PAYE, UIF employee/employer, SDL, deductions, net pay.
3. Checks for unpaid leave days in the month and deducts proportionally.
4. Creates a `PayrollRun` document with `status: 'draft'` and an array of `payrollItems`.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664c3h4i...",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "month": 4,
    "year": 2026,
    "description": "April 2026 Monthly Payroll",
    "status": "draft",
    "totals": {
      "grossPay": 86000000,
      "totalPAYE": 15200000,
      "totalUIF": 860000,
      "totalUIFEmployer": 860000,
      "totalSDL": 860000,
      "totalDeductions": 12540000,
      "totalNetPay": 57400000,
      "employeeCount": 20
    },
    "items": [
      {
        "staffId": { "_id": "...", "firstName": "Sarah", "lastName": "Nkosi" },
        "basicSalary": 3500000,
        "allowances": 800000,
        "grossPay": 4300000,
        "unpaidLeaveDays": 0,
        "leaveDeduction": 0,
        "preTaxDeductions": 612500,
        "taxableIncome": 3687500,
        "paye": 664950,
        "uifEmployee": 43000,
        "uifEmployer": 43000,
        "postTaxDeductions": 15000,
        "netPay": 3264550
      }
    ],
    "createdBy": "664a1f2e...",
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Payroll run created successfully"
}
```

---

#### GET /api/payroll/runs

List payroll runs for the school.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `year`, `status` (`draft` | `reviewed` | `approved` | `processed`), `page`, `limit`

---

#### GET /api/payroll/runs/:id

Get a single payroll run with all items.

**Auth:** `school_admin`, `super_admin`

---

#### PUT /api/payroll/runs/:id/review

Mark a payroll run as reviewed.

**Auth:** `school_admin`, `super_admin`

**Request body:** `{ "reviewNotes": "Checked against leave records. All correct." }`

---

#### PUT /api/payroll/runs/:id/approve

Approve the payroll run.

**Auth:** `school_admin`, `super_admin`

---

#### PUT /api/payroll/runs/:id/process

Mark payroll as processed (payment done). Creates expense entries in the Budget module.

**Auth:** `school_admin`, `super_admin`

**Side effects:**
1. Updates status to `processed`.
2. Creates an `Expense` record in the Budget module per department (category: `SAL`) for the total salary cost.
3. Records processing date and user.

---

#### PUT /api/payroll/runs/:id/items/:itemId

Manually adjust a payroll item in a draft run (e.g., bonus, ad-hoc deduction).

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "adjustments": [
    { "name": "Performance Bonus", "amount": 200000, "type": "addition" },
    { "name": "Loan Repayment", "amount": 100000, "type": "deduction" }
  ]
}
```

---

### 2.4 Payslips

#### GET /api/payroll/payslips/:runId/:staffId

Get a single payslip for a specific payroll run and staff member.

**Auth:** `school_admin`, `super_admin`, or the staff member themselves

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payslipNumber": "PS-202604-0001",
    "staffName": "Sarah Nkosi",
    "staffNumber": "EMP-001",
    "department": "Mathematics",
    "payPeriod": "April 2026",
    "payDate": "2026-04-25",
    "earnings": [
      { "description": "Basic Salary", "amount": 3500000 },
      { "description": "Housing Allowance", "amount": 500000 },
      { "description": "Transport Allowance", "amount": 250000 },
      { "description": "Cell Phone Allowance", "amount": 50000 }
    ],
    "deductions": [
      { "description": "PAYE", "amount": 664950 },
      { "description": "UIF (Employee)", "amount": 43000 },
      { "description": "Pension Fund", "amount": 262500 },
      { "description": "Medical Aid", "amount": 350000 },
      { "description": "Union Fee", "amount": 15000 }
    ],
    "grossPay": 4300000,
    "totalDeductions": 1335450,
    "netPay": 2964550,
    "ytdEarnings": 17200000,
    "ytdPAYE": 2659800,
    "ytdUIF": 172000,
    "leaveBalance": { "annual": 15, "sick": 8, "family": 3 }
  }
}
```

---

#### GET /api/payroll/payslips/:runId/:staffId/pdf

Generate and download a PDF payslip.

**Auth:** `school_admin`, `super_admin`, or the staff member themselves

**Response:** PDF file stream.

---

#### POST /api/payroll/payslips/:runId/batch-pdf

Generate PDF payslips for all staff in a payroll run (ZIP download).

**Auth:** `school_admin`, `super_admin`

---

### 2.5 Bank File Export

#### GET /api/payroll/runs/:id/bank-file

Generate a bank file for bulk EFT payment.

**Auth:** `school_admin`, `super_admin`

**Query params:** `format` (`acb` | `csv`)

**Response:** File download. ACB format follows the standard South African Bankserv ACB specification used by FNB, Standard Bank, ABSA, Nedbank.

---

### 2.6 Tax Certificates

#### POST /api/payroll/tax-certificates/generate

Generate IRP5/IT3a certificates for a tax year.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "taxYear": 2027,
  "certificateType": "IRP5"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "generated": 20,
    "certificateType": "IRP5",
    "taxYear": 2027,
    "certificates": [
      {
        "staffId": "664a1f2e...",
        "staffName": "Sarah Nkosi",
        "certificateNumber": "IRP5-2027-0001",
        "totalIncome": 51600000,
        "totalPAYE": 7979400,
        "totalUIF": 516000,
        "status": "generated"
      }
    ]
  },
  "message": "Tax certificates generated successfully"
}
```

---

#### GET /api/payroll/tax-certificates/:staffId/:taxYear/pdf

Download an individual IRP5/IT3a PDF.

**Auth:** `school_admin`, `super_admin`, or the staff member themselves

---

### 2.7 Cost-to-Company Reports

#### GET /api/payroll/reports/cost-to-company

Get total employment cost per department.

**Auth:** `school_admin`, `super_admin`

**Query params:** `schoolId`, `month`, `year`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "month": 4,
    "year": 2026,
    "departments": [
      {
        "department": "Mathematics",
        "headcount": 4,
        "totalBasic": 14000000,
        "totalAllowances": 3200000,
        "totalEmployerContributions": 1960000,
        "costToCompany": 19160000
      }
    ],
    "schoolTotal": {
      "headcount": 20,
      "totalBasic": 70000000,
      "totalAllowances": 16000000,
      "totalEmployerContributions": 9800000,
      "costToCompany": 95800000
    }
  }
}
```

---

## 3. Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/admin/payroll` | Payroll Dashboard | Summary cards, recent runs, cost overview |
| `/admin/payroll/staff` | Staff Salary List | All staff with salary details, create/edit salary records |
| `/admin/payroll/staff/[id]` | Staff Salary Detail | Individual salary record, history, payslips |
| `/admin/payroll/runs` | Payroll Runs | List of all payroll runs with status |
| `/admin/payroll/runs/[id]` | Payroll Run Detail | Individual run with all items, adjustments, approval actions |
| `/admin/payroll/runs/new` | New Payroll Run | Create and preview a new payroll run |
| `/admin/payroll/tax` | Tax Configuration | SA tax tables, brackets, rebates |
| `/admin/payroll/reports` | Reports | Cost-to-company, department breakdown, annual summary |

Teacher/staff see their payslips via a personal menu item:

| Route | Page | Description |
|---|---|---|
| `/my/payslips` | My Payslips | List of own payslips with PDF download |

The admin nav entry is `{ label: 'Payroll', href: '/admin/payroll', icon: Banknote }` — placed under the Finance section.

---

## 4. User Flows

### 4.1 Set Up Staff Salary Record
1. Admin navigates to `/admin/payroll/staff` → clicks **Add Salary Record**.
2. Selects a staff member from a search/select (pulls from Staff module).
3. Enters: Basic Salary, Allowances (repeatable rows), Deductions (repeatable rows).
4. Enters bank details: Bank Name, Account Number, Branch Code, Account Type.
5. Enters tax details: Tax Number, UIF Number, Date of Birth.
6. Submits → `POST /api/payroll/salaries`.
7. Staff member now appears in the payroll-ready list.

### 4.2 Run Monthly Payroll
1. Admin navigates to `/admin/payroll/runs` → clicks **New Payroll Run**.
2. Selects Month and Year. Optionally adds a description.
3. Clicks **Calculate** → `POST /api/payroll/runs`.
4. Backend calculates all salaries, tax, UIF, deductions, leave adjustments.
5. Preview page shows every staff member's pay breakdown.
6. Admin reviews totals. Can click individual items to make adjustments (bonus, ad-hoc deductions).
7. Admin clicks **Mark as Reviewed** → `PUT /api/payroll/runs/:id/review`.
8. Principal/bursar clicks **Approve** → `PUT /api/payroll/runs/:id/approve`.
9. After payment is made, admin clicks **Mark as Processed** → `PUT /api/payroll/runs/:id/process`.
10. Expense entries are auto-created in the Budget module.

### 4.3 Generate and Download Payslips
1. After payroll is processed, admin navigates to the run detail page.
2. Clicks **Generate Payslips** or clicks a staff member's name → **Download Payslip**.
3. For individual: `GET /api/payroll/payslips/:runId/:staffId/pdf`.
4. For batch: `POST /api/payroll/payslips/:runId/batch-pdf` → ZIP download.

### 4.4 Export Bank File
1. After payroll is approved, admin navigates to the run detail.
2. Clicks **Export Bank File**.
3. Selects format (ACB or CSV).
4. `GET /api/payroll/runs/:id/bank-file?format=acb`.
5. Downloads the file for upload to the school's banking portal.

### 4.5 Staff Views Own Payslip
1. Teacher/staff navigates to `/my/payslips`.
2. Sees a list of payslips by month/year.
3. Clicks a payslip → views detail or downloads PDF.

### 4.6 Year-End Tax Certificates
1. Admin navigates to `/admin/payroll/tax` or `/admin/payroll/reports`.
2. Clicks **Generate IRP5 Certificates** → selects tax year.
3. `POST /api/payroll/tax-certificates/generate`.
4. Backend computes annual totals from all payroll runs in the tax year.
5. Admin downloads individual certificates or a batch PDF.

### 4.7 Configure Tax Tables
1. Admin (or super_admin) navigates to `/admin/payroll/tax`.
2. Selects the tax year.
3. Views current brackets, rebates, thresholds, UIF rates.
4. Can update values for a new tax year → `POST /api/payroll/tax-tables`.
5. Default SA tax tables for common years should be pre-seeded.

---

## 5. Data Models

### 5.1 TaxTable
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `taxYear` | number | yes | SA tax year (e.g., 2027 = March 2026 – Feb 2027) |
| `brackets` | array | yes | `[{ from, to, rate, baseAmount }]` — all in cents |
| `rebates` | object | yes | `{ primary, secondary, tertiary }` — cents |
| `taxThresholds` | object | yes | `{ under65, age65to74, age75plus }` — cents |
| `uifRate` | number | yes | Percentage (e.g., 1 for 1%) |
| `uifCeiling` | number | yes | Monthly UIF remuneration ceiling in cents |
| `sdlRate` | number | yes | Percentage (e.g., 1 for 1%) |
| `medicalCredits` | object | yes | `{ main, firstDependant, additionalDependant }` — cents |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, taxYear }` (unique)

---

### 5.2 SalaryRecord
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `staffId` | ObjectId → User | yes | Reference to staff user |
| `basicSalary` | number | yes | Monthly basic in cents |
| `allowances` | array | no | `[{ name, amount, taxable }]` |
| `deductions` | array | no | `[{ name, amount, preTax }]` |
| `bankDetails` | object | yes | `{ bankName, accountNumber, branchCode, accountType }` |
| `taxNumber` | string | no | SA tax reference number |
| `uifNumber` | string | no | UIF reference number |
| `dateOfBirth` | Date | yes | For age-based tax rebates |
| `startDate` | Date | yes | Employment start date |
| `department` | string | no | For CTC reporting |
| `isActive` | boolean | no | Default `true` |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, staffId }` (unique), `{ schoolId, department }`, `{ schoolId, isActive }`

---

### 5.3 SalaryHistory
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `salaryRecordId` | ObjectId → SalaryRecord | yes | |
| `changedBy` | ObjectId → User | yes | |
| `changedAt` | Date | yes | |
| `field` | string | yes | Which field changed |
| `previousValue` | Mixed | yes | |
| `newValue` | Mixed | yes | |
| `reason` | string | no | |
| `isDeleted` | boolean | no | Default `false` |

**Indexes:** `{ salaryRecordId, changedAt DESC }`

---

### 5.4 PayrollRun
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `month` | number | yes | 1-12 |
| `year` | number | yes | |
| `description` | string | no | |
| `status` | enum | yes | `draft` | `reviewed` | `approved` | `processed` |
| `totals` | object | yes | `{ grossPay, totalPAYE, totalUIF, totalUIFEmployer, totalSDL, totalDeductions, totalNetPay, employeeCount }` |
| `items` | array | yes | Array of PayrollItem sub-documents |
| `reviewedBy` | ObjectId → User | no | |
| `reviewedAt` | Date | no | |
| `reviewNotes` | string | no | |
| `approvedBy` | ObjectId → User | no | |
| `approvedAt` | Date | no | |
| `processedBy` | ObjectId → User | no | |
| `processedAt` | Date | no | |
| `createdBy` | ObjectId → User | yes | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**PayrollItem sub-schema:**
| Field | Type | Notes |
|---|---|---|
| `staffId` | ObjectId → User | |
| `salaryRecordId` | ObjectId → SalaryRecord | |
| `basicSalary` | number | Cents |
| `allowances` | number | Total allowances in cents |
| `grossPay` | number | basic + allowances |
| `unpaidLeaveDays` | number | |
| `leaveDeduction` | number | Cents |
| `preTaxDeductions` | number | Pension, medical aid, etc. |
| `taxableIncome` | number | grossPay - leaveDeduction - preTaxDeductions |
| `paye` | number | Calculated PAYE |
| `uifEmployee` | number | Employee UIF contribution |
| `uifEmployer` | number | Employer UIF contribution |
| `sdl` | number | Skills Development Levy (employer only) |
| `postTaxDeductions` | number | Union fees, etc. |
| `adjustments` | array | `[{ name, amount, type: 'addition'|'deduction' }]` |
| `netPay` | number | Final amount paid |

**Indexes:** `{ schoolId, year, month }` (unique), `{ schoolId, status }`

---

### 5.5 TaxCertificate
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `staffId` | ObjectId → User | yes | |
| `taxYear` | number | yes | |
| `certificateType` | enum | yes | `IRP5` | `IT3a` |
| `certificateNumber` | string | yes | Auto-generated |
| `totalIncome` | number | yes | Annual total in cents |
| `totalPAYE` | number | yes | Annual PAYE in cents |
| `totalUIF` | number | yes | Annual UIF in cents |
| `totalDeductions` | number | yes | |
| `status` | enum | yes | `generated` | `issued` | `amended` |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, taxYear, staffId }` (unique), `{ certificateNumber }` (unique)

---

## 6. State Management

### 6.1 Hook: `usePayrollSalaries`
Located at `src/hooks/usePayrollSalaries.ts`. CRUD for salary records.

```ts
interface PayrollSalariesState {
  salaries: SalaryRecord[];
  loading: boolean;
  fetchSalaries: (filters?: SalaryFilters) => Promise<void>;
  fetchSalary: (id: string) => Promise<SalaryRecord>;
  createSalary: (data: CreateSalaryPayload) => Promise<SalaryRecord>;
  updateSalary: (id: string, data: Partial<SalaryRecord>) => Promise<void>;
  fetchHistory: (id: string) => Promise<SalaryHistoryEntry[]>;
}
```

### 6.2 Hook: `usePayrollRuns`
Located at `src/hooks/usePayrollRuns.ts`. Payroll run lifecycle management.

```ts
interface PayrollRunsState {
  runs: PayrollRun[];
  activeRun: PayrollRun | null;
  loading: boolean;
  fetchRuns: (year?: number) => Promise<void>;
  fetchRun: (id: string) => Promise<void>;
  createRun: (data: CreateRunPayload) => Promise<PayrollRun>;
  reviewRun: (id: string, notes?: string) => Promise<void>;
  approveRun: (id: string) => Promise<void>;
  processRun: (id: string) => Promise<void>;
  adjustItem: (runId: string, itemId: string, adjustments: Adjustment[]) => Promise<void>;
}
```

### 6.3 Hook: `usePayslips`
Located at `src/hooks/usePayslips.ts`. Payslip viewing and download.

```ts
interface PayslipsState {
  payslips: PayslipSummary[];
  loading: boolean;
  fetchPayslips: (staffId?: string) => Promise<void>;
  downloadPayslip: (runId: string, staffId: string) => Promise<void>;
  downloadBatchPayslips: (runId: string) => Promise<void>;
}
```

### 6.4 Hook: `usePayrollReports`
Located at `src/hooks/usePayrollReports.ts`. CTC reports and bank file export.

```ts
interface PayrollReportsState {
  costToCompany: CostToCompanyReport | null;
  loading: boolean;
  fetchCostToCompany: (month: number, year: number) => Promise<void>;
  exportBankFile: (runId: string, format: 'acb' | 'csv') => Promise<void>;
  generateTaxCertificates: (taxYear: number, type: 'IRP5' | 'IT3a') => Promise<void>;
  downloadTaxCertificate: (staffId: string, taxYear: number) => Promise<void>;
}
```

### 6.5 Hook: `useTaxConfig`
Located at `src/hooks/useTaxConfig.ts`. Tax table management.

---

## 7. Components Needed

### 7.1 Page Components

| Component | File | Description |
|---|---|---|
| `PayrollDashboardPage` | `src/app/(dashboard)/admin/payroll/page.tsx` | Summary cards, recent runs, alerts |
| `StaffSalaryListPage` | `src/app/(dashboard)/admin/payroll/staff/page.tsx` | Staff salary table |
| `StaffSalaryDetailPage` | `src/app/(dashboard)/admin/payroll/staff/[id]/page.tsx` | Individual salary detail |
| `PayrollRunsPage` | `src/app/(dashboard)/admin/payroll/runs/page.tsx` | Run list |
| `PayrollRunDetailPage` | `src/app/(dashboard)/admin/payroll/runs/[id]/page.tsx` | Run detail with items |
| `NewPayrollRunPage` | `src/app/(dashboard)/admin/payroll/runs/new/page.tsx` | Create new run |
| `TaxConfigPage` | `src/app/(dashboard)/admin/payroll/tax/page.tsx` | Tax tables |
| `PayrollReportsPage` | `src/app/(dashboard)/admin/payroll/reports/page.tsx` | CTC reports |
| `MyPayslipsPage` | `src/app/(dashboard)/my/payslips/page.tsx` | Staff's own payslips |

### 7.2 Module Components (in `src/components/payroll/`)

| Component | Props / Responsibilities |
|---|---|
| `PayrollSummaryCards` | StatCards: Total Payroll Cost, Total Net Pay, Employee Count, Avg Salary |
| `SalaryList` | DataTable of salary records. Columns: Name, Department, Basic, Gross, Status, Actions. |
| `SalaryFormDialog` | Dialog to create/edit salary. Includes repeatable allowance/deduction rows, bank details section. |
| `AllowanceDeductionEditor` | Repeatable row editor for allowances or deductions. Each row: Name, Amount, Taxable/PreTax toggle. |
| `BankDetailsForm` | Sub-form for bank details: Bank Name (select), Account Number, Branch Code, Account Type. |
| `PayrollRunList` | DataTable of payroll runs. Columns: Period, Status, Employee Count, Total Net, Actions. |
| `PayrollRunItemsTable` | DataTable showing all items in a run. Columns: Employee, Basic, Allowances, Gross, PAYE, UIF, Deductions, Net. |
| `PayrollItemAdjustDialog` | Dialog to add adjustments (bonus, deduction) to a payroll item. |
| `PayrollRunActions` | Button bar: Review, Approve, Process, Export Bank File, Generate Payslips. Buttons enabled/disabled based on status. |
| `PayslipCard` | Card view of a payslip: earnings on left, deductions on right, net pay at bottom. |
| `PayslipList` | List of payslips by month for a staff member. |
| `TaxBracketEditor` | Editable table of tax brackets (from, to, rate, base). |
| `CostToCompanyChart` | Recharts bar chart showing CTC per department. |
| `CostToCompanyTable` | DataTable of department cost breakdown. |

### 7.3 Shared Components to Reuse

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | Page titles |
| `StatCard` | `src/components/shared/StatCard` | Dashboard summary cards |
| `DataTable` | `src/components/shared/DataTable` | All tables |
| `EmptyState` | `src/components/shared/EmptyState` | No salary records, no runs |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `Dialog` / `DialogContent` | `src/components/ui/dialog` | Form dialogs |
| `Badge` | `src/components/ui/badge` | Status badges (draft/reviewed/approved/processed) |
| `Select` | `src/components/ui/select` | Month, year, department, bank selects |
| `Input` / `Label` | `src/components/ui/` | Form fields |
| `Button` | `src/components/ui/button` | All CTAs |
| `Tabs` | `src/components/ui/tabs` | Report tabs |

---

## 8. Integration Notes

### 8.1 Staff Module
Salary records reference staff via `staffId` (User model `_id`). The staff search/select in the salary form should query `GET /api/staff` to find employees. Staff names in payroll displays come from populated `staffId` fields.

### 8.2 Budget Module Integration
When a payroll run is processed (`status: 'processed'`), the backend creates `Expense` records in the Budget module. Each department's total salary cost becomes an expense under the `SAL` category. This provides automatic budget vs actual tracking for salaries.

### 8.3 Leave Module Integration
The payroll calculation checks for unpaid leave days in the relevant month. If a leave integration module exists, it queries leave records where `type: 'unpaid'` and the dates fall within the payroll month. Leave deduction = `(basicSalary / workingDaysInMonth) * unpaidLeaveDays`. If no leave module exists, `unpaidLeaveDays` defaults to 0.

### 8.4 SA Tax Calculation Logic
The PAYE calculation follows the SARS annual equivalent method:
1. Calculate annual equivalent of taxable income: `monthlyTaxable * 12`
2. Apply tax brackets to get annual tax
3. Subtract rebates (primary for all; secondary for age >= 65; tertiary for age >= 75)
4. Divide by 12 for monthly PAYE
5. Subtract medical tax credits

### 8.5 Bank File Format
The ACB (Automated Clearing Bureau) format is a fixed-width text file used by all major SA banks. Each record is 120 characters. The file contains: header record, transaction records (one per employee), and a trailer record with control totals. The backend should generate this format for direct upload to internet banking platforms.

### 8.6 Sensitive Data Handling
Bank account numbers and tax numbers must be masked in list views (show last 4 digits only). Full details are only returned in individual GET requests to `school_admin`, `super_admin`, or the staff member viewing their own record. The backend must never include raw bank details in payroll run list responses.

### 8.7 Payslip PDF Generation
Payslips are generated server-side using a PDF library (e.g., `pdfkit` or `puppeteer`). The template includes: school logo, employee details, earnings breakdown, deductions breakdown, net pay, YTD figures, and leave balance. The school's name and address are pulled from the School collection.

### 8.8 Monetary Values
All amounts in cents. Frontend formats using `formatCurrency()`. User input in Rand format is converted: `Math.round(parseFloat(value) * 100)`.

---

## 9. Acceptance Criteria

### Tax Configuration
- [ ] Admin can view and edit SA tax brackets, rebates, thresholds, and UIF rates per tax year
- [ ] Default tax tables for the current SA tax year are pre-seeded

### Salary Records
- [ ] Admin can create salary records with basic salary, allowances, deductions, and bank details
- [ ] Allowances and deductions support repeatable rows with taxable/preTax flags
- [ ] Bank details are masked in list views (last 4 digits only)
- [ ] Salary change history is recorded with date, user, previous/new values, and reason
- [ ] Staff can view their own salary details (limited view)

### Payroll Runs
- [ ] Admin can create a monthly payroll run that calculates all salaries automatically
- [ ] PAYE is calculated using SARS annual equivalent method with correct brackets and rebates
- [ ] UIF employee (1%) and employer (1%) contributions are calculated correctly
- [ ] Unpaid leave days reduce salary proportionally
- [ ] Admin can make manual adjustments (bonus, ad-hoc deduction) on draft runs
- [ ] Payroll follows the workflow: Draft → Reviewed → Approved → Processed
- [ ] Processing creates expense entries in the Budget module

### Payslips
- [ ] Admin can generate and download individual PDF payslips
- [ ] Admin can generate batch PDF payslips (ZIP)
- [ ] Staff can view and download their own payslips
- [ ] Payslip shows earnings, deductions, net pay, and YTD figures

### Bank File Export
- [ ] Admin can export an ACB-format bank file for bulk EFT
- [ ] CSV format is also available
- [ ] File only includes approved/processed payroll items

### Tax Certificates
- [ ] Admin can generate IRP5 certificates for a tax year
- [ ] Certificates show annual income, PAYE, UIF totals
- [ ] Individual PDF certificates can be downloaded
- [ ] Staff can download their own certificates

### Reports
- [ ] Cost-to-company report shows total employment cost per department
- [ ] Chart renders department cost breakdown
- [ ] Headcount per department is displayed

### General
- [ ] All monetary values display in Rands formatted from cents
- [ ] All pages have loading spinners and empty states
- [ ] All pages are mobile-responsive
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
