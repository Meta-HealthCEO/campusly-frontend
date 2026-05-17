# Teacher Home Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the teacher home page from "functional MVP" to "premium daily-driver dashboard" via typography, surface, spacing, and a single first-load motion moment — without touching content, hooks, or data flow. Implements [`docs/superpowers/specs/2026-05-17-teacher-home-visual-polish-design.md`](docs/superpowers/specs/2026-05-17-teacher-home-visual-polish-design.md).

**Architecture:**
- Presentation-only changes across 6 existing files. No new files, no deleted files, no hook changes, no backend changes.
- Verification: `tsc --noEmit`, `eslint`, and manual QA (this codebase has no React component test infrastructure — Vitest is configured for node-env logic tests under `tests/`, not co-located component tests).
- Tailwind 4 canonical class names throughout (`bg-linear-to-b`, `bg-size-[...]`, `min-h-35`).

**Tech Stack:** Next.js 16 (React 19), Tailwind 4 + tailwindcss-animate, base-ui, Lucide icons.

---

## File Structure

All six files already exist. Each task modifies one of them.

| File | Purpose | Task |
|---|---|---|
| [`src/app/(dashboard)/teacher/page.tsx`](src/app/(dashboard)/teacher/page.tsx) | Page composition — root wrapper, greeting, animation classes per child | Tasks 1 + 6 |
| [`src/components/teacher-home/AIQuickMakeHero.tsx`](src/components/teacher-home/AIQuickMakeHero.tsx) | Three AI tiles | Task 2 |
| [`src/components/teacher-home/GettingStartedCard.tsx`](src/components/teacher-home/GettingStartedCard.tsx) | 4-step checklist | Task 3 |
| [`src/components/teacher-home/TodayZone.tsx`](src/components/teacher-home/TodayZone.tsx) | Today zone (homework + lessons due today) | Task 4 |
| [`src/components/teacher-home/GradingZone.tsx`](src/components/teacher-home/GradingZone.tsx) | Grading queue zone | Task 4 |
| [`src/components/teacher-home/DraftsZone.tsx`](src/components/teacher-home/DraftsZone.tsx) | Lesson drafts zone | Task 4 |

Task 4 bundles the three zones together — their visual updates are near-identical and shipping them in one commit avoids three duplicate review passes.

---

## Task 1: Page foundation — background fade, greeting, spacing

**File:** [`src/app/(dashboard)/teacher/page.tsx`](src/app/(dashboard)/teacher/page.tsx) (full replacement of the JSX root)

This task replaces `PageHeader` with an inline `<header>`, adds a time-aware salutation, applies the top-edge gradient fade, and bumps `space-y-6` to `space-y-8`. The first-load motion classes are NOT added here — they come in Task 6.

- [ ] **Step 1.1: Replace the page body with the new JSX**

Open `src/app/(dashboard)/teacher/page.tsx`. The current file (lines 1–68) starts with imports and a single component. Make these changes:

1. **Remove the `PageHeader` import** (line 3). Replace it with nothing — no new import needed.
2. **Add a `salutation` helper above the `firstName` block** (after line 21, inside the function, before `const firstName = …`).
3. **Replace lines 41–67 (the `return` JSX)** with the new JSX.

Final file should read exactly:

```tsx
'use client';

import { DashboardSkeleton } from '@/components/shared/skeletons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useTeachingScope } from '@/hooks/useTeachingScope';
import { AIQuickMakeHero } from '@/components/teacher-home/AIQuickMakeHero';
import { GettingStartedCard } from '@/components/teacher-home/GettingStartedCard';
import { TodayZone } from '@/components/teacher-home/TodayZone';
import { GradingZone } from '@/components/teacher-home/GradingZone';
import { DraftsZone } from '@/components/teacher-home/DraftsZone';

function salutationForHour(hour: number): string {
  if (hour < 12) return 'Good morning, ';
  if (hour < 17) return 'Good afternoon, ';
  return 'Good evening, ';
}

export default function TeacherHomePage() {
  const user = useAuthStore((s) => s.user);
  const school = useSchoolStore((s) => s.school);
  const dashboard = useTeacherDashboard();
  const { status: onboarding, loading: onboardingLoading } = useOnboardingStatus();
  const { isEmpty: scopeEmpty, loading: scopeLoading } = useTeachingScope();

  const firstName = user?.firstName ?? 'Teacher';
  const now = new Date();
  const salutation = salutationForHour(now.getHours());
  const dateLabel = now.toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const scopeSet = !scopeLoading && !scopeEmpty;
  const checklistReady = !onboardingLoading && !scopeLoading;
  const isStandaloneTeacher = user?.isStandaloneTeacher === true;
  const showChecklist =
    isStandaloneTeacher &&
    checklistReady &&
    !(scopeSet && onboarding.hasClass && onboarding.hasFirstContent && onboarding.hasStudent);

  const anyZoneHasContent =
    dashboard.todayTotal > 0 || dashboard.gradingTotal > 0 || dashboard.draftsTotal > 0;

  return (
    <div className="space-y-8 bg-background bg-linear-to-b from-muted/40 to-background bg-no-repeat bg-size-[100%_200px] dark:from-background">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          {salutation}{firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
      </header>

      <AIQuickMakeHero />

      {showChecklist ? (
        <GettingStartedCard
          scopeSet={scopeSet}
          hasClass={onboarding.hasClass}
          hasFirstContent={onboarding.hasFirstContent}
          hasStudent={onboarding.hasStudent}
          classCode={school?.joinCode ?? null}
        />
      ) : null}

      {dashboard.loading ? (
        <DashboardSkeleton />
      ) : anyZoneHasContent ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <TodayZone items={dashboard.today} total={dashboard.todayTotal} />
          <GradingZone items={dashboard.grading} total={dashboard.gradingTotal} />
          <DraftsZone items={dashboard.drafts} total={dashboard.draftsTotal} />
        </div>
      ) : null}
    </div>
  );
}
```

Changes summary:
- `PageHeader` import removed; `<PageHeader … />` replaced with inline `<header>` block carrying `text-3xl font-semibold tracking-tight` headline + muted date line.
- New `salutationForHour` helper above the component.
- New `salutation` const derived from `now.getHours()`.
- Root wrapper: `space-y-6` → `space-y-8`, with the gradient-fade classes (`bg-background bg-linear-to-b from-muted/40 to-background bg-no-repeat bg-size-[100%_200px] dark:from-background`).
- Zone grid: `gap-4` → `gap-6`, and `grid-cols-1 lg:grid-cols-3` → `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (tablets get two columns).

- [ ] **Step 1.2: Verify with tsc**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

Expected: exit 0, no new errors.

- [ ] **Step 1.3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add "src/app/(dashboard)/teacher/page.tsx"
git commit -m "feat(teacher-home): page foundation (greeting, background fade, spacing)"
```

---

## Task 2: AI Quick-Make hero — visual rework

**File:** [`src/components/teacher-home/AIQuickMakeHero.tsx`](src/components/teacher-home/AIQuickMakeHero.tsx) (full replacement)

Three monochrome tiles with layered shadow, icon plate, label row with right-chevron, hover lift.

- [ ] **Step 2.1: Full file replacement**

Replace the entire contents of `src/components/teacher-home/AIQuickMakeHero.tsx` with:

```tsx
import Link from 'next/link';
import { Sparkles, FileText, ClipboardList, ChevronRight } from 'lucide-react';

interface Tile {
  href: string;
  icon: typeof Sparkles;
  label: string;
  subLabel: string;
}

const TILES: Tile[] = [
  {
    href: '/teacher/lessons/new',
    icon: Sparkles,
    label: 'Make a lesson',
    subLabel: 'Slides & explanations',
  },
  {
    href: '/teacher/papers/new',
    icon: FileText,
    label: 'Make a paper',
    subLabel: 'Test or exam with memo',
  },
  {
    href: '/teacher/homework/new',
    icon: ClipboardList,
    label: 'Set homework',
    subLabel: 'Practice tasks with auto-marking',
  },
];

export function AIQuickMakeHero() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TILES.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          className="group flex min-h-35 flex-col justify-between rounded-xl border border-border/40 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted/60">
            <tile.icon className="size-8 text-foreground" />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <p className="text-base font-semibold text-foreground">{tile.label}</p>
              <p className="text-xs text-muted-foreground truncate">{tile.subLabel}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}
```

Changes from current:
- Added `ChevronRight` to Lucide import.
- Surface: `bg-primary/5 border-primary/20` → `bg-card border border-border/40` + the layered box-shadow.
- Height: `min-h-30` (120px) → `min-h-35` (140px). Tailwind 4 canonical.
- Padding: `p-5` → `p-6`.
- Layout: `gap-2` between icon and label block → `flex-col justify-between` to push icon to top and label to bottom (gives the tile a balanced composition).
- Icon: `h-7 w-7 text-primary` → wrapped in a 48×48 `rounded-xl bg-muted/60` plate with a 32px icon (`size-8 text-foreground`). Monochrome.
- Label row: split into a flex row with the right-chevron pinned right.
- Hover: `hover:bg-primary/10 hover:border-primary/40 hover:-translate-y-0.5` → `hover:-translate-y-0.5 hover:border-border/80 hover:shadow-md`. No background shift.
- The label no longer changes colour on hover (`group-hover:text-primary` removed).
- Chevron slides `translate-x-1` (4px) on hover.

- [ ] **Step 2.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/teacher-home/AIQuickMakeHero.tsx
git commit -m "feat(teacher-home): AI hero rework (monochrome, icon plate, chevron, layered shadow)"
```

---

## Task 3: GettingStartedCard — typography + surface polish

**File:** [`src/components/teacher-home/GettingStartedCard.tsx`](src/components/teacher-home/GettingStartedCard.tsx)

Two targeted edits: card title typography lift, step row surface refinement. No behaviour change.

- [ ] **Step 3.1: Update the CardTitle**

In `src/components/teacher-home/GettingStartedCard.tsx`, find the `<CardTitle>` (around line 76). Replace:

```tsx
<CardTitle className="text-lg">
  Getting started <span className="text-sm font-normal text-muted-foreground">({doneCount} of {steps.length})</span>
</CardTitle>
```

with:

```tsx
<CardTitle className="text-base font-medium">
  Getting started
  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
    {doneCount}/{steps.length}
  </span>
</CardTitle>
```

- [ ] **Step 3.2: Update the step row container**

In the same file, find the step row `<div>` inside the `.map((step) => …)` (around line 82). Replace:

```tsx
<div
  key={step.title}
  className="flex items-start justify-between gap-3 rounded-md border p-3"
>
```

with:

```tsx
<div
  key={step.title}
  className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-card p-3 transition-colors hover:bg-muted/30"
>
```

(Adds the soft border, surface, and a subtle hover state. No behavioural change.)

- [ ] **Step 3.3: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/teacher-home/GettingStartedCard.tsx
git commit -m "feat(teacher-home): GettingStartedCard typography + step row polish"
```

---

## Task 4: Zone visual updates (Today / Grading / Drafts)

**Files:**
- [`src/components/teacher-home/TodayZone.tsx`](src/components/teacher-home/TodayZone.tsx)
- [`src/components/teacher-home/GradingZone.tsx`](src/components/teacher-home/GradingZone.tsx)
- [`src/components/teacher-home/DraftsZone.tsx`](src/components/teacher-home/DraftsZone.tsx)

All three zones get the same treatment: count chip in the header, `divide-y` rows replacing per-row border, softer hover with left-highlight, empty-state icon, "+N more" chip in the footer.

- [ ] **Step 4.1: Replace TodayZone.tsx**

Full file replacement of `src/components/teacher-home/TodayZone.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, BookOpen, CalendarCheck } from 'lucide-react';
import type { TodayItem } from '@/types';

interface TodayZoneProps {
  items: TodayItem[];
  total: number;
}

const ICON_BY_KIND = {
  homework: ClipboardList,
  lesson: BookOpen,
} as const;

const HREF_PREFIX_BY_KIND = {
  homework: '/teacher/homework',
  lesson: '/teacher/lessons',
} as const;

function itemTime(item: TodayItem): string {
  const iso = item.kind === 'homework' ? item.dueDate : item.scheduledDate;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export function TodayZone({ items, total }: TodayZoneProps) {
  const overflow = total - items.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Today
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <CalendarCheck className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground text-center">
              Nothing due today. A good day to make something new ✨
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((item) => {
              const Icon = ICON_BY_KIND[item.kind];
              const time = itemTime(item);
              return (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={`${HREF_PREFIX_BY_KIND[item.kind]}/${item.id}`}
                  className="flex items-center gap-3 border-l-2 border-l-transparent p-3 pl-3 transition-colors duration-100 ease-out hover:border-l-foreground/20 hover:bg-muted/40"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.subject ? (
                      <p className="truncate text-xs text-muted-foreground">{item.subject}</p>
                    ) : null}
                  </div>
                  {time ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
        {overflow > 0 ? (
          <div className="flex justify-end pt-3">
            <span className="inline-flex h-5 items-center rounded-full bg-muted/60 px-2 text-xs text-muted-foreground">
              + {overflow} more
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

Key changes from current:
- Added `CalendarCheck` to Lucide imports.
- `CardTitle` typography: `text-lg` → `text-base font-medium`; count moved to a pill chip after the title.
- Empty state wrapped in `flex flex-col items-center justify-center gap-3 py-8` with a 32px faded `CalendarCheck` icon above the copy.
- Rows wrapped in `<div className="divide-y divide-border/40">` instead of each row having its own `border` and `rounded-md`. Per-row padding `p-2.5` → `p-3`.
- Hover: from `rounded-md border p-2.5 transition-colors hover:bg-muted/50` to `border-l-2 border-l-transparent p-3 pl-3 transition-colors duration-100 ease-out hover:border-l-foreground/20 hover:bg-muted/40`. The 2px left border swaps from transparent to highlight on hover — keeps row width stable.
- "+N more" line replaced with a flush-right chip in a `pt-3` footer.
- `space-y-2` removed from CardContent (the divide-y supplies the rhythm).

- [ ] **Step 4.2: Replace GradingZone.tsx**

Full file replacement of `src/components/teacher-home/GradingZone.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import type { GradingItem } from '@/types';

interface GradingZoneProps {
  items: GradingItem[];
  total: number;
}

export function GradingZone({ items, total }: GradingZoneProps) {
  const overflow = total - items.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Grading
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <CheckCircle2 className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground text-center">All caught up. 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/teacher/homework/${item.id}`}
                className="flex items-center justify-between gap-3 border-l-2 border-l-transparent p-3 pl-3 transition-colors duration-100 ease-out hover:border-l-foreground/20 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  {item.subject ? (
                    <p className="truncate text-xs text-muted-foreground">{item.subject}</p>
                  ) : null}
                </div>
                <Badge variant="outline" className="shrink-0">
                  {item.gradedCount}/{item.totalSubmissions} graded
                </Badge>
              </Link>
            ))}
          </div>
        )}
        {overflow > 0 ? (
          <div className="flex justify-end pt-3">
            <span className="inline-flex h-5 items-center rounded-full bg-muted/60 px-2 text-xs text-muted-foreground">
              + {overflow} more
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

Same pattern as TodayZone — chip header, divide-y rows, left-border hover, icon empty state (using `CheckCircle2`), chip footer.

- [ ] **Step 4.3: Replace DraftsZone.tsx**

Full file replacement of `src/components/teacher-home/DraftsZone.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, PenLine } from 'lucide-react';
import type { DraftItem } from '@/types';

interface DraftsZoneProps {
  items: DraftItem[];
  total: number;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
}

export function DraftsZone({ items, total }: DraftsZoneProps) {
  const overflow = total - items.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Drafts
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <PenLine className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground text-center">No drafts. Start a lesson above.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/teacher/lessons/${item.id}`}
                className="flex items-center gap-3 border-l-2 border-l-transparent p-3 pl-3 transition-colors duration-100 ease-out hover:border-l-foreground/20 hover:bg-muted/40"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">Edited {relativeTime(item.updatedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        {overflow > 0 ? (
          <div className="flex justify-end pt-3">
            <span className="inline-flex h-5 items-center rounded-full bg-muted/60 px-2 text-xs text-muted-foreground">
              + {overflow} more
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

Same pattern. Empty-state icon is `PenLine`.

- [ ] **Step 4.4: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/teacher-home/TodayZone.tsx src/components/teacher-home/GradingZone.tsx src/components/teacher-home/DraftsZone.tsx
git commit -m "feat(teacher-home): zone visual polish (chip count, divide-y rows, empty-state icons)"
```

---

## Task 5: First-load motion

**File:** [`src/app/(dashboard)/teacher/page.tsx`](src/app/(dashboard)/teacher/page.tsx)

Add staggered fade-in classes to each section. CSS-only via `tailwindcss-animate` utilities already in the project.

- [ ] **Step 5.1: Add animation classes to each child of the root wrapper**

In `src/app/(dashboard)/teacher/page.tsx`, find the `return (` block from Task 1. Add `motion-safe:` animation utilities to each child:

Replace the `<header>` element with:

```tsx
<header className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
```

(Keep the inner `<h1>` and `<p>` exactly as in Task 1.)

Replace `<AIQuickMakeHero />` with:

```tsx
<div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:delay-[80ms]">
  <AIQuickMakeHero />
</div>
```

Replace the `showChecklist` block with:

```tsx
{showChecklist ? (
  <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:delay-[160ms]">
    <GettingStartedCard
      scopeSet={scopeSet}
      hasClass={onboarding.hasClass}
      hasFirstContent={onboarding.hasFirstContent}
      hasStudent={onboarding.hasStudent}
      classCode={school?.joinCode ?? null}
    />
  </div>
) : null}
```

Replace the zone-grid block with:

```tsx
{dashboard.loading ? (
  <DashboardSkeleton />
) : anyZoneHasContent ? (
  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5 motion-safe:duration-300 motion-safe:delay-[240ms]">
      <TodayZone items={dashboard.today} total={dashboard.todayTotal} />
    </div>
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5 motion-safe:duration-300 motion-safe:delay-[290ms]">
      <GradingZone items={dashboard.grading} total={dashboard.gradingTotal} />
    </div>
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5 motion-safe:duration-300 motion-safe:delay-[340ms]">
      <DraftsZone items={dashboard.drafts} total={dashboard.draftsTotal} />
    </div>
  </div>
) : null}
```

Notes for the engineer:
- `motion-safe:` prefix means users with `prefers-reduced-motion: reduce` see no animation — the page renders fully present.
- `animate-in fade-in slide-in-from-bottom-1` is the `tailwindcss-animate` utility set (the same library used by base-ui Dialog transitions in this project).
- The arbitrary delay classes (`delay-[80ms]`, `delay-[160ms]`, etc.) work in Tailwind 4 — `delay-*` accepts arbitrary millisecond values via the bracket syntax.

- [ ] **Step 5.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add "src/app/(dashboard)/teacher/page.tsx"
git commit -m "feat(teacher-home): first-load stagger motion (motion-safe, ~640ms total)"
```

---

## Task 6: Manual QA

**Files:** None modified — verification only.

- [ ] **Step 6.1: Start the dev server**

```bash
cd c:/Users/shaun/campusly-frontend && npm run dev
```

Visit `http://localhost:3500/teacher`.

- [ ] **Step 6.2: QA the greeting**

1. The greeting reads "Good morning/afternoon/evening, {firstName}" matching the local hour at the time of the visit.
2. Headline is visibly larger than before — `text-3xl font-semibold` weight.
3. Date line sits ~4px below the headline in muted grey.
4. No `PageHeader` styling, no avatar or widget on the right side.

- [ ] **Step 6.3: QA the background fade**

1. Light mode: scrolled to top, the very top of the page area has a faint warm-grey tint that fades to white over the first ~200px.
2. Dark mode: top of page is flat dark `bg-background` — no visible gradient.
3. The fade does NOT cause a visible band or banding artefact when scrolling.

- [ ] **Step 6.4: QA the AI hero tiles**

1. Three tiles, monochrome (no coloured backgrounds or borders).
2. Each tile is 140px tall.
3. Top-left: 48×48 rounded plate with a 32px icon (Sparkles / FileText / ClipboardList).
4. Bottom: label + sub-label on the left, right-chevron on the right.
5. Hover: the tile lifts ~2px, shadow deepens, chevron slides ~4px right. Smooth 200ms.
6. Clicking takes you to `/teacher/lessons/new` / `/teacher/papers/new` / `/teacher/homework/new`.

- [ ] **Step 6.5: QA the zones**

1. Each zone header shows the title followed by a pill chip with the count (not parenthetical).
2. Rows have no individual border — they're separated by hairline dividers (`divide-y`).
3. Hovering a row shows a 2px left highlight and a subtle background fill, without shifting layout width.
4. With more than 3 items in a zone, the "+N more" footer appears as a flush-right pill chip.
5. Empty zone shows a 32px faded icon (CalendarCheck / CheckCircle2 / PenLine) above the existing copy.

- [ ] **Step 6.6: QA the tablet grid**

Resize the browser to a width around 900px (between `sm` and `lg`). The three zones should arrange as 2 columns with the third wrapping to a second row.

At full desktop width (≥1024px), all three zones sit side-by-side.

At mobile width (<768px), zones stack to one column.

- [ ] **Step 6.7: QA the first-load motion**

1. Hard-refresh the page. Watch the entrance — greeting appears first, then hero, then checklist (if applicable), then the zones cascade Mon→Tue style with ~50ms gaps. Whole choreography settles within ~640ms.
2. Set the browser/OS to "reduce motion" and reload. The page renders instantly with no fade or slide.
3. Switch browser tab and come back. The page does NOT replay the animation — content stays put.

- [ ] **Step 6.8: QA code hygiene**

```bash
cd c:/Users/shaun/campusly-frontend
node -e "
const fs = require('fs');
const files = [
  'src/app/(dashboard)/teacher/page.tsx',
  'src/components/teacher-home/AIQuickMakeHero.tsx',
  'src/components/teacher-home/GettingStartedCard.tsx',
  'src/components/teacher-home/TodayZone.tsx',
  'src/components/teacher-home/GradingZone.tsx',
  'src/components/teacher-home/DraftsZone.tsx',
];
for (const f of files) console.log(f + ':', fs.readFileSync(f, 'utf8').split('\n').length, 'lines');
"
```

Expected: all six files under 350 lines. `page.tsx` under 100 lines.

Grep for banned patterns in the touched files (use Grep tool):
- Pattern `apiClient` in `src/components/teacher-home/*.tsx` — expected zero matches.
- Pattern `text-red-|bg-red-` in `src/components/teacher-home/*.tsx` and `src/app/(dashboard)/teacher/page.tsx` — expected zero matches.
- Pattern `: any|as any` in `src/components/teacher-home/*.tsx` and `src/app/(dashboard)/teacher/page.tsx` — expected zero matches.

- [ ] **Step 6.9: QA content parity**

Verify the page footprint matches the original MVP spec ([`2026-05-15-teacher-home-mvp-design.md`](docs/superpowers/specs/2026-05-15-teacher-home-mvp-design.md)) — no content was added or removed:

1. Greeting + date line, AI hero with three tiles, Getting Started card (when applicable), three zones. No new sections, no removed sections.
2. Zone count chips render their final value immediately — no count-up animation (the number just appears).
3. Empty-state copy is unchanged: "Nothing due today. A good day to make something new ✨" / "All caught up. 🎉" / "No drafts. Start a lesson above."

- [ ] **Step 6.10: Commit any QA touch-ups**

If anything needed adjusting during QA, commit it now:

```bash
cd c:/Users/shaun/campusly-frontend
git add -A
git commit -m "fix(teacher-home): visual-polish QA touch-ups"
```

Otherwise skip.

---

## Spec coverage map

| Spec section | Implemented in |
|---|---|
| Page foundation (background, typography, spacing) | Task 1 |
| AI hero rework | Task 2 |
| Time-aware greeting | Task 1 |
| Zone header chip + row treatment | Task 4 |
| Tablet 2-column grid | Task 1 (grid classes) |
| Empty-state icons | Task 4 |
| First-load motion | Task 5 |
| `prefers-reduced-motion` safety | Task 5 (`motion-safe:` prefix) |
| GettingStartedCard polish | Task 3 |
| Manual QA + acceptance criteria | Task 6 |
| No count-up on count chips | Task 6.9 (verified) |
| No content added/removed (parity with MVP) | Task 6.9 (verified) |
| Line-count + apiClient + reds + `:any` guards | Task 6.8 (verified) |
