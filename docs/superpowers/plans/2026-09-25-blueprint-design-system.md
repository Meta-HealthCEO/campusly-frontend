# Blueprint Design System (Phase D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every Campusly portal the Blueprint look (one token set for light and dark, Hanken Grotesk and Source Sans 3, the rebuilt shell, restyled base and shared components, new readiness components, a dev-only `/design` gallery) and remove hardcoded palette classes from every surface a standalone teacher, a learner joining one, or a new sign-up can reach, without changing behaviour.

**Architecture:** Tokens live once in `src/app/globals.css` (`:root` and `.dark`), mapped into Tailwind 4 through the existing `@theme inline` block, so the shadcn class names keep working and the teacher-only portal scope goes away. Logic that screens need (mastery levels, exam-map layout, countdown, readiness band, chart colours, active nav, phone tabs) lives in small pure modules under `src/lib/**`, test-first with vitest; components only compose them. A machine gate (vitest scanners over a generated import closure, a Playwright width, label and request-set sweep, type-check, build) runs before any human review.

**Tech Stack:** Next.js 16.2.1 (App Router, `next/font/google`), React 19.2, Tailwind CSS 4 (`@theme inline`, `@custom-variant`), base-ui + shadcn components, class-variance-authority, next-themes 0.4, Recharts 3, lucide-react, vitest 2 (node env), Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-25-blueprint-design-system-design.md` (Phase D of `docs/superpowers/specs/2026-09-25-readiness-programme.md`). Approved mockup: direction C in `C:\Users\shaun\AppData\Local\Temp\claude\C--dev-campusly\2e66a1db-cc40-41f7-bcc7-6d51c7f0aaf6\scratchpad\campusly-look\campusly-look-directions.html` (live copy: https://claude.ai/artifact/PfhJ913v1umQS812NMpjR1).

## Global Constraints

- One token set for every portal, in `src/app/globals.css`, mapped through `@theme inline`; "shadcn-style class names (`bg-background`, `text-muted-foreground`, `bg-primary`…) keep working"; "the `teacher` custom variant and portal-scoped tokens are removed".
- Light values (spec §2.1): `--background #F3F5FA`, `--card`/`--popover #FFFFFF`, `--foreground #0B1B33`, `--muted #EEF1F7`, `--muted-foreground #5B6B82`, `--border #E2E7F0`, `--primary #1554F0`, `--primary-foreground #FFFFFF`, `--accent #EAF0FE`, `--accent-foreground #1554F0`, `--ring #1554F0`, `--secure #E3F4F1` / `--secure-strong #137A6B`, `--building #FCF1DC` / `--building-strong #8A5A00`, `--chart-1 #1554F0`, `--chart-2 #137A6B`, `--chart-5 #7A8BA6`. Amended by ruling R6: `--input #7F8DA3`, `--destructive #B5392A`, `--weak #FCE8E5` / `--weak-strong #B5392A`, `--chart-3 #B07515`, `--chart-4 #B5392A`.
- Dark values (spec §2.2): `--background #0A1222`, `--card`/`--popover #111B2E`, `--foreground #E8EEF8`, `--muted #16233A`, `--muted-foreground #9AA8BF`, `--border #22314A`, `--primary #6B95FF`, `--primary-foreground #08142B`, `--accent #16264A`, `--accent-foreground #9DB9FF`, `--ring #6B95FF`, `--destructive #F07F6E`, `--secure #0F2F2B` / `--secure-strong #3CC3AE`, `--building #33270F` / `--building-strong #F2BE5C`, `--weak #3A1C18` / `--weak-strong #F07F6E`, `--chart-1…5 #6B95FF, #3CC3AE, #F2BE5C, #F07F6E, #9AA8BF`. Amended by R6: `--input #5A6B88`.
- "Mastery thresholds are one helper (`masteryLevel(pct)` → `'secure' | 'building' | 'weak'`), never re-typed per screen": secure ≥ 70%, building 60–69%, weak < 60%.
- "Exam-map tiles use the `-strong` colours with white text (≥ 4.5:1); `building` tiles use `--building` fill with `--building-strong` text"; "In dark, exam-map tiles use the soft fill with the `-strong` colour as text" (as `--tile-*` tokens, ruling R7).
- "Every text/background pair used by a component meets WCAG AA (4.5:1 body, 3:1 large text and UI edges) in both themes — checked by a test over the token table."
- Type: "**Hanken Grotesk** (600, 700) — headings, numbers (`font-variant-numeric: tabular-nums` …). **Source Sans 3** (400, 500, 600) — body and UI. Loaded with `next/font/google` (self-hosted by Next, `display: swap`), replacing Inter and the night-back fonts."
- Scale (px / line-height): 12/16 caption · 13/18 small · 15/22 body · 17/24 h3 · 20/26 h2 · 24/30 h1 (phone) · 30/36 h1 (desktop) · 36/40 display (one per screen). Headings `text-wrap: balance`, letter-spacing −0.015 to −0.025em; uppercase eyebrows 11.5px, +0.09em.
- Radius: 10px controls, 16px cards and dialogs, 999px pills. Depth: cards = 1px border + `0 1px 2px rgb(11 27 51 / .04)`; popovers/dialogs = `0 12px 32px -12px rgb(11 27 51 / .25)`; no resting shadows elsewhere.
- Motion: 150ms (hover, press), 250ms (panels, sheets), `cubic-bezier(.2,.8,.2,1)`; none under `prefers-reduced-motion`.
- "Touch targets ≥ 44px on phones (`min-h-11`); visible focus ring on every interactive element" (2px ring, 2px offset).
- Shell: desktop ≥ 1024px sidebar 232px on the card surface, content column max 1200px, 32px gutters; tablet 768–1023px icon rail 56px; phone < 768px top bar + bottom tab bar + "More" sheet, safe-area insets, 16px gutters, "nothing scrolls sideways". Banners sit under the top bar in a quiet `accent` strip. "nav *contents* (which items each role sees) are unchanged here."
- `/design` is dev-only: "404 when `NODE_ENV === 'production'`".
- Machine gate (spec §7): zero palette classes in in-scope files, no inline colour literals in components; every token pair ≥ AA in both themes; no horizontal scroll at 320, 375, 768, 1024, 1280, 1440 on in-scope routes; every form control labelled, every icon-only button named, focus ring visible; new files ≤ 300 lines, no touched file above 350; unit tests, type-check, `next build` and the existing e2e walkthrough green; the request set of each in-scope page unchanged.
- Sweep batches change class strings and tokens only: no logic edits, no request changes, no copy changes.
- Project rules (CLAUDE.md): no `any`; `import type`; `catch (err: unknown)`; no `apiClient` in pages or components; mobile-first breakpoints; `w-full sm:w-40` for fixed widths.
- Vitest tests live in `tests/**/*.test.ts`, node environment, pure helpers and source scans only (no DOM rendering). Playwright specs live in `e2e/`.
- E2E sign-in uses only the Development sign-in panel on `/login` (account "Lindiwe Dube", subtitle "Standalone teacher"); never type a password for a real account.
- Commits: `LANE_SWEEP_OK=1 git commit` with a conventional message whose body ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The global commit guards can take over 110 s: give every commit command a 300 s timeout.
- Compromise protocol: before any `git fetch`/`pull`, run `git log --oneline origin/master -5` and confirm only expected commits; this plan never pushes (shipping is the orchestrator's step).
- Capacity: a lane starts no server it does not stop in the same session; the frontend must be the only thing on :3500 (ruling R15).

## Review Focus

1. **A topic with no evidence yet, or worth 0 marks.** A reasonable person expects "Not yet tested" in a neutral tile, never red "Weak", and zero-mark topics left out rather than a crash or a zero-width tile. Pinned by Task 3 (`layoutExamMap` untested and zero-mark tests).
2. **Exam day, the day after, and just before midnight in South Africa.** Expected: "Paper 1 is today", "Paper 1 was on Tue 27 Oct", and a correct day count at 23:59 local time, never "-1 days" and never a UTC off-by-one. Pinned by Task 3 (`countdownText` tests).
3. **Dialogs, selects, sheets and toasts render outside the dashboard frame.** Before this phase the teacher scope had to be mirrored onto `<body>` for them. Expected: portaled overlays get the Blueprint tokens and fonts in both themes. Pinned by Task 2 (tokens only on `:root`/`.dark`; font variables on `<html>`).
4. **Long topic names, 3-digit numbers and a 12-item More sheet at 320px.** Expected: text truncates or wraps and nothing scrolls sideways, including inside `<main>`, which is its own scroll box. Pinned by Task 1 (the sweep checks `<main>` as well as the document) and Task 16 (the `/design` gallery with example data is in the sweep).
5. **Switching between light and dark while a chart is on screen.** Recharts takes literal colours, so they must follow the theme without a reload. Pinned by Task 4 (`chartTheme` reads every colour through a token reader; `useChartTheme` recomputes after next-themes applies the class).

---

## Plan rulings

Fact-check of the spec against the code at `origin/master` 0d42365 (2026-09-25). Each entry: **ruling** — why — cost if wrong.

- **R1. The sweep is far smaller than spec §6 says; plan against the generated inventory.** — Spec §6 cites "2,168 hardcoded palette classes … across ~200 files". The repo has 2,214 in 270 files, but the in-scope surface (entry pages → imports, Appendix A) is 468 files, of which **20 carry 166 palette classes** and **9 carry 49 non-exempt colour literals**. The teacher portal was already moved to tokens in plan 1B (`tests/teacher-colour-guard.test.ts`, 55 files). — None: the scanner test builds the closure at test time, so any file the inventory missed fails red.
- **R2. "In scope" uses the code's own definition of what a standalone teacher can reach.** — Spec §6 names 11 nav areas. `src/lib/standalone-teacher-paths.ts` (`STANDALONE_TEACHER_PREFIXES` + `/teacher`) also lets them reach onboarding, students, mark-papers, assignments and the subscription pages, so those are in. Public and auth entries: `/`, `/teachers`, `/login`, `/signup/teacher`, `/signup/coach`, `/register-student`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/change-password`. Out: `/register` (school sign-up), `/apply/*`, `/verify/certificate`. — A school sign-up shows old colours until the later sweep.
- **R3. The scanner lists entry routes and follows imports, not directories.** — Spec §6: "A test lists the in-scope directories". But directories mix surfaces (e.g. `components/attendance` holds school-only files next to the teacher register). `src/types/**` is not followed, because `src/types/index.ts` does `export * from './migration'`, which would pull in admin-only style maps (`MIGRATION_STATUS` colours, 17 classes) that no in-scope file uses. — None.
- **R4. Definition of a palette class and a colour literal.** — A palette class is a named hue or grey with a numeric shade on any colour utility, with any variant prefix and optional `/opacity` (regex in Task 13). `white`/`black` are not palette classes (scrims `bg-black/40`, text on a fill); the human pass judges them (82 in scope, Appendix A). A colour literal is an arbitrary hex (`bg-[#2563eb]`) or a quoted hex string in `.ts`/`.tsx`. Exempt with reason: the `/teachers` campaign page (`src/app/teachers/page.tsx`, `teachers-landing/StartFreeLink.tsx`) and `components/textbook/subject-colours.ts` (one colour per subject cover). — Extending the regex grows the sweep; the scanner reports each file.
- **R5. `/teachers` keeps its campaign palette and clock face.** — It is the landing page for the "Get the night back" ads and shares their brand (`campusly-remotion/src/brand.ts`: midnight, violet, JetBrains Mono clock). It has 0 palette classes, so the sweep leaves it alone. The spec's font change applies to the app: Inter in `layout.tsx` and the night-back `teacher-fonts.ts`. — About 10 lines to move it onto Blueprint later: one `TOKENS` object and one font import.
- **R6. Five spec colour values fail the spec's own AA rule and are corrected.** Measured with the Task 2 contrast helper:
  - Light `--weak-strong #C2412F` on `--weak` is 4.35:1. Changed to **#B5392A** (4.97).
  - Light `--destructive #C8372D` is 4.41:1 on the soft red, and 4.13:1 as `bg-destructive/10` on the ground (the CLAUDE.md error-banner pattern). Changed to **#B5392A** (4.97 / 4.64). This makes one red for weak and destructive, which spec §8 already reserves red for.
  - Light `--chart-3 #E3A02F` is 2.25:1 on a card; chart series need 3:1. Changed to **#B07515** (3.89).
  - Light `--chart-4` follows weak-strong to **#B5392A**.
  - `--input` equal to `--border` (#E2E7F0, 1.24:1) fails the 3:1 rule for UI edges. `--input` becomes **#7F8DA3** light (3.36 on card, 3.08 on ground) and **#5A6B88** dark (3.19 / 3.47). `--border` stays a decorative hairline, exempt and listed in the test.
  — Cost if wrong: CSS values only.
- **R7. Existing tokens the spec does not list are kept, with Blueprint values; tile tokens are added.** — About 270 files use `--secondary(-foreground)`, `--success(-soft)`, `--attention(-soft)`, `--info(-soft)`, `--accent-soft`, `--destructive-soft`, `--sidebar-*`, `--card-foreground` and `--popover-foreground`. Their new values: success = the secure pair, attention = the building pair, info = the accent pair, destructive-soft = the weak fill. The sidebar sits on the card surface. New tokens `--tile-{secure,building,weak}` and `--tile-*-ink` encode the spec's tile rules for each theme, so `ExamMap` has no theme branching. — CSS values only.
- **R8. Fonts are loaded as variable fonts, on `<html>`; `font-mono` maps to Hanken Grotesk with tabular numbers.** — Both are Google variable fonts, so no weight list is needed: one file each covers 400–700. They keep the default `preload` (Inter had `preload: false`). The `--font-display` and `--font-body` variables go on `<html>`, so overlays portaled to `<body>` inherit them; this replaces `usePortalScope`. Today `--font-mono` resolves to `var(--portal-font-mono, var(--font-geist-mono))`, and `--font-geist-mono` is never defined. The `font-mono` class stays on markup, because the launch e2e selects the join code with `.font-mono.text-primary`. — None.
- **R9. The portal scope is removed completely.** Deleted: `src/lib/portal-scope.ts`, `src/hooks/usePortalScope.ts`, `src/lib/fonts/teacher-fonts.ts`, `@custom-variant teacher`, and both `[data-portal="teacher"]` blocks. The 28 `teacher:` utilities in 5 files (`Sidebar`, `SidebarNavItem`, `PageHeader`, `EmptyState`, `StatCard`) are rebuilt in Tasks 8–10. `tests/teacher-tokens`, `teacher-fonts` and `portal-scope` are deleted; `tests/design-tokens` replaces them. `tests/teacher-colour-guard.test.ts` keeps its raw-palette list, which covers school-teacher files outside Phase D, but drops its `text-primary` rule: cobalt text on a card is 5.90:1, pinned by the token test. — None.
- **R10. Phone nav keeps section tabs for sectioned navs.** — Spec §3 says the phone gets "the portal's first four items + More". The code already gives sectioned (teacher) navs the tabs Today/Teach/Assess/Class/More through `phoneSectionLayout`, from the approved teacher-portal spec, and gives flat navs first-four + More. "Nav contents unchanged", so both are kept, unified behind one `phoneTabs()` so `BottomNav` has one render path. — Swapping one call.
- **R11. Breakpoints move to the spec; the phone drawer goes.** — Today the sidebar is an off-canvas drawer below 1024px, opened by a hamburger, and the bottom nav shows below 1024px. Now: bottom tabs below 768px; a 56px rail at 768–1023px, plus an "All pages" button that opens the full nav in a left sheet (so admin group children stay reachable); the full 232px sidebar from 1024px, still collapsible to the rail. The hamburger and the drawer are removed. `useUIStore` is unchanged: `WizardFooter` reads `sidebarCollapsed`, and `useNotificationStore` uses `setNotifications`. — The drawer is one component to re-add.
- **R12. Base-component APIs are unchanged; only the styles change.** — Button variant and size names (`default|outline|secondary|ghost|destructive|link`; `xs|sm|default|lg|icon|icon-xs|icon-sm|icon-lg`), Badge variants and TabsList variants (`default|line`) keep working at every call site. How the spec's names map: primary = `default`, secondary = `outline`, ghost, destructive. `secondary` keeps a muted fill. The Tabs default becomes the underline style. Badge gains `secure`, `building` and `weak`. `destructive` stays the soft red (the AA pair is pinned). `DialogContent` keeps its `grid` default: switching every dialog to flex-col would re-lay out hundreds of existing dialogs, so the CLAUDE.md flex-col pattern stays per call site. — One cva default to flip.
- **R13. Phone touch floor goes on the main sizes only.** — `default`, `lg`, `icon` and `icon-lg` buttons, inputs and select triggers get `min-h-11 md:min-h-0` (icons also `min-w-11 md:min-w-0`). `xs`, `sm`, `icon-xs` and `icon-sm` stay compact for dense rows; CLAUDE.md already says primary actions use `default`. — Class edits.
- **R14. Vitest checks class contracts through small pure modules plus source scans.** — The vitest env is node with no DOM. So `button-variants.ts`, `badge-variants.ts` and `focus.ts` are extracted, and tests read component sources for the shared constants. — None.
- **R15. How the sweep finds detail pages, records the baseline, and which port it runs on.** Routes with `[id]` are found from the list page's first matching link; when the dev account has none, the route is skipped with a test annotation, listed in the report and left to the human pass. The request baseline is recorded on the untouched base (Task 1). The backend's `CORS_ORIGIN` allows only `http://localhost:3500`, and dev sign-in accepts only local origins, so the worktree's dev server must run on :3500. If :3500 is busy, ask the orchestrator; do not stop a server you did not start. — A missing detail page is caught by the human pass.
- **R16. The branch is based on `origin/master`; nothing is copied.** — `origin/master` already contains the three spec docs (5c1d9d7, dda523e, 1df6268, 0d42365 are docs-only; checked 2026-09-25). This plan file stays uncommitted in the main checkout; executors read it at its absolute path. — None.
- **R17. `chartTheme` resolves tokens at runtime.** — `src/components/charts/index.tsx` passes `hsl(var(--muted-foreground))` to Recharts, but the tokens are hex or oklch, so the colour is invalid and ticks fall back to black. The fix is a pure `chartTheme(read)` plus a `useChartTheme()` hook that uses `getComputedStyle`, so SVG attributes get real colours and follow the theme. — None.
- **R18. `masteryLevel` takes a number; untested topics are `null` upstream.** — `ExamTopic.mastery` is `number | null`. `null` shows as a neutral "Not yet tested" tile. `masteryLevel` clamps to 0–100 and throws `RangeError` on `NaN`, which is a programming error because the types keep `null` out. — Phase R may redefine "untested"; that is one type.
- **R19. No new `LoadingState` name.** — The spec's "LoadingState/skeletons" are the existing `skeletons.tsx` and `LoadingSpinner`, restyled. `ErrorState` is new. — None.
- **R20. Where the gallery lives and how its 404 is proven.** — `src/app/design/page.tsx`, outside `(dashboard)` so it has no `AuthGuard`. It calls `notFound()` when `isDesignGalleryEnabled(process.env.NODE_ENV)` is false and sets robots to noindex. The 404 is proven by a unit test and by `next build` + `next start` + `curl` in Task 16. Light and dark are shown with the existing `ThemeToggle` on the page. — None.
- **R21. Sweeps do not unify thresholds.** — `student-360/AcademicSummaryCard.tsx` colours percentages at 80/70/60/50/40. Moving it to `masteryLevel` would be a logic change, which sweeps forbid. Its branches keep their thresholds and return token classes instead: ≥ 70 secure pair, ≥ 60 building pair, lower weak pair. Categorical decoration (the 7 node-type colours in `CurriculumTreeNodeRow`) becomes one neutral chip, since the chip's word already names the type. — The threshold unification happens where learner screens are rebuilt (Phase L/R).
- **R22. The banner strip is restyled only; owner-only gating waits for Phase L.** — The "owner only" rule comes from the learner spec, and Phase L gates it. Here the Trial, Dunning and VerifyEmail banners move into one `accent` strip. — None.
- **R23. `<main>` stays the scroll container.** — Changing to document scrolling could break sticky elements and scroll restoration, which is a behaviour change. The width sweep therefore checks `<main>`'s `scrollWidth` as well as the document's. Tables scroll inside their own container (`data-scroll-x`), which the spec allows. — None.
- **R24. `DataTable`'s header is sticky only from `md`.** — A sticky header needs a vertically scrolling box. From `md` the table box is `max-h-[70vh] overflow-auto`; on phones the header is not sticky, to avoid nested scrolling. — A class change.

## File structure

New pure modules (each with a vitest file):

| File | Responsibility |
|---|---|
| `src/lib/design/contrast.ts` | parse hex/rgb colours, composite, WCAG contrast |
| `src/lib/design/token-pairs.ts` | the token pair table the components use, plus a CSS block reader |
| `src/lib/design/palette-scan.ts` | palette-class and colour-literal regexes |
| `src/lib/design/gallery.ts` | `isDesignGalleryEnabled(nodeEnv)` |
| `src/lib/readiness/mastery.ts` | `masteryLevel`, `marksToGain`, labels |
| `src/lib/readiness/exam-map.ts` | `layoutExamMap`, `examMapLabel`, `totalMarksToGain`, `topicsByGain` |
| `src/lib/readiness/countdown.ts` | `daysUntil`, `formatExamDate`, `countdownText` |
| `src/lib/readiness/band.ts` | `bandGeometry`, `bandSentence` |
| `src/lib/readiness/example-data.ts` | the mockup's example learner, for the gallery |
| `src/lib/charts/chart-theme.ts` | `chartTheme(read)`, `seriesColour`, `trendDomain` |
| `src/lib/shell/nav-active.ts` | `isSectioned`, `isNavItemActive` (lifted from Sidebar) |
| `src/lib/shell/phone-tabs.ts` | `phoneTabs`, `isTabActive` |
| `src/components/ui/focus.ts` | `FOCUS_RING`, `TOUCH_TARGET`, `MOTION` class constants |
| `src/components/ui/button-variants.ts` | `buttonVariants` (moved out of `button.tsx`) |
| `src/components/ui/badge-variants.ts` | `badgeVariants` (moved out of `badge.tsx`) |
| `e2e/support/request-set.ts` | normalise and diff a page's API calls |

New components: `src/hooks/useChartTheme.ts`; `src/components/layout/{SidebarNav,BannerStrip}.tsx`; `src/components/shared/ErrorState.tsx`; `src/components/readiness/{ExamMap,Countdown,NextUp,MarksToGain,ReadinessBand,TrendChart,index}.tsx`; `src/app/design/page.tsx`; `src/components/design-gallery/{DesignGallery,TokenTable,TypeScale,ControlStates,DataStates,ReadinessExamples}.tsx`.

New test support: `tests/support/source.ts` (read and list sources), `tests/support/import-closure.ts`, `tests/support/design-scope.ts`. New e2e: `e2e/support/{design-routes,a11y-audit}.ts`, `e2e/design-gate.spec.ts`, `e2e/design-screens.spec.ts`, `e2e/baselines/request-sets.json`. New script: `scripts/design-gate.mjs` + `scripts/design-gate-lib.mjs`.

Deleted: `src/lib/portal-scope.ts`, `src/hooks/usePortalScope.ts`, `src/lib/fonts/teacher-fonts.ts`, `tests/teacher-tokens.test.ts`, `tests/teacher-fonts.test.ts`, `tests/portal-scope.test.ts`.

## Task list

| # | Task | Spec |
|---|---|---|
| 1 | Worktree, gate harness (width, labels, focus, request set) and request baseline | §7 |
| 2 | Tokens, fonts, portal scope removed, contrast test | §2, §8 |
| 3 | Readiness helpers: `masteryLevel`, exam map, countdown, band, example data | §2.1, §4 |
| 4 | `chartTheme`, `useChartTheme`, `trendDomain` | §4 |
| 5 | Base controls: button, input, textarea, select, checkbox, radio, switch, slider, tabs | §2.4, §4 |
| 6 | Overlays: dialog, sheet, popover, dropdown, tooltip, command, select popup, toasts | §2.4, §4 |
| 7 | Data display: card, badge, table, skeleton, progress, separator, avatar, accordion, alert | §4 |
| 8 | Shell 1: nav helpers, Sidebar, rail, tablet nav sheet | §3 |
| 9 | Shell 2: phone tabs, BottomNav + More, TopBar, dashboard layout, banner strip, wizard footer | §3 |
| 10 | Shared: PageHeader, EmptyState, ErrorState, skeletons, StatCard, DataTable; `teacher:` guard | §4 |
| 11 | Readiness components: ExamMap, Countdown, NextUp, MarksToGain, ReadinessBand, TrendChart | §4 |
| 12 | `/design` gallery (dev only) | §5 |
| 13 | Scanner + sweep 1: landing and auth (and shell check) | §6 |
| 14 | Sweep 2: standalone teacher pages (8 files) | §6 |
| 15 | Sweep 3: charts onto `chartTheme` (3 files); teacher pages area complete | §4, §6 |
| 16 | Machine gate: width sweep green, screenshots, gate script, prod 404, full suites | §7 |

---

### Task 1: Worktree, gate harness and request baseline

Builds the machine gate's browser half first, so the request set of every in-scope page is recorded on the untouched code, and the width and label faults the restyle must fix are listed before any change.

**Files:**
- Create: `e2e/support/request-set.ts`
- Create: `e2e/support/design-routes.ts`
- Create: `e2e/support/a11y-audit.ts`
- Create: `e2e/design-gate.spec.ts`
- Create: `e2e/baselines/request-sets.json` (generated)
- Modify: `.gitignore` (add `/e2e/.screens/`)
- Test: `tests/request-set.test.ts`

**Interfaces:**
- Consumes: `overflowsSideways`, `watchPage` from `e2e/support/watch.ts`; `assertLocalUrl` from `e2e/support/local.ts`.
- Produces: `normaliseRequest(method: string, url: string): string | null`, `toRequestSet(entries: ReadonlyArray<{ method: string; url: string }>): string[]`, `diffRequestSets(before: readonly string[], after: readonly string[]): { added: string[]; removed: string[] }`; `WIDTHS`, `PUBLIC_ROUTES`, `TEACHER_ROUTES`, `DETAIL_ROUTES`, `POLLING` from `e2e/support/design-routes.ts`; `sidewaysOverflow(page): Promise<string[]>`, `unlabelledControls(page): Promise<string[]>`, `focusRingMissing(page, max?): Promise<string[]>` from `e2e/support/a11y-audit.ts`. Task 16 runs `e2e/design-gate.spec.ts` as the gate.

- [ ] **Step 1: Create the worktree on `origin/master`**

Compromise protocol first:

```bash
cd /c/dev/campusly/campusly-frontend
git fetch origin
git log --oneline origin/master -5
```
Expected: the top commits are `0d42365 docs: Blueprint design system spec (Phase D)` (or a later commit you can account for), `1df6268`, `dda523e`, `5c1d9d7`, `5530764`. Stop and report if anything else appears.

```bash
git worktree add /c/dev/campusly/.worktrees/frontend-blueprint -b feat/blueprint-design-system origin/master
cd /c/dev/campusly/.worktrees/frontend-blueprint
npm ci
cp /c/dev/campusly/campusly-frontend/.env.local .env.local
```
Expected: `Preparing worktree (new branch 'feat/blueprint-design-system')`, then `npm ci` finishes with `added … packages`. Use a real `npm ci`, not a junction to the main checkout's `node_modules`: see the worktree-junction memory. Every later command in this plan runs in `C:\dev\campusly\.worktrees\frontend-blueprint`.

- [ ] **Step 2: Write the failing test for the request-set helpers**

`tests/request-set.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { diffRequestSets, normaliseRequest, toRequestSet } from '../e2e/support/request-set';

describe('normaliseRequest', () => {
  it('keeps the method and API path, and drops the host and query', () => {
    expect(normaliseRequest('get', 'http://localhost:4500/api/homework?classId=1&page=2')).toBe('GET /api/homework');
  });

  it('replaces Mongo ids and numeric segments, so two learners look the same', () => {
    expect(normaliseRequest('GET', 'http://localhost:4500/api/academic/classes/65f0c0ffee0000000000abcd/students'))
      .toBe('GET /api/academic/classes/:id/students');
    expect(normaliseRequest('GET', 'http://localhost:4500/api/papers/12')).toBe('GET /api/papers/:n');
  });

  it('ignores anything that is not an API call', () => {
    expect(normaliseRequest('GET', 'http://localhost:3500/_next/static/chunk.js')).toBeNull();
    expect(normaliseRequest('GET', 'not a url')).toBeNull();
  });
});

describe('toRequestSet', () => {
  it('dedupes repeats (polling, re-renders) and sorts', () => {
    expect(toRequestSet([
      { method: 'GET', url: 'http://localhost:4500/api/b' },
      { method: 'GET', url: 'http://localhost:4500/api/a' },
      { method: 'GET', url: 'http://localhost:4500/api/b?x=1' },
    ])).toEqual(['GET /api/a', 'GET /api/b']);
  });
});

describe('diffRequestSets', () => {
  it('reports calls a restyle added or lost', () => {
    expect(diffRequestSets(['GET /api/a', 'GET /api/b'], ['GET /api/b', 'POST /api/c']))
      .toEqual({ added: ['POST /api/c'], removed: ['GET /api/a'] });
  });

  it('is empty when nothing changed', () => {
    expect(diffRequestSets(['GET /api/a'], ['GET /api/a'])).toEqual({ added: [], removed: [] });
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/request-set.test.ts`
Expected: FAIL with `Failed to resolve import "../e2e/support/request-set"`.

- [ ] **Step 4: Write the helpers**

`e2e/support/request-set.ts`:

```ts
/**
 * A page's API traffic as a set: method + path, with ids, numbers and the query
 * stripped, so polling and different records don't count as a change.
 * The restyle must leave every in-scope page's set as it was (spec §7).
 */
const OBJECT_ID = /\b[0-9a-f]{24}\b/gi;
const NUMERIC_SEGMENT = /\/\d+(?=\/|$)/g;

export function normaliseRequest(method: string, url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.pathname.startsWith('/api/')) return null;
  const path = parsed.pathname.replace(OBJECT_ID, ':id').replace(NUMERIC_SEGMENT, '/:n').replace(/\/+$/, '');
  return `${method.toUpperCase()} ${path}`;
}

export function toRequestSet(entries: ReadonlyArray<{ method: string; url: string }>): string[] {
  const keys = new Set<string>();
  for (const entry of entries) {
    const key = normaliseRequest(entry.method, entry.url);
    if (key) keys.add(key);
  }
  return [...keys].sort();
}

export function diffRequestSets(before: readonly string[], after: readonly string[]): { added: string[]; removed: string[] } {
  const had = new Set(before);
  const has = new Set(after);
  return { added: after.filter((k: string) => !had.has(k)), removed: before.filter((k: string) => !has.has(k)) };
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run tests/request-set.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Write the route list**

`e2e/support/design-routes.ts`:

```ts
/** Phase D's in-scope routes (plan ruling R2) and the widths the gate checks (spec §7). */
export const WIDTHS = [320, 375, 768, 1024, 1280, 1440] as const;

/** Signed out. `/design` is dev-only and absent before Task 12 (a 404 is skipped, not failed). */
export const PUBLIC_ROUTES: readonly string[] = [
  '/', '/teachers', '/login', '/signup/teacher', '/signup/coach', '/register-student',
  '/verify-email', '/forgot-password', '/reset-password', '/design',
];

/** Signed in as the standalone teacher (dev sign-in panel). */
export const TEACHER_ROUTES: readonly string[] = [
  '/teacher', '/teacher/onboarding', '/teacher/courses', '/teacher/courses/new', '/teacher/curriculum/textbooks',
  '/teacher/homework', '/teacher/homework/new', '/teacher/papers', '/teacher/papers/new',
  '/teacher/workbench/marking-hub', '/teacher/curriculum/mark-papers', '/teacher/grades', '/teacher/classes',
  '/teacher/students', '/teacher/attendance', '/teacher/attendance/report', '/teacher/assignments',
  '/teacher/assignments/new', '/teacher/settings', '/teacher/settings/join-school', '/my/billing', '/subscription',
];

export interface DetailRoute { name: string; list: string; link: RegExp }

/** Pages with an id: found from the first matching link on the list page (ruling R15). */
export const DETAIL_ROUTES: readonly DetailRoute[] = [
  { name: 'lesson', list: '/teacher/courses', link: /^\/teacher\/courses\/(?!new$)[^/?#]+$/ },
  { name: 'textbook', list: '/teacher/curriculum/textbooks', link: /^\/teacher\/curriculum\/textbooks\/[^/?#]+$/ },
  { name: 'homework', list: '/teacher/homework', link: /^\/teacher\/homework\/(?!new$)[^/?#]+$/ },
  { name: 'paper', list: '/teacher/papers', link: /^\/teacher\/papers\/(?!new$)[^/?#]+$/ },
  { name: 'learner', list: '/teacher/students', link: /^\/teacher\/students\/[^/?#]+$/ },
  { name: 'roster', list: '/teacher/classes', link: /^\/teacher\/classes\/[^/?#]+\/roster$/ },
  { name: 'assignment', list: '/teacher/assignments', link: /^\/teacher\/assignments\/(?!new$)[^/?#]+$/ },
];

/** Calls on a timer, not part of a page's behaviour. */
export const POLLING: readonly RegExp[] = [/^GET \/api\/notifications/];
```

- [ ] **Step 7: Write the in-page audits**

`e2e/support/a11y-audit.ts`:

```ts
import type { Page } from '@playwright/test';

/**
 * Where the page is wider than the viewport. `<main>` is the dashboard's own scroll box (ruling R23),
 * so it is checked as well as the document; tables scroll inside `[data-scroll-x]` and are allowed to.
 */
export async function sidewaysOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) found.push(`document ${doc.scrollWidth}px`);
    const main = document.querySelector('main');
    if (main && main.scrollWidth > main.clientWidth + 1) found.push(`main ${main.scrollWidth}px in ${main.clientWidth}px`);
    return found;
  });
}

/** Form controls without a label and buttons/links without a name (spec §7). */
export async function unlabelledControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const visible = (el: Element): boolean => {
      const box = (el as HTMLElement).getBoundingClientRect();
      return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const labelledBy = (el: Element): string => (el.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/).filter(Boolean).map((id: string) => text(document.getElementById(id))).join(' ').trim();
    const ariaName = (el: Element): string => (el.getAttribute('aria-label') ?? '').trim() || labelledBy(el) || (el.getAttribute('title') ?? '').trim();
    const describe = (el: Element): string => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.getAttribute('name') ? `[name=${el.getAttribute('name')}]` : ''}`;
    const problems: string[] = [];
    document.querySelectorAll('input:not([type=hidden]), select, textarea, [role=combobox], [role=switch], [role=checkbox], [role=radio], [role=slider]')
      .forEach((el: Element) => {
        if (!visible(el)) return;
        const labels = (el as HTMLInputElement).labels;
        const labelled = (labels !== null && labels !== undefined && Array.from(labels).some((l: HTMLLabelElement) => text(l) !== ''))
          || ariaName(el) !== '' || text(el.closest('label')) !== '';
        if (!labelled) problems.push(`unlabelled ${describe(el)}`);
      });
    document.querySelectorAll('button, [role=button], a[href]').forEach((el: Element) => {
      if (!visible(el)) return;
      if (text(el) === '' && ariaName(el) === '' && !el.querySelector('img[alt]:not([alt=""])')) problems.push(`unnamed ${describe(el)}`);
    });
    return problems;
  });
}

/** Tabs through the first `max` stops; lists any that show neither an outline nor a ring. */
export async function focusRingMissing(page: Page, max = 8): Promise<string[]> {
  const missing: string[] = [];
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab');
    const result = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const outlined = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      const ringed = style.boxShadow !== '' && style.boxShadow !== 'none';
      return outlined || ringed ? '' : `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40)}"`;
    });
    if (result === null) break;
    if (result !== '') missing.push(result);
  }
  return missing;
}
```

- [ ] **Step 8: Write the gate spec**

`e2e/design-gate.spec.ts`:

```ts
import { test, expect, type Page, type Request } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assertLocalUrl } from './support/local';
import { DETAIL_ROUTES, POLLING, PUBLIC_ROUTES, TEACHER_ROUTES, WIDTHS } from './support/design-routes';
import { diffRequestSets, toRequestSet } from './support/request-set';
import { focusRingMissing, sidewaysOverflow, unlabelledControls } from './support/a11y-audit';

/**
 * Phase D machine gate, browser half (spec §7): no sideways scroll at six widths, labelled controls,
 * named buttons, visible focus, and each page's API calls unchanged from the baseline recorded on the
 * untouched code. E2E_RECORD_BASELINE=1 records the baseline instead of comparing.
 */
const BASELINE_FILE = path.join(__dirname, 'baselines', 'request-sets.json');
const RECORD = process.env.E2E_RECORD_BASELINE === '1';
const recorded: Record<string, string[]> = {};
const baseline: Record<string, string[]> = !RECORD && existsSync(BASELINE_FILE)
  ? (JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Record<string, string[]>)
  : {};

test.describe.configure({ mode: 'serial' });

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function sweep(page: Page, route: string, key: string): Promise<void> {
  const calls: Array<{ method: string; url: string }> = [];
  const onRequest = (req: Request) => calls.push({ method: req.method(), url: req.url() });
  page.on('request', onRequest);
  const response = await page.goto(route);
  await settle(page);
  page.off('request', onRequest);
  if (response?.status() === 404) {
    test.info().annotations.push({ type: 'skipped', description: `${route}: 404` });
    return;
  }
  const set = toRequestSet(calls).filter((k: string) => !POLLING.some((p: RegExp) => p.test(k)));
  if (RECORD) {
    recorded[key] = set;
    return;
  }
  if (baseline[key]) expect.soft(diffRequestSets(baseline[key], set), `${key}: request set`).toEqual({ added: [], removed: [] });
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await settle(page);
    expect.soft(await sidewaysOverflow(page), `${key}: sideways at ${width}px`).toEqual([]);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  expect.soft(await unlabelledControls(page), `${key}: labels and names`).toEqual([]);
  expect.soft(await focusRingMissing(page), `${key}: focus ring`).toEqual([]);
}

async function signInAsStandaloneTeacher(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('[aria-label="Development sign-in"]').getByRole('button', { name: /Standalone teacher/ }).click();
  await page.waitForURL(/\/teacher(\/|$)/);
}

test('public and auth pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  for (const route of PUBLIC_ROUTES) await test.step(route, () => sweep(page, route, route));
});

test('standalone teacher pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  await signInAsStandaloneTeacher(page);
  for (const route of TEACHER_ROUTES) await test.step(route, () => sweep(page, route, route));
  for (const detail of DETAIL_ROUTES) {
    await test.step(`detail: ${detail.name}`, async () => {
      await page.goto(detail.list);
      await settle(page);
      const hrefs = await page.locator('a[href]').evaluateAll((links: Element[]) => links.map((a: Element) => a.getAttribute('href') ?? ''));
      const href = hrefs.find((h: string) => detail.link.test(h));
      if (!href) {
        test.info().annotations.push({ type: 'skipped', description: `${detail.name}: no link on ${detail.list}` });
        return;
      }
      await sweep(page, href, `detail:${detail.name}`);
    });
  }
});

test.afterAll(() => {
  if (!RECORD) return;
  mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
  const merged = { ...baseline, ...recorded };
  writeFileSync(BASELINE_FILE, `${JSON.stringify(Object.fromEntries(Object.entries(merged).sort()), null, 2)}\n`);
});
```

Add `/e2e/.screens/` under `/e2e/.results/` in `.gitignore`.

- [ ] **Step 9: Start the servers (only on a free :3500)**

Check that :3500 is free: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3500/login`. Expected: `000`. If it is anything else, message the orchestrator and wait (ruling R15). Add this entry to `C:\dev\campusly\.claude\launch.json` `configurations` and start it with `preview_start` by name. Also start `campusly-backend` by name if :4500 is not already up.

```json
{
  "name": "campusly-frontend-blueprint",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["--prefix", "C:/dev/campusly/.worktrees/frontend-blueprint", "run", "dev", "--", "--webpack"],
  "port": 3500
}
```
Expected: `/login` returns 200, and the "Development sign-in" panel lists "Lindiwe Dube · Standalone teacher".

- [ ] **Step 10: Record the baseline on the untouched code**

Run: `E2E_RECORD_BASELINE=1 npx playwright test e2e/design-gate.spec.ts`
Expected: `2 passed`, and `e2e/baselines/request-sets.json` exists with a key per reachable route (for example `"/teacher/homework": ["GET /api/…", …]`). `/design` shows as a skipped annotation (404).

- [ ] **Step 11: Run the gate once to list today's faults (expected red)**

Run: `npx playwright test e2e/design-gate.spec.ts`
Expected: FAIL with soft-assertion messages such as `/teacher/grades: sideways at 320px` and `…: labels and names`. Copy the failure list into the commit body under "Faults the restyle must fix"; Task 16 turns this spec green. Request-set assertions must already pass here: same code, same calls. If one fails, the page is non-deterministic; add its key to `POLLING` with a comment and re-record.

- [ ] **Step 12: Stop the servers you started**

Stop `campusly-frontend-blueprint` (and `campusly-backend` if you started it) with `preview_stop`.

- [ ] **Step 13: Commit**

```bash
git add .gitignore tests/request-set.test.ts e2e/support/request-set.ts e2e/support/design-routes.ts e2e/support/a11y-audit.ts e2e/design-gate.spec.ts e2e/baselines/request-sets.json
LANE_SWEEP_OK=1 git commit -m "test(e2e): Phase D gate: width sweep, labels, focus and request-set baseline" -m "Baseline recorded on origin/master before any restyle.

Faults the restyle must fix:
<paste the Step 11 failure list>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tokens, fonts, portal scope removed, contrast test

**Files:**
- Create: `src/lib/design/contrast.ts`
- Create: `src/lib/design/token-pairs.ts`
- Modify: `src/app/globals.css` (full rewrite, below)
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(dashboard)/layout.tsx:29-31,89-91,126-132`
- Modify: `tests/teacher-colour-guard.test.ts` (drop the `text-primary` rule)
- Delete: `src/lib/portal-scope.ts`, `src/hooks/usePortalScope.ts`, `src/lib/fonts/teacher-fonts.ts`, `tests/teacher-tokens.test.ts`, `tests/teacher-fonts.test.ts`, `tests/portal-scope.test.ts`
- Test: `tests/contrast.test.ts`, `tests/design-tokens.test.ts`

**Interfaces:**
- Produces: `type Rgba = readonly [number, number, number, number]`; `parseColour(value: string): Rgba`; `composite(top: Rgba, base: Rgba): Rgba`; `relativeLuminance(c: Rgba): number`; `contrastRatio(fg: Rgba, bg: Rgba): number`; `pairContrast(fg: string, bg: string, ground: string, bgAlpha?: number): number`. `interface TokenPair { fg: string; bg: string; use: 'text' | 'ui'; bgAlpha?: number; ground?: 'background' | 'card' }`; `TOKEN_PAIRS: readonly TokenPair[]`; `MIN_RATIO: Record<'text' | 'ui', number>`; `REQUIRED_TOKENS: readonly string[]`; `readTokenBlock(css: string, selector: string): Record<string, string>`. The gallery (Task 12) uses `TOKEN_PAIRS` + `pairContrast`.
- Tailwind utilities later tasks rely on: colours `secure`, `secure-strong`, `building`, `building-strong`, `weak`, `weak-strong`, `tile-secure`, `tile-secure-ink`, `tile-building`, `tile-building-ink`, `tile-weak`, `tile-weak-ink`, `accent-soft`, `destructive-soft`, `success(-soft)`, `attention(-soft)`, `info(-soft)`; radius `rounded-control` (10px), `rounded-card` (16px); shadow `shadow-card`, `shadow-overlay`; easing `ease-standard`; text sizes `text-caption`, `text-small`, `text-body`, `text-h3`, `text-h2`, `text-h1`, `text-h1-desktop`, `text-display`, `text-eyebrow`; fonts `font-sans` (Source Sans 3), `font-heading` and `font-mono` (Hanken Grotesk).

- [ ] **Step 1: Write the failing contrast test**

`tests/contrast.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contrastRatio, pairContrast, parseColour } from '../src/lib/design/contrast';

describe('parseColour', () => {
  it('reads short and long hex', () => {
    expect(parseColour('#fff')).toEqual([255, 255, 255, 1]);
    expect(parseColour('#1554F0')).toEqual([21, 84, 240, 1]);
  });

  it('reads rgb with commas or spaces and an alpha', () => {
    expect(parseColour('rgba(255, 0, 0, .5)')).toEqual([255, 0, 0, 0.5]);
    expect(parseColour('rgb(11 27 51 / 0.04)')).toEqual([11, 27, 51, 0.04]);
  });

  it('refuses anything else, so an oklch token cannot slip past the check', () => {
    expect(() => parseColour('oklch(1 0 0)')).toThrow(/Unsupported colour/);
  });
});

describe('contrast', () => {
  it('is 21:1 for black on white and 1:1 for a colour on itself', () => {
    expect(contrastRatio(parseColour('#000'), parseColour('#fff'))).toBeCloseTo(21, 5);
    expect(contrastRatio(parseColour('#1554F0'), parseColour('#1554F0'))).toBeCloseTo(1, 5);
  });

  it('judges a 10% tint as painted on its ground (bg-destructive/10 on a card)', () => {
    expect(pairContrast('#B5392A', '#B5392A', '#FFFFFF', 0.1)).toBeCloseTo(5.04, 1);
  });

  it('matches the measured spec values (ruling R6)', () => {
    expect(pairContrast('#5B6B82', '#F3F5FA', '#F3F5FA')).toBeCloseTo(4.97, 1);
    expect(pairContrast('#C2412F', '#FCE8E5', '#FFFFFF')).toBeLessThan(4.5);
  });
});
```

- [ ] **Step 2: Write the failing token test**

`tests/design-tokens.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pairContrast } from '../src/lib/design/contrast';
import { MIN_RATIO, REQUIRED_TOKENS, TOKEN_PAIRS, readTokenBlock, type TokenPair } from '../src/lib/design/token-pairs';

const root = (p: string) => path.resolve(__dirname, '..', p);
const css = readFileSync(root('src/app/globals.css'), 'utf8');
const layout = readFileSync(root('src/app/layout.tsx'), 'utf8');
const light = readTokenBlock(css, ':root');
const THEMES: Record<string, Record<string, string>> = { light, dark: { ...light, ...readTokenBlock(css, '.dark') } };
const name = (p: TokenPair) => `${p.fg} on ${p.bg}${p.bgAlpha ? ` at ${p.bgAlpha * 100}%` : ''}`;

describe.each(Object.entries(THEMES))('%s theme', (_theme, tokens) => {
  it('defines every token the components use', () => {
    expect(REQUIRED_TOKENS.filter((t: string) => !tokens[t])).toEqual([]);
  });

  it.each(TOKEN_PAIRS.map((p: TokenPair) => [name(p), p] as const))('%s meets WCAG AA', (_label, p) => {
    const ratio = pairContrast(tokens[p.fg], tokens[p.bg], tokens[p.ground ?? 'card'], p.bgAlpha ?? 1);
    expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO[p.use]);
  });
});

describe('spec values (§2, as amended by ruling R6)', () => {
  it('pins the brand, ink and ground', () => {
    expect(THEMES.light).toMatchObject({
      background: '#F3F5FA', card: '#FFFFFF', foreground: '#0B1B33', 'muted-foreground': '#5B6B82',
      primary: '#1554F0', accent: '#EAF0FE', ring: '#1554F0', 'secure-strong': '#137A6B', 'building-strong': '#8A5A00',
      'weak-strong': '#B5392A', destructive: '#B5392A', input: '#7F8DA3', border: '#E2E7F0',
    });
    expect(THEMES.dark).toMatchObject({
      background: '#0A1222', card: '#111B2E', foreground: '#E8EEF8', primary: '#6B95FF',
      'primary-foreground': '#08142B', ring: '#6B95FF', 'secure-strong': '#3CC3AE', input: '#5A6B88',
    });
  });

  it('carries the type scale, radii, depth and motion', () => {
    for (const rule of [
      '--text-caption: 12px', '--text-small: 13px', '--text-body: 15px', '--text-h3: 17px', '--text-h2: 20px',
      '--text-h1: 24px', '--text-h1-desktop: 30px', '--text-display: 36px', '--text-eyebrow: 11.5px',
      '--radius-control: 10px', '--radius-card: 16px',
      '--shadow-card: 0 1px 2px rgb(11 27 51 / 0.04)', '--shadow-overlay: 0 12px 32px -12px rgb(11 27 51 / 0.25)',
      '--ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1)',
    ]) expect(css).toContain(rule);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});

describe('one look for every portal', () => {
  it('has no portal-scoped tokens and no teacher variant', () => {
    expect(css).not.toMatch(/data-portal/);
    expect(css).not.toMatch(/@custom-variant teacher/);
  });

  it('sets tokens only on :root and .dark, so portaled dialogs, sheets and toasts get them too', () => {
    const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*--(?:background|primary|card):/g)].map((m: RegExpMatchArray) => m[1].trim());
    expect(selectors.sort()).toEqual(['.dark', ':root']);
  });

  it('loads Hanken Grotesk and Source Sans 3 with swap and puts them on <html> (spec §2.3, ruling R8)', () => {
    expect(layout).toMatch(/Hanken_Grotesk\(/);
    expect(layout).toMatch(/Source_Sans_3\(/);
    expect(layout.match(/display: 'swap'/g) ?? []).toHaveLength(2);
    expect(layout).toMatch(/<html[^>]*className=\{`\$\{display\.variable\} \$\{body\.variable\}/);
    expect(layout).not.toMatch(/\bInter\b/);
    expect(css).toContain('--font-sans: var(--font-body)');
    expect(css).toContain('--font-heading: var(--font-display)');
    expect(css).toContain('--font-mono: var(--font-display)');
  });

  it('leaves no night-back scope behind', () => {
    for (const gone of ['src/lib/fonts/teacher-fonts.ts', 'src/lib/portal-scope.ts', 'src/hooks/usePortalScope.ts']) {
      expect(existsSync(root(gone)), gone).toBe(false);
    }
  });
});
```

- [ ] **Step 3: Run both to see them fail**

Run: `npx vitest run tests/contrast.test.ts tests/design-tokens.test.ts`
Expected: FAIL with `Failed to resolve import "../src/lib/design/contrast"`.

- [ ] **Step 4: Write `src/lib/design/contrast.ts`**

```ts
/** WCAG 2 contrast for the token table (spec §2.2) and the /design gallery. Hex and rgb() only. */
export type Rgba = readonly [number, number, number, number];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i;

export function parseColour(value: string): Rgba {
  const v = value.trim();
  const hex = HEX.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c: string) => c + c).join('') : hex[1];
    const at = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [at(0), at(2), at(4), 1];
  }
  const rgb = RGB.exec(v);
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), alpha];
  }
  throw new Error(`Unsupported colour: ${value}`);
}

/** `top` painted over an opaque `base`. */
export function composite(top: Rgba, base: Rgba): Rgba {
  const a = top[3];
  return [top[0] * a + base[0] * (1 - a), top[1] * a + base[1] * (1 - a), top[2] * a + base[2] * (1 - a), 1];
}

export function relativeLuminance([r, g, b]: Rgba): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [relativeLuminance(fg), relativeLuminance(bg)].sort((x: number, y: number) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` on `bg`, where `bg` (at `bgAlpha`) sits on `ground`: tints are judged as painted. */
export function pairContrast(fg: string, bg: string, ground: string, bgAlpha = 1): number {
  const g = parseColour(ground);
  const b = parseColour(bg);
  const painted = composite([b[0], b[1], b[2], b[3] * bgAlpha], g);
  return contrastRatio(composite(parseColour(fg), painted), painted);
}
```

- [ ] **Step 5: Write `src/lib/design/token-pairs.ts`**

```ts
/**
 * Every text/background pair the components use (spec §2.2): text needs 4.5:1, UI edges and
 * chart marks 3:1. `--border` is a decorative hairline, never the only sign of a control (ruling R6).
 */
export type ContrastUse = 'text' | 'ui';

export interface TokenPair {
  fg: string;
  bg: string;
  use: ContrastUse;
  /** The fill painted at this opacity over the ground, e.g. `bg-primary/10`. */
  bgAlpha?: number;
  ground?: 'background' | 'card';
}

export const MIN_RATIO: Record<ContrastUse, number> = { text: 4.5, ui: 3 };

const text = (fg: string, bg: string, extra: Partial<TokenPair> = {}): TokenPair => ({ fg, bg, use: 'text', ...extra });
const ui = (fg: string, bg: string): TokenPair => ({ fg, bg, use: 'ui' });

export const TOKEN_PAIRS: readonly TokenPair[] = [
  text('foreground', 'background'), text('foreground', 'card'), text('foreground', 'muted'),
  text('card-foreground', 'card'), text('popover-foreground', 'popover'), text('secondary-foreground', 'secondary'),
  text('muted-foreground', 'background'), text('muted-foreground', 'card'), text('muted-foreground', 'muted'),
  text('primary-foreground', 'primary'), text('primary', 'card'), text('primary', 'background'),
  text('primary', 'primary', { bgAlpha: 0.1, ground: 'card' }), text('accent-foreground', 'accent'),
  text('destructive', 'card'), text('destructive', 'background'), text('destructive', 'destructive-soft'),
  text('destructive', 'destructive', { bgAlpha: 0.1, ground: 'background' }),
  text('success', 'success-soft'), text('attention', 'attention-soft'), text('info', 'info-soft'),
  text('secure-strong', 'secure'), text('building-strong', 'building'), text('weak-strong', 'weak'),
  text('secure-strong', 'card'), text('building-strong', 'card'), text('weak-strong', 'card'),
  text('tile-secure-ink', 'tile-secure'), text('tile-building-ink', 'tile-building'), text('tile-weak-ink', 'tile-weak'),
  text('sidebar-foreground', 'sidebar'), text('sidebar-label', 'sidebar'), text('sidebar-primary', 'sidebar'),
  text('sidebar-accent-foreground', 'sidebar-accent'),
  ui('input', 'card'), ui('input', 'background'), ui('ring', 'card'), ui('ring', 'background'), ui('primary', 'accent'),
  ui('chart-1', 'card'), ui('chart-2', 'card'), ui('chart-3', 'card'), ui('chart-4', 'card'), ui('chart-5', 'card'),
];

export const REQUIRED_TOKENS: readonly string[] = [
  ...new Set([...TOKEN_PAIRS.flatMap((p: TokenPair) => [p.fg, p.bg]), 'border', 'background', 'card']),
];

/** The custom properties declared in the first `selector { … }` block of a stylesheet. */
export function readTokenBlock(css: string, selector: string): Record<string, string> {
  const open = css.indexOf(`${selector} {`);
  if (open < 0) return {};
  const body = css.slice(open + selector.length + 2, css.indexOf('}', open));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}
```

- [ ] **Step 6: Run the contrast test to see it pass; the token test still fails**

Run: `npx vitest run tests/contrast.test.ts tests/design-tokens.test.ts`
Expected: `contrast.test.ts` PASS (6). `design-tokens.test.ts` FAIL: `defines every token` lists `secure`, `tile-secure`, …; `has no portal-scoped tokens` fails on `data-portal`.

- [ ] **Step 7: Rewrite `src/app/globals.css`**

Replace the whole file with:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

/* Blueprint (Phase D spec §2): one token set for every portal, light on :root, dark on .dark. */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent-soft: var(--accent-soft);
  --color-destructive: var(--destructive);
  --color-destructive-soft: var(--destructive-soft);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-attention: var(--attention);
  --color-attention-soft: var(--attention-soft);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-secure: var(--secure);
  --color-secure-strong: var(--secure-strong);
  --color-building: var(--building);
  --color-building-strong: var(--building-strong);
  --color-weak: var(--weak);
  --color-weak-strong: var(--weak-strong);
  --color-tile-secure: var(--tile-secure);
  --color-tile-secure-ink: var(--tile-secure-ink);
  --color-tile-building: var(--tile-building);
  --color-tile-building-ink: var(--tile-building-ink);
  --color-tile-weak: var(--tile-weak);
  --color-tile-weak-ink: var(--tile-weak-ink);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-label: var(--sidebar-label);

  --font-sans: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  --font-heading: var(--font-display), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-display), ui-monospace, monospace;

  --text-caption: 12px;
  --text-caption--line-height: 16px;
  --text-small: 13px;
  --text-small--line-height: 18px;
  --text-body: 15px;
  --text-body--line-height: 22px;
  --text-h3: 17px;
  --text-h3--line-height: 24px;
  --text-h2: 20px;
  --text-h2--line-height: 26px;
  --text-h1: 24px;
  --text-h1--line-height: 30px;
  --text-h1-desktop: 30px;
  --text-h1-desktop--line-height: 36px;
  --text-display: 36px;
  --text-display--line-height: 40px;
  --text-eyebrow: 11.5px;
  --text-eyebrow--line-height: 16px;
  --text-eyebrow--letter-spacing: 0.09em;

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
  --radius-control: 10px;
  --radius-card: 16px;

  --shadow-card: 0 1px 2px rgb(11 27 51 / 0.04);
  --shadow-overlay: 0 12px 32px -12px rgb(11 27 51 / 0.25);
  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
}

:root {
  --radius: 10px;
  --background: #F3F5FA;
  --foreground: #0B1B33;
  --card: #FFFFFF;
  --card-foreground: #0B1B33;
  --popover: #FFFFFF;
  --popover-foreground: #0B1B33;
  --primary: #1554F0;
  --primary-foreground: #FFFFFF;
  --secondary: #EEF1F7;
  --secondary-foreground: #0B1B33;
  --muted: #EEF1F7;
  --muted-foreground: #5B6B82;
  --accent: #EAF0FE;
  --accent-foreground: #1554F0;
  --accent-soft: #EAF0FE;
  --destructive: #B5392A;
  --destructive-soft: #FCE8E5;
  --border: #E2E7F0;
  --input: #7F8DA3;
  --ring: #1554F0;
  --success: #137A6B;
  --success-soft: #E3F4F1;
  --attention: #8A5A00;
  --attention-soft: #FCF1DC;
  --info: #1554F0;
  --info-soft: #EAF0FE;
  --secure: #E3F4F1;
  --secure-strong: #137A6B;
  --building: #FCF1DC;
  --building-strong: #8A5A00;
  --weak: #FCE8E5;
  --weak-strong: #B5392A;
  --tile-secure: #137A6B;
  --tile-secure-ink: #FFFFFF;
  --tile-building: #FCF1DC;
  --tile-building-ink: #8A5A00;
  --tile-weak: #B5392A;
  --tile-weak-ink: #FFFFFF;
  --chart-1: #1554F0;
  --chart-2: #137A6B;
  --chart-3: #B07515;
  --chart-4: #B5392A;
  --chart-5: #7A8BA6;
  --sidebar: #FFFFFF;
  --sidebar-foreground: #5B6B82;
  --sidebar-primary: #0B1B33;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #EAF0FE;
  --sidebar-accent-foreground: #1554F0;
  --sidebar-border: #E2E7F0;
  --sidebar-ring: #1554F0;
  --sidebar-label: #5B6B82;
}

.dark {
  --background: #0A1222;
  --foreground: #E8EEF8;
  --card: #111B2E;
  --card-foreground: #E8EEF8;
  --popover: #111B2E;
  --popover-foreground: #E8EEF8;
  --primary: #6B95FF;
  --primary-foreground: #08142B;
  --secondary: #16233A;
  --secondary-foreground: #E8EEF8;
  --muted: #16233A;
  --muted-foreground: #9AA8BF;
  --accent: #16264A;
  --accent-foreground: #9DB9FF;
  --accent-soft: #16264A;
  --destructive: #F07F6E;
  --destructive-soft: #3A1C18;
  --border: #22314A;
  --input: #5A6B88;
  --ring: #6B95FF;
  --success: #3CC3AE;
  --success-soft: #0F2F2B;
  --attention: #F2BE5C;
  --attention-soft: #33270F;
  --info: #9DB9FF;
  --info-soft: #16264A;
  --secure: #0F2F2B;
  --secure-strong: #3CC3AE;
  --building: #33270F;
  --building-strong: #F2BE5C;
  --weak: #3A1C18;
  --weak-strong: #F07F6E;
  --tile-secure: #0F2F2B;
  --tile-secure-ink: #3CC3AE;
  --tile-building: #33270F;
  --tile-building-ink: #F2BE5C;
  --tile-weak: #3A1C18;
  --tile-weak-ink: #F07F6E;
  --chart-1: #6B95FF;
  --chart-2: #3CC3AE;
  --chart-3: #F2BE5C;
  --chart-4: #F07F6E;
  --chart-5: #9AA8BF;
  --sidebar: #111B2E;
  --sidebar-foreground: #9AA8BF;
  --sidebar-primary: #E8EEF8;
  --sidebar-primary-foreground: #08142B;
  --sidebar-accent: #16264A;
  --sidebar-accent-foreground: #9DB9FF;
  --sidebar-border: #22314A;
  --sidebar-ring: #6B95FF;
  --sidebar-label: #9AA8BF;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    @apply font-sans;
    -webkit-text-size-adjust: 100%;
  }
  body {
    @apply bg-background text-body text-foreground;
  }
  h1, h2, h3, h4 {
    @apply font-heading;
    text-wrap: balance;
    letter-spacing: -0.015em;
  }
  .font-mono, .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 8: Load the fonts in `src/app/layout.tsx`**

Replace the `Inter` import and constant, and the `<html>` class:

```tsx
import type { Metadata } from "next";
import { Hanken_Grotesk, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Blueprint type (spec §2.3): Hanken Grotesk for headings and numbers, Source Sans 3 for body and UI.
// Both are variable fonts, so one self-hosted file each covers every weight the scale uses (ruling R8).
const display = Hanken_Grotesk({ variable: '--font-display', subsets: ['latin'], display: 'swap' });
const body = Source_Sans_3({ variable: '--font-body', subsets: ['latin'], display: 'swap' });
```

and

```tsx
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
```

Leave `metadata` and the `<body>` element unchanged.

- [ ] **Step 9: Remove the portal scope**

In `src/app/(dashboard)/layout.tsx` delete the three imports `usePortalScope`, `portalForUser` and `TEACHER_FONT_VARIABLES`, and the three lines `const portal = …`, `const portalFonts = …`, `usePortalScope(portal, portalFonts);`. Replace the frame `div` opening with:

```tsx
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
```

and change `<TopBar items={portal ? navItems : undefined} />` to `<TopBar items={navItems} />`. Remove the `cn` import if nothing else uses it. Then:

```bash
git rm src/lib/portal-scope.ts src/hooks/usePortalScope.ts src/lib/fonts/teacher-fonts.ts tests/teacher-tokens.test.ts tests/teacher-fonts.test.ts tests/portal-scope.test.ts
```

In `tests/teacher-colour-guard.test.ts` delete the `PRIMARY_TEXT` constant and the two tests that use it: "keeps violet text on the readable ink token" and "lets text-primary through only with a teacher: override". Keep `MIGRATED`, `RAW` and the other two tests.

- [ ] **Step 10: Run the token tests to see them pass**

Run: `npx vitest run tests/contrast.test.ts tests/design-tokens.test.ts`
Expected: PASS: every pair in both themes, and all `one look` tests.

- [ ] **Step 11: Run the full unit suite and the type-check**

Run: `npx vitest run`
Expected: PASS. No test imports the deleted modules (`grep -rn "portal-scope\|teacher-fonts\|usePortalScope" src tests` prints nothing).

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 12: Commit**

```bash
git add -A src/app/globals.css src/app/layout.tsx "src/app/(dashboard)/layout.tsx" src/lib/design tests/contrast.test.ts tests/design-tokens.test.ts tests/teacher-colour-guard.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(design): Blueprint tokens and type for every portal; drop the teacher portal scope" -m "Tokens per spec §2 with the AA fixes of plan ruling R6; Hanken Grotesk + Source Sans 3 via next/font on <html>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Readiness helpers (mastery, exam map, countdown, band, example data)

**Files:**
- Create: `src/lib/readiness/mastery.ts`, `src/lib/readiness/exam-map.ts`, `src/lib/readiness/countdown.ts`, `src/lib/readiness/band.ts`, `src/lib/readiness/example-data.ts`
- Test: `tests/readiness-mastery.test.ts`, `tests/exam-map.test.ts`, `tests/countdown.test.ts`, `tests/readiness-band.test.ts`

**Interfaces:**
- Produces:
  - `type MasteryLevel = 'secure' | 'building' | 'weak'`; `MASTERY_THRESHOLDS = { secure: 70, building: 60 }`; `MASTERY_LABEL: Record<MasteryLevel, string>`; `masteryLevel(pct: number): MasteryLevel`; `marksToGain(marks: number, masteryPct: number): number`.
  - `interface ExamTopic { id: string; name: string; section: string; marks: number; mastery: number | null }`; `type TileLevel = MasteryLevel | 'untested'`; `interface ExamMapTile { id: string; name: string; marks: number; mastery: number | null; level: TileLevel; marksToGain: number | null }`; `interface ExamMapRow { section: string; marks: number; tiles: ExamMapTile[] }`; `TILE_LABEL: Record<TileLevel, string>`; `layoutExamMap(topics: readonly ExamTopic[]): ExamMapRow[]`; `examMapLabel(paper: string, rows: readonly ExamMapRow[]): string`; `totalMarksToGain(rows: readonly ExamMapRow[]): number`; `topicsByGain(rows: readonly ExamMapRow[]): ExamMapTile[]`.
  - `daysUntil(exam: Date, now: Date): number`; `formatExamDate(d: Date): string`; `countdownText(paper: string, exam: Date, now: Date): string`.
  - `interface ReadinessBandInput { low: number; high: number; target: number }`; `interface BandGeometry { left: number; width: number; targetAt: number; toTarget: number; reachesTarget: boolean }`; `bandGeometry(b: ReadinessBandInput): BandGeometry`; `bandSentence(b: ReadinessBandInput): string`.
  - `EXAMPLE_READINESS` (the mockup's learner) used by the gallery in Task 12.

- [ ] **Step 1: Write the failing tests**

`tests/readiness-mastery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MASTERY_LABEL, marksToGain, masteryLevel } from '../src/lib/readiness/mastery';

describe('masteryLevel (spec §2.1: secure ≥ 70, building 60–69, weak < 60)', () => {
  it.each([[70, 'secure'], [100, 'secure'], [69.9, 'building'], [60, 'building'], [59.9, 'weak'], [0, 'weak']] as const)(
    '%s%% is %s', (pct, level) => {
      expect(masteryLevel(pct)).toBe(level);
    },
  );

  it('clamps out-of-range numbers instead of inventing a level', () => {
    expect(masteryLevel(140)).toBe('secure');
    expect(masteryLevel(-5)).toBe('weak');
  });

  it('refuses NaN: a topic with no evidence is null upstream, never "weak" (ruling R18)', () => {
    expect(() => masteryLevel(Number.NaN)).toThrow(RangeError);
  });

  it('names each level in plain words', () => {
    expect(MASTERY_LABEL).toEqual({ secure: 'Secure', building: 'Building', weak: 'Weak' });
  });
});

describe('marksToGain', () => {
  it('is the marks not yet secured, to one decimal (the mockup figures)', () => {
    expect(marksToGain(35, 49)).toBe(17.9);
    expect(marksToGain(15, 82)).toBe(2.7);
  });

  it('is zero at full mastery and never negative', () => {
    expect(marksToGain(25, 100)).toBe(0);
    expect(marksToGain(25, 120)).toBe(0);
    expect(marksToGain(-3, 50)).toBe(0);
  });
});
```

`tests/exam-map.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { examMapLabel, layoutExamMap, topicsByGain, totalMarksToGain, type ExamTopic } from '../src/lib/readiness/exam-map';
import { EXAMPLE_READINESS } from '../src/lib/readiness/example-data';

const t = (id: string, section: string, marks: number, mastery: number | null): ExamTopic => ({ id, name: id, section, marks, mastery });

describe('layoutExamMap', () => {
  it('groups topics into rows by paper section, in the order sections first appear', () => {
    const rows = layoutExamMap([t('fn', 'A', 35, 49), t('alg', 'B', 25, 78), t('calc', 'A', 35, 52)]);
    expect(rows.map((r) => [r.section, r.marks, r.tiles.map((x) => x.id)])).toEqual([['A', 70, ['fn', 'calc']], ['B', 25, ['alg']]]);
  });

  it('colours each tile with masteryLevel and works out its marks to gain', () => {
    const [row] = layoutExamMap([t('fn', 'A', 35, 49), t('prob', 'A', 15, 64), t('fin', 'A', 15, 82)]);
    expect(row.tiles.map((x) => [x.level, x.marksToGain])).toEqual([['weak', 17.9], ['building', 5.4], ['secure', 2.7]]);
  });

  it('shows a topic with no evidence as untested, not weak', () => {
    const [row] = layoutExamMap([t('new', 'A', 20, null)]);
    expect(row.tiles[0]).toMatchObject({ level: 'untested', marksToGain: null, mastery: null });
  });

  it('leaves out topics worth no marks, and a section left empty', () => {
    expect(layoutExamMap([t('x', 'A', 0, 50), t('y', 'B', -2, 50), t('z', 'B', Number.NaN, 50)])).toEqual([]);
  });

  it('is empty for an empty blueprint', () => {
    expect(layoutExamMap([])).toEqual([]);
  });
});

describe('examMapLabel', () => {
  it('says the size of the paper and how the learner stands (the mockup)', () => {
    expect(examMapLabel('Paper 1', layoutExamMap(EXAMPLE_READINESS.topics))).toBe('Paper 1: 150 marks in 6 topics; 2 weak, 1 building, 3 secure');
  });

  it('handles one untested topic', () => {
    expect(examMapLabel('Paper 2', layoutExamMap([t('a', 'A', 10, null)]))).toBe('Paper 2: 10 marks in 1 topic; 1 not yet tested');
  });
});

describe('marks at stake', () => {
  it('totals 56 of 150 in the mockup', () => {
    expect(totalMarksToGain(layoutExamMap(EXAMPLE_READINESS.topics))).toBe(56);
  });

  it('orders topics by marks to gain, most first, untested last', () => {
    const rows = layoutExamMap([t('a', 'A', 10, 90), t('b', 'A', 30, 40), t('c', 'B', 50, null), t('d', 'B', 20, 50)]);
    expect(topicsByGain(rows).map((x) => x.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});
```

`tests/countdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countdownText, daysUntil, formatExamDate } from '../src/lib/readiness/countdown';

const exam = new Date(2026, 9, 27, 9, 0); // Tue 27 Oct 2026, 09:00 local

describe('countdownText (spec §1: "32 days to Paper 1 · Tue 27 Oct")', () => {
  it('counts calendar days, as in the mockup', () => {
    expect(countdownText('Paper 1', exam, new Date(2026, 8, 25, 14, 0))).toBe('32 days to Paper 1 · Tue 27 Oct');
  });

  it('says one day the evening before, even at 23:59 local time', () => {
    expect(countdownText('Paper 1', exam, new Date(2026, 9, 26, 23, 59))).toBe('1 day to Paper 1 · Tue 27 Oct');
  });

  it('says today from just after midnight on the day', () => {
    expect(countdownText('Paper 1', exam, new Date(2026, 9, 27, 0, 5))).toBe('Paper 1 is today · Tue 27 Oct');
  });

  it('never counts negative days after the exam', () => {
    expect(countdownText('Paper 1', exam, new Date(2026, 9, 28, 8, 0))).toBe('Paper 1 was on Tue 27 Oct');
    expect(daysUntil(exam, new Date(2026, 9, 28))).toBe(-1);
  });
});

describe('formatExamDate', () => {
  it('writes short weekday, day and month without the locale', () => {
    expect(formatExamDate(new Date(2027, 0, 1))).toBe('Fri 1 Jan');
  });
});
```

`tests/readiness-band.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bandGeometry, bandSentence } from '../src/lib/readiness/band';

describe('bandGeometry', () => {
  it('places the predicted band and the target on a 0–100 scale (the mockup: 58–64 against 75)', () => {
    expect(bandGeometry({ low: 58, high: 64, target: 75 })).toEqual({ left: 58, width: 6, targetAt: 75, toTarget: 11, reachesTarget: false });
  });

  it('accepts the ends in either order and clamps to 0–100', () => {
    expect(bandGeometry({ low: 110, high: 95, target: 120 })).toEqual({ left: 95, width: 5, targetAt: 100, toTarget: 0, reachesTarget: true });
  });
});

describe('bandSentence', () => {
  it('says how far the band is from the target', () => {
    expect(bandSentence({ low: 58, high: 64, target: 75 })).toBe('Heading for 58–64%. Target 75%: 11 points to go.');
  });

  it('says when the band reaches the target', () => {
    expect(bandSentence({ low: 72, high: 80, target: 75 })).toBe('Heading for 72–80%. On track for your 75% target.');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/readiness-mastery.test.ts tests/exam-map.test.ts tests/countdown.test.ts tests/readiness-band.test.ts`
Expected: FAIL with `Failed to resolve import "../src/lib/readiness/mastery"` (and the same for the other modules).

- [ ] **Step 3: Write `src/lib/readiness/mastery.ts`**

```ts
export type MasteryLevel = 'secure' | 'building' | 'weak';

/** Spec §2.1: secure ≥ 70%, building 60–69%, weak < 60%. The only place these numbers live. */
export const MASTERY_THRESHOLDS = { secure: 70, building: 60 } as const;

export const MASTERY_LABEL: Record<MasteryLevel, string> = { secure: 'Secure', building: 'Building', weak: 'Weak' };

const clampPct = (v: number) => Math.min(100, Math.max(0, v));

export function masteryLevel(pct: number): MasteryLevel {
  if (Number.isNaN(pct)) throw new RangeError('masteryLevel needs a number: pass mastery only once it is known (null means untested)');
  const p = clampPct(pct);
  if (p >= MASTERY_THRESHOLDS.secure) return 'secure';
  if (p >= MASTERY_THRESHOLDS.building) return 'building';
  return 'weak';
}

/** Marks a learner gains by securing the topic: marks × (100 − mastery)%, to one decimal. */
export function marksToGain(marks: number, masteryPct: number): number {
  const m = Math.max(0, marks);
  return Math.round((m * (100 - clampPct(masteryPct))) / 10) / 10;
}
```

- [ ] **Step 4: Write `src/lib/readiness/exam-map.ts`**

```ts
import { MASTERY_LABEL, marksToGain, masteryLevel, type MasteryLevel } from './mastery';

/** One topic of a paper's blueprint: its marks in the final exam and the learner's mastery (null = no evidence yet). */
export interface ExamTopic {
  id: string;
  name: string;
  section: string;
  marks: number;
  mastery: number | null;
}

export type TileLevel = MasteryLevel | 'untested';

export interface ExamMapTile {
  id: string;
  name: string;
  marks: number;
  mastery: number | null;
  level: TileLevel;
  marksToGain: number | null;
}

export interface ExamMapRow {
  section: string;
  marks: number;
  tiles: ExamMapTile[];
}

export const TILE_LABEL: Record<TileLevel, string> = { ...MASTERY_LABEL, untested: 'Not yet tested' };

/** Rows by paper section (first-seen order); each tile's size is its marks, its colour its mastery (spec §4). */
export function layoutExamMap(topics: readonly ExamTopic[]): ExamMapRow[] {
  const rows = new Map<string, ExamMapTile[]>();
  for (const topic of topics) {
    if (!(topic.marks > 0)) continue;
    const tested = topic.mastery !== null;
    const tile: ExamMapTile = {
      id: topic.id,
      name: topic.name,
      marks: topic.marks,
      mastery: topic.mastery,
      level: tested ? masteryLevel(topic.mastery as number) : 'untested',
      marksToGain: tested ? marksToGain(topic.marks, topic.mastery as number) : null,
    };
    rows.set(topic.section, [...(rows.get(topic.section) ?? []), tile]);
  }
  return [...rows].map(([section, tiles]) => ({ section, tiles, marks: tiles.reduce((sum: number, x: ExamMapTile) => sum + x.marks, 0) }));
}

/** The map's accessible name: the paper's size and how the learner stands across it. */
export function examMapLabel(paper: string, rows: readonly ExamMapRow[]): string {
  const tiles = rows.flatMap((r: ExamMapRow) => r.tiles);
  const total = tiles.reduce((sum: number, x: ExamMapTile) => sum + x.marks, 0);
  const count = (level: TileLevel) => tiles.filter((x: ExamMapTile) => x.level === level).length;
  const parts = (['weak', 'building', 'secure', 'untested'] as const)
    .filter((level: TileLevel) => count(level) > 0)
    .map((level: TileLevel) => `${count(level)} ${TILE_LABEL[level].toLowerCase()}`);
  const topics = `${tiles.length} ${tiles.length === 1 ? 'topic' : 'topics'}`;
  return `${paper}: ${total} marks in ${topics}${parts.length > 0 ? `; ${parts.join(', ')}` : ''}`;
}

/** "Marks at stake": marks to gain across tested topics, to the whole mark. */
export function totalMarksToGain(rows: readonly ExamMapRow[]): number {
  return Math.round(rows.flatMap((r: ExamMapRow) => r.tiles).reduce((sum: number, x: ExamMapTile) => sum + (x.marksToGain ?? 0), 0));
}

/** Topics by marks to gain, most first; untested topics last in blueprint order. */
export function topicsByGain(rows: readonly ExamMapRow[]): ExamMapTile[] {
  const tiles = rows.flatMap((r: ExamMapRow) => r.tiles);
  const tested = tiles.filter((x: ExamMapTile) => x.marksToGain !== null)
    .sort((a: ExamMapTile, b: ExamMapTile) => (b.marksToGain ?? 0) - (a.marksToGain ?? 0));
  return [...tested, ...tiles.filter((x: ExamMapTile) => x.marksToGain === null)];
}
```

- [ ] **Step 5: Write `src/lib/readiness/countdown.ts`**

```ts
const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The local calendar day as a UTC timestamp, so daylight saving and UTC offsets never shift the count. */
const dayStamp = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole calendar days from `now` to `exam` in the user's own time zone; negative once the exam has passed. */
export function daysUntil(exam: Date, now: Date): number {
  return Math.round((dayStamp(exam) - dayStamp(now)) / DAY_MS);
}

export function formatExamDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Spec §1: "32 days to Paper 1 · Tue 27 Oct". */
export function countdownText(paper: string, exam: Date, now: Date): string {
  const days = daysUntil(exam, now);
  const date = formatExamDate(exam);
  if (days > 1) return `${days} days to ${paper} · ${date}`;
  if (days === 1) return `1 day to ${paper} · ${date}`;
  if (days === 0) return `${paper} is today · ${date}`;
  return `${paper} was on ${date}`;
}
```

- [ ] **Step 6: Write `src/lib/readiness/band.ts`**

```ts
export interface ReadinessBandInput {
  low: number;
  high: number;
  target: number;
}

export interface BandGeometry {
  /** Percent from the left of a 0–100 track. */
  left: number;
  width: number;
  targetAt: number;
  /** Points from the top of the band to the target; 0 once the band reaches it. */
  toTarget: number;
  reachesTarget: boolean;
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));

export function bandGeometry({ low, high, target }: ReadinessBandInput): BandGeometry {
  const lo = clamp(Math.min(low, high));
  const hi = clamp(Math.max(low, high));
  const t = clamp(target);
  return { left: lo, width: hi - lo, targetAt: t, toTarget: Math.max(0, t - hi), reachesTarget: hi >= t };
}

export function bandSentence(input: ReadinessBandInput): string {
  const g = bandGeometry(input);
  const band = `Heading for ${g.left}–${g.left + g.width}%.`;
  return g.reachesTarget
    ? `${band} On track for your ${g.targetAt}% target.`
    : `${band} Target ${g.targetAt}%: ${g.toTarget} points to go.`;
}
```

- [ ] **Step 7: Write `src/lib/readiness/example-data.ts`**

```ts
import type { ExamTopic } from './exam-map';

const LATER = 'Algebra, patterns, finance and probability';

/** The approved mockup's learner (direction C). Example names and numbers, shown only in the /design gallery. */
export const EXAMPLE_READINESS = {
  learner: 'Anele Khumalo',
  grade: 'Grade 12',
  subject: 'Mathematics',
  teacher: 'Ms Dube',
  paper: 'Paper 1',
  examDate: new Date(2026, 9, 27),
  total: 150,
  answers: 211,
  band: { low: 58, high: 64, target: 75 },
  topics: [
    { id: 'functions', name: 'Functions & graphs', section: 'Functions and calculus', marks: 35, mastery: 49 },
    { id: 'calculus', name: 'Differential calculus', section: 'Functions and calculus', marks: 35, mastery: 52 },
    { id: 'algebra', name: 'Algebra, equations & inequalities', section: LATER, marks: 25, mastery: 78 },
    { id: 'sequences', name: 'Sequences & series', section: LATER, marks: 25, mastery: 71 },
    { id: 'finance', name: 'Financial maths', section: LATER, marks: 15, mastery: 82 },
    { id: 'probability', name: 'Probability', section: LATER, marks: 15, mastery: 64 },
  ] satisfies ExamTopic[],
  trend: [
    { label: 'W1', value: 48 }, { label: 'W2', value: 51 }, { label: 'W3', value: 53 },
    { label: 'W4', value: 55 }, { label: 'W5', value: 58 }, { label: 'Now', value: 61 },
  ],
  nextUp: {
    eyebrow: 'Sat · Mock exam · 75 marks',
    title: 'Paper 1 mini-mock, aimed at your gaps',
    detail: '90 minutes, timed. Functions and calculus weighted up.',
    actionLabel: 'Book it',
    href: '/design#next-up',
  },
};
```

- [ ] **Step 8: Run the tests to see them pass**

Run: `npx vitest run tests/readiness-mastery.test.ts tests/exam-map.test.ts tests/countdown.test.ts tests/readiness-band.test.ts`
Expected: PASS (every test).

- [ ] **Step 9: Commit**

```bash
git add src/lib/readiness tests/readiness-mastery.test.ts tests/exam-map.test.ts tests/countdown.test.ts tests/readiness-band.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(readiness): masteryLevel, exam-map layout, countdown and band helpers" -m "Pure helpers for the Blueprint readiness components (spec §2.1, §4); untested topics are null, never weak.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `chartTheme`, `useChartTheme`, `trendDomain`

**Files:**
- Create: `src/lib/charts/chart-theme.ts`
- Create: `src/hooks/useChartTheme.ts`
- Test: `tests/chart-theme.test.ts`

**Interfaces:**
- Consumes: `readTokenBlock` (Task 2).
- Produces: `interface ChartTheme { series: readonly string[]; grid: string; axis: string; text: string; target: string; surface: string; border: string; fontFamily: string }`; `type TokenReader = (token: string) => string`; `CHART_SERIES_TOKENS`; `chartTheme(read: TokenReader): ChartTheme`; `seriesColour(theme: ChartTheme, index: number): string`; `trendDomain(values: readonly number[], target?: number): [number, number]`; `useChartTheme(): ChartTheme | null`. Tasks 11 and 15 use these; no chart sets its own colours.

- [ ] **Step 1: Write the failing test**

`tests/chart-theme.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { chartTheme, seriesColour, trendDomain } from '../src/lib/charts/chart-theme';
import { readTokenBlock } from '../src/lib/design/token-pairs';

const css = readFileSync(path.resolve(__dirname, '../src/app/globals.css'), 'utf8');
const light = readTokenBlock(css, ':root');
const dark = { ...light, ...readTokenBlock(css, '.dark') };
const reader = (tokens: Record<string, string>) => (token: string) => tokens[token] ?? '';

describe('chartTheme', () => {
  it('takes every colour from the tokens (spec §4: no chart sets its own colours)', () => {
    const theme = chartTheme(reader(light));
    expect(theme.series).toEqual([light['chart-1'], light['chart-2'], light['chart-3'], light['chart-4'], light['chart-5']]);
    expect(theme).toMatchObject({ grid: light.border, axis: light['muted-foreground'], text: light.foreground, target: light['secure-strong'], surface: light.popover });
  });

  it('follows the theme: the dark tokens give the dark colours', () => {
    expect(chartTheme(reader(dark)).series[0]).toBe('#6B95FF');
    expect(chartTheme(reader(light)).series[0]).toBe('#1554F0');
  });

  it('trims the spaces getComputedStyle leaves', () => {
    expect(chartTheme(reader({ ...light, 'chart-1': ' #1554F0 ' })).series[0]).toBe('#1554F0');
  });

  it('fails loudly when a token is missing rather than drawing black', () => {
    expect(() => chartTheme(reader({}))).toThrow(/--chart-1/);
  });

  it('wraps series colours when a chart has more series than tokens', () => {
    const theme = chartTheme(reader(light));
    expect(seriesColour(theme, 5)).toBe(theme.series[0]);
    expect(seriesColour(theme, -1)).toBe(theme.series[4]);
  });
});

describe('trendDomain', () => {
  it('rounds out to tens around the values and the target (the mockup: 40–80)', () => {
    expect(trendDomain([48, 51, 53, 55, 58, 61], 75)).toEqual([40, 80]);
  });

  it('stays within 0–100', () => {
    expect(trendDomain([2, 99])).toEqual([0, 100]);
  });

  it('gives a flat line some room', () => {
    expect(trendDomain([50, 50])).toEqual([40, 60]);
  });

  it('falls back to 0–100 with no usable values', () => {
    expect(trendDomain([])).toEqual([0, 100]);
    expect(trendDomain([Number.NaN])).toEqual([0, 100]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/chart-theme.test.ts`
Expected: FAIL with `Failed to resolve import "../src/lib/charts/chart-theme"`.

- [ ] **Step 3: Write `src/lib/charts/chart-theme.ts`**

```ts
/** One Recharts theme from the Blueprint tokens (spec §4). Recharts needs literal colours, so they are read at runtime. */
export interface ChartTheme {
  series: readonly string[];
  grid: string;
  axis: string;
  text: string;
  target: string;
  surface: string;
  border: string;
  fontFamily: string;
}

export type TokenReader = (token: string) => string;

export const CHART_SERIES_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const;

export function chartTheme(read: TokenReader): ChartTheme {
  const get = (token: string): string => {
    const value = read(token).trim();
    if (!value) throw new Error(`Chart token --${token} is not defined`);
    return value;
  };
  return {
    series: CHART_SERIES_TOKENS.map(get),
    grid: get('border'),
    axis: get('muted-foreground'),
    text: get('foreground'),
    target: get('secure-strong'),
    surface: get('popover'),
    border: get('border'),
    fontFamily: 'var(--font-body), ui-sans-serif, system-ui, sans-serif',
  };
}

export function seriesColour(theme: ChartTheme, index: number): string {
  const n = theme.series.length;
  return theme.series[((index % n) + n) % n];
}

/** A percent axis rounded out to tens around the values and the target, within 0–100. */
export function trendDomain(values: readonly number[], target?: number): [number, number] {
  const all = [...values, ...(target === undefined ? [] : [target])].filter((v: number) => Number.isFinite(v));
  if (all.length === 0) return [0, 100];
  const lo = Math.max(0, Math.floor((Math.min(...all) - 5) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...all) + 5) / 10) * 10);
  return lo === hi ? [Math.max(0, lo - 10), Math.min(100, hi + 10)] : [lo, hi];
}
```

- [ ] **Step 4: Write `src/hooks/useChartTheme.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { chartTheme, type ChartTheme } from '@/lib/charts/chart-theme';

const readFromDocument = (token: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(`--${token}`);

/**
 * The chart theme from the live tokens, recomputed when light/dark changes. Read one frame later,
 * because next-themes swaps the `dark` class in its own effect, which runs after this child's.
 * Null until mounted: the server has no computed styles.
 */
export function useChartTheme(): ChartTheme | null {
  const { resolvedTheme } = useTheme();
  const [theme, setTheme] = useState<ChartTheme | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(chartTheme(readFromDocument)));
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme]);

  return theme;
}
```

- [ ] **Step 5: Run it to see it pass, then type-check**

Run: `npx vitest run tests/chart-theme.test.ts`
Expected: PASS (9).

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/charts/chart-theme.ts src/hooks/useChartTheme.ts tests/chart-theme.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(charts): one chart theme read from the tokens" -m "chartTheme(read) + useChartTheme() so Recharts gets real colours that follow light and dark (ruling R17).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Base controls (button, input, textarea, select, checkbox, radio, switch, slider, tabs)

Styles only; every export, prop, variant and size name stays (ruling R12). Read each file before editing it: replace the named class strings and keep the rest of the component (data attributes, `data-slot`, base-ui wiring) as it is.

**Files:**
- Create: `src/components/ui/focus.ts`
- Create: `src/components/ui/button-variants.ts`
- Modify: `src/components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx` (trigger only; popup is Task 6), `checkbox.tsx`, `radio-group.tsx`, `switch.tsx`, `slider.tsx`, `input-group.tsx`, `label.tsx`, `tabs.tsx`
- Test: `tests/ui-controls.test.ts`
- Create: `tests/support/source.ts` (shared by the source-scan tests from here on)

**Interfaces:**
- Produces: `FOCUS_RING`, `TOUCH_TARGET`, `MOTION` (strings) from `@/components/ui/focus`; `buttonVariants` from `@/components/ui/button-variants`, still re-exported from `@/components/ui/button`; `readSource(rel: string): string`, `listSourceFiles(relDir: string): string[]`, `ROOT: string` from `tests/support/source.ts`.

- [ ] **Step 1: Write the test support and the failing test**

`tests/support/source.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..', '..');

export function readSource(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Every .ts/.tsx file under a repo-relative directory, as repo-relative posix paths. */
export function listSourceFiles(relDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path.relative(ROOT, full).split(path.sep).join('/'));
    }
  };
  walk(path.join(ROOT, relDir));
  return out.sort();
}
```

`tests/ui-controls.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buttonVariants } from '../src/components/ui/button-variants';
import { FOCUS_RING, TOUCH_TARGET } from '../src/components/ui/focus';
import { readSource } from './support/source';

const tokens = (classes: string) => classes.split(/\s+/).filter(Boolean);
const includesAll = (classes: string, wanted: string) => tokens(wanted).every((c: string) => tokens(classes).includes(c));
const ui = (file: string) => readSource(`src/components/ui/${file}`);

describe('focus and touch constants (spec §2.4)', () => {
  it('draws a 2px ring with a 2px offset', () => {
    expect(tokens(FOCUS_RING)).toEqual(expect.arrayContaining(['focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2']));
  });

  it('makes a 44px target on phones only', () => {
    expect(TOUCH_TARGET).toBe('min-h-11 md:min-h-0');
  });
});

describe('buttons', () => {
  it.each(['default', 'lg', 'icon', 'icon-lg'] as const)('%s is a 44px touch target on phones', (size) => {
    expect(includesAll(buttonVariants({ size }), TOUCH_TARGET)).toBe(true);
  });

  it.each(['icon', 'icon-lg'] as const)('%s is 44px wide on phones too', (size) => {
    expect(tokens(buttonVariants({ size }))).toContain('min-w-11');
  });

  it.each(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const)('%s shows the focus ring', (variant) => {
    expect(includesAll(buttonVariants({ variant }), FOCUS_RING)).toBe(true);
  });

  it('primary is the one filled cobalt button', () => {
    expect(tokens(buttonVariants({ variant: 'default' }))).toContain('bg-primary');
    for (const variant of ['outline', 'secondary', 'ghost', 'link'] as const) {
      expect(tokens(buttonVariants({ variant }))).not.toContain('bg-primary');
    }
  });

  it('uses the 10px control radius', () => {
    expect(tokens(buttonVariants())).toContain('rounded-control');
  });

  it('keeps buttonVariants importable from button.tsx', () => {
    expect(ui('button.tsx')).toMatch(/export \{ Button, buttonVariants \}/);
  });
});

describe('form controls', () => {
  it.each(['input.tsx', 'textarea.tsx', 'select.tsx', 'checkbox.tsx', 'radio-group.tsx', 'switch.tsx', 'slider.tsx', 'tabs.tsx', 'input-group.tsx'])(
    '%s uses the shared focus ring', (file) => {
      expect(ui(file)).toMatch(/\bFOCUS_RING\b/);
    },
  );

  it.each(['input.tsx', 'textarea.tsx', 'select.tsx', 'checkbox.tsx', 'radio-group.tsx'])('%s draws its edge with the 3:1 input token', (file) => {
    expect(ui(file)).toMatch(/\bborder-input\b/);
  });

  it.each(['input.tsx', 'select.tsx'])('%s is a 44px touch target on phones', (file) => {
    expect(ui(file)).toMatch(/\bTOUCH_TARGET\b/);
  });

  it('tabs default to the underline style (spec §4)', () => {
    expect(ui('tabs.tsx')).toMatch(/variant = "line"/);
    expect(ui('tabs.tsx')).toMatch(/defaultVariants: \{\s*variant: "line"/);
  });

  it('no control keeps the old soft ring-3 focus', () => {
    for (const file of ['button-variants.ts', 'input.tsx', 'textarea.tsx', 'select.tsx']) expect(ui(file)).not.toMatch(/ring-3/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/ui-controls.test.ts`
Expected: FAIL with `Failed to resolve import "../src/components/ui/button-variants"`.

- [ ] **Step 3: Write `src/components/ui/focus.ts`**

```ts
/** Spec §2.4: a visible 2px focus ring with a 2px offset on every interactive element. */
export const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Spec §2.4: 44px touch targets on phones; from md up controls return to their compact height (ruling R13). */
export const TOUCH_TARGET = 'min-h-11 md:min-h-0';

/** Spec §2.4: 150ms for hover and press, on the standard curve (off under reduced motion, globals.css). */
export const MOTION = 'transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-standard';
```

- [ ] **Step 4: Write `src/components/ui/button-variants.ts` and slim `button.tsx`**

```ts
import { cva } from 'class-variance-authority';
import { FOCUS_RING, MOTION, TOUCH_TARGET } from './focus';

/** Spec §4: primary = the one filled cobalt button; outline = secondary; ghost; soft destructive. Names unchanged (ruling R12). */
export const buttonVariants = cva(
  [
    'group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control border border-transparent bg-clip-padding',
    'text-sm font-semibold whitespace-nowrap select-none',
    MOTION,
    FOCUS_RING,
    'active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border-input bg-card text-foreground hover:bg-muted aria-expanded:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-muted aria-expanded:bg-muted',
        ghost: 'text-foreground hover:bg-muted aria-expanded:bg-muted',
        destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/15',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: `h-9 px-3.5 ${TOUCH_TARGET}`,
        xs: "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-2.5 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: `h-10 px-4 text-[15px] ${TOUCH_TARGET}`,
        icon: `size-9 ${TOUCH_TARGET} min-w-11 md:min-w-0`,
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': `size-10 ${TOUCH_TARGET} min-w-11 md:min-w-0`,
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
```

In `button.tsx` delete the `cva` import and the inline `buttonVariants` definition, and import it instead:

```tsx
"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"
```

Keep the `Button` function and `export { Button, buttonVariants }` as they are.

- [ ] **Step 5: Restyle the form controls**

`input.tsx`: replace the `cn(` first argument with:

```tsx
        "h-10 w-full min-w-0 rounded-control border border-input bg-card px-3 py-1 text-base text-foreground md:h-9 md:text-sm",
        TOUCH_TARGET,
        MOTION,
        FOCUS_RING,
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
```

and add `import { FOCUS_RING, MOTION, TOUCH_TARGET } from "./focus"`. `text-base` (16px) stays on phones so iOS does not zoom on focus.

`textarea.tsx`: the same classes without `TOUCH_TARGET`, with `min-h-20 py-2` in place of `h-10 … md:h-9`.

`select.tsx` `SelectTrigger`: use the input classes above (with `TOUCH_TARGET`) plus the trigger's existing layout classes (`flex items-center justify-between gap-2 …`); drop any `ring-3` class.

`checkbox.tsx` root: `peer relative size-[18px] shrink-0 rounded-[5px] border border-input bg-card data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground disabled:opacity-50 after:absolute after:-inset-3 md:after:inset-0` + `FOCUS_RING` + `MOTION`. The `after:` inset gives a 44px hit area on phones without growing the box.

`radio-group.tsx` item: the same, with `rounded-full` and an indicator dot `size-2 rounded-full bg-primary-foreground`.

`switch.tsx` root: `peer inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-input p-0.5 data-checked:bg-primary disabled:opacity-50` + `FOCUS_RING` + `MOTION`; thumb: `size-5 rounded-full bg-card shadow-card transition-transform duration-150 ease-standard data-checked:translate-x-4`.

`slider.tsx`: track `h-1.5 rounded-full bg-muted`, range `bg-primary`, thumb `size-5 rounded-full border-2 border-primary bg-card` + `FOCUS_RING`.

`input-group.tsx` group root: `rounded-control border border-input bg-card` + `has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring`. Import `FOCUS_RING` for the addon buttons it renders.

`label.tsx`: `text-sm font-semibold text-foreground leading-none select-none group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50`.

`tabs.tsx`: in `TabsList` change the default parameter to `variant = "line"` and the cva `defaultVariants` to `{ variant: "line" }`. Both variants get the underline list: `inline-flex w-full flex-wrap items-end gap-1 border-b border-border text-muted-foreground group-data-vertical/tabs:w-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:border-b-0`. The trigger's first class string becomes `relative inline-flex min-h-11 items-center justify-center gap-1.5 px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground data-active:text-foreground md:min-h-9` + `FOCUS_RING` + `MOTION`. Its indicator (`after:`) string becomes `after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent data-active:after:bg-primary`. Delete the `group-data-[variant=line]` and `dark:` override strings.

- [ ] **Step 6: Run the test, the suite and the type-check**

Run: `npx vitest run tests/ui-controls.test.ts`
Expected: PASS.

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS; tsc exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui tests/support/source.ts tests/ui-controls.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(ui): Blueprint controls: cobalt primary, 44px phone targets, 2px focus ring" -m "Variant and size names unchanged (ruling R12); tabs default to the underline style.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Overlays (dialog, sheet, popover, dropdown, tooltip, command, select popup, toasts)

**Files:**
- Modify: `src/components/ui/dialog.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `command.tsx`, `select.tsx` (popup and items), `sonner.tsx`
- Test: `tests/ui-overlays.test.ts`

**Interfaces:**
- Consumes: `FOCUS_RING`, `MOTION` (Task 5); `shadow-overlay`, `rounded-card`, `rounded-control`, `ease-standard` utilities (Task 2).
- Produces: no new exports; `DialogContent` keeps its `grid` default (ruling R12).

- [ ] **Step 1: Write the failing test**

`tests/ui-overlays.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readSource } from './support/source';

const ui = (file: string) => readSource(`src/components/ui/${file}`);

describe('overlays (spec §2.4: popovers and dialogs share the overlay shadow; 16px dialogs, 10px menus)', () => {
  it.each(['dialog.tsx', 'sheet.tsx'])('%s is a 16px surface with the overlay shadow', (file) => {
    expect(ui(file)).toMatch(/rounded(-t)?-card/);
    expect(ui(file)).toMatch(/shadow-overlay/);
  });

  it.each(['popover.tsx', 'dropdown-menu.tsx', 'select.tsx', 'command.tsx', 'tooltip.tsx'])('%s is a 10px surface', (file) => {
    expect(ui(file)).toMatch(/rounded-control/);
  });

  it.each(['popover.tsx', 'dropdown-menu.tsx', 'select.tsx'])('%s uses the overlay shadow, not a stock one', (file) => {
    expect(ui(file)).toMatch(/shadow-overlay/);
    expect(ui(file)).not.toMatch(/shadow-(md|lg)\b/);
  });

  it.each(['dialog.tsx', 'sheet.tsx', 'popover.tsx', 'dropdown-menu.tsx', 'select.tsx'])('%s has no stock foreground ring for an edge', (file) => {
    expect(ui(file)).not.toMatch(/ring-foreground\/10/);
  });

  it('panels move on the 250ms standard curve', () => {
    expect(ui('sheet.tsx')).toMatch(/duration-250/);
    expect(ui('sheet.tsx')).toMatch(/ease-standard/);
  });

  it('a bottom sheet keeps clear of the phone home bar', () => {
    expect(ui('sheet.tsx')).toMatch(/pb-\[env\(safe-area-inset-bottom\)\]/);
  });

  it('toasts use the tokens', () => {
    expect(ui('sonner.tsx')).toMatch(/shadow-overlay/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/ui-overlays.test.ts`
Expected: FAIL (for example `dialog.tsx is a 16px surface …`: no `rounded-card`).

- [ ] **Step 3: Restyle**

- `dialog.tsx` overlay: `fixed inset-0 isolate z-50 bg-black/40 duration-250 ease-standard supports-backdrop-filter:backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`. Content first class string: `fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-card border border-border bg-popover p-5 text-sm text-popover-foreground shadow-overlay duration-250 ease-standard outline-none sm:max-w-md`. Keep the existing `data-open`/`data-closed` animation classes after it. Title: `font-heading text-h3 font-semibold tracking-[-0.015em]`. Close button: `FOCUS_RING` and `aria-label="Close"` if missing.
- `sheet.tsx` overlay: the dialog overlay classes. Content first string: `fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-overlay transition duration-250 ease-standard`. Keep its `data-[side=*]` placement classes; add `rounded-t-card pb-[env(safe-area-inset-bottom)]` to `data-[side=bottom]:` and `border-border` to each side's border. Title: `font-heading text-h3 font-semibold`.
- `popover.tsx`, `dropdown-menu.tsx` (content and sub-content), `select.tsx` (popup): `rounded-control border border-border bg-popover text-popover-foreground shadow-overlay`, replacing `rounded-lg`, `ring-1 ring-foreground/10` and `shadow-md`. Items: `rounded-md min-h-9 px-2.5 text-sm data-highlighted:bg-muted data-highlighted:text-foreground`. Destructive menu items: `text-destructive data-highlighted:bg-destructive/10`.
- `tooltip.tsx` content: `rounded-control bg-foreground px-2.5 py-1.5 text-caption font-medium text-background shadow-overlay`.
- `command.tsx`: the list container `rounded-control`, input row `border-b border-border`, items as the dropdown items.
- `sonner.tsx`: pass `toastOptions={{ classNames: { toast: 'rounded-card border border-border bg-popover text-popover-foreground shadow-overlay font-sans', description: 'text-muted-foreground', actionButton: 'bg-primary text-primary-foreground', cancelButton: 'bg-muted text-foreground' } }}` next to its existing props.

- [ ] **Step 4: Run the test, suite and type-check**

Run: `npx vitest run tests/ui-overlays.test.ts && npx vitest run && npx tsc --noEmit`
Expected: all PASS, tsc exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui tests/ui-overlays.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(ui): Blueprint overlays: 16px dialogs and sheets, 10px menus, one overlay shadow" -m "DialogContent keeps its grid default (ruling R12).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Data display (card, badge, table, skeleton, progress, separator, avatar, accordion, alert)

**Files:**
- Create: `src/components/ui/badge-variants.ts`
- Modify: `src/components/ui/badge.tsx`, `card.tsx`, `table.tsx`, `skeleton.tsx`, `progress.tsx`, `separator.tsx`, `avatar.tsx`, `accordion.tsx`, `alert.tsx`
- Test: `tests/ui-data-display.test.ts`

**Interfaces:**
- Produces: `badgeVariants` in `@/components/ui/badge-variants` (re-exported from `badge.tsx`), with new variants `secure`, `building`, `weak` added to `default|secondary|destructive|outline|ghost|link`. `ExamMap` and `MarksToGain` (Task 11) and the sweeps use them.

- [ ] **Step 1: Write the failing test**

`tests/ui-data-display.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { badgeVariants } from '../src/components/ui/badge-variants';
import { readSource } from './support/source';

const ui = (file: string) => readSource(`src/components/ui/${file}`);
const tokens = (s: string) => s.split(/\s+/).filter(Boolean);

describe('badges and chips', () => {
  it.each([['secure', 'bg-secure', 'text-secure-strong'], ['building', 'bg-building', 'text-building-strong'], ['weak', 'bg-weak', 'text-weak-strong']] as const)(
    '%s chip uses its soft fill and strong text (spec §2.1)', (variant, fill, ink) => {
      expect(tokens(badgeVariants({ variant }))).toEqual(expect.arrayContaining([fill, ink]));
    },
  );

  it('is a pill', () => {
    expect(tokens(badgeVariants())).toContain('rounded-full');
  });

  it('keeps badgeVariants importable from badge.tsx', () => {
    expect(ui('badge.tsx')).toMatch(/export \{ Badge, badgeVariants \}/);
  });
});

describe('cards (spec §2.4: 16px, 1px border, the one resting shadow)', () => {
  it('uses the card radius, border and shadow, not the stock ring', () => {
    const card = ui('card.tsx');
    expect(card).toMatch(/rounded-card/);
    expect(card).toMatch(/shadow-card/);
    expect(card).toMatch(/border border-border/);
    expect(card).not.toMatch(/ring-foreground\/10/);
  });
});

describe('tables (spec §4: muted head row, row hover)', () => {
  it('puts the head row on the muted fill and hovers rows', () => {
    const table = ui('table.tsx');
    expect(table).toMatch(/bg-muted/);
    expect(table).toMatch(/hover:bg-muted\/60/);
  });
});

describe('quiet fills', () => {
  it.each(['skeleton.tsx', 'progress.tsx'])('%s sits on the muted fill', (file) => {
    expect(ui(file)).toMatch(/bg-muted/);
  });

  it('avatars use the accent pair', () => {
    expect(ui('avatar.tsx')).toMatch(/bg-accent text-accent-foreground/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/ui-data-display.test.ts`
Expected: FAIL with `Failed to resolve import "../src/components/ui/badge-variants"`.

- [ ] **Step 3: Write `badge-variants.ts` and slim `badge.tsx`**

```ts
import { cva } from 'class-variance-authority';
import { FOCUS_RING } from './focus';

/** Badges and chips: pills (spec §2.4). secure/building/weak carry mastery (spec §2.1); never decoration. */
export const badgeVariants = cva(
  [
    'group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent',
    'px-2.5 text-caption font-semibold whitespace-nowrap',
    FOCUS_RING,
    '[&>svg]:pointer-events-none [&>svg]:size-3!',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground',
        secondary: 'bg-muted text-muted-foreground',
        destructive: 'bg-destructive-soft text-destructive',
        outline: 'border-border text-foreground',
        ghost: 'text-muted-foreground hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
        secure: 'bg-secure text-secure-strong',
        building: 'bg-building text-building-strong',
        weak: 'bg-weak text-weak-strong',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
```

In `badge.tsx` delete the inline `cva` definition, import `badgeVariants` from `./badge-variants`, and keep `export { Badge, badgeVariants }`.

- [ ] **Step 4: Restyle the rest**

- `card.tsx` root first string: `group/card flex flex-col gap-4 overflow-hidden rounded-card border border-border bg-card py-5 text-sm text-card-foreground shadow-card data-[size=sm]:gap-3 data-[size=sm]:py-4`, keeping the `has-*` classes. Header `rounded-t-card px-5`. Title: `font-heading text-h3 font-semibold tracking-[-0.005em]`. Content `px-5`. Footer `rounded-b-card border-t border-border bg-muted/50 p-4`. The `group-data-[size=sm]/card:px-3` variants become `px-4`.
- `table.tsx`: `TableHeader` `bg-muted [&_tr]:border-b [&_tr]:border-border`; `TableRow` `border-b border-border transition-colors duration-150 hover:bg-muted/60 data-[state=selected]:bg-accent`; `TableHead` `h-10 px-3 text-left align-middle text-small font-semibold whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0`; `TableCell` `px-3 py-2.5 align-middle whitespace-nowrap tabular-nums [&:has([role=checkbox])]:pr-0`; `TableFooter` `border-t border-border bg-muted font-semibold`.
- `skeleton.tsx`: `animate-pulse rounded-control bg-muted`.
- `progress.tsx`: track `relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full bg-muted`; indicator `h-full rounded-full bg-primary transition-[width] duration-250 ease-standard`; value `ml-auto font-heading text-sm font-semibold tabular-nums text-muted-foreground`.
- `separator.tsx`: `bg-border`.
- `avatar.tsx` fallback: `flex size-full items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold`.
- `accordion.tsx` trigger: `FOCUS_RING` + `min-h-11 py-3 text-sm font-semibold hover:underline-offset-4`.
- `alert.tsx` root: `relative w-full rounded-card border border-border bg-card px-4 py-3 text-sm`; the `destructive` variant: `border-destructive/30 bg-destructive-soft text-destructive`.

- [ ] **Step 5: Run the test, suite and type-check**

Run: `npx vitest run tests/ui-data-display.test.ts && npx vitest run && npx tsc --noEmit`
Expected: all PASS, tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui tests/ui-data-display.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(ui): Blueprint data display: 16px cards, muted table heads, mastery chips" -m "Badge gains secure/building/weak (spec §2.1); other variant names unchanged.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Shell 1: nav helpers, Sidebar, rail, tablet nav sheet

**Files:**
- Create: `src/lib/shell/nav-active.ts`
- Create: `src/components/layout/SidebarNav.tsx`
- Modify: `src/components/layout/Sidebar.tsx` (rebuild), `src/components/layout/SidebarNavItem.tsx` (rebuild)
- Modify: `tests/file-size.test.ts` (watch the new shell files)
- Test: `tests/shell-nav.test.ts`, `tests/shell-source.test.ts`

**Interfaces:**
- Consumes: `visibleNavItems` (`src/lib/nav-visibility.ts`), `groupNavBySection` (`src/lib/nav-sections.ts`), `navBadgeText` (`src/lib/nav-counts.ts`), `useTeacherNavCounts`, `useUIStore` (`sidebarCollapsed`, `toggleSidebarCollapse`), `Sheet*` (Task 6), `FOCUS_RING` (Task 5).
- Produces: `isSectioned(items: readonly NavItem[]): boolean`; `isNavItemActive(pathname: string, item: NavItem, sectioned: boolean): boolean`; `<SidebarNav items collapsed onNavigate />` (the grouped list, used by the aside and the tablet sheet). `Sidebar` keeps its props (`{ items: NavItem[] }`).

- [ ] **Step 1: Write the failing tests**

`tests/shell-nav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BookOpen } from 'lucide-react';
import { ADMIN_NAV, STANDALONE_TEACHER_NAV, type NavItem } from '../src/lib/constants';
import { isNavItemActive, isSectioned } from '../src/lib/shell/nav-active';

const item = (href: string, extra: Partial<NavItem> = {}): NavItem => ({ label: href, href, icon: BookOpen, ...extra });

describe('isNavItemActive (lifted unchanged from Sidebar)', () => {
  it('matches its own page', () => {
    expect(isNavItemActive('/teacher/homework', item('/teacher/homework'), false)).toBe(true);
  });

  it('in a sectioned nav, highlights the item for pages below it', () => {
    expect(isNavItemActive('/teacher/courses/abc/edit', item('/teacher/courses'), true)).toBe(true);
    expect(isNavItemActive('/teacher/courses/abc/edit', item('/teacher/courses'), false)).toBe(false);
  });

  it('never lets Today (/teacher) claim every teacher page', () => {
    expect(isNavItemActive('/teacher/homework', item('/teacher'), true)).toBe(false);
    expect(isNavItemActive('/teacher', item('/teacher'), true)).toBe(true);
  });

  it('highlights a group while one of its children is open', () => {
    const fees = item('/admin/fees', { children: [item('/admin/fees'), item('/admin/fees/invoices')] });
    expect(isNavItemActive('/admin/fees/invoices/42', fees, false)).toBe(true);
  });

  it('does not match a sibling that only shares a prefix', () => {
    expect(isNavItemActive('/teacher/papers-archive', item('/teacher/papers'), true)).toBe(false);
  });
});

describe('isSectioned', () => {
  it('is true for the teacher navs and false for flat ones', () => {
    expect(isSectioned(STANDALONE_TEACHER_NAV)).toBe(true);
    expect(isSectioned(ADMIN_NAV)).toBe(false);
  });
});
```

`tests/shell-source.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findColourLiterals } from './support/colour-literals';
import { readSource } from './support/source';

const layout = (file: string) => readSource(`src/components/layout/${file}`);

describe('sidebar (spec §3)', () => {
  it('is hidden on phones, a 56px rail on tablets and 232px on desktops', () => {
    const sidebar = layout('Sidebar.tsx');
    expect(sidebar).toMatch(/hidden md:flex/);
    expect(sidebar).toMatch(/\bw-14\b/);
    expect(sidebar).toMatch(/lg:w-\[232px\]/);
  });

  it('keeps every link reachable on tablets through the full nav in a sheet', () => {
    expect(layout('Sidebar.tsx')).toMatch(/aria-label="Open all pages"/);
    expect(layout('Sidebar.tsx')).toMatch(/<SidebarNav/);
  });

  it('decides the active item with the shared helper', () => {
    expect(layout('SidebarNav.tsx')).toMatch(/isNavItemActive\(/);
  });

  it('names icon-only rail items', () => {
    expect(layout('SidebarNavItem.tsx')).toMatch(/aria-label=\{collapsed \? item\.label : undefined\}/);
  });

  it.each(['Sidebar.tsx', 'SidebarNav.tsx', 'SidebarNavItem.tsx'])('%s has no teacher: variant and no colour literal', (file) => {
    expect(layout(file)).not.toMatch(/(?<![\w-])teacher:/);
    expect(findColourLiterals(layout(file))).toEqual([]);
  });
});
```

`tests/support/colour-literals.ts` (a stop-gap until Task 13 adds `src/lib/design/palette-scan.ts`; Task 13 deletes it and repoints the import):

```ts
export const findColourLiterals = (source: string): string[] =>
  source.match(/\[#[0-9a-fA-F]{3,8}\]|['"`]#[0-9a-fA-F]{3,8}['"`]/g) ?? [];
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/shell-nav.test.ts tests/shell-source.test.ts`
Expected: FAIL: `Failed to resolve import "../src/lib/shell/nav-active"`, and `Sidebar.tsx … hidden md:flex` not found.

- [ ] **Step 3: Write `src/lib/shell/nav-active.ts`**

```ts
import type { NavItem } from '@/lib/constants';

/** Teacher navs group items into sections; other portals are flat. */
export function isSectioned(items: readonly NavItem[]): boolean {
  return items.some((item: NavItem) => item.section);
}

/**
 * Whether `item` is the current page's nav entry. Sectioned navs are flat, so a page below an item
 * (a lesson under Lessons) highlights it too; a one-segment href like /teacher only matches itself.
 */
export function isNavItemActive(pathname: string, item: NavItem, sectioned: boolean): boolean {
  const deep = item.href.split('/').filter(Boolean).length > 1;
  const own = pathname === item.href || (sectioned && deep && pathname.startsWith(`${item.href}/`));
  return own || (item.children?.some((c: NavItem) => pathname === c.href || pathname.startsWith(`${c.href}/`)) ?? false);
}
```

- [ ] **Step 4: Write `src/components/layout/SidebarNav.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { groupNavBySection } from '@/lib/nav-sections';
import { navBadgeText, type NavCounts } from '@/lib/nav-counts';
import { isNavItemActive, isSectioned } from '@/lib/shell/nav-active';
import { SidebarNavItem } from './SidebarNavItem';
import type { NavItem } from '@/lib/constants';

interface SidebarNavProps {
  items: NavItem[];
  collapsed: boolean;
  counts: NavCounts;
  onNavigate: () => void;
}

/** The portal's nav in its sections: in the desktop sidebar, the tablet rail and the tablet "all pages" sheet. */
export function SidebarNav({ items, collapsed, counts, onNavigate }: SidebarNavProps) {
  const pathname = usePathname() ?? '';
  const sectioned = isSectioned(items);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(items.filter((i: NavItem) => i.children && isNavItemActive(pathname, i, sectioned)).map((i: NavItem) => i.href)),
  );
  const toggle = (href: string) => setExpanded((prev: Set<string>) => {
    const next = new Set(prev);
    if (next.has(href)) next.delete(href);
    else next.add(href);
    return next;
  });

  return (
    <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 lg:px-3">
      {groupNavBySection(items).map((group) => (
        <div key={group.section ?? 'all'} className="space-y-0.5">
          {group.section && group.section !== 'Today' && !collapsed && (
            <p className="px-3 pb-1 pt-4 text-eyebrow font-semibold uppercase text-sidebar-label">{group.section}</p>
          )}
          {group.items.map((item: NavItem) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              active={isNavItemActive(pathname, item, sectioned)}
              collapsed={collapsed}
              expanded={expanded.has(item.href)}
              countText={navBadgeText(item.countKey, counts)}
              onToggle={toggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 5: Rebuild `src/components/layout/SidebarNavItem.tsx`**

Keep the props and the click logic (parents with children toggle instead of navigating when expanded). Replace the rendering:

```tsx
'use client';

import Link from 'next/link';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/components/ui/focus';
import type { NavItem } from '@/lib/constants';

interface SidebarNavItemProps {
  item: NavItem;
  pathname: string;
  active: boolean;
  collapsed: boolean;
  expanded: boolean;
  /** Live count text for this item, or null for none. */
  countText?: string | null;
  onToggle: (href: string) => void;
  onNavigate: () => void;
}

/** One sidebar entry: 40px row, accent fill when current; icon-only (named) in the rail. */
export function SidebarNavItem({ item, pathname, active, collapsed, expanded, countText = null, onToggle, onNavigate }: SidebarNavItemProps) {
  const hasChildren = !!item.children && item.children.length > 0;
  const Icon = item.icon;
  return (
    <div>
      <Link
        href={item.href}
        onClick={(e) => {
          if (hasChildren && !collapsed) {
            e.preventDefault();
            onToggle(item.href);
            return;
          }
          onNavigate();
        }}
        aria-current={active ? 'page' : undefined}
        aria-expanded={hasChildren && !collapsed ? expanded : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          'relative flex min-h-10 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-150',
          FOCUS_RING,
          collapsed && 'justify-center px-0',
          active ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden="true" />
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {item.badge === 'AI' ? (
              <Sparkles aria-label="AI" className="ml-auto size-3.5 shrink-0 text-primary" />
            ) : item.badge ? (
              <span className="ml-auto rounded-full bg-accent px-2 text-caption font-semibold text-accent-foreground">{item.badge}</span>
            ) : null}
            {countText && (
              <span className={cn('rounded-full bg-accent px-2 text-caption font-semibold tabular-nums text-accent-foreground', !item.badge && 'ml-auto')}>
                {countText}
              </span>
            )}
            {hasChildren && (
              <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 transition-transform duration-150', !item.badge && !countText && 'ml-auto', expanded && 'rotate-180')} />
            )}
          </>
        )}
      </Link>
      {!collapsed && expanded && item.children && (
        <div className="ml-9 mt-0.5 space-y-0.5">
          {item.children.map((child: NavItem) => {
            const childActive = child.href === item.href ? pathname === child.href : pathname === child.href || pathname.startsWith(`${child.href}/`);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={childActive ? 'page' : undefined}
                className={cn('flex min-h-9 items-center rounded-control px-3 text-sm', FOCUS_RING, childActive ? 'font-semibold text-accent-foreground' : 'text-sidebar-foreground hover:text-foreground')}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Rebuild `src/components/layout/Sidebar.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, GraduationCap, PanelLeft } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useModule } from '@/hooks/useModule';
import { useTeacherNavCounts } from '@/hooks/useTeacherNavCounts';
import { visibleNavItems } from '@/lib/nav-visibility';
import { FOCUS_RING } from '@/components/ui/focus';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarNav } from './SidebarNav';
import type { NavItem } from '@/lib/constants';

interface SidebarProps {
  items: NavItem[];
}

/** Spec §3: 232px sidebar from 1024px (collapsible to the rail), 56px rail from 768px, hidden on phones. */
export function Sidebar({ items }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore();
  const { isModuleEnabled } = useModule();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const schoolName = useSchoolStore((s) => s.school?.name ?? '');
  const counts = useTeacherNavCounts(user?.role === 'teacher');
  const [allPagesOpen, setAllPagesOpen] = useState(false);
  const visible = visibleNavItems(items, { isModuleEnabled, hasPermission });

  return (
    <aside
      data-collapsed={sidebarCollapsed}
      className={cn(
        'sticky top-0 hidden h-dvh w-14 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex',
        'transition-[width] duration-250 ease-standard lg:w-[232px] data-[collapsed=true]:lg:w-14',
      )}
    >
      <div className="flex h-16 items-center justify-center gap-2 border-b border-sidebar-border px-2 lg:justify-between lg:px-4 data-[collapsed=true]:lg:justify-center">
        <Link href="/" className={cn('flex items-center gap-2 rounded-control', FOCUS_RING)} aria-label="Campusly home">
          <span className="grid size-8 place-items-center rounded-control bg-primary text-primary-foreground">
            <GraduationCap className="size-4" aria-hidden="true" />
          </span>
          {!sidebarCollapsed && (
            <span className="hidden font-heading text-lg font-bold tracking-[-0.01em] text-sidebar-primary lg:inline">Campusly</span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn('hidden size-8 items-center justify-center rounded-control hover:bg-muted lg:flex', FOCUS_RING)}
        >
          <ChevronLeft className={cn('size-4 transition-transform duration-150', sidebarCollapsed && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>

      {/* Tablet: the rail is icons only; the full nav (with group children) opens in a sheet. */}
      <div className="flex flex-1 flex-col overflow-hidden lg:hidden">
        <SidebarNav items={visible} collapsed counts={counts} onNavigate={() => undefined} />
        <button
          type="button"
          onClick={() => setAllPagesOpen(true)}
          aria-label="Open all pages"
          className={cn('mx-2 mb-3 flex min-h-10 items-center justify-center rounded-control hover:bg-muted', FOCUS_RING)}
        >
          <PanelLeft className="size-[18px]" aria-hidden="true" />
        </button>
        <Sheet open={allPagesOpen} onOpenChange={setAllPagesOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="px-4 pt-4">All pages</SheetTitle>
            <SidebarNav items={visible} collapsed={false} counts={counts} onNavigate={() => setAllPagesOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: the full sidebar, or the rail when collapsed. */}
      <div className="hidden flex-1 flex-col overflow-hidden lg:flex">
        <SidebarNav items={visible} collapsed={sidebarCollapsed} counts={counts} onNavigate={() => undefined} />
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-2.5 border-t border-sidebar-border px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {getInitials(user.firstName, user.lastName)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-sidebar-primary">{user.firstName} {user.lastName}</span>
              {schoolName && <span className="block truncate text-caption text-sidebar-label">{schoolName}</span>}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 7: Watch the new file sizes**

In `tests/file-size.test.ts` add `'src/components/layout/SidebarNav.tsx'` and `'src/components/layout/SidebarNavItem.tsx'` to `WATCHED`.

- [ ] **Step 8: Run the tests, the suite and the type-check**

Run: `npx vitest run tests/shell-nav.test.ts tests/shell-source.test.ts tests/file-size.test.ts`
Expected: PASS.

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS, tsc exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/lib/shell/nav-active.ts src/components/layout/Sidebar.tsx src/components/layout/SidebarNav.tsx src/components/layout/SidebarNavItem.tsx tests/shell-nav.test.ts tests/shell-source.test.ts tests/support/colour-literals.ts tests/file-size.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(shell): Blueprint sidebar: 232px desktop, 56px tablet rail with an all-pages sheet" -m "Active-item logic lifted into isNavItemActive unchanged; nav contents unchanged (spec §3, ruling R11).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Shell 2: phone tabs, BottomNav + More, TopBar, dashboard layout, banner strip, wizard footer

**Files:**
- Create: `src/lib/shell/phone-tabs.ts`
- Create: `src/components/layout/BannerStrip.tsx`
- Modify: `src/components/layout/BottomNav.tsx` (rebuild), `src/components/layout/TopBar.tsx` (rebuild), `src/app/(dashboard)/layout.tsx:124-150`, `src/lib/bottom-nav-classes.ts`, `src/lib/wizard-footer.ts`, `src/components/subscription/TrialBanner.tsx`, `src/components/subscription/DunningBanner.tsx`, `src/components/auth/VerifyEmailBanner.tsx`, `src/components/notifications/NotificationBell.tsx`, `src/components/notifications/NotificationItem.tsx`
- Modify: `tests/bottom-nav-classes.test.ts` (rewrite), `tests/wizard-footer.test.ts` (new placements), `tests/shell-source.test.ts` (extend)
- Test: `tests/phone-tabs.test.ts`

**Interfaces:**
- Consumes: `phoneNavLayout`, `phoneSectionLayout`, `PhoneTab`, `visibleNavItems` (`src/lib/nav-visibility.ts`); `navContextFor` (`src/lib/nav-context.ts`); Task 5–6 components.
- Produces: `phoneTabs(items: NavItem[]): PhoneTab[]`; `isTabActive(pathname: string, tab: PhoneTab): boolean`; `TAB_CLASS: string` (replaces `FLAT_TAB_CLASS` and `SECTION_TAB_CLASS`); `wizardFooterPlacement(sidebarCollapsed: boolean): { outer: string; inner: string }` (signature unchanged).

- [ ] **Step 1: Write the failing tests**

`tests/phone-tabs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BookOpen } from 'lucide-react';
import { ADMIN_NAV, PARENT_NAV, STANDALONE_TEACHER_NAV, STUDENT_NAV, TEACHER_NAV, type NavItem } from '../src/lib/constants';
import { isTabActive, phoneTabs } from '../src/lib/shell/phone-tabs';

const item = (href: string): NavItem => ({ label: href, href, icon: BookOpen });

describe('phoneTabs (spec §3, ruling R10)', () => {
  it('gives the standalone teacher Today, Teach, Assess, Class and More', () => {
    const tabs = phoneTabs(STANDALONE_TEACHER_NAV);
    expect(tabs.map((t) => t.label)).toEqual(['Today', 'Teach', 'Assess', 'Class', 'More']);
    expect(tabs[0].href).toBe('/teacher');
    expect(tabs[1].href).toBeUndefined();
    expect(tabs[4].items.map((i) => i.label)).toEqual(['Billing', 'Settings']);
  });

  it('gives a flat nav its first four items and More with the rest', () => {
    const tabs = phoneTabs(['a', 'b', 'c', 'd', 'e', 'f'].map((x) => item(`/p/${x}`)));
    expect(tabs.map((t) => t.label)).toEqual(['/p/a', '/p/b', '/p/c', '/p/d', 'More']);
    expect(tabs[4].items.map((i) => i.href)).toEqual(['/p/e', '/p/f']);
  });

  it('has no More tab when everything fits', () => {
    expect(phoneTabs(['a', 'b', 'c'].map((x) => item(`/p/${x}`))).map((t) => t.label)).toEqual(['/p/a', '/p/b', '/p/c']);
  });

  it.each([['admin', ADMIN_NAV], ['parent', PARENT_NAV], ['learner', STUDENT_NAV], ['teacher', TEACHER_NAV], ['standalone teacher', STANDALONE_TEACHER_NAV]] as const)(
    '%s: every link stays reachable on a phone', (_role, nav) => {
      const tabs = phoneTabs([...nav]);
      const reachable = new Set(tabs.flatMap((t) => [t.href, ...t.items.map((i) => i.href)]).filter(Boolean));
      const links = nav.flatMap((i: NavItem) => (i.children?.length ? i.children : [i])).map((i: NavItem) => i.href);
      expect(links.filter((href: string) => !reachable.has(href))).toEqual([]);
    },
  );
});

describe('isTabActive', () => {
  const tabs = phoneTabs(STANDALONE_TEACHER_NAV);

  it('lights Today only on /teacher itself', () => {
    expect(isTabActive('/teacher', tabs[0])).toBe(true);
    expect(isTabActive('/teacher/homework', tabs[0])).toBe(false);
  });

  it('lights a section tab for any page under one of its items', () => {
    expect(isTabActive('/teacher/homework/new', tabs[2])).toBe(true);
  });

  it('does not light a one-segment flat tab for every page below it', () => {
    const [home] = phoneTabs([item('/admin'), item('/admin/fees')]);
    expect(isTabActive('/admin/fees', home)).toBe(false);
  });
});
```

Rewrite `tests/bottom-nav-classes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TAB_CLASS } from '../src/lib/bottom-nav-classes';

describe('bottom nav tab class', () => {
  it('shares the width equally and is taller than a 44px target', () => {
    expect(TAB_CLASS.split(' ')).toEqual(expect.arrayContaining(['flex-1', 'min-h-14']));
  });
});
```

In `tests/wizard-footer.test.ts` replace the second test with:

```ts
  it('sits beside the rail on tablets and beside the sidebar on desktops', () => {
    expect(classes(wizardFooterPlacement(false).outer)).toEqual(expect.arrayContaining(['md:bottom-6', 'md:left-14', 'lg:left-[232px]']));
    expect(classes(wizardFooterPlacement(true).outer)).toEqual(expect.arrayContaining(['md:left-14', 'lg:left-14']));
    expect(classes(wizardFooterPlacement(false).inner)).toEqual(expect.arrayContaining(['lg:w-1/3', 'lg:min-w-110']));
  });
```

and in the first test change the regex `/^(left-(64|17\.5)|bottom-6)$/` to `/^(left-(14|\[232px\])|bottom-6)$/`.

Append to `tests/shell-source.test.ts`:

```ts
describe('phone and top bars (spec §3)', () => {
  it('the bottom nav is phones only and clears the home bar', () => {
    expect(layout('BottomNav.tsx')).toMatch(/md:hidden/);
    expect(layout('BottomNav.tsx')).toMatch(/pb-\[env\(safe-area-inset-bottom\)\]/);
    expect(layout('BottomNav.tsx')).toMatch(/phoneTabs\(/);
  });

  it('the top bar names the account button on phones and has no drawer toggle', () => {
    expect(layout('TopBar.tsx')).toMatch(/aria-label="Account menu"/);
    expect(layout('TopBar.tsx')).not.toMatch(/toggleSidebar/);
  });

  it('banners sit in one accent strip under the top bar', () => {
    expect(layout('BannerStrip.tsx')).toMatch(/bg-accent/);
    expect(readSource('src/app/(dashboard)/layout.tsx')).toMatch(/<BannerStrip \/>/);
  });

  it('the content column is 1200px with 16px phone and 32px desktop gutters', () => {
    const dash = readSource('src/app/(dashboard)/layout.tsx');
    expect(dash).toMatch(/max-w-\[1200px\]/);
    expect(dash).toMatch(/px-4/);
    expect(dash).toMatch(/lg:px-8/);
    expect(dash).not.toMatch(/data-portal/);
  });

  it.each(['BottomNav.tsx', 'TopBar.tsx', 'BannerStrip.tsx'])('%s has no teacher: variant and no colour literal', (file) => {
    expect(layout(file)).not.toMatch(/(?<![\w-])teacher:/);
    expect(findColourLiterals(layout(file))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/phone-tabs.test.ts tests/bottom-nav-classes.test.ts tests/wizard-footer.test.ts tests/shell-source.test.ts`
Expected: FAIL: `Failed to resolve import "../src/lib/shell/phone-tabs"`, `TAB_CLASS` undefined, `md:left-14` missing, `BannerStrip.tsx` not found.

- [ ] **Step 3: Write `src/lib/shell/phone-tabs.ts`**

```ts
import { MoreHorizontal } from 'lucide-react';
import { phoneNavLayout, phoneSectionLayout, type PhoneTab } from '@/lib/nav-visibility';
import type { NavItem } from '@/lib/constants';

/**
 * The phone tab bar: section tabs for sectioned (teacher) navs; otherwise the first four items and
 * More with every other link, nested ones included (spec §3, ruling R10).
 */
export function phoneTabs(items: NavItem[]): PhoneTab[] {
  const sections = phoneSectionLayout(items);
  if (sections) return sections;
  const { primary, sheet } = phoneNavLayout(items);
  const tabs: PhoneTab[] = primary.map((item: NavItem) => ({ key: item.href, label: item.label, icon: item.icon, href: item.href, items: [item] }));
  return sheet.length > 0 ? [...tabs, { key: 'More', label: 'More', icon: MoreHorizontal, items: sheet }] : tabs;
}

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function isTabActive(pathname: string, tab: PhoneTab): boolean {
  if (tab.href) {
    const deep = tab.href.split('/').filter(Boolean).length > 1;
    return pathname === tab.href || (deep && pathname.startsWith(`${tab.href}/`));
  }
  return tab.items.some((item: NavItem) => under(pathname, item.href));
}
```

- [ ] **Step 4: Replace `src/lib/bottom-nav-classes.ts`**

```ts
/** A phone tab: equal width, 56px tall (above the 44px floor), caption-size label (spec §2.3, §3). */
export const TAB_CLASS =
  'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-caption font-semibold transition-colors duration-150';
```

- [ ] **Step 5: Rebuild `src/components/layout/BottomNav.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useModule } from '@/hooks/useModule';
import { useAuthStore } from '@/stores/useAuthStore';
import { visibleNavItems, type PhoneTab } from '@/lib/nav-visibility';
import { isTabActive, phoneTabs } from '@/lib/shell/phone-tabs';
import { TAB_CLASS } from '@/lib/bottom-nav-classes';
import { FOCUS_RING } from '@/components/ui/focus';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { NavItem } from '@/lib/constants';

interface BottomNavProps {
  items: NavItem[];
}

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function TabBody({ tab, active }: { tab: PhoneTab; active: boolean }) {
  const Icon = tab.icon;
  return (
    <>
      <span aria-hidden="true" className={cn('absolute top-0 h-[3px] w-6 rounded-b-full', active ? 'bg-primary' : 'bg-transparent')} />
      <Icon className="size-5" aria-hidden="true" />
      <span>{tab.label}</span>
    </>
  );
}

/** Spec §3: phones only; section or first-four tabs, the rest in a sheet; clear of the home bar. */
export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname() ?? '';
  const { isModuleEnabled } = useModule();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const tabs = phoneTabs(visibleNavItems(items, { isModuleEnabled, hasPermission }));
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = tabs.find((t: PhoneTab) => t.key === openKey);

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex items-stretch">
        {tabs.map((tab: PhoneTab) => {
          const active = isTabActive(pathname, tab);
          const className = cn(TAB_CLASS, FOCUS_RING, active ? 'text-primary' : 'text-muted-foreground');
          return tab.href ? (
            <Link key={tab.key} href={tab.href} aria-current={active ? 'page' : undefined} className={className}>
              <TabBody tab={tab} active={active} />
            </Link>
          ) : (
            <button key={tab.key} type="button" aria-haspopup="dialog" className={className} onClick={() => setOpenKey(tab.key)}>
              <TabBody tab={tab} active={active} />
            </button>
          );
        })}
      </div>
      <Sheet open={open !== undefined} onOpenChange={(o: boolean) => { if (!o) setOpenKey(null); }}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetTitle className="px-4 pt-4">{open?.label}</SheetTitle>
          <div className="grid max-h-[70dvh] grid-cols-3 gap-2 overflow-y-auto p-4 sm:grid-cols-4">
            {(open?.items ?? []).map((item: NavItem) => {
              const Icon = item.icon;
              const current = under(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenKey(null)}
                  aria-current={current ? 'page' : undefined}
                  className={cn('flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-control p-2 text-center text-caption font-semibold', FOCUS_RING, current ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted')}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
```

- [ ] **Step 6: Rebuild `src/components/layout/TopBar.tsx`**

Keep the imports it needs (`usePathname`, `useRouter`, the lucide icons except `Menu`, `Button`, `Avatar`, `DropdownMenu*`, `useAuthStore`, `useAuth`, `getInitials`, `getRoleLabel`, `getRoleProfilePath`, `getRoleSettingsPath`, `NotificationBell`, `ThemeToggle`, `navContextFor`); drop `useUIStore` and `Menu`. Replace the component body's JSX:

```tsx
export function TopBar({ items }: TopBarProps = {}) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const context = items ? navContextFor(pathname, items) : null;
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const profilePath = user ? getRoleProfilePath(user.role) : null;
  const settingsPath = user ? getRoleSettingsPath(user.role) : null;
  const title = context?.label ?? (user ? getRoleLabel(user.role) : 'Dashboard');
  const eyebrow = context?.section && context.section !== context.label ? context.section : null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:h-16 md:px-6 lg:px-8">
      <div className="min-w-0">
        {eyebrow && <p className="hidden text-eyebrow font-semibold uppercase text-muted-foreground md:block">{eyebrow}</p>}
        <p className="truncate font-heading text-h3 font-semibold tracking-[-0.015em]">{title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2 px-1.5 md:px-2" aria-label="Account menu">
                <Avatar className="size-8">
                  <AvatarFallback>{user ? getInitials(user.firstName, user.lastName) : 'U'}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-semibold md:inline-block">{user ? `${user.firstName} ${user.lastName}` : 'User'}</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            {profilePath && (
              <DropdownMenuItem onClick={() => router.push(profilePath)}>
                <User className="mr-2 size-4" aria-hidden="true" /> Profile
              </DropdownMenuItem>
            )}
            {settingsPath && (
              <DropdownMenuItem onClick={() => router.push(settingsPath)}>
                <Settings className="mr-2 size-4" aria-hidden="true" /> Settings
              </DropdownMenuItem>
            )}
            {(profilePath || settingsPath) && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 size-4" aria-hidden="true" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

The top bar holds the page's context, notifications and the account menu (spec §3). The page's own `PageHeader` still carries the h1; the top bar title is a `<p>`, so there is one h1 per page.

- [ ] **Step 7: Write `src/components/layout/BannerStrip.tsx` and restyle the banners**

```tsx
'use client';

import { TrialBanner } from '@/components/subscription/TrialBanner';
import { DunningBanner } from '@/components/subscription/DunningBanner';
import { VerifyEmailBanner } from '@/components/auth/VerifyEmailBanner';

/** Spec §3: trial, billing and email banners in one quiet accent strip under the top bar; gone when all are empty. */
export function BannerStrip() {
  return (
    <div className="border-b border-border bg-accent text-accent-foreground empty:hidden [&>*+*]:border-t [&>*+*]:border-border">
      <TrialBanner />
      <DunningBanner />
      <VerifyEmailBanner />
    </div>
  );
}
```

`TrialBanner.tsx`: drop the `bg` variable (it held `bg-amber-50 border-amber-200 text-amber-900`). The root becomes `className={cn('flex items-center justify-between gap-3 px-4 py-2 text-sm md:px-8', amber && 'bg-attention-soft text-attention')}` with `cn` imported from `@/lib/utils`; the link becomes `font-semibold underline underline-offset-4`. `DunningBanner.tsx` and `VerifyEmailBanner.tsx`: remove their own background and border colours so they sit on the strip, and keep `text-destructive` for the payment-failed wording. `NotificationBell.tsx` and `NotificationItem.tsx`: replace their one palette class each (an unread dot or badge) with `bg-primary` for the unread marker and `text-muted-foreground` for secondary text. Keep all copy and logic.

- [ ] **Step 8: Rebuild the dashboard frame in `src/app/(dashboard)/layout.tsx`**

Replace the three banner imports with `import { BannerStrip } from '@/components/layout/BannerStrip';` and the returned JSX with:

```tsx
  return (
    <AuthGuard>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <Sidebar items={navItems} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar items={navItems} />
          <BannerStrip />
          {/* <main> stays the scroll container (ruling R23). */}
          <main className="flex-1 overflow-y-auto px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:px-6 md:pt-6 md:pb-10 lg:px-8 lg:pt-8">
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
        <BottomNav items={navItems} />
        {/* The one prompt any refused AI action opens (out of AI actions, or email not verified). */}
        <AILimitDialog />
      </div>
    </AuthGuard>
  );
```

- [ ] **Step 9: Update `src/lib/wizard-footer.ts`**

```ts
/**
 * Where the wizard's Back/Next bar sits. On a phone it spans the screen just above the bottom nav;
 * from md it floats beside the 56px rail, and from lg beside the 232px sidebar (or the rail when collapsed).
 */
export function wizardFooterPlacement(sidebarCollapsed: boolean): { outer: string; inner: string } {
  return {
    outer: [
      'pointer-events-none fixed left-0 right-0 bottom-20 z-40 flex justify-center px-3',
      'md:bottom-6 md:left-14 md:px-6',
      sidebarCollapsed ? 'lg:left-14' : 'lg:left-[232px]',
    ].join(' '),
    inner: 'pointer-events-auto w-full max-w-160 rounded-card border border-border bg-card/95 shadow-overlay backdrop-blur supports-backdrop-filter:bg-card/80 lg:w-1/3 lg:min-w-110',
  };
}
```

- [ ] **Step 10: Run the tests, the suite and the type-check**

Run: `npx vitest run tests/phone-tabs.test.ts tests/bottom-nav-classes.test.ts tests/wizard-footer.test.ts tests/shell-source.test.ts`
Expected: PASS.

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS, tsc exit 0. `grep -rn "FLAT_TAB_CLASS\|SECTION_TAB_CLASS" src tests` prints nothing.

- [ ] **Step 11: Commit**

```bash
git add src/lib/shell/phone-tabs.ts src/lib/bottom-nav-classes.ts src/lib/wizard-footer.ts src/components/layout src/components/subscription src/components/auth/VerifyEmailBanner.tsx src/components/notifications "src/app/(dashboard)/layout.tsx" tests/phone-tabs.test.ts tests/bottom-nav-classes.test.ts tests/wizard-footer.test.ts tests/shell-source.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(shell): phone tab bar with More sheet, slim top bar, 1200px column, banner strip" -m "Bottom tabs below 768px only; every nav link reachable on a phone (pinned per role). Nav contents unchanged.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Shared components (PageHeader, EmptyState, ErrorState, skeletons, StatCard, DataTable) and the `teacher:` guard

**Files:**
- Create: `src/components/shared/ErrorState.tsx`
- Modify: `src/components/shared/PageHeader.tsx`, `EmptyState.tsx`, `StatCard.tsx`, `skeletons.tsx`, `DataTable.tsx`, `LoadingSpinner.tsx`, `index.ts`
- Test: `tests/shared-components.test.ts`

**Interfaces:**
- Consumes: `Button` (Task 5), `Card` and `Skeleton` (Task 7).
- Produces: `ErrorState({ title?: string; message: string; onRetry?: () => void; retrying?: boolean })`, exported from `@/components/shared`. The `PageHeader`, `EmptyState`, `StatCard` and `DataTable` props are unchanged: `PageHeader`'s `children` is the one primary-action slot.

- [ ] **Step 1: Write the failing test**

`tests/shared-components.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { listSourceFiles, readSource } from './support/source';

const shared = (file: string) => readSource(`src/components/shared/${file}`);

describe('one look, no portal variant (ruling R9)', () => {
  it('no source file uses the removed teacher: variant', () => {
    const offenders = listSourceFiles('src').filter((f: string) => /(?<![\w-])teacher:[a-z[]/.test(readSource(f)));
    expect(offenders).toEqual([]);
  });
});

describe('PageHeader (spec §4: eyebrow, title, one-line context, one action slot)', () => {
  it('renders the h1 on the type scale with the eyebrow style', () => {
    const src = shared('PageHeader.tsx');
    expect(src).toMatch(/<h1 className="[^"]*text-h1[^"]*md:text-h1-desktop/);
    expect(src).toMatch(/text-eyebrow/);
  });
});

describe('ErrorState (spec §4: message + Retry)', () => {
  it('announces itself and offers Retry', () => {
    const src = shared('ErrorState.tsx');
    expect(src).toMatch(/role="alert"/);
    expect(src).toMatch(/Retry/);
    expect(shared('index.ts')).toMatch(/export \{ ErrorState \} from '\.\/ErrorState'/);
  });
});

describe('DataTable (spec §4: sticky head, horizontal scroll in its own box)', () => {
  it('scrolls sideways in its own container and keeps the head in view from md up (ruling R24)', () => {
    const src = shared('DataTable.tsx');
    expect(src).toMatch(/data-scroll-x/);
    expect(src).toMatch(/overflow-x-auto/);
    expect(src).toMatch(/md:max-h-\[70vh\]/);
    expect(src).toMatch(/sticky top-0/);
  });
});

describe('StatCard (spec §2.3: numbers in Hanken Grotesk with tabular figures)', () => {
  it('sets the figure in the heading face with tabular numbers', () => {
    expect(shared('StatCard.tsx')).toMatch(/font-heading[^"]*tabular-nums/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/shared-components.test.ts`
Expected: FAIL: the `teacher:` guard lists `src/components/shared/EmptyState.tsx`, `PageHeader.tsx` and `StatCard.tsx`; `ErrorState.tsx` is not found.

- [ ] **Step 3: Rewrite `PageHeader.tsx`, `EmptyState.tsx`, `StatCard.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Short context line above the title, e.g. "GRADE 1 A · ENGLISH". */
  eyebrow?: string;
  /** The page's one primary action (spec §4). */
  children?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, children }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-8">
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-eyebrow font-semibold uppercase text-muted-foreground">{eyebrow}</p>}
        <h1 className="font-heading text-h1 font-bold tracking-[-0.025em] text-balance md:text-h1-desktop">{title}</h1>
        {description && <p className="max-w-prose text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{children}</div>}
    </header>
  );
}
```

```tsx
'use client';

import type { ReactNode } from 'react';
import { InboxIcon, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** What happens next (spec §4). */
  description?: string;
  /** One action. */
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = InboxIcon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-card bg-accent text-accent-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-h3 font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
```

```tsx
'use client';

import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  description?: string;
  trend?: { value: number; label: string };
  /** attention: something waits on the user; success: good news. */
  tone?: 'default' | 'attention' | 'success';
  className?: string;
}

/** Only where the figure is the point (spec §4). */
export function StatCard({ title, value, icon: Icon, description, trend, tone = 'default', className }: StatCardProps) {
  return (
    <Card className={cn(tone === 'attention' && 'border-attention/40', className)}>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('truncate font-heading text-h1 font-bold tabular-nums tracking-[-0.02em]', tone === 'attention' && 'text-attention', tone === 'success' && 'text-success')}>
              {value}
            </p>
            {description && <p className="text-caption text-muted-foreground">{description}</p>}
            {trend && (
              <p className={cn('text-caption font-semibold tabular-nums', trend.value >= 0 ? 'text-success' : 'text-destructive')}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          {Icon && (
            <div className="grid size-10 shrink-0 place-items-center rounded-control bg-accent text-accent-foreground">
              <Icon className="size-5" aria-hidden="true" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Write `ErrorState.tsx` and export it**

```tsx
'use client';

import { AlertTriangle, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/** Spec §4: what went wrong, in plain words, and a Retry. */
export function ErrorState({ title = 'Something went wrong', message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-card bg-destructive-soft text-destructive">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-h3 font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry} disabled={retrying}>
          {retrying ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCw aria-hidden="true" />}
          Retry
        </Button>
      )}
    </div>
  );
}
```

In `src/components/shared/index.ts` add `export { ErrorState } from './ErrorState';` after the `EmptyState` line.

- [ ] **Step 5: Restyle `skeletons.tsx`, `DataTable.tsx`, `LoadingSpinner.tsx`**

- `skeletons.tsx`: card placeholders use `rounded-card border border-border bg-card shadow-card` (as `Card`); row placeholders use the `Skeleton` component (Task 7). Replace `rounded-xl`/`rounded-lg` wrappers with `rounded-card`, and keep every exported name and prop.
- `DataTable.tsx`: the table wrapper becomes `<div data-scroll-x className="overflow-x-auto rounded-card border border-border bg-card shadow-card md:max-h-[70vh] md:overflow-y-auto">`, and the `<TableHeader>` gets `className="sticky top-0 z-10"`. Pagination controls stay outside the wrapper, with `min-h-11 md:min-h-0` on their buttons, which the `Button` sizes already provide.
- `LoadingSpinner.tsx`: `animate-spin rounded-full border-2 border-muted border-t-primary` stays; add `motion-reduce:animate-none` to it.

- [ ] **Step 6: Run the test, the suite and the type-check**

Run: `npx vitest run tests/shared-components.test.ts && npx vitest run && npx tsc --noEmit`
Expected: all PASS; the `teacher:` guard finds no file; tsc exit 0. `tests/teacher-colour-guard.test.ts` still passes: PageHeader, EmptyState and StatCard are in its `MIGRATED` list and carry no palette classes.

- [ ] **Step 7: Commit**

```bash
git add src/components/shared tests/shared-components.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(shared): Blueprint page header, empty/error states, stat card and data table" -m "New ErrorState (message + Retry). The teacher: variant is gone from every file (guarded).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Readiness components (ExamMap, Countdown, NextUp, MarksToGain, ReadinessBand, TrendChart)

Built now and shown in the gallery with example data; screens use them from Phase L/R on (spec §4).

**Files:**
- Create: `src/components/readiness/ExamMap.tsx`, `Countdown.tsx`, `NextUp.tsx`, `MarksToGain.tsx`, `ReadinessBand.tsx`, `TrendChart.tsx`, `index.ts`
- Test: `tests/readiness-components.test.ts`

**Interfaces:**
- Consumes: Task 3 helpers, `useChartTheme` + `trendDomain` (Task 4), `buttonVariants` (Task 5), `Card*` and `Skeleton` (Task 7).
- Produces:
  - `ExamMap({ paper: string; topics: readonly ExamTopic[]; className?: string })`
  - `Countdown({ paper: string; examDate: Date; now: Date })`
  - `NextUp({ eyebrow: string; title: string; detail?: string; actionLabel: string; href: string })`
  - `MarksToGain({ topics: readonly ExamTopic[] })`
  - `ReadinessBand({ low: number; high: number; target: number })`
  - `TrendChart({ points: ReadonlyArray<{ label: string; value: number }>; target?: number; label: string })`
  - all re-exported from `@/components/readiness`.

- [ ] **Step 1: Write the failing test**

`tests/readiness-components.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { listSourceFiles, readSource } from './support/source';
import { findColourLiterals } from './support/colour-literals';

const files = ['ExamMap.tsx', 'Countdown.tsx', 'NextUp.tsx', 'MarksToGain.tsx', 'ReadinessBand.tsx', 'TrendChart.tsx'];
const read = (f: string) => readSource(`src/components/readiness/${f}`);

describe('readiness components', () => {
  it('all exist and are exported together', () => {
    expect(listSourceFiles('src/components/readiness').map((f: string) => f.split('/').pop())).toEqual(expect.arrayContaining([...files, 'index.ts']));
    for (const f of files) expect(read('index.ts')).toContain(`./${f.replace('.tsx', '')}`);
  });

  it.each(files)('%s never re-types the mastery thresholds (spec §2.1)', (f) => {
    expect(read(f)).not.toMatch(/[<>]=?\s*(60|70)\b/);
  });

  it.each(files)('%s has no colour literals: colours come from tokens (spec §4)', (f) => {
    expect(findColourLiterals(read(f))).toEqual([]);
  });

  it.each(files)('%s stays under 300 lines (spec §7)', (f) => {
    expect(read(f).split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('the exam map has an accessible name and a list fallback', () => {
    const src = read('ExamMap.tsx');
    expect(src).toMatch(/role="img"/);
    expect(src).toMatch(/aria-label=\{examMapLabel\(/);
    expect(src).toMatch(/className="sr-only"/);
    expect(src).toMatch(/layoutExamMap\(/);
  });

  it('the trend chart takes its colours from the chart theme', () => {
    const src = read('TrendChart.tsx');
    expect(src).toMatch(/useChartTheme\(\)/);
    expect(src).toMatch(/trendDomain\(/);
    expect(src).toMatch(/strokeDasharray="4 4"/);
  });

  it('NextUp carries the one filled button', () => {
    expect(read('NextUp.tsx')).toMatch(/buttonVariants\(\{ size: 'lg' \}\)/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/readiness-components.test.ts`
Expected: FAIL with `ENOENT … src/components/readiness`.

- [ ] **Step 3: Write `ExamMap.tsx`**

```tsx
'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TILE_LABEL, examMapLabel, layoutExamMap, type ExamMapTile, type ExamTopic, type TileLevel } from '@/lib/readiness/exam-map';

const TILE_CLASS: Record<TileLevel, string> = {
  secure: 'bg-tile-secure text-tile-secure-ink',
  building: 'bg-tile-building text-tile-building-ink',
  weak: 'bg-tile-weak text-tile-weak-ink',
  untested: 'border border-dashed border-input bg-muted text-muted-foreground',
};

interface ExamMapProps {
  paper: string;
  topics: readonly ExamTopic[];
  className?: string;
}

/** The exam, mapped (spec §1): rows by paper section, block size = marks, colour = mastery. */
export function ExamMap({ paper, topics, className }: ExamMapProps) {
  const rows = useMemo(() => layoutExamMap(topics), [topics]);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">This paper has no topics in its blueprint yet.</p>;
  }
  const tiles = rows.flatMap((r) => r.tiles);
  return (
    <figure className={cn('space-y-3', className)}>
      <div
        role="img"
        aria-label={examMapLabel(paper, rows)}
        className="grid h-64 gap-1 sm:h-72"
        style={{ gridTemplateRows: rows.map((r) => `${r.marks}fr`).join(' ') }}
      >
        {rows.map((row) => (
          <div key={row.section} className="flex min-w-0 gap-1">
            {row.tiles.map((tile: ExamMapTile) => (
              <div
                key={tile.id}
                className={cn('flex min-w-0 flex-col justify-between overflow-hidden rounded-control p-2 sm:p-2.5', TILE_CLASS[tile.level])}
                style={{ flexGrow: tile.marks, flexBasis: 0 }}
              >
                <span className="line-clamp-2 font-heading text-small font-semibold leading-tight">{tile.name}</span>
                <span className="truncate font-heading text-small font-bold tabular-nums">
                  {tile.mastery === null ? TILE_LABEL.untested : `${tile.mastery}%`} · {tile.marks} marks
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
          {(['secure', 'building', 'weak'] as const).map((level) => (
            <li key={level} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={cn('size-2.5 rounded-sm', TILE_CLASS[level])} />
              {TILE_LABEL[level]}
            </li>
          ))}
        </ul>
      </figcaption>
      <ul className="sr-only">
        {tiles.map((t: ExamMapTile) => (
          <li key={t.id}>{t.name}: {t.marks} marks, {TILE_LABEL[t.level]}{t.mastery === null ? '' : `, ${t.mastery}%`}</li>
        ))}
      </ul>
    </figure>
  );
}
```

- [ ] **Step 4: Write `Countdown.tsx`, `NextUp.tsx`, `ReadinessBand.tsx`**

```tsx
import { countdownText, daysUntil, formatExamDate } from '@/lib/readiness/countdown';

interface CountdownProps {
  paper: string;
  examDate: Date;
  /** Passed in, so server and client render the same day. */
  now: Date;
}

/** Spec §1: the countdown to the exam; the screen's one display-size figure. */
export function Countdown({ paper, examDate, now }: CountdownProps) {
  const days = daysUntil(examDate, now);
  if (days <= 0) return <p className="font-heading text-h2 font-semibold">{countdownText(paper, examDate, now)}</p>;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2" aria-label={countdownText(paper, examDate, now)}>
      <span className="font-heading text-display font-bold tabular-nums tracking-[-0.025em]">{days}</span>
      <span className="text-muted-foreground">
        {days === 1 ? 'day' : 'days'} to <b className="font-semibold text-foreground">{paper}</b> · {formatExamDate(examDate)}
      </span>
    </p>
  );
}
```

```tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent } from '@/components/ui/card';

interface NextUpProps {
  eyebrow: string;
  title: string;
  detail?: string;
  actionLabel: string;
  href: string;
}

/** Spec §1: one "next up" action per screen, the one filled button. */
export function NextUp({ eyebrow, title, detail, actionLabel, href }: NextUpProps) {
  return (
    <Card className="border-primary/30 bg-accent/60">
      <CardContent className="space-y-2">
        <p className="text-eyebrow font-semibold uppercase text-accent-foreground">{eyebrow}</p>
        <p className="font-heading text-h3 font-semibold leading-snug">{title}</p>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
        <Link href={href} className={buttonVariants({ size: 'lg' })}>{actionLabel}</Link>
      </CardContent>
    </Card>
  );
}
```

```tsx
import { bandGeometry, bandSentence } from '@/lib/readiness/band';

interface ReadinessBandProps {
  low: number;
  high: number;
  target: number;
}

/** Spec §4: the predicted band against the target on a 0–100 track. */
export function ReadinessBand({ low, high, target }: ReadinessBandProps) {
  const g = bandGeometry({ low, high, target });
  const sentence = bandSentence({ low, high, target });
  return (
    <div className="space-y-2">
      <div role="img" aria-label={sentence} className="relative h-3 rounded-full bg-muted">
        <span className="absolute inset-y-0 rounded-full bg-primary" style={{ left: `${g.left}%`, width: `${Math.max(g.width, 1)}%` }} />
        <span className="absolute -inset-y-1 w-0.5 rounded-full bg-secure-strong" style={{ left: `${g.targetAt}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">{sentence}</p>
    </div>
  );
}
```

- [ ] **Step 5: Write `MarksToGain.tsx`**

```tsx
'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TILE_LABEL, layoutExamMap, topicsByGain, type ExamMapTile, type ExamTopic } from '@/lib/readiness/exam-map';

const BAR: Record<ExamMapTile['level'], string> = {
  secure: 'bg-secure-strong', building: 'bg-building-strong', weak: 'bg-weak-strong', untested: 'bg-transparent',
};

/** Spec §1: marks to gain per topic, written plainly, where the exam map is too small. */
export function MarksToGain({ topics }: { topics: readonly ExamTopic[] }) {
  const rows = useMemo(() => topicsByGain(layoutExamMap(topics)), [topics]);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No topics to show yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((t: ExamMapTile) => (
        <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-3">
          <span className="truncate font-semibold">{t.name}</span>
          <span className="font-heading text-sm font-bold tabular-nums">
            {t.marksToGain === null ? '—' : `+${t.marksToGain}`}
            <span className="sr-only"> marks to gain</span>
          </span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-full max-w-40 rounded-full bg-muted">
              <div className={cn('h-full rounded-full', BAR[t.level])} style={{ width: `${t.mastery ?? 0}%` }} />
            </div>
            <span className="text-caption text-muted-foreground tabular-nums">{t.marks} marks in the exam</span>
          </div>
          {t.level === 'untested' ? (
            <Badge variant="secondary">{TILE_LABEL.untested}</Badge>
          ) : (
            <Badge variant={t.level}>{TILE_LABEL[t.level]}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Write `TrendChart.tsx` and `index.ts`**

```tsx
'use client';

import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useChartTheme } from '@/hooks/useChartTheme';
import { trendDomain } from '@/lib/charts/chart-theme';

interface TrendChartProps {
  points: ReadonlyArray<{ label: string; value: number }>;
  target?: number;
  /** Accessible summary, e.g. "Predicted Paper 1 mark over six weeks, from 48% to 61%; target 75%". */
  label: string;
}

/** Spec §4: Recharts line on tokens: faint grid, dashed target line, emphasised last point. */
export function TrendChart({ points, target, label }: TrendChartProps) {
  const theme = useChartTheme();
  if (points.length === 0) return <p className="text-sm text-muted-foreground">No results yet. The trend starts after the first test.</p>;
  if (!theme) return <Skeleton className="h-44 w-full" />;
  const [lo, hi] = trendDomain(points.map((p) => p.value), target);
  const last = points[points.length - 1];
  const tick = { fill: theme.axis, fontSize: 11, fontFamily: theme.fontFamily };
  return (
    <figure role="img" aria-label={label} className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...points]} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} />
          <YAxis domain={[lo, hi]} tickCount={3} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} tick={tick} width={40} />
          {target !== undefined && (
            <ReferenceLine y={target} stroke={theme.target} strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: `Target ${target}%`, position: 'insideTopRight', fill: theme.target, fontSize: 11 }} />
          )}
          <Line type="monotone" dataKey="value" stroke={theme.series[0]} strokeWidth={2.25} dot={false} activeDot={false} isAnimationActive={false} />
          <ReferenceDot x={last.label} y={last.value} r={4.5} fill={theme.series[0]} stroke="none" />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
```

`src/components/readiness/index.ts`:

```ts
export { ExamMap } from './ExamMap';
export { Countdown } from './Countdown';
export { NextUp } from './NextUp';
export { MarksToGain } from './MarksToGain';
export { ReadinessBand } from './ReadinessBand';
export { TrendChart } from './TrendChart';
```

- [ ] **Step 7: Run the test, the suite and the type-check**

Run: `npx vitest run tests/readiness-components.test.ts && npx vitest run && npx tsc --noEmit`
Expected: all PASS, tsc exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/readiness tests/readiness-components.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(readiness): exam map, countdown, next-up, marks-to-gain, band and trend components" -m "Built on the pure helpers and tokens; used from Phase L/R on (spec §4).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: `/design` gallery (dev only)

**Files:**
- Create: `src/lib/design/gallery.ts`
- Create: `src/app/design/page.tsx`
- Create: `src/components/design-gallery/DesignGallery.tsx`, `TokenTable.tsx`, `TypeScale.tsx`, `ControlStates.tsx`, `DataStates.tsx`, `ReadinessExamples.tsx`
- Test: `tests/design-gallery.test.ts`

**Interfaces:**
- Consumes: `TOKEN_PAIRS`, `MIN_RATIO`, `pairContrast` (Task 2); `EXAMPLE_READINESS` (Task 3); every component from Tasks 5–11; `ThemeToggle` (`src/components/theme/ThemeToggle`).
- Produces: `isDesignGalleryEnabled(nodeEnv: string | undefined): boolean`; the `/design` route.

- [ ] **Step 1: Write the failing test**

`tests/design-gallery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isDesignGalleryEnabled } from '../src/lib/design/gallery';
import { listSourceFiles, readSource } from './support/source';

describe('isDesignGalleryEnabled (spec §5: 404 when NODE_ENV === "production")', () => {
  it.each([['development', true], ['test', true], [undefined, true], ['production', false]] as const)('NODE_ENV=%s → %s', (env, on) => {
    expect(isDesignGalleryEnabled(env)).toBe(on);
  });
});

describe('the /design page', () => {
  const page = readSource('src/app/design/page.tsx');

  it('calls notFound() before rendering anything when the gallery is off', () => {
    expect(page).toMatch(/if \(!isDesignGalleryEnabled\(process\.env\.NODE_ENV\)\) notFound\(\);/);
    expect(page).toMatch(/import \{ notFound \} from 'next\/navigation'/);
  });

  it('is kept out of search engines', () => {
    expect(page).toMatch(/robots: \{ index: false, follow: false \}/);
  });

  it('shows contrast ratios from the same pair table the tests use', () => {
    expect(readSource('src/components/design-gallery/TokenTable.tsx')).toMatch(/TOKEN_PAIRS/);
  });

  it('keeps every gallery file under 300 lines', () => {
    for (const f of listSourceFiles('src/components/design-gallery')) {
      expect(readSource(f).split(/\r?\n/).length, f).toBeLessThanOrEqual(300);
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/design-gallery.test.ts`
Expected: FAIL with `Failed to resolve import "../src/lib/design/gallery"`.

- [ ] **Step 3: Write `gallery.ts` and the page**

```ts
/** The /design gallery is a development reference; production builds 404 it (spec §5). */
export function isDesignGalleryEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production';
}
```

`src/app/design/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isDesignGalleryEnabled } from '@/lib/design/gallery';
import { DesignGallery } from '@/components/design-gallery/DesignGallery';

export const metadata: Metadata = {
  title: 'Blueprint gallery',
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  if (!isDesignGalleryEnabled(process.env.NODE_ENV)) notFound();
  return <DesignGallery />;
}
```

- [ ] **Step 4: Write the gallery sections**

`DesignGallery.tsx` (client) renders a sticky header with the title "Blueprint", a short line ("The reference for Phase D reviews. Flip the theme to check dark."), and `<ThemeToggle />`. Below it are five `<section aria-labelledby>` blocks in a `mx-auto max-w-[1200px] space-y-12 px-4 py-8 md:px-8` column: `TokenTable`, `TypeScale`, `ControlStates`, `DataStates`, `ReadinessExamples`.

`TokenTable.tsx` (client): once mounted, reads each token with `getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim()` and renders the swatches (fill, name, value). Then it renders one `Table` row per `TOKEN_PAIRS` entry: a sample of the fg on the bg, the pair name, the ratio to one decimal from `pairContrast`, and a `Badge variant="secure"` "AA" or `variant="weak"` "Below AA" against `MIN_RATIO[pair.use]`. It re-reads when `useTheme().resolvedTheme` changes.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { pairContrast } from '@/lib/design/contrast';
import { MIN_RATIO, REQUIRED_TOKENS, TOKEN_PAIRS, type TokenPair } from '@/lib/design/token-pairs';

type Tokens = Record<string, string>;

function readTokens(): Tokens {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(REQUIRED_TOKENS.map((t: string) => [t, style.getPropertyValue(`--${t}`).trim()]));
}

export function TokenTable() {
  const { resolvedTheme } = useTheme();
  const [tokens, setTokens] = useState<Tokens | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setTokens(readTokens()));
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme]);
  if (!tokens) return null;
  return (
    <section aria-labelledby="tokens" className="space-y-4">
      <h2 id="tokens" className="text-h2 font-bold">Colour tokens and contrast</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {Object.entries(tokens).map(([name, value]) => (
          <li key={name} className="space-y-1">
            <span className="block h-10 rounded-control border border-border" style={{ background: `var(--${name})` }} />
            <span className="block truncate text-caption font-semibold">{name}</span>
            <span className="block text-caption tabular-nums text-muted-foreground">{value}</span>
          </li>
        ))}
      </ul>
      <div data-scroll-x className="overflow-x-auto rounded-card border border-border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Sample</TableHead><TableHead>Pair</TableHead><TableHead>Ratio</TableHead><TableHead>AA</TableHead></TableRow></TableHeader>
          <TableBody>
            {TOKEN_PAIRS.map((p: TokenPair) => {
              const ratio = pairContrast(tokens[p.fg], tokens[p.bg], tokens[p.ground ?? 'card'], p.bgAlpha ?? 1);
              const ok = ratio >= MIN_RATIO[p.use];
              return (
                <TableRow key={`${p.fg}/${p.bg}/${p.bgAlpha ?? 1}`}>
                  <TableCell><span className="rounded-md px-2 py-1 font-semibold" style={{ color: `var(--${p.fg})`, background: `color-mix(in srgb, var(--${p.bg}) ${(p.bgAlpha ?? 1) * 100}%, var(--${p.ground ?? 'card'}))` }}>Aa</span></TableCell>
                  <TableCell>{p.fg} on {p.bg}{p.bgAlpha ? ` (${p.bgAlpha * 100}%)` : ''}</TableCell>
                  <TableCell className="tabular-nums">{ratio.toFixed(1)}:1</TableCell>
                  <TableCell><Badge variant={ok ? 'secure' : 'weak'}>{ok ? 'AA' : 'Below AA'}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
```

`TypeScale.tsx`: one row per step: `text-caption`, `text-small`, `text-body`, `text-h3`, `text-h2`, `text-h1`, `text-h1-desktop`, `text-display`, `text-eyebrow uppercase`. Each shows the class, the px/line-height from spec §2.3, and a sample line ("Closing two gaps in functions is worth the most marks"), with numbers in `font-heading tabular-nums`.

`ControlStates.tsx`: for each Button variant × size, render default, disabled and loading (a `Loader2`) states. Add a row with `className="ring-2 ring-ring ring-offset-2 ring-offset-background"` labelled "focus (forced)"; hover is live. Then Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, Tabs (default = underline), each with a `Label`, including the disabled and `aria-invalid` states. Then Dialog and Sheet triggers, DropdownMenu, Tooltip and a `toast()` button.

`DataStates.tsx`: Card, Badge (every variant, including secure/building/weak), a `DataTable` with 30 example rows, `StatCard` in three tones, `PageHeader` with eyebrow and action, `EmptyState`, `ErrorState` (with a Retry that toggles `retrying` for 1s), `TableSkeleton`, `ListSkeleton`, `LoadingSpinner`, Progress.

`ReadinessExamples.tsx`: with `EXAMPLE_READINESS` (Task 3) and a fixed `now = new Date(2026, 8, 25)`, render the mockup's layout. On the left: `Countdown` + `ReadinessBand` in a card, `ExamMap` titled "The exam, mapped", and `MarksToGain`. On the right: `NextUp` (`id="next-up"`) and `TrendChart` (label "Predicted Paper 1 mark over six weeks, from 48% to 61%; target 75%"). Use `grid gap-4 lg:grid-cols-[1.35fr_1fr]`. Add a second `ExamMap` with one `mastery: null` topic and one 0-mark topic, to show the untested and dropped cases. Add a third with a single long topic name ("Euclidean geometry and measurement, including proofs"), to show truncation at 320px.

- [ ] **Step 5: Run the test and the type-check**

Run: `npx vitest run tests/design-gallery.test.ts && npx tsc --noEmit`
Expected: PASS; tsc exit 0.

- [ ] **Step 6: Look at it (dev server on :3500, per Task 1 Step 9)**

Open `http://localhost:3500/design` at 1280px and at 375px, in light and dark. Expected: every contrast row shows "AA"; nothing scrolls sideways at 375px; the exam map shows 2 weak, 1 building and 3 secure tiles; toggling the theme recolours the trend line with no reload. Stop the server if you started it.

- [ ] **Step 7: Commit**

```bash
git add src/lib/design/gallery.ts src/app/design src/components/design-gallery tests/design-gallery.test.ts
LANE_SWEEP_OK=1 git commit -m "feat(design): dev-only /design gallery: tokens with contrast, type, every component state" -m "404 in production via notFound() (spec §5); readiness components with the mockup's example data.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Palette scanner + sweep 1 (landing and auth; shell checked)

Sweep tasks change class strings, colour values and imports of tokens only: no logic, no copy, no request changes (Global Constraints). Apply the mapping in **Appendix B** to every flagged class and literal.

**Files:**
- Create: `src/lib/design/palette-scan.ts`
- Create: `tests/support/import-closure.ts`, `tests/support/design-scope.ts`
- Delete: `tests/support/colour-literals.ts` (repoint its two importers to `src/lib/design/palette-scan`)
- Modify (sweep, counts from Appendix A): `src/app/page.tsx` (34 palette, 15 literals), `src/app/login/page.tsx` (1, 12), `src/app/register-student/page.tsx` (0, 4), `src/components/auth/AuthCard.tsx` (2), `AuthLayout.tsx` (2), `DevSignInAccountList.tsx` (5), `DevSignInPanel.tsx` (2), `ForgotPasswordForm.tsx` (7), `PasswordInput.tsx` (2), `ResetPasswordForm.tsx` (4)
- Test: `tests/palette-scan.test.ts`, `tests/palette-scope.test.ts`

**Interfaces:**
- Consumes: `STANDALONE_TEACHER_PREFIXES` (`src/lib/standalone-teacher-paths.ts`); `readSource`, `listSourceFiles`, `ROOT` (Task 5).
- Produces: `PALETTE_CLASS: RegExp`, `COLOUR_LITERAL: RegExp`, `findPaletteClasses(source: string): string[]`, `findColourLiterals(source: string): string[]`; `importClosure(entries: readonly string[]): string[]`; `type DesignArea = 'landing+auth' | 'shell' | 'teacher pages'`, `DESIGN_SCOPE: Record<DesignArea, string[]>`, `COLOUR_LITERAL_EXEMPT: Record<string, string>`. Tasks 14–16 extend `PALETTE_SWEPT` / `LITERAL_SWEPT` in `tests/palette-scope.test.ts`.

- [ ] **Step 1: Write the failing regex test**

`tests/palette-scan.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findColourLiterals, findPaletteClasses } from '../src/lib/design/palette-scan';

describe('findPaletteClasses (ruling R4)', () => {
  it('finds palette classes with variants and opacity', () => {
    expect(findPaletteClasses('className="text-red-500 dark:hover:bg-emerald-50 ring-blue-600/40"'))
      .toEqual(['text-red-500', 'dark:hover:bg-emerald-50', 'ring-blue-600/40']);
  });

  it('catches border sides, ring offsets and gradient stops', () => {
    expect(findPaletteClasses('border-l-amber-400 ring-offset-slate-100 from-indigo-500 to-violet-600'))
      .toEqual(['border-l-amber-400', 'ring-offset-slate-100', 'from-indigo-500', 'to-violet-600']);
  });

  it('ignores tokens, white/black and look-alikes', () => {
    expect(findPaletteClasses('bg-primary text-muted-foreground bg-black/40 text-white bg-secure-strong border-input grid-cols-12 text-red')).toEqual([]);
  });
});

describe('findColourLiterals', () => {
  it('finds hex in arbitrary values and in strings', () => {
    expect(findColourLiterals(`text-[#2563EB] hover:bg-[#1d4ed8] const c = '#10b981'; stroke="#fff"`))
      .toEqual(['[#2563EB]', '[#1d4ed8]', "'#10b981'", '"#fff"']);
  });

  it('ignores anchors and ids that start with #', () => {
    expect(findColourLiterals('href="#features" to="#faq-list"')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/palette-scan.test.ts`
Expected: FAIL with `Failed to resolve import "../src/lib/design/palette-scan"`.

- [ ] **Step 3: Write `src/lib/design/palette-scan.ts`**

```ts
const HUES = 'red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone';
const UTILITIES = 'bg|text|border(?:-[trblxy])?|ring(?:-offset)?|from|to|via|fill|stroke|outline|divide|decoration|placeholder|caret|accent|shadow';

/** A Tailwind palette class (spec §6, ruling R4): a named hue or grey with a numeric shade, any variants, optional opacity. */
export const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:[a-z0-9-]+:)*(?:${UTILITIES})-(?:${HUES})-\\d{2,3}(?:/\\d{1,3})?(?![\\w-])`, 'g');

/** A colour literal in code (spec §7): an arbitrary hex value (`bg-[#2563eb]`) or a quoted hex string (`'#10b981'`). */
export const COLOUR_LITERAL = /\[#[0-9a-fA-F]{3,8}\]|['"`]#[0-9a-fA-F]{3,8}['"`]/g;

export function findPaletteClasses(source: string): string[] {
  return source.match(PALETTE_CLASS) ?? [];
}

export function findColourLiterals(source: string): string[] {
  return source.match(COLOUR_LITERAL) ?? [];
}
```

Run: `npx vitest run tests/palette-scan.test.ts`
Expected: PASS (5).

Delete `tests/support/colour-literals.ts`. In `tests/shell-source.test.ts` and `tests/readiness-components.test.ts` change the import to `import { findColourLiterals } from '../src/lib/design/palette-scan';`.

- [ ] **Step 4: Write the scope support**

`tests/support/import-closure.ts`:

```ts
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './source';

const SRC = path.join(ROOT, 'src');
/** Not followed: the src/types barrel `export *`s admin-only style maps (ruling R3). */
const NOT_FOLLOWED = [path.join(SRC, 'types')];
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile() && /\.(ts|tsx)$/.test(candidate)) return candidate;
  }
  return null;
}

/** Every .ts/.tsx file under src/ reachable by imports from the entry files, as repo-relative posix paths. */
export function importClosure(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const stack = entries.map((e: string) => path.join(ROOT, e));
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
      const next = resolveImport(file, m[1] ?? m[2] ?? m[3]);
      if (next && next.startsWith(SRC) && !NOT_FOLLOWED.some((dir: string) => next.startsWith(dir))) stack.push(next);
    }
  }
  return [...seen].map((f: string) => path.relative(ROOT, f).split(path.sep).join('/')).sort();
}
```

`tests/support/design-scope.ts`:

```ts
import { existsSync } from 'node:fs';
import path from 'node:path';
import { STANDALONE_TEACHER_PREFIXES } from '../../src/lib/standalone-teacher-paths';
import { ROOT, listSourceFiles } from './source';

export type DesignArea = 'landing+auth' | 'shell' | 'teacher pages';

const app = (p: string) => `src/app/${p}`;

/** Every page file under the prefixes a standalone teacher may open (ruling R2). */
function teacherEntries(): string[] {
  const dirs = STANDALONE_TEACHER_PREFIXES.map((p: string) => `src/app/(dashboard)${p}`)
    .filter((d: string) => existsSync(path.join(ROOT, d)));
  return [app('(dashboard)/teacher/page.tsx'), ...dirs.flatMap((d: string) => listSourceFiles(d))];
}

export const DESIGN_SCOPE: Record<DesignArea, string[]> = {
  'landing+auth': [
    'page.tsx', 'teachers/page.tsx', 'login/page.tsx', 'signup/teacher/page.tsx', 'signup/coach/page.tsx',
    'register-student/page.tsx', 'verify-email/page.tsx', 'forgot-password/page.tsx', 'reset-password/page.tsx',
    'auth/change-password/page.tsx',
  ].map(app),
  shell: [app('layout.tsx'), app('(dashboard)/layout.tsx'), app('(dashboard)/teacher/layout.tsx'), app('(dashboard)/nav-config.ts')],
  'teacher pages': teacherEntries(),
};

/** Files allowed colour literals, with the reason (ruling R4/R5). */
export const COLOUR_LITERAL_EXEMPT: Record<string, string> = {
  'src/app/teachers/page.tsx': 'campaign palette shared with the ads (ruling R5)',
  'src/components/teachers-landing/StartFreeLink.tsx': 'campaign palette (ruling R5)',
  'src/components/textbook/subject-colours.ts': 'data palette: one colour per subject cover (ruling R4)',
};
```

- [ ] **Step 5: Write the failing scope test**

`tests/palette-scope.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findColourLiterals, findPaletteClasses } from '../src/lib/design/palette-scan';
import { importClosure } from './support/import-closure';
import { COLOUR_LITERAL_EXEMPT, DESIGN_SCOPE, type DesignArea } from './support/design-scope';
import { readSource } from './support/source';

/** Areas whose palette classes are gone (spec §6). Plan Tasks 13–15 add to these. */
const PALETTE_SWEPT: DesignArea[] = ['landing+auth', 'shell'];
/** Areas whose colour literals are gone (spec §7). */
const LITERAL_SWEPT: DesignArea[] = ['landing+auth', 'shell'];

describe('scope (generated from the imports, ruling R3)', () => {
  it('follows the teacher pages into their components', () => {
    expect(importClosure(DESIGN_SCOPE['teacher pages'])).toEqual(expect.arrayContaining([
      'src/components/curriculum/CurriculumTreeNodeRow.tsx',
      'src/components/student-360/AcademicSummaryCard.tsx',
      'src/components/shared/PageHeader.tsx',
    ]));
  });

  it('does not follow the src/types barrel into admin-only style maps', () => {
    expect(importClosure(DESIGN_SCOPE['landing+auth'])).not.toContain('src/types/migration.ts');
  });
});

describe.each(PALETTE_SWEPT)('%s: palette classes', (area) => {
  const files = importClosure(DESIGN_SCOPE[area]);

  it('reaches real files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files)('%s has none', (file) => {
    expect(findPaletteClasses(readSource(file))).toEqual([]);
  });
});

describe.each(LITERAL_SWEPT)('%s: colour literals', (area) => {
  const files = importClosure(DESIGN_SCOPE[area]).filter((f: string) => !(f in COLOUR_LITERAL_EXEMPT));

  it.each(files)('%s has none', (file) => {
    expect(findColourLiterals(readSource(file))).toEqual([]);
  });
});
```

Run: `npx vitest run tests/palette-scope.test.ts`
Expected: FAIL for exactly the ten landing/auth files listed under **Files** above, each showing its classes (for example `src/app/page.tsx has none` → `['text-gray-600', 'hover:text-gray-900', …]`). A file reached from both areas fails under each. The shell files already pass (swept in Tasks 8–9). If any other file fails, it was reached through an import the inventory missed; sweep it in this task and note it in the commit.

- [ ] **Step 6: Sweep the ten files**

Apply Appendix B to each flagged class and literal. File notes:
- `src/app/page.tsx`: the hero gradient `bg-gradient-to-br from-[#2563EB] via-[#3b5fe5] to-[#4F46E5]` becomes `bg-primary`, since Blueprint has no gradients. Brand icon `text-[#2563EB]` becomes `text-primary`. Buttons with `bg-[#2563EB] … hover:bg-[#1d4ed8]` drop those classes and use the default `Button` variant. Grey text becomes `text-muted-foreground`/`text-foreground`; `bg-gray-50` sections become `bg-muted`. Keep the file ≤ 350 lines (it is 311).
- `src/app/login/page.tsx`: the 8 link/button hex pairs become `text-primary hover:underline underline-offset-4` for links and the plain default `Button` for submits. The rest of the palette follows Appendix B.
- `src/app/register-student/page.tsx`: the same link and button rule.
- `AuthLayout.tsx`: the gradient wrapper becomes `min-h-dvh bg-background`. `AuthCard.tsx`: the logo tile becomes `bg-primary text-primary-foreground`.
- `DevSignInPanel.tsx` / `DevSignInAccountList.tsx`: `bg-blue-600/10` becomes `bg-accent`; `text-blue-600` becomes `text-accent-foreground`; `hover:bg-blue-600/5 focus-visible:bg-blue-600/5` becomes `hover:bg-muted`. The custom `focus-visible:ring-2 focus-visible:ring-blue-600/40` set becomes `FOCUS_RING` from `@/components/ui/focus`. Keep `aria-label="Development sign-in"` and the button text unchanged: the e2e depends on them.
- `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `PasswordInput.tsx`: success text becomes `text-success` on `bg-success-soft`; grey text becomes `text-muted-foreground`; the show/hide toggle gets `FOCUS_RING` and keeps its `aria-label`.

- [ ] **Step 7: Run the scanners, the suite and the type-check**

Run: `npx vitest run tests/palette-scan.test.ts tests/palette-scope.test.ts tests/shell-source.test.ts tests/readiness-components.test.ts`
Expected: PASS.

Run: `npx vitest run && npx tsc --noEmit`
Expected: all PASS, tsc exit 0.

- [ ] **Step 8: Prove behaviour unchanged (servers on :3500/:4500 per Task 1 Step 9)**

Run: `npx playwright test e2e/design-gate.spec.ts -g "public and auth pages"`
Expected: no `request set` failures. Width, label and focus soft failures may remain until Task 16; list any that remain. Then run `npx playwright test e2e/standalone-launch.spec.ts`. Expected: `1 passed`: the sign-up form and the `/register-student` join still work. Stop any server you started.

- [ ] **Step 9: Commit**

```bash
git add src/lib/design/palette-scan.ts tests/support tests/palette-scan.test.ts tests/palette-scope.test.ts tests/shell-source.test.ts tests/readiness-components.test.ts src/app/page.tsx src/app/login/page.tsx src/app/register-student/page.tsx src/components/auth
LANE_SWEEP_OK=1 git commit -m "refactor(design): landing and auth on Blueprint tokens; palette scanner over the in-scope imports" -m "Class and colour changes only; request sets unchanged. Scanner covers landing+auth and the shell (spec §6).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Sweep 2: standalone teacher pages (8 files)

**Files (counts from Appendix A):**
- Modify: `src/app/(dashboard)/my/billing/page.tsx` (5; 344 lines, so keep it ≤ 350), `src/app/(dashboard)/teacher/settings/join-school/page.tsx` (11), `src/components/content/renderers/StepRevealBlock.tsx` (2), `src/components/courses/CourseBuilderMetaPanel.tsx` (8), `src/components/curriculum/CurriculumTreeNodeRow.tsx` (28), `src/components/student-360/AcademicSummaryCard.tsx` (25), `src/components/student-360/AttendanceSummaryCard.tsx` (11 + 3 literals), `src/components/student-360/RecentActivityCard.tsx` (12)
- Modify: `tests/palette-scope.test.ts` (add `'teacher pages'` to `PALETTE_SWEPT`)

**Interfaces:**
- Consumes: `findPaletteClasses`, `importClosure`, `DESIGN_SCOPE` (Task 13); Badge `secure|building|weak` variants (Task 7).
- Produces: the `teacher pages` area free of palette classes.

- [ ] **Step 1: Extend the scanner (failing)**

In `tests/palette-scope.test.ts` set `const PALETTE_SWEPT: DesignArea[] = ['landing+auth', 'shell', 'teacher pages'];`.

Run: `npx vitest run tests/palette-scope.test.ts`
Expected: FAIL for exactly the eight files above. Any other file failing was missed by the inventory: sweep it here and note it in the commit.

- [ ] **Step 2: Sweep with Appendix B, plus these file notes**

- `join-school/page.tsx` and `CourseBuilderMetaPanel.tsx`: the amber warning boxes (`border-amber-200 bg-amber-50 … text-amber-800`, `border-amber-500/40 bg-amber-500/10 … text-amber-700`) become `rounded-card border border-attention/30 bg-attention-soft p-4`, with text `text-attention` and body text `text-foreground`. The icon becomes `text-attention`. Drop the `dark:` duplicates: tokens carry dark.
- `CurriculumTreeNodeRow.tsx`: the 7-entry node-type colour map (`phase: 'bg-violet-100 text-violet-700 …'`, `grade`, `subject`, `term`, `topic`, `subtopic`, `outcome`) becomes one neutral chip for every type: `'bg-muted text-muted-foreground'`. The chip's word names the type, so colour is decoration (ruling R21). Keep the map's keys so no logic changes.
- `AcademicSummaryCard.tsx`: keep every threshold branch (80/70/60/50/40) and return tokens. `≥ 80` and `≥ 70` become `bg-secure text-secure-strong` (bars `bg-secure-strong`); `≥ 60` becomes `bg-building text-building-strong` (bar `bg-building-strong`); `≥ 50`, `≥ 40` and below become `bg-weak text-weak-strong` (bar `bg-weak-strong`). Ruling R21: sweeps do not move thresholds.
- `AttendanceSummaryCard.tsx`: in the legend data, `color: 'bg-emerald-500'` becomes `'bg-success'`, `'bg-yellow-500'` becomes `'bg-attention'`, and `'bg-blue-500'` becomes `'bg-info'` (absent, if present, becomes `'bg-destructive'`). The `ringColor` hex values become `'var(--success)'`, `'var(--attention)'`, `'var(--info)'` and `'var(--destructive)'`. Where the ring is drawn, pass them through `style={{ stroke: ringColor }}` (or `style={{ background: … }}` for a conic gradient) instead of an SVG attribute.
- `RecentActivityCard.tsx`: activity-type icon tints become `bg-accent text-accent-foreground` for neutral types, `bg-success-soft text-success` for positive ones, `bg-destructive-soft text-destructive` for negative ones, and `bg-attention-soft text-attention` for pending ones. Keep the type → style map's keys.
- `my/billing/page.tsx`, `StepRevealBlock.tsx`: Appendix B. Plan or status accents map to `bg-accent text-accent-foreground`, success to `text-success`.

- [ ] **Step 3: Run the scanners, the suite and the type-check**

Run: `npx vitest run tests/palette-scope.test.ts && npx vitest run && npx tsc --noEmit`
Expected: all PASS, tsc exit 0.

- [ ] **Step 4: Prove behaviour unchanged**

With servers up (Task 1 Step 9), run: `npx playwright test e2e/design-gate.spec.ts -g "standalone teacher pages"`
Expected: no `request set` failures (width, label and focus faults may remain for Task 16). Stop any server you started.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/my/billing/page.tsx" "src/app/(dashboard)/teacher/settings/join-school/page.tsx" src/components/content/renderers/StepRevealBlock.tsx src/components/courses/CourseBuilderMetaPanel.tsx src/components/curriculum/CurriculumTreeNodeRow.tsx src/components/student-360 tests/palette-scope.test.ts
LANE_SWEEP_OK=1 git commit -m "refactor(design): standalone teacher pages on Blueprint tokens" -m "Class changes only; thresholds and maps keep their keys (ruling R21); request sets unchanged.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Sweep 3: charts onto `chartTheme` (3 files)

**Files:**
- Modify: `src/components/charts/index.tsx` (6 literals), `src/components/attendance/AttendanceStatusChart.tsx` (4), `src/components/courses/LessonDropOffChart.tsx` (2)
- Modify: `tests/palette-scope.test.ts` (add `'teacher pages'` to `LITERAL_SWEPT`)
- Test: extend `tests/chart-theme.test.ts`

**Interfaces:**
- Consumes: `useChartTheme`, `seriesColour` (Task 4).
- Produces: every chart in scope draws with token colours (spec §4: "used by every chart; no chart sets its own colours").

- [ ] **Step 1: Extend the tests (failing)**

In `tests/palette-scope.test.ts` set `const LITERAL_SWEPT: DesignArea[] = ['landing+auth', 'shell', 'teacher pages'];`. Append to `tests/chart-theme.test.ts`:

```ts
import { readSource } from './support/source';

describe('charts use the one theme', () => {
  it.each(['src/components/charts/index.tsx', 'src/components/attendance/AttendanceStatusChart.tsx', 'src/components/courses/LessonDropOffChart.tsx'])(
    '%s reads its colours from useChartTheme', (file) => {
      const src = readSource(file);
      expect(src).toMatch(/useChartTheme\(\)/);
      expect(src).not.toMatch(/hsl\(var\(--/);
    },
  );
});
```

Run: `npx vitest run tests/palette-scope.test.ts tests/chart-theme.test.ts`
Expected: FAIL for the three chart files (colour literals such as `'#2563EB'`, and no `useChartTheme()`).

- [ ] **Step 2: Move the charts onto the theme**

`src/components/charts/index.tsx`: delete `const COLORS = [...]`. In each chart component, add `const theme = useChartTheme();` after the empty-data check, and while it is null render `<Skeleton style={{ height }} className="w-full" />` (import `Skeleton` from `@/components/ui/skeleton`). Replace:
- `stroke={line.color || COLORS[i]}` with `stroke={line.color ?? seriesColour(theme, i)}`, and the same for bars, areas and pie `Cell` fills;
- `className="stroke-muted"` on `CartesianGrid` with `stroke={theme.grid}`;
- `tick={{ fill: 'hsl(var(--muted-foreground))' }}` with `tick={{ fill: theme.axis, fontSize: 12, fontFamily: theme.fontFamily }}`;
- the `Tooltip` `contentStyle` with `{ borderRadius: 10, border: \`1px solid ${theme.border}\`, background: theme.surface, color: theme.text }`.

Props are unchanged; a caller-passed `color` still wins.

`AttendanceStatusChart.tsx` and `LessonDropOffChart.tsx`: replace each hex with the theme. Present/positive becomes `theme.series[1]` (secure green), late becomes `theme.series[2]`, absent/drop-off becomes `theme.series[3]`, neutral becomes `theme.series[0]`; grid and axis as above. Keep their empty-data branches.

- [ ] **Step 3: Run the tests, the suite and the type-check**

Run: `npx vitest run tests/palette-scope.test.ts tests/chart-theme.test.ts && npx vitest run && npx tsc --noEmit`
Expected: all PASS, tsc exit 0.

- [ ] **Step 4: Look at one chart in both themes**

With the dev server up, open `/teacher/attendance/report` (it uses `AttendanceStatusChart`) and `/design`, and toggle the theme. Expected: the series recolour, with no black axis ticks. Stop any server you started.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/index.tsx src/components/attendance/AttendanceStatusChart.tsx src/components/courses/LessonDropOffChart.tsx tests/palette-scope.test.ts tests/chart-theme.test.ts
LANE_SWEEP_OK=1 git commit -m "refactor(charts): every in-scope chart on chartTheme" -m "No chart sets its own colours (spec §4); fixes the invalid hsl(var(--…)) tick colour (ruling R17).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Machine gate: width sweep green, screenshots, gate script, production 404, full suites

**Files:**
- Create: `e2e/support/session.ts` (move `settle` and `signInAsStandaloneTeacher` out of `design-gate.spec.ts`)
- Modify: `e2e/design-gate.spec.ts` (import them)
- Create: `e2e/design-screens.spec.ts`
- Create: `scripts/design-gate-lib.mjs`, `scripts/design-gate.mjs`
- Modify: `package.json` (`"gate:design": "node scripts/design-gate.mjs"`)
- Modify: whatever page files the sweep still flags (class changes only)
- Test: `tests/design-gate.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `fileSizeViolations(rows: Array<{ path: string; status: string; lines: number }>): string[]` and `parseNameStatus(text: string): Array<{ status: string; path: string }>` from `scripts/design-gate-lib.mjs`; `npm run gate:design`, which is red or green (spec §7).

- [ ] **Step 1: Write the failing gate-lib test**

`tests/design-gate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fileSizeViolations, parseNameStatus } from '../scripts/design-gate-lib.mjs';

describe('parseNameStatus', () => {
  it('reads git diff --name-status, keeps the new path of a rename and drops deletions', () => {
    expect(parseNameStatus('A\tsrc/a.ts\nM\tsrc/b.tsx\nD\tsrc/c.ts\nR100\tsrc/old.ts\tsrc/new.ts\n')).toEqual([
      { status: 'A', path: 'src/a.ts' }, { status: 'M', path: 'src/b.tsx' }, { status: 'R', path: 'src/new.ts' },
    ]);
  });
});

describe('fileSizeViolations (spec §7: new files ≤ 300 lines, touched ≤ 350)', () => {
  it('holds new files to 300 and touched files to 350', () => {
    expect(fileSizeViolations([
      { path: 'src/new.tsx', status: 'A', lines: 301 },
      { path: 'src/ok-new.tsx', status: 'A', lines: 300 },
      { path: 'src/old.tsx', status: 'M', lines: 351 },
      { path: 'src/ok-old.tsx', status: 'M', lines: 350 },
    ])).toEqual(['src/new.tsx: 301 lines (new, max 300)', 'src/old.tsx: 351 lines (touched, max 350)']);
  });

  it('ignores files that are not code', () => {
    expect(fileSizeViolations([{ path: 'e2e/baselines/request-sets.json', status: 'A', lines: 900 }])).toEqual([]);
  });
});
```

Run: `npx vitest run tests/design-gate.test.ts`
Expected: FAIL with `Failed to resolve import "../scripts/design-gate-lib.mjs"`.

- [ ] **Step 2: Write `scripts/design-gate-lib.mjs`**

```js
// @ts-check
/** Pure helpers for the Phase D machine gate (spec §7). */

/**
 * @param {string} text output of `git diff --name-status`
 * @returns {Array<{ status: string, path: string }>}
 */
export function parseNameStatus(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line) => {
    const parts = line.split('\t');
    return { status: parts[0].charAt(0), path: parts[parts.length - 1] };
  }).filter((row) => row.status !== 'D');
}

/**
 * @param {Array<{ path: string, status: string, lines: number }>} rows
 * @returns {string[]}
 */
export function fileSizeViolations(rows) {
  return rows
    .filter((row) => /\.(ts|tsx|mjs)$/.test(row.path))
    .filter((row) => row.lines > (row.status === 'A' ? 300 : 350))
    .map((row) => `${row.path}: ${row.lines} lines (${row.status === 'A' ? 'new, max 300' : 'touched, max 350'})`);
}
```

Run: `npx vitest run tests/design-gate.test.ts`
Expected: PASS (3).

- [ ] **Step 3: Write `scripts/design-gate.mjs` and the npm script**

```js
// @ts-check
// Phase D machine gate (spec §7). Run before any human review; red refuses the hand-over.
// Needs the backend on :4500 (DEV_SIGN_IN=true) and this checkout's dev server on :3500 unless GATE_E2E=0.
import { execSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileSizeViolations, parseNameStatus } from './design-gate-lib.mjs';

const failures = [];
const sh = (cmd) => execSync(cmd, { stdio: 'inherit' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function step(label, fn) {
  console.log(`\n▶ ${label}`);
  try {
    await fn();
    console.log(`✔ ${label}`);
  } catch (err) {
    failures.push(label);
    console.error(`✘ ${label}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
  }
}

async function status(url) {
  try {
    return (await fetch(url, { redirect: 'manual' })).status;
  } catch {
    return 0;
  }
}

await step('unit tests: tokens AA, palette scanner, helpers', () => sh('npx vitest run'));
await step('type-check', () => sh('npx tsc --noEmit'));
await step('file sizes: new ≤ 300, touched ≤ 350', () => {
  const base = execSync('git merge-base origin/master HEAD').toString().trim();
  const rows = parseNameStatus(execSync(`git diff --name-status ${base} HEAD`).toString())
    .map((row) => ({ ...row, lines: readFileSync(row.path, 'utf8').split(/\r?\n/).length }));
  const bad = fileSizeViolations(rows);
  if (bad.length > 0) throw new Error(bad.join('; '));
});
await step('production build', () => sh('npx next build'));
await step('/design is 404 in production', async () => {
  const server = spawn('npx', ['next', 'start', '-p', '3599'], { shell: true, stdio: 'ignore' });
  try {
    let code = 0;
    for (let i = 0; i < 60 && code === 0; i += 1) {
      await sleep(1000);
      code = await status('http://localhost:3599/design');
    }
    if (code !== 404) throw new Error(`expected 404, got ${code}`);
  } finally {
    if (process.platform === 'win32' && server.pid) execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
    else server.kill();
  }
});
if (process.env.GATE_E2E !== '0') {
  await step('servers up (frontend :3500, backend dev sign-in :4500)', async () => {
    if ((await status('http://localhost:3500/login')) !== 200) throw new Error('frontend :3500 not up');
    if ((await status('http://localhost:4500/api/auth/dev-sign-in/accounts')) !== 200) throw new Error('backend dev sign-in not up');
  });
  await step('widths, labels, focus, request sets (Playwright)', () => sh('npx playwright test e2e/design-gate.spec.ts'));
  await step('launch walkthrough (Playwright)', () => sh('npx playwright test e2e/standalone-launch.spec.ts'));
}

if (failures.length > 0) {
  console.error(`\nGate RED: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nGate GREEN');
```

In `package.json` `scripts`, add `"gate:design": "node scripts/design-gate.mjs"`.

- [ ] **Step 4: Share the session helpers and add the screenshots spec**

`e2e/support/session.ts`:

```ts
import type { Page } from '@playwright/test';

export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

/** The dev sign-in panel's standalone teacher (Lindiwe Dube); no password is typed. */
export async function signInAsStandaloneTeacher(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('[aria-label="Development sign-in"]').getByRole('button', { name: /Standalone teacher/ }).click();
  await page.waitForURL(/\/teacher(\/|$)/);
}
```

In `e2e/design-gate.spec.ts` delete the local `settle` and `signInAsStandaloneTeacher` and add `import { settle, signInAsStandaloneTeacher } from './support/session';`.

`e2e/design-screens.spec.ts`:

```ts
import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { assertLocalUrl } from './support/local';
import { PUBLIC_ROUTES, TEACHER_ROUTES } from './support/design-routes';
import { settle, signInAsStandaloneTeacher } from './support/session';

/** Spec §7 evidence: one screenshot per in-scope page at 1280 (light) and 375 (dark). E2E_SCREENS=1 to run. */
const OUT = path.join(__dirname, '.screens');
const slug = (route: string) => (route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^\w]+/g, '-'));

test.skip(process.env.E2E_SCREENS !== '1', 'Screenshots run only with E2E_SCREENS=1');

async function shoot(page: Page, route: string): Promise<void> {
  for (const [width, height, scheme] of [[1280, 800, 'light'], [375, 812, 'dark']] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width, height });
    const response = await page.goto(route);
    if (response?.status() === 404) return;
    await settle(page);
    await page.screenshot({ path: path.join(OUT, `${slug(route)}-${width}-${scheme}.png`), fullPage: true });
  }
}

test('public and auth pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  mkdirSync(OUT, { recursive: true });
  for (const route of PUBLIC_ROUTES) await shoot(page, route);
});

test('standalone teacher pages', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  mkdirSync(OUT, { recursive: true });
  await signInAsStandaloneTeacher(page);
  for (const route of TEACHER_ROUTES) await shoot(page, route);
});
```

- [ ] **Step 5: Run the browser gate and fix what is left (servers per Task 1 Step 9)**

Run: `npx playwright test e2e/design-gate.spec.ts`
Expected at first: FAIL only on width, label or focus faults still left on individual pages. The request sets must all match. For each remaining fault, make a class-only fix with the CLAUDE.md responsive patterns:
- a fixed width `w-40` becomes `w-full sm:w-40`;
- a bare `grid-cols-3/4` becomes `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`;
- a `TabsList` with 5+ items gets `flex-wrap`;
- a wide table is wrapped in `<div data-scroll-x className="overflow-x-auto">`;
- long text in a flex row gets `min-w-0` + `truncate`;
- an unlabelled control gets `<Label htmlFor>` or `aria-label`;
- an icon-only button gets `aria-label`.

Re-run until the spec is green.
Expected: `2 passed`. The detail routes are either swept or listed as `skipped` annotations; name the skipped ones in the commit body for the human pass.

- [ ] **Step 6: Take the evidence screenshots**

Run: `E2E_SCREENS=1 npx playwright test e2e/design-screens.spec.ts`
Expected: `2 passed`, and `e2e/.screens/` holds `<page>-1280-light.png` and `<page>-375-dark.png` for each in-scope route (gitignored; hand them to the reviewer).

- [ ] **Step 7: Run the whole gate**

Run: `npm run gate:design`
Expected: every step `✔`, ending in `Gate GREEN`. This includes `/design is 404 in production` and the launch walkthrough (`1 passed`). If a step is `✘`, fix it, then re-run the whole gate. Stop every server you started (`preview_stop`), and confirm nothing of yours is left on :3599: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3599/` prints `000`.

- [ ] **Step 8: Commit**

```bash
git add scripts/design-gate-lib.mjs scripts/design-gate.mjs package.json tests/design-gate.test.ts e2e/support/session.ts e2e/design-gate.spec.ts e2e/design-screens.spec.ts src
LANE_SWEEP_OK=1 git commit -m "test(design): Phase D machine gate green: widths, labels, focus, request sets, sizes, build, prod 404" -m "npm run gate:design runs the spec §7 gate; e2e/design-screens.spec.ts takes the 1280 light / 375 dark evidence.
Detail routes left to the human pass: <the skipped annotations from Step 5, or 'none'>.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

After this commit the branch goes to one fresh reviewer: the spec §7 human pass, binary per page, with blockers reopening. The orchestrator ships it by the compromise protocol. This plan does not push.

---

## Appendix A: in-scope inventory (generated from the code)

Generated on `origin/master` 0d42365 (2026-09-25) by following imports from the entry pages of each area (ruling R2), with `src/types/**` not followed (R3), and counting with the Task 13 regexes. The permanent generator is `importClosure(DESIGN_SCOPE[area])` in `tests/support/import-closure.ts`. The one-off script that produced this table is `C:\Users\shaun\AppData\Local\Temp\claude\C--dev-campusly\2e66a1db-cc40-41f7-bcc7-6d51c7f0aaf6\scratchpad\inventory.mjs` (run `node inventory.mjs md`).

**Totals.**
- Repo-wide: 2,214 palette classes in 270 files (spec §6 said 2,168 in ~200).
- In scope: **468 files**, each counted once in the first area that reaches it: landing+auth 45, shell 57, teacher pages 366.
- **20 in-scope files carry 166 palette classes.**
- 9 files carry 49 non-exempt colour literals; 3 files hold 46 exempt literals (R4/R5).
- `white`/`black` utilities: 82, not palette classes; judged in the human pass.

Only files with at least one palette class, colour literal or white/black utility are listed. The swept-by column names the task that owns the file.

| Area | File | Palette | Literals | White/black | Lines | Swept by |
|---|---|---:|---:|---:|---:|---|
| landing+auth | `src/app/login/page.tsx` | 1 | 12 | 3 | 147 | Task 13 |
| landing+auth | `src/app/page.tsx` | 34 | 15 | 18 | 311 | Task 13 |
| landing+auth | `src/app/register-student/page.tsx` | 0 | 4 | 3 | 191 | Task 13 |
| landing+auth | `src/app/teachers/page.tsx` | 0 | (7 exempt) | 1 | 46 | none (R5) |
| landing+auth | `src/components/auth/AuthCard.tsx` | 2 | 0 | 0 | 46 | Task 13 |
| landing+auth | `src/components/auth/AuthLayout.tsx` | 2 | 0 | 0 | 14 | Task 13 |
| landing+auth | `src/components/auth/DevSignInAccountList.tsx` | 5 | 0 | 0 | 60 | Task 13 |
| landing+auth | `src/components/auth/DevSignInPanel.tsx` | 2 | 0 | 0 | 68 | Task 13 |
| landing+auth | `src/components/auth/ForgotPasswordForm.tsx` | 7 | 0 | 3 | 105 | Task 13 |
| landing+auth | `src/components/auth/PasswordInput.tsx` | 2 | 0 | 0 | 55 | Task 13 |
| landing+auth | `src/components/auth/ResetPasswordForm.tsx` | 4 | 0 | 3 | 95 | Task 13 |
| landing+auth | `src/components/teachers-landing/ClosingCta.tsx` | 0 | 0 | 5 | 32 | none (R5) |
| landing+auth | `src/components/teachers-landing/EveningTimeline.tsx` | 0 | 0 | 7 | 71 | none (R5) |
| landing+auth | `src/components/teachers-landing/MorningBand.tsx` | 0 | 0 | 4 | 71 | none (R5) |
| landing+auth | `src/components/teachers-landing/NightClockHero.tsx` | 0 | 0 | 7 | 110 | none (R5) |
| landing+auth | `src/components/teachers-landing/StartFreeLink.tsx` | 0 | (1 exempt) | 1 | 26 | none (R5) |
| landing+auth | `src/components/teachers-landing/TeacherPlans.tsx` | 0 | 0 | 5 | 72 | none (R5) |
| landing+auth | `src/components/teachers-landing/TeachersHeader.tsx` | 0 | 0 | 5 | 36 | none (R5) |
| shell | `src/components/layout/Sidebar.tsx` | 0 | 3 | 2 | 134 | Task 8 |
| shell | `src/components/notifications/NotificationBell.tsx` | 1 | 0 | 0 | 44 | Task 9 |
| shell | `src/components/notifications/NotificationItem.tsx` | 1 | 0 | 0 | 62 | Task 9 |
| shell | `src/components/subscription/TrialBanner.tsx` | 3 | 0 | 0 | 30 | Task 9 |
| shell | `src/components/ui/dialog.tsx` | 0 | 0 | 1 | 161 | Task 6 |
| shell | `src/components/ui/sheet.tsx` | 0 | 0 | 1 | 139 | Task 6 |
| teacher pages | `src/app/(dashboard)/my/billing/page.tsx` | 5 | 0 | 0 | 344 | Task 14 |
| teacher pages | `src/app/(dashboard)/teacher/settings/join-school/page.tsx` | 11 | 0 | 0 | 156 | Task 14 |
| teacher pages | `src/components/ai-tools/ImageDropzone.tsx` | 0 | 0 | 2 | 332 | human pass |
| teacher pages | `src/components/ai-tools/MarkingPagesLightbox.tsx` | 0 | 0 | 8 | 104 | human pass |
| teacher pages | `src/components/attendance/AttendanceStatusChart.tsx` | 0 | 4 | 0 | 100 | Task 15 |
| teacher pages | `src/components/charts/index.tsx` | 0 | 6 | 0 | 113 | Task 15 |
| teacher pages | `src/components/content/renderers/MermaidBlock.tsx` | 0 | 0 | 1 | 121 | human pass |
| teacher pages | `src/components/content/renderers/StepRevealBlock.tsx` | 2 | 0 | 0 | 70 | Task 14 |
| teacher pages | `src/components/courses/CourseBuilderMetaPanel.tsx` | 8 | 0 | 0 | 247 | Task 14 |
| teacher pages | `src/components/courses/LessonDropOffChart.tsx` | 0 | 2 | 0 | 44 | Task 15 |
| teacher pages | `src/components/curriculum/CurriculumTreeNodeRow.tsx` | 28 | 0 | 0 | 219 | Task 14 |
| teacher pages | `src/components/student-360/AcademicSummaryCard.tsx` | 25 | 0 | 0 | 95 | Task 14 |
| teacher pages | `src/components/student-360/AttendanceSummaryCard.tsx` | 11 | 3 | 0 | 127 | Task 14 |
| teacher pages | `src/components/student-360/RecentActivityCard.tsx` | 12 | 0 | 0 | 139 | Task 14 |
| teacher pages | `src/components/textbook/BookCover.tsx` | 0 | 0 | 2 | 144 | human pass |
| teacher pages | `src/components/textbook/subject-colours.ts` | 0 | (38 exempt) | 0 | 66 | none (R4) |

Line counts come from splitting on newlines, so they can be one higher than an editor's count.

## Appendix B: sweep mapping (palette → token)

Apply by meaning, not by hue. Drop every `dark:` colour duplicate: the tokens carry dark. When the same class string repeats, map each occurrence alike.

| Found (any shade, any variant prefix) | Meaning | Replace with |
|---|---|---|
| `text-gray/slate/zinc/neutral/stone-800…950` | ink | `text-foreground` |
| `text-gray/slate/…-400…700`, `placeholder:text-gray-*` | secondary text | `text-muted-foreground` |
| `bg-white` used as a surface | card | `bg-card` |
| `bg-gray/slate-50…200` | quiet fill | `bg-muted` |
| `border-gray/slate-100…300`, `divide-gray-*` | hairline | `border-border`, `divide-border` |
| a control's edge (input, select, checkbox) in grey | UI edge | `border-input` |
| `text-blue/indigo-500…700`, `text-[#2563EB]`, `hover:text-[#1d4ed8]` | link, brand | `text-primary` (+ `hover:underline underline-offset-4`) |
| `bg-blue/indigo-500…700`, `bg-[#2563EB]`, `hover:bg-[#1d4ed8]` | primary action | the default `Button`, or `bg-primary text-primary-foreground hover:bg-primary/90` |
| `bg-blue-50/100`, `bg-blue-600/5…10`, `bg-indigo-50` | selected / soft highlight | `bg-accent` (text `text-accent-foreground`) |
| gradients `from-*/via-*/to-*` | decoration | `bg-primary` (hero) or `bg-background` (page) |
| `text/bg/border-green/emerald/teal-*` | success, present, paid | `text-success`, `bg-success-soft`, `border-success/30` |
| `text/bg/border-amber/yellow/orange-*` | warning, late, pending | `text-attention`, `bg-attention-soft`, `border-attention/30` |
| `text/bg/border-red/rose-*` | error, absent, destructive | `text-destructive`, `bg-destructive-soft` (or `bg-destructive/10`), `border-destructive/30` |
| `text/bg-sky/cyan-*` | information | `text-info`, `bg-info-soft` |
| a percentage coloured by thresholds | performance | keep the branches; map ≥ 70 to `secure`, 60–69 to `building`, < 60 to `weak` fill/strong pairs (ruling R21) |
| `purple/violet/fuchsia/pink/lime` as a category colour | decoration | `bg-muted text-muted-foreground` chip (R21), or `bg-accent text-accent-foreground` for the current item |
| custom `focus:`/`focus-visible:ring-*` sets | focus | `FOCUS_RING` from `@/components/ui/focus` |
| a chart hex or `hsl(var(--…))` | chart colour | `useChartTheme()` + `seriesColour` / `theme.grid` / `theme.axis` |
| an SVG or inline-style hex | graphic colour | `style={{ stroke: 'var(--token)' }}` or the chart theme |

## Self-review

- **Spec coverage.** §1 (countdown, next-up, marks to gain, exam map): Tasks 3, 11, 12. §2 tokens, type, shape, motion: Task 2 (+5–7 for component use). §3 shell: Tasks 8–9. §4 components: Tasks 5–7, 10, 11; `chartTheme`: Tasks 4, 15. §5 gallery: Task 12, plus the prod 404 in Task 16. §6 sweep: Tasks 13–15 and Appendix A; its "test lists the in-scope directories" is refined by R3. §7 gate: Tasks 1 and 16, plus the scanners and the token test. §8 rulings: R5, R8, R9 and R21 honour them.
- **Placeholders.** None in code steps. Two commit bodies ask for runtime output (Task 1's fault list, Task 16's skipped routes): that is data the run produces, not missing design.
- **Type consistency.**
  - `ExamTopic` / `ExamMapTile` / `TileLevel`: Task 3 → Task 11.
  - `ChartTheme` / `seriesColour` / `trendDomain`: Task 4 → Tasks 11, 15.
  - `TOKEN_PAIRS` / `pairContrast` / `MIN_RATIO` / `REQUIRED_TOKENS`: Task 2 → Task 12.
  - `FOCUS_RING` / `TOUCH_TARGET` / `MOTION`: Task 5 → Tasks 6–13.
  - `buttonVariants` / `badgeVariants`: Tasks 5, 7 → Tasks 11, 12.
  - `isNavItemActive` / `phoneTabs` / `isTabActive` / `TAB_CLASS`: Tasks 8, 9.
  - `findColourLiterals`: stop-gap in Task 8, final in Task 13.
  - `importClosure` / `DESIGN_SCOPE`: Task 13 → Tasks 14–15.
  - `settle` / `signInAsStandaloneTeacher`: Task 1, moved in Task 16.
- **Review Focus.** Each of the five lines has a test in its owning task: 1 → Task 3 exam map; 2 → Task 3 countdown; 3 → Task 2 token and font tests; 4 → Task 1 `<main>` overflow check + the Task 12 gallery in the sweep; 5 → Task 4 `chartTheme` reader tests.

