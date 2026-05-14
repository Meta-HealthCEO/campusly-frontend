# Marking — Issue Result, PDF Preview & Student Review

**Date:** 2026-05-14
**Status:** Approved for planning

## Problem

The current AI-marking flow has three gaps:

1. Uploaded marking page images are shown as separate thumbnails that open in a new tab. There is no way to flip through them in-app and no way to download a consolidated record.
2. The teacher's "Publish to Gradebook" action writes a `Mark` record but the student only sees the final aggregate percentage on their grades page — never the per-question feedback, rationale, or marked scans.
3. There is no concept of "issuing" a marking review to a student. The student-side route `/student/tests/[paperId]` exists for taking the test but has no equivalent view for reviewing a completed marking.

## Goals

- Teachers can preview uploaded marked pages inline (lightbox carousel, no new tab).
- Teachers can download the marked pages as a single PDF.
- A single "Issue Result" action writes the mark to the gradebook **and** makes the per-question review visible to the student.
- Students see the marking review (marks, feedback, rationale, scanned pages, PDF) inside `student/tests/[paperId]` and are notified in-app when a result is issued.

## Non-Goals

- Email notification on issue (in-app only for v1).
- An "Unissue" / revoke button. Mistakes are corrected by editing the marking — edits propagate to the student.
- Parent visibility of the per-question review. Parents continue to see the aggregate grade only.
- Two-way comments / disputes from student on the marking.
- A bulk "Issue All" from batch marking. Each student is issued individually via the existing per-student review flow.

## Decisions

| Decision | Choice |
|---|---|
| Action model | One combined "Issue Result" button — writes Mark to gradebook AND shares per-question review with student |
| Image preview | In-page lightbox carousel (swipe / arrow keys / prev-next buttons) |
| PDF | "Download PDF" button, server-generated from stored images via PDFKit |
| Student review scope | Marks + feedback + lightbox of marked pages + rationale (labelled "Rationale", not "AI Rationale") |
| Notification | In-app only + status badge on the tests list |
| Revoke | No unissue button. Edits propagate. |
| Legacy `/publish` route | Renamed cleanly to `/issue`, no alias (no production users yet) |

## Architecture Overview

- New visibility fact on `PaperMarking`: `issuedToStudent`, `issuedAt`, `issuedBy`. Independent of the existing `status` field (which tracks gradebook publish state).
- Backend endpoint `POST /api/ai-tools/markings/:id/issue` (renamed from `/publish`) is the single atomic mutation: upserts the gradebook `Mark`, sets `issuedToStudent=true`, fires an in-app notification.
- Backend endpoint `GET /api/ai-tools/markings/:id/pdf` stitches the stored page images into a PDF on demand via the existing `src/common/pdf/createDocument()` helper.
- Student-facing read endpoints under `/api/ai-tools/students/me/markings` enforce ownership via `req.user.id` → `Student` lookup (same pattern as documented in `CLAUDE.md`).
- The teacher review UI and the student review UI share a new `MarkingQuestionCard` component (editable for teacher, read-only for student) and a new `MarkingPagesLightbox` component.

## Backend Changes

### Model: `PaperMarking`

`src/modules/AITools/model-marking.ts` — add three fields:

```ts
issuedToStudent: { type: Boolean, default: false, index: true },
issuedAt: { type: Date },
issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
```

The TypeScript interface for `PaperMarking` must be updated to match (see "Known Pitfalls — Mongoose Schema Must Match TypeScript Interface" in `CLAUDE.md`).

### Endpoints

All under `/api/ai-tools`. All teacher endpoints `authenticate` + `requireModule('ai_tools')`. School scope (`schoolId` filter) applied to every single-entity query — including `findOne` / `findOneAndUpdate` — per the multi-tenancy rule.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/markings/:id/issue` | Teacher | Renames `/publish`. Atomically: upserts gradebook `Mark` via existing `publishMarkToGradebook()`, sets `issuedToStudent=true`, `issuedAt=now`, `issuedBy=req.user.id`, fires `marking_result_issued` notification. Idempotent — calling again on an already-issued marking succeeds and re-fires notification only if the body explicitly opts in (default off). |
| `GET` | `/markings/:id/pdf` | Teacher OR owning student | Streams `application/pdf` stitched from `images[]` ordered by `pageNumber`. `Content-Disposition: inline; filename="<student-slug>-<paper-slug>-marked.pdf"`. |
| `GET` | `/markings/:id/image/:filename` | Teacher OR owning student | Auth-gated image bytes. Today `/uploads/markings/...` is statically served; this route exists so the student can access their own page images without opening up the static directory. Validates that `filename` matches an entry in `marking.images[]`. |
| `GET` | `/students/me/markings` | Student | List of issued markings for the current student. Supports `?paperId=` filter for the `student/tests/[paperId]` lookup. Returns `{ id, paperId, paperTitle, subjectName, percentage, totalMarks, maxMarks, issuedAt }[]`. |
| `GET` | `/students/me/markings/:id` | Student | Full marking detail — questions (answer, correct answer, marks awarded, max marks, feedback, rationale), images, issuedAt. Excludes teacher-only metadata (audit trail, batch info). |

### `publishMarking` → `issueMarking`

`src/modules/AITools/controller.ts` / `service.ts`:

- Rename the existing publish handler to `issueMarking`.
- Body: `{ assessmentId?: string, comment?: string }` (unchanged from current publish).
- Behavior: same gradebook publish (creates `Mark` via `publishMarkToGradebook()`), but additionally sets the three new `issued*` fields on the `PaperMarking` and fires the notification.
- Returns the updated marking.

### Student ownership resolver

`src/modules/AITools/service-student-ownership.ts` (new, or co-located in service-marking.ts):

```ts
async function resolveStudentForUser(userId: string): Promise<{ studentId: string, schoolId: string }>;
```

Looks up the `Student` record where `userId === req.user.id`, throws `NotFoundError` if none. Used by all `/students/me/...` endpoints to convert JWT `userId` → `studentId` before scoping queries.

### Notification

On issue, dispatch a notification via the existing notification service. Shape (matching whatever the rest of the app uses):

```ts
{
  userId: <student.userId>,
  schoolId,
  type: 'marking_result_issued',
  title: '<Paper title> result available',
  message: 'Your marked paper is ready to review.',
  link: `/student/tests/${paperId}`,
}
```

If the notification system supports Socket.IO push, the student gets a real-time toast; otherwise it shows on next login.

### PDF generation

`src/modules/AITools/service-marking-pdf.ts` (new):

- Reuses `src/common/pdf/createDocument()` (A4, buffered pages, existing footer logic via `finalise(doc)`).
- Header on page 1: paper title, student name, score (`<mark>/<max>` + percentage), issued date.
- Subsequent pages: one image per page, fit-to-page (`doc.image(absPath, { fit: [pageWidth, pageHeight], align: 'center', valign: 'center' })`).
- Reads images from `uploads/markings/<markingId>/<filename>` (absolute path resolved from the same base used by `service-marking-images.ts`).
- Skips missing files with a warning log (does not 500).
- Returns `Buffer`. Controller sets `Content-Type` and pipes to response.
- No caching for v1 — regenerated per request. Files are small (≤8 images × 5MB).

Edge case: marking from `/mark-paper-text` (digital answers, no images) — returns 404 `{ error: 'No marked pages to render' }`. Frontend hides the "Download PDF" button when `marking.images.length === 0`.

## Frontend Changes — Teacher Side

### Files modified

- `src/components/ai-tools/MarkingResults.tsx`
  - Replace the inline thumbnail strip (`<a target="_blank">` links) with a compact preview row showing up to 3 thumbnails and a "View all N pages" button.
  - Clicking any thumbnail opens `MarkingPagesLightbox`.
  - Add a "Download PDF" button next to the issue button (hidden when `images.length === 0`).
  - Rename "Publish to Gradebook" button → **"Issue Result"**.
  - When `marking.issuedToStudent === true`, replace the "Issue Result" button with disabled text: `Issued <relative-date>`. Edits to marks still save and propagate to the student silently.
  - Extract per-question card rendering into `MarkingQuestionCard` (shared with student review).

- `src/components/ai-tools/PublishToGradebookDialog.tsx`
  - Rename file/component to `IssueResultDialog.tsx`. Keep the assessment picker + comment field.
  - Update header copy: "Issue result to student" / "This will publish the mark to the gradebook and share the marking review with the student."
  - Confirm button label: "Issue Result".

### Files created

- `src/components/ai-tools/MarkingPagesLightbox.tsx`
  - Full-screen dialog, dark backdrop.
  - One image at a time. Prev/Next buttons, keyboard arrow-key navigation, touch swipe.
  - Page indicator (`3 / 8`). Esc / backdrop click closes.
  - Lazy-loads images one at a time (preloads neighbours).
  - Reused by student side.

- `src/components/ai-tools/MarkingQuestionCard.tsx`
  - Props: `question`, `editable: boolean`, `rationaleLabel: 'AI Rationale' | 'Rationale'`, `onChange?` (only when editable).
  - When `editable=true`: marks input is enabled, full teacher styling.
  - When `editable=false`: marks shown as read-only, no edit affordance.
  - Rationale shown in a collapsible section with the configured label.

- `src/hooks/useTeacherMarking.ts` — updates
  - Rename `publishMarking()` → `issueMarking()`. Endpoint: `POST /ai-tools/markings/:id/issue`.
  - Add `downloadMarkingPdf(id)` — `GET /ai-tools/markings/:id/pdf`, response type `blob`, triggers download with filename `<studentName>-<paperTitle>-marked.pdf` (slugified).

## Frontend Changes — Student Side

### Route extension

`src/app/(dashboard)/student/tests/[paperId]/page.tsx`:

- On load, call `useStudentMarking(paperId).getMarkingByPaper(paperId)`.
- If a marking is returned (i.e. `issuedToStudent === true` for the current student) → render `<StudentMarkingReview marking={...} />`.
- Otherwise → existing test-taking UI (unchanged).
- Loading state: spinner while resolving which view to render.

### Files created

- `src/components/student/StudentMarkingReview.tsx`
  - Header card: paper title, subject, score `<mark>/<max>` + percentage badge (semantic colour per existing convention), issued date.
  - "View marked pages" button → opens shared `<MarkingPagesLightbox>` (hidden when no images).
  - "Download PDF" button → `useStudentMarking().downloadMarkingPdf(id)` (hidden when no images).
  - Per-question list using `<MarkingQuestionCard editable={false} rationaleLabel="Rationale" />`.
  - No edit affordances. No issue/publish/edit-mark buttons.
  - Empty state: if marking has no questions (text-only edge case), show explanatory empty state.

- `src/hooks/useStudentMarking.ts`
  - `getMarkingByPaper(paperId)` → `GET /ai-tools/students/me/markings?paperId=<id>`, returns the first (and only) issued marking for that paper or `null`.
  - `getMarking(id)` → `GET /ai-tools/students/me/markings/:id`.
  - `downloadMarkingPdf(id)` → `GET /ai-tools/markings/:id/pdf` (same endpoint as teacher; backend gates auth).

### Tests list badge

`src/app/(dashboard)/student/tests/page.tsx`:

- The existing status badge already supports a `marked` state. Update the underlying hook (whichever fetches the list) to set status to `marked` when an issued marking exists for that paper-student.
- No new badge state needed.

## Auth & Multi-tenancy Notes

Per `CLAUDE.md` known pitfalls — these must be observed:

- Every `PaperMarking.findOne` / `findOneAndUpdate` includes `schoolId` from `req.user.schoolId`.
- All queries include `isDeleted: false`.
- `req.user.id` is the `User._id`, not `Student._id` — the student ownership resolver handles the conversion.
- Student endpoints check that the resolved `studentId` equals `marking.studentId` before returning data. Otherwise 404 (not 403 — don't leak existence).

## Testing Approach

**Backend (vitest):**

- Unit tests for the new endpoints:
  - Teacher can issue, mark visibility flags are set, gradebook `Mark` is upserted, notification is fired.
  - Student can fetch their own issued markings; cannot fetch another student's.
  - PDF endpoint returns non-empty buffer for a marking with images; returns 404 for one without.
  - `schoolId` scoping: a teacher from another school cannot fetch a marking via direct ID.

**Frontend (manual, in-browser):**

Per the CLAUDE.md rule for UI changes — run the dev server and verify in browser:

1. Teacher uploads images, marks, opens lightbox, navigates pages, downloads PDF, clicks "Issue Result".
2. Student logs in, sees notification, sees "marked" badge on tests list, clicks paper, sees review with marks/feedback/rationale, opens lightbox, downloads PDF.
3. Edge cases: text-only marking (no images, no PDF button, no lightbox button); marking from another school not accessible; mark edit after issue propagates to student.

No automated UI tests — the codebase doesn't have a frontend test runner.

## Open Risks

- **Rationale wording for students.** AI-generated rationale was written for teacher consumption ("the student likely confused X and Y"). Surfacing it to students under the label "Rationale" could read condescendingly. Mitigation: ship as-is for v1; if feedback surfaces, add a backend pass that rewrites rationale tone for student view.
- **Mark edits after issue are silent.** A teacher who corrects a mark won't trigger a notification — the student sees the new value next time they open the review. Acceptable for v1; we can add a re-notify button later if needed.
- **PDF generation on demand.** With ≤8 images × ≤5MB each, this should be sub-second. If it becomes a hot path (many concurrent students downloading), revisit caching.
