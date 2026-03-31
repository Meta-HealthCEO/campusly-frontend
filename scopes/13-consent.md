# 13 — Consent Module

## 1. Module Overview

The Consent module enables school administrators to create digital consent forms that are sent to parents for signature. Parents can grant or deny consent on behalf of their children directly from the parent portal. The module supports five consent types — trip, medical, general, photo, and data — and records a signed audit trail including timestamp, IP address, and optional digital signature text.

Key capabilities:
- Admin creates a consent form targeting specific students, with an optional expiry date and supporting attachment
- A form can optionally require responses from both parents of a student before it is considered complete
- Parents view pending and completed forms from their portal dashboard
- Admins and teachers can view all responses submitted for a given form
- Outstanding (unanswered) consents for any student can be queried at any time
- Soft-delete is used throughout — no records are permanently removed

The Consent module intersects with the Event module (trip/activity consent linked to an event), the Student module (targetStudents list), and the Parent module (response ownership).

---

## 2. Backend API Endpoints

All routes are mounted at the base path `/consent`. All endpoints require a valid Bearer token in the `Authorization` header (JWT issued by the Auth module).

---

### 2.1 Create Consent Form

**POST /consent/forms**

Roles allowed: `super_admin`, `school_admin`

**Request body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | string | Yes | Valid 24-char MongoDB ObjectId |
| `title` | string | Yes | min length 1 |
| `description` | string | No | — |
| `type` | string | Yes | Enum: `trip`, `medical`, `general`, `photo`, `data` |
| `targetStudents` | string[] | No | Array of valid ObjectIds |
| `requiresBothParents` | boolean | No | Defaults to `false` |
| `expiryDate` | string | No | ISO 8601 datetime string |
| `attachmentUrl` | string | No | Must be a valid URL |
| `createdBy` | string | Yes | Valid 24-char MongoDB ObjectId |

**Example request**

```json
POST /consent/forms
Authorization: Bearer <token>
Content-Type: application/json

{
  "schoolId": "64a1f2b3c4d5e6f7a8b9c0d1",
  "title": "Grade 8 Science Museum Trip",
  "description": "Consent for the Grade 8 trip to the Natural Science Museum on 15 April 2026.",
  "type": "trip",
  "targetStudents": [
    "64a1f2b3c4d5e6f7a8b9c0d2",
    "64a1f2b3c4d5e6f7a8b9c0d3"
  ],
  "requiresBothParents": false,
  "expiryDate": "2026-04-10T23:59:59.000Z",
  "attachmentUrl": "https://cdn.campusly.app/forms/trip-info.pdf",
  "createdBy": "64a1f2b3c4d5e6f7a8b9c0d4"
}
```

**Example response (201)**

```json
{
  "success": true,
  "data": {
    "_id": "64a1f2b3c4d5e6f7a8b9c0d5",
    "schoolId": "64a1f2b3c4d5e6f7a8b9c0d1",
    "title": "Grade 8 Science Museum Trip",
    "description": "Consent for the Grade 8 trip to the Natural Science Museum on 15 April 2026.",
    "type": "trip",
    "targetStudents": [
      "64a1f2b3c4d5e6f7a8b9c0d2",
      "64a1f2b3c4d5e6f7a8b9c0d3"
    ],
    "requiresBothParents": false,
    "expiryDate": "2026-04-10T23:59:59.000Z",
    "attachmentUrl": "https://cdn.campusly.app/forms/trip-info.pdf",
    "createdBy": "64a1f2b3c4d5e6f7a8b9c0d4",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Consent form created successfully"
}
```

---

### 2.2 List Consent Forms

**GET /consent/forms**

Roles allowed: any authenticated user

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school. Falls back to `req.user.schoolId` if omitted. |
| `type` | string | Filter by consent type (`trip`, `medical`, `general`, `photo`, `data`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default determined by `paginationHelper`) |

**Example request**

```
GET /consent/forms?schoolId=64a1f2b3c4d5e6f7a8b9c0d1&type=trip&page=1&limit=10
Authorization: Bearer <token>
```

**Example response (200)**

```json
{
  "success": true,
  "data": {
    "forms": [
      {
        "_id": "64a1f2b3c4d5e6f7a8b9c0d5",
        "schoolId": "64a1f2b3c4d5e6f7a8b9c0d1",
        "title": "Grade 8 Science Museum Trip",
        "description": "Consent for the Grade 8 trip to the Natural Science Museum.",
        "type": "trip",
        "targetStudents": ["64a1f2b3c4d5e6f7a8b9c0d2"],
        "requiresBothParents": false,
        "expiryDate": "2026-04-10T23:59:59.000Z",
        "attachmentUrl": "https://cdn.campusly.app/forms/trip-info.pdf",
        "createdBy": {
          "_id": "64a1f2b3c4d5e6f7a8b9c0d4",
          "firstName": "Nomsa",
          "lastName": "Dlamini",
          "email": "nomsa@school.ac.za"
        },
        "isDeleted": false,
        "createdAt": "2026-03-31T08:00:00.000Z",
        "updatedAt": "2026-03-31T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "message": "Consent forms retrieved successfully"
}
```

---

### 2.3 Get Consent Form by ID

**GET /consent/forms/:id**

Roles allowed: any authenticated user

**Path parameters**

| Parameter | Type | Description |
|---|---|---|
| `id` | string | MongoDB ObjectId of the consent form |

`createdBy` is populated with `firstName`, `lastName`, `email`.

**Example request**

```
GET /consent/forms/64a1f2b3c4d5e6f7a8b9c0d5
Authorization: Bearer <token>
```

**Example response (200)**

```json
{
  "success": true,
  "data": {
    "_id": "64a1f2b3c4d5e6f7a8b9c0d5",
    "schoolId": "64a1f2b3c4d5e6f7a8b9c0d1",
    "title": "Grade 8 Science Museum Trip",
    "description": "Consent for the Grade 8 trip to the Natural Science Museum.",
    "type": "trip",
    "targetStudents": ["64a1f2b3c4d5e6f7a8b9c0d2"],
    "requiresBothParents": false,
    "expiryDate": "2026-04-10T23:59:59.000Z",
    "attachmentUrl": "https://cdn.campusly.app/forms/trip-info.pdf",
    "createdBy": {
      "_id": "64a1f2b3c4d5e6f7a8b9c0d4",
      "firstName": "Nomsa",
      "lastName": "Dlamini",
      "email": "nomsa@school.ac.za"
    },
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Consent form retrieved successfully"
}
```

**Error (404)**

```json
{
  "success": false,
  "message": "Consent form not found"
}
```

---

### 2.4 Update Consent Form

**PUT /consent/forms/:id**

Roles allowed: `super_admin`, `school_admin`

All fields are optional. Only the fields provided are updated (`$set`).

**Request body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | string | No | min length 1 |
| `description` | string | No | — |
| `type` | string | No | Enum: `trip`, `medical`, `general`, `photo`, `data` |
| `targetStudents` | string[] | No | Array of valid ObjectIds |
| `requiresBothParents` | boolean | No | — |
| `expiryDate` | string | No | ISO 8601 datetime string |
| `attachmentUrl` | string | No | Must be a valid URL |

**Example request**

```json
PUT /consent/forms/64a1f2b3c4d5e6f7a8b9c0d5
Authorization: Bearer <token>
Content-Type: application/json

{
  "expiryDate": "2026-04-12T23:59:59.000Z",
  "requiresBothParents": true
}
```

**Example response (200)**

```json
{
  "success": true,
  "data": {
    "_id": "64a1f2b3c4d5e6f7a8b9c0d5",
    "title": "Grade 8 Science Museum Trip",
    "requiresBothParents": true,
    "expiryDate": "2026-04-12T23:59:59.000Z",
    "createdBy": {
      "_id": "64a1f2b3c4d5e6f7a8b9c0d4",
      "firstName": "Nomsa",
      "lastName": "Dlamini",
      "email": "nomsa@school.ac.za"
    },
    "updatedAt": "2026-03-31T09:15:00.000Z"
  },
  "message": "Consent form updated successfully"
}
```

---

### 2.5 Delete Consent Form (Soft Delete)

**DELETE /consent/forms/:id**

Roles allowed: `super_admin`, `school_admin`

Sets `isDeleted: true`. The form is excluded from all list queries after deletion.

**Example request**

```
DELETE /consent/forms/64a1f2b3c4d5e6f7a8b9c0d5
Authorization: Bearer <token>
```

**Example response (200)**

```json
{
  "success": true,
  "data": undefined,
  "message": "Consent form deleted successfully"
}
```

---

### 2.6 Record Consent Response

**POST /consent/responses**

Roles allowed: `parent`

The combination of `(formId, studentId, parentId)` has a unique index — a parent cannot submit more than one response per student per form.

**Request body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `formId` | string | Yes | Valid 24-char MongoDB ObjectId |
| `studentId` | string | Yes | Valid 24-char MongoDB ObjectId |
| `parentId` | string | Yes | Valid 24-char MongoDB ObjectId |
| `response` | string | Yes | Enum: `granted`, `denied` |
| `ipAddress` | string | No | — |
| `signature` | string | No | Free-text digital signature representation |
| `notes` | string | No | — |

The service validates that the referenced `formId` exists and is not soft-deleted before creating the response. `signedAt` defaults to `Date.now` on the server.

**Example request**

```json
POST /consent/responses
Authorization: Bearer <token>
Content-Type: application/json

{
  "formId": "64a1f2b3c4d5e6f7a8b9c0d5",
  "studentId": "64a1f2b3c4d5e6f7a8b9c0d2",
  "parentId": "64a1f2b3c4d5e6f7a8b9c0d6",
  "response": "granted",
  "ipAddress": "196.21.45.100",
  "signature": "S. Molefe",
  "notes": "Please ensure sunscreen is applied."
}
```

**Example response (201)**

```json
{
  "success": true,
  "data": {
    "_id": "64a1f2b3c4d5e6f7a8b9c0d7",
    "formId": "64a1f2b3c4d5e6f7a8b9c0d5",
    "studentId": "64a1f2b3c4d5e6f7a8b9c0d2",
    "parentId": "64a1f2b3c4d5e6f7a8b9c0d6",
    "response": "granted",
    "signedAt": "2026-03-31T10:22:00.000Z",
    "ipAddress": "196.21.45.100",
    "signature": "S. Molefe",
    "notes": "Please ensure sunscreen is applied.",
    "isDeleted": false,
    "createdAt": "2026-03-31T10:22:00.000Z",
    "updatedAt": "2026-03-31T10:22:00.000Z"
  },
  "message": "Consent response recorded successfully"
}
```

**Error — form not found (404)**

```json
{
  "success": false,
  "message": "Consent form not found"
}
```

**Error — duplicate response (MongoDB E11000)**

The unique index `{ formId, studentId, parentId }` will cause a duplicate key error if the same parent tries to respond twice. The frontend must guard against double-submission.

---

### 2.7 Get Responses for a Form

**GET /consent/responses/form/:formId**

Roles allowed: `super_admin`, `school_admin`, `teacher`

Returns paginated list of all responses for the specified form. `studentId` is populated with `firstName`, `lastName`. `parentId` is populated with `firstName`, `lastName`, `email`.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page |

**Example request**

```
GET /consent/responses/form/64a1f2b3c4d5e6f7a8b9c0d5?page=1&limit=20
Authorization: Bearer <token>
```

**Example response (200)**

```json
{
  "success": true,
  "data": {
    "responses": [
      {
        "_id": "64a1f2b3c4d5e6f7a8b9c0d7",
        "formId": "64a1f2b3c4d5e6f7a8b9c0d5",
        "studentId": {
          "_id": "64a1f2b3c4d5e6f7a8b9c0d2",
          "firstName": "Lerato",
          "lastName": "Molefe"
        },
        "parentId": {
          "_id": "64a1f2b3c4d5e6f7a8b9c0d6",
          "firstName": "Sipho",
          "lastName": "Molefe",
          "email": "sipho@email.com"
        },
        "response": "granted",
        "signedAt": "2026-03-31T10:22:00.000Z",
        "ipAddress": "196.21.45.100",
        "signature": "S. Molefe",
        "notes": "Please ensure sunscreen is applied.",
        "isDeleted": false,
        "createdAt": "2026-03-31T10:22:00.000Z",
        "updatedAt": "2026-03-31T10:22:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Consent responses retrieved successfully"
}
```

---

### 2.8 Get Outstanding Consents for a Student

**GET /consent/responses/outstanding/:studentId**

Roles allowed: any authenticated user

Returns all `ConsentForm` documents that:
1. Include `studentId` in their `targetStudents` array
2. Do NOT yet have a `ConsentResponse` record for that student
3. Are not soft-deleted

`createdBy` is populated with `firstName`, `lastName`, `email`.

**Example request**

```
GET /consent/responses/outstanding/64a1f2b3c4d5e6f7a8b9c0d2
Authorization: Bearer <token>
```

**Example response (200)**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1f2b3c4d5e6f7a8b9c0d5",
      "schoolId": "64a1f2b3c4d5e6f7a8b9c0d1",
      "title": "Grade 8 Science Museum Trip",
      "description": "Consent for the Grade 8 trip to the Natural Science Museum.",
      "type": "trip",
      "targetStudents": ["64a1f2b3c4d5e6f7a8b9c0d2"],
      "requiresBothParents": false,
      "expiryDate": "2026-04-10T23:59:59.000Z",
      "attachmentUrl": "https://cdn.campusly.app/forms/trip-info.pdf",
      "createdBy": {
        "_id": "64a1f2b3c4d5e6f7a8b9c0d4",
        "firstName": "Nomsa",
        "lastName": "Dlamini",
        "email": "nomsa@school.ac.za"
      },
      "isDeleted": false,
      "createdAt": "2026-03-31T08:00:00.000Z",
      "updatedAt": "2026-03-31T08:00:00.000Z"
    }
  ],
  "message": "Outstanding consents retrieved successfully"
}
```

---

## 3. Frontend Pages

### 3.1 Parent Portal — Consent Forms

**Route:** `/parent/consent`

**File:** `src/app/(dashboard)/parent/consent/page.tsx`

**Current state:** Exists. Uses mock data (`mockConsentForms` from `@/lib/mock-data`). Local `useState` drives sign/decline actions. No API integration yet.

**Purpose:** Allows a parent to view all consent forms targeted at their children, and to grant or deny consent inline.

**UI structure:**
- `PageHeader` with title "Consent Forms" and description
- Summary stat cards (Pending count, Signed count, Declined count)
- "Pending Consent Forms" section — one card per form, with Sign and Decline action buttons
- "Completed Forms" section — compact row list of previously actioned forms with status badge and timestamp
- `EmptyState` shown in the pending section when all forms have been answered

**Frontend `ConsentForm` type (current, in `src/types/index.ts`):**

```ts
interface ConsentForm {
  id: string;
  title: string;
  description: string;
  eventId?: string;
  dueDate: string;
  status: 'pending' | 'signed' | 'declined';
  parentId: string;
  studentId: string;
  signedAt?: string;
}
```

Note: this is a simplified frontend projection. The backend `IConsentForm` does not carry `status` — status is derived by querying outstanding consents and cross-referencing with responses.

---

### 3.2 Admin Portal — Consent Management

**Route:** `/admin/consent` (does not exist yet — needs to be created)

**Purpose:** Allows admins to:
- View all consent forms for the school (filterable by type)
- Create new consent forms (form builder modal/page)
- Edit existing forms (title, description, expiry, targetStudents, etc.)
- Delete forms (soft delete confirmation dialog)
- View the response summary for any form (how many granted, denied, outstanding)
- Drill into a form's responses and see per-student/per-parent status

---

## 4. User Flows

### 4.1 Admin Creates a Consent Form

1. Admin navigates to `/admin/consent`.
2. Admin clicks "New Consent Form".
3. A modal or drawer opens with `ConsentFormBuilder`.
4. Admin fills in: title, type (trip/medical/general/photo/data), description, expiry date, optional attachment URL.
5. Admin selects target students from a searchable multi-select student picker.
6. Admin toggles "Require both parents to respond" if needed.
7. Admin submits — frontend calls `POST /consent/forms`.
8. On success the new form appears in the list and a toast confirms creation.

### 4.2 Admin Edits or Deletes a Form

1. From the consent forms list, admin clicks the edit (pencil) icon on a row.
2. The same form builder opens pre-populated.
3. Admin edits fields and submits — frontend calls `PUT /consent/forms/:id`.
4. To delete: admin clicks the delete (trash) icon, a confirmation dialog appears, on confirm frontend calls `DELETE /consent/forms/:id`.

### 4.3 Parent Views and Signs a Consent Form

1. Parent logs in — the parent dashboard may surface a badge/alert for pending consent count.
2. Parent navigates to `/parent/consent`.
3. The page calls `GET /consent/responses/outstanding/:studentId` for each of the parent's linked students to build the pending list.
4. Previously answered forms are retrieved separately (e.g. via `GET /consent/forms` filtered by school, cross-referenced with the parent's own responses).
5. For each pending form the parent can read the description and open the attachment if present.
6. Parent clicks "Sign" — a confirmation dialog captures an optional typed signature and notes, then calls `POST /consent/responses` with `response: "granted"`.
7. Parent clicks "Decline" — a decline confirmation dialog calls `POST /consent/responses` with `response: "denied"`.
8. After response is recorded the form moves from the Pending section to the Completed section instantly (optimistic UI or refetch).

### 4.4 Admin Views Responses for a Form

1. Admin navigates to `/admin/consent` and selects a form.
2. A response summary panel shows: total targeted, granted count, denied count, outstanding count.
3. Admin clicks "View Responses" — frontend calls `GET /consent/responses/form/:formId`.
4. A table lists each student with their parent's name, response (Granted/Denied), date signed, and any notes.
5. Admin can export the response list (future scope).

---

## 5. Data Models

### 5.1 ConsentForm (MongoDB / Mongoose)

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | — | auto | MongoDB document ID |
| `schoolId` | ObjectId (ref: School) | Yes | — | Scopes form to a school |
| `title` | string | Yes | — | trimmed |
| `description` | string | No | — | Rich description of what is being consented to |
| `type` | string enum | Yes | — | `trip` \| `medical` \| `general` \| `photo` \| `data` |
| `targetStudents` | ObjectId[] (ref: Student) | No | `[]` | Students this form applies to |
| `requiresBothParents` | boolean | No | `false` | If true, both parents must respond |
| `expiryDate` | Date | No | — | After this date the form is overdue |
| `attachmentUrl` | string | No | — | URL to a PDF or supporting document |
| `createdBy` | ObjectId (ref: User) | Yes | — | Admin who created the form |
| `isDeleted` | boolean | No | `false` | Soft delete flag |
| `createdAt` | Date | — | auto | Mongoose timestamp |
| `updatedAt` | Date | — | auto | Mongoose timestamp |

**Indexes:**
- `{ schoolId: 1, type: 1 }`
- `{ schoolId: 1, createdAt: -1 }`

---

### 5.2 ConsentResponse (MongoDB / Mongoose)

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | — | auto | MongoDB document ID |
| `formId` | ObjectId (ref: ConsentForm) | Yes | — | The form being responded to |
| `studentId` | ObjectId (ref: Student) | Yes | — | The student this response is for |
| `parentId` | ObjectId (ref: Parent) | Yes | — | The parent submitting the response |
| `response` | string enum | Yes | — | `granted` \| `denied` |
| `signedAt` | Date | No | `Date.now` | Server-side timestamp of response |
| `ipAddress` | string | No | — | Captured client IP for audit trail |
| `signature` | string | No | — | Free-text digital signature |
| `notes` | string | No | — | Optional parent notes/comments |
| `isDeleted` | boolean | No | `false` | Soft delete flag |
| `createdAt` | Date | — | auto | Mongoose timestamp |
| `updatedAt` | Date | — | auto | Mongoose timestamp |

**Indexes:**
- `{ formId: 1, studentId: 1, parentId: 1 }` — **unique** (prevents duplicate responses)
- `{ formId: 1 }`

---

### 5.3 Frontend TypeScript Types (to be updated)

The current `ConsentForm` type in `src/types/index.ts` is a simplified mock-oriented projection. For API integration it should be extended to match the backend shape:

```ts
// Backend-aligned type
export interface ConsentForm {
  _id: string;
  schoolId: string;
  title: string;
  description?: string;
  type: 'trip' | 'medical' | 'general' | 'photo' | 'data';
  targetStudents: string[];
  requiresBothParents: boolean;
  expiryDate?: string;
  attachmentUrl?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentResponse {
  _id: string;
  formId: string;
  studentId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  parentId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  response: 'granted' | 'denied';
  signedAt: string;
  ipAddress?: string;
  signature?: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. State Management

There is no Zustand store for Consent yet. The current parent page uses local `useState` with mock data. For API integration the following store structure is recommended, consistent with how other modules in the codebase are wired.

### 6.1 Consent Store (`src/store/consentStore.ts`)

```ts
interface ConsentState {
  // Consent form list (admin)
  forms: ConsentForm[];
  formsTotal: number;
  formsPage: number;
  formsTotalPages: number;
  formsLoading: boolean;
  formsError: string | null;

  // Single form detail
  selectedForm: ConsentForm | null;
  formLoading: boolean;

  // Responses for a given form (admin)
  responses: ConsentResponse[];
  responsesTotal: number;
  responsesPage: number;
  responsesTotalPages: number;
  responsesLoading: boolean;

  // Outstanding forms for a student (parent)
  outstandingForms: ConsentForm[];
  outstandingLoading: boolean;

  // Actions
  fetchForms: (params: ListFormsParams) => Promise<void>;
  fetchForm: (id: string) => Promise<void>;
  createForm: (data: CreateConsentFormInput) => Promise<ConsentForm>;
  updateForm: (id: string, data: UpdateConsentFormInput) => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  recordResponse: (data: RecordConsentResponseInput) => Promise<void>;
  fetchResponsesByForm: (formId: string, params?: PaginationParams) => Promise<void>;
  fetchOutstandingConsents: (studentId: string) => Promise<void>;
}
```

### 6.2 API Service (`src/services/consentService.ts`)

Wraps `apiClient` (axios instance at `src/lib/api-client.ts`) for each endpoint:

```ts
export const consentService = {
  createForm: (data) => apiClient.post('/consent/forms', data),
  listForms: (params) => apiClient.get('/consent/forms', { params }),
  getForm: (id) => apiClient.get(`/consent/forms/${id}`),
  updateForm: (id, data) => apiClient.put(`/consent/forms/${id}`, data),
  deleteForm: (id) => apiClient.delete(`/consent/forms/${id}`),
  recordResponse: (data) => apiClient.post('/consent/responses', data),
  getResponsesByForm: (formId, params) =>
    apiClient.get(`/consent/responses/form/${formId}`, { params }),
  getOutstandingConsents: (studentId) =>
    apiClient.get(`/consent/responses/outstanding/${studentId}`),
};
```

---

## 7. Components Needed

### 7.1 Shared / Presentational

**`ConsentTypeBadge`**
- Props: `type: 'trip' | 'medical' | 'general' | 'photo' | 'data'`
- Renders a coloured badge for the consent type (e.g. "Trip" in blue, "Medical" in red)
- Used in both admin list and parent list views

**`ConsentStatusBadge`**
- Props: `status: 'pending' | 'granted' | 'denied'`
- Maps to amber/green/red badge styling (already partially implemented inline in the parent page)

**`ConsentFormCard`** (parent-facing)
- Props: `form: ConsentForm`, `onSign: () => void`, `onDecline: () => void`
- Renders the form title, description, type badge, expiry/due date, attachment link
- Shows Sign and Decline action buttons for pending forms
- Used in the parent consent page pending list

**`ConsentResponseRow`** (admin-facing)
- Props: `response: ConsentResponse`
- Single row in the admin responses table showing: student name, parent name, response status badge, signed date, notes

### 7.2 Admin Components

**`ConsentFormBuilder`**
- A controlled form (modal or full-page drawer) for creating and editing consent forms
- Fields: title, type select, description textarea, student multi-select, expiry date picker, attachment URL input, requiresBothParents toggle
- Calls `createForm` or `updateForm` from the store on submit
- Validates client-side before submit (mirrors Zod schema)

**`ConsentFormTable`**
- Paginated data table of consent forms for the admin view
- Columns: title, type, target student count, expiry date, created by, actions (edit/delete/view responses)
- Includes a type filter dropdown

**`ConsentResponsesPanel`**
- Displays for a selected form: a summary strip (granted/denied/outstanding counts) and the paginated `ConsentResponseRow` table
- Loaded when admin clicks "View Responses" on a form

**`DeleteConsentFormDialog`**
- Confirmation alert dialog for soft-deleting a consent form
- Warns that parents will no longer see the form

### 7.3 Parent Components

**`ConsentSignDialog`**
- Triggered when parent clicks "Sign" on a pending form
- Shows form title, description, optional attachment link
- Input for optional typed signature (name)
- Textarea for optional notes
- Confirm button calls `recordResponse` with `response: "granted"`

**`ConsentDeclineDialog`**
- Triggered when parent clicks "Decline"
- Optionally captures notes/reason
- Confirm button calls `recordResponse` with `response: "denied"`

---

## 8. Integration Notes

### 8.1 Event Module

The `ConsentForm` model includes no direct FK to an Event, but the frontend `ConsentForm` type has an optional `eventId` field (used in mock data for trip consent linked to a school event). When creating a trip consent form the admin flow should surface the Event picker so the `eventId` can be stored in the frontend/UI context. The backend model does not persist `eventId` — if this linkage is required in the backend it will need a schema migration to add an optional `eventId: ObjectId ref Event` field to `ConsentForm`.

### 8.2 Student Module

`targetStudents` is an array of Student ObjectIds. The `ConsentFormBuilder` must call the Student list API (`GET /students?schoolId=...`) to populate the multi-select picker. The `getOutstandingConsents` endpoint queries by `targetStudents: studentId` so the studentId passed must exactly match the `_id` stored in `targetStudents`.

### 8.3 Parent Module

The `recordResponse` endpoint is `authorize('parent')` — only users with the `parent` role can submit responses. The `parentId` field in the request body should be sourced from the authenticated user's profile (not user-inputtable) to prevent spoofing. The frontend should read `parentId` from auth state and inject it automatically.

### 8.4 requiresBothParents Logic

The backend stores `requiresBothParents: boolean` but does not enforce the "both parents must respond" constraint at the API layer — the uniqueness constraint only prevents duplicate responses from the same parent, not from enforcing that a second parent also responds. Any "both parents required" enforcement logic (e.g. showing a form as fully complete only when two responses exist) must be implemented in the frontend, or as a future service-layer enhancement.

### 8.5 Outstanding Consents — Multi-Child Parents

A parent may have multiple linked students. The parent portal should call `GET /consent/responses/outstanding/:studentId` for **each** of their linked students and merge the results, de-duplicating by `formId` if the same form targets multiple of their children. The current page does not implement this yet.

### 8.6 IP Address Capture

The `ipAddress` field in `recordConsentResponseSchema` is optional and client-submitted. For a more robust audit trail the backend service should capture the IP from `req.ip` (or `X-Forwarded-For`) and override the client-submitted value, rather than trusting the client.

### 8.7 Notifications

When a consent form is created and published, the Notification module should be triggered to alert targeted parents (push notification or in-app). This integration is not implemented in the Consent service — it will need to be added as a `NotificationService.send(...)` call in `ConsentService.createForm`.

### 8.8 API Base URL

The frontend `apiClient` defaults to `http://localhost:4000` (env `NEXT_PUBLIC_API_URL`). All consent API calls will be prefixed with this base, so actual calls are e.g. `http://localhost:4000/consent/forms`.

---

## 9. Acceptance Criteria

### Admin — Consent Form Management

- [ ] Admin can navigate to `/admin/consent` and see a paginated list of all non-deleted consent forms for their school
- [ ] Admin can filter the list by consent type
- [ ] Admin can create a new consent form with all required fields; the form appears in the list immediately on success
- [ ] Validation errors (missing title, invalid type, invalid URL) are surfaced inline before the API is called
- [ ] Admin can edit an existing form's title, description, type, targetStudents, expiryDate, attachmentUrl, and requiresBothParents flag
- [ ] Admin can soft-delete a form via a confirmation dialog; the form disappears from the list immediately
- [ ] Admin can view a response summary for any form (granted/denied/outstanding counts)
- [ ] Admin can drill into a form and see a paginated table of individual responses with student name, parent name, response status, date signed, and notes
- [ ] Teachers can also view form responses (`GET /consent/responses/form/:formId` is accessible to `teacher` role)

### Parent — Consent Responses

- [ ] Parent portal shows the correct count of pending consent forms for all linked children
- [ ] Parent can see the full title, description, type, due/expiry date, and attachment link for each pending form
- [ ] Parent can sign a form; a dialog captures optional typed signature and notes before submitting
- [ ] Parent can decline a form; a dialog captures optional notes/reason before submitting
- [ ] After signing or declining, the form immediately moves from the Pending section to the Completed section without a page reload
- [ ] Completed forms show the correct status badge (Signed / Declined) and the timestamp of the response
- [ ] The "All caught up" empty state is shown when no pending forms remain
- [ ] A parent cannot submit a second response for the same form/student combination (duplicate key error is handled gracefully with a user-facing message)

### Data Integrity

- [ ] Soft-deleted forms do not appear in any list endpoint
- [ ] The outstanding consents endpoint correctly excludes forms the student has already responded to
- [ ] `signedAt` is server-set (defaults to `Date.now`); it is not overridable via the request body
- [ ] The unique index on `(formId, studentId, parentId)` prevents duplicate responses at the database level

### Auth & Authorisation

- [ ] Unauthenticated requests to all `/consent/*` endpoints return 401
- [ ] `POST /consent/forms`, `PUT /consent/forms/:id`, `DELETE /consent/forms/:id` return 403 for non-admin roles
- [ ] `POST /consent/responses` returns 403 for non-parent roles
- [ ] `GET /consent/responses/form/:formId` returns 403 for `parent` and `student` roles
