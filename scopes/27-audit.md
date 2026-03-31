# 27 — Audit Module

## 1. Module Overview

The Audit module is the platform-wide tamper-evident activity log for Campusly. It captures every create, update, delete, login, and export action performed by any authenticated user and stores it as an immutable audit trail scoped to a school tenant.

Core responsibilities:

- **Automatic logging**: An `auditMiddleware(entity)` Express middleware intercepts every `POST`, `PUT`, `PATCH`, and `DELETE` response and writes an `AuditLog` document after the response is sent. No module controller needs to call the audit service directly — the middleware handles it.
- **Paginated log retrieval**: Admins can query the log with filters for user, entity type, action verb, and date range.
- **Bulk export**: A dedicated export endpoint returns an unpaginated, filtered list of log records for CSV generation or compliance download on the frontend.
- **Tenant isolation**: Every log record carries a `schoolId`. `school_admin` queries are automatically scoped to their own school via `req.user.schoolId`; `super_admin` queries can pass an explicit `schoolId` to inspect any tenant.

Access is restricted to `super_admin` and `school_admin` roles only — no teacher, parent, or student can query audit logs.

There are no audit-specific pages in the current frontend codebase. The admin portal has no `/admin/audit` route and the superadmin portal has no `/superadmin/audit` route. Both pages must be built from scratch.

---

## 2. Backend API Endpoints

All endpoints are mounted at `/api/audit`. Bearer token authentication is required on every route via the `authenticate` middleware.

---

### GET /api/audit/logs

Retrieve a paginated, filtered list of audit log entries.

**Auth**: `super_admin` or `school_admin`

**Scope**: For `school_admin`, `schoolId` is always resolved from `req.user.schoolId` (the query param value is ignored unless the caller is `super_admin`). For `super_admin`, the `schoolId` query param overrides the user's own `schoolId` so platform-level cross-tenant inspection is possible.

**Query parameters**:

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number (positive integer) | no | `1` | Page number |
| `limit` | number (positive integer) | no | `20` | Results per page (max `100`) |
| `userId` | string (24-char hex MongoDB ObjectId) | no | — | Filter to a specific actor |
| `entity` | string | no | — | Filter by entity type name (e.g. `"Student"`, `"Fee"`, `"User"`) |
| `action` | `"create" \| "update" \| "delete" \| "login" \| "export"` | no | — | Filter by action verb |
| `startDate` | ISO 8601 datetime with offset | no | — | Include logs at or after this timestamp (`createdAt >= startDate`) |
| `endDate` | ISO 8601 datetime with offset | no | — | Include logs at or before this timestamp (`createdAt <= endDate`) |
| `schoolId` | string (24-char hex MongoDB ObjectId) | no | from JWT | `super_admin` only: inspect a specific tenant |

**Response format**:

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "6650a1b2c3d4e5f678901234",
        "userId": {
          "_id": "6650a1b2c3d4e5f678905678",
          "firstName": "Nandi",
          "lastName": "Dlamini",
          "email": "nandi@riverside.edu.za"
        },
        "schoolId": "6650a1b2c3d4e5f678900001",
        "action": "update",
        "entity": "Student",
        "entityId": "6650a1b2c3d4e5f678909999",
        "changes": [
          {
            "field": "grade",
            "oldValue": "Grade 4",
            "newValue": "Grade 5"
          }
        ],
        "ipAddress": "41.13.200.100",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "isDeleted": false,
        "createdAt": "2026-03-31T09:14:22.000Z",
        "updatedAt": "2026-03-31T09:14:22.000Z"
      }
    ],
    "total": 348,
    "page": 1,
    "limit": 20
  }
}
```

**Notes**:
- `userId` is populated via Mongoose `.populate('userId', 'firstName lastName email')` — the response object replaces the raw ObjectId with the embedded user sub-document.
- `changes` is an array and may be empty (`[]`) for events logged by the automatic middleware (which does not capture field-level diff; field-level changes are only present when `AuditService.logAction` is called directly with a `changes` array).
- Results are sorted by `createdAt` descending (newest first).
- `isDeleted: false` is always applied — soft-deleted log records are never returned.
- Pagination defaults: page `1`, limit `20`, max limit `100` (enforced by `paginationHelper`).

**Example request**:

```
GET /api/audit/logs?page=1&limit=20&action=delete&startDate=2026-03-01T00:00:00+02:00&endDate=2026-03-31T23:59:59+02:00
Authorization: Bearer <token>
```

---

### GET /api/audit/logs/export

Return an unpaginated, filtered list of all matching audit log entries for export purposes. No pagination is applied — all matching records are returned in a single response.

**Auth**: `super_admin` or `school_admin`

**Scope**: Same `schoolId` resolution logic as `GET /api/audit/logs`.

**Query parameters**:

| Param | Type | Required | Description |
|---|---|---|---|
| `userId` | string (24-char hex MongoDB ObjectId) | no | Filter to a specific actor |
| `entity` | string | no | Filter by entity type name |
| `action` | `"create" \| "update" \| "delete" \| "login" \| "export"` | no | Filter by action verb |
| `startDate` | ISO 8601 datetime with offset | no | Include logs at or after this timestamp |
| `endDate` | ISO 8601 datetime with offset | no | Include logs at or before this timestamp |
| `schoolId` | string (24-char hex MongoDB ObjectId) | no | `super_admin` only: inspect a specific tenant |

Note: `page` and `limit` are accepted by the schema but are not used in the export service method — the export always returns all matching records.

**Response format**:

```json
{
  "success": true,
  "message": "Audit logs exported successfully",
  "data": [
    {
      "_id": "6650a1b2c3d4e5f678901234",
      "userId": {
        "_id": "6650a1b2c3d4e5f678905678",
        "firstName": "Nandi",
        "lastName": "Dlamini",
        "email": "nandi@riverside.edu.za"
      },
      "schoolId": "6650a1b2c3d4e5f678900001",
      "action": "delete",
      "entity": "Student",
      "entityId": "6650a1b2c3d4e5f678909999",
      "changes": [],
      "ipAddress": "41.13.200.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "isDeleted": false,
      "createdAt": "2026-03-15T14:02:11.000Z",
      "updatedAt": "2026-03-15T14:02:11.000Z"
    }
  ]
}
```

**Notes**:
- The `data` field is a flat array (not wrapped in `{ logs, total, page, limit }`).
- `userId` is populated identically to the paginated endpoint.
- Sorted by `createdAt` descending.
- No upper bound on result count — use date range filters in production to avoid very large payloads.

**Example request**:

```
GET /api/audit/logs/export?action=delete&startDate=2026-03-01T00:00:00+02:00&endDate=2026-03-31T23:59:59+02:00
Authorization: Bearer <token>
```

---

## 3. Frontend Pages

No audit pages exist in the current codebase. Both pages below must be created from scratch.

---

### `/admin/audit` — Admin Audit Log Viewer

**File to create**: `src/app/(dashboard)/admin/audit/page.tsx`

**Audience**: `school_admin`

**Description**: A full-page audit log viewer scoped to the current school. The admin can browse all activity performed by any user within the school, filter by date range, user, entity type, and action, and export filtered results to CSV.

**Layout**:
- Page header: "Audit Log" with a subtitle explaining the 90-day retention window (or whatever applies)
- Filter bar (see components section)
- Paginated `AuditTable` showing log entries
- "Export" button that calls `GET /api/audit/logs/export` with the active filters and downloads the result as a CSV

**API calls**:
- `GET /api/audit/logs` — load logs on mount and on filter/page change
- `GET /api/audit/logs/export` — triggered by "Export CSV" button

---

### `/superadmin/audit` — Super Admin Audit Log Viewer

**File to create**: `src/app/(dashboard)/superadmin/audit/page.tsx`

**Audience**: `super_admin`

**Description**: Platform-wide audit log viewer. Identical functionality to the admin viewer but adds a `schoolId` filter dropdown so the super admin can inspect any tenant's activity, or view all tenants at once (by omitting the `schoolId` filter).

**Additional controls** (beyond the admin page):
- School selector dropdown — populates from the schools list; sets `schoolId` query param

**API calls**:
- `GET /api/audit/logs` — with optional `schoolId` param
- `GET /api/audit/logs/export` — with optional `schoolId` param

---

## 4. User Flows

### Flow 1: Admin browses the audit log

1. Admin navigates to `/admin/audit`.
2. Frontend calls `GET /api/audit/logs?page=1&limit=20` (school scoped automatically via JWT).
3. `AuditTable` renders with the 20 most recent log entries, newest first.
4. Admin reads the table: timestamp, actor name, action badge, entity type, entity ID, IP address.
5. Admin clicks to page 2 — frontend calls `GET /api/audit/logs?page=2&limit=20`.

### Flow 2: Admin filters by date range and action

1. Admin is on `/admin/audit`.
2. Admin opens the date range picker and selects 1 March 2026 — 31 March 2026.
3. Admin selects "delete" from the action dropdown.
4. Filter bar calls `GET /api/audit/logs?page=1&limit=20&action=delete&startDate=2026-03-01T00:00:00%2B02:00&endDate=2026-03-31T23:59:59%2B02:00`.
5. Table re-renders showing only delete events in March.
6. Pagination reflects the filtered total.

### Flow 3: Admin filters by specific user

1. Admin types a staff member's name in the user search field.
2. Frontend resolves the name to a userId (via a staff lookup or inline user selector component) and sets `userId` in the filter.
3. Frontend calls `GET /api/audit/logs?userId=<id>&page=1&limit=20`.
4. Table shows only actions performed by that user.

### Flow 4: Admin exports filtered logs to CSV

1. Admin applies desired filters (date range, action, etc.).
2. Admin clicks "Export CSV".
3. Frontend calls `GET /api/audit/logs/export` with the same active filter params.
4. Backend returns the full untruncated array (no pagination).
5. Frontend maps the response array to CSV rows and triggers a browser download.
6. CSV columns: `Date`, `User`, `Email`, `Action`, `Entity`, `Entity ID`, `IP Address`, `Changes`.

### Flow 5: Super admin inspects a specific school's audit trail

1. Super admin navigates to `/superadmin/audit`.
2. By default, `schoolId` filter is empty — query returns logs across all tenants (or the super admin's own context, depending on backend behaviour when `schoolId` is absent).
3. Super admin selects "Riverside Academy" from the school selector dropdown.
4. Frontend calls `GET /api/audit/logs?schoolId=<id>&page=1&limit=20`.
5. Table renders only Riverside Academy's log entries.
6. Super admin notices a bulk delete event and can trace it to the specific actor and timestamp.

### Flow 6: Admin views field-level changes on an update event

1. Admin finds an "update" row in the audit table.
2. Admin clicks the row or an expand chevron.
3. A `ChangesDrawer` or inline expansion shows the `changes` array: field name, old value, new value.
4. This is only populated when the changes were logged by a direct call to `AuditService.logAction` with a `changes` payload; middleware-generated records will show an empty changes list.

---

## 5. Data Models

### AuditLog (Mongoose Schema)

Collection name: `auditlogs`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `userId` | ObjectId (ref: `User`) | yes | — | The user who performed the action |
| `schoolId` | ObjectId (ref: `School`) | no | — | The school context; absent for super admin platform-level actions |
| `action` | String enum | yes | — | `'create' \| 'update' \| 'delete' \| 'login' \| 'export'` |
| `entity` | String | yes | — | The name of the affected resource type (e.g. `"Student"`, `"Fee"`, `"User"`). Trimmed. |
| `entityId` | String | no | — | The MongoDB ObjectId string of the affected document. Sourced from `req.params.id` by the middleware. |
| `changes` | [AuditChange] | no | `[]` | Field-level diff array. Populated only when calling `AuditService.logAction` directly; empty for middleware-generated records. |
| `changes[].field` | String | yes (per item) | — | Name of the changed field |
| `changes[]._id` | — | — | — | `_id: false` — sub-document has no `_id` |
| `changes[].oldValue` | Mixed | no | — | Previous value (any type) |
| `changes[].newValue` | Mixed | no | — | Updated value (any type) |
| `ipAddress` | String | no | — | Sourced from `req.ip` |
| `userAgent` | String | no | — | Sourced from `req.headers['user-agent']` |
| `isDeleted` | Boolean | no | `false` | Soft-delete flag; currently no endpoint sets this — present for future TTL/archival use |
| `createdAt` | Date | — | auto | Mongoose timestamps |
| `updatedAt` | Date | — | auto | Mongoose timestamps |

**Indexes**:

| Index | Fields | Purpose |
|---|---|---|
| Compound | `{ schoolId: 1, createdAt: -1 }` | Primary query pattern: tenant-scoped time-ordered list |
| Compound | `{ userId: 1, createdAt: -1 }` | Filter by actor |
| Compound | `{ entity: 1, entityId: 1 }` | Look up all changes to a specific document |

### Frontend TypeScript Interface

```ts
// AuditChange sub-type
interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// Populated userId sub-document (as returned by the API)
interface AuditLogUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Full AuditLog as returned by GET /api/audit/logs and GET /api/audit/logs/export
interface AuditLog {
  _id: string;
  userId: AuditLogUser;  // populated
  schoolId?: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'export';
  entity: string;
  entityId?: string;
  changes: AuditChange[];
  ipAddress?: string;
  userAgent?: string;
  isDeleted: boolean;
  createdAt: string;  // ISO 8601
  updatedAt: string;
}

// Paginated response (GET /api/audit/logs)
interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

// Filter shape used by the UI and sent as query params
interface AuditFilterParams {
  page?: number;
  limit?: number;
  userId?: string;
  entity?: string;
  action?: 'create' | 'update' | 'delete' | 'login' | 'export';
  startDate?: string;  // ISO 8601 with offset
  endDate?: string;    // ISO 8601 with offset
  schoolId?: string;   // super_admin only
}
```

---

## 6. State Management

### `useAuditStore` (Zustand)

**File to create**: `src/store/useAuditStore.ts`

**State shape**:

```ts
interface AuditStore {
  // Log list
  logs: AuditLog[];
  total: number;
  loading: boolean;
  error: string | null;

  // Active filters
  filters: AuditFilterParams;

  // Export state
  exporting: boolean;
  exportError: string | null;

  // Actions
  fetchLogs: () => Promise<void>;
  setFilter: (patch: Partial<AuditFilterParams>) => void;
  resetFilters: () => void;
  exportLogs: () => Promise<AuditLog[]>;
}
```

**Key behaviours**:

- `filters` holds the current filter state. `setFilter` merges a partial patch and resets `filters.page` to `1` whenever any non-page filter changes (to avoid stale pagination on a new filter set).
- `fetchLogs` reads from `filters` and calls `GET /api/audit/logs` with all active filter params. It sets `loading` and clears `error` before the call.
- `resetFilters` restores `filters` to `{ page: 1, limit: 20 }`.
- `exportLogs` calls `GET /api/audit/logs/export` with the active non-pagination filters (omits `page` and `limit`), sets `exporting` during the call, and returns the raw array for the CSV builder.
- The store should be mounted fresh on each page load (no persistence to `localStorage`) since audit data is sensitive and should always reflect server state.

**Derived selectors** (can be computed in component, not stored):

```ts
const totalPages = Math.ceil(total / (filters.limit ?? 20));
const hasActiveFilters = !!(filters.userId || filters.entity || filters.action || filters.startDate || filters.endDate);
```

---

## 7. Components Needed

### New components

| Component | File | Purpose |
|---|---|---|
| `AuditTable` | `src/components/audit/AuditTable.tsx` | Main data table for log entries. Columns: Timestamp, User (name + email), Action (badge), Entity, Entity ID, IP Address, Changes (expand). Sortable by `createdAt`. |
| `AuditFilterBar` | `src/components/audit/AuditFilterBar.tsx` | Horizontal filter strip. Contains: date range picker (`startDate`/`endDate`), action enum dropdown, entity text input, user selector. "Clear filters" link when any filter is active. |
| `AuditActionBadge` | `src/components/audit/AuditActionBadge.tsx` | Colour-coded badge for the five action values: `create` (green), `update` (blue), `delete` (red), `login` (purple), `export` (amber). |
| `AuditChangesExpander` | `src/components/audit/AuditChangesExpander.tsx` | Inline expandable row or side drawer. Renders the `changes` array as a two-column diff table (field / old value / new value). Shows "No field-level changes recorded" when the array is empty. |
| `AuditExportButton` | `src/components/audit/AuditExportButton.tsx` | Button that calls `exportLogs()` from the store, maps the response to CSV, and triggers a browser file download. Shows a loading spinner during export. Accepts an optional `filename` prop that defaults to `audit-log-<YYYY-MM-DD>.csv`. |
| `AuditSchoolSelector` | `src/components/audit/AuditSchoolSelector.tsx` | Super admin only. Combobox/dropdown populated from the schools list. Sets `filters.schoolId` in the store. Renders nothing in the admin portal. |
| `AuditUserSelector` | `src/components/audit/AuditUserSelector.tsx` | Searchable combobox that resolves a typed name to a userId. Can use the staff/users API to fetch a list of school users for the dropdown. Sets `filters.userId`. |

### Shared components used by this module

| Component | File | Notes |
|---|---|---|
| `DataTable` | `src/components/shared/DataTable.tsx` | Base table; `AuditTable` wraps this with audit-specific column definitions |
| `PageHeader` | `src/components/shared/PageHeader.tsx` | Page title + subtitle |
| `DateRangePicker` | `src/components/ui/` (or third-party) | Used inside `AuditFilterBar` for `startDate`/`endDate` |
| `Pagination` | `src/components/shared/` | Page navigation below the table |

---

## 8. Integration Notes

### How audit logging works across all modules

The `auditMiddleware(entity: string)` function in `src/middleware/audit.ts` is designed to be applied to any module router. When applied, it intercepts every mutating HTTP response (`POST`, `PUT`, `PATCH`, `DELETE`) and fires `AuditService.logAction` asynchronously (after the response is sent, so the client is not blocked).

The middleware:
1. Maps HTTP method to action verb: `POST` → `'create'`, `PUT`/`PATCH` → `'update'`, `DELETE` → `'delete'`.
2. Reads `req.user.id` and `req.user.schoolId` from the authenticated request.
3. Reads `req.params.id` as the `entityId`.
4. Reads `req.ip` and `req.headers['user-agent']` for diagnostics.
5. Does not capture field-level `changes` — that requires an explicit `AuditService.logAction` call inside the service method (not yet done in any module).

As of the current backend codebase, `auditMiddleware` is defined but not yet wired into any module router. When wiring begins, apply it per-router like this:

```ts
import { auditMiddleware } from '../../middleware/index.js';

router.post('/', authenticate, authorize('school_admin'), auditMiddleware('Student'), StudentController.create);
```

### Login and export actions

The `login` and `export` action types in the enum are not produced by the HTTP-method middleware (which only handles `POST`/`PUT`/`PATCH`/`DELETE`). They must be written by calling `AuditService.logAction` directly inside the relevant service methods:

- Auth module: call with `action: 'login'` after a successful login.
- Any export endpoint: call with `action: 'export'` before or after the data is sent.

### `schoolId` scoping and super admin cross-tenant access

The controller resolves `schoolId` as:

```ts
schoolId: (req.query.schoolId as string) ?? req.user?.schoolId,
```

This means:
- A `school_admin` will always query their own school's logs (their JWT `schoolId` is used).
- A `super_admin` can pass any `schoolId` as a query param to inspect another tenant, or omit it to query without a school scope (returning all records across all tenants — be aware of the performance implications).

### No dedicated "get log by ID" endpoint

The backend only exposes list and export endpoints. There is no `GET /api/audit/logs/:id` route. Individual log detail (particularly the `changes` array) is surfaced inline in the list response — the `AuditChangesExpander` component must work from the already-fetched list data, not a separate fetch.

### Pagination defaults

`paginationHelper` defaults: page `1`, limit `20`, maximum limit `100`. The frontend store should use `limit: 20` as its default and enforce a maximum of `100` in any limit control it exposes.

### Performance considerations

The three compound indexes on the `auditlogs` collection cover all filter combinations used by the service:
- `{ schoolId: 1, createdAt: -1 }` — primary tenant-scoped list query
- `{ userId: 1, createdAt: -1 }` — user filter
- `{ entity: 1, entityId: 1 }` — entity type + document filter

The export endpoint performs no pagination and should always be called with at least a date range filter in production to prevent full-collection scans on high-volume tenants.

### CSV column mapping

When building the CSV from the export response, map fields as follows:

| CSV column | Source field |
|---|---|
| `Date` | `createdAt` (formatted as `YYYY-MM-DD HH:mm:ss`) |
| `User` | `userId.firstName + ' ' + userId.lastName` |
| `Email` | `userId.email` |
| `Action` | `action` |
| `Entity` | `entity` |
| `Entity ID` | `entityId` (empty string if absent) |
| `IP Address` | `ipAddress` (empty string if absent) |
| `Changes` | JSON-stringified `changes` array, or empty string if `[]` |

---

## 9. Acceptance Criteria

### API — List audit logs

- [ ] `GET /api/audit/logs` without authentication returns HTTP 401
- [ ] `GET /api/audit/logs` as `teacher`, `parent`, or `student` role returns HTTP 403
- [ ] `GET /api/audit/logs` as `school_admin` returns a `{ logs, total, page, limit }` object where all log entries belong to the admin's school
- [ ] `GET /api/audit/logs` as `super_admin` without a `schoolId` param returns logs across all tenants
- [ ] `GET /api/audit/logs?schoolId=<id>` as `super_admin` returns only that school's logs
- [ ] `GET /api/audit/logs?userId=<invalidId>` returns HTTP 400 (regex validation: 24-char hex)
- [ ] `GET /api/audit/logs?action=delete` returns only records with `action === "delete"`
- [ ] `GET /api/audit/logs?entity=Student` returns only records with `entity === "Student"`
- [ ] `GET /api/audit/logs?startDate=2026-03-01T00:00:00+02:00` returns only records where `createdAt >= 2026-03-01T00:00:00+02:00`
- [ ] `GET /api/audit/logs?endDate=2026-03-31T23:59:59+02:00` returns only records where `createdAt <= 2026-03-31T23:59:59+02:00`
- [ ] Multiple filters applied together are combined with AND logic
- [ ] `GET /api/audit/logs?page=2&limit=5` returns the correct slice (records 6–10)
- [ ] Results are ordered by `createdAt` descending (newest first)
- [ ] `userId` field in each log entry is the populated user object `{ _id, firstName, lastName, email }`, not a raw ObjectId
- [ ] Records with `isDeleted: true` are never returned
- [ ] `GET /api/audit/logs?action=invalid` returns HTTP 400 (enum validation)

### API — Export audit logs

- [ ] `GET /api/audit/logs/export` without authentication returns HTTP 401
- [ ] `GET /api/audit/logs/export` as `teacher`, `parent`, or `student` returns HTTP 403
- [ ] `GET /api/audit/logs/export` as `school_admin` returns a flat array (not paginated) of all matching logs for the school
- [ ] Response includes `"message": "Audit logs exported successfully"` in the body
- [ ] All filters (`userId`, `entity`, `action`, `startDate`, `endDate`, `schoolId`) are applied identically to the list endpoint
- [ ] Results are sorted by `createdAt` descending
- [ ] `userId` is populated on each record

### Frontend — Admin audit page (`/admin/audit`)

- [ ] Page is accessible at `/admin/audit` for `school_admin` role
- [ ] On mount, page calls `GET /api/audit/logs?page=1&limit=20` and renders the results in `AuditTable`
- [ ] Each table row shows: formatted timestamp, actor full name, action badge (colour-coded), entity type, entity ID, IP address
- [ ] Pagination controls reflect the `total` count and navigate through pages correctly
- [ ] Selecting an action from the action dropdown re-fetches with `?action=<value>` and resets to page 1
- [ ] Selecting a date range in the date picker re-fetches with `?startDate=&endDate=` ISO strings with timezone offset
- [ ] Clearing all filters restores the default unfiltered view
- [ ] Clicking "Export CSV" calls `GET /api/audit/logs/export` with active filters and downloads a `.csv` file
- [ ] CSV file name is `audit-log-<YYYY-MM-DD>.csv` using today's date
- [ ] Expanding a row with a non-empty `changes` array shows the field-level diff table
- [ ] Expanding a row with an empty `changes` array shows the "No field-level changes recorded" message
- [ ] A loading skeleton is shown while the initial fetch is in progress
- [ ] An error state is shown with a retry button if the API call fails

### Frontend — Super admin audit page (`/superadmin/audit`)

- [ ] Page is accessible at `/superadmin/audit` for `super_admin` role
- [ ] Includes all the same filtering and export capabilities as the admin audit page
- [ ] A school selector dropdown is visible and populated from the schools list
- [ ] Selecting a school sets `schoolId` in the filter and re-fetches with `?schoolId=<id>`
- [ ] Clearing the school selector removes the `schoolId` filter and re-fetches without it
- [ ] School selector is not present on the admin audit page

### Frontend — Audit store

- [ ] `useAuditStore().filters` is initialised to `{ page: 1, limit: 20 }` on mount
- [ ] Calling `setFilter({ action: 'delete' })` sets `filters.action` and resets `filters.page` to `1`
- [ ] Calling `resetFilters()` clears all filters except `page: 1` and `limit: 20`
- [ ] Calling `exportLogs()` during an in-flight export sets `exporting: true` and resolves to the log array on success
- [ ] `exporting` is set back to `false` whether the export call succeeds or fails

### Frontend — AuditExportButton component

- [ ] Button is disabled while `exporting === true`
- [ ] A spinner or loading indicator is visible inside the button during export
- [ ] On successful export, a browser file download is triggered with the correct filename
- [ ] On export failure, an error toast is shown and the button re-enables

### Middleware integration (backend)

- [ ] When `auditMiddleware('Student')` is applied to a student router, a `POST /api/students` call creates an `AuditLog` with `action: 'create'` and `entity: 'Student'`
- [ ] The `entityId` on the created log matches `req.params.id` for `PUT`/`PATCH`/`DELETE` routes
- [ ] The middleware does not block the HTTP response — it fires audit logging asynchronously after `res.json` is called
- [ ] If `AuditService.logAction` throws, the error is caught and logged to console but does not propagate to the client
- [ ] `GET` requests do not produce audit log entries (middleware skips non-mutating methods)
