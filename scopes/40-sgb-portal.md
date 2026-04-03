# 40 — SGB Read-Only Portal

## 1. Module Overview

The SGB (School Governing Body) Portal provides a dedicated read-only interface for governing body members to oversee school operations. In South African schools, the SGB is a statutory body established under the South African Schools Act (SASA) with oversight responsibilities for school finances, policies, and governance.

This module introduces a new role `sgb_member` with strictly read-only access to curated summaries of school data. SGB members cannot modify any school data — they see aggregated dashboards, financial summaries, enrollment statistics, and school improvement plan progress. The module also provides collaboration tools: meeting management (agendas, minutes, resolutions, voting) and a document repository for policies, financial statements, and audit reports.

### Core Capabilities

| Capability | Description |
|---|---|
| Financial Summaries | Term/quarterly income vs expenditure, budget vs actual, cash position |
| Enrollment Stats | Student headcount by grade, trends, intake vs departures |
| Meeting Management | Schedule meetings, set agendas, record minutes, track resolutions |
| Voting | SGB members vote on resolutions and policy proposals |
| Document Repository | Upload/view policies, financial statements, audit reports |
| Policy Approval | Admin proposes policy → SGB votes → approved/rejected |
| Compliance Dashboard | Overdue policy reviews, missing documents, governance checklist |
| School Improvement Plan | Track SIP milestones and progress |

### Roles and Access

| Role | Access |
|---|---|
| `sgb_member` | Read-only dashboards, participate in meetings/votes, view documents |
| `school_admin` | Full read/write — invite SGB members, manage meetings, upload documents, propose policies |
| `super_admin` | Full access across all schools |

SGB members are invited via email by a school admin. They complete a lightweight registration flow (name, email, password) and are assigned the `sgb_member` role scoped to the inviting school. They see only SGB portal pages — no access to the main admin dashboard.

All collections use soft-delete (`isDeleted: boolean`). All write endpoints require `school_admin` or `super_admin` unless otherwise noted.

---

## 2. Backend API Endpoints

All routes are mounted under `/api/sgb`. Authentication is required on every route via the `authenticate` middleware. Role restriction uses the `authorize` middleware.

---

### 2.1 Member Invitations

#### POST /api/sgb/members/invite

Invite a new SGB member by email. Creates a pending invitation record and sends an email with a registration link.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "email": "john.governer@email.com",
  "firstName": "John",
  "lastName": "Governer",
  "position": "chairperson",
  "term": "2026-2029"
}
```

**Validation:** `inviteSgbMemberSchema` (Zod)
- `email`: required, valid email
- `firstName`: required, min 1 char
- `lastName`: required, min 1 char
- `position`: required, enum: `chairperson` | `deputy_chairperson` | `secretary` | `treasurer` | `member` | `co_opted`
- `term`: optional, string describing the term of office

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664b2g3h4i5j6k7l8m9n0o1p",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "email": "john.governer@email.com",
    "firstName": "John",
    "lastName": "Governer",
    "position": "chairperson",
    "term": "2026-2029",
    "status": "pending",
    "invitedBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "invitedAt": "2026-04-02T08:00:00.000Z",
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z",
    "updatedAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "SGB member invitation sent successfully"
}
```

---

#### GET /api/sgb/members

List all SGB members for the school.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Falls back to `req.user.schoolId` |
| `status` | string | Filter: `pending` | `active` | `inactive` |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "664b2g3h4i5j6k7l8m9n0o1p",
      "userId": { "_id": "...", "firstName": "John", "lastName": "Governer", "email": "john.governer@email.com" },
      "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
      "position": "chairperson",
      "term": "2026-2029",
      "status": "active",
      "joinedAt": "2026-04-02T10:00:00.000Z"
    }
  ],
  "message": "SGB members retrieved successfully"
}
```

---

#### PUT /api/sgb/members/:id

Update an SGB member's position, term, or status.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "position": "treasurer",
  "status": "inactive"
}
```

---

#### DELETE /api/sgb/members/:id

Soft-delete (remove) an SGB member.

**Auth:** `school_admin`, `super_admin`

---

### 2.2 Financial Summaries (Read-Only)

#### GET /api/sgb/finance/summary

Returns an aggregated financial summary for SGB viewing. Data is pulled from the existing fees, payments, and (future) budget/expense modules.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Falls back to `req.user.schoolId` |
| `period` | string | `term1` | `term2` | `term3` | `term4` | `q1` | `q2` | `q3` | `q4` | `annual` |
| `year` | number | Financial year (default current year) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "term1",
    "year": 2026,
    "income": {
      "totalFeesBilled": 245000000,
      "totalFeesCollected": 198000000,
      "collectionRate": 80.8,
      "otherIncome": 1500000,
      "totalIncome": 199500000
    },
    "expenditure": {
      "salaries": 120000000,
      "maintenance": 15000000,
      "supplies": 8000000,
      "utilities": 6000000,
      "transport": 4500000,
      "other": 3200000,
      "totalExpenditure": 156700000
    },
    "balance": {
      "netPosition": 42800000,
      "bankBalance": 55000000,
      "outstandingFees": 47000000
    },
    "budgetComparison": {
      "budgetedIncome": 250000000,
      "actualIncome": 199500000,
      "budgetedExpenditure": 180000000,
      "actualExpenditure": 156700000,
      "incomeVariance": -50500000,
      "expenditureVariance": 23300000
    }
  },
  "message": "Financial summary retrieved successfully"
}
```

All monetary values are in cents (ZAR).

---

#### GET /api/sgb/finance/trends

Returns monthly income/expenditure trend data for chart rendering.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Query params:** `schoolId`, `year`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "months": [
      { "month": "2026-01", "income": 45000000, "expenditure": 38000000 },
      { "month": "2026-02", "income": 42000000, "expenditure": 39500000 }
    ]
  }
}
```

---

### 2.3 Enrollment Stats (Read-Only)

#### GET /api/sgb/enrollment/summary

Aggregated enrollment statistics.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Query params:** `schoolId`, `year`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalStudents": 842,
    "byGrade": [
      { "grade": "Grade 1", "gradeId": "...", "count": 95, "capacity": 120 },
      { "grade": "Grade 2", "gradeId": "...", "count": 88, "capacity": 120 }
    ],
    "newEnrollments": 45,
    "departures": 12,
    "netChange": 33,
    "genderSplit": { "male": 430, "female": 412 },
    "yearOverYear": [
      { "year": 2024, "total": 790 },
      { "year": 2025, "total": 815 },
      { "year": 2026, "total": 842 }
    ]
  }
}
```

---

### 2.4 Meetings

#### POST /api/sgb/meetings

Create a new SGB meeting.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "title": "Q1 2026 Ordinary Meeting",
  "date": "2026-04-15T18:00:00.000Z",
  "venue": "School Boardroom",
  "type": "ordinary",
  "agenda": [
    { "title": "Opening and welcome", "presenter": "Chairperson", "duration": 5 },
    { "title": "Financial report", "presenter": "Treasurer", "duration": 20 },
    { "title": "Policy review: Code of Conduct", "presenter": "Secretary", "duration": 15 }
  ]
}
```

**Validation:** `createMeetingSchema` (Zod)
- `title`: required, min 1 char
- `date`: required, ISO 8601 datetime
- `venue`: required, min 1 char
- `type`: required, enum: `ordinary` | `special` | `annual_general`
- `agenda`: optional array of `{ title, presenter?, duration? }`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664c3h4i5j6k7l8m9n0o1p2q",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "title": "Q1 2026 Ordinary Meeting",
    "date": "2026-04-15T18:00:00.000Z",
    "venue": "School Boardroom",
    "type": "ordinary",
    "status": "scheduled",
    "agenda": [
      { "title": "Opening and welcome", "presenter": "Chairperson", "duration": 5 },
      { "title": "Financial report", "presenter": "Treasurer", "duration": 20 },
      { "title": "Policy review: Code of Conduct", "presenter": "Secretary", "duration": 15 }
    ],
    "attendees": [],
    "minutes": null,
    "createdBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z",
    "updatedAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "SGB meeting created successfully"
}
```

---

#### GET /api/sgb/meetings

List all meetings for the school.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Query params:** `schoolId`, `status` (`scheduled` | `in_progress` | `completed` | `cancelled`), `type`, `page`, `limit`

---

#### GET /api/sgb/meetings/:id

Get a single meeting with full agenda, minutes, and resolutions.

---

#### PUT /api/sgb/meetings/:id

Update meeting details (title, date, venue, agenda, status).

**Auth:** `school_admin`, `super_admin`

---

#### DELETE /api/sgb/meetings/:id

Soft-delete a meeting.

**Auth:** `school_admin`, `super_admin`

---

#### PUT /api/sgb/meetings/:id/minutes

Record or update meeting minutes.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "content": "Meeting opened at 18:05. Chairperson welcomed all members...",
  "attendees": ["664b2g3h...", "664b2g3h..."],
  "apologies": ["664b2g3h..."]
}
```

---

### 2.5 Resolutions

#### POST /api/sgb/meetings/:meetingId/resolutions

Create a resolution from a meeting.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "title": "Approve 2026 annual budget",
  "description": "The SGB resolves to approve the proposed 2026 annual budget of R3.2 million.",
  "category": "financial",
  "requiresVote": true
}
```

**Validation:** `createResolutionSchema` (Zod)
- `title`: required, min 1 char
- `description`: optional
- `category`: required, enum: `financial` | `policy` | `staffing` | `infrastructure` | `curriculum` | `general`
- `requiresVote`: boolean, default true

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664d4i5j6k7l8m9n0o1p2q3r",
    "meetingId": "664c3h4i5j6k7l8m9n0o1p2q",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "title": "Approve 2026 annual budget",
    "description": "The SGB resolves to approve the proposed 2026 annual budget of R3.2 million.",
    "category": "financial",
    "status": "proposed",
    "requiresVote": true,
    "votes": { "for": 0, "against": 0, "abstain": 0 },
    "proposedBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Resolution created successfully"
}
```

---

#### GET /api/sgb/resolutions

List all resolutions for the school.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Query params:** `schoolId`, `status` (`proposed` | `passed` | `rejected` | `deferred`), `meetingId`, `category`, `page`, `limit`

---

#### POST /api/sgb/resolutions/:id/vote

Cast a vote on a resolution.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Request body:**
```json
{
  "vote": "for"
}
```

**Validation:** `vote` required, enum: `for` | `against` | `abstain`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "votes": { "for": 5, "against": 1, "abstain": 1 },
    "userVote": "for"
  },
  "message": "Vote recorded successfully"
}
```

One vote per member per resolution (upsert). The `voterId` is set from `req.user.id`.

---

### 2.6 Documents

#### POST /api/sgb/documents

Upload a document to the SGB repository.

**Auth:** `school_admin`, `super_admin`

**Content-Type:** `multipart/form-data`

**Fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | yes | PDF, DOCX, XLSX; max 10MB |
| `schoolId` | string | yes | ObjectId |
| `title` | string | yes | Document title |
| `category` | string | yes | `policy` | `financial_statement` | `audit_report` | `minutes` | `constitution` | `annual_report` | `other` |
| `description` | string | no | Brief description |
| `policyReviewDate` | string | no | ISO date — when the policy is due for review |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "664e5j6k7l8m9n0o1p2q3r4s",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "title": "School Code of Conduct 2026",
    "category": "policy",
    "description": "Updated code of conduct for the 2026 academic year",
    "fileUrl": "/uploads/sgb/664e5j6k7l8m9n0o1p2q3r4s.pdf",
    "fileName": "code-of-conduct-2026.pdf",
    "fileSize": 245000,
    "mimeType": "application/pdf",
    "policyReviewDate": "2027-01-15T00:00:00.000Z",
    "uploadedBy": "664a1f2e3b4c5d6e7f8a9b0d",
    "version": 1,
    "isDeleted": false,
    "createdAt": "2026-04-02T08:00:00.000Z"
  },
  "message": "Document uploaded successfully"
}
```

---

#### GET /api/sgb/documents

List all documents for the school.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Query params:** `schoolId`, `category`, `page`, `limit`

---

#### GET /api/sgb/documents/:id/download

Download a document file.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Response:** File stream with appropriate Content-Type and Content-Disposition headers.

---

#### DELETE /api/sgb/documents/:id

Soft-delete a document.

**Auth:** `school_admin`, `super_admin`

---

### 2.7 Policy Approval Workflow

#### POST /api/sgb/policies/propose

Admin proposes a policy for SGB approval. Creates a resolution linked to a document.

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "documentId": "664e5j6k7l8m9n0o1p2q3r4s",
  "title": "Code of Conduct 2026 — Approval",
  "description": "Proposed updates include section 4.2 on mobile phone usage and section 7.1 on uniform policy.",
  "meetingId": "664c3h4i5j6k7l8m9n0o1p2q"
}
```

**Response (201):** Creates an SgbResolution with `category: 'policy'` and links to the document.

---

#### GET /api/sgb/policies/compliance

Returns a compliance dashboard showing policy review status.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Query params:** `schoolId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalPolicies": 12,
    "upToDate": 8,
    "dueForReview": 2,
    "overdue": 2,
    "policies": [
      {
        "documentId": "664e5j6k...",
        "title": "Admissions Policy",
        "category": "policy",
        "policyReviewDate": "2026-01-15T00:00:00.000Z",
        "status": "overdue",
        "daysPastDue": 77
      }
    ]
  }
}
```

---

### 2.8 School Improvement Plan

#### GET /api/sgb/sip

Get the school improvement plan with milestone progress.

**Auth:** `sgb_member`, `school_admin`, `super_admin`

**Query params:** `schoolId`, `year`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "664f6k7l8m9n0o1p2q3r4s5t",
    "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
    "year": 2026,
    "goals": [
      {
        "title": "Improve Grade 12 pass rate to 95%",
        "category": "academic",
        "milestones": [
          { "title": "Extra tuition programme launched", "targetDate": "2026-02-28", "status": "completed", "completedDate": "2026-02-20" },
          { "title": "Mid-year assessment review", "targetDate": "2026-07-15", "status": "in_progress", "completedDate": null }
        ],
        "progress": 50
      }
    ],
    "overallProgress": 42
  }
}
```

---

#### PUT /api/sgb/sip

Create or update the school improvement plan (upsert by schoolId + year).

**Auth:** `school_admin`, `super_admin`

**Request body:**
```json
{
  "schoolId": "664a1f2e3b4c5d6e7f8a9b0c",
  "year": 2026,
  "goals": [
    {
      "title": "Improve Grade 12 pass rate to 95%",
      "category": "academic",
      "milestones": [
        { "title": "Extra tuition programme launched", "targetDate": "2026-02-28", "status": "completed", "completedDate": "2026-02-20" },
        { "title": "Mid-year assessment review", "targetDate": "2026-07-15", "status": "in_progress" }
      ]
    }
  ]
}
```

---

## 3. Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/sgb` | SGB Dashboard | Financial summary cards, enrollment snapshot, upcoming meetings, compliance alerts |
| `/sgb/finance` | Financial Overview | Detailed income/expenditure summaries, budget vs actual charts, trend lines |
| `/sgb/enrollment` | Enrollment Stats | Student count by grade, capacity utilization, year-over-year trends |
| `/sgb/meetings` | Meetings | List of scheduled/past meetings, create meeting (admin only) |
| `/sgb/meetings/[id]` | Meeting Detail | Agenda, minutes, resolutions, attendance |
| `/sgb/resolutions` | Resolutions | All resolutions with status, voting interface |
| `/sgb/documents` | Document Repository | Categorized document list, upload (admin only), download |
| `/sgb/policies` | Policy Compliance | Compliance dashboard, overdue reviews, approval workflow |
| `/sgb/sip` | School Improvement Plan | Goals, milestones, progress tracking |

The SGB portal uses the standard dashboard layout but with a dedicated SGB sidebar navigation showing only the above pages. SGB members see this navigation; admins can toggle between the main admin dashboard and the SGB view.

---

## 4. User Flows

### 4.1 Admin Invites SGB Member
1. Admin navigates to `/sgb` → clicks **Manage Members** or navigates to a members panel.
2. Clicks **Invite Member** — dialog opens.
3. Fills in: Email, First Name, Last Name, Position (dropdown), Term of Office.
4. Submits → `POST /api/sgb/members/invite`.
5. On success: toast "Invitation sent successfully", member appears in list with status `pending`.
6. Invitee receives email with registration link.
7. Invitee completes lightweight registration (name, password) → `POST /api/auth/register` with `role: 'sgb_member'`.
8. On first login, member sees the SGB dashboard.

### 4.2 SGB Member Views Financial Summary
1. SGB member logs in → lands on `/sgb` dashboard.
2. Dashboard shows summary cards: Total Income, Total Expenditure, Net Position, Collection Rate.
3. Member clicks **View Full Report** → navigates to `/sgb/finance`.
4. Selects period (Term 1-4, quarterly, annual) and year from dropdowns.
5. Page loads `GET /api/sgb/finance/summary` and `GET /api/sgb/finance/trends`.
6. Charts render: income vs expenditure bar chart, monthly trend line, budget vs actual comparison.

### 4.3 Schedule and Conduct a Meeting
1. Admin navigates to `/sgb/meetings` → clicks **New Meeting**.
2. Fills in: Title, Date/Time, Venue, Type (ordinary/special/AGM).
3. Adds agenda items with presenter and estimated duration.
4. Submits → `POST /api/sgb/meetings`.
5. Meeting appears in upcoming list; SGB members see it on their dashboard.
6. After the meeting, admin clicks the meeting → **Record Minutes**.
7. Enters minutes text, marks attendees and apologies.
8. Submits → `PUT /api/sgb/meetings/:id/minutes`.
9. Admin adds resolutions from the meeting → `POST /api/sgb/meetings/:meetingId/resolutions`.

### 4.4 Vote on a Resolution
1. SGB member navigates to `/sgb/resolutions` or opens a meeting detail.
2. Sees a resolution with status `proposed` and a **Vote** panel.
3. Clicks **For**, **Against**, or **Abstain**.
4. Submits → `POST /api/sgb/resolutions/:id/vote`.
5. Vote tally updates in real-time. Member's vote is highlighted.
6. When the chairperson (admin) closes voting, resolution status changes to `passed` or `rejected`.

### 4.5 Policy Approval Workflow
1. Admin uploads a new/updated policy document → `POST /api/sgb/documents`.
2. Admin navigates to `/sgb/policies` → clicks **Propose for Approval**.
3. Selects the uploaded document, adds title and description, links to a meeting.
4. Submits → `POST /api/sgb/policies/propose` (creates a resolution).
5. SGB members receive notification and can view the document + vote.
6. After voting concludes, the policy status updates to `approved` or `rejected`.

### 4.6 Review Compliance Dashboard
1. Admin or SGB member navigates to `/sgb/policies`.
2. Page loads `GET /api/sgb/policies/compliance`.
3. Dashboard shows: total policies, up-to-date count, due for review, overdue.
4. Overdue policies are highlighted in destructive color with days past due.
5. Admin can click an overdue policy → opens the document for review/update.

---

## 5. Data Models

### 5.1 SgbMember
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `userId` | ObjectId → User | no | Null until invitation is accepted |
| `schoolId` | ObjectId → School | yes | |
| `email` | string | yes | Invitation email |
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `position` | enum | yes | `chairperson` | `deputy_chairperson` | `secretary` | `treasurer` | `member` | `co_opted` |
| `term` | string | no | e.g. "2026-2029" |
| `status` | enum | yes | `pending` | `active` | `inactive` |
| `invitedBy` | ObjectId → User | yes | Admin who sent the invitation |
| `invitedAt` | Date | yes | |
| `joinedAt` | Date | no | Set when invitation is accepted |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, status }`, `{ email, schoolId }` (unique)

---

### 5.2 SgbMeeting
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `title` | string | yes | |
| `date` | Date | yes | Meeting date/time |
| `venue` | string | yes | |
| `type` | enum | yes | `ordinary` | `special` | `annual_general` |
| `status` | enum | yes | `scheduled` | `in_progress` | `completed` | `cancelled` |
| `agenda` | array | no | `[{ title, presenter?, duration? }]` |
| `minutes` | string | no | Rich text content of minutes |
| `attendees` | ObjectId[] → SgbMember | no | Members who attended |
| `apologies` | ObjectId[] → SgbMember | no | Members who sent apologies |
| `createdBy` | ObjectId → User | yes | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, date DESC }`, `{ schoolId, status }`

---

### 5.3 SgbResolution
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `meetingId` | ObjectId → SgbMeeting | yes | |
| `schoolId` | ObjectId → School | yes | |
| `title` | string | yes | |
| `description` | string | no | |
| `category` | enum | yes | `financial` | `policy` | `staffing` | `infrastructure` | `curriculum` | `general` |
| `status` | enum | yes | `proposed` | `passed` | `rejected` | `deferred` |
| `requiresVote` | boolean | no | Default `true` |
| `votes` | object | no | `{ for: number, against: number, abstain: number }` |
| `voterRecords` | array | no | `[{ voterId: ObjectId, vote: 'for'|'against'|'abstain', votedAt: Date }]` |
| `linkedDocumentId` | ObjectId → SgbDocument | no | For policy approvals |
| `proposedBy` | ObjectId → User | yes | |
| `resolvedAt` | Date | no | When voting was closed |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ meetingId }`, `{ schoolId, status }`, `{ schoolId, category }`

---

### 5.4 SgbDocument
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `title` | string | yes | |
| `category` | enum | yes | `policy` | `financial_statement` | `audit_report` | `minutes` | `constitution` | `annual_report` | `other` |
| `description` | string | no | |
| `fileUrl` | string | yes | Path to uploaded file |
| `fileName` | string | yes | Original file name |
| `fileSize` | number | yes | In bytes |
| `mimeType` | string | yes | |
| `policyReviewDate` | Date | no | When the policy is due for review |
| `version` | number | no | Default `1` |
| `uploadedBy` | ObjectId → User | yes | |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, category }`, `{ schoolId, policyReviewDate }`

---

### 5.5 SchoolImprovementPlan
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `year` | number | yes | Financial/academic year |
| `goals` | array | yes | See sub-schema below |
| `overallProgress` | number | no | Computed: average of goal progress values |
| `isDeleted` | boolean | no | Default `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Goal sub-schema:** `{ title, category ('academic'|'infrastructure'|'governance'|'financial'|'community'), milestones[{ title, targetDate, status ('not_started'|'in_progress'|'completed'|'blocked'), completedDate? }], progress }`

**Indexes:** `{ schoolId, year }` (unique)

---

## 6. State Management

### 6.1 Hook: `useSgbDashboard`
Located at `src/hooks/useSgbDashboard.ts`. Fetches financial summary, enrollment stats, upcoming meetings, and compliance alerts for the SGB dashboard page.

```ts
interface SgbDashboardState {
  financeSummary: FinanceSummary | null;
  enrollmentSummary: EnrollmentSummary | null;
  upcomingMeetings: SgbMeeting[];
  complianceAlerts: PolicyComplianceItem[];
  loading: boolean;
}
```

### 6.2 Hook: `useSgbFinance`
Located at `src/hooks/useSgbFinance.ts`. Fetches detailed financial summaries and trend data. Manages period/year filter state.

```ts
interface SgbFinanceState {
  summary: FinanceSummary | null;
  trends: MonthlyTrend[];
  period: string;
  year: number;
  loading: boolean;
  setPeriod: (period: string) => void;
  setYear: (year: number) => void;
  fetchSummary: () => Promise<void>;
  fetchTrends: () => Promise<void>;
}
```

### 6.3 Hook: `useSgbMeetings`
Located at `src/hooks/useSgbMeetings.ts`. CRUD for meetings, minutes recording, and resolution management.

```ts
interface SgbMeetingsState {
  meetings: SgbMeeting[];
  loading: boolean;
  fetchMeetings: () => Promise<void>;
  createMeeting: (data: CreateMeetingPayload) => Promise<SgbMeeting>;
  updateMeeting: (id: string, data: Partial<SgbMeeting>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  recordMinutes: (id: string, data: MinutesPayload) => Promise<void>;
}
```

### 6.4 Hook: `useSgbResolutions`
Located at `src/hooks/useSgbResolutions.ts`. Resolution listing and voting.

```ts
interface SgbResolutionsState {
  resolutions: SgbResolution[];
  loading: boolean;
  fetchResolutions: (filters?: ResolutionFilters) => Promise<void>;
  createResolution: (meetingId: string, data: CreateResolutionPayload) => Promise<void>;
  castVote: (resolutionId: string, vote: 'for' | 'against' | 'abstain') => Promise<void>;
}
```

### 6.5 Hook: `useSgbDocuments`
Located at `src/hooks/useSgbDocuments.ts`. Document listing, upload, and download.

### 6.6 Hook: `useSgbMembers`
Located at `src/hooks/useSgbMembers.ts`. Member listing, invitation, and status management.

---

## 7. Components Needed

### 7.1 Page Components

| Component | File | Description |
|---|---|---|
| `SgbDashboardPage` | `src/app/(dashboard)/sgb/page.tsx` | Dashboard with summary cards, charts, alerts |
| `SgbFinancePage` | `src/app/(dashboard)/sgb/finance/page.tsx` | Financial overview with period filters |
| `SgbEnrollmentPage` | `src/app/(dashboard)/sgb/enrollment/page.tsx` | Enrollment statistics |
| `SgbMeetingsPage` | `src/app/(dashboard)/sgb/meetings/page.tsx` | Meeting list and creation |
| `SgbMeetingDetailPage` | `src/app/(dashboard)/sgb/meetings/[id]/page.tsx` | Single meeting with agenda, minutes, resolutions |
| `SgbResolutionsPage` | `src/app/(dashboard)/sgb/resolutions/page.tsx` | All resolutions with voting |
| `SgbDocumentsPage` | `src/app/(dashboard)/sgb/documents/page.tsx` | Document repository |
| `SgbPoliciesPage` | `src/app/(dashboard)/sgb/policies/page.tsx` | Compliance dashboard |
| `SgbSipPage` | `src/app/(dashboard)/sgb/sip/page.tsx` | School improvement plan |

### 7.2 Module Components (in `src/components/sgb/`)

| Component | Props / Responsibilities |
|---|---|
| `FinanceSummaryCards` | Renders 4 StatCards: Total Income, Total Expenditure, Net Position, Collection Rate. Props: `summary: FinanceSummary` |
| `BudgetVsActualChart` | Recharts bar chart comparing budgeted vs actual income/expenditure. Props: `data: BudgetComparison` |
| `IncomeExpenditureTrendChart` | Recharts line chart showing monthly income and expenditure trends. Props: `trends: MonthlyTrend[]` |
| `EnrollmentByGradeChart` | Recharts bar chart showing student count per grade with capacity overlay. Props: `grades: GradeEnrollment[]` |
| `EnrollmentTrendChart` | Recharts line chart for year-over-year enrollment. Props: `data: YearOverYear[]` |
| `MeetingList` | DataTable of meetings. Columns: Title, Date, Type, Status, Actions. |
| `MeetingFormDialog` | Dialog to create/edit a meeting with agenda builder. |
| `AgendaBuilder` | Repeatable form rows for agenda items (title, presenter, duration). |
| `MinutesEditor` | Textarea for recording meeting minutes with attendee/apology selection. |
| `ResolutionCard` | Card showing resolution title, description, vote tally, and vote buttons. |
| `VotingPanel` | For/Against/Abstain buttons with current tally and user's existing vote highlighted. |
| `DocumentList` | DataTable of documents. Columns: Title, Category, Uploaded Date, Size, Actions (Download, Delete). |
| `DocumentUploadDialog` | Dialog with file upload, title, category, review date fields. |
| `PolicyComplianceTable` | Table showing each policy with review date, status (up-to-date/due/overdue), days indicator. |
| `SipProgressBoard` | Card-based layout showing SIP goals with milestone checklists and progress bars. |
| `MemberList` | DataTable of SGB members. Columns: Name, Position, Status, Joined Date, Actions. |
| `InviteMemberDialog` | Dialog to invite a new SGB member (email, name, position, term). |

### 7.3 Shared Components to Reuse

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | Page titles and action buttons |
| `StatCard` | `src/components/shared/StatCard` | Financial summary cards |
| `DataTable` | `src/components/shared/DataTable` | Meeting list, document list, member list |
| `EmptyState` | `src/components/shared/EmptyState` | No meetings, no documents, etc. |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `Dialog` / `DialogContent` | `src/components/ui/dialog` | All form dialogs |
| `Badge` | `src/components/ui/badge` | Status badges (passed/rejected/pending) |
| `Card` / `CardContent` | `src/components/ui/card` | Resolution cards, SIP goal cards |
| `Tabs` / `TabsList` | `src/components/ui/tabs` | Navigation within pages |
| `Select` / `SelectItem` | `src/components/ui/select` | Period, year, category filters |
| `Button` | `src/components/ui/button` | All CTAs |

---

## 8. Integration Notes

### 8.1 Financial Data Sources
The `GET /api/sgb/finance/summary` endpoint aggregates data from multiple existing modules:
- **Income**: Summed from `Payment` collection (fee payments received)
- **Expenditure**: Will pull from the Budget module's `Expense` collection (Scope 41) once implemented. Until then, expenditure data is entered manually or returns zeroes.
- **Budget comparison**: Requires the Budget module (Scope 41). The endpoint should gracefully return `null` for budget fields if no budget exists.

### 8.2 Enrollment Data Sources
The `GET /api/sgb/enrollment/summary` endpoint aggregates from the `Student` collection, using `gradeId` for grade grouping and `createdAt` / `status` for new enrollments and departures.

### 8.3 Role and Navigation
The `sgb_member` role must be added to the User model's role enum. The dashboard layout must detect this role and render the SGB-specific sidebar navigation instead of the admin sidebar. SGB members should not see admin routes in navigation.

### 8.4 Invitation Flow
The invitation system creates an `SgbMember` record with `status: 'pending'`. The email contains a link to `/auth/register?invite=<token>&role=sgb_member`. Upon registration, the backend:
1. Creates the User record with `role: 'sgb_member'`
2. Updates the SgbMember record: sets `userId`, `status: 'active'`, `joinedAt`
3. Sends a welcome notification

### 8.5 Monetary Values
All financial values in the API are integers in cents (ZAR). Frontend display must divide by 100 and format with `formatCurrency()` from `src/lib/utils.ts` (or a similar helper). The same pattern used in the Fee module applies here.

### 8.6 Voting Integrity
Each SGB member can cast one vote per resolution. The backend enforces this via a unique compound check on `(resolutionId, voterId)` in the `voterRecords` array. A second vote attempt updates the existing vote (changing their mind is allowed until voting is closed).

### 8.7 Document Storage
Documents are stored using the same upload infrastructure as other file uploads in the platform (e.g., homework attachments). Files are saved to `/uploads/sgb/` with a UUID filename. The `fileUrl` field stores the path relative to the server root.

### 8.8 SGB Portal vs Admin Dashboard
The SGB portal is a separate section of the app, not a subsection of the admin dashboard. SGB members have their own route group (`/sgb/*`). School admins can access both the admin dashboard and the SGB portal — a toggle or link in the admin sidebar provides access.

---

## 9. Acceptance Criteria

### Members
- [ ] Admin can invite SGB members by email with position and term
- [ ] Invited members appear in the member list with `pending` status
- [ ] After registration, member status changes to `active`
- [ ] Admin can update a member's position or deactivate them
- [ ] Admin can remove (soft-delete) an SGB member

### Financial Summaries
- [ ] SGB dashboard shows summary cards: Total Income, Expenditure, Net Position, Collection Rate
- [ ] Financial page allows filtering by period (term/quarter/annual) and year
- [ ] Income vs expenditure bar chart renders correctly
- [ ] Monthly trend line chart renders correctly
- [ ] Budget vs actual comparison displays when budget data is available
- [ ] All monetary values display in Rands (formatted from cents)

### Enrollment
- [ ] Enrollment page shows total students and count per grade
- [ ] Capacity utilization is shown per grade level
- [ ] Year-over-year trend chart renders
- [ ] Gender split statistics display

### Meetings
- [ ] Admin can create meetings with title, date, venue, type, and agenda items
- [ ] Meeting list shows scheduled, completed, and cancelled meetings
- [ ] Admin can record minutes with attendee and apology lists
- [ ] Meeting detail page shows full agenda, minutes, and linked resolutions

### Resolutions and Voting
- [ ] Admin can create resolutions linked to meetings
- [ ] Resolutions display with status, category, and vote tally
- [ ] SGB members can vote: For, Against, or Abstain
- [ ] Each member can only vote once per resolution (can change vote)
- [ ] Vote tally updates immediately after casting
- [ ] Resolution status changes to `passed` or `rejected` when closed

### Documents
- [ ] Admin can upload documents (PDF, DOCX, XLSX up to 10MB) with category and title
- [ ] Document list shows all documents with category filters
- [ ] SGB members can download documents
- [ ] Policy documents show review date

### Policy Compliance
- [ ] Compliance dashboard shows total policies, up-to-date, due, and overdue counts
- [ ] Overdue policies are highlighted with days past due
- [ ] Admin can propose a policy for SGB approval (linked to document + meeting)

### School Improvement Plan
- [ ] SIP page shows goals with milestone checklists
- [ ] Each milestone shows status and progress
- [ ] Overall progress percentage is calculated and displayed
- [ ] Admin can create/update SIP goals and milestones

### General
- [ ] SGB members see only SGB portal pages — no admin dashboard access
- [ ] Admins can access both admin dashboard and SGB portal
- [ ] All pages have loading spinners and empty states
- [ ] All pages are mobile-responsive
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
