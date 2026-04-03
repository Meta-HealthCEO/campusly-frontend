# 32 — Staff Leave Management

## 1. Module Overview

The Staff Leave module manages the complete leave lifecycle for school staff: application, approval/decline, balance tracking, calendar visibility, substitute suggestions, and reporting. It enforces South African Basic Conditions of Employment Act (BCEA) leave entitlements while allowing schools to configure custom leave types.

### Leave Types (BCEA-Compliant Defaults)

| Leave Type | Annual Entitlement | Notes |
|---|---|---|
| Annual Leave | 15 working days | Accrues from start of employment |
| Sick Leave | 30 days per 3-year cycle | 36-month cycle; medical certificate required for 2+ consecutive days |
| Family Responsibility | 3 days per year | Birth, illness, or death of immediate family member |
| Maternity | 4 consecutive months | Unpaid unless employer policy states otherwise |
| Paternity | 10 consecutive days | Per the Labour Laws Amendment Act |
| Unpaid Leave | Unlimited (approval required) | No entitlement — purely discretionary |
| Study Leave | Per school policy | Not BCEA-mandated; school-configurable entitlement |

Schools can adjust entitlements via a leave policy configuration. The system seeds the BCEA defaults on first use.

### Core Workflows

1. **Apply:** Staff member submits a leave request with type, date range, reason, and optional supporting document (e.g., medical certificate).
2. **Review:** Admin/principal receives a notification and reviews the request. They approve or decline with a reason.
3. **Balance:** The system tracks remaining days per leave type per year (or per 3-year cycle for sick leave). Requests that exceed available balance are flagged but can still be submitted.
4. **Calendar:** A shared leave calendar shows approved leave for all staff, enabling administrators to spot coverage gaps.
5. **Substitutes:** When a teacher applies for leave, the system suggests available substitute teachers from the existing staff list who teach the same subject and are not on leave themselves.
6. **Notifications:** Auto-notifications on new request (to admin), on approval/decline (to staff), and on upcoming leave start (1 day before).
7. **Reports:** Usage summaries filterable by staff member, department, leave type, and date range.

### Roles and Access

| Role | Permissions |
|---|---|
| `teacher` | Apply for own leave, view own leave history and balances, view leave calendar |
| `school_admin` | All teacher permissions + approve/decline any leave, configure leave policy, assign substitutes, view all reports |
| `super_admin` | All school_admin permissions across all schools |

The module key is `staff_leave`. All endpoints require authentication and are guarded by `requireModule('staff_leave')`.

---

## 2. Backend API Endpoints

All routes mounted under `/api/leave`. Guarded by `authenticate` + `requireModule('staff_leave')`.

---

### 2.1 Leave Policy Configuration

#### GET /leave/policy

Get the school's leave policy (entitlements per leave type).

**Auth:** school_admin, super_admin

**Query:** `schoolId` (falls back to `req.user.schoolId`)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "leaveTypes": [
      {
        "type": "annual",
        "label": "Annual Leave",
        "defaultEntitlement": 15,
        "unit": "days",
        "cycleLength": 1,
        "requiresDocument": false,
        "requiresDocumentAfterDays": null,
        "isPaid": true,
        "isActive": true
      },
      {
        "type": "sick",
        "label": "Sick Leave",
        "defaultEntitlement": 30,
        "unit": "days",
        "cycleLength": 3,
        "requiresDocument": false,
        "requiresDocumentAfterDays": 2,
        "isPaid": true,
        "isActive": true
      },
      {
        "type": "family_responsibility",
        "label": "Family Responsibility Leave",
        "defaultEntitlement": 3,
        "unit": "days",
        "cycleLength": 1,
        "requiresDocument": false,
        "requiresDocumentAfterDays": null,
        "isPaid": true,
        "isActive": true
      },
      {
        "type": "maternity",
        "label": "Maternity Leave",
        "defaultEntitlement": 80,
        "unit": "days",
        "cycleLength": 1,
        "requiresDocument": true,
        "requiresDocumentAfterDays": null,
        "isPaid": false,
        "isActive": true
      },
      {
        "type": "paternity",
        "label": "Paternity Leave",
        "defaultEntitlement": 10,
        "unit": "days",
        "cycleLength": 1,
        "requiresDocument": true,
        "requiresDocumentAfterDays": null,
        "isPaid": true,
        "isActive": true
      },
      {
        "type": "unpaid",
        "label": "Unpaid Leave",
        "defaultEntitlement": 0,
        "unit": "days",
        "cycleLength": 1,
        "requiresDocument": false,
        "requiresDocumentAfterDays": null,
        "isPaid": false,
        "isActive": true
      },
      {
        "type": "study",
        "label": "Study Leave",
        "defaultEntitlement": 5,
        "unit": "days",
        "cycleLength": 1,
        "requiresDocument": false,
        "requiresDocumentAfterDays": null,
        "isPaid": true,
        "isActive": true
      }
    ],
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-03-01T10:00:00.000Z"
  }
}
```

---

#### PUT /leave/policy

Create or update (upsert) the school's leave policy.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "leaveTypes": [
    {
      "type": "string (required, enum: annual|sick|family_responsibility|maternity|paternity|unpaid|study)",
      "label": "string (required)",
      "defaultEntitlement": "number (required, >= 0)",
      "unit": "string (required, 'days')",
      "cycleLength": "number (required, 1 or 3)",
      "requiresDocument": "boolean (optional, default false)",
      "requiresDocumentAfterDays": "number | null (optional)",
      "isPaid": "boolean (optional, default true)",
      "isActive": "boolean (optional, default true)"
    }
  ]
}
```

**Response 200:** Updated policy object.

---

### 2.2 Leave Requests

#### POST /leave/requests

Submit a new leave request.

**Auth:** teacher, school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "leaveType": "string (required, enum: annual|sick|family_responsibility|maternity|paternity|unpaid|study)",
  "startDate": "string (required, ISO 8601 date)",
  "endDate": "string (required, ISO 8601 date)",
  "reason": "string (required, min 5, max 500)",
  "isHalfDay": "boolean (optional, default false)",
  "halfDayPeriod": "string (optional, enum: morning|afternoon)",
  "documentUrl": "string (optional, URL of uploaded supporting document)",
  "substituteTeacherId": "string (optional, ObjectId — suggested substitute)"
}
```

**Validation rules:**
- `endDate` must be >= `startDate`
- If `isHalfDay` is true, `startDate` must equal `endDate`
- If sick leave exceeds 2 consecutive days and policy requires document, warn (but do not block)

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "staffId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "leaveType": "annual",
    "startDate": "2026-04-10T00:00:00.000Z",
    "endDate": "2026-04-14T00:00:00.000Z",
    "reason": "Family holiday during school break",
    "isHalfDay": false,
    "halfDayPeriod": null,
    "documentUrl": null,
    "substituteTeacherId": null,
    "status": "pending",
    "workingDays": 3,
    "reviewedBy": null,
    "reviewedAt": null,
    "reviewComment": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Leave request submitted successfully"
}
```

**Side effects:**
- Creates an in-app notification to all school_admin users: "New leave request from {staffName}"
- Enqueues a BullMQ job `leave.request.created` for email/push notification

---

#### GET /leave/requests

List leave requests with filters and pagination.

**Auth:** teacher (own only), school_admin (all), super_admin (all)

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school (falls back to `req.user.schoolId`) |
| `staffId` | string | Filter by staff member (teachers can only query their own) |
| `leaveType` | string | Filter by leave type |
| `status` | string | Filter by status: `pending`, `approved`, `declined`, `cancelled` |
| `startDate` | string | Filter requests starting on or after this date |
| `endDate` | string | Filter requests ending on or before this date |
| `page` | number | Page number (default 1) |
| `limit` | number | Results per page (default 20) |
| `sort` | string | Sort field (default `-createdAt`) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
        "staffId": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
          "firstName": "Thabo",
          "lastName": "Molefe",
          "email": "thabo@school.co.za",
          "department": "Mathematics"
        },
        "leaveType": "annual",
        "startDate": "2026-04-10T00:00:00.000Z",
        "endDate": "2026-04-14T00:00:00.000Z",
        "workingDays": 3,
        "status": "pending",
        "reason": "Family holiday during school break"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**Populated fields:** `staffId` → `firstName lastName email department`; `reviewedBy` → `firstName lastName`; `substituteTeacherId` → `firstName lastName`

---

#### GET /leave/requests/:id

Get a single leave request by ID.

**Auth:** teacher (own only), school_admin, super_admin

**Response 200:** Single request object with all populated fields.

**Error 404:** `{ "success": false, "message": "Leave request not found" }`

---

#### PATCH /leave/requests/:id/review

Approve or decline a leave request.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "status": "string (required, enum: approved|declined)",
  "reviewComment": "string (optional, max 500)",
  "substituteTeacherId": "string (optional, ObjectId — assigned substitute)"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
    "status": "approved",
    "reviewedBy": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "firstName": "Sipho",
      "lastName": "Nkosi"
    },
    "reviewedAt": "2026-04-01T09:30:00.000Z",
    "reviewComment": "Approved. Enjoy your holiday.",
    "substituteTeacherId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d8",
      "firstName": "Lerato",
      "lastName": "Dlamini"
    }
  },
  "message": "Leave request approved"
}
```

**Side effects:**
- Creates an in-app notification to the staff member: "Your {leaveType} leave has been {approved|declined}"
- If approved, deducts working days from the staff member's leave balance
- Enqueues a BullMQ job `leave.request.reviewed` for email/push notification

---

#### PATCH /leave/requests/:id/cancel

Cancel a pending or approved leave request (staff member cancels their own).

**Auth:** teacher (own only), school_admin, super_admin

**Response 200:**
```json
{
  "success": true,
  "data": { "_id": "...", "status": "cancelled" },
  "message": "Leave request cancelled"
}
```

**Side effects:**
- If the request was already approved, restores the deducted leave balance
- Notifies admin of the cancellation

---

### 2.3 Leave Balances

#### GET /leave/balances

Get leave balances for a staff member (or all staff if admin).

**Auth:** teacher (own only), school_admin (all), super_admin (all)

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `staffId` | string | Specific staff member (required for teachers, optional for admin) |
| `year` | number | Balance year (default current year) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0e0",
      "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
      "staffId": {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "firstName": "Thabo",
        "lastName": "Molefe"
      },
      "year": 2026,
      "balances": [
        { "leaveType": "annual", "entitlement": 15, "used": 5, "pending": 3, "remaining": 7 },
        { "leaveType": "sick", "entitlement": 30, "used": 2, "pending": 0, "remaining": 28 },
        { "leaveType": "family_responsibility", "entitlement": 3, "used": 0, "pending": 0, "remaining": 3 },
        { "leaveType": "maternity", "entitlement": 80, "used": 0, "pending": 0, "remaining": 80 },
        { "leaveType": "paternity", "entitlement": 10, "used": 0, "pending": 0, "remaining": 10 },
        { "leaveType": "study", "entitlement": 5, "used": 1, "pending": 0, "remaining": 4 }
      ]
    }
  ]
}
```

---

#### POST /leave/balances/initialize

Initialize leave balances for a staff member (or all staff in the school) for a new year. Idempotent — skips staff who already have balances for the given year.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "staffId": "string (optional — omit to initialize all staff)",
  "year": "number (required)"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "initialized": 24 },
  "message": "Leave balances initialized for 24 staff members"
}
```

---

### 2.4 Leave Calendar

#### GET /leave/calendar

Get approved leave for all staff within a date range (for calendar display).

**Auth:** teacher, school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `startDate` | string | Range start (ISO date) |
| `endDate` | string | Range end (ISO date) |
| `department` | string | Optional department filter |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "staffId": "64f1a2b3c4d5e6f7a8b9c0d3",
      "staffName": "Thabo Molefe",
      "department": "Mathematics",
      "leaveType": "annual",
      "startDate": "2026-04-10T00:00:00.000Z",
      "endDate": "2026-04-14T00:00:00.000Z",
      "isHalfDay": false
    }
  ]
}
```

---

### 2.5 Substitute Suggestions

#### GET /leave/substitutes

Suggest available substitute teachers for a given date range and subject.

**Auth:** teacher, school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `startDate` | string | Leave start date |
| `endDate` | string | Leave end date |
| `subjectId` | string | Optional — filter by teachers who teach this subject |
| `excludeStaffId` | string | The staff member taking leave (excluded from results) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "staffId": "64f1a2b3c4d5e6f7a8b9c0d8",
      "firstName": "Lerato",
      "lastName": "Dlamini",
      "department": "Mathematics",
      "subjects": ["Mathematics", "Mathematical Literacy"],
      "isOnLeave": false,
      "currentLoad": 22
    }
  ]
}
```

**Logic:** Fetches all active staff, excludes the requesting teacher, excludes anyone with approved leave overlapping the date range, optionally filters by subject match. Returns sorted by current teaching load (ascending — least loaded first).

---

### 2.6 Leave Reports

#### GET /leave/reports/summary

Leave usage summary with aggregations.

**Auth:** school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `year` | number | Report year (default current) |
| `department` | string | Optional department filter |
| `leaveType` | string | Optional leave type filter |
| `staffId` | string | Optional specific staff member |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 142,
    "approved": 120,
    "declined": 15,
    "pending": 7,
    "byLeaveType": [
      { "type": "annual", "count": 45, "totalDays": 180 },
      { "type": "sick", "count": 62, "totalDays": 95 },
      { "type": "family_responsibility", "count": 12, "totalDays": 18 }
    ],
    "byDepartment": [
      { "department": "Mathematics", "totalDays": 42, "staffCount": 8 },
      { "department": "English", "totalDays": 38, "staffCount": 6 }
    ],
    "byMonth": [
      { "month": 1, "totalDays": 22 },
      { "month": 2, "totalDays": 18 }
    ],
    "topUsers": [
      { "staffId": "...", "staffName": "Thabo Molefe", "totalDays": 12 }
    ]
  }
}
```

---

### 2.7 Document Upload

#### POST /leave/uploads/document

Upload a supporting document (medical certificate, etc.).

**Auth:** teacher, school_admin, super_admin

**Content-Type:** multipart/form-data

**Field:** `document` (PDF, JPEG, PNG; max 5MB)

**Response 200:**
```json
{
  "success": true,
  "data": { "url": "/uploads/leave/uuid.pdf" }
}
```

---

## 3. Data Models

### 3.1 LeavePolicy
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | Unique per school |
| `leaveTypes` | LeaveTypeConfig[] | yes | Array of leave type configurations |
| `isDeleted` | boolean | no | Defaults `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**LeaveTypeConfig (subdocument):**
| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | enum | yes | `annual`, `sick`, `family_responsibility`, `maternity`, `paternity`, `unpaid`, `study` |
| `label` | string | yes | Display name |
| `defaultEntitlement` | number | yes | Days per cycle |
| `unit` | string | yes | Always `'days'` |
| `cycleLength` | number | yes | 1 (annual) or 3 (sick leave 3-year cycle) |
| `requiresDocument` | boolean | no | Defaults `false` |
| `requiresDocumentAfterDays` | number | no | Auto-flag if consecutive days exceed this |
| `isPaid` | boolean | no | Defaults `true` |
| `isActive` | boolean | no | Defaults `true` |

**Indexes:** `{ schoolId }` (unique)

---

### 3.2 LeaveRequest
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `staffId` | ObjectId → User | yes | Set from `req.user.id` |
| `leaveType` | enum | yes | Must match a type from school's LeavePolicy |
| `startDate` | Date | yes | |
| `endDate` | Date | yes | Must be >= startDate |
| `reason` | string | yes | Min 5, max 500 |
| `isHalfDay` | boolean | no | Defaults `false` |
| `halfDayPeriod` | enum | no | `morning` or `afternoon`; required if `isHalfDay` |
| `documentUrl` | string | no | Path to uploaded supporting document |
| `substituteTeacherId` | ObjectId → User | no | Assigned substitute teacher |
| `status` | enum | no | `pending`, `approved`, `declined`, `cancelled`; defaults `pending` |
| `workingDays` | number | yes | Calculated server-side excluding weekends and public holidays |
| `reviewedBy` | ObjectId → User | no | Admin who reviewed |
| `reviewedAt` | Date | no | |
| `reviewComment` | string | no | Max 500 |
| `isDeleted` | boolean | no | Defaults `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, staffId, status }`, `{ schoolId, startDate, endDate }`, `{ schoolId, leaveType }`

---

### 3.3 LeaveBalance
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `staffId` | ObjectId → User | yes | |
| `year` | number | yes | Balance year |
| `balances` | BalanceEntry[] | yes | One entry per leave type |
| `isDeleted` | boolean | no | Defaults `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**BalanceEntry (subdocument):**
| Field | Type | Required | Notes |
|---|---|---|---|
| `leaveType` | enum | yes | |
| `entitlement` | number | yes | Total days entitled |
| `used` | number | yes | Days used (approved + taken) |
| `pending` | number | yes | Days in pending requests |
| `remaining` | number | yes | `entitlement - used - pending` (computed on read) |

**Indexes:** `{ schoolId, staffId, year }` (unique)

---

## 4. Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/admin/leave` | Admin Leave Dashboard | Overview stats, pending approvals, leave calendar |
| `/admin/leave/requests` | Leave Requests | All leave requests with filters, approve/decline actions |
| `/admin/leave/balances` | Leave Balances | Staff balance overview with initialize action |
| `/admin/leave/reports` | Leave Reports | Usage charts by type, department, month |
| `/admin/leave/policy` | Leave Policy | Configure leave types and entitlements |
| `/teacher/leave` | Teacher Leave | Own leave history, apply for leave, view balances |

---

## 5. User Flows

### 5.1 Staff Applies for Leave
1. Teacher opens `/teacher/leave`.
2. Dashboard shows leave balance cards (one per active leave type) and recent requests.
3. Clicks **Apply for Leave** button.
4. Dialog opens with form: Leave Type (select), Start Date, End Date, Half Day toggle (with morning/afternoon selector), Reason (textarea), Upload Document (file input).
5. On selecting dates, the system calculates working days and shows "3 working days" beneath the date fields.
6. If the calculated days exceed remaining balance, a warning banner appears: "This request exceeds your remaining balance (2 days remaining)."
7. When a teacher selects leave, the system suggests substitutes via `GET /leave/substitutes`.
8. Teacher selects an optional substitute and submits.
9. `POST /leave/requests` is called.
10. On success: toast "Leave request submitted", request appears in list as "Pending".

### 5.2 Admin Reviews Leave Request
1. Admin opens `/admin/leave`. Pending requests count is shown on a stat card.
2. Admin navigates to `/admin/leave/requests`, filters by `status=pending`.
3. Clicks a request row to open a detail panel/dialog.
4. Detail shows: staff name, department, leave type, dates, working days, reason, document (if any), current balance for that leave type, substitute suggestion.
5. Admin clicks **Approve** or **Decline**, optionally enters a comment and assigns a substitute.
6. `PATCH /leave/requests/:id/review` is called.
7. On success: toast "Leave request approved/declined", list refreshes.

### 5.3 Admin Views Leave Calendar
1. Admin opens `/admin/leave` and clicks the **Calendar** tab.
2. A monthly calendar renders with colored bars for each approved leave period.
3. Each bar shows the staff member's name and leave type.
4. Admin can filter by department using a dropdown above the calendar.
5. Clicking a leave bar opens a popover with the full request details.

### 5.4 Admin Initializes Year Balances
1. Admin opens `/admin/leave/balances`.
2. At the start of a new year, clicks **Initialize Balances**.
3. Confirmation dialog asks for the year and whether to initialize all staff or a specific member.
4. `POST /leave/balances/initialize` is called.
5. On success: toast "Balances initialized for 24 staff members", balance table refreshes.

### 5.5 Admin Configures Leave Policy
1. Admin opens `/admin/leave/policy`.
2. A form shows each leave type with editable entitlement, cycle length, document requirements, paid/unpaid toggle, and active/inactive toggle.
3. Admin adjusts values and clicks **Save Policy**.
4. `PUT /leave/policy` is called.
5. On success: toast "Leave policy updated".

### 5.6 Admin Views Leave Reports
1. Admin opens `/admin/leave/reports`.
2. Dashboard shows: leave usage by type (bar chart), usage by department (horizontal bar chart), monthly trend (line chart), top leave users (table).
3. Filters: year selector, department dropdown, leave type dropdown, specific staff member search.
4. All charts and tables update on filter change.

---

## 6. State Management

### 6.1 Hook: `useLeave`

Located at `src/hooks/useLeave.ts`. Handles all leave data fetching and mutations.

```ts
interface UseLeaveReturn {
  // Requests
  requests: LeaveRequest[];
  requestsLoading: boolean;
  fetchRequests: (filters?: LeaveRequestFilters) => Promise<void>;
  createRequest: (data: CreateLeaveRequestPayload) => Promise<LeaveRequest>;
  reviewRequest: (id: string, data: ReviewLeavePayload) => Promise<void>;
  cancelRequest: (id: string) => Promise<void>;

  // Balances
  balances: LeaveBalance[];
  balancesLoading: boolean;
  fetchBalances: (staffId?: string, year?: number) => Promise<void>;
  initializeBalances: (data: InitializeBalancesPayload) => Promise<void>;

  // Calendar
  calendarEvents: LeaveCalendarEvent[];
  calendarLoading: boolean;
  fetchCalendar: (startDate: string, endDate: string, department?: string) => Promise<void>;

  // Substitutes
  substitutes: SubstituteSuggestion[];
  substitutesLoading: boolean;
  fetchSubstitutes: (startDate: string, endDate: string, subjectId?: string) => Promise<void>;

  // Policy
  policy: LeavePolicy | null;
  policyLoading: boolean;
  fetchPolicy: () => Promise<void>;
  updatePolicy: (data: UpdateLeavePolicyPayload) => Promise<void>;

  // Reports
  reportData: LeaveReportSummary | null;
  reportLoading: boolean;
  fetchReport: (filters?: LeaveReportFilters) => Promise<void>;
}
```

### 6.2 Types

All types in `src/types/leave.ts`, re-exported from `src/types/index.ts`:

```ts
type LeaveType = 'annual' | 'sick' | 'family_responsibility' | 'maternity' | 'paternity' | 'unpaid' | 'study';
type LeaveStatus = 'pending' | 'approved' | 'declined' | 'cancelled';
type HalfDayPeriod = 'morning' | 'afternoon';

interface LeaveRequest { ... }
interface LeaveBalance { ... }
interface LeavePolicy { ... }
interface LeaveCalendarEvent { ... }
interface SubstituteSuggestion { ... }
interface LeaveReportSummary { ... }
```

---

## 7. Components Needed

### 7.1 Admin Pages

| Component | File | Description |
|---|---|---|
| `AdminLeaveDashboard` | `src/app/(dashboard)/admin/leave/page.tsx` | Stats cards + pending requests table + calendar tab |
| `AdminLeaveRequests` | `src/app/(dashboard)/admin/leave/requests/page.tsx` | Full request list with filters and review actions |
| `AdminLeaveBalances` | `src/app/(dashboard)/admin/leave/balances/page.tsx` | Staff balance table with initialize action |
| `AdminLeaveReports` | `src/app/(dashboard)/admin/leave/reports/page.tsx` | Charts and tables for leave analytics |
| `AdminLeavePolicy` | `src/app/(dashboard)/admin/leave/policy/page.tsx` | Policy configuration form |

### 7.2 Teacher Pages

| Component | File | Description |
|---|---|---|
| `TeacherLeavePage` | `src/app/(dashboard)/teacher/leave/page.tsx` | Own balance cards, request history, apply button |

### 7.3 Shared Components (in `src/components/leave/`)

| Component | Props / Responsibilities |
|---|---|
| `LeaveBalanceCards` | Renders a grid of cards showing entitlement/used/remaining per leave type. Props: `balances: BalanceEntry[]` |
| `LeaveRequestForm` | Dialog form for applying for leave. Fields: type, dates, half-day, reason, document upload, substitute. Uses `react-hook-form` + Zod. |
| `LeaveRequestTable` | `DataTable` of `LeaveRequest[]`. Columns: Staff Name, Type, Dates, Days, Status, Actions. |
| `LeaveReviewDialog` | Dialog for admin to approve/decline with comment and substitute assignment. |
| `LeaveCalendar` | Monthly calendar view showing approved leave as colored bars. Uses existing calendar primitives. |
| `LeaveCalendarEvent` | Individual leave bar/chip rendered on the calendar. Shows staff name and leave type. |
| `SubstituteSuggestionList` | Renders suggested substitutes with name, department, subjects, current load. Selectable. |
| `LeaveReportCharts` | Wrapper for Recharts: bar chart by type, horizontal bar by department, line chart by month. |
| `LeaveStatusBadge` | Badge component that maps status to color: pending=warning, approved=success, declined=destructive, cancelled=muted. |
| `DocumentUpload` | File upload component for supporting documents. Accepts PDF, JPEG, PNG. Max 5MB. |

### 7.4 Existing Shared Components to Reuse

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | All page titles |
| `StatCard` | `src/components/shared/StatCard` | Dashboard stat cards |
| `DataTable` | `src/components/shared/DataTable` | All list views |
| `EmptyState` | `src/components/shared/EmptyState` | Empty data views |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `Dialog` / `DialogContent` | `src/components/ui/dialog` | All forms and review dialogs |
| `Badge` | `src/components/ui/badge` | Status badges |
| `Select` / `SelectItem` | `src/components/ui/select` | Filter dropdowns |
| `Tabs` / `TabsList` | `src/components/ui/tabs` | Dashboard tabs |
| `Card` / `CardContent` | `src/components/ui/card` | Balance cards, stat cards |

---

## 8. Integration Notes

### 8.1 Staff Module
`LeaveRequest.staffId` references the `User` model. Staff members are fetched from `GET /api/staff` for admin views. The staff list provides `firstName`, `lastName`, `email`, and `department` which are used in leave displays.

### 8.2 Notification Module
Leave events trigger in-app notifications via the existing `NotificationService`. Three notification types:
- `leave_request_created` → sent to all school_admin users
- `leave_request_reviewed` → sent to the requesting staff member
- `leave_request_cancelled` → sent to all school_admin users

### 8.3 Working Days Calculation
The backend calculates `workingDays` by counting weekdays between `startDate` and `endDate` inclusive, excluding South African public holidays. A utility function `calculateWorkingDays(start, end)` should be created in `src/utils/dates.ts` on the backend. Half-day requests count as 0.5.

### 8.4 Sick Leave 3-Year Cycle
The BCEA sick leave cycle is 36 months from date of employment (not calendar year). The system simplifies this to a 3-year window. When calculating sick leave balance, the system looks back 3 years from the current date to sum used sick days. The `cycleLength: 3` on the policy drives this behaviour.

### 8.5 Substitute Teacher Suggestion
The substitute suggestion endpoint cross-references:
1. Active staff members (from `GET /api/staff`)
2. Staff on approved leave during the requested period (from `LeaveRequest`)
3. Optionally, staff who teach the same subject (from academic module subject assignments)
Available staff are returned sorted by current teaching load (least loaded first).

### 8.6 Auth and schoolId
All list endpoints fall back to `req.user.schoolId` when `schoolId` is not provided. For teacher role, the backend enforces `staffId = req.user.id` — teachers cannot view other staff members' leave requests or balances.

### 8.7 BullMQ Jobs
Leave events are enqueued as BullMQ jobs for async processing:
- `leave.request.created` — sends email/push to admins
- `leave.request.reviewed` — sends email/push to staff member
- `leave.balance.low` — triggered when remaining balance drops below 3 days

### 8.8 Nav Entry
Admin nav entry: `{ label: 'Leave', href: '/admin/leave', icon: CalendarOff }` in `src/lib/constants.ts`.
Teacher nav entry: `{ label: 'Leave', href: '/teacher/leave', icon: CalendarOff }` in `src/lib/constants.ts`.

---

## 9. Acceptance Criteria

### Leave Policy
- [ ] Admin can configure leave types with entitlement, cycle length, document requirements, paid/unpaid, and active/inactive
- [ ] BCEA-compliant defaults are seeded on first access
- [ ] Inactive leave types do not appear in the leave request form

### Leave Requests
- [ ] Staff can apply for leave with type, date range, reason, optional document, and optional substitute
- [ ] Half-day leave is supported (morning or afternoon)
- [ ] Working days are calculated automatically excluding weekends
- [ ] Requests exceeding balance show a warning but are not blocked
- [ ] Admin can approve or decline with a comment
- [ ] Admin can assign a substitute teacher during approval
- [ ] Staff can cancel their own pending or approved requests
- [ ] Cancelled approved requests restore the leave balance
- [ ] Teachers can only see their own requests; admins see all

### Leave Balances
- [ ] Each staff member has a balance per leave type per year
- [ ] Balances show entitlement, used, pending, and remaining
- [ ] Approving a request deducts from the balance
- [ ] Admin can initialize balances for all staff for a new year
- [ ] Sick leave balance respects the 3-year cycle

### Leave Calendar
- [ ] Monthly calendar shows approved leave as colored bars per staff member
- [ ] Calendar can be filtered by department
- [ ] Clicking a leave bar shows request details

### Substitute Suggestions
- [ ] System suggests available teachers who are not on leave during the requested period
- [ ] Suggestions can be filtered by subject
- [ ] Suggestions are sorted by current teaching load (least loaded first)

### Notifications
- [ ] Admin receives in-app notification when a new leave request is submitted
- [ ] Staff receives in-app notification when their request is approved or declined
- [ ] Email/push notifications are sent via BullMQ jobs

### Reports
- [ ] Admin can view leave usage by type (bar chart)
- [ ] Admin can view leave usage by department (horizontal bar chart)
- [ ] Admin can view monthly usage trend (line chart)
- [ ] Admin can view top leave users (table)
- [ ] All reports are filterable by year, department, leave type, and staff member

### General
- [ ] All forms use `react-hook-form` with Zod validation
- [ ] All API errors surface as toast notifications using `sonner`
- [ ] Loading and empty states exist for every data view
- [ ] All pages are mobile-responsive with proper breakpoints
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
- [ ] Document upload supports PDF, JPEG, PNG up to 5MB
