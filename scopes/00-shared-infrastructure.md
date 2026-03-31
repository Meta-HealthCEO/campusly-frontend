# 00 — Shared Infrastructure

## 1. Overview

This document covers the shared infrastructure that every page in the Campusly frontend depends on. It details the API client, auth system, Zustand stores, shared UI components, data-fetching pattern, error handling, form handling, and the dashboard layout. An agent reading this document can build any frontend feature without consulting the underlying infrastructure code.

**Key technology stack (from `package.json`):**
- Next.js 16.2.1 (React 19) — **not a standard Next.js version; read `node_modules/next/dist/docs/` before writing code**
- Zustand 5.0.12 for global state
- Axios 1.14.0 for HTTP
- TanStack Query 5.95.2 is installed but **not yet used** anywhere in the codebase — all data fetching is done with `useEffect` + `useState` + `apiClient` directly
- TanStack Table 8.21.3 for the `DataTable` component
- React Hook Form 7.72.0 + Zod 4.3.6 for forms
- Sonner 2.0.7 for toast notifications
- Tailwind CSS 4 + shadcn (base-ui components)
- Recharts 3 for charts
- date-fns 4 for date formatting
- lucide-react 1.7.0 for icons

**Dev server runs on port 3500** (`npm run dev`).

---

## 2. API Client

**File:** `src/lib/api-client.ts`

An axios instance is created and exported as `apiClient`. Import it with:

```ts
import apiClient from '@/lib/api-client';
```

### Base URL

```ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
});
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to override. Default backend is `http://localhost:4000`.

### Auth token attachment (request interceptor)

On every request, the interceptor reads `localStorage.getItem('accessToken')` and sets `Authorization: Bearer <token>`. This only runs client-side (`typeof window !== 'undefined'`).

### Token refresh and error handling (response interceptor)

- On a `401` response, the interceptor attempts a token refresh by calling `POST /auth/refresh` with the `refreshToken` from localStorage, using a bare `axios` instance (not `apiClient`) to avoid interceptor loops.
- On success, both tokens are updated in localStorage and the original request is retried.
- On refresh failure, both tokens are cleared from localStorage and the user is redirected to `/login` via `window.location.href`.
- All other errors are passed through as rejected promises.

### Making API calls

Use the axios methods directly on the imported instance:

```ts
const response = await apiClient.get('/students');
const response = await apiClient.post('/fees/types', data);
const response = await apiClient.patch(`/staff/${id}`, data);
const response = await apiClient.delete(`/items/${id}`);
```

### Response shape

The backend wraps responses inconsistently. Always use the double-unwrap pattern when reading data:

```ts
const raw = response.data.data ?? response.data;
// For arrays:
const arr = Array.isArray(raw) ? raw : raw.data ?? [];
// For single objects:
const obj = raw.stats ?? raw;
```

---

## 3. Authentication & Auth Store

### Token persistence helpers

**File:** `src/lib/auth.ts`

| Function | Signature | Description |
|---|---|---|
| `getStoredTokens()` | `() => { accessToken, refreshToken } \| null` | Reads both tokens from localStorage; returns null if either is missing or window is undefined |
| `setStoredTokens(at, rt)` | `(string, string) => void` | Writes both tokens to localStorage |
| `clearStoredTokens()` | `() => void` | Removes both tokens from localStorage |
| `getRoleDashboardPath(role)` | `(string) => string` | Maps a role string to its dashboard path (e.g. `'admin'` → `'/admin'`). Returns `'/login'` for unknown roles |
| `getRoleLabel(role)` | `(UserRole) => string` | Maps a UserRole to a human-readable label (e.g. `'admin'` → `'Administrator'`) |

Role → path mapping:
```
admin        → /admin
school_admin → /admin
teacher      → /teacher
parent       → /parent
student      → /student
tuckshop     → /tuckshop
super_admin  → /superadmin
```

### Zustand auth store

**File:** `src/stores/useAuthStore.ts`

```ts
import { useAuthStore } from '@/stores/useAuthStore';
```

**State shape:**

| Field | Type | Initial value |
|---|---|---|
| `user` | `User \| null` | `null` |
| `tokens` | `AuthTokens \| null` | `null` |
| `isAuthenticated` | `boolean` | `false` |
| `isLoading` | `boolean` | `true` |

**Actions:**

| Action | Signature | Behaviour |
|---|---|---|
| `setUser(user)` | `(User) => void` | Sets user and flips `isAuthenticated` to true |
| `setTokens(tokens)` | `(AuthTokens) => void` | Sets tokens in store only (does not write localStorage) |
| `login(user, tokens)` | `(User, AuthTokens) => void` | Writes tokens to localStorage, sets user + tokens, sets `isAuthenticated: true`, `isLoading: false` |
| `logout()` | `() => void` | Removes tokens from localStorage, resets user/tokens/isAuthenticated to default, `isLoading: false` |
| `setLoading(loading)` | `(boolean) => void` | Sets `isLoading` |
| `hasRole(role)` | `(UserRole) => boolean` | Returns `user?.role === role` |

The store does **not** use Zustand's `persist` middleware. Tokens are manually written to and read from `localStorage`.

### `useAuth` hook

**File:** `src/hooks/useAuth.ts`

The primary hook for login/logout actions in UI components:

```ts
import { useAuth } from '@/hooks/useAuth';
const { login, logout, user, isAuthenticated } = useAuth();
```

- `login(credentials: LoginCredentials)` — calls `POST /auth/login`, normalises `school_admin` role to `admin`, calls `storeLogin`, then routes to the role dashboard.
- `logout()` — calls `storeLogout()`, routes to `/login`.

The backend response is normalised at login time:
```ts
const responseData = data.data ?? data;
const userData = responseData.user ?? responseData;
const accessToken = responseData.accessToken ?? responseData.access_token;
const refreshToken = responseData.refreshToken ?? responseData.refresh_token;
```

### Protected routes / middleware

There is **no** `src/middleware.ts` in this project. Route protection is not enforced at the middleware layer. The dashboard layout relies on the auth store's `user` value; unauthenticated users who navigate directly will see the layout without user data. Auth is expected to be enforced via the login redirect in the API client's refresh-failure path.

---

## 4. All Zustand Stores

### 4.1 `useAuthStore`

**File:** `src/stores/useAuthStore.ts` — covered fully in Section 3.

### 4.2 `useUIStore`

**File:** `src/stores/useUIStore.ts`

```ts
import { useUIStore } from '@/stores/useUIStore';
```

**State shape:**

| Field | Type | Initial value | Description |
|---|---|---|---|
| `sidebarOpen` | `boolean` | `false` | Whether the mobile sidebar overlay is visible |
| `sidebarCollapsed` | `boolean` | `false` | Whether the desktop sidebar is in collapsed (icon-only) mode |
| `theme` | `'light' \| 'dark'` | `'light'` | Current theme |
| `notifications` | `number` | `3` | Notification badge count shown in TopBar |

**Actions:**

| Action | Signature | Description |
|---|---|---|
| `toggleSidebar()` | `() => void` | Flips `sidebarOpen` |
| `setSidebarOpen(open)` | `(boolean) => void` | Sets `sidebarOpen` directly |
| `toggleSidebarCollapse()` | `() => void` | Flips `sidebarCollapsed` |
| `setTheme(theme)` | `('light' \| 'dark') => void` | Sets theme |
| `setNotifications(count)` | `(number) => void` | Sets notification count |

**When to use:** The `Sidebar` component uses `sidebarCollapsed` and `sidebarOpen`. The `TopBar` uses `toggleSidebar` and `notifications`. When a new notification arrives, call `setNotifications(count)`.

---

## 5. Standard Page Pattern

**There is no TanStack Query usage in the codebase.** All pages use a manual `useEffect` + `useState` + `apiClient` pattern. Do not introduce `useQuery`/`useMutation` unless the task explicitly requires it.

### 5.1 Data fetching pattern

Every page is a `'use client'` component. Data is fetched with `useEffect`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

export default function SomePage() {
  const [items, setItems] = useState<MyType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.get('/some-endpoint');
        if (response.data) {
          const raw = response.data.data ?? response.data;
          const arr = Array.isArray(raw) ? raw : raw.data ?? [];
          setItems(arr);
        }
      } catch {
        console.error('Failed to load items');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  // ...
}
```

The `loading` state is tracked but **loading UI is generally not rendered** in existing pages — the data just starts empty. If you need a loading spinner, render `<LoadingSpinner />` when `loading === true`.

### 5.2 Mutation / form submission pattern

Forms use React Hook Form + Zod. On submit, call `apiClient` directly, show a toast, manually re-fetch data to refresh the list, then close the dialog:

```tsx
const onSubmit = async (data: MyFormData) => {
  try {
    await apiClient.post('/endpoint', data);
    toast.success('Item created successfully!');
    // Manually re-fetch to update the list:
    const response = await apiClient.get('/endpoint');
    const raw = response.data.data ?? response.data;
    setItems(Array.isArray(raw) ? raw : raw.data ?? []);
  } catch {
    toast.error('Failed to create item');
  }
  reset();
  setDialogOpen(false);
};
```

### 5.3 Typical full CRUD page structure

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { mySchema, type MyFormData } from '@/lib/validations';
import apiClient from '@/lib/api-client';
import type { MyType } from '@/types';

const columns: ColumnDef<MyType>[] = [
  { accessorKey: 'name', header: 'Name' },
  // additional columns...
];

export default function MyPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [items, setItems] = useState<MyType[]>([]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<MyFormData>({ resolver: zodResolver(mySchema) });

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.get('/my-resource');
        if (response.data) {
          const raw = response.data.data ?? response.data;
          setItems(Array.isArray(raw) ? raw : raw.data ?? []);
        }
      } catch {
        console.error('Failed to load items');
      }
    }
    fetchData();
  }, []);

  const onSubmit = async (data: MyFormData) => {
    try {
      await apiClient.post('/my-resource', data);
      toast.success('Item created!');
      const response = await apiClient.get('/my-resource');
      const raw = response.data.data ?? response.data;
      setItems(Array.isArray(raw) ? raw : raw.data ?? []);
    } catch {
      toast.error('Failed to create item');
    }
    reset();
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Resource" description="Manage my resources">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Item</DialogTitle>
              <DialogDescription>Fill in the details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} placeholder="Item name" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <DataTable columns={columns} data={items} searchKey="name" searchPlaceholder="Search items..." />
    </div>
  );
}
```

### 5.4 Page layout wrapper

All page content is wrapped in `<div className="space-y-6">`. This provides consistent vertical spacing. The outer `main` element in the dashboard layout adds horizontal padding (`p-4 lg:p-6`), so pages do not add their own outer padding.

### 5.5 Important: DialogTrigger render prop pattern

This project uses `@base-ui/react` for Dialog, not Radix. The trigger uses a `render` prop, not `asChild`:

```tsx
// CORRECT
<DialogTrigger render={<Button />}>Click me</DialogTrigger>

// WRONG — do not use asChild
<DialogTrigger asChild><Button>Click me</Button></DialogTrigger>
```

---

## 6. TanStack Query Setup

`@tanstack/react-query` v5.95.2 is listed as a dependency but is **not set up and not used anywhere** in the codebase. There is no `QueryClient`, no `QueryClientProvider`, and no `useQuery` or `useMutation` calls.

All data fetching uses the manual `useEffect` + `useState` + `apiClient` pattern described in Section 5.

If you are asked to add TanStack Query, you would need to:
1. Create a `QueryClient` instance
2. Wrap the root layout (or dashboard layout) with `<QueryClientProvider client={queryClient}>`
3. Use `useQuery`/`useMutation` in page components

Until then, follow the existing manual pattern.

---

## 7. Shared Components

All shared components are re-exported from `src/components/shared/` and `src/components/charts/`. Import paths use the `@/components/` alias.

### 7.1 `PageHeader`

**File:** `src/components/shared/PageHeader.tsx`

```ts
import { PageHeader } from '@/components/shared/PageHeader';
```

**Props:**
```ts
interface PageHeaderProps {
  title: string;           // Required. Rendered as <h1> with bold 2xl text
  description?: string;    // Optional. Rendered as muted paragraph below title
  children?: ReactNode;    // Optional. Rendered in a flex row to the right of the title block
}
```

**Usage:** Pass action buttons (e.g. `<Button>`, `<Dialog>`) as `children`.

```tsx
<PageHeader title="Students" description="Manage student enrolments">
  <Button><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
</PageHeader>
```

### 7.2 `StatCard`

**File:** `src/components/shared/StatCard.tsx`

```ts
import { StatCard } from '@/components/shared/StatCard';
```

**Props:**
```ts
interface StatCardProps {
  title: string;                          // Label above the value
  value: string;                          // The main metric (already formatted string)
  icon: LucideIcon;                       // Icon displayed in a rounded container top-right
  description?: string;                   // Small muted text below the value
  trend?: { value: number; label: string }; // e.g. { value: 5, label: 'vs last term' }
  className?: string;
}
```

Trend is rendered green (↑) for positive values and red (↓) for negative values.

**Usage:**
```tsx
<StatCard
  title="Total Students"
  value={stats.totalStudents.toString()}
  icon={Users}
  description="3 staff members"
  trend={{ value: 5, label: 'vs last term' }}
/>
```

Stat cards are placed in a responsive grid:
```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard ... />
</div>
```

### 7.3 `DataTable`

**File:** `src/components/shared/DataTable.tsx`

```ts
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
```

**Props:**
```ts
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];   // TanStack Table column definitions
  data: TData[];                          // Array of data rows
  searchKey?: string;                     // Column accessorKey to filter by; renders a search input
  searchPlaceholder?: string;             // Defaults to 'Search...'
}
```

Features built in: sorting, column filtering (via search input), pagination (Previous/Next buttons, page count). The search input filters on the column matching `searchKey`. Empty state shows "No results found."

`ColumnDef` is re-exported from `@tanstack/react-table` for convenience — import it from `@/components/shared/DataTable`.

**Usage:**
```tsx
const columns: ColumnDef<Student>[] = [
  { accessorKey: 'admissionNumber', header: 'Admission No' },
  {
    id: 'name',
    header: 'Name',
    accessorFn: (row) => `${row.user.firstName} ${row.user.lastName}`,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <Badge>{row.original.isActive ? 'Active' : 'Inactive'}</Badge>,
  },
];

<DataTable columns={columns} data={students} searchKey="name" searchPlaceholder="Search students..." />
```

### 7.4 `EmptyState`

**File:** `src/components/shared/EmptyState.tsx`

```ts
import { EmptyState } from '@/components/shared/EmptyState';
```

**Props:**
```ts
interface EmptyStateProps {
  icon?: LucideIcon;       // Defaults to InboxIcon
  title: string;           // Bold heading
  description?: string;    // Muted paragraph below heading
  action?: React.ReactNode; // Optional action button
}
```

**Usage:**
```tsx
<EmptyState
  icon={PackageSearch}
  title="No items found"
  description="Add your first item to get started."
  action={<Button onClick={() => setDialogOpen(true)}>Add Item</Button>}
/>
```

### 7.5 `LoadingSpinner`

**File:** `src/components/shared/LoadingSpinner.tsx`

```ts
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
```

**Props:**
```ts
interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg'; // h-4/w-4, h-8/w-8 (default), h-12/w-12
}
```

Renders a centred spinning circle. Wraps content in `<div className="flex items-center justify-center p-8">`.

**Usage:**
```tsx
if (loading) return <LoadingSpinner />;
if (loading) return <LoadingSpinner size="lg" />;
```

### 7.6 `SearchInput`

**File:** `src/components/shared/SearchInput.tsx`

```ts
import { SearchInput } from '@/components/shared/SearchInput';
```

**Props:**
```ts
interface SearchInputProps {
  placeholder?: string;                 // Defaults to 'Search...'
  value: string;
  onChange: (value: string) => void;    // Receives the raw string value (not an event)
  className?: string;
}
```

A controlled search input with a `Search` icon prefix. Use when you need a standalone search box outside of `DataTable`.

### 7.7 Chart components

**File:** `src/components/charts/index.tsx`

```ts
import { LineChartComponent, BarChartComponent, PieChartComponent, AreaChartComponent } from '@/components/charts';
```

All charts use Recharts wrapped in `ResponsiveContainer` with default height of 300px. They apply consistent theme-aware axis and tooltip styles.

**`LineChartComponent`**
```ts
interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; color?: string; name?: string }[];
  height?: number;  // default 300
}
```

**`BarChartComponent`**
```ts
interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; color?: string; name?: string }[];
  height?: number;  // default 300
}
```

**`PieChartComponent`**
```ts
interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;  // default 300
}
```

**`AreaChartComponent`**
```ts
interface AreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  areas: { key: string; color?: string; name?: string }[];
  height?: number;  // default 300
}
```

Default color palette cycles through: `['#2563EB', '#4F46E5', '#F97316', '#10B981', '#F59E0B', '#EF4444']`.

**Usage:**
```tsx
<LineChartComponent
  data={revenueData}
  xKey="month"
  lines={[
    { key: 'collected', color: '#2563EB', name: 'Collected' },
    { key: 'outstanding', color: '#EF4444', name: 'Outstanding' },
  ]}
/>
<PieChartComponent data={[{ name: 'Paid', value: 75 }, { name: 'Overdue', value: 25 }]} />
```

### 7.8 Layout components

These are internal to the dashboard layout and generally not imported by pages directly.

**`Sidebar`** (`src/components/layout/Sidebar.tsx`) — Props: `{ items: NavItem[] }`. Reads `useUIStore` for collapsed/open state. Filters nav items by `useModule().isModuleEnabled(item.module)`.

**`TopBar`** (`src/components/layout/TopBar.tsx`) — No props. Shows hamburger button (mobile), role label, notification badge (count from `useUIStore`), and user dropdown (profile, settings, sign out).

**`BottomNav`** (`src/components/layout/BottomNav.tsx`) — Props: `{ items: NavItem[] }`. Shows only the first 5 nav items. Visible only on mobile (`lg:hidden`).

### 7.9 UI primitives (shadcn / base-ui)

These are in `src/components/ui/` and built on `@base-ui/react`. Use them directly:

| Component | Import path |
|---|---|
| `Button` | `@/components/ui/button` |
| `Input` | `@/components/ui/input` |
| `Label` | `@/components/ui/label` |
| `Badge` | `@/components/ui/badge` |
| `Card`, `CardContent`, `CardHeader`, `CardTitle` | `@/components/ui/card` |
| `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` | `@/components/ui/dialog` |
| `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` | `@/components/ui/select` |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `@/components/ui/tabs` |
| `Avatar`, `AvatarFallback` | `@/components/ui/avatar` |
| `Checkbox` | `@/components/ui/checkbox` |
| `Switch` | `@/components/ui/switch` |
| `Textarea` | `@/components/ui/textarea` |
| `Skeleton` | `@/components/ui/skeleton` |
| `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` | `@/components/ui/sheet` |
| `Separator` | `@/components/ui/separator` |
| `Progress` | `@/components/ui/progress` |
| `Tooltip` | `@/components/ui/tooltip` |
| `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` | `@/components/ui/dropdown-menu` |
| `Accordion` | `@/components/ui/accordion` |
| `Alert` | `@/components/ui/alert` |
| `Calendar` | `@/components/ui/calendar` |
| `Popover` | `@/components/ui/popover` |
| `Command` | `@/components/ui/command` |
| `RadioGroup` | `@/components/ui/radio-group` |
| `InputGroup` | `@/components/ui/input-group` |
| `Toaster` | `@/components/ui/sonner` |

---

## 8. Error Handling Patterns

### 8.1 API errors in data fetching

Errors in `useEffect` data fetching are swallowed silently with `console.error`. The UI does not display an error state — it just shows an empty table. This is the current codebase pattern:

```ts
} catch {
  console.error('Failed to load data');
} finally {
  setLoading(false);
}
```

### 8.2 Mutation errors (toast)

Errors from form submissions and mutations are shown via `sonner` toast:

```ts
import { toast } from 'sonner';

// Success
toast.success('Item created successfully!');

// Error
toast.error('Failed to create item');

// Info
toast.info('Processing...');

// Warning
toast.warning('Check your input');
```

The `<Toaster position="top-right" />` is mounted once in `src/app/layout.tsx` (the root layout). It is available on every page. No setup needed per page.

### 8.3 Form validation errors

React Hook Form + Zod validation errors are displayed inline below each field:

```tsx
<div className="space-y-2">
  <Label htmlFor="firstName">First Name</Label>
  <Input id="firstName" {...register('firstName')} placeholder="First name" />
  {errors.firstName && (
    <p className="text-xs text-destructive">{errors.firstName.message}</p>
  )}
</div>
```

The `text-destructive` class renders in red. Always use this exact pattern for field-level errors.

### 8.4 Submit button loading state

Use `isSubmitting` from `formState` to disable the submit button during submission:

```tsx
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

### 8.5 Select fields with React Hook Form

`<Select>` from `@base-ui/react` does not forward `ref`, so it cannot be used with `register()`. Use `setValue` instead:

```tsx
const { setValue } = useForm<MyFormData>(...);

<Select onValueChange={(val: unknown) => setValue('myField', val as MyType)}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
{errors.myField && <p className="text-xs text-destructive">{errors.myField.message}</p>}
```

---

## 9. Routing & Layout

### 9.1 Route groups and file structure

```
src/app/
  layout.tsx               — Root layout: sets Inter font, mounts <Toaster>
  (dashboard)/
    layout.tsx             — Dashboard shell: Sidebar + TopBar + main + BottomNav
    admin/                 — Admin pages
    parent/                — Parent pages
    student/               — Student pages
    teacher/               — Teacher pages
    tuckshop/              — Tuckshop POS
    superadmin/            — Super admin pages
  login/                   — Public login page
  register/                — Public registration page
  forgot-password/         — Public forgot password page
```

The `(dashboard)` route group applies the dashboard layout to all nested pages without adding `(dashboard)` to the URL.

### 9.2 Dashboard layout

**File:** `src/app/(dashboard)/layout.tsx`

The layout is a `'use client'` component. It reads `useAuthStore` to get the current user and selects the correct nav items:

```
Role          Nav constant
admin         ADMIN_NAV
teacher       TEACHER_NAV
parent        PARENT_NAV
student       STUDENT_NAV
tuckshop      ADMIN_NAV  (falls back to admin nav)
super_admin   SUPERADMIN_NAV
unknown       ADMIN_NAV  (default fallback)
```

Layout structure:
```
<div className="flex h-screen overflow-hidden bg-muted/30">
  <Sidebar items={navItems} />
  <div className="flex flex-1 flex-col overflow-hidden">
    <TopBar />
    <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
      {children}  ← your page renders here
    </main>
  </div>
  <BottomNav items={navItems} />  ← mobile only (lg:hidden)
</div>
```

The `pb-20` on mobile accounts for the fixed BottomNav bar. The `lg:pb-6` removes it on desktop.

### 9.3 Navigation constants

**File:** `src/lib/constants.ts`

All route paths are in the `ROUTES` constant (exported as `const`). The nav arrays for each role are:

- `ADMIN_NAV` — 22 items including Dashboard, Students, Staff, Fees (with children: Overview/Invoices/Debtors/Statements), Wallet, Tuck Shop, Academics, Attendance, Events, Transport, Communication, Lost & Found, After Care, Announcements, Fundraising, Learning, Data Migration, Uniform Shop, Sport, Reports, Settings
- `PARENT_NAV` — 12 items
- `STUDENT_NAV` — 7 items
- `TEACHER_NAV` — 9 items including AI Tools (with children: Overview/Create Paper/AI Grading/Paper Library)
- `SUPERADMIN_NAV` — 5 items

**NavItem interface:**
```ts
interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module?: string;     // If set, item is hidden when module is not enabled
  badge?: string;      // Small badge label (e.g. 'AI')
  children?: NavItem[]; // Sub-nav items shown when parent is active
}
```

### 9.4 Module gating

Nav items with a `module` property are filtered by `useModule().isModuleEnabled(moduleId)`. The `useModule` hook checks `mockSchool.enabledModules` (currently hardcoded to `['fees', 'wallet', 'tuckshop', 'transport', 'communication', 'events', 'library', 'discipline']`).

**File:** `src/hooks/useModule.ts`

```ts
const { isModuleEnabled } = useModule();
if (!isModuleEnabled('wallet')) { /* feature gated */ }
```

### 9.5 Permission hooks

**File:** `src/hooks/usePermissions.ts`

```ts
import { usePermissions } from '@/hooks/usePermissions';
const { hasRole, hasAnyRole, isAdmin, isTeacher, isParent, isStudent, user } = usePermissions();
```

| Helper | Description |
|---|---|
| `hasRole(role)` | `user?.role === role` |
| `hasAnyRole(...roles)` | true if user role matches any of the provided roles |
| `isAdmin()` | shortcut for `hasRole('admin')` |
| `isTeacher()` | shortcut for `hasRole('teacher')` |
| `isParent()` | shortcut for `hasRole('parent')` |
| `isStudent()` | shortcut for `hasRole('student')` |

---

## 10. Type Definitions

All shared TypeScript types are in `src/types/index.ts`. Import from `@/types`.

### 10.1 Core / Auth types

```ts
type UserRole = 'admin' | 'teacher' | 'parent' | 'student' | 'tuckshop' | 'super_admin';

interface User {
  id: string; email: string; firstName: string; lastName: string;
  role: UserRole; avatar?: string; phone?: string;
  schoolId: string; isActive: boolean; createdAt: string; updatedAt: string;
}

interface LoginCredentials { email: string; password: string; }
interface AuthTokens { accessToken: string; refreshToken: string; }

interface RegisterSchoolData {
  schoolName: string; adminFirstName: string; adminLastName: string;
  adminEmail: string; adminPassword: string; phone: string;
  address: string; city: string; province: string; postalCode: string;
  schoolType: 'primary' | 'secondary' | 'combined';
}
```

### 10.2 School

```ts
interface School {
  id: string; name: string; slug: string; logo?: string;
  address: string; city: string; province: string; postalCode: string;
  phone: string; email: string; website?: string;
  type: 'primary' | 'secondary' | 'combined';
  enabledModules: string[];
  settings: SchoolSettings;
  createdAt: string;
}

interface SchoolSettings {
  currency: string; timezone: string;
  academicYearStart: string; academicYearEnd: string;
  attendanceMethod: 'period' | 'daily';
  gradingSystem: 'percentage' | 'letter' | 'gpa';
}
```

### 10.3 Academic entities

```ts
interface Student {
  id: string; userId: string; user: User; admissionNumber: string;
  gradeId: string; grade: Grade; classId: string; class: SchoolClass;
  dateOfBirth: string; gender: 'male' | 'female' | 'other';
  address: string; medicalInfo: MedicalInfo; parentIds: string[]; parents: Parent[];
  walletId?: string; wallet?: Wallet; isActive: boolean; enrolledDate: string;
  houseId?: string; house?: House;
  firstName?: string; lastName?: string; // Sometimes present on flattened API responses
}

interface Parent {
  id: string; userId: string; user: User;
  relationship: 'mother' | 'father' | 'guardian' | 'other';
  occupation?: string; employer?: string;
  studentIds: string[]; students: Student[];
}

interface Teacher {
  id: string; userId: string; user: User; employeeNumber: string;
  department?: string; subjects: string[]; qualifications: string[];
  hireDate: string; classIds: string[];
}

interface Grade { id: string; name: string; level: number; schoolId: string; classes: SchoolClass[]; }
interface SchoolClass { id: string; name: string; gradeId: string; grade: Grade; gradeName?: string; teacherId: string; teacher: Teacher; capacity: number; studentCount: number; }
interface Subject { id: string; name: string; code: string; gradeId: string; teacherId: string; teacher: Teacher; isElective: boolean; }

interface Attendance {
  id: string; studentId: string; student: Student; date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  period?: number; note?: string; markedById: string; markedBy: User;
}

interface Homework {
  id: string; title: string; description: string;
  subjectId: string; subject?: Subject; subjectName?: string;
  classId: string; teacherId: string; teacher?: Teacher;
  dueDate: string; attachments: string[];
  status: 'draft' | 'published' | 'closed'; createdAt: string;
}

interface Assessment {
  id: string; name: string;
  type: 'test' | 'exam' | 'assignment' | 'project' | 'quiz';
  subjectId: string; subject: Subject; classId: string;
  totalMarks: number; weight: number; date: string; term: number;
}

interface StudentGrade {
  id: string; studentId: string; student: Student;
  assessmentId: string; assessment: Assessment;
  marks: number; percentage: number; comment?: string; gradedById: string;
}
```

### 10.4 Financial types

All monetary values are stored and transmitted as **cents** (integers). Use `formatCurrency(cents)` from `src/lib/utils` to display.

```ts
interface FeeType {
  id: string; name: string; description: string; amount: number; // cents
  frequency: 'once' | 'monthly' | 'quarterly' | 'annually';
  gradeIds: string[]; isOptional: boolean; schoolId: string;
}

interface Invoice {
  id: string; invoiceNumber: string; studentId: string; student: Student;
  parentId: string; parent: Parent; items: InvoiceItem[];
  totalAmount: number; paidAmount: number; balanceDue: number; // all cents
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  dueDate: string; issuedDate: string; term: number; year: number;
}

interface Payment {
  id: string; invoiceId: string; parentId: string; amount: number; // cents
  method: 'cash' | 'eft' | 'card' | 'debit_order' | 'wallet';
  reference: string; status: 'pending' | 'completed' | 'failed' | 'refunded';
  date: string;
}

interface Wallet {
  id: string; studentId: string; balance: number; // cents
  wristbandId?: string; dailyLimit: number; // cents
  isActive: boolean; lastTopUp?: string;
}

interface WalletTransaction {
  id: string; walletId: string;
  type: 'topup' | 'purchase' | 'refund';
  amount: number; balance: number; // cents
  description: string; reference?: string; createdAt: string;
}
```

### 10.5 Tuckshop

```ts
interface TuckshopItem {
  id: string; name: string; description?: string; category: string;
  price: number; // cents
  image?: string; allergens: string[]; isAvailable: boolean; stockCount?: number;
}

interface TuckshopOrder {
  id: string; studentId: string; student: Student;
  items: TuckshopOrderItem[]; totalAmount: number; // cents
  walletTransactionId: string; servedBy: string; createdAt: string;
}
```

### 10.6 Communication & notifications

```ts
interface Message {
  id: string; senderId: string; sender: User; recipientIds: string[];
  subject: string; body: string;
  type: 'message' | 'announcement' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean; attachments: string[]; createdAt: string;
}

interface Notification {
  id: string; userId: string; title: string; message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean; link?: string; createdAt: string;
}
```

### 10.7 Other domain types

```ts
interface SchoolEvent {
  id: string; title: string; description: string;
  type: 'academic' | 'sports' | 'cultural' | 'social' | 'meeting';
  startDate: string; endDate: string; location?: string; isAllDay: boolean;
  requiresConsent: boolean; ticketPrice?: number; maxAttendees?: number; createdBy: string;
}

interface TransportRoute { id: string; name: string; description: string; driverId: string; driverName: string; driverPhone: string; vehicleReg: string; stops: TransportStop[]; studentIds: string[]; isActive: boolean; }
interface DisciplineRecord { id: string; studentId: string; student: Student; type: 'merit' | 'demerit'; category: string; points: number; description: string; reportedById: string; reportedBy: User; date: string; }
interface ConsentForm { id: string; title: string; description: string; eventId?: string; dueDate: string; status: 'pending' | 'signed' | 'declined'; parentId: string; studentId: string; signedAt?: string; }
interface House { id: string; name: string; color: string; points: number; motto?: string; }
interface Achievement { id: string; name: string; description: string; icon: string; category: 'academic' | 'sports' | 'leadership' | 'service' | 'special'; points: number; }

type LostFoundCategory = 'clothing' | 'stationery' | 'lunch_box' | 'electronics' | 'sports' | 'bags' | 'other';
interface FoundItem { id: string; name: string; description: string; category: LostFoundCategory; location: string; photoUrl?: string; dateFound: string; status: 'unclaimed' | 'claimed' | 'matched' | 'archived'; reportedBy: string; claimedBy?: string; claimedDate?: string; matchedReportId?: string; }
interface LostReport { id: string; studentId: string; studentName: string; parentId: string; parentName: string; itemName: string; description: string; category: LostFoundCategory; locationLost: string; dateLost: string; status: 'open' | 'matched' | 'resolved' | 'closed'; matchedItemId?: string; createdAt: string; }
```

### 10.8 API response wrappers

```ts
interface ApiResponse<T> { data: T; message?: string; success: boolean; }
interface PaginatedResponse<T> { data: T[]; total: number; page: number; pageSize: number; totalPages: number; }
interface DashboardStats { totalStudents: number; totalStaff: number; revenueCollected: number; collectionRate: number; attendanceRate: number; outstandingFees: number; walletBalance: number; }
```

### 10.9 Super Admin / Platform types

```ts
type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';
type SubscriptionTier = 'starter' | 'growth' | 'enterprise';

interface Tenant {
  id: string; name: string; slug: string; status: TenantStatus; tier: SubscriptionTier;
  studentCount: number; mrr: number; // cents
  adminEmail: string; adminName: string; city: string; province: string;
  enabledModules: string[]; createdAt: string; trialEndsAt?: string; logo?: string;
}

interface PlatformStats { totalSchools: number; totalStudents: number; mrr: number; arr: number; activeTrials: number; outstanding: number; }
```

---

## 11. Utility Functions

**File:** `src/lib/utils.ts`

| Function | Signature | Description |
|---|---|---|
| `cn(...inputs)` | `(...ClassValue[]) => string` | Merges Tailwind classes using clsx + tailwind-merge |
| `formatCurrency(cents)` | `(number) => string` | Formats cents as ZAR: `R1,234.56` |
| `formatDate(dateStr, fmt?)` | `(string, string?) => string` | Formats ISO date string; default format `'dd MMM yyyy'` |
| `formatRelativeDate(dateStr)` | `(string) => string` | Returns relative time, e.g. `"2 hours ago"` |
| `formatPhone(phone)` | `(string) => string` | Formats 10-digit SA phone: `'082 123 4567'` |
| `getInitials(firstName, lastName)` | `(string, string) => string` | Returns 2-char uppercase initials |
| `calcPercentage(value, total)` | `(number, number) => number` | Returns rounded percentage; returns 0 if total is 0 |

---

## 12. Zod Validation Schemas

Two files export Zod schemas. When a schema exists for the entity you are building, use it — do not create a duplicate.

**`src/lib/validations/index.ts`** — auth and admin schemas:
- `loginSchema` / `LoginFormData`
- `registerSchema` / `RegisterFormData`
- `studentSchema` / `StudentFormData`
- `staffSchema` / `StaffFormData`
- `feeTypeSchema` / `FeeTypeFormData`
- `homeworkSchema` / `HomeworkFormData`
- `eventSchema` / `EventFormData`
- `disciplineSchema` / `DisciplineFormData`
- `messageSchema` / `MessageFormData`

**`src/lib/validations.ts`** — additional/extended schemas (some overlap with index.ts):
- `studentSchema`, `staffSchema`, `feeTypeSchema`, `eventSchema`, `messageSchema`, `homeworkSchema`, `disciplineSchema`
- `foundItemSchema` / `FoundItemFormData`
- `lostReportSchema` / `LostReportFormData`

**Note:** The `validations/index.ts` versions have slightly different field lists than `validations.ts`. The `validations/index.ts` file is the more complete version used by auth pages. Pages import from either — check which file is already used in sibling pages for consistency. Prefer `@/lib/validations` (the `.ts` file) for domain schemas unless a sibling page uses `@/lib/validations/index.ts`.

---

## 13. Mock Data

**File:** `src/lib/mock-data.ts`

All entities have corresponding `mock*` arrays (e.g. `mockStudents`, `mockTeachers`, `mockInvoices`). The `mockSchool` object is the canonical school used by `useModule` to determine enabled modules. Mock data is only used by `useModule` in production code — pages hit the real API via `apiClient`.

`mockSchool.enabledModules` = `['fees', 'wallet', 'tuckshop', 'transport', 'communication', 'events', 'library', 'discipline']`

---

## 14. Constants

**File:** `src/lib/constants.ts`

| Export | Type | Description |
|---|---|---|
| `ROUTES` | `const` record | All route path strings for the entire app |
| `ADMIN_NAV` | `NavItem[]` | Admin sidebar navigation |
| `PARENT_NAV` | `NavItem[]` | Parent sidebar navigation |
| `STUDENT_NAV` | `NavItem[]` | Student sidebar navigation |
| `TEACHER_NAV` | `NavItem[]` | Teacher sidebar navigation |
| `SUPERADMIN_NAV` | `NavItem[]` | Super admin sidebar navigation |
| `MODULES` | `readonly` array | Module definitions with `id`, `name`, `description` |
| `SA_PROVINCES` | `readonly string[]` | 9 South African province names |
| `GRADE_LEVELS` | `readonly string[]` | Grade R through Grade 12 |
| `NavItem` | interface | `{ label, href, icon, module?, badge?, children? }` |
