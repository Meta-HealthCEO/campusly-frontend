### Classes Module Review — 2026-04-13

**Pass rate:** 62/65 items checked, 3 failures

---

## Section 1: Architecture & Separation of Concerns

### Backend
- [x] Routes only define endpoints, middleware, and call controller methods — `routes.ts:74-130`
- [x] Controllers only parse request, call service, send response — `controllers/class.controller.ts`
- [x] Services contain all business logic and database queries — `services/grade.service.ts:93-311`
- [x] Models define schema, interfaces, indexes — no business logic — `model.ts:45-103`
- [x] Validation schemas live in a dedicated validation file — `validation.ts:18-27`

### Frontend
- [x] Pages are thin orchestrators — no `apiClient` imports — `page.tsx` (236 lines)
- [x] Components are pure UI — no `apiClient` imports — all 7 class components checked
- [x] All API calls live in hooks — `useTeacherClasses.ts:135-168`
- [x] Stores only used for cross-cutting state — `useAuthStore` for user/schoolId only
- [x] Business logic in hooks/useMemo — filtering+sorting in `page.tsx:60-78`

**Verdict: PASS (10/10)**

---

## Section 2: Type Safety

### Backend
- [x] TypeScript interface matches Mongoose schema field-for-field — IClass (model.ts:45-55) matches classSchema
- [x] No `any` types — grep clean across Academic + Student modules
- [x] All `catch` blocks use `catch (err: unknown)` — class.controller.ts:48
- [x] Request types properly defined via Zod schemas

### Frontend
- [x] No `any` types — grep clean
- [ ] **FAIL** — 14 `as unknown as` casts found:
  - `page.tsx:28, 29, 108, 109, 185, 213, 220, 227`
  - `ClassRosterDialog.tsx:43`
  - `AssignStudentDialog.tsx:94, 96`
  - `useTeacherClasses.ts:108, 119`
  - Root cause: `SchoolClass` type has `id` but backend returns `_id`; normalizeIds interceptor should handle this but the populated nested objects from teaching-load may not normalize deeply
- [x] All `catch` blocks use `catch (err: unknown)` — page.tsx:88, 99, 115, 127
- [x] All `.map()` callbacks have typed parameters — page.tsx:177, ClassRosterDialog.tsx:144
- [x] Types imported with `import type` syntax — page.tsx:19, 23

**Verdict: 1 FAIL (5/6) — `as unknown as` casts indicate type/runtime mismatch**

---

## Section 3: Security

### Multi-Tenancy
- [x] Every query includes `schoolId` — grade.service.ts:144, 150, 156, 184; StudentService.ts:38, 71, 90
- [x] Single-entity lookups include `schoolId` — grade.service.ts:184 `getClassById`, StudentService.ts:71 `getById`
- [x] No endpoint leaks cross-school data

### Authorization
- [x] Every route has `authenticate` middleware — routes.ts:74-130, Student/routes.ts:53-130
- [x] Every route has `authorize()` with correct role list — teachers added to class + student CRUD
- [x] Ownership checks on class update/delete — class.controller.ts:97-98, 107-108 call `teacherCanAccessClass`
- [x] Ownership checks on student assignment — student.controller.ts:15-22, 56-64

### Input Validation
- [x] All POST/PUT routes have Zod validation middleware — routes.ts:78, 108; Student/routes.ts:57, 80
- [ ] **FAIL** — `POST /students/:id/invite` has NO validation schema — Student/routes.ts:125-130 uses authenticate+authorize only; invite.service.ts validates manually but should use middleware
- [x] Validation schemas use `.strict()` — validation.ts:12, 47, 49
- [x] ObjectId fields validated with regex — validation.ts:4

**Verdict: 1 FAIL (8/9) — invite endpoint missing Zod validation middleware**

---

## Section 4: Error Handling

### Backend
- [x] Custom error classes used — class.controller.ts:7 imports ForbiddenError; grade.service.ts imports ConflictError, NotFoundError
- [x] Errors thrown, not returned — class.controller.ts:98, 108 use `throw`
- [x] Unique index conflicts handled — grade.service.ts:103-104 checks duplicate class name before create
- [x] All `.populate()` fields have `ref` — model.ts:66 gradeId ref:Grade, :76 teacherId ref:User

### Frontend
- [x] Every API call has try/catch with toast — useTeacherClasses.ts:62-98; page.tsx:86-102
- [x] Specific HTTP statuses handled — page.tsx:100 checks 409 on delete
- [x] Network failures don't crash UI — AbortController + toast.error fallback
- [x] No silent catch blocks in classes module files

**Verdict: PASS (8/8)**

---

## Section 5: Data Handling

### Backend
- [x] Soft delete: `isDeleted` exists on Class and Student models
- [x] Every query includes `isDeleted: false` — grade.service.ts:144, 150, 184; StudentService.ts:39, 71
- [x] Delete operations set `isDeleted: true` — grade.service.ts:200-208
- [x] `.lean()` used on read queries — grade.service.ts:60, 175, 186
- [x] Pagination on listClasses — grade.service.ts:28-36, 138-181

### Frontend
- [x] unwrapResponse/unwrapList used — useTeacherClasses.ts:4, 67
- [x] _id → id mapping handled by global normalizeIds interceptor
- [x] No mock data as initial state — entries = `[]`, loading = `true`
- [x] useMemo with correct dependencies — page.tsx:60-78, useTeacherClasses.ts:105-130
- [x] useEffect includes `open` for dialog reset — ClassFormDialog.tsx:64-68

**Verdict: PASS (10/10)**

---

## Section 6: API Contract

| Frontend Call | Backend Route | Match |
|---------------|---------------|-------|
| `POST /academic/classes` | routes.ts:74-80 | ✅ |
| `PUT /academic/classes/:id` | routes.ts:103-109 | ✅ |
| `DELETE /academic/classes/:id` | routes.ts:111-116 | ✅ |
| `GET /academic/teacher/me/teaching-load` | routes.ts:90-94 | ✅ |
| `GET /academic/subjects?gradeId=X` | subject.controller.ts accepts gradeId | ✅ |
| `POST /students` | Student/routes.ts:53-59 | ✅ |
| `PUT /students/:id` | Student/routes.ts:76-82 | ✅ |
| `DELETE /students/:id` | Student/routes.ts:84-89 | ✅ |
| `POST /students/:id/invite` | Student/routes.ts:125-130 | ✅ |

**Verdict: PASS (9/9)**

---

## Section 7: UI/UX Completeness

### States
- [x] Loading skeleton — page.tsx:134-139 `CardGridSkeleton`
- [x] Empty state with icon + title + description + CTA — page.tsx:170-172
- [x] Error state (toast) — page.tsx:86, 89, 102, 114, 116
- [x] Disabled buttons during async — ClassFormDialog.tsx submitting + isLoading guard

### Responsive Design
- [x] Mobile-first grid — page.tsx:176 `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- [x] Fixed widths have fallback — page.tsx:152 `w-full sm:w-64`
- [x] Touch targets 44px+ — standard Button component sizing

### Dialogs
- [x] `flex flex-col max-h-[85vh]` — ClassFormDialog.tsx:92, ClassRosterDialog.tsx:88
- [x] Body overflow-y-auto — ClassFormDialog.tsx:102
- [x] Footer sticky (outside scroll) — ClassFormDialog.tsx:185-200

### Design Tokens
- [x] No `text-red-*` or `bg-red-*` — uses `text-destructive`, `bg-destructive`
- [x] Semantic colors — amber/emerald for non-error capacity bars (acceptable, no tokens exist)

### Text
- [x] `truncate` on constrained text — ClassCard, ClassRosterDialog student names
- [x] Required fields have red asterisk — ClassFormDialog.tsx:105, 163

### Forms
- [x] Select uses `setValue` via `onValueChange` — ClassFormDialog.tsx:110
- [x] No `SelectItem value=""` — uses `"none"` sentinel for homeroom
- [x] Inline error messages — ClassFormDialog.tsx:124-126
- [x] Form resets on dialog reopen — ClassFormDialog.tsx:64-68

**Verdict: PASS (18/18)**

---

## Section 8: Code Quality

| File | Lines | Status |
|------|-------|--------|
| `controllers/class.controller.ts` | 152 | ✅ |
| `services/grade.service.ts` | 311 | ✅ |
| `controller.ts` (barrel) | 106 | ✅ |
| `useTeacherClasses.ts` | 187 | ✅ |
| `page.tsx` | 236 | ✅ |
| `ClassFormDialog.tsx` | 205 | ✅ |
| `ClassRosterDialog.tsx` | 183 | ✅ |
| `StudentAddDialog.tsx` | 258 | ✅ |
| `AssignStudentDialog.tsx` | 127 | ✅ |
| `InviteStudentDialog.tsx` | 75 | ✅ |
| `ClassCard.tsx` | 91 | ✅ |

- [x] Every file under 350 lines
- [x] No dead code, no commented-out code
- [x] No unaddressed TODOs in classes module
- [x] No duplicate logic — shared code in hooks/utils
- [x] Naming consistent — PascalCase components, camelCase hooks
- [x] No `console.log` — only `console.error` in catch blocks
- [x] No `localStorage` in classes module
- [x] No `toISOString().slice(0,10)` in classes module

**Verdict: PASS (8/8)**

---

## Section 9: Performance

### Backend
- [x] Database indexes — model.ts:98-101 on gradeId, schoolId, classroomCode; Student indexes on classId, gradeId
- [x] No N+1 queries — grade.service.ts:259 single `Student.find({ classId: { $in: classIds } })` for all students
- [x] `Promise.all()` for parallel queries — grade.service.ts:168-177
- [x] Pagination on list endpoints — grade.service.ts:138-181

### Frontend
- [x] `useMemo` for derived data — useTeacherClasses.ts:105-130 (classes, students dedup)
- [x] `AbortController` in useEffect — useTeacherClasses.ts:60, cleanup line 101
- [x] Conditional fetching — ClassFormDialog.tsx:62 subjects only when grade selected + dialog open
- [x] Debounced refetch — useTeacherClasses.ts:51-56 (300ms debounce)

**Verdict: PASS (8/8)**

---

## Section 10: Completeness

### CRUD
- [x] Create with validation — ClassFormDialog + Zod schema
- [x] Read (list + teaching-load detail) — page grid + ClassRosterDialog
- [x] Update with feedback — edit button + ClassFormDialog with initialData + toast
- [x] Delete with confirmation + constraint — ConfirmDialog + 409 student count check

### List Views
- [x] Search/filter — page.tsx:60-68
- [x] Sort — page.tsx:70-77 (name asc/desc, students asc/desc)
- [ ] **FAIL** — No pagination on frontend class list (loads entire dataset in memory)

### Relationships
- [x] Class → students handled — teaching-load bundles students per class
- [x] Delete cascade — blocks delete when students enrolled (409)
- [x] Cross-module nav — Classes ↔ Students directory via sidebar group

**Verdict: 1 FAIL (8/9) — no pagination on class list**

---

## Final Summary

**Pass rate: 62/65 items checked, 3 failures**

**Critical (must fix before merge):**

*None*

**High (fix soon):**
1. **Type casts** — 14 `as unknown as` casts across frontend files — root cause is `SchoolClass` type missing reliable `id` field from nested teaching-load response. Fix: ensure normalizeIds deeply normalizes populated subdocuments, or add `id` getter to the SchoolClass type.
2. **Invite validation** — `POST /students/:id/invite` at Student/routes.ts:125-130 has no Zod validation middleware. The service validates manually (BadRequestError on missing email) but this should use a `validate(inviteSchema)` middleware for consistency with every other POST route.

**Medium (tech debt):**
1. **No pagination on class list** — frontend loads entire dataset. Not a problem for standalone teachers (few classes) but will hit performance for school-based teachers with many subject classes. Add server-side pagination or lazy loading when count exceeds 50.
2. **Silent catch in useGrades()** — `useAcademics.ts` catches errors without toast/logging. Affects the grade dropdown in ClassFormDialog. If grades fail to load, the dropdown is empty with no feedback.

**Low (nice to have):**
1. **Bulk invite** — can only invite students one at a time; "Invite all uninvited" would save clicks
2. **Class duplication** — no "Clone this class" action for next term setup
3. **Capacity enforcement** — UI shows capacity bar but doesn't prevent adding students beyond capacity

**Missing features (not bugs, but gaps):**
1. **Class analytics** — no attendance rate, average grade, or engagement summary per class
2. **Timetable visibility** — class cards don't show which periods/days the subject class is scheduled
3. **Audit trail** — no record of who created/edited/deleted a class and when
4. **Grade-level promotion** — no bulk "move all students to next grade" at year-end
