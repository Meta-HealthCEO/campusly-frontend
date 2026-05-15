# Student Classes — Multi-Class Enrollment — Design

**Status:** Design approved, ready for implementation plan
**Author:** Brainstormed with Shaun, 2026-05-16
**Related files:**

Frontend (new):
- [`src/app/(dashboard)/student/classes/page.tsx`](src/app/(dashboard)/student/classes/page.tsx) — page orchestrator
- [`src/components/student/ClassCard.tsx`](src/components/student/ClassCard.tsx) — card component
- [`src/hooks/useStudentClasses.ts`](src/hooks/useStudentClasses.ts) — data hook

Frontend (modified):
- [`src/lib/constants.ts`](src/lib/constants.ts) — STUDENT_NAV entry + ROUTES entry

Backend (modified):
- `../campusly-backend/src/modules/Student/model.ts` — schema change (additive)
- `../campusly-backend/src/modules/Student/routes.ts` — new `/me/classes` route
- `../campusly-backend/src/modules/Student/controller.ts` — new `getMyClasses` handler
- `../campusly-backend/src/modules/Student/service.ts` — new service method (or a dedicated `service-classes.ts` if the file is already large)

**Scope note:** This is v1. Subject-class joining via classroom code is intentionally **deferred** to a follow-up spec because every consuming service (lessons, homework, assignments, attendance, gradebook, marking, etc. — 15+ services) currently filters on `Student.classId` only; enabling subject joins without fixing them produces a broken UX where teachers cannot see students who joined their subject class. v1 ships the page (showing the student's homeroom), the new endpoint, the new schema field (empty until v2), and the navigation entry. v2 enables the subject-join flow and updates every consuming service.

---

## Goal

Give students a dedicated `/student/classes` page that shows the class they're currently enrolled in (their homeroom). Lay the data-model and endpoint foundation that v2 will extend to support subject-class enrollment.

Today the [Student model](../campusly-backend/src/modules/Student/model.ts) has a single required `classId` and the only place a student sees their class is implicitly via the dashboard's join card flow. There is no list view. v1 fixes that gap.

## Non-goals

- **Subject-class enrollment via classroom code.** The existing [`joinClassByCode`](../campusly-backend/src/modules/Academic/services/grade.service.ts) handler is unchanged in v1. v2 will add a branch on `cls.isHomeroom`, fix the capacity check, decide the duplicate-join policy, and update every consuming service that filters by `classId`.
- **Surfacing subject classes on the page.** v1 renders only the homeroom card. v2 adds the "Subject classes" section.
- **Lessons / homework / tests filtering by subject class.** Out of scope — there are no subject-class enrollments to filter on in v1.
- **Leaving a class.** Read-only.
- **Per-class detail page.** No `/student/classes/[classId]` route.
- **Enrollment metadata** (joinedAt, term, status). `subjectClassIds` is a plain array. A move to a `ClassEnrollment` collection is a future migration if/when metadata is needed.
- **Standalone teacher / standalone coach flows.** Unchanged.

## Background

The backend already supports the homeroom-plus-subject-class shape on the Class side:

- The [Class model](../campusly-backend/src/modules/Academic/model.ts) has an `isHomeroom: boolean` flag.
- Every class has a unique `classroomCode` used by the join card.
- The join endpoint already exists at `POST /api/academic/classes/join`.

The gap on the Student side is two-fold: `classId` is a single ObjectId, and the frontend has no page to view enrollments. v1 closes the *display* gap and lays the schema foundation; v2 will close the *enrollment* gap.

### Why v2 is deferred

The existing [`joinClassByCode`](../campusly-backend/src/modules/Academic/services/grade.service.ts#L243) handler in `grade.service.ts` always sets `student.classId = cls._id` and `student.gradeId = cls.gradeId`, and enforces capacity via a `countDocuments({ classId, ... })` query. Adding a subject-class branch requires:

- A capacity policy for subject classes (probably count `$or: [{ classId }, { subjectClassIds }]`).
- A decision **not** to overwrite `gradeId` when joining a subject class.
- A duplicate-join policy (the homeroom path throws `ConflictError('You are already in this class')` today; the subject path needs its own rule — idempotent success vs conflict).
- Auditing and updating every consuming service that filters by `classId` (Lesson access, Assignment access, Homework access, Academic gradebook publish, term-summary, subject-trend, AITools marking, Student dashboard/regenerate/credentials). Each needs `$or: [{ classId }, { subjectClassIds: classId }]` or it will silently exclude subject-class students.

That work belongs in its own spec.

## Design

### 1. Backend: Student model gains `subjectClassIds`

Add one field to the [Student schema](../campusly-backend/src/modules/Student/model.ts):

```ts
subjectClassIds: Types.ObjectId[];  // default: []
```

Update both the `IStudent` TypeScript interface and the Mongoose schema (CLAUDE.md gotcha: Mongoose silently drops fields missing from the schema). The field is non-required with a default of `[]` so existing students remain valid without a data migration.

Add a multikey index for the future v2 reverse lookup ("which students are enrolled in subject class X?"):

```ts
studentSchema.index({ subjectClassIds: 1, schoolId: 1 });
```

The multikey field leads for selectivity — a `subjectClassIds: X` filter narrows to ~30 students, whereas `schoolId` matches thousands. MongoDB does not index empty arrays, so this index costs zero space in v1 (every doc has `subjectClassIds: []`).

In v1, nothing reads or writes this field. It is laid down so v2 is purely additive — no schema migration needed at that point.

### 2. Backend: join endpoint — no change

The existing [`POST /api/academic/classes/join`](../campusly-backend/src/modules/Academic/routes.ts#L121) handler ([`joinClassByCode` in grade.service.ts](../campusly-backend/src/modules/Academic/services/grade.service.ts#L243)) is **unchanged in v1**. It continues to treat every join as a homeroom replacement (which is the current behaviour and matches the existing JoinClassCard helper text). v2 will add the `cls.isHomeroom === false` branch, fix the capacity check, and handle the duplicate-join policy.

### 3. Backend: new endpoint `GET /api/students/me/classes`

Returns the current student's enrollments. The response contract includes `subjectClasses` from day one so the v2 rollout is purely a backend population change with no API consumer rework:

```ts
{
  homeroom: PopulatedClass | null;
  subjectClasses: PopulatedClass[]; // always [] in v1
}
```

Where `PopulatedClass` is:

```ts
{
  id: string;
  name: string;
  classroomCode: string;
  isHomeroom: boolean;
  grade: { id: string; name: string };
  teacher: { id: string; firstName: string; lastName: string };
}
```

Implementation notes:

- Resolve the current Student via `Student.findOne({ userId: req.user.id, schoolId: req.user.schoolId, isDeleted: false }).lean()`. The JWT carries `User._id`, not `Student._id` (called out in CLAUDE.md).
- If no Student record is found, return `{ homeroom: null, subjectClasses: [] }`. Read views return empty rather than 404 so the page can render its empty state. (This intentionally differs from `joinClassByCode`, which throws `NotFoundError('Student profile not found')` because join requires an existing profile to mutate. The two endpoints have different policies for the same missing record: writes throw; reads return empty.)
- Fetch homeroom: `Class.findOne({ _id: student.classId, schoolId, isDeleted: false }).populate('teacherId').populate('gradeId').lean()`. If the homeroom is soft-deleted, `homeroom` is `null`.
- v1 always returns `subjectClasses: []`. The implementation includes the (unused) code path that queries `Class.find({ _id: { $in: student.subjectClassIds }, schoolId, isDeleted: false }).sort({ name: 1 })` so v2 has nothing to do here when the schema field starts being populated.
- Populate requires `ref` on schema fields — both `Class.teacherId` and `Class.gradeId` already have refs.
- Response is normalised by the frontend api-client (`normalizeIds` maps `_id → id`).

Mount in `Student/routes.ts` under the existing `/api/students` mount in `app.ts`:

```ts
router.get('/me/classes', authenticate, authorize('student'), StudentController.getMyClasses);
```

`schoolScope` middleware is not needed: the schoolId is derived from `req.user`, not from a URL parameter.

### 4. Backend: consuming services — no change in v1

Because `subjectClassIds` is empty for every student in v1, the existing `classId`-only queries across Lesson, Assignment, Homework, Academic gradebook, term-summary, subject-trend, AITools marking, and Student services continue to work correctly. The audit and `$or` rewrite is v2's responsibility, performed in the same PR as enabling the subject-join branch on the join endpoint.

### 5. Frontend: hook `useStudentClasses`

New file [`src/hooks/useStudentClasses.ts`](src/hooks/useStudentClasses.ts):

```ts
export interface StudentClass {
  id: string;
  name: string;
  classroomCode: string;
  isHomeroom: boolean;
  grade: { id: string; name: string };
  teacher: { id: string; firstName: string; lastName: string };
}

export function useStudentClasses(): {
  homeroom: StudentClass | null;
  subjectClasses: StudentClass[];
  loading: boolean;
  refresh: () => Promise<void>;
}
```

- All API calls live here. The page never imports `apiClient`.
- Uses `unwrapResponse` from `@/lib/api-helpers`.
- `refresh` is returned so the page can trigger a re-fetch after the join card is used elsewhere (the dashboard already does this — this hook is additive on its own page).

### 6. Frontend: page `/student/classes`

New file [`src/app/(dashboard)/student/classes/page.tsx`](src/app/(dashboard)/student/classes/page.tsx) — thin orchestrator only.

Layout (v1 — homeroom only):

1. `<PageHeader title="My Classes" description="Your current class at school." />`
2. **Homeroom section** — full-width card.
   - If `homeroom` is non-null: `<ClassCard cls={homeroom} variant="homeroom" />`.
   - If `homeroom` is null: `<EmptyState icon={Users} title="You haven't joined a class yet" description="Use the join card on your dashboard with the code from your teacher." />`.
3. Loading: `<LoadingSpinner />` while `loading` is true.

The hook returns `subjectClasses` but v1 does not render it (since it is always `[]`). v2 will add the "Subject classes" section in this same file.

Constraints (from CLAUDE.md):

- No `apiClient` import in the page.
- No `any`. All types come from the hook's `StudentClass` interface.
- Mobile-first: full-width card, gap-4. No fixed widths.
- Empty state and loading state both implemented.
- File under 350 lines (expected ~50 in v1).

### 7. Frontend: component `ClassCard`

New file [`src/components/student/ClassCard.tsx`](src/components/student/ClassCard.tsx) — pure UI, no API calls, no state.

Props:

```ts
interface ClassCardProps {
  cls: StudentClass;
  variant?: 'homeroom' | 'subject';  // default: 'subject'
}
```

Renders a Card showing:

- Class name (`truncate`).
- Grade name (small, muted).
- Teacher full name: `"{firstName} {lastName}"`, `truncate`. (The User model has no honorific field, so we render the full first + last name rather than fabricating "Mr / Ms".)
- Classroom code in a monospaced chip, `tracking-wider`, right-aligned.
- "Homeroom" pill (subtle, top-right) when `variant === 'homeroom'`.

### 8. Frontend: JoinClassCard — no change in v1

The existing card and helper copy ("Joining a new class will replace your current homeroom.") remain accurate because v1 only supports homeroom joining. v2 will update the copy and the toast when the subject-join branch lands.

### 9. Frontend: navigation entry

Add to `ROUTES` in [`src/lib/constants.ts`](src/lib/constants.ts):

```ts
STUDENT_CLASSES: '/student/classes',
```

Then add to `STUDENT_NAV` as the first entry in the phase-2 (module-gated) block, immediately before Timetable:

```ts
{ label: 'My Classes', href: ROUTES.STUDENT_CLASSES, icon: Users, module: 'academic' },
```

The plural label is used in v1 even though only the homeroom renders today — it stays accurate for v2 with no rename, and matches the page header.

Position rationale: a student's class determines their timetable and grades, so Classes leads the academic sidebar block.

## Data flow (v1)

```
Student opens /student/classes
  └─ <StudentClassesPage> renders
       └─ useStudentClasses() fires GET /api/students/me/classes
            └─ Backend: resolve Student by userId
                       → load Class for student.classId (.populate teacher + grade)
                       → return { homeroom, subjectClasses: [] }
       └─ Page renders <ClassCard variant="homeroom" /> or empty state
```

## Error handling

| Failure | Behaviour |
|---|---|
| Student has no homeroom (`classId` missing or soft-deleted) | `homeroom: null` in response; page shows empty state with link to the join card |
| Student record not found by `userId` | Return `{ homeroom: null, subjectClasses: [] }`; page shows empty state. Read views return empty rather than 404 — see section 3 for the policy rationale |
| Network failure on page load | Hook sets `loading: false`, `homeroom: null`, `subjectClasses: []`; page shows empty state. Surfacing the underlying error via toast is optional for this read view |
| User is not a student (role mismatch) | `authorize('student')` middleware returns 403 before the controller runs |

## Testing

### Backend

- `Student/__tests__/me-classes.test.ts` (new) — `getMyClasses` controller / service:
  - Returns populated homeroom with teacher + grade when student has a classId
  - Returns `homeroom: null` when student has no classId
  - Returns `homeroom: null` when homeroom is soft-deleted
  - Returns `homeroom: null` and `subjectClasses: []` when no Student record matches `userId`
  - Returns `subjectClasses: []` regardless of `student.subjectClassIds` content in v1 (always empty in production, but the test fixture can populate it to verify the query is shaped correctly for v2)
- Schema test: `subjectClassIds` defaults to `[]` on a fresh Student doc; index exists.

### Frontend

- `useStudentClasses` hook: returns expected shape from a mocked `apiClient.get` response; handles empty response; handles error.
- `/student/classes` page: renders the homeroom card when present; renders the empty state when `homeroom === null`; renders `<LoadingSpinner />` while loading.
- `ClassCard`: renders class name, grade, teacher full name, classroom code; shows "Homeroom" pill only when `variant === 'homeroom'`.

## Pre-merge checklist (per CLAUDE.md)

- No `apiClient` import in any page or component file
- No `any` types; all `catch` blocks use `catch (err: unknown)`
- No `text-red-*` (use `text-destructive`)
- `subjectClassIds` defined in **both** Mongoose schema and `IStudent` interface
- All `Class.findOne` / `Class.find` calls in new code filter `schoolId` + `isDeleted: false`
- New page under 350 lines
- Empty state + loading state present for the new page
- All grids/layouts have mobile breakpoints; no bare `grid-cols-N` without a breakpoint prefix
- All fixed widths use the `w-full sm:w-N` pattern
- Touch targets ≥ 44px on primary actions
- Tables / overflow-prone content wrapped in `overflow-x-auto` (not applicable here, but worth checking)

## Rollout

No feature flag. The schema change is additive (default `[]`, no migration). The new endpoint is additive. The new page is gated by the `academic` module via the existing `useModule` filtering in `STUDENT_NAV` — schools without academic enabled will not see the nav entry. No production behaviour changes for any existing flow.

## Future follow-ups (v2 — separate spec)

1. **Subject-class joining via classroom code.** Branch the existing `joinClassByCode` on `cls.isHomeroom`. Define capacity policy (probably count `$or: [classId, subjectClassIds]`). Decide duplicate-join policy. Do **not** overwrite `gradeId` for subject joins.
2. **Update every consuming service that filters on `classId` only.** Audit list from grep: Lesson access / service / service-assignments, Assignment access / service-hardening, Homework access, Academic gradebook publish, term-summary, subject-trend, AITools marking (text + visual), Student dashboard / regenerate / credentials. Each needs `$or: [{ classId }, { subjectClassIds: classId }]` or equivalent.
3. **Render the "Subject classes" section** on `/student/classes` and rename the page label back to "My Classes" (plural).
4. **JoinClassCard copy + toast.** Update helper text and use `previousClassId` / a new `kind` field to distinguish homeroom-replace from subject-add toasts.
5. **`ClassEnrollment` collection.** If enrollment metadata becomes a requirement, migrate `subjectClassIds` into a join collection. One-time backfill.
6. **Leave action.** Allow a student to drop a subject class. DELETE endpoint + confirm dialog.
7. **Per-class detail page** `/student/classes/[classId]` — classmates, teacher contact, per-class feed.
