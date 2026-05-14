# Student Onboarding Gaps — Design

**Status:** Design approved, ready for implementation plan
**Author:** Brainstormed with Shaun, 2026-05-13
**Related modules:** Auth, Student, Email
**Spec context:** Follow-up to [Student Portal Phase 1 design](2026-05-13-student-portal-design.md) — fills the gaps surfaced during the post-build investigation of the teacher → student onboarding flow.

---

## Goal

Close the four gaps in the current student onboarding flow so that every student added by a teacher gets a usable, recoverable credential path:

1. **No silent failures** — every student created gets a working login, regardless of whether they have an email address.
2. **Temp passwords are not optional to change** — first login forces a password change.
3. **No false promises** — the WhatsApp delivery placeholder is removed (rebuilt in Phase 2 with school subscriptions).
4. **Credentials are recoverable** — if a teacher loses the temp password, they can regenerate without going through the parent invite flow.

---

## Constraints

- Reuses existing `EmailService` (Resend), bcrypt password hashing, JWT auth, Zod v4 validation.
- All new backend code follows the CLAUDE.md landmines: every `findOne` includes `schoolId` + `isDeleted: false`; Zod from `'zod/v4'`.
- Frontend separation: hooks own all `apiClient` calls; pages/components do zero API I/O.
- Files under 350 lines.

---

## Section 1 — Two-path student creation (Q1 = B)

The current `StudentAddDialog` silently creates students without working credentials when no email is provided. The fix: every student gets a usable credential via one of two explicit delivery paths, chosen by the teacher at creation time.

### UX

`StudentAddDialog` gets a delivery-method toggle at the top of the form:

```
[ Email invite ] [ Printable slip ]
```

**Email-invite mode** (current flow, hardened):
- Email field becomes **required** at form + backend.
- Backend creates User with the supplied email + temp password.
- `EmailService.sendStudentPortalCredentials()` sends as today.
- Credentials panel shows status: "Email sent to `<email>`" or "Email failed — copy credentials manually".

**Printable-slip mode** (new):
- Email field becomes optional and labelled "Parent email (optional)".
- Backend creates User with a **synthetic login email** generated server-side:
  - Format: `firstname.lastname.NNNN@students.campusly.local` (NNNN = admission number)
  - Sanitisation: lowercase, replace non-`[a-z0-9]` with `-`, collapse repeats, fall back to admission-only if sanitised name is empty.
- No email sent.
- Credentials panel shows synthetic login email + temp password + **"Download printable slip"** button → `/teacher/students/[id]/credentials/print` (printable HTML page with school logo, student name, login URL, login email, temp password, "change on first login" note).

### Backend changes

- `createStudentSchema` adds `deliveryMethod: 'email' | 'slip'` (required).
- `StudentService.create()` branches on `deliveryMethod`:
  - `email` mode requires `email` in the payload (Zod refinement).
  - `slip` mode generates the synthetic email server-side.
- The current "synthetic fallback when blank" logic is **removed** — every student gets either a real email or an explicit slip synthetic. No silent failure path remains.

### Frontend changes

- Toggle + conditional email field in `StudentAddDialog`.
- New printable page route + minimal print stylesheet (`@media print`).
- Bulk CSV import: default delivery-method selector at the top of the dialog; CSV rows can override with a `deliveryMethod` column.

---

## Section 2 — First-login password change gate (Q2 = C)

Hard gate: a student with a temp password cannot access any `/student/*` route until they change it.

### Schema change

Add to `User` model:

```ts
mustChangePassword: { type: Boolean, default: false }
```

Set to `true` whenever a temp password is assigned:
- `StudentService.create()` — both email and slip modes
- `StudentInviteService.inviteStudent()` — when generating credentials for a Roster-only student
- New regenerate endpoint (Section 4)

Cleared to `false` only via successful change-password call.

**Migration:** None required. Mongoose schema default handles new docs; existing docs read back `false` via the default when queried.

### Backend endpoint

```
POST /api/auth/change-password
Body: { currentPassword: string, newPassword: string }
Auth: required (JWT)
```

Validation:
- `currentPassword` matches user's stored hash (existing `comparePassword` method).
- `newPassword` meets the project's password rules (mirror existing `auth/register` / `auth/reset-password` validator, typically min length 8).
- `newPassword !== currentPassword`.

On success: bcrypt-hash and store new password, set `mustChangePassword: false`, return `{ success: true }`. JWT remains valid — no re-issue needed.

### Auth flow

- `/api/auth/me` and `/api/auth/login` responses include `mustChangePassword: boolean`.
- `useAuthStore.User` type gains `mustChangePassword: boolean`.

### Frontend gate

New component `<MustChangePasswordGate>` wraps student layout INSIDE `RoleGuard`:

```tsx
<RoleGuard role="student">
  <MustChangePasswordGate>
    {children}
  </MustChangePasswordGate>
</RoleGuard>
```

The gate:
1. Reads `useAuthStore().user.mustChangePassword`.
2. If `true` AND current path is not `/auth/change-password`, calls `router.replace('/auth/change-password')` and renders a loading spinner.
3. Otherwise renders children.

Result: the student literally cannot navigate to any student page until they change the password.

### Change-password page

`src/app/(auth)/change-password/page.tsx`:

- Heading: "Change your password"
- Sub: "You're using a temporary password. Please set a new one to continue."
- Fields: current password (temp), new password, confirm new password
- Client-side validation mirroring backend rules
- Submit → `POST /auth/change-password` → on success refresh `useAuthStore.user` (or call `/auth/me`) → navigate to `/student` (or the user's role-appropriate root)
- Error: form-level error + toast

### Edge cases

- **Login with `mustChangePassword: true`**: login succeeds (JWT + user returned), router lands on role root → student layout → gate intercepts → change-password page.
- **Direct URL hit** (`/student/lessons`): RoleGuard passes (role check) → gate intercepts → change-password page.
- **Credentials regenerated in another tab**: next `/auth/me` (token refresh or natural nav) returns `mustChangePassword: true` → gate kicks in on next route change.
- **Curl bypass with valid JWT**: client-side gate doesn't block API calls. Phase 1 acceptable — short window, temp password gets changed on next login. Phase 2 could add backend `requireFreshPassword` middleware.

---

## Section 3 — WhatsApp cleanup (Q3 = B)

Remove the false-promise placeholder from Phase 1. WhatsApp delivery rebuilt in Phase 2 with school subscriptions (per-school credentials, phone capture, template approval).

### Backend

`StudentService.create()` and `StudentInviteService.inviteStudent()` credentials return shape narrows to:

```ts
{
  loginEmail: string,
  tempPassword: string,
  emailSent: boolean,
  emailError?: string,
}
```

`whatsappSent` and `whatsappError` fields removed.

Leave a one-line comment near the email-send call:
```ts
// Phase 2: WhatsApp delivery (per-school WhatsApp credentials,
// phone capture, template approval). Removed from Phase 1.
```

### Frontend

- `StudentAddDialog.tsx` credentials panel: remove WhatsApp status line and conditional rendering.
- `InviteStudentDialog.tsx`: same trim.
- `src/types/students.ts` (or wherever `AddStudentResult` lives): drop WhatsApp fields from the credentials interface.

---

## Section 4 — Regenerate credentials from roster (Q4 = B)

Teacher can regenerate a student's temp password from the class roster when they've lost the original.

### Backend endpoint

```
POST /api/students/:id/regenerate-credentials
Auth: required, role: 'teacher' | 'school_admin' (existing capability checks)
Body: (empty)
```

`StudentService.regenerateCredentials(studentId, schoolId, callerUser)`:

1. Load Student with `schoolId` + `isDeleted: false`.
2. Load linked User. If no `userId` → return 400 "Student has no portal account — use the invite flow instead".
3. Generate fresh temp password (same `Campus-{random hex}` pattern).
4. Hash, write to User. Set `mustChangePassword: true`.
5. If User email is a real address (not a `@students.campusly.local` synthetic): re-send via `EmailService.sendStudentPortalCredentials()`.
6. If User email is synthetic (slip mode): skip email; teacher will reprint.
7. Return same `credentials` shape as create/invite.

Previous temp password is invalidated by the bcrypt overwrite — no extra cleanup needed.

### Frontend — roster action

In `ClassRosterDialog.tsx`, for each row with portal access ("Portal" badge), add a small menu (three-dot or dropdown):
- **Regenerate credentials** → confirmation dialog
- (Existing) Edit profile, Remove from class, etc.

For "Roster only" students, keep the existing invite icon as-is.

### Confirmation dialog

```
Title: Regenerate login credentials?
Body:  This will invalidate <FirstName>'s current password and generate
       a new one. <FirstName> will be forced to change it on next login.
       [if real email] An email with the new credentials will be sent to <email>.
       [if slip mode]  You'll need to print or share the new slip with <FirstName>.
[Cancel] [Regenerate]
```

On confirm → `POST /students/{id}/regenerate-credentials` → display new credentials in the shared `StudentCredentialsPanel`.

### Shared component extraction

The credentials display panel is currently inline in `StudentAddDialog.tsx`. Extract to `src/components/classes/StudentCredentialsPanel.tsx` accepting `{ credentials, deliveryMode }`. Consume from three places:
- `StudentAddDialog`
- `InviteStudentDialog`
- New `RegenerateCredentialsDialog`

Three call sites with identical UX — extraction prevents drift.

---

## File inventory

### Backend (modified or created)

| File | Change |
|---|---|
| `src/modules/Auth/model.ts` | Add `mustChangePassword: boolean` field (default false) |
| `src/modules/Auth/service.ts` | New `changePassword(userId, current, new)` method; `/me` + `/login` projections include `mustChangePassword` |
| `src/modules/Auth/controller.ts` | New `changePassword` handler |
| `src/modules/Auth/routes.ts` | Mount `POST /auth/change-password` |
| `src/modules/Auth/validation.ts` | Zod schema for change-password body |
| `src/modules/Student/service.ts` | Branch on `deliveryMethod`; drop synthetic-fallback path; set `mustChangePassword: true`; drop WhatsApp fields |
| `src/modules/Student/controller.ts` | New `regenerateCredentials` handler |
| `src/modules/Student/routes.ts` | Mount `POST /students/:id/regenerate-credentials` |
| `src/modules/Student/validation.ts` | Add `deliveryMethod` to `createStudentSchema` |
| `src/modules/Student/invite.service.ts` | Set `mustChangePassword: true` on regenerate; drop WhatsApp fields |
| `src/services/email.service.ts` | Update credentials template wording to mention required password change |

### Frontend (modified or created)

| File | Change |
|---|---|
| `src/types/students.ts` | Add `deliveryMethod` to `AddStudentPayload`; drop WhatsApp fields from credentials |
| `src/types/auth.ts` (or wherever `User` lives) | Add `mustChangePassword: boolean` |
| `src/components/classes/StudentAddDialog.tsx` | Delivery-method toggle + conditional email field |
| `src/components/classes/InviteStudentDialog.tsx` | Drop WhatsApp status text; use shared credentials panel |
| `src/components/classes/StudentCredentialsPanel.tsx` | **NEW** — extracted shared credentials display |
| `src/components/classes/RegenerateCredentialsDialog.tsx` | **NEW** — confirmation + new credentials display |
| `src/components/classes/ClassRosterDialog.tsx` | Per-student menu with "Regenerate credentials" item |
| `src/components/auth/MustChangePasswordGate.tsx` | **NEW** — gate component |
| `src/app/(auth)/change-password/page.tsx` | **NEW** — current/new/confirm form |
| `src/app/(dashboard)/student/layout.tsx` | Wrap children in `<MustChangePasswordGate>` |
| `src/app/(dashboard)/teacher/students/[id]/credentials/print/page.tsx` | **NEW** — printable slip with `@media print` styles |
| `src/hooks/useTeacherClasses.ts` | Add `regenerateCredentials` mutation |
| `src/stores/useAuthStore.ts` | Add `changePassword` action + refresh after success |

---

## Edge cases addressed

1. **Special chars in name → synthetic email**: server-side sanitisation (lowercase, non-alphanumeric → `-`, collapse repeats, fall back to admission-only if empty).
2. **Concurrent regenerate**: last write wins; both teachers see the new password in their respective return values. Bcrypt overwrite is document-atomic.
3. **`mustChangePassword` on existing users**: schema default handles it. No migration needed.
4. **Gate scope**: wraps student layout only for Phase 1. Trivial to extend to admin/teacher/parent layouts if they ever get temp passwords.
5. **Teacher regenerates after student already logged in**: student forced through gate again on next route change.
6. **Slip mode → email mode conversion**: out of Phase 1 scope. Existing invite endpoint already handles this if the teacher wants.
7. **Direct-URL bypass with valid JWT**: client-side gate doesn't block API calls. Phase 1 acceptable — short window before forced change. Phase 2 could add backend middleware.
8. **Login when `mustChangePassword: true`**: login succeeds, JWT issued, frontend gate intercepts on first route.

---

## Non-goals (Phase 2 deferrals)

- WhatsApp delivery channel
- Slip-mode → email-mode conversion UX (workaround: use invite endpoint)
- Backend-enforced password-must-change middleware
- Multi-language printable slip
- Bulk regenerate
- "Show same credentials again" without regeneration (would require cleartext storage)

---

## Success criteria

- A teacher adds a student in **email mode** with a real email: User created with temp password, real email delivered, `mustChangePassword: true`, credentials panel shows email-sent status.
- A teacher adds a student in **slip mode** without an email: User created with synthetic login email, temp password generated, NO email sent, credentials panel shows the credentials + a "Download printable slip" button that produces a printable HTML page.
- The student logs in with their temp password: redirected to `/auth/change-password` and cannot leave that page until they set a new password. After change, normal access to `/student/*`.
- Teacher in the class roster clicks "Regenerate credentials" on an existing student: temp password regenerated, displayed once, old password invalidated, email re-sent (if email mode) or new slip available (if slip mode), student forced through change-password gate on next login.
- WhatsApp status text no longer appears anywhere in the credentials UX.
- No silent-failure paths remain: every student created via `POST /api/students` has a usable login.
- All new backend code is `schoolId`-scoped, all new frontend files under 350 lines, zero `any` types, design tokens used throughout.
