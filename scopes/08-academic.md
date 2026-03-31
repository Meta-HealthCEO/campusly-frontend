# 08 — Academic Module

## 1. Module Overview

The Academic module is the core curriculum and assessment backbone of Campusly. It manages the full hierarchy from grades down to individual marks, and spans every portal: admin configures the structure, teachers record marks and view timetables, and students view their own grades and weekly schedule.

### Sub-domains

| Sub-domain | Responsibility |
|---|---|
| Grades | Top-level year/level groupings (e.g. "Grade 7") |
| Classes | Named sections within a grade (e.g. "7A"), each with a home teacher and capacity |
| Subjects | Curriculum subjects linked to one or more grades, with a short code |
| Timetable | Weekly period-by-period class schedule (day, period, start/end time, room) |
| Assessments | Named tasks (test, exam, assignment, practical, project) linked to a class/subject/term |
| Marks | Per-student result on an assessment; upsert semantics with auto-calculated percentage |
| Exams | Named exam sittings that span a date range (Term 1 June Exams) |
| Exam Timetable | Per-subject slot within an exam (venue, invigilator, duration) |
| Past Papers | File-based archive of previous exam papers per subject/grade/year |
| Subject Weightings | Configurable percentage contribution per assessment type per subject/grade/term |
| Remedial Tracking | Intervention records for at-risk students per subject |
| Promotion | Automated pass/fail calculation per student; grade-level promotion report |
| LURITS Export | South African DBE CSV export of active student registration data |

### Role-based access summary

| Role | Grades/Classes/Subjects | Timetable | Assessments | Marks | Exams | Exam Timetable | Past Papers | Weightings | Remedials | Promotion | LURITS |
|---|---|---|---|---|---|---|---|---|---|---|---|
| super_admin | Full CRUD | Full CRUD | Full CRUD | Full | Full CRUD | Full CRUD | Create+Delete | Full CRUD | Full CRUD | Read | Export |
| school_admin | Full CRUD | Full CRUD | Full CRUD | Full | Full CRUD | Full CRUD | Create+Delete | Full CRUD | Full CRUD | Read | Export |
| teacher | Read only | Read only | Create+Update+Delete | Create (bulk) | Read only | Read only | Create | Read | Create+Update+Delete | Read | — |
| student | Read only | Read own class | Read | Read own marks | Read | Read | Read | — | — | — | — |
| parent | — | — | — | Read child marks | — | — | — | — | — | — | — |

---

## 2. Backend API Endpoints

All routes are mounted under `/api/academic` (inferred from module convention). Every request requires a valid JWT (`authenticate` middleware). Role restrictions are noted per endpoint.

---

### 2.1 Grades

#### POST /academic/grades
Create a new grade.

**Auth:** super_admin, school_admin

**Request body:**
```json
{
  "name": "Grade 7",          // string, required, min 1 char
  "schoolId": "64abc...",     // ObjectId (24-char hex), required
  "orderIndex": 7             // integer, min 0, required — controls sort order
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64def...",
    "name": "Grade 7",
    "schoolId": "64abc...",
    "orderIndex": 7,
    "isDeleted": false,
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-01-15T08:00:00.000Z"
  },
  "message": "Grade created successfully"
}
```

---

#### GET /academic/grades
List grades for a school, sorted by `orderIndex` by default.

**Auth:** any authenticated user

**Query params:**
| Param | Type | Notes |
|---|---|---|
| schoolId | string | Optional; falls back to `req.user.schoolId` |
| page | number | Pagination, default 1 |
| limit | number | Page size, server max enforced |
| sort | string | Field to sort by, default `orderIndex` |
| search | string | Case-insensitive regex on `name` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "data": [ { "_id": "...", "name": "Grade 7", "orderIndex": 7, ... } ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Grades retrieved successfully"
}
```

---

#### GET /academic/grades/:id
Fetch a single grade by ID.

**Auth:** any authenticated user

**Response 200:**
```json
{
  "success": true,
  "data": { "_id": "...", "name": "Grade 7", "orderIndex": 7, ... },
  "message": "Grade retrieved successfully"
}
```

**Error 404:** `{ "success": false, "error": "Grade not found" }`

---

#### PUT /academic/grades/:id
Partial update; all fields optional (Zod `.partial()`).

**Auth:** super_admin, school_admin

**Request body:** Any subset of `{ name, schoolId, orderIndex }`

**Response 200:** Updated grade document. 404 if not found.

---

#### DELETE /academic/grades/:id
Soft-delete (sets `isDeleted: true`).

**Auth:** super_admin, school_admin

**Response 200:** `{ "success": true, "message": "Grade deleted successfully" }`

---

### 2.2 Classes

#### POST /academic/classes
Create a class inside a grade.

**Auth:** super_admin, school_admin

**Request body:**
```json
{
  "name": "7A",
  "gradeId": "64def...",    // ObjectId, required
  "schoolId": "64abc...",   // ObjectId, required
  "teacherId": "64fff...",  // ObjectId (User ref), required — home teacher
  "capacity": 35            // integer, min 1, required
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "7A",
    "gradeId": { "_id": "...", "name": "Grade 7", ... },
    "schoolId": "...",
    "teacherId": { "_id": "...", "firstName": "Jane", "lastName": "Smith", "email": "jane@school.za" },
    "capacity": 35,
    "isDeleted": false,
    "createdAt": "..."
  },
  "message": "Class created successfully"
}
```

---

#### GET /academic/classes
List classes. `gradeId` filter available for fetching one grade's classes.

**Auth:** any authenticated user

**Query params:**
| Param | Type | Notes |
|---|---|---|
| schoolId | string | Falls back to `req.user.schoolId` |
| gradeId | string | Filter by grade |
| page | number | |
| limit | number | |
| sort | string | |
| search | string | Regex on class `name` |

**Response 200:** Paginated list; `gradeId` and `teacherId` are populated.

---

#### GET /academic/classes/:id
Single class with populated `gradeId` and `teacherId`.

**Auth:** any authenticated user

---

#### PUT /academic/classes/:id
Partial update. Populated response.

**Auth:** super_admin, school_admin

---

#### DELETE /academic/classes/:id
Soft-delete.

**Auth:** super_admin, school_admin

---

### 2.3 Subjects

#### POST /academic/subjects
Create a subject.

**Auth:** super_admin, school_admin

**Request body:**
```json
{
  "name": "Mathematics",
  "code": "MATH",
  "schoolId": "64abc...",
  "gradeIds": ["64def...", "64deg..."]   // array of ObjectId, min 1 entry required
}
```

**Response 201:** Subject document with `gradeIds` populated.

---

#### GET /academic/subjects
List subjects. Search matches both `name` and `code`.

**Auth:** any authenticated user

**Query params:** `schoolId`, `page`, `limit`, `sort`, `search`

**Response 200:** Paginated list; `gradeIds` populated.

---

#### GET /academic/subjects/:id
Single subject. `gradeIds` populated.

**Auth:** any authenticated user

---

#### PUT /academic/subjects/:id
Partial update. Returns populated document.

**Auth:** super_admin, school_admin

---

#### DELETE /academic/subjects/:id
Soft-delete.

**Auth:** super_admin, school_admin

---

### 2.4 Timetable

#### POST /academic/timetable
Create a single timetable slot. The compound index `{ classId, day, period }` is unique — duplicate slots are rejected at the DB level.

**Auth:** super_admin, school_admin

**Request body:**
```json
{
  "schoolId": "64abc...",
  "classId": "64bbb...",
  "day": "monday",           // enum: monday|tuesday|wednesday|thursday|friday
  "period": 1,               // integer, min 1
  "startTime": "07:45",      // HH:MM format (regex validated)
  "endTime": "08:30",        // HH:MM format
  "subjectId": "64ccc...",
  "teacherId": "64ddd...",
  "room": "B12"              // optional string
}
```

**Response 201:** Entry with `classId`, `subjectId`, `teacherId` populated.

---

#### GET /academic/timetable
List timetable entries (paginated). Filter by `schoolId` and/or `classId`.

**Auth:** any authenticated user

**Query params:** `schoolId`, `classId`, `page`, `limit`, `sort`, `search`

---

#### GET /academic/timetable/class/:classId
All timetable entries for a specific class, sorted by `day` then `period`. Returns a flat array (not paginated).

**Auth:** super_admin, school_admin, teacher

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "day": "monday",
      "period": 1,
      "startTime": "07:45",
      "endTime": "08:30",
      "room": "B12",
      "subjectId": { "_id": "...", "name": "Mathematics", "code": "MATH" },
      "teacherId": { "_id": "...", "firstName": "Jane", "lastName": "Smith", "email": "..." }
    }
  ],
  "message": "Class timetable retrieved successfully"
}
```

---

#### GET /academic/timetable/teacher/:teacherId
All timetable entries for a teacher (across all their classes), sorted `day` then `period`. Flat array.

**Auth:** super_admin, school_admin, teacher

**Response 200:** Array of entries with `classId` and `subjectId` populated.

---

#### GET /academic/timetable/:id
Single entry (populated).

**Auth:** any authenticated user

---

#### PUT /academic/timetable/:id
Partial update. Returns populated entry.

**Auth:** super_admin, school_admin

---

#### DELETE /academic/timetable/:id
Soft-delete.

**Auth:** super_admin, school_admin

---

### 2.5 Assessments

#### POST /academic/assessments
Create an assessment.

**Auth:** super_admin, school_admin, teacher

**Request body:**
```json
{
  "name": "Term 1 Math Test",
  "subjectId": "64ccc...",
  "classId": "64bbb...",
  "schoolId": "64abc...",
  "type": "test",            // enum: test|exam|assignment|practical|project
  "totalMarks": 50,          // number, min 1
  "weight": 20,              // number, 0–100 (percentage contribution)
  "term": 1,                 // integer, min 1
  "academicYear": 2026,      // integer, min 2000
  "date": "2026-03-14T09:00:00.000Z"  // ISO datetime
}
```

**Response 201:** Assessment with `subjectId` and `classId` populated.

---

#### GET /academic/assessments
List assessments with optional filters.

**Auth:** any authenticated user

**Query params:**
| Param | Type |
|---|---|
| schoolId | string |
| classId | string |
| subjectId | string |
| term | number |
| academicYear | number |
| page, limit, sort, search | pagination |

**Response 200:** Paginated list; `subjectId` and `classId` populated.

---

#### GET /academic/assessments/:id
Single assessment (populated).

**Auth:** any authenticated user

---

#### PUT /academic/assessments/:id
Partial update.

**Auth:** super_admin, school_admin, teacher

---

#### DELETE /academic/assessments/:id
Soft-delete.

**Auth:** super_admin, school_admin, teacher

---

### 2.6 Marks

#### POST /academic/marks
Capture or update a single mark. Uses upsert — re-posting for the same `assessmentId + studentId` overwrites the previous mark. `percentage` is auto-calculated server-side as `round((mark / total) * 10000) / 100`.

**Auth:** super_admin, school_admin, teacher

**Request body:**
```json
{
  "assessmentId": "64eee...",
  "studentId": "64fff...",
  "schoolId": "64abc...",
  "mark": 42,               // number, min 0
  "total": 50,              // number, min 1
  "comment": "Well done"    // optional string
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "assessmentId": "64eee...",
    "studentId": "64fff...",
    "schoolId": "64abc...",
    "mark": 42,
    "total": 50,
    "percentage": 84,
    "comment": "Well done",
    "isDeleted": false,
    "createdAt": "..."
  },
  "message": "Mark captured successfully"
}
```

---

#### POST /academic/marks/bulk-capture
Upsert marks for an entire class in one request. Uses `bulkWrite` internally.

**Auth:** super_admin, school_admin, teacher

**Request body:**
```json
{
  "assessmentId": "64eee...",
  "schoolId": "64abc...",
  "marks": [
    { "studentId": "64f01...", "mark": 42, "total": 50, "comment": "Good" },
    { "studentId": "64f02...", "mark": 38, "total": 50 },
    { "studentId": "64f03...", "mark": 45, "total": 50 }
  ]
}
```
`marks` array: min 1 entry. Each entry: `studentId` (ObjectId, required), `mark` (min 0), `total` (min 1), `comment` (optional).

**Response 201:**
```json
{
  "success": true,
  "data": [
    { "_id": "...", "studentId": { ... populated student ... }, "mark": 42, "percentage": 84, ... },
    ...
  ],
  "message": "Marks captured successfully"
}
```

---

#### GET /academic/marks/student/:studentId
All marks for a student, optionally filtered by `term` and `academicYear`. The `assessmentId` field is deep-populated with subject name/code and class name. Marks whose assessment does not match the filter are stripped from the result.

**Auth:** super_admin, school_admin, teacher

**Query params:** `term` (number), `academicYear` (number)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "mark": 42,
      "total": 50,
      "percentage": 84,
      "comment": "Well done",
      "assessmentId": {
        "_id": "...",
        "name": "Term 1 Math Test",
        "type": "test",
        "totalMarks": 50,
        "weight": 20,
        "term": 1,
        "academicYear": 2026,
        "subjectId": { "_id": "...", "name": "Mathematics", "code": "MATH" },
        "classId": { "_id": "...", "name": "7A" }
      }
    }
  ],
  "message": "Student marks retrieved successfully"
}
```

---

#### GET /academic/marks/assessment/:assessmentId
All marks for a given assessment. Useful for a teacher's mark-entry view showing the whole class.

**Auth:** super_admin, school_admin, teacher

**Response 200:** Array of mark documents; `studentId` is populated with the student profile, which itself is populated with `userId` (firstName, lastName, email).

---

### 2.7 LURITS Export

#### GET /academic/lurits-export
Export active student registration data as a CSV file. Response is `text/csv` with `Content-Disposition: attachment; filename=lurits-export.csv`. Values containing commas, quotes, or newlines are properly escaped.

**Auth:** super_admin, school_admin

**Query params:** `schoolId` (falls back to `req.user.schoolId`)

**CSV columns:**
```
admissionNumber, firstName, lastName, dateOfBirth, gender, grade, luritsNumber, saIdNumber, homeLanguage
```

**Example response (CSV):**
```
admissionNumber,firstName,lastName,dateOfBirth,gender,grade,luritsNumber,saIdNumber,homeLanguage
2024001,Thabo,Nkosi,2013-05-12,male,Grade 7,LUR0001,0305120123088,isiZulu
```

---

### 2.8 Exams

#### POST /academic/exams
Create a named exam period.

**Auth:** super_admin, school_admin

**Request body:**
```json
{
  "schoolId": "64abc...",
  "name": "Term 2 June Exams",
  "term": 2,                            // integer, 1–4
  "year": 2026,                         // integer, min 2000
  "startDate": "2026-06-02T00:00:00.000Z",
  "endDate": "2026-06-13T00:00:00.000Z",
  "status": "scheduled"                 // optional enum: scheduled|in_progress|completed
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "schoolId": "64abc...",
    "name": "Term 2 June Exams",
    "term": 2,
    "year": 2026,
    "startDate": "2026-06-02T00:00:00.000Z",
    "endDate": "2026-06-13T00:00:00.000Z",
    "status": "scheduled",
    "isDeleted": false,
    "createdAt": "..."
  },
  "message": "Exam created successfully"
}
```

---

#### GET /academic/exams
List exams for a school (paginated, searchable on `name`).

**Auth:** any authenticated user

**Query params:** `schoolId`, `page`, `limit`, `sort`, `search`

---

#### GET /academic/exams/:id
Single exam document.

**Auth:** any authenticated user

---

#### PUT /academic/exams/:id
Partial update (all fields optional).

**Auth:** super_admin, school_admin

---

#### DELETE /academic/exams/:id
Soft-delete.

**Auth:** super_admin, school_admin

---

### 2.9 Exam Timetable

#### POST /academic/exam-timetable
Create a slot within an exam (one subject sitting).

**Auth:** super_admin, school_admin

**Request body:**
```json
{
  "examId": "64ggg...",
  "subjectId": "64ccc...",
  "gradeId": "64def...",
  "date": "2026-06-03T09:00:00.000Z",
  "startTime": "09:00",              // HH:MM
  "endTime": "11:00",                // HH:MM
  "venue": "Hall A",
  "invigilator": "64hhh...",         // ObjectId (User ref)
  "duration": 120                    // integer minutes, positive
}
```

**Response 201:** Entry with `subjectId` (name, code), `gradeId` (name), `invigilator` (firstName, lastName, email) populated.

---

#### GET /academic/exam-timetable/exam/:examId
List all slots for an exam, sorted by `date` then `startTime`.

**Auth:** any authenticated user

**Query params:** `page`, `limit`

**Response 200:** Paginated list with populated references.

---

#### GET /academic/exam-timetable/:id
Single entry (populated).

**Auth:** any authenticated user

---

#### PUT /academic/exam-timetable/:id
Partial update. Returns populated entry.

**Auth:** super_admin, school_admin

---

#### DELETE /academic/exam-timetable/:id
Soft-delete.

**Auth:** super_admin, school_admin

---

### 2.10 Past Papers

#### POST /academic/past-papers
Upload a past paper record (the `fileUrl` is a pre-uploaded file URL; server stores the reference only). `uploadedBy` is set to `req.user.id` server-side and is not accepted in the body.

**Auth:** super_admin, school_admin, teacher

**Request body:**
```json
{
  "schoolId": "64abc...",
  "subjectId": "64ccc...",
  "gradeId": "64def...",
  "year": 2025,            // integer, min 2000
  "term": 2,               // integer, 1–4
  "fileUrl": "https://storage.example.com/papers/math-gr7-t2-2025.pdf"
}
```

**Response 201:** Past paper document.

---

#### GET /academic/past-papers
List past papers. Filter by `subjectId`, `gradeId`, `year`. Sorted by `-year -term`.

**Auth:** any authenticated user

**Query params:** `schoolId`, `subjectId`, `gradeId`, `year`, `page`, `limit`

**Response 200:** Paginated list with `subjectId` (name, code), `gradeId` (name), `uploadedBy` (firstName, lastName, email) populated.

---

#### DELETE /academic/past-papers/:id
Soft-delete.

**Auth:** super_admin, school_admin

---

### 2.11 Subject Weightings

Configure how much each assessment type contributes to the final term mark for a given subject/grade combination.

#### POST /academic/subject-weightings

**Auth:** super_admin, school_admin

**Request body:**
```json
{
  "subjectId": "64ccc...",
  "schoolId": "64abc...",
  "gradeId": "64def...",
  "assessmentType": "exam",    // enum: test|exam|assignment|practical|project
  "weightPercentage": 60,      // number, 0–100
  "term": 2                    // integer, 1–4
}
```

**Response 201:** Weighting document with `subjectId` (name, code) and `gradeId` (name) populated.

---

#### GET /academic/subject-weightings
List weightings. Note: returns a flat array (not paginated).

**Auth:** any authenticated user

**Query params:** `schoolId`, `subjectId`, `gradeId`, `term`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "subjectId": { "_id": "...", "name": "Mathematics", "code": "MATH" },
      "gradeId": { "_id": "...", "name": "Grade 7" },
      "assessmentType": "exam",
      "weightPercentage": 60,
      "term": 2
    }
  ],
  "message": "Subject weightings retrieved successfully"
}
```

---

#### PUT /academic/subject-weightings/:id
Partial update. Returns populated document.

**Auth:** super_admin, school_admin

---

#### DELETE /academic/subject-weightings/:id
Soft-delete.

**Auth:** super_admin, school_admin

---

### 2.12 Remedial Tracking

#### POST /academic/remedials
Create a remedial support record for a student in a subject.

**Auth:** super_admin, school_admin, teacher

**Request body:**
```json
{
  "studentId": "64fff...",
  "subjectId": "64ccc...",
  "schoolId": "64abc...",
  "identifiedDate": "2026-02-15T00:00:00.000Z",
  "areas": ["Number operations", "Fractions"],    // array of strings, min 1
  "interventions": ["Extra worksheets", "Peer tutoring"],  // optional
  "progress": ["Improved on fractions"],          // optional
  "status": "in_progress",   // optional enum: identified|in_progress|resolved, default "identified"
  "reviewDate": "2026-03-31T00:00:00.000Z"        // optional
}
```

**Response 201:** Remedial document with `studentId` and `subjectId` (name, code) populated.

---

#### GET /academic/remedials
List remedial records.

**Auth:** super_admin, school_admin, teacher

**Query params:** `schoolId`, `studentId`, `subjectId`, `status`, `page`, `limit`

**Response 200:** Paginated list sorted by `-identifiedDate`; `studentId` and `subjectId` populated.

---

#### GET /academic/remedials/:id
Single record (populated).

**Auth:** super_admin, school_admin, teacher

---

#### PUT /academic/remedials/:id
Partial update. Used to add progress notes, change status, or set a review date.

**Auth:** super_admin, school_admin, teacher

---

#### DELETE /academic/remedials/:id
Soft-delete.

**Auth:** super_admin, school_admin

---

### 2.13 Promotion

#### GET /academic/promotion/student/:studentId
Calculate whether a single student should be promoted. Promotion threshold: student must pass ≥ 50% of their subjects (pass = average percentage across all assessments in that subject ≥ 50%).

**Auth:** super_admin, school_admin, teacher

**Query params:** `year` (number, required)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "studentId": "64fff...",
    "year": 2026,
    "gradeId": "64def...",
    "totalSubjects": 8,
    "passedSubjects": 6,
    "failedSubjects": 2,
    "overallAverage": 67.5,
    "promoted": true,
    "subjects": [
      {
        "subjectId": "...",
        "subjectName": "Mathematics",
        "subjectCode": "MATH",
        "averagePercentage": 72.3,
        "assessmentCount": 4,
        "passed": true
      }
    ]
  },
  "message": "Promotion calculation completed"
}
```

**Error 400:** `year` query param missing. **Error 404:** student not found.

---

#### GET /academic/promotion/grade/:gradeId
Promotion report for all active students in a grade. Runs `calculatePromotion` per student.

**Auth:** super_admin, school_admin

**Query params:** `year` (number, required)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "gradeId": "64def...",
    "year": 2026,
    "totalStudents": 45,
    "promoted": 40,
    "notPromoted": 5,
    "promotionRate": 88.89,
    "students": [
      {
        "studentId": "...",
        "admissionNumber": "2024001",
        "firstName": "Thabo",
        "lastName": "Nkosi",
        "year": 2026,
        "gradeId": "...",
        "totalSubjects": 8,
        "passedSubjects": 7,
        "failedSubjects": 1,
        "overallAverage": 74.1,
        "promoted": true,
        "subjects": [ ... ]
      }
    ]
  },
  "message": "Promotion report generated"
}
```

---

## 3. Frontend Pages

### 3.1 Admin pages

#### `/admin/academics` — `src/app/(dashboard)/admin/academics/page.tsx`
Single page with two tabs:

- **Grades & Classes tab:** Lists all grades as cards. Each card expands to show its classes in a 3-column responsive grid. Each class mini-card shows name, enrolled count, and capacity badge.
- **Subjects tab:** Full-width `DataTable` with columns: Code, Subject Name, Teacher, Type (Compulsory/Elective badge).

Current state: uses `mockGrades`, `mockClasses`, `mockSubjects` — not yet wired to API.

Missing admin sub-pages that need to be built:
- `/admin/academics/grades` — manage grades (create, edit, reorder)
- `/admin/academics/classes` — manage classes (create, assign teacher, set capacity)
- `/admin/academics/subjects` — manage subjects (create, assign grades)
- `/admin/academics/timetable` — timetable builder
- `/admin/academics/assessments` — manage assessments per class/subject/term
- `/admin/academics/exams` — manage exam periods
- `/admin/academics/exam-timetable` — schedule exam slots
- `/admin/academics/past-papers` — upload/manage past papers
- `/admin/academics/weightings` — configure subject weightings
- `/admin/academics/remedials` — review/manage remedial records
- `/admin/academics/promotion` — view promotion reports by grade

### 3.2 Teacher pages

#### `/teacher/grades` — `src/app/(dashboard)/teacher/grades/page.tsx`
Gradebook for mark entry. Currently uses mock data.

UI: two selects (Class, Assessment) filter a mark-entry table. Each row has a student name, admission number, a numeric input, and a live-calculated percentage display. Save button posts marks (currently local state only — needs wiring to `POST /academic/marks/bulk-capture`).

#### `/teacher/classes` — `src/app/(dashboard)/teacher/classes/page.tsx`
Card grid of teacher's classes. Each card shows grade + class name, student count vs capacity, and a color-coded capacity bar (green → amber → red as fill increases). Clicking a card opens a Dialog with the full student list (avatar initials, name, admission number). Wired to `/academic/classes` and `/students` API endpoints.

#### Teacher timetable: `/teacher/[id]` or similar
No dedicated timetable page found in the teacher directory. The timetable API (`GET /academic/timetable/teacher/:teacherId`) exists and should power a teacher-specific weekly schedule page.

### 3.3 Student pages

#### `/student/grades` — `src/app/(dashboard)/student/grades/page.tsx`
Personal academic performance view. Fully wired to the live API.

On mount: finds own student record via `/students` (matching `userId`), then fetches marks via `/academic/marks/student/:studentId` and subjects via `/academic/subjects`. Groups marks by subject, calculates per-subject averages. Displays an overall average hero card and per-subject cards with progress bars and individual assessment breakdowns. Badge system: Distinction (≥80%), Merit (≥60%), Pass (≥50%), Below Average (<50%).

#### `/student/timetable` — `src/app/(dashboard)/student/timetable/page.tsx`
Weekly timetable grid. Currently uses mock data (`mockTimetable`, `mockSubjects`). Needs wiring to `/academic/timetable/class/:classId`.

Desktop: full HTML table (periods as rows, days as columns) with colour-coded subject cells.
Mobile: day-by-day card list showing period badge, subject name, room, and time range.

---

## 4. User Flows

### 4.1 Create a grade

1. Admin navigates to Academics → Grades & Classes.
2. Clicks "Add Grade" → modal with fields: Name, Order Index.
3. `schoolId` injected from auth context.
4. `POST /academic/grades` → on success, grade card appears in list.

### 4.2 Create a class within a grade

1. Admin clicks "Add Class" on a grade card.
2. Form fields: Name, Teacher (select from staff list), Capacity.
3. `gradeId` and `schoolId` pre-filled from context.
4. `POST /academic/classes` → class mini-card appears within the grade card.

### 4.3 Add a subject

1. Admin navigates to Academics → Subjects → "Add Subject".
2. Form: Name, Code, Grades (multi-select checkboxes from grade list).
3. `POST /academic/subjects` → subject appears in DataTable.

### 4.4 Create a timetable slot

1. Admin navigates to Timetable builder for a class.
2. Selects cell in grid (day × period).
3. Form: Subject, Teacher, Start Time, End Time, Room.
4. `POST /academic/timetable` → cell fills in.
5. Duplicate period for same class rejected by unique index — show validation error.

### 4.5 Create an assessment

1. Teacher (or admin) goes to Gradebook / Assessments.
2. Clicks "New Assessment" → form: Name, Subject, Class, Type, Total Marks, Weight, Term, Academic Year, Date.
3. `POST /academic/assessments` → assessment available in Gradebook selector.

### 4.6 Record assessment marks (single)

1. Teacher opens Gradebook → selects Class + Assessment.
2. Student list loads via `GET /academic/marks/assessment/:assessmentId` (pre-fills existing marks).
3. Teacher types mark in input next to each student; percentage auto-calculates in UI.
4. Clicks "Save Marks" → `POST /academic/marks/bulk-capture` with all entries.
5. Toast confirms success; percentage column updates.

### 4.7 Record a single mark

1. Via `POST /academic/marks` with one student's result.
2. If mark already exists for that `assessmentId + studentId` pair, it is overwritten (upsert).

### 4.8 View report card (student perspective)

1. Student opens Grades page.
2. App calls `/students` → resolves own `studentId`.
3. Calls `/academic/marks/student/:studentId` → returns all marks with populated assessments.
4. UI groups by subject → displays per-subject average and individual assessment breakdown.

### 4.9 Calculate promotion

1. Admin navigates to Promotion report → selects Grade and Year.
2. `GET /academic/promotion/grade/:gradeId?year=2026` returns per-student results.
3. Table shows each student: overall average, subjects passed/failed, promoted (yes/no).
4. Individual drill-down via `GET /academic/promotion/student/:studentId?year=2026`.

### 4.10 Schedule an exam

1. Admin creates exam period: `POST /academic/exams` (name, term, year, start/end date).
2. Admin opens exam → "Add Slot" → form per subject: Subject, Grade, Date, Start/End Time, Venue, Invigilator, Duration.
3. `POST /academic/exam-timetable` → slot added to exam schedule grid.

### 4.11 Upload a past paper

1. Teacher/admin uploads PDF to file storage externally, obtains `fileUrl`.
2. Submits form: Subject, Grade, Year, Term, File URL.
3. `POST /academic/past-papers` → paper appears in library, linked to the uploader.

### 4.12 Manage remedial tracking

1. Teacher identifies a struggling student in Gradebook.
2. Creates remedial record: `POST /academic/remedials` with struggling areas and planned interventions.
3. Periodically adds progress notes via `PUT /academic/remedials/:id`.
4. When resolved, updates status to `resolved`.

---

## 5. Data Models

### 5.1 Grade

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| name | string | Required, trimmed |
| schoolId | ObjectId → School | Required |
| orderIndex | number | Required, integer ≥ 0; used for display sort |
| isDeleted | boolean | Default false; soft-delete flag |
| createdAt | Date | Auto (timestamps) |
| updatedAt | Date | Auto (timestamps) |

**Index:** `{ schoolId, orderIndex }`

---

### 5.2 Class

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| name | string | Required, trimmed (e.g. "7A") |
| gradeId | ObjectId → Grade | Required |
| schoolId | ObjectId → School | Required |
| teacherId | ObjectId → User | Required; home/form teacher |
| capacity | number | Required, integer ≥ 1 |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Indexes:** `{ gradeId }`, `{ schoolId }`

Populate: `gradeId` (full Grade), `teacherId` (firstName, lastName, email)

---

### 5.3 Subject

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| name | string | Required, trimmed |
| code | string | Required, trimmed (e.g. "MATH") |
| schoolId | ObjectId → School | Required |
| gradeIds | ObjectId[] → Grade | Default `[]`; min 1 required on creation |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Indexes:** `{ schoolId }`, `{ code, schoolId }`

Populate: `gradeIds` (full Grade array)

---

### 5.4 Timetable

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| schoolId | ObjectId → School | Required |
| classId | ObjectId → Class | Required |
| day | string (enum) | Required; monday/tuesday/wednesday/thursday/friday |
| period | number | Required, integer ≥ 1 |
| startTime | string | Required; HH:MM format |
| endTime | string | Required; HH:MM format |
| subjectId | ObjectId → Subject | Required |
| teacherId | ObjectId → User | Required |
| room | string | Optional, trimmed |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Unique index:** `{ classId, day, period }` — prevents double-booking a class in one period.

---

### 5.5 Assessment

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| name | string | Required, trimmed |
| subjectId | ObjectId → Subject | Required |
| classId | ObjectId → Class | Required |
| schoolId | ObjectId → School | Required |
| type | string (enum) | Required; test/exam/assignment/practical/project |
| totalMarks | number | Required, ≥ 1 |
| weight | number | Required, 0–100 |
| term | number | Required, integer ≥ 1 |
| academicYear | number | Required, integer ≥ 2000 |
| date | Date | Required |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Index:** `{ classId, subjectId, term }`

---

### 5.6 Mark

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| assessmentId | ObjectId → Assessment | Required |
| studentId | ObjectId → Student | Required |
| schoolId | ObjectId → School | Required |
| mark | number | Required, ≥ 0 |
| total | number | Required, ≥ 1 |
| percentage | number | Required; computed server-side = round(mark/total * 10000) / 100 |
| comment | string | Optional, trimmed |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Unique index:** `{ assessmentId, studentId }` — one mark per student per assessment (upsert enforces this).

**Index:** `{ studentId }`

---

### 5.7 Exam

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| schoolId | ObjectId → School | Required |
| name | string | Required, trimmed |
| term | number | Required, integer 1–4 |
| year | number | Required, integer ≥ 2000 |
| startDate | Date | Required |
| endDate | Date | Required |
| status | string (enum) | Default "scheduled"; scheduled/in_progress/completed |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Index:** `{ schoolId, year, term }`

---

### 5.8 ExamTimetable

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| examId | ObjectId → Exam | Required |
| subjectId | ObjectId → Subject | Required |
| gradeId | ObjectId → Grade | Required |
| date | Date | Required |
| startTime | string | Required; HH:MM format |
| endTime | string | Required; HH:MM format |
| venue | string | Required |
| invigilator | ObjectId → User | Required |
| duration | number | Required, positive integer (minutes) |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Index:** `{ examId, subjectId, gradeId }`

---

### 5.9 PastPaper

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| schoolId | ObjectId → School | Required |
| subjectId | ObjectId → Subject | Required |
| gradeId | ObjectId → Grade | Required |
| year | number | Required, integer ≥ 2000 |
| term | number | Required, integer 1–4 |
| fileUrl | string | Required |
| uploadedBy | ObjectId → User | Set server-side from `req.user.id` |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Index:** `{ schoolId, subjectId, gradeId }`

---

### 5.10 SubjectWeighting

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| subjectId | ObjectId → Subject | Required |
| schoolId | ObjectId → School | Required |
| gradeId | ObjectId → Grade | Required |
| assessmentType | string (enum) | Required; test/exam/assignment/practical/project |
| weightPercentage | number | Required, 0–100 |
| term | number | Required, integer 1–4 |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Index:** `{ subjectId, schoolId, gradeId, term }`

---

### 5.11 RemedialTracking

| Field | Type | Constraints |
|---|---|---|
| _id | ObjectId | Auto |
| studentId | ObjectId → Student | Required |
| subjectId | ObjectId → Subject | Required |
| schoolId | ObjectId → School | Required |
| identifiedDate | Date | Required |
| areas | string[] | Default `[]`; min 1 on creation |
| interventions | string[] | Default `[]`; optional on creation |
| progress | string[] | Default `[]`; optional on creation |
| status | string (enum) | Default "identified"; identified/in_progress/resolved |
| reviewDate | Date | Optional |
| isDeleted | boolean | Default false |
| createdAt | Date | Auto |
| updatedAt | Date | Auto |

**Indexes:** `{ studentId, subjectId }`, `{ schoolId, status }`

---

## 6. State Management

The following Zustand stores are needed for the Academic module.

### 6.1 `useGradeStore`
```ts
interface GradeStore {
  grades: Grade[];
  loading: boolean;
  error: string | null;
  fetchGrades: (schoolId?: string) => Promise<void>;
  createGrade: (data: GradeInput) => Promise<void>;
  updateGrade: (id: string, data: Partial<GradeInput>) => Promise<void>;
  deleteGrade: (id: string) => Promise<void>;
}
```

### 6.2 `useClassStore`
```ts
interface ClassStore {
  classes: SchoolClass[];
  loading: boolean;
  error: string | null;
  fetchClasses: (filters?: { gradeId?: string }) => Promise<void>;
  createClass: (data: ClassInput) => Promise<void>;
  updateClass: (id: string, data: Partial<ClassInput>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
}
```

### 6.3 `useSubjectStore`
```ts
interface SubjectStore {
  subjects: Subject[];
  loading: boolean;
  fetchSubjects: (schoolId?: string) => Promise<void>;
  createSubject: (data: SubjectInput) => Promise<void>;
  updateSubject: (id: string, data: Partial<SubjectInput>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
}
```

### 6.4 `useTimetableStore`
```ts
interface TimetableStore {
  entries: TimetableEntry[];
  loading: boolean;
  fetchByClass: (classId: string) => Promise<void>;
  fetchByTeacher: (teacherId: string) => Promise<void>;
  createEntry: (data: TimetableInput) => Promise<void>;
  updateEntry: (id: string, data: Partial<TimetableInput>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}
```

### 6.5 `useAssessmentStore`
```ts
interface AssessmentStore {
  assessments: Assessment[];
  loading: boolean;
  fetchAssessments: (filters: AssessmentFilters) => Promise<void>;
  createAssessment: (data: AssessmentInput) => Promise<void>;
  updateAssessment: (id: string, data: Partial<AssessmentInput>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
}
```

### 6.6 `useMarkStore`
```ts
interface MarkStore {
  marks: Mark[];
  assessmentMarks: Mark[];   // marks for current open assessment (gradebook view)
  loading: boolean;
  fetchStudentMarks: (studentId: string, filters?: { term?: number; academicYear?: number }) => Promise<void>;
  fetchAssessmentMarks: (assessmentId: string) => Promise<void>;
  captureMark: (data: MarkInput) => Promise<void>;
  bulkCapture: (data: BulkMarkInput) => Promise<void>;
}
```

### 6.7 `useExamStore`
```ts
interface ExamStore {
  exams: Exam[];
  currentExam: Exam | null;
  timetableEntries: ExamTimetableEntry[];
  loading: boolean;
  fetchExams: () => Promise<void>;
  createExam: (data: ExamInput) => Promise<void>;
  updateExam: (id: string, data: Partial<ExamInput>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  fetchExamTimetable: (examId: string) => Promise<void>;
  createExamTimetableEntry: (data: ExamTimetableInput) => Promise<void>;
  updateExamTimetableEntry: (id: string, data: Partial<ExamTimetableInput>) => Promise<void>;
  deleteExamTimetableEntry: (id: string) => Promise<void>;
}
```

### 6.8 `usePastPaperStore`
```ts
interface PastPaperStore {
  papers: PastPaper[];
  loading: boolean;
  fetchPapers: (filters?: { subjectId?: string; gradeId?: string; year?: number }) => Promise<void>;
  uploadPaper: (data: PastPaperInput) => Promise<void>;
  deletePaper: (id: string) => Promise<void>;
}
```

### 6.9 `useRemedialStore`
```ts
interface RemedialStore {
  records: RemedialRecord[];
  loading: boolean;
  fetchRemedials: (filters?: { studentId?: string; subjectId?: string; status?: string }) => Promise<void>;
  createRemedial: (data: RemedialInput) => Promise<void>;
  updateRemedial: (id: string, data: Partial<RemedialInput>) => Promise<void>;
  deleteRemedial: (id: string) => Promise<void>;
}
```

### 6.10 `usePromotionStore`
```ts
interface PromotionStore {
  studentResult: PromotionResult | null;
  gradeReport: GradePromotionReport | null;
  loading: boolean;
  calculateStudentPromotion: (studentId: string, year: number) => Promise<void>;
  fetchGradeReport: (gradeId: string, year: number) => Promise<void>;
}
```

---

## 7. Components Needed

### 7.1 Shared / Atomic

| Component | Purpose |
|---|---|
| `GradeTag` | Small badge displaying a percentage with colour (emerald ≥80, blue ≥60, amber ≥50, red <50) |
| `PromotionBadge` | "Promoted" / "Not Promoted" badge with icon |
| `AssessmentTypeBadge` | Colour-coded badge for test/exam/assignment/practical/project |
| `ExamStatusBadge` | Badge for scheduled/in_progress/completed |
| `RemedialStatusBadge` | Badge for identified/in_progress/resolved |

### 7.2 Grade & Class management

| Component | Purpose |
|---|---|
| `GradeCard` | Collapsible card showing grade name + ordered class mini-cards; includes "Add Class" button |
| `ClassMiniCard` | Shows class name, enrolled/capacity counter, capacity progress bar |
| `GradeFormModal` | Create/edit grade (name, orderIndex) |
| `ClassFormModal` | Create/edit class (name, teacher select, capacity) |
| `GradeList` | Ordered list of `GradeCard` components for admin academics page |

### 7.3 Subject management

| Component | Purpose |
|---|---|
| `SubjectList` | `DataTable` variant with columns: Code, Name, Grades (tag list), actions |
| `SubjectFormModal` | Create/edit subject (name, code, multi-select grade checkboxes) |

### 7.4 Timetable

| Component | Purpose |
|---|---|
| `TimetableGrid` | 5-column × N-row HTML table (days × periods); cell = subject chip or empty dashed cell |
| `TimetableCell` | Colour-coded chip showing subject name, room, time; click to edit |
| `TimetableSlotModal` | Create/edit a slot (subject, teacher, period, start/end time, room) |
| `TimetableMobileList` | Day-by-day card list for screens below `lg` breakpoint |

### 7.5 Assessment management

| Component | Purpose |
|---|---|
| `AssessmentTable` | List of assessments with columns: Name, Subject, Type, Total Marks, Weight, Term, Date |
| `AssessmentFormModal` | Create/edit an assessment |
| `AssessmentFilters` | Class + Subject + Term + Year filter bar |

### 7.6 Gradebook / Mark entry

| Component | Purpose |
|---|---|
| `GradebookTable` | Table of students with inline number inputs for mark entry and live % display |
| `MarkInput` | Controlled numeric input (0 to totalMarks); validates on blur |
| `MarkPercentageCell` | Coloured text showing live percentage for a given mark/total pair |
| `GradebookControls` | Class and Assessment selector dropdowns at top of gradebook |

### 7.7 Student grades view

| Component | Purpose |
|---|---|
| `OverallAverageCard` | Hero card showing overall average % with colour |
| `SubjectGradeCard` | Card per subject: badge (Distinction/Merit/Pass/Below Average), average, progress bar, assessment list |
| `AssessmentResultRow` | Single row: assessment name, type, mark/total, percentage, trend icon |

### 7.8 Exam management

| Component | Purpose |
|---|---|
| `ExamCard` | Card showing exam name, term, year, date range, status badge; click to view slots |
| `ExamFormModal` | Create/edit exam |
| `ExamTimetableTable` | Table of slots: Date, Subject, Grade, Start–End, Venue, Invigilator, Duration |
| `ExamSlotModal` | Create/edit an exam timetable slot |

### 7.9 Past papers

| Component | Purpose |
|---|---|
| `PastPaperLibrary` | Filterable list (subject, grade, year) of past paper records with download links |
| `PastPaperCard` | Shows subject, grade, year/term, uploaded by, download button |
| `PastPaperUploadModal` | Form to link a pre-uploaded file URL to a subject/grade/year/term |

### 7.10 Subject weightings

| Component | Purpose |
|---|---|
| `WeightingMatrix` | Grid view: rows = assessment types, columns = terms; editable percentage cells |
| `WeightingFormModal` | Create/edit a single weighting row |

### 7.11 Remedial tracking

| Component | Purpose |
|---|---|
| `RemedialTable` | List of remedial records: Student, Subject, Date, Status, Areas count |
| `RemedialDetailDrawer` | Side drawer showing full record: areas, interventions, progress notes, review date |
| `RemedialFormModal` | Create/edit remedial record with dynamic string-array inputs for areas/interventions/progress |

### 7.12 Promotion

| Component | Purpose |
|---|---|
| `PromotionReportTable` | Per-student table: Name, Admission No., Average, Passed/Failed subjects, Promoted badge |
| `PromotionSubjectBreakdown` | Expandable row showing per-subject averages for one student |
| `PromotionSummaryBar` | Summary card: total students, promoted count, promotion rate % |

---

## 8. Integration Notes

### 8.1 Academic ↔ Student

- `Mark.studentId` references the `Student` collection. To display a student's grades the app first resolves their `studentId` from the `User` record via `GET /students`.
- The promotion engine (`AcademicService.calculatePromotion`) loads the student's current grade from the `Student` model to determine which subjects to evaluate.
- The LURITS export queries the `Student` collection directly for `enrollmentStatus: 'active'` records.
- Student portal grades page (`/student/grades`) does a two-step fetch: students list → own studentId → marks by studentId.

### 8.2 Academic ↔ Staff / Teacher (User)

- `Class.teacherId` → `User` (home teacher assignment). Populated as `{ firstName, lastName, email }`.
- `Timetable.teacherId` → `User` (subject teacher per slot). The teacher timetable endpoint (`GET /academic/timetable/teacher/:teacherId`) lets a teacher fetch all their own periods across classes.
- `ExamTimetable.invigilator` → `User`. Admin must select a staff member when scheduling exam slots.
- `PastPaper.uploadedBy` → `User`. Set server-side; no front-end input required.

### 8.3 Academic ↔ Attendance

- Attendance records reference `classId`; the Class model is the shared linking entity. When attendance is being taken, the class roster is pulled from `GET /students?classId=...`.
- Timetable data provides the period schedule that the Attendance module uses to determine what lesson is in progress at a given time. A future integration could auto-populate period/subject from the timetable when logging attendance.

### 8.4 Academic ↔ Homework

- Homework is assigned per class + subject, matching the `Assessment` model's `classId + subjectId` pairing. Homework due dates align with the timetable schedule.
- The teacher homework page (`/teacher/homework`) shares the class list fetched by `/academic/classes` and the subject list fetched by `/academic/subjects`.

### 8.5 Academic ↔ Admin Dashboard

- The admin dashboard (`/admin/page.tsx`) will display summary stats (total grades, total classes, total subjects, upcoming assessments). These are derived from the academic endpoints.

### 8.6 Subject Weightings ↔ Mark Calculation

- Subject weightings define the percentage contribution of each assessment type (test, exam, etc.) per subject/grade/term. Currently the backend stores the weights but the weighted final mark calculation is not yet implemented in the service. Promotion currently uses simple average percentage across all assessments. When weighted marks are introduced, `calculatePromotion` will need to apply the weighting config from `SubjectWeighting`.

### 8.7 Remedials ↔ Marks

- Remedial records are typically created when a student's mark percentage falls below the pass threshold (< 50%). The front-end gradebook should surface a "Flag for Remedial Support" action for students who fail, linking to the remedial creation form with `studentId` and `subjectId` pre-filled.

### 8.8 API prefix convention

All academic endpoints are prefixed `/academic/` (e.g. `GET /academic/grades`). The frontend `apiClient` base URL should already point to the API root, so calls are `apiClient.get('/academic/grades')`.

---

## 9. Acceptance Criteria

### 9.1 Grade management
- [ ] Admin can create a grade with a name and order index
- [ ] Grades are listed ordered by `orderIndex` ascending
- [ ] Admin can rename a grade and change its order
- [ ] Soft-deleted grades no longer appear in any list
- [ ] Creating a grade without `schoolId` returns a 400 error

### 9.2 Class management
- [ ] Admin can create a class under a grade with a home teacher and capacity
- [ ] Class list is filterable by `gradeId`
- [ ] Class card shows enrolled student count against capacity
- [ ] Soft-deleted classes no longer appear
- [ ] Teacher sees only classes they are assigned to (by `teacherId`)

### 9.3 Subject management
- [ ] Admin can create a subject with a unique code per school
- [ ] Subject can be linked to multiple grades via `gradeIds`
- [ ] Subject list is searchable by name and code
- [ ] Soft-deleted subjects do not appear

### 9.4 Timetable
- [ ] A timetable slot can be created for a class/day/period combination
- [ ] Attempting to create a duplicate slot for the same `classId + day + period` returns a database error (unique index violation)
- [ ] Teacher can view their own timetable sorted day → period
- [ ] Student can view their class timetable (desktop grid + mobile list)
- [ ] Slot deletion removes it from the grid without page reload

### 9.5 Assessments
- [ ] Teacher can create an assessment for their class/subject/term
- [ ] Assessments are filterable by `classId`, `subjectId`, `term`, and `academicYear`
- [ ] Assessment `weight` must be between 0 and 100
- [ ] Assessment `totalMarks` must be at least 1

### 9.6 Marks
- [ ] Teacher can enter a mark for an individual student via single capture
- [ ] Teacher can submit marks for an entire class via bulk capture in one request
- [ ] Re-submitting a mark for the same `assessmentId + studentId` overwrites (does not duplicate)
- [ ] `percentage` is always server-calculated; client-side percentage display is for preview only
- [ ] Student can view their own marks, grouped by subject, with per-subject averages
- [ ] `GET /academic/marks/student/:studentId` respects `term` and `academicYear` filters

### 9.7 LURITS export
- [ ] Exporting produces a valid CSV file download
- [ ] CSV includes only active (`enrollmentStatus: 'active'`) students
- [ ] Values containing commas are quoted in the CSV output

### 9.8 Exams
- [ ] Admin can create an exam with term, year, and date range
- [ ] Exam status transitions: scheduled → in_progress → completed
- [ ] Exam list is paginated and searchable by name

### 9.9 Exam timetable
- [ ] Admin can add a subject slot to an exam (venue, invigilator, duration)
- [ ] Exam timetable is listed sorted by date then start time
- [ ] Duration is a positive integer (minutes)

### 9.10 Past papers
- [ ] Admin/teacher can link a past paper (fileUrl) to a subject/grade/year/term
- [ ] `uploadedBy` is set server-side; client cannot override it
- [ ] Papers are filterable by subject, grade, and year
- [ ] List is sorted newest year/term first

### 9.11 Subject weightings
- [ ] Admin can set weighting percentages per assessment type per subject/grade/term
- [ ] `weightPercentage` must be between 0 and 100
- [ ] List endpoint returns a flat array (no pagination)

### 9.12 Remedial tracking
- [ ] Teacher can create a remedial record with at least one area of concern
- [ ] Record status defaults to `identified`
- [ ] Status can be updated to `in_progress` and then `resolved`
- [ ] Records are filterable by student, subject, and status
- [ ] Only admin/school_admin can hard-delete a remedial record

### 9.13 Promotion
- [ ] Promotion calculation requires `year` query param; returns 400 if missing
- [ ] Student is marked `promoted: true` when they pass ≥ 50% of their subjects
- [ ] Pass threshold per subject is average percentage ≥ 50 across all assessments
- [ ] Grade promotion report includes `promotionRate` as a percentage
- [ ] Non-existent student returns 404

### 9.14 Frontend wiring
- [ ] Admin academics page tabs (Grades & Classes, Subjects) load data from live API, not mock data
- [ ] Teacher gradebook Save button calls `POST /academic/marks/bulk-capture`
- [ ] Teacher gradebook pre-loads existing marks via `GET /academic/marks/assessment/:assessmentId`
- [ ] Student timetable page uses `GET /academic/timetable/class/:classId` instead of mock data
- [ ] Student grades page handles empty state (no assessments yet) gracefully
- [ ] All forms show field-level validation errors from Zod (400 responses)
- [ ] All list pages handle loading and error states
