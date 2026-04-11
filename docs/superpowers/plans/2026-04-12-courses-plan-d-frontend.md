# Courses Plan D — Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the entire Courses frontend on top of the complete backend (Plans A + B + C). After this plan, teachers can build courses via a three-panel builder UI, HODs can review and publish them through a dedicated queue, students can browse a catalog, open a Coursera-style lesson player with linear unlock, attempt quizzes and see instant grading, earn certificates, and download a branded PDF. Teachers see a per-course analytics dashboard. Anyone with a verification code can check a certificate at a public landing page.

**Architecture:** Next.js 16 App Router pages under `src/app/(dashboard)/` for authenticated surfaces (`teacher/courses/*`, `admin/courses/*`, `student/courses/*`) plus a separate top-level `src/app/verify/certificate/[code]/page.tsx` OUTSIDE the dashboard group for the public verify landing page. All API calls flow through typed hooks in `src/hooks/useCourses*.ts` that wrap `apiClient`, so pages stay as thin orchestrators per the repo rule. Lesson content renders through the existing `BlockRenderer` at `src/components/content/renderers/BlockRenderer.tsx` — no new content authoring UI, just composition of existing blocks. The course builder is WYSIWYG by construction: its two-pane layout is literally the student lesson player wrapped with drag handles and a resource picker.

**Tech Stack:** Next.js 16.2.1 (React 19, App Router, Turbopack), Zustand, Axios, React Hook Form + Zod, Tailwind CSS 4, Sonner (toasts), Lucide icons. Design tokens from the existing design system — no new colors, no new typography. Drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable` (standard React DnD library, likely already a dependency — check before assuming).

**Related:**
- [Design spec](../specs/2026-04-08-courses-design.md)
- [Plan A — Backend foundation](2026-04-08-courses-plan-a-backend-foundation.md)
- [Plan B — Student experience](2026-04-08-courses-plan-b-student-experience.md)
- [Plan C — Certificates + analytics](2026-04-08-courses-plan-c-certificates-analytics.md)

**Plans A + B + C status:** All complete and pushed to `campusly-backend/origin/master`. Every endpoint the frontend needs exists, is typed, is tested via the smoke script, and is documented in the design spec.

**Plan D scope:**
- IN: Teacher authoring (list, create, builder, assign), HOD review queue, student catalog, my-courses, course home, lesson player, certificate download, teacher analytics dashboard, public verify page, nav entries, module gate, types + hooks layer, `@dnd-kit` dependency if not already present
- OUT: New content authoring inside the course builder (teacher clicks "Create Content" which opens the existing Content Library flow in a new tab), drip content / date-scheduled unlocks, discussion threads, multi-select MCQ, cross-tenant marketplace, custom certificate templates per school, certificate revocation UI, bulk operations

---

## Critical decisions made by this plan

These shape Plan D's implementation. Explicit so implementers don't rediscover them.

### 1. Fixed layouts — no teacher-chosen templates

Per the design spec's "UX constraints" section, every course looks identical in structure. Teachers cannot change fonts, colours, spacing, navigation, or block rendering. The only per-course customisation is the cover image and the text content the teacher provides. This means Plan D builds exactly three page shells:

- **Course home** — hero band + description + progress bar + collapsible module/lesson outline
- **Lesson player** — two-pane layout (outline sidebar + main content) with Previous/Next bottom bar
- **Course builder** — same two-pane layout as the lesson player, but in edit mode with drag handles and a resource picker panel

The builder is the student view with edit affordances. That's the single most important UX decision from the spec — teachers see what students will see.

### 2. `BlockRenderer` is the single source of truth for lesson content rendering

The existing `src/components/content/renderers/BlockRenderer.tsx` handles markdown, LaTeX, TikZ diagrams, `QuizBlock`, `FillBlankBlock`, `MatchColumnsBlock`, `OrderingBlock`, `VideoBlock`, `ImageBlock`, `CodeBlock`, and the others. Plan D does NOT invent new renderers. The lesson player calls `<BlockRenderer blocks={lesson.source.resource.blocks} />` for `type='content'` lessons, `<BlockRenderer blocks={lesson.source.chapter.resources[i].blocks} />` for `type='chapter'` lessons, and a purpose-built quiz shell for `type='quiz'` lessons (because the quiz questions come from Question Bank, not from a ContentResource's blocks).

### 3. Student navigation lives under STUDENT_NAV, teacher under TEACHER_NAV

The repo already has `STUDENT_NAV` and `TEACHER_NAV` tuples in `src/lib/constants.ts` gated by the `module` field. Plan D adds a `Courses` entry to both, gated by `module: 'courses'` (matching the backend's `BOLT_ON_MODULES` flag from Plan A Task 1). HODs see the review queue via a permission-gated entry in `TEACHER_NAV` (matching the existing `isHOD` pattern for "HOD Oversight"). School admins see their course management via `ADMIN_NAV`.

### 4. Public verify page is NOT under `(dashboard)`

Every existing page lives under `src/app/(dashboard)/*` with the dashboard's auth guard layout. The public verify page cannot have an auth guard — anyone must be able to load it, including unregistered users. It lives at `src/app/verify/certificate/[code]/page.tsx` outside the dashboard group. A minimal `src/app/verify/layout.tsx` provides a clean standalone shell (header, Campusly branding, no sidebar, no nav). This is the one page in the whole app that doesn't live under `(dashboard)`.

### 5. Drag-and-drop via `@dnd-kit`

`@dnd-kit/core` + `@dnd-kit/sortable` is the canonical React DnD library. Check `package.json` before assuming it's installed — if not, Task 1 adds it. The course builder's outline panel uses `DndContext` + `SortableContext` + `useSortable` for within-module and cross-module lesson reordering. On drop, the client POSTs the new `orders[]` array to `/api/courses/:id/lessons/reorder` (from Plan A) with optimistic UI update and rollback on error.

### 6. Hooks own all API calls, pages are thin orchestrators

Repo rule from `CLAUDE.md`: zero `apiClient` imports in any page or component file. Every Plan D page uses a hook like `useTeacherCourses`, `useCourseBuilder`, `useStudentCourses`, `useLessonPlayer`, `useCourseAnalytics`, `useCertificate`, or `useCertificateVerify`. The hooks live in `src/hooks/`, return typed data + typed mutation callbacks, and handle error toasting + optimistic updates.

### 7. Types mirror the backend interfaces, not the lean query shapes

Plan D adds `src/types/courses.ts` with TypeScript interfaces matching the backend's `ICourse`, `ICourseModule`, `ICourseLesson`, `IEnrolment`, `ILessonProgress`, `IQuizAttempt`, `ICertificate`, and `CourseAnalytics` shapes. These mirror the Mongoose interfaces but use `id: string` instead of `_id: ObjectId` because the frontend's `api-client.ts` normalises `_id → id` in every response. The frontend never sees a raw ObjectId.

### 8. Progress writes are debounced

The lesson player calls `/api/enrolments/:id/lessons/:lessonId/progress` on every student interaction — `interactionsDone` increments when they answer a block, `scrolledToEnd` flips when they reach the bottom of a text lesson. To avoid hammering the API on every keystroke inside a fill-blank, Plan D debounces the progress writes by 500ms and batches adjacent state changes into a single request. The quiz attempt submission is a separate, non-debounced single-shot call because it's user-initiated.

### 9. Certificate download is a direct fetch, not JSON

The backend returns a binary PDF with `Content-Type: application/pdf`. The frontend uses `window.location.href = '/api/enrolments/:id/certificate'` with the JWT in a query parameter — wait, no, the JWT lives in `localStorage` and `Authorization: Bearer ...`, not a cookie. So `window.location.href` won't attach it. Instead, the frontend does `fetch(url, { headers: { Authorization: ... } })` → `response.blob()` → `URL.createObjectURL(blob)` → trigger a download via a hidden `<a download>` element. This is the standard pattern for authenticated binary downloads in the repo; check `src/components/shared/ExportButton.tsx` or similar for the existing implementation first and match it.

---

## File Structure

### New files

#### Types + hooks layer
- `src/types/courses.ts` — `Course`, `CourseModule`, `CourseLesson`, `Enrolment`, `LessonProgress`, `QuizAttempt`, `Certificate`, `CourseAnalytics`, `LessonSource` (tagged union)
- `src/hooks/useTeacherCourses.ts` — list + create + delete + publish/reject for course authoring
- `src/hooks/useCourseBuilder.ts` — fetch one course with modules+lessons, add/update/delete/reorder modules and lessons, submit for review, autosave dirty state
- `src/hooks/useCourseResourcePicker.ts` — fuzzy search across ContentLibrary / Textbook chapters / Homework / Question Bank in parallel
- `src/hooks/useCourseAssign.ts` — assign to class dialog flow
- `src/hooks/useCourseReviewQueue.ts` — HOD review queue list + publish/reject actions
- `src/hooks/useStudentCourses.ts` — catalog + my-enrolments + catalog preview
- `src/hooks/useLessonPlayer.ts` — enrolment detail fetch, lesson fetch with gating, progress write (debounced), quiz submit
- `src/hooks/useCertificate.ts` — certificate download trigger + verification helper
- `src/hooks/useCourseAnalytics.ts` — analytics dashboard fetch

#### Teacher authoring pages
- `src/app/(dashboard)/teacher/courses/page.tsx` — list page with status filters + create button
- `src/app/(dashboard)/teacher/courses/[id]/edit/page.tsx` — course builder (three panels)
- `src/app/(dashboard)/teacher/courses/[id]/assign/page.tsx` — assign-to-class dialog (alternatively a modal on the list page)
- `src/app/(dashboard)/teacher/courses/[id]/analytics/page.tsx` — analytics dashboard

#### Teacher authoring components
- `src/components/courses/CourseCard.tsx` — list item showing cover + title + status + subject
- `src/components/courses/CreateCourseDialog.tsx` — minimal create form (title, slug, description, subject, grade)
- `src/components/courses/CourseBuilderOutline.tsx` — left panel: drag-sortable modules/lessons
- `src/components/courses/CourseBuilderLessonEditor.tsx` — center panel: selected lesson metadata + resource picker + quiz settings
- `src/components/courses/CourseBuilderMetaPanel.tsx` — right panel: title, description, cover, tags, status, submit-for-review
- `src/components/courses/ResourcePickerDialog.tsx` — fuzzy-search command palette (the critical UX piece)
- `src/components/courses/AssignCourseDialog.tsx` — class picker + student count preview
- `src/components/courses/LessonTypeBadge.tsx` — small pill showing the lesson type icon + label

#### HOD/admin review
- `src/app/(dashboard)/admin/courses/review/page.tsx` — queue view
- `src/app/(dashboard)/admin/courses/page.tsx` — school-wide course list (for admins)
- `src/components/courses/ReviewQueueItem.tsx` — list item in the queue
- `src/components/courses/CoursePreviewDialog.tsx` — read-only course preview with publish/reject actions

#### Student experience
- `src/app/(dashboard)/student/courses/page.tsx` — "My Courses" grid + catalog tab
- `src/app/(dashboard)/student/courses/[id]/page.tsx` — course home
- `src/app/(dashboard)/student/courses/[id]/learn/[lessonId]/page.tsx` — lesson player
- `src/app/(dashboard)/student/courses/[id]/certificate/page.tsx` — certificate download + verify URL display
- `src/components/courses/MyCoursesGrid.tsx` — enroled course cards with progress bars
- `src/components/courses/CatalogGrid.tsx` — published courses grid
- `src/components/courses/CourseHome.tsx` — hero + outline + continue-where-you-left-off CTA
- `src/components/courses/LessonPlayerShell.tsx` — two-pane layout used by both lesson player AND course builder
- `src/components/courses/LessonOutlineSidebar.tsx` — collapsible left sidebar with lock icons + completion ticks
- `src/components/courses/LessonQuizShell.tsx` — quiz lesson UI (render questions, collect answers, submit, show result)
- `src/components/courses/CertificateDownloadCard.tsx` — embedded preview + download button + shareable verify URL

#### Analytics
- `src/components/courses/AnalyticsStatCards.tsx` — four stat cards (enrolments, completion, avg score, certs)
- `src/components/courses/LessonDropOffChart.tsx` — per-lesson bar chart (uses Recharts, already a repo dep)
- `src/components/courses/ClassBreakdownTable.tsx` — per-class enrolment + completion table

#### Public verify (OUTSIDE dashboard group)
- `src/app/verify/layout.tsx` — minimal standalone layout
- `src/app/verify/certificate/[code]/page.tsx` — public verification landing page
- `src/components/courses/VerifyResultCard.tsx` — the card shown on valid/invalid verification

### Modified files

- `src/lib/constants.ts` — add `TEACHER_COURSES`, `TEACHER_COURSE_EDIT`, `TEACHER_COURSE_ANALYTICS`, `ADMIN_COURSES`, `ADMIN_COURSE_REVIEW`, `STUDENT_COURSES`, `STUDENT_COURSE_HOME`, `STUDENT_LESSON_PLAYER`, `STUDENT_CERTIFICATE` to `ROUTES`; add `Courses` entries to `TEACHER_NAV` and `STUDENT_NAV` with `module: 'courses'` gate; add review queue entry to admin nav
- `package.json` + `package-lock.json` — add `@dnd-kit/core` + `@dnd-kit/sortable` if not already present

### Why this structure

- **One `src/types/courses.ts` file** — all Course types in one place. If the backend ever reshapes `ICourse`, there's one frontend file to update. Existing convention in the repo is one types file per domain under `src/types/`.
- **Hooks organised by user role** — `useTeacherCourses` / `useStudentCourses` / `useCourseAnalytics` etc. Matches how `useTeacherHomework` / `useStudentHomework` already split.
- **Components under `src/components/courses/`** — one folder for the whole feature. Matches the existing `src/components/homework/`, `src/components/grades/` etc. patterns.
- **Pages are thin** — no page file over ~150 lines, everything nontrivial delegates to a hook + components.

---

## Task 1 — Types + install `@dnd-kit`

**Files:**
- Create: `src/types/courses.ts`
- Modify: `src/types/index.ts` (add export)
- Possibly modify: `package.json` + `package-lock.json`

### Step 1 — Check `@dnd-kit`

```bash
cd c:\Users\shaun\campusly-frontend
grep -E '"@dnd-kit' package.json
```

If neither `@dnd-kit/core` nor `@dnd-kit/sortable` is present, install:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

If they're already there, skip the install step.

### Step 2 — Create `src/types/courses.ts`

```ts
/**
 * Frontend-facing types for the Courses feature. These mirror the
 * backend's Mongoose interfaces but use `id: string` (the frontend's
 * api-client.ts normalises _id → id in every response) and replace
 * ObjectId values with strings.
 */

export type CourseStatus = 'draft' | 'in_review' | 'published' | 'archived';
export type LessonType = 'content' | 'chapter' | 'homework' | 'quiz';
export type EnrolmentStatus = 'active' | 'completed' | 'dropped';
export type LessonProgressStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface Course {
  id: string;
  schoolId: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  subjectId: { id: string; name: string } | string | null;
  gradeLevel: number | null;
  tags: string[];
  estimatedDurationHours: number | null;
  createdBy: { id: string; firstName: string; lastName: string; email?: string } | string;
  status: CourseStatus;
  publishedBy: { id: string; firstName: string; lastName: string } | string | null;
  publishedAt: string | null;
  reviewNotes: string;
  passMarkPercent: number;
  certificateEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: string;
  schoolId: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseLesson {
  id: string;
  schoolId: string;
  courseId: string;
  moduleId: string;
  orderIndex: number;
  title: string;
  type: LessonType;
  contentResourceId: string | null;
  textbookId: string | null;
  chapterId: string | null;
  homeworkId: string | null;
  quizQuestionIds: string[];
  isGraded: boolean;
  passMarkPercent: number;
  isRequiredToAdvance: boolean;
  maxAttempts: number | null;
  createdAt: string;
  updatedAt: string;
}

/** A course with its modules + lessons stitched in (what the backend's getCourse returns). */
export interface CourseTree extends Course {
  modules: Array<CourseModule & { lessons: CourseLesson[] }>;
}

export interface Enrolment {
  id: string;
  schoolId: string;
  courseId: string | Course;
  studentId: string;
  enrolledBy: string;
  classId: string | null;
  enrolledAt: string;
  status: EnrolmentStatus;
  progressPercent: number;
  completedAt: string | null;
  certificateId: string | null;
}

export interface LessonProgress {
  id: string;
  enrolmentId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  status: LessonProgressStatus;
  completedAt: string | null;
  interactionsDone: number;
  interactionsTotal: number;
  scrolledToEnd: boolean;
}

/** Lesson payload returned by GET /api/enrolments/:id/lessons/:lessonId. */
export interface LessonWithSource {
  lesson: CourseLesson;
  source:
    | { kind: 'content'; resource: ContentResourceLite }
    | { kind: 'chapter'; textbook: { _id: string; title: string }; chapter: ChapterLite }
    | { kind: 'homework'; homework: HomeworkLite }
    | { kind: 'quiz'; questions: QuizQuestionLite[] };
}

export interface ContentResourceLite {
  id: string;
  title: string;
  blocks: Array<{
    blockId: string;
    type: string;
    order: number;
    content: string;
    [key: string]: unknown;
  }>;
}

export interface ChapterLite {
  _id: string;
  title: string;
  description: string;
  order: number;
  resources: Array<{ resourceId: string; order: number }>;
}

export interface HomeworkLite {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
}

export interface QuizQuestionLite {
  id: string;
  type: string;
  stem: string;
  marks: number;
  media: Array<{ mediaType: string; url: string }>;
  diagram: unknown;
  options: Array<{ label: string; text: string }>;
}

export interface QuizAttempt {
  id: string;
  enrolmentId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  attemptNumber: number;
  answers: Array<{
    questionId: string;
    answer: unknown;
    isCorrect: boolean;
    marks: number;
  }>;
  totalMarks: number;
  earnedMarks: number;
  percent: number;
  passed: boolean;
  submittedAt: string;
}

export interface Certificate {
  id: string;
  enrolmentId: string;
  studentId: string;
  courseId: string;
  studentName: string;
  courseName: string;
  schoolName: string;
  issuedAt: string;
  verificationCode: string;
}

/** Return shape of GET /api/courses/:id/analytics. */
export interface CourseAnalytics {
  enrolmentCount: number;
  activeCount: number;
  completedCount: number;
  droppedCount: number;
  completionRate: number;
  avgQuizScore: number;
  certificatesIssued: number;
  perLessonDropOff: Array<{
    lessonId: string;
    title: string;
    orderIndex: number;
    studentsReached: number;
    studentsCompleted: number;
  }>;
  perClassBreakdown: Array<{
    classId: string | null;
    enroled: number;
    completed: number;
  }>;
}

/** Public verify endpoint response. */
export type VerifyCertificateResult =
  | {
      valid: true;
      studentName: string;
      courseName: string;
      schoolName: string;
      issuedAt: string;
    }
  | { valid: false };
```

### Step 3 — Add to `src/types/index.ts`

Find the file's export list and append:

```ts
export type {
  Course,
  CourseModule,
  CourseLesson,
  CourseTree,
  CourseStatus,
  LessonType,
  Enrolment,
  EnrolmentStatus,
  LessonProgress,
  LessonProgressStatus,
  LessonWithSource,
  ContentResourceLite,
  ChapterLite,
  HomeworkLite,
  QuizQuestionLite,
  QuizAttempt,
  Certificate,
  CourseAnalytics,
  VerifyCertificateResult,
} from './courses';
```

### Step 4 — Type-check

```bash
cd c:\Users\shaun\campusly-frontend
npx tsc --noEmit
```

Expected: `EXIT=0`.

### Step 5 — Commit

```bash
git add src/types/courses.ts src/types/index.ts package.json package-lock.json
git commit -m "feat(courses): add frontend types and @dnd-kit dependency"
```

---

## Task 2 — Nav entries, routes, and module gate

**Files:**
- Modify: `src/lib/constants.ts`

### Step 1 — Add routes to the `ROUTES` constant

Find the `ROUTES` declaration. Add these entries alongside the existing teacher/student/admin routes (match the style of the existing entries):

```ts
  // ─── Courses (teacher) ─────────────────────────────
  TEACHER_COURSES: '/teacher/courses',
  TEACHER_COURSE_EDIT: (id: string) => `/teacher/courses/${id}/edit`,
  TEACHER_COURSE_ASSIGN: (id: string) => `/teacher/courses/${id}/assign`,
  TEACHER_COURSE_ANALYTICS: (id: string) => `/teacher/courses/${id}/analytics`,

  // ─── Courses (admin + HOD) ─────────────────────────
  ADMIN_COURSES: '/admin/courses',
  ADMIN_COURSES_REVIEW: '/admin/courses/review',

  // ─── Courses (student) ─────────────────────────────
  STUDENT_COURSES: '/student/courses',
  STUDENT_COURSE_HOME: (id: string) => `/student/courses/${id}`,
  STUDENT_LESSON_PLAYER: (id: string, lessonId: string) =>
    `/student/courses/${id}/learn/${lessonId}`,
  STUDENT_CERTIFICATE: (id: string) => `/student/courses/${id}/certificate`,
```

### Step 2 — Add nav entries

Find `TEACHER_NAV`. Add a `Courses` entry after `Curriculum` (or wherever fits the existing order), gated by `module: 'courses'`:

```ts
  {
    label: 'Courses',
    href: ROUTES.TEACHER_COURSES,
    icon: GraduationCap, // import from lucide-react
    module: 'courses',
  },
```

Then add a permission-gated review queue entry in the same tuple:

```ts
  {
    label: 'Course Review',
    href: ROUTES.ADMIN_COURSES_REVIEW,
    icon: CheckSquare,
    permission: 'isHOD',
    module: 'courses',
  },
```

Find `STUDENT_NAV`. Add a `Courses` entry after `Grades` (or wherever fits):

```ts
  { label: 'Courses', href: ROUTES.STUDENT_COURSES, icon: GraduationCap, module: 'courses' },
```

Find `ADMIN_NAV` (if it exists; otherwise locate the admin sidebar config). Add:

```ts
  { label: 'Courses', href: ROUTES.ADMIN_COURSES, icon: GraduationCap, module: 'courses' },
  { label: 'Course Review', href: ROUTES.ADMIN_COURSES_REVIEW, icon: CheckSquare, module: 'courses' },
```

### Step 3 — Import `GraduationCap` and `CheckSquare` from lucide-react

At the top of `src/lib/constants.ts`, find the lucide-react import block and add `GraduationCap` and `CheckSquare` to the import list if they're not already there.

### Step 4 — Type-check

```bash
cd c:\Users\shaun\campusly-frontend
npx tsc --noEmit
```

Expected: `EXIT=0`.

### Step 5 — Commit

```bash
git add src/lib/constants.ts
git commit -m "feat(courses): add routes and nav entries for Courses module"
```

---

## Task 3 — Teacher authoring hooks

**Files:**
- Create: `src/hooks/useTeacherCourses.ts`
- Create: `src/hooks/useCourseBuilder.ts`
- Create: `src/hooks/useCourseAssign.ts`

### Step 1 — Create `useTeacherCourses`

`src/hooks/useTeacherCourses.ts` — the list page hook. Fetches the teacher's courses with filters, exposes create + delete + submit-for-review + archive + publish/reject mutations.

Pattern-match `src/hooks/useTeacherHomework.ts` for shape. Key methods:

```ts
export function useTeacherCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ status?: CourseStatus; mine?: boolean; search?: string }>({});

  const fetchCourses = useCallback(async () => { /* GET /api/courses with filters */ }, [filters]);

  const createCourse = useCallback(async (data: CreateCourseInput): Promise<Course | null> => {
    /* POST /api/courses → return created → append to state → toast.success */
  }, []);

  const deleteCourse = useCallback(async (id: string): Promise<void> => { /* DELETE */ }, []);

  const submitForReview = useCallback(async (id: string): Promise<void> => { /* POST /submit-for-review */ }, []);

  const publishCourse = useCallback(async (id: string): Promise<void> => { /* POST /publish */ }, []);

  const rejectCourse = useCallback(async (id: string, reviewNotes: string): Promise<void> => { /* POST /reject */ }, []);

  const archiveCourse = useCallback(async (id: string): Promise<void> => { /* POST /archive */ }, []);

  useEffect(() => { void fetchCourses(); }, [fetchCourses]);

  return { courses, loading, filters, setFilters, createCourse, deleteCourse, submitForReview, publishCourse, rejectCourse, archiveCourse, refresh: fetchCourses };
}
```

Every mutation catches errors via `extractErrorMessage(err)` and calls `toast.error(...)` on failure, `toast.success(...)` on success. Match the pattern in `useTeacherHomework.ts`.

### Step 2 — Create `useCourseBuilder`

`src/hooks/useCourseBuilder.ts` — the course builder page hook. Fetches one course with its full module/lesson tree, exposes add/update/delete/reorder for modules and lessons, tracks dirty state.

```ts
export function useCourseBuilder(courseId: string) {
  const [course, setCourse] = useState<CourseTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const fetchCourse = useCallback(async () => { /* GET /api/courses/:id */ }, [courseId]);

  const updateCourse = useCallback(async (data: Partial<Course>) => { /* PUT metadata */ }, [courseId]);

  const addModule = useCallback(async (title: string) => { /* POST /modules */ }, [courseId]);
  const updateModule = useCallback(async (moduleId: string, data: Partial<CourseModule>) => { /* PUT */ }, [courseId]);
  const deleteModule = useCallback(async (moduleId: string) => { /* DELETE */ }, [courseId]);
  const reorderModules = useCallback(async (orders: { id: string; orderIndex: number }[]) => { /* PATCH /modules/reorder */ }, [courseId]);

  const addLesson = useCallback(async (body: CreateLessonInput) => { /* POST /lessons */ }, [courseId]);
  const updateLesson = useCallback(async (lessonId: string, data: Partial<CourseLesson>) => { /* PUT */ }, [courseId]);
  const deleteLesson = useCallback(async (lessonId: string) => { /* DELETE */ }, [courseId]);
  const reorderLessons = useCallback(async (orders: { id: string; moduleId: string; orderIndex: number }[]) => { /* PATCH /lessons/reorder */ }, [courseId]);

  const submitForReview = useCallback(async () => { /* POST /submit-for-review */ }, [courseId]);

  useEffect(() => { void fetchCourse(); }, [fetchCourse]);
  useUnsavedChanges(isDirty, 'You have unsaved course changes. Are you sure you want to leave?');

  return { course, loading, isDirty, updateCourse, addModule, updateModule, deleteModule, reorderModules, addLesson, updateLesson, deleteLesson, reorderLessons, submitForReview, refresh: fetchCourse };
}
```

The `useUnsavedChanges` hook already exists from the earlier teacher-UX work. Import it from `src/hooks/useUnsavedChanges.ts` — it's the same hook used in the gradebook.

Every mutation updates local state optimistically and rolls back on error. The `isDirty` flag flips to `true` on every mutation and to `false` after a successful `submitForReview` or explicit save.

### Step 3 — Create `useCourseAssign`

`src/hooks/useCourseAssign.ts` — assign-to-class flow. Fetches the teacher's classes (reuse `useTeacherClasses` from the existing hook), and exposes `assignToClass(courseId, classId)`.

```ts
export function useCourseAssign() {
  const assignToClass = useCallback(async (
    courseId: string,
    classId: string,
  ): Promise<{ attempted: number; newEnrolments: number; alreadyEnroled: number } | null> => {
    try {
      const res = await apiClient.post(`/courses/${courseId}/assign`, { classId });
      const result = unwrapResponse<{ attempted: number; newEnrolments: number; alreadyEnroled: number }>(res);
      toast.success(`Assigned to ${result.newEnrolments} students (${result.alreadyEnroled} already enroled)`);
      return result;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to assign course'));
      return null;
    }
  }, []);
  return { assignToClass };
}
```

### Step 4 — Type-check

```bash
cd c:\Users\shaun\campusly-frontend
npx tsc --noEmit
```

Expected: `EXIT=0`.

### Step 5 — Commit

```bash
git add src/hooks/useTeacherCourses.ts src/hooks/useCourseBuilder.ts src/hooks/useCourseAssign.ts
git commit -m "feat(courses): add teacher authoring hooks (list, builder, assign)"
```

---

## Task 4 — Teacher course list page

**Files:**
- Create: `src/app/(dashboard)/teacher/courses/page.tsx`
- Create: `src/components/courses/CourseCard.tsx`
- Create: `src/components/courses/CreateCourseDialog.tsx`

### Step 1 — `CourseCard.tsx`

Small presentational card showing cover image, title, subject, grade, status badge, lesson count. Click navigates to the builder.

```tsx
interface CourseCardProps {
  course: Course;
  onClick: () => void;
  onDelete?: () => void;
}
export function CourseCard({ course, onClick, onDelete }: CourseCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        {course.coverImageUrl && (
          <div className="h-32 w-full rounded-md bg-muted overflow-hidden">
            <img src={course.coverImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{course.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{course.description}</p>
          </div>
          <StatusBadge status={course.status} />
        </div>
        {/* Subject + grade pills */}
      </CardContent>
    </Card>
  );
}
```

`StatusBadge` is an inline helper or reuses an existing `Badge` component with a colour map: `draft → secondary`, `in_review → warning-amber`, `published → primary`, `archived → muted`.

### Step 2 — `CreateCourseDialog.tsx`

A dialog with a React Hook Form + Zod form: title (required), slug (auto-generated from title but editable), description, subject (optional Select from existing subjects), grade level (optional number 1-12), tags.

Form validation uses `.trim()` on strings, regex on slug, `onTouched` mode for live feedback, matches `HomeworkForm.tsx` exactly. Submit calls `createCourse` from the hook, and on success closes the dialog + navigates to the new course's builder page.

### Step 3 — `/teacher/courses/page.tsx`

Thin orchestrator:

```tsx
'use client';
import { useTeacherCourses } from '@/hooks/useTeacherCourses';
import { CourseCard } from '@/components/courses/CourseCard';
import { CreateCourseDialog } from '@/components/courses/CreateCourseDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { CardGridSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { GraduationCap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

export default function TeacherCoursesPage() {
  const router = useRouter();
  const { courses, loading, filters, setFilters, createCourse } = useTeacherCourses();
  const [createOpen, setCreateOpen] = useState(false);

  if (loading) return <>
    <PageHeader title="Courses" description="Build and publish self-paced courses for your students" />
    <CardGridSkeleton count={6} />
  </>;

  return (
    <div className="space-y-6">
      <PageHeader title="Courses" description="...">
        <Button onClick={() => setCreateOpen(true)}>Create Course</Button>
      </PageHeader>

      {/* Filter bar: status dropdown, "Mine only" toggle, search input */}
      <CourseFilterBar filters={filters} onChange={setFilters} />

      {courses.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No courses yet" description="..." action={<Button onClick={() => setCreateOpen(true)}>Create your first course</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} onClick={() => router.push(ROUTES.TEACHER_COURSE_EDIT(c.id))} />
          ))}
        </div>
      )}

      <CreateCourseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(course) => router.push(ROUTES.TEACHER_COURSE_EDIT(course.id))}
      />
    </div>
  );
}
```

Match the page layout pattern from `/teacher/homework/page.tsx` — same skeleton loading, same empty state, same page header.

### Step 4 — Type-check + commit

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/teacher/courses/page.tsx src/components/courses/CourseCard.tsx src/components/courses/CreateCourseDialog.tsx
git commit -m "feat(courses): add teacher course list page and create dialog"
```

---

## Task 5 — Course builder page (the centrepiece)

**Files:**
- Create: `src/app/(dashboard)/teacher/courses/[id]/edit/page.tsx`
- Create: `src/components/courses/CourseBuilderOutline.tsx`
- Create: `src/components/courses/CourseBuilderLessonEditor.tsx`
- Create: `src/components/courses/CourseBuilderMetaPanel.tsx`
- Create: `src/components/courses/LessonTypeBadge.tsx`

This is the biggest and most important task in Plan D. The course builder is the teacher UX — if this is clunky, the whole feature fails.

### Step 1 — `LessonTypeBadge.tsx`

Small pill showing an icon + label per lesson type. 4 variants: content (FileText icon), chapter (BookOpen), homework (ClipboardList), quiz (HelpCircle). One line of JSX per type. Trivial.

### Step 2 — `CourseBuilderOutline.tsx`

The left panel. Drag-sortable modules, each with its own sortable lesson list. Uses `@dnd-kit`:

```tsx
'use client';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CourseBuilderOutlineProps {
  course: CourseTree;
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onAddModule: () => void;
  onAddLesson: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onReorderLessons: (orders: { id: string; moduleId: string; orderIndex: number }[]) => void;
  onReorderModules: (orders: { id: string; orderIndex: number }[]) => void;
  readOnly: boolean;
}

export function CourseBuilderOutline(props: CourseBuilderOutlineProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    // Compute new orders[] from the active + over items, call the
    // appropriate reorder callback (lessons or modules).
    // Use optimistic update: caller applies immediately, then POSTs.
  };

  return (
    <div className="space-y-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={props.course.modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {props.course.modules.map((module) => (
            <SortableModule key={module.id} module={module} {...props} />
          ))}
        </SortableContext>
      </DndContext>
      {!props.readOnly && (
        <Button variant="outline" size="sm" onClick={props.onAddModule}>
          <Plus className="mr-2 h-4 w-4" /> Add Module
        </Button>
      )}
    </div>
  );
}

function SortableModule({ module, ...props }: /* ... */) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: module.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="rounded-md border p-2 space-y-1">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab"><GripVertical className="h-4 w-4" /></button>
        <span className="font-medium text-sm flex-1">{module.title}</span>
        {!props.readOnly && (
          <Button variant="ghost" size="icon-sm" onClick={() => props.onDeleteModule(module.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <SortableContext items={module.lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        {module.lessons.map((lesson) => (
          <SortableLesson
            key={lesson.id}
            lesson={lesson}
            moduleId={module.id}
            selected={props.selectedLessonId === lesson.id}
            onSelect={() => props.onSelectLesson(lesson.id)}
            onDelete={() => props.onDeleteLesson(lesson.id)}
            readOnly={props.readOnly}
          />
        ))}
      </SortableContext>
      {!props.readOnly && (
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => props.onAddLesson(module.id)}>
          <Plus className="mr-2 h-4 w-4" /> Add Lesson
        </Button>
      )}
    </div>
  );
}
```

(`SortableLesson` is similarly structured — a clickable row with drag handle, lesson title, `LessonTypeBadge`, and a delete button.)

### Step 3 — `CourseBuilderLessonEditor.tsx`

The centre panel. Shows the currently selected lesson's metadata (title, type, gating settings). For each lesson type, shows the appropriate "source" picker:

- `type='content'`: current ContentResource title + "Change..." button that opens the resource picker dialog
- `type='chapter'`: current textbook + chapter name + "Change..." button
- `type='homework'`: current homework title + "Change..." button
- `type='quiz'`: list of selected questions + "Manage Questions" button

Plus fields for `isRequiredToAdvance`, `passMarkPercent`, `maxAttempts`.

When nothing is selected (empty course or no lesson clicked yet), shows a friendly empty state: "Select a lesson from the outline or add a new one".

### Step 4 — `CourseBuilderMetaPanel.tsx`

The right panel. Shows course metadata fields bound to the hook:

- Title (input)
- Description (textarea)
- Cover image URL (input — no upload in this task, plain URL)
- Subject (Select)
- Grade level (Select 1-12)
- Tags (input that splits on comma)
- Status display (read-only badge)
- **Submit for Review** button (disabled if zero lessons, otherwise enabled)
- If status is `in_review`, shows "Awaiting review" with cancel option
- If status is `published`, shows the published date and a "Archive" button
- If status is `draft` and `reviewNotes` is non-empty, shows an amber banner with the rejection notes

### Step 5 — `/teacher/courses/[id]/edit/page.tsx`

Thin orchestrator:

```tsx
'use client';
import { useCourseBuilder } from '@/hooks/useCourseBuilder';
import { CourseBuilderOutline } from '@/components/courses/CourseBuilderOutline';
import { CourseBuilderLessonEditor } from '@/components/courses/CourseBuilderLessonEditor';
import { CourseBuilderMetaPanel } from '@/components/courses/CourseBuilderMetaPanel';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = params.id as string;
  const builder = useCourseBuilder(courseId);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  if (builder.loading) return <LoadingSpinner />;
  if (!builder.course) return <EmptyState icon={X} title="Course not found" />;

  const selectedLesson = builder.course.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === selectedLessonId) ?? null;

  const readOnly = builder.course.status !== 'draft';

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Outline */}
      <aside className="w-72 shrink-0 overflow-y-auto">
        <CourseBuilderOutline
          course={builder.course}
          selectedLessonId={selectedLessonId}
          onSelectLesson={setSelectedLessonId}
          onAddModule={async () => { await builder.addModule('New Module'); }}
          onAddLesson={(moduleId) => { /* open resource picker, which calls addLesson on pick */ }}
          onDeleteModule={builder.deleteModule}
          onDeleteLesson={builder.deleteLesson}
          onReorderLessons={builder.reorderLessons}
          onReorderModules={builder.reorderModules}
          readOnly={readOnly}
        />
      </aside>

      {/* Lesson editor */}
      <main className="flex-1 overflow-y-auto">
        <CourseBuilderLessonEditor
          lesson={selectedLesson}
          courseId={courseId}
          onUpdate={builder.updateLesson}
          readOnly={readOnly}
        />
      </main>

      {/* Metadata panel */}
      <aside className="w-80 shrink-0 overflow-y-auto">
        <CourseBuilderMetaPanel
          course={builder.course}
          onUpdate={builder.updateCourse}
          onSubmitForReview={builder.submitForReview}
          isDirty={builder.isDirty}
        />
      </aside>
    </div>
  );
}
```

On mobile, the three panels stack vertically (outline → editor → metadata). Use `hidden lg:block` + `lg:hidden` tricks OR a tabs approach. Match what the existing Textbook reader page does for its mobile chapter sidebar.

### Step 6 — Type-check + commit

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/teacher/courses/\[id\]/edit/page.tsx src/components/courses/CourseBuilderOutline.tsx src/components/courses/CourseBuilderLessonEditor.tsx src/components/courses/CourseBuilderMetaPanel.tsx src/components/courses/LessonTypeBadge.tsx
git commit -m "feat(courses): add course builder page with drag-sortable outline"
```

---

## Task 6 — Resource picker (the fast-authoring UX piece)

**Files:**
- Create: `src/hooks/useCourseResourcePicker.ts`
- Create: `src/components/courses/ResourcePickerDialog.tsx`

This is the critical authoring-speed UX piece: a single command-palette dialog that searches ContentLibrary, Textbook chapters, Homework, and Question Bank questions in parallel and lets the teacher add a lesson with one click.

### Step 1 — `useCourseResourcePicker` hook

```ts
export function useCourseResourcePicker() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResourcePickerResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [contentRes, textbookRes, homeworkRes, questionsRes] = await Promise.allSettled([
          apiClient.get('/content-library/resources', { params: { search: query, status: 'approved' } }),
          apiClient.get('/textbooks', { params: { search: query, status: 'published' } }),
          apiClient.get('/homework', { params: { search: query } }),
          apiClient.get('/question-bank/questions', { params: { search: query, status: 'approved' } }),
        ]);
        // Normalise each source into ResourcePickerResult { kind, id, title, subtitle }
        // Merge, sort by title, limit to ~30 total
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  return { query, setQuery, results, loading };
}

export interface ResourcePickerResult {
  kind: 'content' | 'chapter' | 'homework' | 'quiz_question';
  id: string;
  title: string;
  subtitle: string;
  // For chapter: also textbookId
  textbookId?: string;
  chapterId?: string;
}
```

**Note**: verify the exact API paths for content-library/resources, textbooks, homework, question-bank/questions before writing this. They may differ slightly. Run `grep -n "app.use.*content-library\|app.use.*textbooks\|app.use.*homework\|app.use.*question-bank" c:\Users\shaun\campusly-backend\src\app.ts` to confirm.

### Step 2 — `ResourcePickerDialog.tsx`

A dialog with:
- Text input at the top bound to `query`
- List below showing results grouped by kind (Content / Textbook / Homework / Question)
- Each result is a clickable row with the `kind` badge + title + subtitle
- On click, calls the `onPick(result)` callback which the builder uses to add the lesson

```tsx
interface ResourcePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (result: ResourcePickerResult) => void;
  moduleId: string;
}

export function ResourcePickerDialog({ open, onOpenChange, onPick, moduleId }: ResourcePickerDialogProps) {
  const { query, setQuery, results, loading } = useCourseResourcePicker();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col max-h-[85vh]">
        <DialogHeader><DialogTitle>Add Lesson</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search content, textbooks, homework, questions..."
            className="pl-9"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && <LoadingSpinner />}
          {!loading && results.length === 0 && query.length >= 2 && (
            <EmptyState icon={Search} title="No results" description="Try a different search term." />
          )}
          {!loading && results.map((r) => (
            <button key={`${r.kind}-${r.id}`} type="button" onClick={() => onPick(r)}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50">
              <ResourceKindBadge kind={r.kind} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

The builder wires this up: `onAddLesson(moduleId)` in the outline opens the dialog with `moduleId` captured, `onPick(result)` calls `builder.addLesson(...)` with the correctly-shaped CreateLessonInput based on `result.kind`, then closes the dialog.

### Step 3 — Type-check + commit

```bash
npx tsc --noEmit
git add src/hooks/useCourseResourcePicker.ts src/components/courses/ResourcePickerDialog.tsx
git commit -m "feat(courses): add resource picker dialog for fast lesson authoring"
```

---

## Task 7 — Assign-to-class dialog

**Files:**
- Create: `src/components/courses/AssignCourseDialog.tsx`

### Step 1 — Dialog component

Uses `useTeacherClasses` (existing hook) + `useCourseAssign` (Task 3). Shows a Select of the teacher's classes, a preview of "X students will be enroled" based on the chosen class, and an Assign button. On success, toast + close.

```tsx
interface AssignCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
}

export function AssignCourseDialog({ open, onOpenChange, courseId }: AssignCourseDialogProps) {
  const { classes } = useTeacherClasses();
  const { assignToClass } = useCourseAssign();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const handleAssign = async () => {
    if (!selectedClassId) return;
    setAssigning(true);
    const result = await assignToClass(courseId, selectedClassId);
    setAssigning(false);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Assign Course to Class</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Pick a class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedClass && <p className="text-sm text-muted-foreground">This will enrol all students in {selectedClass.name}.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedClassId || assigning}>
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 2 — Wire into the builder's meta panel

Add an "Assign to Class" button to `CourseBuilderMetaPanel.tsx`, visible only when `course.status === 'published'`. Clicking opens the dialog.

### Step 3 — Type-check + commit

```bash
npx tsc --noEmit
git add src/components/courses/AssignCourseDialog.tsx src/components/courses/CourseBuilderMetaPanel.tsx
git commit -m "feat(courses): add assign-to-class dialog"
```

---

## Task 8 — HOD review queue

**Files:**
- Create: `src/hooks/useCourseReviewQueue.ts`
- Create: `src/app/(dashboard)/admin/courses/review/page.tsx`
- Create: `src/components/courses/ReviewQueueItem.tsx`
- Create: `src/components/courses/CoursePreviewDialog.tsx`

### Step 1 — `useCourseReviewQueue`

```ts
export function useCourseReviewQueue() {
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    /* GET /api/courses?status=in_review */
  }, []);

  const publish = useCallback(async (id: string) => {
    /* POST /api/courses/:id/publish → refresh queue */
  }, []);

  const reject = useCallback(async (id: string, reviewNotes: string) => {
    /* POST /api/courses/:id/reject { reviewNotes } → refresh queue */
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);
  return { items, loading, publish, reject, refresh: fetch };
}
```

### Step 2 — `ReviewQueueItem.tsx`

Clickable row showing course title + author name + subject + grade + submitted date + lesson count. On click, opens the preview dialog.

### Step 3 — `CoursePreviewDialog.tsx`

Read-only view of the course tree (reuses `CourseBuilderOutline` with `readOnly={true}` and disables drag). Shows all modules and lessons. Footer has **Publish** and **Reject with notes** buttons. Reject opens a textarea for notes.

### Step 4 — `/admin/courses/review/page.tsx`

```tsx
'use client';
import { useCourseReviewQueue } from '@/hooks/useCourseReviewQueue';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListSkeleton } from '@/components/shared/skeletons';
import { ReviewQueueItem } from '@/components/courses/ReviewQueueItem';
import { CoursePreviewDialog } from '@/components/courses/CoursePreviewDialog';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function ReviewQueuePage() {
  const { items, loading, publish, reject } = useCourseReviewQueue();
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null);

  if (loading) return <ListSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Course Review Queue" description="Review courses submitted by teachers and publish or reject them." />
      {items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No courses awaiting review" description="New submissions will appear here." />
      ) : (
        <div className="space-y-2">
          {items.map((c) => <ReviewQueueItem key={c.id} course={c} onClick={() => setPreviewCourseId(c.id)} />)}
        </div>
      )}
      {previewCourseId && (
        <CoursePreviewDialog
          courseId={previewCourseId}
          open
          onOpenChange={(v) => { if (!v) setPreviewCourseId(null); }}
          onPublish={async () => { await publish(previewCourseId); setPreviewCourseId(null); }}
          onReject={async (notes) => { await reject(previewCourseId, notes); setPreviewCourseId(null); }}
        />
      )}
    </div>
  );
}
```

### Step 5 — Type-check + commit

```bash
npx tsc --noEmit
git add src/hooks/useCourseReviewQueue.ts src/app/\(dashboard\)/admin/courses/review/page.tsx src/components/courses/ReviewQueueItem.tsx src/components/courses/CoursePreviewDialog.tsx
git commit -m "feat(courses): add HOD/admin course review queue"
```

---

## Task 9 — Student hooks: catalog, my-courses, lesson player

**Files:**
- Create: `src/hooks/useStudentCourses.ts`
- Create: `src/hooks/useLessonPlayer.ts`

### Step 1 — `useStudentCourses`

```ts
export function useStudentCourses() {
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [myEnrolments, setMyEnrolments] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = useCallback(async () => { /* GET /api/courses/catalog */ }, []);
  const fetchMyEnrolments = useCallback(async () => { /* GET /api/enrolments/me */ }, []);

  useEffect(() => {
    async function load() {
      await Promise.allSettled([fetchCatalog(), fetchMyEnrolments()]);
      setLoading(false);
    }
    void load();
  }, [fetchCatalog, fetchMyEnrolments]);

  return { catalog, myEnrolments, loading, refresh: () => { void fetchCatalog(); void fetchMyEnrolments(); } };
}
```

### Step 2 — `useLessonPlayer`

This is the hook the lesson player uses. Fetches the enrolment detail (modules + lessons + progress + unlock statuses), fetches the current lesson's content on demand, writes progress debounced, submits quiz attempts.

```ts
export function useLessonPlayer(enrolmentId: string) {
  const [enrolment, setEnrolment] = useState<{ enrolment: Enrolment; course: CourseTree } | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonWithSource | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEnrolment = useCallback(async () => {
    // Guard against an empty enrolmentId — callers may pass '' while they
    // resolve courseId → enrolmentId via useStudentCourses, so we just
    // bail out and leave `enrolment` null.
    if (!enrolmentId) {
      setLoading(false);
      return;
    }
    /* GET /api/enrolments/:id → returns { enrolment, course: tree-with-progress-and-unlockStatus } */
  }, [enrolmentId]);

  const fetchLesson = useCallback(async (lessonId: string) => {
    /* GET /api/enrolments/:id/lessons/:lessonId → returns { lesson, source } */
    /* On 403 (locked), toast and return null */
  }, [enrolmentId]);

  // Debounced progress writer. Queues up the latest { interactionsDone, scrolledToEnd }
  // and flushes 500ms after the last call. If a new call comes before the timer fires,
  // resets the timer.
  const progressQueueRef = useRef<{ lessonId: string; body: { interactionsDone?: number; scrolledToEnd?: boolean } } | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeProgress = useCallback((lessonId: string, body: { interactionsDone?: number; scrolledToEnd?: boolean }) => {
    progressQueueRef.current = { lessonId, body };
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    progressTimerRef.current = setTimeout(async () => {
      const queued = progressQueueRef.current;
      if (!queued) return;
      progressQueueRef.current = null;
      try {
        const res = await apiClient.post(
          `/enrolments/${enrolmentId}/lessons/${queued.lessonId}/progress`,
          queued.body,
        );
        const result = unwrapResponse<{ lessonStatus: string; nextLessonUnlocked: boolean }>(res);
        // If the lesson just completed, refresh the enrolment tree to pick up
        // the new unlock status for the next lesson.
        if (result.lessonStatus === 'completed') void fetchEnrolment();
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to save progress'));
      }
    }, 500);
  }, [enrolmentId, fetchEnrolment]);

  const submitQuiz = useCallback(async (
    lessonId: string,
    answers: { questionId: string; answer: unknown }[],
  ): Promise<QuizAttempt | null> => {
    try {
      const res = await apiClient.post(`/enrolments/${enrolmentId}/lessons/${lessonId}/quiz-attempt`, { answers });
      const result = unwrapResponse<{ attempt: QuizAttempt; passed: boolean; canRetry: boolean; nextLessonUnlocked: boolean }>(res);
      if (result.passed) {
        toast.success('Quiz passed!');
        void fetchEnrolment();
      } else {
        toast.error(result.canRetry ? 'Not quite — try again' : 'Quiz failed, no attempts left');
      }
      return result.attempt;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to submit quiz'));
      return null;
    }
  }, [enrolmentId, fetchEnrolment]);

  useEffect(() => {
    void (async () => {
      await fetchEnrolment();
      setLoading(false);
    })();
  }, [fetchEnrolment]);

  // Flush pending progress write on unmount.
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, []);

  return { enrolment, currentLesson, setCurrentLesson, loading, fetchLesson, writeProgress, submitQuiz, refresh: fetchEnrolment };
}
```

### Step 3 — Type-check + commit

```bash
npx tsc --noEmit
git add src/hooks/useStudentCourses.ts src/hooks/useLessonPlayer.ts
git commit -m "feat(courses): add student hooks (catalog, my-courses, lesson player)"
```

---

## Task 10 — Student my-courses + course home pages

**Files:**
- Create: `src/app/(dashboard)/student/courses/page.tsx`
- Create: `src/app/(dashboard)/student/courses/[id]/page.tsx`
- Create: `src/components/courses/MyCoursesGrid.tsx`
- Create: `src/components/courses/CatalogGrid.tsx`
- Create: `src/components/courses/CourseHome.tsx`

### Step 1 — `MyCoursesGrid` + `CatalogGrid`

Both are presentational grids of cards. `MyCoursesGrid` shows enroled courses with progress bars + "Continue" button. `CatalogGrid` shows published courses available in the school (not yet enroled) — for Plan D, students cannot self-enrol (Plan B explicitly deferred that), so catalog cards show "Ask your teacher to assign this course" as a tooltip on click. (Later plans can flip this on.)

### Step 2 — `/student/courses/page.tsx`

Tabs: "My Courses" (default) | "Catalog". Each tab renders the corresponding grid. Uses `useStudentCourses`.

### Step 3 — `CourseHome.tsx` component

Coursera-style hero + outline. Renders:

1. Hero band: cover image, title, subject/grade pills, duration estimate, "Continue" CTA (links to the next available lesson — the first `available` lesson from the unlock computation)
2. Description paragraph
3. Progress bar
4. Collapsible module list with lesson icons (✓ completed, ● in progress, 🔒 locked)
5. Each lesson is a link to `/student/courses/[id]/learn/[lessonId]` — disabled if locked

### Step 4 — `/student/courses/[id]/page.tsx`

Fetches the enrolment via `useLessonPlayer(enrolmentId)`. But wait — the URL has courseId, not enrolmentId. The student page needs to resolve courseId → enrolmentId via `useStudentCourses.myEnrolments`.

```tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useStudentCourses } from '@/hooks/useStudentCourses';
import { useLessonPlayer } from '@/hooks/useLessonPlayer';
import { CourseHome } from '@/components/courses/CourseHome';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function StudentCoursePage() {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();
  const { myEnrolments, loading: enrolmentsLoading } = useStudentCourses();

  const enrolment = myEnrolments.find((e) => {
    const cid = typeof e.courseId === 'string' ? e.courseId : e.courseId.id;
    return cid === courseId;
  });

  // Guard against passing an empty string to useLessonPlayer, which would
  // fire a bad API call. The hook must accept and no-op on empty ids.
  const player = useLessonPlayer(enrolment?.id ?? '');

  if (enrolmentsLoading) return <LoadingSpinner />;
  if (!enrolment) return <EmptyState icon={X} title="Not enroled" description="..." />;
  if (player.loading || !player.enrolment) return <LoadingSpinner />;

  return (
    <CourseHome
      course={player.enrolment.course}
      progressPercent={enrolment.progressPercent}
      onOpenLesson={(lessonId) => router.push(ROUTES.STUDENT_LESSON_PLAYER(courseId, lessonId))}
    />
  );
}
```

### Step 5 — Type-check + commit

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/student/courses/page.tsx src/app/\(dashboard\)/student/courses/\[id\]/page.tsx src/components/courses/MyCoursesGrid.tsx src/components/courses/CatalogGrid.tsx src/components/courses/CourseHome.tsx
git commit -m "feat(courses): add student my-courses and course home pages"
```

---

## Task 11 — Lesson player page

**Files:**
- Create: `src/app/(dashboard)/student/courses/[id]/learn/[lessonId]/page.tsx`
- Create: `src/components/courses/LessonPlayerShell.tsx`
- Create: `src/components/courses/LessonOutlineSidebar.tsx`
- Create: `src/components/courses/LessonQuizShell.tsx`

### Step 1 — `LessonOutlineSidebar.tsx`

Left sidebar in the player. Collapsible on mobile via a drawer. Shows the module/lesson outline with lock icons + completion ticks + current lesson highlight. Each lesson is a clickable row — available/completed ones navigate, locked ones do nothing.

### Step 2 — `LessonPlayerShell.tsx`

Two-pane layout used by both the lesson player (read-only) and the course builder (edit mode — though in practice the builder uses the outline component directly for edit features). For the lesson player:

```tsx
interface LessonPlayerShellProps {
  course: CourseTree;
  currentLessonId: string;
  progressByLesson: Map<string, LessonProgress>;
  unlockStatusById: Map<string, LessonProgressStatus | 'available'>;
  children: React.ReactNode; // the main pane content
  onSelectLesson: (lessonId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

export function LessonPlayerShell(props: LessonPlayerShellProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 lg:shrink-0 overflow-y-auto border-r">
        <LessonOutlineSidebar {...props} />
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-6">
          {props.children}
        </div>
        {/* Bottom bar */}
        <div className="sticky bottom-0 border-t bg-background p-4 flex items-center justify-between">
          <Button variant="outline" onClick={props.onPrevious}>Previous</Button>
          <Button onClick={props.onNext} disabled={!props.canGoNext}>Next</Button>
        </div>
      </main>
    </div>
  );
}
```

### Step 3 — `LessonQuizShell.tsx`

The UI for a `type='quiz'` lesson. Renders each `QuizQuestionLite` as a form field based on question type (MCQ → radio buttons, fill_blank → text input, true_false → two buttons), collects answers into a local state object, and on submit calls `submitQuiz(lessonId, answers)`. Shows the attempt result after submission: passed/failed, percent score, retry button if `canRetry`.

### Step 4 — `/student/courses/[id]/learn/[lessonId]/page.tsx`

Thin orchestrator:

```tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useStudentCourses } from '@/hooks/useStudentCourses';
import { useLessonPlayer } from '@/hooks/useLessonPlayer';
import { LessonPlayerShell } from '@/components/courses/LessonPlayerShell';
import { LessonQuizShell } from '@/components/courses/LessonQuizShell';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { useEffect, useState } from 'react';

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const { myEnrolments } = useStudentCourses();
  const enrolment = myEnrolments.find((e) => /* resolve */);
  const player = useLessonPlayer(enrolment?.id ?? '');
  const [currentLessonContent, setCurrentLessonContent] = useState<LessonWithSource | null>(null);
  const [interactionsDone, setInteractionsDone] = useState(0);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  // Load the current lesson's content when lessonId changes.
  useEffect(() => {
    void (async () => {
      const content = await player.fetchLesson(lessonId);
      setCurrentLessonContent(content);
      setInteractionsDone(0);
      setScrolledToEnd(false);
    })();
  }, [lessonId, player.fetchLesson]);

  // Fire scrolled-to-end detection via IntersectionObserver on a sentinel div
  // at the bottom of the main pane.
  // (Standard pattern — see Textbook reader for reference.)

  // When interactionsDone or scrolledToEnd change, debounced progress write.
  useEffect(() => {
    if (!currentLessonContent) return;
    player.writeProgress(lessonId, { interactionsDone, scrolledToEnd });
  }, [interactionsDone, scrolledToEnd, lessonId, currentLessonContent, player.writeProgress]);

  // Figure out previous / next lesson IDs from the ordered lesson list.
  const allLessons = player.enrolment?.course.modules.flatMap((m) => m.lessons) ?? [];
  const currentIdx = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  // Can go next only if the current lesson is completed.
  const currentProgress = /* lookup from tree */;
  const canGoNext = currentProgress?.status === 'completed' || currentLessonContent?.lesson.type === 'content' && scrolledToEnd; // etc.

  return (
    <LessonPlayerShell
      course={player.enrolment!.course}
      currentLessonId={lessonId}
      progressByLesson={/* ... */}
      unlockStatusById={/* ... */}
      onSelectLesson={(id) => router.push(ROUTES.STUDENT_LESSON_PLAYER(courseId, id))}
      onPrevious={() => prevLesson && router.push(ROUTES.STUDENT_LESSON_PLAYER(courseId, prevLesson.id))}
      onNext={() => nextLesson && router.push(ROUTES.STUDENT_LESSON_PLAYER(courseId, nextLesson.id))}
      canGoNext={canGoNext}
    >
      {/* Main pane content switches by source kind */}
      {currentLessonContent?.source.kind === 'content' && (
        <BlockRenderer blocks={currentLessonContent.source.resource.blocks} onInteract={() => setInteractionsDone((n) => n + 1)} />
      )}
      {currentLessonContent?.source.kind === 'chapter' && (
        <>
          <h2 className="text-2xl font-bold mb-4">{currentLessonContent.source.chapter.title}</h2>
          {/* Render each resource in the chapter via BlockRenderer */}
        </>
      )}
      {currentLessonContent?.source.kind === 'homework' && (
        <HomeworkLessonView homework={currentLessonContent.source.homework} onSubmitted={() => player.refresh()} />
      )}
      {currentLessonContent?.source.kind === 'quiz' && (
        <LessonQuizShell
          questions={currentLessonContent.source.questions}
          onSubmit={(answers) => player.submitQuiz(lessonId, answers)}
          maxAttempts={currentLessonContent.lesson.maxAttempts}
        />
      )}
      {/* Scroll sentinel at the bottom for scrolledToEnd detection */}
      <div ref={scrollSentinelRef} className="h-1" />
    </LessonPlayerShell>
  );
}
```

**Key integration point — READ CAREFULLY**: the existing `BlockRenderer` at `src/components/content/renderers/BlockRenderer.tsx` does NOT currently expose a way to report student interactions back up to the player. You must decide ONE of these three approaches before writing the player page, and report which one you chose:

1. **Add an `onInteract` prop to `BlockRenderer`** — the player passes `() => setInteractionsDone((n) => n + 1)` as a callback, and `BlockRenderer` fires it on any interactive-block submission (quiz answered, fill-blank filled, ordering completed, etc.). This requires modifying `BlockRenderer.tsx` and every interactive block subcomponent to accept and invoke the callback. Highest touch surface, but the cleanest separation.

2. **A React context `CourseProgressContext`** — the player provides a context at the top with `reportInteraction()`. Interactive blocks consume the context and call it on submission. Lower touch on `BlockRenderer` itself but still requires each interactive block to become context-aware.

3. **DOM event delegation** — the player listens for a custom `blockinteraction` event bubbling from the main pane, and interactive blocks dispatch it. Zero modifications to `BlockRenderer` or its children, but uses CustomEvent which is slightly unusual in React.

**Recommended: option 1.** It's the most explicit and the easiest to type-check. Before starting this task, read `BlockRenderer.tsx` and its interactive block children (`QuizBlock`, `FillBlankBlock`, `MatchColumnsBlock`, `OrderingBlock`) to see how their submission handlers are wired. The change is typically a new optional prop passed down through the renderer tree to each block.

If the touch surface turns out to be more than ~4 files, STOP and report — we'll treat it as a separate preliminary task (15a) rather than silently expanding Task 11's scope.

### Step 5 — Type-check + commit

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/student/courses/\[id\]/learn/\[lessonId\]/page.tsx src/components/courses/LessonPlayerShell.tsx src/components/courses/LessonOutlineSidebar.tsx src/components/courses/LessonQuizShell.tsx
git commit -m "feat(courses): add student lesson player page"
```

---

## Task 12 — Certificate download page + hook

**Files:**
- Create: `src/hooks/useCertificate.ts`
- Create: `src/app/(dashboard)/student/courses/[id]/certificate/page.tsx`
- Create: `src/components/courses/CertificateDownloadCard.tsx`

### Step 1 — `useCertificate` hook

Exposes `downloadCertificate(enrolmentId)` which:
1. Fetches the PDF via `apiClient.get(url, { responseType: 'blob' })` with the existing auth interceptor
2. Creates an object URL
3. Triggers a download via a hidden `<a download>` element
4. Revokes the object URL after the click

Also exposes `verifyCertificate(code)` for the public verify page (Task 13).

```ts
export function useCertificate() {
  const downloadCertificate = useCallback(async (enrolmentId: string) => {
    try {
      const res = await apiClient.get(`/enrolments/${enrolmentId}/certificate`, { responseType: 'blob' });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${enrolmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to download certificate'));
    }
  }, []);

  const verifyCertificate = useCallback(async (code: string): Promise<VerifyCertificateResult | null> => {
    try {
      // Use a plain axios instance WITHOUT the auth interceptor because
      // the public verify endpoint must work for unauthenticated clients.
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4500/api'}/certificates/verify/${code}`);
      return unwrapResponse<VerifyCertificateResult>(res);
    } catch {
      return { valid: false };
    }
  }, []);

  return { downloadCertificate, verifyCertificate };
}
```

**Important**: `verifyCertificate` uses a bare `axios` call, not `apiClient`, because the request must NOT include the `Authorization` header. The public verify endpoint works unauthenticated; sending an expired/missing token would just be noise.

### Step 2 — `CertificateDownloadCard.tsx`

Shows the certificate info (student name, course name, issued date, verification code) and a big "Download Certificate" button. Also shows the shareable verification URL (`/verify/certificate/<code>`) with a copy button.

### Step 3 — `/student/courses/[id]/certificate/page.tsx`

Thin orchestrator. Resolves courseId → enrolmentId, fetches the certificate data, renders `CertificateDownloadCard`. If no certificate exists (because the student didn't complete / didn't pass / certs disabled), shows an empty state explaining why.

### Step 4 — Type-check + commit

```bash
npx tsc --noEmit
git add src/hooks/useCertificate.ts src/app/\(dashboard\)/student/courses/\[id\]/certificate/page.tsx src/components/courses/CertificateDownloadCard.tsx
git commit -m "feat(courses): add student certificate download page"
```

---

## Task 13 — Teacher analytics dashboard

**Files:**
- Create: `src/hooks/useCourseAnalytics.ts`
- Create: `src/app/(dashboard)/teacher/courses/[id]/analytics/page.tsx`
- Create: `src/components/courses/AnalyticsStatCards.tsx`
- Create: `src/components/courses/LessonDropOffChart.tsx`
- Create: `src/components/courses/ClassBreakdownTable.tsx`

### Step 1 — `useCourseAnalytics`

```ts
export function useCourseAnalytics(courseId: string) {
  const [data, setData] = useState<CourseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await apiClient.get(`/courses/${courseId}/analytics`);
      setData(unwrapResponse<CourseAnalytics>(res));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load analytics'));
    }
  }, [courseId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  useEffect(() => {
    void (async () => { await fetch(); setLoading(false); })();
  }, [fetch]);

  return { data, loading, refreshing, refresh };
}
```

### Step 2 — `AnalyticsStatCards.tsx`

Four stat cards using the existing `StatCard` component: Enrolments, Completion Rate, Avg Quiz Score, Certificates Issued. Each with a Lucide icon and a subtitle ("X active, Y completed" etc.).

### Step 3 — `LessonDropOffChart.tsx`

A grouped bar chart using Recharts (already a repo dependency). X-axis: lesson title (truncated). Y-axis: student count. Two bars per lesson: `studentsReached` and `studentsCompleted`. Tooltip on hover.

### Step 4 — `ClassBreakdownTable.tsx`

Simple table: Class Name | Enroled | Completed | Completion % per row. Uses the existing `DataTable` shared component.

### Step 5 — `/teacher/courses/[id]/analytics/page.tsx`

```tsx
'use client';
import { useCourseAnalytics } from '@/hooks/useCourseAnalytics';
import { AnalyticsStatCards } from '@/components/courses/AnalyticsStatCards';
import { LessonDropOffChart } from '@/components/courses/LessonDropOffChart';
import { ClassBreakdownTable } from '@/components/courses/ClassBreakdownTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCardsSkeleton } from '@/components/shared/skeletons';
import { RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function CourseAnalyticsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { data, loading, refreshing, refresh } = useCourseAnalytics(courseId);

  if (loading || !data) return <>
    <PageHeader title="Course Analytics" />
    <StatCardsSkeleton count={4} />
  </>;

  return (
    <div className="space-y-6">
      <PageHeader title="Course Analytics" description="Enrolment, completion, and engagement metrics">
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>
      <AnalyticsStatCards data={data} />
      <Card>
        <CardHeader><CardTitle>Lesson Drop-off</CardTitle></CardHeader>
        <CardContent><LessonDropOffChart data={data.perLessonDropOff} /></CardContent>
      </Card>
      {data.perClassBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Per-Class Breakdown</CardTitle></CardHeader>
          <CardContent><ClassBreakdownTable data={data.perClassBreakdown} /></CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Step 6 — Type-check + commit

```bash
npx tsc --noEmit
git add src/hooks/useCourseAnalytics.ts src/app/\(dashboard\)/teacher/courses/\[id\]/analytics/page.tsx src/components/courses/AnalyticsStatCards.tsx src/components/courses/LessonDropOffChart.tsx src/components/courses/ClassBreakdownTable.tsx
git commit -m "feat(courses): add teacher course analytics dashboard"
```

---

## Task 14 — Public verify page (outside dashboard group)

**Files:**
- Create: `src/app/verify/layout.tsx`
- Create: `src/app/verify/certificate/[code]/page.tsx`
- Create: `src/components/courses/VerifyResultCard.tsx`

### Step 1 — `src/app/verify/layout.tsx`

Minimal standalone layout. No sidebar, no auth guard. Just a header with the Campusly logo, centred content area, and a footer.

```tsx
export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <h1 className="text-xl font-bold">Campusly</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">{children}</main>
    </div>
  );
}
```

### Step 2 — `VerifyResultCard.tsx`

Two-state card: valid (shows student name, course, school, issue date with a green checkmark) or invalid (shows an error icon and a message explaining the code wasn't found).

### Step 3 — `src/app/verify/certificate/[code]/page.tsx`

```tsx
'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCertificate } from '@/hooks/useCertificate';
import { VerifyResultCard } from '@/components/courses/VerifyResultCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { VerifyCertificateResult } from '@/types';

export default function VerifyCertificatePage() {
  const params = useParams();
  const code = params.code as string;
  const { verifyCertificate } = useCertificate();
  const [result, setResult] = useState<VerifyCertificateResult | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await verifyCertificate(code);
      setResult(r);
    })();
  }, [code, verifyCertificate]);

  if (!result) return <LoadingSpinner />;
  return <VerifyResultCard result={result} code={code} />;
}
```

### Step 4 — Type-check + commit

```bash
npx tsc --noEmit
git add src/app/verify/layout.tsx src/app/verify/certificate/\[code\]/page.tsx src/components/courses/VerifyResultCard.tsx
git commit -m "feat(courses): add public certificate verification page"
```

---

## Task 15 — Final end-to-end smoke

- [ ] **Step 1: Start backend dev server**

```bash
cd c:\Users\shaun\campusly-backend
npm run dev
```

Confirm it boots with all Courses routes mounted.

- [ ] **Step 2: Start frontend dev server**

```bash
cd c:\Users\shaun\campusly-frontend
npm run dev
```

Open `http://localhost:3500`.

- [ ] **Step 3: Enable the `courses` module on your dev school**

Via Mongo shell or via the super-admin UI if one exists:

```js
db.schools.updateOne(
  { _id: ObjectId("<your-dev-school-id>") },
  { $addToSet: { modulesEnabled: "courses" } }
);
```

Clear the Redis module cache:

```bash
redis-cli DEL "school:modules:<your-dev-school-id>"
```

- [ ] **Step 4: Walk through every page manually**

1. Log in as a teacher → navigate to `/teacher/courses` → Create a course → land in builder → add a module → click "+ Lesson" → resource picker opens → search for a Content Library item → add it → the lesson appears in the outline → click it in the outline → lesson editor shows on the centre panel → edit the title → drag the lesson to a different position → submit for review (button now enabled)
2. Log in as an HOD or school_admin → navigate to `/admin/courses/review` → see the submitted course → click to preview → publish
3. Log in as the teacher again → open the course → click "Assign to Class" → pick a class → assign
4. Log in as a student in that class → navigate to `/student/courses` → see the course in My Courses → click to open → see the course home with outline → click the first available lesson → lesson player loads → interact with the content or scroll to end → "Next" button enables → progress to the next lesson
5. Go back to the teacher → navigate to `/teacher/courses/[id]/analytics` → see the stats reflecting the one enrolment + progress
6. (Optional) With a fake 12-char code, visit `http://localhost:3500/verify/certificate/ABCDEFGHJKLM` → see "Certificate not valid" result card

If every step works end-to-end, Plan D is ready to hand off.

### Final `tsc --noEmit` + `eslint` pass

```bash
cd c:\Users\shaun\campusly-frontend
npx tsc --noEmit
npx eslint src/app/\(dashboard\)/teacher/courses src/app/\(dashboard\)/admin/courses src/app/\(dashboard\)/student/courses src/app/verify src/components/courses src/hooks/useCourse* src/hooks/useStudentCourses.ts src/hooks/useLessonPlayer.ts src/hooks/useCertificate.ts src/hooks/useCourseAnalytics.ts src/hooks/useTeacherCourses.ts src/types/courses.ts
```

Both must exit 0 with no new errors or warnings (pre-existing lint issues from the teacher-UX session may remain).

---

## Self-review — Plan D

After executing every task, do a final pass:

- [ ] **Spec coverage check**: every frontend surface in the design spec is implemented. Teacher builder with three panels, drag-sortable outline, resource picker, assign dialog, analytics dashboard. HOD review queue. Student catalog, my courses, course home, lesson player, certificate download. Public verify page.

- [ ] **No `apiClient` imports in pages or components**: run this grep and confirm zero hits.
  ```bash
  grep -rn "from '@/lib/api-client'" src/app/\(dashboard\)/teacher/courses src/app/\(dashboard\)/admin/courses src/app/\(dashboard\)/student/courses src/components/courses
  ```
  Every API call must go through a hook. The existing `src/lib/api-helpers.ts` and `apiClient` are imported ONLY by hooks under `src/hooks/`.

- [ ] **Design token discipline**: grep for `text-red-` or `bg-red-` in the new `src/components/courses/` folder. Should be zero hits — use `text-destructive` / `bg-destructive/10` per CLAUDE.md.

- [ ] **Mobile responsiveness**: every grid has `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` style breakpoints. Every fixed-width element has `w-full sm:w-X` responsive pattern. The course builder's three-panel layout collapses to a stacked single-column on mobile.

- [ ] **`tsc --noEmit` clean** after every task commit.

---

## What Plan D does NOT do

- **No student self-enrolment** — the catalog shows available courses but students can't enrol themselves. Out of scope per Plan B. Catalog click shows a tooltip explaining the teacher needs to assign.
- **No inline content authoring** — the course builder's lesson editor does NOT have a rich-text editor or block composer. Teachers who need new content open the Content Library in a new tab, create the resource there, return to the builder, and pick it via the resource picker.
- **No image upload in the cover image field** — plain URL input. Image upload infrastructure is a separate feature.
- **No drag-and-drop between modules** — lessons can reorder within a module and move to another module via the `reorderLessons` bulk endpoint, but a drag from module A to module B in a single gesture isn't explicitly visualised. The `@dnd-kit` SortableContext handles within-module drops; cross-module drops require a more complex `DndContext` setup. Plan D accepts the single-module drag as the MVP and flags cross-module drag as a polish item.
- **No discussion threads, no drip content, no bulk operations** — deferred
- **No analytics drill-down** — the dashboard returns aggregates, not individual student histories. A teacher who wants to see why a specific student hasn't completed lesson 5 must navigate through `/teacher/classes/[id]` and inspect that student separately.
- **No certificate verification by email or QR code** — the 12-char code in the URL is the verification mechanism. A QR code on the PDF could encode the verify URL as a polish item in a later plan.
- **No offline support** — requires a live network connection for everything
- **No i18n** — English only for MVP
