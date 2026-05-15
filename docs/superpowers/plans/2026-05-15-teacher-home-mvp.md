# Teacher Home Page MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the standalone-teacher home page (`/teacher`) into a two-layer page (AI Quick-Make hero + three job zones: Today, Grading, Drafts) with a 4-step Getting Started checklist, per [`docs/superpowers/specs/2026-05-15-teacher-home-mvp-design.md`](docs/superpowers/specs/2026-05-15-teacher-home-mvp-design.md).

**Architecture:**
- Backend change is narrow: one new `hasFirstContent` boolean on `GET /api/auth/onboarding-status`. TDD'd against the existing test pattern in `src/modules/Auth/__tests__/`.
- Frontend is type-driven: build all components first (typed props, no data fetching), then reshape `useTeacherDashboard` and rewrite `teacher/page.tsx` in a single atomic commit so the build never breaks mid-task.
- This codebase has **no component test infrastructure** (`tests/` contains a single pure-logic test; Vitest is configured for `environment: 'node'`). Setting up RTL/jsdom is out of scope. Frontend verification is `tsc --noEmit`, `npm run lint`, and manual QA against the spec's acceptance criteria. Backend uses the existing Vitest + Mongoose integration-test pattern.

**Tech Stack:** Next.js 16 (React 19), Tailwind 4, base-ui (NOT Radix), Zustand, Axios, Lucide icons. Backend: Express + Mongoose + Vitest.

---

## File Structure

**Backend — modify:**
- [`c:\Users\shaun\campusly-backend\src\modules\Auth\standalone.service.ts`](c:/Users/shaun/campusly-backend/src/modules/Auth/standalone.service.ts) — extend `OnboardingStatus` interface and `getOnboardingStatus` method

**Backend — create:**
- `c:\Users\shaun\campusly-backend\src\modules\Auth\__tests__\onboarding-status.test.ts` — integration test for `hasFirstContent`

**Frontend — modify:**
- [`src/hooks/useOnboardingStatus.ts`](src/hooks/useOnboardingStatus.ts) — add `hasFirstContent: boolean` to `OnboardingStatus` interface and parse it from the response
- [`src/hooks/useTeacherDashboard.ts`](src/hooks/useTeacherDashboard.ts) — full rewrite to return the new `{ today, grading, drafts, ...totals, loading }` shape
- [`src/app/(dashboard)/teacher/page.tsx`](src/app/(dashboard)/teacher/page.tsx) — full rewrite as thin composition (target < 100 lines)

**Frontend — create:**
- `src/types/teacher-home.ts` — `TodayItem`, `GradingItem`, `DraftItem` types (shared by hook + components)
- `src/components/teacher-home/AIQuickMakeHero.tsx` — three big tiles
- `src/components/teacher-home/GettingStartedCard.tsx` — 4-step checklist
- `src/components/teacher-home/TodayZone.tsx` — Today zone card
- `src/components/teacher-home/GradingZone.tsx` — Grading zone card
- `src/components/teacher-home/DraftsZone.tsx` — Drafts zone card (lesson-only)

**Frontend — touched indirectly:**
- [`src/types/index.ts`](src/types/index.ts) — re-export the new teacher-home types

**Confirmed not needed:**
- `src/app/(dashboard)/teacher/homework/new/page.tsx` already exists (verified during planning) — no new route needed.

---

## Task 1: Backend — add `hasFirstContent` to onboarding status

**Files:**
- Test: `c:\Users\shaun\campusly-backend\src\modules\Auth\__tests__\onboarding-status.test.ts` (create)
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Auth\standalone.service.ts:20-25` (interface), `:90-109` (method)

This task is fully self-contained in the backend repo. Backend tests run via `npm test` from the backend directory.

- [ ] **Step 1.1: Write the failing test**

Create `c:\Users\shaun\campusly-backend\src\modules\Auth\__tests__\onboarding-status.test.ts` with:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { StandaloneService } from '../standalone.service.js';
import { School } from '../../School/model.js';
import { User } from '../model.js';
import { Lesson } from '../../Lesson/model.js';
import { Homework } from '../../Homework/model.js';
import { GeneratedPaper } from '../../AITools/model.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test',
    );
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

async function makeTeacher() {
  const stamp = Date.now() + Math.random();
  const school = await School.create({
    name: `t_obs_${stamp}`,
    type: 'combined',
    address: { street: 'x', city: 'x', province: 'x', postalCode: '0000', country: 'ZA' },
    contactInfo: { email: `obs+${stamp}@test.local`, phone: '0' },
    settings: { academicYear: 2026, terms: 4, gradingSystem: 'percentage' },
    principal: 'T',
    joinCode: 'XXXX',
    isActive: true,
    plan: 'standalone',
  });
  const user = await User.create({
    email: `obs+${stamp}@test.local`,
    password: 'Password1!',
    firstName: 'T',
    lastName: 'X',
    role: 'teacher',
    schoolId: school._id,
    isStandaloneTeacher: true,
  });
  return { user, school };
}

describe('getOnboardingStatus.hasFirstContent', () => {
  it('returns false when teacher has no lessons, homework, or papers', async () => {
    const { user, school } = await makeTeacher();
    const status = await StandaloneService.getOnboardingStatus(
      String(user._id),
      String(school._id),
    );
    expect(status.hasFirstContent).toBe(false);
  });

  it('returns true when teacher has at least one lesson', async () => {
    const { user, school } = await makeTeacher();
    await Lesson.create({
      schoolId: school._id,
      teacherId: user._id,
      title: 'Test lesson',
      subject: 'Math',
      grade: 8,
    });
    const status = await StandaloneService.getOnboardingStatus(
      String(user._id),
      String(school._id),
    );
    expect(status.hasFirstContent).toBe(true);
  });

  it('returns true when teacher has at least one homework', async () => {
    const { user, school } = await makeTeacher();
    await Homework.create({
      schoolId: school._id,
      teacherId: user._id,
      title: 'Test homework',
    });
    const status = await StandaloneService.getOnboardingStatus(
      String(user._id),
      String(school._id),
    );
    expect(status.hasFirstContent).toBe(true);
  });

  it('returns true when teacher has at least one generated paper', async () => {
    const { user, school } = await makeTeacher();
    await GeneratedPaper.create({
      schoolId: school._id,
      teacherId: user._id,
      subject: 'Math',
      grade: 8,
      term: 1,
      topic: 'Algebra',
      difficulty: 'medium',
      duration: 60,
      totalMarks: 100,
    });
    const status = await StandaloneService.getOnboardingStatus(
      String(user._id),
      String(school._id),
    );
    expect(status.hasFirstContent).toBe(true);
  });
});
```

Note: the test creates minimal documents. Some required fields on Lesson/Homework may be missing — if so, the test will surface a Mongoose validation error and the engineer should add the minimum required fields based on the schema. **Do not stub or weaken the schema; add the fields.**

- [ ] **Step 1.2: Run the test and verify it fails**

From the backend repo root:

```bash
cd c:/Users/shaun/campusly-backend && npm test -- onboarding-status.test
```

Expected: **FAIL** on every test with `Property 'hasFirstContent' does not exist on type 'OnboardingStatus'` (TypeScript error before runtime). This is the desired RED state.

- [ ] **Step 1.3: Extend the `OnboardingStatus` interface and the service method**

Modify `c:\Users\shaun\campusly-backend\src\modules\Auth\standalone.service.ts`:

At line 20, change:

```ts
interface OnboardingStatus {
  hasClass: boolean;
  hasStudent: boolean;
  hasFramework: boolean;
  dismissed: boolean;
}
```

to:

```ts
interface OnboardingStatus {
  hasClass: boolean;
  hasStudent: boolean;
  hasFramework: boolean;
  hasFirstContent: boolean;
  dismissed: boolean;
}
```

At the top of the file (line 6 area), add the three model imports next to the existing ones:

```ts
import { Lesson } from '../Lesson/model.js';
import { Homework } from '../Homework/model.js';
import { GeneratedPaper } from '../AITools/model.js';
```

At line 96–101 (inside `getOnboardingStatus`), add the content count after the existing counts:

```ts
    const classCount = await Class.countDocuments({ schoolId, isDeleted: false });
    const studentCount = await Student.countDocuments({ schoolId, isDeleted: false });
    const frameworkCount = await CurriculumFramework.countDocuments({
      $or: [{ schoolId: null }, { schoolId }],
      isDeleted: false,
    });
    const contentCount =
      (await Lesson.countDocuments({ schoolId, isDeleted: false }).limit(1)) +
      (await Homework.countDocuments({ schoolId, isDeleted: false }).limit(1)) +
      (await GeneratedPaper.countDocuments({ schoolId, isDeleted: false }).limit(1));
```

`.limit(1)` makes each query bail at the first hit — we only need to know *if any exists*, not the actual count.

At line 103–108, add the new field to the return:

```ts
    return {
      hasClass: classCount > 0,
      hasStudent: studentCount > 0,
      hasFramework: frameworkCount > 0,
      hasFirstContent: contentCount > 0,
      dismissed: user.onboardingDismissed,
    };
```

- [ ] **Step 1.4: Run the test and verify it passes**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- onboarding-status.test
```

Expected: **PASS** all 4 tests.

If any test fails because of missing required fields on Lesson/Homework/GeneratedPaper creation, look up the missing field in the relevant `model.ts`, add it to the `.create({ ... })` call in the test, and rerun.

- [ ] **Step 1.5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Auth/standalone.service.ts src/modules/Auth/__tests__/onboarding-status.test.ts
git commit -m "feat(auth): add hasFirstContent to onboarding status"
```

---

## Task 2: Frontend — extend `OnboardingStatus` TS interface

**Files:**
- Modify: [`src/hooks/useOnboardingStatus.ts:6-18`](src/hooks/useOnboardingStatus.ts#L6-L18) and `:49-54`

This is purely additive. Old consumers see no change.

- [ ] **Step 2.1: Add the new field**

In `src/hooks/useOnboardingStatus.ts`, change lines 6–18 from:

```ts
interface OnboardingStatus {
  hasClass: boolean;
  hasStudent: boolean;
  hasFramework: boolean;
  dismissed: boolean;
}

const DEFAULT_STATUS: OnboardingStatus = {
  hasClass: false,
  hasStudent: false,
  hasFramework: false,
  dismissed: false,
};
```

to:

```ts
interface OnboardingStatus {
  hasClass: boolean;
  hasStudent: boolean;
  hasFramework: boolean;
  hasFirstContent: boolean;
  dismissed: boolean;
}

const DEFAULT_STATUS: OnboardingStatus = {
  hasClass: false,
  hasStudent: false,
  hasFramework: false,
  hasFirstContent: false,
  dismissed: false,
};
```

And in the `setStatus` call (around line 49–54), add the `hasFirstContent` line:

```ts
        setStatus({
          hasClass: Boolean(data?.hasClass),
          hasStudent: Boolean(data?.hasStudent),
          hasFramework: Boolean(data?.hasFramework),
          hasFirstContent: Boolean(data?.hasFirstContent),
          dismissed: Boolean(data?.dismissed),
        });
```

- [ ] **Step 2.2: Verify with tsc**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

Expected: no new errors (existing repo errors may surface — ignore those that are unrelated to the touched file).

- [ ] **Step 2.3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useOnboardingStatus.ts
git commit -m "feat(auth): expose hasFirstContent in useOnboardingStatus"
```

---

## Task 3: Frontend — create shared types for the home page

**Files:**
- Create: `src/types/teacher-home.ts`
- Modify: `src/types/index.ts` — add the new re-export

- [ ] **Step 3.1: Create the types file**

Create `src/types/teacher-home.ts` with this exact content:

```ts
export type TodayItem =
  | { kind: 'homework'; id: string; title: string; subject: string; dueDate: string }
  | { kind: 'lesson'; id: string; title: string; subject: string; scheduledDate: string };
// Papers excluded — GeneratedPaper has no scheduled-for-date field.

export interface GradingItem {
  kind: 'homework'; // MVP: papers deferred
  id: string;
  title: string;
  subject: string;
  totalSubmissions: number;
  gradedCount: number;
  oldestSubmittedAt: string;
}

export interface DraftItem {
  kind: 'lesson'; // MVP: only lessons have a draft state in the model
  id: string;
  title: string;
  updatedAt: string;
}

export interface TeacherHomeData {
  today: TodayItem[];
  todayTotal: number;
  grading: GradingItem[];
  gradingTotal: number;
  drafts: DraftItem[];
  draftsTotal: number;
  loading: boolean;
}
```

- [ ] **Step 3.2: Re-export from the barrel file**

Append to `src/types/index.ts`:

```ts
export type { TodayItem, GradingItem, DraftItem, TeacherHomeData } from './teacher-home';
```

(If the barrel uses a different export style — e.g. `export * from './foo';` — match that style instead. Read the file first.)

- [ ] **Step 3.3: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/types/teacher-home.ts src/types/index.ts
git commit -m "feat(teacher-home): add shared types for home zones"
```

---

## Task 4: Component — `AIQuickMakeHero`

**Files:**
- Create: `src/components/teacher-home/AIQuickMakeHero.tsx`

Three tiles, equal width on desktop, stacked on mobile. Each tile links to an existing route.

- [ ] **Step 4.1: Create the component**

Create `src/components/teacher-home/AIQuickMakeHero.tsx`:

```tsx
import Link from 'next/link';
import { Sparkles, FileText, ClipboardList } from 'lucide-react';

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
          className="group flex min-h-30 flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10"
        >
          <tile.icon className="h-7 w-7 text-primary" />
          <div className="space-y-0.5">
            <p className="text-base font-semibold group-hover:text-primary">{tile.label}</p>
            <p className="text-xs text-muted-foreground">{tile.subLabel}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/teacher-home/AIQuickMakeHero.tsx
git commit -m "feat(teacher-home): add AIQuickMakeHero component"
```

---

## Task 5: Component — `GettingStartedCard`

**Files:**
- Create: `src/components/teacher-home/GettingStartedCard.tsx`

4-step checklist. Renders only when at least one step is incomplete. Step 4 (Invite a student) is gated on step 2 (Create a class) being done.

- [ ] **Step 5.1: Create the component**

Create `src/components/teacher-home/GettingStartedCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Circle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface GettingStartedCardProps {
  scopeSet: boolean;
  hasClass: boolean;
  hasFirstContent: boolean;
  hasStudent: boolean;
  classCode: string | null;
}

interface Step {
  done: boolean;
  title: string;
  helper: string;
  action: React.ReactNode;
}

export function GettingStartedCard({
  scopeSet,
  hasClass,
  hasFirstContent,
  hasStudent,
  classCode,
}: GettingStartedCardProps) {
  const allDone = scopeSet && hasClass && hasFirstContent && hasStudent;
  if (allDone) return null;

  const steps: Step[] = [
    {
      done: scopeSet,
      title: 'Set your teaching scope',
      helper: 'Grades & subjects you teach',
      action: (
        <Link href="/teacher/settings" className="text-sm text-primary hover:underline">
          Open settings
        </Link>
      ),
    },
    {
      done: hasClass,
      title: 'Create your first class',
      helper: 'Group your students together',
      action: (
        <Link href="/teacher/classes" className="text-sm text-primary hover:underline">
          New class
        </Link>
      ),
    },
    {
      done: hasFirstContent,
      title: 'Make your first lesson, paper, or homework',
      helper: 'Use the tiles above to generate content with AI',
      action: null,
    },
    {
      done: hasStudent,
      title: 'Invite a student',
      helper: hasClass
        ? 'Share your class code'
        : 'Create a class first, then invite students',
      action: hasClass && classCode ? <CopyCodeButton code={classCode} /> : null,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Getting started <span className="text-sm font-normal text-muted-foreground">({doneCount} of {steps.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="flex items-start justify-between gap-3 rounded-md border p-3"
          >
            <div className="flex items-start gap-3">
              {step.done ? (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p
                  className={
                    step.done
                      ? 'text-sm font-medium text-muted-foreground'
                      : 'text-sm font-medium'
                  }
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.helper}</p>
              </div>
            </div>
            {!step.done && step.action ? <div className="shrink-0">{step.action}</div> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Class code copied');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
    >
      <Copy className="h-3 w-3" />
      {copied ? 'Copied!' : code}
    </button>
  );
}
```

- [ ] **Step 5.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/teacher-home/GettingStartedCard.tsx
git commit -m "feat(teacher-home): add GettingStartedCard 4-step checklist"
```

---

## Task 6: Component — `TodayZone`

**Files:**
- Create: `src/components/teacher-home/TodayZone.tsx`

- [ ] **Step 6.1: Create the component**

Create `src/components/teacher-home/TodayZone.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, FileText, BookOpen } from 'lucide-react';
import type { TodayItem } from '@/types';

interface TodayZoneProps {
  items: TodayItem[];
  total: number;
}

const ICON_BY_KIND = {
  homework: ClipboardList,
  paper: FileText,
  lesson: BookOpen,
} as const;

const HREF_PREFIX_BY_KIND = {
  homework: '/teacher/homework',
  paper: '/teacher/papers',
  lesson: '/teacher/lessons',
} as const;

function itemTime(item: TodayItem): string {
  const iso =
    item.kind === 'homework'
      ? item.dueAt
      : item.kind === 'paper'
        ? item.scheduledAt
        : item.scheduledDate;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Only show time if hours or minutes are non-zero (date-only sources have 00:00).
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export function TodayZone({ items, total }: TodayZoneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Today <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing due today. A good day to make something new ✨
          </p>
        ) : (
          items.map((item) => {
            const Icon = ICON_BY_KIND[item.kind];
            const time = itemTime(item);
            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={`${HREF_PREFIX_BY_KIND[item.kind]}/${item.id}`}
                className="flex items-center gap-3 rounded-md border p-2.5 transition-colors hover:bg-muted/50"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.subject}</p>
                </div>
                {time ? <span className="shrink-0 text-xs text-muted-foreground">{time}</span> : null}
              </Link>
            );
          })
        )}
        {total > items.length ? (
          <p className="pt-1 text-xs text-muted-foreground">+{total - items.length} more</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/teacher-home/TodayZone.tsx
git commit -m "feat(teacher-home): add TodayZone component"
```

---

## Task 7: Component — `GradingZone`

**Files:**
- Create: `src/components/teacher-home/GradingZone.tsx`

- [ ] **Step 7.1: Create the component**

Create `src/components/teacher-home/GradingZone.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GradingItem } from '@/types';

interface GradingZoneProps {
  items: GradingItem[];
  total: number;
}

export function GradingZone({ items, total }: GradingZoneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Grading <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up. 🎉</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/teacher/homework/${item.id}`}
              className="flex items-center justify-between gap-3 rounded-md border p-2.5 transition-colors hover:bg-muted/50"
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
          ))
        )}
        {total > items.length ? (
          <p className="pt-1 text-xs text-muted-foreground">+{total - items.length} more</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/teacher-home/GradingZone.tsx
git commit -m "feat(teacher-home): add GradingZone component"
```

---

## Task 8: Component — `DraftsZone`

**Files:**
- Create: `src/components/teacher-home/DraftsZone.tsx`

Lessons only, per the spec correction.

- [ ] **Step 8.1: Create the component**

Create `src/components/teacher-home/DraftsZone.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Drafts <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drafts. Start a lesson above.</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/teacher/lessons/${item.id}`}
              className="flex items-center gap-3 rounded-md border p-2.5 transition-colors hover:bg-muted/50"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">Edited {relativeTime(item.updatedAt)}</p>
              </div>
            </Link>
          ))
        )}
        {total > items.length ? (
          <p className="pt-1 text-xs text-muted-foreground">+{total - items.length} more</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 8.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/teacher-home/DraftsZone.tsx
git commit -m "feat(teacher-home): add DraftsZone component (lessons only)"
```

---

## Task 9: Reshape `useTeacherDashboard` and rewrite `teacher/page.tsx` (atomic)

**Files:**
- Rewrite: [`src/hooks/useTeacherDashboard.ts`](src/hooks/useTeacherDashboard.ts) (full replacement)
- Rewrite: [`src/app/(dashboard)/teacher/page.tsx`](src/app/(dashboard)/teacher/page.tsx) (full replacement)

These two files change together — the hook's old shape is consumed by the old page; the new hook shape is consumed by the new page. Doing them as one commit keeps the tree green.

The teacher's join code (which doubles as the class code for standalone teachers) is on the **School**, not on `SchoolClass` (verified — `SchoolClass` in [`src/types/academic.ts:17-27`](src/types/academic.ts#L17-L27) has no joinCode field). The page reads it from `useSchoolStore.school.joinCode` and passes it to `GettingStartedCard`. The hook itself does not need to load the join code.

- [ ] **Step 9.1: Rewrite `src/hooks/useTeacherDashboard.ts`**

Full replacement (delete the existing content first). The new hook composes existing endpoints and returns the spec's new shape. Papers are excluded from the Today zone (no scheduling field on the model). The join code for the checklist is sourced separately from `useSchoolStore` in `teacher/page.tsx`, not from this hook.

```ts
import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toISODate } from '@/lib/utils';
import type {
  Homework,
  Subject,
  Lesson,
  TodayItem,
  GradingItem,
  DraftItem,
} from '@/types';

interface DashboardData {
  today: TodayItem[];
  todayTotal: number;
  grading: GradingItem[];
  gradingTotal: number;
  drafts: DraftItem[];
  draftsTotal: number;
  loading: boolean;
}

function resolveMaybeId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return '';
  const record = value as { id?: unknown; _id?: unknown };
  if (typeof record.id === 'string') return record.id;
  if (typeof record._id === 'string') return record._id;
  return '';
}

const REFETCH_THROTTLE_MS = 30_000;

export function useTeacherDashboard(): DashboardData {
  const { user } = useAuthStore();
  const [today, setToday] = useState<TodayItem[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [grading, setGrading] = useState<GradingItem[]>([]);
  const [gradingTotal, setGradingTotal] = useState(0);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [draftsTotal, setDraftsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const lastFetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    lastFetchRef.current = Date.now();
    const todayIso = toISODate(new Date());

    try {
      const [homeworkRes, lessonsRes, subjectsRes] = await Promise.allSettled([
        apiClient.get('/homework'),
        apiClient.get('/lessons'),
        apiClient.get('/academic/subjects'),
      ]);

      // Build a subjectId → name map.
      const subjectMap = new Map<string, string>();
      if (subjectsRes.status === 'fulfilled') {
        const subjects = unwrapList<Subject>(subjectsRes.value);
        for (const s of subjects) {
          const sid = resolveMaybeId(s);
          if (sid) subjectMap.set(sid, s.name ?? '');
        }
      }
      const subjectNameOf = (subjectId: unknown): string => {
        const sid = resolveMaybeId(subjectId);
        return sid ? (subjectMap.get(sid) ?? '') : '';
      };

      // ── Today ────────────────────────────────────────────────────────────
      // Homework + lessons due/scheduled today. Papers excluded — no
      // scheduled-for-date field on GeneratedPaper.
      const todayItems: TodayItem[] = [];

      if (homeworkRes.status === 'fulfilled') {
        const homework = unwrapList<Homework>(homeworkRes.value).filter(
          (h) => h.teacherId === user.id,
        );
        for (const h of homework) {
          if (!h.dueDate) continue;
          if (toISODate(new Date(h.dueDate)) !== todayIso) continue;
          todayItems.push({
            kind: 'homework',
            id: h._id,
            title: h.title,
            subject: subjectNameOf(h.subjectId),
            dueDate: typeof h.dueDate === 'string' ? h.dueDate : new Date(h.dueDate).toISOString(),
          });
        }
      }

      if (lessonsRes.status === 'fulfilled') {
        const lessons = unwrapList<Lesson>(lessonsRes.value).filter(
          (l) => resolveMaybeId(l.teacherId) === user.id,
        );
        for (const l of lessons) {
          if (!l.scheduledDate) continue;
          if (toISODate(new Date(l.scheduledDate)) !== todayIso) continue;
          todayItems.push({
            kind: 'lesson',
            id: resolveMaybeId(l),
            title: l.title,
            subject: subjectNameOf(l.subjectId),
            scheduledDate:
              typeof l.scheduledDate === 'string'
                ? l.scheduledDate
                : new Date(l.scheduledDate).toISOString(),
          });
        }
      }

      todayItems.sort((a, b) => {
        const ta = a.kind === 'homework' ? a.dueDate : a.scheduledDate;
        const tb = b.kind === 'homework' ? b.dueDate : b.scheduledDate;
        return new Date(ta).getTime() - new Date(tb).getTime();
      });
      setTodayTotal(todayItems.length);
      setToday(todayItems.slice(0, 3));

      // ── Grading (homework only, per spec) ────────────────────────────────
      const gradingAll: GradingItem[] = [];
      if (homeworkRes.status === 'fulfilled') {
        const homework = unwrapList<Homework>(homeworkRes.value).filter(
          (h) => h.teacherId === user.id,
        );
        // N+1 fetch acceptable for MVP — matches current pattern.
        const submissionResults = await Promise.allSettled(
          homework.map((h) => apiClient.get(`/homework/${h._id}/submissions`)),
        );
        homework.forEach((h, idx) => {
          const sub = submissionResults[idx];
          if (sub.status !== 'fulfilled') return;
          const subs = unwrapList<Record<string, unknown>>(sub.value);
          const submittedSubs = subs.filter((s) => s.status === 'submitted');
          if (submittedSubs.length === 0) return;
          const graded = submittedSubs.filter(
            (s) => s.grade !== undefined && s.grade !== null,
          ).length;
          if (graded >= submittedSubs.length) return; // fully graded
          const oldest = submittedSubs
            .map((s) => new Date(String(s.submittedAt ?? s.createdAt ?? '')).getTime())
            .filter((t) => !Number.isNaN(t))
            .sort((a, b) => a - b)[0];
          gradingAll.push({
            kind: 'homework',
            id: h._id,
            title: h.title,
            subject: subjectNameOf(h.subjectId),
            totalSubmissions: submittedSubs.length,
            gradedCount: graded,
            oldestSubmittedAt: oldest ? new Date(oldest).toISOString() : '',
          });
        });
      }
      gradingAll.sort(
        (a, b) =>
          new Date(a.oldestSubmittedAt || 0).getTime() -
          new Date(b.oldestSubmittedAt || 0).getTime(),
      );
      setGradingTotal(gradingAll.length);
      setGrading(gradingAll.slice(0, 3));

      // ── Drafts (lessons with publishedAt == null) ───────────────────────
      const draftsAll: DraftItem[] = [];
      if (lessonsRes.status === 'fulfilled') {
        const lessons = unwrapList<Lesson>(lessonsRes.value).filter(
          (l) =>
            resolveMaybeId(l.teacherId) === user.id &&
            !(l as { publishedAt?: string | null }).publishedAt,
        );
        for (const l of lessons) {
          draftsAll.push({
            kind: 'lesson',
            id: resolveMaybeId(l),
            title: l.title,
            updatedAt:
              typeof l.updatedAt === 'string'
                ? l.updatedAt
                : new Date(String(l.updatedAt ?? Date.now())).toISOString(),
          });
        }
      }
      draftsAll.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setDraftsTotal(draftsAll.length);
      setDrafts(draftsAll.slice(0, 3));
    } catch (err: unknown) {
      console.error('Failed to load teacher home dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Refetch on tab focus, debounced.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchRef.current < REFETCH_THROTTLE_MS) return;
      void fetchData();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchData]);

  return {
    today,
    todayTotal,
    grading,
    gradingTotal,
    drafts,
    draftsTotal,
    loading,
  };
}
```

**Notes for the engineer:**
- Type imports come from `@/types`. If `Lesson` or `Subject` aren't already re-exported from the barrel, locate them in `src/types/` and add a `export * from './lesson';` or equivalent — do not import deeply (e.g. `@/types/lesson`).
- The page reads the join code separately via `useSchoolStore` — see step 9.2 below.

- [ ] **Step 9.2: Rewrite `src/app/(dashboard)/teacher/page.tsx`**

Full replacement:

```tsx
'use client';

import { PageHeader } from '@/components/shared/PageHeader';
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

export default function TeacherHomePage() {
  const user = useAuthStore((s) => s.user);
  const school = useSchoolStore((s) => s.school);
  const dashboard = useTeacherDashboard();
  const { status: onboarding, loading: onboardingLoading } = useOnboardingStatus();
  const { isEmpty: scopeEmpty, loading: scopeLoading } = useTeachingScope();

  if (dashboard.loading) return <DashboardSkeleton />;

  const firstName = user?.firstName ?? 'Teacher';
  const dateLabel = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const scopeSet = !scopeLoading && !scopeEmpty;
  const checklistReady = !onboardingLoading;
  const showChecklist =
    checklistReady &&
    !(scopeSet && onboarding.hasClass && onboarding.hasFirstContent && onboarding.hasStudent);

  const anyZoneHasContent =
    dashboard.todayTotal > 0 || dashboard.gradingTotal > 0 || dashboard.draftsTotal > 0;

  return (
    <div className="space-y-6">
      <PageHeader title={`Hi ${firstName}`} description={dateLabel} />

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

      {anyZoneHasContent ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <TodayZone items={dashboard.today} total={dashboard.todayTotal} />
          <GradingZone items={dashboard.grading} total={dashboard.gradingTotal} />
          <DraftsZone items={dashboard.drafts} total={dashboard.draftsTotal} />
        </div>
      ) : null}
    </div>
  );
}
```

If `school?.joinCode` is flagged by `tsc` because the `School` type in [`src/types/`](src/types/) doesn't expose `joinCode`, add the field to the `School` interface (it definitely exists on the backend model and is returned by `GET /api/schools/:id`). Do not use `as any` or a cast.

- [ ] **Step 9.3: Verify type-check and lint**

```bash
cd c:/Users/shaun/campusly-frontend
npx tsc --noEmit
npx eslint "src/app/(dashboard)/teacher/page.tsx" "src/hooks/useTeacherDashboard.ts" "src/components/teacher-home/**/*.tsx"
```

If `tsc` flags missing barrel re-exports (e.g. `Lesson`, `Subject`), add them to [`src/types/index.ts`](src/types/index.ts) following the existing `export * from './foo'` pattern, then re-run.

Expected: clean for the touched files. Pre-existing repo errors unrelated to these files can be ignored.

- [ ] **Step 9.4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useTeacherDashboard.ts "src/app/(dashboard)/teacher/page.tsx" src/types
git commit -m "feat(teacher-home): reshape useTeacherDashboard + rewrite home page"
```

---

## Task 10: Final QA against acceptance criteria

**Files:**
- None modified — verification only.

- [ ] **Step 10.1: Start the dev servers**

In one terminal:

```bash
cd c:/Users/shaun/campusly-backend && npm run dev
```

In another:

```bash
cd c:/Users/shaun/campusly-frontend && npm run dev
```

The frontend runs at `http://localhost:3500`.

- [ ] **Step 10.2: QA — brand-new standalone teacher**

Sign up a fresh standalone teacher via `/register-teacher` (or the standalone signup endpoint). On landing at `/teacher`:

**Expected:**
- Greeting strip with first name + today's date (e.g. "Hi Sarah", "Wednesday, 15 May").
- Three AI Quick-Make tiles: Make a lesson / Make a paper / Set homework.
- Getting Started card titled "Getting started (0 of 4)" with four unchecked items.
- Step 4 (Invite a student) shows "Create a class first..." helper text and no action button.
- **No** zones rendered.
- **Nothing visible:** refresh button, "Operating independently?" banner, stat strip, Quick Actions card, "Today's Classes", "Pending Grading" card, attendance card, AnnouncementBanner.

- [ ] **Step 10.3: QA — checklist progress**

1. Open `/teacher/settings`, set teaching scope (at least one grade + subject). Return to `/teacher`. Expect: Getting started (1 of 4); step 1 is ticked.
2. Open `/teacher/classes`, create a class. Return to `/teacher`. Expect: (2 of 4); step 4 now shows the class code as a Copy button.
3. Click "Make a lesson" tile → create one lesson and save it. Return to `/teacher`. Expect: (3 of 4); Drafts zone appears with the lesson; "+0 more" is absent (since total = 1).
4. Have a student join the class (via the join code). Return to `/teacher`. Expect: Getting Started card has disappeared entirely.

- [ ] **Step 10.4: QA — zone behaviour**

- Create 4+ lessons as drafts. Reload `/teacher`. Drafts zone shows 3 items, header "(4)", footer "+1 more".
- Click any zone row — it navigates to the corresponding detail page.
- Empty Today: zone shows "Nothing due today. A good day to make something new ✨".
- Empty Grading: zone shows "All caught up. 🎉".
- Tab focus refetch: switch to another browser tab for >30s, come back. Network panel shows the hook refetched.

- [ ] **Step 10.5: QA — responsive layout**

Resize the browser to a phone width (e.g. 375px). Verify:
- AI hero tiles stack vertically.
- Zone cards stack vertically (single column).
- All titles truncate at one line.

- [ ] **Step 10.6: QA — code hygiene**

Verify `teacher/page.tsx` is under 100 lines. Open the file or use any line-count tool:

```bash
cd c:/Users/shaun/campusly-frontend && node -e "console.log(require('fs').readFileSync('src/app/(dashboard)/teacher/page.tsx','utf8').split('\n').length)"
```

Expected: under 100 lines (well under the 350-line project rule).

Verify no banned imports/classes. Run via the project Grep tool (or your editor's search):

- Pattern: `apiClient` — Expected: zero matches in `src/app/(dashboard)/teacher/page.tsx` and `src/components/teacher-home/*.tsx`
- Pattern: `text-red-|bg-red-` — Expected: zero matches in the same files

If any match appears, fix it: API calls must go through `useTeacherDashboard`; reds must use `text-destructive` / `bg-destructive` design tokens.

- [ ] **Step 10.7: Final commit (if any QA touch-ups were needed)**

If you fixed anything during QA:

```bash
cd c:/Users/shaun/campusly-frontend
git add -A
git commit -m "fix(teacher-home): QA polish after manual verification"
```

If nothing needed fixing, skip this step.

---

## Spec coverage map

| Spec section | Implemented in task |
|---|---|
| Greeting strip | Task 9 (page.tsx) |
| AI Quick-Make hero (3 tiles) | Task 4 |
| Getting Started card (4 steps) | Task 5 |
| Today zone | Task 6 + Task 9 (hook data) |
| Grading zone (homework only) | Task 7 + Task 9 (hook data) |
| Drafts zone (lessons only) | Task 8 + Task 9 (hook data) |
| 3-item cap + "+N more" footer | Tasks 6, 7, 8 + Task 9 (slice) |
| Empty-state copy per zone | Tasks 6, 7, 8 |
| Backend `hasFirstContent` | Task 1 |
| Frontend `OnboardingStatus.hasFirstContent` | Task 2 |
| Hook refetch on tab focus, 30s debounce | Task 9 (hook) |
| Subject-name resolution for grading | Task 9 (hook subjectMap) |
| Cuts (banners, stat strip, Quick Actions, timetable, attendance, announcements) | Task 9 (page rewrite) |
| Mobile-first responsive | Tasks 4–8 + Task 9 (grid classes) |
| Acceptance criteria verification | Task 10 (manual QA) |
