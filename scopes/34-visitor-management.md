# 34 — Visitor Management & Gate Pass

## 1. Module Overview

The Visitor Management module provides a complete gate control system for South African schools: visitor registration, pass issuance, check-out logging, pre-registration, and searchable visitor logs. It also manages late student arrivals and early departures with parent notification.

### Core Concepts

| Concept | Description |
|---|---|
| **Visitor** | Any non-staff, non-student person entering school premises. Registered at arrival with details and purpose. |
| **Gate Pass** | A numbered pass issued to a visitor upon registration. Used for identification while on premises. |
| **Pre-Registration** | Expected visitors (scheduled meetings, deliveries, contractors) can be pre-registered by staff. The receptionist verifies on arrival. |
| **Late Arrival** | A student arriving after the school start time. Logged with time, reason, and optional parent notification. |
| **Early Departure** | A student leaving before school end time. Logged with time, reason, authorizing person, and parent notification. |
| **On-Premises Register** | A real-time list of all visitors currently checked in but not yet checked out. Critical for emergency evacuation counts. |

### South African Context
- **POPIA Compliance:** Visitor data (ID number, vehicle registration) is personal information under POPIA. Data is retained for 12 months, then archived/anonymized. Visitors are informed of data collection purpose at sign-in.
- **ID Number:** South African ID numbers are 13 digits. The system validates format but does not verify against Home Affairs.
- **Vehicle Registration:** Optional but recorded for parking management and security.
- **Emergency Protocols:** The on-premises register must be exportable instantly (CSV/print) for evacuation roll-calls.

### Roles and Access

| Role | Permissions |
|---|---|
| `school_admin` | Full access: register visitors, manage pre-registrations, view logs, manage student late/early records, view reports |
| `teacher` | Pre-register expected visitors (e.g., guest speaker), view late arrivals for own class |
| `parent` | Receives notifications for their child's late arrival or early departure |
| `super_admin` | All school_admin permissions across all schools |

A new role `receptionist` is introduced as a sub-role of `school_admin` — functionally identical for this module but allows UI customization (simplified reception desk view).

The module key is `visitor_management`. All endpoints require authentication and are guarded by `requireModule('visitor_management')`.

---

## 2. Backend API Endpoints

All routes mounted under `/api/visitors`. Guarded by `authenticate` + `requireModule('visitor_management')`.

---

### 2.1 Visitor Registration

#### POST /visitors

Register a visitor arrival.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "firstName": "string (required, min 1, max 100)",
  "lastName": "string (required, min 1, max 100)",
  "idNumber": "string (optional, 13 digits — SA ID number)",
  "phone": "string (optional, SA phone format)",
  "email": "string (optional, valid email)",
  "company": "string (optional, max 200 — organization name)",
  "purpose": "string (required, enum: meeting|delivery|maintenance|parent_visit|government|interview|contractor|other)",
  "purposeDetail": "string (optional, max 500 — additional details)",
  "hostId": "string (optional, ObjectId — staff member being visited)",
  "hostName": "string (optional — if host is not in system)",
  "vehicleRegistration": "string (optional, max 20)",
  "numberOfVisitors": "number (optional, default 1 — for group visits)",
  "preRegistrationId": "string (optional, ObjectId — links to pre-registration record)",
  "photoUrl": "string (optional — webcam capture or upload)"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "passNumber": "V-2026-0042",
    "firstName": "Siyabonga",
    "lastName": "Ndlovu",
    "idNumber": "8601015800086",
    "phone": "+27821234567",
    "company": "ABC Plumbing",
    "purpose": "maintenance",
    "purposeDetail": "Fix bathroom leak in Block C",
    "hostId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "firstName": "Sarah",
      "lastName": "van der Merwe"
    },
    "vehicleRegistration": "CA 123-456",
    "numberOfVisitors": 2,
    "checkInTime": "2026-04-01T08:15:00.000Z",
    "checkOutTime": null,
    "status": "checked_in",
    "registeredBy": "64f1a2b3c4d5e6f7a8b9c0d3",
    "isDeleted": false,
    "createdAt": "2026-04-01T08:15:00.000Z"
  },
  "message": "Visitor registered. Pass number: V-2026-0042"
}
```

**Side effects:**
- Generates a sequential pass number scoped to school and year: `V-{year}-{sequence}`
- If `hostId` is provided, sends notification to host: "Your visitor {name} has arrived"
- If linked to a pre-registration, updates the pre-registration status to `arrived`

---

#### GET /visitors

List visitor records with filters and pagination.

**Auth:** school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school (falls back to `req.user.schoolId`) |
| `status` | string | `checked_in`, `checked_out`, `all` (default `all`) |
| `purpose` | string | Filter by purpose type |
| `date` | string | Filter by specific date (ISO date) |
| `startDate` | string | Range start |
| `endDate` | string | Range end |
| `search` | string | Search by name, ID number, company, pass number |
| `hostId` | string | Filter by host (staff member being visited) |
| `page` | number | Page number (default 1) |
| `limit` | number | Results per page (default 20) |
| `sort` | string | Sort field (default `-checkInTime`) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "visitors": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "passNumber": "V-2026-0042",
        "firstName": "Siyabonga",
        "lastName": "Ndlovu",
        "purpose": "maintenance",
        "hostId": { "_id": "...", "firstName": "Sarah", "lastName": "van der Merwe" },
        "checkInTime": "2026-04-01T08:15:00.000Z",
        "checkOutTime": null,
        "status": "checked_in"
      }
    ],
    "total": 156,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

#### GET /visitors/:id

Get a single visitor record.

**Auth:** school_admin, super_admin

**Response 200:** Full visitor object with all populated fields.

**Error 404:** `{ "success": false, "message": "Visitor record not found" }`

---

#### PATCH /visitors/:id/checkout

Check out a visitor. Sets `checkOutTime` and status to `checked_out`.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "notes": "string (optional — checkout notes)"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "checkOutTime": "2026-04-01T10:45:00.000Z",
    "status": "checked_out",
    "duration": "2h 30m"
  },
  "message": "Visitor checked out"
}
```

---

#### GET /visitors/on-premises

Get all visitors currently on premises (checked in, not checked out).

**Auth:** school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "visitors": [
      {
        "_id": "...",
        "passNumber": "V-2026-0042",
        "firstName": "Siyabonga",
        "lastName": "Ndlovu",
        "purpose": "maintenance",
        "hostName": "Sarah van der Merwe",
        "checkInTime": "2026-04-01T08:15:00.000Z",
        "duration": "2h 15m",
        "vehicleRegistration": "CA 123-456"
      }
    ],
    "totalOnPremises": 8
  }
}
```

---

#### GET /visitors/on-premises/export

Export the current on-premises list as CSV (for emergency evacuation).

**Auth:** school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |

**Response 200:** CSV file download with headers: Pass Number, Name, ID Number, Company, Purpose, Host, Check-In Time, Vehicle Reg.

**Content-Type:** `text/csv`

---

### 2.2 Pre-Registration

#### POST /visitors/pre-register

Pre-register an expected visitor.

**Auth:** teacher, school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "company": "string (optional)",
  "purpose": "string (required, enum — same as visitor registration)",
  "purposeDetail": "string (optional)",
  "expectedDate": "string (required, ISO date)",
  "expectedTime": "string (optional, e.g. '09:00')",
  "hostId": "string (optional, ObjectId)",
  "vehicleRegistration": "string (optional)",
  "notes": "string (optional, max 500)"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0e0",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "firstName": "Dr. James",
    "lastName": "Mokoena",
    "purpose": "meeting",
    "expectedDate": "2026-04-05T00:00:00.000Z",
    "expectedTime": "09:00",
    "status": "expected",
    "registeredBy": "64f1a2b3c4d5e6f7a8b9c0d3"
  },
  "message": "Visitor pre-registered"
}
```

---

#### GET /visitors/pre-register

List pre-registrations with filters.

**Auth:** teacher (own), school_admin (all), super_admin (all)

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `expectedDate` | string | Filter by date |
| `status` | string | `expected`, `arrived`, `cancelled`, `no_show` |
| `page` | number | Default 1 |
| `limit` | number | Default 20 |

**Response 200:** Paginated list of pre-registration records.

---

#### PATCH /visitors/pre-register/:id/cancel

Cancel a pre-registration.

**Auth:** teacher (own), school_admin, super_admin

**Response 200:** `{ "success": true, "data": { "status": "cancelled" }, "message": "Pre-registration cancelled" }`

---

### 2.3 Late Arrivals

#### POST /visitors/late-arrivals

Log a late student arrival.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "studentId": "string (required, ObjectId)",
  "arrivalTime": "string (required, ISO 8601 datetime)",
  "reason": "string (required, enum: traffic|medical|transport|family|other)",
  "reasonDetail": "string (optional, max 500)",
  "parentNotified": "boolean (optional, default true)",
  "accompaniedBy": "string (optional — name of person who brought the student)"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0f0",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "studentId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
      "firstName": "Thandi",
      "lastName": "Molefe",
      "classId": { "_id": "...", "name": "Grade 5A" }
    },
    "arrivalTime": "2026-04-01T08:45:00.000Z",
    "minutesLate": 45,
    "reason": "traffic",
    "reasonDetail": "N1 highway accident caused 2-hour delay",
    "parentNotified": true,
    "registeredBy": "64f1a2b3c4d5e6f7a8b9c0d3"
  },
  "message": "Late arrival recorded"
}
```

**Side effects:**
- Calculates `minutesLate` from school start time (configurable per school)
- If `parentNotified` is true, sends notification to all guardians: "{studentName} arrived at school at {time} ({minutesLate} minutes late)"

---

#### GET /visitors/late-arrivals

List late arrivals with filters.

**Auth:** teacher (own class only), school_admin (all), super_admin (all)

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `date` | string | Filter by date (default today) |
| `startDate` | string | Range start |
| `endDate` | string | Range end |
| `classId` | string | Filter by class |
| `studentId` | string | Filter by student |
| `reason` | string | Filter by reason |
| `page` | number | Default 1 |
| `limit` | number | Default 20 |

**Response 200:** Paginated list of late arrival records with populated student and class info.

---

### 2.4 Early Departures

#### POST /visitors/early-departures

Log a student early departure.

**Auth:** school_admin, super_admin

**Body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "studentId": "string (required, ObjectId)",
  "departureTime": "string (required, ISO 8601 datetime)",
  "reason": "string (required, enum: medical|appointment|family_emergency|sport|other)",
  "reasonDetail": "string (optional, max 500)",
  "authorizedById": "string (optional, ObjectId — staff member who authorized)",
  "collectedBy": "string (required — name of person collecting the student)",
  "collectedByIdNumber": "string (optional, 13 digits — ID of person collecting)",
  "collectedByRelation": "string (optional, e.g. 'Mother', 'Uncle')",
  "parentNotified": "boolean (optional, default true)"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0f5",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "studentId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
      "firstName": "Thandi",
      "lastName": "Molefe"
    },
    "departureTime": "2026-04-01T11:30:00.000Z",
    "reason": "medical",
    "reasonDetail": "Doctor's appointment at 12:00",
    "authorizedById": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "firstName": "Sarah",
      "lastName": "van der Merwe"
    },
    "collectedBy": "Lindiwe Molefe",
    "collectedByRelation": "Mother",
    "parentNotified": true,
    "registeredBy": "64f1a2b3c4d5e6f7a8b9c0d3"
  },
  "message": "Early departure recorded"
}
```

**Side effects:**
- If `parentNotified` is true, sends notification to all guardians: "{studentName} departed school at {time}. Collected by: {collectedBy}"
- If `collectedBy` does not match any registered guardian name, a warning flag is set on the record

---

#### GET /visitors/early-departures

List early departures with filters.

**Auth:** teacher (own class only), school_admin (all), super_admin (all)

**Query params:** Same pattern as late arrivals — `schoolId`, `date`, `startDate`, `endDate`, `classId`, `studentId`, `reason`, `page`, `limit`.

**Response 200:** Paginated list of early departure records.

---

### 2.5 Daily Report

#### GET /visitors/daily-report

Aggregated daily report combining visitors, late arrivals, and early departures.

**Auth:** school_admin, super_admin

**Query params:**
| Param | Type | Description |
|---|---|---|
| `schoolId` | string | Filter by school |
| `date` | string | Report date (default today) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "date": "2026-04-01",
    "visitors": {
      "totalCheckedIn": 12,
      "currentlyOnPremises": 3,
      "checkedOut": 9,
      "byPurpose": [
        { "purpose": "meeting", "count": 4 },
        { "purpose": "delivery", "count": 3 },
        { "purpose": "maintenance", "count": 2 },
        { "purpose": "parent_visit", "count": 3 }
      ]
    },
    "lateArrivals": {
      "total": 7,
      "averageMinutesLate": 28,
      "byReason": [
        { "reason": "traffic", "count": 4 },
        { "reason": "transport", "count": 2 },
        { "reason": "medical", "count": 1 }
      ],
      "byClass": [
        { "className": "Grade 5A", "count": 2 },
        { "className": "Grade 7B", "count": 3 }
      ]
    },
    "earlyDepartures": {
      "total": 4,
      "byReason": [
        { "reason": "medical", "count": 2 },
        { "reason": "appointment", "count": 1 },
        { "reason": "sport", "count": 1 }
      ]
    },
    "preRegistrations": {
      "expected": 5,
      "arrived": 3,
      "noShow": 2
    }
  }
}
```

---

## 3. Data Models

### 3.1 VisitorRecord
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `passNumber` | string | yes | Auto-generated: `V-{year}-{seq}` |
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `idNumber` | string | no | SA ID (13 digits), encrypted at rest |
| `phone` | string | no | |
| `email` | string | no | |
| `company` | string | no | Organization name |
| `purpose` | enum | yes | `meeting`, `delivery`, `maintenance`, `parent_visit`, `government`, `interview`, `contractor`, `other` |
| `purposeDetail` | string | no | Max 500 |
| `hostId` | ObjectId → User | no | Staff member being visited |
| `hostName` | string | no | Free-text if host not in system |
| `vehicleRegistration` | string | no | |
| `numberOfVisitors` | number | no | Default 1 |
| `photoUrl` | string | no | Webcam capture path |
| `checkInTime` | Date | yes | Set at registration |
| `checkOutTime` | Date | no | Set at checkout |
| `status` | enum | no | `checked_in`, `checked_out`; default `checked_in` |
| `checkOutNotes` | string | no | |
| `preRegistrationId` | ObjectId → PreRegistration | no | Links to pre-reg |
| `registeredBy` | ObjectId → User | yes | Receptionist/admin who checked in |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, checkInTime }`, `{ schoolId, status }`, `{ schoolId, passNumber }` (unique), `{ schoolId, idNumber }`

---

### 3.2 PreRegistration
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `company` | string | no | |
| `purpose` | enum | yes | Same enum as VisitorRecord |
| `purposeDetail` | string | no | |
| `expectedDate` | Date | yes | |
| `expectedTime` | string | no | e.g. "09:00" |
| `hostId` | ObjectId → User | no | |
| `vehicleRegistration` | string | no | |
| `notes` | string | no | Max 500 |
| `status` | enum | no | `expected`, `arrived`, `cancelled`, `no_show`; default `expected` |
| `registeredBy` | ObjectId → User | yes | |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, expectedDate }`, `{ schoolId, status }`

---

### 3.3 LateArrival
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `studentId` | ObjectId → Student | yes | |
| `arrivalTime` | Date | yes | |
| `minutesLate` | number | yes | Calculated server-side from school start time |
| `reason` | enum | yes | `traffic`, `medical`, `transport`, `family`, `other` |
| `reasonDetail` | string | no | Max 500 |
| `parentNotified` | boolean | no | Default true |
| `accompaniedBy` | string | no | Name of person who brought the student |
| `registeredBy` | ObjectId → User | yes | |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, arrivalTime }`, `{ schoolId, studentId, arrivalTime }`

---

### 3.4 EarlyDeparture
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `schoolId` | ObjectId → School | yes | |
| `studentId` | ObjectId → Student | yes | |
| `departureTime` | Date | yes | |
| `reason` | enum | yes | `medical`, `appointment`, `family_emergency`, `sport`, `other` |
| `reasonDetail` | string | no | Max 500 |
| `authorizedById` | ObjectId → User | no | Staff who authorized |
| `collectedBy` | string | yes | Name of collector |
| `collectedByIdNumber` | string | no | SA ID of collector |
| `collectedByRelation` | string | no | Relationship to student |
| `parentNotified` | boolean | no | Default true |
| `guardianMismatchFlag` | boolean | no | True if collectedBy doesn't match a registered guardian |
| `registeredBy` | ObjectId → User | yes | |
| `isDeleted` | boolean | no | Default false |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, departureTime }`, `{ schoolId, studentId, departureTime }`

---

## 4. Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/admin/visitors` | Visitor Dashboard | On-premises count, today's stats, quick check-in, recent activity |
| `/admin/visitors/register` | Visitor Registration | Full registration form (check-in) |
| `/admin/visitors/log` | Visitor Log | Searchable, filterable visitor history |
| `/admin/visitors/pre-register` | Pre-Registrations | List expected visitors, create pre-registration |
| `/admin/visitors/late-arrivals` | Late Arrivals | Today's late arrivals, log new late arrival |
| `/admin/visitors/early-departures` | Early Departures | Today's early departures, log new early departure |
| `/admin/visitors/report` | Daily Report | Aggregated daily statistics |

---

## 5. User Flows

### 5.1 Receptionist Registers a Visitor
1. Receptionist opens `/admin/visitors` and clicks **Check In Visitor** (or navigates to `/admin/visitors/register`).
2. Registration form shows: First Name, Last Name, ID Number (with SA ID format helper), Phone, Email, Company, Purpose (select), Purpose Detail, Host (staff search/select), Vehicle Registration, Number of Visitors, Photo (optional webcam capture).
3. If the visitor matches a pre-registration (searched by name/date), a banner shows "Matches pre-registration: {details}". Clicking "Link" pre-fills the form.
4. Receptionist submits → `POST /visitors`.
5. On success: toast "Visitor registered. Pass number: V-2026-0042". The pass number is displayed prominently. Optionally, a pass slip can be printed.

### 5.2 Receptionist Checks Out a Visitor
1. Receptionist opens `/admin/visitors` — the on-premises list is shown by default.
2. Finds the visitor by name or pass number.
3. Clicks **Check Out** on the visitor row.
4. Confirmation dialog asks for optional checkout notes.
5. `PATCH /visitors/:id/checkout` is called.
6. On success: toast "Visitor checked out. Duration: 2h 30m". Visitor moves from on-premises to log.

### 5.3 Staff Pre-Registers a Visitor
1. Teacher or admin opens `/admin/visitors/pre-register` and clicks **Pre-Register**.
2. Form shows: First Name, Last Name, Company, Purpose, Expected Date, Expected Time, Host (auto-filled to current user), Vehicle Reg, Notes.
3. Submits → `POST /visitors/pre-register`.
4. On success: toast "Visitor pre-registered for {date}".
5. On the expected date, the receptionist sees the pre-registration in the day's expected list and can quickly convert to a full check-in.

### 5.4 Receptionist Logs a Late Student Arrival
1. Receptionist opens `/admin/visitors/late-arrivals` and clicks **Log Late Arrival**.
2. Form shows: Student (search by name/grade), Arrival Time (defaults to now), Reason (select), Reason Detail, Accompanied By, Notify Parent (checkbox, default checked).
3. System auto-calculates minutes late from school start time.
4. Submits → `POST /visitors/late-arrivals`.
5. On success: toast "Late arrival recorded for {studentName} ({minutesLate} min late)".
6. If notify parent is checked, parent receives push/SMS: "{studentName} arrived at school at {time}".

### 5.5 Receptionist Logs a Student Early Departure
1. Receptionist opens `/admin/visitors/early-departures` and clicks **Log Early Departure**.
2. Form shows: Student (search), Departure Time (defaults to now), Reason (select), Reason Detail, Authorized By (staff select), Collected By (name), Collector ID Number, Collector Relation, Notify Parent.
3. If the `collectedBy` name does not match any registered guardian, a warning shows: "This person is not a registered guardian for this student."
4. Submits → `POST /visitors/early-departures`.
5. Parent is notified: "{studentName} left school at {time}. Collected by: {collectedBy}."

### 5.6 Emergency Export
1. During an emergency, receptionist opens `/admin/visitors` and clicks **Emergency Export**.
2. `GET /visitors/on-premises/export` triggers a CSV download.
3. The CSV contains all currently checked-in visitors with name, ID, company, purpose, and check-in time.
4. Export completes in < 2 seconds.

### 5.7 Admin Views Daily Report
1. Admin opens `/admin/visitors/report`.
2. Date picker defaults to today.
3. Dashboard shows: total visitors, currently on premises, checked out, visitors by purpose (pie chart), late arrivals count + average minutes late, late arrivals by reason (bar chart), early departures count + by reason, pre-registration status (expected/arrived/no-show).
4. Admin can change the date to view historical reports.

---

## 6. State Management

### 6.1 Hook: `useVisitors`

Located at `src/hooks/useVisitors.ts`.

```ts
interface UseVisitorsReturn {
  // Visitors
  visitors: VisitorRecord[];
  visitorsLoading: boolean;
  fetchVisitors: (filters?: VisitorFilters) => Promise<void>;
  registerVisitor: (data: RegisterVisitorPayload) => Promise<VisitorRecord>;
  checkOutVisitor: (id: string, notes?: string) => Promise<void>;

  // On-premises
  onPremises: VisitorRecord[];
  onPremisesLoading: boolean;
  onPremisesCount: number;
  fetchOnPremises: () => Promise<void>;
  exportOnPremises: () => Promise<void>;

  // Pre-registrations
  preRegistrations: PreRegistration[];
  preRegistrationsLoading: boolean;
  fetchPreRegistrations: (filters?: PreRegFilters) => Promise<void>;
  createPreRegistration: (data: CreatePreRegPayload) => Promise<PreRegistration>;
  cancelPreRegistration: (id: string) => Promise<void>;

  // Late arrivals
  lateArrivals: LateArrival[];
  lateArrivalsLoading: boolean;
  fetchLateArrivals: (filters?: LateArrivalFilters) => Promise<void>;
  logLateArrival: (data: LogLateArrivalPayload) => Promise<LateArrival>;

  // Early departures
  earlyDepartures: EarlyDeparture[];
  earlyDeparturesLoading: boolean;
  fetchEarlyDepartures: (filters?: EarlyDepartureFilters) => Promise<void>;
  logEarlyDeparture: (data: LogEarlyDeparturePayload) => Promise<EarlyDeparture>;

  // Daily report
  dailyReport: DailyVisitorReport | null;
  reportLoading: boolean;
  fetchDailyReport: (date?: string) => Promise<void>;
}
```

### 6.2 Types

All types in `src/types/visitor.ts`, re-exported from `src/types/index.ts`:

```ts
type VisitorPurpose = 'meeting' | 'delivery' | 'maintenance' | 'parent_visit' | 'government' | 'interview' | 'contractor' | 'other';
type VisitorStatus = 'checked_in' | 'checked_out';
type PreRegStatus = 'expected' | 'arrived' | 'cancelled' | 'no_show';
type LateReason = 'traffic' | 'medical' | 'transport' | 'family' | 'other';
type EarlyDepartureReason = 'medical' | 'appointment' | 'family_emergency' | 'sport' | 'other';

interface VisitorRecord { ... }
interface PreRegistration { ... }
interface LateArrival { ... }
interface EarlyDeparture { ... }
interface DailyVisitorReport { ... }
```

---

## 7. Components Needed

### 7.1 Admin Pages

| Component | File | Description |
|---|---|---|
| `VisitorDashboard` | `src/app/(dashboard)/admin/visitors/page.tsx` | On-premises list, today's stats, quick actions |
| `VisitorRegisterPage` | `src/app/(dashboard)/admin/visitors/register/page.tsx` | Full registration form |
| `VisitorLogPage` | `src/app/(dashboard)/admin/visitors/log/page.tsx` | Searchable visitor history |
| `PreRegistrationPage` | `src/app/(dashboard)/admin/visitors/pre-register/page.tsx` | Expected visitors list + create form |
| `LateArrivalPage` | `src/app/(dashboard)/admin/visitors/late-arrivals/page.tsx` | Late arrivals list + log form |
| `EarlyDeparturePage` | `src/app/(dashboard)/admin/visitors/early-departures/page.tsx` | Early departures list + log form |
| `DailyReportPage` | `src/app/(dashboard)/admin/visitors/report/page.tsx` | Aggregated daily stats + charts |

### 7.2 Shared Components (in `src/components/visitors/`)

| Component | Props / Responsibilities |
|---|---|
| `VisitorRegistrationForm` | Full visitor check-in form. Fields: name, ID, phone, company, purpose, host, vehicle, photo. `react-hook-form` + Zod. |
| `OnPremisesList` | Card/table list of currently checked-in visitors. Each row: pass number, name, purpose, host, check-in time, duration, check-out button. Auto-refreshes every 60 seconds. |
| `VisitorLogTable` | `DataTable` of visitor records. Columns: Pass #, Name, Company, Purpose, Host, Check In, Check Out, Duration, Status. Searchable. |
| `PreRegFormDialog` | Dialog form for pre-registering a visitor. |
| `PreRegList` | `DataTable` of pre-registrations. Columns: Name, Company, Purpose, Expected Date/Time, Host, Status, Actions. |
| `LateArrivalForm` | Dialog form for logging late arrival. Student search, time, reason, parent notification toggle. |
| `LateArrivalTable` | `DataTable` of late arrivals. Columns: Student, Class, Arrival Time, Minutes Late, Reason, Parent Notified. |
| `EarlyDepartureForm` | Dialog form for logging early departure. Student search, time, reason, authorized by, collected by details, parent notification. |
| `EarlyDepartureTable` | `DataTable` of early departures. Columns: Student, Class, Departure Time, Reason, Collected By, Authorized By. |
| `VisitorPurposeBadge` | Badge mapping purpose to color: meeting=blue, delivery=amber, maintenance=orange, parent_visit=green, etc. |
| `VisitorStatusBadge` | Badge: checked_in=success, checked_out=muted. |
| `GuardianMismatchWarning` | Alert banner shown when collector is not a registered guardian. |
| `PassNumberDisplay` | Large, prominent display of the pass number for printing. |
| `DailyReportCharts` | Recharts wrappers: visitors by purpose (pie), late arrivals by reason (bar), daily trends. |
| `EmergencyExportButton` | Prominent red button for emergency CSV export. Includes loading state. |
| `StudentSearchInput` | Typeahead search for students by name, with class info displayed. |

### 7.3 Existing Shared Components to Reuse

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | All page titles |
| `StatCard` | `src/components/shared/StatCard` | Dashboard stat cards |
| `DataTable` | `src/components/shared/DataTable` | All log/list views |
| `EmptyState` | `src/components/shared/EmptyState` | No visitors today |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `Dialog` / `DialogContent` | `src/components/ui/dialog` | All forms |
| `Badge` | `src/components/ui/badge` | Status and purpose badges |
| `Input` / `Label` / `Textarea` | `src/components/ui/` | Form fields |
| `Select` / `SelectItem` | `src/components/ui/select` | Purpose, reason dropdowns |
| `Card` / `CardContent` | `src/components/ui/card` | On-premises cards |

---

## 8. Integration Notes

### 8.1 Student Module
`LateArrival.studentId` and `EarlyDeparture.studentId` reference the `Student` model. Student search in the forms fetches from `GET /api/students` with a search query. The student's `classId` is populated to show the class name.

### 8.2 Staff Module
`VisitorRecord.hostId` and `EarlyDeparture.authorizedById` reference the `User` model. Host search in the visitor registration form fetches staff from `GET /api/staff`.

### 8.3 Parent Notifications
Late arrival and early departure events trigger parent notifications via `CommunicationService.sendToParent()`. The system looks up the student's guardians from `Student.guardianIds` and sends via each parent's preferred channel (email, SMS, WhatsApp, or push).

### 8.4 Attendance Module
Late arrivals recorded in this module are separate from the attendance module's records. However, a future integration could automatically mark a student as "present (late)" in the attendance register when a late arrival is logged. For now, they are independent.

### 8.5 POPIA Data Handling
- Visitor ID numbers should be encrypted at rest using AES-256. The backend stores the encrypted value and a hash for lookup.
- A BullMQ cron job runs monthly to anonymize visitor records older than 12 months (replace name with "Anonymized", clear ID number, phone, email).
- The registration form includes a POPIA consent notice: "Your information is collected for security purposes and retained for 12 months."

### 8.6 Pass Number Generation
Pass numbers follow the format `V-{year}-{4-digit-sequence}`. A counter per school per year tracks the sequence. Use `findOneAndUpdate` with `$inc` on a `VisitorCounter` collection to avoid race conditions:
```ts
const counter = await VisitorCounter.findOneAndUpdate(
  { schoolId, year },
  { $inc: { seq: 1 } },
  { upsert: true, new: true }
);
const passNumber = `V-${year}-${String(counter.seq).padStart(4, '0')}`;
```

### 8.7 School Start Time
`minutesLate` is calculated from the school's configured start time. The school model should have a `startTime` field (e.g., "07:30"). If not present, default to "08:00".

### 8.8 Auth and schoolId
All endpoints fall back to `req.user.schoolId`. Teachers can only view pre-registrations they created and late arrivals for their assigned classes.

### 8.9 Nav Entry
Admin nav entry: `{ label: 'Visitors', href: '/admin/visitors', icon: UserCheck }` in `src/lib/constants.ts`.

---

## 9. Acceptance Criteria

### Visitor Registration
- [ ] Receptionist can register a visitor with name, ID, phone, company, purpose, host, and vehicle registration
- [ ] A unique pass number is generated and displayed prominently on registration
- [ ] If the visitor matches a pre-registration, the form is pre-filled
- [ ] Host is notified when their visitor arrives

### Visitor Checkout
- [ ] Receptionist can check out a visitor with optional notes
- [ ] Check-out time and duration are recorded
- [ ] Checked-out visitors no longer appear in the on-premises list

### On-Premises Register
- [ ] On-premises list shows all currently checked-in visitors
- [ ] List refreshes automatically (polling or real-time)
- [ ] Emergency CSV export downloads in < 2 seconds
- [ ] Export includes all critical fields: name, ID, company, purpose, check-in time

### Pre-Registration
- [ ] Staff can pre-register expected visitors with date, time, and purpose
- [ ] Pre-registrations are visible on the expected date
- [ ] Pre-registrations can be linked to actual check-ins
- [ ] Pre-registrations can be cancelled

### Late Arrivals
- [ ] Receptionist can log a late student arrival with time, reason, and parent notification
- [ ] Minutes late is calculated automatically from school start time
- [ ] Parents are notified when parent notification is enabled
- [ ] Late arrivals are filterable by date, class, and reason

### Early Departures
- [ ] Receptionist can log an early departure with time, reason, authorizing staff, and collector details
- [ ] System warns if collector is not a registered guardian
- [ ] Parents are notified when parent notification is enabled
- [ ] Collector ID and relationship are recorded for security

### Daily Report
- [ ] Admin can view aggregated daily stats: visitors, late arrivals, early departures
- [ ] Charts show breakdowns by purpose and reason
- [ ] Report date is selectable for historical views

### Security & Compliance
- [ ] Visitor ID numbers are stored encrypted
- [ ] POPIA consent notice is displayed on registration
- [ ] Data older than 12 months is anonymized (future cron job)

### General
- [ ] All forms use `react-hook-form` with Zod validation
- [ ] SA ID number format is validated (13 digits)
- [ ] All API errors surface as toast notifications using `sonner`
- [ ] Loading and empty states exist for every data view
- [ ] All pages are mobile-responsive with proper breakpoints
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
