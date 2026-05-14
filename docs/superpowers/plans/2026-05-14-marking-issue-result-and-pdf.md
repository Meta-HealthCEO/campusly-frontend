# Marking — Issue Result, PDF Preview & Student Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine gradebook publish with student-visible per-question review into a single "Issue Result" action; add lightbox preview + server-rendered PDF download for uploaded marking images.

**Architecture:** Three new fields on `PaperMarking` (`issuedToStudent`, `issuedAt`, `issuedBy`) act as the student-visibility fact, independent of the existing `status` field. The existing `POST /markings/:id/publish` is renamed to `/issue` and additionally fires an in-app notification on the first issue. New endpoints expose marking detail / images / PDF to the owning student. A shared `MarkingQuestionCard` and `MarkingPagesLightbox` serve both teacher and student review.

**Tech Stack:** Backend: Express 5, Mongoose, vitest, pdfkit (already wired in `src/common/pdf/`). Frontend: Next.js 16 App Router, React 19, axios, Zustand, TipTap (not used in this feature), Sonner toasts. Both repos commit directly to `master` per project guidance.

**Reference spec:** [docs/superpowers/specs/2026-05-14-marking-issue-result-and-pdf-design.md](../specs/2026-05-14-marking-issue-result-and-pdf-design.md)

**Working directories:**
- Backend: `c:/Users/shaun/campusly-backend`
- Frontend: `c:/Users/shaun/campusly-frontend`

---

## File Map

### Backend

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/modules/AITools/model-marking.ts` | Add `issuedToStudent`, `issuedAt`, `issuedBy` to schema + interface; add compound index `{studentId, issuedToStudent}`. |
| Modify | `src/modules/AITools/service-marking-queries.ts` | Rename `publishMarking` → `issueMarking`; add `issued*` field writes; fire notification on first issue. |
| Create | `src/modules/AITools/service-student-ownership.ts` | `resolveStudentForUser(userId)` — JWT userId → studentId + schoolId. |
| Create | `src/modules/AITools/service-marking-pdf.ts` | `buildMarkingPdf(marking)` — stitch images into PDF buffer via `createDocument()` / `finalise()`. |
| Create | `src/modules/AITools/controller-student-markings.ts` | Student-facing controller handlers (list, detail, image). |
| Modify | `src/modules/AITools/controller.ts` | Rename `publishMarking` handler → `issueMarking`; add `getMarkingPdf`, `getMarkingImage` (shared by teacher and student). |
| Modify | `src/modules/AITools/routes.ts` | Replace `/markings/:id/publish` with `/markings/:id/issue`; add `/markings/:id/pdf`, `/markings/:id/image/:filename`, `/students/me/markings`, `/students/me/markings/:id`. |
| Modify | `src/app.ts` | Exclude `/uploads/markings/` and `/uploads/markings-batch/` from the static handler (route to gated endpoint instead). |
| Modify | `src/modules/AITools/validation.ts` | Rename `publishMarkingSchema` → `issueMarkingSchema` (same shape). |
| Modify | `src/modules/QuestionBank/service-submissions-student.ts` | Down-grade `graded`/`published` submissionStatus to `submitted` when marking is not yet issued. |
| Create | `src/modules/AITools/__tests__/issueMarking.test.ts` | issue endpoint: first issue sets fields + notifies; re-issue does not re-notify; schoolId scoping. |
| Create | `src/modules/AITools/__tests__/student-markings.test.ts` | Student endpoints: own-only access; unissued marking returns 404. |
| Create | `src/modules/AITools/__tests__/marking-pdf.test.ts` | PDF generation: returns non-empty buffer; 404 when no images. |

### Frontend

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/hooks/useTeacherMarking.ts` | Rename `publishMarking` → `issueMarking` (route `/issue`); add `downloadMarkingPdf(id)`. |
| Create | `src/components/ai-tools/MarkingPagesLightbox.tsx` | Full-screen carousel: prev/next, arrow keys, touch swipe, page indicator. |
| Create | `src/components/ai-tools/MarkingQuestionCard.tsx` | Shared per-question card; `editable` + `rationaleLabel` props. |
| Rename + modify | `src/components/ai-tools/PublishToGradebookDialog.tsx` → `IssueResultDialog.tsx` | Update copy + confirm label. |
| Modify | `src/components/ai-tools/MarkingResults.tsx` | Thumbnails → lightbox + Download PDF + Issue/Re-issue button. Use `MarkingQuestionCard`. |
| Create | `src/hooks/useStudentMarking.ts` | `getMarkingByPaper`, `getMarking`, `downloadMarkingPdf`. |
| Create | `src/components/student/StudentMarkingReview.tsx` | Read-only review using shared card + lightbox. |
| Create | `src/components/student/StudentTestTakeView.tsx` | Test-taking JSX extracted from page.tsx so `useStudentTestTake` only mounts when needed. |
| Modify | `src/app/(dashboard)/student/tests/[paperId]/page.tsx` | Thin three-state resolver: issued / submitted-awaiting / not-taken. |
| Modify | `src/app/(dashboard)/student/tests/page.tsx` | Enable CTA for `graded` / `published`; label "View result". |

---

## Phase 1 — Backend foundation

### Task 1: Add issue fields + compound index to `PaperMarking`

**Files:**
- Modify: `src/modules/AITools/model-marking.ts`

- [ ] **Step 1: Add fields to `IPaperMarking` interface**

In [src/modules/AITools/model-marking.ts](../../../campusly-backend/src/modules/AITools/model-marking.ts), inside the `IPaperMarking` interface (after `batchId?: Types.ObjectId | null;` on line 43), add:

```ts
issuedToStudent: boolean;
issuedAt?: Date;
issuedBy?: Types.ObjectId;
```

- [ ] **Step 2: Add fields to the Mongoose schema**

Inside the `paperMarkingSchema` definition (after `batchId: { ... }` on line 99), add:

```ts
issuedToStudent: { type: Boolean, default: false },
issuedAt: { type: Date },
issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
```

- [ ] **Step 3: Add compound index for the hot student query**

After the existing indexes (after line 107), add:

```ts
paperMarkingSchema.index({ studentId: 1, issuedToStudent: 1 });
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors mentioning `model-marking.ts`.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/model-marking.ts
git commit -m "feat(marking): add issuedToStudent/issuedAt/issuedBy to PaperMarking"
```

---

### Task 2: Student ownership resolver

**Files:**
- Create: `src/modules/AITools/service-student-ownership.ts`

- [ ] **Step 1: Create the resolver**

Write `c:/Users/shaun/campusly-backend/src/modules/AITools/service-student-ownership.ts`:

```ts
import mongoose from 'mongoose';
import { Student } from '../Student/model.js';
import { NotFoundError } from '../../common/errors.js';

export interface ResolvedStudent {
  studentId: string;
  schoolId: string;
}

/**
 * JWT carries the User._id, not the Student._id. Student-facing endpoints
 * use this resolver to convert userId → studentId before scoping marking
 * queries.
 */
export async function resolveStudentForUser(userId: string): Promise<ResolvedStudent> {
  const student = await Student.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    isDeleted: false,
  })
    .select('_id schoolId')
    .lean();
  if (!student) throw new NotFoundError('Student record not found for user');
  return {
    studentId: String(student._id),
    schoolId: String(student.schoolId),
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/service-student-ownership.ts
git commit -m "feat(marking): student ownership resolver for /students/me/* routes"
```

---

## Phase 2 — Rename `publishMarking` to `issueMarking`

### Task 3: Update validation schema

**Files:**
- Modify: `src/modules/AITools/validation.ts`

- [ ] **Step 1: Find the existing schema**

Run: `cd c:/Users/shaun/campusly-backend && grep -n "publishMarkingSchema" src/modules/AITools/validation.ts`

Note the line numbers — you'll rename in place.

- [ ] **Step 2: Rename schema**

Edit `src/modules/AITools/validation.ts`: rename the exported `publishMarkingSchema` to `issueMarkingSchema`. Body shape is unchanged (`assessmentId?`, `studentId?`, `comment?`).

- [ ] **Step 3: Update routes.ts import**

Edit `src/modules/AITools/routes.ts` (line 21 in current state): change `publishMarkingSchema` to `issueMarkingSchema`.

- [ ] **Step 4: Verify it compiles**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors. If a usage was missed, fix it.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/validation.ts src/modules/AITools/routes.ts
git commit -m "refactor(marking): rename publishMarkingSchema -> issueMarkingSchema"
```

---

### Task 4: Rewrite `publishMarking` service as `issueMarking`

**Files:**
- Modify: `src/modules/AITools/service-marking-queries.ts`

- [ ] **Step 1: Replace the `publishMarking` function**

In [src/modules/AITools/service-marking-queries.ts](../../../campusly-backend/src/modules/AITools/service-marking-queries.ts), find `export async function publishMarking(` (line 89 in current state) and replace the entire function (down to and including its closing brace) with:

```ts
export async function issueMarking(
  markingId: string,
  schoolId: string,
  teacherUserId: string,
  assessmentId: string | undefined,
  studentId?: string,
  comment?: string,
): Promise<IPaperMarking> {
  const marking = await PaperMarking.findOne({
    _id: new mongoose.Types.ObjectId(markingId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
  if (!marking) throw new NotFoundError('Marking not found');
  if (
    marking.status !== 'completed' &&
    marking.status !== 'needs_review' &&
    marking.status !== 'published'
  ) {
    throw new BadRequestError('Only completed, needs_review, or published markings can be issued');
  }

  const resolvedStudentId = studentId ?? marking.studentId?.toString();
  if (!resolvedStudentId) {
    throw new BadRequestError(
      'Student ID is required. The marking record has no linked student; provide studentId in the request body.',
    );
  }

  // Lazy auto-link: if no assessmentId was supplied, find or create one
  // from the paper's metadata. Only supported for assessment-bank papers
  // (paperType === 'assessment'); generated papers must pass an explicit
  // assessmentId because they aren't backed by an AssessmentPaper record.
  let resolvedAssessmentId = assessmentId;
  if (!resolvedAssessmentId) {
    if (marking.paperType !== 'assessment') {
      throw new BadRequestError(
        'Cannot auto-link Assessment for generated papers. Pass assessmentId explicitly.',
      );
    }
    if (!marking.classId) {
      throw new BadRequestError(
        'Cannot auto-link Assessment: marking has no classId. Pass assessmentId explicitly.',
      );
    }
    const paper = await AssessmentPaper.findOne({
      _id: marking.paperId,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isDeleted: false,
    }).lean();
    if (!paper) throw new NotFoundError('Linked paper not found');
    const linked = await findOrCreateAssessmentForPaper({
      paperId: String(marking.paperId),
      schoolId: String(marking.schoolId),
      classId: String(marking.classId),
      subjectId: String(paper.subjectId),
    });
    resolvedAssessmentId = String(linked._id);
  }

  const totalAwarded = marking.questions.reduce((s, q) => s + (q.marksAwarded ?? 0), 0);

  await publishMarkToGradebook({
    schoolId,
    assessmentId: resolvedAssessmentId,
    studentId: resolvedStudentId,
    mark: totalAwarded,
    comment: comment ?? `AI-marked paper for ${marking.studentName}`,
  });

  const wasIssuedBefore = marking.issuedToStudent === true;
  marking.status = 'published';
  marking.issuedToStudent = true;
  marking.issuedBy = new mongoose.Types.ObjectId(teacherUserId);
  if (!wasIssuedBefore) marking.issuedAt = new Date();
  await marking.save();

  if (!wasIssuedBefore) {
    // Fire-and-forget notification dispatch — failure should not roll back the
    // gradebook publish. The student can still see the marking via their tests
    // page; the notification is a nice-to-have nudge.
    void dispatchIssueNotification(marking, resolvedStudentId).catch((err) => {
      console.error('Failed to dispatch issue notification', err);
    });
  }

  return marking.toObject() as IPaperMarking;
}

async function dispatchIssueNotification(
  marking: IPaperMarking,
  studentId: string,
): Promise<void> {
  const student = await Student.findOne({ _id: studentId, isDeleted: false })
    .select('userId')
    .lean();
  if (!student?.userId) return;
  const paper = await AssessmentPaper.findOne({ _id: marking.paperId, isDeleted: false })
    .select('title')
    .lean();
  const title = paper?.title ?? marking.studentName;
  await NotificationService.create({
    recipientId: String(student.userId),
    schoolId: String(marking.schoolId),
    type: 'marking_result_issued',
    title: `${title} result available`,
    message: 'Your marked paper is ready to review.',
    data: { link: `/student/tests/${String(marking.paperId)}` },
  });
}
```

- [ ] **Step 2: Add the new imports at top of the file**

At the top of `service-marking-queries.ts` (alongside the existing imports), ensure these are imported:

```ts
import { Student } from '../Student/model.js';
import { NotificationService } from '../Notification/service.js';
```

(If `Student` or `NotificationService` is already imported, skip.)

- [ ] **Step 3: Verify compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: errors at every other site that still calls `publishMarking` — fix those in Task 5. If there are *other* errors in this file, fix them in this task.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/service-marking-queries.ts
git commit -m "refactor(marking): rename publishMarking->issueMarking, fire notification on first issue"
```

---

### Task 5: Update controller + route to `issueMarking`

**Files:**
- Modify: `src/modules/AITools/controller.ts`
- Modify: `src/modules/AITools/routes.ts`

- [ ] **Step 1: Update controller import + handler**

In [src/modules/AITools/controller.ts](../../../campusly-backend/src/modules/AITools/controller.ts):

Change the import on line 11 from `publishMarking,` to `issueMarking,`.

Replace the `publishMarking` static method (around line 219) with:

```ts
static async issueMarking(req: Request, res: Response): Promise<void> {
  const schoolId = req.user?.schoolId;
  if (!schoolId) {
    res.status(400).json({ success: false, error: 'User must be assigned to a school' });
    return;
  }
  const teacherUserId = getUser(req).id;
  const { assessmentId, studentId, comment } = req.body as {
    assessmentId?: string;
    studentId?: string;
    comment?: string;
  };
  const marking = await issueMarking(req.params.id as string, schoolId, teacherUserId, assessmentId, studentId, comment);
  res.json(apiResponse(true, marking, 'Marking issued'));
}
```

- [ ] **Step 2: Update routes**

In [src/modules/AITools/routes.ts](../../../campusly-backend/src/modules/AITools/routes.ts), find the block starting at line 187 (`// POST /markings/:id/publish ...`). Replace it entirely with:

```ts
// POST /markings/:id/issue — issue marking to student + publish mark to gradebook
router.post(
  '/markings/:id/issue',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  validate(issueMarkingSchema),
  AIToolsController.issueMarking,
);
```

- [ ] **Step 3: Verify compile + tests still load**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors.

Run: `cd c:/Users/shaun/campusly-backend && npm test -- --run service-marking`
Expected: existing tests pass (no behaviour change to the listed/getById/update flow).

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/controller.ts src/modules/AITools/routes.ts
git commit -m "feat(marking): route /markings/:id/issue replaces /publish"
```

---

### Task 6: Issue marking test — first issue notifies, re-issue silent

**Files:**
- Create: `src/modules/AITools/__tests__/issueMarking.test.ts`

- [ ] **Step 1: Write the failing test**

Write `c:/Users/shaun/campusly-backend/src/modules/AITools/__tests__/issueMarking.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { PaperMarking } from '../model-marking.js';
import { issueMarking } from '../service-marking-queries.js';
import { NotificationService } from '../../Notification/service.js';

vi.mock('../../Notification/service.js', () => ({
  NotificationService: { create: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../Academic/service-gradebook-publish.js', () => ({
  publishMarkToGradebook: vi.fn().mockResolvedValue(undefined),
}));

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

describe('issueMarking', () => {
  it('first issue sets fields and notifies; re-issue does not re-notify', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const assessmentId = new mongoose.Types.ObjectId();

    const m = await PaperMarking.create({
      schoolId, teacherId, paperId: new mongoose.Types.ObjectId(),
      paperType: 'generated', studentName: 'A', studentId,
      imageCount: 0, totalMarks: 5, maxMarks: 10, percentage: 50,
      questions: [{ questionNumber: '1', studentAnswer: 'x', correctAnswer: 'x', marksAwarded: 5, maxMarks: 10, feedback: '' }],
      status: 'completed',
    });

    const notifySpy = vi.mocked(NotificationService.create);
    notifySpy.mockClear();

    await issueMarking(String(m._id), String(schoolId), String(teacherId), String(assessmentId));
    // give the fire-and-forget notification a tick to run
    await new Promise((r) => setTimeout(r, 10));

    const after1 = await PaperMarking.findById(m._id).lean();
    expect(after1?.issuedToStudent).toBe(true);
    expect(after1?.issuedAt).toBeInstanceOf(Date);
    expect(after1?.issuedBy?.toString()).toBe(String(teacherId));
    expect(notifySpy).toHaveBeenCalledTimes(1);

    const firstIssuedAt = after1?.issuedAt as Date;
    notifySpy.mockClear();

    await issueMarking(String(m._id), String(schoolId), String(teacherId), String(assessmentId));
    await new Promise((r) => setTimeout(r, 10));

    const after2 = await PaperMarking.findById(m._id).lean();
    expect(after2?.issuedAt?.getTime()).toBe(firstIssuedAt.getTime());
    expect(notifySpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to verify it passes**

Run: `cd c:/Users/shaun/campusly-backend && npm test -- --run issueMarking`
Expected: PASS (both assertions hold against the implementation from Task 4).

If it fails with a notification mock error, double-check the `vi.mock` paths match the relative import in `service-marking-queries.ts`.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/__tests__/issueMarking.test.ts
git commit -m "test(marking): issueMarking first issue notifies, re-issue silent"
```

---

## Phase 3 — Backend new endpoints (PDF + student + gated images)

### Task 7: PDF generation service

**Files:**
- Create: `src/modules/AITools/service-marking-pdf.ts`

- [ ] **Step 1: Write the service**

Write `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking-pdf.ts`:

```ts
import path from 'path';
import fs from 'fs';
import { createDocument, finalise } from '../../common/pdf/document.js';
import { MARGIN, CONTENT_WIDTH, PAGE_HEIGHT, FONT_TITLE, FONT_NORMAL, FOOTER_RESERVE } from '../../common/pdf/constants.js';
import { markingDir } from './service-marking-images.js';
import type { IPaperMarking } from './model-marking.js';

interface PdfMeta {
  paperTitle: string;
}

/**
 * Stitch a marking's uploaded page images into a single A4 PDF.
 * Returns null when the marking has no images (caller should 404).
 */
export async function buildMarkingPdf(
  marking: IPaperMarking,
  meta: PdfMeta,
): Promise<Buffer | null> {
  if (!marking.images || marking.images.length === 0) return null;

  const doc = createDocument();
  const dir = markingDir(String(marking._id));
  const ordered = [...marking.images].sort((a, b) => a.pageNumber - b.pageNumber);

  // Header on page 1
  doc.font(FONT_TITLE).fontSize(16).text(meta.paperTitle, MARGIN, MARGIN, { width: CONTENT_WIDTH });
  doc.moveDown(0.3);
  doc.font(FONT_NORMAL).fontSize(11).text(`Student: ${marking.studentName}`, { width: CONTENT_WIDTH });
  doc.text(
    `Score: ${marking.totalMarks}/${marking.maxMarks} (${Math.round(marking.percentage)}%)`,
    { width: CONTENT_WIDTH },
  );
  doc.text(`Marked: ${marking.updatedAt.toISOString().slice(0, 10)}`, { width: CONTENT_WIDTH });
  doc.moveDown(1);

  const usableHeight = PAGE_HEIGHT - MARGIN * 2 - FOOTER_RESERVE - 100; // leave room for header on first page
  const fullPageHeight = PAGE_HEIGHT - MARGIN * 2 - FOOTER_RESERVE;

  ordered.forEach((img, idx) => {
    const absPath = path.join(dir, img.filename);
    if (!fs.existsSync(absPath)) {
      console.warn('Marking PDF: missing image', { markingId: String(marking._id), filename: img.filename });
      return;
    }
    if (idx === 0) {
      doc.image(absPath, MARGIN, doc.y, { fit: [CONTENT_WIDTH, usableHeight], align: 'center' });
    } else {
      doc.addPage();
      doc.image(absPath, MARGIN, MARGIN, { fit: [CONTENT_WIDTH, fullPageHeight], align: 'center' });
    }
  });

  return finalise(doc);
}
```

- [ ] **Step 2: Verify compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors. If `markingDir` isn't exported from `service-marking-images.ts`, it already is — see line 82 of that file.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/service-marking-pdf.ts
git commit -m "feat(marking): PDF stitching service for uploaded page images"
```

---

### Task 8: PDF & image controller handlers (shared by teacher + student)

**Files:**
- Modify: `src/modules/AITools/controller.ts`

- [ ] **Step 1: Add imports at top of controller.ts**

After the existing imports near the top of [src/modules/AITools/controller.ts](../../../campusly-backend/src/modules/AITools/controller.ts), add:

```ts
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { PaperMarking } from './model-marking.js';
import { AssessmentPaper } from '../QuestionBank/model-papers.js';
import { markingDir } from './service-marking-images.js';
import { buildMarkingPdf } from './service-marking-pdf.js';
import { resolveStudentForUser } from './service-student-ownership.js';
```

If any of these are already imported, skip duplicates.

- [ ] **Step 2: Add a helper that resolves caller scope to (schoolId, requireIssued)**

Inside the `AIToolsController` class, before `issueMarking`, add a private static helper that finds a marking accessible to the caller:

```ts
private static async findCallerAccessibleMarking(req: Request, markingId: string) {
  const role = req.user?.role;
  if (!mongoose.Types.ObjectId.isValid(markingId)) return null;
  const _id = new mongoose.Types.ObjectId(markingId);

  if (role === 'student') {
    const { studentId, schoolId } = await resolveStudentForUser(getUser(req).id);
    return PaperMarking.findOne({
      _id,
      studentId: new mongoose.Types.ObjectId(studentId),
      schoolId: new mongoose.Types.ObjectId(schoolId),
      issuedToStudent: true,
      isDeleted: false,
    });
  }

  // teacher / school_admin / super_admin — scope by schoolId
  const schoolId = req.user?.schoolId;
  if (!schoolId) return null;
  return PaperMarking.findOne({
    _id,
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  });
}
```

- [ ] **Step 3: Add the `getMarkingPdf` handler**

In the same `AIToolsController` class, add:

```ts
static async getMarkingPdf(req: Request, res: Response): Promise<void> {
  const marking = await AIToolsController.findCallerAccessibleMarking(req, req.params.id as string);
  if (!marking) {
    res.status(404).json({ success: false, error: 'Marking not found' });
    return;
  }
  if (!marking.images || marking.images.length === 0) {
    res.status(404).json({ success: false, error: 'No marked pages to render' });
    return;
  }
  const paper = await AssessmentPaper.findOne({ _id: marking.paperId, isDeleted: false })
    .select('title')
    .lean();
  const pdf = await buildMarkingPdf(marking, { paperTitle: paper?.title ?? 'Marked paper' });
  if (!pdf) {
    res.status(404).json({ success: false, error: 'No marked pages to render' });
    return;
  }
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `${slug(marking.studentName)}-${slug(paper?.title ?? 'paper')}-marked.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(pdf);
}
```

- [ ] **Step 4: Add the `getMarkingImage` handler**

```ts
static async getMarkingImage(req: Request, res: Response): Promise<void> {
  const marking = await AIToolsController.findCallerAccessibleMarking(req, req.params.id as string);
  if (!marking) {
    res.status(404).json({ success: false, error: 'Marking not found' });
    return;
  }
  const filename = req.params.filename as string;
  const entry = marking.images.find((img) => img.filename === filename);
  if (!entry) {
    res.status(404).json({ success: false, error: 'Page not found' });
    return;
  }
  const absPath = path.join(markingDir(String(marking._id)), filename);
  if (!fs.existsSync(absPath)) {
    res.status(404).json({ success: false, error: 'Page file missing' });
    return;
  }
  res.setHeader('Content-Type', entry.mimeType);
  res.setHeader('Cache-Control', 'private, max-age=300');
  fs.createReadStream(absPath).pipe(res);
}
```

- [ ] **Step 5: Verify compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/controller.ts
git commit -m "feat(marking): PDF + gated image handlers (teacher + owning student)"
```

---

### Task 9: Student-facing list & detail controller

**Files:**
- Create: `src/modules/AITools/controller-student-markings.ts`

- [ ] **Step 1: Write the controller**

Write `c:/Users/shaun/campusly-backend/src/modules/AITools/controller-student-markings.ts`:

```ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { PaperMarking } from './model-marking.js';
import { AssessmentPaper } from '../QuestionBank/model-papers.js';
import { Subject } from '../Academic/model.js';
import { resolveStudentForUser } from './service-student-ownership.js';
import { apiResponse } from '../../common/utils.js';
import { getUser } from '../../middleware/auth.js';

interface StudentMarkingSummary {
  id: string;
  paperId: string;
  paperTitle: string;
  subjectName: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  issuedAt: Date;
}

export async function listStudentMarkings(req: Request, res: Response): Promise<void> {
  const { studentId, schoolId } = await resolveStudentForUser(getUser(req).id);
  const paperIdFilter = req.query.paperId as string | undefined;

  const filter: Record<string, unknown> = {
    studentId: new mongoose.Types.ObjectId(studentId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    issuedToStudent: true,
    isDeleted: false,
  };
  if (paperIdFilter && mongoose.Types.ObjectId.isValid(paperIdFilter)) {
    filter.paperId = new mongoose.Types.ObjectId(paperIdFilter);
  }

  const markings = await PaperMarking.find(filter)
    .sort({ issuedAt: -1 })
    .select('_id paperId totalMarks maxMarks percentage issuedAt')
    .lean();

  if (markings.length === 0) {
    res.json(apiResponse(true, [], 'Markings retrieved'));
    return;
  }

  const paperIds = [...new Set(markings.map((m) => String(m.paperId)))];
  const papers = await AssessmentPaper.find({
    _id: { $in: paperIds },
    isDeleted: false,
  })
    .select('_id title subjectId')
    .lean();

  const subjectIds = [...new Set(papers.map((p) => String(p.subjectId)))];
  const subjects = await Subject.find({ _id: { $in: subjectIds }, isDeleted: false })
    .select('_id name')
    .lean();
  const subjectName = new Map(subjects.map((s) => [String(s._id), s.name]));
  const paperLookup = new Map(papers.map((p) => [String(p._id), p]));

  const summaries: StudentMarkingSummary[] = markings.map((m) => {
    const paper = paperLookup.get(String(m.paperId));
    return {
      id: String(m._id),
      paperId: String(m.paperId),
      paperTitle: paper?.title ?? 'Paper',
      subjectName: paper ? subjectName.get(String(paper.subjectId)) ?? '' : '',
      totalMarks: m.totalMarks,
      maxMarks: m.maxMarks,
      percentage: m.percentage,
      issuedAt: m.issuedAt as Date,
    };
  });

  res.json(apiResponse(true, summaries, 'Markings retrieved'));
}

export async function getStudentMarking(req: Request, res: Response): Promise<void> {
  const { studentId, schoolId } = await resolveStudentForUser(getUser(req).id);
  const id = req.params.id as string;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ success: false, error: 'Marking not found' });
    return;
  }
  const marking = await PaperMarking.findOne({
    _id: new mongoose.Types.ObjectId(id),
    studentId: new mongoose.Types.ObjectId(studentId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    issuedToStudent: true,
    isDeleted: false,
  }).lean();
  if (!marking) {
    res.status(404).json({ success: false, error: 'Marking not found' });
    return;
  }

  const paper = await AssessmentPaper.findOne({ _id: marking.paperId, isDeleted: false })
    .select('title subjectId')
    .lean();
  const subject = paper
    ? await Subject.findOne({ _id: paper.subjectId, isDeleted: false }).select('name').lean()
    : null;

  // Strip teacher-only metadata from the response.
  const { aiRawResult, errorMessage, ...safe } = marking;
  void aiRawResult;
  void errorMessage;

  res.json(
    apiResponse(true, {
      ...safe,
      paperTitle: paper?.title ?? 'Paper',
      subjectName: subject?.name ?? '',
    }, 'Marking retrieved'),
  );
}
```

- [ ] **Step 2: Verify compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors. If `Subject` model lives at a different path, update the import — run `grep -rn "export.*Subject\b" src/modules/Academic/model.ts` to confirm.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/controller-student-markings.ts
git commit -m "feat(marking): student-facing controller for issued markings"
```

---

### Task 10: Wire new routes

**Files:**
- Modify: `src/modules/AITools/routes.ts`

- [ ] **Step 1: Add imports**

At the top of [src/modules/AITools/routes.ts](../../../campusly-backend/src/modules/AITools/routes.ts), alongside the existing imports, add:

```ts
import { listStudentMarkings, getStudentMarking } from './controller-student-markings.js';
```

- [ ] **Step 2: Add routes**

After the existing `POST /markings/:id/issue` route (the one you added in Task 5), add the following blocks:

```ts
// GET /markings/:id/pdf — stitched PDF of uploaded page images
router.get(
  '/markings/:id/pdf',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin', 'student'),
  AIToolsController.getMarkingPdf,
);

// GET /markings/:id/image/:filename — gated image bytes
router.get(
  '/markings/:id/image/:filename',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin', 'student'),
  AIToolsController.getMarkingImage,
);

// GET /students/me/markings — list issued markings for current student
router.get(
  '/students/me/markings',
  authenticate,
  authorize('student'),
  listStudentMarkings,
);

// GET /students/me/markings/:id — single issued marking for current student
router.get(
  '/students/me/markings/:id',
  authenticate,
  authorize('student'),
  getStudentMarking,
);
```

- [ ] **Step 3: Verify compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/routes.ts
git commit -m "feat(marking): wire PDF, image, and student-facing routes"
```

---

### Task 11a: Gate `submissionStatus` on `issuedToStudent` in student list

**Files:**
- Modify: `src/modules/QuestionBank/service-submissions-student.ts`

**Background:** Today `PaperSubmission.status` is set to `'graded'` the moment the `PaperMarking` is created, which is BEFORE the teacher issues. We need the student-facing list to report `submitted` (not `graded`) until the marking is issued.

- [ ] **Step 1: Add marking-issued lookup to `listAssignedPapersForStudent`**

In [src/modules/QuestionBank/service-submissions-student.ts](../../../campusly-backend/src/modules/QuestionBank/service-submissions-student.ts), after line 112 (where `submissions` is loaded), add:

```ts
import { PaperMarking } from '../AITools/model-marking.js';

const markingIds = submissions
  .map((s) => s.markingId)
  .filter((id): id is mongoose.Types.ObjectId => id != null);
const issuedMarkings = markingIds.length
  ? await PaperMarking.find({ _id: { $in: markingIds }, issuedToStudent: true, isDeleted: false })
      .select('_id')
      .lean()
  : [];
const issuedSet = new Set(issuedMarkings.map((m) => String(m._id)));
```

(Put the `import` line at the top alongside the other imports.)

- [ ] **Step 2: Down-grade non-issued statuses**

Inside the `for (const paper of papers)` loop (line 118), replace:

```ts
submissionStatus: sub?.status ?? 'not_started',
```

with:

```ts
submissionStatus: deriveSubmissionStatus(sub, issuedSet),
```

Add a helper near the top of the file (after the imports):

```ts
function deriveSubmissionStatus(
  sub: IPaperSubmission | undefined,
  issuedMarkingIds: Set<string>,
): SubmissionStatus | 'not_started' {
  if (!sub) return 'not_started';
  // Don't show "graded" / "published" until the marking is actually issued
  // to the student. Marking-in-progress should look like "submitted".
  if ((sub.status === 'graded' || sub.status === 'published') && sub.markingId) {
    return issuedMarkingIds.has(String(sub.markingId)) ? sub.status : 'submitted';
  }
  return sub.status;
}
```

(`SubmissionStatus` is imported at the top of this file — confirm the import on line 1-15.)

- [ ] **Step 3: Verify compile + tests**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit && npm test -- --run service-submissions-student 2>/dev/null || true`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/service-submissions-student.ts
git commit -m "fix(marking): student list shows 'submitted' until marking is issued"
```

---

### Task 11: Exclude marking images from static serving

**Files:**
- Modify: `src/app.ts`

- [ ] **Step 1: Add exclusion middleware**

In [src/app.ts](../../../campusly-backend/src/app.ts), replace the block at lines 230-234:

```ts
// Static file serving — uploaded assets
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));
```

with:

```ts
// Static file serving — uploaded assets.
// Marking images (uploads/markings/, uploads/markings-batch/) are NOT served
// statically because they may contain student work that must be auth-gated.
// Use the AITools controller routes for those instead.
app.use('/uploads', (req, res, next) => {
  if (req.path.startsWith('/markings/') || req.path.startsWith('/markings-batch/')) {
    res.status(404).json({ success: false, error: 'Use the API endpoint to access marking images' });
    return;
  }
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));
```

- [ ] **Step 2: Verify compile + smoke**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/app.ts
git commit -m "fix(marking): stop static-serving uploads/markings/, route via auth-gated API"
```

---

### Task 12: Student endpoint test — own-only access; unissued returns 404

**Files:**
- Create: `src/modules/AITools/__tests__/student-markings.test.ts`

- [ ] **Step 1: Write the test**

Write `c:/Users/shaun/campusly-backend/src/modules/AITools/__tests__/student-markings.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { PaperMarking } from '../model-marking.js';
import { Student } from '../../Student/model.js';
import { resolveStudentForUser } from '../service-student-ownership.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

describe('student markings access', () => {
  it('resolveStudentForUser returns studentId+schoolId; throws if not a student', async () => {
    const userId = new mongoose.Types.ObjectId();
    const schoolId = new mongoose.Types.ObjectId();
    await Student.create({ userId, schoolId, firstName: 'A', lastName: 'B', isDeleted: false });

    const r = await resolveStudentForUser(String(userId));
    expect(r.schoolId).toBe(String(schoolId));

    await expect(resolveStudentForUser(String(new mongoose.Types.ObjectId()))).rejects.toThrow();
  });

  it('student query filters by issuedToStudent=true and own studentId', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const myStudentId = new mongoose.Types.ObjectId();
    const otherStudentId = new mongoose.Types.ObjectId();
    const paperId = new mongoose.Types.ObjectId();

    await PaperMarking.create([
      // Mine, issued — should be visible
      { schoolId, teacherId, paperId, paperType: 'generated', studentId: myStudentId,
        studentName: 'Me', imageCount: 0, totalMarks: 5, maxMarks: 10, percentage: 50,
        questions: [], status: 'published', issuedToStudent: true, issuedAt: new Date() },
      // Mine, NOT issued — should be hidden
      { schoolId, teacherId, paperId, paperType: 'generated', studentId: myStudentId,
        studentName: 'Me', imageCount: 0, totalMarks: 5, maxMarks: 10, percentage: 50,
        questions: [], status: 'completed', issuedToStudent: false },
      // Someone else's, issued — should be hidden
      { schoolId, teacherId, paperId, paperType: 'generated', studentId: otherStudentId,
        studentName: 'Other', imageCount: 0, totalMarks: 8, maxMarks: 10, percentage: 80,
        questions: [], status: 'published', issuedToStudent: true, issuedAt: new Date() },
    ]);

    const visible = await PaperMarking.find({
      studentId: myStudentId,
      schoolId,
      issuedToStudent: true,
      isDeleted: false,
    }).lean();
    expect(visible).toHaveLength(1);
    expect(visible[0].studentName).toBe('Me');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd c:/Users/shaun/campusly-backend && npm test -- --run student-markings`
Expected: both tests PASS.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/__tests__/student-markings.test.ts
git commit -m "test(marking): student ownership + issued-only visibility"
```

---

### Task 13: PDF generation smoke test

**Files:**
- Create: `src/modules/AITools/__tests__/marking-pdf.test.ts`

- [ ] **Step 1: Write the test**

Write `c:/Users/shaun/campusly-backend/src/modules/AITools/__tests__/marking-pdf.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import mongoose from 'mongoose';
import { buildMarkingPdf } from '../service-marking-pdf.js';
import type { IPaperMarking } from '../model-marking.js';
import { markingDir } from '../service-marking-images.js';

function makeMarking(images: { filename: string; pageNumber: number }[]): IPaperMarking {
  const id = new mongoose.Types.ObjectId();
  return {
    _id: id,
    paperId: new mongoose.Types.ObjectId(),
    paperType: 'generated',
    studentName: 'Test',
    teacherId: new mongoose.Types.ObjectId(),
    schoolId: new mongoose.Types.ObjectId(),
    imageCount: images.length,
    totalMarks: 5,
    maxMarks: 10,
    percentage: 50,
    questions: [],
    status: 'completed',
    isDeleted: false,
    extractedHeader: null,
    paperMismatch: false,
    mismatchReason: null,
    aiRawResult: null,
    images: images.map((i) => ({ ...i, mimeType: 'image/png', sizeBytes: 1 })),
    paperVersion: 1,
    issuedToStudent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as IPaperMarking;
}

// A 1x1 transparent PNG, base64 decoded
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII=',
  'base64',
);

describe('buildMarkingPdf', () => {
  it('returns null when marking has no images', async () => {
    const m = makeMarking([]);
    const out = await buildMarkingPdf(m, { paperTitle: 'Empty' });
    expect(out).toBeNull();
  });

  it('returns a non-empty PDF buffer when images exist on disk', async () => {
    const m = makeMarking([{ filename: 'page-1.png', pageNumber: 1 }]);
    const dir = markingDir(String(m._id));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'page-1.png'), TINY_PNG);

    try {
      const out = await buildMarkingPdf(m, { paperTitle: 'Test paper' });
      expect(out).not.toBeNull();
      expect(out!.length).toBeGreaterThan(100);
      // PDF files start with the magic %PDF-
      expect(out!.subarray(0, 5).toString()).toBe('%PDF-');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd c:/Users/shaun/campusly-backend && npm test -- --run marking-pdf`
Expected: both tests PASS.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/__tests__/marking-pdf.test.ts
git commit -m "test(marking): PDF stitching smoke test"
```

---

## Phase 4 — Frontend teacher side

### Task 14: Update `useTeacherMarking` (rename + PDF download)

**Files:**
- Modify: `src/hooks/useTeacherMarking.ts`

- [ ] **Step 1: Rename publishMarking → issueMarking**

In [src/hooks/useTeacherMarking.ts](../../../campusly-frontend/src/hooks/useTeacherMarking.ts), at line 198 find `const publishMarking = useCallback(...)`. Rename to `issueMarking` and change the POST URL to `/ai-tools/markings/${id}/issue`. Update the success toast to `'Marking issued'`. Update the return object on line 264 from `publishMarking,` to `issueMarking,`.

The new function body:

```ts
const issueMarking = useCallback(async (
  id: string,
  assessmentId: string,
  studentId?: string,
  comment?: string,
): Promise<PaperMarking | null> => {
  try {
    const body: Record<string, unknown> = { studentId, comment };
    if (assessmentId) body.assessmentId = assessmentId;
    const res = await apiClient.post(`/ai-tools/markings/${id}/issue`, body);
    const updated = unwrapResponse<PaperMarking>(res);
    setCurrentMarking(updated);
    setMarkings((prev) => prev.map((m) => (m.id === id ? updated : m)));
    toast.success('Marking issued');
    return updated;
  } catch (err: unknown) {
    console.error('Failed to issue marking', err);
    toast.error(extractErrorMessage(err, 'Failed to issue marking.'));
    return null;
  }
}, []);
```

- [ ] **Step 2: Add `downloadMarkingPdf`**

Just before the return object near line 264, add:

```ts
const downloadMarkingPdf = useCallback(async (id: string, studentName: string, paperTitle: string): Promise<void> => {
  try {
    const res = await apiClient.get(`/ai-tools/markings/${id}/pdf`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug(studentName)}-${slug(paperTitle)}-marked.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: unknown) {
    console.error('Failed to download marking PDF', err);
    toast.error(extractErrorMessage(err, 'Failed to download PDF.'));
  }
}, []);
```

Add `downloadMarkingPdf,` to the returned object.

- [ ] **Step 3: Update the `issuedToStudent` field on the PaperMarking type**

Near the top of the file, find the `PaperMarking` type definition (it lives in this hook). Add these three fields:

```ts
issuedToStudent?: boolean;
issuedAt?: string;
issuedBy?: string;
```

- [ ] **Step 4: Verify type-check**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: errors at every call site of `publishMarking` — these will be fixed in Tasks 15 + 18. If there are *other* errors in this file, fix them in this task.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useTeacherMarking.ts
git commit -m "refactor(marking): useTeacherMarking issueMarking + downloadMarkingPdf"
```

---

### Task 15: `MarkingPagesLightbox` component

**Files:**
- Create: `src/components/ai-tools/MarkingPagesLightbox.tsx`

- [ ] **Step 1: Write the component**

Write `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingPagesLightbox.tsx`:

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface LightboxImage {
  filename: string;
  pageNumber: number;
}

interface MarkingPagesLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markingId: string;
  images: LightboxImage[];
  startIndex?: number;
}

function buildImageUrl(markingId: string, filename: string): string {
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
  return `${base}/ai-tools/markings/${markingId}/image/${encodeURIComponent(filename)}`;
}

export function MarkingPagesLightbox({
  open, onOpenChange, markingId, images, startIndex = 0,
}: MarkingPagesLightboxProps) {
  const ordered = [...images].sort((a, b) => a.pageNumber - b.pageNumber);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => { if (open) setIndex(startIndex); }, [open, startIndex]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(ordered.length - 1, i + 1)), [ordered.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, prev, next]);

  if (ordered.length === 0) return null;
  const current = ordered[index];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col p-0 bg-black/95 border-0">
        <div className="flex items-center justify-between px-4 py-2 text-white text-sm">
          <span>Page {index + 1} of {ordered.length}</span>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center relative">
          <Button
            variant="ghost"
            size="icon"
            disabled={index === 0}
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <img
            src={buildImageUrl(markingId, current.filename)}
            alt={`Page ${current.pageNumber}`}
            className="max-h-[80vh] max-w-[85vw] object-contain"
          />
          <Button
            variant="ghost"
            size="icon"
            disabled={index === ordered.length - 1}
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no errors in this file. If `Dialog` import path is wrong, run `find src/components/ui -name "dialog.tsx"` and fix.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/ai-tools/MarkingPagesLightbox.tsx
git commit -m "feat(marking): MarkingPagesLightbox carousel for marked pages"
```

---

### Task 16: `MarkingQuestionCard` (shared per-question card)

**Files:**
- Create: `src/components/ai-tools/MarkingQuestionCard.tsx`

- [ ] **Step 1: Read the existing card markup**

Run: `cd c:/Users/shaun/campusly-frontend && grep -n "marksAwarded\|rationale\|questionNumber" src/components/ai-tools/MarkingResults.tsx | head -20`

Use this to locate the per-question card JSX in `MarkingResults.tsx` (approx. lines 183-227 per the spec). You'll port the same structure.

- [ ] **Step 2: Write the shared component**

Write `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingQuestionCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MarkingQuestion } from '@/hooks/useTeacherMarking';

interface MarkingQuestionCardProps {
  question: MarkingQuestion;
  index: number;
  editable: boolean;
  rationaleLabel: 'AI Rationale' | 'Rationale';
  onChange?: (marksAwarded: number) => void;
}

function scoreBadgeVariant(awarded: number, max: number) {
  if (awarded === max) return 'default' as const;
  if (awarded > 0) return 'secondary' as const;
  return 'destructive' as const;
}

export function MarkingQuestionCard({
  question, index, editable, rationaleLabel, onChange,
}: MarkingQuestionCardProps) {
  const [rationaleOpen, setRationaleOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Question {question.questionNumber || index + 1}</CardTitle>
          <Badge variant={scoreBadgeVariant(question.marksAwarded, question.maxMarks)}>
            {question.marksAwarded} / {question.maxMarks}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs mb-1">Student answer</p>
          <p className="whitespace-pre-wrap">{question.studentAnswer || <span className="italic text-muted-foreground">No answer</span>}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-1">Correct answer</p>
          <p className="whitespace-pre-wrap">{question.correctAnswer}</p>
        </div>
        {question.feedback && (
          <div>
            <p className="text-muted-foreground text-xs mb-1">Feedback</p>
            <p className="whitespace-pre-wrap">{question.feedback}</p>
          </div>
        )}
        {question.rationale && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRationaleOpen((v) => !v)}
              className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent"
            >
              {rationaleOpen ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {rationaleLabel}
            </Button>
            {rationaleOpen && (
              <p className="whitespace-pre-wrap mt-2 text-muted-foreground">{question.rationale}</p>
            )}
          </div>
        )}
        {editable && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground">Adjust marks:</span>
            <Input
              type="number"
              min={0}
              max={question.maxMarks}
              step={0.5}
              value={question.marksAwarded}
              onChange={(e) => onChange?.(Number(e.target.value))}
              className="w-20 h-8"
            />
            <span className="text-xs text-muted-foreground">/ {question.maxMarks}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Verify type-check**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no errors in this file.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/ai-tools/MarkingQuestionCard.tsx
git commit -m "feat(marking): shared MarkingQuestionCard for teacher and student views"
```

---

### Task 17: Rename `PublishToGradebookDialog` → `IssueResultDialog`

**Files:**
- Rename: `src/components/ai-tools/PublishToGradebookDialog.tsx` → `src/components/ai-tools/IssueResultDialog.tsx`

- [ ] **Step 1: Read the existing file**

Read `c:/Users/shaun/campusly-frontend/src/components/ai-tools/PublishToGradebookDialog.tsx` in full. Note its exported names and props.

- [ ] **Step 2: Move and rename**

Run:

```bash
cd c:/Users/shaun/campusly-frontend
git mv src/components/ai-tools/PublishToGradebookDialog.tsx src/components/ai-tools/IssueResultDialog.tsx
```

- [ ] **Step 3: Update the component**

Edit `src/components/ai-tools/IssueResultDialog.tsx`. Rename the exported component from `PublishToGradebookDialog` to `IssueResultDialog`. Update the visible copy:

- Dialog title: `Issue result to student`
- Description / intro paragraph: `This will publish the mark to the gradebook and share the marking review with the student.`
- Confirm button label: `Issue Result`

Leave the assessment picker and comment field logic intact.

- [ ] **Step 4: Update the only existing importer**

Run: `cd c:/Users/shaun/campusly-frontend && grep -rn "PublishToGradebookDialog" src/`

For each result, change the import from `PublishToGradebookDialog` to `IssueResultDialog` and update the JSX tag.

- [ ] **Step 5: Verify type-check**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: errors only in `MarkingResults.tsx` if it still references the old name — fix that in this task.

- [ ] **Step 6: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add -A src/components/ai-tools/
git commit -m "refactor(marking): rename PublishToGradebookDialog -> IssueResultDialog"
```

---

### Task 18: Update `MarkingResults` — thumbnails, lightbox, PDF button, Issue/Re-issue

**Files:**
- Modify: `src/components/ai-tools/MarkingResults.tsx`

- [ ] **Step 1: Replace imports at top**

In [src/components/ai-tools/MarkingResults.tsx](../../../campusly-frontend/src/components/ai-tools/MarkingResults.tsx), replace lines 4-13:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw, Send, ListOrdered, Save, AlertTriangle } from 'lucide-react';
import type { PaperMarking, MarkingQuestion } from '@/hooks/useTeacherMarking';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { PublishToGradebookDialog } from './PublishToGradebookDialog';

const IMAGE_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4500/api').replace(/\/api\/?$/, '') + '/uploads';
```

with:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RotateCcw, Send, ListOrdered, Save, AlertTriangle, Download, Images } from 'lucide-react';
import type { PaperMarking, MarkingQuestion } from '@/hooks/useTeacherMarking';
import { useTeacherMarking } from '@/hooks/useTeacherMarking';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { IssueResultDialog } from './IssueResultDialog';
import { MarkingPagesLightbox } from './MarkingPagesLightbox';
import { MarkingQuestionCard } from './MarkingQuestionCard';
import { apiClient } from '@/lib/api-client';
```

- [ ] **Step 2: Add lightbox state**

In the component body, add alongside the other `useState` calls:

```tsx
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxStart, setLightboxStart] = useState(0);
const { downloadMarkingPdf } = useTeacherMarking();
```

- [ ] **Step 3: Replace the thumbnail strip**

Find the existing image strip (originally lines 145-163). Replace the whole strip block with:

```tsx
{marking.images && marking.images.length > 0 && (
  <div className="flex items-center gap-2 flex-wrap">
    {marking.images.slice(0, 3).map((img, i) => {
      const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
      const url = `${base}/ai-tools/markings/${marking.id}/image/${encodeURIComponent(img.filename)}`;
      return (
        <button
          key={img.filename}
          type="button"
          onClick={() => { setLightboxStart(i); setLightboxOpen(true); }}
          className="relative w-20 h-24 border rounded overflow-hidden hover:ring-2 hover:ring-primary"
        >
          <img src={url} alt={`Page ${img.pageNumber}`} className="w-full h-full object-cover" />
        </button>
      );
    })}
    {marking.images.length > 0 && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setLightboxStart(0); setLightboxOpen(true); }}
        className="gap-2"
      >
        <Images className="h-4 w-4" />
        View all {marking.images.length} pages
      </Button>
    )}
  </div>
)}
```

- [ ] **Step 4: Replace the per-question rendering with `MarkingQuestionCard`**

Find the per-question cards loop (originally lines 183-227). Replace with:

```tsx
<div className="space-y-3">
  {questions.map((q, i) => (
    <MarkingQuestionCard
      key={i}
      question={q}
      index={i}
      editable
      rationaleLabel="AI Rationale"
      onChange={(marksAwarded) => {
        const next = [...questions];
        next[i] = { ...next[i], marksAwarded };
        setQuestions(next);
        setDirty(true);
      }}
    />
  ))}
</div>
```

- [ ] **Step 5: Update the action buttons row**

Find the action buttons row (originally lines 231-258 — Save adjustments / Publish to gradebook / Mark next / View all). Replace the "Publish to gradebook" button + its sibling helper button:

```tsx
{marking.images && marking.images.length > 0 && (
  <Button
    type="button"
    variant="outline"
    onClick={() => downloadMarkingPdf(marking.id, marking.studentName, '')}
    className="gap-2"
  >
    <Download className="h-4 w-4" />
    Download PDF
  </Button>
)}
<Button
  type="button"
  onClick={() => setPublishOpen(true)}
  disabled={dirty || isLoading || publishing}
  className="gap-2"
>
  <Send className="h-4 w-4" />
  {marking.issuedToStudent ? 'Re-issue' : 'Issue Result'}
</Button>
```

If `marking.issuedToStudent` is true, render a caption just below the action row:

```tsx
{marking.issuedToStudent && marking.issuedAt && (
  <p className="text-xs text-muted-foreground">
    Issued {new Date(marking.issuedAt).toLocaleDateString()}
  </p>
)}
```

- [ ] **Step 6: Render the lightbox at the bottom of the component JSX**

Just before the component's closing fragment / outer wrapper, add:

```tsx
<MarkingPagesLightbox
  open={lightboxOpen}
  onOpenChange={setLightboxOpen}
  markingId={marking.id}
  images={marking.images ?? []}
  startIndex={lightboxStart}
/>
```

- [ ] **Step 7: Remove the now-unused `IMAGE_BASE` constant and the `Input` import (since per-question marks input now lives in `MarkingQuestionCard`)**

Re-check the imports — confirm `Input` is unused and remove it.

- [ ] **Step 8: Verify type-check**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Verify file is under 350 lines (project rule)**

Run: `cd c:/Users/shaun/campusly-frontend && wc -l src/components/ai-tools/MarkingResults.tsx`
Expected: line count < 350. If over, split out the warnings/header block into a sub-component.

- [ ] **Step 10: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/ai-tools/MarkingResults.tsx
git commit -m "feat(marking): lightbox + Download PDF + Issue/Re-issue in MarkingResults"
```

---

## Phase 5 — Frontend student side

### Task 19: `useStudentMarking` hook

**Files:**
- Create: `src/hooks/useStudentMarking.ts`

- [ ] **Step 1: Write the hook**

Write `c:/Users/shaun/campusly-frontend/src/hooks/useStudentMarking.ts`:

```ts
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { PaperMarking } from '@/hooks/useTeacherMarking';

export interface StudentMarkingSummary {
  id: string;
  paperId: string;
  paperTitle: string;
  subjectName: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  issuedAt: string;
}

export interface StudentMarkingDetail extends PaperMarking {
  paperTitle: string;
  subjectName: string;
}

export function useStudentMarking() {
  const [loading, setLoading] = useState(false);

  const getMarkingByPaper = useCallback(async (paperId: string): Promise<StudentMarkingSummary | null> => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ai-tools/students/me/markings', { params: { paperId } });
      const list = unwrapList<StudentMarkingSummary>(res);
      return list[0] ?? null;
    } catch (err: unknown) {
      console.error('Failed to load marking by paper', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMarking = useCallback(async (id: string): Promise<StudentMarkingDetail | null> => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/ai-tools/students/me/markings/${id}`);
      return unwrapResponse<StudentMarkingDetail>(res);
    } catch (err: unknown) {
      console.error('Failed to load marking detail', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadMarkingPdf = useCallback(async (id: string, studentName: string, paperTitle: string): Promise<void> => {
    try {
      const res = await apiClient.get(`/ai-tools/markings/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug(studentName)}-${slug(paperTitle)}-marked.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Failed to download marking PDF', err);
      toast.error(extractErrorMessage(err, 'Failed to download PDF.'));
    }
  }, []);

  return { loading, getMarkingByPaper, getMarking, downloadMarkingPdf };
}
```

- [ ] **Step 2: Verify type-check**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useStudentMarking.ts
git commit -m "feat(marking): useStudentMarking hook for student review"
```

---

### Task 20: `StudentMarkingReview` component

**Files:**
- Create: `src/components/student/StudentMarkingReview.tsx`

- [ ] **Step 1: Check that the `student/` directory exists**

Run: `cd c:/Users/shaun/campusly-frontend && ls src/components/student/ 2>/dev/null || mkdir src/components/student`

- [ ] **Step 2: Write the component**

Write `c:/Users/shaun/campusly-frontend/src/components/student/StudentMarkingReview.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Images } from 'lucide-react';
import { MarkingPagesLightbox } from '@/components/ai-tools/MarkingPagesLightbox';
import { MarkingQuestionCard } from '@/components/ai-tools/MarkingQuestionCard';
import { useStudentMarking } from '@/hooks/useStudentMarking';
import type { StudentMarkingDetail } from '@/hooks/useStudentMarking';

interface StudentMarkingReviewProps {
  marking: StudentMarkingDetail;
}

function percentageBadgeVariant(pct: number) {
  if (pct >= 80) return 'default' as const;
  if (pct >= 50) return 'secondary' as const;
  return 'destructive' as const;
}

export function StudentMarkingReview({ marking }: StudentMarkingReviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { downloadMarkingPdf } = useStudentMarking();
  const hasImages = (marking.images?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>{marking.paperTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">{marking.subjectName}</p>
            </div>
            <Badge variant={percentageBadgeVariant(marking.percentage)} className="text-base px-3 py-1">
              {marking.totalMarks} / {marking.maxMarks} ({Math.round(marking.percentage)}%)
            </Badge>
          </div>
          {marking.issuedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Issued {new Date(marking.issuedAt).toLocaleDateString()}
            </p>
          )}
        </CardHeader>
        {hasImages && (
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLightboxOpen(true)}
                className="gap-2"
              >
                <Images className="h-4 w-4" />
                View marked pages
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadMarkingPdf(marking.id, marking.studentName, marking.paperTitle)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="space-y-3">
        {marking.questions.map((q, i) => (
          <MarkingQuestionCard
            key={i}
            question={q}
            index={i}
            editable={false}
            rationaleLabel="Rationale"
          />
        ))}
      </div>

      {hasImages && (
        <MarkingPagesLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          markingId={marking.id}
          images={marking.images}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify type-check**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/student/StudentMarkingReview.tsx
git commit -m "feat(marking): StudentMarkingReview read-only review"
```

---

### Task 21: Three-state resolution on student paper page

**Files:**
- Create: `src/components/student/StudentTestTakeView.tsx` (extract existing test-taking JSX into a child)
- Modify: `src/app/(dashboard)/student/tests/[paperId]/page.tsx` (becomes a thin three-state resolver)

**Why the split:** `useStudentTestTake` fires `POST /question-bank/student/papers/:id/start` on mount, unconditionally. React hooks can't be called conditionally. So we keep that hook inside a child component which is only rendered in the test-take branch — preventing the wasted POST when the student is just viewing their issued result.

- [ ] **Step 1: Extract test-take view into a child component**

Read the existing [src/app/(dashboard)/student/tests/[paperId]/page.tsx](../../../campusly-frontend/src/app/(dashboard)/student/tests/[paperId]/page.tsx) (133 lines). Almost all of its body — the `useStudentTestTake` hook call on line 31, the answer state, the autosave effect, the orderedAnswers memo, the submit handler, and the JSX it renders — moves into a new child component.

Write `c:/Users/shaun/campusly-frontend/src/components/student/StudentTestTakeView.tsx`:

```tsx
'use client';

// Paste the full content of the current page.tsx HERE, with these adjustments:
//   1. Remove the default export wrapper; export a NAMED function `StudentTestTakeView({ paperId }: { paperId: string })`.
//   2. Remove the `use(params)` line + params prop — `paperId` is now a prop.
//   3. Keep everything else identical: useStudentTestTake, useState/useMemo/useEffect for answers, autosave, submit handler, render JSX.
//   4. Remove the `'use client'` directive's surrounding page-only imports if unused (e.g. `use` from react).
```

Concrete steps:

1. Copy the file's contents into `StudentTestTakeView.tsx`.
2. Replace the function signature `export default function StudentTestTakePage({ params }: { params: Promise<{ paperId: string }> })` with `export function StudentTestTakeView({ paperId }: { paperId: string })`.
3. Delete the line `const { paperId } = use(params);`.
4. Remove the `use` import from `react` (no longer needed).
5. Leave everything else exactly as-is.

- [ ] **Step 2: Rewrite the page as a thin resolver**

Replace the entire contents of `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/student/tests/[paperId]/page.tsx` with:

```tsx
'use client';

import { use, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useStudentMarking } from '@/hooks/useStudentMarking';
import type { StudentMarkingDetail } from '@/hooks/useStudentMarking';
import { StudentMarkingReview } from '@/components/student/StudentMarkingReview';
import { StudentTestTakeView } from '@/components/student/StudentTestTakeView';
import { useStudentAssignedPapers } from '@/hooks/useStudentTests';

export default function StudentTestPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = use(params);
  const { getMarkingByPaper, getMarking } = useStudentMarking();
  const { papers, loading: papersLoading } = useStudentAssignedPapers();
  const [marking, setMarking] = useState<StudentMarkingDetail | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      const summary = await getMarkingByPaper(paperId);
      if (cancelled) return;
      if (summary) {
        const detail = await getMarking(summary.id);
        if (!cancelled) setMarking(detail);
      }
      if (!cancelled) setResolving(false);
    })();
    return () => { cancelled = true; };
  }, [paperId, getMarkingByPaper, getMarking]);

  if (resolving || papersLoading) return <LoadingSpinner />;

  // State 1: Issued — show the review
  if (marking) return <StudentMarkingReview marking={marking} />;

  // State 2: Submitted but not issued — show waiting card
  const paperEntry = papers.find((p) => p.paperId === paperId);
  if (paperEntry?.submissionStatus === 'submitted' || paperEntry?.submissionStatus === 'graded' || paperEntry?.submissionStatus === 'published') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submitted — awaiting result</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {paperEntry.submittedAt
              ? `Submitted on ${new Date(paperEntry.submittedAt).toLocaleDateString()}. `
              : ''}
            Your teacher will mark and issue your result soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  // State 3: Not yet taken — show test-taking UI
  return <StudentTestTakeView paperId={paperId} />;
}
```

Note: after Task 11a, when a marking exists but is not issued, the `submissionStatus` returned for the paper-student will be `'submitted'` (down-graded from `'graded'`). The `graded`/`published` branches above remain as belt-and-braces in case the down-grade doesn't fire for some edge case.

- [ ] **Step 3: Verify type-check + line counts**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit && wc -l "src/app/(dashboard)/student/tests/[paperId]/page.tsx" src/components/student/StudentTestTakeView.tsx`
Expected: no errors; both files under 350 lines.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/student/tests/[paperId]/page.tsx" src/components/student/StudentTestTakeView.tsx
git commit -m "feat(marking): three-state resolution on student paper page"
```

---

### Task 22: Tests list — enable CTA when result issued

**Files:**
- Modify: `src/app/(dashboard)/student/tests/page.tsx`

The backend now down-grades `graded`/`published` to `submitted` when the marking isn't issued (Task 11a). So `graded`/`published` here is guaranteed to mean "issued", and we can safely make the CTA actionable.

- [ ] **Step 1: Enable the CTA for marked/published states**

In [src/app/(dashboard)/student/tests/page.tsx](../../../campusly-frontend/src/app/(dashboard)/student/tests/page.tsx) at lines 27-30, replace:

```tsx
case 'graded':
  return { label: 'Marked', variant: 'default', ctaLabel: 'Marked', ctaDisabled: true };
case 'published':
  return { label: 'On gradebook', variant: 'default', ctaLabel: 'On gradebook', ctaDisabled: true };
```

with:

```tsx
case 'graded':
  return { label: 'Marked', variant: 'default', ctaLabel: 'View result', ctaDisabled: false };
case 'published':
  return { label: 'On gradebook', variant: 'default', ctaLabel: 'View result', ctaDisabled: false };
```

- [ ] **Step 2: Verify type-check**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/student/tests/page.tsx"
git commit -m "feat(marking): tests list opens result on marked/published"
```

---

## Phase 6 — End-to-end verification

### Task 23: Manual in-browser verification

**Files:**
- None — runtime verification only

- [ ] **Step 1: Start both dev servers**

```bash
# Terminal A — backend
cd c:/Users/shaun/campusly-backend
npm run dev

# Terminal B — frontend
cd c:/Users/shaun/campusly-frontend
npm run dev
```

Wait for both to log "ready" / "listening". Backend at `http://localhost:4500`, frontend at `http://localhost:3500`.

- [ ] **Step 2: Run the teacher flow**

Log in as a teacher. Navigate to a paper that has one or more student submissions.

1. Upload images for one student → marking completes.
2. On the review screen:
   - Confirm thumbnails appear (3-up + "View all N pages" button).
   - Click a thumbnail → lightbox opens; arrow-keys / chevron buttons navigate.
   - Click "Download PDF" → file downloads, opens, shows marked pages with the header (student name, score, marked date).
3. Edit a question's marks → click "Save adjustments" → toast confirms.
4. Click "Issue Result" → dialog opens with renamed copy ("Issue result to student", "Issue Result" confirm button) → confirm.
5. Button label changes to "Re-issue", issued date caption appears.
6. Click "Re-issue" with the same assessment → toast confirms; no duplicate notification fires for the student.

- [ ] **Step 3: Run the student flow**

Log in as the student whose marking was just issued.

1. Notification appears (in-app bell icon shows "<Paper> result available").
2. Navigate to Tests list → that paper shows "Marked" badge with "View result" CTA enabled.
3. Click → see `StudentMarkingReview`: header card with score, View marked pages, Download PDF, per-question cards each showing answer / correct / feedback / "Rationale" (NOT "AI Rationale").
4. Open lightbox → swipe / arrows / page indicator work.
5. Click Download PDF → file downloads with the correct content.

- [ ] **Step 4: Edge cases**

1. Submit a paper as student → log out → log in as teacher → marking is pending issue → log in as student → student tests page shows "Submitted — awaiting result" placeholder, NOT the test-taking UI.
2. As a student in a *different* school, try to fetch `/api/ai-tools/students/me/markings/<id>` for someone else's marking ID → expect 404.
3. Attempt to fetch `/uploads/markings/<id>/page-1.jpg` directly in the browser → expect 404 with `Use the API endpoint to access marking images`.

- [ ] **Step 5: Capture findings**

If anything is broken or feels off, list it and fix in a follow-up task before declaring done. If all checks pass, the feature is complete.

- [ ] **Step 6: Final commit (only if any fixes were needed during verification)**

```bash
# Only if you had to patch something during verification
cd <repo>
git add <files>
git commit -m "fix(marking): <specific finding from verification>"
```

---

## Done

When all tasks are checked, the spec at [docs/superpowers/specs/2026-05-14-marking-issue-result-and-pdf-design.md](../specs/2026-05-14-marking-issue-result-and-pdf-design.md) is fully implemented.
