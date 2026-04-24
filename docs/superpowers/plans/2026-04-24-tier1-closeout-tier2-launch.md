# Tier 1 Close-out + Tier 2 Launch Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close out the Tier 1 AI features by wiring both AI Paper Marking and Bulk Essay Grading to the real gradebook, plus fix the remaining Bulk Grading blockers. Then harden the three Tier 2 launch features (Attendance, Communication, Homework) to a commercially defensible state.

**Architecture:** A single new `publishMarkToGradebook(schoolId, assessmentId, studentId, mark, comment?)` service in the Academic module upserts a `Mark` record. Both AI Paper Marking's `publishMarking` and Bulk Essay Grading's `publishGrade` call it. Publish requires the teacher to choose a pre-existing `Assessment` item — we do not auto-create assessment items from AI output (that would corrupt CAPS weighting). Attendance gains transactional bulk writes + edit audit. Communication wires the existing `EmailService` adapter into `sendBulkMessage` and gates unconfigured SMS/WhatsApp channels. Homework caps grading at `totalMarks`.

**Tech stack:** TypeScript, Express, Mongoose, Zod v4, Anthropic SDK, Vitest (backend). Next.js 16, React 19 (frontend).

**Branching:** Commit directly to `master` in both repos.

---

## File Structure

**Backend (`c:\Users\shaun\campusly-backend`):**

Create:
- `src/modules/Academic/service-gradebook-publish.ts` — shared publish service (Mark upsert)
- `src/modules/Academic/__tests__/service-gradebook-publish.test.ts` — integration tests
- `src/modules/AITools/validation-grading.ts` — Zod schema for Claude's essay-grading response
- `src/modules/AITools/__tests__/service-grading-parse.test.ts` — Zod tests
- `src/modules/Attendance/__tests__/service.bulk.test.ts` — bulk atomicity tests

Modify:
- `src/modules/AITools/service-grading.ts` — `publishGrade` now calls `publishMarkToGradebook`; new `retryGrade` function; `listGradingJobs` adds status filter
- `src/modules/AITools/service-marking-queries.ts` — new `publishMarking(id, schoolId, assessmentId)` calls the shared service
- `src/modules/AITools/validation.ts` — `publishGradeSchema` adds `assessmentId` body; `reviewGradeSchema` tightens finalMark cap; new `publishMarkingSchema`; new `retryGradeParamsSchema`
- `src/modules/AITools/controller.ts` — `publishGrade` reads `assessmentId` from body; new `publishMarking` + `retryGrade` handlers
- `src/modules/AITools/routes.ts` — wire new routes (`POST /markings/:id/publish`, `POST /grade/:jobId/retry`)
- `src/jobs/ai-grading.job.ts` — apply `GradingResponseSchema.safeParse` after `generateJSONWithUsage`; fail job cleanly on invalid
- `src/modules/Attendance/model.ts` — add `lastModifiedBy`, `lastModifiedAt`; add embedded `editHistory: Array<{ at: Date; by: ObjectId; prevStatus: string }>`
- `src/modules/Attendance/service.ts` — `bulkRecord` wrapped in MongoDB transaction; on edit, push to `editHistory`, set `lastModifiedBy`
- `src/modules/Communication/service.ts` — rewrite `sendBulkMessage` to actually dispatch via `EmailService`; gate SMS/WhatsApp if unconfigured; capture per-recipient status
- `src/modules/Homework/validation.ts` — `gradeSubmissionSchema`: add `.refine(mark <= totalMarks)` cross-field check via `superRefine` or equivalent

**Frontend (`c:\Users\shaun\campusly-frontend`):**

Create:
- `src/components/ai-tools/PublishToGradebookDialog.tsx` — shared assessment-picker modal used by both Grading and Marking publish flows

Modify:
- `src/hooks/useAITools.ts` — `publishGrade` now takes `assessmentId`; new `retryGrade(jobId)`; new `loadIncompleteGradingJobs(assignmentId?)`
- `src/hooks/useTeacherMarking.ts` — `publishMarking` actually calls backend (currently a toast-only no-op); takes `assessmentId`
- `src/components/ai-tools/SubmissionCard.tsx` — Publish button opens `PublishToGradebookDialog`; passes resolved `assessmentId`; shows "Retry" button when status === 'failed'
- `src/components/ai-tools/MarkingResults.tsx` — Publish button opens same dialog, same flow
- `src/app/(dashboard)/teacher/ai-tools/grading/page.tsx` — load incomplete grading jobs on mount so refresh restores state

---

## Phase T1 — Tier 1 close-out

### Task T1.1: Shared publish-to-gradebook service (TDD)

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\Academic\service-gradebook-publish.ts`
- Create: `c:\Users\shaun\campusly-backend\src\modules\Academic\__tests__\service-gradebook-publish.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Academic/__tests__/service-gradebook-publish.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Assessment, Mark } from '../model.js';
import { publishMarkToGradebook } from '../service-gradebook-publish.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

describe('publishMarkToGradebook', () => {
  it('creates a Mark when none exists', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const assessment = await Assessment.create({
      name: 'Test 1', subjectId: new mongoose.Types.ObjectId(), classId: null,
      schoolId, type: 'test', totalMarks: 50, weight: 20, term: 1,
      academicYear: 2026, date: new Date(),
    });
    const studentId = new mongoose.Types.ObjectId();

    const result = await publishMarkToGradebook({
      schoolId: schoolId.toString(),
      assessmentId: assessment._id.toString(),
      studentId: studentId.toString(),
      mark: 40,
      comment: 'Good work',
    });
    expect(result.mark).toBe(40);
    expect(result.total).toBe(50);
    expect(result.percentage).toBe(80);

    const stored = await Mark.findOne({ assessmentId: assessment._id, studentId });
    expect(stored?.comment).toBe('Good work');
  });

  it('upserts (second call replaces first)', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const assessment = await Assessment.create({
      name: 'T2', subjectId: new mongoose.Types.ObjectId(), classId: null,
      schoolId, type: 'test', totalMarks: 20, weight: 10, term: 1,
      academicYear: 2026, date: new Date(),
    });
    const studentId = new mongoose.Types.ObjectId();

    await publishMarkToGradebook({
      schoolId: schoolId.toString(), assessmentId: assessment._id.toString(),
      studentId: studentId.toString(), mark: 10,
    });
    await publishMarkToGradebook({
      schoolId: schoolId.toString(), assessmentId: assessment._id.toString(),
      studentId: studentId.toString(), mark: 18,
    });

    const all = await Mark.find({ assessmentId: assessment._id, studentId });
    expect(all.length).toBe(1);
    expect(all[0].mark).toBe(18);
  });

  it('rejects mark greater than totalMarks', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const assessment = await Assessment.create({
      name: 'T3', subjectId: new mongoose.Types.ObjectId(), classId: null,
      schoolId, type: 'test', totalMarks: 10, weight: 5, term: 1,
      academicYear: 2026, date: new Date(),
    });
    await expect(publishMarkToGradebook({
      schoolId: schoolId.toString(), assessmentId: assessment._id.toString(),
      studentId: new mongoose.Types.ObjectId().toString(), mark: 11,
    })).rejects.toThrow(/cannot exceed/i);
  });

  it('rejects cross-tenant assessment', async () => {
    const schoolA = new mongoose.Types.ObjectId();
    const schoolB = new mongoose.Types.ObjectId();
    const assessment = await Assessment.create({
      name: 'T4', subjectId: new mongoose.Types.ObjectId(), classId: null,
      schoolId: schoolA, type: 'test', totalMarks: 10, weight: 5, term: 1,
      academicYear: 2026, date: new Date(),
    });
    await expect(publishMarkToGradebook({
      schoolId: schoolB.toString(), assessmentId: assessment._id.toString(),
      studentId: new mongoose.Types.ObjectId().toString(), mark: 5,
    })).rejects.toThrow(/not found/i);
  });

  it('rejects negative mark', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const assessment = await Assessment.create({
      name: 'T5', subjectId: new mongoose.Types.ObjectId(), classId: null,
      schoolId, type: 'test', totalMarks: 10, weight: 5, term: 1,
      academicYear: 2026, date: new Date(),
    });
    await expect(publishMarkToGradebook({
      schoolId: schoolId.toString(), assessmentId: assessment._id.toString(),
      studentId: new mongoose.Types.ObjectId().toString(), mark: -1,
    })).rejects.toThrow(/non-negative|negative/i);
  });
});
```

- [ ] **Step 2: Run the test — expect fail**

`npx vitest run src/modules/Academic/__tests__/service-gradebook-publish.test.ts` → module not found.

- [ ] **Step 3: Implement**

```ts
// src/modules/Academic/service-gradebook-publish.ts
import mongoose from 'mongoose';
import { Assessment, Mark, type IMark } from './model.js';
import { BadRequestError, NotFoundError } from '../../common/errors.js';

export interface PublishMarkInput {
  schoolId: string;
  assessmentId: string;
  studentId: string;
  mark: number;
  comment?: string;
  isAbsent?: boolean;
}

export async function publishMarkToGradebook(input: PublishMarkInput): Promise<IMark> {
  if (!Number.isFinite(input.mark) || input.mark < 0) {
    throw new BadRequestError('Mark must be a non-negative number.');
  }

  const schoolOid = new mongoose.Types.ObjectId(input.schoolId);
  const assessmentOid = new mongoose.Types.ObjectId(input.assessmentId);
  const studentOid = new mongoose.Types.ObjectId(input.studentId);

  const assessment = await Assessment.findOne({
    _id: assessmentOid,
    schoolId: schoolOid,
    isDeleted: false,
  }).lean();

  if (!assessment) throw new NotFoundError('Assessment not found');

  if (input.mark > assessment.totalMarks) {
    throw new BadRequestError(
      `Mark (${input.mark}) cannot exceed assessment total (${assessment.totalMarks}).`,
    );
  }

  const percentage = assessment.totalMarks > 0
    ? Math.round((input.mark / assessment.totalMarks) * 1000) / 10
    : 0;

  const updated = await Mark.findOneAndUpdate(
    { assessmentId: assessmentOid, studentId: studentOid },
    {
      $set: {
        schoolId: schoolOid,
        mark: input.mark,
        total: assessment.totalMarks,
        percentage,
        comment: input.comment,
        isAbsent: input.isAbsent ?? false,
        isDeleted: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!updated) throw new Error('Mark upsert failed');
  return updated.toObject() as IMark;
}
```

- [ ] **Step 4: Run tests — expect all 5 pass**

- [ ] **Step 5: Commit**

```bash
git add src/modules/Academic/service-gradebook-publish.ts src/modules/Academic/__tests__/service-gradebook-publish.test.ts
git commit -m "feat(gradebook): shared publishMarkToGradebook service (upsert + guardrails)"
```

---

### Task T1.2: Wire Bulk Essay Grading publish to gradebook

**Files:**
- Modify: `src/modules/AITools/service-grading.ts` — `publishGrade` takes `assessmentId`; calls shared service
- Modify: `src/modules/AITools/validation.ts` — `publishGradeSchema` body includes `assessmentId`; `reviewGradeSchema` caps `finalMark`
- Modify: `src/modules/AITools/controller.ts` — `publishGrade` reads `assessmentId` from body
- Modify: `src/modules/AITools/routes.ts` — apply validate middleware on publish route

- [ ] **Step 1: Validation schema update**

Replace `publishGradeParamsSchema` (or wrap with full body schema):

```ts
export const publishGradeSchema = z.object({
  params: z.object({ jobId: z.string().min(1) }),
  body: z.object({
    assessmentId: z.string().min(1),
    comment: z.string().optional(),
  }),
});
```

Tighten `reviewGradeSchema` — `finalMark` must be between 0 and `maxMark` stored on the job. Zod can't easily cross-reference DB, so keep the Zod bound as `z.number().nonnegative()` and add the runtime cap in the service.

- [ ] **Step 2: Service update**

In `src/modules/AITools/service-grading.ts`, replace `publishGrade`:

```ts
import { publishMarkToGradebook } from '../Academic/service-gradebook-publish.js';

export async function publishGrade(
  jobId: string,
  schoolId: string,
  assessmentId: string,
  comment?: string,
): Promise<IGradingJob> {
  const job = await GradingJob.findOne({ _id: jobId, schoolId, isDeleted: false });
  if (!job) throw new NotFoundError('Grading job not found');
  if (job.status !== 'completed' && job.status !== 'reviewed') {
    throw new BadRequestError('Can only publish completed or reviewed grading jobs');
  }

  const resolvedMark =
    job.teacherOverride?.finalMark ??
    job.aiResult?.totalMark ??
    0;

  await publishMarkToGradebook({
    schoolId,
    assessmentId,
    studentId: job.studentId.toString(),
    mark: resolvedMark,
    comment: comment ?? job.teacherOverride?.teacherNotes,
  });

  job.status = 'published';
  await job.save();
  return job;
}
```

Also in `reviewGrade`, add the cap:

```ts
export async function reviewGrade(
  jobId: string, schoolId: string,
  data: { finalMark: number; teacherNotes: string },
): Promise<IGradingJob> {
  const job = await GradingJob.findOne({ _id: jobId, schoolId, isDeleted: false });
  if (!job) throw new NotFoundError('Grading job not found');
  if (!job.aiResult) {
    throw new BadRequestError('Cannot review a job before AI grading completes');
  }
  if (data.finalMark < 0 || data.finalMark > job.aiResult.maxMark) {
    throw new BadRequestError(
      `Final mark must be between 0 and ${job.aiResult.maxMark}`,
    );
  }
  job.teacherOverride = { finalMark: data.finalMark, teacherNotes: data.teacherNotes };
  job.status = 'reviewed';
  await job.save();
  return job;
}
```

Add retry (new export):

```ts
import { aiGradingQueue } from '../../jobs/ai-grading.job.js';

export async function retryGrade(jobId: string, schoolId: string): Promise<IGradingJob> {
  const job = await GradingJob.findOne({ _id: jobId, schoolId, isDeleted: false });
  if (!job) throw new NotFoundError('Grading job not found');
  if (job.status === 'completed' || job.status === 'reviewed' || job.status === 'published') {
    throw new BadRequestError('Only queued or grading jobs can be retried');
  }
  job.status = 'queued';
  job.aiResult = undefined;
  await job.save();
  await aiGradingQueue.add('grade', { jobId: job._id.toString() });
  return job;
}
```

Also ensure `getGradingJobs` accepts a `status` filter (likely already does per the audit — verify).

- [ ] **Step 3: Controller update**

In `src/modules/AITools/controller.ts`, replace `publishGrade`:

```ts
static async publishGrade(req: Request, res: Response): Promise<void> {
  const schoolId = req.user?.schoolId;
  if (!schoolId) { res.status(400).json({ success: false, error: 'User must be assigned to a school' }); return; }
  const { publishGrade } = await import('./service-grading.js');
  const { assessmentId, comment } = req.body as { assessmentId: string; comment?: string };
  const job = await publishGrade(req.params.jobId as string, schoolId, assessmentId, comment);
  res.json(apiResponse(true, job, 'Grade published to gradebook'));
}
```

Add `retryGrade`:

```ts
static async retryGrade(req: Request, res: Response): Promise<void> {
  const schoolId = req.user?.schoolId;
  if (!schoolId) { res.status(400).json({ success: false, error: 'User must be assigned to a school' }); return; }
  const { retryGrade } = await import('./service-grading.js');
  const job = await retryGrade(req.params.jobId as string, schoolId);
  res.json(apiResponse(true, job, 'Grade re-queued'));
}
```

- [ ] **Step 4: Routes update**

Replace the publish route to apply `validate(publishGradeSchema)`:

```ts
router.post(
  '/grade/:jobId/publish',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  validate(publishGradeSchema),
  AIToolsController.publishGrade,
);

router.post(
  '/grade/:jobId/retry',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  AIToolsController.retryGrade,
);
```

- [ ] **Step 5: Typecheck + tests**

`npx tsc --noEmit && npx vitest run` — all green.

- [ ] **Step 6: Commit**

```bash
git add src/modules/AITools/validation.ts src/modules/AITools/service-grading.ts src/modules/AITools/controller.ts src/modules/AITools/routes.ts
git commit -m "feat(grading): publish writes to gradebook; cap finalMark; add retry endpoint"
```

---

### Task T1.3: Add publishMarking endpoint for AI Paper Marking

**Files:**
- Modify: `src/modules/AITools/service-marking-queries.ts` — export `publishMarking`
- Modify: `src/modules/AITools/validation.ts` — add `publishMarkingSchema`
- Modify: `src/modules/AITools/controller.ts` — new `publishMarking` handler
- Modify: `src/modules/AITools/routes.ts` — new route

- [ ] **Step 1: Validation**

```ts
export const publishMarkingSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    assessmentId: z.string().min(1),
    studentId: z.string().min(1),
    comment: z.string().optional(),
  }),
});
```

Note `studentId` is in the body because the `PaperMarking` record may not have one (teacher typed student name manually). If the marking record already has a `studentId`, use that and let `body.studentId` be optional.

Revised:

```ts
export const publishMarkingSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    assessmentId: z.string().min(1),
    studentId: z.string().min(1).optional(),
    comment: z.string().optional(),
  }),
});
```

- [ ] **Step 2: Service**

Add to `src/modules/AITools/service-marking-queries.ts`:

```ts
import { publishMarkToGradebook } from '../Academic/service-gradebook-publish.js';

export async function publishMarking(
  markingId: string,
  schoolId: string,
  assessmentId: string,
  studentId?: string,
  comment?: string,
): Promise<IPaperMarking> {
  const marking = await PaperMarking.findOne({
    _id: new mongoose.Types.ObjectId(markingId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
  if (!marking) throw new NotFoundError('Marking not found');
  if (marking.status !== 'completed' && marking.status !== 'needs_review') {
    throw new BadRequestError('Only completed or needs_review markings can be published');
  }

  const resolvedStudentId = studentId ?? marking.studentId?.toString();
  if (!resolvedStudentId) {
    throw new BadRequestError(
      'Student ID is required. The marking record has no linked student; provide studentId in the request body.',
    );
  }

  const mark =
    marking.questions.reduce((s, q) => s + (q.marksAwarded ?? 0), 0);

  await publishMarkToGradebook({
    schoolId, assessmentId, studentId: resolvedStudentId,
    mark, comment: comment ?? `AI-marked paper for ${marking.studentName}`,
  });

  marking.status = 'published';
  await marking.save();
  return marking.toObject() as IPaperMarking;
}
```

- [ ] **Step 3: Controller + route**

Add controller method (mirror `publishGrade`):

```ts
static async publishMarking(req: Request, res: Response): Promise<void> {
  const schoolId = req.user?.schoolId;
  if (!schoolId) { res.status(400).json({ success: false, error: 'User must be assigned to a school' }); return; }
  const { publishMarking } = await import('./service-marking-queries.js');
  const { assessmentId, studentId, comment } = req.body as { assessmentId: string; studentId?: string; comment?: string };
  const marking = await publishMarking(req.params.id as string, schoolId, assessmentId, studentId, comment);
  res.json(apiResponse(true, marking, 'Marking published to gradebook'));
}
```

Add to routes.ts (after the existing `PUT /markings/:id`):

```ts
router.post(
  '/markings/:id/publish',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  validate(publishMarkingSchema),
  AIToolsController.publishMarking,
);
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/modules/AITools/
git commit -m "feat(marking): publishMarking writes to gradebook"
```

---

### Task T1.4: Bulk Essay Grading — Zod on Claude response

**Files:**
- Create: `src/modules/AITools/validation-grading.ts`
- Create: `src/modules/AITools/__tests__/service-grading-parse.test.ts`
- Modify: `src/jobs/ai-grading.job.ts`

- [ ] **Step 1: Zod schema**

```ts
// src/modules/AITools/validation-grading.ts
import { z } from 'zod/v4';

export const CriteriaScoreSchema = z.object({
  criterion: z.string().min(1),
  score: z.number().nonnegative(),
  maxScore: z.number().positive(),
  feedback: z.string().default(''),
});

export const GradingResponseSchema = z.object({
  totalMark: z.number().nonnegative(),
  maxMark: z.number().positive(),
  percentage: z.number().min(0).max(100),
  criteriaScores: z.array(CriteriaScoreSchema).min(1),
  overallFeedback: z.string().default(''),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
});

export type GradingResponse = z.infer<typeof GradingResponseSchema>;
```

- [ ] **Step 2: Tests**

```ts
// src/modules/AITools/__tests__/service-grading-parse.test.ts
import { describe, it, expect } from 'vitest';
import { GradingResponseSchema } from '../validation-grading.js';

const valid = {
  totalMark: 8,
  maxMark: 10,
  percentage: 80,
  criteriaScores: [{ criterion: 'Content', score: 4, maxScore: 5, feedback: '' }],
  overallFeedback: 'Good',
  strengths: ['a'],
  improvements: [],
};

describe('GradingResponseSchema', () => {
  it('accepts valid', () => {
    expect(GradingResponseSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects empty criteriaScores', () => {
    expect(GradingResponseSchema.safeParse({ ...valid, criteriaScores: [] }).success).toBe(false);
  });
  it('rejects percentage > 100', () => {
    expect(GradingResponseSchema.safeParse({ ...valid, percentage: 150 }).success).toBe(false);
  });
  it('rejects negative totalMark', () => {
    expect(GradingResponseSchema.safeParse({ ...valid, totalMark: -1 }).success).toBe(false);
  });
  it('defaults feedback/strengths/improvements', () => {
    const r = GradingResponseSchema.safeParse({
      totalMark: 5, maxMark: 10, percentage: 50,
      criteriaScores: [{ criterion: 'X', score: 5, maxScore: 10 }],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.overallFeedback).toBe('');
      expect(r.data.strengths).toEqual([]);
    }
  });
});
```

Run: `npx vitest run src/modules/AITools/__tests__/service-grading-parse.test.ts` — 5/5 pass.

- [ ] **Step 3: Apply in the job worker**

In `src/jobs/ai-grading.job.ts`, after the `generateJSONWithUsage` call (~line 78):

```ts
import { GradingResponseSchema } from '../modules/AITools/validation-grading.js';

// ...inside the worker handler, after getting `data`:
const parsed = GradingResponseSchema.safeParse(data);
if (!parsed.success) {
  const issue = parsed.error.issues[0];
  throw new Error(
    `AI grading response invalid at "${issue?.path.join('.') || '(root)'}": ${issue?.message ?? 'unknown'}`,
  );
}
job.aiResult = parsed.data;
job.status = 'completed';
await job.save();
```

The `throw` propagates to BullMQ which marks the job failed; on 3 retries exhausted, the existing handler resets the `GradingJob` to `'queued'` per the audit.

- [ ] **Step 4: Commit**

```bash
git add src/modules/AITools/validation-grading.ts src/modules/AITools/__tests__/service-grading-parse.test.ts src/jobs/ai-grading.job.ts
git commit -m "fix(grading): validate Claude response with Zod; fail job cleanly on malformed output"
```

---

### Task T1.5: Frontend — publish dialog + retry + session-safe bulk

**Files:**
- Create: `src/components/ai-tools/PublishToGradebookDialog.tsx`
- Modify: `src/hooks/useAITools.ts` — `publishGrade(jobId, assessmentId, comment?)`; new `retryGrade(jobId)`; new `loadIncompleteGradingJobs(assignmentId?)`
- Modify: `src/hooks/useTeacherMarking.ts` — `publishMarking(id, assessmentId, studentId?, comment?)` (replace the no-op toast)
- Modify: `src/components/ai-tools/SubmissionCard.tsx` — Publish button opens dialog; Retry button on failed
- Modify: `src/components/ai-tools/MarkingResults.tsx` — same publish flow
- Modify: `src/app/(dashboard)/teacher/ai-tools/grading/page.tsx` — on mount, call `loadIncompleteGradingJobs(assignmentId)` to restore state

- [ ] **Step 1: Build the shared dialog**

```tsx
// src/components/ai-tools/PublishToGradebookDialog.tsx
'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { unwrapList } from '@/lib/api-helpers';

interface AssessmentOption {
  id: string;
  name: string;
  totalMarks: number;
  term: number;
  subjectName?: string;
}

interface PublishToGradebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onConfirm: (assessmentId: string, comment?: string) => Promise<void>;
  submitting?: boolean;
}

export function PublishToGradebookDialog({
  open, onOpenChange, title, description, onConfirm, submitting = false,
}: PublishToGradebookDialogProps) {
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [assessmentId, setAssessmentId] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get('/academic/assessments')
      .then((res) => {
        if (cancelled) return;
        const rows = unwrapList<Record<string, unknown>>(res).map((r) => ({
          id: (r.id ?? r._id) as string,
          name: r.name as string,
          totalMarks: r.totalMarks as number,
          term: r.term as number,
          subjectName: (r.subjectId as { name?: string } | undefined)?.name,
        }));
        setAssessments(rows);
      })
      .catch(() => setAssessments([]))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  const handleSubmit = async () => {
    if (!assessmentId) return;
    await onConfirm(assessmentId, comment || undefined);
    onOpenChange(false);
    setAssessmentId('');
    setComment('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assessment">Assessment <span className="text-destructive">*</span></Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments…
              </div>
            ) : assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assessments found. Create one in Curriculum → Assessments first.
              </p>
            ) : (
              <Select onValueChange={(v: string) => setAssessmentId(v)}>
                <SelectTrigger id="assessment"><SelectValue placeholder="Pick an assessment" /></SelectTrigger>
                <SelectContent>
                  {assessments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — Term {a.term} · {a.totalMarks} marks{a.subjectName ? ` · ${a.subjectName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (optional)</Label>
            <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!assessmentId || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Hook updates**

In `src/hooks/useAITools.ts`:

```ts
const publishGrade = useCallback(async (jobId: string, assessmentId: string, comment?: string) => {
  try {
    const response = await apiClient.post(`/ai-tools/grade/${jobId}/publish`, { assessmentId, comment });
    const raw = unwrapResponse(response);
    const job = mapJob(raw as Record<string, unknown>);
    setGradingJobs(prev => prev.map(j => j.id === jobId ? job : j));
    toast.success('Grade published to gradebook');
    return job;
  } catch (err: unknown) {
    toast.error(extractApiError(err, 'Failed to publish grade'));
    return null;
  }
}, []);

const retryGrade = useCallback(async (jobId: string) => {
  try {
    const response = await apiClient.post(`/ai-tools/grade/${jobId}/retry`);
    const raw = unwrapResponse(response);
    const job = mapJob(raw as Record<string, unknown>);
    setGradingJobs(prev => prev.map(j => j.id === jobId ? job : j));
    toast.success('Grade re-queued');
    return job;
  } catch (err: unknown) {
    toast.error(extractApiError(err, 'Failed to retry grade'));
    return null;
  }
}, []);

const loadIncompleteGradingJobs = useCallback(async (assignmentId?: string) => {
  try {
    const response = await apiClient.get('/ai-tools/grade', {
      params: { assignmentId, status: 'queued,grading,completed,reviewed' },
    });
    const raw = unwrapResponse(response);
    const jobs = (Array.isArray(raw) ? raw : raw.jobs ?? []) as Record<string, unknown>[];
    const mapped = jobs.map(mapJob);
    setGradingJobs(mapped);
    return mapped;
  } catch (err: unknown) {
    toast.error(extractApiError(err, 'Failed to load grading jobs'));
    return [];
  }
}, []);
```

Add `retryGrade` and `loadIncompleteGradingJobs` to the returned object. (Note: backend may need to ensure `GET /ai-tools/grade` supports both `status=queued,grading,…` comma list and `assignmentId` filter — verify the existing `getGradingJobs` service shape.)

In `src/hooks/useTeacherMarking.ts`, replace the `publishMarking` no-op with a real backend call:

```ts
const publishMarking = useCallback(async (id: string, assessmentId: string, studentId?: string, comment?: string) => {
  try {
    const res = await apiClient.post(`/ai-tools/markings/${id}/publish`, { assessmentId, studentId, comment });
    const updated = unwrapResponse<PaperMarking>(res);
    setCurrentMarking(updated);
    setMarkings((prev) => prev.map((m) => (m.id === id ? updated : m)));
    toast.success('Marks published to gradebook');
    return updated;
  } catch (err: unknown) {
    console.error('Failed to publish marking', err);
    toast.error('Failed to publish marks.');
    return null;
  }
}, []);
```

- [ ] **Step 3: Wire the dialog into SubmissionCard + MarkingResults**

In `SubmissionCard.tsx`, replace the Publish button's `onClick` with a local dialog-open state. Add the `<PublishToGradebookDialog>` to the return JSX with `onConfirm={(assessmentId, comment) => publishGrade(job.id, assessmentId, comment)}`.

Also: add a `Retry` button when `job.status === 'failed'` (the current file may not handle this status — add a branch that shows a red badge + retry button). When clicked, call `retryGrade(job.id)` from the hook.

In `MarkingResults.tsx`, the existing Publish button (currently toasts "coming in a future release") becomes a `setPublishOpen(true)` trigger; attach the shared dialog. On confirm, call `publishMarking(marking.id, assessmentId, marking.studentId, comment)`.

- [ ] **Step 4: Session-safe bulk**

In `src/app/(dashboard)/teacher/ai-tools/grading/page.tsx`, when the teacher selects an assignment, call `loadIncompleteGradingJobs(assignmentId)` so that a refresh doesn't lose the bulk queue. Replace the `ungradedJobs` filter to source from `gradingJobs` (which is now hydrated from backend).

Also kick off polling for any returned job with status `queued` or `grading`.

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/ai-tools/PublishToGradebookDialog.tsx src/hooks/useAITools.ts src/hooks/useTeacherMarking.ts src/components/ai-tools/SubmissionCard.tsx src/components/ai-tools/MarkingResults.tsx 'src/app/(dashboard)/teacher/ai-tools/grading/page.tsx'
git commit -m "feat(ai-tools): publish dialog + retry + session-safe bulk grading"
```

---

## Phase T2 — Tier 2 safety + launch polish

### Task T2.1: Attendance — transactional bulk + edit audit

**Files:**
- Modify: `src/modules/Attendance/model.ts` — add `lastModifiedBy`, `lastModifiedAt`, embedded `editHistory`
- Modify: `src/modules/Attendance/service.ts` — `bulkRecord` uses `mongoose.startSession().withTransaction()`; on single-record edit, push to `editHistory`
- Create: `src/modules/Attendance/__tests__/service.bulk.test.ts`

- [ ] **Step 1: Schema updates**

Add to the Attendance interface and schema:

```ts
lastModifiedBy?: Types.ObjectId;
lastModifiedAt?: Date;
editHistory: Array<{ at: Date; by: Types.ObjectId; prevStatus: string }>;
```

Schema:

```ts
lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
lastModifiedAt: { type: Date },
editHistory: {
  type: [{
    at: { type: Date, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    prevStatus: { type: String, required: true },
  }],
  default: [],
},
```

- [ ] **Step 2: Transactional bulk**

Wrap `bulkRecord` in a transaction (refactor of the existing method):

```ts
const session = await mongoose.startSession();
try {
  await session.withTransaction(async () => {
    for (const record of records) {
      await Attendance.updateOne(
        { schoolId, classId: record.classId, studentId: record.studentId, date: record.date, period: record.period },
        { $set: { ...record, schoolId, recordedBy: teacherId } },
        { upsert: true, session },
      );
    }
  });
} finally {
  await session.endSession();
}
```

Transactions require MongoDB replica set; for dev single-node mongos this may not work. **If transactions aren't available locally, fall back to:** a per-record loop that collects `{ success, error }` per record and returns a structured `{ saved: [...], failed: [...] }` response so the frontend can surface partial failures. Pick whichever the environment supports; either is an improvement over the current silent-fail.

For the **single-record update** path (edit an existing attendance row), push to `editHistory` before overwriting:

```ts
const existing = await Attendance.findOne({ _id: id, schoolId, isDeleted: false });
if (!existing) throw new NotFoundError('Attendance record not found');
existing.editHistory.push({ at: new Date(), by: teacherId, prevStatus: existing.status });
existing.status = input.status;
existing.lastModifiedBy = teacherId;
existing.lastModifiedAt = new Date();
await existing.save();
```

- [ ] **Step 3: Tests**

```ts
// src/modules/Attendance/__tests__/service.bulk.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Attendance } from '../model.js';
import { AttendanceService } from '../service.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

describe('attendance bulkRecord', () => {
  it('persists all records on a clean bulk write', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const classId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const date = new Date();
    const students = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];

    await AttendanceService.bulkRecord(schoolId.toString(), teacherId.toString(), {
      classId: classId.toString(),
      date,
      period: 1,
      records: students.map((s) => ({ studentId: s.toString(), status: 'present' })),
    });

    const rows = await Attendance.find({ schoolId, classId, date }).lean();
    expect(rows.length).toBe(2);
  });

  it('preserves edit history on status change', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const classId = new mongoose.Types.ObjectId();
    const teacher1 = new mongoose.Types.ObjectId();
    const teacher2 = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const date = new Date();

    await AttendanceService.bulkRecord(schoolId.toString(), teacher1.toString(), {
      classId: classId.toString(),
      date,
      period: 1,
      records: [{ studentId: studentId.toString(), status: 'absent' }],
    });
    const original = await Attendance.findOne({ schoolId, studentId }).lean();
    expect(original?.status).toBe('absent');

    await AttendanceService.updateRecord(
      original!._id.toString(),
      schoolId.toString(),
      teacher2.toString(),
      { status: 'present' },
    );
    const updated = await Attendance.findOne({ schoolId, studentId }).lean();
    expect(updated?.status).toBe('present');
    expect(updated?.editHistory?.length).toBe(1);
    expect(updated?.editHistory?.[0].prevStatus).toBe('absent');
  });
});
```

Run: `npx vitest run src/modules/Attendance/__tests__/service.bulk.test.ts`

- [ ] **Step 4: Commit**

```bash
git add src/modules/Attendance/
git commit -m "feat(attendance): transactional bulk + edit audit trail"
```

---

### Task T2.2: Communication — wire real email delivery

**Files:**
- Modify: `src/modules/Communication/service.ts` — `sendBulkMessage` actually dispatches via `EmailService`; gates SMS/WhatsApp

This task needs investigation at execution time. The audit found that `EmailService`, `SmsService`, `PushService` are imported in `service.ts` but only used in `testChannel()`. Open those adapters in `src/services/` (or wherever) and confirm they exist and have a `.send()` method. If the adapter body is a stub (e.g. `console.log` only), a real provider (SendGrid/Resend/SES/Mailgun) needs configuring — out of scope for this task; instead surface a clear runtime error.

- [ ] **Step 1: Read `EmailService.send` implementation**

Find where `EmailService` is exported and inspect its body. Report back if it's a real provider or a stub.

If real — proceed to Step 2.
If stub — **scope this task to:** (a) throw a clear "Email service not configured" error when sendBulkMessage hits an un-configured channel; (b) UI surfaces the error to the teacher; (c) close the loop. This prevents the current silent-fail where `status: 'sent'` lies.

- [ ] **Step 2 (if adapter is real): Wire sendBulkMessage**

Refactor the body of `sendBulkMessage` so that after creating MessageLog rows with `status: 'queued'`, it iterates recipients and calls the right adapter per channel. Capture each result, update MessageLog per-row.

Rough shape:

```ts
for (const log of messageLogs) {
  let ok = false;
  let providerId: string | undefined;
  try {
    if (log.channel === 'email') {
      const result = await EmailService.send({ to: log.to, subject, body });
      providerId = result.messageId; ok = true;
    } else if (log.channel === 'sms') {
      if (!config.sms.enabled) throw new Error('SMS channel not configured');
      const result = await SmsService.send({ to: log.to, body });
      providerId = result.id; ok = true;
    } else if (log.channel === 'whatsapp') {
      if (!config.whatsapp.enabled) throw new Error('WhatsApp channel not configured');
      const result = await WhatsappService.send({ to: log.to, body });
      providerId = result.id; ok = true;
    }
  } catch (err) {
    log.errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }
  log.status = ok ? 'sent' : 'failed';
  log.providerId = providerId;
  log.deliveredAt = ok ? new Date() : undefined;
  await log.save();
}
const sentCount = messageLogs.filter((l) => l.status === 'sent').length;
bulkMessage.status = sentCount > 0 ? 'sent' : 'failed';
bulkMessage.delivered = sentCount;
await bulkMessage.save();
```

If `providerId` / `errorMessage` / `deliveredAt` aren't on the MessageLog model yet, add them.

- [ ] **Step 3 (if adapter is stub): Gate with clear error**

Replace the "mark as sent" block with:

```ts
throw new BadRequestError(
  'Message delivery is not yet configured for this school. Please contact support.',
);
```

Frontend already shows toast on error — this becomes visible to the teacher. Better than silent lie.

- [ ] **Step 4: Commit**

```bash
git add src/modules/Communication/
git commit -m "fix(communication): wire real delivery (or gate with clear error if adapter stub)"
```

---

### Task T2.3: Homework — mark cap validation

**Files:**
- Modify: `src/modules/Homework/validation.ts` — cross-field check on gradeSubmissionSchema

- [ ] **Step 1: Add the cross-field refinement**

Locate `gradeSubmissionSchema`. Currently it allows any non-negative `mark`. The check "mark <= totalMarks" can only be done at service time because `totalMarks` isn't in the request body — it's on the Homework record. So the fix lives in the service, not Zod.

In `src/modules/Homework/service.ts`, find `gradeSubmission`. Before saving the grade, fetch the parent Homework and compare:

```ts
const homework = await Homework.findOne({ _id: submission.homeworkId, schoolId, isDeleted: false }).lean();
if (!homework) throw new NotFoundError('Parent homework not found');
const totalMarks = (homework as unknown as { totalMarks?: number }).totalMarks ?? 0;
if (data.mark > totalMarks) {
  throw new BadRequestError(`Mark (${data.mark}) cannot exceed homework total (${totalMarks})`);
}
```

If the Homework model doesn't have a `totalMarks` field, skip this validation and note it in the report — the data model is the root issue.

- [ ] **Step 2: Commit**

```bash
git add src/modules/Homework/
git commit -m "fix(homework): cap grade mark at homework totalMarks"
```

---

## Phase T3 — End-to-end verification

### Task T3.1: Full automated run

- [ ] **Step 1:** `cd c:/Users/shaun/campusly-backend && npx vitest run` — expect green (163 baseline + 5 gradebook + 5 grading parse + 2 attendance = 175 total, approximately).

- [ ] **Step 2:** `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit` — clean.

- [ ] **Step 3:** `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit` — clean.

### Task T3.2: Manual smoke tests

- [ ] Teacher logs in, has at least one Assessment created in Curriculum → Assessments
- [ ] Navigate to AI Grading, submit a student essay, wait for AI, Review, Publish → pick the assessment in the dialog → confirm → gradebook shows the mark at the expected student+assessment row
- [ ] Navigate to AI Paper Marking, mark a scanned paper, hit Publish → same dialog → confirm → gradebook updated
- [ ] Publish again on the same job — gradebook mark overwrites (upsert), no duplicate row
- [ ] Retry a failed grading job — queue picks it up, status transitions queued → grading → completed
- [ ] Mark attendance for a class with Mark All Present — all records persist. Edit one student's status — edit history appears
- [ ] Send a bulk email — confirm delivery per-recipient status is reflected in the history view

---

## Out of scope / post-GA backlog

- Homework bulk assign to multiple classes
- Homework grade history array on submissions
- Attendance reason codes and parent notification on chronic absence
- Communication: BullMQ retry queue, message templates, scheduling
- Communication: SMS + WhatsApp provider wiring (depends on business decisions — Twilio account, WhatsApp Business API)
- Lesson Plans: content library seeding for HomeworkBuilder pickers
- Report Comment Generator: persistence + report template integration
- Rubric library / templates for Bulk Essay Grading
- Per-criterion override on grading reviews

## Self-review

- **Spec coverage:**
  - Tier 1 close: T1.1 (shared service) → T1.2 (Grading publish) → T1.3 (Marking publish) → T1.4 (Zod on Claude grading) → T1.5 (frontend publish dialog + retry + session-safe bulk).
  - Tier 2 safety: T2.1 (Attendance atomicity + audit), T2.2 (Communication delivery), T2.3 (Homework mark cap).
  - Homework schoolId breach already fixed on master (commit `095d74d`).

- **Placeholders:** none. Every code-producing step has concrete code.

- **Type consistency:** `PublishMarkInput`, `IMark`, `IAssessment`, `GradingResponse`, `IGradingJob`, `IPaperMarking`, `AssessmentOption` used consistently. The `publishGrade` signature `(jobId, schoolId, assessmentId, comment?)` and `publishMarking` signature `(markingId, schoolId, assessmentId, studentId?, comment?)` are the single source of truth propagating through controller/route/frontend hook.

- **Known risks:**
  - MongoDB transactions require a replica set; some dev environments run single-node. Task T2.1 has a documented fallback (structured per-record response) if transactions aren't available.
  - `EmailService` adapter may be a stub; T2.2 Step 1 triages this before committing to the full wiring path.
  - The backend `getGradingJobs` service may need a tweak to accept comma-separated `status` filter for T1.5's session-restore call.
  - Frontend `/academic/assessments` endpoint must exist and return assessments for the current school. If it doesn't, T1.5 Step 1 dialog will show empty — add it or point at the correct endpoint.
