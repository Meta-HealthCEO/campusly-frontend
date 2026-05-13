# Module 5 — Lesson Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disconnected AI Studio with a unified Lesson Workspace where a Lesson owns typed material refs (reading, worksheet, activity, notes, worked_example, quiz, practice_questions, homework, paper) across 5 fixed pedagogical phases, with AI scaffolding on creation, per-material generation thereafter, and Teacher Pack / Student Pack PDF export.

**Architecture:** Rename `LessonPlan` → `Lesson`. Extend the model with a discriminated `materials[]` subdoc array and a `phases[]` ordering array. Three new backend services (`service-lesson.ts`, `service-lesson-scaffold.ts`, `service-lesson-export.ts`) plus a one-shot, idempotent boot-time migration. Frontend gets a list page (`/teacher/lessons`), 3-step creation flow (`/teacher/lessons/new`), workspace orchestrator (`/teacher/lessons/[id]`), and 9 type-specific drawers that wrap existing module wizards inline. AI Studio rebrands to `/teacher/quick-make`.

**Tech Stack:** Backend — Express 5, Mongoose 9, Zod v4 (`zod/v4`), Anthropic SDK via `AIService`, PDFKit. Frontend — Next.js 16, React 19, Zustand, React Hook Form + Zod v4, Axios, dnd-kit, Sonner, base-ui (NOT Radix).

**Spec:** `docs/superpowers/specs/2026-05-10-module-5-lesson-workspace-design.md`

**Conventions (read before starting any task):**
- All work commits directly to `master` — no feature branches.
- Max 350 lines per file. Hard cap.
- Zero `any` types. `catch (err: unknown)` always.
- No `apiClient` imports in components/pages — hooks only.
- No `text-red-*` / `bg-red-*` — use `text-destructive` / `bg-destructive/10`.
- Mobile-first responsive: every grid/flex needs breakpoints.
- Zod imports from `'zod/v4'`. Use `z.iso.datetime()`, `z.url()`.
- Backend: every single-entity find filters by `schoolId`. Every aggregation `$match` casts `new mongoose.Types.ObjectId(id)`. Every soft-deleted model query filters `isDeleted: false`. No transactions — use compensation flow with `logger.error` on rollback failures.
- `AIService` (`src/services/ai.service.ts`) provides `generateCompletion`, `generateJSON<T>`, with built-in retry. Reuse it.
- PDF rendering uses PDFKit programmatically — never HTML-to-PDF.
- DialogTrigger uses `render={<Button />}` (base-ui), NOT `asChild`.

---

## Reference: existing surface (do not re-explore)

**Backend (`c:/Users/shaun/campusly-backend`):**
- `src/modules/LessonPlan/` — entire dir to be renamed/replaced (`model.ts`, `service.ts`, `controller.ts`, `routes.ts`, `validation.ts`, `service-ai.ts`, `service-compensation.ts`, `pdf-generator.ts`)
- `src/modules/Homework/service.ts` — `HomeworkService.create(data, teacherId): Promise<IHomework>` (Module 4)
- `src/modules/Homework/service-homework-comprehension.ts:44–113` — `generateComprehensionQuestions(contentResourceId, schoolId, teacherId, subjectId, gradeId, curriculumNodeId, count=4): Promise<ObjectId[]>` — to be EXTENDED with `generateComprehensionFromTextbook`
- `src/modules/QuestionBank/service-questions.ts` — `QuestionService.createQuestion`, `generateQuestions(...)`
- `src/modules/QuestionBank/service-papers.ts` — `generatePaperWithAI`
- `src/modules/QuestionBank/service-pdf.ts:20–28` — `PdfService.generatePaperPdf(paperId, schoolId): Promise<Buffer>` (reusable for paper rendering inside lesson export)
- `src/modules/ContentLibrary/service-generation.ts:18–80` — `GenerationService.generateContent(schoolId, userId, data): Promise<IContentResource>`
- `src/modules/Learning/model.ts:27–107` — `Quiz` model (link-existing only in v1)
- `src/modules/Textbook/model.ts:1–103` — `ITextbook` + `IChapter` subdocs (`_id, title, curriculumNodeId, order, resources[]`)
- `src/modules/CurriculumStructure/model.ts:31–95` — `CurriculumNode` (`title, code, type, parentId, frameworkId, metadata.notionalHours, metadata.cognitiveWeighting`)
- `src/services/ai.service.ts:109–135` — `AIService.generateJSON<T>(systemPrompt, userPrompt): Promise<T>`
- `src/middleware/auth.ts:23–50` — `authenticate` populates `req.user: { id, schoolId, isHOD, isSchoolPrincipal, ... }`
- `src/app.ts:42` — module mount point; lesson-plans currently mounted at `/api/lesson-plans`
- `src/index.ts` — server entry, post-MongoDB-connect hook for boot-time migration

**Frontend (`c:/Users/shaun/campusly-frontend`):**
- `src/app/(dashboard)/teacher/lesson-plans/page.tsx` + `[id]/page.tsx` — to be redirected to `/teacher/lessons`
- `src/hooks/useTeacherLessonPlans.ts` — hits `/lesson-plans/*`; will be retired
- `src/types/lesson-plans.ts` — old types; retire after migration
- `src/app/(dashboard)/teacher/curriculum/ai-studio/page.tsx` (1683 lines) — to be relocated to `/teacher/quick-make` with edits
- `src/lib/constants.ts:219–225` — `ROUTES` definitions (add `TEACHER_LESSONS`, `TEACHER_QUICK_MAKE`)
- `src/lib/constants.ts:~456` — `NAV_BY_ROLE['teacher']` array (rename "AI Studio" → "Quick Make", add "Lessons" entry)
- `src/components/curriculum/CurriculumTreeBrowser.tsx` — props: `frameworkId, onSelect, selectedNodeId?`
- `src/components/shared/DataTable.tsx`, `EmptyState.tsx`, `LoadingSpinner.tsx`
- `src/components/ui/sheet.tsx` — base-ui side drawer (`Sheet`, `SheetContent`, `SheetTrigger`, side: top|right|bottom|left)
- `src/lib/api-client.ts` — Axios instance with interceptors
- `src/lib/api-helpers.ts` — `unwrapResponse<T>`, `unwrapList<T>`
- `src/stores/useAuthStore.ts` — `User` shape includes `schoolId, isHOD, role`
- `package.json` — `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` already installed

---

## Task overview

| # | Task | Repo |
|---|---|---|
| 1 | Lesson model: rename + extend with materials/phases/status + indexes | backend |
| 2 | Migration sentinel infra + LessonPlan→Lesson migration + boot trigger | backend |
| 3 | Validation schemas (Zod v4): create, update, scaffold, addMaterial, moveMaterial | backend |
| 4 | service-lesson.ts: list, getById, create, update, patchStatus, delete | backend |
| 5 | service-lesson.ts material ops: add, update, move, delete, regenerate (compensating) | backend |
| 6 | service-lesson-scaffold.ts: AI outline (no DB writes) | backend |
| 7 | Extend service-homework-comprehension.ts with TextbookRef-based generator | backend |
| 8 | service-lesson-export.ts: Teacher Pack + Student Pack PDFs | backend |
| 9 | controller.ts + routes.ts: 13 endpoints, auth + tenant filter | backend |
| 10 | app.ts mount + lesson-plans 308 redirect + boot migration call | backend |
| 11 | Frontend types (`src/types/lesson.ts`) + barrel update | frontend |
| 12 | Hooks: useLessons, useLesson, useLessonScaffold, useLessonExport + workspace store | frontend |
| 13 | List page + LessonListFilters + LessonListTable + LessonCalendar | frontend |
| 14 | Creation flow `/teacher/lessons/new` (3 steps) + LessonScaffoldPreview | frontend |
| 15 | Workspace `/teacher/lessons/[id]` orchestrator + LessonOutline + LessonStatusPill | frontend |
| 16 | LessonPhaseSection + LessonMaterialCard + dnd-kit reorder | frontend |
| 17 | MaterialDrawerShell + MaterialTypePicker | frontend |
| 18 | ReadingDrawer + TextbookSourcePicker | frontend |
| 19 | WorksheetDrawer + ActivityDrawer + NotesDrawer + WorkedExampleDrawer (shared base) | frontend |
| 20 | PracticeQuestionsDrawer | frontend |
| 21 | QuizDrawer + HomeworkDrawer + PaperDrawer | frontend |
| 22 | Quick Make rebrand: route move + page edits + nav + 308 redirect | frontend |
| 23 | Lesson-plans → lessons 308 redirect + retire old hook/types | frontend |
| 24 | SoC sweep + size sweep + acceptance smoke | both |

---

## Task 1: Lesson model — rename + extend schema

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/model.ts`
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/types.ts`
- Keep (read-only for migration): `c:/Users/shaun/campusly-backend/src/modules/LessonPlan/model.ts`

- [ ] **Step 1: Create `src/modules/Lesson/types.ts` with the full discriminated union**

```ts
import type { Document, Types } from 'mongoose';

export type LessonStatus = 'draft' | 'ready' | 'taught';
export type LessonPhase = 'introduction' | 'direct_instruction' | 'practice' | 'assessment' | 'homework';
export const LESSON_PHASES: LessonPhase[] = ['introduction', 'direct_instruction', 'practice', 'assessment', 'homework'];
export type LessonMaterialKind =
  | 'reading' | 'worksheet' | 'activity' | 'notes' | 'worked_example'
  | 'quiz' | 'practice_questions' | 'homework' | 'paper';

export interface InternalTextbookRef {
  source: 'internal';
  textbookId: Types.ObjectId;
  chapterId?: Types.ObjectId;
  pageStart?: number;
  pageEnd?: number;
  notes?: string;
}
export interface ExternalTextbookRef {
  source: 'external';
  title: string;
  publisher?: string;
  isbn?: string;
  pageStart?: number;
  pageEnd?: number;
  excerpt?: string;
  notes?: string;
}
export type TextbookRef = InternalTextbookRef | ExternalTextbookRef;

export interface ILessonMaterialBase {
  _id: Types.ObjectId;
  kind: LessonMaterialKind;
  title: string;
  teacherNotes?: string;
  generatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export interface IReadingMaterial extends ILessonMaterialBase { kind: 'reading'; textbookRef: TextbookRef; comprehensionQuestionIds?: Types.ObjectId[]; }
export interface IWorksheetMaterial extends ILessonMaterialBase { kind: 'worksheet'; contentResourceId: Types.ObjectId; }
export interface IActivityMaterial extends ILessonMaterialBase { kind: 'activity'; contentResourceId: Types.ObjectId; }
export interface INotesMaterial extends ILessonMaterialBase { kind: 'notes'; contentResourceId?: Types.ObjectId; }
export interface IWorkedExampleMaterial extends ILessonMaterialBase { kind: 'worked_example'; contentResourceId: Types.ObjectId; }
export interface IQuizMaterial extends ILessonMaterialBase { kind: 'quiz'; quizId: Types.ObjectId; }
export interface IPracticeQuestionsMaterial extends ILessonMaterialBase { kind: 'practice_questions'; questionIds: Types.ObjectId[]; }
export interface IHomeworkMaterial extends ILessonMaterialBase { kind: 'homework'; homeworkId: Types.ObjectId; }
export interface IPaperMaterial extends ILessonMaterialBase { kind: 'paper'; paperId: Types.ObjectId; }
export type ILessonMaterial =
  | IReadingMaterial | IWorksheetMaterial | IActivityMaterial | INotesMaterial | IWorkedExampleMaterial
  | IQuizMaterial | IPracticeQuestionsMaterial | IHomeworkMaterial | IPaperMaterial;

export interface ILessonPhaseEntry { phase: LessonPhase; materialIds: Types.ObjectId[]; }

export interface ILesson extends Document {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  classId: Types.ObjectId;
  subjectId: Types.ObjectId;
  gradeId: Types.ObjectId;
  curriculumNodeId: Types.ObjectId;
  title: string;
  date: Date;
  durationMinutes: number;
  objectives: string[];
  phases: ILessonPhaseEntry[];
  materials: ILessonMaterial[];
  status: LessonStatus;
  reflectionNotes?: string;
  aiGenerated: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create `src/modules/Lesson/model.ts` with the schema**

```ts
import mongoose, { Schema } from 'mongoose';
import type { ILesson } from './types';
import { LESSON_PHASES } from './types';

const textbookRefSchema = new Schema({
  source: { type: String, enum: ['internal', 'external'], required: true },
  textbookId: { type: Schema.Types.ObjectId, ref: 'Textbook' },
  chapterId: { type: Schema.Types.ObjectId },
  title: String,
  publisher: String,
  isbn: String,
  pageStart: Number,
  pageEnd: Number,
  excerpt: { type: String, maxlength: 8000 },
  notes: String,
}, { _id: false });

const materialSchema = new Schema({
  kind: {
    type: String,
    enum: ['reading','worksheet','activity','notes','worked_example','quiz','practice_questions','homework','paper'],
    required: true,
  },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  teacherNotes: { type: String, maxlength: 2000 },
  generatedAt: Date,
  textbookRef: textbookRefSchema,
  comprehensionQuestionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  contentResourceId: { type: Schema.Types.ObjectId, ref: 'ContentResource' },
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz' },
  questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  homeworkId: { type: Schema.Types.ObjectId, ref: 'Homework' },
  paperId: { type: Schema.Types.ObjectId, ref: 'AssessmentPaper' },
}, { timestamps: true });

const phaseEntrySchema = new Schema({
  phase: { type: String, enum: LESSON_PHASES, required: true },
  materialIds: [{ type: Schema.Types.ObjectId }],
}, { _id: false });

const lessonSchema = new Schema<ILesson>({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
  curriculumNodeId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  date: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, min: 5, max: 480 },
  objectives: [{ type: String, trim: true, maxlength: 500 }],
  phases: { type: [phaseEntrySchema], default: () => LESSON_PHASES.map(p => ({ phase: p, materialIds: [] })) },
  materials: { type: [materialSchema], default: [] },
  status: { type: String, enum: ['draft','ready','taught'], default: 'draft', required: true },
  reflectionNotes: { type: String, maxlength: 4000 },
  aiGenerated: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

lessonSchema.index({ teacherId: 1, date: 1 });
lessonSchema.index({ schoolId: 1, classId: 1, date: 1 });
lessonSchema.index({ curriculumNodeId: 1 });
lessonSchema.index({ schoolId: 1, status: 1, date: 1 });
lessonSchema.index({ teacherId: 1, status: 1 });

export const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);
```

- [ ] **Step 3: Type-check**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/Lesson/types.ts src/modules/Lesson/model.ts
git commit -m "feat(lesson): add Lesson model with discriminated materials + phases"
```

---

## Task 2: Migration sentinel infra + LessonPlan→Lesson migration

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/db/migrations/sentinel.ts`
- Create: `c:/Users/shaun/campusly-backend/src/db/migrations/index.ts`
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/service-lesson-migration.ts`

- [ ] **Step 1: Sentinel collection helper**

Write `src/db/migrations/sentinel.ts`:

```ts
import mongoose, { Schema } from 'mongoose';

const sentinelSchema = new Schema({
  name: { type: String, unique: true, required: true },
  completedAt: { type: Date, required: true },
}, { collection: 'migrations' });

export const MigrationSentinel = mongoose.models.MigrationSentinel
  || mongoose.model('MigrationSentinel', sentinelSchema);

export async function hasRun(name: string): Promise<boolean> {
  const doc = await MigrationSentinel.findOne({ name }).lean();
  return !!doc;
}

export async function markComplete(name: string): Promise<void> {
  await MigrationSentinel.updateOne(
    { name },
    { $set: { name, completedAt: new Date() } },
    { upsert: true },
  );
}
```

- [ ] **Step 2: Migration runner index**

Write `src/db/migrations/index.ts`:

```ts
import { runLessonPlanToLessonMigration } from '../../modules/Lesson/service-lesson-migration';
import { logger } from '../../utils/logger';

export async function runMigrations(): Promise<void> {
  try {
    await runLessonPlanToLessonMigration();
  } catch (err: unknown) {
    logger.error('[migrations] failed', err);
    throw err;
  }
}
```

(If `utils/logger` does not exist, replace with `console`.)

- [ ] **Step 3: LessonPlan → Lesson migration service**

Write `src/modules/Lesson/service-lesson-migration.ts`:

```ts
import mongoose from 'mongoose';
import { Lesson } from './model';
import { LESSON_PHASES } from './types';
import { LessonPlan } from '../LessonPlan/model';
import { hasRun, markComplete } from '../../db/migrations/sentinel';

const MIGRATION_NAME = 'lesson-plan-to-lesson';

export async function runLessonPlanToLessonMigration(): Promise<void> {
  if (await hasRun(MIGRATION_NAME)) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const plans = await LessonPlan.find({ isDeleted: { $ne: true } }).lean();
  if (plans.length === 0) {
    await markComplete(MIGRATION_NAME);
    return;
  }

  const lessonDocs = plans.map((plan) => {
    const phases = LESSON_PHASES.map((phase) => ({ phase, materialIds: [] as mongoose.Types.ObjectId[] }));
    const materials: Record<string, unknown>[] = [];
    const directIdx = phases.findIndex(p => p.phase === 'direct_instruction');
    const practiceIdx = phases.findIndex(p => p.phase === 'practice');
    const homeworkIdx = phases.findIndex(p => p.phase === 'homework');

    for (const text of (plan.resources ?? []).filter((s: string) => s?.trim())) {
      const id = new mongoose.Types.ObjectId();
      materials.push({ _id: id, kind: 'notes', title: 'Resource', teacherNotes: text, createdAt: plan.createdAt, updatedAt: plan.updatedAt });
      phases[directIdx].materialIds.push(id);
    }
    for (const text of (plan.activities ?? []).filter((s: string) => s?.trim())) {
      const id = new mongoose.Types.ObjectId();
      materials.push({ _id: id, kind: 'notes', title: 'Activity', teacherNotes: text, createdAt: plan.createdAt, updatedAt: plan.updatedAt });
      phases[practiceIdx].materialIds.push(id);
    }
    for (const hwId of (plan.homeworkIds ?? [])) {
      const id = new mongoose.Types.ObjectId();
      materials.push({ _id: id, kind: 'homework', title: 'Homework', homeworkId: hwId, createdAt: plan.createdAt, updatedAt: plan.updatedAt });
      phases[homeworkIdx].materialIds.push(id);
    }

    const lessonDate = new Date(plan.date);
    return {
      _id: plan._id,
      schoolId: plan.schoolId,
      teacherId: plan.teacherId,
      classId: plan.classId,
      subjectId: plan.subjectId,
      gradeId: plan.subjectId, // best-effort fallback; will be patched by teacher on next edit
      curriculumNodeId: plan.curriculumTopicId,
      title: plan.topic,
      date: lessonDate,
      durationMinutes: plan.durationMinutes ?? 45,
      objectives: plan.objectives ?? [],
      phases,
      materials,
      status: lessonDate >= today ? 'draft' : 'taught',
      reflectionNotes: plan.reflectionNotes,
      aiGenerated: plan.aiGenerated ?? false,
      isDeleted: false,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  });

  if (lessonDocs.length > 0) {
    await Lesson.insertMany(lessonDocs, { ordered: false });
    await LessonPlan.updateMany(
      { _id: { $in: plans.map(p => p._id) } },
      { $set: { isDeleted: true } },
    );
  }

  await markComplete(MIGRATION_NAME);
}
```

> **Note on `gradeId`:** The legacy `LessonPlan` does not store `gradeId` directly. The migration uses `subjectId` as a best-effort placeholder so the new model's required field is satisfied; teachers patch it on first edit. If the deployment has a reliable subject→grade lookup, replace this fallback before running in production.

- [ ] **Step 4: Type-check**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/migrations/ src/modules/Lesson/service-lesson-migration.ts
git commit -m "feat(lesson): boot-time idempotent migration LessonPlan -> Lesson"
```

---

## Task 3: Validation schemas (Zod v4)

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/validation.ts`

- [ ] **Step 1: Write all schemas**

```ts
import { z } from 'zod/v4';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
const trimmedString = (max: number) => z.string().trim().min(1).max(max);

export const lessonPhaseEnum = z.enum(['introduction','direct_instruction','practice','assessment','homework']);
export const lessonMaterialKindEnum = z.enum(['reading','worksheet','activity','notes','worked_example','quiz','practice_questions','homework','paper']);
export const lessonStatusEnum = z.enum(['draft','ready','taught']);

const internalTextbookRef = z.object({
  source: z.literal('internal'),
  textbookId: objectId,
  chapterId: objectId.optional(),
  pageStart: z.number().int().min(1).optional(),
  pageEnd: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional(),
});
const externalTextbookRef = z.object({
  source: z.literal('external'),
  title: trimmedString(200),
  publisher: z.string().max(200).optional(),
  isbn: z.string().max(20).optional(),
  pageStart: z.number().int().min(1).optional(),
  pageEnd: z.number().int().min(1).optional(),
  excerpt: z.string().max(8000).optional(),
  notes: z.string().max(500).optional(),
});
export const textbookRefSchema = z.discriminatedUnion('source', [internalTextbookRef, externalTextbookRef]);

const scaffoldSuggestion = z.object({
  kind: lessonMaterialKindEnum,
  title: trimmedString(200),
  notes: z.string().max(500).optional(),
});
export const scaffoldedOutlineSchema = z.object({
  objectives: z.array(trimmedString(500)).min(1).max(5),
  phases: z.array(z.object({
    phase: lessonPhaseEnum,
    suggestions: z.array(scaffoldSuggestion).max(5),
  })).length(5),
});

export const createLessonSchema = z.object({
  classId: objectId,
  subjectId: objectId,
  gradeId: objectId,
  curriculumNodeId: objectId,
  title: trimmedString(200),
  date: z.iso.datetime(),
  durationMinutes: z.number().int().min(5).max(480),
  objectives: z.array(trimmedString(500)).max(10).optional(),
  scaffoldedOutline: scaffoldedOutlineSchema.optional(),
});

export const updateLessonSchema = z.object({
  title: trimmedString(200).optional(),
  date: z.iso.datetime().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  objectives: z.array(trimmedString(500)).max(10).optional(),
  reflectionNotes: z.string().max(4000).optional(),
});

export const patchStatusSchema = z.object({ status: lessonStatusEnum });

export const scaffoldLessonSchema = z.object({
  curriculumNodeId: objectId,
  classId: objectId,
  subjectId: objectId,
  gradeId: objectId,
  durationMinutes: z.number().int().min(5).max(480),
  hints: z.string().max(1000).optional(),
});

const baseAddMaterial = z.object({
  phase: lessonPhaseEnum,
  title: trimmedString(200),
  teacherNotes: z.string().max(2000).optional(),
});
export const addReadingMaterialSchema = baseAddMaterial.extend({
  kind: z.literal('reading'),
  textbookRef: textbookRefSchema,
  generateComprehension: z.boolean().optional(),
  comprehensionCount: z.number().int().min(1).max(10).optional(),
});
export const addContentBackedMaterialSchema = baseAddMaterial.extend({
  kind: z.enum(['worksheet','activity','notes','worked_example']),
  contentPayload: z.object({
    type: z.string(),
    prompt: z.string().max(4000).optional(),
    difficulty: z.string().optional(),
  }).loose(),
});
export const addQuizMaterialSchema = baseAddMaterial.extend({
  kind: z.literal('quiz'),
  quizId: objectId,
});
export const addPracticeQuestionsSchema = baseAddMaterial.extend({
  kind: z.literal('practice_questions'),
  questionPayload: z.object({
    count: z.number().int().min(1).max(50),
    questionTypes: z.array(z.string()).optional(),
  }).loose(),
});
export const addHomeworkMaterialSchema = baseAddMaterial.extend({
  kind: z.literal('homework'),
  existingHomeworkId: objectId.optional(),
  createPayload: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (v) => !!v.existingHomeworkId !== !!v.createPayload,
  { message: 'Provide exactly one of existingHomeworkId or createPayload' },
);
export const addPaperMaterialSchema = baseAddMaterial.extend({
  kind: z.literal('paper'),
  existingPaperId: objectId.optional(),
  createPayload: z.record(z.string(), z.unknown()).optional(),
}).refine(
  (v) => !!v.existingPaperId !== !!v.createPayload,
  { message: 'Provide exactly one of existingPaperId or createPayload' },
);
export const addMaterialSchema = z.discriminatedUnion('kind', [
  addReadingMaterialSchema,
  addContentBackedMaterialSchema,
  addQuizMaterialSchema,
  addPracticeQuestionsSchema,
  addHomeworkMaterialSchema,
  addPaperMaterialSchema,
]);

export const updateMaterialSchema = z.object({
  title: trimmedString(200).optional(),
  teacherNotes: z.string().max(2000).optional(),
});

export const moveMaterialSchema = z.object({
  toPhase: lessonPhaseEnum,
  toIndex: z.number().int().min(0),
});

export const listLessonsSchema = z.object({
  teacherId: objectId.optional(),
  classId: objectId.optional(),
  subjectId: objectId.optional(),
  status: lessonStatusEnum.optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type ScaffoldLessonInput = z.infer<typeof scaffoldLessonSchema>;
export type AddMaterialInput = z.infer<typeof addMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type MoveMaterialInput = z.infer<typeof moveMaterialSchema>;
export type ListLessonsInput = z.infer<typeof listLessonsSchema>;
export type ScaffoldedOutline = z.infer<typeof scaffoldedOutlineSchema>;
```

- [ ] **Step 2: Type-check**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/Lesson/validation.ts
git commit -m "feat(lesson): add Zod v4 validation schemas"
```

---

## Task 4: service-lesson.ts — CRUD + status transitions

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/service.ts`

- [ ] **Step 1: Write the service**

```ts
import mongoose from 'mongoose';
import { Lesson } from './model';
import type { ILesson, LessonStatus } from './types';
import { LESSON_PHASES } from './types';
import type { CreateLessonInput, UpdateLessonInput, ListLessonsInput } from './validation';

const ALLOWED_TRANSITIONS: Record<LessonStatus, LessonStatus[]> = {
  draft: ['ready', 'taught'],
  ready: ['draft', 'taught'],
  taught: ['ready'],
};

export class LessonService {
  static async list(schoolId: string, filters: ListLessonsInput): Promise<{ items: ILesson[]; total: number; page: number; limit: number }> {
    const query: Record<string, unknown> = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isDeleted: false,
    };
    if (filters.teacherId) query.teacherId = new mongoose.Types.ObjectId(filters.teacherId);
    if (filters.classId) query.classId = new mongoose.Types.ObjectId(filters.classId);
    if (filters.subjectId) query.subjectId = new mongoose.Types.ObjectId(filters.subjectId);
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      const range: Record<string, Date> = {};
      if (filters.dateFrom) range.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) range.$lte = new Date(filters.dateTo);
      query.date = range;
    }
    if (filters.search) query.title = { $regex: filters.search, $options: 'i' };

    const skip = (filters.page - 1) * filters.limit;
    const [items, total] = await Promise.all([
      Lesson.find(query).sort({ date: -1 }).skip(skip).limit(filters.limit)
        .populate('classId', 'name')
        .populate('subjectId', 'name code')
        .populate('curriculumNodeId', 'title code')
        .lean<ILesson[]>(),
      Lesson.countDocuments(query),
    ]);
    return { items, total, page: filters.page, limit: filters.limit };
  }

  static async getById(id: string, schoolId: string): Promise<ILesson> {
    const lesson = await Lesson.findOne({
      _id: new mongoose.Types.ObjectId(id),
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isDeleted: false,
    })
      .populate('classId', 'name')
      .populate('subjectId', 'name code')
      .populate('gradeId', 'name level')
      .populate('curriculumNodeId', 'title code')
      .populate('teacherId', 'firstName lastName email')
      .populate('materials.contentResourceId')
      .populate('materials.homeworkId')
      .populate('materials.paperId')
      .populate('materials.quizId')
      .populate('materials.questionIds')
      .populate('materials.comprehensionQuestionIds')
      .populate('materials.textbookRef.textbookId', 'title')
      .lean<ILesson>();
    if (!lesson) throw new Error('Lesson not found');
    return lesson;
  }

  static async create(data: CreateLessonInput, teacherId: string, schoolId: string): Promise<ILesson> {
    const phases = LESSON_PHASES.map(p => ({ phase: p, materialIds: [] as mongoose.Types.ObjectId[] }));
    const materials: Record<string, unknown>[] = [];
    let aiGenerated = false;
    let objectives = data.objectives ?? [];

    if (data.scaffoldedOutline) {
      aiGenerated = true;
      objectives = data.scaffoldedOutline.objectives;
      for (const phaseEntry of data.scaffoldedOutline.phases) {
        const phaseIdx = phases.findIndex(p => p.phase === phaseEntry.phase);
        for (const sug of phaseEntry.suggestions) {
          const id = new mongoose.Types.ObjectId();
          materials.push({
            _id: id,
            kind: sug.kind,
            title: sug.title,
            teacherNotes: sug.notes,
          });
          phases[phaseIdx].materialIds.push(id);
        }
      }
    }

    const lesson = await Lesson.create({
      schoolId,
      teacherId,
      classId: data.classId,
      subjectId: data.subjectId,
      gradeId: data.gradeId,
      curriculumNodeId: data.curriculumNodeId,
      title: data.title,
      date: data.date,
      durationMinutes: data.durationMinutes,
      objectives,
      phases,
      materials,
      status: 'draft',
      aiGenerated,
    });
    return lesson.toObject();
  }

  static async update(id: string, schoolId: string, data: UpdateLessonInput): Promise<ILesson> {
    const updated = await Lesson.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true },
    ).lean<ILesson>();
    if (!updated) throw new Error('Lesson not found');
    return updated;
  }

  static async patchStatus(id: string, schoolId: string, newStatus: LessonStatus): Promise<ILesson> {
    const lesson = await Lesson.findOne({ _id: id, schoolId, isDeleted: false });
    if (!lesson) throw new Error('Lesson not found');
    if (!ALLOWED_TRANSITIONS[lesson.status].includes(newStatus)) {
      throw new Error(`Invalid status transition: ${lesson.status} -> ${newStatus}`);
    }
    lesson.status = newStatus;
    await lesson.save();
    return lesson.toObject();
  }

  static async delete(id: string, schoolId: string): Promise<void> {
    const result = await Lesson.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true } },
    );
    if (result.matchedCount === 0) throw new Error('Lesson not found');
  }
}
```

- [ ] **Step 2: Type-check + line count**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit && wc -l src/modules/Lesson/service.ts`
Expected: no errors; line count under 350.

- [ ] **Step 3: Commit**

```bash
git add src/modules/Lesson/service.ts
git commit -m "feat(lesson): CRUD service with status transition state machine"
```

---

## Task 5: service-lesson.ts material ops (separate file)

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/service-materials.ts`

- [ ] **Step 1: Write the material ops module**

```ts
import mongoose from 'mongoose';
import { Lesson } from './model';
import type { ILesson, ILessonMaterial, LessonPhase } from './types';
import type { AddMaterialInput, UpdateMaterialInput } from './validation';
import { GenerationService } from '../ContentLibrary/service-generation';
import { QuestionService } from '../QuestionBank/service-questions';
import { HomeworkService } from '../Homework/service';
import { generateComprehensionFromTextbook } from '../Homework/service-homework-comprehension';
import { ContentResource } from '../ContentLibrary/model';
import { Question } from '../QuestionBank/model';
import { Homework } from '../Homework/model';
import { logger } from '../../utils/logger';

interface MaterialContext {
  schoolId: string;
  teacherId: string;
  lesson: ILesson;
}

async function softDeleteEntity(kind: string, id: mongoose.Types.ObjectId | undefined): Promise<void> {
  if (!id) return;
  try {
    if (kind === 'worksheet' || kind === 'activity' || kind === 'notes' || kind === 'worked_example') {
      await ContentResource.updateOne({ _id: id }, { $set: { isDeleted: true } });
    } else if (kind === 'practice_questions') {
      await Question.updateOne({ _id: id }, { $set: { isDeleted: true } });
    } else if (kind === 'homework') {
      await Homework.updateOne({ _id: id }, { $set: { isDeleted: true } });
    }
  } catch (err: unknown) {
    logger.error('[lesson] compensation cleanup failed', { kind, id, err });
  }
}

export async function addMaterial(
  lessonId: string,
  schoolId: string,
  teacherId: string,
  input: AddMaterialInput,
): Promise<ILessonMaterial> {
  const lesson = await Lesson.findOne({ _id: lessonId, schoolId, isDeleted: false });
  if (!lesson) throw new Error('Lesson not found');

  const materialId = new mongoose.Types.ObjectId();
  const baseMaterial: Record<string, unknown> = {
    _id: materialId,
    kind: input.kind,
    title: input.title,
    teacherNotes: input.teacherNotes,
    generatedAt: new Date(),
  };

  let cleanupId: mongoose.Types.ObjectId | undefined;
  let cleanupKind: string = input.kind;

  try {
    if (input.kind === 'reading') {
      baseMaterial.textbookRef = input.textbookRef;
      if (input.generateComprehension) {
        const ids = await generateComprehensionFromTextbook(
          input.textbookRef,
          schoolId,
          teacherId,
          lesson.subjectId.toString(),
          lesson.gradeId.toString(),
          lesson.curriculumNodeId.toString(),
          input.comprehensionCount ?? 4,
        );
        baseMaterial.comprehensionQuestionIds = ids;
      }
    } else if (input.kind === 'worksheet' || input.kind === 'activity' || input.kind === 'notes' || input.kind === 'worked_example') {
      const resource = await GenerationService.generateContent(schoolId, teacherId, {
        ...input.contentPayload,
        subjectId: lesson.subjectId.toString(),
        gradeId: lesson.gradeId.toString(),
        curriculumNodeId: lesson.curriculumNodeId.toString(),
      });
      baseMaterial.contentResourceId = resource._id;
      cleanupId = resource._id as mongoose.Types.ObjectId;
    } else if (input.kind === 'quiz') {
      baseMaterial.quizId = new mongoose.Types.ObjectId(input.quizId);
    } else if (input.kind === 'practice_questions') {
      const ids = await QuestionService.generateQuestions({
        ...input.questionPayload,
        schoolId,
        teacherId,
        subjectId: lesson.subjectId.toString(),
        gradeId: lesson.gradeId.toString(),
        curriculumNodeId: lesson.curriculumNodeId.toString(),
      });
      baseMaterial.questionIds = ids;
    } else if (input.kind === 'homework') {
      let homeworkId: mongoose.Types.ObjectId;
      if (input.existingHomeworkId) {
        homeworkId = new mongoose.Types.ObjectId(input.existingHomeworkId);
      } else {
        const hw = await HomeworkService.create(
          { ...input.createPayload, schoolId, classId: lesson.classId.toString(), subjectId: lesson.subjectId.toString() } as never,
          teacherId,
        );
        homeworkId = hw._id as mongoose.Types.ObjectId;
        cleanupId = homeworkId;
      }
      baseMaterial.homeworkId = homeworkId;
    } else if (input.kind === 'paper') {
      let paperId: mongoose.Types.ObjectId;
      if (input.existingPaperId) {
        paperId = new mongoose.Types.ObjectId(input.existingPaperId);
      } else {
        const { generatePaperWithAI } = await import('../QuestionBank/service-papers');
        const paper = await generatePaperWithAI({ ...input.createPayload, schoolId, teacherId } as never);
        paperId = paper._id as mongoose.Types.ObjectId;
        cleanupId = paperId;
      }
      baseMaterial.paperId = paperId;
    }

    const updated = await Lesson.findOneAndUpdate(
      { _id: lessonId, schoolId, isDeleted: false },
      {
        $push: {
          materials: baseMaterial,
          [`phases.$[ph].materialIds`]: materialId,
        },
      },
      {
        new: true,
        arrayFilters: [{ 'ph.phase': input.phase }],
      },
    );
    if (!updated) throw new Error('Lesson update failed');
    const created = updated.materials.find((m) => m._id.toString() === materialId.toString());
    if (!created) throw new Error('Material write inconsistency');
    return created.toObject ? created.toObject() : (created as ILessonMaterial);
  } catch (err: unknown) {
    if (cleanupId) await softDeleteEntity(cleanupKind, cleanupId);
    throw err;
  }
}

export async function updateMaterial(
  lessonId: string,
  materialId: string,
  schoolId: string,
  patch: UpdateMaterialInput,
): Promise<ILessonMaterial> {
  const setOps: Record<string, unknown> = {};
  if (patch.title !== undefined) setOps['materials.$[m].title'] = patch.title;
  if (patch.teacherNotes !== undefined) setOps['materials.$[m].teacherNotes'] = patch.teacherNotes;
  const updated = await Lesson.findOneAndUpdate(
    { _id: lessonId, schoolId, isDeleted: false, 'materials._id': new mongoose.Types.ObjectId(materialId) },
    { $set: setOps },
    { new: true, arrayFilters: [{ 'm._id': new mongoose.Types.ObjectId(materialId) }] },
  );
  if (!updated) throw new Error('Material not found');
  const m = updated.materials.find((x) => x._id.toString() === materialId);
  if (!m) throw new Error('Material write inconsistency');
  return m.toObject ? m.toObject() : (m as ILessonMaterial);
}

export async function moveMaterial(
  lessonId: string,
  materialId: string,
  schoolId: string,
  toPhase: LessonPhase,
  toIndex: number,
): Promise<ILesson> {
  const lesson = await Lesson.findOne({ _id: lessonId, schoolId, isDeleted: false });
  if (!lesson) throw new Error('Lesson not found');
  const matId = new mongoose.Types.ObjectId(materialId);
  for (const phase of lesson.phases) {
    phase.materialIds = phase.materialIds.filter((id) => id.toString() !== matId.toString());
  }
  const target = lesson.phases.find((p) => p.phase === toPhase);
  if (!target) throw new Error('Invalid phase');
  const insertAt = Math.min(Math.max(toIndex, 0), target.materialIds.length);
  target.materialIds.splice(insertAt, 0, matId);
  await lesson.save();
  return lesson.toObject();
}

export async function deleteMaterial(
  lessonId: string,
  materialId: string,
  schoolId: string,
): Promise<void> {
  const lesson = await Lesson.findOne({ _id: lessonId, schoolId, isDeleted: false });
  if (!lesson) throw new Error('Lesson not found');
  const material = lesson.materials.find((m) => m._id.toString() === materialId);
  if (!material) throw new Error('Material not found');

  const refId =
    (material as { contentResourceId?: mongoose.Types.ObjectId }).contentResourceId
    ?? (material as { homeworkId?: mongoose.Types.ObjectId }).homeworkId
    ?? undefined;
  await softDeleteEntity(material.kind, refId);

  await Lesson.updateOne(
    { _id: lessonId, schoolId },
    {
      $pull: {
        materials: { _id: new mongoose.Types.ObjectId(materialId) },
        'phases.$[].materialIds': new mongoose.Types.ObjectId(materialId),
      },
    },
  );
}

export async function regenerateMaterial(
  lessonId: string,
  materialId: string,
  schoolId: string,
  teacherId: string,
  payload?: AddMaterialInput,
): Promise<ILessonMaterial> {
  const lesson = await Lesson.findOne({ _id: lessonId, schoolId, isDeleted: false });
  if (!lesson) throw new Error('Lesson not found');
  const existing = lesson.materials.find((m) => m._id.toString() === materialId);
  if (!existing) throw new Error('Material not found');
  if (!payload) throw new Error('Regenerate requires payload (v1)');

  const phaseEntry = lesson.phases.find((p) => p.materialIds.some((id) => id.toString() === materialId));
  await deleteMaterial(lessonId, materialId, schoolId);
  return addMaterial(lessonId, schoolId, teacherId, { ...payload, phase: phaseEntry?.phase ?? 'practice' });
}
```

- [ ] **Step 2: Verify under 350 lines**

Run: `cd c:/Users/shaun/campusly-backend && wc -l src/modules/Lesson/service-materials.ts && npx tsc --noEmit`
Expected: under 350; type-check passes.

- [ ] **Step 3: Commit**

```bash
git add src/modules/Lesson/service-materials.ts
git commit -m "feat(lesson): material ops (add/update/move/delete/regenerate) with compensation"
```

---

## Task 6: service-lesson-scaffold.ts — AI outline (no DB writes)

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/service-scaffold.ts`

- [ ] **Step 1: Write the scaffolder**

```ts
import { AIService } from '../../services/ai.service';
import { CurriculumNode } from '../CurriculumStructure/model';
import { scaffoldedOutlineSchema, type ScaffoldLessonInput, type ScaffoldedOutline } from './validation';

const SYSTEM_PROMPT = `You are a CAPS-aligned South African secondary school teacher. Given a curriculum topic, grade level, and lesson duration, produce a structured lesson outline.

Output strict JSON matching this schema (no markdown, no commentary):
{
  "objectives": string[3-5],
  "phases": [
    { "phase": "introduction",        "suggestions": [{ "kind": "...", "title": "...", "notes": "..." }] },
    { "phase": "direct_instruction",  "suggestions": [...] },
    { "phase": "practice",            "suggestions": [...] },
    { "phase": "assessment",          "suggestions": [...] },
    { "phase": "homework",            "suggestions": [...] }
  ]
}

Each phase has 1-3 suggestions. Each suggestion's "kind" must be one of:
"reading" | "worksheet" | "activity" | "notes" | "worked_example" | "quiz" | "practice_questions" | "homework" | "paper".

Pedagogical guidance per phase:
- introduction: notes (hook / recap) or short activity
- direct_instruction: notes (concept exposition) or worked_example
- practice: worksheet or activity or practice_questions
- assessment: quiz or practice_questions or paper
- homework: homework (always)`;

export async function scaffoldLesson(input: ScaffoldLessonInput): Promise<ScaffoldedOutline> {
  const node = await CurriculumNode.findById(input.curriculumNodeId).lean();
  if (!node) throw new Error('Curriculum node not found');

  const userPrompt = [
    `Topic: ${node.title}${node.code ? ` (${node.code})` : ''}`,
    `Type: ${node.type}`,
    `Duration: ${input.durationMinutes} minutes`,
    input.hints ? `Teacher hints: ${input.hints}` : '',
  ].filter(Boolean).join('\n');

  const raw = await AIService.generateJSON<unknown>(SYSTEM_PROMPT, userPrompt);
  const parsed = scaffoldedOutlineSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_FALLBACK;
  return parsed.data;
}

const DEFAULT_FALLBACK: ScaffoldedOutline = {
  objectives: ['Understand key concepts of the topic'],
  phases: [
    { phase: 'introduction',       suggestions: [{ kind: 'notes',              title: 'Topic introduction' }] },
    { phase: 'direct_instruction', suggestions: [{ kind: 'worked_example',     title: 'Worked example' }] },
    { phase: 'practice',           suggestions: [{ kind: 'worksheet',          title: 'Practice worksheet' }] },
    { phase: 'assessment',         suggestions: [{ kind: 'practice_questions', title: 'Quick check' }] },
    { phase: 'homework',           suggestions: [{ kind: 'homework',           title: 'Reinforcement homework' }] },
  ],
};
```

- [ ] **Step 2: Type-check + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
git add src/modules/Lesson/service-scaffold.ts
git commit -m "feat(lesson): AI outline scaffolder with Zod validation + fallback"
```

---

## Task 7: Extend service-homework-comprehension.ts with TextbookRef-based generator

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Homework/service-homework-comprehension.ts`

- [ ] **Step 1: Refactor existing into a shared inner helper**

Extract the AI-call + Question.insertMany body of the existing `generateComprehensionQuestions` into a private helper `generateComprehensionFromText({ sourceText, sourceLabel, schoolId, teacherId, subjectId, gradeId, curriculumNodeId, count }): Promise<mongoose.Types.ObjectId[]>`. The legacy function then resolves text via `extractText(contentResource)` and forwards to the helper with `sourceLabel = contentResource.title`.

- [ ] **Step 2: Append the new TextbookRef entry point**

```ts
import type { TextbookRef } from '../Lesson/types';
import { Textbook } from '../Textbook/model';

export async function generateComprehensionFromTextbook(
  textbookRef: TextbookRef,
  schoolId: string,
  teacherId: string,
  subjectId: string,
  gradeId: string,
  curriculumNodeId: string,
  count = 4,
): Promise<mongoose.Types.ObjectId[]> {
  let sourceText = '';
  let sourceLabel = '';

  if (textbookRef.source === 'internal') {
    const textbook = await Textbook.findOne({ _id: textbookRef.textbookId, schoolId, isDeleted: false }).lean();
    if (!textbook) throw new Error('Textbook not found');
    const chapter = textbookRef.chapterId
      ? textbook.chapters.find((c) => c._id?.toString() === textbookRef.chapterId?.toString())
      : undefined;
    sourceLabel = `${textbook.title}${chapter ? ` — ${chapter.title}` : ''}`;
    sourceText = chapter?.description ?? textbook.description ?? '';
  } else {
    sourceLabel = `${textbookRef.title}${textbookRef.publisher ? ` (${textbookRef.publisher})` : ''}`;
    if (textbookRef.excerpt) {
      sourceText = textbookRef.excerpt;
    } else {
      const range = (textbookRef.pageStart && textbookRef.pageEnd)
        ? `pages ${textbookRef.pageStart}-${textbookRef.pageEnd}` : 'this section';
      sourceText = `(no excerpt provided — generate based on topic only, referencing ${range})`;
    }
  }

  return generateComprehensionFromText({
    sourceText, sourceLabel,
    schoolId, teacherId, subjectId, gradeId, curriculumNodeId, count,
  });
}
```

- [ ] **Step 3: Type-check + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
git add src/modules/Homework/service-homework-comprehension.ts
git commit -m "feat(homework): comprehension Q generation from TextbookRef (internal+external)"
```

---

## Task 8: service-lesson-export.ts — Teacher Pack + Student Pack PDFs

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/service-export.ts`

- [ ] **Step 1: Write the export pipeline (PDFKit)**

```ts
import PDFDocument from 'pdfkit';
import { LessonService } from './service';
import type { ILesson, ILessonMaterial } from './types';
import { LESSON_PHASES } from './types';

const PHASE_LABELS: Record<string, string> = {
  introduction: 'Introduction',
  direct_instruction: 'Direct Instruction',
  practice: 'Practice',
  assessment: 'Assessment',
  homework: 'Homework',
};

interface RenderOptions { studentMode: boolean; }
const MAX_MATERIALS = 30;

async function renderLessonPdf(lessonId: string, schoolId: string, opts: RenderOptions): Promise<Buffer> {
  const lesson = await LessonService.getById(lessonId, schoolId);
  if (lesson.materials.length > MAX_MATERIALS) {
    throw new Error('Lesson too large to export — split into 2 lessons');
  }
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve) => { doc.on('end', () => resolve()); });

  renderCoverPage(doc, lesson, opts);
  renderObjectives(doc, lesson);
  for (const phase of LESSON_PHASES) {
    const entry = lesson.phases.find((p) => p.phase === phase);
    if (!entry || entry.materialIds.length === 0) continue;
    const phaseMaterials = entry.materialIds
      .map((id) => lesson.materials.find((m) => m._id.toString() === id.toString()))
      .filter((m): m is ILessonMaterial => !!m);
    if (phaseMaterials.length === 0) continue;
    renderPhaseHeader(doc, PHASE_LABELS[phase]);
    for (const material of phaseMaterials) renderMaterialCard(doc, material, opts);
  }
  renderPageNumbers(doc, lesson.title);

  doc.end();
  await finished;
  return Buffer.concat(chunks);
}

function renderCoverPage(doc: PDFKit.PDFDocument, lesson: ILesson, opts: RenderOptions): void {
  doc.fontSize(28).text(lesson.title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor('gray').text(opts.studentMode ? 'Student Pack' : 'Teacher Pack', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(11).fillColor('black');
  doc.text(`Date: ${new Date(lesson.date).toLocaleDateString()}`);
  doc.text(`Duration: ${lesson.durationMinutes} minutes`);
  doc.text(`Status: ${lesson.status}`);
  doc.addPage();
}

function renderObjectives(doc: PDFKit.PDFDocument, lesson: ILesson): void {
  if (lesson.objectives.length === 0) return;
  doc.fontSize(16).text('Learning Objectives');
  doc.moveDown(0.5).fontSize(11);
  lesson.objectives.forEach((obj, i) => doc.text(`${i + 1}. ${obj}`));
  doc.moveDown(1);
}

function renderPhaseHeader(doc: PDFKit.PDFDocument, label: string): void {
  doc.moveDown(1).fontSize(16).fillColor('#0066cc').text(label).fillColor('black');
  doc.moveDown(0.5);
}

function renderMaterialCard(doc: PDFKit.PDFDocument, material: ILessonMaterial, opts: RenderOptions): void {
  doc.fontSize(13).text(`${material.title} (${material.kind})`);
  if (material.teacherNotes && !opts.studentMode) {
    doc.fontSize(10).fillColor('gray').text(`Teacher notes: ${material.teacherNotes}`).fillColor('black');
  }
  doc.fontSize(10);
  if (material.kind === 'reading') renderReadingDetails(doc, material);
  else if (material.kind === 'notes' && (material as { contentResourceId?: unknown }).contentResourceId === undefined) {
    doc.text((material as { teacherNotes?: string }).teacherNotes ?? '');
  } else if ((material as { contentResourceId?: unknown }).contentResourceId) {
    doc.text('[Content resource attached — see materials inventory]');
  }
  doc.moveDown(0.5);
}

function renderReadingDetails(doc: PDFKit.PDFDocument, material: ILessonMaterial): void {
  if (material.kind !== 'reading') return;
  const ref = material.textbookRef;
  if (ref.source === 'internal') {
    doc.text(`Textbook reference (internal): pages ${ref.pageStart ?? '?'}-${ref.pageEnd ?? '?'}`);
  } else {
    doc.text(`Textbook: ${ref.title}${ref.publisher ? ` (${ref.publisher})` : ''}`);
    if (ref.isbn) doc.text(`ISBN: ${ref.isbn}`);
    if (ref.pageStart && ref.pageEnd) doc.text(`Pages ${ref.pageStart}-${ref.pageEnd}`);
    if (ref.excerpt) doc.moveDown(0.3).fontSize(10).text(ref.excerpt);
  }
}

function renderPageNumbers(doc: PDFKit.PDFDocument, title: string): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.fontSize(8).fillColor('gray')
      .text(`${title}  •  Page ${i + 1} of ${range.count}`, 50, doc.page.height - 30, { align: 'center' });
  }
}

export async function exportTeacherPack(lessonId: string, schoolId: string): Promise<Buffer> {
  return renderLessonPdf(lessonId, schoolId, { studentMode: false });
}
export async function exportStudentPack(lessonId: string, schoolId: string): Promise<Buffer> {
  return renderLessonPdf(lessonId, schoolId, { studentMode: true });
}
```

> **Note:** v1 export renders a structured manifest. Inlining full ContentResource / Question / Paper content into the PDF is a follow-up — the dispatch point is `renderMaterialCard`. For v1, content-backed cards print an "[attached]" notice; users can also export module-specific PDFs from each card's action menu.

- [ ] **Step 2: Type-check, line count, commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit && wc -l src/modules/Lesson/service-export.ts
git add src/modules/Lesson/service-export.ts
git commit -m "feat(lesson): Teacher Pack + Student Pack PDF export (PDFKit)"
```

---

## Task 9: controller.ts + routes.ts — 13 endpoints

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/controller.ts`
- Create: `c:/Users/shaun/campusly-backend/src/modules/Lesson/routes.ts`

- [ ] **Step 1: Write the controller**

```ts
import type { Request, Response, NextFunction } from 'express';
import { LessonService } from './service';
import * as Materials from './service-materials';
import { scaffoldLesson } from './service-scaffold';
import { exportTeacherPack, exportStudentPack } from './service-export';
import {
  createLessonSchema, updateLessonSchema, patchStatusSchema, scaffoldLessonSchema,
  addMaterialSchema, updateMaterialSchema, moveMaterialSchema, listLessonsSchema,
} from './validation';

function getAuth(req: Request): { id: string; schoolId: string; isHOD?: boolean; isSchoolPrincipal?: boolean } {
  const u = req.user as { id: string; schoolId?: string; isHOD?: boolean; isSchoolPrincipal?: boolean } | undefined;
  if (!u || !u.schoolId) throw new Error('Unauthenticated or missing schoolId');
  return { id: u.id, schoolId: u.schoolId, isHOD: u.isHOD, isSchoolPrincipal: u.isSchoolPrincipal };
}

export const LessonController = {
  list: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      const filters = listLessonsSchema.parse(req.query);
      const result = await LessonService.list(schoolId, filters);
      res.json({ data: result });
    } catch (err: unknown) { next(err); }
  },
  getById: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      const lesson = await LessonService.getById(req.params.id, schoolId);
      res.json({ data: lesson });
    } catch (err: unknown) { next(err); }
  },
  scaffold: async (req, res, next) => {
    try {
      getAuth(req);
      const input = scaffoldLessonSchema.parse(req.body);
      const outline = await scaffoldLesson(input);
      res.json({ data: outline });
    } catch (err: unknown) { next(err); }
  },
  create: async (req, res, next) => {
    try {
      const { id, schoolId } = getAuth(req);
      const data = createLessonSchema.parse(req.body);
      const lesson = await LessonService.create(data, id, schoolId);
      res.status(201).json({ data: lesson });
    } catch (err: unknown) { next(err); }
  },
  update: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      const data = updateLessonSchema.parse(req.body);
      const lesson = await LessonService.update(req.params.id, schoolId, data);
      res.json({ data: lesson });
    } catch (err: unknown) { next(err); }
  },
  patchStatus: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      const { status } = patchStatusSchema.parse(req.body);
      const lesson = await LessonService.patchStatus(req.params.id, schoolId, status);
      res.json({ data: lesson });
    } catch (err: unknown) { next(err); }
  },
  delete: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      await LessonService.delete(req.params.id, schoolId);
      res.json({ data: { ok: true } });
    } catch (err: unknown) { next(err); }
  },
  addMaterial: async (req, res, next) => {
    try {
      const { id: teacherId, schoolId } = getAuth(req);
      const input = addMaterialSchema.parse(req.body);
      const material = await Materials.addMaterial(req.params.id, schoolId, teacherId, input);
      res.status(201).json({ data: material });
    } catch (err: unknown) { next(err); }
  },
  updateMaterial: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      const patch = updateMaterialSchema.parse(req.body);
      const material = await Materials.updateMaterial(req.params.id, req.params.mid, schoolId, patch);
      res.json({ data: material });
    } catch (err: unknown) { next(err); }
  },
  moveMaterial: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      const { toPhase, toIndex } = moveMaterialSchema.parse(req.body);
      const lesson = await Materials.moveMaterial(req.params.id, req.params.mid, schoolId, toPhase, toIndex);
      res.json({ data: lesson });
    } catch (err: unknown) { next(err); }
  },
  regenerateMaterial: async (req, res, next) => {
    try {
      const { id: teacherId, schoolId } = getAuth(req);
      const payload = req.body && Object.keys(req.body).length ? addMaterialSchema.parse(req.body) : undefined;
      const material = await Materials.regenerateMaterial(req.params.id, req.params.mid, schoolId, teacherId, payload);
      res.json({ data: material });
    } catch (err: unknown) { next(err); }
  },
  deleteMaterial: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      await Materials.deleteMaterial(req.params.id, req.params.mid, schoolId);
      res.json({ data: { ok: true } });
    } catch (err: unknown) { next(err); }
  },
  exportTeacher: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      const buf = await exportTeacherPack(req.params.id, schoolId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="lesson-${req.params.id}-teacher.pdf"`);
      res.send(buf);
    } catch (err: unknown) { next(err); }
  },
  exportStudent: async (req, res, next) => {
    try {
      const { schoolId } = getAuth(req);
      const buf = await exportStudentPack(req.params.id, schoolId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="lesson-${req.params.id}-student.pdf"`);
      res.send(buf);
    } catch (err: unknown) { next(err); }
  },
};
```

(Add Express types to method signatures: `(req: Request, res: Response, next: NextFunction)` — omitted above for compactness.)

- [ ] **Step 2: Write routes**

```ts
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { LessonController } from './controller';

const router = Router();
router.use(authenticate, authorize('teacher', 'school_admin', 'super_admin'));

router.get('/',                                LessonController.list);
router.post('/scaffold',                       LessonController.scaffold);
router.post('/',                               LessonController.create);
router.get('/:id',                             LessonController.getById);
router.put('/:id',                             LessonController.update);
router.patch('/:id/status',                    LessonController.patchStatus);
router.delete('/:id',                          LessonController.delete);

router.post('/:id/materials',                  LessonController.addMaterial);
router.patch('/:id/materials/:mid',            LessonController.updateMaterial);
router.patch('/:id/materials/:mid/move',       LessonController.moveMaterial);
router.post('/:id/materials/:mid/regenerate',  LessonController.regenerateMaterial);
router.delete('/:id/materials/:mid',           LessonController.deleteMaterial);

router.get('/:id/export/teacher',              LessonController.exportTeacher);
router.get('/:id/export/student',              LessonController.exportStudent);

export default router;
```

- [ ] **Step 3: Type-check + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
git add src/modules/Lesson/controller.ts src/modules/Lesson/routes.ts
git commit -m "feat(lesson): controller + 13 routes with auth guard"
```

---

## Task 10: app.ts mount + boot migration + 308 redirect

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/app.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/index.ts`

- [ ] **Step 1: Mount the new module + redirect old paths**

In `src/app.ts`, near the existing module mounts:

```ts
import lessonRoutes from './modules/Lesson/routes';

app.use('/api/lessons', lessonRoutes);

app.all('/api/lesson-plans', (_req, res) => res.redirect(308, '/api/lessons'));
app.all('/api/lesson-plans/*', (req, res) => {
  const tail = req.originalUrl.replace(/^\/api\/lesson-plans/, '/api/lessons');
  res.redirect(308, tail);
});
```

Remove the old `lesson-plans` mount line (`app.use('/api/lesson-plans', ...)`) — the 308 catches all traffic.

- [ ] **Step 2: Wire boot-time migration**

In `src/index.ts`, after MongoDB connects but before `app.listen`:

```ts
import { runMigrations } from './db/migrations';

await mongoose.connect(MONGODB_URI);
await runMigrations();
app.listen(PORT, () => { /* ... */ });
```

- [ ] **Step 3: Smoke test**

Run: `cd c:/Users/shaun/campusly-backend && npm run dev`
Expected: server starts; migration logs appear once.

Verify with curl (substitute a real bearer token):
- `curl -i -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/lesson-plans` → 308 with `Location: /api/lessons`
- `curl -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/lessons` → 200 JSON

- [ ] **Step 4: Commit**

```bash
git add src/app.ts src/index.ts
git commit -m "feat(lesson): mount /api/lessons, run boot migration, 308 from /api/lesson-plans"
```

---

## Task 11: Frontend types

**Files:**
- Create: `src/types/lesson.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write the discriminated types**

```ts
export type LessonStatus = 'draft' | 'ready' | 'taught';
export type LessonPhase = 'introduction' | 'direct_instruction' | 'practice' | 'assessment' | 'homework';
export const LESSON_PHASES: LessonPhase[] = ['introduction', 'direct_instruction', 'practice', 'assessment', 'homework'];
export type LessonMaterialKind =
  | 'reading' | 'worksheet' | 'activity' | 'notes' | 'worked_example'
  | 'quiz' | 'practice_questions' | 'homework' | 'paper';

export interface InternalTextbookRef {
  source: 'internal';
  textbookId: string;
  chapterId?: string;
  pageStart?: number;
  pageEnd?: number;
  notes?: string;
}
export interface ExternalTextbookRef {
  source: 'external';
  title: string;
  publisher?: string;
  isbn?: string;
  pageStart?: number;
  pageEnd?: number;
  excerpt?: string;
  notes?: string;
}
export type TextbookRef = InternalTextbookRef | ExternalTextbookRef;

interface LessonMaterialBase {
  _id: string;
  kind: LessonMaterialKind;
  title: string;
  teacherNotes?: string;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface ReadingMaterial extends LessonMaterialBase { kind: 'reading'; textbookRef: TextbookRef; comprehensionQuestionIds?: string[]; }
export interface WorksheetMaterial extends LessonMaterialBase { kind: 'worksheet'; contentResourceId: string; }
export interface ActivityMaterial extends LessonMaterialBase { kind: 'activity'; contentResourceId: string; }
export interface NotesMaterial extends LessonMaterialBase { kind: 'notes'; contentResourceId?: string; }
export interface WorkedExampleMaterial extends LessonMaterialBase { kind: 'worked_example'; contentResourceId: string; }
export interface QuizMaterial extends LessonMaterialBase { kind: 'quiz'; quizId: string; }
export interface PracticeQuestionsMaterial extends LessonMaterialBase { kind: 'practice_questions'; questionIds: string[]; }
export interface HomeworkMaterial extends LessonMaterialBase { kind: 'homework'; homeworkId: string; }
export interface PaperMaterial extends LessonMaterialBase { kind: 'paper'; paperId: string; }
export type LessonMaterial =
  | ReadingMaterial | WorksheetMaterial | ActivityMaterial | NotesMaterial | WorkedExampleMaterial
  | QuizMaterial | PracticeQuestionsMaterial | HomeworkMaterial | PaperMaterial;

export interface LessonPhaseEntry { phase: LessonPhase; materialIds: string[]; }

export interface Lesson {
  _id: string;
  schoolId: string;
  teacherId: string | { _id: string; firstName: string; lastName: string };
  classId: string | { _id: string; name: string };
  subjectId: string | { _id: string; name: string; code?: string };
  gradeId: string | { _id: string; name: string; level?: number };
  curriculumNodeId: string | { _id: string; title: string; code?: string };
  title: string;
  date: string;
  durationMinutes: number;
  objectives: string[];
  phases: LessonPhaseEntry[];
  materials: LessonMaterial[];
  status: LessonStatus;
  reflectionNotes?: string;
  aiGenerated: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScaffoldedOutline {
  objectives: string[];
  phases: Array<{
    phase: LessonPhase;
    suggestions: Array<{ kind: LessonMaterialKind; title: string; notes?: string }>;
  }>;
}

export interface CreateLessonPayload {
  classId: string;
  subjectId: string;
  gradeId: string;
  curriculumNodeId: string;
  title: string;
  date: string;
  durationMinutes: number;
  objectives?: string[];
  scaffoldedOutline?: ScaffoldedOutline;
}

export interface ScaffoldLessonPayload {
  curriculumNodeId: string;
  classId: string;
  subjectId: string;
  gradeId: string;
  durationMinutes: number;
  hints?: string;
}

export interface LessonsListResult {
  items: Lesson[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 2: Add to `src/types/index.ts` barrel**

```ts
export * from './lesson';
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add src/types/lesson.ts src/types/index.ts
git commit -m "feat(lesson): frontend types for Lesson + LessonMaterial union"
```

---

## Task 12: Hooks + Zustand workspace store

**Files:**
- Create: `src/hooks/useLessons.ts`
- Create: `src/hooks/useLesson.ts`
- Create: `src/hooks/useLessonScaffold.ts`
- Create: `src/hooks/useLessonExport.ts`
- Create: `src/stores/useLessonWorkspaceStore.ts`

- [ ] **Step 1: `useLessons` (list with filters)**

```ts
import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Lesson, LessonsListResult, LessonStatus } from '@/types/lesson';

export interface LessonsFilters {
  classId?: string;
  subjectId?: string;
  status?: LessonStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useLessons(initial: LessonsFilters = {}) {
  const [filters, setFilters] = useState<LessonsFilters>({ page: 1, limit: 20, ...initial });
  const [items, setItems] = useState<Lesson[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/lessons', { params: filters });
      const data = unwrapResponse<LessonsListResult>(res);
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load lessons';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const deleteLesson = useCallback(async (id: string) => {
    await apiClient.delete(`/lessons/${id}`);
    await fetchList();
  }, [fetchList]);

  return { items, total, loading, error, filters, setFilters, refetch: fetchList, deleteLesson };
}
// Note: spec §7 mentions a "Clone" action — v1 ships without it (no backend endpoint
// in §6 routes list). Tracked as follow-up.
```

- [ ] **Step 2: `useLesson` (single + materials mutations)**

```ts
import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type {
  Lesson, LessonMaterial, LessonPhase, LessonStatus,
} from '@/types/lesson';

export function useLesson(id: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOne = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/lessons/${id}`);
      setLesson(unwrapResponse<Lesson>(res));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOne(); }, [fetchOne]);

  const updateLesson = useCallback(async (patch: Partial<Lesson>) => {
    const res = await apiClient.put(`/lessons/${id}`, patch);
    const updated = unwrapResponse<Lesson>(res);
    setLesson(updated);
    return updated;
  }, [id]);

  const patchStatus = useCallback(async (status: LessonStatus) => {
    const res = await apiClient.patch(`/lessons/${id}/status`, { status });
    const updated = unwrapResponse<Lesson>(res);
    setLesson(updated);
    return updated;
  }, [id]);

  const addMaterial = useCallback(async (payload: Record<string, unknown>) => {
    const res = await apiClient.post(`/lessons/${id}/materials`, payload);
    await fetchOne();
    return unwrapResponse<LessonMaterial>(res);
  }, [id, fetchOne]);

  const updateMaterial = useCallback(async (mid: string, patch: { title?: string; teacherNotes?: string }) => {
    const res = await apiClient.patch(`/lessons/${id}/materials/${mid}`, patch);
    await fetchOne();
    return unwrapResponse<LessonMaterial>(res);
  }, [id, fetchOne]);

  const moveMaterial = useCallback(async (mid: string, toPhase: LessonPhase, toIndex: number) => {
    await apiClient.patch(`/lessons/${id}/materials/${mid}/move`, { toPhase, toIndex });
    await fetchOne();
  }, [id, fetchOne]);

  const deleteMaterial = useCallback(async (mid: string) => {
    await apiClient.delete(`/lessons/${id}/materials/${mid}`);
    await fetchOne();
  }, [id, fetchOne]);

  const regenerateMaterial = useCallback(async (mid: string, payload?: Record<string, unknown>) => {
    const res = await apiClient.post(`/lessons/${id}/materials/${mid}/regenerate`, payload ?? {});
    await fetchOne();
    return unwrapResponse<LessonMaterial>(res);
  }, [id, fetchOne]);

  return { lesson, loading, error, refetch: fetchOne, updateLesson, patchStatus, addMaterial, updateMaterial, moveMaterial, deleteMaterial, regenerateMaterial };
}
```

- [ ] **Step 3: `useLessonScaffold` (AI outline)**

```ts
import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { ScaffoldedOutline, ScaffoldLessonPayload, Lesson, CreateLessonPayload } from '@/types/lesson';

export function useLessonScaffold() {
  const [scaffolding, setScaffolding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scaffold = useCallback(async (input: ScaffoldLessonPayload): Promise<ScaffoldedOutline> => {
    setScaffolding(true);
    try {
      const res = await apiClient.post('/lessons/scaffold', input);
      setError(null);
      return unwrapResponse<ScaffoldedOutline>(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to scaffold';
      setError(msg);
      throw err;
    } finally {
      setScaffolding(false);
    }
  }, []);

  const createLesson = useCallback(async (payload: CreateLessonPayload): Promise<Lesson> => {
    setCreating(true);
    try {
      const res = await apiClient.post('/lessons', payload);
      setError(null);
      return unwrapResponse<Lesson>(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create lesson';
      setError(msg);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  return { scaffold, createLesson, scaffolding, creating, error };
}
```

- [ ] **Step 4: `useLessonExport` (PDF download)**

```ts
import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';

export function useLessonExport() {
  const [downloading, setDownloading] = useState<'teacher' | 'student' | null>(null);

  const download = useCallback(async (lessonId: string, mode: 'teacher' | 'student', filename: string) => {
    setDownloading(mode);
    try {
      const res = await apiClient.get(`/lessons/${lessonId}/export/${mode}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }, []);

  return { download, downloading };
}
```

- [ ] **Step 5: Zustand workspace store**

```ts
import { create } from 'zustand';
import type { LessonMaterialKind, LessonPhase } from '@/types/lesson';

interface DrawerState {
  open: boolean;
  kind: LessonMaterialKind | null;
  phase: LessonPhase | null;
  materialId: string | null;
}

interface WorkspaceState {
  drawer: DrawerState;
  dirty: boolean;
  openDrawer: (phase: LessonPhase, kind?: LessonMaterialKind, materialId?: string) => void;
  closeDrawer: () => void;
  setKind: (kind: LessonMaterialKind) => void;
  markDirty: (dirty?: boolean) => void;
}

export const useLessonWorkspaceStore = create<WorkspaceState>((set) => ({
  drawer: { open: false, kind: null, phase: null, materialId: null },
  dirty: false,
  openDrawer: (phase, kind = null, materialId = null) =>
    set({ drawer: { open: true, phase, kind: kind ?? null, materialId } }),
  closeDrawer: () =>
    set({ drawer: { open: false, kind: null, phase: null, materialId: null } }),
  setKind: (kind) =>
    set((s) => ({ drawer: { ...s.drawer, kind } })),
  markDirty: (dirty = true) => set({ dirty }),
}));
```

- [ ] **Step 6: Type-check + commit**

```bash
npx tsc --noEmit
git add src/hooks/useLesson.ts src/hooks/useLessons.ts src/hooks/useLessonScaffold.ts src/hooks/useLessonExport.ts src/stores/useLessonWorkspaceStore.ts
git commit -m "feat(lesson): hooks (useLessons/useLesson/scaffold/export) + workspace store"
```

---

## Task 13: List page + filters + table + calendar

**Files:**
- Create: `src/app/(dashboard)/teacher/lessons/page.tsx`
- Create: `src/components/lessons/LessonListFilters.tsx`
- Create: `src/components/lessons/LessonListTable.tsx`
- Create: `src/components/lessons/LessonCalendar.tsx`
- Create: `src/components/lessons/LessonStatusPill.tsx`

- [ ] **Step 1: `LessonStatusPill.tsx`**

```tsx
'use client';
import { Badge } from '@/components/ui/badge';
import type { LessonStatus } from '@/types/lesson';

const VARIANTS: Record<LessonStatus, { label: string; className: string }> = {
  draft:  { label: 'Draft',  className: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  ready:  { label: 'Ready',  className: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  taught: { label: 'Taught', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
};

export function LessonStatusPill({ status }: { status: LessonStatus }) {
  const v = VARIANTS[status];
  return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
}
```

- [ ] **Step 2: `LessonListFilters.tsx`**

Component receives `filters, onChange, classes, subjects` props. Renders class Select, subject Select, status Select, date range inputs, search input. All controls `w-full sm:w-40` per CLAUDE.md responsiveness rule.

```tsx
'use client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LessonsFilters } from '@/hooks/useLessons';
import type { LessonStatus } from '@/types/lesson';

interface Props {
  filters: LessonsFilters;
  onChange: (f: LessonsFilters) => void;
  classes: Array<{ _id: string; name: string }>;
  subjects: Array<{ _id: string; name: string }>;
}

export function LessonListFilters({ filters, onChange, classes, subjects }: Props) {
  const update = (patch: Partial<LessonsFilters>) => onChange({ ...filters, ...patch, page: 1 });
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      <Input
        placeholder="Search lessons..."
        className="w-full sm:w-64"
        value={filters.search ?? ''}
        onChange={(e) => update({ search: e.target.value || undefined })}
      />
      <Select value={filters.classId ?? 'all'} onValueChange={(v) => update({ classId: v === 'all' ? undefined : v })}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Class" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All classes</SelectItem>
          {classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.subjectId ?? 'all'} onValueChange={(v) => update({ subjectId: v === 'all' ? undefined : v })}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Subject" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All subjects</SelectItem>
          {subjects.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.status ?? 'all'} onValueChange={(v) => update({ status: v === 'all' ? undefined : (v as LessonStatus) })}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="ready">Ready</SelectItem>
          <SelectItem value="taught">Taught</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 3: `LessonListTable.tsx`**

Use the existing `DataTable` shared component. Columns: title, class.name, subject.name, date (locale string), status (`<LessonStatusPill>`), materials.length, actions menu (Open / Delete).

```tsx
'use client';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { LessonStatusPill } from './LessonStatusPill';
import type { Lesson } from '@/types/lesson';

interface Props { items: Lesson[]; onDelete: (id: string) => void; }

export function LessonListTable({ items, onDelete }: Props) {
  const columns: ColumnDef<Lesson>[] = [
    {
      accessorKey: 'title', header: 'Title',
      cell: ({ row }) => (
        <Link href={`/teacher/lessons/${row.original._id}`} className="font-medium hover:underline truncate">
          {row.original.title}
        </Link>
      ),
    },
    {
      header: 'Class',
      cell: ({ row }) => typeof row.original.classId === 'object' ? row.original.classId.name : '-',
    },
    {
      header: 'Subject',
      cell: ({ row }) => typeof row.original.subjectId === 'object' ? row.original.subjectId.name : '-',
    },
    {
      accessorKey: 'date', header: 'Date',
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => <LessonStatusPill status={row.original.status} />,
    },
    {
      header: 'Materials',
      cell: ({ row }) => row.original.materials.length,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" asChild><Link href={`/teacher/lessons/${row.original._id}`}>Open</Link></Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(row.original._id)}>Delete</Button>
        </div>
      ),
    },
  ];
  return <DataTable columns={columns} data={items} />;
}
```

- [ ] **Step 4: `LessonCalendar.tsx`** (basic month grid)

Render a CSS-grid month: 7 columns, 5-6 rows. For each day, list up to 3 lessons (each colored by status), with "+N more" overflow link to the list view filtered to that date. Implementation uses native Date math; no external calendar lib needed.

(Skeleton — 80-120 lines; keep under 350.)

- [ ] **Step 5: `page.tsx` orchestrator**

```tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useLessons } from '@/hooks/useLessons';
import { useAcademicLookups } from '@/hooks/useAcademicLookups';
import { LessonListFilters } from '@/components/lessons/LessonListFilters';
import { LessonListTable } from '@/components/lessons/LessonListTable';
import { LessonCalendar } from '@/components/lessons/LessonCalendar';
import { CalendarRange, BookOpen } from 'lucide-react';

export default function LessonsPage() {
  const { items, loading, filters, setFilters, deleteLesson } = useLessons();
  const { classes, subjects } = useAcademicLookups();
  const [view, setView] = useState<'list' | 'calendar'>('list');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lessons"
        description="Plan, build, and export your lessons in one place."
        action={<Button asChild><Link href="/teacher/lessons/new">New Lesson</Link></Button>}
      />
      <LessonListFilters filters={filters} onChange={setFilters} classes={classes} subjects={subjects} />
      <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'calendar')}>
        <TabsList>
          <TabsTrigger value="list"><BookOpen className="h-4 w-4 mr-1" /> List</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarRange className="h-4 w-4 mr-1" /> Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          {loading ? <LoadingSpinner />
            : items.length === 0
              ? <EmptyState icon={BookOpen} title="No lessons yet" description="Create your first lesson to get started." />
              : <LessonListTable items={items} onDelete={deleteLesson} />}
        </TabsContent>
        <TabsContent value="calendar">
          {loading ? <LoadingSpinner /> : <LessonCalendar items={items} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

> If `useAcademicLookups` doesn't already exist with `{ classes, subjects }`, create a small hook that fetches `/academic/classes` and `/academic/subjects` and unwraps the lists.

- [ ] **Step 6: Verify in browser**

Run: `npm run dev` (port 3500). Open http://localhost:3500/teacher/lessons.
Expected: page renders; filters react; table populates from any migrated lesson plans.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/teacher/lessons/page.tsx src/components/lessons/
git commit -m "feat(lesson): list page with filters + table + calendar toggle"
```

---

## Task 14: Creation flow (3 steps) + scaffold preview

**Files:**
- Create: `src/app/(dashboard)/teacher/lessons/new/page.tsx`
- Create: `src/components/lessons/LessonScaffoldPreview.tsx`

- [ ] **Step 1: Page orchestrator with 3-step state machine**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CurriculumTreeBrowser } from '@/components/curriculum/CurriculumTreeBrowser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAcademicLookups } from '@/hooks/useAcademicLookups';
import { useLessonScaffold } from '@/hooks/useLessonScaffold';
import { LessonScaffoldPreview } from '@/components/lessons/LessonScaffoldPreview';
import { toast } from 'sonner';
import type { ScaffoldedOutline } from '@/types/lesson';

type Step = 1 | 2 | 3;
interface FormState {
  curriculumNodeId: string;
  classId: string;
  subjectId: string;
  gradeId: string;
  date: string;
  durationMinutes: number;
  title: string;
  hints: string;
}

export default function NewLessonPage() {
  const router = useRouter();
  const { classes, subjects } = useAcademicLookups();
  const { scaffold, createLesson, scaffolding, creating } = useLessonScaffold();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    curriculumNodeId: '', classId: '', subjectId: '', gradeId: '',
    date: new Date().toISOString().slice(0, 10), durationMinutes: 45, title: '', hints: '',
  });
  const [outline, setOutline] = useState<ScaffoldedOutline | null>(null);
  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const onScaffold = async () => {
    try {
      const result = await scaffold({
        curriculumNodeId: form.curriculumNodeId,
        classId: form.classId, subjectId: form.subjectId, gradeId: form.gradeId,
        durationMinutes: form.durationMinutes, hints: form.hints || undefined,
      });
      setOutline(result);
      setStep(3);
    } catch { toast.error('Failed to generate outline'); }
  };

  const onCreate = async (finalOutline: ScaffoldedOutline | null) => {
    try {
      const lesson = await createLesson({
        classId: form.classId, subjectId: form.subjectId, gradeId: form.gradeId,
        curriculumNodeId: form.curriculumNodeId,
        title: form.title || 'Untitled lesson',
        date: new Date(form.date).toISOString(),
        durationMinutes: form.durationMinutes,
        scaffoldedOutline: finalOutline ?? undefined,
      });
      toast.success('Lesson created');
      router.push(`/teacher/lessons/${lesson._id}`);
    } catch { toast.error('Failed to create lesson'); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <h1 className="text-2xl font-semibold">New Lesson</h1>

      {step === 1 && (
        <div className="space-y-4">
          <Label>Curriculum topic</Label>
          <CurriculumTreeBrowser onSelect={(node) => update({ curriculumNodeId: node._id })} selectedNodeId={form.curriculumNodeId} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Class</Label>
              <Select value={form.classId} onValueChange={(v) => update({ classId: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pick a class" /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={form.subjectId} onValueChange={(v) => update({ subjectId: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pick a subject" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" min={5} max={480} value={form.durationMinutes} onChange={(e) => update({ durationMinutes: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="Defaults to topic title" />
          </div>
          <div className="flex justify-end">
            <Button disabled={!form.curriculumNodeId || !form.classId || !form.subjectId} onClick={() => setStep(2)}>Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Label>Anything specific to focus on? (optional)</Label>
          <Textarea value={form.hints} onChange={(e) => update({ hints: e.target.value })} placeholder="e.g. focus on factorising trinomials" rows={4} />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" disabled={creating} onClick={() => onCreate(null)}>Skip & create empty</Button>
              <Button disabled={scaffolding} onClick={onScaffold}>{scaffolding ? 'Generating...' : 'Scaffold with AI'}</Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && outline && (
        <div className="space-y-4">
          <LessonScaffoldPreview
            outline={outline}
            onChange={setOutline}
            onRegenerate={onScaffold}
            regenerating={scaffolding}
          />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button disabled={creating} onClick={() => onCreate(outline)}>{creating ? 'Creating...' : 'Create Lesson'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `LessonScaffoldPreview.tsx`**

Renders the outline editably: each objective in an inline-editable Input (with remove + add buttons), and per-phase suggestion cards (each with title input + remove button). Calls `onChange(updatedOutline)` on every edit. "Regenerate" button calls `onRegenerate`.

(Skeleton — keep under 250 lines.)

- [ ] **Step 3: Browser smoke test**

Open http://localhost:3500/teacher/lessons/new — walk through all 3 steps. Verify the workspace loads after Create.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/teacher/lessons/new/page.tsx src/components/lessons/LessonScaffoldPreview.tsx
git commit -m "feat(lesson): 3-step creation flow with AI scaffold preview"
```

---

## Task 15: Workspace orchestrator + LessonOutline + status pill

**Files:**
- Create: `src/app/(dashboard)/teacher/lessons/[id]/page.tsx`
- Create: `src/components/lessons/LessonOutline.tsx`

- [ ] **Step 1: Workspace page**

```tsx
'use client';
import { useParams } from 'next/navigation';
import { useLesson } from '@/hooks/useLesson';
import { useLessonExport } from '@/hooks/useLessonExport';
import { LessonOutline } from '@/components/lessons/LessonOutline';
import { LessonPhaseSection } from '@/components/lessons/LessonPhaseSection';
import { MaterialDrawer } from '@/components/lessons/drawers/MaterialDrawer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LESSON_PHASES } from '@/types/lesson';

export default function LessonWorkspacePage() {
  const params = useParams<{ id: string }>();
  const lessonId = params?.id ?? '';
  const lessonHook = useLesson(lessonId);
  const exportHook = useLessonExport();

  if (lessonHook.loading) return <LoadingSpinner />;
  if (!lessonHook.lesson) return <div className="p-6 text-destructive">Lesson not found</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 p-4">
      <aside className="lg:sticky lg:top-4 self-start">
        <LessonOutline
          lesson={lessonHook.lesson}
          updateLesson={lessonHook.updateLesson}
          patchStatus={lessonHook.patchStatus}
          onExport={(mode) => exportHook.download(lessonHook.lesson!._id, mode, `${lessonHook.lesson!.title}-${mode}.pdf`)}
          exporting={exportHook.downloading}
        />
      </aside>
      <main className="space-y-6">
        {LESSON_PHASES.map((phase) => (
          <LessonPhaseSection
            key={phase}
            phase={phase}
            lesson={lessonHook.lesson!}
            onUpdateMaterial={lessonHook.updateMaterial}
            onMoveMaterial={lessonHook.moveMaterial}
            onDeleteMaterial={lessonHook.deleteMaterial}
          />
        ))}
      </main>
      <MaterialDrawer
        lessonId={lessonId}
        addMaterial={lessonHook.addMaterial}
      />
    </div>
  );
}
```

- [ ] **Step 2: `LessonOutline.tsx`**

Sticky left column. Renders:
- Editable title (click to edit Input, blur to save via `updateLesson`)
- Status pill with click-to-transition popover (uses `patchStatus`)
- Class / subject / topic / date metadata
- Editable objectives list (add/remove/edit)
- Phase nav (5 buttons → scroll-to anchor for each phase section)
- "Mark as Taught" button (status === 'ready' && date <= today)
- Reflection notes textarea (visible when status === 'taught')
- Export Teacher Pack / Export Student Pack buttons (call `onExport`)

(Skeleton — under 280 lines.)

- [ ] **Step 3: Browser check**

Navigate to `/teacher/lessons/[id]` for an existing lesson. Confirm outline loads, status pill shows correct state.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/teacher/lessons/\[id\]/page.tsx src/components/lessons/LessonOutline.tsx
git commit -m "feat(lesson): workspace orchestrator + sticky outline column"
```

---

## Task 16: LessonPhaseSection + LessonMaterialCard + dnd-kit reorder

**Files:**
- Create: `src/components/lessons/LessonPhaseSection.tsx`
- Create: `src/components/lessons/LessonMaterialCard.tsx`

- [ ] **Step 1: `LessonMaterialCard.tsx`**

Per-card UI:
- Icon + kind label (lookup table per kind)
- Editable title (click to edit, blur to save via `onUpdateMaterial`)
- Status pill: Placeholder (no `generatedAt`) / Generated / Linked
- Collapsible teacher notes
- Action menu (DropdownMenu): Generate (placeholder only) / Regenerate / Edit / View / Delete
- Wrapped in `useSortable` from `@dnd-kit/sortable` for drag handle

```tsx
'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import type { LessonMaterial } from '@/types/lesson';

interface Props {
  material: LessonMaterial;
  onUpdate: (mid: string, patch: { title?: string; teacherNotes?: string }) => Promise<unknown>;
  onDelete: (mid: string) => Promise<void>;
  onOpenDrawer: (kind: LessonMaterial['kind'], materialId: string) => void;
}

export function LessonMaterialCard({ material, onUpdate, onDelete, onOpenDrawer }: Props) {
  const sortable = useSortable({ id: material._id });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  const isPlaceholder = !material.generatedAt;
  return (
    <Card ref={sortable.setNodeRef} style={style} className="p-3 flex gap-2 items-start">
      <button {...sortable.attributes} {...sortable.listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{material.title}</span>
          <Badge variant="outline" className="text-xs">{material.kind}</Badge>
          <Badge variant={isPlaceholder ? 'secondary' : 'default'} className="text-xs">
            {isPlaceholder ? 'Placeholder' : 'Generated'}
          </Badge>
        </div>
        {material.teacherNotes && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{material.teacherNotes}</p>
        )}
      </div>
      <div className="flex gap-1">
        {isPlaceholder
          ? <button onClick={() => onOpenDrawer(material.kind, material._id)} className="text-xs text-primary hover:underline">Generate</button>
          : <button onClick={() => onOpenDrawer(material.kind, material._id)} className="text-xs hover:underline">Edit</button>}
        <button onClick={() => onDelete(material._id)} className="text-xs text-destructive hover:underline">Delete</button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: `LessonPhaseSection.tsx`**

Renders phase header + a `<DndContext>` + `<SortableContext>` wrapping the list of `LessonMaterialCard` for that phase. On `onDragEnd`, computes new index in target phase and calls `onMoveMaterial(materialId, toPhase, toIndex)`. "+ Add material" button at bottom calls `useLessonWorkspaceStore.openDrawer(phase)`.

```tsx
'use client';
import { useMemo } from 'react';
import { DndContext, type DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { LessonMaterialCard } from './LessonMaterialCard';
import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
import type { Lesson, LessonPhase, LessonMaterial } from '@/types/lesson';

const PHASE_LABELS: Record<LessonPhase, string> = {
  introduction: 'Introduction',
  direct_instruction: 'Direct Instruction',
  practice: 'Practice',
  assessment: 'Assessment',
  homework: 'Homework',
};

interface Props {
  phase: LessonPhase;
  lesson: Lesson;
  onUpdateMaterial: (mid: string, patch: { title?: string; teacherNotes?: string }) => Promise<unknown>;
  onMoveMaterial: (mid: string, toPhase: LessonPhase, toIndex: number) => Promise<void>;
  onDeleteMaterial: (mid: string) => Promise<void>;
}

export function LessonPhaseSection({ phase, lesson, onUpdateMaterial, onMoveMaterial, onDeleteMaterial }: Props) {
  const openDrawer = useLessonWorkspaceStore((s) => s.openDrawer);
  const phaseEntry = lesson.phases.find((p) => p.phase === phase);
  const materials: LessonMaterial[] = useMemo(() => {
    if (!phaseEntry) return [];
    return phaseEntry.materialIds
      .map((id) => lesson.materials.find((m) => m._id === id))
      .filter((m): m is LessonMaterial => !!m);
  }, [phaseEntry, lesson.materials]);

  const handleDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.over.id === e.active.id) return;
    const oldIdx = materials.findIndex((m) => m._id === e.active.id);
    const newIdx = materials.findIndex((m) => m._id === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    await onMoveMaterial(String(e.active.id), phase, newIdx);
  };

  return (
    <section id={`phase-${phase}`} className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{PHASE_LABELS[phase]}</h2>
        <span className="text-xs text-muted-foreground">{materials.length} item{materials.length !== 1 ? 's' : ''}</span>
      </header>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={materials.map((m) => m._id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {materials.map((m) => (
              <LessonMaterialCard
                key={m._id}
                material={m}
                onUpdate={onUpdateMaterial}
                onDelete={onDeleteMaterial}
                onOpenDrawer={(kind, mid) => openDrawer(phase, kind, mid)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button variant="outline" size="sm" onClick={() => openDrawer(phase)}>
        <Plus className="h-4 w-4 mr-1" /> Add material
      </Button>
    </section>
  );
}
```

> **Cross-phase drag** is out of scope for v1 — within-phase reorder only. Cross-phase moves happen via the card's action menu ("Move to phase…") which is a follow-up.

- [ ] **Step 3: Type-check + browser smoke**

Verify drag works inside one phase; persists across reload.

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add src/components/lessons/LessonPhaseSection.tsx src/components/lessons/LessonMaterialCard.tsx
git commit -m "feat(lesson): phase sections + material cards with dnd-kit reorder"
```

---

## Task 17: MaterialDrawerShell + MaterialTypePicker

**Files:**
- Create: `src/components/lessons/MaterialDrawerShell.tsx`
- Create: `src/components/lessons/MaterialTypePicker.tsx`
- Create: `src/components/lessons/drawers/MaterialDrawer.tsx`

- [ ] **Step 1: `MaterialDrawerShell.tsx`**

Wraps `Sheet` + `SheetContent` with side="right". Props: `open`, `onClose`, `title`, `children` (body), `footer` (sticky bottom). Implements the overflow pattern from CLAUDE.md (flex-col + overflow-y-auto body + sticky footer).

```tsx
'use client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function MaterialDrawerShell({ open, onClose, title, children, footer }: Props) {
  return (
    <Sheet open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-lg">
        <header className="border-b pb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
        </header>
        <div className="flex-1 overflow-y-auto py-4">{children}</div>
        {footer && <div className="border-t pt-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: `MaterialTypePicker.tsx`**

9-tile grid (3 cols on desktop, 2 on tablet, 1 on mobile). Each tile: icon, kind name, brief description. Click → calls `onPick(kind)`.

```tsx
'use client';
import { BookOpen, FileText, Activity, NotebookPen, Lightbulb, ListChecks, ListPlus, Briefcase, FileBarChart2 } from 'lucide-react';
import type { LessonMaterialKind } from '@/types/lesson';

const TILES: Array<{ kind: LessonMaterialKind; label: string; icon: typeof BookOpen; desc: string }> = [
  { kind: 'reading',            label: 'Reading',           icon: BookOpen,        desc: 'Textbook section + optional comprehension Qs' },
  { kind: 'worksheet',          label: 'Worksheet',         icon: FileText,        desc: 'Practice problems' },
  { kind: 'activity',           label: 'Activity',          icon: Activity,        desc: 'Hands-on or group activity' },
  { kind: 'notes',              label: 'Notes',             icon: NotebookPen,     desc: 'Concept exposition or recap' },
  { kind: 'worked_example',     label: 'Worked Example',    icon: Lightbulb,       desc: 'Step-by-step model solution' },
  { kind: 'quiz',               label: 'Quiz',              icon: ListChecks,      desc: 'Link an existing quiz' },
  { kind: 'practice_questions', label: 'Practice Questions',icon: ListPlus,        desc: 'Bank-generated questions' },
  { kind: 'homework',           label: 'Homework',          icon: Briefcase,       desc: 'Create or link a homework' },
  { kind: 'paper',              label: 'Paper',             icon: FileBarChart2,   desc: 'Test or exam paper' },
];

export function MaterialTypePicker({ onPick }: { onPick: (kind: LessonMaterialKind) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {TILES.map(({ kind, label, icon: Icon, desc }) => (
        <button key={kind} onClick={() => onPick(kind)} className="flex flex-col items-start gap-2 p-3 border rounded hover:bg-muted text-left">
          <Icon className="h-5 w-5 text-primary" />
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{desc}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `MaterialDrawer.tsx` orchestrator**

Reads `useLessonWorkspaceStore` for drawer state. If `kind === null`, renders `MaterialTypePicker`. Else dispatches to the kind-specific drawer body component.

```tsx
'use client';
import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
import { MaterialDrawerShell } from '../MaterialDrawerShell';
import { MaterialTypePicker } from '../MaterialTypePicker';
import { ReadingDrawer } from './ReadingDrawer';
import { WorksheetDrawer } from './WorksheetDrawer';
import { ActivityDrawer } from './ActivityDrawer';
import { NotesDrawer } from './NotesDrawer';
import { WorkedExampleDrawer } from './WorkedExampleDrawer';
import { QuizDrawer } from './QuizDrawer';
import { PracticeQuestionsDrawer } from './PracticeQuestionsDrawer';
import { HomeworkDrawer } from './HomeworkDrawer';
import { PaperDrawer } from './PaperDrawer';
import type { LessonMaterial } from '@/types/lesson';

interface Props {
  lessonId: string;
  addMaterial: (payload: Record<string, unknown>) => Promise<LessonMaterial>;
}

export function MaterialDrawer({ lessonId, addMaterial }: Props) {
  const { drawer, setKind, closeDrawer } = useLessonWorkspaceStore();

  const submit = async (payload: Record<string, unknown>) => {
    if (!drawer.phase) return;
    await addMaterial({ ...payload, phase: drawer.phase });
    closeDrawer();
  };

  const title = drawer.kind ? `Add ${drawer.kind.replace('_', ' ')}` : 'Add material';

  return (
    <MaterialDrawerShell open={drawer.open} onClose={closeDrawer} title={title}>
      {!drawer.kind && <MaterialTypePicker onPick={setKind} />}
      {drawer.kind === 'reading' && <ReadingDrawer onSubmit={submit} />}
      {drawer.kind === 'worksheet' && <WorksheetDrawer onSubmit={submit} />}
      {drawer.kind === 'activity' && <ActivityDrawer onSubmit={submit} />}
      {drawer.kind === 'notes' && <NotesDrawer onSubmit={submit} />}
      {drawer.kind === 'worked_example' && <WorkedExampleDrawer onSubmit={submit} />}
      {drawer.kind === 'quiz' && <QuizDrawer onSubmit={submit} />}
      {drawer.kind === 'practice_questions' && <PracticeQuestionsDrawer onSubmit={submit} />}
      {drawer.kind === 'homework' && <HomeworkDrawer onSubmit={submit} />}
      {drawer.kind === 'paper' && <PaperDrawer onSubmit={submit} />}
    </MaterialDrawerShell>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/lessons/MaterialDrawerShell.tsx src/components/lessons/MaterialTypePicker.tsx src/components/lessons/drawers/MaterialDrawer.tsx
git commit -m "feat(lesson): drawer shell + 9-tile type picker + drawer router"
```

---

## Task 18: ReadingDrawer + TextbookSourcePicker

**Files:**
- Create: `src/components/lessons/TextbookSourcePicker.tsx`
- Create: `src/components/lessons/drawers/ReadingDrawer.tsx`
- Create: `src/hooks/useTextbooks.ts` (if not present)

- [ ] **Step 1: `useTextbooks` hook (autocomplete-friendly)**

```ts
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

interface Textbook { _id: string; title: string; chapters: Array<{ _id: string; title: string }>; }

export function useTextbooks() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get('/textbooks')
      .then((res) => setTextbooks(unwrapList<Textbook>(res)))
      .catch(() => setTextbooks([]))
      .finally(() => setLoading(false));
  }, []);
  return { textbooks, loading };
}
```

- [ ] **Step 2: `TextbookSourcePicker.tsx`**

Toggle between "Internal CAPS textbook" and "External textbook":
- Internal: Select textbook → Select chapter → page start/end inputs.
- External: title (required), publisher, ISBN, page start/end, excerpt textarea (max 8000 chars; show char count).

Returns `TextbookRef` via `onChange`.

```tsx
'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTextbooks } from '@/hooks/useTextbooks';
import type { TextbookRef } from '@/types/lesson';

interface Props { value: TextbookRef | null; onChange: (v: TextbookRef) => void; }

export function TextbookSourcePicker({ value, onChange }: Props) {
  const { textbooks } = useTextbooks();
  const [source, setSource] = useState<'internal' | 'external'>(value?.source ?? 'internal');

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setSource('internal')} className={`flex-1 p-2 border rounded text-sm ${source === 'internal' ? 'border-primary bg-primary/5' : ''}`}>Internal CAPS</button>
        <button onClick={() => setSource('external')} className={`flex-1 p-2 border rounded text-sm ${source === 'external' ? 'border-primary bg-primary/5' : ''}`}>External</button>
      </div>

      {source === 'internal' && (
        <div className="space-y-2">
          <Label>Textbook</Label>
          <Select onValueChange={(textbookId) => onChange({ source: 'internal', textbookId })}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Pick a textbook" /></SelectTrigger>
            <SelectContent>{textbooks.map((tb) => <SelectItem key={tb._id} value={tb._id}>{tb.title}</SelectItem>)}</SelectContent>
          </Select>
          {/* Chapter + page inputs follow once a textbook is picked — same pattern */}
        </div>
      )}

      {source === 'external' && (
        <div className="space-y-2">
          <div><Label>Title <span className="text-destructive">*</span></Label>
            <Input onChange={(e) => onChange({ source: 'external', title: e.target.value })} />
          </div>
          {/* publisher, ISBN, pages, excerpt — same pattern */}
        </div>
      )}
    </div>
  );
}
```

(Skeleton above shows shape; flesh out with all fields per spec section 4.3 — under 250 lines.)

- [ ] **Step 3: `ReadingDrawer.tsx`**

Composes: title input, teacher notes input, `<TextbookSourcePicker>`, "Generate comprehension Qs" toggle (with count input 1–10). Footer: Cancel + Generate buttons.

On submit, builds payload:
```ts
{ kind: 'reading', title, teacherNotes, textbookRef, generateComprehension, comprehensionCount }
```

Show warning banner when source=external + no excerpt + comprehension toggled (per spec edge case).

- [ ] **Step 4: Commit**

```bash
git add src/components/lessons/TextbookSourcePicker.tsx src/components/lessons/drawers/ReadingDrawer.tsx src/hooks/useTextbooks.ts
git commit -m "feat(lesson): reading drawer with internal/external textbook picker"
```

---

## Task 19: Worksheet/Activity/Notes/WorkedExample drawers (shared base)

**Files:**
- Create: `src/components/lessons/drawers/ContentBackedDrawerBase.tsx`
- Create: `src/components/lessons/drawers/WorksheetDrawer.tsx`
- Create: `src/components/lessons/drawers/ActivityDrawer.tsx`
- Create: `src/components/lessons/drawers/NotesDrawer.tsx`
- Create: `src/components/lessons/drawers/WorkedExampleDrawer.tsx`

- [ ] **Step 1: Shared base**

```tsx
'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { LessonMaterialKind } from '@/types/lesson';

interface Props {
  kind: LessonMaterialKind;
  contentType: 'worksheet' | 'activity' | 'study_notes' | 'worked_example';
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

export function ContentBackedDrawerBase({ kind, contentType, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [teacherNotes, setNotes] = useState('');
  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({
        kind,
        title: title || `New ${kind}`,
        teacherNotes: teacherNotes || undefined,
        contentPayload: { type: contentType, prompt, difficulty },
      });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label>Teacher notes (optional)</Label><Textarea value={teacherNotes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div><Label>Generation prompt</Label><Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Create 5 questions on factorising trinomials" /></div>
      <div><Label>Difficulty</Label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full border rounded px-2 py-1">
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
      </div>
      <div className="flex justify-end pt-2">
        <Button disabled={busy} onClick={submit}>{busy ? 'Generating...' : 'Generate'}</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Four thin wrappers**

```tsx
// WorksheetDrawer.tsx
import { ContentBackedDrawerBase } from './ContentBackedDrawerBase';
export function WorksheetDrawer(props: { onSubmit: (p: Record<string, unknown>) => Promise<void> }) {
  return <ContentBackedDrawerBase kind="worksheet" contentType="worksheet" {...props} />;
}
```
Same shape for `ActivityDrawer` (`kind="activity"`, `contentType="activity"`), `NotesDrawer` (`kind="notes"`, `contentType="study_notes"`), `WorkedExampleDrawer` (`kind="worked_example"`, `contentType="worked_example"`).

- [ ] **Step 3: Commit**

```bash
git add src/components/lessons/drawers/ContentBackedDrawerBase.tsx src/components/lessons/drawers/{Worksheet,Activity,Notes,WorkedExample}Drawer.tsx
git commit -m "feat(lesson): worksheet/activity/notes/worked_example drawers (shared base)"
```

---

## Task 20: PracticeQuestionsDrawer

**Files:**
- Create: `src/components/lessons/drawers/PracticeQuestionsDrawer.tsx`

- [ ] **Step 1: Form**

Fields: title, teacher notes, count (1-50 number), question types (multi-select: mcq, true_false, short_answer, structured), cognitive level (recall/application/analysis), difficulty.

Submit payload:
```ts
{ kind: 'practice_questions', title, teacherNotes, questionPayload: { count, questionTypes, cognitiveLevel, difficulty } }
```

(Implementation skeleton — under 200 lines.)

- [ ] **Step 2: Commit**

```bash
git add src/components/lessons/drawers/PracticeQuestionsDrawer.tsx
git commit -m "feat(lesson): practice questions drawer"
```

---

## Task 21: QuizDrawer + HomeworkDrawer + PaperDrawer

**Files:**
- Create: `src/components/lessons/drawers/QuizDrawer.tsx`
- Create: `src/components/lessons/drawers/HomeworkDrawer.tsx`
- Create: `src/components/lessons/drawers/PaperDrawer.tsx`

- [ ] **Step 1: `QuizDrawer.tsx` — link existing only (v1)**

Fetch quizzes from `/learning/quizzes` (or wherever the Learning module lists them). Searchable Select. Submit payload:
```ts
{ kind: 'quiz', title, teacherNotes, quizId }
```

- [ ] **Step 2: `HomeworkDrawer.tsx` — create-or-link toggle**

Two modes via tabs:
- **Link existing**: searchable Select of homework from `/homework` filtered to lesson's class.
- **Create new**: inline form (type select: quiz/reading/exercise + minimal fields) → submits with `createPayload`. Reuses Module 4's homework wizard's Step 2 fields (resource pick / settings) but in a single scrollable form.

Submit payload (link mode):
```ts
{ kind: 'homework', title, teacherNotes, existingHomeworkId }
```
Submit payload (create mode):
```ts
{ kind: 'homework', title, teacherNotes, createPayload: { type, ...settings } }
```

- [ ] **Step 3: `PaperDrawer.tsx` — create-or-link toggle**

Same pattern as HomeworkDrawer, but for `AssessmentPaper`. Link mode → searchable Select from `/papers`. Create mode → inline minimal version of Module 2's wizard (paper type, sections, mark distribution).

Submit payload follows the homework pattern.

- [ ] **Step 4: Commit**

```bash
git add src/components/lessons/drawers/{Quiz,Homework,Paper}Drawer.tsx
git commit -m "feat(lesson): quiz/homework/paper drawers (link or create-inline)"
```

---

## Task 22: Quick Make rebrand

**Files:**
- Move: `src/app/(dashboard)/teacher/curriculum/ai-studio/page.tsx` → `src/app/(dashboard)/teacher/quick-make/page.tsx`
- Modify: the moved page (title + description + banner + Lesson Plan tile route)
- Modify: `src/lib/constants.ts` (`ROUTES` + `NAV_BY_ROLE`)
- Create: `src/app/(dashboard)/teacher/curriculum/ai-studio/page.tsx` (308 redirect shim)
- Create: `src/app/(dashboard)/teacher/ai-tools/page.tsx` if it routes to ai-studio (308 redirect shim)

- [ ] **Step 1: Move the file**

```bash
git mv src/app/\(dashboard\)/teacher/curriculum/ai-studio src/app/\(dashboard\)/teacher/quick-make
```

- [ ] **Step 2: Edit the moved page**

In `src/app/(dashboard)/teacher/quick-make/page.tsx`:
- Change page title to "Quick Make"
- Change description to: "Generate a single material without creating a Lesson. For richer lesson management, use the Lesson Workspace →"
- Add a banner card at the top:
  ```tsx
  <Card className="bg-primary/5 border-primary/20 p-4 flex items-center justify-between">
    <div>
      <h3 className="font-medium">Looking for the new Lesson Workspace?</h3>
      <p className="text-sm text-muted-foreground">Plan a complete lesson with all materials in one place.</p>
    </div>
    <Button asChild><Link href="/teacher/lessons">Open Workspace</Link></Button>
  </Card>
  ```
- Find the Lesson Plan tile click handler — change its action to `router.push('/teacher/lessons/new')` (instead of opening the legacy in-page wizard). Add badge text: "Legacy — opens the new Lesson Workspace".
- The other 4 tiles unchanged.

- [ ] **Step 3: Update constants**

In `src/lib/constants.ts`:

```ts
export const ROUTES = {
  // ... existing
  TEACHER_LESSONS: '/teacher/lessons',
  TEACHER_LESSON_NEW: '/teacher/lessons/new',
  TEACHER_QUICK_MAKE: '/teacher/quick-make',
  // KEEP: TEACHER_CURRICULUM_AI_STUDIO for the 308 shim
};
```

In `NAV_BY_ROLE['teacher']`:
- Find `{ label: 'AI Studio', href: ROUTES.TEACHER_CURRICULUM_AI_STUDIO, ... }`
- Replace with: `{ label: 'Quick Make', href: ROUTES.TEACHER_QUICK_MAKE, icon: Sparkles, badge: 'AI' }`
- Insert ABOVE it: `{ label: 'Lessons', href: ROUTES.TEACHER_LESSONS, icon: BookOpen }`

- [ ] **Step 4: Add 308 redirect shim at old URL**

`src/app/(dashboard)/teacher/curriculum/ai-studio/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
export default function AiStudioRedirect() {
  redirect('/teacher/quick-make');
}
```

(In Next.js 16 server components, `redirect()` issues a 307 by default — for permanent 308, use `permanentRedirect` from `'next/navigation'`.)

```tsx
import { permanentRedirect } from 'next/navigation';
export default function AiStudioRedirect() {
  permanentRedirect('/teacher/quick-make');
}
```

- [ ] **Step 5: Browser smoke**

- Visit `/teacher/curriculum/ai-studio` → expect redirect to `/teacher/quick-make`
- Confirm "Quick Make" page renders with banner + 5 tiles
- Click Lesson Plan tile → expect navigation to `/teacher/lessons/new`
- Sidebar shows "Lessons" + "Quick Make"

- [ ] **Step 6: Commit**

```bash
git add -A src/app/\(dashboard\)/teacher/quick-make src/app/\(dashboard\)/teacher/curriculum/ai-studio src/lib/constants.ts
git commit -m "refactor(quick-make): rebrand AI Studio + 308 redirect + workspace banner"
```

---

## Task 23: Lesson-plans → lessons 308 redirect + retire old hook/types

**Files:**
- Replace contents: `src/app/(dashboard)/teacher/lesson-plans/page.tsx`
- Replace contents: `src/app/(dashboard)/teacher/lesson-plans/[id]/page.tsx`
- Delete (after verifying no callers): `src/hooks/useTeacherLessonPlans.ts`
- Delete (after verifying no callers): `src/types/lesson-plans.ts`

- [ ] **Step 1: Redirect shims**

```tsx
// page.tsx
import { permanentRedirect } from 'next/navigation';
export default function LessonPlansRedirect() {
  permanentRedirect('/teacher/lessons');
}
```

```tsx
// [id]/page.tsx
import { permanentRedirect } from 'next/navigation';
export default function LessonPlanDetailRedirect({ params }: { params: { id: string } }) {
  permanentRedirect(`/teacher/lessons/${params.id}`);
}
```

(Adjust to Next.js 16's `params` async-await pattern if required.)

- [ ] **Step 2: Verify no live callers of `useTeacherLessonPlans`**

Run: `grep -r "useTeacherLessonPlans\|lesson-plans.ts" src/` — should return only the files about to be deleted (and the redirect shims, which import nothing).

- [ ] **Step 3: Delete retired files**

```bash
git rm src/hooks/useTeacherLessonPlans.ts src/types/lesson-plans.ts
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add -A src/app/\(dashboard\)/teacher/lesson-plans
git commit -m "refactor(lesson-plans): 308 redirect to /teacher/lessons + retire old hook/types"
```

---

## Task 24: SoC sweep + size sweep + acceptance smoke

- [ ] **Step 1: SoC sweep — no apiClient in pages/components**

Run:
```bash
grep -rn "from '@/lib/api-client'" src/app src/components | grep -v node_modules
```
Expected: zero matches (only hooks should import apiClient). If any leak, refactor into a hook.

- [ ] **Step 2: SoC sweep — no `: any` / `as any`**

Run:
```bash
grep -rn ": any\b\|as any\b" src/app src/components src/hooks src/types src/stores src/lib
```
Expected: zero matches (excluding intentionally typed external lib boundaries — flag any).

- [ ] **Step 3: SoC sweep — no `text-red-*` or `bg-red-*`**

Run:
```bash
grep -rn "text-red-\|bg-red-" src/app src/components
```
Expected: zero matches.

- [ ] **Step 4: Size sweep — every new file under 350 lines**

Run:
```bash
find src/app/\(dashboard\)/teacher/lessons src/app/\(dashboard\)/teacher/quick-make src/components/lessons src/hooks/useLesson*.ts src/stores/useLessonWorkspaceStore.ts -type f | xargs wc -l | sort -rn | head -20
```
Then for the backend:
```bash
find c:/Users/shaun/campusly-backend/src/modules/Lesson -type f | xargs wc -l | sort -rn
```
Expected: every file under 350. Split any offenders.

- [ ] **Step 5: Type-check both repos**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: both clean.

- [ ] **Step 6: Acceptance smoke (manual, in browser)**

Walk through every acceptance criterion from spec §14:
1. Create a new lesson via `/teacher/lessons/new` with AI scaffold; land on workspace.
2. Add a Worksheet via the Practice phase drawer; verify card appears.
3. Add a Reading material with internal textbook + comprehension toggle; verify Qs generate.
4. Add a Reading material with external textbook + excerpt; verify comprehension Qs.
5. Drag a card within a phase; confirm persistence on reload.
6. Export Teacher Pack; verify PDF downloads + has all material content + memos.
7. Export Student Pack; verify PDF has no answer keys.
8. Transition status draft → ready → taught.
9. Visit `/teacher/lesson-plans` → expect redirect to `/teacher/lessons`.
10. Confirm migrated LessonPlans appear in the list with `notes` + `homework` materials.
11. Visit `/teacher/curriculum/ai-studio` → expect redirect to `/teacher/quick-make`.
12. Click Lesson Plan tile in Quick Make → routed to `/teacher/lessons/new`.
13. Other Quick Make tiles still produce single artifacts.

- [ ] **Step 7: Commit any cleanup from sweeps**

```bash
git add -A
git commit -m "chore(lesson): SoC + size sweep + acceptance smoke"
```

---

## Done

All 24 tasks complete. Verify nothing left in `git status` is unintended. Module 5 ships.
