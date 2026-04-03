# 45 — Governance: SIP Tracker & Policy Management

## 1. Module Overview

The Governance module provides two interconnected tools for school leadership: a School Improvement Plan (SIP) tracker and a Policy Management system. Both are critical for South African schools, where the Department of Education requires evidence of structured improvement planning (aligned to Whole School Evaluation areas) and up-to-date policies approved by the School Governing Body (SGB).

### School Improvement Plan (SIP)

The SIP tracker allows school leadership to create annual improvement plans with measurable goals, assign responsible persons, set timelines, and track quarterly progress. Each goal is tagged to a WSE (Whole School Evaluation) area — the framework used by the Department of Basic Education for school evaluation in South Africa.

**WSE Areas:**
1. Basic functionality of the school
2. Leadership, management, and communication
3. Governance and relationships
4. Quality of teaching and learning, and educator development
5. Curriculum provision and resources
6. Learner achievement
7. School safety, security, and discipline
8. School infrastructure
9. Parents and community

Goals move through a lifecycle: Not Started → In Progress → Completed / Overdue. Evidence (documents, photos) can be uploaded per goal. Quarterly reviews capture progress notes and updated completion percentages. A dashboard displays RAG (Red/Amber/Green) indicators for overall plan health.

### Policy Management

Schools maintain dozens of policies (code of conduct, admissions, language, assessment, safety, HR, financial, etc.). The policy system provides:

- **Document storage**: policies as uploaded PDFs or rich text entered in the system
- **Version control**: each edit creates a new version, old versions are retained
- **Review cycles**: policies are flagged when they are overdue for annual review
- **Acknowledgement tracking**: staff must acknowledge they have read updated policies
- **SGB approval workflow**: new or updated policies can be submitted for SGB approval (links to scope 40 if implemented)
- **Categories**: HR, Academic, Safety, Financial, Governance, General

### Access Control

- **school_admin** and **isSchoolPrincipal**: full CRUD on SIPs and policies, can assign goals and manage approvals
- **teacher**: can view SIPs (read-only), view and acknowledge policies, be assigned as responsible person on SIP goals
- **parent (SGB member)**: can view policies pending SGB approval and vote (via scope 40 integration)
- **super_admin**: platform-wide access for compliance auditing

All routes are mounted under `/api/governance`. Module guard: `requireModule('governance')`.

---

## 2. Backend API Endpoints

All endpoints are mounted at `/api/governance`. Authentication required via `authenticate` middleware.

---

### 2.1 SIP Plans

#### POST /api/governance/sip

Create a new School Improvement Plan.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Request body:**

```json
{
  "title": "2026 Annual School Improvement Plan",
  "schoolId": "6650a1b2c3d4e5f678900001",
  "year": 2026,
  "startDate": "2026-01-15",
  "endDate": "2026-12-15",
  "description": "Focused on improving learner achievement in Mathematics and Science, and strengthening school safety protocols."
}
```

**Validation:** `title` required (min 3 chars), `year` required (integer, 2020-2099), `startDate` and `endDate` required (ISO date strings, endDate > startDate).

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678910001",
    "title": "2026 Annual School Improvement Plan",
    "schoolId": "6650a1b2c3d4e5f678900001",
    "year": 2026,
    "startDate": "2026-01-15T00:00:00.000Z",
    "endDate": "2026-12-15T00:00:00.000Z",
    "description": "Focused on improving learner achievement in Mathematics and Science, and strengthening school safety protocols.",
    "status": "active",
    "createdBy": "6650a1b2c3d4e5f678905000",
    "isDeleted": false,
    "createdAt": "2026-04-01T08:00:00.000Z",
    "updatedAt": "2026-04-01T08:00:00.000Z"
  },
  "message": "School improvement plan created successfully"
}
```

---

#### GET /api/governance/sip

List all SIP plans for the school.

**Auth:** Any authenticated user (school-scoped)

**Query params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | no | `1` | Page number |
| `limit` | number | no | `20` | Results per page |
| `year` | number | no | — | Filter by year |
| `status` | string | no | — | `active`, `completed`, `archived` |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "_id": "6650a1b2c3d4e5f678910001",
        "title": "2026 Annual School Improvement Plan",
        "year": 2026,
        "startDate": "2026-01-15T00:00:00.000Z",
        "endDate": "2026-12-15T00:00:00.000Z",
        "status": "active",
        "goalCount": 8,
        "completedGoalCount": 2,
        "overallProgress": 35,
        "createdAt": "2026-04-01T08:00:00.000Z"
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20
  },
  "message": "School improvement plans retrieved successfully"
}
```

**Notes:** `goalCount`, `completedGoalCount`, and `overallProgress` are computed via aggregation from the SIP goals.

---

#### GET /api/governance/sip/:id

Get a single SIP plan with its goals.

**Auth:** Any authenticated user (school-scoped)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678910001",
    "title": "2026 Annual School Improvement Plan",
    "schoolId": "6650a1b2c3d4e5f678900001",
    "year": 2026,
    "startDate": "2026-01-15T00:00:00.000Z",
    "endDate": "2026-12-15T00:00:00.000Z",
    "description": "Focused on improving learner achievement...",
    "status": "active",
    "createdBy": {
      "_id": "6650a1b2c3d4e5f678905000",
      "firstName": "Admin",
      "lastName": "User"
    },
    "goals": [
      {
        "_id": "6650a1b2c3d4e5f678920001",
        "title": "Improve Grade 9 Maths pass rate to 75%",
        "wseArea": 6,
        "wseAreaName": "Learner achievement",
        "strategy": "Weekly extra maths lessons, peer tutoring programme",
        "responsiblePerson": {
          "_id": "6650a1b2c3d4e5f678905679",
          "firstName": "Thabo",
          "lastName": "Mokoena"
        },
        "targetDate": "2026-09-30T00:00:00.000Z",
        "status": "in_progress",
        "progressPercent": 45,
        "ragStatus": "amber"
      }
    ],
    "isDeleted": false,
    "createdAt": "2026-04-01T08:00:00.000Z",
    "updatedAt": "2026-04-01T08:00:00.000Z"
  },
  "message": "School improvement plan retrieved successfully"
}
```

---

#### PUT /api/governance/sip/:id

Update a SIP plan. Cannot change `schoolId`.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Request body:** All fields optional: `title`, `year`, `startDate`, `endDate`, `description`, `status`.

**Response 200:** Updated plan object.

---

#### DELETE /api/governance/sip/:id

Soft-delete a SIP plan and cascade soft-delete all its goals.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Response 200:** `{ "success": true, "data": null, "message": "School improvement plan deleted successfully" }`

---

### 2.2 SIP Goals

#### POST /api/governance/sip/:sipId/goals

Add a goal to a SIP plan.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Request body:**

```json
{
  "title": "Improve Grade 9 Maths pass rate to 75%",
  "wseArea": 6,
  "strategy": "Weekly extra maths lessons, peer tutoring programme, Saturday school for at-risk learners",
  "responsiblePersonId": "6650a1b2c3d4e5f678905679",
  "targetDate": "2026-09-30",
  "successIndicators": "Grade 9 Maths pass rate >= 75% in Term 3 exams",
  "resources": "R5,000 for study materials, 2 extra teacher hours per week"
}
```

**Validation:** `title` required (min 3), `wseArea` required (integer 1-9), `targetDate` required, `responsiblePersonId` required (valid ObjectId).

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678920001",
    "sipId": "6650a1b2c3d4e5f678910001",
    "schoolId": "6650a1b2c3d4e5f678900001",
    "title": "Improve Grade 9 Maths pass rate to 75%",
    "wseArea": 6,
    "wseAreaName": "Learner achievement",
    "strategy": "Weekly extra maths lessons, peer tutoring programme, Saturday school for at-risk learners",
    "responsiblePerson": {
      "_id": "6650a1b2c3d4e5f678905679",
      "firstName": "Thabo",
      "lastName": "Mokoena"
    },
    "targetDate": "2026-09-30T00:00:00.000Z",
    "successIndicators": "Grade 9 Maths pass rate >= 75% in Term 3 exams",
    "resources": "R5,000 for study materials, 2 extra teacher hours per week",
    "status": "not_started",
    "progressPercent": 0,
    "ragStatus": "red",
    "evidence": [],
    "reviews": [],
    "isDeleted": false,
    "createdAt": "2026-04-01T08:30:00.000Z",
    "updatedAt": "2026-04-01T08:30:00.000Z"
  },
  "message": "SIP goal created successfully"
}
```

---

#### PUT /api/governance/sip/:sipId/goals/:goalId

Update a goal (title, strategy, responsible person, target date, status, progress).

**Auth:** `school_admin` or `isSchoolPrincipal`

**Request body:** All fields optional.

**Response 200:** Updated goal object.

---

#### POST /api/governance/sip/:sipId/goals/:goalId/evidence

Upload evidence for a goal.

**Auth:** `school_admin`, `isSchoolPrincipal`, or the goal's `responsiblePerson`

**Request:** `multipart/form-data` with fields:
- `file` — the evidence document (PDF, JPG, PNG, DOCX; max 10MB)
- `description` — text description of the evidence

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678930001",
    "goalId": "6650a1b2c3d4e5f678920001",
    "fileUrl": "/uploads/governance/evidence-1234.pdf",
    "fileName": "grade9-maths-results-term1.pdf",
    "fileType": "application/pdf",
    "description": "Term 1 Grade 9 Mathematics results showing 68% pass rate (baseline)",
    "uploadedBy": {
      "_id": "6650a1b2c3d4e5f678905679",
      "firstName": "Thabo",
      "lastName": "Mokoena"
    },
    "createdAt": "2026-04-15T10:00:00.000Z"
  },
  "message": "Evidence uploaded successfully"
}
```

---

#### POST /api/governance/sip/:sipId/goals/:goalId/reviews

Add a quarterly review note to a goal.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Request body:**

```json
{
  "quarter": 1,
  "progressPercent": 45,
  "notes": "Extra maths lessons started in Week 3. 15 learners attending Saturday school. Peer tutoring matched 8 pairs. Early signs of improvement in class tests.",
  "status": "in_progress",
  "challenges": "Difficulty finding volunteer tutors. Budget for materials not yet released.",
  "nextSteps": "Follow up with finance on budget release. Recruit 2 more volunteer tutors."
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678940001",
    "goalId": "6650a1b2c3d4e5f678920001",
    "quarter": 1,
    "progressPercent": 45,
    "notes": "Extra maths lessons started in Week 3...",
    "status": "in_progress",
    "challenges": "Difficulty finding volunteer tutors...",
    "nextSteps": "Follow up with finance on budget release...",
    "reviewedBy": {
      "_id": "6650a1b2c3d4e5f678905000",
      "firstName": "Admin",
      "lastName": "User"
    },
    "createdAt": "2026-04-15T11:00:00.000Z"
  },
  "message": "Quarterly review added successfully"
}
```

---

#### GET /api/governance/sip/:sipId/dashboard

Get the SIP dashboard data — aggregated progress across all goals with RAG indicators.

**Auth:** Any authenticated user (school-scoped)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "sipId": "6650a1b2c3d4e5f678910001",
    "title": "2026 Annual School Improvement Plan",
    "overallProgress": 35,
    "ragSummary": {
      "red": 2,
      "amber": 4,
      "green": 2
    },
    "byWseArea": [
      { "wseArea": 4, "wseAreaName": "Quality of teaching and learning", "goalCount": 3, "avgProgress": 50, "ragStatus": "amber" },
      { "wseArea": 6, "wseAreaName": "Learner achievement", "goalCount": 2, "avgProgress": 45, "ragStatus": "amber" },
      { "wseArea": 7, "wseAreaName": "School safety, security, and discipline", "goalCount": 2, "avgProgress": 10, "ragStatus": "red" },
      { "wseArea": 8, "wseAreaName": "School infrastructure", "goalCount": 1, "avgProgress": 80, "ragStatus": "green" }
    ],
    "overdueGoals": [
      {
        "_id": "6650a1b2c3d4e5f678920003",
        "title": "Install CCTV cameras in all corridors",
        "targetDate": "2026-03-31T00:00:00.000Z",
        "responsiblePerson": { "firstName": "Jane", "lastName": "Smith" },
        "progressPercent": 10
      }
    ],
    "upcomingDeadlines": [
      {
        "_id": "6650a1b2c3d4e5f678920001",
        "title": "Improve Grade 9 Maths pass rate to 75%",
        "targetDate": "2026-09-30T00:00:00.000Z",
        "progressPercent": 45,
        "daysRemaining": 182
      }
    ]
  },
  "message": "SIP dashboard data retrieved successfully"
}
```

**RAG logic:**
- **Green:** `progressPercent >= expectedProgress` (where expected = elapsed time / total time * 100)
- **Amber:** `progressPercent >= expectedProgress - 20` (within 20% of expected)
- **Red:** `progressPercent < expectedProgress - 20` OR status is `overdue`

---

### 2.3 Policies

#### POST /api/governance/policies

Create a new school policy.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Request body:**

```json
{
  "title": "Code of Conduct for Learners",
  "category": "academic",
  "content": "<rich text content of the policy>",
  "fileUrl": null,
  "effectiveDate": "2026-01-15",
  "reviewDate": "2027-01-15",
  "requiresAcknowledgement": true,
  "requiresSGBApproval": true
}
```

**Validation:** `title` required (min 3), `category` required (enum), `effectiveDate` required. Either `content` (rich text) or `fileUrl` must be provided.

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678950001",
    "title": "Code of Conduct for Learners",
    "schoolId": "6650a1b2c3d4e5f678900001",
    "category": "academic",
    "content": "<rich text content>",
    "fileUrl": null,
    "version": 1,
    "effectiveDate": "2026-01-15T00:00:00.000Z",
    "reviewDate": "2027-01-15T00:00:00.000Z",
    "status": "draft",
    "requiresAcknowledgement": true,
    "requiresSGBApproval": true,
    "sgbApprovalStatus": "pending",
    "createdBy": "6650a1b2c3d4e5f678905000",
    "isDeleted": false,
    "createdAt": "2026-04-01T09:00:00.000Z",
    "updatedAt": "2026-04-01T09:00:00.000Z"
  },
  "message": "Policy created successfully"
}
```

---

#### GET /api/governance/policies

List all policies for the school.

**Auth:** Any authenticated user (school-scoped)

**Query params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | no | `1` | Page number |
| `limit` | number | no | `20` | Results per page |
| `category` | string | no | — | Filter by category |
| `status` | string | no | — | `draft`, `active`, `archived`, `under_review` |
| `search` | string | no | — | Search by title |
| `overdue` | boolean | no | — | If `true`, only return policies past their `reviewDate` |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "policies": [
      {
        "_id": "6650a1b2c3d4e5f678950001",
        "title": "Code of Conduct for Learners",
        "category": "academic",
        "version": 1,
        "status": "active",
        "effectiveDate": "2026-01-15T00:00:00.000Z",
        "reviewDate": "2027-01-15T00:00:00.000Z",
        "isOverdueForReview": false,
        "acknowledgementCount": 18,
        "totalStaff": 25,
        "requiresAcknowledgement": true,
        "createdAt": "2026-04-01T09:00:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20
  },
  "message": "Policies retrieved successfully"
}
```

---

#### GET /api/governance/policies/:id

Get a single policy with version history and acknowledgement stats.

**Auth:** Any authenticated user (school-scoped)

**Response 200:** Full policy object including `content`/`fileUrl`, `versionHistory` array, `acknowledgements` summary.

---

#### PUT /api/governance/policies/:id

Update a policy. Creates a new version — the current state is archived in the `versionHistory` array before the update is applied.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Request body:** All fields optional: `title`, `category`, `content`, `fileUrl`, `effectiveDate`, `reviewDate`, `status`, `requiresAcknowledgement`, `requiresSGBApproval`.

**Side effects:**
- Version number increments by 1
- Previous version is pushed to `versionHistory` array with a timestamp
- If `requiresAcknowledgement` is `true`, all existing acknowledgements are invalidated (staff must re-acknowledge the new version)
- Audit log entry created

**Response 200:** Updated policy with incremented version.

---

#### DELETE /api/governance/policies/:id

Soft-delete a policy.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Response 200:** `{ "success": true, "data": null, "message": "Policy deleted successfully" }`

---

#### POST /api/governance/policies/:id/acknowledge

Acknowledge a policy. One acknowledgement per user per version.

**Auth:** Any authenticated staff user (`school_admin` or `teacher`)

**Request body:**

```json
{
  "acknowledged": true
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678960001",
    "policyId": "6650a1b2c3d4e5f678950001",
    "userId": "6650a1b2c3d4e5f678905679",
    "version": 1,
    "acknowledgedAt": "2026-04-02T08:15:00.000Z"
  },
  "message": "Policy acknowledged successfully"
}
```

**Error 400 (duplicate):** `{ "success": false, "message": "You have already acknowledged this version of the policy" }`

---

#### GET /api/governance/policies/:id/acknowledgements

Get the acknowledgement status for a policy — who has and has not acknowledged.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "policyId": "6650a1b2c3d4e5f678950001",
    "version": 1,
    "totalStaff": 25,
    "acknowledged": [
      {
        "userId": { "_id": "6650a1b2c3d4e5f678905679", "firstName": "Thabo", "lastName": "Mokoena" },
        "acknowledgedAt": "2026-04-02T08:15:00.000Z"
      }
    ],
    "pending": [
      {
        "userId": { "_id": "6650a1b2c3d4e5f678905680", "firstName": "Sarah", "lastName": "Nkosi" }
      }
    ]
  },
  "message": "Policy acknowledgements retrieved successfully"
}
```

---

## 3. Frontend Pages

### 3.1 Admin Governance Page

**Route:** `/admin/governance`
**File:** `src/app/(dashboard)/admin/governance/page.tsx`

The main governance management page for school admins and principals. Uses a tab-based layout.

| Tab | Content |
|---|---|
| SIP Dashboard | RAG overview of current SIP, progress by WSE area, overdue goals, upcoming deadlines |
| SIP Plans | List of all SIP plans (year filter), create/edit plans, drill into goals |
| Goals | Full list of SIP goals across all plans, filterable by WSE area, status, responsible person |
| Policies | Policy library with category filter, status badges, acknowledgement progress bars |
| Reviews | Timeline of quarterly reviews across all goals |

### 3.2 SIP Goal Detail Page

**Route:** `/admin/governance/sip/:sipId/goals/:goalId`
**File:** `src/app/(dashboard)/admin/governance/sip/[sipId]/goals/[goalId]/page.tsx`

A detail view for a single SIP goal showing:
- Goal summary card (title, WSE area, responsible person, target date, RAG badge)
- Progress bar with percentage
- Evidence gallery (uploaded documents with download links)
- Quarterly review timeline
- Actions: upload evidence, add review, edit goal

### 3.3 Policy Detail Page

**Route:** `/admin/governance/policies/:id`
**File:** `src/app/(dashboard)/admin/governance/policies/[id]/page.tsx`

Detail view for a single policy:
- Policy content (rendered rich text or PDF viewer)
- Version history sidebar
- Acknowledgement progress bar
- Staff acknowledgement list (acknowledged / pending)
- Actions: edit policy, request SGB approval

### 3.4 Teacher Policy Viewer

**Route:** `/teacher/policies`
**File:** `src/app/(dashboard)/teacher/policies/page.tsx`

Read-only policy list for teachers. Shows policies they need to acknowledge with a prominent "Acknowledge" button. Policies already acknowledged show a green checkmark.

---

## 4. User Flows

### 4.1 Principal Creates a SIP

1. Principal navigates to `/admin/governance`, clicks "SIP Plans" tab.
2. Clicks "New Improvement Plan" — `SIPCreateDialog` opens.
3. Fills in: title, year, start/end dates, description.
4. Submits → `POST /api/governance/sip`.
5. On success: toast "School improvement plan created", plan appears in list.
6. Principal clicks the new plan to add goals.

### 4.2 Add Goals to a SIP

1. From the SIP detail view, principal clicks "Add Goal".
2. `GoalCreateDialog` opens with fields: title, WSE area (dropdown of 9 areas), strategy, responsible person (staff selector), target date, success indicators, resources.
3. Submits → `POST /api/governance/sip/:sipId/goals`.
4. Goal appears in the goal list under the SIP.

### 4.3 Upload Evidence for a Goal

1. The responsible person (or admin) opens the goal detail page.
2. Clicks "Upload Evidence" in the evidence section.
3. `EvidenceUploadDialog` opens: file picker + description text field.
4. Submits → `POST /api/governance/sip/:sipId/goals/:goalId/evidence` (multipart).
5. Evidence appears in the gallery with a download link.

### 4.4 Quarterly Review

1. Admin/principal opens a goal's detail page at the end of a quarter.
2. Clicks "Add Quarterly Review" — `ReviewDialog` opens.
3. Fills in: quarter (1-4), progress percentage, notes, challenges, next steps, updated status.
4. Submits → `POST /api/governance/sip/:sipId/goals/:goalId/reviews`.
5. Review appears in the timeline. Goal's progress percentage and RAG status update.

### 4.5 Create and Publish a Policy

1. Admin navigates to the "Policies" tab, clicks "New Policy".
2. `PolicyCreateDialog` opens: title, category, content (rich text editor) or file upload, effective date, review date, toggles for acknowledgement required and SGB approval required.
3. Submits → `POST /api/governance/policies`. Status is `draft`.
4. Admin reviews the draft, then clicks "Publish" — `PUT /api/governance/policies/:id` with `{ status: 'active' }`.
5. If `requiresAcknowledgement` is true, all staff see the policy in their "Pending Acknowledgements" list.

### 4.6 Staff Acknowledges a Policy

1. Teacher navigates to `/teacher/policies`.
2. Sees a banner: "2 policies require your acknowledgement."
3. Opens the policy, reads the content.
4. Clicks "I have read and understood this policy" button.
5. Frontend calls `POST /api/governance/policies/:id/acknowledge` with `{ acknowledged: true }`.
6. Policy moves from "Pending" to "Acknowledged" in the teacher's view.

### 4.7 Admin Reviews Acknowledgement Progress

1. Admin opens a policy detail page.
2. The acknowledgement progress bar shows "18/25 staff acknowledged" (72%).
3. Admin clicks "View Details" to see the full list: acknowledged (with dates) and pending.
4. Admin can use this to follow up with staff who haven't acknowledged.

---

## 5. Data Models

### SIPPlan

Collection name: `sipplans`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | String | yes | — | Plan name, trimmed |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `year` | Number | yes | — | Calendar year (2020-2099) |
| `startDate` | Date | yes | — | Plan start |
| `endDate` | Date | yes | — | Plan end |
| `description` | String | no | `''` | Free-text description |
| `status` | String enum | no | `'active'` | `'active'`, `'completed'`, `'archived'` |
| `createdBy` | ObjectId (ref: `User`) | yes | — | User who created the plan |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**Indexes:** `{ schoolId: 1, year: -1 }`, `{ schoolId: 1, status: 1 }`

### SIPGoal

Collection name: `sipgoals`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `sipId` | ObjectId (ref: `SIPPlan`) | yes | — | Parent plan |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation (denormalized for query perf) |
| `title` | String | yes | — | Goal description |
| `wseArea` | Number | yes | — | WSE area number (1-9) |
| `strategy` | String | no | `''` | How the goal will be achieved |
| `responsiblePersonId` | ObjectId (ref: `User`) | yes | — | Staff member responsible |
| `targetDate` | Date | yes | — | Deadline |
| `successIndicators` | String | no | `''` | Measurable success criteria |
| `resources` | String | no | `''` | Budget/resources needed |
| `status` | String enum | no | `'not_started'` | `'not_started'`, `'in_progress'`, `'completed'`, `'overdue'` |
| `progressPercent` | Number | no | `0` | 0-100 |
| `evidence` | [ObjectId] (ref: `SIPEvidence`) | no | `[]` | Uploaded evidence documents |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**Indexes:** `{ sipId: 1, isDeleted: 1 }`, `{ schoolId: 1, wseArea: 1 }`, `{ responsiblePersonId: 1 }`

### SIPEvidence

Collection name: `sipevidence`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `goalId` | ObjectId (ref: `SIPGoal`) | yes | — | Parent goal |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `fileUrl` | String | yes | — | Path to uploaded file |
| `fileName` | String | yes | — | Original file name |
| `fileType` | String | yes | — | MIME type |
| `description` | String | no | `''` | Description of the evidence |
| `uploadedBy` | ObjectId (ref: `User`) | yes | — | Uploader |
| `isDeleted` | Boolean | no | `false` | Soft delete |

### SIPReview

Collection name: `sipreviews`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `goalId` | ObjectId (ref: `SIPGoal`) | yes | — | Parent goal |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `quarter` | Number | yes | — | 1-4 |
| `progressPercent` | Number | yes | — | 0-100 at time of review |
| `notes` | String | yes | — | Review notes |
| `status` | String enum | yes | — | Goal status at time of review |
| `challenges` | String | no | `''` | Challenges encountered |
| `nextSteps` | String | no | `''` | Planned actions |
| `reviewedBy` | ObjectId (ref: `User`) | yes | — | Reviewer |
| `isDeleted` | Boolean | no | `false` | Soft delete |

### Policy

Collection name: `policies`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | String | yes | — | Policy name |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `category` | String enum | yes | — | `'hr'`, `'academic'`, `'safety'`, `'financial'`, `'governance'`, `'general'` |
| `content` | String | no | — | Rich text content (mutually exclusive with fileUrl) |
| `fileUrl` | String | no | — | Uploaded document URL |
| `version` | Number | no | `1` | Increments on each edit |
| `effectiveDate` | Date | yes | — | When the policy takes effect |
| `reviewDate` | Date | no | — | When the policy is due for review |
| `status` | String enum | no | `'draft'` | `'draft'`, `'active'`, `'archived'`, `'under_review'` |
| `requiresAcknowledgement` | Boolean | no | `false` | Whether staff must acknowledge |
| `requiresSGBApproval` | Boolean | no | `false` | Whether SGB must approve |
| `sgbApprovalStatus` | String enum | no | `'none'` | `'none'`, `'pending'`, `'approved'`, `'rejected'` |
| `versionHistory` | [PolicyVersion] | no | `[]` | Previous versions (embedded sub-docs) |
| `createdBy` | ObjectId (ref: `User`) | yes | — | Creator |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**PolicyVersion subdocument:** `{ version: Number, title: String, content: String, fileUrl: String, changedBy: ObjectId, changedAt: Date }`

**Indexes:** `{ schoolId: 1, category: 1, isDeleted: 1 }`, `{ schoolId: 1, status: 1 }`, `{ schoolId: 1, reviewDate: 1 }`

### PolicyAcknowledgement

Collection name: `policyacknowledgements`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `policyId` | ObjectId (ref: `Policy`) | yes | — | Which policy |
| `userId` | ObjectId (ref: `User`) | yes | — | Who acknowledged |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `version` | Number | yes | — | Which version they acknowledged |
| `acknowledgedAt` | Date | yes | — | Timestamp |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**Indexes:** `{ policyId: 1, userId: 1, version: 1 }` (unique), `{ schoolId: 1, userId: 1 }`

### Frontend TypeScript Interfaces

```ts
interface SIPPlan {
  id: string;
  title: string;
  schoolId: string;
  year: number;
  startDate: string;
  endDate: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  createdBy: { id: string; firstName: string; lastName: string };
  goalCount?: number;
  completedGoalCount?: number;
  overallProgress?: number;
  goals?: SIPGoal[];
  createdAt: string;
  updatedAt: string;
}

type RAGStatus = 'red' | 'amber' | 'green';

interface SIPGoal {
  id: string;
  sipId: string;
  title: string;
  wseArea: number;
  wseAreaName: string;
  strategy: string;
  responsiblePerson: { id: string; firstName: string; lastName: string };
  targetDate: string;
  successIndicators: string;
  resources: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  progressPercent: number;
  ragStatus: RAGStatus;
  evidence: SIPEvidence[];
  reviews: SIPReview[];
  createdAt: string;
  updatedAt: string;
}

interface SIPEvidence {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  description: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

interface SIPReview {
  id: string;
  quarter: number;
  progressPercent: number;
  notes: string;
  status: string;
  challenges: string;
  nextSteps: string;
  reviewedBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

type PolicyCategory = 'hr' | 'academic' | 'safety' | 'financial' | 'governance' | 'general';

interface Policy {
  id: string;
  title: string;
  schoolId: string;
  category: PolicyCategory;
  content: string | null;
  fileUrl: string | null;
  version: number;
  effectiveDate: string;
  reviewDate: string | null;
  status: 'draft' | 'active' | 'archived' | 'under_review';
  requiresAcknowledgement: boolean;
  requiresSGBApproval: boolean;
  sgbApprovalStatus: 'none' | 'pending' | 'approved' | 'rejected';
  isOverdueForReview?: boolean;
  acknowledgementCount?: number;
  totalStaff?: number;
  versionHistory: PolicyVersion[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PolicyVersion {
  version: number;
  title: string;
  content: string | null;
  fileUrl: string | null;
  changedBy: string;
  changedAt: string;
}

interface PolicyAcknowledgement {
  id: string;
  policyId: string;
  userId: { id: string; firstName: string; lastName: string };
  version: number;
  acknowledgedAt: string;
}

interface SIPDashboard {
  sipId: string;
  title: string;
  overallProgress: number;
  ragSummary: { red: number; amber: number; green: number };
  byWseArea: Array<{
    wseArea: number;
    wseAreaName: string;
    goalCount: number;
    avgProgress: number;
    ragStatus: RAGStatus;
  }>;
  overdueGoals: Array<{
    id: string;
    title: string;
    targetDate: string;
    responsiblePerson: { firstName: string; lastName: string };
    progressPercent: number;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    targetDate: string;
    progressPercent: number;
    daysRemaining: number;
  }>;
}
```

---

## 6. State Management

### `useGovernance` Hook

**File:** `src/hooks/useGovernance.ts`

```ts
interface UseGovernanceReturn {
  // SIP Plans
  plans: SIPPlan[];
  plansLoading: boolean;
  fetchPlans: (params?: { year?: number; status?: string }) => Promise<void>;
  createPlan: (data: Partial<SIPPlan>) => Promise<SIPPlan>;
  updatePlan: (id: string, data: Partial<SIPPlan>) => Promise<SIPPlan>;
  deletePlan: (id: string) => Promise<void>;

  // SIP Goals
  goals: SIPGoal[];
  goalsLoading: boolean;
  fetchGoals: (sipId: string) => Promise<void>;
  createGoal: (sipId: string, data: Partial<SIPGoal>) => Promise<SIPGoal>;
  updateGoal: (sipId: string, goalId: string, data: Partial<SIPGoal>) => Promise<SIPGoal>;
  uploadEvidence: (sipId: string, goalId: string, file: File, description: string) => Promise<SIPEvidence>;
  addReview: (sipId: string, goalId: string, data: Partial<SIPReview>) => Promise<SIPReview>;

  // Dashboard
  dashboard: SIPDashboard | null;
  dashboardLoading: boolean;
  fetchDashboard: (sipId: string) => Promise<void>;

  // Policies
  policies: Policy[];
  policiesLoading: boolean;
  fetchPolicies: (params?: { category?: string; status?: string; search?: string; overdue?: boolean }) => Promise<void>;
  createPolicy: (data: Partial<Policy>) => Promise<Policy>;
  updatePolicy: (id: string, data: Partial<Policy>) => Promise<Policy>;
  deletePolicy: (id: string) => Promise<void>;
  acknowledgePolicy: (id: string) => Promise<void>;
  fetchAcknowledgements: (id: string) => Promise<{ acknowledged: PolicyAcknowledgement[]; pending: Array<{ userId: { id: string; firstName: string; lastName: string } }> }>;
}
```

**Key behaviours:**
- All API calls use `apiClient` from `src/lib/api-client.ts`.
- `schoolId` is sourced from `useAuthStore` inside the hook — not passed as a parameter.
- Evidence upload uses `FormData` with `apiClient.post` and `Content-Type: multipart/form-data` header.
- Error handling: `catch (err: unknown)` with toast notification via Sonner.

---

## 7. Components Needed

### New Components

| Component | File | Purpose |
|---|---|---|
| `SIPDashboardView` | `src/components/governance/SIPDashboardView.tsx` | RAG summary cards, WSE area progress bars, overdue goals list, upcoming deadlines |
| `SIPPlanList` | `src/components/governance/SIPPlanList.tsx` | DataTable of SIP plans with year/status filters |
| `SIPPlanCreateDialog` | `src/components/governance/SIPPlanCreateDialog.tsx` | Form dialog for creating/editing a SIP plan |
| `SIPGoalList` | `src/components/governance/SIPGoalList.tsx` | List of goals within a SIP, filterable by WSE area and status |
| `SIPGoalCreateDialog` | `src/components/governance/SIPGoalCreateDialog.tsx` | Form dialog for creating/editing a goal. WSE area dropdown, staff selector, date picker. |
| `SIPGoalDetailView` | `src/components/governance/SIPGoalDetailView.tsx` | Full goal detail: progress, evidence gallery, review timeline |
| `RAGBadge` | `src/components/governance/RAGBadge.tsx` | Colour-coded badge: red/amber/green with label |
| `WSEAreaBadge` | `src/components/governance/WSEAreaBadge.tsx` | Numbered badge with WSE area name tooltip |
| `EvidenceGallery` | `src/components/governance/EvidenceGallery.tsx` | Grid of evidence items with file type icons, descriptions, download links |
| `EvidenceUploadDialog` | `src/components/governance/EvidenceUploadDialog.tsx` | File upload with description field |
| `ReviewTimeline` | `src/components/governance/ReviewTimeline.tsx` | Vertical timeline of quarterly reviews with notes, status, progress |
| `ReviewDialog` | `src/components/governance/ReviewDialog.tsx` | Form for adding a quarterly review |
| `PolicyList` | `src/components/governance/PolicyList.tsx` | DataTable of policies with category/status filters, acknowledgement progress bars |
| `PolicyCreateDialog` | `src/components/governance/PolicyCreateDialog.tsx` | Form for creating/editing a policy: rich text editor or file upload, category, dates |
| `PolicyDetailView` | `src/components/governance/PolicyDetailView.tsx` | Renders policy content, version history, acknowledgement status |
| `PolicyAcknowledgeButton` | `src/components/governance/PolicyAcknowledgeButton.tsx` | "I acknowledge" button with confirmation. Disabled if already acknowledged. |
| `AcknowledgementTracker` | `src/components/governance/AcknowledgementTracker.tsx` | Progress bar + staff list (acknowledged/pending) |
| `PolicyVersionHistory` | `src/components/governance/PolicyVersionHistory.tsx` | Sidebar or collapsible showing previous versions with dates |

### Shared Components Used

| Component | File | Notes |
|---|---|---|
| `DataTable` | `src/components/shared/DataTable.tsx` | Base for plan, goal, policy tables |
| `PageHeader` | `src/components/shared/PageHeader.tsx` | Page titles |
| `StatCard` | `src/components/shared/StatCard.tsx` | Dashboard summary stats |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner.tsx` | Loading states |
| `EmptyState` | `src/components/shared/EmptyState.tsx` | Empty states |
| `DateRangePicker` | `src/components/ui/` | Date selection in filters and forms |

---

## 8. Integration Notes

### WSE Area Mapping

The WSE area numbers (1-9) map to human-readable names. This mapping should be a constant in `src/lib/constants.ts`:

```typescript
export const WSE_AREAS: Record<number, string> = {
  1: 'Basic functionality of the school',
  2: 'Leadership, management, and communication',
  3: 'Governance and relationships',
  4: 'Quality of teaching and learning, and educator development',
  5: 'Curriculum provision and resources',
  6: 'Learner achievement',
  7: 'School safety, security, and discipline',
  8: 'School infrastructure',
  9: 'Parents and community',
};
```

### RAG Status Computation

RAG status is computed on the backend for goals. The formula:

```typescript
function computeRAG(goal: SIPGoal, plan: SIPPlan): 'red' | 'amber' | 'green' {
  const now = new Date();
  const start = new Date(plan.startDate);
  const target = new Date(goal.targetDate);
  const elapsed = (now.getTime() - start.getTime()) / (target.getTime() - start.getTime());
  const expectedProgress = Math.min(100, Math.max(0, elapsed * 100));

  if (goal.status === 'overdue' || goal.progressPercent < expectedProgress - 20) return 'red';
  if (goal.progressPercent < expectedProgress) return 'amber';
  return 'green';
}
```

### Module Guard Registration

Add `governance` to the module guard list in `app.ts`:

```typescript
app.use('/api/governance', authenticate, requireModule('governance'), governanceRoutes);
```

### SGB Approval Integration (Scope 40)

If scope 40 (SGB Management) is implemented, policies with `requiresSGBApproval: true` should integrate:
- When a policy is published, an approval request is created in the SGB module.
- SGB members vote to approve or reject.
- The policy's `sgbApprovalStatus` is updated based on the vote outcome.
- Until this integration exists, `sgbApprovalStatus` remains `'pending'` and can be manually set to `'approved'` by an admin.

### File Upload Storage

Evidence files and policy documents are stored in the `/uploads/governance/` directory. The backend uses `multer` with a storage config similar to other modules. Max file size: 10MB. Allowed types: PDF, JPG, PNG, DOCX, XLSX.

---

## 9. Acceptance Criteria

### Backend — SIP Plans

- [ ] `POST /api/governance/sip` creates a plan with status `active` and all required fields
- [ ] `POST /api/governance/sip` without `title` returns 400
- [ ] `POST /api/governance/sip` where `endDate < startDate` returns 400
- [ ] `GET /api/governance/sip` returns paginated list scoped to the school
- [ ] `GET /api/governance/sip?year=2026` filters by year
- [ ] `GET /api/governance/sip` includes computed `goalCount`, `completedGoalCount`, `overallProgress`
- [ ] `GET /api/governance/sip/:id` returns the plan with populated goals
- [ ] `PUT /api/governance/sip/:id` updates the plan and returns the updated object
- [ ] `DELETE /api/governance/sip/:id` soft-deletes the plan and cascades to all goals
- [ ] All queries filter by `schoolId` and `isDeleted: false`

### Backend — SIP Goals

- [ ] `POST /api/governance/sip/:sipId/goals` creates a goal with status `not_started` and `progressPercent: 0`
- [ ] `POST /api/governance/sip/:sipId/goals` without `wseArea` returns 400
- [ ] `POST /api/governance/sip/:sipId/goals` with `wseArea: 10` returns 400 (range 1-9)
- [ ] `PUT /api/governance/sip/:sipId/goals/:goalId` updates the goal
- [ ] `POST /api/governance/sip/:sipId/goals/:goalId/evidence` uploads a file and creates an evidence record
- [ ] `POST /api/governance/sip/:sipId/goals/:goalId/reviews` adds a quarterly review and updates the goal's `progressPercent`
- [ ] `GET /api/governance/sip/:sipId/dashboard` returns RAG summary, WSE area breakdown, overdue goals, upcoming deadlines

### Backend — Policies

- [ ] `POST /api/governance/policies` creates a policy with `version: 1` and status `draft`
- [ ] `POST /api/governance/policies` without `title` or `category` returns 400
- [ ] `GET /api/governance/policies` returns paginated list with acknowledgement counts
- [ ] `GET /api/governance/policies?category=safety` filters by category
- [ ] `GET /api/governance/policies?overdue=true` returns only policies past their `reviewDate`
- [ ] `PUT /api/governance/policies/:id` increments version, archives previous version in `versionHistory`
- [ ] `PUT /api/governance/policies/:id` with `requiresAcknowledgement: true` invalidates existing acknowledgements
- [ ] `DELETE /api/governance/policies/:id` soft-deletes the policy
- [ ] `POST /api/governance/policies/:id/acknowledge` creates an acknowledgement for the current user and version
- [ ] `POST /api/governance/policies/:id/acknowledge` called twice returns 400 (duplicate)
- [ ] `GET /api/governance/policies/:id/acknowledgements` returns acknowledged and pending staff lists

### Frontend — Governance Page

- [ ] `/admin/governance` page loads with SIP Dashboard as default tab
- [ ] SIP Dashboard shows RAG summary cards, WSE area progress bars, overdue goals, upcoming deadlines
- [ ] RAG badges use correct colours: red = `bg-destructive/10 text-destructive`, amber = `bg-amber-100 text-amber-800`, green = `bg-green-100 text-green-800`
- [ ] SIP Plans tab lists plans with year filter and create button
- [ ] Creating a SIP plan via dialog calls the correct API and refreshes the list
- [ ] Goals tab shows goals filterable by WSE area and status
- [ ] Goal detail page shows progress bar, evidence gallery, review timeline
- [ ] Evidence upload dialog accepts files and descriptions
- [ ] Quarterly review dialog captures all fields and submits correctly
- [ ] Policies tab lists policies with category filter, status badges, acknowledgement progress bars
- [ ] Creating/editing a policy creates a new version
- [ ] Policy detail page shows content and version history

### Frontend — Teacher Policy Viewer

- [ ] `/teacher/policies` shows active policies for the school
- [ ] Policies requiring acknowledgement show a prominent "Acknowledge" button
- [ ] Acknowledging a policy calls the API and updates the UI to show a green checkmark
- [ ] Already-acknowledged policies show the acknowledgement date
- [ ] Loading and empty states are implemented for all data views
