# 24 — Notification Module

## 1. Module Overview

The Notification module is the cross-cutting alert infrastructure for Campusly. Every other module (fees, homework, attendance, wallet, tuckshop, etc.) calls into this module to inform users of events relevant to them. It supports four delivery channels — `email`, `sms`, `push`, and `in_app` — though at the current stage only in-app delivery is fully wired. Email/SMS/push are recorded as notification documents and are intended to be dispatched asynchronously via a BullMQ queue in production.

The module covers:

- **Individual notifications** — targeted at a single recipient by ID.
- **Bulk notifications** — broadcast to all students in a school, grade, or class.
- **Unread count** — lightweight polling endpoint used by the notification bell in the TopBar.
- **Read state management** — mark one or all notifications as read.
- **Notification preferences** — per-user opt-in/out of each channel; auto-created on first read if none exist.

Roles that can create notifications: `super_admin`, `school_admin`, `teacher`.
Roles that can bulk-create: `super_admin`, `school_admin`.
All authenticated users can read and manage their own notifications and preferences.

---

## 2. Backend API Endpoints

Base path: `/notifications` (mounted under the school-scoped API router, e.g. `http://localhost:4000/notifications`).

All endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

---

### 2.1 Create Notification

**POST /notifications**

Auth: required. Roles: `super_admin`, `school_admin`, `teacher`.

**Request body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `recipientId` | `string` | yes | Valid 24-char hex ObjectId |
| `schoolId` | `string` | yes | Valid 24-char hex ObjectId |
| `type` | `string` | yes | Enum: `email`, `sms`, `push`, `in_app` |
| `title` | `string` | yes | `min(1)` |
| `message` | `string` | yes | `min(1)` |
| `data` | `unknown` | no | Any JSON-serialisable value; forwarded as-is to the notification document |

**Response — 201 Created**

```json
{
  "success": true,
  "message": "Notification created successfully",
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "recipientId": "665f1a2b3c4d5e6f7a8b9c01",
    "schoolId": "665f1a2b3c4d5e6f7a8b9c02",
    "type": "in_app",
    "title": "Invoice Due",
    "message": "Your invoice INV-2026-0042 is due on 2026-04-15.",
    "data": { "invoiceId": "665f1a2b3c4d5e6f7a8b9c10" },
    "isRead": false,
    "readAt": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  }
}
```

**Example request**

```bash
curl -X POST http://localhost:4000/notifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "665f1a2b3c4d5e6f7a8b9c01",
    "schoolId":    "665f1a2b3c4d5e6f7a8b9c02",
    "type":        "in_app",
    "title":       "Invoice Due",
    "message":     "Your invoice INV-2026-0042 is due on 2026-04-15.",
    "data":        { "invoiceId": "665f1a2b3c4d5e6f7a8b9c10" }
  }'
```

---

### 2.2 List Notifications (for authenticated user)

**GET /notifications**

Auth: required. No role restriction — returns notifications where `recipientId` equals the authenticated user's ID.

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | 1 | Page number (1-based) |
| `limit` | `number` | server default (typically 20) | Items per page |
| `isRead` | `"true"` \| `"false"` | omit = all | Filter by read state |

Soft-deleted notifications (`isDeleted: true`) are never returned. Results are sorted newest-first (`createdAt: -1`).

**Response — 200 OK**

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "_id": "665f1a2b3c4d5e6f7a8b9c0d",
        "recipientId": "665f1a2b3c4d5e6f7a8b9c01",
        "schoolId": "665f1a2b3c4d5e6f7a8b9c02",
        "type": "in_app",
        "title": "Invoice Due",
        "message": "Your invoice INV-2026-0042 is due on 2026-04-15.",
        "data": { "invoiceId": "665f1a2b3c4d5e6f7a8b9c10" },
        "isRead": false,
        "readAt": null,
        "isDeleted": false,
        "createdAt": "2026-03-31T08:00:00.000Z",
        "updatedAt": "2026-03-31T08:00:00.000Z"
      }
    ],
    "total": 14,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Example request**

```bash
curl "http://localhost:4000/notifications?page=1&limit=10&isRead=false" \
  -H "Authorization: Bearer <token>"
```

---

### 2.3 Get Unread Count

**GET /notifications/unread-count**

Auth: required. Returns a single integer count for the authenticated user.

**Response — 200 OK**

```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": { "count": 5 }
}
```

**Example request**

```bash
curl http://localhost:4000/notifications/unread-count \
  -H "Authorization: Bearer <token>"
```

---

### 2.4 Mark Single Notification as Read

**PATCH /notifications/:id/read**

Auth: required. No role restriction — any authenticated user may mark a notification as read. The service does not verify that the notification belongs to the calling user (no ownership check in the current service implementation); access control relies on the notification ID being unknown to other users.

**Path parameter**

| Param | Description |
|---|---|
| `id` | MongoDB ObjectId of the notification |

**Request body** — none required.

**Response — 200 OK**

```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "isRead": true,
    "readAt": "2026-03-31T09:15:00.000Z",
    "updatedAt": "2026-03-31T09:15:00.000Z"
  }
}
```

Returns 404 if the notification does not exist or is soft-deleted.

**Example request**

```bash
curl -X PATCH http://localhost:4000/notifications/665f1a2b3c4d5e6f7a8b9c0d/read \
  -H "Authorization: Bearer <token>"
```

---

### 2.5 Mark All Notifications as Read

**PATCH /notifications/read-all**

Auth: required. Marks every unread, non-deleted notification for the authenticated user as read in a single `updateMany`.

**Request body** — none required.

**Response — 200 OK**

```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": { "modifiedCount": 5 }
}
```

`modifiedCount` is 0 if there were no unread notifications.

**Example request**

```bash
curl -X PATCH http://localhost:4000/notifications/read-all \
  -H "Authorization: Bearer <token>"
```

---

### 2.6 Bulk Create Notifications

**POST /notifications/bulk**

Auth: required. Roles: `super_admin`, `school_admin`.

Resolves recipient user IDs by looking up students matching the target, then calls `Notification.insertMany`. Targets students' `userId` field (i.e. the student's own user account), not parent accounts.

**Request body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | `string` | yes | Valid 24-char hex ObjectId |
| `targetType` | `string` | yes | Enum: `class`, `grade`, `school` |
| `targetId` | `string` | yes | Valid 24-char hex ObjectId — the ID of the class, grade, or school to target |
| `type` | `string` | yes | Enum: `email`, `sms`, `push`, `in_app` |
| `title` | `string` | yes | `min(1)` |
| `message` | `string` | yes | `min(1)` |
| `data` | `unknown` | no | Optional metadata attached to every notification |

**Targeting logic**

- `targetType: "school"` — finds all students where `schoolId` equals `targetId`.
- `targetType: "grade"` — finds all students where `gradeId` equals `targetId`.
- `targetType: "class"` — finds all students where `classId` equals `targetId`.

Students with `isDeleted: true` are excluded. Returns `{ count: 0 }` when no matching students are found.

**Response — 201 Created**

```json
{
  "success": true,
  "message": "Bulk notifications created successfully",
  "data": { "count": 42 }
}
```

**Example request**

```bash
curl -X POST http://localhost:4000/notifications/bulk \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "schoolId":   "665f1a2b3c4d5e6f7a8b9c02",
    "targetType": "grade",
    "targetId":   "665f1a2b3c4d5e6f7a8b9c20",
    "type":       "in_app",
    "title":      "Exam timetable published",
    "message":    "The Grade 10 exam timetable is now available. Please review your schedule.",
    "data":       { "link": "/student/exams" }
  }'
```

---

### 2.7 Get Notification Preferences

**GET /notifications/preferences**

Auth: required. Returns the preferences document for the authenticated user. If no document exists yet, one is created with all channels defaulting to `true`.

**Response — 200 OK**

```json
{
  "success": true,
  "message": "Preferences retrieved successfully",
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c30",
    "userId": "665f1a2b3c4d5e6f7a8b9c01",
    "email": true,
    "sms": true,
    "push": true,
    "inApp": true,
    "isDeleted": false,
    "createdAt": "2026-01-10T07:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  }
}
```

**Example request**

```bash
curl http://localhost:4000/notifications/preferences \
  -H "Authorization: Bearer <token>"
```

---

### 2.8 Update Notification Preferences

**PUT /notifications/preferences**

Auth: required. All body fields are optional; only supplied booleans are updated (partial update via `$set`). Uses `upsert: true` so the document is created if it does not exist.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `boolean` | no | Receive email notifications |
| `sms` | `boolean` | no | Receive SMS notifications |
| `push` | `boolean` | no | Receive push notifications |
| `inApp` | `boolean` | no | Receive in-app notifications |

At least one field should be present; an empty body is valid but is a no-op.

**Response — 200 OK**

```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c30",
    "userId": "665f1a2b3c4d5e6f7a8b9c01",
    "email": false,
    "sms": true,
    "push": true,
    "inApp": true,
    "isDeleted": false,
    "createdAt": "2026-01-10T07:00:00.000Z",
    "updatedAt": "2026-03-31T09:30:00.000Z"
  }
}
```

**Example request**

```bash
curl -X PUT http://localhost:4000/notifications/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "email": false }'
```

---

## 3. Frontend Pages

### 3.1 Notification Bell (TopBar — existing, partially wired)

**Location:** `src/components/layout/TopBar.tsx`

The `TopBar` already renders a `Bell` icon button with a badge sourced from `useUIStore().notifications`. The store holds a hardcoded initial value of `3` and exposes `setNotifications(count)`. This needs to be replaced with a live fetch from `GET /notifications/unread-count` on mount and after any mark-as-read action.

The bell button currently has no `onClick` handler and no dropdown. Clicking it should open the `NotificationDropdown` component.

**Required changes to TopBar:**
- Import and render `NotificationBell` in place of the raw `<Button>` + `<Badge>` block, or extend the existing button to open `NotificationDropdown`.
- On mount, call `GET /notifications/unread-count` and store the result in `useNotificationStore`.

---

### 3.2 Notification Dropdown

**Location (to create):** `src/components/notifications/NotificationDropdown.tsx`

A popover/sheet that opens from the bell button in the TopBar. Displays the most recent notifications (e.g., latest 10, `isRead=false` first). Contains:

- A header row: "Notifications" title + "Mark all as read" button.
- A scrollable `NotificationList` with `NotificationItem` rows.
- A "View all" footer link to the full notifications page.

---

### 3.3 Full Notifications Page

**Location (to create):** `src/app/(dashboard)/notifications/page.tsx`

A dedicated page listing all notifications with filtering by read state. Accessible to all roles. Uses infinite scroll or pagination. The page header includes a "Mark all as read" action.

---

### 3.4 Notification Preferences Page

**Location (to create):** `src/app/(dashboard)/notifications/preferences/page.tsx`

A settings-style page allowing the authenticated user to toggle each notification channel (email, SMS, push, in-app). Fetches current preferences on mount via `GET /notifications/preferences` and saves via `PUT /notifications/preferences`.

---

## 4. User Flows

### 4.1 Receiving a Notification

1. Another module (e.g. Fees) calls `POST /notifications` server-side when a relevant event occurs (invoice generated, payment received, homework assigned, etc.).
2. The notification document is written to MongoDB.
3. The frontend polls `GET /notifications/unread-count` periodically (every 60 seconds, or on window focus) and updates the badge on the bell icon.
4. When the user opens the dropdown, `GET /notifications?isRead=false&limit=10` is fetched and the list is rendered.

### 4.2 Marking a Single Notification as Read

1. User opens the notification dropdown or full notifications page.
2. User clicks a `NotificationItem`.
3. Frontend calls `PATCH /notifications/:id/read`.
4. On success: the item's `isRead` state is updated optimistically in the store; the unread count badge decrements by 1.
5. If the notification `data` field contains a `link` or `invoiceId` (or other deep-link metadata), the user is navigated to that location.

### 4.3 Marking All Notifications as Read

1. User clicks "Mark all as read" in the dropdown header or on the full notifications page.
2. Frontend calls `PATCH /notifications/read-all`.
3. On success: all items in the local store are set to `isRead: true`; the unread count badge resets to 0.

### 4.4 Managing Notification Preferences

1. User navigates to Settings or the Preferences page.
2. Frontend calls `GET /notifications/preferences` to populate the form.
3. User toggles channel checkboxes/switches.
4. On change (or on form submit), frontend calls `PUT /notifications/preferences` with only the changed fields.
5. Confirmation toast is shown.

### 4.5 Admin Sends a Bulk Notification

1. Admin composes a broadcast message (e.g. from an Announcements page or a dedicated "Send Notification" form).
2. Admin selects target scope: school, specific grade, or specific class.
3. Frontend calls `POST /notifications/bulk`.
4. On success: confirmation shows `data.count` — the number of notifications created.

---

## 5. Data Models

### 5.1 Notification

MongoDB collection: `notifications`

| Field | Type | Default | Description |
|---|---|---|---|
| `_id` | `ObjectId` | auto | MongoDB document ID |
| `recipientId` | `ObjectId` (ref: User) | required | The user who receives this notification |
| `schoolId` | `ObjectId` (ref: School) | required | The school context |
| `type` | `"email" \| "sms" \| "push" \| "in_app"` | required | Delivery channel |
| `title` | `string` | required | Short headline, trimmed |
| `message` | `string` | required | Full notification body |
| `data` | `Mixed` (any JSON) | — | Optional metadata for deep-linking or context (e.g. `{ invoiceId, link }`) |
| `isRead` | `boolean` | `false` | Whether the recipient has read it |
| `readAt` | `Date` | — | Timestamp when marked as read |
| `isDeleted` | `boolean` | `false` | Soft delete flag |
| `createdAt` | `Date` | auto | Mongoose timestamps |
| `updatedAt` | `Date` | auto | Mongoose timestamps |

**Indexes:**
- `{ recipientId: 1, isRead: 1, createdAt: -1 }` — primary query index for the list and unread-count endpoints.
- `{ schoolId: 1 }` — for school-scoped admin queries.

### 5.2 NotificationPreference

MongoDB collection: `notificationpreferences`

| Field | Type | Default | Description |
|---|---|---|---|
| `_id` | `ObjectId` | auto | MongoDB document ID |
| `userId` | `ObjectId` (ref: User) | required | Unique per user (unique index) |
| `email` | `boolean` | `true` | Opt-in to email channel |
| `sms` | `boolean` | `true` | Opt-in to SMS channel |
| `push` | `boolean` | `true` | Opt-in to push channel |
| `inApp` | `boolean` | `true` | Opt-in to in-app channel |
| `isDeleted` | `boolean` | `false` | Soft delete flag |
| `createdAt` | `Date` | auto | Mongoose timestamps |
| `updatedAt` | `Date` | auto | Mongoose timestamps |

**Index:** `{ userId: 1 }` — unique, ensures one preference document per user.

### 5.3 Frontend TypeScript Types (to add to `src/types/index.ts`)

The existing `Notification` interface in `src/types/index.ts` (lines 416–425) models a simplified UI notification shape that does not match the backend document. It should be replaced or supplemented with:

```ts
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export interface Notification {
  id: string;           // maps from _id
  recipientId: string;
  schoolId: string;
  type: NotificationChannel;
  title: string;
  message: string;
  data?: unknown;
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## 6. State Management

### 6.1 New Store: `useNotificationStore`

**Location (to create):** `src/stores/useNotificationStore.ts`

```ts
interface NotificationState {
  // Notification list
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;

  // Unread count (drives the TopBar bell badge)
  unreadCount: number;

  // Preferences
  preferences: NotificationPreference | null;
  preferencesLoading: boolean;

  // Actions
  setNotifications: (data: NotificationListResponse) => void;
  appendNotifications: (data: NotificationListResponse) => void;
  setUnreadCount: (count: number) => void;
  markOneAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setPreferences: (prefs: NotificationPreference) => void;
  setLoading: (loading: boolean) => void;
}
```

Key behaviours:
- `markOneAsRead(id)` — finds the notification by ID, sets `isRead: true`, decrements `unreadCount` by 1 (floor 0).
- `markAllAsRead()` — sets `isRead: true` on all loaded notifications, sets `unreadCount` to 0.
- `setUnreadCount(count)` — also syncs `useUIStore.setNotifications(count)` so the existing TopBar badge renders the live value.

### 6.2 Migration of `useUIStore.notifications`

`useUIStore` currently holds `notifications: number` (hardcoded to 3). This value should no longer be set manually. The notification store's `setUnreadCount` action calls through to `useUIStore.setNotifications` so the TopBar badge stays in sync without TopBar needing to import the notification store directly.

### 6.3 Polling Strategy

Use a `useNotificationPoller` hook that:
- Calls `GET /notifications/unread-count` on mount.
- Sets up a `setInterval` of 60 000 ms.
- Also re-fetches on `visibilitychange` (tab focus).
- Clears the interval on unmount.
- Is invoked once in `DashboardLayout` so it runs globally for all portal pages.

---

## 7. Components Needed

All components live under `src/components/notifications/`.

### 7.1 `NotificationBell`

**File:** `src/components/notifications/NotificationBell.tsx`

Wraps the existing `Bell` icon button logic from TopBar. Reads `unreadCount` from `useNotificationStore`. Renders the orange badge when `unreadCount > 0`. Caps the displayed number at 99 (shows "99+" for counts above that). Clicking opens/closes `NotificationDropdown` using a local `open` state or a Radix Popover.

Props: none (reads from store).

### 7.2 `NotificationDropdown`

**File:** `src/components/notifications/NotificationDropdown.tsx`

A Radix `Popover` or shadcn `DropdownMenu` panel anchored to `NotificationBell`.

Content:
- **Header:** "Notifications" heading (left) + "Mark all as read" `Button` (right, disabled when `unreadCount === 0`).
- **Body:** `NotificationList` displaying latest 10 notifications (unread first). Shows a skeleton loader while fetching. Shows "No notifications" empty state.
- **Footer:** `Link` to `/notifications` labelled "View all notifications".

On open: fetches `GET /notifications?limit=10` if the list is empty or stale.

### 7.3 `NotificationList`

**File:** `src/components/notifications/NotificationList.tsx`

A `<ul>` rendering a `NotificationItem` for each entry. Used in both `NotificationDropdown` (10 items, fixed height + scroll) and the full notifications page (paginated).

Props:
```ts
interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
}
```

### 7.4 `NotificationItem`

**File:** `src/components/notifications/NotificationItem.tsx`

A single notification row. Displays:
- **Unread indicator:** a filled orange dot (left gutter) when `isRead === false`.
- **Title:** `font-medium`, truncated to one line.
- **Message:** `text-sm text-muted-foreground`, clamped to 2 lines.
- **Timestamp:** relative time (e.g. "2 hours ago") using `date-fns/formatDistanceToNow`.
- **Background:** `bg-primary/5` for unread items, transparent for read items.

Clicking the item calls `onMarkRead(notification.id)` then navigates if `notification.data` contains a `link`.

Props:
```ts
interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}
```

### 7.5 `NotificationPreferencesForm`

**File:** `src/components/notifications/NotificationPreferencesForm.tsx`

A form with four toggle switches (shadcn `Switch` component):

| Label | Field | Description |
|---|---|---|
| Email notifications | `email` | Receive notifications by email |
| SMS notifications | `sms` | Receive notifications by SMS |
| Push notifications | `push` | Receive browser/device push notifications |
| In-app notifications | `inApp` | Receive in-app bell notifications |

Loads preferences from `GET /notifications/preferences` on mount. Each switch fires `PUT /notifications/preferences` with only the toggled field on change (debounced 300 ms or on blur — not a full form submit). Shows a success toast on save.

Props: none (reads/writes via store actions and API calls).

### 7.6 API helper module

**File:** `src/lib/api/notifications.ts`

Thin wrapper around `apiClient` (the existing axios instance at `src/lib/api-client.ts`):

```ts
export const notificationsApi = {
  list:           (params?) => apiClient.get('/notifications', { params }),
  getUnreadCount: ()        => apiClient.get('/notifications/unread-count'),
  markAsRead:     (id)      => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead:  ()        => apiClient.patch('/notifications/read-all'),
  create:         (body)    => apiClient.post('/notifications', body),
  bulkCreate:     (body)    => apiClient.post('/notifications/bulk', body),
  getPreferences: ()        => apiClient.get('/notifications/preferences'),
  updatePreferences: (body) => apiClient.put('/notifications/preferences', body),
};
```

---

## 8. Integration Notes

### 8.1 Triggered by Other Modules

The Notification module is the single fanout point for user-facing alerts across the entire platform. Every other module that creates an event affecting a user should call `POST /notifications` (individual) or `POST /notifications/bulk` (broadcast). Anticipated trigger points:

| Module | Event | Type | Recipients |
|---|---|---|---|
| Fees | Invoice generated | `in_app` | Parent |
| Fees | Invoice overdue | `in_app`, `email` | Parent |
| Fees | Payment received | `in_app` | Parent |
| Wallet | Wallet topped up | `in_app` | Parent, Student |
| Wallet | Low balance warning | `in_app` | Parent |
| Homework | New homework assigned | `in_app` | Students in class |
| Homework | Submission graded | `in_app` | Student |
| Attendance | Absence recorded | `in_app`, `sms` | Parent |
| Tuckshop | Order processed | `in_app` | Student |
| Lost & Found | Match found | `in_app` | Parent |
| Announcements | New announcement | `in_app` | School/grade/class |
| Meetings | Meeting scheduled | `in_app`, `email` | Parent, Teacher |

### 8.2 Delivery Channels (current vs. planned)

- **in_app**: Fully implemented. Notification documents are written to MongoDB and surfaced via the API.
- **email / sms / push**: The document is created with the requested `type`, but dispatch is a `console.log` stub at present. The service comment reads: `// In production, queue for dispatch via BullMQ notificationDispatchQueue`. Frontend should not assume these channels are delivered; they are recorded for future processing.

### 8.3 TopBar Integration

`TopBar` (`src/components/layout/TopBar.tsx`) already imports `useUIStore` and reads `notifications` for the badge count. Replace the inline bell button block with `<NotificationBell />` from the new component. `NotificationBell` manages its own open state and renders `NotificationDropdown` as a child.

### 8.4 DashboardLayout Integration

The `useNotificationPoller` hook should be added to `DashboardLayout` (`src/app/(dashboard)/layout.tsx`) — a single invocation at layout level ensures the unread count stays live for all pages without each page needing to manage it.

### 8.5 Preferences: No Push Subscription Endpoint

The backend has no push subscription or device token endpoint. The `push` preference toggle can be presented in the UI but browser push permission flow (requesting `Notification.permission`, storing a service worker subscription endpoint) is out of scope until a BullMQ dispatcher is wired. For now, the toggle simply sets the `push` boolean on the preference document.

### 8.6 Ownership Check Gap

`PATCH /notifications/:id/read` does not verify that the requesting user owns the notification — it only checks that the document exists and is not soft-deleted. This is acceptable for a closed school platform (notification IDs are opaque ObjectIds) but should be noted for a future hardening pass: add `{ _id: id, recipientId: req.user!.id, isDeleted: false }` to the `findOneAndUpdate` filter in `NotificationService.markAsRead`.

### 8.7 Bulk Target Resolves Student userId, Not Parent userId

`POST /notifications/bulk` walks `Student.userId` to resolve recipients. This targets the student's own user account. If the intent is to notify parents (e.g. a school-wide announcement aimed at parents), the bulk endpoint must be extended to also resolve `Student.parentIds`. Track this as a known limitation when building the admin broadcast UI.

---

## 9. Acceptance Criteria

### Bell & Badge

- [ ] The notification bell badge shows the live unread count from `GET /notifications/unread-count`.
- [ ] The badge is hidden (not rendered) when unread count is 0.
- [ ] The badge shows "99+" when count exceeds 99.
- [ ] The count refreshes automatically every 60 seconds and on tab focus.

### Dropdown

- [ ] Clicking the bell opens the `NotificationDropdown`.
- [ ] The dropdown displays the 10 most recent notifications with title, message snippet, and relative timestamp.
- [ ] Unread items have a visible unread indicator (coloured dot or highlighted background).
- [ ] "Mark all as read" button is present and disabled when there are no unread items.
- [ ] Clicking "Mark all as read" calls `PATCH /notifications/read-all`, clears all visual unread indicators, and resets the badge to 0.
- [ ] Clicking a notification item calls `PATCH /notifications/:id/read` and removes the unread indicator for that item.
- [ ] If `notification.data` contains a `link`, clicking the item navigates to that route.
- [ ] "View all notifications" link navigates to `/notifications`.
- [ ] A skeleton/loading state is shown while the initial fetch is in flight.
- [ ] An "No notifications" empty state is shown when the list is empty.

### Full Notifications Page

- [ ] Page renders at `/notifications` and is accessible to all authenticated roles.
- [ ] Displays all notifications with pagination (or infinite scroll).
- [ ] Supports filtering by "All", "Unread", and "Read" tabs/segments.
- [ ] "Mark all as read" action is available on the page.

### Notification Preferences Page

- [ ] Page renders at `/notifications/preferences`.
- [ ] Loads current preferences from `GET /notifications/preferences` on mount.
- [ ] Each channel switch reflects the stored value.
- [ ] Toggling a switch immediately calls `PUT /notifications/preferences` with only that field.
- [ ] A success toast confirms the save.
- [ ] If the API call fails, the switch reverts to its previous state and an error toast is shown.

### API & Store

- [ ] `useNotificationStore` is the single source of truth for notification list and unread count.
- [ ] `useUIStore.notifications` is kept in sync so `TopBar` badge renders correctly.
- [ ] All API calls use the shared `apiClient` from `src/lib/api-client.ts` (includes auth token injection and token refresh).
- [ ] Network errors are caught and displayed as toast messages without crashing the UI.

### TypeScript

- [ ] The `Notification` interface in `src/types/index.ts` is updated to match the backend document shape (replaces the current simplified interface at line 416).
- [ ] `NotificationPreference` type is added to `src/types/index.ts`.
- [ ] All new components and hooks pass `tsc --noEmit` with no errors.
