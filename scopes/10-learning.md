# 10 — Learning Module

## 1. Module Overview

The Learning module is Campusly's digital classroom infrastructure. It covers four distinct capabilities that work together to support the full assessment lifecycle:

- **Study Materials** — teachers upload notes, videos, links, documents, and past papers, organised by subject, grade, term, and curriculum topic. Students and parents browse and download resources.
- **Quizzes** — teachers build MCQ, true/false, or mixed quizzes. The backend auto-grades every attempt on submission and enforces per-student attempt limits. Results are aggregated into per-quiz analytics.
- **Rubrics** — teachers define reusable assessment rubrics with named criteria, each carrying multiple achievement levels with point values. Rubrics are attached to assignment grading.
- **Assignment Submissions (Enhanced)** — extends the core Homework module. Students can save drafts and make final submissions with file URLs. Teachers grade with rubric scores and narrative feedback (including optional audio). Peer review, revision requests, and revision history are supported. Progress tracking records each student's mastery percentage, completion rate, average mark, and performance trend per subject per term.

**Roles and access:**

| Capability | student | teacher | school_admin | super_admin |
|---|---|---|---|---|
| View study materials | read | CRUD | CRUD | CRUD |
| View quizzes | read | CRUD + publish | CRUD + publish | CRUD + publish |
| Submit quiz attempt | write | — | — | — |
| View quiz results | — | read | read | read |
| Manage rubrics | — | CRUD | CRUD | CRUD |
| Submit assignment draft/final | write | — | — | — |
| Grade submission | — | write | write | write |
| Submit peer review | write | — | — | — |
| View student progress | read (own) | read | read | read |
| Calculate mastery | — | write | write | write |
| Flag struggling students | — | read | read | read |

All endpoints require a valid JWT (`Bearer` token). The token is read from `localStorage.accessToken` by the frontend `apiClient`.

---

## 2. Backend API Endpoints

Base path: all routes are mounted under `/learning` (e.g. `POST /learning/quizzes`).

---

### 2.1 Quizzes

#### `POST /learning/quizzes`

Create a new quiz. The `teacherId` is injected from the authenticated user — it must not be sent in the body.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Request body:**

```json
{
  "schoolId":         "string (ObjectId, required)",
  "subjectId":        "string (ObjectId, required)",
  "classId":          "string (ObjectId, required)",
  "title":            "string (min 1, trimmed, required)",
  "description":      "string (trimmed, optional)",
  "type":             "'mcq' | 'true_false' | 'mixed'  (required)",
  "questions": [
    {
      "questionText":  "string (min 1, required)",
      "questionType":  "'mcq' | 'true_false' | 'short_answer' | 'matching'",
      "options": [
        { "text": "string", "isCorrect": "boolean" }
      ],
      "correctAnswer": "string (min 1, required)",
      "points":        "number (min 1, required)",
      "explanation":   "string (optional)"
    }
  ],
  "totalPoints":      "number (min 1, required)",
  "timeLimit":        "number in minutes (min 1, optional)",
  "attempts":         "number (min 1, default 1, optional)",
  "shuffleQuestions": "boolean (default false, optional)",
  "dueDate":          "ISO 8601 datetime string (optional)"
}
```

**Validation rules:** `questions` array must contain at least 1 item. Each question's `points` ≥ 1. `type` enum is `['mcq', 'true_false', 'mixed']`. `questionType` enum is `['mcq', 'true_false', 'short_answer', 'matching']`.

**Response (201):**

```json
{
  "success": true,
  "message": "Quiz created successfully",
  "data": {
    "_id": "64f...",
    "schoolId": "64a...",
    "teacherId": "64b...",
    "subjectId": { "_id": "64c...", "name": "Mathematics", "code": "MATH" },
    "classId":   { "_id": "64d...", "name": "Grade 10A" },
    "title": "Algebra Basics Quiz",
    "description": "...",
    "type": "mcq",
    "questions": [...],
    "totalPoints": 30,
    "timeLimit": 20,
    "attempts": 1,
    "shuffleQuestions": false,
    "dueDate": "2026-04-15T00:00:00.000Z",
    "status": "draft",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  }
}
```

---

#### `GET /learning/quizzes`

List quizzes with pagination and optional filters.

**Auth:** Required. All roles.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: from `PAGINATION_DEFAULTS` |
| `sort` | string | MongoDB sort string, default `-createdAt` |
| `search` | string | Matches `title` or `description` (case-insensitive) |
| `schoolId` | ObjectId | Falls back to `req.user.schoolId` if omitted |
| `classId` | ObjectId | Optional |
| `subjectId` | ObjectId | Optional |
| `status` | string | `draft \| published \| closed` |

**Response (200):**

```json
{
  "success": true,
  "message": "Quizzes retrieved successfully",
  "data": {
    "data": [ ...quiz objects with populated subjectId, classId, teacherId... ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

#### `GET /learning/quizzes/:id`

Fetch a single quiz by ID. Populates `subjectId` (name, code), `classId` (name), `teacherId` (firstName, lastName, email).

**Auth:** Required. All roles.

**Response (200):** Same shape as create response `data` object.

**Errors:** `404 Not Found` if quiz does not exist or `isDeleted: true`.

---

#### `PUT /learning/quizzes/:id`

Full or partial update of a quiz. Uses the same schema as `createQuizSchema` but with `.partial()` — all fields optional.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Response (200):** Updated quiz object.

---

#### `PATCH /learning/quizzes/:id/publish`

Transition a quiz's status.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Request body:**

```json
{ "status": "published" }
```

`status` must be `'published'` or `'closed'`.

**Response (200):**

```json
{
  "success": true,
  "message": "Quiz published successfully",
  "data": { ...quiz object... }
}
```

---

#### `DELETE /learning/quizzes/:id`

Soft-delete (sets `isDeleted: true`).

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Response (200):**

```json
{ "success": true, "message": "Quiz deleted successfully", "data": null }
```

---

#### `POST /learning/quizzes/:id/attempt`

Submit a quiz attempt. The backend auto-grades MCQ and true/false answers by matching `selectedOption` against `options[n].isCorrect`. Short-answer questions are graded by case-insensitive string match against `correctAnswer`. Enforces `quiz.attempts` limit per student.

**Auth:** Required. Role: `student` only.

**Request body:**

```json
{
  "answers": [
    {
      "questionIndex":  0,
      "selectedOption": 2,
      "textAnswer":     "optional, for short_answer questions"
    }
  ],
  "startedAt": "2026-03-31T09:00:00.000Z"
}
```

`answers` array must contain at least 1 item. `questionIndex` ≥ 0.

**Response (201):**

```json
{
  "success": true,
  "message": "Quiz attempt submitted and graded",
  "data": {
    "_id": "...",
    "quizId": "...",
    "studentId": "...",
    "answers": [
      {
        "questionIndex": 0,
        "selectedOption": 2,
        "isCorrect": true,
        "pointsEarned": 2
      }
    ],
    "totalScore": 24,
    "percentage": 80,
    "startedAt": "2026-03-31T09:00:00.000Z",
    "completedAt": "2026-03-31T09:18:00.000Z",
    "attempt": 1
  }
}
```

**Errors:** `404` if quiz not found or not `published`. `400` if attempt limit reached.

---

#### `GET /learning/quizzes/:id/results`

Retrieve all attempts for a quiz plus aggregate statistics.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Response (200):**

```json
{
  "success": true,
  "message": "Quiz results retrieved",
  "data": {
    "attempts": [ ...QuizAttempt objects with populated studentId... ],
    "averageScore": 73,
    "submissionCount": 28
  }
}
```

---

### 2.2 Study Materials

#### `POST /learning/materials`

Upload a study material record. File hosting is external — the backend stores the URL only.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Request body:**

```json
{
  "schoolId":      "string (ObjectId, required)",
  "subjectId":     "string (ObjectId, required)",
  "gradeId":       "string (ObjectId, required)",
  "term":          "number (1–4, required)",
  "topic":         "string (min 1, trimmed, required)",
  "type":          "'notes' | 'video' | 'link' | 'document' | 'past_paper'  (required)",
  "title":         "string (min 1, trimmed, required)",
  "description":   "string (trimmed, optional)",
  "fileUrl":       "string (optional)",
  "videoUrl":      "string (optional)",
  "externalLink":  "string (optional)",
  "tags":          "string[] (default [], optional)",
  "curriculum": {
    "subject":     "string (min 1, trimmed, required)",
    "grade":       "string (min 1, trimmed, required)",
    "term":        "string (min 1, trimmed, required)",
    "topic":       "string (min 1, trimmed, required)"
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Study material uploaded successfully",
  "data": {
    "_id": "...",
    "schoolId": "...",
    "teacherId": "...",
    "subjectId": { "_id": "...", "name": "Mathematics", "code": "MATH" },
    "gradeId":   { "_id": "...", "name": "Grade 10" },
    "term": 2,
    "topic": "Quadratic Equations",
    "type": "notes",
    "title": "Chapter 5 — Quadratic Equations",
    "description": "...",
    "fileUrl": "https://storage.example.com/ch5.pdf",
    "tags": ["algebra", "equations"],
    "curriculum": {
      "subject": "Mathematics",
      "grade": "Grade 10",
      "term": "Term 2",
      "topic": "Quadratic Equations"
    },
    "downloads": 0,
    "createdAt": "2026-03-31T08:00:00.000Z"
  }
}
```

---

#### `GET /learning/materials`

List study materials with filters.

**Auth:** Required. All roles.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: pagination default |
| `sort` | string | Default: `-createdAt` |
| `search` | string | Matches `title`, `description`, or `tags` |
| `schoolId` | ObjectId | Falls back to `req.user.schoolId` |
| `subjectId` | ObjectId | Optional |
| `gradeId` | ObjectId | Optional |
| `term` | number | Optional (1–4) |
| `topic` | string | Case-insensitive regex match |
| `type` | string | `notes \| video \| link \| document \| past_paper` |

**Response (200):** Paginated result matching quiz list shape. Items populated with `subjectId`, `gradeId`, `teacherId`.

---

#### `GET /learning/materials/:id`

Fetch single study material. Same population as list.

**Auth:** Required. All roles.

---

#### `PUT /learning/materials/:id`

Update a study material (partial update, all fields optional).

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

---

#### `DELETE /learning/materials/:id`

Soft-delete.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

---

#### `POST /learning/materials/:id/download`

Increments the `downloads` counter by 1. Call this whenever a student/teacher accesses the file URL.

**Auth:** Required. All roles.

**Response (200):**

```json
{
  "success": true,
  "message": "Download recorded",
  "data": { ...updated material object... }
}
```

---

### 2.3 Rubrics

#### `POST /learning/rubrics`

Create a rubric. `teacherId` is injected server-side.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Request body:**

```json
{
  "schoolId":    "string (ObjectId, required)",
  "name":        "string (min 1, trimmed, required)",
  "subjectId":   "string (ObjectId, optional)",
  "criteria": [
    {
      "name":        "string (min 1, required)",
      "description": "string (min 1, required)",
      "levels": [
        {
          "label":       "string (min 1, required)",
          "description": "string (min 1, required)",
          "points":      "number (min 0, required)"
        }
      ]
    }
  ],
  "totalPoints": "number (min 1, required)",
  "reusable":    "boolean (default true, optional)"
}
```

`criteria` must contain at least 1 item. Each criterion's `levels` must contain at least 1 item.

**Response (201):**

```json
{
  "success": true,
  "message": "Rubric created successfully",
  "data": {
    "_id": "...",
    "schoolId": "...",
    "teacherId": "...",
    "name": "Essay Writing Rubric",
    "subjectId": { "_id": "...", "name": "English", "code": "ENG" },
    "criteria": [
      {
        "name": "Structure",
        "description": "Organisation and flow of the essay",
        "levels": [
          { "label": "Excellent", "description": "Clear, logical structure", "points": 4 },
          { "label": "Good",      "description": "Mostly logical",          "points": 3 },
          { "label": "Fair",      "description": "Some structure present",  "points": 2 },
          { "label": "Poor",      "description": "Lacks structure",         "points": 1 }
        ]
      }
    ],
    "totalPoints": 20,
    "reusable": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z"
  }
}
```

---

#### `GET /learning/rubrics`

List rubrics.

**Auth:** Required. All roles.

**Query params:** `page`, `limit`, `sort`, `schoolId` (falls back to user's school), `subjectId`, `teacherId`.

**Response (200):** Paginated result. Items populated with `subjectId` (name, code), `teacherId` (firstName, lastName, email).

---

#### `GET /learning/rubrics/:id`

Fetch single rubric. Same population as list.

**Auth:** Required. All roles.

---

#### `PUT /learning/rubrics/:id`

Partial update. Same schema as create, all fields optional.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

---

#### `DELETE /learning/rubrics/:id`

Soft-delete.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

---

### 2.4 Assignment Submissions

These endpoints extend the Homework module. The `:homeworkId` param references a document in the `Homework` collection.

#### `POST /learning/assignments/:homeworkId/draft`

Save or update a draft submission (upsert — one submission record per student per homework). Sets `isDraft: true`, `draftSavedAt`.

**Auth:** Required. Role: `student`.

**Request body:**

```json
{ "files": ["https://storage.example.com/draft-essay.pdf"] }
```

`files` must contain at least 1 string.

**Response (201):**

```json
{
  "success": true,
  "message": "Draft saved",
  "data": {
    "_id": "...",
    "homeworkId": "...",
    "studentId": "...",
    "schoolId": "...",
    "files": ["https://..."],
    "isDraft": true,
    "draftSavedAt": "2026-03-31T10:00:00.000Z",
    "submittedAt": "2026-03-31T10:00:00.000Z",
    "isLate": false,
    "peerReviewEnabled": false,
    "peerReviews": [],
    "revisionHistory": []
  }
}
```

---

#### `POST /learning/assignments/:homeworkId/submit`

Final submission. Sets `isDraft: false`, pushes a new entry to `revisionHistory` (tracks file URL, timestamp, and incrementing version number). Upserts.

**Auth:** Required. Role: `student`.

**Request body:**

```json
{ "files": ["https://storage.example.com/final-essay.pdf"] }
```

**Response (201):**

```json
{
  "success": true,
  "message": "Assignment submitted",
  "data": {
    "_id": "...",
    "isDraft": false,
    "submittedAt": "2026-03-31T11:00:00.000Z",
    "revisionHistory": [
      { "fileUrl": "https://...", "submittedAt": "...", "version": 1 }
    ],
    ...
  }
}
```

---

#### `GET /learning/assignments/:homeworkId/submissions`

List all submissions for a homework assignment (teacher/admin view).

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Query params:** `page`, `limit`, `sort`.

**Response (200):** Paginated result. Items populated with `studentId` (userId), `gradedBy` (firstName, lastName, email).

---

#### `GET /learning/assignments/:homeworkId/analytics`

Aggregated statistics for an assignment.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Response (200):**

```json
{
  "success": true,
  "message": "Assignment analytics retrieved",
  "data": {
    "totalSubmissions": 30,
    "submissionRate": 30,
    "lateRate": 13,
    "averageMark": 67.5,
    "scoreDistribution": [
      { "range": "0-20",   "count": 1 },
      { "range": "21-40",  "count": 3 },
      { "range": "41-60",  "count": 8 },
      { "range": "61-80",  "count": 12 },
      { "range": "81-100", "count": 6 }
    ]
  }
}
```

Note: `submissionRate` returns an absolute count (not a percentage) because the service does not have access to class enrolment size. The frontend should compute the rate by comparing against class size from the Academic module.

---

#### `POST /learning/assignments/:homeworkId/peer-review`

Enable peer review for all existing submissions of a homework. Updates all matching `AssignmentSubmission` documents to `peerReviewEnabled: true`.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Request body:** None.

**Response (200):**

```json
{ "success": true, "message": "Peer review enabled", "data": null }
```

**Errors:** `404` if no submissions found for the homework.

---

#### `POST /learning/submissions/:id/grade`

Grade a specific submission. Attaches rubric scores, narrative comments, optional audio URL, and an explicit numeric mark. Sets `gradedBy` and `gradedAt`.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Request body:**

```json
{
  "comments":         "string (min 1, required)",
  "rubricScores": [
    {
      "criterionId": "Structure",
      "level":       "Excellent",
      "points":      4
    }
  ],
  "audioFeedbackUrl": "string (optional)",
  "mark":             "number (min 0, optional)"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Submission graded",
  "data": {
    ...submission fields...,
    "mark": 78,
    "gradedAt": "2026-03-31T14:00:00.000Z",
    "gradedBy": "64b...",
    "teacherFeedback": {
      "comments": "Well structured argument. Work on your conclusion.",
      "rubricScores": [
        { "criterionId": "Structure", "level": "Excellent", "points": 4 }
      ],
      "audioFeedbackUrl": "https://storage.example.com/feedback-audio.mp3"
    }
  }
}
```

---

#### `POST /learning/submissions/:id/peer-review`

Student submits a peer review on another student's submission. Guards: cannot review own submission; cannot submit more than one review per submission.

**Auth:** Required. Role: `student`.

**Request body:**

```json
{
  "rating":   "number (1–5, required)",
  "comments": "string (min 1, required)"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Peer review submitted",
  "data": {
    ...submission...,
    "peerReviews": [
      {
        "reviewerId": "64e...",
        "rating": 4,
        "comments": "Good analysis, but the conclusion was weak.",
        "reviewedAt": "2026-03-31T15:00:00.000Z"
      }
    ]
  }
}
```

**Errors:** `404` if submission not found or peer review not enabled. `400` if reviewer = submitter, or duplicate review.

---

#### `POST /learning/submissions/:id/request-revision`

Mark a submission as a draft again, signalling the student to revise and resubmit.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Request body:** None.

**Response (200):**

```json
{
  "success": true,
  "message": "Revision requested",
  "data": { ...submission with isDraft: true... }
}
```

---

#### `GET /learning/submissions/:id`

Fetch a single submission. Populates `studentId` (userId), `gradedBy` (firstName, lastName, email).

**Auth:** Required. All authenticated users.

---

### 2.5 Student Progress

#### `GET /learning/progress/:studentId`

Retrieve all `StudentProgress` records for a student across subjects.

**Auth:** Required. All authenticated users.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `subjectId` | ObjectId | Optional filter to a single subject |

**Response (200):**

```json
{
  "success": true,
  "message": "Student progress retrieved",
  "data": [
    {
      "_id": "...",
      "studentId": "...",
      "subjectId": { "_id": "...", "name": "Mathematics", "code": "MATH" },
      "schoolId": "...",
      "term": 1,
      "year": 2026,
      "masteryPercentage": 74,
      "assignmentsCompleted": 8,
      "assignmentsTotal": 10,
      "averageMark": 74.25,
      "trend": "improving",
      "strengths": [],
      "weaknesses": [],
      "lastUpdated": "2026-03-30T00:00:00.000Z"
    }
  ]
}
```

Results sorted `-year -term` (most recent first).

---

#### `POST /learning/progress/:studentId/:subjectId/mastery`

Recalculate and upsert a student's mastery record for a subject/term/year. Aggregates all non-draft `AssignmentSubmission` records for the student + school, computes `averageMark` and `masteryPercentage`, and determines `trend` from the last 3 graded marks.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `schoolId` | ObjectId | Falls back to `req.user.schoolId` |
| `term` | number | Default: 1 |
| `year` | number | Default: current year |

**Response (200):** Single `StudentProgress` document (upserted).

---

#### `GET /learning/struggling/:classId`

Identify students showing declining performance in a class. Filters quiz attempts linked to quizzes in the given class. Groups by student; flags any student whose last 3 quiz scores average below 50% or show a strictly declining pattern.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Response (200):**

```json
{
  "success": true,
  "message": "Struggling students identified",
  "data": [
    {
      "studentId": "64e...",
      "subjectId": "64f...",
      "averageMark": 38,
      "trend": "declining"
    }
  ]
}
```

---

## 3. Frontend Pages

### 3.1 Admin Learning Page

**Path:** `/admin/learning`
**File:** `src/app/(dashboard)/admin/learning/page.tsx`

A tabbed single-page management console covering the full learning platform.

**Tab: Study Materials**
- Stat cards: total materials count, cumulative downloads.
- `DataTable` of study materials: columns for title, subject, grade, type badge (notes / video / past_paper with icon), upload date, download count.
- "Upload Material" dialog: fields for title, subject (select), grade (select), type (select: notes, video, past_paper), file URL.

**Tab: Quizzes**
- Stat cards: active (published + closed) quizzes, total quizzes.
- `DataTable` of quizzes: columns for title, subject, class, question count, time limit, points, status badge, avg score with attempt count.
- Inline "Publish" button on draft quizzes.
- "Create Quiz" dialog: fields for title, subject, class, question type, time limit, points.

**Tab: Results**
- Three summary cards: total attempts, pass rate, average score.
- `DataTable` of quiz results: student name, quiz title, score fraction, percentage (colour-coded green/red), date, pass/fail badge.

**Tab: Rubrics**
- Stat cards: total rubrics.
- `DataTable` of rubrics: name, subject, criteria count, levels count, created date, usage count, inline "Edit" button.
- "Create Rubric" dialog: fields for name, subject, criteria count, achievement levels count, description.

**Current state:** All data is mock. API wiring is pending (see Section 8).

---

### 3.2 Teacher Homework Page (Learning Integration Point)

**Path:** `/teacher/homework`
**File:** `src/app/(dashboard)/teacher/homework/page.tsx`

Teacher creates/views homework assignments. Acts as the entry point for the submission flow — links to individual homework detail pages where submission viewing and grading occur.

Already wired to live API: `GET /homework`, `GET /academic/subjects`, `GET /academic/classes`.

---

### 3.3 Teacher Grades Page

**Path:** `/teacher/grades`
**File:** `src/app/(dashboard)/teacher/grades/page.tsx`

Gradebook for entering per-student assessment marks. Uses mock data currently. Will integrate with Learning's assignment analytics and the Academic module's grade records.

---

### 3.4 Teacher AI Tools Pages

**Path:** `/teacher/ai-tools`, `/teacher/ai-tools/create-paper`, `/teacher/ai-tools/grading`, `/teacher/ai-tools/papers`

AI-assisted paper generation and batch grading. Sits alongside the Learning module and will consume quiz and submission data for AI grading workflows.

---

### 3.5 Student Pages (Future)

The student portal will need dedicated learning pages:

- `/student/library` (already exists, browse materials)
- Quiz-taking interface (not yet built)
- Submission status view (not yet built)

---

## 4. User Flows

### 4.1 Teacher Uploads a Study Material

1. Teacher navigates to `/admin/learning` > **Study Materials** tab.
2. Clicks **Upload Material** — dialog opens.
3. Fills in title, selects subject and grade, selects type, pastes file URL.
4. Submits form → `POST /learning/materials` with `curriculum` object constructed from subject/grade/term/topic selections.
5. On success: toast notification, dialog closes, materials table refreshes.
6. Students on the same school/grade/subject can see the material in their library.
7. When a student opens the file URL, the frontend calls `POST /learning/materials/:id/download` to increment the counter.

---

### 4.2 Teacher Creates and Publishes a Quiz

1. Teacher navigates to **Quizzes** tab.
2. Clicks **Create Quiz** — dialog opens. Fills in title, subject, class, question type, time limit, points. Submits.
3. `POST /learning/quizzes` — quiz created with `status: "draft"`.
4. Teacher opens the quiz detail (or uses the inline Publish button in the table).
5. Clicks **Publish** → `PATCH /learning/quizzes/:id/publish` with `{ "status": "published" }`.
6. Quiz is now visible to students in the assigned class.
7. To close the quiz after the due date: same endpoint with `{ "status": "closed" }`.

---

### 4.3 Student Takes a Quiz

1. Student lands on their dashboard; sees available published quizzes for their class and subject.
2. Student opens quiz — frontend fetches `GET /learning/quizzes/:id` to render questions.
3. If `shuffleQuestions: true`, the frontend randomises question order client-side before display.
4. Timer is handled entirely client-side using `timeLimit` (minutes). When timer expires the form auto-submits.
5. Student selects answers, clicks **Submit** → `POST /learning/quizzes/:id/attempt` with `answers[]` and `startedAt`.
6. Backend grades immediately, returns `IQuizAttempt` with per-answer correctness and total score.
7. Frontend shows results summary: score, percentage, per-question breakdown with `explanation` if present.
8. On subsequent attempts (up to `quiz.attempts` limit): same flow. Error `400` "Maximum number of attempts reached" if limit hit.

---

### 4.4 Student Submits an Assignment

1. Teacher has created a Homework item (`/teacher/homework`).
2. Student navigates to their homework list, opens the assignment.
3. Student uploads file(s) to external storage (S3 or equivalent), gets back URL(s).
4. **Draft save:** Student clicks **Save Draft** → `POST /learning/assignments/:homeworkId/draft` with `{ files: [...] }`.
5. Student can return, update files, and save draft again (upsert — same record).
6. **Final submission:** Student clicks **Submit** → `POST /learning/assignments/:homeworkId/submit`. Backend pushes to `revisionHistory`.
7. If teacher calls `POST /learning/submissions/:id/request-revision`, `isDraft` is set back to `true` and student can resubmit (incrementing revision version).

---

### 4.5 Teacher Grades with Rubric

1. Teacher navigates to homework, opens submission list: `GET /learning/assignments/:homeworkId/submissions`.
2. Teacher clicks a student's submission → `GET /learning/submissions/:id`.
3. Teacher loads their rubric: `GET /learning/rubrics/:id` (or lists rubrics to pick one).
4. Teacher scores each criterion by selecting a level.
5. Teacher writes narrative comments, optionally uploads an audio clip and pastes URL.
6. Clicks **Grade** → `POST /learning/submissions/:id/grade` with `comments`, `rubricScores[]`, `audioFeedbackUrl?`, `mark?`.
7. On success: submission record shows `teacherFeedback`, `mark`, `gradedAt`, `gradedBy`.
8. (Optional) Teacher calls `POST /learning/assignments/:homeworkId/analytics` to review class-level score distribution.

---

### 4.6 Peer Review Flow

1. Teacher enables peer review: `POST /learning/assignments/:homeworkId/peer-review`.
2. All existing submissions for that homework have `peerReviewEnabled` set to `true`.
3. Frontend presents each student with a peer's submission (assignment logic for who reviews whom is handled client-side or via a future endpoint).
4. Student submits review → `POST /learning/submissions/:id/peer-review` with `{ rating, comments }`.
5. Guard prevents self-review and duplicate reviews.

---

## 5. Data Models

### 5.1 Quiz

```typescript
interface IQuizOption {
  text: string;
  isCorrect: boolean;
}

interface IQuizQuestion {
  questionText:  string;
  questionType:  'mcq' | 'true_false' | 'short_answer' | 'matching';
  options:       IQuizOption[];   // empty for short_answer
  correctAnswer: string;          // used for short_answer matching; for MCQ, isCorrect on option takes precedence
  points:        number;          // min 1
  explanation?:  string;
}

interface IQuiz {
  _id:              ObjectId;
  schoolId:         ObjectId;     // ref: School
  teacherId:        ObjectId;     // ref: User (injected server-side)
  subjectId:        ObjectId;     // ref: Subject
  classId:          ObjectId;     // ref: Class
  title:            string;
  description?:     string;
  type:             'mcq' | 'true_false' | 'mixed';
  questions:        IQuizQuestion[];
  totalPoints:      number;       // min 1
  timeLimit?:       number;       // minutes
  attempts:         number;       // default 1; enforced per student
  shuffleQuestions: boolean;      // default false; applied client-side
  dueDate?:         Date;
  status:           'draft' | 'published' | 'closed';
  isDeleted:        boolean;
  createdAt:        Date;
  updatedAt:        Date;
}
```

**DB indexes:** `(schoolId, classId, subjectId)`, `(teacherId)`, `(status, dueDate desc)`.

---

### 5.2 QuizAttempt

```typescript
interface IQuizAnswer {
  questionIndex:   number;
  selectedOption?: number;   // index into question.options[]
  textAnswer?:     string;   // for short_answer
  isCorrect:       boolean;  // set by server
  pointsEarned:    number;   // 0 or question.points
}

interface IQuizAttempt {
  _id:          ObjectId;
  quizId:       ObjectId;    // ref: Quiz
  studentId:    ObjectId;    // ref: Student
  answers:      IQuizAnswer[];
  totalScore:   number;
  percentage:   number;      // 0–100, rounded integer
  startedAt:    Date;        // provided by client
  completedAt?: Date;        // set by server on submission
  attempt:      number;      // 1-based counter
  isDeleted:    boolean;
  createdAt:    Date;
  updatedAt:    Date;
}
```

**DB indexes:** `(quizId, studentId)`, `(studentId)`.

---

### 5.3 StudyMaterial

```typescript
interface ICurriculumRef {
  subject: string;
  grade:   string;
  term:    string;
  topic:   string;
}

interface IStudyMaterial {
  _id:           ObjectId;
  schoolId:      ObjectId;    // ref: School
  teacherId:     ObjectId;    // ref: User
  subjectId:     ObjectId;    // ref: Subject
  gradeId:       ObjectId;    // ref: Grade
  term:          number;      // 1–4
  topic:         string;
  type:          'notes' | 'video' | 'link' | 'document' | 'past_paper';
  title:         string;
  description?:  string;
  fileUrl?:      string;      // for notes / document / past_paper
  videoUrl?:     string;      // for video type
  externalLink?: string;      // for link type
  tags:          string[];
  curriculum:    ICurriculumRef;
  downloads:     number;      // incremented via POST /materials/:id/download
  isDeleted:     boolean;
  createdAt:     Date;
  updatedAt:     Date;
}
```

**DB indexes:** `(schoolId, subjectId, gradeId)`, `(tags)`, `(curriculum.subject, curriculum.grade, curriculum.term)`.

---

### 5.4 Rubric

```typescript
interface IRubricLevel {
  label:       string;
  description: string;
  points:      number;  // min 0
}

interface IRubricCriterion {
  name:        string;
  description: string;
  levels:      IRubricLevel[];
}

interface IRubric {
  _id:          ObjectId;
  schoolId:     ObjectId;    // ref: School
  teacherId:    ObjectId;    // ref: User
  name:         string;
  subjectId?:   ObjectId;    // ref: Subject (optional — can be cross-subject)
  criteria:     IRubricCriterion[];
  totalPoints:  number;      // min 1
  reusable:     boolean;     // default true; reusable rubrics show in the rubric picker
  isDeleted:    boolean;
  createdAt:    Date;
  updatedAt:    Date;
}
```

**DB indexes:** `(schoolId, teacherId)`, `(subjectId)`.

---

### 5.5 AssignmentSubmission

```typescript
interface IPeerReview {
  reviewerId: ObjectId;  // ref: Student
  rating:     number;    // 1–5
  comments:   string;
  reviewedAt: Date;
}

interface IRubricScore {
  criterionId: string;   // matches IRubricCriterion.name (string key, not ObjectId)
  level:       string;   // matches IRubricLevel.label
  points:      number;   // min 0
}

interface ITeacherFeedback {
  comments:          string;
  rubricScores:      IRubricScore[];
  audioFeedbackUrl?: string;
}

interface IRevisionEntry {
  fileUrl:     string;
  submittedAt: Date;
  version:     number;  // increments with each final submission
}

interface IAssignmentSubmission {
  _id:               ObjectId;
  homeworkId:        ObjectId;   // ref: Homework
  studentId:         ObjectId;   // ref: Student
  schoolId:          ObjectId;   // ref: School
  files:             string[];   // current active file URLs
  submittedAt:       Date;
  isLate:            boolean;    // set by client on final submit; backend stores as-is
  mark?:             number;
  feedback?:         string;     // legacy plain-text feedback field (prefer teacherFeedback)
  gradedAt?:         Date;
  gradedBy?:         ObjectId;   // ref: User
  isDraft:           boolean;
  draftSavedAt?:     Date;
  plagiarismScore?:  number;     // 0–100, set externally
  peerReviewEnabled: boolean;
  peerReviews:       IPeerReview[];
  teacherFeedback?:  ITeacherFeedback;
  revisionHistory:   IRevisionEntry[];
  isDeleted:         boolean;
  createdAt:         Date;
  updatedAt:         Date;
}
```

**DB indexes:** `(homeworkId, studentId)` (unique), `(studentId)`, `(schoolId, homeworkId)`.

---

### 5.6 StudentProgress

```typescript
type TrendDirection = 'improving' | 'stable' | 'declining';

interface IStudentProgress {
  _id:                   ObjectId;
  studentId:             ObjectId;   // ref: Student
  subjectId:             ObjectId;   // ref: Subject
  schoolId:              ObjectId;   // ref: School
  term:                  number;     // 1–4
  year:                  number;
  masteryPercentage:     number;     // 0–100
  assignmentsCompleted:  number;
  assignmentsTotal:      number;
  averageMark:           number;
  trend:                 TrendDirection;
  strengths:             string[];
  weaknesses:            string[];
  lastUpdated:           Date;
  isDeleted:             boolean;
  createdAt:             Date;
  updatedAt:             Date;
}
```

**DB indexes:** `(studentId, subjectId, term, year)` (unique), `(schoolId, subjectId)`.

---

## 6. State Management

There is no dedicated learning Zustand store yet. The module currently uses local `useState` in the admin page and relies on mock data.

The store to build is `useLearningStore` at `src/stores/useLearningStore.ts`.

### Recommended store shape

```typescript
interface LearningState {
  // Study Materials
  materials: StudyMaterial[];
  materialsTotal: number;
  materialsLoading: boolean;

  // Quizzes
  quizzes: Quiz[];
  quizzesTotal: number;
  quizzesLoading: boolean;
  activeQuiz: Quiz | null;

  // Quiz Attempts
  quizResults: QuizResultsResponse | null;
  currentAttempt: QuizAttempt | null;

  // Rubrics
  rubrics: Rubric[];
  rubricsTotal: number;
  rubricsLoading: boolean;

  // Submissions
  submissions: AssignmentSubmission[];
  submissionsTotal: number;
  submissionsLoading: boolean;
  activeSubmission: AssignmentSubmission | null;

  // Student Progress
  studentProgress: StudentProgress[];

  // Actions
  fetchMaterials: (params?: MaterialsQuery) => Promise<void>;
  uploadMaterial: (data: CreateStudyMaterialInput) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  recordDownload: (id: string) => Promise<void>;

  fetchQuizzes: (params?: QuizzesQuery) => Promise<void>;
  createQuiz: (data: CreateQuizInput) => Promise<void>;
  publishQuiz: (id: string, status: 'published' | 'closed') => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  submitQuizAttempt: (quizId: string, answers: QuizAnswer[], startedAt: string) => Promise<QuizAttempt>;
  fetchQuizResults: (quizId: string) => Promise<void>;

  fetchRubrics: (params?: RubricsQuery) => Promise<void>;
  createRubric: (data: CreateRubricInput) => Promise<void>;
  deleteRubric: (id: string) => Promise<void>;

  fetchSubmissions: (homeworkId: string, params?: PaginationQuery) => Promise<void>;
  saveDraft: (homeworkId: string, files: string[]) => Promise<void>;
  submitFinal: (homeworkId: string, files: string[]) => Promise<void>;
  gradeSubmission: (id: string, data: GradeWithRubricInput) => Promise<void>;
  requestRevision: (id: string) => Promise<void>;
  enablePeerReview: (homeworkId: string) => Promise<void>;
  submitPeerReview: (id: string, rating: number, comments: string) => Promise<void>;

  fetchStudentProgress: (studentId: string, subjectId?: string) => Promise<void>;
  calculateMastery: (studentId: string, subjectId: string, params: MasteryParams) => Promise<void>;
  fetchStrugglingStudents: (classId: string) => Promise<void>;
}
```

All async actions should call `apiClient` (axios instance at `src/lib/api-client.ts`) and use `toast.success` / `toast.error` (sonner) for feedback. Error handling should follow the existing pattern in `useAuthStore`.

---

## 7. Components Needed

The following components do not yet exist and need to be built. All should live under `src/components/learning/`.

### 7.1 QuizBuilder

**Purpose:** Multi-step form to create or edit a quiz with one or more questions.

**Props:**
```typescript
interface QuizBuilderProps {
  initialData?: Partial<IQuiz>;
  onSubmit: (data: CreateQuizInput) => Promise<void>;
  onCancel: () => void;
  subjects: Subject[];
  classes: SchoolClass[];
}
```

**Behaviour:**
- Step 1 — Quiz metadata: title, description, subject, class, type, time limit, attempts, due date, shuffle toggle.
- Step 2 — Questions: dynamic list of `QuestionEditor` sub-components. Each question has type selector (mcq / true_false / short_answer / matching), question text, points, explanation, and a dynamic options list (for MCQ). "Add Question" button appends a blank question. Drag-to-reorder optional.
- Step 3 — Review: summary of all questions with total points tally. Warns if `totalPoints` field doesn't match sum of question points.
- Final submit calls `onSubmit`.
- Uses react-hook-form with Zod resolver (`createQuizSchema`).

---

### 7.2 MaterialUpload

**Purpose:** Form/dialog for uploading a study material record.

**Props:**
```typescript
interface MaterialUploadProps {
  onSubmit: (data: CreateStudyMaterialInput) => Promise<void>;
  onCancel: () => void;
  subjects: Subject[];
  grades: Grade[];
}
```

**Behaviour:**
- Fields: title, description, subject, grade, term (1–4), topic, type, tags (comma-separated input or tag input), URL fields (fileUrl / videoUrl / externalLink — shown conditionally based on selected type).
- Curriculum object auto-constructed from subject/grade/term/topic selections.
- Uses react-hook-form + Zod (`createStudyMaterialSchema`).

---

### 7.3 RubricEditor

**Purpose:** Build or edit a rubric with a dynamic criteria/levels grid.

**Props:**
```typescript
interface RubricEditorProps {
  initialData?: Partial<IRubric>;
  onSubmit: (data: CreateRubricInput) => Promise<void>;
  onCancel: () => void;
  subjects: Subject[];
}
```

**Behaviour:**
- Top section: rubric name, subject (optional), reusable toggle.
- Criteria list: each criterion has name, description, and a levels list. Each level has label, description, points.
- "Add Criterion" and "Add Level" buttons. Remove buttons for each.
- Total points display: sum of the max points per criterion (highest level value) auto-computed.
- Uses react-hook-form + Zod (`createRubricSchema`).

---

### 7.4 SubmissionViewer

**Purpose:** Teacher view of a single submission with grading interface.

**Props:**
```typescript
interface SubmissionViewerProps {
  submission: IAssignmentSubmission;
  rubrics: IRubric[];
  onGrade: (data: GradeWithRubricInput) => Promise<void>;
  onRequestRevision: () => Promise<void>;
}
```

**Behaviour:**
- Left panel: student name, submission date, late badge, files list (clickable links to open/download each file), revision history timeline.
- Right panel — grading:
  - Rubric picker (select from `rubrics` list or leave unscored).
  - RubricScoreGrid: renders criteria rows with level buttons; clicking a level button selects it and shows points.
  - Numeric mark input (optional override).
  - Comments textarea.
  - Audio feedback URL input.
  - **Grade** submit button.
  - **Request Revision** button.
- If already graded: show existing feedback in read-only view with an "Edit Grade" toggle.
- Peer reviews section: read-only list of peer review entries (rating stars, comments, reviewer anonymised or named per school policy).

---

### 7.5 QuizAttemptUI

**Purpose:** Student-facing quiz taking interface.

**Props:**
```typescript
interface QuizAttemptUIProps {
  quiz: IQuiz;
  onSubmit: (answers: QuizAnswerInput[], startedAt: string) => Promise<IQuizAttempt>;
}
```

**Behaviour:**
- Renders shuffled (if `quiz.shuffleQuestions`) questions one at a time or all on one page.
- Countdown timer from `quiz.timeLimit` minutes; auto-submits on expiry.
- MCQ/true-false: radio button options. Short answer: text input.
- Results screen after submission: per-question indicator, score, percentage, explanations.

---

### 7.6 ProgressDashboard

**Purpose:** Visual student progress summary per subject.

**Props:**
```typescript
interface ProgressDashboardProps {
  progress: IStudentProgress[];
}
```

**Behaviour:**
- Grid of cards per subject: mastery percentage (circular progress indicator), assignments completed/total, average mark, trend indicator (arrow icon with colour: green improving, amber stable, red declining).
- Empty state when no progress records exist.

---

### 7.7 StrugglingStudentsAlert

**Purpose:** Teacher/admin widget listing flagged struggling students.

**Props:**
```typescript
interface StrugglingStudentsAlertProps {
  classId: string;
}
```

**Behaviour:**
- Fetches `GET /learning/struggling/:classId` on mount.
- Renders a list with student name (resolved from studentId), subject, average mark, trend badge.
- Empty state: "No struggling students identified."

---

## 8. Integration Notes

### 8.1 Learning ↔ Academic Module

- Quiz `subjectId` and `classId` reference Academic module entities (`Subject`, `Class`). Dropdowns in QuizBuilder and MaterialUpload must pre-fetch from `GET /academic/subjects` and `GET /academic/classes`.
- Assignment analytics `submissionRate` is an absolute count; the frontend must cross-reference class enrolment size from `GET /academic/classes/:id` to compute a true submission rate percentage.
- Mastery calculation (`POST /learning/progress/:studentId/:subjectId/mastery`) uses `schoolId` — the calling code should pass `req.user.schoolId` or a query param. The frontend should pass the school ID explicitly.

### 8.2 Learning ↔ Homework Module

- `AssignmentSubmission.homeworkId` references the `Homework` collection (managed by the Homework module at `POST /homework`). A submission cannot exist without a corresponding Homework document.
- Teachers create homework via `/teacher/homework`, then view enhanced submissions via `/learning/assignments/:homeworkId/submissions`. The homework detail page should link to the Learning submission list.
- The `isLate` flag on final submission is currently set by the client (frontend must compare `Date.now()` against `homework.dueDate` and pass the boolean).

### 8.3 Learning ↔ AI Tools Module

- The AI Tools module (`/teacher/ai-tools`) is intended to consume Learning data:
  - AI-generated papers will ultimately map to Study Materials (`type: 'past_paper'` or `type: 'document'`).
  - AI grading uses submission files from `AssignmentSubmission.files`. The grading result is written back via `POST /learning/submissions/:id/grade`.
  - The grading hub (`/teacher/ai-tools/grading`) should load submissions from `GET /learning/assignments/:homeworkId/submissions` and post AI-generated rubric scores.
- These integration points are planned but not yet implemented in either module.

### 8.4 Learning ↔ Student Module

- `AssignmentSubmission.studentId` and `QuizAttempt.studentId` reference `Student` documents, not `User` documents.
- The student's `User.id` (JWT sub) must be resolved to their `Student._id` before calling student-only endpoints. The auth middleware currently injects `req.user.id` as the user ID, not the student document ID. The service uses `studentId` passed as `req.user.id` — this works if the Student document uses the same ID as the User document, but should be confirmed during wiring.

### 8.5 File Storage

- The backend stores file URLs only; it does not handle file uploads itself.
- File uploads must go through a separate storage service (e.g. AWS S3, Cloudinary). The frontend must upload the file externally first, obtain the URL, then send the URL in the API payload.
- File type validation (MIME type, size limits) is therefore the responsibility of the upload widget, not the backend.

### 8.6 Frontend API Client

All Learning API calls use `apiClient` from `src/lib/api-client.ts`. The base URL is `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:4000`). JWT is attached automatically via the request interceptor from `localStorage.accessToken`.

The admin learning page (`/admin/learning/page.tsx`) currently uses mock data. The wiring pattern to follow is the teacher homework page: `useEffect` + `apiClient.get` + `useState` for data, or (preferred) a Zustand store action.

---

## 9. Acceptance Criteria

### Study Materials

- [ ] Teacher can upload a study material with all required fields; record appears in the materials table immediately.
- [ ] Materials list supports filtering by subject, grade, term, type, and free-text search.
- [ ] Calling `POST /learning/materials/:id/download` increments the `downloads` counter; the updated count reflects in the table.
- [ ] Teacher can edit a material's metadata (title, tags, description, URL) via `PUT /learning/materials/:id`.
- [ ] Soft-deleted materials do not appear in list or detail endpoints.
- [ ] Material type badge renders the correct icon: `FileText` for notes, `Video` for video, `ClipboardList` for past_paper.

### Quizzes

- [ ] Teacher can create a quiz with at least one question; it is saved with `status: "draft"`.
- [ ] Publish action changes status to `"published"`; close action changes to `"closed"`. Both states are reflected by the status badge.
- [ ] Published quiz is visible to students in the assigned class and subject.
- [ ] Student can submit an attempt; the backend auto-grades and returns `totalScore` and `percentage`.
- [ ] Attempt limit is enforced: submitting beyond `quiz.attempts` returns `400 Bad Request`.
- [ ] `GET /learning/quizzes/:id/results` returns all attempts with `averageScore` and `submissionCount`.
- [ ] Shuffle mode (when enabled) randomises question order on the client before render.
- [ ] Countdown timer auto-submits when `timeLimit` expires.

### Rubrics

- [ ] Teacher can create a rubric with at least one criterion and at least one level per criterion.
- [ ] Rubric is listed in the rubric picker when grading a submission.
- [ ] `reusable: true` rubrics are shown in the shared library; `reusable: false` rubrics are visible only to their creator.
- [ ] Total points field reflects the sum of the highest level points across all criteria (validated on save).
- [ ] Teacher can update criteria names, level descriptions, and points via `PUT /learning/rubrics/:id`.

### Assignment Submissions

- [ ] Student can save a draft; returning and saving again updates the same record (upsert confirmed by checking `_id` is unchanged).
- [ ] Final submission sets `isDraft: false` and pushes a `revisionHistory` entry with `version: 1`.
- [ ] Revision request resets `isDraft: true`; student can resubmit, incrementing `revisionHistory` version to 2.
- [ ] Teacher can grade a submission with rubric scores, comments, and an optional numeric mark; `gradedAt` and `gradedBy` are set.
- [ ] Peer review requires `peerReviewEnabled: true`; attempting without it returns `404`.
- [ ] A student cannot peer-review their own submission (returns `400`).
- [ ] Assignment analytics returns correct `lateRate`, `averageMark`, and score distribution buckets.

### Student Progress

- [ ] `POST /learning/progress/:studentId/:subjectId/mastery` creates a new `StudentProgress` record on first call and updates it on subsequent calls (upsert confirmed).
- [ ] Trend is `"improving"` when the last 3 graded marks are ascending, `"declining"` when descending, `"stable"` otherwise.
- [ ] `GET /learning/struggling/:classId` returns students with average quiz score < 50% or strictly declining last-3-score pattern.

### Frontend

- [ ] Admin learning page renders all four tabs (Study Materials, Quizzes, Results, Rubrics) with live API data (not mock).
- [ ] `useLearningStore` is implemented and all page-level components consume store actions instead of local `useState` + inline `apiClient` calls.
- [ ] `QuizBuilder`, `MaterialUpload`, `RubricEditor`, and `SubmissionViewer` components are built and used in the appropriate pages.
- [ ] All forms use react-hook-form with Zod validation matching the backend schemas.
- [ ] Error states (API failures, validation errors) are displayed via `toast.error` with the backend's error message.
- [ ] Loading states are shown during all async operations (skeleton loaders or spinner on the relevant table/form).
