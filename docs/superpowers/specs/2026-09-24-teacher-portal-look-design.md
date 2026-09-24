# Teacher portal: the night-back look — design spec

**Date:** 2026-09-24 · **Status:** approved in brainstorming, awaiting spec review
**Mockup:** [assets/2026-09-24-teacher-portal-look-mockup.html](assets/2026-09-24-teacher-portal-look-mockup.html) (option A is the chosen frame)

## 1. Summary

The teacher portal currently wears stock shadcn defaults: grey-only tokens with a near-black primary and grey charts, Inter everywhere, and 1,904 hardcoded Tailwind colour classes picked one component at a time. It works, but it reads as a template and doesn't match the `/teachers` ads that bring teachers in.

This project gives the teacher portal the "night-back" identity from the ads: midnight ink, violet for actions and AI, a calm "dawn" workspace, and monospace numerals for times, marks and counts. The identity is **scoped to the teacher portal**; other portals don't change. It also fixes the 403 that makes Today show fake zeros, and seeds demo data so the screens are judged with real-looking content.

This is sub-project 1 of a wider visual plan. Other portals, the home page and the remaining 67 teacher pages come later.

## 2. Goal and success criteria

**Goal.** A teacher going ad → sign-up → Today → make a paper → gradebook meets one deliberate product, not a template. The same should hold when a school sees it in a demo.

**Done means:**
- All 15 core pages (§9) pass the per-page checklist: token colours only, the new header, designed empty and loading states, monospace numbers, 44px touch targets on phones, and correct light and dark themes.
- Admin, parent and student dashboards look exactly as before, proven by before/after screenshots.
- Every text/background token pair meets WCAG AA (4.5:1) in both themes.
- Today and Marking make no 403 calls for a school without the Teacher Workbench module.
- The seeded demo school has a full timetable, marking, homework and messages, so no core page opens empty.

## 3. Decisions (made with Shaun, 2026-09-24)

| Decision | Choice | Rejected |
|---|---|---|
| Direction | Night-back identity (from `/teachers`) | New calm workspace look; tidying the neutral look |
| Rollout | Teacher portal only, via an opt-in scope | Change every portal at once |
| Approach | Foundation first, then page passes | Flagship pages first; codemod sweep first |
| Frame | **A: midnight sidebar** in light mode | B: all-light "dawn" frame |
| Workbench 403 | Respect the per-school module switch | Make marking core for every school (a pricing decision, parked) |
| Ctrl K search (in mockup) | Deferred; it's a feature, not styling | Build it in this project |

## 4. Scope

**In:**
- the teacher-scoped tokens and fonts
- the frame: sidebar, top bar, phone bottom nav
- shared components: `PageHeader`, `EmptyState`, `StatCard`, and a new `StatusChip`
- the 15 core pages (§9)
- the workbench gating fix
- demo seed data (backend)
- the raw-colour guard test
- screenshot QA

**Out:**
- other portals
- the home page and `/teachers` (they adopt the fonts later)
- raw-colour migration on the 67 non-core teacher pages; they still get the new tokens, fonts, frame and shared components automatically
- Ctrl K search
- workflow changes
- print layouts (they must stay unaffected)

## 5. Visual system

### 5.1 Tokens

These are the values under `[data-portal="teacher"]`. They override existing shadcn tokens where one exists (`--background`, `--primary`, `--sidebar-*`, …) and add semantic ones. Every text/background pair below was checked against AA; the two that failed in the mockup were fixed here (`--muted-foreground` and the sidebar label).

| Role | Light ("dawn") | Dark ("night") | Notes |
|---|---|---|---|
| `--background` | `#f5f6fb` | `#070912` | Page. |
| `--card`, `--popover` | `#ffffff` | `#0d1224` | Surfaces. |
| `--foreground` | `#0d1224` | `#eef0fa` | Ink. |
| `--muted-foreground` | `#62687f` | `#9aa0b8` | 5.11:1 on dawn (the mockup's `#6b7189` failed at 4.47). |
| `--border`, `--input` | `#e4e6f0` | `rgba(196,181,253,.12)` | Hairlines. |
| `--muted` / row divider | `#eef0f6` | `rgba(196,181,253,.07)` | |
| `--primary` | `#7c3aed` | `#7c3aed` | White text: 5.70:1. |
| `--primary-foreground` | `#ffffff` | `#ffffff` | |
| `--accent` (text) | `#6d28d9` | `#c4b5fd` | AI and "yours" accents; links. |
| `--accent-soft` | `#f1ecfe` | `rgba(167,139,250,.14)` | Washes behind AI chips and icons. |
| `--ring` | `#a78bfa` | `#a78bfa` | Focus. |
| `--success` / `-soft` / dot | `#047857` / `#e7f8f1` / `#10b981` | `#6ee7b7` / `rgba(52,211,153,.12)` / `#34d399` | Done, present, marked, taken. |
| `--attention` / `-soft` / dot | `#b45309` / `#fdf3e1` / `#f59e0b` | `#fcd34d` / `rgba(251,191,36,.12)` / `#fbbf24` | Due, late, overdue, missing. |
| `--destructive` / `-soft` / dot | `#be123c` / `#fdecef` / `#f43f5e` | `#fda4af` / `rgba(251,113,133,.12)` / `#fb7185` | Absent, failed, wrong. |
| `--info` / `-soft` / dot | `#0369a1` / `#e6f3fb` / `#0ea5e9` | `#7dd3fc` / `rgba(56,189,248,.12)` / `#38bdf8` | Excused, informational. |
| `--sidebar` | `#0d1224` | `#05060d` | Midnight frame in both themes. |
| `--sidebar-foreground` | `#aeb3cc` | `#aeb3cc` | 8.96:1. |
| `--sidebar-primary` (active text) | `#ffffff` | `#ffffff` | |
| `--sidebar-accent` (active bg) | `rgba(167,139,250,.14)` | same | |
| `--sidebar-ring` (active marker) | `#a78bfa` | `#a78bfa` | 3px bar at the left edge. |
| sidebar section label | `#8a90ab` | `#8a90ab` | 5.90:1 (the mockup's `#6b7189` failed at 3.85). |
| `--sidebar-border` | `rgba(196,181,253,.10)` | `rgba(196,181,253,.08)` | |
| `--chart-1..5` | `#7c3aed`, `#a78bfa`, `#10b981`, `#f59e0b`, `#0ea5e9` | same | |
| `--radius` | `0.5rem` | same | Cards use `rounded-xl` (12px); controls `rounded-lg` (8px). |

The new tokens are registered in `@theme inline` so utilities exist: `bg-success`, `bg-success-soft`, `text-attention`, `bg-info-soft`, `text-accent`, and so on.

### 5.2 One meaning per colour

| Colour | Means | Examples |
|---|---|---|
| Green (`success`) | Done / good | Present, register taken, marked, published, trend up |
| Amber (`attention`) | Needs you soon | Late, due today, overdue, no lesson yet |
| Red (`destructive`) | Wrong / absent | Absent, failed, delete, trend down |
| Blue (`info`) | Informational | Excused, neutral notices |
| Violet (`primary`/`accent`) | You, or AI | Primary actions, active nav, AI drafts and badges, "now" |
| Grey (`muted`) | Past / inactive | Done periods, drafts, zero counts |

No other hue is used for status. Decoration never uses a status colour.

### 5.3 Typography

| Face | Role | Weights |
|---|---|---|
| **Bricolage Grotesque** | Headings only: page title (h1), card and panel titles, the greeting, logo | 600, 700 |
| **Instrument Sans** | All UI and reading text | 400, 500, 600 |
| **JetBrains Mono** | Numbers and times: clock times, marks, percentages, counts, dates in eyebrows, section labels in the sidebar | 500 |

Scale: h1 32/1.05 (−0.025em); panel title 17px; body 14px; small 12.5px; eyebrow 11px mono uppercase with 0.1em tracking. Numbers use `tabular-nums`.

All three are loaded with `next/font/google` (latin subset, only the weights above, `display: swap`). They're applied only inside the teacher scope.

### 5.4 Shape and depth

- Cards and panels: 1px hairline border and 12px radius, with **no shadow**.
- Shadows are reserved for overlays (popovers, dialogs) and the primary button, which gets a soft violet glow.
- Controls are 8px radius and 40px tall, 44px minimum on phones.
- Focus is a 2px `--ring` outline with a 2px offset.

### 5.5 Signature: the "now" line

A violet hairline across the day's timeline, with the current time in a violet mono chip (e.g. `10:12`). It echoes the 9:47 clock in the ads.
- It appears on Today's "Your day" and on the Timetable.
- It updates once a minute.
- It shows only between the start of the day's first period and the end of its last one. It's hidden before and after, and on days with no periods.
- With `prefers-reduced-motion`, it updates without animating its position.

## 6. Architecture

### 6.1 The scope

- `src/app/(dashboard)/layout.tsx` sets `data-portal="teacher"` on its root `div` when `user.role === 'teacher'`. That covers standalone teachers and HODs too.
- Nothing is set for any other role, so their tokens resolve to today's `:root` and `.dark` values.
- `html` and `body` compute `font-family`, `background` and `color` once, from the unscoped tokens, and children inherit those computed values. So the scoped wrapper must set its own `font-sans bg-background text-foreground`, replacing today's `bg-muted/30` for teachers only. Otherwise the scope changes utility classes but not inherited text.
- Portalled overlays (dialogs, popovers, selects and toasts render outside the wrapper, under `body`) need the scope too. The layout mirrors the attribute onto `document.body` while a teacher is signed in and removes it on unmount or logout. The selectors are `[data-portal="teacher"]` and `.dark [data-portal="teacher"]`, so they match either placement.

### 6.2 `globals.css`

- Add `[data-portal="teacher"] { … }` for light values.
- Add `.dark [data-portal="teacher"] { … }` for dark values.
- Register the new tokens in `@theme inline`: `--color-success`, `--color-success-soft`, `--color-attention`, `--color-attention-soft`, `--color-info`, `--color-info-soft`, `--color-accent-soft`, and a `--color-sidebar-label`.
- Existing `:root` and `.dark` blocks are unchanged.

### 6.3 Fonts

- A `src/lib/fonts/teacher-fonts.ts` module creates the three `next/font` instances with CSS variables: `--font-display`, `--font-ui` and `--font-numeric`.
- The dashboard layout adds their `variable` classes only when the scope is on: on its wrapper and, like the `data-portal` attribute (§6.1), mirrored onto `document.body` so portalled overlays get the fonts too.
- Inside the scope, `--font-sans` maps to `--font-ui`, `--font-heading` to `--font-display`, and `--font-mono` to `--font-numeric`.
- Tailwind utilities: `font-heading` and `font-mono` (already registered), plus `tabular-nums`.

### 6.4 Frame

**Sidebar (`components/layout/Sidebar.tsx`)**
- **Midnight in both themes**, entirely through `--sidebar-*` tokens.
- **Sections:** `NavItem` gains an optional `section?: string`. The Sidebar renders a mono uppercase label whenever the section changes. `TEACHER_NAV` is regrouped into the six sections approved in the [programme plan §3](2026-09-24-teacher-portal-programme.md). Items stay flat under each section label; nested flyouts go away.
  - **Today:** Today
  - **Teach:** Courses, Lessons, Library, Live classes
  - **Assess:** Test papers, Homework & assignments, Marking, Gradebook
  - **Class:** Classes, Attendance, Timetable, Behaviour
  - **Talk:** Messages, Announcements, Parent meetings
  - **Me:** Leave, Substitutes, Policies, Settings, plus role items (HOD oversight, Pastoral caseload)
- **Where the items point.** Until phases 2–5 build the merged screens, items point at today's pages. For example:
  - Library → `curriculum/content`
  - Behaviour → `discipline`
  - Parent meetings → `meetings`

  Module and permission gates are kept per item.
- `STANDALONE_TEACHER_NAV` uses the same sections for the items it has: Today; Teach; Assess; Class (Classes); Me (Billing, Settings).
- **AI marker:** `badge: 'AI'` renders a small violet sparkle icon (with an `aria-label` of "AI") instead of the black pill.
- **Live counts:** `NavItem` gains an optional `countKey?: 'marking' | 'messages'`. A new `useTeacherNavCounts` hook fetches the counts on mount and every 5 minutes:
  - marking pending count, only when the workbench module is on
  - unread messages, school teachers only

  A count only shows when it's above 0. Failed fetches show no badge and are logged with `console.warn`.
- **Me card:** avatar, name and school name pinned to the bottom.
- The collapsed rail keeps icons, the active marker and count dots.
- Other roles render exactly as today: no sections, and the pill badge.

**Top bar (`TopBar.tsx`).** In the teacher scope, the role label ("Teacher") is replaced by the current page's section and title ("Mark · Gradebook"), derived from the nav config. Other roles are unchanged.

**Bottom nav (phones).**
- Tabs: Today, Teach, Assess, Class and More. More covers Talk and Me.
- Each section tab opens a sheet listing that section's items, so nothing nested is unreachable. That fixes the current bug where `children` never render on phones.
- Active item in violet, and a count dot for Marking.

### 6.5 Shared components

All changes are additive and backwards compatible; existing call sites keep working.

- **`PageHeader`:**
  - New optional `eyebrow?: string` (mono context line, e.g. `THU 24 SEP · TERM 3 · WEEK 9` or `GRADE 1 A · ENGLISH`).
  - The title uses `font-heading`.
  - Actions stay right-aligned on desktop and stack under the title on phones.
  - Used on 62 teacher pages, so every one of them gets the new header.
- **`EmptyState`:**
  - Restyled: soft accent icon tile and heading-font title.
  - For the 15 core pages, `action` is required by convention: every empty state offers the next step (e.g. "Make a lesson").
- **`StatCard`:**
  - Mono value, and `icon` becomes optional.
  - New `tone?: 'default' | 'attention' | 'success'` gives attention an amber border and value.
  - The hardcoded `text-emerald-600` on trends moves to `text-success`.
- **`StatusChip` (new, `components/shared/StatusChip.tsx`):**
  - `status` is one of `present`, `absent`, `late`, `excused`, `done`, `marked`, `pending`, `overdue`, `due`, `draft`, `published` or `ai`.
  - Each status maps to one colour role from §5.2, a dot and a default label; the label can be overridden.
  - The mapping lives in `src/lib/status-chip.ts` as a pure function so it can be unit tested.

### 6.6 Raw-colour guard

`tests/teacher-colour-guard.test.ts` holds a list of **migrated** files and fails if any of them contains a raw Tailwind palette class, for example:

```
(bg|text|border|ring|from|to|via|fill|stroke)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}
```

A file joins the list when its page is migrated, so the list only grows.

## 7. The Teacher Workbench 403

**Cause.** `/api/teacher-workbench/*` sits behind `requireModule('teacher_workbench')`, a per-school switch that new sign-ups get by default. The seeded Greenfield school doesn't have it, yet:
- the Marking nav item has no `module` gate
- `useTeacherToday` calls `/teacher-workbench/marking-hub/pending` unconditionally

So the page shows fake zeros.

**Fix (frontend only):**
- The Marking nav item gets `module: 'teacher_workbench'`, both in `TEACHER_NAV` and in the standalone nav, even though standalone teachers always have it.
- `useTeacherToday` skips the marking call when the module is off. Needs-you then drops the marking row instead of showing 0. It reads the module list from the same school store the layout uses.
- A new `src/app/(dashboard)/teacher/workbench/layout.tsx` gates every `/teacher/workbench/*` route (marking hub, planner, papers builder, question bank, student 360, …). When the module is off, it renders a designed state instead of the page, so no workbench API is called and no error toast appears. The copy: "Teacher Workbench isn't switched on for your school. Ask your school admin to turn it on."

Tests cover the gating logic as a pure function (`isWorkbenchEnabled(modules)` and the Needs-you row list).

## 8. Demo data (backend seed)

`src/scripts/seed.ts` gains an idempotent "teacher demo" step for Greenfield Primary. Re-running it must not duplicate anything. For Thandi Molefe it adds:
- `teacher_workbench` in the school's `modulesEnabled`
- a **Monday–Friday timetable**: 4–5 periods a day across her three classes, register period first, so Today is never empty on a school day
- **Lessons:** 3 across her subjects, at least one on today's periods, and one period with no lesson so "No lesson yet" shows
- **Papers:** 2, one ready and one draft
- **Marking:** 14 submissions, 3 of them overdue
- **Homework:** 2 items due today
- **Messages:** 3 unread

Seed dates are relative to "now", so the demo stays current.

## 9. Pages and order

Each page gets this checklist:
- `PageHeader` with a real eyebrow
- semantic tokens and `StatusChip` instead of raw colours
- a designed empty state with an action, and a skeleton or spinner while loading
- mono numbers
- 44px targets on phones
- no horizontal scroll at 390px
- light and dark both checked
- the file added to the colour-guard list

| # | Page | Route | Page-specific work |
|---|---|---|---|
| 1 | Today | `/teacher` | Timeline with the now line; Needs-you rows lead with counts and zero rows go quiet ("All taken"); Make-with-AI row; the lede names the next period ("Next up: Grade R Life Skills at 10:45") |
| 2 | Test papers | `/teacher/papers` | Status chips for draft and ready |
| 3 | New paper wizard | `/teacher/papers/new` | Wizard stepper in violet; phase chips in accent; the free-allowance banner uses accent tokens |
| 4 | Gradebook | `/teacher/grades` | Mono marks, trend arrows in success and destructive, weighting warnings in attention (not red) |
| 5 | Marking | `/teacher/workbench/marking-hub` | `StatCard` tones (overdue > 0 is attention); fix its extra page padding to match other pages |
| 6 | Attendance | `/teacher/attendance` | `StatusChip` statuses; **labelled** status buttons on phones (not icon-only) |
| 7 | Lessons | `/teacher/lessons` | List and calendar views; empty state leads to "Make a lesson" |
| 8 | Timetable | `/teacher/timetable` | Mono times; now line on today's column |
| 9 | Classes | `/teacher/classes` | Chips via tokens; homeroom badge in accent |
| 10 | Students | `/teacher/students` | |
| 11 | Homework | `/teacher/homework` | Due and overdue chips |
| 12 | Assignments | `/teacher/assignments` | |
| 13 | Messages | `/teacher/messages` | Unread state in accent |
| 14 | Reports | `/teacher/reports` | Charts use `--chart-*` |
| 15 | Term planner | `/teacher/workbench/planner` | |

## 10. Testing and QA

- **Unit tests (vitest, `tests/`):**
  - nav section grouping and count-badge visibility
  - `StatusChip` mapping
  - "now" line position and visibility
  - workbench gating and the Needs-you row list
  - the colour guard
  - TDD throughout: test first, watch it fail
- **Screenshot tour (Playwright, headless):**
  - all 15 pages at 390px and 1440px, light and dark, before and after
  - admin, parent and student dashboards before and after, which must be identical
  - images go into each PR description
- **Accessibility:**
  - automated contrast check of every token pair in §5.1 (a unit test over the token table)
  - keyboard focus visible on nav, buttons, chips and inputs
  - 44px targets on phones
  - reduced motion for the now line
- **Standard gates:** `vitest`, `tsc --noEmit`, `eslint` on changed files, files ≤ 350 lines, the Vercel preview build passing.

## 11. Delivery

| Phase | PR(s) | Contents |
|---|---|---|
| 1 | backend + frontend | Seed demo data (backend); workbench gating (frontend). **Delivered as part of programme phase 0 ("Fix what's broken").** |
| 2 | frontend | Tokens, fonts, scope, frame (sidebar sections, counts, me card, top bar, bottom nav), shared components, `StatusChip`, colour guard, contrast test |
| 3a | frontend | Today, Test papers, Gradebook, Marking |
| 3b | frontend | Attendance, Lessons, Timetable, Classes, Students |
| 3c | frontend | Homework, Assignments, Messages, Reports, Term planner, Settings |

Each PR merges after its checks and the Vercel build pass, with GitHub tamper checks before every push.

## 12. Risks

- **Components with hardcoded colours outside the 15 pages** will look inconsistent in dark mode until migrated. That's accepted for this project; the frame and shared components still carry the look.
- **Recharts** colours are often passed as props. Pages in scope read `--chart-*` through `var()`.
- **Font weight:** three families add roughly 60–90 kB. They're limited to the weights listed, latin subset, and loaded only for teachers.
- **base-ui primitives** (`Select`, `Dialog`, `Tabs`) must be checked under the scope. Their styles come from tokens, but each gets a screenshot.
- **Print routes** (`/teacher/students/[id]/credentials/print`) must print the same as before.
