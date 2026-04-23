# Capability-Based Permissions

**Date:** 2026-04-23
**Status:** Design approved, pending implementation plan
**Repos affected:** `campusly-frontend`, `campusly-backend`

## Context

Campusly supports two deployment models for teachers:

1. **School-affiliated:** Teachers belong to a school run by a `school_admin`. School-wide settings (timetable, grades, subjects, fees) are administered centrally; regular teachers consume them.
2. **Standalone:** A teacher signs up independently. A "personal school" record is created with `plan: 'standalone'`, and the teacher is flagged `role: 'teacher' + isSchoolPrincipal: true + isStandaloneTeacher: true`. They run everything themselves.

The trigger for this work: a regular school teacher in the teacher portal was shown a "Configure Periods" button on their timetable page. Clicking Save returned 403 because the backend route has an inline check (`if (user.role === 'teacher' && !user.isSchoolPrincipal) → 403`). The check is correct business logic; the UI is wrong to present the action. Standalone teachers already bypass the check because `isSchoolPrincipal: true` is set at signup.

This exposed a broader pattern: authorization for school-wide operations is expressed as bespoke `authorize(...roles)` calls on routes plus ad-hoc `if` branches inside controllers, with no matching frontend gating. The same pattern affects every flag-gated role already modelled in the JWT (bursar, HOD, counselor, receptionist, standalone coach). A regular teacher, bursar, or counselor can hit the same UI/API mismatch on any number of admin screens.

## Goals

- A single, shared capability model that describes "who can perform school-wide operations", usable identically on frontend and backend.
- Consistent enforcement: the frontend hides UI the user cannot use; the backend enforces the same rule authoritatively.
- Standalone teachers and school principals are treated as first-class admins for their own school, without per-endpoint special-casing.
- The existing role flags (`isBursar`, `isHOD`, `isCounselor`, `isReceptionist`, `isStandaloneCoach`) get proper seats at the table rather than being spot-checked in individual files.
- Guardrails (snapshot tests) prevent frontend/backend predicate drift.

## Non-Goals

- DB-backed RBAC (runtime-editable role definitions). Capabilities remain code-defined.
- Per-class, per-resource scoping (e.g. "teacher can only mark their own class"). That is orthogonal — it stays in controllers as scope checks.
- Deprecating the existing `authorize(...roles)` middleware. It remains appropriate for `super_admin`-only routes and simple role gates.
- Reworking the existing `permissions` array on users (fine-grained grants). That is a separate concern; capabilities and permissions coexist.
- Per-user capability grants (e.g. assigning `manage_fees` to a specific teacher ad-hoc). Capability rules are derived purely from `role` + existing flags.

## Capability Model

### Inputs (from JWT, no DB lookup)

The JWT payload — already populated in `campusly-backend/src/middleware/auth.ts` — provides:

- `role: UserRole` — `super_admin | school_admin | teacher | parent | student | sgb_member | coach | sports_manager`
- `isSchoolPrincipal?: boolean`
- `isHOD?: boolean`
- `isBursar?: boolean`
- `isReceptionist?: boolean`
- `isCounselor?: boolean`
- `isStandaloneTeacher?: boolean`
- `isStandaloneCoach?: boolean`

### Derived predicates (internal helpers)

- `isSuper(u)` → `u.role === 'super_admin'`
- `isSchoolAdmin(u)` → `u.role === 'school_admin' || u.isSchoolPrincipal === true`

`isSuper` bypasses every capability check. `isSchoolAdmin` is the base predicate for most capabilities.

### Capabilities (phase 1 list)

| Capability | Granted to |
|---|---|
| `manage_school_settings` | super / school_admin / principal / standalone_teacher |
| `manage_school_config` | super / school_admin / principal / standalone_teacher |
| `manage_academic_setup` | super / school_admin / principal / HOD / standalone_teacher |
| `manage_users` | super / school_admin / principal |
| `manage_fees` | super / school_admin / principal / bursar |
| `manage_pastoral` | super / school_admin / principal / counselor |
| `manage_sport_config` | super / school_admin / principal / sports_manager / standalone_coach |
| `manage_library` | super / school_admin / principal |
| `manage_visitors` | super / school_admin / principal / receptionist |
| `view_audit_log` | super / school_admin / principal |

**Standalone handling:** `isStandaloneTeacher` is treated as an admin for their own school for capabilities that make sense solo (settings, config, academic setup, sport for coaches). Standalones are deliberately excluded from `manage_users` and `manage_fees` because those are multi-tenant concepts on a standalone "classroom of one" account.

**Super admin:** bypasses every capability; mirrors existing `authorize()` behaviour.

**What is NOT a capability:** teaching own classes, viewing own timetable, marking own homework, submitting leave. These are scope-to-your-resource operations enforced inside controllers/services, not gated by capabilities.

## Architecture

Two parallel files, one per repo. Both export the same `Capability` type and the same `CAPABILITY_RULES` table with identical bodies. A snapshot test in each repo locks the rules against a committed JSON fixture; CI fails if either file drifts.

### Frontend — `campusly-frontend/src/lib/permissions.ts`

```ts
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

const isSuper = (u: User) => u.role === 'super_admin';
const isSchoolAdmin = (u: User) =>
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

### Frontend hook — `campusly-frontend/src/hooks/useCan.ts`

```ts
import { useAuthStore } from '@/stores/useAuthStore';
import { can, type Capability } from '@/lib/permissions';

export function useCan(cap: Capability): boolean {
  const user = useAuthStore((s) => s.user);
  return can(user, cap);
}
```

No `<Can>` wrapper component. Conditional rendering stays at the call site for visibility.

### Backend — `campusly-backend/src/common/permissions.ts`

Mirrors the frontend file. The `CapabilityUser` shape is structurally compatible with `req.user`.

```ts
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

const isSuper = (u: CapabilityUser) => u.role === 'super_admin';
const isSchoolAdmin = (u: CapabilityUser) =>
  u.role === 'school_admin' || u.isSchoolPrincipal === true;

export const CAPABILITY_RULES: Record<Capability, (u: CapabilityUser) => boolean> = {
  // MIRROR OF campusly-frontend/src/lib/permissions.ts — keep in lockstep
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

### Backend middleware — `campusly-backend/src/middleware/capability.ts`

```ts
import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../common/errors.js';
import { canUser, type Capability } from '../common/permissions.js';

export function requireCapability(cap: Capability) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError('Authentication is required');
    if (!canUser(req.user, cap)) {
      throw new ForbiddenError(`You do not have permission: ${cap}`);
    }
    next();
  };
}
```

Error string includes the capability name so dev/ops can diagnose denied requests from logs alone.

## Usage Patterns

### Gating UI (frontend)

```tsx
const canConfigure = useCan('manage_school_config');

return (
  <>
    {canConfigure && (
      <Button onClick={() => setConfigDialogOpen(true)}>
        <Settings className="mr-2 h-4 w-4" /> Period Settings
      </Button>
    )}

    {!hasConfig && (
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
              <Settings className="mr-2 h-4 w-4" /> Configure Periods
            </Button>
          ) : undefined
        }
      />
    )}
  </>
);
```

### Gating a route (backend)

```ts
router.put(
  '/config',
  authenticate,
  requireCapability('manage_school_config'),
  validate(configSchema),
  TimetableBuilderController.updateConfig,
);
```

Any inline `if (user.role === 'teacher' && !user.isSchoolPrincipal) → 403` inside the controller is deleted as part of the migration — the middleware owns the rule.

### Coexistence with existing mechanisms

- **`authorize(...roles)`** — kept for `super_admin`-only routes and cases where the rule is genuinely role-only (not capability-shaped).
- **`requireModule(moduleName)`** — runs before capability checks. A disabled module short-circuits with its own 403; capabilities do not override module gates.
- **`validateSchoolScope(paramName)`** — orthogonal. Capabilities answer "what can you do", scope answers "in whose tenancy". Both run for admin operations on specific schools.

### Nav filtering

The dashboard layout at `campusly-frontend/src/app/(dashboard)/layout.tsx` currently stacks `filterByModule(roleNav, modulesEnabled)` then `filterByPermission(... , hasPermission)`. Add a separate `filterByCapability` step (not folded into `filterByPermission`):

```ts
const navItems = useMemo(() => {
  if (!user) return ADMIN_NAV;
  const roleNav = NAV_BY_ROLE[user.role] ?? ADMIN_NAV;
  const moduleFiltered = school ? filterByModule(roleNav, school.modulesEnabled) : roleNav;
  const capFiltered = filterByCapability(moduleFiltered, user);
  return filterByPermission(capFiltered, hasPermission);
}, [user, school, hasPermission]);
```

Nav items may declare an optional `requiresCapability?: Capability` alongside existing `requiresPermission`. Items without it are unaffected.

## Frontend / Backend Synchronisation

The risk with two parallel files is drift. Mitigations:

1. **File header comments** on both sides pointing to the other path, stating "keep in lockstep".
2. **Snapshot test** in each repo:
   - A canonical JSON fixture (`permissions.snapshot.json`) committed in both repos.
   - Contains a truth table: for every capability × every archetype user, the expected boolean.
   - Unit test asserts `canUser(archetype, cap) === snapshot[cap][archetype]`.
   - Diff in either repo flags the change; both must be updated together or CI fails.
3. **Archetypes** covered by the snapshot:
   - `super_admin`
   - `school_admin`
   - `teacher` (plain, no flags)
   - `teacher + isSchoolPrincipal`
   - `teacher + isStandaloneTeacher + isSchoolPrincipal`
   - `teacher + isHOD`
   - `teacher + isBursar`
   - `teacher + isCounselor`
   - `teacher + isReceptionist`
   - `parent`
   - `student`
   - `sports_manager`
   - `coach + isStandaloneCoach`

~10 capabilities × 13 archetypes ≈ 130 rows. Easy to review; catches every rule drift.

4. **Failure mode if drift occurs:** snapshot test in the repo that diverged fails with a diff showing which capability/archetype moved. Fixing requires updating both the code and the snapshot file — and by convention the same snapshot file is committed in the other repo in the same PR.

## Rollout Plan

Four phases, each independently shippable and reviewable.

### Phase 1 — Infrastructure only (no behaviour change)

- Frontend:
  - Extend the `User` interface at `src/types/common.ts` to declare the missing JWT flags — `isSchoolPrincipal?`, `isHOD?`, `isBursar?`, `isCounselor?`, `isReceptionist?` (the backend already populates them; only `isStandaloneTeacher` and `isStandaloneCoach` are typed today, which is why existing code uses `as unknown as {...}` casts — see `src/hooks/useIsStandalone.ts`, `src/components/assessment-structure/CreateStructureDialog.tsx`).
  - Drop the `as unknown as {...}` casts in those two files once the type is fixed.
  - Add `src/lib/permissions.ts`, `src/hooks/useCan.ts`, `permissions.snapshot.json`, unit test.
- Backend:
  - Add `src/common/permissions.ts`, `src/middleware/capability.ts`, `permissions.snapshot.json`, unit test.
  - The `req.user` type at `src/types/express.d.ts` already declares all the flags — no type changes needed.
- No routes wired. No UI gated. Fully backwards-compatible.

### Phase 2 — Fix the trigger (timetable config)

- Backend: `campusly-backend/src/modules/TimetableBuilder/routes.ts` — replace `adminOrTeacher` on `PUT /config` with `requireCapability('manage_school_config')`. Delete the inline role check at `TimetableBuilderController.updateConfig` lines 26-29.
- Frontend: `campusly-frontend/src/app/(dashboard)/teacher/timetable/page.tsx` — gate "Configure Periods" (empty state) and "Period Settings" (page header) buttons with `useCan('manage_school_config')`. Update empty-state description text per capability.
- Verification: manual test with three login archetypes — regular school teacher (no button, "ask admin" copy, save blocked), principal (button visible, save works), standalone teacher (button visible, save works).

### Phase 3 — Audit pass, module by module

One PR per capability. Each follows the same pattern: replace `authorize()` on affected write routes with `requireCapability(...)`; delete any overlapping inline role checks in controllers; gate corresponding frontend buttons, nav items, and page actions; verify with two archetypes (granted vs denied).

| Capability | Backend route files | Frontend surfaces |
|---|---|---|
| `manage_school_settings` | `School/routes.ts` (PUT, PATCH settings, DELETE) | `SchoolGeneralTab`, `SchoolModulesTab`, admin school page |
| `manage_academic_setup` | `Academic/routes.ts`, `TimetableBuilder/routes.ts` (requirements, lines, availability), `AssessmentStructure/routes.ts` | Grade/class/subject admin pages, assessment structure builder |
| `manage_users` | `Staff/routes.ts`, `Student/routes.ts`, `Parent/routes.ts` (writes) | Staff/student/parent management pages |
| `manage_fees` | `Fee/routes.ts` (types, invoices, debtors — writes) | Fee admin pages, invoice creation |
| `manage_pastoral` | `Incident/routes.ts`, `Wellbeing/routes.ts` (writes) | Case management UI |
| `manage_sport_config` | `Sport/routes.ts` (teams, fixtures, seasons — writes) | Sport admin pages |
| `manage_library` | `Library/routes.ts` (writes) | Library admin UI |
| `manage_visitors` | `Visitor/routes.ts` (writes) | Visitor/gate pass admin UI |
| `view_audit_log` | `Audit/routes.ts` | Audit log page |

The implementation plan (writing-plans output) will expand each row into concrete file-level tasks.

### Phase 4 — Cleanup

- Grep `campusly-backend/src` for remaining in-controller role checks that shadow capabilities; delete.
- Grep for `authorize('school_admin', ...)` patterns on write routes already covered by a capability; migrate any stragglers.
- Add a note to project `CLAUDE.md`: "new school-wide-config endpoint? add a capability to `src/common/permissions.ts` and use `requireCapability`."

## Error UX

- Backend 403 response body: `{ success: false, error: 'You do not have permission: <capability>' }`.
- Frontend axios interceptor already surfaces server errors as toasts — no new work.
- Because UI is gated up-front, users should rarely see these toasts. When they do (e.g. a race where their flags changed mid-session), the capability name in the error aids debugging.

## Testing

**Unit (both repos):**
- `permissions.test.ts` — feeds `CAPABILITY_RULES` with each archetype, asserts against `permissions.snapshot.json`.
- Regression guard: any change to rules forces an explicit snapshot update.

**Integration (backend):**
- One supertest per capability hitting a representative write route. Login as: super / admin / granted-flag / regular teacher / standalone (where applicable). Assert 200 vs 403.

**Manual (Phase 2 and each Phase 3 PR):**
- Three-archetype smoke test per affected screen.

## Open Questions

None at design time. The matrix, file layout, middleware, hook, snapshot discipline, and rollout order are all pinned.

## Out-of-Scope Follow-ups

- Per-user capability grants (data-driven). Not planned.
- Nav-item `requiresCapability` authoring across the NAV_BY_ROLE config is only done where Phase 3 requires it.
- Rewriting existing `permissions` array semantics. Untouched.
