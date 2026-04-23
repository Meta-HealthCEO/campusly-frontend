# Capability-Based Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the capability-based permissions infrastructure + fix the timetable-config 403 trigger + set up nav composition so Phase 3 audit PRs can follow.

**Architecture:** Mirror the same `CAPABILITY_RULES` table and `permissions.snapshot.json` truth table in both repos. Add `requireCapability(cap)` middleware on backend, `useCan(cap)` hook on frontend. Bootstrap vitest in both repos for the snapshot-driven unit tests. Compose nav from `NAV_BY_ROLE` baseline + `NAV_BY_CAPABILITY` additions (can't only filter — must also add).

**Tech Stack:** TypeScript, Zod 4, Express 5 + Mongoose 9 (backend), Next.js 16 + React 19 + Zustand (frontend), vitest (new — added by this plan).

**Spec reference:** `docs/superpowers/specs/2026-04-23-capability-based-permissions-design.md`.

**Scope of THIS plan:** Spec Phases 1 + 2 + the nav-composition infrastructure that Phase 3 depends on. The spec's Phase 3 (module-by-module audit pass for the other 9 capabilities) is deliberately deferred to follow-up plans — each capability migration is its own small PR with its own verification and is not a dependency of this plan landing. This plan's Appendix A documents the template for those follow-up plans.

---

## File Structure

**campusly-backend (new files):**
- `src/common/permissions.ts` — capability type, rules table, `canUser()`
- `src/common/permissions.snapshot.json` — truth table fixture
- `src/middleware/capability.ts` — `requireCapability(cap)` middleware
- `tests/permissions.test.ts` — snapshot-driven unit test
- `tests/capability-middleware.test.ts` — middleware behaviour test
- `vitest.config.ts` — test runner config
- `scripts/check-permissions-sync.sh` — cross-repo byte-identity check

**campusly-backend (modified files):**
- `package.json` — add vitest devDependency + `test` script
- `src/modules/TimetableBuilder/routes.ts` — swap `adminOrTeacher` for `requireCapability` on `PUT /config`
- `src/modules/TimetableBuilder/controller.ts` — delete lines 26-29 (inline role check)
- `CLAUDE.md` (if exists, else skip) — add permissions sync note

**campusly-frontend (new files):**
- `src/lib/permissions.ts` — capability type, rules table, `can()`
- `src/lib/permissions.snapshot.json` — truth table fixture (byte-identical to backend)
- `src/hooks/useCan.ts` — hook wrapper around `can()`
- `src/app/(dashboard)/nav-config.ts` — `NAV_BY_CAPABILITY` + `composeNav()`
- `tests/permissions.test.ts` — snapshot-driven unit test
- `vitest.config.ts` — test runner config
- `scripts/check-permissions-sync.sh` — cross-repo byte-identity check

**campusly-frontend (modified files):**
- `package.json` — add vitest devDependency + `test` script
- `src/types/common.ts` — extend `User` with `isSchoolPrincipal?`, `isHOD?`, `isBursar?`, `isCounselor?`, `isReceptionist?`
- `src/hooks/useIsStandalone.ts` — drop `as unknown as {...}` cast
- `src/components/assessment-structure/CreateStructureDialog.tsx` — drop `as unknown as {...}` cast
- `src/app/(dashboard)/layout.tsx` — replace `navItems` useMemo with `composeNav()`
- `src/app/(dashboard)/teacher/timetable/page.tsx` — gate `PeriodConfigDialog` triggers with `useCan`
- `src/lib/api-client.ts` — axios interceptor prefers structured error message (only if not already)
- `CLAUDE.md` — add permissions sync note to pre-commit checklist

---

## Phase 1A: Backend Infrastructure

### Task 1: Add vitest to backend

**Files:**
- Modify: `campusly-backend/package.json`
- Create: `campusly-backend/vitest.config.ts`

- [ ] **Step 1: Install vitest**

Run from `campusly-backend/`:
```bash
npm install --save-dev vitest@^2.1.0 @types/node
```

- [ ] **Step 2: Add test script to package.json**

Edit `campusly-backend/package.json` — in `"scripts"` object, add after the `"seed"` line:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Create vitest config**

Create `campusly-backend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
```

- [ ] **Step 4: Verify vitest runs (empty suite)**

Run: `npm test`
Expected: exit 0 with "No test files found" — vitest is installed and runnable.

- [ ] **Step 5: Commit**

```bash
cd ../campusly-backend
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(backend): add vitest for unit tests"
```

---

### Task 2: Backend — create permissions.ts

**Files:**
- Create: `campusly-backend/src/common/permissions.ts`

- [ ] **Step 1: Create the permissions module**

Create `campusly-backend/src/common/permissions.ts`:
```ts
// MIRROR OF campusly-frontend/src/lib/permissions.ts — keep in lockstep.
// When modifying rules, update BOTH files and both permissions.snapshot.json
// files (must be byte-identical), then run:
//   scripts/check-permissions-sync.sh <sibling-repo-path>

import type { UserRole } from './enums.js';

export type Capability =
  | 'manage_school_settings'
  | 'manage_school_config'
  | 'manage_academic_setup'
  | 'manage_users'
  | 'manage_fees'
  | 'manage_pastoral'
  | 'manage_sport_config'
  | 'manage_library'
  | 'manage_visitors'
  | 'view_audit_log';

export interface CapabilityUser {
  role: UserRole | string;
  isSchoolPrincipal?: boolean;
  isHOD?: boolean;
  isBursar?: boolean;
  isCounselor?: boolean;
  isReceptionist?: boolean;
  isStandaloneTeacher?: boolean;
  isStandaloneCoach?: boolean;
}

const isSuper = (u: CapabilityUser): boolean => u.role === 'super_admin';
const isSchoolAdmin = (u: CapabilityUser): boolean =>
  u.role === 'school_admin' || u.isSchoolPrincipal === true;

export const CAPABILITY_RULES: Record<Capability, (u: CapabilityUser) => boolean> = {
  manage_school_settings:  (u) => isSchoolAdmin(u) || u.isStandaloneTeacher === true,
  manage_school_config:    (u) => isSchoolAdmin(u) || u.isStandaloneTeacher === true,
  manage_academic_setup:   (u) => isSchoolAdmin(u) || u.isHOD === true || u.isStandaloneTeacher === true,
  manage_users:            (u) => isSchoolAdmin(u),
  manage_fees:             (u) => isSchoolAdmin(u) || u.isBursar === true,
  manage_pastoral:         (u) => isSchoolAdmin(u) || u.isCounselor === true,
  manage_sport_config:     (u) => isSchoolAdmin(u) || u.role === 'sports_manager' || u.isStandaloneCoach === true,
  manage_library:          (u) => isSchoolAdmin(u),
  manage_visitors:         (u) => isSchoolAdmin(u) || u.isReceptionist === true,
  view_audit_log:          (u) => isSchoolAdmin(u),
};

export function canUser(user: CapabilityUser | undefined, cap: Capability): boolean {
  if (!user) return false;
  if (isSuper(user)) return true;
  return CAPABILITY_RULES[cap](user);
}
```

- [ ] **Step 2: TypeScript-compiles check**

Run: `npx tsc --noEmit -p campusly-backend/tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd campusly-backend
git add src/common/permissions.ts
git commit -m "feat(permissions): add capability rules and canUser() predicate"
```

---

### Task 3: Backend — create permissions snapshot fixture

**Files:**
- Create: `campusly-backend/src/common/permissions.snapshot.json`

- [ ] **Step 1: Create the snapshot JSON**

Create `campusly-backend/src/common/permissions.snapshot.json`:
```json
{
  "super_admin": {
    "manage_school_settings": true,
    "manage_school_config": true,
    "manage_academic_setup": true,
    "manage_users": true,
    "manage_fees": true,
    "manage_pastoral": true,
    "manage_sport_config": true,
    "manage_library": true,
    "manage_visitors": true,
    "view_audit_log": true
  },
  "school_admin": {
    "manage_school_settings": true,
    "manage_school_config": true,
    "manage_academic_setup": true,
    "manage_users": true,
    "manage_fees": true,
    "manage_pastoral": true,
    "manage_sport_config": true,
    "manage_library": true,
    "manage_visitors": true,
    "view_audit_log": true
  },
  "teacher_plain": {
    "manage_school_settings": false,
    "manage_school_config": false,
    "manage_academic_setup": false,
    "manage_users": false,
    "manage_fees": false,
    "manage_pastoral": false,
    "manage_sport_config": false,
    "manage_library": false,
    "manage_visitors": false,
    "view_audit_log": false
  },
  "teacher_principal": {
    "manage_school_settings": true,
    "manage_school_config": true,
    "manage_academic_setup": true,
    "manage_users": true,
    "manage_fees": true,
    "manage_pastoral": true,
    "manage_sport_config": true,
    "manage_library": true,
    "manage_visitors": true,
    "view_audit_log": true
  },
  "teacher_standalone": {
    "manage_school_settings": true,
    "manage_school_config": true,
    "manage_academic_setup": true,
    "manage_users": true,
    "manage_fees": true,
    "manage_pastoral": true,
    "manage_sport_config": true,
    "manage_library": true,
    "manage_visitors": true,
    "view_audit_log": true
  },
  "teacher_hod": {
    "manage_school_settings": false,
    "manage_school_config": false,
    "manage_academic_setup": true,
    "manage_users": false,
    "manage_fees": false,
    "manage_pastoral": false,
    "manage_sport_config": false,
    "manage_library": false,
    "manage_visitors": false,
    "view_audit_log": false
  },
  "teacher_bursar": {
    "manage_school_settings": false,
    "manage_school_config": false,
    "manage_academic_setup": false,
    "manage_users": false,
    "manage_fees": true,
    "manage_pastoral": false,
    "manage_sport_config": false,
    "manage_library": false,
    "manage_visitors": false,
    "view_audit_log": false
  },
  "teacher_counselor": {
    "manage_school_settings": false,
    "manage_school_config": false,
    "manage_academic_setup": false,
    "manage_users": false,
    "manage_fees": false,
    "manage_pastoral": true,
    "manage_sport_config": false,
    "manage_library": false,
    "manage_visitors": false,
    "view_audit_log": false
  },
  "teacher_receptionist": {
    "manage_school_settings": false,
    "manage_school_config": false,
    "manage_academic_setup": false,
    "manage_users": false,
    "manage_fees": false,
    "manage_pastoral": false,
    "manage_sport_config": false,
    "manage_library": false,
    "manage_visitors": true,
    "view_audit_log": false
  },
  "parent": {
    "manage_school_settings": false,
    "manage_school_config": false,
    "manage_academic_setup": false,
    "manage_users": false,
    "manage_fees": false,
    "manage_pastoral": false,
    "manage_sport_config": false,
    "manage_library": false,
    "manage_visitors": false,
    "view_audit_log": false
  },
  "student": {
    "manage_school_settings": false,
    "manage_school_config": false,
    "manage_academic_setup": false,
    "manage_users": false,
    "manage_fees": false,
    "manage_pastoral": false,
    "manage_sport_config": false,
    "manage_library": false,
    "manage_visitors": false,
    "view_audit_log": false
  },
  "sports_manager": {
    "manage_school_settings": false,
    "manage_school_config": false,
    "manage_academic_setup": false,
    "manage_users": false,
    "manage_fees": false,
    "manage_pastoral": false,
    "manage_sport_config": true,
    "manage_library": false,
    "manage_visitors": false,
    "view_audit_log": false
  },
  "coach_standalone": {
    "manage_school_settings": false,
    "manage_school_config": false,
    "manage_academic_setup": false,
    "manage_users": false,
    "manage_fees": false,
    "manage_pastoral": false,
    "manage_sport_config": true,
    "manage_library": false,
    "manage_visitors": false,
    "view_audit_log": false
  }
}
```

Note: `super_admin` gets `true` for every capability because `canUser` short-circuits on `isSuper`, not because each rule lists them. Same for `teacher_principal` and `teacher_standalone` — they pass `isSchoolAdmin()` for most rules because `isSchoolPrincipal === true`.

- [ ] **Step 2: Commit**

```bash
cd campusly-backend
git add src/common/permissions.snapshot.json
git commit -m "feat(permissions): add snapshot fixture (13 archetypes x 10 caps)"
```

---

### Task 4: Backend — write and run permissions snapshot test (TDD)

**Files:**
- Create: `campusly-backend/tests/permissions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `campusly-backend/tests/permissions.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canUser, type Capability, type CapabilityUser } from '../src/common/permissions.js';

const snapshot = JSON.parse(
  readFileSync(resolve(__dirname, '../src/common/permissions.snapshot.json'), 'utf8'),
) as Record<string, Record<Capability, boolean>>;

const ARCHETYPES: Record<string, CapabilityUser> = {
  super_admin:         { role: 'super_admin' },
  school_admin:        { role: 'school_admin' },
  teacher_plain:       { role: 'teacher' },
  teacher_principal:   { role: 'teacher', isSchoolPrincipal: true },
  teacher_standalone:  { role: 'teacher', isSchoolPrincipal: true, isStandaloneTeacher: true },
  teacher_hod:         { role: 'teacher', isHOD: true },
  teacher_bursar:      { role: 'teacher', isBursar: true },
  teacher_counselor:   { role: 'teacher', isCounselor: true },
  teacher_receptionist:{ role: 'teacher', isReceptionist: true },
  parent:              { role: 'parent' },
  student:             { role: 'student' },
  sports_manager:      { role: 'sports_manager' },
  coach_standalone:    { role: 'coach', isStandaloneCoach: true },
};

describe('permissions snapshot', () => {
  it('covers every archetype in the snapshot', () => {
    expect(Object.keys(ARCHETYPES).sort()).toEqual(Object.keys(snapshot).sort());
  });

  for (const [name, user] of Object.entries(ARCHETYPES)) {
    describe(name, () => {
      const expected = snapshot[name];
      for (const cap of Object.keys(expected) as Capability[]) {
        it(`${cap} → ${expected[cap]}`, () => {
          expect(canUser(user, cap)).toBe(expected[cap]);
        });
      }
    });
  }

  it('undefined user gets no capability', () => {
    expect(canUser(undefined, 'manage_school_config')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it passes on first try**

Run from `campusly-backend/`:
```bash
npm test
```

Expected: all 131 tests pass (13 archetypes × 10 caps + 1 coverage check + 1 undefined user = 132).

If anything fails, **the rules table or snapshot has a bug** — do not "fix" by adjusting one to match the other without understanding which is wrong. Go back to the spec's capability table.

- [ ] **Step 3: Commit**

```bash
cd campusly-backend
git add tests/permissions.test.ts
git commit -m "test(permissions): snapshot test for capability rules"
```

---

### Task 5: Backend — create capability middleware (TDD)

**Files:**
- Create: `campusly-backend/tests/capability-middleware.test.ts`
- Create: `campusly-backend/src/middleware/capability.ts`

- [ ] **Step 1: Write the failing middleware test**

Create `campusly-backend/tests/capability-middleware.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../src/common/errors.js';
import { requireCapability } from '../src/middleware/capability.js';

function makeReq(user?: Request['user']): Request {
  return { user } as Request;
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('requireCapability', () => {
  it('throws Unauthorized when req.user is missing', () => {
    const mw = requireCapability('manage_school_config');
    const next = vi.fn() as NextFunction;
    expect(() => mw(makeReq(undefined), makeRes(), next)).toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for super_admin', () => {
    const mw = requireCapability('manage_school_config');
    const next = vi.fn() as NextFunction;
    mw(makeReq({ role: 'super_admin' } as Request['user']), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next() for a user with the capability', () => {
    const mw = requireCapability('manage_school_config');
    const next = vi.fn() as NextFunction;
    mw(
      makeReq({ role: 'teacher', isSchoolPrincipal: true } as Request['user']),
      makeRes(),
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it('responds 403 with structured body for denied users', () => {
    const mw = requireCapability('manage_school_config');
    const next = vi.fn() as NextFunction;
    const res = makeRes();
    mw(makeReq({ role: 'teacher' } as Request['user']), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'FORBIDDEN_CAPABILITY',
      capability: 'manage_school_config',
      error: 'You do not have permission to manage school configuration.',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/middleware/capability.js'`.

- [ ] **Step 3: Create the middleware**

Create `campusly-backend/src/middleware/capability.ts`:
```ts
import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../common/errors.js';
import { canUser, type Capability } from '../common/permissions.js';

const CAPABILITY_MESSAGES: Record<Capability, string> = {
  manage_school_settings:  'You do not have permission to manage school settings.',
  manage_school_config:    'You do not have permission to manage school configuration.',
  manage_academic_setup:   'You do not have permission to manage academic setup.',
  manage_users:            'You do not have permission to manage users.',
  manage_fees:             'You do not have permission to manage fees.',
  manage_pastoral:         'You do not have permission to manage pastoral cases.',
  manage_sport_config:     'You do not have permission to manage sport configuration.',
  manage_library:          'You do not have permission to manage the library.',
  manage_visitors:         'You do not have permission to manage visitors.',
  view_audit_log:          'You do not have permission to view the audit log.',
};

export function requireCapability(cap: Capability) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError('Authentication is required');
    if (!canUser(req.user, cap)) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN_CAPABILITY',
        capability: cap,
        error: CAPABILITY_MESSAGES[cap],
      });
      return;
    }
    next();
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: all tests pass (previous 132 + 4 new = 136).

- [ ] **Step 5: Commit**

```bash
cd campusly-backend
git add src/middleware/capability.ts tests/capability-middleware.test.ts
git commit -m "feat(middleware): requireCapability with structured 403 body"
```

---

## Phase 1B: Frontend Infrastructure

### Task 6: Add vitest to frontend

**Files:**
- Modify: `campusly-frontend/package.json`
- Create: `campusly-frontend/vitest.config.ts`

- [ ] **Step 1: Install vitest**

Run from `campusly-frontend/`:
```bash
npm install --save-dev vitest@^2.1.0 @types/node
```

- [ ] **Step 2: Add test script**

Edit `campusly-frontend/package.json` `scripts` — add after the existing lines:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Create vitest config**

Create `campusly-frontend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: Verify vitest runs**

Run: `npm test`
Expected: exit 0 with "No test files found".

- [ ] **Step 5: Commit**

```bash
cd campusly-frontend
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(frontend): add vitest for unit tests"
```

---

### Task 7: Frontend — extend User type with missing JWT flags

**Files:**
- Modify: `campusly-frontend/src/types/common.ts`

- [ ] **Step 1: Add the missing flags to User interface**

In `campusly-frontend/src/types/common.ts`, find the `User` interface (around line 26-40). Replace the block between `isActive: boolean;` and `createdAt: string;` with:

```ts
  isActive: boolean;
  isSchoolPrincipal?: boolean;
  isHOD?: boolean;
  isBursar?: boolean;
  isCounselor?: boolean;
  isReceptionist?: boolean;
  isStandaloneTeacher?: boolean;
  isStandaloneCoach?: boolean;
  createdAt: string;
```

- [ ] **Step 2: Typecheck frontend**

Run from `campusly-frontend/`:
```bash
npx tsc --noEmit
```
Expected: no new errors introduced. Existing errors (if any) unrelated to these fields remain as before.

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add src/types/common.ts
git commit -m "types(user): declare isSchoolPrincipal, isHOD, isBursar, isCounselor, isReceptionist"
```

---

### Task 8: Frontend — drop `as unknown as` casts now that types are correct

**Files:**
- Modify: `campusly-frontend/src/hooks/useIsStandalone.ts`
- Modify: `campusly-frontend/src/components/assessment-structure/CreateStructureDialog.tsx`

- [ ] **Step 1: Replace useIsStandalone cast**

Replace the full contents of `campusly-frontend/src/hooks/useIsStandalone.ts`:
```ts
import { useAuthStore } from '@/stores/useAuthStore';

export function useIsStandalone(): boolean {
  const user = useAuthStore((s) => s.user);
  return user?.isStandaloneTeacher === true;
}
```

- [ ] **Step 2: Update CreateStructureDialog cast**

In `campusly-frontend/src/components/assessment-structure/CreateStructureDialog.tsx` line 48, replace:
```ts
  const isStandalone = (user as unknown as { isStandaloneTeacher?: boolean })?.isStandaloneTeacher === true;
```
with:
```ts
  const isStandalone = user?.isStandaloneTeacher === true;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd campusly-frontend
git add src/hooks/useIsStandalone.ts src/components/assessment-structure/CreateStructureDialog.tsx
git commit -m "refactor(types): drop unknown casts — User type now declares standalone flag"
```

---

### Task 9: Frontend — create permissions.ts

**Files:**
- Create: `campusly-frontend/src/lib/permissions.ts`

- [ ] **Step 1: Create the permissions module**

Create `campusly-frontend/src/lib/permissions.ts`:
```ts
// MIRROR OF campusly-backend/src/common/permissions.ts — keep in lockstep.
// When modifying rules, update BOTH files and both permissions.snapshot.json
// files (must be byte-identical), then run:
//   scripts/check-permissions-sync.sh <sibling-repo-path>

import type { User } from '@/types';

export type Capability =
  | 'manage_school_settings'
  | 'manage_school_config'
  | 'manage_academic_setup'
  | 'manage_users'
  | 'manage_fees'
  | 'manage_pastoral'
  | 'manage_sport_config'
  | 'manage_library'
  | 'manage_visitors'
  | 'view_audit_log';

const isSuper = (u: User): boolean => u.role === 'super_admin';
const isSchoolAdmin = (u: User): boolean =>
  u.role === 'school_admin' || u.isSchoolPrincipal === true;

export const CAPABILITY_RULES: Record<Capability, (u: User) => boolean> = {
  manage_school_settings:  (u) => isSchoolAdmin(u) || u.isStandaloneTeacher === true,
  manage_school_config:    (u) => isSchoolAdmin(u) || u.isStandaloneTeacher === true,
  manage_academic_setup:   (u) => isSchoolAdmin(u) || u.isHOD === true || u.isStandaloneTeacher === true,
  manage_users:            (u) => isSchoolAdmin(u),
  manage_fees:             (u) => isSchoolAdmin(u) || u.isBursar === true,
  manage_pastoral:         (u) => isSchoolAdmin(u) || u.isCounselor === true,
  manage_sport_config:     (u) => isSchoolAdmin(u) || u.role === 'sports_manager' || u.isStandaloneCoach === true,
  manage_library:          (u) => isSchoolAdmin(u),
  manage_visitors:         (u) => isSchoolAdmin(u) || u.isReceptionist === true,
  view_audit_log:          (u) => isSchoolAdmin(u),
};

export function can(user: User | null | undefined, cap: Capability): boolean {
  if (!user) return false;
  if (isSuper(user)) return true;
  return CAPABILITY_RULES[cap](user);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add src/lib/permissions.ts
git commit -m "feat(permissions): add capability rules and can() predicate"
```

---

### Task 10: Frontend — copy the snapshot fixture

**Files:**
- Create: `campusly-frontend/src/lib/permissions.snapshot.json`

- [ ] **Step 1: Byte-identical copy from backend**

Copy the file `campusly-backend/src/common/permissions.snapshot.json` verbatim to `campusly-frontend/src/lib/permissions.snapshot.json`.

From the top-level workspace root:
```bash
cp campusly-backend/src/common/permissions.snapshot.json campusly-frontend/src/lib/permissions.snapshot.json
```

- [ ] **Step 2: Verify byte-identity**

Run:
```bash
diff campusly-backend/src/common/permissions.snapshot.json campusly-frontend/src/lib/permissions.snapshot.json
```
Expected: no output (identical).

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add src/lib/permissions.snapshot.json
git commit -m "feat(permissions): add snapshot fixture (mirror of backend)"
```

---

### Task 11: Frontend — write snapshot test (TDD)

**Files:**
- Create: `campusly-frontend/tests/permissions.test.ts`

- [ ] **Step 1: Write the test**

Create `campusly-frontend/tests/permissions.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { can, type Capability } from '../src/lib/permissions';
import type { User } from '../src/types';

const snapshot = JSON.parse(
  readFileSync(resolve(__dirname, '../src/lib/permissions.snapshot.json'), 'utf8'),
) as Record<string, Record<Capability, boolean>>;

function archetype(overrides: Partial<User>): User {
  return {
    id: 'archetype',
    email: 'a@b.c',
    firstName: 'A',
    lastName: 'B',
    role: 'teacher',
    schoolId: 'school-1',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  } as User;
}

const ARCHETYPES: Record<string, User> = {
  super_admin:         archetype({ role: 'super_admin' }),
  school_admin:        archetype({ role: 'school_admin' }),
  teacher_plain:       archetype({ role: 'teacher' }),
  teacher_principal:   archetype({ role: 'teacher', isSchoolPrincipal: true }),
  teacher_standalone:  archetype({ role: 'teacher', isSchoolPrincipal: true, isStandaloneTeacher: true }),
  teacher_hod:         archetype({ role: 'teacher', isHOD: true }),
  teacher_bursar:      archetype({ role: 'teacher', isBursar: true }),
  teacher_counselor:   archetype({ role: 'teacher', isCounselor: true }),
  teacher_receptionist:archetype({ role: 'teacher', isReceptionist: true }),
  parent:              archetype({ role: 'parent' }),
  student:             archetype({ role: 'student' }),
  sports_manager:      archetype({ role: 'sports_manager' }),
  coach_standalone:    archetype({ role: 'coach', isStandaloneCoach: true }),
};

describe('permissions snapshot', () => {
  it('covers every archetype in the snapshot', () => {
    expect(Object.keys(ARCHETYPES).sort()).toEqual(Object.keys(snapshot).sort());
  });

  for (const [name, user] of Object.entries(ARCHETYPES)) {
    describe(name, () => {
      const expected = snapshot[name];
      for (const cap of Object.keys(expected) as Capability[]) {
        it(`${cap} → ${expected[cap]}`, () => {
          expect(can(user, cap)).toBe(expected[cap]);
        });
      }
    });
  }

  it('null user gets no capability', () => {
    expect(can(null, 'manage_school_config')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npm test`
Expected: all tests pass (13 × 10 + 2 = 132 tests).

If the test and the backend snapshot test count differ, something is out of sync between the two rule tables — compare them byte-for-byte before proceeding.

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add tests/permissions.test.ts
git commit -m "test(permissions): snapshot test matching backend truth table"
```

---

### Task 12: Frontend — create useCan hook

**Files:**
- Create: `campusly-frontend/src/hooks/useCan.ts`

- [ ] **Step 1: Create the hook**

Create `campusly-frontend/src/hooks/useCan.ts`:
```ts
import { useAuthStore } from '@/stores/useAuthStore';
import { can, type Capability } from '@/lib/permissions';

export function useCan(cap: Capability): boolean {
  const user = useAuthStore((s) => s.user);
  return can(user, cap);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add src/hooks/useCan.ts
git commit -m "feat(hooks): useCan(capability) — subscribes to auth store"
```

---

## Phase 1C: Cross-Repo Sync Tooling

### Task 13: Sync check scripts in both repos

**Files:**
- Create: `campusly-backend/scripts/check-permissions-sync.sh`
- Create: `campusly-frontend/scripts/check-permissions-sync.sh`

- [ ] **Step 1: Create backend script**

Create `campusly-backend/scripts/check-permissions-sync.sh`:
```bash
#!/usr/bin/env bash
# Checks that this repo's permissions.snapshot.json is byte-identical to the sibling repo's.
# Usage: ./scripts/check-permissions-sync.sh <sibling-repo-path>

set -euo pipefail

SIBLING="${1:-}"
if [[ -z "$SIBLING" ]]; then
  echo "Usage: $0 <sibling-repo-path>" >&2
  echo "Example: $0 ../campusly-frontend" >&2
  exit 2
fi

LOCAL="src/common/permissions.snapshot.json"
REMOTE="$SIBLING/src/lib/permissions.snapshot.json"

if [[ ! -f "$LOCAL" ]]; then
  echo "Not found: $LOCAL" >&2; exit 2
fi
if [[ ! -f "$REMOTE" ]]; then
  echo "Not found: $REMOTE" >&2; exit 2
fi

if diff -q "$LOCAL" "$REMOTE" > /dev/null; then
  echo "OK: permissions snapshots match"
  exit 0
else
  echo "DIVERGED: permissions snapshots differ" >&2
  diff "$LOCAL" "$REMOTE" >&2 || true
  exit 1
fi
```

- [ ] **Step 2: Make executable**

```bash
cd campusly-backend
chmod +x scripts/check-permissions-sync.sh
```

- [ ] **Step 3: Create frontend script (sibling paths swapped)**

Create `campusly-frontend/scripts/check-permissions-sync.sh`:
```bash
#!/usr/bin/env bash
# Checks that this repo's permissions.snapshot.json is byte-identical to the sibling repo's.
# Usage: ./scripts/check-permissions-sync.sh <sibling-repo-path>

set -euo pipefail

SIBLING="${1:-}"
if [[ -z "$SIBLING" ]]; then
  echo "Usage: $0 <sibling-repo-path>" >&2
  echo "Example: $0 ../campusly-backend" >&2
  exit 2
fi

LOCAL="src/lib/permissions.snapshot.json"
REMOTE="$SIBLING/src/common/permissions.snapshot.json"

if [[ ! -f "$LOCAL" ]]; then
  echo "Not found: $LOCAL" >&2; exit 2
fi
if [[ ! -f "$REMOTE" ]]; then
  echo "Not found: $REMOTE" >&2; exit 2
fi

if diff -q "$LOCAL" "$REMOTE" > /dev/null; then
  echo "OK: permissions snapshots match"
  exit 0
else
  echo "DIVERGED: permissions snapshots differ" >&2
  diff "$LOCAL" "$REMOTE" >&2 || true
  exit 1
fi
```

- [ ] **Step 4: Make executable**

```bash
cd campusly-frontend
chmod +x scripts/check-permissions-sync.sh
```

- [ ] **Step 5: Run from frontend to verify — should print OK**

From `campusly-frontend/`:
```bash
./scripts/check-permissions-sync.sh ../campusly-backend
```
Expected: `OK: permissions snapshots match`.

- [ ] **Step 6: Commit in each repo**

```bash
cd campusly-backend
git add scripts/check-permissions-sync.sh
git commit -m "chore(permissions): sync-check script for cross-repo snapshot byte-identity"

cd ../campusly-frontend
git add scripts/check-permissions-sync.sh
git commit -m "chore(permissions): sync-check script for cross-repo snapshot byte-identity"
```

---

### Task 14: Document permissions sync in CLAUDE.md

**Files:**
- Modify: `campusly-frontend/CLAUDE.md`

Note: backend does not have a CLAUDE.md at the workspace path we explored. Only the frontend file is updated here. If backend CLAUDE.md is added later, mirror the note.

- [ ] **Step 1: Add note to frontend CLAUDE.md**

Find the "Pre-Commit Checklist" section in `campusly-frontend/CLAUDE.md`. After the last numbered item (item 10, "Empty state + loading state..."), add item 11:

```markdown
11. **Permissions rule change?** Update BOTH `campusly-frontend/src/lib/permissions.ts` AND `campusly-backend/src/common/permissions.ts`. Update both `permissions.snapshot.json` files to remain byte-identical. Run `scripts/check-permissions-sync.sh ../campusly-backend` before opening the PR.
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add CLAUDE.md
git commit -m "docs(claude-md): permissions sync note in pre-commit checklist"
```

---

## Phase 2A: Fix the Timetable Config Trigger

### Task 15: Backend — migrate TimetableBuilder PUT /config to requireCapability

**Files:**
- Modify: `campusly-backend/src/modules/TimetableBuilder/routes.ts`
- Modify: `campusly-backend/src/modules/TimetableBuilder/controller.ts`

- [ ] **Step 1: Update routes.ts**

In `campusly-backend/src/modules/TimetableBuilder/routes.ts`, replace the import block and the PUT /config route.

Find:
```ts
import express from 'express';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { TimetableBuilderController } from './controller.js';
```

Replace with:
```ts
import express from 'express';
import { authorize } from '../../middleware/rbac.js';
import { requireCapability } from '../../middleware/capability.js';
import { validate } from '../../middleware/validate.js';
import { TimetableBuilderController } from './controller.js';
```

Then find:
```ts
router.put('/config', adminOrTeacher, validate(configSchema), TimetableBuilderController.updateConfig);
```

Replace with:
```ts
router.put('/config', requireCapability('manage_school_config'), validate(configSchema), TimetableBuilderController.updateConfig);
```

Note: GET /config stays on `adminOrTeacher` — regular teachers must still be able to read the config to render the timetable.

- [ ] **Step 2: Delete the inline role check in controller.ts**

In `campusly-backend/src/modules/TimetableBuilder/controller.ts`, find the `updateConfig` method (around lines 22-44). Delete lines 26-29 (the inline check). The method becomes:

```ts
  static async updateConfig(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const schoolId = user.schoolId!;

    // Validate break afterPeriod values
    if (req.body.breakSlots && req.body.periodsPerDay) {
      const maxPeriods = Math.max(...Object.values(req.body.periodsPerDay as Record<string, number>));
      for (const brk of req.body.breakSlots as Array<{ afterPeriod: number }>) {
        if (brk.afterPeriod >= maxPeriods) {
          res.status(400).json(apiResponse(false, undefined, undefined, `Break after period ${brk.afterPeriod} exceeds configured periods`));
          return;
        }
      }
    }

    const config = await ConfigService.updateConfig(schoolId, req.body);
    res.json(apiResponse(true, config, 'Config updated'));
  }
```

- [ ] **Step 3: Typecheck + tests**

Run from `campusly-backend/`:
```bash
npx tsc --noEmit && npm test
```
Expected: no type errors, all tests pass.

- [ ] **Step 4: Restart dev server and smoke-test manually**

Start backend `npm run dev`. Using an HTTP client (or frontend), hit `PUT /api/timetable-builder/config` with:
- A `school_admin` JWT → 200.
- A `teacher + isSchoolPrincipal` JWT → 200.
- A plain `teacher` JWT → 403 with body `{ code: 'FORBIDDEN_CAPABILITY', capability: 'manage_school_config', error: 'You do not have permission to manage school configuration.', success: false }`.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
cd campusly-backend
git add src/modules/TimetableBuilder/routes.ts src/modules/TimetableBuilder/controller.ts
git commit -m "feat(timetable): gate PUT /config with requireCapability('manage_school_config')"
```

---

### Task 16: Frontend — gate PeriodConfigDialog triggers

**Files:**
- Modify: `campusly-frontend/src/app/(dashboard)/teacher/timetable/page.tsx`

- [ ] **Step 1: Import useCan at the top of the file**

Add near the other `@/hooks/...` imports:
```ts
import { useCan } from '@/hooks/useCan';
```

- [ ] **Step 2: Compute capability inside the component**

Near the top of the component body (adjacent to other `const` hook calls), add:
```ts
const canConfigure = useCan('manage_school_config');
```

- [ ] **Step 3: Gate the empty-state block**

Find the empty-state block (around line 122-147). Replace with:
```tsx
  // No config yet -- prompt admin to configure periods
  if (!hasConfig) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly teaching schedule" />
        <EmptyState
          icon={Calendar}
          title="No period configuration"
          description={
            canConfigure
              ? "Set up your school's period times before building your timetable."
              : 'Your school admin has not configured periods yet. Please check back later.'
          }
          action={
            canConfigure ? (
              <Button onClick={() => setConfigDialogOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure Periods
              </Button>
            ) : undefined
          }
        />
        {canConfigure && (
          <PeriodConfigDialog
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
            config={config}
            onSave={saveConfig}
            maxExistingPeriod={maxExistingPeriod}
          />
        )}
      </div>
    );
  }
```

- [ ] **Step 4: Gate the "Period Settings" header button + dialog in the main render**

Find the PageHeader block (around line 152-163). Replace the button group with:
```tsx
        <PageHeader title="My Timetable" description="Your weekly teaching schedule">
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            {canConfigure && (
              <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Period Settings
              </Button>
            )}
          </div>
        </PageHeader>
```

Then, lower down where the second `PeriodConfigDialog` mount is (around line 185-191), wrap it too:
```tsx
        {canConfigure && (
          <PeriodConfigDialog
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
            config={config}
            onSave={saveConfig}
            maxExistingPeriod={maxExistingPeriod}
          />
        )}
```

- [ ] **Step 5: Typecheck + build**

Run from `campusly-frontend/`:
```bash
npx tsc --noEmit
npm run build
```
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
cd campusly-frontend
git add "src/app/(dashboard)/teacher/timetable/page.tsx"
git commit -m "feat(timetable): gate Configure Periods UI with manage_school_config capability"
```

---

### Task 17: Manual end-to-end verification of trigger fix

- [ ] **Step 1: Start both services**

Terminal 1 (`campusly-backend/`): `npm run dev`
Terminal 2 (`campusly-frontend/`): `npm run dev`

- [ ] **Step 2: Test as plain teacher**

Log in as a teacher with no `isSchoolPrincipal` flag (create one if needed via admin UI).
Navigate to `/teacher/timetable`.
Expected:
- If no config exists: empty state with copy "Your school admin has not configured periods yet. Please check back later." and no "Configure Periods" button.
- If config exists: timetable grid renders; page header shows Print button only, no "Period Settings" button.
- Open DevTools network. No PUT /timetable-builder/config request should be possible.

- [ ] **Step 3: Test as school_admin**

Log in as a `school_admin`.
Navigate to `/teacher/timetable` (or admin equivalent).
Expected:
- "Configure Periods" visible; clicking opens dialog; Save writes → 200 response; "Period configuration saved" toast.

- [ ] **Step 4: Test as standalone teacher**

Log in as a standalone teacher (`isSchoolPrincipal: true, isStandaloneTeacher: true`).
Expected: identical to school_admin — can configure.

- [ ] **Step 5: Test as teacher + isSchoolPrincipal (non-standalone)**

Log in as a school-affiliated teacher flagged `isSchoolPrincipal: true`.
Expected: can configure (same as school_admin).

If all four pass, the original 403 bug is resolved and no regressions were introduced.

- [ ] **Step 6: Stop both dev servers**

---

## Phase 2B: Nav Composition Infrastructure

### Task 18: Create NAV_BY_CAPABILITY and composeNav

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/nav-config.ts`

- [ ] **Step 1: Read the current layout to understand NavItem shape**

Open `campusly-frontend/src/app/(dashboard)/layout.tsx`. Note the shape of items in `NAV_BY_ROLE` (likely `{ label, href, icon, requiresPermission?, children? }`). If `NavItem` is exported from `layout.tsx`, we import it. If not, note the shape in your head — we'll keep types aligned.

- [ ] **Step 2: Create nav-config.ts**

Create `campusly-frontend/src/app/(dashboard)/nav-config.ts`:
```ts
import type { Capability } from '@/lib/permissions';
import { can } from '@/lib/permissions';
import type { User } from '@/types';

// NavItem shape: mirror the one used in layout.tsx.
// If layout.tsx exports NavItem, prefer importing it and deleting this local copy.
export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  requiresPermission?: string;
  children?: NavItem[];
}

/**
 * Nav items that appear for any user who has the given capability,
 * regardless of their base role. Enables a `teacher + isBursar` to
 * see Fees nav even though the teacher NAV_BY_ROLE entry doesn't include it.
 *
 * Phase 3 capability migrations add entries here as they land.
 * Start empty; each Phase 3 PR contributes its own nav.
 */
export const NAV_BY_CAPABILITY: Partial<Record<Capability, NavItem[]>> = {
  // Populated incrementally by Phase 3 capability-migration PRs.
};

function dedupeByHref(items: NavItem[]): NavItem[] {
  const seen = new Set<string>();
  const result: NavItem[] = [];
  for (const item of items) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    result.push(item);
  }
  return result;
}

export function composeNav(
  user: User,
  baseline: NavItem[],
): NavItem[] {
  const capabilityItems = (Object.keys(NAV_BY_CAPABILITY) as Capability[])
    .filter((cap) => can(user, cap))
    .flatMap((cap) => NAV_BY_CAPABILITY[cap] ?? []);
  return dedupeByHref([...baseline, ...capabilityItems]);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `NavItem` field shape mismatches what `layout.tsx` uses, align this local type to match.

- [ ] **Step 4: Commit**

```bash
cd campusly-frontend
git add "src/app/(dashboard)/nav-config.ts"
git commit -m "feat(nav): NAV_BY_CAPABILITY + composeNav for role-plus-capability navigation"
```

---

### Task 19: Wire composeNav into dashboard layout

**Files:**
- Modify: `campusly-frontend/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Import composeNav**

Near the top of `layout.tsx`, add:
```ts
import { composeNav } from './nav-config';
```

- [ ] **Step 2: Replace navItems memo**

Find the `navItems` useMemo (around lines 72-77):
```tsx
  const navItems = useMemo(() => {
    if (!user) return ADMIN_NAV;
    const roleNav = NAV_BY_ROLE[user.role] ?? ADMIN_NAV;
    const moduleFiltered = school ? filterByModule(roleNav, school.modulesEnabled) : roleNav;
    return filterByPermission(moduleFiltered, hasPermission);
  }, [user, school, hasPermission]);
```

Replace with:
```tsx
  const navItems = useMemo(() => {
    if (!user) return ADMIN_NAV;
    const roleBaseline = NAV_BY_ROLE[user.role] ?? ADMIN_NAV;
    const composed = composeNav(user, roleBaseline);
    const moduleFiltered = school ? filterByModule(composed, school.modulesEnabled) : composed;
    return filterByPermission(moduleFiltered, hasPermission);
  }, [user, school, hasPermission]);
```

Module-filter and permission-filter still run *after* composition so a capability item for a disabled module is still removed.

- [ ] **Step 3: Typecheck + build**

Run from `campusly-frontend/`:
```bash
npx tsc --noEmit
npm run build
```
Expected: both succeed. The build is identical in behaviour because `NAV_BY_CAPABILITY` is empty — no new items to add. The plumbing is in place for Phase 3.

- [ ] **Step 4: Manual smoke — dashboard still loads**

Start `npm run dev`. Log in as any user. Dashboard nav should render exactly as before.
Stop dev server.

- [ ] **Step 5: Commit**

```bash
cd campusly-frontend
git add "src/app/(dashboard)/layout.tsx"
git commit -m "feat(nav): compose role baseline with capability additions in dashboard layout"
```

---

## Phase 2C: Final Wrap-Up

### Task 20: Final sync verification + PR prep

- [ ] **Step 1: Run both test suites**

```bash
cd campusly-backend && npm test
cd ../campusly-frontend && npm test
```
Expected: both pass with no failures.

- [ ] **Step 2: Run cross-repo sync check**

From `campusly-frontend/`:
```bash
./scripts/check-permissions-sync.sh ../campusly-backend
```
Expected: `OK: permissions snapshots match`.

- [ ] **Step 3: Verify backend typecheck + build**

```bash
cd campusly-backend
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Verify frontend typecheck + build**

```bash
cd ../campusly-frontend
npx tsc --noEmit
npm run build
```
Expected: both succeed.

- [ ] **Step 5: Confirm `git status` is clean in both repos**

```bash
cd campusly-backend && git status
cd ../campusly-frontend && git status
```
Expected: `nothing to commit, working tree clean` in both.

- [ ] **Step 6: Review commit history in each repo**

```bash
cd campusly-backend && git log --oneline -15
cd ../campusly-frontend && git log --oneline -20
```
Confirm the commits reflect: vitest setup → permissions.ts → snapshot → test → middleware → TimetableBuilder fix; and (frontend) vitest → User type → casts dropped → permissions.ts → snapshot → test → useCan → sync script → CLAUDE.md → timetable UI gating → nav-config → layout rewire.

---

## Appendix A: Phase 3 PR Template

Each Phase 3 follow-up plan targets one capability and follows this template. Typical size: 3-6 tasks.

**PR scope:** One capability (e.g. `manage_fees`).

**Per-capability task list:**

1. **Audit grep** — `grep -rn "user.role === 'school_admin'" src/modules/<Module>/` and `grep -rn "res.status(403)" src/modules/<Module>/controller.ts`. Distinguish scope from authorization (only `403`-ending patterns migrate).
2. **Backend — replace route middleware.** On each write route in the module, swap `authorize('school_admin', ...)` (or a bespoke inline guard) for `requireCapability('<cap>')`.
3. **Backend — delete now-redundant controller-level auth checks.** Leave scope-defaulting logic (e.g. `teacherId = user.id`) untouched.
4. **Backend — verify downstream scope.** If the capability grants a flag-bearing role (HOD, counselor, bursar), confirm the controller enforces per-resource scope. If missing, add it in this same PR.
5. **Backend — add integration test(s).** Using supertest, assert that a granted-archetype login gets 200 and a denied-archetype login gets 403 with the structured body.
6. **Frontend — gate UI with `useCan('<cap>')`.** Buttons, dialog triggers, empty-state actions, page-level redirects if applicable. Update empty-state copy for the denied case.
7. **Frontend — add entries to `NAV_BY_CAPABILITY`.** Any admin nav items this capability should surface to non-`school_admin` users get declared here. `dedupeByHref` handles overlap with `NAV_BY_ROLE`.
8. **Manual verification.** Two archetype logins: granted (expect 200, UI present) and denied (expect UI hidden; direct-URL access returns 403).

**Phase 3 capability inventory** (per spec, one PR each):
- `manage_school_settings` — `School/routes.ts`
- `manage_academic_setup` — `Academic/routes.ts`, `Department/routes.ts:34`, `TimetableBuilder/routes.ts` (non-config routes), `AssessmentStructure/routes.ts`, `ContentLibrary/controller.ts:116`
- `manage_users` — `Staff/routes.ts`, `Student/routes.ts`, `Parent/routes.ts`
- `manage_fees` — `Fee/routes.ts`
- `manage_pastoral` — `Incident/routes.ts:30-39`, `Wellbeing/routes.ts`
- `manage_sport_config` — `Sport/routes.ts`
- `manage_library` — `Library/routes.ts`
- `manage_visitors` — `Visitor/routes.ts`
- `view_audit_log` — `Audit/routes.ts`

---

## Appendix B: Open items beyond this plan

- **Phase 4 cleanup grep** — after all Phase 3 PRs land: `grep -rn "user.role === 'teacher'" src/modules/*/controller.ts` to find remaining shadowed role checks. Each survivor is either a legitimate scope use (keep) or a bug (migrate).
- **Supertest for integration tests** — Phase 3 PRs introduce supertest. It is not added by this plan because Phases 1-2 do not ship any capability-integration tests. Add `supertest` + `@types/supertest` in the first Phase 3 PR that needs it.
