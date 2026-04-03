# 33 — Parent-Teacher Conference Booking

## 1. Module Overview

The Parent-Teacher Conference module manages the end-to-end booking process for parent-teacher meetings: event creation, teacher availability, parent slot booking, waitlists, cancellations, and day-of scheduling views. It replaces the paper-based sign-up sheets that SA schools typically use.

### Core Concepts

| Concept | Description |
|---|---|
| **Conference Event** | A school-wide event on a specific date (e.g., "Term 1 Parent-Teacher Evening"). Created by admin. |
| **Availability Window** | A block of time during which a teacher is available for bookings (e.g., 14:00–17:00). Set by each teacher. |
| **Time Slot** | An individual bookable slot within an availability window. Generated automatically based on slot duration and break time. |
| **Booking** | A parent reserves a specific time slot with a specific teacher for a specific child. |
| **Waitlist** | When all slots for a teacher are full, parents can join a waitlist. If a slot opens (cancellation), the next waitlisted parent is auto-offered the slot. |

### Configuration Parameters (per Conference Event)

| Setting | Default | Description |
|---|---|---|
| `slotDurationMinutes` | 15 | Length of each parent-teacher slot |
| `breakBetweenMinutes` | 5 | Buffer between consecutive slots |
| `maxSlotsPerTeacher` | null | Optional cap on total slots per teacher (null = unlimited within availability) |
| `maxBookingsPerParent` | null | Optional cap on total bookings per parent per event |
| `allowWaitlist` | true | Whether parents can join a waitlist when slots are full |
| `bookingOpensAt` | null | When parents can start booking (null = immediately) |
| `bookingClosesAt` | null | Booking deadline (null = event start time) |

### Roles and Access

| Role | Permissions |
|---|---|
| `parent` | View events, book/cancel slots, join waitlist, view own bookings |
| `teacher` | Set availability, view own schedule, mark no-shows |
| `school_admin` | Create/manage events, view all bookings, override bookings, view reports |
| `super_admin` | All school_admin permissions across all schools |

The module key is `conference_booking`. All endpoints require authentication and are guarded by `requireModule('conference_booking')`.

---

## 2. Backend API Endpoints

All routes mounted under `/api/conferences`. Guarded by `authenticate` + `requireModule('conference_booking')`.

---

### 2.1 Conference Events

#### POST /conferences/events

Create a new conference event.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "title": "string (required, min 3, max 200)",
  "description": "string (optional, max 1000)",
  "date": "string (required, ISO 8601 date)",
  "startTime": "string (required, e.g. '14:00')",
  "endTime": "string (required, e.g. '18:00')",
  "venue": "string (optional, max 200)",
  "slotDurationMinutes": "number (optional, default 15, min 5, max 60)",
  "breakBetweenMinutes": "number (optional, default 5, min 0, max 30)",
  "maxSlotsPerTeacher": "number | null (optional)",
  "maxBookingsPerParent": "number | null (optional)",
  "allowWaitlist": "boolean (optional, default true)",
  "bookingOpensAt": "string | null (optional, ISO 8601 datetime)",
  "bookingClosesAt": "string | null (optional, ISO 8601 datetime)",
  "participatingTeacherIds": ["string (optional, array of ObjectId — pre-invite teachers)"]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "title": "Term 1 Parent-Teacher Evening",
    "description": "Meet your child's teachers to discuss Term 1 progress.",
    "date": "2026-04-15T00:00:00.000Z",
    "startTime": "14:00",
    "endTime": "18:00",
    "venue": "School Hall",
    "slotDurationMinutes": 15,
    "breakBetweenMinutes": 5,
    "maxSlotsPerTeacher": null,
    "maxBookingsPerParent": 8,
    "allowWaitlist": true,
    "bookingOpensAt": "2026-04-10T08:00:00.000Z",
    "bookingClosesAt": "2026-04-15T12:00:00.000Z",
    "participatingTeacherIds": [],
    "status": "draft",
    "createdBy": "64f1a2b3c4d5e6f7a8b9c0d2",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Conference event created successfully"
}
```

---

#### GET /conferences/events

List conference events.

**Auth:** parent, teacher, school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school (falls back to `req.user.schoolId`) |
| `status` | string | `draft`, `published`, `in_progress`, `completed`, `cancelled` |
| `page` | number | Page number (default 1) |
| `limit` | number | Results per page (default 20) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "title": "Term 1 Parent-Teacher Evening",
        "date": "2026-04-15T00:00:00.000Z",
        "startTime": "14:00",
        "endTime": "18:00",
        "venue": "School Hall",
        "status": "published",
        "totalSlots": 120,
        "bookedSlots": 87,
        "availableSlots": 33
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

#### GET /conferences/events/:id

Get a single conference event with full details.

**Auth:** parent, teacher, school_admin, super_admin

**Response 200:** Full event object with slot counts and participating teacher summary.

---

#### PUT /conferences/events/:id

Update a conference event. Only allowed while status is `draft` or `published` (not `in_progress` or `completed`).

**Auth:** school_admin, super_admin

**Body:** Partial event fields (same as create, all optional).

**Response 200:** Updated event object.

---

#### PATCH /conferences/events/:id/status

Change event status.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "status": "string (required, enum: published|in_progress|completed|cancelled)"
}
```

**Status transitions:**
- `draft` → `published` (makes event visible to parents and teachers)
- `published` → `in_progress` (event day has started)
- `published` → `cancelled`
- `in_progress` → `completed`

**Side effects:**
- `draft → published`: Sends notification to all participating teachers and all parents in the school
- `published → cancelled`: Sends cancellation notification to all users with bookings

---

#### DELETE /conferences/events/:id

Soft-delete a conference event. Only allowed while status is `draft`.

**Auth:** school_admin, super_admin

**Response 200:** `{ "success": true, "data": null, "message": "Conference event deleted successfully" }`

---

### 2.2 Teacher Availability

#### POST /conferences/events/:eventId/availability

Set or update teacher availability for a conference event.

**Auth:** teacher, school_admin, super_admin

**Body:**
```json
{
  "windows": [
    {
      "startTime": "string (required, e.g. '14:00')",
      "endTime": "string (required, e.g. '16:00')",
      "location": "string (optional, e.g. 'Room 12B')"
    },
    {
      "startTime": "16:15",
      "endTime": "18:00",
      "location": "Room 12B"
    }
  ]
}
```

**Validation:**
- Each window's `startTime` must be >= event `startTime` and `endTime` must be <= event `endTime`
- Windows must not overlap

**Response 200:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0e0",
    "eventId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "teacherId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "windows": [
      { "startTime": "14:00", "endTime": "16:00", "location": "Room 12B" },
      { "startTime": "16:15", "endTime": "18:00", "location": "Room 12B" }
    ],
    "generatedSlots": [
      { "slotId": "slot-001", "startTime": "14:00", "endTime": "14:15", "status": "available" },
      { "slotId": "slot-002", "startTime": "14:20", "endTime": "14:35", "status": "available" }
    ]
  },
  "message": "Availability set successfully. 12 slots generated."
}
```

**Side effect:** Automatically generates time slots based on the event's `slotDurationMinutes` and `breakBetweenMinutes`. Existing bookings for previously generated slots are preserved if the new window still covers them; otherwise they are cancelled with notification.

---

#### GET /conferences/events/:eventId/availability

Get all teacher availability for an event.

**Auth:** parent, teacher, school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `teacherId` | string | Filter to a specific teacher |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "teacherId": {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
        "firstName": "Nomsa",
        "lastName": "Khumalo",
        "department": "English"
      },
      "windows": [
        { "startTime": "14:00", "endTime": "17:00", "location": "Room 12B" }
      ],
      "slots": [
        { "slotId": "slot-001", "startTime": "14:00", "endTime": "14:15", "status": "available" },
        { "slotId": "slot-002", "startTime": "14:20", "endTime": "14:35", "status": "booked" },
        { "slotId": "slot-003", "startTime": "14:40", "endTime": "14:55", "status": "available" }
      ],
      "totalSlots": 12,
      "availableSlots": 8,
      "bookedSlots": 4
    }
  ]
}
```

---

### 2.3 Bookings

#### POST /conferences/bookings

Book a time slot with a teacher.

**Auth:** parent, school_admin, super_admin

**Body:**
```json
{
  "eventId": "string (required, ObjectId)",
  "teacherId": "string (required, ObjectId)",
  "slotId": "string (required — from generated slots)",
  "studentId": "string (required, ObjectId — the child being discussed)",
  "notes": "string (optional, max 500 — topics the parent wants to discuss)"
}
```

**Validation:**
- Event must be `published` and booking window must be open
- Slot must have status `available`
- If `maxBookingsPerParent` is set, parent must not exceed it
- Parent must be a guardian of the specified student

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0f0",
    "eventId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "teacherId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "firstName": "Nomsa",
      "lastName": "Khumalo"
    },
    "parentId": "64f1a2b3c4d5e6f7a8b9c0d5",
    "studentId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
      "firstName": "Thandi",
      "lastName": "Molefe"
    },
    "slotId": "slot-003",
    "slotStartTime": "14:40",
    "slotEndTime": "14:55",
    "location": "Room 12B",
    "notes": "Would like to discuss Thandi's maths performance",
    "status": "confirmed",
    "createdAt": "2026-04-11T09:00:00.000Z"
  },
  "message": "Booking confirmed"
}
```

**Side effects:**
- Slot status changes to `booked`
- Notification sent to the teacher: "New booking from {parentName} for {studentName} at {time}"
- Confirmation notification sent to the parent

---

#### GET /conferences/bookings

List bookings with filters.

**Auth:** parent (own only), teacher (own schedule), school_admin (all), super_admin (all)

**Query params:**
| Param | Type | Description |
|---|---|---|
| `eventId` | string | Filter by event (required) |
| `teacherId` | string | Filter by teacher |
| `parentId` | string | Filter by parent |
| `status` | string | `confirmed`, `cancelled`, `completed`, `no_show` |
| `page` | number | Page number (default 1) |
| `limit` | number | Results per page (default 50) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0f0",
        "teacherId": { "_id": "...", "firstName": "Nomsa", "lastName": "Khumalo" },
        "parentId": { "_id": "...", "firstName": "Lindiwe", "lastName": "Molefe" },
        "studentId": { "_id": "...", "firstName": "Thandi", "lastName": "Molefe" },
        "slotStartTime": "14:40",
        "slotEndTime": "14:55",
        "location": "Room 12B",
        "status": "confirmed",
        "notes": "Discuss maths performance"
      }
    ],
    "total": 87,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  }
}
```

---

#### GET /conferences/bookings/my-schedule

Get the current user's bookings for a specific event (for teacher day-of view or parent confirmation view).

**Auth:** parent, teacher

**Query params:**
| Param | Type | Description |
|---|---|---|
| `eventId` | string | Required |

**Response 200:** Array of booking objects sorted by `slotStartTime`.

---

#### PATCH /conferences/bookings/:id/cancel

Cancel a booking.

**Auth:** parent (own only), school_admin, super_admin

**Response 200:**
```json
{
  "success": true,
  "data": { "_id": "...", "status": "cancelled" },
  "message": "Booking cancelled"
}
```

**Side effects:**
- Slot status reverts to `available`
- If waitlist exists for this teacher, the next waitlisted parent is notified: "A slot has opened with {teacherName} at {time}. Book now!"
- Teacher is notified of the cancellation

---

#### PATCH /conferences/bookings/:id/status

Update booking status (for day-of operations).

**Auth:** teacher (own bookings), school_admin, super_admin

**Body:**
```json
{
  "status": "string (required, enum: completed|no_show)"
}
```

**Response 200:** Updated booking object.

---

### 2.4 Waitlist

#### POST /conferences/waitlist

Join the waitlist for a specific teacher at a specific event.

**Auth:** parent, school_admin, super_admin

**Body:**
```json
{
  "eventId": "string (required, ObjectId)",
  "teacherId": "string (required, ObjectId)",
  "studentId": "string (required, ObjectId)",
  "preferredTimes": ["string (optional, array of time strings e.g. '14:00', '15:00')"]
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0f5",
    "eventId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "teacherId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "parentId": "64f1a2b3c4d5e6f7a8b9c0d5",
    "studentId": "64f1a2b3c4d5e6f7a8b9c0d6",
    "position": 3,
    "preferredTimes": ["14:00", "15:00"],
    "status": "waiting",
    "createdAt": "2026-04-11T10:00:00.000Z"
  },
  "message": "Added to waitlist (position 3)"
}
```

---

#### GET /conferences/waitlist

Get waitlist entries.

**Auth:** parent (own), teacher (own), school_admin (all), super_admin (all)

**Query params:**
| Param | Type | Description |
|---|---|---|
| `eventId` | string | Required |
| `teacherId` | string | Optional |

**Response 200:** Array of waitlist entries with position numbers.

---

#### DELETE /conferences/waitlist/:id

Remove self from waitlist.

**Auth:** parent (own only), school_admin, super_admin

**Response 200:** `{ "success": true, "data": null, "message": "Removed from waitlist" }`

---

### 2.5 Conference Reports

#### GET /conferences/events/:eventId/report

Get analytics for a conference event.

**Auth:** school_admin, super_admin

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalTeachers": 35,
    "teachersWithAvailability": 32,
    "totalSlots": 384,
    "bookedSlots": 312,
    "bookingRate": 81.25,
    "cancelledBookings": 18,
    "noShows": 7,
    "noShowRate": 2.24,
    "waitlistEntries": 23,
    "averageBookingsPerParent": 4.2,
    "teacherUtilization": [
      {
        "teacherId": "...",
        "teacherName": "Nomsa Khumalo",
        "totalSlots": 12,
        "bookedSlots": 12,
        "utilizationRate": 100
      }
    ],
    "bookingsByHour": [
      { "hour": "14:00", "count": 35 },
      { "hour": "15:00", "count": 42 }
    ]
  }
}
```

---

## 3. Data Models

### 3.1 ConferenceEvent
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `title` | string | yes | Min 3, max 200 |
| `description` | string | no | Max 1000 |
| `date` | Date | yes | Event date |
| `startTime` | string | yes | e.g. "14:00" |
| `endTime` | string | yes | e.g. "18:00" |
| `venue` | string | no | |
| `slotDurationMinutes` | number | no | Default 15 |
| `breakBetweenMinutes` | number | no | Default 5 |
| `maxSlotsPerTeacher` | number | no | null = unlimited |
| `maxBookingsPerParent` | number | no | null = unlimited |
| `allowWaitlist` | boolean | no | Default true |
| `bookingOpensAt` | Date | no | null = immediate |
| `bookingClosesAt` | Date | no | null = event start |
| `participatingTeacherIds` | ObjectId[] → User | no | Pre-invited teachers |
| `status` | enum | no | `draft`, `published`, `in_progress`, `completed`, `cancelled`; default `draft` |
| `createdBy` | ObjectId → User | yes | |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, date }`, `{ schoolId, status }`

---

### 3.2 TeacherAvailability
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `eventId` | ObjectId → ConferenceEvent | yes | |
| `teacherId` | ObjectId → User | yes | |
| `schoolId` | ObjectId → School | yes | |
| `windows` | AvailabilityWindow[] | yes | At least one window |
| `generatedSlots` | TimeSlot[] | yes | Auto-generated from windows |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**AvailabilityWindow (subdocument):**
| Field | Type | Required |
|---|---|---|
| `startTime` | string | yes |
| `endTime` | string | yes |
| `location` | string | no |

**TimeSlot (subdocument):**
| Field | Type | Required | Notes |
|---|---|---|---|
| `slotId` | string | yes | Generated UUID |
| `startTime` | string | yes | e.g. "14:00" |
| `endTime` | string | yes | e.g. "14:15" |
| `status` | enum | yes | `available`, `booked`, `blocked` |
| `location` | string | no | Inherited from window |

**Indexes:** `{ eventId, teacherId }` (unique), `{ schoolId, eventId }`

---

### 3.3 ConferenceBooking
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `eventId` | ObjectId → ConferenceEvent | yes | |
| `teacherId` | ObjectId → User | yes | |
| `parentId` | ObjectId → User | yes | Set from `req.user.id` |
| `studentId` | ObjectId → Student | yes | |
| `schoolId` | ObjectId → School | yes | |
| `slotId` | string | yes | References TimeSlot.slotId |
| `slotStartTime` | string | yes | Denormalized for query efficiency |
| `slotEndTime` | string | yes | Denormalized |
| `location` | string | no | Denormalized |
| `notes` | string | no | Max 500 |
| `status` | enum | no | `confirmed`, `cancelled`, `completed`, `no_show`; default `confirmed` |
| `cancelledAt` | Date | no | |
| `cancelReason` | string | no | |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ eventId, teacherId, slotId }` (unique), `{ eventId, parentId }`, `{ schoolId, eventId }`

---

### 3.4 ConferenceWaitlist
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `eventId` | ObjectId → ConferenceEvent | yes | |
| `teacherId` | ObjectId → User | yes | |
| `parentId` | ObjectId → User | yes | |
| `studentId` | ObjectId → Student | yes | |
| `schoolId` | ObjectId → School | yes | |
| `position` | number | yes | Auto-incremented per (eventId, teacherId) |
| `preferredTimes` | string[] | no | Preferred time slots |
| `status` | enum | no | `waiting`, `offered`, `expired`; default `waiting` |
| `offeredSlotId` | string | no | When a slot opens, the offered slot |
| `offeredAt` | Date | no | |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ eventId, teacherId, position }`, `{ eventId, parentId }`

---

## 4. Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/admin/conferences` | Admin Conference Dashboard | List events, create new event, event stats |
| `/admin/conferences/:id` | Admin Event Detail | Event config, teacher availability overview, all bookings, reports |
| `/admin/conferences/:id/bookings` | Admin Bookings View | Full booking list with filters, override actions |
| `/teacher/conferences` | Teacher Conference Page | Upcoming events, set availability, view own schedule |
| `/teacher/conferences/:eventId/schedule` | Teacher Day-of Schedule | Ordered list of bookings for the day, mark completed/no-show |
| `/parent/conferences` | Parent Conference Page | Upcoming events, book slots, view own bookings |
| `/parent/conferences/:eventId/book` | Parent Booking Page | Browse teachers, view available slots, make bookings |

---

## 5. User Flows

### 5.1 Admin Creates a Conference Event
1. Admin opens `/admin/conferences` and clicks **Create Event**.
2. Dialog opens with form: Title, Description, Date, Start Time, End Time, Venue, Slot Duration, Break Between Slots, Max Bookings Per Parent, Booking Opens At, Booking Closes At, Allow Waitlist.
3. Admin submits → `POST /conferences/events`.
4. Event is created in `draft` status. Admin can edit settings.
5. When ready, admin clicks **Publish** → `PATCH /conferences/events/:id/status` with `published`.
6. All teachers and parents in the school receive a notification.

### 5.2 Teacher Sets Availability
1. Teacher opens `/teacher/conferences` and sees published events.
2. Clicks an event to open the availability form.
3. Teacher adds one or more availability windows: Start Time, End Time, Location (room number).
4. System shows a preview of generated time slots based on the event's slot/break configuration.
5. Teacher submits → `POST /conferences/events/:eventId/availability`.
6. On success: toast "Availability set. 12 slots generated."

### 5.3 Parent Books a Slot
1. Parent opens `/parent/conferences` and sees published events where booking is open.
2. Clicks an event → navigates to `/parent/conferences/:eventId/book`.
3. Page shows a list of teachers with available slot counts. Parent can search/filter by teacher name or subject.
4. Parent clicks a teacher → sees a timeline of available slots.
5. Parent selects a slot, enters their child (dropdown of their children) and optional notes.
6. `POST /conferences/bookings` is called.
7. On success: toast "Booking confirmed with {teacherName} at {time}". Confirmation card appears in "My Bookings" section.

### 5.4 Parent Joins Waitlist
1. Parent selects a teacher whose slots are all full.
2. Instead of a slot grid, a "Join Waitlist" button appears (if `allowWaitlist` is true).
3. Parent clicks → dialog asks for child selection and preferred times (optional).
4. `POST /conferences/waitlist` is called.
5. On success: toast "Added to waitlist (position 3)".
6. If a slot opens later (cancellation), parent receives a notification to book.

### 5.5 Parent Cancels a Booking
1. Parent opens their bookings list for the event.
2. Clicks **Cancel** on a booking.
3. Confirmation dialog asks for reason.
4. `PATCH /conferences/bookings/:id/cancel` is called.
5. Slot becomes available. If waitlist exists, next parent is notified.

### 5.6 Teacher Day-of View
1. On the conference day, teacher opens `/teacher/conferences/:eventId/schedule`.
2. Page shows an ordered list of their bookings: time, parent name, child name, notes.
3. As meetings complete, teacher clicks **Done** or **No Show** → `PATCH /conferences/bookings/:id/status`.
4. A progress indicator shows completed vs remaining meetings.

### 5.7 Admin Views Reports
1. Admin opens `/admin/conferences/:id` and navigates to the **Reports** tab.
2. Dashboard shows: booking rate %, no-show rate %, teacher utilization chart, bookings by hour chart, waitlist stats.
3. Admin can export booking list as CSV.

---

## 6. State Management

### 6.1 Hook: `useConferences`

Located at `src/hooks/useConferences.ts`.

```ts
interface UseConferencesReturn {
  // Events
  events: ConferenceEvent[];
  eventsLoading: boolean;
  fetchEvents: (filters?: ConferenceEventFilters) => Promise<void>;
  createEvent: (data: CreateConferenceEventPayload) => Promise<ConferenceEvent>;
  updateEvent: (id: string, data: Partial<CreateConferenceEventPayload>) => Promise<void>;
  updateEventStatus: (id: string, status: ConferenceEventStatus) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  // Availability
  availability: TeacherAvailability[];
  availabilityLoading: boolean;
  fetchAvailability: (eventId: string, teacherId?: string) => Promise<void>;
  setAvailability: (eventId: string, data: SetAvailabilityPayload) => Promise<void>;

  // Bookings
  bookings: ConferenceBooking[];
  bookingsLoading: boolean;
  mySchedule: ConferenceBooking[];
  fetchBookings: (eventId: string, filters?: BookingFilters) => Promise<void>;
  fetchMySchedule: (eventId: string) => Promise<void>;
  createBooking: (data: CreateBookingPayload) => Promise<ConferenceBooking>;
  cancelBooking: (id: string) => Promise<void>;
  updateBookingStatus: (id: string, status: 'completed' | 'no_show') => Promise<void>;

  // Waitlist
  waitlist: WaitlistEntry[];
  waitlistLoading: boolean;
  fetchWaitlist: (eventId: string, teacherId?: string) => Promise<void>;
  joinWaitlist: (data: JoinWaitlistPayload) => Promise<void>;
  leaveWaitlist: (id: string) => Promise<void>;

  // Reports
  report: ConferenceReport | null;
  reportLoading: boolean;
  fetchReport: (eventId: string) => Promise<void>;
}
```

### 6.2 Types

All types in `src/types/conference.ts`, re-exported from `src/types/index.ts`:

```ts
type ConferenceEventStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
type SlotStatus = 'available' | 'booked' | 'blocked';
type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';
type WaitlistStatus = 'waiting' | 'offered' | 'expired';

interface ConferenceEvent { ... }
interface TeacherAvailability { ... }
interface AvailabilityWindow { ... }
interface TimeSlot { ... }
interface ConferenceBooking { ... }
interface WaitlistEntry { ... }
interface ConferenceReport { ... }
```

---

## 7. Components Needed

### 7.1 Admin Pages

| Component | File | Description |
|---|---|---|
| `AdminConferenceDashboard` | `src/app/(dashboard)/admin/conferences/page.tsx` | Event list with create/publish actions |
| `AdminEventDetail` | `src/app/(dashboard)/admin/conferences/[id]/page.tsx` | Tabs: Overview, Availability, Bookings, Reports |

### 7.2 Teacher Pages

| Component | File | Description |
|---|---|---|
| `TeacherConferencePage` | `src/app/(dashboard)/teacher/conferences/page.tsx` | Event list, set availability |
| `TeacherSchedulePage` | `src/app/(dashboard)/teacher/conferences/[eventId]/schedule/page.tsx` | Day-of schedule with done/no-show actions |

### 7.3 Parent Pages

| Component | File | Description |
|---|---|---|
| `ParentConferencePage` | `src/app/(dashboard)/parent/conferences/page.tsx` | Event list, own bookings |
| `ParentBookingPage` | `src/app/(dashboard)/parent/conferences/[eventId]/book/page.tsx` | Teacher list, slot grid, book action |

### 7.4 Shared Components (in `src/components/conference/`)

| Component | Props / Responsibilities |
|---|---|
| `ConferenceEventCard` | Card showing event title, date, venue, status badge, slot availability bar. Used on all event list pages. |
| `CreateEventDialog` | Dialog form for creating/editing a conference event. All config fields. `react-hook-form` + Zod. |
| `AvailabilityForm` | Form for teachers to set time windows. Repeating row pattern: startTime, endTime, location. Shows slot preview. |
| `SlotTimeline` | Visual timeline showing time slots as blocks. Color-coded: green=available, orange=booked, gray=blocked. Clickable for booking. |
| `BookingDialog` | Dialog for parent to confirm a booking: shows teacher, time, child selector, notes textarea. |
| `BookingList` | `DataTable` of bookings. Columns: Time, Teacher/Parent, Child, Status, Actions. |
| `TeacherScheduleList` | Ordered card list for teacher day-of view. Each card: time, parent, child, notes, Done/No-Show buttons. |
| `WaitlistPanel` | Shows waitlist position and allows joining/leaving. Displays "You are #3 in line". |
| `ConferenceStatusBadge` | Maps event status to badge variant: draft=muted, published=info, in_progress=warning, completed=success, cancelled=destructive. |
| `BookingStatusBadge` | Maps booking status to badge variant: confirmed=success, cancelled=muted, completed=info, no_show=destructive. |
| `ConferenceReportDashboard` | Charts: booking rate gauge, no-show rate, teacher utilization bar chart, bookings-by-hour bar chart. Uses Recharts. |
| `SlotAvailabilityBar` | Progress bar showing booked/total slots for a teacher or event. |

### 7.5 Existing Shared Components to Reuse

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | All page titles |
| `StatCard` | `src/components/shared/StatCard` | Dashboard stat cards |
| `DataTable` | `src/components/shared/DataTable` | Booking lists |
| `EmptyState` | `src/components/shared/EmptyState` | No events, no bookings |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `Dialog` / `DialogContent` | `src/components/ui/dialog` | All forms |
| `Badge` | `src/components/ui/badge` | Status badges |
| `Tabs` / `TabsList` | `src/components/ui/tabs` | Admin event detail tabs |
| `Card` / `CardContent` | `src/components/ui/card` | Event cards, schedule cards |

---

## 8. Integration Notes

### 8.1 Students and Parents
`ConferenceBooking.studentId` references the `Student` model. `parentId` references the `User` model. When a parent books, the system verifies that the parent is a guardian of the student via the `Student.guardianIds` array.

### 8.2 Staff Module
Teachers participating in conferences come from the `User` model (role `teacher`). The availability endpoint sets `teacherId` from `req.user.id`. Admin can pre-invite teachers via `participatingTeacherIds` on the event.

### 8.3 Notification Module
Conference events trigger notifications via the existing `NotificationService`:
- `conference.published` → all teachers + all parents in school
- `conference.booking.created` → teacher
- `conference.booking.confirmed` → parent
- `conference.booking.cancelled` → teacher + waitlisted parent (if any)
- `conference.slot.available` → next waitlisted parent

### 8.4 Slot Generation Algorithm
When a teacher sets availability, slots are generated:
1. For each window, start at `window.startTime`
2. Create a slot of `slotDurationMinutes` length
3. Add `breakBetweenMinutes` gap
4. Repeat until the next slot would exceed `window.endTime`
5. If `maxSlotsPerTeacher` is set, stop after that many slots total across all windows

Example: Window 14:00–16:00, 15min slots, 5min breaks → 6 slots:
14:00–14:15, 14:20–14:35, 14:40–14:55, 15:00–15:15, 15:20–15:35, 15:40–15:55

### 8.5 Waitlist Auto-Offer
When a booking is cancelled, a BullMQ job `conference.slot.released` is enqueued. The worker:
1. Finds the next waitlisted parent for that (eventId, teacherId) by position
2. If the parent has preferred times and the released slot doesn't match, skip to next
3. Sets waitlist entry status to `offered`, records `offeredSlotId` and `offeredAt`
4. Sends notification to parent
5. Parent has 30 minutes to book the offered slot (enforced by a delayed BullMQ job that expires the offer)

### 8.6 Auth and schoolId
All list endpoints fall back to `req.user.schoolId`. Parents can only see their own bookings and waitlist entries. Teachers can only see their own schedule. Admins see everything.

### 8.7 Nav Entries
Admin: `{ label: 'Conferences', href: '/admin/conferences', icon: Users }` in `src/lib/constants.ts`
Teacher: `{ label: 'Conferences', href: '/teacher/conferences', icon: Users }` in `src/lib/constants.ts`
Parent: `{ label: 'Conferences', href: '/parent/conferences', icon: Users }` in `src/lib/constants.ts`

---

## 9. Acceptance Criteria

### Conference Events
- [ ] Admin can create a conference event with title, date, time range, venue, and slot configuration
- [ ] Admin can publish a draft event, making it visible to teachers and parents
- [ ] Admin can cancel a published event, notifying all booked users
- [ ] Admin can mark an event as completed
- [ ] Event list shows slot availability summary (booked/total)

### Teacher Availability
- [ ] Teachers can set one or more availability windows within the event's time range
- [ ] Time slots are auto-generated based on slot duration and break settings
- [ ] Teachers can update their availability; existing bookings in valid slots are preserved
- [ ] Availability windows cannot overlap

### Bookings
- [ ] Parents can browse teachers and their available slots
- [ ] Parents can book a slot by selecting a teacher, time, child, and optional notes
- [ ] Booking is rejected if slot is already taken (optimistic locking via slot status)
- [ ] Booking is rejected if parent exceeds `maxBookingsPerParent`
- [ ] Parents can cancel their bookings; slot reverts to available
- [ ] Teachers see their schedule as an ordered list of bookings

### Waitlist
- [ ] When all slots for a teacher are full, parents can join a waitlist
- [ ] Waitlist shows the parent's position number
- [ ] When a slot opens (cancellation), the next waitlisted parent is automatically notified
- [ ] Parents can leave the waitlist at any time

### Day-of Operations
- [ ] Teachers can mark bookings as completed or no-show
- [ ] A progress indicator shows completed vs remaining meetings
- [ ] Admin can see an overview of all teachers' schedules

### Reports
- [ ] Admin can view booking rate, no-show rate, and teacher utilization
- [ ] Bookings-by-hour chart shows peak booking times
- [ ] Waitlist statistics are visible

### Notifications
- [ ] Parents and teachers are notified when an event is published
- [ ] Parents receive booking confirmation
- [ ] Teachers receive notification of new bookings
- [ ] Waitlisted parents receive notification when a slot opens

### General
- [ ] All forms use `react-hook-form` with Zod validation
- [ ] All API errors surface as toast notifications using `sonner`
- [ ] Loading and empty states exist for every data view
- [ ] All pages are mobile-responsive with proper breakpoints
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
- [ ] Booking window is enforced (bookingOpensAt / bookingClosesAt)
