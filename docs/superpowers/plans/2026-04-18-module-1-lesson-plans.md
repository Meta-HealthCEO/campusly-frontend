# Module 1 — Lesson Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production-ready Lesson Plans module: solo teachers create CAPS-aligned lessons with structured homework (quiz/reading/exercise) and download a PDFKit-generated PDF.

**Architecture:** Backend-first. Refactor `Homework` model to a typed discriminated record. Require `curriculumTopicId` on `LessonPlan`. Add `homeworkIds[]` + `durationMinutes`. Build a server-side PDFKit generator. Front-end rebuilds the form with cascading Class→Subject→Topic, adds `HomeworkBuilder` component, replaces browser print with PDF download. MongoDB is standalone — no transactions — use sequential create + manual compensation.

**Tech Stack:** Node 20 / TypeScript 6, Mongoose 9, Express 5, PDFKit (backend); Next.js 16.2.1 / React 19, TanStack Table, React Hook Form + Zod, Axios (frontend). No test runners configured — verification is via curl, `docker exec campusly-mongo mongosh`, and browser smoke.

**Spec:** [docs/superpowers/specs/2026-04-18-module-1-lesson-plans-design.md](../specs/2026-04-18-module-1-lesson-plans-design.md)

---

## Conventions

- **Commits:** after each task, conventional commits (`feat(lesson-plans):`, `fix(homework):`, etc.).
- **Backend dev server:** must be running (`cd campusly-backend && npm run dev`) for curl verification.
- **Auth:** login as `admin@greenfieldprimary.co.za` / `Password1` to get a JWT. Store as `$TOKEN`.
- **Example IDs:** use real IDs from the seeded DB. School: `69ce960a98ca4ee738d25416` (Greenfield Primary).
- **Bash helper:** run all backend curl commands from bash with `TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@greenfieldprimary.co.za","password":"Password1"}' | jq -r .data.accessToken)` to get a fresh token.
- **File size limit:** every file touched must end under 350 lines.
- **No `any` types.** Every `catch (err)` must be `catch (err: unknown)`.

---

## File Structure

**Backend (`campusly-backend/src/modules/`):**

| File | Responsibility |
|---|---|
| `Homework/model.ts` | MODIFY: add `type` discriminator + typed refs; remove `description`, `resourceId`, `rubric` |
| `Homework/validation.ts` | MODIFY: conditional validation per `type` |
| `Homework/service.ts` | MODIFY: ensure create/update enforce discriminator consistency |
| `LessonPlan/model.ts` | MODIFY: require `curriculumTopicId`, add `durationMinutes`, `homeworkIds`; remove `homework` |
| `LessonPlan/validation.ts` | MODIFY: reflect model changes, add `stagedHomework` to create schema |
| `LessonPlan/service.ts` | MODIFY: `assertLessonPlanAccess` helper, `createLessonPlanWithStagedHomework`, cascade-delete |
| `LessonPlan/service-ai.ts` | MODIFY: structured `homeworkSuggestions` output contract |
| `LessonPlan/pdf-generator.ts` | CREATE: `generateLessonPlanPdf(plan, school, teacher): Promise<Buffer>` |
| `LessonPlan/controller.ts` | MODIFY: `getLessonPlanPdf`, `attachHomework`, `detachHomework` handlers |
| `LessonPlan/routes.ts` | MODIFY: `/:id/pdf`, `/:id/homework`, `/:id/homework/:homeworkId` |

**Frontend (`campusly-frontend/src/`):**

| File | Responsibility |
|---|---|
| `types/academic.ts` or `types/lesson-plans.ts` | MODIFY/CREATE: `LessonPlan` type updated; `Homework` discriminated-union type |
| `hooks/useTeacherLessonPlans.ts` | MODIFY: `downloadLessonPlanPdf`, `attachHomework`, `detachHomework`, AI handler |
| `components/lesson-plans/LessonPlanForm.tsx` | REWRITE (keep <350 lines): cascading picker, duration field, integrate HomeworkBuilder |
| `components/lesson-plans/HomeworkBuilder.tsx` | CREATE: typed builder with three pickers |
| `components/lesson-plans/pickers/QuizPicker.tsx` | CREATE: search-pick from `Quiz` records |
| `components/lesson-plans/pickers/ReadingPicker.tsx` | CREATE: search-pick from `ContentResource` + pageRange input |
| `components/lesson-plans/pickers/ExercisePicker.tsx` | CREATE: multi-select from Question Bank |
| `components/lesson-plans/LessonPlanDetailDialog.tsx` | MODIFY: remove `window.print`, add Download PDF, render structured homework |
| `app/(dashboard)/teacher/lesson-plans/page.tsx` | MODIFY: homework summary column, improved empty states |

---

## Task order (dependency-ordered)

1–6: Backend Homework refactor (foundation)
7–12: Backend LessonPlan model + service
13–15: PDF generator
16–18: New backend routes + AI update
19–21: Frontend types + hook
22–26: Frontend form + HomeworkBuilder + pickers
27–28: Detail dialog + list page
29: SoC sweep + acceptance verification

---

### Task 1: Refactor `Homework` model — add type discriminator + typed refs

**Files:**
- Modify: `campusly-backend/src/modules/Homework/model.ts`

- [ ] **Step 1: Write the smoke verification (current behavior)**

Run this to confirm the model currently accepts a description-only homework:
```bash
docker exec campusly-mongo mongosh campusly --quiet --eval '
db.homeworks.insertOne({
  title: "Pre-refactor test", description: "free text", subjectId: ObjectId(), classId: ObjectId(),
  schoolId: ObjectId(), teacherId: ObjectId(), totalMarks: 10, dueDate: new Date()
});
printjson(db.homeworks.findOne({title: "Pre-refactor test"}));
db.homeworks.deleteOne({title: "Pre-refactor test"});
'
```
Expected: inserts and prints the document (proves old model still works). This is the baseline.

- [ ] **Step 2: Modify the schema**

Replace the content of [Homework/model.ts](../../../../../campusly-backend/src/modules/Homework/model.ts) **only in the `IHomework` interface and `homeworkSchema`** (keep `HomeworkSubmission` unchanged):

```ts
export type HomeworkStatus = 'assigned' | 'closed';
export type HomeworkType = 'quiz' | 'reading' | 'exercise';

export interface IHomework extends Document {
  title: string;
  type: HomeworkType;
  // Type-specific refs
  quizId?: Types.ObjectId | null;
  contentResourceId?: Types.ObjectId | null;
  pageRange?: string | null;
  exerciseQuestionIds: Types.ObjectId[];
  // Context
  subjectId: Types.ObjectId;
  classId: Types.ObjectId;
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  dueDate: Date;
  totalMarks: number;
  status: HomeworkStatus;
  // Other
  attachments: string[];
  peerReviewEnabled: boolean;
  groupAssignment: boolean;
  maxFileSize?: number;
  allowedFileTypes: string[];
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
    peerReviewEnabled: { type: Boolean, default: false },
    groupAssignment: { type: Boolean, default: false },
    maxFileSize: { type: Number },
    allowedFileTypes: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

homeworkSchema.index({ classId: 1, subjectId: 1 });
homeworkSchema.index({ schoolId: 1, dueDate: -1 });
homeworkSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
homeworkSchema.index({ type: 1, schoolId: 1 });

export const Homework = mongoose.model<IHomework>('Homework', homeworkSchema);
```

Note: `HomeworkSubmission` model and schema are **unchanged** — keep everything below `Homework` export exactly as it was.

- [ ] **Step 3: Verify it compiles**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors (TypeScript compiles). If errors appear in files that import `IHomework` or `description`/`resourceId`/`rubric`, they will be fixed in Task 2.

- [ ] **Step 4: Verify the old document shape is now rejected**

```bash
docker exec campusly-mongo mongosh campusly --quiet --eval '
try {
  db.homeworks.insertOne({
    title: "Post-refactor test (no type)",
    subjectId: ObjectId(), classId: ObjectId(),
    schoolId: ObjectId(), teacherId: ObjectId(), totalMarks: 10, dueDate: new Date()
  });
  print("UNEXPECTED: insert succeeded without type");
} catch (e) {
  print("OK: rejected — " + e.message.split("\n")[0]);
}
db.homeworks.deleteMany({ title: /Post-refactor test/ });
'
```
Expected: Mongo driver still inserts (it does no app-level validation), but next task will make the service reject. This step documents that enforcement moves to the Zod validation layer.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/model.ts
git commit -m "feat(homework): refactor schema to typed discriminator (quiz|reading|exercise)

Removes free-text description, resourceId, rubric. Adds type discriminator
with typed refs: quizId, contentResourceId + pageRange, exerciseQuestionIds."
```

---

### Task 2: Update `Homework` validation + fix broken imports

**Files:**
- Modify: `campusly-backend/src/modules/Homework/validation.ts`
- Modify: `campusly-backend/src/modules/Homework/service.ts`
- Modify: any file that imports `description`, `resourceId`, or `rubric` from Homework

- [ ] **Step 1: Find broken imports**

```bash
cd c:/Users/shaun/campusly-backend
grep -rn "\.description\|resourceId\|\.rubric" src/modules/Homework/ src/modules/LessonPlan/ src/modules/Parent/ src/modules/Student/ | grep -v "//\|test"
```
Expected: lists every line that reads removed fields. Note each line — they will be fixed in Step 4.

- [ ] **Step 2: Rewrite `validation.ts`**

Replace `campusly-backend/src/modules/Homework/validation.ts` with:

```ts
import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

const baseHomeworkFields = {
  title: z.string().min(1).max(200),
  subjectId: objectIdSchema,
  classId: objectIdSchema,
  schoolId: objectIdSchema,
  dueDate: z.string().datetime(),
  totalMarks: z.number().int().min(0).max(1000),
  attachments: z.array(z.string().url()).max(20).optional(),
  peerReviewEnabled: z.boolean().optional(),
  groupAssignment: z.boolean().optional(),
  allowedFileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().int().positive().optional(),
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
  dueDate: z.string().datetime().optional(),
  totalMarks: z.number().int().min(0).max(1000).optional(),
  status: z.enum(['assigned', 'closed']).optional(),
  pageRange: z.string().max(50).optional(),
});

export type CreateHomeworkInput = z.infer<typeof createHomeworkSchema>;
export type UpdateHomeworkInput = z.infer<typeof updateHomeworkSchema>;
```

- [ ] **Step 3: Update `Homework/service.ts` — remove references to `description`/`resourceId`/`rubric`**

Open [Homework/service.ts](../../../../../campusly-backend/src/modules/Homework/service.ts). For every reference to `description`, `resourceId`, or `rubric`:
- If it's in a `.create()` call: remove the property from the input object.
- If it's in a `.populate('resourceId', ...)` call: change to `.populate('contentResourceId', ...)`.
- If it's in a response builder: remove the field; add `type` and the type-specific refs.

If any function's signature takes `description`/`resourceId`/`rubric` as parameters, update the signature to take `type` + typed refs instead.

- [ ] **Step 4: Update all cross-module consumers found in Step 1**

For each file/line reported in Step 1, apply the fix. The most common patterns:

In service or controller code that **reads** homework:
```ts
// before
{ description: hw.description, resourceId: hw.resourceId }
// after
{ type: hw.type, quizId: hw.quizId, contentResourceId: hw.contentResourceId, pageRange: hw.pageRange, exerciseQuestionIds: hw.exerciseQuestionIds }
```

In a Zod schema that validated `description`:
```ts
// remove the line entirely
```

- [ ] **Step 5: Verify it all compiles**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors. If errors persist, re-grep and fix.

- [ ] **Step 6: Smoke-test create endpoint with each type**

Start the dev server in another terminal: `cd campusly-backend && npm run dev`

```bash
TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@greenfieldprimary.co.za","password":"Password1"}' | jq -r .data.accessToken)
SCHOOL=69ce960a98ca4ee738d25416
SUBJECT=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/academic/subjects | jq -r '.data[0]._id')
CLASS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/academic/classes | jq -r '.data[0]._id')

# Should FAIL (missing type)
curl -s -X POST http://localhost:4500/api/homework -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"title\":\"T\",\"subjectId\":\"$SUBJECT\",\"classId\":\"$CLASS\",\"schoolId\":\"$SCHOOL\",\"dueDate\":\"2026-05-01T00:00:00.000Z\",\"totalMarks\":10}" | jq .
```
Expected: 400 validation error (missing `type`).

- [ ] **Step 7: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Homework/validation.ts src/modules/Homework/service.ts
# plus any other consumers touched:
git add -u
git commit -m "feat(homework): enforce typed discriminator via Zod validation

Adds discriminated union (quiz|reading|exercise) with conditional refs.
Removes description, resourceId, rubric references across modules."
```

---

### Task 3: Extract `assertLessonPlanAccess` helper in LessonPlan service

**Files:**
- Modify: `campusly-backend/src/modules/LessonPlan/service.ts`

- [ ] **Step 1: Locate current ownership check**

Open [LessonPlan/service.ts](../../../../../campusly-backend/src/modules/LessonPlan/service.ts). Find the duplicated ownership check — it appears inside `updateLessonPlan` and `deleteLessonPlan` around lines 94-95 and 128-129. The pattern is:

```ts
if (plan.teacherId.toString() !== user.id && user.role !== 'school_admin' && user.role !== 'super_admin') {
  throw new ForbiddenError('Not authorized');
}
```

- [ ] **Step 2: Write the helper**

Add near the top of `LessonPlan/service.ts`, after imports:

```ts
import { ForbiddenError, NotFoundError } from '../../common/errors.js';
import type { ILessonPlan } from './model.js';
import type { AuthenticatedUser } from '../../middleware/auth.js';

export function assertLessonPlanAccess(plan: ILessonPlan, user: AuthenticatedUser): void {
  const isOwner = plan.teacherId.toString() === user.id;
  const isAdmin = user.role === 'school_admin' || user.role === 'super_admin';
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('Not authorized to access this lesson plan');
  }
}
```

(Adjust import paths to match the codebase. If `AuthenticatedUser` is not an existing export, use the inline type the other service functions already use.)

- [ ] **Step 3: Replace the inline checks with the helper**

In `updateLessonPlan` and `deleteLessonPlan`, replace the ownership block:

```ts
// before
if (plan.teacherId.toString() !== user.id && user.role !== 'school_admin') { ... }

// after
assertLessonPlanAccess(plan, user);
```

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Smoke-test that update still respects ownership**

```bash
# as Greenfield admin: should succeed
TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@greenfieldprimary.co.za","password":"Password1"}' | jq -r .data.accessToken)
# (placeholder — we don't have a lesson plan yet; just verify the dev server didn't crash after the edit)
curl -s http://localhost:4500/api/lesson-plans -H "Authorization: Bearer $TOKEN" | jq '.data | length'
```
Expected: returns `0` (no plans yet) without server error.

- [ ] **Step 6: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/LessonPlan/service.ts
git commit -m "refactor(lesson-plans): extract assertLessonPlanAccess helper

DRY — removes three copies of the same ownership check."
```

---

### Task 4: Refactor `LessonPlan` model — require topic, add duration + homeworkIds

**Files:**
- Modify: `campusly-backend/src/modules/LessonPlan/model.ts`

- [ ] **Step 1: Apply schema changes**

Open [LessonPlan/model.ts](../../../../../campusly-backend/src/modules/LessonPlan/model.ts). Make four changes:

1. Add to `ILessonPlan` interface: `durationMinutes: number;` and `homeworkIds: Types.ObjectId[];`.
2. Remove from interface: `homework?: string;`.
3. In the schema:
   - Change `curriculumTopicId` from `required: false` to `required: true`:
     ```ts
     curriculumTopicId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', required: true }
     ```
   - Add after `curriculumTopicId`:
     ```ts
     durationMinutes: { type: Number, default: 45, min: 5, max: 240 },
     homeworkIds: { type: [Schema.Types.ObjectId], ref: 'Homework', default: [] },
     ```
   - Remove the `homework: { type: String }` field entirely.

- [ ] **Step 2: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: errors in `service.ts` and `service-ai.ts` where they reference the removed `homework` field. Those are fixed in Tasks 5 and 11.

- [ ] **Step 3: Verify the change via model inspection**

```bash
cd c:/Users/shaun/campusly-backend
node --input-type=module -e "import('./dist/modules/LessonPlan/model.js').catch(() => import('./src/modules/LessonPlan/model.ts')).then(m => console.log(Object.keys(m.LessonPlan.schema.paths).sort().join('\n')))" 2>/dev/null || \
  grep -E "(durationMinutes|homeworkIds|curriculumTopicId.*required)" src/modules/LessonPlan/model.ts
```
Expected: shows the three changed/added fields.

- [ ] **Step 4: Commit** (will not compile yet — this is a deliberate checkpoint; Task 5 makes it compile)

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/LessonPlan/model.ts
git commit -m "feat(lesson-plans): require curriculumTopicId, add durationMinutes + homeworkIds

Removes free-text homework field. homeworkIds is now the canonical link
to structured Homework records."
```

---

### Task 5: Update `LessonPlan` service to support new fields + cascade delete

**Files:**
- Modify: `campusly-backend/src/modules/LessonPlan/service.ts`

- [ ] **Step 1: Update `createLessonPlan` to remove `homework` references**

In `createLessonPlan`, remove any `homework: input.homework` line. Accept `durationMinutes` and `homeworkIds` from input. Example of the create body:

```ts
const plan = await LessonPlan.create({
  teacherId: user.id,
  schoolId: input.schoolId,
  subjectId: input.subjectId,
  classId: input.classId,
  curriculumTopicId: input.curriculumTopicId,
  date: input.date,
  topic: input.topic,
  durationMinutes: input.durationMinutes ?? 45,
  objectives: input.objectives ?? [],
  activities: input.activities ?? [],
  resources: input.resources ?? [],
  homeworkIds: input.homeworkIds ?? [],
  reflectionNotes: input.reflectionNotes,
  aiGenerated: input.aiGenerated ?? false,
});
```

- [ ] **Step 2: Add `createLessonPlanWithStagedHomework` (compensation flow)**

Add a new exported function:

```ts
import { Homework } from '../Homework/model.js';
import type { CreateHomeworkInput } from '../Homework/validation.js';

export async function createLessonPlanWithStagedHomework(
  input: CreateLessonPlanInput & { stagedHomework?: CreateHomeworkInput[] },
  user: AuthenticatedUser,
): Promise<ILessonPlan> {
  const staged = input.stagedHomework ?? [];
  const createdHomeworkIds: mongoose.Types.ObjectId[] = [];

  // Phase 1: create homework records
  try {
    for (const hw of staged) {
      const doc = await Homework.create({
        ...hw,
        teacherId: user.id,
      });
      createdHomeworkIds.push(doc._id as mongoose.Types.ObjectId);
    }
  } catch (err: unknown) {
    // Compensate: soft-delete any that were created
    if (createdHomeworkIds.length) {
      await Homework.updateMany(
        { _id: { $in: createdHomeworkIds } },
        { $set: { isDeleted: true } },
      );
    }
    throw err;
  }

  // Phase 2: create the lesson plan
  try {
    const plan = await createLessonPlan(
      { ...input, homeworkIds: createdHomeworkIds.map((id) => id.toString()) },
      user,
    );
    return plan;
  } catch (err: unknown) {
    // Compensate: soft-delete all created homework
    if (createdHomeworkIds.length) {
      await Homework.updateMany(
        { _id: { $in: createdHomeworkIds } },
        { $set: { isDeleted: true } },
      );
    }
    throw err;
  }
}
```

- [ ] **Step 3: Update `deleteLessonPlan` to cascade-soft-delete homework**

Modify the existing `deleteLessonPlan` function:

```ts
export async function deleteLessonPlan(id: string, user: AuthenticatedUser): Promise<void> {
  const plan = await LessonPlan.findOne({ _id: id, isDeleted: false });
  if (!plan) throw new NotFoundError('Lesson plan not found');
  assertLessonPlanAccess(plan, user);

  plan.isDeleted = true;
  await plan.save();

  // Cascade: soft-delete attached homework (preserves submissions)
  if (plan.homeworkIds.length) {
    await Homework.updateMany(
      { _id: { $in: plan.homeworkIds }, isDeleted: false },
      { $set: { isDeleted: true } },
    );
  }
}
```

- [ ] **Step 4: Add grade-topic coherence check to `createLessonPlan` and `updateLessonPlan`**

Before creating/updating, validate the class's grade matches the topic's grade. Add near the input validation:

```ts
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { Class } from '../Academic/model.js';

async function assertTopicMatchesClassGrade(
  curriculumTopicId: string,
  classId: string,
  schoolId: string,
): Promise<void> {
  const [topic, cls] = await Promise.all([
    CurriculumNode.findOne({ _id: curriculumTopicId, isDeleted: false }),
    Class.findOne({ _id: classId, schoolId, isDeleted: false }).populate('gradeId', 'name'),
  ]);
  if (!topic) throw new BadRequestError('Curriculum topic not found');
  if (!cls) throw new BadRequestError('Class not found');

  // Traverse ancestors to find the grade node
  let gradeNode = topic;
  while (gradeNode && gradeNode.type !== 'grade' && gradeNode.parentId) {
    const parent = await CurriculumNode.findById(gradeNode.parentId);
    if (!parent) break;
    gradeNode = parent;
  }

  const classGradeName = (cls.gradeId as unknown as { name: string } | null)?.name;
  if (gradeNode?.type === 'grade' && classGradeName && gradeNode.title !== classGradeName) {
    throw new BadRequestError(
      `Curriculum topic is for ${gradeNode.title}, but class is ${classGradeName}`,
    );
  }
}
```

Call it at the top of `createLessonPlan` and in `updateLessonPlan` when `curriculumTopicId` or `classId` changes.

- [ ] **Step 5: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 6: Smoke-test cascade delete**

```bash
TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@greenfieldprimary.co.za","password":"Password1"}' | jq -r .data.accessToken)

# (This test requires Task 8+ to create plans via API. For now, just confirm the function exists:)
grep -q "createLessonPlanWithStagedHomework" src/modules/LessonPlan/service.ts && echo OK
```
Expected: `OK`.

- [ ] **Step 7: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/LessonPlan/service.ts
git commit -m "feat(lesson-plans): add staged-homework compensation flow + cascade delete

createLessonPlanWithStagedHomework creates homework records first, then
the plan; on any failure, soft-deletes any already-created homework.
deleteLessonPlan now cascades to attached homework (submissions preserved).
Adds grade-topic coherence check."
```

---

### Task 6: Update `LessonPlan` Zod validation

**Files:**
- Modify: `campusly-backend/src/modules/LessonPlan/validation.ts`

- [ ] **Step 1: Rewrite the validation schemas**

Open [LessonPlan/validation.ts](../../../../../campusly-backend/src/modules/LessonPlan/validation.ts) and replace with:

```ts
import { z } from 'zod';
import { createHomeworkSchema } from '../Homework/validation.js';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// Staged homework: a homework input without teacherId/schoolId (service fills those)
// and without classId/subjectId (inherited from the lesson plan).
const stagedHomeworkSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('quiz'),
    title: z.string().min(1).max(200),
    quizId: objectIdSchema,
    dueDate: z.string().datetime(),
    totalMarks: z.number().int().min(0).max(1000),
  }),
  z.object({
    type: z.literal('reading'),
    title: z.string().min(1).max(200),
    contentResourceId: objectIdSchema,
    pageRange: z.string().max(50).optional(),
    dueDate: z.string().datetime(),
    totalMarks: z.number().int().min(0).max(1000).default(0),
  }),
  z.object({
    type: z.literal('exercise'),
    title: z.string().min(1).max(200),
    exerciseQuestionIds: z.array(objectIdSchema).min(1).max(100),
    dueDate: z.string().datetime(),
    totalMarks: z.number().int().min(0).max(1000),
  }),
]);

export const createLessonPlanSchema = z.object({
  schoolId: objectIdSchema,
  subjectId: objectIdSchema,
  classId: objectIdSchema,
  curriculumTopicId: objectIdSchema, // REQUIRED
  date: z.string().datetime(),
  topic: z.string().min(1).max(200),
  durationMinutes: z.number().int().min(5).max(240).default(45),
  objectives: z.array(z.string().min(1).max(500)).max(20).optional(),
  activities: z.array(z.string().min(1).max(1000)).max(20).optional(),
  resources: z.array(z.string().min(1).max(500)).max(20).optional(),
  reflectionNotes: z.string().max(5000).optional(),
  aiGenerated: z.boolean().optional(),
  stagedHomework: z.array(stagedHomeworkSchema).max(10).optional(),
});

export const updateLessonPlanSchema = createLessonPlanSchema.partial();

export const aiGenerateLessonPlanSchema = z.object({
  curriculumTopicId: objectIdSchema,
  classId: objectIdSchema,
  subjectId: objectIdSchema,
  schoolId: objectIdSchema,
  date: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(240).optional(),
});

export type CreateLessonPlanInput = z.infer<typeof createLessonPlanSchema>;
export type UpdateLessonPlanInput = z.infer<typeof updateLessonPlanSchema>;
export type AIGenerateLessonPlanInput = z.infer<typeof aiGenerateLessonPlanSchema>;
export type StagedHomeworkInput = z.infer<typeof stagedHomeworkSchema>;
```

- [ ] **Step 2: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Smoke-test — create without curriculumTopicId must fail**

```bash
TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@greenfieldprimary.co.za","password":"Password1"}' | jq -r .data.accessToken)
SCHOOL=69ce960a98ca4ee738d25416
SUBJECT=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/academic/subjects | jq -r '.data[0]._id')
CLASS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/academic/classes | jq -r '.data[0]._id')

curl -s -X POST http://localhost:4500/api/lesson-plans -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"schoolId\":\"$SCHOOL\",\"subjectId\":\"$SUBJECT\",\"classId\":\"$CLASS\",\"date\":\"2026-05-01T00:00:00.000Z\",\"topic\":\"Test\"}" | jq .
```
Expected: 400 validation error — `curriculumTopicId` required.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/LessonPlan/validation.ts
git commit -m "feat(lesson-plans): require curriculumTopicId, add durationMinutes + stagedHomework

Staged-homework input is a constrained subset of createHomeworkSchema,
omitting classId/subjectId (inherited from the parent plan)."
```

---

### Task 7: PDF generator — `generateLessonPlanPdf`

**Files:**
- Create: `campusly-backend/src/modules/LessonPlan/pdf-generator.ts`

- [ ] **Step 1: Write the generator**

Create `campusly-backend/src/modules/LessonPlan/pdf-generator.ts`:

```ts
import PDFDocument from 'pdfkit';
import type { ILessonPlan } from './model.js';
import type { ISchool } from '../School/model.js';
import type { IUser } from '../Auth/model.js';
import type { IHomework, HomeworkType } from '../Homework/model.js';

interface PopulatedPlan extends Omit<ILessonPlan, 'subjectId' | 'classId' | 'curriculumTopicId' | 'homeworkIds'> {
  subjectId: { name: string; code?: string };
  classId: { name: string };
  curriculumTopicId: { title: string; code?: string; description?: string } | null;
  homeworkIds: IHomework[];
}

const GRAY = '#666666';
const BLACK = '#000000';

export async function generateLessonPlanPdf(
  plan: PopulatedPlan,
  school: Pick<ISchool, 'name'>,
  teacher: Pick<IUser, 'firstName' | 'lastName'>,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 42 }); // ~15mm
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  // Header: school name
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text(school.name, { align: 'left' });
  doc.moveDown(0.2);
  doc.moveTo(42, doc.y).lineTo(553, doc.y).strokeColor(GRAY).stroke();
  doc.moveDown(0.8);

  // Title block
  doc.font('Helvetica-Bold').fontSize(18).fillColor(BLACK).text(plan.topic);
  if (plan.curriculumTopicId) {
    doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(
      `CAPS: ${plan.curriculumTopicId.title}${plan.curriculumTopicId.code ? ' (' + plan.curriculumTopicId.code + ')' : ''}`,
    );
  }
  doc.moveDown(0.5);

  // Meta row
  const date = new Date(plan.date).toISOString().slice(0, 10);
  const teacherName = `${teacher.firstName} ${teacher.lastName}`;
  doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(
    [
      teacherName,
      plan.classId.name,
      plan.subjectId.name,
      date,
      `${plan.durationMinutes} min`,
    ].join('  \u2022  '),
  );
  doc.moveDown(1);

  // Sections
  renderSection(doc, 'Lesson Objectives', plan.objectives, 'bullet');
  renderSection(doc, 'Activities', plan.activities, 'numbered');
  renderSection(doc, 'Resources', plan.resources, 'bullet');
  renderHomeworkSection(doc, plan.homeworkIds);

  // Footer on last page
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(pages.start + i);
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(
      `Generated by Campusly  \u2022  page ${i + 1} of ${pages.count}`,
      42,
      doc.page.height - 30,
      { align: 'center', width: 511 },
    );
  }

  doc.end();
  return done;
}

function renderSection(
  doc: PDFKit.PDFDocument,
  heading: string,
  items: string[] | undefined,
  style: 'bullet' | 'numbered',
): void {
  if (!items || items.length === 0) return;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BLACK).text(heading);
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(11);
  items.forEach((item, i) => {
    const prefix = style === 'numbered' ? `${i + 1}. ` : '\u2022  ';
    doc.text(prefix + item, { indent: 10 });
  });
  doc.moveDown(0.8);
}

function renderHomeworkSection(doc: PDFKit.PDFDocument, homework: IHomework[]): void {
  if (!homework || homework.length === 0) return;
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BLACK).text('Homework');
  doc.moveDown(0.3);

  const groups: Record<HomeworkType, IHomework[]> = {
    quiz: homework.filter((h) => h.type === 'quiz'),
    reading: homework.filter((h) => h.type === 'reading'),
    exercise: homework.filter((h) => h.type === 'exercise'),
  };

  const labels: Record<HomeworkType, string> = {
    quiz: 'Quiz',
    reading: 'Reading',
    exercise: 'Exercise',
  };

  (['quiz', 'reading', 'exercise'] as HomeworkType[]).forEach((type) => {
    if (groups[type].length === 0) return;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(BLACK).text(labels[type] + ':');
    doc.font('Helvetica').fontSize(11).fillColor(BLACK);
    groups[type].forEach((hw) => {
      const details = detailForHomework(hw);
      doc.text(`\u2022  ${hw.title}${details ? ' — ' + details : ''}`, { indent: 10 });
    });
    doc.moveDown(0.4);
  });
  doc.moveDown(0.4);
}

function detailForHomework(hw: IHomework): string {
  if (hw.type === 'reading' && hw.pageRange) return `pp. ${hw.pageRange}`;
  if (hw.type === 'exercise') return `${hw.exerciseQuestionIds.length} question(s)`;
  return '';
}
```

- [ ] **Step 2: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Smoke-test the generator in isolation**

```bash
cd c:/Users/shaun/campusly-backend
cat > /tmp/pdf-smoke.ts <<'EOF'
import { generateLessonPlanPdf } from './src/modules/LessonPlan/pdf-generator.js';
import { writeFileSync } from 'fs';

const plan = {
  topic: 'Fractions — Intro',
  date: new Date('2026-05-01'),
  durationMinutes: 45,
  objectives: ['Understand numerators and denominators', 'Simplify fractions'],
  activities: ['Warm-up game', 'Group work with fraction cards'],
  resources: ['Maths textbook Gr 4 Ch 3', 'Fraction cards'],
  subjectId: { name: 'Mathematics', code: 'MAT' },
  classId: { name: 'Grade 4 - A' },
  curriculumTopicId: { title: 'Fractions', code: 'CAPS-MAT-GR4-FRAC' },
  homeworkIds: [
    { type: 'reading', title: 'Chapter 3 read', pageRange: '42-48', exerciseQuestionIds: [] },
    { type: 'exercise', title: 'Simplify 10 fractions', exerciseQuestionIds: ['a','b','c','d','e','f','g','h','i','j'] },
  ],
  reflectionNotes: '',
} as unknown as Parameters<typeof generateLessonPlanPdf>[0];

const buf = await generateLessonPlanPdf(plan, { name: 'Greenfield Primary' }, { firstName: 'Thandi', lastName: 'Molefe' });
writeFileSync('/tmp/lesson.pdf', buf);
console.log('bytes:', buf.length, 'starts:', buf.slice(0, 4).toString());
EOF
npx tsx /tmp/pdf-smoke.ts
```
Expected: prints `bytes: <number>` and `starts: %PDF` (the PDF magic header). Open `/tmp/lesson.pdf` in a viewer and eyeball the layout.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/LessonPlan/pdf-generator.ts
git commit -m "feat(lesson-plans): server-side PDFKit generator

Programmatic A4 layout with header, title, meta, objectives, activities,
resources, grouped homework. Reflection notes excluded. No HTML-to-PDF."
```

---

### Task 8: Wire the PDF route + attach/detach homework routes

**Files:**
- Modify: `campusly-backend/src/modules/LessonPlan/controller.ts`
- Modify: `campusly-backend/src/modules/LessonPlan/routes.ts`
- Modify: `campusly-backend/src/modules/LessonPlan/service.ts`

- [ ] **Step 1: Add service-level helpers**

In `LessonPlan/service.ts`, add:

```ts
import { School } from '../School/model.js';
import { User } from '../Auth/model.js';
import { generateLessonPlanPdf } from './pdf-generator.js';

export async function getLessonPlanPdfBuffer(id: string, user: AuthenticatedUser): Promise<Buffer> {
  const plan = await LessonPlan.findOne({ _id: id, isDeleted: false })
    .populate('subjectId', 'name code')
    .populate('classId', 'name')
    .populate('curriculumTopicId', 'title code description')
    .populate({ path: 'homeworkIds', match: { isDeleted: false } });
  if (!plan) throw new NotFoundError('Lesson plan not found');
  assertLessonPlanAccess(plan, user);

  const [school, teacher] = await Promise.all([
    School.findById(plan.schoolId).select('name'),
    User.findById(plan.teacherId).select('firstName lastName'),
  ]);
  if (!school || !teacher) throw new NotFoundError('School or teacher missing');

  return generateLessonPlanPdf(plan as never, school, teacher);
}

export async function attachHomeworkToLessonPlan(
  planId: string,
  input: CreateHomeworkInput,
  user: AuthenticatedUser,
): Promise<IHomework> {
  const plan = await LessonPlan.findOne({ _id: planId, isDeleted: false });
  if (!plan) throw new NotFoundError('Lesson plan not found');
  assertLessonPlanAccess(plan, user);

  const hw = await Homework.create({ ...input, teacherId: user.id });
  plan.homeworkIds.push(hw._id as mongoose.Types.ObjectId);
  await plan.save();
  return hw;
}

export async function detachHomeworkFromLessonPlan(
  planId: string,
  homeworkId: string,
  user: AuthenticatedUser,
): Promise<void> {
  const plan = await LessonPlan.findOne({ _id: planId, isDeleted: false });
  if (!plan) throw new NotFoundError('Lesson plan not found');
  assertLessonPlanAccess(plan, user);

  plan.homeworkIds = plan.homeworkIds.filter((id) => id.toString() !== homeworkId);
  await plan.save();
  await Homework.updateOne({ _id: homeworkId }, { $set: { isDeleted: true } });
}
```

Also update `createLessonPlan` to delegate to `createLessonPlanWithStagedHomework` when `input.stagedHomework` is present. Or simpler: in the controller, call the compensation version when `stagedHomework` is non-empty.

- [ ] **Step 2: Add controller handlers**

In `LessonPlan/controller.ts`:

```ts
import {
  getLessonPlanPdfBuffer,
  attachHomeworkToLessonPlan,
  detachHomeworkFromLessonPlan,
  createLessonPlanWithStagedHomework,
} from './service.js';
import { createHomeworkSchema } from '../Homework/validation.js';
import { apiResponse } from '../../common/utils.js';

export async function getLessonPlanPdf(req: Request, res: Response): Promise<void> {
  const buf = await getLessonPlanPdfBuffer(req.params.id, req.user!);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="lesson-plan-${req.params.id}.pdf"`);
  res.send(buf);
}

export async function postAttachHomework(req: Request, res: Response): Promise<void> {
  const parsed = createHomeworkSchema.parse({
    ...req.body,
    schoolId: req.body.schoolId, // staged-like payload; classId/subjectId must come from plan
  });
  const hw = await attachHomeworkToLessonPlan(req.params.id, parsed, req.user!);
  res.status(201).json(apiResponse(hw));
}

export async function deleteDetachHomework(req: Request, res: Response): Promise<void> {
  await detachHomeworkFromLessonPlan(req.params.id, req.params.homeworkId, req.user!);
  res.status(204).end();
}
```

Also update the existing `postLessonPlan` controller to check for `stagedHomework` and call the compensation service if present.

- [ ] **Step 3: Register routes**

In `LessonPlan/routes.ts`:

```ts
router.get('/:id/pdf', auth, rbac(['teacher', 'school_admin', 'super_admin']), asyncHandler(getLessonPlanPdf));
router.post('/:id/homework', auth, rbac(['teacher', 'school_admin', 'super_admin']), asyncHandler(postAttachHomework));
router.delete('/:id/homework/:homeworkId', auth, rbac(['teacher', 'school_admin', 'super_admin']), asyncHandler(deleteDetachHomework));
```

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: End-to-end smoke via curl**

```bash
# Restart dev server if needed
TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@greenfieldprimary.co.za","password":"Password1"}' | jq -r .data.accessToken)
SCHOOL=69ce960a98ca4ee738d25416
SUBJECT=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/academic/subjects | jq -r '.data[0]._id')
CLASS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/academic/classes | jq -r '.data[0]._id')
TOPIC=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4500/api/curriculum-structure/nodes?type=topic&subjectId=$SUBJECT" | jq -r '.data[0]._id')

# Create a plan
PLAN=$(curl -s -X POST http://localhost:4500/api/lesson-plans -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"schoolId\":\"$SCHOOL\",\"subjectId\":\"$SUBJECT\",\"classId\":\"$CLASS\",\"curriculumTopicId\":\"$TOPIC\",\"date\":\"2026-05-01T00:00:00.000Z\",\"topic\":\"Smoke test\",\"durationMinutes\":45}" | jq -r '.data._id')
echo "Plan: $PLAN"

# Download PDF
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4500/api/lesson-plans/$PLAN/pdf" -o /tmp/plan.pdf
head -c 4 /tmp/plan.pdf  # should print %PDF
echo ""
ls -la /tmp/plan.pdf
```
Expected: prints `%PDF`, file size > 1 KB.

- [ ] **Step 6: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/LessonPlan/service.ts src/modules/LessonPlan/controller.ts src/modules/LessonPlan/routes.ts
git commit -m "feat(lesson-plans): PDF endpoint + attach/detach homework routes

GET /lesson-plans/:id/pdf streams application/pdf.
POST /lesson-plans/:id/homework creates typed Homework + appends to plan.
DELETE /lesson-plans/:id/homework/:homeworkId detaches + soft-deletes."
```

---

### Task 9: Update AI generator to output structured homework suggestions

**Files:**
- Modify: `campusly-backend/src/modules/LessonPlan/service-ai.ts`

- [ ] **Step 1: Update the response type + prompt**

Open [LessonPlan/service-ai.ts](../../../../../campusly-backend/src/modules/LessonPlan/service-ai.ts). Find the `GeneratedDraft` type and the prompt strings.

Replace the type:

```ts
export type HomeworkSuggestion =
  | { type: 'quiz'; title: string; questionCount: number; topicHint: string }
  | { type: 'reading'; title: string; pageRangeHint?: string; topicHint: string }
  | { type: 'exercise'; title: string; questionCount: number; topicHint: string };

export interface GeneratedDraft {
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homeworkSuggestions: HomeworkSuggestion[];
}
```

Replace the user-prompt block that asks for `homework?: string` with instructions that request structured suggestions:

```ts
const userPrompt = `
You are drafting a single lesson plan for a South African CAPS-aligned classroom.

Topic: ${topic.title}
CAPS reference: ${topic.metadata?.capsReference ?? '(none)'}
Assessment standards: ${(topic.metadata?.assessmentStandards ?? []).join('; ') || '(none)'}
Duration: ${durationMinutes} minutes

Return JSON with this exact shape (do not include real IDs — you do not know the teacher's DB):
{
  "topic": string,
  "objectives": string[] (3-5 items),
  "activities": string[] (3-6 items, each ~1 sentence),
  "resources": string[] (2-4 items, e.g. textbook names, printables),
  "homeworkSuggestions": Array<
    | { "type": "reading", "title": string, "pageRangeHint": string, "topicHint": string }
    | { "type": "exercise", "title": string, "questionCount": number, "topicHint": string }
    | { "type": "quiz", "title": string, "questionCount": number, "topicHint": string }
  > (0-3 suggestions; prefer reading + exercise over quiz for primary grades)
}

topicHint: a short phrase the teacher can search for when picking a real resource/question/quiz.
`;
```

- [ ] **Step 2: Update the JSON parser to validate the new shape**

After `JSON.parse(...)`, validate with Zod:

```ts
import { z } from 'zod';

const draftSchema = z.object({
  topic: z.string(),
  objectives: z.array(z.string()),
  activities: z.array(z.string()),
  resources: z.array(z.string()),
  homeworkSuggestions: z.array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('reading'), title: z.string(), pageRangeHint: z.string().optional(), topicHint: z.string() }),
      z.object({ type: z.literal('exercise'), title: z.string(), questionCount: z.number(), topicHint: z.string() }),
      z.object({ type: z.literal('quiz'), title: z.string(), questionCount: z.number(), topicHint: z.string() }),
    ]),
  ).default([]),
});

const parsed = draftSchema.parse(JSON.parse(rawResponseText));
```

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Smoke-test AI generate**

```bash
TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@greenfieldprimary.co.za","password":"Password1"}' | jq -r .data.accessToken)
SCHOOL=69ce960a98ca4ee738d25416
SUBJECT=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/academic/subjects | jq -r '.data[0]._id')
CLASS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/academic/classes | jq -r '.data[0]._id')
TOPIC=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4500/api/curriculum-structure/nodes?type=topic&subjectId=$SUBJECT" | jq -r '.data[0]._id')

curl -s -X POST http://localhost:4500/api/lesson-plans/ai-generate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"schoolId\":\"$SCHOOL\",\"subjectId\":\"$SUBJECT\",\"classId\":\"$CLASS\",\"curriculumTopicId\":\"$TOPIC\",\"date\":\"2026-05-01T00:00:00.000Z\",\"durationMinutes\":45}" | jq '.data | {topic, objectives: (.objectives | length), homeworkSuggestions}'
```
Expected: response has `homeworkSuggestions` as an array of typed objects. No `homework` field.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/LessonPlan/service-ai.ts
git commit -m "feat(lesson-plans): AI returns structured homeworkSuggestions

Replaces free-text homework with a discriminated union of reading|exercise|quiz
suggestions. Teacher maps each suggestion to a real ref via picker UI."
```

---

### Task 10: Frontend types — discriminated Homework union + LessonPlan fields

**Files:**
- Modify: `campusly-frontend/src/types/academic.ts` (or create `src/types/lesson-plans.ts` if cleaner)
- Modify: `campusly-frontend/src/types/index.ts` to re-export

- [ ] **Step 1: Add the Homework discriminated union**

In an appropriate types file (check the existing convention — if `src/types/homework.ts` exists, use it; else create it):

```ts
export type HomeworkType = 'quiz' | 'reading' | 'exercise';

interface HomeworkBase {
  _id: string;
  title: string;
  subjectId: string;
  classId: string;
  schoolId: string;
  teacherId: string;
  dueDate: string;
  totalMarks: number;
  status: 'assigned' | 'closed';
  attachments: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizHomework extends HomeworkBase {
  type: 'quiz';
  quizId: string;
}

export interface ReadingHomework extends HomeworkBase {
  type: 'reading';
  contentResourceId: string;
  pageRange?: string | null;
}

export interface ExerciseHomework extends HomeworkBase {
  type: 'exercise';
  exerciseQuestionIds: string[];
}

export type Homework = QuizHomework | ReadingHomework | ExerciseHomework;

// Staged (unsaved) versions used by the lesson-plan form
export type StagedQuizHomework =     { type: 'quiz';     title: string; quizId: string;              dueDate: string; totalMarks: number };
export type StagedReadingHomework =  { type: 'reading';  title: string; contentResourceId: string; pageRange?: string; dueDate: string; totalMarks: number };
export type StagedExerciseHomework = { type: 'exercise'; title: string; exerciseQuestionIds: string[]; dueDate: string; totalMarks: number };
export type StagedHomework = StagedQuizHomework | StagedReadingHomework | StagedExerciseHomework;
```

- [ ] **Step 2: Update the LessonPlan type**

Find the `LessonPlan` type definition (in `src/hooks/useTeacherLessonPlans.ts` per the audit, or in a types file). Move it to `src/types/lesson-plans.ts`:

```ts
import type { Homework } from './homework';

export interface LessonPlan {
  _id: string;
  teacherId: string | { firstName: string; lastName: string; email: string };
  schoolId: string;
  subjectId: string | { _id: string; name: string; code?: string };
  classId: string | { _id: string; name: string };
  curriculumTopicId: string | { _id: string; title: string; code?: string };
  date: string;
  topic: string;
  durationMinutes: number;
  objectives: string[];
  activities: string[];
  resources: string[];
  homeworkIds: string[] | Homework[]; // populated on detail fetch
  reflectionNotes?: string;
  aiGenerated: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type HomeworkSuggestion =
  | { type: 'quiz';     title: string; questionCount: number; topicHint: string }
  | { type: 'reading';  title: string; pageRangeHint?: string; topicHint: string }
  | { type: 'exercise'; title: string; questionCount: number; topicHint: string };

export interface AIGeneratedLessonDraft {
  topic: string;
  objectives: string[];
  activities: string[];
  resources: string[];
  homeworkSuggestions: HomeworkSuggestion[];
}
```

- [ ] **Step 3: Re-export from `src/types/index.ts`**

Add:
```ts
export * from './homework';
export * from './lesson-plans';
```

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Expected: errors where `useTeacherLessonPlans.ts` still defines its own inline `LessonPlan` type or references the removed `homework: string` field. Fix in Task 11.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/types/homework.ts src/types/lesson-plans.ts src/types/index.ts
git commit -m "feat(types): add Homework discriminated union, update LessonPlan

LessonPlan now has required curriculumTopicId, durationMinutes, homeworkIds.
Homework is a typed union (quiz|reading|exercise)."
```

---

### Task 11: Update `useTeacherLessonPlans` hook

**Files:**
- Modify: `campusly-frontend/src/hooks/useTeacherLessonPlans.ts`

- [ ] **Step 1: Remove inline types, import from `@/types`**

At the top of [useTeacherLessonPlans.ts](../../../../../campusly-frontend/src/hooks/useTeacherLessonPlans.ts):

```ts
import type { LessonPlan, AIGeneratedLessonDraft, StagedHomework, Homework } from '@/types';
```

Delete any inline `interface LessonPlan { ... }` block.

- [ ] **Step 2: Update AI generation return type**

Change `generateWithAI` to return `AIGeneratedLessonDraft`:

```ts
const generateWithAI = async (
  params: { schoolId: string; subjectId: string; classId: string; curriculumTopicId: string; date: string; durationMinutes?: number },
): Promise<AIGeneratedLessonDraft> => {
  const response = await apiClient.post('/lesson-plans/ai-generate', params);
  return unwrapResponse(response);
};
```

(If `unwrapResponse` isn't imported, import from `@/lib/api-helpers`.)

- [ ] **Step 3: Add PDF download method**

```ts
const downloadLessonPlanPdf = async (id: string): Promise<void> => {
  const response = await apiClient.get(`/lesson-plans/${id}/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `lesson-plan-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
```

- [ ] **Step 4: Add attach/detach methods**

```ts
const attachHomework = async (planId: string, input: StagedHomework & { schoolId: string; subjectId: string; classId: string }): Promise<Homework> => {
  const response = await apiClient.post(`/lesson-plans/${planId}/homework`, input);
  return unwrapResponse(response);
};

const detachHomework = async (planId: string, homeworkId: string): Promise<void> => {
  await apiClient.delete(`/lesson-plans/${planId}/homework/${homeworkId}`);
};
```

- [ ] **Step 5: Update `createLessonPlan` to accept `stagedHomework` and `durationMinutes`**

Update the payload type and the POST body to include those fields verbatim. The backend handles the compensation flow.

- [ ] **Step 6: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Expected: errors move into `LessonPlanForm.tsx` and `LessonPlanDetailDialog.tsx` (they still reference the old `homework` string). Fix in Tasks 12, 17.

- [ ] **Step 7: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useTeacherLessonPlans.ts
git commit -m "feat(lesson-plans): hook adds PDF download + homework attach/detach

downloadLessonPlanPdf streams the backend PDF.
attachHomework/detachHomework manage structured homework records.
AI generate returns AIGeneratedLessonDraft with homeworkSuggestions."
```

---

### Task 12: Rebuild `LessonPlanForm` — cascading picker + duration + HomeworkBuilder slot

**Files:**
- Modify: `campusly-frontend/src/components/lesson-plans/LessonPlanForm.tsx`

- [ ] **Step 1: Update form schema (Zod)**

Replace the existing Zod form schema near the top of the file:

```ts
const formSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  curriculumTopicId: z.string().min(1, 'Curriculum topic is required'),
  date: z.string().min(1, 'Date is required'),
  topic: z.string().min(1, 'Lesson title is required').max(200),
  durationMinutes: z.number().int().min(5).max(240).default(45),
  objectives: z.string().optional(),
  activities: z.string().optional(),
  resources: z.string().optional(),
  reflectionNotes: z.string().optional(),
});
```

- [ ] **Step 2: Remove the homework `<Textarea>`**

Delete the JSX block for the homework textarea and the corresponding form field registration.

- [ ] **Step 3: Add field coherence effects**

```tsx
const classId = watch('classId');
const subjectId = watch('subjectId');

useEffect(() => {
  // Class change clears subject + topic
  setValue('subjectId', '');
  setValue('curriculumTopicId', '');
  setStagedHomework([]);
}, [classId, setValue]);

useEffect(() => {
  // Subject change clears topic
  setValue('curriculumTopicId', '');
}, [subjectId, setValue]);
```

- [ ] **Step 4: Cascading picker UI**

Replace the topic Select with a cascading section. The Class select already exists. Subject select must filter by the grade of the selected class (each Class has a `gradeId`; fetch subjects where `gradeIds` includes that gradeId). Topic is a searchable combobox — use the existing shadcn/base-ui `Combobox` pattern if present; otherwise a `<Select>` with `<Input>` filter above it.

```tsx
<Label>Class <span className="text-destructive">*</span></Label>
<Select onValueChange={(v) => setValue('classId', v)} value={classId ?? ''}>
  <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
  <SelectContent>
    {classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
  </SelectContent>
</Select>

{classId && (
  <>
    <Label>Subject <span className="text-destructive">*</span></Label>
    <Select onValueChange={(v) => setValue('subjectId', v)} value={subjectId ?? ''} disabled={!filteredSubjects.length}>
      <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
      <SelectContent>
        {filteredSubjects.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
      </SelectContent>
    </Select>
  </>
)}

{subjectId && (
  <>
    <Label>Curriculum Topic <span className="text-destructive">*</span></Label>
    <Input placeholder="Search topics..." value={topicSearch} onChange={(e) => setTopicSearch(e.target.value)} />
    <div className="max-h-48 overflow-y-auto border rounded-md">
      {filteredTopics.map((t) => (
        <button type="button" key={t._id} onClick={() => setValue('curriculumTopicId', t._id)}
          className={`w-full text-left px-3 py-2 hover:bg-muted ${watch('curriculumTopicId') === t._id ? 'bg-muted' : ''}`}>
          <div className="font-medium">{t.title}</div>
          <div className="text-xs text-muted-foreground">{t.code}</div>
        </button>
      ))}
    </div>
  </>
)}
```

(Implementation of `filteredSubjects`, `filteredTopics` uses existing `loadTopicsForSubject` already in the hook. Pull in `classes` from `useTeacherClasses`.)

- [ ] **Step 5: Add duration input**

```tsx
<Label>Duration (minutes)</Label>
<Input
  type="number"
  min={5}
  max={240}
  {...register('durationMinutes', { valueAsNumber: true })}
  placeholder="45"
/>
```

- [ ] **Step 6: AI button — always visible, disabled with tooltip**

Replace the current AI button conditional with:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <span>
      <Button
        type="button"
        variant="outline"
        disabled={!canAIGenerate || aiLoading}
        onClick={handleAIGenerate}
      >
        {aiLoading ? 'Generating...' : 'Generate with AI'}
      </Button>
    </span>
  </TooltipTrigger>
  {!canAIGenerate && (
    <TooltipContent>Select class, subject, date, and curriculum topic to enable AI.</TooltipContent>
  )}
</Tooltip>
```

- [ ] **Step 7: Add HomeworkBuilder placeholder slot**

After the resources field, add:

```tsx
<div className="space-y-2">
  <Label>Homework</Label>
  <HomeworkBuilder
    stagedHomework={stagedHomework}
    setStagedHomework={setStagedHomework}
    plan={initialData}
    classId={classId}
    subjectId={subjectId}
    schoolId={schoolId}
  />
</div>
```

- [ ] **Step 8: Verify file size (<350 lines)**

```bash
wc -l c:/Users/shaun/campusly-frontend/src/components/lesson-plans/LessonPlanForm.tsx
```
Expected: < 350. If over, extract the cascading picker into `TopicCascadePicker.tsx` as a subcomponent.

- [ ] **Step 9: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/lesson-plans/LessonPlanForm.tsx
git commit -m "feat(lesson-plans): cascading Class->Subject->Topic picker + duration

Clears downstream fields on class/subject change. AI button always visible
with tooltip. Homework replaced by HomeworkBuilder slot."
```

---

### Task 13: Build `HomeworkBuilder` skeleton (without pickers)

**Files:**
- Create: `campusly-frontend/src/components/lesson-plans/HomeworkBuilder.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState } from 'react';
import type { StagedHomework, Homework, HomeworkType, LessonPlan } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';
import { useTeacherLessonPlans } from '@/hooks/useTeacherLessonPlans';
import { toast } from 'sonner';
import { QuizPicker } from './pickers/QuizPicker';
import { ReadingPicker } from './pickers/ReadingPicker';
import { ExercisePicker } from './pickers/ExercisePicker';

interface HomeworkBuilderProps {
  stagedHomework: StagedHomework[];
  setStagedHomework: (next: StagedHomework[]) => void;
  plan: LessonPlan | null;
  classId: string;
  subjectId: string;
  schoolId: string;
}

export function HomeworkBuilder({
  stagedHomework, setStagedHomework, plan, classId, subjectId, schoolId,
}: HomeworkBuilderProps): JSX.Element {
  const [isOpen, setOpen] = useState(false);
  const [pickedType, setPickedType] = useState<HomeworkType | null>(null);
  const { attachHomework, detachHomework } = useTeacherLessonPlans();

  const attached: (StagedHomework | Homework)[] = plan?._id
    ? ((plan.homeworkIds as Homework[]) ?? [])
    : stagedHomework;

  const canAdd = Boolean(classId && subjectId);

  const handleAdd = async (hw: StagedHomework): Promise<void> => {
    if (plan?._id) {
      try {
        await attachHomework(plan._id, { ...hw, schoolId, subjectId, classId });
        toast.success('Homework added');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to add');
      }
    } else {
      setStagedHomework([...stagedHomework, hw]);
    }
    setOpen(false);
    setPickedType(null);
  };

  const handleRemove = async (indexOrId: number | string): Promise<void> => {
    if (plan?._id && typeof indexOrId === 'string') {
      try {
        await detachHomework(plan._id, indexOrId);
        toast.success('Homework removed');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove');
      }
    } else if (typeof indexOrId === 'number') {
      setStagedHomework(stagedHomework.filter((_, i) => i !== indexOrId));
    }
  };

  return (
    <div className="space-y-2">
      {attached.length === 0 && (
        <p className="text-sm text-muted-foreground">No homework attached yet.</p>
      )}
      {attached.map((hw, idx) => (
        <div key={'_id' in hw ? hw._id : idx}
          className="flex items-center justify-between rounded-md border p-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{hw.title}</div>
            <div className="text-xs text-muted-foreground capitalize">{hw.type}</div>
          </div>
          <Button type="button" variant="ghost" size="sm"
            onClick={() => handleRemove('_id' in hw ? hw._id : idx)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" disabled={!canAdd}>+ Add Homework</Button>}>
          Add Homework
        </DialogTrigger>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader><DialogTitle>Add Homework</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {!pickedType && (
              <div className="grid gap-3 sm:grid-cols-3">
                {(['quiz', 'reading', 'exercise'] as HomeworkType[]).map((t) => (
                  <button type="button" key={t} onClick={() => setPickedType(t)}
                    className="rounded-md border p-4 text-center hover:bg-muted">
                    <div className="font-medium capitalize">{t}</div>
                  </button>
                ))}
              </div>
            )}
            {pickedType === 'quiz' && <QuizPicker classId={classId} subjectId={subjectId} onPicked={handleAdd} />}
            {pickedType === 'reading' && <ReadingPicker classId={classId} subjectId={subjectId} onPicked={handleAdd} />}
            {pickedType === 'exercise' && <ExercisePicker classId={classId} subjectId={subjectId} onPicked={handleAdd} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify compile** (pickers don't exist yet → errors expected)

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Expected: errors importing `QuizPicker`, `ReadingPicker`, `ExercisePicker`. Fixed in Tasks 14–16.

- [ ] **Step 3: Commit** (buildable pipeline is unblocked after Task 16)

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/lesson-plans/HomeworkBuilder.tsx
git commit -m "feat(lesson-plans): HomeworkBuilder skeleton + add/remove flow

Typed picker dialog; inline-vs-attach decision based on plan._id.
Pickers wired in Tasks 14-16."
```

---

### Task 14: `QuizPicker`

**Files:**
- Create: `campusly-frontend/src/components/lesson-plans/pickers/QuizPicker.tsx`
- Modify: `campusly-frontend/src/hooks/useQuizLibrary.ts` (or similar — check if it exists; else add to useTeacherLessonPlans)

- [ ] **Step 1: Add hook method to list quizzes**

If a `useQuizzes` hook exists, use it. Otherwise add a one-off fetch in the picker:

```tsx
const [quizzes, setQuizzes] = useState<Array<{ _id: string; title: string; totalPoints: number }>>([]);
useEffect(() => {
  const run = async () => {
    const res = await apiClient.get('/learning/quizzes', { params: { classId, subjectId } });
    setQuizzes(unwrapList(res));
  };
  run().catch(() => toast.error('Failed to load quizzes'));
}, [classId, subjectId]);
```

(If the endpoint is different, check [Learning/routes.ts](../../../../../campusly-backend/src/modules/Learning/routes.ts). NOTE: per the constraint, `apiClient` must live in a hook, not a component. Extract into a new hook `useQuizLibrary` in `src/hooks/` and import from the component.)

- [ ] **Step 2: Write the picker**

Create `src/components/lesson-plans/pickers/QuizPicker.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuizLibrary } from '@/hooks/useQuizLibrary';
import type { StagedQuizHomework } from '@/types';

interface Props {
  classId: string;
  subjectId: string;
  onPicked: (hw: StagedQuizHomework) => void;
}

export function QuizPicker({ classId, subjectId, onPicked }: Props): JSX.Element {
  const { quizzes, loading } = useQuizLibrary({ classId, subjectId });
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const selectedQuiz = quizzes.find((q) => q._id === selectedQuizId);
  const canSubmit = Boolean(selectedQuizId && title && dueDate);

  const handleSubmit = () => {
    if (!selectedQuiz) return;
    onPicked({
      type: 'quiz',
      quizId: selectedQuiz._id,
      title,
      dueDate: new Date(dueDate).toISOString(),
      totalMarks: selectedQuiz.totalPoints,
    });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading quizzes...</p>;
  if (quizzes.length === 0) return <p className="text-sm text-muted-foreground">No quizzes available for this class/subject yet. Create one in the Quizzes module first.</p>;

  return (
    <div className="space-y-3">
      <Label>Quiz</Label>
      <div className="max-h-48 overflow-y-auto border rounded-md">
        {quizzes.map((q) => (
          <button type="button" key={q._id} onClick={() => setSelectedQuizId(q._id)}
            className={`w-full text-left px-3 py-2 hover:bg-muted ${selectedQuizId === q._id ? 'bg-muted' : ''}`}>
            <div className="font-medium">{q.title}</div>
            <div className="text-xs text-muted-foreground">{q.totalPoints} pts</div>
          </button>
        ))}
      </div>
      <Label>Homework Title <span className="text-destructive">*</span></Label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 3 Quiz" />
      <Label>Due Date <span className="text-destructive">*</span></Label>
      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <p className="text-xs text-muted-foreground">Total marks: {selectedQuiz?.totalPoints ?? '—'} (from quiz)</p>
      <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>Add Quiz Homework</Button>
    </div>
  );
}
```

- [ ] **Step 3: Create `useQuizLibrary` hook**

`src/hooks/useQuizLibrary.ts`:

```ts
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

interface QuizLite { _id: string; title: string; totalPoints: number }

export function useQuizLibrary(params: { classId: string; subjectId: string }): { quizzes: QuizLite[]; loading: boolean } {
  const [quizzes, setQuizzes] = useState<QuizLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.classId || !params.subjectId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get('/learning/quizzes', { params })
      .then((res) => { if (!cancelled) setQuizzes(unwrapList(res) as QuizLite[]); })
      .catch(() => { if (!cancelled) setQuizzes([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.classId, params.subjectId]);

  return { quizzes, loading };
}
```

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Expected: errors only in unwritten `ReadingPicker`, `ExercisePicker`.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useQuizLibrary.ts src/components/lesson-plans/pickers/QuizPicker.tsx
git commit -m "feat(lesson-plans): QuizPicker + useQuizLibrary hook"
```

---

### Task 15: `ReadingPicker`

**Files:**
- Create: `campusly-frontend/src/components/lesson-plans/pickers/ReadingPicker.tsx`
- Create: `campusly-frontend/src/hooks/useContentResourceLibrary.ts` (if not already existing in a shared form — check `useTeacherContent` or similar first)

- [ ] **Step 1: Check for an existing content-library hook**

```bash
grep -l "content-library\|content-resources" c:/Users/shaun/campusly-frontend/src/hooks/*.ts
```
If found, use it. Otherwise create a new one.

- [ ] **Step 2: Create `useContentResourceLibrary` if needed**

```ts
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

interface ContentLite { _id: string; title: string; type: string; subjectId: string; gradeId: string }

export function useContentResourceLibrary(params: { classId: string; subjectId: string; q?: string }): { resources: ContentLite[]; loading: boolean } {
  const [resources, setResources] = useState<ContentLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.classId || !params.subjectId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get('/content-library/resources', { params })
      .then((res) => { if (!cancelled) setResources(unwrapList(res) as ContentLite[]); })
      .catch(() => { if (!cancelled) setResources([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.classId, params.subjectId, params.q]);

  return { resources, loading };
}
```

(Verify the endpoint path against [ContentLibrary/routes.ts](../../../../../campusly-backend/src/modules/ContentLibrary/routes.ts).)

- [ ] **Step 3: Write the picker**

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useContentResourceLibrary } from '@/hooks/useContentResourceLibrary';
import type { StagedReadingHomework } from '@/types';

interface Props {
  classId: string;
  subjectId: string;
  onPicked: (hw: StagedReadingHomework) => void;
}

export function ReadingPicker({ classId, subjectId, onPicked }: Props): JSX.Element {
  const [search, setSearch] = useState('');
  const { resources, loading } = useContentResourceLibrary({ classId, subjectId, q: search });
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [pageRange, setPageRange] = useState('');
  const [dueDate, setDueDate] = useState('');

  const canSubmit = selectedId && title && dueDate;
  const selected = resources.find((r) => r._id === selectedId);

  const handleSubmit = () => {
    if (!selected) return;
    onPicked({
      type: 'reading',
      contentResourceId: selected._id,
      pageRange: pageRange || undefined,
      title,
      dueDate: new Date(dueDate).toISOString(),
      totalMarks: 0,
    });
  };

  return (
    <div className="space-y-3">
      <Label>Search Content Library</Label>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Fractions Chapter 3" />
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {!loading && resources.length === 0 && <p className="text-sm text-muted-foreground">No resources found.</p>}
      <div className="max-h-48 overflow-y-auto border rounded-md">
        {resources.map((r) => (
          <button type="button" key={r._id} onClick={() => setSelectedId(r._id)}
            className={`w-full text-left px-3 py-2 hover:bg-muted ${selectedId === r._id ? 'bg-muted' : ''}`}>
            <div className="font-medium">{r.title}</div>
            <div className="text-xs text-muted-foreground">{r.type}</div>
          </button>
        ))}
      </div>
      <Label>Homework Title <span className="text-destructive">*</span></Label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Read pp. 40-45" />
      <Label>Page Range (optional)</Label>
      <Input value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="40-45" />
      <Label>Due Date <span className="text-destructive">*</span></Label>
      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>Add Reading Homework</Button>
    </div>
  );
}
```

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Expected: errors only in unwritten `ExercisePicker`.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useContentResourceLibrary.ts src/components/lesson-plans/pickers/ReadingPicker.tsx
git commit -m "feat(lesson-plans): ReadingPicker + useContentResourceLibrary hook"
```

---

### Task 16: `ExercisePicker`

**Files:**
- Create: `campusly-frontend/src/components/lesson-plans/pickers/ExercisePicker.tsx`
- Create: `campusly-frontend/src/hooks/useQuestionBank.ts` (if not existing)

- [ ] **Step 1: Check for existing question-bank hook; else create**

```bash
grep -l "question-bank\|questions" c:/Users/shaun/campusly-frontend/src/hooks/*.ts
```
If a hook exists, extend it. Else create `src/hooks/useQuestionBank.ts`:

```ts
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';

interface QuestionLite { _id: string; questionText: string; points: number; difficulty?: string }

export function useQuestionBank(params: { subjectId: string; gradeId?: string; q?: string }): { questions: QuestionLite[]; loading: boolean } {
  const [questions, setQuestions] = useState<QuestionLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.subjectId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get('/teacher-workbench/questions', { params })
      .then((res) => { if (!cancelled) setQuestions(unwrapList(res) as QuestionLite[]); })
      .catch(() => { if (!cancelled) setQuestions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.subjectId, params.gradeId, params.q]);

  return { questions, loading };
}
```

(Verify endpoint against [teacherWorkbench/routes.ts](../../../../../campusly-backend/src/modules/teacherWorkbench/routes.ts).)

- [ ] **Step 2: Write the picker**

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import type { StagedExerciseHomework } from '@/types';

interface Props {
  classId: string;
  subjectId: string;
  onPicked: (hw: StagedExerciseHomework) => void;
}

export function ExercisePicker({ subjectId, onPicked }: Props): JSX.Element {
  const [search, setSearch] = useState('');
  const { questions, loading } = useQuestionBank({ subjectId, q: search });
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const totalMarks = questions.filter((q) => selected.includes(q._id)).reduce((sum, q) => sum + (q.points ?? 1), 0);
  const canSubmit = selected.length > 0 && title && dueDate;

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSubmit = () => {
    onPicked({
      type: 'exercise',
      exerciseQuestionIds: selected,
      title,
      dueDate: new Date(dueDate).toISOString(),
      totalMarks,
    });
  };

  return (
    <div className="space-y-3">
      <Label>Search Question Bank</Label>
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. simplify" />
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {!loading && questions.length === 0 && <p className="text-sm text-muted-foreground">No questions available for this subject yet. Add questions in the Question Bank first.</p>}
      <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
        {questions.map((q) => (
          <label key={q._id} className="flex items-start gap-2 p-2 cursor-pointer hover:bg-muted">
            <Checkbox checked={selected.includes(q._id)} onCheckedChange={() => toggle(q._id)} />
            <div className="min-w-0">
              <div className="text-sm line-clamp-2">{q.questionText}</div>
              <div className="text-xs text-muted-foreground">{q.points} pts {q.difficulty ? '· ' + q.difficulty : ''}</div>
            </div>
          </label>
        ))}
      </div>
      <Label>Homework Title <span className="text-destructive">*</span></Label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fractions Exercise Set" />
      <Label>Due Date <span className="text-destructive">*</span></Label>
      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <p className="text-xs text-muted-foreground">Selected: {selected.length} question(s) · {totalMarks} marks</p>
      <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>Add Exercise Homework</Button>
    </div>
  );
}
```

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Expected: zero errors across the frontend.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useQuestionBank.ts src/components/lesson-plans/pickers/ExercisePicker.tsx
git commit -m "feat(lesson-plans): ExercisePicker + useQuestionBank hook"
```

---

### Task 17: `LessonPlanDetailDialog` — Download PDF + structured homework render

**Files:**
- Modify: `campusly-frontend/src/components/lesson-plans/LessonPlanDetailDialog.tsx`

- [ ] **Step 1: Remove print-specific code**

Delete:
- The `window.print()` call
- All `print:hidden`, `print:max-h-none`, other `print:*` CSS classes
- The "Print" button

- [ ] **Step 2: Add Download PDF button**

```tsx
import { useTeacherLessonPlans } from '@/hooks/useTeacherLessonPlans';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

// inside the dialog body:
const { downloadLessonPlanPdf } = useTeacherLessonPlans();
const [downloading, setDownloading] = useState(false);

const handleDownload = async (): Promise<void> => {
  if (!plan?._id) return;
  setDownloading(true);
  try {
    await downloadLessonPlanPdf(plan._id);
  } catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : 'Failed to download PDF');
  } finally {
    setDownloading(false);
  }
};

// in the footer:
<Button onClick={handleDownload} disabled={downloading}>
  <Download className="h-4 w-4 mr-2" />
  {downloading ? 'Downloading...' : 'Download PDF'}
</Button>
```

- [ ] **Step 3: Replace free-text homework render with structured render**

Find the section that displays `plan.homework`. Replace with:

```tsx
{Array.isArray(plan.homeworkIds) && plan.homeworkIds.length > 0 && typeof plan.homeworkIds[0] === 'object' && (
  <section>
    <h3 className="font-semibold mb-2">Homework</h3>
    {(['quiz', 'reading', 'exercise'] as const).map((type) => {
      const items = (plan.homeworkIds as Homework[]).filter((h) => h.type === type);
      if (items.length === 0) return null;
      return (
        <div key={type} className="mb-3">
          <h4 className="text-sm font-medium capitalize">{type}</h4>
          <ul className="list-disc pl-5 text-sm">
            {items.map((h) => (
              <li key={h._id}>
                {h.title}
                {h.type === 'reading' && h.pageRange ? ` — pp. ${h.pageRange}` : ''}
                {h.type === 'exercise' ? ` — ${h.exerciseQuestionIds.length} question(s)` : ''}
              </li>
            ))}
          </ul>
        </div>
      );
    })}
  </section>
)}
```

- [ ] **Step 4: Verify compile + file size**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
wc -l src/components/lesson-plans/LessonPlanDetailDialog.tsx
```
Expected: zero errors, under 350 lines.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/lesson-plans/LessonPlanDetailDialog.tsx
git commit -m "feat(lesson-plans): Download PDF button + structured homework render

Replaces window.print() with programmatic PDF download.
Homework rendered grouped by type (quiz/reading/exercise)."
```

---

### Task 18: List page — homework summary column + improved empty states

**Files:**
- Modify: `campusly-frontend/src/app/(dashboard)/teacher/lesson-plans/page.tsx`

- [ ] **Step 1: Add the homework summary column**

Find the columns array in the DataTable setup. Add:

```tsx
{
  accessorKey: 'homeworkIds',
  header: 'Homework',
  cell: ({ row }) => {
    const ids = row.original.homeworkIds;
    // list view returns just IDs; populate comes on detail fetch
    const count = Array.isArray(ids) ? ids.length : 0;
    return count === 0
      ? <span className="text-muted-foreground text-xs">None</span>
      : <span className="text-xs">{count} item{count === 1 ? '' : 's'}</span>;
  },
},
```

For richer per-type summary, extend the list endpoint to populate; defer that to Task 19.

- [ ] **Step 2: Improve empty states**

Replace the empty-state block. Outside the component or inside, add two branches:

```tsx
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import Link from 'next/link';

const { classes } = useTeacherClasses();

// ...

if (!loading && classes.length === 0) {
  return (
    <EmptyState
      icon={GraduationCap}
      title="No classes yet"
      description="Create a class before planning lessons."
      action={<Link href="/teacher/classes" className="underline">Create your first class</Link>}
    />
  );
}

if (!loading && plans.length === 0) {
  return (
    <EmptyState
      icon={BookOpen}
      title="No lesson plans yet"
      description="Plan your first lesson to get started."
      action={<Button onClick={() => setCreateOpen(true)}>Create your first lesson plan</Button>}
    />
  );
}
```

- [ ] **Step 3: Add duration column**

```tsx
{ accessorKey: 'durationMinutes', header: 'Duration', cell: ({ row }) => `${row.original.durationMinutes} min` }
```

- [ ] **Step 4: Verify compile + file size**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
wc -l src/app/\(dashboard\)/teacher/lesson-plans/page.tsx
```
Expected: zero errors, under 350 lines.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/lesson-plans/page.tsx
git commit -m "feat(lesson-plans): homework column + duration + improved empty states"
```

---

### Task 19: Populate homework on list response (perf + richer column)

**Files:**
- Modify: `campusly-backend/src/modules/LessonPlan/service.ts` (listLessonPlans populate)
- Modify: `campusly-frontend/src/app/(dashboard)/teacher/lesson-plans/page.tsx` (render summary)

- [ ] **Step 1: Update `listLessonPlans` to populate homework (fields only, not full docs)**

```ts
const plans = await LessonPlan.find(query)
  .populate('subjectId', 'name code')
  .populate('classId', 'name')
  .populate('curriculumTopicId', 'title code')
  .populate({ path: 'homeworkIds', match: { isDeleted: false }, select: 'type title' })
  .populate('teacherId', 'firstName lastName email')
  .sort({ date: -1 })
  .skip(skip)
  .limit(limit);
```

- [ ] **Step 2: Update the frontend Homework column**

```tsx
cell: ({ row }) => {
  const hws = (row.original.homeworkIds as Array<{ type: 'quiz' | 'reading' | 'exercise' }>) ?? [];
  if (hws.length === 0) return <span className="text-muted-foreground text-xs">None</span>;
  const groups = { quiz: 0, reading: 0, exercise: 0 };
  hws.forEach((h) => { groups[h.type]++; });
  const parts = (['quiz', 'reading', 'exercise'] as const)
    .filter((t) => groups[t] > 0)
    .map((t) => `${groups[t]} ${t}`);
  return <span className="text-xs">{parts.join(' · ')}</span>;
},
```

- [ ] **Step 3: Verify compile** both repos

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Smoke-test a list response shape**

```bash
TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@greenfieldprimary.co.za","password":"Password1"}' | jq -r .data.accessToken)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4500/api/lesson-plans | jq '.data[0].homeworkIds'
```
Expected: an array of objects with `{ _id, type, title }` (or empty array).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/LessonPlan/service.ts
git commit -m "feat(lesson-plans): populate homework type+title in list response"

cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/lesson-plans/page.tsx
git commit -m "feat(lesson-plans): per-type homework summary in list column"
```

---

### Task 20: AI suggestions → HomeworkBuilder pre-fill

**Files:**
- Modify: `campusly-frontend/src/components/lesson-plans/LessonPlanForm.tsx`

- [ ] **Step 1: Map AI suggestions into the builder's pending state**

When `handleAIGenerate` completes, for each `homeworkSuggestions[i]`:
- Open the HomeworkBuilder picker pre-set to the suggested `type`
- Pre-fill the title with the AI's suggested title

A pragmatic implementation: after receiving the draft, push each suggestion into a new local state `pendingSuggestions: HomeworkSuggestion[]`. Pass it to `HomeworkBuilder` as a prop; the builder renders a small "AI suggested:" banner per pending item with a "Complete" button that opens the correct picker pre-filled.

```tsx
// LessonPlanForm
const [pendingSuggestions, setPendingSuggestions] = useState<HomeworkSuggestion[]>([]);

const handleAIGenerate = async () => {
  const draft = await generateWithAI({...});
  setValue('objectives', (draft.objectives ?? []).join(', '));
  setValue('activities', (draft.activities ?? []).join(', '));
  setValue('resources', (draft.resources ?? []).join(', '));
  setPendingSuggestions(draft.homeworkSuggestions ?? []);
  toast.success(`AI draft ready — ${draft.homeworkSuggestions.length} homework suggestion(s) to review`);
};

<HomeworkBuilder
  ...
  pendingSuggestions={pendingSuggestions}
  onSuggestionResolved={(suggestion) => setPendingSuggestions((prev) => prev.filter((s) => s !== suggestion))}
/>
```

- [ ] **Step 2: Add suggestion banner to HomeworkBuilder**

In `HomeworkBuilder.tsx`, above the attached list:

```tsx
{pendingSuggestions && pendingSuggestions.length > 0 && (
  <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
    <p className="text-sm font-medium mb-2">AI suggestions ({pendingSuggestions.length})</p>
    {pendingSuggestions.map((s, i) => (
      <div key={i} className="flex items-center justify-between py-1">
        <div className="text-sm">
          <span className="capitalize font-medium">{s.type}:</span> {s.title}
          <span className="text-xs text-muted-foreground ml-2">{s.topicHint}</span>
        </div>
        <Button type="button" size="sm" variant="outline"
          onClick={() => { setPickedType(s.type); setSeedTitle(s.title); setOpen(true); }}>
          Complete
        </Button>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 3: Seed pickers with suggestion title**

In each picker, accept an optional `initialTitle` prop; pre-fill the title `<Input>`.

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/lesson-plans/LessonPlanForm.tsx src/components/lesson-plans/HomeworkBuilder.tsx src/components/lesson-plans/pickers/
git commit -m "feat(lesson-plans): AI suggestions pre-fill HomeworkBuilder pickers

Teacher sees suggestions as banners; clicks Complete to map each to a real ref."
```

---

### Task 21: Separation-of-concerns sweep + acceptance verification

**Files:** varies — any page/component under `/teacher/lesson-plans/` or `src/components/lesson-plans/`

- [ ] **Step 1: Grep for apiClient leaks**

```bash
cd c:/Users/shaun/campusly-frontend
grep -rn "apiClient" src/app/\(dashboard\)/teacher/lesson-plans src/components/lesson-plans
```
Expected: **zero matches**. Any match is a violation — move the call into a hook.

- [ ] **Step 2: Grep for any forbidden patterns**

```bash
grep -rn ": any" src/app/\(dashboard\)/teacher/lesson-plans src/components/lesson-plans
grep -rn "text-red-" src/app/\(dashboard\)/teacher/lesson-plans src/components/lesson-plans
grep -rn "catch (err)" src/app/\(dashboard\)/teacher/lesson-plans src/components/lesson-plans
```
Expected: zero matches for each.

- [ ] **Step 3: File size check**

```bash
find src/app/\(dashboard\)/teacher/lesson-plans src/components/lesson-plans -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -nr | head -10
```
Expected: every file under 350. If any exceeds, refactor into subcomponents.

- [ ] **Step 4: End-to-end manual smoke**

Start backend (`npm run dev` in campusly-backend) and frontend (`npm run dev` in campusly-frontend).

1. Go to `http://localhost:3500/login`, login as `admin@greenfieldprimary.co.za` / `Password1`.
2. Navigate to `/teacher/lesson-plans`.
3. Click **New Lesson Plan**.
4. Pick a class → subject dropdown filters → pick subject → curriculum topic search appears → type "Fractions" (or any topic) → pick one → date + duration.
5. Click **Generate with AI** → confirm objectives/activities/resources populate and a "AI suggestions" banner shows.
6. Add at least one reading homework via the Reading picker (search the Content Library, pick one, set title + due date).
7. Click **Create Plan**.
8. Back on the list: confirm new row shows homework count, class, topic.
9. Click the eye icon → detail dialog opens → homework rendered grouped by type.
10. Click **Download PDF** → file downloads → open the PDF → confirm layout (header, title, meta, sections, homework, footer).
11. Try changing the class on an edit: confirm subject + topic clear.
12. Try creating a plan without a curriculum topic: confirm the form blocks submission.

All 12 steps must pass for the module to be considered done.

- [ ] **Step 5: Final commit + acceptance log**

```bash
cd c:/Users/shaun/campusly-frontend
git add -u
git commit -m "chore(lesson-plans): SoC sweep + acceptance smoke passed

Every apiClient call lives in a hook. No any types, no text-red-*, no
catch(err) without :unknown. All files <350 lines.

Module 1 acceptance criteria verified manually."
```

---

## Self-Review (post-write)

**Spec coverage check:**
- §3.1 PDF via PDFKit → Task 7, 8
- §3.2 Required curriculumTopicId → Task 4, 6
- §3.3 Structured homework → Tasks 1, 2, 4, 10, 12, 13–16
- §3.4 Reflection notes excluded from PDF → Task 7 (exclusion is explicit in the generator)
- §4.1 LessonPlan schema changes → Task 4
- §4.2 Homework refactor → Tasks 1, 2
- §4.4 Compensation flow → Task 5
- §5.1 AI structured suggestions → Task 9
- §5.2 Attach/detach routes → Task 8
- §5.3 PDF controller + auth helper → Tasks 3, 8
- §6.1 Cascading picker + HomeworkBuilder → Tasks 12, 13–16
- §6.2 Detail dialog PDF + structured homework → Task 17
- §6.3 List page updates → Tasks 18, 19
- §6.4 Hook methods → Task 11
- §6.5 Types → Task 10
- §7 User flow → Task 21 (manual smoke)
- §8 Risks → addressed inline (compensation in Task 5, grade-topic check in Task 5, cascade in Task 5 + 8)
- §11 Acceptance criteria → Task 21

No placeholders detected. Types are consistent: `StagedHomework`, `Homework`, `AIGeneratedLessonDraft`, `HomeworkSuggestion` all defined in Task 10 and used consistently in Tasks 11–20.

**Known gap:** the acceptance-criterion "Staged homework compensation works: if the LessonPlan create fails after Homework creates succeed, all the Homework records are soft-deleted" is covered in code (Task 5, Step 2) but not explicitly tested in Task 21. This is acceptable for manual verification — a unit test would require a test runner we don't have. Logged as a gap for a future "test infra" module.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-module-1-lesson-plans.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session with checkpoints for review.

Which approach?
