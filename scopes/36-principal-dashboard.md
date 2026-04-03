# 36 — Principal Strategic Dashboard

## 1. Module Overview

The Principal Strategic Dashboard is a permission-gated extension of the existing admin dashboard that provides school principals with executive-level insights, benchmarks, risk alerts, and exportable summaries. It does **not** introduce a new user role — instead, it adds an `isSchoolPrincipal: boolean` flag to the existing User model. Admin users with this flag see additional dashboard sections beyond the standard admin dashboard.

The module aggregates data from seven existing modules (Academic, Attendance, Fees, Staff, Homework, Reports, Teacher Workbench) and adds two new concepts: **configurable benchmarks** (district/national/custom targets) and **risk alerts** (automated flags when KPIs fall below thresholds).

### Key Capabilities

| Capability | Description |
|---|---|
| KPI Cards | Enrollment trends, attendance rate, pass rate, fee collection rate, teacher attendance |
| Benchmark Comparison | School performance vs district/national/custom targets — configurable per metric |
| Term Trends | Line charts showing term-over-term performance for key metrics |
| Subject Heat Map | Grid of subjects × grades coloured by average pass rate (red/amber/green) |
| Teacher Performance | Aggregate class performance per teacher (anonymous — no names, only averages) |
| Financial Health | Revenue vs budget, outstanding fees aging, 3-month cash flow projection |
| Risk Alerts | Auto-generated warnings: teacher absences, low pass rates, fee collection shortfalls |
| Executive Summary PDF | One-click export of current dashboard state as a formatted PDF |

### Role-based Access

| Capability | school_admin | school_admin + isSchoolPrincipal | super_admin |
|---|---|---|---|
| Standard admin dashboard | Yes | Yes | Yes |
| Principal KPI cards | No | Yes | Yes |
| Benchmark config | No | Yes (own school) | Yes (any school) |
| Risk alerts | No | Yes | Yes |
| Executive summary PDF | No | Yes | Yes |
| Teacher performance (aggregate) | No | Yes | Yes |

All endpoints are mounted under `/api/reports/principal`. They extend the existing Report module — no new module registration required. The `requireModule` middleware is not needed since Reports is a core module.

---

## 2. Backend API Endpoints

All endpoints are mounted at `/api/reports/principal`. Every endpoint requires `authenticate` middleware. Access is restricted to users with `isSchoolPrincipal: true` OR `super_admin` role, enforced by a `requirePrincipal` middleware.

---

### 2.1 KPI Overview

#### GET /api/reports/principal/kpis

Returns the six headline KPI cards for the principal dashboard.

**Auth**: `school_admin` with `isSchoolPrincipal: true`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | 24-char ObjectId. Defaults to `req.user.schoolId`. |
| `term` | number | No | 1-4. Defaults to current term. |
| `year` | number | No | Defaults to current academic year. |

**Response 200**:

```json
{
  "success": true,
  "message": "Principal KPIs retrieved successfully",
  "data": {
    "enrollment": {
      "current": 487,
      "previousTerm": 472,
      "changePercent": 3.18
    },
    "attendanceRate": {
      "current": 91.4,
      "previousTerm": 89.2,
      "changePercent": 2.47
    },
    "passRate": {
      "current": 78.6,
      "previousTerm": 75.1,
      "changePercent": 4.66
    },
    "feeCollectionRate": {
      "current": 82.3,
      "previousTerm": 79.8,
      "changePercent": 3.13
    },
    "teacherAttendanceRate": {
      "current": 95.2,
      "previousTerm": 94.8,
      "changePercent": 0.42
    },
    "homeworkCompletionRate": {
      "current": 71.5,
      "previousTerm": 68.3,
      "changePercent": 4.69
    }
  }
}
```

**Computation**:
- `enrollment.current` — count of `Student` with `enrollmentStatus: "active"`, `isDeleted: false`.
- `attendanceRate` — `(present / total) * 100` for `Attendance` records in the queried term.
- `passRate` — percentage of `Mark` records where `(mark / total * 100) >= 50` for the queried term.
- `feeCollectionRate` — `(sum paidAmount / sum totalAmount) * 100` for `Invoice` in the queried term.
- `teacherAttendanceRate` — computed from `Attendance` records where `role: "teacher"`, or from a staff attendance collection if separate.
- `homeworkCompletionRate` — `(submitted / total assigned) * 100` for `HomeworkSubmission` in the queried term.
- `previousTerm` — same computation for the preceding term (term - 1, or term 4 of previous year if term is 1).

---

### 2.2 Benchmark Configuration

#### GET /api/reports/principal/benchmarks

Retrieve benchmark targets for the school.

**Auth**: `school_admin` with `isSchoolPrincipal: true`, `super_admin`

**Query**: `schoolId`

**Response 200**:

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "schoolId": "...",
    "benchmarks": {
      "attendanceRate": { "district": 90, "national": 88, "schoolTarget": 92 },
      "passRate": { "district": 75, "national": 72, "schoolTarget": 80 },
      "feeCollectionRate": { "district": 80, "national": 78, "schoolTarget": 85 },
      "teacherAttendanceRate": { "district": 93, "national": 91, "schoolTarget": 95 },
      "homeworkCompletionRate": { "district": 70, "national": 65, "schoolTarget": 75 }
    },
    "updatedAt": "2026-03-15T10:00:00.000Z"
  }
}
```

#### PUT /api/reports/principal/benchmarks

Create or update (upsert) benchmark targets.

**Auth**: `school_admin` with `isSchoolPrincipal: true`, `super_admin`

**Request body**:

```json
{
  "schoolId": "...",
  "benchmarks": {
    "attendanceRate": { "district": 90, "national": 88, "schoolTarget": 92 },
    "passRate": { "district": 75, "national": 72, "schoolTarget": 80 },
    "feeCollectionRate": { "district": 80, "national": 78, "schoolTarget": 85 },
    "teacherAttendanceRate": { "district": 93, "national": 91, "schoolTarget": 95 },
    "homeworkCompletionRate": { "district": 70, "national": 65, "schoolTarget": 75 }
  }
}
```

**Response 200**: Updated benchmark document.

---

### 2.3 Term Trends

#### GET /api/reports/principal/trends

Returns term-over-term performance data for line charts.

**Auth**: `school_admin` with `isSchoolPrincipal: true`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `year` | number | No | Defaults to current year. |
| `metrics` | string | No | Comma-separated list: `attendance,passRate,feeCollection,teacherAttendance`. Defaults to all. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "year": 2026,
    "terms": [
      {
        "term": 1,
        "attendance": 89.2,
        "passRate": 75.1,
        "feeCollection": 79.8,
        "teacherAttendance": 94.8
      },
      {
        "term": 2,
        "attendance": null,
        "passRate": null,
        "feeCollection": null,
        "teacherAttendance": null
      }
    ]
  }
}
```

`null` values indicate terms that have not yet occurred or have no data.

---

### 2.4 Subject Performance Heat Map

#### GET /api/reports/principal/subject-heatmap

Returns average pass rates per subject per grade for heat map rendering.

**Auth**: `school_admin` with `isSchoolPrincipal: true`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `term` | number | No | 1-4. Defaults to current term. |
| `year` | number | No | Defaults to current year. |

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "subjectId": "...",
      "subjectName": "Mathematics",
      "grades": [
        { "gradeId": "...", "gradeName": "Grade 8", "averagePercent": 62.4, "studentCount": 45, "passRate": 71.1 },
        { "gradeId": "...", "gradeName": "Grade 9", "averagePercent": 55.8, "studentCount": 42, "passRate": 64.3 }
      ]
    },
    {
      "subjectId": "...",
      "subjectName": "English",
      "grades": [
        { "gradeId": "...", "gradeName": "Grade 8", "averagePercent": 71.2, "studentCount": 45, "passRate": 84.4 }
      ]
    }
  ]
}
```

**Computation**: MongoDB aggregation pipeline on `Mark` collection, grouped by `subjectId` and `gradeId`, computing `avg(mark / total * 100)` and `count(mark / total >= 0.5) / count(*)`.

---

### 2.5 Teacher Performance (Aggregate)

#### GET /api/reports/principal/teacher-performance

Returns anonymised aggregate performance per teacher. Teacher names are NOT returned — only teacher IDs and aggregate statistics. The frontend displays these as "Teacher A", "Teacher B", etc.

**Auth**: `school_admin` with `isSchoolPrincipal: true`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `term` | number | No | 1-4. |
| `year` | number | No | Defaults to current year. |
| `subjectId` | string | No | Filter to a specific subject. |

**Response 200**:

```json
{
  "success": true,
  "data": [
    {
      "teacherIndex": 1,
      "subjectCount": 3,
      "classCount": 5,
      "averageClassPassRate": 78.4,
      "averageClassMark": 62.1,
      "homeworkSetCount": 24,
      "attendanceRate": 96.5
    },
    {
      "teacherIndex": 2,
      "subjectCount": 2,
      "classCount": 3,
      "averageClassPassRate": 65.2,
      "averageClassMark": 51.8,
      "homeworkSetCount": 18,
      "attendanceRate": 91.0
    }
  ]
}
```

The `teacherIndex` is a random-seeded integer (re-randomised each request) so the principal cannot track individual teachers across requests. The purpose is aggregate pattern identification, not individual evaluation.

---

### 2.6 Financial Health

#### GET /api/reports/principal/financial-health

Returns revenue vs budget, outstanding fees aging buckets, and a simple cash flow projection.

**Auth**: `school_admin` with `isSchoolPrincipal: true`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `year` | number | No | Defaults to current year. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "revenueVsBudget": {
      "totalRevenue": 1245000,
      "annualBudget": 1800000,
      "percentOfBudget": 69.2,
      "monthlyBreakdown": [
        { "month": 1, "revenue": 245000, "budget": 150000 },
        { "month": 2, "revenue": 198000, "budget": 150000 },
        { "month": 3, "revenue": 167000, "budget": 150000 }
      ]
    },
    "outstandingFeesAging": {
      "current": 45000,
      "thirtyDays": 32000,
      "sixtyDays": 18500,
      "ninetyDays": 12000,
      "overNinetyDays": 8700,
      "total": 116200
    },
    "cashFlowProjection": [
      { "month": "2026-04", "projectedIncome": 165000, "projectedExpenses": 142000, "netCashFlow": 23000 },
      { "month": "2026-05", "projectedIncome": 158000, "projectedExpenses": 142000, "netCashFlow": 16000 },
      { "month": "2026-06", "projectedIncome": 152000, "projectedExpenses": 142000, "netCashFlow": 10000 }
    ]
  }
}
```

**Computation**:
- `revenueVsBudget.totalRevenue` — sum of `Payment.amount` for the year.
- `annualBudget` — from `SchoolBenchmark.annualBudget` (set by principal).
- `outstandingFeesAging` — invoices grouped by days since `dueDate`: 0-30, 31-60, 61-90, 90+.
- `cashFlowProjection` — linear projection based on trailing 3-month average income and fixed monthly expense estimate from benchmark config.

---

### 2.7 Risk Alerts

#### GET /api/reports/principal/risk-alerts

Returns automated risk flags based on configurable thresholds.

**Auth**: `school_admin` with `isSchoolPrincipal: true`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "type": "teacher_absence",
        "severity": "medium",
        "message": "2 teachers have been absent more than 3 days this month",
        "count": 2,
        "threshold": 3
      },
      {
        "type": "low_pass_rate",
        "severity": "high",
        "message": "3 classes have a pass rate below 70%",
        "details": [
          { "classId": "...", "className": "Grade 10A", "subjectName": "Mathematics", "passRate": 54.2 },
          { "classId": "...", "className": "Grade 11B", "subjectName": "Physical Science", "passRate": 61.8 },
          { "classId": "...", "className": "Grade 9C", "subjectName": "Mathematics", "passRate": 68.5 }
        ],
        "count": 3,
        "threshold": 70
      },
      {
        "type": "fee_collection_below_target",
        "severity": "medium",
        "message": "Fee collection rate (72.3%) is below the school target (85%)",
        "currentValue": 72.3,
        "threshold": 85
      },
      {
        "type": "high_absenteeism_class",
        "severity": "low",
        "message": "1 class has an attendance rate below 85%",
        "count": 1,
        "threshold": 85
      }
    ],
    "generatedAt": "2026-04-02T08:00:00.000Z"
  }
}
```

**Alert rules**:
- `teacher_absence` — any teacher with > 3 absent days in the current calendar month.
- `low_pass_rate` — any class+subject combination with pass rate < 70% in the current term.
- `fee_collection_below_target` — overall fee collection rate below the school's configured target.
- `high_absenteeism_class` — any class with attendance rate < 85% in the current month.
- Thresholds are configurable via the benchmark endpoint; defaults are used if not configured.

---

### 2.8 Executive Summary Export

#### GET /api/reports/principal/executive-summary

Returns a structured JSON payload optimised for PDF rendering on the frontend. The frontend uses this data to generate a PDF via browser print or a PDF library.

**Auth**: `school_admin` with `isSchoolPrincipal: true`, `super_admin`

**Query parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `schoolId` | string | No | Defaults to `req.user.schoolId`. |
| `term` | number | No | Current term. |
| `year` | number | No | Current year. |

**Response 200**:

```json
{
  "success": true,
  "data": {
    "schoolName": "Springfield Primary School",
    "generatedAt": "2026-04-02T08:30:00.000Z",
    "period": { "term": 1, "year": 2026 },
    "kpis": { "...same as /kpis response..." },
    "benchmarkComparison": { "...school vs district vs national for each metric..." },
    "topPerformingSubjects": [
      { "subjectName": "English", "averagePercent": 74.2 }
    ],
    "underperformingSubjects": [
      { "subjectName": "Mathematics", "averagePercent": 55.8 }
    ],
    "riskAlerts": [ "...same as /risk-alerts response..." ],
    "financialSummary": {
      "totalRevenue": 1245000,
      "outstandingFees": 116200,
      "collectionRate": 82.3
    }
  }
}
```

---

## 3. Data Models

### SchoolBenchmark

Stores configurable benchmark targets and budget information per school. One document per school (upsert pattern).

```
SchoolBenchmark {
  schoolId:              ObjectId (ref: 'School', required, unique)
  benchmarks: {
    attendanceRate:      { district: Number, national: Number, schoolTarget: Number }
    passRate:            { district: Number, national: Number, schoolTarget: Number }
    feeCollectionRate:   { district: Number, national: Number, schoolTarget: Number }
    teacherAttendanceRate: { district: Number, national: Number, schoolTarget: Number }
    homeworkCompletionRate: { district: Number, national: Number, schoolTarget: Number }
  }
  annualBudget:          Number (default: 0)
  monthlyExpenseEstimate: Number (default: 0)
  updatedBy:             ObjectId (ref: 'User')
  isDeleted:             Boolean (default: false)
  timestamps:            true
}

Indexes:
  - { schoolId: 1 } unique
```

### No Other New Models

All KPI computations use existing models: `Student`, `Attendance`, `Mark`, `Invoice`, `Payment`, `Homework`, `HomeworkSubmission`, `Staff`. The risk alerts and trends are computed at request time via aggregation pipelines — no denormalisation.

---

## 4. Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/admin/principal` | Principal Dashboard | Main dashboard with all KPI sections |
| `/admin/principal/benchmarks` | Benchmark Config | Form to set district/national/school targets and budget |

The principal dashboard is a single page with multiple sections. It does NOT replace the standard admin dashboard — it is an additional page in the admin nav, visible only when `user.isSchoolPrincipal === true`.

**Nav entry** (in `src/lib/constants.ts`):
```ts
{ label: 'Principal Dashboard', href: '/admin/principal', icon: Crown }
```
Conditionally rendered: `user.role === 'school_admin' && user.isSchoolPrincipal`.

---

## 5. User Flows

### Flow 1: Principal Views Dashboard

1. Principal logs in (standard admin login).
2. Nav shows "Principal Dashboard" link (because `isSchoolPrincipal: true`).
3. Principal clicks link → `/admin/principal`.
4. Page loads all sections in parallel:
   - `GET /api/reports/principal/kpis` → KPI cards
   - `GET /api/reports/principal/benchmarks` → benchmark comparison overlay on KPI cards
   - `GET /api/reports/principal/trends` → term trend line charts
   - `GET /api/reports/principal/subject-heatmap` → subject heat map
   - `GET /api/reports/principal/teacher-performance` → anonymous teacher table
   - `GET /api/reports/principal/financial-health` → financial section
   - `GET /api/reports/principal/risk-alerts` → alert banner at top
5. Principal reviews data, identifies issues.

### Flow 2: Configure Benchmarks

1. Principal navigates to `/admin/principal/benchmarks`.
2. Form shows current benchmark values (pre-filled from `GET /benchmarks`).
3. Principal updates district/national/school targets and annual budget.
4. Submits → `PUT /api/reports/principal/benchmarks`.
5. Returns to dashboard — benchmark comparison lines now reflect new targets.

### Flow 3: Export Executive Summary

1. From the principal dashboard, principal clicks "Export Summary" button.
2. Frontend calls `GET /api/reports/principal/executive-summary`.
3. Frontend renders a print-optimised layout in a hidden div.
4. Browser print dialog opens (or jsPDF generates a PDF).
5. Principal saves/prints the PDF.

### Flow 4: Risk Alert Drill-down

1. Principal sees a "low_pass_rate" alert on the dashboard.
2. Clicks the alert card.
3. UI scrolls to/expands the subject heat map, highlighting the flagged classes.
4. Principal can click a class cell to navigate to the academic marks page for that class.

---

## 6. State Management

### usePrincipalDashboard hook (`src/hooks/usePrincipalDashboard.ts`)

```ts
interface PrincipalDashboardState {
  kpis: PrincipalKPIs | null;
  benchmarks: SchoolBenchmark | null;
  trends: TermTrend[] | null;
  subjectHeatmap: SubjectHeatmapEntry[] | null;
  teacherPerformance: TeacherPerformanceEntry[] | null;
  financialHealth: FinancialHealth | null;
  riskAlerts: RiskAlert[] | null;
  loading: boolean;
  error: string | null;
}
```

Each section loads independently with its own loading state. The hook returns individual fetch functions and a `fetchAll()` that fires all requests in parallel.

### useBenchmarkConfig hook (`src/hooks/useBenchmarkConfig.ts`)

Manages the benchmark configuration form state — fetch current values, submit updates.

---

## 7. Components Needed

### Principal-specific components (`src/components/principal/`)

| Component | Description |
|---|---|
| `KpiCardGrid` | 6 KPI cards with trend arrows and benchmark comparison dots |
| `KpiCard` | Single KPI card: value, change %, benchmark indicator (above/below) |
| `BenchmarkComparisonBar` | Horizontal bar showing school vs district vs national for one metric |
| `TermTrendChart` | Recharts `LineChart` with multiple series (one per metric) |
| `SubjectHeatMap` | Grid of subject × grade cells coloured by pass rate (green/amber/red) |
| `HeatMapCell` | Single cell in the heat map with tooltip showing details |
| `TeacherPerformanceTable` | DataTable of anonymised teacher metrics |
| `FinancialHealthSection` | Composite: revenue vs budget chart, aging table, cash flow chart |
| `RevenueVsBudgetChart` | Recharts `BarChart` — monthly revenue vs budget |
| `AgingTable` | Table showing outstanding fees by aging bucket |
| `CashFlowChart` | Recharts `LineChart` — projected income vs expenses |
| `RiskAlertBanner` | Coloured cards at top of dashboard, one per alert type |
| `RiskAlertCard` | Single alert with severity badge, message, and drill-down action |
| `BenchmarkConfigForm` | Form for editing benchmark targets and budget |
| `ExecutiveSummaryPrintView` | Hidden print-optimised layout for PDF export |

### Shared components reused

- `PageHeader` — page title and actions
- `StatCard` — basis for KPI cards
- `DataTable` — for teacher performance table
- `LoadingSpinner`, `EmptyState` — standard patterns
- `Badge` — severity indicators on alerts

---

## 8. Integration Notes

### Extending the User model

Add `isSchoolPrincipal: Boolean (default: false)` to the User schema. This is a simple flag — no new role. Super admins can toggle this via the existing user management API.

### Middleware: requirePrincipal

```ts
function requirePrincipal(req, res, next) {
  if (req.user.role === 'super_admin') return next();
  if (req.user.role === 'school_admin' && req.user.isSchoolPrincipal) return next();
  return res.status(403).json({ success: false, message: 'Principal access required' });
}
```

### Aggregation Performance

Several endpoints run heavy aggregation pipelines. Mitigations:
- Cache results in Redis with 15-minute TTL (key: `principal:kpis:${schoolId}:${term}:${year}`).
- Use existing MongoDB indexes on `schoolId`, `term`, `createdAt`.
- Add compound index on `Mark`: `{ schoolId: 1, assessmentId: 1 }` if not already present.
- The `/executive-summary` endpoint calls the other service methods internally — it does not make HTTP calls to other endpoints.

### Budget Data

The `annualBudget` and `monthlyExpenseEstimate` fields are manually entered by the principal via the benchmark config form. There is no automated expense tracking module yet. The cash flow projection uses `monthlyExpenseEstimate` as a fixed cost assumption.

### Multi-Tenancy

All endpoints filter by `schoolId`. The `SchoolBenchmark` model has a unique index on `schoolId` to prevent cross-school data leakage.

---

## 9. Acceptance Criteria

- [ ] Admin users with `isSchoolPrincipal: true` see "Principal Dashboard" in the nav
- [ ] Admin users without the flag do NOT see the nav entry or have API access
- [ ] KPI cards show enrollment, attendance rate, pass rate, fee collection rate, teacher attendance, homework completion rate
- [ ] Each KPI card shows current value, previous term value, and percentage change with trend arrow
- [ ] Benchmark comparison shows school vs district vs national for each metric
- [ ] Benchmarks are configurable via the settings page
- [ ] Term trend line chart renders 4 data points (one per term) for selected metrics
- [ ] Subject heat map renders a grid of subjects × grades with colour coding
- [ ] Heat map cells are green (>80%), amber (60-80%), red (<60%) based on pass rate
- [ ] Teacher performance table shows anonymised aggregate metrics (no teacher names)
- [ ] Teacher anonymisation is re-randomised on each request
- [ ] Financial health section shows revenue vs budget bar chart
- [ ] Outstanding fees aging table shows current/30/60/90/90+ day buckets
- [ ] Cash flow projection shows a 3-month forecast line chart
- [ ] Risk alerts appear as coloured cards at the top of the dashboard
- [ ] Alert severity levels (low/medium/high) are visually distinct
- [ ] Clicking a risk alert scrolls to or highlights the relevant dashboard section
- [ ] Executive summary PDF export includes all dashboard sections in print-friendly format
- [ ] API responses are cached in Redis with 15-minute TTL
- [ ] All pages have loading spinners and empty states
- [ ] All pages are mobile-responsive (cards stack on mobile, charts scroll horizontally)
- [ ] No `apiClient` imports in any page or component file
- [ ] All files under 350 lines
- [ ] No `any` types
- [ ] All endpoints filter by `schoolId` — no cross-school data leakage
