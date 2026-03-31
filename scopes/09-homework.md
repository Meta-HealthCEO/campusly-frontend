# 09 — Homework Module

## 1. Module Overview

The Homework module enables teachers to create, manage, and grade homework assignments and enables students to view and submit work. The module handles the full lifecycle: assignment creation, student submission (with late-submission detection), and teacher grading with mark and feedback.

**Roles involved:**
- `teacher`, `school_admin`, `super_admin` — create, update, delete assignments; view and grade submissions
- `student` — view assigned homework; submit files; view their own submission history

**Key behaviours:**
- All homework and submission records use soft deletion (`isDeleted: true`).
- Late-submission detection is automatic: the service compares `submittedAt` to `homework.dueDate` at submission time and sets `isLate` accordingly.
- A student may re-submit: `submitHomework` uses `findOneAndUpdate` with `upsert: true`, so re-submitting overwrites the existing submission.
- A unique compound index on `(homeworkId, studentId)` in `HomeworkSubmission` enforces one submission record per student per assignment.

---

## 2. Backend API Endpoints

Base path: `/homework` (mounted at the application router level under `/homework`).

All endpoints require a valid JWT supplied as a Bearer token (`authenticate` middleware). Role restrictions are noted per endpoint.

---

### POST /homework

Create a new homework assignment.

**Roles:** `teacher`, `school_admin`, `super_admin`

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | `string` | Yes | `min(1)`, trimmed |
| `description` | `string` | Yes | `min(1)` |
| `subjectId` | `string` | Yes | 24-char hex ObjectId |
| `classId` | `string` | Yes | 24-char hex ObjectId |
| `schoolId` | `string` | Yes | 24-char hex ObjectId |
| `dueDate` | `string` | Yes | ISO 8601 datetime (`z.string().datetime()`) |
| `totalMarks` | `number` | Yes | `min(1)` |
| `attachments` | `string[]` | No | Array of URL strings |
| `rubric` | `string` | No | Free text |
| `peerReviewEnabled` | `boolean` | No | Defaults to `false` |
| `groupAssignment` | `boolean` | No | Defaults to `false` |
| `maxFileSize` | `number` | No | Must be positive |
| `allowedFileTypes` | `string[]` | No | Array of MIME type or extension strings |

The `teacherId` is NOT supplied in the body — the service injects `req.user.id` automatically.

**Example request:**
```json
{
  "title": "Chapter 5 Questions",
  "description": "Answer questions 1–10 from Chapter 5 of your textbook.",
  "subjectId": "64b1e2f3a4c5d6e7f8a9b0c1",
  "classId": "64b1e2f3a4c5d6e7f8a9b0c2",
  "schoolId": "64b1e2f3a4c5d6e7f8a9b0c3",
  "dueDate": "2026-04-07T23:59:00.000Z",
  "totalMarks": 20,
  "rubric": "1 mark per correct answer.",
  "allowedFileTypes": ["application/pdf", "image/jpeg"],
  "maxFileSize": 5242880
}
```

**Response — 201 Created:**
```json
{
  "success": true,
  "data": {
    "_id": "64c0000000000000000000a1",
    "title": "Chapter 5 Questions",
    "description": "Answer questions 1–10 from your textbook.",
    "subjectId": "64b1e2f3a4c5d6e7f8a9b0c1",
    "classId": "64b1e2f3a4c5d6e7f8a9b0c2",
    "schoolId": "64b1e2f3a4c5d6e7f8a9b0c3",
    "teacherId": "64b1e2f3a4c5d6e7f8a9b0c4",
    "dueDate": "2026-04-07T23:59:00.000Z",
    "attachments": [],
    "totalMarks": 20,
    "status": "assigned",
    "rubric": "1 mark per correct answer.",
    "peerReviewEnabled": false,
    "groupAssignment": false,
    "allowedFileTypes": ["application/pdf", "image/jpeg"],
    "maxFileSize": 5242880,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Homework created successfully"
}
```

---

### GET /homework

List homework assignments with pagination, filtering, and search.

**Roles:** Any authenticated user.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | `number` | Page number (default: `PAGINATION_DEFAULTS.page`) |
| `limit` | `number` | Items per page (default: `PAGINATION_DEFAULTS.limit`, capped at `PAGINATION_DEFAULTS.maxLimit`) |
| `sort` | `string` | Mongoose sort string, e.g. `-dueDate` (default: `-createdAt`) |
| `search` | `string` | Searches `title` and `description` (case-insensitive regex) |
| `classId` | `string` | Filter by class ObjectId |
| `subjectId` | `string` | Filter by subject ObjectId |
| `schoolId` | `string` | Filter by school; falls back to `req.user.schoolId` |

Populated fields on each record: `subjectId` → `{ name, code }`, `classId` → `{ name }`, `teacherId` → `{ firstName, lastName, email }`.

**Example response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "64c0000000000000000000a1",
        "title": "Chapter 5 Questions",
        "subjectId": { "_id": "64b1e2f3a4c5d6e7f8a9b0c1", "name": "Mathematics", "code": "MATH" },
        "classId": { "_id": "64b1e2f3a4c5d6e7f8a9b0c2", "name": "A" },
        "teacherId": { "_id": "64b1e2f3a4c5d6e7f8a9b0c4", "firstName": "Jane", "lastName": "Smith", "email": "jane@school.edu" },
        "dueDate": "2026-04-07T23:59:00.000Z",
        "totalMarks": 20,
        "status": "assigned",
        "isDeleted": false,
        "createdAt": "2026-03-31T08:00:00.000Z",
        "updatedAt": "2026-03-31T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Homework list retrieved successfully"
}
```

---

### GET /homework/:id

Retrieve a single homework assignment by its MongoDB `_id`.

**Roles:** Any authenticated user.

**Path param:** `id` — 24-char hex ObjectId.

Populated fields: same as the list endpoint (`subjectId`, `classId`, `teacherId`).

**Example response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "_id": "64c0000000000000000000a1",
    "title": "Chapter 5 Questions",
    "description": "Answer questions 1–10 from your textbook.",
    "subjectId": { "_id": "...", "name": "Mathematics", "code": "MATH" },
    "classId": { "_id": "...", "name": "A" },
    "teacherId": { "_id": "...", "firstName": "Jane", "lastName": "Smith", "email": "jane@school.edu" },
    "dueDate": "2026-04-07T23:59:00.000Z",
    "totalMarks": 20,
    "status": "assigned"
  },
  "message": "Homework retrieved successfully"
}
```

**404 if not found or soft-deleted.**

---

### PUT /homework/:id

Update an existing homework assignment. All fields from `createHomeworkSchema` are optional (`.partial()`).

**Roles:** `teacher`, `school_admin`, `super_admin`

**Request body:** Any subset of the fields in `createHomeworkSchema`. Only provided fields are updated (`$set`).

**Example request:**
```json
{
  "dueDate": "2026-04-10T23:59:00.000Z",
  "totalMarks": 25
}
```

**Example response — 200 OK:**
```json
{
  "success": true,
  "data": { /* updated homework document with populated references */ },
  "message": "Homework updated successfully"
}
```

**404 if not found or soft-deleted.**

---

### DELETE /homework/:id

Soft-delete a homework assignment (sets `isDeleted: true`).

**Roles:** `teacher`, `school_admin`, `super_admin`

**Response — 200 OK:**
```json
{
  "success": true,
  "data": undefined,
  "message": "Homework deleted successfully"
}
```

**404 if not found or already deleted.**

---

### POST /homework/:id/submit

Student submits files for a homework assignment. Re-submitting is allowed and overwrites the previous submission. The `isLate` flag is computed automatically.

**Roles:** `student` only

**Path param:** `id` — homework ObjectId.

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `files` | `string[]` | Yes | Array of file URL strings, `min(1)` |

`studentId` and `schoolId` are taken from `req.user`.

**Example request:**
```json
{
  "files": [
    "https://cdn.school.edu/uploads/student-123/hw-chapter5.pdf"
  ]
}
```

**Example response — 201 Created:**
```json
{
  "success": true,
  "data": {
    "_id": "64c0000000000000000000b1",
    "homeworkId": "64c0000000000000000000a1",
    "studentId": "64b1e2f3a4c5d6e7f8a9b0c5",
    "schoolId": "64b1e2f3a4c5d6e7f8a9b0c3",
    "files": ["https://cdn.school.edu/uploads/student-123/hw-chapter5.pdf"],
    "submittedAt": "2026-04-06T14:30:00.000Z",
    "isLate": false,
    "mark": null,
    "feedback": null,
    "gradedAt": null,
    "gradedBy": null,
    "isDeleted": false,
    "createdAt": "2026-04-06T14:30:00.000Z",
    "updatedAt": "2026-04-06T14:30:00.000Z"
  },
  "message": "Homework submitted successfully"
}
```

**404 if the homework does not exist or is deleted.**

---

### GET /homework/:id/submissions

Retrieve all submissions for a specific homework assignment.

**Roles:** `teacher`, `school_admin`, `super_admin`

**Path param:** `id` — homework ObjectId.

Results are sorted by `submittedAt` descending. Populated fields: `studentId` → nested populate of `userId` → `{ firstName, lastName, email }`; `gradedBy` → `{ firstName, lastName, email }`.

**Example response — 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64c0000000000000000000b1",
      "homeworkId": "64c0000000000000000000a1",
      "studentId": {
        "_id": "...",
        "userId": { "firstName": "Alex", "lastName": "Brown", "email": "alex@school.edu" }
      },
      "files": ["https://cdn.school.edu/uploads/..."],
      "submittedAt": "2026-04-06T14:30:00.000Z",
      "isLate": false,
      "mark": 18,
      "feedback": "Good work.",
      "gradedAt": "2026-04-08T09:00:00.000Z",
      "gradedBy": { "_id": "...", "firstName": "Jane", "lastName": "Smith", "email": "jane@school.edu" }
    }
  ],
  "message": "Submissions retrieved successfully"
}
```

---

### GET /homework/student/:studentId/submissions

Retrieve all submissions made by a specific student, across all homework assignments.

**Roles:** Any authenticated user.

**Path param:** `studentId` — Student document ObjectId.

Results are sorted by `submittedAt` descending. Populated fields: `homeworkId` → nested populate of `subjectId` → `{ name, code }` and `classId` → `{ name }`; `gradedBy` → `{ firstName, lastName, email }`.

**Example response — 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64c0000000000000000000b1",
      "homeworkId": {
        "_id": "64c0000000000000000000a1",
        "title": "Chapter 5 Questions",
        "subjectId": { "name": "Mathematics", "code": "MATH" },
        "classId": { "name": "A" },
        "dueDate": "2026-04-07T23:59:00.000Z"
      },
      "files": ["https://cdn.school.edu/uploads/..."],
      "submittedAt": "2026-04-06T14:30:00.000Z",
      "isLate": false,
      "mark": 18,
      "feedback": "Good work.",
      "gradedAt": "2026-04-08T09:00:00.000Z",
      "gradedBy": { "firstName": "Jane", "lastName": "Smith", "email": "jane@school.edu" }
    }
  ],
  "message": "Student submissions retrieved successfully"
}
```

---

### PATCH /homework/submissions/:submissionId/grade

Grade (or re-grade) a submission. Sets `mark`, optionally `feedback`, `gradedAt`, and `gradedBy`.

**Roles:** `teacher`, `school_admin`, `super_admin`

**Path param:** `submissionId` — HomeworkSubmission document ObjectId.

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `mark` | `number` | Yes | `min(0)` |
| `feedback` | `string` | No | Trimmed free text |

`gradedBy` is injected from `req.user.id`. `gradedAt` is set to `new Date()`.

**Example request:**
```json
{
  "mark": 18,
  "feedback": "Excellent reasoning in questions 7 and 8. Review question 3."
}
```

**Example response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "_id": "64c0000000000000000000b1",
    "homeworkId": { /* full homework document */ },
    "studentId": {
      "_id": "...",
      "userId": { "firstName": "Alex", "lastName": "Brown", "email": "alex@school.edu" }
    },
    "mark": 18,
    "feedback": "Excellent reasoning in questions 7 and 8. Review question 3.",
    "gradedAt": "2026-04-08T09:00:00.000Z",
    "gradedBy": "64b1e2f3a4c5d6e7f8a9b0c4"
  },
  "message": "Submission graded successfully"
}
```

**404 if submission not found or soft-deleted.**

---

## 3. Frontend Pages

### Teacher — `/teacher/homework`

**File:** `src/app/(dashboard)/teacher/homework/page.tsx`

A list view of all homework created by the logged-in teacher, plus a dialog to create new assignments.

**Data fetched on mount (in parallel):**
- `GET /homework` — full homework list, then client-filtered to records where `hw.teacherId === user.id`
- `GET /academic/subjects` — populates the subject selector in the create form
- `GET /academic/classes` — populates the class selector in the create form

**Create homework dialog:**
- Controlled by `open` state with a `<Dialog>` component
- Form managed by `react-hook-form` + `zodResolver(homeworkSchema)`
- Fields: `title`, `description`, `subjectId` (Select), `classId` (Select), `dueDate` (date input)
- Note: the frontend `homeworkSchema` validates `title` (min 3), `description` (min 10), `subjectId`, `classId`, and `dueDate`. It does NOT include `totalMarks`, `schoolId`, `rubric`, `attachments`, or submission-control fields — those are backend-only at this stage.
- On submit: `POST /homework` with form data; prepends the new record to the list; closes and resets the form.

**Homework card (per assignment):**
- Links to `/teacher/homework/:id` for detail view
- Shows: title, subject name, due date, status badge (`assigned` / `closed`; the frontend type also includes `published` / `draft` which are not present in the backend `HomeworkStatus` enum)
- Submission count and graded/total badge are rendered but are currently hardcoded to `0` — these need to be wired up via `GET /homework/:id/submissions`.

**Empty state:** Shown when `teacherHomework.length === 0`.

---

### Student — `/student/homework`

**File:** `src/app/(dashboard)/student/homework/page.tsx`

A card grid of all homework visible to the student, with derived per-card status badges.

**Data fetched on mount (sequentially):**
1. `GET /students` — finds the current student record by matching `userId` to `user.id`
2. `GET /homework` — fetches all homework; client-filters to `status === 'published'` (note: the backend `HomeworkStatus` enum only has `'assigned'` and `'closed'`, not `'published'` — this filter currently returns nothing and needs reconciliation)
3. `GET /homework/student/:studentId/submissions` — fetches the student's submission history

**Status derivation (`getHomeworkStatus`):**
- If a submission exists for the homework → `'submitted'` (or `'graded'` if `submission.status === 'graded'`, though the backend submission model does not have a `status` field — graded status should be inferred from `mark !== undefined`)
- If no submission and `dueDate < now` → `'overdue'`
- Otherwise → `'pending'`

**Status badge config:**
| Status | Variant | Icon |
|---|---|---|
| `submitted` | `secondary` | `CheckCircle` |
| `graded` | `default` | `CheckCircle` |
| `pending` | `outline` | `Clock` |
| `overdue` | `destructive` | `AlertTriangle` |

**Homework card content:** title, subject name, description (2-line clamp), teacher name (from populated `teacher.user.firstName/lastName`), due date.

**Each card links to `/student/homework/:id`** for detail/submission view.

---

## 4. User Flows

### Flow 1: Teacher creates a homework assignment

1. Teacher navigates to `/teacher/homework`.
2. Page loads: `GET /homework`, `GET /academic/subjects`, and `GET /academic/classes` are called in parallel.
3. Teacher clicks "Create Homework" — the dialog opens.
4. Teacher fills in: title, description, subject (select), class (select), due date.
5. On submit, the form is validated client-side by `homeworkSchema` (Zod).
6. `POST /homework` is called with the form data. The service sets `teacherId` from the JWT.
7. On success, the new homework record is prepended to `homeworkList`; dialog closes; form resets.
8. On error, `toast.error('Failed to create homework')` is shown.

### Flow 2: Teacher views submissions for an assignment

1. Teacher clicks a homework card on the list page.
2. Browser navigates to `/teacher/homework/:id` (detail page — not yet implemented as a dedicated file, but linked from the list).
3. Detail page calls `GET /homework/:id` for full assignment details.
4. Detail page calls `GET /homework/:id/submissions` for all student submissions.
5. Teacher sees submission list: student name, submission date, `isLate` flag, files.

### Flow 3: Teacher grades a submission

1. On the detail/grading page, teacher enters a `mark` (number ≥ 0) and optional `feedback` text.
2. `PATCH /homework/submissions/:submissionId/grade` is called.
3. Service sets `mark`, `feedback`, `gradedAt = new Date()`, `gradedBy = teacherId`.
4. Response returns the updated submission with student and homework populated.
5. UI reflects the updated mark and feedback; submission moves into a "graded" visual state.

### Flow 4: Student views and submits homework

1. Student navigates to `/student/homework`.
2. Page fetches the student record, all homework, and the student's existing submissions.
3. Student sees a card grid with status badges derived from submission history and due dates.
4. Student clicks a card → navigates to `/student/homework/:id` (detail page — not yet implemented as a file).
5. On the detail page, `GET /homework/:id` loads assignment instructions and attachments.
6. Student attaches file(s) (URLs resolved from a file upload step) and clicks "Submit".
7. `POST /homework/:id/submit` is called with `{ files: [...] }`.
8. Service checks if submission is late (`submittedAt > homework.dueDate`), sets `isLate`, upserts the submission record.
9. On success, the student's submission is confirmed; status badge on the list page updates to `'submitted'`.

---

## 5. Data Models

### Homework (MongoDB collection: `homeworks`)

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | MongoDB document ID |
| `title` | `string` | Yes | — | Trimmed |
| `description` | `string` | Yes | — | |
| `subjectId` | `ObjectId` | Yes | — | Ref: `Subject` |
| `classId` | `ObjectId` | Yes | — | Ref: `Class` |
| `schoolId` | `ObjectId` | Yes | — | Ref: `School` |
| `teacherId` | `ObjectId` | Yes | — | Ref: `User`; injected by service from JWT |
| `dueDate` | `Date` | Yes | — | Used for late detection |
| `attachments` | `string[]` | No | `[]` | File URLs |
| `totalMarks` | `number` | Yes | — | `min(1)` |
| `status` | `'assigned' \| 'closed'` | No | `'assigned'` | Enum |
| `rubric` | `string` | No | — | Optional grading guide |
| `peerReviewEnabled` | `boolean` | No | `false` | |
| `groupAssignment` | `boolean` | No | `false` | |
| `maxFileSize` | `number` | No | — | Bytes; optional upload constraint |
| `allowedFileTypes` | `string[]` | No | `[]` | MIME types or extensions |
| `isDeleted` | `boolean` | No | `false` | Soft delete flag |
| `createdAt` | `Date` | auto | — | Mongoose timestamp |
| `updatedAt` | `Date` | auto | — | Mongoose timestamp |

**Indexes:**
- `{ classId: 1, subjectId: 1 }`
- `{ schoolId: 1, dueDate: -1 }`

---

### HomeworkSubmission (MongoDB collection: `homeworksubmissions`)

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | |
| `homeworkId` | `ObjectId` | Yes | — | Ref: `Homework` |
| `studentId` | `ObjectId` | Yes | — | Ref: `Student` |
| `schoolId` | `ObjectId` | Yes | — | Ref: `School` |
| `files` | `string[]` | No | `[]` | Submitted file URLs |
| `submittedAt` | `Date` | Yes | — | Set at submission time by service |
| `isLate` | `boolean` | No | `false` | Computed: `submittedAt > homework.dueDate` |
| `mark` | `number` | No | — | Set during grading; `min(0)` |
| `feedback` | `string` | No | — | Trimmed teacher feedback |
| `gradedAt` | `Date` | No | — | Set to `new Date()` on grading |
| `gradedBy` | `ObjectId` | No | — | Ref: `User` (the teacher) |
| `isDeleted` | `boolean` | No | `false` | Soft delete flag |
| `createdAt` | `Date` | auto | — | |
| `updatedAt` | `Date` | auto | — | |

**Indexes:**
- `{ homeworkId: 1, studentId: 1 }` — **unique** (one submission record per student per assignment; re-submitting upserts this record)
- `{ studentId: 1 }`

---

### Frontend TypeScript interfaces (`src/types/index.ts`)

**`Homework`** (frontend type, note divergences from backend):
- `status: 'draft' | 'published' | 'closed'` — includes `'draft'` and `'published'` which are absent from the backend enum (`'assigned' | 'closed'`)
- Missing frontend fields: `totalMarks`, `rubric`, `peerReviewEnabled`, `groupAssignment`, `maxFileSize`, `allowedFileTypes`, `isDeleted`

**`HomeworkSubmission`** (frontend type):
- Has a `status: 'submitted' | 'graded' | 'late' | 'missing'` field — this does not exist in the backend model; status must be derived on the frontend from `mark`, `isLate`, and submission existence
- Uses `grade` (not `mark`) and `attachments` (not `files`) — field name mismatches with the backend

---

## 6. State Management

There is currently no dedicated Zustand store for the Homework module. Both pages manage state entirely with `useState` + `useEffect`. The `useAuthStore` is consumed to read `user.id` and `user.schoolId`.

### Proposed `useHomeworkStore` (Zustand)

```ts
interface HomeworkStore {
  // Homework list
  homeworkList: Homework[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  // Submissions (teacher view — keyed by homeworkId)
  submissionsByHomework: Record<string, HomeworkSubmission[]>;

  // Student submissions
  mySubmissions: HomeworkSubmission[];

  // Actions
  fetchHomework: (params?: ListParams) => Promise<void>;
  createHomework: (data: HomeworkFormData) => Promise<Homework>;
  updateHomework: (id: string, data: Partial<HomeworkFormData>) => Promise<Homework>;
  deleteHomework: (id: string) => Promise<void>;
  fetchSubmissions: (homeworkId: string) => Promise<void>;
  fetchMySubmissions: (studentId: string) => Promise<void>;
  submitHomework: (homeworkId: string, files: string[]) => Promise<HomeworkSubmission>;
  gradeSubmission: (submissionId: string, mark: number, feedback?: string) => Promise<HomeworkSubmission>;
}
```

**Selection helpers needed:**
- `selectTeacherHomework(userId)` — filter `homeworkList` by `teacherId === userId`
- `selectHomeworkStatus(homeworkId, mySubmissions)` — derive `'submitted' | 'graded' | 'pending' | 'overdue'`

---

## 7. Components Needed

### `HomeworkList`

**Path:** `src/components/homework/HomeworkList.tsx`

A reusable list/grid renderer for homework records. Accepts a `HomeworkListProps`:

```ts
interface HomeworkListProps {
  items: Homework[];
  variant: 'teacher' | 'student';
  mySubmissions?: HomeworkSubmission[];
  onSelect?: (homework: Homework) => void;
}
```

- Teacher variant: renders a vertical card list with submission count and graded count badges (currently hardcoded to 0 in the page — must wire `GET /homework/:id/submissions`).
- Student variant: renders a 3-column card grid with derived status badge and due date.
- Empty state is handled internally.

---

### `HomeworkForm`

**Path:** `src/components/homework/HomeworkForm.tsx`

The create/edit form, currently inlined in the teacher page dialog. Extract to a standalone component.

```ts
interface HomeworkFormProps {
  defaultValues?: Partial<HomeworkFormData>;
  subjects: Subject[];
  classes: SchoolClass[];
  onSubmit: (data: HomeworkFormData) => Promise<void>;
  onCancel: () => void;
}
```

- Validated with `homeworkSchema` (Zod via `zodResolver`).
- Current schema fields: `title`, `description`, `subjectId`, `classId`, `dueDate`.
- Missing from current frontend schema (present in backend): `totalMarks` (required), `schoolId` (required), `rubric`, `attachments`, `peerReviewEnabled`, `groupAssignment`, `maxFileSize`, `allowedFileTypes`.
- `totalMarks` and `schoolId` must be added to `homeworkSchema` in `src/lib/validations.ts` for the POST to pass backend validation.

---

### `SubmissionUpload`

**Path:** `src/components/homework/SubmissionUpload.tsx`

Allows a student to upload and submit files for a homework assignment.

```ts
interface SubmissionUploadProps {
  homeworkId: string;
  homework: Homework;               // for displaying allowedFileTypes, maxFileSize
  existingSubmission?: HomeworkSubmission;
  onSubmitted: (submission: HomeworkSubmission) => void;
}
```

- Displays current submission files if re-submitting.
- Enforces `allowedFileTypes` and `maxFileSize` from the homework record.
- On confirm, calls `POST /homework/:id/submit` with resolved file URLs.
- Shows `isLate` warning when current time is past `dueDate`.

---

### `GradingInterface`

**Path:** `src/components/homework/GradingInterface.tsx`

Used on the teacher's homework detail page to grade individual student submissions.

```ts
interface GradingInterfaceProps {
  submission: HomeworkSubmission;
  totalMarks: number;
  onGraded: (updatedSubmission: HomeworkSubmission) => void;
}
```

- Displays submitted file links.
- Mark input: `number`, `min(0)`, `max(totalMarks)`.
- Feedback textarea: optional.
- Shows `isLate` badge if `submission.isLate === true`.
- On save: calls `PATCH /homework/submissions/:submissionId/grade`.
- If already graded, pre-fills mark and feedback for re-grading.

---

## 8. Integration Notes

### Academic module (subjects and classes)

- The teacher homework form calls `GET /academic/subjects` and `GET /academic/classes` to populate dropdowns.
- The `subjectId` and `classId` fields in the homework document reference `Subject` and `Class` documents from the Academic module.
- Populated responses from the service return `{ name, code }` for subjects and `{ name }` for classes.
- The frontend `SchoolClass` type exposes `grade.name` and `gradeName` for display; the class picker renders both together.

### Student module

- Students are not directly identified by their User `_id`. The student detail page must first call `GET /students` to find the `Student` document whose `userId` matches the authenticated user's `id`, then use the Student `_id` for `GET /homework/student/:studentId/submissions`.
- The `HomeworkSubmission` model's `studentId` references the `Student` collection, not the `User` collection.
- Submission populates `studentId` via a nested populate: `studentId → userId → { firstName, lastName, email }`.

### Auth and school scoping

- `schoolId` is not automatically injected by the service when creating homework — it must be supplied in the request body. The frontend form currently omits `schoolId`; it should be read from `user.schoolId` in the auth store and appended before posting.
- The list endpoint falls back to `req.user.schoolId` if no `schoolId` query param is provided, so listing is safe without explicitly passing it.
- `teacherId` IS automatically injected by the service from `req.user.id` and must not be sent in the request body.

### Status enum divergence

The backend `HomeworkStatus` is `'assigned' | 'closed'`. The frontend `Homework` TypeScript interface declares `'draft' | 'published' | 'closed'`. The student page filters by `status === 'published'`, which will always result in an empty list against the live API. Resolution: align the frontend type and filter to use `'assigned'` for active homework.

### Submission model field mismatches

The backend submission uses `files: string[]` but the frontend `HomeworkSubmission` type declares `attachments: string[]`. The backend uses `mark: number` but the frontend uses `grade?: number`. These mismatches must be resolved by updating `src/types/index.ts` or by applying a transform at the API layer.

---

## 9. Acceptance Criteria

### Homework creation (teacher)

- [ ] Teacher can open the "Create Homework" dialog from `/teacher/homework`.
- [ ] Form validates: `title` (min 3 chars), `description` (min 10 chars), `subjectId` required, `classId` required, `dueDate` required, `totalMarks` required (≥ 1).
- [ ] `schoolId` is automatically populated from `user.schoolId` before the POST — backend returns 400 otherwise.
- [ ] On success, the new homework appears at the top of the list without a page refresh.
- [ ] On API failure, an error toast is displayed and the form remains open.

### Homework listing (teacher)

- [ ] Only homework where `teacherId === user.id` is displayed.
- [ ] Homework status badge accurately reflects `'assigned'` or `'closed'` from the backend.
- [ ] Submission count and graded count are fetched from the API (not hardcoded to 0).
- [ ] Clicking a card navigates to `/teacher/homework/:id`.

### Homework listing (student)

- [ ] Student sees only homework in `'assigned'` status (filter must be corrected from `'published'`).
- [ ] Status badge correctly shows `submitted`, `graded`, `pending`, or `overdue`.
- [ ] Graded status is derived from the presence of a non-null `mark` on the submission, not from a non-existent `submission.status` field.
- [ ] Clicking a card navigates to `/student/homework/:id`.

### Submission (student)

- [ ] Student can submit at least one file URL for a homework assignment.
- [ ] Re-submission is allowed and replaces the previous submission.
- [ ] A warning is shown if the due date has passed at the time of submission.
- [ ] On success, the homework card status updates to `'submitted'`.

### Grading (teacher)

- [ ] Teacher can enter a mark (0 to `totalMarks`) and optional feedback for a submission.
- [ ] Saving calls `PATCH /homework/submissions/:submissionId/grade`.
- [ ] Graded submission shows mark, feedback, and `gradedAt` timestamp.
- [ ] Late submissions are visually flagged with `isLate`.
- [ ] Re-grading an already-graded submission is permitted (pre-fills existing values).

### Data integrity

- [ ] Deleting a homework assignment (soft delete) removes it from all listing endpoints.
- [ ] A student cannot have two active submission records for the same homework (enforced by unique index on `homeworkId + studentId`).
- [ ] `mark` cannot be negative; `totalMarks` cannot be less than 1.
