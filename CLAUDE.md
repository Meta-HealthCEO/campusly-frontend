@AGENTS.md

# Campusly Frontend — Development Guide

## Project Overview
- **Stack:** Next.js 16.2.1 (React 19), Zustand, Axios, TanStack Table, React Hook Form + Zod, Tailwind CSS 4, Recharts, Sonner
- **Backend:** Express + MongoDB at `http://localhost:4500/api` (set via `NEXT_PUBLIC_API_URL` in `.env.local`)
- **Dev server:** Port 3500

---

## Code Standards (ENFORCED)

### File Size
- **Max 350 lines per file.** If a file grows beyond this, extract sub-components, hooks, or utils.
- Check line count BEFORE finishing a file. Do not create it and fix it later.

### Type Safety
- **No `any` types.** Every type must be exact. Use `unknown` + type guards if truly uncertain.
- Import types with `import type { ... }` syntax.
- Shared types live in `src/types/` — organized by domain (common.ts, academic.ts, fees.ts, etc.). The barrel file `src/types/index.ts` re-exports everything.
- All `catch` blocks must use `catch (err: unknown)` — never untyped `catch (err)`.
- All `.map()`, `.filter()`, `.forEach()` callbacks should have typed parameters.

### Separation of Concerns — STRICT

**This is the most important rule. Violations here are the #1 source of tech debt.**

- **Pages (`src/app/`):** Thin orchestrators ONLY — compose components, call hooks, handle routing. **ZERO `apiClient` imports allowed in any page file.**
- **Components (`src/components/`):** Pure UI. Accept typed props. **ZERO `apiClient` imports allowed in any component file.** The ONLY exception is `AuthProvider.tsx`.
- **Hooks (`src/hooks/`):** ALL API calls live here. Business logic, data fetching, mutations, state management.
- **Stores (`src/stores/`):** Zustand stores for cross-cutting state. May contain API calls for store-managed data.
- **Lib (`src/lib/`):** Utilities, constants, validation schemas, API client.

**When writing a new component or page:**
1. First check if a hook already exists for that domain
2. If not, create the hook FIRST with the API calls
3. Then write the component/page that uses the hook
4. Never "temporarily" put apiClient in a component — it won't get cleaned up

### Component Organization
```
src/components/
  auth/           — Auth-specific (AuthLayout, AuthCard, PasswordInput, etc.)
  shared/         — Cross-cutting (PageHeader, DataTable, StatCard, etc.)
  layout/         — Dashboard layout (Sidebar, TopBar, BottomNav)
  charts/         — Recharts wrappers
  ui/             — Base UI primitives (shadcn/base-ui)
  [module]/       — Module-specific (e.g., fees/, wallet/, sport/)
```

### Naming
- Components: PascalCase (`StudentTable.tsx`)
- Hooks: camelCase with `use` prefix (`useStudents.ts`)
- Utils: camelCase (`formatCurrency`)
- Files match their default export name

---

## API Patterns

### Response Unwrapping
Backend wraps responses inconsistently. Always double-unwrap using the helpers in `src/lib/api-helpers.ts`:
```ts
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';

// For single objects:
const item = unwrapResponse(response);

// For arrays:
const items = unwrapList(response);

// Manual fallback if needed:
const raw = response.data.data ?? response.data;
const arr = Array.isArray(raw) ? raw : raw.data ?? [];
```

### API Paths — Known Correct Mappings
| Frontend path | Backend route |
|---|---|
| `/auth/login` | `POST /api/auth/login` |
| `/auth/register` | `POST /api/auth/register` |
| `/auth/forgot-password` | `POST /api/auth/forgot-password` |
| `/auth/reset-password` | `POST /api/auth/reset-password` |
| `/auth/me` | `GET /api/auth/me` |
| `/auth/logout` | `POST /api/auth/logout` |
| `/students` | `GET /api/students` (uses `req.user.schoolId`) |
| `/staff` | `GET /api/staff` (custom module we created) |
| `/academic/classes` | `GET /api/academic/classes` (NOT `/classes`) |
| `/academic/subjects` | `GET /api/academic/subjects` (NOT `/subjects`) |
| `/academic/grades` | `GET /api/academic/grades` (grade levels, NOT student marks) |
| `/academic/marks/student/:id` | `GET /api/academic/marks/student/:studentId` |
| `/fees/types/school/:id` | `GET /api/fees/types/school/:schoolId` |
| `/fees/invoices/school/:id` | `GET /api/fees/invoices/school/:schoolId` |
| `/fees/debtors/school/:id` | `GET /api/fees/debtors/school/:schoolId` |
| `/fees/payments/:invoiceId` | `GET /api/fees/payments/:invoiceId` |
| `/fees/types` | `POST /api/fees/types` |
| `/wallets/student/:id` | `GET /api/wallets/student/:studentId` |
| `/wallets/:id/load` | `POST /api/wallets/:walletId/load` |
| `/wallets/:id/transactions` | `GET /api/wallets/:walletId/transactions` |
| `/tuck-shop/menu` | `GET /api/tuck-shop/menu` (NOT `/tuckshop/menu-items`) |
| `/tuck-shop/sales/daily` | `GET /api/tuck-shop/sales/daily` |
| `/homework` | `GET /api/homework` |
| `/homework/student/:id/submissions` | `GET /api/homework/student/:studentId/submissions` |
| `/reports/dashboard` | `GET /api/reports/dashboard` (NOT `/report/dashboard`) |
| `/sports/*` | `GET /api/sports/*` (plural, NOT `/sport/`) |
| `/uniforms/*` | `GET /api/uniforms/*` (plural, NOT `/uniform/`) |
| `/after-care/*` | `GET /api/after-care/*` (hyphenated) |
| `/lost-found/*` | `GET /api/lost-found/*` (hyphenated) |
| `/library/*` | `GET /api/library/*` |
| `/consent/*` | `GET /api/consent/*` |
| `/transport/*` | `GET /api/transport/*` |
| `/fundraising/*` | `GET /api/fundraising/*` |
| `/events/*` | `GET /api/events/*` |
| `/learning/*` | `GET /api/learning/*` |
| `/ai-tools/*` | `GET /api/ai-tools/*` |
| `/attendance/*` | `GET /api/attendance/*` |
| `/achiever/*` | `GET /api/achiever/*` |
| `/migration/*` | `GET /api/migration/*` |
| `/audit/*` | `GET /api/audit/*` |

### Common API Path Mistakes — DO NOT MAKE THESE
- `/classes` does NOT exist — use `/academic/classes`
- `/subjects` does NOT exist — use `/academic/subjects`
- `/fee/*` does NOT exist — use `/fees/*` (plural)
- `/wallet` does NOT exist — use `/wallets/student/:id`
- `/tuckshop/*` does NOT exist — use `/tuck-shop/*` (hyphenated)
- `/report/*` does NOT exist — use `/reports/*` (plural)
- `/sport/*` does NOT exist — use `/sports/*` (plural)
- `/uniform/*` does NOT exist — use `/uniforms/*` (plural)
- Fee list endpoints require schoolId in path: `/fees/types/school/${schoolId}`
- The schoolId comes from `useAuthStore` → `user.schoolId`
- **ALWAYS cross-reference `src/../../campusly-backend/src/app.ts`** for the exact route mount path before writing an API call

### Student/Parent ID Resolution
- The JWT contains `user.id` (User model `_id`), NOT the Student/Parent record ID.
- To find the current student: fetch `/students`, find where `student.userId === user.id`
- To find the current parent: fetch `/parents`, find where `parent.userId === user.id`

---

## UI Patterns

### Design Tokens — USE THEM, NOT HARDCODED COLORS

**DO:**
```tsx
<p className="text-destructive">Error message</p>
<div className="bg-destructive/10 text-destructive">Error banner</div>
<Badge variant="destructive">Failed</Badge>
```

**DO NOT:**
```tsx
<p className="text-red-500">Error message</p>        // WRONG
<div className="bg-red-100 text-red-800">Error</div>  // WRONG
<p className="text-red-600">Overdue</p>                // WRONG
```

**Rule:** Never use `text-red-*` or `bg-red-*` for error/destructive/negative states. Always use `text-destructive`, `bg-destructive`, `bg-destructive/10`. This applies to ALL red UI: error text, negative balances, overdue badges, failed statuses, decline buttons.

Same principle for other semantic colors — prefer design tokens over hardcoded Tailwind colors where a token exists.

### Responsive Design — MOBILE FIRST

**Every grid, flex layout, and fixed-width element must have mobile breakpoints.**

**DO:**
```tsx
<div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
<div className="flex flex-col sm:flex-row gap-3">
<Select><SelectTrigger className="w-full sm:w-40">
<Input className="w-full sm:w-64">
```

**DO NOT:**
```tsx
<div className="grid gap-4 grid-cols-4">          // Crushes on mobile
<div className="flex flex-wrap gap-3">             // Wraps unpredictably
<Select><SelectTrigger className="w-40">           // Overflows on mobile
<Input className="w-64">                           // Fixed width breaks
```

**Rules:**
- Always start with mobile layout, add breakpoints up: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Never use `grid-cols-3` or `grid-cols-4` without a `sm:` or `lg:` prefix
- Fixed widths (`w-40`, `w-64`) must have `w-full sm:w-40` pattern
- Touch targets must be minimum 44px (use `size="default"` not `size="sm"` for primary actions on mobile)
- TabsList with 5+ items needs `flex-wrap`

### Dialogs — Scroll Pattern

All dialogs with forms must handle viewport overflow:

```tsx
// CORRECT — sticky footer, scrollable body
<DialogContent className="flex flex-col max-h-[85vh]">
  <DialogHeader>...</DialogHeader>
  <div className="flex-1 overflow-y-auto py-4">
    {/* form fields here */}
  </div>
  <DialogFooter>
    <Button>Submit</Button>
  </DialogFooter>
</DialogContent>

// WRONG — footer gets hidden behind scroll
<DialogContent className="max-h-[85vh] overflow-y-auto">
  <DialogHeader>...</DialogHeader>
  {/* form fields */}
  <DialogFooter>
    <Button>Submit</Button>  {/* User can't reach this */}
  </DialogFooter>
</DialogContent>
```

### DialogTrigger (base-ui, NOT Radix)
```tsx
// CORRECT — uses render prop
<DialogTrigger render={<Button />}>Click me</DialogTrigger>

// WRONG — do NOT use asChild
<DialogTrigger asChild><Button>Click me</Button></DialogTrigger>
```

### Tables — Always Scrollable
DataTable already has `overflow-x-auto` built in. If using a custom table, always wrap:
```tsx
<div className="overflow-x-auto">
  <Table>...</Table>
</div>
```

### Text Overflow
Always add `truncate` to text in cards, table cells, and constrained containers:
```tsx
<h4 className="font-medium truncate">{title}</h4>
<p className="text-sm text-muted-foreground truncate">{description}</p>
```
For multi-line truncation: `line-clamp-2` or `line-clamp-3`.

### Empty & Loading States
Every data-fetching view MUST have both:
```tsx
if (loading) return <LoadingSpinner />;
if (items.length === 0) return <EmptyState icon={Icon} title="No items" description="..." />;
```
Never render a blank screen. Charts must check for empty data arrays.

### Error Text
```tsx
{errors.field && <p className="text-xs text-destructive">{errors.field.message}</p>}
```

### Required Field Labels
```tsx
<Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
```

### Select Fields with React Hook Form
`<Select>` doesn't support `register()`. Use `setValue`:
```tsx
<Select onValueChange={(val: unknown) => setValue('field', val as FieldType)}>
```

### Data Fetching Pattern (in hooks, NOT in components/pages)
```tsx
// src/hooks/useMyModule.ts
export function useMyModule(schoolId: string) {
  const [items, setItems] = useState<MyType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const response = await apiClient.get('/endpoint');
      const raw = response.data.data ?? response.data;
      setItems(Array.isArray(raw) ? raw : raw.data ?? []);
    } catch {
      console.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const createItem = async (data: Partial<MyType>) => {
    const response = await apiClient.post('/endpoint', { ...data, schoolId });
    return response.data.data ?? response.data;
  };

  useEffect(() => { fetchItems(); }, []);

  return { items, loading, fetchItems, createItem };
}
```

### Mutation Pattern (in hooks)
```tsx
// src/hooks/useMyModuleMutations.ts
export function useMyModuleMutations(schoolId: string) {
  const createItem = async (data: CreateItemPayload) => {
    const response = await apiClient.post('/endpoint', { ...data, schoolId });
    return response.data.data ?? response.data;
  };

  const deleteItem = async (id: string) => {
    await apiClient.delete(`/endpoint/${id}`);
  };

  return { createItem, deleteItem };
}

// In the PAGE (not component):
const { createItem } = useMyModuleMutations(schoolId);

// In the COMPONENT (receives callback as prop):
interface Props { onSubmit: (data: FormData) => Promise<void>; }
```

---

## Auth Patterns

### Auth Components
Reusable auth components are in `src/components/auth/`:
- `AuthLayout` — gradient background wrapper
- `AuthCard` — card with logo, title, description
- `PasswordInput` — password field with show/hide toggle
- `AuthGuard` — protects dashboard routes (loading spinner + redirect)
- `RegisterForm` — school registration form
- `ForgotPasswordForm` — forgot password form

### Session Hydration
On app load, restore session from localStorage by calling `GET /api/auth/me`. See `src/hooks/useAuth.ts` or session provider.

### _id → id Mapping
Backend sends `_id`, frontend expects `id`. Handled globally by `normalizeIds()` in `src/lib/api-client.ts`.

---

## Pre-Commit Checklist

Before considering ANY file done, verify:

1. **No `apiClient` import** in any page or component file
2. **No `any` types** — grep for `: any` and `as any`
3. **No `text-red-*`** — use `text-destructive` instead
4. **No `catch (err)`** without `: unknown`
5. **All grids have mobile breakpoints** — no bare `grid-cols-3` or `grid-cols-4`
6. **All fixed widths are responsive** — `w-full sm:w-40` not just `w-40`
7. **All dialogs use flex-col pattern** with sticky footer
8. **File is under 350 lines**
9. **API paths match backend exactly** — check `campusly-backend/src/app.ts` if unsure
10. **Empty state + loading state** exist for every data view

---

## Mock Data Policy
- **Do NOT use mock data as initial state or fallback.** Initialize with empty arrays/objects.
- `src/lib/mock-data.ts` exists but should ONLY be used by `useModule` for module gating.
- Catch blocks should `console.error`, not fall back to mock data.

## Scope Documents
Implementation specs are in `scopes/` (00 through 29). Execute sequentially. After each module, verify against the acceptance criteria in the scope doc.
