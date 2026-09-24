# Teacher Portal Phase 1B: Today redesign and page restyle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native, chosen by Shaun). Steps use checkbox (`- [ ]`) syntax.

**Goal:**
- Rebuild Today as the approved mockup (option A): a timeline with the live "now" line, "Needs you" rows that lead with counts, and a Make-with-AI row.
- Move the core teacher pages' components from raw Tailwind palette colours to the phase 1A semantic tokens, and use `StatusChip`, mono numbers and page eyebrows where the look-design spec calls for them.

**Architecture:**
- **Pure logic:** the now-line position, the Today header lede and the eyebrow text go in `src/lib/teacher-today.ts` / `src/lib/eyebrow.ts`, with vitest.
- **Token migration:** a mechanical mapping (table below). The RED step for each group is adding its files to the colour guard (`tests/teacher-colour-guard.test.ts`, `MIGRATED`); GREEN is the migrated file.
- **Shared components:** those also used by admin or parent pages move to tokens whose `:root` defaults match the old hues, so other portals shift at most one shade (the Task 1 ruling).

**Spec:**
- `docs/superpowers/specs/2026-09-24-teacher-portal-look-design.md` §5.2 (meaning per colour), §5.5 (now line), §9 (page checklist)
- mockup `docs/superpowers/specs/assets/2026-09-24-teacher-portal-look-mockup.html`

**Branch:** `feat/teacher-phase-1b` from `master` after phase 1A merges.

## Global Constraints

- Every phase 1A constraint applies.
- Colour tokens only: `success`, `attention`, `destructive`, `info`, `accent`, `primary`, `muted`, `border`, plus their `-soft` forms. No raw palette classes and no `dark:` colour overrides in migrated files; tokens handle dark mode.
- Numbers that line up (times, marks, counts, percentages) use `font-mono tabular-nums` inside teacher pages.

### Token mapping (apply per occurrence, by meaning)

| Raw | Meaning in context | Token |
|---|---|---|
| `emerald|green|teal-50/100` background | good, done, present | `bg-success-soft` |
| `emerald|green|teal-500..800` text or icon | good | `text-success` |
| `emerald|green|teal-*` border | good | `border-success/30` |
| `amber|yellow|orange-50/100` background | needs attention, late, due | `bg-attention-soft` |
| `amber|yellow|orange-500..800` text or icon | attention | `text-attention` |
| `amber|yellow|orange-*` border | attention | `border-attention/30` |
| `red|rose-50/100` background | wrong, absent | `bg-destructive-soft` |
| `red|rose-500..800` text or icon | wrong | `text-destructive` |
| `red|rose-*` border | wrong | `border-destructive/30` |
| `blue|sky|cyan|indigo-50/100` background | informational, excused | `bg-info-soft` |
| `blue|sky|cyan|indigo-500..800` text | informational | `text-info` |
| `blue|indigo-600` solid **button or selected state** | an action | `bg-primary text-primary-foreground` |
| `violet|purple|fuchsia-*` | AI, "yours" | `bg-accent-soft` / `text-accent-foreground` |
| `gray|slate|zinc|neutral|stone-50/100` background | quiet surface | `bg-muted` |
| `gray|slate|…-400..600` text | secondary text | `text-muted-foreground` |
| `gray|slate|…-200/300` border | hairline | `border-border` |
| `gray|slate|…-700..900` text | body text | `text-foreground` |
| any `dark:<raw>` companion | none | delete it |

Where a raw colour is used for **data identity** (for example a subject colour in the timetable grid, `timetable-helpers.ts`), map it to the chart palette instead: `bg-chart-1..5/15` backgrounds with `text-foreground`. Record a Ruling listing the mapping.

## Review Focus

1. **The "now" line at the edges:**
   - before the first period, after the last, and exactly at a period boundary
   - during a period in progress
   - days with no periods, and weekends (hidden)

   Tests are in Task 1.
2. **Dark mode on every migrated page.** No unreadable text; token contrast is already tested, so the screenshot pass checks for missed raw classes (Task 8).
3. **Attendance on a 390px phone.** Status buttons show their words (Present / Absent / Late / Excused), not bare icons, and stay ≥ 44px (Task 4).
4. **Admin and parent pages that share migrated components** (attendance, discipline, report card table, lesson material card) shift at most one shade and don't break (Task 8 screenshots of admin attendance and students).
5. **A teacher with nothing today.** Today still reads well: no periods, nothing to mark, no messages (Tasks 1–2).

---

### Task 1: The "now" line and the day timeline

**Files:**
- Modify: `src/lib/teacher-today.ts`: add `nowLinePlacement`.
- Modify: `src/components/teacher-home/YourDayCard.tsx`
- Test: `tests/teacher-today.test.ts` (extend it)

**Interfaces:**
- Produces `nowLinePlacement(periods: AnnotatedPeriod[], now: Date): { index: number; label: string } | null`.
  - `index` is the position in `periods` **before which** the line is drawn. It equals `periods.length` only if the day is still running after the last row, which can't happen while the line is visible.
  - `label` is `HH:MM`.
  - It returns null when there are no periods, before the first start, or at or after the last end.
  - During a period in progress, the line goes **after** that row (index = the in-progress row's index + 1), so the current period reads as "happening now" above the line.

- [ ] **Step 1: Write the failing test.** Append to `tests/teacher-today.test.ts`:

```ts
import { nowLinePlacement } from '../src/lib/teacher-today';

describe('nowLinePlacement', () => {
  const day = [
    { startTime: '07:45', endTime: '08:30' },
    { startTime: '08:30', endTime: '09:15' },
    { startTime: '10:30', endTime: '11:15' },
  ].map((p, i) => ({ timetableId: `t${i}`, classId: 'c', className: 'Gr 1 A', subjectName: 'English', period: i + 1, room: null, recorded: false, recordedCount: 0, ...p }));
  const at = (hh: number, mm: number) => new Date(2026, 8, 24, hh, mm);
  const annotated = (d: Date) => annotatePeriods(day, d);

  it('sits between the last finished period and the next one', () => {
    expect(nowLinePlacement(annotated(at(10, 12)), at(10, 12))).toEqual({ index: 2, label: '10:12' });
  });

  it('sits just below a period that is under way', () => {
    expect(nowLinePlacement(annotated(at(8, 45)), at(8, 45))).toEqual({ index: 2, label: '08:45' });
  });

  it('is hidden before school and after the last period', () => {
    expect(nowLinePlacement(annotated(at(7, 0)), at(7, 0))).toBeNull();
    expect(nowLinePlacement(annotated(at(11, 15)), at(11, 15))).toBeNull();
  });

  it('is hidden on a day with no periods', () => {
    expect(nowLinePlacement([], at(9, 0))).toBeNull();
  });
});
```

Also add `annotatePeriods` to that file's import from `../src/lib/teacher-today` if it isn't there.

- [ ] **Step 2: Run it to verify it fails.** Run `npx vitest run tests/teacher-today.test.ts`. Expected: FAIL (`nowLinePlacement` is not exported).

- [ ] **Step 3: Implement.** Append to `src/lib/teacher-today.ts`:

```ts
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Where today's "now" line goes (look-design §5.5): hidden outside the school day. */
export function nowLinePlacement(periods: AnnotatedPeriod[], now: Date): { index: number; label: string } | null {
  if (periods.length === 0) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < toMinutes(periods[0].startTime) || nowMin >= toMinutes(periods[periods.length - 1].endTime)) return null;
  const inProgress = periods.findIndex((p) => p.phase === 'now');
  const index = inProgress >= 0 ? inProgress + 1 : periods.findIndex((p) => p.phase === 'next');
  const label = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { index: index < 0 ? periods.length : index, label };
}
```

`minutesOf` already exists in the file; reuse it instead of adding `toMinutes` if it's module-scoped. Record a Ruling if you reuse it.

- [ ] **Step 4: Run it to verify it passes.** Expected: PASS.

- [ ] **Step 5: Restyle `YourDayCard`** following mockup option A:
  - Rows use a `grid grid-cols-[52px_18px_minmax(0,1fr)_auto]` layout: a mono start time (`font-mono text-[13px] text-muted-foreground`), a rail dot (done = filled `bg-border`, next = `bg-primary` with a `ring-4 ring-accent-soft`, later = hollow `border-2 border-border`), the class and subject with the lesson line below, then the action.
  - Past rows get `opacity-60`.
  - Card title uses `font-heading text-[17px] font-semibold`.
  - The "Timetable →" link is `text-accent-foreground`.
  - Register taken shows `<StatusChip status="done" label="Taken" />`.
  - A missing lesson shows `<StatusChip status="due" label="No lesson yet" />` plus a "Make one" link to `/teacher/lessons/new`.
  - The "Take register" button stays (`h-11 sm:h-8`).
  - Render the now line where `nowLinePlacement(periods, now)` says:

```tsx
<li aria-label={`Now ${line.label}`} className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2.5 py-1">
  <span className="justify-self-start rounded bg-primary px-1.5 py-px font-mono text-[11.5px] font-medium text-primary-foreground">{line.label}</span>
  <span className="h-[1.5px] bg-gradient-to-r from-primary to-primary/15" aria-hidden />
</li>
```

  `now` comes from a new prop `now: Date`; the page passes `new Date()`, re-rendered by `useTeacherToday`'s minute tick. Keep the empty and weekend states. Keep the file ≤ 350 lines.

- [ ] **Step 6: Check and commit.** Run `npx vitest run && npx tsc --noEmit -p .`, plus eslint on changed files. Add `YourDayCard.tsx` to the colour guard `MIGRATED` list. Then:

```bash
git commit -m "feat(today): the day as a timeline with a live now line"
```

---

### Task 2: Today's header, Needs you and Make with AI

**Files:**
- Modify: `src/app/(dashboard)/teacher/page.tsx`
- Modify: `src/components/teacher-home/NeedsYouCard.tsx`
- Modify: `src/components/teacher-home/AIQuickMakeHero.tsx`
- Create: `src/lib/eyebrow.ts`
- Test: `tests/eyebrow.test.ts`

**Interfaces:**
- Produces `todayEyebrow(now: Date): string` (e.g. `THU 24 SEP`) and `todayLede(periods: AnnotatedPeriod[]): string | null`. The lede is "Four periods today. Next up: Life Skills with Grade R A at 10:45.", or null with no periods.

- [ ] **Step 1: Write the failing test**

```ts
// tests/eyebrow.test.ts
import { describe, expect, it } from 'vitest';
import { todayEyebrow, todayLede } from '../src/lib/eyebrow';

const p = (period: number, startTime: string, phase: 'done' | 'now' | 'next' | 'later', subjectName = 'English', className = 'Grade 1 - A') =>
  ({ timetableId: `t${period}`, classId: 'c', className, subjectName, period, startTime, endTime: '23:59', room: null, recorded: false, recordedCount: 0, phase });

describe('todayEyebrow', () => {
  it('names the day in short caps', () => {
    expect(todayEyebrow(new Date(2026, 8, 24, 9, 0))).toBe('THU 24 SEP');
  });
});

describe('todayLede', () => {
  it('says how many periods and what is next', () => {
    expect(todayLede([p(1, '07:45', 'done'), p(2, '10:45', 'next', 'Life Skills', 'Grade R - A'), p(3, '12:00', 'later')]))
      .toBe('Three periods today. Next up: Life Skills with Grade R - A at 10:45.');
  });

  it('says what is on now during a period', () => {
    expect(todayLede([p(1, '07:45', 'now', 'Mathematics')])).toBe('One period today. On now: Mathematics with Grade 1 - A.');
  });

  it('wraps up after the last period', () => {
    expect(todayLede([p(1, '07:45', 'done'), p(2, '08:30', 'done')])).toBe('Two periods today, all done.');
  });

  it('says nothing on an empty day', () => {
    expect(todayLede([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails.** Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/lib/eyebrow.ts
import type { AnnotatedPeriod } from '@/lib/teacher-today';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export function todayEyebrow(now: Date): string {
  return `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
}

const count = (n: number) => `${WORDS[n] ?? n} period${n === 1 ? '' : 's'} today`;

/** The line under the greeting: how many periods, and what is on now or next. */
export function todayLede(periods: AnnotatedPeriod[]): string | null {
  if (periods.length === 0) return null;
  const now = periods.find((p) => p.phase === 'now');
  if (now) return `${count(periods.length)}. On now: ${now.subjectName} with ${now.className}.`;
  const next = periods.find((p) => p.phase === 'next');
  if (next) return `${count(periods.length)}. Next up: ${next.subjectName} with ${next.className} at ${next.startTime}.`;
  return `${count(periods.length)}, all done.`;
}
```

- [ ] **Step 4: Run it to verify it passes.** Expected: PASS.

- [ ] **Step 5: Rebuild the Today header and restyle the cards.**
  - **Header:** a mono eyebrow `todayEyebrow(now)`, then an h1 `font-heading text-[32px] font-semibold tracking-[-0.025em]` "Good morning, Thandi", then the lede `todayLede(today.periods)` (bold on the next-up part is optional). Actions on the right, stacked on phones:
    - "Take register" (`buttonVariants({ variant: 'outline' })`, linking to the first unrecorded period's register URL, hidden when all are taken)
    - "Make with AI" (default/primary, linking to `/teacher/lessons/new`)
  - Remove the old summary join.
  - **NeedsYouCard:** each row is a grid of icon, label (with an optional `text-attention text-xs` sub-line such as "3 overdue") and a mono count on the right, `font-mono text-xl`. A zero row renders muted, with the right side reading "All clear" in `text-success text-[13px]` instead of 0.
  - **AIQuickMakeHero:** three compact cards in a row (`grid grid-cols-1 sm:grid-cols-3 gap-3.5`). Each has an icon tile `bg-accent-soft text-accent-foreground rounded-lg`, a `font-heading` title, a muted subtitle and a trailing arrow. The section label above is a mono uppercase "Make with AI".
  - Add all three files, plus `src/app/(dashboard)/teacher/page.tsx`, to the colour guard.
- [ ] **Step 6: Check and commit:** `feat(today): header with the day's lede, Needs you counts and Make with AI`.

---

### Task 3: Migrate lessons and homework components

**Files (guard RED first):**
- `src/components/lessons/LessonMaterialCard.tsx`
- `src/components/lessons/lesson-calendar.utils.ts`
- `src/components/lessons/LessonAssignedClasses.tsx`
- `src/components/lessons/LessonGenerateAllBanner.tsx`
- `src/components/lessons/LessonHeader.tsx`
- `src/components/homework/ExerciseQuestionsList.tsx`
- `src/app/(dashboard)/teacher/assignments/new/_StepSetup.tsx`

- [ ] **Step 1:** Add these 7 paths to `MIGRATED` in `tests/teacher-colour-guard.test.ts`. Run `npx vitest run tests/teacher-colour-guard.test.ts`. Expected: FAIL, listing each file's raw classes.
- [ ] **Step 2:** Replace every listed class using the token mapping table, by meaning. Delete raw `dark:` companions.
- [ ] **Step 3:** Rerun. Expected: PASS. Then `npx tsc --noEmit -p .`.
- [ ] **Step 4:** Commit: `refactor(lessons): lesson and homework components on semantic tokens`.

### Task 4: Migrate attendance components, with labelled phone buttons

**Files:**
- `src/components/attendance/AttendanceTodayTab.tsx`
- `StatusButton.tsx`
- `AttendanceStatusBadge.tsx`
- `AttendanceHistoryTab.tsx`
- `DisciplineTable.tsx`
- `StudentRow.tsx`
- `ChronicAbsenteeTable.tsx`
- `AttendanceBulkMarkMenu.tsx`

- [ ] **Step 1: Write a failing test for the phone label rule.** Create `src/lib/attendance-labels.ts` with `statusButtonLabel(status: 'present' | 'absent' | 'late' | 'excused', compact: boolean): string` and test it in `tests/attendance-labels.test.ts`:
  - compact returns `P` / `A` / `L` / `E`
  - full returns `Present` / `Absent` / `Late` / `Excused`

```ts
import { describe, expect, it } from 'vitest';
import { statusButtonLabel } from '../src/lib/attendance-labels';

describe('statusButtonLabel', () => {
  it.each([['present', 'Present', 'P'], ['absent', 'Absent', 'A'], ['late', 'Late', 'L'], ['excused', 'Excused', 'E']] as const)(
    '%s reads "%s" on wide screens and "%s" on phones (never an icon alone)',
    (status, full, short) => {
      expect(statusButtonLabel(status, false)).toBe(full);
      expect(statusButtonLabel(status, true)).toBe(short);
    },
  );
});
```

- [ ] **Step 2:** Implement `statusButtonLabel` with a record lookup, and see it pass.
- [ ] **Step 3:** In `StatusButton.tsx`, always render text beside the icon:
  - phones: `<span className="sm:hidden">{statusButtonLabel(status, true)}</span>`
  - wider screens: `<span className="hidden sm:inline">{statusButtonLabel(status, false)}</span>`
  - give buttons `min-h-11 sm:min-h-9`
  - add `aria-label={statusButtonLabel(status, false)}` so screen readers get the full word
- [ ] **Step 4:** Add all 8 files to `MIGRATED` (RED), migrate them by the mapping (present → success, absent → destructive, late → attention, excused → info), and see GREEN. Use `StatusChip` in `AttendanceStatusBadge` if its props allow a straight swap; otherwise map classes.
- [ ] **Step 5:** Commit: `refactor(attendance): semantic statuses and labelled buttons on phones`.

### Task 5: Migrate timetable components (subject colours → chart palette)

**Files:** `src/components/timetable/timetable-helpers.ts`, `src/components/timetable/PeriodConfigDialog.tsx`

- [ ] **Step 1:** Add both to `MIGRATED` (RED).
- [ ] **Step 2:** In `timetable-helpers.ts`, replace the per-subject raw colour list with a 5-slot chart palette: `bg-chart-1/15 border-chart-1/40 text-foreground`, and so on for 2–5. Other raw colours follow the table. Record a Ruling with the old → new mapping.
- [ ] **Step 3:** GREEN, then commit: `refactor(timetable): subject colours from the chart palette`.

### Task 6: Migrate grades, papers, reports, planner and classes

**Files:**
- `src/components/grades/TermSummaryHelpers.tsx`, `StudentTermDetailDialog.tsx`, `StudentHistoryDialog.tsx`
- `src/app/(dashboard)/teacher/grades/page.tsx`
- `src/components/papers/paper-wizard-helpers.ts`
- `src/app/(dashboard)/teacher/papers/new/_indicators.tsx`
- `src/components/reports/ReportCardTable.tsx`
- `src/components/workbench/planner/WeightingSidebar.tsx`
- `src/app/(dashboard)/teacher/workbench/planner/page.tsx`
- `src/components/classes/StudentAddCredentialsResults.tsx`
- `src/components/grades/TermSummarySubjectChip.tsx`

In `TermSummarySubjectChip.tsx`, the "Set weightings" prompt is currently `destructive`. It becomes `attention`, because it needs the teacher, it isn't an error (look-design §5.2).

- [ ] **Step 1:** Add all to `MIGRATED` (RED).
- [ ] **Step 2:** Migrate by the table. In `TermSummaryHelpers.gradeColor`, map the grade bands to tokens: ≥ 70 `text-success`, 50–69 `text-foreground`, 40–49 `text-attention`, < 40 `text-destructive`. Keep it a pure function and add a test in `tests/gradebook-helpers.test.ts` if `gradeColor` is importable without React. If it isn't, record a Ruling.
- [ ] **Step 3:** GREEN, then commit: `refactor(assess): grades, papers, reports and planner on semantic tokens`.

### Task 7: Eyebrows and mono numbers on the core pages

**Files:** the core pages' `PageHeader` calls:
- `/teacher/papers`, `/teacher/grades`, `/teacher/workbench/marking-hub`, `/teacher/attendance`
- `/teacher/lessons`, `/teacher/timetable`, `/teacher/classes`, `/teacher/homework`, `/teacher/assignments`

- [ ] **Step 1:** Add an `eyebrow` where the page knows real context:
  - Attendance: the selected class and period, e.g. `GRADE 1 - A · PERIOD 1`.
  - Gradebook: the class and term scope, e.g. `GRADE 1 - A · TERM 3`.
  - Timetable: the current week, e.g. `WEEK OF 21 SEP`.
  - Everything else: the section name from the nav (`ASSESS`, `TEACH`, `CLASS`).

  Build each string with a tested pure helper in `src/lib/eyebrow.ts` (`sectionEyebrow(section)`, `weekOfEyebrow(date)`), with test cases in `tests/eyebrow.test.ts`: RED, then GREEN.
- [ ] **Step 2:** Wrap stat values and table numbers in `font-mono tabular-nums` where the page renders them directly: gradebook percentages, attendance counts, marking counts.
- [ ] **Step 3:** Commit: `feat(ui): page eyebrows and mono numbers across the core teacher pages`.

### Task 8: Verify, review, ship

- [ ] **Step 1:** Run `npx vitest run`, `npx next typegen && npx tsc --noEmit -p .`, and eslint on changed files.
- [ ] **Step 2: Screenshot tour.**
  - Cover the 15 core pages as Thandi at 1440 light, 1440 dark and 390 light, after `npm run seed:teacher-demo` in the backend so the pages have data. Look at each one.
  - Today must show the timeline with the now line during school hours. Run the tour between 07:45 and 12:00 local, or point `nowLinePlacement` tests at the edge cases.
  - Admin `/admin/attendance` and `/admin/students/<id>` must look the same apart from the one-shade token shift.
- [ ] **Step 3:** Whole-branch review (fresh reviewer, most capable model), then one fix pass test-first.
- [ ] **Step 4:** Push under the compromise protocol, open a PR, wait for Vercel, fast-forward merge, and update the tracker (`l7`–`l10`).
