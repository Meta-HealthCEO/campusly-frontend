# Module 3 — AI Marking (Production-Ready) — Design Spec

**Status:** Draft
**Date:** 2026-04-18
**Author:** Shaun + Claude
**Part of:** Teacher Portal Production-Readiness, module-by-module pass

## 1. Goal

Take the existing AI-marking system from "works for one student at a time" to "production-grade for a solo teacher's whole class workflow". A teacher uploads photos of every student's handwritten paper, Claude Vision reads each page's header, the system auto-routes pages to the right student via class-roster fuzzy match, marks each paper, and publishes all marks to the gradebook in one flow — auto-creating the linked `Assessment` record if it doesn't exist yet.

**Success criteria:**

- A solo teacher with a class of 30 can go from "I have 60 marked papers in front of me" to "all marks in gradebook" in under 10 minutes of UI time.
- Original images are archived to `/uploads/markings/<markingId>/page-N.<ext>` (filesystem disk storage), retrievable for audit and re-mark workflows.
- Bulk class flow detects unmatched/ambiguous student headers and surfaces them in a review step; teacher reassigns before grading starts.
- Edits to the paper after a marking exists raise a "stale" flag on the marking; teacher decides whether to re-mark.
- Publishing to gradebook never requires the teacher to manually pick an `Assessment`; the system finds-or-creates one tied to the paper.
- All `apiClient` calls live in hooks. No SoC violations. Compile is clean. Files under 350 lines.

## 2. Non-goals

Explicitly deferred:

- **S3 / object-store image storage** — filesystem is enough for launch. Migrate when a real-prod env appears.
- **OCR fallback** — Claude Vision is the canonical multimodal reader. No tesseract/textract fallback.
- **Cross-paper batch** — one batch covers one paper for one class. Multiple papers in a single upload is a UX hazard; out of scope.
- **Annotated PDF output** — generating a marked-up version of the paper PDF showing AI annotations. Cool but not launch-critical.
- **Re-marking automation** — the stale flag is informational. The teacher manually re-marks if they care.
- **Deep AI prompt iteration** — only iterate if smoke testing reveals systematic issues. Don't pre-optimize.
- **HOD moderation of marks** — single teacher = self-trust at launch.
- **Image compression / thumbnails** — store originals, serve raw. Optimize when storage gets heavy.

## 3. Core architectural decisions

### 3.1 Filesystem image archive

Original images stored under `BACKEND_ROOT/uploads/markings/<markingId>/page-1.jpg` etc. Multer disk storage with whitelist (`jpg|jpeg|png|webp`), 5 MB per image, 8 images per marking.

`PaperMarking.images[]` carries `{ filename, mimeType, sizeBytes, pageNumber }`. Frontend constructs URLs: `/uploads/markings/<id>/<filename>`. The existing `app.use('/uploads', ...)` static middleware already serves this with the `cross-origin` CORS header.

**Why filesystem now:** the existing `/uploads` static route is already wired. Disk storage is simple, fast, idempotent. S3 needs env config + signed URLs + new dependencies — defer to actual prod environment.

### 3.2 Bulk class flow with AI header extraction (B2)

A teacher's day-to-day workflow is "mark a whole class", not "one student at a time". The new flow:

1. Teacher picks paper + class.
2. Drops 60 images (30 students × 2 pages).
3. Backend creates a `MarkingBatch` (status: `extracting`). Calls Claude Vision per image with a header-extraction prompt (cheap, single image): output `{ studentName?, admissionNumber?, sectionLabel?, confidence }`.
4. Service groups pages by `studentName + admissionNumber` and matches against the class's `Student[]` roster (fuzzy: exact admission number = direct hit; full name match with normalisation; first-name + surname-initial = high; surname only = low).
5. Batch transitions to `reviewing` with `ambiguousMatches[]` for any low-confidence groups.
6. Teacher reviews, drags pages to correct students, confirms.
7. Backend creates one `PaperMarking` per matched student and runs the existing `markPaperFromImages` flow per student. Concurrency capped at 3 to avoid Claude rate limits.
8. Batch transitions to `marking` then `complete`.

**Why B2 over sequential or fully manual:** the AI already reads paper headers (`extractedHeader` field exists). Extending to "extract student name + match roster" is small, high-value. Manual fallback covers misses.

### 3.3 Lazy auto-link paper → assessment (B3)

`Academic.findOrCreateAssessmentForPaper(paperId, schoolId, classId, subjectId)`:
- If `AssessmentPaper.assessmentId` is set → return that Assessment.
- Else look up by `(schoolId, classId, subjectId, name = paper.title, term, year)` — return if found.
- Else create from paper metadata: `{ name: paper.title, type: paper.paperType, totalMarks: paper.totalMarks, term, academicYear: year, classId, subjectId, schoolId, weight: 1 }`.
- Cache the link on `AssessmentPaper.assessmentId`.

Idempotent. Called on first publish path. The teacher never sees a "pick an Assessment" dropdown unless they explicitly want to override.

**Why lazy over eager-on-finalise:** drafts and discards never create orphan Assessments. Solo teacher rarely creates Assessments separately, so the auto-create path is the common one.

### 3.4 Paper-version stale detection (A4)

`AssessmentPaper.version: number` (default 1) increments on:
- Question add/edit/delete/regenerate (in `service-paper-questions.ts`)
- Memo edit (in `updatePaperMemo`)

Section-level metadata edits (title, instructions) are deferred — those mutations don't currently have dedicated endpoints in the QuestionBank module. If a section-edit endpoint lands later, it should also bump version.

`PaperMarking.paperVersion: number` is snapshot at marking creation time.

UI shows a banner on marking detail/list rows when `marking.paperVersion < paper.version`: "The paper has been edited since this was marked. Re-mark recommended."

The version field is non-blocking — it surfaces risk without blocking edits. A future module could automate re-marking on detection; out of scope here.

### 3.5 Module 2 paperType compatibility

`PaperMarking.paperType: 'generated' | 'assessment'` already discriminates legacy vs new. Module 2 deprecated `GeneratedPaper` writes; reads still work via the fallback path in `service-marking.ts:loadPaperInfo`. New markings always have `paperType: 'assessment'`.

A one-shot script (out of scope for this module — flag for future cleanup) would update existing `'generated'` markings whose paper was migrated by Module 2's `migrate-generated-papers.ts`. Not blocking launch.

### 3.6 SoC compliance

`PublishToGradebookDialog` currently imports `apiClient` to fetch assessments — moves to a `useTeacherAssessments(classId, subjectId)` hook (already exists in some form; reuse or extend). Page/component layer becomes pure UI.

## 4. Data model changes

### 4.1 `PaperMarking` ([AITools/model-marking.ts](../../../../../../campusly-backend/src/modules/AITools/model-marking.ts))

```ts
images: { type: [{
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true, min: 0 },
  pageNumber: { type: Number, required: true, min: 1 },
}], default: [] }                                                     // NEW

paperVersion: { type: Number, required: true, default: 1 }            // NEW
classId:      { type: ObjectId, ref: 'Class', default: null }         // NEW (bulk flow)
batchId:      { type: ObjectId, ref: 'MarkingBatch', default: null }  // NEW (bulk flow)
```

The existing `aiRawResult` field stays — it stores Claude's full JSON response for audit/debugging, separate from the original images.

### 4.2 `AssessmentPaper` ([QuestionBank/model-papers.ts](../../../../../../campusly-backend/src/modules/QuestionBank/model-papers.ts))

```ts
version:      { type: Number, required: true, default: 1 }            // NEW
assessmentId: { type: ObjectId, ref: 'Assessment', default: null }    // NEW
```

`version` increments via `service-paper-questions` after every successful question/memo mutation. The increment is best-effort (logged on failure, doesn't block).

### 4.3 `MarkingBatch` (new model — `AITools/model-marking-batch.ts`)

```ts
{
  _id: ObjectId,
  schoolId: ObjectId (required, ref School),
  teacherId: ObjectId (required, ref User),
  paperId: ObjectId (required),
  paperType: 'generated' | 'assessment',
  classId: ObjectId (required, ref Class),
  imageCount: Number (required, min 1),
  status: 'extracting' | 'reviewing' | 'marking' | 'complete' | 'failed',
  matchedCount: Number (default 0),
  unmatchedCount: Number (default 0),
  ambiguousMatches: [{
    imageFilenames: [String],
    extractedName: String,
    extractedAdmissionNumber: String,
    suggestedStudentIds: [ObjectId],
    confidence: Number (min 0, max 1),
  }],
  errorMessage: String (default null),
  isDeleted: Boolean (default false),
  createdAt, updatedAt,
}
```

Indexes: `(schoolId, teacherId, createdAt: -1)`, `(paperId, classId)`.

## 5. Backend changes

### 5.1 New routes (under `/api/ai-tools`)

| Method | Path | Handler |
|---|---|---|
| POST | `/mark-batch` | Multer multipart, kicks off batch extract |
| GET | `/batches/:id` | Poll batch state |
| POST | `/batches/:id/confirm` | Confirm assignments, spawn N markings |
| DELETE | `/batches/:id` | Cancel + cleanup |

### 5.2 Modified endpoints

- **`POST /mark-paper`** — switches from base64 JSON body to `multipart/form-data` (Multer). Payload: form fields `paperId, studentName, studentId?, classId?` + `files[]` images. Original images persisted to `/uploads/markings/<id>/`.
- **`POST /markings/:id/publish`** — if `assessmentId` not provided in body, calls `findOrCreateAssessmentForPaper(paperId, schoolId, marking.classId, paper.subjectId)`. Caches the result on `AssessmentPaper.assessmentId`.

### 5.3 New service files

- `AITools/service-marking-batch.ts` (new, ~250 lines target):
  - `createBatch(input, files)` — saves files to `/uploads/markings-batch/<batchId>/`, creates batch doc, kicks header-extract job
  - `extractBatchHeaders(batchId)` — async; per-image Claude Vision call extracting `{studentName, admissionNumber, sectionLabel}`; updates batch
  - `matchToRoster(batchId)` — fuzzy-match against `Student.find({classId})`; populates `ambiguousMatches`
  - `confirmBatch(batchId, assignments)` — teacher's confirmed page-to-student map; spawns markings via existing `markPaperFromImages` per student; concurrency=3
- `AITools/service-marking-images.ts` (new, ~80 lines):
  - Multer config (disk storage, file filter, size limit)
  - Helper: `buildImageRecord(filename, file): MarkingImage`

### 5.4 Modified services

- `AITools/service-marking.ts:markPaperFromImages` — accepts `Express.Multer.File[]` instead of base64 body. Reads files from disk, builds Claude payload, persists `PaperMarking.images[]`.
- `Academic/service-gradebook-publish.ts:findOrCreateAssessmentForPaper(paperId, schoolId, classId, subjectId)` — new exported helper.
- `QuestionBank/service-paper-questions.ts` + `service-papers-pdf-finalise.ts` + memo edit endpoints — add `paper.version += 1` before each `paper.save()` that touches sections/questions/memo. Memo updates should also bump version.

### 5.5 Roster fuzzy match

In `service-marking-batch.ts`, the matcher:

1. **Exact admission number** → confidence 1.0 (direct hit)
2. **Full name (case + whitespace normalised) exact match** → 0.95
3. **First name + surname initial** (e.g. "S. Khumalo" → match against Siya, Sibongile) → 0.7 if one match, 0.4 if multiple
4. **Surname only or first name only** → 0.4 if one match, 0.2 if multiple

Threshold: ≥ 0.7 = auto-matched. < 0.7 = ambiguous, surfaces in review screen with top-3 suggestions.

### 5.6 Concurrency guard

When `confirmBatch` spawns markings, it uses a simple semaphore (e.g., a `concurrencyLimit = 3` async iterator). A more elegant solution would use BullMQ jobs, but that's overkill for the launch volume — sequential-with-concurrency-cap covers solo teachers.

## 6. Frontend changes

### 6.1 Routes & components

- `/teacher/curriculum/mark-papers` — add toggle at the top: **"Single Student" | "Whole Class"**. Single Student keeps the existing 5-step wizard. Whole Class enters the new bulk flow.
- `src/components/ai-tools/MarkingBulkUpload.tsx` (new) — drop zone for many images, paper + class pickers
- `src/components/ai-tools/MarkingBatchReview.tsx` (new) — table view: student name | matched-image count | confidence | actions (reassign / drop). For each ambiguous group, top-3 suggested students with confidence; teacher clicks correct one. Pages with NO match (extracted name doesn't resemble anyone in roster) drop into an "Unassigned" tray; teacher manually assigns each (dropdown of full roster) or excludes from this batch entirely.
- `src/components/ai-tools/MarkingBatchProgress.tsx` (new) — polled progress while AI marks all students
- `src/components/ai-tools/MarkingResults.tsx` — extend to show per-question rationale (collapsible), original image strip (small thumbnails linking to full image)
- `src/components/ai-tools/PublishToGradebookDialog.tsx` — fix SoC violation, default Assessment to auto-link result

### 6.2 New hooks

- `src/hooks/useTeacherMarkingBatch.ts` — `createBatch`, `getBatch`, `confirmBatch`, `cancelBatch`, polled state

### 6.3 Type updates

`src/types/marking.ts` (new or extend existing):
- `PaperMarkingImage`, extended `PaperMarking` with `images[]`, `paperVersion`, `classId`, `batchId`
- `MarkingBatch`, `MarkingBatchAmbiguousMatch`

### 6.4 Stale-marking banner

In `MarkingResults.tsx` and `MarkingHistoryTable.tsx`: if `marking.paperVersion < paper.version`, render a `<Badge variant="secondary">Paper edited — re-mark recommended</Badge>` and on the detail page a clearer banner with a "Re-mark this paper" button (which kicks off a new marking).

### 6.5 Image display

Single-student detail view shows a horizontal scroll of page thumbnails (constructed URL `${API_BASE}/uploads/markings/<id>/<filename>`). Click → modal full-size view. Per-question rationale links to the page (rough pageNumber association — close enough for v1).

## 7. User flow (whole-class happy path)

1. Teacher: `/teacher/curriculum/mark-papers` → "Whole Class" toggle.
2. Picks paper "Term 2 Maths Test" + class "Grade 4 - A".
3. Drops 60 images. Backend persists them, creates `MarkingBatch{ status: 'extracting' }`.
4. Frontend polls batch every 2s. Status → `reviewing` after ~30s (60 cheap header-extraction calls).
5. Review screen: 28 students auto-matched (green), 2 ambiguous ("S. Khumalo" — Siya vs Sibongile). Teacher clicks the right student for each.
6. Confirms. Status → `marking`. Backend spawns 30 markings, concurrency=3.
7. Progress screen polls; ~6 minutes later: `complete`. 28 = `completed`, 2 = `needs_review` (one mismatch detection, one ambiguous mark).
8. Teacher reviews the 2 needs-review papers, overrides as needed.
9. Clicks "Publish all to gradebook" → 30 publishes; first one auto-creates the Assessment from paper metadata; subsequent 29 reuse it. Class gradebook updated.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Claude API rate limits on parallel marking calls | concurrency=3, exponential backoff on 429, surface failures gracefully |
| Bulk image upload hits Express body-size or Multer limits | Multer per-file 5 MB, 8-pages-per-marking implied limit, total batch capped at 500MB across files (config) |
| AI student-name extraction fails or hallucinates | Confidence threshold + manual review screen before any marking happens |
| Filesystem fills up | Out of scope to monitor; document in operations notes. Future: cron cleanup of `marking.isDeleted` directories |
| Auto-Assessment default term/year wrong | `findOrCreateAssessmentForPaper` reads from `paper.term, paper.year`; both required on `AssessmentPaper` (schema enforces) |
| Stale flag false positives (memo-only edits don't affect marking) | Acceptable: any version bump triggers stale. Cleaner alternative is to track `questionsVersion` separately; defer |
| Migrating legacy `paperType: 'generated'` markings | Separate one-shot script, not in this module's scope; flag for follow-up cleanup |
| Image archive grows unbounded | Document. Future: bg job archives + deletes after N months. Not blocking launch. |
| Multer file disk write fails partway | Wrap in try/finally; cleanup partial files on failure; mark batch `failed` |
| Class roster has no admission numbers | Fall back to name-only match. Confidence drops, more ambiguity surfaces. Acceptable. |

## 9. Out of scope (deferral list, repeated for clarity)

- S3 / object-store
- Annotated PDF output
- Re-marking automation
- HOD moderation
- Image thumbnails / compression
- Cross-paper batch
- Deep prompt iteration (beyond what smoke testing exposes)
- BullMQ jobs (sequential concurrency cap is enough for now)

## 10. Acceptance criteria

- [ ] `PublishToGradebookDialog` no longer imports `apiClient` directly; data fetching happens in a hook
- [ ] `POST /ai-tools/mark-paper` accepts `multipart/form-data` and persists images to `/uploads/markings/<id>/`
- [ ] `PaperMarking.images[]` is populated for any new marking; old markings (no images) still render in history
- [ ] `AssessmentPaper.version` increments on every successful question/memo mutation
- [ ] `PaperMarking.paperVersion` snapshots correctly at marking creation
- [ ] A marking shows a "stale" badge when `marking.paperVersion < paper.version`
- [ ] Bulk class flow: teacher uploads N images, lands on review screen showing matched + ambiguous students
- [ ] Confirming the batch spawns parallel markings (concurrency 3), all reach `complete` or `needs_review`
- [ ] Publishing a marking with no `assessmentId` auto-creates the Assessment via `findOrCreateAssessmentForPaper` and caches `AssessmentPaper.assessmentId`
- [ ] Subsequent publishes for any student on the same paper reuse the linked Assessment without re-creating
- [ ] Per-question rationale is visible (collapsible) in `MarkingResults`
- [ ] Image strip thumbnails are displayed on marking detail; click opens full image
- [ ] No `apiClient` imports under `/teacher/curriculum/mark-papers` pages or `src/components/ai-tools/`
- [ ] All new files under 350 lines. No `any`. No `text-red-*`. `catch (err: unknown)` always.
- [ ] End-to-end smoke: a real photo of a real paper publishes a real mark to the gradebook.
