# Teacher Home — Visual Polish

**Status:** Design approved, ready for implementation
**Date:** 2026-05-17
**Author:** Brainstormed with Shaun
**Related files:**
- [`src/app/(dashboard)/teacher/page.tsx`](src/app/(dashboard)/teacher/page.tsx)
- [`src/components/teacher-home/AIQuickMakeHero.tsx`](src/components/teacher-home/AIQuickMakeHero.tsx)
- [`src/components/teacher-home/GettingStartedCard.tsx`](src/components/teacher-home/GettingStartedCard.tsx)
- [`src/components/teacher-home/TodayZone.tsx`](src/components/teacher-home/TodayZone.tsx)
- [`src/components/teacher-home/GradingZone.tsx`](src/components/teacher-home/GradingZone.tsx)
- [`src/components/teacher-home/DraftsZone.tsx`](src/components/teacher-home/DraftsZone.tsx)

**Related specs:** [`2026-05-15-teacher-home-mvp-design.md`](docs/superpowers/specs/2026-05-15-teacher-home-mvp-design.md) — the original content/priorities redesign that this spec builds on visually.

---

## Goal

Lift the teacher home page from "functional MVP" to "premium daily-driver dashboard" — without changing what's on the page or adding new information. Visual polish only: typography, surface, spacing, motion. Restraint and craft, not maximalism.

## Context

The original [`2026-05-15-teacher-home-mvp-design.md`](docs/superpowers/specs/2026-05-15-teacher-home-mvp-design.md) explicitly cut visual / brand work to ship content-first: *"We're rethinking content and priorities, not aesthetics. Use existing design tokens."* That decision was correct at the time. The result is functional but flat — utilities and default Tailwind sizes throughout, no surface depth, no character. This spec adds the aesthetic layer that was deliberately deferred.

## Character

**Clean dashboard, low fatigue, no extra info.** Linear-style restraint, not Notion-style warmth. No illustrations, no gradients, no scroll-triggered reveals, no count-up animations. Premium feel comes from typography hierarchy, surface depth, generous spacing, and one short choreography moment on first load.

## Scope

**In scope:**

- Page-level foundation: background, typography scale, surface treatment, spacing rhythm on `/teacher` only.
- AI Quick-Make hero: bigger tiles, layered shadow, icon plate, right-chevron, hover lift.
- Greeting: time-aware salutation, larger headline.
- Zone cards: header chip for counts, divided rows (no per-row border), softer hover state, tablet grid.
- Empty states: faded Lucide icon + existing copy, vertical centering.
- First-load animation: staggered fade + slide-in over ~640ms total (last element settles at ~640ms; first content visible at 0ms). `prefers-reduced-motion` respected.

**Out of scope:**

- Any content change. The page shows the same things in the same order: greeting → AI hero → Getting Started → 3 zones.
- New components or new data sources.
- Hook changes — `useTeacherDashboard`, `useOnboardingStatus`, `useTeachingScope` untouched.
- Backend changes.
- Dark-mode treatment beyond what the existing tokens already do — both themes get the same polish via design tokens.
- Mobile-specific layout reflow beyond the existing `grid-cols-1 lg:grid-cols-3` (with one tweak — see Zone cards).
- The `/student` home or any other route. Visual upgrades to those pages get their own specs.

## Design

### 1. Page foundation

The page-level affordances that everything else inherits.

- **Background:** the dashboard layout shell currently sets `bg-muted/30` on the layout's `<main>`. Override on the teacher home only — apply the fade directly to the `teacher/page.tsx` root wrapper as a non-repeating gradient sized to 200px:

  ```tsx
  <div className="bg-background bg-gradient-to-b from-muted/40 to-background bg-no-repeat bg-[length:100%_200px] dark:from-background space-y-8">
    {/* page content */}
  </div>
  ```

  Light mode: the gradient fades from `muted/40` (a design token, faint warm-grey) down to `background` over the first 200px, then the rest of the page is flat `background`. Dark mode: `dark:from-background` collapses the gradient to flat (no atmosphere — dark backgrounds already feel atmospheric on their own). No JS, no fixed-height wrapper above content, no pseudo-element.
- **Typography scale lift:**
  - Greeting headline: `text-2xl font-bold` → `text-3xl font-semibold tracking-tight text-foreground`.
  - Card titles (zone headers, Getting Started): `text-lg` → `text-base font-medium`.
  - Body text stays at `text-sm`.
  - Sub-labels stay at `text-xs text-muted-foreground`.
- **Surface treatment:** cards across the page swap their default border styling for `border border-border/60 bg-card shadow-sm` — softer border, layered shadow. The current 1px-flat-border look is replaced by a sense of cards as objects with depth.
- **Spacing rhythm:** the page-root vertical stack goes from `space-y-6` to `space-y-8`. Slight increase — no new content, more breathing.

### 2. AI Quick-Make hero

The visual centerpiece. Three tiles, monochrome, subtle depth.

**Each tile:**

- **Size:** `min-h-[140px]` (was `min-h-30` / 120px). Bigger, more deliberate.
- **Surface:** `bg-card border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]`. Drops the previous `bg-primary/5 border-primary/20` tint. Reads as a serious feature, not a coloured CTA.
- **Layout:** flex-col with `p-6` padding. Top of card: icon plate. Bottom of card: label + sub-label, with a right-chevron pinned to the right edge of the label row.
- **Icon plate:** a 48×48 `rounded-xl bg-muted/60` square containing a 32px icon (`size-8 text-foreground`). The plate gives the icon presence without a coloured tint.
- **Right chevron:** `ChevronRight` (Lucide) at `h-4 w-4 text-muted-foreground` pinned right-side of the label row, with `transition-transform duration-200 group-hover:translate-x-1`.
- **Label row:** `text-base font-semibold text-foreground` for the label; `text-xs text-muted-foreground` for the sub-label.

**Hover:**

```
group hover:-translate-y-0.5
group hover:shadow-md
group hover:border-border/80
```

Transition: `transition-all duration-200 ease-out`. The chevron slides 4px right in the same beat.

**No coloured gradients, no accent per tile.** All three tiles share the same monochrome surface. Distinction comes from the icon + label, not the colour.

**Icons (unchanged from MVP):** `Sparkles` for lesson, `FileText` for paper, `ClipboardList` for homework.

### 3. Greeting strip

```
Good evening, Shaun
Sunday, 17 May
```

- **Salutation:** `Good morning, ` (hours 0–11) / `Good afternoon, ` (12–16) / `Good evening, ` (17–23). Computed at render time from `new Date()`. First name from `useAuthStore().user.firstName`, fallback `Teacher`.
- **Headline:** `<h1 className="text-3xl font-semibold tracking-tight">{salutation}{firstName}</h1>`. Replaces the current `PageHeader` title binding.
- **Date line:** `<p className="text-sm text-muted-foreground mt-1">{dateLabel}</p>`. Format unchanged — `Sunday, 17 May` via `toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })`.
- **Right side:** empty. No avatar, no widget, no settings link. The greeting is a left-aligned wordmark.
- **Replacing PageHeader:** the current code uses the shared `PageHeader` component. On the teacher home, replace it with an inline `<header>` block carrying the larger typography directly. PageHeader stays as-is for the rest of the app.

  Concrete JSX to drop into `teacher/page.tsx` where `<PageHeader …>` currently sits:

  ```tsx
  <header>
    <h1 className="text-3xl font-semibold tracking-tight">
      {salutation}{firstName}
    </h1>
    <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
  </header>
  ```

  Where `salutation` is computed from the local hour (`Good morning, ` / `Good afternoon, ` / `Good evening, `) and `dateLabel` is the same `toLocaleDateString('en-ZA', …)` call already in the file. `firstName` from `useAuthStore().user.firstName` with `'Teacher'` fallback.

### 4. Zone cards (Today / Grading / Drafts)

**Header:**

- Title `text-base font-semibold` (was `text-lg`).
- Count moved out of the parenthetical into a chip: `<span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{total}</span>`. Replaces the `({total})` after the title.
- "View all" text — none of the zones currently render a "View all" link (per the MVP spec) and that stays.

**Rows:**

- Card content uses `divide-y divide-border/40` instead of each row having its own `border` class. Visual rhythm tightens.
- Row padding: `p-3` (was `p-2.5`).
- Row hover: `hover:bg-muted/40` (was `/50`) with an inset 2px left highlight on hover (`hover:border-l-2 hover:border-l-foreground/20 hover:pl-[10px]`). The padding adjustment keeps the row width stable.
- Title `text-sm font-medium` with `truncate`.
- Subject / meta `text-xs text-muted-foreground` with `truncate`.
- Right-side timestamp / badge unchanged.
- The "+N more" footer line gets the same chip treatment when present: `<p className="pt-2 text-xs text-muted-foreground">+ {N} more</p>` becomes `<span className="inline-flex h-5 items-center rounded-full bg-muted/60 px-2 text-xs text-muted-foreground">+ {N} more</span>` placed flush right.

**Grid:**

- Stays `grid-cols-1 lg:grid-cols-3` at the extremes.
- Add `md:grid-cols-2` so tablets get two columns; the third zone wraps to the second row.
- Gap widens: `gap-4` → `gap-6`.

### 5. Empty states

Each zone's empty state currently renders a single sentence in the card body. Upgrade to a small vertically-centered block:

```
        ◌  (32px Lucide icon, text-muted-foreground/60)

        {existing copy}
```

- Container: `<div className="flex flex-col items-center justify-center gap-3 py-8">`.
- Icon: 32px Lucide, `text-muted-foreground/60`. One per zone:
  - Today → `CalendarCheck`
  - Grading → `CheckCircle2`
  - Drafts → `PenLine`
- Copy: unchanged from the MVP spec — keeps the warmth and the emoji flourishes.
  - Today: *"Nothing due today. A good day to make something new ✨"*
  - Grading: *"All caught up. 🎉"*
  - Drafts: *"No drafts. Start a lesson above."*
- Card body min-height: rely on natural content height. The icon + copy + py-8 produces enough vertical presence that all three zone cards align in height when at least one zone has content.

### 6. First-load motion

CSS-only stagger using Tailwind's `animate-in` utilities (`tailwindcss-animate`, already in project). Choreography:

| Element | Delay | Animation |
|---|---|---|
| Greeting | 0ms | `animate-in fade-in duration-300` |
| AI hero | 80ms | `animate-in fade-in slide-in-from-bottom-1 duration-300 delay-[80ms]` |
| Getting Started card | 160ms | `animate-in fade-in slide-in-from-bottom-1 duration-300 delay-[160ms]` |
| Today zone | 240ms | `animate-in fade-in slide-in-from-bottom-1.5 duration-300 delay-[240ms]` |
| Grading zone | 290ms | `animate-in fade-in slide-in-from-bottom-1.5 duration-300 delay-[290ms]` |
| Drafts zone | 340ms | `animate-in fade-in slide-in-from-bottom-1.5 duration-300 delay-[340ms]` |

Total: ~640ms end-to-end; first content visible at 0ms; last element settled at ~640ms. Page is interactive throughout.

- All animation utilities prefixed `motion-safe:` so users with reduced-motion get instant render.
- **Triggered once per mount only.** Tab switches (`useTeacherDashboard` refetching, page focus events) do NOT replay the animation — animation classes apply on initial render via the React tree.
- **No count-up animation.** Zone count chips render at their final value immediately. The page settles, then is static.

**Hover-state animation budget (always-on, not first-load):**

- Buttons / links: 150ms ease-out for colour + bg changes.
- AI hero tiles: 200ms ease-out for translateY + shadow + chevron slide.
- Zone rows: 100ms ease-out for hover bg + left-border highlight.

## Acceptance criteria

- Greeting headline reads "Good morning/afternoon/evening, {firstName}" based on local hour at render. Verified at 23:00 local time (evening) and 09:00 local time (morning).
- Greeting uses `text-3xl font-semibold` (visibly larger than before).
- Page background on `/teacher` has a faint top-edge fade in light mode; dark mode stays flat `bg-background`.
- AI hero tiles are 140px tall, monochrome, have a layered shadow, icon plate, and a right-chevron that slides 4px on hover.
- Zone count appears as a chip after the title, not in parentheses.
- Zone rows use `divide-y` rather than per-row borders; hover state shows a 2px left highlight.
- Tablet view (`md` breakpoint) shows zones as 2 columns with the third wrapping below.
- Empty states show a 32px faded Lucide icon centred above the existing copy.
- First-load animation completes within ~640ms; respects `prefers-reduced-motion`.
- No count-up animation on zone count chips.
- No content was added or removed — the page footprint is the same as `2026-05-15-teacher-home-mvp-design.md` shipped.
- All touched files remain under the project's 350-line cap.
- No `apiClient` newly added to components, no `text-red-*` / `bg-red-*`, no `: any`. Project rules.

## Files touched (no new files, no deleted files)

- [`src/app/(dashboard)/teacher/page.tsx`](src/app/(dashboard)/teacher/page.tsx) — replace `PageHeader` with inline greeting block; update root wrapper background + spacing; add animation utilities to each section.
- [`src/components/teacher-home/AIQuickMakeHero.tsx`](src/components/teacher-home/AIQuickMakeHero.tsx) — full visual rework of the tile rendering.
- [`src/components/teacher-home/GettingStartedCard.tsx`](src/components/teacher-home/GettingStartedCard.tsx) — surface + typography refinements only; behaviour unchanged.
- [`src/components/teacher-home/TodayZone.tsx`](src/components/teacher-home/TodayZone.tsx) — chip count, divide-y rows, hover treatment, empty-state icon.
- [`src/components/teacher-home/GradingZone.tsx`](src/components/teacher-home/GradingZone.tsx) — same treatment as TodayZone.
- [`src/components/teacher-home/DraftsZone.tsx`](src/components/teacher-home/DraftsZone.tsx) — same treatment as TodayZone.

Hooks and data flow are not touched. The visual upgrade is entirely in the presentation layer.

## Coverage map

| Spec section | Implemented in |
|---|---|
| Page background + top-edge fade | `teacher/page.tsx` root wrapper |
| Typography scale lift | `teacher/page.tsx` + each zone component |
| Surface treatment (shadow, border) | All card-rendering components |
| Spacing rhythm | `teacher/page.tsx` |
| AI hero tile rework | `AIQuickMakeHero.tsx` |
| Time-aware greeting | `teacher/page.tsx` |
| Zone header chip + row treatment | `TodayZone.tsx`, `GradingZone.tsx`, `DraftsZone.tsx` |
| Tablet 2-column grid | `teacher/page.tsx` grid classes |
| Empty-state icon + centering | `TodayZone.tsx`, `GradingZone.tsx`, `DraftsZone.tsx` |
| First-load motion | `teacher/page.tsx` (animation utility classes per child) |
| `prefers-reduced-motion` safety | `motion-safe:` prefix on all animation classes |
