# 03b — Staff Module

## 1. Module Overview

The Staff module manages teacher accounts within a school. A "staff member" in Campusly is a `User` document with `role: 'teacher'`; there is no separate Staff collection. The module provides listing (with pagination and search) and creation of teacher accounts. It does not yet expose update or delete endpoints — those would be handled via the Auth/User layer.

**Roles involved:**
- `school_admin`, `super_admin` — full read/write access to staff endpoints
- `teacher` — no direct access to this module; teachers are the subjects of it
- Parents and students — no access

**Key behaviours:**
- Staff are scoped by `schoolId`, taken from the authenticated user's JWT payload (`req.user.schoolId`). An admin can only see and create staff for their own school.
- Newly created teachers are assigned the hardcoded temporary password `Temp1234!`. The teacher must change this on first login. There is currently no password-reset email flow triggered on creation.
- Email uniqueness is enforced globally (across all schools) at the database level. The controller also performs an explicit pre-insert duplicate check and returns `409 Conflict` if the email already exists.
- Soft-deleted users (`isDeleted: true`) are excluded from all queries.
- The `subjects` field can be submitted as either a comma-separated string or a proper JSON array; the backend normalises both forms to `string[]`.
- The list response wraps each `User` document into a `staff` shape that includes denormalised fields (`employeeNumber`, `department`, `subjects`, `qualifications`, `classIds`). These extra fields are read directly from the User document via loose property access (`raw.xxx ?? default`). They are stored on the User model but are not declared in the core `IUser` interface — they are additional fields persisted by the creation logic.

---

## 2. Backend API Endpoints

Base path: `/staff` (mounted at application router level).

All endpoints require a valid JWT supplied as a Bearer token (`authenticate` middleware). The `schoolId` is read from the token — it is never accepted as a request parameter.

---

### GET /staff

List all teacher-role staff members for the authenticated admin's school.

**Roles:** `school_admin`, `super_admin`

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | `number` | No | 1-based page number. Defaults to `1` if omitted. |
| `limit` | `number` | No | Records per page. Sanitised by `paginationHelper`. |
| `search` | `string` | No | Case-insensitive regex search across `firstName`, `lastName`, and `email`. |

**Response — 200 OK:**
```json
{
  "success": true,
  "message": "Staff retrieved successfully",
  "data": {
    "staff": [
      {
        "id": "64b1e2f3a4c5d6e7f8a9b0c1",
        "userId": "64b1e2f3a4c5d6e7f8a9b0c1",
        "user": {
          "id": "64b1e2f3a4c5d6e7f8a9b0c1",
          "firstName": "Jane",
          "lastName": "Doe",
          "email": "jane.doe@greenvalley.edu",
          "phone": "+27821234567",
          "role": "teacher",
          "isActive": true,
          "schoolId": "64b1e2f3a4c5d6e7f8a9b0aa"
        },
        "employeeNumber": "EMP-001",
        "department": "Mathematics",
        "subjects": ["Mathematics", "Applied Maths"],
        "qualifications": ["B.Ed", "PGCE"],
        "hireDate": "2024-01-15T07:00:00.000Z",
        "classIds": []
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20
  }
}
```

**Notes:**
- `hireDate` maps to `User.createdAt` (the account creation timestamp).
- `classIds` is always an empty array `[]` in the current implementation — it is a placeholder for future Academic module integration.
- `employeeNumber`, `qualifications` fall back to `''` and `[]` respectively when not set on the User document.

**Error responses:**

| Status | Condition |
|---|---|
| `400 Bad Request` | `schoolId` missing from JWT (`{ "success": false, "error": "School ID is required" }`) |

**Example request:**
```
GET /staff?page=1&limit=20&search=jane
Authorization: Bearer <jwt>
```

---

### POST /staff

Create a new teacher account.

**Roles:** `school_admin`, `super_admin`

**Request body (JSON):**

| Field | Type | Required | Validation |
|---|---|---|---|
| `firstName` | `string` | Yes | Non-empty |
| `lastName` | `string` | Yes | Non-empty |
| `email` | `string` | Yes | Non-empty; lowercased and trimmed before save |
| `phone` | `string` | No | Stored as-is if provided |
| `department` | `string` | No | Free text |
| `subjects` | `string` \| `string[]` | No | Comma-separated string or JSON array; normalised to `string[]` |

**Derived / server-set fields (not accepted from client):**

| Field | Value |
|---|---|
| `role` | Always set to `'teacher'` |
| `schoolId` | Taken from `req.user.schoolId` (JWT) |
| `password` | Hardcoded `Temp1234!` — hashed via bcrypt (12 rounds) on save |

**Validation rules applied by controller:**
1. `firstName`, `lastName`, and `email` must all be present (truthy); returns `400` otherwise.
2. Email uniqueness check across all non-deleted users; returns `409` if duplicate found.

**Example request:**
```json
POST /staff
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "firstName": "James",
  "lastName": "Mokoena",
  "email": "j.mokoena@greenvalley.edu",
  "phone": "+27831234567",
  "department": "Science",
  "subjects": "Physics, Chemistry"
}
```

Subjects can alternatively be sent as an array:
```json
"subjects": ["Physics", "Chemistry"]
```

**Response — 201 Created:**

Returns the full User document with `password` and `refreshTokens` fields removed:
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "data": {
    "_id": "64c0000000000000000000b1",
    "firstName": "James",
    "lastName": "Mokoena",
    "email": "j.mokoena@greenvalley.edu",
    "phone": "+27831234567",
    "role": "teacher",
    "schoolId": "64b1e2f3a4c5d6e7f8a9b0aa",
    "department": "Science",
    "subjects": ["Physics", "Chemistry"],
    "isActive": true,
    "isDeleted": false,
    "refreshTokens": null,
    "createdAt": "2026-03-31T09:00:00.000Z",
    "updatedAt": "2026-03-31T09:00:00.000Z"
  }
}
```

**Note:** The creation response returns the raw User document shape (with `_id`), not the denormalised `staff` shape returned by the list endpoint.

**Error responses:**

| Status | Condition | Body |
|---|---|---|
| `400 Bad Request` | `schoolId` missing from JWT | `{ "success": false, "error": "School ID is required" }` |
| `400 Bad Request` | `firstName`, `lastName`, or `email` missing | `{ "success": false, "error": "firstName, lastName and email are required" }` |
| `409 Conflict` | Email already exists (non-deleted user) | `{ "success": false, "error": "A user with this email already exists" }` |

---

## 3. Frontend Pages

### `/admin/staff` — Staff Management

**File:** `src/app/(dashboard)/admin/staff/page.tsx`

**Access:** Admin dashboard only. Protected by dashboard layout authentication.

**Layout:**
- `PageHeader` with title "Staff" and description "Manage teachers and staff members".
- "Add Staff" button (with `Plus` icon) in the header region, which opens a Dialog.
- `DataTable` below the header rendering the staff list with a search bar (searches on the `name` virtual column).

**Table columns:**

| Column | Source | Notes |
|---|---|---|
| Employee No | `employeeNumber` | Plain text |
| Name | `${row.user.firstName} ${row.user.lastName}` | Virtual — used as `searchKey` |
| Department | `department` | Plain text |
| Subjects | `subjects[]` | Each subject rendered as a `Badge` (secondary variant) |
| Status | `user.isActive` | Green `Badge` ("Active") or red `Badge` ("Inactive") |

**Add Staff Dialog:**
- Triggered by the "Add Staff" `DialogTrigger` button in the header.
- Form managed by `react-hook-form` with `zodResolver(staffSchema)`.
- Fields: First Name, Last Name, Email, Phone, Department, Subjects (comma-separated string input).
- On successful submit: shows `toast.success`, re-fetches the staff list, resets the form, closes the dialog.
- On error: shows `toast.error('Failed to add staff member')`.
- Submit button shows "Adding..." while `isSubmitting`.

**Data fetching:**
- On mount, `GET /staff` is called via `apiClient`. The response is unwrapped as `response.data.data.staff` (with fallback handling for flat array responses).
- After a successful create, the same fetch is repeated to refresh the list (no optimistic update).
- Fetch errors are silently logged to `console.error` only — no error state is surfaced to the user.

---

## 4. User Flows

### 4.1 List Staff

1. Admin navigates to `/admin/staff`.
2. Page mounts and fires `GET /staff` via `apiClient`.
3. Response is parsed: `response.data.data.staff` array (or fallback to `response.data.data` if flat array).
4. `staffList` state is updated, `DataTable` renders rows.
5. Admin can type in the search input to filter rows client-side by the `name` virtual column.

### 4.2 Create a Staff Member (Teacher)

1. Admin clicks "Add Staff" in the page header.
2. `Dialog` opens with the staff creation form.
3. Admin fills in: First Name, Last Name, Email, Phone (optional), Department (optional), Subjects (optional, comma-separated).
4. `react-hook-form` validates on submit using `staffSchema`:
   - `firstName`: min 2 chars
   - `lastName`: min 2 chars
   - `email`: valid email format
   - `phone`: min 10 digits
   - `department`: min 1 char
   - `subjects`: min 1 char
5. On valid submit, `POST /staff` is called with the form data.
6. Backend creates a `User` document with `role: 'teacher'`, `schoolId` from JWT, and temporary password `Temp1234!`.
7. Success: `toast.success` fires, staff list refreshes, form resets, dialog closes.
8. Error: `toast.error` fires; dialog remains open (form is reset regardless due to `reset()` in `finally`-equivalent block).

### 4.3 View Staff Status

1. The Status column in the table reflects `user.isActive`.
2. Active staff show a green "Active" badge; inactive staff show a red "Inactive" badge.
3. There is no UI to toggle active/inactive status at present — this must be done via the API layer directly or through a future update endpoint.

---

## 5. Data Models

### User (MongoDB — `users` collection)

Staff members are `User` documents with `role: 'teacher'`. The core schema (`IUser` interface):

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | `ObjectId` | Auto | MongoDB document ID |
| `email` | `string` | Yes | Unique, lowercase, trimmed; indexed |
| `password` | `string` | Yes | bcrypt-hashed (12 rounds); never returned in API responses |
| `firstName` | `string` | Yes | Trimmed |
| `lastName` | `string` | Yes | Trimmed |
| `role` | `UserRole` | Yes | For staff: always `'teacher'` |
| `schoolId` | `ObjectId` | No | Ref: `School`. Present on all tenant users |
| `profileImage` | `string` | No | URL |
| `phone` | `string` | No | Trimmed |
| `isActive` | `boolean` | Yes | Default `true` |
| `isDeleted` | `boolean` | Yes | Default `false`; soft-delete flag |
| `refreshTokens` | `string[]` | Yes | Default `[]`; JWT refresh token store |
| `lastLoginAt` | `Date` | No | Set on successful login |
| `passwordResetToken` | `string` | No | Hashed reset token |
| `passwordResetExpires` | `Date` | No | Reset token expiry |
| `createdAt` | `Date` | Auto | Mongoose timestamp |
| `updatedAt` | `Date` | Auto | Mongoose timestamp |

**Extra fields stored on User for teachers (not in IUser interface):**

| Field | Type | Notes |
|---|---|---|
| `department` | `string` | Teacher's department (e.g. "Mathematics") |
| `subjects` | `string[]` | Subjects taught; stored as array after normalisation |
| `employeeNumber` | `string` | Optional employee identifier |
| `qualifications` | `string[]` | Academic or professional qualifications |

These fields are written at creation time and read back via loose property access in the list controller (`(u as unknown as Record<string, unknown>).xxx`).

**Database indexes on User:**

| Index | Fields |
|---|---|
| Unique | `{ email: 1 }` |
| Compound | `{ schoolId: 1, role: 1 }` |
| Compound | `{ email: 1, isDeleted: 1 }` |

**UserRole enum (backend):**

| Value | Constant |
|---|---|
| `'super_admin'` | `UserRole.SUPER_ADMIN` |
| `'school_admin'` | `UserRole.SCHOOL_ADMIN` |
| `'teacher'` | `UserRole.TEACHER` |
| `'parent'` | `UserRole.PARENT` |
| `'student'` | `UserRole.STUDENT` |

### Frontend TypeScript Interfaces

**`Teacher` (from `src/types/index.ts`):**
```ts
interface Teacher {
  id: string;
  userId: string;
  user: User;
  employeeNumber: string;
  department?: string;
  subjects: string[];
  qualifications: string[];
  hireDate: string;
  classIds: string[];
}
```

**`User` (from `src/types/index.ts`):**
```ts
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;         // 'admin' | 'teacher' | 'parent' | 'student' | 'tuckshop' | 'super_admin'
  avatar?: string;
  phone?: string;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
}
```

**`StaffFormData` (from `src/lib/validations.ts`):**
```ts
// Inferred from staffSchema (zod):
{
  firstName: string;   // min 2 chars
  lastName: string;    // min 2 chars
  email: string;       // valid email
  phone: string;       // min 10 digits
  department: string;  // min 1 char
  subjects: string;    // comma-separated string, min 1 char
}
```

---

## 6. State Management

The Staff module uses **local component state** only — there is no global store (Redux, Zustand, Context, etc.) for staff data.

| State | Type | Location | Description |
|---|---|---|---|
| `staffList` | `Teacher[]` | `StaffPage` component | The fetched list of staff members, initialised to `[]` |
| `dialogOpen` | `boolean` | `StaffPage` component | Controls the Add Staff Dialog open/close state |

**Form state** is managed entirely by `react-hook-form`:
| State | Description |
|---|---|
| `errors` | Zod-validated field errors from `staffSchema` |
| `isSubmitting` | `true` while the POST request is in flight; used to disable the submit button |

**Data flow:**
1. `useEffect` on mount → `GET /staff` → `setStaffList(arr)`.
2. Successful create → `GET /staff` re-fetch → `setStaffList(arr)` again (full list refresh, no optimistic update).
3. No caching layer; navigating away and back re-fetches from the server.

**Gaps / future work:**
- No loading state is tracked; the table renders empty until the fetch resolves.
- No error state is surfaced to the user when the initial `GET /staff` fails.
- Staff data is not shared with other pages (e.g. teacher selectors in Classes or Homework) — each page independently fetches what it needs.

---

## 7. Components Needed

### Existing components used on the Staff page

| Component | Path | Purpose |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader.tsx` | Title, description, and slot for action buttons |
| `DataTable` | `src/components/shared/DataTable.tsx` | Generic paginated/searchable table; accepts `columns: ColumnDef<T>[]` and `data: T[]` |
| `Dialog` / `DialogContent` / `DialogTrigger` / `DialogHeader` / `DialogTitle` / `DialogDescription` / `DialogFooter` | `src/components/ui/dialog.tsx` | Modal dialog for the Add Staff form |
| `Button` | `src/components/ui/button.tsx` | Add Staff trigger, Cancel, Submit |
| `Badge` | `src/components/ui/badge.tsx` | Subjects list chips; Active/Inactive status indicator |
| `Input` | `src/components/ui/input.tsx` | All form fields |
| `Label` | `src/components/ui/label.tsx` | Form field labels |

### Components to build for future Staff enhancements

| Component | Description |
|---|---|
| `StaffTable` | Dedicated table component for staff, extracted from the page for reuse and testability. Should include empty state and loading skeleton. |
| `StaffForm` | Extracted form component (currently inline in the Dialog). Should support both create and edit modes. |
| `StaffDetailSheet` | Slide-over or modal showing full staff profile: qualifications, classes assigned, subjects, contact details. |
| `StaffStatusToggle` | Control to activate / deactivate a staff member (requires a `PATCH /staff/:id` endpoint). |
| `StaffLoadingSkeleton` | Skeleton rows for the table while initial data is loading. |
| `SubjectBadgeList` | Reusable component rendering a `subjects: string[]` as a row of `Badge` components (currently inline on the Staff page, also needed in Classes and Homework). |

---

## 8. Integration Notes

### Academic Module (Classes & Subjects)

- Teachers are assigned to classes via the Academic module. The `Teacher.classIds` field is intended to hold the `SchoolClass._id` values the teacher is responsible for, but in the current implementation this array is always returned as `[]` from the list endpoint — it is a placeholder.
- The `SchoolClass` and `Subject` interfaces in `src/types/index.ts` both carry a `teacherId: string` and `teacher: Teacher` reference, meaning every class and subject is linked back to a teacher.
- When building a class or subject selector in the Academic module, `GET /staff` is the correct source for the teacher dropdown.

### Attendance Module

- The Attendance module is teacher-operated: teachers mark attendance for their own classes.
- The `teacherId` on attendance records should match `req.user.id` (the authenticated teacher's User `_id`).
- No direct API call from Staff to Attendance exists; the link is through the shared `User._id`.

### Homework Module

- `Homework` documents store a `teacherId` field. When a teacher creates homework, `req.user.id` is used.
- The homework list and grading views may need to fetch staff details (teacher name) for display — currently served via the embedded `teacher: Teacher` shape on Homework responses.
- The `SubjectId` on Homework refers to a Subject document, which itself has a `teacherId` — this means staff changes (e.g. re-assigning a subject) have knock-on effects on homework attribution.

### Auth Module

- Staff accounts are `User` documents. All authentication (login, token refresh, password reset) is handled by the Auth module — the Staff module only handles listing and creation.
- On teacher creation, the controller sets `password: 'Temp1234!'`. There is currently no triggered email or notification to the new teacher. A future improvement is to trigger an onboarding email via the Notification module.
- Deactivating a teacher (`isActive: false`) should be an Auth/User concern; no endpoint for this exists in the Staff module at present.

### Fees / Wallet Modules

- No direct integration. Staff members do not have financial records in the current data model.

### AI Teacher Tools (Paper Creator / Grading Hub)

- The AI teacher tools pages are accessed by teachers. They depend on the teacher being authenticated with `role: 'teacher'`. The teacher's `schoolId` (from the JWT) scopes AI-generated content to their school.

---

## 9. Acceptance Criteria

### API — GET /staff

- [ ] Returns `200` with a `{ success: true, data: { staff, total, page, limit } }` envelope.
- [ ] Returns only users where `role === 'teacher'` and `isDeleted !== true` and `schoolId` matches the authenticated admin's school.
- [ ] Pagination works: `?page=2&limit=5` skips the first 5 records and returns at most 5.
- [ ] Search works: `?search=jane` returns only staff whose `firstName`, `lastName`, or `email` matches the term (case-insensitive).
- [ ] Returns `400` when `schoolId` is absent from the JWT.
- [ ] Does not return `password` or `refreshTokens` fields in any response item.

### API — POST /staff

- [ ] Returns `201` with the created user object (no `password` or `refreshTokens` fields).
- [ ] Sets `role: 'teacher'` and `schoolId` from the JWT regardless of request body content.
- [ ] Accepts `subjects` as a comma-separated string and stores it as a `string[]`.
- [ ] Accepts `subjects` as a JSON array and stores it as-is.
- [ ] Returns `400` when any of `firstName`, `lastName`, or `email` is missing.
- [ ] Returns `409` when the email already belongs to an existing (non-deleted) user.
- [ ] Newly created teacher can log in with `Temp1234!` as the password.
- [ ] `phone`, `department`, and `subjects` are all optional — request succeeds without them.

### Frontend — Staff Page

- [ ] Staff table loads on page mount and displays all teachers for the school.
- [ ] Each row shows: Employee No, full Name, Department, Subjects (as badges), Status (Active/Inactive badge).
- [ ] Search input filters the table by name.
- [ ] Clicking "Add Staff" opens the modal form.
- [ ] Submitting the form with valid data creates the staff member, shows a success toast, refreshes the table, and closes the modal.
- [ ] Validation errors are shown inline beneath the relevant fields (not as a toast).
- [ ] Submitting with an already-used email shows `toast.error('Failed to add staff member')`.
- [ ] The submit button is disabled and shows "Adding..." while the request is in flight.
- [ ] Cancelling the modal closes it without submitting.
- [ ] A teacher with `isActive: false` shows a red "Inactive" badge in the Status column.
