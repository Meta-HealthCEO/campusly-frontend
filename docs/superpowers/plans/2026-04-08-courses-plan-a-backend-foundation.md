# Courses Plan A — Backend Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the backend foundation for the new Courses feature: models, the `courses` module flag, and the full authoring + HOD review + class assignment API. After this plan an authenticated teacher can build a course via HTTP, an HOD can review and publish it, and a teacher can assign it to a class. Students cannot yet consume courses — that ships in Plan B.

**Architecture:** A new top-level backend module at `campusly-backend/src/modules/Course/` following the exact shape of `Textbook` (routes / controller / service / validation / model). The module owns seven Mongoose collections (`courses`, `courseModules`, `courseLessons`, `enrolments`, plus stubs for `lessonProgress`, `quizAttempts`, `certificates` which will be fully fleshed out in Plans B and C). Every query is scoped by `schoolId + isDeleted: false`. The module is gated by the new `courses` bolt-on module flag.

**Tech Stack:** Express 5, Mongoose 9, Zod 4, TypeScript strict. No test framework is installed — verification is `tsc --noEmit` + manual curl scripts + dev-server smoke tests, matching the rest of the codebase.

**Related spec:** [docs/superpowers/specs/2026-04-08-courses-design.md](../specs/2026-04-08-courses-design.md)

**Plan scope:**
- IN: Models (all 7, even if some are stubs for now), module flag registration, authoring CRUD, module + lesson sub-CRUD, reorder, submit-for-review, publish, reject, archive, assign-to-class, enrolment listing, route mount, manual smoke test scripts.
- OUT (future plans): Student catalog + learner experience (Plan B), lesson progress + quiz grading (Plan B), certificate PDF generation + verification (Plan C), analytics aggregation (Plan C), frontend (Plans B + C).

---

## File Structure

### New files in `campusly-backend/src/`

- `modules/Course/model.ts` — All 7 Mongoose schemas + TS interfaces. One file because the models are tightly coupled and follow existing repo convention (Textbook's `model.ts` holds both Textbook and Chapter subdocs).
- `modules/Course/validation.ts` — Zod schemas for every request body + query.
- `modules/Course/service.ts` — Authoring + catalog + enrolment business logic (everything in this plan).
- `modules/Course/controller.ts` — Thin Express handlers that forward to the service.
- `modules/Course/routes.ts` — Route definitions with `authorize(...)` + `validate(...)` guards.
- `scripts/smoke-courses.ts` — Ad-hoc manual smoke test script. Not run automatically; exists so the engineer can verify a full author → publish → assign flow against a local dev server.

### Modified files in `campusly-backend/src/`

- `common/moduleConfig.ts` — Add `'courses'` to `BOLT_ON_MODULES`.
- `app.ts` — Import + mount `coursesRoutes` at `/api/courses` behind `authenticate + requireModule('courses')`.

### Why split service this way

All authoring, catalog, and enrolment logic fits in one `service.ts` file for Plan A — the progress/quiz/certificate logic that would force a split lives in Plans B and C. Textbook's single `service.ts` is the precedent. If this file grows past ~500 lines during implementation, split into `service-authoring.ts` / `service-enrolment.ts`, but don't pre-optimise.

---

## Task 1 — Add `courses` to the bolt-on module list

**Files:**
- Modify: `campusly-backend/src/common/moduleConfig.ts`

- [ ] **Step 1: Add `'courses'` to `BOLT_ON_MODULES`**

Edit `campusly-backend/src/common/moduleConfig.ts`. Append `'courses'` to the array after `'asset_management'`:

```ts
export const BOLT_ON_MODULES = [
  'fee',
  'wallet',
  'tuckshop',
  'academic',
  'homework',
  'attendance',
  'achiever',
  'consent',
  'sport',
  'uniform',
  'event',
  'fundraising',
  'transport',
  'aftercare',
  'migration',
  'learning',
  'lost_found',
  'ai_tools',
  'teacher_workbench',
  'careers',
  'staff_leave',
  'conference_booking',
  'visitor_management',
  'admissions',
  'incident_wellbeing',
  'budget',
  'payroll',
  'asset_management',
  'courses',
] as const;
```

- [ ] **Step 2: Verify it compiles**

Run from `campusly-backend/`:

```bash
npx tsc --noEmit
```

Expected: `EXIT=0`, no errors. The `BoltOnModule` type now includes `'courses'`.

- [ ] **Step 3: Commit**

```bash
cd campusly-backend
git add src/common/moduleConfig.ts
git commit -m "feat(courses): register 'courses' as a bolt-on module"
```

---

## Task 2 — Create the model file with all 7 collections

**Files:**
- Create: `campusly-backend/src/modules/Course/model.ts`

- [ ] **Step 1: Create the module directory**

```bash
mkdir -p campusly-backend/src/modules/Course
```

- [ ] **Step 2: Write the full model file**

Create `campusly-backend/src/modules/Course/model.ts`:

```ts
import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const COURSE_STATUSES = ['draft', 'in_review', 'published', 'archived'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const LESSON_TYPES = ['content', 'chapter', 'homework', 'quiz'] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const ENROLMENT_STATUSES = ['active', 'completed', 'dropped'] as const;
export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];

export const LESSON_PROGRESS_STATUSES = [
  'locked',
  'available',
  'in_progress',
  'completed',
] as const;
export type LessonProgressStatus = (typeof LESSON_PROGRESS_STATUSES)[number];

// ─── Course ────────────────────────────────────────────────────────────────

export interface ICourse extends Document {
  schoolId: Types.ObjectId;
  isDeleted: boolean;

  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;

  subjectId: Types.ObjectId | null;
  gradeLevel: number | null;
  tags: string[];
  estimatedDurationHours: number | null;

  createdBy: Types.ObjectId;
  status: CourseStatus;
  publishedBy: Types.ObjectId | null;
  publishedAt: Date | null;
  reviewNotes: string;

  passMarkPercent: number;
  certificateEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },

    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    coverImageUrl: { type: String, default: '' },

    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
    gradeLevel: { type: Number, default: null, min: 1, max: 12 },
    tags: { type: [String], default: [] },
    estimatedDurationHours: { type: Number, default: null, min: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: COURSE_STATUSES, default: 'draft', index: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: '' },

    passMarkPercent: { type: Number, default: 60, min: 0, max: 100 },
    certificateEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Partial unique index: slugs only need to be unique among non-deleted courses
// in the same school. This lets a school re-use a slug after soft-deleting.
courseSchema.index(
  { schoolId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
courseSchema.index({ schoolId: 1, status: 1 });
courseSchema.index({ schoolId: 1, createdBy: 1 });

export const Course = mongoose.model<ICourse>('Course', courseSchema);

// ─── CourseModule ──────────────────────────────────────────────────────────

export interface ICourseModule extends Document {
  schoolId: Types.ObjectId;
  isDeleted: boolean;
  courseId: Types.ObjectId;
  title: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const courseModuleSchema = new Schema<ICourseModule>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true },
    orderIndex: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

courseModuleSchema.index({ courseId: 1, orderIndex: 1 });

export const CourseModule = mongoose.model<ICourseModule>(
  'CourseModule',
  courseModuleSchema,
);

// ─── CourseLesson ──────────────────────────────────────────────────────────

export interface ICourseLesson extends Document {
  schoolId: Types.ObjectId;
  isDeleted: boolean;
  courseId: Types.ObjectId;
  moduleId: Types.ObjectId;
  orderIndex: number;

  title: string;
  type: LessonType;

  contentResourceId: Types.ObjectId | null;
  textbookId: Types.ObjectId | null;
  chapterId: Types.ObjectId | null;
  homeworkId: Types.ObjectId | null;
  quizQuestionIds: Types.ObjectId[];

  isGraded: boolean;
  passMarkPercent: number | null;
  isRequiredToAdvance: boolean;
  maxAttempts: number | null;

  createdAt: Date;
  updatedAt: Date;
}

const courseLessonSchema = new Schema<ICourseLesson>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'CourseModule', required: true, index: true },
    orderIndex: { type: Number, required: true, default: 0 },

    title: { type: String, required: true, trim: true },
    type: { type: String, enum: LESSON_TYPES, required: true },

    contentResourceId: {
      type: Schema.Types.ObjectId,
      ref: 'ContentResource',
      default: null,
    },
    textbookId: { type: Schema.Types.ObjectId, ref: 'Textbook', default: null },
    chapterId: { type: Schema.Types.ObjectId, default: null },
    homeworkId: { type: Schema.Types.ObjectId, ref: 'Homework', default: null },
    quizQuestionIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Question',
      default: [],
    },

    isGraded: { type: Boolean, default: false },
    passMarkPercent: { type: Number, default: null, min: 0, max: 100 },
    isRequiredToAdvance: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: null, min: 1 },
  },
  { timestamps: true },
);

courseLessonSchema.index({ courseId: 1, moduleId: 1, orderIndex: 1 });

export const CourseLesson = mongoose.model<ICourseLesson>(
  'CourseLesson',
  courseLessonSchema,
);

// ─── Enrolment ─────────────────────────────────────────────────────────────

export interface IEnrolment extends Document {
  schoolId: Types.ObjectId;
  isDeleted: boolean;

  courseId: Types.ObjectId;
  studentId: Types.ObjectId;
  enrolledBy: Types.ObjectId;
  classId: Types.ObjectId | null;
  enrolledAt: Date;

  status: EnrolmentStatus;
  progressPercent: number;
  completedAt: Date | null;
  certificateId: Types.ObjectId | null;
}

const enrolmentSchema = new Schema<IEnrolment>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },

    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    enrolledBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', default: null },
    enrolledAt: { type: Date, default: () => new Date() },

    status: { type: String, enum: ENROLMENT_STATUSES, default: 'active', index: true },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    completedAt: { type: Date, default: null },
    certificateId: { type: Schema.Types.ObjectId, ref: 'Certificate', default: null },
  },
);

// Unique on active (non-deleted) (courseId, studentId) pairs.
enrolmentSchema.index(
  { courseId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
enrolmentSchema.index({ studentId: 1, status: 1 });
enrolmentSchema.index({ courseId: 1, classId: 1 });

export const Enrolment = mongoose.model<IEnrolment>('Enrolment', enrolmentSchema);

// ─── LessonProgress (stub, fleshed out in Plan B) ──────────────────────────

export interface ILessonProgress extends Document {
  schoolId: Types.ObjectId;
  isDeleted: boolean;
  enrolmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  courseId: Types.ObjectId;
  lessonId: Types.ObjectId;
  status: LessonProgressStatus;
  completedAt: Date | null;
  interactionsDone: number;
  interactionsTotal: number;
  scrolledToEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const lessonProgressSchema = new Schema<ILessonProgress>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    enrolmentId: { type: Schema.Types.ObjectId, ref: 'Enrolment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'CourseLesson', required: true },
    status: {
      type: String,
      enum: LESSON_PROGRESS_STATUSES,
      default: 'locked',
    },
    completedAt: { type: Date, default: null },
    interactionsDone: { type: Number, default: 0, min: 0 },
    interactionsTotal: { type: Number, default: 0, min: 0 },
    scrolledToEnd: { type: Boolean, default: false },
  },
  { timestamps: true },
);

lessonProgressSchema.index({ enrolmentId: 1, lessonId: 1 }, { unique: true });

export const LessonProgress = mongoose.model<ILessonProgress>(
  'LessonProgress',
  lessonProgressSchema,
);

// ─── QuizAttempt (stub, fleshed out in Plan B) ─────────────────────────────

export interface IQuizAttemptAnswer {
  questionId: Types.ObjectId;
  answer: unknown;
  isCorrect: boolean;
  marks: number;
}

export interface IQuizAttempt extends Document {
  schoolId: Types.ObjectId;
  isDeleted: boolean;
  enrolmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  courseId: Types.ObjectId;
  lessonId: Types.ObjectId;
  attemptNumber: number;
  answers: IQuizAttemptAnswer[];
  totalMarks: number;
  earnedMarks: number;
  percent: number;
  passed: boolean;
  submittedAt: Date;
}

const quizAttemptAnswerSchema = new Schema<IQuizAttemptAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    answer: { type: Schema.Types.Mixed },
    isCorrect: { type: Boolean, default: false },
    marks: { type: Number, default: 0 },
  },
  { _id: false },
);

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    enrolmentId: { type: Schema.Types.ObjectId, ref: 'Enrolment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'CourseLesson', required: true },
    attemptNumber: { type: Number, required: true, min: 1 },
    answers: { type: [quizAttemptAnswerSchema], default: [] },
    totalMarks: { type: Number, default: 0 },
    earnedMarks: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    submittedAt: { type: Date, default: () => new Date() },
  },
);

quizAttemptSchema.index({ enrolmentId: 1, lessonId: 1, attemptNumber: 1 });

export const QuizAttempt = mongoose.model<IQuizAttempt>(
  'QuizAttempt',
  quizAttemptSchema,
);

// ─── Certificate (stub, fleshed out in Plan C) ─────────────────────────────

export interface ICertificate extends Document {
  schoolId: Types.ObjectId;
  isDeleted: boolean;

  enrolmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  courseId: Types.ObjectId;

  studentName: string;
  courseName: string;
  schoolName: string;

  issuedAt: Date;
  issuedBy: Types.ObjectId;
  pdfUrl: string;
  verificationCode: string;
}

const certificateSchema = new Schema<ICertificate>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },

    enrolmentId: { type: Schema.Types.ObjectId, ref: 'Enrolment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },

    studentName: { type: String, required: true },
    courseName: { type: String, required: true },
    schoolName: { type: String, required: true },

    issuedAt: { type: Date, default: () => new Date() },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pdfUrl: { type: String, default: '' },
    verificationCode: { type: String, required: true },
  },
);

certificateSchema.index({ verificationCode: 1 }, { unique: true });
certificateSchema.index({ enrolmentId: 1 }, { unique: true });

export const Certificate = mongoose.model<ICertificate>(
  'Certificate',
  certificateSchema,
);
```

- [ ] **Step 3: Type-check**

```bash
cd campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`, no errors. If you see errors, they will reference missing imports — verify the exact import paths against `campusly-backend/src/modules/Textbook/model.ts`.

- [ ] **Step 4: Commit**

```bash
cd campusly-backend
git add src/modules/Course/model.ts
git commit -m "feat(courses): add Mongoose models for courses, modules, lessons, enrolments + Plan B/C stubs"
```

---

## Task 3 — Create the Zod validation schemas

**Files:**
- Create: `campusly-backend/src/modules/Course/validation.ts`

- [ ] **Step 1: Write the validation file**

Create `campusly-backend/src/modules/Course/validation.ts`:

```ts
import { z } from 'zod/v4';
import { objectIdSchema } from '../../common/validation.js';

// ─── Create Course ─────────────────────────────────────────────────────────

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .trim(),
  description: z.string().max(2000).default(''),
  coverImageUrl: z.string().default(''),
  subjectId: objectIdSchema.nullable().optional(),
  gradeLevel: z.number().int().min(1).max(12).nullable().optional(),
  tags: z.array(z.string().trim()).default([]),
  estimatedDurationHours: z.number().min(0).max(1000).nullable().optional(),
  passMarkPercent: z.number().int().min(0).max(100).default(60),
  certificateEnabled: z.boolean().default(true),
}).strict();

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

// ─── Update Course (metadata only) ─────────────────────────────────────────

export const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().optional(),
  subjectId: objectIdSchema.nullable().optional(),
  gradeLevel: z.number().int().min(1).max(12).nullable().optional(),
  tags: z.array(z.string().trim()).optional(),
  estimatedDurationHours: z.number().min(0).max(1000).nullable().optional(),
  passMarkPercent: z.number().int().min(0).max(100).optional(),
  certificateEnabled: z.boolean().optional(),
}).strict();

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

// ─── Query ─────────────────────────────────────────────────────────────────

export const courseQuerySchema = z.object({
  status: z.enum(['draft', 'in_review', 'published', 'archived']).optional(),
  subjectId: objectIdSchema.optional(),
  gradeLevel: z.coerce.number().int().min(1).max(12).optional(),
  mine: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type CourseQueryInput = z.infer<typeof courseQuerySchema>;

// ─── Module CRUD ───────────────────────────────────────────────────────────

export const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  orderIndex: z.number().int().min(0).default(0),
}).strict();

export type CreateModuleInput = z.infer<typeof createModuleSchema>;

export const updateModuleSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  orderIndex: z.number().int().min(0).optional(),
}).strict();

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

export const reorderModulesSchema = z.object({
  orders: z
    .array(
      z.object({
        id: objectIdSchema,
        orderIndex: z.number().int().min(0),
      }),
    )
    .min(1),
}).strict();

export type ReorderModulesInput = z.infer<typeof reorderModulesSchema>;

// ─── Lesson CRUD ───────────────────────────────────────────────────────────

// Base lesson fields shared by every lesson type.
const lessonBase = z.object({
  moduleId: objectIdSchema,
  orderIndex: z.number().int().min(0).default(0),
  title: z.string().min(1).max(200).trim(),
  isRequiredToAdvance: z.boolean().default(false),
  passMarkPercent: z.number().int().min(0).max(100).nullable().optional(),
  maxAttempts: z.number().int().min(1).nullable().optional(),
});

// Tagged-union: exactly one foreign key set per type. Zod `discriminatedUnion`
// enforces this at parse time, which replaces the "exactly one of" runtime
// check from the spec.
export const createLessonSchema = z.discriminatedUnion('type', [
  lessonBase.extend({
    type: z.literal('content'),
    contentResourceId: objectIdSchema,
    isGraded: z.literal(false).default(false),
  }),
  lessonBase.extend({
    type: z.literal('chapter'),
    textbookId: objectIdSchema,
    chapterId: objectIdSchema,
    isGraded: z.literal(false).default(false),
  }),
  lessonBase.extend({
    type: z.literal('homework'),
    homeworkId: objectIdSchema,
    isGraded: z.literal(false).default(false),
  }),
  lessonBase.extend({
    type: z.literal('quiz'),
    quizQuestionIds: z.array(objectIdSchema).min(1, 'At least one question is required'),
    isGraded: z.boolean().default(true),
  }),
]);

export type CreateLessonInput = z.infer<typeof createLessonSchema>;

// Update allows changing metadata only — to change lesson type, delete and
// re-add. This keeps the validation simple and mirrors the rule that
// structural edits on published courses are forbidden.
export const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  orderIndex: z.number().int().min(0).optional(),
  isRequiredToAdvance: z.boolean().optional(),
  passMarkPercent: z.number().int().min(0).max(100).nullable().optional(),
  maxAttempts: z.number().int().min(1).nullable().optional(),
}).strict();

export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;

export const reorderLessonsSchema = z.object({
  orders: z
    .array(
      z.object({
        id: objectIdSchema,
        moduleId: objectIdSchema,
        orderIndex: z.number().int().min(0),
      }),
    )
    .min(1),
}).strict();

export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;

// ─── Review workflow ───────────────────────────────────────────────────────

export const rejectCourseSchema = z.object({
  reviewNotes: z.string().min(1, 'Review notes are required').max(2000),
}).strict();

export type RejectCourseInput = z.infer<typeof rejectCourseSchema>;

// ─── Assignment ────────────────────────────────────────────────────────────

export const assignCourseSchema = z.object({
  classId: objectIdSchema,
}).strict();

export type AssignCourseInput = z.infer<typeof assignCourseSchema>;
```

- [ ] **Step 2: Type-check**

```bash
cd campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 3: Commit**

```bash
cd campusly-backend
git add src/modules/Course/validation.ts
git commit -m "feat(courses): add Zod validation schemas for course authoring endpoints"
```

---

## Task 4 — Create the service layer

**Files:**
- Create: `campusly-backend/src/modules/Course/service.ts`

- [ ] **Step 1: Write the service file**

Create `campusly-backend/src/modules/Course/service.ts`:

```ts
import mongoose from 'mongoose';
import {
  Course,
  CourseModule,
  CourseLesson,
  Enrolment,
  type ICourse,
  type ICourseModule,
  type ICourseLesson,
} from './model.js';
import { Student } from '../Student/model.js';
import { Class } from '../Academic/model.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../../common/errors.js';
import { escapeRegex } from '../../common/utils.js';
import type { UserRole } from '../../common/enums.js';
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CourseQueryInput,
  CreateModuleInput,
  UpdateModuleInput,
  ReorderModulesInput,
  CreateLessonInput,
  UpdateLessonInput,
  ReorderLessonsInput,
  RejectCourseInput,
  AssignCourseInput,
} from './validation.js';

// ─── Authorisation helpers ──────────────────────────────────────────────────

const PUBLISHER_ROLES: UserRole[] = ['super_admin', 'school_admin', 'principal', 'hod'];
const AUTHOR_ROLES: UserRole[] = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'];

function canPublish(role: UserRole): boolean {
  return PUBLISHER_ROLES.includes(role);
}

function canAuthor(role: UserRole): boolean {
  return AUTHOR_ROLES.includes(role);
}

// Teachers can only edit their own drafts. Admins/HODs can edit any draft in
// their school. super_admin can edit anything.
function assertCanEditCourse(course: ICourse, userId: string, role: UserRole): void {
  if (role === 'super_admin') return;
  if (canPublish(role)) return;
  if (course.createdBy.toString() !== userId) {
    throw new ForbiddenError('You can only edit your own courses');
  }
}

// ─── Lookup helpers ────────────────────────────────────────────────────────

async function getCourseOrThrow(id: string, schoolId: string): Promise<ICourse> {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new NotFoundError('Course not found');
  }
  const course = await Course.findOne({
    _id: new mongoose.Types.ObjectId(id),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
  if (!course) throw new NotFoundError('Course not found');
  return course;
}

async function getModuleOrThrow(
  courseId: string,
  moduleId: string,
  schoolId: string,
): Promise<ICourseModule> {
  if (!mongoose.Types.ObjectId.isValid(moduleId)) {
    throw new NotFoundError('Module not found');
  }
  const mod = await CourseModule.findOne({
    _id: new mongoose.Types.ObjectId(moduleId),
    courseId: new mongoose.Types.ObjectId(courseId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
  if (!mod) throw new NotFoundError('Module not found');
  return mod;
}

async function getLessonOrThrow(
  courseId: string,
  lessonId: string,
  schoolId: string,
): Promise<ICourseLesson> {
  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    throw new NotFoundError('Lesson not found');
  }
  const lesson = await CourseLesson.findOne({
    _id: new mongoose.Types.ObjectId(lessonId),
    courseId: new mongoose.Types.ObjectId(courseId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
  if (!lesson) throw new NotFoundError('Lesson not found');
  return lesson;
}

// ─── Service ───────────────────────────────────────────────────────────────

export class CourseService {
  // ─── Course CRUD ─────────────────────────────────────────────────────────

  static async createCourse(
    schoolId: string,
    userId: string,
    role: UserRole,
    data: CreateCourseInput,
  ) {
    if (!canAuthor(role)) {
      throw new ForbiddenError('You are not allowed to create courses');
    }

    // Slug uniqueness is enforced by a partial unique index but we pre-check
    // to return a clean ConflictError instead of a MongoError 11000.
    const existing = await Course.findOne({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      slug: data.slug,
      isDeleted: false,
    }).lean();
    if (existing) throw new ConflictError('A course with this slug already exists');

    const course = await Course.create({
      ...data,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      createdBy: new mongoose.Types.ObjectId(userId),
      status: 'draft',
      subjectId: data.subjectId ? new mongoose.Types.ObjectId(data.subjectId) : null,
    });
    return course.toObject();
  }

  static async listCourses(
    schoolId: string,
    userId: string,
    filters: CourseQueryInput,
  ) {
    const soid = new mongoose.Types.ObjectId(schoolId);
    const query: Record<string, unknown> = {
      schoolId: soid,
      isDeleted: false,
    };

    if (filters.status) query.status = filters.status;
    if (filters.subjectId) {
      query.subjectId = new mongoose.Types.ObjectId(filters.subjectId);
    }
    if (filters.gradeLevel !== undefined) query.gradeLevel = filters.gradeLevel;
    if (filters.mine) query.createdBy = new mongoose.Types.ObjectId(userId);
    if (filters.search) {
      query.title = { $regex: escapeRegex(filters.search), $options: 'i' };
    }

    const courses = await Course.find(query)
      .populate([
        { path: 'subjectId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'publishedBy', select: 'firstName lastName' },
      ])
      .sort({ createdAt: -1 })
      .lean();

    return { courses, total: courses.length };
  }

  static async getCourse(id: string, schoolId: string) {
    const course = await getCourseOrThrow(id, schoolId);
    const populated = await Course.findById(course._id)
      .populate([
        { path: 'subjectId', select: 'name' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'publishedBy', select: 'firstName lastName' },
      ])
      .lean();

    // Fetch modules + lessons in two queries, then stitch together.
    const modules = await CourseModule.find({
      courseId: course._id,
      schoolId: course.schoolId,
      isDeleted: false,
    })
      .sort({ orderIndex: 1 })
      .lean();

    const lessons = await CourseLesson.find({
      courseId: course._id,
      schoolId: course.schoolId,
      isDeleted: false,
    })
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

    return { ...populated, modules: modulesWithLessons };
  }

  static async updateCourse(
    id: string,
    schoolId: string,
    userId: string,
    role: UserRole,
    data: UpdateCourseInput,
  ) {
    const course = await getCourseOrThrow(id, schoolId);
    assertCanEditCourse(course, userId, role);

    // Metadata edits are always allowed (even on published courses).
    // Structural edits (modules / lessons) go through their own endpoints
    // which enforce the draft-only rule.
    Object.assign(course, data);
    if (data.subjectId !== undefined) {
      course.subjectId = data.subjectId
        ? new mongoose.Types.ObjectId(data.subjectId)
        : null;
    }
    await course.save();
    return course.toObject();
  }

  static async deleteCourse(id: string, schoolId: string, userId: string, role: UserRole) {
    const course = await getCourseOrThrow(id, schoolId);
    assertCanEditCourse(course, userId, role);

    if (course.status === 'published') {
      throw new BadRequestError('Cannot delete a published course. Archive it instead.');
    }

    course.isDeleted = true;
    await course.save();
    return { deleted: true };
  }

  // ─── Review workflow ─────────────────────────────────────────────────────

  static async submitForReview(id: string, schoolId: string, userId: string, role: UserRole) {
    const course = await getCourseOrThrow(id, schoolId);
    assertCanEditCourse(course, userId, role);

    if (course.status !== 'draft') {
      throw new BadRequestError(`Cannot submit a course in '${course.status}' state`);
    }

    const lessonCount = await CourseLesson.countDocuments({
      courseId: course._id,
      schoolId: course.schoolId,
      isDeleted: false,
    });
    if (lessonCount === 0) {
      throw new BadRequestError('Cannot submit an empty course for review');
    }

    course.status = 'in_review';
    course.reviewNotes = '';
    await course.save();
    return course.toObject();
  }

  static async publishCourse(id: string, schoolId: string, userId: string, role: UserRole) {
    if (!canPublish(role)) {
      throw new ForbiddenError('Only HODs and admins can publish courses');
    }

    const course = await getCourseOrThrow(id, schoolId);
    if (course.status !== 'in_review') {
      throw new BadRequestError(`Cannot publish a course in '${course.status}' state`);
    }

    course.status = 'published';
    course.publishedBy = new mongoose.Types.ObjectId(userId);
    course.publishedAt = new Date();
    course.reviewNotes = '';
    await course.save();
    return course.toObject();
  }

  static async rejectCourse(
    id: string,
    schoolId: string,
    userId: string,
    role: UserRole,
    data: RejectCourseInput,
  ) {
    if (!canPublish(role)) {
      throw new ForbiddenError('Only HODs and admins can reject courses');
    }

    const course = await getCourseOrThrow(id, schoolId);
    if (course.status !== 'in_review') {
      throw new BadRequestError(`Cannot reject a course in '${course.status}' state`);
    }

    course.status = 'draft';
    course.reviewNotes = data.reviewNotes;
    await course.save();
    return course.toObject();
  }

  static async archiveCourse(id: string, schoolId: string, userId: string, role: UserRole) {
    const course = await getCourseOrThrow(id, schoolId);
    assertCanEditCourse(course, userId, role);

    if (course.status !== 'published') {
      throw new BadRequestError(`Cannot archive a course in '${course.status}' state`);
    }

    course.status = 'archived';
    await course.save();
    return course.toObject();
  }

  // ─── Module CRUD ─────────────────────────────────────────────────────────

  static async addModule(
    courseId: string,
    schoolId: string,
    userId: string,
    role: UserRole,
    data: CreateModuleInput,
  ) {
    const course = await getCourseOrThrow(courseId, schoolId);
    assertCanEditCourse(course, userId, role);
    if (course.status !== 'draft') {
      throw new BadRequestError('Can only add modules to draft courses');
    }

    const mod = await CourseModule.create({
      schoolId: course.schoolId,
      courseId: course._id,
      title: data.title,
      orderIndex: data.orderIndex,
    });
    return mod.toObject();
  }

  static async updateModule(
    courseId: string,
    moduleId: string,
    schoolId: string,
    userId: string,
    role: UserRole,
    data: UpdateModuleInput,
  ) {
    const course = await getCourseOrThrow(courseId, schoolId);
    assertCanEditCourse(course, userId, role);
    if (course.status !== 'draft') {
      throw new BadRequestError('Can only edit modules in draft courses');
    }

    const mod = await getModuleOrThrow(courseId, moduleId, schoolId);
    if (data.title !== undefined) mod.title = data.title;
    if (data.orderIndex !== undefined) mod.orderIndex = data.orderIndex;
    await mod.save();
    return mod.toObject();
  }

  static async deleteModule(
    courseId: string,
    moduleId: string,
    schoolId: string,
    userId: string,
    role: UserRole,
  ) {
    const course = await getCourseOrThrow(courseId, schoolId);
    assertCanEditCourse(course, userId, role);
    if (course.status !== 'draft') {
      throw new BadRequestError('Can only delete modules in draft courses');
    }

    const mod = await getModuleOrThrow(courseId, moduleId, schoolId);

    // Cascade: soft-delete all lessons inside this module.
    await CourseLesson.updateMany(
      {
        moduleId: mod._id,
        schoolId: mod.schoolId,
        isDeleted: false,
      },
      { $set: { isDeleted: true } },
    );

    mod.isDeleted = true;
    await mod.save();
    return { deleted: true };
  }

  static async reorderModules(
    courseId: string,
    schoolId: string,
    userId: string,
    role: UserRole,
    data: ReorderModulesInput,
  ) {
    const course = await getCourseOrThrow(courseId, schoolId);
    assertCanEditCourse(course, userId, role);
    if (course.status !== 'draft') {
      throw new BadRequestError('Can only reorder modules in draft courses');
    }

    // Verify every supplied id actually belongs to this course (prevents
    // reordering modules that aren't ours).
    const ids = data.orders.map((o) => new mongoose.Types.ObjectId(o.id));
    const count = await CourseModule.countDocuments({
      _id: { $in: ids },
      courseId: course._id,
      schoolId: course.schoolId,
      isDeleted: false,
    });
    if (count !== ids.length) {
      throw new BadRequestError('One or more modules do not belong to this course');
    }

    await Promise.all(
      data.orders.map((o) =>
        CourseModule.updateOne(
          { _id: new mongoose.Types.ObjectId(o.id) },
          { $set: { orderIndex: o.orderIndex } },
        ),
      ),
    );

    return { reordered: true };
  }

  // ─── Lesson CRUD ─────────────────────────────────────────────────────────

  static async addLesson(
    courseId: string,
    schoolId: string,
    userId: string,
    role: UserRole,
    data: CreateLessonInput,
  ) {
    const course = await getCourseOrThrow(courseId, schoolId);
    assertCanEditCourse(course, userId, role);
    if (course.status !== 'draft') {
      throw new BadRequestError('Can only add lessons to draft courses');
    }

    // Verify the module belongs to this course.
    await getModuleOrThrow(courseId, data.moduleId, schoolId);

    // Build the lesson document — Zod discriminatedUnion has already
    // guaranteed that exactly the right foreign keys are present.
    const lessonDoc: Record<string, unknown> = {
      schoolId: course.schoolId,
      courseId: course._id,
      moduleId: new mongoose.Types.ObjectId(data.moduleId),
      orderIndex: data.orderIndex,
      title: data.title,
      type: data.type,
      isGraded: data.isGraded,
      passMarkPercent: data.passMarkPercent ?? null,
      isRequiredToAdvance: data.isRequiredToAdvance,
      maxAttempts: data.maxAttempts ?? null,
    };

    if (data.type === 'content') {
      lessonDoc.contentResourceId = new mongoose.Types.ObjectId(data.contentResourceId);
    } else if (data.type === 'chapter') {
      lessonDoc.textbookId = new mongoose.Types.ObjectId(data.textbookId);
      lessonDoc.chapterId = new mongoose.Types.ObjectId(data.chapterId);
    } else if (data.type === 'homework') {
      lessonDoc.homeworkId = new mongoose.Types.ObjectId(data.homeworkId);
    } else if (data.type === 'quiz') {
      lessonDoc.quizQuestionIds = data.quizQuestionIds.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
    }

    const lesson = await CourseLesson.create(lessonDoc);
    return lesson.toObject();
  }

  static async updateLesson(
    courseId: string,
    lessonId: string,
    schoolId: string,
    userId: string,
    role: UserRole,
    data: UpdateLessonInput,
  ) {
    const course = await getCourseOrThrow(courseId, schoolId);
    assertCanEditCourse(course, userId, role);
    if (course.status !== 'draft') {
      throw new BadRequestError('Can only edit lessons in draft courses');
    }

    const lesson = await getLessonOrThrow(courseId, lessonId, schoolId);

    if (data.title !== undefined) lesson.title = data.title;
    if (data.orderIndex !== undefined) lesson.orderIndex = data.orderIndex;
    if (data.isRequiredToAdvance !== undefined) {
      lesson.isRequiredToAdvance = data.isRequiredToAdvance;
    }
    if (data.passMarkPercent !== undefined) {
      lesson.passMarkPercent = data.passMarkPercent;
    }
    if (data.maxAttempts !== undefined) {
      lesson.maxAttempts = data.maxAttempts;
    }

    await lesson.save();
    return lesson.toObject();
  }

  static async deleteLesson(
    courseId: string,
    lessonId: string,
    schoolId: string,
    userId: string,
    role: UserRole,
  ) {
    const course = await getCourseOrThrow(courseId, schoolId);
    assertCanEditCourse(course, userId, role);
    if (course.status !== 'draft') {
      throw new BadRequestError('Can only delete lessons in draft courses');
    }

    const lesson = await getLessonOrThrow(courseId, lessonId, schoolId);
    lesson.isDeleted = true;
    await lesson.save();
    return { deleted: true };
  }

  static async reorderLessons(
    courseId: string,
    schoolId: string,
    userId: string,
    role: UserRole,
    data: ReorderLessonsInput,
  ) {
    const course = await getCourseOrThrow(courseId, schoolId);
    assertCanEditCourse(course, userId, role);
    if (course.status !== 'draft') {
      throw new BadRequestError('Can only reorder lessons in draft courses');
    }

    const ids = data.orders.map((o) => new mongoose.Types.ObjectId(o.id));
    const count = await CourseLesson.countDocuments({
      _id: { $in: ids },
      courseId: course._id,
      schoolId: course.schoolId,
      isDeleted: false,
    });
    if (count !== ids.length) {
      throw new BadRequestError('One or more lessons do not belong to this course');
    }

    await Promise.all(
      data.orders.map((o) =>
        CourseLesson.updateOne(
          { _id: new mongoose.Types.ObjectId(o.id) },
          {
            $set: {
              orderIndex: o.orderIndex,
              moduleId: new mongoose.Types.ObjectId(o.moduleId),
            },
          },
        ),
      ),
    );

    return { reordered: true };
  }

  // ─── Assignment to a class ───────────────────────────────────────────────

  static async assignCourseToClass(
    courseId: string,
    schoolId: string,
    userId: string,
    role: UserRole,
    data: AssignCourseInput,
  ) {
    if (!canAuthor(role)) {
      throw new ForbiddenError('Not allowed to assign courses');
    }

    const course = await getCourseOrThrow(courseId, schoolId);
    if (course.status !== 'published') {
      throw new BadRequestError('Can only assign published courses');
    }

    const soid = new mongoose.Types.ObjectId(schoolId);
    const classOid = new mongoose.Types.ObjectId(data.classId);

    // Verify the class belongs to this school.
    const klass = await Class.findOne({
      _id: classOid,
      schoolId: soid,
      isDeleted: false,
    }).lean();
    if (!klass) throw new NotFoundError('Class not found');

    // Fetch all students in the class.
    const students = await Student.find({
      classId: classOid,
      schoolId: soid,
      isDeleted: false,
    })
      .select('_id')
      .lean();

    if (students.length === 0) {
      throw new BadRequestError('No students found in this class');
    }

    // Bulk upsert enrolments. `ordered: false` means duplicates (students
    // already enroled) don't abort the batch; `upsert` handles the "unique"
    // index gracefully.
    const ops = students.map((s) => ({
      updateOne: {
        filter: {
          courseId: course._id,
          studentId: s._id,
          isDeleted: false,
        },
        update: {
          $setOnInsert: {
            schoolId: course.schoolId,
            courseId: course._id,
            studentId: s._id,
            enrolledBy: new mongoose.Types.ObjectId(userId),
            classId: classOid,
            enrolledAt: new Date(),
            status: 'active',
            progressPercent: 0,
            completedAt: null,
            certificateId: null,
          },
        },
        upsert: true,
      },
    }));

    const result = await Enrolment.bulkWrite(ops, { ordered: false });
    return {
      attempted: students.length,
      newEnrolments: result.upsertedCount ?? 0,
      alreadyEnroled: (result.matchedCount ?? 0),
    };
  }

  static async listEnrolments(courseId: string, schoolId: string, userId: string, role: UserRole) {
    if (!canAuthor(role)) {
      throw new ForbiddenError('Not allowed to view enrolments');
    }

    const course = await getCourseOrThrow(courseId, schoolId);
    // Teachers can only see enrolments for their own course. HOD/admin see all.
    if (!canPublish(role) && course.createdBy.toString() !== userId) {
      throw new ForbiddenError('You can only view enrolments for your own courses');
    }

    const enrolments = await Enrolment.find({
      courseId: course._id,
      schoolId: course.schoolId,
      isDeleted: false,
    })
      .populate([
        { path: 'studentId', select: 'firstName lastName admissionNumber userId' },
        { path: 'classId', select: 'name' },
      ])
      .sort({ enrolledAt: -1 })
      .lean();

    return { enrolments, total: enrolments.length };
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`. If you see errors about `Student` or `Class` imports, verify the correct paths:
- `Student` is exported from `src/modules/Student/model.ts`
- `Class` is exported from `src/modules/Academic/model.ts`

Check the exact export names with `grep -n 'export.*Student' src/modules/Student/model.ts` and adjust the import if it's `StudentModel` or similar.

- [ ] **Step 3: Commit**

```bash
cd campusly-backend
git add src/modules/Course/service.ts
git commit -m "feat(courses): add authoring + review + assignment service"
```

---

## Task 5 — Create the controller

**Files:**
- Create: `campusly-backend/src/modules/Course/controller.ts`

- [ ] **Step 1: Write the controller file**

Create `campusly-backend/src/modules/Course/controller.ts`:

```ts
import type { Request, Response } from 'express';
import { getUser } from '../../types/authenticated-request.js';
import { apiResponse } from '../../common/utils.js';
import { CourseService } from './service.js';
import type { CourseQueryInput } from './validation.js';

export class CourseController {
  // ─── Course CRUD ─────────────────────────────────────────────────────────

  static async createCourse(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const course = await CourseService.createCourse(
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.status(201).json(apiResponse(true, course, 'Course created'));
  }

  static async listCourses(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const filters = req.query as unknown as CourseQueryInput;
    const result = await CourseService.listCourses(user.schoolId!, user.id, filters);
    res.json(apiResponse(true, result));
  }

  static async getCourse(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const course = await CourseService.getCourse(
      req.params.id as string,
      user.schoolId!,
    );
    res.json(apiResponse(true, course));
  }

  static async updateCourse(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const course = await CourseService.updateCourse(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.json(apiResponse(true, course, 'Course updated'));
  }

  static async deleteCourse(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseService.deleteCourse(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
    );
    res.json(apiResponse(true, result, 'Course deleted'));
  }

  // ─── Review workflow ─────────────────────────────────────────────────────

  static async submitForReview(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const course = await CourseService.submitForReview(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
    );
    res.json(apiResponse(true, course, 'Course submitted for review'));
  }

  static async publishCourse(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const course = await CourseService.publishCourse(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
    );
    res.json(apiResponse(true, course, 'Course published'));
  }

  static async rejectCourse(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const course = await CourseService.rejectCourse(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.json(apiResponse(true, course, 'Course rejected'));
  }

  static async archiveCourse(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const course = await CourseService.archiveCourse(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
    );
    res.json(apiResponse(true, course, 'Course archived'));
  }

  // ─── Modules ─────────────────────────────────────────────────────────────

  static async addModule(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const mod = await CourseService.addModule(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.status(201).json(apiResponse(true, mod, 'Module added'));
  }

  static async updateModule(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const mod = await CourseService.updateModule(
      req.params.id as string,
      req.params.moduleId as string,
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.json(apiResponse(true, mod, 'Module updated'));
  }

  static async deleteModule(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseService.deleteModule(
      req.params.id as string,
      req.params.moduleId as string,
      user.schoolId!,
      user.id,
      user.role,
    );
    res.json(apiResponse(true, result, 'Module deleted'));
  }

  static async reorderModules(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseService.reorderModules(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.json(apiResponse(true, result, 'Modules reordered'));
  }

  // ─── Lessons ─────────────────────────────────────────────────────────────

  static async addLesson(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const lesson = await CourseService.addLesson(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.status(201).json(apiResponse(true, lesson, 'Lesson added'));
  }

  static async updateLesson(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const lesson = await CourseService.updateLesson(
      req.params.id as string,
      req.params.lessonId as string,
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.json(apiResponse(true, lesson, 'Lesson updated'));
  }

  static async deleteLesson(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseService.deleteLesson(
      req.params.id as string,
      req.params.lessonId as string,
      user.schoolId!,
      user.id,
      user.role,
    );
    res.json(apiResponse(true, result, 'Lesson deleted'));
  }

  static async reorderLessons(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseService.reorderLessons(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.json(apiResponse(true, result, 'Lessons reordered'));
  }

  // ─── Assignment ──────────────────────────────────────────────────────────

  static async assignCourseToClass(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseService.assignCourseToClass(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
      req.body,
    );
    res.status(201).json(apiResponse(true, result, 'Course assigned'));
  }

  static async listEnrolments(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await CourseService.listEnrolments(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
    );
    res.json(apiResponse(true, result));
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 3: Commit**

```bash
cd campusly-backend
git add src/modules/Course/controller.ts
git commit -m "feat(courses): add course authoring + review + assignment controller"
```

---

## Task 6 — Create the routes file

**Files:**
- Create: `campusly-backend/src/modules/Course/routes.ts`

- [ ] **Step 1: Write the routes file**

Create `campusly-backend/src/modules/Course/routes.ts`:

```ts
import { Router } from 'express';
import { authorize, validate } from '../../middleware/index.js';
import { CourseController } from './controller.js';
import {
  createCourseSchema,
  updateCourseSchema,
  courseQuerySchema,
  createModuleSchema,
  updateModuleSchema,
  reorderModulesSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderLessonsSchema,
  rejectCourseSchema,
  assignCourseSchema,
} from './validation.js';

const router = Router();

// Who can author / view course metadata.
const AUTHOR_ROLES = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'] as const;
// Who can publish / reject.
const REVIEW_ROLES = ['super_admin', 'school_admin', 'principal', 'hod'] as const;

// ─── Course CRUD ───────────────────────────────────────────────────────────

router.get(
  '/',
  authorize(...AUTHOR_ROLES),
  validate({ query: courseQuerySchema }),
  CourseController.listCourses,
);

router.post(
  '/',
  authorize(...AUTHOR_ROLES),
  validate(createCourseSchema),
  CourseController.createCourse,
);

router.get(
  '/:id',
  authorize(...AUTHOR_ROLES),
  CourseController.getCourse,
);

router.put(
  '/:id',
  authorize(...AUTHOR_ROLES),
  validate(updateCourseSchema),
  CourseController.updateCourse,
);

router.delete(
  '/:id',
  authorize(...AUTHOR_ROLES),
  CourseController.deleteCourse,
);

// ─── Review workflow ───────────────────────────────────────────────────────

router.post(
  '/:id/submit-for-review',
  authorize(...AUTHOR_ROLES),
  CourseController.submitForReview,
);

router.post(
  '/:id/publish',
  authorize(...REVIEW_ROLES),
  CourseController.publishCourse,
);

router.post(
  '/:id/reject',
  authorize(...REVIEW_ROLES),
  validate(rejectCourseSchema),
  CourseController.rejectCourse,
);

router.post(
  '/:id/archive',
  authorize(...AUTHOR_ROLES),
  CourseController.archiveCourse,
);

// ─── Modules (reorder BEFORE :moduleId to avoid shadowing) ────────────────

router.patch(
  '/:id/modules/reorder',
  authorize(...AUTHOR_ROLES),
  validate(reorderModulesSchema),
  CourseController.reorderModules,
);

router.post(
  '/:id/modules',
  authorize(...AUTHOR_ROLES),
  validate(createModuleSchema),
  CourseController.addModule,
);

router.put(
  '/:id/modules/:moduleId',
  authorize(...AUTHOR_ROLES),
  validate(updateModuleSchema),
  CourseController.updateModule,
);

router.delete(
  '/:id/modules/:moduleId',
  authorize(...AUTHOR_ROLES),
  CourseController.deleteModule,
);

// ─── Lessons (reorder BEFORE :lessonId to avoid shadowing) ────────────────

router.patch(
  '/:id/lessons/reorder',
  authorize(...AUTHOR_ROLES),
  validate(reorderLessonsSchema),
  CourseController.reorderLessons,
);

router.post(
  '/:id/lessons',
  authorize(...AUTHOR_ROLES),
  validate(createLessonSchema),
  CourseController.addLesson,
);

router.put(
  '/:id/lessons/:lessonId',
  authorize(...AUTHOR_ROLES),
  validate(updateLessonSchema),
  CourseController.updateLesson,
);

router.delete(
  '/:id/lessons/:lessonId',
  authorize(...AUTHOR_ROLES),
  CourseController.deleteLesson,
);

// ─── Assignment ────────────────────────────────────────────────────────────

router.post(
  '/:id/assign',
  authorize(...AUTHOR_ROLES),
  validate(assignCourseSchema),
  CourseController.assignCourseToClass,
);

router.get(
  '/:id/enrolments',
  authorize(...AUTHOR_ROLES),
  CourseController.listEnrolments,
);

export default router;
```

- [ ] **Step 2: Type-check**

```bash
cd campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 3: Commit**

```bash
cd campusly-backend
git add src/modules/Course/routes.ts
git commit -m "feat(courses): add course routes with author/review role guards"
```

---

## Task 7 — Mount the routes in `app.ts`

**Files:**
- Modify: `campusly-backend/src/app.ts`

- [ ] **Step 1: Add the import**

In `campusly-backend/src/app.ts`, find the block of `import ... Routes from './modules/.../routes.js'` lines (ends around line 81 with `textbookRoutes`). Add this line after `textbookRoutes`:

```ts
import courseRoutes from './modules/Course/routes.js';
```

- [ ] **Step 2: Mount the route**

Find the block of `app.use('/api/..., authenticate, requireModule(...), ...)` lines (ends around line 185 with `textbookRoutes`). Add this line after the `/api/textbooks` mount:

```ts
app.use('/api/courses', authenticate, requireModule('courses'), courseRoutes);
```

- [ ] **Step 3: Type-check**

```bash
cd campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 4: Start the dev server to confirm it boots**

```bash
cd campusly-backend
npm run dev
```

Expected: the server starts without errors and prints its usual startup banner. If you see a Mongoose index warning for the partial unique indexes, that's expected (they're new).

Press `Ctrl-C` to stop the server.

- [ ] **Step 5: Commit**

```bash
cd campusly-backend
git add src/app.ts
git commit -m "feat(courses): mount /api/courses behind requireModule('courses')"
```

---

## Task 8 — Smoke test script + manual verification

**Files:**
- Create: `campusly-backend/scripts/smoke-courses.ts`

- [ ] **Step 1: Find the smoke-test script convention**

Check if there's an existing smoke script you can mirror:

```bash
cd campusly-backend
ls scripts/ | grep -i smoke
```

If one exists, open it and match its style. If not, the one below is a fresh pattern — use it as-is.

- [ ] **Step 2: Write the smoke script**

Create `campusly-backend/scripts/smoke-courses.ts`:

```ts
/**
 * Manual smoke test for the Courses backend (Plan A).
 *
 * Run: `API_URL=http://localhost:4500/api TEACHER_JWT=... HOD_JWT=... CLASS_ID=... \
 *       tsx scripts/smoke-courses.ts`
 *
 * Requires:
 *   - Dev server running
 *   - A school with `modulesEnabled` containing 'courses'
 *   - A teacher account JWT (TEACHER_JWT)
 *   - An HOD or school_admin account JWT (HOD_JWT) in the same school
 *   - A class ID (CLASS_ID) with at least one student in that school
 *
 * What it does:
 *   1. Teacher creates a draft course
 *   2. Teacher adds a module
 *   3. Teacher adds a content lesson (requires a real ContentResource ID —
 *      hardcode one below)
 *   4. Teacher submits for review
 *   5. HOD publishes
 *   6. Teacher assigns to the class
 *   7. Prints the enrolment count
 *
 * This script is run manually; it is NOT in CI.
 */

const API = process.env.API_URL ?? 'http://localhost:4500/api';
const TEACHER_JWT = process.env.TEACHER_JWT;
const HOD_JWT = process.env.HOD_JWT;
const CLASS_ID = process.env.CLASS_ID;
const CONTENT_RESOURCE_ID = process.env.CONTENT_RESOURCE_ID;

if (!TEACHER_JWT || !HOD_JWT || !CLASS_ID || !CONTENT_RESOURCE_ID) {
  console.error(
    'Missing env vars. Required: TEACHER_JWT, HOD_JWT, CLASS_ID, CONTENT_RESOURCE_ID',
  );
  process.exit(1);
}

async function call(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`${method} ${path} -> ${res.status}`, json);
    throw new Error(`Request failed: ${res.status}`);
  }
  return json;
}

async function main(): Promise<void> {
  console.log('1. Creating draft course...');
  const createRes = (await call(TEACHER_JWT!, 'POST', '/courses', {
    title: 'Smoke Test Course',
    slug: `smoke-test-${Date.now()}`,
    description: 'Created by smoke-courses.ts',
  })) as { data: { _id: string } };
  const courseId = createRes.data._id;
  console.log(`   -> courseId=${courseId}`);

  console.log('2. Adding a module...');
  const modRes = (await call(TEACHER_JWT!, 'POST', `/courses/${courseId}/modules`, {
    title: 'Week 1',
    orderIndex: 0,
  })) as { data: { _id: string } };
  const moduleId = modRes.data._id;
  console.log(`   -> moduleId=${moduleId}`);

  console.log('3. Adding a content lesson...');
  await call(TEACHER_JWT!, 'POST', `/courses/${courseId}/lessons`, {
    moduleId,
    orderIndex: 0,
    title: 'Intro',
    type: 'content',
    contentResourceId: CONTENT_RESOURCE_ID,
    isRequiredToAdvance: false,
  });
  console.log('   -> lesson added');

  console.log('4. Submitting for review...');
  await call(TEACHER_JWT!, 'POST', `/courses/${courseId}/submit-for-review`);
  console.log('   -> status: in_review');

  console.log('5. Publishing (as HOD)...');
  await call(HOD_JWT!, 'POST', `/courses/${courseId}/publish`);
  console.log('   -> status: published');

  console.log('6. Assigning to class...');
  const assignRes = (await call(TEACHER_JWT!, 'POST', `/courses/${courseId}/assign`, {
    classId: CLASS_ID,
  })) as { data: { data: { attempted: number; newEnrolments: number } } };
  console.log(`   -> ${JSON.stringify(assignRes.data)}`);

  console.log('7. Listing enrolments...');
  const enrolRes = (await call(
    TEACHER_JWT!,
    'GET',
    `/courses/${courseId}/enrolments`,
  )) as { data: { data: { total: number } } };
  console.log(`   -> ${JSON.stringify(enrolRes.data)}`);

  console.log('\n✓ Smoke test passed');
}

main().catch((err) => {
  console.error('✗ Smoke test failed:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Enable the `courses` module on your dev school**

This is a one-time setup. In your dev Mongo shell (or via a super-admin endpoint if one exists):

```js
db.schools.updateOne(
  { _id: ObjectId("<your-dev-school-id>") },
  { $addToSet: { modulesEnabled: "courses" } }
);
```

Then clear the Redis cache for that school so the module guard picks it up immediately:

```bash
redis-cli DEL "school:modules:<your-dev-school-id>"
```

(If Redis isn't running locally, the middleware falls back to reading directly from Mongo, so skipping this step is fine — it'll just be re-cached on next request.)

- [ ] **Step 4: Run the smoke script against a running dev server**

Start the dev server in one terminal:

```bash
cd campusly-backend
npm run dev
```

In another terminal, set the env vars (replace placeholders with real IDs + JWTs from your dev DB) and run:

```bash
cd campusly-backend
TEACHER_JWT=eyJ... \
HOD_JWT=eyJ... \
CLASS_ID=507f1f77bcf86cd799439011 \
CONTENT_RESOURCE_ID=507f191e810c19729de860ea \
npx tsx scripts/smoke-courses.ts
```

Expected output:

```
1. Creating draft course...
   -> courseId=<id>
2. Adding a module...
   -> moduleId=<id>
3. Adding a content lesson...
   -> lesson added
4. Submitting for review...
   -> status: in_review
5. Publishing (as HOD)...
   -> status: published
6. Assigning to class...
   -> {"attempted":<N>,"newEnrolments":<N>,"alreadyEnroled":0}
7. Listing enrolments...
   -> {"enrolments":[...],"total":<N>}

✓ Smoke test passed
```

If any step fails, the script prints the failing response body. The most likely causes are:

- **403 "This module is not enabled"** — Step 3 wasn't done for your dev school. Re-run Step 3.
- **400 on lesson creation** — `CONTENT_RESOURCE_ID` doesn't belong to your dev school. Pick one from the Content Library UI.
- **404 on class** — `CLASS_ID` doesn't belong to your dev school.

- [ ] **Step 5: Verify the review-gate rejection flow manually**

With the dev server still running, exercise the reject path with curl:

```bash
# Create a fresh draft
curl -s -X POST "$API/courses" \
  -H "Authorization: Bearer $TEACHER_JWT" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Reject test","slug":"reject-test-'"$(date +%s)"'"}'
# Note the returned course _id as REJECT_ID

# Add a module + content lesson (same as smoke script steps 2-3)
# Submit for review:
curl -s -X POST "$API/courses/$REJECT_ID/submit-for-review" \
  -H "Authorization: Bearer $TEACHER_JWT"

# Reject as HOD with reviewNotes:
curl -s -X POST "$API/courses/$REJECT_ID/reject" \
  -H "Authorization: Bearer $HOD_JWT" \
  -H 'Content-Type: application/json' \
  -d '{"reviewNotes":"Please add more lessons before resubmitting"}'

# Verify status is back to 'draft' with the notes attached:
curl -s "$API/courses/$REJECT_ID" \
  -H "Authorization: Bearer $TEACHER_JWT" | jq '.data.status, .data.reviewNotes'
```

Expected: status is `"draft"` and reviewNotes is `"Please add more lessons before resubmitting"`.

- [ ] **Step 6: Verify multi-tenancy isolation**

Using a JWT from a **different** school, try to fetch the course created above:

```bash
curl -s -w "\nHTTP %{http_code}\n" "$API/courses/$REJECT_ID" \
  -H "Authorization: Bearer $OTHER_SCHOOL_JWT"
```

Expected: `HTTP 404` (not 403 and not 200). The schoolId scoping in the service must return `NotFoundError` for cross-school reads, not leak the existence of the course.

- [ ] **Step 7: Commit the smoke script**

```bash
cd campusly-backend
git add scripts/smoke-courses.ts
git commit -m "chore(courses): add manual smoke test script for Plan A"
```

---

## Self-review — Plan A

After executing every task, do a final pass:

- [ ] **Spec coverage check:** every backend requirement in §API surface (course authoring section), §Architecture, §Data model, and §Error handling is implemented. Student-facing endpoints (catalog, learner progression, certificates, analytics) are explicitly out of Plan A's scope — those land in Plans B and C.

- [ ] **Multi-tenancy audit:** grep for every `findOne` / `findById` / `find` / `updateOne` / `deleteOne` call in the new `Course/service.ts` and confirm each one includes `schoolId` + `isDeleted: false`. The repo's top documented pitfall is cross-school data leakage; this check is mandatory before calling Plan A done.

```bash
cd campusly-backend
grep -n -E 'find|update|delete' src/modules/Course/service.ts
```

Manually confirm every hit has `schoolId` (via a helper or inline) and (where the collection supports it) `isDeleted: false`.

- [ ] **Type-check + lint one final time:**

```bash
cd campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Handoff to Plan B:** once Plan A is merged, the next plan (Courses Plan B — student experience) picks up with the catalog, learner experience, lesson progress, and quiz grading endpoints. Those endpoints reference the `LessonProgress` and `QuizAttempt` stub models already defined in `model.ts`, so the schema migration is a no-op — Plan B only adds service methods + controllers + routes.

---

## What Plan A does NOT do

Stated here so the engineer doesn't get sucked into scope creep:

- **No student-facing catalog endpoints.** `/api/courses/catalog` and `/api/courses/catalog/:slug` are Plan B.
- **No lesson player / progress tracking.** The `LessonProgress` model exists as a stub with the right shape, but no endpoints read or write it in Plan A.
- **No quiz grading.** `QuizAttempt` is a stub model. Grading logic against Question Bank answer keys is Plan B.
- **No certificate generation.** `Certificate` is a stub model. PDF generation, the public verify endpoint, and the issuance trigger are Plan C.
- **No analytics aggregation.** The `/api/courses/:id/analytics` endpoint is Plan C.
- **No `DELETE /api/enrolments/:id` unassign endpoint.** This requires a top-level `/api/enrolments` mount point that Plan B sets up anyway (for `/api/enrolments/me` and `/api/enrolments/:id`). Grouping it with those siblings in Plan B is cleaner than introducing a one-route mount here.
- **No super_admin override for structural edits on published courses.** The spec's authorisation matrix allows super_admin to edit modules and lessons on published courses as an emergency lever. Plan A's implementation strictly rejects structural edits on non-draft courses for *all* roles, including super_admin. The `archive → clone → edit → resubmit` flow is the only path. If the override turns out to be needed in practice, it's a one-line relaxation of the `status !== 'draft'` guards in `service.ts`.
- **No frontend work.** The course builder page, the HOD review UI, the student learner UI, and the navigation entries are Plans B and C. Teachers using Plan A interact with the backend via Postman or the smoke script.
