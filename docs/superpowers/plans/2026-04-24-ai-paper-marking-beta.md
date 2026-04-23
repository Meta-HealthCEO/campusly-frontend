# AI Paper Marking — Beta Completion Plan (Option A+)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the AI Paper Marking feature to a defensible Beta state — persist results, fix the frontend/backend API contract, support multi-page scans, validate Claude's JSON, and catch the "wrong paper uploaded" case before marks are saved. Gradebook publish is explicitly out of scope (that's a follow-up).

**Architecture:** Re-shape the route contract so `POST /ai-tools/mark-paper` accepts an array of images (multi-page support Claude's vision API natively handles). Every marking attempt creates a `PaperMarking` document immediately with `status: 'processing'`; AI result updates it to `'completed'` or `'needs_review'` (wrong-paper flag) or `'failed'` (error). Claude is asked to extract the paper header from page 1 and compare to the selected paper's metadata; a mismatch lands `status: 'needs_review'` with an explanatory banner in the UI. Add Zod validation matching the Paper Generation pattern. Add three missing read/update endpoints for history + teacher overrides. No gradebook write.

**Tech Stack:** TypeScript, Express, Mongoose, Zod v4, Anthropic SDK (vision), Vitest (backend). Next.js 16 + React 19 (frontend).

**Repos:** Work spans `c:\Users\shaun\campusly-backend` and `c:\Users\shaun\campusly-frontend`.

**Branching:** Commit directly to `master` in both repos. No feature branches.

---

## File Structure

**Backend (`c:\Users\shaun\campusly-backend`):**

Create:
- `src/modules/AITools/validation-marking.ts` — Zod schemas for Claude's marking response + paper-mismatch check
- `src/modules/AITools/service-marking-queries.ts` — list + get-by-id + update services
- `src/modules/AITools/__tests__/service-marking-parse.test.ts` — Zod schema tests
- `src/modules/AITools/__tests__/service-marking.test.ts` — integration test (persistence + lifecycle)

Modify:
- `src/modules/AITools/model-marking.ts` — make `images` / `imageTypes` optional; add `extractedHeader: string | null`, `paperMismatch: boolean`, `aiResult: {...}` (raw AI output) for audit; change status enum to include `'needs_review'`
- `src/modules/AITools/service-marking.ts` — rewrite to accept `images[]`, persist at start, validate with Zod, detect paper-mismatch, update record through status lifecycle
- `src/modules/AITools/controller.ts` — rename `markPaper` handler to accept array; add `listMarkings`, `getMarkingById`, `updateMarking` handlers
- `src/modules/AITools/routes.ts` — rewire `POST /mark-paper` (now array-based); add `GET /markings`, `GET /markings/:id`, `PUT /markings/:id`
- `src/modules/AITools/validation.ts` — replace `markPaperSchema` with array-based shape

**Frontend (`c:\Users\shaun\campusly-frontend`):**

Modify:
- `src/hooks/useTeacherMarking.ts` — fix endpoint path to `/ai-tools/mark-paper` (singular route, array body); wire new list/get/update methods; surface `needs_review` status
- `src/components/mark-papers/MarkingResults.tsx` — paper-mismatch warning banner when `status === 'needs_review'`; update signature if hook shape changes
- Possibly minor updates to other mark-papers components if the hook signature changes

---

## Phase 1 — Backend schema adjustments

### Task 1.1: Update `PaperMarking` model

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\model-marking.ts`

**Intent:** Make the schema honest about what's actually stored. Today it demands `images: string[]` and `imageTypes: string[]` — base64 blobs stored in MongoDB. That's a bad idea (huge documents, PII). Drop them (or keep as optional `imageCount` for later audit). Add fields for audit + mismatch.

- [ ] **Step 1: Read the current model**

Read `src/modules/AITools/model-marking.ts` first to see the existing schema exactly. Match the existing code style (type definitions, index definitions, etc.) when making edits.

- [ ] **Step 2: Apply schema changes**

Make the following modifications to the existing schema. Don't rewrite the file — keep all other fields and indexes as they are:

1. Remove `images: string[]` and `imageTypes: string[]` required fields. Replace with:
   ```ts
   imageCount: { type: Number, default: 0 },
   ```
2. Add to the schema (and interface):
   ```ts
   extractedHeader: { type: String, default: null },
   paperMismatch: { type: Boolean, default: false },
   mismatchReason: { type: String, default: null },
   aiRawResult: { type: Schema.Types.Mixed, default: null },
   ```
3. Extend the `status` enum from `'processing' | 'completed' | 'failed' | 'published'` to `'processing' | 'completed' | 'needs_review' | 'failed' | 'published'`.

Update the TypeScript interface to match.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/modules/AITools/model-marking.ts
git commit -m "feat(marking): drop base64 image storage; add mismatch + audit fields"
```

---

## Phase 2 — Zod validation (TDD)

### Task 2.1: Define the schema

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITools\validation-marking.ts`

- [ ] **Step 1: Create the schema file**

```ts
// src/modules/AITools/validation-marking.ts
import { z } from 'zod/v4';

export const MarkingQuestionSchema = z.object({
  questionNumber: z.union([z.number(), z.string()]),
  studentAnswer: z.string().default(''),
  correctAnswer: z.string().default(''),
  marksAwarded: z.number().nonnegative(),
  maxMarks: z.number().nonnegative(),
  feedback: z.string().default(''),
});

export const PaperMismatchSchema = z.object({
  extractedHeader: z.string().default(''),
  paperMismatch: z.boolean().default(false),
  mismatchReason: z.string().default(''),
});

export const MarkingResponseSchema = z.object({
  studentName: z.string(),
  totalMarks: z.number().nonnegative(),
  maxMarks: z.number().positive(),
  percentage: z.number().min(0).max(100),
  questions: z.array(MarkingQuestionSchema).min(1),
  extractedHeader: z.string().default(''),
  paperMismatch: z.boolean().default(false),
  mismatchReason: z.string().default(''),
});

export type MarkingResponse = z.infer<typeof MarkingResponseSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/AITools/validation-marking.ts
git commit -m "feat(marking): add Zod schema for Claude marking response"
```

### Task 2.2: Schema tests

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITools\__tests__\service-marking-parse.test.ts`

- [ ] **Step 1: Write the tests**

```ts
import { describe, it, expect } from 'vitest';
import { MarkingResponseSchema } from '../validation-marking.js';

const validBase = {
  studentName: 'Alice',
  totalMarks: 8,
  maxMarks: 10,
  percentage: 80,
  questions: [{
    questionNumber: 1, studentAnswer: '4', correctAnswer: '4',
    marksAwarded: 2, maxMarks: 2, feedback: 'Correct.',
  }],
  extractedHeader: 'Math Grade 10 - Algebra',
  paperMismatch: false,
  mismatchReason: '',
};

describe('MarkingResponseSchema', () => {
  it('accepts a valid response', () => {
    expect(MarkingResponseSchema.safeParse(validBase).success).toBe(true);
  });

  it('rejects response with no questions', () => {
    const bad = { ...validBase, questions: [] };
    expect(MarkingResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects negative marks', () => {
    const bad = { ...validBase, totalMarks: -1 };
    expect(MarkingResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects percentage over 100', () => {
    const bad = { ...validBase, percentage: 150 };
    expect(MarkingResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts paper mismatch with reason', () => {
    const mismatch = { ...validBase, paperMismatch: true, mismatchReason: 'Image shows a Science paper, not Maths.' };
    expect(MarkingResponseSchema.safeParse(mismatch).success).toBe(true);
  });

  it('defaults missing mismatch fields', () => {
    const minimal = {
      studentName: 'B', totalMarks: 0, maxMarks: 1, percentage: 0,
      questions: [{ questionNumber: 1, marksAwarded: 0, maxMarks: 1 }],
    };
    const result = MarkingResponseSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paperMismatch).toBe(false);
      expect(result.data.extractedHeader).toBe('');
    }
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/modules/AITools/__tests__/service-marking-parse.test.ts`

Expected: 6/6 pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/AITools/__tests__/service-marking-parse.test.ts
git commit -m "test(marking): Zod schema tests for marking response"
```

---

## Phase 3 — Service rewrite (multi-image, persistence, mismatch check)

### Task 3.1: Rewrite `service-marking.ts`

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\service-marking.ts`

This is the biggest task. The implementer should read the existing file first to understand what's being replaced.

**Intent of the rewrite:**
1. New signature: `markPaperFromImages(teacherId, schoolId, { paperId, studentName, studentId?, images: string[], imageTypes: string[] })`
2. Immediately create a `PaperMarking` document with `status: 'processing'` and `imageCount: images.length`.
3. Load the paper (GeneratedPaper OR AssessmentPaper) — existing code does this.
4. Build the memo text — existing code does this.
5. Build a system prompt that asks Claude to extract the paper header from page 1 AND cross-check against the selected paper's `subject`, `grade`, `topic`. Return a `paperMismatch` boolean + `extractedHeader` + `mismatchReason` alongside the existing marking fields.
6. Call Claude vision with all images in a single message (Anthropic SDK supports `content: [ {type:'image', ...}, {type:'image', ...}, {type:'text', text: userPrompt} ]`).
7. Parse the response. Use `MarkingResponseSchema.safeParse`. If invalid, mark the `PaperMarking` as `status: 'failed'` with the error and throw `BadRequestError`.
8. On valid response: compute terminal status — `'needs_review'` if `paperMismatch === true`, else `'completed'`.
9. Update the `PaperMarking` record with all fields + status + `aiRawResult` (the validated response).
10. Return the saved PaperMarking.

- [ ] **Step 1: Read the existing service**

Read `src/modules/AITools/service-marking.ts` in full. Note: the existing code exports `markPaperFromImage` (singular) and a `MarkPaperResult` interface that `useTeacherMarking` still expects. Replace the exported names too.

Also locate `AIService.generateVisionCompletion` in `src/services/ai.service.ts` — it currently takes a single `imageBase64` + `imageMediaType`. We need a multi-image variant. Either:
- Extend `generateVisionCompletion` with an optional `additionalImages: Array<{base64, mediaType}>`, OR
- Add a new `generateVisionCompletionMulti(system, userText, images[])` method

Pick whichever is a smaller diff. If `generateVisionCompletion` is only called from one place (this service), refactoring it in place is fine.

- [ ] **Step 2: Update `AIService` to support multiple images**

If changing `generateVisionCompletion`, the new signature should look like:

```ts
static async generateVisionCompletionWithImages(
  systemPrompt: string,
  userText: string,
  images: Array<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }>,
  options?: { maxTokens?: number; temperature?: number },
): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }>
```

Internally build `content: [...images.map(img => ({type:'image', source:{type:'base64', media_type: img.mediaType, data: img.base64}})), { type: 'text', text: userText }]`. Keep the retry + semaphore wrappers.

Leave the existing single-image method in place (unless you're certain no other caller uses it — grep first). If so, delete.

- [ ] **Step 3: Rewrite `service-marking.ts`**

Replace the body with (shape — adapt to what's already there; preserve memo-building helpers if useful):

```ts
import { PaperMarking } from './model-marking.js';
import { GeneratedPaper } from './model.js';
import { AssessmentPaper, Question } from '../QuestionBank/model.js';
import { AIService } from '../../services/ai.service.js';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { MarkingResponseSchema } from './validation-marking.js';
import mongoose from 'mongoose';

export interface MarkPapersPayload {
  paperId: string;
  studentName: string;
  studentId?: string;
  images: string[];         // base64 strings
  imageTypes: Array<'image/jpeg' | 'image/png' | 'image/webp'>;
}

export async function markPaperFromImages(
  teacherId: string,
  schoolId: string,
  payload: MarkPapersPayload,
) {
  if (payload.images.length === 0) {
    throw new BadRequestError('At least one image is required.');
  }
  if (payload.images.length !== payload.imageTypes.length) {
    throw new BadRequestError('images and imageTypes lengths must match.');
  }

  // Resolve which paper type
  const paperType = await detectPaperType(payload.paperId, schoolId);
  if (!paperType) throw new NotFoundError('Paper not found');

  // 1. Create processing record immediately
  const marking = await PaperMarking.create({
    paperId: new mongoose.Types.ObjectId(payload.paperId),
    paperType: paperType.kind,
    studentId: payload.studentId ? new mongoose.Types.ObjectId(payload.studentId) : undefined,
    studentName: payload.studentName,
    teacherId: new mongoose.Types.ObjectId(teacherId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    imageCount: payload.images.length,
    totalMarks: 0,
    maxMarks: 0,
    percentage: 0,
    questions: [],
    status: 'processing',
  });

  try {
    // 2. Build prompts
    const { systemPrompt, userPrompt, maxMarks } = buildPrompts(paperType);

    // 3. Vision call with all images
    const { text } = await AIService.generateVisionCompletionWithImages(
      systemPrompt,
      userPrompt,
      payload.images.map((b, i) => ({ base64: b, mediaType: payload.imageTypes[i] })),
      { maxTokens: 4096, temperature: 0.2 },
    );

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let raw: unknown;
    try {
      raw = JSON.parse(cleaned);
    } catch {
      throw new BadRequestError('AI returned non-JSON output. Please try again.');
    }

    const validation = MarkingResponseSchema.safeParse(raw);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      const where = issue?.path.join('.') || '(root)';
      throw new BadRequestError(
        `AI response did not match expected structure at "${where}": ${issue?.message ?? 'unknown'}.`,
      );
    }
    const validated = validation.data;

    const terminalStatus = validated.paperMismatch ? 'needs_review' : 'completed';

    marking.totalMarks = validated.totalMarks;
    marking.maxMarks = validated.maxMarks || maxMarks;
    marking.percentage = validated.percentage;
    marking.questions = validated.questions.map((q) => ({
      questionNumber: String(q.questionNumber),
      studentAnswer: q.studentAnswer,
      correctAnswer: q.correctAnswer,
      marksAwarded: q.marksAwarded,
      maxMarks: q.maxMarks,
      feedback: q.feedback,
    }));
    marking.extractedHeader = validated.extractedHeader;
    marking.paperMismatch = validated.paperMismatch;
    marking.mismatchReason = validated.mismatchReason;
    marking.aiRawResult = validated;
    marking.status = terminalStatus;
    await marking.save();

    return marking;
  } catch (err) {
    // 4. On failure, update record
    marking.status = 'failed';
    marking.errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await marking.save().catch(() => {}); // never throw from cleanup
    throw err;
  }
}
```

The helper functions:

```ts
interface PaperTypeInfo {
  kind: 'generated' | 'assessment';
  subject: string;
  grade: string | number;
  topic: string;
  totalMarks: number;
  memoLines: string[];
}

async function detectPaperType(paperId: string, schoolId: string): Promise<PaperTypeInfo | null> {
  const oid = new mongoose.Types.ObjectId(paperId);
  const soid = new mongoose.Types.ObjectId(schoolId);

  // Try GeneratedPaper first
  const gen = await GeneratedPaper.findOne({ _id: oid, schoolId: soid, isDeleted: false }).lean();
  if (gen) {
    const memoLines: string[] = [];
    for (const sec of gen.sections ?? []) {
      for (const q of sec.questions ?? []) {
        memoLines.push(
          `Question ${q.questionNumber} (${q.marks} marks):\n  Question: ${q.questionText}\n  Correct Answer: ${q.modelAnswer}\n  Marking Guideline: ${q.markingGuideline}`,
        );
      }
    }
    return {
      kind: 'generated',
      subject: gen.subject,
      grade: gen.grade,
      topic: gen.topic,
      totalMarks: gen.totalMarks,
      memoLines,
    };
  }

  // Try AssessmentPaper
  const asm = await AssessmentPaper.findOne({ _id: oid, schoolId: soid, isDeleted: false })
    .populate([{ path: 'subjectId', select: 'name' }, { path: 'gradeId', select: 'name level' }])
    .lean();
  if (asm) {
    const qIds: mongoose.Types.ObjectId[] = [];
    for (const sec of asm.sections ?? []) {
      for (const pq of sec.questions ?? []) qIds.push(pq.questionId as mongoose.Types.ObjectId);
    }
    const qDocs = await Question.find({ _id: { $in: qIds }, schoolId: soid, isDeleted: false }).lean();
    const qMap = new Map(qDocs.map((q) => [q._id.toString(), q]));
    const memoLines: string[] = [];
    for (const sec of asm.sections ?? []) {
      for (const pq of sec.questions ?? []) {
        const q = qMap.get(pq.questionId.toString());
        if (!q) continue;
        memoLines.push(
          `Question ${pq.questionNumber} (${pq.marks} marks):\n  Question: ${q.stem}\n  Correct Answer: ${q.answer ?? ''}\n  Marking Guideline: ${q.markingRubric ?? ''}`,
        );
      }
    }
    const subj = (asm.subjectId as { name?: string } | undefined)?.name ?? '';
    const gr = (asm.gradeId as { name?: string } | undefined)?.name ?? '';
    return {
      kind: 'assessment', subject: subj, grade: gr, topic: asm.title ?? '',
      totalMarks: asm.totalMarks ?? 0, memoLines,
    };
  }

  return null;
}

function buildPrompts(paper: PaperTypeInfo): { systemPrompt: string; userPrompt: string; maxMarks: number } {
  const systemPrompt = `You are marking a South African school test paper. You will be shown photographs of a student's handwritten answers (one or more pages). Compare each answer against the memo provided. Award marks according to the marking guideline. For partial answers, award partial marks where appropriate. Be fair but accurate.

FIRST: Read the paper header from page 1. Compare against the expected paper metadata below. If the paper shown is clearly different from the expected paper (different subject, grade, or title), set "paperMismatch": true and explain in "mismatchReason". Otherwise set "paperMismatch": false.

Return ONLY valid JSON with this exact structure:
{
  "studentName": "...",
  "extractedHeader": "<the subject/grade/topic text you read from page 1>",
  "paperMismatch": false,
  "mismatchReason": "",
  "totalMarks": 0,
  "maxMarks": 0,
  "percentage": 0,
  "questions": [
    { "questionNumber": 1, "studentAnswer": "...", "correctAnswer": "...", "marksAwarded": 0, "maxMarks": 0, "feedback": "..." }
  ]
}

Rules:
- Read the handwriting carefully. If a word is illegible, include "[illegible]" in studentAnswer.
- Match each visible answer to the corresponding question number.
- If a question appears unanswered, award 0 and set feedback "No answer provided".
- percentage = totalMarks / maxMarks * 100 rounded to 1 decimal.
- Return ONLY JSON. No markdown fences, no explanation.`;

  const userPrompt = `Expected paper metadata:
- Subject: ${paper.subject}
- Grade: ${paper.grade}
- Topic/Title: ${paper.topic}
- Total Marks: ${paper.totalMarks}

MEMORANDUM:
${paper.memoLines.join('\n\n')}

Please read the student's handwritten answers from the attached images and grade them against this memo.`;

  return { systemPrompt, userPrompt, maxMarks: paper.totalMarks };
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean. The main consumer (`controller.ts`) will break because the old `markPaperFromImage` function is gone; that's fine — Task 3.2 fixes it.

- [ ] **Step 5: Commit (expect tsc errors in controller/routes until next tasks)**

```bash
git add src/modules/AITools/service-marking.ts src/services/ai.service.ts
git commit -m "feat(marking): multi-image, persistence, Zod validation, paper-mismatch detection"
```

---

## Phase 4 — Missing endpoints

### Task 4.1: Query + update services

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITools\service-marking-queries.ts`

- [ ] **Step 1: Create the file**

```ts
// src/modules/AITools/service-marking-queries.ts
import mongoose from 'mongoose';
import { PaperMarking, type IPaperMarking } from './model-marking.js';
import { NotFoundError, BadRequestError } from '../../common/errors.js';

export async function listMarkings(
  schoolId: string,
  filters: { paperId?: string; studentId?: string; status?: string },
  page = 1,
  limit = 20,
): Promise<{ markings: IPaperMarking[]; total: number }> {
  const query: Record<string, unknown> = {
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  };
  if (filters.paperId) query.paperId = new mongoose.Types.ObjectId(filters.paperId);
  if (filters.studentId) query.studentId = new mongoose.Types.ObjectId(filters.studentId);
  if (filters.status) query.status = filters.status;

  const [markings, total] = await Promise.all([
    PaperMarking.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    PaperMarking.countDocuments(query),
  ]);
  return { markings: markings as IPaperMarking[], total };
}

export async function getMarkingById(id: string, schoolId: string): Promise<IPaperMarking> {
  const marking = await PaperMarking.findOne({
    _id: new mongoose.Types.ObjectId(id),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  }).lean();
  if (!marking) throw new NotFoundError('Marking not found');
  return marking as IPaperMarking;
}

export async function updateMarking(
  id: string,
  schoolId: string,
  updates: {
    questions?: Array<{
      questionNumber: string;
      marksAwarded: number;
      maxMarks: number;
      feedback?: string;
    }>;
    status?: 'completed' | 'needs_review';
  },
): Promise<IPaperMarking> {
  const marking = await PaperMarking.findOne({
    _id: new mongoose.Types.ObjectId(id),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
  if (!marking) throw new NotFoundError('Marking not found');
  if (marking.status === 'published') {
    throw new BadRequestError('Cannot edit a published marking');
  }

  if (updates.questions) {
    marking.questions = marking.questions.map((existing) => {
      const override = updates.questions?.find((u) => u.questionNumber === existing.questionNumber);
      if (!override) return existing;
      return {
        ...existing,
        marksAwarded: override.marksAwarded,
        maxMarks: override.maxMarks,
        feedback: override.feedback ?? existing.feedback,
      };
    });
    marking.totalMarks = marking.questions.reduce((s, q) => s + (q.marksAwarded ?? 0), 0);
    marking.maxMarks = marking.questions.reduce((s, q) => s + (q.maxMarks ?? 0), 0);
    marking.percentage = marking.maxMarks > 0
      ? Math.round((marking.totalMarks / marking.maxMarks) * 1000) / 10
      : 0;
  }
  if (updates.status) {
    marking.status = updates.status;
  }
  await marking.save();
  return marking.toObject() as IPaperMarking;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/AITools/service-marking-queries.ts
git commit -m "feat(marking): list + get + update services"
```

### Task 4.2: Controller + routes

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\controller.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\routes.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\validation.ts`

- [ ] **Step 1: Update validation schema**

Open `src/modules/AITools/validation.ts`. Replace the existing `markPaperSchema` with:

```ts
import { z } from 'zod/v4';

export const markPaperSchema = z.object({
  body: z.object({
    paperId: z.string().min(1),
    studentName: z.string().min(1),
    studentId: z.string().optional(),
    images: z.array(z.string().min(1)).min(1).max(8),
    imageTypes: z.array(z.enum(['image/jpeg', 'image/png', 'image/webp'])).min(1).max(8),
  }).refine((data) => data.images.length === data.imageTypes.length, {
    message: 'images and imageTypes arrays must have the same length',
    path: ['imageTypes'],
  }),
});

export const updateMarkingSchema = z.object({
  body: z.object({
    questions: z.array(z.object({
      questionNumber: z.string(),
      marksAwarded: z.number().nonnegative(),
      maxMarks: z.number().nonnegative(),
      feedback: z.string().optional(),
    })).optional(),
    status: z.enum(['completed', 'needs_review']).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

export const listMarkingsQuerySchema = z.object({
  query: z.object({
    paperId: z.string().optional(),
    studentId: z.string().optional(),
    status: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
```

Keep all other exports in the file intact.

- [ ] **Step 2: Update the controller**

In `src/modules/AITools/controller.ts`:

a) Replace the existing `markPaper` static method with:

```ts
  static async markPaper(req: Request, res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: 'User must be assigned to a school' });
      return;
    }
    const { markPaperFromImages } = await import('./service-marking.js');
    const marking = await markPaperFromImages(getUser(req).id, schoolId, req.body);
    res.json(apiResponse(true, marking, 'Paper marked successfully'));
  }
```

b) Add three new static methods before the closing `}`:

```ts
  static async listMarkings(req: Request, res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: 'User must be assigned to a school' }); return; }
    const { listMarkings } = await import('./service-marking-queries.js');
    const { paperId, studentId, status, page, limit } = req.query;
    const result = await listMarkings(
      schoolId,
      {
        paperId: paperId as string | undefined,
        studentId: studentId as string | undefined,
        status: status as string | undefined,
      },
      page ? parseInt(page as string, 10) : undefined,
      limit ? parseInt(limit as string, 10) : undefined,
    );
    res.json(apiResponse(true, result, 'Markings retrieved successfully'));
  }

  static async getMarkingById(req: Request, res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: 'User must be assigned to a school' }); return; }
    const { getMarkingById } = await import('./service-marking-queries.js');
    const marking = await getMarkingById(req.params.id as string, schoolId);
    res.json(apiResponse(true, marking, 'Marking retrieved successfully'));
  }

  static async updateMarking(req: Request, res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) { res.status(400).json({ success: false, error: 'User must be assigned to a school' }); return; }
    const { updateMarking } = await import('./service-marking-queries.js');
    const marking = await updateMarking(req.params.id as string, schoolId, req.body);
    res.json(apiResponse(true, marking, 'Marking updated successfully'));
  }
```

If the other controller methods import services at the top (rather than dynamic imports), follow that pattern instead.

- [ ] **Step 3: Update routes**

In `src/modules/AITools/routes.ts`:

a) Update the `import` statement at the top to pull in the new validation schemas:

```ts
import {
  generatePaperSchema,
  updatePaperSchema,
  regenerateQuestionSchema,
  gradeSubmissionSchema,
  bulkGradeSchema,
  reviewGradeSchema,
  publishGradeParamsSchema,
  markPaperSchema,
  updateMarkingSchema,
} from './validation.js';
```

b) The existing `POST /mark-paper` already exists. Leave the route but the controller now expects an array. The `validate(markPaperSchema)` middleware will enforce the new shape. No line change needed if the middleware is already wired.

c) Add three new routes before the `// ─── AI Grading` section header:

```ts
// GET /markings — list paper markings
router.get(
  '/markings',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  AIToolsController.listMarkings,
);

// GET /markings/:id — get a single marking
router.get(
  '/markings/:id',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  AIToolsController.getMarkingById,
);

// PUT /markings/:id — update teacher overrides
router.put(
  '/markings/:id',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  validate(updateMarkingSchema),
  AIToolsController.updateMarking,
);
```

- [ ] **Step 4: Typecheck + tests**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: clean. Existing tests should still pass (153). New Zod tests (6) run green from Phase 2.

- [ ] **Step 5: Commit**

```bash
git add src/modules/AITools/controller.ts src/modules/AITools/routes.ts src/modules/AITools/validation.ts
git commit -m "feat(marking): wire multi-image mark-paper + list/get/update endpoints"
```

### Task 4.3: Integration test

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITools\__tests__\service-marking.test.ts`

- [ ] **Step 1: Write the test**

This test doesn't call Claude (we'd need real images + API budget). It tests the persistence layer: calling `listMarkings`, `getMarkingById`, `updateMarking` against manually-created `PaperMarking` docs.

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { PaperMarking } from '../model-marking.js';
import { listMarkings, getMarkingById, updateMarking } from '../service-marking-queries.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

describe('marking queries', () => {
  it('lists markings scoped to a school', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const otherSchool = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const paperId = new mongoose.Types.ObjectId();

    await PaperMarking.create([
      { schoolId, teacherId, paperId, paperType: 'generated', studentName: 'A', imageCount: 1,
        totalMarks: 5, maxMarks: 10, percentage: 50, questions: [], status: 'completed' },
      { schoolId, teacherId, paperId, paperType: 'generated', studentName: 'B', imageCount: 1,
        totalMarks: 8, maxMarks: 10, percentage: 80, questions: [], status: 'completed' },
      { schoolId: otherSchool, teacherId, paperId, paperType: 'generated', studentName: 'C', imageCount: 1,
        totalMarks: 2, maxMarks: 10, percentage: 20, questions: [], status: 'completed' },
    ]);

    const { markings, total } = await listMarkings(schoolId.toString(), {});
    expect(markings.length).toBe(2);
    expect(total).toBe(2);
  });

  it('returns one marking by id', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const paperId = new mongoose.Types.ObjectId();
    const created = await PaperMarking.create({
      schoolId, teacherId, paperId, paperType: 'generated', studentName: 'X',
      imageCount: 1, totalMarks: 5, maxMarks: 10, percentage: 50, questions: [], status: 'completed',
    });
    const fetched = await getMarkingById(created._id.toString(), schoolId.toString());
    expect(fetched.studentName).toBe('X');
  });

  it('updates question marks and recomputes totals', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const paperId = new mongoose.Types.ObjectId();
    const created = await PaperMarking.create({
      schoolId, teacherId, paperId, paperType: 'generated', studentName: 'Y', imageCount: 1,
      totalMarks: 5, maxMarks: 10, percentage: 50,
      questions: [
        { questionNumber: '1', studentAnswer: '', correctAnswer: '', marksAwarded: 2, maxMarks: 5, feedback: '' },
        { questionNumber: '2', studentAnswer: '', correctAnswer: '', marksAwarded: 3, maxMarks: 5, feedback: '' },
      ],
      status: 'completed',
    });
    const updated = await updateMarking(created._id.toString(), schoolId.toString(), {
      questions: [{ questionNumber: '1', marksAwarded: 5, maxMarks: 5 }],
    });
    expect(updated.questions.find((q) => q.questionNumber === '1')?.marksAwarded).toBe(5);
    expect(updated.totalMarks).toBe(8);
    expect(updated.percentage).toBe(80);
  });

  it('rejects update on published marking', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const paperId = new mongoose.Types.ObjectId();
    const created = await PaperMarking.create({
      schoolId, teacherId, paperId, paperType: 'generated', studentName: 'Z', imageCount: 1,
      totalMarks: 5, maxMarks: 10, percentage: 50, questions: [], status: 'published',
    });
    await expect(
      updateMarking(created._id.toString(), schoolId.toString(), { questions: [] }),
    ).rejects.toThrow(/published/i);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/modules/AITools/__tests__/service-marking.test.ts
```

Expected: 4/4 pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/AITools/__tests__/service-marking.test.ts
git commit -m "test(marking): integration tests for list/get/update"
```

---

## Phase 5 — Frontend: fix contract + mismatch banner

### Task 5.1: Update `useTeacherMarking`

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\hooks\useTeacherMarking.ts`

- [ ] **Step 1: Read the existing hook to understand shape**

The existing hook probably exports `markPaper`, `fetchPapers`, and expects response data. Confirm its signatures and callers.

- [ ] **Step 2: Fix the endpoint path**

Change the `POST` call from `/ai-tools/mark-paper-multi` to `/ai-tools/mark-paper`. Body shape stays `{ paperId, studentName, studentId, images, imageTypes }`.

- [ ] **Step 3: Add list/get/update methods**

Add three new `useCallback` methods:

```tsx
const listMarkings = useCallback(async (filters?: { paperId?: string; studentId?: string; status?: string }) => {
  try {
    const response = await apiClient.get('/ai-tools/markings', { params: filters });
    const raw = unwrapResponse(response);
    return (raw.markings ?? []) as PaperMarking[];
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load markings';
    toast.error(msg);
    return [];
  }
}, []);

const getMarking = useCallback(async (id: string) => {
  try {
    const response = await apiClient.get(`/ai-tools/markings/${id}`);
    return unwrapResponse(response) as PaperMarking;
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load marking';
    toast.error(msg);
    return null;
  }
}, []);

const updateMarking = useCallback(async (id: string, questions: PaperMarking['questions']) => {
  try {
    const response = await apiClient.put(`/ai-tools/markings/${id}`, { questions });
    const updated = unwrapResponse(response) as PaperMarking;
    toast.success('Marking updated');
    return updated;
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update marking';
    toast.error(msg);
    return null;
  }
}, []);
```

Add them to the return object alongside the existing methods. Drop the old `publishMarking` (if present) since publish is out of scope — or leave it but have it toast "Not yet available."

Ensure the `PaperMarking` type in `src/components/mark-papers/types.ts` (or wherever it lives) has the new fields: `extractedHeader`, `paperMismatch`, `mismatchReason`, and the `'needs_review'` status variant. Add them if missing.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTeacherMarking.ts src/components/mark-papers/types.ts 2>/dev/null || true
git commit -m "feat(marking): align frontend with backend contract; add list/get/update"
```

### Task 5.2: Paper-mismatch banner in MarkingResults

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\components\mark-papers\MarkingResults.tsx`

- [ ] **Step 1: Add banner when `paperMismatch` is true**

At the top of the results view (before the score summary), add:

```tsx
{marking.paperMismatch && (
  <Card className="border-destructive">
    <CardContent className="flex items-start gap-3 p-4">
      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
      <div className="space-y-1 text-sm">
        <p className="font-medium text-destructive">This doesn&apos;t look like the selected paper.</p>
        <p className="text-muted-foreground">
          The AI read the header as: <span className="font-medium">&ldquo;{marking.extractedHeader || 'unknown'}&rdquo;</span>
        </p>
        {marking.mismatchReason && (
          <p className="text-muted-foreground">{marking.mismatchReason}</p>
        )}
        <p className="text-muted-foreground mt-2">
          Please review carefully before accepting these marks, or cancel and re-upload with the correct paper.
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

Import `AlertTriangle` from `lucide-react` and add `Card, CardContent` if not already imported.

- [ ] **Step 2: Make the Accept / Save button secondary when mismatch is true**

Find the main action button in `MarkingResults.tsx` (Save / Accept / Publish). Wrap it so that if `marking.paperMismatch && marking.status === 'needs_review'`, the button reads "Accept anyway" with `variant="outline"` instead of the default primary style. A teacher should feel friction.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/mark-papers/MarkingResults.tsx
git commit -m "feat(marking): paper-mismatch warning banner + friction on accept"
```

---

## Phase 6 — End-to-end verification

### Task 6.1: Automated final checks

- [ ] **Step 1: Run backend tests**

```bash
cd c:/Users/shaun/campusly-backend
npx vitest run
```

Expected: 6 new tests (service-marking-parse: 6 + service-marking: 4 = 10) added to the 153 baseline → **163 passing**.

- [ ] **Step 2: Typecheck both repos**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

Both clean.

### Task 6.2: Manual smoke test

- [ ] **Step 1: Start both dev servers**

```bash
cd c:/Users/shaun/campusly-backend && npm run dev
cd c:/Users/shaun/campusly-frontend && npm run dev
```

- [ ] **Step 2: Happy path**

Login as a teacher with marking access. Navigate to `/teacher/curriculum/mark-papers`.

Verify:
- [ ] Paper selection lists both AI-generated and assessment papers.
- [ ] Student selection works (both select-from-class and manual-name).
- [ ] Upload accepts multiple images (1–8).
- [ ] Marking completes, results screen shows per-question marks + feedback.
- [ ] Teacher can adjust a mark, Save updates the record, percentage recalculates.
- [ ] Browsing `/teacher/curriculum/mark-papers` again shows a "History" of markings (if the UI lists them — otherwise confirm via `GET /ai-tools/markings`).

- [ ] **Step 3: Failure paths**

- [ ] **Paper mismatch:** upload a photo of a different paper than selected. Confirm the red banner appears with the extracted header and Accept button is outlined instead of primary.
- [ ] **Malformed Claude output:** requires mocking. Skip for manual smoke; the Zod tests cover this.
- [ ] **Empty image array:** attempt to submit with no images — frontend should block; backend returns 400 if bypassed.
- [ ] **Mid-marking refresh:** start a marking, immediately refresh the browser. Re-open the paper — the marking should be visible with `status: 'processing'` or `'failed'` (never missing entirely).

### Task 6.3: Document what's out of scope

- [ ] **Step 1: Update the in-app messaging (optional)**

On the marking results screen, add a small note: `Marks are saved to your Marking tool. Pushing to the gradebook will arrive in a future release.` Exact wording is the user's call — dispatch a quick edit only if they ask for it.

---

## Self-review

- **Spec coverage:**
  - Backend data persistence — Phase 1 (schema) + Phase 3 (service rewrite creates record + updates it).
  - Zod validation — Phase 2 (schema + tests) + Phase 3 Step 3 (applied).
  - Multi-image support — Phase 3 Step 2 (`generateVisionCompletionWithImages`) + Step 3 (service accepts `images[]`).
  - Wrong-paper safety — Phase 3 Step 3 prompt asks Claude to extract header + compare; `paperMismatch: true` lands `status: 'needs_review'`; banner in Phase 5.2.
  - Missing endpoints — Phase 4 (list/get/update) all wired.
  - Frontend contract fix — Phase 5.1 (endpoint path corrected).
  - No gradebook publish — intentionally excluded. `'published'` status stays reserved but no endpoint writes it.

- **Placeholders:** none. Every code-producing step has concrete code.

- **Type consistency:** `MarkPapersPayload`, `IPaperMarking`, `MarkingResponse` used consistently. Status enum `'processing' | 'completed' | 'needs_review' | 'failed' | 'published'` appears in the model, the service, the controller, the hook types, and the banner condition — one source of truth (the model) drives all the others.

- **Known risks:**
  - Anthropic SDK multi-image content format: verify against `@anthropic-ai/sdk`'s types at execution time. If the SDK exposes a slightly different content shape than the `content: [{type:'image',...}, {type:'text',...}]` pattern, adjust the implementation (not the plan).
  - Paper-mismatch accuracy: Claude will sometimes false-flag. The banner is a warning, not a block. Accept anyway remains available.
  - Integration test depends on local mongo at `mongodb://localhost:27017/campusly-test`. Already in use by other tests; should still work.
  - This plan does NOT touch `MarkingUpload.tsx` or `ImageDropzone.tsx` beyond what's needed to pass the new contract. PDF handling stays accepted at frontend but now rejected cleanly at backend (Zod enum). If the user wants PDFs supported, that's a separate task (needs PDF-to-image conversion).
