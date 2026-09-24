# Teacher Phase 2D: Draft Homework with AI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher setting exercise homework drafts the questions with AI for the CAPS topic they picked. They choose the kind and number of questions and how hard they are, keep the ones they like, and those are added to the homework. This matches what the Assignments wizard already does for briefs and rubrics.

**Architecture:** Frontend only. The question bank already has:
- `POST /question-bank/questions/generate`: AI, with the `aiGeneration` entitlement and a limit of 20 a day per teacher. It saves questions as drafts.
- `POST /question-bank/questions/:id/save-to-bank`: draft to approved.

The homework picker only lists approved questions, so this flow generates, lets the teacher choose, approves the chosen ones, and selects them. Rejected drafts stay drafts in the bank. The existing homework `POST` is unchanged.

**Spec:**
- `docs/superpowers/specs/2026-09-24-teacher-portal-programme.md`, the Homework & assignments row of §4: "AI drafting for homework, matching assignments".
- Tracker item `a4`. Research is in `.superpowers/research/phase2-gradebook-homework.md` §E.

**Branch:** frontend `feat/teacher-phase-2d-homework-ai`, stacked on `feat/teacher-phase-2b-papers`.

## Global Constraints

- Phase 2A's frontend constraints apply.
- **Without an AI key:** if generation fails (for example, no `ANTHROPIC_API_KEY` on the server, or the daily limit is reached), the dialog shows the server's message and the teacher keeps everything they had. Nothing is added.
- **Plain words:** "Easier / Standard / Stretch", not Bloom's or CAPS level codes.

## Review Focus

1. **No topic picked in step 1.** "Draft with AI" is disabled and says why (Task 3).
2. **Generation fails** (no key, the limit, a timeout). There's a clear message, and it can be retried (Task 3).
3. **Only some drafts can be approved** (one save-to-bank fails). The questions that were approved are added, and the teacher is told how many weren't (Task 2).
4. **Drafts already approved** show up in the picker without a page reload (Task 3).

---

### Task 1: Draft requests (pure)

**Files:**
- Create: `src/lib/homework-ai-draft.ts`
- Test: `tests/homework-ai-draft.test.ts`

**Interfaces:**
- Produces:

```ts
export type DraftLevel = 'easier' | 'standard' | 'stretch';
export type DraftQuestionType = 'mcq' | 'short_answer' | 'true_false' | 'fill_blank';
export interface DraftScope { subjectId: string; gradeId: string; curriculumNodeId: string }
export function draftBlockedReason(scope: Partial<DraftScope>): string | null; // "Pick a subject and class first." | "Pick a CAPS topic in step 1 to draft questions for it." | null
export function draftRequest(scope: DraftScope, opts: { type: DraftQuestionType; count: number; level: DraftLevel }): {
  curriculumNodeId: string; subjectId: string; gradeId: string; type: DraftQuestionType; count: number;
  difficulty: number; cognitiveLevel: { caps: 'knowledge' | 'routine' | 'complex'; blooms: 'remember' | 'apply' | 'analyse' };
};
// easier → difficulty 2, knowledge/remember; standard → 3, routine/apply; stretch → 4, complex/analyse; count clamped to 1–10
```

- [ ] Steps: write the test (RED), implement, run it (GREEN), then commit `feat(homework): AI draft requests in plain words`.

### Task 2: The draft hook

**Files:**
- Create: `src/hooks/useHomeworkAIDraft.ts`, which returns `{ drafting, drafts, error, draft(body), keep(ids) }`.
  - `draft` posts to `/question-bank/questions/generate` and stores the returned questions (normalised to `{ id, questionText, answer, marks, type }` by a pure `toDraftQuestion` in `homework-ai-draft.ts`, which is tested).
  - `keep` calls `save-to-bank` for each id with `Promise.allSettled` and returns `{ keptIds, failed }`.
- Test: `tests/homework-ai-draft.test.ts` gets cases for `toDraftQuestion` (answer from `answer`, `correctAnswer`, or the correct MCQ option; marks default to 1) and for a pure `keptSummary(failed: number)` ("Added" vs "Added; 2 couldn't be saved").

- [ ] Steps: tests (RED), implement, run them (GREEN), then commit `feat(homework): draft questions with AI and keep the ones you like`.

### Task 3: "Draft with AI" in the exercise picker

**Files:**
- Create: `src/components/homework/DraftHomeworkWithAIDialog.tsx`, a flex-col dialog with a sticky footer and three steps:
  1. **Choose** the type, how many and the level. The button reads "Draft questions".
  2. **Drafting**, with a spinner and "Writing questions for <topic>…".
  3. **Pick:** each draft is a checkbox row (all ticked) showing the question and the answer. The button reads "Add N to homework".
  - An error shows inline with Retry.
- Modify: `src/components/homework/HomeworkExercisePicker.tsx`. Add a "Draft with AI" button (disabled with `draftBlockedReason`). On add, call `onChange([...selectedIds, ...keptIds])` and bump a `refreshKey`.
- Modify: `src/hooks/useQuestionBankLibrary.ts`. Accept an optional `refreshKey` in the effect deps.
- Add the new and modified components to `MIGRATED`.

- [ ] Steps: implement, run tsc, eslint and the colour guard, then a browser pass. Without an AI key locally, check the error path shows the server's message. Commit `feat(homework): draft exercise questions with AI from the homework wizard`.

### Task 4: Verify, review, ship

- [ ] Run the full suite, tsc and a tour of the homework wizard at 1440 and 390, then a review (fresh reviewer, most capable model), one fix pass, and merge after 2B. Update the tracker (`a4`).
