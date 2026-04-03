# 35 — Production Communication Services

## 1. Module Overview

The Communication Services module replaces the current stub implementations (console.log) with production-ready delivery channels: email via Resend, SMS via Africa's Talking, WhatsApp via the existing WhatsApp Business API integration, and push notifications via Firebase Cloud Messaging (FCM). It adds template management, delivery tracking, retry logic, cost tracking, and a unified admin dashboard.

### Current State (Before This Scope)

| Channel | Current Implementation | File |
|---|---|---|
| Email | `console.log` in dev, commented-out nodemailer in prod | `src/services/email.service.ts` |
| SMS | `console.log` in dev, commented-out fetch in prod | `src/services/sms.service.ts` |
| WhatsApp | Functional Twilio integration with webhook, opt-in/opt-out, delivery reports | `src/modules/WhatsApp/` |
| Push | `console.log` placeholder in `CommunicationService.routeMessage` | `src/services/communication.service.ts` |
| In-App | Functional notification system (CRUD, unread count, preferences) | `src/modules/Notification/` |

### Target State (After This Scope)

| Channel | Provider | Status |
|---|---|---|
| Email | Resend (primary), SendGrid (fallback) | Full implementation with tracking |
| SMS | Africa's Talking (primary for SA market) | Full implementation with delivery receipts |
| WhatsApp | Existing Twilio integration — enhanced with templates | Already functional, add template support |
| Push | Firebase Cloud Messaging | New implementation |
| In-App | Existing — no changes | Already functional |

### Key Capabilities

1. **Unified Send API:** A single endpoint to send a message that routes to the appropriate channel(s) based on recipient preferences.
2. **Template Management:** Admin creates/edits message templates per channel with variable placeholders (e.g., `{{studentName}}`, `{{amount}}`).
3. **Delivery Tracking:** Every outbound message is logged with status: `queued`, `sent`, `delivered`, `failed`, `bounced`, `opened` (email only).
4. **Retry Logic:** Failed messages are retried up to 3 times with exponential backoff via BullMQ.
5. **Cost Tracking:** Each message logs estimated cost (SMS: ~R0.30/message, WhatsApp: ~R0.15/message). Monthly cost reports per school.
6. **Channel Preferences:** Per-parent preference for which channels they want to receive communications on (already exists on Parent model as `communicationPreference`).
7. **Rate Limiting:** Per-school daily limits to prevent abuse (configurable, default: 500 emails, 200 SMS, 200 WhatsApp, 1000 push per day).

### Roles and Access

| Role | Permissions |
|---|---|
| `school_admin` | Configure channels, manage templates, view delivery dashboard, set rate limits |
| `teacher` | Send messages via existing communication flows (homework reminders, etc.) — no direct access to this module's admin UI |
| `parent` | Set own channel preferences (already via notification preferences) |
| `super_admin` | All school_admin permissions + platform-level config (API keys, global rate limits) |

This module does not have its own module key — it is core infrastructure. The admin UI pages are gated by `school_admin` role.

---

## 2. Backend API Endpoints

Existing service files are updated in-place. New admin endpoints are mounted under `/api/communication`. The existing `/api/whatsapp` and `/api/notifications` routes are unchanged.

---

### 2.1 Channel Configuration

#### GET /communication/config

Get the school's communication channel configuration.

**Auth:** school_admin, super_admin

**Query:** `schoolId` (falls back to `req.user.schoolId`)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "channels": {
      "email": {
        "enabled": true,
        "provider": "resend",
        "fromName": "Greenfields Primary",
        "fromEmail": "noreply@greenfields.co.za",
        "replyToEmail": "admin@greenfields.co.za",
        "apiKeyConfigured": true,
        "dailyLimit": 500,
        "usedToday": 142
      },
      "sms": {
        "enabled": true,
        "provider": "africas_talking",
        "senderId": "GreenPri",
        "apiKeyConfigured": true,
        "dailyLimit": 200,
        "usedToday": 38
      },
      "whatsapp": {
        "enabled": true,
        "provider": "twilio",
        "phoneNumber": "+27123456789",
        "apiKeyConfigured": true,
        "dailyLimit": 200,
        "usedToday": 65
      },
      "push": {
        "enabled": true,
        "provider": "fcm",
        "projectConfigured": true,
        "dailyLimit": 1000,
        "usedToday": 234
      }
    },
    "updatedAt": "2026-03-15T10:00:00.000Z"
  }
}
```

---

#### PUT /communication/config

Update channel configuration. API keys are stored encrypted.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "channels": {
    "email": {
      "enabled": "boolean",
      "provider": "string (enum: resend|sendgrid)",
      "fromName": "string",
      "fromEmail": "string (valid email)",
      "replyToEmail": "string (valid email, optional)",
      "apiKey": "string (optional — only sent when updating)",
      "dailyLimit": "number (optional, min 0)"
    },
    "sms": {
      "enabled": "boolean",
      "provider": "string (enum: africas_talking|twilio)",
      "senderId": "string (optional, max 11 chars for alphanumeric sender ID)",
      "apiKey": "string (optional)",
      "apiUsername": "string (optional — Africa's Talking specific)",
      "dailyLimit": "number (optional)"
    },
    "whatsapp": {
      "enabled": "boolean",
      "provider": "string (enum: twilio|whatsapp_business)",
      "phoneNumber": "string (optional)",
      "accountSid": "string (optional)",
      "authToken": "string (optional)",
      "dailyLimit": "number (optional)"
    },
    "push": {
      "enabled": "boolean",
      "provider": "string (enum: fcm)",
      "serviceAccountKey": "string (optional — JSON string of FCM service account)",
      "dailyLimit": "number (optional)"
    }
  }
}
```

**Response 200:** Updated config (API keys masked as `"***configured***"`).

---

#### POST /communication/config/test

Send a test message on a specific channel to verify configuration.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required)",
  "channel": "string (required, enum: email|sms|whatsapp|push)",
  "recipientEmail": "string (required if channel=email)",
  "recipientPhone": "string (required if channel=sms|whatsapp)",
  "recipientDeviceToken": "string (required if channel=push)"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "messageId": "msg_abc123", "status": "sent" },
  "message": "Test email sent successfully to admin@greenfields.co.za"
}
```

---

### 2.2 Message Templates

#### POST /communication/templates

Create a message template.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "name": "string (required, min 3, max 100)",
  "description": "string (optional, max 500)",
  "channel": "string (required, enum: email|sms|whatsapp|push|all)",
  "category": "string (required, enum: attendance|fees|academic|events|general|emergency)",
  "subject": "string (optional — email subject line, supports {{variables}})",
  "body": "string (required — message body, supports {{variables}})",
  "htmlBody": "string (optional — rich HTML body for email, supports {{variables}})",
  "variables": ["string (required — array of variable names used in the template)"],
  "isDefault": "boolean (optional, default false)"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0e0",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "name": "Absence Alert",
    "description": "Sent when a student is marked absent",
    "channel": "all",
    "category": "attendance",
    "subject": "{{schoolName}} - Absence Alert: {{studentName}}",
    "body": "Dear {{parentName}}, this is to inform you that {{studentName}} was marked absent on {{date}}. If this absence was planned, please contact the school.",
    "htmlBody": "<h2>Absence Alert</h2><p>Dear {{parentName}},</p><p>{{studentName}} was marked absent on <strong>{{date}}</strong>.</p>",
    "variables": ["schoolName", "parentName", "studentName", "date"],
    "isDefault": false,
    "isActive": true,
    "usageCount": 0,
    "createdBy": "64f1a2b3c4d5e6f7a8b9c0d2",
    "createdAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Template created successfully"
}
```

---

#### GET /communication/templates

List templates with filters.

**Auth:** school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `channel` | string | Filter by channel |
| `category` | string | Filter by category |
| `search` | string | Search by name or body content |
| `isActive` | boolean | Filter by active status |
| `page` | number | Default 1 |
| `limit` | number | Default 20 |

**Response 200:** Paginated list of templates.

---

#### GET /communication/templates/:id

Get a single template.

**Auth:** school_admin, super_admin

---

#### PUT /communication/templates/:id

Update a template.

**Auth:** school_admin, super_admin

**Body:** Partial template fields.

---

#### DELETE /communication/templates/:id

Soft-delete a template.

**Auth:** school_admin, super_admin

---

#### POST /communication/templates/:id/preview

Preview a template with sample data.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "variables": {
    "schoolName": "Greenfields Primary",
    "parentName": "Mrs. Molefe",
    "studentName": "Thandi Molefe",
    "date": "1 April 2026"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "subject": "Greenfields Primary - Absence Alert: Thandi Molefe",
    "body": "Dear Mrs. Molefe, this is to inform you that Thandi Molefe was marked absent on 1 April 2026. If this absence was planned, please contact the school.",
    "htmlBody": "<h2>Absence Alert</h2><p>Dear Mrs. Molefe,</p><p>Thandi Molefe was marked absent on <strong>1 April 2026</strong>.</p>"
  }
}
```

---

### 2.3 Message Sending

#### POST /communication/send

Send a message to one or more recipients via the unified send API.

**Auth:** school_admin, teacher, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "templateId": "string (optional — use a template)",
  "channel": "string (optional — override recipient preference, enum: email|sms|whatsapp|push|preference)",
  "recipients": [
    {
      "userId": "string (optional, ObjectId)",
      "parentId": "string (optional, ObjectId — resolves user and preference)",
      "email": "string (optional — direct email)",
      "phone": "string (optional — direct phone)",
      "deviceToken": "string (optional — direct push token)"
    }
  ],
  "subject": "string (optional — email subject, used if no template)",
  "body": "string (required if no templateId)",
  "htmlBody": "string (optional)",
  "variables": "object (optional — template variable values)",
  "priority": "string (optional, enum: low|normal|high|urgent, default normal)",
  "scheduledAt": "string (optional, ISO datetime — for scheduled messages)"
}
```

**Response 202:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_abc123",
    "recipientCount": 45,
    "channel": "preference",
    "status": "queued",
    "estimatedCost": {
      "email": { "count": 20, "cost": 0 },
      "sms": { "count": 15, "cost": 4.50 },
      "whatsapp": { "count": 10, "cost": 1.50 }
    }
  },
  "message": "45 messages queued for delivery"
}
```

**Side effects:**
- Enqueues BullMQ jobs: one per recipient per channel
- Each job is processed by the appropriate channel worker
- Results are tracked in the `DeliveryLog` collection

---

#### POST /communication/send/class

Send a message to all parents in a class.

**Auth:** school_admin, teacher, super_admin

**Body:**
```json
{
  "schoolId": "string (required)",
  "classId": "string (required, ObjectId)",
  "templateId": "string (optional)",
  "subject": "string (optional)",
  "body": "string (required if no templateId)",
  "variables": "object (optional)",
  "channel": "string (optional, default 'preference')"
}
```

**Response 202:** Same shape as `/send`.

---

#### POST /communication/send/grade

Send a message to all parents in a grade.

**Auth:** school_admin, super_admin

**Body:** Same as `/send/class` but with `gradeId` instead of `classId`.

---

#### POST /communication/send/school

Send a message to all parents in the school.

**Auth:** school_admin, super_admin

**Body:** Same as `/send/class` but without `classId`.

---

### 2.4 Delivery Tracking

#### GET /communication/delivery-log

Get delivery logs with filters.

**Auth:** school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `batchId` | string | Filter by send batch |
| `channel` | string | Filter by channel |
| `status` | string | `queued`, `sent`, `delivered`, `failed`, `bounced`, `opened` |
| `startDate` | string | Range start |
| `endDate` | string | Range end |
| `recipientSearch` | string | Search by recipient name or email/phone |
| `page` | number | Default 1 |
| `limit` | number | Default 50 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c100",
        "batchId": "batch_abc123",
        "channel": "email",
        "recipientEmail": "lindiwe@example.com",
        "recipientName": "Lindiwe Molefe",
        "subject": "Absence Alert: Thandi Molefe",
        "status": "delivered",
        "providerMessageId": "msg_resend_xyz",
        "sentAt": "2026-04-01T08:15:01.000Z",
        "deliveredAt": "2026-04-01T08:15:03.000Z",
        "openedAt": null,
        "cost": 0,
        "retryCount": 0
      }
    ],
    "total": 1245,
    "page": 1,
    "limit": 50,
    "totalPages": 25
  }
}
```

---

#### GET /communication/delivery-stats

Aggregated delivery statistics.

**Auth:** school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `startDate` | string | Range start (default: 30 days ago) |
| `endDate` | string | Range end (default: today) |
| `channel` | string | Optional channel filter |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalSent": 4523,
    "delivered": 4201,
    "failed": 122,
    "bounced": 45,
    "opened": 2890,
    "deliveryRate": 92.88,
    "openRate": 63.89,
    "byChannel": [
      { "channel": "email", "sent": 2100, "delivered": 2020, "failed": 30, "opened": 1450, "cost": 0 },
      { "channel": "sms", "sent": 1200, "delivered": 1120, "failed": 50, "cost": 360.00 },
      { "channel": "whatsapp", "sent": 800, "delivered": 750, "failed": 25, "cost": 120.00 },
      { "channel": "push", "sent": 423, "delivered": 311, "failed": 17, "cost": 0 }
    ],
    "byDay": [
      { "date": "2026-03-31", "sent": 145, "delivered": 138, "failed": 4 },
      { "date": "2026-04-01", "sent": 162, "delivered": 155, "failed": 3 }
    ],
    "totalCost": 480.00,
    "costByMonth": [
      { "month": "2026-03", "email": 0, "sms": 285.00, "whatsapp": 95.00, "push": 0, "total": 380.00 },
      { "month": "2026-04", "email": 0, "sms": 75.00, "whatsapp": 25.00, "push": 0, "total": 100.00 }
    ]
  }
}
```

---

### 2.5 Push Notification Device Registration

#### POST /communication/devices

Register a device for push notifications.

**Auth:** any authenticated user

**Body:**
```json
{
  "deviceToken": "string (required — FCM token)",
  "platform": "string (required, enum: web|android|ios)",
  "deviceName": "string (optional)"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "_id": "...", "deviceToken": "fcm_token_abc", "platform": "web" },
  "message": "Device registered for push notifications"
}
```

---

#### DELETE /communication/devices/:token

Unregister a device.

**Auth:** any authenticated user

**Response 200:** `{ "success": true, "message": "Device unregistered" }`

---

### 2.6 Webhooks (Provider Callbacks)

#### POST /communication/webhooks/resend

Resend delivery status webhook.

**Auth:** none (validated via Resend webhook signature)

**Body:** Resend webhook payload (delivery, bounce, open events).

**Side effect:** Updates `DeliveryLog` status for the matching `providerMessageId`.

---

#### POST /communication/webhooks/africas-talking

Africa's Talking delivery report callback.

**Auth:** none (validated via AT callback signature)

**Side effect:** Updates `DeliveryLog` status.

---

## 3. Data Models

### 3.1 CommunicationConfig
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | Unique per school |
| `channels` | ChannelConfigs | yes | Nested object per channel |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**ChannelConfig (subdocument per channel):**
| Field | Type | Required | Notes |
|---|---|---|---|
| `enabled` | boolean | yes | |
| `provider` | string | yes | Provider name |
| `apiKey` | string | no | Encrypted at rest |
| `apiUsername` | string | no | For Africa's Talking |
| `fromName` | string | no | Email sender name |
| `fromEmail` | string | no | Email sender address |
| `replyToEmail` | string | no | |
| `senderId` | string | no | SMS sender ID |
| `phoneNumber` | string | no | WhatsApp number |
| `accountSid` | string | no | Twilio account SID |
| `authToken` | string | no | Encrypted |
| `serviceAccountKey` | string | no | FCM JSON, encrypted |
| `dailyLimit` | number | no | Default varies by channel |
| `usedToday` | number | no | Reset daily by cron |

**Indexes:** `{ schoolId }` (unique)

---

### 3.2 MessageTemplate
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `name` | string | yes | Min 3, max 100 |
| `description` | string | no | Max 500 |
| `channel` | enum | yes | `email`, `sms`, `whatsapp`, `push`, `all` |
| `category` | enum | yes | `attendance`, `fees`, `academic`, `events`, `general`, `emergency` |
| `subject` | string | no | Email subject; supports `{{variables}}` |
| `body` | string | yes | Plain text body; supports `{{variables}}` |
| `htmlBody` | string | no | Rich HTML body for email |
| `variables` | string[] | yes | List of variable names |
| `isDefault` | boolean | no | Default false; system-provided templates |
| `isActive` | boolean | no | Default true |
| `usageCount` | number | no | Default 0; incremented on each send |
| `createdBy` | ObjectId → User | yes | |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, channel, category }`, `{ schoolId, name }` (unique)

---

### 3.3 DeliveryLog
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `batchId` | string | yes | Groups messages from a single send operation |
| `channel` | enum | yes | `email`, `sms`, `whatsapp`, `push` |
| `templateId` | ObjectId → MessageTemplate | no | |
| `recipientUserId` | ObjectId → User | no | |
| `recipientName` | string | no | |
| `recipientEmail` | string | no | |
| `recipientPhone` | string | no | |
| `recipientDeviceToken` | string | no | |
| `subject` | string | no | |
| `bodyPreview` | string | no | First 200 chars of body |
| `status` | enum | yes | `queued`, `sent`, `delivered`, `failed`, `bounced`, `opened` |
| `providerMessageId` | string | no | ID from the delivery provider |
| `providerResponse` | string | no | Raw provider response (for debugging) |
| `errorMessage` | string | no | Error details if failed |
| `cost` | number | no | Estimated cost in ZAR |
| `retryCount` | number | no | Default 0 |
| `maxRetries` | number | no | Default 3 |
| `sentAt` | Date | no | |
| `deliveredAt` | Date | no | |
| `openedAt` | Date | no | Email open tracking |
| `failedAt` | Date | no | |
| `scheduledAt` | Date | no | For scheduled messages |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, createdAt }`, `{ batchId }`, `{ schoolId, channel, status }`, `{ providerMessageId }` (sparse), `{ schoolId, status, scheduledAt }` (for scheduled message pickup)

**TTL:** Consider a TTL index on `createdAt` to auto-delete logs older than 6 months.

---

### 3.4 DeviceRegistration
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `userId` | ObjectId → User | yes | |
| `schoolId` | ObjectId → School | yes | |
| `deviceToken` | string | yes | FCM token |
| `platform` | enum | yes | `web`, `android`, `ios` |
| `deviceName` | string | no | |
| `isActive` | boolean | no | Default true; set false on unregister |
| `lastUsedAt` | Date | no | Updated on each push send |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ userId, deviceToken }` (unique), `{ userId, isActive }`

---

## 4. Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/admin/settings/communication` | Channel Config | Enable/disable channels, set API keys, test connections |
| `/admin/settings/communication/templates` | Template Manager | CRUD templates, preview with sample data |
| `/admin/communication/dashboard` | Delivery Dashboard | Stats, delivery rates, cost tracking, recent messages |
| `/admin/communication/log` | Delivery Log | Full message log with search and filters |

---

## 5. User Flows

### 5.1 Admin Configures Email Channel
1. Admin opens `/admin/settings/communication`.
2. Page shows cards for each channel: Email, SMS, WhatsApp, Push.
3. Admin clicks **Configure** on the Email card.
4. Form opens: Provider (Resend/SendGrid), API Key, From Name, From Email, Reply-To Email, Daily Limit.
5. Admin fills in details and clicks **Save** → `PUT /communication/config`.
6. Admin clicks **Send Test** → `POST /communication/config/test` with `channel=email` and a test recipient.
7. On success: toast "Test email sent successfully". Admin checks their inbox to verify.

### 5.2 Admin Configures SMS Channel
1. Admin selects the SMS card.
2. Form shows: Provider (Africa's Talking), API Key, API Username, Sender ID (max 11 alphanumeric chars), Daily Limit.
3. Admin fills in Africa's Talking credentials and clicks **Save**.
4. Sends test SMS to verify.

### 5.3 Admin Creates a Message Template
1. Admin opens `/admin/settings/communication/templates` and clicks **Create Template**.
2. Form: Name, Description, Channel (email/sms/whatsapp/push/all), Category (attendance/fees/academic/events/general/emergency), Subject (email only), Body (with variable insertion buttons), HTML Body (rich editor for email).
3. Available variables are shown as clickable chips: `{{studentName}}`, `{{parentName}}`, `{{schoolName}}`, `{{date}}`, `{{amount}}`, etc.
4. Admin writes the template, clicking variable chips to insert them.
5. Clicks **Preview** → `POST /communication/templates/:id/preview` with sample data. Preview panel shows rendered output for each applicable channel.
6. Clicks **Save** → `POST /communication/templates`.

### 5.4 Admin Views Delivery Dashboard
1. Admin opens `/admin/communication/dashboard`.
2. Dashboard shows: total messages sent (30 days), delivery rate %, open rate % (email), failed count.
3. Charts: messages by channel (stacked bar), delivery status breakdown (pie), daily volume trend (line), monthly cost (bar).
4. Stat cards show today's usage vs limits per channel.
5. Recent failed messages list with error details and retry button.

### 5.5 Admin Views Delivery Log
1. Admin opens `/admin/communication/log`.
2. `DataTable` shows: Recipient, Channel, Subject/Preview, Status, Sent At, Delivered At, Cost, Retry Count.
3. Filters: channel, status, date range, recipient search, batch ID.
4. Clicking a row opens a detail panel with full message content, provider response, retry history.
5. Admin can manually retry failed messages.

### 5.6 System Sends an Automated Message (Background)
1. A module event occurs (e.g., attendance module marks a student absent).
2. The module calls `CommunicationService.sendToParent(parentId, title, message)`.
3. `CommunicationService` resolves the parent's channel preference.
4. A BullMQ job is enqueued on the `communication` queue with channel, recipient, and content.
5. The channel worker picks up the job:
   - Email: calls Resend API → receives `messageId` → logs to `DeliveryLog`
   - SMS: calls Africa's Talking API → receives delivery receipt callback → updates log
   - WhatsApp: calls existing WhatsApp service → webhook updates status
   - Push: calls FCM → immediate success/failure response → logs
6. If delivery fails, the job is retried with exponential backoff (1min, 5min, 15min).
7. After 3 failures, the log entry is marked `failed` and an admin notification is created.

---

## 6. State Management

### 6.1 Hook: `useCommunicationAdmin`

Located at `src/hooks/useCommunicationAdmin.ts`.

```ts
interface UseCommunicationAdminReturn {
  // Config
  config: CommunicationConfig | null;
  configLoading: boolean;
  fetchConfig: () => Promise<void>;
  updateConfig: (data: UpdateCommunicationConfigPayload) => Promise<void>;
  testChannel: (data: TestChannelPayload) => Promise<TestChannelResult>;

  // Templates
  templates: MessageTemplate[];
  templatesLoading: boolean;
  fetchTemplates: (filters?: TemplateFilters) => Promise<void>;
  createTemplate: (data: CreateTemplatePayload) => Promise<MessageTemplate>;
  updateTemplate: (id: string, data: Partial<CreateTemplatePayload>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  previewTemplate: (id: string, variables: Record<string, string>) => Promise<TemplatePreview>;

  // Delivery
  deliveryLogs: DeliveryLog[];
  deliveryLogsLoading: boolean;
  fetchDeliveryLogs: (filters?: DeliveryLogFilters) => Promise<void>;
  retryMessage: (logId: string) => Promise<void>;

  // Stats
  deliveryStats: DeliveryStats | null;
  statsLoading: boolean;
  fetchDeliveryStats: (filters?: DeliveryStatsFilters) => Promise<void>;
}
```

### 6.2 Types

All types in `src/types/communication.ts`, re-exported from `src/types/index.ts`:

```ts
type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'push';
type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened';
type TemplateChannel = CommunicationChannel | 'all';
type TemplateCategory = 'attendance' | 'fees' | 'academic' | 'events' | 'general' | 'emergency';
type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

interface CommunicationConfig { ... }
interface ChannelConfig { ... }
interface MessageTemplate { ... }
interface DeliveryLog { ... }
interface DeliveryStats { ... }
interface TemplatePreview { ... }
interface DeviceRegistration { ... }
```

---

## 7. Components Needed

### 7.1 Admin Pages

| Component | File | Description |
|---|---|---|
| `CommunicationConfigPage` | `src/app/(dashboard)/admin/settings/communication/page.tsx` | Channel cards with configure/test actions |
| `TemplateManagerPage` | `src/app/(dashboard)/admin/settings/communication/templates/page.tsx` | Template CRUD with preview |
| `DeliveryDashboardPage` | `src/app/(dashboard)/admin/communication/dashboard/page.tsx` | Stats, charts, cost tracking |
| `DeliveryLogPage` | `src/app/(dashboard)/admin/communication/log/page.tsx` | Full message log with search |

### 7.2 Shared Components (in `src/components/communication/`)

| Component | Props / Responsibilities |
|---|---|
| `ChannelConfigCard` | Card per channel showing enabled status, provider, usage vs limit, configure and test buttons. |
| `ChannelConfigDialog` | Dialog form for configuring a specific channel. Dynamic fields based on channel type. API key field with show/hide toggle. |
| `TestChannelDialog` | Dialog for sending a test message. Recipient input, send button, result display. |
| `TemplateList` | `DataTable` of templates. Columns: Name, Channel, Category, Usage Count, Active, Actions. |
| `TemplateFormDialog` | Dialog for creating/editing a template. Name, channel, category, subject, body (with variable insertion), HTML editor (for email). `react-hook-form` + Zod. |
| `VariableChips` | Clickable chip list of available template variables. Clicking inserts `{{variable}}` at cursor position in the body textarea. |
| `TemplatePreviewPanel` | Renders a template preview with sample data. Shows each applicable channel's rendered output. |
| `DeliveryStatsCards` | Row of stat cards: Total Sent, Delivery Rate, Open Rate, Failed, Monthly Cost. |
| `DeliveryCharts` | Recharts wrappers: messages by channel (stacked bar), status breakdown (pie), daily trend (line), monthly cost (bar). |
| `DeliveryLogTable` | `DataTable` of delivery logs. Columns: Recipient, Channel, Subject/Preview, Status, Sent At, Cost, Retry. |
| `DeliveryStatusBadge` | Badge mapping: queued=muted, sent=info, delivered=success, failed=destructive, bounced=destructive, opened=green outline. |
| `ChannelIcon` | Icon component mapping channel to icon: email=Mail, sms=MessageSquare, whatsapp=Smartphone, push=Bell. |
| `CostDisplay` | Formats ZAR currency: "R4.50" or "R0.00" (free). |
| `UsageLimitBar` | Progress bar showing usage vs daily limit per channel. Warning color when >80%. |
| `MessageDetailPanel` | Side panel showing full delivery log details: content, provider response, retry history, status timeline. |

### 7.3 Existing Shared Components to Reuse

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | All page titles |
| `StatCard` | `src/components/shared/StatCard` | Dashboard stat cards |
| `DataTable` | `src/components/shared/DataTable` | Template list, delivery log |
| `EmptyState` | `src/components/shared/EmptyState` | No templates, no logs |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `Dialog` / `DialogContent` | `src/components/ui/dialog` | All forms |
| `Badge` | `src/components/ui/badge` | Status badges |
| `Tabs` / `TabsList` | `src/components/ui/tabs` | Settings tabs |
| `Card` / `CardContent` | `src/components/ui/card` | Channel config cards |
| `Input` / `Label` / `Textarea` | `src/components/ui/` | Form fields |
| `Select` / `SelectItem` | `src/components/ui/select` | Channel and category filters |
| `Switch` | `src/components/ui/switch` | Channel enable/disable toggles |

---

## 8. Integration Notes

### 8.1 Existing Services Refactoring

**`src/services/email.service.ts`** — Replace the stub with:
```ts
// Resend SDK for production, console.log for development
import { Resend } from 'resend';

// Load school config from CommunicationConfig collection
// Send via Resend API
// Log to DeliveryLog
// Return messageId for tracking
```

**`src/services/sms.service.ts`** — Replace the stub with:
```ts
// Africa's Talking SDK
import AfricasTalking from 'africastalking';

// Load school config
// Send via AT SMS API
// Register delivery callback URL
// Log to DeliveryLog
```

**`src/services/communication.service.ts`** — Update `routeMessage`:
- Remove direct `EmailService`/`SmsService` calls
- Instead, enqueue BullMQ jobs on the `communication` queue
- Each job contains: `{ schoolId, channel, recipientUserId, recipientEmail, recipientPhone, subject, body, htmlBody, templateId, batchId, priority }`

### 8.2 BullMQ Workers

New file: `src/workers/communication.worker.ts`

Processes jobs from the `communication` queue:
- `email` → calls `EmailService.send()` (now production-ready)
- `sms` → calls `SmsService.send()` (now production-ready)
- `whatsapp` → calls existing `WhatsAppService.sendMessage()`
- `push` → calls new `PushService.send()` via FCM

Retry configuration:
```ts
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 60000 } // 1min, 5min, 15min
}
```

### 8.3 Push Notification Setup (FCM)

New file: `src/services/push.service.ts`

- Uses `firebase-admin` SDK
- Service account key stored encrypted in `CommunicationConfig`
- Sends via `admin.messaging().send()`
- Supports both data messages and notification messages
- Frontend registers service worker for web push

### 8.4 Cost Tracking

Estimated costs per message (configurable per school):
| Channel | Default Cost (ZAR) |
|---|---|
| Email | R0.00 (Resend free tier: 3000/month, then R0.008/email) |
| SMS | R0.30 per SMS (Africa's Talking SA rate) |
| WhatsApp | R0.15 per message (Twilio WhatsApp rate) |
| Push | R0.00 (FCM is free) |

Costs are stored on each `DeliveryLog` entry and aggregated in reports.

### 8.5 Rate Limiting

A Redis-backed counter per school per channel per day. Key format: `comm:limit:{schoolId}:{channel}:{YYYY-MM-DD}`.
- Before sending, increment counter and check against `dailyLimit`
- If limit exceeded, reject the send with a 429 error
- Counter expires at midnight (TTL 24h)
- Admin can adjust limits via the config endpoint

### 8.6 Webhook Security

- **Resend:** Validate webhook signature using `svix` library (Resend uses Svix for webhooks)
- **Africa's Talking:** Validate callback source IP against AT IP whitelist
- **Twilio (WhatsApp):** Already implemented in existing WhatsApp module via `X-Twilio-Signature` validation

### 8.7 WhatsApp Integration

The existing `/api/whatsapp` module already handles:
- Config management
- Sending messages and broadcasts
- Delivery reports and stats
- Opt-in/opt-out

This scope enhances it with:
- Template support (WhatsApp Business API requires pre-approved templates)
- Integration with the unified `CommunicationService` routing
- Delivery logs written to the shared `DeliveryLog` collection

### 8.8 Existing Communication Module

The existing `/api/communication` module handles parent-teacher messaging (threads, messages). This scope's admin endpoints are added to the same route prefix but are distinct — the existing messaging routes are untouched.

### 8.9 Nav Entries

Admin settings: `{ label: 'Communication', href: '/admin/settings/communication', icon: Mail }` in `src/lib/constants.ts`
Admin dashboard: `{ label: 'Messages', href: '/admin/communication/dashboard', icon: Send }` in `src/lib/constants.ts`

### 8.10 Environment Variables

New env vars needed in `.env`:
```
RESEND_API_KEY=re_xxxxx
SENDGRID_API_KEY=SG.xxxxx
AFRICASTALKING_API_KEY=xxxxx
AFRICASTALKING_USERNAME=xxxxx
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
RESEND_WEBHOOK_SECRET=whsec_xxxxx
```

These are platform-level defaults. Per-school overrides are stored in `CommunicationConfig`.

---

## 9. Acceptance Criteria

### Email Channel
- [ ] Email delivery works via Resend in production (not console.log)
- [ ] SendGrid is available as a fallback provider
- [ ] From name, from email, and reply-to are configurable per school
- [ ] Test email can be sent from the admin config page
- [ ] Delivery status is tracked (sent, delivered, bounced, opened)
- [ ] Open tracking works via Resend webhook

### SMS Channel
- [ ] SMS delivery works via Africa's Talking
- [ ] Sender ID is configurable (max 11 alphanumeric characters)
- [ ] Test SMS can be sent from the admin config page
- [ ] Delivery receipts update the delivery log

### WhatsApp Channel
- [ ] Existing WhatsApp integration continues to work
- [ ] WhatsApp messages are logged to the shared DeliveryLog
- [ ] Templates can be used for WhatsApp messages

### Push Notifications
- [ ] FCM push notifications work on web
- [ ] Device registration and unregistration works
- [ ] Push notifications are sent for all communication events

### Template Management
- [ ] Admin can create, edit, and delete message templates
- [ ] Templates support variable placeholders ({{variableName}})
- [ ] Templates can be previewed with sample data
- [ ] Templates can target a specific channel or all channels
- [ ] Templates are categorized (attendance, fees, academic, events, general, emergency)

### Delivery Tracking
- [ ] Every outbound message is logged in DeliveryLog
- [ ] Delivery log shows status: queued, sent, delivered, failed, bounced, opened
- [ ] Admin can search and filter the delivery log
- [ ] Admin can view delivery statistics with charts

### Retry Logic
- [ ] Failed messages are retried up to 3 times with exponential backoff
- [ ] Retry count is tracked on the delivery log
- [ ] After max retries, the message is marked as permanently failed

### Cost Tracking
- [ ] Each message logs estimated cost in ZAR
- [ ] Monthly cost report is available per channel
- [ ] Cost per message is configurable per school

### Rate Limiting
- [ ] Per-school daily limits are enforced per channel
- [ ] Usage vs limit is visible on the admin config page
- [ ] Rate limit exceeded returns a 429 error
- [ ] Limits reset daily at midnight

### API Keys & Security
- [ ] API keys are stored encrypted at rest
- [ ] API keys are never returned in plain text from GET endpoints
- [ ] Webhook endpoints validate provider signatures
- [ ] Test messages work without affecting rate limits

### General
- [ ] Existing `CommunicationService.sendToParent()` works with real providers (not console.log)
- [ ] All existing modules that send notifications continue to work unchanged
- [ ] All forms use `react-hook-form` with Zod validation
- [ ] All API errors surface as toast notifications using `sonner`
- [ ] Loading and empty states exist for every data view
- [ ] All pages are mobile-responsive with proper breakpoints
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
