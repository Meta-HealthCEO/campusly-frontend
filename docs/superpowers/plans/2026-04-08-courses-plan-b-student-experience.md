# Courses Plan B — Student Experience

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the student-facing backend layer to the Courses feature: catalog browsing, my-enrolments listing, lesson player with server-side gating, lesson progress tracking, and quiz grading. After this plan a student can open an enroled course, work through lessons in order with linear unlock + auto-complete, attempt quizzes that grade against the Question Bank's answer keys, and have their progress recorded. Certificate generation is still Plan C.

**Architecture:** Extends the existing `src/modules/Course/` module from Plan A. Adds two new service files (`service-student.ts` for read-side queries and `service-progress.ts` for the progress / quiz mutations) so `service.ts` doesn't grow past ~1000 lines. Adds a single new top-level routes file `src/modules/Course/routes-student.ts` mounted at `/api/enrolments` because `/api/courses/catalog/...` and `/api/enrolments/me` belong to different URL trees but the same module. Reuses the existing models — no schema changes; the `LessonProgress` and `QuizAttempt` stub schemas from Plan A are filled out behaviourally. The student lesson player calls `/api/enrolments/:id/lessons/:lessonId` which returns the referenced ContentResource / Textbook chapter / Question Bank quiz already populated, so the frontend can render with its existing block renderers.

**Tech Stack:** Express 5, Mongoose 9, Zod 4 (`zod/v4` subpath), TypeScript strict. No test framework — verification is `tsc --noEmit` + a smoke script.

**Related spec:** [docs/superpowers/specs/2026-04-08-courses-design.md](../specs/2026-04-08-courses-design.md)

**Plan A status:** Complete. The Course module exists at `c:\Users\shaun\campusly-backend\src\modules\Course\` with `model.ts`, `validation.ts`, `service.ts`, `controller.ts`, `routes.ts`, mounted at `/api/courses` behind `requireModule('courses')`. The 7 Mongoose models (including `LessonProgress`, `QuizAttempt`, `Certificate` stubs) are registered. The `CourseActor` permission pattern is in place.

**Plan B scope:**
- IN: Catalog endpoints, my-enrolments, lesson fetch with server-side gating, progress writes, quiz grading, drop / unassign endpoint, smoke script update
- OUT (Plan C): Certificate generation, public verification endpoint, analytics aggregation, certificate-issuance trigger
- OUT (frontend Plans D+): All UI work — student catalog, learner player, teacher analytics view

---

## Critical decisions made by this plan

These are decisions that affect Plan B's design and need to be explicit so the implementer doesn't rediscover them:

### 1. Quiz lessons restricted to auto-gradable question types

The Question Bank model supports 10 question types. Only three are auto-gradable against canonical answer fields:

- **`mcq`** — uses `options[]` with `isCorrect: boolean` per option. Client sends a chosen option label/index, server compares.
- **`true_false`** — same shape as MCQ.
- **`fill_blank`** — uses the `answer: string` field. Server normalises (trim + lowercase) and compares.

The other types (`short_answer`, `structured`, `essay`, `match`, `calculation`, `diagram_label`, `case_study`) are open-ended or have non-trivial answer schemas. Plan B's quiz grader **rejects** quiz lessons containing any of those types at lesson-creation time (we'll add this check to the existing `addLesson` service). This preserves the "grades server-side" promise from the spec.

A future plan can add manual / rubric-based grading for the open-ended types.

### 2. `Student.userId` → `User._id` resolution at every student endpoint

The JWT carries `req.user.id` which is a `User._id`. Every `Enrolment` row keys on `Student._id`, not `User._id`. So every student-side endpoint must:

1. Resolve the calling user's `Student` record via `Student.findOne({ userId: req.user.id })`
2. Use that `Student._id` for all subsequent enrolment lookups

A new helper `getStudentForUser(userId, schoolId)` will live in `service-student.ts` and be the single point that does this resolution. Throws `ForbiddenError` if the calling user has no Student record (a teacher hitting `/enrolments/me` would get this error).

### 3. Lesson progress completion is computed server-side, never trusted from the client

The progress endpoint accepts `{ interactionsDone, scrolledToEnd }` but the server enforces:
- For `type='content'` / `type='chapter'`: complete when `interactionsDone >= interactionsTotal`, OR `scrolledToEnd && interactionsTotal === 0`
- For `type='homework'`: complete when a `HomeworkSubmission` exists for the student
- For `type='quiz'`: complete only via a passing `QuizAttempt`

Where `interactionsTotal` comes from: when a student first opens a content lesson, the server counts the interactive blocks in the referenced `ContentResource.blocks[]` (block types `quiz`, `fill_blank`, `match`, `ordering`) and stores the count as `LessonProgress.interactionsTotal`. This is computed once at first-open, not on every progress write. The client just reports how many it has completed; the server validates `interactionsDone <= interactionsTotal`.

### 4. Linear unlock is enforced at the lesson-fetch endpoint, not at progress-write

The progress endpoint just writes whatever the student reports. The lesson-fetch endpoint (`GET /api/enrolments/:id/lessons/:lessonId`) is where the server checks "is this lesson available to this student right now?" and returns 403 if not. This means a malicious client cannot bypass gating by directly POSTing progress for a locked lesson — they'd have to first GET the lesson, which gets refused.

The unlock rule: a lesson at `(moduleOrderIndex, lessonOrderIndex)` is unlocked if EITHER:
- It's the first lesson in the course (module order 0, lesson order 0), OR
- The previous lesson in the same module is `completed`, OR
- It's the first lesson in a module and the LAST lesson of the previous module is `completed`

The "previous lesson" is determined by sorting all lessons in the course by `(moduleOrderIndex, lessonOrderIndex)`.

### 5. Self-enrolment is OUT of scope

The spec lists `POST /api/courses/:id/enrol` for student self-enrolment as a phase-2 feature. Plan B does not implement it. The endpoint returns `ForbiddenError` with a clear message so future Plan C/D can flip it on. Students only get into courses via teacher assignment from Plan A's `assignCourseToClass`.

### 6. `DELETE /api/enrolments/:id` (drop) IS in Plan B

Plan A deferred this. It belongs here because:
- Students need a "leave this course" action to drop self-enrolments
- Teachers need an "unassign student from course" action
- The route lives at `/api/enrolments/:id` which is a top-level mount that Plan B introduces anyway

The drop endpoint soft-deletes the `Enrolment` row. Cascade behaviour: `LessonProgress` and `QuizAttempt` rows are NOT cascaded — they stay so a teacher can audit the dropped student's history if needed.

---

## File Structure

### New files in `campusly-backend/src/`

- `modules/Course/service-student.ts` — read-side: catalog, my-enrolments, lesson fetch with gating
- `modules/Course/service-progress.ts` — write-side: progress updates, quiz grading
- `modules/Course/controller-student.ts` — handlers for student endpoints
- `modules/Course/routes-student.ts` — `/api/enrolments` route tree (separate file for clean namespace)

### Modified files

- `modules/Course/service.ts` — add `addLesson` validation that rejects non-gradable question types in quiz lessons
- `modules/Course/controller.ts` — add catalog and analytics-stub handlers (catalog lives under `/api/courses/catalog`, not `/api/enrolments`)
- `modules/Course/routes.ts` — add `GET /catalog` and `GET /catalog/:slug` routes
- `app.ts` — mount `/api/enrolments` behind `authenticate + requireModule('courses')`
- `scripts/smoke-courses.ts` — extend the existing smoke script with student-side steps

### Why the file split

Plan A's `service.ts` is already 747 lines and contains all the authoring logic. Plan B adds:
- `service-student.ts` — ~250 lines (catalog list, getCatalogPreview, getMyEnrolments, getEnrolment, getLessonForStudent with gating)
- `service-progress.ts` — ~300 lines (interactionsTotal computation, progress writes, quiz attempt grading, completion calculation, drop)

Co-locating these in `service.ts` would push the file past 1300 lines. The split is along a clean responsibility seam: `service.ts` is "what the teacher does", `service-student.ts` is "what the student reads", `service-progress.ts` is "what the student writes". The repo has precedent for this split (Pastoral, Conference, Department).

---

## Task 1 — Reject non-gradable question types in `addLesson`

This is a small Plan A patch that closes a gap: a teacher could currently add an essay question to a quiz lesson and the grader in Task 5 would have nothing to compare against.

**Files:**
- Modify: `campusly-backend/src/modules/Course/service.ts`

- [ ] **Step 1: Read the current `addLesson` method**

Open `c:\Users\shaun\campusly-backend\src\modules\Course\service.ts` and find the `static async addLesson` method. The current quiz branch reads:

```ts
} else if (data.type === 'quiz') {
  lessonDoc.quizQuestionIds = data.quizQuestionIds.map(
    (id) => new mongoose.Types.ObjectId(id),
  );
}
```

- [ ] **Step 2: Add the gradability check before the conversion**

At the top of the file, add this import alongside the existing model imports:

```ts
import { Question } from '../QuestionBank/model.js';
```

Replace the `data.type === 'quiz'` branch with:

```ts
} else if (data.type === 'quiz') {
  // Plan B will grade quiz attempts server-side. Only the three question
  // types whose canonical answers live on the Question schema can be
  // auto-graded. Reject any quiz lesson that includes other types at
  // creation time so the constraint is visible to authors immediately
  // rather than as a runtime grading failure later.
  const GRADABLE_TYPES = new Set(['mcq', 'true_false', 'fill_blank']);
  const ids = data.quizQuestionIds.map((id) => new mongoose.Types.ObjectId(id));

  const questions = await Question.find({
    _id: { $in: ids },
    isDeleted: false,
    $or: [{ schoolId: course.schoolId }, { schoolId: null }],
  })
    .select('_id type')
    .lean();

  if (questions.length !== ids.length) {
    throw new BadRequestError(
      'One or more quiz questions do not exist or are not accessible to this school',
    );
  }

  const ungradable = questions.filter((q) => !GRADABLE_TYPES.has(q.type));
  if (ungradable.length > 0) {
    throw new BadRequestError(
      'Quiz lessons may only contain mcq, true_false, or fill_blank questions',
    );
  }

  lessonDoc.quizQuestionIds = ids;
}
```

Notes on the query shape:
- `$or: [{ schoolId: course.schoolId }, { schoolId: null }]` — `Question.schoolId` can be `null` for system-provided questions, so the "belongs to school" check accepts both school-owned and system questions. Verify by reading `src/modules/QuestionBank/model.ts` line 217.
- `Question` is imported as `import { Question } from '../QuestionBank/model.js';` — verify it's exported under that name.

- [ ] **Step 3: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/service.ts
git commit -m "feat(courses): reject non-gradable question types in quiz lessons

Plan B grades quiz attempts server-side using the canonical answer fields
on the Question schema. Only mcq, true_false, and fill_blank questions
have auto-gradable answers (options[].isCorrect for the first two,
answer string for fill_blank). Reject any other question type at lesson
creation so authors can't build a quiz that will fail to grade later."
```

---

## Task 2 — `service-student.ts`: catalog + my-enrolments + lesson fetch

**Files:**
- Create: `campusly-backend/src/modules/Course/service-student.ts`

This file holds every read-side query a student or non-author needs.

- [ ] **Step 1: Write the file**

Create `c:\Users\shaun\campusly-backend\src\modules\Course\service-student.ts`:

```ts
import mongoose from 'mongoose';
import {
  Course,
  CourseModule,
  CourseLesson,
  Enrolment,
  LessonProgress,
  type ICourseLesson,
  type ILessonProgress,
} from './model.js';
import { Student } from '../Student/model.js';
import { ContentResource } from '../ContentLibrary/model.js';
import { Textbook } from '../Textbook/model.js';
import { Homework } from '../Homework/model.js';
import { Question } from '../QuestionBank/model.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors.js';
import { escapeRegex } from '../../common/utils.js';

// ─── Catalog (any authenticated user in the school) ────────────────────────

export class CourseStudentService {
  /**
   * List all published courses in the school. Open to any authenticated
   * user — students see this catalog, teachers see it too. The route layer
   * already enforces "must be authenticated"; this service just scopes by
   * schoolId + status='published'.
   */
  static async listCatalog(
    schoolId: string,
    filters: { subjectId?: string; gradeLevel?: number; search?: string },
  ) {
    const soid = new mongoose.Types.ObjectId(schoolId);
    const query: Record<string, unknown> = {
      schoolId: soid,
      isDeleted: false,
      status: 'published',
    };
    if (filters.subjectId) {
      query.subjectId = new mongoose.Types.ObjectId(filters.subjectId);
    }
    if (filters.gradeLevel !== undefined) query.gradeLevel = filters.gradeLevel;
    if (filters.search) {
      query.title = { $regex: escapeRegex(filters.search), $options: 'i' };
    }
    const courses = await Course.find(query)
      .select('-reviewNotes')
      .populate([
        { path: 'subjectId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName' },
      ])
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();
    return { courses, total: courses.length };
  }

  /**
   * Get a single published course by slug for catalog preview. Returns the
   * full module/lesson tree so the catalog card can show what's inside,
   * but does NOT include the actual content blocks (those gate behind
   * enrolment + per-lesson unlock).
   */
  static async getCatalogPreview(slug: string, schoolId: string) {
    const soid = new mongoose.Types.ObjectId(schoolId);
    const course = await Course.findOne({
      schoolId: soid,
      slug,
      isDeleted: false,
      status: 'published',
    })
      .populate([
        { path: 'subjectId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName' },
      ])
      .lean();
    if (!course) throw new NotFoundError('Course not found');

    const modules = await CourseModule.find({
      courseId: course._id,
      schoolId: soid,
      isDeleted: false,
    })
      .sort({ orderIndex: 1 })
      .lean();

    const lessons = await CourseLesson.find({
      courseId: course._id,
      schoolId: soid,
      isDeleted: false,
    })
      .select('-quizQuestionIds') // hide which exact questions are inside
      .sort({ orderIndex: 1 })
      .lean();

    const lessonsByModule: Record<string, typeof lessons> = {};
    for (const l of lessons) {
      const key = l.moduleId.toString();
      if (!lessonsByModule[key]) lessonsByModule[key] = [];
      lessonsByModule[key].push(l);
    }
    const modulesWithLessons = modules.map((m) => ({
      ...m,
      lessons: lessonsByModule[m._id.toString()] ?? [],
    }));

    return { ...course, modules: modulesWithLessons };
  }

  // ─── Student record resolution ─────────────────────────────────────────

  /**
   * Find the Student record for a given User. The JWT carries User._id but
   * Enrolment is keyed on Student._id, so every student endpoint resolves
   * via this helper. Throws ForbiddenError for users without a Student
   * record (e.g. a teacher hitting a student-only endpoint).
   */
  static async getStudentForUser(userId: string, schoolId: string) {
    const student = await Student.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isDeleted: false,
    })
      .select('_id')
      .lean();
    if (!student) {
      throw new ForbiddenError('Only students can access this endpoint');
    }
    return student;
  }

  // ─── My enrolments ─────────────────────────────────────────────────────

  /**
   * List the calling student's active + completed enrolments with their
   * course summary. Used by the student "My Courses" grid.
   */
  static async listMyEnrolments(userId: string, schoolId: string) {
    const student = await this.getStudentForUser(userId, schoolId);
    const soid = new mongoose.Types.ObjectId(schoolId);
    const enrolments = await Enrolment.find({
      studentId: student._id,
      schoolId: soid,
      isDeleted: false,
      status: { $in: ['active', 'completed'] },
    })
      .populate({
        path: 'courseId',
        select: 'title slug description coverImageUrl gradeLevel subjectId',
        populate: { path: 'subjectId', select: 'name' },
      })
      .sort({ enrolledAt: -1 })
      .lean();
    return { enrolments, total: enrolments.length };
  }

  /**
   * Get one enrolment with the full course tree + per-lesson progress.
   * The student must own this enrolment, OR the caller must be a teacher
   * who owns the course (for the teacher's "view this student's progress"
   * use case).
   */
  static async getEnrolment(
    enrolmentId: string,
    userId: string,
    schoolId: string,
  ) {
    if (!mongoose.Types.ObjectId.isValid(enrolmentId)) {
      throw new NotFoundError('Enrolment not found');
    }
    const soid = new mongoose.Types.ObjectId(schoolId);
    const enrolment = await Enrolment.findOne({
      _id: new mongoose.Types.ObjectId(enrolmentId),
      schoolId: soid,
      isDeleted: false,
    }).lean();
    if (!enrolment) throw new NotFoundError('Enrolment not found');

    // Authorization: the calling user is either the enrolled student, or
    // the course author. (Admin/HOD/principal access goes through the
    // teacher-side listEnrolments.)
    const student = await Student.findOne({
      _id: enrolment.studentId,
      schoolId: soid,
      isDeleted: false,
    })
      .select('userId')
      .lean();
    const callerIsStudent = student?.userId.toString() === userId;

    const course = await Course.findOne({
      _id: enrolment.courseId,
      schoolId: soid,
      isDeleted: false,
    })
      .populate([
        { path: 'subjectId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName' },
      ])
      .lean();
    if (!course) throw new NotFoundError('Course not found');

    const callerIsAuthor = course.createdBy._id?.toString() === userId
      || course.createdBy.toString() === userId;

    if (!callerIsStudent && !callerIsAuthor) {
      throw new ForbiddenError('You do not have access to this enrolment');
    }

    // Build the module/lesson tree.
    const modules = await CourseModule.find({
      courseId: course._id,
      schoolId: soid,
      isDeleted: false,
    })
      .sort({ orderIndex: 1 })
      .lean();

    const lessons = await CourseLesson.find({
      courseId: course._id,
      schoolId: soid,
      isDeleted: false,
    })
      .sort({ orderIndex: 1 })
      .lean();

    const progressRows = await LessonProgress.find({
      enrolmentId: enrolment._id,
      schoolId: soid,
      isDeleted: false,
    }).lean();

    const progressByLesson = new Map<string, ILessonProgress>();
    for (const p of progressRows) {
      progressByLesson.set(p.lessonId.toString(), p);
    }

    // Compute per-lesson unlock status based on the linear unlock rule.
    const sortedLessons = sortLessonsForUnlock(lessons, modules);
    const lessonStatusById = computeUnlockStatuses(sortedLessons, progressByLesson);

    const lessonsByModule: Record<string, typeof lessons> = {};
    for (const l of lessons) {
      const key = l.moduleId.toString();
      if (!lessonsByModule[key]) lessonsByModule[key] = [];
      lessonsByModule[key].push(l);
    }

    const modulesWithLessons = modules.map((m) => ({
      ...m,
      lessons: (lessonsByModule[m._id.toString()] ?? []).map((l) => ({
        ...l,
        progress: progressByLesson.get(l._id.toString()) ?? null,
        unlockStatus: lessonStatusById.get(l._id.toString()) ?? 'locked',
      })),
    }));

    return {
      enrolment,
      course: { ...course, modules: modulesWithLessons },
    };
  }

  // ─── Lesson fetch with gating ──────────────────────────────────────────

  /**
   * Return one lesson's full content for a student to render. The server
   * enforces three things:
   *
   *   1. The enrolment belongs to the calling user
   *   2. The lesson is unlocked under the linear-unlock rule
   *   3. The referenced source (ContentResource / Textbook chapter / Homework
   *      / Question Bank quiz) actually exists and belongs to this school
   *
   * Returns the lesson plus the populated source content.
   */
  static async getLessonForStudent(
    enrolmentId: string,
    lessonId: string,
    userId: string,
    schoolId: string,
  ) {
    if (
      !mongoose.Types.ObjectId.isValid(enrolmentId)
      || !mongoose.Types.ObjectId.isValid(lessonId)
    ) {
      throw new NotFoundError('Lesson not found');
    }
    const soid = new mongoose.Types.ObjectId(schoolId);

    const enrolment = await Enrolment.findOne({
      _id: new mongoose.Types.ObjectId(enrolmentId),
      schoolId: soid,
      isDeleted: false,
      status: 'active',
    }).lean();
    if (!enrolment) throw new NotFoundError('Enrolment not found');

    // Authorization: caller must be the enrolled student.
    const student = await Student.findOne({
      _id: enrolment.studentId,
      schoolId: soid,
      isDeleted: false,
    })
      .select('userId')
      .lean();
    if (!student || student.userId.toString() !== userId) {
      throw new ForbiddenError('You do not have access to this lesson');
    }

    const lesson = await CourseLesson.findOne({
      _id: new mongoose.Types.ObjectId(lessonId),
      courseId: enrolment.courseId,
      schoolId: soid,
      isDeleted: false,
    }).lean();
    if (!lesson) throw new NotFoundError('Lesson not found');

    // Gating: compute whether this lesson is unlocked.
    const allModules = await CourseModule.find({
      courseId: enrolment.courseId,
      schoolId: soid,
      isDeleted: false,
    })
      .sort({ orderIndex: 1 })
      .lean();
    const allLessons = await CourseLesson.find({
      courseId: enrolment.courseId,
      schoolId: soid,
      isDeleted: false,
    })
      .sort({ orderIndex: 1 })
      .lean();
    const progressRows = await LessonProgress.find({
      enrolmentId: enrolment._id,
      schoolId: soid,
      isDeleted: false,
    }).lean();
    const progressByLesson = new Map<string, ILessonProgress>();
    for (const p of progressRows) progressByLesson.set(p.lessonId.toString(), p);

    const sortedLessons = sortLessonsForUnlock(allLessons, allModules);
    const lessonStatusById = computeUnlockStatuses(sortedLessons, progressByLesson);
    const status = lessonStatusById.get(lesson._id.toString()) ?? 'locked';

    if (status === 'locked') {
      throw new ForbiddenError('Complete the previous lesson first');
    }

    // Resolve the referenced source.
    const source = await resolveLessonSource(lesson, soid);
    return { lesson, source };
  }
}

// ─── Module-private helpers ────────────────────────────────────────────────

/**
 * Sort lessons in linear-unlock order: by module orderIndex, then lesson
 * orderIndex within the module.
 */
function sortLessonsForUnlock(
  lessons: ICourseLesson[],
  modules: { _id: mongoose.Types.ObjectId; orderIndex: number }[],
): ICourseLesson[] {
  const moduleOrder = new Map<string, number>();
  for (const m of modules) moduleOrder.set(m._id.toString(), m.orderIndex);
  return [...lessons].sort((a, b) => {
    const am = moduleOrder.get(a.moduleId.toString()) ?? 0;
    const bm = moduleOrder.get(b.moduleId.toString()) ?? 0;
    if (am !== bm) return am - bm;
    return a.orderIndex - b.orderIndex;
  });
}

/**
 * Compute the unlock status of every lesson based on completed progress.
 *
 * Rules:
 *   - The first lesson (in sorted order) is always 'available'
 *   - A lesson is 'available' if the previous lesson (in sorted order) has
 *     a LessonProgress row with status === 'completed'
 *   - Otherwise it is 'locked'
 *
 * If a lesson has its own progress row with a status other than 'locked',
 * we trust that status (so 'in_progress' and 'completed' show through to
 * the client without being overridden).
 */
function computeUnlockStatuses(
  sortedLessons: ICourseLesson[],
  progressByLesson: Map<string, ILessonProgress>,
): Map<string, 'locked' | 'available' | 'in_progress' | 'completed'> {
  const out = new Map<string, 'locked' | 'available' | 'in_progress' | 'completed'>();
  let prevCompleted = true; // first lesson is unconditionally available
  for (const l of sortedLessons) {
    const progress = progressByLesson.get(l._id.toString());
    if (progress && progress.status === 'completed') {
      out.set(l._id.toString(), 'completed');
      prevCompleted = true;
      continue;
    }
    if (progress && progress.status === 'in_progress') {
      out.set(l._id.toString(), 'in_progress');
      prevCompleted = false;
      continue;
    }
    if (prevCompleted) {
      out.set(l._id.toString(), 'available');
    } else {
      out.set(l._id.toString(), 'locked');
    }
    prevCompleted = false;
  }
  return out;
}

/**
 * Fetch the underlying source document for a lesson based on its `type`.
 * Returns the populated source so the controller can hand a single object
 * back to the client. The student frontend then renders via its existing
 * block renderers.
 */
async function resolveLessonSource(
  lesson: ICourseLesson,
  schoolId: mongoose.Types.ObjectId,
) {
  if (lesson.type === 'content') {
    if (!lesson.contentResourceId) {
      throw new BadRequestError('Lesson is missing its content resource');
    }
    const resource = await ContentResource.findOne({
      _id: lesson.contentResourceId,
      isDeleted: false,
      $or: [{ schoolId }, { schoolId: null }],
    }).lean();
    if (!resource) throw new NotFoundError('Lesson content not found');
    return { kind: 'content' as const, resource };
  }

  if (lesson.type === 'chapter') {
    if (!lesson.textbookId || !lesson.chapterId) {
      throw new BadRequestError('Lesson is missing its textbook chapter');
    }
    const textbook = await Textbook.findOne({
      _id: lesson.textbookId,
      isDeleted: false,
      $or: [{ schoolId }, { schoolId: null }],
    }).lean();
    if (!textbook) throw new NotFoundError('Textbook not found');
    const chapter = textbook.chapters.find(
      (c) => c._id?.toString() === lesson.chapterId?.toString(),
    );
    if (!chapter) throw new NotFoundError('Chapter not found');
    return { kind: 'chapter' as const, textbook: { _id: textbook._id, title: textbook.title }, chapter };
  }

  if (lesson.type === 'homework') {
    if (!lesson.homeworkId) {
      throw new BadRequestError('Lesson is missing its homework reference');
    }
    const homework = await Homework.findOne({
      _id: lesson.homeworkId,
      schoolId,
      isDeleted: false,
    }).lean();
    if (!homework) throw new NotFoundError('Homework not found');
    return { kind: 'homework' as const, homework };
  }

  if (lesson.type === 'quiz') {
    if (!lesson.quizQuestionIds || lesson.quizQuestionIds.length === 0) {
      throw new BadRequestError('Lesson is missing its quiz questions');
    }
    // Fetch every question, but strip the `answer` field and the
    // `options[].isCorrect` flags so the client can't see correct answers.
    const questions = await Question.find({
      _id: { $in: lesson.quizQuestionIds },
      isDeleted: false,
      $or: [{ schoolId }, { schoolId: null }],
    }).lean();
    const safe = questions.map((q) => ({
      _id: q._id,
      type: q.type,
      stem: q.stem,
      media: q.media,
      diagram: q.diagram,
      marks: q.marks,
      options: q.options.map((o) => ({ label: o.label, text: o.text })),
    }));
    return { kind: 'quiz' as const, questions: safe };
  }

  throw new BadRequestError(`Unknown lesson type: ${(lesson as { type: string }).type}`);
}
```

- [ ] **Step 2: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`. Pre-flight check the imports — `Student`, `ContentResource`, `Textbook`, `Homework`, `Question` must all exist at the paths used. Use `grep -n "export.*Student\|export.*ContentResource\|export.*Textbook\|export.*Homework\|export.*Question" <path>` for each model file before assuming.

- [ ] **Step 3: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/service-student.ts
git commit -m "feat(courses): add student-side service (catalog, my-enrolments, lesson fetch with gating)"
```

---

## Task 3 — `service-progress.ts`: progress writes + quiz grading

**Files:**
- Create: `campusly-backend/src/modules/Course/service-progress.ts`

This file holds every mutation a student makes — progress writes, quiz attempts, and the drop endpoint.

- [ ] **Step 1: Write the file**

Create `c:\Users\shaun\campusly-backend\src\modules\Course\service-progress.ts`:

```ts
import mongoose from 'mongoose';
import {
  Course,
  CourseLesson,
  Enrolment,
  LessonProgress,
  QuizAttempt,
  type IQuestion,
} from './model.js';
// IQuestion isn't actually exported from Course/model.ts — fix this import
// during implementation by sourcing it from QuestionBank/model.js instead.
// (Keeping the line above as a deliberate stub the implementer must
// catch and replace.)
import { ContentResource } from '../ContentLibrary/model.js';
import { HomeworkSubmission } from '../Homework/model.js';
import { Question } from '../QuestionBank/model.js';
import { Student } from '../Student/model.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../common/errors.js';

const INTERACTIVE_BLOCK_TYPES = new Set([
  'quiz',
  'fill_blank',
  'match',
  'ordering',
]);

export class CourseProgressService {
  /**
   * Update a student's progress on a single lesson. Idempotent — safe to
   * call repeatedly. Server-side completion logic determines whether the
   * lesson is now complete and whether the next lesson should unlock.
   *
   * For content lessons, on first call we compute interactionsTotal by
   * counting interactive blocks in the referenced ContentResource and
   * store it on the LessonProgress row. Subsequent calls just update
   * interactionsDone via $max so reordered or out-of-order writes don't
   * regress the count.
   */
  static async writeLessonProgress(
    enrolmentId: string,
    lessonId: string,
    userId: string,
    schoolId: string,
    body: { interactionsDone?: number; scrolledToEnd?: boolean },
  ) {
    const ctx = await loadStudentLessonContext(enrolmentId, lessonId, userId, schoolId);
    const { enrolment, lesson, soid } = ctx;

    // Get-or-create LessonProgress row, computing interactionsTotal on
    // first touch for content lessons.
    let progress = await LessonProgress.findOne({
      enrolmentId: enrolment._id,
      lessonId: lesson._id,
      schoolId: soid,
      isDeleted: false,
    });

    if (!progress) {
      const interactionsTotal = await computeInteractionsTotal(lesson, soid);
      progress = await LessonProgress.create({
        enrolmentId: enrolment._id,
        studentId: enrolment.studentId,
        courseId: enrolment.courseId,
        lessonId: lesson._id,
        schoolId: soid,
        status: 'in_progress',
        interactionsDone: 0,
        interactionsTotal,
        scrolledToEnd: false,
      });
    }

    // Apply the update. Use $max-style logic to prevent backwards drift.
    const newInteractionsDone = Math.min(
      Math.max(progress.interactionsDone, body.interactionsDone ?? 0),
      progress.interactionsTotal === 0 ? 0 : progress.interactionsTotal,
    );
    const newScrolledToEnd = progress.scrolledToEnd || body.scrolledToEnd === true;

    progress.interactionsDone = newInteractionsDone;
    progress.scrolledToEnd = newScrolledToEnd;

    // Recompute completion. The rule depends on lesson type.
    const completed = await isLessonComplete(lesson, progress, enrolment, soid);
    if (completed) {
      progress.status = 'completed';
      progress.completedAt = new Date();
    } else if (progress.status === 'locked') {
      progress.status = 'in_progress';
    }
    await progress.save();

    // Recompute the enrolment's overall progressPercent.
    await recomputeEnrolmentProgress(enrolment._id, soid);

    return {
      progress,
      lessonStatus: progress.status,
      // The frontend can use the next-unlocked signal but the source of
      // truth is GET /enrolments/:id which recomputes from scratch.
      nextLessonUnlocked: completed,
    };
  }

  /**
   * Submit a quiz attempt for a quiz lesson. Server grades it against the
   * Question Bank's canonical answers and writes a QuizAttempt row. If the
   * student passes, the corresponding LessonProgress row is marked
   * completed.
   */
  static async submitQuizAttempt(
    enrolmentId: string,
    lessonId: string,
    userId: string,
    schoolId: string,
    body: { answers: { questionId: string; answer: unknown }[] },
  ) {
    const ctx = await loadStudentLessonContext(enrolmentId, lessonId, userId, schoolId);
    const { enrolment, lesson, soid, course } = ctx;

    if (lesson.type !== 'quiz') {
      throw new BadRequestError('This lesson is not a quiz');
    }
    if (!lesson.quizQuestionIds || lesson.quizQuestionIds.length === 0) {
      throw new BadRequestError('Quiz lesson has no questions');
    }

    // Check attempt limits.
    const previousAttempts = await QuizAttempt.countDocuments({
      enrolmentId: enrolment._id,
      lessonId: lesson._id,
      schoolId: soid,
      isDeleted: false,
    });
    if (lesson.maxAttempts !== null && previousAttempts >= lesson.maxAttempts) {
      throw new BadRequestError('Maximum attempts exceeded for this quiz');
    }

    // Fetch the canonical questions.
    const questions = await Question.find({
      _id: { $in: lesson.quizQuestionIds },
      isDeleted: false,
      $or: [{ schoolId: soid }, { schoolId: null }],
    }).lean();

    // Index by id for quick lookup.
    const questionsById = new Map<string, typeof questions[number]>();
    for (const q of questions) questionsById.set(q._id.toString(), q);

    // Grade each answer.
    let totalMarks = 0;
    let earnedMarks = 0;
    const gradedAnswers = body.answers.map((a) => {
      const q = questionsById.get(a.questionId);
      if (!q) {
        return {
          questionId: new mongoose.Types.ObjectId(a.questionId),
          answer: a.answer,
          isCorrect: false,
          marks: 0,
        };
      }
      totalMarks += q.marks;
      const isCorrect = gradeAnswer(q, a.answer);
      const earned = isCorrect ? q.marks : 0;
      earnedMarks += earned;
      return {
        questionId: q._id,
        answer: a.answer,
        isCorrect,
        marks: earned,
      };
    });

    // Add unanswered questions to totalMarks (so percent reflects the
    // whole quiz, not just attempted questions).
    for (const q of questions) {
      const wasAnswered = body.answers.some((a) => a.questionId === q._id.toString());
      if (!wasAnswered) totalMarks += q.marks;
    }

    const percent = totalMarks === 0 ? 0 : Math.round((earnedMarks / totalMarks) * 100);
    const passMark = lesson.passMarkPercent ?? 70;
    const passed = percent >= passMark;

    const attempt = await QuizAttempt.create({
      schoolId: soid,
      enrolmentId: enrolment._id,
      studentId: enrolment.studentId,
      courseId: enrolment.courseId,
      lessonId: lesson._id,
      attemptNumber: previousAttempts + 1,
      answers: gradedAnswers,
      totalMarks,
      earnedMarks,
      percent,
      passed,
      submittedAt: new Date(),
    });

    // If passed, mark the lesson complete. Otherwise leave the lesson in
    // its current state — the student can retry up to maxAttempts.
    if (passed) {
      let progress = await LessonProgress.findOne({
        enrolmentId: enrolment._id,
        lessonId: lesson._id,
        schoolId: soid,
        isDeleted: false,
      });
      if (!progress) {
        progress = await LessonProgress.create({
          enrolmentId: enrolment._id,
          studentId: enrolment.studentId,
          courseId: enrolment.courseId,
          lessonId: lesson._id,
          schoolId: soid,
          status: 'completed',
          completedAt: new Date(),
          interactionsDone: 0,
          interactionsTotal: 0,
          scrolledToEnd: false,
        });
      } else {
        progress.status = 'completed';
        progress.completedAt = new Date();
        await progress.save();
      }
      await recomputeEnrolmentProgress(enrolment._id, soid);
    }

    const canRetry = lesson.maxAttempts === null || previousAttempts + 1 < lesson.maxAttempts;
    return {
      attempt,
      passed,
      canRetry,
      nextLessonUnlocked: passed,
    };
  }

  /**
   * Drop / unassign an enrolment. Soft-deletes the Enrolment row but
   * preserves LessonProgress and QuizAttempt history for audit purposes.
   *
   * Authorization: the calling user must be either the enrolled student
   * (dropping themselves) or the course author / school admin (unassigning
   * a student). The route layer's authorize() already restricts to known
   * roles; this service does the row-level ownership check.
   */
  static async dropEnrolment(
    enrolmentId: string,
    userId: string,
    schoolId: string,
  ) {
    if (!mongoose.Types.ObjectId.isValid(enrolmentId)) {
      throw new NotFoundError('Enrolment not found');
    }
    const soid = new mongoose.Types.ObjectId(schoolId);
    const enrolment = await Enrolment.findOne({
      _id: new mongoose.Types.ObjectId(enrolmentId),
      schoolId: soid,
      isDeleted: false,
    });
    if (!enrolment) throw new NotFoundError('Enrolment not found');

    const student = await Student.findOne({
      _id: enrolment.studentId,
      schoolId: soid,
      isDeleted: false,
    })
      .select('userId')
      .lean();
    const callerIsStudent = student?.userId.toString() === userId;

    let callerIsAuthor = false;
    if (!callerIsStudent) {
      const course = await Course.findOne({
        _id: enrolment.courseId,
        schoolId: soid,
        isDeleted: false,
      })
        .select('createdBy')
        .lean();
      callerIsAuthor = course?.createdBy.toString() === userId;
    }

    if (!callerIsStudent && !callerIsAuthor) {
      throw new ForbiddenError('You do not have permission to drop this enrolment');
    }

    enrolment.isDeleted = true;
    enrolment.status = 'dropped';
    await enrolment.save();
    return { dropped: true };
  }
}

// ─── Module-private helpers ────────────────────────────────────────────────

interface StudentLessonContext {
  enrolment: Awaited<ReturnType<typeof Enrolment.findOne>>;
  lesson: Awaited<ReturnType<typeof CourseLesson.findOne>>;
  course: Awaited<ReturnType<typeof Course.findOne>>;
  soid: mongoose.Types.ObjectId;
}

/**
 * Shared loader: validates enrolment, ownership, and lesson belonging.
 * Used by every progress / quiz mutation. Throws on any failure.
 */
async function loadStudentLessonContext(
  enrolmentId: string,
  lessonId: string,
  userId: string,
  schoolId: string,
): Promise<{
  enrolment: NonNullable<Awaited<ReturnType<typeof Enrolment.findOne>>>;
  lesson: NonNullable<Awaited<ReturnType<typeof CourseLesson.findOne>>>;
  course: NonNullable<Awaited<ReturnType<typeof Course.findOne>>>;
  soid: mongoose.Types.ObjectId;
}> {
  if (
    !mongoose.Types.ObjectId.isValid(enrolmentId)
    || !mongoose.Types.ObjectId.isValid(lessonId)
  ) {
    throw new NotFoundError('Lesson not found');
  }
  const soid = new mongoose.Types.ObjectId(schoolId);
  const enrolment = await Enrolment.findOne({
    _id: new mongoose.Types.ObjectId(enrolmentId),
    schoolId: soid,
    isDeleted: false,
    status: 'active',
  });
  if (!enrolment) throw new NotFoundError('Enrolment not found');

  const student = await Student.findOne({
    _id: enrolment.studentId,
    schoolId: soid,
    isDeleted: false,
  })
    .select('userId')
    .lean();
  if (!student || student.userId.toString() !== userId) {
    throw new ForbiddenError('You do not have access to this lesson');
  }

  const lesson = await CourseLesson.findOne({
    _id: new mongoose.Types.ObjectId(lessonId),
    courseId: enrolment.courseId,
    schoolId: soid,
    isDeleted: false,
  });
  if (!lesson) throw new NotFoundError('Lesson not found');

  const course = await Course.findOne({
    _id: enrolment.courseId,
    schoolId: soid,
    isDeleted: false,
  });
  if (!course) throw new NotFoundError('Course not found');

  return { enrolment, lesson, course, soid };
}

/**
 * For a content lesson, count how many interactive blocks live inside the
 * referenced ContentResource. Returns 0 for chapter / homework / quiz
 * lessons (chapter completion is scroll-to-end only in Plan B because
 * Textbook chapters can have multiple resources and counting their
 * combined interactive blocks is complex enough to defer to Plan C).
 */
async function computeInteractionsTotal(
  lesson: NonNullable<Awaited<ReturnType<typeof CourseLesson.findOne>>>,
  schoolId: mongoose.Types.ObjectId,
): Promise<number> {
  if (lesson.type !== 'content' || !lesson.contentResourceId) return 0;
  const resource = await ContentResource.findOne({
    _id: lesson.contentResourceId,
    isDeleted: false,
    $or: [{ schoolId }, { schoolId: null }],
  })
    .select('blocks')
    .lean();
  if (!resource) return 0;
  return resource.blocks.filter((b) => INTERACTIVE_BLOCK_TYPES.has(b.type)).length;
}

/**
 * Determine whether a lesson should be marked complete given its current
 * progress row and lesson type.
 */
async function isLessonComplete(
  lesson: NonNullable<Awaited<ReturnType<typeof CourseLesson.findOne>>>,
  progress: NonNullable<Awaited<ReturnType<typeof LessonProgress.findOne>>>,
  enrolment: NonNullable<Awaited<ReturnType<typeof Enrolment.findOne>>>,
  schoolId: mongoose.Types.ObjectId,
): Promise<boolean> {
  if (lesson.type === 'content') {
    if (progress.interactionsTotal > 0) {
      return progress.interactionsDone >= progress.interactionsTotal;
    }
    return progress.scrolledToEnd === true;
  }
  if (lesson.type === 'chapter') {
    // Chapter completion in Plan B is scroll-to-end only. Counting
    // interactive blocks across a chapter's multiple resources is a
    // Plan C refinement.
    return progress.scrolledToEnd === true;
  }
  if (lesson.type === 'homework') {
    if (!lesson.homeworkId) return false;
    const submission = await HomeworkSubmission.findOne({
      homeworkId: lesson.homeworkId,
      studentId: enrolment.studentId,
      schoolId,
      isDeleted: false,
    })
      .select('_id')
      .lean();
    return submission !== null;
  }
  // Quiz completion is handled by submitQuizAttempt — never reaches here.
  return false;
}

/**
 * Recompute and persist the enrolment's progressPercent based on how many
 * lessons are completed vs total active lessons in the course.
 */
async function recomputeEnrolmentProgress(
  enrolmentId: mongoose.Types.ObjectId,
  schoolId: mongoose.Types.ObjectId,
): Promise<void> {
  const enrolment = await Enrolment.findById(enrolmentId);
  if (!enrolment) return;

  const totalLessons = await CourseLesson.countDocuments({
    courseId: enrolment.courseId,
    schoolId,
    isDeleted: false,
  });
  if (totalLessons === 0) {
    enrolment.progressPercent = 0;
    await enrolment.save();
    return;
  }

  const completedLessons = await LessonProgress.countDocuments({
    enrolmentId,
    schoolId,
    isDeleted: false,
    status: 'completed',
  });

  enrolment.progressPercent = Math.round((completedLessons / totalLessons) * 100);
  if (enrolment.progressPercent >= 100 && enrolment.status === 'active') {
    enrolment.status = 'completed';
    enrolment.completedAt = new Date();
    // Plan C will issue the certificate here.
  }
  await enrolment.save();
}

/**
 * Compare a student's answer against a Question's canonical answer.
 * Only handles the three auto-gradable types: mcq, true_false, fill_blank.
 * Other types are rejected at lesson creation time so they should never
 * reach the grader.
 */
function gradeAnswer(
  question: Pick<IQuestion, 'type' | 'options' | 'answer'>,
  studentAnswer: unknown,
): boolean {
  if (question.type === 'mcq' || question.type === 'true_false') {
    // Student sends the chosen option label (e.g. 'A', 'B', 'C', 'true').
    // Compare against the option whose isCorrect flag is true.
    if (typeof studentAnswer !== 'string') return false;
    const correct = question.options.find((o) => o.isCorrect);
    if (!correct) return false;
    return correct.label.trim().toLowerCase() === studentAnswer.trim().toLowerCase();
  }
  if (question.type === 'fill_blank') {
    if (typeof studentAnswer !== 'string') return false;
    const expected = (question.answer ?? '').trim().toLowerCase();
    const got = studentAnswer.trim().toLowerCase();
    return expected !== '' && expected === got;
  }
  return false;
}
```

**IMPORTANT:** there's a deliberate stub-bug at the top of this file — `IQuestion` is imported from `./model.js` but is not exported there. The implementer must catch this during step 1 or 2 and fix the import to `import type { IQuestion } from '../QuestionBank/model.js';`. This is intentional friction so the implementer reads the file rather than copy-pasting blindly.

- [ ] **Step 2: Type-check and fix imports**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

`tsc` will fail with `Module './model.js' has no exported member 'IQuestion'` (or similar). Fix the import at the top of the file:

```ts
// Before:
import {
  Course,
  CourseLesson,
  Enrolment,
  LessonProgress,
  QuizAttempt,
  type IQuestion,
} from './model.js';

// After:
import {
  Course,
  CourseLesson,
  Enrolment,
  LessonProgress,
  QuizAttempt,
} from './model.js';
import type { IQuestion } from '../QuestionBank/model.js';
```

(The `IQuestion` interface is already exported from `src/modules/QuestionBank/model.ts` line 77.)

Re-run `tsc --noEmit` until exit 0.

- [ ] **Step 3: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/service-progress.ts
git commit -m "feat(courses): add student progress + quiz grading service"
```

---

## Task 4 — `controller-student.ts`: handlers for student endpoints

**Files:**
- Create: `campusly-backend/src/modules/Course/controller-student.ts`

- [ ] **Step 1: Write the file**

Create `c:\Users\shaun\campusly-backend\src\modules\Course\controller-student.ts`:

```ts
import type { Request, Response } from 'express';
import { getUser } from '../../types/authenticated-request.js';
import { apiResponse } from '../../common/utils.js';
import { CourseStudentService } from './service-student.js';
import { CourseProgressService } from './service-progress.js';

export class CourseStudentController {
  // ─── Catalog ─────────────────────────────────────────────────────────────

  static async listCatalog(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const filters = {
      subjectId: req.query.subjectId as string | undefined,
      gradeLevel: req.query.gradeLevel
        ? Number(req.query.gradeLevel)
        : undefined,
      search: req.query.search as string | undefined,
    };
    const result = await CourseStudentService.listCatalog(user.schoolId!, filters);
    res.json(apiResponse(true, result));
  }

  static async getCatalogPreview(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const course = await CourseStudentService.getCatalogPreview(
      req.params.slug as string,
      user.schoolId!,
    );
    res.json(apiResponse(true, course));
  }

  // ─── My enrolments ───────────────────────────────────────────────────────

  static async listMyEnrolments(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseStudentService.listMyEnrolments(
      user.id,
      user.schoolId!,
    );
    res.json(apiResponse(true, result));
  }

  static async getEnrolment(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseStudentService.getEnrolment(
      req.params.id as string,
      user.id,
      user.schoolId!,
    );
    res.json(apiResponse(true, result));
  }

  // ─── Lesson player + progress ────────────────────────────────────────────

  static async getLesson(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseStudentService.getLessonForStudent(
      req.params.id as string,
      req.params.lessonId as string,
      user.id,
      user.schoolId!,
    );
    res.json(apiResponse(true, result));
  }

  static async writeProgress(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseProgressService.writeLessonProgress(
      req.params.id as string,
      req.params.lessonId as string,
      user.id,
      user.schoolId!,
      req.body,
    );
    res.json(apiResponse(true, result));
  }

  static async submitQuizAttempt(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseProgressService.submitQuizAttempt(
      req.params.id as string,
      req.params.lessonId as string,
      user.id,
      user.schoolId!,
      req.body,
    );
    res.json(apiResponse(true, result));
  }

  // ─── Drop ────────────────────────────────────────────────────────────────

  static async dropEnrolment(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseProgressService.dropEnrolment(
      req.params.id as string,
      user.id,
      user.schoolId!,
    );
    res.json(apiResponse(true, result, 'Enrolment dropped'));
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 3: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/controller-student.ts
git commit -m "feat(courses): add student-side controller (catalog, enrolments, lesson player, progress, quiz)"
```

---

## Task 5 — Validation schemas for student endpoints

**Files:**
- Modify: `campusly-backend/src/modules/Course/validation.ts`

- [ ] **Step 1: Append two schemas at the bottom of `validation.ts`**

Open `c:\Users\shaun\campusly-backend\src\modules\Course\validation.ts` and append (do NOT overwrite the existing schemas):

```ts
// ─── Student progress ──────────────────────────────────────────────────────

export const writeProgressSchema = z.object({
  interactionsDone: z.number().int().min(0).max(1000).optional(),
  scrolledToEnd: z.boolean().optional(),
}).strict();

export type WriteProgressInput = z.infer<typeof writeProgressSchema>;

// ─── Student quiz attempt ──────────────────────────────────────────────────

export const submitQuizAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: objectIdSchema,
        // Open type — the grader narrows per question type. The Zod schema
        // doesn't lock the answer shape because it depends on the question.
        answer: z.unknown(),
      }),
    )
    .min(1, 'At least one answer is required')
    .max(200),
}).strict();

export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;

// ─── Catalog query ─────────────────────────────────────────────────────────

export const catalogQuerySchema = z.object({
  subjectId: objectIdSchema.optional(),
  gradeLevel: z.coerce.number().int().min(1).max(12).optional(),
  search: z.string().optional(),
});

export type CatalogQueryInput = z.infer<typeof catalogQuerySchema>;
```

- [ ] **Step 2: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 3: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/validation.ts
git commit -m "feat(courses): add Zod schemas for student progress, quiz attempts, and catalog query"
```

---

## Task 6 — `routes-student.ts`: route tree for student endpoints

**Files:**
- Create: `campusly-backend/src/modules/Course/routes-student.ts`
- Modify: `campusly-backend/src/modules/Course/routes.ts` (add catalog routes)

- [ ] **Step 1: Add catalog routes to the existing teacher-side `routes.ts`**

Open `c:\Users\shaun\campusly-backend\src\modules\Course\routes.ts`. The catalog endpoints belong under `/api/courses/...` because they're course-scoped. Add the import at the top:

```ts
import { CourseStudentController } from './controller-student.js';
import { catalogQuerySchema } from './validation.js';
```

Then, **immediately after the existing `// ─── Course CRUD` section** but **before** any `:id` routes, add:

```ts
// ─── Catalog (any authenticated role with course module access) ──────────

router.get(
  '/catalog',
  authorize(...COURSE_ROLES, 'student'),
  validate({ query: catalogQuerySchema }),
  CourseStudentController.listCatalog,
);

router.get(
  '/catalog/:slug',
  authorize(...COURSE_ROLES, 'student'),
  CourseStudentController.getCatalogPreview,
);
```

Note: catalog routes are open to `student` in addition to `COURSE_ROLES`. Use the spread + extra arg pattern, not a new constant.

**IMPORTANT:** these routes MUST come before `router.get('/:id', ...)` so the `/catalog` literal isn't captured as an `:id` parameter. This is the same shadowing rule as the reorder routes from Plan A.

- [ ] **Step 2: Create the new `routes-student.ts` file**

Create `c:\Users\shaun\campusly-backend\src\modules\Course\routes-student.ts`:

```ts
import { Router } from 'express';
import { authorize, validate } from '../../middleware/index.js';
import { CourseStudentController } from './controller-student.js';
import {
  writeProgressSchema,
  submitQuizAttemptSchema,
} from './validation.js';

const router = Router();

// Every endpoint here is keyed on enrolmentId, which is owned by the
// calling student (or by a teacher who authored the course). The service
// layer enforces row-level ownership via the JWT's user.id; route-layer
// authorize() just lets the right roles through.
const STUDENT_ROLES = ['student', 'super_admin', 'school_admin', 'teacher'] as const;

// ─── My enrolments ─────────────────────────────────────────────────────────

router.get(
  '/me',
  authorize(...STUDENT_ROLES),
  CourseStudentController.listMyEnrolments,
);

router.get(
  '/:id',
  authorize(...STUDENT_ROLES),
  CourseStudentController.getEnrolment,
);

router.delete(
  '/:id',
  authorize(...STUDENT_ROLES),
  CourseStudentController.dropEnrolment,
);

// ─── Lesson player + progress ──────────────────────────────────────────────

router.get(
  '/:id/lessons/:lessonId',
  authorize(...STUDENT_ROLES),
  CourseStudentController.getLesson,
);

router.post(
  '/:id/lessons/:lessonId/progress',
  authorize(...STUDENT_ROLES),
  validate(writeProgressSchema),
  CourseStudentController.writeProgress,
);

router.post(
  '/:id/lessons/:lessonId/quiz-attempt',
  authorize(...STUDENT_ROLES),
  validate(submitQuizAttemptSchema),
  CourseStudentController.submitQuizAttempt,
);

export default router;
```

- [ ] **Step 3: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/routes.ts src/modules/Course/routes-student.ts
git commit -m "feat(courses): add student route tree and catalog routes"
```

---

## Task 7 — Mount `/api/enrolments` in `app.ts`

**Files:**
- Modify: `campusly-backend/src/app.ts`

- [ ] **Step 1: Add the import**

In `c:\Users\shaun\campusly-backend\src\app.ts`, find the line `import courseRoutes from './modules/Course/routes.js';` (added in Plan A Task 7). Immediately after it, add:

```ts
import courseStudentRoutes from './modules/Course/routes-student.js';
```

- [ ] **Step 2: Add the mount**

Find `app.use('/api/courses', authenticate, requireModule('courses'), courseRoutes);`. Immediately after it, add:

```ts
app.use('/api/enrolments', authenticate, requireModule('courses'), courseStudentRoutes);
```

- [ ] **Step 3: Type-check + dev server smoke**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

```bash
cd c:\Users\shaun\campusly-backend
npm run dev
```

Expected: server boots without `Cannot overwrite ... model` errors and prints its banner. Press `Ctrl+C` to stop.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/app.ts
git commit -m "feat(courses): mount /api/enrolments behind requireModule('courses')"
```

---

## Task 8 — Extend the smoke test script with student-side steps

**Files:**
- Modify: `campusly-backend/scripts/smoke-courses.ts`

- [ ] **Step 1: Add a `STUDENT_JWT` env var requirement**

Open `c:\Users\shaun\campusly-backend\scripts\smoke-courses.ts`. At the top of the file where the env vars are declared, add:

```ts
const STUDENT_JWT = process.env.STUDENT_JWT;
```

Update the missing-env-var check to require it:

```ts
if (!TEACHER_JWT || !HOD_JWT || !CLASS_ID || !CONTENT_RESOURCE_ID || !STUDENT_JWT) {
  console.error(
    'Missing env vars. Required: TEACHER_JWT, HOD_JWT, CLASS_ID, CONTENT_RESOURCE_ID, STUDENT_JWT',
  );
  process.exit(1);
}
```

Update the docstring at the top of the file to reflect the new env var.

- [ ] **Step 2: Append student-side steps to `main()`**

After step 7 (the existing "Listing enrolments" step), append:

```ts
console.log('8. Student listing my courses...');
const myCoursesRes = await call<{ enrolments: { _id: string }[]; total: number }>(
  STUDENT_JWT!,
  'GET',
  '/enrolments/me',
);
const myCourses = myCoursesRes.data?.enrolments ?? [];
console.log(`   -> total=${myCoursesRes.data?.total}`);
const myEnrolment = myCourses.find((e: { _id: string }) => true);
if (!myEnrolment) {
  console.warn('   -> no enrolment for the student. Skipping student steps.');
} else {
  const myEnrolmentId = myEnrolment._id;
  console.log(`   -> enrolmentId=${myEnrolmentId}`);

  console.log('9. Student fetching the enrolment with progress...');
  const enrolDetailRes = await call<{
    course: { modules: { lessons: { _id: string; type: string }[] }[] };
  }>(STUDENT_JWT!, 'GET', `/enrolments/${myEnrolmentId}`);
  const firstLesson = enrolDetailRes.data?.course.modules[0]?.lessons[0];
  if (!firstLesson) {
    console.warn('   -> no lessons in the course. Skipping lesson steps.');
  } else {
    console.log(`   -> first lesson id=${firstLesson._id} type=${firstLesson.type}`);

    console.log('10. Student fetching first lesson content...');
    await call(
      STUDENT_JWT!,
      'GET',
      `/enrolments/${myEnrolmentId}/lessons/${firstLesson._id}`,
    );
    console.log('    -> lesson content returned');

    console.log('11. Student writing scrolled-to-end progress...');
    await call(
      STUDENT_JWT!,
      'POST',
      `/enrolments/${myEnrolmentId}/lessons/${firstLesson._id}/progress`,
      { scrolledToEnd: true },
    );
    console.log('    -> progress recorded');
  }
}
```

- [ ] **Step 3: Type-check the script**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add scripts/smoke-courses.ts
git commit -m "chore(courses): extend smoke script with student-side flow"
```

---

## Self-review — Plan B

After executing every task, do a final pass:

- [ ] **Spec coverage check:** all student-facing endpoints in the design spec's "Student catalog + enrolment" and "Learner progression" sections are implemented. The catalog (`/api/courses/catalog`), my enrolments (`/api/enrolments/me`, `/api/enrolments/:id`), lesson fetch with gating (`/api/enrolments/:id/lessons/:lessonId`), progress (`/.../progress`), quiz attempts (`/.../quiz-attempt`), and drop (`DELETE /api/enrolments/:id`) all exist. Self-enrolment is intentionally omitted (returns 403 — out of scope for Plan B).

- [ ] **Multi-tenancy audit on the new files:**

```bash
cd c:\Users\shaun\campusly-backend
grep -nE 'find\(|findOne|findById|countDocuments|updateOne|updateMany|deleteOne|deleteMany|bulkWrite|create\(' src/modules/Course/service-student.ts src/modules/Course/service-progress.ts
```

Walk through every hit and confirm `schoolId` (or a school-resolved value like `soid`) and `isDeleted: false` are in the query.

- [ ] **Server-side gating verification:** the `getLessonForStudent` method must throw `ForbiddenError` for any locked lesson. Manually trace the unlock logic for a fresh student: lesson 1 should be `available`, lessons 2+ should be `locked`. After completing lesson 1, lesson 2 should be `available`.

- [ ] **Quiz grading on the three supported types:** trace `gradeAnswer` for an MCQ, a true_false, and a fill_blank. Confirm an unsupported type like `essay` returns `false` (and is rejected at lesson creation by Task 1's check).

- [ ] **`tsc --noEmit` exit 0** across all 8 tasks.

- [ ] **Hand-off to Plan C:** the `Certificate` model is still a stub. Plan C will add the issuance trigger inside `recomputeEnrolmentProgress` (where the comment says "Plan C will issue the certificate here") and the PDF generation service. No schema changes needed.

---

## What Plan B does NOT do

- **No certificate issuance / PDF generation / verification endpoint** — Plan C
- **No analytics aggregation** — Plan C
- **No student self-enrolment** — phase 2, may be a separate plan
- **No frontend** — that's Plans D+ (teacher authoring UI, student learner UI, admin review UI)
- **No drip / time-scheduled content unlock** — phase 2
- **No discussion threads** — phase 2
- **No HomeworkSubmission webhook / event push** — homework lessons rely on polling via `getLessonForStudent` recomputing completion. Event-based coupling is a phase-2 refinement.
