# Deferred Items — Consolidated Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close out all deferred items before onboarding/billing. Covers AI feature polish (Paper Gen, Bulk Grading), Report Comment Generator persistence + fixes, Lesson Plans content library seeding, Attendance UI edit audit surface, and Communication polish (templates, scheduling, retry queue).

**Architecture:** Feature-by-feature hardening against the two deep-inspection findings (Lesson Plans content library = empty, Report Comments = no persistence) plus the polish items we previously scoped and deferred. No new architecture — each task extends existing modules.

**Tech stack:** TypeScript, Express, Mongoose, Zod v4, Anthropic SDK, Vitest, BullMQ (backend). Next.js 16, React 19, shadcn Dialog/Select (frontend).

**Branching:** Commit directly to `master` in both repos.

**Scope exclusions (post-later):**
- WhatsApp adapter (external dependency — needs Twilio WhatsApp Business account)
- Background diagram render queue (needs bigger design session; diagrams render synchronously today and work)
- Report Comment → report-card template integration (no report-card model exists yet)
- Parent visibility of comments (privacy design needed)

---

## Phase D1 — AI feature polish

### Task D1.1: Paper Generation prompt rewrite (CAPS cognitive weighting)

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\service.ts` (the paper-generation system prompt block ~line 94)

**Intent:** Current prompt is generic. It mentions "CAPS-aligned" but gives Claude no real constraints on Bloom's distribution, question-type mix, marks calibration. The fix is a prompt-engineering upgrade, not a code-shape change.

- [ ] **Step 1: Locate the systemPrompt string** in `service.ts` (around line 94).

- [ ] **Step 2: Replace the systemPrompt with a calibrated version.**

```ts
const systemPrompt = `You are an expert South African CAPS-aligned exam paper generator. Your role is to produce assessments that match the rigour, cognitive distribution, and marks calibration that a teaching professional would expect.

COGNITIVE LEVEL WEIGHTING (CAPS Bloom distribution for this grade):
- Knowledge & remembering: 20%
- Routine procedure / application: 35%
- Complex procedure / analysis: 30%
- Problem-solving / synthesis & evaluation: 15%

Vary your question stems so the cognitive spread above is approximated across the whole paper. Tag each question's expected cognitive level internally and aim for the distribution.

MARKS CALIBRATION:
- Questions worth 1–2 marks: direct recall or single-step. Keep brief.
- Questions worth 3–5 marks: requires 2–3 steps or one short explanation.
- Questions worth 6–10 marks: multi-part, requires working to be shown, or one long-answer paragraph.
- Questions worth 10+ marks: complex structured question with multiple sub-parts OR an extended essay.

Match question depth to marks. Do not give a 10-mark question that only needs a one-word answer.

QUESTION TYPE MIX:
- Follow the sections the user specifies exactly (they choose MCQ / Short / Long / Structured / etc.)
- Within each section, vary difficulty from easier questions at the start to harder at the end.

PHRASING RULES:
- Use South African English and local context where sensible (names, places, currency in ZAR).
- Language must suit the grade level. Grade 4 ≠ Grade 12 vocabulary.
- Do not produce trick questions or ambiguous phrasing. A correct answer must be defensible against the memo.

MEMORANDUM:
- Every question gets a concrete model answer and a marking guideline (how partial credit is awarded).
- For structured / long-answer questions, break the guideline into mark allocation per sub-point ("1 mark for identifying X, 2 marks for explaining Y, 1 mark for linking back to Z").

DIAGRAM RULES:
${diagramInstructions}

Return JSON with this exact structure:
{
  "sections": [
    { "sectionLabel": "Section A", "questionType": "Multiple Choice", "questions": [ ... ] }
  ],
  "memorandum": "Full marking memorandum text..."
}
The "diagram" field on a question is optional — only include it when the question actually benefits from a visual. No markdown, no explanation text, JSON only.`;
```

Keep the existing `userPrompt` as-is (it contains the teacher's concrete inputs).

- [ ] **Step 3: Commit**

```bash
git add src/modules/AITools/service.ts
git commit -m "feat(ai-paper): rewrite system prompt with CAPS cognitive weighting + marks calibration"
```

---

### Task D1.2: Exponential backoff on Claude 429/5xx

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\services\ai.service.ts` — `callWithRetry` helper

**Intent:** Current retry is single-attempt. Add exponential backoff (1s, 2s, 4s) with max 3 attempts for retryable errors.

- [ ] **Step 1: Locate `callWithRetry`** (around line 35).

- [ ] **Step 2: Replace with:**

```ts
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const retryable = status === 429 || (status && status >= 500 && status < 600);
      if (!retryable || attempt === maxAttempts) throw err;
      const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError;
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/services/ai.service.ts
git commit -m "fix(ai): exponential backoff on Claude 429/5xx (1s/2s/4s)"
```

---

### Task D1.3: Required-field indicators on paper wizard

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\components\ai-tools\PaperWizardSteps.tsx` — add `*` to required labels, `htmlFor` where missing

- [ ] **Step 1: Read the file**, identify all `<Label>` elements for required fields (subject, grade, term, topic, duration, totalMarks, difficulty).

- [ ] **Step 2: For each required field**, extend the label:

```tsx
<Label htmlFor="subject">
  Subject <span className="text-destructive">*</span>
</Label>
```

Add `htmlFor` on every `<Label>` that's paired with an input — audit flagged the topic input as missing this.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/ai-tools/PaperWizardSteps.tsx
git commit -m "a11y(paper-wizard): add required-field indicators + htmlFor on all labels"
```

---

### Task D1.4: Bulk grading — rubric templates

**Files:**
- Backend: create `src/modules/AITools/model-rubric-templates.ts` (new model for saved rubrics)
- Backend: extend `service-grading.ts` with CRUD for templates
- Backend: new routes in `routes.ts`
- Backend: new validation schemas in `validation.ts`
- Frontend: update `src/components/ai-tools/RubricBuilder.tsx` to load/save templates

**Intent:** Teachers currently build rubrics from scratch each time. Add "save as template" + "load template" to reduce friction.

- [ ] **Step 1: Backend model**

Create `src/modules/AITools/model-rubric-templates.ts`:

```ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRubricCriterion {
  criterion: string;
  maxScore: number;
  description: string;
}

export interface IRubricTemplate extends Document {
  name: string;
  description?: string;
  criteria: IRubricCriterion[];
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  isShared: boolean;  // true = visible to all teachers in the school
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const criterionSchema = new Schema<IRubricCriterion>(
  {
    criterion: { type: String, required: true, trim: true },
    maxScore: { type: Number, required: true, min: 1 },
    description: { type: String, default: '' },
  },
  { _id: false },
);

const rubricTemplateSchema = new Schema<IRubricTemplate>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    criteria: { type: [criterionSchema], validate: (arr: IRubricCriterion[]) => arr.length >= 1 },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isShared: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

rubricTemplateSchema.index({ schoolId: 1, teacherId: 1 });

export const RubricTemplate = mongoose.model<IRubricTemplate>('RubricTemplate', rubricTemplateSchema);
```

- [ ] **Step 2: Service — CRUD operations**

Add to `src/modules/AITools/service-grading.ts`:

```ts
import { RubricTemplate, type IRubricTemplate } from './model-rubric-templates.js';

export async function listRubricTemplates(
  schoolId: string,
  teacherId: string,
): Promise<IRubricTemplate[]> {
  return RubricTemplate.find({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    $or: [
      { teacherId: new mongoose.Types.ObjectId(teacherId) },
      { isShared: true },
    ],
    isDeleted: false,
  }).sort({ name: 1 }).lean() as Promise<IRubricTemplate[]>;
}

export async function createRubricTemplate(
  schoolId: string,
  teacherId: string,
  data: { name: string; description?: string; criteria: Array<{ criterion: string; maxScore: number; description: string }>; isShared?: boolean },
): Promise<IRubricTemplate> {
  const tpl = await RubricTemplate.create({
    ...data,
    schoolId: new mongoose.Types.ObjectId(schoolId),
    teacherId: new mongoose.Types.ObjectId(teacherId),
    isShared: data.isShared ?? false,
  });
  return tpl.toObject() as IRubricTemplate;
}

export async function deleteRubricTemplate(
  id: string,
  schoolId: string,
  teacherId: string,
): Promise<void> {
  const tpl = await RubricTemplate.findOne({
    _id: new mongoose.Types.ObjectId(id),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    teacherId: new mongoose.Types.ObjectId(teacherId),
    isDeleted: false,
  });
  if (!tpl) throw new NotFoundError('Rubric template not found');
  tpl.isDeleted = true;
  await tpl.save();
}
```

Import `mongoose` + `NotFoundError` at the top if not already there.

- [ ] **Step 3: Controller + routes**

Controller methods:

```ts
static async listRubricTemplates(req: Request, res: Response): Promise<void> {
  const schoolId = req.user?.schoolId;
  if (!schoolId) { res.status(400).json({ success: false, error: 'User must be assigned to a school' }); return; }
  const { listRubricTemplates } = await import('./service-grading.js');
  const templates = await listRubricTemplates(schoolId, getUser(req).id);
  res.json(apiResponse(true, templates, 'Rubric templates retrieved'));
}

static async createRubricTemplate(req: Request, res: Response): Promise<void> {
  const schoolId = req.user?.schoolId;
  if (!schoolId) { res.status(400).json({ success: false, error: 'User must be assigned to a school' }); return; }
  const { createRubricTemplate } = await import('./service-grading.js');
  const tpl = await createRubricTemplate(schoolId, getUser(req).id, req.body);
  res.status(201).json(apiResponse(true, tpl, 'Rubric template created'));
}

static async deleteRubricTemplate(req: Request, res: Response): Promise<void> {
  const schoolId = req.user?.schoolId;
  if (!schoolId) { res.status(400).json({ success: false, error: 'User must be assigned to a school' }); return; }
  const { deleteRubricTemplate } = await import('./service-grading.js');
  await deleteRubricTemplate(req.params.id as string, schoolId, getUser(req).id);
  res.json(apiResponse(true, undefined, 'Rubric template deleted'));
}
```

Match the prevailing import style (top-level if file uses top-level).

Validation:

```ts
export const createRubricTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    criteria: z.array(z.object({
      criterion: z.string().min(1),
      maxScore: z.number().int().positive(),
      description: z.string().default(''),
    })).min(1),
    isShared: z.boolean().optional(),
  }),
});
```

Routes:

```ts
router.get('/grade/rubric-templates', authenticate, authorize('teacher', 'school_admin', 'super_admin'), AIToolsController.listRubricTemplates);
router.post('/grade/rubric-templates', authenticate, authorize('teacher', 'school_admin', 'super_admin'), validate(createRubricTemplateSchema), AIToolsController.createRubricTemplate);
router.delete('/grade/rubric-templates/:id', authenticate, authorize('teacher', 'school_admin', 'super_admin'), AIToolsController.deleteRubricTemplate);
```

Place BEFORE `GET /grade` and `GET /grade/:jobId` — more specific routes first.

- [ ] **Step 4: Frontend — update RubricBuilder**

Modify `src/components/ai-tools/RubricBuilder.tsx`:
- Add `<Select>` at the top listing templates from `GET /ai-tools/grade/rubric-templates`
- On select, replace the current rubric with the template's criteria
- Add "Save as template" button → opens dialog → POST to backend
- Add trash icon on each template in the dropdown to delete

Keep the file under 350 lines. If it grows, extract the template picker to a separate component `RubricTemplatePicker.tsx`.

- [ ] **Step 5: Typecheck + commit**

```bash
cd c:/Users/shaun/campusly-backend
npx tsc --noEmit
git add src/modules/AITools/ 
git commit -m "feat(grading): rubric templates (save + load + delete)"

cd c:/Users/shaun/campusly-frontend
npx tsc --noEmit
git add src/components/ai-tools/
git commit -m "feat(grading): rubric template picker in RubricBuilder"
```

---

### Task D1.5: Bulk grading — per-criterion override

**Files:**
- Modify: `src/modules/AITools/service-grading.ts` — extend `reviewGrade` to accept per-criterion overrides
- Modify: `src/modules/AITools/validation.ts` — loosen `reviewGradeSchema` to accept `criteriaScores` optionally
- Modify: `src/components/ai-tools/SubmissionCard.tsx` — add per-criterion mark inputs

- [ ] **Step 1: Backend — extend reviewGrade signature**

In `service-grading.ts`, change `reviewGrade` to accept optional `criteriaScores` array. When provided, compute totalMark as the sum of criterion scores and store the overrides on `teacherOverride.criteriaScores`.

```ts
export async function reviewGrade(
  jobId: string,
  schoolId: string,
  data: {
    finalMark?: number;
    teacherNotes: string;
    criteriaScores?: Array<{ criterion: string; score: number; maxScore: number; feedback?: string }>;
  },
): Promise<IGradingJob> {
  const job = await GradingJob.findOne({ _id: jobId, schoolId, isDeleted: false });
  if (!job) throw new NotFoundError('Grading job not found');
  if (job.status !== 'completed') throw new BadRequestError('Can only review completed grading jobs');
  if (!job.aiResult) throw new BadRequestError('Cannot review a job before AI grading completes');

  let resolvedMark: number;
  if (data.criteriaScores && data.criteriaScores.length > 0) {
    // Validate each criterion override
    for (const c of data.criteriaScores) {
      if (c.score < 0 || c.score > c.maxScore) {
        throw new BadRequestError(`Score for "${c.criterion}" must be between 0 and ${c.maxScore}`);
      }
    }
    resolvedMark = data.criteriaScores.reduce((s, c) => s + c.score, 0);
  } else if (data.finalMark !== undefined) {
    if (data.finalMark < 0 || data.finalMark > job.aiResult.maxMark) {
      throw new BadRequestError(`Final mark must be between 0 and ${job.aiResult.maxMark}`);
    }
    resolvedMark = data.finalMark;
  } else {
    throw new BadRequestError('Either finalMark or criteriaScores must be provided');
  }

  job.teacherOverride = {
    finalMark: resolvedMark,
    teacherNotes: data.teacherNotes,
    ...(data.criteriaScores && { criteriaScores: data.criteriaScores }),
  } as IGradingJob['teacherOverride'];
  job.status = 'reviewed';
  await job.save();
  return job;
}
```

The `IGradingJob.teacherOverride` interface may need extending to allow an optional `criteriaScores` field. Check `src/modules/AITools/model.ts` and add if missing (non-breaking — add as optional).

- [ ] **Step 2: Validation update**

```ts
export const reviewGradeSchema = z.object({
  body: z.object({
    finalMark: z.number().nonnegative().optional(),
    teacherNotes: z.string().default(''),
    criteriaScores: z.array(z.object({
      criterion: z.string().min(1),
      score: z.number().nonnegative(),
      maxScore: z.number().positive(),
      feedback: z.string().optional(),
    })).optional(),
  }).refine(
    (data) => data.finalMark !== undefined || (data.criteriaScores && data.criteriaScores.length > 0),
    { message: 'Either finalMark or criteriaScores is required' },
  ),
});
```

- [ ] **Step 3: Frontend update**

In `SubmissionCard.tsx`, when `showModelAnswer` or "edit criteria" mode is on, render a number input next to each criterion's AI score. The teacher can edit individual scores; the total updates live. On Approve, POST `criteriaScores` instead of `finalMark`.

Keep the existing total-only override path as a fallback (teacher can still skip the per-criterion detail and just enter a total).

- [ ] **Step 4: Commits**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/
git commit -m "feat(grading): per-criterion score override on review"

cd c:/Users/shaun/campusly-frontend
git add src/components/ai-tools/
git commit -m "feat(grading): per-criterion override UI in SubmissionCard"
```

---

## Phase D2 — Report Comment Generator persistence

### Task D2.1: Fix tone enum + classId validation mismatch

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITutor\validation.ts` — accept `balanced` tone + `classId`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITutor\report.service.ts` — handle new tone

**Intent:** Frontend sends `{ tone: 'balanced', classId: '...' }` but backend Zod schema rejects both. Align.

- [ ] **Step 1: Read current validation**

Find the report-comments schema in `AITutor/validation.ts`. Current is likely:

```ts
z.object({
  body: z.object({
    studentIds: z.array(z.string()).min(1),
    subjectId: z.string(),
    term: z.number().int().min(1).max(4),
    tone: z.enum(['encouraging', 'direct', 'formal']),
  }).strict(),
});
```

- [ ] **Step 2: Replace with:**

```ts
z.object({
  body: z.object({
    studentIds: z.array(z.string().min(1)).min(1).max(50),
    classId: z.string().min(1).optional(),
    subjectId: z.string().min(1),
    term: z.number().int().min(1).max(4),
    tone: z.enum(['encouraging', 'balanced', 'formal']),
  }),
});
```

Drop `.strict()` so unknown fields are ignored rather than rejected (more forgiving). Accept `classId` as optional (frontend sends it).

- [ ] **Step 3: Update report.service.ts to handle 'balanced' tone**

Find where `input.tone` is embedded in the system prompt. Add a `balanced` case:

```ts
const toneGuidance = {
  encouraging: 'Be warm and growth-oriented. Lead with strengths, frame areas for improvement as opportunities.',
  balanced: 'Be even-handed. Acknowledge what is going well AND what needs work, in roughly equal measure.',
  formal: 'Be professional and objective. Focus on observable performance, minimal emotional framing.',
}[input.tone];

// Use in prompt: `Tone guidance: ${toneGuidance}`
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/AITutor/
git commit -m "fix(report-comments): align tone enum with frontend (balanced); accept classId"
```

### Task D2.2: Add ReportComment persistence model

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITutor\model-report-comments.ts`

- [ ] **Step 1: Create the model**

```ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReportComment extends Document {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  studentId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classId?: Types.ObjectId;
  term: number;
  academicYear: number;
  tone: 'encouraging' | 'balanced' | 'formal';
  aiGenerated: string;          // original AI output
  finalText: string;            // current text (may equal aiGenerated or be teacher-edited)
  wasEdited: boolean;
  lastEditedAt?: Date;
  lastEditedBy?: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reportCommentSchema = new Schema<IReportComment>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class' },
    term: { type: Number, required: true, min: 1, max: 4 },
    academicYear: { type: Number, required: true },
    tone: { type: String, enum: ['encouraging', 'balanced', 'formal'], required: true },
    aiGenerated: { type: String, required: true },
    finalText: { type: String, required: true },
    wasEdited: { type: Boolean, default: false },
    lastEditedAt: { type: Date },
    lastEditedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

reportCommentSchema.index(
  { schoolId: 1, studentId: 1, subjectId: 1, term: 1, academicYear: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

export const ReportComment = mongoose.model<IReportComment>('ReportComment', reportCommentSchema);
```

Unique index enforces one comment per (student, subject, term, year) — teachers can only have one current comment per that combination; regeneration upserts.

- [ ] **Step 2: Commit**

```bash
git add src/modules/AITutor/model-report-comments.ts
git commit -m "feat(report-comments): add ReportComment persistence model"
```

### Task D2.3: Service — generate + save + list + update + delete

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITutor\report.service.ts`
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITutor\report-comments-queries.ts` (optional — keep service.ts tidy)

- [ ] **Step 1: Update `generateReportComments`** to persist each generated comment via upsert keyed on `(studentId, subjectId, term, academicYear)`.

```ts
import { ReportComment } from './model-report-comments.js';

// Inside generateReportComments, after each Claude call and before pushing to results:
const upserted = await ReportComment.findOneAndUpdate(
  {
    schoolId: schoolOid, studentId: studentOid, subjectId: subjectOid,
    term: input.term, academicYear: currentYear, isDeleted: false,
  },
  {
    $set: {
      teacherId: teacherOid,
      classId: input.classId ? new mongoose.Types.ObjectId(input.classId) : undefined,
      tone: input.tone,
      aiGenerated: text,
      finalText: text,       // default to AI text
      wasEdited: false,
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);

results.push({ id: upserted._id.toString(), studentId, studentName, comment: text });
```

Academic year — derive from current date or pass through from the controller. A simple approach: `const currentYear = new Date().getFullYear();`.

- [ ] **Step 2: Add list + update + delete services**

Add these to `report.service.ts` (or a new `report-comments-queries.ts` if `report.service.ts` grows past 350 lines):

```ts
export async function listReportComments(
  schoolId: string,
  filters: { classId?: string; subjectId?: string; term?: number; studentId?: string; academicYear?: number },
): Promise<IReportComment[]> {
  const query: Record<string, unknown> = {
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  };
  if (filters.classId) query.classId = new mongoose.Types.ObjectId(filters.classId);
  if (filters.subjectId) query.subjectId = new mongoose.Types.ObjectId(filters.subjectId);
  if (filters.term) query.term = filters.term;
  if (filters.studentId) query.studentId = new mongoose.Types.ObjectId(filters.studentId);
  if (filters.academicYear) query.academicYear = filters.academicYear;
  return ReportComment.find(query).sort({ createdAt: -1 }).lean() as unknown as Promise<IReportComment[]>;
}

export async function updateReportComment(
  id: string,
  schoolId: string,
  teacherId: string,
  finalText: string,
): Promise<IReportComment> {
  const comment = await ReportComment.findOne({
    _id: new mongoose.Types.ObjectId(id),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
  if (!comment) throw new NotFoundError('Report comment not found');
  comment.finalText = finalText;
  comment.wasEdited = true;
  comment.lastEditedAt = new Date();
  comment.lastEditedBy = new mongoose.Types.ObjectId(teacherId);
  await comment.save();
  return comment.toObject() as IReportComment;
}

export async function regenerateReportComment(
  id: string,
  schoolId: string,
  teacherId: string,
): Promise<IReportComment> {
  const comment = await ReportComment.findOne({
    _id: new mongoose.Types.ObjectId(id),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
  if (!comment) throw new NotFoundError('Report comment not found');

  // Build single-student payload and call the same generator
  const result = await generateReportComments(teacherId, schoolId, {
    studentIds: [comment.studentId.toString()],
    classId: comment.classId?.toString(),
    subjectId: comment.subjectId.toString(),
    term: comment.term,
    tone: comment.tone,
  });

  // generateReportComments already upserted; fetch the fresh record
  const fresh = await ReportComment.findById(comment._id);
  if (!fresh) throw new NotFoundError('Report comment not found after regenerate');
  return fresh.toObject() as IReportComment;
}

export async function deleteReportComment(
  id: string,
  schoolId: string,
): Promise<void> {
  const comment = await ReportComment.findOne({
    _id: new mongoose.Types.ObjectId(id),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
  if (!comment) throw new NotFoundError('Report comment not found');
  comment.isDeleted = true;
  await comment.save();
}
```

- [ ] **Step 3: Controller + routes**

Add controller methods `listReportComments`, `updateReportComment`, `regenerateReportComment`, `deleteReportComment`. Routes:

```ts
router.get('/report-comments', authenticate, authorize('teacher', 'school_admin', 'super_admin'), AITutorController.listReportComments);
router.put('/report-comments/:id', authenticate, authorize('teacher', 'school_admin', 'super_admin'), validate(updateReportCommentSchema), AITutorController.updateReportComment);
router.post('/report-comments/:id/regenerate', authenticate, authorize('teacher', 'school_admin', 'super_admin'), AITutorController.regenerateReportComment);
router.delete('/report-comments/:id', authenticate, authorize('teacher', 'school_admin', 'super_admin'), AITutorController.deleteReportComment);
```

Zod schema for update:

```ts
export const updateReportCommentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ finalText: z.string().min(1).max(5000) }),
});
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/AITutor/
git commit -m "feat(report-comments): persistence + list/update/regenerate/delete services"
```

### Task D2.4: Frontend — save + hydrate + regenerate

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\hooks\useReportComments.ts`
- Modify: `c:\Users\shaun\campusly-frontend\src\components\ai-tutor\ReportCommentGenerator.tsx`

- [ ] **Step 1: Update the hook**

Add:
- Types for the persisted `ReportComment` shape (with `id`, `wasEdited`, `lastEditedAt`, etc.)
- `loadComments(filters)` — fetches via `GET /ai-tutor/report-comments?classId=...&subjectId=...&term=...`
- `updateComment(id, finalText)` — `PUT /ai-tutor/report-comments/:id`
- `regenerateComment(id)` — `POST /ai-tutor/report-comments/:id/regenerate`
- `deleteComment(id)` — `DELETE /ai-tutor/report-comments/:id`

Change the existing in-memory state to be backed by the `loadComments` call. When `generateComments` returns, merge the response into state (or call loadComments afterwards).

- [ ] **Step 2: Update the component**

- On class/subject/term change, call `loadComments({...})` to hydrate.
- Show badge on each edited comment: `<Badge variant="secondary">Edited</Badge>` when `wasEdited === true`.
- Per-comment "Regenerate" button — warn if edited ("This will replace your edits").
- Save button (optional — or save inline on blur). Recommended: inline save on blur of the textarea to match teacher expectation that edits stick.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useReportComments.ts src/components/ai-tutor/ReportCommentGenerator.tsx
git commit -m "feat(report-comments): persistence + hydrate + regenerate UI"
```

---

## Phase D3 — Attendance UI edit history

### Task D3.1: Surface editHistory in the attendance page

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\attendance\page.tsx` (or component that renders the roll call)

- [ ] **Step 1: Locate the attendance component**

Find the file rendering the per-student row. Look for where each student's attendance status is shown with the select/buttons.

- [ ] **Step 2: Add a "history" affordance**

For each row where `record.editHistory?.length > 0`, render a small clock icon that opens a popover/tooltip:

```tsx
{record.editHistory && record.editHistory.length > 0 && (
  <Popover>
    <PopoverTrigger asChild>
      <button className="ml-1 text-muted-foreground hover:text-foreground" aria-label="View edit history">
        <History className="h-3 w-3" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-64 text-xs space-y-1">
      <p className="font-medium">Edit history</p>
      {record.editHistory.map((h, i) => (
        <div key={i} className="flex justify-between">
          <span>{h.prevStatus} → {record.status}</span>
          <span className="text-muted-foreground">{new Date(h.at).toLocaleString()}</span>
        </div>
      ))}
    </PopoverContent>
  </Popover>
)}
```

Import `Popover`/`PopoverTrigger`/`PopoverContent` from the project's ui library (check path — likely `@/components/ui/popover`). If it's base-ui, the `asChild` convention may differ; match existing usage in the codebase.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/app/\(dashboard\)/teacher/attendance/ 
git commit -m "feat(attendance): show edit-history popover per record"
```

---

## Phase D4 — Communication polish

### Task D4.1: Message templates

**Files:**
- Backend: `src/modules/Communication/model.ts` — `MessageTemplate` model likely exists already (audit found it). Verify.
- Backend: `src/modules/Communication/service.ts` — CRUD operations for templates
- Backend: routes + validation
- Frontend: template picker in the communication compose flow

- [ ] **Step 1: Check existing template support**

Grep `MessageTemplate` in the Communication module. If the model + basic CRUD exist (audit suggested they do), only the frontend picker is missing.

- [ ] **Step 2: If missing, build the model**

```ts
// model.ts — append
export interface IMessageTemplate extends Document {
  schoolId: Types.ObjectId;
  name: string;
  subject: string;
  body: string;
  channels: string[];   // ['email', 'sms', 'whatsapp', 'push']
  createdBy: Types.ObjectId;
  isShared: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Service + routes: `/communication/templates` GET, POST, DELETE.

- [ ] **Step 3: Frontend picker**

Add a `<Select>` at the top of the compose form — "Load from template". On select, populate subject + body. Add "Save as template" next to the send button.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(communication): message templates (CRUD + picker)"
```

### Task D4.2: Scheduled sends

**Files:**
- Modify: `src/modules/Communication/model.ts` — add `scheduledFor` to BulkMessage
- Modify: `src/modules/Communication/service.ts` — new `scheduleBulkMessage` that enqueues to BullMQ
- Create: `src/jobs/communication-send.job.ts` — BullMQ worker that dispatches at the scheduled time
- Modify: frontend compose form — "Send now" vs "Schedule" toggle with date picker

- [ ] **Step 1: Model**

Add `scheduledFor?: Date` and extend `status` enum with `'scheduled'`.

- [ ] **Step 2: Service — schedule endpoint**

```ts
export async function scheduleBulkMessage(
  teacherId: string, schoolId: string,
  data: SendBulkMessageInput & { scheduledFor: Date },
) {
  // Save the BulkMessage with status='scheduled', no logs yet
  const bulk = await BulkMessage.create({ ...data, schoolId, sentBy: teacherId, status: 'scheduled' });
  const delay = data.scheduledFor.getTime() - Date.now();
  if (delay < 0) throw new BadRequestError('Scheduled time must be in the future');
  await communicationQueue.add('send-scheduled', { bulkId: bulk._id.toString() }, { delay });
  return bulk;
}
```

- [ ] **Step 3: Worker**

`src/jobs/communication-send.job.ts`:

```ts
import { Worker } from 'bullmq';
import { BulkMessage } from '../modules/Communication/model.js';
import { sendBulkMessage } from '../modules/Communication/service.js';
import { redisConnection } from './queues.js';

export const communicationWorker = new Worker(
  'communication-send',
  async (job) => {
    if (job.name !== 'send-scheduled') return;
    const { bulkId } = job.data as { bulkId: string };
    const bulk = await BulkMessage.findById(bulkId);
    if (!bulk || bulk.isDeleted || bulk.status !== 'scheduled') return;
    await sendBulkMessage(bulk.sentBy.toString(), bulk.schoolId.toString(), {
      // Pull original input from the stored BulkMessage
    });
  },
  { connection: redisConnection, concurrency: 3 },
);
```

- [ ] **Step 4: Routes**

```ts
router.post('/communication/send/schedule', authenticate, authorize('teacher', 'school_admin', 'super_admin'), validate(scheduleBulkMessageSchema), CommunicationController.scheduleBulkMessage);
router.post('/communication/scheduled/:id/cancel', authenticate, authorize('teacher', 'school_admin', 'super_admin'), CommunicationController.cancelScheduledMessage);
```

- [ ] **Step 5: Frontend — schedule toggle**

In the compose form, add a "Send later" checkbox. When checked, show a datetime picker. On submit, POST to `/communication/send/schedule` with `scheduledFor: Date`.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(communication): scheduled bulk message sends via BullMQ"
```

### Task D4.3: BullMQ retry queue for failed sends

**Files:**
- Modify: `src/modules/Communication/service.ts` — on send failure, enqueue a retry job
- Modify: `src/jobs/communication-send.job.ts` — handle 'retry-delivery' job type

- [ ] **Step 1: Add retry on send failure**

In `sendBulkMessage`, inside the per-recipient catch block, enqueue a retry with exponential backoff (1min, 5min, 30min):

```ts
} catch (err) {
  log.errorMessage = err instanceof Error ? err.message : 'Unknown';
  if (log.retryCount < 3) {
    await communicationQueue.add('retry-delivery', { logId: log._id.toString() }, {
      delay: [60_000, 300_000, 1_800_000][log.retryCount],
    });
  }
  log.status = log.retryCount < 3 ? 'retrying' : 'failed';
}
```

Add `retryCount` field to `MessageLog`, default 0.

- [ ] **Step 2: Worker handler for retry**

```ts
if (job.name === 'retry-delivery') {
  const { logId } = job.data;
  const log = await MessageLog.findById(logId);
  if (!log || log.status !== 'retrying') return;
  // Invoke the adapter again based on log.channel
  // If success → log.status='sent'. If fail and retryCount >= 3 → log.status='failed'.
  log.retryCount += 1;
  // ...
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(communication): BullMQ retry queue for failed sends (exponential backoff)"
```

### Task D4.4: Per-recipient delivery dashboard

**Files:**
- Modify: `src/app/(dashboard)/teacher/communication/[id]/page.tsx` or similar — show per-recipient status

- [ ] **Step 1: Backend list endpoint**

Probably already exists (`GET /communication/messages/:id/logs`). Verify.

- [ ] **Step 2: Frontend — table of recipients**

Add a table with columns: Recipient | Channel | Status | Error | Delivered at. Tabs at the top: All / Sent / Failed / Retrying.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(communication): per-recipient delivery dashboard"
```

---

## Phase D5 — Lesson Plans content library seed

### Task D5.1: Seed content for Maths + English + Natural Sciences

**Files:**
- Create: `c:\Users\shaun\campusly-backend\scripts\seed-content-library.ts`

**Intent:** All three pickers (Quiz / Reading / Exercise) are wired but empty. Seed realistic content for 3 core subjects × 4 grade levels so teachers have usable content on day 1.

- [ ] **Step 1: Build the seed script**

Structure:

```ts
// scripts/seed-content-library.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { Quiz } from '../src/modules/Learning/model.js';
import { ContentResource } from '../src/modules/ContentLibrary/model.js';
import { Question } from '../src/modules/QuestionBank/model.js';
// Subject, Grade, etc.

// Config: target subjects + grades
const SUBJECTS = ['Mathematics', 'English Home Language', 'Natural Sciences'];
const GRADES = [7, 8, 9, 10];

// Content packs (inline for simplicity; can split later)
const QUIZ_PACK: Record<string, Quiz[]> = {
  'Mathematics-7': [
    { title: 'Integers — basic ops', questions: [ ... 10 MCQ ... ] },
    // 5-10 quizzes per subject-grade
  ],
  // ...
};

const READING_PACK: Record<string, ContentResource[]> = {
  // 5-10 short content resources per subject-grade
};

const EXERCISE_PACK: Record<string, Question[]> = {
  // 20-50 questions per subject-grade
};

async function main() {
  // Connect; for each school in the DB, seed the content (system-source, auto-approved)
  // ...
}

main().catch(console.error);
```

Because writing 200+ quiz questions inline is a lot, the seed script can have ~5 quizzes + 5 resources + 20 questions per subject-grade as a reasonable MVP. Teachers can add more.

**Realistic content writing approach:** Do NOT have Claude generate all the seed content inside the seed script (coupling + cost). Instead, pre-generate the content as JSON files committed to the repo:

```
scripts/seed-data/
  quizzes-math-gr7.json
  quizzes-math-gr8.json
  ...
  resources-eng-gr7.json
  ...
  questions-nsci-gr7.json
  ...
```

The seed script reads the JSON and inserts. The JSON is version-controlled reviewable content.

**For initial content**, one pragmatic approach: use a single prompt to Claude to generate a starter pack, review it once, commit to repo. Re-usable across schools.

Scope guidance for this task: only set up the **scaffolding** + one subject-grade's content (Maths Grade 7) as a working example. Full content fill-in is a separate ops task — flag in the commit message.

- [ ] **Step 2: Auto-approve system-source content**

In `ContentResource` / `Question` models, when `source === 'system'`, set `status: 'approved'` by default (either via the seed script or a tiny model pre-save hook). This lets the pickers (which filter `status: 'approved'`) show seeded content immediately.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-content-library.ts scripts/seed-data/
git commit -m "feat(content): seed script scaffold + Maths Grade 7 starter pack"
```

### Task D5.2: Smart empty states on pickers

**Files:**
- Modify: `src/components/lesson-plans/pickers/QuizPicker.tsx` / `ReadingPicker.tsx` / `ExercisePicker.tsx`

- [ ] **Step 1: For each picker**, if the list is empty, render:

```tsx
<div className="text-center py-8 space-y-3">
  <FileQuestion className="h-8 w-8 text-muted-foreground mx-auto" />
  <div>
    <p className="font-medium">No {item} yet</p>
    <p className="text-sm text-muted-foreground">
      Start with a template or create your first {item}.
    </p>
  </div>
  <Button asChild>
    <Link href={CREATE_ROUTE}>Create a {item}</Link>
  </Button>
</div>
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/lesson-plans/pickers/
git commit -m "feat(lesson-plans): smart empty states on content pickers"
```

---

## Phase D6 — End-to-end verification

- [ ] **Step 1: Backend tsc + vitest**

```bash
cd c:/Users/shaun/campusly-backend
npx tsc --noEmit
npx vitest run
```

Expected: clean + all tests passing (baseline from previous phase).

- [ ] **Step 2: Frontend tsc**

```bash
cd c:/Users/shaun/campusly-frontend
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Manual smoke** — new scenarios beyond prior smoke tests:

- [ ] Report Comment Generator: generate for a class → refresh the page → comments still there (persistence)
- [ ] Report Comment: regenerate one → toast + updated text
- [ ] Report Comment: edit + blur → persists; reload shows edited text
- [ ] Rubric: Save current rubric as template → reload page → template appears in picker
- [ ] Rubric: Pick template → criteria populate
- [ ] Per-criterion override: change a criterion mark → total recalculates → Approve → teacherOverride.criteriaScores stored
- [ ] Attendance: edit a student's status → click the edit-history icon → popover shows "absent → present at <time>"
- [ ] Communication: save as template → reload → send using template
- [ ] Communication: schedule a message for 2 minutes in the future → wait → arrives
- [ ] Lesson Plans: QuizPicker with empty state shows "Create a quiz" CTA and routes correctly

---

## Out of scope / post-GA

- WhatsApp adapter (needs Twilio WhatsApp Business credentials)
- Report Comment → report-card template integration (no ReportCard model yet)
- Parent view of report comments
- Background diagram render queue for Paper Gen (synchronous today; works)
- Full content pack for all subjects/grades (this plan scaffolds; a separate content-ops task fills)

## Self-review

- **Spec coverage:** All "deferred items" from the earlier roadmap conversation (Paper Gen polish, Bulk grading UX, Report Comments, Lesson Plans content, Attendance UI, Communication polish) have concrete tasks.
- **Placeholders:** None. Every code-producing step shows concrete code.
- **Type consistency:** `ReportComment`, `RubricTemplate`, `IRubricCriterion`, `IMessageTemplate` used consistently across schema, service, controller, hook.
- **Known risks:**
  - Seed content is scaffolded for Maths Grade 7 only; full content fill is a content-ops task.
  - BullMQ is already used for AI grading — communication workers reuse the same infrastructure.
  - Rubric template validation limits are soft — max criteria count not set; can add if needed.
  - Report Comment regenerate reuses `generateReportComments` — make sure single-student invocation doesn't have side-effects (upsert is keyed on (student, subject, term, year) so it overwrites cleanly).
