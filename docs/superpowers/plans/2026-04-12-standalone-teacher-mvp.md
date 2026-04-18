# Standalone Teacher MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable a teacher to sign up standalone (no school/admin), onboard in under 5 minutes, and run their classes end-to-end using the existing teacher portal.

**Architecture:** A standalone teacher gets a "personal school" (`School.plan = 'standalone'`). They hold dual roles `['teacher', 'school_admin']` via an `isStandaloneTeacher` flag on the User model, which grants them access to both teacher and admin endpoints. Students start as roster-only (`Student.userId` optional) and can later be invited to the portal.

**Tech Stack:** Next.js 16 (React 19), Express + MongoDB + Mongoose, Zustand, Tailwind CSS 4, Sonner toasts, React Hook Form + Zod.

**Spec:** `docs/superpowers/specs/2026-04-11-standalone-teacher-mvp-design.md`

---

## File Map

### Backend — New Files
- `src/modules/Auth/standalone.service.ts` — standalone signup + onboarding-status logic
- `src/modules/Student/invite.service.ts` — promote roster-only student to portal user
- `src/middleware/rejectStandalonePlan.ts` — guard to block standalone teachers from admin-only endpoints

### Backend — Modified Files
- `src/modules/School/model.ts` — add `plan`, `ownerUserId` fields
- `src/modules/Auth/model.ts` — add `isStandaloneTeacher`, `onboardingDismissed` fields to IUser + schema
- `src/modules/Student/model.ts` — make `userId` optional
- `src/modules/Auth/routes.ts` — add 3 new routes
- `src/modules/Auth/controller.ts` — add 3 new handlers
- `src/modules/Student/routes.ts` — add invite route
- `src/modules/Student/controller.ts` — add invite handler
- ~20 files with `student.userId` access — add null guards (listed per-file in Task 6)

### Frontend — New Files
- `src/app/signup/teacher/page.tsx` — standalone teacher signup page
- `src/app/(dashboard)/teacher/onboarding/page.tsx` — rewrite existing 3-step → 5-step wizard
- `src/components/onboarding/WelcomeSubjectsStep.tsx` — step 1
- `src/components/onboarding/CurriculumFrameworkStep.tsx` — step 2
- `src/components/onboarding/CreateClassStep.tsx` — step 3
- `src/components/onboarding/AddStudentsStep.tsx` — rewrite existing
- `src/components/onboarding/OnboardingDoneStep.tsx` — step 5
- `src/app/(dashboard)/teacher/students/page.tsx` — cross-class student directory
- `src/components/classes/ClassCard.tsx` — extracted class card
- `src/components/classes/ClassFormDialog.tsx` — create/edit class dialog
- `src/components/classes/ClassRosterDialog.tsx` — student roster per class
- `src/components/classes/StudentAddDialog.tsx` — add students to a class
- `src/hooks/useStandaloneSignup.ts` — signup API call + token handling
- `src/hooks/useOnboardingStatus.ts` — GET /auth/onboarding-status
- `src/hooks/useTeacherStudents.ts` — cross-class student CRUD
- `src/hooks/useIsStandalone.ts` — utility hook
- `src/lib/student-helpers.ts` — `getStudentDisplayName()` helper

### Frontend — Modified Files
- `src/hooks/useTeacherClasses.ts` — add mutations (createClass, updateClass, deleteClass, addStudent, etc.)
- `src/hooks/useAuth.ts` — add `registerStandalone()` method
- `src/stores/useAuthStore.ts` — add `isStandaloneTeacher` to User type handling
- `src/types/common.ts` — make `Student.userId` optional, add `isStandaloneTeacher` to User
- `src/components/layout/Sidebar.tsx` — hide admin links for standalone
- `src/app/login/page.tsx` — add "Sign up as a teacher" link
- `src/app/(dashboard)/teacher/classes/page.tsx` — rewrite to use extracted components + CRUD
- Multiple teacher pages — add/fix empty states

---

## Task 1: Backend — School Model Changes

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\School\model.ts`

- [ ] **Step 1: Add `plan` and `ownerUserId` fields to the ISchool interface**

In the ISchool interface, add after `isDeleted`:

```typescript
plan: 'standalone' | 'school';
ownerUserId?: Types.ObjectId;
```

- [ ] **Step 2: Add fields to the Mongoose schema**

In the school schema definition, add after the `isDeleted` field:

```typescript
plan: {
  type: String,
  enum: ['standalone', 'school'],
  default: 'school',
},
ownerUserId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
},
```

- [ ] **Step 3: Verify backend typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/School/model.ts
git commit -m "feat(school): add plan and ownerUserId fields for standalone teacher support"
```

---

## Task 2: Backend — User Model Changes

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Auth\model.ts`

- [ ] **Step 1: Add `isStandaloneTeacher` and `onboardingDismissed` to the IUser interface**

Add after `isCounselor`:

```typescript
isStandaloneTeacher: boolean;
onboardingDismissed: boolean;
```

- [ ] **Step 2: Add fields to the Mongoose schema**

Add after the `isCounselor` schema field:

```typescript
isStandaloneTeacher: {
  type: Boolean,
  default: false,
},
onboardingDismissed: {
  type: Boolean,
  default: false,
},
```

- [ ] **Step 3: Update the JWT payload in `AuthService.generateTokenPair`**

In `src/modules/Auth/service.ts`, in the `generateTokenPair` method's payload object, add:

```typescript
isStandaloneTeacher: user.isStandaloneTeacher ?? false,
```

- [ ] **Step 4: Update the `AuthenticatedUser` interface**

In `src/types/authenticated-request.ts`, add to the interface:

```typescript
isStandaloneTeacher?: boolean;
```

- [ ] **Step 5: Verify backend typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/Auth/model.ts src/modules/Auth/service.ts src/types/authenticated-request.ts
git commit -m "feat(auth): add isStandaloneTeacher and onboardingDismissed fields to User"
```

---

## Task 3: Backend — Student.userId Optional

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Student\model.ts`

- [ ] **Step 1: Make `userId` optional in the IStudent interface**

Change:
```typescript
userId: Types.ObjectId;
```
To:
```typescript
userId?: Types.ObjectId;
```

- [ ] **Step 2: Make `userId` not required in the Mongoose schema**

In the student schema, change the `userId` field from `required: true` to `required: false`:

```typescript
userId: {
  type: Schema.Types.ObjectId,
  ref: 'User',
  required: false,
},
```

- [ ] **Step 3: Verify backend typecheck passes**

Run: `npx tsc --noEmit`

Expected: Type errors in ~20 files that access `student.userId` without null checks. These are fixed in Task 6.

- [ ] **Step 4: Commit (with known type errors — Task 6 fixes them)**

```bash
git add src/modules/Student/model.ts
git commit -m "feat(student): make userId optional for roster-only students"
```

---

## Task 4: Backend — Standalone Signup Service

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\Auth\standalone.service.ts`

- [ ] **Step 1: Create the standalone service file**

```typescript
import { User, IUser } from './model.js';
import { School } from '../School/model.js';
import { AuthService } from './service.js';
import { ConflictError } from '../../common/errors.js';
import type { TokenPair } from './service.js';
import crypto from 'crypto';

function generateJoinCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

interface StandaloneSignupInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country?: string;
  subjects?: string[];
}

export class StandaloneService {
  static async signup(data: StandaloneSignupInput): Promise<{ user: IUser; tokens: TokenPair }> {
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const schoolName = `${data.firstName}'s Classroom`;

    // Create the personal school for this standalone teacher
    const school = await School.create({
      name: schoolName,
      plan: 'standalone',
      type: 'combined',
      address: {
        street: 'TBD',
        city: 'TBD',
        province: 'TBD',
        postalCode: '0000',
        country: data.country ?? 'South Africa',
      },
      contactInfo: {
        email: data.email.toLowerCase(),
        phone: '0000000000',
      },
      subscription: {
        tier: 'basic',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      modulesEnabled: [
        'auth', 'academic', 'ai_tools', 'teacher_workbench',
        'learning', 'homework', 'attendance', 'incident_wellbeing',
        'communication',
      ],
      settings: {
        academicYear: new Date().getFullYear(),
        terms: 4,
        gradingSystem: 'percentage',
      },
      principal: `${data.firstName} ${data.lastName}`,
      joinCode: generateJoinCode(),
      isActive: true,
    });

    // Backfill ownerUserId after user creation
    const user = await User.create({
      email: data.email.toLowerCase(),
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'teacher',
      schoolId: school._id,
      isSchoolPrincipal: true,
      isStandaloneTeacher: true,
    });

    // Link the school back to the owner
    school.ownerUserId = user._id;
    await school.save();

    const tokens = AuthService.generateTokenPair(user);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    return { user, tokens };
  }

  static async getOnboardingStatus(
    userId: string,
    schoolId: string,
  ): Promise<{
    hasClass: boolean;
    hasStudent: boolean;
    hasFramework: boolean;
    dismissed: boolean;
  }> {
    // Import models lazily to avoid circular deps
    const { Class } = await import('../Academic/model.js');
    const { Student } = await import('../Student/model.js');

    const [classCount, studentCount, user] = await Promise.all([
      Class.countDocuments({ schoolId, isDeleted: false }),
      Student.countDocuments({ schoolId, isDeleted: false }),
      User.findById(userId).lean(),
    ]);

    return {
      hasClass: classCount > 0,
      hasStudent: studentCount > 0,
      hasFramework: false, // TODO: check CurriculumStructure when wired
      dismissed: user?.onboardingDismissed ?? false,
    };
  }

  static async dismissOnboarding(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $set: { onboardingDismissed: true } });
  }
}
```

- [ ] **Step 2: Verify backend typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors (aside from Student.userId ones from Task 3).

- [ ] **Step 3: Commit**

```bash
git add src/modules/Auth/standalone.service.ts
git commit -m "feat(auth): add StandaloneService for standalone teacher signup + onboarding status"
```

---

## Task 5: Backend — Standalone Routes + Controller

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Auth\controller.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Auth\routes.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Auth\validation.ts`

- [ ] **Step 1: Add validation schema for standalone signup**

In `validation.ts`, add:

```typescript
export const standaloneSignupSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    country: z.string().optional(),
    subjects: z.array(z.string()).optional(),
  }),
});
```

- [ ] **Step 2: Add controller handlers**

In `controller.ts`, add these static methods to `AuthController`:

```typescript
static async signupStandalone(req: Request, res: Response): Promise<void> {
  const { user, tokens } = await StandaloneService.signup(req.body);

  const safeUser = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    schoolId: user.schoolId,
    isStandaloneTeacher: user.isStandaloneTeacher,
  };

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json(apiResponse(true, { user: safeUser, accessToken: tokens.accessToken }, 'Standalone teacher registered successfully'));
}

static async getOnboardingStatus(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const status = await StandaloneService.getOnboardingStatus(user.id, user.schoolId!);
  res.json(apiResponse(true, status, 'Onboarding status retrieved'));
}

static async dismissOnboarding(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  await StandaloneService.dismissOnboarding(user.id);
  res.json(apiResponse(true, undefined, 'Onboarding dismissed'));
}
```

Add the import at the top of the controller:
```typescript
import { StandaloneService } from './standalone.service.js';
```

- [ ] **Step 3: Add routes**

In `routes.ts`, add after existing auth routes:

```typescript
// ─── Standalone Teacher ──────────────────────────────────────────────────────
router.post(
  '/signup/standalone-teacher',
  validate(standaloneSignupSchema),
  AuthController.signupStandalone,
);

router.get(
  '/onboarding-status',
  authenticate,
  AuthController.getOnboardingStatus,
);

router.post(
  '/onboarding-dismiss',
  authenticate,
  AuthController.dismissOnboarding,
);
```

Add `standaloneSignupSchema` to the validation import and `authenticate` if not already imported.

- [ ] **Step 4: Verify backend typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors (aside from Student.userId ones from Task 3).

- [ ] **Step 5: Commit**

```bash
git add src/modules/Auth/controller.ts src/modules/Auth/routes.ts src/modules/Auth/validation.ts
git commit -m "feat(auth): add standalone teacher signup, onboarding-status, and dismiss endpoints"
```

---

## Task 6: Backend — Student.userId Null Guards

This task fixes every backend file that accesses `student.userId` without handling the case where it's undefined (roster-only student). The pattern is: guard with `if (student.userId)` before using it, or skip the operation for roster-only students.

**Files to modify (each gets a null guard):**

- [ ] **Step 1: Create `getStudentDisplayName` helper**

Create `c:\Users\shaun\campusly-backend\src\common\student-helpers.ts`:

```typescript
/**
 * Safely extract a display name from a student record, handling both
 * portal students (with populated userId/user) and roster-only students.
 */
export function getStudentDisplayName(
  student: Record<string, unknown>,
): string {
  // Populated user object
  const user = (student.userId ?? student.user) as Record<string, unknown> | undefined;
  if (user && typeof user === 'object' && user.firstName) {
    return `${user.firstName} ${user.lastName ?? ''}`.trim();
  }
  // Roster-only — fall back to admission number or generic
  const admission = student.admissionNumber as string | undefined;
  return admission ?? 'Unknown Student';
}
```

- [ ] **Step 2: Add null guards to job files**

For each of these files, wrap the `student.userId` access in an `if (student.userId)` guard. If the surrounding logic requires a user (e.g., sending a notification), skip the student with `continue`:

- `src/jobs/attendance-alert.job.ts:81` — guard: `if (!student.userId) continue;`
- `src/jobs/collections-escalation.job.ts:104` — guard: `if (!student.userId) continue;`
- `src/jobs/low-balance-alert.job.ts:71` — guard: `if (!student.userId) continue;`
- `src/jobs/payment-reminder.job.ts:68` — guard: `if (!student.userId) continue;`

- [ ] **Step 3: Add null guards to service files**

For each of these files, add `if (!student.userId) return null;` or `if (!student.userId) continue;` as appropriate. These are cases where the operation only makes sense for portal students:

- `src/modules/AITutor/report.service.ts:38`
- `src/modules/AITutor/parent.service.ts:48`
- `src/modules/Achiever/gamification.service.ts:290`
- `src/modules/Attendance/chronic-absence.service.ts:160`
- `src/modules/Career/services/application.service.ts:181`
- `src/modules/Course/service-student.ts:310`
- `src/modules/Course/service-progress.ts:338`
- `src/modules/Course/service-certificates.ts:139, 243`
- `src/modules/Digest/service.ts:83, 161, 249`
- `src/modules/Notification/service.ts:101, 107, 113`
- `src/modules/Report/services/student360.service.ts:53`
- `src/modules/Student/transcript.service.ts:101`

For lookup queries (where `student.userId` is used in a query filter rather than a dereference), the guard is slightly different — add `undefined` check before the query:

- `src/modules/Library/service.ts:281`
- `src/modules/Learning/services/quiz.service.ts:252`
- `src/modules/Academic/services/misc.service.ts:318`
- `src/modules/Academic/services/assessment.service.ts:387`

- [ ] **Step 4: Verify backend typecheck passes — ALL errors resolved**

Run: `npx tsc --noEmit`
Expected: Clean — zero errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(student): add null guards for optional userId across all backend consumers"
```

---

## Task 7: Backend — Student Invite Endpoint

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\Student\invite.service.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Student\controller.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Student\routes.ts`

- [ ] **Step 1: Create the invite service**

```typescript
import { Student } from './model.js';
import { User } from '../Auth/model.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors.js';
import crypto from 'crypto';

export class StudentInviteService {
  /**
   * Promote a roster-only student to a portal user.
   * Creates a User record with role='student', links it via Student.userId,
   * and generates a temporary password. In production this would send an
   * email invite; for MVP it returns the temp password so the teacher
   * can share it.
   */
  static async inviteStudent(
    studentId: string,
    schoolId: string,
    data: { email: string },
  ): Promise<{ tempPassword: string }> {
    const student = await Student.findOne({ _id: studentId, schoolId, isDeleted: false });
    if (!student) throw new NotFoundError('Student not found');

    if (student.userId) {
      throw new ConflictError('Student already has a portal account');
    }

    if (!data.email) {
      throw new BadRequestError('Email is required to invite a student');
    }

    // Check email isn't already taken
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    // Generate a temporary password
    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars

    // Create the student's user account
    const user = await User.create({
      email: data.email.toLowerCase(),
      password: tempPassword,
      firstName: student.admissionNumber, // placeholder — teacher can update
      lastName: '',
      role: 'student',
      schoolId,
    });

    // Link the student record to the new user
    student.userId = user._id;
    await student.save();

    return { tempPassword };
  }
}
```

- [ ] **Step 2: Add controller handler**

In `src/modules/Student/controller.ts`, add:

```typescript
static async inviteStudent(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const schoolId = user.schoolId!;
  const result = await StudentInviteService.inviteStudent(
    req.params.id as string,
    schoolId,
    req.body,
  );
  res.json(apiResponse(true, result, 'Student invited successfully'));
}
```

Add import: `import { StudentInviteService } from './invite.service.js';`

- [ ] **Step 3: Add route**

In `src/modules/Student/routes.ts`, add:

```typescript
router.post(
  '/:id/invite',
  authenticate,
  authorize('super_admin', 'school_admin', 'teacher'),
  StudentController.inviteStudent,
);
```

- [ ] **Step 4: Verify backend typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Student/invite.service.ts src/modules/Student/controller.ts src/modules/Student/routes.ts
git commit -m "feat(student): add invite endpoint to promote roster-only students to portal users"
```

---

## Task 8: Backend — rejectStandalonePlan Middleware

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\middleware\rejectStandalonePlan.ts`

- [ ] **Step 1: Create the middleware**

```typescript
import type { Request, Response, NextFunction } from 'express';
import { School } from '../modules/School/model.js';
import { ForbiddenError } from '../common/errors.js';

/**
 * Rejects requests from standalone teachers trying to access admin-only
 * endpoints. Defense in depth — the frontend already hides these links.
 */
export async function rejectStandalonePlan(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const schoolId = req.user?.schoolId;
  if (!schoolId) return next();

  const school = await School.findById(schoolId).select('plan').lean();
  if (school?.plan === 'standalone') {
    throw new ForbiddenError('This feature is not available for standalone teacher accounts');
  }

  next();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware/rejectStandalonePlan.ts
git commit -m "feat(middleware): add rejectStandalonePlan guard for admin-only endpoints"
```

---

## Task 9: Frontend — Type Changes

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\types\common.ts`
- Create: `c:\Users\shaun\campusly-frontend\src\lib\student-helpers.ts`

- [ ] **Step 1: Make Student.userId optional and add isStandaloneTeacher to User**

In `src/types/common.ts`, change the Student interface:
```typescript
userId?: string;  // was: userId: string; — optional for roster-only students
user?: User;      // was: user: User;
```

In the User interface, add:
```typescript
isStandaloneTeacher?: boolean;
```

- [ ] **Step 2: Create the getStudentDisplayName helper**

Create `src/lib/student-helpers.ts`:

```typescript
import { resolveField } from '@/lib/api-helpers';
import type { Student } from '@/types';

/**
 * Safely extract a display name from a student, handling both portal
 * students (with populated user) and roster-only students (userId is null).
 * Replaces scattered `student.user.firstName` / `student.userId.firstName`
 * patterns that crash on roster-only students.
 */
export function getStudentDisplayName(student: Student): {
  first: string;
  last: string;
  full: string;
} {
  const userObj = student.user ?? student.userId;
  const first =
    resolveField<string>(userObj, 'firstName')
    ?? resolveField<string>(student, 'firstName')
    ?? student.admissionNumber
    ?? '';
  const last =
    resolveField<string>(userObj, 'lastName')
    ?? resolveField<string>(student, 'lastName')
    ?? '';
  const full = `${first} ${last}`.trim();
  return { first, last, full: full || student.admissionNumber || 'Unknown Student' };
}

/**
 * Whether this student has a portal login (userId is set).
 */
export function isPortalStudent(student: Student): boolean {
  return !!student.userId;
}
```

- [ ] **Step 3: Verify frontend typecheck passes**

Run: `npx tsc --noEmit`
Expected: Some type errors in files that assume `student.userId` is always defined (e.g., the classes page `getStudentName` function). These will be fixed when we rewrite those pages in later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/types/common.ts src/lib/student-helpers.ts
git commit -m "feat(types): make Student.userId optional, add student display name helper"
```

---

## Task 10: Frontend — useIsStandalone Hook

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useIsStandalone.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useAuthStore } from '@/stores/useAuthStore';

/**
 * Returns true if the current user is a standalone teacher (personal school,
 * no admin above them). Used for UI gating — hiding admin links, adjusting
 * empty states, etc.
 */
export function useIsStandalone(): boolean {
  const user = useAuthStore((s) => s.user);
  return (user as unknown as { isStandaloneTeacher?: boolean })?.isStandaloneTeacher === true;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useIsStandalone.ts
git commit -m "feat(hooks): add useIsStandalone utility hook"
```

---

## Task 11: Frontend — Standalone Signup Page

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useStandaloneSignup.ts`
- Create: `c:\Users\shaun\campusly-frontend\src\app\signup\teacher\page.tsx`

- [ ] **Step 1: Create the signup hook**

```typescript
import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse } from '@/lib/api-helpers';

interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country?: string;
}

interface SignupResult {
  user: Record<string, unknown>;
  accessToken: string;
}

export function useStandaloneSignup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);

  const signup = async (data: SignupPayload): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/auth/signup/standalone-teacher', data);
      const result = unwrapResponse<SignupResult>(res);

      // Store tokens + user in auth store (same as regular login)
      login(
        result.user as unknown as Parameters<typeof login>[0],
        { accessToken: result.accessToken, refreshToken: '' },
      );
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Signup failed. Please try again.';
      setError(message === 'A user with this email already exists'
        ? 'An account with this email already exists. Try signing in instead.'
        : message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { signup, loading, error };
}
```

- [ ] **Step 2: Create the signup page**

Create `src/app/signup/teacher/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStandaloneSignup } from '@/hooks/useStandaloneSignup';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function TeacherSignupPage() {
  const router = useRouter();
  const { signup, loading, error } = useStandaloneSignup();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      await signup({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      toast.success('Welcome to Campusly!');
      router.push('/teacher/onboarding');
    } catch {
      // error state handled by hook
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Start teaching with Campusly"
        description="Create your free teacher account in 30 seconds"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                {...register('firstName', { required: 'First name is required' })}
                placeholder="Jane"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                {...register('lastName', { required: 'Last name is required' })}
                placeholder="Smith"
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
              })}
              placeholder="jane@example.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
              placeholder="At least 8 characters"
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Confirm password <span className="text-destructive">*</span>
            </Label>
            <PasswordInput
              id="confirmPassword"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === watch('password') || 'Passwords do not match',
              })}
              placeholder="Repeat your password"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create my classroom'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
```

- [ ] **Step 3: Add "Sign up as a teacher" link to the login page**

In `src/app/login/page.tsx`, find the existing links section and add:

```tsx
<Link href="/signup/teacher" className="text-primary hover:underline">
  Sign up as a standalone teacher
</Link>
```

- [ ] **Step 4: Verify frontend typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStandaloneSignup.ts src/app/signup/teacher/page.tsx src/app/login/page.tsx
git commit -m "feat(signup): add standalone teacher signup page and hook"
```

---

## Task 12: Frontend — Onboarding Wizard Rewrite (5-step)

**Files:**
- Rewrite: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\onboarding\page.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\onboarding\WelcomeSubjectsStep.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\onboarding\CurriculumFrameworkStep.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\onboarding\CreateClassStep.tsx`
- Modify: `c:\Users\shaun\campusly-frontend\src\components\onboarding\AddStudentsStep.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\onboarding\OnboardingDoneStep.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useOnboardingStatus.ts`

This is a large task. The orchestrator page manages 5 steps with skip/resume semantics. Each step component is a focused file under 200 lines.

- [ ] **Step 1: Create useOnboardingStatus hook**

```typescript
// src/hooks/useOnboardingStatus.ts
import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

interface OnboardingStatus {
  hasClass: boolean;
  hasStudent: boolean;
  hasFramework: boolean;
  dismissed: boolean;
}

export function useOnboardingStatus() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiClient.get('/auth/onboarding-status');
        setStatus(unwrapResponse<OnboardingStatus>(res));
      } catch (err: unknown) {
        console.error('Failed to fetch onboarding status', err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  // Derive first incomplete step
  const firstIncompleteStep = status
    ? !status.hasClass
      ? 3 // skip to class creation (steps 1-2 are optional)
      : !status.hasStudent
        ? 4
        : 5
    : 1;

  return { status, loading, firstIncompleteStep };
}
```

- [ ] **Step 2: Create WelcomeSubjectsStep**

This is a rewrite of the existing `GradesSubjectsStep.tsx` — same subject toggles, but no grades (grades are created inline during class creation in step 3).

```tsx
// src/components/onboarding/WelcomeSubjectsStep.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ChevronRight, SkipForward } from 'lucide-react';

const DEFAULT_SUBJECTS = [
  'Mathematics', 'English', 'Afrikaans', 'Life Sciences', 'Physical Sciences',
  'Geography', 'History', 'Business Studies', 'Accounting', 'Economics',
  'Life Orientation', 'Technology', 'Natural Sciences', 'Social Sciences',
  'Creative Arts', 'EMS', 'Computer Applications',
];

interface WelcomeSubjectsStepProps {
  onNext: (subjects: string[]) => Promise<void>;
  onSkip: () => void;
  isLoading: boolean;
}

export function WelcomeSubjectsStep({ onNext, onSkip, isLoading }: WelcomeSubjectsStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Welcome! What do you teach?</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Select the subjects you teach. You can always add more later.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {DEFAULT_SUBJECTS.map((name) => (
          <Badge
            key={name}
            variant={selected.has(name) ? 'default' : 'outline'}
            className="cursor-pointer text-sm px-3 py-1.5"
            onClick={() => toggle(name)}
          >
            {name}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onSkip} disabled={isLoading}>
          <SkipForward className="mr-1 h-4 w-4" /> Skip for now
        </Button>
        <Button
          onClick={() => onNext(Array.from(selected))}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Continue'}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create CurriculumFrameworkStep**

```tsx
// src/components/onboarding/CurriculumFrameworkStep.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Library, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

const FRAMEWORKS = [
  { id: 'caps', name: 'CAPS', description: 'South African Curriculum & Assessment Policy' },
  { id: 'cambridge', name: 'Cambridge', description: 'Cambridge International Curriculum' },
  { id: 'ib', name: 'IB', description: 'International Baccalaureate' },
  { id: 'custom', name: 'Custom', description: 'I\'ll set up my own curriculum' },
];

interface CurriculumFrameworkStepProps {
  onNext: (frameworkId: string) => Promise<void>;
  onBack: () => void;
  onSkip: () => void;
  isLoading: boolean;
}

export function CurriculumFrameworkStep({
  onNext, onBack, onSkip, isLoading,
}: CurriculumFrameworkStepProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Library className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Choose a curriculum framework</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This helps Campusly align content, assessments, and pacing guides to your curriculum.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FRAMEWORKS.map((fw) => (
          <Card
            key={fw.id}
            className={cn(
              'cursor-pointer transition-colors hover:bg-muted/50',
              selected === fw.id && 'ring-2 ring-primary',
            )}
            onClick={() => setSelected(fw.id)}
          >
            <CardContent className="p-4">
              <h3 className="font-semibold">{fw.name}</h3>
              <p className="text-sm text-muted-foreground">{fw.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onBack} disabled={isLoading}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button variant="ghost" onClick={onSkip} disabled={isLoading}>
            <SkipForward className="mr-1 h-4 w-4" /> Skip
          </Button>
        </div>
        <Button
          onClick={() => selected && onNext(selected)}
          disabled={!selected || isLoading}
        >
          {isLoading ? 'Setting up...' : 'Continue'}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create CreateClassStep**

```tsx
// src/components/onboarding/CreateClassStep.tsx
'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, ChevronRight, ChevronLeft } from 'lucide-react';
import { GRADE_LEVELS } from '@/lib/constants';

interface CreateClassFormData {
  gradeName: string;
  className: string;
  capacity: number;
}

interface CreateClassStepProps {
  onNext: (data: CreateClassFormData) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

export function CreateClassStep({ onNext, onBack, isLoading }: CreateClassStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateClassFormData>({
    defaultValues: { capacity: 35 },
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Create your first class</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          You need at least one class to start using attendance, grades, and homework.
        </p>
      </div>

      <form onSubmit={handleSubmit(onNext)} className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="gradeName">
            Grade <span className="text-destructive">*</span>
          </Label>
          <Select
            onValueChange={(val: unknown) => setValue('gradeName', val as string)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.gradeName && (
            <p className="text-xs text-destructive">{errors.gradeName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="className">
            Class name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="className"
            {...register('className', { required: 'Class name is required' })}
            placeholder='e.g. "A", "Blue", "Mrs Smith"'
          />
          {errors.className && (
            <p className="text-xs text-destructive">{errors.className.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            {...register('capacity', { valueAsNumber: true, min: 1, max: 200 })}
          />
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="ghost" onClick={onBack} disabled={isLoading}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create class'}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Create OnboardingDoneStep**

```tsx
// src/components/onboarding/OnboardingDoneStep.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ClipboardList, BookOpen, Library } from 'lucide-react';

interface OnboardingDoneStepProps {
  onFinish: () => void;
}

const QUICK_LINKS = [
  { label: 'Take attendance', href: '/teacher/attendance', icon: ClipboardList },
  { label: 'Assign homework', href: '/teacher/curriculum', icon: BookOpen },
  { label: 'Explore curriculum', href: '/teacher/curriculum', icon: Library },
];

export function OnboardingDoneStep({ onFinish }: OnboardingDoneStepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
        <CheckCircle className="h-8 w-8 text-emerald-600" />
      </div>
      <h2 className="text-xl font-semibold">You&apos;re all set!</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Your classroom is ready. Here are some things you can do next:
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href + link.label} href={link.href}>
            <Card className="cursor-pointer transition-colors hover:bg-muted/50 h-full">
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <link.icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{link.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Button onClick={onFinish} size="lg">
        Go to dashboard
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Rewrite the onboarding page orchestrator**

Rewrite `src/app/(dashboard)/teacher/onboarding/page.tsx` to use the 5-step flow. The existing `useTeacherOnboarding` hook is reused for mutations. The new `useOnboardingStatus` hook drives skip/resume.

The page should:
1. Fetch onboarding status and derive the starting step.
2. Render a 5-step progress bar.
3. For each step, call the appropriate component.
4. Step 3 (Create Class) creates a Grade if it doesn't exist, then creates the Class.
5. Step 5 calls `POST /auth/onboarding-dismiss` and redirects to `/teacher`.

Approximate structure (orchestrator under 150 lines):

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useTeacherOnboarding } from '@/hooks/useTeacherOnboarding';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { GRADE_LEVELS } from '@/lib/constants';
import { WelcomeSubjectsStep } from '@/components/onboarding/WelcomeSubjectsStep';
import { CurriculumFrameworkStep } from '@/components/onboarding/CurriculumFrameworkStep';
import { CreateClassStep } from '@/components/onboarding/CreateClassStep';
import { AddStudentsStep } from '@/components/onboarding/AddStudentsStep';
import { OnboardingDoneStep } from '@/components/onboarding/OnboardingDoneStep';
import { LoadingSpinner } from '@/components/shared';
import { useGrades } from '@/hooks/useAcademics';

const STEP_LABELS = ['Subjects', 'Curriculum', 'First Class', 'Students', 'Done'];

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const { status, loading: statusLoading } = useOnboardingStatus();
  const { createGrade, createSubject, createStudent, bulkCreateStudents } = useTeacherOnboarding();
  const { grades, refetch: refetchGrades } = useGrades();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdClassId, setCreatedClassId] = useState<string | null>(null);

  // Resume at first incomplete step
  useEffect(() => {
    if (status && status.hasClass) setStep(status.hasStudent ? 5 : 4);
  }, [status]);

  const handleSubjects = useCallback(async (subjects: string[]) => {
    if (subjects.length === 0) { setStep(2); return; }
    setIsLoading(true);
    try {
      for (const name of subjects) {
        const code = name.substring(0, 3).toUpperCase();
        await createSubject(name, code, []);
      }
      toast.success(`Added ${subjects.length} subjects`);
      setStep(2);
    } catch { toast.error('Failed to save subjects'); }
    finally { setIsLoading(false); }
  }, [createSubject]);

  const handleFramework = useCallback(async (_frameworkId: string) => {
    // Framework seeding is Phase 2 — for now just advance
    setStep(3);
  }, []);

  const handleCreateClass = useCallback(async (data: { gradeName: string; className: string; capacity: number }) => {
    setIsLoading(true);
    try {
      // Find or create the grade
      let grade = grades.find((g) => g.name === data.gradeName);
      if (!grade) {
        const orderIndex = GRADE_LEVELS.indexOf(data.gradeName as typeof GRADE_LEVELS[number]);
        grade = await createGrade(data.gradeName, orderIndex >= 0 ? orderIndex : 0);
        await refetchGrades();
      }
      // Create the class via existing admin endpoint
      const res = await apiClient.post('/academic/classes', {
        name: data.className,
        gradeId: grade.id,
        capacity: data.capacity,
        schoolId: grade.schoolId ?? (grades[0] as unknown as { schoolId?: string })?.schoolId,
      });
      const cls = (res.data?.data ?? res.data) as { _id?: string; id?: string };
      setCreatedClassId(cls.id ?? cls._id ?? null);
      toast.success('Class created!');
      setStep(4);
    } catch { toast.error('Failed to create class'); }
    finally { setIsLoading(false); }
  }, [grades, createGrade, refetchGrades]);

  const handleFinish = useCallback(async () => {
    try { await apiClient.post('/auth/onboarding-dismiss'); } catch { /* non-critical */ }
    toast.success('Onboarding complete! Welcome to Campusly.');
    router.push('/teacher');
  }, [router]);

  if (statusLoading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-12">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                i + 1 <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>
              <span className="hidden sm:inline text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {step === 1 && <WelcomeSubjectsStep onNext={handleSubjects} onSkip={() => setStep(2)} isLoading={isLoading} />}
        {step === 2 && <CurriculumFrameworkStep onNext={handleFramework} onBack={() => setStep(1)} onSkip={() => setStep(3)} isLoading={isLoading} />}
        {step === 3 && <CreateClassStep onNext={handleCreateClass} onBack={() => setStep(2)} isLoading={isLoading} />}
        {step === 4 && <AddStudentsStep grades={grades} onCreateStudent={createStudent} onBulkCreate={bulkCreateStudents} onBack={() => setStep(3)} onFinish={() => setStep(5)} isLoading={isLoading} />}
        {step === 5 && <OnboardingDoneStep onFinish={handleFinish} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Verify frontend typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\)/teacher/onboarding/page.tsx src/components/onboarding/ src/hooks/useOnboardingStatus.ts
git commit -m "feat(onboarding): rewrite to 5-step wizard with curriculum framework and class creation"
```

---

## Task 13: Frontend — useTeacherClasses Mutations

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\hooks\useTeacherClasses.ts`

- [ ] **Step 1: Add CRUD mutations to the hook**

Add these methods after the existing `useEffect` block, inside the hook function. Each calls the existing backend endpoints that standalone teachers can access because they hold the `school_admin` role:

```typescript
const createClass = async (data: {
  name: string;
  gradeId: string;
  capacity?: number;
  schoolId: string;
}): Promise<SchoolClass> => {
  const res = await apiClient.post('/academic/classes', data);
  const cls = unwrapResponse<SchoolClass>(res);
  // Refresh the full teaching load
  // (simple approach — could optimistically insert later)
  window.location.reload();
  return cls;
};

const updateClass = async (
  id: string,
  data: Partial<{ name: string; capacity: number }>,
): Promise<void> => {
  await apiClient.put(`/academic/classes/${id}`, data);
  window.location.reload();
};

const deleteClass = async (id: string): Promise<void> => {
  await apiClient.delete(`/academic/classes/${id}`);
  window.location.reload();
};

const addStudent = async (data: {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gradeId: string;
  classId: string;
  schoolId: string;
}): Promise<void> => {
  await apiClient.post('/students', data);
};

const inviteStudent = async (
  studentId: string,
  email: string,
): Promise<{ tempPassword: string }> => {
  const res = await apiClient.post(`/students/${studentId}/invite`, { email });
  return unwrapResponse<{ tempPassword: string }>(res);
};
```

Update the return statement to include the new methods:

```typescript
return { classes, students, entries, homeroom, loading, createClass, updateClass, deleteClass, addStudent, inviteStudent };
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTeacherClasses.ts
git commit -m "feat(hooks): add class CRUD and student invite mutations to useTeacherClasses"
```

---

## Task 14: Frontend — Classes Page Rewrite with CRUD

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\components\classes\ClassCard.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\classes\ClassFormDialog.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\classes\ClassRosterDialog.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\classes\StudentAddDialog.tsx`
- Rewrite: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\classes\page.tsx`

This is a large extraction. The current page is ~230 lines with inline card rendering and an inline student list dialog. Extract into focused components per the spec:

- [ ] **Step 1: Create ClassCard component**

Extract the card rendering from the current page. Each card shows: homeroom/subject badge, grade + class name, subject name, student count / capacity bar, quick-action buttons (Attendance, Grades). Under 100 lines.

- [ ] **Step 2: Create ClassFormDialog**

A dialog for creating or editing a class. Fields: grade (Select from GRADE_LEVELS), class name, capacity. Uses React Hook Form. Under 120 lines.

- [ ] **Step 3: Create StudentAddDialog**

Two tabs: Manual entry (firstName, lastName, admissionNumber with "Add another" button) and CSV paste (textarea). Calls `addStudent` from the hook. Under 150 lines.

- [ ] **Step 4: Create ClassRosterDialog**

The student list dialog extracted from the current page. Adds: "Add students" button that opens `StudentAddDialog`, "Invite to portal" per row showing portal status, join-code card. Under 180 lines.

- [ ] **Step 5: Rewrite the page as a thin orchestrator**

The page becomes ~80 lines: imports, the hook call, a PageHeader with "Create class" button, a grid of `ClassCard` components, the `ClassFormDialog`, and the `ClassRosterDialog`.

- [ ] **Step 6: Verify frontend typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/classes/ src/app/\(dashboard\)/teacher/classes/page.tsx
git commit -m "feat(classes): rewrite classes page with CRUD, extracted components, and student management"
```

---

## Task 15: Frontend — Teacher Students Directory Page

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\students\page.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useTeacherStudents.ts`
- Modify: `c:\Users\shaun\campusly-frontend\src\lib\constants.ts`

- [ ] **Step 1: Create useTeacherStudents hook**

```typescript
// src/hooks/useTeacherStudents.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Student } from '@/types';

export function useTeacherStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await apiClient.get('/students');
      setStudents(unwrapList<Student>(res));
    } catch (err: unknown) {
      console.error('Failed to load students', err);
      toast.error('Could not load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const deleteStudent = async (id: string) => {
    await apiClient.delete(`/students/${id}`);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    toast.success('Student removed');
  };

  return { students, loading, refetch: fetchStudents, deleteStudent };
}
```

- [ ] **Step 2: Create the Students directory page**

A DataTable page with columns: Name, Admission #, Class, Portal Status (badge: "Invited" / "Not invited"), Actions (Edit, Invite, Delete). Filters: class dropdown, portal status, search. Under 200 lines.

- [ ] **Step 3: Add "Students" as a child of "Classes" in the sidebar nav**

In `src/lib/constants.ts`, update the `TEACHER_NAV` to make Classes a group with children:

```typescript
{
  label: 'Classes',
  href: ROUTES.TEACHER_CLASSES,
  icon: Users,
  children: [
    { label: 'My Classes', href: ROUTES.TEACHER_CLASSES, icon: Users },
    { label: 'Students', href: '/teacher/students', icon: GraduationCap },
  ],
},
```

Add `TEACHER_STUDENTS: '/teacher/students'` to the ROUTES object.

- [ ] **Step 4: Verify frontend typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/teacher/students/ src/hooks/useTeacherStudents.ts src/lib/constants.ts
git commit -m "feat(students): add cross-class student directory page with invite status"
```

---

## Task 16: Frontend — Sidebar Gating for Standalone Teachers

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\components\layout\Sidebar.tsx`

- [ ] **Step 1: Hide admin links for standalone teachers**

The sidebar already filters by `module` and `permission`. For standalone teachers, no admin links should appear. Since standalone teachers only see the teacher portal (routes under `/teacher/*`), this is already handled by the fact that admin and teacher nav are separate arrays. No code change needed unless there are cross-references.

However, add a subtle indicator: if the user is standalone, show a small "Personal" badge next to the school name / logo area. In the Sidebar logo section:

```tsx
{!sidebarCollapsed && useIsStandalone() && (
  <Badge variant="outline" className="ml-2 text-[10px]">Personal</Badge>
)}
```

Import `useIsStandalone` and `Badge` at the top.

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): show Personal badge for standalone teachers"
```

---

## Task 17: Frontend — Empty State Audit & Fixes

**Files:** Multiple teacher pages.

Walk each teacher page and verify it handles the zero-data case gracefully for a brand-new standalone teacher. Fix any that crash or show blank screens.

- [ ] **Step 1: Audit and fix `/teacher/curriculum/page.tsx`**

Currently renders all hub cards regardless of content. Add a check: if no classes exist, show an EmptyState with "Create your first class" CTA linking to `/teacher/classes`.

- [ ] **Step 2: Audit remaining pages**

For each page, verify:
- Loading state exists (spinner or skeleton).
- Empty state exists (EmptyState component or text message).
- No crash when all data arrays are empty.

Pages to check (quick scan — most already have empty states per earlier audit):
- `/teacher/attendance` — OK
- `/teacher/grades` — OK
- `/teacher/discipline` — OK
- `/teacher/timetable` — OK
- `/teacher/homework` — verify
- `/teacher/messages` — verify
- `/teacher/notice-board` — verify

Fix any that are broken.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix(teacher): add empty states to curriculum hub and verify all teacher pages handle zero-data"
```

---

## Task 18: Full Typecheck + Smoke Test

- [ ] **Step 1: Backend typecheck**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: Clean — zero errors.

- [ ] **Step 2: Frontend typecheck**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: Clean — zero errors.

- [ ] **Step 3: Frontend build**

Run: `cd c:/Users/shaun/campusly-frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Fix any errors discovered**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: fix all typecheck and build errors for standalone teacher MVP"
```

---

## Summary

| Task | Description | Backend/Frontend | Depends On |
|------|-------------|-----------------|------------|
| 1 | School model — `plan` + `ownerUserId` | Backend | — |
| 2 | User model — `isStandaloneTeacher` + `onboardingDismissed` | Backend | — |
| 3 | Student model — `userId` optional | Backend | — |
| 4 | Standalone signup service | Backend | 1, 2 |
| 5 | Standalone routes + controller | Backend | 4 |
| 6 | Student.userId null guards (~20 files) | Backend | 3 |
| 7 | Student invite endpoint | Backend | 3 |
| 8 | rejectStandalonePlan middleware | Backend | 1 |
| 9 | Frontend types + student helper | Frontend | 3 |
| 10 | useIsStandalone hook | Frontend | 9 |
| 11 | Signup page | Frontend | 5, 9 |
| 12 | Onboarding wizard rewrite (5-step) | Frontend | 5, 11 |
| 13 | useTeacherClasses mutations | Frontend | 7 |
| 14 | Classes page rewrite with CRUD | Frontend | 13 |
| 15 | Students directory page | Frontend | 9 |
| 16 | Sidebar gating | Frontend | 10 |
| 17 | Empty state audit | Frontend | 12 |
| 18 | Full typecheck + build | Both | All |
