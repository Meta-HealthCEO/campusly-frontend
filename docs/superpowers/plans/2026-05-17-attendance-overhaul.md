# Attendance Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/teacher/attendance` the universal attendance surface (Today + History tabs, class picker, PDF export), delete the duplicate embedded register on the teaching-group roster, per [`docs/superpowers/specs/2026-05-17-attendance-overhaul-design.md`](docs/superpowers/specs/2026-05-17-attendance-overhaul-design.md).

**Architecture:**
- **Backend** (TDD'd) — extend `bulkAttendanceSchema` to accept `YYYY-MM-DD` date strings (the UTC fix), extend `getByClass` to accept a date range + period filter (powers the History grid), open `/export` to teachers with ownership check, add a PDF format branch (single-day register + history grid).
- **Frontend** (type-driven, no component test infra in this repo) — reshape `useTeacherAttendance` to be class-agnostic, add `useAttendanceHistory` + `useAttendanceExport`, build 6 small components, then atomically rewrite the page + clean up the roster.
- Verification: backend uses Vitest + real MongoDB (mirroring `service.bulk.test.ts`); frontend uses `tsc --noEmit` + eslint + manual QA against the spec's acceptance criteria.

**Tech Stack:** Next.js 16 (React 19), Tailwind 4, base-ui, Zustand, Axios, Lucide. Backend: Express + Mongoose + Vitest + PDFKit (via `src/common/pdf/document.ts`).

---

## File Structure

**Backend — modify:**
- [`c:\Users\shaun\campusly-backend\src\modules\Attendance\validation.ts`](c:/Users/shaun/campusly-backend/src/modules/Attendance/validation.ts) — `attendanceDateSchema` accepts both date-only and ISO datetime.
- [`c:\Users\shaun\campusly-backend\src\modules\Attendance\controller.ts`](c:/Users/shaun/campusly-backend/src/modules/Attendance/controller.ts) — `getByClass` accepts `dateFrom`/`dateTo`/`period` query params.
- [`c:\Users\shaun\campusly-backend\src\modules\Attendance\service.ts`](c:/Users/shaun/campusly-backend/src/modules/Attendance/service.ts) — `getByClass` honours optional range + period.
- [`c:\Users\shaun\campusly-backend\src\modules\Attendance\routes.ts`](c:/Users/shaun/campusly-backend/src/modules/Attendance/routes.ts) — `/export` allows `teacher` with `requireTeacherClassOwnership('classId')`.
- [`c:\Users\shaun\campusly-backend\src\modules\Attendance\export.controller.ts`](c:/Users/shaun/campusly-backend/src/modules/Attendance/export.controller.ts) — `?format=pdf` branch.

**Backend — create:**
- `c:\Users\shaun\campusly-backend\src\modules\Attendance\pdf-export.ts` — PDF rendering helpers (single-day register, history grid).
- `c:\Users\shaun\campusly-backend\src\modules\Attendance\__tests__\validation.date.test.ts` — schema accepts both formats.
- `c:\Users\shaun\campusly-backend\src\modules\Attendance\__tests__\controller.range.test.ts` — `getByClass` with range + period.
- `c:\Users\shaun\campusly-backend\src\modules\Attendance\__tests__\export.pdf.test.ts` — PDF format branch returns a non-empty Buffer with PDF magic bytes.

**Frontend — modify:**
- [`src/hooks/useTeacherAttendance.ts`](src/hooks/useTeacherAttendance.ts) — generalised: loads all teacher's classes, accepts `classId`, drops the homeroom-only assumption, sends date as `YYYY-MM-DD`.
- [`src/app/(dashboard)/teacher/attendance/page.tsx`](src/app/(dashboard)/teacher/attendance/page.tsx) — full rewrite as thin composition of tab components.
- [`src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx`](src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx) — replace embedded register with a "Take attendance" link.

**Frontend — create:**
- `src/hooks/useAttendanceHistory.ts` — loads a date range of records for the selected class + period.
- `src/hooks/useAttendanceExport.ts` — wraps the PDF export call (single-day or range).
- `src/components/attendance/AttendanceClassPicker.tsx`
- `src/components/attendance/AttendanceBulkMarkMenu.tsx`
- `src/components/attendance/AttendanceTodayTab.tsx`
- `src/components/attendance/AttendanceDayEditDialog.tsx`
- `src/components/attendance/AttendanceHistoryTab.tsx`
- `src/components/attendance/AttendanceExportButton.tsx`

**Frontend — delete:**
- [`src/components/classes/TeachingGroupAttendanceRegister.tsx`](src/components/classes/TeachingGroupAttendanceRegister.tsx) (~232 lines)

**Confirmed during recon (no longer open questions):**
- `/academic/teacher/me/teaching-load` already returns standalone-teacher teaching groups in `homeroom`/`subjectClasses`. No backend extension needed for the class picker source.
- PDF helpers live at `src/common/pdf/document.ts` — exports `createDocument()` and `finalise(doc): Promise<Buffer>`. PDFKit-based.
- Lesson export uses nested route (`/lessons/:id/export/:mode`) with `responseType: 'blob'`. We'll mirror via a `format` query param on `/api/attendance/export` since that endpoint already exists and takes `dateFrom`/`dateTo`/`classId`.

---

## Task 1: Backend — `attendanceDateSchema` accepts date-only

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Attendance\validation.ts:8-17`
- Create: `c:\Users\shaun\campusly-backend\src\modules\Attendance\__tests__\validation.date.test.ts`

This task lets the frontend send `selectedDate` as a plain `YYYY-MM-DD` string without timezone arithmetic.

- [ ] **Step 1.1: Write the failing test**

Create `c:\Users\shaun\campusly-backend\src\modules\Attendance\__tests__\validation.date.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { bulkAttendanceSchema, recordAttendanceSchema } from '../validation.js';

const baseStudentId = '0123456789abcdef01234567';
const baseClassId = 'fedcba9876543210fedcba98';

describe('attendanceDateSchema accepts both date-only and ISO datetime', () => {
  it('accepts YYYY-MM-DD in bulk schema', () => {
    const parsed = bulkAttendanceSchema.safeParse({
      classId: baseClassId,
      date: '2026-05-15',
      period: 1,
      records: [{ studentId: baseStudentId, status: 'present' }],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts ISO datetime in bulk schema (backward compat)', () => {
    const parsed = bulkAttendanceSchema.safeParse({
      classId: baseClassId,
      date: '2026-05-15T00:00:00.000Z',
      period: 1,
      records: [{ studentId: baseStudentId, status: 'present' }],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts YYYY-MM-DD in single record schema', () => {
    const parsed = recordAttendanceSchema.safeParse({
      studentId: baseStudentId,
      classId: baseClassId,
      date: '2026-05-15',
      period: 1,
      status: 'present',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects malformed date strings', () => {
    expect(bulkAttendanceSchema.safeParse({
      classId: baseClassId,
      date: '2026-13-99',
      period: 1,
      records: [{ studentId: baseStudentId, status: 'present' }],
    }).success).toBe(false);

    expect(bulkAttendanceSchema.safeParse({
      classId: baseClassId,
      date: 'not-a-date',
      period: 1,
      records: [{ studentId: baseStudentId, status: 'present' }],
    }).success).toBe(false);
  });

  it('rejects future dates', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().slice(0, 10);
    expect(bulkAttendanceSchema.safeParse({
      classId: baseClassId,
      date: future,
      period: 1,
      records: [{ studentId: baseStudentId, status: 'present' }],
    }).success).toBe(false);
  });
});
```

- [ ] **Step 1.2: Run the test and verify it fails**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- validation.date.test
```

Expected: FAIL — the YYYY-MM-DD cases fail because `z.string().datetime()` rejects date-only strings.

- [ ] **Step 1.3: Update the schema**

In `c:\Users\shaun\campusly-backend\src\modules\Attendance\validation.ts`, replace lines 8–17:

```ts
const attendanceDateSchema = z.string().datetime().refine(
  (value) => {
    const attendanceDate = new Date(value);
    if (Number.isNaN(attendanceDate.getTime())) return false;
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return attendanceDate <= todayEnd;
  },
  { message: 'Attendance date cannot be in the future' },
);
```

with:

```ts
const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
const attendanceDateSchema = z
  .union([
    z.iso.datetime(),
    z.string().regex(dateOnlyRegex, 'Date must be YYYY-MM-DD or ISO datetime'),
  ])
  .refine(
    (value) => {
      const attendanceDate = new Date(value);
      if (Number.isNaN(attendanceDate.getTime())) return false;
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      return attendanceDate <= todayEnd;
    },
    { message: 'Attendance date cannot be in the future' },
  );
```

(The codebase already uses `'zod/v4'` per memory — `z.iso.datetime()` is the v4 way. The new code follows the memory rule "never z.string().datetime()".)

- [ ] **Step 1.4: Run the test and verify it passes**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- validation.date.test
```

Expected: PASS (5/5).

- [ ] **Step 1.5: Verify the existing bulk test still passes**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- service.bulk.test
```

Expected: PASS (existing behaviour preserved).

- [ ] **Step 1.6: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Attendance/validation.ts src/modules/Attendance/__tests__/validation.date.test.ts
git commit -m "feat(attendance): accept YYYY-MM-DD date in record/bulk schemas"
```

---

## Task 2: Backend — `getByClass` accepts date-range + period

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Attendance\controller.ts:135-146`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Attendance\service.ts` (extend `AttendanceService.getByClass`)
- Create: `c:\Users\shaun\campusly-backend\src\modules\Attendance\__tests__\controller.range.test.ts`

Powers the History tab. Backwards-compatible: `?date=YYYY-MM-DD` still works as today; `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` is the new shape.

- [ ] **Step 2.1: Read the existing service.getByClass to find its shape**

```bash
cd c:/Users/shaun/campusly-backend
```

Open `src/modules/Attendance/service.ts` and locate `getByClass`. Note the current signature (likely `getByClass(classId: string, date: string, schoolId: string)`) and how it builds the Mongoose filter. The plan below assumes:

```ts
static async getByClass(classId: string, date: string, schoolId: string) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  return Attendance.find({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    classId: new mongoose.Types.ObjectId(classId),
    date: { $gte: start, $lte: end },
    isDeleted: false,
  }).populate(...).lean();
}
```

If the shape diverges, mirror it. The change in Step 2.3 below assumes the existing shape; adjust the diff to match what's actually there.

- [ ] **Step 2.2: Write the failing test**

Create `c:\Users\shaun\campusly-backend\src\modules\Attendance\__tests__\controller.range.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { AttendanceService } from '../service.js';
import { Attendance } from '../model.js';
import { School } from '../../School/model.js';
import { Class } from '../../Academic/model.js';
import { Student } from '../../Student/model.js';
import { User } from '../../Auth/model.js';

const createdSchoolIds: mongoose.Types.ObjectId[] = [];

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test',
    );
  }
});

afterAll(async () => {
  await Attendance.deleteMany({ schoolId: { $in: createdSchoolIds } });
  await Student.deleteMany({ schoolId: { $in: createdSchoolIds } });
  await Class.deleteMany({ schoolId: { $in: createdSchoolIds } });
  await User.deleteMany({ email: /^range-test\+/ });
  await School.deleteMany({ name: /^range_test_/ });
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

async function makeFixture() {
  const stamp = Date.now() + Math.random();
  const school = await School.create({
    name: `range_test_${stamp}`,
    type: 'combined',
    address: { street: 'x', city: 'x', province: 'x', postalCode: '0000', country: 'ZA' },
    contactInfo: { email: `range-test+${stamp}@test.local`, phone: '0' },
    settings: { academicYear: 2026, terms: 4, gradingSystem: 'percentage' },
    principal: 'T',
    joinCode: `R${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    isActive: true,
    plan: 'standalone',
  });
  createdSchoolIds.push(school._id as mongoose.Types.ObjectId);
  // Minimal class + student fixture; the test only needs IDs to read back.
  return { school };
}

describe('AttendanceService.getByClass with date range + period', () => {
  it('returns records across a date range', async () => {
    const { school } = await makeFixture();
    const classId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    await Attendance.create([
      { schoolId: school._id, classId, studentId, date: new Date('2026-05-12T00:00:00.000Z'), period: 1, status: 'present' },
      { schoolId: school._id, classId, studentId, date: new Date('2026-05-13T00:00:00.000Z'), period: 1, status: 'absent' },
      { schoolId: school._id, classId, studentId, date: new Date('2026-05-14T00:00:00.000Z'), period: 1, status: 'present' },
      { schoolId: school._id, classId, studentId, date: new Date('2026-05-20T00:00:00.000Z'), period: 1, status: 'late' },
    ]);

    const result = await AttendanceService.getByClass(
      String(classId),
      { dateFrom: '2026-05-12', dateTo: '2026-05-15' },
      String(school._id),
    );

    expect(result).toHaveLength(3);
  });

  it('filters by period when provided', async () => {
    const { school } = await makeFixture();
    const classId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    await Attendance.create([
      { schoolId: school._id, classId, studentId, date: new Date('2026-05-12T00:00:00.000Z'), period: 1, status: 'present' },
      { schoolId: school._id, classId, studentId, date: new Date('2026-05-12T00:00:00.000Z'), period: 5, status: 'absent' },
    ]);

    const result = await AttendanceService.getByClass(
      String(classId),
      { dateFrom: '2026-05-12', dateTo: '2026-05-12', period: 5 },
      String(school._id),
    );

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('absent');
  });

  it('preserves the single-date shape for backward compat', async () => {
    const { school } = await makeFixture();
    const classId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    await Attendance.create({
      schoolId: school._id, classId, studentId,
      date: new Date('2026-05-12T00:00:00.000Z'), period: 1, status: 'present',
    });

    const result = await AttendanceService.getByClass(
      String(classId),
      '2026-05-12',
      String(school._id),
    );

    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2.3: Update `AttendanceService.getByClass` to accept both shapes**

In `c:\Users\shaun\campusly-backend\src\modules\Attendance\service.ts`, change the `getByClass` method to:

```ts
interface GetByClassRangeParams {
  dateFrom: string;
  dateTo: string;
  period?: number;
}

static async getByClass(
  classId: string,
  dateOrRange: string | GetByClassRangeParams,
  schoolId: string,
) {
  const baseFilter: Record<string, unknown> = {
    schoolId: new mongoose.Types.ObjectId(schoolId),
    classId: new mongoose.Types.ObjectId(classId),
    isDeleted: false,
  };

  if (typeof dateOrRange === 'string') {
    const start = new Date(dateOrRange);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateOrRange);
    end.setHours(23, 59, 59, 999);
    baseFilter.date = { $gte: start, $lte: end };
  } else {
    const start = new Date(dateOrRange.dateFrom);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateOrRange.dateTo);
    end.setHours(23, 59, 59, 999);
    baseFilter.date = { $gte: start, $lte: end };
    if (typeof dateOrRange.period === 'number') {
      baseFilter.period = dateOrRange.period;
    }
  }

  return Attendance.find(baseFilter)
    .populate({
      path: 'studentId',
      select: 'admissionNumber userId',
      populate: { path: 'userId', select: 'firstName lastName' },
    })
    .sort({ date: 1, period: 1 })
    .lean();
}
```

**Implementer note:** the existing implementation may already have a populate shape — preserve whatever it does, just extend the filter construction. Read the existing `getByClass` before changing.

- [ ] **Step 2.4: Update `AttendanceController.getByClass` to forward the new params**

In `c:\Users\shaun\campusly-backend\src\modules\Attendance\controller.ts:135-146`, change:

```ts
static async getByClass(req: Request, res: Response): Promise<void> {
  const schoolId = req.user!.schoolId!;
  const classId = req.params.classId as string;
  const { date } = req.query;

  if (!date) {
    throw new BadRequestError('date is required');
  }

  const records = await AttendanceService.getByClass(classId, date as string, schoolId);
  res.json(apiResponse(true, records, 'Class attendance retrieved successfully'));
}
```

to:

```ts
static async getByClass(req: Request, res: Response): Promise<void> {
  const schoolId = req.user!.schoolId!;
  const classId = req.params.classId as string;
  const { date, dateFrom, dateTo, period } = req.query;

  if (typeof date === 'string' && date) {
    const records = await AttendanceService.getByClass(classId, date, schoolId);
    res.json(apiResponse(true, records, 'Class attendance retrieved successfully'));
    return;
  }

  if (typeof dateFrom === 'string' && typeof dateTo === 'string' && dateFrom && dateTo) {
    const periodNum = typeof period === 'string' && period ? Number(period) : undefined;
    const records = await AttendanceService.getByClass(
      classId,
      { dateFrom, dateTo, period: Number.isFinite(periodNum) ? periodNum : undefined },
      schoolId,
    );
    res.json(apiResponse(true, records, 'Class attendance retrieved successfully'));
    return;
  }

  throw new BadRequestError('Either `date` or `dateFrom`+`dateTo` is required');
}
```

- [ ] **Step 2.5: Run tests and verify**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- controller.range.test
```

Expected: PASS (3/3).

Then run the existing bulk + onboarding tests to confirm no regressions:

```bash
cd c:/Users/shaun/campusly-backend && npm test -- service.bulk.test onboarding-status.test
```

Expected: PASS.

- [ ] **Step 2.6: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Attendance/controller.ts src/modules/Attendance/service.ts src/modules/Attendance/__tests__/controller.range.test.ts
git commit -m "feat(attendance): getByClass accepts dateFrom/dateTo/period"
```

---

## Task 3: Backend — open `/export` to teachers + create PDF helper

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Attendance\routes.ts:41-46`
- Create: `c:\Users\shaun\campusly-backend\src\modules\Attendance\pdf-export.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Attendance\export.controller.ts`
- Create: `c:\Users\shaun\campusly-backend\src\modules\Attendance\__tests__\export.pdf.test.ts`

This task adds the PDF generation helper, wires `?format=pdf` through the controller, and opens the route to teachers (with ownership check).

- [ ] **Step 3.1: Write the failing test**

Create `c:\Users\shaun\campusly-backend\src\modules\Attendance\__tests__\export.pdf.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderRegisterPdf, renderHistoryGridPdf, type RegisterRow, type HistoryCell } from '../pdf-export.js';

const PDF_MAGIC = Buffer.from('%PDF');

describe('renderRegisterPdf', () => {
  it('produces a non-empty Buffer starting with %PDF', async () => {
    const rows: RegisterRow[] = [
      { admissionNumber: 'A001', studentName: 'Alice Smith', status: 'present', notes: '' },
      { admissionNumber: 'A002', studentName: 'Bob Jones', status: 'absent', notes: 'Sick' },
    ];

    const buffer = await renderRegisterPdf({
      schoolName: 'Test High',
      classLabel: 'Grade 11A',
      date: '2026-05-15',
      period: 1,
      rows,
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 4).equals(PDF_MAGIC)).toBe(true);
  });

  it('handles an empty class', async () => {
    const buffer = await renderRegisterPdf({
      schoolName: 'Test High',
      classLabel: 'Grade 11A',
      date: '2026-05-15',
      period: 1,
      rows: [],
    });
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 4).equals(PDF_MAGIC)).toBe(true);
  });
});

describe('renderHistoryGridPdf', () => {
  it('produces a non-empty Buffer starting with %PDF', async () => {
    const dates = ['2026-05-12', '2026-05-13', '2026-05-14'];
    const cells: HistoryCell[][] = [
      [
        { status: 'present' }, { status: 'absent' }, { status: 'present' },
      ],
      [
        { status: 'present' }, { status: 'late' }, { status: null },
      ],
    ];
    const rows: { admissionNumber: string; studentName: string }[] = [
      { admissionNumber: 'A001', studentName: 'Alice Smith' },
      { admissionNumber: 'A002', studentName: 'Bob Jones' },
    ];

    const buffer = await renderHistoryGridPdf({
      schoolName: 'Test High',
      classLabel: 'Grade 11A',
      period: 1,
      dates,
      rows,
      cells,
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 4).equals(PDF_MAGIC)).toBe(true);
  });
});
```

- [ ] **Step 3.2: Run the test and verify it fails**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- export.pdf.test
```

Expected: FAIL — `pdf-export.js` doesn't exist yet.

- [ ] **Step 3.3: Create the PDF helper**

Create `c:\Users\shaun\campusly-backend\src\modules\Attendance\pdf-export.ts`:

```ts
import { createDocument, finalise } from '../../common/pdf/document.js';

export interface RegisterRow {
  admissionNumber: string;
  studentName: string;
  status: string;
  notes: string;
}

export interface RegisterPdfInput {
  schoolName: string;
  classLabel: string;
  date: string;   // YYYY-MM-DD
  period: number;
  rows: RegisterRow[];
}

export interface HistoryCell {
  status: 'present' | 'absent' | 'late' | 'excused' | null;
}

export interface HistoryGridPdfInput {
  schoolName: string;
  classLabel: string;
  period: number;
  dates: string[];           // column headers, YYYY-MM-DD
  rows: { admissionNumber: string; studentName: string }[];
  cells: HistoryCell[][];    // rows x dates
}

const STATUS_LETTER: Record<string, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  excused: 'E',
};

export async function renderRegisterPdf(input: RegisterPdfInput): Promise<Buffer> {
  const doc = createDocument();

  doc.font('Helvetica-Bold').fontSize(16).text(input.schoolName, { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(12).text(`Attendance Register — ${input.classLabel}`, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).text(`Date: ${input.date}    Period: ${input.period}`, { align: 'center' });
  doc.moveDown(0.8);

  // Table header
  const colX = { adm: 50, name: 130, status: 380, notes: 450 };
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Adm. #', colX.adm, doc.y);
  doc.text('Student name', colX.name, doc.y - 12);
  doc.text('Status', colX.status, doc.y - 12);
  doc.text('Notes', colX.notes, doc.y - 12);
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(10);
  for (const row of input.rows) {
    const y = doc.y;
    doc.text(row.admissionNumber, colX.adm, y, { width: 70 });
    doc.text(row.studentName, colX.name, y, { width: 240 });
    doc.text(STATUS_LETTER[row.status] ?? row.status, colX.status, y, { width: 60 });
    doc.text(row.notes, colX.notes, y, { width: 95 });
    doc.moveDown(0.3);
  }

  if (input.rows.length === 0) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Oblique').text('No students enrolled in this class.', { align: 'center' });
  }

  // Summary totals
  const totals = input.rows.reduce(
    (acc, r) => {
      const key = (STATUS_LETTER[r.status] ?? '?') as 'P' | 'A' | 'L' | 'E';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<'P' | 'A' | 'L' | 'E', number>,
  );
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(10).text(
    `Totals — Present: ${totals.P ?? 0}    Absent: ${totals.A ?? 0}    Late: ${totals.L ?? 0}    Excused: ${totals.E ?? 0}`,
  );

  // Signature lines
  doc.moveDown(3);
  doc.font('Helvetica').fontSize(10);
  doc.text('Teacher signature: ____________________________     Date: ____________');

  return finalise(doc);
}

export async function renderHistoryGridPdf(input: HistoryGridPdfInput): Promise<Buffer> {
  const doc = createDocument();

  doc.font('Helvetica-Bold').fontSize(16).text(input.schoolName, { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(12).text(
    `Attendance History — ${input.classLabel} (Period ${input.period})`,
    { align: 'center' },
  );
  doc.moveDown(0.2);
  if (input.dates.length > 0) {
    doc.fontSize(10).text(`${input.dates[0]} → ${input.dates[input.dates.length - 1]}`, { align: 'center' });
  }
  doc.moveDown(0.8);

  // Column layout: student name on the left, then one narrow column per date.
  const nameWidth = 160;
  const startX = 50;
  const cellWidth = Math.min(40, (545 - startX - nameWidth) / Math.max(input.dates.length, 1));

  // Header row
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text('Student', startX, doc.y, { width: nameWidth, continued: false });
  const headerY = doc.y - 10;
  input.dates.forEach((d, i) => {
    doc.text(d.slice(5), startX + nameWidth + i * cellWidth, headerY, {
      width: cellWidth,
      align: 'center',
    });
  });
  doc.moveDown(0.4);
  doc.moveTo(startX, doc.y).lineTo(startX + nameWidth + input.dates.length * cellWidth, doc.y).stroke();
  doc.moveDown(0.2);

  // Body rows
  doc.font('Helvetica').fontSize(9);
  input.rows.forEach((row, rowIndex) => {
    const y = doc.y;
    doc.text(row.studentName, startX, y, { width: nameWidth });
    input.cells[rowIndex]?.forEach((cell, colIndex) => {
      const letter = cell.status ? STATUS_LETTER[cell.status] ?? '?' : '–';
      doc.text(letter, startX + nameWidth + colIndex * cellWidth, y, {
        width: cellWidth,
        align: 'center',
      });
    });
    doc.moveDown(0.3);
  });

  return finalise(doc);
}
```

- [ ] **Step 3.4: Run the PDF test and verify it passes**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- export.pdf.test
```

Expected: PASS (3/3).

- [ ] **Step 3.5: Wire `?format=pdf` into the export controller**

In `c:\Users\shaun\campusly-backend\src\modules\Attendance\export.controller.ts`, replace the whole `exportAttendance` method with:

```ts
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Attendance } from './model.js';
import { generateCSV, setCsvHeaders, type CSVColumn } from '../../common/csv-export.js';
import { renderRegisterPdf, renderHistoryGridPdf, type RegisterRow, type HistoryCell } from './pdf-export.js';
import { School } from '../School/model.js';
import { Class } from '../Academic/model.js';

interface PopulatedAttendance {
  date: Date;
  period: number;
  status: string;
  notes?: string;
  studentId?: {
    admissionNumber?: string;
    userId?: { firstName?: string; lastName?: string };
    gradeId?: { name?: string };
    classId?: { name?: string };
  };
}

function formatDate(d: Date): string {
  const dt = new Date(d);
  return dt.toISOString().split('T')[0] ?? '';
}

function studentNameOf(r: PopulatedAttendance): string {
  const u = r.studentId?.userId;
  return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '';
}

export class AttendanceExportController {
  static async exportAttendance(req: Request, res: Response): Promise<void> {
    const schoolId = req.user!.schoolId!;
    const { dateFrom, dateTo, classId, format, period } = req.query;

    if (!dateFrom || !dateTo) {
      res.status(400).json({ success: false, error: 'dateFrom and dateTo are required' });
      return;
    }

    const filter: Record<string, unknown> = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      date: { $gte: new Date(dateFrom as string), $lte: new Date(dateTo as string) },
      isDeleted: false,
    };

    if (classId) filter.classId = new mongoose.Types.ObjectId(classId as string);
    if (typeof period === 'string' && period) {
      const p = Number(period);
      if (Number.isFinite(p)) filter.period = p;
    }

    const records = (await Attendance.find(filter)
      .populate({
        path: 'studentId',
        select: 'admissionNumber userId gradeId classId',
        populate: [
          { path: 'userId', select: 'firstName lastName' },
          { path: 'gradeId', select: 'name' },
          { path: 'classId', select: 'name' },
        ],
      })
      .sort({ date: 1, period: 1 })
      .lean()) as unknown as PopulatedAttendance[];

    if (format === 'pdf') {
      const buffer = await this.buildPdf({
        schoolId,
        classId: typeof classId === 'string' ? classId : undefined,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        period: typeof period === 'string' ? Number(period) : 1,
        records,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${dateFrom}-to-${dateTo}.pdf"`);
      res.end(buffer);
      return;
    }

    const columns: CSVColumn<PopulatedAttendance>[] = [
      { header: 'Date', accessor: (r) => formatDate(r.date) },
      { header: 'Student Name', accessor: studentNameOf },
      { header: 'Admission No', accessor: (r) => r.studentId?.admissionNumber ?? '' },
      { header: 'Grade', accessor: (r) => {
        const g = r.studentId?.gradeId;
        return (g && typeof g === 'object' && 'name' in g) ? (g as { name: string }).name : '';
      }},
      { header: 'Class', accessor: (r) => {
        const c = r.studentId?.classId;
        return (c && typeof c === 'object' && 'name' in c) ? (c as { name: string }).name : '';
      }},
      { header: 'Period', accessor: (r) => r.period },
      { header: 'Status', accessor: (r) => r.status },
      { header: 'Notes', accessor: (r) => r.notes ?? '' },
    ];

    const csv = generateCSV(records, columns);
    setCsvHeaders(res, 'attendance.csv');
    res.send(csv);
  }

  private static async buildPdf(args: {
    schoolId: string;
    classId?: string;
    dateFrom: string;
    dateTo: string;
    period: number;
    records: PopulatedAttendance[];
  }): Promise<Buffer> {
    const school = await School.findById(args.schoolId).select('name').lean();
    const schoolName = school?.name ?? 'School';

    let classLabel = 'All classes';
    if (args.classId) {
      const cls = await Class.findById(args.classId).select('name gradeId').populate('gradeId', 'name').lean();
      if (cls) {
        const grade = cls.gradeId as unknown as { name?: string } | undefined;
        classLabel = `${grade?.name ?? ''} ${cls.name}`.trim() || cls.name;
      }
    }

    // Single-day register iff dateFrom === dateTo
    if (args.dateFrom === args.dateTo) {
      const rows: RegisterRow[] = args.records.map((r) => ({
        admissionNumber: r.studentId?.admissionNumber ?? '',
        studentName: studentNameOf(r),
        status: r.status,
        notes: r.notes ?? '',
      }));
      return renderRegisterPdf({
        schoolName,
        classLabel,
        date: args.dateFrom,
        period: args.period,
        rows,
      });
    }

    // History grid
    const dates: string[] = [];
    {
      const start = new Date(args.dateFrom);
      const end = new Date(args.dateTo);
      const cursor = new Date(start);
      while (cursor <= end) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Pivot records: { studentId -> { date -> status } }
    const studentMap = new Map<string, { admissionNumber: string; studentName: string }>();
    const cellMap = new Map<string, Map<string, HistoryCell>>();
    for (const r of args.records) {
      const sid = r.studentId?.admissionNumber ?? studentNameOf(r);
      if (!sid) continue;
      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          admissionNumber: r.studentId?.admissionNumber ?? '',
          studentName: studentNameOf(r),
        });
      }
      const ds = formatDate(r.date);
      if (!cellMap.has(sid)) cellMap.set(sid, new Map());
      cellMap.get(sid)!.set(ds, {
        status: r.status as 'present' | 'absent' | 'late' | 'excused',
      });
    }
    const studentRows = Array.from(studentMap.values()).sort((a, b) =>
      a.studentName.localeCompare(b.studentName),
    );
    const cells: HistoryCell[][] = studentRows.map((row) => {
      const byDate = cellMap.get(row.admissionNumber || row.studentName) ?? new Map();
      return dates.map((d) => byDate.get(d) ?? { status: null });
    });

    return renderHistoryGridPdf({
      schoolName,
      classLabel,
      period: args.period,
      dates,
      rows: studentRows,
      cells,
    });
  }
}
```

- [ ] **Step 3.6: Open the `/export` route to teachers with ownership check**

In `c:\Users\shaun\campusly-backend\src\modules\Attendance\routes.ts`, replace lines 41–46:

```ts
router.get(
  '/export',
  authenticate,
  authorize('school_admin', 'super_admin'),
  AttendanceExportController.exportAttendance,
);
```

with:

```ts
router.get(
  '/export',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  requireTeacherClassOwnership('classId'),
  AttendanceExportController.exportAttendance,
);
```

(The `requireTeacherClassOwnership` middleware is already imported at the top of `routes.ts` — see existing usage on `/bulk`.)

- [ ] **Step 3.7: Run all attendance tests and confirm clean**

```bash
cd c:/Users/shaun/campusly-backend && npm test -- attendance
```

Expected: PASS for export.pdf.test (3/3), validation.date.test (5/5), controller.range.test (3/3), service.bulk.test (existing).

- [ ] **Step 3.8: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/Attendance/pdf-export.ts src/modules/Attendance/export.controller.ts src/modules/Attendance/routes.ts src/modules/Attendance/__tests__/export.pdf.test.ts
git commit -m "feat(attendance): PDF export (register + history grid), teacher authz"
```

---

## Task 4: Frontend — reshape `useTeacherAttendance` to be class-agnostic

**Files:**
- Modify: [`src/hooks/useTeacherAttendance.ts`](src/hooks/useTeacherAttendance.ts) (full rewrite)

Returns the full class list (homeroom + subjectClasses, flattened, homeroom pinned), exposes the selected classId as a parameter, fixes the UTC bug by posting a plain `YYYY-MM-DD` string.

- [ ] **Step 4.1: Full replacement of the hook**

Replace the entire contents of `src/hooks/useTeacherAttendance.ts` with:

```ts
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage, resolveId } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { toISODate } from '@/lib/utils';
import type { Student, SchoolClass } from '@/types';
import type { AttendanceEditHistoryEntry } from '@/types/attendance';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceEntry {
  status: AttendanceStatus;
  note?: string;
  editHistory?: AttendanceEditHistoryEntry[];
}

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

interface RawAttendanceRecord {
  studentId: string | { id?: string; _id?: string };
  status: AttendanceStatus;
  notes?: string;
  period?: number;
  editHistory?: AttendanceEditHistoryEntry[];
}

export interface TeacherClassOption {
  id: string;
  label: string;       // "Grade 11A · Mathematics" or "Grade 11A · Homeroom"
  isHomeroom: boolean;
  students: Student[];
}

interface TeachingLoadResponse {
  homeroom: { class: SchoolClass; subject?: { name?: string } | null; students: Student[] } | null;
  subjectClasses: { class: SchoolClass; subject: { name?: string } | null; students: Student[] }[];
}

function buildOption(entry: { class: SchoolClass; subject?: { name?: string } | null; students: Student[] }, isHomeroom: boolean): TeacherClassOption {
  const cls = entry.class;
  const gradeName = cls.grade?.name ?? cls.gradeName ?? '';
  const subjectName = entry.subject?.name ?? (isHomeroom ? 'Homeroom' : '');
  const label = [gradeName ? `${gradeName} ${cls.name}` : cls.name, subjectName]
    .filter(Boolean)
    .join(' · ');
  return {
    id: resolveId(cls),
    label,
    isHomeroom,
    students: entry.students,
  };
}

function recordsToAttendanceMap(records: RawAttendanceRecord[]): Map<string, AttendanceEntry> {
  const map = new Map<string, AttendanceEntry>();
  records.forEach((record) => {
    const sid = resolveId(record.studentId);
    if (!sid) return;
    map.set(sid, {
      status: record.status,
      note: record.notes,
      editHistory: record.editHistory,
    });
  });
  return map;
}

function defaultPresentMap(students: Student[]): Map<string, AttendanceEntry> {
  const map = new Map<string, AttendanceEntry>();
  students.forEach((student) => map.set(student.id, { status: 'present' }));
  return map;
}

interface UseTeacherAttendanceOptions {
  classId?: string;            // explicit class to load (e.g. from URL)
  initialDate?: string;        // YYYY-MM-DD, defaults to today
  initialPeriod?: number;      // defaults to 1
}

export function useTeacherAttendance(options: UseTeacherAttendanceOptions = {}) {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<TeacherClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(options.classId ?? null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(options.initialDate ?? toISODate(new Date()));
  const [period, setPeriodState] = useState<number>(options.initialPeriod ?? 1);
  const [allRecords, setAllRecords] = useState<RawAttendanceRecord[]>([]);
  const [attendance, setAttendance] = useState<Map<string, AttendanceEntry>>(new Map());
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null;

  const loadExistingAttendance = useCallback(
    async (classId: string, date: string, classStudents: Student[]) => {
      try {
        const res = await apiClient.get(`/attendance/class/${classId}`, { params: { date } });
        const records = unwrapList<RawAttendanceRecord>(res);
        const filtered = records.filter((record) => (record.period ?? 1) === period);

        setAllRecords(records);
        setLoadError(false);

        if (filtered.length > 0) {
          setAttendance(recordsToAttendanceMap(filtered));
          setExistingLoaded(true);
          return;
        }

        setAttendance(defaultPresentMap(classStudents));
        setExistingLoaded(false);
      } catch {
        toast.error('Could not load previous attendance. Refresh before saving.');
        setAllRecords([]);
        setLoadError(true);
        setAttendance(defaultPresentMap(classStudents));
        setExistingLoaded(false);
      }
    },
    [period],
  );

  // Initial load: fetch the teacher's classes, resolve the selected class, load attendance.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const res = await apiClient.get('/academic/teacher/me/teaching-load');
        if (cancelled) return;
        const data = unwrapResponse<TeachingLoadResponse>(res);

        const opts: TeacherClassOption[] = [];
        if (data.homeroom) opts.push(buildOption(data.homeroom, true));
        for (const sc of data.subjectClasses) opts.push(buildOption(sc, false));
        // Homeroom is pinned first by construction; sort the rest alphabetically.
        const homeroom = opts.filter((o) => o.isHomeroom);
        const rest = opts.filter((o) => !o.isHomeroom).sort((a, b) => a.label.localeCompare(b.label));
        const sorted = [...homeroom, ...rest];
        setClasses(sorted);

        const resolvedId = (options.classId && sorted.some((c) => c.id === options.classId))
          ? options.classId
          : (sorted[0]?.id ?? null);
        setSelectedClassId(resolvedId);

        if (!resolvedId) return;
        const target = sorted.find((c) => c.id === resolvedId)!;
        setStudents(target.students);
        await loadExistingAttendance(resolvedId, selectedDate, target.students);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('Failed to load attendance data', err);
        toast.error('Could not load attendance data. Please refresh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const changeClass = useCallback(
    async (nextClassId: string) => {
      const target = classes.find((c) => c.id === nextClassId);
      if (!target) return;
      setSelectedClassId(nextClassId);
      setStudents(target.students);
      setSaved(false);
      setExistingLoaded(false);
      await loadExistingAttendance(nextClassId, selectedDate, target.students);
    },
    [classes, selectedDate, loadExistingAttendance],
  );

  const changeDate = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      setSaved(false);
      setExistingLoaded(false);
      if (selectedClass) {
        await loadExistingAttendance(selectedClass.id, date, students);
      }
    },
    [selectedClass, students, loadExistingAttendance],
  );

  const setPeriod = useCallback(
    (nextPeriod: number) => {
      setPeriodState(nextPeriod);
      setSaved(false);
      const filtered = allRecords.filter((record) => (record.period ?? 1) === nextPeriod);
      if (filtered.length > 0) {
        setAttendance(recordsToAttendanceMap(filtered));
        setExistingLoaded(true);
        return;
      }
      setAttendance(defaultPresentMap(students));
      setExistingLoaded(false);
    },
    [allRecords, students],
  );

  const updateStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, {
        status,
        note: existing?.note,
        editHistory: existing?.editHistory,
      });
      return next;
    });
    setSaved(false);
  }, []);

  const updateNote = useCallback((studentId: string, note: string) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, {
        status: existing?.status ?? 'present',
        note: note.trim() === '' ? undefined : note,
        editHistory: existing?.editHistory,
      });
      return next;
    });
    setSaved(false);
  }, []);

  const markAll = useCallback((status: AttendanceStatus) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      students.forEach((student) => {
        const existing = next.get(student.id);
        next.set(student.id, {
          status,
          note: existing?.note,        // preserve notes
          editHistory: existing?.editHistory,
        });
      });
      return next;
    });
    setSaved(false);
  }, [students]);

  const saveAttendance = useCallback(async () => {
    if (!user?.schoolId) { toast.error('School information not available'); return; }
    if (!selectedClass) { toast.error('No class selected'); return; }
    if (students.length === 0) { toast.error('No students to mark attendance for'); return; }
    if (selectedDate > toISODate(new Date())) { toast.error('Cannot record attendance for a future date'); return; }
    if (loadError) {
      toast.error('Attendance could not be verified. Refresh before saving.');
      return;
    }

    const records: AttendanceRecord[] = students.map((student) => {
      const entry = attendance.get(student.id);
      return {
        studentId: student.id,
        status: entry?.status ?? 'present',
        notes: entry?.note?.trim() ?? '',
      };
    });

    const isUpdate = existingLoaded;
    setSaving(true);
    try {
      await apiClient.post('/attendance/bulk', {
        classId: selectedClass.id,
        date: selectedDate, // plain YYYY-MM-DD; backend accepts both formats since Task 1
        period,
        records,
      });
      setAllRecords((prev) => [
        ...prev.filter((record) => (record.period ?? 1) !== period),
        ...records.map((record) => ({
          studentId: record.studentId,
          status: record.status,
          notes: record.notes,
          period,
        })),
      ]);
      setLoadError(false);
      setSaved(true);
      setExistingLoaded(true);
      toast.success(isUpdate
        ? `Attendance updated for ${selectedDate}`
        : `Attendance saved for ${selectedDate}`);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save attendance. Please try again.'));
    } finally {
      setSaving(false);
    }
  }, [user?.schoolId, selectedClass, students, selectedDate, period, attendance, existingLoaded, loadError]);

  return {
    classes,
    selectedClass,
    students,
    selectedDate,
    period,
    attendance,
    existingLoaded,
    loadError,
    saving,
    saved,
    loading,
    changeClass,
    changeDate,
    setPeriod,
    updateStatus,
    updateNote,
    markAll,
    saveAttendance,
  };
}
```

- [ ] **Step 4.2: Verify with tsc**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

Expected: `teacher/attendance/page.tsx` will fail (it consumes the OLD hook shape — `homeClass`, `markAllPresent`). That's intentional — it gets rewritten in Task 11. **Note the error count and ignore those specific errors when verifying subsequent tasks.**

Pre-existing repo errors unrelated to attendance can also be ignored.

- [ ] **Step 4.3: Commit**

The page.tsx error means we can't ship this hook alone without breaking the build. Stash the commit, will land atomically with the page rewrite in Task 11.

Skip the commit step here; carry the change forward. (If your local tooling requires a clean tree, commit with `--no-verify` only if explicitly requested by the user — otherwise leave uncommitted.)

---

## Task 5: Frontend — create `useAttendanceHistory` hook

**Files:**
- Create: `src/hooks/useAttendanceHistory.ts`

Loads a date range of attendance records for a single class + period. Powers the History tab.

- [ ] **Step 5.1: Create the hook**

Create `src/hooks/useAttendanceHistory.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, resolveId } from '@/lib/api-helpers';

export type HistoryStatus = 'present' | 'absent' | 'late' | 'excused';

export interface HistoryRecord {
  studentId: string;
  date: string;       // YYYY-MM-DD
  status: HistoryStatus;
  notes?: string;
  period: number;
}

interface RawRecord {
  studentId: string | { id?: string; _id?: string };
  date: string | Date;
  status: HistoryStatus;
  notes?: string;
  period?: number;
}

function normalizeDate(d: string | Date): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

interface UseAttendanceHistoryOptions {
  classId: string | null;
  period: number;
  dateFrom: string;   // YYYY-MM-DD
  dateTo: string;     // YYYY-MM-DD
}

export function useAttendanceHistory({ classId, period, dateFrom, dateTo }: UseAttendanceHistoryOptions) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!classId) {
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/attendance/class/${classId}`, {
        params: { dateFrom, dateTo, period },
      });
      const raw = unwrapList<RawRecord>(res);
      const mapped: HistoryRecord[] = raw
        .filter((r) => (r.period ?? 1) === period)
        .map((r) => ({
          studentId: resolveId(r.studentId),
          date: normalizeDate(r.date),
          status: r.status,
          notes: r.notes,
          period: r.period ?? 1,
        }))
        .filter((r) => r.studentId);
      setRecords(mapped);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load attendance history', err);
      setError('Could not load attendance history');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [classId, period, dateFrom, dateTo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { records, loading, error, refresh };
}
```

- [ ] **Step 5.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/hooks/useAttendanceHistory.ts
git commit -m "feat(attendance): add useAttendanceHistory hook (date-range loader)"
```

---

## Task 6: Frontend — create `useAttendanceExport` hook

**Files:**
- Create: `src/hooks/useAttendanceExport.ts`

Wraps the PDF export call and triggers a browser download.

- [ ] **Step 6.1: Create the hook**

Create `src/hooks/useAttendanceExport.ts`:

```ts
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';

interface ExportArgs {
  classId: string;
  period: number;
  dateFrom: string;   // YYYY-MM-DD
  dateTo: string;     // YYYY-MM-DD (same as dateFrom for single-day register)
  filename: string;
}

export function useAttendanceExport() {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async (args: ExportArgs) => {
    setExporting(true);
    try {
      const res = await apiClient.get('/attendance/export', {
        params: {
          classId: args.classId,
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          period: args.period,
          format: 'pdf',
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = args.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not export PDF'));
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportPdf, exporting };
}
```

- [ ] **Step 6.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/hooks/useAttendanceExport.ts
git commit -m "feat(attendance): add useAttendanceExport hook (PDF blob download)"
```

---

## Task 7: Frontend — `AttendanceClassPicker` component

**Files:**
- Create: `src/components/attendance/AttendanceClassPicker.tsx`

- [ ] **Step 7.1: Create the component**

Create `src/components/attendance/AttendanceClassPicker.tsx`:

```tsx
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TeacherClassOption } from '@/hooks/useTeacherAttendance';

interface AttendanceClassPickerProps {
  classes: TeacherClassOption[];
  value: string | null;
  onChange: (classId: string) => void;
  disabled?: boolean;
}

export function AttendanceClassPicker({ classes, value, onChange, disabled }: AttendanceClassPickerProps) {
  if (classes.length === 0) return null;
  return (
    <Select
      value={value ?? ''}
      onValueChange={(v: unknown) => {
        if (typeof v === 'string' && v) onChange(v);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue placeholder="Select class" />
      </SelectTrigger>
      <SelectContent>
        {classes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 7.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/attendance/AttendanceClassPicker.tsx
git commit -m "feat(attendance): add AttendanceClassPicker component"
```

---

## Task 8: Frontend — `AttendanceBulkMarkMenu` component

**Files:**
- Create: `src/components/attendance/AttendanceBulkMarkMenu.tsx`

A split button: primary `Mark all present` + a dropdown for All absent / All late. (Excused omitted — not a sensible bulk action.)

- [ ] **Step 8.1: Create the component**

Create `src/components/attendance/AttendanceBulkMarkMenu.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';

interface AttendanceBulkMarkMenuProps {
  onMarkAll: (status: AttendanceStatus) => void;
  disabled?: boolean;
}

export function AttendanceBulkMarkMenu({ onMarkAll, disabled }: AttendanceBulkMarkMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <Button
        variant="outline"
        onClick={() => onMarkAll('present')}
        disabled={disabled}
        className="rounded-r-none"
      >
        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
        Mark all present
      </Button>
      <Button
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded-l-none border-l-0 px-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More bulk mark options"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-md border bg-popover shadow-md"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => { onMarkAll('absent'); setOpen(false); }}
          >
            Mark all absent
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => { onMarkAll('late'); setOpen(false); }}
          >
            Mark all late
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 8.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/attendance/AttendanceBulkMarkMenu.tsx
git commit -m "feat(attendance): add AttendanceBulkMarkMenu split button"
```

---

## Task 9: Frontend — `AttendanceTodayTab` component

**Files:**
- Create: `src/components/attendance/AttendanceTodayTab.tsx`

Extracts the daily-form rendering from the current page (with prev/next-day arrows added). Uses the new hook shape from Task 4.

- [ ] **Step 9.1: Create the component**

Create `src/components/attendance/AttendanceTodayTab.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StudentRow } from '@/components/attendance/StudentRow';
import { AttendanceBulkMarkMenu } from '@/components/attendance/AttendanceBulkMarkMenu';
import { getStudentDisplayName } from '@/lib/student-helpers';
import { toISODate } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Save, Users, Info, Search, AlertTriangle } from 'lucide-react';
import type { Student } from '@/types';
import type { AttendanceEntry, AttendanceStatus } from '@/hooks/useTeacherAttendance';

interface AttendanceTodayTabProps {
  students: Student[];
  selectedDate: string;
  period: number;
  attendance: Map<string, AttendanceEntry>;
  existingLoaded: boolean;
  loadError: boolean;
  saving: boolean;
  saved: boolean;
  onChangeDate: (date: string) => void | Promise<void>;
  onSetPeriod: (period: number) => void;
  onUpdateStatus: (studentId: string, status: AttendanceStatus) => void;
  onUpdateNote: (studentId: string, note: string) => void;
  onMarkAll: (status: AttendanceStatus) => void;
  onSave: () => void | Promise<void>;
}

export function AttendanceTodayTab(props: AttendanceTodayTabProps) {
  const {
    students, selectedDate, period, attendance,
    existingLoaded, loadError, saving, saved,
    onChangeDate, onSetPeriod, onUpdateStatus, onUpdateNote, onMarkAll, onSave,
  } = props;

  const [search, setSearch] = useState('');
  const todayISO = toISODate(new Date());
  const isEditing = existingLoaded && !saved;
  const isPastDate = selectedDate < todayISO;
  const isToday = selectedDate === todayISO;

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, excused = 0;
    students.forEach((s) => {
      const st = attendance.get(s.id)?.status ?? 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
      else excused++;
    });
    return { present, absent, late, excused };
  }, [attendance, students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = getStudentDisplayName(s).full.toLowerCase();
      return name.includes(q) || (s.admissionNumber ?? '').toLowerCase().includes(q);
    });
  }, [students, search]);

  const stepDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const next = toISODate(d);
    if (next > todayISO) return; // can't step into the future
    void onChangeDate(next);
  };

  const showFilteredCount = search.trim() !== '' && filteredStudents.length !== students.length;

  return (
    <div className="space-y-4">
      {/* Date row + period + stats */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border bg-card p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Date:</span>
            <Button variant="outline" size="icon-sm" aria-label="Previous day" onClick={() => stepDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={selectedDate}
              max={todayISO}
              onChange={(e) => { void onChangeDate(e.target.value); }}
              className="w-full sm:w-40"
            />
            <Button variant="outline" size="icon-sm" aria-label="Next day" disabled={isToday} onClick={() => stepDate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={isToday} onClick={() => onChangeDate(todayISO)}>
              Today
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Period:</span>
            <Select value={String(period)} onValueChange={(v: unknown) => onSetPeriod(Number(v as string))}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <SelectItem key={p} value={String(p)}>Period {p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm sm:ml-auto">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">
              {showFilteredCount
                ? `${filteredStudents.length} / ${students.length} students`
                : `${students.length} students`}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">{stats.present} Present</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-destructive font-medium">{stats.absent} Absent</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-amber-700 dark:text-amber-400 font-medium">{stats.late} Late</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-blue-700 dark:text-blue-400 font-medium">{stats.excused} Excused</span>
          </span>
        </div>
      </div>

      {loadError ? (
        <Alert className="border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Attendance could not be loaded for this date and period. Refresh before saving to avoid overwriting existing records.
          </AlertDescription>
        </Alert>
      ) : null}

      {existingLoaded ? (
        <Alert className="border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30">
          <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <AlertDescription className="text-sky-800 dark:text-sky-300">
            {isPastDate
              ? `Viewing attendance for ${selectedDate}. You can update individual records.`
              : `Attendance already recorded for today. You can update individual records.`}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Tap a status to mark each student</span>
        </div>
        <div className="flex gap-2">
          <AttendanceBulkMarkMenu onMarkAll={onMarkAll} disabled={saving} />
          <Button
            size="default"
            onClick={() => { void onSave(); }}
            disabled={saving || saved || loadError}
            className="flex-1 sm:flex-none"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : saved ? 'Saved' : isEditing ? 'Update Attendance' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {students.length > 0 ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name or admission number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
      ) : null}

      {students.length === 0 ? (
        <EmptyState icon={Users} title="No Students" description="No students are enrolled in this class yet." />
      ) : filteredStudents.length === 0 ? (
        <EmptyState icon={Search} title="No Matches" description="No students match your search. Try a different query." />
      ) : (
        <div className="space-y-2">
          {filteredStudents.map((student) => {
            const entry = attendance.get(student.id);
            return (
              <StudentRow
                key={student.id}
                student={student}
                status={entry?.status ?? 'present'}
                note={entry?.note}
                editHistory={entry?.editHistory}
                onUpdate={onUpdateStatus}
                onNoteChange={onUpdateNote}
              />
            );
          })}
        </div>
      )}

      {filteredStudents.length > 5 ? (
        <div className="flex justify-end pt-2 pb-4">
          <Button
            size="default"
            onClick={() => { void onSave(); }}
            disabled={saving || saved || loadError}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : saved ? 'Saved' : isEditing ? 'Update Attendance' : 'Save Attendance'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 9.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/attendance/AttendanceTodayTab.tsx
git commit -m "feat(attendance): add AttendanceTodayTab (extracted from page, with prev/next/today + bulk menu)"
```

---

## Task 10: Frontend — `AttendanceDayEditDialog` component

**Files:**
- Create: `src/components/attendance/AttendanceDayEditDialog.tsx`

A base-ui `<Dialog>` for editing a single day from inside the History grid. Uses the CLAUDE.md scroll pattern.

- [ ] **Step 10.1: Create the component**

Create `src/components/attendance/AttendanceDayEditDialog.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StudentRow } from '@/components/attendance/StudentRow';
import { Loader2, Save } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage, resolveId } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { Student } from '@/types';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';

interface RawRecord {
  studentId: string | { id?: string; _id?: string };
  status: AttendanceStatus;
  notes?: string;
  period?: number;
}

interface AttendanceDayEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  date: string;        // YYYY-MM-DD
  period: number;
  students: Student[];
  onSaved: () => void; // parent refreshes the grid
}

interface Entry {
  status: AttendanceStatus;
  note?: string;
}

export function AttendanceDayEditDialog({
  open, onOpenChange, classId, date, period, students, onSaved,
}: AttendanceDayEditDialogProps) {
  const [entries, setEntries] = useState<Map<string, Entry>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiClient.get(`/attendance/class/${classId}`, { params: { date } });
        if (cancelled) return;
        const raw = unwrapList<RawRecord>(res).filter((r) => (r.period ?? 1) === period);
        const map = new Map<string, Entry>();
        students.forEach((s) => map.set(s.id, { status: 'present' }));
        for (const r of raw) {
          const sid = resolveId(r.studentId);
          if (sid) map.set(sid, { status: r.status, note: r.notes });
        }
        setEntries(map);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Could not load this day'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, classId, date, period, students]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, { status, note: existing?.note });
      return next;
    });
  };

  const updateNote = (studentId: string, note: string) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, {
        status: existing?.status ?? 'present',
        note: note.trim() === '' ? undefined : note,
      });
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.post('/attendance/bulk', {
        classId,
        date,                  // plain YYYY-MM-DD
        period,
        records: students.map((s) => {
          const e = entries.get(s.id);
          return {
            studentId: s.id,
            status: e?.status ?? 'present',
            notes: e?.note?.trim() ?? '',
          };
        }),
      });
      toast.success(`Attendance saved for ${date}`);
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const dialogTitle = useMemo(() => `Edit attendance — ${date}`, [date]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s) => {
                const e = entries.get(s.id);
                return (
                  <StudentRow
                    key={s.id}
                    student={s}
                    status={e?.status ?? 'present'}
                    note={e?.note}
                    onUpdate={updateStatus}
                    onNoteChange={updateNote}
                  />
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => { void save(); }} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 10.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/attendance/AttendanceDayEditDialog.tsx
git commit -m "feat(attendance): add AttendanceDayEditDialog (scrollable, per-day edit)"
```

---

## Task 11: Frontend — `AttendanceHistoryTab` component

**Files:**
- Create: `src/components/attendance/AttendanceHistoryTab.tsx`

The grid view. Week / Month toggle, prev/next, Today, keyboard-accessible cells, per-student + per-day percentages.

- [ ] **Step 11.1: Create the component**

Create `src/components/attendance/AttendanceHistoryTab.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AttendanceDayEditDialog } from '@/components/attendance/AttendanceDayEditDialog';
import { useAttendanceHistory, type HistoryStatus } from '@/hooks/useAttendanceHistory';
import { toISODate } from '@/lib/utils';
import { getStudentDisplayName } from '@/lib/student-helpers';
import type { Student } from '@/types';

type GridView = 'week' | 'month';

interface AttendanceHistoryTabProps {
  classId: string | null;
  period: number;
  students: Student[];
  onRefreshParent?: () => void;                     // if the parent wants to refresh after edit
  onRangeChange?: (dateFrom: string, dateTo: string) => void;  // so the page can scope PDF export to the visible grid
}

const STATUS_LETTER: Record<HistoryStatus, string> = {
  present: '✓', absent: 'A', late: 'L', excused: 'E',
};
const STATUS_COLOUR: Record<HistoryStatus, string> = {
  present: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30',
  absent: 'text-destructive bg-destructive/10',
  late: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30',
  excused: 'text-blue-700 bg-blue-50 dark:bg-blue-950/30',
};

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7; // 0 = Mon
}

function buildWeekRange(reference: Date): { dateFrom: string; dateTo: string; dates: string[] } {
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - mondayIndex(reference));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4); // Mon-Fri by default
  const dates: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(toISODate(d));
  }
  return { dateFrom: dates[0]!, dateTo: dates[dates.length - 1]!, dates };
}

function buildMonthRange(reference: Date): { dateFrom: string; dateTo: string; dates: string[] } {
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const last = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  const dates: string[] = [];
  const cursor = new Date(first);
  while (cursor <= last) {
    // Mon-Fri only (skip weekends to keep the grid teacher-relevant)
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { dateFrom: toISODate(first), dateTo: toISODate(last), dates };
}

export function AttendanceHistoryTab({ classId, period, students, onRefreshParent, onRangeChange }: AttendanceHistoryTabProps) {
  const [view, setView] = useState<GridView>('week');
  const [reference, setReference] = useState<Date>(new Date());
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const range = useMemo(
    () => (view === 'week' ? buildWeekRange(reference) : buildMonthRange(reference)),
    [view, reference],
  );

  const { records, loading, refresh } = useAttendanceHistory({
    classId,
    period,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  });

  // Notify the parent whenever the visible date range changes (so the PDF
  // export button can scope its download to exactly what's on screen).
  // Parent MUST provide a stable callback (useCallback) to avoid render loops.
  useEffect(() => {
    onRangeChange?.(range.dateFrom, range.dateTo);
  }, [range.dateFrom, range.dateTo, onRangeChange]);

  // index by studentId -> date -> status
  const byStudent = useMemo(() => {
    const map = new Map<string, Map<string, HistoryStatus>>();
    for (const r of records) {
      if (!map.has(r.studentId)) map.set(r.studentId, new Map());
      map.get(r.studentId)!.set(r.date, r.status);
    }
    return map;
  }, [records]);

  // Per-student %
  const studentPct = useMemo(() => {
    const out = new Map<string, number>();
    for (const s of students) {
      const dayMap = byStudent.get(s.id);
      if (!dayMap) { out.set(s.id, 0); continue; }
      const total = dayMap.size;
      const present = Array.from(dayMap.values()).filter((st) => st === 'present').length;
      out.set(s.id, total === 0 ? 0 : Math.round((present / total) * 100));
    }
    return out;
  }, [byStudent, students]);

  // Per-day %
  const dayPct = useMemo(() => {
    const out = new Map<string, number>();
    for (const d of range.dates) {
      let present = 0;
      let total = 0;
      for (const s of students) {
        const status = byStudent.get(s.id)?.get(d);
        if (status) {
          total += 1;
          if (status === 'present') present += 1;
        }
      }
      out.set(d, total === 0 ? 0 : Math.round((present / total) * 100));
    }
    return out;
  }, [byStudent, students, range.dates]);

  const stepBy = (deltaWeeks: number, deltaMonths: number) => {
    setReference((prev) => {
      const next = new Date(prev);
      if (deltaWeeks) next.setDate(next.getDate() + deltaWeeks * 7);
      if (deltaMonths) next.setMonth(next.getMonth() + deltaMonths);
      return next;
    });
  };

  const handlePrev = () => (view === 'week' ? stepBy(-1, 0) : stepBy(0, -1));
  const handleNext = () => (view === 'week' ? stepBy(1, 0) : stepBy(0, 1));
  const handleToday = () => setReference(new Date());

  const handleDayEdited = () => {
    void refresh();
    onRefreshParent?.();
  };

  if (!classId) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Select a class to view history.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" aria-label="Previous period" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next period" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
          <span className="ml-2 text-sm text-muted-foreground">
            {range.dateFrom} → {range.dateTo}
          </span>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`px-3 py-1 text-xs font-medium ${view === 'week' ? 'bg-muted' : 'hover:bg-muted/50'}`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={`border-l px-3 py-1 text-xs font-medium ${view === 'month' ? 'bg-muted' : 'hover:bg-muted/50'}`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Student</th>
              {range.dates.map((d) => (
                <th key={d} className="px-2 py-2 text-center font-medium">
                  {d.slice(5)}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <div className="text-sm font-medium">{getStudentDisplayName(s).full}</div>
                  {s.admissionNumber ? (
                    <div className="text-xs text-muted-foreground">{s.admissionNumber}</div>
                  ) : null}
                </td>
                {range.dates.map((d) => {
                  const status = byStudent.get(s.id)?.get(d);
                  return (
                    <td key={d} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        aria-label={`Edit ${d}`}
                        onClick={() => setEditingDate(d)}
                        className={`inline-block w-7 rounded px-1 py-0.5 text-xs font-medium hover:ring-1 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring ${
                          status ? STATUS_COLOUR[status] : 'text-muted-foreground'
                        }`}
                      >
                        {status ? STATUS_LETTER[status] : '–'}
                      </button>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-sm font-medium">{studentPct.get(s.id) ?? 0}%</td>
              </tr>
            ))}
            {students.length === 0 ? (
              <tr><td colSpan={range.dates.length + 2} className="px-3 py-8 text-center text-muted-foreground">No students</td></tr>
            ) : null}
          </tbody>
          {students.length > 0 ? (
            <tfoot>
              <tr className="border-t bg-muted/30 text-xs">
                <td className="px-3 py-2 font-medium text-muted-foreground">Class %</td>
                {range.dates.map((d) => (
                  <td key={d} className="px-2 py-2 text-center font-medium">{dayPct.get(d) ?? 0}%</td>
                ))}
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {loading ? (
        <p className="text-center text-xs text-muted-foreground">Loading…</p>
      ) : null}

      {editingDate && classId ? (
        <AttendanceDayEditDialog
          open={editingDate !== null}
          onOpenChange={(open) => { if (!open) setEditingDate(null); }}
          classId={classId}
          date={editingDate}
          period={period}
          students={students}
          onSaved={handleDayEdited}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 11.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/attendance/AttendanceHistoryTab.tsx
git commit -m "feat(attendance): add AttendanceHistoryTab (grid view, week/month toggle, % rows, edit dialog)"
```

---

## Task 12: Frontend — `AttendanceExportButton` component

**Files:**
- Create: `src/components/attendance/AttendanceExportButton.tsx`

- [ ] **Step 12.1: Create the component**

Create `src/components/attendance/AttendanceExportButton.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useAttendanceExport } from '@/hooks/useAttendanceExport';

interface AttendanceExportButtonProps {
  classId: string | null;
  period: number;
  dateFrom: string;   // YYYY-MM-DD (same as dateTo for single-day register)
  dateTo: string;
  filename: string;
}

export function AttendanceExportButton({ classId, period, dateFrom, dateTo, filename }: AttendanceExportButtonProps) {
  const { exportPdf, exporting } = useAttendanceExport();
  const disabled = !classId || exporting;

  return (
    <Button
      variant="outline"
      onClick={() => {
        if (!classId) return;
        void exportPdf({ classId, period, dateFrom, dateTo, filename });
      }}
      disabled={disabled}
    >
      {exporting
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        : <FileDown className="mr-2 h-4 w-4" />}
      {exporting ? 'Generating…' : 'Export PDF'}
    </Button>
  );
}
```

- [ ] **Step 12.2: Verify and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add src/components/attendance/AttendanceExportButton.tsx
git commit -m "feat(attendance): add AttendanceExportButton"
```

---

## Task 13: Frontend — atomic page rewrite + commit the hook from Task 4

**Files:**
- Modify: `src/app/(dashboard)/teacher/attendance/page.tsx` (full rewrite)
- Confirm: `src/hooks/useTeacherAttendance.ts` already changed in Task 4 — staged here.

This is the wiring task. Page composes the class picker + tab bar + Today + History + Export button. Brings the build back to green.

- [ ] **Step 13.1: Full replacement of the page**

Replace the entire contents of `src/app/(dashboard)/teacher/attendance/page.tsx` with:

```tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';
import { useTeacherAttendance } from '@/hooks/useTeacherAttendance';
import { AttendanceClassPicker } from '@/components/attendance/AttendanceClassPicker';
import { AttendanceTodayTab } from '@/components/attendance/AttendanceTodayTab';
import { AttendanceHistoryTab } from '@/components/attendance/AttendanceHistoryTab';
import { AttendanceExportButton } from '@/components/attendance/AttendanceExportButton';
import { toISODate } from '@/lib/utils';
import Link from 'next/link';

type AttendanceView = 'today' | 'history';

function isView(value: string | null): value is AttendanceView {
  return value === 'today' || value === 'history';
}

function initialHistoryRange(): { from: string; to: string } {
  const ref = new Date();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return { from: toISODate(monday), to: toISODate(friday) };
}

export default function TeacherAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get('classId') ?? undefined;
  const initialTab: AttendanceView = isView(searchParams.get('tab')) ? (searchParams.get('tab') as AttendanceView) : 'today';

  const [view, setView] = useState<AttendanceView>(initialTab);
  const [historyRange, setHistoryRange] = useState(initialHistoryRange);

  const hook = useTeacherAttendance({ classId: initialClassId });

  // Sync URL when class or tab changes — replace (no history entries).
  useEffect(() => {
    if (!hook.selectedClass) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('classId', hook.selectedClass.id);
    params.set('tab', view);
    router.replace(`/teacher/attendance?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.selectedClass?.id, view]);

  // Stable callback so AttendanceHistoryTab's useEffect doesn't loop.
  const handleHistoryRange = useCallback((from: string, to: string) => {
    setHistoryRange({ from, to });
  }, []);

  // PDF export scope: today tab = the single selected date; history tab =
  // whatever range the History component reports via onRangeChange.
  const exportScope = useMemo(() => {
    if (view === 'today') {
      return {
        dateFrom: hook.selectedDate,
        dateTo: hook.selectedDate,
        filename: `register-${hook.selectedDate}.pdf`,
      };
    }
    return {
      dateFrom: historyRange.from,
      dateTo: historyRange.to,
      filename: `register-${historyRange.from}-to-${historyRange.to}.pdf`,
    };
  }, [view, hook.selectedDate, historyRange]);

  if (hook.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" description="Mark daily attendance for any of your classes" />
        <LoadingSpinner />
      </div>
    );
  }

  if (hook.classes.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" />
        <EmptyState
          icon={BookOpen}
          title="No classes yet"
          description="You have no classes yet. Create one in the Classes section first."
          action={<Link href="/teacher/classes" className="text-primary underline">Open Classes →</Link>}
        />
      </div>
    );
  }

  const classLabel = hook.selectedClass?.label ?? '';

  return (
    <div className="space-y-4">
      <PageHeader title="Attendance" description={classLabel}>
        <AttendanceClassPicker
          classes={hook.classes}
          value={hook.selectedClass?.id ?? null}
          onChange={(id) => { void hook.changeClass(id); }}
        />
        <AttendanceExportButton
          classId={hook.selectedClass?.id ?? null}
          period={hook.period}
          dateFrom={exportScope.dateFrom}
          dateTo={exportScope.dateTo}
          filename={exportScope.filename}
        />
      </PageHeader>

      <Tabs value={view} onValueChange={(v: unknown) => { if (isView(v as string)) setView(v as AttendanceView); }}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <AttendanceTodayTab
            students={hook.students}
            selectedDate={hook.selectedDate}
            period={hook.period}
            attendance={hook.attendance}
            existingLoaded={hook.existingLoaded}
            loadError={hook.loadError}
            saving={hook.saving}
            saved={hook.saved}
            onChangeDate={hook.changeDate}
            onSetPeriod={hook.setPeriod}
            onUpdateStatus={hook.updateStatus}
            onUpdateNote={hook.updateNote}
            onMarkAll={hook.markAll}
            onSave={hook.saveAttendance}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <AttendanceHistoryTab
            classId={hook.selectedClass?.id ?? null}
            period={hook.period}
            students={hook.students}
            onRangeChange={handleHistoryRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 13.2: Verify type-check, lint, and line counts**

```bash
cd c:/Users/shaun/campusly-frontend
npx tsc --noEmit
npx eslint "src/app/(dashboard)/teacher/attendance/page.tsx" "src/hooks/useTeacherAttendance.ts" "src/components/attendance/Attendance*.tsx" "src/hooks/useAttendance*.ts"
node -e "console.log('page.tsx:', require('fs').readFileSync('src/app/(dashboard)/teacher/attendance/page.tsx','utf8').split('\n').length)"
```

Expected: tsc clean, eslint clean for the touched files. `page.tsx` < 350 lines.

If `tsc` flags any property mismatches (e.g. `homeClass` vs the new hook's `selectedClass`), it means the refactor missed something — fix at the source, do not cast.

- [ ] **Step 13.3: Commit atomically**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useTeacherAttendance.ts "src/app/(dashboard)/teacher/attendance/page.tsx"
git commit -m "feat(attendance): rewrite teacher/attendance page; reshape useTeacherAttendance for multi-class"
```

---

## Task 14: Frontend — delete embedded register + roster cleanup

**Files:**
- Modify: `src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx`
- Delete: `src/components/classes/TeachingGroupAttendanceRegister.tsx`

- [ ] **Step 14.1: Verify no other consumers**

```bash
cd c:/Users/shaun/campusly-frontend
```

Use the Grep tool: pattern `TeachingGroupAttendanceRegister`, in `src/`. Expected: only matches in `roster/page.tsx` and the component file itself. If anything else imports it, STOP and report — the spec assumes it's only used in the roster page.

- [ ] **Step 14.2: Update the roster page**

Open `src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx`. Locate the `<TeachingGroupAttendanceRegister …/>` render and its import. Replace the render with:

```tsx
<div className="rounded-lg border bg-card p-4">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h3 className="text-base font-semibold">Attendance</h3>
      <p className="text-sm text-muted-foreground">
        Take this class's daily register from the dedicated attendance page.
      </p>
    </div>
    <Link href={`/teacher/attendance?classId=${classId}`}>
      <Button>
        Take attendance
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Link>
  </div>
</div>
```

Remove the `TeachingGroupAttendanceRegister` import. Add (if not already present) `import Link from 'next/link';` and `import { Button } from '@/components/ui/button';` and `import { ArrowRight } from 'lucide-react';`. The `classId` variable already exists in the page (from `useParams`); reuse it.

- [ ] **Step 14.3: Delete the embedded register component**

```bash
cd c:/Users/shaun/campusly-frontend
rm src/components/classes/TeachingGroupAttendanceRegister.tsx
```

- [ ] **Step 14.4: Verify tsc clean and commit**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
git add "src/app/(dashboard)/teacher/classes/[classId]/roster/page.tsx" src/components/classes/TeachingGroupAttendanceRegister.tsx
git commit -m "refactor(attendance): replace embedded register on roster with link; delete unused component"
```

---

## Task 15: Manual QA against acceptance criteria

**Files:** None modified — verification only.

- [ ] **Step 15.1: Start the dev servers**

Terminal 1:
```bash
cd c:/Users/shaun/campusly-backend && npm run dev
```

Terminal 2:
```bash
cd c:/Users/shaun/campusly-frontend && npm run dev
```

Frontend at `http://localhost:3500`.

- [ ] **Step 15.2: QA — class picker for a standalone teacher**

1. Sign in as a standalone teacher with multiple teaching groups.
2. Visit `/teacher/attendance`.
3. Expected: page renders. Class picker is populated. Default class = homeroom if present, else first alphabetical. Today tab shows daily form for that class.
4. Change class in the picker. URL updates to `?classId=<new id>&tab=today`. Form reloads for the new class.

- [ ] **Step 15.3: QA — Today tab daily flow**

1. With a class selected, click "Mark all present", then change one student to Absent and add a note. Save. Expect "Saved" state + records visible on reload.
2. Open the bulk-mark `▾` menu; pick "Mark all late". Verify the student note from step 1 is preserved.
3. Click prev-day arrow. Date moves back by one day. Click next-day arrow. Date moves forward (but next-day is disabled on today). Click "Today" — snaps back to today's date.
4. Network panel: confirm the POST to `/api/attendance/bulk` sends `date` as `YYYY-MM-DD` (no `T00:00:00.000Z`).

- [ ] **Step 15.4: QA — History tab**

1. Switch to History tab. URL updates to `?tab=history`.
2. Expected: grid shows students × dates for the current week (Mon-Fri). Empty cells show `–`. Cells with data show `✓ / A / L / E` in their colour.
3. Per-student % column on the right; per-day % row at the bottom.
4. Click an empty cell. Edit-dialog opens scoped to that date. Mark a student absent. Save. Dialog closes. Grid refreshes with the new cell.
5. Tab to a cell with the keyboard. Press Enter. Dialog opens. Pass = cells are keyboard accessible.
6. Switch view to Month. Grid expands to full month (Mon-Fri weekdays only). Prev/next now step by month. "Today" snaps back.
7. Change the period selector on the Today tab. Switch to History — period stays at the new value (page-level state).

- [ ] **Step 15.5: QA — PDF export**

1. From Today tab, click "Export PDF". A PDF downloads named `register-YYYY-MM-DD.pdf`. Open it — school name, class label, date, period, student table, totals, signature line.
2. Switch to History tab. Click "Export PDF". A grid PDF downloads (`register-week-YYYY-MM-DD.pdf`) with the current week's grid.
3. Try exporting for a class the teacher does NOT own (manually construct the URL): expect 403/401 from backend (ownership middleware).

- [ ] **Step 15.6: QA — roster page cleanup**

1. Visit `/teacher/classes/<classId>/roster`. Expected: no embedded attendance register. Instead, an "Attendance" card with a "Take attendance →" button.
2. Click it. Lands on `/teacher/attendance?classId=<that id>` with that class pre-selected.

- [ ] **Step 15.7: QA — code hygiene**

```bash
cd c:/Users/shaun/campusly-frontend
```

Grep these patterns and expect zero matches in the new attendance files:
- `apiClient` in `src/components/attendance/*.tsx` (should only be in hooks)
- `text-red-` or `bg-red-` in `src/components/attendance/*.tsx` (use `text-destructive` / `bg-destructive`)
- `TeachingGroupAttendanceRegister` anywhere in `src/` (file deleted)

Verify all new component files are < 350 lines.

- [ ] **Step 15.8: Final commit (if any QA touch-ups were needed)**

```bash
cd c:/Users/shaun/campusly-frontend
git add -A
git commit -m "fix(attendance): QA polish after manual verification"
```

If nothing needed fixing, skip this step.

---

## Spec coverage map

| Spec section | Implemented in |
|---|---|
| Promote `/teacher/attendance`; delete embedded register | Tasks 13 + 14 |
| Class picker (URL deep-link, homeroom pinned, alphabetical rest) | Task 4 (hook) + Task 7 (component) + Task 13 (wired) |
| Today tab daily form (existing + prev/next + bulk menu + Today button) | Task 9 |
| Bulk mark preserves per-student notes | Task 4 (`markAll`) |
| UTC fix on POST `/bulk` | Task 1 (backend schema) + Task 4 (frontend) |
| History tab grid (week/month, period selector shared, prev/next/today) | Task 11 + Task 13 |
| Per-student % column + per-day % row | Task 11 |
| Keyboard-accessible grid cells | Task 11 (`<button>` per cell) |
| Empty grid cells clickable to take that day's register | Task 11 + Task 10 (dialog) |
| Cell click → AttendanceDayEditDialog (scrollable, sticky footer) | Task 10 |
| Backend `getByClass` accepts dateFrom/dateTo/period | Task 2 |
| Backend `/export` allows teacher with ownership | Task 3 |
| Backend PDF format branch (single-day register + history grid) | Task 3 |
| PDF export from both tabs, scoped to class+period+date(s) | Task 12 (button) + Task 6 (hook) + Task 3 (backend) |
| Responsive PageHeader stacking | Task 13 (uses existing `PageHeader`'s `flex-col sm:flex-row` behaviour) |
| Roster page "Take attendance →" link | Task 14 |
| `TeachingGroupAttendanceRegister` deleted | Task 14 |
| Acceptance criteria verification | Task 15 (manual QA) |
