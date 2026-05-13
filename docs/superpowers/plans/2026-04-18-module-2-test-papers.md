# Module 2 — Test/Paper Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single canonical `/teacher/papers` flow that supersedes 5 fragmented paper UIs: AI generates a CAPS-aligned `AssessmentPaper` + `PaperMemo` (compensation flow, no transactions), teacher edits/regenerates/swaps/deletes questions, finalises (auto-approved as principal), downloads programmatic PDF + memo PDF.

**Architecture:** Backend-first. Unify on `AssessmentPaper` (refs-based, CAPS-compliant) + separate `PaperMemo`. Migrate the 2 existing `GeneratedPaper` docs and remove the model. Lift `regenerateQuestion` from AITools into the QuestionBank module. Solo-principal `finalise` endpoint bypasses moderation. Frontend collapses 5 routes into `/teacher/papers/*`; legacy routes 302-redirect. PDFs generated server-side via existing `common/pdf/` builders (PDFKit) with TikZ-rendered diagrams from `:3600` (failures degrade to placeholders, never crash the PDF).

**Tech Stack:** Node 20 / TypeScript 6, Mongoose 9, Express 5, PDFKit (backend); Next.js 16.2.1 / React 19, Zustand, React Hook Form + Zod 4, Axios (frontend). No automated test runners — verification via curl, `docker exec campusly-mongo mongosh`, browser smoke.

**Spec:** [docs/superpowers/specs/2026-04-18-module-2-test-papers-design.md](../specs/2026-04-18-module-2-test-papers-design.md)

---

## Conventions

- **Commits:** conventional (`feat(papers):`, `fix(papers):`, `chore(papers):`).
- **Backend dev server:** `cd c:/Users/shaun/campusly-backend && npm run dev` for curl verification.
- **Auth (smoke tests):** login as `superadmin@campusly.co.za / Password1`. Get JWT.
- **DB IDs:** Greenfield Primary school = `69ce960a98ca4ee738d25416`.
- **Bash helper:** `TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" -d '{"email":"superadmin@campusly.co.za","password":"Password1"}' | grep -oP '"accessToken":"[^"]+' | sed 's/"accessToken":"//')`
- **File size limit:** every file under 350 lines.
- **No `any` types.** Every `catch (err)` must be `catch (err: unknown)`.
- **Zod v4 non-deprecated API:** `from 'zod/v4'`, `z.iso.datetime()`, `z.url()`. Never `z.string().datetime()`.
- **PDF rule:** PDFKit programmatic only. Never HTML-to-PDF.
- **Structured-homework rule (transitive):** if a paper question links to homework eventually, it must use the typed Homework discriminator from Module 1. Not directly relevant here but don't regress.

---

## File Structure

**Backend (`campusly-backend/src/modules/`):**

| File | Responsibility |
|---|---|
| `QuestionBank/model.ts` | MODIFY: `AssessmentPaper` — add `aiGenerated`, `topicIds[]` (required), `difficulty`. Section-question shape becomes a discriminated union: bank-ref vs inline. |
| `QuestionBank/validation.ts` | MODIFY: `createPaperSchema` requires `topicIds` (min 1), accepts new fields. |
| `QuestionBank/service-papers.ts` | MODIFY: add `updateMemo`, `finalisePaper` (with solo-principal bypass). `assertCanEditPaper` helper. |
| `QuestionBank/service-paper-questions.ts` | CREATE: `addQuestion`, `updateQuestion`, `deleteQuestion`, `regenerateQuestion`. Inline-vs-bank-ref handling. |
| `QuestionBank/service-paper-generation.ts` | MODIFY: write to `AssessmentPaper` + `PaperMemo` atomically (compensation). Was writing to `GeneratedPaper`. |
| `QuestionBank/service-pdf.ts` | MODIFY: TikZ render failure tolerance (placeholder, don't crash); local-TZ date in metadata; widow heuristic for question page-breaks. |
| `QuestionBank/service-memo-pdf.ts` | CREATE: separate memo PDF generator. |
| `QuestionBank/controller.ts` | MODIFY: new handlers for the 6 new endpoints. |
| `QuestionBank/routes.ts` | MODIFY: register new endpoints. |
| `AITools/routes.ts` | MODIFY: 308-redirect deprecated paper routes to `/papers`. |
| `AITools/model.ts` | MODIFY: remove `GeneratedPaper` schema + interface. Keep marking-related code untouched. |
| `AITools/service.ts` | MODIFY: remove `GeneratedPaper` references; marking module updated to reference `AssessmentPaper`. |
| `scripts/migrate-generated-papers.ts` | CREATE: one-shot backfill, 2 docs → `AssessmentPaper`+`PaperMemo`. |

**Frontend (`campusly-frontend/src/`):**

| File | Responsibility |
|---|---|
| `types/papers.ts` | CREATE: `Paper`, `PaperSection`, `PaperQuestion` (union), `PaperMemo`, `MemoSection`, `MemoItem`, `PaperStatus`, `PaperDifficulty`, AI generation request/response types. |
| `types/index.ts` | MODIFY: re-export. |
| `hooks/useTeacherPapers.ts` | CREATE: all paper API operations (list, fetch, generate, create, update, finalise, question CRUD, regen, memo update, downloads, delete). |
| `app/(dashboard)/teacher/papers/page.tsx` | CREATE: list with filters, "+ New Paper" button, empty states. |
| `app/(dashboard)/teacher/papers/new/page.tsx` | CREATE: wizard route. |
| `app/(dashboard)/teacher/papers/[id]/page.tsx` | CREATE: detail page (Paper / Memo tabs). |
| `components/papers/PaperWizard.tsx` | CREATE: multi-step wizard (metadata → mode → generate/create). |
| `components/papers/PaperWizardAIConfig.tsx` | CREATE: section count + per-section question count + difficulty config. |
| `components/papers/PaperWizardManualConfig.tsx` | CREATE: define section titles/instructions. (Q-bank picking happens on detail page in this module.) |
| `components/papers/PaperDetailPaperTab.tsx` | CREATE: render sections + questions with edit/regen/swap/delete. |
| `components/papers/PaperDetailMemoTab.tsx` | CREATE: render memo, editable per item. |
| `components/papers/QuestionEditDialog.tsx` | CREATE: edit text/marks/answer/guideline. |
| `components/papers/QuestionBankPicker.tsx` | CREATE: minimal picker (subject/grade filter). Empty state on day 1. |
| `app/(dashboard)/teacher/curriculum/assessments/page.tsx` | REPLACE: redirect to `/teacher/papers`. |
| `app/(dashboard)/teacher/curriculum/papers/page.tsx` | REPLACE: redirect. |
| `app/(dashboard)/teacher/ai-tools/create-paper/page.tsx` | REPLACE: redirect. |
| `app/(dashboard)/teacher/ai-tools/papers/page.tsx` | REPLACE: redirect. |
| `app/(dashboard)/teacher/workbench/papers/builder/page.tsx` | REPLACE: redirect. |
| `components/layout/Sidebar.tsx` | MODIFY: rename to single "Papers" entry → `/teacher/papers`. Hide deprecated entries. |

---

## Task Order (Dependency-Ordered)

1–8: Backend foundations + paper services
9–11: Backend PDF + AI gen + cleanup
12–13: Migration + deprecation
14–15: Frontend types + hook
16–18: List + Wizard + Detail pages
19–22: Detail-page interactions, Memo tab, Q-bank picker
23–24: Sidebar + legacy redirects
25: SoC sweep + acceptance

---

### Task 1: `AssessmentPaper` schema additions

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/model.ts`

- [ ] **Step 1: Read existing `AssessmentPaper` schema**

```bash
grep -n "AssessmentPaper\|assessmentPaperSchema\|IAssessmentPaper" c:/Users/shaun/campusly-backend/src/modules/QuestionBank/model.ts | head -20
```

Note the current shape: confirm `subjectId/gradeId` are refs, `sections[]`, `status`, `capsCompliance` exist.

- [ ] **Step 2: Apply additive schema changes**

In `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/model.ts`, in the `IAssessmentPaper` interface and `assessmentPaperSchema`:

**Interface — add fields:**
```ts
aiGenerated: boolean;
topicIds: Types.ObjectId[];
difficulty: 'easy' | 'medium' | 'hard';
```

**Schema — add fields:**
```ts
aiGenerated: { type: Boolean, default: false },
topicIds: {
  type: [Schema.Types.ObjectId],
  ref: 'CurriculumNode',
  required: true,
  validate: {
    validator: (v: Types.ObjectId[]) => Array.isArray(v) && v.length >= 1,
    message: 'topicIds must contain at least one curriculum topic',
  },
},
difficulty: {
  type: String,
  enum: ['easy', 'medium', 'hard'],
  default: 'medium',
},
```

**Section-question discriminated union** — modify the existing `sections[].questions[]` shape to support both `questionId` (bank-ref) and inlined fields. The simplest change: declare `questions` as a mixed array with both fields optional:

```ts
// Inside paperSectionSchema (already exists):
questions: [{
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', default: null },
  questionText: { type: String, default: null },
  marks: { type: Number, required: true, min: 0 },
  position: { type: Number, required: true, min: 0 },
  modelAnswer: { type: String, default: null },
  markingGuideline: { type: String, default: null },
  diagram: {
    tikz: { type: String, default: null },
    caption: { type: String, default: null },
    svgUrl: { type: String, default: null },
    renderStatus: { type: String, enum: ['pending', 'rendered', 'failed'], default: 'pending' },
  },
}]
```

Validation rule (enforced in service-paper-questions, not the schema): exactly one of `{ questionId }` or `{ questionText }` must be set per question.

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -20
```
Expected: errors in service files that constructed `AssessmentPaper` without the new required `topicIds` field. Those land in Task 4 (AI generation refactor) and Task 12 (migration script). Report errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/model.ts
git commit -m "feat(papers): AssessmentPaper schema — aiGenerated, topicIds (required), difficulty

Section questions become a discriminated union: questionId (bank-ref) vs
questionText (inline). Service layer enforces 'exactly one' rule.
topicIds must contain at least one CurriculumNode reference."
```

---

### Task 2: `AssessmentPaper` validation update

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/validation.ts`

- [ ] **Step 1: Read existing validation**

```bash
grep -n "createPaperSchema\|updatePaperSchema\|paperSection" c:/Users/shaun/campusly-backend/src/modules/QuestionBank/validation.ts
```

- [ ] **Step 2: Update create + update schemas**

In `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/validation.ts`:

```ts
import { z } from 'zod/v4';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// Question shape inside a section — bank-ref OR inline
const paperQuestionInputSchema = z.object({
  questionId: objectIdSchema.optional(),
  questionText: z.string().min(1).max(5000).optional(),
  marks: z.number().int().min(0).max(100),
  position: z.number().int().min(0),
  modelAnswer: z.string().max(5000).optional(),
  markingGuideline: z.string().max(5000).optional(),
  diagram: z.object({
    tikz: z.string().max(20000),
    caption: z.string().max(500).optional(),
  }).optional(),
}).refine(
  (q) => (q.questionId && !q.questionText) || (!q.questionId && q.questionText),
  { message: 'Exactly one of questionId or questionText must be set' },
);

const paperSectionInputSchema = z.object({
  title: z.string().min(1).max(200),
  instructions: z.string().max(2000).optional(),
  questions: z.array(paperQuestionInputSchema).max(100),
});

export const createPaperSchema = z.object({
  title: z.string().min(1).max(200),
  schoolId: objectIdSchema,
  subjectId: objectIdSchema,
  gradeId: objectIdSchema,
  topicIds: z.array(objectIdSchema).min(1).max(20),
  term: z.number().int().min(1).max(4),
  year: z.number().int().min(2000).max(2100),
  paperType: z.enum(['test', 'exam', 'quiz', 'assignment']),
  duration: z.number().int().min(5).max(480),
  totalMarks: z.number().int().min(1).max(500),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  aiGenerated: z.boolean().default(false),
  sections: z.array(paperSectionInputSchema).min(0).max(20).default([]),
  instructions: z.string().max(5000).optional(),
}).strict();

export const updatePaperSchema = createPaperSchema.partial().strict();

// AI generation request — section structure config
export const generatePaperSchema = z.object({
  schoolId: objectIdSchema,
  subjectId: objectIdSchema,
  gradeId: objectIdSchema,
  topicIds: z.array(objectIdSchema).min(1).max(20),
  term: z.number().int().min(1).max(4),
  year: z.number().int().min(2000).max(2100),
  paperType: z.enum(['test', 'exam', 'quiz', 'assignment']),
  duration: z.number().int().min(5).max(480),
  totalMarks: z.number().int().min(1).max(500),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  title: z.string().min(1).max(200),
  sectionConfig: z.array(z.object({
    title: z.string().min(1).max(200),
    instructions: z.string().max(2000).optional(),
    questionCount: z.number().int().min(1).max(50),
    sectionMarks: z.number().int().min(1).max(200),
  })).min(1).max(10),
  instructions: z.string().max(5000).optional(),
}).strict();

// Question CRUD on existing paper
export const addQuestionToPaperSchema = paperQuestionInputSchema;
export const updatePaperQuestionSchema = paperQuestionInputSchema.partial();

// Memo update
export const updateMemoSchema = z.object({
  sections: z.array(z.object({
    title: z.string().min(1).max(200),
    items: z.array(z.object({
      position: z.number().int().min(0),
      modelAnswer: z.string().max(5000),
      markingGuideline: z.string().max(5000).optional(),
      marks: z.number().int().min(0).max(100),
    })),
  })),
}).strict();

export type CreatePaperInput = z.infer<typeof createPaperSchema>;
export type UpdatePaperInput = z.infer<typeof updatePaperSchema>;
export type GeneratePaperInput = z.infer<typeof generatePaperSchema>;
export type AddQuestionToPaperInput = z.infer<typeof addQuestionToPaperSchema>;
export type UpdatePaperQuestionInput = z.infer<typeof updatePaperQuestionSchema>;
export type UpdateMemoInput = z.infer<typeof updateMemoSchema>;
```

Preserve any existing exports from this file that are imported by `routes.ts` — check first:
```bash
grep -n "from.*validation" c:/Users/shaun/campusly-backend/src/modules/QuestionBank/routes.ts
```
If `questionGenerationSchema`, `extractFromPaperSchema`, etc., are imported, keep them. Don't remove unrelated schemas.

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -20
```

Errors propagate from removed/renamed exports. Fix any caller that imports an old name. Report.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/validation.ts
git commit -m "feat(papers): require topicIds, add discriminated question shape

createPaperSchema and generatePaperSchema both require topicIds (min 1).
Question input is a discriminated union: questionId (bank-ref) XOR
questionText (inline). Adds memo update + question CRUD validators.
Uses Zod v4 non-deprecated API."
```

---

### Task 3: `assertCanEditPaper` helper + `assertPaperOwnership` import

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-papers.ts`

- [ ] **Step 1: Read existing ownership pattern in service-papers.ts**

```bash
grep -n "ADMIN_ROLES\|teacherId\|actorRole\|ForbiddenError" c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-papers.ts | head -20
```

The pattern likely matches Module 1's: `ADMIN_ROLES` Set + inline check on update/delete. If not, the helper introduces the standard pattern.

- [ ] **Step 2: Add helper near top of file**

```ts
import { ForbiddenError } from '../../common/errors.js';
import type { IAssessmentPaper } from './model.js';

const PAPER_ADMIN_ROLES = new Set(['school_admin', 'super_admin']);

export function assertCanEditPaper(
  paper: Pick<IAssessmentPaper, '_id' | 'createdBy' | 'status'>,
  actorId: string,
  actorRole: string,
  action: 'update' | 'delete' | 'finalise' | 'add-question' | 'edit-question' | 'remove-question' | 'edit-memo',
): void {
  const teacherIdStr = typeof paper.createdBy === 'string'
    ? paper.createdBy
    : paper.createdBy && typeof paper.createdBy === 'object' && '_id' in paper.createdBy
      ? String((paper.createdBy as { _id: unknown })._id)
      : String(paper.createdBy);
  const isOwner = teacherIdStr === actorId;
  const isAdmin = PAPER_ADMIN_ROLES.has(actorRole);
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(`You can only ${action} your own papers`);
  }
  // Question/memo mutations are blocked once paper is finalised
  const mutating = action !== 'finalise' && action !== 'delete';
  if (mutating && paper.status === 'finalised') {
    throw new ForbiddenError(`Cannot ${action} on a finalised paper. Reopen first.`);
  }
}
```

- [ ] **Step 3: Replace any existing inline ownership checks with helper calls**

In `updatePaper` and `deletePaper`, replace inline conditions with `assertCanEditPaper(paper, actorId, actorRole, 'update' /* or 'delete' */)`.

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/service-papers.ts
git commit -m "refactor(papers): extract assertCanEditPaper helper

Centralises owner/admin check + finalised-paper protection.
Action verb threaded through for clear error messages."
```

---

### Task 4: AI generation refactor — write `AssessmentPaper` + `PaperMemo` atomically

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-paper-generation.ts`

- [ ] **Step 1: Read existing generation flow**

```bash
cat c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-paper-generation.ts | head -150
```

Note: which model it currently writes (likely `GeneratedPaper` from AITools, OR `AssessmentPaper`). Note the AI prompt + the response shape parser.

- [ ] **Step 2: Refactor to write `AssessmentPaper` + `PaperMemo`**

Replace the persistence block with a compensation flow. The AI prompt + response parsing stay; only the DB write changes.

```ts
import mongoose from 'mongoose';
import { AssessmentPaper } from './model.js';
import { PaperMemo } from '../teacherWorkbench/model.assessment.js';
import type { GeneratePaperInput } from './validation.js';
import { logger } from '../../common/logger.js';

interface AIGenerationResult {
  sections: Array<{
    title: string;
    instructions?: string;
    questions: Array<{
      questionText: string;
      marks: number;
      modelAnswer: string;
      markingGuideline?: string;
      diagram?: { tikz: string; caption?: string };
    }>;
  }>;
}

export async function generatePaperFromAI(
  input: GeneratePaperInput,
  teacherId: string,
): Promise<{ paperId: string; memoId: string }> {
  // Step A: invoke Claude to get sections
  const ai = await callClaudeForPaper(input);  // existing function — keep its signature
  const aiResult = parseAIResponse(ai);  // existing parser

  // Step B: build paper + memo payloads
  const paperSections = aiResult.sections.map((s, sectionIdx) => ({
    title: s.title,
    instructions: s.instructions ?? '',
    questions: s.questions.map((q, qIdx) => ({
      questionText: q.questionText,
      marks: q.marks,
      position: qIdx,
      modelAnswer: q.modelAnswer,
      markingGuideline: q.markingGuideline ?? null,
      diagram: q.diagram ? {
        tikz: q.diagram.tikz,
        caption: q.diagram.caption ?? null,
        svgUrl: null,
        renderStatus: 'pending' as const,
      } : undefined,
    })),
  }));

  const memoSections = aiResult.sections.map((s, sectionIdx) => ({
    title: s.title,
    items: s.questions.map((q, qIdx) => ({
      position: qIdx,
      modelAnswer: q.modelAnswer,
      markingGuideline: q.markingGuideline ?? '',
      marks: q.marks,
    })),
  }));

  // Step C: create paper first
  let paperDoc: mongoose.Document | null = null;
  try {
    paperDoc = await AssessmentPaper.create({
      title: input.title,
      schoolId: input.schoolId,
      subjectId: input.subjectId,
      gradeId: input.gradeId,
      topicIds: input.topicIds,
      term: input.term,
      year: input.year,
      paperType: input.paperType,
      duration: input.duration,
      totalMarks: input.totalMarks,
      difficulty: input.difficulty,
      aiGenerated: true,
      sections: paperSections,
      instructions: input.instructions ?? '',
      status: 'draft',
      createdBy: teacherId,
    });
  } catch (err: unknown) {
    logger.error({ err, input: { teacherId, title: input.title } }, 'Failed to create paper from AI');
    throw err;
  }

  // Step D: create memo, rollback paper on failure
  try {
    const memoDoc = await PaperMemo.create({
      paperId: paperDoc._id,
      schoolId: input.schoolId,
      teacherId,
      sections: memoSections,
      totalMarks: input.totalMarks,
      status: 'draft',
    });

    // Step E: kick off async TikZ rendering (fire-and-forget)
    void renderPaperDiagrams(paperDoc._id as mongoose.Types.ObjectId).catch((err: unknown) => {
      logger.error({ err, paperId: String(paperDoc!._id) }, 'TikZ rendering failed (non-fatal)');
    });

    return { paperId: String(paperDoc._id), memoId: String(memoDoc._id) };
  } catch (memoErr: unknown) {
    // Compensation: rollback paper
    try {
      await AssessmentPaper.updateOne(
        { _id: paperDoc._id },
        { $set: { isDeleted: true } },
      );
    } catch (rollbackErr: unknown) {
      logger.error(
        { rollbackErr, originalErr: memoErr, paperId: String(paperDoc._id) },
        'Failed to rollback paper after memo create failure — orphan record may exist',
      );
    }
    throw memoErr;
  }
}

async function renderPaperDiagrams(paperId: mongoose.Types.ObjectId): Promise<void> {
  // Use existing renderDiagram from service-diagram.ts
  const { renderDiagram } = await import('./service-diagram.js');
  const paper = await AssessmentPaper.findById(paperId);
  if (!paper) return;
  for (let s = 0; s < paper.sections.length; s++) {
    for (let q = 0; q < paper.sections[s].questions.length; q++) {
      const question = paper.sections[s].questions[q];
      if (question.diagram?.tikz && question.diagram.renderStatus === 'pending') {
        try {
          const svgUrl = await renderDiagram(question.diagram.tikz);
          paper.sections[s].questions[q].diagram!.svgUrl = svgUrl;
          paper.sections[s].questions[q].diagram!.renderStatus = 'rendered';
        } catch {
          paper.sections[s].questions[q].diagram!.renderStatus = 'failed';
        }
      }
    }
  }
  await paper.save();
}
```

Adjust import paths to match the codebase. The existing `callClaudeForPaper` and `parseAIResponse` (or whatever they're called) stay — only persistence and the diagram-render trigger change.

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

- [ ] **Step 4: Smoke test (if backend + Redis up)**

```bash
curl -s http://localhost:4500/health 2>/dev/null && echo "up" || echo "skip — backend down"
```
If up, do an end-to-end generation; if down, rely on compile + later smoke in Task 25.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/service-paper-generation.ts
git commit -m "feat(papers): AI generation writes AssessmentPaper + PaperMemo atomically

Compensation flow — paper creates first, memo create failure rolls back
paper. Logs rollback failures (no silent orphans). TikZ rendering kicks
off async after both records persist; diagram-render failures degrade
the question (renderStatus='failed') without crashing the request."
```

---

### Task 5: New service — `service-paper-questions.ts`

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-paper-questions.ts`

- [ ] **Step 1: Write the file**

```ts
import mongoose from 'mongoose';
import { AssessmentPaper, type IAssessmentPaper } from './model.js';
import { PaperMemo } from '../teacherWorkbench/model.assessment.js';
import { Question } from './model.js';  // adjust if Question is elsewhere
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { logger } from '../../common/logger.js';
import { assertCanEditPaper } from './service-papers.js';
import type { AddQuestionToPaperInput, UpdatePaperQuestionInput } from './validation.js';

// Inline-vs-bank-ref: exactly one must be set on input
function assertExactlyOneSource(input: { questionId?: string; questionText?: string }): void {
  const hasId = !!input.questionId;
  const hasText = !!input.questionText;
  if (hasId === hasText) {
    throw new BadRequestError('Exactly one of questionId or questionText must be set');
  }
}

async function loadPaperOrThrow(
  paperId: string,
  schoolId: string,
): Promise<IAssessmentPaper> {
  const paper = await AssessmentPaper.findOne({
    _id: paperId,
    schoolId,
    isDeleted: false,
  });
  if (!paper) throw new NotFoundError('Paper not found');
  return paper;
}

export async function addQuestionToPaper(
  paperId: string,
  schoolId: string,
  sectionIdx: number,
  input: AddQuestionToPaperInput,
  actorId: string,
  actorRole: string,
): Promise<IAssessmentPaper> {
  assertExactlyOneSource(input);
  const paper = await loadPaperOrThrow(paperId, schoolId);
  assertCanEditPaper(paper, actorId, actorRole, 'add-question');

  if (sectionIdx < 0 || sectionIdx >= paper.sections.length) {
    throw new BadRequestError('Invalid section index');
  }

  const section = paper.sections[sectionIdx];
  const newPosition = section.questions.length;
  section.questions.push({
    questionId: input.questionId ? new mongoose.Types.ObjectId(input.questionId) : null,
    questionText: input.questionText ?? null,
    marks: input.marks,
    position: newPosition,
    modelAnswer: input.modelAnswer ?? null,
    markingGuideline: input.markingGuideline ?? null,
    diagram: input.diagram ? {
      tikz: input.diagram.tikz,
      caption: input.diagram.caption ?? null,
      svgUrl: null,
      renderStatus: 'pending' as const,
    } : undefined,
  } as never);

  await paper.save();

  // Append to memo
  await PaperMemo.updateOne(
    { paperId: paper._id },
    {
      $push: {
        [`sections.${sectionIdx}.items`]: {
          position: newPosition,
          modelAnswer: input.modelAnswer ?? '',
          markingGuideline: input.markingGuideline ?? '',
          marks: input.marks,
        },
      },
    },
  );

  return paper;
}

export async function updatePaperQuestion(
  paperId: string,
  schoolId: string,
  sectionIdx: number,
  position: number,
  patch: UpdatePaperQuestionInput,
  actorId: string,
  actorRole: string,
): Promise<IAssessmentPaper> {
  const paper = await loadPaperOrThrow(paperId, schoolId);
  assertCanEditPaper(paper, actorId, actorRole, 'edit-question');

  const section = paper.sections[sectionIdx];
  if (!section) throw new BadRequestError('Invalid section index');
  const q = section.questions.find((q) => q.position === position);
  if (!q) throw new NotFoundError('Question not found at this position');

  if (patch.questionText !== undefined) q.questionText = patch.questionText;
  if (patch.marks !== undefined) q.marks = patch.marks;
  if (patch.modelAnswer !== undefined) q.modelAnswer = patch.modelAnswer;
  if (patch.markingGuideline !== undefined) q.markingGuideline = patch.markingGuideline;
  await paper.save();

  // Mirror to memo if model answer or marks changed
  if (patch.modelAnswer !== undefined || patch.markingGuideline !== undefined || patch.marks !== undefined) {
    await PaperMemo.updateOne(
      { paperId: paper._id, [`sections.${sectionIdx}.items.position`]: position },
      {
        $set: {
          ...(patch.modelAnswer !== undefined && { [`sections.${sectionIdx}.items.$.modelAnswer`]: patch.modelAnswer }),
          ...(patch.markingGuideline !== undefined && { [`sections.${sectionIdx}.items.$.markingGuideline`]: patch.markingGuideline }),
          ...(patch.marks !== undefined && { [`sections.${sectionIdx}.items.$.marks`]: patch.marks }),
        },
      },
    );
  }

  return paper;
}

export async function deletePaperQuestion(
  paperId: string,
  schoolId: string,
  sectionIdx: number,
  position: number,
  actorId: string,
  actorRole: string,
): Promise<void> {
  const paper = await loadPaperOrThrow(paperId, schoolId);
  assertCanEditPaper(paper, actorId, actorRole, 'remove-question');

  const section = paper.sections[sectionIdx];
  if (!section) throw new BadRequestError('Invalid section index');
  const beforeCount = section.questions.length;
  section.questions = section.questions.filter((q) => q.position !== position) as never;
  if (section.questions.length === beforeCount) {
    throw new NotFoundError('Question not found at this position');
  }
  // Re-index remaining questions to keep positions contiguous
  section.questions.forEach((q, idx) => { q.position = idx; });
  await paper.save();

  // Mirror to memo
  await PaperMemo.updateOne(
    { paperId: paper._id },
    {
      $pull: {
        [`sections.${sectionIdx}.items`]: { position },
      },
    },
  );
}

export async function regeneratePaperQuestion(
  paperId: string,
  schoolId: string,
  sectionIdx: number,
  position: number,
  actorId: string,
  actorRole: string,
): Promise<IAssessmentPaper> {
  const paper = await loadPaperOrThrow(paperId, schoolId);
  assertCanEditPaper(paper, actorId, actorRole, 'edit-question');

  const section = paper.sections[sectionIdx];
  if (!section) throw new BadRequestError('Invalid section index');
  const q = section.questions.find((qq) => qq.position === position);
  if (!q) throw new NotFoundError('Question not found at this position');

  // Build single-question regen prompt
  const { regenerateSingleQuestion } = await import('./service-paper-generation.js');
  const newQuestion = await regenerateSingleQuestion({
    paper,
    sectionIdx,
    position,
    targetMarks: q.marks,
  });

  // Always severs bank-ref; result is inline
  q.questionId = null as never;
  q.questionText = newQuestion.questionText;
  q.modelAnswer = newQuestion.modelAnswer;
  q.markingGuideline = newQuestion.markingGuideline ?? null;
  q.diagram = newQuestion.diagram ? {
    tikz: newQuestion.diagram.tikz,
    caption: newQuestion.diagram.caption ?? null,
    svgUrl: null,
    renderStatus: 'pending' as const,
  } : undefined as never;

  await paper.save();

  // Mirror to memo
  await PaperMemo.updateOne(
    { paperId: paper._id, [`sections.${sectionIdx}.items.position`]: position },
    {
      $set: {
        [`sections.${sectionIdx}.items.$.modelAnswer`]: newQuestion.modelAnswer,
        [`sections.${sectionIdx}.items.$.markingGuideline`]: newQuestion.markingGuideline ?? '',
      },
    },
  );

  // Re-render diagram if present (fire-and-forget)
  if (q.diagram?.tikz) {
    const { renderDiagram } = await import('./service-diagram.js');
    void renderDiagram(q.diagram.tikz).then(async (svgUrl) => {
      await AssessmentPaper.updateOne(
        { _id: paper._id, [`sections.${sectionIdx}.questions.position`]: position },
        {
          $set: {
            [`sections.${sectionIdx}.questions.$.diagram.svgUrl`]: svgUrl,
            [`sections.${sectionIdx}.questions.$.diagram.renderStatus`]: 'rendered',
          },
        },
      );
    }).catch((err: unknown) => {
      logger.error({ err, paperId: String(paper._id) }, 'TikZ regen failed');
    });
  }

  return paper;
}

export async function updatePaperMemo(
  paperId: string,
  schoolId: string,
  patch: { sections: Array<{ title: string; items: Array<{ position: number; modelAnswer: string; markingGuideline?: string; marks: number }> }> },
  actorId: string,
  actorRole: string,
): Promise<void> {
  const paper = await loadPaperOrThrow(paperId, schoolId);
  assertCanEditPaper(paper, actorId, actorRole, 'edit-memo');

  await PaperMemo.updateOne(
    { paperId: paper._id },
    { $set: { sections: patch.sections } },
  );
}
```

`regenerateSingleQuestion` is referenced but lives in `service-paper-generation.ts` (Task 6 will add it).

- [ ] **Step 2: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
```
Expected: error in `service-paper-generation.ts` for missing `regenerateSingleQuestion` export. Will be fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/service-paper-questions.ts
git commit -m "feat(papers): paper-questions service — add/edit/delete/regen + memo mirror

Question CRUD on existing papers. Regenerate always severs bank-ref
(result is inline). All mutations mirror to PaperMemo. Position-based
addressing keeps memo aligned regardless of inline/bank-ref shape."
```

---

### Task 6: Lift `regenerateSingleQuestion` from AITools → QuestionBank

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-paper-generation.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/service.ts` (remove the duplicate)

- [ ] **Step 1: Find existing regenerate code in AITools**

```bash
grep -n "regenerate\|RegenerateQuestion" c:/Users/shaun/campusly-backend/src/modules/AITools/service.ts
```

Note the function name + signature.

- [ ] **Step 2: Port to `service-paper-generation.ts`**

In `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-paper-generation.ts`, append:

```ts
interface RegenerateInput {
  paper: IAssessmentPaper;
  sectionIdx: number;
  position: number;
  targetMarks: number;
}

interface RegenerateResult {
  questionText: string;
  modelAnswer: string;
  markingGuideline?: string;
  diagram?: { tikz: string; caption?: string };
}

export async function regenerateSingleQuestion(input: RegenerateInput): Promise<RegenerateResult> {
  const { paper, sectionIdx, position, targetMarks } = input;
  const subject = await Subject.findById(paper.subjectId).lean();
  const grade = await Grade.findById(paper.gradeId).lean();
  if (!subject || !grade) throw new BadRequestError('Subject or grade missing');

  const prompt = buildSingleQuestionPrompt({
    subject: subject.name,
    grade: grade.name,
    paperTopic: paper.title,
    targetMarks,
    difficulty: paper.difficulty,
    existingQuestionForReplacement: paper.sections[sectionIdx]?.questions.find((q) => q.position === position),
  });

  const response = await callClaude(prompt);  // existing helper
  const parsed = parseSingleQuestionResponse(response);

  return parsed;
}

function buildSingleQuestionPrompt(...): string { /* ... port from AITools, adapted to single-question scope ... */ }
function parseSingleQuestionResponse(raw: string): RegenerateResult { /* ... port from AITools, returns one question ... */ }
```

Read the AITools original to copy the prompt + parsing verbatim. Adapt only the signature.

- [ ] **Step 3: Remove from AITools**

In `c:/Users/shaun/campusly-backend/src/modules/AITools/service.ts`, remove the `regenerateQuestion` function (or whatever its name was). Update any AITools route or controller still calling it to call the new `regenerateSingleQuestion` from QuestionBank. (If AITools routes still expose this, we'll handle in Task 11's deprecation; for now just stop the AITools service from owning the logic.)

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/service-paper-generation.ts src/modules/AITools/service.ts
git commit -m "feat(papers): lift regenerateSingleQuestion from AITools to QuestionBank

Single-question regen now lives next to the canonical paper service.
AITools service no longer owns paper-question logic."
```

---

### Task 7: PDF generation — TikZ failure tolerance + local-TZ date

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-pdf.ts`

- [ ] **Step 1: Read the file**

Note: which generator function is the entry point. Find: how diagrams are embedded, how dates are formatted, how page breaks are handled.

```bash
grep -n "diagram\|svgUrl\|toISOString\|widow\|addPage" c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-pdf.ts | head -20
```

- [ ] **Step 2: TikZ failure tolerance**

For every place where the PDF embeds a diagram (likely `doc.image(svgUrl, ...)` or similar), wrap in try/catch + check `renderStatus === 'failed'`. On failure, render a placeholder text block:

```ts
function renderQuestionDiagram(doc: PDFKit.PDFDocument, diagram: { svgUrl?: string | null; renderStatus: string; caption?: string | null }): void {
  if (!diagram) return;
  if (diagram.renderStatus === 'rendered' && diagram.svgUrl) {
    try {
      doc.image(diagram.svgUrl, { width: 300, align: 'center' });
      if (diagram.caption) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#666').text(diagram.caption, { align: 'center' });
      }
    } catch {
      doc.font('Helvetica-Oblique').fontSize(10).fillColor('#999').text('[Diagram unavailable]', { align: 'center' });
    }
  } else if (diagram.renderStatus === 'pending') {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#999').text('[Diagram rendering — refresh shortly]', { align: 'center' });
  } else {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#999').text('[Diagram unavailable]', { align: 'center' });
  }
  doc.moveDown(0.6);
}
```

Replace the existing diagram-render call site with `renderQuestionDiagram(doc, question.diagram)`.

- [ ] **Step 3: Local-TZ date**

Find any `new Date(...).toISOString().slice(0, 10)` pattern. Replace with the helper from Module 1's lesson plan PDF:

```ts
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

If the helper is duplicated across PDF modules, consider extracting to `common/pdf/format-date.ts` — but only if that doesn't grow scope. Inline is acceptable.

- [ ] **Step 4: Question page-break heuristic**

For the loop rendering questions, check available space before each question and conditionally `doc.addPage()` if remaining space is less than expected question height. Conservative heuristic:

```ts
const ESTIMATED_QUESTION_LINES = (q: { questionText: string; marks: number; diagram?: unknown }) => {
  const textLines = Math.ceil(q.questionText.length / 80);
  const answerLines = Math.ceil(q.marks / 2);
  const diagramLines = q.diagram ? 12 : 0;
  return textLines + answerLines + diagramLines + 2; // +2 for spacing
};

const LINE_HEIGHT = 13;
const remaining = doc.page.height - doc.y - 60; // leave footer space
const need = ESTIMATED_QUESTION_LINES(question) * LINE_HEIGHT;
if (need > remaining) {
  doc.addPage();
}
```

Place this check before rendering each question.

- [ ] **Step 5: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

- [ ] **Step 6: Smoke-test locally**

If backend up, generate a paper and download PDF (will be done end-to-end in Task 25). For now, write a tiny scratch:

```bash
cd c:/Users/shaun/campusly-backend
cat > /tmp/pdf-smoke.ts <<'EOF'
import { renderPaperPdf } from './src/modules/QuestionBank/service-pdf.js';
import { writeFileSync } from 'fs';

const fakePaper = {
  title: 'Smoke Test Paper',
  subjectId: { name: 'Mathematics' },
  gradeId: { name: 'Grade 4' },
  term: 2,
  year: 2026,
  duration: 60,
  totalMarks: 50,
  paperType: 'test',
  instructions: 'Answer all questions.',
  sections: [
    {
      title: 'Section A',
      instructions: 'Short answers',
      questions: [
        { position: 0, questionText: 'What is 2+2?', marks: 2, diagram: null },
        { position: 1, questionText: 'Solve x+5=12', marks: 4, diagram: { renderStatus: 'failed' } },
      ],
    },
  ],
  createdAt: new Date(),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buf = await renderPaperPdf(fakePaper as any, { name: 'Test School' });
writeFileSync('/tmp/paper.pdf', buf);
console.log('bytes:', buf.length, 'starts:', buf.slice(0, 4).toString());
EOF
npx tsx /tmp/pdf-smoke.ts
rm -f /tmp/pdf-smoke.ts /tmp/paper.pdf
```
Expected: prints `%PDF`, file > 1KB. (Adjust function name if `renderPaperPdf` isn't the actual export.)

- [ ] **Step 7: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/service-pdf.ts
git commit -m "fix(papers): PDF — TikZ failure tolerance, local-TZ date, page-break heuristic

Diagram rendering failures degrade to placeholder text — never crash the
PDF stream. ISO date in metadata uses local timezone (CLAUDE.md pitfall).
Conservative widow heuristic prevents questions splitting awkwardly."
```

---

### Task 8: New service — `service-memo-pdf.ts`

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-memo-pdf.ts`

- [ ] **Step 1: Write the generator**

```ts
import PDFDocument from 'pdfkit';
import type { IAssessmentPaper } from './model.js';
import type { IPaperMemo } from '../teacherWorkbench/model.assessment.js';
import type { ISchool } from '../School/model.js';

const GRAY = '#666666';
const BLACK = '#000000';

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function generateMemoPdf(
  paper: Pick<IAssessmentPaper, 'title' | 'subjectId' | 'gradeId' | 'term' | 'year' | 'totalMarks' | 'duration' | 'sections'>,
  memo: Pick<IPaperMemo, 'sections' | 'totalMarks'>,
  school: Pick<ISchool, 'name'>,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  // Header
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text(school.name);
  doc.moveTo(42, doc.y + 2).lineTo(553, doc.y + 2).strokeColor(GRAY).stroke();
  doc.moveDown(0.6);

  // Title
  doc.font('Helvetica-Bold').fontSize(16).fillColor(BLACK).text(`MEMORANDUM — ${paper.title}`);
  doc.font('Helvetica').fontSize(10).fillColor(GRAY).text(
    [
      typeof paper.subjectId === 'object' && paper.subjectId && 'name' in paper.subjectId ? (paper.subjectId as { name: string }).name : '',
      typeof paper.gradeId === 'object' && paper.gradeId && 'name' in paper.gradeId ? (paper.gradeId as { name: string }).name : '',
      `Term ${paper.term}`,
      String(paper.year),
      `${paper.totalMarks} marks`,
      `${paper.duration} min`,
      formatLocalDate(new Date()),
    ].filter(Boolean).join('  \u2022  '),
  );
  doc.moveDown(1);

  // Sections
  memo.sections.forEach((section, sectionIdx) => {
    doc.font('Helvetica-Bold').fontSize(13).fillColor(BLACK).text(section.title);
    doc.moveDown(0.3);

    const paperSection = paper.sections[sectionIdx];
    section.items.forEach((item) => {
      const paperQ = paperSection?.questions.find((q) => q.position === item.position);
      const questionText = paperQ?.questionText ?? '';
      const questionLabel = `${sectionIdx + 1}.${item.position + 1}`;

      doc.font('Helvetica-Bold').fontSize(11).fillColor(BLACK).text(`${questionLabel}.  ${questionText}  [${item.marks}]`);
      doc.moveDown(0.2);

      doc.font('Helvetica').fontSize(11).fillColor(BLACK).text('Answer: ', { continued: true });
      doc.font('Helvetica').fontSize(11).fillColor(BLACK).text(item.modelAnswer);

      if (item.markingGuideline) {
        doc.moveDown(0.2);
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(GRAY).text(`Marking guideline: ${item.markingGuideline}`);
      }
      doc.moveDown(0.6);
    });
    doc.moveDown(0.4);
  });

  // Footer
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(pages.start + i);
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(
      `Memorandum  \u2022  page ${i + 1} of ${pages.count}`,
      42,
      doc.page.height - 30,
      { align: 'center', width: 511 },
    );
  }

  doc.end();
  return done;
}
```

- [ ] **Step 2: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/service-memo-pdf.ts
git commit -m "feat(papers): memo PDF generator

Programmatic A4 layout. Per-question: number, text, marks, model answer,
optional marking guideline (italic). Reuses paper PDF conventions
(Helvetica, 42pt margin, gray for meta). Local-TZ date."
```

---

### Task 9: Wire new endpoints — controllers + routes

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/controller.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/routes.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-papers.ts` (add `finalisePaper`, `getPaperPdfBuffer`, `getMemoPdfBuffer`)

- [ ] **Step 1: Add finalise + PDF buffer service helpers**

In `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-papers.ts`:

```ts
import { generateMemoPdf } from './service-memo-pdf.js';
// ... existing imports ...

export async function finalisePaper(
  paperId: string,
  schoolId: string,
  actorId: string,
  actorRole: string,
  actorIsPrincipal: boolean,
): Promise<IAssessmentPaper> {
  const paper = await AssessmentPaper.findOne({ _id: paperId, schoolId, isDeleted: false });
  if (!paper) throw new NotFoundError('Paper not found');
  assertCanEditPaper(paper, actorId, actorRole, 'finalise');

  if (paper.status === 'finalised') return paper;

  // Solo-principal bypass: auto-finalise without moderation
  if (actorIsPrincipal || PAPER_ADMIN_ROLES.has(actorRole)) {
    paper.status = 'finalised';
    paper.finalisedAt = new Date();
    paper.finalisedBy = new mongoose.Types.ObjectId(actorId);
    await paper.save();

    // Mark memo final too
    await PaperMemo.updateOne(
      { paperId: paper._id },
      { $set: { status: 'final' } },
    );
    return paper;
  }

  // Non-principal teacher: moderation deferred (Module 2 scope)
  throw new ForbiddenError(
    'Paper finalisation requires moderation. Moderation flow is not yet enabled — contact your school admin.',
  );
}

export async function getPaperPdfBuffer(
  paperId: string,
  schoolId: string,
  actorId: string,
  actorRole: string,
): Promise<Buffer> {
  const paper = await AssessmentPaper.findOne({ _id: paperId, schoolId, isDeleted: false })
    .populate('subjectId', 'name code')
    .populate('gradeId', 'name')
    .populate('topicIds', 'title code');
  if (!paper) throw new NotFoundError('Paper not found');
  assertCanEditPaper(paper, actorId, actorRole, 'update');  // 'access'-equivalent — requires owner or admin

  const school = await School.findById(paper.schoolId).select('name');
  if (!school) throw new NotFoundError('School missing');

  const { renderPaperPdf } = await import('./service-pdf.js');  // existing
  return renderPaperPdf(paper, school);
}

export async function getMemoPdfBuffer(
  paperId: string,
  schoolId: string,
  actorId: string,
  actorRole: string,
): Promise<Buffer> {
  const paper = await AssessmentPaper.findOne({ _id: paperId, schoolId, isDeleted: false })
    .populate('subjectId', 'name')
    .populate('gradeId', 'name');
  if (!paper) throw new NotFoundError('Paper not found');
  assertCanEditPaper(paper, actorId, actorRole, 'update');

  const memo = await PaperMemo.findOne({ paperId: paper._id, isDeleted: false });
  if (!memo) throw new NotFoundError('Memo not found');

  const school = await School.findById(paper.schoolId).select('name');
  if (!school) throw new NotFoundError('School missing');

  return generateMemoPdf(paper, memo, school);
}
```

Adjust the populate field name (`createdBy` may need population too if `assertCanEditPaper` reads it).

Also extend `deletePaper` to cascade delete the memo:

```ts
export async function deletePaper(paperId: string, schoolId: string, actorId: string, actorRole: string): Promise<void> {
  const paper = await AssessmentPaper.findOne({ _id: paperId, schoolId, isDeleted: false });
  if (!paper) throw new NotFoundError('Paper not found');
  assertCanEditPaper(paper, actorId, actorRole, 'delete');

  // Cascade memo first
  await PaperMemo.updateOne(
    { paperId: paper._id, isDeleted: false },
    { $set: { isDeleted: true } },
  );

  paper.isDeleted = true;
  await paper.save();
}
```

- [ ] **Step 2: Add controller handlers**

In `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/controller.ts`:

```ts
import { Request, Response } from 'express';
import {
  finalisePaper,
  getPaperPdfBuffer,
  getMemoPdfBuffer,
} from './service-papers.js';
import {
  addQuestionToPaper,
  updatePaperQuestion,
  deletePaperQuestion,
  regeneratePaperQuestion,
  updatePaperMemo,
} from './service-paper-questions.js';
import {
  addQuestionToPaperSchema,
  updatePaperQuestionSchema,
  updateMemoSchema,
} from './validation.js';
import { apiResponse } from '../../common/utils.js';
import { getUser } from '../../types/authenticated-request.js';

// Add question to existing paper section
export async function postAddQuestionToPaper(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const sectionIdx = Number(req.params.sectionIdx);
  const parsed = addQuestionToPaperSchema.parse(req.body);
  const result = await addQuestionToPaper(
    req.params.id, user.schoolId!, sectionIdx, parsed, user.id, user.role,
  );
  res.status(201).json(apiResponse(true, result, 'Question added'));
}

// Update question
export async function putUpdatePaperQuestion(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const sectionIdx = Number(req.params.sectionIdx);
  const position = Number(req.params.position);
  const parsed = updatePaperQuestionSchema.parse(req.body);
  const result = await updatePaperQuestion(
    req.params.id, user.schoolId!, sectionIdx, position, parsed, user.id, user.role,
  );
  res.status(200).json(apiResponse(true, result, 'Question updated'));
}

// Regenerate question
export async function postRegeneratePaperQuestion(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const sectionIdx = Number(req.params.sectionIdx);
  const position = Number(req.params.position);
  const result = await regeneratePaperQuestion(
    req.params.id, user.schoolId!, sectionIdx, position, user.id, user.role,
  );
  res.status(200).json(apiResponse(true, result, 'Question regenerated'));
}

// Delete question
export async function deleteRemovePaperQuestion(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const sectionIdx = Number(req.params.sectionIdx);
  const position = Number(req.params.position);
  await deletePaperQuestion(
    req.params.id, user.schoolId!, sectionIdx, position, user.id, user.role,
  );
  res.status(204).end();
}

// Update memo
export async function putUpdateMemo(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const parsed = updateMemoSchema.parse(req.body);
  await updatePaperMemo(req.params.id, user.schoolId!, parsed, user.id, user.role);
  res.status(204).end();
}

// Finalise
export async function postFinalisePaper(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const result = await finalisePaper(
    req.params.id, user.schoolId!, user.id, user.role, !!user.isSchoolPrincipal,
  );
  res.status(200).json(apiResponse(true, result, 'Paper finalised'));
}

// Paper PDF
export async function getPaperPdf(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const buf = await getPaperPdfBuffer(req.params.id, user.schoolId!, user.id, user.role);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="paper-${req.params.id}.pdf"`);
  res.send(buf);
}

// Memo PDF
export async function getMemoPdf(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const buf = await getMemoPdfBuffer(req.params.id, user.schoolId!, user.id, user.role);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="memo-${req.params.id}.pdf"`);
  res.send(buf);
}
```

- [ ] **Step 3: Register routes**

In `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/routes.ts`:

```ts
import {
  postAddQuestionToPaper, putUpdatePaperQuestion, postRegeneratePaperQuestion,
  deleteRemovePaperQuestion, putUpdateMemo, postFinalisePaper,
  getPaperPdf, getMemoPdf,
} from './controller.js';

// inside the existing router setup:
router.post('/papers/:id/sections/:sectionIdx/questions', authenticate, authorize('teacher', 'school_admin', 'super_admin'), postAddQuestionToPaper);
router.put('/papers/:id/sections/:sectionIdx/questions/:position', authenticate, authorize('teacher', 'school_admin', 'super_admin'), putUpdatePaperQuestion);
router.post('/papers/:id/sections/:sectionIdx/questions/:position/regenerate', authenticate, authorize('teacher', 'school_admin', 'super_admin'), postRegeneratePaperQuestion);
router.delete('/papers/:id/sections/:sectionIdx/questions/:position', authenticate, authorize('teacher', 'school_admin', 'super_admin'), deleteRemovePaperQuestion);
router.put('/papers/:id/memo', authenticate, authorize('teacher', 'school_admin', 'super_admin'), putUpdateMemo);
router.post('/papers/:id/finalise', authenticate, authorize('teacher', 'school_admin', 'super_admin'), postFinalisePaper);
router.get('/papers/:id/pdf', authenticate, authorize('teacher', 'school_admin', 'super_admin'), getPaperPdf);
router.get('/papers/:id/memo-pdf', authenticate, authorize('teacher', 'school_admin', 'super_admin'), getMemoPdf);
```

Match the existing route style — middleware names should be exact.

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Clean expected.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/service-papers.ts src/modules/QuestionBank/controller.ts src/modules/QuestionBank/routes.ts
git commit -m "feat(papers): wire question CRUD, memo update, finalise, PDF endpoints

Routes (all auth + RBAC, school-scoped):
  POST   /papers/:id/sections/:sectionIdx/questions
  PUT    /papers/:id/sections/:sectionIdx/questions/:position
  POST   /papers/:id/sections/:sectionIdx/questions/:position/regenerate
  DELETE /papers/:id/sections/:sectionIdx/questions/:position
  PUT    /papers/:id/memo
  POST   /papers/:id/finalise (solo-principal bypass; non-principal returns 403)
  GET    /papers/:id/pdf
  GET    /papers/:id/memo-pdf"
```

---

### Task 10: Migration script — backfill `GeneratedPaper` → `AssessmentPaper` + `PaperMemo`

**Files:**
- Create: `c:/Users/shaun/campusly-backend/scripts/migrate-generated-papers.ts`

- [ ] **Step 1: Write the script**

```ts
/**
 * Migrate GeneratedPaper docs to AssessmentPaper + PaperMemo.
 * One-shot. Idempotent (skips already-migrated docs).
 *
 * Run: npx tsx scripts/migrate-generated-papers.ts
 */
import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { GeneratedPaper } from '../src/modules/AITools/model.js';
import { AssessmentPaper } from '../src/modules/QuestionBank/model.js';
import { PaperMemo } from '../src/modules/teacherWorkbench/model.assessment.js';
import { Subject } from '../src/modules/Academic/model.js';
import { Grade } from '../src/modules/Academic/model.js';
import { CurriculumNode } from '../src/modules/CurriculumStructure/model.js';
import { logger } from '../src/common/logger.js';

async function migrate(): Promise<void> {
  await mongoose.connect(config.mongodb.uri);
  logger.info('Connected to MongoDB');

  const generated = await GeneratedPaper.find({ isDeleted: false });
  logger.info(`Found ${generated.length} GeneratedPaper docs to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const gp of generated) {
    // Resolve refs
    const subject = await Subject.findOne({ schoolId: gp.schoolId, name: { $regex: new RegExp(`^${escapeRegex(gp.subject)}$`, 'i') } });
    if (!subject) {
      logger.warn(`Skipping GeneratedPaper ${gp._id}: subject "${gp.subject}" not found`);
      skipped++; continue;
    }

    const grade = await Grade.findOne({ schoolId: gp.schoolId, name: { $regex: new RegExp(`^${escapeRegex(gp.grade)}$`, 'i') } });
    if (!grade) {
      logger.warn(`Skipping GeneratedPaper ${gp._id}: grade "${gp.grade}" not found`);
      skipped++; continue;
    }

    // Best-effort topic lookup by gp.topic string
    const topicNode = await CurriculumNode.findOne({
      type: 'topic',
      title: { $regex: new RegExp(`^${escapeRegex(gp.topic ?? '')}`, 'i') },
    });
    const topicIds = topicNode ? [topicNode._id] : [];
    if (topicIds.length === 0) {
      logger.warn(`GeneratedPaper ${gp._id}: no matching topic for "${gp.topic}", using empty topicIds (will fail validation)`);
      skipped++; continue;
    }

    // Build AssessmentPaper
    const paperSections = (gp.sections ?? []).map((s, sectionIdx) => ({
      title: s.title ?? `Section ${sectionIdx + 1}`,
      instructions: s.instructions ?? '',
      questions: (s.questions ?? []).map((q, qIdx) => ({
        questionId: null,
        questionText: q.questionText ?? '',
        marks: q.marks ?? 1,
        position: qIdx,
        modelAnswer: q.modelAnswer ?? null,
        markingGuideline: q.markingGuideline ?? null,
        diagram: q.diagram ? {
          tikz: q.diagram.tikz,
          caption: q.diagram.caption ?? null,
          svgUrl: q.diagram.svgUrl ?? null,
          renderStatus: q.diagram.renderStatus ?? 'pending',
        } : undefined,
      })),
    }));

    const paper = await AssessmentPaper.create({
      title: gp.title ?? 'Migrated paper',
      schoolId: gp.schoolId,
      subjectId: subject._id,
      gradeId: grade._id,
      topicIds,
      term: gp.term ?? 1,
      year: gp.year ?? new Date().getFullYear(),
      paperType: gp.paperType ?? 'test',
      duration: gp.duration ?? 60,
      totalMarks: gp.totalMarks ?? 50,
      difficulty: gp.difficulty ?? 'medium',
      aiGenerated: true,
      sections: paperSections,
      instructions: gp.instructions ?? '',
      status: gp.status === 'edited' ? 'draft' : (gp.status === 'ready' ? 'draft' : 'draft'),
      createdBy: gp.teacherId,
    });

    // Build PaperMemo from gp.memorandum
    const memoSections = (gp.memorandum?.sections ?? []).map((ms, sIdx) => ({
      title: ms.title ?? paperSections[sIdx]?.title ?? `Section ${sIdx + 1}`,
      items: (ms.items ?? []).map((item, iIdx) => ({
        position: iIdx,
        modelAnswer: item.modelAnswer ?? '',
        markingGuideline: item.markingGuideline ?? '',
        marks: item.marks ?? 0,
      })),
    }));

    await PaperMemo.create({
      paperId: paper._id,
      schoolId: gp.schoolId,
      teacherId: gp.teacherId,
      sections: memoSections,
      totalMarks: gp.totalMarks ?? 50,
      status: 'draft',
    });

    // Soft-delete original
    await GeneratedPaper.updateOne({ _id: gp._id }, { $set: { isDeleted: true } });
    migrated++;
  }

  logger.info(`Migration complete. Migrated: ${migrated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

migrate().catch((err: unknown) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
```

- [ ] **Step 2: Verify the script compiles via tsx**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit scripts/migrate-generated-papers.ts 2>&1 | head -20
```
(Skip if tsconfig excludes scripts/. Then just verify with a dry tsx invocation.)

- [ ] **Step 3: Run if MongoDB is up**

```bash
docker ps --format '{{.Names}}' | grep -q campusly-mongo && docker start campusly-mongo 2>/dev/null
docker ps | grep mongo
cd c:/Users/shaun/campusly-backend
npx tsx scripts/migrate-generated-papers.ts
```
If Mongo is down, skip and run later — the script is idempotent.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add scripts/migrate-generated-papers.ts
git commit -m "chore(papers): migration script for GeneratedPaper -> AssessmentPaper + PaperMemo

One-shot, idempotent. Resolves subject/grade by name, topic by title.
Skips + logs unresolved docs. Soft-deletes the original GeneratedPaper
records so re-runs don't duplicate."
```

---

### Task 11: Deprecate AITools paper routes (308 redirects)

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/routes.ts`

- [ ] **Step 1: Read existing AITools routes**

```bash
grep -n "router.\(get\|post\|put\|delete\)" c:/Users/shaun/campusly-backend/src/modules/AITools/routes.ts
```

Identify paper-related routes (likely `/generate-paper`, `/papers`, `/papers/:id`, `/papers/:id/pdf`, `/papers/:id/memo-pdf`, `/papers/:id/regenerate-question`).

- [ ] **Step 2: Replace paper routes with 308 redirects**

For each paper-related route, replace the handler with a redirect:

```ts
// Before:
router.post('/generate-paper', authenticate, authorize(...), generatePaperHandler);

// After:
router.post('/generate-paper', (req, res) => {
  res.redirect(308, '/api/papers/generate');
});

router.get('/papers', (req, res) => {
  const qs = req.url.split('?')[1] ? '?' + req.url.split('?')[1] : '';
  res.redirect(308, '/api/papers' + qs);
});

router.get('/papers/:id', (req, res) => {
  res.redirect(308, `/api/papers/${req.params.id}`);
});

router.get('/papers/:id/pdf', (req, res) => {
  res.redirect(308, `/api/papers/${req.params.id}/pdf`);
});

router.get('/papers/:id/memo-pdf', (req, res) => {
  res.redirect(308, `/api/papers/${req.params.id}/memo-pdf`);
});

router.put('/papers/:id', (req, res) => {
  res.redirect(308, `/api/papers/${req.params.id}`);
});

router.post('/papers/:id/regenerate-question', (req, res) => {
  res.redirect(308, `/api/papers/${req.params.id}/regenerate-question`);
});
```

Adjust per the actual paths found in step 1. Use 308 (Permanent Redirect, preserves method + body).

Keep MARKING-related routes (`/mark-paper`, `/grade-submission`, etc.) untouched — they're Module 3.

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

- [ ] **Step 4: Smoke test redirect (if backend up)**

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -X GET http://localhost:4500/api/ai-tools/papers
```
Expected: `308 ...api/papers...` or similar.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/routes.ts
git commit -m "chore(papers): 308-redirect deprecated /api/ai-tools paper routes

All paper CRUD + generation routes redirect to /api/papers (canonical).
Marking routes (/mark-paper etc.) untouched — Module 3 scope.
308 preserves method + body for POST/PUT clients."
```

---

### Task 12: Remove `GeneratedPaper` model + service code

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/model.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/service.ts`

- [ ] **Step 1: Find consumers**

```bash
grep -rn "GeneratedPaper\|IGeneratedPaper" c:/Users/shaun/campusly-backend/src/
```

Anywhere a Marking module or other module references `GeneratedPaper`, change the reference to `AssessmentPaper` (from QuestionBank/model). The marking module flagged `GeneratedPaper` as a downstream consumer — fix any reference.

- [ ] **Step 2: Remove the model + interface**

In `c:/Users/shaun/campusly-backend/src/modules/AITools/model.ts`, delete:
- `GeneratedPaper` schema declaration
- `IGeneratedPaper` interface
- `GeneratedPaper` model export

Keep marking-related models (e.g., `Marking`, `GradingJob`, `Submission`) untouched.

- [ ] **Step 3: Remove generator code from `service.ts`**

In `c:/Users/shaun/campusly-backend/src/modules/AITools/service.ts`, remove:
- `generatePaper` (now in QuestionBank)
- `regenerateQuestion` (now in QuestionBank)
- Any other paper-CRUD service functions

Keep marking service logic.

- [ ] **Step 4: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: errors anywhere a deleted import is still referenced. Fix each by importing from QuestionBank instead.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add -u
git commit -m "chore(papers): remove GeneratedPaper model + paper services from AITools

The 2 existing GeneratedPaper docs were migrated in Task 10. AITools
module now contains only marking-related code. Marking module references
updated to point at AssessmentPaper from QuestionBank."
```

---

### Task 13: Frontend types — `Paper`, `PaperMemo`, `PaperQuestion` union

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/types/papers.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/types/index.ts`

- [ ] **Step 1: Write `papers.ts`**

```ts
export type PaperStatus = 'draft' | 'finalised' | 'archived';
export type PaperDifficulty = 'easy' | 'medium' | 'hard';
export type PaperType = 'test' | 'exam' | 'quiz' | 'assignment';

export interface PaperDiagram {
  tikz: string;
  caption?: string | null;
  svgUrl?: string | null;
  renderStatus: 'pending' | 'rendered' | 'failed';
}

interface PaperQuestionBase {
  marks: number;
  position: number;
  modelAnswer?: string | null;
  markingGuideline?: string | null;
  diagram?: PaperDiagram;
}

export interface BankRefQuestion extends PaperQuestionBase {
  questionId: string;
  questionText?: string | null; // populated from bank on read
}

export interface InlineQuestion extends PaperQuestionBase {
  questionId: null;
  questionText: string;
}

export type PaperQuestion = BankRefQuestion | InlineQuestion;

export interface PaperSection {
  title: string;
  instructions?: string | null;
  questions: PaperQuestion[];
}

export interface Paper {
  _id: string;
  title: string;
  schoolId: string;
  subjectId: string | { _id: string; name: string; code?: string };
  gradeId: string | { _id: string; name: string };
  topicIds: string[] | Array<{ _id: string; title: string; code?: string }>;
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  totalMarks: number;
  difficulty: PaperDifficulty;
  aiGenerated: boolean;
  sections: PaperSection[];
  instructions?: string | null;
  status: PaperStatus;
  createdBy: string | { _id: string; firstName: string; lastName: string };
  finalisedAt?: string | null;
  finalisedBy?: string | null;
  capsCompliance?: { score: number; report?: string } | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemoItem {
  position: number;
  modelAnswer: string;
  markingGuideline?: string;
  marks: number;
}

export interface MemoSection {
  title: string;
  items: MemoItem[];
}

export interface PaperMemo {
  _id: string;
  paperId: string;
  schoolId: string;
  teacherId: string;
  sections: MemoSection[];
  totalMarks: number;
  status: 'draft' | 'final';
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// AI generation request shape
export interface AIPaperSectionConfig {
  title: string;
  instructions?: string;
  questionCount: number;
  sectionMarks: number;
}

export interface GeneratePaperRequest {
  schoolId: string;
  subjectId: string;
  gradeId: string;
  topicIds: string[];
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  totalMarks: number;
  difficulty: PaperDifficulty;
  title: string;
  sectionConfig: AIPaperSectionConfig[];
  instructions?: string;
}

export interface CreatePaperManualInput {
  title: string;
  schoolId: string;
  subjectId: string;
  gradeId: string;
  topicIds: string[];
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  totalMarks: number;
  difficulty: PaperDifficulty;
  sections: Array<{ title: string; instructions?: string; questions: [] }>;
  instructions?: string;
}

export interface AddQuestionInput {
  questionId?: string;
  questionText?: string;
  marks: number;
  position: number;
  modelAnswer?: string;
  markingGuideline?: string;
  diagram?: { tikz: string; caption?: string };
}
```

- [ ] **Step 2: Re-export from index.ts**

```ts
// Add to src/types/index.ts
export * from './papers';
```

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Clean expected (no consumers yet).

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/types/papers.ts src/types/index.ts
git commit -m "feat(types): Paper, PaperMemo, PaperQuestion (BankRef|Inline union)

Discriminated PaperQuestion mirrors backend's exactly-one-of rule.
Adds AI generation request types + manual-create input."
```

---

### Task 14: Hook — `useTeacherPapers`

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/useTeacherPapers.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { AxiosResponse } from 'axios';
import type {
  Paper, PaperMemo, GeneratePaperRequest, CreatePaperManualInput, AddQuestionInput,
} from '@/types';

interface UseTeacherPapersResult {
  papers: Paper[];
  loading: boolean;
  fetchPapers: (filters?: PaperFilters) => Promise<void>;
  filters: PaperFilters;
  setFilters: (f: PaperFilters) => void;
  getPaperById: (id: string) => Promise<Paper | null>;
  getMemoByPaperId: (id: string) => Promise<PaperMemo | null>;
  generatePaperWithAI: (input: GeneratePaperRequest) => Promise<{ paperId: string } | null>;
  createPaperManual: (input: CreatePaperManualInput) => Promise<Paper | null>;
  updatePaperMetadata: (id: string, patch: Partial<Paper>) => Promise<Paper | null>;
  addQuestion: (paperId: string, sectionIdx: number, input: AddQuestionInput) => Promise<Paper | null>;
  updateQuestion: (paperId: string, sectionIdx: number, position: number, patch: Partial<AddQuestionInput>) => Promise<Paper | null>;
  regenerateQuestion: (paperId: string, sectionIdx: number, position: number) => Promise<Paper | null>;
  deleteQuestion: (paperId: string, sectionIdx: number, position: number) => Promise<boolean>;
  updateMemo: (paperId: string, sections: PaperMemo['sections']) => Promise<boolean>;
  finalisePaper: (id: string) => Promise<Paper | null>;
  downloadPaperPdf: (id: string) => Promise<void>;
  downloadMemoPdf: (id: string) => Promise<void>;
  deletePaper: (id: string) => Promise<boolean>;
}

interface PaperFilters {
  subjectId?: string;
  gradeId?: string;
  term?: number;
  year?: number;
  status?: string;
}

export function useTeacherPapers(): UseTeacherPapersResult {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<PaperFilters>({});

  const fetchPapers = useCallback(async (overrideFilters?: PaperFilters): Promise<void> => {
    setLoading(true);
    try {
      const params = overrideFilters ?? filters;
      const res = await apiClient.get('/papers', { params });
      setPapers(unwrapList(res) as Paper[]);
    } catch (err: unknown) {
      console.error('Failed to load papers', err);
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void fetchPapers(); }, [fetchPapers]);

  const getPaperById = useCallback(async (id: string): Promise<Paper | null> => {
    try {
      const res = await apiClient.get(`/papers/${id}`);
      return unwrapResponse(res) as Paper;
    } catch (err: unknown) {
      console.error(err);
      return null;
    }
  }, []);

  const getMemoByPaperId = useCallback(async (id: string): Promise<PaperMemo | null> => {
    try {
      const res = await apiClient.get(`/papers/${id}/memo`);
      return unwrapResponse(res) as PaperMemo;
    } catch (err: unknown) {
      console.error(err);
      return null;
    }
  }, []);

  const generatePaperWithAI = useCallback(async (input: GeneratePaperRequest): Promise<{ paperId: string } | null> => {
    try {
      const res = await apiClient.post('/papers/generate', input);
      const data = unwrapResponse(res) as { paperId: string };
      toast.success('Paper generated');
      return data;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed');
      return null;
    }
  }, []);

  const createPaperManual = useCallback(async (input: CreatePaperManualInput): Promise<Paper | null> => {
    try {
      const res = await apiClient.post('/papers', input);
      const paper = unwrapResponse(res) as Paper;
      toast.success('Paper created');
      return paper;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
      return null;
    }
  }, []);

  const updatePaperMetadata = useCallback(async (id: string, patch: Partial<Paper>): Promise<Paper | null> => {
    try {
      const res = await apiClient.put(`/papers/${id}`, patch);
      return unwrapResponse(res) as Paper;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
      return null;
    }
  }, []);

  const addQuestion = useCallback(async (paperId: string, sectionIdx: number, input: AddQuestionInput): Promise<Paper | null> => {
    try {
      const res = await apiClient.post(`/papers/${paperId}/sections/${sectionIdx}/questions`, input);
      return unwrapResponse(res) as Paper;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Add failed');
      return null;
    }
  }, []);

  const updateQuestion = useCallback(async (paperId: string, sectionIdx: number, position: number, patch: Partial<AddQuestionInput>): Promise<Paper | null> => {
    try {
      const res = await apiClient.put(`/papers/${paperId}/sections/${sectionIdx}/questions/${position}`, patch);
      return unwrapResponse(res) as Paper;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
      return null;
    }
  }, []);

  const regenerateQuestion = useCallback(async (paperId: string, sectionIdx: number, position: number): Promise<Paper | null> => {
    try {
      const res = await apiClient.post(`/papers/${paperId}/sections/${sectionIdx}/questions/${position}/regenerate`);
      return unwrapResponse(res) as Paper;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Regenerate failed');
      return null;
    }
  }, []);

  const deleteQuestion = useCallback(async (paperId: string, sectionIdx: number, position: number): Promise<boolean> => {
    try {
      await apiClient.delete(`/papers/${paperId}/sections/${sectionIdx}/questions/${position}`);
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      return false;
    }
  }, []);

  const updateMemo = useCallback(async (paperId: string, sections: PaperMemo['sections']): Promise<boolean> => {
    try {
      await apiClient.put(`/papers/${paperId}/memo`, { sections });
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Memo update failed');
      return false;
    }
  }, []);

  const finalisePaper = useCallback(async (id: string): Promise<Paper | null> => {
    try {
      const res = await apiClient.post(`/papers/${id}/finalise`);
      const paper = unwrapResponse(res) as Paper;
      toast.success('Paper finalised');
      return paper;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Finalise failed');
      return null;
    }
  }, []);

  const downloadPaperPdf = useCallback(async (id: string): Promise<void> => {
    try {
      const res = await apiClient.get(`/papers/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `paper-${id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }, []);

  const downloadMemoPdf = useCallback(async (id: string): Promise<void> => {
    try {
      const res = await apiClient.get(`/papers/${id}/memo-pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `memo-${id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }, []);

  const deletePaper = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/papers/${id}`);
      await fetchPapers();
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      return false;
    }
  }, [fetchPapers]);

  return {
    papers, loading, fetchPapers, filters, setFilters,
    getPaperById, getMemoByPaperId,
    generatePaperWithAI, createPaperManual, updatePaperMetadata,
    addQuestion, updateQuestion, regenerateQuestion, deleteQuestion,
    updateMemo, finalisePaper, downloadPaperPdf, downloadMemoPdf, deletePaper,
  };
}
```

The backend doesn't currently have `GET /papers/:id/memo` — add it as a small read endpoint in QuestionBank/controller+routes (returns the memo for a paper). If time permits, add it in this task.

- [ ] **Step 2: Add `GET /papers/:id/memo` to backend**

In `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-papers.ts`:

```ts
export async function getPaperMemo(paperId: string, schoolId: string, actorId: string, actorRole: string) {
  const paper = await AssessmentPaper.findOne({ _id: paperId, schoolId, isDeleted: false });
  if (!paper) throw new NotFoundError('Paper not found');
  assertCanEditPaper(paper, actorId, actorRole, 'update');
  return PaperMemo.findOne({ paperId: paper._id, isDeleted: false });
}
```

In controller.ts:
```ts
export async function getMemo(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const memo = await getPaperMemo(req.params.id, user.schoolId!, user.id, user.role);
  res.status(200).json(apiResponse(true, memo, 'OK'));
}
```

In routes.ts: `router.get('/papers/:id/memo', authenticate, authorize('teacher','school_admin','super_admin'), getMemo);`

- [ ] **Step 3: Verify compile (both repos)**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Both clean.

- [ ] **Step 4: Commit (two commits — one per repo)**

```bash
cd c:/Users/shaun/campusly-backend
git add -u
git commit -m "feat(papers): add GET /papers/:id/memo endpoint"

cd c:/Users/shaun/campusly-frontend
git add src/hooks/useTeacherPapers.ts
git commit -m "feat(papers): useTeacherPapers hook

All paper API operations: list, fetch, generate, create, update, question
CRUD, regen, memo edit, downloads, delete. Single source of truth for
apiClient calls (per the SoC rule)."
```

---

### Task 15: List page — `/teacher/papers`

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/papers/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, Eye } from 'lucide-react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function TeacherPapersPage() {
  const router = useRouter();
  const { papers, loading, deletePaper } = useTeacherPapers();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (loading) return <LoadingSpinner />;

  if (papers.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Test Papers" description="Generate and manage CAPS-aligned papers for your classes." />
        <EmptyState
          icon={FileText}
          title="No papers yet"
          description="Create your first paper — generate with AI from a CAPS topic."
          action={
            <Link href="/teacher/papers/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Create your first paper
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Papers"
        description="Generate, edit, and download CAPS-aligned papers."
        actions={
          <Link href="/teacher/papers/new">
            <Button><Plus className="h-4 w-4 mr-2" /> New Paper</Button>
          </Link>
        }
      />

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {papers.map((p) => {
          const subject = typeof p.subjectId === 'object' && p.subjectId ? p.subjectId.name : '';
          const grade = typeof p.gradeId === 'object' && p.gradeId ? p.gradeId.name : '';
          return (
            <Card key={p._id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium truncate">{p.title}</h3>
                  <Badge variant={p.status === 'finalised' ? 'default' : 'secondary'}>
                    {p.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[subject, grade, `Term ${p.term}`, `${p.totalMarks} marks`].filter(Boolean).join(' · ')}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/teacher/papers/${p._id}`)}>
                    <Eye className="h-3 w-3 mr-1" /> Open
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(p._id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}
        title="Delete this paper?"
        description="This will soft-delete the paper and its memo. Cannot be undone via UI."
        onConfirm={async () => {
          if (confirmDelete) await deletePaper(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
```

Adjust component imports to actual codebase shapes (`PageHeader` may have different prop names — check sibling pages).

- [ ] **Step 2: Verify compile + size**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
wc -l "src/app/(dashboard)/teacher/papers/page.tsx"
```
< 350 lines.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/teacher/papers/page.tsx"
git commit -m "feat(papers): list page /teacher/papers

Card grid of papers with subject/grade/term/marks meta. Empty state
guides first-time users to create a paper. Delete confirmation. No
apiClient (page imports useTeacherPapers only)."
```

---

### Task 16: Wizard route + step 1 (metadata)

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/papers/new/page.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/papers/PaperWizard.tsx`

- [ ] **Step 1: Write the wizard wrapper page**

```tsx
// app/(dashboard)/teacher/papers/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { PaperWizard } from '@/components/papers/PaperWizard';
import { PageHeader } from '@/components/shared/PageHeader';

export default function NewPaperPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="New Paper"
        description="Configure paper metadata, then generate or build manually."
      />
      <PaperWizard
        onComplete={(paperId) => router.push(`/teacher/papers/${paperId}`)}
        onCancel={() => router.push('/teacher/papers')}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write the wizard with metadata step**

```tsx
// components/papers/PaperWizard.tsx
'use client';

import { useState } from 'react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PaperType, PaperDifficulty, AIPaperSectionConfig } from '@/types';
import { PaperWizardAIConfig } from './PaperWizardAIConfig';
import { PaperWizardManualConfig } from './PaperWizardManualConfig';

interface Props {
  onComplete: (paperId: string) => void;
  onCancel: () => void;
}

export function PaperWizard({ onComplete, onCancel }: Props) {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const { subjects } = useTeacherSubjects();
  const { classes } = useTeacherClasses();
  const { generatePaperWithAI, createPaperManual } = useTeacherPapers();

  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');

  // Metadata
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [topicIds, setTopicIds] = useState<string[]>([]);  // CAPS topic picker — defer to subcomponent later
  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [paperType, setPaperType] = useState<PaperType>('test');
  const [duration, setDuration] = useState(60);
  const [totalMarks, setTotalMarks] = useState(50);
  const [difficulty, setDifficulty] = useState<PaperDifficulty>('medium');

  // Step 1 validation
  const canAdvance = title && subjectId && gradeId && topicIds.length > 0 && totalMarks > 0;

  const handleAIGenerate = async (sectionConfig: AIPaperSectionConfig[]): Promise<void> => {
    const result = await generatePaperWithAI({
      title, schoolId, subjectId, gradeId, topicIds,
      term, year, paperType, duration, totalMarks, difficulty,
      sectionConfig,
    });
    if (result?.paperId) onComplete(result.paperId);
  };

  const handleManualCreate = async (sections: Array<{ title: string; instructions?: string; questions: [] }>): Promise<void> => {
    const paper = await createPaperManual({
      title, schoolId, subjectId, gradeId, topicIds,
      term, year, paperType, duration, totalMarks, difficulty,
      sections,
    });
    if (paper?._id) onComplete(paper._id);
  };

  if (step === 1) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Step 1 of 2 — Metadata</h2>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Term 2 Math Test" />
          </div>

          <div>
            <Label>Subject <span className="text-destructive">*</span></Label>
            <Select onValueChange={setSubjectId} value={subjectId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Grade <span className="text-destructive">*</span></Label>
            <Select onValueChange={setGradeId} value={gradeId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => {
                  const gid = typeof c.gradeId === 'object' ? c.gradeId._id : c.gradeId;
                  const gname = typeof c.gradeId === 'object' ? c.gradeId.name : 'Grade';
                  return <SelectItem key={gid} value={gid}>{gname}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Term <span className="text-destructive">*</span></Label>
            <Select onValueChange={(v) => setTerm(Number(v))} value={String(term)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((t) => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>

          <div>
            <Label>Paper Type</Label>
            <Select onValueChange={(v) => setPaperType(v as PaperType)} value={paperType}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['test', 'exam', 'quiz', 'assignment'] as PaperType[]).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Duration (min)</Label>
            <Input type="number" min={5} max={480} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>

          <div>
            <Label>Total Marks</Label>
            <Input type="number" min={1} max={500} value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} />
          </div>

          <div>
            <Label>Difficulty</Label>
            <Select onValueChange={(v) => setDifficulty(v as PaperDifficulty)} value={difficulty}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['easy', 'medium', 'hard'] as PaperDifficulty[]).map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label>CAPS Topics <span className="text-destructive">*</span></Label>
            {/* TODO Task 17: replace with topic picker — for now, accept comma-separated topic IDs as string */}
            <Input
              placeholder="Topic IDs (comma-separated, temporary input)"
              value={topicIds.join(',')}
              onChange={(e) => setTopicIds(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            />
            <p className="text-xs text-muted-foreground mt-1">Topic picker — Task 17.</p>
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => setStep(2)} disabled={!canAdvance}>Next: Configure</Button>
        </div>
      </div>
    );
  }

  // Step 2
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Step 2 of 2 — Configure</h2>

      <div className="flex gap-2">
        <Button variant={mode === 'ai' ? 'default' : 'outline'} onClick={() => setMode('ai')}>Generate with AI</Button>
        <Button variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')}>Build manually</Button>
      </div>

      {mode === 'ai' && (
        <PaperWizardAIConfig totalMarks={totalMarks} onGenerate={handleAIGenerate} />
      )}
      {mode === 'manual' && (
        <PaperWizardManualConfig onCreate={handleManualCreate} />
      )}

      <div className="flex justify-between gap-2 pt-4">
        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
```
Expected: errors for `PaperWizardAIConfig` and `PaperWizardManualConfig` (don't exist yet — Tasks 17 + 18 add them). Acceptable.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/teacher/papers/new/page.tsx" src/components/papers/PaperWizard.tsx
git commit -m "feat(papers): wizard route + step 1 metadata

Two-step wizard. Step 1 collects subject/grade/term/topic/type/duration/
marks/difficulty. Step 2 forks to AI or manual config (subcomponents
landing in Tasks 17+18). CAPS topic picker is a placeholder until 17."
```

---

### Task 17: AI config subcomponent + CAPS topic picker

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/papers/PaperWizardAIConfig.tsx`
- Modify: `c:/Users/shaun/campusly-frontend/src/components/papers/PaperWizard.tsx` — replace topic placeholder with real picker

- [ ] **Step 1: Write `PaperWizardAIConfig.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import type { AIPaperSectionConfig } from '@/types';

interface Props {
  totalMarks: number;
  onGenerate: (sections: AIPaperSectionConfig[]) => Promise<void>;
}

export function PaperWizardAIConfig({ totalMarks, onGenerate }: Props) {
  const [sections, setSections] = useState<AIPaperSectionConfig[]>([
    { title: 'Section A', questionCount: 5, sectionMarks: Math.floor(totalMarks / 2) },
    { title: 'Section B', questionCount: 3, sectionMarks: Math.ceil(totalMarks / 2) },
  ]);
  const [generating, setGenerating] = useState(false);

  const addSection = () =>
    setSections([...sections, { title: `Section ${String.fromCharCode(65 + sections.length)}`, questionCount: 3, sectionMarks: 10 }]);

  const removeSection = (idx: number) => setSections(sections.filter((_, i) => i !== idx));

  const updateSection = (idx: number, patch: Partial<AIPaperSectionConfig>) =>
    setSections(sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const totalSectionMarks = sections.reduce((sum, s) => sum + s.sectionMarks, 0);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate(sections);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-medium">AI Generation</p>
        <p className="text-muted-foreground">Configure sections — Claude will generate CAPS-aligned questions matching your topics and difficulty. Generation takes ~30 seconds.</p>
      </div>

      {sections.map((s, idx) => (
        <div key={idx} className="rounded-md border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 grid gap-2 grid-cols-1 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label>Title</Label>
                <Input value={s.title} onChange={(e) => updateSection(idx, { title: e.target.value })} />
              </div>
              <div>
                <Label>Questions</Label>
                <Input type="number" min={1} max={50} value={s.questionCount}
                  onChange={(e) => updateSection(idx, { questionCount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Marks</Label>
                <Input type="number" min={1} max={200} value={s.sectionMarks}
                  onChange={(e) => updateSection(idx, { sectionMarks: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Instructions (optional)</Label>
                <Input value={s.instructions ?? ''} onChange={(e) => updateSection(idx, { instructions: e.target.value })} />
              </div>
            </div>
            {sections.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeSection(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addSection}>
        <Plus className="h-4 w-4 mr-1" /> Add Section
      </Button>

      <div className={`text-sm ${totalSectionMarks !== totalMarks ? 'text-destructive' : 'text-muted-foreground'}`}>
        Total marks: {totalSectionMarks} / {totalMarks} {totalSectionMarks !== totalMarks ? '(must match)' : '✓'}
      </div>

      <Button
        onClick={handleGenerate}
        disabled={generating || totalSectionMarks !== totalMarks}
        className="w-full"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {generating ? 'Generating... (this takes ~30s)' : 'Generate Paper'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add CAPS topic picker — replace placeholder in PaperWizard**

In `PaperWizard.tsx`, replace the topic-IDs placeholder section with a proper multi-select picker:

```tsx
// Add to imports:
import { useCurriculumTopics } from '@/hooks/useCurriculumTopics';

// Inside the component:
const { topics, loading: topicsLoading } = useCurriculumTopics({ subjectId, gradeId });

// Replace the placeholder JSX:
<div className="sm:col-span-2">
  <Label>CAPS Topics <span className="text-destructive">*</span></Label>
  {!subjectId || !gradeId ? (
    <p className="text-sm text-muted-foreground">Select subject and grade first.</p>
  ) : topicsLoading ? (
    <p className="text-sm text-muted-foreground">Loading topics...</p>
  ) : topics.length === 0 ? (
    <p className="text-sm text-muted-foreground">No CAPS topics for this subject/grade.</p>
  ) : (
    <div className="max-h-40 overflow-y-auto border rounded-md">
      {topics.map((t) => {
        const checked = topicIds.includes(t._id);
        return (
          <label key={t._id} className="flex items-start gap-2 p-2 cursor-pointer hover:bg-muted">
            <input type="checkbox" checked={checked}
              onChange={() =>
                setTopicIds(checked ? topicIds.filter((id) => id !== t._id) : [...topicIds, t._id])
              } />
            <div className="text-sm min-w-0">
              <div className="font-medium truncate">{t.title}</div>
              <div className="text-xs text-muted-foreground truncate">{t.code}</div>
            </div>
          </label>
        );
      })}
    </div>
  )}
</div>
```

If `useCurriculumTopics` doesn't exist, create it (small hook):

```ts
// src/hooks/useCurriculumTopics.ts
'use client';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { AxiosResponse } from 'axios';

interface Topic { _id: string; title: string; code?: string }

export function useCurriculumTopics(params: { subjectId: string; gradeId: string }): { topics: Topic[]; loading: boolean } {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!params.subjectId || !params.gradeId) return;
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/curriculum-structure/nodes', { params: { type: 'topic', subjectId: params.subjectId, gradeId: params.gradeId } })
      .then((res: AxiosResponse) => { if (!cancelled) setTopics(unwrapList(res) as Topic[]); })
      .catch(() => { if (!cancelled) setTopics([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.subjectId, params.gradeId]);
  return { topics, loading };
}
```

- [ ] **Step 3: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
```
Expected: only `PaperWizardManualConfig` import error (Task 18).

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/papers/PaperWizardAIConfig.tsx src/components/papers/PaperWizard.tsx src/hooks/useCurriculumTopics.ts
git commit -m "feat(papers): AI section config + CAPS topic picker

Per-section title/instructions/questionCount/marks. Validates total
marks match the paper total. CAPS topic multi-select filtered by the
subject + grade chosen in step 1."
```

---

### Task 18: Manual config subcomponent

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/papers/PaperWizardManualConfig.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  onCreate: (sections: Array<{ title: string; instructions?: string; questions: [] }>) => Promise<void>;
}

export function PaperWizardManualConfig({ onCreate }: Props) {
  const [sections, setSections] = useState<Array<{ title: string; instructions?: string }>>([
    { title: 'Section A' },
  ]);
  const [creating, setCreating] = useState(false);

  const addSection = () => setSections([...sections, { title: `Section ${String.fromCharCode(65 + sections.length)}` }]);
  const removeSection = (idx: number) => setSections(sections.filter((_, i) => i !== idx));
  const updateSection = (idx: number, patch: Partial<{ title: string; instructions: string }>) =>
    setSections(sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreate(sections.map((s) => ({ ...s, questions: [] as [] })));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Manual Mode</p>
        <p className="text-muted-foreground">
          Define empty sections now. After creating, you'll add questions on the paper detail page from the Question Bank.
          {' '}<strong>Question Bank is currently empty</strong> — questions are added in Module 4.
        </p>
      </div>

      {sections.map((s, idx) => (
        <div key={idx} className="rounded-md border p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <div>
                <Label>Title</Label>
                <Input value={s.title} onChange={(e) => updateSection(idx, { title: e.target.value })} />
              </div>
              <div>
                <Label>Instructions (optional)</Label>
                <Input value={s.instructions ?? ''} onChange={(e) => updateSection(idx, { instructions: e.target.value })} />
              </div>
            </div>
            {sections.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeSection(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addSection}>
        <Plus className="h-4 w-4 mr-1" /> Add Section
      </Button>

      <Button onClick={handleCreate} disabled={creating || sections.length === 0} className="w-full">
        {creating ? 'Creating...' : 'Create Paper Shell'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify compile**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Should be clean now (PaperWizard's previous import resolves).

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/papers/PaperWizardManualConfig.tsx
git commit -m "feat(papers): manual config subcomponent

Define empty sections (title + instructions). Empty-state copy explains
Q-bank is empty until Module 4. Questions added on detail page."
```

---

### Task 19: Detail page shell + Paper tab

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/papers/[id]/page.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/papers/PaperDetailPaperTab.tsx`

- [ ] **Step 1: Detail page**

```tsx
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, ChevronLeft, CheckCircle } from 'lucide-react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import type { Paper, PaperMemo } from '@/types';
import { PaperDetailPaperTab } from '@/components/papers/PaperDetailPaperTab';
import { PaperDetailMemoTab } from '@/components/papers/PaperDetailMemoTab';

export default function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getPaperById, getMemoByPaperId, finalisePaper, downloadPaperPdf, downloadMemoPdf } = useTeacherPapers();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [memo, setMemo] = useState<PaperMemo | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async (): Promise<void> => {
    const [p, m] = await Promise.all([getPaperById(id), getMemoByPaperId(id)]);
    setPaper(p); setMemo(m);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getPaperById(id), getMemoByPaperId(id)])
      .then(([p, m]) => { if (!cancelled) { setPaper(p); setMemo(m); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, getPaperById, getMemoByPaperId]);

  if (loading) return <LoadingSpinner />;
  if (!paper) return <p className="text-muted-foreground">Paper not found.</p>;

  const subject = typeof paper.subjectId === 'object' ? paper.subjectId.name : '';
  const grade = typeof paper.gradeId === 'object' ? paper.gradeId.name : '';

  const handleFinalise = async () => {
    const result = await finalisePaper(paper._id);
    if (result) setPaper(result);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/teacher/papers')}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <PageHeader
        title={paper.title}
        description={[subject, grade, `Term ${paper.term}`, `${paper.totalMarks} marks`, `${paper.duration} min`].filter(Boolean).join(' · ')}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Badge variant={paper.status === 'finalised' ? 'default' : 'secondary'}>{paper.status}</Badge>
            {paper.status === 'draft' && (
              <Button size="sm" onClick={handleFinalise}>
                <CheckCircle className="h-4 w-4 mr-1" /> Finalise
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => downloadPaperPdf(paper._id)}>
              <Download className="h-4 w-4 mr-1" /> Paper PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => downloadMemoPdf(paper._id)}>
              <FileText className="h-4 w-4 mr-1" /> Memo PDF
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="paper">
        <TabsList>
          <TabsTrigger value="paper">Paper</TabsTrigger>
          <TabsTrigger value="memo">Memo</TabsTrigger>
        </TabsList>
        <TabsContent value="paper">
          <PaperDetailPaperTab paper={paper} onChanged={reload} />
        </TabsContent>
        <TabsContent value="memo">
          {memo ? <PaperDetailMemoTab paper={paper} memo={memo} onChanged={reload} /> : <p>Memo loading...</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Paper tab component**

```tsx
// components/papers/PaperDetailPaperTab.tsx
'use client';

import { useState } from 'react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, RefreshCw, Pencil } from 'lucide-react';
import { QuestionEditDialog } from './QuestionEditDialog';
import type { Paper, PaperQuestion } from '@/types';

interface Props {
  paper: Paper;
  onChanged: () => Promise<void>;
}

export function PaperDetailPaperTab({ paper, onChanged }: Props) {
  const { regenerateQuestion, deleteQuestion } = useTeacherPapers();
  const [editing, setEditing] = useState<{ sectionIdx: number; question: PaperQuestion } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRegen = async (sectionIdx: number, position: number): Promise<void> => {
    setBusy(true);
    try {
      const result = await regenerateQuestion(paper._id, sectionIdx, position);
      if (result) await onChanged();
    } finally { setBusy(false); }
  };

  const handleDelete = async (sectionIdx: number, position: number): Promise<void> => {
    setBusy(true);
    try {
      await deleteQuestion(paper._id, sectionIdx, position);
      await onChanged();
    } finally { setBusy(false); }
  };

  const isFinalised = paper.status === 'finalised';

  return (
    <div className="space-y-6">
      {paper.sections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-3">
          <h3 className="font-semibold text-lg">{section.title}</h3>
          {section.instructions && (
            <p className="text-sm text-muted-foreground">{section.instructions}</p>
          )}

          {section.questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No questions in this section yet. {paper.aiGenerated ? '' : 'Add questions from the Question Bank (empty until Module 4).'}
            </p>
          )}

          {section.questions.map((q) => (
            <Card key={`${sIdx}-${q.position}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {sIdx + 1}.{q.position + 1}{' '}
                      <span className="text-xs text-muted-foreground">[{q.marks} marks]</span>
                    </p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{q.questionText}</p>
                    {q.diagram?.renderStatus === 'rendered' && q.diagram.svgUrl && (
                      <img src={q.diagram.svgUrl} alt={q.diagram.caption ?? ''} className="max-w-md mt-2 border rounded" />
                    )}
                    {q.diagram?.renderStatus === 'failed' && (
                      <p className="text-xs text-destructive mt-1">[Diagram render failed]</p>
                    )}
                    {q.diagram?.renderStatus === 'pending' && (
                      <p className="text-xs text-muted-foreground mt-1">[Diagram rendering...]</p>
                    )}
                  </div>
                  {!isFinalised && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ sectionIdx: sIdx, question: q })} disabled={busy}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRegen(sIdx, q.position)} disabled={busy}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(sIdx, q.position)} disabled={busy}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {editing && (
        <QuestionEditDialog
          paperId={paper._id}
          sectionIdx={editing.sectionIdx}
          question={editing.question}
          open={!!editing}
          onClose={async () => { setEditing(null); await onChanged(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify compile**

Expected errors: `QuestionEditDialog`, `PaperDetailMemoTab` don't exist yet (Tasks 20+21).

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/teacher/papers/[id]/page.tsx" src/components/papers/PaperDetailPaperTab.tsx
git commit -m "feat(papers): detail page shell + Paper tab

Tabs: Paper / Memo. Header shows status badge, Finalise button,
PDF download buttons. Paper tab renders sections + questions with
edit/regen/delete buttons. Diagram rendering status surfaced
(rendered/pending/failed)."
```

---

### Task 20: `QuestionEditDialog`

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/papers/QuestionEditDialog.tsx`

- [ ] **Step 1: Write the dialog**

```tsx
'use client';

import { useState } from 'react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PaperQuestion } from '@/types';

interface Props {
  paperId: string;
  sectionIdx: number;
  question: PaperQuestion;
  open: boolean;
  onClose: () => void | Promise<void>;
}

export function QuestionEditDialog({ paperId, sectionIdx, question, open, onClose }: Props) {
  const { updateQuestion } = useTeacherPapers();
  const [questionText, setQuestionText] = useState(question.questionText ?? '');
  const [marks, setMarks] = useState(question.marks);
  const [modelAnswer, setModelAnswer] = useState(question.modelAnswer ?? '');
  const [markingGuideline, setMarkingGuideline] = useState(question.markingGuideline ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateQuestion(paperId, sectionIdx, question.position, {
        questionText, marks, modelAnswer, markingGuideline,
      });
      await onClose();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) void onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Edit Question {sectionIdx + 1}.{question.position + 1}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          <div>
            <Label>Question Text</Label>
            <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={4} />
          </div>
          <div>
            <Label>Marks</Label>
            <Input type="number" min={0} max={100} value={marks} onChange={(e) => setMarks(Number(e.target.value))} />
          </div>
          <div>
            <Label>Model Answer</Label>
            <Textarea value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)} rows={4} />
          </div>
          <div>
            <Label>Marking Guideline (optional)</Label>
            <Textarea value={markingGuideline} onChange={(e) => setMarkingGuideline(e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onClose()} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
git add src/components/papers/QuestionEditDialog.tsx
git commit -m "feat(papers): question edit dialog

Edit text, marks, model answer, marking guideline. Saves via hook.
Memo mirrors automatically (server-side in service-paper-questions)."
```

---

### Task 21: Memo tab + edit

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/papers/PaperDetailMemoTab.tsx`

- [ ] **Step 1: Write the memo tab**

```tsx
'use client';

import { useState } from 'react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import type { Paper, PaperMemo, MemoSection } from '@/types';

interface Props {
  paper: Paper;
  memo: PaperMemo;
  onChanged: () => Promise<void>;
}

export function PaperDetailMemoTab({ paper, memo, onChanged }: Props) {
  const { updateMemo } = useTeacherPapers();
  const [sections, setSections] = useState<MemoSection[]>(memo.sections);
  const [saving, setSaving] = useState(false);

  const updateItem = (sIdx: number, iIdx: number, patch: Partial<MemoSection['items'][number]>) => {
    setSections(sections.map((s, si) =>
      si !== sIdx ? s : {
        ...s,
        items: s.items.map((it, ii) => ii !== iIdx ? it : { ...it, ...patch }),
      }
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await updateMemo(paper._id, sections);
      if (ok) await onChanged();
    } finally { setSaving(false); }
  };

  const isFinalised = paper.status === 'finalised';

  return (
    <div className="space-y-6">
      {sections.map((section, sIdx) => {
        const paperSection = paper.sections[sIdx];
        return (
          <div key={sIdx} className="space-y-3">
            <h3 className="font-semibold text-lg">{section.title}</h3>
            {section.items.map((item, iIdx) => {
              const paperQ = paperSection?.questions.find((q) => q.position === item.position);
              return (
                <Card key={`${sIdx}-${iIdx}`}>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-medium">
                      {sIdx + 1}.{item.position + 1} <span className="text-xs text-muted-foreground">[{item.marks} marks]</span>
                    </p>
                    {paperQ?.questionText && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">{paperQ.questionText}</p>
                    )}
                    <div>
                      <Label>Model Answer</Label>
                      <Textarea value={item.modelAnswer} onChange={(e) => updateItem(sIdx, iIdx, { modelAnswer: e.target.value })} rows={3} disabled={isFinalised} />
                    </div>
                    <div>
                      <Label>Marking Guideline</Label>
                      <Textarea value={item.markingGuideline ?? ''} onChange={(e) => updateItem(sIdx, iIdx, { markingGuideline: e.target.value })} rows={2} disabled={isFinalised} />
                    </div>
                    <div>
                      <Label>Marks</Label>
                      <Input type="number" min={0} max={100} value={item.marks} onChange={(e) => updateItem(sIdx, iIdx, { marks: Number(e.target.value) })} disabled={isFinalised} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })}

      {!isFinalised && (
        <div className="sticky bottom-0 bg-background border-t pt-3 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Memo'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify compile + size + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
wc -l src/components/papers/PaperDetailMemoTab.tsx
git add src/components/papers/PaperDetailMemoTab.tsx
git commit -m "feat(papers): memo tab

Editable per-question model answer + marking guideline + marks.
Disabled when paper finalised. Save button at bottom."
```

---

### Task 22: Sidebar nav update

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Read sidebar**

```bash
grep -n "TEACHER_NAV\|teacher.*papers\|teacher.*assessments\|ai-tools.*papers\|workbench.*papers" c:/Users/shaun/campusly-frontend/src/components/layout/Sidebar.tsx
```

- [ ] **Step 2: Update nav**

In `Sidebar.tsx`, in `TEACHER_NAV`:
- Remove or hide entries pointing to: `/teacher/curriculum/assessments`, `/teacher/curriculum/papers`, `/teacher/ai-tools/create-paper`, `/teacher/ai-tools/papers`, `/teacher/workbench/papers/builder`.
- Add a single `Papers` entry: `{ name: 'Papers', href: '/teacher/papers', icon: FileText }` (or whichever icon import the sidebar uses).
- Keep other AI Tools / Workbench entries that are NOT paper-related.

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/layout/Sidebar.tsx
git commit -m "chore(papers): sidebar — single Papers entry, hide deprecated"
```

---

### Task 23: Legacy route redirects (frontend)

**Files:**
- Replace contents of:
  - `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/curriculum/assessments/page.tsx`
  - `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/curriculum/papers/page.tsx`
  - `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/ai-tools/create-paper/page.tsx`
  - `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/ai-tools/papers/page.tsx`
  - `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/workbench/papers/builder/page.tsx`

- [ ] **Step 1: Replace each with a redirect**

Each file becomes:

```tsx
import { redirect } from 'next/navigation';

export default function DeprecatedRedirect() {
  redirect('/teacher/papers');
}
```

(Also delete subroutes like `/teacher/curriculum/assessments/[paperId]/page.tsx` if they exist — they go to `/teacher/papers/:id`. Use a redirect that preserves the id where applicable.)

For `[paperId]` subpath (if it exists):

```tsx
import { redirect } from 'next/navigation';

export default function DeprecatedRedirect({ params }: { params: { paperId: string } }) {
  redirect(`/teacher/papers/${params.paperId}`);
}
```

(Adjust per Next.js 16 conventions — `params` may need to be `Promise` and `await`ed.)

- [ ] **Step 2: Delete unused supporting files**

Some of those routes had supporting components/hooks that are now dead. Don't aggressively delete — leave them for the SoC sweep in Task 25 to find via grep.

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add -u
git commit -m "chore(papers): redirect 5 legacy paper routes to /teacher/papers

curriculum/assessments, curriculum/papers, ai-tools/create-paper,
ai-tools/papers, workbench/papers/builder all 302-redirect via
Next.js redirect(). Subroutes preserve the :id parameter."
```

---

### Task 24: QuestionBankPicker (minimal, for manual mode)

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/papers/QuestionBankPicker.tsx`

This is the picker used to add bank-ref questions to a paper section. Day 1, Q-bank is empty → component shows the empty state. Component is wired in Task 19's PaperDetailPaperTab via an "Add Question" button (NOT YET added to PaperDetailPaperTab — add it now).

- [ ] **Step 1: Write the picker**

```tsx
'use client';

import { useState } from 'react';
import { useQuestionBankLibrary } from '@/hooks/useQuestionBankLibrary';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface Props {
  paperId: string;
  sectionIdx: number;
  subjectId: string;
  gradeId: string;
  onAdded: () => void | Promise<void>;
}

export function QuestionBankPicker({ paperId, sectionIdx, subjectId, gradeId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { questions, loading } = useQuestionBankLibrary({ subjectId, gradeId, q: search });
  const { addQuestion } = useTeacherPapers();
  const [marks, setMarks] = useState(2);

  const handleAdd = async (questionId: string) => {
    const result = await addQuestion(paperId, sectionIdx, { questionId, marks, position: 0 });
    if (result) {
      await onAdded();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Add from Q-bank</Button>} />
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader><DialogTitle>Add Question from Bank</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          <Input placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading && questions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Question Bank is empty for this subject/grade. Questions will be added in Module 4.
              For now, use AI generation instead.
            </p>
          )}
          <div className="space-y-1">
            {questions.map((q) => (
              <div key={q._id} className="flex items-center gap-2 p-2 border rounded">
                <p className="text-sm flex-1 line-clamp-2">{q.questionText ?? '(no text)'}</p>
                <Input type="number" min={1} max={100} value={marks} onChange={(e) => setMarks(Number(e.target.value))} className="w-16" />
                <Button size="sm" onClick={() => handleAdd(q._id)}>Add</Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

The hook `useQuestionBankLibrary` was already created in Module 1 (Task 16). Reuse. Adjust the type — it expects `{ subjectId, q }` but we're passing `gradeId` too. If it doesn't accept `gradeId`, extend it briefly — single-line addition.

- [ ] **Step 2: Add the picker to PaperDetailPaperTab**

In `c:/Users/shaun/campusly-frontend/src/components/papers/PaperDetailPaperTab.tsx`, import the picker and render one per section header (only when paper is not AI-generated, OR always — depends on UX preference; keep always for flexibility):

```tsx
import { QuestionBankPicker } from './QuestionBankPicker';

// Inside the section render, after the questions list:
{!isFinalised && (
  <QuestionBankPicker
    paperId={paper._id}
    sectionIdx={sIdx}
    subjectId={typeof paper.subjectId === 'object' ? paper.subjectId._id : paper.subjectId}
    gradeId={typeof paper.gradeId === 'object' ? paper.gradeId._id : paper.gradeId}
    onAdded={onChanged}
  />
)}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/papers/QuestionBankPicker.tsx src/components/papers/PaperDetailPaperTab.tsx
git commit -m "feat(papers): minimal QuestionBankPicker + Add-question on detail page

Bank-ref questions can be added per section. Empty-state explains
Module 4 dependency. AI mode and manual mode both get the picker."
```

---

### Task 25: SoC sweep + acceptance verification

**Files:** the whole `/teacher/papers` and `components/papers` tree.

- [ ] **Step 1: SoC grep**

```bash
cd c:/Users/shaun/campusly-frontend
echo "=== apiClient leaks ==="
grep -rn "apiClient" "src/app/(dashboard)/teacher/papers" "src/components/papers" 2>/dev/null
echo "=== : any ==="
grep -rn ": any\b\|as any\b" "src/app/(dashboard)/teacher/papers" "src/components/papers" 2>/dev/null
echo "=== text-red-* ==="
grep -rn "text-red-\|bg-red-" "src/app/(dashboard)/teacher/papers" "src/components/papers" 2>/dev/null
echo "=== catch (err) without unknown ==="
grep -rn "catch (err)\b\|catch(err)\b" "src/app/(dashboard)/teacher/papers" "src/components/papers" 2>/dev/null
echo "=== file sizes ==="
find "src/app/(dashboard)/teacher/papers" "src/components/papers" -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -nr | head -10
echo "=== backend file sizes ==="
find c:/Users/shaun/campusly-backend/src/modules/QuestionBank -name "*.ts" | xargs wc -l | sort -nr | head -10
```

All four greps must return zero matches. All file sizes < 350.

- [ ] **Step 2: Final tsc both repos**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Both clean.

- [ ] **Step 3: End-to-end manual smoke (if Docker + backend running)**

Bring up Docker and backend if needed:
```bash
docker start campusly-redis campusly-mongo 2>/dev/null
cd c:/Users/shaun/campusly-backend && npm run dev &
cd c:/Users/shaun/campusly-frontend && npm run dev &
```

Then walk through:
1. `http://localhost:3500/login` as `superadmin@campusly.co.za / Password1`.
2. Go to `/teacher/papers`. Confirm empty state.
3. Click "+ New Paper". Wizard opens.
4. Step 1: pick Maths, Grade 4, Term 2, Test, 60 min, 50 marks, medium, pick a CAPS topic ("Fractions" or whichever Gr4 Maths topic is seeded).
5. Click Next.
6. Step 2: choose AI mode. Default 2 sections (25 + 25 marks). Click Generate.
7. Wait ~30 seconds. Lands on `/teacher/papers/<id>` with paper rendered.
8. On Paper tab: see questions. Click Edit on Q1, change wording, save. Click Regenerate on Q2, new content. Click Delete on Q3, gone.
9. Click Memo tab: see memo aligned with questions. Edit the model answer for Q1. Click "Save Memo".
10. Click Finalise. Status flips to `finalised`. Edit/regen/delete buttons disappear.
11. Click Download Paper PDF → file downloads, opens, shows correct layout with TikZ diagrams (or placeholders if any failed).
12. Click Download Memo PDF → file downloads.
13. Try one of the legacy routes (e.g., `/teacher/ai-tools/papers`) — confirm it redirects to `/teacher/papers`.
14. Print the paper PDF. Confirm exam-style layout, mark column right-aligned, no question splits across pages.

If any step fails, file as Module 2 follow-up.

- [ ] **Step 4: Final commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add -u
git commit -m "chore(papers): SoC sweep + acceptance smoke passed

Zero apiClient leaks in pages/components. Zero any types. Zero text-red-*.
Zero catch(err) without :unknown. All files <350 lines. tsc clean across
both repos. End-to-end smoke walks 14 steps including legacy redirect."
```

---

## Self-Review (post-write)

**Spec coverage:**
- §3.1 Unify on AssessmentPaper → Tasks 1, 2, 4, 10, 12
- §3.2 PDFKit programmatic → Task 7 (already in place; audit)
- §3.3 CAPS topicIds required → Tasks 1, 2
- §3.4 Memo first-class, atomic → Tasks 4, 5
- §3.5 Solo principal moderation bypass → Task 9
- §3.6 Single canonical UI → Tasks 15, 16, 22, 23
- §4.1 AssessmentPaper schema additions → Task 1
- §4.2 PaperMemo confirmed → covered in Task 5 (uses existing model)
- §4.3 GeneratedPaper deprecation → Tasks 11, 12
- §4.4 Migration → Task 10
- §5.1 Routes → Task 9
- §5.2 Services → Tasks 3, 4, 5
- §5.3 AI generation contract → Task 4
- §5.4 Single-question regen → Tasks 5, 6
- §5.5 PDF audit → Task 7
- §5.6 Migration script → Task 10
- §6 PDF rendering quality → Task 7
- §7.1 Routes → Tasks 15, 16, 19, 23
- §7.2 Components → Tasks 16, 17, 18, 19, 20, 21, 24
- §7.3 Hook → Task 14
- §7.4 Types → Task 13
- §7.5 Sidebar → Task 22
- §8 User flow → Task 25 (manual smoke)
- §11 Acceptance criteria → Task 25 + scattered

**Placeholder scan:** no TBD/TODO in code blocks. The `// TODO Task 17:` in Task 16 is a deliberate temporary that Task 17 removes — acceptable because it's surfaced as an explicit follow-up in the next task.

**Type consistency:**
- `Paper`, `PaperMemo`, `PaperQuestion`, `BankRefQuestion`, `InlineQuestion`, `MemoSection`, `MemoItem` defined in Task 13 and used consistently in Tasks 14–21, 24.
- `assertCanEditPaper(plan, actorId, actorRole, action)` action verb expanded to cover all 7 actions in Task 3 — used in Tasks 5, 9.
- `regenerateSingleQuestion` defined in Task 6 and called from Task 5.
- `getMemoByPaperId` requires backend `GET /papers/:id/memo` — added in Task 14 alongside the hook.

**Known follow-ups (deferred, not blocking):**
- Question Bank seeding — Module 4
- Polished manual builder (drag/reorder/bulk add) — Module 4
- HOD moderation flow — when multi-teacher schools become target
- AI photo marking — Module 3
- Refactor the deduplicated `formatLocalDate` into `common/pdf/format-date.ts` — defer to a polish pass

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-module-2-test-papers.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, two-stage review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session with checkpoints for your review.

Which approach?
