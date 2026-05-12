# Student Portal — Phase 1 (Teacher-Centric MVP) — Design

**Status:** Design approved, ready for implementation plan
**Author:** Brainstormed with Shaun, 2026-05-13
**Related modules:** Lesson, Student, Homework, AITutor, AssessmentPaper, ContentLibrary, School (modulesEnabled)

---

## Goal

Ship a minimal, focused student portal that serves the **teacher-centric Phase 1 GTM**: a standalone teacher adds students to a class, those students log in and complete their academic duties (study lessons, do homework, take tests, ask the AI tutor). All school-wide modules (sports, library, tuck shop, wallet, careers, achievements, wellbeing, etc.) stay hidden until a school subscribes in Phase 2.

**Anti-goal:** rebuilding things that already work. Tests and AI Tutor are production-quality and get rescued, not rewritten. Fragmented surfaces (`/learn`, `/materials`, `/courses`, `/quizzes`) get collapsed into a single lesson-centric hub.

---

## Constraints

- Use existing `school.modulesEnabled` Redis-cached gating — no new infra.
- Standalone-teacher students may have no school modules; Phase 1 nav must work with an empty `modulesEnabled` set.
- All new backend code follows the CLAUDE.md landmines: every `findOne` includes `schoolId` + `isDeleted: false`; aggregation `$match` casts ObjectIds explicitly; Zod imports from `zod/v4`.
- Frontend rules: hooks own all `apiClient` calls; pages/components do zero API I/O; design tokens (`text-destructive`, not `text-red-*`); mobile-first responsive grids; dialog flex-col-with-sticky-footer pattern.
- Files under 350 lines.

---

## Information architecture

### Layout shell

[`src/app/(dashboard)/student/layout.tsx`](src/app/(dashboard)/student/layout.tsx) — dedicated student layout (not shared with teacher). Top bar shows school name (or "[Teacher Name]'s class" for standalone), student name, profile menu, AI Tutor shortcut. Wraps children in a `<RoleGuard role="student">` that redirects non-students to `/teacher`.

### Phase 1 nav (always visible — 6 items)

| Label | Path | Notes |
|---|---|---|
| Dashboard | `/student` | Rewritten |
| Lessons | `/student/lessons` | **NEW** — replaces `/learn`, `/materials`, `/courses`, `/quizzes`, `/learn/textbooks` |
| Homework | `/student/homework` | Rewritten |
| Tests | `/student/tests` | Rescued from existing implementation |
| AI Tutor | `/student/ai-tutor` | Rescued from existing implementation |
| Profile | `/student/profile` | **NEW** |

### Phase 2 nav (module-gated, hidden by default)

| Label | Path | Module flag |
|---|---|---|
| Timetable | `/student/timetable` | `academic` + class has timetable |
| Grades / Report Card | `/student/grades` | `academic` |
| Notifications | (TBD path) | `communication` |
| Library | `/student/library` | `library` |
| Wallet | `/student/wallet` | `wallet` |
| Tuck Shop | (TBD path) | `tuck_shop` |
| Achievements | `/student/achievements` | `achiever` |
| Sports | `/student/sports` | `sports` |
| Wellbeing | `/student/wellbeing` | `incident_wellbeing` |
| Careers | `/student/careers` | `careers` |
| Portfolio | `/student/portfolio` | `portfolio` (new flag, or fold into `achiever`) |
| Live Classroom | `/student/classroom` | `academic` + LiveKit configured |

### Module-gating mechanism

Single hook drives nav visibility:

```ts
useStudentModules() → {
  phase: 'standalone' | 'school',
  enabled: Set<ModuleKey>,
  loading: boolean,
}
```

Reads `useAuthStore().user.schoolId`, fetches `school.modulesEnabled` (cached). For a standalone-teacher's student where the school has no modules enabled, returns `phase: 'standalone'` and empty `enabled`. Phase 1 items are never gated.

The student sidebar imports a single `studentNavItems` array (`{ label, href, icon, module?: ModuleKey }`) and filters by the hook's result. No conditional JSX scattered across the layout.

---

## Surfaces

### 1. Dashboard — `/student/`

Single backend round-trip via `GET /api/student/dashboard`. No fan-out across 3+ hooks.

**Always shown:**
- **Hero** — "Welcome back, [FirstName]" + today's date. No house points / wallet badges.
- **Up next** (3 cards):
  - Most recent lesson → `/student/lessons/[id]`
  - Next homework due → `/student/homework/[id]` (or empty state)
  - Next test → `/student/tests/[paperId]` (or empty state)
- **Counts** (mini stat tiles): lessons this week, homework due this week, tests scheduled, homework overdue (red).
- **Ask AI Tutor** CTA card → `/student/ai-tutor`.

**Module-gated additions (Phase 2):** today's classes (timetable), announcements, wallet balance, house points.

### 2. Lessons hub — `/student/lessons` + `/student/lessons/[id]`

Replaces `/learn`, `/materials`, `/courses`, `/quizzes`, `/learn/textbooks`.

#### List view

- Filters: subject (multi-select), status (Upcoming / Taught / All), search by title.
- Default sort: most recent **taught** first, then upcoming **planned** chronologically.
- Card shows: lesson title, subject badge, scheduled date, "Taught"/"Upcoming" badge, material count, "has homework" pill, "has quiz" pill.
- Empty state: "Your teacher hasn't shared any lessons yet."

#### Detail view

Header: title, subject, scheduled/taught date, objectives (bulleted), duration.

Materials section — flat list ordered by the teacher's `phases` array. Phase shown as a small label badge on each card; no per-phase section headers (keeps visual noise down).

Per-material card behavior:

| Material kind | Behavior |
|---|---|
| `reading`, `study_notes`, `worked_example` | Open in modal reader (markdown/pdf/video/link based on `ContentResource.type`) |
| `worksheet`, `activity` | "Download" / "Open" |
| `quiz` | "Start quiz" → reusable `QuizPlayer` component |
| `practice_questions` | "Practice these" → same `QuizPlayer`, no-score mode |
| `homework` | Linked card → `/student/homework/[homeworkId]` (no inline submit UX) |
| `paper` | Linked card → `/student/tests/[paperId]` (no inline take UX) |
| `textbookRef` | "Read [textbook title], pages X–Y" — link if internal textbook, plain citation if external |
| `comprehensionQuestionIds` | Rendered under parent reading material as "Questions to think about" — non-submittable list |

Footer: **"Ask the AI Tutor about this lesson"** button → deep-links to `/student/ai-tutor?subjectId=...&context=...` with the lesson title pre-filled as opening context.

### 3. Homework — `/student/homework` + `/student/homework/[id]`

#### List view

Collapsible sections (most useful first):
- **Overdue** (red header) — past due, not submitted/graded
- **Due this week** — sorted by due date ascending
- **Submitted / Awaiting grade** — collapsed by default
- **Graded** — collapsed by default, shows mark

Each card: title, subject, source-lesson backlink ("From: [Lesson title]"), due date, status badge, "Open".

Filters: subject (multi), status. No type filter — cards visually distinguish.

#### Detail / submit view

Header: title, subject, source-lesson backlink, due date, marks-possible.

Body depends on homework type (per CLAUDE.md memory: homework is always typed — quiz / reading / exercise):
- **Quiz** → embedded reusable `QuizPlayer` component. Submission = answers.
- **Reading** → resource viewer + "Mark as read" button. Submission = acknowledgement.
- **Exercise** → resource viewer + answer entry (text + optional file upload, per existing `Homework` model capabilities). Submission = answer.

After submit: read-only view of submission + grade once graded.

### 4. Tests — `/student/tests` + `/student/tests/[paperId]`

**Rescued, not rewritten.** Existing implementation already covers: MCQ + free-text, 25s autosave, diagram support, submit-confirm dialog, status flow (`not_started` → `in_progress` → `submitted` → `graded` → `published`).

**Action items (verification only):**
1. Smoke test `useStudentAssignedPapers` and `useStudentTestTake` against a real teacher-assigned paper.
2. Wire into new student layout shell.
3. Add `?from=lesson:[id]` query-param support for contextual back-link when opened from a lesson page (default remains `/student/tests`).
4. Confirm types resolve without `any`.

### 5. AI Tutor — `/student/ai-tutor` + `/student/ai-tutor/practice`

**Rescued, not rewritten.** Existing implementation: chat with conversation history, subject selector, mobile sheet sidebar.

**Action items:**
1. Accept optional query params `?subjectId=&context=` so lesson-page footer CTA can deep-link with the lesson title pre-filled as opening user-message context.
2. Wire into new layout shell.
3. Smoke test `useAITutor` end-to-end from a fresh student account.

### 6. Profile — `/student/profile`

Minimal MVP. One page, two cards.

**Account card (always shown):**
- Name, email, role badge.
- Class name + teacher name (standalone) or "Grade [X] — [School name]".
- Change password button (links to existing reset-password flow, prefilled if possible).

**Preferences card (always shown):**
- Theme toggle (light/dark/system).
- Email notification opt-in toggle (single flag for now).

**Phase 2 additions:** parent contact info display (if `communication` enabled), linked guardians list.

Target file size: ~120 lines. Reuses `useAuthStore` + `useCurrentStudent`. No new backend endpoints; uses existing `/api/auth/me` + `PATCH /api/students/:id` (verify the update endpoint allows self-edit of preference fields; if not, add a `PATCH /api/student/preferences`).

---

## Backend

### New routes (mirroring `ContentLibrary/routes-student.ts` pattern)

| File | Purpose |
|---|---|
| [`src/modules/Lesson/routes-student.ts`](c:/Users/shaun/campusly-backend/src/modules/Lesson/routes-student.ts) | Mount student lesson endpoints |
| [`src/modules/Lesson/controller-student.ts`](c:/Users/shaun/campusly-backend/src/modules/Lesson/controller-student.ts) | Request handlers |
| [`src/modules/Lesson/service-student.ts`](c:/Users/shaun/campusly-backend/src/modules/Lesson/service-student.ts) | Queries + populate logic |
| [`src/modules/Lesson/validation-student.ts`](c:/Users/shaun/campusly-backend/src/modules/Lesson/validation-student.ts) | Zod query/param schemas (`zod/v4`) |
| `src/modules/Student/dashboard-controller.ts` (or fold into existing controller if under 350 lines) | `GET /api/student/dashboard` aggregator |

### Endpoints

**Added:**
```
GET /api/student/lessons
GET /api/student/lessons/:id
GET /api/student/dashboard
```

**Modified:**
- `GET /api/homework/:id` — add `sourceLesson: { id, title } | null` to response DTO. Either reverse-lookup via `Lesson.materials[].homeworkId` (no schema change, runtime cost) or denormalise `lessonId` onto `Homework` (schema change, faster). **Open question — see below.**

### Mounting

```ts
app.use('/api/student/lessons', authenticate, studentLessonRoutes);
app.use('/api/student/dashboard', authenticate, studentDashboardRoutes);
```

**No `requireModule` gate** — Phase 1 standalone-teacher students have no school modules enabled. Same pattern as `/api/students`.

### Authorisation invariant (multi-tenancy)

For every endpoint:
1. Resolve current student from JWT: `user.id → Student where userId = user.id, isDeleted: false`.
2. Every query (list or single-entity) includes `schoolId: student.schoolId` AND `isDeleted: false`.
3. Lesson visibility filter: `status: { $in: ['ready', 'taught'] }, 'assignedClasses.classId': student.classId`.
4. Aggregation `$match` on `schoolId` casts ObjectId explicitly: `new mongoose.Types.ObjectId(schoolId)`.

### Dashboard endpoint shape

```ts
GET /api/student/dashboard → {
  recentLesson: StudentLessonSummary | null,
  nextHomework: { id, title, subject, dueAt } | null,
  nextTest:     { paperId, title, subject, releaseAt, dueAt } | null,
  counts: {
    lessonsThisWeek: number,
    homeworkDueThisWeek: number,
    testsScheduled: number,
    homeworkOverdue: number,
  },
}
```

### Lesson list endpoint shape

```ts
GET /api/student/lessons?subjectId=&status=&search= → StudentLessonSummary[]

interface StudentLessonSummary {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  scheduledDate: string;        // ISO
  status: 'planned' | 'taught'; // derived from assignedClass.status for this student's class
  materialCount: number;
  hasHomework: boolean;
  hasQuiz: boolean;
}
```

### Lesson detail endpoint shape

```ts
GET /api/student/lessons/:id → StudentLessonDetail

interface StudentLessonDetail extends StudentLessonSummary {
  objectives: string[];
  durationMinutes: number;
  materials: StudentLessonMaterial[];   // ordered per teacher's phases[] array
}

interface StudentLessonMaterial {
  id: string;
  kind: 'reading' | 'worksheet' | 'activity' | 'study_notes'
      | 'worked_example' | 'quiz' | 'practice_questions'
      | 'homework' | 'paper';
  title: string;
  teacherNotes?: string;
  phase: string;                        // from LESSON_PHASES, for badge
  // Resolved references — only one set populated based on kind:
  contentResource?: { id, type, title, url? };
  quiz?: { id, title, questionCount };
  homework?: { id, title, dueAt, status };
  paper?:   { paperId, title, releaseAt?, dueAt? };
  textbookRef?: { source, title, pageStart?, pageEnd?, internalId? };
  comprehensionQuestions?: Array<{ id, prompt }>;
}
```

---

## Frontend additions / changes

### New files

- [`src/app/(dashboard)/student/layout.tsx`](src/app/(dashboard)/student/layout.tsx) — student layout shell with `RoleGuard`
- [`src/app/(dashboard)/student/lessons/page.tsx`](src/app/(dashboard)/student/lessons/page.tsx) — list
- [`src/app/(dashboard)/student/lessons/[id]/page.tsx`](src/app/(dashboard)/student/lessons/[id]/page.tsx) — detail
- [`src/app/(dashboard)/student/profile/page.tsx`](src/app/(dashboard)/student/profile/page.tsx)
- [`src/hooks/useStudentLessons.ts`](src/hooks/useStudentLessons.ts)
- [`src/hooks/useStudentLesson.ts`](src/hooks/useStudentLesson.ts)
- [`src/hooks/useStudentDashboard.ts`](src/hooks/useStudentDashboard.ts) — replaces existing fan-out version
- [`src/hooks/useStudentModules.ts`](src/hooks/useStudentModules.ts) — nav gating
- [`src/components/student/StudentSidebar.tsx`](src/components/student/StudentSidebar.tsx) — desktop nav
- [`src/components/student/StudentBottomNav.tsx`](src/components/student/StudentBottomNav.tsx) — mobile nav
- [`src/components/student/LessonCard.tsx`](src/components/student/LessonCard.tsx)
- [`src/components/student/LessonMaterialCard.tsx`](src/components/student/LessonMaterialCard.tsx)
- [`src/components/student/LessonResourceReader.tsx`](src/components/student/LessonResourceReader.tsx) — modal viewer for `ContentResource` (handles markdown / pdf / video / external link based on `ContentResource.type`); extracted from the deleted `/student/learn/[resourceId]/page.tsx` if reusable, otherwise built fresh
- [`src/components/student/AskAITutorCTA.tsx`](src/components/student/AskAITutorCTA.tsx)
- [`src/components/learning/QuizPlayer.tsx`](src/components/learning/QuizPlayer.tsx) — extracted from `/student/quizzes/page.tsx`, reused by lesson detail + homework detail
- [`src/components/auth/RoleGuard.tsx`](src/components/auth/RoleGuard.tsx) — role-aware guard mirroring `AuthGuard`
- [`src/types/lesson-student.ts`](src/types/lesson-student.ts) — `StudentLessonSummary`, `StudentLessonDetail`, `StudentLessonMaterial`
- [`src/lib/student-nav.ts`](src/lib/student-nav.ts) — `studentNavItems` array (Phase 1 + Phase 2 with `module` flag)

### Rewritten files

- [`src/app/(dashboard)/student/page.tsx`](src/app/(dashboard)/student/page.tsx) — new dashboard layout, single hook
- [`src/app/(dashboard)/student/homework/page.tsx`](src/app/(dashboard)/student/homework/page.tsx) — sectioned IA
- [`src/app/(dashboard)/student/homework/[id]/page.tsx`](src/app/(dashboard)/student/homework/[id]/page.tsx) — typed submission flows + source-lesson backlink

### Light-touch files (rescued)

- [`src/app/(dashboard)/student/tests/page.tsx`](src/app/(dashboard)/student/tests/page.tsx) — verify hooks, wire into new layout
- [`src/app/(dashboard)/student/tests/[paperId]/page.tsx`](src/app/(dashboard)/student/tests/[paperId]/page.tsx) — add `?from=lesson:[id]` back-link support
- [`src/app/(dashboard)/student/ai-tutor/page.tsx`](src/app/(dashboard)/student/ai-tutor/page.tsx) — accept `?subjectId=&context=` query params
- [`src/app/(dashboard)/student/ai-tutor/practice/page.tsx`](src/app/(dashboard)/student/ai-tutor/practice/page.tsx) — wire into new layout

### Deleted files / folders

| Path | Reason |
|---|---|
| `src/app/(dashboard)/student/learn/` (entire subtree) | Replaced by `/student/lessons` |
| `src/app/(dashboard)/student/materials/` | Replaced by `/student/lessons` |
| `src/app/(dashboard)/student/courses/` (entire subtree) | Replaced by `/student/lessons` |
| `src/app/(dashboard)/student/quizzes/` | Quiz player extracted to component, no top-level route |
| `src/hooks/useStudentLearning.ts` | Backed deleted pages |
| `src/hooks/useStudentMaterials.ts` | Backed deleted pages |
| `src/hooks/useStudentQuizzes.ts` (if exists) | Backed deleted pages |
| `src/hooks/useStudentCourses.ts` (if exists) | Backed deleted pages |
| `src/hooks/useStudentHomeworkDashboard.ts` | Folded into `useStudentDashboard` |
| Student slices of `useLearningStore` / `useLearningApi` | Prune to teacher-only paths |
| Types in `src/types/` exported only by the deleted hooks | Cleanup |

### Parked files / folders (no code change — nav entry only removed)

`/student/timetable/`, `/student/grades/`, `/student/wallet/`, `/student/library/`, `/student/achievements/`, `/student/sports/`, `/student/wellbeing/`, `/student/careers/**`, `/student/portfolio/`, `/student/classroom/**`.

These keep working at their URL. Sidebar simply doesn't link to them. Zero regression risk; zero rebuild cost for Phase 2.

---

## Student onboarding (auth flow)

When a teacher adds a student to a class, the student needs login credentials. **Hybrid model — teacher chooses per student** at student-creation time:

### Path 1 — Email invite

Teacher enters student email → backend creates `User` (role `student`) with random one-time token → emails student a "set your password" link (reuses existing `/auth/reset-password` machinery via a parallel invite endpoint). After setting, student lands at `/student`.

### Path 2 — Printable credentials

Teacher enters student name only → backend creates `User` with auto-generated username (e.g. `firstname-lastname-NNNN`) and random initial password → teacher downloads a one-time printable slip with both credentials → `mustChangePassword: true` flag forces a change on first login.

Covers secondary students with email AND younger primary students without. Matches the Phase 1 teacher-centric mental model.

### Backend deltas (verify before implementing)

- Verify `POST /api/students` already creates a `User` with `role: 'student'`, `schoolId`, generated credential, `mustChangePassword: true`. If not, add.
- Verify or add `POST /api/auth/invite-accept` (or extend `reset-password`) for the email-link path.
- **Frontend prerequisite (out of this spec, but a hard blocker):** an `AddStudentDialog` variant on the teacher class-roster page with the two-path toggle.

### Frontend role gating

`<RoleGuard role="student">` inside `src/app/(dashboard)/student/layout.tsx`. Redirects non-students to `/teacher`. Mirrors the existing `AuthGuard` pattern.

---

## Open questions to resolve before implementation

1. **Standalone-teacher `schoolId`** — does a standalone teacher have a synthetic `School` document, so their students have a `schoolId`? Implementation needs either confirmation it exists, or a design for a synthetic school per standalone teacher.
2. **`modulesEnabled` for standalone schools** — what's in the array for Phase 1? Probably `[]` or `['academic']`. Determines whether parked pages stay parked or partially light up.
3. **Onboarding path preference** — hybrid (email + printable) as recommended, or pick one path only for MVP simplicity?
4. **Homework → Lesson backlink storage** — reverse-lookup via `Lesson.materials[].homeworkId` (no schema change, runtime cost) or denormalise `lessonId` onto `Homework` (schema change, faster)?
5. **Quiz player** — does a reusable quiz-taking component exist anywhere, or is it currently inlined into `/student/quizzes/page.tsx`? Determines whether extraction is a refactor or a fresh build.

---

## Non-goals (explicit Phase 2 deferrals)

- Notifications / announcements feed
- Sports, library, wallet, tuck shop, careers, wellbeing, achievements, portfolio, live classroom — all parked
- Parent-portal integrations
- Push notifications / mobile app
- Offline mode for tests
- Collaborative lesson workspace (Yjs/tldraw) for students — teacher-only for now

---

## Success criteria

- A standalone teacher signs up, creates a class, adds a student (either invite path), creates a lesson with materials + a homework + assigns a test.
- The student logs in, sees a dashboard with the lesson and homework in "Up next", opens the lesson page, reads each material kind correctly, opens the homework via the lesson backlink, submits it, opens the test from `/student/tests`, completes it with autosave, asks the AI tutor a question.
- All without seeing any nav entry for sports, library, wallet, etc.
- Every backend query is `schoolId`-scoped (verified by a multi-tenant integration test creating two schools and asserting cross-school isolation).
- All new files under 350 lines; zero `any` types; design tokens used throughout; mobile-responsive at 360px width.
