# Attendance Overhaul — Design

**Status:** Design approved, ready for implementation
**Date:** 2026-05-17
**Author:** Brainstormed with Shaun
**Related files:**
- Frontend: [`src/app/(dashboard)/teacher/attendance/page.tsx`](src/app/(dashboard)/teacher/attendance/page.tsx), [`src/hooks/useTeacherAttendance.ts`](src/hooks/useTeacherAttendance.ts), [`src/components/classes/TeachingGroupAttendanceRegister.tsx`](src/components/classes/TeachingGroupAttendanceRegister.tsx), [`src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx`](src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx)
- Backend: [`campusly-backend/src/modules/Attendance/routes.ts`](C:/Users/shaun/campusly-backend/src/modules/Attendance/routes.ts), [`campusly-backend/src/modules/Attendance/export.controller.ts`](C:/Users/shaun/campusly-backend/src/modules/Attendance/export.controller.ts)

---

## Goal

Make `/teacher/attendance` the single, fit-for-purpose attendance surface for every teacher in the app — covering both school-context teachers and standalone teachers digitising paper registers. Delete the duplicate embedded register that lives on the teaching-group roster. Add the missing pieces (multi-class support, history grid, PDF export, prev/next-day navigation, bulk-mark options) so paper-based schools can replace their physical register entirely.

## Context

The app currently has two attendance UIs:

1. **`/teacher/attendance`** — the "Morning Roll Call" page, with date picker, period selector, per-student status, notes, edit history, stats bar. **Locked to the teacher's homeroom only** — shows "No Home Class Assigned" if `homeroom.class` is null, which is true for most standalone teachers and many subject teachers.
2. **`TeachingGroupAttendanceRegister`** — embedded inside the class roster at `/teacher/classes/[classId]/roster`. Duplicates much of the same functionality, less polish, has its own UTC bug.

Two parallel systems with overlapping responsibility. Per the [[standalone-teacher-audience]] memory, standalone teachers in Campusly are real schoolteachers digitising paper work — they need a proper attendance system, not a stripped-down or absent one.

## Scope

**In scope:**

- Promote `/teacher/attendance` to be the universal attendance surface.
- Make it work for any class the teacher owns (homeroom OR teaching group OR subject class), not only the homeroom.
- Add a History tab with weekly + monthly grid view.
- Wire PDF export (single-day register from Today tab, grid from History tab). Extend the backend export endpoint's authz to include teachers with ownership check.
- Fix the UTC midnight bug in `useTeacherAttendance.ts` (line 244) and in `TeachingGroupAttendanceRegister.tsx` (line 52, removed when that file is deleted).
- Add prev/next-day arrows on the Today tab.
- Add bulk-mark menu (`Mark all Present | Absent | Late`).
- Delete `TeachingGroupAttendanceRegister.tsx`; replace its use on the roster page with a "Take attendance" link.

**Backend changes — limited to:**

- Extend `GET /api/attendance/export` to accept `teacher` role with `requireTeacherClassOwnership('classId')`. Currently `school_admin` and `super_admin` only.
- Add a PDF format option to the export endpoint (currently CSV). Either via a `?format=pdf` query param or a sibling `GET /api/attendance/export/pdf` route — chosen during implementation based on existing patterns.
- If history-grid PDF export needs richer per-student/per-day aggregation than the current endpoint supports, extend it. To be confirmed during plan-writing.

**Out of scope:**

- Home-page "Take today's register" card. Deferred to a follow-up that revisits the recently-shipped teacher home layout.
- Attendance insights / intervention flags (term-to-date %, flagging <80%, parent notifications). Bigger feature, separate spec.
- Per-school "do you use periods?" configuration. Periods stay as today.
- Discipline / merit / substitute routes (other things in the Attendance module — not relevant here).
- Parent/student-facing attendance views.

## Design

### 1. Page structure

`/teacher/attendance` becomes the single attendance surface. URL shape: `/teacher/attendance?classId=<id>&tab=today|history`. Both query params drive UI state and are reflected in the URL when the user changes them, so deep links from the roster page or future home-page cards land correctly.

Top of page:

- **PageHeader** — title `Attendance`, description shows the selected class label (e.g. `Grade 11A · Mathematics`).
- **Header right slot** — Class picker dropdown + Export PDF button.
- **Tab bar** — `Today` | `History` (defaults to Today).

**Responsive layout:** the PageHeader stacks on small breakpoints — title block on top, then class picker + Export PDF on the next line, then tabs. Don't try to cram the class picker + export into the right slot at sub-`sm` widths (would crush both). Match the existing `PageHeader` responsive behaviour used elsewhere in the app.

The Class picker is a `<Select>` listing all classes the teacher owns. Default selection:
1. URL `?classId=<id>` if present and the teacher owns that class.
2. Otherwise the teacher's homeroom if they have one.
3. Otherwise the first class in alphabetical order.

Class list ordering: homeroom pinned at top (when present), then the rest alphabetically by class label.

If the teacher has zero classes, show the existing `<EmptyState>` with copy: *"You have no classes yet. Create one in the Classes section first."* and a link to `/teacher/classes`.

The hook backing all this is generalised in place — same name (`useTeacherAttendance`), same export, broader contract. Internally it loads the teacher's classes once (from `/academic/teacher/me/teaching-load`, merging homeroom + subjectClasses into a flat list), then loads attendance for the currently-selected `classId`.

**Class-source verification (must happen during plan-writing):** `/academic/teacher/me/teaching-load` is known to return `homeroom` + `subjectClasses`. Whether it also returns a standalone teacher's **teaching groups** (created via `/teacher/classes`) is unverified. Because this audience is the whole reason the spec exists, if teaching groups are missing from that response, the plan MUST add them — either by extending the endpoint or by combining it with the existing `/academic/classes` (filtered to the teacher) fetch. The class picker is empty for standalone teachers otherwise, which fails the design.

### 2. "Today" tab

Layout matches the existing daily form, with these changes:

- **Date row:** `[ ← ] [date input] [ → ] [Today]` — prev-day arrow, the existing native date input, next-day arrow (disabled when on today's date), and a small "Today" button to snap back. Stepping past `today` is not allowed (the page already enforces this).
- **Period selector** stays as-is (1–8).
- **Stats bar** stays as-is (present / absent / late / excused counts with coloured dots, design tokens already used).
- **Bulk-mark control** changes from a single "Mark All Present" button to a split control: primary button `Mark all present` + a `▾` menu with `All absent`, `All late`. (Excused isn't a sensible bulk action — omit.)
- **Existing-record banner** stays.
- **Student list** stays — search, per-student status row, notes, edit history all preserved.
- **Save button** stays — top right + sticky bottom variant for long lists.

**UTC fix:** in `saveAttendance` ([`useTeacherAttendance.ts:244`](src/hooks/useTeacherAttendance.ts#L244)), replace `date: \`${selectedDate}T00:00:00.000Z\`` with a plain `date: selectedDate` (a `YYYY-MM-DD` string). The backend's `recordAttendanceSchema` / `bulkAttendanceSchema` accepts either ISO datetime or date-only; during implementation, verify and adjust the validator if needed. The intent is: the date string the teacher selected is the date the register is for — no timezone arithmetic involved.

### 3. "History" tab

A grid view scoped to the selected class **and selected period**:

```
                    Mon 12   Tue 13   Wed 14   Thu 15   Fri 16   |  %
─────────────────────────────────────────────────────────────────────────
Alice Smith           ✓        ✓        L        ✓        A      |  80%
Bob Jones             ✓        A        ✓        ✓        ✓      |  80%
Carla Naidoo          ✓        E        ✓        L        ✓      |  60%
                      ⋮        ⋮        ⋮        ⋮        ⋮
─────────────────────────────────────────────────────────────────────────
Class %              100%      67%      89%      89%      78%
```

**Period selector at the tab header** (same control as on the Today tab). The grid is scoped to one period at a time — `(classId, period, dateRange)`. Without this, a school that takes both morning and after-lunch registers would see an ambiguous mash-up; with it, the teacher can flip between period 1 and period 5 views explicitly. Default to the same period the Today tab is on (state shared via the page-level `period` so switching tabs doesn't reset it).

**View toggle:** `Week` (default) | `Month`.

- **Week view:** Mon–Fri columns by default (configurable as a future option; not in scope). Cell content: a single status mark — `✓` for present, `A` for absent, `L` for late, `E` for excused — coloured per status. Tall enough to show a small note indicator if a note exists on that record.
- **Month view:** more compressed — single coloured dot per cell, hover/tap reveals the status letter.

**Navigation:** Prev/Next period arrows in the tab header (steps by 1 week in week view, 1 month in month view). "Today" button snaps the visible period to include today. (Note: "period" here refers to the visible date range, not the school timetable period — the latter has its own dedicated selector.)

**Per-student attendance % column** on the right — calculated client-side over the visible period from the loaded records. (Backend has `GET /api/attendance/stats/class/:classId` for term-aggregate stats; we may use that later, but for the visible period a client-side count is fine and avoids extra round-trips.)

**Per-day class % row** at the bottom — also computed client-side.

**Cells are clickable** → opens an `AttendanceDayEditDialog` scoped to that day + the current period, allowing inline edit of just that day's register (subset of the Today tab's controls — per-student status buttons + notes, save button). Closes back to the grid; the grid refreshes the affected cells. Avoids forcing the user to switch tabs to fix one wrong mark. **Keyboard accessibility:** cells are real `<button>` elements (or `<td>` with `role="button" tabIndex={0}` + Enter/Space key handlers); the whole grid is keyboard-navigable.

**Empty cells** (no register taken that day) render as a faded `–`, are also clickable, and open the same dialog to take the register for that day pre-filled as all present.

### 4. PDF export

**Export PDF button** in the page header, always visible. The export is always scoped to the currently-selected class + period + (date or date range):

- **In Today tab:** exports the selected day's register for the selected class + period. PDF layout: school name + class label + date + period header; student list table (admission # | name | status | note); summary totals; signature lines at the bottom (teacher signature + date) — the bit paper-based schools need for staff-room sign-off.
- **In History tab:** exports the visible grid (currently-selected period, currently-visible week or month) as a PDF table (students × dates). Includes per-student % and per-day % rows; class label, period, and date range in the header.

Backend:

- Extend `GET /api/attendance/export` authz from `school_admin, super_admin` to also include `teacher` with `requireTeacherClassOwnership('classId')`. The endpoint currently produces CSV (per `AttendanceExportController.exportAttendance` — verify during plan). We add a PDF format option (probably `?format=pdf` — confirm via existing patterns in the codebase, e.g. the [Lessons export](src/hooks/useLessonExport.ts) pattern).
- PDF generation uses the project's existing PDF stack (PDFKit per the [[pdf-generation]] memory — no HTML-to-PDF). Reuse helpers from `campusly-backend/src/common/pdf/` if they exist there.

### 5. Roster page cleanup

[`src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx`](src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx) currently renders `<TeachingGroupAttendanceRegister classId={...} students={...} learnerLabelPlural={...} />`. Replace with a single button: `<Button>Take attendance →</Button>` linking to `/teacher/attendance?classId=<id>`.

Delete [`src/components/classes/TeachingGroupAttendanceRegister.tsx`](src/components/classes/TeachingGroupAttendanceRegister.tsx) entirely. Verify no other consumers via `grep -rn "TeachingGroupAttendanceRegister" src/`.

### 6. Sidebar nav

`Attendance` is already in the teacher sidebar nav. No change needed (verify during implementation — if missing for standalone teachers, add it to `STANDALONE_TEACHER_NAV` in [`src/lib/constants.ts`](src/lib/constants.ts)).

### 7. Hook + component breakdown

Frontend file structure after the work:

**Modified:**
- [`src/hooks/useTeacherAttendance.ts`](src/hooks/useTeacherAttendance.ts) — generalised: loads all teacher's classes, accepts `classId` parameter, drops the "homeroom required" assumption. Fix UTC bug. Returns the full class list so the page can render the picker.
- [`src/app/(dashboard)/teacher/attendance/page.tsx`](src/app/(dashboard)/teacher/attendance/page.tsx) — wraps the new tab structure (Today / History), class picker, export button.
- [`src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx`](src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx) — replace embedded register with link button.

**New:**
- `src/components/attendance/AttendanceTodayTab.tsx` — extracts the daily-form rendering from the current page file (keeps the page file thin as we add the history tab).
- `src/components/attendance/AttendanceHistoryTab.tsx` — new grid view, week/month toggle, prev/next, per-row/column %.
- `src/components/attendance/AttendanceDayEditDialog.tsx` — base-ui `<Dialog>` used by History-tab cell clicks. MUST follow the project's dialog scroll pattern from CLAUDE.md: `<DialogContent className="flex flex-col max-h-[85vh]">` with scrollable body (`<div className="flex-1 overflow-y-auto py-4">`) wrapping the student list and a sticky `<DialogFooter>` holding the Save button — a real class of 30+ students will exceed viewport height otherwise.
- `src/components/attendance/AttendanceClassPicker.tsx` — the dropdown.
- `src/components/attendance/AttendanceExportButton.tsx` — the PDF export trigger; queries the backend with the current context.
- `src/components/attendance/AttendanceBulkMarkMenu.tsx` — split-button for bulk mark present/absent/late.
- `src/hooks/useAttendanceHistory.ts` — loads a date-range of records for the selected class (used by History tab).
- `src/hooks/useAttendanceExport.ts` — wraps the backend export call (single-day or range).

**Deleted:**
- `src/components/classes/TeachingGroupAttendanceRegister.tsx` (~232 lines)

**Backend:**
- [`campusly-backend/src/modules/Attendance/routes.ts`](C:/Users/shaun/campusly-backend/src/modules/Attendance/routes.ts) — relax `/export` authz to allow teacher with ownership check.
- [`campusly-backend/src/modules/Attendance/export.controller.ts`](C:/Users/shaun/campusly-backend/src/modules/Attendance/export.controller.ts) — add PDF format branch. Reuse common PDF helpers.

## Data flow

```
Page mount
  → useTeacherAttendance loads teaching-load (one call)
  → Resolves classId from URL > homeroom > first class
  → Loads /attendance/class/:classId?date=today (Today tab default)
  → renders class picker + Today tab

User changes classId in picker
  → page updates URL search param
  → hook reloads /attendance/class/:newClassId?date=today

User switches to History tab
  → page updates URL search param to ?tab=history
  → useAttendanceHistory loads /attendance/class/:classId?dateFrom=...&dateTo=...&period=...
    (or /attendance/report if that endpoint serves this better — confirm during plan)
  → renders grid scoped to (classId, period, dateRange)

User clicks a cell in History grid
  → opens AttendanceDayEditDialog with (classId, period, date)
  → dialog uses /attendance/class/:classId?date=... + /attendance/bulk (same period)
  → on save, refreshes the affected cell(s)

User clicks Export PDF
  → useAttendanceExport posts to /api/attendance/export with classId, period,
    and date | (dateFrom + dateTo), format=pdf
  → backend streams PDF blob; frontend triggers download
```

## Acceptance criteria

- A teacher with no homeroom but at least one teaching group can take attendance for that group from `/teacher/attendance` (currently blocked).
- The class picker shows every class the teacher owns. URL `?classId=<id>` persists the selection.
- The Today tab renders the existing daily form with prev/next-day arrows and a bulk-mark split menu offering Present/Absent/Late.
- Any bulk-mark action preserves per-student notes already entered (only the status field is overwritten).
- Saving attendance posts the literal selected date (`YYYY-MM-DD`) without timezone shift; verified by saving a register on a SA timezone machine at 23:00 local time and confirming the backend stored the same date the teacher selected.
- The History tab shows a grid of students × dates with weekly (default) and monthly views, prev/next period nav, and a "Today" button.
- The History tab has a school-period selector that scopes the grid to a single period; the period selection is shared with the Today tab (switching tabs preserves period choice).
- Per-student attendance % renders on the right of the grid; per-day class % renders at the bottom; both computed from the visible period.
- History grid cells are keyboard-accessible (`<button>` or `<td role="button" tabIndex={0}>` with Enter/Space handlers).
- Clicking a history cell opens an `AttendanceDayEditDialog` scoped to that day + the selected period; the dialog uses the standard scroll pattern (flex-col + max-h-[85vh] + scrollable body + sticky footer) and renders cleanly for classes of 30+ students.
- Empty (un-taken) history cells render as `–` and are clickable to take that day's register pre-filled as all present.
- The Export PDF button works from both tabs — single-day register from Today, grid PDF from History — scoped to the current class + period + date(s). The resulting file opens cleanly in a browser/desktop PDF viewer with the school name, class label, date(s), period, and signature line(s).
- The PageHeader stacks responsively on `sm` and below — class picker and Export PDF wrap to their own line beneath the title rather than crowding the right slot.
- The teaching-group roster page no longer renders an attendance register. It shows a `Take attendance →` button that opens `/teacher/attendance?classId=<id>` in the same tab.
- `TeachingGroupAttendanceRegister.tsx` is deleted; `grep -rn "TeachingGroupAttendanceRegister" src/` returns zero matches.
- All new and modified component files are under the project's 350-line cap.
- No `apiClient` imports in page or component files (API calls live in hooks). Project rule.
- No `text-red-*` / `bg-red-*`; existing `bg-destructive` design token used for absent state. Project rule.
- Backend `GET /api/attendance/export` allows the `teacher` role with ownership check; existing `school_admin`/`super_admin` access preserved.

## Open questions for the implementation plan to resolve

- **Class source for standalone teachers (HIGH PRIORITY):** verify `/academic/teacher/me/teaching-load` returns standalone teaching groups in `subjectClasses` (or wherever). If not, extend that endpoint or combine its response with `/academic/classes` filtered to the teacher. Without this, the class picker is empty for the entire MVP audience.
- **Exact PDF-format mechanism on `/api/attendance/export`** (query param `?format=pdf` vs sibling route `/export/pdf` vs separate endpoint). Decide by looking at how `useLessonExport` calls its backend and mirror.
- **Date-range + period listing for the History tab:** does `GET /attendance/class/:classId` already accept `dateFrom`/`dateTo`/`period`? If yes, use it. If no, extend it (small) — `/attendance/report` may also fit but reads as a different shape.
- **Backend PDF helpers location:** confirm `campusly-backend/src/common/pdf/` exists with reusable primitives; otherwise mirror whatever stack the lesson/paper PDFs use (per the [[pdf-generation]] memory: PDFKit/LaTeX, never HTML-to-PDF).
- `Mark all late` and `Mark all absent` MUST preserve any per-student notes already entered. (Surfaced in acceptance criteria too.)

## Spec coverage map

| Spec section | Implemented in |
|---|---|
| Class picker + URL deep-link | Page rewrite + AttendanceClassPicker |
| Today tab daily form | AttendanceTodayTab (extracted from current page) |
| Prev / next day arrows | AttendanceTodayTab |
| Bulk mark split menu | AttendanceBulkMarkMenu |
| UTC fix | useTeacherAttendance.ts (line 244) |
| History tab grid | AttendanceHistoryTab + useAttendanceHistory |
| Week / month toggle | AttendanceHistoryTab |
| Per-student % + per-day % | AttendanceHistoryTab (client-side compute) |
| Period selector shared across tabs | Page-level state passed to AttendanceTodayTab + AttendanceHistoryTab |
| Responsive header | PageHeader (existing component, stacking behaviour) |
| Keyboard-accessible grid cells | AttendanceHistoryTab |
| Dialog scroll pattern (large class) | AttendanceDayEditDialog |
| Cell edit dialog | AttendanceDayEditDialog |
| Export PDF (Today + History) | AttendanceExportButton + useAttendanceExport |
| Backend export authz extension | Attendance/routes.ts |
| Backend PDF format | Attendance/export.controller.ts |
| Delete embedded register | TeachingGroupAttendanceRegister.tsx (deleted) |
| Roster "Take attendance →" link | roster/page.tsx (rewrite the embed block) |
