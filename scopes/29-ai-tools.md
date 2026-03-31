# 29 — AI Tools Module

## 1. Module Overview

The AI Tools module gives teachers (and, with elevated permissions, school admins) access to two core AI-assisted workflows: **exam paper generation** and **AI-assisted grading**. Both workflows are backed by Anthropic's Claude model (`claude-sonnet-4-20250514` by default, overrideable via `ANTHROPIC_MODEL` env var).

### Paper Generation

A teacher describes the exam they want (subject, grade, term, topic, difficulty, duration, total marks). The backend constructs a CAPS-aligned prompt and synchronously calls the Anthropic API via `AIService.generateJSON`. The API returns a fully structured paper with sections, questions, model answers, marking guidelines, and a memorandum — all as a single JSON object. The paper is persisted as a `GeneratedPaper` document with status `ready`. The teacher then reviews the generated paper in the frontend, can individually regenerate any question (each triggers a separate AI call), and can manually edit question text before saving or exporting.

### AI Grading

A teacher selects an assignment and provides a rubric (one or more criterion/maxScore/description objects). They submit one or multiple student submissions as plain text. The backend creates a `GradingJob` document per submission (status `queued`), then enqueues each job onto a BullMQ queue called `ai-grading`. A separate BullMQ worker (`createAIGradingWorker`) picks up each job, calls the Anthropic API to produce per-criterion scores, overall feedback, strengths, and areas for improvement, then writes the result back to the `GradingJob` document with status `completed`. The teacher polls or navigates to the grading hub, reviews AI results, optionally edits marks and feedback (stored as `teacherOverride`), approves (status `reviewed`), and then publishes (status `published`) to release the grade to the student.

### Usage Tracking

Every AI call (paper generation, question regeneration, grading) creates an `AIUsageLog` document. Admins can query aggregated token and call counts via the `/usage` endpoint, optionally filtered by date range.

### Roles and Access

All AI Tools endpoints require authentication. Paper generation, paper management, and grading endpoints are accessible to `teacher`, `school_admin`, and `super_admin`. The `/usage` stats endpoint is restricted to `school_admin` and `super_admin`.

### Concurrency and Resilience

`AIService` enforces a semaphore with `MAX_CONCURRENT = 5` simultaneous Anthropic API calls. Calls have a 60-second timeout. On HTTP 429 (rate limit) or 500 errors, the service automatically retries once. The BullMQ grading worker runs with concurrency 5. On worker failure, if the job has exhausted its retry attempts, the `GradingJob` status is reset to `queued`.

---

## 2. Backend API Endpoints

All endpoints are mounted under `/api/ai-tools`. Every request requires a valid Bearer token via the `authenticate` middleware.

---

### POST /api/ai-tools/generate-paper

Synchronously generates a full CAPS-aligned exam paper via Anthropic Claude and persists it as a `GeneratedPaper` document.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | string | yes | valid 24-char hex ObjectId |
| `subject` | string | yes | min length 1, trimmed |
| `grade` | number | yes | integer, 1–12 |
| `term` | number | yes | integer, 1–4 |
| `topic` | string | yes | min length 1, trimmed |
| `difficulty` | `'easy' \| 'medium' \| 'hard' \| 'mixed'` | yes | enum |
| `duration` | number | yes | integer, 15–300 (minutes) |
| `totalMarks` | number | yes | integer, 10–500 |

**Response**: `201 Created`

The response `data` field is the full `GeneratedPaper` document. The `sections` array is populated with AI-generated content; `status` will be `"ready"`.

```json
{
  "success": true,
  "data": {
    "_id": "664a1f2e8b1c2d3e4f5a6b7c",
    "schoolId": "663f1a0e7b2a3c4d5e6f7a8b",
    "teacherId": "663f1a0e7b2a3c4d5e6f7a8c",
    "subject": "Physical Sciences",
    "grade": 10,
    "term": 1,
    "topic": "Chemical Reactions",
    "difficulty": "medium",
    "duration": 60,
    "totalMarks": 50,
    "status": "ready",
    "memorandum": "Full marking memorandum text...",
    "sections": [
      {
        "sectionLabel": "Section A",
        "questionType": "Multiple Choice",
        "questions": [
          {
            "questionNumber": 1,
            "questionText": "Which of the following is a chemical change?",
            "marks": 2,
            "modelAnswer": "C) Burning wood",
            "markingGuideline": "Award 2 marks for C only. Burning wood is irreversible and produces new substances."
          }
        ]
      },
      {
        "sectionLabel": "Section B",
        "questionType": "Short Answer",
        "questions": [...]
      }
    ],
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:12.000Z"
  },
  "message": "Paper generated successfully"
}
```

**Failure behaviour**: If the Anthropic API call fails, the partially-created `GeneratedPaper` document is hard-deleted before the error is rethrown. The response will be a 5xx error.

---

### GET /api/ai-tools/papers

Retrieve a paginated list of generated papers for a school, with optional filters.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `schoolId` | string | conditional | Falls back to `req.user.schoolId` if omitted |
| `subject` | string | no | Exact match filter |
| `grade` | number | no | Exact match filter (parsed as integer) |
| `status` | `'generating' \| 'ready' \| 'edited'` | no | Exact match filter |
| `page` | number | no | Default: 1 |
| `limit` | number | no | Default determined by `paginationHelper` |

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "papers": [
      {
        "_id": "664a1f2e8b1c2d3e4f5a6b7c",
        "subject": "Physical Sciences",
        "grade": 10,
        "term": 1,
        "topic": "Chemical Reactions",
        "difficulty": "medium",
        "duration": 60,
        "totalMarks": 50,
        "status": "ready",
        "teacherId": {
          "_id": "663f1a0e7b2a3c4d5e6f7a8c",
          "firstName": "Sarah",
          "lastName": "Botha",
          "email": "s.botha@school.co.za"
        },
        "createdAt": "2026-03-31T08:00:00.000Z"
      }
    ],
    "total": 12
  },
  "message": "Papers retrieved successfully"
}
```

Results are sorted by `createdAt` descending. `teacherId` is populated with `firstName`, `lastName`, `email`.

---

### GET /api/ai-tools/papers/:id

Retrieve a single generated paper by ID, including full `sections` and `memorandum`.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Path parameter**: `:id` — 24-char hex ObjectId of the `GeneratedPaper`

**Response**: `200 OK` — same structure as a single paper object from the list endpoint but includes the complete `sections` array with all questions. Returns `404` if the paper does not exist or `isDeleted` is true.

---

### PUT /api/ai-tools/papers/:id

Edit a generated paper's metadata or replace its sections/memorandum. Setting `sections` or `memorandum` automatically transitions the paper's `status` to `"edited"`.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Path parameter**: `:id` — ObjectId of the `GeneratedPaper`

**Request body** (all fields optional):

| Field | Type | Validation |
|---|---|---|
| `subject` | string | min length 1, trimmed |
| `topic` | string | min length 1, trimmed |
| `difficulty` | `'easy' \| 'medium' \| 'hard' \| 'mixed'` | enum |
| `duration` | number | integer, 15–300 |
| `totalMarks` | number | integer, 10–500 |
| `sections` | array of `IPaperSection` | see section/question shape below |
| `memorandum` | string | any string |

`sections` array element shape:

```json
{
  "sectionLabel": "Section A",
  "questionType": "Multiple Choice",
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "...",
      "marks": 2,
      "modelAnswer": "...",
      "markingGuideline": "..."
    }
  ]
}
```

**Response**: `200 OK` — updated `GeneratedPaper` document. Returns `404` if not found.

---

### POST /api/ai-tools/papers/:id/regenerate-question

Replace a single question within a paper by calling the Anthropic API again. The replacement question has the same `questionNumber` and `marks` as the original. The paper's `status` transitions to `"edited"`.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Path parameter**: `:id` — ObjectId of the `GeneratedPaper`

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `sectionIndex` | number | yes | integer >= 0; must be a valid section index |
| `questionIndex` | number | yes | integer >= 0; must be a valid question index within that section |

**Response**: `200 OK` — the full updated `GeneratedPaper` document with the new question in place.

Returns `404` if the paper is not found. Returns `400` if `sectionIndex` or `questionIndex` is out of bounds.

**Example request body**:
```json
{ "sectionIndex": 0, "questionIndex": 2 }
```

---

### POST /api/ai-tools/grade

Create a single AI grading job. The job is immediately persisted with status `queued` and enqueued on the BullMQ `ai-grading` queue. The AI grading happens asynchronously; poll `GET /api/ai-tools/grade/:jobId` to check status and retrieve results.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | string | yes | valid 24-char hex ObjectId |
| `assignmentId` | string | yes | valid 24-char hex ObjectId |
| `studentId` | string | yes | valid 24-char hex ObjectId |
| `submissionText` | string | yes | min length 1 |
| `rubric` | array | yes | min 1 element; see criterion shape below |

Rubric criterion shape:

| Field | Type | Required | Validation |
|---|---|---|---|
| `criterion` | string | yes | min length 1 |
| `maxScore` | number | yes | min 1 |
| `description` | string | yes | min length 1 |

**Response**: `201 Created`

```json
{
  "success": true,
  "data": {
    "_id": "664b2f3e9c2d3e4f6a7b8c9d",
    "schoolId": "663f1a0e7b2a3c4d5e6f7a8b",
    "teacherId": "663f1a0e7b2a3c4d5e6f7a8c",
    "assignmentId": "664a2f3e8b1c2d3e4f5a6b7c",
    "studentId": "663f1b0f7c3b4d5e6f7a8b9c",
    "submissionText": "My role model is my grandmother...",
    "rubric": [
      { "criterion": "Content & Ideas", "maxScore": 10, "description": "Quality and relevance of ideas" },
      { "criterion": "Language & Grammar", "maxScore": 8, "description": "Grammatical accuracy and fluency" }
    ],
    "aiResult": null,
    "teacherOverride": null,
    "status": "queued",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:05:00.000Z",
    "updatedAt": "2026-03-31T08:05:00.000Z"
  },
  "message": "Grading job queued successfully"
}
```

---

### POST /api/ai-tools/grade/bulk

Create multiple AI grading jobs in a single request — one `GradingJob` document and one BullMQ queue entry per submission in the array. All jobs share the same rubric.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | string | yes | valid 24-char hex ObjectId |
| `assignmentId` | string | yes | valid 24-char hex ObjectId |
| `submissions` | array | yes | min 1 element |
| `submissions[].studentId` | string | yes | valid 24-char hex ObjectId |
| `submissions[].submissionText` | string | yes | min length 1 |
| `rubric` | array | yes | min 1 element; same criterion shape as single grade |

**Response**: `201 Created`

```json
{
  "success": true,
  "data": [
    { "_id": "664b2f3e9c2d3e4f6a7b8c9d", "studentId": "...", "status": "queued", ... },
    { "_id": "664b2f3e9c2d3e4f6a7b8c9e", "studentId": "...", "status": "queued", ... }
  ],
  "message": "2 grading jobs queued"
}
```

---

### GET /api/ai-tools/grade/:jobId

Retrieve the current state of a grading job, including the AI result if grading has completed.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Path parameter**: `:jobId` — ObjectId of the `GradingJob`

**Response**: `200 OK`

Once status is `completed`, `reviewed`, or `published`, the `aiResult` field will be populated:

```json
{
  "success": true,
  "data": {
    "_id": "664b2f3e9c2d3e4f6a7b8c9d",
    "assignmentId": "664a2f3e8b1c2d3e4f5a6b7c",
    "studentId": {
      "_id": "663f1b0f7c3b4d5e6f7a8b9c",
      "firstName": "Thandi",
      "lastName": "Mokoena"
    },
    "teacherId": {
      "_id": "663f1a0e7b2a3c4d5e6f7a8c",
      "firstName": "Sarah",
      "lastName": "Botha",
      "email": "s.botha@school.co.za"
    },
    "submissionText": "My role model is my grandmother...",
    "rubric": [...],
    "aiResult": {
      "totalMark": 25,
      "maxMark": 30,
      "percentage": 83.33,
      "criteriaScores": [
        {
          "criterion": "Content & Ideas",
          "score": 8,
          "maxScore": 10,
          "feedback": "Strong personal connection with specific examples. Could develop the conclusion further."
        }
      ],
      "overallFeedback": "A heartfelt essay with strong personal connection. The narrative flows well.",
      "strengths": ["Strong personal voice", "Good use of examples", "Clear narrative flow"],
      "improvements": ["Vary sentence length", "Expand conclusion", "Add more descriptive language"]
    },
    "teacherOverride": null,
    "status": "completed",
    "createdAt": "2026-03-31T08:05:00.000Z",
    "updatedAt": "2026-03-31T08:05:09.000Z"
  },
  "message": "Grading job retrieved successfully"
}
```

Returns `404` if not found or soft-deleted.

---

### POST /api/ai-tools/grade/:jobId/review

Teacher reviews and optionally adjusts the AI grade. Records the final mark and any teacher notes as a `teacherOverride`. Transitions status from `completed` to `reviewed`.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Path parameter**: `:jobId` — ObjectId of the `GradingJob`

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `finalMark` | number | yes | min 0 |
| `teacherNotes` | string | no | defaults to `""` |

**Business rule**: Returns `400` if the job's current status is not `completed`.

**Response**: `200 OK` — updated `GradingJob` with `status: "reviewed"` and `teacherOverride` populated.

**Example request body**:
```json
{
  "finalMark": 26,
  "teacherNotes": "Adjusted Content & Ideas up by 1 mark — excellent personal examples."
}
```

---

### POST /api/ai-tools/grade/:jobId/publish

Publish the grade to the student, transitioning the job to `published` status.

**Auth**: `teacher`, `school_admin`, `super_admin`

**Path parameter**: `:jobId` — ObjectId of the `GradingJob`

**Request body**: none

**Business rule**: Returns `400` if the job's current status is neither `completed` nor `reviewed` (i.e., a job that has not been AI-graded cannot be published directly).

**Response**: `200 OK` — updated `GradingJob` with `status: "published"`.

---

### GET /api/ai-tools/usage

Retrieve AI usage statistics for a school, optionally filtered by date range.

**Auth**: `school_admin`, `super_admin` only

**Query parameters**:

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `schoolId` | string | conditional | Falls back to `req.user.schoolId` if omitted |
| `startDate` | string (ISO date) | no | Inclusive lower bound on `createdAt` |
| `endDate` | string (ISO date) | no | Inclusive upper bound on `createdAt` |

**Response**: `200 OK`

```json
{
  "success": true,
  "data": {
    "totalCalls": 42,
    "totalInputTokens": 128500,
    "totalOutputTokens": 84300,
    "byType": [
      { "type": "paper_generation", "count": 12, "inputTokens": 48000, "outputTokens": 36000 },
      { "type": "question_regeneration", "count": 8, "inputTokens": 12000, "outputTokens": 9500 },
      { "type": "grading", "count": 22, "inputTokens": 68500, "outputTokens": 38800 }
    ]
  },
  "message": "Usage stats retrieved successfully"
}
```

---

## 3. Frontend Pages

All pages are nested under the teacher portal at `/teacher/ai-tools`. The sidebar entry is labelled "AI Tools" with a `Sparkles` icon and an `"AI"` badge. Navigation is defined in `ROUTES` within `/src/lib/constants.ts`.

---

### `/teacher/ai-tools` — AI Tools Overview (`page.tsx`)

The hub page. Currently uses static mock data.

**Layout**:
- `PageHeader`: title "AI Tools", description "Create papers and grade submissions with AI assistance"
- Stats row (4 `StatCard` components): Papers Generated (12, this month, +20%), Submissions Graded (47, +35%), Avg. Grading Time (8s per submission), Time Saved (6.2 hrs)
- Two large action cards linking to Create Paper and Grade Papers
- Two quick-link cards linking to Paper Library and Pending Reviews (with static badge counts)
- Recent Activity list — 5 hard-coded items showing action type icon, action label, detail string, and relative timestamp

**Status**: Static mock data only — no API integration.

---

### `/teacher/ai-tools/create-paper` — Create Paper (`create-paper/page.tsx`)

A 5-step wizard for generating an exam paper.

**Step 1 — Paper Details**: Subject (dropdown from a static 8-subject list), Grade (1–12 dropdown), Term (1–4 dropdown), Topic (free text input). Proceed button disabled until all four fields are filled.

**Step 2 — Paper Configuration**: Duration (dropdown: 30/60/90/120 minutes), Total Marks (numeric input, default 50), Difficulty (button group: easy / medium / hard / mixed, default medium).

**Step 3 — Paper Sections**: Dynamic list of section rows. Each section has a Type dropdown (MCQ, Short Answer, Long Answer, Essay, Calculation), Marks (numeric input), and Question Count (numeric input). A running total compares section marks against the configured Total Marks, coloured green when they match and orange when they diverge. Add/remove section buttons. Minimum 1 section.

**Step 4 — Generating**: Displayed while the simulated generation runs (3-second `setTimeout` with mock data). Shows animated `Sparkles` icon and the paper's metadata.

**Step 5 — Paper Preview**: Renders the generated paper grouped by section (A, B, C). Each question card shows question number, marks badge, question text (with multiple-choice options when applicable), an edit toggle (inline `<textarea>` on edit mode), and a regenerate button. Footer action bar with Save and Export buttons.

**Status**: All interactions are local state with mock data. No API calls are wired.

---

### `/teacher/ai-tools/papers` — Paper Library (`papers/page.tsx`)

Lists all generated papers.

**Layout**:
- `PageHeader` with Back and Create Paper buttons
- Stats bar: total count, published count, draft count
- Paper list — each row shows a `FileText` icon, subject name with status badge and difficulty badge, grade/topic/term line, and a metadata row (date, duration, marks, question count)
- Per-row actions: Eye (opens a `Dialog` preview showing a 2×2 grid of duration/marks/questions/difficulty), Copy (duplicates the paper to a draft), Delete (removes from list)
- Empty state with a Create Paper CTA

**Statuses displayed**: `draft` (Outline badge), `published` (Default badge), `archived` (Secondary badge)

**Status**: All interactions are local state with static mock data. No API calls are wired.

---

### `/teacher/ai-tools/grading` — AI Grading Hub (`grading/page.tsx`)

The grading workflow page. Currently uses mock data but models the complete teacher review flow.

**Layout**:
- `PageHeader` with Back button
- Assignment selector dropdown (hard-coded list of 3 assignments)
- Action buttons: "Grade All with AI (N)" (shown when ungraded submissions exist), "Approve All (N)" (shown when AI-graded submissions exist)
- Grading progress bar (animated, shown during the simulated bulk-grade operation)
- Status summary badges: Ungraded / AI Graded / Reviewed counts
- Submission list — each row is a collapsible card:
  - **Collapsed**: student name, status badge, score/percentage (hidden on mobile for ungraded)
  - **Expanded**:
    - Student submission text (read-only display)
    - Per-criterion mark inputs (editable numeric fields, capped at maxMarks)
    - AI feedback textarea (editable)
    - Strengths badges (green tinted)
    - Areas for Improvement badges (orange tinted)
    - Approve / Edit & Approve buttons (shown for `ai-graded` status)

**Grade statuses**: `ungraded`, `ai-graded`, `reviewed`, `published`

**Status**: Fully mock — simulates grading with a `setInterval` loop. No API calls are wired.

---

## 4. User Flows

### Flow 1: Teacher Generates an Exam Paper

1. Teacher navigates to AI Tools hub (`/teacher/ai-tools`) and clicks "Create Paper".
2. **Step 1**: Selects subject, grade, term, enters topic. Clicks Next.
3. **Step 2**: Sets duration, total marks, difficulty. Clicks Next.
4. **Step 3**: Configures sections — adjusts default three sections (MCQ, Short Answer, Long Answer) or adds/removes sections. Verifies section marks total equals total marks. Clicks "Generate Paper".
5. Step transitions to the generating animation screen (Step 4).
6. Frontend calls `POST /api/ai-tools/generate-paper` with the assembled payload. Backend synchronously calls Anthropic Claude and returns the full paper JSON.
7. On success, the wizard advances to Step 5 (Paper Preview), showing all sections and questions.
8. Teacher reviews each question. For any unsatisfactory question, they click the regenerate button — frontend calls `POST /api/ai-tools/papers/:id/regenerate-question` with the relevant `sectionIndex` and `questionIndex`. The replaced question renders in place.
9. Teacher can inline-edit any question text, then click the checkmark to confirm the edit — frontend calls `PUT /api/ai-tools/papers/:id` with the updated `sections` array.
10. Teacher clicks Save (updates paper) and optionally Export (generates a downloadable PDF or DOCX — scope TBD). Paper is now visible in the Paper Library.

### Flow 2: Teacher Views and Manages Paper Library

1. Teacher navigates to Paper Library (`/teacher/ai-tools/papers`).
2. Frontend calls `GET /api/ai-tools/papers?schoolId=...` and renders the list.
3. Teacher clicks the Eye icon on any paper to see a summary dialog.
4. Teacher clicks the Eye icon or the paper row to open the full paper detail — frontend calls `GET /api/ai-tools/papers/:id`.
5. Teacher may duplicate a paper (creates a new `draft` copy via a POST to generate or a dedicated duplicate endpoint — to be determined), or delete (soft-delete via `PUT /api/ai-tools/papers/:id` setting `isDeleted: true`, or a dedicated DELETE endpoint).

### Flow 3: Teacher Grades Submissions with AI (Single)

1. Teacher navigates to AI Grading Hub (`/teacher/ai-tools/grading`).
2. Teacher selects an assignment from the dropdown.
3. Teacher pastes or types a student's submission text into the submission input.
4. Teacher defines (or selects a saved) rubric — at minimum one criterion with a name, max score, and description.
5. Teacher clicks "Grade with AI" — frontend calls `POST /api/ai-tools/grade`.
6. Backend creates a `GradingJob` with status `queued` and enqueues a BullMQ job. The response (with the job ID) is returned immediately.
7. Frontend polls `GET /api/ai-tools/grade/:jobId` at a short interval until `status` becomes `completed`.
8. The AI result appears: per-criterion scores, overall feedback, strengths, and improvements.
9. Teacher reviews the result. If satisfied, clicks Approve — frontend calls `POST /api/ai-tools/grade/:jobId/review` with `finalMark` equal to `aiResult.totalMark`.
10. Teacher optionally edits `finalMark` or `teacherNotes` before approving.
11. Teacher clicks Publish — frontend calls `POST /api/ai-tools/grade/:jobId/publish`. Grade is now visible to the student.

### Flow 4: Teacher Bulk Grades an Assignment

1. Teacher navigates to AI Grading Hub and selects an assignment that has multiple ungraded submissions.
2. Teacher clicks "Grade All with AI".
3. Frontend collects all ungraded `submissionText` + `studentId` pairs into a `submissions` array and calls `POST /api/ai-tools/grade/bulk` along with the rubric.
4. Backend creates one `GradingJob` and one BullMQ queue entry per submission. The response is an array of queued job objects.
5. Frontend shows a progress bar. It polls all returned job IDs (or a list endpoint filtered by `assignmentId` and `status=completed`) until all jobs reach `completed`.
6. All graded submissions appear in the list with `ai-graded` status.
7. Teacher reviews each graded submission individually (expanding the row) and adjusts marks/feedback as needed.
8. Teacher clicks "Approve All" — frontend fires `POST /api/ai-tools/grade/:jobId/review` for each `ai-graded` job.
9. Teacher publishes each reviewed submission individually or triggers a bulk publish (bulk publish endpoint to be implemented).

### Flow 5: Teacher Saves and Exports a Generated Paper

1. After reviewing in the Paper Preview (Step 5 of the wizard), teacher clicks Save.
2. If not yet persisted (first save), frontend has already received the `GeneratedPaper` from the generate response. Any edits made since then are sent via `PUT /api/ai-tools/papers/:id`.
3. Teacher clicks Export — a PDF/DOCX rendering of the paper (student-facing copy without model answers, and a separate memorandum copy) is generated client-side or via a dedicated export endpoint. This export capability is not yet implemented in the backend.

---

## 5. Data Models

### GeneratedPaper

MongoDB collection: `generatedpapers`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated |
| `schoolId` | ObjectId (ref: School) | Required; indexed with `teacherId` |
| `teacherId` | ObjectId (ref: User) | Required; indexed with `schoolId` |
| `subject` | string | Required, trimmed |
| `grade` | number | Required; 1–12 |
| `term` | number | Required; 1–4 |
| `topic` | string | Required, trimmed |
| `difficulty` | `'easy' \| 'medium' \| 'hard' \| 'mixed'` | Required |
| `duration` | number | Required; minutes |
| `totalMarks` | number | Required |
| `sections` | IPaperSection[] | AI-generated; see below |
| `memorandum` | string | AI-generated full memorandum text; default `""` |
| `status` | `'generating' \| 'ready' \| 'edited'` | Default `'generating'`; transitions to `'ready'` after AI completes, `'edited'` after any manual change |
| `isDeleted` | boolean | Soft-delete flag; default `false` |
| `createdAt` | Date | Auto (timestamps) |
| `updatedAt` | Date | Auto (timestamps) |

**IPaperSection** (embedded, no `_id`):

| Field | Type | Notes |
|---|---|---|
| `sectionLabel` | string | e.g. `"Section A"` |
| `questionType` | string | e.g. `"Multiple Choice"` |
| `questions` | IPaperQuestion[] | |

**IPaperQuestion** (embedded, no `_id`):

| Field | Type | Notes |
|---|---|---|
| `questionNumber` | number | Sequential within the section |
| `questionText` | string | Full question as it appears on the paper |
| `marks` | number | Mark allocation for this question |
| `modelAnswer` | string | Full model answer for the memorandum |
| `markingGuideline` | string | Specific marking instructions |

**Indexes**:
- `{ schoolId: 1, teacherId: 1 }`
- `{ schoolId: 1, subject: 1, grade: 1 }`
- `{ status: 1 }`

---

### GradingJob

MongoDB collection: `gradingjobs`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated |
| `schoolId` | ObjectId (ref: School) | Required; indexed with `teacherId` |
| `teacherId` | ObjectId (ref: User) | Required |
| `assignmentId` | ObjectId | Required; indexed alone |
| `studentId` | ObjectId (ref: Student) | Required; indexed alone |
| `submissionText` | string | Required; the raw student submission |
| `rubric` | IRubricCriterion[] | Required; see below |
| `aiResult` | IAIResult | Optional; populated after BullMQ worker completes |
| `teacherOverride` | ITeacherOverride | Optional; populated after teacher reviews |
| `status` | `'queued' \| 'grading' \| 'completed' \| 'reviewed' \| 'published'` | Default `'queued'` |
| `isDeleted` | boolean | Default `false` |
| `createdAt` | Date | Auto |
| `updatedAt` | Date | Auto |

**IRubricCriterion** (embedded, no `_id`):

| Field | Type | Notes |
|---|---|---|
| `criterion` | string | Criterion name |
| `maxScore` | number | Maximum score for this criterion |
| `description` | string | What this criterion measures |

**IAIResult** (embedded, no `_id`):

| Field | Type | Notes |
|---|---|---|
| `totalMark` | number | Sum of all criterion scores |
| `maxMark` | number | Sum of all criterion maxScores |
| `percentage` | number | `(totalMark / maxMark) * 100` |
| `criteriaScores` | ICriteriaScore[] | One entry per rubric criterion |
| `overallFeedback` | string | Holistic AI assessment |
| `strengths` | string[] | List of identified strengths |
| `improvements` | string[] | List of areas for improvement |

**ICriteriaScore** (embedded, no `_id`):

| Field | Type | Notes |
|---|---|---|
| `criterion` | string | Matches the rubric criterion name |
| `score` | number | AI-assigned score |
| `maxScore` | number | From the rubric |
| `feedback` | string | Criterion-specific feedback |

**ITeacherOverride** (embedded, no `_id`):

| Field | Type | Notes |
|---|---|---|
| `finalMark` | number | Teacher-set final mark (may differ from `aiResult.totalMark`) |
| `teacherNotes` | string | Optional teacher commentary; default `""` |

**Indexes**:
- `{ schoolId: 1, teacherId: 1 }`
- `{ assignmentId: 1 }`
- `{ studentId: 1 }`
- `{ status: 1 }`

---

### AIUsageLog

MongoDB collection: `aiusagelogs`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated |
| `schoolId` | ObjectId (ref: School) | Required |
| `teacherId` | ObjectId (ref: User) | Required |
| `type` | `'paper_generation' \| 'question_regeneration' \| 'grading'` | Required |
| `tokensUsed.input` | number | Input token count |
| `tokensUsed.output` | number | Output token count |
| `aiModel` | string | Model identifier string, e.g. `"claude-sonnet-4-20250514"` |
| `createdAt` | Date | Auto (timestamps only — no `updatedAt`) |

**Indexes**:
- `{ schoolId: 1, createdAt: -1 }`
- `{ teacherId: 1, createdAt: -1 }`

**Note**: Token counts are currently stored as `0` in all log entries — the `AIService` logs actual token usage to the console but does not pass those values back to the caller in the current implementation.

---

## 6. State Management

The AI Tools module requires an `aiToolsStore` (to be implemented, e.g. with Zustand). The store must handle asynchronous generation, async job polling, and history browsing.

### Recommended Store Shape

```ts
interface AIToolsStore {
  // ── Paper generation ────────────────────────────────────────────
  generationStatus: 'idle' | 'generating' | 'ready' | 'error';
  currentPaper: GeneratedPaper | null;
  generationError: string | null;

  // Paper library
  papers: GeneratedPaper[];
  papersTotal: number;
  papersPage: number;
  papersLoading: boolean;

  // Per-question regeneration
  regeneratingQuestionKey: string | null; // "sectionIndex:questionIndex" or null

  // ── Grading ─────────────────────────────────────────────────────
  gradingJobs: GradingJob[];
  activeJobIds: string[];          // Jobs currently being polled
  pollingIntervalMs: number;       // Default: 3000

  // Bulk grading progress
  bulkGradingTotal: number;
  bulkGradingCompleted: number;

  // ── General ─────────────────────────────────────────────────────
  loading: boolean;
  error: string | null;
}
```

### Actions

| Action | Description |
|---|---|
| `generatePaper(payload)` | Calls `POST /generate-paper`, sets `generationStatus = 'generating'`, stores result in `currentPaper` on success |
| `loadPapers(filters, page)` | Calls `GET /papers`, populates `papers` array |
| `loadPaperById(id)` | Calls `GET /papers/:id`, sets `currentPaper` |
| `savePaper(id, updates)` | Calls `PUT /papers/:id`, updates `currentPaper` and the matching entry in `papers` |
| `regenerateQuestion(paperId, sectionIndex, questionIndex)` | Calls `POST /papers/:id/regenerate-question`, sets `regeneratingQuestionKey` during the request, updates `currentPaper` on response |
| `submitGrade(payload)` | Calls `POST /grade`, adds returned job to `gradingJobs`, starts polling |
| `submitBulkGrade(payload)` | Calls `POST /grade/bulk`, adds all returned jobs, starts polling each |
| `pollGradingJob(jobId)` | Calls `GET /grade/:jobId` on interval; stops polling when status is `completed`, `reviewed`, or `published` |
| `reviewGrade(jobId, finalMark, notes)` | Calls `POST /grade/:jobId/review`, updates job in store |
| `publishGrade(jobId)` | Calls `POST /grade/:jobId/publish`, updates job status in store |

### Polling Strategy

When a grading job is enqueued, the frontend should begin polling `GET /api/ai-tools/grade/:jobId` every 3 seconds. Polling stops when the job status reaches `completed`, `reviewed`, or `published`. During bulk grading, a single progress indicator should be derived from the ratio of `completed`-status jobs to the total batch size.

---

## 7. Components Needed

### Page-level components (to replace mock implementations)

| Component | Path | Description |
|---|---|---|
| `AIToolsOverviewPage` | `teacher/ai-tools/page.tsx` | Replace static data with live API calls for stats and recent activity |
| `CreatePaperPage` | `teacher/ai-tools/create-paper/page.tsx` | Wire `handleGenerate` to `POST /generate-paper`; wire `handleRegenerateQuestion` to `POST /papers/:id/regenerate-question`; wire `handleSave` to `PUT /papers/:id` |
| `PapersLibraryPage` | `teacher/ai-tools/papers/page.tsx` | Replace mock data with `GET /papers`; wire duplicate and delete actions to API |
| `GradingPage` | `teacher/ai-tools/grading/page.tsx` | Replace simulation with real API calls; implement polling |

### Shared / reusable components

| Component | Purpose |
|---|---|
| `PaperGeneratorForm` | Encapsulates Steps 1–3 of the wizard (paper details, config, sections); controlled via props so the parent page can pass form state up |
| `PaperPreview` | Renders a `GeneratedPaper` in full — sections, questions, model answers toggle; accepts a `paper: GeneratedPaper` prop |
| `QuestionCard` | A single question with edit mode toggle, inline textarea, marks badge, regenerate button; emits `onEdit(sectionIndex, questionIndex, text)` and `onRegenerate(sectionIndex, questionIndex)` |
| `SectionEditor` | Renders a `IPaperSection` with all its `QuestionCard` children; handles section-level marks display |
| `RubricBuilder` | Dynamic form for building or editing a rubric array; used in the grading flow to define assessment criteria before submitting |
| `SubmissionCard` | Collapsible card for a single `GradingJob`; shows student info in collapsed state and full AI result (criterion inputs, feedback textarea, strengths/improvements badges, approve/publish buttons) when expanded |
| `GradingProgressBar` | Animated progress bar driven by `bulkGradingCompleted / bulkGradingTotal`; shown during bulk grade polling |
| `AIResultViewer` | Read-only display of an `IAIResult` — total mark, percentage, per-criterion breakdown, feedback, strengths, improvements; used in both expanded `SubmissionCard` and a standalone detail view |
| `UsageStatsPanel` | Admin-only panel displaying `AIUsageLog` aggregates from `GET /usage`; shows total calls, total tokens, and a breakdown table by type |
| `PaperStatusBadge` | Badge that maps `PaperStatus` ('generating' / 'ready' / 'edited') to a visual variant |
| `GradingJobStatusBadge` | Badge that maps `GradingJobStatus` to a visual variant |

---

## 8. Integration Notes

### Academic Module

Paper generation requires `subject`, `grade`, and `term` inputs. These should be driven by the school's configured subjects and grade structure (from the School module's `settings`). Currently the frontend uses a static list of 8 subjects. The production implementation should fetch available subjects from the Academic module (or the School settings) to populate the subject dropdown.

### Homework / Assignments Module

The `GradingJob` model stores an `assignmentId` foreign key. The Grading Hub's assignment dropdown should be populated by calling the Homework/Assignments module's list endpoint, filtered to assignments that have received student submissions. The assignment selector currently uses 3 hard-coded items.

### Learning / Rubrics Module

If a Learning module stores reusable rubric templates, the `RubricBuilder` component should offer a "Load saved rubric" option that pre-fills the criteria from an existing template. The current implementation requires the teacher to define criteria from scratch on every grading session.

### Student Module

`GradingJob.studentId` references the Student collection. The grading hub should display student names by populating `studentId` via the API response (the service already calls `.populate('studentId', 'firstName lastName')`). The bulk grade submission flow requires a list of `studentId` values, which should be sourced from the Homework/Assignments module's submission list for the selected assignment.

### Notifications Module

When a grade is published (`status: 'published'`), a notification should be dispatched to the relevant student and/or parent. This integration is not implemented in the current backend — the `publishGrade` service method only updates the status field. A post-publish notification trigger (via the `NotificationService` or a notification queue job) needs to be added.

### BullMQ / Redis

AI grading is processed via the `ai-grading` BullMQ queue backed by Redis. The queue and worker configuration are in `src/jobs/queues.ts` and `src/jobs/ai-grading.job.ts`. In production, Redis connection parameters must be set via environment variables. The worker runs with concurrency 5 (matching the `AIService` semaphore limit) and automatically retries failed jobs up to 3 times before resetting the `GradingJob` status to `queued`.

### Anthropic AI Service

All AI calls go through `AIService` in `src/services/ai.service.ts`. The model is controlled by the `ANTHROPIC_MODEL` environment variable (default: `claude-sonnet-4-20250514`). Temperature is set to `0.7` for general completions and `0.3` for JSON generation (which also enforces strict JSON-only output). The service enforces max 5 concurrent calls with a 60-second timeout per call and a single automatic retry on 429/500 responses.

### Export / Print

The Create Paper page has an Export button (currently non-functional). A future export flow should generate two PDF/DOCX artefacts: (1) the student-facing paper (without `modelAnswer` and `markingGuideline`), and (2) the memorandum. This likely requires a server-side PDF generation service or a client-side rendering approach (e.g. `react-pdf` or `html2pdf`). This is outside the current backend scope.

---

## 9. Acceptance Criteria

### Paper Generation

- [ ] Teacher can complete all 5 wizard steps and receive a generated paper from the AI within 60 seconds.
- [ ] The generated paper is persisted to the database with `status: "ready"` and is immediately visible in the Paper Library.
- [ ] If the AI call fails, no orphaned `GeneratedPaper` document is left in the database and the teacher sees a clear error message.
- [ ] The teacher can click regenerate on any individual question; the question is replaced inline within 30 seconds and the paper's `status` transitions to `"edited"`.
- [ ] The teacher can inline-edit any question's text; changes are saved via `PUT /papers/:id` and `status` transitions to `"edited"`.
- [ ] Section marks total validator shows green when section marks match total marks and orange when they diverge.
- [ ] The paper wizard is blocked from advancing to the next step unless all required fields for the current step are filled.

### Paper Library

- [ ] The Paper Library loads and displays all non-deleted papers for the teacher's school, sorted by most recently created.
- [ ] Filters (subject, grade, status) narrow the results correctly.
- [ ] Duplicate creates a new draft paper with the same configuration.
- [ ] Delete soft-deletes the paper (it no longer appears in the library list).
- [ ] The preview dialog shows the correct metadata for the selected paper.

### AI Grading — Single Submission

- [ ] Teacher can define a rubric with at least one criterion and submit a student submission for grading.
- [ ] A `GradingJob` is created with status `queued` and the job ID is returned immediately.
- [ ] Within a reasonable time (under 30 seconds for a typical submission), the job status transitions to `completed` and the AI result is available.
- [ ] The teacher can view per-criterion scores, overall feedback, strengths, and improvements.
- [ ] The teacher can adjust individual criterion marks; the total is recalculated.
- [ ] The teacher can edit the AI feedback text before approving.
- [ ] Approving (reviewing) records the `teacherOverride` and transitions the job to `reviewed`.
- [ ] Publishing transitions the job to `published` and triggers the appropriate downstream notification (once the notification integration is implemented).

### AI Grading — Bulk

- [ ] Teacher can bulk-grade all ungraded submissions for an assignment in a single action.
- [ ] A progress indicator accurately reflects how many of the queued jobs have completed.
- [ ] "Approve All" marks all `ai-graded` jobs as `reviewed` in a single operation.
- [ ] Bulk grading does not block the UI; the teacher can navigate away and return to see updated results.

### Status Lifecycle

- [ ] `GradingJob` status transitions are enforced: review requires `completed`; publish requires `completed` or `reviewed`.
- [ ] A job that is already `published` cannot be re-reviewed or re-published.

### Usage Stats

- [ ] Admins can view AI usage statistics for their school with correct call counts grouped by type.
- [ ] Date range filters correctly narrow the aggregation window.
- [ ] Teachers (non-admin) cannot access the `/usage` endpoint (403 response).

### Performance and Reliability

- [ ] The `AIService` semaphore prevents more than 5 concurrent Anthropic calls.
- [ ] A failed grading job (after exhausting retries) resets to `queued` status rather than being stuck in `grading`.
- [ ] All API endpoints return within 2 seconds except those that make direct AI calls (which have a 60-second timeout).
