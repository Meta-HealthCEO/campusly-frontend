# Teacher Phase 3B: Edit Items, AI Rewrites, Order and Revision — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The teacher can fix any item in a unit:
- edit notes, worked-example steps and quick-check questions inline
- ask the AI to regenerate an item, or make it easier, harder, shorter, simpler in wording, or translated
- choose whether learners must go in order
- from the class insight, add a revision item on the questions the class got wrong

Teacher edits are never overwritten.

**Architecture:**
- The backend's `service-unit-items.ts` holds content and question edits, rewrites (reusing `GenerationService.refineContent` and `generateAIQuestions`), unit settings, and the revision item.
- Pure checks and the instruction wording live in `item-edits.ts`.
- `computeUnlockStatuses` takes a `sequential` flag.
- The frontend's item sheet gains an Edit mode (notes, steps and questions editors) and a Rewrite menu. The unit page gains a "Learners go in order" switch, and insight gains "Add a revision item".

**Tech stack:** Express/Mongoose/zod/vitest; Next.js 16/React 19/vitest.

**Spec:** programme §5, teacher flow:
- step 6, per-item review: "edit inline, or use AI actions: regenerate, easier, harder, shorter, reading level, translate. Teacher edits are never overwritten"
- step 7, completion rules: "sequential unlock is optional"
- step 10: "one click drafts a revision item" (moved here from 3D)

## Global Constraints
- **Who can edit:** only the unit's editors (`assertCanEditCourse`). Content edits are allowed after release, so a teacher can fix a mistake learners will see. Structure edits keep their existing draft-only rules.
- **Edits are sticky:** an edited or rewritten item is marked `teacherEdited`, and background writing never touches it again.
- **Quick checks stay answerable:** 1–8 questions, each with 2–5 options and exactly one correct.
- **Languages for translate:** Afrikaans, isiZulu, isiXhosa, Sesotho, Setswana (the most-used SA home languages after English).
- **Frontend rules (CLAUDE.md):** hooks do the API calls, files ≤ 350 lines, semantic tokens, 44px targets, dialogs with a sticky footer.

## Review Focus
1. **Saving an invalid quick check** (no correct answer, one option, empty stem): a plain refusal naming what to fix, with nothing saved.
2. **A rewrite that fails** (no AI key): the item is unchanged, and the message is plain.
3. **Editing a released unit's item:** learners see the new content, and their progress on that item stands.
4. **Turning "in order" off mid-unit:** every unfinished item opens. Turning it back on locks nothing already done.
5. **A revision item on a released unit:** it appears after the check, the learners who are past it aren't blocked, and it's marked done for nobody.

---

### Task 1: Rules and wording (backend, pure)
**Files:**
- Create: `src/modules/Course/item-edits.ts`. It exports `REWRITE_ACTIONS`, `TRANSLATE_LANGUAGES`, `rewriteInstruction(action, { language?, gradeName })`, `checkNotesEdit(blocks)`, `checkStepsEdit(steps)` and `checkQuestionsEdit(questions)`. The check functions return the cleaned value or throw a `BadRequestError` in plain words.
- Test: `src/modules/Course/__tests__/item-edits.test.ts`.
- [ ] Write the failing tests, implement, run to green, and commit.

### Task 2: Edits, rewrites, settings and revision (backend)
**Files:**
- Create: `src/modules/Course/service-unit-items.ts`: `saveContent`, `saveQuestions`, `rewrite`, `updateSettings`, `addRevisionItem`.
- Modify:
  - `model.ts`: Course `sequential: boolean`, default true.
  - `service-student.ts`: `computeUnlockStatuses(sorted, progress, { sequential })`, with the flag passed from the course at both call sites.
  - `validation.ts`, `routes.ts`, `controller-class-unit.ts`: add these routes:
    - `PUT /:id/lessons/:lessonId/content`
    - `PUT /:id/lessons/:lessonId/questions`
    - `POST /:id/lessons/:lessonId/rewrite`
    - `PATCH /:id/settings`
    - `POST /:id/revision`
- Test: `src/modules/Course/__tests__/unit-items.test.ts`, with AI mocked:
  - Saving notes updates the resource and marks the item edited.
  - Saving questions swaps in new answerable questions and soft-deletes the old ones.
  - An invalid quick check is refused and nothing changes.
  - A rewrite passes the plain instruction, and a failed rewrite changes nothing.
  - With `sequential: false`, every unfinished item is available.
  - A revision item goes after the check; its reached and completed counts stay 0.
  - A stranger is refused.
- [ ] Write the failing tests, implement, run to green, and commit.

### Task 3: Editor helpers (frontend, pure)
**Files:**
- Create: `src/lib/item-editing.ts`: `REWRITE_OPTIONS`, `LANGUAGE_OPTIONS`, `stepsFromBlocks`, `questionsProblem(questions)` (the same rules as the server, worded the same) and `emptyQuestion()`.
- Test: `tests/item-editing.test.ts`.
- [ ] Write the failing tests, implement, run to green, and commit.

### Task 4: The item editor and the Rewrite menu (frontend)
**Files:**
- Create in `src/components/courses/unit/`:
  - `NotesEditor.tsx` (a markdown textarea for each text block)
  - `StepsEditor.tsx` (add, remove and edit steps)
  - `QuestionsEditor.tsx` (stem, options and the correct one, plus add and remove)
  - `RewriteMenu.tsx`
- Modify: `UnitItemPreview.tsx`, adding Edit / Save / Cancel and Rewrite. `UnitItemRow.tsx` shows an "Edited by you" badge.
- Modify: `useClassUnit.ts`, adding `saveContent`, `saveQuestions` and `rewriteItem`.
- [ ] Browser as Thandi:
  - Edit "Check: counting": remove the correct tick and Save is refused with the message; fix it and save; the preview shows the new question.
  - Edit the notes text and save; the row shows "Edited by you".
  - Rewrite → Easier with no AI key shows "AI isn't set up", and the item is unchanged.
- [ ] Run the full suite, tsc and lint, then commit.

### Task 5: In-order switch and revision item (frontend)
**Files:**
- Create: `src/components/courses/unit/UnitSettings.tsx` ("Learners go in order", with a sentence on what it means).
- Modify: `UnitInsight.tsx`, adding "Add a revision item" beside "Questions the class gets wrong most". It shows the AI message with no key.
- Modify: `useClassUnit.ts`, adding `updateSettings` and `addRevision`.
- [ ] Browser: switch "in order" off; as Lebo, every unfinished item opens; switch it back on.
- [ ] Commit.
