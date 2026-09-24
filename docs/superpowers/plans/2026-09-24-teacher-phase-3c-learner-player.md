# Teacher Phase 3C: The Learner's Unit Player — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A learner opens a released unit on their phone, sees where they are, and works through it item by item. Each item shows its minutes and a tick when done, the quick checks are marked at once, and a resume card takes them back to where they stopped.

**Architecture:**
- Reuse the existing enrolment and progress engine: `/enrolments/me`, `/enrolments/:id` (the tree with per-item unlock status), lesson fetch, progress and quiz-attempt routes.
- Reuse `useLessonPlayer`, `BlockRenderer` and `LessonQuizShell`.
- Restore the student course pages deleted in commit `31820b5` and reshape them for class units:
  - `/student/courses`: a resume card plus my units
  - `/student/courses/[id]`: the unit home, with each module's progress and each item's minutes and tick
  - `/student/courses/[id]/learn/[lessonId]`: the item player
- Add **Courses** to the student nav, and the resume card to the student dashboard.

**Tech stack:** Next.js 16, React 19, Tailwind 4, vitest; backend Express/Mongoose/vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-teacher-portal-programme.md` §5, learner flow steps 1–4 and 6. Step 5 (module quiz and badge) and step 7 (offline) are later phases.

## Global Constraints
- **Phone first:** 390px is the design width, touch targets are 44px or more, text comes first, and nothing autoplays.
- **Learners' own view only:** a learner sees only their own enrolments. Class units never appear in the school catalogue.
- **Frontend rules (CLAUDE.md):** hooks do the API calls, no `any`, files ≤ 350 lines, semantic tokens, and every data view has loading and empty states.

## Review Focus
1. **A learner with no units:** a clear empty state, not a spinner.
2. **A deleted or archived unit:** it disappears from the learner's list instead of opening to a 404.
3. **A locked item opened by URL:** the server refuses, and the page says to finish the previous item.
4. **A quick check below the pass mark:** the learner sees their score and can try again, and the next item stays locked.
5. **A class unit in the catalogue:** it must not appear.

---

### Task 1: Catalogue and "my units" (backend)
**Files:**
- Modify: `src/modules/Course/service-student.ts`:
  - `listCatalog` excludes `kind: 'class_unit'`.
  - `listMyEnrolments` populates `kind estimatedDurationHours status isDeleted`, matches `isDeleted: false`, and drops enrolments whose course is gone.
- Test: `src/modules/Course/__tests__/learner-lists.test.ts`:
  - The catalogue leaves out class units.
  - "My enrolments" carries `kind` and drops a deleted unit.

- [ ] Write the tests, run them and watch them fail.
- [ ] Implement, then run the tests to green.
- [ ] Commit `fix(courses): class units stay out of the catalogue; deleted units leave a learner's list`.

### Task 2: Learner unit helpers (frontend, pure)
**Files:**
- Create: `src/lib/learner-unit.ts`
- Test: `tests/learner-unit.test.ts`

**Produces:**
- `resumeTarget(course)`, which returns `{ lessonId, title, moduleTitle, position: 'Item 3 of 6', minutes, started: boolean } | null` from the first item that is available or in progress. It returns null when everything is done.
- `moduleProgress(module)`, which returns `{ done, total, percent }`.
- `LEARNER_KIND_LABEL`: `{ notes: 'Read', worked_example: 'Worked example', quick_check: 'Quick check' }`.
- `unitDone(course)`, which returns a boolean.

- [ ] Write the tests with concrete trees, and run them to see them fail.
- [ ] Implement, then run the tests to green.
- [ ] Commit.

### Task 3: The learner pages, nav and resume card (frontend)
**Files:**
- Create: `src/hooks/useStudentUnits.ts`, which restores `useStudentCourses` without the catalogue and adds `loadResume(enrolment)` through `/enrolments/:id`.
- Create: `src/components/learner/ResumeUnitCard.tsx`
- Create: `src/components/learner/UnitHome.tsx` (module sections with progress, and item rows with kind, minutes, tick or lock)
- Create: `src/app/(dashboard)/student/courses/page.tsx`
- Create: `src/app/(dashboard)/student/courses/[id]/page.tsx`
- Create: `src/app/(dashboard)/student/courses/[id]/learn/[lessonId]/page.tsx`, restored from `31820b5^`. It keeps the progress writes and quiz submit, and moves to the next item when the current one is done.
- Modify: `src/lib/routes.ts` (the student course routes) and `src/lib/constants.ts` (STUDENT_NAV **Courses**, module `courses`).
- Modify: the student dashboard, to show `ResumeUnitCard` when a unit is in progress.

- [ ] Browser, as Lebo (Grade 1 - A, halfway):
  - The dashboard shows "Continue: What makes a pattern · Item 4 of 6 · 7 min".
  - The unit home shows module 1 done and module 2 at 0 of 3.
  - The notes open, and scrolling to the end marks them done.
  - The quick check marks at once, and on a pass the next item unlocks.
- [ ] Browser at 390px: no horizontal scroll, and 44px targets.
- [ ] Run tsc, lint and the full vitest suite.
- [ ] Commit `feat(learner): work through a unit on your phone`.
