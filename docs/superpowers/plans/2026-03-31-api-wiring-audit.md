# API Wiring Audit - Full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all frontend-backend API path mismatches, remove mock data fallbacks, and create missing backend endpoints so the app is fully wired end-to-end.

**Architecture:** The frontend (Next.js) uses a centralized `apiClient` (axios) with base URL `http://localhost:4500/api`. The backend (Express) mounts modules under `/api/<module>`. All authenticated routes inject `req.user` with `{ id, email, role, schoolId }` from the JWT. Backend controllers for list endpoints fall back to `req.user.schoolId` when no explicit schoolId is provided.

**Tech Stack:** Next.js (frontend), Express + MongoDB (backend), Zustand (state), axios (HTTP), zod (validation)

**Common patterns used across all frontend fixes:**
- Remove mock data imports from `@/lib/mock-data`
- Change `useState(mockX)` to `useState<Type[]>([])` (or appropriate empty value)
- Import `useAuthStore` where `user.schoolId` is needed
- Fix API endpoint paths to match backend routes
- Replace `catch { console.warn('API unavailable, using mock data') }` with `catch { console.error('Failed to load data') }`
- Keep `response.data.data ?? response.data` normalization (backend wraps in `apiResponse`)

---

### Task 1: Create Backend Staff Module

The frontend admin/staff page calls `GET /api/staff` and `POST /api/staff` but no backend endpoint exists. Staff are Users with role `teacher` scoped to a school.

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/Staff/routes.ts`
- Create: `c:/Users/shaun/campusly-backend/src/modules/Staff/controller.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/app.ts` (add staff routes)

- [ ] **Step 1: Create Staff controller**

Create `c:/Users/shaun/campusly-backend/src/modules/Staff/controller.ts`:

```typescript
import { Request, Response } from 'express';
import { User } from '../Auth/model.js';
import { apiResponse } from '../../common/utils.js';

export class StaffController {
  static async list(req: Request, res: Response): Promise<void> {
    const schoolId = (req.query.schoolId as string) ?? req.user?.schoolId;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      schoolId,
      role: 'teacher',
      isDeleted: { $ne: true },
    };

    if (req.query.search) {
      const search = req.query.search as string;
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-password -refreshTokens').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    // Map to Teacher-like shape for frontend compatibility
    const staff = users.map((u) => ({
      id: u._id,
      userId: u._id,
      user: {
        id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        schoolId: u.schoolId,
      },
      employeeNumber: u.employeeNumber ?? '',
      department: u.department ?? '',
      subjects: u.subjects ?? [],
      qualifications: u.qualifications ?? [],
      hireDate: u.createdAt,
      classIds: [],
    }));

    res.json(apiResponse(true, { data: staff, total, page, limit }));
  }

  static async create(req: Request, res: Response): Promise<void> {
    const { firstName, lastName, email, phone, department, subjects } = req.body;
    const schoolId = req.user?.schoolId;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json(apiResponse(false, undefined, undefined, 'A user with this email already exists'));
      return;
    }

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password: 'Temp1234!', // Temporary password — user should reset
      role: 'teacher',
      schoolId,
      department,
      subjects: typeof subjects === 'string' ? subjects.split(',').map((s: string) => s.trim()) : subjects,
      isActive: true,
    });

    const safeUser = user.toObject();
    delete (safeUser as any).password;
    delete (safeUser as any).refreshTokens;

    res.status(201).json(apiResponse(true, safeUser, 'Staff member created successfully'));
  }
}
```

- [ ] **Step 2: Create Staff routes**

Create `c:/Users/shaun/campusly-backend/src/modules/Staff/routes.ts`:

```typescript
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { StaffController } from './controller.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorize('super_admin', 'school_admin'),
  StaffController.list,
);

router.post(
  '/',
  authenticate,
  authorize('super_admin', 'school_admin'),
  StaffController.create,
);

export default router;
```

- [ ] **Step 3: Register staff routes in app.ts**

In `c:/Users/shaun/campusly-backend/src/app.ts`, add after the `aiToolsRoutes` import:

```typescript
import staffRoutes from './modules/Staff/routes.js';
```

Add after `app.use('/api/ai-tools', ...)`:

```typescript
app.use('/api/staff', authenticate, staffRoutes);
```

Wait — the routes already have `authenticate` middleware. Remove it from app.ts and just mount:

```typescript
app.use('/api/staff', staffRoutes);
```

- [ ] **Step 4: Verify the User model supports department/subjects fields**

Check the Auth model for `department`, `subjects`, `employeeNumber` fields. If they don't exist on the User schema, the controller's mapping will return empty strings/arrays which is fine — these fields are read defensively with `??` fallbacks.

- [ ] **Step 5: Commit backend staff module**

```bash
git add src/modules/Staff/ src/app.ts
git commit -m "feat: add staff listing and creation endpoints"
```

---

### Task 2: Fix Admin Pages (7 files)

#### 2a: admin/students/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/students/page.tsx`

Changes:
- Remove `mockStudents` import
- Change `useState<Student[]>(mockStudents)` → `useState<Student[]>([])`
- API path `/students` is correct (backend uses `req.user.schoolId`)
- Remove mock fallback in catch

- [ ] **Step 1: Apply changes to admin/students/page.tsx**

Remove the mock import line:
```
import { mockStudents } from '@/lib/mock-data';
```

Change state initialization:
```typescript
// OLD
const [students, setStudents] = useState<Student[]>(mockStudents);
// NEW
const [students, setStudents] = useState<Student[]>([]);
```

Change the data check (remove `data.length > 0` guard so empty arrays are accepted):
```typescript
// OLD
if (Array.isArray(data) && data.length > 0) setStudents(data);
// NEW
if (Array.isArray(data)) setStudents(data);
```

Change catch block:
```typescript
// OLD
catch { console.warn('API unavailable, using mock data'); }
// NEW
catch { console.error('Failed to load students'); }
```

#### 2b: admin/staff/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/staff/page.tsx`

Changes:
- Remove `mockTeachers` import
- Change `useState(mockTeachers)` → `useState<Teacher[]>([])`
- API path `/staff` is now correct (Task 1 created the endpoint)
- Fix fake success toast on API failure

- [ ] **Step 2: Apply changes to admin/staff/page.tsx**

Remove mock import:
```
import { mockTeachers } from '@/lib/mock-data';
```

Change state:
```typescript
// OLD
const [staffList, setStaffList] = useState(mockTeachers);
// NEW
const [staffList, setStaffList] = useState<Teacher[]>([]);
```

Fix useEffect catch:
```typescript
// OLD
catch { console.warn('API unavailable, using mock data'); }
// NEW
catch { console.error('Failed to load staff'); }
```

Fix onSubmit — remove fake success on failure:
```typescript
// OLD (outer catch)
catch {
  // Graceful degradation — still show success toast
  toast.success('Staff member added successfully!');
}
// NEW
catch {
  toast.error('Failed to add staff member');
}
```

Also fix the inner catch in onSubmit (refresh after create):
```typescript
// OLD
catch { // Silently ignore refresh failure }
// NEW
catch { console.error('Failed to refresh staff list'); }
```

#### 2c: admin/fees/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/fees/page.tsx`

Changes:
- Remove `mockFeeTypes, mockInvoices` imports
- Import `useAuthStore`
- Get `user` from auth store for `schoolId`
- Fix API paths: `/fee/types` → `/fees/types/school/${user?.schoolId}`, `/fee/invoices` → `/fees/invoices/school/${user?.schoolId}`, POST `/fee/types` → `/fees/types`

- [ ] **Step 3: Apply changes to admin/fees/page.tsx**

Remove mock import:
```
import { mockFeeTypes, mockInvoices } from '@/lib/mock-data';
```

Add auth import:
```typescript
import { useAuthStore } from '@/stores/useAuthStore';
```

Change state:
```typescript
// OLD
const [feeTypes, setFeeTypes] = useState<FeeType[]>(mockFeeTypes);
const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
// NEW
const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
const [invoices, setInvoices] = useState<Invoice[]>([]);
```

Add auth hook inside component (before useEffect):
```typescript
const { user } = useAuthStore();
```

Fix useEffect fetch paths:
```typescript
// OLD
const [feeTypesRes, invoicesRes] = await Promise.all([
  apiClient.get('/fee/types'),
  apiClient.get('/fee/invoices'),
]);
// NEW
const [feeTypesRes, invoicesRes] = await Promise.all([
  apiClient.get(`/fees/types/school/${user?.schoolId}`),
  apiClient.get(`/fees/invoices/school/${user?.schoolId}`),
]);
```

Add `user` to useEffect dependency array:
```typescript
}, [user?.schoolId]);
```

Fix POST and refresh paths:
```typescript
// OLD
await apiClient.post('/fee/types', data);
// NEW
await apiClient.post('/fees/types', data);

// OLD (refresh)
const response = await apiClient.get('/fee/types');
// NEW
const response = await apiClient.get(`/fees/types/school/${user?.schoolId}`);
```

Fix catch blocks — remove fake success:
```typescript
// OLD (outer catch in onSubmit)
catch (error) {
  console.warn('Failed to save fee type via API');
  toast.success('Fee type added successfully!');
  reset();
  setDialogOpen(false);
}
// NEW
catch {
  toast.error('Failed to create fee type');
}
```

Fix useEffect catch:
```typescript
// OLD
catch (error) { console.warn('API unavailable, using mock data'); }
// NEW
catch { console.error('Failed to load fee data'); }
```

Normalize response data (ensure arrays work):
```typescript
// OLD
if (feeTypesRes.data) setFeeTypes(feeTypesRes.data.data ?? feeTypesRes.data);
if (invoicesRes.data) setInvoices(invoicesRes.data.data ?? invoicesRes.data);
// NEW
if (feeTypesRes.data) {
  const d = feeTypesRes.data.data ?? feeTypesRes.data;
  setFeeTypes(Array.isArray(d) ? d : d.data ?? []);
}
if (invoicesRes.data) {
  const d = invoicesRes.data.data ?? invoicesRes.data;
  setInvoices(Array.isArray(d) ? d : d.data ?? []);
}
```

#### 2d: admin/fees/invoices/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/fees/invoices/page.tsx`

- [ ] **Step 4: Apply changes to admin/fees/invoices/page.tsx**

Remove mock import, add auth store, fix path from `/fee/invoices` → `/fees/invoices/school/${user?.schoolId}`, empty initial state, fix catch.

#### 2e: admin/fees/debtors/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/fees/debtors/page.tsx`

- [ ] **Step 5: Apply changes to admin/fees/debtors/page.tsx**

Remove mock import, add auth store, fix path from `/fee/debtors-report` → `/fees/debtors/school/${user?.schoolId}`, empty initial state, fix catch.

#### 2f: admin/wallet/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/wallet/page.tsx`

This page lists all wallets. The backend has `GET /wallets/student/:studentId` (single wallet) but no list-all endpoint. Strategy: fetch students list, then display wallet info from student data. OR change to fetch students and show their wallet balances.

Simpler approach: fetch all students (which the backend supports via `GET /students` with `req.user.schoolId`), then for each student that has a walletId, we have enough info to display. The wallet data can be fetched individually or we accept that admin wallet overview will need backend enhancement later.

Pragmatic fix: Change to fetch students and build wallet rows from student data + individual wallet fetches.

- [ ] **Step 6: Apply changes to admin/wallet/page.tsx**

Remove mock imports (`mockWallets, mockStudents`), remove `buildWalletRows` function (uses mockStudents), change to fetch from `/students` endpoint and build rows from student data. Replace `buildApiWalletRows` to handle the student-based approach. Fix catch.

The page should:
1. Fetch `GET /students`
2. For students with `walletId`, fetch `GET /wallets/student/${studentId}`
3. Build wallet rows from the combined data

#### 2g: admin/tuckshop/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/tuckshop/page.tsx`

- [ ] **Step 7: Apply changes to admin/tuckshop/page.tsx**

Remove mock imports (`mockTuckshopItems, mockDailySales`). Fix path `/tuckshop/menu-items` → `/tuck-shop/menu`. Add second fetch for daily sales: `/tuck-shop/sales/daily`. Empty initial states. Fix catch.

- [ ] **Step 8: Commit admin page fixes**

```bash
git add src/app/\(dashboard\)/admin/
git commit -m "fix: wire admin pages to correct backend API endpoints, remove mock data"
```

---

### Task 3: Fix Teacher Pages (3 files)

#### 3a: teacher/attendance/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/attendance/page.tsx`

- [ ] **Step 1: Apply changes to teacher/attendance/page.tsx**

Remove mock imports (`mockStudents, mockClasses`). Fix paths: `/classes` → `/academic/classes`. `/students` path is correct. Empty initial states: `useState<Student[]>([])`, `useState<SchoolClass[]>([])`. Fix `setSelectedClass` to not use `'c1'` fallback. Fix catch blocks.

#### 3b: teacher/classes/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/classes/page.tsx`

- [ ] **Step 2: Apply changes to teacher/classes/page.tsx**

Remove mock imports. Fix paths: `/classes` → `/academic/classes`. Empty initial states. Fix catch.

#### 3c: teacher/homework/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/homework/page.tsx`

- [ ] **Step 3: Apply changes to teacher/homework/page.tsx**

Remove mock imports (`mockHomework, mockSubmissions, mockSubjects, mockClasses, mockTeachers`). Fix paths: `/subjects` → `/academic/subjects`, `/classes` → `/academic/classes`. Remove `currentTeacher = mockTeachers[0]` — use auth store `user.id` to filter homework by `teacherId`. Empty initial states. Fix catch.

For filtering teacher's homework, use the auth user's ID:
```typescript
const { user } = useAuthStore();
// ...
const teacherHomework = homeworkList.filter((hw) => hw.teacherId === user?.id);
```

Also remove mock submissions reference in the homework list render — submissions should come from API.

- [ ] **Step 4: Commit teacher page fixes**

```bash
git add src/app/\(dashboard\)/teacher/
git commit -m "fix: wire teacher pages to correct backend API endpoints, remove mock data"
```

---

### Task 4: Fix Student Pages (3 files)

#### 4a: student/grades/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/student/grades/page.tsx`

The current page calls `/grades` (which maps to `/api/academic/grades` — grade *levels*, not student marks). The correct endpoint for a student's marks is `GET /academic/marks/student/:studentId`.

- [ ] **Step 1: Apply changes to student/grades/page.tsx**

Remove mock imports (`mockStudentGrades, mockSubjects, mockStudents`). Add auth store. Remove `const currentStudent = mockStudents[0]` — derive studentId from auth.

Fix API paths:
```typescript
// OLD
apiClient.get('/grades')
apiClient.get('/subjects')
// NEW
apiClient.get(`/academic/marks/student/${studentId}`)
apiClient.get('/academic/subjects')
```

The page needs the student's ID. Approach: fetch `/students` and find the student matching `user.id`:
```typescript
const { user } = useAuthStore();
const [studentId, setStudentId] = useState<string | null>(null);

// In useEffect: first get the student record
const studentsRes = await apiClient.get('/students');
const students = studentsRes.data.data ?? studentsRes.data;
const me = (Array.isArray(students) ? students : students.data ?? [])
  .find((s: any) => s.userId === user?.id);
if (me) setStudentId(me.id);
```

#### 4b: student/wallet/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/student/wallet/page.tsx`

- [ ] **Step 2: Apply changes to student/wallet/page.tsx**

Remove mock imports. Add auth store. Remove `const currentStudent = mockStudents[0]` and mock wallet/txn derivation.

Fix API paths:
```typescript
// OLD
apiClient.get(`/wallet/${currentStudent.id}`)
apiClient.get('/tuckshop/menu-items')
// NEW
apiClient.get(`/wallets/student/${studentId}`)
apiClient.get('/tuck-shop/menu')
```

Derive studentId same approach as 4a.

#### 4c: student/homework/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/student/homework/page.tsx`

- [ ] **Step 3: Apply changes to student/homework/page.tsx**

Remove mock imports. Fix paths:
```typescript
// OLD
apiClient.get('/homework/submissions')
// NEW
apiClient.get(`/homework/student/${studentId}/submissions`)
```

`/homework` path is correct. Derive studentId from auth + students list.

- [ ] **Step 4: Commit student page fixes**

```bash
git add src/app/\(dashboard\)/student/
git commit -m "fix: wire student pages to correct backend API endpoints, remove mock data"
```

---

### Task 5: Fix Parent Pages (2 files)

#### 5a: parent/fees/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/parent/fees/page.tsx`

- [ ] **Step 1: Apply changes to parent/fees/page.tsx**

Remove mock imports (`mockInvoices, mockPayments, mockStudents`). Add auth store. Remove mock parent/children derivation at top.

Fix API paths:
```typescript
// OLD
apiClient.get('/fee/invoices')
apiClient.get('/fee/payments')
// NEW
apiClient.get(`/fees/invoices/school/${user?.schoolId}`)
// For payments: fetch per-invoice or omit until backend supports bulk parent payments
```

For payments, the backend only has `GET /fees/payments/:invoiceId`. Approach: after fetching invoices, fetch payments for each invoice:
```typescript
const invoiceData = invRes.data.data ?? invRes.data;
if (Array.isArray(invoiceData)) {
  setInvoices(invoiceData);
  // Fetch payments for each invoice
  const paymentPromises = invoiceData.map((inv: Invoice) =>
    apiClient.get(`/fees/payments/${inv.id}`).catch(() => ({ data: { data: [] } }))
  );
  const paymentResults = await Promise.all(paymentPromises);
  const allPayments = paymentResults.flatMap((r) => {
    const d = r.data.data ?? r.data;
    return Array.isArray(d) ? d : d.data ?? [];
  });
  setPayments(allPayments);
}
```

#### 5b: parent/wallet/page.tsx

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/parent/wallet/page.tsx`

- [ ] **Step 2: Apply changes to parent/wallet/page.tsx**

Remove mock imports (`mockStudents, mockWallets, mockWalletTransactions`). Add auth store.

The page needs: parent's children, their wallets, and transactions. Approach:
1. Fetch `/parents` and find current parent by `userId === user.id`
2. Use parent's `studentIds` to fetch children from `/students`
3. For each child, fetch wallet from `/wallets/student/${childId}`
4. For each wallet, fetch transactions from `/wallets/${walletId}/transactions`

Fix load money path:
```typescript
// OLD
apiClient.post('/wallet/load', { walletId, amount })
apiClient.get('/wallet')
// NEW
apiClient.post(`/wallets/${walletId}/load`, { amount, description: 'Parent top-up' })
// Then refresh by re-fetching wallet for that student
```

- [ ] **Step 3: Commit parent page fixes**

```bash
git add src/app/\(dashboard\)/parent/
git commit -m "fix: wire parent pages to correct backend API endpoints, remove mock data"
```

---

### Task 6: Fix Admin Dashboard Page

**File:** `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/admin/page.tsx`

Already partially fixed (path changed to `/reports/dashboard`). Still uses mock data as defaults.

- [ ] **Step 1: Apply changes to admin/page.tsx**

Remove mock imports (`mockAdminStats, mockRevenueData, mockAttendanceByGrade, mockFeeStatusData`). Set proper empty default states. Fix catch.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/admin/page.tsx
git commit -m "fix: remove mock data from admin dashboard"
```

---

### Task 7: Verification

- [ ] **Step 1: Start backend and verify staff endpoint**

```bash
cd c:/Users/shaun/campusly-backend && npm run dev
# In another terminal:
curl -s http://localhost:4500/api/staff -H "Authorization: Bearer <token>" | head
```

- [ ] **Step 2: Start frontend and test each page**

Navigate to each dashboard page and verify:
- No console errors about mock data
- API calls hit correct endpoints (check Network tab)
- Pages load with real data or show empty states

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: complete API wiring audit — all frontend pages connected to backend"
```
