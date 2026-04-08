# Textbook Library Views — Design Spec

## Overview

Replace the current flat card grid on the teacher textbook listing page with a combo view: a **bookshelf view** (default) and a **list view**, toggled via a shelf/list switcher in the filter bar.

## Scope

- **Page:** `src/app/(dashboard)/teacher/curriculum/textbooks/page.tsx`
- **New components:** `TextbookShelfView`, `TextbookListView`, `BookCover`, `ViewToggle`
- **Modified components:** `TextbookCard` (removed — replaced by new views)
- **No backend changes required** — all data already available from `useTextbooks` hook

## Shelf View (Default)

### Layout
- Textbooks grouped by grade in descending order (Grade 12 first, Grade R last)
- Each grade is a "shelf" row: a grade heading + a horizontal row of book covers on a wooden-textured background
- The shelf row scrolls horizontally if there are more books than fit the viewport
- Each grade heading shows: grade name + textbook count (e.g. "Grade 12 · 13 textbooks")

### Book Covers
- Rectangular cover (~80px wide, ~110px tall on desktop; slightly smaller on mobile)
- Gradient background colour auto-assigned by subject name (see Colour Palette below)
- Subject short name centred on the cover in white text
- Chapter count shown below the cover in muted text
- Subtle box shadow to give depth on the shelf
- Hover: slight scale-up (1.05) + shadow increase
- Click: navigate to `/teacher/curriculum/textbooks/[textbookId]` (the reader)

### Shelf Styling
- Each shelf row has a warm brown gradient background (simulating wood)
- Rounded corners on the shelf container
- Books sit on the shelf with consistent gap spacing
- Horizontal overflow: `overflow-x-auto` with hidden scrollbar styling

### Filters (Shelf Mode)
- Search, Framework, Subject, Status — same as current
- **No Grade filter** — the shelves already group by grade, so the filter is redundant
- If Subject or Status filters are applied, grades with no matching books are hidden entirely

### Subject Colour Palette
A deterministic map from subject name to gradient colours. Same subject always gets the same colour across all grades.

```
Mathematics        → blue    (#2563eb → #1d4ed8)
Mathematical Lit   → pink    (#ec4899 → #db2777)
Life Sciences      → green   (#059669 → #047857)
Physical Sciences  → red     (#dc2626 → #b91c1c)
Natural Sciences   → teal    (#0d9488 → #0f766e)
History            → purple  (#7c3aed → #6d28d9)
Geography          → cyan    (#0891b2 → #0e7490)
Economics          → orange  (#ea580c → #c2410c)
Business Studies   → amber   (#d97706 → #b45309)
Accounting         → indigo  (#4f46e5 → #4338ca)
Life Orientation   → lime    (#65a30d → #4d7c0f)
EMS                → yellow  (#ca8a04 → #a16207)
Technology         → slate   (#475569 → #334155)
Creative Arts      → fuchsia (#d946ef → #a21caf)
Social Sciences    → rose    (#e11d48 → #be123c)
Tourism            → sky     (#0284c7 → #0369a1)
IT                 → emerald (#059669 → #047857)
CAT                → violet  (#8b5cf6 → #7c3aed)
(fallback)         → gray    (#6b7280 → #4b5563)
```

Colour is resolved by checking if the subject name contains a keyword (case-insensitive). First match wins. Unknown subjects get the gray fallback.

## List View

### Layout
- Dense table with columns: Title, Subject, Grade, Chapters, Status
- Rows sorted by grade descending, then subject name ascending
- Click a row → navigate to the reader (same as shelf)
- Hover: subtle background highlight

### Filters (List Mode)
- All filters shown: Search, Framework, Subject, **Grade**, Status
- Grade filter reappears because there are no visual grade groupings in list mode

## View Toggle

- Positioned at the right end of the filter bar
- Two-segment toggle: 📚 Shelf | 📋 List
- Active segment has dark background, inactive is muted
- Selected view persisted in `localStorage` key `textbook-view-mode`
- Default: `'shelf'`

## Click Behaviour

- **Shelf view:** click book cover → `router.push(/teacher/curriculum/textbooks/[id])`
- **List view:** click table row → same navigation
- No detail panel — clicking always goes to the reader

## Component Structure

```
TextbooksPage (page.tsx)
├── PageHeader + Create button
├── Filter bar
│   ├── Search input
│   ├── Framework select
│   ├── Subject select
│   ├── Grade select (list view only)
│   ├── Status select
│   └── ViewToggle
├── TextbookShelfView (when mode === 'shelf')
│   └── per grade:
│       ├── Grade heading + count
│       └── Shelf row
│           └── BookCover × N
└── TextbookListView (when mode === 'list')
    └── Table with rows
```

## File Plan

| File | Action | Purpose |
|------|--------|---------|
| `src/components/textbook/BookCover.tsx` | Create | Single book cover component |
| `src/components/textbook/TextbookShelfView.tsx` | Create | Shelf view with grade grouping |
| `src/components/textbook/TextbookListView.tsx` | Create | List/table view |
| `src/components/textbook/ViewToggle.tsx` | Create | Shelf/List toggle button |
| `src/components/textbook/subject-colours.ts` | Create | Subject → colour map utility |
| `src/components/textbook/index.ts` | Modify | Export new components |
| `src/app/(dashboard)/teacher/curriculum/textbooks/page.tsx` | Modify | Wire up toggle + both views |

## Mobile

- Shelf view: book covers shrink slightly, shelf rows scroll horizontally
- List view: table gets `overflow-x-auto` wrapper
- Toggle remains accessible on mobile
- Filters stack vertically as they already do

## Empty States

- If no textbooks match filters: current EmptyState component
- If a grade has 0 matching textbooks in shelf mode: that grade shelf is hidden
