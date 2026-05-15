# Student Classes — Multi-Class Enrollment — Design

**Status:** Design approved, ready for implementation plan
**Author:** Brainstormed with Shaun, 2026-05-16
**Related files:**
- [`src/app/(dashboard)/student/page.tsx`](src/app/(dashboard)/student/page.tsx) — dashboard hosting the existing JoinClassCard
- [`src/components/student/JoinClassCard.tsx`](src/components/student/JoinClassCard.tsx) — copy + toast update
- [`src/hooks/useJoinClass.ts`](src/hooks/useJoinClass.ts) — response shape extension
- [`src/lib/constants.ts`](src/lib/constants.ts) — STUDENT_NAV entry
- `../campusly-backend/src/modules/Student/model.ts` — schema change
- `../campusly-backend/src/modules/Academic/model.ts` — Class model (no change, reference only)
- `../campusly-backend/src/modules/Academic/controllers/class.controller.ts` — join endpoint behavior
- `../campusly-backend/src/modules/Student/routes.ts` — new `/students/me/classes` endpoint

---

## Goal

Give students a dedicated page that lists every class they are enrolled in — their homeroom plus any subject-specific classes they have joined — and extend the data model so a student can belong to more than one class at a time.

Today the [Student model](../campusly-backend/src/modules/Student/model.ts) has a single required `classId` and the join card on the student dashboard explicitly tells the student that "joining a new class will replace your current homeroom." The product needs to support a high-school enrollment model: one homeroom (the form / register class) plus many subject classes (Maths, Science, etc.), each joinable by its own classroom code.

## Non-goals

- **Lessons / homework / tests filtering by subject class.** Today these views filter on `Student.classId` (homeroom only). Surfacing content from subject classes is a follow-on UX decision and is out of scope here.
- **Leaving a subject class.** The page is read-only in this iteration.
- **Per-class detail page.** No `/student/classes/[classId]` route. Click-through on a class card is not part of this design.
- **New roles or enrollment metadata** (joinedAt, term, status). The new field is a plain array. A move to a `ClassEnrollment` collection is a future migration if/when metadata is needed.
- **Standalone teacher / standalone coach flows.** This design assumes school-mode users. Standalone behaviour is unchanged.

## Background

The backend already supports the homeroom-plus-subject-class shape on the Class side:

- The [Class model](../campusly-backend/src/modules/Academic/model.ts) has an `isHomeroom: boolean` flag.
- Every class has a unique `classroomCode` used by the join card.
- The join endpoint already exists at `POST /api/academic/classes/join`.

The gap is on the Student side: `classId` is a single ObjectId, and the join endpoint replaces it unconditionally. The frontend has no page to view enrollments — only the join card on the dashboard.

## Design

### 1. Backend: Student model gains `subjectClassIds`

Add one field to the [Student schema](../campusly-backend/src/modules/Student/model.ts):

```ts
subjectClassIds: Types.ObjectId[];  // default: []
```

Update both the `IStudent` TypeScript interface and the Mongoose schema (CLAUDE.md gotcha: Mongoose silently drops fields missing from the schema). The field is non-required with a default of `[]` so existing students remain valid without a data migration.

Add a multikey index for reverse lookups (used by teacher rosters in section 4):

```ts
studentSchema.index({ schoolId: 1, subjectClassIds: 1 });
```

### 2. Backend: join endpoint behavior

`POST /api/academic/classes/join` body `{ code }` — handled in [class.controller.ts](../campusly-backend/src/modules/Academic/controllers/class.controller.ts).

Resolve the class:

```ts
const cls = await Class.findOne({
  classroomCode: code.toUpperCase(),
  schoolId: req.user.schoolId,
  isDeleted: false,
});
if (!cls) throw new NotFoundError('Invalid class code');
```

Then branch on `cls.isHomeroom`:

- **Homeroom (`true`)** — existing behaviour. Set `student.classId = cls._id`, capture the previous value, save. Return `{ class, previousClassId, kind: 'homeroom' }`.
- **Subject class (`false`)** — push `cls._id` into `student.subjectClassIds` if not already present (idempotent). Save only if changed. Return `{ class, previousClassId: null, kind: 'subject' }`.

Error cases:

- Code matches no class in this school → `404 NotFoundError('Invalid class code')`. The school filter is enforced *inside* the lookup so we cannot leak existence of codes from other schools.
- Code already in `subjectClassIds` → idempotent success with `kind: 'subject'` and the existing class returned.

### 3. Backend: new endpoint `GET /api/students/me/classes`

Returns the current student's enrollments:

```ts
{
  homeroom: PopulatedClass | null;
  subjectClasses: PopulatedClass[]; // sorted by name asc
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

- Resolve the current Student via `Student.findOne({ userId: req.user.id, schoolId: req.user.schoolId, isDeleted: false })`. The JWT carries `User._id`, not `Student._id` — CLAUDE.md calls this out explicitly.
- If no Student record is found, return `{ homeroom: null, subjectClasses: [] }` rather than 404. A user may have a `student` role on `req.user` but not yet have a Student record in some edge cases.
- Fetch homeroom: `Class.findOne({ _id: student.classId, schoolId, isDeleted: false })` with `populate('teacherId')` and `populate('gradeId')`. If the homeroom is soft-deleted, `homeroom` is `null`.
- Fetch subject classes: `Class.find({ _id: { $in: student.subjectClassIds }, schoolId, isDeleted: false })` with the same populates, then `.sort({ name: 1 })`.
- Populate requires `ref` on the schema fields — both `Class.teacherId` and `Class.gradeId` already have refs (verified in the model file). No schema change needed for populate.
- Response shape uses normalised `id` (the frontend api-client `normalizeIds` already handles `_id → id`).

The endpoint mounts on the existing `Student` routes file and uses the same `authenticate` middleware as the rest of `/api/students`. Role check: any authenticated student. (A parent or teacher calling `/me/classes` would correctly get an empty result because they have no Student record by `userId`.)

### 4. Backend: teacher roster query updated (in scope)

The teacher roster currently fetches students with `Student.find({ classId: classId, ... })`. After this change, a student who joined a subject class via code would not appear in the teacher's roster for that class, which is a regression in user expectation.

Update the teacher roster service to use:

```ts
Student.find({
  schoolId,
  isDeleted: false,
  $or: [
    { classId },
    { subjectClassIds: classId },
  ],
})
```

This is a single query change in the teacher-classes roster service. No new endpoint. Audit other call sites that look up students by `classId` to decide whether they need the same treatment — most will (homework recipients, attendance), but expanding them is **not** required for this feature to ship since this feature is the student-facing page only. Document any deferred call sites in the implementation plan.

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

Layout:

1. `<PageHeader title="My Classes" description="Your homeroom and all your subject classes." />`
2. **Homeroom section** — full-width highlighted card.
   - If `homeroom` is non-null: large card with class name, grade, teacher full name, classroom code (monospaced, right-aligned), and a "Homeroom" pill in the corner.
   - If `homeroom` is null: `<EmptyState>` with "You haven't joined a homeroom yet. Use the join card on your dashboard."
3. **Subject classes section** — heading "Subject classes ({count})".
   - If empty: `<EmptyState icon={Users} title="No subject classes yet" description="Ask your teacher for a class code and join from the dashboard." />`.
   - Otherwise: `<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">` of `<ClassCard>` components.
4. Loading: `<LoadingSpinner />` while `loading` is true.

Constraints (from CLAUDE.md):

- No `apiClient` import in the page.
- No `any`. All types come from the hook's `StudentClass` interface.
- Mobile-first grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, gap-4.
- Empty state and loading state both implemented.
- File under 350 lines (expected ~80).

### 7. Frontend: component `ClassCard`

New file [`src/components/student/ClassCard.tsx`](src/components/student/ClassCard.tsx) — pure UI.

Props:

```ts
interface ClassCardProps {
  cls: StudentClass;
  variant?: 'homeroom' | 'subject';  // default: 'subject'
}
```

Renders a Card showing:

- Class name (truncated)
- Grade name (small, muted)
- Teacher: "Mr Smith" / "Ms Patel" — first letter of first name + last name, truncated
- Classroom code (monospaced, tracking-wider, in a chip)
- "Homeroom" pill when `variant === 'homeroom'`

No API calls. No state. Pure props → JSX.

### 8. Frontend: JoinClassCard copy + response type

[`src/components/student/JoinClassCard.tsx`](src/components/student/JoinClassCard.tsx) — copy only:

- Helper text under the input changes from "Joining a new class will replace your current homeroom." to "Homeroom codes replace your current homeroom. Subject-class codes add to your classes."
- **No toast logic change needed.** The existing code already suppresses the "moved from previous class" suffix when `previousClassId` is `null` ([JoinClassCard.tsx:26](src/components/student/JoinClassCard.tsx#L26)). Subject joins return `previousClassId: null`, so the toast naturally reads "Joined {name}". Homeroom joins still read "Joined {name} (you have been moved out of your previous class)" when there was a previous homeroom.

[`src/hooks/useJoinClass.ts`](src/hooks/useJoinClass.ts) — extend `JoinClassResult` with `kind: 'homeroom' | 'subject'`. Not consumed yet, but exposes the distinction to future callers without another roundtrip.

### 9. Frontend: navigation entry

Add to `STUDENT_NAV` in [`src/lib/constants.ts`](src/lib/constants.ts), as the first entry in the phase-2 (module-gated) block, immediately before Timetable:

```ts
{ label: 'My Classes', href: '/student/classes', icon: Users, module: 'academic' },
```

Position rationale: classes are an academic concept (module-gated by `'academic'` like Timetable and Grades), and they are foundational — a student's class determines their timetable and grades — so Classes leads the academic sidebar block.

Also add a `STUDENT_CLASSES: '/student/classes'` entry in the `ROUTES` constant for type-safety in any later cross-references.

## Data flow

```
Student opens /student/classes
  └─ <StudentClassesPage> renders
       └─ useStudentClasses() fires GET /api/students/me/classes
            └─ Backend: resolve Student by userId → load Class for classId
                                                  → load Classes for subjectClassIds
                                                  → populate teacher + grade
                                                  → return { homeroom, subjectClasses }
       └─ Page renders homeroom card + ClassCard grid

Student joins a subject class on the Dashboard
  └─ JoinClassCard → useJoinClass → POST /api/academic/classes/join { code }
       └─ Backend looks up Class by classroomCode + schoolId
            └─ class.isHomeroom === false → push to subjectClassIds (idempotent)
            └─ returns { class, previousClassId: null, kind: 'subject' }
  └─ Toast: "Joined {name}"
  └─ Dashboard refresh fires (existing behaviour)
  └─ Next visit to /student/classes shows the new card
```

## Error handling

| Failure | Behaviour |
|---|---|
| Code matches no class | `404 'Invalid class code'` → toast on JoinClassCard |
| Code matches a class in another school | `404 'Invalid class code'` (same error — no existence leak) |
| Student already enrolled in subject class | Idempotent 200; toast still shows "Joined {name}" (acceptable; no double-add) |
| Student has no homeroom yet | `homeroom: null` in response; page shows empty state for homeroom section |
| Student record not found by userId | Return empty result `{ homeroom: null, subjectClasses: [] }`; page shows both empty states |
| Soft-deleted class still in subjectClassIds | Filtered out by `isDeleted: false`; quietly disappears from the list |
| Network failure on page load | Hook sets `loading: false`, `homeroom: null`, `subjectClasses: []`; page shows empty states. Toast surfaced via `extractErrorMessage` is acceptable for this read view |

## Testing

### Backend

- `Academic/__tests__/class.controller.test.ts` — join endpoint cases:
  - Homeroom code → student `classId` replaced, `previousClassId` returned
  - Subject-class code → student `subjectClassIds` extended
  - Subject-class code already in `subjectClassIds` → idempotent, same array length
  - Invalid code → 404
  - Code from another school → 404 (no leak)
- `Student/__tests__/me-classes.test.ts` (new) — `getStudentClasses` service:
  - Returns populated homeroom with teacher + grade
  - Returns subject classes sorted by name
  - Empty when neither homeroom nor subject classes exist
  - Filters out soft-deleted classes
- Teacher roster query: assert it returns students enrolled via `subjectClassIds`.

### Frontend

- `useStudentClasses` hook: returns expected shape from mocked `apiClient`; handles empty response.
- `/student/classes` page: renders empty state for both sections; renders homeroom card; renders subject grid with correct count.
- `JoinClassCard`: toast uses correct copy for each `kind`.

## Pre-merge checklist (per CLAUDE.md)

- No `apiClient` import in any page or component file
- No `any` types
- No `text-red-*`
- `subjectClassIds` defined in **both** Mongoose schema and `IStudent` interface
- All `Class.findOne` / `Class.find` calls in new code filter `schoolId` + `isDeleted: false`
- New page under 350 lines
- Empty state + loading state present for the new page

## Rollout

No feature flag. The schema change is additive and defaults to `[]`. The join endpoint behaviour change is keyed on `class.isHomeroom`, which is already populated for every existing class. Frontend page is gated by the `academic` module — schools without academic enabled will not see the nav entry.

## Future follow-ups (not in this feature)

1. **Lessons / homework / tests visibility from subject classes.** Most consuming services filter on `Student.classId` alone. Expanding to `[classId, ...subjectClassIds]` is a separate decision.
2. **`ClassEnrollment` collection.** If enrollment metadata becomes a requirement, migrate `subjectClassIds` into a join collection. One-time backfill.
3. **Leave action.** Allow a student to drop a subject class. Probably one DELETE endpoint plus a confirm dialog.
4. **Per-class detail page** `/student/classes/[classId]` — could surface classmates (if school policy allows), teacher contact, and a per-class homework feed.
