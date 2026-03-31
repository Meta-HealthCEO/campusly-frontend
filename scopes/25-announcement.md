# 25 — Announcement Module

## 1. Module Overview

The Announcement module enables school administrators (`super_admin`, `school_admin`) to compose, publish, and manage school-wide or targeted announcements. Announcements can be directed at specific audiences (all users, teachers, parents, students, a specific grade, or a specific class), assigned a priority level, pinned to the top of feeds, scheduled for future publication, and set to expire automatically.

All authenticated users can read announcements that are relevant to their role. Read receipts are tracked per user via a `readBy` array, allowing admins to monitor engagement through a read-rate metric. Soft deletion is used throughout — no announcement document is ever hard-deleted from the database.

The module prefix on the backend is `/api/announcements` (inferred from the router export convention used across the project).

---

## 2. Backend API Endpoints

### 2.1 Create Announcement

**Method + Path:** `POST /api/announcements`

**Auth required:** Yes — `super_admin` or `school_admin`

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | `string` | Yes | min length 1 |
| `content` | `string` | Yes | min length 1 |
| `schoolId` | `string` | Yes | valid 24-char MongoDB ObjectId |
| `targetAudience` | `string` | Yes | enum: `all`, `teachers`, `parents`, `students`, `grade`, `class` |
| `targetId` | `string` | No | valid 24-char MongoDB ObjectId — required when `targetAudience` is `grade` or `class` to identify the specific grade/class document |
| `attachments` | `string[]` | No | array of URL strings |
| `priority` | `string` | No | enum: `low`, `medium`, `high`, `urgent` — defaults to `medium` |
| `expiresAt` | `string` | No | ISO 8601 datetime string |
| `pinned` | `boolean` | No | defaults to `false` |
| `scheduledPublishDate` | `string` | No | ISO 8601 datetime string |

**Example request:**
```json
POST /api/announcements
Authorization: Bearer <token>

{
  "title": "Term 2 Start Date",
  "content": "Term 2 begins on 14 April 2026. All students must be in full uniform.",
  "schoolId": "64a1f2b3c4d5e6f7a8b9c0d1",
  "targetAudience": "all",
  "priority": "high",
  "pinned": true,
  "expiresAt": "2026-04-15T00:00:00.000Z"
}
```

**Response — 201 Created:**
```json
{
  "success": true,
  "data": {
    "_id": "64b2c3d4e5f6a7b8c9d0e1f2",
    "title": "Term 2 Start Date",
    "content": "Term 2 begins on 14 April 2026. All students must be in full uniform.",
    "schoolId": "64a1f2b3c4d5e6f7a8b9c0d1",
    "authorId": "64a1f2b3c4d5e6f7a8b9c0d2",
    "targetAudience": "all",
    "targetId": null,
    "attachments": [],
    "priority": "high",
    "isPublished": false,
    "pinned": true,
    "publishedAt": null,
    "expiresAt": "2026-04-15T00:00:00.000Z",
    "scheduledPublishDate": null,
    "readBy": [],
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Announcement created successfully"
}
```

---

### 2.2 List Announcements (Admin)

**Method + Path:** `GET /api/announcements`

**Auth required:** Yes — any authenticated user

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `schoolId` | `string` | Filter by school. Falls back to `req.user.schoolId` if omitted. |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: determined by `paginationHelper`) |
| `sort` | `string` | Mongoose sort string e.g. `-createdAt` (default: `-createdAt`) |

**Behaviour:** Returns ALL non-deleted announcements for the school regardless of publish state. Intended for admin management views. `authorId` is populated with `firstName`, `lastName`, `email`.

**Example request:**
```
GET /api/announcements?schoolId=64a1f2b3c4d5e6f7a8b9c0d1&page=1&limit=20
Authorization: Bearer <token>
```

**Response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "_id": "64b2c3d4e5f6a7b8c9d0e1f2",
        "title": "Term 2 Start Date",
        "content": "Term 2 begins on 14 April 2026...",
        "schoolId": "64a1f2b3c4d5e6f7a8b9c0d1",
        "authorId": {
          "_id": "64a1f2b3c4d5e6f7a8b9c0d2",
          "firstName": "Thabo",
          "lastName": "Molefe",
          "email": "thabo@school.edu"
        },
        "targetAudience": "all",
        "priority": "high",
        "isPublished": true,
        "pinned": true,
        "publishedAt": "2026-03-31T09:00:00.000Z",
        "expiresAt": "2026-04-15T00:00:00.000Z",
        "readBy": ["64a1f2b3c4d5e6f7a8b9c0d3"],
        "isDeleted": false,
        "createdAt": "2026-03-31T08:00:00.000Z",
        "updatedAt": "2026-03-31T09:00:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "message": "Announcements retrieved successfully"
}
```

---

### 2.3 Get Active Announcements (Feed)

**Method + Path:** `GET /api/announcements/active`

**Auth required:** Yes — any authenticated user

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `schoolId` | `string` | Falls back to `req.user.schoolId` if omitted. Required — returns 400 if neither source provides it. |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page |

**Behaviour:** Returns only published, non-expired, non-deleted announcements whose `targetAudience` matches the requesting user's role. Role-to-audience mapping:

- `teacher` → sees `all` + `teachers`
- `parent` → sees `all` + `parents`
- `student` → sees `all` + `students`
- `super_admin` / `school_admin` → sees all audiences (`all`, `teachers`, `parents`, `students`, `grade`, `class`)

Note: grade- and class-targeted announcements (`targetAudience: 'grade'` or `'class'`) are currently only visible to admins via this endpoint. Additional filtering by `targetId` matching the user's enrolled grade/class is not yet implemented in the service layer.

Results are sorted by `publishedAt` descending. `authorId` is populated.

**Example request:**
```
GET /api/announcements/active?page=1&limit=10
Authorization: Bearer <token>
```

**Response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "announcements": [ /* same shape as list endpoint */ ],
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "message": "Active announcements retrieved successfully"
}
```

**Error — 400 Bad Request (missing schoolId):**
```json
{
  "success": false,
  "error": "School ID is required"
}
```

---

### 2.4 Get Announcement by ID

**Method + Path:** `GET /api/announcements/:id`

**Auth required:** Yes — any authenticated user

**Path parameter:** `id` — MongoDB ObjectId of the announcement

**Response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "_id": "64b2c3d4e5f6a7b8c9d0e1f2",
    "title": "Term 2 Start Date",
    "content": "Term 2 begins on 14 April 2026...",
    "authorId": {
      "_id": "64a1f2b3c4d5e6f7a8b9c0d2",
      "firstName": "Thabo",
      "lastName": "Molefe",
      "email": "thabo@school.edu"
    },
    "targetAudience": "all",
    "priority": "high",
    "isPublished": true,
    "pinned": true,
    "readBy": ["64a1f2b3c4d5e6f7a8b9c0d3"],
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T09:00:00.000Z"
  },
  "message": "Announcement retrieved successfully"
}
```

**Error — 404 Not Found:**
```json
{
  "success": false,
  "error": "Announcement not found"
}
```

---

### 2.5 Update Announcement

**Method + Path:** `PUT /api/announcements/:id`

**Auth required:** Yes — `super_admin` or `school_admin`

**Request body (all fields optional):**

| Field | Type | Validation |
|---|---|---|
| `title` | `string` | min length 1 |
| `content` | `string` | min length 1 |
| `targetAudience` | `string` | enum: `all`, `teachers`, `parents`, `students`, `grade`, `class` |
| `targetId` | `string` | valid 24-char ObjectId |
| `attachments` | `string[]` | array of URL strings |
| `priority` | `string` | enum: `low`, `medium`, `high`, `urgent` |
| `expiresAt` | `string` | ISO 8601 datetime string |

Note: `pinned` and `scheduledPublishDate` are not included in the update schema — they cannot be changed via this endpoint. Publish state is managed exclusively via the dedicated `/publish` and `/unpublish` endpoints.

**Example request:**
```json
PUT /api/announcements/64b2c3d4e5f6a7b8c9d0e1f2
Authorization: Bearer <token>

{
  "title": "Term 2 Start Date — Updated",
  "priority": "urgent"
}
```

**Response — 200 OK:**
```json
{
  "success": true,
  "data": { /* full announcement object with populated authorId */ },
  "message": "Announcement updated successfully"
}
```

---

### 2.6 Delete Announcement (Soft)

**Method + Path:** `DELETE /api/announcements/:id`

**Auth required:** Yes — `super_admin` or `school_admin`

**Behaviour:** Sets `isDeleted: true`. The document is not removed from the database.

**Response — 200 OK:**
```json
{
  "success": true,
  "data": null,
  "message": "Announcement deleted successfully"
}
```

**Error — 404 Not Found:**
```json
{
  "success": false,
  "error": "Announcement not found"
}
```

---

### 2.7 Publish Announcement

**Method + Path:** `PATCH /api/announcements/:id/publish`

**Auth required:** Yes — `super_admin` or `school_admin`

**Behaviour:** Sets `isPublished: true` and records the current timestamp as `publishedAt`. Returns the updated announcement with populated `authorId`.

**Response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "_id": "64b2c3d4e5f6a7b8c9d0e1f2",
    "isPublished": true,
    "publishedAt": "2026-03-31T10:00:00.000Z",
    "authorId": { "firstName": "Thabo", "lastName": "Molefe", "email": "thabo@school.edu" }
    /* ... other fields */
  },
  "message": "Announcement published successfully"
}
```

---

### 2.8 Unpublish Announcement

**Method + Path:** `PATCH /api/announcements/:id/unpublish`

**Auth required:** Yes — `super_admin` or `school_admin`

**Behaviour:** Sets `isPublished: false`. `publishedAt` is NOT cleared — it retains the timestamp of when the announcement was last published.

**Response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "_id": "64b2c3d4e5f6a7b8c9d0e1f2",
    "isPublished": false,
    "publishedAt": "2026-03-31T10:00:00.000Z"
    /* ... other fields */
  },
  "message": "Announcement unpublished successfully"
}
```

---

## 3. Frontend Pages

### 3.1 Admin — Announcements Management (`/admin/announcements`)

**File:** `src/app/(dashboard)/admin/announcements/page.tsx`

**Current state:** Fully scaffolded UI with mock data. Not yet wired to the API.

**Layout:**
- `PageHeader` with title "Announcements" and a "New Announcement" button that opens a `Dialog`
- Four `StatCard` components in a responsive grid:
  - Total Announcements (count of all announcements)
  - Pinned (count of pinned announcements)
  - Scheduled (count of announcements with `status === 'scheduled'`)
  - Avg Read Rate (average read rate percentage across published announcements)
- A two-column layout below the stats:
  - Left column (2/3 width): `DataTable` of announcements with search on the `title` field
  - Right column (1/3 width): `AnnouncementDetail` panel — shows when a "View" action is clicked; otherwise shows a placeholder prompt

**DataTable columns:**
1. Pin indicator — star icon shown if `isPinned` is true
2. Title — bold font
3. Audience — `Badge` with colour-coded style (`whole_school`: purple, `grade`: blue, `class`: orange)
4. Priority — `Badge` with colour-coded style (`normal`: slate, `important`: amber, `urgent`: red)
5. Date — formatted publish date
6. Status — `Badge` (`published`: emerald, `draft`: gray, `scheduled`: blue)
7. Read Rate — `sentTo / readBy` percentage; shows "–" for unsent announcements
8. Actions — "View" button for all rows; "Publish" button only on rows with `status === 'draft'`

**Create Announcement Dialog fields:**
- Title (text input)
- Body (textarea, 4 rows)
- Target Audience (Select — currently hardcoded options: Whole School, Grade 8–12, Class 8A/8B)
- Priority (Select — Normal, Important, Urgent)
- Publish Date (date input)
- Attachment URL (text input)
- Pin to top (Switch toggle)

**AnnouncementDetail panel fields:**
- Title with optional pin star
- Author name, formatted publish date, priority badge
- Body text
- Read receipt stats block: "Sent to", "Read by", "Read rate" (shown only when `sentTo > 0`)

**Gap between mock data and backend model:**
The frontend uses a `priority` enum of `normal | important | urgent`, while the backend uses `low | medium | high | urgent`. The frontend `target` field uses `whole_school` while the backend uses `all`. These discrepancies must be resolved during API wiring.

---

### 3.2 Dashboard Announcement Banner (not yet built)

All role dashboards (admin, teacher, parent, student) should display active announcements relevant to the current user. This surface does not yet exist. See Section 7 for the `AnnouncementBanner` component specification.

---

## 4. User Flows

### 4.1 Create and Publish Announcement

1. Admin navigates to `/admin/announcements`.
2. Admin clicks "New Announcement" — the `Dialog` opens.
3. Admin fills in: title, content/body, target audience, priority, optional publish date, optional attachment URL, optional pin toggle.
4. Admin clicks "Create Announcement":
   - Frontend calls `POST /api/announcements` with `isPublished: false`.
   - On success, the new announcement appears in the table with `status: draft`.
5. Admin clicks "Publish" on the draft row:
   - Frontend calls `PATCH /api/announcements/:id/publish`.
   - `isPublished` becomes `true`, `publishedAt` is set to now.
   - Row status badge changes to `published`.
   - Announcement becomes visible to targeted users via `/api/announcements/active`.

### 4.2 Scheduled Publication

1. Admin creates an announcement with `scheduledPublishDate` set to a future datetime.
2. Announcement is saved with `isPublished: false` and `status: scheduled` in the UI.
3. A background job (not yet implemented in the service layer) would check `scheduledPublishDate` and call the publish logic automatically. Until that job exists, admins must publish manually.

### 4.3 Targeting a Specific Audience

- `targetAudience: 'all'` — every user in the school sees the announcement.
- `targetAudience: 'teachers'` — only users with `role: teacher` see it in their feed.
- `targetAudience: 'parents'` — only users with `role: parent` see it.
- `targetAudience: 'students'` — only users with `role: student` see it.
- `targetAudience: 'grade'` — admin must also supply `targetId` pointing to a Grade document. Currently only admins receive these in `getActive`; per-student/parent grade filtering is a future enhancement.
- `targetAudience: 'class'` — admin must supply `targetId` pointing to a Class document. Same caveat as `grade`.

### 4.4 Pinning an Announcement

1. Admin checks "Pin to top" when creating an announcement (`pinned: true`).
2. Frontend and backend store `pinned: true` on the document.
3. Pinned announcements should be sorted to the top of all feed views. The current service sorts by `publishedAt` descending — frontend must apply a secondary sort that elevates pinned items.

### 4.5 User Views Announcement Feed

1. Any authenticated user navigates to their dashboard.
2. Dashboard fetches `GET /api/announcements/active` (no `schoolId` query param needed — falls back to JWT's `schoolId`).
3. Backend filters by `isPublished: true`, `isDeleted: false`, `targetAudience` matching the user's role, and `expiresAt` either absent or in the future.
4. Results are displayed newest-first; pinned items surfaced first.
5. When a user opens/reads an announcement, the frontend calls the appropriate endpoint to register the read (see Section 8 — this capability is not yet a dedicated endpoint; the `readBy` array is on the model but there is no `PATCH /:id/read` route currently).

### 4.6 Edit Announcement

1. Admin clicks an action to edit an existing announcement (not yet implemented in the UI).
2. Form pre-fills with current values.
3. Admin submits — frontend calls `PUT /api/announcements/:id` with changed fields only.
4. Note: publish state cannot be changed via PUT; use the publish/unpublish endpoints.

### 4.7 Delete Announcement

1. Admin triggers delete (not yet implemented as a UI button).
2. Frontend calls `DELETE /api/announcements/:id`.
3. Announcement is soft-deleted (`isDeleted: true`) and disappears from all filtered queries.

---

## 5. Data Models

### 5.1 Announcement (MongoDB document)

```
Announcement {
  _id:                  ObjectId
  title:                string          — required, trimmed
  content:              string          — required
  schoolId:             ObjectId        — ref: School, required
  authorId:             ObjectId        — ref: User, required (set from JWT on create)
  targetAudience:       enum            — 'all' | 'teachers' | 'parents' | 'students' | 'grade' | 'class'
  targetId:             ObjectId?       — ref: Grade or Class document; only relevant when targetAudience is 'grade' or 'class'
  attachments:          string[]        — default []
  priority:             enum            — 'low' | 'medium' | 'high' | 'urgent', default 'medium'
  publishedAt:          Date?           — set when publish action fires
  expiresAt:            Date?           — if set, announcement stops appearing in active feeds after this date
  isPublished:          boolean         — default false
  pinned:               boolean         — default false
  scheduledPublishDate: Date?           — intended future-publish date (no background job yet)
  readBy:               ObjectId[]      — ref: User, default []; tracks who has read the announcement
  isDeleted:            boolean         — default false (soft delete)
  createdAt:            Date            — auto (Mongoose timestamps)
  updatedAt:            Date            — auto (Mongoose timestamps)
}
```

**Indexes:**
- `{ schoolId: 1, isPublished: 1, publishedAt: -1 }` — optimises the active-feed query
- `{ schoolId: 1, targetAudience: 1 }` — optimises audience-targeted lookups

### 5.2 Frontend Type (current mock — needs reconciliation with backend)

```typescript
interface Announcement {
  id: string
  title: string
  body: string                                         // maps to backend `content`
  target: 'whole_school' | 'grade' | 'class'          // maps to backend `targetAudience` (whole_school → 'all')
  targetLabel: string                                  // display label, not stored on backend
  priority: 'normal' | 'important' | 'urgent'         // backend uses 'low' | 'medium' | 'high' | 'urgent'
  publishDate: string
  isPinned: boolean                                    // maps to backend `pinned`
  status: 'published' | 'draft' | 'scheduled'         // derived from isPublished + scheduledPublishDate
  sentTo: number                                       // not stored on backend (would require aggregation)
  readBy: number                                       // frontend shows count; backend stores array of IDs
  attachmentUrl?: string                               // backend stores `attachments: string[]`
  createdBy: string                                    // maps to populated authorId.firstName + lastName
}
```

---

## 6. State Management

### 6.1 Announcement Store

The module requires a Zustand store (following the pattern established in the rest of the codebase). Suggested file: `src/store/announcementStore.ts`.

```typescript
interface AnnouncementState {
  // Admin list state
  announcements: Announcement[]
  total: number
  page: number
  totalPages: number
  loading: boolean
  error: string | null

  // Feed state (for dashboard banners)
  activeAnnouncements: Announcement[]
  activeLoading: boolean

  // Detail panel
  selected: Announcement | null

  // Dialog
  createDialogOpen: boolean

  // Actions
  fetchAnnouncements: (params: { schoolId?: string; page?: number; limit?: number; sort?: string }) => Promise<void>
  fetchActive: (params?: { page?: number; limit?: number }) => Promise<void>
  fetchById: (id: string) => Promise<void>
  createAnnouncement: (data: CreateAnnouncementInput) => Promise<void>
  updateAnnouncement: (id: string, data: UpdateAnnouncementInput) => Promise<void>
  deleteAnnouncement: (id: string) => Promise<void>
  publishAnnouncement: (id: string) => Promise<void>
  unpublishAnnouncement: (id: string) => Promise<void>
  setSelected: (announcement: Announcement | null) => void
  setCreateDialogOpen: (open: boolean) => void
}
```

### 6.2 API Client calls

All calls use the existing `apiClient` (Axios instance at `src/lib/api-client.ts`). Base path: `/announcements`.

| Action | Method | Path |
|---|---|---|
| List | GET | `/announcements?schoolId=&page=&limit=&sort=` |
| Get active feed | GET | `/announcements/active?page=&limit=` |
| Get by ID | GET | `/announcements/:id` |
| Create | POST | `/announcements` |
| Update | PUT | `/announcements/:id` |
| Delete | DELETE | `/announcements/:id` |
| Publish | PATCH | `/announcements/:id/publish` |
| Unpublish | PATCH | `/announcements/:id/unpublish` |

---

## 7. Components Needed

### 7.1 `AnnouncementForm`

**Path:** `src/components/announcements/AnnouncementForm.tsx`

**Purpose:** Shared form used in both the create dialog and a future edit dialog/drawer.

**Props:**
```typescript
interface AnnouncementFormProps {
  defaultValues?: Partial<CreateAnnouncementInput>
  onSubmit: (data: CreateAnnouncementInput) => void | Promise<void>
  isLoading?: boolean
  mode?: 'create' | 'edit'
}
```

**Fields:**
- Title (`Input`, required)
- Content/Body (`Textarea`, required, min 4 rows)
- Target Audience (`Select`) — options: All, Teachers, Parents, Students, Grade (with `targetId` sub-select), Class (with `targetId` sub-select). When `grade` or `class` is selected, a second `Select` appears populated from the school's grade/class list.
- Priority (`Select`) — Low, Medium, High, Urgent
- Expires At (`Input type="datetime-local"`, optional)
- Scheduled Publish Date (`Input type="datetime-local"`, optional)
- Attachments (multi-input for URLs, optional)
- Pin to top (`Switch`)

**Validation:** Use `react-hook-form` with the Zod `createAnnouncementSchema` / `updateAnnouncementSchema` adapted for the frontend.

---

### 7.2 `AnnouncementList`

**Path:** `src/components/announcements/AnnouncementList.tsx`

**Purpose:** Admin `DataTable` wrapper that renders the announcement table with correct columns, handles row click to set `selected` in the store, and wires the "Publish" and "View" actions to store actions.

**Props:**
```typescript
interface AnnouncementListProps {
  announcements: Announcement[]
  onView: (announcement: Announcement) => void
  onPublish: (id: string) => void
  onUnpublish: (id: string) => void
  onDelete: (id: string) => void
}
```

---

### 7.3 `AnnouncementDetail`

**Path:** `src/components/announcements/AnnouncementDetail.tsx`

**Purpose:** Read-only detail panel currently inlined in the page. Extract as a named component. Shows title, author, date, priority, body text, and read-receipt stats (sent to / read by / read rate).

**Props:**
```typescript
interface AnnouncementDetailProps {
  announcement: Announcement
  onEdit?: () => void
  onDelete?: () => void
  onPublish?: () => void
  onUnpublish?: () => void
}
```

---

### 7.4 `AnnouncementBanner`

**Path:** `src/components/announcements/AnnouncementBanner.tsx`

**Purpose:** Compact feed widget shown on role dashboards. Displays the most recent active announcements for the current user, with pinned items at the top. Suitable for embedding in the sidebar or as a card on the dashboard grid.

**Props:**
```typescript
interface AnnouncementBannerProps {
  limit?: number          // default 3
  showPinnedOnly?: boolean
}
```

**Behaviour:**
- On mount, calls `fetchActive` from the store.
- Renders each announcement as a row: priority colour indicator bar on the left edge, title, abbreviated content (1–2 lines, clamped), relative timestamp, and a pin icon if `pinned: true`.
- Urgent priority announcements render with a red accent and an alert icon.
- "View all" link routes to an announcements feed page (e.g. `/parent/announcements` or `/teacher/announcements` — these pages are yet to be built).

---

### 7.5 `AnnouncementStatusBadge`

**Path:** `src/components/announcements/AnnouncementStatusBadge.tsx`

**Purpose:** Derives display status from the raw backend fields (`isPublished`, `scheduledPublishDate`) and renders the appropriate `Badge`. Centralises the mapping logic that is currently duplicated in mock data.

**Logic:**
```
if isPublished === true  → 'published'   (emerald)
if scheduledPublishDate is set and isPublished === false → 'scheduled' (blue)
else → 'draft' (gray)
```

---

### 7.6 `AnnouncementPriorityBadge`

**Path:** `src/components/announcements/AnnouncementPriorityBadge.tsx`

**Purpose:** Maps backend priority values (`low`, `medium`, `high`, `urgent`) to display labels and badge colours. Resolves the current mismatch between mock data labels and backend enum values.

**Mapping:**
```
low    → 'Low'    (slate)
medium → 'Medium' (slate)
high   → 'High'   (amber)
urgent → 'Urgent' (red)
```

---

## 8. Integration Notes

### 8.1 Audience Filtering Gap for Grade/Class

When `targetAudience` is `grade` or `class`, the `getActive` service filters only by the enum value — it does not cross-reference `targetId` against the requesting user's enrolled grade or class. This means a student in Grade 8 would not receive a grade-targeted announcement aimed at Grade 9.

**Required enhancement:** The service must accept the user's `gradeId` or `classId` (from the JWT or a user profile lookup) and add an `$or` clause: `{ targetId: userGradeId }` alongside the audience check. Until this is implemented, grade- and class-targeted announcements are only reliably delivered via the admin view.

### 8.2 Read Receipt Tracking

The `readBy` array on the `Announcement` model supports read-receipt tracking, but there is currently no endpoint to register a read. A `PATCH /api/announcements/:id/read` endpoint is needed. It should push `req.user.id` into `readBy` using `$addToSet` (to avoid duplicates) without returning the full populated document (performance consideration given large `readBy` arrays).

The frontend "Read Rate" stat must change from displaying `sentTo` (a derived/estimated count not stored on the backend) to computing `readBy.length / recipientCount`. Until `sentTo` is tracked, the denominator could be approximated from the school's user count for the targeted audience.

### 8.3 Scheduled Publishing

`scheduledPublishDate` is stored but there is no background job to auto-publish. Options:
1. A cron job in the backend that runs periodically (e.g. every 5 minutes) and calls the publish logic for all announcements where `isPublished: false && scheduledPublishDate <= now`.
2. A webhook or queue-based delayed job.

Until implemented, the frontend should make the scheduled state visible but also surface a manual "Publish now" button on scheduled announcements.

### 8.4 Notification Push on Publish

When an announcement is published, the school's notification system (push notifications / in-app alerts) should be triggered for the targeted audience. The current `publish` service method does not call the Notification module. This integration point must be wired:

```
AnnouncementService.publish(id)
  → after Announcement.findOneAndUpdate(...)
  → call NotificationService.sendToAudience({
      schoolId,
      targetAudience,
      targetId,
      title: announcement.title,
      body: announcement.content.slice(0, 140),
      referenceType: 'announcement',
      referenceId: announcement._id,
    })
```

This is a backend concern but the frontend should handle the optimistic UX: after clicking Publish, show a toast confirming that notifications have been dispatched.

### 8.5 Attachment Handling

The model stores `attachments` as an array of URL strings. The frontend currently has a single "Attachment URL" text input. The full implementation should support:
- Multiple attachments
- File upload to cloud storage (S3 or similar) with the returned URL written into the array
- Display of attachment links/previews in `AnnouncementDetail`

### 8.6 Route Prefix

The router is exported as a default from `routes.ts` and mounted by the app's main router. Confirm the mount path is `/api/announcements` (consistent with all other modules in the project).

### 8.7 Priority Enum Reconciliation

The frontend currently uses `normal | important | urgent` (three values). The backend uses `low | medium | high | urgent` (four values). When wiring the API:

- Replace all frontend references to `normal` with `low` or `medium` as appropriate.
- Replace `important` with `high`.
- Update badge styles, Select options, and filter logic accordingly.

---

## 9. Acceptance Criteria

### 9.1 Admin — Create Announcement

- [ ] Admin can open the "New Announcement" dialog from the Announcements page.
- [ ] Form validates: title and content are required; audience is required.
- [ ] When `targetAudience` is `grade` or `class`, a secondary select appears for choosing the specific grade or class (`targetId`).
- [ ] Priority defaults to `medium` if not selected.
- [ ] Submitting the form calls `POST /api/announcements` with the correct payload.
- [ ] On success, the new announcement appears in the table with status `draft` and a toast confirms creation.
- [ ] On API error, a descriptive error toast is shown and the dialog remains open.

### 9.2 Admin — Publish / Unpublish

- [ ] Draft announcements show a "Publish" action button.
- [ ] Clicking "Publish" calls `PATCH /api/announcements/:id/publish`.
- [ ] After publish, the row's status badge changes to `published` and the "Publish" button is replaced by an "Unpublish" option.
- [ ] Clicking "Unpublish" calls `PATCH /api/announcements/:id/unpublish`.
- [ ] After unpublish, the row returns to `draft` state.
- [ ] A success toast is shown for both actions.

### 9.3 Admin — Edit Announcement

- [ ] An "Edit" action is available on each row (or in the detail panel).
- [ ] Clicking "Edit" opens the `AnnouncementForm` pre-filled with current values.
- [ ] Submitting calls `PUT /api/announcements/:id` with only the changed fields.
- [ ] Publish state cannot be changed via the edit form.
- [ ] `pinned` and `scheduledPublishDate` are editable separately (not blocked by the update schema gap — if needed, extend the update schema on the backend).
- [ ] Success toast and table refresh on completion.

### 9.4 Admin — Delete Announcement

- [ ] A "Delete" action is available on each row (with a confirmation prompt).
- [ ] Clicking confirm calls `DELETE /api/announcements/:id`.
- [ ] The row is removed from the table optimistically and confirmed via re-fetch.
- [ ] Success toast is shown.

### 9.5 Admin — View Detail Panel

- [ ] Clicking "View" on a row sets `selectedAnnouncement` in component/store state.
- [ ] The `AnnouncementDetail` panel renders on the right with: title, pin indicator, author name, publish date, priority badge, full body text.
- [ ] If the announcement is published (`sentTo > 0` in the real implementation: `readBy.length > 0`), read-receipt stats are shown.
- [ ] If no announcement is selected, the placeholder prompt is shown.

### 9.6 Admin — Stats Cards

- [ ] Total count reflects all non-deleted announcements for the school.
- [ ] Pinned count reflects `pinned: true` announcements.
- [ ] Scheduled count reflects announcements with `scheduledPublishDate` set and `isPublished: false`.
- [ ] Avg Read Rate is computed from published announcements with at least one recipient.
- [ ] All four stats update reactively after any create/publish/delete action.

### 9.7 Active Feed — All Roles

- [ ] On each role dashboard, the `AnnouncementBanner` component fetches and displays active announcements via `GET /api/announcements/active`.
- [ ] Only announcements matching the user's role are shown (audience filtering is enforced by the backend).
- [ ] Pinned announcements appear before non-pinned ones.
- [ ] Expired announcements (`expiresAt < now`) are not shown.
- [ ] Urgent announcements are visually distinguished (red accent / alert icon).
- [ ] A "View all" link is present.

### 9.8 Priority and Status Alignment

- [ ] Frontend priority values match the backend enum (`low`, `medium`, `high`, `urgent`) — no `normal` or `important` values remain in production code.
- [ ] Frontend audience value `whole_school` is replaced with `all` to match the backend enum.
- [ ] Status is derived from `isPublished` and `scheduledPublishDate` rather than stored as a separate field.

### 9.9 Error Handling

- [ ] 401 / 403 responses from any announcement endpoint redirect to login or show an "Unauthorised" toast.
- [ ] 404 response on get/update/delete shows a "Announcement not found" toast.
- [ ] Network errors show a generic "Something went wrong" toast and do not corrupt local state.

### 9.10 Performance

- [ ] List and active-feed queries use pagination (`page` + `limit`).
- [ ] The admin table supports at least 50 rows per page.
- [ ] The dashboard `AnnouncementBanner` fetches no more than 5 announcements by default (passes `limit=5`).
