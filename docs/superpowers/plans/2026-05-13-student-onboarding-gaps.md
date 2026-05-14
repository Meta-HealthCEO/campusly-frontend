# Student Onboarding Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four gaps in the teacher → student onboarding flow: silent-failure no-email path, lack of forced password change on first login, false-promise WhatsApp placeholder, and unrecoverable temp credentials.

**Architecture:** Backend gets a `mustChangePassword` flag on `User`, a `POST /auth/change-password` endpoint, a `deliveryMethod` branch in student creation (email-invite vs printable-slip with synthetic login email), a new `POST /students/:id/regenerate-credentials` endpoint, and removal of WhatsApp delivery code. Frontend gets a delivery-method toggle in the add-student dialog, a printable slip page sourced from `sessionStorage`, a roster-level "Regenerate credentials" action, an extracted shared `StudentCredentialsPanel`, a `MustChangePasswordGate` wrapping the student layout, and a `/auth/change-password` page.

**Tech Stack:**
- **Backend:** Express 5 + Mongoose, vitest (integration tests against `MONGODB_TEST_URI`), Zod v4 validation, bcrypt password hashing, Resend email.
- **Frontend:** Next.js 16 (App Router) + React 19, Zustand, Axios, Tailwind 4, base-ui (shadcn-style), Lucide icons. No frontend tests exist — frontend tasks use code + manual smoke verification.
- **Spec:** [docs/superpowers/specs/2026-05-13-student-onboarding-gaps-design.md](docs/superpowers/specs/2026-05-13-student-onboarding-gaps-design.md)

---

## Working directories

- Frontend repo: `c:\Users\shaun\campusly-frontend`
- Backend repo: `c:\Users\shaun\campusly-backend`

Paths in the plan are repo-relative, prefixed `BE:` (backend) or `FE:` (frontend).

## Conventions

- Backend tests live alongside code: `BE: src/modules/<Module>/__tests__/*.test.ts`. Run via `npm test`. Tests connect to MongoDB at `MONGODB_TEST_URI` (default `mongodb://localhost:27017/campusly-test`). Use file-local `FILE_SCHOOL_ID` constants to scope `deleteMany` calls — the existing test suite has unscoped deletes that race under parallel mode (`--no-file-parallelism` mitigates).
- Every commit ends a task. Commit message style: `feat(student): ...`, `fix(...): ...`, etc., with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- No `any` types anywhere.
- Every backend `findOne` / `findOneAndUpdate` includes `schoolId` AND `isDeleted: false`. Zod from `'zod/v4'`. ESM `.js` import suffixes.
- Frontend: hooks/stores own all `apiClient` calls; pages/components do zero API I/O. Files under 350 lines.

## File structure

### Backend — modified

| File | Change |
|---|---|
| `src/modules/Auth/model.ts` | Add `mustChangePassword: boolean` field (default false) |
| `src/modules/Auth/service.ts` | New `changePassword(userId, current, new)` method |
| `src/modules/Auth/controller.ts` | New `changePassword` handler; ensure `/me` + `/login` responses project `mustChangePassword` |
| `src/modules/Auth/routes.ts` | Mount `POST /auth/change-password` |
| `src/modules/Auth/validation.ts` | Zod schema for change-password body |
| `src/modules/Student/service.ts` | Branch on `deliveryMethod`, set `mustChangePassword: true`, drop WhatsApp fields, drop silent-fallback path |
| `src/modules/Student/controller.ts` | New `regenerateCredentials` handler |
| `src/modules/Student/routes.ts` | Mount `POST /students/:id/regenerate-credentials` |
| `src/modules/Student/validation.ts` | Add `deliveryMethod` to `createStudentSchema` |
| `src/modules/Student/invite.service.ts` | Set `mustChangePassword: true` on regen; drop WhatsApp fields |
| `src/services/email.service.ts` (or wherever the credentials template lives) | Update template wording to "you will be required to change this password on first login" |

### Backend — new tests

| File | Purpose |
|---|---|
| `src/modules/Auth/__tests__/change-password.test.ts` | Integration tests for the new endpoint |
| `src/modules/Student/__tests__/service-delivery-method.test.ts` | Integration tests for email vs slip branching |
| `src/modules/Student/__tests__/service-regenerate.test.ts` | Integration tests for regenerate credentials |

### Frontend — created

| File | Responsibility |
|---|---|
| `src/components/classes/StudentCredentialsPanel.tsx` | Shared credentials display (extracted from existing inline panel) |
| `src/components/classes/RegenerateCredentialsDialog.tsx` | Confirmation + new credentials display |
| `src/components/auth/MustChangePasswordGate.tsx` | Wraps student layout; redirects to `/auth/change-password` |
| `src/app/(auth)/change-password/page.tsx` | Form with current/new/confirm |
| `src/app/(dashboard)/teacher/students/[id]/credentials/print/page.tsx` | Printable slip sourced from `sessionStorage` |
| `src/lib/student-slip-storage.ts` | Typed helpers for `sessionStorage` slip read/write/clear |

### Frontend — modified

| File | Change |
|---|---|
| `src/types/students.ts` | Add `deliveryMethod` to `AddStudentPayload`; drop WhatsApp fields from credentials type |
| `src/types/auth.ts` (or wherever `User` is defined) | Add `mustChangePassword: boolean` |
| `src/components/classes/StudentAddDialog.tsx` | Delivery-method toggle + conditional email field + `sessionStorage` write + slip download button |
| `src/components/classes/InviteStudentDialog.tsx` | Drop WhatsApp text; use shared `StudentCredentialsPanel` |
| `src/components/classes/ClassRosterDialog.tsx` | Per-row "Regenerate credentials" menu item |
| `src/app/(dashboard)/student/layout.tsx` | Wrap children in `<MustChangePasswordGate>` |
| `src/hooks/useTeacherClasses.ts` | Add `regenerateCredentials` mutation |
| `src/stores/useAuthStore.ts` | Add `changePassword` action + refresh after success |

---

# Phase A — Backend foundation

### Task A1: Add `mustChangePassword` to User model

**Files:**
- Modify: `BE: src/modules/Auth/model.ts`

- [ ] **Step 1: Read the existing User model**

Read `BE: src/modules/Auth/model.ts`. Note the `IUser` interface and the schema definition. The interface has fields like `email`, `password`, `firstName`, etc. The schema definition has matching `new Schema<IUser>({...})`. Both need updating in lockstep — Mongoose silently drops fields not in the schema.

- [ ] **Step 2: Add the field to the interface**

In `IUser`, after the existing `isStandaloneCoach: boolean;` (or any reasonable spot among the booleans), add:
```ts
mustChangePassword: boolean;
```

- [ ] **Step 3: Add the field to the schema**

In the schema object, add (near the other boolean fields):
```ts
mustChangePassword: {
  type: Boolean,
  default: false,
},
```

- [ ] **Step 4: Typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors from `Auth/model.ts`.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Auth/model.ts && git commit -m "$(cat <<'EOF'
feat(auth): add mustChangePassword flag to User model

Used to force first-login password change when temp credentials
are issued (student onboarding). Defaults to false — existing
users unaffected via schema default.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A2: change-password validation schema

**Files:**
- Modify: `BE: src/modules/Auth/validation.ts`

- [ ] **Step 1: Read existing validation file**

Read `BE: src/modules/Auth/validation.ts`. Note the password validator(s) already used by register/forgot-password — likely a min-length 8 check. Reuse that validator.

- [ ] **Step 2: Add the change-password schema**

Append to `BE: src/modules/Auth/validation.ts` (adapt to the existing zod import style — the file likely already imports from `'zod/v4'`):

```ts
import { z } from 'zod/v4';
// (Already imported at top — don't re-import.)

// Find the existing password validator. If it looks like:
//   const passwordSchema = z.string().min(8);
// then reuse it. Otherwise use z.string().min(8) inline.

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

If the existing file has a stronger password validator (e.g. requires a digit / uppercase), use THAT instead of `min(8)` — match the project's rules.

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Auth/validation.ts && git commit -m "$(cat <<'EOF'
feat(auth): zod schema for change-password endpoint

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A3: change-password service + tests

**Files:**
- Modify: `BE: src/modules/Auth/service.ts`
- Create: `BE: src/modules/Auth/__tests__/change-password.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `BE: src/modules/Auth/__tests__/change-password.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../model.js';
import { AuthService } from '../service.js';
import { UnauthorizedError, BadRequestError } from '../../../common/errors.js';

const FILE_SCHOOL_ID = new mongoose.Types.ObjectId();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
beforeEach(async () => {
  await User.deleteMany({ schoolId: FILE_SCHOOL_ID });
});

async function makeUser(overrides: Partial<{ password: string; mustChangePassword: boolean }> = {}) {
  const user = await User.create({
    email: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'student',
    schoolId: FILE_SCHOOL_ID,
    password: overrides.password ?? 'OldPass123',
    mustChangePassword: overrides.mustChangePassword ?? true,
  });
  return user;
}

describe('AuthService.changePassword', () => {
  it('updates the password hash and clears mustChangePassword on success', async () => {
    const user = await makeUser({ password: 'OldPass123', mustChangePassword: true });
    await AuthService.changePassword(user._id.toString(), 'OldPass123', 'NewPass456');

    const reloaded = await User.findById(user._id).select('+password');
    expect(reloaded).not.toBeNull();
    const ok = await bcrypt.compare('NewPass456', reloaded!.password);
    expect(ok).toBe(true);
    expect(reloaded!.mustChangePassword).toBe(false);
  });

  it('rejects when currentPassword does not match', async () => {
    const user = await makeUser({ password: 'OldPass123' });
    await expect(
      AuthService.changePassword(user._id.toString(), 'WrongPass', 'NewPass456'),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects when newPassword equals currentPassword', async () => {
    const user = await makeUser({ password: 'SamePass123' });
    await expect(
      AuthService.changePassword(user._id.toString(), 'SamePass123', 'SamePass123'),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejects when user not found', async () => {
    const nonexistent = new mongoose.Types.ObjectId().toString();
    await expect(
      AuthService.changePassword(nonexistent, 'OldPass123', 'NewPass456'),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- src/modules/Auth/__tests__/change-password.test.ts
```
Expected: FAIL — `AuthService.changePassword is not a function`.

- [ ] **Step 3: Implement the service method**

Read `BE: src/modules/Auth/service.ts`. Note existing methods (login, register, forgotPassword, resetPassword). Find their import block and class declaration.

Append to the `AuthService` class:

```ts
static async changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (currentPassword === newPassword) {
    throw new BadRequestError('New password must be different from current password');
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const ok = await user.comparePassword(currentPassword);
  if (!ok) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
}
```

Make sure `BadRequestError` and `UnauthorizedError` are imported at the top — read existing imports and add to that block:
```ts
import { UnauthorizedError, BadRequestError } from '../../common/errors.js';
```

The User model has a pre-save hook that bcrypt-hashes any modified `password` field — verify by reading `BE: src/modules/Auth/model.ts` near the `userSchema.pre('save', ...)` block. If no such hook exists, the service must hash manually with `bcrypt.hash(newPassword, 12)` before assignment.

- [ ] **Step 4: Run tests, expect pass**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- src/modules/Auth/__tests__/change-password.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Auth/service.ts src/modules/Auth/__tests__/change-password.test.ts && git commit -m "$(cat <<'EOF'
feat(auth): changePassword service with mustChangePassword clearing

Validates current password via existing comparePassword,
rejects same-as-current, persists new hash via the pre-save
bcrypt hook, clears mustChangePassword flag.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A4: change-password controller + route

**Files:**
- Modify: `BE: src/modules/Auth/controller.ts`
- Modify: `BE: src/modules/Auth/routes.ts`

- [ ] **Step 1: Add the controller handler**

Read `BE: src/modules/Auth/controller.ts`. Identify the pattern other handlers use (e.g. `login`, `forgotPassword`). Add:

```ts
import { changePasswordSchema } from './validation.js';

// Inside the AuthController class:
static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) throw new UnauthorizedError();
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ success: true });
  } catch (err: unknown) {
    next(err);
  }
}
```

Make sure `UnauthorizedError` and `changePasswordSchema` are imported. The `req.user` typing is already supplied via the global Express augmentation at `BE: src/types/express.d.ts` (no cast needed).

- [ ] **Step 2: Wire the route**

Read `BE: src/modules/Auth/routes.ts`. Add near the existing `forgot-password` / `reset-password` routes:

```ts
router.post('/change-password', authenticate, AuthController.changePassword);
```

`authenticate` middleware should already be imported in this file. If not, find its import at the top of similar route files (e.g. `BE: src/modules/Student/routes.ts`).

- [ ] **Step 3: Typecheck and smoke**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Zero errors.

If the dev server is running, smoke test:
```bash
curl -i -X POST http://localhost:4500/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"x","newPassword":"y"}'
```
Expected: HTTP 401 (Unauthorized — no JWT). Not 404 — that would mean the route isn't mounted.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Auth/controller.ts src/modules/Auth/routes.ts && git commit -m "$(cat <<'EOF'
feat(auth): mount POST /api/auth/change-password

Authenticated endpoint accepting { currentPassword, newPassword }.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A5: Expose `mustChangePassword` in auth responses

**Files:**
- Modify: `BE: src/modules/Auth/service.ts` (or controller, wherever the user object is shaped for `/me` and `/login`)

- [ ] **Step 1: Audit current `/login` and `/me` response shapes**

Grep for how login response is built:
```
Grep: in BE: src/modules/Auth/ for "res.json" and "user:"
```

Find the shape constructor (likely a private `toUserResponse(user)` or inline object spread). Note whether `mustChangePassword` is already included via spread (`...user.toObject()`) — if so, this task may be a no-op. If the shape is a hand-listed projection (e.g. `{ _id, email, firstName, lastName, role, schoolId, ... }`), `mustChangePassword` needs to be added explicitly.

- [ ] **Step 2: Add the field to the response shapes**

If the project uses an explicit projection, add `mustChangePassword: user.mustChangePassword` to BOTH:
- The `/login` response builder
- The `/me` response builder
- (And `/refresh-token` if it returns the user)

If it's a spread, just verify `mustChangePassword` lands in the output by curling against a user with it set.

- [ ] **Step 3: Quick verification**

If the dev server is running and you have a student JWT:
```bash
curl -H "Authorization: Bearer <jwt>" http://localhost:4500/api/auth/me | grep mustChangePassword
```
Expected: see `"mustChangePassword":false` (or true) in the output.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Auth/ && git commit -m "$(cat <<'EOF'
feat(auth): expose mustChangePassword in /me + /login responses

Frontend gate reads this flag from useAuthStore.user to force
the change-password page on first login with temp credentials.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A6: Drop WhatsApp fields from Student credentials

**Files:**
- Modify: `BE: src/modules/Student/service.ts`
- Modify: `BE: src/modules/Student/invite.service.ts`

- [ ] **Step 1: Find existing WhatsApp shape**

Grep:
```
Grep: in BE: src/modules/Student/ for "whatsappSent" and "whatsappError"
```

Note every line referencing these fields — the credentials return shape and any conditional logic.

- [ ] **Step 2: Remove WhatsApp fields**

In `BE: src/modules/Student/service.ts`:
- From the `credentials` return shape in `create()`, remove `whatsappSent` and `whatsappError`.
- Remove any code path that sets these values (e.g. the comment "WhatsApp login delivery needs school WhatsApp opt-in/configuration").
- Replace with a one-line comment:
```ts
// Phase 2: WhatsApp delivery (per-school WhatsApp credentials,
// phone capture, template approval). Removed from Phase 1.
```

In `BE: src/modules/Student/invite.service.ts`:
- Same trim — remove WhatsApp fields from the returned credentials.

If there's a shared TypeScript type for the credentials shape (e.g. `AddStudentResult` or `CredentialsPayload`), update it to drop the WhatsApp fields.

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Zero errors. If callers fail to compile because they referenced the dropped fields, those callers are in the frontend (handled in Phase D) — backend should be clean.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Student/ && git commit -m "$(cat <<'EOF'
chore(student): drop whatsappSent/whatsappError from credentials shape

WhatsApp delivery rebuilt in Phase 2 with school subscriptions
(per-school credentials, phone capture, template approval).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A7: Add `deliveryMethod` to createStudentSchema

**Files:**
- Modify: `BE: src/modules/Student/validation.ts`

- [ ] **Step 1: Add the field with refinement**

Read `BE: src/modules/Student/validation.ts`. Locate `createStudentSchema`. Add `deliveryMethod` and refine to require `email` when method is `'email'`:

```ts
// Inside the existing createStudentSchema:
deliveryMethod: z.enum(['email', 'slip']),
// (other fields stay as they are)
```

Then wrap the schema with a `.superRefine` (or `.refine`) at the bottom to enforce the email requirement when method is email:

```ts
export const createStudentSchema = z.object({
  // ... existing fields including:
  deliveryMethod: z.enum(['email', 'slip']),
  email: z.email().optional(),
  // ... other fields
}).superRefine((data, ctx) => {
  if (data.deliveryMethod === 'email' && !data.email) {
    ctx.addIssue({
      code: 'custom',
      path: ['email'],
      message: 'Email is required when delivery method is email-invite',
    });
  }
});
```

If `email` was previously declared as `z.string().email().optional()` or similar — keep it as-is (still optional at the field level), the refinement adds the conditional requirement.

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Zero errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Student/validation.ts && git commit -m "$(cat <<'EOF'
feat(student): require deliveryMethod on student creation

email mode requires email field; slip mode permits blank email.
Eliminates the silent-failure path where blank email led to an
unusable synthetic account.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A8: deliveryMethod branch in StudentService.create + tests

**Files:**
- Modify: `BE: src/modules/Student/service.ts`
- Create: `BE: src/modules/Student/__tests__/service-delivery-method.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `BE: src/modules/Student/__tests__/service-delivery-method.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Student } from '../model.js';
import { User } from '../../Auth/model.js';
import { Class } from '../../Academic/model.js';
import { StudentService } from '../service.js';

const FILE_SCHOOL_ID = new mongoose.Types.ObjectId();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
beforeEach(async () => {
  await Student.deleteMany({ schoolId: FILE_SCHOOL_ID });
  await User.deleteMany({ schoolId: FILE_SCHOOL_ID });
  await Class.deleteMany({ schoolId: FILE_SCHOOL_ID });
});

async function seedClass() {
  const classId = new mongoose.Types.ObjectId();
  const gradeId = new mongoose.Types.ObjectId();
  await Class.create({
    _id: classId,
    schoolId: FILE_SCHOOL_ID,
    gradeId,
    name: 'Test Class',
    teacherId: new mongoose.Types.ObjectId(),
    capacity: 30,
    classroomCode: `T${classId.toString().slice(-7).toUpperCase()}`,
  });
  return { classId, gradeId };
}

describe('StudentService.create — delivery method branching', () => {
  it('email mode creates user with the provided email and sets mustChangePassword=true', async () => {
    const { classId, gradeId } = await seedClass();
    const result = await StudentService.create({
      schoolId: FILE_SCHOOL_ID.toString(),
      classId: classId.toString(),
      gradeId: gradeId.toString(),
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      deliveryMethod: 'email',
    });

    expect(result.credentials).toBeDefined();
    expect(result.credentials!.loginEmail).toBe('ada@example.com');
    expect(result.credentials!.tempPassword).toMatch(/^Campus-/);

    const user = await User.findOne({ email: 'ada@example.com' });
    expect(user).not.toBeNull();
    expect(user!.mustChangePassword).toBe(true);
    expect(user!.role).toBe('student');
  });

  it('slip mode creates user with a synthetic login email and sets mustChangePassword=true', async () => {
    const { classId, gradeId } = await seedClass();
    const result = await StudentService.create({
      schoolId: FILE_SCHOOL_ID.toString(),
      classId: classId.toString(),
      gradeId: gradeId.toString(),
      firstName: 'Grace',
      lastName: 'Hopper',
      deliveryMethod: 'slip',
    });

    expect(result.credentials).toBeDefined();
    expect(result.credentials!.loginEmail).toMatch(/@students\.campusly\.local$/);
    expect(result.credentials!.loginEmail).toContain('grace');
    expect(result.credentials!.emailSent).toBe(false);

    const user = await User.findOne({ email: result.credentials!.loginEmail });
    expect(user).not.toBeNull();
    expect(user!.mustChangePassword).toBe(true);
  });

  it('slip mode sanitises special characters in the name', async () => {
    const { classId, gradeId } = await seedClass();
    const result = await StudentService.create({
      schoolId: FILE_SCHOOL_ID.toString(),
      classId: classId.toString(),
      gradeId: gradeId.toString(),
      firstName: "John O'Brien",
      lastName: 'García-López',
      deliveryMethod: 'slip',
    });

    expect(result.credentials).toBeDefined();
    // Synthetic email should contain only [a-z0-9.-] before the @ sign
    const localPart = result.credentials!.loginEmail.split('@')[0];
    expect(localPart).toMatch(/^[a-z0-9.-]+$/);
  });

  it('slip mode falls back to admission-only synthetic email for unparseable names', async () => {
    const { classId, gradeId } = await seedClass();
    const result = await StudentService.create({
      schoolId: FILE_SCHOOL_ID.toString(),
      classId: classId.toString(),
      gradeId: gradeId.toString(),
      firstName: '李',
      lastName: '明',
      deliveryMethod: 'slip',
    });

    // After sanitisation '李明' becomes empty — fallback to admission-only
    expect(result.credentials).toBeDefined();
    const localPart = result.credentials!.loginEmail.split('@')[0];
    expect(localPart).toMatch(/^s\d+$/i); // e.g. S00001
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- src/modules/Student/__tests__/service-delivery-method.test.ts --no-file-parallelism
```
Expected: FAIL — at minimum, `deliveryMethod` field rejected as unknown property OR the synthetic-email logic doesn't exist yet.

- [ ] **Step 3: Update StudentService.create**

Read `BE: src/modules/Student/service.ts`. Locate the existing create method. The current logic auto-generates a synthetic email when one isn't provided — REPLACE that "auto-fallback if blank" path with explicit `deliveryMethod` branching.

Add a helper above the class (or inside it as a private static):

```ts
function sanitiseForSyntheticEmail(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildSyntheticLoginEmail(firstName: string, lastName: string, admissionNumber: string): string {
  const first = sanitiseForSyntheticEmail(firstName);
  const last = sanitiseForSyntheticEmail(lastName);
  const localBase = [first, last].filter(Boolean).join('.');
  const local = localBase ? `${localBase}.${admissionNumber.toLowerCase()}` : admissionNumber.toLowerCase();
  return `${local}@students.campusly.local`;
}
```

In the `create` method, branch on `data.deliveryMethod`:

```ts
// After admission number generation, before user creation:
let loginEmail: string;
let isSyntheticEmail = false;

if (data.deliveryMethod === 'email') {
  if (!data.email) {
    throw new BadRequestError('email is required when deliveryMethod is "email"');
  }
  loginEmail = data.email;
} else {
  // slip mode
  loginEmail = buildSyntheticLoginEmail(data.firstName, data.lastName, admissionNumber);
  isSyntheticEmail = true;
}

// Generate temp password (Campus-{random hex} — KEEP existing pattern):
const tempPassword = `Campus-${crypto.randomBytes(3).toString('hex')}`;

// Create User with mustChangePassword: true (NEW), no whatsapp fields:
const user = await User.create({
  email: loginEmail,
  password: tempPassword,
  firstName: data.firstName,
  lastName: data.lastName,
  role: 'student',
  schoolId: data.schoolId,
  mustChangePassword: true,
  isActive: true,
});

// Send email only if not synthetic:
let emailSent = false;
let emailError: string | undefined;
if (!isSyntheticEmail) {
  try {
    await EmailService.sendStudentPortalCredentials({
      to: loginEmail,
      firstName: data.firstName,
      tempPassword,
    });
    emailSent = true;
  } catch (err: unknown) {
    emailError = err instanceof Error ? err.message : 'Unknown email error';
  }
}

// Return shape — note no whatsappSent / whatsappError:
return {
  student,
  credentials: { loginEmail, tempPassword, emailSent, ...(emailError ? { emailError } : {}) },
};
```

Adapt to whatever the existing structure of `create()` is — the goal is:
1. Replace "fallback synthetic when blank" with explicit `deliveryMethod === 'slip'` branching.
2. Always set `mustChangePassword: true` on the new User.
3. Skip email send for synthetic addresses.
4. Drop WhatsApp fields from the return.

Make sure `crypto` is imported at the top: `import crypto from 'node:crypto';`.

If `BadRequestError` isn't already imported, add it to the existing errors import.

- [ ] **Step 4: Run tests, expect pass**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- src/modules/Student/__tests__/service-delivery-method.test.ts --no-file-parallelism
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Student/ && git commit -m "$(cat <<'EOF'
feat(student): deliveryMethod branching in create (email vs slip)

Email mode requires a real email and sends credentials via Resend.
Slip mode generates a synthetic firstname.lastname.NNNN@students.
campusly.local login email and skips email send (teacher prints
the slip instead). Both modes set mustChangePassword=true.

Removes the silent-fallback path where a blank email led to an
unusable synthetic account.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A9: Set `mustChangePassword: true` in invite.service

**Files:**
- Modify: `BE: src/modules/Student/invite.service.ts`

- [ ] **Step 1: Read existing invite service**

Read `BE: src/modules/Student/invite.service.ts`. Identify where the new temp password is set on the User (typically a `user.password = newPassword` then `user.save()`).

- [ ] **Step 2: Set the flag on regen**

Just before `user.save()`, add:
```ts
user.mustChangePassword = true;
```

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Zero errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Student/invite.service.ts && git commit -m "$(cat <<'EOF'
feat(student): invite flow sets mustChangePassword=true on regen

Same security posture as initial creation — student forced to
change the regenerated temp password on first login.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A10: regenerateCredentials service + tests

**Files:**
- Modify: `BE: src/modules/Student/service.ts`
- Create: `BE: src/modules/Student/__tests__/service-regenerate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `BE: src/modules/Student/__tests__/service-regenerate.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Student } from '../model.js';
import { User } from '../../Auth/model.js';
import { StudentService } from '../service.js';
import { NotFoundError, BadRequestError } from '../../../common/errors.js';

const FILE_SCHOOL_ID = new mongoose.Types.ObjectId();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
beforeEach(async () => {
  await Student.deleteMany({ schoolId: FILE_SCHOOL_ID });
  await User.deleteMany({ schoolId: FILE_SCHOOL_ID });
});

async function seedStudentWithUser(opts: { email: string }) {
  const userId = new mongoose.Types.ObjectId();
  await User.create({
    _id: userId,
    email: opts.email,
    firstName: 'Test',
    lastName: 'Student',
    role: 'student',
    schoolId: FILE_SCHOOL_ID,
    password: 'OriginalPass1',
    mustChangePassword: false,
  });
  const student = await Student.create({
    schoolId: FILE_SCHOOL_ID,
    userId,
    classId: new mongoose.Types.ObjectId(),
    gradeId: new mongoose.Types.ObjectId(),
    admissionNumber: `ADM-${Date.now()}`,
    enrollmentStatus: 'active',
  });
  return { student, userId };
}

describe('StudentService.regenerateCredentials', () => {
  it('generates a new temp password, sets mustChangePassword=true, and invalidates old password', async () => {
    const { student, userId } = await seedStudentWithUser({ email: 'real@test.com' });

    const result = await StudentService.regenerateCredentials(
      student._id.toString(),
      FILE_SCHOOL_ID.toString(),
    );

    expect(result.credentials.tempPassword).toMatch(/^Campus-/);
    expect(result.credentials.loginEmail).toBe('real@test.com');

    const user = await User.findById(userId).select('+password');
    expect(user!.mustChangePassword).toBe(true);

    // Old password no longer works
    const oldStillWorks = await bcrypt.compare('OriginalPass1', user!.password);
    expect(oldStillWorks).toBe(false);

    // New password works
    const newWorks = await bcrypt.compare(result.credentials.tempPassword, user!.password);
    expect(newWorks).toBe(true);
  });

  it('throws NotFoundError when student is from a different school', async () => {
    const { student } = await seedStudentWithUser({ email: 'a@test.com' });
    const otherSchoolId = new mongoose.Types.ObjectId();
    await expect(
      StudentService.regenerateCredentials(student._id.toString(), otherSchoolId.toString()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws BadRequestError when student has no linked User', async () => {
    const student = await Student.create({
      schoolId: FILE_SCHOOL_ID,
      // No userId — roster-only
      classId: new mongoose.Types.ObjectId(),
      gradeId: new mongoose.Types.ObjectId(),
      admissionNumber: `ADM-${Date.now()}-orphan`,
      enrollmentStatus: 'active',
    });
    await expect(
      StudentService.regenerateCredentials(student._id.toString(), FILE_SCHOOL_ID.toString()),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('marks emailSent=false when loginEmail is synthetic', async () => {
    const { student } = await seedStudentWithUser({ email: 'grace.hopper.adm@students.campusly.local' });
    const result = await StudentService.regenerateCredentials(
      student._id.toString(),
      FILE_SCHOOL_ID.toString(),
    );
    expect(result.credentials.emailSent).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- src/modules/Student/__tests__/service-regenerate.test.ts --no-file-parallelism
```
Expected: FAIL — `regenerateCredentials is not a function`.

- [ ] **Step 3: Implement the service method**

Append to `StudentService` class in `BE: src/modules/Student/service.ts`:

```ts
static async regenerateCredentials(
  studentId: string,
  schoolId: string,
): Promise<{ credentials: { loginEmail: string; tempPassword: string; emailSent: boolean; emailError?: string } }> {
  const student = await Student.findOne({
    _id: studentId,
    schoolId,
    isDeleted: false,
  });
  if (!student) {
    throw new NotFoundError('Student not found');
  }
  if (!student.userId) {
    throw new BadRequestError('Student has no portal account — use the invite flow instead');
  }

  const user = await User.findOne({ _id: student.userId, schoolId });
  if (!user) {
    throw new BadRequestError('Linked user account not found');
  }

  const tempPassword = `Campus-${crypto.randomBytes(3).toString('hex')}`;
  user.password = tempPassword;
  user.mustChangePassword = true;
  await user.save();

  const isSynthetic = user.email.endsWith('@students.campusly.local');
  let emailSent = false;
  let emailError: string | undefined;
  if (!isSynthetic) {
    try {
      await EmailService.sendStudentPortalCredentials({
        to: user.email,
        firstName: user.firstName,
        tempPassword,
      });
      emailSent = true;
    } catch (err: unknown) {
      emailError = err instanceof Error ? err.message : 'Unknown email error';
    }
  }

  return {
    credentials: {
      loginEmail: user.email,
      tempPassword,
      emailSent,
      ...(emailError ? { emailError } : {}),
    },
  };
}
```

Make sure imports include `NotFoundError`, `BadRequestError` from `../../common/errors.js` and `crypto` from `'node:crypto'`. Adjust the `EmailService` import to match the existing path used by `create()`.

- [ ] **Step 4: Run tests, expect pass**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- src/modules/Student/__tests__/service-regenerate.test.ts --no-file-parallelism
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Student/ && git commit -m "$(cat <<'EOF'
feat(student): regenerateCredentials service

Generates fresh temp password for an existing student User,
sets mustChangePassword=true, invalidates old password via
bcrypt overwrite, re-sends email only for real (non-synthetic)
addresses.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A11: regenerate controller + route

**Files:**
- Modify: `BE: src/modules/Student/controller.ts`
- Modify: `BE: src/modules/Student/routes.ts`

- [ ] **Step 1: Add the controller handler**

In `BE: src/modules/Student/controller.ts`, append to the `StudentController` class:

```ts
static async regenerateCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) throw new UnauthorizedError();
    const schoolId = req.user.schoolId;
    if (!schoolId) throw new BadRequestError('Caller has no school context');

    const { id } = req.params;
    if (!id) throw new BadRequestError('Student id is required');

    // Teacher authorisation: ensure the caller can manage this student's class.
    // Mirror the pattern from StudentController.create — check AcademicService.teacherCanAccessClass.
    // Find the existing check by reading controller.ts:create.
    if (req.user.role === 'teacher') {
      const student = await Student.findOne({ _id: id, schoolId, isDeleted: false }).select('classId');
      if (!student) throw new NotFoundError('Student not found');
      const canAccess = await AcademicService.teacherCanAccessClass(req.user, student.classId.toString());
      if (!canAccess) throw new ForbiddenError('Cannot regenerate credentials for a student in a class you do not own');
    }

    const result = await StudentService.regenerateCredentials(id, schoolId);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    next(err);
  }
}
```

Make sure imports at the top of the file include: `Student` (model), `AcademicService`, `NotFoundError`, `BadRequestError`, `ForbiddenError`, `UnauthorizedError`. Mirror what the existing `create` handler imports — if it doesn't import `AcademicService` directly but uses a helper, use that helper instead.

- [ ] **Step 2: Add the route**

In `BE: src/modules/Student/routes.ts`, near the existing `POST /:id/invite` route (around line 142 per earlier exploration), add:

```ts
router.post('/:id/regenerate-credentials', StudentController.regenerateCredentials);
```

The router-level `authenticate` middleware (already applied at the top of the routes file) handles auth. The capability check happens in the controller.

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```
Zero errors.

- [ ] **Step 4: Smoke test**

If dev server is running:
```bash
curl -i -X POST http://localhost:4500/api/students/000000000000000000000000/regenerate-credentials
```
Expected: HTTP 401. Not 404 (would mean route not mounted).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/Student/controller.ts src/modules/Student/routes.ts && git commit -m "$(cat <<'EOF'
feat(student): mount POST /students/:id/regenerate-credentials

Teacher authorisation via AcademicService.teacherCanAccessClass
(same check used by create). Standalone teachers go through the
same path.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task A12: Update email template wording

**Files:**
- Modify: `BE: src/services/email.service.ts` (or wherever the `sendStudentPortalCredentials` template lives — discover by grep)

- [ ] **Step 1: Find the template**

```
Grep: in BE: src/ for "sendStudentPortalCredentials"
```

Read the file. Look for the HTML or text body that mentions the temp password. The existing copy probably reads "Please sign in and change this password as soon as possible" (advisory).

- [ ] **Step 2: Update the wording**

Replace the advisory line with:

```
You will be required to change this password on first login.
```

If there's both an HTML and a plain-text version, update both.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/services/email.service.ts && git commit -m "$(cat <<'EOF'
feat(email): credentials template signals required password change

Wording aligned with the hard-gate enforcement now in place.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase B — Frontend types

### Task B1: Add `mustChangePassword` and `deliveryMethod` to types

**Files:**
- Modify: `FE: src/types/auth.ts` (or `common.ts` — wherever `User` lives)
- Modify: `FE: src/types/students.ts`

- [ ] **Step 1: Locate and update User type**

```
Grep: in FE: src/types/ for "role: UserRole" or "interface User"
```

Read the file. Add `mustChangePassword: boolean` to the `User` interface.

- [ ] **Step 2: Update student payload + credentials types**

Read `FE: src/types/students.ts`. Find the existing `AddStudentPayload` (or equivalent — may be named `CreateStudentInput`) and the credentials shape returned by `AddStudentResult`.

Add `deliveryMethod: 'email' | 'slip'` to the payload type.

Drop `whatsappSent` and `whatsappError` from the credentials shape. Leave `emailSent`, `emailError`.

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Expect new errors in the dialog files that still reference the dropped WhatsApp fields and in the create-student call sites that don't pass `deliveryMethod` yet — those will be fixed in Phase D.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/types/ && git commit -m "$(cat <<'EOF'
feat(types): mustChangePassword on User; deliveryMethod on AddStudentPayload

Drops whatsappSent/whatsappError from credentials shape — WhatsApp
delivery deferred to Phase 2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase C — Frontend infrastructure

### Task C1: useAuthStore.changePassword action

**Files:**
- Modify: `FE: src/stores/useAuthStore.ts`

- [ ] **Step 1: Read existing store actions**

Read `FE: src/stores/useAuthStore.ts`. Note existing actions like `login`, `logout`. Identify where `apiClient` is imported and how login/logout shape their API calls.

- [ ] **Step 2: Add the changePassword action**

Add to the store:

```ts
// Add to the AuthState interface:
changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

// Add to the store implementation, alongside login/logout:
changePassword: async (currentPassword, newPassword) => {
  await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  // Refresh the user object so mustChangePassword flips to false in-store.
  const response = await apiClient.get('/auth/me');
  const raw = response.data.data ?? response.data;
  const user = (raw.user ?? raw) as User;
  set({ user });
},
```

Read how the existing store's `login()` action shapes the user response — match its pattern for parsing `/auth/me`. The exact unwrap depends on whether the response uses `unwrapResponse` from `api-helpers`.

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors from this file.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/stores/useAuthStore.ts && git commit -m "$(cat <<'EOF'
feat(auth): useAuthStore.changePassword action

POST /auth/change-password then refresh user via /auth/me so the
mustChangePassword flag flips to false in-store immediately.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task C2: useTeacherClasses.regenerateCredentials mutation

**Files:**
- Modify: `FE: src/hooks/useTeacherClasses.ts`

- [ ] **Step 1: Read existing hook**

Read `FE: src/hooks/useTeacherClasses.ts`. Note the pattern for existing mutations (e.g. `inviteStudent` from invite flow — already returns credentials per earlier investigation).

- [ ] **Step 2: Add the regenerate mutation**

Add to the hook:

```ts
import { unwrapResponse } from '@/lib/api-helpers';

// Inside the hook (or as a separate exported function):
const regenerateCredentials = useCallback(async (studentId: string): Promise<AddStudentResult> => {
  const response = await apiClient.post(`/students/${studentId}/regenerate-credentials`, {});
  return unwrapResponse<AddStudentResult>(response);
}, []);

// Add `regenerateCredentials` to the returned object.
```

Adjust `AddStudentResult` type import — it may be named differently or live in `@/types`.

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/hooks/useTeacherClasses.ts && git commit -m "$(cat <<'EOF'
feat(teacher): regenerateCredentials mutation on useTeacherClasses

POSTs to /students/:id/regenerate-credentials and returns the new
credentials for display in the shared credentials panel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task C3: Slip-storage helpers

**Files:**
- Create: `FE: src/lib/student-slip-storage.ts`

- [ ] **Step 1: Implement the helper**

Create `FE: src/lib/student-slip-storage.ts`:

```ts
/**
 * Typed sessionStorage helpers for the printable-credentials-slip flow.
 *
 * Why sessionStorage: the cleartext temp password exists for exactly one
 * network round-trip (the create or regenerate response). After bcrypt
 * hashing on the backend, it cannot be recovered. The dialog writes the
 * slip data on success, the print page reads it, then the dialog clears
 * it on close. 10-minute TTL guards against stale data if the user gets
 * distracted.
 */

const KEY_PREFIX = 'campusly.slip.';
const TTL_MS = 10 * 60 * 1000;

export interface StudentSlipData {
  studentId: string;
  studentName: string;
  loginEmail: string;
  tempPassword: string;
  schoolName: string;
  loginUrl: string;
  writtenAt: number;
}

export function writeSlip(data: Omit<StudentSlipData, 'writtenAt'>): void {
  if (typeof window === 'undefined') return;
  const payload: StudentSlipData = { ...data, writtenAt: Date.now() };
  try {
    window.sessionStorage.setItem(KEY_PREFIX + data.studentId, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable (private mode, quota exceeded) — fail open.
  }
}

export function readSlip(studentId: string): StudentSlipData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(KEY_PREFIX + studentId);
    if (!raw) return null;
    const data = JSON.parse(raw) as StudentSlipData;
    if (Date.now() - data.writtenAt > TTL_MS) {
      window.sessionStorage.removeItem(KEY_PREFIX + studentId);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSlip(studentId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(KEY_PREFIX + studentId);
  } catch {
    // Ignore.
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/lib/student-slip-storage.ts && git commit -m "$(cat <<'EOF'
feat(student): typed sessionStorage helpers for printable slip flow

10-minute TTL, SSR-safe (guards typeof window), fail-open on
storage errors. Dialog writes on create/regenerate success,
print page reads, dialog clears on close.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase D — Frontend components

### Task D1: Extract StudentCredentialsPanel

**Files:**
- Create: `FE: src/components/classes/StudentCredentialsPanel.tsx`
- Modify: `FE: src/components/classes/StudentAddDialog.tsx` (use the extracted component)

- [ ] **Step 1: Identify the existing inline panel**

Read `FE: src/components/classes/StudentAddDialog.tsx`. Locate the existing credentials display panel (per earlier investigation, around lines 238-266). Note its props/state dependencies.

- [ ] **Step 2: Create the shared component**

Create `FE: src/components/classes/StudentCredentialsPanel.tsx`:

```tsx
'use client';

import { Copy, Mail, AlertCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface StudentCredentials {
  loginEmail: string;
  tempPassword: string;
  emailSent: boolean;
  emailError?: string;
}

interface StudentCredentialsPanelProps {
  credentials: StudentCredentials;
  deliveryMode: 'email' | 'slip';
  studentId: string;
  studentName: string;
  onPrintSlip?: () => void;
}

export function StudentCredentialsPanel({
  credentials,
  deliveryMode,
  studentName,
  onPrintSlip,
}: StudentCredentialsPanelProps) {
  const handleCopy = async () => {
    const text = `Login: ${credentials.loginEmail}\nPassword: ${credentials.tempPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Login details copied');
    } catch {
      toast.error('Could not copy — copy manually');
    }
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold">{studentName}&apos;s portal login</p>
        <p className="text-xs text-muted-foreground">
          {deliveryMode === 'email'
            ? credentials.emailSent
              ? 'Email sent to the login address.'
              : `Email failed — copy the details below manually${credentials.emailError ? ` (${credentials.emailError})` : ''}.`
            : 'No email sent — share the details below with the student.'}
        </p>
      </div>
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">Login:</span>{' '}
          <span className="font-mono">{credentials.loginEmail}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Temporary password:</span>{' '}
          <span className="font-mono">{credentials.tempPassword}</span>
        </div>
      </div>
      {deliveryMode === 'email' && !credentials.emailSent && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Delivery failed. Copy the credentials and share them manually.</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleCopy} className="inline-flex items-center gap-1">
          <Copy className="h-3 w-3" /> Copy login details
        </Button>
        {deliveryMode === 'slip' && onPrintSlip && (
          <Button size="sm" onClick={onPrintSlip} className="inline-flex items-center gap-1">
            <Printer className="h-3 w-3" /> Download printable slip
          </Button>
        )}
        {deliveryMode === 'email' && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground self-center">
            <Mail className="h-3 w-3" /> {credentials.emailSent ? 'Email delivered' : 'Email not delivered'}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the panel into StudentAddDialog (functional no-op refactor)**

Replace the existing inline credentials JSX in `StudentAddDialog.tsx` with:

```tsx
{credentials && (
  <StudentCredentialsPanel
    credentials={credentials}
    deliveryMode={deliveryMode /* will be a state variable after D2 — for now hardcode 'email' if the variable doesn't exist yet */}
    studentId={addedStudentId}
    studentName={`${formValues.firstName} ${formValues.lastName}`}
    onPrintSlip={() => {/* wired in D2 */}}
  />
)}
```

If `deliveryMode` state doesn't exist yet (added in D2), pass `'email'` literally for now and rely on D2 to thread the real state through.

Add the import at the top:
```ts
import { StudentCredentialsPanel } from './StudentCredentialsPanel';
```

- [ ] **Step 4: Smoke**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors. Dialog still renders the same UX since the WhatsApp UI is being preserved in this task (D2 drops it via the panel).

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/components/classes/StudentCredentialsPanel.tsx src/components/classes/StudentAddDialog.tsx && git commit -m "$(cat <<'EOF'
refactor(classes): extract StudentCredentialsPanel from inline JSX

Shared credentials display used by Add, Invite, and Regenerate
dialogs. No functional change in this commit — D2 adds slip-mode
behaviour, D3 wires Invite to it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task D2: Delivery-method toggle + slip flow in StudentAddDialog

**Files:**
- Modify: `FE: src/components/classes/StudentAddDialog.tsx`

- [ ] **Step 1: Add the toggle**

At the top of the form (above the existing fields), add a delivery-method toggle. Use `Tabs` or a button group from the existing UI lib — match how toggles appear elsewhere in the codebase (look for `Tabs` usage in another dialog).

Pseudocode:
```tsx
const [deliveryMode, setDeliveryMode] = useState<'email' | 'slip'>('email');

// Inside the dialog body, above the form:
<Tabs value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as 'email' | 'slip')}>
  <TabsList>
    <TabsTrigger value="email">Email invite</TabsTrigger>
    <TabsTrigger value="slip">Printable slip</TabsTrigger>
  </TabsList>
</Tabs>
<p className="text-xs text-muted-foreground mt-2">
  {deliveryMode === 'email'
    ? 'We will email the student their login details.'
    : 'Generate a printable slip with the student\'s login details (no email sent).'}
</p>
```

- [ ] **Step 2: Conditionally require/optional the email field**

Find the email field in the form (likely inside `PersonalEditTab` or directly in the dialog). Conditionalise the required indicator + the form validation:

```tsx
<Label htmlFor="email">
  Email {deliveryMode === 'email' && <span className="text-destructive">*</span>}
</Label>
<Input
  id="email"
  type="email"
  {...register('email', deliveryMode === 'email' ? { required: 'Email is required for email-invite mode' } : {})}
/>
```

If the dialog uses Zod resolver with a fixed schema, replace it with a dynamic resolver that branches on `deliveryMode` — or do the validation manually in the submit handler:

```tsx
const onSubmit = async (data: FormValues) => {
  if (deliveryMode === 'email' && !data.email) {
    setError('email', { type: 'required', message: 'Email is required for email-invite mode' });
    return;
  }
  // ... existing submit logic
};
```

- [ ] **Step 3: Pass deliveryMethod to the API call**

Find where the dialog calls `apiClient.post('/students', ...)` (or whatever hook does it — likely `useTeacherClasses.addStudent`). Pass `deliveryMethod: deliveryMode` in the payload.

Update the hook signature if needed (`addStudent(payload: AddStudentPayload)` where `AddStudentPayload` now includes `deliveryMethod`).

- [ ] **Step 4: Wire slip storage + print button**

After successful create, if `deliveryMode === 'slip'`, write to sessionStorage:

```tsx
import { writeSlip, clearSlip } from '@/lib/student-slip-storage';
import { useSchoolStore } from '@/stores/useSchoolStore';

// Inside the component:
const school = useSchoolStore((s) => s.school);

// In the onSubmit success path, after credentials are received:
if (deliveryMode === 'slip' && credentials && createdStudent) {
  writeSlip({
    studentId: createdStudent.id,
    studentName: `${createdStudent.firstName} ${createdStudent.lastName}`,
    loginEmail: credentials.loginEmail,
    tempPassword: credentials.tempPassword,
    schoolName: school?.name ?? 'Your school',
    loginUrl: `${window.location.origin}/auth/login`,
  });
}

// Pass an onPrintSlip prop to StudentCredentialsPanel:
<StudentCredentialsPanel
  credentials={credentials}
  deliveryMode={deliveryMode}
  studentId={createdStudent.id}
  studentName={`${createdStudent.firstName} ${createdStudent.lastName}`}
  onPrintSlip={() => window.open(`/teacher/students/${createdStudent.id}/credentials/print`, '_blank')}
/>

// On dialog close, clear the slip:
const handleClose = () => {
  if (createdStudent) clearSlip(createdStudent.id);
  onOpenChange(false);
};
```

Make sure the dialog's `onOpenChange` (or close button) calls `handleClose`.

- [ ] **Step 5: Typecheck and smoke**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors.

Manual: open the dialog, try slip mode without an email (should succeed). Try email mode without an email (should block submit). Add a student in slip mode → credentials panel shows print button → click → opens new tab to a 404 (Task D5 creates the print page).

- [ ] **Step 6: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/components/classes/StudentAddDialog.tsx && git commit -m "$(cat <<'EOF'
feat(classes): StudentAddDialog delivery-method toggle + slip flow

Email mode requires email. Slip mode generates synthetic login
email server-side, no email send. Slip mode writes credentials
to sessionStorage on success; print button opens the slip page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task D3: Drop WhatsApp text from InviteStudentDialog + use shared panel

**Files:**
- Modify: `FE: src/components/classes/InviteStudentDialog.tsx`

- [ ] **Step 1: Read existing InviteStudentDialog**

Note the existing credentials display logic. It mirrors `StudentAddDialog`'s inline panel.

- [ ] **Step 2: Replace with shared panel**

Swap the inline JSX for `<StudentCredentialsPanel>` (deliveryMode is always `'email'` here — the invite flow only operates on Roster-only students adding an email).

Drop any reference to `whatsappSent` / `whatsappError` from the dialog's local state, props, or display logic.

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors. If types still complain about `whatsappSent`/`whatsappError`, find and prune all references.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/components/classes/InviteStudentDialog.tsx && git commit -m "$(cat <<'EOF'
refactor(classes): InviteStudentDialog uses shared credentials panel; drops WhatsApp

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task D4: Printable slip page

**Files:**
- Create: `FE: src/app/(dashboard)/teacher/students/[id]/credentials/print/page.tsx`

- [ ] **Step 1: Implement the page**

Create the page:

```tsx
'use client';

import { use, useEffect, useState } from 'react';
import { readSlip, type StudentSlipData } from '@/lib/student-slip-storage';
import { Button } from '@/components/ui/button';

export default function StudentCredentialsPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [slip, setSlip] = useState<StudentSlipData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSlip(readSlip(id));
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    if (loaded && slip) {
      // Auto-trigger the print dialog once the slip is loaded.
      window.print();
    }
  }, [loaded, slip]);

  if (!loaded) return null;

  if (!slip) {
    return (
      <main className="max-w-md mx-auto mt-12 p-6 text-center">
        <h1 className="text-lg font-semibold">Slip expired</h1>
        <p className="text-sm text-muted-foreground mt-2">
          The credentials slip has expired or this page was opened directly.
          Go back to the class roster and use &ldquo;Regenerate credentials&rdquo; to create a new slip.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-8 print:p-0">
      <div className="border rounded-lg p-8 print:border-0 print:p-0 space-y-6">
        <header className="text-center border-b pb-4">
          <h1 className="text-xl font-bold">{slip.schoolName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Student Portal Login</p>
        </header>

        <section className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Student:</span>{' '}
            <span className="font-medium">{slip.studentName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Login URL:</span>{' '}
            <span className="font-mono break-all">{slip.loginUrl}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Login:</span>{' '}
            <span className="font-mono break-all">{slip.loginEmail}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Temporary password:</span>{' '}
            <span className="font-mono">{slip.tempPassword}</span>
          </div>
        </section>

        <section className="rounded-md bg-muted/50 p-3 text-xs">
          <strong>Important:</strong> You will be required to change this password
          on your first login. Keep this slip safe until then.
        </section>

        <footer className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.close()}>Close</Button>
          <Button onClick={() => window.print()}>Print again</Button>
        </footer>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add print styles**

The Tailwind `print:` utility classes already do most of the work (`print:p-0`, `print:border-0`, `print:hidden`). Verify in browser via `Ctrl+P` preview.

- [ ] **Step 3: Smoke test**

Manual: add a student in slip mode → click "Download printable slip" → page opens in new tab → triggers print dialog → cancel print → page shows the slip with the right student data.

Hard-refresh the page after the dialog closes → should show "Slip expired" message.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add "src/app/(dashboard)/teacher/students/[id]/credentials/print/page.tsx" && git commit -m "$(cat <<'EOF'
feat(teacher): printable credentials slip page

Reads from sessionStorage via slip-storage helpers. Auto-prints
on mount. Shows 'Slip expired' message if data is missing or older
than 10 minutes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task D5: RegenerateCredentialsDialog

**Files:**
- Create: `FE: src/components/classes/RegenerateCredentialsDialog.tsx`

- [ ] **Step 1: Implement the dialog**

Create `FE: src/components/classes/RegenerateCredentialsDialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StudentCredentialsPanel, type StudentCredentials } from './StudentCredentialsPanel';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { writeSlip, clearSlip } from '@/lib/student-slip-storage';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  studentEmail: string; // current login email; determines deliveryMode display
}

export function RegenerateCredentialsDialog({
  open, onOpenChange, studentId, studentName, studentEmail,
}: Props) {
  const { regenerateCredentials } = useTeacherClasses();
  const school = useSchoolStore((s) => s.school);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<StudentCredentials | null>(null);
  const deliveryMode: 'email' | 'slip' = studentEmail.endsWith('@students.campusly.local') ? 'slip' : 'email';

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const result = await regenerateCredentials(studentId);
      const creds = result.credentials;
      if (!creds) throw new Error('No credentials returned');
      setCredentials(creds);
      if (deliveryMode === 'slip') {
        writeSlip({
          studentId,
          studentName,
          loginEmail: creds.loginEmail,
          tempPassword: creds.tempPassword,
          schoolName: school?.name ?? 'Your school',
          loginUrl: `${window.location.origin}/auth/login`,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not regenerate credentials';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (credentials) clearSlip(studentId);
    setCredentials(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Regenerate login credentials?</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!credentials ? (
            <p className="text-sm text-muted-foreground">
              This will invalidate <strong>{studentName}</strong>&apos;s current password and
              generate a new one. {studentName.split(' ')[0]} will be forced to change it on next login.
              {' '}
              {deliveryMode === 'email'
                ? `An email with the new credentials will be sent to ${studentEmail}.`
                : `You'll need to print or share the new slip with ${studentName.split(' ')[0]}.`}
            </p>
          ) : (
            <StudentCredentialsPanel
              credentials={credentials}
              deliveryMode={deliveryMode}
              studentId={studentId}
              studentName={studentName}
              onPrintSlip={deliveryMode === 'slip'
                ? () => window.open(`/teacher/students/${studentId}/credentials/print`, '_blank')
                : undefined}
            />
          )}
        </div>

        <DialogFooter>
          {!credentials ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting ? <LoadingSpinner size="sm" /> : 'Regenerate'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/components/classes/RegenerateCredentialsDialog.tsx && git commit -m "$(cat <<'EOF'
feat(classes): RegenerateCredentialsDialog

Confirmation + new credentials display using the shared
StudentCredentialsPanel. Writes to sessionStorage for slip
mode reprint.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task D6: Wire regenerate menu into ClassRosterDialog

**Files:**
- Modify: `FE: src/components/classes/ClassRosterDialog.tsx`

- [ ] **Step 1: Read existing roster row UI**

Identify how each student row is rendered. Note the existing "Portal" / "Roster only" badge logic and the current invite icon for Roster-only students.

- [ ] **Step 2: Add a per-row menu (only for Portal students)**

For each student row where the student has portal access, add a dropdown menu (use the existing UI pattern — likely `DropdownMenu` from `@/components/ui/dropdown-menu`). One item:
- "Regenerate credentials" → opens `RegenerateCredentialsDialog`

For Roster-only students, keep the existing invite icon untouched.

```tsx
// Add to imports:
import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { RegenerateCredentialsDialog } from './RegenerateCredentialsDialog';

// Inside the component, alongside other state:
const [regenStudent, setRegenStudent] = useState<{ id: string; name: string; email: string } | null>(null);

// In each portal-student row:
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setRegenStudent({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      email: student.user?.email ?? '',
    })}>
      Regenerate credentials
    </DropdownMenuItem>
    {/* (existing items if any — preserve them) */}
  </DropdownMenuContent>
</DropdownMenu>

// At the bottom of the component, before the closing tag:
{regenStudent && (
  <RegenerateCredentialsDialog
    open={Boolean(regenStudent)}
    onOpenChange={(o) => { if (!o) setRegenStudent(null); }}
    studentId={regenStudent.id}
    studentName={regenStudent.name}
    studentEmail={regenStudent.email}
  />
)}
```

If the project uses base-ui (not Radix), the DropdownMenu API uses `render` instead of `asChild`. Check existing dropdown usage in another component for the correct shape.

- [ ] **Step 3: Typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/components/classes/ClassRosterDialog.tsx && git commit -m "$(cat <<'EOF'
feat(classes): per-row regenerate-credentials menu in roster

Portal students get a three-dot menu with 'Regenerate credentials'.
Roster-only students keep the existing invite icon.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task D7: MustChangePasswordGate

**Files:**
- Create: `FE: src/components/auth/MustChangePasswordGate.tsx`

- [ ] **Step 1: Implement the gate**

Create `FE: src/components/auth/MustChangePasswordGate.tsx`:

```tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const CHANGE_PASSWORD_PATH = '/auth/change-password';

export function MustChangePasswordGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) {
      router.replace(CHANGE_PASSWORD_PATH);
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (user?.mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) {
    // Redirect in-flight — render nothing to avoid flashing protected content.
    return null;
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/components/auth/MustChangePasswordGate.tsx && git commit -m "$(cat <<'EOF'
feat(auth): MustChangePasswordGate hard-redirect to change-password page

Wraps the student layout. If user.mustChangePassword is true,
redirects to /auth/change-password and renders null while in-flight
to prevent protected content from flashing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task D8: Change-password page

**Files:**
- Create: `FE: src/app/(auth)/change-password/page.tsx`
- Modify: `FE: src/app/(auth)/layout.tsx` (add an exception for the change-password path)

- [ ] **Step 1: Inspect the (auth) layout**

Read `FE: src/app/(auth)/layout.tsx`. If it has a "redirect authenticated users to role root" block (likely checks `isAuthenticated && user`), this would push a logged-in student AWAY from `/auth/change-password` — exactly the wrong behaviour.

Add an exception. Around the redirect logic:

```tsx
const pathname = usePathname();
const isChangePasswordPath = pathname === '/auth/change-password';

useEffect(() => {
  if (isAuthenticated && user && !isChangePasswordPath) {
    router.replace(`/${user.role}`);
  }
}, [isAuthenticated, user, isChangePasswordPath, router]);
```

If the existing layout doesn't have such a redirect, this step is a no-op — but verify by reading the file.

- [ ] **Step 2: Implement the page**

Create `FE: src/app/(auth)/change-password/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, changePassword } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password.');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed');
      // Navigate to the user's role-appropriate root.
      router.replace(user ? `/${user.role}` : '/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not change password';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change your password</CardTitle>
          <CardDescription>
            You&apos;re using a temporary password. Please set a new one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current">Current (temporary) password</Label>
              <Input
                id="current" type="password" autoComplete="current-password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                required disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <Input
                id="new" type="password" autoComplete="new-password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                required disabled={submitting} minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm" type="password" autoComplete="new-password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                required disabled={submitting} minLength={8}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Changing…' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Typecheck and smoke**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```
Zero new errors.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add "src/app/(auth)/change-password/page.tsx" "src/app/(auth)/layout.tsx" && git commit -m "$(cat <<'EOF'
feat(auth): change-password page with route-group bypass

Authenticated route inside (auth). Layout-level "redirect logged-in
users to role root" gets an exception for this path. Posts via
useAuthStore.changePassword and routes to role root on success.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task D9: Wrap student layout in MustChangePasswordGate

**Files:**
- Modify: `FE: src/app/(dashboard)/student/layout.tsx`

- [ ] **Step 1: Update the layout**

The current layout is a slim `<RoleGuard role="student">{children}</RoleGuard>` (from the prior plan's consolidation, commit `04b38c4`). Wrap the children in the new gate:

```tsx
import type { ReactNode } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MustChangePasswordGate } from '@/components/auth/MustChangePasswordGate';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="student">
      <MustChangePasswordGate>
        {children}
      </MustChangePasswordGate>
    </RoleGuard>
  );
}
```

- [ ] **Step 2: Smoke test**

Manual: log in as a student with `mustChangePassword: true` in the database (set it manually via Mongo if needed). Navigate to `/student/lessons`. Expected: redirected to `/auth/change-password`. After successful change, redirected back to `/student`.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add "src/app/(dashboard)/student/layout.tsx" && git commit -m "$(cat <<'EOF'
feat(student): wrap student layout in MustChangePasswordGate

Students with temp passwords cannot access any /student/* route
until they complete the change-password flow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase E — End-to-end smoke verification

### Task E1: Programmatic verification

**Goal:** prove the gap-filling work compiles, all backend tests still pass, and the new endpoints respond as expected.

- [ ] **Step 1: Backend tests**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- --no-file-parallelism 2>&1 | tail -40
```
Expected: all tests pass (existing 205 + ~11 new tests from this plan = ~216).

If any fail, identify whether they're from this plan's tasks or pre-existing flake. Pre-existing flake stays out of scope; new test failures must be fixed.

- [ ] **Step 2: Backend endpoint smoke**

If the dev server is running:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4500/api/auth/change-password
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4500/api/students/000000000000000000000000/regenerate-credentials
```
Expected: HTTP 401 for both (route mounted, auth-gated).

If the dev server isn't running, start it: `npm run dev` then retry. If start fails, note it and skip.

- [ ] **Step 3: Frontend production build**

```bash
cd c:/Users/shaun/campusly-frontend && rm -rf .next && npm run build 2>&1 | tail -50
```
Expected: build succeeds. If a type error surfaces, it's a real bug — fix it before completing.

- [ ] **Step 4: Manual walkthrough checklist**

Walk through these flows with the dev server up and a teacher login:

- [ ] Open Add Student dialog → toggle defaults to "Email invite" → email field is required.
- [ ] Try submitting in email mode with blank email → form blocks with "Email is required".
- [ ] Switch to "Printable slip" → email field becomes optional → submit succeeds.
- [ ] Credentials panel shows "Download printable slip" button → click → new tab opens → slip renders with school name + student name + login email + temp password → print preview triggers.
- [ ] Close dialog → re-open print slip URL directly → "Slip expired" message.
- [ ] In Class Roster, click three-dot menu on a Portal student → "Regenerate credentials" → confirm → new credentials display.
- [ ] Log in as the student with the new temp password → forcibly redirected to `/auth/change-password` → change password → redirected to `/student`.
- [ ] Visit `/student/lessons` directly — should NOT redirect after successful password change.
- [ ] Try `/api/students/<id-from-another-school>/regenerate-credentials` as a teacher → 403/404 (multi-tenant).

- [ ] **Step 5: Inventory commits**

```bash
cd c:/Users/shaun/campusly-backend && git log --oneline --since="3 hours ago" --author="Shaun"
cd c:/Users/shaun/campusly-frontend && git log --oneline --since="3 hours ago" --author="Shaun"
```

Report the list of commits attributable to this plan.

No commit at the end — this is verification only. Fix bugs surfaced during walkthrough with focused per-bug commits.

---

# Done

The four gaps are closed:
1. **No silent failures** — every student gets a usable login via `deliveryMethod: 'email' | 'slip'`.
2. **First-login password change** — hard-gated via `mustChangePassword` flag + frontend gate.
3. **WhatsApp false promise removed** — placeholder fields and UI text stripped.
4. **Credentials recoverable** — regenerate endpoint + roster action + shared credentials panel.

## Self-review checklist (for the engineer)

Before opening a PR:
- [ ] Every backend `findOne` includes `schoolId` + `isDeleted: false`.
- [ ] No frontend `apiClient` import outside `src/hooks/` or `src/stores/`.
- [ ] No `text-red-*` — `text-destructive` instead.
- [ ] No `catch (err)` without `: unknown`.
- [ ] All new files under 350 lines.
- [ ] No `any` types — `grep -nE ': any|as any' src/` returns nothing in new code.
- [ ] `npm test` (backend, `--no-file-parallelism`) — all tests pass.
- [ ] Production build (frontend) — clean.
- [ ] Manual walkthrough completed.
