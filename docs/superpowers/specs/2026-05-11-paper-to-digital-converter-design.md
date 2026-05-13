# Paper → Digital Converter — Design

**Status:** Draft
**Author:** Shaun (with Claude)
**Date:** 2026-05-11

## Goal

Let a teacher upload a PDF or image of an existing paper-based resource (worksheet, exercise sheet, textbook chapter, study notes, exam paper) and convert it into one or more structured digital `ContentResourceItem` records — the same shape that powers Quick Make, the Textbook reader, the Lesson Workspace, and the Homework assignment flow.

The converted output is a faithful transcription, plus optional AI enhancements (auto-answer, hints, worked example, explanations) that the teacher toggles before conversion.

## Non-goals (v1)

- Re-conversion of a stored source file with different options — teacher re-uploads
- Page-range manual selection or region drawing
- Multi-file batch upload in one job
- Inline block editing inside the wizard — teacher uses the existing resource preview page after conversion
- Admin-wide job visibility — only the creating teacher sees their jobs
- SSE / WebSocket progress streaming
- Object storage (S3) — disk only
- Auto-submit to a review queue — converted resources land as `draft`

## User flow

A standalone wizard reached from a new top-level nav item.

**Route:** `/teacher/curriculum/import`
**Nav label:** "Import Paper"
**Icon:** `ScanLine`
**Badge:** `AI`

Added to both `TEACHER_NAV` and `STANDALONE_TEACHER_NAV` in `src/lib/constants.ts`, and to `isStandaloneTeacherPathAllowed` in `src/app/(dashboard)/layout.tsx`.

The wizard has 5 steps:

1. **Curriculum** — Subject / Grade / Term / CAPS topic. Reuses Quick Make's `CurriculumTreeBrowser` + `NodePicker` and the academic-context preparation logic (lifted into a shared hook — see Refactor below).
2. **Upload** — Drop zone for one PDF or one image. Validates size and page count client-side; shows page thumbnails after selection.
3. **Options** — Four toggles (all on by default): Generate missing answers, Add hints, Add worked example for hardest question, Add explanation block per question. Optional special-instructions textarea.
4. **Convert** — Submit. The page routes to `/teacher/curriculum/import/[jobId]`, which polls until the job is terminal. Teacher can leave the page — the job continues.
5. **Review** — When the job completes, the job page shows the list of auto-split resources. Each row links to the existing `/teacher/curriculum/preview/[resourceId]` page. Source file is downloadable from the job page and from each resource's preview.

A jobs list page at `/teacher/curriculum/import/jobs` shows all the teacher's past and in-flight jobs.

## Architecture overview

```
                Frontend                         Backend
┌─────────────────────────────────┐   ┌────────────────────────────────────┐
│  /teacher/curriculum/import     │   │  POST   /api/paper-imports          │
│    └─ ImportWizard              │──▶│  GET    /api/paper-imports          │
│  /import/[jobId]                │   │  GET    /api/paper-imports/:id      │
│    └─ usePaperImportPoll (3s)   │◀──│  POST   /api/paper-imports/:id/cancel│
│  /import/jobs                   │   │  DELETE /api/paper-imports/:id      │
│    └─ JobListTable              │   │  GET    /api/paper-imports/:id/source│
└─────────────────────────────────┘   │  GET    /api/paper-imports/:id/crops/:f│
                                      └────────────────┬───────────────────┘
                                                       │  (enqueue jobId)
                                                       ▼
                                      ┌────────────────────────────────────┐
                                      │  BullMQ queue: 'paper-import'      │
                                      └────────────────┬───────────────────┘
                                                       ▼
                                      ┌────────────────────────────────────┐
                                      │  paper-import.job.ts worker        │
                                      │   1. Render pages (pdf-to-img)     │
                                      │   2. SEGMENT  (1 vision call)      │
                                      │   3. TRANSCRIBE (1 call per split) │
                                      │   4. ENHANCE  (parallel, optional) │
                                      │   5. FINALISE (crops + records)    │
                                      └────────────────────────────────────┘
```

Both BullMQ and Redis are already used by `src/jobs/ai-grading.job.ts` and others; this feature follows the same pattern.

## Backend

### New module — `campusly-backend/src/modules/PaperImport/`

```
controller.ts            # Express handlers for all routes
routes.ts                # Route mounting (added to app.ts)
model.ts                 # PaperImportJob schema + TS interface (matched 1:1)
service-jobs.ts          # Job CRUD + state transitions
service-storage.ts       # Multer config, file paths, source streaming
service-conversion-prompts.ts  # AI prompt templates (versioned via git)
validation.ts            # Zod schemas for all payloads
__tests__/               # Unit tests for parse logic
```

### Data model

**`PaperImportJob`** (new collection):

```ts
{
  _id: ObjectId,
  schoolId: ObjectId,         // multi-tenancy filter — required on every query
  teacherId: ObjectId,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
  progress: {
    stage: 'uploading' | 'segmenting' | 'transcribing' | 'enhancing' | 'finalising',
    pagesTotal: number,
    pagesDone: number,
    message: string,
  },
  curriculum: {
    subjectId: ObjectId,
    gradeId: ObjectId,
    term: number,
    curriculumNodeId: ObjectId,
  },
  options: {
    generateAnswers: boolean,
    addHints: boolean,
    addWorkedExample: boolean,
    addExplanations: boolean,
    instructions?: string,
  },
  source: {
    filename: string,
    mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp',
    sizeBytes: number,
    pageCount: number,
    storagePath: string,
  },
  resultResourceIds: ObjectId[],
  error?: { code: string, message: string },
  createdAt: Date,
  updatedAt: Date,
  completedAt?: Date,
  isDeleted: boolean,
}
```

Indexes: `{ schoolId: 1, teacherId: 1, createdAt: -1 }`, `{ status: 1, updatedAt: 1 }`.

**`ContentResource` extension** (existing model):

```ts
sourceImport?: {
  jobId: ObjectId,
  storagePath: string,
  filename: string,
  mimeType: string,
  pageRange: { start: number, end: number },
}
needsReview: boolean   // defaults false
```

Also extend the existing `RESOURCE_SOURCES` enum from `['oer', 'ai_generated', 'teacher', 'system']` to add `'imported'`. **Two places update together** (the enum is duplicated today): the constant in `campusly-backend/src/modules/ContentLibrary/model.ts` AND the `resourceSourceEnum` Zod schema in `campusly-backend/src/modules/ContentLibrary/validation.ts`. Converted resources are saved with `source: 'imported'` so teachers can filter their library to imported items (the existing list query already supports filtering by `source`).

Added to both the Mongoose schema and the TypeScript interface (avoids the "schema must match interface" silent-drop pitfall).

**Per-block review flag — no new block schema fields.** The existing `IContentBlock.metadata: Record<string, unknown>` is used to store `{ needsReview: true }` on any block whose transcription confidence falls below threshold. No new fields on `IContentBlock`.

**Hints and explanations use existing fields.** The existing `IContentBlock.hints: string[]` and `IContentBlock.explanation: string` are populated by the ENHANCE stage. No new fields.

### Storage layout

Same disk root as marking-images (`uploads/`):

```
uploads/
  paper-imports/
    <jobId>/
      source.pdf
      page-001.png
      page-002.png
      ...
      crops/
        block-<uuid>.png
```

External access:

- `GET /api/paper-imports/:jobId/source` — streams the original
- `GET /api/paper-imports/:jobId/crops/:filename` — streams a crop referenced by an image block

Both endpoints scope to `{ jobId, schoolId, teacherId }`.

### Routes

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/paper-imports` | Create job: multipart upload + JSON body. Returns `{ jobId }`. Enqueues to BullMQ. |
| `GET` | `/api/paper-imports` | List teacher's jobs (paginated, status filter) |
| `GET` | `/api/paper-imports/:jobId` | Get one job (polled by UI) |
| `POST` | `/api/paper-imports/:jobId/cancel` | Cancel pending or running job |
| `DELETE` | `/api/paper-imports/:jobId` | Soft delete + purge source files. Produced resources untouched. |
| `GET` | `/api/paper-imports/:jobId/source` | Download original |
| `GET` | `/api/paper-imports/:jobId/crops/:filename` | Stream a crop |

Mounted in `src/app.ts` under `/api/paper-imports`. Every handler filters by `schoolId` from `req.user.schoolId` — including single-entity lookups (the "single-entity multi-tenancy" pitfall from CLAUDE.md).

### Worker — `src/jobs/paper-import.job.ts`

Follows the existing `src/jobs/ai-grading.job.ts` pattern. Uses `Worker` from `bullmq`, the shared `redisConnection`, and a new `paperImportQueue` exported from `src/jobs/queues.ts`.

- **Job data:** `{ jobId, teacherId, schoolId }` — DB row is the source of truth for everything else
- **Retries:** 3 attempts, exponential backoff (1s / 4s / 16s). Anthropic 429/5xx retries happen inside `AIService.callWithRetry` first.
- **Concurrency:** 2 (env-tunable `PAPER_IMPORT_WORKER_CONCURRENCY`)
- **Cancellation:** worker reads `PaperImportJob.status` between stages and aborts on `'cancelled'`. Resources already inserted in this run are deleted.
- **Idempotency:** each stage checks for its outputs (page PNGs exist → skip render; crops exist → skip crop; resources for `jobId` exist → don't re-insert)
- **Progress:** worker writes `progress` to the Mongo job row after each stage. UI polls Mongo, not Redis.

### Stages (worker execution)

**Stage 1 — Render pages.** PDFs → page PNGs via `pdf-to-img` (new backend dependency). Image uploads skip this. Updates `progress.pagesTotal`.

**Stage 2 — SEGMENT.** Single Claude vision call. When the source is a PDF and ≤20 pages, send the PDF directly via the document endpoint already exposed in `AIService` (cheaper, native Sonnet 4 path). When the source is an image, or the PDF is >20 pages, send the rendered page PNGs via `generateVisionCompletionWithImages`. Returns:

```ts
{ resources: [{
    kind: 'lesson'|'worksheet'|'activity'|'study_notes'|'worked_example',
    title: string,
    pageRange: [number, number],
    reasoning: string,
  }] }
```

Fallback: if the call fails or returns an empty array, treat the entire upload as a single `worksheet` covering all pages.

**Stage 3 — TRANSCRIBE.** One vision call per resource boundary, scoped to its page range. The AI returns the following intermediate shape (NOT what we persist — transient transcription output that the worker post-processes):

```ts
// Transient transcription output — not the final block shape
{ title, description?, blocks: [{
    blockId: string,
    type: 'text'|'quiz'|'fill_blank'|'match_columns'|'ordering'|'step_reveal'|'image',
    order: number,
    content: string,        // JSON matching BlockRenderer's expected shape per type
    confidence: number,                              // transient, used only to drive fallback
    cropBox?: { page, x, y, w, h },                  // transient, consumed by Stage 5
  }] }
```

The allowed block types are the same subset Quick Make's `BLOCK_TYPES_BY_RESOURCE` allows per resource type. The other types defined on the schema (`video`, `drag_drop`, `hotspot`, `code`) are explicitly **not** produced by the converter in v1. The `content` JSON shape per `type` matches what `BlockRenderer` already renders — the prompts in `service-conversion-prompts.ts` embed the exact JSON schema per block type so the AI produces persistable output.

**Persistence transformation between Stage 3 and Stage 5:**

- `confidence` and `cropBox` are NOT stored on the final block — they exist only inside the worker pipeline
- `block.metadata = { needsReview: true }` is set on any block whose `confidence < 0.55` (uses existing `IContentBlock.metadata` field)
- The resource's top-level `needsReview` flag is true when median block confidence < 0.55 OR the page-image fallback was applied

Fallback: if a resource's median block confidence < 0.55, Stage 5 replaces its blocks with one image block per page (page-image fallback), sets the resource-level `needsReview: true`, and sets `metadata.needsReview: true` on each image block.

**Stage 4 — ENHANCE.** Per-resource, up to four parallel follow-up calls (only the ones enabled by options):

| Option | Behaviour | Persists into |
|---|---|---|
| `generateAnswers` | For quiz/fill_blank blocks without an answer, ask for one | The block's `content` JSON (existing answer field per block type) |
| `addHints` | For each question, ask for one hint | The existing `block.hints: string[]` field |
| `addWorkedExample` | Add one new `step_reveal` block on the hardest question | New block appended to `blocks[]` |
| `addExplanations` | For each question + answer, ask for an explanation | The existing `block.explanation: string` field |

Best-effort — failures are logged on `progress.message` and the resource is saved without that enhancement.

**Stage 5 — FINALISE.** Per resource:

1. For each `image` block with `cropBox`, render the source page, crop with `sharp`, write to `crops/<blockId>.png`, rewrite the block's `content` to reference `/api/paper-imports/<jobId>/crops/<blockId>.png`
2. If the resource was flagged for fallback, replace its blocks with one image block per page in `pageRange`
3. Strip transient fields (`confidence`, `cropBox`) from each block; move `needsReview` into `block.metadata`
4. Insert a `ContentResource` via `ResourcesService.createResource` (in `campusly-backend/src/modules/ContentLibrary/service-resources.ts`) — the same helper the existing controller uses — with:
   - `source: 'imported'`
   - `status: 'draft'`
   - `sourceImport: { jobId, storagePath, filename, mimeType, pageRange }`
   - `needsReview: true` if resource-level threshold tripped, else `false`
5. Push the new resource's id to `PaperImportJob.resultResourceIds` immediately (so cancellation can roll back partial inserts)
6. Once all resources are inserted, set `PaperImportJob.status = 'completed'`

Token usage is logged via the existing `AIUsageLog` mechanism (same as Quick Make + grading).

### Validation

`validation.ts` exposes Zod schemas for:

- `CreatePaperImportPayload` — multipart fields + file metadata
- `SegmentResponseSchema` — Stage 2 output
- `TranscribeResponseSchema` — Stage 3 output (matches `ContentBlock` content JSON)
- `EnhancementResponseSchemas` — one per enhancement type

If an AI response fails parsing, the worker retries the call once with a stricter prompt (`Return ONLY JSON matching the schema below…`) before failing the stage.

### Limits

| Limit | Value | Where enforced |
|---|---|---|
| Source file size | 25 MB | Multer + client pre-check |
| PDF pages | 30 | Server post-render count + client `pdfjs-dist` pre-check |
| MIME types | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` | Multer `fileFilter` + client |
| Concurrent jobs per teacher | 2 | `POST /paper-imports` 429s if exceeded |
| Job retention | 90 days | Cron in `src/jobs/index.ts` soft-deletes old jobs and purges files |
| Worker concurrency | 2 (env) | `paper-import.job.ts` |
| Anthropic per-call timeout | 180s | `ai.service.ts` (existing default) |
| PDF render DPI | 150 (env-tunable) | `pdf-to-img` config in worker — balances vision quality against Anthropic per-image size cap (~5 MB) |

## Frontend

### File layout

```
src/app/(dashboard)/teacher/curriculum/import/
  page.tsx                            # 5-step wizard (orchestrator only)
  jobs/page.tsx                       # Job list page
  [jobId]/page.tsx                    # Single job status / result page

src/components/paper-import/
  ImportWizard.tsx                    # Shell + step indicator
  UploadDropzone.tsx                  # File drop + thumbnails
  OptionsForm.tsx                     # Toggles + instructions
  JobProgressView.tsx                 # Live progress card
  ResultsList.tsx                     # Auto-split resources at end
  JobListTable.tsx                    # All jobs

src/hooks/
  usePaperImport.ts                   # All apiClient calls live here
  usePaperImportPoll.ts               # 3s polling until terminal
  useCurriculumPreparation.ts         # Lifted from quick-make (shared)

src/types/
  paper-import.ts                     # Added to barrel
```

All files stay under the 350-line cap. The page files are thin orchestrators — zero `apiClient` imports per CLAUDE.md.

### Hooks API

```ts
// usePaperImport.ts
createJob(formData: FormData): Promise<PaperImportJob>
listJobs(params?: { status?; limit?; offset? }): Promise<PaperImportJob[]>
getJob(jobId: string): Promise<PaperImportJob>
cancelJob(jobId: string): Promise<void>
deleteJob(jobId: string): Promise<void>
sourceUrl(jobId: string): string
```

```ts
// usePaperImportPoll.ts
usePaperImportPoll(jobId: string): { job: PaperImportJob | null, isPolling: boolean }
```

Polling stops when `status ∈ {completed, failed, cancelled}`. Pauses when `document.hidden`; resumes on `visibilitychange`. Interval: 3000ms.

### Wizard step details

**Step 1 — Curriculum.** Same `CurriculumTreeBrowser` + `NodePicker` as Quick Make. The grade/subject auto-prep logic is **lifted out of `quick-make/page.tsx` into `src/hooks/useCurriculumPreparation.ts`** and used by both pages. This is the only refactor touching existing code (Quick Make is already 1400+ lines, so the extraction makes it smaller).

**Step 2 — Upload.** A drop zone (drag/drop + click). Client validation:

- MIME types restricted to the four allowed
- 25 MB max
- For PDFs, `pdfjs-dist` (new frontend dependency) reads page count via the legacy build (browser-friendly); reject > 30 pages

Shows page thumbnails after selection. Allows clearing/reselecting before submit.

**Step 3 — Options.** Four toggles (defaults all on) + `<Textarea>` for special instructions. Standard `<Label>` + `<Switch>` pattern.

**Step 4 — Convert.** Submit:

```
POST /api/paper-imports (multipart)
  fields: subjectId, gradeId, term, curriculumNodeId,
          generateAnswers, addHints, addWorkedExample, addExplanations, instructions
  file:   source
→ { jobId }
```

Router pushes to `/teacher/curriculum/import/[jobId]`.

**Step 5 — Job page.** `usePaperImportPoll(jobId)` returns `{ job, isPolling }`. Renders one of:

- `pending` / `running` → `<JobProgressView>`: stage label, page counter, progress bar, Cancel button, "leave this page" note
- `completed` → `<ResultsList>`: header summary, list of result resources with Preview/Edit buttons → `/teacher/curriculum/preview/[resourceId]`, `needsReview` badges where applicable, "Download original" button
- `failed` → Error card with retry (creates a fresh job with same options if source is still on disk)
- `cancelled` → Cancelled state with restart link

### Jobs list page

`/teacher/curriculum/import/jobs` uses the existing `DataTable` component. Columns: created, source filename, status badge, page count, resource count, actions (View / Cancel / Delete). Tab filters: All / In Progress / Completed / Failed. Standard empty + loading states.

### Reader integration

`/teacher/curriculum/preview/[resourceId]` gets a slim "Source" section when `resource.sourceImport` is present:

```
Source: <filename> · pages <start>–<end> of <pageCount> · [Download]
```

The "Download" calls `usePaperImport.sourceUrl(jobId)`. Single small change to existing reader code.

## Refactor (in-scope, supports the feature)

Extract from `src/app/(dashboard)/teacher/quick-make/page.tsx` into `src/hooks/useCurriculumPreparation.ts`:

- `extractCurriculumContext`
- `inferTerm`
- `findMatchingGrade` / `findMatchingSubject`
- The `prepareAcademicContext` effect (grades/subjects auto-create)

These move to the shared hook. Quick Make's page imports them from there. The new Import Paper wizard imports the same hook. Both pages shrink.

## Failure modes

| Failure | Behaviour |
|---|---|
| Upload too large / wrong MIME | 400, never enters queue |
| PDF unreadable / page count fails | Job → `failed` immediately, source deleted |
| Segmentation returns junk | Fallback: single `worksheet` resource covering all pages |
| Transcription fails after retries | That resource dropped from results; job continues with a warning |
| Enhancement call fails | Skipped silently per matrix |
| Crop extraction fails | Replace image block with page-image fallback for its source page |
| Worker process killed mid-job | BullMQ retries from Stage 2 (idempotent) |
| All resources end up empty | Job → `failed` with "couldn't extract anything" error |
| User cancels | Worker aborts at next stage boundary; resources from this run deleted |
| User navigates away | Job continues; visible on jobs list when they return |
| User deletes completed job | Source files purged. Linked resources are NOT deleted, but their `sourceImport` is cleared (set to `undefined`) so the "Download source" button stops rendering. The resources themselves remain intact under the teacher's library. |

## Security

- Every `PaperImportJob` query filters by `schoolId` AND `teacherId` (read / cancel / delete) — admin-wide visibility is out of scope for v1
- Source + crop stream endpoints apply the same scope check
- File paths use `jobId` (ObjectId) only — no user-supplied path components
- The "Download source" button on the resource preview page renders only when the requester has read access to the underlying job

## Telemetry

`AIUsageLog` rows for each Anthropic call (existing infrastructure — same as Quick Make + grading). One extra log line on job completion:

```
[PaperImport] job=<id> resources=<n> pages=<p> tokens=<in/out> duration=<ms>
```

No new dashboards in v1.

## New dependencies

| Package | Side | Purpose |
|---|---|---|
| `pdf-to-img` | Backend | Render PDF pages to PNG buffers for vision input and crop extraction |
| `sharp` | Backend | Crop diagram regions from rendered pages |
| `pdfjs-dist` | Frontend | Client-side PDF page count (rejects >30 pages before upload) and optional thumbnail rendering |

All three are mainstream, MIT-licensed, and actively maintained. `sharp` requires native binaries — already widely deployed and works on the project's existing Node target.

## Tunable thresholds (decide during implementation)

- Page-image fallback median confidence (default 0.55)
- Worker concurrency (default 2, env `PAPER_IMPORT_WORKER_CONCURRENCY`)
- Polling interval (default 3000ms)
- Source retention (default 90 days)

All four are config / env vars — no spec changes needed to tune them later.
