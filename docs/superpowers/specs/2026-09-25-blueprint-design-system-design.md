# Blueprint — Campusly's design system (Phase D)

**Date:** 2026-09-25 · **Status:** direction chosen (Shaun delegated the choice, 2026-09-25) · Phase D of the [readiness programme](2026-09-25-readiness-programme.md)
**Mockup:** https://claude.ai/artifact/PfhJ913v1umQS812NMpjR1 (direction C, "Blueprint")

## 1. Decision

**Blueprint** (direction C) is Campusly's look for every portal, with two borrowings:
- from *Training Plan*: the **countdown to the exam** and **one "next up" action per screen** (the one filled button; everything else is quieter);
- from *Answer Script*: **"marks to gain"** per topic, written plainly, in lists and tables where the exam map is too small.

**Why Blueprint:** learners and teachers work in it for hours, so calm clarity beats drama; it reads best on a phone; it carries dense teacher screens as well as learner ones; and its signature — **the exam map** (block size = marks in the final exam, colour = mastery) — is the product's idea made visible, and works for every subject. Rejected: *Answer Script* (serif headings feel dated at small sizes and on phones); *Training Plan* (the dark sporty frame tires over long sessions and fits teachers poorly).

**Replaces** the teacher-only "night-back" look (`[data-portal="teacher"]` tokens, Bricolage/Instrument/JetBrains fonts) and the stock shadcn greys on every other portal.

## 2. Tokens

All colour, type, radius, shadow and motion values are CSS custom properties in `src/app/globals.css`, mapped into Tailwind through the existing `@theme inline` block, so shadcn-style class names (`bg-background`, `text-muted-foreground`, `bg-primary`…) keep working. One set for every portal; the `teacher` custom variant and portal-scoped tokens are removed.

### 2.1 Colour — light (`:root`)

| Token | Value | Use |
|---|---|---|
| `--background` | `#F3F5FA` | app ground |
| `--card` / `--popover` | `#FFFFFF` | surfaces |
| `--foreground` | `#0B1B33` | ink |
| `--muted` | `#EEF1F7` | quiet fills (table heads, chips) |
| `--muted-foreground` | `#5B6B82` | secondary text (5.0:1 on ground) |
| `--border` / `--input` | `#E2E7F0` | hairlines, inputs |
| `--primary` | `#1554F0` | the one action, links, selection |
| `--primary-foreground` | `#FFFFFF` | |
| `--accent` | `#EAF0FE` | selected nav, soft highlight |
| `--accent-foreground` | `#1554F0` | |
| `--ring` | `#1554F0` | focus ring (2px, 2px offset) |
| `--destructive` | `#C8372D` | errors, destructive actions |
| `--secure` / `--secure-strong` | `#E3F4F1` / `#137A6B` | mastery ≥ 70% (fill / text-on-white and tile) |
| `--building` / `--building-strong` | `#FCF1DC` / `#8A5A00` | mastery 60–69% |
| `--weak` / `--weak-strong` | `#FCE8E5` / `#C2412F` | mastery < 60% |
| `--chart-1…5` | `#1554F0`, `#137A6B`, `#E3A02F`, `#C2412F`, `#7A8BA6` | categorical series |

Mastery thresholds are one helper (`masteryLevel(pct)` → `'secure' | 'building' | 'weak'`), never re-typed per screen. Exam-map tiles use the `-strong` colours with white text (≥ 4.5:1); `building` tiles use `--building` fill with `--building-strong` text.

### 2.2 Colour — dark (`.dark`, driven by next-themes, system default)

| Token | Value |
|---|---|
| `--background` | `#0A1222` |
| `--card` / `--popover` | `#111B2E` |
| `--foreground` | `#E8EEF8` |
| `--muted` | `#16233A` |
| `--muted-foreground` | `#9AA8BF` |
| `--border` / `--input` | `#22314A` |
| `--primary` | `#6B95FF` · `--primary-foreground` `#08142B` |
| `--accent` | `#16264A` · `--accent-foreground` `#9DB9FF` |
| `--ring` | `#6B95FF` |
| `--destructive` | `#F07F6E` |
| `--secure` / `--secure-strong` | `#0F2F2B` / `#3CC3AE` |
| `--building` / `--building-strong` | `#33270F` / `#F2BE5C` |
| `--weak` / `--weak-strong` | `#3A1C18` / `#F07F6E` |
| `--chart-1…5` | `#6B95FF`, `#3CC3AE`, `#F2BE5C`, `#F07F6E`, `#9AA8BF` |

In dark, exam-map tiles use the soft fill with the `-strong` colour as text. Every text/background pair used by a component meets WCAG AA (4.5:1 body, 3:1 large text and UI edges) in both themes — checked by a test over the token table.

### 2.3 Type

- **Hanken Grotesk** (600, 700) — headings, numbers (`font-variant-numeric: tabular-nums` for marks, percentages, counts, times). **Source Sans 3** (400, 500, 600) — body and UI. Loaded with `next/font/google` (self-hosted by Next, `display: swap`), replacing Inter and the night-back fonts.
- Scale (px / line-height): 12/16 caption · 13/18 small · 15/22 body · 17/24 h3 · 20/26 h2 · 24/30 h1 (phone) · 30/36 h1 (desktop) · 36/40 display (one per screen, e.g. the countdown). Headings `text-wrap: balance`, letter-spacing −0.015 to −0.025em; uppercase eyebrows 11.5px, +0.09em.

### 2.4 Shape, depth, motion

- Radius: 10px controls (buttons, inputs, chips), 16px cards and dialogs, 999px pills. Not every block is a card: page sections sit on the ground; cards set off one thing.
- Depth: cards = 1px border + `0 1px 2px rgb(11 27 51 / .04)`; popovers/dialogs = `0 12px 32px -12px rgb(11 27 51 / .25)`; no resting shadows elsewhere.
- Motion: 150ms (hover, press), 250ms (panels, sheets), `cubic-bezier(.2,.8,.2,1)`; none under `prefers-reduced-motion`.
- Touch targets ≥ 44px on phones (`min-h-11`); visible focus ring on every interactive element.

## 3. The shell

- **Desktop (≥ 1024px):** left sidebar 232px on the card surface — brand, the portal's nav (from the existing nav configs), the user block at the bottom; content column max 1200px, 32px gutters. A slim top bar holds the page's context (eyebrow + title come from `PageHeader`), notifications and the account menu.
- **Tablet (768–1023px):** collapsible icon rail (56px) + the same top bar.
- **Phone (< 768px):** top bar (title, notifications, account) and a **bottom tab bar** of the portal's first four items + "More" (a sheet with the rest). Safe-area insets respected; 16px gutters; nothing scrolls sideways.
- The trial / billing banners sit under the top bar in a quiet `accent` strip (owner only, per the learner spec).
- `Sidebar.tsx`, `SidebarNavItem.tsx`, `TopBar.tsx`, `BottomNav.tsx` and `(dashboard)/layout.tsx` are rebuilt on these rules; nav *contents* (which items each role sees) are unchanged here.

## 4. Components

Restyled base components (`src/components/ui`, 28 files): button (primary = filled cobalt, secondary = outline, ghost, destructive; sizes default/lg with `min-h-11` on phones), input, textarea, select, checkbox, radio, switch, tabs (underline style), badge/chip, card, dialog/sheet (flex-col with sticky footer, per CLAUDE.md), dropdown, tooltip, table, skeleton, progress, separator, avatar.

Shared components (`src/components/shared`): `PageHeader` (eyebrow, title, one-line context, one primary action slot), `EmptyState` (icon, what happens next, one action), `ErrorState` (new: message + Retry), `LoadingState`/skeletons matched to the final layout, `StatCard` (only where the figure is the point), `DataTable` (sticky header, `muted` head row, row hover, horizontal scroll in its own container).

New **readiness components** (built now, used from Phase L/R on, shown in the gallery with example data): `ExamMap` (treemap: rows by paper section, block flex = marks, colour = `masteryLevel`; accessible name + a list fallback), `Countdown` ("32 days to Paper 1 · Tue 27 Oct"), `NextUp` (the one primary action card), `MarksToGain` (topic list: mastery bar, marks in exam, marks to gain), `ReadinessBand` (predicted band vs target), `TrendChart` (Recharts line on tokens: faint grid, target line dashed, emphasised last point).

Charts: one Recharts theme helper (`chartTheme()`) reading the tokens, used by every chart; no chart sets its own colours.

## 5. Gallery

A dev-only route `/design` (404 when `NODE_ENV === 'production'`) shows every token (with contrast ratios), the type scale, each component in each state (default, hover, focus, disabled, loading, empty, error), and the readiness components with example data, in light and dark. It is the reference the reviewers use.

## 6. Scope of the colour sweep

2,168 hardcoded palette classes (`bg-red-500`, `text-gray-600`, …) exist across ~200 files. Phase D removes them from every surface a **standalone teacher, a learner or a new sign-up** can reach: the public landing (`/`, `/teachers`), auth pages (`/login`, `/signup/*`, `/register-student`, `/verify-email`, reset/forgot), the dashboard shell, and the standalone teacher's pages (Today, Lessons/Units, Textbooks, Homework, Test papers, Marking, Gradebook, My classes, Register, Billing, Settings) and their components. Learner pages are swept in Phase L as they are rebuilt; school-only modules (sport, uniforms, transport, aftercare, fees, …) in a later sweep. A test lists the in-scope directories and fails on any palette class in them.

## 7. Definition of done (machine gate, then one human pass)

Machine gate (script + tests, run before review; red refuses the hand-over):
- zero palette classes in the in-scope files; no inline colour literals in components;
- every token pair used by components ≥ AA in both themes;
- no horizontal scroll at 320, 375, 768, 1024, 1280, 1440 on the in-scope routes (Playwright);
- every form control has a label; every icon-only button has an accessible name; focus ring visible;
- new files ≤ 300 lines; no touched file above 350;
- unit tests, type-check, `next build` and the existing e2e walkthrough green; the request set of each in-scope page unchanged (the restyle changes no behaviour).

Human pass (binary, per page): hierarchy clear, copy plain, loading/empty/error designed, hover and focus designed, phone width right, belongs next to the gallery. Blockers reopen; smaller fixes are made by the reviewer in one commit; one bounded re-check.

Evidence: one screenshot per in-scope page at 1280 (light) and one at 375 (dark) — looks are the point of this phase.

## 8. Rulings

- Portal-scoped theming is removed rather than kept as an option: one product, one look. Cost if wrong: re-adding a scope is a CSS-only change.
- Fonts move to `next/font` (self-hosted) for speed and privacy. Cost if wrong: none expected.
- School-only modules keep palette classes for now; they inherit the new tokens where they use them, so they look closer but not finished. Cost if wrong: a school demo shows a few old colours until the later sweep.
- Mastery colours are semantic and separate from the brand accent; red is reserved for "weak" and destructive, never decoration.
