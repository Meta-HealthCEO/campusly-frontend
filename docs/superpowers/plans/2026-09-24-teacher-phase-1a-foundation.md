# Teacher Portal Phase 1A: Foundation (look and six-section navigation) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen by Shaun: native) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give the teacher portal the night-back identity:
- teacher-scoped tokens and fonts
- the midnight sidebar in six sections, with live counts and a "me" card
- a context top bar
- section sheets on phones
- restyled shared components

Other portals stay pixel-identical.

**Architecture:**
- **Scope.** `data-portal="teacher"` goes on the dashboard wrapper and is mirrored onto `document.body` for portalled overlays. It switches on CSS token overrides in `globals.css` and the three `next/font` families.
- **Teacher-only restyling.** Every restyle of a shared component (Sidebar, TopBar, BottomNav, PageHeader, EmptyState, StatCard) uses a Tailwind `teacher:` custom variant, so other portals don't change.
- **Pure logic.** Section grouping, counts, top-bar context, the phone layout, status-chip mapping and the colour/contrast guards live in `src/lib/*` with vitest tests.

**Tech Stack:** Next.js 16.2 (App Router, `next/font/google`), React 19, Tailwind 4 (`@theme inline`, `@custom-variant`), next-themes (`.dark` class on `<html>`), Zustand, vitest (node env).

**Spec:** `docs/superpowers/specs/2026-09-24-teacher-portal-look-design.md` (§5 visual system, §6 architecture, §10 QA) and `docs/superpowers/specs/2026-09-24-teacher-portal-programme.md` §3 (six sections).

**Branch:** frontend `feat/teacher-phase-1`, created from `fix/teacher-phase-0` once phase 0A is merged to master (or from `master` after that merge).

## Global Constraints

- Everything in phase 0A's Global Constraints: no `apiClient` in pages or components, no `any`, ≤ 350 lines per file, `catch (err: unknown)`, tokens instead of raw red, mobile first, 44px targets, empty and loading states, the dialog pattern, Next 16 docs, conventional commits with the Co-Authored-By line, 280s commit timeout.
- **Other portals must not change.** Any class that changes appearance on a component shared by other roles goes behind the `teacher:` variant. Unscoped changes are allowed only when they are visually identical for other roles (for example `font-heading`, which resolves to Inter outside the teacher scope).
- **Token values** are exactly those in look-design spec §5.1, including the AA fixes: `--muted-foreground: #62687f` and sidebar label `#8a90ab`.
- **Fonts:**
  - Bricolage Grotesque for headings, Instrument Sans for UI text, JetBrains Mono for numbers.
  - All via `next/font/google`, latin subset, `display: 'swap'`, and variable fonts with no weight list.
  - Variables: `--font-display`, `--font-ui`, `--font-numeric`.
- **Six sections** exactly as look-design §6.4 (updated): Today / Teach / Assess / Class / Talk / Me.

## Review Focus

1. **Another role's portal** (admin, parent, student) renders exactly as before: the same sidebar colours, header size and fonts. Task 11 compares before/after screenshots.
2. **Dark mode in the teacher portal.** Every token pair meets AA (Task 1 test), and overlays (dialogs, selects, toasts) opened from teacher pages use the teacher tokens, because the scope is mirrored on `<body>` (Task 2).
3. **A standalone teacher.** Their smaller nav still only links to allowed paths, and the section labels appear without empty sections (Tasks 3–4).
4. **Counts that fail to load,** or a school without the workbench or messaging. No badge and no error toast. A zero count shows no badge (Task 5).
5. **A page not in the nav** (e.g. `/teacher/lessons/123`). The top bar falls back to its closest nav ancestor ("Teach · Lessons") or to "Teacher", never blank (Task 6).

---

### Task 1: Teacher tokens, the `teacher:` variant, font indirection and a contrast test

**Files:**
- Modify: `src/app/globals.css`
- Test: `tests/teacher-tokens.test.ts`

**Interfaces:**
- Produces:
  - CSS custom properties on `[data-portal="teacher"]` and `.dark [data-portal="teacher"]`
  - Tailwind utilities `bg-success`, `bg-success-soft`, `text-success`, `bg-attention`, `bg-attention-soft`, `text-attention`, `bg-info-soft`, `text-info`, `bg-accent-soft`, `bg-destructive-soft`, `text-sidebar-label`
  - the variant `teacher:`
  - `--portal-font-heading` / `--portal-font-mono` hooks

- [ ] **Step 1: Write the failing test.** It parses `globals.css` for the teacher blocks and checks WCAG AA (≥ 4.5) for text pairs. rgba backgrounds are blended over `--card`.

```ts
// tests/teacher-tokens.test.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.resolve(__dirname, '../src/app/globals.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return {};
  const body = css.slice(start + selector.length + 2, css.indexOf('}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

type RGBA = [number, number, number, number];
function parse(color: string): RGBA {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as RGBA;
  const rgba = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4])];
  throw new Error(`Unsupported colour ${color}`);
}
const over = (top: RGBA, base: RGBA): RGBA => [0, 1, 2].map((i) => top[i] * top[3] + base[i] * (1 - top[3])).concat(1) as RGBA;
const lum = ([r, g, b]: RGBA) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: RGBA, b: RGBA) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const PAIRS: Array<[string, string]> = [
  ['foreground', 'background'], ['muted-foreground', 'background'], ['muted-foreground', 'card'],
  ['primary-foreground', 'primary'], ['accent', 'accent-soft'], ['success', 'success-soft'],
  ['attention', 'attention-soft'], ['destructive', 'destructive-soft'], ['info', 'info-soft'],
  ['sidebar-foreground', 'sidebar'], ['sidebar-label', 'sidebar'], ['sidebar-primary', 'sidebar'],
];

describe.each([
  ['light', block('[data-portal="teacher"]')],
  ['dark', { ...block('[data-portal="teacher"]'), ...block('.dark [data-portal="teacher"]') }],
])('teacher %s theme', (_theme, tokens) => {
  it('defines every token the portal uses', () => {
    for (const [fg, bg] of PAIRS) {
      expect(tokens[fg], fg).toBeTruthy();
      expect(tokens[bg], bg).toBeTruthy();
    }
  });

  it.each(PAIRS)('keeps %s readable on %s (WCAG AA)', (fg, bg) => {
    const card = parse(tokens.card);
    const base = over(parse(tokens[bg]), card);
    expect(contrast(over(parse(tokens[fg]), base), base)).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/teacher-tokens.test.ts`
Expected: FAIL. The "defines every token" checks fail because there's no teacher block yet.

- [ ] **Step 3: Add the tokens, variant and indirection to `src/app/globals.css`**

1. After `@custom-variant dark (&:is(.dark *));`, add:

```css
@custom-variant teacher (&:where([data-portal="teacher"], [data-portal="teacher"] *));
```

2. In `@theme inline`, change the `--font-mono` line and the `--font-heading` line:

```css
  --font-mono: var(--portal-font-mono, var(--font-geist-mono));
  --font-heading: var(--portal-font-heading, var(--font-sans));
```

3. Also in `@theme inline`, add:

```css
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-attention: var(--attention);
  --color-attention-soft: var(--attention-soft);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-accent-soft: var(--accent-soft);
  --color-destructive-soft: var(--destructive-soft);
  --color-sidebar-label: var(--sidebar-label);
```

4. At the end of `:root`, add defaults so the utilities work everywhere:

```css
  --success: #047857;
  --success-soft: #e7f8f1;
  --attention: #b45309;
  --attention-soft: #fdf3e1;
  --info: #0369a1;
  --info-soft: #e6f3fb;
  --accent-soft: oklch(0.97 0 0);
  --destructive-soft: #fdecef;
  --sidebar-label: oklch(0.556 0 0);
```

5. At the end of `.dark`, add:

```css
  --success: #6ee7b7;
  --success-soft: rgba(52, 211, 153, 0.12);
  --attention: #fcd34d;
  --attention-soft: rgba(251, 191, 36, 0.12);
  --info: #7dd3fc;
  --info-soft: rgba(56, 189, 248, 0.12);
  --accent-soft: oklch(0.269 0 0);
  --destructive-soft: rgba(251, 113, 133, 0.12);
  --sidebar-label: oklch(0.708 0 0);
```

6. After the `.dark` block, add the teacher blocks (values from look-design §5.1):

```css
[data-portal="teacher"] {
  --background: #f5f6fb;
  --foreground: #0d1224;
  --card: #ffffff;
  --card-foreground: #0d1224;
  --popover: #ffffff;
  --popover-foreground: #0d1224;
  --primary: #7c3aed;
  --primary-foreground: #ffffff;
  --secondary: #eef0f6;
  --secondary-foreground: #0d1224;
  --muted: #eef0f6;
  --muted-foreground: #62687f;
  --accent: #6d28d9;
  --accent-foreground: #ffffff;
  --accent-soft: #f1ecfe;
  --destructive: #be123c;
  --destructive-soft: #fdecef;
  --success: #047857;
  --success-soft: #e7f8f1;
  --attention: #b45309;
  --attention-soft: #fdf3e1;
  --info: #0369a1;
  --info-soft: #e6f3fb;
  --border: #e4e6f0;
  --input: #e4e6f0;
  --ring: #a78bfa;
  --chart-1: #7c3aed;
  --chart-2: #a78bfa;
  --chart-3: #10b981;
  --chart-4: #f59e0b;
  --chart-5: #0ea5e9;
  --radius: 0.5rem;
  --sidebar: #0d1224;
  --sidebar-foreground: #aeb3cc;
  --sidebar-primary: #ffffff;
  --sidebar-primary-foreground: #0d1224;
  --sidebar-accent: rgba(167, 139, 250, 0.14);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgba(196, 181, 253, 0.1);
  --sidebar-ring: #a78bfa;
  --sidebar-label: #8a90ab;
  --font-sans: var(--font-ui);
  --portal-font-heading: var(--font-display);
  --portal-font-mono: var(--font-numeric);
}

.dark [data-portal="teacher"] {
  --background: #070912;
  --foreground: #eef0fa;
  --card: #0d1224;
  --card-foreground: #eef0fa;
  --popover: #0d1224;
  --popover-foreground: #eef0fa;
  --secondary: rgba(196, 181, 253, 0.07);
  --secondary-foreground: #eef0fa;
  --muted: rgba(196, 181, 253, 0.07);
  --muted-foreground: #9aa0b8;
  --accent: #c4b5fd;
  --accent-foreground: #0d1224;
  --accent-soft: rgba(167, 139, 250, 0.14);
  --destructive: #fda4af;
  --destructive-soft: rgba(251, 113, 133, 0.12);
  --success: #6ee7b7;
  --success-soft: rgba(52, 211, 153, 0.12);
  --attention: #fcd34d;
  --attention-soft: rgba(251, 191, 36, 0.12);
  --info: #7dd3fc;
  --info-soft: rgba(56, 189, 248, 0.12);
  --border: rgba(196, 181, 253, 0.12);
  --input: rgba(196, 181, 253, 0.16);
  --sidebar: #05060d;
  --sidebar-border: rgba(196, 181, 253, 0.08);
}
```

7. In `@layer base`, add:

```css
  [data-portal="teacher"] .tabular-nums, [data-portal="teacher"] .font-mono { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/teacher-tokens.test.ts`
Expected: PASS, 26 tests (2 themes × (1 + 12)). If a pair fails, the spec value is wrong. Adjust only that token, record a ledger `Ruling:`, and keep the spec's hue.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css tests/teacher-tokens.test.ts
git commit -m "feat(theme): teacher-scoped night-back tokens, a teacher: variant and AA contrast tests"
```

---

### Task 2: The teacher scope: fonts and `data-portal` on the frame and `<body>`

**Files:**
- Create: `src/lib/fonts/teacher-fonts.ts`
- Create: `src/hooks/usePortalScope.ts`
- Create: `src/lib/portal-scope.ts`
- Modify: `src/app/(dashboard)/layout.tsx` (lines 72-132)
- Test: `tests/portal-scope.test.ts`

**Interfaces:**
- Produces:
  - `portalForUser(user: { role: string } | null): 'teacher' | null`
  - `TEACHER_FONT_VARIABLES: string` (the three `next/font` variable class names, space-separated)
  - `usePortalScope(portal: 'teacher' | null, fontClasses: string): void`

- [ ] **Step 1: Write the failing test**

```ts
// tests/portal-scope.test.ts
import { describe, expect, it } from 'vitest';
import { portalForUser } from '../src/lib/portal-scope';

describe('portalForUser', () => {
  it('puts every teacher, standalone or school, in the teacher portal', () => {
    expect(portalForUser({ role: 'teacher' })).toBe('teacher');
  });

  it.each(['admin', 'school_admin', 'parent', 'student', 'super_admin', 'coach'])('leaves %s portals untouched', (role) => {
    expect(portalForUser({ role })).toBeNull();
  });

  it('has no portal before sign-in', () => {
    expect(portalForUser(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/portal-scope.test.ts`
Expected: FAIL. The module can't be resolved.

- [ ] **Step 3: Implement**

```ts
// src/lib/portal-scope.ts
export type Portal = 'teacher';

/** Which scoped visual identity a user's dashboard wears (null = the default look). */
export function portalForUser(user: { role: string } | null): Portal | null {
  return user?.role === 'teacher' ? 'teacher' : null;
}
```

```ts
// src/lib/fonts/teacher-fonts.ts
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const ui = Instrument_Sans({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
const numeric = JetBrains_Mono({ subsets: ['latin'], variable: '--font-numeric', display: 'swap' });

/** Class names that define --font-display / --font-ui / --font-numeric on an element. */
export const TEACHER_FONT_VARIABLES = `${display.variable} ${ui.variable} ${numeric.variable}`;
```

```ts
// src/hooks/usePortalScope.ts
'use client';

import { useEffect } from 'react';
import type { Portal } from '@/lib/portal-scope';

/**
 * Mirror the portal scope onto <body>. Dialogs, popovers, selects and toasts
 * portal outside the dashboard frame, so they need the tokens and fonts too.
 */
export function usePortalScope(portal: Portal | null, fontClasses: string): void {
  useEffect(() => {
    if (!portal) return;
    const body = document.body;
    const classes = fontClasses.split(' ').filter(Boolean);
    body.dataset.portal = portal;
    body.classList.add(...classes);
    return () => {
      delete body.dataset.portal;
      body.classList.remove(...classes);
    };
  }, [portal, fontClasses]);
}
```

- [ ] **Step 4: Wire it into the dashboard layout**

In `src/app/(dashboard)/layout.tsx`:
1. Import `portalForUser` from `@/lib/portal-scope`, `usePortalScope` from `@/hooks/usePortalScope`, `TEACHER_FONT_VARIABLES` from `@/lib/fonts/teacher-fonts`, and `cn` from `@/lib/utils`.
2. After the `pathname`/`router` lines, add:

```tsx
  const portal = portalForUser(user);
  const portalFonts = portal === 'teacher' ? TEACHER_FONT_VARIABLES : '';
  usePortalScope(portal, portalFonts);
```

3. Replace the frame `div`:

```tsx
      <div
        data-portal={portal ?? undefined}
        className={cn(
          'flex h-screen overflow-hidden',
          portal ? cn(portalFonts, 'bg-background font-sans text-foreground') : 'bg-muted/30',
        )}
      >
```

Keep the hooks above the early `return null` for standalone teachers, which is already the case.

- [ ] **Step 5: Run the test and typecheck**

Run: `npx vitest run tests/portal-scope.test.ts && npx tsc --noEmit -p .`
Expected: PASS (8 tests) and tsc 0.

Then load `/teacher` in the dev server. Headings and body text should visibly switch fonts. If `next/font/google` can't be used from this client-layout import chain, the dev server errors. In that case, move the three font calls into a new server component `src/app/(dashboard)/teacher-fonts-provider.tsx` that renders a hidden `<span className={TEACHER_FONT_VARIABLES} />` wrapper. Record a Ruling either way.

- [ ] **Step 6: Commit**

```bash
git add src/lib/portal-scope.ts src/lib/fonts/teacher-fonts.ts src/hooks/usePortalScope.ts "src/app/(dashboard)/layout.tsx" tests/portal-scope.test.ts
git commit -m "feat(theme): teachers' dashboard wears the night-back scope and fonts, including overlays"
```

---

### Task 3: Six-section teacher navigation

**Files:**
- Modify: `src/lib/constants.ts`:
  - the `NavItem` interface (lines 22-30)
  - `TEACHER_NAV` (lines 231-315)
  - `STANDALONE_TEACHER_NAV`
- Test: `tests/teacher-nav.test.ts`. Extend it, keeping every existing test passing.

**Interfaces:**
- Produces:
  - `NavItem.section?: NavSection`
  - `type NavSection = 'Today' | 'Teach' | 'Assess' | 'Class' | 'Talk' | 'Me'`
  - `NavItem.countKey?: 'marking' | 'messages'`
  - `export const NAV_SECTIONS: NavSection[]`

- [ ] **Step 1: Write the failing tests.** Append inside `describe('teacher navigation', …)`:

```ts
  it.each([
    ['school teachers', TEACHER_NAV],
    ['independent teachers', STANDALONE_TEACHER_NAV],
  ])('puts every item %s see into one of the six sections, in order', (_who, nav) => {
    expect(nav.every((item) => item.section && NAV_SECTIONS.includes(item.section))).toBe(true);
    expect(nav.every((item) => !item.children)).toBe(true);
    const order = nav.map((item) => NAV_SECTIONS.indexOf(item.section!));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('files the daily jobs where teachers expect them', () => {
    const sectionOf = (label: string) => TEACHER_NAV.find((i) => i.label === label)?.section;
    expect(sectionOf('Today')).toBe('Today');
    expect(sectionOf('Lessons')).toBe('Teach');
    expect(sectionOf('Marking')).toBe('Assess');
    expect(sectionOf('Gradebook')).toBe('Assess');
    expect(sectionOf('Attendance')).toBe('Class');
    expect(sectionOf('Messages')).toBe('Talk');
    expect(sectionOf('Policies')).toBe('Me');
  });

  it('shows live counts on Marking and Messages', () => {
    expect(TEACHER_NAV.find((i) => i.label === 'Marking')?.countKey).toBe('marking');
    expect(TEACHER_NAV.find((i) => i.label === 'Messages')?.countKey).toBe('messages');
  });
```

Add `NAV_SECTIONS` to the constants import. The existing tests that look up labels ('Marking', 'Attendance', 'Merits', 'Refer to counsellor', 'Substitutes', 'Policies', 'Discipline', 'Incidents', 'Pastoral Care', 'Report Comments', 'Homework', 'Assignments') must still pass, so keep those exact labels.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/teacher-nav.test.ts`
Expected: FAIL. `NAV_SECTIONS` is undefined, and items have no section.

- [ ] **Step 3: Implement.** In `src/lib/constants.ts`:

1. Add `Sunrise`, `Library` and `Settings` if they're missing. Import `Sunrise` and `Library` from lucide-react; `Settings` is already imported.
2. Add the new types:

```ts
export type NavSection = 'Today' | 'Teach' | 'Assess' | 'Class' | 'Talk' | 'Me';
export const NAV_SECTIONS: NavSection[] = ['Today', 'Teach', 'Assess', 'Class', 'Talk', 'Me'];

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module?: string;
  badge?: string;
  permission?: PermissionFlag;
  children?: NavItem[];
  /** Section label shown above this item (teacher portal). */
  section?: NavSection;
  /** Live count shown beside this item. */
  countKey?: 'marking' | 'messages';
}
```

3. Replace `TEACHER_NAV`:

```ts
export const TEACHER_NAV: NavItem[] = [
  { section: 'Today', label: 'Today', href: ROUTES.TEACHER_DASHBOARD, icon: Sunrise },

  { section: 'Teach', label: 'Courses', href: ROUTES.TEACHER_COURSES, icon: GraduationCap, module: 'courses' },
  { section: 'Teach', label: 'Lessons', href: ROUTES.TEACHER_LESSONS, icon: BookOpen, badge: 'AI' },
  { section: 'Teach', label: 'Library', href: '/teacher/curriculum/content', icon: Library },
  { section: 'Teach', label: 'Live classes', href: ROUTES.TEACHER_CLASSROOM, icon: Video },
  { section: 'Teach', label: 'Video library', href: ROUTES.TEACHER_CLASSROOM_VIDEOS, icon: PlayCircle },

  { section: 'Assess', label: 'Test Papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  { section: 'Assess', label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList, module: 'homework' },
  { section: 'Assess', label: 'Assignments', href: '/teacher/assignments', icon: ScrollText, badge: 'AI', module: 'homework' },
  { section: 'Assess', label: 'Marking', href: ROUTES.TEACHER_WORKBENCH_MARKING_HUB, icon: ClipboardCheck, badge: 'AI', module: 'teacher_workbench', countKey: 'marking' },
  { section: 'Assess', label: 'Gradebook', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  { section: 'Assess', label: 'Reports', href: ROUTES.TEACHER_REPORTS, icon: FileText },
  { section: 'Assess', label: 'Report Comments', href: ROUTES.TEACHER_AI_REPORT_COMMENTS, icon: FileText, badge: 'AI', module: 'ai_tools' },
  { section: 'Assess', label: 'Term Planner', href: ROUTES.TEACHER_WORKBENCH_PLANNER, icon: CalendarDays, module: 'teacher_workbench' },

  { section: 'Class', label: 'My Classes', href: ROUTES.TEACHER_CLASSES, icon: Users },
  { section: 'Class', label: 'Students', href: ROUTES.TEACHER_STUDENTS, icon: GraduationCap },
  { section: 'Class', label: 'Attendance', href: ROUTES.TEACHER_ATTENDANCE, icon: ClipboardList, module: 'attendance' },
  { section: 'Class', label: 'Timetable', href: ROUTES.TEACHER_TIMETABLE, icon: Clock },
  { section: 'Class', label: 'Discipline', href: ROUTES.TEACHER_DISCIPLINE, icon: Shield, module: 'attendance' },
  { section: 'Class', label: 'Merits', href: ROUTES.TEACHER_MERITS, icon: Award, module: 'attendance' },
  { section: 'Class', label: 'Incidents', href: ROUTES.TEACHER_INCIDENTS, icon: AlertTriangle, module: 'incident_wellbeing' },
  { section: 'Class', label: 'Refer to counsellor', href: ROUTES.TEACHER_REFERRAL, icon: HeartHandshake },
  { section: 'Class', label: 'Pastoral Care', href: ROUTES.TEACHER_PASTORAL, icon: Heart, permission: 'isCounselor', module: 'incident_wellbeing' },

  { section: 'Talk', label: 'Messages', href: ROUTES.TEACHER_MESSAGES, icon: MessageSquare, countKey: 'messages' },
  { section: 'Talk', label: 'Announcements', href: ROUTES.TEACHER_COMMUNICATION, icon: Megaphone, module: 'communication' },
  { section: 'Talk', label: 'Notice Board', href: ROUTES.TEACHER_NOTICE_BOARD, icon: Clipboard },
  { section: 'Talk', label: 'Meetings', href: ROUTES.TEACHER_MEETINGS, icon: CalendarCheck },
  { section: 'Talk', label: 'Conferences', href: ROUTES.TEACHER_CONFERENCES, icon: Users, module: 'conference_booking' },

  { section: 'Me', label: 'My Leave', href: ROUTES.TEACHER_LEAVE, icon: CalendarDays, module: 'staff_leave' },
  { section: 'Me', label: 'Substitutes', href: ROUTES.TEACHER_SUBSTITUTES, icon: Repeat, module: 'attendance' },
  { section: 'Me', label: 'Policies', href: ROUTES.TEACHER_POLICIES, icon: ScrollText },
  { section: 'Me', label: 'HOD Oversight', href: ROUTES.TEACHER_HOD, icon: Users, permission: 'isHOD' },
  { section: 'Me', label: 'Course Review', href: ROUTES.ADMIN_COURSES_REVIEW, icon: CheckSquare, permission: 'isHOD', module: 'courses' },
];
```

4. Replace `STANDALONE_TEACHER_NAV`:

```ts
export const STANDALONE_TEACHER_NAV: NavItem[] = [
  { section: 'Today', label: 'Today', href: ROUTES.TEACHER_DASHBOARD, icon: Sunrise },
  { section: 'Teach', label: 'Lessons', href: ROUTES.TEACHER_LESSONS, icon: BookOpen, badge: 'AI' },
  { section: 'Teach', label: 'Textbooks', href: '/teacher/curriculum/textbooks', icon: BookMarked },
  { section: 'Assess', label: 'Test Papers', href: '/teacher/papers', icon: FileText, badge: 'AI' },
  { section: 'Assess', label: 'Homework', href: ROUTES.TEACHER_HOMEWORK, icon: ClipboardList, module: 'homework' },
  { section: 'Assess', label: 'Assignments', href: '/teacher/assignments', icon: ScrollText, badge: 'AI', module: 'homework' },
  { section: 'Assess', label: 'Marking', href: ROUTES.TEACHER_WORKBENCH_MARKING_HUB, icon: ClipboardCheck, badge: 'AI', module: 'teacher_workbench', countKey: 'marking' },
  { section: 'Assess', label: 'Gradebook', href: ROUTES.TEACHER_GRADES, icon: BarChart3 },
  { section: 'Class', label: 'Teaching Groups', href: ROUTES.TEACHER_CLASSES, icon: Users },
  { section: 'Me', label: 'Billing', href: '/my/billing', icon: CreditCard },
  { section: 'Me', label: 'Settings', href: '/teacher/settings', icon: Settings },
];
```

5. Remove imports that are no longer used (for example `Home`) only if nothing else in the file uses them.

- [ ] **Step 4: Run the tests.** Run `npx vitest run tests/teacher-nav.test.ts tests/nav-visibility.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts tests/teacher-nav.test.ts
git commit -m "feat(nav): six-section teacher navigation (Today, Teach, Assess, Class, Talk, Me)"
```

---

### Task 4: The midnight Sidebar: section labels, AI marker, me card

**Files:**
- Create: `src/lib/nav-sections.ts`
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `tests/nav-sections.test.ts`

**Interfaces:**
- Consumes: `NavItem.section` (Task 3) and `visibleNavItems` (phase 0A).
- Produces: `groupNavBySection(items: NavItem[]): Array<{ section: NavSection | null; items: NavItem[] }>`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nav-sections.test.ts
import { describe, expect, it } from 'vitest';
import { Home, BookOpen, Users } from 'lucide-react';
import type { NavItem } from '../src/lib/constants';
import { groupNavBySection } from '../src/lib/nav-sections';

describe('groupNavBySection', () => {
  it('groups consecutive items under their section', () => {
    const nav: NavItem[] = [
      { section: 'Today', label: 'Today', href: '/teacher', icon: Home },
      { section: 'Teach', label: 'Lessons', href: '/teacher/lessons', icon: BookOpen },
      { section: 'Teach', label: 'Library', href: '/teacher/curriculum/content', icon: BookOpen },
      { section: 'Class', label: 'My Classes', href: '/teacher/classes', icon: Users },
    ];
    expect(groupNavBySection(nav).map((g) => [g.section, g.items.length])).toEqual([['Today', 1], ['Teach', 2], ['Class', 1]]);
  });

  it('leaves a nav without sections as one unlabelled group (other portals)', () => {
    const nav: NavItem[] = [{ label: 'Dashboard', href: '/admin', icon: Home }, { label: 'Staff', href: '/admin/staff', icon: Users }];
    expect(groupNavBySection(nav)).toEqual([{ section: null, items: nav }]);
  });

  it('never produces an empty section', () => {
    expect(groupNavBySection([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails.** Run `npx vitest run tests/nav-sections.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/nav-sections.ts
import type { NavItem, NavSection } from '@/lib/constants';

export interface NavGroup {
  section: NavSection | null;
  items: NavItem[];
}

/** Consecutive items with the same section become one group; a nav without sections is one unlabelled group. */
export function groupNavBySection(items: NavItem[]): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const item of items) {
    const section = item.section ?? null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}
```

- [ ] **Step 4: Run it to verify it passes.** Expected: PASS, 3 tests.

- [ ] **Step 5: Restyle the Sidebar** (`src/components/layout/Sidebar.tsx`). Everything visual that changes is behind `teacher:`.

1. **Imports.** Import `groupNavBySection` from `@/lib/nav-sections`, `Sparkles` from lucide, `useSchoolStore`, and `getInitials` from `@/lib/utils`.

2. **Aside classes.** Keep the existing classes, and append: `teacher:bg-sidebar teacher:text-sidebar-foreground teacher:border-sidebar-border`.

3. **Logo.** Wrap the `GraduationCap` in `<span className="teacher:grid teacher:h-7 teacher:w-7 teacher:place-items-center teacher:rounded-md teacher:bg-primary">`. Give the icon `teacher:h-4 teacher:w-4 teacher:text-white`, and the name `teacher:font-heading teacher:text-sidebar-primary`. Add `teacher:border-sidebar-border` to the logo row border.

4. **Nav loop.** Replace the flat `filteredItems.map` with a loop over `groupNavBySection(filteredItems)`. Render one block per group:

```tsx
            <div key={group.section ?? 'all'} className="space-y-1">
              {group.section && !sidebarCollapsed && (
                <p className="px-3 pb-1 pt-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-sidebar-label">
                  {group.section === 'Today' ? '' : group.section}
                </p>
              )}
              {group.items.map((item) => /* the existing item render, unchanged except the classes below */)}
            </div>
```

   Omit the label element entirely for `Today`; use `group.section && group.section !== 'Today' && …`.

5. **Item link classes.** Add teacher variants:
   - active: `teacher:bg-sidebar-accent teacher:text-sidebar-primary teacher:relative teacher:before:absolute teacher:before:-left-3 teacher:before:top-2 teacher:before:bottom-2 teacher:before:w-[3px] teacher:before:rounded-r teacher:before:bg-sidebar-ring`
   - inactive: `teacher:text-sidebar-foreground teacher:hover:bg-sidebar-accent teacher:hover:text-sidebar-primary`

6. **Badge.** When `item.badge === 'AI'`, render the pill for other portals and a violet sparkle for teachers:

```tsx
                        <>
                          <span className="ml-auto rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground teacher:hidden">
                            {item.badge}
                          </span>
                          <Sparkles aria-label="AI" className="ml-auto hidden h-3.5 w-3.5 text-sidebar-ring teacher:block" />
                        </>
```

7. **Me card.** After `</nav>`, add a card that shows only for teachers:

```tsx
        {!sidebarCollapsed && user && (
          <div className="hidden items-center gap-2.5 border-t border-sidebar-border px-4 py-3 teacher:flex">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#c4b5fd] text-xs font-semibold text-[#2e1065]">
              {getInitials(user.firstName, user.lastName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-sidebar-primary">{user.firstName} {user.lastName}</span>
              <span className="block truncate text-xs text-sidebar-label">{schoolName}</span>
            </span>
          </div>
        )}
```

   with `const user = useAuthStore((s) => s.user);` and `const schoolName = useSchoolStore((s) => s.school?.name ?? '');`. The two avatar hex colours are the spec's avatar pair (look-design mockup). Record a ledger Ruling if the colour guard (Task 9) flags them; Sidebar is not on the guard list.

8. **Size.** Keep the file ≤ 350 lines. If it grows past that, extract the item render into `src/components/layout/SidebarNavItem.tsx`, with props `{ item, active, expanded, collapsed, onNavigate, onToggle, pathname }`.

- [ ] **Step 6: Check.** Run `npx tsc --noEmit -p .` and `npx eslint src/lib/nav-sections.ts src/components/layout/Sidebar.tsx tests/nav-sections.test.ts`, then check `wc -l`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/nav-sections.ts src/components/layout tests/nav-sections.test.ts
git commit -m "feat(nav): midnight teacher sidebar with section labels, AI marker and a me card"
```

---

### Task 5: Live counts on Marking and Messages

**Files:**
- Create: `src/lib/nav-counts.ts`
- Create: `src/hooks/useTeacherNavCounts.ts`
- Modify: `src/components/layout/Sidebar.tsx` (render the count)
- Test: `tests/nav-counts.test.ts`

**Interfaces:**
- Consumes: `NavItem.countKey` (Task 3).
- Produces:
  - `type NavCounts = { marking: number | null; messages: number | null }`
  - `navBadgeText(countKey: NavItem['countKey'], counts: NavCounts): string | null`
  - `useTeacherNavCounts(enabled: boolean): NavCounts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/nav-counts.test.ts
import { describe, expect, it } from 'vitest';
import { navBadgeText } from '../src/lib/nav-counts';

describe('navBadgeText', () => {
  const counts = { marking: 14, messages: 0 };

  it('shows a count only when there is something waiting', () => {
    expect(navBadgeText('marking', counts)).toBe('14');
    expect(navBadgeText('messages', counts)).toBeNull();
  });

  it('shows nothing when a count failed to load or does not apply', () => {
    expect(navBadgeText('marking', { marking: null, messages: null })).toBeNull();
    expect(navBadgeText(undefined, counts)).toBeNull();
  });

  it('caps big numbers so the badge stays small', () => {
    expect(navBadgeText('marking', { marking: 240, messages: 0 })).toBe('99+');
  });
});
```

- [ ] **Step 2: Run it to verify it fails.** Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/lib/nav-counts.ts
import type { NavItem } from '@/lib/constants';

export interface NavCounts {
  marking: number | null;
  messages: number | null;
}

export function navBadgeText(countKey: NavItem['countKey'], counts: NavCounts): string | null {
  if (!countKey) return null;
  const n = counts[countKey];
  if (n === null || n <= 0) return null;
  return n > 99 ? '99+' : String(n);
}
```

```ts
// src/hooks/useTeacherNavCounts.ts
'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import type { NavCounts } from '@/lib/nav-counts';
import type { MarkingItem } from '@/types';

const REFRESH_MS = 5 * 60 * 1000;

/** Marking and unread-message counts for the teacher nav. Failures just hide the badge. */
export function useTeacherNavCounts(enabled: boolean): NavCounts {
  const [counts, setCounts] = useState<NavCounts>({ marking: null, messages: null });
  const isStandalone = useAuthStore((s) => s.user?.isStandaloneTeacher === true);
  const workbenchOn = useSchoolStore((s) => s.school?.modulesEnabled.includes('teacher_workbench') ?? false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      const [marking, messages] = await Promise.allSettled([
        workbenchOn ? apiClient.get('/teacher-workbench/marking-hub/pending') : Promise.reject(new Error('off')),
        isStandalone ? Promise.reject(new Error('no messaging')) : apiClient.get('/messaging/unread-count'),
      ]);
      if (cancelled) return;
      setCounts({
        marking: marking.status === 'fulfilled'
          ? unwrapList<MarkingItem>(marking.value).reduce((sum: number, item: MarkingItem) => sum + item.pendingCount, 0)
          : null,
        messages: messages.status === 'fulfilled'
          ? unwrapResponse<{ totalUnread?: number }>(messages.value).totalUnread ?? 0
          : null,
      });
    };
    void load();
    const id = window.setInterval(() => { void load(); }, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [enabled, workbenchOn, isStandalone]);

  return counts;
}
```

- [ ] **Step 4: Render the badge in the Sidebar.**
  1. Call `const counts = useTeacherNavCounts(user?.role === 'teacher');`.
  2. In the item render, after the AI marker, add:

```tsx
                      {navBadgeText(item.countKey, counts) && (
                        <span className="ml-2 rounded-full bg-sidebar-accent px-2 py-px font-mono text-[11px] text-sidebar-primary">
                          {navBadgeText(item.countKey, counts)}
                        </span>
                      )}
```

- [ ] **Step 5: Test, check and commit.** Run `npx vitest run tests/nav-counts.test.ts && npx tsc --noEmit -p .`. Expected: PASS and 0. Then:

```bash
git add src/lib/nav-counts.ts src/hooks/useTeacherNavCounts.ts src/components/layout/Sidebar.tsx tests/nav-counts.test.ts
git commit -m "feat(nav): live marking and unread-message counts in the teacher sidebar"
```

---

### Task 6: A top bar that says where you are

**Files:**
- Create: `src/lib/nav-context.ts`
- Modify: `src/components/layout/TopBar.tsx`
- Test: `tests/nav-context.test.ts`

**Interfaces:**
- Produces `navContextFor(pathname: string, items: NavItem[]): { section: NavSection | null; label: string } | null`.
- TopBar gains a prop `items?: NavItem[]`, passed from the dashboard layout.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nav-context.test.ts
import { describe, expect, it } from 'vitest';
import { TEACHER_NAV } from '../src/lib/constants';
import { navContextFor } from '../src/lib/nav-context';

describe('navContextFor', () => {
  it('names the section and page', () => {
    expect(navContextFor('/teacher/grades', TEACHER_NAV)).toEqual({ section: 'Assess', label: 'Gradebook' });
  });

  it('uses the closest nav ancestor for pages below it', () => {
    expect(navContextFor('/teacher/lessons/abc123', TEACHER_NAV)).toEqual({ section: 'Teach', label: 'Lessons' });
  });

  it('prefers the most specific match', () => {
    expect(navContextFor('/teacher/classroom/videos', TEACHER_NAV)).toEqual({ section: 'Teach', label: 'Video library' });
  });

  it('matches Today only on the Today page itself', () => {
    expect(navContextFor('/teacher', TEACHER_NAV)).toEqual({ section: 'Today', label: 'Today' });
    expect(navContextFor('/teacher/settings', TEACHER_NAV)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails.** Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
// src/lib/nav-context.ts
import type { NavItem, NavSection } from '@/lib/constants';

/** The nav entry a page belongs to: exact match, else the longest href that prefixes it (Today only matches itself). */
export function navContextFor(pathname: string, items: NavItem[]): { section: NavSection | null; label: string } | null {
  const flat = items.flatMap((item: NavItem) => (item.children?.length ? item.children.map((c) => ({ ...c, section: item.section })) : [item]));
  let best: NavItem | null = null;
  for (const item of flat) {
    const exact = pathname === item.href;
    const prefix = item.href !== '/teacher' && pathname.startsWith(`${item.href}/`);
    if ((exact || prefix) && (!best || item.href.length > best.href.length)) best = item;
  }
  return best ? { section: best.section ?? null, label: best.label } : null;
}
```

- [ ] **Step 4: Use it in the TopBar**
  1. Add an `items?: NavItem[]` prop and `const pathname = usePathname() ?? ''`, then compute `const context = items ? navContextFor(pathname, items) : null;`.
  2. Replace the role label `<h2>` content with:

```tsx
          <h2 className="text-sm font-medium text-muted-foreground">
            {context ? (
              <span className="teacher:font-mono teacher:text-[11px] teacher:uppercase teacher:tracking-[0.1em]">
                {context.section && context.section !== context.label ? `${context.section} · ` : ''}{context.label}
              </span>
            ) : user ? getRoleLabel(user.role) : 'Dashboard'}
          </h2>
```

  3. Add the teacher variant `teacher:bg-card` to the header; it's already `bg-card`, so keep it.
  4. In the dashboard layout, pass `items` **only for teachers**: `<TopBar items={portal ? navItems : undefined} />`. Other portals keep the role label, unchanged.

- [ ] **Step 5: Test, check, commit.** Run `npx vitest run tests/nav-context.test.ts && npx tsc --noEmit -p .`. Then:

```bash
git add src/lib/nav-context.ts src/components/layout/TopBar.tsx "src/app/(dashboard)/layout.tsx" tests/nav-context.test.ts
git commit -m "feat(nav): the teacher top bar names the section and page"
```

---

### Task 7: Phone navigation by section

**Files:**
- Modify: `src/lib/nav-visibility.ts`: add `phoneSectionLayout`.
- Modify: `src/components/layout/BottomNav.tsx`
- Test: `tests/nav-visibility.test.ts` (extend it)

**Interfaces:**
- Consumes: `NavItem.section`, `NAV_SECTIONS`.
- Produces `phoneSectionLayout(items: NavItem[]): Array<{ key: string; label: string; icon: LucideIcon; href?: string; items: NavItem[] }> | null`. It returns null for a nav without sections, which then uses `phoneNavLayout`.

- [ ] **Step 1: Write the failing test.** Append to `tests/nav-visibility.test.ts`:

```ts
import { TEACHER_NAV } from '../src/lib/constants';
import { phoneSectionLayout } from '../src/lib/nav-visibility';

describe('phoneSectionLayout', () => {
  it('gives teachers Today, Teach, Assess, Class and More tabs', () => {
    const tabs = phoneSectionLayout(TEACHER_NAV);
    expect(tabs?.map((t) => t.label)).toEqual(['Today', 'Teach', 'Assess', 'Class', 'More']);
  });

  it('links Today directly and opens the others as sheets', () => {
    const tabs = phoneSectionLayout(TEACHER_NAV)!;
    expect(tabs[0].href).toBe('/teacher');
    expect(tabs[1].href).toBeUndefined();
    expect(tabs[2].items.map((i) => i.label)).toContain('Marking');
  });

  it('puts Talk and Me under More', () => {
    const more = phoneSectionLayout(TEACHER_NAV)!.at(-1)!;
    expect(more.items.map((i) => i.label)).toEqual(expect.arrayContaining(['Messages', 'Policies']));
  });

  it('drops a section with nothing visible', () => {
    const tabs = phoneSectionLayout(TEACHER_NAV.filter((i) => i.section !== 'Class'))!;
    expect(tabs.map((t) => t.label)).toEqual(['Today', 'Teach', 'Assess', 'More']);
  });

  it('leaves navs without sections to the old layout', () => {
    expect(phoneSectionLayout(nav)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails.** Expected: FAIL (`phoneSectionLayout` not exported).

- [ ] **Step 3: Implement.** Add to `src/lib/nav-visibility.ts`:

```ts
import { MoreHorizontal, Sunrise, BookOpen, ClipboardCheck, Users, type LucideIcon } from 'lucide-react';
import { NAV_SECTIONS, type NavSection } from '@/lib/constants';

export interface PhoneTab {
  key: string;
  label: string;
  icon: LucideIcon;
  /** A direct link (Today); otherwise the tab opens a sheet of `items`. */
  href?: string;
  items: NavItem[];
}

const TAB_ICONS: Partial<Record<NavSection, LucideIcon>> = { Today: Sunrise, Teach: BookOpen, Assess: ClipboardCheck, Class: Users };
const TAB_SECTIONS: NavSection[] = ['Today', 'Teach', 'Assess', 'Class'];

export function phoneSectionLayout(items: NavItem[]): PhoneTab[] | null {
  if (!items.some((item: NavItem) => item.section)) return null;
  const inSection = (s: NavSection) => items.filter((item: NavItem) => item.section === s);
  const tabs: PhoneTab[] = [];
  for (const section of TAB_SECTIONS) {
    const sectionItems = inSection(section);
    if (sectionItems.length === 0) continue;
    const direct = section === 'Today' && sectionItems.length === 1 ? sectionItems[0].href : undefined;
    tabs.push({ key: section, label: section, icon: TAB_ICONS[section] ?? MoreHorizontal, href: direct, items: sectionItems });
  }
  const rest = NAV_SECTIONS.filter((s: NavSection) => !TAB_SECTIONS.includes(s)).flatMap(inSection);
  if (rest.length > 0) tabs.push({ key: 'More', label: 'More', icon: MoreHorizontal, items: rest });
  return tabs;
}
```

- [ ] **Step 4: Use it in the BottomNav.** Keep the phase 0A path for navs without sections. When `phoneSectionLayout(visible)` returns tabs:

```tsx
  const visible = visibleNavItems(items, { isModuleEnabled, hasPermission });
  const tabs = phoneSectionLayout(visible);
  const [openTab, setOpenTab] = useState<string | null>(null);
  // … if (tabs) render:
  <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
    <div className="flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.items.some((i) => isActivePath(pathname, i.href));
        const className = cn('flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs',
          active ? 'text-primary' : 'text-muted-foreground');
        return tab.href ? (
          <Link key={tab.key} href={tab.href} className={className}><Icon className="h-5 w-5" /><span>{tab.label}</span></Link>
        ) : (
          <button key={tab.key} type="button" className={className} onClick={() => setOpenTab(tab.key)}>
            <Icon className="h-5 w-5" /><span>{tab.label}</span>
          </button>
        );
      })}
    </div>
    <Sheet open={openTab !== null} onOpenChange={(o) => { if (!o) setOpenTab(null); }}>
      <SheetContent side="bottom" showCloseButton={false}>
        <SheetTitle className="px-4 pt-4 font-heading text-base">{openTab}</SheetTitle>
        <div className="grid max-h-[70vh] grid-cols-3 gap-3 overflow-y-auto p-4 pb-6 sm:grid-cols-4">
          {(tabs.find((t) => t.key === openTab)?.items ?? []).map((item) => {/* the same sheet link as phase 0A */})}
        </div>
      </SheetContent>
    </Sheet>
  </nav>
```

Keep the component ≤ 350 lines. If needed, extract `src/components/layout/BottomNavSheetLink.tsx` for the repeated sheet link.

- [ ] **Step 5: Test, check, commit.** Run `npx vitest run tests/nav-visibility.test.ts && npx tsc --noEmit -p .`. Then:

```bash
git add src/lib/nav-visibility.ts src/components/layout tests/nav-visibility.test.ts
git commit -m "feat(nav): phone tabs by section for teachers, each opening its own sheet"
```

---

### Task 8: Shared components: PageHeader eyebrow, EmptyState, StatCard tone, StatusChip

**Files:**
- Modify: `src/components/shared/PageHeader.tsx`
- Modify: `src/components/shared/EmptyState.tsx`
- Modify: `src/components/shared/StatCard.tsx`
- Create: `src/lib/status-chip.ts`
- Create: `src/components/shared/StatusChip.tsx`
- Modify: `src/components/shared/index.ts` (export StatusChip)
- Test: `tests/status-chip.test.ts`

**Interfaces:**
- Produces:
  - `PageHeader({ title, description?, eyebrow?, children? })`
  - `StatCard({ …, icon?: LucideIcon, tone?: 'default' | 'attention' | 'success' })`
  - `type ChipStatus = 'present' | 'absent' | 'late' | 'excused' | 'done' | 'marked' | 'pending' | 'overdue' | 'due' | 'draft' | 'published' | 'ai'`
  - `chipFor(status: ChipStatus): { tone: ChipTone; label: string }`
  - `StatusChip({ status, label?, className? })`

- [ ] **Step 1: Write the failing test**

```ts
// tests/status-chip.test.ts
import { describe, expect, it } from 'vitest';
import { chipFor } from '../src/lib/status-chip';

describe('chipFor', () => {
  it.each([
    ['present', 'success', 'Present'], ['marked', 'success', 'Marked'], ['published', 'success', 'Published'], ['done', 'success', 'Done'],
    ['late', 'attention', 'Late'], ['overdue', 'attention', 'Overdue'], ['due', 'attention', 'Due'], ['pending', 'attention', 'To mark'],
    ['absent', 'destructive', 'Absent'],
    ['excused', 'info', 'Excused'],
    ['draft', 'quiet', 'Draft'],
    ['ai', 'accent', 'AI draft'],
  ] as const)('%s means %s ("%s")', (status, tone, label) => {
    expect(chipFor(status)).toEqual({ tone, label });
  });
});
```

- [ ] **Step 2: Run it to verify it fails.** Expected: FAIL (module missing).

- [ ] **Step 3: Implement the mapping and the chip**

```ts
// src/lib/status-chip.ts
export type ChipTone = 'success' | 'attention' | 'destructive' | 'info' | 'quiet' | 'accent';
export type ChipStatus =
  | 'present' | 'absent' | 'late' | 'excused' | 'done' | 'marked'
  | 'pending' | 'overdue' | 'due' | 'draft' | 'published' | 'ai';

/** One meaning per colour (look-design §5.2). */
const CHIPS: Record<ChipStatus, { tone: ChipTone; label: string }> = {
  present: { tone: 'success', label: 'Present' },
  done: { tone: 'success', label: 'Done' },
  marked: { tone: 'success', label: 'Marked' },
  published: { tone: 'success', label: 'Published' },
  late: { tone: 'attention', label: 'Late' },
  due: { tone: 'attention', label: 'Due' },
  overdue: { tone: 'attention', label: 'Overdue' },
  pending: { tone: 'attention', label: 'To mark' },
  absent: { tone: 'destructive', label: 'Absent' },
  excused: { tone: 'info', label: 'Excused' },
  draft: { tone: 'quiet', label: 'Draft' },
  ai: { tone: 'accent', label: 'AI draft' },
};

export function chipFor(status: ChipStatus): { tone: ChipTone; label: string } {
  return CHIPS[status];
}
```

```tsx
// src/components/shared/StatusChip.tsx
'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chipFor, type ChipStatus, type ChipTone } from '@/lib/status-chip';

const TONE: Record<ChipTone, { chip: string; dot: string }> = {
  success: { chip: 'bg-success-soft text-success', dot: 'bg-success' },
  attention: { chip: 'bg-attention-soft text-attention', dot: 'bg-attention' },
  destructive: { chip: 'bg-destructive-soft text-destructive', dot: 'bg-destructive' },
  info: { chip: 'bg-info-soft text-info', dot: 'bg-info' },
  quiet: { chip: 'border border-border text-muted-foreground', dot: 'bg-border' },
  accent: { chip: 'bg-accent-soft text-accent', dot: '' },
};

interface StatusChipProps {
  status: ChipStatus;
  label?: string;
  className?: string;
}

export function StatusChip({ status, label, className }: StatusChipProps) {
  const { tone, label: fallback } = chipFor(status);
  const style = TONE[tone];
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium', style.chip, className)}>
      {tone === 'accent' ? <Sparkles className="h-3 w-3" aria-hidden /> : <i className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden />}
      {label ?? fallback}
    </span>
  );
}
```

- [ ] **Step 4: Restyle PageHeader, EmptyState and StatCard.** Changes are additive; other portals only change where a teacher variant says so.

```tsx
// src/components/shared/PageHeader.tsx
'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Short mono context line above the title (teacher portal), e.g. "GRADE 1 A · ENGLISH". */
  eyebrow?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight font-heading teacher:mt-1 teacher:text-[32px] teacher:font-semibold teacher:leading-[1.05] teacher:tracking-[-0.025em]">
          {title}
        </h1>
        {description && <p className="text-muted-foreground teacher:mt-1">{description}</p>}
      </div>
      {children && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div>}
    </div>
  );
}
```

Changing `sm:items-center` to `sm:items-end`, and the actions wrapper to `flex-col` on phones, is a small visual change for every portal. **Ruling to record:**
- It stacks header actions on phones, which fixes crowding everywhere.
- It aligns actions to the title baseline area.

If Task 11's screenshots show another portal regressing, revert to `sm:items-center` and keep `teacher:sm:items-end`.

EmptyState: keep its structure. Add teacher variants to the icon tile, `teacher:bg-accent-soft teacher:rounded-xl`, and to the icon, `teacher:text-accent`. Add to the title `font-heading teacher:text-xl teacher:font-semibold`.

StatCard:
1. Make `icon` optional.
2. Add `tone?: 'default' | 'attention' | 'success'`.
3. Change the value to `font-mono tabular-nums teacher:font-medium`, and the trend colour `text-emerald-600` to `text-success`.
4. For the attention tone, use `teacher:border-attention/40 teacher:bg-attention-soft/40` on the Card and `text-attention` on the value. For the success tone, `text-success` on the value.
5. Render the icon tile only when `icon` is set.

- [ ] **Step 5: Test, check, commit.** Run `npx vitest run && npx tsc --noEmit -p .`. Then:

```bash
git add src/lib/status-chip.ts src/components/shared tests/status-chip.test.ts
git commit -m "feat(ui): StatusChip, PageHeader eyebrows and teacher-styled empty states and stat cards"
```

---

### Task 9: Raw-colour guard for migrated teacher files

**Files:**
- Create: `tests/teacher-colour-guard.test.ts`

- [ ] **Step 1: Write the guard.** It must pass now for files already migrated, and fail if a raw palette class is added to any of them.

```ts
// tests/teacher-colour-guard.test.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Teacher-facing files already on semantic tokens. Add a file here when its page is migrated (plan 1B). */
export const MIGRATED = [
  'src/components/shared/StatusChip.tsx',
  'src/components/shared/StatCard.tsx',
  'src/components/shared/PageHeader.tsx',
  'src/components/shared/EmptyState.tsx',
  'src/components/shared/ModuleOffState.tsx',
  'src/components/students/LearnerQuickStats.tsx',
  'src/app/(dashboard)/teacher/students/[id]/page.tsx',
  'src/app/(dashboard)/teacher/policies/[id]/page.tsx',
  'src/components/hod/RequestChangesDialog.tsx',
];

const RAW = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|decoration)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g;

describe('teacher colour guard', () => {
  it.each(MIGRATED)('%s uses only semantic colour tokens', (file) => {
    const source = readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    expect(source.match(RAW) ?? []).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it.** Run `npx vitest run tests/teacher-colour-guard.test.ts`.
  - Expected: PASS.
  - If a listed file fails, it still has a raw class. Replace it with a token (for example `text-emerald-600` → `text-success`) and rerun. That's the RED→GREEN for this task.
  - Then prove the guard bites: temporarily add `text-red-500` to `StatusChip.tsx`, see it FAIL, and remove it.

- [ ] **Step 3: Commit**

```bash
git add tests/teacher-colour-guard.test.ts src/components src/app
git commit -m "test(theme): guard migrated teacher files against raw palette colours"
```

---

### Task 10: Loading and scope polish

**Files:**
- Modify: `src/components/shared/LoadingSpinner.tsx`: the spinner colour uses `text-primary`, so it's violet for teachers. Check only.
- Modify: `src/components/ui/sonner.tsx`: only if toasts don't pick up tokens. Check in the browser first.

- [ ] **Step 1:** In the dev server, open a dialog (e.g. "Create Class" on `/teacher/classes`), a select (Gradebook class picker) and a toast (Attendance "Save"). Screenshot each in light and dark.
- [ ] **Step 2:** If any overlay renders with the old grey tokens, the `<body>` mirror (Task 2) isn't applying. Check `document.body.dataset.portal` in the browser devtools (javascript_tool) and fix the hook, adding a regression test in `tests/portal-scope.test.ts` if logic changed.
- [ ] **Step 3:** Commit any fix with `fix(theme): …`.

---

### Task 11: Verify, review, ship

- [ ] **Step 1:** `npx vitest run`, `npx next typegen && npx tsc --noEmit -p .`, and `npx eslint` on every changed file. All must be clean, except pre-existing warnings in untouched code.
- [ ] **Step 2: Screenshot tour** of the 15 core pages as Thandi and Lindiwe, at 1440 and 390, light and dark. Emulate dark with the Playwright `colorScheme: 'dark'` context option; next-themes follows the system. Look at every screenshot and check each of these:
  - the midnight sidebar
  - the section labels
  - violet primary buttons
  - fonts applied
  - no unreadable text in dark
- [ ] **Step 3: Other portals are unchanged.**
  1. Screenshot `/admin` (as admin@greenfieldprimary.co.za), `/parent` and `/student` (as naledi.mthembu@student.gfp.co.za) on this branch, and on `master` via `git stash`-free worktree checkout or by comparing with the phase-0 tour images.
  2. Compare them visually. Differences are allowed only in PageHeader action stacking on phones (Task 8 ruling).
- [ ] **Step 4:** Whole-branch review by a fresh code-reviewer (most capable model) against this plan, the look-design spec and the Review Focus above. Do one fix pass for Critical and Important findings, each fix RED→GREEN.
- [ ] **Step 5:** Push with the compromise protocol, open a PR, wait for Vercel, and fast-forward merge. Update tracker tasks `l3b`, `l6`, `l6b`, and log it.
