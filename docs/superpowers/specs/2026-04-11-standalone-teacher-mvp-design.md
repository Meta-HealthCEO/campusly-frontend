# Standalone Teacher MVP — Design Spec

**Status:** Draft
**Date:** 2026-04-11
**Author:** Shaun + Claude

## 1. Goal

Enable a teacher to sign up to Campusly standalone (without a school, without an admin), onboard in under 5 minutes, and run their classes end-to-end using the existing teacher portal. This is the MVP launch path for getting teachers onboarded to Campusly before schools adopt it at an organizational level.

Success criteria:
- A new teacher can go from landing page → set up first class → add students → run attendance → record grades → assign homework → plan curriculum in a single sitting.
- Every screen under `/teacher/*` loads and renders a useful state for a brand-new standalone teacher with zero pre-seeded data.
- Zero cross-tenant data leakage between standalone teachers.

## 2. Core architectural decision

A standalone teacher is modeled as a **one-person school** under the hood: a `School` record with a single `User` holding both `teacher` and `school_admin` roles.

**Why this model:**
- Every existing school-scoped query, authorization check, and data model keeps working unchanged. The `authorize('school_admin')` middleware already in place on every admin endpoint just works for standalone teachers because they hold that role.
- Tenant isolation is guaranteed by the existing `schoolId` scoping rules in `CLAUDE.md`. No new multi-tenancy axis is introduced.
- Migration to a real school later is a data-move operation, not a model change.

**Alternatives considered and rejected:**
- A separate `TeacherWorkspace` model with dual scoping on every query — too large a blast radius; every query, every model, every endpoint in the backend would need dual-scoping logic.
- A new `standalone_teacher` role with relaxed permissions on existing admin endpoints — same blast radius, adds a new enum value everywhere.
- Ownership checks (`ownerTeacherId` fields) on every shareable model — authorization becomes an OR everywhere, easy to miss a check and leak data.

## 3. Key product decisions

| Decision | Choice | Rationale |
|---|---|---|
| Multi-tenancy model | Auto-create a personal school per standalone teacher (`plan: 'standalone'`) | Reuses existing school scoping; zero new authorization logic |
| Student model | Roster-only by default, with optional portal invite | Teacher onboarding stays fast; student/parent logins are optional and opt-in |
| MVP scope | Full teacher portal (all sidebar modules including full curriculum subsystem) | Teachers need curriculum as a headline feature; thin MVP would cut the main value prop |
| Role model | Dual role `['teacher', 'school_admin']` | Existing `authorize('school_admin')` middleware just works; no backend authorization rewrites |
| Cross-teacher sharing | **Phase 2** — community groups with copy-on-import (C2) | Preserves tenant isolation; no MVP schema changes required to make this possible later |

## 4. What is NOT in scope for MVP

- Billing and pricing plans (free during beta)
- Migrating a standalone teacher into a real school later
- Parent and student portal UX changes (existing invite mechanism is sufficient)
- Multi-teacher collaboration within a single personal school (one teacher = one school in MVP)
- Admin portal changes for real schools
- Cross-teacher resource sharing (Phase 2 — see Section 10)

## 5. Data model changes

### 5.1 `Student` — `userId` becomes optional

- `userId: { type: ObjectId, ref: 'User', required: false }` (was required)
- `IStudent.userId?: Types.ObjectId`
- `admissionNumber` remains required and unique per school; becomes the primary identifier for roster-only students.
- Every controller and service that dereferences `student.userId` or populates `student.user` must add a nullish check. Full audit required — grep for `student.userId`, `.populate('userId')`, `.populate('user')` across the backend.

### 5.2 `User` — new optional field

- `isStandaloneTeacher: boolean` (default `false`). Used for analytics and UI gating. **Not** an authorization mechanism.
- `onboardingDismissed: boolean` (default `false`). Wizard uses this to suppress auto-redirect after user dismisses.
- Roles array unchanged; already supports multiple roles.

### 5.3 `School` — new fields

- `plan: 'standalone' | 'school'` (default `'school'`). Standalone personal schools use `'standalone'`.
- `ownerUserId: ObjectId` (ref: User, optional). The founding user of a standalone school. Lets us find "the teacher" without a query.

### 5.4 No other schema changes

Classes, Subjects, Grades, Curriculum, Attendance, Homework, QuestionBank, ContentLibrary, TeacherWorkbench — all unchanged.

### 5.5 Data migration

None required. All changes are additive or relaxations:
- `Student.userId` going from required to optional is backward-compatible with all existing documents.
- `plan` defaults to `'school'` for all existing School records.
- `isStandaloneTeacher` and `onboardingDismissed` default to `false`.

## 6. Backend changes

### 6.1 New endpoints

**Signup & onboarding**
- `POST /auth/signup/standalone-teacher`
  - Body: `{ firstName, lastName, email, password, country, subjects?: string[] }`
  - Transactionally creates: `School` (`plan: 'standalone'`, `name` defaulting to `"<FirstName>'s Classroom"`), `User` (roles `['teacher', 'school_admin']`, `isStandaloneTeacher: true`, linked to the new school), default academic year + terms, default grades list seeded per country, optional Subject records.
  - Wraps in a MongoDB session for atomicity. Any failure rolls back all inserts.
  - Returns JWT.
  - Rejects duplicate emails with 409 `{ error: 'EMAIL_EXISTS' }`.
- `GET /auth/onboarding-status`
  - Returns `{ hasClass: boolean, hasStudent: boolean, hasFramework: boolean, dismissed: boolean }`.
  - Used by the wizard to resume at the first incomplete step.
- `POST /auth/onboarding-dismiss`
  - Sets `user.onboardingDismissed = true`.

**Student invite (promotion from roster-only → portal user)**
- `POST /students/:id/invite`
  - Body: `{ inviteStudent?: boolean, parentEmail?: string }`
  - If `inviteStudent` and `student.email` set, creates a `User` for the student and backfills `Student.userId`. If already set, re-sends the invite.
  - If `parentEmail` set, creates a `Parent` + `User` for the parent (reuses existing parent invite plumbing).
  - Sends magic-link invite emails via the same transport used for password reset.

### 6.2 Reused existing endpoints

Classes CRUD, Students CRUD, Subjects CRUD, Grades CRUD, Curriculum plan/framework/benchmark CRUD — all existing endpoints that already allow `school_admin`. Standalone teachers call them unchanged because they hold that role.

### 6.3 Authorization audit

Because standalone teachers hold both `teacher` and `school_admin` roles, most middleware just works. Three checks to verify:

1. Any route using `authorize('school_admin')` without `teacher` — verify nothing uses `role !== 'teacher'` as a negative check.
2. Any code that fetches the current user's school via `user.teacherProfile.schoolId` or similar indirect path — a standalone teacher's `schoolId` is on the User directly. Grep for this pattern.
3. Admin-portal-only endpoints (future multi-school reporting, deep school settings) must remain restricted. Add `rejectStandalonePlan` middleware that returns 403 if `school.plan === 'standalone'`. Applies to nothing critical in MVP; defense in depth for future features.

### 6.4 Multi-tenancy re-verification

The existing `CLAUDE.md` known-pitfalls doc requires every query — including single-entity lookups — to filter by `schoolId`. Standalone teachers make this rule more load-bearing: any missed check leaks one teacher's classroom to another. The Track 2 audit (Section 8) explicitly re-verifies this for every endpoint a standalone teacher touches.

### 6.5 `Student.userId` nullish handling

Places expected to need null checks (verified during Track 2 audit):
- **Attendance** — keyed by `studentId`, should be fine.
- **Grades / marks** — keyed by `studentId`, should be fine.
- **Homework submissions** — require a User login. Roster-only students show "not invited" instead of a submission row; no submission writes attempted.
- **Messaging** — roster-only students have no inbox; features targeting students must check `userId` presence.
- **Reports / student profile** — must render without `user.email`, `user.lastLogin`.
- **Auth** — roster-only students can't log in (correct).

This list is the starting checklist for the Student model audit; full backend grep during implementation.

## 7. Frontend changes

### 7.1 Signup & onboarding

**New pages:**
- `src/app/signup/teacher/page.tsx` — standalone signup form (name, email, password, country, optional subjects multi-select). Calls `POST /auth/signup/standalone-teacher`, stores JWT, redirects to `/teacher/onboarding`.
- `src/app/(dashboard)/teacher/onboarding/page.tsx` — 5-step wizard:
  1. **Welcome & subjects** — confirm subjects; creates Subject records.
  2. **Curriculum framework** (optional) — per-subject framework pick (CAPS / Cambridge / IB / Custom / Skip); seeds `CurriculumStructure` using existing `service-frameworks.ts`.
  3. **Create first class** — name, grade, capacity. Blocking; no skip.
  4. **Add students** — two tabs: *Type a list* (textarea, one per line) and *CSV paste* (header-row detection). Each row becomes a `POST /students` with `classId` set and `userId: null`. Parallelized with concurrency 5.
  5. **Done** — three deep-link cards (Attendance, Homework, Curriculum) with new class pre-selected. Sets `onboardingDismissed = true`.

**Skip & resume semantics:**
- Every step except step 3 has "Skip for now".
- Completion derived from backend state via `GET /auth/onboarding-status`. Reloading resumes at the first incomplete step; idempotent across crashes and refreshes.
- Auto-redirect from `/teacher` dashboard runs once per session if `{ hasClass: false, dismissed: false }`.
- "Re-run setup" link in settings re-enters the wizard.

**Existing `AuthCard`, `AuthLayout`, `PasswordInput` reused.** No new auth primitives.

### 7.2 Classes — full CRUD rewrite

Rewrite `src/app/(dashboard)/teacher/classes/page.tsx` (currently near the 350-line limit). Extract into:

- `src/components/classes/ClassCard.tsx` — single card (grade + class name, student count, capacity bar, quick-action buttons: Attendance, Grades, Homework, Timetable, Edit, Delete). Fixes the duplicate-grade-name bug from the audit.
- `src/components/classes/ClassFormDialog.tsx` — create/edit dialog. Fields: name, grade (select with inline "+ New grade"), capacity, home teacher (auto-set, disabled for standalone), subjects taught (multi-select). Uses existing Dialog flex-col pattern per `CLAUDE.md`.
- `src/components/classes/ClassRosterDialog.tsx` — student roster (extracted from current dialog). Adds:
  - "Add students" button → `StudentAddDialog`.
  - "Remove from class" per row (confirmation).
  - "Invite to portal" per row; shows "Invited" badge if `userId` set.
  - Join-code card moved to prominent position.
- `src/components/classes/StudentAddDialog.tsx` — two tabs: *Manual entry* (first/last/admission#/email form with add-another) and *CSV paste* (textarea + column mapper). Calls `POST /students` with `classId` pre-filled.
- `src/components/shared/ClassroomCodeCard.tsx` — existing component, unchanged.

**Hook changes:**
- `src/hooks/useTeacherClasses.ts` — add mutations `createClass`, `updateClass`, `deleteClass`, `addStudent`, `addStudentsBulk`, `removeStudentFromClass`, `inviteStudent`. All call existing admin endpoints. Hook is the single place these API paths live (per `CLAUDE.md` separation-of-concerns rule). Optimistic updates + toast feedback.

**Audit bugs fixed during rewrite:**
- Duplicate grade name on card title/subtitle (current code renders `{grade} {class}` as title AND `{grade}` again as subtitle).
- Hardcoded `bg-amber-500` / `bg-emerald-500` replaced with design tokens.
- Error handling when one of the two parallel fetches fails (`/academic/classes`, `/students`).
- Missing action links from each class card to the per-class flows.

### 7.3 Students — new cross-class directory page

New route `/teacher/students` with a flat student directory. Columns: name, admission #, class, parent contact, portal status (Invited / Not invited), actions (view, edit, invite, delete). Uses existing `DataTable`. Filters: class, portal status, search.

Rationale: teachers managing multiple classes want a flat view. Also the canonical place for bulk CSV imports that span classes.

Sidebar entry: "Students" added under "Classes".

### 7.4 Curriculum gap audit

The `/teacher/curriculum/*` subsystem is extensive. Track 2 work: walk every sub-page and verify it works for a teacher who is the only user in their school and started from nothing. Expected gaps:

- **`/teacher/curriculum/page.tsx`** — probably assumes a framework was seeded. Needs "No framework yet → pick one" empty state reusing wizard step 2.
- **`/teacher/workbench/curriculum`** — depends on `CurriculumStructure` existing. Same empty state.
- **`/teacher/curriculum/textbooks`** — textbooks usually admin-uploaded. MVP decision: show empty state + "Create custom textbook" button (reuses existing custom-textbook creation if it exists); marketplace is Phase 2.
- **`/teacher/curriculum/questions`, `/papers`, `/mark-papers`, `/assessments`, `/ai-studio`, `/content`** — already teacher-owned; expected to work. Verify by end-to-end walk.

Pre-commit to which sub-pages need fixes is deferred to the plan — each becomes a discrete task.

### 7.5 Gap audit of other teacher portal screens

For each of Dashboard, Attendance, Grades, Homework, Timetable, Discipline, Incidents, Messages, Notice Board, Learning, Observations, Reports, AI Tools:

1. Does it load with zero pre-seeded data (no class, no students, no subjects)?
2. Does it render a useful empty state, or crash / show undefined?
3. Does any API call require a role the teacher doesn't have?
4. Does any flow assume `student.userId` exists?
5. Does any flow link to an admin-portal URL? (Must be replaced or hidden.)

Each finding is a discrete fix task in the implementation plan.

### 7.6 Navigation & gating

- **Sidebar** — add "Students" entry. Hide `/admin/*` links when `school.plan === 'standalone'` via a new `useIsStandalone()` hook wrapping `useAuthStore`.
- **Route guards** — any teacher page requiring a class to exist shows an empty state with "Create your first class" CTA that opens `ClassFormDialog` directly. No bouncing.
- **Admin portal access** — standalone teachers hitting `/admin/*` are redirected to `/teacher` with a toast (soft gate). Backend `rejectStandalonePlan` middleware is the hard gate.
- **Settings** — minimal "School settings" sub-page for standalone teachers: rename school (`"<FirstName>'s Classroom"` → whatever), set currency, manage academic year. Reuses existing admin school-settings components where possible.

### 7.7 Pattern compliance

All new components comply with `CLAUDE.md` rules:
- No `apiClient` imports in pages or components (hooks only).
- No `any` types.
- No hardcoded red — use `text-destructive`.
- Mobile-first responsive grids.
- Dialogs use flex-col + sticky footer.
- Files under 350 lines.
- Empty + loading states on every data view.
- Reuse existing shared primitives: `PageHeader`, `DataTable`, `EmptyState`, `LoadingSpinner`, `ConfirmDialog`, `StatCard`.

### 7.8 New and changed files

**New (frontend):**
- `src/app/signup/teacher/page.tsx`
- `src/app/(dashboard)/teacher/onboarding/page.tsx` + 5 step components
- `src/app/(dashboard)/teacher/students/page.tsx`
- `src/components/classes/ClassCard.tsx`
- `src/components/classes/ClassFormDialog.tsx`
- `src/components/classes/ClassRosterDialog.tsx`
- `src/components/classes/StudentAddDialog.tsx`
- `src/components/students/StudentFormDialog.tsx`
- `src/hooks/useStandaloneSignup.ts`
- `src/hooks/useOnboarding.ts`
- `src/hooks/useTeacherStudents.ts`
- `src/hooks/useIsStandalone.ts`

**Changed (frontend):**
- `src/app/(dashboard)/teacher/classes/page.tsx` — rewrite
- `src/hooks/useTeacherClasses.ts` — add mutations
- `src/components/layout/Sidebar.tsx` — new entry + gating
- `src/app/login/page.tsx` — link to `/signup/teacher`
- Every `/teacher/curriculum/*` page flagged in audit — empty states
- Every other teacher portal screen flagged in audit — empty states

**New (backend):**
- `src/modules/auth/signup-standalone.ts` — new endpoint + service
- `src/modules/students/invite.ts` — new endpoint
- `src/middleware/rejectStandalonePlan.ts` — new guard

**Changed (backend):**
- `src/modules/schools/model.ts` — add `plan`, `ownerUserId`
- `src/modules/students/model.ts` — `userId` → optional
- `src/modules/users/model.ts` — add `isStandaloneTeacher`, `onboardingDismissed`
- Any controller dereferencing `student.userId` without a null check — audit + fix.

## 8. Implementation tracks

**Track 1 — Foundation (blocking for MVP launch):**
1. Backend: Student.userId optional, School plan field, User fields, signup endpoint, onboarding-status endpoint, invite endpoint.
2. Frontend: signup page, onboarding wizard, Classes CRUD rewrite, Students directory, navigation gating.

**Track 2 — Gap audit (parallel, also blocking for MVP):**
1. Walk every teacher portal screen with the zero-data test.
2. Fix empty states and crashes.
3. Re-verify `schoolId` scoping on every endpoint a standalone teacher touches.
4. Fix all `student.userId` nullish access points.

Both tracks must complete before launch. Track 1 unblocks Track 2 by making it possible to actually sign up and test.

## 9. Error handling

- **Signup transaction failure** — MongoDB session rollback. Generic frontend error; real error server-side.
- **Duplicate email at signup** — 409 `{ error: 'EMAIL_EXISTS' }` → inline field error with "Sign in instead" link.
- **Partial onboarding failures** — each step commits independently. Failed rows in step 4 retain successful inserts; failures shown with inline retry. No rollback of successful inserts.
- **Network failure mid-step** — steps are idempotent via backend state derivation; retry re-runs cleanly.
- **`student.userId` nullish bugs** — audit finds every unguarded access; fix pattern is null check + placeholder render ("—" / "Not invited") + never crash.
- **Admin portal access attempt** — frontend sidebar hides links; route guard redirects `/admin/*` → `/teacher` with info toast; backend `rejectStandalonePlan` returns 403 as defense in depth.
- **Class deletion with students** — verify existing `DELETE /academic/classes/:id` cascade behavior; decision between "null out classId on students" vs "block delete if enrolled" is a plan task.
- **Student deletion** — soft delete; preserved for grade and attendance history integrity.

## 10. Phase 2 preview — Cross-teacher sharing

Community groups with copy-on-import catalog (C2 model):
- Teachers join **public** (directory-listed) or **private** (invite-only) groups.
- Members **publish** curriculum resources (content library items, question bank questions, generated papers, homework templates, curriculum plans / pacing templates) to a group catalog.
- Other members **browse** the catalog and **import** — which deep-copies the record into their own school.
- Imported copies are independent; editing doesn't affect the original. Natural adaptation model matches how teachers actually use shared materials.
- **New models (Phase 2 only):** `Group`, `GroupMembership`, `GroupCatalogEntry`.
- **Tenant isolation preserved** — all queries on the underlying resource types stay school-scoped. Group membership only gates who can *see catalog entries*, not who can query underlying records.
- **No MVP schema changes required** to make this possible later. Every MVP record is already a clean school-scoped record ready to be deep-copied.

What is **not** shareable (private forever): student rosters, attendance, grades, messages, incidents, discipline records.

## 11. Testing strategy

### 11.1 Backend tests

- **Unit — signup service:** creates School + User with dual roles + default terms + default grades in a transaction; rolls back on failure; rejects duplicate emails.
- **Unit — invite-student service:** creates User, backfills `Student.userId`, sends email, handles already-invited case.
- **Integration — full standalone flow:** signup → create class → add roster-only student → invite student → promote to user → create attendance record. All on a single personal school.
- **Integration — tenant isolation:** two standalone teachers; neither can read the other's classes, students, grades, homework, curriculum, or any other resource. Runs against every CRUD endpoint a standalone teacher touches.
- **Regression — `Student.userId` nullability:** every read endpoint that touches students returns a valid response when `userId` is null.

### 11.2 Frontend tests

- **E2E — onboarding happy path:** signup → full wizard → dashboard.
- **E2E — onboarding resume:** complete step 1, reload, verify resume at step 2; dismiss, verify no auto-redirect; re-run from settings.
- **E2E — classes CRUD:** create, edit, delete; add student manually; bulk-add via CSV paste; remove student; invite student.
- **E2E — gap-audit regression:** one minimal test per flagged screen that loads it as a brand-new standalone teacher with zero data and asserts no crash + useful empty state.

### 11.3 Manual QA (pre-launch checklist)

- Every route under `/teacher/*` loads cleanly for a brand-new standalone teacher.
- Every screen shows a useful empty state or a clear "Set this up" CTA.
- No admin-portal links are visible to standalone teachers.
- Signup + full onboarding + create class + add students completes in under 5 minutes cold-start.
- Dual-role authorization works: teacher can hit both teacher-scoped and school-admin-scoped endpoints for their own school, but not for any other school.

## 12. Open questions (non-blocking)

- **Country-specific defaults** — initial grade list, currency, date format per country picked at signup. Default to SA (CAPS grades, ZAR, DD/MM/YYYY) when unknown.
- **Email provider for invites** — reuse existing password-reset transport; no new infra.
- **Textbook flow for standalone teachers** — MVP shows empty state + "Create custom textbook" path; marketplace deferred to Phase 2.
- **Class deletion cascade behavior** — verify existing `DELETE /academic/classes/:id` handling; choose between null-classId-on-students or block-if-enrolled during implementation.
