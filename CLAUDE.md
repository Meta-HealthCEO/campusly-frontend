@AGENTS.md

# Campusly Frontend — Development Guide

## Project Overview
- **Stack:** Next.js 16.2.1 (React 19), Zustand, Axios, TanStack Table, React Hook Form + Zod, Tailwind CSS 4, Recharts, Sonner
- **Backend:** Express + MongoDB at `http://localhost:4500/api` (set via `NEXT_PUBLIC_API_URL` in `.env.local`)
- **Dev server:** Port 3500

## Code Standards (ENFORCED)

### File Size
- **Max 350 lines per file.** If a page grows beyond this, extract sub-components, hooks, or utils.

### Type Safety
- **No `any` types.** Every type must be exact. Use `unknown` + type guards if truly uncertain.
- Import types with `import type { ... }` syntax.
- All shared types live in `src/types/index.ts`.

### Separation of Concerns
- **Pages (`src/app/`):** Thin orchestrators — compose components, call hooks, handle routing.
- **Components (`src/components/`):** Pure UI. Accept typed props. No direct API calls.
- **Hooks (`src/hooks/`):** Business logic, API calls, state management.
- **Lib (`src/lib/`):** Utilities, constants, validation schemas, API client.

### Component Organization
```
src/components/
  auth/           — Auth-specific components (AuthLayout, AuthCard, PasswordInput, etc.)
  shared/         — Cross-cutting shared components (PageHeader, DataTable, StatCard, etc.)
  layout/         — Dashboard layout (Sidebar, TopBar, BottomNav)
  charts/         — Recharts wrappers
  ui/             — Base UI primitives (shadcn/base-ui)
  [module]/       — Module-specific components (e.g., fees/, wallet/)
```

### Naming
- Components: PascalCase (`StudentTable.tsx`)
- Hooks: camelCase with `use` prefix (`useStudents.ts`)
- Utils: camelCase (`formatCurrency`)
- Files match their default export name

## API Patterns

### Response Unwrapping
Backend wraps responses inconsistently. Always double-unwrap:
```ts
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
| `/academic/marks/student/:id` | `GET /api/academic/marks/student/:studentId` (student marks) |
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

### Common Mistakes to Avoid
- `/classes` does NOT exist — use `/academic/classes`
- `/subjects` does NOT exist — use `/academic/subjects`
- `/fee/*` does NOT exist — use `/fees/*` (plural)
- `/wallet` does NOT exist — use `/wallets/student/:id`
- `/tuckshop/*` does NOT exist — use `/tuck-shop/*` (hyphenated)
- `/report/*` does NOT exist — use `/reports/*` (plural)
- Fee list endpoints require schoolId in path: `/fees/types/school/${schoolId}`
- The schoolId comes from `useAuthStore` → `user.schoolId`

### Student/Parent ID Resolution
- The JWT contains `user.id` (User model `_id`), NOT the Student/Parent record ID.
- To find the current student: fetch `/students`, find where `student.userId === user.id`
- To find the current parent: fetch `/parents`, find where `parent.userId === user.id`

## UI Patterns

### DialogTrigger (base-ui, NOT Radix)
```tsx
// CORRECT — uses render prop
<DialogTrigger render={<Button />}>Click me</DialogTrigger>

// WRONG — do NOT use asChild
<DialogTrigger asChild><Button>Click me</Button></DialogTrigger>
```

### Error Text
Use `text-destructive` class, not hardcoded colors:
```tsx
{errors.field && <p className="text-xs text-destructive">{errors.field.message}</p>}
```

### Data Fetching Pattern
```tsx
const [items, setItems] = useState<MyType[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    try {
      const response = await apiClient.get('/endpoint');
      const raw = response.data.data ?? response.data;
      setItems(Array.isArray(raw) ? raw : raw.data ?? []);
    } catch {
      console.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []);
```

### Select Fields with React Hook Form
`<Select>` doesn't support `register()`. Use `setValue`:
```tsx
<Select onValueChange={(val: unknown) => setValue('field', val as FieldType)}>
```

### Mutation Pattern
```tsx
const onSubmit = async (data: FormData) => {
  try {
    await apiClient.post('/endpoint', data);
    toast.success('Created successfully!');
    // Re-fetch to refresh list
    const response = await apiClient.get('/endpoint');
    const raw = response.data.data ?? response.data;
    setItems(Array.isArray(raw) ? raw : raw.data ?? []);
  } catch {
    toast.error('Failed to create');
  }
  reset();
  setDialogOpen(false);
};
```

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
Backend sends `_id`, frontend expects `id`. Map in the useAuth login handler:
```ts
const userData = { ...rawUser, id: rawUser._id ?? rawUser.id };
```

## Mock Data Policy
- **Do NOT use mock data as initial state or fallback.** Initialize with empty arrays/objects.
- `src/lib/mock-data.ts` exists but should ONLY be used by `useModule` for module gating.
- Catch blocks should `console.error`, not fall back to mock data.

## Scope Documents
Implementation specs are in `scopes/` (00 through 29). Execute sequentially. After each module, verify against the acceptance criteria in the scope doc.

# currentDate
Today's date is 2026-03-31.
