# 22 — Lost & Found Module

## 1. Module Overview

The Lost & Found module allows school staff and parents to log, track, and resolve lost and found items. Staff (teachers, school admins, super admins) report items that have been found on school premises. Parents can browse the found-item gallery and submit lost-item reports for their children. The system supports automatic match suggestions, manual item matching, a claim-and-verify workflow, and bulk archiving of stale unclaimed items.

**Roles and primary capabilities:**

| Role | Capabilities |
|---|---|
| `school_admin` / `super_admin` | Log found items, view all items/stats, claim items, verify and return claimed items, match lost to found, archive old items, soft delete items |
| `teacher` | Log found items, view all items, claim items, match lost to found, view suggestions |
| `parent` | Report lost items for their children, browse found-item gallery, claim found items |
| Any authenticated user | Read items list, read item detail, read stats, read auto-match suggestions |

**Base API path:** `/api/lost-found` (mounted under the school's API router)

---

## 2. Backend API Endpoints

All endpoints require `authenticate` middleware. Authorization requirements per endpoint are noted below.

---

### 2.1 POST / — Report item (found or lost)

**Auth:** `authenticate` + `authorize('teacher', 'school_admin', 'super_admin', 'parent')`

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | `string` | Yes | 24-char hex ObjectId |
| `type` | `'found' \| 'lost'` | Yes | Must be one of the enum values |
| `itemName` | `string` | Yes | min length 1, trimmed |
| `description` | `string` | Yes | min length 1, trimmed |
| `category` | `string` | Yes | One of: `clothing`, `stationery`, `electronics`, `sports_equipment`, `lunch_box`, `bag`, `jewellery`, `other` |
| `locationFound` | `string` | No | trimmed; relevant when `type === 'found'` |
| `locationLost` | `string` | No | trimmed; relevant when `type === 'lost'` |
| `dateFound` | `string` (ISO 8601 datetime) | No | Must be a valid datetime string |
| `dateLost` | `string` (ISO 8601 datetime) | No | Must be a valid datetime string |
| `photos` | `string[]` | No | Array of valid URLs |
| `studentId` | `string` | No | 24-char hex ObjectId |

**Behaviour:**
- When `type === 'found'`: creates a document with `type: 'found'`, `status: 'found'`, `dateFound` defaults to `new Date()` if omitted.
- When `type === 'lost'`: creates a document with `type: 'lost'`, `status: 'found'` (the initial holding status), `dateLost` defaults to `new Date()` if omitted.
- `reportedBy` is set from the authenticated user's `id`.

**Response:** HTTP 201

```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0aa",
    "reportedBy": "64f1a2b3c4d5e6f7a8b9c0bb",
    "type": "found",
    "status": "found",
    "itemName": "Blue School Jacket",
    "description": "Size 10, name tag inside reads 'John'",
    "category": "clothing",
    "locationFound": "Sports Field",
    "dateFound": "2026-03-28T00:00:00.000Z",
    "photos": ["https://cdn.example.com/jacket.jpg"],
    "studentId": null,
    "parentNotified": false,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Item reported successfully"
}
```

**Example request:**

```json
POST /api/lost-found
{
  "schoolId": "64f1a2b3c4d5e6f7a8b9c0aa",
  "type": "found",
  "itemName": "Blue School Jacket",
  "description": "Size 10, name tag inside reads 'John'",
  "category": "clothing",
  "locationFound": "Sports Field",
  "dateFound": "2026-03-28T00:00:00.000Z",
  "photos": ["https://cdn.example.com/jacket.jpg"]
}
```

---

### 2.2 GET /stats — Lost & found statistics

**Auth:** `authenticate` (any authenticated user)

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `schoolId` | `string` | No | Falls back to `req.user.schoolId`. Returns 400 if neither is present. |

**Response:** HTTP 200

```json
{
  "success": true,
  "data": {
    "totalFound": 42,
    "totalClaimed": 18,
    "totalUnclaimed": 15,
    "totalReturned": 9,
    "avgDaysToClaim": 3.2
  },
  "message": "Stats retrieved successfully"
}
```

**Stat definitions:**
- `totalFound`: count of all non-deleted items where `type === 'found'`
- `totalClaimed`: count of all non-deleted items where `status === 'claimed'`
- `totalUnclaimed`: count of all non-deleted items where `status === 'found'` AND `type === 'found'`
- `totalReturned`: count of all non-deleted items where `status === 'returned'`
- `avgDaysToClaim`: average days between `createdAt` and `claimedDate` across all claimed items, rounded to 1 decimal place; `0` if no claims exist

---

### 2.3 GET / — List items (filterable, paginated)

**Auth:** `authenticate` (any authenticated user)

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `schoolId` | `string` | No | Falls back to `req.user.schoolId`. Returns 400 if neither present. |
| `status` | `string` | No | Filter by `status` field (`found`, `claimed`, `archived`, `returned`) |
| `category` | `string` | No | Filter by category enum value |
| `type` | `string` | No | Filter by `type` field (`found` or `lost`) |
| `startDate` | `string` | No | Filter items created on or after this date |
| `endDate` | `string` | No | Filter items created on or before this date |
| `page` | `number` | No | Page number (parsed as integer) |
| `limit` | `number` | No | Items per page (parsed as integer) |

Items are sorted by `createdAt` descending. Soft-deleted items (`isDeleted: true`) are always excluded.

Populated fields: `reportedBy` (firstName, lastName, email), `claimedBy` (firstName, lastName, email), `studentId` (firstName, lastName).

**Response:** HTTP 200

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "schoolId": "64f1a2b3c4d5e6f7a8b9c0aa",
        "reportedBy": { "_id": "...", "firstName": "Jane", "lastName": "Smith", "email": "jane@school.edu" },
        "type": "found",
        "status": "found",
        "itemName": "Blue School Jacket",
        "description": "Size 10, name tag inside reads 'John'",
        "category": "clothing",
        "locationFound": "Sports Field",
        "dateFound": "2026-03-28T00:00:00.000Z",
        "photos": ["https://cdn.example.com/jacket.jpg"],
        "claimedBy": null,
        "studentId": null,
        "parentNotified": false,
        "isDeleted": false,
        "createdAt": "2026-03-31T08:00:00.000Z",
        "updatedAt": "2026-03-31T08:00:00.000Z"
      }
    ],
    "total": 42
  },
  "message": "Items retrieved successfully"
}
```

---

### 2.4 GET /:id — Item detail

**Auth:** `authenticate` (any authenticated user)

**Path params:** `id` — MongoDB ObjectId of the item

**Response:** HTTP 200. Returns a single item document. Soft-deleted items return 404.

Populated fields: `reportedBy` (firstName, lastName, email), `claimedBy` (firstName, lastName, email), `verifiedBy` (firstName, lastName, email), `matchedItemId` (full document), `studentId` (firstName, lastName).

```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0aa",
    "reportedBy": { "_id": "...", "firstName": "Jane", "lastName": "Smith", "email": "jane@school.edu" },
    "verifiedBy": null,
    "claimedBy": null,
    "matchedItemId": null,
    "studentId": null,
    "type": "found",
    "status": "found",
    "itemName": "Blue School Jacket",
    "description": "Size 10, name tag inside reads 'John'",
    "category": "clothing",
    "locationFound": "Sports Field",
    "dateFound": "2026-03-28T00:00:00.000Z",
    "photos": [],
    "parentNotified": false,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Item retrieved successfully"
}
```

**Error (not found):** HTTP 404

```json
{ "success": false, "error": "Lost & found item not found" }
```

---

### 2.5 POST /:id/claim — Claim an item

**Auth:** `authenticate` + `authorize('parent', 'teacher', 'school_admin', 'super_admin')`

**Path params:** `id` — item ObjectId

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `studentId` | `string` | No | 24-char hex ObjectId |

**Behaviour:**
- Returns 404 if item not found or is soft-deleted.
- Returns 400 (`'This item has already been claimed or returned'`) if `status` is `'claimed'` or `'returned'`.
- Returns 400 (`'This item has been archived'`) if `status` is `'archived'`.
- Sets `claimedBy` to the authenticated user's ID, `claimedDate` to current timestamp, `status` to `'claimed'`.
- If `studentId` is provided, sets `studentId` on the item.

**Response:** HTTP 200

```json
{
  "success": true,
  "data": { "...updatedItem": "..." },
  "message": "Item claimed successfully"
}
```

**Example request:**

```json
POST /api/lost-found/64f1a2b3c4d5e6f7a8b9c0d1/claim
{
  "studentId": "64f1a2b3c4d5e6f7a8b9c0cc"
}
```

---

### 2.6 POST /:id/verify — Verify and return item

**Auth:** `authenticate` + `authorize('school_admin', 'super_admin')`

**Path params:** `id` — item ObjectId

**Request body:** None

**Behaviour:**
- Returns 404 if item not found or is soft-deleted.
- Returns 400 (`'Only claimed items can be verified and returned'`) if `status !== 'claimed'`.
- Sets `verifiedBy` to the authenticated user's ID, `status` to `'returned'`.

**Response:** HTTP 200

```json
{
  "success": true,
  "data": { "...updatedItem": "..." },
  "message": "Item verified and marked as returned"
}
```

---

### 2.7 POST /:id/match/:matchId — Match lost item to found item

**Auth:** `authenticate` + `authorize('teacher', 'school_admin', 'super_admin')`

**Path params:**
- `id` — ObjectId of the lost-type item
- `matchId` — ObjectId of the found-type item

**Request body:** None

**Behaviour:**
- Returns 404 if either item is not found or is soft-deleted.
- Returns 400 (`'First item must be a lost report'`) if `id` item does not have `type === 'lost'`.
- Returns 400 (`'Second item must be a found item'`) if `matchId` item does not have `type === 'found'`.
- Sets `matchedItemId` on both documents to reference each other, then saves both.

**Response:** HTTP 200

```json
{
  "success": true,
  "data": {
    "lostItem": { "...updatedLostItem": "..." },
    "foundItem": { "...updatedFoundItem": "..." }
  },
  "message": "Items matched successfully"
}
```

---

### 2.8 GET /:id/suggestions — Auto-match suggestions

**Auth:** `authenticate` (any authenticated user)

**Path params:** `id` — item ObjectId

**Behaviour:**
Finds up to 10 potential counterpart items for the given item using the following criteria:
- Same `schoolId`
- Opposite `type` (if item is `lost`, find `found`; if item is `found`, find `lost`)
- Same `category`
- `isDeleted: false`, `status: 'found'`, `matchedItemId` does not exist
- If the item has a date (`dateLost` or `dateFound`), the counterpart's corresponding date must be within a ±14-day window

Populated fields on suggestions: `reportedBy` (firstName, lastName, email).

**Response:** HTTP 200

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "itemName": "Blue School Jacket",
      "category": "clothing",
      "type": "found",
      "status": "found",
      "locationFound": "Sports Field",
      "dateFound": "2026-03-27T00:00:00.000Z",
      "reportedBy": { "_id": "...", "firstName": "Jane", "lastName": "Smith", "email": "jane@school.edu" }
    }
  ],
  "message": "Match suggestions retrieved successfully"
}
```

---

### 2.9 POST /archive — Archive old unclaimed items

**Auth:** `authenticate` + `authorize('school_admin', 'super_admin')`

**Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | `string` | Yes | 24-char hex ObjectId |

**Behaviour:**
Bulk-updates all items matching:
- `schoolId` matches
- `status === 'found'`
- `isDeleted: false`
- `createdAt` is 30 or more days before the current time

Sets `status: 'archived'` and `archivedDate: new Date()` on all matched items.

**Response:** HTTP 200

```json
{
  "success": true,
  "data": { "archivedCount": 7 },
  "message": "7 items archived"
}
```

**Example request:**

```json
POST /api/lost-found/archive
{
  "schoolId": "64f1a2b3c4d5e6f7a8b9c0aa"
}
```

---

### 2.10 DELETE /:id — Soft delete item

**Auth:** `authenticate` + `authorize('school_admin', 'super_admin')`

**Path params:** `id` — item ObjectId

**Behaviour:**
Sets `isDeleted: true` on the item using `findOneAndUpdate`. Returns 404 if item is already deleted or does not exist.

**Response:** HTTP 200

```json
{
  "success": true,
  "data": { "...itemWithIsDeletedTrue": "..." },
  "message": "Item deleted successfully"
}
```

---

## 3. Frontend Pages

### 3.1 Admin — `/admin/lost-found`

**File:** `src/app/(dashboard)/admin/lost-found/page.tsx`

The admin page is the primary management interface. It is split into four tabs and includes a stat dashboard.

**Stats row (4 cards):**
- Total Found Items — count of all logged found items
- Claimed — count of items returned to owner
- Unclaimed — count of items awaiting collection
- Lost Reports — total reports, subtitle shows open count

**Header actions:**
- "Archive Old Items" button — triggers the bulk-archive endpoint for items older than 30 days
- "Log Found Item" button — opens the `ReportFoundItemDialog`

**Tabs:**
1. **Found Items** — `DataTable` of active found items (excludes matched and archived), columns: Item Name, Category, Location Found, Date Found, Status, Reported By, Actions. Actions on unclaimed items: "Claim" and "Archive" buttons. Actions on matched items: "Verify" button.
2. **Lost Reports** — `DataTable` of all lost reports, columns: Item Name, Category, Student, Date Lost, Status, Reported By, Actions. Below the table, `MatchSuggestionsPanel` renders for each open report. Actions on open reports: "Find Match" (sparkle icon). Actions on matched reports: "Resolve" button.
3. **Matched** — `DataTable` of matched found items (status `'matched'`), same columns as Found Items.
4. **Archived** — `DataTable` of archived items (status `'archived'`), same columns as Found Items.

**MatchSuggestionsPanel (inline component):**
Renders within the Lost Reports tab. Filters mock found items by same category or partial name match against each open lost report. Displays each suggestion as a bordered row with item name, location, date found, and a "Match" button.

**Current state:** Uses mock data (`mockFoundItems`, `mockLostReports`). API integration is pending.

---

### 3.2 Parent — `/parent/lost-found`

**File:** `src/app/(dashboard)/parent/lost-found/page.tsx`

The parent page has a read-and-interact interface focused on the parent's own reports and the browsable found-item gallery.

**Header action:**
- "Report Lost Item" button — opens `ReportLostItemDialog`

**Match notification banner:**
Shown only when any of the parent's lost reports have `status === 'matched'`. Blue info card with a Bell icon prompting the parent to visit the school office.

**My Lost Reports card:**
`DataTable` of the parent's own lost reports. Columns: Item, Category, Child, Location, Date Lost, Status. No inline actions — read-only tracking view.

**Browse Found Items card:**
- Category filter dropdown (All, Clothing, Stationery, etc.)
- Toggle between gallery and list view modes

  - **Gallery mode** (default): responsive grid of `FoundItemCard` components (1 → 2 → 3 → 4 columns). Each card shows photo (if present), item name, description (2-line clamp), category badge, location, date found, and either a `ClaimDialog` trigger ("This is mine!") or a "Claimed" badge.
  - **List mode**: `DataTable` with columns Item, Category, Location, Date Found, Actions (same claim/badge logic).

Only `unclaimed` and `claimed` items are shown in the gallery — `matched` and `archived` items are hidden from parents.

**Current state:** Uses mock data. API integration is pending.

---

## 4. User Flows

### 4.1 Staff Reports a Found Item

1. Admin or teacher navigates to `/admin/lost-found`.
2. Clicks "Log Found Item" — dialog opens.
3. Fills in: Item Name (required, min 2 chars), Description (required, min 5 chars), Category (required, select), Date Found (required), Location Found (required, min 2 chars), Photo URL (optional).
4. Submits form → `POST /api/lost-found` with `type: 'found'`.
5. New item appears in the "Found Items" tab with `status: 'found'` (displayed as "Unclaimed").
6. Item becomes visible to parents in the "Browse Found Items" gallery.

### 4.2 Parent Reports a Lost Item

1. Parent navigates to `/parent/lost-found`.
2. Clicks "Report Lost Item" — dialog opens.
3. Selects Child (from their linked children, required), fills in Item Name (min 2 chars), Description (min 5 chars), Category, Date Lost, Location Lost (min 2 chars).
4. Submits form → `POST /api/lost-found` with `type: 'lost'`.
5. New report appears in the "My Lost Reports" table with `status: 'open'` (initially `'found'` on the backend — the frontend status vocabulary differs; the API integration layer must map accordingly).

### 4.3 Admin Matches Lost to Found

1. Admin navigates to the "Lost Reports" tab.
2. For any open report, the `MatchSuggestionsPanel` shows candidate found items based on category and name proximity.
3. Alternatively, admin clicks "Find Match" on a specific report to trigger `GET /api/lost-found/:id/suggestions`.
4. Admin reviews suggestions and clicks "Match" on a candidate → `POST /api/lost-found/:lostId/match/:foundId`.
5. Both items get `matchedItemId` set. The found item moves to the "Matched" tab. The lost report shows `status: 'matched'`.
6. The parent sees the match notification banner on their portal.

### 4.4 Parent Claims a Found Item

1. Parent browses the "Browse Found Items" gallery on `/parent/lost-found`.
2. Parent optionally filters by category.
3. Parent clicks "This is mine!" on an unclaimed item — `ClaimDialog` opens showing item name, location found, and date found.
4. Parent clicks "Confirm Claim" → `POST /api/lost-found/:id/claim` (optionally with `studentId`).
5. Item's `status` changes to `'claimed'`, `claimedBy` and `claimedDate` are set.
6. The "Claimed" badge replaces the claim button on the item card.

### 4.5 Admin Verifies and Returns Item

1. Admin sees a claimed item in the "Found Items" tab with a "Verify" button.
2. Admin verifies the item has been physically collected by the correct owner.
3. Admin clicks "Verify" → `POST /api/lost-found/:id/verify`.
4. Item `status` changes to `'returned'`, `verifiedBy` is set. Item exits the active tabs.

### 4.6 Admin Archives Old Unclaimed Items

1. Admin clicks "Archive Old Items" in the page header.
2. Triggers `POST /api/lost-found/archive` with `schoolId`.
3. All unclaimed found items older than 30 days have `status` set to `'archived'`.
4. These items appear in the "Archived" tab and are hidden from the parent gallery.

### 4.7 Admin Soft Deletes an Item

1. Admin calls `DELETE /api/lost-found/:id` (currently no UI button for this — must be wired up).
2. Item's `isDeleted` flag is set to `true`.
3. Item is excluded from all list/detail queries.

---

## 5. Data Models

### 5.1 LostItem (MongoDB — `LostItem` collection)

The single model used for both found items and lost reports; differentiated by the `type` field.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | — | auto | MongoDB document ID |
| `schoolId` | `ObjectId` (ref: School) | Yes | — | Scopes the item to a school |
| `reportedBy` | `ObjectId` (ref: User) | Yes | — | User who submitted the report |
| `status` | `enum` | Yes | `'found'` | `'found'`, `'claimed'`, `'archived'`, `'returned'` |
| `type` | `enum` | Yes | — | `'found'` or `'lost'` |
| `itemName` | `string` | Yes | — | Trimmed |
| `description` | `string` | Yes | — | Trimmed |
| `category` | `enum` | Yes | — | `'clothing'`, `'stationery'`, `'electronics'`, `'sports_equipment'`, `'lunch_box'`, `'bag'`, `'jewellery'`, `'other'` |
| `locationFound` | `string` | No | — | Trimmed; used when `type === 'found'` |
| `locationLost` | `string` | No | — | Trimmed; used when `type === 'lost'` |
| `dateFound` | `Date` | No | — | Defaults to `new Date()` on service creation for found items |
| `dateLost` | `Date` | No | — | Defaults to `new Date()` on service creation for lost items |
| `photos` | `string[]` | No | `[]` | Array of photo URLs |
| `claimedBy` | `ObjectId` (ref: User) | No | — | Set when item is claimed |
| `claimedDate` | `Date` | No | — | Timestamp of claim action |
| `verifiedBy` | `ObjectId` (ref: User) | No | — | Set when admin verifies return |
| `matchedItemId` | `ObjectId` (ref: LostItem) | No | — | Bidirectional link to the paired item |
| `studentId` | `ObjectId` (ref: Student) | No | — | Student the item belongs to |
| `parentNotified` | `boolean` | No | `false` | Whether parent has been notified |
| `parentNotifiedDate` | `Date` | No | — | Timestamp of notification |
| `archivedDate` | `Date` | No | — | Set during bulk archive |
| `isDeleted` | `boolean` | No | `false` | Soft delete flag |
| `createdAt` | `Date` | — | auto | Mongoose timestamp |
| `updatedAt` | `Date` | — | auto | Mongoose timestamp |

**Indexes:**
- `{ schoolId: 1, status: 1 }`
- `{ schoolId: 1, type: 1 }`
- `{ schoolId: 1, category: 1 }`
- `{ matchedItemId: 1 }`

### 5.2 Frontend FoundItem type

Used in the admin and parent pages for found-type items.

```ts
interface FoundItem {
  id: string;
  name: string;
  description: string;
  category: LostFoundCategory;  // 'clothing' | 'stationery' | 'lunch_box' | 'electronics' | 'sports' | 'bags' | 'other'
  location: string;
  photoUrl?: string;
  dateFound: string;
  status: FoundItemStatus;      // 'unclaimed' | 'claimed' | 'matched' | 'archived'
  reportedBy: string;
  claimedBy?: string;
  claimedDate?: string;
  matchedReportId?: string;
}
```

**Note:** The frontend category enum includes `'sports'` and `'bags'` where the backend uses `'sports_equipment'` and `'bag'`. The API integration layer must normalise these values when reading from and writing to the backend.

### 5.3 Frontend LostReport type

Used in both portals for lost-type items.

```ts
interface LostReport {
  id: string;
  studentId: string;
  studentName: string;
  parentId: string;
  parentName: string;
  itemName: string;
  description: string;
  category: LostFoundCategory;
  locationLost: string;
  dateLost: string;
  status: LostReportStatus;    // 'open' | 'matched' | 'resolved' | 'closed'
  matchedItemId?: string;
  createdAt: string;
}
```

**Note:** The frontend `LostReportStatus` values (`'open'`, `'resolved'`, `'closed'`) do not exist on the backend model, which only has `'found'`, `'claimed'`, `'archived'`, `'returned'`. The API integration layer must map frontend status labels to backend values and vice versa.

### 5.4 Frontend form schemas (Zod)

**`foundItemSchema`** (admin "Log Found Item" form):
```ts
{
  name: string (min 2),
  description: string (min 5),
  category: enum ['clothing','stationery','lunch_box','electronics','sports','bags','other'],
  location: string (min 2),
  photoUrl?: string,
  dateFound: string (min 1),
}
```

**`lostReportSchema`** (parent "Report Lost Item" form):
```ts
{
  studentId: string (min 1),
  itemName: string (min 2),
  description: string (min 5),
  category: enum ['clothing','stationery','lunch_box','electronics','sports','bags','other'],
  locationLost: string (min 2),
  dateLost: string (min 1),
}
```

---

## 6. State Management

The Lost & Found module currently has no dedicated Zustand store — pages use local `useState` and read directly from mock data. When wired to the API, the following store structure is recommended.

### 6.1 Proposed `useLostFoundStore`

```ts
interface LostFoundStore {
  // Data
  items: LostFoundItem[];
  total: number;
  stats: LostFoundStats | null;
  suggestions: LostFoundItem[];

  // Filters
  filters: {
    status?: string;
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  };

  // Loading / error
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Dialog state
  reportDialogOpen: boolean;
  claimDialogOpen: boolean;
  selectedItemId: string | null;

  // Actions
  fetchItems: (schoolId: string) => Promise<void>;
  fetchStats: (schoolId: string) => Promise<void>;
  fetchSuggestions: (itemId: string) => Promise<void>;
  reportItem: (data: ReportItemPayload) => Promise<void>;
  claimItem: (itemId: string, studentId?: string) => Promise<void>;
  verifyAndReturn: (itemId: string) => Promise<void>;
  matchItems: (lostItemId: string, foundItemId: string) => Promise<void>;
  archiveOldItems: (schoolId: string) => Promise<void>;
  softDelete: (itemId: string) => Promise<void>;
  setFilters: (filters: Partial<LostFoundStore['filters']>) => void;
  setReportDialogOpen: (open: boolean) => void;
  setClaimDialogOpen: (open: boolean, itemId?: string) => void;
  reset: () => void;
}
```

### 6.2 Local state retained in components

- **`viewMode`** (`'gallery' | 'list'`) — parent browse panel, stays in component state
- **`categoryFilter`** — parent category dropdown, stays in component state
- Form state managed by `react-hook-form` with Zod resolver in both portal dialogs

---

## 7. Components Needed

### 7.1 Shared / reusable

**`ItemStatusBadge`**
Props: `status: LostFoundItemStatus | LostReportStatus`
Maps status to a colour-coded badge. Backend statuses: `found` (amber/unclaimed), `claimed` (emerald), `archived` (gray), `returned` (blue). Frontend lost report statuses: `open` (amber), `matched` (blue), `resolved` (emerald), `closed` (gray).

**`CategoryBadge`**
Props: `category: LostFoundCategory`
Maps category key to human label and a colour variant badge.

**`FoundItemCard`** (exists in parent page, should be extracted)
Props: `item: FoundItem; onClaim: (itemId: string) => void`
Renders the gallery card with optional photo, item name, description (2-line clamp), category badge, location, date found, and claim trigger. Currently defined inline in the parent page.

**`MatchSuggestionsPanel`** (exists in admin page, should be extracted)
Props: `report: LostReport; suggestions: FoundItem[]; onMatch: (lostId: string, foundId: string) => void`
Renders a card listing potential found-item matches for a given lost report. Currently defined inline in the admin page with client-side mock filtering.

### 7.2 Admin-specific

**`ReportFoundItemDialog`**
Wraps the "Log Found Item" form in a Dialog. Fields: Item Name, Description, Category (Select), Date Found, Location Found, Photo URL (optional). On submit calls `POST /api/lost-found` with `type: 'found'`.

**`ArchiveConfirmDialog`**
Confirmation dialog before triggering the bulk-archive action. Shows the threshold (30 days) and warns that the action is irreversible.

**`AdminFoundItemsTable`**
`DataTable` wrapper with `foundColumns` column definition. Actions: "Claim" and "Archive" for unclaimed items; "Verify" for matched items.

**`AdminLostReportsTable`**
`DataTable` wrapper with `lostColumns` column definition. Actions: "Find Match" (sparkle) for open reports; "Resolve" for matched reports.

**`MatchSuggestionsDrawer` (optional enhancement)**
A side drawer or sheet showing auto-match suggestions fetched from `GET /api/lost-found/:id/suggestions`. Allows admin to confirm a match with one click.

### 7.3 Parent-specific

**`ReportLostItemDialog`**
Wraps the "Report Lost Item" form in a Dialog. Fields: Child (Select from linked students), Item Name, Description, Category (Select), Date Lost, Location Lost. On submit calls `POST /api/lost-found` with `type: 'lost'`.

**`ClaimDialog`** (exists, should be extracted from inline definition)
Props: `item: FoundItem; onConfirm: () => void`
Confirmation dialog showing item details (name, location found, date found). On confirm calls `POST /api/lost-found/:id/claim`.

**`FoundItemGallery`**
Props: `items: FoundItem[]; onClaim: (itemId: string) => void`
Renders the responsive grid of `FoundItemCard` components. Currently inlined in the parent page.

**`MatchNotificationBanner`**
Props: `matchedCount: number`
Blue banner shown when the parent has one or more matched lost reports. Prompts the parent to visit the school office.

**`ParentLostReportsTable`**
`DataTable` wrapper with `myReportColumns` column definition. Read-only — no inline actions.

---

## 8. Integration Notes

### 8.1 API client wiring

Both pages currently use `mockFoundItems` and `mockLostReports` imported from `@/lib/mock-data`. These must be replaced with calls to the backend API endpoints documented in Section 2. An `api/lost-found.ts` service file should encapsulate all fetch calls.

### 8.2 Category value mismatch

The frontend category enum uses `'sports'` and `'bags'`; the backend uses `'sports_equipment'` and `'bag'`. A mapping function must translate in both directions at the API boundary:

```ts
const FE_TO_BE_CATEGORY: Record<string, string> = {
  sports: 'sports_equipment',
  bags: 'bag',
};
const BE_TO_FE_CATEGORY: Record<string, string> = {
  sports_equipment: 'sports',
  bag: 'bags',
};
```

### 8.3 Status vocabulary mismatch

Backend `status` field values differ from frontend display vocabulary:

| Backend `status` | Frontend display (found item) | Frontend display (lost report) |
|---|---|---|
| `'found'` (type=found) | Unclaimed | — |
| `'found'` (type=lost) | — | Open |
| `'claimed'` | Claimed | — |
| `'returned'` | Returned | Resolved |
| `'archived'` | Archived | Closed |

The integration layer must translate when constructing `FoundItem` and `LostReport` objects from API responses.

### 8.4 Connection to Student module

- `studentId` is an optional ObjectId reference on `LostItem` linking to the Student collection.
- The parent "Report Lost Item" form populates a child selector; the parent portal must fetch the authenticated parent's linked students from the Student module before rendering the dialog.
- The admin "Found Items" table displays `studentId` (firstName, lastName) when populated.

### 8.5 Connection to Parent module

- `claimedBy` is a User ObjectId; when a parent claims an item their user ID is stored.
- The parent notification flag (`parentNotified`, `parentNotifiedDate`) is set by the backend but there is no UI currently to trigger the notification — this would be wired through the Notification module.

### 8.6 Connection to Notification module

The `parentNotified` boolean on `LostItem` anticipates integration with a push/email notification system. When a lost report is matched or a found item is claimed, the Notification module should fire and the backend should set `parentNotified: true` and `parentNotifiedDate` on the relevant item. This is not yet implemented in the service layer.

### 8.7 Photo upload

The `photos` field accepts an array of URL strings. The frontend currently takes a single `photoUrl` string input. When integrating, a file upload flow must be wired through a media/storage service (S3 or similar), with the resulting URL(s) passed in the `photos` array to the API.

### 8.8 Archive endpoint routing conflict

The route `POST /archive` is registered before `GET /:id` and `POST /:id/claim` but after `GET /stats`. Care must be taken in the API client to ensure the archive call hits `/lost-found/archive` and not `/lost-found/:id` with id `'archive'`.

### 8.9 Pagination

`GET /` supports `page` and `limit` query params. Both admin tables should implement server-side pagination once mock data is replaced. The response shape is `{ items, total }`.

---

## 9. Acceptance Criteria

### 9.1 Reporting

- [ ] An authenticated teacher, school admin, or super admin can log a found item via the "Log Found Item" dialog. The item appears immediately in the "Found Items" tab with status `Unclaimed`.
- [ ] An authenticated parent can submit a lost item report via "Report Lost Item". The report appears in "My Lost Reports" with status `Open`.
- [ ] Form validation prevents submission when required fields (Item Name, Description, Category, Date, Location) are empty or too short.
- [ ] A photo URL, if provided, displays as an image in the gallery card.

### 9.2 Browsing and filtering

- [ ] The parent "Browse Found Items" gallery shows only `unclaimed` and `claimed` items — `matched` and `archived` items are hidden.
- [ ] Filtering by category in the parent gallery narrows the displayed items correctly.
- [ ] Toggle between gallery and list view in the parent portal preserves the current category filter.
- [ ] The admin "Found Items" tab excludes matched and archived items. "Matched" and "Archived" tabs show only their respective statuses.

### 9.3 Claiming

- [ ] A parent can click "This is mine!" on an unclaimed found item. The `ClaimDialog` shows item name, location, and date found.
- [ ] Confirming the claim calls `POST /api/lost-found/:id/claim`. The item status changes to `claimed`; the claim button is replaced by a "Claimed" badge.
- [ ] Attempting to claim an already-claimed, returned, or archived item returns a 400 error with an appropriate message.

### 9.4 Matching

- [ ] The `MatchSuggestionsPanel` in the admin portal renders suggestion cards for each open lost report, matching by category (and optionally by date within ±14 days via the API).
- [ ] Clicking "Match" on a suggestion calls `POST /api/lost-found/:lostId/match/:foundId`. Both items are updated with `matchedItemId`.
- [ ] The parent sees the match notification banner when at least one of their lost reports has been matched.

### 9.5 Verify and return

- [ ] Only `school_admin` and `super_admin` roles see the "Verify" button on matched found items.
- [ ] Clicking "Verify" calls `POST /api/lost-found/:id/verify`. The item status changes to `returned`.
- [ ] Only a `claimed` item can be verified — attempting to verify any other status returns 400.

### 9.6 Archive

- [ ] "Archive Old Items" button calls `POST /api/lost-found/archive` with the current school's ID.
- [ ] The response shows the count of archived items via a toast notification.
- [ ] Archived items move from the "Found Items" tab to the "Archived" tab and are removed from the parent gallery.
- [ ] Only `school_admin` and `super_admin` roles can see and use the "Archive Old Items" button.

### 9.7 Soft delete

- [ ] Soft-deleting an item via `DELETE /api/lost-found/:id` sets `isDeleted: true`. The item no longer appears in any list, tab, or detail view.
- [ ] Attempting to soft-delete an already-deleted item returns 404.
- [ ] Only `school_admin` and `super_admin` roles can delete items.

### 9.8 Statistics

- [ ] The stats row on the admin page reflects real data from `GET /api/lost-found/stats`.
- [ ] `avgDaysToClaim` displays `0` when no items have been claimed yet.

### 9.9 Access control

- [ ] Unauthenticated requests to any endpoint return 401.
- [ ] A `parent` role cannot call `POST /archive`, `POST /:id/verify`, `POST /:id/match/:matchId`, or `DELETE /:id`. These return 403.
- [ ] A `student` role (if applicable) cannot report items, claim items, or perform any write actions.
