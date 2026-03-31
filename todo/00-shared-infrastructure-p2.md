# 00 — Shared Infrastructure — Phase 2

## Current State
API client, auth store, shared UI components (PageHeader, DataTable, StatCard, charts), manual useEffect data fetching, React Hook Form + Zod.

## Phase 2 Enhancements

### 1. Dark Mode
- UIStore already has `theme` field — wire it up
- Toggle in TopBar, persist preference to localStorage
- All components already use Tailwind, so `dark:` variants are low effort
- **Why:** Every modern app has it. Parents checking grades at night will thank you

### 2. Skeleton Loaders
- Replace empty-state-while-loading with shimmer skeletons for DataTable, StatCard grids, and card layouts
- Create `<DataTableSkeleton rows={5} />` and `<StatCardSkeleton />` shared components
- **Why:** Perceived performance matters. Loading spinners feel slow; skeletons feel fast

### 3. Global Error Boundary
- Wrap dashboard layout in an error boundary with a friendly "something went wrong" fallback
- Toast-based error handler for API failures (already partially there with Sonner)
- **Why:** Unhandled errors currently show a blank white screen

### 4. PWA Support
- Service worker, manifest.json, install prompt
- Offline page that shows "You're offline — last synced data" for key screens
- **Why:** Many SA schools have unreliable internet. Offline access to timetables, contacts, and announcements is a killer feature

### 5. Breadcrumb Navigation
- Simple breadcrumb component for deep pages (e.g., Admin > Students > John Doe > Edit)
- Auto-derived from route segments where possible
- **Why:** Users get lost in deep pages. Breadcrumbs are basic UX hygiene
