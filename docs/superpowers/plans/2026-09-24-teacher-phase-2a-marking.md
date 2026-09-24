# Teacher Phase 2A: The Marking Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything a teacher owes marking is in one queue: test papers as well as homework. Each item opens the exact place to mark it. After a mark is issued, the teacher sees where it landed in the gradebook.

**Architecture:**
- **Backend:**
  - The marking-hub service gains paper items, built by a pure, tested function from the same joins the per-paper roster already does.
  - Issuing an AI marking returns a `gradebook` link and stops sharing one Assessment across classes.
  - Manual homework grades reach the gradebook the way auto-grades do.
- **Frontend:**
  - Queue items carry an `href`.
  - The paper page and the gradebook read their state from the URL, so links land exactly.
  - One toast offers "View in gradebook".

**Tech Stack:** Express 5, Mongoose 9, vitest and supertest (backend); Next.js 16.2.1, React 19, Tailwind 4 and vitest (frontend).

**Spec:**
- `docs/superpowers/specs/2026-09-24-teacher-portal-programme.md`, the Marking row in §4, and phase 2 in §6.
- Tracker items `a2`, `p0-05` and `p0-07`.
- Research notes are in `.superpowers/research/phase2-marking.md`. They are git-ignored, and the facts are repeated in the relevant tasks.

**Repos and branches:**
- Backend `C:\dev\campusly\.worktrees\backend-master`, branch `feat/teacher-phase-2a-marking` from `master`.
- Frontend `C:\dev\campusly\campusly-frontend`, branch `feat/teacher-phase-2a-marking` from `master`.

**Backend tests:**

```bash
set -a && . <scratchpad>/test-dev.env && set +a && LOG_LEVEL=silent npx vitest run <path>
```

`test-dev.env` points `MONGODB_TEST_URI` at `campusly-test` on the dev container, port 27047.

## Global Constraints

- **Backend queries:** every query filters on `schoolId` and `isDeleted: false`. `$match` stages use `new mongoose.Types.ObjectId(...)`.
- **Frontend project rules (CLAUDE.md):**
  - No `apiClient` in pages or components.
  - No `any`, and `catch (err: unknown)`.
  - Files stay at 350 lines or fewer.
  - Mobile first, with 44px touch targets.
  - Semantic colour tokens only. Every file this plan touches in a teacher surface joins `MIGRATED` in `tests/teacher-colour-guard.test.ts`.
- **Queue counts:** a "to mark" count counts learners, never tasks. Today, the nav badge and the Marking page all sum `pendingCount` (`submissionsToMark`).
- **Copy:** use sentence case. Use "test paper" for AssessmentPapers in UI copy and "homework" for homework.

## Review Focus

1. **A paper assigned to two classes.** Each class gets its own queue item, its own gradebook Assessment and its own "View in gradebook" link. The link must never point at the other class (Tasks 3 and 4).
2. **Handwritten papers before their due date.** They are not in the queue until they've been written (`dueAt` has passed, or there's no `dueAt`). Digital papers appear only for learners who have submitted (Task 1).
3. **Re-issuing a marking.** It keeps the same gradebook Mark, and the toast still links to it (Task 3).
4. **A deep link to a paper the teacher can't see, or a `classId` that isn't assigned.** The page falls back to its normal default tab and doesn't throw (Task 7).
5. **Gradebook URL params for a class the teacher doesn't have.** It ignores them and lands on its normal default (Task 8).

---

### Task 1: Paper items for the marking queue (backend, pure)

**Files:**
- Create: `src/modules/TeacherWorkbench/services/marking-queue.ts`
- Test: `src/modules/TeacherWorkbench/__tests__/marking-queue.test.ts`

**Interfaces:**
- Produces:

```ts
export type QueueMarkingStatus = 'processing' | 'completed' | 'needs_review' | 'failed' | 'published';
export type QueueSubmissionStatus = 'in_progress' | 'submitted' | 'graded' | 'published';
export interface PaperClassInput {
  paperId: string; title: string; subjectName: string; totalMarks: number;
  classId: string; className: string; mode: 'digital' | 'paper';
  dueAt: Date | null;
  students: Array<{ studentId: string; submissionStatus: QueueSubmissionStatus | null; markingStatus: QueueMarkingStatus | null }>;
}
export interface MarkingQueueItem {
  id: string; type: 'homework' | 'paper'; title: string; subjectName: string; className: string;
  dueDate: string; totalMarks: number; pendingCount: number; totalCount: number;
  priority: 'high' | 'medium' | 'low'; href: string; classId?: string; paperId?: string;
}
export function calcPriority(dueDate: Date | null | undefined, now: Date): 'high' | 'medium' | 'low';
export function paperQueueItems(inputs: PaperClassInput[], now: Date): MarkingQueueItem[];
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { calcPriority, paperQueueItems, type PaperClassInput } from '../services/marking-queue.js';

const now = new Date('2026-09-24T10:00:00+02:00');
const day = 24 * 60 * 60 * 1000;
const base = (over: Partial<PaperClassInput>): PaperClassInput => ({
  paperId: 'p1', title: 'Term 3 maths test', subjectName: 'Mathematics', totalMarks: 30,
  classId: 'c1', className: 'Grade 1 - A', mode: 'paper', dueAt: new Date(now.getTime() - day),
  students: [
    { studentId: 's1', submissionStatus: null, markingStatus: null },
    { studentId: 's2', submissionStatus: null, markingStatus: 'published' },
    { studentId: 's3', submissionStatus: null, markingStatus: 'completed' },
  ],
  ...over,
});

describe('paperQueueItems', () => {
  it('counts every learner without an issued mark once a handwritten paper has been written', () => {
    const [item] = paperQueueItems([base({})], now);
    expect(item).toMatchObject({
      id: 'paper:p1:c1', type: 'paper', pendingCount: 2, totalCount: 3, paperId: 'p1', classId: 'c1',
      href: '/teacher/papers/p1?tab=marking&classId=c1', priority: 'high',
    });
  });

  it('leaves a handwritten paper out until its due date', () => {
    expect(paperQueueItems([base({ dueAt: new Date(now.getTime() + 2 * day) })], now)).toEqual([]);
  });

  it('treats a handwritten paper with no due date as written', () => {
    expect(paperQueueItems([base({ dueAt: null })], now)[0].pendingCount).toBe(2);
  });

  it('counts only learners who submitted a digital paper and have no issued mark', () => {
    const [item] = paperQueueItems([base({
      mode: 'digital',
      students: [
        { studentId: 's1', submissionStatus: 'in_progress', markingStatus: null },
        { studentId: 's2', submissionStatus: 'submitted', markingStatus: null },
        { studentId: 's3', submissionStatus: 'graded', markingStatus: 'completed' },
        { studentId: 's4', submissionStatus: 'graded', markingStatus: 'published' },
      ],
    })], now);
    expect(item.pendingCount).toBe(2);
    expect(item.totalCount).toBe(4);
  });

  it('drops a class with nothing left to mark', () => {
    const done = base({ students: [{ studentId: 's1', submissionStatus: null, markingStatus: 'published' }] });
    expect(paperQueueItems([done], now)).toEqual([]);
  });

  it('gives each class of a shared paper its own item', () => {
    const items = paperQueueItems([base({}), base({ classId: 'c2', className: 'Grade 1 - B' })], now);
    expect(items.map((i) => i.id)).toEqual(['paper:p1:c1', 'paper:p1:c2']);
  });
});

describe('calcPriority', () => {
  it('is high inside a day (including overdue), medium inside three, else low', () => {
    expect(calcPriority(new Date(now.getTime() - day), now)).toBe('high');
    expect(calcPriority(new Date(now.getTime() + 2 * day), now)).toBe('medium');
    expect(calcPriority(new Date(now.getTime() + 5 * day), now)).toBe('low');
    expect(calcPriority(null, now)).toBe('low');
  });
});
```

- [ ] **Step 2: Run it.** Expected: FAIL (module missing).
- [ ] **Step 3: Implement**

```ts
// src/modules/TeacherWorkbench/services/marking-queue.ts
// Pure builders for the teacher's marking queue. The DB layer
// (aggregation.service.ts) gathers rows; these functions decide what is
// waiting and where each item opens.

export type QueueMarkingStatus = 'processing' | 'completed' | 'needs_review' | 'failed' | 'published';
export type QueueSubmissionStatus = 'in_progress' | 'submitted' | 'graded' | 'published';

export interface PaperClassInput {
  paperId: string;
  title: string;
  subjectName: string;
  totalMarks: number;
  classId: string;
  className: string;
  mode: 'digital' | 'paper';
  dueAt: Date | null;
  students: Array<{ studentId: string; submissionStatus: QueueSubmissionStatus | null; markingStatus: QueueMarkingStatus | null }>;
}

export interface MarkingQueueItem {
  id: string;
  type: 'homework' | 'paper';
  title: string;
  subjectName: string;
  className: string;
  dueDate: string;
  totalMarks: number;
  pendingCount: number;
  totalCount: number;
  priority: 'high' | 'medium' | 'low';
  href: string;
  classId?: string;
  paperId?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function calcPriority(dueDate: Date | null | undefined, now: Date): 'high' | 'medium' | 'low' {
  if (!dueDate) return 'low';
  const days = (dueDate.getTime() - now.getTime()) / DAY_MS;
  if (days < 1) return 'high';
  if (days < 3) return 'medium';
  return 'low';
}

const SUBMITTED: ReadonlySet<QueueSubmissionStatus> = new Set(['submitted', 'graded']);

function waiting(input: PaperClassInput, now: Date): number {
  if (input.mode === 'digital') {
    return input.students.filter((s) => s.submissionStatus !== null && SUBMITTED.has(s.submissionStatus) && s.markingStatus !== 'published').length;
  }
  const written = input.dueAt === null || input.dueAt.getTime() <= now.getTime();
  if (!written) return 0;
  return input.students.filter((s) => s.markingStatus !== 'published').length;
}

export function paperQueueItems(inputs: PaperClassInput[], now: Date): MarkingQueueItem[] {
  return inputs.flatMap((input) => {
    const pendingCount = waiting(input, now);
    if (pendingCount === 0) return [];
    return [{
      id: `paper:${input.paperId}:${input.classId}`,
      type: 'paper' as const,
      title: input.title,
      subjectName: input.subjectName,
      className: input.className,
      dueDate: input.dueAt ? input.dueAt.toISOString() : '',
      totalMarks: input.totalMarks,
      pendingCount,
      totalCount: input.students.length,
      priority: calcPriority(input.dueAt, now),
      href: `/teacher/papers/${input.paperId}?tab=marking&classId=${input.classId}`,
      classId: input.classId,
      paperId: input.paperId,
    }];
  });
}
```

- [ ] **Step 4: Run it.** Expected: PASS (7 tests).
- [ ] **Step 5: Commit:** `feat(marking): pure paper items for the marking queue`.

---

### Task 2: Wire papers and fixed homework counts into the pending endpoint (backend)

**Files:**
- Modify: `src/modules/TeacherWorkbench/services/aggregation.service.ts` (`getPendingMarking`; delete the local `calcPriority` and local `MarkingItem` in favour of Task 1's)
- Test: `src/modules/TeacherWorkbench/__tests__/pending-marking.test.ts` (integration, real Mongo)

**Interfaces:**
- Consumes `paperQueueItems`, `calcPriority` and `MarkingQueueItem` (Task 1).
- Produces: `GET /api/teacher-workbench/marking-hub/pending` returns `MarkingQueueItem[]`, sorted by `dueDate` ascending with undated items last.
  - **Homework items:**
    - `type: 'homework'`
    - `href: /teacher/homework/<id>`
    - `classId`
    - `pendingCount` = ungraded submissions
    - `totalCount` = all submissions for that homework (was: equal to pending)

- [ ] **Step 1: Write the failing integration test.** Build the fixtures and call the service directly, not over HTTP. Create:
  - a school
  - a class `Grade 1 - A` and two `Student` docs in it (Student requires `userId`, `admissionNumber` and `classId`; create minimal `User` docs first, following `src/modules/Department/__tests__/hod-review.test.ts`)
  - an `AssessmentPaper` owned by the teacher (`createdBy`), `assignments: [{ classId, mode: 'paper', dueAt: yesterday, assignedBy: teacherId, assignedAt: yesterday }]`
  - a `PaperMarking` with `status: 'published'` for student A and none for student B
  - a `Homework` for the class with 2 submissions, one graded (`mark: 5`) and one not

  Assert, via `AggregationService.getPendingMarking(teacherId, schoolId)`:
  - one paper item: `pendingCount: 1`, `totalCount: 2`, `href: /teacher/papers/<paperId>?tab=marking&classId=<classId>`
  - one homework item: `pendingCount: 1`, `totalCount: 2`, `href: /teacher/homework/<hwId>`
  - a paper belonging to another teacher, assigned to the same class, is not returned
- [ ] **Step 2: Run it.** Expected: FAIL. There is no paper item, and homework `totalCount` is 1.
- [ ] **Step 3: Implement** in `getPendingMarking`:

  1. **Homework:**
     - Keep the `Homework.find`.
     - Change the aggregation to group all non-deleted submissions per homework with `total: { $sum: 1 }` and `pending: { $sum: { $cond: [{ $eq: [{ $type: '$mark' }, 'missing'] }, 1, 0] } }`, and keep rows with `pending > 0`. Checking the field's type rather than its truthiness means a `mark` of 0 counts as graded.
     - Map each row to a `MarkingQueueItem` with `href` and `classId`.
  2. **Papers:**
     - `AssessmentPaper.find({ schoolId, isDeleted: false, 'assignments.0': { $exists: true }, $or: [{ createdBy: teacherOid }, { 'assignments.assignedBy': teacherOid }] }).select('title subjectId totalMarks assignments').populate('subjectId', 'name').lean()`.
     - In parallel, for the union of assignment class ids and paper ids:
       - `Class.find` (names)
       - `Student.find({ classId: { $in }, schoolId, isDeleted: false }).select('_id classId')`
       - `PaperSubmission.find({ paperId: { $in }, schoolId, isDeleted: false }).select('paperId studentId status')`
       - `PaperMarking.find({ paperId: { $in }, schoolId, isDeleted: false }).select('paperId studentId status createdAt')`
     - Keep the latest marking per `(paperId, studentId)`, the same rule as `service-paper-marking-workspace.ts`.
     - Build one `PaperClassInput` per `(paper, assignment)` and call `paperQueueItems(inputs, new Date())`.
  3. Concatenate the two lists and sort by `dueDate` (empty last).
- [ ] **Step 4: Run the test and the TeacherWorkbench suite.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(marking): test papers join the marking queue, with real totals and links`.

---

### Task 3: Issue returns where the mark landed; one Assessment per class (backend)

**Files:**
- Modify: `src/modules/Academic/service-gradebook-publish.ts` (`findOrCreateAssessmentForPaper`)
- Modify: `src/modules/AITools/service-marking-queries.ts` (`issueMarking`)
- Test: `src/modules/Academic/__tests__/paper-assessment-link.test.ts` (new, real Mongo)
- Test: `src/modules/AITools/__tests__/issueMarking.test.ts` (extend)

**Interfaces:**
- Produces:

```ts
export interface GradebookLink { assessmentId: string; classId: string; subjectId: string; term: number; academicYear: number }
// findOrCreateAssessmentForPaper now resolves { _id, totalMarks, classId, subjectId, term, academicYear }
// issueMarking resolves IPaperMarking & { gradebook: GradebookLink | null }
```

- [ ] **Step 1: Write the failing tests**
  - **`paper-assessment-link.test.ts`:** create a school, an `AssessmentPaper` (fields as in the hod-review fixture, plus `totalMarks: 30`) and two class ids. Call `findOrCreateAssessmentForPaper` for class A, then class B, then class A again.
    - Expect two distinct Assessment ids.
    - The third call returns class A's id.
    - Each returned `classId` equals the class asked for.
  - **`issueMarking.test.ts`:** add a case for an `assessment` paper.
    - The mocked `findOrCreateAssessmentForPaper` resolves `{ _id, totalMarks: 10, classId, subjectId, term: 3, academicYear: 2026 }`.
    - The mocked `AssessmentPaper.findOne(...).lean()` resolves `{ subjectId, title: 'Mock Paper' }`; adjust the existing mock so it supports both `.lean()` directly and `.select().lean()`.
    - Expect `result.gradebook` to equal `{ assessmentId: String(_id), classId, subjectId, term: 3, academicYear: 2026 }`.
    - Expect `publishMarkToGradebook` to be called once.
- [ ] **Step 2: Run both.** Expected: FAIL. Class B gets class A's Assessment, and `gradebook` is undefined.
- [ ] **Step 3: Implement**
  - **`findOrCreateAssessmentForPaper`:**
    - (a) Reuse the cached `paper.assessmentId` only when that Assessment's `classId` equals `input.classId`.
    - (b) and (c) stay as they are, but only write `paper.assessmentId` when it is empty, so the first class keeps the cache.
    - Return `{ _id, totalMarks, classId: String(a.classId), subjectId: String(a.subjectId), term: a.term, academicYear: a.academicYear }` from the Assessment doc.
  - **`issueMarking`:**
    - When `assessmentId` is passed explicitly, load that Assessment (`findOne({ _id, schoolId, isDeleted: false })`) to build the link.
    - Store the Mark returned by `publishMarkToGradebook` on `marking.gradebookEntryId`.
    - After saving, set the learner's `PaperSubmission` for this paper to `published`: `PaperSubmission.updateOne({ paperId: marking.paperId, studentId, schoolId, isDeleted: false }, { $set: { status: 'published' } })`.
    - Return `{ ...marking.toObject(), gradebook }`.
- [ ] **Step 4: Run both, then the AITools and Academic suites.** Expected: PASS.
- [ ] **Step 5: Commit:** `fix(marking): each class gets its own gradebook assessment; issue says where the mark landed`.

---

### Task 4: Manual homework marks reach the gradebook (backend)

**Files:**
- Modify: `src/modules/Homework/service.ts` (`gradeSubmission`)
- Test: `src/modules/Homework/__tests__/manual-grade-publish.test.ts` (new, real Mongo)

- [ ] **Step 1: Write the failing test.** Create a homework with `gradebookAutoPublish: true`, `totalMarks: 10` and one submission with no mark. Call `HomeworkService.gradeSubmission(subId, scope, 7, 'Good', teacherId)`, then expect a `Mark` with `mark: 7`, `total: 10` for that learner. Also: with `gradebookAutoPublish: false`, no Mark is written.
- [ ] **Step 2: Run it.** Expected: FAIL (no Mark).
- [ ] **Step 3: Implement.** After the `findOneAndUpdate`, if `parentHomework.gradebookAutoPublish`, call `publishHomeworkGrade({ _id, studentId, schoolId, mark, maxMarks: parentHomework.totalMarks }, parentHomework)` inside a try/catch that logs `'Manual publishHomeworkGrade failed'` and doesn't fail the grade. This mirrors `service-homework-submit.ts` L223–232.
- [ ] **Step 4: Run it and the Homework suite.** Expected: PASS.
- [ ] **Step 5: Commit:** `fix(homework): marks entered by hand reach the gradebook like auto-marks`.

---

### Task 5: Demo data for the loop (backend seed)

**Files:**
- Modify: `src/scripts/seed-teacher-demo.ts`
- Modify: `src/scripts/teacher-demo/plan.ts`
- Test: `src/scripts/teacher-demo/__tests__/plan.test.ts`

**Interfaces:**
- Produces `demoPaperAssignment(now: Date): { mode: 'paper'; dueAt: Date; releaseAt: Date; assignedAt: Date }`: due yesterday at 12:00 local, released and assigned three days ago.

- [ ] **Step 1: Write the failing test.** `demoPaperAssignment(new Date(2026, 8, 24, 10))` gives `dueAt` 2026-09-23 12:00 local, and `assignedAt` is before `dueAt`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement it, and in the seed add `seedPaperMarking(ctx)`:**
  1. Take the first demo paper (the one `seedPapers` upserts, by title) and set `assignments` to one entry for the homeroom class, built from `demoPaperAssignment(new Date())` with `assignedBy: teacherId`. The update is idempotent: replace the entry for that class.
  2. For the first learner in the class, upsert a `PaperMarking` keyed by `{ paperId, studentId }` with `status: 'completed'` (not issued) and `paperType: 'assessment'`, plus `classId`, `teacherId` and 3 questions whose `marksAwarded` sum to about 70% of `maxMarks`. The teacher can then review and issue without an AI key.
  3. Leave the other learners unmarked.
- [ ] **Step 4: Run the plan test, then `npm run seed:teacher-demo` twice** (idempotent). Check with `curl` as Thandi that the pending endpoint returns one `paper` item.
- [ ] **Step 5: Commit:** `feat(seed): a written test paper waiting to be marked, with one AI marking ready to issue`.

---

### Task 6: Queue items open the exact place (frontend)

**Files:**
- Modify: `src/types/teacher-workbench.ts` (`MarkingItemType` adds `'paper'`)
- Modify: `src/types/teacher-workbench-views.ts` (`MarkingItem` adds `href?: string; classId?: string; paperId?: string`)
- Create: `src/lib/marking-queue.ts`
- Test: `tests/marking-queue.test.ts`
- Modify: `src/app/(dashboard)/teacher/workbench/marking-hub/page.tsx`
- Modify: `src/components/workbench/marking-hub/MarkingItemCard.tsx`
- Modify: `src/components/workbench/marking-hub/MarkingFilters.tsx`

**Interfaces:**
- Produces:
  - `markingItemHref(item: Pick<MarkingItem, 'type' | 'id' | 'href' | 'paperId' | 'classId'>): string`
  - `markingTypeLabel(type: MarkingItemType): string` (`'Homework' | 'Test paper' | 'Assessment' | 'AI marking'`)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { markingItemHref, markingTypeLabel } from '../src/lib/marking-queue';

describe('markingItemHref', () => {
  it('trusts the server link', () => {
    expect(markingItemHref({ type: 'paper', id: 'paper:p1:c1', href: '/teacher/papers/p1?tab=marking&classId=c1' }))
      .toBe('/teacher/papers/p1?tab=marking&classId=c1');
  });
  it('builds a paper link when an older server sends none', () => {
    expect(markingItemHref({ type: 'paper', id: 'x', paperId: 'p1', classId: 'c1' })).toBe('/teacher/papers/p1?tab=marking&classId=c1');
  });
  it('opens homework submissions', () => {
    expect(markingItemHref({ type: 'homework', id: 'h1' })).toBe('/teacher/homework/h1');
  });
  it('falls back to AI marking for anything else', () => {
    expect(markingItemHref({ type: 'ai_grading', id: 'a1' })).toBe('/teacher/curriculum/mark-papers');
  });
});

describe('markingTypeLabel', () => {
  it('names test papers plainly', () => {
    expect(markingTypeLabel('paper')).toBe('Test paper');
    expect(markingTypeLabel('homework')).toBe('Homework');
  });
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement the helper.** Then:
  - **Hub page:** `handleCardClick` becomes `router.push(markingItemHref(item))`.
  - **`MarkingItemCard`:** the badge text uses `markingTypeLabel`, and badge colours move to tokens: paper → `bg-accent-soft text-accent-foreground`, homework → `bg-info-soft text-info`, others → `bg-muted text-muted-foreground`.
  - **`MarkingFilters`:** add `<SelectItem value="paper">Test papers</SelectItem>`.
  - Add the three touched component and page files to `MIGRATED`.
- [ ] **Step 4: Run** `npx vitest run tests/marking-queue.test.ts tests/teacher-colour-guard.test.ts`, then `npx tsc --noEmit -p .`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(marking): queue items open the exact paper class or homework`.

---

### Task 7: The paper page opens on the tab and class in the link (frontend)

**Files:**
- Create: `src/lib/paper-tabs.ts`
- Test: `tests/paper-tabs.test.ts`
- Modify: `src/app/(dashboard)/teacher/papers/[id]/page.tsx`
- Modify: `src/components/papers/PaperDetailMarkingTab.tsx` (prop `focusClassId?: string`)

**Interfaces:**
- Produces `type PaperTab = 'paper' | 'memo' | 'assignments' | 'marking'` and `paperTabFromParam(value: string | null): PaperTab`. Unknown or null values give `'paper'`.

- [ ] **Step 1: Write the failing test.** Cover each valid value, `null`, `'MARKING'` (case-sensitive, so it gives `'paper'`), and `'<script>'` (gives `'paper'`).
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Page:** read `useSearchParams()`. The Tabs become controlled: `value={tab}`, where `onValueChange` sets state and calls `router.replace` with `?tab=<v>` (keeping `classId` only for marking). Pass `focusClassId={tab === 'marking' ? searchParams.get('classId') ?? undefined : undefined}` to the Marking tab.
  - **`PaperDetailMarkingTab`:** each class card gets `id={`class-${classId}`}`. A `useEffect` that runs when the roster loads and `focusClassId` matches does `document.getElementById(...)?.scrollIntoView({ block: 'start', behavior: 'smooth' })`, and that card gets `ring-2 ring-primary/40`. An unknown `focusClassId` does nothing.
  - Keep both files at 350 lines or fewer. If the Marking tab crosses the limit, extract its per-class card into `PaperMarkingClassCard.tsx`.
- [ ] **Step 4: Run the tests and tsc.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(papers): the paper page opens on the tab and class a link names`.

---

### Task 8: The gradebook opens where a link points (frontend)

**Files:**
- Create: `src/lib/gradebook-link.ts`
- Test: `tests/gradebook-link.test.ts`
- Modify: `src/hooks/useTeacherGrades.ts` (accepts `initial?: GradebookParams`)
- Modify: `src/app/(dashboard)/teacher/grades/page.tsx` (reads params; tabs controlled; `?tab=capture` opens "Enter marks")

**Interfaces:**
- Produces:

```ts
export interface GradebookLink { assessmentId: string; classId: string; subjectId: string; term: number; academicYear: number }
export interface GradebookParams { classId?: string; subjectId?: string; term?: string; assessmentId?: string; tab?: 'overview' | 'capture' }
export function gradebookHref(link: GradebookLink): string; // /teacher/grades?classId=..&subjectId=..&term=3&assessmentId=..&tab=capture
export function readGradebookParams(params: { get(name: string): string | null }): GradebookParams;
```

- [ ] **Step 1: Write the failing test.**
  - `gradebookHref` round-trips through `readGradebookParams(new URLSearchParams(href.split('?')[1]))`.
  - `term` accepts only `'1'`–`'4'` and `'year'`.
  - `tab` accepts only `overview` or `capture`.
  - An empty id gives `undefined`.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **`useTeacherGrades(initial)`:**
    - Keep a `useRef(initial)`.
    - The class auto-select prefers `initial.classId` when it's in the list, otherwise the first class.
    - The class-change reset sets the subject to `initial.subjectId` when the class matches the initial class, otherwise `''`.
    - The assessment auto-select prefers `initial.assessmentId` when it's in the loaded list.
    - The term starts at `initial.term ?? 'year'`.
    - Clear the ref's ids once they've been applied, so a later manual class change behaves as before.
  - **Page:** `const params = readGradebookParams(useSearchParams())`, then pass it to the hook. The Tabs become controlled, starting at `params.tab === 'capture' ? 'capture' : 'overview'` (rename the "Enter marks" tab value to `capture` if it isn't already).
- [ ] **Step 4: Run the tests and tsc.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(gradebook): open on the class, subject, term and assessment in the link`.

---

### Task 9: "Saved to the gradebook", with a way there (frontend)

**Files:**
- Modify: `src/types/papers.ts` or the `PaperMarking` type (adds `gradebook?: GradebookLink | null`)
- Modify: `src/hooks/useTeacherMarking.ts` (`issueMarking`)
- Create: `src/lib/issue-toast.ts`
- Test: `tests/issue-toast.test.ts`

**Interfaces:**
- Produces:

```ts
issuedMessage(marking: { studentName?: string; gradebook?: GradebookLink | null }): { title: string; description?: string; href: string | null }
```

  - With a link: title `Mark saved to the gradebook`, description `<studentName>'s mark is in the gradebook.`, and `href` from `gradebookHref`.
  - Without one: title `Marking issued`, and `href` null.

- [ ] **Step 1: Write the failing test** for both branches.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.** In `issueMarking`, replace `toast.success('Marking issued')` with:

```ts
const msg = issuedMessage(updated);
toast.success(msg.title, {
  description: msg.description,
  action: msg.href ? { label: 'View in gradebook', onClick: () => router.push(msg.href as string) } : undefined,
});
```

  Get `router` from `useRouter()` in the hook. All three issue paths use this hook (mark-papers page, `PaperMarkingReviewDialog`, and history), so they all get the confirmation.
- [ ] **Step 4: Run the tests and tsc.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(marking): issuing a mark says it's in the gradebook and links there`.

---

### Task 10: Mark a homework submission by hand (frontend)

**Files:**
- Modify: `src/components/homework/HomeworkSubmissionsTable.tsx` (a "Mark" action on ungraded rows)
- Modify: `src/app/(dashboard)/teacher/homework/[id]/page.tsx` (passes `onGrade` from `useTeacherHomeworkDetail().gradeSubmission`)
- Use: `src/components/homework/GradingInterface.tsx` (already built, unused)
- Test: `tests/homework-grading.test.ts` for a new pure `canGradeSubmission(sub): boolean` in `src/lib/homework-grading.ts`. It is true when `mark` is null or undefined and the row isn't auto-grading (`gradingStatus !== 'pending'`), or when the teacher is overriding a failed auto-grade (`gradingStatus === 'failed'`).

- [ ] **Step 1: Write the failing test** for `canGradeSubmission`: ungraded, graded, auto-grade pending, and auto-grade failed.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Rows where `canGradeSubmission` is true show a `Mark` button (`min-h-11 sm:min-h-8`).
  - It opens a Dialog (flex-col scroll pattern) containing `GradingInterface`, wired to `gradeSubmission`.
  - After saving: close the dialog, refetch the submissions, and toast `Mark saved`.
  - The table still has no `apiClient`; the hook owns the call.
  - Add both files to `MIGRATED` if they're on raw colours (migrate them by the phase 1B mapping).
- [ ] **Step 4: Run the tests, tsc and the colour guard.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(homework): mark a submission by hand from the homework page`.

---

### Task 11: Verify, review, ship

- [ ] **Step 1:** Run both repos' full suites, `npx next typegen && npx tsc --noEmit -p .`, and eslint on the changed files.
- [ ] **Step 2: Loop tour as Thandi** (after `npm run seed:teacher-demo`), at 1440 light and 390 light:
  1. On Marking, the test paper item shows "Test paper" and its count.
  2. Open it. The paper page opens on the Marking tab with Grade 1 - A highlighted.
  3. Review the ready marking and issue it. A toast appears with "View in gradebook".
  4. That link opens the gradebook on Grade 1 - A · Mathematics · Term 3 · the paper's assessment, on "Enter marks", with the learner's mark present.
  5. Homework item, then Mark on a submission, then save. The count drops on Marking, Today and the nav badge.
- [ ] **Step 3:** Whole-branch review of both repos (fresh reviewer, most capable model), then one fix pass, test first.
- [ ] **Step 4:** Push both branches under the compromise protocol, open PRs, wait for Vercel (frontend), merge, reseed and update the tracker (`a2`, `p0-05`, `p0-07`).
