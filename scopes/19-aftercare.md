# 19 — AfterCare Module

## 1. Module Overview

The AfterCare module manages after-school care at the school level. It covers five interconnected concerns:

1. **Registrations** — enrolling students in after-care for a given term/academic year, specifying which weekdays they attend and setting a monthly fee.
2. **Attendance** — daily check-in and check-out records for each enrolled student, recorded by staff.
3. **Pickup Authorizations** — a named list of people permitted to collect a given student, stored with ID number, relationship, phone, and optional photo.
4. **Sign-Out Log** — an audit trail of who physically collected a student and whether that person appeared on the authorized list.
5. **Activities** — scheduled activities (homework help, sport, free play, arts & crafts, reading, other) run during after-care sessions with a supervisor and an attendance list.
6. **Invoices** — monthly fee invoices generated in bulk from active registrations, with a simple paid/unpaid lifecycle that bridges to the Fees module.

All resources are soft-deleted (`isDeleted: true`) rather than hard-deleted. The module is scoped to a school via `schoolId`.

---

## 2. Backend API Endpoints

Base path prefix for all routes: `/api/aftercare` (assumed from module mount point).

All endpoints require a valid JWT — `authenticate` middleware is applied to every route.

---

### 2.1 Registrations

#### POST /aftercare/registrations
Enroll a student in after-care.

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

**Request body:**
```json
{
  "studentId":    "string (24-char ObjectId, required)",
  "schoolId":     "string (24-char ObjectId, required)",
  "term":         "number (positive integer, required)",
  "academicYear": "number (positive integer, required)",
  "daysPerWeek":  ["monday|tuesday|wednesday|thursday|friday", "..."],
  "monthlyFee":   "number (non-negative integer in cents, required)",
  "isActive":     "boolean (optional, default true)"
}
```

Validation rules:
- `studentId` / `schoolId`: must match `/^[0-9a-fA-F]{24}$/`
- `term`: integer >= 1
- `academicYear`: integer >= 1
- `daysPerWeek`: array of weekday enum values, minimum 1 element
- `monthlyFee`: integer >= 0 (stored in cents)

**Response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64abc123...",
    "studentId": "64abc456...",
    "schoolId": "64abc789...",
    "term": 1,
    "academicYear": 2026,
    "daysPerWeek": ["monday", "tuesday", "wednesday", "thursday"],
    "monthlyFee": 75000,
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-01-15T08:00:00.000Z"
  },
  "message": "After care registration created successfully"
}
```

**Example request:**
```bash
POST /api/aftercare/registrations
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentId": "64abc456def789012345abcd",
  "schoolId":  "64abc789def012345678abcd",
  "term": 1,
  "academicYear": 2026,
  "daysPerWeek": ["monday", "tuesday", "wednesday", "thursday"],
  "monthlyFee": 75000
}
```

---

#### GET /aftercare/registrations
List registrations with pagination and optional filters.

- **Auth:** required
- **Roles:** any authenticated user

**Query parameters:**
| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| schoolId  | string | Filter by school (falls back to `req.user.schoolId`) |
| page      | number | Page number (default 1)                  |
| limit     | number | Records per page (default from `paginationHelper`) |

**Response — 200:**
```json
{
  "success": true,
  "data": {
    "registrations": [ /* IAfterCareRegistration[] with studentId populated */ ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "message": "Registrations retrieved successfully"
}
```

Sorted by `-createdAt`. `studentId` is populated (full Student document).

---

#### GET /aftercare/registrations/:id
Fetch a single registration.

- **Auth:** required
- **Roles:** any authenticated user

**Response — 200:**
```json
{
  "success": true,
  "data": { /* IAfterCareRegistration with studentId populated */ },
  "message": "Registration retrieved successfully"
}
```

**Error — 404:**
```json
{ "success": false, "message": "After care registration not found" }
```

---

#### PUT /aftercare/registrations/:id
Update a registration (partial update via `$set`).

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

**Request body (all fields optional):**
```json
{
  "term":         "number (positive integer)",
  "academicYear": "number (positive integer)",
  "daysPerWeek":  ["monday|tuesday|...", "..."],
  "monthlyFee":   "number (non-negative integer in cents)",
  "isActive":     "boolean"
}
```

**Response — 200:** Updated registration with `studentId` populated.

---

#### DELETE /aftercare/registrations/:id
Soft-delete a registration (`isDeleted: true`).

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

**Response — 200:**
```json
{
  "success": true,
  "data": null,
  "message": "Registration deleted successfully"
}
```

---

### 2.2 Attendance

#### POST /aftercare/attendance/check-in
Record a student check-in. The authenticated user's ID is stored as `checkedInBy` (taken from `req.user.id`, not the request body).

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`, `teacher`

**Request body:**
```json
{
  "studentId":   "string (24-char ObjectId, required)",
  "schoolId":    "string (24-char ObjectId, required)",
  "date":        "string (ISO 8601 datetime, required)",
  "checkInTime": "string (non-empty, required, e.g. '14:15')",
  "notes":       "string (optional)"
}
```

**Response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64att001...",
    "studentId": "64abc456...",
    "schoolId": "64abc789...",
    "date": "2026-03-28T00:00:00.000Z",
    "checkInTime": "14:15",
    "checkOutTime": null,
    "checkedInBy": "64usr001...",
    "checkedOutBy": null,
    "notes": null,
    "isDeleted": false,
    "createdAt": "2026-03-28T12:15:00.000Z",
    "updatedAt": "2026-03-28T12:15:00.000Z"
  },
  "message": "Check-in recorded successfully"
}
```

**Example request:**
```bash
POST /api/aftercare/attendance/check-in
Authorization: Bearer <token>

{
  "studentId": "64abc456def789012345abcd",
  "schoolId":  "64abc789def012345678abcd",
  "date": "2026-03-28T00:00:00.000Z",
  "checkInTime": "14:15"
}
```

---

#### PATCH /aftercare/attendance/:id/check-out
Record check-out time against an existing attendance record. The authenticated user's ID is stored as `checkedOutBy`.

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`, `teacher`

**Request body:**
```json
{
  "checkOutTime": "string (non-empty, required, e.g. '17:30')",
  "notes":        "string (optional)"
}
```

**Response — 200:** Updated attendance record with `studentId`, `checkedInBy`, and `checkedOutBy` populated.

**Error — 404:**
```json
{ "success": false, "message": "Attendance record not found" }
```

---

#### GET /aftercare/attendance
List attendance records with pagination.

- **Auth:** required
- **Roles:** any authenticated user

**Query parameters:**
| Parameter | Type   | Description                                       |
|-----------|--------|---------------------------------------------------|
| schoolId  | string | Filter by school (falls back to `req.user.schoolId`) |
| studentId | string | Filter by student                                 |
| date      | string | Filter to a specific day (full day window UTC)    |
| page      | number | Page number                                       |
| limit     | number | Records per page                                  |

**Response — 200:**
```json
{
  "success": true,
  "data": {
    "attendance": [ /* IAfterCareAttendance[] populated */ ],
    "total": 80,
    "page": 1,
    "limit": 20,
    "totalPages": 4
  },
  "message": "Attendance records retrieved successfully"
}
```

Sorted by `-date`. `studentId` populated; `checkedInBy` and `checkedOutBy` populated with `firstName lastName email` only.

---

#### GET /aftercare/attendance/:id
Fetch a single attendance record.

- **Auth:** required
- **Roles:** any authenticated user

**Response — 200:** Single `IAfterCareAttendance` with all populated fields.

---

#### DELETE /aftercare/attendance/:id
Soft-delete an attendance record.

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

**Response — 200:**
```json
{ "success": true, "data": null, "message": "Attendance record deleted successfully" }
```

---

### 2.3 Pickup Authorizations

#### POST /aftercare/pickup-auth
Add an authorized pickup person for a student.

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

**Request body:**
```json
{
  "studentId":            "string (24-char ObjectId, required)",
  "schoolId":             "string (24-char ObjectId, required)",
  "authorizedPersonName": "string (non-empty, required)",
  "idNumber":             "string (non-empty, required)",
  "relationship":         "string (non-empty, required)",
  "phoneNumber":          "string (non-empty, required)",
  "photoUrl":             "string (valid URL, optional)",
  "isActive":             "boolean (optional, default true)"
}
```

**Response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64pu001...",
    "studentId": "64abc456...",
    "schoolId": "64abc789...",
    "authorizedPersonName": "Sipho Dlamini",
    "idNumber": "8001015026082",
    "relationship": "Father",
    "phoneNumber": "082 123 4567",
    "photoUrl": null,
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-01-15T08:00:00.000Z"
  },
  "message": "Pickup authorization created successfully"
}
```

---

#### GET /aftercare/pickup-auth
List pickup authorizations.

- **Auth:** required
- **Roles:** any authenticated user

**Query parameters:**
| Parameter | Type   | Description                                       |
|-----------|--------|---------------------------------------------------|
| schoolId  | string | Filter by school (falls back to `req.user.schoolId`) |
| studentId | string | Filter by student                                 |
| page      | number | Page number                                       |
| limit     | number | Records per page                                  |

**Response — 200:**
```json
{
  "success": true,
  "data": {
    "authorizations": [ /* IPickupAuthorization[] with studentId populated */ ],
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Pickup authorizations retrieved successfully"
}
```

Sorted by `-createdAt`.

---

#### PUT /aftercare/pickup-auth/:id
Update a pickup authorization (all fields optional).

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

**Request body (all fields optional):**
```json
{
  "authorizedPersonName": "string",
  "idNumber":             "string",
  "relationship":         "string",
  "phoneNumber":          "string",
  "photoUrl":             "string (valid URL)",
  "isActive":             "boolean"
}
```

**Response — 200:** Updated `IPickupAuthorization` with `studentId` populated.

---

#### DELETE /aftercare/pickup-auth/:id
Soft-delete a pickup authorization.

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

**Response — 200:**
```json
{ "success": true, "data": null, "message": "Pickup authorization deleted successfully" }
```

---

### 2.4 Sign-Out Log

#### POST /aftercare/sign-out
Create a sign-out log entry when a student is collected.

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`, `teacher`

**Request body:**
```json
{
  "attendanceId":    "string (24-char ObjectId, required)",
  "studentId":       "string (24-char ObjectId, required)",
  "schoolId":        "string (24-char ObjectId, required)",
  "pickedUpBy":      "string (non-empty, required — name of collector)",
  "pickedUpAt":      "string (ISO 8601 datetime, required)",
  "isAuthorized":    "boolean (required)",
  "authorizationId": "string (24-char ObjectId, optional — links to PickupAuthorization)",
  "notes":           "string (optional)"
}
```

**Response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64sl001...",
    "attendanceId": "64att001...",
    "studentId": "64abc456...",
    "schoolId": "64abc789...",
    "pickedUpBy": "Sipho Dlamini",
    "pickedUpAt": "2026-03-28T15:30:00.000Z",
    "isAuthorized": true,
    "authorizationId": "64pu001...",
    "notes": null,
    "isDeleted": false,
    "createdAt": "2026-03-28T15:30:05.000Z",
    "updatedAt": "2026-03-28T15:30:05.000Z"
  },
  "message": "Sign out log created successfully"
}
```

---

#### GET /aftercare/sign-out
List sign-out log entries.

- **Auth:** required
- **Roles:** any authenticated user

**Query parameters:**
| Parameter | Type   | Description                                       |
|-----------|--------|---------------------------------------------------|
| schoolId  | string | Filter by school (falls back to `req.user.schoolId`) |
| studentId | string | Filter by student                                 |
| date      | string | Filter to a specific day (matches `pickedUpAt`)   |
| page      | number | Page number                                       |
| limit     | number | Records per page                                  |

**Response — 200:**
```json
{
  "success": true,
  "data": {
    "signOutLogs": [ /* ISignOutLog[] with studentId, attendanceId, authorizationId populated */ ],
    "total": 30,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  },
  "message": "Sign out logs retrieved successfully"
}
```

Sorted by `-pickedUpAt`.

---

### 2.5 Activities

#### POST /aftercare/activities
Create an after-care activity session.

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`, `teacher`

**Request body:**
```json
{
  "schoolId":     "string (24-char ObjectId, required)",
  "date":         "string (ISO 8601 datetime, required)",
  "activityType": "homework_help|sport|free_play|arts_crafts|reading|other (required)",
  "name":         "string (non-empty, required)",
  "description":  "string (optional)",
  "supervisorId": "string (24-char ObjectId, required)",
  "studentIds":   ["string (24-char ObjectId)", "..."] ,
  "startTime":    "string (non-empty, required, e.g. '14:00')",
  "endTime":      "string (non-empty, required, e.g. '15:00')"
}
```

**Response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64act001...",
    "schoolId": "64abc789...",
    "date": "2026-03-28T00:00:00.000Z",
    "activityType": "homework_help",
    "name": "Homework Support",
    "description": "Supervised homework time",
    "supervisorId": "64usr002...",
    "studentIds": ["64abc456...", "64abc457..."],
    "startTime": "14:00",
    "endTime": "15:30",
    "isDeleted": false,
    "createdAt": "2026-03-28T08:00:00.000Z",
    "updatedAt": "2026-03-28T08:00:00.000Z"
  },
  "message": "Activity created successfully"
}
```

---

#### GET /aftercare/activities
List activities with pagination.

- **Auth:** required
- **Roles:** any authenticated user

**Query parameters:**
| Parameter | Type   | Description                                       |
|-----------|--------|---------------------------------------------------|
| schoolId  | string | Filter by school (falls back to `req.user.schoolId`) |
| date      | string | Filter to a specific day                          |
| page      | number | Page number                                       |
| limit     | number | Records per page                                  |

**Response — 200:**
```json
{
  "success": true,
  "data": {
    "activities": [ /* IAfterCareActivity[] with supervisorId (firstName lastName email) and studentIds populated */ ],
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  },
  "message": "Activities retrieved successfully"
}
```

Sorted by `-date`.

---

#### GET /aftercare/activities/:id
Fetch a single activity.

- **Auth:** required
- **Roles:** any authenticated user

**Response — 200:** Single `IAfterCareActivity` with `supervisorId` (firstName lastName email) and `studentIds` populated.

**Error — 404:**
```json
{ "success": false, "message": "After care activity not found" }
```

---

#### PUT /aftercare/activities/:id
Update an activity (all fields optional).

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`, `teacher`

**Request body (all fields optional):**
```json
{
  "date":         "string (ISO 8601 datetime)",
  "activityType": "homework_help|sport|free_play|arts_crafts|reading|other",
  "name":         "string (non-empty)",
  "description":  "string",
  "supervisorId": "string (24-char ObjectId)",
  "studentIds":   ["string (24-char ObjectId)", "..."],
  "startTime":    "string (non-empty)",
  "endTime":      "string (non-empty)"
}
```

**Response — 200:** Updated activity with supervisor and students populated.

---

#### DELETE /aftercare/activities/:id
Soft-delete an activity.

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

**Response — 200:**
```json
{ "success": true, "data": null, "message": "Activity deleted successfully" }
```

---

### 2.6 Invoices

#### POST /aftercare/invoices/generate
Generate monthly invoices in bulk for all active registrations at a school. Skips any student who already has an invoice for that month/year. Returns only newly created invoices.

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

**Request body:**
```json
{
  "schoolId": "string (24-char ObjectId, required)",
  "month":    "number (integer 1–12, required)",
  "year":     "number (positive integer, required)"
}
```

**Response — 201:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64inv001...",
      "schoolId": "64abc789...",
      "registrationId": "64abc123...",
      "studentId": "64abc456...",
      "month": 3,
      "year": 2026,
      "amount": 75000,
      "status": "pending",
      "feeInvoiceId": null,
      "generatedAt": "2026-03-01T06:00:00.000Z",
      "isDeleted": false,
      "createdAt": "2026-03-01T06:00:00.000Z",
      "updatedAt": "2026-03-01T06:00:00.000Z"
    }
  ],
  "message": "Monthly invoices generated successfully"
}
```

**Error — 400** (no active registrations):
```json
{ "success": false, "message": "No active after care registrations found for this school" }
```

**Example request:**
```bash
POST /api/aftercare/invoices/generate
Authorization: Bearer <token>

{
  "schoolId": "64abc789def012345678abcd",
  "month": 3,
  "year": 2026
}
```

---

#### GET /aftercare/invoices
List invoices with pagination and filters.

- **Auth:** required
- **Roles:** any authenticated user

**Query parameters:**
| Parameter | Type   | Description                                       |
|-----------|--------|---------------------------------------------------|
| schoolId  | string | Filter by school (falls back to `req.user.schoolId`) |
| studentId | string | Filter by student                                 |
| month     | number | Filter by month (1–12)                            |
| year      | number | Filter by year                                    |
| status    | string | Filter by status (`pending`, `invoiced`, `paid`)  |
| page      | number | Page number                                       |
| limit     | number | Records per page                                  |

**Response — 200:**
```json
{
  "success": true,
  "data": {
    "invoices": [ /* IAfterCareInvoice[] with studentId and registrationId populated */ ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "message": "Invoices retrieved successfully"
}
```

Sorted by `-generatedAt`.

---

#### PATCH /aftercare/invoices/:id/paid
Mark a single invoice as paid (`status: 'paid'`).

- **Auth:** required
- **Roles:** `super_admin`, `school_admin`

No request body required.

**Response — 200:**
```json
{
  "success": true,
  "data": { /* Updated IAfterCareInvoice with studentId and registrationId populated */ },
  "message": "Invoice marked as paid successfully"
}
```

**Error — 404:**
```json
{ "success": false, "message": "After care invoice not found" }
```

---

## 3. Frontend Pages

### 3.1 Admin After Care Page
**Path:** `src/app/(dashboard)/admin/aftercare/page.tsx`

Single-page management view for school admins. Uses a tab layout with four tabs:

| Tab | Content |
|-----|---------|
| Enrolled Students | DataTable of all registrations showing per-day attendance pattern (Mon–Fri checkmarks), pickup person, and active/inactive status |
| Today's Attendance | DataTable of check-in records for the current day with inline "Check Out" action per still-present student |
| Billing | DataTable of monthly invoices showing days attended, rate per day, total amount, and payment status with inline "Send Invoice" action |
| Sign-Out Log | DataTable of sign-out history showing pickup person, relationship, time, date, and authorization status |

**Summary stats (top of page):**
- Total Enrolled (active registrations)
- Present Today (all attendance records for today)
- Checked Out (attendance records with `checkOutTime` set)
- Pending Pickup (attendance records still checked in)

**Dialog — Register Student:**
Triggered by "Register Student" button in the page header. Collects:
- Student (select)
- Days enrolled (Mon–Fri checkboxes)
- Authorized pickup person name (text input)
- ID number + relationship (grid row)
- Phone number (text input)

**Current state:** Page is wired to mock data. All four tabs are rendered. The check-out action calls `toast.success` only. The register form calls `toast.success` only.

---

## 4. User Flows

### 4.1 Admin Registers a Student for After Care

1. Admin navigates to After Care page.
2. Clicks "Register Student" — dialog opens.
3. Selects student from dropdown (populated from `/students` API).
4. Ticks relevant weekdays.
5. Enters pickup person name, ID number, relationship, phone.
6. Submits form — calls `POST /aftercare/registrations` to create the registration, then `POST /aftercare/pickup-auth` to create the pickup authorization.
7. On success, registration appears in Enrolled Students tab.

### 4.2 Staff Takes Attendance (Check In)

1. Teacher navigates to After Care > Today's Attendance tab.
2. Clicks "Check In" for a student (or a bulk check-in flow via the registration list).
3. Frontend calls `POST /aftercare/attendance/check-in` with `studentId`, `schoolId`, today's `date`, `checkInTime` (current time).
4. Row appears in attendance table with status "Checked In".

### 4.3 Staff Records a Check-Out

1. Teacher sees a student with status "Checked In" in Today's Attendance tab.
2. Clicks "Check Out" button on that row.
3. Frontend calls `PATCH /aftercare/attendance/:id/check-out` with `checkOutTime` (current time).
4. Row status updates to "Checked Out".

### 4.4 Staff Records Sign-Out (Pickup)

1. Pickup person arrives and presents ID.
2. Staff verifies against pickup authorization list (`GET /aftercare/pickup-auth?studentId=...`).
3. Staff calls `POST /aftercare/sign-out` with `isAuthorized: true/false`, `pickedUpBy` (name from ID presented), optionally `authorizationId` if matched.
4. Entry appears in Sign-Out Log with authorization badge.

### 4.5 Parent Registers Child (Self-Service — Future)

Currently admin-only. Future flow:
1. Parent logs in and navigates to fees or enrollment section.
2. Selects after-care enrollment option.
3. Chooses days, submits — backend creates registration and sends confirmation.

### 4.6 Admin Generates Monthly Invoices

1. Admin navigates to Billing tab in After Care page (or dedicated billing page).
2. Selects month and year.
3. Clicks "Generate Invoices" — calls `POST /aftercare/invoices/generate`.
4. All active registrations receive a new invoice at their `monthlyFee` amount; existing invoices for that period are skipped.
5. Invoice list refreshes showing new `pending` entries.

### 4.7 Admin Marks Invoice Paid

1. Admin sees a `pending` or `invoiced` invoice in the Billing tab.
2. Clicks "Mark Paid" — calls `PATCH /aftercare/invoices/:id/paid`.
3. Invoice status updates to `paid`; row badge turns green.

---

## 5. Data Models

### 5.1 AfterCareRegistration

| Field         | Type        | Required | Notes |
|---------------|-------------|----------|-------|
| `_id`         | ObjectId    | auto     | Mongo default |
| `studentId`   | ObjectId    | yes      | ref: Student |
| `schoolId`    | ObjectId    | yes      | ref: School |
| `term`        | Number      | yes      | positive integer |
| `academicYear`| Number      | yes      | positive integer, e.g. 2026 |
| `daysPerWeek` | String[]    | yes      | enum: monday\|tuesday\|wednesday\|thursday\|friday; default [] |
| `monthlyFee`  | Number      | yes      | non-negative integer in cents |
| `isActive`    | Boolean     | no       | default: true |
| `isDeleted`   | Boolean     | no       | default: false (soft delete) |
| `createdAt`   | Date        | auto     | timestamps |
| `updatedAt`   | Date        | auto     | timestamps |

Indexes: `{ schoolId, studentId, term, academicYear }`, `{ schoolId, isActive }`

### 5.2 AfterCareAttendance

| Field          | Type     | Required | Notes |
|----------------|----------|----------|-------|
| `_id`          | ObjectId | auto     | |
| `studentId`    | ObjectId | yes      | ref: Student |
| `schoolId`     | ObjectId | yes      | ref: School |
| `date`         | Date     | yes      | calendar date of attendance |
| `checkInTime`  | String   | yes      | time string, e.g. "14:15" |
| `checkOutTime` | String   | no       | set on checkout |
| `checkedInBy`  | ObjectId | yes      | ref: User |
| `checkedOutBy` | ObjectId | no       | ref: User; set on checkout |
| `notes`        | String   | no       | |
| `isDeleted`    | Boolean  | no       | default: false |
| `createdAt`    | Date     | auto     | |
| `updatedAt`    | Date     | auto     | |

Indexes: `{ schoolId, date }`, `{ studentId, date }`

### 5.3 PickupAuthorization

| Field                  | Type     | Required | Notes |
|------------------------|----------|----------|-------|
| `_id`                  | ObjectId | auto     | |
| `studentId`            | ObjectId | yes      | ref: Student |
| `schoolId`             | ObjectId | yes      | ref: School |
| `authorizedPersonName` | String   | yes      | trimmed |
| `idNumber`             | String   | yes      | trimmed |
| `relationship`         | String   | yes      | trimmed |
| `phoneNumber`          | String   | yes      | trimmed |
| `photoUrl`             | String   | no       | valid URL |
| `isActive`             | Boolean  | no       | default: true |
| `isDeleted`            | Boolean  | no       | default: false |
| `createdAt`            | Date     | auto     | |
| `updatedAt`            | Date     | auto     | |

Index: `{ schoolId, studentId }`

### 5.4 SignOutLog

| Field             | Type     | Required | Notes |
|-------------------|----------|----------|-------|
| `_id`             | ObjectId | auto     | |
| `attendanceId`    | ObjectId | yes      | ref: AfterCareAttendance |
| `studentId`       | ObjectId | yes      | ref: Student |
| `schoolId`        | ObjectId | yes      | ref: School |
| `pickedUpBy`      | String   | yes      | name of person who collected; trimmed |
| `pickedUpAt`      | Date     | yes      | full timestamp |
| `isAuthorized`    | Boolean  | yes      | was person on authorized list |
| `authorizationId` | ObjectId | no       | ref: PickupAuthorization (if matched) |
| `notes`           | String   | no       | |
| `isDeleted`       | Boolean  | no       | default: false |
| `createdAt`       | Date     | auto     | |
| `updatedAt`       | Date     | auto     | |

Index: `{ studentId, pickedUpAt: -1 }`

### 5.5 AfterCareActivity

| Field          | Type       | Required | Notes |
|----------------|------------|----------|-------|
| `_id`          | ObjectId   | auto     | |
| `schoolId`     | ObjectId   | yes      | ref: School |
| `date`         | Date       | yes      | |
| `activityType` | String     | yes      | enum: `homework_help` \| `sport` \| `free_play` \| `arts_crafts` \| `reading` \| `other` |
| `name`         | String     | yes      | trimmed |
| `description`  | String     | no       | |
| `supervisorId` | ObjectId   | yes      | ref: User |
| `studentIds`   | ObjectId[] | no       | ref: Student[]; default [] |
| `startTime`    | String     | yes      | e.g. "14:00" |
| `endTime`      | String     | yes      | e.g. "17:00" |
| `isDeleted`    | Boolean    | no       | default: false |
| `createdAt`    | Date       | auto     | |
| `updatedAt`    | Date       | auto     | |

Index: `{ schoolId, date: -1 }`

### 5.6 AfterCareInvoice

| Field            | Type     | Required | Notes |
|------------------|----------|----------|-------|
| `_id`            | ObjectId | auto     | |
| `schoolId`       | ObjectId | yes      | ref: School |
| `registrationId` | ObjectId | yes      | ref: AfterCareRegistration |
| `studentId`      | ObjectId | yes      | ref: Student |
| `month`          | Number   | yes      | 1–12 |
| `year`           | Number   | yes      | positive integer |
| `amount`         | Number   | yes      | in cents (copied from registration.monthlyFee at generation time) |
| `status`         | String   | no       | enum: `pending` \| `invoiced` \| `paid`; default: `pending` |
| `feeInvoiceId`   | ObjectId | no       | ref: Invoice (Fees module); set when linked to a fee invoice |
| `generatedAt`    | Date     | yes      | set at creation time |
| `isDeleted`      | Boolean  | no       | default: false |
| `createdAt`      | Date     | auto     | |
| `updatedAt`      | Date     | auto     | |

Index: `{ schoolId, month, year }`

---

## 6. State Management

The AfterCare module needs a Zustand store (e.g. `src/lib/stores/aftercareStore.ts`) to replace the current mock-data pattern on the frontend page.

### Recommended store shape

```ts
interface AfterCareStore {
  // Registrations
  registrations: AfterCareRegistration[];
  registrationsLoading: boolean;
  registrationsMeta: PaginationMeta;
  fetchRegistrations: (params?: ListRegistrationsParams) => Promise<void>;
  createRegistration: (data: CreateRegistrationInput) => Promise<void>;
  updateRegistration: (id: string, data: UpdateRegistrationInput) => Promise<void>;
  deleteRegistration: (id: string) => Promise<void>;

  // Attendance
  attendance: AfterCareAttendance[];
  attendanceLoading: boolean;
  attendanceMeta: PaginationMeta;
  fetchAttendance: (params?: ListAttendanceParams) => Promise<void>;
  checkIn: (data: CheckInInput) => Promise<void>;
  checkOut: (id: string, data: CheckOutInput) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;

  // Pickup Authorizations
  pickupAuths: PickupAuthorization[];
  pickupAuthsLoading: boolean;
  pickupAuthsMeta: PaginationMeta;
  fetchPickupAuths: (params?: ListPickupAuthParams) => Promise<void>;
  createPickupAuth: (data: CreatePickupAuthInput) => Promise<void>;
  updatePickupAuth: (id: string, data: UpdatePickupAuthInput) => Promise<void>;
  deletePickupAuth: (id: string) => Promise<void>;

  // Sign-Out Logs
  signOutLogs: SignOutLog[];
  signOutLogsLoading: boolean;
  signOutLogsMeta: PaginationMeta;
  fetchSignOutLogs: (params?: ListSignOutLogParams) => Promise<void>;
  createSignOutLog: (data: CreateSignOutLogInput) => Promise<void>;

  // Activities
  activities: AfterCareActivity[];
  activitiesLoading: boolean;
  activitiesMeta: PaginationMeta;
  fetchActivities: (params?: ListActivityParams) => Promise<void>;
  createActivity: (data: CreateActivityInput) => Promise<void>;
  updateActivity: (id: string, data: UpdateActivityInput) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;

  // Invoices
  invoices: AfterCareInvoice[];
  invoicesLoading: boolean;
  invoicesMeta: PaginationMeta;
  fetchInvoices: (params?: ListInvoiceParams) => Promise<void>;
  generateInvoices: (data: GenerateInvoicesInput) => Promise<void>;
  markInvoicePaid: (id: string) => Promise<void>;
}
```

### Notes
- `PaginationMeta` = `{ total, page, limit, totalPages }`
- All fetch actions should set loading to `true` before the API call and `false` in the finally block.
- Mutations (create/update/delete) should call the corresponding fetch action after success to keep the list in sync, or do an optimistic local update.
- Use `apiClient` (the existing Axios/fetch wrapper in the project) for all HTTP calls.
- Errors should surface via `toast.error(...)` and the store should not swallow them silently.

---

## 7. Components Needed

### 7.1 RegistrationCard / RegistrationRow
Displays a single registration: student name, grade, days-per-week schedule pattern, monthly fee, active/inactive badge, edit and deactivate actions.

### 7.2 RegisterStudentDialog
Modal form (already exists in mock form). When wired:
- Student select field populated from student list API
- Day-of-week checkboxes (Mon–Fri)
- Monthly fee input (numeric, in Rands — frontend divides by 100 for display, stores cents)
- Submits `POST /aftercare/registrations`
- After registration success, optionally opens a second step for pickup authorization entry

### 7.3 PickupAuthorizationForm / Dialog
Create or edit an authorized pickup person.
Fields: name, ID number, relationship (select), phone, optional photo URL.
Calls `POST /aftercare/pickup-auth` or `PUT /aftercare/pickup-auth/:id`.

### 7.4 AttendanceSheet
Table for today's attendance. Columns: student name, grade, check-in time, check-out time (or "Still here"), status badge, check-out action button.
Inline check-out triggers `PATCH /aftercare/attendance/:id/check-out` with current time.

### 7.5 CheckInDialog
Modal for recording a check-in manually.
Fields: student select, date (default today), check-in time (default now), notes.
Calls `POST /aftercare/attendance/check-in`.

### 7.6 SignOutDialog
Modal triggered when a pickup person arrives.
Fields: student (select or pre-filled), picked-up-by name, picked-up-at time, is-authorized toggle, authorization select (shows matched authorized persons for that student), notes.
Calls `POST /aftercare/sign-out`.

### 7.7 SignOutLogTable
Read-only table of sign-out history. Columns: student, picked up by, relationship, time, date, authorization badge (green checkmark or red warning triangle for unauthorized pickups).

### 7.8 ActivityForm / Dialog
Create or edit an activity session.
Fields: date, activity type (select), name, description, supervisor (user select), students (multi-select), start time, end time.
Calls `POST /aftercare/activities` or `PUT /aftercare/activities/:id`.

### 7.9 ActivityCard
Card showing an activity: name, type badge, supervisor name, date, time range, number of students.

### 7.10 InvoiceGeneratorDialog
Form to bulk-generate monthly invoices.
Fields: month (select 1–12), year (number input).
Calls `POST /aftercare/invoices/generate`.
Shows count of newly created invoices on success.

### 7.11 InvoiceTable
Table for billing management. Columns: student, month/year, amount (formatted currency), status badge, "Mark Paid" action (for non-paid), "Send Invoice" action (for unpaid/pending).

### 7.12 AfterCareStatCards (already exists, needs wiring)
Four stat cards: Total Enrolled, Present Today, Checked Out, Pending Pickup. Currently computed from mock data — needs to derive from store.

---

## 8. Integration Notes

### 8.1 Student Module
- `registrations.studentId` → Student document
- `attendance.studentId` → Student document
- `pickupAuth.studentId` → Student document
- `signOutLog.studentId` → Student document
- `activity.studentIds[]` → Student documents
- `invoice.studentId` → Student document

When displaying registrations, attendance, and sign-out logs, student name and grade are pulled from the populated `studentId` field. The Register Student dialog must query the Students API to populate the student selector.

### 8.2 User / Staff Module
- `attendance.checkedInBy` → User (firstName, lastName, email)
- `attendance.checkedOutBy` → User (firstName, lastName, email)
- `activity.supervisorId` → User (firstName, lastName, email)

The Activity form's supervisor select must query the Users API filtered to teachers/admins.

### 8.3 Fee / Invoice Module
- `afterCareInvoice.feeInvoiceId` → Invoice (Fees module)

The `feeInvoiceId` field is a bridge: when after-care invoices are escalated into the main fee system, the Fees module's Invoice `_id` is stored here. The current `markInvoicePaid` endpoint only sets `status: 'paid'` internally and does not create a Fees module invoice. A future integration step (out of current scope) would create a proper Fee Invoice and back-populate `feeInvoiceId`.

### 8.4 School Module
All resources are scoped to `schoolId`. The `schoolId` is typically resolved from `req.user.schoolId` when not explicitly passed as a query param in list endpoints.

### 8.5 Attendance Module (academic)
After-care attendance is **separate** from the academic class attendance module. The two systems do not share records. After-care attendance only covers after-school hours; it uses its own `AfterCareAttendance` collection.

### 8.6 Authorization / RBAC
| Operation | Roles |
|-----------|-------|
| Create/update/delete registration | super_admin, school_admin |
| Read registrations | any authenticated |
| Check in / check out | super_admin, school_admin, teacher |
| Delete attendance | super_admin, school_admin |
| Create/update/delete pickup auth | super_admin, school_admin |
| Create sign-out log | super_admin, school_admin, teacher |
| Create/update activity | super_admin, school_admin, teacher |
| Delete activity | super_admin, school_admin |
| Generate invoices / mark paid | super_admin, school_admin |
| Read invoices | any authenticated |

---

## 9. Acceptance Criteria

### Registrations
- [ ] Admin can register a student for after-care by selecting days and setting a monthly fee
- [ ] Registration is scoped to a specific term and academic year
- [ ] At least one day must be selected — form and API both enforce this
- [ ] Admin can deactivate a registration without deleting it (`isActive: false`)
- [ ] Soft-deleted registrations do not appear in list views
- [ ] Enrolled Students tab shows the correct per-day checkmark pattern for each student

### Attendance
- [ ] Staff can check in a student — a new attendance record is created with `checkedInBy` set to the logged-in user
- [ ] Staff can check out a student — `checkOutTime` and `checkedOutBy` are set on the existing record
- [ ] A student cannot be checked out if there is no open check-in record
- [ ] Filtering attendance by date returns only records for that day (full UTC day window)
- [ ] Today's Attendance tab shows correct counts for Checked In and Checked Out stat cards

### Pickup Authorizations
- [ ] Admin can add, edit, and deactivate authorized pickup persons for a student
- [ ] Pickup authorization list for a student is accessible to staff at sign-out time
- [ ] Deactivated authorizations (`isActive: false`) are visually distinct in the pickup auth list

### Sign-Out Log
- [ ] Staff can log a pickup event, recording the collector's name and whether they were authorized
- [ ] If the collector matches an authorization record, `authorizationId` is linked
- [ ] Unauthorized pickups are flagged with a visible warning in the Sign-Out Log tab
- [ ] Sign-out logs are immutable (no edit endpoint); new log entries are created if a correction is needed

### Activities
- [ ] Staff can create activities with one of the six activity types
- [ ] Multiple students can be associated with an activity
- [ ] Activities can be filtered by date in the API
- [ ] Admin and teachers can edit activities; only admin can delete

### Invoices
- [ ] Admin can generate monthly invoices for all active registrations in one operation
- [ ] Re-running generation for the same month/year does not create duplicate invoices
- [ ] Generated invoice amount matches the `monthlyFee` stored on the registration at generation time
- [ ] Admin can mark an individual invoice as paid
- [ ] Invoice list can be filtered by month, year, student, and status
- [ ] Billing tab in the After Care page reflects live invoice data (not mock data) after wiring

### General
- [ ] All list endpoints return paginated responses with `total`, `page`, `limit`, and `totalPages`
- [ ] All resources are soft-deleted; `isDeleted: true` records never appear in list or detail responses
- [ ] API calls from the frontend use the shared API client with the Bearer token attached
- [ ] Errors from the API surface to the user via `toast.error` with a meaningful message
- [ ] The AfterCare page is accessible only to authenticated users with appropriate roles
