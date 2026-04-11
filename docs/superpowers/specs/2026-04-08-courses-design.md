# Courses — Design Spec

**Date:** 2026-04-08
**Status:** Approved for implementation planning
**Author:** Shaun Schoeman (via brainstorming session)

## Summary

A new `Course` feature lets teachers at a Campusly school (or university)
author self-paced, Udemy-style courses by composing existing Content Library
resources, Textbook chapters, Homework assignments, and Question Bank quizzes
into an ordered, gated learner journey. Courses go through a draft →
HOD review → published → assigned → learned → certificate lifecycle.
Students work through courses linearly, lessons auto-complete on interaction,
and a signed PDF certificate is issued on passing.

## Goals

1. **Teacher authoring** — a teacher can build a complete course in under 15
   minutes by picking existing resources, without writing any new content.
2. **HOD review gate** — HODs and school admins approve courses before they
   reach students, matching the existing `PaperModeration` flow.
3. **Self-paced learner experience** — students advance at their own pace,
   with linear unlock + auto-complete tracking + graded quiz gates.
4. **Completion certificates** — schools issue authentic, verifiable PDF
   certificates on course completion.
5. **Teacher analytics** — teachers see enrolment, completion rate, average
   quiz score, and per-lesson drop-off for each of their courses.
6. **Multi-tenant safe** — every query scoped by `schoolId` with
   `isDeleted: false`, consistent with the pitfalls in `CLAUDE.md`.

## Non-goals (phase 2 and beyond)

- Student self-enrolment from a catalog (MVP: assignment-only by teachers)
- Course versioning / editing after publish (MVP: archive → clone → republish
  for structural edits; metadata-only edits allowed without re-review)
- Discussion threads per lesson
- Drip content / date-scheduled unlocks
- Cross-tenant course marketplace (phase 3)
- Gradebook integration — course quiz marks do NOT flow into the term
  gradebook in MVP; quizzes are self-contained within the course
- Video hosting infrastructure — lessons reference existing `ContentResource`
  blocks which may contain video URLs, but Courses does not host video itself

## Audience & tenancy model

Universities join Campusly as just another flavour of "school" under the
existing `School` / `schoolId` multi-tenant model. No schema changes to
`School`. A single `modulesEnabled` flag — `'courses'` — gates the feature
per-tenant so rollout can be staged.

## Architecture

### Module boundary

A new backend module lives at `campusly-backend/src/modules/Course/` with
the standard shape:

```
Course/
  model.ts           All 7 Mongoose schemas + interfaces
  validation.ts      Zod schemas for create/update/assign/progress/quiz
  service.ts         Authoring + catalog + enrolment business logic
  service-progress.ts Split: progress tracking + quiz attempts + certificates
  service-pdf.ts     Certificate PDF rendering via pdfkit
  controller.ts      Express handlers
  routes.ts          Route definitions + auth/permission guards
```

`Course` is a new top-level module, **not** nested under Textbook or
ContentLibrary. A textbook is reference material; a course is a learner
journey with per-student state. They share content through references but
have different lifecycles, permissions, and UIs.

### Dependencies (references, not copies)

```
Course  ──references──▶  ContentLibrary.ContentResource
        ──references──▶  Textbook (textbookId + chapterId)
        ──references──▶  Homework
        ──references──▶  QuestionBank.Question
        ──references──▶  Academic (Class, Subject, Grade)
        ──references──▶  Auth.User (author, reviewer, enroler, learner)
        ──references──▶  Student
```

Course owns all its own models. It never copies content from other modules
— every lesson is a foreign-key reference. This means authors automatically
benefit from AI Studio, TikZ diagrams, and interactive blocks without any
duplication.

### App mount

In `campusly-backend/src/app.ts`:

```ts
app.use('/api/courses', authenticate, requireModule('courses'), coursesRoutes);
```

Add `'courses'` to the allowed module list. Schools that don't enable it
see no Course nav entries and get a 403 on the API.

## Data model

Seven collections, all multi-tenant (`schoolId`) and soft-deleted
(`isDeleted`).

### `courses`

The top-level container.

```ts
interface ICourse {
  _id: ObjectId;
  schoolId: ObjectId;                    // required, every query filters
  isDeleted: boolean;                    // default false

  title: string;
  slug: string;                          // unique per school
  description: string;                   // short blurb for catalog
  coverImageUrl?: string;

  subjectId?: ObjectId;                  // optional
  gradeLevel?: number;                   // optional, 1-12
  tags: string[];                        // free-form
  estimatedDurationHours?: number;

  // Authoring lifecycle
  createdBy: ObjectId;                   // ref User
  status: 'draft' | 'in_review' | 'published' | 'archived';
  publishedBy?: ObjectId;                // ref User (HOD/admin)
  publishedAt?: Date;
  reviewNotes?: string;                  // feedback on rejection

  // Completion rules
  // course.passMarkPercent = overall course pass mark (avg of graded
  // quizzes must meet this for a certificate). Lesson-level
  // passMarkPercent on individual quiz lessons gates just that lesson's
  // unlock, and defaults higher (70). The two are independent by design:
  // a student may pass every quiz gate individually but still miss the
  // course pass mark if their averages are low.
  passMarkPercent: number;               // default 60
  certificateEnabled: boolean;           // default true

  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `{ schoolId: 1, slug: 1 }` unique
- `{ schoolId: 1, status: 1 }`
- `{ schoolId: 1, createdBy: 1 }`

### `courseModules`

A module is a section within a course ("Week 1: Kinematics"). A course
can have many modules; a module can have many lessons. Separate collection
so reordering doesn't rewrite the whole course document.

```ts
interface ICourseModule {
  _id: ObjectId;
  schoolId: ObjectId;
  isDeleted: boolean;
  courseId: ObjectId;                    // ref Course
  title: string;
  orderIndex: number;                    // gap-allocated (10, 20, 30...)
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ courseId: 1, orderIndex: 1 }`

### `courseLessons`

A lesson is a thin reference to content elsewhere in the platform. The
`type` field is a tagged union and validation enforces that exactly one of
the foreign keys matches the type.

```ts
type LessonType = 'content' | 'chapter' | 'homework' | 'quiz';

interface ICourseLesson {
  _id: ObjectId;
  schoolId: ObjectId;
  isDeleted: boolean;
  courseId: ObjectId;
  moduleId: ObjectId;
  orderIndex: number;

  title: string;                         // overrides referenced resource title
  type: LessonType;

  // Exactly one of these must match `type`
  contentResourceId?: ObjectId;          // type='content'
  textbookId?: ObjectId;                 // type='chapter'
  chapterId?: ObjectId;                  // type='chapter' (sub-doc id within textbook)
  homeworkId?: ObjectId;                 // type='homework'
  quizQuestionIds?: ObjectId[];          // type='quiz', refs QuestionBank.Question

  // Quiz gating (only meaningful when type='quiz')
  isGraded: boolean;                     // default false for non-quiz
  passMarkPercent?: number;              // default 70
  isRequiredToAdvance: boolean;          // hard-gate next lesson on pass
  maxAttempts?: number | null;           // null = unlimited

  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ courseId: 1, moduleId: 1, orderIndex: 1 }`

**Zod validation:**
- `type === 'content'` requires `contentResourceId` and forbids the others
- `type === 'chapter'` requires both `textbookId` and `chapterId`
- `type === 'homework'` requires `homeworkId`
- `type === 'quiz'` requires non-empty `quizQuestionIds`

### `enrolments`

One row per (student, course). Created by bulk-insert when a teacher
assigns a course to a class.

```ts
interface IEnrolment {
  _id: ObjectId;
  schoolId: ObjectId;
  isDeleted: boolean;

  courseId: ObjectId;
  studentId: ObjectId;                   // ref Student (not User)
  enrolledBy: ObjectId;                  // ref User (the assigner)
  classId?: ObjectId;                    // null if self-enrolled
  enrolledAt: Date;

  status: 'active' | 'completed' | 'dropped';
  progressPercent: number;               // 0-100, denormalised
  completedAt?: Date;
  certificateId?: ObjectId;              // set on pass
}
```

**Indexes:**
- `{ courseId: 1, studentId: 1 }` unique (compound, allowing re-enrolment
  after an `isDeleted: true` row)
- `{ studentId: 1, status: 1 }`
- `{ courseId: 1, classId: 1 }` for teacher analytics

### `lessonProgress`

One row per (enrolment, lesson). Home of the auto-complete logic.

```ts
interface ILessonProgress {
  _id: ObjectId;
  schoolId: ObjectId;
  isDeleted: boolean;

  enrolmentId: ObjectId;
  studentId: ObjectId;
  courseId: ObjectId;
  lessonId: ObjectId;

  status: 'locked' | 'available' | 'in_progress' | 'completed';
  completedAt?: Date;

  // Auto-complete tracking
  interactionsDone: number;              // quiz blocks answered, etc.
  interactionsTotal: number;             // computed at first-open from content
  scrolledToEnd: boolean;                // for text-only lessons

  createdAt: Date;
  updatedAt: Date;
}
```

**Completion rule (per lesson type):**
- `type='content'` (ContentResource with interactive blocks):
  complete when `interactionsDone >= interactionsTotal` (`interactionsTotal`
  is computed at first open by counting interactive blocks in the resource)
- `type='content'` with no interactive blocks (pure text):
  complete when `scrolledToEnd === true`
- `type='chapter'` (textbook chapter):
  complete when `scrolledToEnd === true` AND any interactive blocks in
  the chapter are answered
- `type='homework'`:
  complete when a matching `HomeworkSubmission` exists for the student
  (checked on progress-write or via a lightweight polling endpoint the
  client calls on return to the player). The course does NOT grade the
  homework — that stays in the existing Homework module. Progress just
  reflects "submission present".
- `type='quiz'`:
  complete when a `QuizAttempt` exists with `passed === true` (or, if the
  quiz is `isGraded === false`, any attempt)

**Indexes:** `{ enrolmentId: 1, lessonId: 1 }` unique

### `quizAttempts`

Gated quiz lessons need attempt records so we know whether to unlock the
next lesson and whether the student has retries left.

```ts
interface IQuizAttempt {
  _id: ObjectId;
  schoolId: ObjectId;
  isDeleted: boolean;

  enrolmentId: ObjectId;
  studentId: ObjectId;
  courseId: ObjectId;
  lessonId: ObjectId;
  attemptNumber: number;                 // 1-indexed

  answers: Array<{
    questionId: ObjectId;
    answer: unknown;                     // shape depends on question type
    isCorrect: boolean;
    marks: number;
  }>;

  totalMarks: number;
  earnedMarks: number;
  percent: number;
  passed: boolean;
  submittedAt: Date;
}
```

**Indexes:** `{ enrolmentId: 1, lessonId: 1, attemptNumber: 1 }`

### `certificates`

Immutable record issued on course completion. Snapshots identity fields so
historical certificates stay accurate if a student's name or a course title
changes later.

```ts
interface ICertificate {
  _id: ObjectId;
  schoolId: ObjectId;
  isDeleted: boolean;

  enrolmentId: ObjectId;
  studentId: ObjectId;
  courseId: ObjectId;

  // Snapshotted fields
  studentName: string;
  courseName: string;
  schoolName: string;

  issuedAt: Date;
  issuedBy: ObjectId;                    // the course's publisher
  pdfUrl?: string;                       // populated after PDF generation
  verificationCode: string;              // unique, url-safe, 12 chars
}
```

**Indexes:**
- `{ verificationCode: 1 }` unique
- `{ enrolmentId: 1 }` unique (one cert per enrolment)

## API surface

All routes mount at `/api/courses`, guarded by `authenticate +
requireModule('courses')` except the public certificate verification
endpoint.

### Course authoring

```
POST   /api/courses                          Create draft
GET    /api/courses                          List (filters: status, subject, grade, mine)
GET    /api/courses/:id                      Full course + modules + lessons
PUT    /api/courses/:id                      Update metadata
DELETE /api/courses/:id                      Soft-delete

POST   /api/courses/:id/submit-for-review    draft → in_review
POST   /api/courses/:id/publish              in_review → published (HOD/admin)
POST   /api/courses/:id/reject               in_review → draft + reviewNotes
POST   /api/courses/:id/archive              published → archived

POST   /api/courses/:id/modules              Add module
PUT    /api/courses/:id/modules/:moduleId    Update module
DELETE /api/courses/:id/modules/:moduleId    Delete module (cascade lessons)
PATCH  /api/courses/:id/modules/reorder      Bulk reorder

POST   /api/courses/:id/lessons              Add lesson
PUT    /api/courses/:id/lessons/:lessonId    Update lesson
DELETE /api/courses/:id/lessons/:lessonId    Delete lesson
PATCH  /api/courses/:id/lessons/reorder      Bulk reorder
```

**Authorisation matrix:**

| Action | teacher (own) | teacher (other) | hod | school_admin | super_admin |
|---|---|---|---|---|---|
| Create draft | ✓ | — | ✓ | ✓ | ✓ |
| Edit draft / structure | ✓ | — | ✓ | ✓ | ✓ |
| Submit for review | ✓ | — | ✓ | ✓ | ✓ |
| Publish / reject | — | — | ✓ | ✓ | ✓ |
| Metadata edit on published (no re-review) | ✓ | — | ✓ | ✓ | ✓ |
| Structural edit on published | — | — | — | — | ✓ |
| Archive | ✓ | — | ✓ | ✓ | ✓ |

Structural edits to published courses require `archive → clone → edit →
resubmit`. Metadata edits (title, description, cover, tags) are allowed
inline without re-review so teachers can fix typos.

### Enrolment & catalog

```
GET    /api/courses/catalog                  List published courses in school
GET    /api/courses/catalog/:slug            Preview a published course

POST   /api/courses/:id/assign               Bulk-enrol a class { classId }
GET    /api/courses/:id/enrolments           Roster with progress
DELETE /api/enrolments/:id                   Unassign / drop

GET    /api/enrolments/me                    My active + completed courses
GET    /api/enrolments/:id                   Full structure + my progress
```

### Learner progression

```
GET    /api/enrolments/:id/lessons/:lessonId
       Returns: lesson content (from its referenced source) + gate state.
       Server checks the lesson is unlocked before returning content.

POST   /api/enrolments/:id/lessons/:lessonId/progress
       Body: { interactionsDone, scrolledToEnd }
       Recomputes status, unlocks next lesson if complete.
       Response: { lessonStatus, nextLessonUnlocked, progressPercent }

POST   /api/enrolments/:id/lessons/:lessonId/quiz-attempt
       Body: { answers: [{ questionId, answer }] }
       Grades server-side against Question Bank answer keys.
       Response: { attempt, passed, canRetry, nextLessonUnlocked }
```

The lesson-fetch endpoint enforces gating server-side. The client cannot
unlock a lesson by calling it directly — the server validates that all
prior gated lessons are complete.

### Certificates

```
GET    /api/enrolments/:id/certificate       Generate-or-return cert PDF URL
GET    /api/certificates/verify/:code        PUBLIC — verifies by code
```

The verify endpoint is the only un-authenticated route in the module. It
returns `{ valid, studentName, courseName, schoolName, issuedAt }` or
`{ valid: false }`. This deliberately leaks those four fields — that's what
a certificate is.

### Analytics

```
GET    /api/courses/:id/analytics
       Response: {
         enrolmentCount, activeCount, completedCount, droppedCount,
         completionRate, avgQuizScore, certificatesIssued,
         perLessonDropOff: [{ lessonId, title, studentsReached, studentsCompleted }],
         perClassBreakdown: [{ classId, className, enroled, completed }]
       }
```

One aggregation pipeline, one round-trip. Teacher/HOD/admin only.

## Certificate PDF generation

Reuses `pdfkit` (already in `campusly-backend/package.json`) and follows
the pattern in [QuestionBank/service-pdf.ts](C:\Users\shaun\campusly-backend\src\modules\QuestionBank\service-pdf.ts).

**Trigger:** When a student's progress hits 100% AND they pass the course
pass mark (avg of graded quiz attempts ≥ `course.passMarkPercent`) AND
`course.certificateEnabled === true`, the backend:

1. Creates a `Certificate` row with snapshotted fields and a random
   12-char `verificationCode`
2. Renders a PDF via `pdfkit`:
   - School letterhead (from `School.logoUrl` if present)
   - "Certificate of Completion"
   - Student name (large)
   - Course name
   - Issued date
   - Publisher name (the HOD/admin who published the course)
   - Verification code + URL at the bottom
3. Uploads the PDF via the existing file-upload service (same one used by
   attachments)
4. Stores the resulting URL on `certificate.pdfUrl`
5. Updates `enrolment.status = 'completed'`, `completedAt`, `certificateId`

**Lazy regeneration:** If `pdfUrl` is null when the student requests the
cert (first-ever download), generate on demand. Subsequent requests serve
the cached URL.

**Verification URL format:**
`https://<frontend-host>/verify/certificate/<code>` renders a public page
that calls the public API and shows the four snapshotted fields.

## Frontend surfaces

All new routes. No existing page is rewritten.

### Teacher — authoring

- **`/teacher/courses`** — list with status filters, "Create Course" CTA
- **`/teacher/courses/new`** — minimal create dialog
- **`/teacher/courses/[id]/edit`** — three-panel course builder
  - Left: drag-to-reorder module + lesson outline (using `@dnd-kit`)
  - Center: selected lesson editor with resource picker
  - Right: course metadata + status panel + submit-for-review
- **`/teacher/courses/[id]/assign`** — assign to class dialog
- **`/teacher/courses/[id]/analytics`** — stat cards + per-student table + per-lesson drop-off chart

The lesson editor does NOT author new content. To write a new lesson, the
teacher clicks "Create Content" which opens the existing Content Library
create flow in a new tab. They return and pick the new resource. This
keeps the course builder a pure composition tool.

**Autosave with dirty indicator** follows the same pattern as Gradebook
(introduced in the earlier teacher-UX pass): `isDirty` state + toast on
save + `useUnsavedChanges` hook for browser-level warning.

**Fast resource picker:** a command-palette-style fuzzy search that pulls
from ContentLibrary, Textbook chapters, Homework, and Question Bank in
parallel, with type badges so teachers can tell at a glance what they're
adding. One click to add. Under 15-minute course authoring is the success
metric.

### HOD / admin — review

- **`/admin/courses/review`** — queue of `in_review` courses
- **`/admin/courses`** — school-wide course list with author column

Click a queued course → read-only preview → Publish or Reject-with-notes.

### Student — learner

- **`/student/courses`** — grid of my enroled + completed courses with
  progress bars and certificate download links
- **`/student/courses/[id]`** — course home: outline, lock icons, Continue CTA
- **`/student/courses/[id]/learn/[lessonId]`** — lesson player
  - Collapsible outline sidebar (hidden on mobile, toggle button)
  - Main area renders lesson content via existing block renderers
  - Bottom bar: Previous / Next, disabled until completion rule satisfied
  - Throttled progress writes (500ms debounce) so the quiz block doesn't
    hammer the API on every keystroke
- **`/student/courses/[id]/certificate`** — embedded PDF preview + share URL

### Nav + module gate

- Add `Courses` entry to `TEACHER_NAV` with `module: 'courses'` gate
- Add `Courses` entry to student navigation (wherever that lives)
- Add `Course Review` entry to admin navigation with `module: 'courses'` +
  `isHOD || school_admin` permission check
- Add `'courses'` to the allow-list in `requireModule` middleware

## Error handling

All new service methods follow the existing module patterns:

- `NotFoundError` for missing entities (scoped by `schoolId + isDeleted`)
- `BadRequestError` for validation failures (Zod-parsed at route layer)
- `ForbiddenError` for authorisation failures (e.g. teacher editing another
  teacher's draft, student opening a locked lesson)
- Conflict errors for duplicate slugs, duplicate enrolments,
  already-published courses

The frontend uses the existing `extractErrorMessage` + toast pattern from
`api-helpers.ts`. The shared `ConfirmDialog` from the previous teacher-UX
pass is reused for destructive actions (delete course, archive, reject,
unassign).

## Testing strategy

Following the repo's existing conventions:

### Backend unit / integration
- **Authoring:** draft creation, update, state transitions, permission
  gates (teacher cannot edit another teacher's draft, only HOD/admin can
  publish)
- **Multi-tenancy:** every model's `findOne` includes `schoolId +
  isDeleted`; cross-school access returns 404
- **Lesson gating:** `lessonProgress` transitions, next-lesson unlock
  calculation, quiz attempt grading against Question Bank answer keys
- **Certificate generation:** PDF rendering produces a valid file;
  verification code is unique and URL-safe; verify endpoint returns the
  snapshotted fields
- **Analytics aggregation:** the single-aggregation pipeline returns
  correct counts on seeded data

### Frontend
- **Course builder:** drag-to-reorder persists via `/reorder` bulk
  endpoint, dirty state tracked, unsaved changes warning fires
- **Resource picker:** fuzzy search returns results from all four sources
  with correct type badges
- **Learner player:** locked lessons show lock icon and don't fetch content;
  auto-complete fires after interactions + scroll; quiz attempt UI handles
  pass/retry/exhausted states
- **Certificate page:** PDF renders, verification code is clickable and
  opens the public verify page

### Manual / smoke
- End-to-end: teacher creates course → adds 3 lessons (content, quiz,
  chapter) → submits → HOD publishes → teacher assigns to class → student
  works through it → certificate issues → verification URL renders

## Risks and open decisions

1. **Lesson content fetch volume** — each lesson-fetch is a round-trip.
   Acceptable for MVP, but if courses get dense (50+ lessons), the
   sidebar outline will need a lightweight metadata endpoint that returns
   just lesson titles + statuses, not the full referenced content. Flagged
   as "optimise later if needed".

2. **Question Bank answer schema** — quiz grading assumes the existing
   Question Bank stores canonical answers in a gradable shape. If the
   shape is non-uniform across question types (MCQ vs. structured vs.
   fill-blank), the grader needs per-type logic. Will verify during
   implementation planning by reading
   `campusly-backend/src/modules/QuestionBank/model.ts`.

3. **Progress throttling race conditions** — rapid progress writes could
   interleave (two quiz answers in flight at once). The progress endpoint
   must be idempotent and use atomic update operators (`$max` for
   `interactionsDone`, `$set` for `scrolledToEnd`). No
   optimistic-concurrency versioning needed for MVP.

4. **Certificate PDF visual design** — the actual certificate layout
   (fonts, colours, logo placement) isn't specified here. A default
   Campusly-branded template will ship; school-specific templates are
   phase 2. Flagged as "acceptable default, customisation later".

5. **Soft-delete + unique slug conflict** — if a teacher soft-deletes a
   course and creates another with the same slug, the unique index must
   account for `isDeleted`. Solution: partial unique index on
   `{ schoolId, slug }` filtered by `isDeleted: false`. Documented here so
   the migration/index creation step gets it right.

6. **Homework-lesson completion detection** — a homework lesson completes
   when the student submits the underlying Homework. The course doesn't
   own that submission, so we need to detect it. Two options:
   (a) the learner page polls `/homework/:id/submissions?studentId=me`
   when the student returns to the player, or (b) the Homework submission
   endpoint emits an event that Course listens for. MVP will use option
   (a) for simplicity; event-based coupling is a phase-2 refinement if
   polling becomes a bottleneck.

## Out of scope (explicit no)

- Gradebook integration for course quizzes
- Video hosting (Courses references video URLs stored in ContentResource)
- Student self-enrolment / open catalog
- Course versioning for published courses
- Drip / time-scheduled content
- Discussion threads per lesson
- Cross-school / marketplace publishing
- Translations — courses use the school's single language
- Prerequisites between courses
- Instructor-led cohorts / sync sessions

## Rollout plan

1. Ship behind `modulesEnabled: ['courses']` flag
2. Enable for 1–2 pilot schools
3. Collect feedback for 2 weeks
4. General availability: default `courses` to enabled for new schools;
   existing schools opt in via `School` admin settings
