# 16 — Event Module

## 1. Module Overview

The Event module handles the full lifecycle of school events — creation, RSVP collection, ticketing, seat allocation, attendee check-in, and post-event photo galleries. It covers six sub-domains: Events (core CRUD), RSVPs, Tickets, Seats, Check-Ins, and Gallery.

**Roles involved:**
- `super_admin` / `school_admin` — create, update, delete events; manage seats; delete gallery images
- All authenticated users — list and view events, submit RSVPs, purchase tickets, reserve seats, perform check-ins, upload gallery images

**Key capabilities:**
- Flexible event types: `sports_day`, `concert`, `parents_evening`, `fundraiser`, `excursion`, `other`
- Optional RSVP with deadline and headcount
- Optional ticketing with per-event pricing, QR-code-based entry, and cancel flow
- Seat map creation (row + seat number) with reserve/release operations
- QR-code-driven check-in that marks tickets as `used`
- Post-event gallery with image URL + caption, per-school scoped
- Soft-delete pattern throughout (`isDeleted: true`)

**Base URL prefix:** `/api/events` (all routes below are relative to this prefix)

---

## 2. Backend API Endpoints

### 2.1 Event CRUD

#### POST `/`
Create a new event.

**Auth:** Required. Roles: `super_admin`, `school_admin`

**Request body:**
```json
{
  "title": "string (required, min 1)",
  "description": "string (optional)",
  "schoolId": "ObjectId string (required, 24-char hex)",
  "eventType": "sports_day | concert | parents_evening | fundraiser | excursion | other (required)",
  "date": "ISO 8601 datetime string (required)",
  "startTime": "string (required, e.g. '08:00')",
  "endTime": "string (required, e.g. '15:00')",
  "venue": "string (optional)",
  "capacity": "integer > 0 (optional)",
  "rsvpRequired": "boolean (optional, default false)",
  "rsvpDeadline": "ISO 8601 datetime string (optional)",
  "ticketPrice": "number >= 0 (optional)",
  "isTicketed": "boolean (optional, default false)",
  "galleryEnabled": "boolean (optional, default false)"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "title": "Inter-house Athletics Day",
    "description": "Annual athletics competition",
    "schoolId": "64a1b2c3d4e5f6a7b8c9d0e0",
    "organizerId": {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e2",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "email": "sarah@school.co.za"
    },
    "eventType": "sports_day",
    "date": "2026-04-10T08:00:00.000Z",
    "startTime": "08:00",
    "endTime": "15:00",
    "venue": "School Sports Ground",
    "capacity": 500,
    "rsvpRequired": true,
    "rsvpDeadline": "2026-04-07T17:00:00.000Z",
    "ticketPrice": null,
    "isTicketed": false,
    "galleryEnabled": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:00:00.000Z"
  },
  "message": "Event created successfully"
}
```

---

#### GET `/`
List events with optional filtering and pagination.

**Auth:** Required. All roles.

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `schoolId` | string | Filter by school (falls back to `req.user.schoolId` if omitted) |
| `eventType` | string | Filter by event type enum value |
| `page` | number | Page number (default 1) |
| `limit` | number | Items per page (default per `paginationHelper`) |
| `sort` | string | Sort field (default `-date`, i.e. newest first) |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
        "title": "Inter-house Athletics Day",
        "eventType": "sports_day",
        "date": "2026-04-10T08:00:00.000Z",
        "startTime": "08:00",
        "endTime": "15:00",
        "venue": "School Sports Ground",
        "isTicketed": false,
        "rsvpRequired": true,
        "organizerId": {
          "_id": "64a1b2c3d4e5f6a7b8c9d0e2",
          "firstName": "Sarah",
          "lastName": "Johnson",
          "email": "sarah@school.co.za"
        }
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Events retrieved successfully"
}
```

---

#### GET `/:id`
Get a single event by ID.

**Auth:** Required. All roles.

**Response `200`:** Same shape as the `data` object in the create response (single event object, `organizerId` populated).

**Errors:**
- `404` — Event not found or soft-deleted

---

#### PUT `/:id`
Update an event. All fields optional.

**Auth:** Required. Roles: `super_admin`, `school_admin`

**Request body:** Any subset of `updateEventSchema` fields — same fields as create except `schoolId` and `organizerId` are not updatable:
```json
{
  "title": "string (optional, min 1)",
  "description": "string (optional)",
  "eventType": "enum (optional)",
  "date": "ISO 8601 datetime (optional)",
  "startTime": "string (optional)",
  "endTime": "string (optional)",
  "venue": "string (optional)",
  "capacity": "integer > 0 (optional)",
  "rsvpRequired": "boolean (optional)",
  "rsvpDeadline": "ISO 8601 datetime (optional)",
  "ticketPrice": "number >= 0 (optional)",
  "isTicketed": "boolean (optional)",
  "galleryEnabled": "boolean (optional)"
}
```

**Response `200`:** Updated event object, same shape as create response `data`.

**Errors:**
- `404` — Event not found

---

#### DELETE `/:id`
Soft-delete an event (`isDeleted: true`).

**Auth:** Required. Roles: `super_admin`, `school_admin`

**Response `200`:**
```json
{
  "success": true,
  "data": null,
  "message": "Event deleted successfully"
}
```

**Errors:**
- `404` — Event not found

---

### 2.2 RSVP Routes

#### POST `/rsvp`
Create or upsert an RSVP for the authenticated user.

**Auth:** Required. All roles.

**Request body:**
```json
{
  "eventId": "ObjectId string (required)",
  "status": "attending | not_attending | maybe (required)",
  "notes": "string (optional)",
  "headcount": "integer > 0 (optional, default 1)"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0f1",
    "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "userId": {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e3",
      "firstName": "Thabo",
      "lastName": "Dlamini",
      "email": "thabo@parent.co.za"
    },
    "status": "attending",
    "notes": "Bringing 2 children",
    "headcount": 3,
    "isDeleted": false,
    "createdAt": "2026-03-31T10:05:00.000Z",
    "updatedAt": "2026-03-31T10:05:00.000Z"
  },
  "message": "RSVP submitted successfully"
}
```

**Notes:** Uses `findOneAndUpdate` with `upsert: true` — calling this endpoint again for the same `(eventId, userId)` pair updates the existing RSVP rather than creating a duplicate.

**Errors:**
- `404` — Event not found

---

#### PUT `/:eventId/rsvp`
Update the authenticated user's RSVP for a specific event.

**Auth:** Required. All roles.

**Request body:**
```json
{
  "status": "attending | not_attending | maybe (required)",
  "notes": "string (optional)",
  "headcount": "integer > 0 (optional)"
}
```

**Response `200`:** Updated RSVP object (same shape as create response `data`).

**Errors:**
- `404` — RSVP not found

---

#### GET `/:eventId/rsvps`
List all RSVPs for a specific event (paginated).

**Auth:** Required. All roles.

**Query parameters:** `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "rsvps": [
      {
        "_id": "64a1b2c3d4e5f6a7b8c9d0f1",
        "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
        "userId": { "_id": "...", "firstName": "Thabo", "lastName": "Dlamini", "email": "thabo@parent.co.za" },
        "status": "attending",
        "headcount": 3,
        "notes": "Bringing 2 children",
        "createdAt": "2026-03-31T10:05:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "message": "RSVPs retrieved successfully"
}
```

---

#### DELETE `/:eventId/rsvp`
Soft-delete the authenticated user's RSVP for a specific event.

**Auth:** Required. All roles.

**Response `200`:**
```json
{
  "success": true,
  "data": null,
  "message": "RSVP deleted successfully"
}
```

**Errors:**
- `404` — RSVP not found

---

### 2.3 Ticket Routes

#### POST `/:eventId/tickets`
Purchase a ticket for an event.

**Auth:** Required. All roles.

**Request body:**
```json
{
  "schoolId": "ObjectId string (required)",
  "ticketType": "string (optional, default 'standard')",
  "price": "number >= 0 (optional — falls back to event.ticketPrice, then 0)"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0a1",
    "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "schoolId": "64a1b2c3d4e5f6a7b8c9d0e0",
    "userId": "64a1b2c3d4e5f6a7b8c9d0e3",
    "ticketType": "standard",
    "price": 5000,
    "qrCode": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "active",
    "purchasedAt": "2026-03-31T10:10:00.000Z",
    "isDeleted": false,
    "createdAt": "2026-03-31T10:10:00.000Z",
    "updatedAt": "2026-03-31T10:10:00.000Z"
  },
  "message": "Ticket purchased successfully"
}
```

**Notes:** `qrCode` is a UUID v4 generated server-side and is guaranteed unique.

**Errors:**
- `404` — Event not found

---

#### GET `/:eventId/tickets`
List all tickets for an event (paginated).

**Auth:** Required. All roles.

**Query parameters:** `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "_id": "64a1b2c3d4e5f6a7b8c9d0a1",
        "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
        "userId": { "_id": "...", "firstName": "Thabo", "lastName": "Dlamini", "email": "thabo@parent.co.za" },
        "ticketType": "standard",
        "price": 5000,
        "qrCode": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "status": "active",
        "purchasedAt": "2026-03-31T10:10:00.000Z"
      }
    ],
    "total": 87,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "message": "Tickets retrieved successfully"
}
```

---

#### GET `/tickets/qr/:qrCode`
Look up a ticket by its QR code string (for scanner apps).

**Auth:** Required. All roles.

**Note:** This route is defined **before** `/:id` in the router to prevent `"tickets"` matching as a document ID.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0a1",
    "eventId": {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
      "title": "Science Fair",
      "date": "2026-04-15T09:00:00.000Z",
      "venue": "School Hall"
    },
    "userId": { "_id": "...", "firstName": "Thabo", "lastName": "Dlamini", "email": "thabo@parent.co.za" },
    "ticketType": "standard",
    "price": 5000,
    "qrCode": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "active",
    "purchasedAt": "2026-03-31T10:10:00.000Z"
  },
  "message": "Ticket retrieved successfully"
}
```

**Errors:**
- `404` — Ticket not found

---

#### PATCH `/:eventId/tickets/:ticketId/cancel`
Cancel a specific ticket.

**Auth:** Required. All roles.

**Request body:** None required.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0a1",
    "status": "cancelled",
    ...
  },
  "message": "Ticket cancelled successfully"
}
```

**Errors:**
- `404` — Ticket not found, already cancelled, or already used

---

### 2.4 Seat Routes

#### POST `/:eventId/seats`
Bulk-create seats for a seating-plan event.

**Auth:** Required. Roles: `super_admin`, `school_admin`

**Request body:**
```json
{
  "seats": [
    { "row": "A", "seatNumber": 1, "label": "A1" },
    { "row": "A", "seatNumber": 2, "label": "A2" },
    { "row": "B", "seatNumber": 1 }
  ]
}
```

**Validation:** `seats` array must have at least 1 item. Each seat requires `row` (string, min 1) and `seatNumber` (positive integer). `label` is optional.

**Response `201`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0b1",
      "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
      "row": "A",
      "seatNumber": 1,
      "label": "A1",
      "status": "available",
      "ticketId": null,
      "isDeleted": false
    }
  ],
  "message": "Seats created successfully"
}
```

**Errors:**
- `404` — Event not found

---

#### GET `/:eventId/seats`
List all seats for an event, sorted by row then seat number.

**Auth:** Required. All roles.

**Query parameters:** `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "seats": [
      {
        "_id": "64a1b2c3d4e5f6a7b8c9d0b1",
        "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
        "row": "A",
        "seatNumber": 1,
        "label": "A1",
        "status": "available",
        "ticketId": null
      }
    ],
    "total": 200,
    "page": 1,
    "limit": 20,
    "totalPages": 10
  },
  "message": "Seats retrieved successfully"
}
```

---

#### PATCH `/:eventId/seats/:seatId/reserve`
Reserve an available seat by linking it to a ticket.

**Auth:** Required. All roles.

**Request body:**
```json
{
  "ticketId": "ObjectId string (required)"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0b1",
    "status": "reserved",
    "ticketId": "64a1b2c3d4e5f6a7b8c9d0a1",
    "row": "A",
    "seatNumber": 1
  },
  "message": "Seat reserved successfully"
}
```

**Errors:**
- `404` — Seat not found or not in `available` status

---

#### PATCH `/:eventId/seats/:seatId/release`
Release a reserved or sold seat back to `available`.

**Auth:** Required. All roles.

**Request body:** None required.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0b1",
    "status": "available",
    "ticketId": null
  },
  "message": "Seat released successfully"
}
```

**Errors:**
- `404` — Seat not found or already `available`

---

### 2.5 Check-In Routes

#### POST `/:eventId/check-in`
Check in an attendee by scanning their ticket QR code. Marks the ticket as `used` and records the check-in.

**Auth:** Required. All roles.

**Request body:**
```json
{
  "qrCode": "string (required, min 1)"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0c1",
    "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "ticketId": "64a1b2c3d4e5f6a7b8c9d0a1",
    "checkedInAt": "2026-04-10T08:35:00.000Z",
    "checkedInBy": "64a1b2c3d4e5f6a7b8c9d0e2",
    "isDeleted": false,
    "createdAt": "2026-04-10T08:35:00.000Z"
  },
  "message": "Check-in successful"
}
```

**Errors:**
- `404` — Ticket not found for this event
- `400` — Ticket has already been used (`status === 'used'`)
- `400` — Ticket has been cancelled (`status === 'cancelled'`)

---

#### GET `/:eventId/check-ins`
List all check-in records for an event (paginated), sorted newest first.

**Auth:** Required. All roles.

**Query parameters:** `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "checkIns": [
      {
        "_id": "64a1b2c3d4e5f6a7b8c9d0c1",
        "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
        "ticketId": { "_id": "...", "qrCode": "...", "ticketType": "standard", "price": 5000 },
        "checkedInAt": "2026-04-10T08:35:00.000Z",
        "checkedInBy": { "_id": "...", "firstName": "Sarah", "lastName": "Johnson", "email": "sarah@school.co.za" }
      }
    ],
    "total": 63,
    "page": 1,
    "limit": 20,
    "totalPages": 4
  },
  "message": "Check-ins retrieved successfully"
}
```

---

#### GET `/:eventId/check-in/stats`
Get attendance statistics for an event.

**Auth:** Required. All roles.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totalTickets": 100,
    "checkedIn": 63,
    "activeTickets": 35,
    "cancelledTickets": 2
  },
  "message": "Check-in stats retrieved successfully"
}
```

---

### 2.6 Gallery Routes

#### POST `/:eventId/gallery`
Upload a gallery image record for an event.

**Auth:** Required. All roles.

**Request body:**
```json
{
  "schoolId": "ObjectId string (required)",
  "imageUrl": "string (required, must be a valid URL)",
  "caption": "string (optional)"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0d1",
    "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "schoolId": "64a1b2c3d4e5f6a7b8c9d0e0",
    "imageUrl": "https://cdn.campusly.co.za/events/athletics-2026-01.jpg",
    "caption": "Grade 8 relay race",
    "uploadedBy": "64a1b2c3d4e5f6a7b8c9d0e2",
    "isDeleted": false,
    "createdAt": "2026-04-10T16:00:00.000Z",
    "updatedAt": "2026-04-10T16:00:00.000Z"
  },
  "message": "Gallery image uploaded successfully"
}
```

**Errors:**
- `404` — Event not found

---

#### GET `/:eventId/gallery`
List all gallery images for an event (paginated), sorted newest first.

**Auth:** Required. All roles.

**Query parameters:** `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "_id": "64a1b2c3d4e5f6a7b8c9d0d1",
        "eventId": "64a1b2c3d4e5f6a7b8c9d0e1",
        "imageUrl": "https://cdn.campusly.co.za/events/athletics-2026-01.jpg",
        "caption": "Grade 8 relay race",
        "uploadedBy": { "_id": "...", "firstName": "Sarah", "lastName": "Johnson", "email": "sarah@school.co.za" },
        "createdAt": "2026-04-10T16:00:00.000Z"
      }
    ],
    "total": 34,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  },
  "message": "Gallery images retrieved successfully"
}
```

---

#### DELETE `/:eventId/gallery/:imageId`
Soft-delete a gallery image.

**Auth:** Required. Roles: `super_admin`, `school_admin`

**Response `200`:**
```json
{
  "success": true,
  "data": null,
  "message": "Gallery image deleted successfully"
}
```

**Errors:**
- `404` — Gallery image not found

---

## 3. Frontend Pages

### 3.1 Admin — `/admin/events` (existing, needs wiring)

**File:** `src/app/(dashboard)/admin/events/page.tsx`

**Current state:** Renders a card grid from `mockEvents`. Has a "Create Event" button (no dialog yet). Event type badge styles use frontend-only category names (`academic`, `sports`, `cultural`, `social`, `meeting`) that do not map to backend enum values. Needs:
- Replace `mockEvents` with live API data from `GET /api/events`
- Map backend `eventType` values (`sports_day`, `concert`, `parents_evening`, `fundraiser`, `excursion`, `other`) to display labels and badge colours
- Wire "Create Event" button to a `CreateEventDialog` or dedicated page
- Add edit and delete actions per card (admin only)
- Detail view with RSVP list, ticket list, check-in stats, seat map, and gallery tabs
- Filters: event type, date range

**Pages to build:**
| Route | Description |
|-------|-------------|
| `/admin/events` | Event list (card grid) |
| `/admin/events/[id]` | Event detail — tabs: Overview, RSVPs, Tickets, Seats, Check-In, Gallery |

### 3.2 Parent — `/parent/events` (existing, needs wiring)

**File:** `src/app/(dashboard)/parent/events/page.tsx`

**Current state:** Renders sorted event cards from `mockEvents`. Has a ticket purchase dialog (confirm button currently just closes modal — not wired to API). Has `requiresConsent` badge (linked to Consent module, not yet active). Needs:
- Replace `mockEvents` with live `GET /api/events` data
- Wire RSVP button per event (POST `/api/events/rsvp`) — show current status if already RSVPed
- Wire "Buy Ticket" dialog to POST `/api/events/:eventId/tickets`
- Show user's existing tickets with QR code display
- Post-event gallery viewer

### 3.3 Student — no dedicated events page exists yet

Student events page needs to be built at `/student/events` (read-only: view events, view own tickets, view gallery; no ticketing purchase flow unless school enables it).

---

## 4. User Flows

### 4.1 Admin creates an event

1. Admin navigates to `/admin/events` and clicks "Create Event".
2. A form dialog collects: title, description, eventType, date, startTime, endTime, venue, capacity, rsvpRequired, rsvpDeadline, isTicketed, ticketPrice, galleryEnabled.
3. On submit, `POST /api/events` is called with `schoolId` from the session.
4. On success the new event card appears in the grid; a toast confirms creation.
5. If `isTicketed` is true, admin can navigate to the event detail and optionally create a seat map via `POST /api/events/:id/seats`.

### 4.2 Admin publishes / edits an event

1. Admin clicks the edit icon on an event card.
2. The same form dialog pre-fills with existing values.
3. On submit, `PUT /api/events/:id` is called with changed fields.
4. Toast confirms update; card refreshes.

### 4.3 Admin deletes an event

1. Admin clicks delete on event card; a confirmation dialog appears.
2. On confirm, `DELETE /api/events/:id` is called.
3. Event disappears from the list (soft-deleted on backend).

### 4.4 Parent / staff RSVPs to an event

1. Parent views an event card on `/parent/events`.
2. If `rsvpRequired` is true, an "RSVP" button is shown.
3. Parent selects status (`attending` / `not_attending` / `maybe`) and optionally enters headcount and notes.
4. `POST /api/events/rsvp` is called.
5. Button updates to show current status with a change option.
6. Parent can call `PUT /api/events/:eventId/rsvp` to change status, or `DELETE /api/events/:eventId/rsvp` to withdraw.

### 4.5 Parent buys a ticket

1. Parent clicks "Buy Ticket" on an event card (visible when `isTicketed: true` and `ticketPrice` is set).
2. A dialog shows event summary and ticket price.
3. On "Confirm Purchase", `POST /api/events/:eventId/tickets` is called with `schoolId` from session.
4. On success, the dialog shows the generated `qrCode` as a QR image.
5. Parent can also view their ticket QR later from a "My Tickets" section.

### 4.6 Admin views attendees

1. Admin navigates to `/admin/events/:id` and selects the "RSVPs" tab.
2. `GET /api/events/:eventId/rsvps` is called and results are displayed in a table (name, status, headcount, notes, submitted at).
3. Pagination controls navigate through large RSVP lists.

### 4.7 Admin / staff performs check-in

1. On the event detail page, navigate to the "Check-In" tab.
2. A QR scanner component (or manual code entry field) captures a `qrCode` string.
3. `POST /api/events/:eventId/check-in` is called with `{ qrCode }`.
4. Success: attendee name and timestamp displayed, ticket status becomes `used`.
5. Error states: already used ("Ticket has already been used"), cancelled ("Ticket has been cancelled"), not found.
6. Stats panel (`GET /api/events/:eventId/check-in/stats`) shows running totals: total tickets, checked in, active, cancelled.

### 4.8 Upload gallery images

1. After an event, admin or staff navigates to the event detail "Gallery" tab.
2. They select an image (client uploads to CDN/storage, receives back a URL).
3. `POST /api/events/:eventId/gallery` is called with `{ schoolId, imageUrl, caption }`.
4. Image appears in the gallery grid.
5. Admin can soft-delete an image via `DELETE /api/events/:eventId/gallery/:imageId`.
6. All authenticated users can view the gallery via `GET /api/events/:eventId/gallery`.

---

## 5. Data Models

### 5.1 Event

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | |
| `title` | string | yes | — | trimmed |
| `description` | string | no | — | |
| `schoolId` | ObjectId (ref: School) | yes | — | |
| `organizerId` | ObjectId (ref: User) | yes | — | set from `req.user.id` on create |
| `eventType` | enum | yes | — | `sports_day \| concert \| parents_evening \| fundraiser \| excursion \| other` |
| `date` | Date | yes | — | ISO 8601 |
| `startTime` | string | yes | — | e.g. `"08:00"` |
| `endTime` | string | yes | — | e.g. `"15:00"` |
| `venue` | string | no | — | |
| `capacity` | number | no | — | positive integer |
| `rsvpRequired` | boolean | no | `false` | |
| `rsvpDeadline` | Date | no | — | |
| `ticketPrice` | number | no | — | in cents/smallest currency unit |
| `isTicketed` | boolean | no | `false` | |
| `galleryEnabled` | boolean | no | `false` | |
| `isDeleted` | boolean | no | `false` | soft delete |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ schoolId, date: -1 }`, `{ schoolId, eventType }`

---

### 5.2 EventRsvp

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | |
| `eventId` | ObjectId (ref: Event) | yes | — | |
| `userId` | ObjectId (ref: User) | yes | — | from `req.user.id` |
| `status` | enum | yes | — | `attending \| not_attending \| maybe` |
| `notes` | string | no | — | |
| `headcount` | number | no | `1` | positive integer |
| `isDeleted` | boolean | no | `false` | |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ eventId, userId }` (unique), `{ eventId, status }`

---

### 5.3 EventTicket

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | |
| `eventId` | ObjectId (ref: Event) | yes | — | |
| `schoolId` | ObjectId (ref: School) | yes | — | |
| `userId` | ObjectId (ref: User) | yes | — | purchaser |
| `ticketType` | string | yes | `"standard"` | e.g. `"vip"`, `"standard"` |
| `price` | number | yes | `0` | resolved: `data.price ?? event.ticketPrice ?? 0` |
| `qrCode` | string | yes | UUID v4 | unique across all tickets |
| `status` | enum | no | `"active"` | `active \| used \| cancelled` |
| `purchasedAt` | Date | no | `Date.now` | |
| `isDeleted` | boolean | no | `false` | |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ eventId, status }`, `{ qrCode }` (unique)

---

### 5.4 EventSeat

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | |
| `eventId` | ObjectId (ref: Event) | yes | — | |
| `row` | string | yes | — | e.g. `"A"`, `"B"` |
| `seatNumber` | number | yes | — | positive integer |
| `status` | enum | no | `"available"` | `available \| reserved \| sold` |
| `ticketId` | ObjectId (ref: EventTicket) | no | — | set on reserve |
| `label` | string | no | — | display label e.g. `"A1"` |
| `isDeleted` | boolean | no | `false` | |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ eventId, row, seatNumber }` (unique)

---

### 5.5 EventCheckIn

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | |
| `eventId` | ObjectId (ref: Event) | yes | — | |
| `ticketId` | ObjectId (ref: EventTicket) | yes | — | |
| `checkedInAt` | Date | no | `Date.now` | |
| `checkedInBy` | ObjectId (ref: User) | yes | — | `req.user.id` of scanner |
| `isDeleted` | boolean | no | `false` | |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ eventId, ticketId }` (unique — prevents double check-in at DB level)

---

### 5.6 EventGallery

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | auto | — | |
| `eventId` | ObjectId (ref: Event) | yes | — | |
| `schoolId` | ObjectId (ref: School) | yes | — | |
| `imageUrl` | string | yes | — | must be valid URL |
| `caption` | string | no | — | |
| `uploadedBy` | ObjectId (ref: User) | yes | — | `req.user.id` |
| `isDeleted` | boolean | no | `false` | |
| `createdAt` | Date | auto | — | |
| `updatedAt` | Date | auto | — | |

**Indexes:** `{ eventId }`

---

### 5.7 Frontend TypeScript Types (current — needs update)

The existing `SchoolEvent` interface in `src/types/index.ts` uses different field names and enum values from the backend. It must be replaced or aliased with a backend-aligned type during wiring:

```typescript
// Current (mock-aligned, to be replaced)
export interface SchoolEvent {
  id: string;
  type: 'academic' | 'sports' | 'cultural' | 'social' | 'meeting'; // does not match backend
  startDate: string;   // backend uses date + startTime separately
  endDate: string;     // backend uses endTime string
  isAllDay: boolean;   // no equivalent in backend
  requiresConsent: boolean; // separate Consent module
  ...
}

// Target (backend-aligned)
export interface Event {
  _id: string;
  title: string;
  description?: string;
  schoolId: string;
  organizerId: UserRef;
  eventType: 'sports_day' | 'concert' | 'parents_evening' | 'fundraiser' | 'excursion' | 'other';
  date: string;
  startTime: string;
  endTime: string;
  venue?: string;
  capacity?: number;
  rsvpRequired: boolean;
  rsvpDeadline?: string;
  ticketPrice?: number;
  isTicketed: boolean;
  galleryEnabled: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 6. State Management

### 6.1 Event Store (`useEventStore`)

Recommended Zustand store shape:

```typescript
interface EventState {
  // Events list
  events: Event[];
  totalEvents: number;
  eventsPage: number;
  eventsTotalPages: number;
  eventsLoading: boolean;
  eventsError: string | null;
  eventsFilter: {
    eventType?: EventType;
    schoolId?: string;
    sort?: string;
  };

  // Selected event detail
  selectedEvent: Event | null;
  selectedEventLoading: boolean;

  // RSVPs (for selected event)
  rsvps: EventRsvp[];
  rsvpsTotal: number;
  rsvpsPage: number;
  rsvpsLoading: boolean;
  myRsvp: EventRsvp | null; // current user's RSVP for selectedEvent

  // Tickets (for selected event)
  tickets: EventTicket[];
  ticketsTotal: number;
  ticketsPage: number;
  ticketsLoading: boolean;
  myTickets: EventTicket[]; // current user's tickets

  // Seats (for selected event)
  seats: EventSeat[];
  seatsTotal: number;
  seatsLoading: boolean;

  // Check-in (for selected event)
  checkIns: EventCheckIn[];
  checkInsTotal: number;
  checkInsLoading: boolean;
  checkInStats: CheckInStats | null;

  // Gallery (for selected event)
  gallery: EventGallery[];
  galleryTotal: number;
  galleryLoading: boolean;

  // Actions
  fetchEvents: (query?: ListEventQuery) => Promise<void>;
  fetchEventById: (id: string) => Promise<void>;
  createEvent: (data: CreateEventInput) => Promise<Event>;
  updateEvent: (id: string, data: UpdateEventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  fetchRsvps: (eventId: string, page?: number) => Promise<void>;
  submitRsvp: (data: CreateRsvpInput) => Promise<void>;
  updateRsvp: (eventId: string, data: UpdateRsvpInput) => Promise<void>;
  deleteRsvp: (eventId: string) => Promise<void>;

  purchaseTicket: (eventId: string, data: PurchaseTicketInput) => Promise<EventTicket>;
  fetchTickets: (eventId: string, page?: number) => Promise<void>;
  cancelTicket: (eventId: string, ticketId: string) => Promise<void>;
  getTicketByQrCode: (qrCode: string) => Promise<EventTicket>;

  createSeats: (eventId: string, data: CreateSeatsInput) => Promise<void>;
  fetchSeats: (eventId: string, page?: number) => Promise<void>;
  reserveSeat: (eventId: string, seatId: string, ticketId: string) => Promise<void>;
  releaseSeat: (eventId: string, seatId: string) => Promise<void>;

  checkIn: (eventId: string, qrCode: string) => Promise<EventCheckIn>;
  fetchCheckIns: (eventId: string, page?: number) => Promise<void>;
  fetchCheckInStats: (eventId: string) => Promise<void>;

  fetchGallery: (eventId: string, page?: number) => Promise<void>;
  uploadGalleryImage: (eventId: string, data: UploadGalleryInput) => Promise<void>;
  deleteGalleryImage: (eventId: string, imageId: string) => Promise<void>;
}
```

### 6.2 API client helpers

All event API calls live in `src/lib/api/events.ts`, following the same pattern as other modules (axios instance with auth interceptor). Example:

```typescript
export const eventsApi = {
  list: (params?: ListEventQuery) => api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: CreateEventInput) => api.post('/events', data),
  update: (id: string, data: UpdateEventInput) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  // RSVP
  submitRsvp: (data: CreateRsvpInput) => api.post('/events/rsvp', data),
  updateRsvp: (eventId: string, data: UpdateRsvpInput) => api.put(`/events/${eventId}/rsvp`, data),
  getRsvps: (eventId: string, params?: PaginatedQuery) => api.get(`/events/${eventId}/rsvps`, { params }),
  deleteRsvp: (eventId: string) => api.delete(`/events/${eventId}/rsvp`),
  // Tickets
  purchaseTicket: (eventId: string, data: PurchaseTicketInput) => api.post(`/events/${eventId}/tickets`, data),
  listTickets: (eventId: string, params?: PaginatedQuery) => api.get(`/events/${eventId}/tickets`, { params }),
  getTicketByQrCode: (qrCode: string) => api.get(`/events/tickets/qr/${qrCode}`),
  cancelTicket: (eventId: string, ticketId: string) => api.patch(`/events/${eventId}/tickets/${ticketId}/cancel`),
  // Seats
  createSeats: (eventId: string, data: CreateSeatsInput) => api.post(`/events/${eventId}/seats`, data),
  listSeats: (eventId: string, params?: PaginatedQuery) => api.get(`/events/${eventId}/seats`, { params }),
  reserveSeat: (eventId: string, seatId: string, ticketId: string) => api.patch(`/events/${eventId}/seats/${seatId}/reserve`, { ticketId }),
  releaseSeat: (eventId: string, seatId: string) => api.patch(`/events/${eventId}/seats/${seatId}/release`),
  // Check-in
  checkIn: (eventId: string, qrCode: string) => api.post(`/events/${eventId}/check-in`, { qrCode }),
  listCheckIns: (eventId: string, params?: PaginatedQuery) => api.get(`/events/${eventId}/check-ins`, { params }),
  checkInStats: (eventId: string) => api.get(`/events/${eventId}/check-in/stats`),
  // Gallery
  uploadGalleryImage: (eventId: string, data: UploadGalleryInput) => api.post(`/events/${eventId}/gallery`, data),
  listGallery: (eventId: string, params?: PaginatedQuery) => api.get(`/events/${eventId}/gallery`, { params }),
  deleteGalleryImage: (eventId: string, imageId: string) => api.delete(`/events/${eventId}/gallery/${imageId}`),
};
```

---

## 7. Components Needed

### 7.1 Page-level components

| Component | Route | Description |
|-----------|-------|-------------|
| `EventsPage` (admin) | `/admin/events` | Grid of event cards, filter bar, "Create Event" CTA |
| `EventDetailPage` (admin) | `/admin/events/[id]` | Tabbed detail — Overview / RSVPs / Tickets / Seats / Check-In / Gallery |
| `EventsPage` (parent) | `/parent/events` | Sorted card list with RSVP + ticket purchase actions |
| `EventsPage` (student) | `/student/events` | Read-only event list; own ticket QR viewer |

### 7.2 Shared display components

| Component | Props | Description |
|-----------|-------|-------------|
| `EventCard` | `event: Event, role: Role, onRsvp?, onBuyTicket?` | Card with date header, type badge, venue, time, capacity, ticket price, RSVP status chip |
| `EventTypeBadge` | `eventType: EventType` | Badge with colour mapping for backend enum values |
| `EventCalendar` | `events: Event[], onSelectDate?` | Month view calendar with event dots; clicking a date filters the list |
| `EventFilterBar` | `filter, onChange` | Dropdowns for event type; date range picker |

### 7.3 Form components

| Component | Description |
|-----------|-------------|
| `CreateEventDialog` / `EditEventDialog` | Full create/edit form with all event fields; handles `schoolId` injection from session |
| `RsvpDialog` | Status selector (attending / not attending / maybe), headcount input, notes textarea |
| `CreateSeatsDialog` | Dynamic list where admin adds rows and seat numbers in bulk |

### 7.4 Action components

| Component | Description |
|-----------|-------------|
| `RSVPButton` | Shows current RSVP status or prompts user to RSVP; calls create or update endpoint; handles loading and error state |
| `TicketPurchaseDialog` | Shows event summary, price breakdown, calls `POST /:eventId/tickets`; on success renders QR code via a QR library (e.g. `qrcode.react`) |
| `TicketQRDisplay` | Renders the `qrCode` UUID as a scannable QR image with ticket metadata below |

### 7.5 Admin management components

| Component | Description |
|-----------|-------------|
| `RsvpTable` | Paginated table: attendee name, status badge, headcount, notes, date submitted |
| `TicketTable` | Paginated table: attendee name, ticket type, price, QR code (truncated), status badge, purchased at, cancel action |
| `SeatMap` | Visual grid rendering seats grouped by row; colour-coded by status (`available` = green, `reserved` = amber, `sold` = red) |
| `CheckInScanner` | QR code reader (using `react-qr-reader` or similar) + manual input fallback; submits `POST /:eventId/check-in`; shows immediate success/error feedback |
| `CheckInStatsPanel` | Live-updating stat cards: Total Tickets / Checked In / Active / Cancelled |
| `CheckInTable` | Paginated table of recent check-ins: attendee name, ticket type, checked in at, scanned by |
| `EventGalleryGrid` | Responsive image grid; lightbox on click; delete button (admin only) |
| `GalleryUploadDialog` | Image file picker (uploads to CDN, returns URL) + caption field; calls `POST /:eventId/gallery` |

---

## 8. Integration Notes

### 8.1 Consent Module

The frontend `SchoolEvent` type has a `requiresConsent` boolean. The backend Event model does not include consent fields — this concern lives in the separate Consent module. When building the wired event detail page for excursions or off-site events, check whether a consent form has been linked to the event via the Consent module (`POST /api/consent` with an `eventId` reference) before surfacing a "Consent Required" badge. Do not invent a `requiresConsent` field on the Event model.

### 8.2 Notification Module

Event-related notifications are dispatched via the Notification module. After creating a new event, the admin flow should optionally trigger a `POST /api/notifications` broadcast to notify parents and students. The Event module itself does not send notifications directly — this must be an explicit UI action or a configured trigger in the Notification module.

### 8.3 Payment / Wallet Module

The current ticket `purchaseTicket` endpoint does not integrate with the Wallet module — it records the ticket and price but does not deduct from a wallet balance. When building the ticket purchase flow, a decision is required:
- **Option A:** Integrate with `POST /api/wallet/debit` before or after the ticket endpoint, treating the ticket purchase as a wallet transaction.
- **Option B:** Leave the ticket endpoint as a pure record with price metadata, and handle payment separately via a fee invoice or a dedicated payment endpoint.

Until this is resolved, the "Confirm Purchase" button in the parent UI should either trigger wallet deduction explicitly or show a "Pay via wallet" confirmation flow.

### 8.4 Consent + Excursion events

Events with `eventType: 'excursion'` typically require parental consent. The UI should check the Consent module for linked consent forms and surface a "Submit Consent Form" CTA alongside the RSVP button for these event types.

### 8.5 Sport Module

`sports_day` events may overlap with fixtures managed in the Sport module. These are separate data models — the Event module manages the school-wide calendar entry, while the Sport module manages match fixtures, teams, and results. There is no direct FK relationship between them at the database level.

### 8.6 Image Upload

The `imageUrl` field in the gallery endpoint accepts any valid URL. The frontend is responsible for uploading the file to a CDN or storage bucket (e.g. AWS S3, Cloudinary) and passing back the resulting URL. The backend stores only the URL string — it does not handle file uploads directly.

### 8.7 QR Code rendering (frontend)

The `qrCode` value stored in `EventTicket` is a UUID v4 string. Render it as a QR code image in the browser using a library such as `qrcode.react`. The check-in scanner reads this same value back and posts it to `POST /:eventId/check-in`.

---

## 9. Acceptance Criteria

### Event CRUD
- [ ] Admin can create an event with all required fields and see it appear in the events list immediately
- [ ] All authenticated users can list events filtered by school (defaults to their own school)
- [ ] Events list supports filtering by `eventType` and sorting by date
- [ ] Admin can edit any field of an existing event and see changes reflected
- [ ] Admin can soft-delete an event; deleted events do not appear in any list
- [ ] Event detail page loads a single event with populated `organizerId` (firstName, lastName, email)

### RSVPs
- [ ] Any authenticated user can submit an RSVP with status `attending`, `not_attending`, or `maybe`
- [ ] Submitting a second RSVP for the same event updates the existing record (upsert — no duplicate)
- [ ] User can update their RSVP status at any time before the event
- [ ] User can withdraw (soft-delete) their RSVP
- [ ] Admin can view the full paginated RSVP list for any event
- [ ] RSVP response populates `userId` with `firstName`, `lastName`, `email`

### Tickets
- [ ] Purchasing a ticket generates a unique UUID `qrCode` and returns it in the response
- [ ] `ticketPrice` in the ticket record resolves correctly: uses `data.price` if provided, else `event.ticketPrice`, else `0`
- [ ] Admin can list all tickets for an event with pagination
- [ ] `GET /tickets/qr/:qrCode` returns ticket with populated `eventId` (title, date, venue) and `userId`
- [ ] Cancelling a ticket changes its status to `cancelled`; calling cancel on an already-cancelled or used ticket returns a 404

### Seats
- [ ] Admin can bulk-create seats; each seat has a unique `{ eventId, row, seatNumber }` combination
- [ ] Seat list is sorted by `row` ascending, then `seatNumber` ascending
- [ ] Reserving a `available` seat sets status to `reserved` and links `ticketId`
- [ ] Attempting to reserve a non-`available` seat returns 404
- [ ] Releasing a `reserved` or `sold` seat sets status back to `available` and clears `ticketId`

### Check-In
- [ ] Scanning a valid active QR code marks the ticket as `used` and creates a check-in record
- [ ] Scanning an already-used QR code returns a 400 error: "Ticket has already been used"
- [ ] Scanning a cancelled ticket returns a 400 error: "Ticket has been cancelled"
- [ ] Scanning a QR not linked to the specified event returns a 404
- [ ] Check-in stats return correct counts for `totalTickets`, `checkedIn`, `activeTickets`, `cancelledTickets`
- [ ] Check-in list populates `ticketId` and `checkedInBy` (firstName, lastName, email)

### Gallery
- [ ] Any authenticated user can upload a gallery image (valid URL required)
- [ ] Gallery images are listed newest first with populated `uploadedBy` (firstName, lastName, email)
- [ ] Admin can soft-delete a gallery image; it disappears from all gallery lists
- [ ] Uploading to a non-existent or deleted event returns 404

### Frontend
- [ ] Admin events page replaces mock data with live API data
- [ ] Event type badges map backend enum values to human-readable labels and correct colour styles
- [ ] Parent "Buy Ticket" dialog calls the real purchase endpoint and renders the returned QR code
- [ ] Parent RSVP button reflects current user RSVP status and allows status changes
- [ ] Check-in scanner on admin event detail page processes valid QR codes and displays immediate feedback
- [ ] Check-in stats panel updates after each successful scan
- [ ] Gallery grid displays images for an event; admin delete action removes images from the grid
- [ ] All loading states, empty states, and error states are handled with appropriate UI feedback
