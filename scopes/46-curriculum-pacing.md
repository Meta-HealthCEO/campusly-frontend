# 46 — Curriculum Pacing & National Benchmarks

## 1. Module Overview

The Curriculum Pacing module provides real-time visibility into whether teachers are keeping up with the planned curriculum schedule and how the school's academic performance compares to configured national benchmarks. In the South African context, CAPS (Curriculum and Assessment Policy Statement) prescribes specific content per subject per grade per term, and schools are expected to complete all prescribed content within the allocated time.

### Curriculum Pacing

Each subject-grade-term combination has a curriculum plan with a sequence of topics and their expected completion dates. Teachers update their progress weekly by marking which topics they have covered. The system computes pacing status by comparing actual progress against the expected schedule:

- **On track (green):** teacher has covered >= 90% of expected topics for this point in the term
- **Slightly behind (amber):** teacher has covered 70-89% of expected topics
- **Significantly behind (red):** teacher has covered < 70% of expected topics

An automatic intervention trigger fires when a teacher falls more than 2 weeks behind the expected pace, creating a notification for the HOD and an entry in the intervention log.

### National Benchmarks

School admins configure target pass rates per subject per grade based on national or district expectations (e.g., "Grade 9 Mathematics: 65% pass rate"). The system compares the school's actual pass rate (computed from the marks in the Academic module) against these targets, showing variance at the subject, grade, and school level. Historical trends allow comparison across terms and years.

### Relationship to Existing Modules

- **Academic module** (scope 08): provides subjects, grades, assessments, and marks data
- **Teacher Workbench** (scope 30): provides the curriculum mapping and coverage tracking foundation — this module extends it with pacing timelines and admin visibility
- **Permission Roles** (scope 44): HOD and Principal views are gated by `isHOD` and `isSchoolPrincipal` flags

All routes are mounted under `/api/curriculum`. Module guard: `requireModule('curriculum')`.

---

## 2. Backend API Endpoints

All endpoints are mounted at `/api/curriculum`. Authentication required via `authenticate` middleware.

---

### 2.1 Curriculum Plans

#### POST /api/curriculum/plans

Create a curriculum plan for a subject-grade-term combination.

**Auth:** `school_admin`, `isSchoolPrincipal`, or `isHOD`

**Request body:**

```json
{
  "subjectId": "6650a1b2c3d4e5f678906001",
  "gradeId": "6650a1b2c3d4e5f678907001",
  "term": 1,
  "year": 2026,
  "topics": [
    {
      "title": "Algebraic Expressions",
      "description": "Simplification, factorisation, and expansion of algebraic expressions",
      "weekNumber": 1,
      "expectedStartDate": "2026-01-20",
      "expectedEndDate": "2026-01-31",
      "capsReference": "CAPS Mathematics Grade 9, Term 1, Topic 1"
    },
    {
      "title": "Equations and Inequalities",
      "description": "Solving linear equations, quadratic equations, and literal equations",
      "weekNumber": 3,
      "expectedStartDate": "2026-02-03",
      "expectedEndDate": "2026-02-14",
      "capsReference": "CAPS Mathematics Grade 9, Term 1, Topic 2"
    }
  ]
}
```

**Validation:** `subjectId`, `gradeId` required (valid ObjectId), `term` required (1-4), `year` required (2020-2099), `topics` required (non-empty array). Each topic requires `title`, `weekNumber`, `expectedStartDate`, `expectedEndDate`.

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678a10001",
    "schoolId": "6650a1b2c3d4e5f678900001",
    "subjectId": {
      "_id": "6650a1b2c3d4e5f678906001",
      "name": "Mathematics"
    },
    "gradeId": {
      "_id": "6650a1b2c3d4e5f678907001",
      "name": "Grade 9",
      "level": 9
    },
    "term": 1,
    "year": 2026,
    "topics": [
      {
        "_id": "6650a1b2c3d4e5f678a20001",
        "title": "Algebraic Expressions",
        "description": "Simplification, factorisation, and expansion of algebraic expressions",
        "weekNumber": 1,
        "expectedStartDate": "2026-01-20T00:00:00.000Z",
        "expectedEndDate": "2026-01-31T00:00:00.000Z",
        "capsReference": "CAPS Mathematics Grade 9, Term 1, Topic 1",
        "status": "not_started",
        "completedDate": null
      }
    ],
    "totalTopics": 2,
    "completedTopics": 0,
    "isDeleted": false,
    "createdAt": "2026-04-01T08:00:00.000Z",
    "updatedAt": "2026-04-01T08:00:00.000Z"
  },
  "message": "Curriculum plan created successfully"
}
```

**Error 409 (duplicate):** `{ "success": false, "message": "A curriculum plan already exists for this subject, grade, term, and year" }`

---

#### GET /api/curriculum/plans

List curriculum plans for the school.

**Auth:** Any authenticated user (school-scoped)

**Query params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | no | `1` | Page number |
| `limit` | number | no | `20` | Results per page |
| `subjectId` | string | no | — | Filter by subject |
| `gradeId` | string | no | — | Filter by grade |
| `term` | number | no | — | Filter by term (1-4) |
| `year` | number | no | — | Filter by year |
| `teacherId` | string | no | — | Filter by assigned teacher |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "_id": "6650a1b2c3d4e5f678a10001",
        "subjectId": { "_id": "...", "name": "Mathematics" },
        "gradeId": { "_id": "...", "name": "Grade 9", "level": 9 },
        "term": 1,
        "year": 2026,
        "totalTopics": 12,
        "completedTopics": 6,
        "pacingStatus": "amber",
        "pacingPercent": 50,
        "expectedPercent": 65,
        "assignedTeacher": { "_id": "...", "firstName": "Thabo", "lastName": "Mokoena" }
      }
    ],
    "total": 24,
    "page": 1,
    "limit": 20
  },
  "message": "Curriculum plans retrieved successfully"
}
```

**Notes:** `pacingStatus` and `pacingPercent` are computed fields. `expectedPercent` is based on where in the term the current date falls relative to the plan's topic schedule. `assignedTeacher` is resolved from the class-subject-teacher mapping in the Academic module.

---

#### GET /api/curriculum/plans/:id

Get a single curriculum plan with full topic details and progress.

**Auth:** Any authenticated user (school-scoped)

**Response 200:** Full plan object with all topics, each including their status and completion dates.

---

#### PUT /api/curriculum/plans/:id

Update a curriculum plan (topics, dates, etc.).

**Auth:** `school_admin`, `isSchoolPrincipal`, or `isHOD`

**Request body:** All fields optional. Topics array is replaced wholesale (not merged).

**Response 200:** Updated plan object.

---

#### DELETE /api/curriculum/plans/:id

Soft-delete a curriculum plan.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Response 200:** `{ "success": true, "data": null, "message": "Curriculum plan deleted successfully" }`

---

### 2.2 Pacing Updates (Teacher Weekly Progress)

#### POST /api/curriculum/plans/:planId/progress

Submit a weekly pacing update — teacher marks which topics they covered this week.

**Auth:** `teacher`, `school_admin`

**Request body:**

```json
{
  "weekEnding": "2026-02-07",
  "topicUpdates": [
    {
      "topicId": "6650a1b2c3d4e5f678a20001",
      "status": "completed",
      "completedDate": "2026-01-31",
      "notes": "Covered all content. Students struggled with factorisation — revisited in next lesson."
    },
    {
      "topicId": "6650a1b2c3d4e5f678a20002",
      "status": "in_progress",
      "percentComplete": 60,
      "notes": "Started equations. Will complete next week."
    }
  ],
  "overallNotes": "Good progress this week. Factorisation needed extra time.",
  "challengesFaced": "Load shedding caused loss of 2 periods.",
  "plannedContentDelivered": 85
}
```

**Validation:** `weekEnding` required (ISO date, must be a Friday or the last school day of the week), `topicUpdates` required (non-empty array). Each update requires `topicId` and `status`.

**Response 201:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678a30001",
    "planId": "6650a1b2c3d4e5f678a10001",
    "teacherId": "6650a1b2c3d4e5f678905679",
    "schoolId": "6650a1b2c3d4e5f678900001",
    "weekEnding": "2026-02-07T00:00:00.000Z",
    "topicUpdates": [ /* as submitted, with topic titles populated */ ],
    "overallNotes": "Good progress this week...",
    "challengesFaced": "Load shedding caused loss of 2 periods.",
    "plannedContentDelivered": 85,
    "createdAt": "2026-02-07T15:30:00.000Z"
  },
  "message": "Pacing update submitted successfully"
}
```

**Side effects:**
- Topic statuses on the curriculum plan are updated based on the `topicUpdates`
- Pacing status is recalculated for the plan
- If the teacher is now >2 weeks behind, an intervention trigger notification is created for the HOD

---

#### GET /api/curriculum/plans/:planId/progress

Get all pacing updates for a curriculum plan (weekly history).

**Auth:** Any authenticated user (school-scoped)

**Query params:** `page`, `limit`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "updates": [
      {
        "_id": "6650a1b2c3d4e5f678a30001",
        "teacherId": { "_id": "...", "firstName": "Thabo", "lastName": "Mokoena" },
        "weekEnding": "2026-02-07T00:00:00.000Z",
        "plannedContentDelivered": 85,
        "topicUpdates": [ /* topic update summaries */ ],
        "overallNotes": "Good progress this week...",
        "createdAt": "2026-02-07T15:30:00.000Z"
      }
    ],
    "total": 6,
    "page": 1,
    "limit": 20
  },
  "message": "Pacing updates retrieved successfully"
}
```

---

### 2.3 Pacing Dashboard (Admin/HOD View)

#### GET /api/curriculum/pacing/overview

School-wide pacing overview across all subjects, grades, and terms.

**Auth:** `school_admin`, `isSchoolPrincipal`, or `isHOD`

**Query params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `term` | number | no | current term | Filter by term |
| `year` | number | no | current year | Filter by year |
| `subjectId` | string | no | — | Filter by subject |
| `gradeId` | string | no | — | Filter by grade |
| `departmentId` | string | no | — | Filter by department (for HOD view) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "term": 1,
    "year": 2026,
    "summary": {
      "totalPlans": 48,
      "onTrack": 28,
      "slightlyBehind": 14,
      "significantlyBehind": 6
    },
    "bySubject": [
      {
        "subjectId": "6650a1b2c3d4e5f678906001",
        "subjectName": "Mathematics",
        "plans": 8,
        "avgPacingPercent": 72,
        "avgExpectedPercent": 65,
        "pacingStatus": "green"
      },
      {
        "subjectId": "6650a1b2c3d4e5f678906002",
        "subjectName": "English",
        "plans": 8,
        "avgPacingPercent": 55,
        "avgExpectedPercent": 65,
        "pacingStatus": "amber"
      }
    ],
    "byGrade": [
      {
        "gradeId": "6650a1b2c3d4e5f678907001",
        "gradeName": "Grade 9",
        "plans": 6,
        "avgPacingPercent": 68,
        "pacingStatus": "green"
      }
    ],
    "interventions": [
      {
        "planId": "6650a1b2c3d4e5f678a10005",
        "teacherName": "Sarah Nkosi",
        "subject": "Life Sciences",
        "grade": "Grade 11",
        "weeksBehind": 3,
        "pacingPercent": 35,
        "expectedPercent": 65,
        "createdAt": "2026-03-15T08:00:00.000Z"
      }
    ]
  },
  "message": "Pacing overview retrieved successfully"
}
```

---

### 2.4 National Benchmarks

#### POST /api/curriculum/benchmarks

Create or update a benchmark configuration for a subject-grade combination.

**Auth:** `school_admin` or `isSchoolPrincipal`

**Request body:**

```json
{
  "subjectId": "6650a1b2c3d4e5f678906001",
  "gradeId": "6650a1b2c3d4e5f678907001",
  "year": 2026,
  "targetPassRate": 65,
  "targetAverageScore": 55,
  "source": "National DBE target 2026"
}
```

**Validation:** `subjectId`, `gradeId` required, `year` required, `targetPassRate` required (0-100). Uses `findOneAndUpdate` with `upsert: true` to avoid duplicate key errors.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678a40001",
    "schoolId": "6650a1b2c3d4e5f678900001",
    "subjectId": { "_id": "...", "name": "Mathematics" },
    "gradeId": { "_id": "...", "name": "Grade 9", "level": 9 },
    "year": 2026,
    "targetPassRate": 65,
    "targetAverageScore": 55,
    "source": "National DBE target 2026",
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T10:00:00.000Z"
  },
  "message": "Benchmark saved successfully"
}
```

---

#### GET /api/curriculum/benchmarks

List all benchmark configurations for the school.

**Auth:** Any authenticated user (school-scoped)

**Query params:** `year`, `subjectId`, `gradeId`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "benchmarks": [
      {
        "_id": "6650a1b2c3d4e5f678a40001",
        "subjectId": { "_id": "...", "name": "Mathematics" },
        "gradeId": { "_id": "...", "name": "Grade 9", "level": 9 },
        "year": 2026,
        "targetPassRate": 65,
        "targetAverageScore": 55,
        "source": "National DBE target 2026"
      }
    ],
    "total": 24,
    "page": 1,
    "limit": 50
  },
  "message": "Benchmarks retrieved successfully"
}
```

---

#### GET /api/curriculum/benchmarks/comparison

Compare actual school performance against configured benchmarks.

**Auth:** `school_admin`, `isSchoolPrincipal`, or `isHOD`

**Query params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `year` | number | no | current year | Year to compare |
| `term` | number | no | — | If set, compare for a specific term only |
| `subjectId` | string | no | — | Filter by subject |
| `gradeId` | string | no | — | Filter by grade |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "year": 2026,
    "comparisons": [
      {
        "subjectId": "6650a1b2c3d4e5f678906001",
        "subjectName": "Mathematics",
        "gradeId": "6650a1b2c3d4e5f678907001",
        "gradeName": "Grade 9",
        "targetPassRate": 65,
        "actualPassRate": 58,
        "passRateVariance": -7,
        "targetAverageScore": 55,
        "actualAverageScore": 52,
        "averageScoreVariance": -3,
        "totalLearners": 120,
        "passed": 70,
        "failed": 50,
        "status": "below_target"
      },
      {
        "subjectId": "6650a1b2c3d4e5f678906002",
        "subjectName": "English",
        "gradeId": "6650a1b2c3d4e5f678907001",
        "gradeName": "Grade 9",
        "targetPassRate": 70,
        "actualPassRate": 75,
        "passRateVariance": 5,
        "targetAverageScore": 60,
        "actualAverageScore": 63,
        "averageScoreVariance": 3,
        "totalLearners": 120,
        "passed": 90,
        "failed": 30,
        "status": "above_target"
      }
    ],
    "summary": {
      "totalSubjectGrades": 24,
      "aboveTarget": 14,
      "atTarget": 3,
      "belowTarget": 7
    }
  },
  "message": "Benchmark comparison retrieved successfully"
}
```

**Notes:** Actual pass rates and averages are computed from the `marks` collection in the Academic module via aggregation pipeline. `status` is `above_target` (actual >= target), `at_target` (within 2%), or `below_target` (actual < target - 2%).

---

#### GET /api/curriculum/benchmarks/trends

Historical trends — how the school's performance has changed over time relative to benchmarks.

**Auth:** `school_admin`, `isSchoolPrincipal`, or `isHOD`

**Query params:** `subjectId` (required), `gradeId` (required), `years` (optional, default last 3 years)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "subjectName": "Mathematics",
    "gradeName": "Grade 9",
    "trends": [
      {
        "year": 2024,
        "terms": [
          { "term": 1, "passRate": 55, "averageScore": 48, "targetPassRate": 60 },
          { "term": 2, "passRate": 58, "averageScore": 50, "targetPassRate": 60 },
          { "term": 3, "passRate": 60, "averageScore": 52, "targetPassRate": 60 },
          { "term": 4, "passRate": 62, "averageScore": 54, "targetPassRate": 60 }
        ]
      },
      {
        "year": 2025,
        "terms": [
          { "term": 1, "passRate": 60, "averageScore": 52, "targetPassRate": 63 },
          { "term": 2, "passRate": 62, "averageScore": 54, "targetPassRate": 63 },
          { "term": 3, "passRate": 65, "averageScore": 56, "targetPassRate": 63 },
          { "term": 4, "passRate": 63, "averageScore": 55, "targetPassRate": 63 }
        ]
      },
      {
        "year": 2026,
        "terms": [
          { "term": 1, "passRate": 58, "averageScore": 52, "targetPassRate": 65 }
        ]
      }
    ]
  },
  "message": "Benchmark trends retrieved successfully"
}
```

---

### 2.5 Intervention Triggers

#### GET /api/curriculum/interventions

List all active intervention triggers for the school.

**Auth:** `school_admin`, `isSchoolPrincipal`, or `isHOD`

**Query params:** `page`, `limit`, `status` (`active`, `acknowledged`, `resolved`), `teacherId`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "interventions": [
      {
        "_id": "6650a1b2c3d4e5f678a50001",
        "planId": { "_id": "...", "subjectId": { "name": "Life Sciences" }, "gradeId": { "name": "Grade 11" } },
        "teacherId": { "_id": "...", "firstName": "Sarah", "lastName": "Nkosi" },
        "reason": "Teacher is 3 weeks behind the expected pacing schedule",
        "weeksBehind": 3,
        "pacingPercent": 35,
        "expectedPercent": 65,
        "status": "active",
        "createdAt": "2026-03-15T08:00:00.000Z"
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20
  },
  "message": "Interventions retrieved successfully"
}
```

---

#### PUT /api/curriculum/interventions/:id

Update an intervention status (acknowledge or resolve).

**Auth:** `school_admin`, `isSchoolPrincipal`, or `isHOD`

**Request body:**

```json
{
  "status": "acknowledged",
  "notes": "Scheduled a meeting with the teacher to discuss a catch-up plan."
}
```

**Response 200:** Updated intervention object.

---

## 3. Frontend Pages

### 3.1 Teacher Pacing Update Page

**Route:** `/teacher/curriculum`
**File:** `src/app/(dashboard)/teacher/curriculum/page.tsx`

The teacher's interface for viewing their assigned curriculum plans and submitting weekly progress updates.

**Layout:**
- `PageHeader`: "Curriculum Pacing"
- Plan selector: dropdown of the teacher's assigned curriculum plans (subject-grade-term)
- Current plan overview: topic list with status indicators (not started / in progress / completed)
- Pacing status bar: visual indicator of actual vs expected progress
- "Submit Weekly Update" button opens the `PacingUpdateDialog`
- Update history: accordion of past weekly submissions

### 3.2 Admin/HOD Pacing Dashboard

**Route:** `/admin/curriculum`
**File:** `src/app/(dashboard)/admin/curriculum/page.tsx`

School-wide pacing oversight for admins, principals, and HODs.

| Tab | Content |
|---|---|
| Overview | Summary cards (on track / behind / significantly behind), traffic light grid by subject x grade |
| By Subject | Drill into a specific subject — see all grades and their pacing status |
| By Teacher | See all plans assigned to a specific teacher with their pacing status |
| Benchmarks | Configure national benchmarks, view comparison chart, historical trends |
| Interventions | List of active intervention triggers with acknowledge/resolve actions |

### 3.3 Benchmark Configuration Page

**Route:** `/admin/curriculum/benchmarks`
**File:** `src/app/(dashboard)/admin/curriculum/benchmarks/page.tsx`

Admin page for configuring national benchmark targets per subject-grade.

**Layout:**
- Grid of subject-grade cells showing current target pass rate
- Click a cell to edit the benchmark (inline or dialog)
- Bulk import option: upload a CSV of subject, grade, target pass rate

---

## 4. User Flows

### 4.1 Teacher Submits Weekly Pacing Update

1. Teacher navigates to `/teacher/curriculum`.
2. Selects their Mathematics Grade 9 Term 1 plan from the dropdown.
3. Views the topic list — some marked green (completed), one yellow (in progress), rest grey (not started).
4. Clicks "Submit Weekly Update" — `PacingUpdateDialog` opens.
5. For each topic worked on this week, teacher selects the status (completed / in progress), optionally sets a completion date and adds notes.
6. Teacher enters overall notes and any challenges faced.
7. Submits → `POST /api/curriculum/plans/:planId/progress`.
8. Topic statuses update in the list. Pacing status bar recalculates.

### 4.2 HOD Reviews Pacing Dashboard

1. HOD navigates to `/admin/curriculum` (accessible via `isHOD` permission flag).
2. Dashboard loads with `GET /api/curriculum/pacing/overview?departmentId=<hodDepartmentId>`.
3. Summary cards show: 5 on track, 2 slightly behind, 1 significantly behind.
4. Traffic light grid shows each subject-grade cell with a coloured indicator.
5. HOD clicks a red cell (Life Sciences Grade 11) — drills into the plan detail.
6. Sees the teacher is 3 weeks behind. Reviews their weekly update notes.
7. HOD can acknowledge the intervention trigger and add notes about their planned action.

### 4.3 Admin Configures National Benchmarks

1. Admin navigates to `/admin/curriculum/benchmarks`.
2. Sees a grid of subject-grade cells (initially empty for new schools).
3. Clicks "Mathematics - Grade 9" cell, enters target pass rate: 65%, source: "National DBE 2026".
4. Submits → `POST /api/curriculum/benchmarks` (upserts).
5. Cell updates with the configured target.
6. Admin repeats for all required subject-grade combinations.

### 4.4 Admin Compares School Performance to Benchmarks

1. Admin clicks the "Benchmarks" tab on the curriculum dashboard.
2. Frontend calls `GET /api/curriculum/benchmarks/comparison?year=2026`.
3. A comparison table shows: subject, grade, target pass rate, actual pass rate, variance, status badge.
4. Red rows indicate below target, green rows indicate above target.
5. Admin clicks a subject-grade row to see the historical trend chart.
6. Frontend calls `GET /api/curriculum/benchmarks/trends?subjectId=...&gradeId=...`.
7. A line chart shows pass rate over terms/years with the target line overlaid.

### 4.5 Intervention Trigger Flow

1. Teacher submits a weekly update that puts them >2 weeks behind expected pace.
2. Backend automatically creates an intervention record in the `curriculuminterventions` collection.
3. A notification is sent to the relevant HOD (and principal if configured).
4. HOD sees the intervention in the "Interventions" tab on the pacing dashboard.
5. HOD clicks "Acknowledge" — `PUT /api/curriculum/interventions/:id` with `{ status: 'acknowledged', notes: '...' }`.
6. After meeting with the teacher and implementing a catch-up plan, HOD clicks "Resolve".

---

## 5. Data Models

### CurriculumPlan

Collection name: `curriculumplans`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `subjectId` | ObjectId (ref: `Subject`) | yes | — | Which subject |
| `gradeId` | ObjectId (ref: `Grade`) | yes | — | Which grade |
| `term` | Number | yes | — | 1-4 |
| `year` | Number | yes | — | Calendar year |
| `topics` | [CurriculumTopic] | yes | — | Embedded sub-documents |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**CurriculumTopic subdocument:**

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `title` | String | yes | — | Topic name |
| `description` | String | no | `''` | Topic description |
| `weekNumber` | Number | yes | — | Expected week number in the term |
| `expectedStartDate` | Date | yes | — | When the topic should start |
| `expectedEndDate` | Date | yes | — | When the topic should be completed |
| `capsReference` | String | no | `''` | CAPS document reference |
| `status` | String enum | no | `'not_started'` | `'not_started'`, `'in_progress'`, `'completed'`, `'skipped'` |
| `completedDate` | Date | no | `null` | When actually completed |
| `percentComplete` | Number | no | `0` | 0-100 for in-progress topics |

**Indexes:** `{ schoolId: 1, subjectId: 1, gradeId: 1, term: 1, year: 1 }` (unique), `{ schoolId: 1, year: 1, term: 1 }`

### PacingUpdate

Collection name: `pacingupdates`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `planId` | ObjectId (ref: `CurriculumPlan`) | yes | — | Which plan |
| `teacherId` | ObjectId (ref: `User`) | yes | — | Who submitted |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `weekEnding` | Date | yes | — | End of the reporting week |
| `topicUpdates` | [TopicUpdate] | yes | — | Status updates per topic |
| `overallNotes` | String | no | `''` | General commentary |
| `challengesFaced` | String | no | `''` | Issues encountered |
| `plannedContentDelivered` | Number | no | — | 0-100, subjective % |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**TopicUpdate subdocument:** `{ topicId: ObjectId, status: String, completedDate: Date, percentComplete: Number, notes: String }`

**Indexes:** `{ planId: 1, weekEnding: -1 }`, `{ teacherId: 1, weekEnding: -1 }`

### NationalBenchmark

Collection name: `nationalbenchmarks`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `subjectId` | ObjectId (ref: `Subject`) | yes | — | Which subject |
| `gradeId` | ObjectId (ref: `Grade`) | yes | — | Which grade |
| `year` | Number | yes | — | Calendar year |
| `targetPassRate` | Number | yes | — | 0-100 |
| `targetAverageScore` | Number | no | — | 0-100 |
| `source` | String | no | `''` | Where the benchmark came from |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**Indexes:** `{ schoolId: 1, subjectId: 1, gradeId: 1, year: 1 }` (unique)

### CurriculumIntervention

Collection name: `curriculuminterventions`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `planId` | ObjectId (ref: `CurriculumPlan`) | yes | — | Which plan triggered it |
| `teacherId` | ObjectId (ref: `User`) | yes | — | The teacher |
| `schoolId` | ObjectId (ref: `School`) | yes | — | Tenant isolation |
| `reason` | String | yes | — | Human-readable reason |
| `weeksBehind` | Number | yes | — | How many weeks behind |
| `pacingPercent` | Number | yes | — | Actual pacing at time of trigger |
| `expectedPercent` | Number | yes | — | Expected pacing at time of trigger |
| `status` | String enum | no | `'active'` | `'active'`, `'acknowledged'`, `'resolved'` |
| `notes` | String | no | `''` | HOD/admin notes |
| `resolvedAt` | Date | no | `null` | When resolved |
| `resolvedBy` | ObjectId (ref: `User`) | no | `null` | Who resolved |
| `isDeleted` | Boolean | no | `false` | Soft delete |

**Indexes:** `{ schoolId: 1, status: 1 }`, `{ teacherId: 1, status: 1 }`

### Frontend TypeScript Interfaces

```ts
type PacingStatus = 'on_track' | 'slightly_behind' | 'significantly_behind';
type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

interface CurriculumTopic {
  id: string;
  title: string;
  description: string;
  weekNumber: number;
  expectedStartDate: string;
  expectedEndDate: string;
  capsReference: string;
  status: TopicStatus;
  completedDate: string | null;
  percentComplete: number;
}

interface CurriculumPlan {
  id: string;
  schoolId: string;
  subjectId: { id: string; name: string };
  gradeId: { id: string; name: string; level: number };
  term: number;
  year: number;
  topics: CurriculumTopic[];
  totalTopics: number;
  completedTopics: number;
  pacingStatus?: PacingStatus;
  pacingPercent?: number;
  expectedPercent?: number;
  assignedTeacher?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

interface PacingUpdate {
  id: string;
  planId: string;
  teacherId: { id: string; firstName: string; lastName: string };
  weekEnding: string;
  topicUpdates: Array<{
    topicId: string;
    status: TopicStatus;
    completedDate: string | null;
    percentComplete: number;
    notes: string;
  }>;
  overallNotes: string;
  challengesFaced: string;
  plannedContentDelivered: number;
  createdAt: string;
}

interface NationalBenchmark {
  id: string;
  subjectId: { id: string; name: string };
  gradeId: { id: string; name: string; level: number };
  year: number;
  targetPassRate: number;
  targetAverageScore: number | null;
  source: string;
}

interface BenchmarkComparison {
  subjectId: string;
  subjectName: string;
  gradeId: string;
  gradeName: string;
  targetPassRate: number;
  actualPassRate: number;
  passRateVariance: number;
  targetAverageScore: number | null;
  actualAverageScore: number | null;
  averageScoreVariance: number | null;
  totalLearners: number;
  passed: number;
  failed: number;
  status: 'above_target' | 'at_target' | 'below_target';
}

interface CurriculumIntervention {
  id: string;
  planId: { id: string; subjectId: { name: string }; gradeId: { name: string } };
  teacherId: { id: string; firstName: string; lastName: string };
  reason: string;
  weeksBehind: number;
  pacingPercent: number;
  expectedPercent: number;
  status: 'active' | 'acknowledged' | 'resolved';
  notes: string;
  createdAt: string;
}

interface PacingOverview {
  term: number;
  year: number;
  summary: {
    totalPlans: number;
    onTrack: number;
    slightlyBehind: number;
    significantlyBehind: number;
  };
  bySubject: Array<{
    subjectId: string;
    subjectName: string;
    plans: number;
    avgPacingPercent: number;
    avgExpectedPercent: number;
    pacingStatus: PacingStatus;
  }>;
  byGrade: Array<{
    gradeId: string;
    gradeName: string;
    plans: number;
    avgPacingPercent: number;
    pacingStatus: PacingStatus;
  }>;
  interventions: CurriculumIntervention[];
}
```

---

## 6. State Management

### `useCurriculumPacing` Hook

**File:** `src/hooks/useCurriculumPacing.ts`

```ts
interface UseCurriculumPacingReturn {
  // Plans
  plans: CurriculumPlan[];
  plansLoading: boolean;
  fetchPlans: (params?: { subjectId?: string; gradeId?: string; term?: number; year?: number }) => Promise<void>;
  createPlan: (data: Partial<CurriculumPlan>) => Promise<CurriculumPlan>;
  updatePlan: (id: string, data: Partial<CurriculumPlan>) => Promise<CurriculumPlan>;
  deletePlan: (id: string) => Promise<void>;

  // Pacing updates
  submitProgress: (planId: string, data: PacingUpdatePayload) => Promise<PacingUpdate>;
  fetchProgressHistory: (planId: string) => Promise<PacingUpdate[]>;

  // Dashboard
  overview: PacingOverview | null;
  overviewLoading: boolean;
  fetchOverview: (params?: { term?: number; year?: number; departmentId?: string }) => Promise<void>;

  // Benchmarks
  benchmarks: NationalBenchmark[];
  benchmarksLoading: boolean;
  fetchBenchmarks: (params?: { year?: number }) => Promise<void>;
  saveBenchmark: (data: Partial<NationalBenchmark>) => Promise<NationalBenchmark>;
  fetchComparison: (params?: { year?: number; term?: number }) => Promise<BenchmarkComparison[]>;
  fetchTrends: (subjectId: string, gradeId: string) => Promise<unknown>;

  // Interventions
  interventions: CurriculumIntervention[];
  interventionsLoading: boolean;
  fetchInterventions: (params?: { status?: string }) => Promise<void>;
  updateIntervention: (id: string, data: { status: string; notes?: string }) => Promise<void>;
}
```

---

## 7. Components Needed

### New Components

| Component | File | Purpose |
|---|---|---|
| `PacingOverviewCards` | `src/components/curriculum/PacingOverviewCards.tsx` | Three stat cards: on track (green), slightly behind (amber), significantly behind (red) |
| `PacingTrafficLight` | `src/components/curriculum/PacingTrafficLight.tsx` | Grid of subject x grade cells with traffic light colours |
| `PacingStatusBadge` | `src/components/curriculum/PacingStatusBadge.tsx` | Badge component: green/amber/red with label |
| `TopicProgressList` | `src/components/curriculum/TopicProgressList.tsx` | Ordered list of topics with status indicators, progress bars for in-progress items |
| `PacingUpdateDialog` | `src/components/curriculum/PacingUpdateDialog.tsx` | Dialog for teacher weekly update: topic status checkboxes, notes fields, challenge field |
| `PacingUpdateHistory` | `src/components/curriculum/PacingUpdateHistory.tsx` | Accordion of past weekly updates with notes and topic changes |
| `BenchmarkGrid` | `src/components/curriculum/BenchmarkGrid.tsx` | Grid for configuring benchmarks: subject x grade cells with editable target values |
| `BenchmarkComparisonTable` | `src/components/curriculum/BenchmarkComparisonTable.tsx` | DataTable: subject, grade, target, actual, variance, status badge |
| `BenchmarkTrendChart` | `src/components/curriculum/BenchmarkTrendChart.tsx` | Recharts line chart: pass rate over terms/years with target line overlay |
| `InterventionList` | `src/components/curriculum/InterventionList.tsx` | List of intervention triggers with teacher name, subject, weeks behind, action buttons |
| `InterventionDialog` | `src/components/curriculum/InterventionDialog.tsx` | Dialog for acknowledging/resolving an intervention with notes |
| `PlanSelectorDropdown` | `src/components/curriculum/PlanSelectorDropdown.tsx` | Dropdown for teacher to select which curriculum plan to view/update |
| `PacingProgressBar` | `src/components/curriculum/PacingProgressBar.tsx` | Dual progress bar: actual vs expected, colour-coded by pacing status |

### Shared Components Used

| Component | File | Notes |
|---|---|---|
| `DataTable` | `src/components/shared/DataTable.tsx` | Base for comparison and intervention tables |
| `PageHeader` | `src/components/shared/PageHeader.tsx` | Page titles |
| `StatCard` | `src/components/shared/StatCard.tsx` | Summary statistics |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner.tsx` | Loading states |
| `EmptyState` | `src/components/shared/EmptyState.tsx` | Empty states |

---

## 8. Integration Notes

### Academic Module Data Dependency

The benchmark comparison endpoint aggregates data from the Academic module's `marks` collection. The aggregation pipeline:

```typescript
// Simplified pipeline for computing pass rate per subject per grade
[
  { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), isDeleted: false } },
  { $lookup: { from: 'assessments', localField: 'assessmentId', foreignField: '_id', as: 'assessment' } },
  { $unwind: '$assessment' },
  { $match: { 'assessment.term': term, 'assessment.year': year } },
  { $group: {
    _id: { subjectId: '$assessment.subjectId', gradeId: '$assessment.gradeId' },
    avgScore: { $avg: { $multiply: [{ $divide: ['$score', '$totalMarks'] }, 100] } },
    totalLearners: { $sum: 1 },
    passed: { $sum: { $cond: [{ $gte: [{ $multiply: [{ $divide: ['$score', '$totalMarks'] }, 100] }, 50] }, 1, 0] } }
  }}
]
```

This pipeline must use `new mongoose.Types.ObjectId()` for all ObjectId fields in `$match` stages (see Known Pitfalls in CLAUDE.md).

### Teacher-Plan Assignment

The system determines which teacher is assigned to a curriculum plan by looking up the class-subject-teacher mapping in the Academic module's `classes` collection. A teacher sees only plans for subjects they teach to grades they are assigned.

### Term Detection

The current term is determined from the school's academic calendar. If not configured, a fallback based on South African school terms is used:
- Term 1: January-March
- Term 2: April-June
- Term 3: July-September
- Term 4: October-December

### Module Guard Registration

```typescript
app.use('/api/curriculum', authenticate, requireModule('curriculum'), curriculumRoutes);
```

### HOD Department Filtering

When an HOD accesses the pacing dashboard, the `departmentId` from their user record (scope 44) is used to filter plans to only their department's subjects. The filter is applied automatically on the backend when `req.user.permissions.isHOD` is true and no explicit `subjectId` filter is provided.

---

## 9. Acceptance Criteria

### Backend — Curriculum Plans

- [ ] `POST /api/curriculum/plans` creates a plan with embedded topics, all set to `not_started`
- [ ] `POST /api/curriculum/plans` with duplicate subject-grade-term-year returns 409
- [ ] `GET /api/curriculum/plans` returns paginated list with computed `pacingStatus` and `pacingPercent`
- [ ] `GET /api/curriculum/plans?subjectId=...&gradeId=...&term=1&year=2026` filters correctly
- [ ] `GET /api/curriculum/plans/:id` returns full plan with all topic details
- [ ] `PUT /api/curriculum/plans/:id` updates the plan
- [ ] `DELETE /api/curriculum/plans/:id` soft-deletes the plan
- [ ] All queries filter by `schoolId` and `isDeleted: false`

### Backend — Pacing Updates

- [ ] `POST /api/curriculum/plans/:planId/progress` creates a pacing update and updates topic statuses on the plan
- [ ] `POST /api/curriculum/plans/:planId/progress` recalculates pacing status after update
- [ ] When a teacher falls >2 weeks behind, an intervention record is auto-created
- [ ] `GET /api/curriculum/plans/:planId/progress` returns paginated update history
- [ ] `GET /api/curriculum/pacing/overview` returns school-wide summary with traffic light data
- [ ] `GET /api/curriculum/pacing/overview?departmentId=...` filters to department subjects (for HOD)

### Backend — Benchmarks

- [ ] `POST /api/curriculum/benchmarks` upserts (no duplicate key error on re-submit)
- [ ] `GET /api/curriculum/benchmarks` returns all benchmarks for the school
- [ ] `GET /api/curriculum/benchmarks/comparison` computes actual vs target from marks data
- [ ] `GET /api/curriculum/benchmarks/comparison` uses `mongoose.Types.ObjectId` in aggregation `$match`
- [ ] `GET /api/curriculum/benchmarks/trends` returns multi-year term-by-term data
- [ ] `status` field correctly classifies `above_target`, `at_target`, `below_target`

### Backend — Interventions

- [ ] Interventions are auto-created when teacher falls >2 weeks behind
- [ ] `GET /api/curriculum/interventions` returns paginated list filtered by school
- [ ] `PUT /api/curriculum/interventions/:id` updates status and notes
- [ ] Only `school_admin`, `isSchoolPrincipal`, or `isHOD` can access intervention endpoints

### Frontend — Teacher Pacing Page

- [ ] `/teacher/curriculum` page loads with plan selector dropdown
- [ ] Selecting a plan shows the topic list with status indicators
- [ ] Pacing progress bar shows actual vs expected with correct colour
- [ ] "Submit Weekly Update" opens dialog with topic checkboxes and notes fields
- [ ] Submitting an update refreshes the topic statuses and pacing bar
- [ ] Update history accordion shows past submissions

### Frontend — Admin Pacing Dashboard

- [ ] `/admin/curriculum` page loads with overview tab showing summary cards
- [ ] Traffic light grid shows pacing status per subject x grade
- [ ] Clicking a cell drills into the plan detail
- [ ] Benchmarks tab shows comparison table with variance and status badges
- [ ] Trend chart renders pass rate over time with target line
- [ ] Interventions tab lists active triggers with acknowledge/resolve actions
- [ ] All data views have loading and empty states
- [ ] All grids use responsive breakpoints (mobile-first)
- [ ] Traffic light colours use design tokens, not hardcoded colours
