# Teacher Timetable — Self-Managed Design Spec

**Date:** 2026-04-14
**Status:** Draft
**Scope:** Standalone teacher timetable management (period config + CRUD)

---

## Problem

Standalone teachers have no admin to create their timetable. The current teacher timetable page is read-only and shows an empty state with "No timetable entries have been assigned to you yet." Standalone teachers need to define their school day structure and populate their own weekly schedule.

## Solution

A two-step self-managed timetable: (1) define period configuration (times, breaks), then (2) populate the weekly grid via click-to-add/edit/delete interactions. Reuses existing backend models and endpoints with minimal permission changes.

---

## 1. Period Configuration

### What the teacher configures

- **Periods per day:** 1–10, default 7. Uniform across all weekdays.
- **Period times:** Start/end time for each period. Defaults: P1 starts 07:30, 45-minute periods.
- **Break slots (optional):** Break after a given period, with duration and label (e.g. "Break after P3, 30 min").

### Data model

Reuses `TimetableConfig` from the timetable-builder module. Schema:

```ts
{
  schoolId: ObjectId,
  periodsPerDay: { monday: number, tuesday: number, ... },  // all set to same value
  periodTimes: [{ period: number, startTime: string, endTime: string }],
  breakSlots: [{ afterPeriod: number, duration: number, label: string }],
  academicYear: string,
  term: string,
}
```

Scoped by `schoolId` — standalone teachers write to their own school's config.

### UI

A dialog (not a wizard). Contents:

1. Period count selector (number input or stepper, range 1–10)
2. Compact list of period rows with time inputs (HH:MM for start/end)
3. "+ Add Break" button to insert break slots
4. Save button

Opens from:
- First-visit onboarding prompt (replaces empty state)
- Settings/gear icon in the PageHeader (for editing later)

---

## 2. Timetable Grid Editor

### Viewing

- Same layout as current: desktop table (hidden on mobile) + mobile card list.
- Cells are now **clickable/tappable**.
- Free slots show a "+" icon/button.
- Occupied slots show subject/class/room info and are clickable to edit.
- "Now" indicator and subject color-coding remain unchanged.

### Creating a slot

1. Teacher clicks "+" on a free cell (e.g. Tuesday P3).
2. Dialog opens pre-filled with `day` and `period`.
3. Fields:
   - **Subject** — dropdown, populated from teacher's subjects (`useTeacherSubjects`)
   - **Class** — dropdown, populated from teacher's classes
   - **Room** — optional text input
4. `startTime` and `endTime` auto-filled from period config — not editable per slot.
5. Save → `POST /academic/timetable`

Payload sent:
```ts
{ schoolId, teacherId, classId, day, period, startTime, endTime, subjectId, room }
```
`schoolId` and `teacherId` are read from the auth store and included in the request body (required by validation schema). The backend overwrites them server-side with `req.user` values for safety.

### Editing a slot

- Click occupied cell → same dialog, pre-filled with current values.
- Save → `PUT /academic/timetable/:id`

### Deleting a slot

- Inside edit dialog → "Remove from timetable" button (destructive variant).
- `DELETE /academic/timetable/:id`

### Clash prevention

The unique index `{ classId, day, period }` on the Timetable collection prevents double-booking. No additional clash UI needed for standalone teachers.

### No-config guard

If `TimetableConfig` doesn't exist for the teacher's school:
- Grid is not rendered.
- Page shows: illustration + "Set up your school day" heading + "Configure your periods and times to get started" description + CTA button.
- Button opens `PeriodConfigDialog`.

---

## 3. Backend Changes

### 3.1 Fix `getByTeacher` multi-tenancy bug

**File:** `campusly-backend/src/modules/Academic/services/misc.service.ts:102`

Current:
```ts
static async getByTeacher(teacherId: string): Promise<ITimetable[]> {
  return Timetable.find({ teacherId, isDeleted: false })
```

Fixed:
```ts
static async getByTeacher(teacherId: string, schoolId: string): Promise<ITimetable[]> {
  return Timetable.find({ teacherId, schoolId, isDeleted: false })
```

Update controller to pass `req.user.schoolId`.

### 3.2 Allow teachers to access timetable config

**File:** `campusly-backend/src/modules/TimetableBuilder/routes.ts`

Widen role check on `GET /config` and `PUT /config` to include `teacher`. The config model is `schoolId`-scoped, so a teacher can only read/write their own school's config.

### 3.3 Allow teachers to update/delete their own timetable entries

**File:** `campusly-backend/src/modules/Academic/routes.ts`

`POST /timetable` already allows `teacher` role (line 176). Only update and delete need changes:
- `PUT /timetable/:id` — add `teacher`
- `DELETE /timetable/:id` — add `teacher`

### 3.4 Ownership guard in controller

**File:** `campusly-backend/src/modules/Academic/controller.ts`

The `createTimetable` controller currently passes `req.body` straight through with no checks. Changes needed:

**For `createTimetable` (POST):** When `req.user.role === 'teacher'`, overwrite `req.body.teacherId` and `req.body.schoolId` with `req.user.id` and `req.user.schoolId` before passing to the service. This ensures teachers can only create entries for themselves.

**For `updateTimetable` (PUT) and `deleteTimetable` (DELETE):** Before performing the operation, fetch the existing entry and verify `entry.teacherId === req.user.id`. Return 403 if mismatch. This prevents teachers in real schools from editing other teachers' slots.

### 3.5 Frontend sends schoolId and teacherId in request body

The `timetableSchema` validation (validation.ts:42-52) requires both `schoolId` and `teacherId` as mandatory ObjectId fields. Validation runs before the controller, so these must be present in the request body. The frontend sends them from the auth store (`user.id` for teacherId, `user.schoolId` for schoolId). The controller then **overwrites** them server-side for safety (see 3.4), so even if a malicious client sends fake IDs, they are replaced.

---

## 4. Frontend Architecture

### New hook: `useTeacherTimetableManager`

**File:** `src/hooks/useTeacherTimetableManager.ts`

Combines timetable reading with config + CRUD operations:

```ts
Returns {
  // Timetable data
  timetable: TimetableSlot[]
  loading: boolean

  // Period config
  config: TimetableConfig | null
  configLoading: boolean
  hasConfig: boolean

  // Mutations
  saveConfig(data: Partial<TimetableConfig>): Promise<void>
  createSlot(data: CreateSlotPayload): Promise<void>
  updateSlot(id: string, data: Partial<CreateSlotPayload>): Promise<void>
  deleteSlot(id: string): Promise<void>
  refetch(): Promise<void>
}
```

### New components

All in `src/components/timetable/`:

| Component | Purpose | Est. lines |
|---|---|---|
| `PeriodConfigDialog` | Period count, time pickers, break slots | ~200 |
| `TimetableSlotDialog` | Create/edit slot: subject + class dropdowns, room input, delete | ~180 |
| `TimetableGrid` | Interactive desktop weekly grid, clickable cells | ~200 |
| `TimetableMobileView` | Interactive mobile card layout | ~150 |

### Revised page

**File:** `src/app/(dashboard)/teacher/timetable/page.tsx`

Thin orchestrator:
- Calls `useTeacherTimetableManager`
- No-config state → setup prompt + `PeriodConfigDialog`
- Has-config state → `TimetableGrid` (desktop) + `TimetableMobileView` (mobile)
- Passes mutation callbacks as props to dialogs
- Settings button in `PageHeader` for editing period config

---

## 5. Data Flow

### First visit (no config)

1. Hook fetches config → 404/empty → `hasConfig = false`
2. Page renders setup prompt card
3. Teacher opens `PeriodConfigDialog` → defaults shown (7 periods, 07:30 start, 45 min each)
4. Teacher saves → `PUT /timetable-builder/config` → `hasConfig = true` → grid appears (empty)

### Adding a slot

1. Teacher clicks "+" on free cell
2. `TimetableSlotDialog` opens with day + period pre-filled, times from config
3. Teacher picks subject, class, optionally room
4. Save → `POST /academic/timetable` → `refetch()` → cell populated

### Editing a slot

1. Click occupied cell → `TimetableSlotDialog` pre-filled
2. Modify fields → `PUT /academic/timetable/:id` → `refetch()`

### Deleting a slot

1. Inside edit dialog → "Remove from timetable" (destructive)
2. `DELETE /academic/timetable/:id` → `refetch()` → cell returns to "+"

### Editing period config

1. Settings icon → `PeriodConfigDialog` with current values
2. If period count reduced and orphaned slots exist → warning shown
3. Save → config updated → grid re-renders

### Teacher joins a school

1. Teacher's `user.schoolId` changes to new school
2. `getByTeacher(teacherId, schoolId)` now queries against new school — returns school-assigned timetable
3. Old standalone entries remain in DB under old `schoolId` — invisible, effectively archived
4. No migration or cleanup needed

---

## 6. State Management

All state local to `useTeacherTimetableManager` via `useState`. No Zustand store — timetable data is page-scoped, not cross-cutting. Mutations refetch from server rather than optimistic local patching, consistent with codebase patterns.

---

## 7. Files Changed / Created

### Backend (campusly-backend)

| File | Change |
|---|---|
| `src/modules/Academic/services/misc.service.ts` | Add `schoolId` param to `getByTeacher` |
| `src/modules/Academic/controller.ts` | Pass `schoolId` to `getByTeacher`, add ownership guard for teacher create/update/delete |
| `src/modules/Academic/routes.ts` | Add `teacher` role to PUT/DELETE timetable routes (POST already has it) |
| `src/modules/TimetableBuilder/routes.ts` | Add `teacher` role to GET/PUT config routes |

### Frontend (campusly-frontend)

| File | Change |
|---|---|
| `src/hooks/useTeacherTimetableManager.ts` | **New** — CRUD + config hook |
| `src/components/timetable/PeriodConfigDialog.tsx` | **New** — period setup dialog |
| `src/components/timetable/TimetableSlotDialog.tsx` | **New** — create/edit/delete slot dialog |
| `src/components/timetable/TimetableGrid.tsx` | **New** — interactive desktop grid |
| `src/components/timetable/TimetableMobileView.tsx` | **New** — interactive mobile cards |
| `src/app/(dashboard)/teacher/timetable/page.tsx` | **Rewrite** — orchestrator with config guard |
| `src/hooks/useTeacherTimetable.ts` | **Unchanged** — superseded by new hook but left for other consumers |

---

## 8. What's NOT in scope

- Recurring/weekly variation (different schedules per week) — all weeks are the same
- Drag-and-drop reordering — click-based is sufficient for MVP
- Print/export — future enhancement
- Substitution/cover lessons — future enhancement
- Integration with lesson plans — separate feature
- Student view changes — student timetable remains read-only, unaffected
- Admin timetable builder — completely separate, untouched
