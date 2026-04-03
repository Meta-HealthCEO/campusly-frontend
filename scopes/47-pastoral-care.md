# 47 — Counselor Notes & Pastoral Care

## 1. Module Overview

The Pastoral Care module provides a confidential case management system for school counselors to log sessions, manage referrals, and build holistic student wellbeing profiles. It is built with privacy as a first-class concern — counselor notes are encrypted at rest, access is strictly limited, and every data access is logged to an audit trail.

### Core Capabilities

**Counselor Role:** The `isCounselor` permission flag (scope 44) gates access to all pastoral care features. Only teachers with `isCounselor: true` and the school principal (`isSchoolPrincipal: true`) can access counselor notes. Regular teachers, parents, and students cannot see any pastoral data.

**Session Logging:** Counselors record each student interaction as a session: date, student, type (individual, group, crisis, follow-up), duration, summary, follow-up actions, and confidentiality level (standard, sensitive, restricted). Sessions form the backbone of the counselor's case notes.

**Referral Management:** Any teacher can refer a student to the counselor. The referral includes the student, reason category (academic, behavioural, emotional, social, family, other), and descriptive notes. Referrals move through a workflow: Referred → Acknowledged → In Progress → Resolved / Closed. The referring teacher can see the referral status but NOT the counselor's session notes.

**Student Wellbeing Profile:** An aggregated view of a student combining data from multiple modules: referral history, counselor sessions (for authorized users), attendance patterns, discipline incidents (from Achiever module), and academic trends. This provides a holistic picture for pastoral decision-making.

**Caseload Management:** A counselor's dashboard showing their active cases, upcoming follow-ups, overdue actions, and referral inbox. Designed for a counselor managing 50-200 active students.

**Reporting:** Anonymized aggregate reports — referral reasons breakdown, sessions per month, outcome trends. No identifying student information in reports visible to non-counselors.

### Data Privacy Architecture

Counselor notes are the most sensitive data in the system. The privacy model:

1. **Encryption at rest:** The `sessionNotes` and `followUpActions` fields are encrypted before storage using AES-256 via a dedicated encryption service. The encryption key is stored in environment variables, not in the database.
2. **Access control:** Only `isCounselor` (the owning counselor) and `isSchoolPrincipal` can read session records. A counselor can only see their own sessions unless the principal overrides.
3. **Audit trail:** Every access to counselor session data (read, create, update) is logged to the audit trail with the accessor's ID, the session/student ID, and the access type.
4. **No cascade to general student record:** Pastoral data is never included in student exports, report cards, or general student profile views. It exists in a completely separate data silo.

All routes are mounted under `/api/pastoral`. Module guard: `requireModule('pastoral')`. Additional permission check: `requirePermission('isCounselor')` on most endpoints, with specific exceptions for referral submission (any teacher) and principal oversight.

---

## 2. Backend API Endpoints

All endpoints are mounted at `/api/pastoral`. Authentication required via `authenticate` middleware.

---

### 2.1 Referrals

#### POST /api/pastoral/referrals

Create a new student referral to the counselor. Any teacher can submit.

**Auth:** `teacher`, `school_admin`

**Request body:**

```json
{
  "studentId": "6650a1b2c3d4e5f678908001",
  "reason": "emotional",
  "description": "Student has been visibly distressed in class for the past two weeks. Crying during lessons, withdrawn from peer interactions. Previously social and engaged.",
  "urgency": "high",
  "referrerNotes": "Have spoken to student briefly — they mentioned problems at home but did not elaborate."
}
```

**Validation:** `studentId` required (valid ObjectId), `reason` required (enum: `academic`, `behavioural`, `emotional`, `social`, `family`, `substance`, `bullying`, `self_harm`, `other`), `description` required (min 10 chars), `urgency` required (enum: `low`, `medium`, `high`, `critical`).

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678b10001",
    "studentId": {
      "_id": "6650a1b2c3d4e5f678908001",
      "firstName": "Sipho",
      "lastName": "Mthembu",
      "grade": "Grade 9"
    },
    "schoolId": "6650a1b2c3d4e5f678900001",
    "referredBy": {
      "_id": "6650a1b2c3d4e5f678905680",
      "firstName": "Sarah",
      "lastName": "Nkosi"
    },
    "reason": "emotional",
    "description": "Student has been visibly distressed in class for the past two weeks...",
    "urgency": "high",
    "referrerNotes": "Have spoken to student briefly...",
    "status": "referred",
    "assignedCounselorId": null,
    "isDeleted": false,
    "createdAt": "2026-04-01T08:00:00.000Z",
    "updatedAt": "2026-04-01T08:00:00.000Z"
  },
  "message": "Referral submitted successfully"
}
```

**Side effects:**
- A notification is sent to all counselors in the school (`isCounselor: true` users)
- If urgency is `critical`, an additional notification is sent to the principal

---

#### GET /api/pastoral/referrals

List referrals. Different views based on role:
- **Counselor:** sees all referrals assigned to them, or unassigned
- **Teacher:** sees only referrals they submitted (cannot see counselor notes or other teachers' referrals)
- **Principal:** sees all referrals

**Auth:** `teacher`, `school_admin`, or `isCounselor`

**Query params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | no | `1` | Page number |
| `limit` | number | no | `20` | Results per page |
| `status` | string | no | — | Filter by status |
| `urgency` | string | no | — | Filter by urgency |
| `reason` | string | no | — | Filter by reason category |
| `studentId` | string | no | — | Filter by student |
| `assigned` | `'true'` \| `'false'` | no | — | Counselor only: unassigned referrals |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "referrals": [
      {
        "_id": "6650a1b2c3d4e5f678b10001",
        "studentId": { "_id": "...", "firstName": "Sipho", "lastName": "Mthembu" },
        "referredBy": { "_id": "...", "firstName": "Sarah", "lastName": "Nkosi" },
        "reason": "emotional",
        "urgency": "high",
        "status": "referred",
        "assignedCounselorId": null,
        "createdAt": "2026-04-01T08:00:00.000Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  },
  "message": "Referrals retrieved successfully"
}
```

**Notes:** The `description` and `referrerNotes` are included in the response for counselors and principals but omitted for referring teachers viewing other teachers' referrals (they can only see their own referrals' full details).

---

#### PUT /api/pastoral/referrals/:id

Update a referral (assign counselor, change status, add resolution notes).

**Auth:** `isCounselor` or `isSchoolPrincipal`

**Request body:**

```json
{
  "status": "acknowledged",
  "assignedCounselorId": "6650a1b2c3d4e5f678905690",
  "counselorNotes": "Will schedule an appointment with Sipho this week."
}
```

**Validation:** `status` must follow the workflow: `referred` → `acknowledged` → `in_progress` → `resolved` | `closed`. Cannot skip steps. `assignedCounselorId` must be a user with `isCounselor: true`.

**Response 200:** Updated referral object.

---

#### PUT /api/pastoral/referrals/:id/resolve

Resolve or close a referral with outcome notes.

**Auth:** `isCounselor` or `isSchoolPrincipal`

**Request body:**

```json
{
  "status": "resolved",
  "outcome": "positive",
  "resolutionNotes": "After 4 sessions, student's emotional state has stabilised. Family situation has improved. Student re-engaged in class activities. Will continue monitoring.",
  "notifyReferrer": true,
  "notifyParent": false
}
```

**Validation:** `status` must be `resolved` or `closed`, `outcome` required (enum: `positive`, `ongoing`, `referred_external`, `no_further_action`).

**Side effects:**
- If `notifyReferrer: true`, the referring teacher receives a notification (generic message, no session details)
- If `notifyParent: true`, the parent receives a notification inviting them to contact the school

**Response 200:** Updated referral with resolution data.

---

### 2.2 Counselor Sessions

#### POST /api/pastoral/sessions

Log a counselor session.

**Auth:** `isCounselor` only

**Request body:**

```json
{
  "studentId": "6650a1b2c3d4e5f678908001",
  "referralId": "6650a1b2c3d4e5f678b10001",
  "sessionDate": "2026-04-03",
  "sessionType": "individual",
  "duration": 45,
  "summary": "First session with Sipho. Presented with flat affect and difficulty making eye contact. Disclosed that parents are going through a divorce. Expressed feelings of anger and sadness. Used active listening and normalisation techniques.",
  "followUpActions": "1. Schedule follow-up in 1 week. 2. Provide journaling resources. 3. Consider group session for children of divorce.",
  "followUpDate": "2026-04-10",
  "confidentialityLevel": "sensitive",
  "notifyParent": false,
  "parentNotificationMessage": null
}
```

**Validation:** `studentId` required, `sessionDate` required, `sessionType` required (enum: `individual`, `group`, `crisis`, `follow_up`, `consultation`), `duration` required (integer, minutes, 5-180), `summary` required (min 10 chars), `confidentialityLevel` required (enum: `standard`, `sensitive`, `restricted`).

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678b20001",
    "studentId": { "_id": "...", "firstName": "Sipho", "lastName": "Mthembu" },
    "counselorId": { "_id": "...", "firstName": "Dr. Lerato", "lastName": "Khumalo" },
    "referralId": "6650a1b2c3d4e5f678b10001",
    "schoolId": "6650a1b2c3d4e5f678900001",
    "sessionDate": "2026-04-03T00:00:00.000Z",
    "sessionType": "individual",
    "duration": 45,
    "summary": "[encrypted]",
    "followUpActions": "[encrypted]",
    "followUpDate": "2026-04-10T00:00:00.000Z",
    "confidentialityLevel": "sensitive",
    "isDeleted": false,
    "createdAt": "2026-04-03T16:00:00.000Z",
    "updatedAt": "2026-04-03T16:00:00.000Z"
  },
  "message": "Session logged successfully"
}
```

**Notes:** In the response to the owning counselor and the principal, `summary` and `followUpActions` are decrypted. To all other users (if they somehow reach this endpoint), these fields return `"[restricted]"`.

**Side effects:**
- An audit log entry is created: `entity: 'CounselorSession'`, `action: 'create'`
- If `notifyParent: true`, a notification is sent to the student's parent with `parentNotificationMessage`
- The referral's status is updated to `in_progress` if it was `acknowledged`

---

#### GET /api/pastoral/sessions

List counselor sessions. Strictly access-controlled.

**Auth:** `isCounselor` or `isSchoolPrincipal`

**Scope:**
- A counselor sees only their own sessions
- The principal can see all sessions in the school
- `restricted` confidentiality sessions are visible only to the owning counselor (even the principal cannot see them unless they are also a counselor)

**Query params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | no | `1` | Page number |
| `limit` | number | no | `20` | Results per page |
| `studentId` | string | no | — | Filter by student |
| `sessionType` | string | no | — | Filter by type |
| `startDate` | string | no | — | Sessions on or after |
| `endDate` | string | no | — | Sessions on or before |
| `referralId` | string | no | — | Sessions linked to a referral |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "_id": "6650a1b2c3d4e5f678b20001",
        "studentId": { "_id": "...", "firstName": "Sipho", "lastName": "Mthembu" },
        "counselorId": { "_id": "...", "firstName": "Dr. Lerato", "lastName": "Khumalo" },
        "sessionDate": "2026-04-03T00:00:00.000Z",
        "sessionType": "individual",
        "duration": 45,
        "summary": "First session with Sipho. Presented with flat affect...",
        "followUpDate": "2026-04-10T00:00:00.000Z",
        "confidentialityLevel": "sensitive",
        "createdAt": "2026-04-03T16:00:00.000Z"
      }
    ],
    "total": 4,
    "page": 1,
    "limit": 20
  },
  "message": "Sessions retrieved successfully"
}
```

**Audit:** Every `GET /api/pastoral/sessions` call (even list) is logged to the audit trail.

---

#### PUT /api/pastoral/sessions/:id

Update a session (edit notes, update follow-up date).

**Auth:** The owning counselor only (not even the principal can edit another counselor's notes)

**Request body:** All fields optional: `summary`, `followUpActions`, `followUpDate`, `confidentialityLevel`.

**Response 200:** Updated session with decrypted fields.

---

### 2.3 Student Wellbeing Profile

#### GET /api/pastoral/students/:studentId/wellbeing

Get the aggregated wellbeing profile for a student.

**Auth:** `isCounselor` or `isSchoolPrincipal`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "student": {
      "_id": "6650a1b2c3d4e5f678908001",
      "firstName": "Sipho",
      "lastName": "Mthembu",
      "grade": "Grade 9",
      "class": "9A"
    },
    "referrals": {
      "total": 3,
      "active": 1,
      "resolved": 2,
      "recent": [
        {
          "_id": "6650a1b2c3d4e5f678b10001",
          "reason": "emotional",
          "urgency": "high",
          "status": "in_progress",
          "referredBy": { "firstName": "Sarah", "lastName": "Nkosi" },
          "createdAt": "2026-04-01T08:00:00.000Z"
        }
      ]
    },
    "sessions": {
      "total": 4,
      "lastSessionDate": "2026-04-03T00:00:00.000Z",
      "nextFollowUp": "2026-04-10T00:00:00.000Z",
      "sessionTypes": { "individual": 3, "follow_up": 1 }
    },
    "attendance": {
      "overallRate": 85,
      "recentAbsences": 5,
      "pattern": "Frequent Monday absences",
      "trend": "declining"
    },
    "academic": {
      "overallAverage": 52,
      "trend": "declining",
      "failingSubjects": ["Mathematics", "Physical Sciences"],
      "lastTermAverage": 58
    },
    "behaviour": {
      "merits": 3,
      "demerits": 7,
      "recentIncidents": [
        {
          "type": "demerit",
          "description": "Disruptive behaviour in class",
          "date": "2026-03-28T00:00:00.000Z"
        }
      ]
    },
    "riskLevel": "high",
    "riskFactors": [
      "Declining attendance",
      "Declining academic performance",
      "Active emotional referral",
      "High demerit count"
    ]
  },
  "message": "Student wellbeing profile retrieved successfully"
}
```

**Notes:**
- `attendance` data is aggregated from the Attendance module
- `academic` data is aggregated from the Academic module (marks)
- `behaviour` data is aggregated from the Achiever module (merits/demerits)
- `riskLevel` is computed: `high` (3+ risk factors), `medium` (2), `low` (0-1)
- Session details (notes) are NOT included in the wellbeing profile — only counts and dates

---

### 2.4 Caseload Management

#### GET /api/pastoral/caseload

Get the counselor's active caseload.

**Auth:** `isCounselor`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "activeCases": 24,
    "pendingReferrals": 3,
    "overdueFollowUps": 2,
    "sessionsThisWeek": 8,
    "sessionsThisMonth": 28,
    "cases": [
      {
        "studentId": { "_id": "...", "firstName": "Sipho", "lastName": "Mthembu", "grade": "Grade 9" },
        "referralId": "6650a1b2c3d4e5f678b10001",
        "reason": "emotional",
        "status": "in_progress",
        "sessionCount": 4,
        "lastSessionDate": "2026-04-03T00:00:00.000Z",
        "nextFollowUp": "2026-04-10T00:00:00.000Z",
        "isOverdue": false,
        "riskLevel": "high"
      }
    ],
    "overdueList": [
      {
        "studentId": { "_id": "...", "firstName": "Thandi", "lastName": "Zulu" },
        "nextFollowUp": "2026-03-28T00:00:00.000Z",
        "daysPastDue": 5
      }
    ]
  },
  "message": "Caseload retrieved successfully"
}
```

---

### 2.5 Reports (Anonymized)

#### GET /api/pastoral/reports

Get anonymized aggregate reports for the school.

**Auth:** `isCounselor` or `isSchoolPrincipal`

**Query params:** `startDate`, `endDate`, `reportType` (`referral_reasons`, `sessions_monthly`, `outcomes`, `grade_distribution`)

**Response 200 (example: referral_reasons):**

```json
{
  "success": true,
  "data": {
    "reportType": "referral_reasons",
    "period": { "startDate": "2026-01-01", "endDate": "2026-04-01" },
    "data": [
      { "reason": "emotional", "count": 12, "percentage": 30 },
      { "reason": "behavioural", "count": 8, "percentage": 20 },
      { "reason": "academic", "count": 7, "percentage": 17.5 },
      { "reason": "family", "count": 5, "percentage": 12.5 },
      { "reason": "social", "count": 4, "percentage": 10 },
      { "reason": "bullying", "count": 3, "percentage": 7.5 },
      { "reason": "other", "count": 1, "percentage": 2.5 }
    ],
    "totalReferrals": 40
  },
  "message": "Report generated successfully"
}
```

---

## 3. Frontend Pages

### 3.1 Counselor Dashboard

**Route:** `/teacher/pastoral`
**File:** `src/app/(dashboard)/teacher/pastoral/page.tsx`

The counselor's home page. Gated by `isCounselor` permission flag. Uses a tab-based layout.

| Tab | Content |
|---|---|
| Dashboard | Caseload summary cards, overdue follow-ups, pending referrals, sessions this week |
| Referrals | Referral inbox (unassigned + assigned), filter by status/urgency/reason |
| Sessions | Session log (all sessions for this counselor), filter by student/date/type |
| Students | Student wellbeing profiles — search a student, view aggregated profile |
| Reports | Anonymized charts: referral reasons (pie), sessions per month (bar), outcomes (donut) |

### 3.2 Referral Submission Page (for teachers)

**Route:** `/teacher/referral`
**File:** `src/app/(dashboard)/teacher/referral/page.tsx`

A simple page for any teacher to submit a referral. Shows:
- Student selector (search by name)
- Reason category dropdown
- Urgency selector
- Description textarea
- A list of the teacher's own submitted referrals with status tracking

### 3.3 Student Wellbeing Profile Page

**Route:** `/teacher/pastoral/students/:studentId`
**File:** `src/app/(dashboard)/teacher/pastoral/students/[studentId]/page.tsx`

Detailed wellbeing profile for a specific student. Accessible to counselors and principal only.

**Layout:**
- Student header card (name, grade, class, photo)
- Risk level badge with risk factors
- Tabbed sections: Referrals, Sessions, Attendance, Academic, Behaviour
- Each section shows relevant data from the aggregated wellbeing endpoint
- "New Session" button (counselor only) opens the session creation dialog

### 3.4 Principal Pastoral Overview

**Route:** `/admin/pastoral`
**File:** `src/app/(dashboard)/admin/pastoral/page.tsx`

Read-only overview for the principal (gated by `isSchoolPrincipal`). Shows:
- School-wide referral statistics
- Active cases count by counselor
- Anonymized reports
- Ability to view (but not edit) individual student wellbeing profiles

---

## 4. User Flows

### 4.1 Teacher Refers a Student

1. Teacher notices a student behaving unusually, navigates to `/teacher/referral`.
2. Searches for and selects the student.
3. Selects reason category: "emotional", urgency: "high".
4. Types a description of what they have observed.
5. Submits → `POST /api/pastoral/referrals`.
6. Toast: "Referral submitted. The school counselor will be notified."
7. Referral appears in the teacher's submitted referrals list with status "Referred".
8. Teacher can track the status (Referred → Acknowledged → In Progress → Resolved) but cannot see counselor notes.

### 4.2 Counselor Acknowledges and Triages a Referral

1. Counselor navigates to `/teacher/pastoral`, opens the "Referrals" tab.
2. Sees 3 pending referrals. Clicks on the high-urgency emotional referral.
3. Reads the teacher's description and notes.
4. Clicks "Acknowledge" — `PUT /api/pastoral/referrals/:id` with `{ status: 'acknowledged', assignedCounselorId: self }`.
5. Referral status changes to "Acknowledged". The referring teacher sees the update.

### 4.3 Counselor Logs a Session

1. Counselor meets with the student, then navigates to the student's wellbeing profile.
2. Clicks "New Session" — `SessionCreateDialog` opens.
3. Fills in: session date, type (individual), duration (45 min), summary (detailed notes about the conversation), follow-up actions, next follow-up date, confidentiality level (sensitive).
4. Optionally toggles "Notify parent" and types a message.
5. Submits → `POST /api/pastoral/sessions`.
6. Session appears in the sessions list. Follow-up date appears in the caseload dashboard.

### 4.4 Counselor Manages Caseload

1. Counselor opens `/teacher/pastoral` dashboard tab.
2. Summary cards show: 24 active cases, 3 pending referrals, 2 overdue follow-ups.
3. Counselor clicks on the overdue follow-ups section.
4. Sees Thandi Zulu was due for a follow-up 5 days ago.
5. Counselor clicks to open Thandi's profile, reviews past sessions, and schedules a new session.

### 4.5 Counselor Resolves a Referral

1. After multiple sessions, the counselor determines the student's situation has improved.
2. Opens the referral, clicks "Resolve".
3. `ResolutionDialog` opens: selects outcome ("positive"), writes resolution notes, toggles "Notify referring teacher" on, "Notify parent" off.
4. Submits → `PUT /api/pastoral/referrals/:id/resolve`.
5. The referring teacher receives a notification: "Your referral for Sipho M. has been resolved."
6. The referral status changes to "Resolved" and is moved to the closed cases list.

### 4.6 Principal Reviews Pastoral Overview

1. Principal navigates to `/admin/pastoral`.
2. Sees school-wide stats: 40 total referrals this term, 15 active, 25 resolved.
3. Views the referral reasons pie chart — emotional is the highest category.
4. Clicks into a specific student's wellbeing profile to understand a high-risk case.
5. Can view sessions (dates, types, durations) but notes are decrypted for principal view if confidentiality is "standard" or "sensitive".

### 4.7 Counselor Generates a Report

1. Counselor clicks the "Reports" tab.
2. Selects report type: "Referral Reasons", date range: this term.
3. Frontend calls `GET /api/pastoral/reports?reportType=referral_reasons&startDate=...&endDate=...`.
4. A pie chart renders showing the distribution of referral reasons.
5. Counselor can also view sessions per month (bar chart) and outcomes (donut chart).
6. Reports contain no student names — only aggregate counts.

---

## 5. Data Models

### PastoralReferral

Collection name: `pastoralreferrals`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `studentId` | ObjectId (ref: `Student`) | yes | — | Referred student |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `referredBy` | ObjectId (ref: `User`) | yes | — | Teacher who submitted |
| `reason` | String enum | yes | — | `'academic'`, `'behavioural'`, `'emotional'`, `'social'`, `'family'`, `'substance'`, `'bullying'`, `'self_harm'`, `'other'` |
| `description` | String | yes | — | Detailed description (min 10 chars) |
| `urgency` | String enum | yes | — | `'low'`, `'medium'`, `'high'`, `'critical'` |
| `referrerNotes` | String | no | `''` | Additional notes from referring teacher |
| `status` | String enum | no | `'referred'` | `'referred'`, `'acknowledged'`, `'in_progress'`, `'resolved'`, `'closed'` |
| `assignedCounselorId` | ObjectId (ref: `User`) | no | `null` | Assigned counselor |
| `counselorNotes` | String | no | `''` | Internal counselor notes on the referral |
| `outcome` | String enum | no | `null` | `'positive'`, `'ongoing'`, `'referred_external'`, `'no_further_action'` |
| `resolutionNotes` | String | no | `''` | Notes on resolution |
| `resolvedAt` | Date | no | `null` | When resolved |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**Indexes:** `{ schoolId: 1, status: 1, createdAt: -1 }`, `{ studentId: 1, isDeleted: 1 }`, `{ referredBy: 1, createdAt: -1 }`, `{ assignedCounselorId: 1, status: 1 }`

### CounselorSession

Collection name: `counselorsessions`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `studentId` | ObjectId (ref: `Student`) | yes | — | Student seen |
| `counselorId` | ObjectId (ref: `User`) | yes | — | From `req.user.id` |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `referralId` | ObjectId (ref: `PastoralReferral`) | no | `null` | Linked referral, if any |
| `sessionDate` | Date | yes | — | Date of session |
| `sessionType` | String enum | yes | — | `'individual'`, `'group'`, `'crisis'`, `'follow_up'`, `'consultation'` |
| `duration` | Number | yes | — | Minutes (5-180) |
| `summary` | String | yes | — | Encrypted at rest (AES-256) |
| `followUpActions` | String | no | `''` | Encrypted at rest |
| `followUpDate` | Date | no | `null` | Next follow-up due date |
| `confidentialityLevel` | String enum | yes | — | `'standard'`, `'sensitive'`, `'restricted'` |
| `parentNotified` | Boolean | no | `false` | Whether parent was notified |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**Indexes:** `{ counselorId: 1, sessionDate: -1 }`, `{ studentId: 1, sessionDate: -1 }`, `{ schoolId: 1, counselorId: 1, followUpDate: 1 }`, `{ referralId: 1 }`

### Frontend TypeScript Interfaces

```ts
type ReferralReason = 'academic' | 'behavioural' | 'emotional' | 'social' | 'family' | 'substance' | 'bullying' | 'self_harm' | 'other';
type ReferralUrgency = 'low' | 'medium' | 'high' | 'critical';
type ReferralStatus = 'referred' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
type SessionType = 'individual' | 'group' | 'crisis' | 'follow_up' | 'consultation';
type ConfidentialityLevel = 'standard' | 'sensitive' | 'restricted';
type ReferralOutcome = 'positive' | 'ongoing' | 'referred_external' | 'no_further_action';
type RiskLevel = 'low' | 'medium' | 'high';

interface PastoralReferral {
  id: string;
  studentId: { id: string; firstName: string; lastName: string; grade?: string };
  schoolId: string;
  referredBy: { id: string; firstName: string; lastName: string };
  reason: ReferralReason;
  description: string;
  urgency: ReferralUrgency;
  referrerNotes: string;
  status: ReferralStatus;
  assignedCounselorId: { id: string; firstName: string; lastName: string } | null;
  counselorNotes: string;
  outcome: ReferralOutcome | null;
  resolutionNotes: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CounselorSession {
  id: string;
  studentId: { id: string; firstName: string; lastName: string };
  counselorId: { id: string; firstName: string; lastName: string };
  referralId: string | null;
  sessionDate: string;
  sessionType: SessionType;
  duration: number;
  summary: string;
  followUpActions: string;
  followUpDate: string | null;
  confidentialityLevel: ConfidentialityLevel;
  parentNotified: boolean;
  createdAt: string;
}

interface StudentWellbeingProfile {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    grade: string;
    class: string;
  };
  referrals: {
    total: number;
    active: number;
    resolved: number;
    recent: PastoralReferral[];
  };
  sessions: {
    total: number;
    lastSessionDate: string | null;
    nextFollowUp: string | null;
    sessionTypes: Record<SessionType, number>;
  };
  attendance: {
    overallRate: number;
    recentAbsences: number;
    pattern: string | null;
    trend: 'improving' | 'stable' | 'declining';
  };
  academic: {
    overallAverage: number;
    trend: 'improving' | 'stable' | 'declining';
    failingSubjects: string[];
    lastTermAverage: number;
  };
  behaviour: {
    merits: number;
    demerits: number;
    recentIncidents: Array<{
      type: 'merit' | 'demerit';
      description: string;
      date: string;
    }>;
  };
  riskLevel: RiskLevel;
  riskFactors: string[];
}

interface CounselorCaseload {
  activeCases: number;
  pendingReferrals: number;
  overdueFollowUps: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  cases: Array<{
    studentId: { id: string; firstName: string; lastName: string; grade: string };
    referralId: string;
    reason: ReferralReason;
    status: ReferralStatus;
    sessionCount: number;
    lastSessionDate: string | null;
    nextFollowUp: string | null;
    isOverdue: boolean;
    riskLevel: RiskLevel;
  }>;
  overdueList: Array<{
    studentId: { id: string; firstName: string; lastName: string };
    nextFollowUp: string;
    daysPastDue: number;
  }>;
}

interface PastoralReport {
  reportType: string;
  period: { startDate: string; endDate: string };
  data: Array<{ reason?: string; month?: string; outcome?: string; count: number; percentage: number }>;
  totalReferrals?: number;
  totalSessions?: number;
}
```

---

## 6. State Management

### `usePastoralCare` Hook

**File:** `src/hooks/usePastoralCare.ts`

```ts
interface UsePastoralCareReturn {
  // Referrals
  referrals: PastoralReferral[];
  referralsLoading: boolean;
  fetchReferrals: (params?: { status?: string; urgency?: string; reason?: string; studentId?: string }) => Promise<void>;
  createReferral: (data: CreateReferralPayload) => Promise<PastoralReferral>;
  updateReferral: (id: string, data: Partial<PastoralReferral>) => Promise<PastoralReferral>;
  resolveReferral: (id: string, data: ResolveReferralPayload) => Promise<PastoralReferral>;

  // Sessions
  sessions: CounselorSession[];
  sessionsLoading: boolean;
  fetchSessions: (params?: { studentId?: string; startDate?: string; endDate?: string }) => Promise<void>;
  createSession: (data: CreateSessionPayload) => Promise<CounselorSession>;
  updateSession: (id: string, data: Partial<CounselorSession>) => Promise<CounselorSession>;

  // Wellbeing
  wellbeingProfile: StudentWellbeingProfile | null;
  wellbeingLoading: boolean;
  fetchWellbeing: (studentId: string) => Promise<void>;

  // Caseload
  caseload: CounselorCaseload | null;
  caseloadLoading: boolean;
  fetchCaseload: () => Promise<void>;

  // Reports
  report: PastoralReport | null;
  reportLoading: boolean;
  fetchReport: (params: { reportType: string; startDate: string; endDate: string }) => Promise<void>;
}
```

**Key behaviours:**
- All API calls use `apiClient`.
- `schoolId` is sourced from `useAuthStore`.
- Error handling uses `catch (err: unknown)` with Sonner toasts.
- Referral creation shows a success toast and clears the form.
- Session creation triggers a referral status update if linked to a referral.

---

## 7. Components Needed

### New Components

| Component | File | Purpose |
|---|---|---|
| `CaseloadDashboard` | `src/components/pastoral/CaseloadDashboard.tsx` | Summary cards: active cases, pending referrals, overdue follow-ups, sessions this week |
| `ReferralInbox` | `src/components/pastoral/ReferralInbox.tsx` | DataTable of referrals with status/urgency/reason filters and action buttons |
| `ReferralCreateDialog` | `src/components/pastoral/ReferralCreateDialog.tsx` | Form for teachers: student selector, reason dropdown, urgency, description textarea |
| `ReferralDetailDrawer` | `src/components/pastoral/ReferralDetailDrawer.tsx` | Side drawer showing full referral details, status timeline, counselor actions |
| `ReferralStatusBadge` | `src/components/pastoral/ReferralStatusBadge.tsx` | Colour-coded badge for referral status |
| `UrgencyBadge` | `src/components/pastoral/UrgencyBadge.tsx` | Colour-coded urgency indicator: low (blue), medium (amber), high (orange), critical (destructive) |
| `ResolutionDialog` | `src/components/pastoral/ResolutionDialog.tsx` | Dialog for resolving a referral: outcome selector, notes, notification toggles |
| `SessionLogList` | `src/components/pastoral/SessionLogList.tsx` | DataTable of counselor sessions with filters |
| `SessionCreateDialog` | `src/components/pastoral/SessionCreateDialog.tsx` | Form for logging a session: student, type, duration, notes, follow-up date, confidentiality |
| `SessionDetailCard` | `src/components/pastoral/SessionDetailCard.tsx` | Card showing session summary, follow-up actions, confidentiality badge |
| `WellbeingProfileView` | `src/components/pastoral/WellbeingProfileView.tsx` | Aggregated student profile: referrals, sessions, attendance, academic, behaviour tabs |
| `RiskLevelBadge` | `src/components/pastoral/RiskLevelBadge.tsx` | Badge: high (destructive), medium (amber), low (green) |
| `RiskFactorList` | `src/components/pastoral/RiskFactorList.tsx` | Bulleted list of computed risk factors |
| `ConfidentialityBadge` | `src/components/pastoral/ConfidentialityBadge.tsx` | Badge: standard (blue), sensitive (amber), restricted (destructive) |
| `ReferralReasonChart` | `src/components/pastoral/ReferralReasonChart.tsx` | Recharts PieChart of referral reasons |
| `SessionsPerMonthChart` | `src/components/pastoral/SessionsPerMonthChart.tsx` | Recharts BarChart of sessions per month |
| `OutcomeChart` | `src/components/pastoral/OutcomeChart.tsx` | Recharts DonutChart of referral outcomes |
| `StudentCaseRow` | `src/components/pastoral/StudentCaseRow.tsx` | Row in the caseload list: student, reason, session count, follow-up date, risk level |
| `OverdueFollowUpAlert` | `src/components/pastoral/OverdueFollowUpAlert.tsx` | Alert banner showing overdue follow-up cases |

### Shared Components Used

| Component | File | Notes |
|---|---|---|
| `DataTable` | `src/components/shared/DataTable.tsx` | Base for referral and session tables |
| `PageHeader` | `src/components/shared/PageHeader.tsx` | Page titles |
| `StatCard` | `src/components/shared/StatCard.tsx` | Dashboard summary cards |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner.tsx` | Loading states |
| `EmptyState` | `src/components/shared/EmptyState.tsx` | Empty states |

---

## 8. Integration Notes

### Encryption Service

A new server-side encryption service is required for counselor session notes:

```typescript
// src/common/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(config.encryptionKey, 'hex'); // 32 bytes from env var

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, tagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

The `ENCRYPTION_KEY` environment variable must be a 64-character hex string (32 bytes). It is NOT stored in the database.

### Audit Logging for Pastoral Data

Every API call to `/api/pastoral/sessions` (GET, POST, PUT) must log to the audit trail using `AuditService.logAction`:

```typescript
await AuditService.logAction({
  userId: req.user.id,
  schoolId: req.user.schoolId,
  action: 'read',  // or 'create', 'update'
  entity: 'CounselorSession',
  entityId: sessionId,
  changes: [],
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

Note: this uses a custom `read` action type which must be added to the AuditLog action enum (extending it from scope 27).

### Cross-Module Data Aggregation

The wellbeing profile endpoint aggregates data from:

1. **Attendance module:** `GET /api/attendance` filtered by student — compute overall rate, recent absences, pattern
2. **Academic module:** marks collection — compute overall average, trend, failing subjects
3. **Achiever module:** merits/demerits for the student — compute counts and recent incidents

These are internal server-to-server calls (service-to-service within the same Express app, not HTTP). Import the relevant services directly:

```typescript
import { AttendanceService } from '../Attendance/service.js';
import { MarkService } from '../Academic/service.js';
import { AchieverService } from '../Achiever/service.js';
```

### Permission Gate on Frontend

The `/teacher/pastoral` route is only accessible to users with `isCounselor: true`. The sidebar shows the "Pastoral Care" nav item only for counselors (scope 44 integration). The page component should also check the permission and redirect if missing.

The `/teacher/referral` route is accessible to ALL teachers — it does not require `isCounselor`.

### Parent Notification Integration

When `notifyParent: true` is set on a session or referral resolution, the system uses the existing Notification module to send a message. The notification content is generic and does NOT include any session details:

```typescript
// Example notification
{
  userId: parent.userId,
  title: 'School Counselor Update',
  message: 'The school counselor would like to update you regarding your child. Please contact the school for more information.',
  type: 'in_app'
}
```

### Module Guard Registration

```typescript
app.use('/api/pastoral', authenticate, requireModule('pastoral'), pastoralRoutes);
```

### Self-Harm and Crisis Protocols

When a referral with reason `self_harm` or urgency `critical` is created:
1. Notification is sent immediately to ALL counselors AND the principal
2. The referral is flagged with a visual alert indicator on the counselor dashboard
3. This is a safety-critical feature — the notification must not be silently swallowed by error handling

---

## 9. Acceptance Criteria

### Backend — Referrals

- [ ] `POST /api/pastoral/referrals` creates a referral with status `referred`
- [ ] Any `teacher` or `school_admin` can create a referral
- [ ] `POST /api/pastoral/referrals` without `description` (< 10 chars) returns 400
- [ ] `POST /api/pastoral/referrals` with `urgency: 'critical'` notifies counselors AND principal
- [ ] `GET /api/pastoral/referrals` as teacher returns only their own submitted referrals
- [ ] `GET /api/pastoral/referrals` as counselor returns referrals assigned to them + unassigned
- [ ] `GET /api/pastoral/referrals` as principal returns all school referrals
- [ ] `PUT /api/pastoral/referrals/:id` enforces workflow order (cannot skip from `referred` to `resolved`)
- [ ] `PUT /api/pastoral/referrals/:id/resolve` requires `outcome` field
- [ ] `PUT /api/pastoral/referrals/:id/resolve` with `notifyReferrer: true` sends a notification to the referring teacher
- [ ] All queries filter by `schoolId` and `isDeleted: false`

### Backend — Sessions

- [ ] `POST /api/pastoral/sessions` creates a session with encrypted `summary` and `followUpActions`
- [ ] Only users with `isCounselor: true` can create sessions
- [ ] `GET /api/pastoral/sessions` as counselor returns only their own sessions (decrypted)
- [ ] `GET /api/pastoral/sessions` as principal returns all sessions with `standard` and `sensitive` confidentiality decrypted
- [ ] `GET /api/pastoral/sessions` does NOT return `restricted` sessions to the principal
- [ ] `PUT /api/pastoral/sessions/:id` only allowed by the owning counselor
- [ ] Every session access (GET, POST, PUT) is logged to the audit trail
- [ ] `summary` and `followUpActions` are stored encrypted in MongoDB (verifiable by direct DB inspection)

### Backend — Wellbeing Profile

- [ ] `GET /api/pastoral/students/:studentId/wellbeing` returns aggregated data from referrals, sessions, attendance, academic, behaviour
- [ ] `riskLevel` is correctly computed based on risk factor count
- [ ] Session notes are NOT included in the wellbeing profile (only counts and dates)
- [ ] Only `isCounselor` or `isSchoolPrincipal` can access the wellbeing endpoint

### Backend — Caseload and Reports

- [ ] `GET /api/pastoral/caseload` returns the counselor's active cases, overdue follow-ups, and stats
- [ ] `GET /api/pastoral/reports?reportType=referral_reasons` returns anonymized aggregate data
- [ ] Reports contain no student-identifying information

### Frontend — Counselor Dashboard

- [ ] `/teacher/pastoral` page loads with caseload summary cards
- [ ] Dashboard shows active cases count, pending referrals, overdue follow-ups, sessions this week
- [ ] Overdue follow-ups section highlights cases past their follow-up date
- [ ] Pending referrals section shows unassigned referrals with urgency badges

### Frontend — Referral Management

- [ ] `/teacher/referral` page is accessible to all teachers
- [ ] Referral form validates all required fields before submission
- [ ] Student selector searches by name (debounced)
- [ ] Submitted referrals list shows status badges
- [ ] Counselor referral inbox shows filter dropdowns for status, urgency, reason
- [ ] Clicking a referral opens the detail drawer
- [ ] Acknowledge/resolve actions follow the correct workflow

### Frontend — Session Logging

- [ ] Session creation dialog captures all required fields
- [ ] Duration field enforces 5-180 minute range
- [ ] Confidentiality level selector shows all three options with descriptions
- [ ] Parent notification toggle and message field appear when enabled
- [ ] Session list shows sessions with date, student, type, duration columns

### Frontend — Wellbeing Profile

- [ ] Student wellbeing page shows risk level badge and risk factors
- [ ] Referral history tab shows referral timeline
- [ ] Sessions tab shows session log (for counselor/principal only)
- [ ] Attendance tab shows rate, recent absences, pattern, trend
- [ ] Academic tab shows average, trend, failing subjects
- [ ] Behaviour tab shows merits/demerits and recent incidents

### Frontend — Reports

- [ ] Referral reasons pie chart renders with correct data
- [ ] Sessions per month bar chart renders correctly
- [ ] Outcomes donut chart renders correctly
- [ ] Charts handle empty data gracefully (empty state, not blank)

### Frontend — Privacy and Access Control

- [ ] `/teacher/pastoral` redirects non-counselor teachers
- [ ] `/teacher/referral` is accessible to all teachers
- [ ] Session notes are never visible to non-counselors in any UI
- [ ] Urgency `critical` referrals have a visual alert indicator
- [ ] All data views have loading and empty states
- [ ] All grids and tables use responsive mobile-first layout
