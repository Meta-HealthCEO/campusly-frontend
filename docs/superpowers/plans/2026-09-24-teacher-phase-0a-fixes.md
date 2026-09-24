# Teacher Portal Phase 0A: Fix What's Broken — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every built teacher feature reachable and working: nested nav on phones, module-aware pages instead of 403s, a real learner profile, policies that can be acknowledged, HOD moderation that works, and no dead routes.

**Architecture:**
- Mostly frontend. Pure logic lives in `src/lib/*` with vitest tests in `tests/`. UI wiring goes in components, pages and hooks.
- A new `src/app/(dashboard)/teacher/layout.tsx` applies a route-level module gate.
- Removed pages become config redirects in `next.config.ts`.
- One small backend change hides fees and wallet from teachers in the Student 360 API.

**Tech Stack:**
- Frontend: Next.js 16.2 App Router (client components), React 19, Zustand, base-ui/shadcn components, Tailwind 4, vitest (node env, `tests/**/*.test.ts`).
- Backend: Express 5, Mongoose 9, vitest.

**Spec:**
- `docs/superpowers/specs/2026-09-24-teacher-portal-programme.md`, §2, §4, and §6 Phase 0.
- Workbench gating: `docs/superpowers/specs/2026-09-24-teacher-portal-look-design.md` §7.

**Repos and branches:**
- Frontend: `C:\dev\campusly\campusly-frontend`. Create `fix/teacher-phase-0` from `feat/teacher-portal-look`, which carries the spec commits.
- Backend: the worktree `C:\dev\campusly\.worktrees\backend-master`. Create `fix/teacher-phase-0` from `origin/master`. Don't use the main backend checkout; other sessions edit it.

## Not in this plan (moved, on purpose)

- **Marking hub deep links and the "mark landed in the gradebook" confirmation** move to phase 2 (the one Marking screen). Reading `TeacherWorkbench/services/aggregation.service.ts` shows the hub only lists **homework**; assigned test papers never appear in it. A deep link can't fix that, so the Marking screen gets redesigned there.
- **Demo seed data** goes in plan 0B (`2026-09-24-teacher-phase-0b-demo-seed.md`). The existing `seed.ts` wipes every collection, including the imported CAPS curriculum and the plans. So the demo data needs its own non-destructive, idempotent script, and that's an independent backend piece.
- **Merging** behaviour, meetings and the library is phases 4–5. Phase 0 only makes the pages that already exist reachable.

## Global Constraints

These come from `campusly-frontend/CLAUDE.md` and the specs. Every task must meet them.

- No `apiClient` import in any page or component. API calls live in `src/hooks/` or `src/stores/`.
- No `any`. Use `catch (err: unknown)` everywhere.
- Every file is ≤ 350 lines. Check with `wc -l` before committing.
- Use design tokens: `text-destructive`, `bg-destructive/10`; never `text-red-*` / `bg-red-*`.
- Mobile first: every grid has a base column count and breakpoints; fixed widths use the `w-full sm:w-40` pattern; touch targets are ≥ 44px on phones.
- Every data view has a loading state and an empty state.
- Dialogs use the flex-col pattern with a scrolling body and a sticky footer.
- Use Next 16 APIs as documented in `node_modules/next/dist/docs/`. Config redirects follow `01-app/03-api-reference/05-config/01-next-config-js/`.
- Copy is in sentence case and plain teacher language. Errors say what to do next.
- Commits follow conventional format and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Frontend commits can take more than 2 minutes because of the global git hooks, so use a 280s timeout.
- Frontend checks: `npx vitest run`, `npx tsc --noEmit -p .`, `npx eslint <changed files>`.
- Backend checks, in the worktree:
  1. Load the env with `set -a; . "C:/Users/shaun/AppData/Local/Temp/claude/C--dev-campusly/2e66a1db-cc40-41f7-bcc7-6d51c7f0aaf6/scratchpad/test-dev.env"; set +a`.
  2. Run `npx vitest run`.
  3. Run `npx tsc --noEmit --preserveSymlinks`.

## Review Focus

These are the input classes most likely to bite a real teacher. Each has a test in the task that owns the code.

1. **A school that has a module switched off.** The page for it shows "isn't switched on for your school", not an error toast or a blank page. A school whose data failed to load must still open pages (fail open), not spin forever. Tests are in Task 3.
2. **A learner with no marks or registers yet.** The profile shows "No marks yet" and "No registers yet", not "0%". Tests are in Task 6.
3. **A nav group whose children are all switched off** (e.g. Student Welfare at a school without Attendance, Incidents or counselling). It disappears on desktop and on phones, with no empty entries. Tests are in Task 1.
4. **A policy that's already acknowledged,** including after a double click or a 409. The page settles on "Acknowledged" instead of looping on errors. Tests are in Task 7.
5. **A change request with no real comment.** The HOD can't send "Request changes" with an empty or whitespace-only note. Tests are in Task 8.

---

### Task 1: Nav visibility shared by desktop and phone; nested items reachable on phones

**Files:**
- Create: `src/lib/nav-visibility.ts`
- Modify: `src/components/layout/Sidebar.tsx` (the `isItemVisible` / `filteredItems` block at lines 23-38)
- Modify: `src/components/layout/BottomNav.tsx` (whole component body)
- Test: `tests/nav-visibility.test.ts`

**Interfaces:**
- Produces:
  - `visibleNavItems(items: NavItem[], access: NavAccess): NavItem[]`
  - `phoneNavLayout(items: NavItem[]): { primary: NavItem[]; sheet: NavItem[] }`
  - `interface NavAccess { isModuleEnabled(moduleId: string): boolean; hasPermission(flag: PermissionFlag): boolean }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/nav-visibility.test.ts
import { describe, expect, it } from 'vitest';
import { Home, Users, Shield, MessageSquare, BookOpen, Clock } from 'lucide-react';
import type { NavItem } from '../src/lib/constants';
import { phoneNavLayout, visibleNavItems } from '../src/lib/nav-visibility';

const nav: NavItem[] = [
  { label: 'Dashboard', href: '/teacher', icon: Home },
  { label: 'Lessons', href: '/teacher/lessons', icon: BookOpen },
  {
    label: 'Classes', href: '/teacher/classes', icon: Users,
    children: [
      { label: 'My Classes', href: '/teacher/classes', icon: Users },
      { label: 'Students', href: '/teacher/students', icon: Users },
    ],
  },
  { label: 'Timetable', href: '/teacher/timetable', icon: Clock },
  {
    label: 'Communication', href: '/teacher/messages', icon: MessageSquare,
    children: [
      { label: 'Messages', href: '/teacher/messages', icon: MessageSquare },
      { label: 'Announcements', href: '/teacher/communication', icon: MessageSquare, module: 'communication' },
    ],
  },
  {
    label: 'Student Welfare', href: '/teacher/discipline', icon: Shield,
    children: [
      { label: 'Discipline', href: '/teacher/discipline', icon: Shield, module: 'attendance' },
      { label: 'Pastoral Care', href: '/teacher/pastoral', icon: Shield, permission: 'isCounselor' },
    ],
  },
];

const everything = { isModuleEnabled: () => true, hasPermission: () => true };

describe('visibleNavItems', () => {
  it('hides a nested item whose module is switched off', () => {
    const result = visibleNavItems(nav, { ...everything, isModuleEnabled: (m) => m !== 'communication' });
    const comms = result.find((i) => i.label === 'Communication');
    expect(comms?.children?.map((c) => c.label)).toEqual(['Messages']);
  });

  it('drops a whole group when none of its items are visible', () => {
    const result = visibleNavItems(nav, { isModuleEnabled: (m) => m !== 'attendance', hasPermission: () => false });
    expect(result.map((i) => i.label)).not.toContain('Student Welfare');
  });

  it('leaves the original nav untouched', () => {
    visibleNavItems(nav, { isModuleEnabled: () => false, hasPermission: () => false });
    expect(nav[4].children).toHaveLength(2);
  });
});

describe('phoneNavLayout', () => {
  it('uses the first four items as tabs', () => {
    expect(phoneNavLayout(nav).primary.map((i) => i.label)).toEqual(['Dashboard', 'Lessons', 'Classes', 'Timetable']);
  });

  it('puts nested items in the More sheet so they can be reached on a phone', () => {
    const sheet = phoneNavLayout(nav).sheet.map((i) => i.label);
    expect(sheet).toEqual(['Students', 'Messages', 'Announcements', 'Discipline', 'Pastoral Care']);
  });

  it('never repeats a link that is already a tab', () => {
    const { sheet } = phoneNavLayout(nav);
    expect(sheet.map((i) => i.href)).not.toContain('/teacher/classes');
    expect(new Set(sheet.map((i) => i.href)).size).toBe(sheet.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/nav-visibility.test.ts`
Expected: FAIL. The module `../src/lib/nav-visibility` can't be resolved.

- [ ] **Step 3: Implement the helpers**

```ts
// src/lib/nav-visibility.ts
import type { NavItem } from '@/lib/constants';
import type { PermissionFlag } from '@/types';

export interface NavAccess {
  isModuleEnabled: (moduleId: string) => boolean;
  hasPermission: (flag: PermissionFlag) => boolean;
}

/** Items (and their children) this user may see. A group left with no visible children disappears. */
export function visibleNavItems(items: NavItem[], access: NavAccess): NavItem[] {
  const isVisible = (item: NavItem): boolean =>
    (!item.module || access.isModuleEnabled(item.module)) &&
    (!item.permission || access.hasPermission(item.permission));

  return items.filter(isVisible).flatMap((item: NavItem) => {
    if (!item.children) return [item];
    const children = item.children.filter(isVisible);
    return children.length > 0 ? [{ ...item, children }] : [];
  });
}

export const PHONE_TAB_COUNT = 4;

/**
 * Phone bottom nav: the first four top-level items are tabs. Every other
 * link, including items nested inside groups, goes in the More sheet, so
 * nothing is unreachable on a phone.
 */
export function phoneNavLayout(items: NavItem[]): { primary: NavItem[]; sheet: NavItem[] } {
  const primary = items.slice(0, PHONE_TAB_COUNT);
  const tabHrefs = new Set(primary.map((item: NavItem) => item.href));
  const seen = new Set<string>();
  const sheet: NavItem[] = [];
  for (const item of items) {
    const links = item.children && item.children.length > 0 ? item.children : [item];
    for (const link of links) {
      if (tabHrefs.has(link.href) || seen.has(link.href)) continue;
      seen.add(link.href);
      sheet.push(link);
    }
  }
  return { primary, sheet };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/nav-visibility.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Use it in the Sidebar**

In `src/components/layout/Sidebar.tsx`:
1. Add `import { visibleNavItems } from '@/lib/nav-visibility';`.
2. Replace the whole `isItemVisible` function and the `filteredItems` expression (lines 23-38) with:

```ts
  const filteredItems = visibleNavItems(items, { isModuleEnabled, hasPermission });
```

- [ ] **Step 6: Use it in the BottomNav**

Replace the body of `src/components/layout/BottomNav.tsx` with the version below. It keeps the same markup and adds module/permission filtering plus the flattened sheet.

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useModule } from '@/hooks/useModule';
import { useAuthStore } from '@/stores/useAuthStore';
import { phoneNavLayout, visibleNavItems } from '@/lib/nav-visibility';
import type { NavItem } from '@/lib/constants';

interface BottomNavProps {
  items: NavItem[];
}

const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname() ?? '';
  const [sheetOpen, setSheetOpen] = useState(false);
  const { isModuleEnabled } = useModule();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { primary, sheet } = phoneNavLayout(visibleNavItems(items, { isModuleEnabled, hasPermission }));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card lg:hidden">
      <div className="flex items-center justify-around">
        {primary.map((item: NavItem) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-11 flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs transition-colors',
                isActivePath(pathname, item.href) ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {sheet.length > 0 && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className="flex min-h-11 flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs text-muted-foreground transition-colors">
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </SheetTrigger>
            <SheetContent side="bottom" showCloseButton={false}>
              <SheetTitle className="sr-only">More navigation</SheetTitle>
              <div className="grid max-h-[70vh] grid-cols-3 gap-3 overflow-y-auto p-4 pb-6 sm:grid-cols-4">
                {sheet.map((item: NavItem) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        'flex min-h-11 flex-col items-center gap-1.5 rounded-lg p-2 text-xs transition-colors',
                        isActivePath(pathname, item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-center leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 7: Typecheck, lint and commit**

Run: `npx tsc --noEmit -p . && npx eslint src/lib/nav-visibility.ts src/components/layout/Sidebar.tsx src/components/layout/BottomNav.tsx tests/nav-visibility.test.ts`
Expected: no errors.

```bash
git add src/lib/nav-visibility.ts src/components/layout/Sidebar.tsx src/components/layout/BottomNav.tsx tests/nav-visibility.test.ts
git commit -m "fix(nav): nested items are reachable on phones, and both navs hide switched-off modules"
```

---

### Task 2: Module keys on nav items, and reach the built-but-hidden pages

**Files:**
- Modify: `src/lib/routes.ts`: add `TEACHER_POLICIES`, `TEACHER_REFERRAL`, `TEACHER_MERITS` and `TEACHER_ATTENDANCE_REPORT` beside `TEACHER_SUBSTITUTES` (line 190).
- Modify: `src/lib/constants.ts`: `TEACHER_NAV` (lines 231-307) and `STANDALONE_TEACHER_NAV` (lines 309-327).
- Modify: `src/app/(dashboard)/teacher/attendance/page.tsx`: the `PageHeader` at lines 106-119.
- Test: `tests/teacher-nav.test.ts` (extend it).

**Interfaces:**
- Produces `ROUTES.TEACHER_POLICIES = '/teacher/policies'` (consumed by Task 7), plus `ROUTES.TEACHER_REFERRAL`, `ROUTES.TEACHER_MERITS` and `ROUTES.TEACHER_ATTENDANCE_REPORT`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/teacher-nav.test.ts` inside the existing `describe('teacher navigation', …)` block:

```ts
  it.each([
    ['Attendance', 'attendance'],
    ['Homework', 'homework'],
    ['Assignments', 'homework'],
    ['Discipline', 'attendance'],
    ['Merits', 'attendance'],
    ['Incidents', 'incident_wellbeing'],
    ['Pastoral Care', 'incident_wellbeing'],
    ['Report Comments', 'ai_tools'],
    ['Substitutes', 'attendance'],
  ])('only shows %s where the school has its module (%s)', (label, module) => {
    expect(flatten(TEACHER_NAV).find((item) => item.label === label)?.module).toBe(module);
  });

  it.each([
    ['Merits', ROUTES.TEACHER_MERITS],
    ['Refer to counsellor', ROUTES.TEACHER_REFERRAL],
    ['Substitutes', ROUTES.TEACHER_SUBSTITUTES],
    ['Policies', ROUTES.TEACHER_POLICIES],
  ])('lets school teachers reach %s from the nav', (label, href) => {
    expect(flatten(TEACHER_NAV).find((item) => item.label === label)?.href).toBe(href);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/teacher-nav.test.ts`
Expected: FAIL. Several labels have `module` `undefined`, and `ROUTES.TEACHER_MERITS` is `undefined`.

- [ ] **Step 3: Add the routes**

In `src/lib/routes.ts`, next to `TEACHER_SUBSTITUTES: '/teacher/substitutes',`, add:

```ts
  TEACHER_POLICIES: '/teacher/policies',
  TEACHER_REFERRAL: '/teacher/referral',
  TEACHER_MERITS: '/teacher/merits',
  TEACHER_ATTENDANCE_REPORT: '/teacher/attendance/report',
```

- [ ] **Step 4: Update the nav config**

In `src/lib/constants.ts`:
1. Add `Award`, `HeartHandshake` and `Repeat` to the existing `lucide-react` import. Check that `ScrollText` is already imported; it is used by Assignments.
2. Make these edits in `TEACHER_NAV`:

```ts
  { label: 'Attendance', href: ROUTES.TEACHER_ATTENDANCE, icon: ClipboardList, module: 'attendance' },
  { label: 'Test Papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  { label: 'Assignments', href: '/teacher/assignments', icon: ScrollText, badge: 'AI', module: 'homework' },
  { label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList, module: 'homework' },
```

```ts
  {
    label: 'Student Welfare',
    href: ROUTES.TEACHER_DISCIPLINE,
    icon: Shield,
    children: [
      { label: 'Discipline', href: ROUTES.TEACHER_DISCIPLINE, icon: Shield, module: 'attendance' },
      { label: 'Merits', href: ROUTES.TEACHER_MERITS, icon: Award, module: 'attendance' },
      { label: 'Incidents', href: ROUTES.TEACHER_INCIDENTS, icon: AlertTriangle, module: 'incident_wellbeing' },
      { label: 'Refer to counsellor', href: ROUTES.TEACHER_REFERRAL, icon: HeartHandshake },
      { label: 'Pastoral Care', href: ROUTES.TEACHER_PASTORAL, icon: Heart, permission: 'isCounselor', module: 'incident_wellbeing' },
    ],
  },
  {
    label: 'Reporting',
    href: ROUTES.TEACHER_REPORTS,
    icon: BarChart3,
    children: [
      { label: 'Reports', href: ROUTES.TEACHER_REPORTS, icon: BarChart3 },
      { label: 'Report Comments', href: ROUTES.TEACHER_AI_REPORT_COMMENTS, icon: FileText, badge: 'AI', module: 'ai_tools' },
    ],
  },
  { label: 'Term Planner', href: ROUTES.TEACHER_WORKBENCH_PLANNER, icon: CalendarDays, module: 'teacher_workbench' },
  { label: 'My Leave', href: ROUTES.TEACHER_LEAVE, icon: CalendarDays, module: 'staff_leave' },
  { label: 'Substitutes', href: ROUTES.TEACHER_SUBSTITUTES, icon: Repeat, module: 'attendance' },
  { label: 'Policies', href: ROUTES.TEACHER_POLICIES, icon: ScrollText },
```

3. In `STANDALONE_TEACHER_NAV`, add `module: 'homework'` to the Homework and Assignments entries.

- [ ] **Step 5: Link the attendance report from Attendance**

In `src/app/(dashboard)/teacher/attendance/page.tsx`:
1. Import `buttonVariants` from `@/components/ui/button`, `cn` from `@/lib/utils`, `ROUTES` from `@/lib/routes`, and `BarChart3` from `lucide-react`. Add `BarChart3` to the existing lucide import.
2. After the `AttendanceExportButton` inside the `PageHeader` (lines 112-118), add:

```tsx
        <Link href={ROUTES.TEACHER_ATTENDANCE_REPORT} className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Report
        </Link>
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run tests/teacher-nav.test.ts`
Expected: PASS. This includes the existing "never links an independent teacher to a page the layout would bounce them from".

- [ ] **Step 7: Typecheck, lint and commit**

Run: `npx tsc --noEmit -p . && npx eslint src/lib/constants.ts src/lib/routes.ts "src/app/(dashboard)/teacher/attendance/page.tsx" tests/teacher-nav.test.ts`

```bash
git add src/lib/constants.ts src/lib/routes.ts "src/app/(dashboard)/teacher/attendance/page.tsx" tests/teacher-nav.test.ts
git commit -m "fix(nav): gate teacher nav items by module and link merits, referral, substitutes, policies and the attendance report"
```

---

### Task 3: Route-level module gate for teacher pages

**Files:**
- Create: `src/lib/teacher-module-routes.ts`
- Create: `src/components/shared/ModuleOffState.tsx`
- Create: `src/app/(dashboard)/teacher/layout.tsx`
- Modify: `src/hooks/useTeacherToday.ts` (the `fetchAll` callback at lines 59-92)
- Test: `tests/teacher-module-routes.test.ts`

**Interfaces:**
- Produces:
  - `moduleForTeacherPath(pathname: string): TeacherRouteModule | null`
  - `teacherModuleGate(input: { pathname: string; modulesEnabled: string[] | null; schoolError: string | null }): ModuleGateState`
  - `type ModuleGateState = { kind: 'open' } | { kind: 'checking' } | { kind: 'off'; label: string }`
  - `ModuleOffState({ label }: { label: string })`

- [ ] **Step 1: Write the failing test**

```ts
// tests/teacher-module-routes.test.ts
import { describe, expect, it } from 'vitest';
import { moduleForTeacherPath, teacherModuleGate } from '../src/lib/teacher-module-routes';

describe('moduleForTeacherPath', () => {
  it.each([
    ['/teacher/workbench/marking-hub', 'teacher_workbench'],
    ['/teacher/workbench', 'teacher_workbench'],
    ['/teacher/courses/abc/edit', 'courses'],
    ['/teacher/incidents/123', 'incident_wellbeing'],
    ['/teacher/curriculum/mark-papers', 'ai_tools'],
    ['/teacher/homework/new', 'homework'],
  ])('knows %s needs %s', (path, module) => {
    expect(moduleForTeacherPath(path)?.module).toBe(module);
  });

  it('does not treat a longer word as the same route', () => {
    expect(moduleForTeacherPath('/teacher/leaves')).toBeNull();
  });

  it('leaves core pages open', () => {
    expect(moduleForTeacherPath('/teacher')).toBeNull();
    expect(moduleForTeacherPath('/teacher/grades')).toBeNull();
  });
});

describe('teacherModuleGate', () => {
  const base = { pathname: '/teacher/workbench/marking-hub', schoolError: null };

  it('waits while the school is still loading instead of firing calls that 403', () => {
    expect(teacherModuleGate({ ...base, modulesEnabled: null })).toEqual({ kind: 'checking' });
  });

  it('says a switched-off module is off, with its name', () => {
    expect(teacherModuleGate({ ...base, modulesEnabled: ['academic'] })).toEqual({ kind: 'off', label: 'Teacher Workbench' });
  });

  it('opens the page when the module is on', () => {
    expect(teacherModuleGate({ ...base, modulesEnabled: ['teacher_workbench'] })).toEqual({ kind: 'open' });
  });

  it('opens the page if the school could not be loaded, rather than spinning forever', () => {
    expect(teacherModuleGate({ ...base, modulesEnabled: null, schoolError: 'Network Error' })).toEqual({ kind: 'open' });
  });

  it('never gates a page that needs no module', () => {
    expect(teacherModuleGate({ pathname: '/teacher/grades', modulesEnabled: null, schoolError: null })).toEqual({ kind: 'open' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/teacher-module-routes.test.ts`
Expected: FAIL. The module can't be resolved.

- [ ] **Step 3: Implement the route map and gate**

```ts
// src/lib/teacher-module-routes.ts

export interface TeacherRouteModule {
  prefix: string;
  /** The backend `requireModule(...)` id; these ids need no alias normalisation. */
  module: string;
  label: string;
}

/** Teacher pages whose data comes from an API behind `requireModule` in the backend's app.ts. */
export const TEACHER_ROUTE_MODULES: readonly TeacherRouteModule[] = [
  { prefix: '/teacher/workbench', module: 'teacher_workbench', label: 'Teacher Workbench' },
  { prefix: '/teacher/curriculum/mark-papers', module: 'ai_tools', label: 'AI Teacher Tools' },
  { prefix: '/teacher/ai-tools', module: 'ai_tools', label: 'AI Teacher Tools' },
  { prefix: '/teacher/communication', module: 'communication', label: 'Communication' },
  { prefix: '/teacher/conferences', module: 'conference_booking', label: 'Parent-Teacher Conferences' },
  { prefix: '/teacher/courses', module: 'courses', label: 'Courses' },
  { prefix: '/teacher/incidents', module: 'incident_wellbeing', label: 'Incidents and Wellbeing' },
  { prefix: '/teacher/pastoral', module: 'incident_wellbeing', label: 'Incidents and Wellbeing' },
  { prefix: '/teacher/learning', module: 'learning', label: 'Learning' },
  { prefix: '/teacher/leave', module: 'staff_leave', label: 'Staff Leave' },
  { prefix: '/teacher/attendance', module: 'attendance', label: 'Attendance' },
  { prefix: '/teacher/discipline', module: 'attendance', label: 'Attendance' },
  { prefix: '/teacher/merits', module: 'attendance', label: 'Attendance' },
  { prefix: '/teacher/substitutes', module: 'attendance', label: 'Attendance' },
  { prefix: '/teacher/homework', module: 'homework', label: 'Homework' },
  { prefix: '/teacher/assignments', module: 'homework', label: 'Homework' },
];

export function moduleForTeacherPath(pathname: string): TeacherRouteModule | null {
  return TEACHER_ROUTE_MODULES.find(
    ({ prefix }: TeacherRouteModule) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ) ?? null;
}

export type ModuleGateState = { kind: 'open' } | { kind: 'checking' } | { kind: 'off'; label: string };

export function teacherModuleGate(input: {
  pathname: string;
  modulesEnabled: string[] | null;
  schoolError: string | null;
}): ModuleGateState {
  const rule = moduleForTeacherPath(input.pathname);
  if (!rule) return { kind: 'open' };
  if (input.modulesEnabled === null) return input.schoolError ? { kind: 'open' } : { kind: 'checking' };
  return input.modulesEnabled.includes(rule.module) ? { kind: 'open' } : { kind: 'off', label: rule.label };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/teacher-module-routes.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Add the off state and the teacher layout**

```tsx
// src/components/shared/ModuleOffState.tsx
'use client';

import Link from 'next/link';
import { PowerOff } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface ModuleOffStateProps {
  label: string;
}

/** Shown instead of a page whose module the school hasn't switched on. */
export function ModuleOffState({ label }: ModuleOffStateProps) {
  return (
    <EmptyState
      icon={PowerOff}
      title={`${label} isn't switched on for your school`}
      description="Ask your school admin to turn it on. Everything else in Campusly works as normal."
      action={<Link href={ROUTES.TEACHER_DASHBOARD} className={cn(buttonVariants())}>Back to Today</Link>}
    />
  );
}
```

```tsx
// src/app/(dashboard)/teacher/layout.tsx
'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ModuleOffState } from '@/components/shared/ModuleOffState';
import { teacherModuleGate } from '@/lib/teacher-module-routes';

/** Teacher pages behind a per-school module wait for the school, then show an off state instead of 403s. */
export default function TeacherLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const modulesEnabled = useSchoolStore((s) => s.school?.modulesEnabled ?? null);
  const schoolError = useSchoolStore((s) => s.schoolError);
  const gate = teacherModuleGate({ pathname, modulesEnabled, schoolError });

  if (gate.kind === 'checking') return <LoadingSpinner />;
  if (gate.kind === 'off') return <ModuleOffState label={gate.label} />;
  return <>{children}</>;
}
```

- [ ] **Step 6: Stop Today calling the workbench when it's off**

In `src/hooks/useTeacherToday.ts`:
1. Add `import { useSchoolStore } from '@/stores/useSchoolStore';`.
2. Inside the hook, after the `isStandalone` line, add:

```ts
  // null = school not loaded yet (call it and let a 403 hide the row, as before).
  const workbenchOff = useSchoolStore((s) =>
    s.school ? !s.school.modulesEnabled.includes('teacher_workbench') : false,
  );
```

3. In `fetchAll`, replace the marking request line:

```ts
        workbenchOff
          ? Promise.reject(new Error('teacher_workbench is off'))
          : apiClient.get('/teacher-workbench/marking-hub/pending'),
```

4. Change the `useCallback` dependency list from `[isStandalone]` to `[isStandalone, workbenchOff]`.

- [ ] **Step 7: Typecheck, lint, run all tests and commit**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint src/lib/teacher-module-routes.ts src/components/shared/ModuleOffState.tsx "src/app/(dashboard)/teacher/layout.tsx" src/hooks/useTeacherToday.ts tests/teacher-module-routes.test.ts`

```bash
git add src/lib/teacher-module-routes.ts src/components/shared/ModuleOffState.tsx "src/app/(dashboard)/teacher/layout.tsx" src/hooks/useTeacherToday.ts tests/teacher-module-routes.test.ts
git commit -m "fix(teacher): pages for switched-off modules say so instead of failing with 403s"
```

---

### Task 4: Remove dead teacher routes; keep old links working with config redirects

**Files:**
- Modify: `next.config.ts`
- Delete these page files. Each is only a `redirect`/`permanentRedirect` stub, or a broken duplicate:
  - `src/app/(dashboard)/teacher/lesson-plans/page.tsx`
  - `src/app/(dashboard)/teacher/lesson-plans/[id]/page.tsx`
  - `src/app/(dashboard)/teacher/quick-make/page.tsx`
  - `src/app/(dashboard)/teacher/ai-tools/grading/page.tsx`
  - `src/app/(dashboard)/teacher/ai-tools/papers/page.tsx`
  - `src/app/(dashboard)/teacher/ai-tools/papers/[id]/page.tsx`
  - `src/app/(dashboard)/teacher/curriculum/assessments/page.tsx`
  - `src/app/(dashboard)/teacher/curriculum/assessments/[paperId]/page.tsx`
  - `src/app/(dashboard)/teacher/curriculum/papers/page.tsx`
  - `src/app/(dashboard)/teacher/curriculum/papers/[id]/page.tsx`
  - `src/app/(dashboard)/teacher/workbench/papers/builder/page.tsx`
  - `src/app/(dashboard)/teacher/workbench/question-bank/page.tsx`: its filters are hardcoded empty `any[]` (lines 25-32); the live bank is `/teacher/curriculum/questions`.
  - `src/app/(dashboard)/teacher/workbench/papers/[id]/memo/page.tsx`: duplicates the Memo tab in `/teacher/papers/[id]`.
- Modify: `src/lib/routes.ts`: remove `TEACHER_WORKBENCH_QUESTION_BANK` (line 220).
- Test: `tests/legacy-redirects.test.ts`

**Interfaces:**
- Produces `export const LEGACY_TEACHER_REDIRECTS: { source: string; destination: string; permanent: boolean }[]` from `next.config.ts`. Task 6 appends one entry.

- [ ] **Step 1: Write the failing test**

```ts
// tests/legacy-redirects.test.ts
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig, { LEGACY_TEACHER_REDIRECTS } from '../next.config';

const APP = path.resolve(__dirname, '../src/app/(dashboard)');
/** '/teacher/papers/:id' → src/app/(dashboard)/teacher/papers/[id]/page.tsx */
const pageFor = (route: string): string =>
  path.join(
    APP,
    ...route.split('/').filter(Boolean).map((seg: string) => (seg.startsWith(':') ? `[${seg.slice(1)}]` : seg)),
    'page.tsx',
  );

describe('legacy teacher redirects', () => {
  it('removes the old page behind every redirected URL', () => {
    const leftovers = LEGACY_TEACHER_REDIRECTS.map((r) => r.source).filter((s: string) => existsSync(pageFor(s)));
    expect(leftovers).toEqual([]);
  });

  it('only sends people to pages that exist', () => {
    const missing = LEGACY_TEACHER_REDIRECTS.map((r) => r.destination).filter((d: string) => !existsSync(pageFor(d)));
    expect(missing).toEqual([]);
  });

  it('is exactly what Next serves', async () => {
    expect(await nextConfig.redirects?.()).toEqual(LEGACY_TEACHER_REDIRECTS);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/legacy-redirects.test.ts`
Expected: FAIL. `LEGACY_TEACHER_REDIRECTS` isn't exported, and `nextConfig.redirects` is undefined.

- [ ] **Step 3: Move the redirects into the config**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from "next";

/**
 * Teacher URLs whose pages were removed or merged (programme plan §2.1).
 * Kept as redirects so bookmarks and old links still land somewhere useful.
 * Route params must match the destination folder names (e.g. papers/[id]).
 */
export const LEGACY_TEACHER_REDIRECTS: { source: string; destination: string; permanent: boolean }[] = [
  { source: '/teacher/lesson-plans', destination: '/teacher/lessons', permanent: true },
  { source: '/teacher/lesson-plans/:id', destination: '/teacher/lessons/:id', permanent: true },
  { source: '/teacher/quick-make', destination: '/teacher/lessons', permanent: true },
  { source: '/teacher/ai-tools/grading', destination: '/teacher/curriculum/mark-papers', permanent: true },
  { source: '/teacher/ai-tools/papers', destination: '/teacher/papers', permanent: true },
  { source: '/teacher/ai-tools/papers/:id', destination: '/teacher/papers/:id', permanent: true },
  { source: '/teacher/curriculum/assessments', destination: '/teacher/papers', permanent: true },
  { source: '/teacher/curriculum/assessments/:id', destination: '/teacher/papers/:id', permanent: true },
  { source: '/teacher/curriculum/papers', destination: '/teacher/papers', permanent: true },
  { source: '/teacher/curriculum/papers/:id', destination: '/teacher/papers/:id', permanent: true },
  { source: '/teacher/workbench/papers/builder', destination: '/teacher/papers', permanent: true },
  { source: '/teacher/workbench/question-bank', destination: '/teacher/curriculum/questions', permanent: true },
  { source: '/teacher/workbench/papers/:id/memo', destination: '/teacher/papers/:id', permanent: true },
];

const nextConfig: NextConfig = {
  async redirects() {
    return LEGACY_TEACHER_REDIRECTS;
  },
};

export default nextConfig;
```

- [ ] **Step 4: Delete the dead pages and anything only they used**

1. Delete the 13 page files listed under **Files**, using `git rm` on each path.
2. Remove `TEACHER_WORKBENCH_QUESTION_BANK` from `src/lib/routes.ts`.
3. Find code that only the deleted pages used:

```bash
grep -rln "usePaperMemo" src
grep -rln "TEACHER_WORKBENCH_QUESTION_BANK" src
```

4. If `src/hooks/usePaperMemo.ts` is now the only file that mentions `usePaperMemo`, delete it with `git rm`.
5. Check each component the deleted memo and question-bank pages imported, using `grep -rln "<ComponentName>" src`. Delete any component that no remaining file imports.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/legacy-redirects.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Full check and commit**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint next.config.ts src/lib/routes.ts tests/legacy-redirects.test.ts`

```bash
git add -A next.config.ts src/lib/routes.ts tests/legacy-redirects.test.ts "src/app/(dashboard)/teacher" src/hooks src/components
git commit -m "refactor(teacher): remove 13 dead routes and keep old links working as config redirects"
```

Before `git add -A`, run `git status --short`. Make sure it only lists the files this task touched; `frontend-dev.log` and `campusly-frontend.code-workspace` must not be staged.

---

### Task 5 (backend): Teachers get the Student 360 without fees and wallet

**Repo:** `C:\dev\campusly\.worktrees\backend-master`, branch `fix/teacher-phase-0` (created from `origin/master`).

**Files:**
- Create: `src/modules/Report/student360-redaction.ts`
- Modify: `src/modules/Report/controller.ts` (`getStudent360`, lines 99-109)
- Test: `src/modules/Report/__tests__/student360-redaction.test.ts`

**Interfaces:**
- Produces `redactStudent360ForRole<T extends object>(data: T, role: string): Partial<T>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Report/__tests__/student360-redaction.test.ts
import { describe, expect, it } from 'vitest';
import { redactStudent360ForRole } from '../student360-redaction.js';

const full = {
  student: { id: 's1' },
  academic: { termAverage: 71 },
  fees: { outstanding: 1200 },
  wallet: { balance: 35 },
  library: { borrowed: 1, overdue: 0 },
};

describe('redactStudent360ForRole', () => {
  it("hides a learner's fees and wallet from their teacher", () => {
    const view = redactStudent360ForRole(full, 'teacher');
    expect(view).not.toHaveProperty('fees');
    expect(view).not.toHaveProperty('wallet');
    expect(view).toMatchObject({ student: { id: 's1' }, academic: { termAverage: 71 } });
  });

  it('keeps everything for parents and school admins', () => {
    expect(redactStudent360ForRole(full, 'parent')).toEqual(full);
    expect(redactStudent360ForRole(full, 'school_admin')).toEqual(full);
  });

  it('does not change the original object', () => {
    redactStudent360ForRole(full, 'teacher');
    expect(full).toHaveProperty('fees');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/modules/Report/__tests__/student360-redaction.test.ts`
Expected: FAIL. The module can't be resolved.

- [ ] **Step 3: Implement it**

```ts
// src/modules/Report/student360-redaction.ts

/** Parts of the Student 360 a teacher has no need to see (money matters stay with parents and the office). */
const HIDDEN_FROM_TEACHERS = new Set(['fees', 'wallet']);

export function redactStudent360ForRole<T extends object>(data: T, role: string): Partial<T> {
  if (role !== 'teacher') return data;
  return Object.fromEntries(
    Object.entries(data).filter(([key]: [string, unknown]) => !HIDDEN_FROM_TEACHERS.has(key)),
  ) as Partial<T>;
}
```

- [ ] **Step 4: Use it in the controller**

In `src/modules/Report/controller.ts`:
1. Add `import { redactStudent360ForRole } from './student360-redaction.js';`.
2. In `getStudent360`, change the success line to:

```ts
    res.json(apiResponse(true, redactStudent360ForRole(data, user.role), 'Student 360 view retrieved successfully'));
```

- [ ] **Step 5: Run the test and full checks**

Run, with the env loaded as in Global Constraints:
1. `npx vitest run src/modules/Report/__tests__/student360-redaction.test.ts`: expect PASS.
2. `npx vitest run`: expect all files to pass.
3. `npx tsc --noEmit --preserveSymlinks`: expect exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/modules/Report/student360-redaction.ts src/modules/Report/controller.ts src/modules/Report/__tests__/student360-redaction.test.ts
git commit -m "fix(report): teachers' Student 360 omits the learner's fees and wallet"
```

---

### Task 6: The learner profile, linked from the roster and student list

**Files:**
- Modify: `src/types/student-360.ts`: add `LearnerProfileData`.
- Create: `src/lib/learner-profile.ts`
- Create: `src/hooks/useLearnerProfile.ts`
- Create: `src/components/students/LearnerQuickStats.tsx`
- Replace: `src/app/(dashboard)/teacher/students/[id]/page.tsx`, which is currently a server redirect to the workbench.
- Modify: `src/components/classes/RosterStudentRow.tsx`, the identity block at lines 39-42.
- Modify: `src/app/(dashboard)/teacher/students/page.tsx`, the card at lines 101-118.
- Modify: `next.config.ts`: append a redirect.
- Delete:
  - `src/app/(dashboard)/teacher/workbench/student-360/[id]/page.tsx`
  - `src/hooks/useStudent360.ts`
  - `src/components/workbench/student-360/*`, once grep confirms nothing else imports them.
- Test: `tests/learner-profile.test.ts`

**Interfaces:**
- Consumes: Task 5's API change (no fees or wallet for teachers). The frontend never reads those fields.
- Produces:
  - `type LearnerProfileData = Omit<FullStudent360Data, 'fees' | 'wallet'>`
  - `teacherLearnerProfilePath(studentId: string): string`
  - `learnerQuickStats(profile: LearnerProfileData): LearnerStat[]`
  - `useLearnerProfile(): { profile; loading; error; loadProfile(studentId) }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/learner-profile.test.ts
import { describe, expect, it } from 'vitest';
import { learnerQuickStats, teacherLearnerProfilePath } from '../src/lib/learner-profile';
import type { LearnerProfileData } from '../src/types/student-360';

function profile(overrides: Partial<LearnerProfileData> = {}): LearnerProfileData {
  return {
    student: { id: 's1', firstName: 'Lebo', lastName: 'Mthembu', admissionNumber: 'GFP-1', gradeName: 'Grade 1', className: 'A' },
    academic: { subjects: [{ name: 'English', mark: 15, total: 20, percentage: 75 }, { name: 'Maths', mark: 14, total: 20, percentage: 70 }], termAverage: 72.6 },
    attendance: { present: 40, absent: 2, late: 1, excused: 0, percentage: 93.4 },
    homework: { pending: 1, completed: 6, averageMark: 68 },
    achievements: { recent: [], totalMerits: 4, totalDemerits: 1 },
    library: { borrowed: 0, overdue: 0 },
    sports: { cards: [] },
    behaviour: { recentIncidents: [] },
    ...overrides,
  };
}

describe('learnerQuickStats', () => {
  it('summarises marks, attendance, homework and behaviour in teacher terms', () => {
    expect(learnerQuickStats(profile())).toEqual([
      { key: 'average', title: 'Term average', value: '73%', description: '2 subjects' },
      { key: 'attendance', title: 'Attendance', value: '93%', description: '2 days absent' },
      { key: 'homework', title: 'Homework done', value: '6', description: '1 still to hand in' },
      { key: 'merits', title: 'Merits', value: '4', description: '1 demerit' },
    ]);
  });

  it("shows a new learner's empty record as not-yet, not as 0%", () => {
    const stats = learnerQuickStats(profile({
      academic: { subjects: [], termAverage: 0 },
      attendance: { present: 0, absent: 0, late: 0, excused: 0, percentage: 0 },
      homework: { pending: 0, completed: 0, averageMark: 0 },
    }));
    expect(stats[0]).toMatchObject({ value: '—', description: 'No marks yet' });
    expect(stats[1]).toMatchObject({ value: '—', description: 'No registers yet' });
    expect(stats[2]).toMatchObject({ value: '0', description: 'Nothing outstanding' });
  });
});

describe('teacherLearnerProfilePath', () => {
  it("links to the learner's profile", () => {
    expect(teacherLearnerProfilePath('abc123')).toBe('/teacher/students/abc123');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/learner-profile.test.ts`
Expected: FAIL. The module can't be resolved.

- [ ] **Step 3: Add the type and helpers**

Append to `src/types/student-360.ts`:

```ts
/** What a teacher sees about one of their learners: the Student 360 without fees or wallet. */
export type LearnerProfileData = Omit<FullStudent360Data, 'fees' | 'wallet'>;
```

```ts
// src/lib/learner-profile.ts
import type { LearnerProfileData } from '@/types/student-360';

export type LearnerStatKey = 'average' | 'attendance' | 'homework' | 'merits';

export interface LearnerStat {
  key: LearnerStatKey;
  title: string;
  value: string;
  description: string;
}

export function teacherLearnerProfilePath(studentId: string): string {
  return `/teacher/students/${encodeURIComponent(studentId)}`;
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? `1 ${one}` : `${n} ${many}`);

export function learnerQuickStats(profile: LearnerProfileData): LearnerStat[] {
  const { academic, attendance, homework, achievements } = profile;
  const registers = attendance.present + attendance.absent + attendance.late + attendance.excused;
  return [
    academic.subjects.length === 0
      ? { key: 'average', title: 'Term average', value: '—', description: 'No marks yet' }
      : {
          key: 'average', title: 'Term average', value: `${Math.round(academic.termAverage)}%`,
          description: plural(academic.subjects.length, 'subject', 'subjects'),
        },
    registers === 0
      ? { key: 'attendance', title: 'Attendance', value: '—', description: 'No registers yet' }
      : {
          key: 'attendance', title: 'Attendance', value: `${Math.round(attendance.percentage)}%`,
          description: plural(attendance.absent, 'day absent', 'days absent'),
        },
    {
      key: 'homework', title: 'Homework done', value: String(homework.completed),
      description: homework.pending === 0 ? 'Nothing outstanding' : `${homework.pending} still to hand in`,
    },
    {
      key: 'merits', title: 'Merits', value: String(achievements.totalMerits),
      description: plural(achievements.totalDemerits, 'demerit', 'demerits'),
    },
  ];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/learner-profile.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Add the hook, the stats component and the page**

```ts
// src/hooks/useLearnerProfile.ts
'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import type { LearnerProfileData } from '@/types/student-360';

export function useLearnerProfile() {
  const [profile, setProfile] = useState<LearnerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/reports/student/${studentId}/360`);
      setProfile(unwrapResponse<LearnerProfileData>(response));
    } catch (err: unknown) {
      console.error('Failed to load learner profile', err);
      setProfile(null);
      setError(extractErrorMessage(err, "We couldn't load this learner's profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, loadProfile };
}
```

```tsx
// src/components/students/LearnerQuickStats.tsx
'use client';

import { Award, BookOpen, CalendarCheck, TrendingUp, type LucideIcon } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { learnerQuickStats, type LearnerStatKey } from '@/lib/learner-profile';
import type { LearnerProfileData } from '@/types/student-360';

const ICONS: Record<LearnerStatKey, LucideIcon> = {
  average: TrendingUp,
  attendance: CalendarCheck,
  homework: BookOpen,
  merits: Award,
};

export function LearnerQuickStats({ profile }: { profile: LearnerProfileData }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {learnerQuickStats(profile).map((stat) => (
        <StatCard key={stat.key} title={stat.title} value={stat.value} description={stat.description} icon={ICONS[stat.key]} />
      ))}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/teacher/students/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { AcademicSummaryCard } from '@/components/student-360/AcademicSummaryCard';
import { AttendanceSummaryCard } from '@/components/student-360/AttendanceSummaryCard';
import { RecentActivityCard } from '@/components/student-360/RecentActivityCard';
import { LearnerQuickStats } from '@/components/students/LearnerQuickStats';
import { useLearnerProfile } from '@/hooks/useLearnerProfile';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

export default function LearnerProfilePage() {
  const params = useParams();
  const studentId = typeof params.id === 'string' ? params.id : '';
  const { profile, loading, error, loadProfile } = useLearnerProfile();

  useEffect(() => {
    if (studentId) void loadProfile(studentId);
  }, [studentId, loadProfile]);

  const back = (
    <Link href={ROUTES.TEACHER_CLASSES} className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      My classes
    </Link>
  );

  if (loading) return <LoadingSpinner />;
  if (error || !profile) {
    return (
      <EmptyState
        icon={UserRound}
        title="We couldn't open this learner"
        description={error ?? "This learner isn't in one of your classes."}
        action={back}
      />
    );
  }

  const { student } = profile;
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`${student.gradeName} ${student.className} · ${student.admissionNumber}`}
      >
        {back}
      </PageHeader>
      <LearnerQuickStats profile={profile} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AcademicSummaryCard academic={profile.academic} />
        <AttendanceSummaryCard attendance={profile.attendance} />
      </div>
      <RecentActivityCard achievements={profile.achievements} behaviour={profile.behaviour} sports={profile.sports} />
    </div>
  );
}
```

- [ ] **Step 6: Link learners to their profile**

In `src/components/classes/RosterStudentRow.tsx`:
1. Add `import Link from 'next/link';` and `import { teacherLearnerProfilePath } from '@/lib/learner-profile';`.
2. Replace the identity `div` (lines 39-42) with:

```tsx
      <Link href={teacherLearnerProfilePath(student.id)} className="flex-1 min-w-0 rounded-md hover:underline focus-visible:outline-2">
        <p className="text-sm font-medium truncate">{first} {last}</p>
        <p className="text-xs text-muted-foreground truncate">{student.admissionNumber}</p>
      </Link>
```

In `src/app/(dashboard)/teacher/students/page.tsx`:
1. Add `import Link from 'next/link';` and `import { teacherLearnerProfilePath } from '@/lib/learner-profile';`.
2. Wrap each card:

```tsx
              <Link key={student.id} href={teacherLearnerProfilePath(student.id)} className="block rounded-xl focus-visible:outline-2">
                <Card className="transition-colors hover:border-primary/50">
                  {/* existing CardContent unchanged */}
                </Card>
              </Link>
```

3. Remove the `key` from `Card`, since it moves to `Link`.

- [ ] **Step 7: Retire the workbench copy**

1. Append to `LEGACY_TEACHER_REDIRECTS` in `next.config.ts`:

```ts
  { source: '/teacher/workbench/student-360/:id', destination: '/teacher/students/:id', permanent: true },
```

2. Run `git rm "src/app/(dashboard)/teacher/workbench/student-360/[id]/page.tsx" src/hooks/useStudent360.ts`.
3. Run `grep -rln "components/workbench/student-360" src`. If nothing is found, `git rm -r src/components/workbench/student-360`.

- [ ] **Step 8: Full check and commit**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint src/lib/learner-profile.ts src/hooks/useLearnerProfile.ts src/components/students/LearnerQuickStats.tsx "src/app/(dashboard)/teacher/students" src/components/classes/RosterStudentRow.tsx next.config.ts tests/learner-profile.test.ts`
Expected: all pass. `tests/legacy-redirects.test.ts` also covers the new redirect.

```bash
git add -A src/types/student-360.ts src/lib/learner-profile.ts src/hooks src/components/students/LearnerQuickStats.tsx src/components/classes/RosterStudentRow.tsx src/components/workbench "src/app/(dashboard)/teacher/students" "src/app/(dashboard)/teacher/workbench" next.config.ts tests/learner-profile.test.ts
git commit -m "feat(teacher): a learner profile every roster and student row opens"
```

---

### Task 7: Teachers can read and acknowledge policies

**Files:**
- Create: `src/lib/policy-acknowledgement.ts`
- Modify: `src/hooks/useGovernancePolicies.ts`: add pending-acknowledgement state and fetch.
- Create: `src/app/(dashboard)/teacher/policies/[id]/page.tsx`
- Modify: `src/app/(dashboard)/teacher/policies/page.tsx`: `onView` currently points at the admin route.
- Test: `tests/policy-acknowledgement.test.ts`

**Interfaces:**
- Consumes: `ROUTES.TEACHER_POLICIES` (Task 2).
- Produces: `isPolicyAcknowledged(policyId: string, pending: ReadonlyArray<{ id: string }> | null): boolean | null`. The hook gains `pendingAcknowledgements: PendingPolicy[] | null` and `fetchPendingAcknowledgements(): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/policy-acknowledgement.test.ts
import { describe, expect, it } from 'vitest';
import { isPolicyAcknowledged } from '../src/lib/policy-acknowledgement';

describe('isPolicyAcknowledged', () => {
  it("is still acknowledging when the policy is on the teacher's to-do list", () => {
    expect(isPolicyAcknowledged('p1', [{ id: 'p1' }, { id: 'p2' }])).toBe(false);
  });

  it('is acknowledged once it drops off the list (including after a duplicate click)', () => {
    expect(isPolicyAcknowledged('p1', [{ id: 'p2' }])).toBe(true);
    expect(isPolicyAcknowledged('p1', [])).toBe(true);
  });

  it("is unknown until the teacher's list has loaded", () => {
    expect(isPolicyAcknowledged('p1', null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/policy-acknowledgement.test.ts`
Expected: FAIL. The module can't be resolved.

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/policy-acknowledgement.ts

/**
 * The backend's /governance/policies/pending-acknowledgements lists the active
 * policies this user has NOT acknowledged. A policy absent from it is done.
 * Null means the list hasn't loaded, so don't show a button yet.
 */
export function isPolicyAcknowledged(
  policyId: string,
  pending: ReadonlyArray<{ id: string }> | null,
): boolean | null {
  if (pending === null) return null;
  return !pending.some((p: { id: string }) => p.id === policyId);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/policy-acknowledgement.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Extend the hook**

In `src/hooks/useGovernancePolicies.ts`:
1. Check that `unwrapList` is imported from `@/lib/api-helpers`; it's used by `fetchAcknowledgements`.
2. Next to the other `useState`s, add:

```ts
  const [pendingAcknowledgements, setPendingAcknowledgements] = useState<PendingPolicy[] | null>(null);
```

3. Above the hook, add:

```ts
export interface PendingPolicy {
  id: string;
  title: string;
}
```

4. Below `acknowledgePolicy`, add:

```ts
  const fetchPendingAcknowledgements = useCallback(async () => {
    try {
      const response = await apiClient.get('/governance/policies/pending-acknowledgements');
      setPendingAcknowledgements(unwrapList<PendingPolicy>(response));
    } catch (err: unknown) {
      console.error('Failed to load policies to acknowledge', err);
      setPendingAcknowledgements([]);
    }
  }, []);
```

5. Add `pendingAcknowledgements` and `fetchPendingAcknowledgements` to the returned object.

- [ ] **Step 6: Add the teacher policy page and point the list at it**

```tsx
// src/app/(dashboard)/teacher/policies/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { PolicyDetailView, PolicyAcknowledgeButton } from '@/components/governance';
import { useGovernancePolicies } from '@/hooks/useGovernancePolicies';
import { isPolicyAcknowledged } from '@/lib/policy-acknowledgement';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

export default function TeacherPolicyPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const {
    activePolicy, fetchPolicy, acknowledgePolicy, pendingAcknowledgements, fetchPendingAcknowledgements, loading,
  } = useGovernancePolicies();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!id) return;
    void Promise.all([fetchPolicy(id), fetchPendingAcknowledgements()]).finally(() => setRequested(true));
  }, [id, fetchPolicy, fetchPendingAcknowledgements]);

  const back = (
    <Link href={ROUTES.TEACHER_POLICIES} className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      All policies
    </Link>
  );

  if (!requested || loading) return <LoadingSpinner />;
  if (!activePolicy) {
    return <EmptyState icon={BookOpen} title="This policy isn't available" description="It may have been withdrawn or replaced." action={back} />;
  }

  const acknowledged = isPolicyAcknowledged(id, pendingAcknowledgements);
  return (
    <div className="space-y-6">
      <PageHeader title={activePolicy.title} description={`Version ${activePolicy.version}`}>
        {back}
        {acknowledged !== null && (
          <PolicyAcknowledgeButton
            acknowledged={acknowledged}
            onAcknowledge={async () => {
              await acknowledgePolicy(id);
              await fetchPendingAcknowledgements();
            }}
          />
        )}
      </PageHeader>
      <PolicyDetailView policy={activePolicy} />
    </div>
  );
}
```

1. Check that `PolicyAcknowledgeButton` is exported from `src/components/governance/index.ts`; the export is at line 13.
2. In `src/app/(dashboard)/teacher/policies/page.tsx`, change `onView` to:

```tsx
          onView={(id) => router.push(`${ROUTES.TEACHER_POLICIES}/${id}`)}
```

3. Add `import { ROUTES } from '@/lib/routes';`.

- [ ] **Step 7: Full check and commit**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint src/lib/policy-acknowledgement.ts src/hooks/useGovernancePolicies.ts "src/app/(dashboard)/teacher/policies" tests/policy-acknowledgement.test.ts`

```bash
git add src/lib/policy-acknowledgement.ts src/hooks/useGovernancePolicies.ts "src/app/(dashboard)/teacher/policies" tests/policy-acknowledgement.test.ts
git commit -m "fix(policies): teachers can open and acknowledge school policies"
```

---

### Task 8: HOD Approve and Request changes actually moderate the paper

**Files:**
- Create: `src/lib/moderation.ts`
- Create: `src/components/hod/RequestChangesDialog.tsx`
- Modify: `src/components/hod/index.ts`: export the dialog.
- Modify: `src/hooks/usePaperModeration.ts`: `reviewPaper` returns `boolean` (lines 80-102).
- Modify: `src/app/(dashboard)/teacher/hod/page.tsx`: the handlers at lines 55-61 and the table at line 139.
- Test: `tests/moderation.test.ts`

**Interfaces:**
- Produces `canSendChangeRequest(comments: string): boolean` and `RequestChangesDialog({ open, submitting, onOpenChange, onSend })`. `reviewPaper(paperId, status, comments): Promise<boolean>`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/moderation.test.ts
import { describe, expect, it } from 'vitest';
import { canSendChangeRequest } from '../src/lib/moderation';

describe('canSendChangeRequest', () => {
  it('needs a real note so the teacher knows what to change', () => {
    expect(canSendChangeRequest('')).toBe(false);
    expect(canSendChangeRequest('   ')).toBe(false);
    expect(canSendChangeRequest('ok')).toBe(false);
  });

  it('accepts a short, specific note', () => {
    expect(canSendChangeRequest('Q4 is above grade level')).toBe(true);
  });

  it('refuses a note longer than the server accepts', () => {
    expect(canSendChangeRequest('x'.repeat(2001))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/moderation.test.ts`
Expected: FAIL. The module can't be resolved.

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/moderation.ts

/** Backend reviewPaperSchema caps comments at 2000 characters. */
export const MAX_REVIEW_COMMENT = 2000;
const MIN_CHANGE_REQUEST = 5;

export function canSendChangeRequest(comments: string): boolean {
  const note = comments.trim();
  return note.length >= MIN_CHANGE_REQUEST && comments.length <= MAX_REVIEW_COMMENT;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/moderation.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Make reviewPaper report success**

In `src/hooks/usePaperModeration.ts`, change `reviewPaper`:
1. After `await fetchQueue();`, add `return true;`.
2. At the end of the `catch` block, add `return false;`.
3. Type the callback's return as `Promise<boolean>`.

- [ ] **Step 6: Add the dialog**

```tsx
// src/components/hod/RequestChangesDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { canSendChangeRequest, MAX_REVIEW_COMMENT } from '@/lib/moderation';

interface RequestChangesDialogProps {
  open: boolean;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (comments: string) => Promise<void>;
}

/** Mount with a `key` per paper so each opening starts with an empty note. */
export function RequestChangesDialog({ open, submitting, onOpenChange, onSend }: RequestChangesDialogProps) {
  const [comments, setComments] = useState('');
  const ready = canSendChangeRequest(comments);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle>Request changes</DialogTitle>
          <DialogDescription>The teacher sees this note with their paper.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 space-y-2 overflow-y-auto py-4">
          <Label htmlFor="request-changes-note">
            What needs to change? <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="request-changes-note"
            rows={5}
            maxLength={MAX_REVIEW_COMMENT}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="For example: question 4 is above Grade 7 level; swap it for a term 2 question."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!ready || submitting} onClick={() => { void onSend(comments.trim()); }}>
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Add `export { RequestChangesDialog } from './RequestChangesDialog';` to `src/components/hod/index.ts`.

- [ ] **Step 7: Wire the HOD page**

In `src/app/(dashboard)/teacher/hod/page.tsx`:
1. Add `import { usePaperModeration } from '@/hooks/usePaperModeration';` and add `RequestChangesDialog` to the `@/components/hod` import.
2. Replace the two stub handlers (lines 55-61) with:

```tsx
  const { reviewPaper, submitting: reviewing } = usePaperModeration();
  const [changesFor, setChangesFor] = useState<string | null>(null);

  const refreshModeration = useCallback(async () => {
    if (departmentId) await fetchModeration(departmentId);
  }, [departmentId, fetchModeration]);

  const handleApprove = useCallback(async (paperId: string) => {
    if (await reviewPaper(paperId, 'approved', '')) await refreshModeration();
  }, [reviewPaper, refreshModeration]);

  const handleRequestChanges = useCallback((paperId: string) => {
    setChangesFor(paperId);
  }, []);

  const handleSendChanges = useCallback(async (comments: string) => {
    if (!changesFor) return;
    if (await reviewPaper(changesFor, 'changes_requested', comments)) {
      setChangesFor(null);
      await refreshModeration();
    }
  }, [changesFor, reviewPaper, refreshModeration]);
```

3. Remove the now-unused `toast` import only if nothing else in the file uses it; it's still used by observation handlers, so keep it.
4. Render the dialog once, just before the page's closing `</div>`:

```tsx
      <RequestChangesDialog
        key={changesFor ?? 'closed'}
        open={changesFor !== null}
        submitting={reviewing}
        onOpenChange={(open) => { if (!open) setChangesFor(null); }}
        onSend={handleSendChanges}
      />
```

- [ ] **Step 8: Full check and commit**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint src/lib/moderation.ts src/components/hod/RequestChangesDialog.tsx src/components/hod/index.ts src/hooks/usePaperModeration.ts "src/app/(dashboard)/teacher/hod/page.tsx" tests/moderation.test.ts && wc -l "src/app/(dashboard)/teacher/hod/page.tsx"`
Expected: all pass. The HOD page is ≤ 350 lines (it was 183).

```bash
git add src/lib/moderation.ts src/components/hod src/hooks/usePaperModeration.ts "src/app/(dashboard)/teacher/hod/page.tsx" tests/moderation.test.ts
git commit -m "fix(hod): Approve and Request changes moderate the paper instead of showing a placeholder"
```

---

### Task 9: Gradebook "Set weightings" opens weightings; labels and page frame match

**Files:**
- Modify: `src/lib/gradebook-helpers.ts`: add `subjectChipOpens`.
- Modify: `src/components/grades/TermSummarySubjectChip.tsx`: the body button at lines 29-52.
- Modify: `src/app/(dashboard)/teacher/communication/page.tsx:132`: title "Communication" → "Announcements".
- Modify: `src/app/(dashboard)/teacher/messages/page.tsx:69,82`: title "Direct Messages" → "Messages".
- Modify: `src/app/(dashboard)/teacher/workbench/marking-hub/page.tsx`: the root `div` (line 59) drops `p-4 sm:p-6`.
- Test: `tests/gradebook-helpers.test.ts` (extend it).

**Interfaces:**
- Produces `subjectChipOpens(missingWeighting: boolean): 'weightings' | 'trend'`.

- [ ] **Step 1: Write the failing test**

Add `subjectChipOpens` to the import list in `tests/gradebook-helpers.test.ts`, and append:

```ts
describe('subjectChipOpens', () => {
  it('opens the weightings when the chip is asking the teacher to set them', () => {
    expect(subjectChipOpens(true)).toBe('weightings');
  });

  it('opens the trend once weightings are set', () => {
    expect(subjectChipOpens(false)).toBe('trend');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/gradebook-helpers.test.ts`
Expected: FAIL. `subjectChipOpens is not a function`.

- [ ] **Step 3: Implement the helper and use it**

Append to `src/lib/gradebook-helpers.ts`:

```ts
/** A subject chip that says "Set weightings" must open the weightings, not the trend chart. */
export function subjectChipOpens(missingWeighting: boolean): 'weightings' | 'trend' {
  return missingWeighting ? 'weightings' : 'trend';
}
```

In `src/components/grades/TermSummarySubjectChip.tsx`:
1. Add `import { subjectChipOpens } from '@/lib/gradebook-helpers';`.
2. Change the body `<button>`'s `onClick` and `aria-label`:

```tsx
        onClick={subjectChipOpens(missing) === 'weightings' ? onConfigureWeightings : onOpenTrend}
        className="block w-full text-left px-3 py-2 pr-9"
        aria-label={missing ? `Set weightings for ${subject.subjectName}` : `View trend for ${subject.subjectName}`}
```

- [ ] **Step 4: Fix the labels and the marking hub frame**

1. `communication/page.tsx:132`: `title="Announcements"`, `description="Tell parents and guardians something, by message or SMS"`.
2. `messages/page.tsx:69` and `:82`: `title="Messages"`.
3. `workbench/marking-hub/page.tsx`: `<div className="space-y-6 p-4 sm:p-6">` becomes `<div className="space-y-6">`. The dashboard `main` already pads pages.

- [ ] **Step 5: Run the tests and commit**

Run: `npx vitest run && npx tsc --noEmit -p . && npx eslint src/lib/gradebook-helpers.ts src/components/grades/TermSummarySubjectChip.tsx "src/app/(dashboard)/teacher/communication/page.tsx" "src/app/(dashboard)/teacher/messages/page.tsx" "src/app/(dashboard)/teacher/workbench/marking-hub/page.tsx" tests/gradebook-helpers.test.ts`

```bash
git add src/lib/gradebook-helpers.ts src/components/grades/TermSummarySubjectChip.tsx "src/app/(dashboard)/teacher/communication/page.tsx" "src/app/(dashboard)/teacher/messages/page.tsx" "src/app/(dashboard)/teacher/workbench/marking-hub/page.tsx" tests/gradebook-helpers.test.ts
git commit -m "fix(teacher): Set weightings opens weightings; page titles match the nav; marking hub uses the page frame"
```

---

### Task 10: Verify in the browser, review, ship

**Files:** none new.

- [ ] **Step 1: Restart the dev servers.** `next.config.ts` changed, so the redirects only load on start. Use `preview_stop`/`preview_start` for `campusly-frontend`. Start `campusly-backend` from the worktree on `fix/teacher-phase-0`.

- [ ] **Step 2: Check the redirects**

```bash
for p in /teacher/quick-make /teacher/lesson-plans/abc /teacher/workbench/question-bank /teacher/workbench/student-360/abc /teacher/curriculum/papers/abc; do curl -s -o /dev/null -w "$p %{http_code} %{redirect_url}\n" "http://localhost:3500$p"; done
```

Expected: each returns `308` with the destination from `LEGACY_TEACHER_REDIRECTS`.

- [ ] **Step 3: Run the screenshot tour**

1. Mint fresh tokens for `thandi` and `lindiwe`, as in `campusly-local-run` memory.
2. Regenerate `static-routes.txt` so the deleted pages drop out. Run in the frontend: `find "src/app/(dashboard)/teacher" -name page.tsx | sed 's|src/app/(dashboard)||; s|/page.tsx||' | grep -v "\[" | sort`. Then rerun `scratchpad/portal-tour-all.cjs` for both teachers.
3. Expect `thandi-report.json` to show 0 routes with 403 console errors. The 12 formerly failing pages now show "isn't switched on for your school" or load.
4. Open and look at the screenshots for `/teacher/workbench/marking-hub`, `/teacher/courses`, `/teacher/policies` and a learner profile. For the profile, take a student id from `GET /api/academic/classes/:id/students` for Thandi's class.

- [ ] **Step 4: Check the phone nav**

1. Screenshot `/teacher` at 390×844.
2. Click "More", then screenshot again.
3. Expect the sheet to list Students, Messages, Notice Board, Meetings, Discipline, Merits, Refer to counsellor, Reports, Report Comments, Substitutes and Policies. Items for modules Greenfield lacks, such as Announcements or Incidents, should be absent.

- [ ] **Step 5: Check policies and HOD by hand, through the API**

1. As Thandi, run `GET /api/governance/policies/pending-acknowledgements`.
2. If Greenfield has no active policy, create one as the school admin: `POST /api/governance/policies`.
3. Open `/teacher/policies/<id>` and click Acknowledge. It turns into "Acknowledged".
4. Reload the page. It still reads "Acknowledged".

- [ ] **Step 6: Review.** Dispatch a code-reviewer agent over `git diff origin/master...fix/teacher-phase-0` in both repos. Fix CRITICAL and HIGH findings, with a test first where there's logic.

- [ ] **Step 7: Push, open PRs, merge**, following the GitHub compromise protocol in memory:
  1. `git fetch origin`.
  2. Confirm `origin/master` is unchanged from the known SHA.
  3. Scan the branch diff for loader patterns (`atob(`, `eval(`, `new Function(`, `node-fetch`, `process.env.AUTH_API_KEY`).
  4. Push the backend first. The backend pre-push guard's 4 known false positives are allowed only if the flagged files are byte-identical to master.
  5. Open PRs with a test plan, wait for Vercel on the frontend, and merge by fast-forward (`git push origin fix/teacher-phase-0:master`).
  6. Update the tracker tasks `p0-00`…`p0-10` to done with PR links.
