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

**Standalone handling:** `isStandaloneTeacher` is treated as an admin for their own school for capabilities that make sense solo (settings, config, academic setup, sport for coaches). Standalones are deliberately excluded from `manage_users` and `manage_fees` at the capability-rule level. Note this is belt-and-braces: the standalone signup flow (`src/modules/Auth/standalone.service.ts`) only enables a limited set of modules (`academic`, `ai_tools`, `teacher_workbench`, `learning`, `homework`, `attendance`, `incident_wellbeing`, `communication`), so `requireModule('fee')` and `requireModule('users')`-guarded routes already 403 before the capability check runs. The explicit rule exclusion is kept so that if a standalone plan ever enables those modules, the capability layer still says no.

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

The response body carries a machine-readable `code` + `capability` pair for log diagnostics and a human-readable `error` string for toasts. Frontend axios interceptor prefers `error` over the generic fallback.

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

### Scope vs. capability (migration guidance)

Grepping the backend reveals that `user.role === 'teacher'` is used for *two distinct* reasons, and **only one of them migrates to capabilities**:

1. **Authorization** — controller-level gates that end in `res.status(403)` or throw `ForbiddenError`. Example:
   ```ts
   if (user.role === 'teacher' && !user.isSchoolPrincipal) {
     res.status(403).json(...); return;
   }
   ```
   *These migrate.* They are replaced by a `requireCapability(...)` middleware on the route, and the controller-level check is deleted.

2. **Resource scoping** — defaults or filters that constrain the query to the user's own data. Example:
   ```ts
   const teacherId = user.role === 'teacher' ? user.id : req.params.teacherId;
   ```
   or
   ```ts
   if (user.role === 'teacher' && !data.teacherId) data.teacherId = user.id;
   ```
   *These stay as-is.* They define what the teacher can see, not whether they can access the route.

The implementation plan enforces the distinction with a concrete grep: **only migrate occurrences where the check is followed by a 403 response or a `ForbiddenError` throw.** Scope defaults stay in the controller.

### Nav composition

The dashboard layout at `campusly-frontend/src/app/(dashboard)/layout.tsx` currently stacks `filterByModule(roleNav, modulesEnabled)` then `filterByPermission(... , hasPermission)`. The existing `NAV_BY_ROLE` is keyed on `role` alone — which means a `teacher + isBursar` gets only teacher nav and never sees fee admin items, even though their capability grants them `manage_fees`. Filtering cannot add items, only remove them, so a simple `filterByCapability` step is insufficient.

Instead, compose the nav from two sources:

1. `NAV_BY_ROLE` — the baseline nav for every user of that role.
2. `NAV_BY_CAPABILITY` — nav items that appear *if* the user has a particular capability, regardless of their base role.

```ts
// src/app/(dashboard)/nav-config.ts
const NAV_BY_CAPABILITY: Partial<Record<Capability, NavItem[]>> = {
  manage_school_config:  [{ label: 'School Config', href: '/admin/school-config', icon: Settings }],
  manage_fees:           [{ label: 'Fees', href: '/admin/fees', icon: CreditCard }],
  manage_pastoral:       [{ label: 'Pastoral', href: '/admin/pastoral', icon: Heart }],
  // ...
};

function composeNav(
  user: User,
  modulesEnabled: string[],
  hasPermission: (perm: string) => boolean,
): NavItem[] {
  const baseline = NAV_BY_ROLE[user.role] ?? ADMIN_NAV;
  const capabilityItems = (Object.keys(NAV_BY_CAPABILITY) as Capability[])
    .filter((cap) => can(user, cap))
    .flatMap((cap) => NAV_BY_CAPABILITY[cap] ?? []);
  const merged = dedupeByHref([...baseline, ...capabilityItems]);
  return filterByPermission(filterByModule(merged, modulesEnabled), hasPermission);
}
```

`dedupeByHref` prevents double-listing when an item legitimately appears in both the role baseline and a capability slot (e.g. school_admin's baseline already includes fee admin, and `manage_fees` capability also claims it).

This replaces the current `navItems` `useMemo` in `layout.tsx`.

## Frontend / Backend Synchronisation

Two parallel files mean drift is possible. We layer three defences, each honest about what it catches and what it doesn't.

### Defence 1 — Intra-repo snapshot test (automated)

A canonical JSON fixture (`permissions.snapshot.json`) is committed in each repo. A unit test asserts `canUser(archetype, cap) === snapshot[cap][archetype]` for every archetype × capability pair. This catches the case where a dev modifies the rule table but forgets to update the snapshot *within a single repo* — CI fails, they fix it.

**Archetypes** covered by the snapshot:

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

10 capabilities × 13 archetypes ≈ 130 rows. Easy to review in diffs.

### Defence 2 — Cross-repo byte-identity check (manual + scripted)

The `permissions.snapshot.json` file must be **byte-identical** in both repos. This is not enforceable by either repo's CI alone (neither CI knows about the other checkout). Instead:

- Each repo ships a script at `scripts/check-permissions-sync.sh` that accepts a sibling repo path:
  ```bash
  # From campusly-frontend:
  ./scripts/check-permissions-sync.sh ../campusly-backend
  # Exits 0 if the two permissions.snapshot.json files are byte-identical.
  # Exits 1 and prints a diff if they differ.
  ```
- The snapshot file carries a short SHA-256 in a comment at the top of each side's `permissions.ts`:
  ```ts
  // permissions.snapshot.json sha256: a1b2c3...
  ```
  The hash is regenerated any time the snapshot changes. Divergent hashes between the two `permissions.ts` files are visible at a glance in a PR diff (both files are typically opened side by side during review of a rules change).

### Defence 3 — PR discipline (documented)

Both repos' `CLAUDE.md` gets one line added under "Pre-commit checklist":

> **Permissions rule change?** Update BOTH `campusly-frontend/src/lib/permissions.ts` AND `campusly-backend/src/common/permissions.ts`. Regenerate both `permissions.snapshot.json` files. Run `scripts/check-permissions-sync.sh` against the sibling checkout before opening the PR.

### Failure modes we accept

- A dev changes one repo's rule + snapshot + hash, ships a PR, merges before the other repo's matching PR. Window of inconsistency exists until the matching PR lands.
- Drift is only fully closed when both PRs merge. Tolerable because the window is a few hours and both PRs must be opened together by convention.
- If the two truly get out of sync in production, users hit a 403-on-click (the same failure mode as today, bounded by the capability surface, not a data-integrity risk).

## Rollout Plan

Four phases, each independently shippable and reviewable.

### Phase 1 — Infrastructure only (no behaviour change)

- Frontend:
  - Extend the `User` interface at `src/types/common.ts` to declare the missing JWT flags — `isSchoolPrincipal?`, `isHOD?`, `isBursar?`, `isCounselor?`, `isReceptionist?` (the backend already populates them; only `isStandaloneTeacher` and `isStandaloneCoach` are typed today, which is why existing code uses `as unknown as {...}` casts — see `src/hooks/useIsStandalone.ts`, `src/components/assessment-structure/CreateStructureDialog.tsx`).
  - Drop the `as unknown as {...}` casts in those two files once the type is fixed.
  - Add `src/lib/permissions.ts`, `src/hooks/useCan.ts`, `permissions.snapshot.json`, unit test, `scripts/check-permissions-sync.sh`.
- Backend:
  - Add `src/common/permissions.ts`, `src/middleware/capability.ts`, `permissions.snapshot.json`, unit test, `scripts/check-permissions-sync.sh`.
  - The `req.user` type at `src/types/express.d.ts` already declares all the flags — no type changes needed.
- Both:
  - Add a line to `CLAUDE.md` Pre-commit checklist: "Permissions rule change? Update both repos; run `scripts/check-permissions-sync.sh` against the sibling checkout."
- No routes wired. No UI gated. Fully backwards-compatible.

### Phase 2 — Fix the trigger (timetable config)

- Backend: `campusly-backend/src/modules/TimetableBuilder/routes.ts` — replace `adminOrTeacher` on `PUT /config` with `requireCapability('manage_school_config')`. Delete the inline role check at `TimetableBuilderController.updateConfig` lines 26-29.
- Frontend: `campusly-frontend/src/app/(dashboard)/teacher/timetable/page.tsx` — gate "Configure Periods" (empty state) and "Period Settings" (page header) buttons with `useCan('manage_school_config')`. Update empty-state description text per capability.
- Verification: manual test with three login archetypes — regular school teacher (no button, "ask admin" copy, save blocked), principal (button visible, save works), standalone teacher (button visible, save works).

### Phase 3 — Audit pass, module by module

One PR per capability. Each follows the same pattern below.

**Per-PR migration checklist:**

1. **Find authorization checks, not scope logic.** Grep the target module for `res.status(403)` and `ForbiddenError` occurrences that are guarded by `user.role === '...'` or `user.is<Flag>`. Only those migrate. Default-assignment patterns (`teacherId = user.role === 'teacher' ? user.id : ...`) stay untouched.
2. **Replace route middleware.** On the relevant write routes, replace `authorize('school_admin', ...)` or bespoke inline guards with `requireCapability('<cap>')`.
3. **Delete the now-redundant controller-level auth check.** Keep scope logic.
4. **Verify downstream scope.** Where the capability grants a flag-bearing role (HOD, counselor, bursar), confirm the controller enforces per-resource scope *below* the capability check (e.g. HOD can only write subjects in their `departmentId`, counselor can only write cases for assigned students). If scope is missing, add it in the same PR — **do not widen the door without scope.**
5. **Gate the frontend.** Add `useCan('<cap>')` checks to buttons, dialog triggers, empty-state CTAs, page-level redirects where applicable. Update empty-state copy for the denied case.
6. **Add to `NAV_BY_CAPABILITY`.** Any admin nav items the capability should surface to non-`school_admin` users (e.g. `isBursar` teacher seeing Fees) get declared in `NAV_BY_CAPABILITY`.
7. **Verify with two archetypes** — one granted, one denied — via manual login or integration test.

**Audit surface:**

| Capability | Backend files | Frontend surfaces |
|---|---|---|
| `manage_school_settings` | `School/routes.ts` (PUT, PATCH settings, DELETE) | `SchoolGeneralTab`, `SchoolModulesTab`, admin school page |
| `manage_school_config` | `TimetableBuilder/routes.ts` (PUT /config) — covered by Phase 2 | — (covered by Phase 2) |
| `manage_academic_setup` | `Academic/routes.ts`, `Department/routes.ts` (has bespoke inline teacher+flag check at line 34), `TimetableBuilder/routes.ts` (requirements, lines, availability), `AssessmentStructure/routes.ts`, `ContentLibrary/controller.ts` (line 116 inline `isSchoolPrincipal` check) | Grade/class/subject admin, assessment structure builder, content library admin |
| `manage_users` | `Staff/routes.ts`, `Student/routes.ts`, `Parent/routes.ts` (writes) | Staff/student/parent management pages |
| `manage_fees` | `Fee/routes.ts` (types, invoices, debtors — writes) | Fee admin pages, invoice creation |
| `manage_pastoral` | `Incident/routes.ts` (lines 30-39 bespoke `isCounselor` inline checks), `Wellbeing/routes.ts` (writes) | Case management UI |
| `manage_sport_config` | `Sport/routes.ts` (teams, fixtures, seasons — writes) | Sport admin pages |
| `manage_library` | `Library/routes.ts` (writes) | Library admin UI |
| `manage_visitors` | `Visitor/routes.ts` (writes) | Visitor/gate pass admin UI |
| `view_audit_log` | `Audit/routes.ts` | Audit log page |

Specifically-named files (`Department/routes.ts:34`, `ContentLibrary/controller.ts:116`, `Incident/routes.ts:30-39`) carry pre-existing bespoke inline guards that must be migrated — they are easy to miss in a pure route-file sweep.

The implementation plan will expand each row into concrete file-level tasks with the exact lines to delete.

### Phase 4 — Cleanup

- Grep `campusly-backend/src` for remaining in-controller role checks that shadow capabilities; delete.
- Grep for `authorize('school_admin', ...)` patterns on write routes already covered by a capability; migrate any stragglers.
- Add a note to project `CLAUDE.md`: "new school-wide-config endpoint? add a capability to `src/common/permissions.ts` and use `requireCapability`."

## Error UX

Backend 403 response body for capability denials:

```json
{
  "success": false,
  "code": "FORBIDDEN_CAPABILITY",
  "capability": "manage_school_config",
  "error": "You do not have permission to manage school configuration."
}
```

- `error` is the human-readable string the axios interceptor surfaces as a toast.
- `code` and `capability` are machine-readable; used by log search and by any future client-side mapping.
- Because UI is gated up-front, users should rarely see these toasts. When they do (e.g. a race where their flags changed mid-session), the structured fields aid diagnosis.
- The frontend axios interceptor is updated (if not already) to prefer `error` over a generic "Request failed" fallback when the response body carries it.

## Testing

**Unit (both repos):**
- `permissions.test.ts` — feeds `CAPABILITY_RULES` with each archetype, asserts against `permissions.snapshot.json`.
- Regression guard: any change to rules forces an explicit snapshot update.

**Integration (backend):**
- One supertest per capability hitting a representative write route. Login as: super / admin / granted-flag / regular teacher / standalone (where applicable). Assert 200 vs 403.

**Manual (Phase 2 and each Phase 3 PR):**
- Three-archetype smoke test per affected screen.

## Decisions Taken During Review

An initial self-review understated the risks; a deeper critical review surfaced issues below, each resolved in this revision.

1. **Scope-vs-authorization ambiguity in controllers.** `user.role === 'teacher'` is used both for scope-defaulting (`teacherId = user.id`) and for authorization guards. A naïve sweep would accidentally rip out scope logic. **Decision:** migrate only occurrences that end in `res.status(403)` / `ForbiddenError`; scope defaults stay. Encoded in the Phase 3 per-PR checklist.

2. **Nav filtering cannot add items.** `NAV_BY_ROLE` is keyed on role alone; a `teacher + isBursar` would never see Fees nav even with `manage_fees` capability. **Decision:** introduce `NAV_BY_CAPABILITY` alongside `NAV_BY_ROLE` and compose the final tree by union + dedupe, rather than filtering.

3. **Cross-repo snapshot sync is not fully enforceable from one repo.** Snapshot tests catch intra-repo drift but cannot verify the sibling repo. **Decision:** layer three defences (intra-repo snapshot test, `scripts/check-permissions-sync.sh` with SHA comment, and `CLAUDE.md` PR discipline). Accept a bounded inconsistency window between paired PRs merging.

4. **Downstream scope guarantees for flag-gated roles.** Granting HOD/counselor/bursar a capability could widen the door if controllers lack department/student scope checks. **Decision:** the Phase 3 checklist requires verifying (and adding if missing) per-resource scope in the same PR as the capability migration. No capability-migration PR is allowed to widen access.

5. **Bespoke inline auth in additional files.** `Incident/routes.ts`, `Department/routes.ts`, `ContentLibrary/controller.ts` have pre-existing inline guards (`isCounselor`, `isSchoolPrincipal`). **Decision:** named explicitly in the Phase 3 audit surface table so they cannot be missed in a pure route-file sweep.

6. **Capability names in error toasts.** `"You do not have permission: manage_school_config"` is unfriendly. **Decision:** backend returns a structured body (`code`, `capability`, `error`) with a human-readable `error` string; client prefers that over generic fallbacks.

## Open Questions

None remaining.

## Out-of-Scope Follow-ups

- Per-user capability grants (data-driven). Not planned.
- Nav-item `requiresCapability` authoring across the NAV_BY_ROLE config is only done where Phase 3 requires it.
- Rewriting existing `permissions` array semantics. Untouched.
