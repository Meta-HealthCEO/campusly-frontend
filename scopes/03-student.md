# 03 — Student Module

## 1. Module Overview

The Student module is the central entity of the Campusly platform. Every other module — attendance, fees, grades, homework, wallet, tuckshop, transport, library, achievements — links back to a student record. A student is a thin profile layer that sits on top of a `User` account and enriches it with school-specific data: admission number, grade/class placement, guardian links, enrollment status, and a medical profile.

The module serves three distinct portal contexts:

- **Admin portal** — enrol, search, view, edit, archive students; view cross-module profile tabs (personal, academic, financial, attendance).
- **Teacher portal** — read-only list access for class/attendance management (no create/edit).
- **Student portal** — self-service dashboard plus dedicated sub-pages for grades, homework, wallet, timetable, achievements, and library.

Soft-delete (`isDeleted: true`) is used throughout — no student record is permanently removed via the API.

---

## 2. Backend API Endpoints

Base path: `/api/students` (mounted at the Express router level)

All endpoints require a valid JWT Bearer token (`authenticate` middleware). Role requirements are per-endpoint.

---

### POST /api/students

Create a new student record.

**Auth:** `super_admin`, `school_admin`

**Request body** (validated by `createStudentSchema`):

| Field | Type | Required | Validation |
|---|---|---|---|
| `userId` | string (ObjectId) | Yes | 24-char hex |
| `schoolId` | string (ObjectId) | Yes | 24-char hex |
| `gradeId` | string (ObjectId) | Yes | 24-char hex |
| `classId` | string (ObjectId) | Yes | 24-char hex |
| `admissionNumber` | string | Yes | min length 1 |
| `guardianIds` | string[] (ObjectId[]) | No | array of 24-char hex |
| `enrollmentDate` | string (ISO datetime) | No | valid datetime string |
| `enrollmentStatus` | string | No | enum: `active`, `transferred`, `graduated`, `expelled`, `withdrawn` |
| `medicalProfile` | object | No | see medicalProfile shape below |
| `dateOfBirth` | string (ISO datetime) | No | valid datetime string |
| `gender` | string | No | enum: `male`, `female`, `other` |
| `previousSchool` | string | No | trimmed |
| `homeLanguage` | string | No | trimmed |
| `additionalLanguages` | string[] | No | |
| `transportRequired` | boolean | No | |
| `afterCareRequired` | boolean | No | |
| `saIdNumber` | string | No | trimmed |
| `luritsNumber` | string | No | trimmed |

**medicalProfile object shape:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `allergies` | string[] | No | defaults to `[]` |
| `conditions` | string[] | No | defaults to `[]` |
| `bloodType` | string | No | |
| `emergencyContacts` | array of emergencyContact | No | |
| `medicalAidInfo` | object | No | see below |

**emergencyContact shape:** `{ name: string, relationship: string, phone: string }` — all fields required if object is present.

**medicalAidInfo shape:** `{ provider: string, memberNumber: string, mainMember: string }` — all fields required if object is present.

**Example request body:**
```json
{
  "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "schoolId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "gradeId": "64f1a2b3c4d5e6f7a8b9c0d3",
  "classId": "64f1a2b3c4d5e6f7a8b9c0d4",
  "admissionNumber": "2026-001",
  "guardianIds": ["64f1a2b3c4d5e6f7a8b9c0d5"],
  "enrollmentDate": "2026-01-15T00:00:00.000Z",
  "enrollmentStatus": "active",
  "dateOfBirth": "2015-03-22T00:00:00.000Z",
  "gender": "female",
  "homeLanguage": "Zulu",
  "transportRequired": false,
  "afterCareRequired": true,
  "medicalProfile": {
    "allergies": ["peanuts"],
    "conditions": [],
    "bloodType": "A+",
    "emergencyContacts": [
      { "name": "Nomsa Dlamini", "relationship": "Mother", "phone": "+27821234567" }
    ]
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "gradeId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "classId": "64f1a2b3c4d5e6f7a8b9c0d4",
    "admissionNumber": "2026-001",
    "guardianIds": ["64f1a2b3c4d5e6f7a8b9c0d5"],
    "enrollmentDate": "2026-01-15T00:00:00.000Z",
    "enrollmentStatus": "active",
    "medicalProfile": {
      "allergies": ["peanuts"],
      "conditions": [],
      "bloodType": "A+",
      "emergencyContacts": [
        { "name": "Nomsa Dlamini", "relationship": "Mother", "phone": "+27821234567" }
      ]
    },
    "dateOfBirth": "2015-03-22T00:00:00.000Z",
    "gender": "female",
    "homeLanguage": "Zulu",
    "additionalLanguages": [],
    "transportRequired": false,
    "afterCareRequired": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Student created successfully"
}
```

---

### GET /api/students

List students for a school with pagination and optional search.

**Auth:** `super_admin`, `school_admin`, `teacher`

**Query parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `schoolId` | string | `req.user.schoolId` | Falls back to JWT claim if omitted |
| `page` | number | 1 | |
| `limit` | number | 20 | Max 100 |
| `sort` | string | `-createdAt` | Any Mongoose sort string |
| `search` | string | — | Searches `admissionNumber` (case-insensitive regex) |

Returns 400 if `schoolId` cannot be determined.

Populated fields: `userId` (firstName, lastName, email), `gradeId` (full Grade doc), `classId` (full Class doc).

**Example request:** `GET /api/students?schoolId=64f...d2&page=1&limit=20&search=2026`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
        "admissionNumber": "2026-001",
        "userId": { "_id": "...", "firstName": "Lerato", "lastName": "Dlamini", "email": "lerato@school.co.za" },
        "gradeId": { "_id": "...", "name": "Grade 7" },
        "classId": { "_id": "...", "name": "7A" },
        "enrollmentStatus": "active",
        "isDeleted": false,
        "createdAt": "2026-01-15T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Students retrieved successfully"
}
```

**Note on search limitation:** The current service implementation searches only `admissionNumber` via regex. User name searches require a MongoDB aggregation pipeline (`$lookup`) that is not yet implemented — a comment in `service.ts` acknowledges this.

---

### GET /api/students/:id

Get a single student by their MongoDB `_id`.

**Auth:** Any authenticated user (no role restriction — `authenticate` only).

**Path param:** `id` — MongoDB ObjectId string.

Populated fields: `userId` (firstName, lastName, email, phone, profileImage), `gradeId`, `classId`, `guardianIds` with nested `userId` (firstName, lastName, email, phone).

Throws `NotFoundError` (404) if the student does not exist or `isDeleted: true`.

**Example request:** `GET /api/students/64f1a2b3c4d5e6f7a8b9c0d6`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
    "admissionNumber": "2026-001",
    "userId": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "firstName": "Lerato",
      "lastName": "Dlamini",
      "email": "lerato@school.co.za",
      "phone": "+27821234567",
      "profileImage": null
    },
    "gradeId": { "_id": "...", "name": "Grade 7" },
    "classId": { "_id": "...", "name": "7A" },
    "guardianIds": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
        "userId": { "_id": "...", "firstName": "Nomsa", "lastName": "Dlamini", "email": "nomsa@email.co.za", "phone": "+27821234567" }
      }
    ],
    "enrollmentStatus": "active",
    "enrollmentDate": "2026-01-15T00:00:00.000Z",
    "medicalProfile": {
      "allergies": ["peanuts"],
      "conditions": [],
      "bloodType": "A+",
      "emergencyContacts": [
        { "name": "Nomsa Dlamini", "relationship": "Mother", "phone": "+27821234567" }
      ]
    },
    "dateOfBirth": "2015-03-22T00:00:00.000Z",
    "gender": "female",
    "homeLanguage": "Zulu",
    "additionalLanguages": [],
    "transportRequired": false,
    "afterCareRequired": true,
    "saIdNumber": null,
    "luritsNumber": null,
    "isDeleted": false,
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-01-15T00:00:00.000Z"
  },
  "message": "Student retrieved successfully"
}
```

---

### PUT /api/students/:id

Update any field on a student record.

**Auth:** `super_admin`, `school_admin`

**Path param:** `id` — MongoDB ObjectId string.

**Request body** (validated by `updateStudentSchema` — all fields from `createStudentSchema` are optional):

Any subset of the `createStudentSchema` fields. Mongoose uses `$set` so only provided fields are modified.

**Example request body:**
```json
{
  "gradeId": "64f1a2b3c4d5e6f7a8b9c0d7",
  "classId": "64f1a2b3c4d5e6f7a8b9c0d8",
  "enrollmentStatus": "active",
  "afterCareRequired": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
    "admissionNumber": "2026-001",
    "userId": { "_id": "...", "firstName": "Lerato", "lastName": "Dlamini", "email": "lerato@school.co.za" },
    "gradeId": { "_id": "64f1a2b3c4d5e6f7a8b9c0d7", "name": "Grade 8" },
    "classId": { "_id": "64f1a2b3c4d5e6f7a8b9c0d8", "name": "8A" },
    "enrollmentStatus": "active",
    "afterCareRequired": false,
    "updatedAt": "2026-03-31T09:00:00.000Z"
  },
  "message": "Student updated successfully"
}
```

Throws `NotFoundError` (404) if student is not found or already deleted.

---

### DELETE /api/students/:id

Soft-delete a student (sets `isDeleted: true`).

**Auth:** `super_admin`, `school_admin`

**Path param:** `id` — MongoDB ObjectId string.

This is a **soft delete** — the document remains in MongoDB with `isDeleted: true`. All list queries and single-fetch queries filter on `isDeleted: false`.

**Example request:** `DELETE /api/students/64f1a2b3c4d5e6f7a8b9c0d6`

**Response (200):**
```json
{
  "success": true,
  "data": undefined,
  "message": "Student deleted successfully"
}
```

Throws `NotFoundError` (404) if student is already deleted or not found.

---

### PATCH /api/students/:id/medical

Replace the entire medical profile sub-document for a student.

**Auth:** `super_admin`, `school_admin`

**Path param:** `id` — MongoDB ObjectId string.

**Request body** (validated by `updateMedicalProfileSchema`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `allergies` | string[] | No | defaults to `[]` |
| `conditions` | string[] | No | defaults to `[]` |
| `bloodType` | string | No | |
| `emergencyContacts` | array of emergencyContact | No | defaults to `[]`; each needs `name`, `relationship`, `phone` |
| `medicalAidInfo` | object | No | needs `provider`, `memberNumber`, `mainMember` |

This replaces the whole `medicalProfile` sub-document using `$set: { medicalProfile: data }`.

**Example request body:**
```json
{
  "allergies": ["peanuts", "dairy"],
  "conditions": ["asthma"],
  "bloodType": "A+",
  "emergencyContacts": [
    { "name": "Nomsa Dlamini", "relationship": "Mother", "phone": "+27821234567" },
    { "name": "Sipho Dlamini", "relationship": "Father", "phone": "+27829876543" }
  ],
  "medicalAidInfo": {
    "provider": "Discovery Health",
    "memberNumber": "DH123456",
    "mainMember": "Nomsa Dlamini"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
    "medicalProfile": {
      "allergies": ["peanuts", "dairy"],
      "conditions": ["asthma"],
      "bloodType": "A+",
      "emergencyContacts": [
        { "name": "Nomsa Dlamini", "relationship": "Mother", "phone": "+27821234567" },
        { "name": "Sipho Dlamini", "relationship": "Father", "phone": "+27829876543" }
      ],
      "medicalAidInfo": {
        "provider": "Discovery Health",
        "memberNumber": "DH123456",
        "mainMember": "Nomsa Dlamini"
      }
    },
    "updatedAt": "2026-03-31T10:00:00.000Z"
  },
  "message": "Medical profile updated successfully"
}
```

---

## 3. Frontend Pages

### Admin Portal

---

#### `/admin/students`

**File:** `src/app/(dashboard)/admin/students/page.tsx`

**What it displays:**

A `DataTable` (searchable, sortable) of all students for the school. Columns:

| Column | Source field |
|---|---|
| Admission No | `admissionNumber` |
| Name | `user.firstName + user.lastName` (with fallback to root-level `firstName`/`lastName`) |
| Grade | `grade.name` (with fallback to `gradeName`) |
| Class | `class.name` (with fallback to `className`) |
| Status | `isActive` — shown as `Active` (emerald badge) or `Inactive` (red badge) |

**Buttons/Actions:**
- "Add Student" button (top-right) — links to `/admin/students/new`
- Table row is clickable/linked (inherits from `DataTable` component behavior)
- `searchKey="name"` enables client-side filtering by student name

**API calls:**
- `GET /students` on mount — no query params (school is resolved from JWT)

**State:** Local `useState` — `students: Student[]`, `loading: boolean`. No Zustand store yet.

---

#### `/admin/students/new`

**File:** `src/app/(dashboard)/admin/students/new/page.tsx`

**What it displays:**

A single card form for enrolling a new student.

**Form fields:**

| Field | Input type | Validation (frontend) |
|---|---|---|
| First Name | text input | min 2 chars |
| Last Name | text input | min 2 chars |
| Date of Birth | date input | required |
| Gender | select (male/female/other) | required |
| Grade | select (populated from `mockGrades`) | required |
| Class | select (filtered by selected grade, from `mockClasses`) | required; disabled until grade selected |
| Address | text input | min 5 chars |
| Parent / Guardian | select (populated from `mockParents`) | required |

**Validation:** Uses `react-hook-form` + `zodResolver` with `studentSchema` from `@/lib/validations`.

**Buttons/Actions:**
- "Cancel" — returns to `/admin/students`
- "Add Student" (submit) — currently logs to console and shows a toast; does **not yet call the API**

**Current gap:** The `onSubmit` handler calls `console.log` and `toast.success` but does not call `POST /students`. This is wired to mock data for grades, classes, and parents.

**API calls (current):** None — uses mock data. Intended: `POST /students`.

---

#### `/admin/students/[id]`

**File:** `src/app/(dashboard)/admin/students/[id]/page.tsx`

**What it displays:**

A full student profile page split into four tabs:

**Tab 1 — Personal:**
- Personal Information card: Full Name, Date of Birth, Gender, Address, Grade, Class, Enrolled date, House
- Medical Information card: Blood Type, Allergies, Conditions, Medications, Emergency Contact, Emergency Phone, Doctor Name, Doctor Phone

**Tab 2 — Academic:**
- Assessment Results list: Assessment name, subject, type on left; marks/totalMarks + percentage on right
- Empty state if no grades

**Tab 3 — Financial:**
- Invoices list: Invoice number, due date on left; total amount, balance due, status badge on right
- Status badge colours: paid=emerald, partial=yellow, overdue=red, sent=blue, draft/cancelled=gray
- Empty state if no invoices

**Tab 4 — Attendance:**
- Attendance Records list (last 20): Date on left, status badge (present/absent/late/excused) on right
- Empty state if no records

**Buttons/Actions:**
- "Back" button — returns to `/admin/students`
- No edit button exists yet on this page (edit flow not yet implemented as a dedicated page)

**Current state:** Uses `mockStudents`, `mockInvoices`, `mockAttendance`, `mockStudentGrades`. Needs to be wired to `GET /students/:id`, `GET /fees/invoices?studentId=`, `GET /attendance?studentId=`, `GET /academic/marks/student/:id`.

---

### Student Portal

---

#### `/student` (Student Dashboard)

**File:** `src/app/(dashboard)/student/page.tsx`

**What it displays:**

Four `StatCard` widgets:
- Homework Due (count of unsubmitted published homework)
- Today's Classes (count of Monday slots from timetable)
- Wallet Balance (from wallet record)
- House Points (from student's house)

Two side-by-side cards:
- Upcoming Homework — up to 3 pending items, each linking to `/student/homework/:id`
- Today's Classes — all Monday timetable slots with period, subject, room, start/end time

Recent Achievements card — earned badges with icon, name, points, category; links to `/student/achievements`.

**Current state:** Entirely mock-data driven. No API calls. Needs wiring to `/students`, `/homework`, `/wallets/student/:id`, timetable endpoints.

---

#### `/student/grades`

**File:** `src/app/(dashboard)/student/grades/page.tsx`

**What it displays:**
- Overall average percentage card (average across all subjects)
- Grid of subject cards, each showing: subject name, performance badge (Distinction ≥80%, Merit ≥60%, Pass ≥50%, Below Average <50%), large percentage with progress bar, breakdown of individual assessment results

**API calls (live, wired):**
1. `GET /students` — finds the student record matching the logged-in user's ID
2. `GET /academic/marks/student/:studentId` — fetches all grade/mark records
3. `GET /academic/subjects` — fetches subject list for grouping

Uses `useAuthStore` to get `user.id` for the student lookup.

---

#### `/student/homework`

**File:** `src/app/(dashboard)/student/homework/page.tsx`

**What it displays:**
- Grid of homework cards — title, subject, status badge (Submitted/Graded/Pending/Overdue), description excerpt, teacher name, due date
- Each card links to `/student/homework/:id`
- Only published homework shown

**Status logic:**
- If submission exists and is graded → `graded`
- If submission exists but not graded → `submitted`
- If no submission and past due date → `overdue`
- Otherwise → `pending`

**API calls (live, wired):**
1. `GET /students` — finds the current student
2. `GET /homework` — all homework (filtered to `status === 'published'` client-side)
3. `GET /homework/student/:studentId/submissions` — student's submissions

Uses `useAuthStore` for user ID.

---

#### `/student/homework/[id]`

**File:** `src/app/(dashboard)/student/homework/[id]/page.tsx`

**What it displays:**
- Homework details card: title, subject, teacher, due date, posted date, description, attachments
- Status badge: Submitted / Overdue / Pending
- Submission section — one of three states:
  - Existing submission: shows submitted content, submission date, grade percentage and feedback (if graded)
  - Freshly submitted (local state): success confirmation
  - Not submitted: textarea + "Submit Homework" button

**Actions:**
- Submit textarea content via `handleSubmit` — currently sets local `submitted` state to true; does **not yet call the API**
- Disables submission if past due date

**Current gap:** Submission does not call `POST /homework/:id/submit` or similar endpoint.

**Current state:** Uses `mockHomework`, `mockSubmissions`, `mockStudents`.

---

#### `/student/wallet`

**File:** `src/app/(dashboard)/student/wallet/page.tsx`

**What it displays:**
- Wallet card (blue gradient): Available Balance, Daily Limit, Wristband ID (if set)
- Two tabs:
  - **Transaction History** — list of transactions with icon (topup=green arrow up, purchase=red arrow down, refund=blue rotate), description, timestamp, amount (coloured), running balance
  - **Tuck Shop Menu** — grid of available tuck shop items, each with name, category badge, price, allergen badges

**API calls (live, wired):**
1. `GET /students` — finds current student
2. `GET /wallets/student/:studentId` — wallet record
3. `GET /wallets/:walletId/transactions` — transaction history
4. `GET /tuck-shop/menu` — available menu items

Uses `useAuthStore` for user ID.

---

#### `/student/timetable`

**File:** `src/app/(dashboard)/student/timetable/page.tsx`

**What it displays:**
- Desktop: full weekly grid table — rows = periods 1–6, columns = Mon–Fri. Each cell shows subject name and room with colour-coded background per subject.
- Mobile: day-by-day card list with period badge, subject, room, and time range.
- Free periods shown as dashed "Free" cells.

**Current state:** Entirely mock-data driven (`mockTimetable`, `mockSubjects`). No API calls.

---

#### `/student/achievements`

**File:** `src/app/(dashboard)/student/achievements/page.tsx`

**What it displays:**
- House Points card: house name, motto, total points; plus 4-house leaderboard comparison grid ranked by points.
- Earned Badges grid: icon, name, description, points, awarded date.
- Available to Earn section: unearned achievements shown greyed out with dashed border.
- Top Students leaderboard (top 5): rank, name, house, total achievement points; current student highlighted.

**Current state:** Entirely mock-data driven (`mockAchievements`, `mockStudentAchievements`, `mockStudents`, `mockHouses`). No API calls.

---

#### `/student/library`

**File:** `src/app/(dashboard)/student/library/page.tsx`

**What it displays:**
- Reading Challenge progress bar: books returned this term vs goal of 10.
- Two tabs:
  - **Currently Borrowed** — cards showing book title, author, due date, status badge (Borrowed or Overdue).
  - **Browse Catalogue** — grid of all library books with title, author, category badge, shelf location, available copies badge.

**Current state:** Entirely mock-data driven (`mockBooks`, `mockBorrowings`, `mockStudents`). No API calls.

---

## 4. User Flows

### Enrol a Student

1. Admin navigates to `/admin/students`.
2. Clicks "Add Student" button — navigates to `/admin/students/new`.
3. Fills in: First Name, Last Name, Date of Birth, Gender.
4. Selects Grade — Class dropdown populates filtered classes.
5. Selects Class, enters Address, selects Parent/Guardian.
6. Clicks "Add Student" — form validates via zod.
7. On success: `POST /api/students` is called (pending wire-up), toast fires, user is redirected to `/admin/students`.
8. New student appears in the students table.

### View Student Profile

1. Admin navigates to `/admin/students`.
2. Locates student in the data table (search by name or admission number).
3. Clicks on a row — navigates to `/admin/students/:id`.
4. Page fetches student via `GET /api/students/:id` (pending wire-up; currently mock).
5. Admin can switch between Personal, Academic, Financial, and Attendance tabs to see cross-module data.

### Edit a Student

1. Admin is on `/admin/students/:id`.
2. **No edit button exists yet** — this flow is pending implementation. The intended approach is:
   - An "Edit" button on the profile page navigates to `/admin/students/:id/edit` (not yet built) or opens an edit modal.
   - The form pre-populates from the existing student data.
   - On submit, calls `PUT /api/students/:id` with changed fields.
   - On success, redirects back to profile or stays with updated data.

### Delete / Archive a Student

1. Admin is on `/admin/students` or `/admin/students/:id`.
2. **No delete button exists on the UI yet** — this flow is pending implementation. The intended approach is:
   - A "Delete" or "Archive" action (button or dropdown menu) triggers a confirmation dialog.
   - On confirm, calls `DELETE /api/students/:id`.
   - The backend sets `isDeleted: true` (soft delete).
   - Student disappears from list (all queries filter `isDeleted: false`).
   - The student's data in attendance, fees, grades, etc. is preserved.

### Student Views Their Dashboard

1. Student logs in — JWT role is `student`.
2. Navigated to `/student` — dashboard loads stat cards (homework due, classes, wallet balance, house points).
3. Clicks "View all" on Upcoming Homework → goes to `/student/homework`.
4. Clicks a homework card → goes to `/student/homework/:id` to view and submit.
5. Clicks "Full timetable" → goes to `/student/timetable`.
6. Clicks "View all" on Recent Achievements → goes to `/student/achievements`.
7. Side navigation also links to `/student/grades`, `/student/wallet`, `/student/library`.

### Student Submits Homework

1. Student navigates to `/student/homework`.
2. Finds a "Pending" homework card and clicks it.
3. On `/student/homework/:id`, reads description, checks due date.
4. Enters answer in the textarea.
5. Clicks "Submit Homework".
6. Confirmation screen appears. (API call to submit endpoint pending wire-up.)

---

## 5. Data Models

### Backend Mongoose Schema (`Student`)

```typescript
// Sub-schemas
IEmergencyContact {
  name: String (required)
  relationship: String (required)
  phone: String (required)
}

IMedicalAidInfo {
  provider: String (required)
  memberNumber: String (required)
  mainMember: String (required)
}

IMedicalProfile {
  allergies: [String] (default: [])
  conditions: [String] (default: [])
  bloodType: String (optional)
  emergencyContacts: [IEmergencyContact] (default: [])
  medicalAidInfo: IMedicalAidInfo (optional)
}

// Main schema
IStudent extends Document {
  userId: ObjectId (ref: 'User', required)
  schoolId: ObjectId (ref: 'School', required)
  gradeId: ObjectId (ref: 'Grade', required)
  classId: ObjectId (ref: 'Class', required)
  admissionNumber: String (required, trimmed)
  guardianIds: [ObjectId] (ref: 'Parent', default: [])
  enrollmentDate: Date (default: now)
  enrollmentStatus: 'active' | 'transferred' | 'graduated' | 'expelled' | 'withdrawn' (default: 'active')
  medicalProfile: IMedicalProfile (default: { allergies: [], conditions: [], emergencyContacts: [] })
  dateOfBirth: Date (optional)
  gender: 'male' | 'female' | 'other' (optional)
  previousSchool: String (optional, trimmed)
  homeLanguage: String (optional, trimmed)
  additionalLanguages: [String] (default: [])
  transportRequired: Boolean (default: false)
  afterCareRequired: Boolean (default: false)
  saIdNumber: String (optional, trimmed)
  luritsNumber: String (optional, trimmed)
  isDeleted: Boolean (default: false)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

**Indexes:**
- `{ schoolId: 1, admissionNumber: 1 }` — unique composite (no two students in the same school share an admission number)
- `{ userId: 1 }` — for user-to-student lookups
- `{ gradeId: 1, classId: 1 }` — for class roster queries

### Frontend TypeScript Interface (`Student` in `src/types/index.ts`)

```typescript
interface Student {
  id: string
  userId: string
  user: User
  firstName?: string         // fallback if not populated
  lastName?: string          // fallback if not populated
  admissionNumber: string
  gradeId: string
  grade: Grade
  classId: string
  class: SchoolClass
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  address: string
  medicalInfo: MedicalInfo
  parentIds: string[]
  parents: Parent[]
  walletId?: string
  wallet?: Wallet
  isActive: boolean
  enrolledDate: string
  houseId?: string
  house?: House
}

interface MedicalInfo {
  bloodType?: string
  allergies: string[]
  conditions: string[]
  medications: string[]
  emergencyContact: string
  emergencyPhone: string
  doctorName?: string
  doctorPhone?: string
}
```

**Note on divergence:** The frontend `MedicalInfo` interface is a flat structure (single `emergencyContact` string, single `emergencyPhone` string, `medications` array) while the backend `IMedicalProfile` stores `emergencyContacts` as an array of objects with name/relationship/phone. The frontend interface will need to be updated or a mapping layer added when the profile page is wired to the live API.

### Frontend Form Schema (`studentSchema` in `src/lib/validations.ts`)

```typescript
z.object({
  firstName: z.string().min(2)
  lastName: z.string().min(2)
  dateOfBirth: z.string().min(1)
  gender: z.enum(['male', 'female', 'other'])
  gradeId: z.string().min(1)
  classId: z.string().min(1)
  address: z.string().min(5)
  parentId: z.string().min(1)
})
```

**Note:** The frontend form captures `firstName`, `lastName`, and `address` as direct fields, but the backend expects a pre-existing `userId` (ObjectId). When the form is wired to the API, a user account must be created first (or created atomically), and `address` must be mapped — the backend `Student` model does not have an `address` field directly; address likely lives on the `User` model.

---

## 6. State Management

The Student module does not currently have a dedicated Zustand store. State is managed with local `useState` within each page component.

### Current pattern

```typescript
// In /admin/students/page.tsx
const [students, setStudents] = useState<Student[]>([])
const [loading, setLoading] = useState(true)

// In /student/grades/page.tsx
const [studentId, setStudentId] = useState<string | null>(null)
const [grades, setGrades] = useState<StudentGrade[]>([])
const [subjects, setSubjects] = useState<Subject[]>([])
```

Auth state (used by student portal pages to find the current student) comes from `useAuthStore`:
```typescript
const { user } = useAuthStore()
// user.id is matched against s.userId or s.user._id in the students list
```

### Recommended Zustand Store Shape (to be implemented)

```typescript
interface StudentStore {
  // Admin view
  students: Student[]
  totalStudents: number
  currentPage: number
  totalPages: number
  isLoading: boolean
  searchQuery: string

  // Single student profile
  selectedStudent: Student | null
  isLoadingProfile: boolean

  // Student self view
  myStudentRecord: Student | null

  // Actions
  fetchStudents: (schoolId: string, query?: ListQuery) => Promise<void>
  fetchStudentById: (id: string) => Promise<void>
  fetchMyStudentRecord: (userId: string) => Promise<void>
  createStudent: (data: CreateStudentPayload) => Promise<void>
  updateStudent: (id: string, data: Partial<CreateStudentPayload>) => Promise<void>
  deleteStudent: (id: string) => Promise<void>
  updateMedicalProfile: (id: string, data: MedicalProfilePayload) => Promise<void>
  setSearchQuery: (query: string) => void
  setPage: (page: number) => void
  clearSelectedStudent: () => void
}
```

---

## 7. Components Needed

### Shared/Admin Components

**`StudentTable`**
- Wraps `DataTable` with student-specific column definitions
- Columns: Admission No, Name, Grade, Class, Status badge
- Props: `students: Student[]`, `loading: boolean`, `onRowClick?: (student: Student) => void`
- Search key: `name`

**`StudentForm`**
- Used for both create and edit flows
- Fields: First Name, Last Name, Date of Birth, Gender, Grade (select), Class (filtered select), Address, Parent/Guardian (select)
- Controlled via `react-hook-form` + `zodResolver(studentSchema)`
- On grade change, resets `classId` and re-filters class options
- Props: `defaultValues?: StudentFormData`, `onSubmit: (data: StudentFormData) => Promise<void>`, `isSubmitting: boolean`, `grades: Grade[]`, `classes: SchoolClass[]`, `parents: Parent[]`

**`StudentProfile`**
- Full profile display component used on `/admin/students/[id]`
- Contains the four-tab layout (Personal, Academic, Financial, Attendance)
- Props: `student: Student`, `invoices: Invoice[]`, `attendance: Attendance[]`, `grades: StudentGrade[]`
- Subcomponents: `PersonalTab`, `AcademicTab`, `FinancialTab`, `AttendanceTab`

**`MedicalProfileCard`**
- Displays `medicalProfile` fields from the backend shape
- Shows allergies (comma list), conditions (comma list), blood type, emergency contacts (each with name, relationship, phone), medical aid info
- Separate from the current frontend `MedicalInfo` flat shape — needs mapping layer

**`MedicalProfileForm`**
- Form for `PATCH /students/:id/medical`
- Dynamic array fields for `emergencyContacts` (add/remove rows) and `allergies`/`conditions` (tag inputs)
- Optional `medicalAidInfo` section that expands when enabled

**`StudentStatusBadge`**
- Renders `enrollmentStatus` from the backend (`active`, `transferred`, `graduated`, `expelled`, `withdrawn`) with appropriate colour coding
- Distinct from the frontend `isActive: boolean` badge currently used

**`EnrollmentStatusSelect`**
- Dropdown to change a student's `enrollmentStatus`
- Triggers `PUT /students/:id` with only the `enrollmentStatus` field

### Student Portal Components

**`StudentDashboard`** (current `page.tsx`) — stat cards, upcoming homework, today's classes, recent achievements

**`HomeworkCard`** — used in `/student/homework` grid; displays title, subject, status badge, due date, teacher name, links to detail page

**`HomeworkSubmissionForm`** — textarea + submit button used on `/student/homework/[id]`; needs to be wired to API

**`WalletCard`** — blue gradient card showing balance, daily limit, wristband ID

**`TransactionList`** — renders wallet transactions with icon, description, amount, running balance

**`TimetableGrid`** — desktop week view table component

**`TimetableCardList`** — mobile day-by-day card view

**`AchievementBadge`** — icon + name + points + category for a single achievement

**`HouseLeaderboard`** — house points comparison grid (4 houses ranked)

---

## 8. Integration Notes

### User Account

A `Student` is always linked to a `User` via `userId`. The `User` holds `firstName`, `lastName`, `email`, `phone`, `profileImage`, and `role: 'student'`. The student profile page populates `userId` to display personal details. When creating a student, a `User` account must exist first (or be created atomically) — the current `new/page.tsx` form captures first name, last name, and address but does not yet call a user-creation endpoint.

### Guardian / Parent

`guardianIds` is an array of `Parent` ObjectIds. The `GET /students/:id` response populates each guardian with their nested `userId` (name, email, phone). The parent portal uses this relationship in reverse — parents list their children via their own `studentIds` array. When enrolling a student, the selected parent's `studentIds` should also be updated.

### Attendance

Attendance records reference `studentId`. The teacher's class attendance page submits records keyed by student. The admin student profile pulls `GET /attendance?studentId=` to show the attendance tab. The attendance module's list endpoint also accepts `classId` for bulk class marking.

### Fees / Invoices

Invoices are linked to both `studentId` and `parentId`. The student profile's Financial tab shows all invoices for the student. The fees module's debtors report groups outstanding balances by parent/student. When a student is created, invoices are not auto-generated — they must be created manually per fee type.

### Grades / Academic

Mark records (`StudentGrade`) link to `studentId` and `assessmentId`. The student self-portal `/student/grades` fetches marks via `GET /academic/marks/student/:studentId`. The admin profile's Academic tab pulls the same endpoint. Subject grouping is done client-side using the subjects list.

### Homework

`Homework` records are assigned to a `classId`. Students see homework assigned to their class. `HomeworkSubmission` records link `studentId` to `homeworkId`. The student portal's homework page resolves the current student's `_id` from the students list using `userId` matching, then fetches submissions.

### Wallet

Each student has at most one `Wallet` record (`studentId` is unique). The student wallet page fetches via `GET /wallets/student/:studentId`. The admin wallet page allows top-ups. The tuckshop uses the wallet for purchases, creating `WalletTransaction` entries.

### Tuckshop

`TuckshopOrder` records link to `studentId`. Orders are paid via wallet deduction. The student wallet page shows the tuck shop menu as a read-only reference (no ordering from the student portal currently).

### Transport

`TransportRoute` records include a `studentIds` array. `transportRequired: boolean` on the student record flags whether the student uses school transport. The transport module admin page assigns students to routes.

### Aftercare

`afterCareRequired: boolean` on the student record flags aftercare registration. The aftercare admin module uses this to build attendance lists.

### Library

`LibraryBorrowing` records link to `studentId`. The student library page shows current borrowings and the catalogue. Librarians manage check-out/return through the library admin module.

### Achievements / Houses

`StudentAchievement` records link to `studentId` and `achievementId`. Students belong to a house (mock `houseId` on the frontend). House points aggregate from achievements. The achievements page shows earned badges, available badges, and a class leaderboard.

### Discipline

`DisciplineRecord` links to `studentId`. Admin can record merits and demerits. This is referenced but no dedicated student-portal page for discipline exists yet.

### LURITS / EMIS

`luritsNumber` and `saIdNumber` on the student record support South African government school reporting (LURITS/EMIS system). These are optional string fields — no current API integration or export feature exists; they are stored for future compliance use.

---

## 9. Acceptance Criteria

### API

- [ ] `POST /api/students` creates a student and returns the new document; responds 201.
- [ ] `POST /api/students` returns 400 with Zod validation errors when required fields are missing.
- [ ] `POST /api/students` returns 400 when `userId`, `schoolId`, `gradeId`, or `classId` are not valid 24-char hex strings.
- [ ] `GET /api/students` returns a paginated list of non-deleted students for the given `schoolId`.
- [ ] `GET /api/students` defaults to `page=1`, `limit=20` when query params are absent.
- [ ] `GET /api/students` respects `search` param and filters by `admissionNumber` (case-insensitive).
- [ ] `GET /api/students` returns 400 when no `schoolId` is available.
- [ ] `GET /api/students/:id` returns the full student document with `userId`, `gradeId`, `classId`, `guardianIds` populated.
- [ ] `GET /api/students/:id` returns 404 for a non-existent or soft-deleted student.
- [ ] `PUT /api/students/:id` updates the specified fields and returns the updated document.
- [ ] `PUT /api/students/:id` returns 404 for a non-existent or soft-deleted student.
- [ ] `DELETE /api/students/:id` sets `isDeleted: true` and returns 200; student no longer appears in list or getById.
- [ ] `DELETE /api/students/:id` returns 404 if already deleted.
- [ ] `PATCH /api/students/:id/medical` fully replaces the `medicalProfile` sub-document.
- [ ] `PATCH /api/students/:id/medical` validates that each `emergencyContact` has `name`, `relationship`, and `phone`.
- [ ] Unique index on `(schoolId, admissionNumber)` prevents duplicate admission numbers within a school.

### Admin Frontend

- [ ] `/admin/students` loads and displays all students from the API (not mock data).
- [ ] Search in `/admin/students` filters the table by student name.
- [ ] Clicking a student row navigates to `/admin/students/:id`.
- [ ] `/admin/students/new` form submits to `POST /api/students` and redirects on success.
- [ ] `/admin/students/new` displays field-level validation errors inline.
- [ ] Grade select in the new student form populates Class dropdown filtered to selected grade.
- [ ] `/admin/students/:id` loads student data from `GET /api/students/:id` (not mock data).
- [ ] All four profile tabs (Personal, Academic, Financial, Attendance) load data from their respective API endpoints.
- [ ] Student profile Medical tab renders the backend `medicalProfile` shape correctly (emergency contacts array, medical aid info).
- [ ] Delete/archive action calls `DELETE /api/students/:id` and removes the student from the list.
- [ ] Edit flow (pending implementation) pre-populates form from existing data and calls `PUT /api/students/:id`.
- [ ] Medical profile update form calls `PATCH /api/students/:id/medical`.

### Student Frontend

- [ ] `/student` dashboard shows real counts and data for the logged-in student (not hardcoded `mockStudents[0]`).
- [ ] `/student/grades` correctly fetches and groups grades by subject for the logged-in student.
- [ ] `/student/homework` shows only published homework, with correct submission status per assignment.
- [ ] `/student/homework/:id` allows submission via the text area and calls the homework submission API endpoint.
- [ ] `/student/wallet` displays live wallet balance, daily limit, and transaction history.
- [ ] `/student/timetable` renders the student's actual class timetable from the API.
- [ ] `/student/achievements` loads real achievement and house data from the API.
- [ ] `/student/library` loads real borrowings and catalogue from the library API.
- [ ] All student portal pages resolve the current student's record by matching `userId` from the auth store to the students list — this lookup must be reliable across all populated response shapes (`s.userId`, `s.user._id`, `s.user.id`).

### Data Integrity

- [ ] Deleting a student does not cascade-delete their attendance, grades, invoices, or submissions — all associated records are preserved.
- [ ] A student cannot be created with a duplicate `admissionNumber` within the same `schoolId` (enforced by MongoDB unique index).
- [ ] The `enrollmentStatus` field is used for lifecycle management; "deleted" students use `isDeleted: true`, not `enrollmentStatus: 'expelled'`.
- [ ] Frontend `Student` type and backend `IStudent` shape are reconciled: `medicalInfo` (frontend) maps to `medicalProfile` (backend); `isActive` (frontend) maps to `enrollmentStatus === 'active'` (backend); `enrolledDate` (frontend) maps to `enrollmentDate` (backend).
