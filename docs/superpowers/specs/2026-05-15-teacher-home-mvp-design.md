# Teacher Home Page — MVP Redesign

**Status:** Design approved, ready for implementation
**Date:** 2026-05-15
**Author:** Brainstormed with Shaun
**Related files:** [`src/app/(dashboard)/teacher/page.tsx`](src/app/(dashboard)/teacher/page.tsx), [`src/hooks/useTeacherDashboard.ts`](src/hooks/useTeacherDashboard.ts), [`src/hooks/useOnboardingStatus.ts`](src/hooks/useOnboardingStatus.ts), [`src/hooks/useTeachingScope.ts`](src/hooks/useTeachingScope.ts)
**Related specs:** [`2026-04-11-standalone-teacher-mvp-design.md`](docs/superpowers/specs/2026-04-11-standalone-teacher-mvp-design.md)

---

## Goal

Restructure the teacher home page (`/teacher`) so that, for the **standalone teacher MVP**, it does three things equally well — surface today's commitments, surface the grading queue, and put AI content creation front-and-centre — without the "buffet" feel of the current page.

The MVP audience is **individual / standalone teachers** (signed up alone, no school admin, no fixed timetable, no attendance taking). The school-teacher experience is out of scope for this redesign; the page may still render for school teachers but is not optimised for them.

## Context

The current teacher home page renders a stat strip, a quick-actions card, a timetable card, a pending-grading card, an announcements banner, and up to three onboarding/setup banners. For a standalone teacher this is a buffet — half the surface (timetable, attendance, announcements, "join your school") is irrelevant, and the AI creation features (the actual product wedge) are demoted to a generic quick-actions row.

## Scope

**In scope:**

- Full replacement of [`src/app/(dashboard)/teacher/page.tsx`](src/app/(dashboard)/teacher/page.tsx) for the standalone-teacher case.
- Reshape of [`src/hooks/useTeacherDashboard.ts`](src/hooks/useTeacherDashboard.ts) to provide the three new zone datasets.
- Three new presentational components (one per zone) plus a Getting Started checklist component and an AI hero component.

**Backend changes — strictly limited:**

- Extend `GET /auth/onboarding-status` to return one additional boolean: `hasFirstContent` (true if the teacher has at least one lesson, paper, or homework). No other backend changes.
- Papers in the grading queue requires a teacher-scoped "papers awaiting marking" endpoint that does not exist today; this is **deferred** to a follow-up. Grading zone is homework-only for MVP.

**Out of scope:**

- Student home page (`/student`) — explicitly deferred.
- Re-adding timetable, attendance, and announcements for school teachers. School teachers see the same new layout; school-specific surfaces remain accessible via their own modules in the sidebar but are not re-added to the home page.
- All backend changes other than the one `hasFirstContent` extension above.
- `AnnouncementBanner`, attendance, timetable, and "join your school" surfaces are removed from the home page but left in place elsewhere in the app.
- Visual / brand redesign. We're rethinking content and priorities, not aesthetics. Use existing design tokens, `Card`, `Button`, `StatCard`, and Tailwind utilities.
- Dedicated "view all today / view all grading / view all drafts" routes. The zones are home-page glances only; overflow surfaces via a muted "+N more" indicator.

## Design

### Page anatomy

Top-to-bottom, in order:

1. **Greeting strip** — name + date. No refresh button (the page refetches on tab focus). No banners directly here — onboarding banners are folded into the Getting Started card below.
2. **AI Quick-Make hero** — three large tiles: *Make a lesson · Make a paper · Set homework*.
3. **Getting Started card** — visible while any of four onboarding steps is incomplete. Auto-dismisses when all four are done.
4. **Three zones** — Today, Grading, Drafts. Visible only when at least one zone has ≥1 item. A brand-new teacher with no content sees no zones at all.

This is a two-layer page: creation (hero) → work (zones). The Getting Started card sits between them while needed.

### 1. AI Quick-Make hero

Three equal-width tiles in a single row on desktop (`grid-cols-1 sm:grid-cols-3`), stacked on mobile. Each tile is ~120px tall — deliberately larger than a button so it reads as a feature, not a shortcut.

| Tile | Sub-label | Links to |
|---|---|---|
| ✨ Make a lesson | Slides & explanations | `/teacher/lessons/new` |
| 📝 Make a paper | Test or exam with memo | `/teacher/papers/new` |
| 📋 Set homework | Practice tasks with auto-marking | `/teacher/homework/new` |

Styling matches the existing AI-promo treatment used on the student page (`bg-primary/5`, `border-primary/20`, hover lift). The "Set homework" route should be verified to exist for standalone teachers during implementation — if it doesn't, add it as part of this work (Next.js route page only, the wizard already exists).

The hero stays the same size for all users. No "shrink after first visit" pattern in MVP.

### 2. Getting Started checklist

Single `Card` rendered between the AI hero and the zones whenever **any** of the four steps below is incomplete. Auto-dismisses (does not render) once all four are checked.

| # | Step | Completion check | Action |
|---|------|------------------|--------|
| 1 | Set your teaching scope | `useTeachingScope().isEmpty === false` | Link to `/teacher/settings` |
| 2 | Create your first class | `onboardingStatus.hasClass` | Link to `/teacher/classes` (or the existing "new class" flow) |
| 3 | Make your first lesson, paper, or homework | `onboardingStatus.hasFirstContent` (new backend field) | No link — copy directs the user to the AI hero tiles above |
| 4 | Invite a student | `onboardingStatus.hasStudent` | Inline copy-to-clipboard for the teacher's join code (sourced from `useSchoolStore.school.joinCode` — the personal school's join code doubles as the class code for standalone teachers). Action button only renders once step 2 is done. |

Order matches the natural setup flow: scope → class → content → student.

**Visual state of each row:**
- Unchecked: empty circle icon, label in normal foreground colour, sub-label under it.
- Checked: filled check icon (primary colour), label in `text-muted-foreground`, no strikethrough.

`hasFramework` is ignored — for a standalone teacher's auto-created personal school, the framework is seeded on signup.

The checklist replaces all three existing onboarding banners (`isIndependent`, `showScopeBanner`, `isSetupIncomplete`). The "Operating independently? Join your school" banner is **removed entirely**, not folded in — it's noise for a standalone-first product.

### 3. The three zones

Each zone is a single `Card` with this structure:

- **Header:** total count + zone title (no "View all" link)
- **Body:** up to 3 items, formatted per zone (below)
- **Footer:** muted, non-clickable "+N more" text when `total > 3`. Omitted otherwise.
- **Empty state:** short copy, occasionally a low-key pointer

The card grid is `grid-cols-1 lg:grid-cols-3`, stacked on mobile and tablet.

There are no dedicated "view all" routes for these zones. The zones are home-page glances; discoverability of the full list is via the sidebar's existing modules (Homework, Papers, Lessons).

#### Today

Items with today's date attached. **Papers are excluded** — the `GeneratedPaper` model has no scheduled-for-date field today (only `createdAt`/`updatedAt`/`status`). Until the model gains one, this zone covers homework and lessons:
- Homework with `dueDate` today
- Lessons with `scheduledDate` today (if scheduling has been used)

Sort chronologically (earliest first). Row format: type icon · title (truncate) · subject · time-of-day. If the item has no time component (e.g. a lesson with only a `scheduledDate`), omit the time — the zone title "Today" carries the date context.

Empty state: *"Nothing due today. A good day to make something new ✨"*

Tap a row: navigate to the item's existing detail view (`/teacher/homework/:id`, `/teacher/papers/:id`, `/teacher/lessons/:id`).

#### Grading

Queue of **homework submissions** waiting for the teacher to mark — extending the existing `pendingHomework` shape. Papers are **deferred** from this zone for MVP because no teacher-scoped "papers awaiting marking" endpoint exists today and adding one is out of scope.

Sort by oldest unsubmitted-marking first (so the most-overdue grading floats up). Row format: title (truncate) · subject · `X/Y graded` outline badge.

The hook should also resolve a real subject name for each homework item (the current implementation has a TODO leaving `subjectName` as `''`). Fetch subjects once at the top and map by `subjectId`.

Empty state: *"All caught up. 🎉"* — no CTA.

Tap a row: navigate to the homework grading view (`/teacher/homework/:id`).

#### Drafts

The teacher's **unpublished lessons** — `Lesson` documents where `publishedAt` is `null`. Lessons are the only entity with a real draft state in the data model today; `Homework.status` is `'assigned' | 'closed'` (no draft) and `GeneratedPaper.status` is `'generating' | 'ready' | 'edited'` (no draft). So this zone is lesson-only in MVP. The zone title stays "Drafts" because the row icon makes the entity type self-evident.

Sort by `updatedAt` descending (resume the thing you just left). Row format: lesson icon · title (truncate) · *Edited 2h ago* (relative time).

Empty state: *"No drafts. Start a lesson above."* — explicit pointer back to the AI hero.

Tap a row: navigate to the lesson editor (`/teacher/lessons/:id`).

#### Cross-cutting rules

- Always at most 3 items per zone. No "View all" link.
- When `total > 3`, render a muted, non-clickable footer line: *"+N more"* (e.g. `+5 more`).
- Header count is the total, not the visible count: `Grading (5)` even when only 3 are shown.
- Single-line truncation on every title (`truncate`).
- Use design tokens — no `text-red-*` or hard-coded colours for badges.
- Skeleton: reuse `DashboardSkeleton`.

### 4. First-run / empty state

Day 0 (brand-new teacher, no scope set, no class, no content, no students):

```
Greeting → AI hero → Getting Started card (0 of 4)
```

No zones rendered.

Mid-state (scope set, class created, one lesson drafted, no students):

```
Greeting → AI hero → Getting Started card (3 of 4) → Drafts zone (the lesson)
```

Steady state (all four onboarding steps done):

```
Greeting → AI hero → Today / Grading / Drafts zones
```

The zones collectively appear once **any one** zone has content. Each zone individually shows its own empty state copy if it has zero items, but only when the section is visible at all.

### 5. Removed from current page

| Element | Decision | Reason |
|---|---|---|
| Refresh button in PageHeader | Cut | Refetch on tab focus is sufficient; no real-time collaboration |
| "Operating independently?" banner (`isIndependent`) | Cut | Standalone is the product, not the fallback |
| "Set up your teaching scope" banner | Folded into Getting Started step 1 |
| "Complete your teacher setup" banner (`!hasClass`) | Folded into Getting Started step 2 |
| 4-card stat strip | Cut | Counts now live in zone headers (`Grading (5)`) |
| Quick Actions card | Cut | AI hero replaces it |
| "Today's Classes" timetable card | Cut | No timetable for standalone teachers |
| "Pending Grading" card | Restructured into Grading zone (homework only; papers deferred) |
| `AnnouncementBanner` | Cut | No school broadcasting in standalone mode |
| Attendance Alerts card (`absentToday`) | Cut | No attendance for standalone teachers |

`AnnouncementBanner` and attendance-related imports are removed from `teacher/page.tsx` only — the components stay in the codebase for future reuse on a school-teacher home page.

## Data layer

### `useTeacherDashboard` — new shape

Before:

```ts
{ timetable, pendingHomework, absentToday, classCount, ungradedCount, loading, refreshing, refresh }
```

After:

```ts
{
  today: TodayItem[];        // capped at 3
  todayTotal: number;
  grading: GradingItem[];    // capped at 3
  gradingTotal: number;
  drafts: DraftItem[];       // capped at 3
  draftsTotal: number;
  loading: boolean;
}
```

Where:

```ts
type TodayItem =
  | { kind: 'homework'; id: string; title: string; subject: string; dueDate: string; }
  | { kind: 'lesson';   id: string; title: string; subject: string; scheduledDate: string; };
// Papers excluded — model has no scheduled-for-date field today.

type GradingItem = {
  kind: 'homework';   // papers deferred — MVP is homework only
  id: string;
  title: string;
  subject: string;    // resolved name, not empty string
  totalSubmissions: number;
  gradedCount: number;
  oldestSubmittedAt: string;
};

type DraftItem = {
  kind: 'lesson';   // MVP: only lessons have a draft state in the model
  id: string;
  title: string;
  updatedAt: string;
};
```

Data sources (composes existing endpoints; no new backend routes):

- **Today** — query homework and lessons for the current teacher filtered to today's date (local timezone — use the existing `toISODate` helper in [`src/lib/utils.ts`](src/lib/utils.ts) to avoid the UTC-shift bug noted in CLAUDE.md). Papers are excluded — no scheduled-for-date field exists on the model.
- **Grading** — homework with ungraded submissions (the existing N+1 pattern in the current hook can stay for MVP; resolve subject names by fetching subjects once and mapping by `subjectId`).
- **Drafts** — `Lesson` documents where `publishedAt` is `null`. Lesson-only because the other two entities (Homework, GeneratedPaper) lack a draft concept in the data model.

For each zone, return at most 3 items for display plus a total count for the header. Use the existing `apiClient` patterns and unwrap with `unwrapList()` from [`api-helpers.ts`](src/lib/api-helpers.ts).

**Refetch on tab focus:** add a `document.visibilitychange` listener in the hook that refetches when the document becomes visible. Debounce so the hook refetches at most once every 30 seconds.

`useTeachingScope` stays as-is. `useOnboardingStatus` keeps its current shape but its TypeScript interface gains one field, `hasFirstContent: boolean`, populated from the extended `GET /auth/onboarding-status` response.

## Component breakdown

New files (or extracted from `teacher/page.tsx`):

- [`src/components/teacher-home/AIQuickMakeHero.tsx`](src/components/teacher-home/AIQuickMakeHero.tsx) — three tiles
- [`src/components/teacher-home/GettingStartedCard.tsx`](src/components/teacher-home/GettingStartedCard.tsx) — checklist with dynamic state
- [`src/components/teacher-home/TodayZone.tsx`](src/components/teacher-home/TodayZone.tsx)
- [`src/components/teacher-home/GradingZone.tsx`](src/components/teacher-home/GradingZone.tsx)
- [`src/components/teacher-home/DraftsZone.tsx`](src/components/teacher-home/DraftsZone.tsx)

`teacher/page.tsx` becomes a thin composition — under 100 lines.

## Acceptance criteria

- A brand-new standalone teacher sees the greeting, AI hero, and Getting Started card (0/4) — and nothing else.
- After setting teaching scope, creating a class, and creating one lesson, the Getting Started card shows 3/4 and the Drafts zone appears with the new lesson.
- After a student joins, the Getting Started card disappears entirely.
- All zones cap at 3 items; when total > 3, a muted "+N more" footer appears. Header counts reflect totals.
- The page contains zero references to attendance, timetable, announcements, or "join your school".
- The page is under 350 lines (project rule) — extract zones to components.
- No `apiClient` imports in the page or zone components (project rule — API calls go through `useTeacherDashboard`).
- No `text-red-*` or hard-coded reds (project rule — use `text-destructive`).
- Mobile-first responsive: hero stacks vertically below `sm:`, zones stack below `lg:`.
- School teachers see the same new layout (no fallback branch). Their existing access to the timetable and attendance modules from the sidebar is preserved.
- Backend: `GET /auth/onboarding-status` returns a new boolean `hasFirstContent`, true when the teacher has at least one lesson, paper, or homework.
- The home page refetches its data when the browser tab regains focus (debounced to once per 30 seconds).
