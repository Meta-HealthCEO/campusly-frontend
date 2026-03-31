# 18 — Transport Module

## 1. Module Overview

The Transport module manages school bus routes, student-to-route assignments, real-time boarding/alighting logs, and operational alerts. It covers the full lifecycle: an admin configures routes (with stops, driver, and vehicle details), assigns students to specific stops and travel directions, and drivers or teachers log boardings as students get on and off the bus. Parents receive notifications when their child boards. Admins can broadcast transport alerts (delays, breakdowns, emergencies) that are visible across the platform.

**Roles involved:**
- `super_admin` / `school_admin` — full CRUD on routes, assignments, and alerts; resolve alerts
- `teacher` — create boarding/alighting logs
- `parent` — read-only view of their children's assigned routes and boarding history
- `student` — read-only view of their own assigned route

**Base API path:** `http://localhost:4000/transport` (prefix set at router mount level)

**Background jobs:** When a boarding log is created, a `parent-notify-board` job is queued via `transportBoardingQueue` to notify the parent in near-real-time.

---

## 2. Backend API Endpoints

All endpoints require a valid JWT Bearer token (`Authorization: Bearer <accessToken>`). The token is obtained from `/auth/login` and refreshed via `/auth/refresh`.

---

### 2.1 Bus Routes

#### POST /transport/routes
Create a new bus route.

**Auth:** `super_admin`, `school_admin`

**Request body:**
```json
{
  "name": "string (required, min 1)",
  "schoolId": "string (required, valid 24-char ObjectId)",
  "driverName": "string (required, min 1)",
  "driverPhone": "string (required, min 1)",
  "vehicleRegistration": "string (required, min 1)",
  "capacity": "integer (required, positive)",
  "stops": [
    {
      "name": "string (required, min 1)",
      "time": "string (required, min 1, e.g. '06:30')",
      "latitude": "number (optional)",
      "longitude": "number (optional)"
    }
  ],
  "isActive": "boolean (optional, defaults to true)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "68a1b2c3d4e5f6789abcdef0",
    "name": "Route A - Centurion",
    "schoolId": "68a1b2c3d4e5f6789abcdef1",
    "driverName": "Patrick Ndlovu",
    "driverPhone": "079 123 4567",
    "vehicleRegistration": "GP 123 ABC",
    "capacity": 35,
    "stops": [
      { "name": "Centurion Mall", "time": "06:30", "latitude": -25.8553, "longitude": 28.1881 },
      { "name": "Irene Village", "time": "06:45" },
      { "name": "Greenfield Academy", "time": "07:15" }
    ],
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T06:00:00.000Z",
    "updatedAt": "2026-03-31T06:00:00.000Z"
  },
  "message": "Bus route created successfully"
}
```

---

#### GET /transport/routes
List all bus routes for a school, with pagination and optional sorting.

**Auth:** Any authenticated user

**Query parameters:**
| Parameter  | Type    | Description                                      |
|------------|---------|--------------------------------------------------|
| `schoolId` | string  | Filter by school (falls back to `req.user.schoolId`) |
| `page`     | number  | Page number (default: 1)                         |
| `limit`    | number  | Items per page (default: service default)        |
| `sort`     | string  | Sort field, e.g. `-createdAt` (default: `-createdAt`) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "busRoutes": [ { "...": "IBusRoute object" } ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Bus routes retrieved successfully"
}
```

---

#### GET /transport/routes/:id
Fetch a single bus route by ID.

**Auth:** Any authenticated user

**Response (200):**
```json
{
  "success": true,
  "data": { "...": "IBusRoute object" },
  "message": "Bus route retrieved successfully"
}
```

**Error (404):**
```json
{ "success": false, "message": "Bus route not found" }
```

---

#### PUT /transport/routes/:id
Update a bus route. All fields optional.

**Auth:** `super_admin`, `school_admin`

**Request body (all fields optional):**
```json
{
  "name": "string (min 1)",
  "driverName": "string (min 1)",
  "driverPhone": "string (min 1)",
  "vehicleRegistration": "string (min 1)",
  "capacity": "integer (positive)",
  "stops": [ { "name": "string", "time": "string", "latitude": "number?", "longitude": "number?" } ],
  "isActive": "boolean"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "...": "updated IBusRoute" },
  "message": "Bus route updated successfully"
}
```

---

#### DELETE /transport/routes/:id
Soft-delete a bus route (`isDeleted: true`).

**Auth:** `super_admin`, `school_admin`

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Bus route deleted successfully"
}
```

---

### 2.2 Transport Assignments

A transport assignment links one student to one bus route, specifying which stop they board at and whether they travel in the morning, afternoon, or both directions.

#### POST /transport/assignments
Create a student-to-route assignment.

**Auth:** `super_admin`, `school_admin`

**Request body:**
```json
{
  "studentId": "string (required, valid ObjectId)",
  "schoolId": "string (required, valid ObjectId)",
  "busRouteId": "string (required, valid ObjectId)",
  "stopName": "string (required, min 1)",
  "direction": "'morning' | 'afternoon' | 'both' (required)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "68a1b2c3d4e5f6789abcdef2",
    "studentId": "68a1b2c3d4e5f6789abcdef3",
    "schoolId": "68a1b2c3d4e5f6789abcdef1",
    "busRouteId": "68a1b2c3d4e5f6789abcdef0",
    "stopName": "Centurion Mall",
    "direction": "both",
    "isDeleted": false,
    "createdAt": "2026-03-31T06:00:00.000Z",
    "updatedAt": "2026-03-31T06:00:00.000Z"
  },
  "message": "Transport assignment created successfully"
}
```

---

#### GET /transport/assignments
List assignments, with optional filters.

**Auth:** Any authenticated user

**Query parameters:**
| Parameter    | Type   | Description                                          |
|--------------|--------|------------------------------------------------------|
| `schoolId`   | string | Filter by school (falls back to `req.user.schoolId`) |
| `busRouteId` | string | Filter by route                                      |
| `page`       | number | Page number (default: 1)                             |
| `limit`      | number | Items per page                                       |

**Populate:** `studentId` (full student document), `busRouteId` (name only)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "_id": "68a1b2c3d4e5f6789abcdef2",
        "studentId": { "_id": "...", "...": "full Student doc" },
        "busRouteId": { "_id": "...", "name": "Route A - Centurion" },
        "stopName": "Centurion Mall",
        "direction": "both",
        "isDeleted": false
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Transport assignments retrieved successfully"
}
```

---

#### GET /transport/assignments/:id
Fetch a single assignment by ID (populates student and route name).

**Auth:** Any authenticated user

**Response (200):** Single assignment object with populated fields.

---

#### PUT /transport/assignments/:id
Update an assignment. All fields optional.

**Auth:** `super_admin`, `school_admin`

**Request body (all fields optional):**
```json
{
  "busRouteId": "string (valid ObjectId)",
  "stopName": "string (min 1)",
  "direction": "'morning' | 'afternoon' | 'both'"
}
```

**Response (200):** Updated assignment object with populated fields.

---

#### DELETE /transport/assignments/:id
Soft-delete an assignment.

**Auth:** `super_admin`, `school_admin`

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Transport assignment deleted successfully"
}
```

---

### 2.3 Boarding Logs

Boarding logs record the moment a student gets on (`boardedAt`) and off (`alightedAt`) a bus, with optional GPS coordinates.

#### POST /transport/boarding
Create a boarding log entry (student boards the bus).

**Auth:** `super_admin`, `school_admin`, `teacher`

**Request body:**
```json
{
  "studentId": "string (required, valid ObjectId)",
  "schoolId": "string (required, valid ObjectId)",
  "routeId": "string (required, valid ObjectId)",
  "boardedAt": "ISO date string (required, coerced to Date)",
  "boardingLat": "number (optional)",
  "boardingLng": "number (optional)"
}
```

**Side effect:** Enqueues a `parent-notify-board` background job with `{ studentId, routeId, boardedAt }`.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "68a1b2c3d4e5f6789abcdef4",
    "studentId": "68a1b2c3d4e5f6789abcdef3",
    "schoolId": "68a1b2c3d4e5f6789abcdef1",
    "routeId": "68a1b2c3d4e5f6789abcdef0",
    "boardedAt": "2026-03-31T06:30:00.000Z",
    "boardingLat": -25.8553,
    "boardingLng": 28.1881,
    "alightedAt": null,
    "alightingLat": null,
    "alightingLng": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T06:30:00.000Z",
    "updatedAt": "2026-03-31T06:30:00.000Z"
  },
  "message": "Boarding log created successfully"
}
```

---

#### GET /transport/boarding
List boarding logs with optional filters.

**Auth:** Any authenticated user

**Query parameters:**
| Parameter   | Type   | Description                          |
|-------------|--------|--------------------------------------|
| `routeId`   | string | Filter by route                      |
| `studentId` | string | Filter by student                    |
| `date`      | string | ISO date string (`YYYY-MM-DD`); filters `boardedAt` to that full day (00:00–23:59) |
| `page`      | number | Page number (default: 1)             |
| `limit`     | number | Items per page                       |

**Populate:** `studentId` (full), `routeId` (name only)

**Sort:** `-boardedAt` (most recent first)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "boardingLogs": [ { "...": "IBoardingLog objects with populated fields" } ],
    "total": 30,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  },
  "message": "Boarding logs retrieved successfully"
}
```

---

#### PATCH /transport/boarding/:id/alight
Record alighting (student gets off the bus). Updates the existing boarding log.

**Auth:** `super_admin`, `school_admin`, `teacher`

**Request body:**
```json
{
  "alightedAt": "ISO date string (required, coerced to Date)",
  "alightingLat": "number (optional)",
  "alightingLng": "number (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "...": "updated IBoardingLog" },
  "message": "Alighting logged successfully"
}
```

---

### 2.4 Transport Alerts

Alerts broadcast operational events (delays, breakdowns, route changes, emergencies, weather disruptions) to the school community.

#### POST /transport/alerts
Create a transport alert.

**Auth:** `super_admin`, `school_admin`

**Request body:**
```json
{
  "schoolId": "string (required, valid ObjectId)",
  "routeId": "string (optional, valid ObjectId — omit for school-wide alerts)",
  "type": "'delay' | 'breakdown' | 'route_change' | 'emergency' | 'weather' (required)",
  "title": "string (required, min 1)",
  "message": "string (required, min 1)",
  "severity": "'low' | 'medium' | 'high' | 'critical' (required)",
  "createdBy": "string (required, valid ObjectId — user creating the alert)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "68a1b2c3d4e5f6789abcdef5",
    "schoolId": "68a1b2c3d4e5f6789abcdef1",
    "routeId": "68a1b2c3d4e5f6789abcdef0",
    "type": "delay",
    "title": "Route A Running Late",
    "message": "Route A is delayed by approximately 20 minutes due to traffic.",
    "severity": "medium",
    "isResolved": false,
    "resolvedAt": null,
    "createdBy": "68a1b2c3d4e5f6789abcdef9",
    "isDeleted": false,
    "createdAt": "2026-03-31T06:45:00.000Z",
    "updatedAt": "2026-03-31T06:45:00.000Z"
  },
  "message": "Transport alert created successfully"
}
```

---

#### GET /transport/alerts
List alerts with optional filters.

**Auth:** Any authenticated user

**Query parameters:**
| Parameter    | Type    | Description                                           |
|--------------|---------|-------------------------------------------------------|
| `schoolId`   | string  | Filter by school (falls back to `req.user.schoolId`)  |
| `routeId`    | string  | Filter by route                                       |
| `isResolved` | boolean | `true` or `false` string, converted to boolean        |
| `page`       | number  | Page number (default: 1)                              |
| `limit`      | number  | Items per page                                        |

**Populate:** `routeId` (name only), `createdBy` (name, email)

**Sort:** `-createdAt`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "_id": "68a1b2c3d4e5f6789abcdef5",
        "routeId": { "_id": "...", "name": "Route A - Centurion" },
        "createdBy": { "_id": "...", "name": "Admin User", "email": "admin@school.co.za" },
        "type": "delay",
        "title": "Route A Running Late",
        "severity": "medium",
        "isResolved": false
      }
    ],
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Transport alerts retrieved successfully"
}
```

---

#### GET /transport/alerts/:id
Fetch a single alert by ID (populates route name and createdBy name/email).

**Auth:** Any authenticated user

**Response (200):** Single `ITransportAlert` with populated fields.

---

#### PATCH /transport/alerts/:id/resolve
Mark an alert as resolved. Sets `isResolved: true` and `resolvedAt` to the current timestamp.

**Auth:** `super_admin`, `school_admin`

**Request body:** None required.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "68a1b2c3d4e5f6789abcdef5",
    "isResolved": true,
    "resolvedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Transport alert resolved successfully"
}
```

---

#### DELETE /transport/alerts/:id
Soft-delete a transport alert.

**Auth:** `super_admin`, `school_admin`

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Transport alert deleted successfully"
}
```

---

## 3. Frontend Pages

### 3.1 Admin Transport Page
**Path:** `/admin/transport`
**File:** `src/app/(dashboard)/admin/transport/page.tsx`

**Current state:** Implemented using `mockTransportRoutes` from `src/lib/mock-data.ts`. Renders a 2-column card grid showing each route's name, active status badge, driver info (name, phone), vehicle registration, ordered stops timeline (name + time + optional address), and enrolled student count. Does not yet wire to the live API.

**What needs to be built out:**
- Replace mock data with live API calls to `GET /transport/routes` and `GET /transport/assignments`
- "Add Route" dialog (create bus route form)
- "Edit Route" dialog (update bus route form, including stop management)
- Delete route with confirmation
- Student assignment management: assign/unassign students to routes and stops
- Boarding log viewer (tabular, filterable by date/student/route)
- Alert management panel: create/resolve/delete alerts, with severity badge colouring
- Stat cards: total routes, total students assigned, active alerts, today's boardings

**Suggested tab structure:**
1. Routes — route cards/table with CRUD
2. Assignments — table of student-to-route assignments
3. Boarding Logs — daily boarding/alighting log
4. Alerts — active and resolved alerts

---

### 3.2 Parent Transport Page
**Path:** `/parent/transport`
**File:** `src/app/(dashboard)/parent/transport/page.tsx`

**Current state:** Implemented using mock data. Shows assignment cards per child (avatar initials, name, grade, route badge), then a detailed route card for each unique route the parent's children use. Each route card shows driver info, vehicle registration, student count, a visual stop timeline with times, and which of the parent's children are on that route.

**What needs to be built out:**
- Replace mock data with live API calls:
  - `GET /transport/assignments?schoolId=...` filtered to the parent's children's IDs
  - `GET /transport/routes/:id` for each assigned route
  - `GET /transport/boarding?studentId=...&date=today` for today's boarding status
- Per-child boarding status indicator: "On bus", "Alighted", "Not boarded today"
- Active transport alerts banner: `GET /transport/alerts?schoolId=...&isResolved=false`
- Driver click-to-call link (already in mock implementation)
- Read-only; no create/edit/delete access

---

## 4. User Flows

### 4.1 Admin: Add a New Bus Route
1. Admin navigates to `/admin/transport` → Routes tab.
2. Clicks "Add Route" button → Dialog opens.
3. Fills in: route name, driver name, driver phone, vehicle registration, capacity.
4. Adds stops one by one: each stop has a name, time (HH:MM), and optional latitude/longitude.
5. Submits → `POST /transport/routes` with `schoolId` from `useAuthStore().user.schoolId`.
6. On success: toast "Bus route created successfully", dialog closes, routes list refreshes.

### 4.2 Admin: Assign a Student to a Route
1. Admin navigates to Assignments tab or opens an assignment modal from a route card.
2. Selects student (from a searchable dropdown populated by the Students module).
3. Selects route and stop name from the route's stop list.
4. Selects direction: Morning, Afternoon, or Both.
5. Submits → `POST /transport/assignments`.
6. On success: assignment appears in the list.

### 4.3 Teacher/Admin: Log a Student Boarding
1. User navigates to Boarding Logs tab (or uses a dedicated boarding interface).
2. Selects route, selects student, sets `boardedAt` timestamp (default: now).
3. Optionally captures GPS coordinates.
4. Submits → `POST /transport/boarding`.
5. A background job fires to notify the parent.

### 4.4 Teacher/Admin: Log a Student Alighting
1. Finds the open boarding log in the list for the relevant student.
2. Clicks "Log Alight" → sets `alightedAt` timestamp.
3. Submits → `PATCH /transport/boarding/:id/alight`.
4. Boarding log row updates to show alighting time.

### 4.5 Admin: Broadcast a Transport Alert
1. Admin clicks "New Alert" in the Alerts tab.
2. Fills in: optional route, type (delay/breakdown/route_change/emergency/weather), title, message, severity.
3. Submits → `POST /transport/alerts` (includes `createdBy: user._id`, `schoolId`).
4. Alert appears in the active alerts list; parents see it on their transport page.

### 4.6 Admin: Resolve an Alert
1. Clicks "Resolve" on an active alert → `PATCH /transport/alerts/:id/resolve`.
2. Alert moves to a "Resolved" section with a `resolvedAt` timestamp.

### 4.7 Parent: View Child's Bus Route
1. Parent navigates to `/parent/transport`.
2. Sees each child with their route badge or "No Route" placeholder.
3. For each assigned route: driver name (click-to-call phone), vehicle reg, ordered stop timeline with times.
4. Today's boarding status per child: boarded, alighted, or not yet boarded.
5. If any active alerts exist for the school or the child's route, an alert banner appears at the top.

---

## 5. Data Models

### 5.1 IBusStop (embedded, no `_id`)
```typescript
interface IBusStop {
  name: string;          // Stop name, e.g. "Centurion Mall"
  time: string;          // Scheduled time string, e.g. "06:30"
  latitude?: number;     // WGS84 latitude (optional)
  longitude?: number;    // WGS84 longitude (optional)
}
```

### 5.2 IBusRoute
```typescript
interface IBusRoute extends Document {
  _id: Types.ObjectId;
  name: string;                  // Route display name
  schoolId: Types.ObjectId;      // ref: 'School'
  driverName: string;
  driverPhone: string;
  vehicleRegistration: string;
  capacity: number;              // Max passenger count
  stops: IBusStop[];             // Ordered array; no built-in `order` field — order is by array index
  isActive: boolean;             // default: true
  isDeleted: boolean;            // default: false (soft delete)
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ schoolId, isActive }`, `{ schoolId, name }`

### 5.3 ITransportAssignment
```typescript
type TransportDirection = 'morning' | 'afternoon' | 'both';

interface ITransportAssignment extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;      // ref: 'Student'
  schoolId: Types.ObjectId;       // ref: 'School'
  busRouteId: Types.ObjectId;     // ref: 'BusRoute'
  stopName: string;               // Must match a stop name on the route
  direction: TransportDirection;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ studentId, busRouteId }`, `{ schoolId, busRouteId }`

**Populate behaviour:** `studentId` returns the full Student document; `busRouteId` returns `{ _id, name }` only.

### 5.4 IBoardingLog
```typescript
interface IBoardingLog extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;      // ref: 'Student'
  schoolId: Types.ObjectId;       // ref: 'School'
  routeId: Types.ObjectId;        // ref: 'BusRoute'
  boardedAt: Date;
  alightedAt?: Date;              // Set via PATCH /boarding/:id/alight
  boardingLat?: number;
  boardingLng?: number;
  alightingLat?: number;
  alightingLng?: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ studentId, boardedAt: -1 }`, `{ routeId, boardedAt: -1 }`, `{ schoolId, boardedAt: -1 }`

**Populate behaviour:** `studentId` returns full Student; `routeId` returns `{ _id, name }` only.

### 5.5 ITransportAlert
```typescript
type TransportAlertType = 'delay' | 'breakdown' | 'route_change' | 'emergency' | 'weather';
type TransportAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ITransportAlert extends Document {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;       // ref: 'School'
  routeId?: Types.ObjectId;       // ref: 'BusRoute' (optional — null = school-wide)
  type: TransportAlertType;
  title: string;
  message: string;
  severity: TransportAlertSeverity;
  isResolved: boolean;            // default: false
  resolvedAt?: Date;              // Set by PATCH /alerts/:id/resolve
  createdBy: Types.ObjectId;      // ref: 'User'
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ schoolId, isResolved }`, `{ routeId, isResolved }`, `{ schoolId, type }`

**Populate behaviour:** `routeId` returns `{ _id, name }`; `createdBy` returns `{ _id, name, email }`.

---

## 6. State Management

The Transport module follows the same pattern as other modules in this codebase: no dedicated Zustand store. State is managed locally within each page component using React `useState` and `useEffect`, with `apiClient` for HTTP calls and `useAuthStore` for the current user's `schoolId` and `_id`.

### Recommended local state shape for admin page:

```typescript
// Routes tab
const [routes, setRoutes] = useState<BusRoute[]>([]);
const [routesTotal, setRoutesTotal] = useState(0);
const [routesPage, setRoutesPage] = useState(1);

// Assignments tab
const [assignments, setAssignments] = useState<TransportAssignment[]>([]);
const [assignmentFilter, setAssignmentFilter] = useState<{ busRouteId?: string }>({});

// Boarding logs tab
const [boardingLogs, setBoardingLogs] = useState<BoardingLog[]>([]);
const [boardingFilter, setBoardingFilter] = useState<{ routeId?: string; studentId?: string; date?: string }>({});

// Alerts tab
const [alerts, setAlerts] = useState<TransportAlert[]>([]);
const [showResolved, setShowResolved] = useState(false);

// UI
const [activeTab, setActiveTab] = useState<'routes' | 'assignments' | 'boarding' | 'alerts'>('routes');
const [loading, setLoading] = useState(true);
const [dialogOpen, setDialogOpen] = useState(false);
const [editTarget, setEditTarget] = useState<BusRoute | null>(null);
```

### Recommended local state shape for parent page:

```typescript
const [myAssignments, setMyAssignments] = useState<TransportAssignment[]>([]);
const [activeAlerts, setActiveAlerts] = useState<TransportAlert[]>([]);
const [todayLogs, setTodayLogs] = useState<BoardingLog[]>([]);
const [loading, setLoading] = useState(true);
```

### Data fetching pattern:
```typescript
useEffect(() => {
  async function fetchData() {
    const { user } = useAuthStore.getState();
    try {
      const res = await apiClient.get('/transport/routes', {
        params: { schoolId: user?.schoolId, page: routesPage }
      });
      const d = res.data.data;
      setRoutes(d.busRoutes);
      setRoutesTotal(d.total);
    } catch {
      toast.error('Failed to load transport routes');
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, [routesPage]);
```

---

## 7. Components Needed

### 7.1 Shared / Reusable

| Component | Purpose |
|-----------|---------|
| `RouteCard` | Displays a single bus route: name, active badge, driver info, vehicle reg, ordered stop timeline, student count. Used in both admin and parent views. |
| `StopTimeline` | Visual ordered list of stops with connector lines. Each stop shows name and time. Final stop uses a filled MapPin icon. Already partially implemented in both existing pages. |
| `BoardingStatusBadge` | Shows a student's current boarding state for today: "On Bus" (boarded, not alighted), "Arrived" (alighted), "Not Boarded". Colour-coded. |
| `AlertSeverityBadge` | Colour-coded badge for `low` (blue) / `medium` (amber) / `high` (orange) / `critical` (red) severity levels. |
| `TransportAlertBanner` | Full-width dismissible banner for active critical/high alerts. Used at top of parent transport page. |

### 7.2 Admin-Only

| Component | Purpose |
|-----------|---------|
| `RouteFormDialog` | Create/edit bus route. Fields: name, driverName, driverPhone, vehicleRegistration, capacity, isActive toggle, and a dynamic stop list (add/remove/reorder stops with name, time, optional lat/lng). Uses react-hook-form + zod. |
| `StopEditor` | Sub-component of `RouteFormDialog`. Renders a list of stop rows with name and time inputs, plus Add Stop / Remove Stop controls. Array managed with `useFieldArray`. |
| `AssignmentFormDialog` | Assign a student to a route. Fields: student selector (searchable combobox), route selector, stop name selector (derived from selected route's stops), direction (`morning`/`afternoon`/`both`). |
| `AssignmentTable` | DataTable of `TransportAssignment[]` with columns: student name, route name, stop, direction, actions (edit/delete). Supports filter by `busRouteId`. |
| `BoardingLogTable` | DataTable of `IBoardingLog[]` with columns: student name, route, boarded at, alighted at, GPS available indicator. Filter controls for date, route, student. Includes a "Log Alight" action on rows where `alightedAt` is null. |
| `BoardingLogForm` | Form to create a boarding log: student picker, route picker, timestamp (default now), optional lat/lng inputs. |
| `AlertFormDialog` | Create alert. Fields: optional route selector, type enum, title, message, severity enum. `schoolId` and `createdBy` injected from auth store. |
| `AlertsTable` | Table of `ITransportAlert[]` with columns: type icon, title, route (if set), severity badge, created at, resolved status. Actions: Resolve, Delete. Toggle to show/hide resolved alerts. |
| `TransportStatCards` | Four stat cards: Active Routes, Students Assigned, Unresolved Alerts, Today's Boardings. Calculated from fetched data. |

### 7.3 Parent-Only

| Component | Purpose |
|-----------|---------|
| `ChildRouteCard` | Compact card showing child avatar, name, grade, assigned route badge, and today's boarding status. |
| `RouteDetailCard` | Expanded route view for the parent: driver info with click-to-call, vehicle reg, stop timeline, list of which of the parent's children are on this route. |

---

## 8. Integration Notes

### 8.1 Students Module
- Assignment creation requires a valid `studentId` (ObjectId from the Student document).
- The `AssignmentFormDialog` must fetch the student list from `GET /students?schoolId=...` to populate a searchable student selector.
- `GET /transport/assignments` populates the full Student document on `studentId`, so student name/grade is available without a second fetch.
- On the parent transport page, assignments must be filtered by the parent's children's student IDs.

### 8.2 Parent Module
- Parents access their children's routes and boarding status. The parent portal page filters assignments by the children linked to the authenticated parent.
- The background job `parent-notify-board` (queued on boarding log creation) is expected to trigger a push notification or in-app notification to the parent. The frontend Notifications module should handle displaying this.
- The parent has no write access: all transport data is read-only from the parent portal.

### 8.3 Fees Module (Transport Fees)
- There is no direct foreign key between transport and fees in the current data model.
- Transport fees (e.g. a monthly bus fee) are expected to be managed as a `FeeType` in the Fees module with `category` or `description` indicating it is a transport fee.
- When enrolling a student on a route, the admin should separately create or apply the relevant transport fee invoice via the Fees module.
- Future integration: the Assignment creation flow could optionally trigger a fee invoice creation.

### 8.4 Notifications Module
- The `transportBoardingQueue` background job should publish an in-app notification or push notification when a student boards.
- The frontend Notifications module (bell icon in header) should display these notifications to the relevant parent.
- Active unresolved transport alerts should also appear as notifications or as a banner on the parent transport page.

### 8.5 Auth / RBAC
- `schoolId` is always derived from `useAuthStore().user.schoolId` on the frontend — never manually entered by the user in the UI.
- `createdBy` on alert creation is `useAuthStore().user._id`.
- Role-based UI gating: admin route management actions (Add, Edit, Delete) should be hidden or disabled for non-admin roles. On the parent page, all mutation controls are absent entirely.

---

## 9. Acceptance Criteria

### Bus Routes
- [ ] Admin can create a bus route with name, driver details, vehicle registration, capacity, and an ordered list of stops (each with name and time; lat/lng optional).
- [ ] Route list displays all non-deleted routes for the school, paginated.
- [ ] Admin can edit any field on a route, including adding, removing, and reordering stops.
- [ ] Soft-deleting a route removes it from all list views but does not cascade-delete assignments or boarding logs.
- [ ] A route with `isActive: false` is displayed with an "Inactive" badge and excluded from new assignment creation dropdowns.

### Transport Assignments
- [ ] Admin can assign a student to a route with a specific boarding stop and direction.
- [ ] Each student may hold multiple assignments (e.g. different routes for morning/afternoon), but duplicate `{ studentId, busRouteId }` pairs should be handled gracefully (no unique index enforced in DB, but the UI should warn).
- [ ] Assignment list supports filtering by route, rendering all students on a given route.
- [ ] Admin can update the stop or direction of an existing assignment.
- [ ] Soft-deleting an assignment removes it from the list without affecting boarding logs.

### Boarding Logs
- [ ] Teacher or admin can log a student boarding with timestamp; GPS coordinates are optional.
- [ ] Boarding log creation triggers the `parent-notify-board` background job, which results in the parent receiving a notification.
- [ ] Admin or teacher can subsequently log the alighting event against the same boarding log record.
- [ ] Boarding log list supports filtering by route, student, and date; defaults to showing today's logs.
- [ ] Rows with an open boarding (no `alightedAt`) show a "Log Alight" action.
- [ ] Parent can see their child's boarding status for today (boarded / alighted / not boarded).

### Transport Alerts
- [ ] Admin can create alerts of any type and severity, optionally scoped to a specific route.
- [ ] School-wide alerts (no `routeId`) appear for all users in the school.
- [ ] Active alerts appear prominently on the parent transport page (banner for high/critical severity).
- [ ] Admin can resolve an alert; resolved alerts show `resolvedAt` timestamp and move to a resolved section.
- [ ] Soft-deleting an alert removes it from all views.
- [ ] Alert list supports filtering by `isResolved` status and by route.

### Parent View
- [ ] Parent sees each of their children with their assigned route (or a "No Route" state).
- [ ] Route detail card shows driver name and click-to-call phone link, vehicle registration, and the full stop timeline with scheduled times.
- [ ] Parent sees today's real-time boarding status per child.
- [ ] Parent has no ability to create, edit, or delete any transport data.
- [ ] If no children are assigned to any route, an empty state is displayed.

### General
- [ ] All forms use react-hook-form with zod validation mirroring the backend schemas.
- [ ] All API error responses surface via `toast.error(...)`.
- [ ] All list views use the shared `DataTable` component with search and pagination.
- [ ] Loading states are shown while data is being fetched.
- [ ] `schoolId` is always sourced from `useAuthStore` — never exposed as a user-editable form field.
