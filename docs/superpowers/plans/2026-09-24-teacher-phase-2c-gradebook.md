# Teacher Phase 2C: Gradebook Weightings and Reports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The gradebook is where marks become reports.
- **Weightings tab:** it clears the "Set weightings" warning, or tells a teacher who can't change weightings who can.
- **Reports tab:** it holds the learner report card and AI report comments.
- **Report card averages:** they come from the same weighted calculation as the term summary.

**Architecture:**
- **Weightings:** the school-wide `SubjectWeighting` model (per grade, term and assessment type), not the orphaned `AssessmentStructure` system. The tab lists the class's subjects with each term's buckets. Editing reuses `SubjectWeightingDialog` and is offered only when `can(user, 'manage_academic_setup')`.
- **Reports:** the report card page body and the report comments page body move into panels under a Reports tab. Their old routes redirect there.
- **Backend:** the report card takes each subject's average from the term summary whenever that subject has weightings.

**Tech Stack:** Next.js 16.2.1, React 19, Tailwind 4 and vitest (frontend); Express 5, Mongoose 9 and vitest (backend).

**Spec:**
- `docs/superpowers/specs/2026-09-24-teacher-portal-programme.md`:
  - the Gradebook row of §4: "Weightings tab (fixes the dead 'Set weightings' warning); reports and AI comments inside"
  - the Assess row of §3, which absorbs `curriculum/assessment-structure*`, `reports` and `ai-tools/report-comments`
- Tracker item `a3`. Research is in `.superpowers/research/phase2-gradebook-homework.md`.

**Repos and branches:**
- Frontend branch `feat/teacher-phase-2c-gradebook`, from `feat/teacher-phase-2a-marking` (stacked until 2A merges).
- Backend `C:\dev\campusly\.worktrees\backend-master`, branch `feat/teacher-phase-2c-gradebook`, from `feat/teacher-phase-2a-marking`.

## Global Constraints

- Everything in phase 2A's Global Constraints applies.
- **Gradebook URL:** `?tab=` accepts `overview`, `capture`, `weightings` and `reports`. Everything else falls back to `overview`.
- **Weightings copy:** read-only teachers see "Only your HOD or a school admin can change weightings." A teacher is never shown a Save that will 403.
- **Legacy routes:** they redirect with `permanent: false`. Destinations may carry a query string.

## Review Focus

1. **A teacher who can't change weightings clicks "Set weightings" on a chip.** They land on the Weightings tab, read-only, with the explanation. There is no 403 (Task 3).
2. **A school where no subject has weightings.** The Weightings tab lists every subject as "Not set", and the report card still shows averages (the fallback). Tasks 3 and 5.
3. **Saving weightings.** Afterwards the term summary chips update without a reload (Task 3).
4. **Old bookmarks** (`/teacher/reports`, `/teacher/ai-tools/report-comments`, `/teacher/curriculum/assessment-structure/<id>`) land on the right gradebook tab (Task 6).
5. **A school without the `ai_tools` module.** The Reports tab still shows the report card, and the comments panel shows the module-off state instead of erroring (Task 4).

---

### Task 1: Four gradebook tabs from the URL (frontend)

**Files:**
- Modify: `src/lib/gradebook-link.ts` (`GradebookTab = 'overview' | 'capture' | 'weightings' | 'reports'`)
- Modify: `tests/gradebook-link.test.ts`
- Modify: `src/app/(dashboard)/teacher/grades/page.tsx` (two new `TabsTrigger`s; `setTab` also keeps `?tab=` in the URL with `router.replace`, without scrolling)

- [ ] **Step 1: Write the failing test.** `readGradebookParams(new URLSearchParams('tab=weightings')).tab` is `'weightings'`, the same for `reports`, and `tab=admin` is still undefined.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.** Extend `TABS`. On the page:
  - The tab `onValueChange` accepts any of the four and replaces `?tab=` in the URL, keeping the other params.
  - Add placeholder `TabsContent` for `weightings` and `reports`, filled in by Tasks 3 and 4.
  - Keep the page at 350 lines or fewer, extracting `GradebookHeader` (the class and term pickers) into `src/components/grades/GradebookHeader.tsx` if needed.
- [ ] **Step 4: Run the tests and tsc.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(gradebook): weightings and reports tabs, addressable by URL`.

---

### Task 2: Weightings summaries (frontend, pure)

**Files:**
- Create: `src/lib/weighting-summary.ts`
- Test: `tests/weighting-summary.test.ts`

**Interfaces:**
- Produces:

```ts
import type { TermBuckets } from '@/hooks/useSubjectWeightings';
export interface WeightingLine { term: number; set: boolean; text: string } // e.g. { term: 3, set: true, text: 'Tests 50 · Assignments 30 · Projects 20' }
export function weightingLines(terms: TermBuckets[]): WeightingLine[];   // terms 1–4 in order; empty or all-zero → { set: false, text: 'Not set' }
export function classSubjects<S extends { id: string; gradeIds?: string[] }>(subjects: S[], gradeId: string | null): S[]; // subjects whose gradeIds include the class grade; if none list the grade, all subjects
```

- [ ] **Step 1: Write the failing test.**
  - Buckets `[{test,50},{assignment,30},{project,20},{exam,0}]` for term 3 give `'Tests 50 · Assignments 30 · Projects 20'`. Zero-weight types are dropped, in the order of `ASSESSMENT_TYPES`.
  - An empty term gives `Not set`.
  - Four lines always come back.
  - `classSubjects` filters by grade, and falls back to all subjects when none list that grade.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, using `ASSESSMENT_TYPE_LABELS`.
- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(gradebook): readable weighting summaries`.

---

### Task 3: The Weightings tab (frontend)

**Files:**
- Create: `src/hooks/useGradeWeightings.ts`. Given `gradeId` and `subjectIds`, it fetches `GET /academic/subject-weightings/matrix` for each subject in parallel and returns `{ matrices: Map<string, SubjectWeightingMatrix>, loading, refetch }`.
- Create: `src/components/grades/GradebookWeightingsTab.tsx`
- Modify: `src/components/grades/TermSummaryTab.tsx`:
  - accepts `canEditWeightings: boolean` and `onOpenWeightings: () => void`
  - "Set weightings" and the cog call `onOpenWeightings` when `!canEditWeightings`
  - after `SubjectWeightingDialog` closes, call `refetch()` on the summary
- Modify: `src/app/(dashboard)/teacher/grades/page.tsx`
- Test: `tests/weighting-summary.test.ts` (from Task 2) covers the text. There are no new hook tests; the hook is a thin fetch.

- [ ] **Step 1:** Add a test to `tests/gradebook-helpers.test.ts` for a new pure `weightingAction(canEdit: boolean): 'dialog' | 'tab'` in `src/lib/gradebook-helpers.ts`, then run it (FAIL).
- [ ] **Step 2: Implement `weightingAction`**, then the tab.
  - **Layout:**
    - One row per class subject (`classSubjects(subjects, classGradeId)`).
    - Each row shows the subject name and four `WeightingLine`s. The current term is bold, with `StatusChip status="due" label="Not set"` when unset.
    - An `Edit` button opens `SubjectWeightingDialog`, but only when the teacher can edit.
  - **Read-only:** show the sentence from Global Constraints once, above the list.
  - **Refresh:** refetch after the dialog closes.
  - **Page wiring:**
    - `const canEdit = useCan('manage_academic_setup')`
    - `TermSummaryTab` gets `canEditWeightings={canEdit}` and `onOpenWeightings={() => changeTab('weightings')}`
    - `GradebookWeightingsTab` gets `classId`, `gradeId` (from the selected class) and `subjects`
- [ ] **Step 3:** Run the tests and tsc. Add the new component to `MIGRATED`, and run the colour guard.
- [ ] **Step 4:** Commit: `feat(gradebook): weightings tab; teachers who can't edit are told who can`.

---

### Task 4: The Reports tab (frontend)

**Files:**
- Create: `src/components/reports/ReportCardPanel.tsx`, the body of `teacher/reports/page.tsx` as a component. It takes `classId: string` (from the gradebook header), `term: string` and `academicYear: number`, and keeps its learner picker, print button and `ReportCardTable`.
- Create: `src/components/grades/GradebookReportsTab.tsx`, with two sections:
  - "Report card", using `ReportCardPanel`.
  - "Report comments", using `ReportCommentGenerator` wired as the report-comments page does. Behind `useModule().isModuleEnabled('ai_tools')` it shows `ModuleOffState` (compact) when that's off.
- Modify: `src/app/(dashboard)/teacher/grades/page.tsx`

- [ ] **Step 1:** Move the code; the logic is unchanged apart from the class and term arriving as props. Remove the report card's own class picker, because the gradebook header owns the class. Keep the confirm prompts, but replace `window.confirm` with the existing `ConfirmDialog` pattern if one exists in `src/components/shared`; otherwise keep `window.confirm`.
- [ ] **Step 2:** Run tsc and eslint. Add both components to `MIGRATED` and run the colour guard.
- [ ] **Step 3:** Commit: `feat(gradebook): report cards and AI report comments live in the gradebook`.

---

### Task 5: Report card averages use the school's weightings (backend)

**Files:**
- Create: `src/modules/Report/services/report-card-averages.ts` (pure)
- Modify: `src/modules/Report/services/academic.service.ts` (`getStudentReportCard`)
- Test: `src/modules/Report/__tests__/report-card-averages.test.ts`

**Interfaces:**
- Produces:

```ts
export interface ReportSubjectSummary { subjectId: string; weightedPercentage: number; [k: string]: unknown }
export function applyTermWeightings<T extends ReportSubjectSummary>(
  subjects: T[],
  termSubjects: Array<{ subjectId: string; missingWeighting: boolean }>,
  studentAverages: Record<string, number | null>,
): { subjects: Array<T & { weightingSource: 'school' | 'assessment' }>; overallAverage: number };
```

  Where the term summary has the subject with `missingWeighting: false` and a non-null student average, that average replaces `weightedPercentage` (rounded to two decimals, `weightingSource: 'school'`). Otherwise the subject keeps its own value (`'assessment'`). `overallAverage` is the mean of the resulting `weightedPercentage`s, or 0 when there are none.

- [ ] **Step 1: Write the failing test**, covering:
  - one weighted subject replaced
  - one missing-weighting subject kept
  - a null student average kept
  - `overallAverage` recomputed
  - an empty list giving 0
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.** Then, in `getStudentReportCard`, once the subject list is built:
  - When the student has a `classId`, call `getTermSummary({ schoolId, classId, term, academicYear })` and apply it with that student's `subjectAverages`.
  - Wrap it in a try/catch that logs and keeps the old numbers, so a report card never fails because of this.
  - Return `weightingSource` on each subject.
- [ ] **Step 4: Run it and the Report suite.** Expected: PASS.
- [ ] **Step 5: Commit:** `fix(report): report card averages use the school's weightings, like the gradebook`.

---

### Task 6: Old routes redirect into the gradebook (frontend)

**Files:**
- Modify: `next.config.ts`, adding to `LEGACY_TEACHER_REDIRECTS`:
  - `/teacher/reports` → `/teacher/grades?tab=reports`
  - `/teacher/ai-tools/report-comments` → `/teacher/grades?tab=reports`
  - `/teacher/curriculum/assessment-structure` and `/teacher/curriculum/assessment-structure/:id` → `/teacher/grades?tab=weightings`
- Modify: `tests/legacy-redirects.test.ts`. Strip `?…` from a destination before checking the page file exists.
- Delete:
  - the pages `src/app/(dashboard)/teacher/reports/page.tsx`, `src/app/(dashboard)/teacher/ai-tools/report-comments/page.tsx` and `src/app/(dashboard)/teacher/curriculum/assessment-structure/**`
  - `src/components/assessment-structure/**` and its hooks, if nothing else imports them (check with grep; list what was removed in the commit body)
- Modify: `src/lib/nav/teacher-nav.ts`, removing "Reports" and "Report Comments" from both navs. Update `tests/teacher-nav.test.ts` expectations.
- Modify: `src/lib/routes.ts`. Remove constants that pointed at deleted pages, or repoint them to the gradebook.

- [ ] **Step 1: Write the failing test.** Extend `legacy-redirects.test.ts` with the four new sources. They fail until they're added to the config; the query-string stripping must also be in place.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement.** Also:
  - Grep the whole of `src` for `/teacher/reports`, `report-comments` and `assessment-structure` links, and repoint them.
  - Run `npx next typegen` after deleting the pages.
- [ ] **Step 4:** Run the full suite, typegen and tsc. Expected: PASS.
- [ ] **Step 5:** Commit: `refactor(gradebook): reports, report comments and assessment structures move into the gradebook`.

---

### Task 7: Demo weightings (backend seed)

**Files:**
- Modify: `src/scripts/teacher-demo/content.ts`, adding `DEMO_WEIGHTINGS`: English and Mathematics get `test 50 · assignment 30 · project 20` in all four terms, and Life Skills is left unset on purpose, so the walkthrough shows both states.
- Modify: `src/scripts/seed-teacher-demo.ts`, adding `seedWeightings(ctx)`, which upserts `SubjectWeighting` rows per `(school, subject, grade, term, type)` for the homeroom and second class grades.
- Test: `src/scripts/teacher-demo/__tests__/plan.test.ts`. Assert that `DEMO_WEIGHTINGS` sums to 100 per subject and term, and that Life Skills isn't in it.

- [ ] **Step 1:** Write the test, and see it fail.
- [ ] **Step 2:** Implement, then run the seed twice.
- [ ] **Step 3:** Commit: `feat(seed): demo weightings for English and Maths; Life Skills left to set`.

---

### Task 8: Verify, review, ship

- [ ] **Step 1:** Run both suites, typegen, tsc and eslint.
- [ ] **Step 2: Tour as Thandi**, a plain teacher who can't edit, and as an admin or HOD who can:
  - Gradebook, all four tabs, at 1440 light, 1440 dark and 390 light.
  - The Life Skills chip goes to the Weightings tab, read-only.
  - The Reports tab shows a report card whose English average matches the term summary.
  - Old URLs redirect.
- [ ] **Step 3:** Whole-branch review (fresh reviewer, most capable model), then one fix pass, test first.
- [ ] **Step 4:** Push, open PRs, wait for Vercel, merge after 2A, reseed and update the tracker (`a3`).
