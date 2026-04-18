# Module Code Review Checklist

Use this checklist when auditing any module across frontend (`campusly-frontend`) and backend (`campusly-backend`). Work through each section systematically — a module is only "done" when every applicable item passes.

---

## 1. Architecture & Separation of Concerns

### Backend
- [ ] Routes only define endpoints, middleware, and call controller methods
- [ ] Controllers only parse request, call service, send response — no database queries
- [ ] Services contain all business logic and database queries
- [ ] Models define schema, interfaces, indexes — no business logic
- [ ] Validation schemas live in a dedicated validation file, not inline

### Frontend
- [ ] Pages are thin orchestrators — no `apiClient` imports
- [ ] Components are pure UI — no `apiClient` imports, accept typed props
- [ ] All API calls live in hooks (`src/hooks/`)
- [ ] Stores only used for cross-cutting state
- [ ] No business logic in components (filtering, sorting, transforming data belongs in hooks or `useMemo`)

---

## 2. Type Safety

### Backend
- [ ] TypeScript interface matches Mongoose schema field-for-field (count must match)
- [ ] No `any` types — use `unknown` + type guards where needed
- [ ] All `catch` blocks use `catch (err: unknown)`
- [ ] Request types properly defined (params, query, body)

### Frontend
- [ ] No `any` types — grep for `: any` and `as any`
- [ ] No unsafe casts (`as unknown as`) — if present, indicates schema mismatch to fix
- [ ] All `catch` blocks use `catch (err: unknown)`
- [ ] All `.map()`, `.filter()`, `.forEach()` callbacks have typed parameters
- [ ] Types imported with `import type { ... }` syntax
- [ ] Shared types in `src/types/` organized by domain

---

## 3. Security

### Multi-Tenancy
- [ ] Every `find()` / `findOne()` / `findOneAndUpdate()` / `findOneAndDelete()` includes `schoolId`
- [ ] Every `deleteOne()` / `updateOne()` includes `schoolId`
- [ ] Aggregation `$match` stages cast schoolId to `new mongoose.Types.ObjectId(schoolId)`
- [ ] No endpoint allows access to another school's data by guessing an ObjectId

### Authorization
- [ ] Every route has `authenticate` middleware
- [ ] Every route has `authorize()` with correct role list
- [ ] Ownership checks exist where needed (teacher can only modify their own classes, parent can only see their own children)
- [ ] No endpoint relies solely on role — ownership/relationship verified in controller or service

### Input Validation
- [ ] All POST/PUT/PATCH routes have Zod validation middleware
- [ ] Validation schemas use `.strict()` to reject unknown fields
- [ ] ObjectId fields validated with regex pattern
- [ ] No raw user input passed to `dangerouslySetInnerHTML`
- [ ] No user input interpolated into database queries without sanitization

---

## 4. Error Handling

### Backend
- [ ] Custom error classes used (`NotFoundError`, `BadRequestError`, `ConflictError`, `ForbiddenError`)
- [ ] Errors thrown, not returned — let global error handler catch them
- [ ] Unique index conflicts handled gracefully (use `findOneAndUpdate` with upsert, or check-before-create)
- [ ] `.populate()` fields have `ref` in schema (otherwise populate silently returns ObjectId)
- [ ] All async controller methods wrapped in try/catch or use async error middleware

### Frontend
- [ ] Every API call has try/catch with user-facing error feedback (toast or inline)
- [ ] Specific HTTP status codes handled where meaningful (409 conflict, 403 forbidden, 404 not found)
- [ ] Network failures don't crash the UI — graceful degradation
- [ ] No silent `catch {}` blocks that swallow errors without logging

---

## 5. Data Handling

### Backend
- [ ] Soft delete: `isDeleted` field exists on all models that need it
- [ ] Every query includes `isDeleted: false` filter
- [ ] Delete operations set `isDeleted: true`, never hard delete
- [ ] Cascade: soft-deleting a parent also soft-deletes children where appropriate
- [ ] `.lean()` used on read-only queries for performance
- [ ] Pagination implemented on all list endpoints (page, limit, total count)

### Frontend
- [ ] Response unwrapping uses `unwrapResponse()` / `unwrapList()` from `api-helpers.ts`
- [ ] Backend `_id` mapped to `id` via `normalizeIds()` (handled globally, but verify)
- [ ] No mock data used as initial state or fallback — initialize with empty arrays/objects
- [ ] Derived computations wrapped in `useMemo` with correct dependency arrays
- [ ] `useEffect` dependencies include `open` for dialog form resets

---

## 6. API Contract

- [ ] Every frontend API call path matches a real backend route (cross-reference `app.ts` mount + route file)
- [ ] HTTP methods match (GET vs POST vs PUT vs PATCH vs DELETE)
- [ ] Request payload shape matches backend validation schema
- [ ] Response shape matches frontend type definition
- [ ] All endpoints the frontend calls are actually wired up in backend routes
- [ ] API paths follow known correct mappings (see CLAUDE.md table)
- [ ] No common path mistakes (`/classes` instead of `/academic/classes`, etc.)

---

## 7. UI/UX Completeness

### States
- [ ] Loading state exists (spinner or skeleton) for every data-fetching view
- [ ] Empty state exists with icon, title, description for every list/table/grid
- [ ] Error state exists — user sees feedback when something fails
- [ ] Disabled/loading state on buttons during async operations (no double-submit)

### Responsive Design
- [ ] All grids start mobile-first: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (no bare `grid-cols-3+`)
- [ ] All fixed widths have mobile fallback: `w-full sm:w-40` (no bare `w-40`)
- [ ] Flex layouts use `flex-col sm:flex-row` pattern
- [ ] Touch targets minimum 44px on mobile
- [ ] TabsList with 5+ items has `flex-wrap`
- [ ] Tables wrapped in `overflow-x-auto`

### Dialogs
- [ ] Uses `flex flex-col max-h-[85vh]` pattern
- [ ] Body is `flex-1 overflow-y-auto`
- [ ] Footer is sticky (outside scroll area)
- [ ] `DialogTrigger` uses `render={<Button />}` (not `asChild`)

### Design Tokens
- [ ] No `text-red-*` or `bg-red-*` — use `text-destructive` / `bg-destructive/10`
- [ ] Semantic colors preferred over hardcoded Tailwind colors where tokens exist

### Text
- [ ] `truncate` on text in cards, table cells, constrained containers
- [ ] No `truncate` + `line-clamp-*` on same element
- [ ] Required field labels have `<span className="text-destructive">*</span>`

### Forms
- [ ] React Hook Form `<Select>` uses `setValue` (not `register`)
- [ ] `<SelectItem value="">` avoided — use sentinel like `"all"`
- [ ] Inline error messages: `<p className="text-xs text-destructive">`
- [ ] Form resets on dialog close/reopen

---

## 8. Code Quality

- [ ] Every file under 350 lines
- [ ] No dead code, no commented-out code
- [ ] No unaddressed TODOs (either fix or create a tracked issue)
- [ ] No duplicate logic — shared code extracted to utils/hooks/services
- [ ] Naming consistent: PascalCase components, camelCase hooks/utils, files match default export
- [ ] No `console.log` left in — use `console.error` for caught errors only
- [ ] No `localStorage` access without `typeof window !== 'undefined'` guard
- [ ] No `toISOString().slice(0, 10)` for local dates — use manual year/month/day formatting

---

## 9. Performance

### Backend
- [ ] Database indexes exist for common query patterns (check compound indexes)
- [ ] No N+1 queries — use `.populate()` or aggregation instead of loop-and-fetch
- [ ] `Promise.all()` used for independent parallel queries
- [ ] Large lists paginated — no unbounded queries

### Frontend
- [ ] `useMemo` for expensive derived computations
- [ ] `AbortController` in `useEffect` for fetch cleanup
- [ ] No unnecessary re-renders (state updates that don't change UI)
- [ ] Conditional data fetching (don't fetch subjects until grade is selected, etc.)

---

## 10. Completeness

For each module, verify these features exist where applicable:

### CRUD
- [ ] Create with proper validation
- [ ] Read (list with pagination + single item detail)
- [ ] Update with optimistic or confirmed feedback
- [ ] Delete with confirmation dialog and constraint checking

### List Views
- [ ] Search/filter
- [ ] Sort (at least by name/date)
- [ ] Pagination or infinite scroll for large datasets
- [ ] Bulk actions where appropriate

### Relationships
- [ ] Parent-child relationships handled (e.g., class has students)
- [ ] Cascade behavior defined (what happens when parent is deleted?)
- [ ] Cross-module navigation works (e.g., class → student list → student detail)

---

## Review Output Template

After completing the checklist, summarize findings in this format:

```
### [Module Name] Review — [Date]

**Pass rate:** X/Y items checked, Z failures

**Critical (must fix before merge):**
1. [Item] — [File:line] — [What's wrong and why it matters]

**High (fix soon):**
1. [Item] — [File:line] — [Description]

**Medium (tech debt):**
1. [Item] — [Description]

**Low (nice to have):**
1. [Item] — [Description]

**Missing features (not bugs, but gaps):**
1. [Feature] — [Why it matters for this module]
```
