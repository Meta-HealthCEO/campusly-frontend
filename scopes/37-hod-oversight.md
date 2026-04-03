# 37 — HOD Department Oversight

## 1. Module Overview

The HOD (Head of Department) Department Oversight module gives department heads visibility into the academic performance, curriculum pacing, assessment quality, teacher workload, and classroom practice within their department. It does **not** introduce a new user role — instead, it adds `isHOD: boolean` and `departmentId: ObjectId` fields to the existing User model for teacher-role users.

HODs see only teachers, classes, and subjects within their assigned department. They cannot view other departments or school-wide data (that is the principal's domain in Scope 36).

### Key Capabilities

| Capability | Description |
|---|---|
| Department Performance | Average marks per subject per class per term within the department |
| Curriculum Pacing | Are teachers on track? Shows % syllabus covered vs expected % at this point in the term |
| Moderation Queue | Review and approve/reject exam papers and assessments set by department teachers |
| Teacher Observations | Schedule, conduct, and record classroom observation visits |
| Workload Distribution | How many classes/subjects/students each teacher in the department handles |
| Common Assessment Analysis | Compare results across parallel classes teaching the same subject |

### Role-based Access

| Capability | teacher | teacher + isHOD | school_admin | super_admin |
|---|---|---|---|---|
| View own performance | Yes | Yes | N/A | N/A |
| View department performance | No | Yes (own dept) | Yes (any dept) | Yes (any dept) |
| Curriculum pacing (own) | Yes | Yes | N/A | N/A |
| Curriculum pacing (dept) | No | Yes (own dept) | Yes (any dept) | Yes (any dept) |
| Moderation queue | No | Yes (own dept) | Yes (any dept) | Yes (any dept) |
| Teacher observations | No | Yes (own dept) | Yes (any dept) | Yes (any dept) |
| Workload view | No | Yes (own dept) | Yes (any dept) | Yes (any dept) |
| Common assessment analysis | No | Yes (own dept) | Yes (any dept) | Yes (any dept) |

### Department Concept

A department is an organisational grouping of subjects (e.g., "Mathematics Department" contains Mathematics, Mathematical Literacy; "Sciences Department" contains Physical Science, Life Science, Natural Science). The department model is new.

---

## 2. Backend API Endpoints

All endpoints are mounted at `/api/departments`. Every endpoint requires `authenticate` middleware. Most endpoints require HOD, school_admin, or super_admin access, enforced by a `requireHOD` middleware that checks either `isHOD: true` with matching `departmentId`, or admin/super_admin role.

---

### 2.1 Department Management

#### GET /api/departments

List all departments for a school.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Query**: `schoolId`

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "schoolId": "...",
      "name": "Mathematics Department",
      "description": "Mathematics and Mathematical Literacy",
      "hodUserId": "...",
      "subjectIds": ["...", "..."],
      "subjects": [
        { "_id": "...", "name": "Mathematics" },
        { "_id": "...", "name": "Mathematical Literacy" }
      ],
      "teacherCount": 4,
      "isActive": true,
      "createdAt": "2026-01-15T08:00:00.000Z"
    }
  ]
}
```

#### POST /api/departments

Create a new department.

**Auth**: `school_admin`, `super_admin`

**Request body**:

```json
{
  "schoolId": "...",
  "name": "Sciences Department",
  "description": "Physical Science, Life Science, Natural Science",
  "hodUserId": "...",
  "subjectIds": ["...", "...", "..."],
  "isActive": true
}
```

**Response 201**: Created department document.

#### PUT /api/departments/:id

Update a department (name, HOD assignment, subjects).

**Auth**: `school_admin`, `super_admin`

**Request body**: Partial department fields.

**Response 200**: Updated department document.

#### DELETE /api/departments/:id

Soft delete a department.

**Auth**: `school_admin`, `super_admin`

**Response 200**: `{ success: true, message: "Department deleted" }`

---

### 2.2 Department Performance

#### GET /api/departments/:id/performance

Returns average marks per subject per class per term for all subjects in the department.

**Auth**: HOD (own department), `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `term` | number | No | 1-4. Defaults to current term. |
| `year` | number | No | Defaults to current year. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "departmentName": "Mathematics Department",
    "term": 1,
    "year": 2026,
    "subjects": [
      {
        "subjectId": "...",
        "subjectName": "Mathematics",
        "overallAverage": 58.4,
        "overallPassRate": 72.1,
        "classes": [
          {
            "classId": "...",
            "className": "Grade 10A",
            "teacherName": "Mr. Smith",
            "studentCount": 38,
            "averageMark": 62.1,
            "passRate": 78.9,
            "highestMark": 94,
            "lowestMark": 18
          },
          {
            "classId": "...",
            "className": "Grade 10B",
            "teacherName": "Ms. Jones",
            "studentCount": 36,
            "averageMark": 54.7,
            "passRate": 65.3,
            "highestMark": 88,
            "lowestMark": 12
          }
        ]
      }
    ]
  }
}
```

**Computation**: Aggregation on `Mark` joined with `Assessment`, `Subject`, `Class`. Only includes subjects where `subjectId` is in the department's `subjectIds` array.

---

### 2.3 Curriculum Pacing

#### GET /api/departments/:id/pacing

Returns curriculum coverage progress vs expected progress for each teacher in the department.

**Auth**: HOD (own department), `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `term` | number | No | 1-4. Defaults to current term. |
| `year` | number | No | Defaults to current year. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "termWeeksElapsed": 6,
    "termTotalWeeks": 10,
    "expectedProgress": 60.0,
    "teachers": [
      {
        "teacherId": "...",
        "teacherName": "Mr. Smith",
        "subjects": [
          {
            "subjectId": "...",
            "subjectName": "Mathematics",
            "classes": [
              {
                "classId": "...",
                "className": "Grade 10A",
                "totalTopics": 24,
                "completedTopics": 16,
                "inProgressTopics": 2,
                "actualProgress": 66.7,
                "expectedProgress": 60.0,
                "status": "on_track"
              },
              {
                "classId": "...",
                "className": "Grade 10B",
                "totalTopics": 24,
                "completedTopics": 11,
                "inProgressTopics": 1,
                "actualProgress": 45.8,
                "expectedProgress": 60.0,
                "status": "behind"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Status values**: `ahead` (actual > expected + 10%), `on_track` (within 10%), `behind` (actual < expected - 10%), `significantly_behind` (actual < expected - 25%).

**Computation**: Joins `CurriculumCoverage` with `CurriculumTopic` to count completed vs total topics for each teacher+class+subject combination. Expected progress is computed from `termWeeksElapsed / termTotalWeeks * 100`.

---

### 2.4 Moderation Queue

#### GET /api/departments/:id/moderation

Returns papers pending moderation from teachers in this department. Extends the existing `PaperModeration` model from the Teacher Workbench (Scope 30).

**Auth**: HOD (own department), `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | `pending`, `approved`, `changes_requested`. Defaults to `pending`. |
| `page` | number | No | Defaults to 1. |
| `limit` | number | No | Defaults to 20. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "paperId": "...",
        "paperTitle": "Mathematics Grade 10 — Term 1 Test",
        "subjectName": "Mathematics",
        "teacherName": "Mr. Smith",
        "submittedAt": "2026-03-28T14:00:00.000Z",
        "status": "pending",
        "totalMarks": 100,
        "questionCount": 25
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20
  }
}
```

This endpoint queries `PaperModeration` documents where the paper's `subjectId` is in the department's `subjectIds`.

---

### 2.5 Teacher Observations

#### GET /api/departments/:id/observations

List observation records for the department.

**Auth**: HOD (own department), `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `teacherId` | string | No | Filter to a specific teacher. |
| `status` | string | No | `scheduled`, `completed`, `cancelled`. |
| `page` | number | No | Defaults to 1. |
| `limit` | number | No | Defaults to 20. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "departmentId": "...",
        "teacherId": "...",
        "teacherName": "Ms. Jones",
        "observerId": "...",
        "observerName": "Mr. Williams (HOD)",
        "scheduledDate": "2026-04-05T09:00:00.000Z",
        "classId": "...",
        "className": "Grade 10B",
        "subjectName": "Mathematics",
        "status": "scheduled",
        "duration": 45,
        "focusAreas": ["lesson_planning", "learner_engagement", "assessment_practices"],
        "scores": null,
        "notes": null,
        "recommendations": null,
        "completedAt": null
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

#### POST /api/departments/:id/observations

Schedule a new classroom observation.

**Auth**: HOD (own department), `school_admin`, `super_admin`

**Request body**:

```json
{
  "teacherId": "...",
  "classId": "...",
  "subjectId": "...",
  "scheduledDate": "2026-04-05T09:00:00.000Z",
  "duration": 45,
  "focusAreas": ["lesson_planning", "learner_engagement", "assessment_practices"]
}
```

**Response 201**: Created observation record.

#### PUT /api/departments/:id/observations/:observationId

Update an observation (complete it with scores, notes, recommendations).

**Auth**: HOD (own department), `school_admin`, `super_admin`

**Request body**:

```json
{
  "status": "completed",
  "scores": {
    "lesson_planning": 4,
    "learner_engagement": 3,
    "assessment_practices": 4,
    "classroom_management": 5,
    "subject_knowledge": 4
  },
  "notes": "Good use of group work. Could improve on differentiation for weaker learners.",
  "recommendations": "Attend the differentiated instruction workshop in May.",
  "completedAt": "2026-04-05T09:45:00.000Z"
}
```

**Response 200**: Updated observation record.

#### DELETE /api/departments/:id/observations/:observationId

Soft delete (cancel) an observation.

**Auth**: HOD (own department), `school_admin`, `super_admin`

---

### 2.6 Workload Distribution

#### GET /api/departments/:id/workload

Returns workload metrics for each teacher in the department.

**Auth**: HOD (own department), `school_admin`, `super_admin`

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "teacherId": "...",
      "teacherName": "Mr. Smith",
      "subjectCount": 2,
      "classCount": 5,
      "totalStudents": 186,
      "periodsPerWeek": 25,
      "assessmentsThisTerm": 8,
      "pendingMarking": 3,
      "observationsThisYear": 2
    },
    {
      "teacherId": "...",
      "teacherName": "Ms. Jones",
      "subjectCount": 1,
      "classCount": 3,
      "totalStudents": 108,
      "periodsPerWeek": 15,
      "assessmentsThisTerm": 5,
      "pendingMarking": 1,
      "observationsThisYear": 1
    }
  ]
}
```

**Computation**: Joins `Class` (where teacherId matches and subjectId is in department), counts `Student` per class, counts `Assessment` for the current term, counts ungraded `Mark` entries, counts `TeacherObservation` for the year.

---

### 2.7 Common Assessment Analysis

#### GET /api/departments/:id/common-assessments

Compares results across parallel classes that took the same assessment (same subject, same grade, same assessment type/name).

**Auth**: HOD (own department), `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `subjectId` | string | No | Filter to a specific subject. |
| `term` | number | No | 1-4. Defaults to current term. |
| `year` | number | No | Defaults to current year. |

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "assessmentName": "Term 1 Common Test",
      "subjectName": "Mathematics",
      "gradeName": "Grade 10",
      "totalMarks": 100,
      "date": "2026-03-15",
      "classes": [
        {
          "classId": "...",
          "className": "Grade 10A",
          "teacherName": "Mr. Smith",
          "studentCount": 38,
          "averageMark": 62.1,
          "passRate": 78.9,
          "medianMark": 64,
          "standardDeviation": 15.3,
          "distribution": {
            "level7": 3,
            "level6": 5,
            "level5": 8,
            "level4": 10,
            "level3": 6,
            "level2": 4,
            "level1": 2
          }
        },
        {
          "classId": "...",
          "className": "Grade 10B",
          "teacherName": "Ms. Jones",
          "studentCount": 36,
          "averageMark": 54.7,
          "passRate": 65.3,
          "medianMark": 52,
          "standardDeviation": 18.7,
          "distribution": {
            "level7": 1,
            "level6": 3,
            "level5": 5,
            "level4": 8,
            "level3": 7,
            "level2": 8,
            "level1": 4
          }
        }
      ]
    }
  ]
}
```

**SA Grading Levels**: Level 7 (80-100%), Level 6 (70-79%), Level 5 (60-69%), Level 4 (50-59%), Level 3 (40-49%), Level 2 (30-39%), Level 1 (0-29%). These are the standard South African National Curriculum Statement achievement levels.

---

## 3. Data Models

### Department

```
Department {
  schoolId:        ObjectId (ref: 'School', required)
  name:            String (required, trim)
  description:     String (trim)
  hodUserId:       ObjectId (ref: 'User')
  subjectIds:      [ObjectId] (ref: 'Subject')
  isActive:        Boolean (default: true)
  isDeleted:       Boolean (default: false)
  timestamps:      true
}

Indexes:
  - { schoolId: 1, name: 1 } unique
  - { schoolId: 1, isDeleted: 1 }
```

### TeacherObservation

```
TeacherObservation {
  schoolId:        ObjectId (ref: 'School', required)
  departmentId:    ObjectId (ref: 'Department', required)
  teacherId:       ObjectId (ref: 'User', required)
  observerId:      ObjectId (ref: 'User', required)
  classId:         ObjectId (ref: 'Class', required)
  subjectId:       ObjectId (ref: 'Subject', required)
  scheduledDate:   Date (required)
  duration:        Number (minutes, default: 45)
  status:          String (enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled')
  focusAreas:      [String] (enum: ['lesson_planning', 'learner_engagement', 'assessment_practices', 'classroom_management', 'subject_knowledge', 'differentiation', 'use_of_resources', 'questioning_techniques'])
  scores: {
    lesson_planning:       Number (1-5)
    learner_engagement:    Number (1-5)
    assessment_practices:  Number (1-5)
    classroom_management:  Number (1-5)
    subject_knowledge:     Number (1-5)
    differentiation:       Number (1-5, optional)
    use_of_resources:      Number (1-5, optional)
    questioning_techniques: Number (1-5, optional)
  }
  notes:           String
  recommendations: String
  completedAt:     Date
  isDeleted:       Boolean (default: false)
  timestamps:      true
}

Indexes:
  - { schoolId: 1, departmentId: 1, status: 1 }
  - { schoolId: 1, teacherId: 1, scheduledDate: 1 }
```

### User Model Extensions

Add to existing User schema:
```
isHOD:          Boolean (default: false)
departmentId:   ObjectId (ref: 'Department', optional)
```

---

## 4. Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/teacher/hod` | HOD Dashboard | Overview: dept performance summary, pacing alerts, pending moderation count |
| `/teacher/hod/performance` | Department Performance | Subject × class performance table with drill-down |
| `/teacher/hod/pacing` | Curriculum Pacing | Teacher pacing progress bars with status indicators |
| `/teacher/hod/moderation` | Moderation Queue | List of papers pending review with approve/reject actions |
| `/teacher/hod/observations` | Teacher Observations | List, schedule, and complete observations |
| `/teacher/hod/observations/[id]` | Observation Detail | View/edit a single observation record |
| `/teacher/hod/workload` | Workload Distribution | Table of teacher workload metrics |
| `/teacher/hod/common-assessments` | Common Assessment Analysis | Side-by-side class comparison with distribution charts |

**Nav entry** (in `src/lib/constants.ts`):
```ts
{ label: 'HOD Oversight', href: '/teacher/hod', icon: Users }
```
Conditionally rendered: `user.role === 'teacher' && user.isHOD`.

---

## 5. User Flows

### Flow 1: HOD Reviews Department Performance

1. HOD logs in as teacher.
2. Nav shows "HOD Oversight" link (because `isHOD: true`).
3. HOD navigates to `/teacher/hod/performance`.
4. Page loads `GET /api/departments/:id/performance?term=1&year=2026`.
5. Table shows subjects, classes, average marks, pass rates.
6. HOD identifies Grade 10B Mathematics has a significantly lower pass rate than 10A.
7. HOD can click a class row to view individual student marks (navigates to academic module).

### Flow 2: HOD Checks Curriculum Pacing

1. HOD navigates to `/teacher/hod/pacing`.
2. Page loads `GET /api/departments/:id/pacing?term=1&year=2026`.
3. Each teacher shows a progress bar per class.
4. Status badges: green (on track), amber (behind), red (significantly behind).
5. HOD sees Ms. Jones is behind on Grade 10B — only 45.8% covered vs 60% expected.
6. HOD can schedule an observation or send a message.

### Flow 3: HOD Moderates a Paper

1. HOD navigates to `/teacher/hod/moderation`.
2. Page loads `GET /api/departments/:id/moderation?status=pending`.
3. HOD clicks on "Mathematics Grade 10 — Term 1 Test".
4. Paper preview opens (reads from existing Teacher Workbench paper viewer).
5. HOD reviews questions, memo, mark allocations.
6. HOD clicks "Approve" or "Request Changes" with optional comments.
7. `POST /api/teacher-workbench/moderation/:paperId/review` is called.
8. Teacher is notified of the outcome.

### Flow 4: HOD Conducts a Classroom Observation

1. HOD navigates to `/teacher/hod/observations`.
2. Clicks "Schedule Observation".
3. Dialog: select teacher, class, subject, date, duration, focus areas.
4. Submits → `POST /api/departments/:id/observations`.
5. On the scheduled date, HOD observes the class.
6. HOD navigates to the observation record.
7. Fills in scores (1-5 per focus area), notes, and recommendations.
8. Submits → `PUT /api/departments/:id/observations/:observationId`.
9. Observation record is now `completed`.

### Flow 5: HOD Analyses Common Assessment

1. HOD navigates to `/teacher/hod/common-assessments`.
2. Selects subject and term from filters.
3. Page loads `GET /api/departments/:id/common-assessments?subjectId=...&term=1`.
4. Side-by-side comparison shows class averages, pass rates, distributions.
5. Distribution chart uses SA grading levels (Level 1-7).
6. HOD identifies that Grade 10B has a much wider spread (higher standard deviation).

---

## 6. State Management

### useHODDashboard hook (`src/hooks/useHODDashboard.ts`)

```ts
interface HODDashboardState {
  department: Department | null;
  performance: DepartmentPerformance | null;
  pacing: DepartmentPacing | null;
  workload: TeacherWorkload[];
  loading: boolean;
  error: string | null;
}
```

### useHODModeration hook (`src/hooks/useHODModeration.ts`)

Manages the moderation queue — fetch pending papers, approve/reject.

### useTeacherObservations hook (`src/hooks/useTeacherObservations.ts`)

CRUD operations for teacher observation records.

### useCommonAssessments hook (`src/hooks/useCommonAssessments.ts`)

Fetch and filter common assessment comparisons.

---

## 7. Components Needed

### HOD-specific components (`src/components/hod/`)

| Component | Description |
|---|---|
| `DepartmentPerformanceTable` | Nested table: subject → classes with averages, pass rates |
| `PerformanceClassRow` | Expandable row showing class-level detail |
| `CurriculumPacingList` | List of teachers with progress bars per class |
| `PacingProgressBar` | Coloured progress bar with expected-progress marker |
| `PacingStatusBadge` | Badge: on_track (green), behind (amber), significantly_behind (red) |
| `ModerationQueueList` | List of papers pending review with action buttons |
| `ModerationReviewDialog` | Dialog for approve/reject with comments textarea |
| `ObservationList` | DataTable of scheduled and completed observations |
| `ScheduleObservationDialog` | Form dialog to schedule a new observation |
| `ObservationScoreForm` | Form with 1-5 score inputs per focus area |
| `ObservationDetailCard` | Read-only view of a completed observation |
| `WorkloadTable` | DataTable showing teacher workload metrics |
| `CommonAssessmentComparison` | Side-by-side class cards with distribution charts |
| `GradeDistributionChart` | Recharts `BarChart` showing Level 1-7 distribution |
| `HODDashboardSummary` | Overview cards: pending moderation, behind teachers, upcoming observations |

### Shared components reused

- `PageHeader`, `DataTable`, `Badge`, `Dialog`, `LoadingSpinner`, `EmptyState`
- `Select`, `Input`, `Button`, `Textarea` from UI primitives

---

## 8. Integration Notes

### Extending the User Model

Add to existing User schema:
- `isHOD: { type: Boolean, default: false }`
- `departmentId: { type: Schema.Types.ObjectId, ref: 'Department' }`

School admins assign HOD status via user management. A teacher can be HOD of exactly one department.

### Middleware: requireHOD

```ts
function requireHOD(req, res, next) {
  const deptId = req.params.id; // department ID from URL
  if (req.user.role === 'super_admin' || req.user.role === 'school_admin') return next();
  if (req.user.role === 'teacher' && req.user.isHOD && req.user.departmentId?.toString() === deptId) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'HOD access required for this department' });
}
```

### Integration with Teacher Workbench (Scope 30)

- The moderation queue in this module reads from `PaperModeration` — same collection used by the Teacher Workbench.
- The moderation review action (`approve`/`changes_requested`) calls the existing workbench endpoint.
- Curriculum pacing reads from `CurriculumCoverage` and `CurriculumTopic` — same collections from the workbench.
- No data duplication — this module provides a department-scoped view of existing data.

### SA Grading Levels

The common assessment analysis uses the South African NCS achievement levels:
| Level | Range | Description |
|---|---|---|
| 7 | 80-100% | Outstanding |
| 6 | 70-79% | Meritorious |
| 5 | 60-69% | Substantial |
| 4 | 50-59% | Adequate |
| 3 | 40-49% | Moderate |
| 2 | 30-39% | Elementary |
| 1 | 0-29% | Not achieved |

### Multi-Tenancy

All endpoints filter by `schoolId`. The `requireHOD` middleware additionally scopes to the teacher's assigned `departmentId`, preventing cross-department access.

### Aggregation Performance

- Department performance queries aggregate across `Mark`, `Assessment`, `Subject`, `Class`. Add compound index: `{ schoolId: 1, subjectId: 1, assessmentId: 1 }` on `Mark` if not present.
- Cache department performance in Redis with 30-minute TTL for frequently accessed terms.
- Pacing queries join `CurriculumCoverage` with `CurriculumTopic` — ensure index on `{ schoolId: 1, teacherId: 1, classId: 1 }`.

---

## 9. Acceptance Criteria

- [ ] School admins can create, update, and delete departments
- [ ] Departments have a name, description, HOD assignment, and subject list
- [ ] Teachers with `isHOD: true` see "HOD Oversight" in the nav
- [ ] Teachers without the flag do NOT see the nav entry or have API access
- [ ] HODs can only view data for their own department
- [ ] Department performance shows average marks and pass rates per subject per class
- [ ] Curriculum pacing shows actual % vs expected % with status indicators
- [ ] Pacing statuses are correctly computed: on_track, behind, significantly_behind
- [ ] Moderation queue shows papers pending review from department teachers
- [ ] HOD can approve or request changes on papers with comments
- [ ] Teacher observations can be scheduled with date, class, subject, and focus areas
- [ ] Observations can be completed with scores (1-5), notes, and recommendations
- [ ] Workload distribution shows classes, subjects, students, periods per teacher
- [ ] Common assessment analysis compares parallel classes with same assessment
- [ ] Distribution uses SA grading levels (Level 1-7)
- [ ] All data is scoped to the HOD's department — no cross-department leakage
- [ ] All endpoints filter by `schoolId` — no cross-school data leakage
- [ ] All pages have loading spinners and empty states
- [ ] All pages are mobile-responsive
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
