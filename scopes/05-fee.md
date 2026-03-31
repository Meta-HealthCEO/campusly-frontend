# 05 — Fee Module

## 1. Module Overview

The Fee module is the most complex financial module in Campusly. It covers the full lifecycle of school fee management: defining fee types and schedules, generating individual and bulk invoices, recording and allocating payments, managing debit orders, issuing credit notes, applying discounts and write-offs, tracking debtors with ageing buckets, escalating collections through a formal stage pipeline, creating payment arrangements (instalments), granting fee exemptions/bursaries, generating account statements, and maintaining a running account ledger per student.

**Who uses it:**
- `super_admin` and `school_admin` — full read/write access to all endpoints
- All authenticated users — read access to their own invoices, payments, statements, and balances
- `parent` — views invoices for their children, initiates payments via the Pay Now dialog

**Key concerns:**
- All monetary values are stored and transmitted as **integers in cents** (e.g. R450.00 = `45000`)
- Payments run inside MongoDB transactions to guarantee consistency between Payment documents and Invoice.paidAmount
- Invoice numbers follow the format `INV-YYYYMMDD-XXXX` (e.g. `INV-20260331-4271`)
- Credit note numbers follow `CN-YYYYMMDD-XXXX`
- Receipt numbers follow `RCP-YYYYMMDD-XXXX` (generated during `allocatePayment`)
- Soft deletes: every model has `isDeleted: boolean` — no documents are ever hard-deleted

---

## 2. Backend API Endpoints

All routes are mounted at `/api/fees` (prefix assumed from the Express router). Authentication is required on every route via the `authenticate` middleware. Authorization is role-based via `authorize(...)`.

---

### Fee Types

#### `POST /api/fees/types`
Create a new fee type (e.g. "Term 1 Tuition", "Sport Levy").

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | min 1 char, trimmed |
| `schoolId` | string (ObjectId) | Yes | min 1 char |
| `description` | string | No | — |
| `amount` | integer | Yes | positive integer in cents |
| `frequency` | string enum | Yes | `once_off` \| `per_term` \| `per_year` \| `monthly` |
| `category` | string enum | Yes | `tuition` \| `extramural` \| `camp` \| `uniform` \| `transport` \| `other` |

**Example request:**
```json
{
  "name": "Term 1 Tuition",
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "description": "School fees for Term 1 2026",
  "amount": 450000,
  "frequency": "per_term",
  "category": "tuition"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664b2g3h4i5j6k7l8m9n0o1p",
    "name": "Term 1 Tuition",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "description": "School fees for Term 1 2026",
    "amount": 450000,
    "frequency": "per_term",
    "category": "tuition",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Fee type created successfully"
}
```

---

#### `GET /api/fees/types/school/:schoolId`
List all active fee types for a school.

**Auth:** Any authenticated user

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default 1) |
| `limit` | number | Page size |
| `category` | string | Filter by category enum value |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "feeTypes": [ /* array of FeeType documents */ ],
    "total": 12,
    "page": 1,
    "limit": 20
  }
}
```

---

#### `GET /api/fees/types/:id`
Get a single fee type by ID.

**Auth:** Any authenticated user

**Response (200):** `{ "success": true, "data": { /* FeeType document */ } }`

---

#### `PATCH /api/fees/types/:id`
Update a fee type.

**Auth:** `super_admin`, `school_admin`

**Request body (all optional):**
| Field | Type | Validation |
|-------|------|------------|
| `name` | string | min 1 char, trimmed |
| `description` | string | — |
| `amount` | integer | positive integer in cents |
| `frequency` | string enum | `once_off` \| `per_term` \| `per_year` \| `monthly` |
| `category` | string enum | `tuition` \| `extramural` \| `camp` \| `uniform` \| `transport` \| `other` |
| `isActive` | boolean | — |

**Response (200):** `{ "success": true, "data": { /* updated FeeType */ }, "message": "Fee type updated successfully" }`

---

#### `DELETE /api/fees/types/:id`
Soft-delete a fee type (`isDeleted: true`).

**Auth:** `super_admin`, `school_admin`

**Response (200):** `{ "success": true, "message": "Fee type deleted successfully" }`

---

### Fee Schedules

A FeeSchedule links a FeeType to an academic year/term, a due date, and a target scope (whole school, a specific grade, or a specific student).

#### `POST /api/fees/schedules`
Create a new fee schedule.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `feeTypeId` | string (ObjectId) | Yes | min 1 char |
| `schoolId` | string (ObjectId) | Yes | min 1 char |
| `academicYear` | integer | Yes | 2000–2100 |
| `term` | integer | No | 1–4 |
| `dueDate` | string (ISO date) | Yes | min 1 char |
| `appliesTo.type` | string enum | Yes | `school` \| `grade` \| `student` |
| `appliesTo.targetId` | string (ObjectId) | Yes | min 1 char |

**Example request:**
```json
{
  "feeTypeId": "664b2g3h4i5j6k7l8m9n0o1p",
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "academicYear": 2026,
  "term": 1,
  "dueDate": "2026-02-14",
  "appliesTo": {
    "type": "grade",
    "targetId": "664c3h4i5j6k7l8m9n0o1p2q"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664d4i5j6k7l8m9n0o1p2q3r",
    "feeTypeId": "664b2g3h4i5j6k7l8m9n0o1p",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "academicYear": 2026,
    "term": 1,
    "dueDate": "2026-02-14T00:00:00.000Z",
    "appliesTo": { "type": "grade", "targetId": "664c3h4i5j6k7l8m9n0o1p2q" },
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Fee schedule created successfully"
}
```

---

#### `GET /api/fees/schedules/school/:schoolId`
List all fee schedules for a school.

**Auth:** Any authenticated user

**Query params:** `page`, `limit`, `academicYear` (integer filter)

**Response (200):** `{ "success": true, "data": { "schedules": [...], "total": N, "page": 1, "limit": 20 } }`

Note: `feeTypeId` is populated with the full FeeType document.

---

#### `GET /api/fees/schedules/:id`
Get a single fee schedule.

**Auth:** Any authenticated user. `feeTypeId` is populated.

---

#### `PATCH /api/fees/schedules/:id`
Update a fee schedule.

**Auth:** `super_admin`, `school_admin`

**Request body (all optional):**
| Field | Type | Validation |
|-------|------|------------|
| `academicYear` | integer | 2000–2100 |
| `term` | integer | 1–4 |
| `dueDate` | string (ISO date) | — |
| `appliesTo` | object | `{ type: 'school'|'grade'|'student', targetId: string }` |

---

#### `DELETE /api/fees/schedules/:id`
Soft-delete a fee schedule.

**Auth:** `super_admin`, `school_admin`

---

### Invoices

#### `POST /api/fees/invoices`
Create a single invoice for one student.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `studentId` | string (ObjectId) | Yes | min 1 char |
| `schoolId` | string (ObjectId) | Yes | min 1 char |
| `feeScheduleId` | string (ObjectId) | Yes | min 1 char |
| `items` | array | Yes | min 1 element |
| `items[].description` | string | Yes | min 1 char |
| `items[].amount` | integer | Yes | positive integer in cents |
| `dueDate` | string (ISO date) | Yes | min 1 char |

Note: `totalAmount` is computed server-side as the sum of all `items[].amount`. `invoiceNumber` is auto-generated as `INV-YYYYMMDD-XXXX`.

**Example request:**
```json
{
  "studentId": "664e5j6k7l8m9n0o1p2q3r4s",
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "feeScheduleId": "664d4i5j6k7l8m9n0o1p2q3r",
  "items": [
    { "description": "Term 1 Tuition", "amount": 450000 },
    { "description": "Sport Levy", "amount": 25000 }
  ],
  "dueDate": "2026-02-14"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664f6k7l8m9n0o1p2q3r4s5t",
    "invoiceNumber": "INV-20260331-4271",
    "studentId": "664e5j6k7l8m9n0o1p2q3r4s",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "feeScheduleId": "664d4i5j6k7l8m9n0o1p2q3r",
    "items": [
      { "description": "Term 1 Tuition", "amount": 450000 },
      { "description": "Sport Levy", "amount": 25000 }
    ],
    "totalAmount": 475000,
    "paidAmount": 0,
    "lateFeeAmount": 0,
    "discountAmount": 0,
    "writeOffAmount": 0,
    "status": "pending",
    "dueDate": "2026-02-14T00:00:00.000Z",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Invoice created successfully"
}
```

---

#### `POST /api/fees/invoices/bulk`
Generate invoices for multiple students in one request.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `schoolId` | string (ObjectId) | Yes | min 1 char |
| `feeScheduleId` | string (ObjectId) | Yes | min 1 char |
| `studentIds` | string[] | Yes | min 1 element |
| `items` | array | Yes | min 1 element; same shape as single invoice items |
| `dueDate` | string (ISO date) | Yes | min 1 char |

Note: The same `items` array and computed `totalAmount` apply to every student. Each invoice gets its own unique `invoiceNumber`.

**Example request:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "feeScheduleId": "664d4i5j6k7l8m9n0o1p2q3r",
  "studentIds": ["664e5j6k...", "664f6k7l...", "664g7l8m..."],
  "items": [
    { "description": "Term 1 Tuition", "amount": 450000 }
  ],
  "dueDate": "2026-02-14"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "created": 3,
    "invoices": [ /* array of created Invoice documents */ ]
  },
  "message": "Bulk invoices generated successfully"
}
```

---

#### `GET /api/fees/invoices/school/:schoolId`
List all invoices for a school.

**Auth:** Any authenticated user

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | — |
| `limit` | number | — |
| `status` | string | Filter by InvoiceStatus enum value |
| `studentId` | string | Filter by student |

**Response (200):** `{ "success": true, "data": { "invoices": [...], "total": N, "page": 1, "limit": 20 } }`

Note: `studentId` and `feeScheduleId` are populated.

---

#### `GET /api/fees/invoices/school/:schoolId/overdue`
List all overdue invoices (past due date with status `pending` or `partial`).

**Auth:** `super_admin`, `school_admin`

**Response (200):** `{ "success": true, "data": [ /* Invoice[] with studentId populated */ ] }`

---

#### `GET /api/fees/invoices/:id`
Get a single invoice.

**Auth:** Any authenticated user. `studentId` and `feeScheduleId` populated.

---

#### `POST /api/fees/invoices/:id/pay`
Record a payment against a specific invoice. Runs inside a MongoDB transaction. Updates `paidAmount` and transitions `status` to `paid` (if fully paid) or `partial`.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `amount` | integer | Yes | positive integer in cents |
| `paymentMethod` | string enum | Yes | `cash` \| `eft` \| `debit_order` \| `card` |
| `reference` | string | No | — |
| `notes` | string | No | — |

**Example request:**
```json
{
  "amount": 475000,
  "paymentMethod": "eft",
  "reference": "EFT-20260331-00123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "payment": { /* Payment document */ },
    "invoice": { /* updated Invoice document */ }
  },
  "message": "Payment recorded successfully"
}
```

**Business rules:**
- Throws `400` if invoice is already `paid`
- Throws `400` if invoice is `cancelled`

---

### Payments

#### `GET /api/fees/payments/:invoiceId`
List all payments for a specific invoice.

**Auth:** Any authenticated user

**Response (200):** `{ "success": true, "data": [ /* Payment[] sorted by createdAt desc */ ] }`

---

### Student Balance

#### `GET /api/fees/students/:studentId/balance`
Get the aggregated outstanding balance for a student across all open invoices (status: `pending`, `partial`, `overdue`).

**Auth:** Any authenticated user

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalOwed": 950000,
    "totalPaid": 475000,
    "outstanding": 475000
  }
}
```

---

### Debit Orders

#### `POST /api/fees/debit-orders`
Register a debit order mandate for a student.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `studentId` | string (ObjectId) | Yes | min 1 char |
| `schoolId` | string (ObjectId) | Yes | min 1 char |
| `bankName` | string | Yes | min 1 char, trimmed |
| `accountNumber` | string | Yes | min 1 char, trimmed |
| `branchCode` | string | Yes | min 1 char, trimmed |
| `accountHolder` | string | Yes | min 1 char, trimmed |
| `amount` | integer | Yes | positive integer in cents |
| `dayOfMonth` | integer | Yes | 1–31 |

**Example request:**
```json
{
  "studentId": "664e5j6k7l8m9n0o1p2q3r4s",
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "bankName": "First National Bank",
  "accountNumber": "62012345678",
  "branchCode": "250655",
  "accountHolder": "Jane Smith",
  "amount": 475000,
  "dayOfMonth": 1
}
```

**Response (201):** `{ "success": true, "data": { /* DebitOrder document */ }, "message": "Debit order created successfully" }`

---

#### `GET /api/fees/debit-orders/school/:schoolId`
List all debit orders for a school.

**Auth:** Any authenticated user. `studentId` populated.

**Query params:** `page`, `limit`

---

#### `GET /api/fees/debit-orders/:id`
Get a single debit order.

**Auth:** Any authenticated user

---

#### `PATCH /api/fees/debit-orders/:id`
Update a debit order.

**Auth:** `super_admin`, `school_admin`

**Request body (all optional):**
| Field | Type | Validation |
|-------|------|------------|
| `bankName` | string | min 1 char, trimmed |
| `accountNumber` | string | min 1 char, trimmed |
| `branchCode` | string | min 1 char, trimmed |
| `accountHolder` | string | min 1 char, trimmed |
| `amount` | integer | positive integer in cents |
| `dayOfMonth` | integer | 1–31 |
| `isActive` | boolean | — |

---

#### `DELETE /api/fees/debit-orders/:id`
Soft-delete a debit order.

**Auth:** `super_admin`, `school_admin`

---

### Debtors Report

#### `GET /api/fees/debtors/school/:schoolId`
Aggregated debtors report grouped by student. Returns students with outstanding invoices past due, sorted by outstanding balance descending.

**Auth:** `super_admin`, `school_admin`

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | — |
| `limit` | number | — |
| `minAge` | number | Minimum age in days for invoices to include (default 0) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "debtors": [
      {
        "_id": "664e5j6k...",
        "totalOwed": 950000,
        "totalPaid": 0,
        "totalLateFees": 47500,
        "invoiceCount": 2,
        "oldestDueDate": "2026-01-31T00:00:00.000Z",
        "outstanding": 950000,
        "ageDays": 59,
        "student": { /* Student document */ }
      }
    ],
    "total": 14,
    "page": 1,
    "limit": 20
  }
}
```

---

### Collections

#### `POST /api/fees/collections/escalate`
Escalate a debt collection action for a specific invoice. Updates the invoice's `collectionStage` and creates a `CollectionAction` record.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `invoiceId` | string (ObjectId) | Yes | min 1 char |
| `stage` | string enum | Yes | `friendly_reminder` \| `warning_letter` \| `final_demand` \| `legal_handover` \| `write_off` |
| `notes` | string | No | — |
| `sentVia` | string | No | e.g. `"email"`, `"sms"` |

**Example request:**
```json
{
  "invoiceId": "664f6k7l8m9n0o1p2q3r4s5t",
  "stage": "warning_letter",
  "notes": "Second notice sent",
  "sentVia": "email"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "action": { /* CollectionAction document */ },
    "invoice": { /* updated Invoice document with new collectionStage */ }
  },
  "message": "Collection escalated successfully"
}
```

---

#### `GET /api/fees/collections/school/:schoolId`
List all collection actions for a school.

**Auth:** `super_admin`, `school_admin`

**Query params:** `page`, `limit`, `stage` (filter by CollectionStage value)

**Response (200):** `{ "success": true, "data": { "actions": [...], "total": N, "page": 1, "limit": 20 } }`

Note: `invoiceId` and `studentId` are populated.

---

### Statements

#### `POST /api/fees/statements`
Generate a fee statement for a student covering a date range. Returns invoices, payments, credit notes, and ledger entries with a summary.

**Auth:** Any authenticated user

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `studentId` | string (ObjectId) | Yes | min 1 char |
| `schoolId` | string (ObjectId) | Yes | min 1 char |
| `fromDate` | string (ISO date) | No | Defaults to Unix epoch |
| `toDate` | string (ISO date) | No | Defaults to now |

**Example request:**
```json
{
  "studentId": "664e5j6k7l8m9n0o1p2q3r4s",
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "fromDate": "2026-01-01",
  "toDate": "2026-03-31"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "studentId": "664e5j6k...",
    "schoolId": "664a1f2e...",
    "period": { "from": "2026-01-01T00:00:00.000Z", "to": "2026-03-31T00:00:00.000Z" },
    "invoices": [ /* Invoice[] */ ],
    "payments": [ /* Payment[] */ ],
    "creditNotes": [ /* CreditNote[] with status 'approved' */ ],
    "ledgerEntries": [ /* AccountLedger[] */ ],
    "summary": {
      "totalInvoiced": 950000,
      "totalPaid": 475000,
      "totalCredits": 0,
      "outstanding": 475000
    }
  }
}
```

---

### Late Fees

#### `POST /api/fees/late-fees/school/:schoolId`
Calculate and apply late fees to all overdue invoices for a school. Adds a percentage surcharge to the outstanding balance on each overdue invoice and sets status to `overdue`.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `percentage` | number | No | Late fee percentage (default 5) |

**Example request:**
```json
{ "percentage": 5 }
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "processed": 7,
    "results": [
      { "invoiceId": "664f6k7l...", "lateFee": 23750 }
    ]
  },
  "message": "Late fees calculated"
}
```

---

### Allocate Payment

#### `POST /api/fees/allocate-payment/student/:studentId`
Allocate a lump-sum payment across all of a student's open invoices in due-date order (oldest first). Runs inside a MongoDB transaction. Generates a `RCP-YYYYMMDD-XXXX` receipt number per invoice allocation.

**Auth:** `super_admin`, `school_admin`

**Request body:** Same shape as `recordPaymentSchema` — `amount` (integer, cents), `paymentMethod` (enum), optional `reference` and `notes`.

**Example request:**
```json
{
  "amount": 950000,
  "paymentMethod": "eft",
  "reference": "EFT-20260331-00456"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "allocations": [
      { "invoiceId": "664f6k7l...", "amount": 475000 },
      { "invoiceId": "664g7l8m...", "amount": 475000 }
    ],
    "remainingCredit": 0
  },
  "message": "Payment allocated successfully"
}
```

**Business rule:** Throws `400` if the student has no outstanding invoices.

---

### Payment Arrangements

#### `POST /api/fees/payment-arrangements`
Create an instalment plan for a student's outstanding debt. Generates an `instalments` schedule based on frequency.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `studentId` | string (ObjectId) | Yes | min 1 char |
| `schoolId` | string (ObjectId) | Yes | min 1 char |
| `totalOutstanding` | integer | Yes | positive integer in cents |
| `instalmentAmount` | integer | Yes | positive integer in cents |
| `numberOfInstalments` | integer | Yes | 2–60 |
| `frequency` | string enum | Yes | `weekly` \| `monthly` |
| `startDate` | string (ISO date) | Yes | min 1 char |

**Example request:**
```json
{
  "studentId": "664e5j6k7l8m9n0o1p2q3r4s",
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "totalOutstanding": 950000,
  "instalmentAmount": 237500,
  "numberOfInstalments": 4,
  "frequency": "monthly",
  "startDate": "2026-04-01"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "studentId": "664e5j6k...",
    "totalOutstanding": 950000,
    "instalmentAmount": 237500,
    "numberOfInstalments": 4,
    "frequency": "monthly",
    "startDate": "2026-04-01T00:00:00.000Z",
    "nextPaymentDate": "2026-04-01T00:00:00.000Z",
    "remainingInstalments": 4,
    "status": "active",
    "instalments": [
      { "dueDate": "2026-04-01T00:00:00.000Z", "amount": 237500, "paidAmount": 0, "status": "pending" },
      { "dueDate": "2026-05-01T00:00:00.000Z", "amount": 237500, "paidAmount": 0, "status": "pending" },
      { "dueDate": "2026-06-01T00:00:00.000Z", "amount": 237500, "paidAmount": 0, "status": "pending" },
      { "dueDate": "2026-07-01T00:00:00.000Z", "amount": 237500, "paidAmount": 0, "status": "pending" }
    ]
  },
  "message": "Payment arrangement created successfully"
}
```

---

#### `GET /api/fees/payment-arrangements/school/:schoolId`
List all payment arrangements for a school.

**Auth:** `super_admin`, `school_admin`

**Query params:** `page`, `limit`, `status` (filter by ArrangementStatus)

**Response (200):** `{ "success": true, "data": { "arrangements": [...], "total": N, "page": 1, "limit": 20 } }`

Note: `studentId` is populated.

---

### Write Off

#### `POST /api/fees/write-off`
Write off a portion of (or an entire) invoice's outstanding balance. Sets `collectionStage` to `write_off`, increases `writeOffAmount` and `paidAmount`, and creates a `CollectionAction` record. If `paidAmount >= totalAmount` after write-off, status becomes `paid`.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `invoiceId` | string (ObjectId) | Yes | min 1 char |
| `amount` | integer | Yes | positive integer in cents |
| `reason` | string | Yes | min 1 char, trimmed |

**Example request:**
```json
{
  "invoiceId": "664f6k7l8m9n0o1p2q3r4s5t",
  "amount": 475000,
  "reason": "Unrecoverable — family relocated abroad"
}
```

**Response (200):** `{ "success": true, "data": { /* updated Invoice */ }, "message": "Debt written off successfully" }`

**Business rule:** Throws `400` if `amount > outstanding balance`.

---

### Discount

#### `POST /api/fees/discount`
Apply a once-off discount to an invoice. Reduces `totalAmount` by `amount`, increments `discountAmount`, and writes a `discount` ledger entry.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `invoiceId` | string (ObjectId) | Yes | min 1 char |
| `amount` | integer | Yes | positive integer in cents |
| `reason` | string | Yes | min 1 char, trimmed |

**Example request:**
```json
{
  "invoiceId": "664f6k7l8m9n0o1p2q3r4s5t",
  "amount": 25000,
  "reason": "Sibling discount applied"
}
```

**Response (200):** `{ "success": true, "data": { /* updated Invoice */ }, "message": "Discount applied successfully" }`

**Business rule:** Throws `400` if `amount > outstanding balance`.

---

### Parent Account Balance

#### `GET /api/fees/parents/:parentId/school/:schoolId/balance`
Get the parent's account balance: the running ledger balance plus aggregated totals across all their children's open invoices.

**Auth:** Any authenticated user

**Response (200):**
```json
{
  "success": true,
  "data": {
    "parentId": "664h8m9n0o1p2q3r4s5t6u7v",
    "ledgerBalance": -475000,
    "totalOwed": 950000,
    "totalPaid": 475000,
    "outstanding": 475000
  }
}
```

---

### Credit Notes

#### `POST /api/fees/credit-notes`
Create a credit note against an invoice. Starts in `pending` status and requires approval before it affects the invoice balance.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `invoiceId` | string (ObjectId) | Yes | min 1 char |
| `studentId` | string (ObjectId) | Yes | min 1 char |
| `schoolId` | string (ObjectId) | Yes | min 1 char |
| `amount` | integer | Yes | positive integer in cents |
| `reason` | string | Yes | min 1 char, trimmed |

**Example request:**
```json
{
  "invoiceId": "664f6k7l8m9n0o1p2q3r4s5t",
  "studentId": "664e5j6k7l8m9n0o1p2q3r4s",
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "amount": 25000,
  "reason": "Duplicate charge corrected"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "creditNoteNumber": "CN-20260331-8832",
    "invoiceId": "664f6k7l...",
    "studentId": "664e5j6k...",
    "amount": 25000,
    "reason": "Duplicate charge corrected",
    "status": "pending",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Credit note created successfully"
}
```

---

#### `PATCH /api/fees/credit-notes/:id/approve`
Approve or reject a pending credit note. On approval, `paidAmount` on the linked invoice is incremented; if that satisfies the total, the invoice becomes `paid`.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string enum | Yes | `approved` \| `rejected` |

**Business rule:** Throws `400` if the credit note is not in `pending` status.

**Response (200):** `{ "success": true, "data": { /* updated CreditNote */ }, "message": "Credit note updated successfully" }`

---

#### `GET /api/fees/credit-notes/school/:schoolId`
List credit notes for a school.

**Auth:** `super_admin`, `school_admin`

**Query params:** `page`, `limit`, `status` (filter by CreditNoteStatus)

**Response (200):** `{ "success": true, "data": { "creditNotes": [...], "total": N, "page": 1, "limit": 20 } }`

Note: `invoiceId` and `studentId` populated.

---

### Fee Exemptions

#### `POST /api/fees/exemptions`
Create a fee exemption (bursary, sibling discount, staff discount, etc.) for a student on a specific fee type. The `approvedBy` field is set from `req.user.id`.

**Auth:** `super_admin`, `school_admin`

**Request body:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `studentId` | string (ObjectId) | Yes | min 1 char |
| `schoolId` | string (ObjectId) | Yes | min 1 char |
| `feeTypeId` | string (ObjectId) | Yes | min 1 char |
| `exemptionType` | string enum | Yes | `full` \| `partial` \| `bursary` \| `sibling_discount` \| `staff_discount` \| `early_payment` |
| `discountPercentage` | number | No | 0–100 |
| `fixedAmount` | integer | No | positive integer in cents |
| `reason` | string | Yes | min 1 char, trimmed |
| `validFrom` | string (ISO date) | Yes | min 1 char |
| `validTo` | string (ISO date) | Yes | min 1 char |

**Example request:**
```json
{
  "studentId": "664e5j6k7l8m9n0o1p2q3r4s",
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "feeTypeId": "664b2g3h4i5j6k7l8m9n0o1p",
  "exemptionType": "bursary",
  "discountPercentage": 50,
  "reason": "Academic excellence bursary 2026",
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31"
}
```

**Response (201):** `{ "success": true, "data": { /* FeeExemption document */ }, "message": "Fee exemption created successfully" }`

---

#### `GET /api/fees/exemptions/school/:schoolId`
List fee exemptions for a school.

**Auth:** `super_admin`, `school_admin`

**Query params:** `page`, `limit`, `status` (filter by ExemptionStatus: `active`, `expired`, `revoked`)

**Response (200):** `{ "success": true, "data": { "exemptions": [...], "total": N, "page": 1, "limit": 20 } }`

Note: `studentId` and `feeTypeId` populated.

---

### Account Ledger

#### `GET /api/fees/ledger/student/:studentId/school/:schoolId`
Paginated chronological ledger of all financial entries for a student (debits, credits, payments, refunds, write-offs, interest, discounts) with running balance.

**Auth:** Any authenticated user

**Query params:** `page`, `limit`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "_id": "...",
        "parentId": "664h8m9n...",
        "studentId": "664e5j6k...",
        "schoolId": "664a1f2e...",
        "type": "discount",
        "amount": 25000,
        "runningBalance": 450000,
        "reference": "INV-20260331-4271",
        "description": "Discount applied: Sibling discount applied",
        "relatedInvoiceId": "664f6k7l...",
        "createdAt": "2026-03-31T08:00:00.000Z"
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 20
  }
}
```

---

## 3. Frontend Pages

### 3.1 Admin — Fee Management
**Route:** `/admin/fees`
**File:** `src/app/(dashboard)/admin/fees/page.tsx`

**Displays:**
- 4 stat cards: Total Invoiced, Collected, Outstanding, Collection Rate (computed from the loaded invoices list)
- DataTable of Fee Types with columns: Fee Type (name), Description, Amount (formatted currency), Frequency (capitalised), Optional (Yes/No badge)
- Search by `name` field

**Actions/buttons:**
- "Add Fee Type" button opens a Dialog form with fields: Name, Description, Amount (cents), Frequency (Select: once/monthly/quarterly/annually). Form uses `react-hook-form` + `zodResolver` with the frontend `feeTypeSchema`.

**API calls:**
- `GET /fees/types/school/:schoolId` — on mount, fetch fee types
- `GET /fees/invoices/school/:schoolId` — on mount, fetch invoices (used to compute stat cards)
- `POST /fees/types` — on form submit to create new fee type; refreshes fee types list on success

**Note:** The frontend `feeTypeSchema` uses the values `'once' | 'monthly' | 'quarterly' | 'annually'` (different from the backend enum `once_off | per_term | per_year | monthly`). This is a **divergence** that needs reconciliation during wiring.

---

### 3.2 Admin — Invoices
**Route:** `/admin/fees/invoices`
**File:** `src/app/(dashboard)/admin/fees/invoices/page.tsx`

**Displays:**
- DataTable of all school invoices with columns: Invoice No, Student (first + last name from `student.user`), Amount (`totalAmount`), Paid (`paidAmount`), Balance (`balanceDue`), Status (colour-coded badge), Due Date
- Status badge styles: paid = emerald, partial = yellow, overdue = red, sent = blue, draft/cancelled = gray
- Search by `invoiceNumber`

**Actions:** Read-only; no create/edit buttons on this page.

**API calls:**
- `GET /fees/invoices/school/:schoolId` — on mount

---

### 3.3 Admin — Debtors
**Route:** `/admin/fees/debtors`
**File:** `src/app/(dashboard)/admin/fees/debtors/page.tsx`

**Displays:**
- DataTable of debtor ageing report with columns: Parent Name, Student, Grade, Current, 30 Days, 60 Days, 90 Days, 120+ Days, Total Owed (red + bold)
- Search by `parentName`
- Page header: "Debtors Ageing Report — Outstanding fees broken down by ageing period"

**Actions:** Read-only report.

**API calls:**
- `GET /fees/debtors/school/:schoolId` — on mount

**Type mismatch note:** The frontend `DebtorEntry` type includes `current`, `days30`, `days60`, `days90`, `days120Plus` ageing buckets which are not computed by the backend `getDebtorsReport` aggregation (which returns `totalOwed`, `outstanding`, `ageDays`, `totalLateFees`). The ageing bucket breakdown needs to be added to the backend aggregation or computed on the frontend from `ageDays`.

---

### 3.4 Parent — Fee Management
**Route:** `/parent/fees`
**File:** `src/app/(dashboard)/parent/fees/page.tsx`

**Displays:**
- 4 stat cards: Outstanding Balance, Total Paid (from completed payments), Invoices (count), Overdue (count)
- Card: Invoices — DataTable with columns: Invoice No., Student (name), Description (item descriptions joined), Amount, Paid, Balance (red if > 0), Status (colour-coded badge), Due Date, Actions (Pay Now button if balance > 0 and not cancelled)
- Card: Payment History — DataTable with columns: Date, Reference (monospace), Method (uppercase badge), Amount (green), Status (colour-coded badge)
- Empty state for both tables when no data

**Actions:**
- "Pay Now" button on each invoice row opens `PayDialog`: shows Invoice Total, Already Paid, Balance Due breakdown; allows entering a payment amount (defaulting to balance due in rands); Pay button confirms (currently closes dialog only — payment API call not yet wired)

**API calls:**
- `GET /fees/invoices/school/:schoolId` — on mount (fetches invoices for the school, not filtered by parentId)
- `GET /fees/payments/:invoiceId` — for each invoice (fan-out, errors suppressed)

---

## 4. User Flows

### 4.1 Create Fee Type
1. Admin navigates to `/admin/fees`
2. Clicks "Add Fee Type"
3. Fills in Name, Description, Amount (in cents), Frequency in the dialog
4. Submits → `POST /fees/types`
5. On success: toast, dialog closes, fee types list refreshes

### 4.2 Create a Fee Schedule
1. Admin creates a FeeType (see 4.1)
2. Admin posts `POST /fees/schedules` with the `feeTypeId`, `schoolId`, `academicYear`, `term`, `dueDate`, and `appliesTo` scope (whole school, a grade, or a specific student)
3. Schedule now available for invoice generation

### 4.3 Generate Invoices (Bulk)
1. Admin selects a fee schedule and a list of student IDs
2. Posts `POST /fees/invoices/bulk` with `schoolId`, `feeScheduleId`, `studentIds`, `items`, `dueDate`
3. Backend creates one Invoice per student via `insertMany`
4. Admin can view all invoices at `/admin/fees/invoices`

### 4.4 Record Payment (Admin — per invoice)
1. Admin finds an invoice at `/admin/fees/invoices`
2. Opens invoice detail or uses the row action
3. Submits `POST /fees/invoices/:id/pay` with amount, paymentMethod, reference
4. Backend runs in a Mongoose transaction: creates Payment document, increments `paidAmount`, sets status to `paid` or `partial`

### 4.5 Allocate a Lump-Sum Payment (Admin)
1. Admin receives a payment from a parent that covers multiple invoices
2. Posts `POST /fees/allocate-payment/student/:studentId` with total amount and method
3. Backend distributes payment across open invoices oldest-first, creating one Payment record per invoice with auto-generated receipt numbers
4. Returns allocations breakdown and any remaining credit

### 4.6 Apply a Discount
1. Admin identifies an invoice to discount
2. Posts `POST /fees/discount` with `invoiceId`, `amount` (cents), `reason`
3. Backend reduces `totalAmount`, increments `discountAmount`, writes an `AccountLedger` entry of type `discount`
4. Invoice status may change to `paid` if discount covers remaining balance

### 4.7 View Debtors Report
1. Admin navigates to `/admin/fees/debtors`
2. Page calls `GET /fees/debtors/school/:schoolId`
3. Backend aggregates overdue invoices grouped by student, computes `outstanding` and `ageDays`
4. Table shows each debtor with ageing bucket columns

### 4.8 Escalate a Collection
1. Admin reviews debtors report and selects a student with old debt
2. Posts `POST /fees/collections/escalate` with `invoiceId`, `stage`, optional `notes` and `sentVia`
3. Invoice `collectionStage` is updated; a `CollectionAction` document is created
4. Stages progress: `friendly_reminder` → `warning_letter` → `final_demand` → `legal_handover` → `write_off`

### 4.9 Write Off a Debt
1. Admin determines a debt is unrecoverable
2. Posts `POST /fees/write-off` with `invoiceId`, `amount`, `reason`
3. Backend increments `writeOffAmount` and `paidAmount`; sets `collectionStage: 'write_off'`; creates CollectionAction; marks invoice `paid` if fully covered

### 4.10 Create Credit Note
1. Admin identifies an overcharge or error
2. Posts `POST /fees/credit-notes` — credit note created in `pending` status
3. Admin (or super_admin) approves with `PATCH /fees/credit-notes/:id/approve` `{ "status": "approved" }`
4. On approval: linked invoice's `paidAmount` increases by credit note amount; invoice may become `paid`

### 4.11 Set Up a Payment Arrangement
1. Admin agrees a payment plan with a parent
2. Posts `POST /fees/payment-arrangements` with total outstanding, instalment amount, number of instalments, frequency, start date
3. Backend generates the full `instalments` schedule and stores it

### 4.12 Create a Fee Exemption
1. Admin grants a bursary or discount category to a student
2. Posts `POST /fees/exemptions` with student, fee type, exemption type, discount percentage or fixed amount, validity dates
3. Exemption is stored; application to future invoices is handled at invoice generation time (business logic to be connected)

### 4.13 Parent Views Fees
1. Parent navigates to `/parent/fees`
2. Page fetches all invoices for `user.schoolId` and payments for each invoice
3. Parent can see Outstanding Balance, Total Paid, invoice count, overdue count
4. Parent can click "Pay Now" on any open invoice, enter an amount, and confirm payment

### 4.14 Generate Statement
1. Any authenticated user posts `POST /fees/statements` with `studentId`, `schoolId`, optional date range
2. Backend returns invoices, payments, approved credit notes, ledger entries, and a financial summary for the period

---

## 5. Data Models

All models use MongoDB/Mongoose with soft deletes (`isDeleted: boolean`). All amounts are in **integer cents**.

### 5.1 FeeType
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `name` | string | Required, trimmed |
| `schoolId` | ObjectId → School | Required |
| `description` | string | Optional |
| `amount` | number | Integer cents, required |
| `frequency` | FeeFrequency enum | `once_off` \| `per_term` \| `per_year` \| `monthly` |
| `category` | FeeCategory | `tuition` \| `extramural` \| `camp` \| `uniform` \| `transport` \| `other` |
| `isActive` | boolean | Default `true` |
| `isDeleted` | boolean | Default `false` |
| `createdAt` / `updatedAt` | Date | Auto |

**Indexes:** `{ schoolId, category }`

---

### 5.2 FeeSchedule
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `feeTypeId` | ObjectId → FeeType | Required |
| `schoolId` | ObjectId → School | Required |
| `academicYear` | number | Integer, required |
| `term` | number | Optional, 1–4 |
| `dueDate` | Date | Required |
| `appliesTo.type` | string | `school` \| `grade` \| `student` |
| `appliesTo.targetId` | ObjectId | Points to School, Grade, or Student |
| `isDeleted` | boolean | Default `false` |

**Indexes:** `{ schoolId, academicYear }`

---

### 5.3 Invoice
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `invoiceNumber` | string | Unique, auto-generated `INV-YYYYMMDD-XXXX` |
| `studentId` | ObjectId → Student | Required |
| `schoolId` | ObjectId → School | Required |
| `feeScheduleId` | ObjectId → FeeSchedule | Required |
| `items` | IInvoiceItem[] | Array of `{ description, amount }` |
| `totalAmount` | number | Integer cents; reduced by discounts |
| `paidAmount` | number | Integer cents, default 0 |
| `lateFeeAmount` | number | Integer cents, default 0 |
| `discountAmount` | number | Integer cents, default 0 |
| `writeOffAmount` | number | Integer cents, default 0 |
| `writeOffDate` | Date | Optional |
| `writeOffReason` | string | Optional |
| `collectionStage` | CollectionStage | Optional: `friendly_reminder` \| `warning_letter` \| `final_demand` \| `legal_handover` \| `write_off` |
| `status` | InvoiceStatus | `pending` \| `paid` \| `partial` \| `overdue` \| `cancelled`; default `pending` |
| `dueDate` | Date | Required |
| `receiptNumber` | string | Optional |
| `isDeleted` | boolean | Default `false` |

**Indexes:** `{ studentId, status }`, `{ schoolId, status }`, `{ invoiceNumber }` (unique), `{ schoolId, collectionStage }`

---

### 5.4 Payment
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `invoiceId` | ObjectId → Invoice | Required |
| `studentId` | ObjectId → Student | Required |
| `schoolId` | ObjectId → School | Required |
| `amount` | number | Integer cents, required |
| `paymentMethod` | FeePaymentMethod | `cash` \| `eft` \| `debit_order` \| `card` \| `snapscan` \| `wallet` |
| `reference` | string | Optional |
| `notes` | string | Optional |
| `receiptNumber` | string | Optional; auto-generated in allocatePayment |
| `paymentDate` | Date | Default now |
| `bankReference` | string | Optional |
| `reconciled` | boolean | Default `false` |
| `recordedBy` | ObjectId → User | Required |
| `isDeleted` | boolean | Default `false` |

**Note:** Validation schema only accepts `cash`, `eft`, `debit_order`, `card` — `snapscan` and `wallet` are model-only values not currently validated by the API schema.

**Indexes:** `{ invoiceId }`, `{ studentId, createdAt desc }`, `{ reconciled }`

---

### 5.5 DebitOrder
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `studentId` | ObjectId → Student | Required |
| `schoolId` | ObjectId → School | Required |
| `bankName` | string | Required, trimmed |
| `accountNumber` | string | Required, trimmed |
| `branchCode` | string | Required, trimmed |
| `accountHolder` | string | Required, trimmed |
| `amount` | number | Integer cents, required |
| `dayOfMonth` | number | 1–31, required |
| `isActive` | boolean | Default `true` |
| `isDeleted` | boolean | Default `false` |

**Indexes:** `{ studentId }`, `{ schoolId, isActive }`

---

### 5.6 CreditNote
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `invoiceId` | ObjectId → Invoice | Required |
| `studentId` | ObjectId → Student | Required |
| `schoolId` | ObjectId → School | Required |
| `amount` | number | Integer cents, required |
| `reason` | string | Required, trimmed |
| `approvedBy` | ObjectId → User | Optional; set on approval |
| `creditNoteNumber` | string | Unique, auto-generated `CN-YYYYMMDD-XXXX` |
| `status` | CreditNoteStatus | `pending` \| `approved` \| `rejected`; default `pending` |
| `isDeleted` | boolean | Default `false` |

**Indexes:** `{ invoiceId }`, `{ schoolId, status }`, `{ creditNoteNumber }` (unique)

---

### 5.7 FeeExemption
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `studentId` | ObjectId → Student | Required |
| `schoolId` | ObjectId → School | Required |
| `feeTypeId` | ObjectId → FeeType | Required |
| `exemptionType` | ExemptionType | `full` \| `partial` \| `bursary` \| `sibling_discount` \| `staff_discount` \| `early_payment` |
| `discountPercentage` | number | Optional, 0–100 |
| `fixedAmount` | number | Optional, integer cents |
| `reason` | string | Required, trimmed |
| `approvedBy` | ObjectId → User | Required; set from `req.user.id` |
| `validFrom` | Date | Required |
| `validTo` | Date | Required |
| `status` | ExemptionStatus | `active` \| `expired` \| `revoked`; default `active` |
| `isDeleted` | boolean | Default `false` |

**Indexes:** `{ studentId, feeTypeId }`, `{ schoolId, status }`

---

### 5.8 PaymentArrangement
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `studentId` | ObjectId → Student | Required |
| `schoolId` | ObjectId → School | Required |
| `totalOutstanding` | number | Integer cents, required |
| `instalmentAmount` | number | Integer cents, required |
| `numberOfInstalments` | number | 2–60, required |
| `frequency` | ArrangementFrequency | `weekly` \| `monthly` |
| `startDate` | Date | Required |
| `nextPaymentDate` | Date | Required; set to `startDate` on creation |
| `remainingInstalments` | number | Required; set to `numberOfInstalments` on creation |
| `status` | ArrangementStatus | `active` \| `completed` \| `defaulted` \| `cancelled`; default `active` |
| `instalments` | IInstalment[] | Generated array; each: `{ dueDate, amount, paidAmount, status, paidDate? }` |
| `isDeleted` | boolean | Default `false` |

**Indexes:** `{ studentId, status }`, `{ schoolId, status }`, `{ nextPaymentDate }`

---

### 5.9 CollectionAction
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `studentId` | ObjectId → Student | Required |
| `schoolId` | ObjectId → School | Required |
| `invoiceId` | ObjectId → Invoice | Required |
| `stage` | CollectionStage | Required |
| `scheduledDate` | Date | Required; set to `new Date()` on create |
| `sentDate` | Date | Optional; set to `new Date()` on create |
| `sentVia` | string | Optional (e.g. `"email"`, `"sms"`) |
| `notes` | string | Optional |
| `performedBy` | ObjectId → User | Optional |
| `isDeleted` | boolean | Default `false` |

**Indexes:** `{ invoiceId, stage }`, `{ schoolId, stage }`, `{ scheduledDate, sentDate }`

---

### 5.10 AccountLedger
| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | — |
| `parentId` | ObjectId → Parent | Required |
| `studentId` | ObjectId → Student | Required |
| `schoolId` | ObjectId → School | Required |
| `type` | LedgerEntryType | `debit` \| `credit` \| `payment` \| `refund` \| `write_off` \| `interest` \| `discount` |
| `amount` | number | Integer cents, required |
| `runningBalance` | number | Integer cents, required; maintained by service |
| `reference` | string | Optional (e.g. invoice number) |
| `description` | string | Required |
| `relatedInvoiceId` | ObjectId → Invoice | Optional |
| `isDeleted` | boolean | Default `false` |

**Note:** Currently only the `applyDiscount` service method writes ledger entries. Other operations (payments, write-offs, credit notes) do not yet create ledger entries — this is a gap to address.

**Indexes:** `{ parentId, createdAt desc }`, `{ studentId, createdAt desc }`, `{ schoolId, type }`

---

## 6. State Management

No dedicated fee Zustand store exists yet. The current pages manage state locally with `useState`. The following stores are needed:

### 6.1 `useFeeStore`
```ts
interface FeeStore {
  // Fee Types
  feeTypes: FeeType[];
  feeTypesLoading: boolean;
  fetchFeeTypes: (schoolId: string) => Promise<void>;
  createFeeType: (data: CreateFeeTypeInput) => Promise<void>;

  // Fee Schedules
  feeSchedules: FeeSchedule[];
  feeSchedulesLoading: boolean;
  fetchFeeSchedules: (schoolId: string, academicYear?: number) => Promise<void>;

  // Invoices
  invoices: Invoice[];
  invoicesLoading: boolean;
  selectedInvoice: Invoice | null;
  fetchInvoices: (schoolId: string, filters?: InvoiceFilters) => Promise<void>;
  fetchInvoice: (id: string) => Promise<void>;
  recordPayment: (invoiceId: string, data: RecordPaymentInput) => Promise<void>;
  applyDiscount: (data: ApplyDiscountInput) => Promise<void>;
  writeOffDebt: (data: WriteOffDebtInput) => Promise<void>;

  // Debtors
  debtors: DebtorEntry[];
  debtorsLoading: boolean;
  fetchDebtors: (schoolId: string, minAge?: number) => Promise<void>;

  // Bulk invoice
  bulkGenerateInvoices: (data: BulkInvoiceInput) => Promise<BulkResult>;

  // Payment Arrangements
  arrangements: PaymentArrangement[];
  fetchArrangements: (schoolId: string) => Promise<void>;
  createArrangement: (data: CreatePaymentArrangementInput) => Promise<void>;

  // Credit Notes
  creditNotes: CreditNote[];
  fetchCreditNotes: (schoolId: string) => Promise<void>;
  createCreditNote: (data: CreateCreditNoteInput) => Promise<void>;
  approveCreditNote: (id: string, status: 'approved' | 'rejected') => Promise<void>;

  // Exemptions
  exemptions: FeeExemption[];
  fetchExemptions: (schoolId: string) => Promise<void>;
  createExemption: (data: CreateFeeExemptionInput) => Promise<void>;

  // Collections
  collectionActions: CollectionAction[];
  fetchCollectionActions: (schoolId: string) => Promise<void>;
  escalateCollection: (data: EscalateCollectionInput) => Promise<void>;
}
```

### 6.2 `useParentFeeStore` (or extend `useFeeStore` with parent-specific slice)
```ts
interface ParentFeeStore {
  invoices: Invoice[];
  payments: Payment[];
  balance: ParentBalance | null;
  loading: boolean;
  fetchParentFees: (schoolId: string) => Promise<void>;
  fetchBalance: (parentId: string, schoolId: string) => Promise<void>;
  generateStatement: (data: GenerateStatementInput) => Promise<Statement>;
}
```

---

## 7. Components Needed

### Shared/Admin
| Component | Description |
|-----------|-------------|
| `FeeTypeTable` | DataTable for fee types with columns as per the admin fees page; includes edit and delete row actions |
| `FeeTypeDialog` | Create/edit dialog form; fields: name, description, amount, frequency, category |
| `FeeScheduleTable` | DataTable for schedules with columns: fee type name, academic year, term, due date, applies-to scope |
| `FeeScheduleDialog` | Create/edit dialog; includes `appliesTo` scope selector (school / grade / student) |
| `InvoiceTable` | DataTable for invoices with status badge, balance column, and row actions (view, pay, discount, write-off) |
| `CreateInvoiceDialog` | Single invoice creation: student selector, fee schedule selector, line items builder, due date |
| `BulkInvoiceDialog` | Multi-student invoice generation: schedule selector, student multi-select or grade/school filter, items, due date |
| `RecordPaymentDialog` | Payment form: amount, method (cash/eft/debit_order/card), reference, notes |
| `AllocatePaymentDialog` | Student-level lump-sum payment: student selector, amount, method — allocates across open invoices |
| `ApplyDiscountDialog` | Discount form: invoice selector, amount, reason |
| `WriteOffDialog` | Write-off form: invoice selector, amount, reason |
| `DebtorTable` | Ageing report table with columns: parent, student, grade, Current, 30d, 60d, 90d, 120d+, Total Owed; action to escalate collection |
| `EscalateCollectionDialog` | Stage selector, notes, sentVia fields |
| `CalculateLateFeesButton` | Trigger button + confirmation dialog for `POST /fees/late-fees/school/:schoolId` |
| `PaymentArrangementTable` | Table of arrangements with instalment schedule drill-down |
| `PaymentArrangementDialog` | Create instalment plan: total outstanding, instalment amount, number, frequency, start date |
| `CreditNoteTable` | Table with status badge and approve/reject actions |
| `CreditNoteDialog` | Create form: invoice selector, amount, reason |
| `FeeExemptionTable` | Table with exemption type, validity, discount value, status |
| `FeeExemptionDialog` | Create form: student, fee type, exemption type, discount % or fixed amount, validity dates, reason |
| `StatementGenerator` | Date-range picker + student selector; renders statement summary and export action |
| `AccountLedgerTable` | Chronological ledger entries with type badge and running balance |
| `DebitOrderTable` | Table of debit orders; includes edit and deactivate actions |
| `DebitOrderDialog` | Create/edit form: bank name, account number, branch code, account holder, amount, day of month |

### Parent Portal
| Component | Description |
|-----------|-------------|
| `ParentInvoiceTable` | Read-only invoice table with Pay Now action on open invoices |
| `PayDialog` | Shows invoice total, paid, balance; amount input (in rands); calls `POST /fees/invoices/:id/pay` |
| `PaymentHistoryTable` | Table of payments: date, reference, method badge, amount, status |
| `ParentFeeStatCards` | 4 stat cards: Outstanding Balance, Total Paid, Invoices, Overdue |
| `StatementRequestForm` | Date range picker; calls `POST /fees/statements`; renders result or triggers download |

---

## 8. Integration Notes

### Fee ↔ Wallet
- The model defines `wallet` as a `FeePaymentMethod` value in the Payment schema, meaning a parent/student could theoretically pay a fee invoice using their school wallet balance.
- The `recordPaymentSchema` validation does **not** currently include `wallet` or `snapscan` as valid `paymentMethod` values — only `cash`, `eft`, `debit_order`, `card`. This needs to be aligned if wallet payments are to be supported.
- The Wallet module (`/api/wallet`) handles tuckshop and top-up transactions separately via `WalletTransaction` documents. Bridging a wallet deduction to a fee payment would require a cross-module service call.

### Fee ↔ Student
- Every Invoice, Payment, CollectionAction, PaymentArrangement, FeeExemption, and AccountLedger document references `studentId`.
- The `getStudentBalance` endpoint (`GET /fees/students/:studentId/balance`) is the primary way for the Student portal to query what a student owes.
- Student data (name, grade) is populated via `$lookup` in the debtors aggregation.

### Fee ↔ Parent
- `getParentAccountBalance` (`GET /fees/parents/:parentId/school/:schoolId/balance`) joins invoices to students via `student.parentId` using a `$lookup` — requires the Student model to carry a `parentId` field.
- `AccountLedger` entries carry both `parentId` and `studentId`, enabling per-parent and per-student ledger views.
- The parent fees page currently fetches invoices by `schoolId` rather than filtering by the logged-in parent's ID — this is a privacy/data scoping issue to address.

### Fee ↔ Notifications
- Collection escalation (`escalateCollection`) records what was sent and via what channel (`sentVia`) but does not currently trigger actual email/SMS dispatch. A Notifications module integration point is needed at escalation time.

### Fee ↔ Reporting
- The debtors ageing report (`getDebtorsReport`) returns `ageDays` (days since oldest due date) and `outstanding`, but the frontend `DebtorEntry` type expects pre-bucketed columns (`current`, `days30`, `days60`, `days90`, `days120Plus`). The backend aggregation needs to be extended to produce these buckets using `$switch` or `$cond` on `ageDays`.

---

## 9. Acceptance Criteria

### Fee Types
- [ ] Admin can create a fee type with name, description, amount (cents), frequency, and category
- [ ] Fee types list is scoped to the admin's school and filtered by `isDeleted: false`
- [ ] Admin can update any field on an existing fee type including toggling `isActive`
- [ ] Soft-deleting a fee type removes it from the list without affecting existing invoices

### Fee Schedules
- [ ] Admin can create a schedule linking a fee type to an academic year/term, due date, and scope (school/grade/student)
- [ ] `feeTypeId` is populated when listing schedules
- [ ] Schedules can be filtered by `academicYear`

### Invoices
- [ ] Single invoice can be created for one student with one or more line items; `totalAmount` is auto-computed
- [ ] Bulk invoices create one document per student ID with the same items and a unique `invoiceNumber` per document
- [ ] Invoice number format is `INV-YYYYMMDD-XXXX`
- [ ] Invoices can be filtered by `status` and `studentId`
- [ ] Overdue invoices endpoint returns only past-due `pending` and `partial` invoices
- [ ] Attempting to pay a `paid` or `cancelled` invoice returns a 400 error

### Payments
- [ ] Recording a payment updates `paidAmount` and sets status to `paid` (if fully covered) or `partial` within a MongoDB transaction
- [ ] Allocating a lump sum against a student distributes across oldest-due invoices first, generates receipt numbers, returns allocations and remaining credit
- [ ] Late fees are applied as a percentage to outstanding amounts on all overdue invoices for a school

### Debtors
- [ ] Debtors report groups by student, returns `outstanding`, `ageDays`, `totalLateFees`, `invoiceCount`, `oldestDueDate`, and the populated student document
- [ ] `minAge` query param filters to invoices at least N days overdue

### Collection & Write-Off
- [ ] Escalating a collection creates a CollectionAction and updates the invoice's `collectionStage`
- [ ] Write-off reduces outstanding by the specified amount, creates a CollectionAction with stage `write_off`, and marks the invoice `paid` if fully cleared
- [ ] Write-off amount cannot exceed the invoice's outstanding balance

### Credit Notes
- [ ] Credit note is created in `pending` status and does not affect invoice balance until approved
- [ ] Approving a credit note increments `paidAmount` on the linked invoice; invoice becomes `paid` if fully covered
- [ ] A credit note that has already been approved or rejected cannot be processed again (400 error)

### Discounts
- [ ] Applying a discount reduces `totalAmount`, increments `discountAmount`, and writes an `AccountLedger` entry of type `discount`
- [ ] Discount cannot exceed the outstanding balance

### Fee Exemptions
- [ ] Exemption is created with `approvedBy` set from the authenticated user
- [ ] Exemptions support both `discountPercentage` (0–100) and `fixedAmount` (cents)
- [ ] Exemptions can be filtered by status (`active`, `expired`, `revoked`)

### Payment Arrangements
- [ ] Creating an arrangement generates a complete `instalments` schedule respecting frequency (weekly/monthly)
- [ ] `nextPaymentDate` is initialised to `startDate`
- [ ] Arrangements support 2–60 instalments

### Parent Portal
- [ ] Parent can view all invoices for their school with correct balance and status
- [ ] Parent can see payment history with method, reference, amount, and status
- [ ] Pay Now dialog shows invoice total, paid amount, and balance due; validates that payment amount is within range
- [ ] Parent balance endpoint (`GET /fees/parents/:parentId/school/:schoolId/balance`) returns `outstanding`, `totalOwed`, `totalPaid`, and ledger balance

### Statements
- [ ] Statement returns invoices, payments, approved credit notes, and ledger entries within the date range
- [ ] Summary includes `totalInvoiced`, `totalPaid`, `totalCredits`, and `outstanding`
- [ ] Default date range is epoch → now when `fromDate`/`toDate` are omitted

### Account Ledger
- [ ] Ledger entries are paginated and sorted newest-first
- [ ] Each entry carries `type`, `amount`, `runningBalance`, `description`, and optional `reference` and `relatedInvoiceId`

### General
- [ ] All monetary amounts are accepted and stored as integer cents; `formatCurrency` in the frontend converts to display format
- [ ] All soft-deleted documents are excluded from all list/get endpoints
- [ ] All write endpoints (`super_admin`, `school_admin` only) return 401/403 for unauthenticated or unauthorised requests
- [ ] Pagination (`page`, `limit`) works consistently across all list endpoints
