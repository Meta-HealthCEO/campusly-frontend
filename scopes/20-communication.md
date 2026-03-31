# 20 — Communication Module

## 1. Module Overview

The Communication module enables school administrators and teachers to send messages to parents and guardians. It is a **broadcast / outbox model** — admins compose bulk outbound messages targeted at an entire school, a grade, a class, or a custom list of users; parents and teachers receive those messages in a read-only inbox. The module does **not** currently implement a two-way conversation or reply thread; all communication flows from admin/teacher outward to parent inboxes.

### Roles and Capabilities

| Role | Can Do |
|---|---|
| `school_admin` / `super_admin` | Create/edit/delete message templates; send bulk messages; view sent-message history; view per-message delivery stats and per-recipient logs |
| `teacher` | Compose messages to individual parents (frontend UI only — no dedicated backend endpoint yet; wired to the same `POST /communication/send` path) |
| `parent` | Read-only inbox — views messages, announcements, and alerts sent to them |

### Key Design Decisions

- **Recipient resolution is server-side.** The sender supplies a targeting scope (`school`, `grade`, `class`, or `custom`); the service resolves the actual parent `userId` list by joining Student → Guardian → Parent models.
- **Delivery is synchronous in development.** `BulkMessage.status` is immediately set to `sent` after `MessageLog` rows are written. The code contains a comment flagging that a BullMQ queue should replace this in production.
- **Soft deletes** on both `MessageTemplate` and `BulkMessage` (`isDeleted: true`).
- **Frontend is currently mock-data driven.** All three pages import `mockMessages` from `@/lib/mock-data` and call `console.log` instead of hitting the API. The compose forms use `react-hook-form` + `zod` validation; the submission handlers must be wired to the API.

---

## 2. Backend API Endpoints

All routes are mounted at `/api/communication` (assumed base path — verify in main router registration). Every route requires a valid Bearer token (`authenticate` middleware). All write routes are restricted to `school_admin` or `super_admin`.

---

### 2.1 Templates

#### POST /communication/templates

Create a reusable message template.

**Auth:** Bearer token — `school_admin` or `super_admin`

**Request body:**

```json
{
  "schoolId": "64f1a2b3c4d5e6f7a8b9c0d1",   // required — 24-char hex ObjectId
  "name": "End of term reminder",             // required — non-empty string
  "type": "fee_reminder",                     // required — enum: "fee_reminder" | "absence" | "general" | "event" | "emergency"
  "subject": "Your fees are due",             // required — non-empty string
  "body": "Dear parent, please note...",      // required — non-empty string
  "channel": "email"                          // optional — enum: "email" | "sms" | "whatsapp" | "all" (default: "all")
}
```

**Validation rules (Zod — `createTemplateSchema`):**
- `schoolId`: must match `/^[0-9a-fA-F]{24}$/`
- `name`: `min(1)`
- `type`: one of the five enum values — required
- `subject`: `min(1)`
- `body`: `min(1)`
- `channel`: optional; when omitted the model defaults to `"all"`

**Response `201`:**

```json
{
  "success": true,
  "message": "Template created successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0e2",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "End of term reminder",
    "type": "fee_reminder",
    "subject": "Your fees are due",
    "body": "Dear parent, please note...",
    "channel": "email",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  }
}
```

---

#### GET /communication/templates

List all non-deleted templates for a school, paginated.

**Auth:** Bearer token — `school_admin` or `super_admin`

**Query parameters:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `schoolId` | string (ObjectId) | conditional | Falls back to `req.user.schoolId` if omitted |
| `page` | number | no | Default from `PAGINATION_DEFAULTS.page` |
| `limit` | number | no | Default from `PAGINATION_DEFAULTS.limit`; capped at `PAGINATION_DEFAULTS.maxLimit` |

**Response `200`:**

```json
{
  "success": true,
  "message": "Templates retrieved successfully",
  "data": {
    "data": [ /* array of IMessageTemplate objects */ ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

#### GET /communication/templates/:id

Retrieve a single template by its MongoDB `_id`.

**Auth:** Bearer token — `school_admin` or `super_admin`

**Path params:** `id` — 24-char hex ObjectId

**Response `200`:**

```json
{
  "success": true,
  "message": "Template retrieved successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0e2",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "End of term reminder",
    "type": "fee_reminder",
    "subject": "Your fees are due",
    "body": "Dear parent, please note...",
    "channel": "email",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  }
}
```

**Error `404`:** `{ "success": false, "error": "Template not found" }`

---

#### PUT /communication/templates/:id

Update any subset of a template's fields (all fields optional via `.partial()`).

**Auth:** Bearer token — `school_admin` or `super_admin`

**Request body:** Same shape as `createTemplateSchema` but all fields optional (`updateTemplateSchema = createTemplateSchema.partial()`).

**Response `200`:**

```json
{
  "success": true,
  "message": "Template updated successfully",
  "data": { /* updated IMessageTemplate */ }
}
```

**Error `404`:** Template not found or already soft-deleted.

---

#### DELETE /communication/templates/:id

Soft-delete a template (`isDeleted: true`).

**Auth:** Bearer token — `school_admin` or `super_admin`

**Response `200`:**

```json
{
  "success": true,
  "message": "Template deleted successfully",
  "data": null
}
```

**Error `404`:** Template not found.

---

### 2.2 Bulk Messages

#### POST /communication/send

Send a bulk message to a resolved set of parent users.

**Auth:** Bearer token — `school_admin` or `super_admin`

**Request body:**

```json
{
  "schoolId": "64f1a2b3c4d5e6f7a8b9c0d1",  // required
  "templateId": "64f1a2b3c4d5e6f7a8b9c0e2", // optional — links to an existing template
  "subject": "School closure tomorrow",       // required — min(1)
  "body": "Due to load shedding...",          // required — min(1)
  "channel": "all",                           // optional — "email"|"sms"|"whatsapp"|"all" (default "all")
  "recipients": {
    "type": "grade",                          // required — "school"|"grade"|"class"|"custom"
    "targetIds": ["64f1...gradeId"]           // optional — required when type is "grade", "class", or "custom"
  }
}
```

**Validation rules (Zod — `sendBulkMessageSchema`):**
- `schoolId`: ObjectId regex
- `templateId`: optional ObjectId
- `subject`: `min(1)`
- `body`: `min(1)`
- `channel`: optional enum
- `recipients.type`: required enum `"school"|"grade"|"class"|"custom"`
- `recipients.targetIds`: optional array of ObjectId strings

**Recipient resolution logic (server-side):**

| `recipients.type` | Resolution |
|---|---|
| `"school"` | All `Parent` docs with matching `schoolId` and `isDeleted: false` |
| `"grade"` | `Student` docs where `gradeId` is in `targetIds` and `enrollmentStatus: "active"` → their `guardianIds` → `Parent.userId` |
| `"class"` | Same as grade but filtering on `classId` |
| `"custom"` | `targetIds` are used directly as user ObjectIds |

Duplicates are removed via `Set` deduplication before logs are created.

**Response `201`:**

```json
{
  "success": true,
  "message": "Bulk message sent successfully",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0f3",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "templateId": "64f1a2b3c4d5e6f7a8b9c0e2",
    "subject": "School closure tomorrow",
    "body": "Due to load shedding...",
    "channel": "all",
    "sentBy": "64f1a2b3c4d5e6f7a8b9c0a1",
    "recipients": { "type": "grade", "targetIds": ["64f1...gradeId"] },
    "totalRecipients": 45,
    "delivered": 45,
    "failed": 0,
    "status": "sent",
    "sentAt": "2026-03-31T08:00:00.000Z",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  }
}
```

**Side effects:** One `MessageLog` document is created per unique recipient, all initially `status: "queued"`, then bulk-updated to `status: "sent"` synchronously (dev mode).

---

#### GET /communication/messages

List all bulk messages sent by a school, paginated, sorted newest-first.

**Auth:** Bearer token — `school_admin` or `super_admin`

**Query parameters:**

| Param | Type | Notes |
|---|---|---|
| `schoolId` | string | Falls back to `req.user.schoolId` |
| `page` | number | Optional |
| `limit` | number | Optional |

**Response `200`:** Populated `sentBy` (firstName, lastName, email) and `templateId` (name).

```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "data": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0f3",
        "subject": "School closure tomorrow",
        "body": "Due to load shedding...",
        "channel": "all",
        "sentBy": { "_id": "...", "firstName": "Noma", "lastName": "Dlamini", "email": "noma@school.ac.za" },
        "templateId": { "_id": "...", "name": "End of term reminder" },
        "totalRecipients": 45,
        "delivered": 45,
        "failed": 0,
        "status": "sent",
        "sentAt": "2026-03-31T08:00:00.000Z",
        "createdAt": "2026-03-31T08:00:00.000Z"
      }
    ],
    "total": 18,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

#### GET /communication/messages/:id

Retrieve a single bulk message by its `_id`. Same population as list.

**Auth:** Bearer token — `school_admin` or `super_admin`

**Response `200`:** Single `IBulkMessage` object wrapped in `apiResponse`.

**Error `404`:** Message not found.

---

### 2.3 Delivery Stats

#### GET /communication/messages/:id/stats

Return per-status counts for all `MessageLog` rows belonging to this bulk message.

**Auth:** Bearer token — `school_admin` or `super_admin`

**Response `200`:**

```json
{
  "success": true,
  "message": "Delivery stats retrieved successfully",
  "data": [
    { "status": "sent",      "count": 43 },
    { "status": "delivered", "count": 2  },
    { "status": "failed",    "count": 0  }
  ]
}
```

The array contains one entry per distinct `MessageLog.status` value present; statuses with zero occurrences are omitted (MongoDB `$group` result).

---

#### GET /communication/messages/:id/logs

Paginated list of individual recipient-level delivery logs for a bulk message.

**Auth:** Bearer token — `school_admin` or `super_admin`

**Query parameters:** `page`, `limit`

**Response `200`:** `recipientId` is populated with `firstName`, `lastName`, `email`.

```json
{
  "success": true,
  "message": "Message logs retrieved successfully",
  "data": {
    "data": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0g4",
        "bulkMessageId": "64f1a2b3c4d5e6f7a8b9c0f3",
        "recipientId": { "_id": "...", "firstName": "Thabo", "lastName": "Mokoena", "email": "thabo@gmail.com" },
        "channel": "all",
        "status": "sent",
        "sentAt": "2026-03-31T08:00:01.000Z",
        "deliveredAt": null,
        "readAt": null,
        "error": null,
        "createdAt": "2026-03-31T08:00:01.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

## 3. Frontend Pages

### 3.1 Admin — `/admin/communication`

**File:** `src/app/(dashboard)/admin/communication/page.tsx`

**Current state:** Mock-data driven. Displays `mockMessages` (from `@/lib/mock-data`).

**Page layout:**
- `PageHeader` with title "Communication", description "Send messages and announcements to parents and staff", and a "New Message" button.
- Message list: each message rendered in a `Card` showing subject, body preview, sender name, timestamp, and two `Badge` components (type and priority).
- Unread indicator: a small primary-colored circle dot next to the subject of unread messages.
- `EmptyState` shown when `mockMessages` is empty.

**Compose dialog (`"New Message"`):**
- Fields: Subject (`Input`), Message body (`Textarea`), Type (`Select`: message / announcement / alert), Priority (`Select`: low / normal / high / urgent), Recipients (`Input` — currently a free-text comma-separated ID field).
- Validation: `messageSchema` via `zodResolver`.
  - `subject`: min 3 chars
  - `body`: min 10 chars
  - `type`: required enum
  - `priority`: required enum
  - `recipientIds`: array, min 1 item
- On submit: `console.log` (not yet wired to API). Toast success shown via `sonner`.

**Styling:**
- Type badges: message = blue, announcement = purple, alert = red.
- Priority badges: low = gray, normal = blue, high = yellow, urgent = red.
- Dark-mode variants for all badge styles.

---

### 3.2 Parent — `/parent/communication`

**File:** `src/app/(dashboard)/parent/communication/page.tsx`

**Current state:** Read-only inbox, mock-data driven.

**Page layout:**
- `PageHeader` with title "Messages", description "View messages, announcements, and alerts from the school."
- Summary stats row (3 cards): Total Messages, Unread count, Urgent count.
- Inbox list inside a `Card`:
  - Each row: read/unread icon (`MailOpen` / `Mail`), subject (bold if unread), priority `Badge`, type `Badge` with icon, sender name, body preview, relative + absolute timestamp.
  - Unread rows have `bg-muted/30` tint.
  - Clicking a row opens a detail dialog.
- `EmptyState` for empty inbox.

**Message detail dialog:**
- Shows: subject + priority badge in header, sender name, formatted timestamp, full message body (whitespace preserved), attachments list (if any — links styled as primary underline).

**Type icons used:** `MessageSquare` (message), `Megaphone` (announcement), `AlertCircle` (alert).

---

### 3.3 Teacher — `/teacher/communication`

**File:** `src/app/(dashboard)/teacher/communication/page.tsx`

**Current state:** Mock-data driven. Can compose, displays `mockMessages`.

**Page layout:**
- `PageHeader` with title "Communication", description "Send messages to parents and guardians", and a "Message Parents" button.
- Message list: each message in a `Card` with sender avatar circle, subject, type `Badge`, priority icon (color-coded), body preview, sender name, timestamp, and "New" badge for unread.
- `EmptyState` for empty list.

**Compose dialog ("Message Parents"):**
- Recipients selector: `Select` dropdown populated from `mockParents`. Selected parents appear as removable `Badge` chips.
- Fields: Subject (`Input`), Priority (`Select`), Message body (`Textarea`, min-height 120px).
- Validation: same `messageSchema` as admin.
- State: `selectedRecipients: string[]` tracked locally; synced into `react-hook-form` via `setValue('recipientIds', ...)`.
- On submit: `console.log` (not yet wired to API). Dialog closes and form resets.

---

## 4. User Flows

### 4.1 Admin Sends a Broadcast to an Entire School

1. Admin navigates to `/admin/communication`.
2. Clicks "New Message" — compose dialog opens.
3. Fills in Subject, Message body, selects Type = "announcement", Priority = "normal".
4. Enters recipient scope — for a school-wide blast, the field must be updated to accept a scope selector (currently free-text IDs). Intended call: `POST /communication/send` with `recipients.type = "school"`.
5. Clicks Send — `POST /communication/send` fires with `schoolId`, `subject`, `body`, `channel`, and `recipients: { type: "school", targetIds: [] }`.
6. Server resolves all active parents for the school, creates `BulkMessage` + `MessageLog` rows, returns the `IBulkMessage` object.
7. Dialog closes. New message card appears at the top of the list.
8. Admin can later visit the message detail view and check `/communication/messages/:id/stats` for delivery counts.

### 4.2 Admin Sends to a Specific Grade

Same as 4.1 except:
- `recipients.type = "grade"` and `recipients.targetIds = [gradeId]`.
- Server fetches only students in that grade, resolves their guardian → parent user IDs.

### 4.3 Admin Creates and Uses a Template

1. Admin opens template management (to be built as a sub-section or tab on `/admin/communication`).
2. Fills in template name, type, subject, body, channel — calls `POST /communication/templates`.
3. When composing a new message, admin selects a template from a dropdown — fields auto-populate.
4. On send, `templateId` is included in the payload to `POST /communication/send`.

### 4.4 Teacher Messages a Parent

1. Teacher navigates to `/teacher/communication`.
2. Clicks "Message Parents".
3. Selects one or more parents from the dropdown (backed by `mockParents` today; should call a parents API in future).
4. Fills in Subject, Priority, body.
5. Submits — should call `POST /communication/send` with `recipients.type = "custom"` and `recipients.targetIds = [selectedUserIds]`.
6. Dialog closes and the sent message appears in the teacher's list.

### 4.5 Parent Reads a Message

1. Parent navigates to `/parent/communication`.
2. Inbox lists all messages received, unread items highlighted with `bg-muted/30` and a bold subject.
3. Parent clicks a message row — detail dialog opens showing full body, sender, timestamp, and any attachments.
4. On open, a `PATCH` or equivalent call should mark the message as read (not yet implemented — `isRead` is currently a client-side mock field only).

---

## 5. Data Models

### 5.1 MessageTemplate (MongoDB collection: `messagetemplates`)

```typescript
interface IMessageTemplate {
  _id:       ObjectId;
  schoolId:  ObjectId;          // ref: School
  name:      string;            // trim
  type:      'fee_reminder' | 'absence' | 'general' | 'event' | 'emergency';
  subject:   string;
  body:      string;
  channel:   'email' | 'sms' | 'whatsapp' | 'all';  // default: 'all'
  isDeleted: boolean;           // default: false — soft delete
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ schoolId: 1, type: 1 }`

---

### 5.2 BulkMessage (MongoDB collection: `bulkmessages`)

```typescript
interface IBulkMessage {
  _id:              ObjectId;
  schoolId:         ObjectId;           // ref: School
  templateId?:      ObjectId;           // ref: MessageTemplate — optional
  subject:          string;
  body:             string;
  channel:          'email' | 'sms' | 'whatsapp' | 'all';  // default: 'all'
  sentBy:           ObjectId;           // ref: User
  recipients: {
    type:           'school' | 'grade' | 'class' | 'custom';
    targetIds:      ObjectId[];         // default: []
  };
  totalRecipients:  number;             // default: 0 — set after resolution
  delivered:        number;             // default: 0
  failed:           number;             // default: 0
  status:           'draft' | 'queued' | 'sending' | 'sent' | 'failed';  // default: 'draft'
  sentAt?:          Date;
  isDeleted:        boolean;            // default: false
  createdAt:        Date;
  updatedAt:        Date;
}
```

**Indexes:**
- `{ schoolId: 1, status: 1 }`
- `{ schoolId: 1, createdAt: -1 }`

---

### 5.3 MessageLog (MongoDB collection: `messagelogs`)

```typescript
interface IMessageLog {
  _id:           ObjectId;
  bulkMessageId: ObjectId;      // ref: BulkMessage
  recipientId:   ObjectId;      // ref: User
  channel:       string;
  status:        'queued' | 'sent' | 'delivered' | 'failed' | 'read';  // default: 'queued'
  sentAt?:       Date;
  deliveredAt?:  Date;
  readAt?:       Date;
  error?:        string;        // populated on failure
  isDeleted:     boolean;       // default: false
  createdAt:     Date;
  updatedAt:     Date;
}
```

**Indexes:**
- `{ bulkMessageId: 1 }`
- `{ recipientId: 1, createdAt: -1 }`

---

### 5.4 Frontend `Message` Interface (client-side type — `src/types/index.ts`)

This type is used by all three frontend pages. It is currently populated from `mockMessages` and does not map 1:1 to `IBulkMessage`. It will need to be reconciled with the API response shape during integration:

```typescript
interface Message {
  id:           string;
  senderId:     string;
  sender:       User;           // populated from API
  recipientIds: string[];
  subject:      string;
  body:         string;
  type:         'message' | 'announcement' | 'alert';  // NOTE: frontend-only concept — not in backend model
  priority:     'low' | 'normal' | 'high' | 'urgent'; // NOTE: frontend-only concept — not in backend model
  isRead:       boolean;        // NOTE: no read-tracking in backend yet
  attachments:  string[];       // NOTE: no attachment support in backend yet
  createdAt:    string;         // ISO date string
}
```

### 5.5 Frontend `MessageFormData` (validation schema — `src/lib/validations.ts`)

```typescript
// messageSchema fields and rules:
{
  subject:      string  // min(3)
  body:         string  // min(10)
  type:         'message' | 'announcement' | 'alert'
  priority:     'low' | 'normal' | 'high' | 'urgent'
  recipientIds: string[]  // min(1 item)
}
```

---

## 6. State Management

The frontend currently has no dedicated communication store — all state is local React `useState` within each page. The following describes the target state management design for API integration.

### 6.1 Communication Store (to be implemented)

A Zustand store (consistent with the rest of the app) should manage:

```typescript
interface CommunicationStore {
  // Outbox (admin/teacher sent messages)
  messages:       BulkMessage[];
  messagesTotal:  number;
  messagesPage:   number;
  isLoadingMessages: boolean;

  // Templates (admin only)
  templates:      MessageTemplate[];
  templatesTotal: number;
  isLoadingTemplates: boolean;

  // Inbox (parent view — read-only)
  inbox:          Message[];         // resolved for current user
  unreadCount:    number;

  // Detail + delivery
  selectedMessage:     BulkMessage | null;
  deliveryStats:       DeliveryStatEntry[];   // { status, count }[]
  deliveryLogs:        MessageLog[];
  isLoadingStats:      boolean;

  // Actions
  fetchMessages:       (schoolId: string, page?: number) => Promise<void>;
  fetchTemplates:      (schoolId: string) => Promise<void>;
  sendBulkMessage:     (payload: SendBulkMessageInput) => Promise<void>;
  createTemplate:      (payload: CreateTemplateInput) => Promise<void>;
  updateTemplate:      (id: string, payload: Partial<CreateTemplateInput>) => Promise<void>;
  deleteTemplate:      (id: string) => Promise<void>;
  fetchDeliveryStats:  (messageId: string) => Promise<void>;
  fetchDeliveryLogs:   (messageId: string, page?: number) => Promise<void>;
  markAsRead:          (messageId: string) => void;  // optimistic local update
}
```

### 6.2 Real-time Considerations

The current backend has no WebSocket or SSE layer for push notifications. The `isRead` field is client-side only. If real-time delivery status is added in future (via BullMQ webhooks or a WebSocket), the store should expose a `subscribe` / `unsubscribe` method and update `deliveryStats` incrementally.

---

## 7. Components Needed

The following components must be built or promoted from inline page code to shared components during integration:

### 7.1 Shared (used across roles)

| Component | Location | Purpose |
|---|---|---|
| `MessageCard` | `components/communication/MessageCard.tsx` | Single message row card for inbox/outbox lists. Props: `message: Message`, `onClick?: () => void`, `variant?: "inbox" \| "outbox"` |
| `MessageDetailDialog` | `components/communication/MessageDetailDialog.tsx` | Full-screen-width dialog showing message body, sender, timestamp, attachments. Currently duplicated in admin and parent pages |
| `MessageBadges` | `components/communication/MessageBadges.tsx` | Renders type + priority `Badge` pair with correct color mapping. Currently duplicated in all three pages |
| `ComposeMessageDialog` | `components/communication/ComposeMessageDialog.tsx` | Compose + send dialog. Currently duplicated across admin and teacher pages with minor differences. Should accept a `recipientMode` prop (`"ids" \| "parents-picker" \| "scope-picker"`) |

### 7.2 Admin-specific

| Component | Location | Purpose |
|---|---|---|
| `BulkMessageScopePicker` | `components/communication/BulkMessageScopePicker.tsx` | Select recipients by scope: entire school, grade (with grade picker), class (with class picker), or custom user IDs. Replaces the current free-text IDs `Input` |
| `TemplateManager` | `components/communication/TemplateManager.tsx` | CRUD list for `MessageTemplate` — table with edit/delete actions, "New Template" button |
| `TemplateForm` | `components/communication/TemplateForm.tsx` | Create/update template form. Fields: name, type, subject, body, channel |
| `TemplateSelector` | `components/communication/TemplateSelector.tsx` | Dropdown inside compose dialog to load an existing template and auto-fill subject/body |
| `DeliveryStatsPanel` | `components/communication/DeliveryStatsPanel.tsx` | Visual breakdown (bar or stat tiles) of `{ status, count }[]` from `GET /messages/:id/stats` |
| `DeliveryLogsTable` | `components/communication/DeliveryLogsTable.tsx` | Paginated table of `MessageLog` rows showing recipient name, channel, status, timestamps |
| `MessageHistoryTable` | `components/communication/MessageHistoryTable.tsx` | Paginated table of sent `BulkMessage` rows with columns: subject, channel, recipients count, delivered, status, date, actions (view stats) |

### 7.3 Teacher-specific

| Component | Location | Purpose |
|---|---|---|
| `ParentRecipientPicker` | `components/communication/ParentRecipientPicker.tsx` | Multi-select for parents using real API data. Currently uses `mockParents`. Should accept optional `classId` filter |

### 7.4 Parent-specific

| Component | Location | Purpose |
|---|---|---|
| `InboxSummaryCards` | `components/communication/InboxSummaryCards.tsx` | Three stat cards (total, unread, urgent). Currently inlined in parent page |

---

## 8. Integration Notes

### 8.1 API Client

Create `src/lib/api/communication.ts` with typed functions:

```typescript
// Templates
export const createTemplate     = (data: CreateTemplateInput) => api.post('/communication/templates', data);
export const listTemplates       = (schoolId: string, page?: number) => api.get('/communication/templates', { params: { schoolId, page } });
export const getTemplate         = (id: string) => api.get(`/communication/templates/${id}`);
export const updateTemplate      = (id: string, data: Partial<CreateTemplateInput>) => api.put(`/communication/templates/${id}`, data);
export const deleteTemplate      = (id: string) => api.delete(`/communication/templates/${id}`);

// Messages
export const sendBulkMessage     = (data: SendBulkMessageInput) => api.post('/communication/send', data);
export const listMessages        = (schoolId: string, page?: number) => api.get('/communication/messages', { params: { schoolId, page } });
export const getMessage          = (id: string) => api.get(`/communication/messages/${id}`);

// Delivery
export const getDeliveryStats    = (id: string) => api.get(`/communication/messages/${id}/stats`);
export const getDeliveryLogs     = (id: string, page?: number) => api.get(`/communication/messages/${id}/logs`, { params: { page } });
```

### 8.2 Frontend-to-Backend Field Mapping Gaps

The frontend `Message` type and `MessageFormData` schema contain fields that do not exist in the backend models. These must be resolved before API wiring:

| Frontend field | Status | Resolution required |
|---|---|---|
| `message.type` (`"message" \| "announcement" \| "alert"`) | Not in `BulkMessage` model | Add a `type` field to `IBulkMessage` and `sendBulkMessageSchema`, or drop from frontend and use template type |
| `message.priority` (`"low" \| "normal" \| "high" \| "urgent"`) | Not in `BulkMessage` model | Add a `priority` field to `IBulkMessage` and `sendBulkMessageSchema` |
| `message.isRead` | Not tracked in backend | Add read-tracking: either a `MessageLog.status = "read"` update or a separate `ReadReceipt` model keyed to `(userId, bulkMessageId)` |
| `message.attachments` | Not in backend | Add `attachments: string[]` (URLs) to `IBulkMessage` if file upload is required |
| `MessageFormData.recipientIds` | Admin page uses free-text IDs; teacher page uses parent user IDs | Replace with `BulkMessageScopePicker` for admin; teacher should send `recipients: { type: "custom", targetIds: [...] }` |

### 8.3 Connection to Notification Module

When a `BulkMessage` is sent, the Notification module should be invoked to create in-app `Notification` documents for each resolved recipient. This is not implemented in the current service. The connection point is inside `CommunicationModuleService.sendBulkMessage`, after `MessageLog.insertMany()`, before the status update to `"sent"`.

Proposed: call `NotificationService.createBulk(recipientIds, { title: subject, message: body, type: 'info', link: '/parent/communication' })`.

### 8.4 Role Access Summary

| Endpoint | school_admin | super_admin | teacher | parent |
|---|---|---|---|---|
| POST /templates | yes | yes | no | no |
| GET /templates | yes | yes | no | no |
| GET /templates/:id | yes | yes | no | no |
| PUT /templates/:id | yes | yes | no | no |
| DELETE /templates/:id | yes | yes | no | no |
| POST /send | yes | yes | no* | no |
| GET /messages | yes | yes | no | no |
| GET /messages/:id | yes | yes | no | no |
| GET /messages/:id/stats | yes | yes | no | no |
| GET /messages/:id/logs | yes | yes | no | no |

*Teachers currently have no backend endpoint to send messages. The teacher compose form must either be routed through an admin-proxied endpoint or a new `teacher`-authorized send route must be added to `routes.ts`.

### 8.5 Parent Inbox Endpoint (Missing)

There is currently **no endpoint for a parent to retrieve their own messages**. The parent `/communication` page relies entirely on `mockMessages`. A new endpoint is required:

```
GET /communication/inbox
```
Auth: any authenticated user. Returns `MessageLog` rows for `recipientId === req.user.id`, joining `BulkMessage` for the message content. This requires either a new controller method or reuse of `getMessageLogs` with a user-scoped filter.

### 8.6 Pagination

All list endpoints return `{ data, total, page, limit, totalPages }`. Frontend table/list components should use this to render a `Pagination` control. The `page` query param must be passed from the store action.

---

## 9. Acceptance Criteria

### Templates

- [ ] Admin can create a message template with all required fields; the template appears in the template list immediately.
- [ ] Admin can edit an existing template; changes are reflected without a full page reload.
- [ ] Admin can soft-delete a template; it no longer appears in the list (but record is not destroyed in the DB).
- [ ] Validation errors are displayed inline when required fields are missing or invalid.

### Sending Bulk Messages

- [ ] Admin can send a message to the entire school; all active parent users for that school receive a `MessageLog` entry.
- [ ] Admin can target a specific grade; only parents whose children are in that grade and enrolled as `active` receive the message.
- [ ] Admin can target a specific class; same parent-resolution logic as grade.
- [ ] Admin can target custom user IDs; only those users receive the message.
- [ ] Duplicate recipients (e.g., a parent with children in multiple targeted grades) receive only one `MessageLog` entry.
- [ ] A sent message is immediately visible in the admin's sent messages list with `status: "sent"`.
- [ ] The compose form shows validation errors if subject or body are missing.
- [ ] Using a template pre-fills subject and body in the compose dialog.

### Message History

- [ ] Admin can view a paginated list of all messages sent by their school, sorted newest-first.
- [ ] Each row shows: subject, channel, total recipients, delivered count, status, sent date, sender name.
- [ ] Admin can open a message detail view showing full body and delivery stats.

### Delivery Stats and Logs

- [ ] Admin can view the delivery stats for any sent message: counts of queued / sent / delivered / failed / read statuses.
- [ ] Admin can view the paginated per-recipient delivery log: recipient name, email, channel, status, sent timestamp.

### Teacher Flow

- [ ] Teacher can select one or more parents from a dropdown and compose a message with subject, priority, and body.
- [ ] Selected parents appear as removable chips; removing a chip updates the recipients list.
- [ ] The form cannot be submitted with zero recipients.
- [ ] Sent message appears in the teacher's message list.

### Parent Inbox

- [ ] Parent inbox shows all messages addressed to them, sorted newest-first.
- [ ] Unread messages are visually distinct (bold subject, highlighted background, unread mail icon).
- [ ] Clicking a message opens a detail dialog with the full body and attachment list.
- [ ] Opening a message marks it as read (both visually and via API once read-tracking is implemented).
- [ ] Summary cards correctly reflect total, unread, and urgent counts.
- [ ] Inbox shows an empty state when no messages have been received.

### General

- [ ] All API errors (network failure, 404, 400 validation) surface as toast notifications — not silent failures.
- [ ] Loading states are shown on all list fetches and form submissions.
- [ ] All three role pages compile without TypeScript errors after mock data is replaced with real API calls.
- [ ] Route is protected — unauthenticated users are redirected to login.
