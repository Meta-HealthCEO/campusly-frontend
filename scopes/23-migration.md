# 23 — Migration Module

## 1. Module Overview

The Migration module provides a structured, multi-step pipeline for importing historical school data into Campusly from external school management systems. It is the primary mechanism for onboarding existing schools whose data lives in a legacy platform — replacing the need for manual data entry.

The module handles:

- **File upload and job creation**: An admin submits a file reference (URL, name, size) alongside the source system identifier. The backend creates a `MigrationJob` document and auto-applies a built-in field mapping if the source system is one of the three pre-configured South African platforms (d6 Connect, Karri, ADAM).
- **Field mapping**: The admin can review and customise the mapping between source-file column names and Campusly's target field names. This is especially important for `csv` and `excel` uploads where no default mapping exists.
- **Data validation**: The backend validates the job's current mapping configuration — checking that required target fields (`firstName`, `lastName`) are mapped, and running row-level SA ID number verification via the Luhn-variant algorithm used for South African ID numbers.
- **Preview**: Returns the current mapping configuration and up to 10 sample rows to allow the admin to verify the mapping before committing to the import.
- **Import execution**: The job is transitioned to `importing` status and the backend iterates over valid rows to create Student, Parent, Staff, and Grade records in bulk.
- **Status polling**: A status endpoint lets the frontend poll a job's current state during a long-running import.
- **Job history**: Paginated, filterable log of all migration jobs performed at the school.
- **Templates**: Super admins can create reusable field-mapping templates per source system + entity type combination. School admins can retrieve templates to pre-populate their mapping configuration.

**Who can use this module**: `school_admin` and `super_admin` roles only. No teacher, parent, or student access.

**Currently built**:
- Complete backend (routes, model, validation, controller, service)
- Admin portal page directory exists at `src/app/(dashboard)/admin/migration/` but contains no files — the page has not been built yet

---

## 2. Backend API Endpoints

All endpoints are mounted under `/api/migration` (standard Express mount prefix). Every route requires a valid Bearer token via the `authenticate` middleware.

---

### POST /api/migration/upload

Create a new migration job. For known source systems (d6_connect, karri, adam), the service automatically seeds the `mapping` field with the pre-built column mappings from `SOURCE_MAPPERS`. For `excel` and `csv` the mapping is initialised as empty (`{}`).

**Auth**: `school_admin` or `super_admin`

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | string | yes | Valid 24-character MongoDB ObjectId |
| `sourceSystem` | string | yes | Enum: `d6_connect`, `karri`, `adam`, `schooltool`, `excel`, `csv` |
| `originalName` | string | yes | min length 1, trimmed |
| `fileUrl` | string | yes | min length 1 (URL to the uploaded file in storage) |
| `fileSize` | number | yes | Positive number (bytes) |

**Example request body**:
```json
{
  "schoolId": "6650a1b2c3d4e5f678901234",
  "sourceSystem": "d6_connect",
  "originalName": "learners_export_2026.csv",
  "fileUrl": "https://cdn.campusly.co.za/uploads/migrations/learners_export_2026.csv",
  "fileSize": 204800
}
```

**Example response** (HTTP 201):
```json
{
  "success": true,
  "message": "Migration job created successfully",
  "data": {
    "_id": "6651b2c3d4e5f67890123456",
    "schoolId": "6650a1b2c3d4e5f678901234",
    "status": "pending",
    "sourceSystem": "d6_connect",
    "uploadedFile": {
      "originalName": "learners_export_2026.csv",
      "fileUrl": "https://cdn.campusly.co.za/uploads/migrations/learners_export_2026.csv",
      "fileSize": 204800
    },
    "mapping": {
      "Learner Name": "firstName",
      "Learner Surname": "lastName",
      "ID Number": "saIdNumber",
      "Date of Birth": "dateOfBirth",
      "Grade": "grade",
      "Class": "class",
      "Gender": "gender",
      "Home Language": "homeLanguage",
      "Admission Number": "admissionNumber"
    },
    "validationResults": null,
    "importResults": null,
    "startedAt": null,
    "completedAt": null,
    "performedBy": "6650a1b2c3d4e5f678901299",
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  }
}
```

---

### GET /api/migration/:jobId/validate

Run validation against the job's current mapping configuration. Checks that required target fields are mapped (`firstName`, `lastName`), computes row-level statistics, and validates SA ID numbers if `saIdNumber` is in the mapping. Sets `job.status` to `validating` during the run and populates `validationResults` on completion. Status reverts to `pending` after the check regardless of outcome (the job stays pending until the admin decides to execute).

Only callable when the job's current status is `pending` or `validating`.

**Auth**: `school_admin` or `super_admin`

**Path parameter**: `jobId` — MongoDB ObjectId string

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "Validation completed",
  "data": {
    "_id": "6651b2c3d4e5f67890123456",
    "status": "pending",
    "validationResults": {
      "totalRows": 2048,
      "validRows": 1985,
      "invalidRows": 41,
      "duplicates": 22,
      "errors": [
        { "row": 0, "field": "mapping", "message": "No field mappings configured" }
      ]
    },
    "startedAt": "2026-03-31T08:01:00.000Z"
  }
}
```

**Error** (HTTP 400 — job in wrong status):
```json
{
  "success": false,
  "message": "Job cannot be validated in its current status"
}
```

**Error** (HTTP 404):
```json
{
  "success": false,
  "message": "Migration job not found"
}
```

---

### GET /api/migration/:jobId/preview

Returns the current `mapping` object and up to 10 sample rows with the mapping applied. Each sample row is keyed by `targetField` name. Useful for showing the admin what the imported data will look like before committing.

**Auth**: `school_admin` or `super_admin`

**Path parameter**: `jobId` — MongoDB ObjectId string

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "Preview retrieved successfully",
  "data": {
    "mapping": {
      "Learner Name": "firstName",
      "Learner Surname": "lastName",
      "ID Number": "saIdNumber",
      "Grade": "grade"
    },
    "sampleRows": [
      {
        "firstName": "Sample Learner Name row 1",
        "lastName": "Sample Learner Surname row 1",
        "saIdNumber": "Sample ID Number row 1",
        "grade": "Sample Grade row 1"
      },
      {
        "firstName": "Sample Learner Name row 2",
        "lastName": "Sample Learner Surname row 2",
        "saIdNumber": "Sample ID Number row 2",
        "grade": "Sample Grade row 2"
      }
    ]
  }
}
```

**Error** (HTTP 404):
```json
{
  "success": false,
  "message": "Migration job not found"
}
```

---

### PUT /api/migration/:jobId/mapping

Update the field mapping on a job. Only callable when the job is in `pending` status. The mapping is a plain object where each key is a source column name and each value is a Campusly target field name.

**Auth**: `school_admin` or `super_admin`

**Path parameter**: `jobId` — MongoDB ObjectId string

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `mapping` | `Record<string, string>` | yes | Object with at least one key-value pair; both key and value are strings |

**Example request body**:
```json
{
  "mapping": {
    "Learner Name": "firstName",
    "Learner Surname": "lastName",
    "ID Number": "saIdNumber",
    "Date of Birth": "dateOfBirth",
    "Grade": "grade",
    "Class": "class",
    "Gender": "gender"
  }
}
```

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "Mapping updated successfully",
  "data": {
    "_id": "6651b2c3d4e5f67890123456",
    "status": "pending",
    "mapping": {
      "Learner Name": "firstName",
      "Learner Surname": "lastName",
      "ID Number": "saIdNumber",
      "Date of Birth": "dateOfBirth",
      "Grade": "grade",
      "Class": "class",
      "Gender": "gender"
    },
    "updatedAt": "2026-03-31T08:05:00.000Z"
  }
}
```

**Error** (HTTP 404 — job not found or not in `pending` status):
```json
{
  "success": false,
  "message": "Migration job not found or not in pending status"
}
```

**Error** (HTTP 400 — empty mapping):
```json
{
  "success": false,
  "message": "At least one field mapping is required"
}
```

---

### POST /api/migration/:jobId/execute

Execute the import for a validated job. The job must be in `pending` status and `validationResults` must be present with no critical errors (no errors with `row === 0`). The backend transitions the job to `importing`, processes all valid rows, creates Student/Parent/Staff/Grade documents, populates `importResults`, and marks the job `completed` or `failed`.

**Auth**: `school_admin` or `super_admin`

**Path parameter**: `jobId` — MongoDB ObjectId string

**Request body**: None

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "Import executed successfully",
  "data": {
    "_id": "6651b2c3d4e5f67890123456",
    "status": "completed",
    "importResults": {
      "studentsCreated": 1191,
      "parentsCreated": 496,
      "staffCreated": 198,
      "gradesCreated": 99,
      "skipped": 22,
      "errors": []
    },
    "startedAt": "2026-03-31T08:01:00.000Z",
    "completedAt": "2026-03-31T08:07:00.000Z"
  }
}
```

**Error** (HTTP 400 — job not in `pending` status):
```json
{
  "success": false,
  "message": "Job must be in pending status to execute import"
}
```

**Error** (HTTP 400 — validation not passed):
```json
{
  "success": false,
  "message": "Job must pass validation before import"
}
```

**Error** (HTTP 404):
```json
{
  "success": false,
  "message": "Migration job not found"
}
```

---

### GET /api/migration/:jobId/status

Retrieve the current full state of a migration job. The `performedBy` field is populated with the user's `firstName`, `lastName`, and `email`.

**Auth**: `school_admin` or `super_admin`

**Path parameter**: `jobId` — MongoDB ObjectId string

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "Job status retrieved",
  "data": {
    "_id": "6651b2c3d4e5f67890123456",
    "schoolId": "6650a1b2c3d4e5f678901234",
    "status": "importing",
    "sourceSystem": "d6_connect",
    "uploadedFile": {
      "originalName": "learners_export_2026.csv",
      "fileUrl": "https://cdn.campusly.co.za/uploads/migrations/learners_export_2026.csv",
      "fileSize": 204800
    },
    "mapping": { "Learner Name": "firstName", "...": "..." },
    "validationResults": {
      "totalRows": 2048,
      "validRows": 1985,
      "invalidRows": 41,
      "duplicates": 22,
      "errors": []
    },
    "importResults": null,
    "startedAt": "2026-03-31T08:01:00.000Z",
    "completedAt": null,
    "performedBy": {
      "_id": "6650a1b2c3d4e5f678901299",
      "firstName": "Priya",
      "lastName": "Naidoo",
      "email": "priya@riverside.edu.za"
    },
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:06:30.000Z"
  }
}
```

**Error** (HTTP 404):
```json
{
  "success": false,
  "message": "Migration job not found"
}
```

---

### GET /api/migration/history

Retrieve a paginated, filterable list of migration jobs for the school. The `performedBy` field is populated with name and email. Results are sorted by `createdAt` descending by default.

**Auth**: `school_admin` or `super_admin`

**Query parameters**:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number (min 1) |
| `limit` | number | 10 | Results per page (min 1, max 100) |
| `sort` | string | `-createdAt` | Field name; prefix `-` for descending |
| `schoolId` | string | inferred from JWT `schoolId` | Filter by school; super admins can pass a specific schoolId |
| `status` | string | — | Filter by job status: `pending`, `validating`, `importing`, `completed`, `failed` |

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "Job history retrieved",
  "data": {
    "data": [
      {
        "_id": "6651b2c3d4e5f67890123456",
        "status": "completed",
        "sourceSystem": "d6_connect",
        "uploadedFile": {
          "originalName": "learners_export_2026.csv",
          "fileSize": 204800
        },
        "importResults": {
          "studentsCreated": 1191,
          "parentsCreated": 496,
          "staffCreated": 198,
          "gradesCreated": 99,
          "skipped": 22,
          "errors": []
        },
        "performedBy": {
          "firstName": "Priya",
          "lastName": "Naidoo",
          "email": "priya@riverside.edu.za"
        },
        "createdAt": "2026-03-31T08:00:00.000Z",
        "completedAt": "2026-03-31T08:07:00.000Z"
      }
    ],
    "total": 4,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### POST /api/migration/templates

Create a reusable field-mapping template for a specific source system and entity type combination. Only callable by super admins.

**Auth**: `super_admin` only

**Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `sourceSystem` | string | yes | Enum: `d6_connect`, `karri`, `adam`, `schooltool`, `excel`, `csv` |
| `entityType` | string | yes | Enum: `student`, `parent`, `staff`, `grade`, `fee` |
| `fieldMappings` | array | yes | At least one entry; each entry has `sourceField` (string, trimmed, required), `targetField` (string, trimmed, required), and optional `transform` (string, trimmed) |
| `isDefault` | boolean | no | If `true`, this template is used as the default for this source + entity pair |

**Example request body**:
```json
{
  "sourceSystem": "csv",
  "entityType": "student",
  "fieldMappings": [
    { "sourceField": "First Name", "targetField": "firstName" },
    { "sourceField": "Last Name", "targetField": "lastName" },
    { "sourceField": "SA ID", "targetField": "saIdNumber" },
    { "sourceField": "DOB", "targetField": "dateOfBirth", "transform": "parseDate" },
    { "sourceField": "Grade", "targetField": "grade" },
    { "sourceField": "Gender", "targetField": "gender", "transform": "lowercase" }
  ],
  "isDefault": true
}
```

**Example response** (HTTP 201):
```json
{
  "success": true,
  "message": "Template created successfully",
  "data": {
    "_id": "6651c3d4e5f6789012345678",
    "sourceSystem": "csv",
    "entityType": "student",
    "fieldMappings": [
      { "sourceField": "First Name", "targetField": "firstName" },
      { "sourceField": "Last Name", "targetField": "lastName" },
      { "sourceField": "SA ID", "targetField": "saIdNumber" },
      { "sourceField": "DOB", "targetField": "dateOfBirth", "transform": "parseDate" },
      { "sourceField": "Grade", "targetField": "grade" },
      { "sourceField": "Gender", "targetField": "gender", "transform": "lowercase" }
    ],
    "isDefault": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T09:00:00.000Z",
    "updatedAt": "2026-03-31T09:00:00.000Z"
  }
}
```

---

### GET /api/migration/templates

Retrieve all non-deleted migration templates, optionally filtered by source system and/or entity type.

**Auth**: `school_admin` or `super_admin`

**Query parameters**:

| Param | Type | Description |
|---|---|---|
| `sourceSystem` | string | Filter by source system enum value |
| `entityType` | string | Filter by entity type enum value |

**Example response** (HTTP 200):
```json
{
  "success": true,
  "message": "Templates retrieved",
  "data": [
    {
      "_id": "6651c3d4e5f6789012345678",
      "sourceSystem": "csv",
      "entityType": "student",
      "fieldMappings": [
        { "sourceField": "First Name", "targetField": "firstName" },
        { "sourceField": "Last Name", "targetField": "lastName" }
      ],
      "isDefault": true,
      "isDeleted": false,
      "createdAt": "2026-03-31T09:00:00.000Z",
      "updatedAt": "2026-03-31T09:00:00.000Z"
    }
  ]
}
```

---

## 3. Frontend Pages

The admin migration page has not been built. The directory `src/app/(dashboard)/admin/migration/` exists but contains no files. The following describes the page that needs to be created.

### `/admin/migration` — Data Migration Page

**File to create**: `src/app/(dashboard)/admin/migration/page.tsx`

**Purpose**: Enables school admins to import historical data from their previous school management system into Campusly. The page guides the admin through a multi-step wizard and also displays the job history.

**Layout**: Two primary sections — the active import wizard (top) and the job history table (bottom). When no job is in progress, the wizard shows the upload/start step. During an active job, the wizard shows the current pipeline step.

**Tabs / Steps structure**:

The page uses a tabbed layout with two tabs:
1. **New Import** — the multi-step import wizard
2. **Import History** — the job history table

**New Import tab — wizard steps**:

| Step | Name | Content |
|---|---|---|
| 1 | Select Source | `Select` dropdown for source system; description of each system's pre-built mapping |
| 2 | Upload File | File upload area (CSV or Excel); submits file to storage and then calls `POST /api/migration/upload` |
| 3 | Map Columns | Column mapper UI; shows source columns on the left, Campusly target fields on the right; calls `PUT /api/migration/:jobId/mapping` on save |
| 4 | Validate | Triggers `GET /api/migration/:jobId/validate`; shows validation results summary with error list |
| 5 | Preview | Calls `GET /api/migration/:jobId/preview`; shows a sample data table |
| 6 | Import | Confirmation step; calls `POST /api/migration/:jobId/execute`; shows progress and final results |

**Import History tab**:
- `DataTable` of past jobs
- Columns: File Name, Source System, Status (badge), Total Rows, Records Created, Performed By, Date, Actions
- Status filter dropdown
- Clicking a completed job row opens a result detail panel/dialog showing full `importResults` and any errors

**Header actions**: "New Import" button (navigates to / focuses the New Import tab)

---

## 4. User Flows

### Flow 1: Import from a Known SA School System (d6 Connect, Karri, or ADAM)

1. Admin navigates to `/admin/migration`.
2. Clicks "New Import".
3. **Step 1 — Select Source**: Admin selects `d6_connect` from the source system dropdown. A description explains that d6 Connect uses the "Learner Export" CSV format and that mappings are pre-configured.
4. **Step 2 — Upload File**: Admin drags-and-drops or selects `learners_export_2026.csv`. The frontend uploads the file to cloud storage (out-of-scope file upload service), receives back a URL, then calls `POST /api/migration/upload` with `{ schoolId, sourceSystem: "d6_connect", originalName, fileUrl, fileSize }`. HTTP 201 response returns the new job with the auto-populated `mapping`.
5. The wizard advances to Step 3 with the `jobId` captured in the migration store.
6. **Step 3 — Map Columns**: The `ColumnMapper` component renders the pre-built mapping. Each row shows source column → target field. Admin reviews and may adjust any mappings. On "Save Mapping", frontend calls `PUT /api/migration/:jobId/mapping` with the current mapping state.
7. **Step 4 — Validate**: Admin clicks "Run Validation". Frontend calls `GET /api/migration/:jobId/validate`. The `ValidationResults` component renders: total rows, valid rows, duplicate count, invalid rows count, and an error list table. If there are no blocking errors (no `row === 0` errors), the "Continue to Preview" button is enabled.
8. **Step 5 — Preview**: Frontend calls `GET /api/migration/:jobId/preview`. The preview table shows up to 10 sample rows using target field names as column headers. Admin confirms the data looks correct.
9. **Step 6 — Import**: Admin clicks "Start Import". A confirmation dialog warns that this will create student, parent, staff, and grade records. On confirm, frontend calls `POST /api/migration/:jobId/execute`. An `ImportProgress` component polls `GET /api/migration/:jobId/status` every 3 seconds while `status === "importing"`. When `status === "completed"`, the results panel shows: students created, parents created, staff created, grades created, skipped (duplicates), and any row-level errors.
10. Admin is prompted to view the Import History tab or navigate to the Students page to review the imported records.

---

### Flow 2: Import from a Generic CSV or Excel File

1. Admin selects `csv` or `excel` as the source system in Step 1.
2. In Step 2, the admin uploads the file. The backend creates a job with an empty `mapping` (`{}`).
3. In Step 3, the `ColumnMapper` component detects an empty mapping and shows all source column headers (parsed from the uploaded file by the frontend or returned via the preview endpoint). Admin must manually select the target field for each source column using dropdowns. Required fields (`firstName`, `lastName`) are highlighted.
4. Admin clicks "Save Mapping" to call `PUT /api/migration/:jobId/mapping`.
5. Steps 4–6 follow the same path as Flow 1.

---

### Flow 3: Fixing Validation Errors

1. After running validation (Step 4), the `ValidationResults` component shows a non-zero `invalidRows` count and a list of errors with row number, field name, and message.
2. Admin reviews the errors. Common issues: missing `firstName`/`lastName` mapping (row 0 errors), invalid SA ID format, missing required fields in specific rows.
3. For mapping-level errors (row 0), admin clicks "Back to Mapping" to return to Step 3 and correct the mapping.
4. For row-level data errors (row > 0), the admin can choose to: (a) accept that those rows will be skipped during import, or (b) download the file, fix the data, and restart with a new upload.
5. Once mapping-level errors are resolved, admin re-runs validation. If `validationResults.errors` contains no `row === 0` entries, the import can proceed.

---

### Flow 4: Viewing Import History

1. Admin navigates to the Import History tab on `/admin/migration`.
2. Frontend calls `GET /api/migration/history` with default pagination and the admin's `schoolId`.
3. The history table renders all past jobs, sorted by most recent first.
4. Admin filters by status (e.g. "failed") to review problematic imports.
5. Admin clicks on a completed job row. A slide-over or modal shows the full `importResults` object: entity creation counts and any per-row import errors.

---

### Flow 5: Using and Applying a Template

1. On Step 3 (Map Columns), there is a "Load Template" button.
2. Frontend calls `GET /api/migration/templates?sourceSystem=csv&entityType=student`.
3. A `TemplateSelector` dialog lists available templates.
4. Admin selects a template. The `ColumnMapper` pre-populates from the template's `fieldMappings` array.
5. Admin can further adjust the mapping before saving.

---

## 5. Data Models

### MigrationJob (Mongoose Schema)

Collection: `migrationjobs`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `schoolId` | ObjectId (ref: School) | yes | — | Tenant scoping key |
| `status` | String enum | no | `'pending'` | `'pending' \| 'validating' \| 'importing' \| 'completed' \| 'failed'` |
| `sourceSystem` | String enum | yes | — | `'d6_connect' \| 'karri' \| 'adam' \| 'schooltool' \| 'excel' \| 'csv'` |
| `uploadedFile` | Object (uploadedFileSchema) | yes | — | Subdocument, no `_id` |
| `uploadedFile.originalName` | String | yes | — | Original filename |
| `uploadedFile.fileUrl` | String | yes | — | URL to stored file |
| `uploadedFile.fileSize` | Number | yes | — | File size in bytes |
| `mapping` | Mixed (Record\<string, string\>) | no | `{}` | Source-column-name → target-field-name map |
| `validationResults` | Object (validationResultsSchema) | no | — | Populated after validate step |
| `validationResults.totalRows` | Number | yes (if set) | — | Total rows parsed from file |
| `validationResults.validRows` | Number | yes (if set) | — | Rows that pass all checks |
| `validationResults.invalidRows` | Number | yes (if set) | — | Rows with validation errors |
| `validationResults.duplicates` | Number | yes (if set) | — | Rows already present in the system |
| `validationResults.errors` | Array (validationErrorSchema) | no | `[]` | Per-row and per-field error list |
| `importResults` | Object (importResultsSchema) | no | — | Populated after execute step |
| `importResults.studentsCreated` | Number | no | `0` | Count of new Student documents |
| `importResults.parentsCreated` | Number | no | `0` | Count of new Parent/User documents |
| `importResults.staffCreated` | Number | no | `0` | Count of new Staff/User documents |
| `importResults.gradesCreated` | Number | no | `0` | Count of new Grade documents |
| `importResults.skipped` | Number | no | `0` | Rows skipped (duplicates) |
| `importResults.errors` | Array (validationErrorSchema) | no | `[]` | Row-level import errors |
| `startedAt` | Date | no | — | Set when validation begins |
| `completedAt` | Date | no | — | Set when import completes or fails |
| `performedBy` | ObjectId (ref: User) | yes | — | User who initiated the job |
| `isDeleted` | Boolean | no | `false` | Soft-delete flag |
| `createdAt` | Date | — | auto | Mongoose timestamps |
| `updatedAt` | Date | — | auto | Mongoose timestamps |

**Indexes**: `{ schoolId: 1, createdAt: -1 }`, `{ status: 1 }`

---

### ValidationError (embedded subdocument)

| Field | Type | Required | Notes |
|---|---|---|---|
| `row` | Number | yes | `0` = mapping/config-level error; `> 0` = data row number |
| `field` | String | yes | Target field name (e.g. `firstName`, `saIdNumber`) |
| `message` | String | yes | Human-readable error description |

**Critical error convention**: An error with `row === 0` is a configuration-level blocker. The execute endpoint refuses to run if any `row === 0` errors are present in `validationResults.errors`.

---

### MigrationTemplate (Mongoose Schema)

Collection: `migrationtemplates`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `sourceSystem` | String enum | yes | — | Same enum as MigrationJob |
| `entityType` | String enum | yes | — | `'student' \| 'parent' \| 'staff' \| 'grade' \| 'fee'` |
| `fieldMappings` | Array (fieldMappingSchema) | yes | — | At least one entry required |
| `fieldMappings[].sourceField` | String | yes | — | Column name in the source file; trimmed |
| `fieldMappings[].targetField` | String | yes | — | Campusly field name; trimmed |
| `fieldMappings[].transform` | String | no | — | Optional transform hint (e.g. `'parseDate'`, `'lowercase'`) |
| `isDefault` | Boolean | no | `false` | Whether this is the default template for the source+entity pair |
| `isDeleted` | Boolean | no | `false` | Soft-delete flag |
| `createdAt` | Date | — | auto | Mongoose timestamps |
| `updatedAt` | Date | — | auto | Mongoose timestamps |

**Index**: `{ sourceSystem: 1, entityType: 1 }`

---

### Built-in Source Mappings (Service Constants)

The service contains three hard-coded field mapping sets used for auto-population on job creation:

**D6_STUDENT_MAPPINGS** (`sourceSystem: 'd6_connect'`):

| Source Field | Target Field | Transform |
|---|---|---|
| `Learner Name` | `firstName` | — |
| `Learner Surname` | `lastName` | — |
| `ID Number` | `saIdNumber` | — |
| `Date of Birth` | `dateOfBirth` | `parseDate` |
| `Grade` | `grade` | — |
| `Class` | `class` | — |
| `Gender` | `gender` | `lowercase` |
| `Home Language` | `homeLanguage` | — |
| `Admission Number` | `admissionNumber` | — |

**KARRI_STUDENT_MAPPINGS** (`sourceSystem: 'karri'`):

| Source Field | Target Field | Transform |
|---|---|---|
| `first_name` | `firstName` | — |
| `last_name` | `lastName` | — |
| `id_number` | `saIdNumber` | — |
| `dob` | `dateOfBirth` | `parseDate` |
| `grade_name` | `grade` | — |
| `class_name` | `class` | — |
| `gender` | `gender` | `lowercase` |
| `parent_email` | `parentEmail` | — |
| `parent_phone` | `parentPhone` | — |

**ADAM_STUDENT_MAPPINGS** (`sourceSystem: 'adam'`):

| Source Field | Target Field | Transform |
|---|---|---|
| `FirstName` | `firstName` | — |
| `Surname` | `lastName` | — |
| `IDNumber` | `saIdNumber` | — |
| `DateOfBirth` | `dateOfBirth` | `parseDate` |
| `GradeName` | `grade` | — |
| `ClassName` | `class` | — |
| `Sex` | `gender` | `lowercase` |
| `AdmissionNo` | `admissionNumber` | — |
| `LURITSNo` | `luritsNumber` | — |

`schooltool`, `excel`, and `csv` have no pre-built mappings — the `mapping` object is initialised as `{}` and the admin must configure it manually.

---

### SA ID Number Validation

The service includes an `isValidSaId(id: string): boolean` function implementing the Luhn-variant algorithm used for South African ID numbers:

- Must be exactly 13 digits
- Alternating digit sum using the Luhn algorithm (even-position digits added directly; odd-position digits doubled, then if > 9 subtract 9)
- The 13th digit is the check digit: `(10 - (sum % 10)) % 10`

This is applied row-by-row during validation when `saIdNumber` is present in the job's `mapping` values.

---

### Frontend TypeScript Interface

The following interfaces should be created in `src/types/index.ts` or a dedicated `src/types/migration.ts`:

```ts
export type SourceSystem = 'd6_connect' | 'karri' | 'adam' | 'schooltool' | 'excel' | 'csv';
export type MigrationStatus = 'pending' | 'validating' | 'importing' | 'completed' | 'failed';
export type EntityType = 'student' | 'parent' | 'staff' | 'grade' | 'fee';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResults {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: number;
  errors: ValidationError[];
}

export interface ImportResults {
  studentsCreated: number;
  parentsCreated: number;
  staffCreated: number;
  gradesCreated: number;
  skipped: number;
  errors: ValidationError[];
}

export interface UploadedFile {
  originalName: string;
  fileUrl: string;
  fileSize: number;
}

export interface MigrationJob {
  _id: string;
  schoolId: string;
  status: MigrationStatus;
  sourceSystem: SourceSystem;
  uploadedFile: UploadedFile;
  mapping: Record<string, string>;
  validationResults?: ValidationResults;
  importResults?: ImportResults;
  startedAt?: string;
  completedAt?: string;
  performedBy: string | { _id: string; firstName: string; lastName: string; email: string };
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

export interface MigrationTemplate {
  _id: string;
  sourceSystem: SourceSystem;
  entityType: EntityType;
  fieldMappings: FieldMapping[];
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MigrationPreview {
  mapping: Record<string, string>;
  sampleRows: Record<string, string>[];
}
```

---

## 6. State Management

### `useMigrationStore` (Zustand)

**File to create**: `src/stores/useMigrationStore.ts`

**State shape**:

```ts
interface MigrationStore {
  // Active wizard job
  activeJob: MigrationJob | null;
  activeJobLoading: boolean;
  activeJobError: string | null;

  // Wizard step
  wizardStep: 1 | 2 | 3 | 4 | 5 | 6;

  // Preview data
  preview: MigrationPreview | null;
  previewLoading: boolean;

  // Job history
  jobs: MigrationJob[];
  jobsTotal: number;
  jobsPage: number;
  jobsLimit: number;
  jobsStatusFilter: MigrationStatus | '';
  jobsLoading: boolean;
  jobsError: string | null;

  // Templates
  templates: MigrationTemplate[];
  templatesLoading: boolean;

  // Actions
  uploadFile: (payload: UploadFileInput) => Promise<MigrationJob>;
  validateJob: (jobId: string) => Promise<MigrationJob>;
  getPreview: (jobId: string) => Promise<void>;
  updateMapping: (jobId: string, mapping: Record<string, string>) => Promise<MigrationJob>;
  executeImport: (jobId: string) => Promise<MigrationJob>;
  pollStatus: (jobId: string) => Promise<MigrationJob>;
  fetchHistory: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
  fetchTemplates: (sourceSystem?: string, entityType?: string) => Promise<void>;
  setActiveJob: (job: MigrationJob | null) => void;
  setWizardStep: (step: 1 | 2 | 3 | 4 | 5 | 6) => void;
  setJobsStatusFilter: (status: MigrationStatus | '') => void;
  resetWizard: () => void;
}
```

**Key behaviours**:

- `uploadFile` calls `POST /api/migration/upload`, stores the returned job in `activeJob`, and advances `wizardStep` to 3.
- `validateJob` calls `GET /api/migration/:jobId/validate`, updates `activeJob` with the response (which includes `validationResults`), and advances `wizardStep` to 5 if no blocking errors (no `row === 0` errors in `validationResults.errors`).
- `getPreview` calls `GET /api/migration/:jobId/preview` and stores the result in `preview`.
- `updateMapping` calls `PUT /api/migration/:jobId/mapping` and updates `activeJob.mapping` in the store.
- `executeImport` calls `POST /api/migration/:jobId/execute`, updates `activeJob`, and begins polling via `pollStatus`.
- `pollStatus` calls `GET /api/migration/:jobId/status` and updates `activeJob`. The page component sets up a polling interval (e.g. every 3 seconds) when `activeJob.status === 'importing'`, calling `pollStatus` on each tick and clearing the interval when status changes to `completed` or `failed`.
- `fetchHistory` calls `GET /api/migration/history` with the current filter/pagination state and populates `jobs`.
- `resetWizard` clears `activeJob`, `preview`, and resets `wizardStep` to 1.
- `schoolId` for the `uploadFile` payload is read from `useAuthStore().user?.schoolId`.

---

## 7. Components Needed

### Page-level component

| Component | File | Purpose |
|---|---|---|
| `AdminMigrationPage` | `src/app/(dashboard)/admin/migration/page.tsx` | Top-level page; renders `PageHeader`, tabs, wizard, and history table |

---

### Wizard components

| Component | File | Purpose |
|---|---|---|
| `MigrationWizard` | `src/components/migration/MigrationWizard.tsx` | Step controller; renders the correct step component based on `wizardStep` from the store; shows step progress indicator |
| `StepSourceSelect` | `src/components/migration/StepSourceSelect.tsx` | Step 1 — `Select` dropdown for `sourceSystem` with human-readable labels and short descriptions per system |
| `FileUploadZone` | `src/components/migration/FileUploadZone.tsx` | Step 2 — drag-and-drop or click-to-browse area; handles client-side file upload to storage and calls `uploadFile` from the store; shows file name and size after selection |
| `ColumnMapper` | `src/components/migration/ColumnMapper.tsx` | Step 3 — table of rows, each row showing: source column name (left), arrow (→), target field `Select` dropdown (right). Required targets (`firstName`, `lastName`) are marked with a red asterisk. Has a "Load Template" button. Calls `updateMapping` on save |
| `TemplateSelector` | `src/components/migration/TemplateSelector.tsx` | Dialog triggered from `ColumnMapper`; lists available templates for the current source system; calls `fetchTemplates`; on select, passes the template's `fieldMappings` back to `ColumnMapper` |
| `ValidationResults` | `src/components/migration/ValidationResults.tsx` | Step 4 — summary stats (total, valid, invalid, duplicate counts) rendered as stat cards; error list table with columns: Row, Field, Message; "Run Validation" button that calls `validateJob`; "Back to Mapping" button if blocking errors present |
| `DataPreviewTable` | `src/components/migration/DataPreviewTable.tsx` | Step 5 — table rendering `sampleRows` from the preview response; column headers are the mapped target field names |
| `ImportExecute` | `src/components/migration/ImportExecute.tsx` | Step 6 — confirmation summary (validation stats, source system, file name); "Start Import" button with confirmation dialog; `ImportProgress` shown while status is `importing`; `ImportResultsPanel` shown on completion |
| `ImportProgress` | `src/components/migration/ImportProgress.tsx` | Animated progress indicator shown while `activeJob.status === 'importing'`; polls status and shows live status text |
| `ImportResultsPanel` | `src/components/migration/ImportResultsPanel.tsx` | Shows final counts (studentsCreated, parentsCreated, staffCreated, gradesCreated, skipped) as stat cards plus an error table if `importResults.errors.length > 0` |

---

### History components

| Component | File | Purpose |
|---|---|---|
| `JobHistoryTable` | `src/components/migration/JobHistoryTable.tsx` | `DataTable` wrapper for migration job history; columns: File Name, Source System, Status badge, Total Rows, Records Created, Performed By, Date; status filter dropdown header; row click opens `JobDetailDialog` |
| `JobDetailDialog` | `src/components/migration/JobDetailDialog.tsx` | Dialog showing full `validationResults` and `importResults` for a selected job; includes error table if applicable |

---

### Shared components reused from the existing library

| Component | File | Used for |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader.tsx` | Page title and "New Import" action button |
| `StatCard` | `src/components/shared/StatCard.tsx` | Validation and import result counts |
| `DataTable` | `src/components/shared/DataTable.tsx` | Base for `JobHistoryTable` and error lists |
| `Badge` | `src/components/ui/badge.tsx` | Job status badges |
| `Button` | `src/components/ui/button.tsx` | All actions |
| `Select` | `src/components/ui/select.tsx` | Source system selector and column mapping dropdowns |
| `Tabs` | `src/components/ui/tabs.tsx` | "New Import" / "Import History" top-level tabs |
| `Dialog` | `src/components/ui/dialog.tsx` | Import confirmation and job detail dialogs |
| `Card` | `src/components/ui/card.tsx` | Step containers, result panels |

---

## 8. Integration Notes

### Student module

The primary output of the import pipeline is Student documents. The `executeImport` service method creates Student records from valid rows. The `admissionNumber`, `saIdNumber`, `luritsNumber` (ADAM-specific) fields flow directly into the Student schema. After a completed migration, the Students page (`/admin/students`) should reflect the newly created records immediately.

### Parent module

Rows that include `parentEmail` or `parentPhone` (present in the Karri mapping) are used to create linked Parent/User documents. The parent `userId` is associated with the student record at creation time.

### Staff module

If `entityType` is set to `staff` in a template, the import creates Staff documents. The current service's `executeImport` uses `staffCreated` in `importResults`, indicating the pipeline supports staff import in addition to students.

### Grades / Classes module

The service's `gradesCreated` counter in `importResults` indicates that grade documents are created or referenced as part of the import. The `grade` and `class` target fields in the mapping feed into the academic structure.

### Fee module

The `entityType: 'fee'` value exists in the `MigrationTemplate` schema, indicating future support for bulk fee record import. No service logic is currently implemented for this entity type — it is a planned extension.

### Auth / User module

The `performedBy` field is populated with the user's `firstName`, `lastName`, and `email` via a Mongoose `.populate('performedBy', 'firstName lastName email')` call. The migration store must read `schoolId` from `useAuthStore().user?.schoolId` when constructing the upload payload.

### File storage

The migration module does not handle file storage directly. The `fileUrl` passed to `POST /api/migration/upload` must already be a publicly accessible URL pointing to the uploaded file. The frontend is responsible for uploading the file to the CDN or object storage (e.g. S3, Cloudflare R2) before calling the upload endpoint. The file upload component (`FileUploadZone`) must handle this pre-upload step.

### Status polling

The `GET /api/migration/:jobId/status` endpoint is designed for polling during long-running imports. The frontend should poll every 3 seconds while `status === 'importing'` and stop polling once the status is `completed` or `failed`. A maximum poll timeout (e.g. 10 minutes) should be enforced to prevent runaway polling.

### Soft delete

`MigrationJob` documents are never hard-deleted. The `isDeleted: false` filter is applied in every service query. There is no delete endpoint exposed in the routes — job records are permanent audit entries.

### RBAC

The template creation endpoint (`POST /api/migration/templates`) is restricted to `super_admin` only. This prevents school admins from polluting the global template library. All other endpoints are accessible to both `school_admin` and `super_admin`.

---

## 9. Acceptance Criteria

### API — Upload / create job

- [ ] `POST /api/migration/upload` without authentication returns HTTP 401
- [ ] `POST /api/migration/upload` as `teacher`, `parent`, or `student` role returns HTTP 403
- [ ] `POST /api/migration/upload` with `sourceSystem: "d6_connect"` returns HTTP 201 with `mapping` pre-populated with all 9 D6 field mappings
- [ ] `POST /api/migration/upload` with `sourceSystem: "karri"` returns HTTP 201 with `mapping` pre-populated with all 9 Karri field mappings
- [ ] `POST /api/migration/upload` with `sourceSystem: "adam"` returns HTTP 201 with `mapping` pre-populated with all 9 ADAM field mappings
- [ ] `POST /api/migration/upload` with `sourceSystem: "csv"` returns HTTP 201 with `mapping: {}`
- [ ] `POST /api/migration/upload` missing `schoolId` returns HTTP 400 with validation error
- [ ] `POST /api/migration/upload` with an invalid `schoolId` (not 24 hex chars) returns HTTP 400
- [ ] `POST /api/migration/upload` with `fileSize: 0` or negative returns HTTP 400 ("File size must be positive")
- [ ] Created job has `status: "pending"` and `isDeleted: false`

### API — Validate job

- [ ] `GET /api/migration/:jobId/validate` for a job with no mapping configured returns a validation error: `{ row: 0, field: "mapping", message: "No field mappings configured" }`
- [ ] `GET /api/migration/:jobId/validate` for a job missing `firstName` mapping returns error: `{ row: 0, field: "firstName", message: "Required field 'firstName' is not mapped" }`
- [ ] `GET /api/migration/:jobId/validate` for a job missing `lastName` mapping returns error: `{ row: 0, field: "lastName", message: "Required field 'lastName' is not mapped" }`
- [ ] `GET /api/migration/:jobId/validate` for a fully configured job populates `validationResults` with `totalRows`, `validRows`, `invalidRows`, `duplicates`, and `errors`
- [ ] `GET /api/migration/:jobId/validate` for a job in `importing` or `completed` status returns HTTP 400 ("Job cannot be validated in its current status")
- [ ] `GET /api/migration/:jobId/validate` for a non-existent job returns HTTP 404

### API — Preview

- [ ] `GET /api/migration/:jobId/preview` returns `mapping` and up to 10 `sampleRows`
- [ ] Each sample row is keyed by target field name (not source column name)
- [ ] `GET /api/migration/:jobId/preview` for a non-existent job returns HTTP 404

### API — Update mapping

- [ ] `PUT /api/migration/:jobId/mapping` with a valid mapping object updates `job.mapping` and returns the updated job
- [ ] `PUT /api/migration/:jobId/mapping` with an empty object `{}` returns HTTP 400 ("At least one field mapping is required")
- [ ] `PUT /api/migration/:jobId/mapping` for a job in `completed` or `importing` status returns HTTP 404 (query filter requires `status: "pending"`)
- [ ] `PUT /api/migration/:jobId/mapping` for a non-existent job returns HTTP 404

### API — Execute import

- [ ] `POST /api/migration/:jobId/execute` for a job with valid `validationResults` (no row-0 errors) transitions status to `completed` and populates `importResults`
- [ ] `POST /api/migration/:jobId/execute` for a job with row-0 validation errors returns HTTP 400 ("Job must pass validation before import")
- [ ] `POST /api/migration/:jobId/execute` for a job in `completed` status returns HTTP 400 ("Job must be in pending status to execute import")
- [ ] `importResults.skipped` equals `validationResults.duplicates`
- [ ] `job.completedAt` is set on completion

### API — Status

- [ ] `GET /api/migration/:jobId/status` returns the full job document with `performedBy` populated (firstName, lastName, email)
- [ ] `GET /api/migration/:jobId/status` for a non-existent job returns HTTP 404

### API — History

- [ ] `GET /api/migration/history` returns paginated results with `data`, `total`, `page`, `limit`, `totalPages`
- [ ] `GET /api/migration/history?status=completed` returns only completed jobs
- [ ] `GET /api/migration/history?page=2&limit=5` returns the correct page slice
- [ ] Results default to sorted by `createdAt` descending (`-createdAt`)
- [ ] `performedBy` is populated in all history results

### API — Templates

- [ ] `POST /api/migration/templates` as `school_admin` returns HTTP 403
- [ ] `POST /api/migration/templates` as `super_admin` with valid body returns HTTP 201 and the created template
- [ ] `POST /api/migration/templates` with `fieldMappings: []` returns HTTP 400 ("At least one field mapping is required")
- [ ] `GET /api/migration/templates` returns all non-deleted templates
- [ ] `GET /api/migration/templates?sourceSystem=d6_connect` returns only d6_connect templates
- [ ] `GET /api/migration/templates?sourceSystem=csv&entityType=student` returns only templates matching both filters

### Frontend — Wizard

- [ ] Source system select in Step 1 shows all 6 options with human-readable labels
- [ ] After selecting a known source system (d6_connect, karri, adam) and uploading a file, Step 3 pre-populates the column mapper with the auto-applied mapping
- [ ] After selecting `csv` or `excel`, Step 3 shows all source columns as unmapped and requires manual mapping
- [ ] Required fields (`firstName`, `lastName`) are visually highlighted in the column mapper; "Save Mapping" is disabled until both are mapped
- [ ] "Run Validation" button in Step 4 calls `GET /api/migration/:jobId/validate` and displays results
- [ ] If row-0 errors are present, "Continue to Preview" is disabled and "Back to Mapping" is shown
- [ ] Step 5 shows a table with up to 10 sample rows using target field names as headers
- [ ] "Start Import" in Step 6 shows a confirmation dialog before calling execute
- [ ] After execute, an animated progress indicator appears while `status === "importing"`
- [ ] When import completes, the results panel shows all entity counts and any errors
- [ ] "New Import" button resets the wizard to Step 1 (calls `resetWizard` in the store)

### Frontend — History tab

- [ ] History tab loads on mount and calls `GET /api/migration/history` with the school's `schoolId`
- [ ] Status filter dropdown updates the displayed list
- [ ] Clicking a job row opens a dialog showing `validationResults` and `importResults`
- [ ] Job status is shown as a colour-coded badge: pending (yellow), validating (blue), importing (blue), completed (green), failed (red)

### Frontend — Store

- [ ] `useMigrationStore().activeJob` is set after a successful upload
- [ ] `useMigrationStore().wizardStep` advances correctly through each step
- [ ] Polling stops automatically when `activeJob.status` changes to `completed` or `failed`
- [ ] `resetWizard` clears `activeJob`, `preview`, and resets `wizardStep` to 1
- [ ] All API errors display a destructive toast via Sonner and do not advance the wizard step
