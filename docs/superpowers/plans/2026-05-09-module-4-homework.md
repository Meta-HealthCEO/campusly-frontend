# Module 4 — Homework Production-Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Campusly's homework workflow production-ready: structured submissions per type, deterministic + AI auto-grading, gradebook auto-publish, parent visibility, dashboard reminders.

**Architecture:** Extend the existing `Homework` backend module with a discriminated `HomeworkSubmission` model and two new services (`service-homework-grading`, `service-homework-comprehension`). Frontend gets a new teacher wizard at `/teacher/homework/new`, type-specific submission forms for students, and a parent detail/dashboard surface. Auto-grading reuses Module 3's `AIService` and the `Mark` gradebook model.

**Tech Stack:** Backend — Express 5, Mongoose 9, Zod v4 (`zod/v4`), Anthropic SDK via `AIService`. Frontend — Next.js 16, React 19, Zustand, React Hook Form + Zod v4, Axios, Sonner.

**Spec:** `docs/superpowers/specs/2026-05-09-module-4-homework-design.md`

**Conventions (read before starting any task):**
- All work commits directly to `master` — no feature branches.
- Max 350 lines per file. Hard cap.
- Zero `any` types. `catch (err: unknown)` always.
- No `apiClient` imports in components/pages — hooks only.
- No `text-red-*` / `bg-red-*` — use `text-destructive` / `bg-destructive/10`.
- Mobile-first responsive: every grid/flex needs breakpoints.
- Zod imports from `'zod/v4'`. Use `z.iso.datetime()`, `z.url()`.
- Backend: every single-entity find filters by `schoolId`. Every aggregation `$match` casts `new mongoose.Types.ObjectId(id)`. Every soft-deleted model query filters `isDeleted: false`. No transactions — use compensation flow with `logger.error` on rollback failures.
- Module 3's `AIService` (`src/services/ai.service.ts`) provides `generateCompletion`, `generateJSON<T>`, with built-in retry + semaphore. Reuse it.

---

## Reference: existing surface (do not re-explore)

**Backend (`c:/Users/shaun/campusly-backend`):**
- `src/modules/Homework/model.ts` — `Homework` + `HomeworkSubmission` (will be replaced)
- `src/modules/Homework/service.ts` (317 lines) — existing CRUD + legacy submit/grade
- `src/modules/Homework/controller.ts` (106 lines)
- `src/modules/Homework/routes.ts` (133 lines)
- `src/modules/Homework/validation.ts` (72 lines, Zod v4 already)
- `src/modules/QuestionBank/model.ts` — `Question` model (10 question types: mcq, true_false, short_answer, structured, essay, match, fill_blank, calculation, diagram_label, case_study). Field is `answer: string`, `markingRubric: string`, `marks: number`, `options[]: { label, text, isCorrect }[]`.
- `src/modules/Learning/model.ts` — `Quiz` model. Embedded `questions[]` use field name `points` (NOT `marks`), 4 types (mcq, true_false, short_answer, matching), `correctAnswer: string`.
- `src/modules/Academic/model.ts:389` — `Mark` model. Fields: `assessmentId, studentId, schoolId, mark, total, percentage, comment, isAbsent, isDeleted`. Unique on `(assessmentId, studentId)`.
- `src/modules/Academic/service-gradebook-publish.ts` — extended in Module 3 with `findOrCreateAssessmentForPaper`. Mirror that pattern for homework.
- `src/services/ai.service.ts` — `AIService.generateJSON<T>(system, user)` and `generateCompletion(system, user, options)`.

**Frontend (`c:/Users/shaun/campusly-frontend`):**
- `src/types/homework.ts` (162 lines) — discriminated union types already exist
- `src/hooks/useStudentHomework.ts` — student-side hook (audit + extend)
- `src/components/homework/` — existing components (some will be deprecated, some extended)
- `src/app/(dashboard)/teacher/homework/page.tsx` (208 lines)
- `src/app/(dashboard)/teacher/homework/[id]/page.tsx` (185 lines)
- `src/app/(dashboard)/student/homework/[id]/page.tsx` (136 lines, free-text Textarea — must be rebuilt)
- `src/app/(dashboard)/parent/homework/page.tsx` (99 lines)
- `src/components/ai-tools/PublishToGradebookDialog.tsx` (Module 3, reuse for teacher manual publish)
- `src/components/ai-tools/QuestionBankPicker` (Module 2, reuse for exercise mode)
- Paper wizard at `src/app/(dashboard)/teacher/papers/new/` and `useTeacherPaperWizardStore` — pattern reference for Module 4 wizard.

---

## Task overview

| # | Task | Repo |
|---|---|---|
| 1 | Homework model: extend fields, remove unwired | backend |
| 2 | HomeworkSubmission model: discriminator + 3 variants | backend |
| 3 | Validation schemas: createHomework + submitHomework | backend |
| 4 | Grading service: deterministic graders + late penalty | backend |
| 5 | Grading service: AI grader + dispatcher | backend |
| 6 | Grading service: gradeSubmissionAsync + concurrency | backend |
| 7 | Comprehension Q service: AI question generator | backend |
| 8 | Gradebook bridge: findOrCreateAssessmentForHomework + publishHomeworkGrade | backend |
| 9 | service.ts: createHomework/updateHomework version bump + submitHomework rebuild | backend |
| 10 | Routes + controller: new endpoints (submit poll, regrade, comprehension, dashboards) | backend |
| 11 | Frontend types + hooks (homework wizard store + submission poll + dashboards) | frontend |
| 12 | Teacher wizard route + Step 1 (type + metadata) | frontend |
| 13 | Wizard Step 2 (3 type-specific config panels) | frontend |
| 14 | Wizard Steps 3 + 4 (review + assign) + page orchestrator | frontend |
| 15 | Teacher list page extension (filters + columns + extracted subcomponents) | frontend |
| 16 | Teacher detail page rebuild (HomeworkGradingPanel) | frontend |
| 17 | Student detail page orchestrator + QuizSubmissionForm | frontend |
| 18 | ExerciseSubmissionForm + per-question type renderers | frontend |
| 19 | ReadingSubmissionForm + ResourceHomeworkViewer audit | frontend |
| 20 | Student dashboard widget integration | frontend |
| 21 | Parent detail page + parent list extension + parent dashboard | frontend |
| 22 | SoC sweep + size sweep + acceptance smoke | both |

---

## Task 1: Homework model — extend fields, remove unwired

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Homework/model.ts`

- [ ] **Step 1: Read current model.ts** to confirm starting state.

- [ ] **Step 2: Update `IHomework` interface and schema**

Replace the interface (lines 8-30) and schema (lines 32-67). Keep the `homeworkSchema.index(...)` lines and the `export const Homework = ...` line untouched.

```ts
export interface IHomework extends Document {
  title: string;
  type: HomeworkType;
  quizId?: Types.ObjectId | null;
  contentResourceId?: Types.ObjectId | null;
  pageRange?: string | null;
  exerciseQuestionIds: Types.ObjectId[];
  comprehensionQuestionIds?: Types.ObjectId[];
  subjectId: Types.ObjectId;
  classId: Types.ObjectId;
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  dueDate: Date;
  totalMarks: number;
  status: HomeworkStatus;
  attachments: string[];
  latePolicy: 'block' | 'penalty' | 'accept';
  latePenaltyPercent?: number;
  gradebookAutoPublish: boolean;
  assessmentId?: Types.ObjectId | null;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const homeworkSchema = new Schema<IHomework>(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['quiz', 'reading', 'exercise'],
      required: true,
    },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', default: null },
    contentResourceId: { type: Schema.Types.ObjectId, ref: 'ContentResource', default: null },
    pageRange: { type: String, default: null, trim: true },
    exerciseQuestionIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Question',
      default: [],
    },
    comprehensionQuestionIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Question',
      default: undefined,
    },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
    totalMarks: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['assigned', 'closed'], default: 'assigned' },
    attachments: {
      type: [String],
      default: [],
      validate: [(v: string[]) => v.length <= 20, 'Maximum 20 attachments allowed'],
    },
    latePolicy: {
      type: String,
      enum: ['block', 'penalty', 'accept'],
      default: 'block',
      required: true,
    },
    latePenaltyPercent: { type: Number, min: 0, max: 100, default: undefined },
    gradebookAutoPublish: { type: Boolean, default: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', default: null },
    version: { type: Number, default: 1, min: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);
```

Removed fields: `peerReviewEnabled`, `groupAssignment`, `maxFileSize`, `allowedFileTypes`. They will be silently ignored by Mongoose strict mode on writes; existing documents retain them as ghost fields.

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -30
```

Expect: zero errors. If `service.ts` references removed fields, that's expected and Task 9 fixes it. If errors mention removed fields in `service.ts`, leave the errors for Task 9 to clean up — note them but don't fix yet.

- [ ] **Step 4: Verify line count**

```bash
wc -l c:/Users/shaun/campusly-backend/src/modules/Homework/model.ts
```

Expect: under 350.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/model.ts
git commit -m "feat(homework): extend model — latePolicy, version, gradebookAutoPublish, assessmentId, comprehensionQuestionIds; drop unwired peerReviewEnabled/groupAssignment/maxFileSize/allowedFileTypes"
```

---

## Task 2: HomeworkSubmission — discriminated union

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Homework/model.ts`

- [ ] **Step 1: Replace existing `IHomeworkSubmission` interface and schema (lines 78-151)**

Replace with a discriminator pattern. Mongoose discriminators share a base collection but allow per-type schemas.

```ts
// ─── HomeworkSubmission base + variants (discriminated by type) ──────────

export type HomeworkSubmissionType = 'quiz' | 'reading' | 'exercise';
export type GradingStatus = 'pending' | 'graded' | 'failed';
export type GradingMethod = 'deterministic' | 'ai' | 'teacher' | 'pending';

export interface IGradedAnswer {
  studentAnswer: string;
  questionSnapshot: string;
  awarded?: number;
  maxMarks: number;
  rationale?: string;
  gradingMethod: GradingMethod;
}

export interface IQuizAnswer extends IGradedAnswer {
  questionIndex: number;
}

export interface IExerciseAnswer extends IGradedAnswer {
  questionId: Types.ObjectId;
}

export interface IReadingAnswer extends IGradedAnswer {
  questionId: Types.ObjectId;
}

export interface ILateMarkAdjustment {
  rawMark: number;
  penaltyPercent: number;
  finalMark: number;
}

export interface IHomeworkSubmissionBase extends Document {
  homeworkId: Types.ObjectId;
  studentId: Types.ObjectId;
  schoolId: Types.ObjectId;
  type: HomeworkSubmissionType;
  homeworkVersion: number;
  submittedAt: Date;
  isLate: boolean;
  gradingStatus: GradingStatus;
  gradingGeneration: number;
  mark?: number;
  maxMarks: number;
  feedback?: string;
  gradedAt?: Date;
  gradedBy?: Types.ObjectId | null;
  errorMessage?: string;
  lateMarkAdjustment?: ILateMarkAdjustment;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuizSubmission extends IHomeworkSubmissionBase {
  type: 'quiz';
  answers: IQuizAnswer[];
}

export interface IExerciseSubmission extends IHomeworkSubmissionBase {
  type: 'exercise';
  answers: IExerciseAnswer[];
}

export interface IReadingSubmission extends IHomeworkSubmissionBase {
  type: 'reading';
  markedReadAt: Date;
  comprehensionAnswers: IReadingAnswer[];
}

export type IHomeworkSubmission =
  | IQuizSubmission
  | IExerciseSubmission
  | IReadingSubmission;

const lateMarkAdjustmentSchema = new Schema<ILateMarkAdjustment>(
  {
    rawMark: { type: Number, required: true },
    penaltyPercent: { type: Number, required: true },
    finalMark: { type: Number, required: true },
  },
  { _id: false },
);

const baseAnswerFields = {
  studentAnswer: { type: String, required: true, default: '' },
  questionSnapshot: { type: String, required: true, default: '' },
  awarded: { type: Number, default: undefined },
  maxMarks: { type: Number, required: true, min: 0 },
  rationale: { type: String, default: undefined },
  gradingMethod: {
    type: String,
    enum: ['deterministic', 'ai', 'teacher', 'pending'],
    required: true,
    default: 'pending',
  },
};

const quizAnswerSchema = new Schema<IQuizAnswer>(
  { ...baseAnswerFields, questionIndex: { type: Number, required: true, min: 0 } },
  { _id: false },
);

const exerciseAnswerSchema = new Schema<IExerciseAnswer>(
  { ...baseAnswerFields, questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true } },
  { _id: false },
);

const readingAnswerSchema = new Schema<IReadingAnswer>(
  { ...baseAnswerFields, questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true } },
  { _id: false },
);

const homeworkSubmissionBaseSchema = new Schema<IHomeworkSubmissionBase>(
  {
    homeworkId: { type: Schema.Types.ObjectId, ref: 'Homework', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    homeworkVersion: { type: Number, required: true, min: 1 },
    submittedAt: { type: Date, required: true },
    isLate: { type: Boolean, default: false },
    gradingStatus: {
      type: String,
      enum: ['pending', 'graded', 'failed'],
      required: true,
      default: 'pending',
    },
    gradingGeneration: { type: Number, required: true, default: 1, min: 1 },
    mark: { type: Number, default: undefined },
    maxMarks: { type: Number, required: true, min: 0 },
    feedback: { type: String, trim: true },
    gradedAt: { type: Date },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    errorMessage: { type: String, default: undefined },
    lateMarkAdjustment: { type: lateMarkAdjustmentSchema, default: undefined },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, discriminatorKey: 'type' },
);

homeworkSubmissionBaseSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });
homeworkSubmissionBaseSchema.index({ studentId: 1 });
homeworkSubmissionBaseSchema.index({ schoolId: 1, gradingStatus: 1 });
homeworkSubmissionBaseSchema.index({ homeworkId: 1, gradingStatus: 1 });

export const HomeworkSubmission = mongoose.model<IHomeworkSubmissionBase>(
  'HomeworkSubmission',
  homeworkSubmissionBaseSchema,
);

export const QuizSubmissionModel = HomeworkSubmission.discriminator<IQuizSubmission>(
  'quiz',
  new Schema({ answers: { type: [quizAnswerSchema], default: [] } }, { _id: false }),
);

export const ExerciseSubmissionModel = HomeworkSubmission.discriminator<IExerciseSubmission>(
  'exercise',
  new Schema({ answers: { type: [exerciseAnswerSchema], default: [] } }, { _id: false }),
);

export const ReadingSubmissionModel = HomeworkSubmission.discriminator<IReadingSubmission>(
  'reading',
  new Schema(
    {
      markedReadAt: { type: Date, required: true },
      comprehensionAnswers: { type: [readingAnswerSchema], default: [] },
    },
    { _id: false },
  ),
);
```

- [ ] **Step 2: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -40
```

Errors in `service.ts` and `controller.ts` are expected — they reference the old `files: string[]` shape. Task 9 + 10 will fix them. Note them, don't fix yet.

- [ ] **Step 3: Verify file size**

```bash
wc -l c:/Users/shaun/campusly-backend/src/modules/Homework/model.ts
```

Expect: under 350. If over, extract submission schemas into `model-submission.ts` and re-export from `model.ts`.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/model.ts
git commit -m "feat(homework): replace HomeworkSubmission with discriminated quiz/reading/exercise variants + gradingStatus + gradingGeneration"
```

---

## Task 3: Validation schemas — create + submit

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Homework/validation.ts`

- [ ] **Step 1: Replace contents**

```ts
import { z } from 'zod/v4';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// ─── Homework create payloads ───────────────────────────────────────────────

const baseHomeworkFields = {
  title: z.string().min(1).max(200),
  subjectId: objectIdSchema,
  classId: objectIdSchema,
  schoolId: objectIdSchema,
  dueDate: z.iso.datetime(),
  totalMarks: z.number().int().min(0).max(1000),
  attachments: z.array(z.url()).max(20).optional(),
  latePolicy: z.enum(['block', 'penalty', 'accept']).default('block'),
  latePenaltyPercent: z.number().int().min(0).max(100).optional(),
  gradebookAutoPublish: z.boolean().default(true),
};

export const createQuizHomeworkSchema = z.object({
  type: z.literal('quiz'),
  quizId: objectIdSchema,
  ...baseHomeworkFields,
});

export const createReadingHomeworkSchema = z.object({
  type: z.literal('reading'),
  contentResourceId: objectIdSchema,
  pageRange: z.string().max(50).optional(),
  comprehensionQuestionIds: z.array(objectIdSchema).min(1).max(10).optional(),
  ...baseHomeworkFields,
});

export const createExerciseHomeworkSchema = z.object({
  type: z.literal('exercise'),
  exerciseQuestionIds: z.array(objectIdSchema).min(1).max(100),
  ...baseHomeworkFields,
});

export const createHomeworkSchema = z.discriminatedUnion('type', [
  createQuizHomeworkSchema,
  createReadingHomeworkSchema,
  createExerciseHomeworkSchema,
]);

export const updateHomeworkSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  dueDate: z.iso.datetime().optional(),
  totalMarks: z.number().int().min(0).max(1000).optional(),
  status: z.enum(['assigned', 'closed']).optional(),
  pageRange: z.string().max(50).optional(),
  latePolicy: z.enum(['block', 'penalty', 'accept']).optional(),
  latePenaltyPercent: z.number().int().min(0).max(100).optional(),
  gradebookAutoPublish: z.boolean().optional(),
}).strict();

// ─── Submission payloads ────────────────────────────────────────────────────

const submitAnswerBase = {
  studentAnswer: z.string().max(50_000),
};

export const submitQuizHomeworkSchema = z.object({
  type: z.literal('quiz'),
  answers: z.array(z.object({
    questionIndex: z.number().int().min(0),
    ...submitAnswerBase,
  })).min(1).max(200),
}).strict();

export const submitExerciseHomeworkSchema = z.object({
  type: z.literal('exercise'),
  answers: z.array(z.object({
    questionId: objectIdSchema,
    ...submitAnswerBase,
  })).min(1).max(100),
}).strict();

export const submitReadingHomeworkSchema = z.object({
  type: z.literal('reading'),
  markedReadAt: z.iso.datetime(),
  comprehensionAnswers: z.array(z.object({
    questionId: objectIdSchema,
    ...submitAnswerBase,
  })).max(10),
}).strict();

export const submitHomeworkSchema = z.discriminatedUnion('type', [
  submitQuizHomeworkSchema,
  submitExerciseHomeworkSchema,
  submitReadingHomeworkSchema,
]);

// ─── Comprehension Q generation ─────────────────────────────────────────────

export const generateComprehensionSchema = z.object({
  contentResourceId: objectIdSchema,
  count: z.number().int().min(2).max(8).default(4),
}).strict();

// ─── Grading override (existing PATCH /submissions/:id/grade) ───────────────

export const gradeSubmissionSchema = z.object({
  mark: z.number().min(0, 'Mark cannot be negative'),
  feedback: z.string().trim().optional(),
}).strict();

// ─── Inferred types ─────────────────────────────────────────────────────────

export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;
export type UpdateHomeworkInput = z.infer<typeof updateHomeworkSchema>;
export type SubmitHomeworkInput = z.infer<typeof submitHomeworkSchema>;
export type GenerateComprehensionInput = z.infer<typeof generateComprehensionSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
```

- [ ] **Step 2: Verify**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -20
wc -l c:/Users/shaun/campusly-backend/src/modules/Homework/validation.ts
```

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/validation.ts
git commit -m "feat(homework): validation schemas for discriminated submit + comprehension generation + new homework fields"
```

---

## Task 4: Grading service — deterministic graders + late penalty

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-grading.ts`

- [ ] **Step 1: Create file with deterministic graders + late penalty helper**

```ts
import mongoose from 'mongoose';
import { logger } from '../../common/logger.js';
import { BadRequestError } from '../../common/errors.js';
import { IQuestion, QuestionType } from '../QuestionBank/model.js';
import { IHomework } from './model.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const DETERMINISTIC_TYPES: ReadonlySet<QuestionType> = new Set([
  'mcq',
  'true_false',
  'fill_blank',
]);

export interface GradingResult {
  awarded: number;
  rationale: string;
  gradingMethod: 'deterministic' | 'ai';
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[\s\p{P}]+/gu, ' ')
    .replace(/\s+/g, ' ');
}

// ─── Deterministic graders ──────────────────────────────────────────────────

export function gradeMcq(question: IQuestion, studentAnswer: string): GradingResult {
  const correct = question.options.find((o) => o.isCorrect);
  if (!correct) {
    return { awarded: 0, rationale: 'No correct option configured', gradingMethod: 'deterministic' };
  }
  const matched = normalize(studentAnswer) === normalize(correct.label) ||
    normalize(studentAnswer) === normalize(correct.text);
  return matched
    ? { awarded: question.marks, rationale: 'Correct option selected', gradingMethod: 'deterministic' }
    : { awarded: 0, rationale: `Selected "${studentAnswer}", expected "${correct.text}"`, gradingMethod: 'deterministic' };
}

export function gradeTrueFalse(question: IQuestion, studentAnswer: string): GradingResult {
  const expected = normalize(question.answer);
  const given = normalize(studentAnswer);
  const matched = expected === given ||
    (expected === 'true' && (given === 'yes' || given === 't')) ||
    (expected === 'false' && (given === 'no' || given === 'f'));
  return matched
    ? { awarded: question.marks, rationale: 'Correct', gradingMethod: 'deterministic' }
    : { awarded: 0, rationale: `Answered "${studentAnswer}", expected "${question.answer}"`, gradingMethod: 'deterministic' };
}

export function gradeFillBlank(question: IQuestion, studentAnswer: string): GradingResult {
  // answer field may contain multiple acceptable forms separated by | (pipe)
  const acceptable = question.answer.split('|').map((s) => normalize(s));
  const given = normalize(studentAnswer);
  const matched = acceptable.some((a) => a === given);
  return matched
    ? { awarded: question.marks, rationale: 'Correct', gradingMethod: 'deterministic' }
    : { awarded: 0, rationale: `Answered "${studentAnswer}", expected one of: ${question.answer}`, gradingMethod: 'deterministic' };
}

// ─── Late penalty ───────────────────────────────────────────────────────────

export interface LatePenaltyResult {
  finalMark: number;
  lateMarkAdjustment?: { rawMark: number; penaltyPercent: number; finalMark: number };
}

export function applyLatePenalty(
  rawMark: number,
  isLate: boolean,
  homework: IHomework,
): LatePenaltyResult {
  if (!isLate) return { finalMark: rawMark };
  switch (homework.latePolicy) {
    case 'accept':
      return { finalMark: rawMark };
    case 'block':
      throw new BadRequestError('Late submissions not accepted');
    case 'penalty': {
      const pct = homework.latePenaltyPercent ?? 0;
      const finalMark = Math.max(0, rawMark * (1 - pct / 100));
      return {
        finalMark,
        lateMarkAdjustment: { rawMark, penaltyPercent: pct, finalMark },
      };
    }
    default:
      return { finalMark: rawMark };
  }
}
```

- [ ] **Step 2: Verify**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
wc -l c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-grading.ts
```

Expect zero new errors, file under 150 lines.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/service-homework-grading.ts
git commit -m "feat(homework): deterministic graders (mcq/true_false/fill_blank) + late penalty helper"
```

---

## Task 5: Grading service — AI grader + dispatcher

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-grading.ts`
- Create: `c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-grading-ai.ts`

To keep `service-homework-grading.ts` under 350 lines, isolate AI specifics in a sibling file.

- [ ] **Step 1: Create `service-homework-grading-ai.ts`**

```ts
import { z } from 'zod/v4';
import { AIService } from '../../services/ai.service.js';
import { logger } from '../../common/logger.js';
import { IQuestion } from '../QuestionBank/model.js';
import { GradingResult } from './service-homework-grading.js';

const aiResponseSchema = z.object({
  awarded: z.number().min(0),
  rationale: z.string().max(2000),
});

const SYSTEM_PROMPT = `You are an experienced South African CAPS teacher grading a single student answer.
Return strict JSON: { "awarded": number, "rationale": string }.
- awarded: integer or half-mark (0.5 step), bounded by [0, maxMarks]
- rationale: 1-2 sentences explaining the mark
Be fair: partial credit for partially correct answers. Be strict: zero for blank/off-topic answers.`;

function buildUserPrompt(
  question: { stem: string; answer: string; markingRubric: string; marks: number },
  studentAnswer: string,
): string {
  return [
    `Question: ${question.stem}`,
    '',
    `Maximum marks: ${question.marks}`,
    '',
    `Memo / model answer: ${question.answer || '(none provided)'}`,
    '',
    `Marking rubric: ${question.markingRubric || '(none provided)'}`,
    '',
    `Student's answer: ${studentAnswer || '(blank)'}`,
    '',
    `Grade this answer. Return JSON only.`,
  ].join('\n');
}

export async function gradeWithAI(
  question: IQuestion,
  studentAnswer: string,
): Promise<GradingResult> {
  try {
    const userPrompt = buildUserPrompt(
      {
        stem: question.stem,
        answer: question.answer,
        markingRubric: question.markingRubric,
        marks: question.marks,
      },
      studentAnswer,
    );
    const raw = await AIService.generateJSON<unknown>(SYSTEM_PROMPT, userPrompt);
    const parsed = aiResponseSchema.parse(raw);
    const awarded = Math.min(Math.max(0, parsed.awarded), question.marks);
    return { awarded, rationale: parsed.rationale, gradingMethod: 'ai' };
  } catch (err: unknown) {
    logger.error({ err, questionId: question._id }, 'AI grading failed');
    throw err;
  }
}
```

- [ ] **Step 2: Add dispatcher `gradeAnswer` to `service-homework-grading.ts`** (append after deterministic graders, before late penalty section).

```ts
import { gradeWithAI } from './service-homework-grading-ai.js';

export async function gradeAnswer(
  question: IQuestion,
  studentAnswer: string,
): Promise<GradingResult> {
  if (DETERMINISTIC_TYPES.has(question.type)) {
    if (question.type === 'mcq') return gradeMcq(question, studentAnswer);
    if (question.type === 'true_false') return gradeTrueFalse(question, studentAnswer);
    return gradeFillBlank(question, studentAnswer);
  }
  return gradeWithAI(question, studentAnswer);
}
```

- [ ] **Step 3: Verify**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
wc -l c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-grading.ts c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-grading-ai.ts
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/service-homework-grading-ai.ts src/modules/Homework/service-homework-grading.ts
git commit -m "feat(homework): AI grader (Claude via AIService) + gradeAnswer dispatcher"
```

---

## Task 6: Grading service — gradeSubmissionAsync + per-school semaphore

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-grading-runner.ts`

To keep `service-homework-grading.ts` lean, place the orchestrator in a sibling.

- [ ] **Step 1: Create the runner file**

```ts
import mongoose from 'mongoose';
import { logger } from '../../common/logger.js';
import { Homework, HomeworkSubmission, IHomeworkSubmissionBase } from './model.js';
import { Question, IQuestion } from '../QuestionBank/model.js';
import { gradeAnswer, applyLatePenalty } from './service-homework-grading.js';
import { publishHomeworkGrade } from '../Academic/service-gradebook-publish.js';

// ─── Per-school semaphore (single-instance only) ────────────────────────────

const PER_SCHOOL_CAP = 30;
const PER_SUBMISSION_CAP = 3;
const inFlightBySchool = new Map<string, number>();
const waitQueueBySchool = new Map<string, Array<() => void>>();

function acquireSchoolSlot(schoolId: string): Promise<void> {
  const inFlight = inFlightBySchool.get(schoolId) ?? 0;
  if (inFlight < PER_SCHOOL_CAP) {
    inFlightBySchool.set(schoolId, inFlight + 1);
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const queue = waitQueueBySchool.get(schoolId) ?? [];
    queue.push(() => {
      inFlightBySchool.set(schoolId, (inFlightBySchool.get(schoolId) ?? 0) + 1);
      resolve();
    });
    waitQueueBySchool.set(schoolId, queue);
  });
}

function releaseSchoolSlot(schoolId: string): void {
  const inFlight = inFlightBySchool.get(schoolId) ?? 1;
  inFlightBySchool.set(schoolId, Math.max(0, inFlight - 1));
  const queue = waitQueueBySchool.get(schoolId);
  const next = queue?.shift();
  if (next) next();
}

// ─── Concurrency-capped chunked Promise.all ─────────────────────────────────

async function chunkedAll<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<Array<{ status: 'fulfilled'; value: R } | { status: 'rejected'; reason: unknown }>> {
  const results: Array<{ status: 'fulfilled'; value: R } | { status: 'rejected'; reason: unknown }> = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      slice.map((item, idx) => worker(item, i + idx)),
    );
    for (const r of settled) {
      results.push(r.status === 'fulfilled'
        ? { status: 'fulfilled', value: r.value }
        : { status: 'rejected', reason: r.reason });
    }
  }
  return results;
}

// ─── Public entry: gradeSubmissionAsync ─────────────────────────────────────

interface AnswerLike {
  studentAnswer: string;
  awarded?: number;
  maxMarks: number;
  rationale?: string;
  gradingMethod: string;
  questionId?: mongoose.Types.ObjectId;
  questionIndex?: number;
}

/**
 * Fire-and-forget. Iterates ungraded answers (gradingMethod='pending'), calls AI,
 * writes results back to the submission. Honors gradingGeneration to abort if
 * the student has resubmitted.
 */
export async function gradeSubmissionAsync(submissionId: string): Promise<void> {
  const submission = await HomeworkSubmission.findOne({ _id: submissionId, isDeleted: false });
  if (!submission) {
    logger.warn({ submissionId }, 'gradeSubmissionAsync: submission not found');
    return;
  }
  const homework = await Homework.findOne({ _id: submission.homeworkId, schoolId: submission.schoolId, isDeleted: false });
  if (!homework) {
    logger.warn({ submissionId, homeworkId: submission.homeworkId }, 'gradeSubmissionAsync: homework not found');
    return;
  }

  const capturedGeneration = submission.gradingGeneration;
  const schoolId = submission.schoolId.toString();
  await acquireSchoolSlot(schoolId);

  try {
    // Discover answer arrays based on type
    const sub = submission as unknown as { answers?: AnswerLike[]; comprehensionAnswers?: AnswerLike[] };
    const answersField: 'answers' | 'comprehensionAnswers' =
      submission.type === 'reading' ? 'comprehensionAnswers' : 'answers';
    const answers: AnswerLike[] = sub[answersField] ?? [];

    // Find pending answers (and which need AI vs deterministic was already done synchronously)
    const pendingIndices = answers
      .map((a, i) => (a.gradingMethod === 'pending' ? i : -1))
      .filter((i) => i >= 0);

    if (pendingIndices.length === 0) {
      // Nothing to do — finalize immediately
      await finalizeSubmission(submissionId, capturedGeneration);
      return;
    }

    // Resolve Question docs for all pending exercise/reading answers
    const questionIds = pendingIndices
      .map((i) => answers[i].questionId)
      .filter((id): id is mongoose.Types.ObjectId => !!id);
    const questions = questionIds.length
      ? await Question.find({ _id: { $in: questionIds }, isDeleted: false }).lean()
      : [];
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q as IQuestion]));

    // Quiz answers don't have questionIds — fetch the parent Quiz once
    let quizQuestions: Array<{ questionText: string; correctAnswer: string; points: number; questionType: string }> = [];
    if (submission.type === 'quiz' && homework.quizId) {
      const { Quiz } = await import('../Learning/model.js');
      const quiz = await Quiz.findOne({ _id: homework.quizId, schoolId: submission.schoolId, isDeleted: false }).lean();
      quizQuestions = quiz?.questions ?? [];
    }

    // Grade each pending answer (concurrency=3)
    const results = await chunkedAll(
      pendingIndices,
      async (idx) => {
        const ans = answers[idx];
        if (submission.type === 'quiz' && ans.questionIndex !== undefined) {
          const qq = quizQuestions[ans.questionIndex];
          if (!qq) return { idx, awarded: 0, rationale: 'Question not found', method: 'ai' as const };
          // Wrap quiz question into IQuestion-like shape for AI grader
          const fakeQ: IQuestion = {
            _id: new mongoose.Types.ObjectId(),
            stem: qq.questionText,
            answer: qq.correctAnswer,
            markingRubric: '',
            marks: qq.points,
            type: qq.questionType as IQuestion['type'],
            options: [],
          } as unknown as IQuestion;
          const r = await gradeAnswer(fakeQ, ans.studentAnswer);
          return { idx, awarded: r.awarded, rationale: r.rationale, method: r.gradingMethod };
        }
        if (ans.questionId) {
          const q = questionMap.get(ans.questionId.toString());
          if (!q) return { idx, awarded: 0, rationale: 'Question not found', method: 'ai' as const };
          const r = await gradeAnswer(q, ans.studentAnswer);
          return { idx, awarded: r.awarded, rationale: r.rationale, method: r.gradingMethod };
        }
        return { idx, awarded: 0, rationale: 'Unable to resolve question', method: 'ai' as const };
      },
      PER_SUBMISSION_CAP,
    );

    // Re-load submission to apply results — guard generation
    const fresh = await HomeworkSubmission.findOne({ _id: submissionId });
    if (!fresh) return;
    if (fresh.gradingGeneration !== capturedGeneration) {
      logger.info({ submissionId }, 'Submission was resubmitted mid-grading; aborting');
      return;
    }

    const freshAnswers = (fresh as unknown as { answers?: AnswerLike[]; comprehensionAnswers?: AnswerLike[] })[answersField] ?? [];
    for (const r of results) {
      if (r.status === 'rejected') {
        logger.error({ submissionId, reason: r.reason }, 'gradeAnswer rejected');
        continue;
      }
      const a = freshAnswers[r.value.idx];
      if (!a) continue;
      a.awarded = r.value.awarded;
      a.rationale = r.value.rationale;
      a.gradingMethod = r.value.method;
    }

    fresh.markModified(answersField);
    await fresh.save();
    await finalizeSubmission(submissionId, capturedGeneration);
  } catch (err: unknown) {
    logger.error({ err, submissionId }, 'gradeSubmissionAsync top-level error');
    await HomeworkSubmission.updateOne(
      { _id: submissionId, gradingGeneration: capturedGeneration },
      { $set: { gradingStatus: 'failed', errorMessage: err instanceof Error ? err.message : 'Unknown error' } },
    );
  } finally {
    releaseSchoolSlot(schoolId);
  }
}

async function finalizeSubmission(submissionId: string, capturedGeneration: number): Promise<void> {
  const sub = await HomeworkSubmission.findOne({ _id: submissionId, isDeleted: false });
  if (!sub) return;
  if (sub.gradingGeneration !== capturedGeneration) return;
  const homework = await Homework.findOne({ _id: sub.homeworkId, schoolId: sub.schoolId, isDeleted: false });
  if (!homework) return;

  const subAny = sub as unknown as { answers?: AnswerLike[]; comprehensionAnswers?: AnswerLike[] };
  const answers = (sub.type === 'reading' ? subAny.comprehensionAnswers : subAny.answers) ?? [];
  const rawMark = answers.reduce((acc, a) => acc + (a.awarded ?? 0), 0);

  let finalMark = rawMark;
  let lateAdj: ReturnType<typeof applyLatePenalty>['lateMarkAdjustment'];
  try {
    const result = applyLatePenalty(rawMark, sub.isLate, homework);
    finalMark = result.finalMark;
    lateAdj = result.lateMarkAdjustment;
  } catch (err: unknown) {
    // 'block' policy — should have been caught at submit time, but defensive
    logger.error({ err, submissionId }, 'Late penalty threw at finalize');
  }

  sub.mark = finalMark;
  sub.gradingStatus = 'graded';
  sub.gradedAt = new Date();
  if (lateAdj) sub.lateMarkAdjustment = lateAdj;
  await sub.save();

  if (homework.gradebookAutoPublish) {
    try {
      await publishHomeworkGrade(sub, homework);
    } catch (err: unknown) {
      logger.error({ err, submissionId }, 'publishHomeworkGrade failed (non-fatal)');
    }
  }
}
```

- [ ] **Step 2: Verify**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -20
wc -l c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-grading-runner.ts
```

If errors mention `publishHomeworkGrade` not found — that's expected, Task 8 creates it. Note and proceed; commit anyway since other tasks depend on this file existing.

If tsc errors block compile (e.g., `service.ts` errors blocking the whole project), don't worry — `tsc --noEmit` reports them all, but the app builds incrementally. Wait until Task 10 to confirm clean.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/service-homework-grading-runner.ts
git commit -m "feat(homework): gradeSubmissionAsync runner — per-school semaphore (cap=30) + per-submission concurrency=3 + generation guard"
```

---

## Task 7: Comprehension Q service — AI question generator

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-comprehension.ts`

- [ ] **Step 1: Create the file**

```ts
import mongoose from 'mongoose';
import { z } from 'zod/v4';
import { logger } from '../../common/logger.js';
import { AIService } from '../../services/ai.service.js';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { Question } from '../QuestionBank/model.js';
import { ContentResource } from '../ContentLibrary/model.js';

const SYSTEM_PROMPT = `You are a CAPS-aligned reading comprehension question writer.
Given a piece of text, generate {count} mixed-type comprehension questions that test understanding.
Return strict JSON: { "questions": [{ "type": "mcq" | "true_false" | "short_answer", "stem": string, "answer": string, "options"?: string[], "marks": number }] }
- mcq: include 4 distinct "options"; "answer" must equal one of the options
- true_false: "answer" must be exactly "true" or "false"; no options
- short_answer: 1-2 sentence expected answer; no options
- marks: 1-3 per question
- Cover at least 2 different question types in the set`;

const aiQuestionSchema = z.object({
  type: z.enum(['mcq', 'true_false', 'short_answer']),
  stem: z.string().min(5).max(500),
  answer: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).optional(),
  marks: z.number().int().min(1).max(5),
});

const aiResponseSchema = z.object({
  questions: z.array(aiQuestionSchema).min(2).max(10),
});

interface ContentResourceLike {
  title?: string;
  blocks?: Array<{ type?: string; content?: string }>;
}

function extractText(resource: ContentResourceLike): string {
  const parts: string[] = [];
  if (resource.title) parts.push(`Title: ${resource.title}`);
  for (const b of resource.blocks ?? []) {
    if (typeof b.content === 'string') parts.push(b.content);
  }
  return parts.join('\n\n').slice(0, 12_000); // bound prompt size
}

export async function generateComprehensionQuestions(
  contentResourceId: string,
  schoolId: string,
  teacherId: string,
  subjectId: string,
  gradeId: string,
  curriculumNodeId: string,
  count = 4,
): Promise<mongoose.Types.ObjectId[]> {
  const resource = await ContentResource.findOne({
    _id: contentResourceId,
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  }).lean();
  if (!resource) throw new NotFoundError('Content resource not found');

  const text = extractText(resource as ContentResourceLike);
  if (text.length < 50) {
    throw new BadRequestError('Resource text too short to generate questions');
  }

  const userPrompt = `Generate ${count} comprehension questions for this text:\n\n${text}`;
  const raw = await AIService.generateJSON<unknown>(SYSTEM_PROMPT, userPrompt);
  const parsed = aiResponseSchema.parse(raw);

  // Build Question docs
  const docs = parsed.questions.map((q) => ({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    subjectId: new mongoose.Types.ObjectId(subjectId),
    gradeId: new mongoose.Types.ObjectId(gradeId),
    curriculumNodeId: new mongoose.Types.ObjectId(curriculumNodeId),
    type: q.type,
    stem: q.stem,
    media: [],
    diagram: null,
    options: q.type === 'mcq' && q.options
      ? q.options.map((opt, i) => ({
          label: String.fromCharCode(65 + i), // A, B, C, D
          text: opt,
          isCorrect: opt === q.answer,
        }))
      : [],
    answer: q.answer,
    markingRubric: '',
    marks: q.marks,
    cognitiveLevel: { caps: 'routine', blooms: 'understand' },
    difficulty: 3,
    tags: ['comprehension', 'ai_generated'],
    source: 'ai_generated',
    status: 'approved',
    createdBy: new mongoose.Types.ObjectId(teacherId),
    usageCount: 0,
    isDeleted: false,
  }));

  let inserted: Awaited<ReturnType<typeof Question.insertMany>> = [];
  try {
    inserted = await Question.insertMany(docs);
    return inserted.map((q) => q._id as mongoose.Types.ObjectId);
  } catch (err: unknown) {
    // Compensation: if any inserted, delete them
    if (inserted.length) {
      try {
        await Question.deleteMany({ _id: { $in: inserted.map((q) => q._id) } });
      } catch (delErr: unknown) {
        logger.error({ delErr, inserted: inserted.length }, 'Comprehension Q rollback failed');
      }
    }
    logger.error({ err }, 'Comprehension Q insertMany failed');
    throw err;
  }
}
```

- [ ] **Step 2: Verify**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
wc -l c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-comprehension.ts
```

If `ContentResource` import path is wrong (check `src/modules/ContentLibrary/model.ts` for actual export), adjust. If `cognitiveLevel.caps` or `cognitiveLevel.blooms` enum values don't match (`'routine'`, `'understand'` per QuestionBank model line 12-22 — verify), fix.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/service-homework-comprehension.ts
git commit -m "feat(homework): AI-generated comprehension questions for reading homework"
```

---

## Task 8: Gradebook bridge — findOrCreateAssessmentForHomework + publishHomeworkGrade

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Academic/service-gradebook-publish.ts`

- [ ] **Step 1: Read the file** to understand the existing Module 3 pattern.

```bash
cat c:/Users/shaun/campusly-backend/src/modules/Academic/service-gradebook-publish.ts
```

The existing `findOrCreateAssessmentForPaper` does the same thing for `AssessmentPaper`. Mirror that exactly.

- [ ] **Step 2: Append new exports**

```ts
import { Homework, IHomework } from '../Homework/model.js';
import { Assessment, Mark } from './model.js';
// existing imports unchanged

export async function findOrCreateAssessmentForHomework(
  homework: IHomework,
): Promise<mongoose.Types.ObjectId> {
  if (homework.assessmentId) return homework.assessmentId;

  // Heuristic: term and year from dueDate
  const due = homework.dueDate;
  const month = due.getMonth() + 1; // 1-12
  const term = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  const year = due.getFullYear();

  const assessment = await Assessment.create({
    name: homework.title,
    schoolId: homework.schoolId,
    classId: homework.classId,
    subjectId: homework.subjectId,
    totalMarks: homework.totalMarks,
    term,
    year,
    type: 'homework',
    isDeleted: false,
  });

  try {
    await Homework.updateOne(
      { _id: homework._id, schoolId: homework.schoolId },
      { $set: { assessmentId: assessment._id } },
    );
  } catch (err: unknown) {
    // Compensation: roll back the new assessment
    try {
      await Assessment.deleteOne({ _id: assessment._id });
    } catch (delErr: unknown) {
      logger.error({ delErr, assessmentId: assessment._id }, 'Assessment rollback failed');
    }
    throw err;
  }

  return assessment._id as mongoose.Types.ObjectId;
}

export async function publishHomeworkGrade(
  submission: { _id: mongoose.Types.ObjectId; studentId: mongoose.Types.ObjectId; schoolId: mongoose.Types.ObjectId; mark?: number; maxMarks: number },
  homework: IHomework,
): Promise<void> {
  if (submission.mark === undefined) return;
  const assessmentId = await findOrCreateAssessmentForHomework(homework);
  const percentage = submission.maxMarks > 0
    ? Math.round((submission.mark / submission.maxMarks) * 100)
    : 0;

  await Mark.findOneAndUpdate(
    { assessmentId, studentId: submission.studentId, schoolId: submission.schoolId },
    {
      $set: {
        mark: submission.mark,
        total: submission.maxMarks,
        percentage,
        isAbsent: false,
        isDeleted: false,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
}
```

If `Assessment` model lacks a `type: 'homework'` enum — adjust to use whatever value is accepted (check `Academic/model.ts`). If the enum is restrictive, omit the field.

- [ ] **Step 3: Verify**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -20
wc -l c:/Users/shaun/campusly-backend/src/modules/Academic/service-gradebook-publish.ts
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Academic/service-gradebook-publish.ts
git commit -m "feat(gradebook): findOrCreateAssessmentForHomework + publishHomeworkGrade — Module 4 bridge"
```

---

## Task 9: service.ts — version bump + submitHomework rebuild

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Homework/service.ts`

- [ ] **Step 1: Read existing service.ts**

```bash
cat c:/Users/shaun/campusly-backend/src/modules/Homework/service.ts
```

Note: existing `submitHomework` takes `files: string[]`. Rebuild it for the new payload shape.

- [ ] **Step 2: Replace `create`, `update`, and `submitHomework`**

`create` — for `type='reading'` without comprehensionQuestionIds, call `generateComprehensionQuestions`. Compensation: if homework save fails after Q generation, delete the inserted Qs.

`update` — bump `version` on every save.

`submitHomework` — discriminated payload, runs deterministic graders inline.

```ts
// Add imports at top
import { generateComprehensionQuestions } from './service-homework-comprehension.js';
import { gradeAnswer, applyLatePenalty, DETERMINISTIC_TYPES } from './service-homework-grading.js';
import { gradeSubmissionAsync } from './service-homework-grading-runner.js';
import { Question, IQuestion } from '../QuestionBank/model.js';
import { Quiz } from '../Learning/model.js';
import { publishHomeworkGrade } from '../Academic/service-gradebook-publish.js';
import { logger } from '../../common/logger.js';
import type { CreateHomeworkInput, SubmitHomeworkInput } from './validation.js';
```

Replace the static `create` method:

```ts
static async create(
  data: CreateHomeworkInput,
  teacherId: string,
): Promise<IHomework> {
  let comprehensionIds: mongoose.Types.ObjectId[] | undefined;

  if (data.type === 'reading' && (!data.comprehensionQuestionIds || data.comprehensionQuestionIds.length === 0)) {
    // AI-generate comprehension Qs. Need subjectId, gradeId, curriculumNodeId.
    // gradeId + curriculumNodeId: derive from class. For v1, use the subject's default curriculum node.
    const { Class } = await import('../Academic/model.js');
    const cls = await Class.findOne({ _id: data.classId, schoolId: data.schoolId, isDeleted: false }).lean();
    if (!cls) throw new NotFoundError('Class not found');
    const gradeId = cls.gradeId.toString();

    const { CurriculumNode } = await import('../Curriculum/model.js');
    const node = await CurriculumNode.findOne({
      schoolId: data.schoolId,
      subjectId: data.subjectId,
      gradeId,
      isDeleted: false,
    }).sort({ createdAt: 1 }).lean();
    if (!node) throw new BadRequestError('No curriculum node available; create one first or attach comprehensionQuestionIds explicitly');

    comprehensionIds = await generateComprehensionQuestions(
      data.contentResourceId,
      data.schoolId,
      teacherId,
      data.subjectId,
      gradeId,
      node._id.toString(),
      4,
    );
  } else if (data.type === 'reading' && data.comprehensionQuestionIds) {
    comprehensionIds = data.comprehensionQuestionIds.map((id) => new mongoose.Types.ObjectId(id));
  }

  try {
    const homework = await Homework.create({
      ...data,
      teacherId,
      version: 1,
      ...(comprehensionIds ? { comprehensionQuestionIds: comprehensionIds } : {}),
    });
    return homework.toObject() as unknown as IHomework;
  } catch (err: unknown) {
    // Compensation: if comprehension Qs were generated, roll them back
    if (comprehensionIds?.length) {
      try {
        await Question.deleteMany({ _id: { $in: comprehensionIds } });
      } catch (delErr: unknown) {
        logger.error({ delErr }, 'Comprehension Q rollback failed during homework create');
      }
    }
    throw err;
  }
}
```

Replace `update` to bump version:

```ts
static async update(id: string, schoolId: string, data: Partial<IHomework>): Promise<IHomework> {
  const homework = await Homework.findOneAndUpdate(
    { _id: id, schoolId, isDeleted: false },
    { $set: data, $inc: { version: 1 } },
    { new: true, runValidators: true },
  )
    .populate('subjectId', 'name code')
    .populate('classId', 'name')
    .populate('teacherId', 'firstName lastName email')
    .populate('contentResourceId', 'title type status blocks')
    .populate('quizId', 'title totalMarks')
    .populate('exerciseQuestionIds', 'stem type marks')
    .populate('comprehensionQuestionIds', 'stem type marks');
  if (!homework) throw new NotFoundError('Homework not found');
  return homework;
}
```

Replace `submitHomework` (current signature is `(homeworkId, studentId, schoolId, files)` — change to `(homeworkId, studentId, schoolId, payload: SubmitHomeworkInput)`):

```ts
static async submitHomework(
  homeworkId: string,
  studentId: string,
  schoolId: string,
  payload: SubmitHomeworkInput,
): Promise<IHomeworkSubmissionBase> {
  const homework = await Homework.findOne({ _id: homeworkId, schoolId, isDeleted: false });
  if (!homework) throw new NotFoundError('Homework not found');
  if (homework.type !== payload.type) {
    throw new BadRequestError(`Payload type "${payload.type}" does not match homework type "${homework.type}"`);
  }

  const submittedAt = new Date();
  const isLate = submittedAt > homework.dueDate;
  if (isLate && homework.latePolicy === 'block') {
    throw new BadRequestError('Late submissions not accepted');
  }

  // Resolve questions for snapshotting + sync grading
  let questions: IQuestion[] = [];
  let quizQuestionsSnap: Array<{ questionText: string; correctAnswer: string; points: number; questionType: string }> = [];

  if (payload.type === 'exercise') {
    questions = await Question.find({
      _id: { $in: payload.answers.map((a) => a.questionId) },
      isDeleted: false,
    }).lean() as unknown as IQuestion[];
  } else if (payload.type === 'reading') {
    questions = await Question.find({
      _id: { $in: payload.comprehensionAnswers.map((a) => a.questionId) },
      isDeleted: false,
    }).lean() as unknown as IQuestion[];
  } else if (payload.type === 'quiz') {
    const quiz = await Quiz.findOne({ _id: homework.quizId, schoolId, isDeleted: false }).lean();
    quizQuestionsSnap = quiz?.questions ?? [];
  }
  const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

  // Build per-answer subdocs with deterministic grading inline
  let totalMaxMarks = 0;
  const buildAnswer = (qLike: { type: string; marks: number; stem: string }, studentAnswer: string, qIdOrIdx: { questionId?: string; questionIndex?: number }) => {
    totalMaxMarks += qLike.marks;
    const isDeterministic = DETERMINISTIC_TYPES.has(qLike.type as IQuestion['type']);
    return {
      ...(qIdOrIdx.questionId ? { questionId: new mongoose.Types.ObjectId(qIdOrIdx.questionId) } : {}),
      ...(qIdOrIdx.questionIndex !== undefined ? { questionIndex: qIdOrIdx.questionIndex } : {}),
      studentAnswer,
      questionSnapshot: qLike.stem,
      maxMarks: qLike.marks,
      gradingMethod: (isDeterministic ? 'deterministic' : 'pending') as 'deterministic' | 'pending',
    };
  };

  let answersOut: Array<Record<string, unknown>> = [];
  if (payload.type === 'exercise') {
    answersOut = await Promise.all(payload.answers.map(async (a) => {
      const q = questionMap.get(a.questionId);
      if (!q) {
        return { questionId: new mongoose.Types.ObjectId(a.questionId), studentAnswer: a.studentAnswer, questionSnapshot: '(missing question)', maxMarks: 0, gradingMethod: 'pending' };
      }
      const base = buildAnswer({ type: q.type, marks: q.marks, stem: q.stem }, a.studentAnswer, { questionId: a.questionId });
      if (DETERMINISTIC_TYPES.has(q.type)) {
        const r = await gradeAnswer(q, a.studentAnswer);
        return { ...base, awarded: r.awarded, rationale: r.rationale, gradingMethod: r.gradingMethod };
      }
      return base;
    }));
  } else if (payload.type === 'reading') {
    answersOut = await Promise.all(payload.comprehensionAnswers.map(async (a) => {
      const q = questionMap.get(a.questionId);
      if (!q) {
        return { questionId: new mongoose.Types.ObjectId(a.questionId), studentAnswer: a.studentAnswer, questionSnapshot: '(missing)', maxMarks: 0, gradingMethod: 'pending' };
      }
      const base = buildAnswer({ type: q.type, marks: q.marks, stem: q.stem }, a.studentAnswer, { questionId: a.questionId });
      if (DETERMINISTIC_TYPES.has(q.type)) {
        const r = await gradeAnswer(q, a.studentAnswer);
        return { ...base, awarded: r.awarded, rationale: r.rationale, gradingMethod: r.gradingMethod };
      }
      return base;
    }));
  } else if (payload.type === 'quiz') {
    answersOut = await Promise.all(payload.answers.map(async (a) => {
      const qq = quizQuestionsSnap[a.questionIndex];
      if (!qq) {
        return { questionIndex: a.questionIndex, studentAnswer: a.studentAnswer, questionSnapshot: '(missing)', maxMarks: 0, gradingMethod: 'pending' };
      }
      const fakeQ = {
        _id: new mongoose.Types.ObjectId(),
        type: qq.questionType,
        stem: qq.questionText,
        answer: qq.correctAnswer,
        markingRubric: '',
        marks: qq.points,
        options: [],
      } as unknown as IQuestion;
      const base = buildAnswer({ type: qq.questionType, marks: qq.points, stem: qq.questionText }, a.studentAnswer, { questionIndex: a.questionIndex });
      if (DETERMINISTIC_TYPES.has(qq.questionType as IQuestion['type'])) {
        const r = await gradeAnswer(fakeQ, a.studentAnswer);
        return { ...base, awarded: r.awarded, rationale: r.rationale, gradingMethod: r.gradingMethod };
      }
      return base;
    }));
  }

  const hasPending = answersOut.some((a) => a.gradingMethod === 'pending');
  const rawMark = answersOut.reduce((acc, a) => acc + (typeof a.awarded === 'number' ? a.awarded : 0), 0);

  // Upsert submission with discriminator-aware shape
  const baseDoc = {
    homeworkId: new mongoose.Types.ObjectId(homeworkId),
    studentId: new mongoose.Types.ObjectId(studentId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    type: payload.type,
    homeworkVersion: homework.version,
    submittedAt,
    isLate,
    gradingStatus: hasPending ? 'pending' : 'graded',
    maxMarks: totalMaxMarks,
    isDeleted: false,
  };

  const variantFields: Record<string, unknown> =
    payload.type === 'reading'
      ? { markedReadAt: new Date(payload.markedReadAt), comprehensionAnswers: answersOut }
      : { answers: answersOut };

  const updated = await HomeworkSubmission.findOneAndUpdate(
    { homeworkId, studentId, isDeleted: false },
    {
      $set: { ...baseDoc, ...variantFields },
      $inc: { gradingGeneration: 1 },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  // If everything graded synchronously, finalize now
  if (!hasPending) {
    const result = applyLatePenalty(rawMark, isLate, homework);
    updated.mark = result.finalMark;
    if (result.lateMarkAdjustment) updated.lateMarkAdjustment = result.lateMarkAdjustment;
    updated.gradedAt = new Date();
    await updated.save();
    if (homework.gradebookAutoPublish) {
      try {
        await publishHomeworkGrade(updated as unknown as { _id: mongoose.Types.ObjectId; studentId: mongoose.Types.ObjectId; schoolId: mongoose.Types.ObjectId; mark?: number; maxMarks: number }, homework);
      } catch (err: unknown) {
        logger.error({ err, submissionId: updated._id }, 'Sync publishHomeworkGrade failed');
      }
    }
  } else {
    // Fire-and-forget AI grading
    void gradeSubmissionAsync(updated._id.toString());
  }

  return updated;
}
```

Add a `regrade` static method:

```ts
static async regrade(submissionId: string, schoolId: string): Promise<IHomeworkSubmissionBase> {
  const sub = await HomeworkSubmission.findOne({ _id: submissionId, schoolId, isDeleted: false });
  if (!sub) throw new NotFoundError('Submission not found');
  await HomeworkSubmission.updateOne(
    { _id: submissionId, schoolId },
    {
      $set: { gradingStatus: 'pending', errorMessage: null },
      $inc: { gradingGeneration: 1 },
    },
  );
  // Reset all answers to 'pending' so the runner re-grades everything
  const subAny = sub as unknown as { answers?: Array<{ gradingMethod: string }>; comprehensionAnswers?: Array<{ gradingMethod: string }> };
  const arr = sub.type === 'reading' ? subAny.comprehensionAnswers : subAny.answers;
  if (arr) {
    for (const a of arr) a.gradingMethod = 'pending';
    sub.markModified(sub.type === 'reading' ? 'comprehensionAnswers' : 'answers');
    await sub.save();
  }
  void gradeSubmissionAsync(submissionId);
  const fresh = await HomeworkSubmission.findOne({ _id: submissionId, isDeleted: false });
  if (!fresh) throw new NotFoundError('Submission disappeared');
  return fresh;
}
```

Add a `getSubmissionById` static method (for status polling):

```ts
static async getSubmissionById(submissionId: string, schoolId: string): Promise<IHomeworkSubmissionBase> {
  const sub = await HomeworkSubmission.findOne({
    _id: submissionId,
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  })
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'firstName lastName email' },
    })
    .lean();
  if (!sub) throw new NotFoundError('Submission not found');
  return sub as unknown as IHomeworkSubmissionBase;
}
```

Add `getStudentDashboardCounts`:

```ts
static async getStudentDashboardCounts(
  studentId: string,
  schoolId: string,
): Promise<{ dueThisWeek: number; overdue: number; awaitingGrading: number }> {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { Student } = await import('../Student/model.js');
  const student = await Student.findOne({ _id: studentId, schoolId, isDeleted: false }).lean();
  if (!student) throw new NotFoundError('Student not found');

  const homeworks = await Homework.find({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    classId: student.classId,
    isDeleted: false,
    status: 'assigned',
  }).select('_id dueDate').lean();
  const homeworkIds = homeworks.map((h) => h._id);

  const submissions = await HomeworkSubmission.find({
    studentId: new mongoose.Types.ObjectId(studentId),
    homeworkId: { $in: homeworkIds },
    isDeleted: false,
  }).select('homeworkId gradingStatus').lean();
  const submittedIds = new Set(submissions.map((s) => s.homeworkId.toString()));

  let dueThisWeek = 0;
  let overdue = 0;
  for (const hw of homeworks) {
    if (submittedIds.has(hw._id.toString())) continue;
    const due = new Date(hw.dueDate);
    if (due < now) overdue++;
    else if (due <= weekFromNow) dueThisWeek++;
  }
  const awaitingGrading = submissions.filter((s) => s.gradingStatus === 'pending').length;

  return { dueThisWeek, overdue, awaitingGrading };
}
```

Add `getParentDashboardCounts`:

```ts
static async getParentDashboardCounts(
  parentId: string,
  schoolId: string,
): Promise<Array<{ studentId: string; firstName: string; lastName: string; pending: number; overdue: number; awaitingGrading: number }>> {
  const { Parent } = await import('../Student/model.js');
  const parent = await Parent.findOne({ _id: parentId, schoolId, isDeleted: false })
    .populate({ path: 'studentIds', populate: { path: 'userId', select: 'firstName lastName' } })
    .lean();
  if (!parent) throw new NotFoundError('Parent not found');

  const result = [];
  for (const student of parent.studentIds as unknown as Array<{ _id: mongoose.Types.ObjectId; user?: { firstName: string; lastName: string } }>) {
    const counts = await this.getStudentDashboardCounts(student._id.toString(), schoolId);
    result.push({
      studentId: student._id.toString(),
      firstName: student.user?.firstName ?? '',
      lastName: student.user?.lastName ?? '',
      pending: counts.dueThisWeek,
      overdue: counts.overdue,
      awaitingGrading: counts.awaitingGrading,
    });
  }
  return result;
}
```

If the existing `gradeSubmission` static method is now obsolete (replaced by `regrade` + the inline grading flow), keep it for now — Module 4 task 16 (teacher panel) will replace its frontend caller. Mark with a comment: `// Legacy — used by PATCH /submissions/:submissionId/grade for manual teacher mark overrides.`

If existing code in `submitHomework` references `files: string[]`, the new signature replaces it entirely.

- [ ] **Step 3: Verify**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -30
wc -l c:/Users/shaun/campusly-backend/src/modules/Homework/service.ts
```

If service.ts is over 350 lines, extract `getStudentDashboardCounts` + `getParentDashboardCounts` into `service-homework-dashboards.ts` and re-export. Likely necessary.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/
git commit -m "feat(homework): rebuild service.ts — version bump, structured submitHomework with sync deterministic grading + async AI kick-off, dashboards, regrade"
```

---

## Task 10: Routes + controller — new endpoints

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Homework/routes.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Homework/controller.ts`

- [ ] **Step 1: Add controller methods**

Append to `controller.ts`:

```ts
// Add imports at top:
import { generateComprehensionQuestions } from './service-homework-comprehension.js';
import { generateComprehensionSchema } from './validation.js';

// Within HomeworkController class:

static async getSubmissionById(req: Request, res: Response): Promise<void> {
  const schoolId = req.user!.schoolId;
  const submission = await HomeworkService.getSubmissionById(req.params.id, schoolId);
  res.json({ data: submission });
}

static async regradeSubmission(req: Request, res: Response): Promise<void> {
  const schoolId = req.user!.schoolId;
  const result = await HomeworkService.regrade(req.params.id, schoolId);
  res.json({ data: result });
}

static async generateComprehension(req: Request, res: Response): Promise<void> {
  const schoolId = req.user!.schoolId;
  const teacherId = req.user!.id;
  const { contentResourceId, count } = req.body as { contentResourceId: string; count: number };
  // Subject + grade + curriculum node must be inferred from somewhere — the wizard
  // will need to pass them. For Module 4 v1, accept them from query for simplicity:
  const { subjectId, gradeId, curriculumNodeId } = req.query as Record<string, string>;
  if (!subjectId || !gradeId || !curriculumNodeId) {
    res.status(400).json({ error: 'subjectId, gradeId, curriculumNodeId required as query params' });
    return;
  }
  const ids = await generateComprehensionQuestions(
    contentResourceId, schoolId, teacherId, subjectId, gradeId, curriculumNodeId, count,
  );
  res.json({ data: { questionIds: ids } });
}

static async studentDashboard(req: Request, res: Response): Promise<void> {
  const schoolId = req.user!.schoolId;
  // Resolve studentId from JWT — same pattern as useCurrentStudent
  const { Student } = await import('../Student/model.js');
  const student = await Student.findOne({ userId: req.user!.id, schoolId, isDeleted: false }).lean();
  if (!student) {
    res.status(404).json({ error: 'Student profile not found' });
    return;
  }
  const counts = await HomeworkService.getStudentDashboardCounts(student._id.toString(), schoolId);
  res.json({ data: counts });
}

static async parentDashboard(req: Request, res: Response): Promise<void> {
  const schoolId = req.user!.schoolId;
  const { Parent } = await import('../Student/model.js');
  const parent = await Parent.findOne({ userId: req.user!.id, schoolId, isDeleted: false }).lean();
  if (!parent) {
    res.status(404).json({ error: 'Parent profile not found' });
    return;
  }
  const data = await HomeworkService.getParentDashboardCounts(parent._id.toString(), schoolId);
  res.json({ data });
}
```

Update existing `submit` controller to use the new signature — replace its call from `submitHomework(homeworkId, studentId, schoolId, files)` to `submitHomework(homeworkId, studentId, schoolId, payload)`.

```ts
static async submit(req: Request, res: Response): Promise<void> {
  const schoolId = req.user!.schoolId;
  const { Student } = await import('../Student/model.js');
  const student = await Student.findOne({ userId: req.user!.id, schoolId, isDeleted: false }).lean();
  if (!student) {
    res.status(404).json({ error: 'Student profile not found' });
    return;
  }
  const submission = await HomeworkService.submitHomework(
    req.params.id,
    student._id.toString(),
    schoolId,
    req.body, // already validated by Zod via the route middleware
  );
  res.json({ data: submission });
}
```

- [ ] **Step 2: Add routes**

Append to `routes.ts` (above `export default router`):

```ts
import { generateComprehensionSchema } from './validation.js';

router.get(
  '/student/dashboard',
  authenticate,
  authorize('student'),
  HomeworkController.studentDashboard,
);

router.get(
  '/parent/dashboard',
  authenticate,
  authorize('parent'),
  HomeworkController.parentDashboard,
);

router.get(
  '/submissions/:id',
  authenticate,
  HomeworkController.getSubmissionById,
);

router.post(
  '/:id/regrade',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  HomeworkController.regradeSubmission,
);

router.post(
  '/comprehension-questions',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  validate(generateComprehensionSchema),
  HomeworkController.generateComprehension,
);
```

Important ordering: `/student/dashboard` and `/parent/dashboard` and `/submissions/:id` MUST be registered BEFORE the existing `/:id` GET (line 82-86 of current routes.ts) to avoid route clash. Move them above that route. Same for `/comprehension-questions` (it's POST so won't clash with `/:id` PUT/DELETE, but stay safe). And `/:id/regrade` is a sub-path of `/:id` so safe.

- [ ] **Step 3: Verify**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -20
wc -l c:/Users/shaun/campusly-backend/src/modules/Homework/routes.ts c:/Users/shaun/campusly-backend/src/modules/Homework/controller.ts
```

Should be zero TS errors now (Tasks 1-9 should all compile clean once routes.ts and controller.ts are updated).

- [ ] **Step 4: Smoke test backend**

```bash
cd c:/Users/shaun/campusly-backend && npm run dev 2>&1 | head -30 &
# wait 5s
sleep 5
curl -s http://localhost:4500/api/health || echo "(no /health, check logs)"
# Kill the dev server when done
```

If startup logs error-free, all routes are wired.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/routes.ts src/modules/Homework/controller.ts
git commit -m "feat(homework): routes + controller for new endpoints (submit poll, regrade, comprehension generate, student/parent dashboards)"
```

---

## Task 11: Frontend types + hooks (wizard store, submission poll, dashboards)

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/types/homework.ts`
- Create: `c:/Users/shaun/campusly-frontend/src/stores/useTeacherHomeworkWizardStore.ts`
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/useHomeworkSubmission.ts`
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/useStudentHomeworkDashboard.ts`
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/useParentHomeworkSummary.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/hooks/useStudentHomework.ts`

- [ ] **Step 1: Extend `src/types/homework.ts`**

Add new submission types after the legacy `HomeworkSubmission` interface (line 119+):

```ts
// ─── Module 4: Submission discriminated union ──────────────────────────────

export type GradingStatus = 'pending' | 'graded' | 'failed';
export type GradingMethod = 'deterministic' | 'ai' | 'teacher' | 'pending';

export interface GradedAnswerBase {
  studentAnswer: string;
  questionSnapshot: string;
  awarded?: number;
  maxMarks: number;
  rationale?: string;
  gradingMethod: GradingMethod;
}

export interface QuizAnswer extends GradedAnswerBase {
  questionIndex: number;
}

export interface ExerciseAnswer extends GradedAnswerBase {
  questionId: string;
}

export interface ReadingAnswer extends GradedAnswerBase {
  questionId: string;
}

export interface LateMarkAdjustment {
  rawMark: number;
  penaltyPercent: number;
  finalMark: number;
}

export interface HomeworkSubmissionBase {
  _id: string;
  homeworkId: string;
  studentId: string;
  schoolId: string;
  homeworkVersion: number;
  submittedAt: string;
  isLate: boolean;
  gradingStatus: GradingStatus;
  gradingGeneration: number;
  mark?: number;
  maxMarks: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string | null;
  errorMessage?: string;
  lateMarkAdjustment?: LateMarkAdjustment;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizSubmission extends HomeworkSubmissionBase {
  type: 'quiz';
  answers: QuizAnswer[];
}

export interface ExerciseSubmission extends HomeworkSubmissionBase {
  type: 'exercise';
  answers: ExerciseAnswer[];
}

export interface ReadingSubmission extends HomeworkSubmissionBase {
  type: 'reading';
  markedReadAt: string;
  comprehensionAnswers: ReadingAnswer[];
}

export type StructuredHomeworkSubmission =
  | QuizSubmission
  | ExerciseSubmission
  | ReadingSubmission;

// ─── Submit payloads (mirror backend Zod schemas) ──────────────────────────

export type SubmitQuizPayload = {
  type: 'quiz';
  answers: Array<{ questionIndex: number; studentAnswer: string }>;
};

export type SubmitExercisePayload = {
  type: 'exercise';
  answers: Array<{ questionId: string; studentAnswer: string }>;
};

export type SubmitReadingPayload = {
  type: 'reading';
  markedReadAt: string;
  comprehensionAnswers: Array<{ questionId: string; studentAnswer: string }>;
};

export type SubmitHomeworkPayload =
  | SubmitQuizPayload
  | SubmitExercisePayload
  | SubmitReadingPayload;
```

Also extend the existing `HomeworkBase` interface to include:

```ts
latePolicy: 'block' | 'penalty' | 'accept';
latePenaltyPercent?: number;
gradebookAutoPublish: boolean;
assessmentId?: string | null;
version: number;
comprehensionQuestionIds?: string[];
```

- [ ] **Step 2: Create the wizard Zustand store**

Use the paper wizard store as a pattern. Read it first:

```bash
ls c:/Users/shaun/campusly-frontend/src/stores/ | grep -i wizard
```

Then create `useTeacherHomeworkWizardStore.ts`:

```ts
import { create } from 'zustand';

export type HomeworkWizardType = 'quiz' | 'reading' | 'exercise';

export interface HomeworkWizardState {
  // Step 1
  type: HomeworkWizardType | null;
  title: string;
  subjectId: string;
  classId: string;
  dueDate: string;       // ISO datetime string
  totalMarks: number;
  latePolicy: 'block' | 'penalty' | 'accept';
  latePenaltyPercent: number;
  gradebookAutoPublish: boolean;
  // Step 2 — type-specific
  quizId: string;
  contentResourceId: string;
  pageRange: string;
  comprehensionQuestionIds: string[];
  exerciseQuestionIds: string[];
  // Wizard control
  step: 1 | 2 | 3 | 4;
  // Setters
  set: (patch: Partial<HomeworkWizardState>) => void;
  reset: () => void;
}

const INITIAL: Omit<HomeworkWizardState, 'set' | 'reset'> = {
  type: null,
  title: '',
  subjectId: '',
  classId: '',
  dueDate: '',
  totalMarks: 0,
  latePolicy: 'block',
  latePenaltyPercent: 25,
  gradebookAutoPublish: true,
  quizId: '',
  contentResourceId: '',
  pageRange: '',
  comprehensionQuestionIds: [],
  exerciseQuestionIds: [],
  step: 1,
};

export const useTeacherHomeworkWizardStore = create<HomeworkWizardState>((set) => ({
  ...INITIAL,
  set: (patch) => set(patch),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 3: Create `useHomeworkSubmission.ts`**

```ts
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { StructuredHomeworkSubmission } from '@/types/homework';

const POLL_INTERVAL_MS = 3000;

export function useHomeworkSubmission(submissionId: string | null): {
  submission: StructuredHomeworkSubmission | null;
  loading: boolean;
  polling: boolean;
  refetch: () => Promise<void>;
} {
  const [submission, setSubmission] = useState<StructuredHomeworkSubmission | null>(null);
  const [loading, setLoading] = useState(!!submissionId);
  const [polling, setPolling] = useState(false);
  const cancelledRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (!submissionId) return;
    try {
      const res = await apiClient.get(`/homework/submissions/${submissionId}`);
      const data = unwrapResponse<StructuredHomeworkSubmission>(res);
      if (!cancelledRef.current) setSubmission(data);
    } catch (err: unknown) {
      console.error('Failed to load submission', err);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    if (!submissionId) {
      setSubmission(null);
      setLoading(false);
      return;
    }
    cancelledRef.current = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const poll = async (): Promise<void> => {
      if (cancelledRef.current) return;
      try {
        const res = await apiClient.get(`/homework/submissions/${submissionId}`);
        const data = unwrapResponse<StructuredHomeworkSubmission>(res);
        if (cancelledRef.current) return;
        setSubmission(data);
        setLoading(false);
        if (data.gradingStatus === 'pending') {
          setPolling(true);
          timerId = setTimeout(() => void poll(), POLL_INTERVAL_MS);
        } else {
          setPolling(false);
        }
      } catch (err: unknown) {
        console.error('Submission poll failed', err);
        setLoading(false);
      }
    };
    void poll();

    return () => {
      cancelledRef.current = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [submissionId]);

  return { submission, loading, polling, refetch: fetchOnce };
}
```

- [ ] **Step 4: Create `useStudentHomeworkDashboard.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

interface DashboardCounts {
  dueThisWeek: number;
  overdue: number;
  awaitingGrading: number;
}

export function useStudentHomeworkDashboard(): {
  counts: DashboardCounts | null;
  loading: boolean;
} {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/homework/student/dashboard', { signal: controller.signal })
      .then((res) => setCounts(unwrapResponse<DashboardCounts>(res)))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load homework dashboard', err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { counts, loading };
}
```

- [ ] **Step 5: Create `useParentHomeworkSummary.ts`** (no args — JWT-resolved):

```ts
'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

interface ChildSummary {
  studentId: string;
  firstName: string;
  lastName: string;
  pending: number;
  overdue: number;
  awaitingGrading: number;
}

export function useParentHomeworkSummary(): {
  children: ChildSummary[];
  loading: boolean;
} {
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get('/homework/parent/dashboard', { signal: controller.signal })
      .then((res) => setChildren(unwrapList<ChildSummary>(res)))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load parent homework summary', err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { children, loading };
}
```

- [ ] **Step 6: Audit + extend `useStudentHomework.ts`**

Read the file, ensure `submitHomework` accepts the new structured payload (`SubmitHomeworkPayload` from `@/types/homework`), not free-text. The hook should POST to `/homework/:id/submit` with the discriminated payload and return the resulting `StructuredHomeworkSubmission`.

Ensure the hook also exposes a `useStudentHomeworkDetail(homeworkId)` that returns:
- `homework: Homework | null`
- `submission: StructuredHomeworkSubmission | null` (latest)
- `loading: boolean`
- `submitHomework(payload: SubmitHomeworkPayload): Promise<StructuredHomeworkSubmission | null>`

Replace the existing free-text `submitHomework(content: string)` signature.

- [ ] **Step 7: Verify**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -30
wc -l src/types/homework.ts src/stores/useTeacherHomeworkWizardStore.ts src/hooks/useHomeworkSubmission.ts src/hooks/useStudentHomeworkDashboard.ts src/hooks/useParentHomeworkSummary.ts src/hooks/useStudentHomework.ts
```

Errors in `student/homework/[id]/page.tsx` are expected and Task 17 fixes them.

- [ ] **Step 8: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/types/homework.ts src/stores/useTeacherHomeworkWizardStore.ts src/hooks/useHomeworkSubmission.ts src/hooks/useStudentHomeworkDashboard.ts src/hooks/useParentHomeworkSummary.ts src/hooks/useStudentHomework.ts
git commit -m "feat(homework): types + wizard store + submission/dashboard hooks for Module 4"
```

---

## Task 12: Teacher wizard route + Step 1 (type + metadata)

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/homework/new/page.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/HomeworkWizardStep1.tsx`

- [ ] **Step 1: Wizard route page (orchestrator)**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import { HomeworkWizardStep1 } from '@/components/homework/HomeworkWizardStep1';

export default function TeacherHomeworkNewPage() {
  const router = useRouter();
  const { step, reset } = useTeacherHomeworkWizardStore();

  const handleCancel = () => {
    reset();
    router.push('/teacher/homework');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Homework" description={`Step ${step} of 4`}>
        <Link href="/teacher/homework">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />Cancel
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {step === 1 && <HomeworkWizardStep1 />}
          {step === 2 && <p className="text-sm text-muted-foreground">Step 2 — see Task 13</p>}
          {step === 3 && <p className="text-sm text-muted-foreground">Step 3 — see Task 14</p>}
          {step === 4 && <p className="text-sm text-muted-foreground">Step 4 — see Task 14</p>}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Step 1 component (type + metadata)**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { ClipboardList, BookOpen, Target } from 'lucide-react';
import type { HomeworkWizardType } from '@/stores/useTeacherHomeworkWizardStore';

const TYPE_OPTIONS: Array<{ value: HomeworkWizardType; label: string; description: string; icon: typeof ClipboardList }> = [
  { value: 'quiz', label: 'Quiz', description: 'Pick a quiz from the Learning module', icon: ClipboardList },
  { value: 'reading', label: 'Reading', description: 'Pick a content resource; AI generates comprehension questions', icon: BookOpen },
  { value: 'exercise', label: 'Exercise', description: 'Pick questions from the Question Bank', icon: Target },
];

export function HomeworkWizardStep1() {
  const state = useTeacherHomeworkWizardStore();
  const { classes } = useTeacherClasses();
  const { subjects } = useSubjects();

  const canAdvance = state.type && state.title.trim().length > 0 && state.subjectId && state.classId && state.dueDate && state.totalMarks > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Type <span className="text-destructive">*</span></Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = state.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => state.set({ type: opt.value })}
                className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary ${selected ? 'border-primary bg-primary/5' : ''}`}
              >
                <Icon className="h-5 w-5 text-primary" />
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
          <Input id="title" value={state.title} onChange={(e) => state.set({ title: e.target.value })} placeholder="Chapter 5 Reading" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date <span className="text-destructive">*</span></Label>
          <Input id="dueDate" type="datetime-local" value={state.dueDate} onChange={(e) => state.set({ dueDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject <span className="text-destructive">*</span></Label>
          <Select value={state.subjectId} onValueChange={(v: unknown) => state.set({ subjectId: v as string })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Choose subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="class">Class <span className="text-destructive">*</span></Label>
          <Select value={state.classId} onValueChange={(v: unknown) => state.set({ classId: v as string })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Choose class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalMarks">Total marks <span className="text-destructive">*</span></Label>
          <Input id="totalMarks" type="number" min={1} max={1000} value={state.totalMarks || ''} onChange={(e) => state.set({ totalMarks: Number(e.target.value) })} />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <Label>Late submission policy</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['block', 'penalty', 'accept'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => state.set({ latePolicy: p })}
              className={`rounded-md border p-3 text-sm transition-colors hover:border-primary ${state.latePolicy === p ? 'border-primary bg-primary/5' : ''}`}
            >
              <div className="font-medium capitalize">{p}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {p === 'block' && 'Reject late submissions'}
                {p === 'penalty' && 'Accept with mark penalty'}
                {p === 'accept' && 'Accept, no penalty'}
              </div>
            </button>
          ))}
        </div>
        {state.latePolicy === 'penalty' && (
          <div className="space-y-2">
            <Label htmlFor="penalty">Penalty %</Label>
            <Input id="penalty" type="number" min={0} max={100} value={state.latePenaltyPercent} onChange={(e) => state.set({ latePenaltyPercent: Number(e.target.value) })} className="w-24" />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => state.set({ step: 2 })} disabled={!canAdvance}>Next</Button>
      </div>
    </div>
  );
}
```

If `useSubjects` doesn't exist in the codebase, find the closest equivalent (`useTeacherSubjects` or similar via grep) and use that.

- [ ] **Step 3: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l "src/app/(dashboard)/teacher/homework/new/page.tsx" src/components/homework/HomeworkWizardStep1.tsx
git add "src/app/(dashboard)/teacher/homework/new/page.tsx" src/components/homework/HomeworkWizardStep1.tsx
git commit -m "feat(homework): wizard route + Step 1 (type + metadata + late policy)"
```

---

## Task 13: Wizard Step 2 (3 type-specific config panels)

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/HomeworkWizardStep2.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/QuizPicker.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/ResourcePicker.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/useTeacherQuizzes.ts`
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/useTeacherResources.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/homework/new/page.tsx` (mount Step2)

- [ ] **Step 1: Hooks**

```ts
// useTeacherQuizzes.ts
'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface QuizSummary {
  _id: string;
  title: string;
  totalPoints: number;
  subjectId: string;
  classId: string;
  questions: { length: number };
}

export function useTeacherQuizzes(filters?: { subjectId?: string; classId?: string }): {
  quizzes: QuizSummary[];
  loading: boolean;
} {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters?.subjectId) params.subjectId = filters.subjectId;
    if (filters?.classId) params.classId = filters.classId;
    apiClient.get('/learning/quizzes', { params })
      .then((res) => setQuizzes(unwrapList<QuizSummary>(res)))
      .catch((err: unknown) => console.error('Failed to load quizzes', err))
      .finally(() => setLoading(false));
  }, [filters?.subjectId, filters?.classId]);
  return { quizzes, loading };
}
```

```ts
// useTeacherResources.ts
'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

export interface ResourceSummary {
  _id: string;
  title: string;
  type: string;
  status: string;
  subjectId?: string;
  gradeId?: string;
}

export function useTeacherResources(filters?: { subjectId?: string; gradeId?: string }): {
  resources: ResourceSummary[];
  loading: boolean;
} {
  const [resources, setResources] = useState<ResourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const params: Record<string, string> = { status: 'published' };
    if (filters?.subjectId) params.subjectId = filters.subjectId;
    if (filters?.gradeId) params.gradeId = filters.gradeId;
    apiClient.get('/content-library/resources', { params })
      .then((res) => setResources(unwrapList<ResourceSummary>(res)))
      .catch((err: unknown) => console.error('Failed to load resources', err))
      .finally(() => setLoading(false));
  }, [filters?.subjectId, filters?.gradeId]);
  return { resources, loading };
}
```

If `/content-library/resources` returns 404, check the actual route in `src/modules/ContentLibrary/routes.ts` and adjust.

- [ ] **Step 2: QuizPicker component**

```tsx
'use client';
import { useTeacherQuizzes } from '@/hooks/useTeacherQuizzes';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardList } from 'lucide-react';

interface Props {
  subjectId: string;
  classId: string;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function QuizPicker({ subjectId, classId, selectedId, onSelect }: Props) {
  const { quizzes, loading } = useTeacherQuizzes({ subjectId, classId });
  if (loading) return <LoadingSpinner />;
  if (quizzes.length === 0) {
    return <EmptyState icon={ClipboardList} title="No quizzes yet" description="Create one in the Learning module first." />;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {quizzes.map((q) => (
        <button
          key={q._id}
          type="button"
          onClick={() => onSelect(q._id)}
          className={`text-left transition-colors hover:border-primary ${selectedId === q._id ? 'border-primary' : ''}`}
        >
          <Card>
            <CardContent className="p-3">
              <div className="font-medium text-sm truncate">{q.title}</div>
              <div className="text-xs text-muted-foreground">{q.totalPoints} marks</div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: ResourcePicker component (with comprehension Q generation hook)**

```tsx
'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useTeacherResources } from '@/hooks/useTeacherResources';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen, Sparkles } from 'lucide-react';

interface Props {
  subjectId: string;
  gradeId: string;
  curriculumNodeId: string;
  selectedId: string;
  onSelect: (id: string) => void;
  onComprehensionReady: (questionIds: string[]) => void;
}

export function ResourcePicker({ subjectId, gradeId, curriculumNodeId, selectedId, onSelect, onComprehensionReady }: Props) {
  const { resources, loading } = useTeacherResources({ subjectId, gradeId });
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (resourceId: string) => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/homework/comprehension-questions', { contentResourceId: resourceId, count: 4 }, { params: { subjectId, gradeId, curriculumNodeId } });
      const data = unwrapResponse<{ questionIds: string[] }>(res);
      onComprehensionReady(data.questionIds);
      toast.success(`Generated ${data.questionIds.length} comprehension questions`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (resources.length === 0) {
    return <EmptyState icon={BookOpen} title="No resources" description="Add a resource to the Content Library first." />;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {resources.map((r) => (
          <button key={r._id} type="button" onClick={() => onSelect(r._id)} className={`text-left transition-colors hover:border-primary ${selectedId === r._id ? 'border-primary' : ''}`}>
            <Card>
              <CardContent className="p-3">
                <div className="font-medium text-sm truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground capitalize">{r.type}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
      {selectedId && (
        <Button onClick={() => void handleGenerate(selectedId)} disabled={generating}>
          <Sparkles className="mr-2 h-4 w-4" />
          {generating ? 'Generating questions...' : 'Generate comprehension questions'}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Step 2 orchestrator**

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import { QuizPicker } from './QuizPicker';
import { ResourcePicker } from './ResourcePicker';
import { QuestionBankPicker } from '@/components/ai-tools/QuestionBankPicker';

export function HomeworkWizardStep2() {
  const state = useTeacherHomeworkWizardStore();

  const canAdvance =
    (state.type === 'quiz' && state.quizId) ||
    (state.type === 'reading' && state.contentResourceId && state.comprehensionQuestionIds.length > 0) ||
    (state.type === 'exercise' && state.exerciseQuestionIds.length > 0);

  return (
    <div className="space-y-6">
      {state.type === 'quiz' && (
        <QuizPicker
          subjectId={state.subjectId}
          classId={state.classId}
          selectedId={state.quizId}
          onSelect={(id) => state.set({ quizId: id })}
        />
      )}
      {state.type === 'reading' && (
        <ResourcePicker
          subjectId={state.subjectId}
          gradeId={/* derive from class — for v1 require teacher to pick a gradeId via select if needed; or set from class.gradeId at step 1 */ ''}
          curriculumNodeId={/* same — fetch first available node for subject+grade */ ''}
          selectedId={state.contentResourceId}
          onSelect={(id) => state.set({ contentResourceId: id })}
          onComprehensionReady={(ids) => state.set({ comprehensionQuestionIds: ids })}
        />
      )}
      {state.type === 'exercise' && (
        <QuestionBankPicker
          subjectId={state.subjectId}
          gradeId={/* same caveat */ ''}
          selectedIds={state.exerciseQuestionIds}
          onChange={(ids: string[]) => state.set({ exerciseQuestionIds: ids })}
        />
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => state.set({ step: 1 })}>Back</Button>
        <Button onClick={() => state.set({ step: 3 })} disabled={!canAdvance}>Next</Button>
      </div>
    </div>
  );
}
```

For Reading + Exercise, you need a `gradeId` and `curriculumNodeId`. For Module 4 v1, derive from the class: when teacher picks a class in Step 1, also fetch its `gradeId` and the first available `CurriculumNode` for `(subjectId, gradeId)`. Add these as wizard store fields:

```ts
// In useTeacherHomeworkWizardStore.ts:
gradeId: string;
curriculumNodeId: string;
```

In Step 1's class onValueChange, populate these via a hook call (extend `useTeacherClasses` to expose `entries[].class.gradeId`, and call `apiClient.get('/curriculum/nodes', { params: { subjectId, gradeId } })` and pick the first node, or fail with toast if none). If integration is too heavy for the wizard, the simplest fallback is to require the teacher to pick a "topic" before advancing past Step 1 — add a topic Select in Step 1 and treat it as the curriculumNode.

- [ ] **Step 5: Mount Step 2 in the wizard page**

In `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/homework/new/page.tsx`, replace the `step === 2` placeholder with `<HomeworkWizardStep2 />`.

- [ ] **Step 6: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l src/components/homework/HomeworkWizardStep2.tsx src/components/homework/QuizPicker.tsx src/components/homework/ResourcePicker.tsx src/hooks/useTeacherQuizzes.ts src/hooks/useTeacherResources.ts
git add src/app/\(dashboard\)/teacher/homework/new src/components/homework/{HomeworkWizardStep2,QuizPicker,ResourcePicker}.tsx src/hooks/{useTeacherQuizzes,useTeacherResources}.ts src/stores/useTeacherHomeworkWizardStore.ts
git commit -m "feat(homework): wizard Step 2 — QuizPicker / ResourcePicker (with comprehension gen) / QuestionBankPicker reuse"
```

---

## Task 14: Wizard Steps 3 + 4 + page orchestrator

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/HomeworkWizardStep3.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/HomeworkWizardStep4.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/useTeacherHomework.ts` (mutations)
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/homework/new/page.tsx`

- [ ] **Step 1: Mutations hook**

```ts
'use client';
import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { Homework } from '@/types/homework';

export function useTeacherHomeworkMutations(): {
  createHomework: (payload: Record<string, unknown>) => Promise<Homework | null>;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);

  const createHomework = useCallback(async (payload: Record<string, unknown>): Promise<Homework | null> => {
    setLoading(true);
    try {
      const res = await apiClient.post('/homework', payload);
      return unwrapResponse<Homework>(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create homework');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createHomework, loading };
}
```

- [ ] **Step 2: Step 3 (review)** — metadata-only, no student-component preview:

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';

export function HomeworkWizardStep3() {
  const state = useTeacherHomeworkWizardStore();

  const itemCount =
    state.type === 'quiz' ? 1 :
    state.type === 'reading' ? state.comprehensionQuestionIds.length :
    state.exerciseQuestionIds.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <Row label="Type" value={state.type ?? '-'} />
          <Row label="Title" value={state.title} />
          <Row label="Due date" value={state.dueDate} />
          <Row label="Total marks" value={String(state.totalMarks)} />
          <Row label="Late policy" value={state.latePolicy === 'penalty' ? `penalty (${state.latePenaltyPercent}%)` : state.latePolicy} />
          <Row label="Auto-publish to gradebook" value={state.gradebookAutoPublish ? 'Yes' : 'No'} />
          <Row label="Items" value={`${itemCount} ${state.type === 'quiz' ? 'quiz' : 'questions'}`} />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => state.set({ step: 2 })}>Back</Button>
        <Button onClick={() => state.set({ step: 4 })}>Next</Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="text-xs text-muted-foreground sm:w-40">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
```

- [ ] **Step 3: Step 4 (assign)**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import { useTeacherHomeworkMutations } from '@/hooks/useTeacherHomework';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';

export function HomeworkWizardStep4() {
  const state = useTeacherHomeworkWizardStore();
  const { createHomework, loading } = useTeacherHomeworkMutations();
  const { user } = useAuthStore();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting || !user?.schoolId) return;
    setSubmitting(true);
    const base = {
      title: state.title,
      subjectId: state.subjectId,
      classId: state.classId,
      schoolId: user.schoolId,
      dueDate: new Date(state.dueDate).toISOString(),
      totalMarks: state.totalMarks,
      latePolicy: state.latePolicy,
      ...(state.latePolicy === 'penalty' ? { latePenaltyPercent: state.latePenaltyPercent } : {}),
      gradebookAutoPublish: state.gradebookAutoPublish,
    };
    const payload =
      state.type === 'quiz'
        ? { ...base, type: 'quiz' as const, quizId: state.quizId }
        : state.type === 'reading'
        ? { ...base, type: 'reading' as const, contentResourceId: state.contentResourceId, ...(state.pageRange ? { pageRange: state.pageRange } : {}), ...(state.comprehensionQuestionIds.length ? { comprehensionQuestionIds: state.comprehensionQuestionIds } : {}) }
        : { ...base, type: 'exercise' as const, exerciseQuestionIds: state.exerciseQuestionIds };

    const result = await createHomework(payload);
    if (result) {
      toast.success('Homework assigned');
      state.reset();
      router.push(`/teacher/homework/${result._id}`);
    } else {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Confirm the metadata and click Assign.</p>
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => state.set({ step: 3 })}>Back</Button>
        <Button onClick={() => void handleSubmit()} disabled={loading || submitting}>
          {submitting ? 'Assigning...' : 'Assign Homework'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Mount in wizard page**

Replace the `step === 3` and `step === 4` placeholders in the wizard page with `<HomeworkWizardStep3 />` and `<HomeworkWizardStep4 />`.

- [ ] **Step 5: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l "src/app/(dashboard)/teacher/homework/new/page.tsx" src/components/homework/HomeworkWizardStep{3,4}.tsx src/hooks/useTeacherHomework.ts
git add "src/app/(dashboard)/teacher/homework/new/page.tsx" src/components/homework/HomeworkWizardStep{3,4}.tsx src/hooks/useTeacherHomework.ts
git commit -m "feat(homework): wizard Steps 3 (review) + 4 (assign) — POSTs to /homework, redirects to detail"
```

---

## Task 15: Teacher list page extension (filters + columns + extracted subcomponents)

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/homework/page.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/HomeworkListFilters.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/HomeworkListRow.tsx`

- [ ] **Step 1: Read the existing list page** to understand current structure.

- [ ] **Step 2: Extract the filter bar to `HomeworkListFilters.tsx`**

Component takes a `filters` object (`{ type, classId, status, search }`) and `onChange` callback. Renders Selects + search input. Mobile-responsive (`flex flex-col sm:flex-row gap-3`). ≤120 lines.

- [ ] **Step 3: Extract table rows to `HomeworkListRow.tsx`**

Component takes a single homework + per-homework counts (auto-graded, pending, total submissions) and renders a row with badges (type, late policy, subject), submission counts, and action buttons. ≤100 lines.

- [ ] **Step 4: Update the page**

Replace the existing list rendering with `<HomeworkListFilters />` + `<HomeworkListRow />`. The page now orchestrates only: hook calls + state for filters + composing components. Add a "New Homework" button at top right linking to `/teacher/homework/new`. Fetch counts via `getSubmissions(homeworkId)` per row OR add a server-side aggregation; for v1, fetch total submission counts only via the existing `getSubmissions` route.

Total line count of `page.tsx` after the change: aim for ≤200 lines.

- [ ] **Step 5: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l "src/app/(dashboard)/teacher/homework/page.tsx" src/components/homework/HomeworkListFilters.tsx src/components/homework/HomeworkListRow.tsx
git add "src/app/(dashboard)/teacher/homework/page.tsx" src/components/homework/HomeworkListFilters.tsx src/components/homework/HomeworkListRow.tsx
git commit -m "feat(homework): teacher list extension — filters + columns + extracted subcomponents"
```

---

## Task 16: Teacher detail page rebuild (HomeworkGradingPanel)

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/homework/[id]/page.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/HomeworkGradingPanel.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/HomeworkSubmissionRow.tsx`

- [ ] **Step 1: HomeworkSubmissionRow** — one row per submission. Renders student name, grading status badge, mark/maxMarks, "View" button to expand. Expanded view shows per-question marks + AI rationale (collapsible `<details>`) + adjust input + "Re-grade" button. ≤200 lines.

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { StructuredHomeworkSubmission } from '@/types/homework';

interface Props {
  submission: StructuredHomeworkSubmission & { studentId: { _id: string; user?: { firstName: string; lastName: string } } | string };
  onUpdated: (sub: StructuredHomeworkSubmission) => void;
  homeworkVersion: number;
}

export function HomeworkSubmissionRow({ submission, onUpdated, homeworkVersion }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const studentName = typeof submission.studentId === 'string'
    ? '(student)'
    : `${submission.studentId.user?.firstName ?? ''} ${submission.studentId.user?.lastName ?? ''}`.trim() || '(unnamed)';

  const isStale = submission.homeworkVersion < homeworkVersion;
  const variant = submission.gradingStatus === 'graded' ? 'default' : submission.gradingStatus === 'failed' ? 'destructive' : 'secondary';

  const handleRegrade = async () => {
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/homework/${submission.homeworkId}/regrade`, {});
      const fresh = unwrapResponse<StructuredHomeworkSubmission>(res);
      onUpdated(fresh);
      toast.success('Regrade triggered');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Regrade failed');
    } finally {
      setSubmitting(false);
    }
  };

  const answers = submission.type === 'reading' ? submission.comprehensionAnswers : submission.answers;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{studentName}</span>
            <Badge variant={variant} className="capitalize shrink-0">{submission.gradingStatus}</Badge>
            {isStale && <Badge variant="outline" className="shrink-0">stale</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{submission.mark ?? '-'} / {submission.maxMarks}</span>
            <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>{expanded ? 'Hide' : 'View'}</Button>
            <Button variant="outline" size="sm" onClick={() => void handleRegrade()} disabled={submitting}>Re-grade</Button>
          </div>
        </div>
        {expanded && (
          <div className="mt-3 space-y-2">
            {answers.map((a, i) => (
              <div key={i} className="rounded border p-2 text-sm">
                <p className="font-medium truncate">{a.questionSnapshot}</p>
                <p className="text-muted-foreground">Student: <span className="line-clamp-2">{a.studentAnswer || '(blank)'}</span></p>
                <p>Awarded: {a.awarded ?? '-'} / {a.maxMarks} <span className="text-xs text-muted-foreground capitalize">({a.gradingMethod})</span></p>
                {a.rationale && (
                  <details className="text-xs text-muted-foreground mt-1">
                    <summary className="cursor-pointer hover:text-foreground">AI rationale</summary>
                    <p className="whitespace-pre-wrap mt-1 pl-2 border-l-2 border-muted">{a.rationale}</p>
                  </details>
                )}
              </div>
            ))}
            {submission.lateMarkAdjustment && (
              <p className="text-xs text-muted-foreground">Late penalty applied: {submission.lateMarkAdjustment.rawMark} → {submission.lateMarkAdjustment.finalMark} ({submission.lateMarkAdjustment.penaltyPercent}%)</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: HomeworkGradingPanel**

```tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Inbox } from 'lucide-react';
import { HomeworkSubmissionRow } from './HomeworkSubmissionRow';
import type { StructuredHomeworkSubmission, Homework } from '@/types/homework';

interface Props {
  homework: Homework;
}

export function HomeworkGradingPanel({ homework }: Props) {
  const [submissions, setSubmissions] = useState<StructuredHomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await apiClient.get(`/homework/${homework._id}/submissions`);
      setSubmissions(unwrapList<StructuredHomeworkSubmission>(res));
    } catch (err: unknown) {
      console.error('Failed to load submissions', err);
    } finally {
      setLoading(false);
    }
  }, [homework._id]);

  useEffect(() => { void fetchSubmissions(); }, [fetchSubmissions]);

  const handleUpdated = (updated: StructuredHomeworkSubmission) => {
    setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
  };

  if (loading) return <LoadingSpinner />;
  if (submissions.length === 0) return <EmptyState icon={Inbox} title="No submissions yet" description="Students haven't submitted this homework yet." />;

  return (
    <div className="space-y-2">
      {submissions.map((s) => (
        <HomeworkSubmissionRow key={s._id} submission={s} onUpdated={handleUpdated} homeworkVersion={homework.version} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update teacher detail page**

In `[id]/page.tsx`, replace the existing `GradingInterface` import + usage with `<HomeworkGradingPanel homework={homework} />`. Keep the homework metadata header.

- [ ] **Step 4: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l "src/app/(dashboard)/teacher/homework/[id]/page.tsx" src/components/homework/HomeworkGradingPanel.tsx src/components/homework/HomeworkSubmissionRow.tsx
git add "src/app/(dashboard)/teacher/homework/[id]/page.tsx" src/components/homework/HomeworkGradingPanel.tsx src/components/homework/HomeworkSubmissionRow.tsx
git commit -m "feat(homework): teacher detail rebuild — HomeworkGradingPanel with per-question rationale + regrade"
```

---

## Task 17: Student detail page orchestrator + QuizSubmissionForm

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/student/homework/[id]/page.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/QuizSubmissionForm.tsx`

- [ ] **Step 1: Replace student detail page** with type-dispatch orchestrator. NO free-text Textarea.

```tsx
'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { BookOpen, Calendar, ArrowLeft } from 'lucide-react';
import { useStudentHomeworkDetail } from '@/hooks/useStudentHomework';
import { formatDate } from '@/lib/utils';
import { QuizSubmissionForm } from '@/components/homework/QuizSubmissionForm';
// Tasks 18 + 19 add ExerciseSubmissionForm + ReadingSubmissionForm

export default function HomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;
  const { homework, submission, loading, submitHomework } = useStudentHomeworkDetail(homeworkId);

  if (loading) return <LoadingSpinner />;
  if (!homework) {
    return (
      <EmptyState icon={BookOpen} title="Homework Not Found" description="The homework assignment does not exist."
        action={<Link href="/student/homework"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></Link>}
      />
    );
  }

  const isOverdue = new Date(homework.dueDate) < new Date();
  const hasSubmission = !!submission;

  return (
    <div className="space-y-6">
      <Link href="/student/homework" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Back to Homework
      </Link>

      <PageHeader title={homework.title} description="" />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl truncate">{homework.title}</CardTitle>
            <Badge variant={hasSubmission ? 'default' : isOverdue ? 'destructive' : 'outline'}>
              {hasSubmission ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Due:</span><span>{formatDate(homework.dueDate)}</span>
          </div>
        </CardContent>
      </Card>

      {homework.type === 'quiz' && (
        <QuizSubmissionForm homework={homework} submission={submission} onSubmit={submitHomework} />
      )}
      {homework.type === 'exercise' && <p className="text-sm text-muted-foreground">Exercise form — see Task 18</p>}
      {homework.type === 'reading' && <p className="text-sm text-muted-foreground">Reading form — see Task 19</p>}
    </div>
  );
}
```

- [ ] **Step 2: QuizSubmissionForm**

```tsx
'use client';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useHomeworkSubmission } from '@/hooks/useHomeworkSubmission';
import type { Homework, QuizSubmission, SubmitHomeworkPayload, StructuredHomeworkSubmission } from '@/types/homework';

interface QuizQuestion {
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'matching';
  options: { text: string; isCorrect: boolean }[];
  correctAnswer: string;
  points: number;
}

interface Props {
  homework: Homework & { quizId?: string };
  submission: StructuredHomeworkSubmission | null;
  onSubmit: (payload: SubmitHomeworkPayload) => Promise<StructuredHomeworkSubmission | null>;
}

export function QuizSubmissionForm({ homework, submission, onSubmit }: Props) {
  const [quiz, setQuiz] = useState<{ questions: QuizQuestion[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(submission?._id ?? null);
  const live = useHomeworkSubmission(submittedId);

  useEffect(() => {
    if (!homework.quizId) return;
    apiClient.get(`/learning/quizzes/${homework.quizId}`)
      .then((res) => setQuiz(unwrapResponse<{ questions: QuizQuestion[] }>(res)))
      .catch((err: unknown) => console.error('Failed to load quiz', err))
      .finally(() => setLoading(false));
  }, [homework.quizId]);

  const handleSubmit = async () => {
    if (!quiz) return;
    const payload: SubmitHomeworkPayload = {
      type: 'quiz',
      answers: quiz.questions.map((q, i) => ({ questionIndex: i, studentAnswer: answers[i] ?? '' })),
    };
    const result = await onSubmit(payload);
    if (result) setSubmittedId(result._id);
  };

  if (loading) return <LoadingSpinner />;
  if (!quiz) return <p className="text-sm text-destructive">Quiz could not be loaded.</p>;

  const liveSub = live.submission as QuizSubmission | null;
  const isPolling = live.polling;

  return (
    <div className="space-y-4">
      {quiz.questions.map((q, i) => {
        const liveAnswer = liveSub?.answers[i];
        return (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">Q{i + 1}. {q.questionText}</p>
                <span className="text-xs text-muted-foreground shrink-0">{q.points} marks</span>
              </div>
              {q.questionType === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={`q${i}`} checked={answers[i] === opt.text} onChange={() => setAnswers((p) => ({ ...p, [i]: opt.text }))} disabled={!!submittedId} />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.questionType === 'true_false' && (
                <div className="flex gap-3">
                  {(['true', 'false'] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                      <input type="radio" name={`q${i}`} checked={answers[i] === v} onChange={() => setAnswers((p) => ({ ...p, [i]: v }))} disabled={!!submittedId} />
                      {v}
                    </label>
                  ))}
                </div>
              )}
              {q.questionType === 'short_answer' && (
                <Input value={answers[i] ?? ''} onChange={(e) => setAnswers((p) => ({ ...p, [i]: e.target.value }))} disabled={!!submittedId} placeholder="Your answer" />
              )}
              {q.questionType === 'matching' && (
                <p className="text-xs text-muted-foreground">Matching not yet supported in v1 — pick a different quiz.</p>
              )}
              {liveAnswer && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {liveAnswer.gradingMethod === 'pending' ? (
                    <span>Grading...</span>
                  ) : (
                    <span>Awarded: {liveAnswer.awarded ?? 0} / {q.points}{liveAnswer.rationale ? ` — ${liveAnswer.rationale}` : ''}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!submittedId && (
        <Button onClick={() => void handleSubmit()} className="w-full sm:w-auto">Submit</Button>
      )}
      {submittedId && isPolling && <p className="text-sm text-muted-foreground">Auto-grading in progress...</p>}
      {submittedId && !isPolling && liveSub?.gradingStatus === 'graded' && (
        <p className="text-sm font-medium">Final mark: {liveSub.mark ?? '-'} / {liveSub.maxMarks}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l "src/app/(dashboard)/student/homework/[id]/page.tsx" src/components/homework/QuizSubmissionForm.tsx
git add "src/app/(dashboard)/student/homework/[id]/page.tsx" src/components/homework/QuizSubmissionForm.tsx
git commit -m "feat(homework): student detail orchestrator + QuizSubmissionForm with live grading status"
```

---

## Task 18: ExerciseSubmissionForm + per-question type renderers

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/ExerciseSubmissionForm.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/ExerciseQuestionRenderer.tsx`
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/student/homework/[id]/page.tsx` (mount the component)

- [ ] **Step 1: ExerciseQuestionRenderer** — per-question switch on `question.type`. Renders the right input. ≤200 lines.

For each of the 10 types, render:
- `mcq` → radio list from `question.options`
- `true_false` → radio (True/False)
- `short_answer` → `<Input>`
- `structured` → an `<Input>` per inferred sub-part (split on numbered prefixes like "1." in stem; if can't split, single textarea)
- `essay` → `<Textarea>` (this is structured because the question itself is structured, even though the answer is prose)
- `match` → paired `<Select>` per pair (parse pairs from `question.answer` if formatted as `A=1,B=2`; v1 fallback is `<Textarea>`)
- `fill_blank` → `<Input>` (single blank for v1)
- `calculation` → `<Input>` for answer + `<Textarea>` for working
- `diagram_label` → `<Textarea>` (positioned inputs deferred per spec)
- `case_study` → `<Textarea>`

Component takes `{ question, value, onChange, disabled }` props. `value` for compound types (calculation, match) is a single string in serialized form e.g. `"answer=42|working=..."`.

```tsx
'use client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Question } from '@/types';

interface Props {
  question: Pick<Question, 'type' | 'options' | 'stem'> & { marks?: number };
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function ExerciseQuestionRenderer({ question, value, onChange, disabled }: Props) {
  switch (question.type) {
    case 'mcq':
      return (
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label key={i} className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="radio" name={`opt-${question.stem.slice(0, 20)}`} checked={value === opt.label} onChange={() => onChange(opt.label)} disabled={disabled} />
              <span><span className="font-medium">{opt.label}.</span> {opt.text}</span>
            </label>
          ))}
        </div>
      );
    case 'true_false':
      return (
        <div className="flex gap-4">
          {(['true', 'false'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
              <input type="radio" checked={value === v} onChange={() => onChange(v)} disabled={disabled} />
              {v}
            </label>
          ))}
        </div>
      );
    case 'short_answer':
    case 'fill_blank':
      return <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder="Your answer" />;
    case 'calculation':
    case 'essay':
    case 'case_study':
    case 'diagram_label':
    case 'structured':
    case 'match':
      return <Textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder="Your answer" rows={4} />;
    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
  }
}
```

- [ ] **Step 2: ExerciseSubmissionForm**

```tsx
'use client';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useHomeworkSubmission } from '@/hooks/useHomeworkSubmission';
import { ExerciseQuestionRenderer } from './ExerciseQuestionRenderer';
import type { Homework, ExerciseSubmission, SubmitHomeworkPayload, StructuredHomeworkSubmission } from '@/types/homework';
import type { Question } from '@/types';

interface Props {
  homework: Homework & { exerciseQuestionIds?: string[] };
  submission: StructuredHomeworkSubmission | null;
  onSubmit: (payload: SubmitHomeworkPayload) => Promise<StructuredHomeworkSubmission | null>;
}

export function ExerciseSubmissionForm({ homework, submission, onSubmit }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(submission?._id ?? null);
  const live = useHomeworkSubmission(submittedId);

  useEffect(() => {
    const ids = homework.exerciseQuestionIds ?? [];
    if (ids.length === 0) { setLoading(false); return; }
    apiClient.get('/curriculum/questions', { params: { ids: ids.join(',') } })
      .then((res) => setQuestions(unwrapList<Question>(res)))
      .catch((err: unknown) => console.error('Failed to load questions', err))
      .finally(() => setLoading(false));
  }, [homework.exerciseQuestionIds]);

  const handleSubmit = async () => {
    const payload: SubmitHomeworkPayload = {
      type: 'exercise',
      answers: questions.map((q) => ({ questionId: q._id, studentAnswer: answers[q._id] ?? '' })),
    };
    const result = await onSubmit(payload);
    if (result) setSubmittedId(result._id);
  };

  if (loading) return <LoadingSpinner />;

  const liveSub = live.submission as ExerciseSubmission | null;
  const liveAnswerMap = new Map(liveSub?.answers.map((a) => [a.questionId, a]) ?? []);

  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const la = liveAnswerMap.get(q._id);
        return (
          <Card key={q._id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">Q{i + 1}. {q.stem}</p>
                <span className="text-xs text-muted-foreground shrink-0">{q.marks} marks</span>
              </div>
              <ExerciseQuestionRenderer question={q} value={answers[q._id] ?? ''} onChange={(v) => setAnswers((p) => ({ ...p, [q._id]: v }))} disabled={!!submittedId} />
              {la && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {la.gradingMethod === 'pending' ? <span>Grading...</span> : <span>Awarded: {la.awarded ?? 0} / {q.marks}{la.rationale ? ` — ${la.rationale}` : ''}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {!submittedId && <Button onClick={() => void handleSubmit()} className="w-full sm:w-auto">Submit</Button>}
      {submittedId && live.polling && <p className="text-sm text-muted-foreground">Auto-grading in progress...</p>}
      {submittedId && !live.polling && liveSub?.gradingStatus === 'graded' && (
        <p className="text-sm font-medium">Final mark: {liveSub.mark ?? '-'} / {liveSub.maxMarks}</p>
      )}
    </div>
  );
}
```

If `/curriculum/questions?ids=` doesn't exist, check the actual route in `QuestionBank/routes.ts` — likely `/question-bank/questions` with `?ids=...` query.

- [ ] **Step 3: Mount in student detail page**

Replace the `homework.type === 'exercise'` placeholder with `<ExerciseSubmissionForm homework={homework} submission={submission} onSubmit={submitHomework} />`.

- [ ] **Step 4: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l src/components/homework/ExerciseSubmissionForm.tsx src/components/homework/ExerciseQuestionRenderer.tsx
git add src/components/homework/ExerciseSubmissionForm.tsx src/components/homework/ExerciseQuestionRenderer.tsx "src/app/(dashboard)/student/homework/[id]/page.tsx"
git commit -m "feat(homework): ExerciseSubmissionForm + per-type renderers (10 question types)"
```

---

## Task 19: ReadingSubmissionForm + ResourceHomeworkViewer audit

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/homework/ReadingSubmissionForm.tsx`
- Modify: `c:/Users/shaun/campusly-frontend/src/components/homework/ResourceHomeworkViewer.tsx` (audit only — read-only resource render)
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/student/homework/[id]/page.tsx`

- [ ] **Step 1: Audit `ResourceHomeworkViewer.tsx`** — confirm it accepts a `contentResourceId` (or populated resource object) and renders the resource. If it currently embeds a submission textbox or anything write-y, move that UI out — the viewer should be read-only.

- [ ] **Step 2: ReadingSubmissionForm**

```tsx
'use client';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useHomeworkSubmission } from '@/hooks/useHomeworkSubmission';
import { ResourceHomeworkViewer } from './ResourceHomeworkViewer';
import { ExerciseQuestionRenderer } from './ExerciseQuestionRenderer';
import type { Homework, ReadingSubmission, SubmitHomeworkPayload, StructuredHomeworkSubmission } from '@/types/homework';
import type { Question } from '@/types';

interface Props {
  homework: Homework & { contentResourceId?: string; comprehensionQuestionIds?: string[] };
  submission: StructuredHomeworkSubmission | null;
  onSubmit: (payload: SubmitHomeworkPayload) => Promise<StructuredHomeworkSubmission | null>;
}

export function ReadingSubmissionForm({ homework, submission, onSubmit }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(submission?._id ?? null);
  const live = useHomeworkSubmission(submittedId);

  useEffect(() => {
    const ids = homework.comprehensionQuestionIds ?? [];
    if (ids.length === 0) { setLoading(false); return; }
    apiClient.get('/curriculum/questions', { params: { ids: ids.join(',') } })
      .then((res) => setQuestions(unwrapList<Question>(res)))
      .catch((err: unknown) => console.error('Failed to load comprehension questions', err))
      .finally(() => setLoading(false));
  }, [homework.comprehensionQuestionIds]);

  const handleSubmit = async () => {
    const payload: SubmitHomeworkPayload = {
      type: 'reading',
      markedReadAt: new Date().toISOString(),
      comprehensionAnswers: questions.map((q) => ({ questionId: q._id, studentAnswer: answers[q._id] ?? '' })),
    };
    const result = await onSubmit(payload);
    if (result) setSubmittedId(result._id);
  };

  if (loading) return <LoadingSpinner />;

  const liveSub = live.submission as ReadingSubmission | null;
  const liveAnswerMap = new Map(liveSub?.comprehensionAnswers.map((a) => [a.questionId, a]) ?? []);

  return (
    <div className="space-y-4">
      {homework.contentResourceId && <ResourceHomeworkViewer resourceId={homework.contentResourceId} />}

      <h3 className="text-sm font-semibold">Comprehension questions</h3>
      {questions.map((q, i) => {
        const la = liveAnswerMap.get(q._id);
        return (
          <Card key={q._id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">Q{i + 1}. {q.stem}</p>
                <span className="text-xs text-muted-foreground shrink-0">{q.marks} marks</span>
              </div>
              <ExerciseQuestionRenderer question={q} value={answers[q._id] ?? ''} onChange={(v) => setAnswers((p) => ({ ...p, [q._id]: v }))} disabled={!!submittedId} />
              {la && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {la.gradingMethod === 'pending' ? <span>Grading...</span> : <span>Awarded: {la.awarded ?? 0} / {q.marks}{la.rationale ? ` — ${la.rationale}` : ''}</span>}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!submittedId && <Button onClick={() => void handleSubmit()} className="w-full sm:w-auto">Mark read & Submit</Button>}
      {submittedId && live.polling && <p className="text-sm text-muted-foreground">Auto-grading in progress...</p>}
      {submittedId && !live.polling && liveSub?.gradingStatus === 'graded' && (
        <p className="text-sm font-medium">Final mark: {liveSub.mark ?? '-'} / {liveSub.maxMarks}</p>
      )}
    </div>
  );
}
```

If `ResourceHomeworkViewer` doesn't accept a `resourceId` prop, adjust to whatever interface the existing component exposes (read it first).

- [ ] **Step 3: Mount in student detail page** — replace `homework.type === 'reading'` placeholder.

- [ ] **Step 4: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l src/components/homework/ReadingSubmissionForm.tsx src/components/homework/ResourceHomeworkViewer.tsx
git add src/components/homework/ReadingSubmissionForm.tsx src/components/homework/ResourceHomeworkViewer.tsx "src/app/(dashboard)/student/homework/[id]/page.tsx"
git commit -m "feat(homework): ReadingSubmissionForm — resource viewer + comprehension Qs + structured submit"
```

---

## Task 20: Student dashboard widget integration

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/student/page.tsx`

- [ ] **Step 1: Read current student dashboard page**

It currently uses `useStudentDashboard` and shows a "Homework Due" `<StatCard>` with `pendingHomework.length`. Now extend this to use the new `useStudentHomeworkDashboard` hook to show three counts:

```tsx
import { useStudentHomeworkDashboard } from '@/hooks/useStudentHomeworkDashboard';
// inside the component:
const { counts: hwCounts } = useStudentHomeworkDashboard();
```

Replace the existing single Homework Due StatCard with three (or roll into the existing one with sub-counts):

```tsx
<StatCard title="Homework Due This Week" value={String(hwCounts?.dueThisWeek ?? 0)} icon={BookOpen} description="Pending submissions" />
<StatCard title="Overdue" value={String(hwCounts?.overdue ?? 0)} icon={AlertTriangle} description="Late, not yet submitted" />
<StatCard title="Awaiting Grading" value={String(hwCounts?.awaitingGrading ?? 0)} icon={Clock} description="AI grading in progress" />
```

If the existing `pendingHomework` derivation can be removed (now covered by hwCounts), do so to keep the page tidy.

- [ ] **Step 2: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l "src/app/(dashboard)/student/page.tsx"
git add "src/app/(dashboard)/student/page.tsx"
git commit -m "feat(homework): student dashboard widget — due this week / overdue / awaiting grading counts"
```

---

## Task 21: Parent detail page + parent list extension + parent dashboard

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/parent/homework/[id]/page.tsx`
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/parent/homework/page.tsx`
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/parent/page.tsx` (dashboard widgets)

- [ ] **Step 1: Parent detail page (read-only)**

Mirrors student detail orchestrator but read-only. Add a `mode='readonly'` prop to QuizSubmissionForm/ExerciseSubmissionForm/ReadingSubmissionForm — when true, hide submit button and disable inputs. The components already use `disabled={!!submittedId}` — extend to `disabled={readonly || !!submittedId}`.

For Module 4 v1, simpler approach: build a `ReadOnlySubmissionView` component (≤200 lines) that takes `submission: StructuredHomeworkSubmission` and renders all answers + per-question marks + AI rationale, no inputs. Avoids touching the student forms.

```tsx
'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
// + similar boilerplate to student detail
import { ReadOnlySubmissionView } from '@/components/homework/ReadOnlySubmissionView';
import { useParentHomeworkChild } from '@/hooks/useParentHomeworkChild'; // see below

export default function ParentHomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;
  const { homework, submission, loading } = useParentHomeworkChild(homeworkId);
  // ... render homework metadata + ReadOnlySubmissionView
}
```

Create `useParentHomeworkChild(homeworkId)` hook that fetches the homework + the linked child's submission via existing routes. For v1 simplicity: parent picks a child from a Select if multiple are linked.

- [ ] **Step 2: ReadOnlySubmissionView component** — covers all 3 submission variants. Iterates answers, renders question text + student answer + awarded mark + AI rationale (collapsible). Shows `lateMarkAdjustment` audit trail at bottom.

- [ ] **Step 3: Extend `/parent/homework/page.tsx`** (currently 99 lines) — add child filter Select if multiple children, status filter, subject filter. Each row links to `/parent/homework/[id]?studentId=...`.

- [ ] **Step 4: Extend `/parent/page.tsx`** — use `useParentHomeworkSummary()` to render per-child cards with pending/overdue/awaiting counts.

- [ ] **Step 5: Verify + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l "src/app/(dashboard)/parent/homework/[id]/page.tsx" "src/app/(dashboard)/parent/homework/page.tsx" "src/app/(dashboard)/parent/page.tsx" src/components/homework/ReadOnlySubmissionView.tsx
git add "src/app/(dashboard)/parent" src/components/homework/ReadOnlySubmissionView.tsx
git commit -m "feat(homework): parent detail (read-only) + parent list filters + parent dashboard widgets"
```

---

## Task 22: SoC sweep + size sweep + acceptance smoke

**Files:** the whole homework + Homework module surface.

- [ ] **Step 1: SoC + standards grep**

```bash
cd c:/Users/shaun/campusly-frontend
echo "=== apiClient leaks in components/pages ==="
grep -rn "apiClient" "src/app/(dashboard)/teacher/homework" "src/app/(dashboard)/student/homework" "src/app/(dashboard)/parent/homework" "src/components/homework" 2>/dev/null
echo "=== : any / as any ==="
grep -rnE ": any\b|as any\b" "src/app/(dashboard)/teacher/homework" "src/app/(dashboard)/student/homework" "src/app/(dashboard)/parent/homework" "src/components/homework" 2>/dev/null
echo "=== text-red / bg-red ==="
grep -rnE "text-red-|bg-red-" "src/app/(dashboard)/teacher/homework" "src/app/(dashboard)/student/homework" "src/app/(dashboard)/parent/homework" "src/components/homework" 2>/dev/null
echo "=== free-text Textarea in student homework (should be ZERO outside ExerciseQuestionRenderer for essay/case_study/etc.) ==="
grep -rn "<Textarea" "src/app/(dashboard)/student/homework" 2>/dev/null
echo "=== catch (err) without unknown ==="
grep -rnE "catch \(err\)|catch\(err\)" "src/app/(dashboard)/teacher/homework" "src/app/(dashboard)/student/homework" "src/app/(dashboard)/parent/homework" "src/components/homework" 2>/dev/null
```

All zero (except the ExerciseQuestionRenderer textareas, which are structured by question type).

- [ ] **Step 2: File size sweep**

```bash
cd c:/Users/shaun/campusly-frontend
find "src/app/(dashboard)/teacher/homework" "src/app/(dashboard)/student/homework" "src/app/(dashboard)/parent/homework" "src/components/homework" -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -nr | head -20

cd c:/Users/shaun/campusly-backend
find src/modules/Homework -name "*.ts" -not -name "*.test.ts" | xargs wc -l | sort -nr | head -10
```

All under 350.

- [ ] **Step 3: Final compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

Both clean (zero output = success).

- [ ] **Step 4: End-to-end smoke (Docker + dev servers up)**

```bash
docker start campusly-mongo campusly-redis 2>/dev/null
cd c:/Users/shaun/campusly-backend && npm run dev &
cd c:/Users/shaun/campusly-frontend && npm run dev &
```

Walk through:
1. Login as `superadmin@campusly.co.za / Password1` at `http://localhost:3500/login`.
2. Go to `/teacher/homework/new`, complete the wizard for a **Quiz** homework. Confirm the homework appears at `/teacher/homework`.
3. Repeat for **Reading** (verify comprehension Qs are AI-generated).
4. Repeat for **Exercise** (verify QuestionBankPicker works).
5. Logout, login as a student. Visit `/student` — verify dashboard shows three counts.
6. Open a quiz homework, answer it, submit. Verify deterministic Qs grade instantly, AI Qs show "Grading..." then resolve.
7. Verify the submission appears at `/teacher/homework/[id]` for the teacher with correct mark + rationale.
8. Login as a parent. Verify `/parent` shows child cards with counts. Click into a homework — verify read-only view.
9. Edit a homework's title as the teacher; verify the marking detail shows "stale" badge.
10. Test late policies: assign a homework with `block` and `dueDate` in the past, attempt to submit as student → 400. Reassign with `penalty=50` → submit late, mark gets halved.

If any step fails: file as Module 4 follow-up.

- [ ] **Step 5: Commit if any sweep fixes were required**

```bash
git add -u && git commit -m "fix(homework): module 4 sweep follow-ups" || echo "nothing to commit"
```

---

## Self-review (controller-only — completed)

**Spec coverage:** Verified each spec section maps to one or more tasks.
- §4.1 Homework fields → Task 1
- §4.2 HomeworkSubmission discriminator → Task 2
- §4.3 Comprehension Qs in QuestionBank → Task 7
- §5.1 Grading service → Tasks 4, 5, 6
- §5.2 Comprehension service → Task 7
- §5.3 Gradebook bridge → Task 8
- §5.4 service.ts updates → Task 9
- §6 Routes → Task 10
- §7.1 Wizard → Tasks 12, 13, 14
- §7.2 Teacher list → Task 15
- §7.3 Teacher detail → Task 16
- §8.1 Student detail forms → Tasks 17, 18, 19
- §8.2 Submission status hook → Task 11
- §8.3 Student dashboard → Task 20
- §9 Parent surface → Task 21
- §10 Auto-grading flow → Tasks 6 + 9 (orchestrate)
- §11 Late penalty → Task 4 (helper) + Task 9 (apply at submit)
- §12 Edge cases → distributed across tasks 4, 6, 7, 9
- §14 Acceptance criteria → Task 22 smoke test

**Type consistency:** `gradingMethod` (per-answer) and `gradedBy` (per-submission) deliberately distinct names. `StructuredHomeworkSubmission` consistent across hooks and components. Backend `IHomeworkSubmissionBase` and frontend `HomeworkSubmissionBase` shape mirror each other.

**Placeholder scan:** No "TBD", "TODO", or "implement later" markers in plan code blocks. The wizard `gradeId`/`curriculumNodeId` derivation in Task 13 is flagged with a clear fallback (require teacher to pick a topic in Step 1) — not a placeholder, an explicit decision.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-09-module-4-homework.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, two-stage review between tasks, fast iteration in this session.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch with checkpoints.

**Which approach?**


