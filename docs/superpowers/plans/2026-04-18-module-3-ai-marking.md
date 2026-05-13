# Module 3 — AI Marking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the existing single-student AI-marking flow to a production-ready whole-class workflow: bulk image upload, AI-driven student matching against class roster, parallel marking with concurrency cap, and lazy auto-creation of the linked Assessment when publishing to gradebook. Original images archived to filesystem for audit + re-mark.

**Architecture:** Backend-first. Add `AssessmentPaper.version` (auto-incremented) + `PaperMarking.paperVersion` for stale detection. Refactor `mark-paper` from base64-body to Multer multipart with disk storage at `/uploads/markings/<id>/`. New `MarkingBatch` model + service drives the bulk class flow: header-extract per page → fuzzy-match against class roster → review → spawn N markings (concurrency=3). New `findOrCreateAssessmentForPaper` helper auto-links paper → assessment on first publish. Frontend gets a Single/Whole Class toggle + 3 new bulk components + image strip + stale-marking banner.

**Tech Stack:** Node 20 / TypeScript 6, Mongoose 9, Express 5, Multer (already in deps), Anthropic Claude Vision (already wired); Next.js 16.2.1 / React 19 / TanStack / Axios on the frontend. No automated test runners — smoke verification via curl, `docker exec campusly-mongo mongosh`, browser walkthrough.

**Spec:** [docs/superpowers/specs/2026-04-18-module-3-ai-marking-design.md](../specs/2026-04-18-module-3-ai-marking-design.md)

---

## Conventions

- **Commits:** conventional (`feat(marking):`, `fix(marking):`, `chore(marking):`).
- **Backend dev server:** `cd c:/Users/shaun/campusly-backend && npm run dev` (requires Mongo + Redis up via Docker).
- **Auth helper:** `TOKEN=$(curl -s -X POST http://localhost:4500/api/auth/login -H "Content-Type: application/json" -d '{"email":"superadmin@campusly.co.za","password":"Password1"}' | grep -oP '"accessToken":"[^"]+' | sed 's/"accessToken":"//')`
- **DB IDs:** Greenfield school = `69ce960a98ca4ee738d25416`.
- **File size limit:** every file under 350 lines.
- **No `any`** types. Every `catch (err)` must be `catch (err: unknown)`.
- **Zod v4** non-deprecated API: `from 'zod/v4'`, `z.iso.datetime()`, `z.url()`. Never `z.string().datetime()`.
- **PDF rule** (transitive from Modules 1-2): PDFKit programmatic only, never HTML-to-PDF.
- **Hooks own `apiClient`** — pages and components must not import `apiClient`.

---

## File Structure

**Backend (`campusly-backend/src/modules/`):**

| File | Responsibility |
|---|---|
| `QuestionBank/model-papers.ts` | MODIFY: add `version: number, default: 1` and `assessmentId: ObjectId, default: null` to AssessmentPaper schema |
| `QuestionBank/service-paper-questions.ts` | MODIFY: increment `paper.version` in `addQuestionToPaper`, `updatePaperQuestion`, `deletePaperQuestion`, `regeneratePaperQuestion`, `updatePaperMemo` |
| `AITools/model-marking.ts` | MODIFY: add `images[]`, `paperVersion`, `classId`, `batchId` |
| `AITools/model-marking-batch.ts` | CREATE: `MarkingBatch` schema |
| `AITools/service-marking-images.ts` | CREATE: Multer disk-storage config + `buildImageRecord` |
| `AITools/service-marking.ts` | MODIFY: `markPaperFromImages` reads `Express.Multer.File[]`, persists `images[]` + `paperVersion` |
| `AITools/service-marking-batch.ts` | CREATE: `createBatch`, `extractBatchHeaders`, `matchToRoster`, `confirmBatch`, `cancelBatch` |
| `AITools/service-marking-queries.ts` | MODIFY: `publishMarking` calls `findOrCreateAssessmentForPaper` if no assessmentId |
| `AITools/controller-marking-batch.ts` | CREATE: 4 batch endpoint handlers |
| `AITools/routes.ts` | MODIFY: register 4 batch routes; switch `/mark-paper` to Multer multipart |
| `Academic/service-gradebook-publish.ts` | MODIFY: add `findOrCreateAssessmentForPaper(paperId, schoolId, classId, subjectId)` |

**Frontend (`campusly-frontend/src/`):**

| File | Responsibility |
|---|---|
| `types/marking.ts` | CREATE/MODIFY: `PaperMarkingImage`, extended `PaperMarking`, `MarkingBatch`, `MarkingBatchAmbiguousMatch` types |
| `hooks/useTeacherMarkingBatch.ts` | CREATE: batch lifecycle hook |
| `hooks/useTeacherMarking.ts` | MODIFY: switch `markPaper` to FormData; add `paperVersion` reads |
| `hooks/useTeacherAssessments.ts` | CREATE if not exists: list assessments by class+subject (used by publish dialog) |
| `components/ai-tools/PublishToGradebookDialog.tsx` | MODIFY: remove direct apiClient import; use `useTeacherAssessments`; default to auto-link |
| `app/(dashboard)/teacher/curriculum/mark-papers/page.tsx` | MODIFY: add Single/Whole-Class mode toggle |
| `components/ai-tools/MarkingBulkUpload.tsx` | CREATE: bulk drop zone + paper/class pickers |
| `components/ai-tools/MarkingBatchReview.tsx` | CREATE: review screen with auto-matched + ambiguous + unassigned |
| `components/ai-tools/MarkingBatchProgress.tsx` | CREATE: polled progress while AI marks all students |
| `components/ai-tools/MarkingResults.tsx` | MODIFY: per-question rationale (collapsible) + image strip thumbnails |
| `components/ai-tools/MarkingHistoryTable.tsx` | MODIFY: stale-version badge per row |

---

## Task Order

1–2: Schema additions (AssessmentPaper.version, PaperMarking.images/paperVersion/classId/batchId)
3–5: Backend image storage + version increments + multipart refactor
6: Auto-link Assessment + publish update
7–9: Bulk batch service + routes
10–13: Frontend types + hook + SoC fix + mode toggle
14–16: Bulk UI components (upload, review, progress)
17–18: Marking results polish + stale banner
19: SoC sweep + acceptance smoke

---

### Task 1: `AssessmentPaper.version` + `assessmentId` schema

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/model-papers.ts`

- [ ] **Step 1: Add fields to interface + schema**

In `model-papers.ts`, in `IAssessmentPaper` interface and `assessmentPaperSchema`:

```ts
// Interface additions
version: number;
assessmentId?: Types.ObjectId | null;
```

```ts
// Schema additions (place near aiGenerated/topicIds — keep grouped)
version: { type: Number, required: true, default: 1, min: 1 },
assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', default: null },
```

- [ ] **Step 2: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
```
Expected: clean. Existing service code doesn't read these fields yet.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/model-papers.ts
git commit -m "feat(papers): version + assessmentId on AssessmentPaper

version: monotonic counter for stale-marking detection in Module 3
assessmentId: cached link populated by lazy auto-create flow"
```

---

### Task 2: Increment `version` on every paper mutation

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/QuestionBank/service-paper-questions.ts`

- [ ] **Step 1: Add helper + use in every save path**

In `service-paper-questions.ts`, before each `paper.save()`, increment version:

```ts
// Add this small helper near the imports:
function bumpVersion(paper: { version: number }): void {
  paper.version = (paper.version ?? 1) + 1;
}
```

In every function that calls `paper.save()` after mutating sections/questions:
- `addQuestionToPaper` — call `bumpVersion(paper)` before `await paper.save()`
- `updatePaperQuestion` — same
- `deletePaperQuestion` — same
- `regeneratePaperQuestion` — same

For `updatePaperMemo` (which doesn't save the paper, only the memo), also bump the paper version:

```ts
// In updatePaperMemo, after writing the memo, also bump paper version:
await PaperMemo.updateOne(/* existing memo update */);
await AssessmentPaper.updateOne(
  { _id: paperId, schoolId, isDeleted: false },
  { $inc: { version: 1 } },
);
```

(Use `$inc: { version: 1 }` for memo updates because we don't already have the paper doc loaded; for the question functions that do have the doc loaded, mutate via `bumpVersion(paper)`.)

- [ ] **Step 2: Verify compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
```
Expected: clean.

- [ ] **Step 3: Smoke (skip if Mongo down)**

```bash
docker ps --format '{{.Names}}' | grep -q campusly-mongo || echo "skip — mongo down"
# If up: create a paper, edit a question, verify version went 1 -> 2 in the doc
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/QuestionBank/service-paper-questions.ts
git commit -m "feat(papers): bump version on every question + memo mutation

Memo updates use \$inc; question CRUD uses in-memory bumpVersion before save.
Stale-marking banner in Module 3 will compare marking.paperVersion to this."
```

---

### Task 3: `PaperMarking` schema additions

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/model-marking.ts`

- [ ] **Step 1: Read existing schema for style**

```bash
cat c:/Users/shaun/campusly-backend/src/modules/AITools/model-marking.ts
```

- [ ] **Step 2: Add fields to interface + schema**

```ts
// Interface additions
images: PaperMarkingImage[];
paperVersion: number;
classId?: Types.ObjectId | null;
batchId?: Types.ObjectId | null;
```

```ts
// New nested interface
export interface PaperMarkingImage {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageNumber: number;
}
```

```ts
// Subdoc schema (define at top of file)
const paperMarkingImageSchema = new Schema<PaperMarkingImage>(
  {
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    pageNumber: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

// In paperMarkingSchema (add to existing definition):
images: { type: [paperMarkingImageSchema], default: [] },
paperVersion: { type: Number, required: true, default: 1, min: 1 },
classId: { type: Schema.Types.ObjectId, ref: 'Class', default: null },
batchId: { type: Schema.Types.ObjectId, ref: 'MarkingBatch', default: null },
```

Add an index for batch lookups:
```ts
paperMarkingSchema.index({ batchId: 1 });
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
git add src/modules/AITools/model-marking.ts
git commit -m "feat(marking): add images, paperVersion, classId, batchId to PaperMarking

images[] archives original page images for audit + re-mark.
paperVersion snapshots paper.version at marking time for stale detection.
classId + batchId set when bulk-class flow used."
```

---

### Task 4: `MarkingBatch` model

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/AITools/model-marking-batch.ts`

- [ ] **Step 1: Write the model**

```ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export type MarkingBatchStatus = 'extracting' | 'reviewing' | 'marking' | 'complete' | 'failed';
export type MarkingBatchPaperType = 'generated' | 'assessment';

export interface MarkingBatchAmbiguousMatch {
  imageFilenames: string[];
  extractedName: string | null;
  extractedAdmissionNumber: string | null;
  suggestedStudentIds: Types.ObjectId[];
  confidence: number;
}

export interface MarkingBatchPageExtract {
  filename: string;
  pageNumber: number;
  extractedName: string | null;
  extractedAdmissionNumber: string | null;
  extractedSectionLabel: string | null;
  confidence: number;
  matchedStudentId: Types.ObjectId | null;
}

export interface IMarkingBatch extends Document {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  paperId: Types.ObjectId;
  paperType: MarkingBatchPaperType;
  classId: Types.ObjectId;
  imageCount: number;
  status: MarkingBatchStatus;
  pageExtracts: MarkingBatchPageExtract[];
  matchedCount: number;
  unmatchedCount: number;
  ambiguousMatches: MarkingBatchAmbiguousMatch[];
  errorMessage: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ambiguousMatchSchema = new Schema<MarkingBatchAmbiguousMatch>(
  {
    imageFilenames: { type: [String], default: [] },
    extractedName: { type: String, default: null },
    extractedAdmissionNumber: { type: String, default: null },
    suggestedStudentIds: { type: [Schema.Types.ObjectId], ref: 'Student', default: [] },
    confidence: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false },
);

const pageExtractSchema = new Schema<MarkingBatchPageExtract>(
  {
    filename: { type: String, required: true },
    pageNumber: { type: Number, required: true, min: 1 },
    extractedName: { type: String, default: null },
    extractedAdmissionNumber: { type: String, default: null },
    extractedSectionLabel: { type: String, default: null },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    matchedStudentId: { type: Schema.Types.ObjectId, ref: 'Student', default: null },
  },
  { _id: false },
);

const markingBatchSchema = new Schema<IMarkingBatch>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paperId: { type: Schema.Types.ObjectId, required: true },
    paperType: { type: String, enum: ['generated', 'assessment'], required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    imageCount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['extracting', 'reviewing', 'marking', 'complete', 'failed'],
      default: 'extracting',
    },
    pageExtracts: { type: [pageExtractSchema], default: [] },
    matchedCount: { type: Number, default: 0, min: 0 },
    unmatchedCount: { type: Number, default: 0, min: 0 },
    ambiguousMatches: { type: [ambiguousMatchSchema], default: [] },
    errorMessage: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

markingBatchSchema.index({ schoolId: 1, teacherId: 1, createdAt: -1 });
markingBatchSchema.index({ paperId: 1, classId: 1 });
markingBatchSchema.index({ status: 1, isDeleted: 1 });

export const MarkingBatch = mongoose.model<IMarkingBatch>('MarkingBatch', markingBatchSchema);
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
git add src/modules/AITools/model-marking-batch.ts
git commit -m "feat(marking): MarkingBatch model for bulk class flow

Tracks status: extracting -> reviewing -> marking -> complete/failed.
pageExtracts holds AI-extracted student name/admission/section per image.
ambiguousMatches surfaces low-confidence matches for teacher review."
```

---

### Task 5: Multer config + image record builder

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking-images.ts`

- [ ] **Step 1: Verify Multer is installed + check existing usage**

```bash
grep -n '"multer"' c:/Users/shaun/campusly-backend/package.json
grep -rn "import multer\|from 'multer'" c:/Users/shaun/campusly-backend/src/ | head -5
```
Multer 2.1.1 already in deps. If existing modules use it, mirror their style.

- [ ] **Step 2: Write the helper**

```ts
import path from 'path';
import fs from 'fs';
import multer, { type Options } from 'multer';
import type { PaperMarkingImage } from './model-marking.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_BYTES = 5 * 1024 * 1024;   // 5 MB
const MAX_FILES_PER_REQUEST = 80;          // bulk class can have many; single is gated to 8 in service layer

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function sanitiseExt(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
}

/**
 * Multer config for marking image uploads.
 *
 * For a single-marking upload, files land at:
 *   uploads/markings/<markingId>/page-<n>.<ext>
 *
 * For a batch upload, files land at:
 *   uploads/markings-batch/<batchId>/page-<n>.<ext>
 *
 * The destination + filename are resolved in the request handler using a
 * factory below; Multer is created per-request to inject the destination.
 */
export function createMarkingUpload(destDir: string): multer.Multer {
  ensureDir(destDir);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destDir),
    filename: (_req, file, cb) => {
      // Filename collisions are handled at the caller; we use index-based names like page-1.jpg.
      // Multer needs a unique-ish name here; the caller will rename later.
      const safeExt = sanitiseExt(file.originalname);
      const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      cb(null, `incoming-${stamp}${safeExt}`);
    },
  });

  const fileFilter: Options['fileFilter'] = (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported image type: ${file.mimetype}`));
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES_PER_REQUEST },
  });
}

/**
 * After Multer writes incoming-*.jpg, rename to page-N.<ext> per index.
 * Returns the final image record list ready for PaperMarking.images[].
 */
export function finaliseImages(
  files: Express.Multer.File[],
  destDir: string,
): PaperMarkingImage[] {
  ensureDir(destDir);
  return files.map((file, idx): PaperMarkingImage => {
    const pageNumber = idx + 1;
    const ext = sanitiseExt(file.originalname);
    const finalName = `page-${pageNumber}${ext}`;
    const finalPath = path.join(destDir, finalName);
    fs.renameSync(file.path, finalPath);
    return {
      filename: finalName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      pageNumber,
    };
  });
}

/** Marking storage root: `<repo>/uploads/markings`. */
export function markingDir(markingId: string): string {
  return path.join(process.cwd(), 'uploads', 'markings', markingId);
}

export function batchDir(batchId: string): string {
  return path.join(process.cwd(), 'uploads', 'markings-batch', batchId);
}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
git add src/modules/AITools/service-marking-images.ts
git commit -m "feat(marking): Multer disk-storage config + image record builder

Per-marking dir at uploads/markings/<id>/; per-batch dir at
uploads/markings-batch/<id>/. Whitelist: jpg|jpeg|png|webp.
Per-file 5MB. finaliseImages renames Multer's incoming-*.jpg
to page-N.<ext> in caller-controlled order."
```

---

### Task 6: `findOrCreateAssessmentForPaper` + publish flow update

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/Academic/service-gradebook-publish.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking-queries.ts`

- [ ] **Step 1: Read current publish flow**

```bash
cat c:/Users/shaun/campusly-backend/src/modules/Academic/service-gradebook-publish.ts | head -80
```

- [ ] **Step 2: Add `findOrCreateAssessmentForPaper` to gradebook publish service**

Append:

```ts
import { AssessmentPaper } from '../QuestionBank/model.js';
import type { Types as MTypes } from 'mongoose';
// (Assessment import already present in this file)

/**
 * Find or lazily create an Assessment record linked to a paper.
 * Idempotent — caches the link on AssessmentPaper.assessmentId.
 */
export async function findOrCreateAssessmentForPaper(input: {
  paperId: string;
  schoolId: string;
  classId: string;
  subjectId: string;
}): Promise<{ _id: MTypes.ObjectId; totalMarks: number }> {
  const paper = await AssessmentPaper.findOne({
    _id: input.paperId,
    schoolId: input.schoolId,
    isDeleted: false,
  });
  if (!paper) throw new NotFoundError('Paper not found');

  // (a) cached link
  if (paper.assessmentId) {
    const existing = await Assessment.findOne({ _id: paper.assessmentId, isDeleted: false });
    if (existing) return { _id: existing._id, totalMarks: existing.totalMarks };
    // cached link is stale (target deleted); fall through to recreate
  }

  // (b) match by metadata
  const byMatch = await Assessment.findOne({
    schoolId: input.schoolId,
    classId: input.classId,
    subjectId: input.subjectId,
    name: paper.title,
    term: paper.term,
    academicYear: paper.year,
    isDeleted: false,
  });
  if (byMatch) {
    paper.assessmentId = byMatch._id;
    await paper.save();
    return { _id: byMatch._id, totalMarks: byMatch.totalMarks };
  }

  // (c) create
  const created = await Assessment.create({
    name: paper.title,
    subjectId: input.subjectId,
    classId: input.classId,
    schoolId: input.schoolId,
    type: 'test',  // adjust if Assessment.type enum differs from PAPER_TYPES
    totalMarks: paper.totalMarks,
    weight: 1,
    term: paper.term,
    academicYear: paper.year,
    date: new Date(),
    paperId: paper._id,
  });
  paper.assessmentId = created._id;
  await paper.save();
  return { _id: created._id, totalMarks: created.totalMarks };
}
```

If `Assessment.type` enum is restrictive and `paper.paperType` doesn't map, hard-code `'test'` as the safe default. The Assessment model should already accept that. Read the model first to confirm.

- [ ] **Step 3: Use it in `publishMarking`**

In `service-marking-queries.ts:publishMarking`, before calling the existing `publishMarkToGradebook`:

```ts
import { findOrCreateAssessmentForPaper } from '../Academic/service-gradebook-publish.js';

// inside publishMarking, after loading the marking:
let assessmentId = input.assessmentId;
if (!assessmentId) {
  if (!marking.classId) {
    throw new BadRequestError('Cannot auto-link Assessment: marking has no classId. Pass assessmentId explicitly.');
  }
  // load paper for subjectId
  const paperInfo = await loadPaperInfo(marking.paperId, marking.paperType, marking.schoolId);
  if (!paperInfo) throw new NotFoundError('Linked paper not found');
  const linked = await findOrCreateAssessmentForPaper({
    paperId: String(marking.paperId),
    schoolId: String(marking.schoolId),
    classId: String(marking.classId),
    subjectId: String(paperInfo.subjectId),
  });
  assessmentId = String(linked._id);
}

// existing publishMarkToGradebook call uses assessmentId now
```

(Adjust the `loadPaperInfo` call to whatever helper exists in `service-marking.ts` — read the existing code to get the correct signature.)

- [ ] **Step 4: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
git add src/modules/Academic/service-gradebook-publish.ts src/modules/AITools/service-marking-queries.ts
git commit -m "feat(marking): lazy auto-link paper -> assessment on first publish

findOrCreateAssessmentForPaper(paperId, schoolId, classId, subjectId):
  1. cached AssessmentPaper.assessmentId, OR
  2. find by metadata match, OR
  3. create from paper metadata.
publishMarking uses it when no assessmentId is in the request body.
Caches the link on AssessmentPaper.assessmentId — idempotent."
```

---

### Task 7: Refactor `markPaperFromImages` to multipart + image archive

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/controller.ts` (or wherever `mark-paper` handler lives)
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/routes.ts` — switch route to Multer middleware

- [ ] **Step 1: Read existing handler + service signature**

```bash
grep -n "mark-paper\|markPaperFromImages" c:/Users/shaun/campusly-backend/src/modules/AITools/{routes.ts,controller.ts,service-marking.ts}
```

- [ ] **Step 2: Update service signature**

In `service-marking.ts`, change `markPaperFromImages` to accept files + multipart fields instead of base64 body:

```ts
import { finaliseImages, markingDir } from './service-marking-images.js';
import fs from 'fs';
import path from 'path';
import { AssessmentPaper } from '../QuestionBank/model.js';

export async function markPaperFromImages(
  teacherId: string,
  schoolId: string,
  payload: {
    paperId: string;
    paperType: 'generated' | 'assessment';
    studentName: string;
    studentId?: string | null;
    classId?: string | null;
    files: Express.Multer.File[];
  },
): Promise<MarkPaperResult> {
  // Step 1: pre-create the marking doc (status: processing) so we have an ID for the dir
  const paperVersion = await loadPaperVersion(payload.paperId, payload.paperType);
  const marking = await PaperMarking.create({
    schoolId, teacherId,
    paperId: payload.paperId,
    paperType: payload.paperType,
    studentName: payload.studentName,
    studentId: payload.studentId ?? null,
    classId: payload.classId ?? null,
    imageCount: payload.files.length,
    paperVersion,
    status: 'processing',
    questions: [],
    totalMarks: 0,
    maxMarks: 0,
    percentage: 0,
  });

  // Step 2: move uploaded files into the marking's directory
  const dir = markingDir(String(marking._id));
  const images = finaliseImages(payload.files, dir);
  marking.images = images;
  await marking.save();

  // Step 3: build base64 + mediaTypes for Claude (existing logic)
  const claudePayload = images.map((img) => ({
    mediaType: img.mimeType,
    base64: fs.readFileSync(path.join(dir, img.filename)).toString('base64'),
  }));

  // Step 4: call Claude — keep existing prompt
  // ... existing AIService.generateVisionCompletionWithImages(...) ...

  // ... rest of the function unchanged: parse response, update marking with results ...

  return { ok: true, marking };
}

async function loadPaperVersion(paperId: string, paperType: 'generated' | 'assessment'): Promise<number> {
  if (paperType === 'assessment') {
    const p = await AssessmentPaper.findById(paperId).select('version');
    return p?.version ?? 1;
  }
  // legacy generated paper has no version
  return 1;
}
```

Adjust the existing in-flow logic for parsing + saving — only the input/persistence shape changes.

- [ ] **Step 3: Update controller**

The handler that currently parses base64 from `req.body` switches to reading `req.files`:

```ts
import { markingDir, createMarkingUpload } from '../AITools/service-marking-images.js';

export async function postMarkPaper(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new BadRequestError('No images provided');
  const { paperId, paperType, studentName, studentId, classId } = req.body as {
    paperId: string; paperType: 'generated' | 'assessment'; studentName: string;
    studentId?: string; classId?: string;
  };
  if (!paperId) throw new BadRequestError('paperId is required');
  if (!studentName) throw new BadRequestError('studentName is required');

  const result = await markPaperFromImages(user.id, user.schoolId!, {
    paperId, paperType: paperType ?? 'assessment', studentName,
    studentId: studentId ?? null, classId: classId ?? null,
    files,
  });
  res.status(201).json(apiResponse(true, result.marking, 'Marking created'));
}
```

- [ ] **Step 4: Update route to use Multer**

In `routes.ts`:

```ts
import { createMarkingUpload, markingDir } from './service-marking-images.js';
import path from 'path';
import os from 'os';

// One-shot multer instance reused for incoming uploads. We use a temp staging dir;
// finaliseImages later moves files into the correct per-marking dir.
const stagingDir = path.join(os.tmpdir(), 'campusly-marking-staging');
const markingUpload = createMarkingUpload(stagingDir);

router.post(
  '/mark-paper',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  markingUpload.array('files', 8),    // single-student max 8 pages
  postMarkPaper,
);
```

- [ ] **Step 5: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
git add src/modules/AITools/{service-marking.ts,controller.ts,routes.ts}
git commit -m "feat(marking): multipart upload + image archive for mark-paper

POST /mark-paper now multipart/form-data with files[] (max 8).
Pre-creates marking doc, moves uploads to /uploads/markings/<id>/,
records images[] + paperVersion. Claude payload reads from disk."
```

---

### Task 8: Bulk batch service — create + extract + match

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking-batch.ts`

- [ ] **Step 1: Write `createBatch` + `extractBatchHeaders` + `matchToRoster`**

```ts
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { MarkingBatch, type IMarkingBatch, type MarkingBatchPageExtract } from './model-marking-batch.js';
import { AssessmentPaper } from '../QuestionBank/model.js';
import { Student } from '../Student/model.js';
import { logger } from '../../common/logger.js';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { batchDir, finaliseImages } from './service-marking-images.js';
import { AIService } from '../../services/ai.service.js';

interface CreateBatchInput {
  teacherId: string;
  schoolId: string;
  paperId: string;
  paperType: 'generated' | 'assessment';
  classId: string;
  files: Express.Multer.File[];
}

export async function createBatch(input: CreateBatchInput): Promise<IMarkingBatch> {
  if (input.files.length === 0) throw new BadRequestError('No images provided');

  const batch = await MarkingBatch.create({
    schoolId: input.schoolId,
    teacherId: input.teacherId,
    paperId: input.paperId,
    paperType: input.paperType,
    classId: input.classId,
    imageCount: input.files.length,
    status: 'extracting',
  });

  // Move uploads into batch dir as page-1, page-2, ...
  const dir = batchDir(String(batch._id));
  finaliseImages(input.files, dir);

  // Kick off async extraction (fire-and-forget)
  void extractBatchHeaders(String(batch._id)).catch((err: unknown) => {
    logger.error({ err, batchId: String(batch._id) }, 'Batch extraction failed');
  });

  return batch;
}

const HEADER_EXTRACTION_PROMPT = `You are reading the top header of a single page of a student's hand-written test paper.
Return JSON only, with this shape:
{
  "studentName": string | null,
  "admissionNumber": string | null,
  "sectionLabel": string | null,
  "confidence": number (0..1)
}
Only extract what is clearly visible. Use null when uncertain. Confidence reflects how clearly you read the name.`;

const headerSchema = {
  type: 'object',
  required: ['studentName', 'admissionNumber', 'sectionLabel', 'confidence'],
  properties: {
    studentName: { type: ['string', 'null'] },
    admissionNumber: { type: ['string', 'null'] },
    sectionLabel: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const;

export async function extractBatchHeaders(batchId: string): Promise<void> {
  const batch = await MarkingBatch.findById(batchId);
  if (!batch || batch.isDeleted) return;

  try {
    const dir = batchDir(batchId);
    const files = fs.readdirSync(dir).filter((f) => f.startsWith('page-')).sort();
    const extracts: MarkingBatchPageExtract[] = [];

    for (let idx = 0; idx < files.length; idx++) {
      const filename = files[idx];
      const filepath = path.join(dir, filename);
      const base64 = fs.readFileSync(filepath).toString('base64');
      const mediaType = `image/${path.extname(filename).slice(1) || 'jpeg'}`;

      try {
        const aiResult = await AIService.generateVisionCompletionWithImages({
          prompt: HEADER_EXTRACTION_PROMPT,
          images: [{ base64, mediaType }],
        });
        const parsed = JSON.parse(aiResult.completion) as {
          studentName: string | null; admissionNumber: string | null;
          sectionLabel: string | null; confidence: number;
        };
        extracts.push({
          filename, pageNumber: idx + 1,
          extractedName: parsed.studentName,
          extractedAdmissionNumber: parsed.admissionNumber,
          extractedSectionLabel: parsed.sectionLabel,
          confidence: parsed.confidence ?? 0,
          matchedStudentId: null,
        });
      } catch (err: unknown) {
        logger.error({ err, batchId, filename }, 'Header extraction failed for image');
        extracts.push({
          filename, pageNumber: idx + 1,
          extractedName: null, extractedAdmissionNumber: null, extractedSectionLabel: null,
          confidence: 0, matchedStudentId: null,
        });
      }
    }

    batch.pageExtracts = extracts;
    await batch.save();

    await matchToRoster(batchId);
  } catch (err: unknown) {
    logger.error({ err, batchId }, 'Batch extraction job failed');
    await MarkingBatch.updateOne(
      { _id: batchId },
      { $set: { status: 'failed', errorMessage: err instanceof Error ? err.message : 'Unknown error' } },
    );
  }
}

function normaliseName(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z\s-]/g, '').replace(/\s+/g, ' ').trim();
}

interface RosterStudent {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
}

interface MatchScore {
  studentId: mongoose.Types.ObjectId;
  confidence: number;
}

function scoreMatches(extract: MarkingBatchPageExtract, roster: RosterStudent[]): MatchScore[] {
  const scores: MatchScore[] = [];
  const ext = normaliseName(extract.extractedName);
  const adm = (extract.extractedAdmissionNumber ?? '').trim();
  for (const s of roster) {
    if (adm && s.admissionNumber && s.admissionNumber.trim().toLowerCase() === adm.toLowerCase()) {
      scores.push({ studentId: s._id, confidence: 1.0 });
      continue;
    }
    if (!ext) continue;
    const full = normaliseName(`${s.firstName} ${s.lastName}`);
    if (full === ext) { scores.push({ studentId: s._id, confidence: 0.95 }); continue; }
    // First-name + surname-initial style (e.g. "S Khumalo")
    const first = normaliseName(s.firstName);
    const last = normaliseName(s.lastName);
    if (ext.includes(first) && ext.includes(last)) { scores.push({ studentId: s._id, confidence: 0.85 }); continue; }
    if (ext === last) { scores.push({ studentId: s._id, confidence: 0.4 }); continue; }
    if (ext === first) { scores.push({ studentId: s._id, confidence: 0.3 }); continue; }
  }
  return scores.sort((a, b) => b.confidence - a.confidence);
}

export async function matchToRoster(batchId: string): Promise<void> {
  const batch = await MarkingBatch.findById(batchId);
  if (!batch) return;

  const roster = await Student.find({ classId: batch.classId, schoolId: batch.schoolId, isDeleted: false })
    .select('firstName lastName admissionNumber')
    .lean<RosterStudent[]>();

  // Group extracts by extractedName + admissionNumber (so multi-page papers stay together)
  const groups = new Map<string, MarkingBatchPageExtract[]>();
  for (const e of batch.pageExtracts) {
    const key = `${(e.extractedName ?? '').toLowerCase()}|${(e.extractedAdmissionNumber ?? '').toLowerCase()}`;
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }

  let matched = 0;
  let unmatched = 0;
  const ambiguous: IMarkingBatch['ambiguousMatches'] = [];

  for (const [key, pages] of groups) {
    const repr = pages[0];
    const scores = scoreMatches(repr, roster);
    const top = scores[0];
    const second = scores[1];

    if (top && top.confidence >= 0.85 && (!second || top.confidence - second.confidence >= 0.1)) {
      // High-confidence match
      pages.forEach((p) => { p.matchedStudentId = top.studentId; });
      matched += pages.length;
    } else {
      unmatched += pages.length;
      ambiguous.push({
        imageFilenames: pages.map((p) => p.filename),
        extractedName: repr.extractedName,
        extractedAdmissionNumber: repr.extractedAdmissionNumber,
        suggestedStudentIds: scores.slice(0, 3).map((s) => s.studentId),
        confidence: top?.confidence ?? 0,
      });
    }
  }

  batch.matchedCount = matched;
  batch.unmatchedCount = unmatched;
  batch.ambiguousMatches = ambiguous;
  batch.status = 'reviewing';
  await batch.save();
}

export async function getBatch(batchId: string, schoolId: string): Promise<IMarkingBatch | null> {
  return MarkingBatch.findOne({ _id: batchId, schoolId, isDeleted: false });
}

export async function cancelBatch(batchId: string, schoolId: string): Promise<void> {
  await MarkingBatch.updateOne(
    { _id: batchId, schoolId },
    { $set: { isDeleted: true, status: 'failed', errorMessage: 'Cancelled by user' } },
  );
}
```

- [ ] **Step 2: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
git add src/modules/AITools/service-marking-batch.ts
git commit -m "feat(marking): bulk batch service — create + extract + roster match

createBatch persists files + spawns async header extraction.
extractBatchHeaders calls Claude Vision per image with header prompt.
matchToRoster groups pages by extracted name+admission, fuzzy matches
against the class roster (1.0 admission / 0.95 full name / 0.85 first+last
within / 0.4 surname only). High confidence (>=0.85, >=0.1 lead over runner-up)
auto-matches; rest land in ambiguousMatches for review."
```

---

### Task 9: Bulk batch service — confirm + concurrent marking spawn

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/service-marking-batch.ts`
- Modify (small): copy files from batch dir into per-marking dirs at confirm time

- [ ] **Step 1: Add `confirmBatch`**

Append to `service-marking-batch.ts`:

```ts
import { markPaperFromImages } from './service-marking.js';
import { markingDir } from './service-marking-images.js';

interface ConfirmAssignment {
  imageFilenames: string[];
  studentId: string;        // resolved student
  studentName: string;      // captured for marking record
}

export async function confirmBatch(
  batchId: string,
  schoolId: string,
  teacherId: string,
  assignments: ConfirmAssignment[],
): Promise<{ spawned: number; failed: number }> {
  const batch = await MarkingBatch.findOne({ _id: batchId, schoolId, isDeleted: false });
  if (!batch) throw new NotFoundError('Batch not found');
  if (batch.status !== 'reviewing') throw new BadRequestError(`Batch in unexpected state: ${batch.status}`);

  batch.status = 'marking';
  await batch.save();

  const dir = batchDir(batchId);

  // Concurrency gate
  const limit = 3;
  let active = 0;
  let spawned = 0;
  let failed = 0;
  const queue: ConfirmAssignment[] = [...assignments];

  await new Promise<void>((resolve) => {
    const next = (): void => {
      if (queue.length === 0 && active === 0) { resolve(); return; }
      while (active < limit && queue.length > 0) {
        const a = queue.shift();
        if (!a) break;
        active += 1;
        runOne(a)
          .then(() => { spawned += 1; })
          .catch((err: unknown) => {
            failed += 1;
            logger.error({ err, batchId, studentId: a.studentId }, 'Marking spawn failed');
          })
          .finally(() => { active -= 1; next(); });
      }
    };

    const runOne = async (a: ConfirmAssignment): Promise<void> => {
      // Build a synthetic Multer.File[] by copying batch files into a temp area for finaliseImages
      const tempFiles = a.imageFilenames.map((fname): Express.Multer.File => {
        const srcPath = path.join(dir, fname);
        return {
          fieldname: 'files',
          originalname: fname,
          encoding: '7bit',
          mimetype: `image/${path.extname(fname).slice(1) || 'jpeg'}`,
          size: fs.statSync(srcPath).size,
          destination: dir,
          filename: fname,
          path: srcPath,
          buffer: Buffer.alloc(0),
          stream: undefined as never,
        } as unknown as Express.Multer.File;
      });

      // markPaperFromImages will move/rename the source files. Since they're shared in the
      // batch dir, we copy them first into a per-marking staging area.
      // Actually, finaliseImages does fs.renameSync — that destroys the originals.
      // Use a copy-first wrapper:
      const stagedFiles = tempFiles.map((f): Express.Multer.File => {
        const stagedPath = path.join(dir, `staged-${a.studentId}-${path.basename(f.path)}`);
        fs.copyFileSync(f.path, stagedPath);
        return { ...f, path: stagedPath, filename: path.basename(stagedPath) } as Express.Multer.File;
      });

      await markPaperFromImages(teacherId, schoolId, {
        paperId: String(batch.paperId),
        paperType: batch.paperType,
        studentName: a.studentName,
        studentId: a.studentId,
        classId: String(batch.classId),
        files: stagedFiles,
      });
    };

    next();
  });

  batch.status = 'complete';
  await batch.save();
  return { spawned, failed };
}
```

The copy-first wrapper exists because `finaliseImages` (Task 5) renames the source files into the marking dir, destroying originals. For batch flow we need the originals to survive across multiple marking spawns.

- [ ] **Step 2: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
git add src/modules/AITools/service-marking-batch.ts
git commit -m "feat(marking): confirmBatch spawns N markings with concurrency=3

Copy-first wrapper preserves source files in batch dir (finaliseImages
renames). Custom semaphore loop avoids BullMQ for now. Marks batch
'complete' when all spawns settle."
```

---

### Task 10: Bulk batch routes + controller

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/AITools/controller-marking-batch.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/AITools/routes.ts`

- [ ] **Step 1: Write controller**

```ts
import { Request, Response } from 'express';
import { z } from 'zod/v4';
import {
  createBatch, getBatch, confirmBatch, cancelBatch,
} from './service-marking-batch.js';
import { apiResponse } from '../../common/utils.js';
import { getUser } from '../../types/authenticated-request.js';
import { BadRequestError } from '../../common/errors.js';

const createBatchBodySchema = z.object({
  paperId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  paperType: z.enum(['generated', 'assessment']).default('assessment'),
  classId: z.string().regex(/^[0-9a-fA-F]{24}$/),
}).strict();

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const confirmBodySchema = z.object({
  assignments: z.array(z.object({
    imageFilenames: z.array(z.string()).min(1),
    studentId: objectIdSchema,
    studentName: z.string().min(1).max(200),
  })).min(1),
}).strict();

export async function postCreateBatch(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) throw new BadRequestError('No images provided');
  const parsed = createBatchBodySchema.parse(req.body);
  const batch = await createBatch({
    teacherId: user.id, schoolId: user.schoolId!,
    paperId: parsed.paperId, paperType: parsed.paperType, classId: parsed.classId,
    files,
  });
  res.status(201).json(apiResponse(true, batch, 'Batch created'));
}

export async function getBatchHandler(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const batch = await getBatch(req.params.id, user.schoolId!);
  res.status(200).json(apiResponse(true, batch, 'OK'));
}

export async function postConfirmBatch(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const parsed = confirmBodySchema.parse(req.body);
  const result = await confirmBatch(req.params.id, user.schoolId!, user.id, parsed.assignments);
  res.status(200).json(apiResponse(true, result, 'Markings spawned'));
}

export async function deleteBatchHandler(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  await cancelBatch(req.params.id, user.schoolId!);
  res.status(204).end();
}
```

- [ ] **Step 2: Wire routes**

In `routes.ts`:

```ts
import os from 'os';
import path from 'path';
import { createMarkingUpload } from './service-marking-images.js';
import {
  postCreateBatch, getBatchHandler, postConfirmBatch, deleteBatchHandler,
} from './controller-marking-batch.js';

const batchStaging = path.join(os.tmpdir(), 'campusly-batch-staging');
const batchUpload = createMarkingUpload(batchStaging);

router.post(
  '/mark-batch',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  batchUpload.array('files', 80),
  postCreateBatch,
);
router.get(
  '/batches/:id',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  getBatchHandler,
);
router.post(
  '/batches/:id/confirm',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  postConfirmBatch,
);
router.delete(
  '/batches/:id',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  deleteBatchHandler,
);
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit 2>&1 | head -10
git add src/modules/AITools/{controller-marking-batch.ts,routes.ts}
git commit -m "feat(marking): wire bulk batch routes

POST /ai-tools/mark-batch       (multipart, files[])
GET  /ai-tools/batches/:id
POST /ai-tools/batches/:id/confirm
DELETE /ai-tools/batches/:id"
```

---

### Task 11: Frontend types

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/types/marking.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/types/index.ts` (re-export if it doesn't conflict; else import directly per Module 2 pattern)

- [ ] **Step 1: Write types**

```ts
export interface PaperMarkingImage {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageNumber: number;
}

export interface PaperMarkingQuestion {
  questionNumber: string;
  awarded: number;
  maxMarks: number;
  feedback?: string;
  rationale?: string;
  studentResponse?: string;
}

export type PaperMarkingStatus = 'processing' | 'completed' | 'needs_review' | 'failed' | 'published';
export type PaperMarkingType = 'generated' | 'assessment';

export interface PaperMarking {
  _id: string;
  schoolId: string;
  teacherId: string;
  paperId: string;
  paperType: PaperMarkingType;
  paperVersion: number;
  studentName: string;
  studentId?: string | null;
  classId?: string | null;
  batchId?: string | null;
  images: PaperMarkingImage[];
  imageCount: number;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  questions: PaperMarkingQuestion[];
  status: PaperMarkingStatus;
  gradebookEntryId?: string | null;
  errorMessage?: string | null;
  extractedHeader?: string | null;
  paperMismatch: boolean;
  mismatchReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MarkingBatchStatus = 'extracting' | 'reviewing' | 'marking' | 'complete' | 'failed';

export interface MarkingBatchPageExtract {
  filename: string;
  pageNumber: number;
  extractedName: string | null;
  extractedAdmissionNumber: string | null;
  extractedSectionLabel: string | null;
  confidence: number;
  matchedStudentId: string | null;
}

export interface MarkingBatchAmbiguousMatch {
  imageFilenames: string[];
  extractedName: string | null;
  extractedAdmissionNumber: string | null;
  suggestedStudentIds: string[];
  confidence: number;
}

export interface MarkingBatch {
  _id: string;
  schoolId: string;
  teacherId: string;
  paperId: string;
  paperType: PaperMarkingType;
  classId: string;
  imageCount: number;
  status: MarkingBatchStatus;
  pageExtracts: MarkingBatchPageExtract[];
  matchedCount: number;
  unmatchedCount: number;
  ambiguousMatches: MarkingBatchAmbiguousMatch[];
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfirmBatchAssignment {
  imageFilenames: string[];
  studentId: string;
  studentName: string;
}
```

- [ ] **Step 2: Re-export (or follow Module 2's barrel-conflict pattern)**

```bash
grep -n "export" c:/Users/shaun/campusly-frontend/src/types/index.ts | head -10
```

If there's no name conflict, add `export * from './marking';`. If there's a conflict with an existing `PaperMarking` type, follow Module 2's precedent: leave a comment in `index.ts`, import directly from `@/types/marking` everywhere.

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
git add src/types/marking.ts src/types/index.ts
git commit -m "feat(types): PaperMarking with images/paperVersion + MarkingBatch types

Mirrors backend shapes exactly. ConfirmBatchAssignment for the batch
confirm payload."
```

---

### Task 12: `useTeacherMarkingBatch` hook + `useTeacherMarking` multipart switch

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/useTeacherMarkingBatch.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/hooks/useTeacherMarking.ts`

- [ ] **Step 1: New batch hook**

```ts
'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { MarkingBatch, ConfirmBatchAssignment } from '@/types/marking';

export function useTeacherMarkingBatch(): {
  createBatch: (paperId: string, paperType: 'generated' | 'assessment', classId: string, files: File[]) => Promise<MarkingBatch | null>;
  getBatch: (id: string) => Promise<MarkingBatch | null>;
  confirmBatch: (id: string, assignments: ConfirmBatchAssignment[]) => Promise<{ spawned: number; failed: number } | null>;
  cancelBatch: (id: string) => Promise<boolean>;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);

  const createBatch = useCallback(async (paperId, paperType, classId, files) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('paperId', paperId);
      fd.append('paperType', paperType);
      fd.append('classId', classId);
      files.forEach((f) => fd.append('files', f));
      const res = await apiClient.post('/ai-tools/mark-batch', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrapResponse(res) as MarkingBatch;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Batch upload failed');
      return null;
    } finally { setLoading(false); }
  }, []);

  const getBatch = useCallback(async (id) => {
    try {
      const res = await apiClient.get(`/ai-tools/batches/${id}`);
      return unwrapResponse(res) as MarkingBatch;
    } catch {
      return null;
    }
  }, []);

  const confirmBatch = useCallback(async (id, assignments) => {
    try {
      const res = await apiClient.post(`/ai-tools/batches/${id}/confirm`, { assignments });
      return unwrapResponse(res) as { spawned: number; failed: number };
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Confirm failed');
      return null;
    }
  }, []);

  const cancelBatch = useCallback(async (id) => {
    try {
      await apiClient.delete(`/ai-tools/batches/${id}`);
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
      return false;
    }
  }, []);

  return { createBatch, getBatch, confirmBatch, cancelBatch, loading };
}
```

- [ ] **Step 2: Update `useTeacherMarking.markPaper` to multipart**

In `useTeacherMarking.ts`, replace the existing base64 markPaper with FormData:

```ts
const markPaper = useCallback(async (
  paperId: string,
  paperType: 'generated' | 'assessment',
  studentName: string,
  files: File[],
  options?: { studentId?: string; classId?: string },
) => {
  try {
    const fd = new FormData();
    fd.append('paperId', paperId);
    fd.append('paperType', paperType);
    fd.append('studentName', studentName);
    if (options?.studentId) fd.append('studentId', options.studentId);
    if (options?.classId) fd.append('classId', options.classId);
    files.forEach((f) => fd.append('files', f));
    const res = await apiClient.post('/ai-tools/mark-paper', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapResponse(res);
  } catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : 'Marking failed');
    return null;
  }
}, []);
```

(Update the calling component `MarkingUpload.tsx` to pass `files: File[]` directly instead of converting to base64.)

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
git add src/hooks/useTeacherMarkingBatch.ts src/hooks/useTeacherMarking.ts
git commit -m "feat(marking): useTeacherMarkingBatch + multipart markPaper

Batch hook covers create/get/confirm/cancel. markPaper switched to
FormData uploads — no more base64 in JSON bodies."
```

---

### Task 13: `PublishToGradebookDialog` SoC fix

**Files:**
- Create or modify: `c:/Users/shaun/campusly-frontend/src/hooks/useTeacherAssessments.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/components/ai-tools/PublishToGradebookDialog.tsx`

- [ ] **Step 1: Check for existing assessments hook**

```bash
grep -rn "useTeacherAssessments\|fetchAssessments" c:/Users/shaun/campusly-frontend/src/hooks/ 2>/dev/null
```

If a similar hook exists, reuse. Else create:

```ts
'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { AxiosResponse } from 'axios';

interface AssessmentLite {
  _id: string;
  name: string;
  totalMarks: number;
  classId: string;
  subjectId: string;
}

export function useTeacherAssessments(params: { classId?: string; subjectId?: string }): {
  assessments: AssessmentLite[];
  loading: boolean;
} {
  const [assessments, setAssessments] = useState<AssessmentLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query: Record<string, string> = {};
    if (params.classId) query.classId = params.classId;
    if (params.subjectId) query.subjectId = params.subjectId;
    apiClient
      .get('/academic/assessments', { params: query })
      .then((res: AxiosResponse) => { if (!cancelled) setAssessments(unwrapList(res) as AssessmentLite[]); })
      .catch(() => { if (!cancelled) setAssessments([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.classId, params.subjectId]);

  return { assessments, loading };
}
```

- [ ] **Step 2: Replace the apiClient import in `PublishToGradebookDialog`**

In `PublishToGradebookDialog.tsx`, remove the direct `apiClient.get('/academic/assessments')` call and import the hook:

```ts
import { useTeacherAssessments } from '@/hooks/useTeacherAssessments';
// ...
const { assessments, loading } = useTeacherAssessments({ classId, subjectId });
```

The dialog now defaults the picker to "Auto-create from paper" — only shows the existing-assessment dropdown when teacher explicitly chooses "Pick existing".

- [ ] **Step 3: Verify SoC + commit**

```bash
grep -n "apiClient" c:/Users/shaun/campusly-frontend/src/components/ai-tools/PublishToGradebookDialog.tsx
# expect: zero matches

cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
git add src/hooks/useTeacherAssessments.ts src/components/ai-tools/PublishToGradebookDialog.tsx
git commit -m "fix(marking): SoC — PublishToGradebookDialog uses hook

Dialog no longer imports apiClient directly. Auto-link is the default;
'pick existing' is the override path."
```

---

### Task 14: Single/Whole-Class mode toggle

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/curriculum/mark-papers/page.tsx`

- [ ] **Step 1: Read current page**

```bash
cat c:/Users/shaun/campusly-frontend/src/app/\(dashboard\)/teacher/curriculum/mark-papers/page.tsx
```

- [ ] **Step 2: Add mode toggle**

Wrap the existing 5-step wizard in a tab structure:

```tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkingBulkUpload } from '@/components/ai-tools/MarkingBulkUpload';
import { MarkingBatchReview } from '@/components/ai-tools/MarkingBatchReview';
import { MarkingBatchProgress } from '@/components/ai-tools/MarkingBatchProgress';

// inside the component, around the existing wizard:
const [bulkBatchId, setBulkBatchId] = useState<string | null>(null);

return (
  <Tabs defaultValue="single">
    <TabsList>
      <TabsTrigger value="single">Single Student</TabsTrigger>
      <TabsTrigger value="class">Whole Class</TabsTrigger>
      <TabsTrigger value="history">History</TabsTrigger>
    </TabsList>
    <TabsContent value="single">
      {/* existing 5-step wizard */}
    </TabsContent>
    <TabsContent value="class">
      {!bulkBatchId && <MarkingBulkUpload onCreated={setBulkBatchId} />}
      {bulkBatchId && <BulkBatchFlow batchId={bulkBatchId} onDone={() => setBulkBatchId(null)} />}
    </TabsContent>
    <TabsContent value="history">
      {/* existing history table */}
    </TabsContent>
  </Tabs>
);

// BulkBatchFlow renders MarkingBatchReview while status=='reviewing',
// MarkingBatchProgress while status=='marking', and a summary when 'complete'.
function BulkBatchFlow({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  // poll batch state, switch components by status — implementation follows in Tasks 15+16
  // ...
}
```

Don't write `BulkBatchFlow` fully here — it's a thin orchestrator. The components it composes are built in Tasks 15-16. Use a placeholder `<div>Loading batch flow...</div>` until those tasks land.

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
git add "src/app/(dashboard)/teacher/curriculum/mark-papers/page.tsx"
git commit -m "feat(marking): Single/Whole-Class mode toggle on mark-papers page

Existing 5-step wizard moves under 'Single Student' tab.
'Whole Class' tab hosts the new bulk flow (components in Tasks 15-16).
'History' tab keeps the existing history table."
```

---

### Task 15: `MarkingBulkUpload` component

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingBulkUpload.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState } from 'react';
import { useTeacherMarkingBatch } from '@/hooks/useTeacherMarkingBatch';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';

interface Props {
  onCreated: (batchId: string) => void;
}

export function MarkingBulkUpload({ onCreated }: Props) {
  const { createBatch, loading } = useTeacherMarkingBatch();
  const { papers } = useTeacherPapers();
  const { classes } = useTeacherClasses();
  const [paperId, setPaperId] = useState('');
  const [classId, setClassId] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (): Promise<void> => {
    const batch = await createBatch(paperId, 'assessment', classId, files);
    if (batch?._id) onCreated(batch._id);
  };

  const canSubmit = paperId && classId && files.length > 0 && !loading;

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <Label>Paper</Label>
        <Select onValueChange={setPaperId} value={paperId}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select paper" /></SelectTrigger>
          <SelectContent>
            {papers.filter((p) => p.status !== 'archived').map((p) => (
              <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Class</Label>
        <Select onValueChange={setClassId} value={classId}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Images (max 80)</Label>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm border rounded-md p-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {files.length === 0 ? 'Drop or pick photos of every student\'s pages.' : `${files.length} files selected`}
        </p>
      </div>

      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
        <Upload className="h-4 w-4 mr-2" />
        {loading ? 'Uploading...' : 'Upload & Extract Headers'}
      </Button>
    </div>
  );
}
```

(Adjust import paths if `useTeacherPapers` / `useTeacherClasses` have different return shapes.)

- [ ] **Step 2: Wire into the page's `BulkBatchFlow` placeholder from Task 14**

Replace the placeholder with:

```tsx
function BulkBatchFlow({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  // Will be expanded in Task 16 to switch by batch.status
  return <p>Batch {batchId} extracting... (review UI in next task)</p>;
}
```

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
git add src/components/ai-tools/MarkingBulkUpload.tsx "src/app/(dashboard)/teacher/curriculum/mark-papers/page.tsx"
git commit -m "feat(marking): MarkingBulkUpload component

Paper + class pickers + multi-file image input. POST to /mark-batch
returns batch id, parent component takes over with the review flow."
```

---

### Task 16: `MarkingBatchReview` + `MarkingBatchProgress`

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingBatchReview.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingBatchProgress.tsx`
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/curriculum/mark-papers/page.tsx` — wire `BulkBatchFlow` properly

- [ ] **Step 1: Write `MarkingBatchReview`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTeacherMarkingBatch } from '@/hooks/useTeacherMarkingBatch';
import { useTeacherStudents } from '@/hooks/useTeacherStudents';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { MarkingBatch, ConfirmBatchAssignment } from '@/types/marking';

interface Props {
  batch: MarkingBatch;
  onConfirmed: () => void;
}

export function MarkingBatchReview({ batch, onConfirmed }: Props) {
  const { confirmBatch } = useTeacherMarkingBatch();
  const { students } = useTeacherStudents({ classId: batch.classId });

  // local state — assignments map: imageFilenames-key -> studentId
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => { setOverrides({}); }, [batch._id]);

  const buildAssignments = (): ConfirmBatchAssignment[] => {
    // Auto-matched groups (matchedStudentId set on pageExtracts)
    const autoGroups = new Map<string, { filenames: string[]; studentId: string }>();
    for (const e of batch.pageExtracts) {
      if (!e.matchedStudentId) continue;
      const k = e.matchedStudentId;
      const arr = autoGroups.get(k) ?? { filenames: [], studentId: k };
      arr.filenames.push(e.filename);
      autoGroups.set(k, arr);
    }

    // Ambiguous groups — only included if teacher overrode
    const ambiguousAssignments: ConfirmBatchAssignment[] = [];
    for (const a of batch.ambiguousMatches) {
      const key = a.imageFilenames.join(',');
      const sid = overrides[key];
      if (!sid) continue;
      const student = students.find((s) => s._id === sid);
      ambiguousAssignments.push({
        imageFilenames: a.imageFilenames,
        studentId: sid,
        studentName: student ? `${student.firstName} ${student.lastName}` : (a.extractedName ?? 'Unknown'),
      });
    }

    const autoAssignments: ConfirmBatchAssignment[] = Array.from(autoGroups.values()).map((g) => {
      const student = students.find((s) => s._id === g.studentId);
      return {
        imageFilenames: g.filenames,
        studentId: g.studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      };
    });

    return [...autoAssignments, ...ambiguousAssignments];
  };

  const handleConfirm = async (): Promise<void> => {
    const assignments = buildAssignments();
    if (assignments.length === 0) return;
    const result = await confirmBatch(batch._id, assignments);
    if (result) onConfirmed();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Badge variant="default">{batch.matchedCount} auto-matched</Badge>
        <Badge variant="secondary">{batch.unmatchedCount} need review</Badge>
      </div>

      {batch.ambiguousMatches.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Ambiguous matches — pick the right student:</h3>
          {batch.ambiguousMatches.map((a) => {
            const key = a.imageFilenames.join(',');
            return (
              <Card key={key}>
                <CardContent className="p-3 space-y-2">
                  <p className="text-sm">
                    {a.imageFilenames.length} page(s) — extracted: <strong>{a.extractedName ?? '(none)'}</strong>
                    {a.extractedAdmissionNumber ? ` / ${a.extractedAdmissionNumber}` : ''}
                  </p>
                  <Select value={overrides[key] ?? ''} onValueChange={(v) => setOverrides({ ...overrides, [key]: v })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Choose student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s._id} value={s._id}>{s.firstName} {s.lastName} {s.admissionNumber ? `(${s.admissionNumber})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Button onClick={handleConfirm} className="w-full">
        Confirm & Mark {batch.matchedCount + Object.keys(overrides).length} students
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Write `MarkingBatchProgress`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTeacherMarkingBatch } from '@/hooks/useTeacherMarkingBatch';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { MarkingBatch } from '@/types/marking';

interface Props {
  batchId: string;
  onComplete: (batch: MarkingBatch) => void;
}

export function MarkingBatchProgress({ batchId, onComplete }: Props) {
  const { getBatch } = useTeacherMarkingBatch();
  const [batch, setBatch] = useState<MarkingBatch | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async (): Promise<void> => {
      const b = await getBatch(batchId);
      if (cancelled) return;
      setBatch(b);
      if (b && (b.status === 'complete' || b.status === 'failed')) {
        onComplete(b);
        return;
      }
      setTimeout(tick, 3000);
    };
    void tick();
    return () => { cancelled = true; };
  }, [batchId, getBatch, onComplete]);

  if (!batch) return <LoadingSpinner />;
  return (
    <div className="space-y-2 text-center py-8">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">
        Status: {batch.status} — {batch.matchedCount} markings in progress
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Wire `BulkBatchFlow` in the page**

Replace the placeholder in `mark-papers/page.tsx`:

```tsx
import { MarkingBatchReview } from '@/components/ai-tools/MarkingBatchReview';
import { MarkingBatchProgress } from '@/components/ai-tools/MarkingBatchProgress';
import { useEffect, useState } from 'react';

function BulkBatchFlow({ batchId, onDone }: { batchId: string; onDone: () => void }) {
  const { getBatch } = useTeacherMarkingBatch();
  const [batch, setBatch] = useState<MarkingBatch | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async (): Promise<void> => {
      const b = await getBatch(batchId);
      if (cancelled) return;
      setBatch(b);
      if (b && b.status === 'extracting') setTimeout(tick, 2000);
    };
    void tick();
    return () => { cancelled = true; };
  }, [batchId, getBatch]);

  if (!batch) return <LoadingSpinner />;
  if (batch.status === 'extracting') return <p>AI is reading paper headers...</p>;
  if (batch.status === 'reviewing') return <MarkingBatchReview batch={batch} onConfirmed={() => setBatch({ ...batch, status: 'marking' })} />;
  if (batch.status === 'marking') return <MarkingBatchProgress batchId={batchId} onComplete={() => onDone()} />;
  if (batch.status === 'failed') return <p className="text-destructive">Batch failed: {batch.errorMessage}</p>;
  return <p>Done — switch to History tab to see markings.</p>;
}
```

- [ ] **Step 4: Verify compile + size + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l src/components/ai-tools/MarkingBatchReview.tsx src/components/ai-tools/MarkingBatchProgress.tsx "src/app/(dashboard)/teacher/curriculum/mark-papers/page.tsx"
git add -u
git commit -m "feat(marking): MarkingBatchReview + Progress + page integration

Review screen renders auto-matched count + ambiguous-match selectors.
Progress polls batch state every 3s during marking. Page's BulkBatchFlow
swaps components based on batch.status."
```

---

### Task 17: `MarkingResults` rationale + image strip

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingResults.tsx`

- [ ] **Step 1: Read existing component**

```bash
cat c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingResults.tsx
```

- [ ] **Step 2: Add per-question rationale (collapsible) + image strip**

Inside the questions render loop, surface `question.rationale` (already returned by Claude) in a `<details>` element:

```tsx
<details className="text-xs text-muted-foreground mt-1">
  <summary className="cursor-pointer">AI rationale</summary>
  <p className="whitespace-pre-wrap">{q.rationale ?? '(none)'}</p>
</details>
```

Add image strip near the top of the marking detail:

```tsx
{marking.images && marking.images.length > 0 && (
  <div className="flex gap-2 overflow-x-auto py-2">
    {marking.images.map((img) => (
      <a
        key={img.filename}
        href={`/uploads/markings/${marking._id}/${img.filename}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 border rounded overflow-hidden hover:border-primary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/uploads/markings/${marking._id}/${img.filename}`}
          alt={`Page ${img.pageNumber}`}
          className="h-32 w-auto object-cover"
        />
      </a>
    ))}
  </div>
)}
```

Note: the URL uses an absolute path `/uploads/...`. The backend serves these from its own port (4500). If the frontend runs at 3500, you need a fully-qualified URL — check with the existing pattern in the codebase. If the frontend uses an `NEXT_PUBLIC_API_URL` env, prefix accordingly.

- [ ] **Step 3: Verify compile + size + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
wc -l src/components/ai-tools/MarkingResults.tsx
git add src/components/ai-tools/MarkingResults.tsx
git commit -m "feat(marking): per-question AI rationale + image strip

<details> element exposes Claude's per-question reasoning on demand.
Image thumbnails strip at the top of detail view links to full image."
```

---

### Task 18: Stale-marking banner

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingResults.tsx`
- Modify: `c:/Users/shaun/campusly-frontend/src/components/ai-tools/MarkingHistoryTable.tsx`

- [ ] **Step 1: In `MarkingResults`, fetch paper version + compare**

Use `useTeacherPapers().getPaperById(marking.paperId)` to load the paper, compare versions:

```tsx
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
// ...
const { getPaperById } = useTeacherPapers();
const [paperVersion, setPaperVersion] = useState<number | null>(null);

useEffect(() => {
  if (marking.paperType !== 'assessment') return;
  void getPaperById(marking.paperId).then((p) => setPaperVersion(p?.version ?? null));
}, [marking.paperId, marking.paperType, getPaperById]);

const isStale = paperVersion !== null && marking.paperVersion < paperVersion;

// Render near top:
{isStale && (
  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
    <p className="text-sm font-medium">Paper edited since this marking</p>
    <p className="text-xs text-muted-foreground">
      Re-mark recommended. Marking captured paper v{marking.paperVersion}, current is v{paperVersion}.
    </p>
  </div>
)}
```

- [ ] **Step 2: In `MarkingHistoryTable`, add a stale badge per row**

Same comparison; show a `<Badge variant="destructive">stale</Badge>` next to the status badge when `marking.paperVersion < paperVersion`.

To avoid N papers fetched (one per row), consider hoisting the version fetch into a parent or letting the badge be best-effort (only render when paper data is already in the local state).

Pragmatic minimum: if `marking.status === 'published'` and the paper version doesn't match, just show the badge from the marking detail page (Step 1). Don't fetch for every row in the table.

- [ ] **Step 3: Verify compile + commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit 2>&1 | head -10
git add src/components/ai-tools/{MarkingResults.tsx,MarkingHistoryTable.tsx}
git commit -m "feat(marking): stale-marking banner

Detail view fetches paper version, banner shows when marking captured
an older version. History table shows badge when comparison is cheap
(skip per-row fetch to avoid N+1)."
```

---

### Task 19: SoC sweep + acceptance smoke

**Files:** the whole `/teacher/curriculum/mark-papers` and `components/ai-tools` tree.

- [ ] **Step 1: SoC grep**

```bash
cd c:/Users/shaun/campusly-frontend
echo "=== apiClient leaks ==="
grep -rn "apiClient" "src/app/(dashboard)/teacher/curriculum/mark-papers" "src/components/ai-tools" 2>/dev/null
echo "=== : any ==="
grep -rn ": any\b\|as any\b" "src/app/(dashboard)/teacher/curriculum/mark-papers" "src/components/ai-tools" 2>/dev/null
echo "=== text-red-* ==="
grep -rn "text-red-\|bg-red-" "src/app/(dashboard)/teacher/curriculum/mark-papers" "src/components/ai-tools" 2>/dev/null
echo "=== catch (err) without unknown ==="
grep -rn "catch (err)\b\|catch(err)\b" "src/app/(dashboard)/teacher/curriculum/mark-papers" "src/components/ai-tools" 2>/dev/null
```

All zero. Any match: investigate, fix, repeat.

- [ ] **Step 2: File sizes**

```bash
cd c:/Users/shaun/campusly-frontend
find "src/app/(dashboard)/teacher/curriculum/mark-papers" "src/components/ai-tools" -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -nr | head -15
cd c:/Users/shaun/campusly-backend
find src/modules/AITools -name "*.ts" -not -name "*.test.ts" | xargs wc -l | sort -nr | head -10
```

All under 350.

- [ ] **Step 3: Final compile**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Both clean.

- [ ] **Step 4: End-to-end smoke (if Docker + backend up)**

```bash
docker start campusly-mongo campusly-redis 2>/dev/null
cd c:/Users/shaun/campusly-backend && npm run dev &
cd c:/Users/shaun/campusly-frontend && npm run dev &
```

Walk through:

1. Login as `superadmin@campusly.co.za / Password1` at `http://localhost:3500/login`.
2. Generate a CAPS-aligned paper via the Module 2 wizard. Note its title + class + topics.
3. Print 3 sample pages (or grab any paper photo) — same handwriting on each so name extraction has a chance.
4. Go to `/teacher/curriculum/mark-papers`, "Single Student" tab.
5. Pick the paper, type a student name, upload 3 images.
6. Marking should complete or land in `needs_review`. Review the per-question marks + AI rationale.
7. Click "Publish to gradebook" — confirm the dialog defaults to auto-link, click confirm. Verify the Mark record appears in the class gradebook.
8. Switch to "Whole Class" tab. Pick same paper, same class, upload 6+ images.
9. Wait for header extraction (~2-30s). Review screen shows auto-matched + ambiguous (might be a mix depending on header legibility).
10. Resolve ambiguous via dropdown. Confirm.
11. Progress screen polls; markings complete one by one.
12. Switch to History tab. All markings visible. Publish each (or batch-publish if exposed).
13. Edit one of the paper's questions. Reload the marking detail — see the "Paper edited" banner.

If any step fails: file as Module 3 follow-up.

- [ ] **Step 5: Commit any sweep fixes**

```bash
cd c:/Users/shaun/campusly-frontend
git add -u
git commit -m "chore(marking): SoC sweep + acceptance smoke

Zero apiClient leaks in pages/components. Zero any types. Zero text-red-*.
All files <350 lines. tsc clean across both repos. End-to-end smoke
walks single + bulk + publish + stale-banner paths."
```

---

## Self-Review (post-write)

**Spec coverage:**
- §3.1 filesystem image archive → Tasks 5, 7
- §3.2 bulk class flow with header extraction → Tasks 4, 8, 9, 10, 14, 15, 16
- §3.3 lazy auto-link paper→assessment → Task 6
- §3.4 paper-version stale detection → Tasks 1, 2, 18
- §3.5 Module 2 paperType compatibility → Tasks 4, 8 (both branches handled in `loadPaperVersion` + paperType field on batch)
- §3.6 SoC compliance → Task 13, 19
- §4.1 PaperMarking schema → Task 3
- §4.2 AssessmentPaper schema → Task 1
- §4.3 MarkingBatch model → Task 4
- §5.1 new routes → Task 10
- §5.2 modified endpoints → Tasks 6, 7
- §5.3 new service files → Tasks 5, 8, 9
- §5.4 modified services → Tasks 6, 7
- §5.5 roster fuzzy match → Task 8
- §5.6 concurrency guard → Task 9
- §6.1 routes & components → Tasks 14, 15, 16
- §6.2 new hooks → Task 12
- §6.3 type updates → Task 11
- §6.4 stale banner → Task 18
- §6.5 image display → Task 17
- §7 user flow → Task 19 (manual smoke)
- §10 acceptance criteria → Task 19 + scattered

**Placeholder scan:** none (all code blocks are real implementations or honest "see Module N" pointers to working code).

**Type consistency:**
- `PaperMarkingImage` defined in Task 3 (backend) + Task 11 (frontend) — same shape.
- `MarkingBatch` defined in Task 4 (backend) + Task 11 (frontend) — same shape.
- `ConfirmBatchAssignment` used in Task 9, 10, 11, 12 — consistent shape.
- `markPaperFromImages` signature changes in Task 7 — consumers (Task 9 batch confirm, Task 12 hook) all use the new shape.
- `findOrCreateAssessmentForPaper` defined in Task 6, used by Task 6's publish update — single source.

**Known gap:** the smoke step in Task 19 explicitly requires a real photo of a real paper. Without that, Claude Vision can't be exercised end-to-end. If the team only has digitally-printed papers, header extraction will work fine but per-question marking won't have handwritten content to grade.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-module-3-ai-marking.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task with two-stage review between tasks. Same pattern that delivered Modules 1 + 2.

**2. Inline Execution** — I run tasks here with checkpoints for your review.

Which approach?
