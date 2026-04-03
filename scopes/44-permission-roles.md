# 44 — Permission-Based Role Views

## 1. Module Overview

The Permission-Based Role Views module extends the existing User model with fine-grained permission flags that gate access to specialised features within existing portals. This is NOT a new role system — it adds boolean flags to existing users, enabling additional navigation items and backend access without changing the core RBAC model (super_admin, school_admin, teacher, parent, student).

### Permission Flags

| Flag | Applies to Role | Purpose |
|---|---|---|
| `isSchoolPrincipal` | `school_admin` | Grants access to the Principal Dashboard (scope 36) — school-wide analytics, staff oversight, strategic reporting |
| `isHOD` | `teacher` | Grants access to HOD Oversight tools (scope 37) — departmental analytics, teacher pacing review, moderation queues |
| `isBursar` | `school_admin` | Grants access to advanced financial management — fee reconciliation, budget planning, financial reporting |
| `isReceptionist` | `school_admin` | Grants access to Visitor Management (scope 34) — visitor check-in/out, appointment scheduling, front desk tools |
| `isCounselor` | `teacher` | Grants access to Pastoral Care tools (scope 47) — confidential student notes, referral management, wellbeing profiles |

Each flag defaults to `false`. When `isHOD` is `true`, the user must also have a `departmentId` linking to the academic department they oversee.

### Design Principles

1. **Additive only** — permission flags add capabilities, they never remove existing ones. A teacher with `isHOD: true` retains all normal teacher features.
2. **Flag on User, not a separate collection** — avoids join complexity. Flags are embedded in the JWT payload for zero-latency frontend checks.
3. **Audit everything** — every permission change is logged to the audit trail with before/after values.
4. **Admin-managed** — only `school_admin` or `super_admin` can assign or revoke permission flags. Users cannot self-assign.

### Why This Scope is a Prerequisite

Scopes 34 (Visitor Management), 36 (Principal Dashboard), 37 (HOD Oversight), and 47 (Pastoral Care) all depend on permission flags to gate access. This scope must be implemented first to provide the `requirePermission` middleware and the admin UI for assigning flags.

---

## 2. Backend API Endpoints

All permission management endpoints are mounted under `/api/permissions`. Authentication is required on all routes via the `authenticate` middleware.

---

### 2.1 User Model Extensions

The following fields are added to the existing User schema (no new collection):

```typescript
// Added to IUser interface and userSchema
isSchoolPrincipal: { type: Boolean, default: false }
isHOD: { type: Boolean, default: false }
departmentId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null }  // academic department
isBursar: { type: Boolean, default: false }
isReceptionist: { type: Boolean, default: false }
isCounselor: { type: Boolean, default: false }
```

These fields are included in the JWT payload so the frontend can check them without an API call:

```typescript
// Updated JwtPayload
interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  schoolId?: string;
  permissions?: {
    isSchoolPrincipal?: boolean;
    isHOD?: boolean;
    departmentId?: string;
    isBursar?: boolean;
    isReceptionist?: boolean;
    isCounselor?: boolean;
  };
}
```

---

### 2.2 Middleware: requirePermission

A new middleware factory that checks a specific permission flag on the authenticated user.

```typescript
// src/middleware/permission.ts
export function requirePermission(...flags: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError('Authentication is required');
    if (req.user.role === 'super_admin') return next();

    const permissions = req.user.permissions ?? {};
    const hasPermission = flags.some(flag => permissions[flag] === true);

    if (!hasPermission) {
      throw new ForbiddenError('You do not have the required permission');
    }
    next();
  };
}
```

---

### GET /api/permissions/school/:schoolId

List all users in the school with their permission flags. Used by the admin settings page to show who has what permissions.

**Auth:** `super_admin` or `school_admin`

**Scope:** `school_admin` can only query their own school (`req.user.schoolId` must match `:schoolId`). `super_admin` can query any school.

**Query params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | no | `1` | Page number |
| `limit` | number | no | `20` | Results per page (max 100) |
| `role` | string | no | — | Filter by role (`school_admin`, `teacher`) |
| `flag` | string | no | — | Filter to users who have a specific flag set to `true` (e.g. `isHOD`) |
| `search` | string | no | — | Search by firstName, lastName, or email (case-insensitive regex) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "6650a1b2c3d4e5f678905678",
        "firstName": "Nandi",
        "lastName": "Dlamini",
        "email": "nandi@riverside.edu.za",
        "role": "school_admin",
        "isActive": true,
        "isSchoolPrincipal": true,
        "isHOD": false,
        "departmentId": null,
        "isBursar": false,
        "isReceptionist": false,
        "isCounselor": false
      },
      {
        "_id": "6650a1b2c3d4e5f678905679",
        "firstName": "Thabo",
        "lastName": "Mokoena",
        "email": "thabo@riverside.edu.za",
        "role": "teacher",
        "isActive": true,
        "isSchoolPrincipal": false,
        "isHOD": true,
        "departmentId": {
          "_id": "6650a1b2c3d4e5f678906001",
          "name": "Mathematics"
        },
        "isBursar": false,
        "isReceptionist": false,
        "isCounselor": false
      }
    ],
    "total": 28,
    "page": 1,
    "limit": 20
  },
  "message": "School permissions retrieved successfully"
}
```

**Notes:**
- `departmentId` is populated via `.populate('departmentId', 'name')` when present.
- Only users with `role` of `school_admin` or `teacher` are returned (parents and students cannot have permission flags).
- `isDeleted: false` and `isActive: true` are always applied.

---

### PUT /api/permissions/:userId

Update one or more permission flags on a user. This is the primary endpoint for the admin settings page.

**Auth:** `super_admin` or `school_admin`

**Scope:** `school_admin` can only modify users in their own school. The target user's `schoolId` must match `req.user.schoolId`.

**Request body:**

```json
{
  "isSchoolPrincipal": true,
  "isHOD": false,
  "departmentId": null,
  "isBursar": false,
  "isReceptionist": false,
  "isCounselor": false
}
```

All fields are optional — only supplied fields are updated. Validation rules:
- `isSchoolPrincipal` can only be set on users with role `school_admin`
- `isHOD` can only be set on users with role `teacher`
- `isBursar` can only be set on users with role `school_admin`
- `isReceptionist` can only be set on users with role `school_admin`
- `isCounselor` can only be set on users with role `teacher`
- If `isHOD` is set to `true`, `departmentId` is required
- If `isHOD` is set to `false`, `departmentId` is automatically cleared to `null`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678905679",
    "firstName": "Thabo",
    "lastName": "Mokoena",
    "email": "thabo@riverside.edu.za",
    "role": "teacher",
    "isSchoolPrincipal": false,
    "isHOD": true,
    "departmentId": {
      "_id": "6650a1b2c3d4e5f678906001",
      "name": "Mathematics"
    },
    "isBursar": false,
    "isReceptionist": false,
    "isCounselor": false
  },
  "message": "Permissions updated successfully"
}
```

**Error 400 (role mismatch):**

```json
{
  "success": false,
  "message": "isSchoolPrincipal can only be assigned to school_admin users"
}
```

**Error 400 (missing department):**

```json
{
  "success": false,
  "message": "departmentId is required when isHOD is true"
}
```

**Side effects:**
- An audit log entry is created with `entity: 'Permission'`, `action: 'update'`, and a `changes` array capturing old/new values for each flag that changed.
- The user's active JWT is NOT invalidated — the updated permissions take effect on next login or token refresh. A `forceReauth` flag is set on the response to prompt the frontend to refresh the token.

---

### GET /api/permissions/:userId

Get the permission flags for a single user.

**Auth:** `super_admin` or `school_admin`

**Scope:** Same school restriction as PUT.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678905679",
    "firstName": "Thabo",
    "lastName": "Mokoena",
    "email": "thabo@riverside.edu.za",
    "role": "teacher",
    "isSchoolPrincipal": false,
    "isHOD": true,
    "departmentId": {
      "_id": "6650a1b2c3d4e5f678906001",
      "name": "Mathematics"
    },
    "isBursar": false,
    "isReceptionist": false,
    "isCounselor": false
  },
  "message": "User permissions retrieved successfully"
}
```

---

### GET /api/permissions/audit/:schoolId

Get the audit history for all permission changes in a school. Uses the main AuditLog collection filtered to `entity: 'Permission'`.

**Auth:** `super_admin` or `school_admin`

**Query params:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | no | `1` | Page number |
| `limit` | number | no | `20` | Results per page |
| `userId` | string | no | — | Filter to changes affecting a specific user |
| `startDate` | string | no | — | ISO 8601 datetime |
| `endDate` | string | no | — | ISO 8601 datetime |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "6650a1b2c3d4e5f678901234",
        "userId": {
          "_id": "6650a1b2c3d4e5f678905000",
          "firstName": "Admin",
          "lastName": "User",
          "email": "admin@riverside.edu.za"
        },
        "action": "update",
        "entity": "Permission",
        "entityId": "6650a1b2c3d4e5f678905679",
        "changes": [
          {
            "field": "isHOD",
            "oldValue": false,
            "newValue": true
          },
          {
            "field": "departmentId",
            "oldValue": null,
            "newValue": "6650a1b2c3d4e5f678906001"
          }
        ],
        "createdAt": "2026-04-01T10:30:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20
  },
  "message": "Permission audit logs retrieved successfully"
}
```

---

### GET /api/auth/me (Updated)

The existing `/api/auth/me` endpoint response is extended to include permission flags:

```json
{
  "success": true,
  "data": {
    "_id": "6650a1b2c3d4e5f678905679",
    "firstName": "Thabo",
    "lastName": "Mokoena",
    "email": "thabo@riverside.edu.za",
    "role": "teacher",
    "schoolId": "6650a1b2c3d4e5f678900001",
    "permissions": {
      "isSchoolPrincipal": false,
      "isHOD": true,
      "departmentId": "6650a1b2c3d4e5f678906001",
      "isBursar": false,
      "isReceptionist": false,
      "isCounselor": false
    }
  }
}
```

---

## 3. Frontend Pages

### 3.1 Admin Permission Settings Page

**Route:** `/admin/settings/permissions`
**File:** `src/app/(dashboard)/admin/settings/permissions/page.tsx`

A settings sub-page where school admins manage permission flags for staff members. Accessible from the admin settings area.

**Layout:**
- `PageHeader`: "Staff Permissions" with subtitle "Assign special roles to staff members"
- Filter bar: role dropdown (Admin / Teacher / All), search input, permission flag filter
- `PermissionUserTable`: DataTable listing staff with their current flags
- Click a row to open the `PermissionEditDialog`

**Tabs within the page:**

| Tab | Content |
|---|---|
| Staff Permissions | Main table of users with editable permission flags |
| Audit History | Timeline of all permission changes using `PermissionAuditTable` |

---

### 3.2 Sidebar Integration

No new page — the existing sidebar component is modified to conditionally show additional navigation items based on the user's permission flags from the auth store.

**Conditional nav items (admin portal):**

| Permission Flag | Nav Item | Icon | Route |
|---|---|---|---|
| `isSchoolPrincipal` | Principal Dashboard | `Crown` | `/admin/principal` |
| `isBursar` | Financial Management | `Wallet` | `/admin/bursar` |
| `isReceptionist` | Visitor Management | `DoorOpen` | `/admin/reception` |

**Conditional nav items (teacher portal):**

| Permission Flag | Nav Item | Icon | Route |
|---|---|---|---|
| `isHOD` | HOD Oversight | `Users` | `/teacher/hod` |
| `isCounselor` | Pastoral Care | `Heart` | `/teacher/pastoral` |

---

## 4. User Flows

### 4.1 Admin Assigns Principal Permission

1. School admin navigates to `/admin/settings/permissions`.
2. Frontend calls `GET /api/permissions/school/:schoolId` to load staff list.
3. Admin uses the search field to find the principal's user record.
4. Admin clicks the row — `PermissionEditDialog` opens showing current flags.
5. Admin toggles `isSchoolPrincipal` to ON.
6. Admin clicks "Save" — frontend calls `PUT /api/permissions/:userId` with `{ isSchoolPrincipal: true }`.
7. Backend validates the target user has role `school_admin`, updates the flag, creates an audit log entry.
8. Response includes `forceReauth: true` — frontend shows a toast: "Permissions updated. [User] will see the new features on their next login."
9. The permission table refreshes to show the updated badge.

### 4.2 Admin Assigns HOD Permission with Department

1. Admin opens the permission editor for a teacher.
2. Admin toggles `isHOD` to ON — the `departmentId` dropdown appears (was hidden when `isHOD` was false).
3. Admin selects "Mathematics" from the department dropdown (populated from `GET /api/academic/subjects` filtered to unique departments).
4. Admin clicks "Save" — `PUT /api/permissions/:userId` with `{ isHOD: true, departmentId: "..." }`.
5. Backend validates role is `teacher` and `departmentId` is provided, updates both fields.
6. The teacher will see the "HOD Oversight" nav item on their next login.

### 4.3 Admin Revokes a Permission

1. Admin opens the permission editor for a user who currently has `isBursar: true`.
2. Admin toggles `isBursar` to OFF.
3. Admin clicks "Save" — `PUT /api/permissions/:userId` with `{ isBursar: false }`.
4. Backend updates the flag and logs the change to the audit trail.
5. The user will no longer see the "Financial Management" nav item on their next login.

### 4.4 Admin Reviews Permission Audit History

1. Admin clicks the "Audit History" tab on the permissions page.
2. Frontend calls `GET /api/permissions/audit/:schoolId`.
3. The `PermissionAuditTable` renders a timeline: who changed what permission for whom, with before/after values.
4. Admin can filter by date range or specific user.

### 4.5 Sidebar Renders Conditional Nav Items

1. On app load, `GET /api/auth/me` returns the user with their `permissions` object.
2. The auth store saves `user.permissions`.
3. The sidebar component reads `permissions` from the auth store.
4. For each permission flag that is `true`, the corresponding nav item is added to the sidebar below the standard items, under a "Special Roles" section divider.
5. Clicking a permission-gated nav item navigates to the corresponding page (which also checks the permission on the backend via `requirePermission` middleware).

---

## 5. Data Models

### User Model Extensions (added to existing `userSchema`)

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `isSchoolPrincipal` | Boolean | no | `false` | Only meaningful on `school_admin` users |
| `isHOD` | Boolean | no | `false` | Only meaningful on `teacher` users |
| `departmentId` | ObjectId (ref: `Subject`) | no | `null` | Required when `isHOD` is true; references the academic department |
| `isBursar` | Boolean | no | `false` | Only meaningful on `school_admin` users |
| `isReceptionist` | Boolean | no | `false` | Only meaningful on `school_admin` users |
| `isCounselor` | Boolean | no | `false` | Only meaningful on `teacher` users |

**Indexes:**

| Index | Fields | Purpose |
|---|---|---|
| Compound | `{ schoolId: 1, isHOD: 1 }` | Quickly find HODs in a school |
| Compound | `{ schoolId: 1, isSchoolPrincipal: 1 }` | Quickly find the principal |
| Compound | `{ schoolId: 1, isCounselor: 1 }` | Quickly find counselors in a school |

### Frontend TypeScript Interfaces

```ts
// Permission flags shape (reused in auth store and components)
interface UserPermissions {
  isSchoolPrincipal: boolean;
  isHOD: boolean;
  departmentId: string | null;
  isBursar: boolean;
  isReceptionist: boolean;
  isCounselor: boolean;
}

// User with permissions (as returned by GET /api/permissions/school/:schoolId)
interface PermissionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'school_admin' | 'teacher';
  isActive: boolean;
  isSchoolPrincipal: boolean;
  isHOD: boolean;
  departmentId: { id: string; name: string } | null;
  isBursar: boolean;
  isReceptionist: boolean;
  isCounselor: boolean;
}

// Update payload for PUT /api/permissions/:userId
interface UpdatePermissionsPayload {
  isSchoolPrincipal?: boolean;
  isHOD?: boolean;
  departmentId?: string | null;
  isBursar?: boolean;
  isReceptionist?: boolean;
  isCounselor?: boolean;
}

// Permission audit log entry
interface PermissionAuditEntry {
  id: string;
  userId: { id: string; firstName: string; lastName: string; email: string };
  action: 'update';
  entity: 'Permission';
  entityId: string;
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  createdAt: string;
}

// Paginated response
interface PermissionUsersResponse {
  users: PermissionUser[];
  total: number;
  page: number;
  limit: number;
}
```

---

## 6. State Management

### Auth Store Extension (`useAuthStore`)

The existing `useAuthStore` is extended — not replaced — to include permissions:

```ts
// Added to existing AuthStore interface
interface AuthStore {
  // ... existing fields ...
  user: {
    // ... existing fields ...
    permissions: UserPermissions;
  } | null;

  // Derived helper
  hasPermission: (flag: keyof UserPermissions) => boolean;
}
```

**Key behaviour:**
- `permissions` is populated from the `/api/auth/me` response on session hydration.
- `hasPermission('isHOD')` returns `true` only if `user.permissions.isHOD === true`.
- Sidebar uses `hasPermission` to conditionally render nav items.

### `usePermissions` Hook

**File:** `src/hooks/usePermissions.ts`

```ts
interface UsePermissionsReturn {
  users: PermissionUser[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;

  fetchUsers: (params?: { role?: string; flag?: string; search?: string; page?: number }) => Promise<void>;
  updatePermissions: (userId: string, payload: UpdatePermissionsPayload) => Promise<PermissionUser>;
  fetchAuditLogs: (params?: { userId?: string; startDate?: string; endDate?: string; page?: number }) => Promise<void>;

  auditLogs: PermissionAuditEntry[];
  auditTotal: number;
  auditLoading: boolean;
}
```

**Key behaviours:**
- `fetchUsers` calls `GET /api/permissions/school/:schoolId` with filters.
- `updatePermissions` calls `PUT /api/permissions/:userId`, shows success/error toast, and refreshes the users list.
- `fetchAuditLogs` calls `GET /api/permissions/audit/:schoolId`.
- All API calls use `apiClient` — never imported in components or pages directly.

---

## 7. Components Needed

### New Components

| Component | File | Purpose |
|---|---|---|
| `PermissionUserTable` | `src/components/permissions/PermissionUserTable.tsx` | DataTable showing staff with permission flag badges. Columns: Name, Email, Role, Principal, HOD, Bursar, Receptionist, Counselor (each as a toggle or badge), Actions (edit). |
| `PermissionEditDialog` | `src/components/permissions/PermissionEditDialog.tsx` | Dialog for editing a single user's permission flags. Shows toggles for each flag, conditionally shows department dropdown when `isHOD` is toggled on. Validates role-flag compatibility before submit. |
| `PermissionBadge` | `src/components/permissions/PermissionBadge.tsx` | Small coloured badge for each permission type. Props: `flag: string`, `active: boolean`. Renders a pill like "Principal" (green), "HOD" (blue), "Bursar" (amber), "Receptionist" (purple), "Counselor" (teal). |
| `PermissionAuditTable` | `src/components/permissions/PermissionAuditTable.tsx` | DataTable for permission change history. Columns: Date, Changed By, Target User, Changes (field/old/new), IP Address. |
| `PermissionFilterBar` | `src/components/permissions/PermissionFilterBar.tsx` | Filter strip: role dropdown, permission flag dropdown, search input, clear button. |
| `DepartmentSelector` | `src/components/permissions/DepartmentSelector.tsx` | Select dropdown populated from academic subjects/departments. Used inside `PermissionEditDialog` when `isHOD` is enabled. |

### Shared Components Used

| Component | File | Notes |
|---|---|---|
| `DataTable` | `src/components/shared/DataTable.tsx` | Base table for both user and audit tables |
| `PageHeader` | `src/components/shared/PageHeader.tsx` | Page title + subtitle |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner.tsx` | Loading state |
| `EmptyState` | `src/components/shared/EmptyState.tsx` | Empty state when no users match filters |

### Sidebar Modifications

The sidebar component (`src/components/layout/Sidebar.tsx` or equivalent) needs to be modified:

1. Import `useAuthStore` and read `hasPermission`.
2. After the standard nav items, render a "Special Roles" section divider if any permission flag is active.
3. Conditionally render each permission-gated nav item.

---

## 8. Integration Notes

### JWT Payload Update

The JWT token generation in the auth module must include permission flags:

```typescript
const tokenPayload = {
  id: user._id,
  email: user.email,
  role: user.role,
  schoolId: user.schoolId,
  permissions: {
    isSchoolPrincipal: user.isSchoolPrincipal ?? false,
    isHOD: user.isHOD ?? false,
    departmentId: user.departmentId?.toString() ?? null,
    isBursar: user.isBursar ?? false,
    isReceptionist: user.isReceptionist ?? false,
    isCounselor: user.isCounselor ?? false,
  },
};
```

This means permission changes take effect on next login or token refresh — not immediately. The frontend should display a notice when permissions are updated for a currently active user.

### Module Guard Integration

Permission-gated features are NOT separate bolt-on modules. They do not use `requireModule`. Instead, they use `requirePermission` middleware on their specific routes. For example:

```typescript
// In the principal dashboard routes (scope 36)
router.get('/principal/overview', authenticate, requirePermission('isSchoolPrincipal'), controller.getOverview);

// In the HOD oversight routes (scope 37)
router.get('/hod/department', authenticate, requirePermission('isHOD'), controller.getDepartmentOverview);
```

### Relationship to Existing authorize Middleware

`requirePermission` works alongside (not replacing) the existing `authorize` middleware:

```typescript
// HOD route: must be teacher AND have isHOD flag
router.get('/hod/teachers', authenticate, authorize('teacher'), requirePermission('isHOD'), controller.getTeachers);
```

### Department ID Source

The `departmentId` references a Subject document that represents a department. In the South African school context, departments are typically groupings like Mathematics, Natural Sciences, Languages, Social Sciences, Technology, etc. The frontend fetches distinct department names from `GET /api/academic/subjects` and presents them as a select list.

### Performance Impact

Adding 5 boolean fields and 1 optional ObjectId to the User model has negligible performance impact. The JWT payload increases by approximately 100 bytes. The compound indexes on `schoolId + flag` ensure that permission lookups during page rendering are sub-millisecond.

### Security Considerations

- Permission flags can only be modified through the dedicated `/api/permissions/:userId` endpoint — they cannot be set during user registration or profile update.
- The `requirePermission` middleware always checks the database (not just JWT) for write operations on sensitive data, to prevent stale JWT exploitation.
- `super_admin` bypasses all permission checks (same as existing `authorize` behaviour).

---

## 9. Acceptance Criteria

### Backend — User Model

- [ ] User schema includes `isSchoolPrincipal`, `isHOD`, `departmentId`, `isBursar`, `isReceptionist`, `isCounselor` fields with correct defaults
- [ ] All new fields default to `false` (booleans) or `null` (departmentId)
- [ ] Existing users are unaffected — new fields are `false`/`null` by default
- [ ] `GET /api/auth/me` includes `permissions` object in the response
- [ ] JWT payload includes `permissions` object with all six fields

### Backend — Permission Middleware

- [ ] `requirePermission('isSchoolPrincipal')` allows access when the user's flag is `true`
- [ ] `requirePermission('isSchoolPrincipal')` returns 403 when the user's flag is `false`
- [ ] `requirePermission` always allows `super_admin` regardless of flags
- [ ] `requirePermission` throws 401 if no user is authenticated
- [ ] Multiple flags can be passed: `requirePermission('isSchoolPrincipal', 'isHOD')` allows if ANY flag is true (OR logic)

### Backend — Permission Management Endpoints

- [ ] `GET /api/permissions/school/:schoolId` returns paginated list of staff with permission flags
- [ ] `GET /api/permissions/school/:schoolId` only returns `school_admin` and `teacher` role users
- [ ] `GET /api/permissions/school/:schoolId` as `school_admin` from a different school returns 403
- [ ] `GET /api/permissions/school/:schoolId?role=teacher` filters to teachers only
- [ ] `GET /api/permissions/school/:schoolId?flag=isHOD` filters to users where `isHOD === true`
- [ ] `GET /api/permissions/school/:schoolId?search=thabo` matches firstName, lastName, or email
- [ ] `PUT /api/permissions/:userId` with `{ isSchoolPrincipal: true }` on a teacher returns 400
- [ ] `PUT /api/permissions/:userId` with `{ isHOD: true }` without `departmentId` returns 400
- [ ] `PUT /api/permissions/:userId` with `{ isHOD: true, departmentId: "..." }` on a teacher succeeds
- [ ] `PUT /api/permissions/:userId` with `{ isHOD: false }` automatically clears `departmentId` to `null`
- [ ] `PUT /api/permissions/:userId` creates an audit log entry with `entity: 'Permission'` and field-level changes
- [ ] `GET /api/permissions/:userId` returns the user's permission flags
- [ ] `GET /api/permissions/audit/:schoolId` returns paginated permission change history

### Frontend — Settings Page

- [ ] `/admin/settings/permissions` page loads and displays staff with permission badges
- [ ] Search filters the table by name or email (debounced)
- [ ] Role filter dropdown filters by `school_admin` or `teacher`
- [ ] Permission flag filter shows only users with a specific flag active
- [ ] Clicking a user row opens the `PermissionEditDialog` with current values
- [ ] Toggling a flag and saving calls `PUT /api/permissions/:userId` with the correct payload
- [ ] Setting `isHOD` to true reveals the department selector
- [ ] Setting `isHOD` to false hides and clears the department selector
- [ ] Attempting to set `isSchoolPrincipal` on a teacher shows a validation error in the dialog (not sent to API)
- [ ] Success toast appears after saving, table refreshes
- [ ] Error toast appears if the API returns an error
- [ ] Audit History tab shows permission change timeline with before/after values
- [ ] Loading spinner shown while data is loading
- [ ] Empty state shown when no users match the current filters

### Frontend — Sidebar Integration

- [ ] Admin sidebar shows "Principal Dashboard" link only when `hasPermission('isSchoolPrincipal')` is true
- [ ] Admin sidebar shows "Financial Management" link only when `hasPermission('isBursar')` is true
- [ ] Admin sidebar shows "Visitor Management" link only when `hasPermission('isReceptionist')` is true
- [ ] Teacher sidebar shows "HOD Oversight" link only when `hasPermission('isHOD')` is true
- [ ] Teacher sidebar shows "Pastoral Care" link only when `hasPermission('isCounselor')` is true
- [ ] Permission-gated nav items appear under a "Special Roles" divider
- [ ] No permission-gated nav items appear when all flags are false
- [ ] Sidebar responds immediately to auth store changes (no page reload needed)

### Frontend — Auth Store

- [ ] `user.permissions` is populated from `GET /api/auth/me` on session hydration
- [ ] `hasPermission('isHOD')` returns `true` only when the flag is `true`
- [ ] `hasPermission` returns `false` when `user` is `null`
