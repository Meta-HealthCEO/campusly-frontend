# Teacher Phase 2B: Papers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher can see where each paper stands and move it along. That means:
- moderation status on the list, with the HOD's comments on the paper
- a memo that exists as soon as the paper does
- a finalise step that works for every kind of teacher
- one clear way into converting a PDF and into the question bank

**Architecture:**
- **Backend:**
  - The papers list joins each paper's `PaperModeration` in one batched query.
  - Moderation approval links the gradebook assessment, the same way admin finalising does.
  - Independent teachers finalise directly, because they have no moderator.
  - HODs can read their department's papers.
  - A memo is built from the paper's own model answers when none exists. No AI is needed.
- **Frontend:**
  - The list shows a status chip and filter.
  - The paper page shows the moderation state and comments.
  - The broken moderation page redirects to the filtered list.

**Tech Stack:** Express 5, Mongoose 9, vitest and supertest; Next.js 16.2.1, React 19, Tailwind 4 and vitest.

**Spec:**
- `docs/superpowers/specs/2026-09-24-teacher-portal-programme.md`:
  - the Papers row of §4: "Convert a PDF, moderation status on the list, one memo editor"
  - the HOD oversight row
  - the Assess row of §3
- Tracker item `a1`. Research is in `.superpowers/research/phase2-papers.md`.

**Branches:** `feat/teacher-phase-2b-papers` in both repos, stacked on 2C until 2A and 2C merge.

## Global Constraints

- Everything in phase 2A's Global Constraints applies.
- **Moderation words in the UI:**
  - `pending` → "With your HOD" (StatusChip `due`)
  - `approved` → "Approved" (`done`)
  - `changes_requested` → "Changes asked" (`overdue`)
  - no record → nothing shown
- **Finalising:**
  - Admins, principals and independent teachers finalise directly.
  - A school teacher submits for moderation.
  - The error for a school teacher who tries to finalise says: "Submit this paper for moderation. Your HOD or a school admin finalises it."

## Review Focus

1. **An independent teacher finalises a paper.** It becomes finalised, and the gradebook assessment is linked (Task 3).
2. **An HOD opens a paper in their department from the moderation queue.** It opens; a paper outside their department gives 403 (Task 4).
3. **A paper approved through moderation shows up in the gradebook**, the same as one an admin finalised (Task 3).
4. **The Memo tab on a paper with no memo** offers "Build memo from model answers", which creates the memo once. A second click, or a race, doesn't create a second (Task 5).
5. **The list filter `?moderation=pending` survives a reload**, and the old moderation page redirects to it (Task 7).

---

### Task 1: Papers list carries moderation status (backend)

**Files:**
- Modify: `src/modules/QuestionBank/service-papers.ts` (`listPapers`)
- Test: `src/modules/QuestionBank/__tests__/list-papers-moderation.test.ts` (real Mongo)

**Interfaces:**
- Produces: each listed paper gains `moderation: { status: 'pending' | 'approved' | 'changes_requested'; comments: string | null; updatedAt: string } | null`.

- [ ] **Step 1: Write the failing test.** Three papers by one teacher: one with a pending `PaperModeration`, one with `changes_requested` and comments, and one with none. Assert `listPapers(...)` returns the matching `moderation` values, and `null` for the third.
- [ ] **Step 2: Run it.** Expected: FAIL (no field).
- [ ] **Step 3: Implement.** After the page query, run `PaperModeration.find({ paperId: { $in: ids }, schoolId, isDeleted: false }).select('paperId status comments updatedAt').lean()`, then map it onto the results. Do not use `$lookup`; the unique `paperId` index makes the batch cheap.
- [ ] **Step 4: Run it and the QuestionBank suite.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(papers): list shows each paper's moderation status`.

### Task 2: Moderation references point at the real paper model (backend)

**Files:**
- Modify: `src/modules/TeacherWorkbench/model.assessment.ts`. `PaperMemo.paperId` and `PaperModeration.paperId` get `ref: 'AssessmentPaper'`.
- Modify: the HOD queue select in `src/modules/Department/service.moderation.ts`, so it uses `title subjectId gradeId totalMarks` populated from `AssessmentPaper`.
- Test: extend `src/modules/Department/__tests__/hod-review.test.ts`. The HOD queue returns the paper title and total marks, not "Unknown" or 0.

- [ ] Steps: write the failing test, run it (FAIL), implement, run it (PASS), then commit `fix(moderation): queue and memos reference AssessmentPaper, so titles and marks show`.

### Task 3: Finalising works for everyone who should be able to (backend)

**Files:**
- Modify: `src/modules/QuestionBank/service-papers-pdf-finalise.ts` (`finalisePaper` gains `actorIsStandalone: boolean`)
- Modify: `src/modules/QuestionBank/controller-papers.ts`, passing `Boolean(user.isStandaloneTeacher)`
- Modify: `src/modules/TeacherWorkbench/services/moderation.service.ts`. On approve, call `ensureLinkedAssessment(paper)` in a try/catch that logs, the same as admin finalising.
- Test: `src/modules/QuestionBank/__tests__/finalise-paths.test.ts`, covering:
  - an independent teacher finalises
  - a school teacher gets the new error text
  - moderation approval creates the linked Assessment

- [ ] Steps: test first (RED), implement, run the suite (GREEN), then commit `fix(papers): independent teachers finalise directly; approved papers reach the gradebook`.

### Task 4: HODs can open their department's papers (backend)

**Files:**
- Modify: `src/modules/QuestionBank/service-papers-auth.ts`. A `read` is also allowed when the actor is an HOD (`isHOD` claim) whose department teaches the paper's subject. Pass the claim through the service callers as an options object, and check the department membership in the service layer, where the DB is available.
- Test: `src/modules/QuestionBank/__tests__/hod-read.test.ts`. An HOD of the paper's department reads it (200). An HOD of another department gets 403, and so does a plain teacher.

- [ ] Steps: test first, implement, run the suite, then commit `fix(papers): HODs can read papers in their department`.

### Task 5: Build the memo from the paper's model answers (backend + frontend)

**Files:**
- Backend:
  - Add `POST /question-bank/papers/:id/memo`: create a memo when missing, idempotent (`findOneAndUpdate` with upsert on `{ paperId, isDeleted: false }`).
  - Its sections mirror the paper sections. Each question gets `expectedAnswer = modelAnswer ?? ''`, `markAllocation = marks`, and empty mistakes and alternatives.
  - Test: `src/modules/QuestionBank/__tests__/memo-from-paper.test.ts`. The first call creates the memo; a second returns the same `_id`; a finalised paper is refused (403).
- Frontend:
  - `usePaperMemo` (or the hook the Memo tab uses) gains `buildMemo()`.
  - The paper page's "Memo not available yet" becomes an `EmptyState` with a "Build memo from model answers" button, which calls the hook, then reloads.

- [ ] Steps: backend test first, implement it, then the frontend. Commit `feat(papers): a missing memo is built from the paper's model answers`.

### Task 6: Moderation status on the list and the paper (frontend)

**Files:**
- Modify: `src/types/papers.ts` (`Paper.moderation?`)
- Create: `src/lib/moderation-chip.ts` with `moderationChip(m: Paper['moderation']): { status: ChipStatus; label: string } | null`
- Test: `tests/moderation-chip.test.ts`
- Modify: `src/app/(dashboard)/teacher/papers/page.tsx`:
  - a "Review" column with the chip
  - a filter `All | With your HOD | Changes asked | Approved` bound to `?moderation=`
  - a "Question bank" link in the header, beside "Convert Existing Paper"
- Modify: `src/app/(dashboard)/teacher/papers/[id]/page.tsx`. The header shows the chip, and when changes were asked, an attention-toned note with the HOD's comments.
- Add both pages to `MIGRATED` (migrate their raw classes).

- [ ] Steps: test the helper first, then the pages. Take a screenshot as Thandi, and as an HOD if one is seeded. Commit `feat(papers): see each paper's moderation status and your HOD's comments`.

### Task 7: Retire the old moderation page (frontend)

**Files:**
- `next.config.ts`: `/teacher/workbench/papers/moderation` → `/teacher/papers?moderation=pending`
- Delete that page, and `ModerationCard` and `usePaperModeration.fetchStatus` if they're now unused (grep first)
- `tests/legacy-redirects.test.ts`: add the source
- HOD page: `ModerationQueueTable` rows get an "Open paper" link to `/teacher/papers/:id`

- [ ] Steps: redirect test first (RED), implement, run the suite, then commit `refactor(papers): moderation lives on the papers list; HODs open papers from their queue`.

### Task 8: Verify, review, ship

- [ ] Run both suites, typegen, tsc and eslint. Tour the papers list, the paper page and the HOD page at 1440 light, 1440 dark and 390 light.
- [ ] Whole-branch review (fresh reviewer, most capable model), then one fix pass, test first.
- [ ] Push, open PRs, wait for Vercel, merge in order (2A, 2C, 2B), reseed and update the tracker (`a1`).

**Deferred to a later phase (recorded in the tracker):** "Convert a PDF" producing a paper, not only Content Library resources. The import worker produces `ContentResource`s, and mapping them onto `AssessmentPaper` sections is a feature of its own.
