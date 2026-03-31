# 02 — School Module

## 1. Module Overview

The School module is the foundational entity in the Campusly platform. Every other module (students, fees, attendance, tuckshop, wallet, etc.) is anchored to a school document via a `schoolId` foreign key. This module handles:

- **Provisioning**: Super admins create and manage school tenants on the platform
- **School profile**: Name, address, contact info, logo, type, principal, EMIS number
- **Subscription management**: Tier assignment (basic / standard / premium) and expiry tracking
- **Module feature flags**: `modulesEnabled` array controls which feature modules are active per school
- **Academic settings**: Academic year, number of terms, grading system — consumed by grades, attendance, and reporting modules
- **Lifecycle**: Schools can be deactivated and soft-deleted; the `isDeleted` flag is the permanent tombstone

The module exposes six REST endpoints and is consumed by two distinct portal surfaces: the Super Admin portal (platform-level management) and the Admin portal (school-level settings view and editing).

---

## 2. Backend API Endpoints

All endpoints are mounted at `/api/schools` (assumed prefix based on standard Express mount convention). Bearer token authentication is required on every route via the `authenticate` middleware.

---

### POST /api/schools

Create a new school tenant.

**Auth**: `super_admin` only

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | yes | min length 1, trimmed |
| `address.street` | string | yes | min length 1, trimmed |
| `address.city` | string | yes | min length 1, trimmed |
| `address.province` | string | yes | min length 1, trimmed |
| `address.postalCode` | string | yes | min length 1, trimmed |
| `address.country` | string | yes | min length 1, trimmed |
| `contactInfo.email` | string | yes | valid email format |
| `contactInfo.phone` | string | yes | min length 1 |
| `contactInfo.website` | string | no | valid URL |
| `subscription.tier` | `'basic' \| 'standard' \| 'premium'` | yes | enum |
| `subscription.expiresAt` | string (ISO date) | yes | coerced to Date |
| `settings.academicYear` | number | yes | positive integer |
| `settings.terms` | number | yes | positive integer |
| `settings.gradingSystem` | `'percentage' \| 'letter' \| 'gpa'` | yes | enum |
| `logo` | string | no | valid URL |
| `modulesEnabled` | string[] | no | defaults to `[]` |
| `principal` | string | no | trimmed |
| `emisNumber` | string | no | trimmed |
| `type` | `'primary' \| 'secondary' \| 'combined' \| 'special'` | no | enum |

**Business rule**: Returns `409 Conflict` if a non-deleted school with the same `name` already exists.

**Example request body**:
```json
{
  "name": "Riverside Academy",
  "address": {
    "street": "12 Oak Avenue",
    "city": "Cape Town",
    "province": "Western Cape",
    "postalCode": "7700",
    "country": "South Africa"
  },
  "contactInfo": {
    "email": "admin@riverside.edu.za",
    "phone": "021 555 0100",
    "website": "https://riverside.edu.za"
  },
  "subscription": {
    "tier": "standard",
    "expiresAt": "2027-01-31T00:00:00.000Z"
  },
  "settings": {
    "academicYear": 2026,
    "terms": 4,
    "gradingSystem": "percentage"
  },
  "modulesEnabled": ["fees", "wallet", "tuckshop"],
  "principal": "Ms P. Dlamini",
  "emisNumber": "700310006",
  "type": "combined"
}
```

**Example response** (HTTP 201):
```json
{
  "success": true,
  "message": "School created successfully",
  "data": {
    "school": {
      "_id": "6650a1b2c3d4e5f678901234",
      "name": "Riverside Academy",
      "address": {
        "street": "12 Oak Avenue",
        "city": "Cape Town",
        "province": "Western Cape",
        "postalCode": "7700",
        "country": "South Africa"
      },
      "logo": null,
      "contactInfo": {
        "email": "admin@riverside.edu.za",
        "phone": "021 555 0100",
        "website": "https://riverside.edu.za"
      },
      "subscription": {
        "tier": "standard",
        "expiresAt": "2027-01-31T00:00:00.000Z"
      },
      "modulesEnabled": ["fees", "wallet", "tuckshop"],
      "settings": {
        "academicYear": 2026,
        "terms": 4,
        "gradingSystem": "percentage"
      },
      "principal": "Ms P. Dlamini",
      "emisNumber": "700310006",
      "type": "combined",
      "isActive": true,
      "isDeleted": false,
      "createdAt": "2026-03-31T08:00:00.000Z",
      "updatedAt": "2026-03-31T08:00:00.000Z"
    }
  }
}
```

---

### GET /api/schools

List all non-deleted schools with pagination, sorting, and search.

**Auth**: `super_admin` only

**Query parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number (min 1) |
| `limit` | number | 10 | Results per page (min 1, max 100) |
| `sort` | string | `-createdAt` | Field name, prefix `-` for descending (e.g. `-name`, `name`) |
| `search` | string | — | Case-insensitive partial match on `name` |

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "Schools retrieved successfully",
  "data": {
    "data": [
      {
        "_id": "6650a1b2c3d4e5f678901234",
        "name": "Riverside Academy",
        "address": { "city": "Cape Town", "province": "Western Cape", "..." : "..." },
        "contactInfo": { "email": "admin@riverside.edu.za", "phone": "021 555 0100" },
        "subscription": { "tier": "standard", "expiresAt": "2027-01-31T00:00:00.000Z" },
        "modulesEnabled": ["fees", "wallet", "tuckshop"],
        "settings": { "academicYear": 2026, "terms": 4, "gradingSystem": "percentage" },
        "isActive": true,
        "isDeleted": false,
        "createdAt": "2026-03-31T08:00:00.000Z",
        "updatedAt": "2026-03-31T08:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "pages": 5
    }
  }
}
```

---

### GET /api/schools/:id

Retrieve a single school by MongoDB `_id`.

**Auth**: Any authenticated user (all roles). The frontend uses this to load the current school context for any portal.

**Path param**: `id` — MongoDB ObjectId string

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "School retrieved successfully",
  "data": {
    "school": {
      "_id": "6650a1b2c3d4e5f678901234",
      "name": "Riverside Academy",
      "address": {
        "street": "12 Oak Avenue",
        "city": "Cape Town",
        "province": "Western Cape",
        "postalCode": "7700",
        "country": "South Africa"
      },
      "logo": "https://cdn.campusly.co.za/logos/riverside.png",
      "contactInfo": {
        "email": "admin@riverside.edu.za",
        "phone": "021 555 0100",
        "website": "https://riverside.edu.za"
      },
      "subscription": {
        "tier": "standard",
        "expiresAt": "2027-01-31T00:00:00.000Z"
      },
      "modulesEnabled": ["fees", "wallet", "tuckshop"],
      "settings": {
        "academicYear": 2026,
        "terms": 4,
        "gradingSystem": "percentage"
      },
      "principal": "Ms P. Dlamini",
      "emisNumber": "700310006",
      "type": "combined",
      "isActive": true,
      "isDeleted": false,
      "createdAt": "2026-03-31T08:00:00.000Z",
      "updatedAt": "2026-03-31T08:00:00.000Z"
    }
  }
}
```

**Error** (HTTP 404):
```json
{
  "success": false,
  "message": "School not found"
}
```

---

### PUT /api/schools/:id

Update any school fields. Uses `$set` so only provided fields are changed.

**Auth**: `super_admin` or `school_admin`

**Request body**: All fields are optional. Same shape as `POST /api/schools` plus `isActive: boolean`.

| Additional field | Type | Required | Notes |
|---|---|---|---|
| `isActive` | boolean | no | Super admin can deactivate a school |

**Example request body**:
```json
{
  "name": "Riverside Academy — Cape Town",
  "logo": "https://cdn.campusly.co.za/logos/riverside-v2.png",
  "contactInfo": {
    "email": "info@riverside.edu.za",
    "phone": "021 555 0199"
  }
}
```

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "School updated successfully",
  "data": {
    "school": { "...": "full updated school document" }
  }
}
```

---

### DELETE /api/schools/:id

Soft-delete a school. Sets `isDeleted: true` and `isActive: false`. The document is never removed from the database.

**Auth**: `super_admin` only

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "School deleted successfully",
  "data": null
}
```

---

### PATCH /api/schools/:id/settings

Update only the `settings` sub-document fields. Uses partial update — any combination of the three settings fields can be sent; only those keys are written via `settings.<key>` dot-notation `$set`.

**Auth**: `super_admin` or `school_admin`

**Request body** (all optional):

| Field | Type | Validation |
|---|---|---|
| `academicYear` | number | positive integer |
| `terms` | number | positive integer |
| `gradingSystem` | `'percentage' \| 'letter' \| 'gpa'` | enum |

**Example request body**:
```json
{
  "terms": 3,
  "gradingSystem": "letter"
}
```

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "School settings updated successfully",
  "data": {
    "school": { "...": "full updated school document" }
  }
}
```

---

## 3. Frontend Pages

### `/admin/settings` — Admin Settings Page

**File**: `src/app/(dashboard)/admin/settings/page.tsx`

**Description**: The school-level settings page available to school admins. Displays read-only school information and allows module toggling. Currently uses mock data; needs to be wired to the API.

**Tabs**:

1. **General tab** — Displays school info as a read-only key-value list:
   - School Name
   - Address (street, city, province, postal code)
   - Phone, Email, Website
   - School Type
   - Currency, Timezone (from `settings`)
   - Academic Year start/end (from `settings`)
   - Attendance Method (from `settings`)
   - Grading System (from `settings`)

2. **Modules tab** — Lists all 8 toggleable modules (fees, wallet, tuckshop, transport, communication, events, library, discipline). Each row shows a name, description, and a `Switch` toggle. State is currently local; needs `PUT /api/schools/:id` or `PATCH /api/schools/:id/settings` wired up to persist `modulesEnabled`.

3. **Users tab** — `DataTable` rendering all users belonging to the school, with columns: Name, Email, Role (colour-coded Badge), Status (Active/Inactive Badge). Currently uses `mockUsers`.

**API calls needed**:
- `GET /api/schools/:id` — load school profile on mount
- `PUT /api/schools/:id` — save module toggle changes (update `modulesEnabled`)
- `PATCH /api/schools/:id/settings` — save settings changes (academic year, terms, grading system)

---

### `/admin` — Admin Dashboard Page

**File**: `src/app/(dashboard)/admin/page.tsx`

**Description**: School-level overview dashboard. Shows four stat cards and three charts. Already wired to the backend via `GET /api/reports/dashboard` (reports module). Indirectly dependent on the school module because all report data is scoped to the school context derived from the authenticated user's `schoolId`.

**API calls**: `GET /api/reports/dashboard`

---

### `/superadmin` — Super Admin Dashboard Page

**File**: `src/app/(dashboard)/superadmin/page.tsx`

**Description**: Platform-level overview. Shows total schools, total students, MRR, ARR, and active trials. Charts show MRR trend, schools by subscription tier breakdown, and student growth. Currently uses mock data; needs to be wired to a platform stats endpoint (outside the school module itself but reads from the School collection).

**API calls needed**: Platform stats endpoint (not yet in school module routes — scope gap).

---

### `/superadmin/schools` — Super Admin Schools List Page

**File**: `src/app/(dashboard)/superadmin/schools/page.tsx`

**Description**: Paginated, searchable, filterable table of all school tenants. Currently uses `mockTenants`.

**Controls**:
- Search input (by name or admin email)
- Status filter dropdown: All / Active / Trial / Suspended / Cancelled
- Tier filter dropdown: All / Enterprise / Growth / Starter
- "Onboard School" button → navigates to `/superadmin/onboard`

**Table columns**: School (name + admin email), Status (badge), Tier (badge), Students (count), MRR, Actions (dropdown: View Details → `/superadmin/schools/:id`, Suspend/Activate toggle)

**API calls needed**:
- `GET /api/schools?page=&limit=&search=&sort=` — load and filter schools list
- `PUT /api/schools/:id` — toggle active/suspended status via the actions dropdown

---

### `/superadmin/onboard` — Onboard New School Wizard

**File**: `src/app/(dashboard)/superadmin/onboard/page.tsx`

**Description**: A 5-step multi-step form for provisioning a new school tenant.

**Steps**:
1. **School Details** — name, city, province (SA provinces dropdown), phone, school type (primary/secondary/combined)
2. **Modules** — checkbox list of all available modules from `MODULES` constant
3. **Admin User** — first name, last name, email, temporary password
4. **Subscription** — tier selection card: starter (R2,999/mo), growth (R7,999/mo), enterprise (R14,999/mo)
5. **Review** — read-only summary of all entered data with "Confirm & Onboard" button

On final submission, shows a success screen with options to "View Schools" or "Onboard Another".

**API calls needed**:
- `POST /api/schools` — create the school record with all settings, subscription, and `modulesEnabled`
- `POST /api/auth/register` or equivalent — create the initial `school_admin` user linked to the new school (auth module concern, but triggered from this wizard)

**Current state**: `handleSubmit` only calls `toast.success()` — no real API call wired yet.

---

### `/superadmin/billing` — Super Admin Billing Page

**File**: `src/app/(dashboard)/superadmin/billing/page.tsx`

**Description**: Platform-level billing overview. Shows MRR, ARR, and outstanding amounts. Displays a table of platform invoices (invoice number, school name, tier, amount, issued/due dates, status). "Generate Invoices" button queues invoice generation for all active tenants. Currently uses `mockPlatformInvoices`.

**API calls needed**: Platform billing endpoints (outside school module scope).

---

### `/superadmin/support` — Super Admin Support Page

**File**: `src/app/(dashboard)/superadmin/support/page.tsx`

**Description**: Two-panel support ticket interface. Left panel is a scrollable list of tickets (subject, tenant name, status badge, priority, relative time). Right panel shows the selected ticket's message thread and a reply compose box. Currently uses `mockSupportTickets`.

**API calls needed**: Support ticket endpoints (outside school module scope).

---

## 4. User Flows

### Flow 1: Super Admin Onboards a New School

1. Super admin navigates to `/superadmin/onboard`.
2. **Step 1 — School Details**: Enters school name, city, selects province from SA provinces list, enters phone, selects school type.
3. **Step 2 — Modules**: Checks/unchecks modules to enable. Defaults are `fees` and `communication`.
4. **Step 3 — Admin User**: Enters first name, last name, email address, and temporary password for the school's primary admin account.
5. **Step 4 — Subscription**: Selects a pricing tier (starter / growth / enterprise).
6. **Step 5 — Review**: Reviews all details in a summary view.
7. Clicks "Confirm & Onboard".
8. Frontend calls `POST /api/schools` with the school payload.
9. Frontend calls the auth/user creation endpoint to create the `school_admin` user linked to the new `schoolId`.
10. Success screen is shown. Super admin can navigate to `/superadmin/schools` to see the new tenant.

---

### Flow 2: Super Admin Views and Manages All Schools

1. Super admin navigates to `/superadmin/schools`.
2. Frontend calls `GET /api/schools` with default pagination.
3. Table renders all schools.
4. Super admin types in the search box → frontend re-fetches with `?search=<term>`.
5. Super admin filters by status or tier → frontend re-fetches with `?status=` / `?tier=` (or client-side filters if using client state).
6. Super admin clicks the actions menu (⋯) on a row:
   - **View Details**: Navigate to `/superadmin/schools/:id`.
   - **Suspend**: Calls `PUT /api/schools/:id` with `{ isActive: false }`.
   - **Activate**: Calls `PUT /api/schools/:id` with `{ isActive: true }`.

---

### Flow 3: Super Admin Soft-Deletes a School

1. Super admin opens the school detail page at `/superadmin/schools/:id` (not yet built).
2. Clicks "Delete School".
3. Confirmation dialog is shown.
4. On confirm, frontend calls `DELETE /api/schools/:id`.
5. Backend sets `isDeleted: true`, `isActive: false`.
6. School disappears from `GET /api/schools` list (filter is `isDeleted: false`).

---

### Flow 4: School Admin Views School Settings

1. School admin navigates to `/admin/settings`.
2. Frontend calls `GET /api/schools/:schoolId` (schoolId comes from the auth context / JWT).
3. Page renders the General tab with current school data.
4. Admin switches to the Modules tab to see which modules are enabled.
5. Admin toggles a module on/off.
6. Frontend calls `PUT /api/schools/:id` with the updated `modulesEnabled` array.
7. Toast confirms success; the nav sidebar re-renders to show/hide module-gated nav items.

---

### Flow 5: School Admin Updates Academic Settings

1. School admin is on `/admin/settings`, General tab.
2. Admin clicks "Edit" (button needs to be added — form is currently read-only).
3. Admin changes academic year, number of terms, or grading system.
4. Admin submits.
5. Frontend calls `PATCH /api/schools/:id/settings` with only the changed fields.
6. Backend applies partial `$set` to `settings.*` fields only.
7. Toast confirms success.

---

## 5. Data Models

### School (Mongoose Schema)

Collection name: `schools`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | String | yes | — | Trimmed; indexed (`{ name: 1 }`) |
| `address` | Object (addressSchema) | yes | — | Subdocument, no `_id` |
| `address.street` | String | yes | — | Trimmed |
| `address.city` | String | yes | — | Trimmed |
| `address.province` | String | yes | — | Trimmed |
| `address.postalCode` | String | yes | — | Trimmed |
| `address.country` | String | yes | — | Trimmed |
| `logo` | String | no | — | URL to logo image |
| `contactInfo` | Object (contactInfoSchema) | yes | — | Subdocument, no `_id` |
| `contactInfo.email` | String | yes | — | Trimmed |
| `contactInfo.phone` | String | yes | — | Trimmed |
| `contactInfo.website` | String | no | — | Trimmed |
| `subscription` | Object (subscriptionSchema) | yes | — | Subdocument, no `_id` |
| `subscription.tier` | String enum | yes | — | `'basic' \| 'standard' \| 'premium'` |
| `subscription.expiresAt` | Date | yes | — | Subscription expiry |
| `modulesEnabled` | [String] | no | `[]` | Array of module ID strings |
| `settings` | Object (settingsSchema) | yes | — | Subdocument, no `_id` |
| `settings.academicYear` | Number | yes | — | e.g. `2026` |
| `settings.terms` | Number | yes | — | Number of terms per year |
| `settings.gradingSystem` | String enum | yes | — | `'percentage' \| 'letter' \| 'gpa'` |
| `principal` | String | no | — | Trimmed; name of principal |
| `emisNumber` | String | no | — | Trimmed; SA school EMIS number |
| `type` | String enum | no | — | `'primary' \| 'secondary' \| 'combined' \| 'special'` |
| `isActive` | Boolean | no | `true` | Whether school is operational |
| `isDeleted` | Boolean | no | `false` | Soft-delete flag |
| `createdAt` | Date | — | auto | Mongoose timestamps |
| `updatedAt` | Date | — | auto | Mongoose timestamps |

**Indexes**: `{ name: 1 }`

**Soft-delete pattern**: `isDeleted: false` is applied to every query in the service layer. The `delete` service method sets `isDeleted: true, isActive: false` rather than removing the document.

**Conflict guard**: `create` checks for an existing document with the same `name` where `isDeleted: false` before inserting; throws `ConflictError` (409) if found.

---

### Frontend TypeScript Interface (current — `src/types/index.ts`)

The current frontend `School` interface diverges from the backend model. Key gaps to resolve during API wiring:

| Frontend field | Backend equivalent | Notes |
|---|---|---|
| `id` | `_id` | MongoDB ObjectId serialised as string |
| `address: string` | `address.street` | Frontend flattens address; backend uses nested object |
| `city` | `address.city` | — |
| `province` | `address.province` | — |
| `postalCode` | `address.postalCode` | — |
| `phone` | `contactInfo.phone` | — |
| `email` | `contactInfo.email` | — |
| `website` | `contactInfo.website` | — |
| `enabledModules` | `modulesEnabled` | Field name differs |
| `settings.currency` | not in backend | Frontend-only field, not persisted |
| `settings.timezone` | not in backend | Frontend-only field, not persisted |
| `settings.academicYearStart` | `settings.academicYear` | Backend stores a single year number |
| `settings.academicYearEnd` | derived | Not stored; derived from academicYear + 1 |
| `settings.attendanceMethod` | not in backend | Frontend-only field, not persisted |
| `slug` | not in backend | Frontend-only field |

The `School` interface in `src/types/index.ts` must be updated to match the backend response shape when API wiring begins.

---

## 6. State Management

There is currently no Zustand store in the frontend (`src/store/` does not exist). The following store is needed for the school module:

### `useSchoolStore` (Zustand)

**File to create**: `src/store/useSchoolStore.ts`

**State shape**:
```ts
interface SchoolStore {
  // Current school (for admin/teacher/parent/student portals)
  school: School | null;
  schoolLoading: boolean;
  schoolError: string | null;

  // Super admin: list of all schools
  schools: School[];
  schoolsTotal: number;
  schoolsPage: number;
  schoolsLimit: number;
  schoolsSearch: string;
  schoolsLoading: boolean;
  schoolsError: string | null;

  // Actions
  fetchSchool: (id: string) => Promise<void>;
  fetchSchools: (params?: { page?: number; limit?: number; search?: string; sort?: string }) => Promise<void>;
  createSchool: (data: CreateSchoolInput) => Promise<School>;
  updateSchool: (id: string, data: UpdateSchoolInput) => Promise<void>;
  deleteSchool: (id: string) => Promise<void>;
  updateSettings: (id: string, data: UpdateSettingsInput) => Promise<void>;
  setSchoolsSearch: (search: string) => void;
  setSchoolsPage: (page: number) => void;
}
```

**Key behaviours**:
- `fetchSchool` is called once on portal mount (from a layout component that reads `schoolId` from the auth store/JWT) and stores the current tenant's school document globally
- `modulesEnabled` from the school store is used by the sidebar nav to conditionally render module-gated nav items
- `fetchSchools` is used only in the super admin portal (`/superadmin/schools`)
- The school store should be populated from `GET /api/schools/:id` using the `schoolId` embedded in the authenticated user's JWT claims

---

## 7. Components Needed

The following reusable components are needed specifically for the school module (beyond what already exists in `src/components/shared/` and `src/components/ui/`):

### New components

| Component | Location | Purpose |
|---|---|---|
| `SchoolProfileCard` | `src/components/school/SchoolProfileCard.tsx` | Displays school name, logo, type, address in a card — used in settings General tab and super admin school detail |
| `SchoolInfoForm` | `src/components/school/SchoolInfoForm.tsx` | Editable form for school name, address, contact info, type. Used in admin settings edit mode and super admin school detail |
| `SchoolSettingsForm` | `src/components/school/SchoolSettingsForm.tsx` | Form for `settings.academicYear`, `settings.terms`, `settings.gradingSystem`. Calls `PATCH /api/schools/:id/settings` |
| `ModuleToggleList` | `src/components/school/ModuleToggleList.tsx` | Renders the module enable/disable switch list. Accepts `enabledModules` + `onChange` props. Currently inlined in settings page |
| `SubscriptionBadge` | `src/components/school/SubscriptionBadge.tsx` | Colour-coded badge showing subscription tier and expiry date |
| `OnboardWizard` | `src/components/school/OnboardWizard.tsx` | Extracted multi-step wizard logic from the onboard page for reusability |
| `SchoolStatusToggle` | `src/components/school/SchoolStatusToggle.tsx` | Confirm-dialog-backed button for activating/suspending a school |

### Existing shared components used by this module

| Component | File | Used in |
|---|---|---|
| `DataTable` | `src/components/shared/DataTable.tsx` | Settings users tab, schools list |
| `PageHeader` | `src/components/shared/PageHeader.tsx` | All pages |
| `StatCard` | `src/components/shared/StatCard.tsx` | Dashboards |

---

## 8. Integration Notes

### `schoolId` as the universal foreign key

Every other backend module document carries a `schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true }` field. This means the school record must exist before any other module data can be created. The school module is therefore a hard prerequisite for all other modules.

Affected modules include (but are not limited to): Students, Staff/Users, Grades, Classes, Subjects, Fees, Invoices, Wallet, Tuckshop, Attendance, Assessments, Homework, Events, Transport, Library, Discipline, Communications.

### `modulesEnabled` drives nav visibility

The `modulesEnabled` string array on the school document is the feature-flag system. The admin sidebar nav (`ADMIN_NAV` in `src/lib/constants.ts`) already has a `module` property on relevant `NavItem` entries (e.g. `module: 'fees'`, `module: 'wallet'`). The layout component must read `useSchoolStore().school.modulesEnabled` and filter nav items accordingly.

### `settings.gradingSystem` consumed by assessment/reporting

The `gradingSystem` value (`percentage`, `letter`, `gpa`) must be read from the school store by the Academics and Grades modules to determine how marks are displayed and calculated. Do not hardcode grading display logic in those modules.

### `settings.academicYear` and `settings.terms` consumed by fees and reports

The fee module uses `academicYear` and `terms` to scope invoice generation. The reports module uses them for term-boundary calculations. Changes to settings via `PATCH /api/schools/:id/settings` should invalidate cached report data.

### Auth context carries `schoolId`

The authenticated user's JWT or session object must include `schoolId`. This value is used to:
1. Call `GET /api/schools/:schoolId` on portal mount to populate the school store
2. Automatically scope all other API requests (most endpoints derive tenant context from the authenticated user on the backend, not from a request body field)

### Subscription tier limits

The frontend should check `school.subscription.expiresAt` to show an expiry warning banner when the subscription is within 30 days of expiry or already expired. The `subscription.tier` value determines which modules are available to enable (business rule, not yet enforced by the backend validation layer).

### Super admin vs school admin access split

| Action | Super admin | School admin |
|---|---|---|
| Create school | yes | no |
| List all schools | yes | no |
| Get school by ID | yes | yes |
| Update school (full) | yes | yes |
| Delete school (soft) | yes | no |
| Update settings only | yes | yes |

---

## 9. Acceptance Criteria

### API — Create school

- [ ] `POST /api/schools` with all required fields returns HTTP 201 and the created school document
- [ ] `POST /api/schools` with a duplicate `name` (case-sensitive, non-deleted) returns HTTP 409 with message "A school with this name already exists"
- [ ] `POST /api/schools` without `super_admin` role returns HTTP 403
- [ ] `POST /api/schools` missing a required field (e.g. `address.city`) returns HTTP 400 with validation error details
- [ ] Created school has `isActive: true`, `isDeleted: false`, and `modulesEnabled: []` by default

### API — List schools

- [ ] `GET /api/schools` without authentication returns HTTP 401
- [ ] `GET /api/schools` as `school_admin` returns HTTP 403
- [ ] `GET /api/schools` as `super_admin` returns paginated result with `data` array and `pagination` object
- [ ] `GET /api/schools?search=riverside` returns only schools whose names contain "riverside" (case-insensitive)
- [ ] `GET /api/schools?sort=-name` returns schools sorted by name descending
- [ ] `GET /api/schools?limit=5&page=2` returns the correct page slice

### API — Get school by ID

- [ ] `GET /api/schools/:id` for a valid ID returns the full school document
- [ ] `GET /api/schools/:id` for a non-existent or soft-deleted ID returns HTTP 404
- [ ] `GET /api/schools/:id` is accessible by all authenticated roles (admin, teacher, parent, student)

### API — Update school

- [ ] `PUT /api/schools/:id` as `school_admin` can update `name`, `logo`, `contactInfo`, `modulesEnabled`
- [ ] `PUT /api/schools/:id` as `school_admin` can update `isActive: false` (deactivation)
- [ ] `PUT /api/schools/:id` for a non-existent ID returns HTTP 404
- [ ] Mongoose validators run on update (`runValidators: true`) — invalid `subscription.tier` returns HTTP 400

### API — Delete school

- [ ] `DELETE /api/schools/:id` as `super_admin` sets `isDeleted: true` and `isActive: false`; returns HTTP 200
- [ ] The deleted school no longer appears in `GET /api/schools`
- [ ] `DELETE /api/schools/:id` as `school_admin` returns HTTP 403
- [ ] `DELETE /api/schools/:id` for an already-deleted ID returns HTTP 404

### API — Update settings

- [ ] `PATCH /api/schools/:id/settings` with `{ terms: 3 }` updates only `settings.terms`; `settings.academicYear` and `settings.gradingSystem` are unchanged
- [ ] `PATCH /api/schools/:id/settings` with `{ gradingSystem: "invalid" }` returns HTTP 400
- [ ] `PATCH /api/schools/:id/settings` is accessible by both `super_admin` and `school_admin`

### Frontend — Admin Settings page (`/admin/settings`)

- [ ] Page loads and calls `GET /api/schools/:schoolId` on mount
- [ ] General tab displays all school fields from the API response (not mock data)
- [ ] Modules tab shows each module with its enabled/disabled state from `school.modulesEnabled`
- [ ] Toggling a module calls `PUT /api/schools/:id` with the updated `modulesEnabled` array
- [ ] A success toast is shown on save; an error toast is shown on failure
- [ ] Settings tab changes (academic year, terms, grading system) call `PATCH /api/schools/:id/settings`
- [ ] Users tab loads users from the user/staff API scoped to the school (not mock data)

### Frontend — Super Admin Schools page (`/superadmin/schools`)

- [ ] Page loads and calls `GET /api/schools` with default pagination on mount
- [ ] Search input debounces and calls `GET /api/schools?search=<term>`
- [ ] Status and tier filters update the displayed list
- [ ] "Onboard School" button navigates to `/superadmin/onboard`
- [ ] Suspend action calls `PUT /api/schools/:id` with `{ isActive: false }` and updates the row status badge
- [ ] Activate action calls `PUT /api/schools/:id` with `{ isActive: true }` and updates the row status badge

### Frontend — Onboard Wizard (`/superadmin/onboard`)

- [ ] All 5 steps are navigable; previously-completed steps can be revisited by clicking their step indicator
- [ ] "Next" button is disabled or shows validation if required fields in the current step are empty
- [ ] Step 5 shows an accurate summary of all entered data
- [ ] "Confirm & Onboard" calls `POST /api/schools` with correct payload mapping (wizard `schoolName` → `name`, `city`/`province`/`phone` into `address`/`contactInfo`, etc.)
- [ ] After successful API call, the success screen is shown
- [ ] On API error, an error toast is displayed and the wizard remains on step 5

### Frontend — School store

- [ ] `useSchoolStore().school` is populated on portal layout mount for admin, teacher, parent, and student portals
- [ ] Sidebar nav items with a `module` property are hidden when their module ID is not in `school.modulesEnabled`
- [ ] Updating `modulesEnabled` via the settings page immediately updates the sidebar without a page reload
