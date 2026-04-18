# Teacher Timetable — Hardening Spec

**Date:** 2026-04-14
**Status:** Approved
**Scope:** Fix all security, data integrity, UX, and code quality issues found in audit

---

## Problem

The teacher timetable module scores 53/100 in audit. The happy path works, but there are security gaps (cross-school data access, config overwrite), data integrity issues (unique index + soft delete, missing validation), UX dead-ends (empty dropdowns, no delete confirmation), and code quality issues (DRY violations, swallowed errors).

## Goal

Bring every audit criterion to 95+/100 through 23 surgical fixes. No new features, no refactoring — just closing every gap.

---

## Fix 1: Add `schoolId` filter to `getByClass()`

**File:** `campusly-backend/src/modules/Academic/services/misc.service.ts`

Change `getByClass(classId)` to `getByClass(classId, schoolId)` and add `schoolId` to the query filter. Update the controller (`getTimetableByClass`) to pass `req.user.schoolId`.

## Fix 2: Validate `classId` belongs to `user.schoolId` in `createTimetable`

**File:** `campusly-backend/src/modules/Academic/controller.ts`

In the `createTimetable` controller, after setting `data.schoolId` for teachers, verify the class exists in that school:
```
const cls = await AcademicService.getClassById(data.classId, data.schoolId);
if (!cls) return 400 "Class not found in your school"
```

## Fix 3: Restrict config PUT to standalone teachers only

**File:** `campusly-backend/src/modules/TimetableBuilder/controller.ts`

In `updateConfig`, if `user.role === 'teacher'`, check that the school's plan is `'standalone'`. If not, return 403 "Only school admins can modify timetable configuration". Requires fetching the school or checking `user.isSchoolPrincipal`.

Since standalone teachers have `isSchoolPrincipal: true`, the check is: if `role === 'teacher' && !user.isSchoolPrincipal`, reject.

## Fix 4: Add ownership check to `getTimetableByTeacher`

**File:** `campusly-backend/src/modules/Academic/controller.ts`

In `getTimetableByTeacher`, if `user.role === 'teacher'`, force `teacherId = user.id` (ignore the route param). Admins can query any teacherId.

## Fix 5: Fix unique index for soft deletes

**File:** `campusly-backend/src/modules/Academic/model.ts`

Change:
```ts
timetableSchema.index({ classId: 1, day: 1, period: 1 }, { unique: true });
```
To:
```ts
timetableSchema.index(
  { classId: 1, day: 1, period: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
```

This allows re-creation of slots after soft delete.

## Fix 6: Fix ObjectId comparison in ownership guard

**File:** `campusly-backend/src/modules/Academic/controller.ts`

In `updateTimetable` and `deleteTimetable`, replace:
```ts
if (String(existing.teacherId) !== String(user.id))
```
With:
```ts
const existingTeacherId = typeof existing.teacherId === 'object' && existing.teacherId !== null
  ? String((existing.teacherId as { _id?: string })._id ?? existing.teacherId)
  : String(existing.teacherId);
if (existingTeacherId !== String(user.id))
```

This handles both populated objects and raw ObjectId strings.

## Fix 7: Make clash detection unconditional

**File:** `campusly-backend/src/modules/Academic/services/misc.service.ts`

In `createTimetable`, remove the conditional check. The controller already enforces all required fields (validation runs first). Change:
```ts
if (data.schoolId && data.teacherId && ...) {
  await TimetableClashService.validateNoClash(...);
}
```
To:
```ts
await TimetableClashService.validateNoClash(
  String(data.schoolId),
  String(data.teacherId),
  String(data.classId),
  data.day as string,
  data.period as number,
);
```

## Fix 8: Validate period doesn't exceed config

**File:** `campusly-backend/src/modules/Academic/controller.ts`

In `createTimetable` (for teacher role), fetch the timetable config and verify `data.period <= config.periodsPerDay[data.day]`. If no config exists or period exceeds, return 400.

## Fix 9: Validate break `afterPeriod` range in config

**File:** `campusly-backend/src/modules/TimetableBuilder/controller.ts`

In `updateConfig`, after validation passes, check that all `breakSlots[].afterPeriod < max(periodsPerDay)`. Return 400 if violated.

## Fix 10: Validate period times are chronological

**File:** `campusly-backend/src/modules/TimetableBuilder/validation.ts`

Add a `.refine()` to the `periodTimes` array in `configSchema` that checks each entry has `endTime > startTime` (compare as HH:MM strings).

## Fix 11: Add delete confirmation dialog

**File:** `campusly-frontend/src/components/timetable/TimetableSlotDialog.tsx`

Add a confirmation step before calling `onDelete`. Use an inline confirm state:
- First click: button changes to "Confirm Remove?" (destructive)
- Second click: calls `onDelete`
- Clicking away or Cancel resets the confirm state

No new component needed — just local state in the dialog.

## Fix 12: Show "add subjects/classes first" when dropdowns empty

**File:** `campusly-frontend/src/components/timetable/TimetableSlotDialog.tsx`

If `subjects.length === 0` or `classes.length === 0`, show an alert banner inside the dialog body instead of the form:
```
"You need to add subjects and classes before creating timetable entries."
```
With a link/button to `/teacher/classes`. Disable the Save button.

## Fix 13: Error recovery for config fetch failure

**File:** `campusly-frontend/src/hooks/useTeacherTimetableManager.ts`

Track a `configError` state. In `fetchConfig`, on error set `configError = true` (don't set `config = null` for non-404 errors). Expose `configError` and `retryConfig` from the hook.

**File:** `campusly-frontend/src/app/(dashboard)/teacher/timetable/page.tsx`

If `configError`, show an error state with retry button instead of "Set up your school day".

## Fix 14: Fix Select controlled value on edit

**File:** `campusly-frontend/src/components/timetable/TimetableSlotDialog.tsx`

Add `key={existingSlot?.id ?? 'new'}` to the `<form>` element so React re-mounts the form (and Selects) when switching between slots. This ensures Selects start with the correct value from `reset()`.

## Fix 15: Auto-scroll to "Today" on mobile

**File:** `campusly-frontend/src/components/timetable/TimetableMobileView.tsx`

Add a `ref` to the today card and `useEffect` to scroll it into view on mount:
```ts
const todayRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}, []);
```

## Fix 16: Loading state for subjects/classes in slot dialog

**File:** `campusly-frontend/src/components/timetable/TimetableSlotDialog.tsx`

Add `subjectsLoading` and `classesLoading` boolean props. When either is true, show a loading spinner inside the dialog body instead of the form.

**File:** `campusly-frontend/src/app/(dashboard)/teacher/timetable/page.tsx`

Pass `subjectsLoading={subjectsLoading}` and `classesLoading={classesLoading}` from the hooks.

## Fix 17: Fix `catch {}` in fetchConfig

**File:** `campusly-frontend/src/hooks/useTeacherTimetableManager.ts`

Change bare `catch {}` to `catch (err: unknown)` with `console.error`.

(Already partially done in review fix — verify it's correct for the new error-state logic from Fix 13.)

## Fix 18: Add error boundary

**File:** `campusly-frontend/src/app/(dashboard)/teacher/timetable/page.tsx`

Wrap the page content in a simple error boundary. Use an inline `ErrorBoundary` component or create `src/components/shared/ErrorBoundary.tsx` if one doesn't exist. Show "Something went wrong" with a retry button.

## Fix 19: Serial mutation queue

**File:** `campusly-frontend/src/hooks/useTeacherTimetableManager.ts`

Add a `mutatingRef = useRef(false)` guard. Before any mutation (create/update/delete), check if another is in progress. If so, queue it or reject. After mutation + refetch completes, release the guard. This prevents overlapping refetches from desync.

## Fix 20: Extract shared `DayOfWeek` type

**File:** `campusly-frontend/src/types/academic.ts`

Add: `export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';`

Update `TimetableSlot.day` to use it. Remove local `DayOfWeek` definitions from all timetable files.

## Fix 21: Extract shared helpers

**File:** `campusly-frontend/src/components/timetable/timetable-helpers.ts` (new)

Extract from Grid and MobileView:
- `DAYS`, `DAY_LABELS`
- `COLOR_PALETTE`
- `getSubjectId()`, `getSubjectName()`, `getClassName()`
- `parseTimeToMinutes()`

Update both Grid and MobileView to import from this file.

## Fix 22: Add break duration label

**File:** `campusly-frontend/src/components/timetable/PeriodConfigDialog.tsx`

Add "min" label text next to the duration input field. Change the placeholder from empty to "mins".

## Fix 23: Constrain break `afterPeriod` max in UI

**File:** `campusly-frontend/src/components/timetable/PeriodConfigDialog.tsx`

The `<Input type="number" max={periodCount - 1}>` already exists but `max` on number inputs is advisory. Add an `onChange` handler that clamps: `Math.min(Number(e.target.value), periodCount - 1)`.
