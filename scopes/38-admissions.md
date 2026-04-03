# 38 — Admissions Pipeline

## 1. Module Overview

The Admissions module manages the full lifecycle of student applications from initial online submission through to enrolment. It introduces a **public-facing application form** (no authentication required), a **Kanban-style admin pipeline**, **parent status tracking**, and **capacity management** per grade.

The module is a registered feature module (`admissions`) gated by `requireModule('admissions')` for admin endpoints. The public application endpoint is ungated — any person can submit an application to a school that has admissions enabled.

### Key Capabilities

| Capability | Description |
|---|---|
| Online Application Form | Public page — parent fills in learner details, uploads documents, pays application fee |
| Application Pipeline | Admin Kanban: Submitted → Under Review → Interview Scheduled → Accepted / Waitlisted / Rejected |
| Document Upload | Birth certificate, previous report card, proof of residence (max 3 files, 10MB each) |
| Application Fee | Optional fee linked to the Fees module — tracked per application |
| Interview Scheduling | Admin schedules interviews, parent receives notification |
| Parent Status Tracking | Authenticated parents see application status for their children |
| Kanban Board | Drag-and-drop board for admins to move applications through stages |
| Bulk Actions | Accept or reject multiple applications at once with email notification |
| Waitlist Management | Automatic offer generation when spots open in a grade |
| Capacity Tracking | Max students per grade, current enrolment, available spots |
| Reports | Applications by grade, acceptance rate, conversion funnel |

### Role-based Access

| Capability | public | parent | teacher | school_admin | super_admin |
|---|---|---|---|---|---|
| Submit application | Yes | Yes | No | No | No |
| View own application status | No | Yes (own children) | No | No | No |
| View all applications | No | No | No | Yes | Yes |
| Move application stage | No | No | No | Yes | Yes |
| Schedule interview | No | No | No | Yes | Yes |
| Bulk accept/reject | No | No | No | Yes | Yes |
| Manage capacity | No | No | No | Yes | Yes |
| View reports | No | No | No | Yes | Yes |

---

## 2. Backend API Endpoints

All admin endpoints are mounted at `/api/admissions`. Public endpoints are mounted at `/api/admissions/public`. Admin endpoints require `authenticate` + `authorize('school_admin', 'super_admin')` + `requireModule('admissions')`.

---

### 2.1 Public Application

#### POST /api/admissions/public/apply

Submit a new application. No authentication required. Rate-limited to 5 submissions per IP per hour.

**Request body** (multipart/form-data):

```json
{
  "schoolId": "string (required — identifies which school to apply to)",
  "applicantFirstName": "string (required)",
  "applicantLastName": "string (required)",
  "dateOfBirth": "string (ISO date, required)",
  "gender": "string (enum: male, female, other)",
  "gradeApplyingFor": "number (required, 0-12 — 0 = Grade R)",
  "yearApplyingFor": "number (required, e.g. 2027)",
  "previousSchool": "string (optional)",
  "parentFirstName": "string (required)",
  "parentLastName": "string (required)",
  "parentEmail": "string (required, valid email)",
  "parentPhone": "string (required)",
  "parentIdNumber": "string (optional — SA ID number)",
  "parentRelationship": "string (enum: mother, father, guardian, other)",
  "address": {
    "street": "string (required)",
    "city": "string (required)",
    "province": "string (required)",
    "postalCode": "string (required)"
  },
  "medicalConditions": "string (optional)",
  "allergies": "string (optional)",
  "specialNeeds": "string (optional)",
  "additionalNotes": "string (optional)"
}
```

**File fields**: `birthCertificate` (required), `previousReportCard` (optional), `proofOfResidence` (required). Max 10MB each. Accepted formats: PDF, JPEG, PNG.

**Response 201**:

```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "_id": "...",
    "applicationNumber": "ADM-2026-00042",
    "status": "submitted",
    "trackingToken": "a1b2c3d4e5f6",
    "message": "Your application has been submitted. Use your tracking token to check status."
  }
}
```

The `trackingToken` is a 12-character alphanumeric string that allows the parent to check status without authentication.

#### GET /api/admissions/public/status/:trackingToken

Check application status using the tracking token. No authentication required.

**Response 200**:

```json
{
  "success": true,
  "data": {
    "applicationNumber": "ADM-2026-00042",
    "applicantName": "John Smith",
    "gradeApplyingFor": 8,
    "status": "under_review",
    "statusHistory": [
      { "status": "submitted", "date": "2026-03-15T10:00:00.000Z" },
      { "status": "under_review", "date": "2026-03-18T09:00:00.000Z" }
    ],
    "interviewDate": null,
    "notes": null
  }
}
```

#### GET /api/admissions/public/capacity/:schoolId

Check available spots per grade. No authentication required.

**Response 200**:

```json
{
  "success": true,
  "data": [
    { "grade": 8, "maxCapacity": 120, "currentEnrolled": 108, "pendingApplications": 15, "availableSpots": 12 },
    { "grade": 9, "maxCapacity": 120, "currentEnrolled": 118, "pendingApplications": 8, "availableSpots": 2 },
    { "grade": 10, "maxCapacity": 90, "currentEnrolled": 88, "pendingApplications": 5, "availableSpots": 2 }
  ]
}
```

---

### 2.2 Admin Application Management

#### GET /api/admissions/applications

List all applications with filters and pagination.

**Auth**: `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `status` | string | No | Filter by stage. Comma-separated for multiple. |
| `gradeApplyingFor` | number | No | Filter by grade. |
| `yearApplyingFor` | number | No | Filter by application year. |
| `search` | string | No | Search by applicant name, parent name, or application number. |
| `page` | number | No | Defaults to 1. |
| `limit` | number | No | Defaults to 20. |
| `sortBy` | string | No | Field to sort by. Default: `createdAt`. |
| `sortOrder` | string | No | `asc` or `desc`. Default: `desc`. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "applicationNumber": "ADM-2026-00042",
        "applicantFirstName": "John",
        "applicantLastName": "Smith",
        "dateOfBirth": "2013-05-15",
        "gradeApplyingFor": 8,
        "yearApplyingFor": 2027,
        "parentName": "Jane Smith",
        "parentEmail": "jane@example.com",
        "parentPhone": "+27821234567",
        "status": "under_review",
        "applicationFeeStatus": "paid",
        "documents": {
          "birthCertificate": { "url": "/uploads/admissions/...", "uploadedAt": "..." },
          "previousReportCard": { "url": "/uploads/admissions/...", "uploadedAt": "..." },
          "proofOfResidence": { "url": "/uploads/admissions/...", "uploadedAt": "..." }
        },
        "createdAt": "2026-03-15T10:00:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

#### GET /api/admissions/applications/:id

Get full application detail.

**Auth**: `school_admin`, `super_admin`

**Response 200**: Full application document including all fields, documents, status history, interview details, and internal notes.

#### PUT /api/admissions/applications/:id/status

Move an application to a new stage.

**Auth**: `school_admin`, `super_admin`

**Request body**:

```json
{
  "status": "under_review",
  "notes": "Documents verified. Moving to review.",
  "notifyParent": true
}
```

Valid status transitions:
- `submitted` → `under_review`
- `under_review` → `interview_scheduled` | `accepted` | `waitlisted` | `rejected`
- `interview_scheduled` → `accepted` | `waitlisted` | `rejected`
- `waitlisted` → `accepted` | `rejected`

Invalid transitions return 400. If `notifyParent: true`, an email is sent to the parent.

**Response 200**: Updated application with new status history entry.

#### POST /api/admissions/applications/bulk-action

Bulk accept or reject applications.

**Auth**: `school_admin`, `super_admin`

**Request body**:

```json
{
  "applicationIds": ["...", "...", "..."],
  "action": "accepted",
  "notes": "Accepted for 2027 academic year",
  "notifyParents": true
}
```

**Response 200**:

```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0,
    "emailsSent": 3
  }
}
```

---

### 2.3 Interview Scheduling

#### PUT /api/admissions/applications/:id/interview

Schedule an interview for an application.

**Auth**: `school_admin`, `super_admin`

**Request body**:

```json
{
  "interviewDate": "2026-04-10T10:00:00.000Z",
  "interviewType": "in_person",
  "interviewerName": "Mrs. Van der Merwe",
  "venue": "Principal's Office",
  "notes": "Both parents to attend",
  "notifyParent": true
}
```

This also moves the status to `interview_scheduled` if currently `under_review`.

**Response 200**: Updated application.

---

### 2.4 Capacity Management

#### GET /api/admissions/capacity

Get capacity configuration for all grades.

**Auth**: `school_admin`, `super_admin`

**Query**: `schoolId`

**Response 200**:

```json
{
  "success": true,
  "data": [
    { "grade": 0, "maxCapacity": 60, "currentEnrolled": 55, "label": "Grade R" },
    { "grade": 1, "maxCapacity": 90, "currentEnrolled": 88, "label": "Grade 1" },
    { "grade": 8, "maxCapacity": 120, "currentEnrolled": 108, "label": "Grade 8" }
  ]
}
```

#### PUT /api/admissions/capacity

Update capacity limits (upsert per grade).

**Auth**: `school_admin`, `super_admin`

**Request body**:

```json
{
  "schoolId": "...",
  "grades": [
    { "grade": 8, "maxCapacity": 130 },
    { "grade": 9, "maxCapacity": 120 }
  ]
}
```

**Response 200**: Updated capacity records.

---

### 2.5 Parent Application Status

#### GET /api/admissions/my-applications

Get applications submitted by the authenticated parent (matched by email).

**Auth**: `parent`

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "applicationNumber": "ADM-2026-00042",
      "applicantFirstName": "John",
      "applicantLastName": "Smith",
      "gradeApplyingFor": 8,
      "status": "interview_scheduled",
      "interviewDate": "2026-04-10T10:00:00.000Z",
      "interviewVenue": "Principal's Office",
      "statusHistory": [
        { "status": "submitted", "date": "2026-03-15T10:00:00.000Z" },
        { "status": "under_review", "date": "2026-03-18T09:00:00.000Z" },
        { "status": "interview_scheduled", "date": "2026-03-25T11:00:00.000Z" }
      ]
    }
  ]
}
```

---

### 2.6 Reports

#### GET /api/admissions/reports/summary

Admissions summary report.

**Auth**: `school_admin`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `yearApplyingFor` | number | No | Defaults to next academic year. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "totalApplications": 156,
    "byStatus": {
      "submitted": 12,
      "under_review": 18,
      "interview_scheduled": 8,
      "accepted": 95,
      "waitlisted": 10,
      "rejected": 13
    },
    "byGrade": [
      { "grade": 8, "total": 45, "accepted": 30, "rejected": 5, "pending": 10 },
      { "grade": 9, "total": 28, "accepted": 18, "rejected": 3, "pending": 7 }
    ],
    "acceptanceRate": 60.9,
    "conversionFunnel": {
      "applied": 156,
      "reviewed": 144,
      "interviewed": 120,
      "offered": 105,
      "accepted": 95
    },
    "averageProcessingDays": 14.3
  }
}
```

---

## 3. Data Models

### Application

```
Application {
  schoolId:              ObjectId (ref: 'School', required)
  applicationNumber:     String (required, unique — auto-generated: ADM-YYYY-NNNNN)
  trackingToken:         String (required, unique — 12-char alphanumeric)
  status:                String (enum: ['submitted', 'under_review', 'interview_scheduled', 'accepted', 'waitlisted', 'rejected'], default: 'submitted')
  
  // Applicant (child) details
  applicantFirstName:    String (required, trim)
  applicantLastName:     String (required, trim)
  dateOfBirth:           Date (required)
  gender:                String (enum: ['male', 'female', 'other'])
  gradeApplyingFor:      Number (required, 0-12)
  yearApplyingFor:       Number (required)
  previousSchool:        String (trim)
  
  // Parent/guardian details
  parentFirstName:       String (required, trim)
  parentLastName:        String (required, trim)
  parentEmail:           String (required, lowercase, trim)
  parentPhone:           String (required, trim)
  parentIdNumber:        String (trim)
  parentRelationship:    String (enum: ['mother', 'father', 'guardian', 'other'])
  parentUserId:          ObjectId (ref: 'User', optional — linked if parent has account)
  
  // Address
  address: {
    street:              String (required)
    city:                String (required)
    province:            String (required)
    postalCode:          String (required)
  }
  
  // Medical
  medicalConditions:     String
  allergies:             String
  specialNeeds:          String
  
  // Documents
  documents: {
    birthCertificate:    { url: String, uploadedAt: Date }
    previousReportCard:  { url: String, uploadedAt: Date }
    proofOfResidence:    { url: String, uploadedAt: Date }
  }
  
  // Application fee
  applicationFeeStatus:  String (enum: ['not_required', 'pending', 'paid'], default: 'not_required')
  applicationFeeInvoiceId: ObjectId (ref: 'Invoice', optional)
  
  // Interview
  interviewDate:         Date
  interviewType:         String (enum: ['in_person', 'virtual'])
  interviewerName:       String
  interviewVenue:        String
  interviewNotes:        String
  
  // Status tracking
  statusHistory: [{
    status:              String (required)
    date:                Date (required, default: Date.now)
    changedBy:           ObjectId (ref: 'User')
    notes:               String
  }]
  
  // Internal
  internalNotes:         String
  additionalNotes:       String
  reviewedBy:            ObjectId (ref: 'User')
  
  isDeleted:             Boolean (default: false)
  timestamps:            true
}

Indexes:
  - { schoolId: 1, applicationNumber: 1 } unique
  - { trackingToken: 1 } unique
  - { schoolId: 1, status: 1, yearApplyingFor: 1 }
  - { schoolId: 1, gradeApplyingFor: 1, yearApplyingFor: 1 }
  - { parentEmail: 1, schoolId: 1 }
```

### GradeCapacity

```
GradeCapacity {
  schoolId:       ObjectId (ref: 'School', required)
  grade:          Number (required, 0-12)
  maxCapacity:    Number (required)
  isDeleted:      Boolean (default: false)
  timestamps:     true
}

Indexes:
  - { schoolId: 1, grade: 1 } unique
```

---

## 4. Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/apply/:schoolId` | Public Application Form | Multi-step form, no auth required |
| `/apply/status` | Public Status Check | Enter tracking token to check status |
| `/admin/admissions` | Admissions Pipeline | Kanban board of applications by stage |
| `/admin/admissions/[id]` | Application Detail | Full application view with actions |
| `/admin/admissions/capacity` | Capacity Management | Configure max students per grade |
| `/admin/admissions/reports` | Admissions Reports | Summary stats, funnel chart, per-grade breakdown |
| `/parent/admissions` | Parent Application Status | List of parent's applications with status timeline |

**Nav entries**:
- Admin: `{ label: 'Admissions', href: '/admin/admissions', icon: UserPlus }`
- Parent: `{ label: 'Admissions', href: '/parent/admissions', icon: FileText }`
- Public: Linked from school's public page or shared URL

---

## 5. User Flows

### Flow 1: Parent Submits Online Application

1. Parent visits `/apply/ABC123` (schoolId in URL, shared by the school).
2. Page loads `GET /api/admissions/public/capacity/:schoolId` to show available spots.
3. Parent fills multi-step form:
   - Step 1: Child details (name, DOB, gender, grade, previous school)
   - Step 2: Parent/guardian details (name, email, phone, ID number, relationship)
   - Step 3: Address and medical information
   - Step 4: Document upload (birth certificate, report card, proof of residence)
   - Step 5: Review and submit
4. Submits → `POST /api/admissions/public/apply` (multipart/form-data).
5. Success screen shows application number and tracking token.
6. Parent receives confirmation email with tracking token.

### Flow 2: Admin Reviews Applications (Kanban)

1. Admin navigates to `/admin/admissions`.
2. Page loads `GET /api/admissions/applications` for all statuses.
3. Kanban board renders columns: Submitted | Under Review | Interview Scheduled | Accepted | Waitlisted | Rejected.
4. Admin drags an application from "Submitted" to "Under Review".
5. Confirmation dialog appears — admin adds optional notes, toggles "Notify parent".
6. `PUT /api/admissions/applications/:id/status` is called.
7. Card moves to the new column.

### Flow 3: Admin Schedules Interview

1. Admin clicks an application card in "Under Review" column.
2. Application detail page opens (`/admin/admissions/:id`).
3. Admin reviews documents (clickable links to uploaded files).
4. Admin clicks "Schedule Interview".
5. Dialog: date, type (in-person/virtual), interviewer, venue, notes.
6. Submits → `PUT /api/admissions/applications/:id/interview`.
7. Application moves to "Interview Scheduled". Parent receives email.

### Flow 4: Bulk Accept Applications

1. Admin is on the Kanban board.
2. Switches to list view (toggle button).
3. Selects multiple applications using checkboxes.
4. Clicks "Bulk Accept" button.
5. Confirmation dialog shows count and "Notify parents" toggle.
6. `POST /api/admissions/applications/bulk-action` with `action: "accepted"`.
7. Selected applications move to "Accepted" column. Emails sent.

### Flow 5: Parent Checks Application Status

1. Parent visits `/apply/status`.
2. Enters tracking token received by email.
3. Page loads `GET /api/admissions/public/status/:trackingToken`.
4. Status timeline shows progression through stages.
5. If interview scheduled, shows date, time, venue.

### Flow 6: Waitlist Auto-Offer

1. A Grade 8 spot opens (a previously accepted student declines or is removed).
2. Admin manually triggers "Offer to next on waitlist" on the capacity page.
3. System finds the oldest waitlisted application for Grade 8.
4. Status updated to `accepted`. Parent notified by email.
5. Available spots count decreases by one.

---

## 6. State Management

### useAdmissionsAdmin hook (`src/hooks/useAdmissionsAdmin.ts`)

```ts
interface AdmissionsAdminState {
  applications: Application[];
  selectedApplication: Application | null;
  total: number;
  loading: boolean;
  error: string | null;
  filters: {
    status: string | null;
    grade: number | null;
    year: number | null;
    search: string;
  };
}
```

Methods: `fetchApplications`, `updateStatus`, `scheduleInterview`, `bulkAction`, `fetchApplication`.

### useAdmissionsPublic hook (`src/hooks/useAdmissionsPublic.ts`)

Manages the public application form submission and status checking. No auth required.

### useAdmissionsCapacity hook (`src/hooks/useAdmissionsCapacity.ts`)

CRUD for grade capacity configuration.

### useAdmissionsReports hook (`src/hooks/useAdmissionsReports.ts`)

Fetch summary report data.

### useParentAdmissions hook (`src/hooks/useParentAdmissions.ts`)

Fetch applications for the authenticated parent.

---

## 7. Components Needed

### Admissions-specific components (`src/components/admissions/`)

| Component | Description |
|---|---|
| `ApplicationForm` | Multi-step form with validation (5 steps) |
| `ApplicationFormStep` | Individual step wrapper with navigation |
| `DocumentUploadField` | File input with preview, validation (PDF/JPEG/PNG, 10MB) |
| `ApplicationKanban` | Kanban board with 6 columns (drag-and-drop via native HTML5 DnD) |
| `KanbanColumn` | Single column with droppable area and card list |
| `ApplicationCard` | Compact card showing applicant name, grade, date |
| `ApplicationDetailView` | Full application view with all fields and documents |
| `StatusTimeline` | Vertical timeline showing status progression |
| `InterviewScheduleDialog` | Form dialog for scheduling interviews |
| `BulkActionDialog` | Confirmation dialog for bulk accept/reject |
| `StatusUpdateDialog` | Dialog for moving an application to a new stage |
| `CapacityConfigTable` | Editable table of grade capacities |
| `CapacityBar` | Visual bar showing enrolled/pending/available for a grade |
| `ApplicationListView` | DataTable alternative to Kanban (toggle between views) |
| `AdmissionsReportCards` | Summary stat cards (total, by status, acceptance rate) |
| `ConversionFunnelChart` | Recharts funnel/bar chart showing pipeline conversion |
| `GradeBreakdownChart` | Recharts `BarChart` of applications per grade |
| `PublicStatusChecker` | Simple form: enter tracking token, show result |
| `ParentApplicationList` | List of parent's applications with status badges |

### Shared components reused

- `PageHeader`, `DataTable`, `Badge`, `Dialog`, `LoadingSpinner`, `EmptyState`
- `Select`, `Input`, `Button`, `Textarea`, `Label` from UI primitives
- `StatCard` for report summary cards

---

## 8. Integration Notes

### Public Routes (No Auth)

Three endpoints are public:
- `POST /api/admissions/public/apply`
- `GET /api/admissions/public/status/:trackingToken`
- `GET /api/admissions/public/capacity/:schoolId`

These bypass the `authenticate` middleware but still use rate limiting (express-rate-limit). The public apply page at `/apply/:schoolId` is a Next.js page that does NOT use the dashboard layout.

### Application Number Generation

Format: `ADM-YYYY-NNNNN` where YYYY is the application year and NNNNN is a zero-padded sequential number. Use a counter document or `findOneAndUpdate` with `$inc` to ensure uniqueness under concurrency.

### Tracking Token

Generated as 12 random alphanumeric characters using `crypto.randomBytes(6).toString('hex')`. Stored as a unique indexed field. Used for unauthenticated status checks.

### Document Storage

Documents are uploaded via `multer` to `/uploads/admissions/` (local disk in dev, S3 in production). Each file is renamed to `${applicationId}_${fieldName}_${timestamp}.${ext}`. The `documents` field stores the relative URL.

### Fees Module Integration

If the school has configured an application fee:
1. On application creation, an invoice is created in the Fees module via `POST /api/fees/types`.
2. The `applicationFeeInvoiceId` is stored on the application.
3. The `applicationFeeStatus` is updated when the invoice is paid (webhook or polling).
4. Admins can filter applications by fee status.

### Email Notifications

Email is sent via the existing notification service (BullMQ job queue) for:
- Application confirmation (to parent)
- Status change notifications (when `notifyParent: true`)
- Interview scheduling
- Acceptance/rejection

### Parent Account Linking

If the parent email matches an existing user account, `parentUserId` is set. This allows the parent to see the application in their portal at `/parent/admissions`.

### Multi-Tenancy

- All admin queries filter by `schoolId`.
- Public endpoints use the `schoolId` from the URL parameter or request body.
- The tracking token lookup includes `isDeleted: false` but does not require `schoolId` (the token is globally unique).

### Waitlist Priority

Waitlisted applications are ordered by `createdAt` (first-come, first-served). When a spot opens, the admin manually triggers the offer — there is no automatic background job (to keep the process human-controlled).

---

## 9. Acceptance Criteria

- [ ] Public application form is accessible without authentication at `/apply/:schoolId`
- [ ] Form has 5 steps with validation at each step
- [ ] Documents can be uploaded (birth certificate required, report card optional, proof of residence required)
- [ ] Document upload enforces 10MB limit and PDF/JPEG/PNG format
- [ ] Successful submission returns an application number and tracking token
- [ ] Parent can check status using tracking token at `/apply/status`
- [ ] Confirmation email is sent on submission
- [ ] Admin Kanban board shows applications in 6 columns by status
- [ ] Admin can drag-and-drop applications between valid status transitions
- [ ] Invalid status transitions are rejected with a 400 error
- [ ] Admin can view full application detail including uploaded documents
- [ ] Admin can schedule interviews with date, type, venue, and interviewer
- [ ] Interview scheduling sends email notification to parent
- [ ] Bulk accept/reject works for multiple selected applications
- [ ] Bulk action sends email notifications when toggled on
- [ ] Capacity management allows setting max students per grade
- [ ] Public capacity endpoint shows available spots per grade
- [ ] Waitlisted applications can be manually offered a spot
- [ ] Parent portal shows application status with timeline
- [ ] Reports show total applications, acceptance rate, and conversion funnel
- [ ] Application numbers are unique and auto-generated (ADM-YYYY-NNNNN)
- [ ] Rate limiting prevents spam applications (5 per IP per hour)
- [ ] All admin endpoints filter by `schoolId` — no cross-school data leakage
- [ ] All pages have loading spinners and empty states
- [ ] All pages are mobile-responsive
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
