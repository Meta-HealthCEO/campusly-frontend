# Module 2 — Test/Paper Generation (Production-Ready) — Design Spec

**Status:** Draft
**Date:** 2026-04-18
**Author:** Shaun + Claude
**Part of:** Teacher Portal Production-Readiness, module-by-module pass

## 1. Goal

Make test paper generation a single canonical, production-ready flow. A solo teacher picks subject/grade/term/topic, chooses AI generation (the day-1 path) or manual mode (placeholder for when Question Bank fills in Module 4), receives a CAPS-aligned paper plus a memo, edits per-question if desired, finalises, and downloads programmatic PDFs (paper + memo) ready to print and use in class.

**Success criteria:**

- A solo teacher with one CAPS-aligned class can produce a finalised paper + memo PDF in under 5 minutes (AI mode), with no choice paralysis about which paper UI to use.
- Every paper is a single canonical record (`AssessmentPaper`) with a separate `PaperMemo`. No `GeneratedPaper` records remain in the system.
- All five legacy paper UIs redirect to `/teacher/papers`. There is exactly one canonical paper experience.
- Paper PDFs are PDFKit-generated (never HTML-to-PDF), correctly render math/science diagrams via the TikZ renderer service, and produce exam-style structured layouts (numbered questions, marks columns, section headers, blank answer space).
- The teacher can edit, regenerate via AI, swap from Q-bank, or delete individual questions on the detail page.
- Memo is a first-class entity, edited separately, and its PDF reflects current memo content.
- No `apiClient` imports leak into pages or components.

## 2. Non-goals

Deferred to future modules:

- **Question Bank seeding** → Module 4. Manual-mode picker exists but its results are empty until then.
- **Polished manual builder** (drag/reorder, bulk add, advanced filtering) → Module 4 alongside Q-bank seed.
- **HOD moderation workflow** — solo teachers auto-finalise. The `PaperModeration` model already exists; full moderation routing arrives when multi-teacher schools become a target persona.
- **Online quiz / student-takes-test in browser** — different problem; tracked separately.
- **AI photo marking** → Module 3.
- **Past Paper library** — separate.
- **Paper templates / clone** — defer.
- **Per-class issuance / printing batches** — papers print class-agnostic; class assignment happens at homework attach later.

## 3. Core architectural decisions

### 3.1 Unify on `AssessmentPaper`, deprecate `GeneratedPaper`

The codebase has two parallel paper models. They both ship to production today via separate routes/UIs. Module 2 collapses them.

`AssessmentPaper` ([QuestionBank/model.ts](../../../../../../campusly-backend/src/modules/QuestionBank/model.ts)) becomes the single canonical record. It uses `subjectId/gradeId` refs (multi-tenancy clean), already has CAPS compliance scoring, and uses a separate `PaperMemo` for the memo. `GeneratedPaper` ([AITools/model.ts](../../../../../../campusly-backend/src/modules/AITools/model.ts)) is migrated and deleted.

**Why:** parallel models are the root of the UX fragmentation. The CAPS compliance scoring, multi-tenancy hygiene, and memo normalization on `AssessmentPaper` are all directionally correct. The 2 existing `GeneratedPaper` docs are trivially backfillable.

**Alternative rejected:** federate at the UI layer. Rejected — perpetuates two PDF generators, two AI services, two memo flows. UX fragmentation re-emerges as soon as anyone adds a feature.

### 3.2 PDF generation is programmatic

Continues the Module 1 rule. Paper PDFs are produced by the existing `common/pdf/` builders (PDFKit under the hood). Math/science diagrams are TikZ source compiled by the existing renderer at `http://localhost:3600` to SVG, then embedded in the PDF. **Never HTML-to-PDF.**

### 3.3 CAPS topic required on every paper

Same rule as lesson plans (Module 1). The paper carries `topicIds: ObjectId[]` (one or more CAPS curriculum nodes). At least one is required at create time. Without alignment, downstream pacing/coverage analytics fragment.

### 3.4 Memo is a first-class entity, atomically created with the paper

AI generation produces a paper + memo together. Both records must be created. Same compensation pattern as Module 1's lesson-plan + staged-homework: create memo, then paper, rollback memo on failure. MongoDB is standalone — no transactions.

Memo edits do **not** auto-update if the teacher edits a question. The detail page shows a visual "memo may be stale" hint when a question's content changed after the memo was last edited. This is honest about the data; auto-sync would silently overwrite teacher intent.

### 3.5 Solo teacher moderation bypass

When the calling user has `isSchoolPrincipal === true` (the standalone-teacher pattern from Module 1), the `POST /papers/:id/finalise` endpoint sets `status: 'finalised'` directly with no `PaperModeration` record. For non-principal teachers in real schools, the moderation flow is deferred — they can save drafts and edit but cannot finalise. This is acceptable because the launch persona is solo teachers.

### 3.6 Single canonical UI route

`/teacher/papers` is the single entry point. The four legacy routes (`/teacher/curriculum/assessments`, `/teacher/curriculum/papers`, `/teacher/ai-tools/create-paper`, `/teacher/ai-tools/papers`, `/teacher/workbench/papers/builder`) redirect (302) to `/teacher/papers`. Sidebar nav shows only the canonical entry.

## 4. Data model changes

### 4.1 `AssessmentPaper` ([QuestionBank/model.ts](../../../../../../campusly-backend/src/modules/QuestionBank/model.ts))

```ts
// Added
aiGenerated:  { type: Boolean, default: false }
topicIds:     { type: [ObjectId], ref: 'CurriculumNode', required: true, validate: v => v.length >= 1 }
difficulty:   { type: String, enum: ['easy','medium','hard'], default: 'medium' }

// Confirmed (already present, no change)
subjectId, gradeId (refs), term, year, paperType, totalMarks, duration,
sections[], capsCompliance, status: ['draft','finalised','archived'],
createdBy (teacherId), schoolId, isDeleted, timestamps
```

The `sections[]` shape stays as currently defined — array of `{ title, instructions, questions[] }`. Each question is one of two shapes (discriminated by presence of `questionId`):

- **Bank-ref question:** `{ questionId: ObjectId ref 'Question', marks: number, position: number }`. Used when the teacher picked an existing Q-bank question via the manual flow.
- **Inline question:** `{ questionText: string, marks: number, position: number, modelAnswer?: string, markingGuideline?: string, diagram?: { tikz, caption, svgUrl?, renderStatus } }`. Used by AI generation (which does not write to the Q-bank — it writes inline questions on the paper directly), and used after `regenerate` of any question (regenerated question is always inline; the original Q-bank reference is severed).

Memo entries reference the question by `position` within its section so memo and paper stay aligned regardless of which shape the question takes.

### 4.2 `PaperMemo` ([teacherWorkbench/model.assessment.ts](../../../../../../campusly-backend/src/modules/teacherWorkbench/model.assessment.ts))

No schema change. Confirm fields:

```ts
paperId:    ObjectId ref 'AssessmentPaper'
schoolId, teacherId
sections:   [{ title, items: [{ questionId | inlineRef, modelAnswer, markingGuidelines, marks }] }]
totalMarks: Number
status:     'draft' | 'final'
isDeleted, timestamps
```

### 4.3 `GeneratedPaper` deprecation

- Backfill: a one-time script (`scripts/migrate-generated-papers.ts`) reads the 2 existing `GeneratedPaper` docs and creates equivalent `AssessmentPaper` + `PaperMemo` records, then soft-deletes the originals.
- Remove: `src/modules/AITools/model.ts` `GeneratedPaper` schema, controllers, routes that operate on it. Keep AI generation services but redirect their output to `AssessmentPaper` + `PaperMemo`.
- The Marking module (out of scope for Module 2 but a downstream consumer) currently references `GeneratedPaper`. Update its references to `AssessmentPaper` in this module's cleanup task — no behavior change, just a model rename.

### 4.4 Migration

The 2 `GeneratedPaper` docs map cleanly: `subject` → `subjectId` (lookup by name or fall back to first matching), `grade` → `gradeId` (same), `term/duration/totalMarks/sections` map directly. Embedded `memorandum` becomes a new `PaperMemo` record.

For the more general case (when AI gen string fields can't resolve to a ref), the migration logs and skips. We accept missing 1 of 2 docs as acceptable — these are demo records.

## 5. Backend changes

### 5.1 Routes (canonical, all under `/api/papers`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/papers/generate` | AI generate paper + memo (compensation flow). Body: metadata + section config. |
| POST | `/papers` | Manual create — empty paper shell with sections defined |
| GET | `/papers` | List, paginated, filterable (subject/grade/term/status) |
| GET | `/papers/:id` | Detail, populates topics + memo + question refs |
| PUT | `/papers/:id` | Update metadata (title, duration, totalMarks, etc.) |
| POST | `/papers/:id/questions` | Add a question to a section (manual mode, refs Q-bank) |
| PUT | `/papers/:id/questions/:qid` | Edit a question (text, marks, model answer) — works on inlined and Q-bank questions |
| POST | `/papers/:id/questions/:qid/regenerate` | AI regenerates a single question, preserves marks/position |
| DELETE | `/papers/:id/questions/:qid` | Remove a question from the paper |
| PUT | `/papers/:id/memo` | Update the memo (sections + items) |
| POST | `/papers/:id/finalise` | Solo principal: status → finalised. Otherwise: 403 (moderation deferred). |
| GET | `/papers/:id/pdf` | Stream paper PDF |
| GET | `/papers/:id/memo-pdf` | Stream memo PDF |
| DELETE | `/papers/:id` | Soft delete (cascade memo) |

The existing `POST /api/ai-tools/generate-paper` is **deprecated** — it now redirects (HTTP 308) to `POST /papers/generate`. Same for the AITools paper CRUD routes. They keep working through the redirect for one release cycle, then are removed.

### 5.2 Services

- `service-papers.ts` (existing) — extend with the new endpoints. CRUD + finalise + memo edit.
- `service-paper-generation.ts` (existing) — refactor to write `AssessmentPaper` + `PaperMemo` instead of `GeneratedPaper`. Compensation flow: try memo create, on success try paper create with `memoId` link, on failure soft-delete the memo. Reverse order is also acceptable (paper then memo) — pick whichever has the simpler dependency chain.
- `service-paper-questions.ts` (new file) — add/edit/delete/regenerate question logic. Splits out from `service-papers.ts` to keep files <350 lines. Includes `assertCanEditPaper(paper, actorId, actorRole, action)` helper that mirrors Module 1's pattern: only owner or school admin can mutate; only `draft` status accepts question mutations.
- `service-pdf.ts` (existing) — keep. Audit for: (a) handles inline-question refs and Q-bank-question refs symmetrically, (b) tolerates failed TikZ renders by emitting a `[diagram unavailable]` placeholder rather than failing the whole PDF.
- `service-memo-pdf.ts` (new helper, or inline into service-pdf.ts) — separate function for memo PDF rendering. Reuses the same A4/Helvetica conventions.

### 5.3 AI generation contract

The existing Claude Sonnet 4.6 prompt produces:
```ts
{ sections: [{ title, instructions, questions: [{ questionText, marks, modelAnswer, markingGuideline, diagram?: { tikz, caption } }] }], memorandum: { ... } }
```

This stays. The output is **split** into:
- `AssessmentPaper.sections[]` — gets `questionText`, `marks`, optional `diagram.tikz` + `diagram.svgUrl` (after TikZ render)
- `PaperMemo.sections[]` — gets `modelAnswer`, `markingGuideline` per question, indexed back to the question via inline `questionRef` (or by position if inline questions don't have IDs yet)

The split happens in `service-paper-generation.ts`. AI prompt unchanged.

### 5.4 Single-question regeneration

`POST /papers/:id/questions/:qid/regenerate` — the existing `service.ts` has `regenerateQuestion(paperId, qid)` in AITools. Lift it into `service-paper-questions.ts`.

Behavior:
- Keeps `marks` + `position` within section unchanged.
- Replaces `questionText`, `modelAnswer`, `markingGuideline`, `diagram` (if any).
- **Always produces an inline question** even if the original was a bank-ref. Regeneration severs the bank link — the result is teacher-edited content unique to this paper.
- Updates both paper and memo in one operation. Compensation flow: if memo update fails, rollback paper update.

### 5.5 PDF generation — exam-style structure

The current PDFs need an audit pass. The output must look like a real exam:

- Cover page: school name, paper title, paper code (auto), subject, grade, term, year, total marks, duration, instructions (bulleted).
- Section headers: "SECTION A — Multiple Choice (10 marks)" — bold, underlined, with section instructions.
- Each question: number, text, marks in right column (e.g. `[5]`), blank space proportional to marks (default: 1 line per 2 marks for short-answer questions, no extra space for MCQs since options are listed inline).
- Diagrams: SVG embedded inline at point of reference. Fall back to `[Diagram unavailable]` block if the TikZ render failed.
- Page breaks: never split a question across pages unless the question itself is too long for one page. Use PDFKit's `widow` heuristic.
- Footer: page X of Y.

The memo PDF is stripped-down: per question, show the marking model — answer + marking guideline. Same fonts/margins.

### 5.6 Migration script

`scripts/migrate-generated-papers.ts`:
- Read each `GeneratedPaper` doc.
- Resolve `subject` → `subjectId` (Subject.findOne by name + schoolId), `grade` → `gradeId`. Skip + log if unresolved.
- Create `AssessmentPaper` from sections.
- Create `PaperMemo` from `memorandum`.
- Soft-delete the original `GeneratedPaper`.
- Run once via `npx tsx scripts/migrate-generated-papers.ts`. Log summary.

## 6. PDF rendering quality

This is the launch-critical bit (per the project's `feedback_pdf_generation.md` memory and the user's stated print priority). The audit task verifies:

1. PDFKit (programmatic) — confirmed by reading import statements.
2. Mark allocation column right-aligned at consistent x-position.
3. Section breaks and page breaks behave under stress (100-question test).
4. TikZ failure is non-fatal — paper still renders.
5. Memo numbering matches paper numbering.
6. Local-timezone date formatting (no UTC slice — same Module 1 fix).

If the existing generators fail any of these, the paper-PDF task in this module includes the fixes.

## 7. Frontend changes

### 7.1 Routes

- `/teacher/papers` (new) — list page, replaces all legacy paper routes.
- `/teacher/papers/new` (new) — wizard route.
- `/teacher/papers/[id]` (new) — detail page (paper + memo tabs).
- Redirects: 4 legacy routes → 302 to `/teacher/papers`. Implement as Next.js `redirect()` from page.tsx (or `next.config.js` redirects, whichever fits the project's pattern).

### 7.2 Components

- `src/components/papers/PaperCard.tsx` (new) — list-row card.
- `src/components/papers/PaperFilters.tsx` (new) — subject/grade/term/status filters.
- `src/components/papers/PaperWizard.tsx` (new, ~250 lines) — multi-step form.
  - Step 1: metadata (subject, grade, term, paperType, duration, totalMarks, topicIds, title).
  - Step 2: mode toggle. AI mode shows `PaperWizardAIConfig` subcomponent. Manual mode shows `PaperWizardManualConfig`.
  - Step 3: triggers create + redirects to detail page.
- `src/components/papers/PaperWizardAIConfig.tsx` (new) — section count + per-section question count + difficulty + topic mix.
- `src/components/papers/PaperWizardManualConfig.tsx` (new) — define section titles + instructions + per-section "Add Question" picker.
- `src/components/papers/PaperDetailPaperTab.tsx` (new) — renders sections + questions, edit/regen/swap/delete inline, "Memo may be stale" banner if memo edits predate question edits.
- `src/components/papers/PaperDetailMemoTab.tsx` (new) — renders memo, per-question editable answer + guideline.
- `src/components/papers/QuestionEditDialog.tsx` (new) — edit dialog for question text/marks/answer.
- `src/components/papers/QuestionBankPicker.tsx` (new, minimal) — list questions with subject/grade filter; empty-state guidance when 0 results.

### 7.3 Hook

`src/hooks/useTeacherPapers.ts` (new):
- `papers, loading, fetchPapers, filters` — list state
- `createPaperManual(input)`
- `generatePaperWithAI(input): Promise<Paper>`
- `getPaperById(id)`
- `updatePaperMetadata(id, patch)`
- `addQuestion(paperId, sectionIdx, question)`
- `updateQuestion(paperId, qid, patch)`
- `regenerateQuestion(paperId, qid): Promise<Question>`
- `deleteQuestion(paperId, qid)`
- `updateMemo(paperId, memoPatch)`
- `finalisePaper(id)`
- `downloadPaperPdf(id)`
- `downloadMemoPdf(id)`
- `deletePaper(id)`

All `apiClient` calls live here. Pages and components are pure UI.

### 7.4 Type updates

- `src/types/papers.ts` (new) — `Paper`, `PaperSection`, `PaperQuestion`, `PaperMemo`, `MemoSection`, `MemoItem`, `PaperStatus`, `PaperDifficulty`.
- `src/types/index.ts` — re-export.

### 7.5 Sidebar / nav

- TEACHER_NAV: rename "Assessments" / "AI Studio Papers" / "Workbench Papers Builder" entries to a single "Papers" entry pointing to `/teacher/papers`.
- Hide deprecated entries.

## 8. User flow (solo teacher happy path)

1. Teacher goes to `/teacher/papers`.
2. Empty state for first time: "No papers yet — create your first test paper".
3. Click "+ New Paper" → `/teacher/papers/new`.
4. Step 1: select Mathematics, Grade 4, Term 2, Test, 60 min, 50 marks, CAPS topic "Fractions", title "Term 2 Test".
5. Step 2: select AI mode. Configure: 2 sections; Section A = 5 short-answer / 20 marks; Section B = 3 long-answer / 30 marks; difficulty = medium.
6. Click Generate. Spinner; status updates ("generating questions...", "rendering diagrams...").
7. ~30s later, lands on `/teacher/papers/<id>`. Paper tab shows the generated paper, Memo tab shows the memo.
8. Reviews question 3 — clicks Edit, tweaks the wording, saves.
9. Reviews question 5 — clicks "Regenerate with AI", new version comes back, accepts.
10. Switches to Memo tab, edits the marking guideline for Q1 to add a hint.
11. Clicks Finalise. Status flips to `finalised` (auto-approved as principal).
12. Clicks "Download PDF" → paper PDF streams. Opens it. Confirms layout.
13. Clicks "Download Memo PDF" → memo PDF streams.
14. Prints both, walks into class.

## 9. Risks

| Risk | Mitigation |
|---|---|
| AI generation timeout (Claude > 60s) | UI shows progress, gives clear "still working" message. Backend retries once on transient failure. |
| TikZ render service down | Paper PDF emits `[diagram unavailable]` placeholder per failed diagram; rest of PDF renders. Diagrams can be regenerated later via per-question regen. |
| `GeneratedPaper` migration loses data | Script logs unresolved subject/grade lookups, leaves originals as soft-deleted. 2 docs in DB — manual recovery possible if needed. |
| Manual mode picker is empty (no Q-bank) | Empty state shows "Question Bank is empty — generate questions in the question bank, or use AI mode here". Acceptable on day 1 per scope. |
| Deprecated routes break bookmarks | All 4 legacy routes redirect (302) to `/teacher/papers`. No hard 404. |
| PDF page-break splitting questions awkwardly | Audit pass on PDF generator includes widow heuristic. Test with a 100-Q paper. |
| Memo edits silently mismatch question edits | Detail page shows "Memo may need review — questions changed after memo was last edited" banner with timestamp comparison. |
| Compensation flow rollback (paper or memo create fails) | Mirror Module 1's pattern: log rollback failures via `logger.error`, never silently orphan records. |
| Existing AI-tools route has live consumers | Map deprecated routes via 308 redirects for one release cycle. Frontend gets updated this module; external clients have a grace period. |

## 10. Out of scope (for explicit deferral)

- Q-bank seeding (Module 4)
- Polished manual builder (Module 4)
- HOD moderation routing (when multi-teacher)
- Online quiz / student-takes-test
- AI photo marking (Module 3)
- Past Paper library
- Paper templates / clone
- Per-class issuance / printing batches
- Exporting paper to other formats (Word, etc.)

## 11. Acceptance criteria

- [ ] All 4 legacy paper routes 302-redirect to `/teacher/papers`. Sidebar shows only the canonical entry.
- [ ] `GeneratedPaper` model is removed from the codebase. Existing 2 docs are migrated to `AssessmentPaper` + `PaperMemo`.
- [ ] AI generation writes to `AssessmentPaper` + `PaperMemo` atomically; on failure, both are rolled back and the failure is logged.
- [ ] A solo teacher with `isSchoolPrincipal=true` can finalise a paper directly. `POST /papers/:id/finalise` returns 200 and sets `status='finalised'`.
- [ ] Non-principal teachers cannot finalise — endpoint returns 403 with a clear message about moderation being deferred.
- [ ] `topicIds` is required on every paper. Create rejects empty `topicIds`.
- [ ] Paper detail page supports edit/regenerate/swap/delete on individual questions.
- [ ] Memo PDF reflects current memo state (not a stale snapshot).
- [ ] Paper PDF starts with `%PDF`, embeds at least one TikZ-rendered diagram if present in source, and renders without overlapping section headers or splitting questions across pages awkwardly.
- [ ] If the TikZ renderer is unreachable, paper PDF still streams (with placeholder for failed diagrams) — never fails the whole download.
- [ ] No `apiClient` imports under `/teacher/papers` pages or `papers` components.
- [ ] All new files under 350 lines. No `any`, no `text-red-*`, no `catch (err)` without `: unknown`.
- [ ] Wizard's manual mode shows an empty-state with link/CTA when Q-bank has 0 matches.
- [ ] Date in PDF metadata uses local timezone (no UTC slice).
