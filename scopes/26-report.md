# 26 — Report Module

## 1. Module Overview

The Report module is a read-only analytics and reporting layer that aggregates data from six other Campusly modules — Academic, Attendance, Fee, TuckShop, Homework, and Event — to produce school-level and student-level insights. It has no model of its own; every response is computed via MongoDB aggregation pipelines or populated queries at request time.

The module serves two distinct audiences:

- **School admin / super admin**: School-wide dashboards, financial summaries, revenue trends, attendance breakdowns, academic performance by subject, debtor ageing tables, and tuck shop sales analytics.
- **Teacher**: Per-student report cards and per-class performance breakdowns scoped to the teacher's assigned classes. (The teacher-facing frontend page is registered in navigation but the directory is currently empty — it is a planned surface.)

All seven REST endpoints (plus two additional service methods that have no routes yet) are mounted under `/api/reports`. There is no model file; the service imports from `Student`, `Invoice`, `Payment`, `Attendance`, `Discipline`, `Merit`, `Mark`, `Assessment`, `Subject`, `Class`, `Grade`, `TuckShopOrder`, `Homework`, `HomeworkSubmission`, `Event`, and `Wallet`.

---

## 2. Backend API Endpoints

All endpoints are mounted at `/api/reports`. Every endpoint requires `authenticate` middleware. Roles are enforced via `authorize`.

---

### GET /api/reports/dashboard

Returns five key performance indicators for the current calendar month, used to populate the Admin Dashboard stat cards.

**Auth**: `super_admin`, `school_admin`

**Query parameters**:

| Parameter  | Type   | Required | Description                                              |
|------------|--------|----------|----------------------------------------------------------|
| `schoolId` | string | No       | 24-char ObjectId. Defaults to `req.user.schoolId`.       |

**Response shape**:

```json
{
  "success": true,
  "message": "Dashboard stats retrieved successfully",
  "data": {
    "totalStudents": 312,
    "totalRevenueThisMonth": 184500,
    "feeCollectionRate": 76.42,
    "attendanceRate": 91.08,
    "outstandingFees": 56700
  }
}
```

**Computation details**:
- `totalStudents` — count of `Student` documents where `enrollmentStatus: "active"` and `isDeleted: false`.
- `totalRevenueThisMonth` — sum of `Payment.amount` for payments whose `createdAt` falls within the current calendar month.
- `feeCollectionRate` — `(sum of Invoice.paidAmount / sum of Invoice.totalAmount) * 100`, rounded to 2 decimal places, across all non-deleted invoices regardless of date.
- `attendanceRate` — `(present records / total records) * 100` for `Attendance` records in the current calendar month.
- `outstandingFees` — sum of `(Invoice.totalAmount - Invoice.paidAmount)` for invoices with `status` not in `["paid", "cancelled"]`.

**Example response** (see shape above).

---

### GET /api/reports/revenue

Returns monthly revenue totals grouped by year and month, optionally filtered by date range.

**Auth**: `super_admin`, `school_admin`

**Query parameters**:

| Parameter   | Type             | Required | Description                                              |
|-------------|------------------|----------|----------------------------------------------------------|
| `schoolId`  | string           | No       | 24-char ObjectId. Defaults to `req.user.schoolId`.       |
| `startDate` | ISO 8601 string  | No       | Inclusive lower bound on `Payment.createdAt`.            |
| `endDate`   | ISO 8601 string  | No       | Inclusive upper bound on `Payment.createdAt`.            |

**Response shape**:

```json
{
  "success": true,
  "message": "Revenue report retrieved successfully",
  "data": [
    { "month": 1, "year": 2026, "total": 92000 },
    { "month": 2, "year": 2026, "total": 108750 },
    { "month": 3, "year": 2026, "total": 184500 }
  ]
}
```

- Results are sorted ascending by year then month.
- `total` is the sum of `Payment.amount` for the given month/year bucket (in the school's base currency unit, matching the Fee module — cents or minor currency unit).

---

### GET /api/reports/attendance

Returns attendance record counts grouped by status, optionally filtered by date range, grade, or class.

**Auth**: `super_admin`, `school_admin`

**Query parameters**:

| Parameter   | Type            | Required | Description                                              |
|-------------|-----------------|----------|----------------------------------------------------------|
| `schoolId`  | string          | No       | 24-char ObjectId. Defaults to `req.user.schoolId`.       |
| `startDate` | ISO 8601 string | No       | Inclusive lower bound on `Attendance.date`.              |
| `endDate`   | ISO 8601 string | No       | Inclusive upper bound on `Attendance.date`.              |
| `gradeId`   | string          | No       | 24-char ObjectId. Declared in validation but not yet applied as a filter in the aggregation pipeline (classId filter is applied; gradeId requires a lookup join — currently a gap). |
| `classId`   | string          | No       | 24-char ObjectId. Filters `Attendance` records by class. |

**Response shape**:

```json
{
  "success": true,
  "message": "Attendance report retrieved successfully",
  "data": [
    { "status": "present", "count": 4821 },
    { "status": "absent",  "count": 312  },
    { "status": "late",    "count": 94   },
    { "status": "excused", "count": 41   }
  ]
}
```

- Possible `status` values: `"present"`, `"absent"`, `"late"`, `"excused"`.
- Each object represents one distinct status and its total count over the filtered period.

**Note on `gradeId`**: The validation schema accepts `gradeId` but the service aggregation does not yet apply it. Only `classId` is wired through. This is a known gap.

---

### GET /api/reports/academic-performance

Returns average mark percentage per subject across the school, optionally scoped to a term and academic year.

**Auth**: `super_admin`, `school_admin`

**Query parameters**:

| Parameter      | Type    | Required | Description                                             |
|----------------|---------|----------|---------------------------------------------------------|
| `schoolId`     | string  | No       | 24-char ObjectId. Defaults to `req.user.schoolId`.      |
| `term`         | integer | No       | Term number 1–4.                                        |
| `academicYear` | integer | No       | Four-digit year, e.g. `2026`.                           |

**Response shape**:

```json
{
  "success": true,
  "message": "Academic performance report retrieved successfully",
  "data": [
    {
      "subjectId": "64a1f2...",
      "subjectName": "Mathematics",
      "subjectCode": "MATH",
      "averagePercentage": 68.42,
      "totalMarks": 287
    },
    {
      "subjectId": "64a1f3...",
      "subjectName": "English Home Language",
      "subjectCode": "EHL",
      "averagePercentage": 74.10,
      "totalMarks": 291
    }
  ]
}
```

- Results are sorted alphabetically by `subjectName`.
- `averagePercentage` is rounded to 2 decimal places.
- `totalMarks` is the number of individual mark records contributing to the average.

---

### GET /api/reports/student-report-card/:studentId

Returns all mark records for a specific student in a specific term and academic year, with assessment and subject details populated.

**Auth**: `super_admin`, `school_admin`, `teacher`

**Path parameters**:

| Parameter   | Type   | Required | Description                  |
|-------------|--------|----------|------------------------------|
| `studentId` | string | Yes      | 24-char ObjectId of student. |

**Query parameters**:

| Parameter      | Type    | Required | Description                    |
|----------------|---------|----------|--------------------------------|
| `term`         | integer | Yes      | Term number 1–4. Returns `400` if missing. |
| `academicYear` | integer | Yes      | Four-digit year. Returns `400` if missing. |

**Response shape**:

```json
{
  "success": true,
  "message": "Student report card retrieved successfully",
  "data": {
    "studentId": "64b3a1...",
    "term": 1,
    "academicYear": 2026,
    "marks": [
      {
        "_id": "64c1...",
        "studentId": "64b3a1...",
        "assessmentId": {
          "_id": "64c2...",
          "name": "Term 1 Maths Exam",
          "type": "exam",
          "term": 1,
          "academicYear": 2026,
          "totalMarks": 100,
          "weight": 40,
          "subjectId": {
            "_id": "64a1f2...",
            "name": "Mathematics",
            "code": "MATH"
          }
        },
        "mark": 78,
        "percentage": 78,
        "comment": "Good effort"
      }
    ]
  }
}
```

- Only marks whose populated `assessmentId` matches the given `term` and `academicYear` are returned. Marks with no matching assessment are filtered out server-side.
- Returns `400 Bad Request` if `term` or `academicYear` query params are absent.

---

### GET /api/reports/debtors

Returns all outstanding (non-paid, non-cancelled) invoices with debtor ageing bucket classification.

**Auth**: `super_admin`, `school_admin`

**Query parameters**:

| Parameter  | Type   | Required | Description                                              |
|------------|--------|----------|----------------------------------------------------------|
| `schoolId` | string | No       | 24-char ObjectId. Defaults to `req.user.schoolId`.       |

**Response shape**:

```json
{
  "success": true,
  "message": "Debtors report retrieved successfully",
  "data": [
    {
      "invoiceId": "64d1...",
      "invoiceNumber": "INV-2026-0042",
      "studentId": { "_id": "64b3a1...", "admissionNumber": "STU001", "..." : "..." },
      "totalAmount": 12000,
      "paidAmount": 3000,
      "outstanding": 9000,
      "ageDays": 45,
      "bucket": "31-60"
    }
  ]
}
```

- `ageDays` is the number of calendar days since `Invoice.dueDate` (floored, minimum 0). Invoices not yet past due will have `ageDays: 0` and `bucket: "0-30"`.
- `bucket` values: `"0-30"`, `"31-60"`, `"61-90"`, `"90+"`.
- `studentId` is a populated `Student` document (full document, as returned by Mongoose `.populate("studentId")`).

**Note**: A richer ageing report is also available via `ReportService.getDebtorsAgeingReport()`, which adds a `buckets` summary object and deeper student name population (`userId.firstName`, `userId.lastName`). This service method has no dedicated route as of the current codebase.

---

### GET /api/reports/tuck-shop-sales

Returns tuck shop order totals grouped by a configurable time period, optionally filtered by date range.

**Auth**: `super_admin`, `school_admin`

**Query parameters**:

| Parameter   | Type            | Required | Description                                                                   |
|-------------|-----------------|----------|-------------------------------------------------------------------------------|
| `schoolId`  | string          | No       | 24-char ObjectId. Defaults to `req.user.schoolId`.                            |
| `period`    | string          | No       | `"daily"` (default), `"weekly"`, or `"monthly"`.                              |
| `startDate` | ISO 8601 string | No       | Inclusive lower bound on `TuckShopOrder.createdAt`.                           |
| `endDate`   | ISO 8601 string | No       | Inclusive upper bound on `TuckShopOrder.createdAt`.                           |

**Response shape — daily**:

```json
{
  "success": true,
  "message": "Tuck shop sales report retrieved successfully",
  "data": [
    {
      "period": { "year": 2026, "month": 3, "day": 28 },
      "totalSales": 3450,
      "orderCount": 47
    },
    {
      "period": { "year": 2026, "month": 3, "day": 29 },
      "totalSales": 2890,
      "orderCount": 39
    }
  ]
}
```

**Response shape — weekly**:

```json
{
  "data": [
    {
      "period": { "year": 2026, "week": 13 },
      "totalSales": 14200,
      "orderCount": 189
    }
  ]
}
```

**Response shape — monthly**:

```json
{
  "data": [
    {
      "period": { "year": 2026, "month": 3 },
      "totalSales": 58600,
      "orderCount": 781
    }
  ]
}
```

- Results are sorted ascending by period fields.
- `totalSales` is the sum of `TuckShopOrder.totalAmount` in the school's currency minor unit.

---

### Service methods without routes (not yet wired)

The following methods exist on `ReportService` but have no corresponding route in `routes.ts`. They must be routed before they can be called from the frontend.

| Method                              | Description                                                                                  |
|-------------------------------------|----------------------------------------------------------------------------------------------|
| `getComprehensiveDashboard(schoolId)` | Extended dashboard that also returns today's tuck shop sales/orders, upcoming event count, and overdue homework count. Attendance rate includes `"late"` as present. |
| `getStudentFullReport(studentId)`   | Full per-student profile: grades, attendance stats (year-to-date), merit/demerit behaviour points, wallet balance, and homework submission stats. |
| `getClassPerformance(classId)`      | Class-level subject averages and assessment count. Designed for the teacher-facing report surface. |
| `getMonthlyFinancialSummary(schoolId, year?, month?)` | Payments broken down by payment method, total invoiced vs paid, and tuck shop revenue for a specific month. |
| `getSubjectPerformance(schoolId, term?, academicYear?)` | Per-subject per-grade average percentage. Cross-grade subject comparison table. |
| `getDebtorsAgeingReport(schoolId)`  | Enhanced debtors report with `totalOutstanding`, `buckets` summary object (total outstanding per bucket), and fully populated student names. |

---

## 3. Frontend Pages

### Admin — `/admin/reports`

**File**: `src/app/(dashboard)/admin/reports/page.tsx`

A static hub page rendered as a responsive card grid (2 columns on `sm`, 3 on `lg`). Each card presents one report category with an icon, title, description, and a "Generate" button. No API calls are made on this page; the "Generate" button currently fires a `toast.success()` stub — API integration and drill-down sub-pages are not yet implemented.

**Report cards displayed**:

| Title                  | Icon         | Description summary                                          |
|------------------------|--------------|--------------------------------------------------------------|
| Financial Summary      | DollarSign   | Revenue, collections, outstanding fees, payment trends       |
| Academic Performance   | GraduationCap| Results by grade, class, subject; averages and pass rates    |
| Attendance Report      | UserCheck    | By grade, class, student; chronic absenteeism highlighting   |
| Debtor Analysis        | AlertCircle  | Ageing analysis with parent contacts and payment history     |
| Tuckshop Sales         | ShoppingBag  | Daily/weekly/monthly sales, top items, revenue trends        |

**State**: No server state. Local no-op handler only.

---

### Admin Dashboard — `/admin`

**File**: `src/app/(dashboard)/admin/page.tsx`

Consumes `GET /api/reports/dashboard` directly. Renders four `StatCard` components (Total Students, Revenue Collected, Collection Rate, Attendance Rate) and three Recharts charts:

- `LineChartComponent` — Revenue Trend (xKey: `"month"`, lines: `collected`, `outstanding`)
- `PieChartComponent` — Fee Status breakdown
- `BarChartComponent` — Attendance by Grade (xKey: `"grade"`, bar: `rate`)

The dashboard endpoint currently returns only the five flat stats. The chart data fields (`revenueData`, `attendanceByGrade`, `feeStatus`) referenced in the frontend are not yet returned by the backend — these chart panels will render empty until the backend is extended.

---

### Teacher — `/teacher/reports`

**File**: `src/app/(dashboard)/teacher/reports/` — directory exists, no `page.tsx` present.

The route is registered in `TEACHER_NAV` (constants.ts line 185) and in `ROUTES.TEACHER_REPORTS`. The surface is planned for teacher-specific views: per-class performance via `getClassPerformance()` and per-student report cards via `GET /api/reports/student-report-card/:studentId`. Implementation is pending.

---

## 4. User Flows

### 4.1 Admin views dashboard KPIs

1. Admin navigates to `/admin`.
2. Page mounts and fires `GET /api/reports/dashboard` (no query params — `schoolId` resolved server-side from JWT).
3. Backend runs five parallel MongoDB aggregations (student count, month-to-date payments, all-time fee collection rate, month-to-date attendance, outstanding invoices).
4. Response populates four `StatCard` components.
5. Chart panels (`revenueData`, `attendanceByGrade`, `feeStatus`) remain empty until the dashboard endpoint is extended.

---

### 4.2 Admin generates a report from the Reports hub

1. Admin navigates to `/admin/reports`.
2. Page renders five report category cards (static, no API call).
3. Admin clicks "Generate" on a card (e.g. Attendance Report).
4. Current behaviour: `toast.success("Generating Attendance Report...")` fires — no navigation or API call occurs.
5. **Planned behaviour**: button should navigate to a drill-down sub-page (e.g. `/admin/reports/attendance`) where filters are applied and the relevant endpoint is called.

---

### 4.3 Admin filters attendance report by class and date range

_Planned flow (endpoint exists, UI not built):_

1. Admin navigates to `/admin/reports/attendance`.
2. Page renders `DateRangePicker` and `ClassSelector` filter controls.
3. Admin selects a date range and optionally a class.
4. Frontend calls `GET /api/reports/attendance?startDate=...&endDate=...&classId=...`.
5. Backend filters `Attendance` records by `classId` and date range, groups by status.
6. Response renders as a `PieChartComponent` (status distribution) or `BarChartComponent` (status counts).
7. Admin clicks "Export CSV" — frontend serialises the response array to CSV and triggers a browser download.

---

### 4.4 Admin views student report card (teacher also)

_Planned flow (endpoint exists, UI not built):_

1. Admin or teacher navigates to a student profile or the report card sub-page.
2. UI renders term selector (1–4) and academic year input.
3. On submit, frontend calls `GET /api/reports/student-report-card/:studentId?term=1&academicYear=2026`.
4. Backend fetches all `Mark` documents for the student, filters to those whose assessment matches the given term/year.
5. Response renders as a `ReportCardTable` grouped by subject, showing assessment name, marks, percentage, and teacher comment.
6. "Print / Export PDF" button triggers `window.print()` or a server-side PDF generation call.

---

### 4.5 Admin views debtor ageing report

_Planned flow (endpoint exists, UI not built):_

1. Admin navigates to `/admin/reports/debtors` (or the existing `/admin/fees/debtors` page which already calls this data shape — see `DebtorEntry` type).
2. Frontend calls `GET /api/reports/debtors`.
3. Backend fetches all unpaid invoices with populated student, computes `ageDays` and `bucket`.
4. Response renders in an ageing table with columns: Student, Invoice #, Total, Paid, Outstanding, Age (days), Bucket.
5. Rows are colour-coded by bucket severity (green → 0-30, amber → 31-60, orange → 61-90, red → 90+).
6. Admin can filter by bucket or sort by outstanding amount.

---

### 4.6 Admin views tuck shop sales with period toggle

_Planned flow (endpoint exists, UI not built):_

1. Admin navigates to `/admin/reports/tuck-shop-sales`.
2. Page renders period toggle (Daily / Weekly / Monthly) and optional `DateRangePicker`.
3. On change, frontend calls `GET /api/reports/tuck-shop-sales?period=weekly&startDate=...&endDate=...`.
4. Response renders as a `BarChartComponent` or `LineChartComponent` with period on the x-axis and `totalSales` on y-axis.
5. `orderCount` is displayed as a secondary data series or tooltip annotation.

---

### 4.7 Admin views academic performance by subject

_Planned flow (endpoint exists, UI not built):_

1. Admin navigates to `/admin/reports/academic-performance`.
2. Page renders term selector and academic year input.
3. On submit, calls `GET /api/reports/academic-performance?term=1&academicYear=2026`.
4. Response renders as a horizontal `BarChartComponent` (subjects on y-axis, `averagePercentage` on x-axis).
5. Subjects below a configurable pass threshold (e.g. 50%) are highlighted.

---

## 5. Data Models / Response Structures

The Report module has no Mongoose model. All data shapes are computed at request time. The following documents the exact response structures returned by each endpoint.

### DashboardStats

```typescript
{
  totalStudents: number;           // active enrolled students
  totalRevenueThisMonth: number;   // sum of Payment.amount this calendar month
  feeCollectionRate: number;       // percentage, 0–100, 2 dp
  attendanceRate: number;          // percentage, 0–100, 2 dp (present / total * 100)
  outstandingFees: number;         // sum of (totalAmount - paidAmount) on unpaid invoices
}
```

### RevenueDataPoint

```typescript
{
  month: number;   // 1–12
  year: number;    // e.g. 2026
  total: number;   // sum of Payment.amount in minor currency units
}
```

### AttendanceStatusCount

```typescript
{
  status: 'present' | 'absent' | 'late' | 'excused';
  count: number;
}
```

### AcademicPerformanceEntry

```typescript
{
  subjectId: string;           // ObjectId string
  subjectName: string;         // e.g. "Mathematics"
  subjectCode: string;         // e.g. "MATH"
  averagePercentage: number;   // 0–100, 2 dp
  totalMarks: number;          // number of mark records in the average
}
```

### StudentReportCard

```typescript
{
  studentId: string;
  term: number;
  academicYear: number;
  marks: Array<{
    _id: string;
    studentId: string;
    assessmentId: {               // populated Assessment document
      _id: string;
      name: string;
      type: 'test' | 'exam' | 'assignment' | 'project' | 'quiz';
      term: number;
      academicYear: number;
      totalMarks: number;
      weight: number;
      subjectId: {               // populated Subject document
        _id: string;
        name: string;
        code: string;
      };
    };
    mark: number;
    percentage: number;
    comment?: string;
  }>;
}
```

### DebtorEntry (from `/reports/debtors`)

```typescript
{
  invoiceId: string;
  invoiceNumber: string;
  studentId: object;           // populated Student document (full)
  totalAmount: number;         // minor currency units
  paidAmount: number;
  outstanding: number;         // totalAmount - paidAmount
  ageDays: number;             // days since dueDate, min 0
  bucket: '0-30' | '31-60' | '61-90' | '90+';
}
```

### TuckShopSalesEntry

```typescript
{
  period: {
    year: number;
    month?: number;    // present for daily and monthly groupings
    day?: number;      // present for daily grouping only
    week?: number;     // present for weekly grouping only (ISO week number)
  };
  totalSales: number;   // sum of TuckShopOrder.totalAmount
  orderCount: number;
}
```

### Frontend-only types (from `src/types/index.ts`)

The frontend declares two additional report-oriented types that pre-date the API integration and reflect the intended UI shape:

```typescript
// Used in the existing /admin/fees/debtors page (DataTable columns)
interface DebtorEntry {
  parentId: string;
  parentName: string;
  studentName: string;
  grade: string;
  totalOwed: number;   // cents
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120Plus: number;
  lastPaymentDate?: string;
}

// For tuck shop daily summary views
interface DailySalesSummary {
  date: string;
  totalTransactions: number;
  totalRevenue: number;   // cents
  topItems: { name: string; quantity: number; revenue: number }[];
  averageTransaction: number;
}
```

Note: The frontend `DebtorEntry` type uses `days30/60/90/120Plus` field names with 5 separate ageing buckets and parent-centric fields. The backend `/reports/debtors` endpoint returns `bucket` as a string enum. These shapes must be reconciled during integration — either the backend should aggregate by parent or the frontend type must be updated to match the invoice-per-row response.

---

## 6. State Management

The Report module currently has no dedicated Zustand store. State is managed locally with `useState` / `useEffect` in each page component. When drill-down sub-pages are built, the following store structure is recommended.

### Recommended: `useReportStore`

```typescript
interface ReportFilters {
  startDate: string | null;
  endDate: string | null;
  gradeId: string | null;
  classId: string | null;
  term: number | null;
  academicYear: number | null;
  tuckShopPeriod: 'daily' | 'weekly' | 'monthly';
}

interface ReportStore {
  filters: ReportFilters;
  setFilter: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  resetFilters: () => void;

  // Report data cache
  dashboardStats: DashboardStats | null;
  revenueData: RevenueDataPoint[];
  attendanceData: AttendanceStatusCount[];
  academicPerformance: AcademicPerformanceEntry[];
  debtors: DebtorEntry[];
  tuckShopSales: TuckShopSalesEntry[];

  // Loading / error
  loading: boolean;
  error: string | null;

  // Fetch actions
  fetchDashboardStats: () => Promise<void>;
  fetchRevenueReport: () => Promise<void>;
  fetchAttendanceReport: () => Promise<void>;
  fetchAcademicPerformance: () => Promise<void>;
  fetchDebtors: () => Promise<void>;
  fetchTuckShopSales: () => Promise<void>;
}
```

The `filters` object should be shared across all report sub-pages so that date range selections persist when switching between report types. The `tuckShopPeriod` field is specific to the tuck shop report.

### Existing auth store usage

All existing pages that call report endpoints (e.g. `AdminDashboardPage`) retrieve `schoolId` from `useAuthStore` where needed, or rely on the backend fallback to `req.user.schoolId`.

---

## 7. Components Needed

### Page-level components

| Component               | Path (proposed)                                              | Description                                                                                  |
|-------------------------|--------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| `ReportsHubPage`        | `admin/reports/page.tsx` (exists — needs wiring)             | Card grid linking to sub-pages. Replace toast stub with `router.push()`.                     |
| `AttendanceReportPage`  | `admin/reports/attendance/page.tsx`                          | Filters + pie/bar chart of status counts + export button.                                    |
| `RevenueReportPage`     | `admin/reports/revenue/page.tsx`                             | Date range filter + monthly line chart of revenue totals.                                    |
| `AcademicReportPage`    | `admin/reports/academic-performance/page.tsx`                | Term/year filter + horizontal bar chart by subject average.                                  |
| `DebtorsReportPage`     | `admin/reports/debtors/page.tsx`                             | Ageing table with bucket colour coding + export. May share code with `/admin/fees/debtors`.  |
| `TuckShopReportPage`    | `admin/reports/tuck-shop-sales/page.tsx`                     | Period toggle + date range + bar/line chart of sales over time.                              |
| `StudentReportCardPage` | `admin/reports/student-report-card/[studentId]/page.tsx`     | Term/year selectors + grouped marks table + print/export.                                    |
| `TeacherReportsPage`    | `teacher/reports/page.tsx`                                   | Entry point for teacher: links to class performance and student report cards.                |

---

### Reusable components

| Component              | Description                                                                                                      |
|------------------------|------------------------------------------------------------------------------------------------------------------|
| `DateRangePicker`      | Two `<input type="date">` controls (or a calendar popover) that emit ISO 8601 strings. Updates `ReportFilters.startDate` and `endDate`. |
| `TermSelector`         | `<Select>` with options 1–4. Updates `ReportFilters.term`.                                                       |
| `AcademicYearInput`    | Numeric input or select for year (2020–2030 range). Updates `ReportFilters.academicYear`.                        |
| `ClassSelector`        | Populates from `GET /api/classes` (or the Academic module). Updates `ReportFilters.classId`.                     |
| `GradeSelector`        | Populates from `GET /api/grades`. Updates `ReportFilters.gradeId`.                                               |
| `ExportButton`         | Accepts a data array and filename. Serialises to CSV using a `json2csv`-style function and triggers `<a download>`. |
| `ReportCardTable`      | Renders a student's marks grouped by subject. Columns: Subject, Assessment, Type, Marks, Percentage, Comment. Shows term and year in the header. |
| `AgeingTable`          | Extends the existing `DataTable` component. Adds row colour coding based on `bucket` value. Shows totals row. |
| `TuckShopPeriodToggle` | Three-way button group: Daily / Weekly / Monthly. Updates `ReportFilters.tuckShopPeriod`.                        |
| `ReportFilterBar`      | Composes `DateRangePicker`, `TermSelector`, `AcademicYearInput`, `ClassSelector`, `GradeSelector` into a horizontal toolbar with a "Apply Filters" button and "Reset" link. |

### Existing chart components (already implemented)

All four Recharts wrappers are ready to use from `src/components/charts/index.tsx`:

- `LineChartComponent` — configurable multi-line chart (xKey + lines array)
- `BarChartComponent` — configurable grouped bar chart (xKey + bars array)
- `PieChartComponent` — doughnut chart (name/value/color array)
- `AreaChartComponent` — area chart (xKey + areas array)

---

## 8. Integration Notes

### Data sources aggregated by this module

| Report endpoint          | Source modules                         | Source collections                    |
|--------------------------|----------------------------------------|---------------------------------------|
| `/dashboard`             | Student, Fee, Attendance               | students, payments, invoices, attendances |
| `/revenue`               | Fee                                    | payments                              |
| `/attendance`            | Attendance                             | attendances                           |
| `/academic-performance`  | Academic                               | marks, assessments, subjects          |
| `/student-report-card`   | Academic                               | marks, assessments, subjects          |
| `/debtors`               | Fee, Student                           | invoices, students                    |
| `/tuck-shop-sales`       | TuckShop                               | tuckshoporders                        |

### API prefix and base URL

All endpoints in this module are mounted at `/api/reports` (assuming the standard `/api` prefix applied at the Express app level). The frontend `apiClient` base URL is `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:4000`), so calls are made to `http://localhost:4000/api/reports/*`.

Note: The admin dashboard page currently calls `/reports/dashboard` (without the `/api` prefix). This either means the base URL already includes `/api`, or the call will 404. Verify the Express mount path before wiring report sub-pages.

### schoolId resolution

All school-scoped endpoints accept `schoolId` as an optional query parameter. If omitted, the backend falls back to `req.user.schoolId` (extracted from the JWT by the `authenticate` middleware). The frontend should omit `schoolId` for admin users (it is implicit), and must pass it explicitly only for super-admin cross-school queries.

### gradeId filter gap

`GET /api/reports/attendance` accepts `gradeId` in the validation schema but the aggregation pipeline only applies `classId` as a filter. Filtering by grade requires either a `$lookup` join against the `classes` collection or a pre-query to resolve grade → class IDs. This must be implemented before a grade-level attendance filter can be exposed in the UI.

### Currency / money units

All monetary values (`totalAmount`, `paidAmount`, `outstanding`, `totalSales`, `total`, `totalRevenueThisMonth`) are stored and returned in the database's native minor currency unit (cents, as established by the Fee module). The frontend `formatCurrency()` utility in `src/lib/utils.ts` should be used for all display formatting.

### Authentication

Bearer token authentication is required on all endpoints. The `apiClient` interceptor in `src/lib/api-client.ts` automatically attaches the `accessToken` from `localStorage` and handles 401 token refresh. No additional auth setup is needed for report pages.

### Export / PDF

The backend has no PDF generation endpoint. Client-side export options are:
- **CSV**: Serialise the response array to CSV in the browser and trigger `<a download>`.
- **PDF / Print**: Use `window.print()` with a print-specific CSS stylesheet that hides navigation and renders only the report content.

### Unrouted service methods

`getComprehensiveDashboard`, `getStudentFullReport`, `getClassPerformance`, `getMonthlyFinancialSummary`, `getSubjectPerformance`, and `getDebtorsAgeingReport` are all fully implemented in `ReportService` but have no corresponding routes in `routes.ts`. Before building any UI that depends on these, add the missing route entries in `C:\Users\shaun\campusly-backend\src\modules\Report\routes.ts`.

---

## 9. Acceptance Criteria

### GET /api/reports/dashboard
- [ ] Returns `totalStudents`, `totalRevenueThisMonth`, `feeCollectionRate`, `attendanceRate`, `outstandingFees` for the current calendar month.
- [ ] `feeCollectionRate` is a percentage between 0 and 100, rounded to 2 decimal places.
- [ ] Scopes to requesting user's school when `schoolId` is omitted.
- [ ] Super admin can pass a different `schoolId` to query any school.
- [ ] Returns `{ totalStudents: 0, totalRevenueThisMonth: 0, feeCollectionRate: 0, attendanceRate: 0, outstandingFees: 0 }` for a school with no data (no crashes).

### GET /api/reports/revenue
- [ ] Returns an array of `{ month, year, total }` objects sorted ascending by year then month.
- [ ] Filters correctly when `startDate` and/or `endDate` are provided.
- [ ] Returns an empty array (not an error) when no payments match the filter.

### GET /api/reports/attendance
- [ ] Returns one object per distinct status present in the filtered records.
- [ ] Correctly filters by `classId` when provided.
- [ ] Does not crash when `classId` does not match any records.
- [ ] `gradeId` filter is either implemented or documented as unsupported (currently ignored).

### GET /api/reports/academic-performance
- [ ] Returns subject averages sorted alphabetically by `subjectName`.
- [ ] Correctly scopes to `term` and/or `academicYear` when provided.
- [ ] `averagePercentage` is rounded to 2 decimal places.
- [ ] Returns an empty array when no marks exist for the given filters.

### GET /api/reports/student-report-card/:studentId
- [ ] Returns `400` with a descriptive error message when `term` or `academicYear` is missing.
- [ ] Returns only marks matching the given term and academic year (marks for other terms are excluded).
- [ ] `assessmentId` is fully populated with subject name and code.
- [ ] Returns `{ studentId, term, academicYear, marks: [] }` when no marks match (not a 404).
- [ ] Accessible by `teacher` role, not just admins.

### GET /api/reports/debtors
- [ ] Returns only invoices with `status` not in `["paid", "cancelled"]`.
- [ ] `ageDays` is 0 for invoices not yet past due.
- [ ] `bucket` is correctly classified as `"0-30"`, `"31-60"`, `"61-90"`, or `"90+"`.
- [ ] `studentId` is populated with full student document.

### GET /api/reports/tuck-shop-sales
- [ ] `period` defaults to `"daily"` when not provided.
- [ ] Rejects invalid `period` values (only `"daily"`, `"weekly"`, `"monthly"` are valid).
- [ ] Weekly grouping uses ISO week numbers (`$isoWeek`), not calendar weeks.
- [ ] Returns an empty array when no tuck shop orders match the filter.

### Admin Dashboard (`/admin`)
- [ ] `GET /api/reports/dashboard` is called on mount with no explicit `schoolId`.
- [ ] All four stat cards display live data from the API response.
- [ ] Chart panels display data when the backend is extended to return `revenueData`, `attendanceByGrade`, and `feeStatus`.
- [ ] Loading state is shown while the API call is in flight.
- [ ] Page does not crash if the API call fails.

### Admin Reports hub (`/admin/reports`)
- [ ] All five report cards are rendered.
- [ ] "Generate" button on each card navigates to the corresponding drill-down sub-page (once implemented).
- [ ] Page is accessible only to authenticated admin users.

### Teacher Reports (`/teacher/reports`)
- [ ] Page renders with at minimum: class selector, student selector, term selector, and academic year input.
- [ ] Selecting a student and term calls `GET /api/reports/student-report-card/:studentId?term=...&academicYear=...`.
- [ ] Report card table groups marks by subject and displays percentage.

### Report filter behaviour (all drill-down pages)
- [ ] Filters persist within the same browser session (via Zustand store).
- [ ] "Reset" action clears all filters and re-fetches with defaults.
- [ ] Date range `endDate` cannot be earlier than `startDate` (client-side validation).
- [ ] Invalid ObjectIds for `gradeId` / `classId` are rejected before the API call is made.

### Export
- [ ] "Export CSV" on attendance, academic, debtors, and tuck shop report pages produces a valid CSV file.
- [ ] CSV filename includes the report type and the current date (e.g. `attendance-report-2026-03-31.csv`).
- [ ] Print / PDF layout hides navigation, filters, and action buttons; renders only the report content.
