# 11 — Attendance Module

## 1. Module Overview

The Attendance module is one of the broadest in Campusly. Despite its name, it covers four distinct sub-domains that share a single backend router and database namespace:

1. **Attendance** — per-period, per-student presence tracking (present / absent / late / excused), supporting both single-record and bulk class submission.
2. **Discipline** — incident reporting and case management (misconduct, bullying, truancy, etc.) with severity levels, outcomes, and parent-notification tracking.
3. **Merits & Demerits** — a points-based behaviour reward/sanction system categorised across academic, behaviour, sport, service, and leadership.
4. **Lesson Plans** — teacher preparation records linked to a class, subject, and date with objectives, activities, resources, and reflection notes.
5. **Substitute Teachers** — admin-created records that assign a substitute to cover one or more periods for an absent teacher.

All five sub-domains are behind `authenticate` middleware. Write operations require `teacher`, `school_admin`, or `super_admin` roles; some admin-only endpoints are restricted to `school_admin` / `super_admin`. The `GET /student/:studentId` endpoint is open to any authenticated user (parents can call it).

All responses use the shared `apiResponse` envelope:
```json
{ "success": true, "data": <payload>, "message": "Human-readable string" }
```

---

## 2. Backend API Endpoints

All routes are mounted at `/api/attendance`.

---

### 2.1 Record Single Attendance

**`POST /api/attendance`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| `studentId` | `string` | yes | 24-char hex ObjectId |
| `classId` | `string` | yes | 24-char hex ObjectId |
| `schoolId` | `string` | yes | 24-char hex ObjectId |
| `date` | `string` | yes | ISO 8601 datetime string |
| `period` | `integer` | yes | positive integer |
| `status` | `string` | yes | `"present"` \| `"absent"` \| `"late"` \| `"excused"` |
| `notes` | `string` | no | free text |
| `earlyDeparture` | `boolean` | no | |
| `reason` | `string` | no | free text |
| `verifiedByParent` | `boolean` | no | |
| `arrivalTime` | `string` | no | free text (e.g. `"08:15"`) |
| `departureTime` | `string` | no | free text |

The service uses `findOneAndUpdate` with `upsert: true`, keyed on `{ studentId, date, period }`. Submitting a second record for the same student+date+period overwrites the previous one.

**Example request:**
```json
POST /api/attendance
{
  "studentId": "66a1b2c3d4e5f6a7b8c9d0e1",
  "classId":   "66a1b2c3d4e5f6a7b8c9d0e2",
  "schoolId":  "66a1b2c3d4e5f6a7b8c9d0e3",
  "date":      "2026-03-31T00:00:00.000Z",
  "period":    1,
  "status":    "late",
  "arrivalTime": "08:22",
  "reason":    "Traffic"
}
```

**Example response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "66b1...",
    "studentId": "66a1b2c3d4e5f6a7b8c9d0e1",
    "classId":   "66a1b2c3d4e5f6a7b8c9d0e2",
    "schoolId":  "66a1b2c3d4e5f6a7b8c9d0e3",
    "date":      "2026-03-31T00:00:00.000Z",
    "period":    1,
    "status":    "late",
    "recordedBy": "66c1...",
    "arrivalTime": "08:22",
    "reason":    "Traffic",
    "earlyDeparture": false,
    "verifiedByParent": false,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:25:00.000Z",
    "updatedAt": "2026-03-31T08:25:00.000Z"
  },
  "message": "Attendance recorded successfully"
}
```

---

### 2.2 Bulk Record Attendance (Whole Class)

**`POST /api/attendance/bulk`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| `classId` | `string` | yes | 24-char hex ObjectId |
| `schoolId` | `string` | yes | 24-char hex ObjectId |
| `date` | `string` | yes | ISO 8601 datetime string |
| `period` | `integer` | yes | positive integer |
| `records` | `array` | yes | minimum 1 item |
| `records[].studentId` | `string` | yes | 24-char hex ObjectId |
| `records[].status` | `string` | yes | `"present"` \| `"absent"` \| `"late"` \| `"excused"` |
| `records[].notes` | `string` | no | free text |

The service uses MongoDB `bulkWrite` with `updateOne + upsert: true` for each item, keyed on `{ studentId, date, period }`. After writing, it fetches and returns the full class list for the given date and period.

Note: the frontend teacher page only sends `{ studentId, status }` per record (no notes field) and only uses three of the four statuses (`present`, `absent`, `late`).

**Example request:**
```json
POST /api/attendance/bulk
{
  "classId":  "66a1b2c3d4e5f6a7b8c9d0e2",
  "schoolId": "66a1b2c3d4e5f6a7b8c9d0e3",
  "date":     "2026-03-31T00:00:00.000Z",
  "period":   2,
  "records": [
    { "studentId": "66a1...", "status": "present" },
    { "studentId": "66a2...", "status": "absent",  "notes": "Called in sick" },
    { "studentId": "66a3...", "status": "late" }
  ]
}
```

**Example response — 201:**
```json
{
  "success": true,
  "data": [
    { "_id": "...", "studentId": "66a1...", "status": "present", "period": 2, ... },
    { "_id": "...", "studentId": "66a2...", "status": "absent",  "period": 2, ... },
    { "_id": "...", "studentId": "66a3...", "status": "late",    "period": 2, ... }
  ],
  "message": "Bulk attendance recorded successfully"
}
```

---

### 2.3 Get Attendance by Student

**`GET /api/attendance/student/:studentId?startDate=&endDate=`**

Auth: Bearer token — any authenticated role (no `authorize` guard)

**Path params:** `studentId` — 24-char ObjectId

**Query params:**
| Param | Type | Required |
|---|---|---|
| `startDate` | ISO 8601 string | yes |
| `endDate` | ISO 8601 string | yes |

Returns all non-deleted records in the date range, sorted `date ASC, period ASC`. The `classId` field is populated with the class document.

**Example request:**
```
GET /api/attendance/student/66a1...?startDate=2026-03-01T00:00:00.000Z&endDate=2026-03-31T23:59:59.000Z
```

**Example response — 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "studentId": "66a1...",
      "classId": { "_id": "66a2...", "name": "A" },
      "date": "2026-03-01T00:00:00.000Z",
      "period": 1,
      "status": "present",
      "recordedBy": "66c1...",
      "earlyDeparture": false,
      "verifiedByParent": false,
      "isDeleted": false
    }
  ],
  "message": "Student attendance retrieved successfully"
}
```

**Error — 400 (missing params):**
```json
{ "success": false, "error": "startDate and endDate are required" }
```

---

### 2.4 Get Attendance by Class

**`GET /api/attendance/class/:classId?date=`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

**Path params:** `classId` — 24-char ObjectId

**Query params:**
| Param | Type | Required |
|---|---|---|
| `date` | ISO 8601 string | yes |

Returns all non-deleted records for the class on the given date, sorted by period. The `studentId` field is populated with the student document.

**Example request:**
```
GET /api/attendance/class/66a2...?date=2026-03-31T00:00:00.000Z
```

**Example response — 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "studentId": { "_id": "66a1...", "admissionNumber": "S001", ... },
      "classId": "66a2...",
      "date": "2026-03-31T00:00:00.000Z",
      "period": 1,
      "status": "present"
    }
  ],
  "message": "Class attendance retrieved successfully"
}
```

---

### 2.5 Get Attendance Report (Statistics)

**`GET /api/attendance/report?startDate=&endDate=[&studentId=][&classId=]`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

**Query params:**
| Param | Type | Required |
|---|---|---|
| `startDate` | ISO 8601 string | yes |
| `endDate` | ISO 8601 string | yes |
| `studentId` | 24-char ObjectId | no |
| `classId` | 24-char ObjectId | no |

The service computes counts from raw records in memory. Attendance percentage is calculated as `(present + late) / total * 100`, rounded to 2 decimal places. Both `late` and `present` count toward the percentage because late students did attend.

**Example response — 200:**
```json
{
  "success": true,
  "data": {
    "totalDays": 45,
    "present": 40,
    "absent": 3,
    "late": 2,
    "excused": 0,
    "attendancePercentage": 93.33
  },
  "message": "Attendance report retrieved successfully"
}
```

---

### 2.6 Get Absentees

**`GET /api/attendance/absentees?date=[&schoolId=][&period=]`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

**Query params:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `date` | ISO 8601 string | yes | |
| `schoolId` | 24-char ObjectId | no | falls back to `req.user.schoolId` |
| `period` | integer | no | if omitted, returns all absentees for the day |

Returns attendance records with `status: "absent"`. Both `studentId` and `classId` are populated.

**Example response — 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "studentId": { "_id": "66a1...", "admissionNumber": "S002", ... },
      "classId": { "_id": "66a2...", "name": "B" },
      "date": "2026-03-31T00:00:00.000Z",
      "period": 1,
      "status": "absent"
    }
  ],
  "message": "Absentees retrieved successfully"
}
```

---

### 2.7 Get Daily Report (School-wide Summary)

**`GET /api/attendance/daily/:date[?schoolId=]`**

Auth: Bearer token — roles: `school_admin`, `super_admin`

**Path params:** `date` — ISO 8601 date string (e.g. `2026-03-31`)

**Query params:**
| Param | Type | Required |
|---|---|---|
| `schoolId` | 24-char ObjectId | no — falls back to `req.user.schoolId` |

Uses MongoDB aggregation to group records by class and compute present/absent/late/excused counts. Each class document is looked up via `$lookup`.

**Example response — 200:**
```json
{
  "success": true,
  "data": [
    {
      "classId": "66a2...",
      "className": "Grade 10 A",
      "total": 32,
      "present": 29,
      "absent": 2,
      "late": 1,
      "excused": 0
    },
    {
      "classId": "66a3...",
      "className": "Grade 11 B",
      "total": 28,
      "present": 27,
      "absent": 1,
      "late": 0,
      "excused": 0
    }
  ],
  "message": "Daily report retrieved successfully"
}
```

---

### 2.8 Create Discipline Record

**`POST /api/attendance/discipline`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| `studentId` | `string` | yes | 24-char ObjectId |
| `schoolId` | `string` | yes | 24-char ObjectId |
| `type` | `string` | yes | `"misconduct"` \| `"bullying"` \| `"vandalism"` \| `"truancy"` \| `"dress_code"` \| `"late"` \| `"other"` |
| `severity` | `string` | yes | `"minor"` \| `"moderate"` \| `"serious"` \| `"critical"` |
| `description` | `string` | yes | min 1 char |
| `witnesses` | `string[]` | no | |
| `actionTaken` | `string` | no | |
| `parentNotified` | `boolean` | no | |
| `parentNotifiedDate` | `string` | no | ISO 8601 datetime |
| `meetingScheduled` | `boolean` | no | |
| `meetingDate` | `string` | no | ISO 8601 datetime |
| `outcome` | `string` | no | `"warning"` \| `"detention"` \| `"suspension"` \| `"expulsion"` \| `"counselling"` \| `"community_service"` |
| `detentionDate` | `string` | no | ISO 8601 datetime |
| `detentionServed` | `boolean` | no | |
| `followUpRequired` | `boolean` | no | |
| `followUpDate` | `string` | no | ISO 8601 datetime |
| `followUpNotes` | `string` | no | |
| `status` | `string` | no | `"reported"` \| `"investigating"` \| `"resolved"` \| `"escalated"` — defaults to `"reported"` |

`reportedBy` is set server-side from `req.user.id`.

**Example response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "studentId": "66a1...",
    "schoolId":  "66a2...",
    "reportedBy": "66c1...",
    "type": "truancy",
    "severity": "moderate",
    "description": "Student absent without explanation for 3 consecutive days.",
    "witnesses": [],
    "parentNotified": false,
    "meetingScheduled": false,
    "detentionServed": false,
    "followUpRequired": false,
    "status": "reported",
    "isDeleted": false,
    "createdAt": "2026-03-31T09:00:00.000Z",
    "updatedAt": "2026-03-31T09:00:00.000Z"
  },
  "message": "Discipline record created successfully"
}
```

---

### 2.9 List Discipline Records

**`GET /api/attendance/discipline?schoolId=[&studentId=][&status=][&type=][&page=][&limit=]`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

**Query params:**
| Param | Type | Notes |
|---|---|---|
| `schoolId` | 24-char ObjectId | falls back to `req.user.schoolId` |
| `studentId` | 24-char ObjectId | optional filter |
| `status` | string | optional filter |
| `type` | string | optional filter |
| `page` | integer | default 1 |
| `limit` | integer | default 20, max capped by `PAGINATION_DEFAULTS.maxLimit` |

Populated fields: `studentId`, `reportedBy` (firstName, lastName, email). Sorted `-createdAt`.

**Example response — 200:**
```json
{
  "success": true,
  "data": {
    "data": [ { "..." } ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "message": "Discipline records retrieved successfully"
}
```

---

### 2.10 Get Single Discipline Record

**`GET /api/attendance/discipline/:id`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

Returns a single populated discipline document. 404 if not found or soft-deleted.

---

### 2.11 Update Discipline Record

**`PUT /api/attendance/discipline/:id`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

Body: any subset of the `createDisciplineSchema` fields (all optional via `.partial()`). 404 if not found.

---

### 2.12 Delete Discipline Record

**`DELETE /api/attendance/discipline/:id`**

Auth: Bearer token — roles: `school_admin`, `super_admin`

Soft-delete (`isDeleted: true`). Returns `{ "message": "Discipline record deleted successfully" }`.

---

### 2.13 Create Merit / Demerit

**`POST /api/attendance/merits`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| `studentId` | `string` | yes | 24-char ObjectId |
| `schoolId` | `string` | yes | 24-char ObjectId |
| `type` | `string` | yes | `"merit"` \| `"demerit"` |
| `points` | `integer` | yes | positive integer |
| `category` | `string` | yes | `"academic"` \| `"behaviour"` \| `"sport"` \| `"service"` \| `"leadership"` |
| `reason` | `string` | yes | min 1 char |

`awardedBy` is set server-side from `req.user.id`.

**Example response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "studentId": "66a1...",
    "schoolId":  "66a2...",
    "awardedBy": "66c1...",
    "type": "merit",
    "points": 5,
    "category": "sport",
    "reason": "First place in inter-school 100m sprint.",
    "isDeleted": false,
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:00:00.000Z"
  },
  "message": "Merit/demerit recorded successfully"
}
```

---

### 2.14 List Merits / Demerits

**`GET /api/attendance/merits?schoolId=[&studentId=][&type=][&category=][&page=][&limit=]`**

Auth: Bearer token — any authenticated role (no `authorize` guard)

Populated: `studentId`, `awardedBy` (firstName, lastName, email). Sorted `-createdAt`.

Paginated envelope identical to Discipline list (Section 2.9).

---

### 2.15 Get Student Merit Balance

**`GET /api/attendance/merits/balance/:studentId?schoolId=`**

Auth: Bearer token — any authenticated role

Uses MongoDB aggregation to sum points by type.

**Example response — 200:**
```json
{
  "success": true,
  "data": {
    "meritPoints": 35,
    "demeritPoints": 10,
    "netPoints": 25
  },
  "message": "Merit balance retrieved successfully"
}
```

---

### 2.16 Create Lesson Plan

**`POST /api/attendance/lesson-plans`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | `string` | yes | 24-char ObjectId |
| `subjectId` | `string` | yes | 24-char ObjectId |
| `classId` | `string` | yes | 24-char ObjectId |
| `date` | `string` | yes | ISO 8601 datetime |
| `topic` | `string` | yes | min 1 char, trimmed |
| `objectives` | `string[]` | no | |
| `activities` | `string[]` | no | |
| `resources` | `string[]` | no | |
| `homework` | `string` | no | |
| `reflectionNotes` | `string` | no | |

`teacherId` is set server-side from `req.user.id`.

**Example response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "teacherId": "66c1...",
    "schoolId":  "66a2...",
    "subjectId": { "_id": "66s1...", "name": "Mathematics", "code": "MATH" },
    "classId":   { "_id": "66a2...", "name": "A" },
    "date":      "2026-04-01T00:00:00.000Z",
    "topic":     "Quadratic Equations",
    "objectives": ["Solve by factoring", "Identify discriminant"],
    "activities": ["Worked examples", "Pair problem solving"],
    "resources":  ["Textbook Ch. 5", "Whiteboard"],
    "isDeleted": false
  },
  "message": "Lesson plan created successfully"
}
```

---

### 2.17 List Lesson Plans

**`GET /api/attendance/lesson-plans?[schoolId=][&teacherId=][&classId=][&subjectId=][&page=][&limit=]`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

All query filters are optional. Populated: `subjectId` (name, code), `classId` (name). Sorted `-date`.

---

### 2.18 Get Single Lesson Plan

**`GET /api/attendance/lesson-plans/:id`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

Populated: `subjectId` (name, code), `classId` (name), `teacherId` (firstName, lastName, email). 404 if not found.

---

### 2.19 Update Lesson Plan

**`PUT /api/attendance/lesson-plans/:id`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

Body: any subset of `createLessonPlanSchema` fields (all optional via `.partial()`). 404 if not found.

---

### 2.20 Delete Lesson Plan

**`DELETE /api/attendance/lesson-plans/:id`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

Soft-delete.

---

### 2.21 Create Substitute Teacher Assignment

**`POST /api/attendance/substitutes`**

Auth: Bearer token — roles: `school_admin`, `super_admin`

**Request body:**
| Field | Type | Required | Validation |
|---|---|---|---|
| `originalTeacherId` | `string` | yes | 24-char ObjectId |
| `substituteTeacherId` | `string` | yes | 24-char ObjectId |
| `schoolId` | `string` | yes | 24-char ObjectId |
| `date` | `string` | yes | ISO 8601 datetime |
| `periods` | `integer[]` | yes | min 1 item, each a positive integer |
| `reason` | `string` | yes | min 1 char |
| `classIds` | `string[]` | yes | min 1 item, each a 24-char ObjectId |

`approvedBy` is not set automatically — it must be patched in via update.

**Example response — 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "originalTeacherId": "66c1...",
    "substituteTeacherId": "66c2...",
    "schoolId": "66a2...",
    "date": "2026-04-01T00:00:00.000Z",
    "periods": [3, 4],
    "reason": "Teacher ill",
    "classIds": ["66a2..."],
    "isDeleted": false
  },
  "message": "Substitute teacher recorded successfully"
}
```

---

### 2.22 List Substitute Assignments

**`GET /api/attendance/substitutes?schoolId=[&date=][&originalTeacherId=][&page=][&limit=]`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

Populated: `originalTeacherId`, `substituteTeacherId`, `approvedBy` (firstName, lastName, email), `classIds` (name). Sorted `-date`.

---

### 2.23 Get Single Substitute Assignment

**`GET /api/attendance/substitutes/:id`**

Auth: Bearer token — roles: `teacher`, `school_admin`, `super_admin`

Same population as list. 404 if not found.

---

### 2.24 Update Substitute Assignment

**`PUT /api/attendance/substitutes/:id`**

Auth: Bearer token — roles: `school_admin`, `super_admin`

Body: any subset of `createSubstituteSchema` fields (all optional via `.partial()`). 404 if not found.

---

### 2.25 Delete Substitute Assignment

**`DELETE /api/attendance/substitutes/:id`**

Auth: Bearer token — roles: `school_admin`, `super_admin`

Soft-delete.

---

## 3. Frontend Pages

### 3.1 Teacher — Take Attendance

**Route:** `/teacher/attendance`
**File:** `src/app/(dashboard)/teacher/attendance/page.tsx`
**Status:** Wired to live API

The page lets a teacher take a class register for a given period. On mount it fetches `/students` and `/academic/classes` in parallel via `Promise.allSettled`. The teacher selects a class from a dropdown and a period (1–6) from a second dropdown. All students whose `classId` matches the selected class are displayed.

The register table has three checkbox columns per student: **Present**, **Absent**, **Late**. Checkboxes behave as mutually exclusive radio buttons (selecting one clears the others). The default status for each student is `present`.

A live summary bar above the table counts Present / Absent / Late as statuses change. On submit, the page calls `POST /api/attendance/bulk` with the full class list. After a successful save, the button is disabled and a success message appears.

Current gaps that need addressing:
- The `schoolId` field is missing from the bulk submit payload (the API requires it).
- The `date` sent is `new Date().toISOString().split('T')[0]` (a date-only string) rather than a full ISO 8601 datetime that the Zod schema expects.
- The `excused` status is not exposed in the UI, though the backend supports it.
- There is no ability to add per-student notes.
- Attendance is always recorded for today — there is no date picker for retroactive entry.

---

### 3.2 Admin — Attendance Overview

**Route:** `/admin/attendance`
**File:** `src/app/(dashboard)/admin/attendance/page.tsx`
**Status:** Mock data only — not yet wired to API

Displays three stat cards (Overall Attendance Rate, Total Absences, Late Arrivals) derived from `mockAdminStats` and `mockAttendance`. A bar chart shows attendance rate by grade using `mockAttendanceByGrade`. A list of recent absences and late arrivals is rendered below, showing student name, grade/class, date, and a colour-coded status badge.

The page needs to be wired to:
- `GET /api/attendance/daily/:date` for the school-wide summary (replaces stat cards)
- `GET /api/attendance/absentees` for the recent absences list (replaces mock attendance list)

---

### 3.3 Parent — Child Attendance

**Route:** `/parent/attendance`
**File:** `src/app/(dashboard)/parent/attendance/page.tsx`
**Status:** Mock data only — not yet wired to API

Shows a tabbed view with one tab per child (using `mockStudents.slice(0, 2)`). Each tab contains:

1. **Five stat cards** — Total Days, Present, Absent, Late, Attendance Rate (with qualitative label: Excellent / Good / Needs improvement based on percentage thresholds 90% and 75%).
2. **Monthly calendar** — a 7-column grid hardcoded to March 2025 with colour-coded day cells (present=green, absent=red, late=amber, excused=blue). Weekends are muted. Each cell shows the status initial (P/A/L/E).
3. **DataTable** — full attendance history with columns: Date (formatted), Status (badge), Period, Note.

Needs to be wired to `GET /api/attendance/student/:studentId` with a configurable date range. The calendar needs to be made dynamic (current month, not hardcoded March 2025).

---

## 4. User Flows

### 4.1 Teacher Takes Daily Register

1. Teacher navigates to `/teacher/attendance`.
2. Page loads — classes dropdown is populated from `GET /academic/classes`.
3. Teacher selects their class and the current period.
4. The student list for that class is filtered from the fetched students array.
5. All students default to **Present**. Teacher clicks **Absent** or **Late** checkboxes for exceptions.
6. Live counters update as statuses are toggled.
7. Teacher clicks **Submit Attendance**.
8. Frontend calls `POST /api/attendance/bulk` with the full class roster and statuses.
9. On success, the submit button becomes disabled and a green confirmation message appears.
10. If the API call fails, a `sonner` toast error fires: "Failed to save attendance".
11. The teacher can change the period selection and repeat for the next period.

---

### 4.2 Teacher Marks a Late Arrival Mid-Period

1. Teacher navigates to `/teacher/attendance`, selects class and period.
2. The student in question was previously recorded as absent (or the bulk record was already submitted).
3. Teacher changes the student's status to **Late** and optionally adds an `arrivalTime`.
4. Teacher resubmits — the upsert behaviour on the backend overwrites the earlier record.
5. Parent is (in future) notified via the Notification module that the student arrived late.

---

### 4.3 Admin Views School-Wide Absentees

1. Admin navigates to `/admin/attendance`.
2. Page calls `GET /api/attendance/daily/:date` (today's date, schoolId from JWT).
3. Per-class summaries are displayed in the bar chart.
4. Page also calls `GET /api/attendance/absentees?date=<today>` to list individual absent students.
5. Admin can filter by period using the `period` query param.
6. Admin can drill into a student's record to view their full history via `GET /api/attendance/student/:studentId`.

---

### 4.4 Admin Reviews Attendance Report

1. Admin selects a date range.
2. Frontend calls `GET /api/attendance/report?startDate=&endDate=` optionally scoped to a class or student.
3. The response `AttendanceStats` object is displayed as summary figures.
4. Admin can export or drill down by class.

---

### 4.5 Parent Views Child's Attendance

1. Parent navigates to `/parent/attendance`.
2. Page calls `GET /api/attendance/student/:studentId` for each child with a one-month date range.
3. Summary stats are computed client-side from the returned records array.
4. Monthly calendar shows colour-coded day cells.
5. DataTable below lists every attendance record in detail.
6. Parent can switch between children using the tab bar.
7. Parent sees the `verifiedByParent` field status. In future the parent can verify absence reasons via a call to `PUT /api/attendance/discipline/:id` (or a dedicated endpoint).

---

### 4.6 Admin Creates and Manages a Discipline Incident

1. Admin or teacher navigates to a discipline section (to be built).
2. Selects the student and fills the incident form.
3. Calls `POST /api/attendance/discipline`.
4. Record is created with `status: "reported"`.
5. Admin updates the record as the investigation progresses: `PUT /api/attendance/discipline/:id` with `status: "investigating"` then `"resolved"`.
6. Parent notification flags (`parentNotified`, `parentNotifiedDate`, `meetingScheduled`, `meetingDate`) are updated on the same endpoint.
7. If `outcome: "detention"`, a `detentionDate` is set and later `detentionServed: true` is patched.

---

### 4.7 Admin Assigns a Substitute Teacher

1. Admin navigates to the substitute management section.
2. Selects the absent teacher, the substitute, affected classes, date, and periods.
3. Calls `POST /api/attendance/substitutes`.
4. Substitute teacher sees the assignment in their schedule.
5. Admin can later update or delete via `PUT` / `DELETE /api/attendance/substitutes/:id`.

---

## 5. Data Models

### 5.1 Attendance

```typescript
interface IAttendance {
  _id: ObjectId;
  studentId: ObjectId;          // ref: Student
  schoolId: ObjectId;           // ref: School
  classId: ObjectId;            // ref: Class
  date: Date;
  period: number;               // positive integer (1–6 typical)
  status: 'present' | 'absent' | 'late' | 'excused';
  recordedBy: ObjectId;         // ref: User (teacher who submitted)
  notes?: string;
  earlyDeparture: boolean;      // default false
  reason?: string;              // reason for absence/late/early departure
  verifiedByParent: boolean;    // default false
  arrivalTime?: string;         // e.g. "08:22" (free text)
  departureTime?: string;
  isDeleted: boolean;           // soft-delete flag
  createdAt: Date;
  updatedAt: Date;
}
```

**Unique index:** `{ studentId, date, period }` — prevents duplicate entries and drives the upsert key.
**Indexes:** `{ classId, date }`, `{ schoolId, date }`.

---

### 5.2 Discipline

```typescript
type IncidentType = 'misconduct' | 'bullying' | 'vandalism' | 'truancy' | 'dress_code' | 'late' | 'other';
type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical';
type IncidentOutcome = 'warning' | 'detention' | 'suspension' | 'expulsion' | 'counselling' | 'community_service';
type IncidentStatus = 'reported' | 'investigating' | 'resolved' | 'escalated';

interface IDiscipline {
  _id: ObjectId;
  studentId: ObjectId;          // ref: Student
  schoolId: ObjectId;           // ref: School
  reportedBy: ObjectId;         // ref: User (set server-side)
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  witnesses: string[];          // default []
  actionTaken?: string;
  parentNotified: boolean;      // default false
  parentNotifiedDate?: Date;
  meetingScheduled: boolean;    // default false
  meetingDate?: Date;
  outcome?: IncidentOutcome;
  detentionDate?: Date;
  detentionServed: boolean;     // default false
  followUpRequired: boolean;    // default false
  followUpDate?: Date;
  followUpNotes?: string;
  status: IncidentStatus;       // default 'reported'
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ studentId, schoolId }`, `{ schoolId, status }`, `{ schoolId, type }`.

---

### 5.3 Merit / Demerit

```typescript
type MeritType = 'merit' | 'demerit';
type MeritCategory = 'academic' | 'behaviour' | 'sport' | 'service' | 'leadership';

interface IMerit {
  _id: ObjectId;
  studentId: ObjectId;          // ref: Student
  schoolId: ObjectId;           // ref: School
  awardedBy: ObjectId;          // ref: User (set server-side)
  type: MeritType;
  points: number;               // positive integer
  category: MeritCategory;
  reason: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Balance shape returned by `getStudentMeritBalance`:**
```typescript
{ meritPoints: number; demeritPoints: number; netPoints: number }
```

**Indexes:** `{ studentId, schoolId }`, `{ schoolId, type }`.

---

### 5.4 Lesson Plan

```typescript
interface ILessonPlan {
  _id: ObjectId;
  teacherId: ObjectId;          // ref: User (set server-side)
  schoolId: ObjectId;           // ref: School
  subjectId: ObjectId;          // ref: Subject
  classId: ObjectId;            // ref: Class
  date: Date;
  topic: string;
  objectives: string[];         // default []
  activities: string[];         // default []
  resources: string[];          // default []
  homework?: string;
  reflectionNotes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ teacherId, date }`, `{ schoolId, classId, date }`.

---

### 5.5 Substitute Teacher

```typescript
interface ISubstituteTeacher {
  _id: ObjectId;
  originalTeacherId: ObjectId;    // ref: User
  substituteTeacherId: ObjectId;  // ref: User
  schoolId: ObjectId;             // ref: School
  date: Date;
  periods: number[];              // e.g. [3, 4]
  reason: string;
  classIds: ObjectId[];           // ref: Class[]
  approvedBy?: ObjectId;          // ref: User — patched separately
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ schoolId, date }`, `{ originalTeacherId, date }`.

---

### 5.6 Frontend Attendance Type

The frontend `src/types/index.ts` defines a slimmer read-model used in mock data and parent view tables:

```typescript
interface Attendance {
  id: string;
  studentId: string;
  student: Student;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  period?: number;
  note?: string;
  markedById: string;
  markedBy: User;
}
```

This differs from the backend document — notably `note` vs `notes`, no `schoolId`, no `classId`, and `markedBy` vs `recordedBy`. A mapper or normalised API response layer will be needed when wiring up parent and admin pages.

---

## 6. State Management

### 6.1 Current State

No dedicated attendance Zustand store exists. The teacher attendance page uses local `useState` only:
- `selectedClass: string`
- `selectedPeriod: string`
- `attendance: StudentAttendance[]` — local array of `{ studentId, status }` overrides
- `saved: boolean` — tracks whether the current register has been submitted
- `students: Student[]` — fetched on mount
- `classes: SchoolClass[]` — fetched on mount

Auth context is read from `useAuthStore` to access `user`.

### 6.2 Attendance Store (To Be Built)

A `useAttendanceStore` should be created at `src/stores/useAttendanceStore.ts`.

```typescript
interface AttendanceStore {
  // Attendance register state
  register: Record<string, AttendanceStatus>; // keyed by studentId
  selectedClassId: string | null;
  selectedPeriod: number;
  registerDate: string;                        // ISO date string
  isSaving: boolean;
  lastSavedAt: Date | null;

  // Fetched data
  classAttendance: IAttendance[];
  studentAttendance: IAttendance[];
  absentees: IAttendance[];
  dailyReport: DailyClassSummary[];
  report: AttendanceStats | null;

  // Discipline
  disciplineRecords: IDiscipline[];
  disciplineTotal: number;
  disciplinePage: number;

  // Merits
  meritRecords: IMerit[];
  meritBalance: { meritPoints: number; demeritPoints: number; netPoints: number } | null;

  // Lesson plans
  lessonPlans: ILessonPlan[];

  // Substitutes
  substitutes: ISubstituteTeacher[];

  // Actions
  setRegisterStatus: (studentId: string, status: AttendanceStatus) => void;
  setSelectedClass: (classId: string) => void;
  setSelectedPeriod: (period: number) => void;
  setRegisterDate: (date: string) => void;
  markAllPresent: () => void;

  // Async actions
  fetchClassAttendance: (classId: string, date: string) => Promise<void>;
  fetchStudentAttendance: (studentId: string, startDate: string, endDate: string) => Promise<void>;
  fetchAbsentees: (schoolId: string, date: string, period?: number) => Promise<void>;
  fetchDailyReport: (schoolId: string, date: string) => Promise<void>;
  fetchReport: (filters: AttendanceReportFilters) => Promise<void>;
  submitBulkAttendance: (schoolId: string) => Promise<void>;

  fetchDiscipline: (schoolId: string, filters?: object) => Promise<void>;
  fetchMeritBalance: (studentId: string, schoolId: string) => Promise<void>;
  fetchLessonPlans: (filters: object) => Promise<void>;
  fetchSubstitutes: (schoolId: string, filters?: object) => Promise<void>;
}
```

### 6.3 API Client Calls

All calls go through `src/lib/api-client.ts` (Axios instance with auth interceptor):

| Store action | API call |
|---|---|
| `submitBulkAttendance` | `POST /attendance/bulk` |
| `fetchClassAttendance` | `GET /attendance/class/:classId?date=` |
| `fetchStudentAttendance` | `GET /attendance/student/:studentId?startDate=&endDate=` |
| `fetchAbsentees` | `GET /attendance/absentees?date=&schoolId=` |
| `fetchDailyReport` | `GET /attendance/daily/:date?schoolId=` |
| `fetchReport` | `GET /attendance/report?startDate=&endDate=` |
| `fetchDiscipline` | `GET /attendance/discipline?schoolId=` |
| `createDiscipline` | `POST /attendance/discipline` |
| `updateDiscipline` | `PUT /attendance/discipline/:id` |
| `deleteDiscipline` | `DELETE /attendance/discipline/:id` |
| `createMerit` | `POST /attendance/merits` |
| `fetchMerits` | `GET /attendance/merits?schoolId=` |
| `fetchMeritBalance` | `GET /attendance/merits/balance/:studentId?schoolId=` |
| `createLessonPlan` | `POST /attendance/lesson-plans` |
| `fetchLessonPlans` | `GET /attendance/lesson-plans` |
| `updateLessonPlan` | `PUT /attendance/lesson-plans/:id` |
| `deleteLessonPlan` | `DELETE /attendance/lesson-plans/:id` |
| `createSubstitute` | `POST /attendance/substitutes` |
| `fetchSubstitutes` | `GET /attendance/substitutes?schoolId=` |
| `updateSubstitute` | `PUT /attendance/substitutes/:id` |
| `deleteSubstitute` | `DELETE /attendance/substitutes/:id` |

---

## 7. Components Needed

### 7.1 Shared / Generic

| Component | Path | Description |
|---|---|---|
| `AttendanceStatusBadge` | `components/attendance/AttendanceStatusBadge.tsx` | Renders a colour-coded badge for `present` / `absent` / `late` / `excused`. Reusable across all three portals. |
| `AttendanceCalendar` | `components/attendance/AttendanceCalendar.tsx` | Monthly grid calendar. Accepts `records: Attendance[]`, `month: Date`. Renders colour-coded day cells with status initials. Replaces the hardcoded March 2025 calendar in the parent page. |
| `AttendanceSummaryStats` | `components/attendance/AttendanceSummaryStats.tsx` | Five-stat summary row (Total, Present, Absent, Late, Rate). Accepts an `AttendanceStats` object or a `records` array and computes locally. |

### 7.2 Teacher Portal

| Component | Path | Description |
|---|---|---|
| `AttendanceRegister` | `components/attendance/AttendanceRegister.tsx` | Container that houses the class/period selector bar and the student roster table. Drives the bulk submit flow. |
| `StudentAttendanceRow` | `components/attendance/StudentAttendanceRow.tsx` | Single row in the register table. Displays student name, admission number, and three mutually exclusive status checkboxes (Present / Absent / Late). Optionally renders a notes text input (currently absent from the page). |
| `PeriodSelector` | `components/attendance/PeriodSelector.tsx` | Dropdown for selecting period 1–6. Could also be driven by data from the timetable module in future. |
| `AttendanceRegisterToolbar` | `components/attendance/AttendanceRegisterToolbar.tsx` | Top bar showing today's date, class selector, period selector, and a "Mark All Present" bulk action button. |

### 7.3 Admin Portal

| Component | Path | Description |
|---|---|---|
| `DailyAttendanceSummaryChart` | `components/attendance/DailyAttendanceSummaryChart.tsx` | Bar chart showing per-class present/absent/late breakdown for a selected date. Wraps `BarChartComponent`. Replaces `mockAttendanceByGrade`. |
| `AbsenteeList` | `components/attendance/AbsenteeList.tsx` | List of absent/late students for a given date with student name, class, period, and status badge. Links to student profile. |
| `AttendanceReportFilters` | `components/attendance/AttendanceReportFilters.tsx` | Date range picker, class selector, and optional student selector that drive the report query. |
| `DisciplineTable` | `components/attendance/DisciplineTable.tsx` | Paginated `DataTable` of discipline incidents with type, severity, student name, status badge, and actions. |
| `DisciplineForm` | `components/attendance/DisciplineForm.tsx` | Modal form for creating/updating a discipline incident. All fields from `createDisciplineSchema`. |
| `SubstituteTable` | `components/attendance/SubstituteTable.tsx` | Table of substitute assignments for a date range. |
| `SubstituteForm` | `components/attendance/SubstituteForm.tsx` | Modal form for assigning a substitute teacher. |
| `LessonPlanTable` | `components/attendance/LessonPlanTable.tsx` | Table of lesson plans filterable by class, subject, teacher, date. |
| `LessonPlanForm` | `components/attendance/LessonPlanForm.tsx` | Form for creating/updating a lesson plan. |

### 7.4 Parent Portal

| Component | Path | Description |
|---|---|---|
| `ChildAttendanceTab` | `components/attendance/ChildAttendanceTab.tsx` | The full per-child attendance view: summary stats, calendar, and history table. Extracted from `parent/attendance/page.tsx`. |
| `AttendanceHistoryTable` | `components/attendance/AttendanceHistoryTable.tsx` | `DataTable` wrapper with columns: Date, Status badge, Period, Note. Used in the parent portal. |
| `MeritBalanceCard` | `components/attendance/MeritBalanceCard.tsx` | Shows merit/demerit/net points for a student. Calls `GET /attendance/merits/balance/:studentId`. |

---

## 8. Integration Notes

### 8.1 Student Module

- Attendance records reference `studentId` (ObjectId to the Student collection).
- The teacher page fetches `GET /students` and filters client-side by `classId`. This is inefficient at scale — `GET /attendance/class/:classId?date=` already returns populated student data and should be used as the primary data source once the page is wired.
- The parent portal uses `GET /attendance/student/:studentId`, which is the correct per-student endpoint.
- Student `admissionNumber` is rendered in the teacher register row.

### 8.2 Academic Module (Classes & Subjects)

- Attendance records reference `classId` (ObjectId to the Class collection).
- Lesson plans reference both `classId` and `subjectId`.
- The teacher page fetches `GET /academic/classes` to populate the class dropdown.
- The `PeriodSelector` is currently hardcoded to 1–6. In future it should derive available periods from the timetable (`GET /academic/timetable`) to prevent recording attendance for periods that don't exist for a given class.
- `getDailyReport` does a `$lookup` join against the `classes` collection to resolve class names.

### 8.3 Notification Module

The backend does **not yet** emit notifications automatically on attendance events. Integration points that need to be added:

| Trigger | Notification |
|---|---|
| Student recorded as `absent` | Push/SMS/email to linked parent(s) |
| Student recorded as `late` | Optional push to parent |
| Discipline record created with `severity: "serious"` or `"critical"` | Email to school admin + parent |
| `parentNotified: true` set on Discipline | Log notification event |
| Detention date set | Calendar notification to student/parent |

Until the Notification module adds these hooks, parents can only view attendance reactively via the `/parent/attendance` page.

### 8.4 Auth / RBAC

- `GET /attendance/student/:studentId` has no `authorize` guard — any authenticated user can call it. For production, this should be gated so that parents can only retrieve their own child's records (check `parent.childIds` against `studentId`).
- `DELETE /discipline/:id` is restricted to `school_admin` / `super_admin` — teachers cannot delete discipline records they created, only update them.
- `POST /substitutes` and write operations on substitutes are admin-only; teachers can only read.

### 8.5 Dashboard / Admin Home

The admin dashboard page (`/admin/page.tsx`) will want to call `GET /attendance/daily/:date` to show today's school-wide attendance summary widget. This should use the same `DailyAttendanceSummaryChart` component described in Section 7.3.

---

## 9. Acceptance Criteria

### 9.1 Teacher — Take Attendance

- [ ] Teacher can select any class they are assigned to from the dropdown.
- [ ] Teacher can select a period (1–6).
- [ ] Student list updates when class selection changes.
- [ ] Each student defaults to **Present** on page load.
- [ ] Selecting Absent or Late deselects the other two checkboxes (mutually exclusive).
- [ ] Summary counts (Present / Absent / Late) update in real time as statuses change.
- [ ] "Submit Attendance" button calls `POST /api/attendance/bulk` with a valid ISO 8601 `date`, correct `schoolId`, `classId`, `period`, and full `records` array.
- [ ] Successful submit disables the button and shows a success confirmation.
- [ ] Failed submit shows a `sonner` toast error.
- [ ] Switching periods after a successful save resets `saved` state and re-enables the submit button.
- [ ] Resubmitting the same class/date/period overwrites the previous record (upsert).

### 9.2 Admin — Attendance Overview

- [ ] Page fetches `GET /attendance/daily/:date` for today's date on mount; schoolId is sourced from the authenticated user's JWT.
- [ ] Bar chart displays per-class present/absent/late breakdown from live data (no mock data in production).
- [ ] Absentee list fetches from `GET /attendance/absentees?date=<today>`.
- [ ] Stat cards show Overall Rate (average across returned classes), Total Absences, and Total Late Arrivals computed from live data.
- [ ] Admin can change the date to view historical daily reports.
- [ ] Admin can click a student row to navigate to that student's full attendance history.

### 9.3 Parent — Child Attendance

- [ ] Page fetches attendance records for each child via `GET /attendance/student/:studentId` for the current month on mount.
- [ ] Switching between children tabs triggers a fetch for the selected child.
- [ ] Attendance calendar renders the current month dynamically (not hardcoded March 2025).
- [ ] All four statuses (present / absent / late / excused) are colour-coded correctly.
- [ ] Summary stats compute correctly from the live API response.
- [ ] DataTable shows all records with correct Date, Status badge, Period, and Note columns.
- [ ] If a child has no records, an EmptyState component is shown.
- [ ] Attendance rate label shows "Excellent" for ≥90%, "Good" for ≥75%, "Needs improvement" for <75%.

### 9.4 Discipline Module (Admin)

- [ ] Admin can create a discipline record via the discipline form.
- [ ] Form validates all required fields (studentId, type, severity, description).
- [ ] Discipline list is paginated and filterable by status and type.
- [ ] Admin can update a record's status through the full lifecycle: reported → investigating → resolved / escalated.
- [ ] Admin can set `parentNotified`, `meetingScheduled`, and `outcome` fields.
- [ ] Admin-only: delete discipline record (soft-delete); teachers see no delete button.
- [ ] Deleted records do not appear in the list.

### 9.5 Merits & Demerits

- [ ] Teacher can award a merit or demerit to a student with points, category, and reason.
- [ ] Merit balance card shows correct meritPoints, demeritPoints, netPoints.
- [ ] List is filterable by type (merit/demerit) and category.

### 9.6 Lesson Plans

- [ ] Teacher can create a lesson plan linked to class, subject, and date.
- [ ] Topic is required; objectives, activities, resources, homework, and reflection notes are optional.
- [ ] Teacher can edit and delete their own plans.
- [ ] Admin can view all lesson plans across the school.

### 9.7 Substitute Teachers

- [ ] Admin can assign a substitute for one or more periods on a given date.
- [ ] Both originalTeacherId and substituteTeacherId must be valid staff users.
- [ ] At least one classId and one period are required.
- [ ] Substitute list is filterable by date and by original teacher.
- [ ] Admin can update or delete a substitute assignment.

### 9.8 General / Cross-Cutting

- [ ] All API calls include the `Authorization: Bearer <token>` header.
- [ ] Unauthenticated requests receive a 401 response; the frontend redirects to `/login`.
- [ ] Role violations return a 403 response; the frontend shows an appropriate error.
- [ ] All forms show field-level validation errors from Zod before hitting the API.
- [ ] Soft-deleted records never appear in any list or search result.
- [ ] The unique index `{ studentId, date, period }` means submitting a register twice is safe (idempotent upsert) — the second submission overwrites the first without creating a duplicate.
