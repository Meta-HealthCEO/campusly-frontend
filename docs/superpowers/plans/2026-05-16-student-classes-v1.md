# Student Classes Page — v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/student/classes` rendering the student's homeroom card, plus the data-model field and endpoint that v2 will build on.

**Architecture:** Additive backend change — add `subjectClassIds: ObjectId[]` to the Student model (stays empty in v1) and a new `GET /api/students/me/classes` endpoint returning `{ homeroom, subjectClasses: [] }`. Frontend adds a thin orchestrator page, a `useStudentClasses` hook, and a `<ClassCard>` component. The existing `joinClassByCode` handler and all consuming services (Lesson, Homework, etc.) are untouched.

**Tech Stack:** Backend — Node.js + Express + Mongoose + Vitest (TDD). Frontend — Next.js 16 App Router + React 19 + Tailwind 4 + Zustand. Frontend has no unit-test infrastructure today; verification is by running the dev server and opening the page.

**Spec:** [docs/superpowers/specs/2026-05-16-student-classes-multi-class-design.md](../specs/2026-05-16-student-classes-multi-class-design.md)

---

## File map

**Backend — create:**
- `../campusly-backend/src/modules/Student/service-classes.ts` — `getMyStudentClasses(userId, schoolId)` service
- `../campusly-backend/src/modules/Student/__tests__/service-classes.test.ts` — service tests

**Backend — modify:**
- `../campusly-backend/src/modules/Student/model.ts` — add `subjectClassIds` field + index
- `../campusly-backend/src/modules/Student/controller.ts` — add `getMyClasses` handler
- `../campusly-backend/src/modules/Student/routes.ts` — mount `GET /me/classes`

**Frontend — create:**
- `src/hooks/useStudentClasses.ts` — data hook
- `src/components/student/ClassCard.tsx` — pure UI card
- `src/app/(dashboard)/student/classes/page.tsx` — page orchestrator

**Frontend — modify:**
- `src/lib/constants.ts` — `ROUTES.STUDENT_CLASSES` + `STUDENT_NAV` entry

---

## Backend tasks

### Task 1: Add `subjectClassIds` to Student schema + index

**Files:**
- Modify: `../campusly-backend/src/modules/Student/model.ts`
- Test: `../campusly-backend/src/modules/Student/__tests__/service-classes.test.ts` (created in Task 2; minimal smoke check first)

- [ ] **Step 1: Write the failing schema test**

Create `../campusly-backend/src/modules/Student/__tests__/service-classes.test.ts` with just the schema check for now:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Student } from '../model.js';

const FILE_SCHOOL_ID = new mongoose.Types.ObjectId();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test',
    );
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

beforeEach(async () => {
  await Student.deleteMany({ schoolId: FILE_SCHOOL_ID });
});

describe('Student.subjectClassIds', () => {
  it('defaults to an empty array on new students', async () => {
    const student = await Student.create({
      schoolId: FILE_SCHOOL_ID,
      gradeId: new mongoose.Types.ObjectId(),
      classId: new mongoose.Types.ObjectId(),
      admissionNumber: `A-${Date.now()}`,
    });
    expect(Array.isArray(student.subjectClassIds)).toBe(true);
    expect(student.subjectClassIds).toHaveLength(0);
  });

  it('accepts an array of ObjectIds', async () => {
    const subjectId = new mongoose.Types.ObjectId();
    const student = await Student.create({
      schoolId: FILE_SCHOOL_ID,
      gradeId: new mongoose.Types.ObjectId(),
      classId: new mongoose.Types.ObjectId(),
      admissionNumber: `A-${Date.now() + 1}`,
      subjectClassIds: [subjectId],
    });
    expect(student.subjectClassIds.map(String)).toEqual([String(subjectId)]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ../campusly-backend
npx vitest run src/modules/Student/__tests__/service-classes.test.ts
```

Expected: FAIL — Mongoose strict mode silently drops the unknown `subjectClassIds` field, so the array length will be `undefined` / not `0`, or the second test's `map(String)` will throw.

- [ ] **Step 3: Add the field to the schema and the interface**

In `../campusly-backend/src/modules/Student/model.ts`:

Update the `IStudent` interface — insert after `guardianIds`:

```ts
guardianIds: Types.ObjectId[];
subjectClassIds: Types.ObjectId[];
enrollmentDate: Date;
```

Update the schema — insert the field after `guardianIds`:

```ts
guardianIds: {
  type: [Schema.Types.ObjectId],
  ref: 'Parent',
  default: [],
},
subjectClassIds: {
  type: [Schema.Types.ObjectId],
  ref: 'Class',
  default: [],
},
enrollmentDate: {
  type: Date,
  default: () => new Date(),
},
```

Add the index — insert after the existing `gradeId/classId` index:

```ts
studentSchema.index({ gradeId: 1, classId: 1 });
studentSchema.index({ subjectClassIds: 1, schoolId: 1 });
studentSchema.index({ schoolId: 1, isDeleted: 1, createdAt: -1 });
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/modules/Student/__tests__/service-classes.test.ts
```

Expected: PASS — both schema tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Student/model.ts src/modules/Student/__tests__/service-classes.test.ts
git commit -m "feat(student): add subjectClassIds array to Student model"
```

---

### Task 2: Service `getMyStudentClasses`

**Files:**
- Create: `../campusly-backend/src/modules/Student/service-classes.ts`
- Modify: `../campusly-backend/src/modules/Student/__tests__/service-classes.test.ts`

- [ ] **Step 1: Write the failing service tests**

Append to `service-classes.test.ts` (after the existing schema tests, before `afterAll`):

```ts
import { Class, Grade } from '../../Academic/model.js';
import { User } from '../../Auth/model.js';
import { getMyStudentClasses } from '../service-classes.js';

describe('getMyStudentClasses', () => {
  async function seedTeacher(): Promise<mongoose.Types.ObjectId> {
    const teacher = await User.create({
      email: `t-${Date.now()}-${Math.random()}@test.local`,
      password: 'x',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'teacher',
      schoolId: FILE_SCHOOL_ID,
    });
    return teacher._id as mongoose.Types.ObjectId;
  }

  async function seedGrade(): Promise<mongoose.Types.ObjectId> {
    const grade = await Grade.create({
      name: 'Grade 7',
      schoolId: FILE_SCHOOL_ID,
      orderIndex: 7,
    });
    return grade._id as mongoose.Types.ObjectId;
  }

  async function seedClass(opts: {
    name: string;
    isHomeroom: boolean;
    teacherId: mongoose.Types.ObjectId;
    gradeId: mongoose.Types.ObjectId;
    isDeleted?: boolean;
  }): Promise<mongoose.Types.ObjectId> {
    const cls = await Class.create({
      name: opts.name,
      gradeId: opts.gradeId,
      schoolId: FILE_SCHOOL_ID,
      teacherId: opts.teacherId,
      capacity: 30,
      classroomCode: `C${Date.now()}${Math.floor(Math.random() * 1000)}`,
      isHomeroom: opts.isHomeroom,
      isDeleted: opts.isDeleted ?? false,
    });
    return cls._id as mongoose.Types.ObjectId;
  }

  beforeEach(async () => {
    await User.deleteMany({ schoolId: FILE_SCHOOL_ID });
    await Grade.deleteMany({ schoolId: FILE_SCHOOL_ID });
    await Class.deleteMany({ schoolId: FILE_SCHOOL_ID });
  });

  it('returns empty result when no Student profile exists for the user', async () => {
    const userId = new mongoose.Types.ObjectId();
    const result = await getMyStudentClasses(String(userId), String(FILE_SCHOOL_ID));
    expect(result).toEqual({ homeroom: null, subjectClasses: [] });
  });

  it('returns populated homeroom with teacher and grade', async () => {
    const userId = new mongoose.Types.ObjectId();
    const teacherId = await seedTeacher();
    const gradeId = await seedGrade();
    const classId = await seedClass({ name: '7B', isHomeroom: true, teacherId, gradeId });

    await Student.create({
      userId,
      schoolId: FILE_SCHOOL_ID,
      gradeId,
      classId,
      admissionNumber: `A-${Date.now()}`,
    });

    const result = await getMyStudentClasses(String(userId), String(FILE_SCHOOL_ID));
    expect(result.homeroom).not.toBeNull();
    expect(result.homeroom?.name).toBe('7B');
    expect(result.homeroom?.isHomeroom).toBe(true);
    expect(result.homeroom?.teacher.firstName).toBe('Ada');
    expect(result.homeroom?.grade.name).toBe('Grade 7');
    expect(result.subjectClasses).toEqual([]);
  });

  it('returns homeroom: null when the homeroom class is soft-deleted', async () => {
    const userId = new mongoose.Types.ObjectId();
    const teacherId = await seedTeacher();
    const gradeId = await seedGrade();
    const classId = await seedClass({
      name: '7B',
      isHomeroom: true,
      teacherId,
      gradeId,
      isDeleted: true,
    });

    await Student.create({
      userId,
      schoolId: FILE_SCHOOL_ID,
      gradeId,
      classId,
      admissionNumber: `A-${Date.now()}`,
    });

    const result = await getMyStudentClasses(String(userId), String(FILE_SCHOOL_ID));
    expect(result.homeroom).toBeNull();
    expect(result.subjectClasses).toEqual([]);
  });

  it('returns subjectClasses: [] in v1 even when student.subjectClassIds is populated', async () => {
    // v1 contract: always [] regardless of stored array contents.
    // This guards against accidentally enabling the subject path before v2 is ready.
    const userId = new mongoose.Types.ObjectId();
    const teacherId = await seedTeacher();
    const gradeId = await seedGrade();
    const homeroomId = await seedClass({ name: '7B', isHomeroom: true, teacherId, gradeId });
    const subjectId = await seedClass({ name: 'Maths', isHomeroom: false, teacherId, gradeId });

    await Student.create({
      userId,
      schoolId: FILE_SCHOOL_ID,
      gradeId,
      classId: homeroomId,
      admissionNumber: `A-${Date.now()}`,
      subjectClassIds: [subjectId],
    });

    const result = await getMyStudentClasses(String(userId), String(FILE_SCHOOL_ID));
    expect(result.subjectClasses).toEqual([]);
  });

  it('scopes the Student lookup by schoolId (no cross-tenant leakage)', async () => {
    const userId = new mongoose.Types.ObjectId();
    const otherSchool = new mongoose.Types.ObjectId();
    const teacherId = await seedTeacher();
    const gradeId = await seedGrade();
    const classId = await seedClass({ name: '7B', isHomeroom: true, teacherId, gradeId });

    // Student belongs to FILE_SCHOOL_ID; the request asks for otherSchool.
    await Student.create({
      userId,
      schoolId: FILE_SCHOOL_ID,
      gradeId,
      classId,
      admissionNumber: `A-${Date.now()}`,
    });

    const result = await getMyStudentClasses(String(userId), String(otherSchool));
    expect(result).toEqual({ homeroom: null, subjectClasses: [] });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/modules/Student/__tests__/service-classes.test.ts
```

Expected: FAIL on import — module `../service-classes.js` does not exist.

- [ ] **Step 3: Implement the service**

Create `../campusly-backend/src/modules/Student/service-classes.ts`:

```ts
import mongoose, { type Types } from 'mongoose';
import { Student } from './model.js';
import { Class } from '../Academic/model.js';

export interface MyClassesResult {
  homeroom: PopulatedClass | null;
  subjectClasses: PopulatedClass[];
}

export interface PopulatedClass {
  id: string;
  name: string;
  classroomCode: string;
  isHomeroom: boolean;
  grade: { id: string; name: string };
  teacher: { id: string; firstName: string; lastName: string };
}

interface PopulatedClassDoc {
  _id: Types.ObjectId;
  name: string;
  classroomCode: string;
  isHomeroom: boolean;
  gradeId: { _id: Types.ObjectId; name: string };
  teacherId: { _id: Types.ObjectId; firstName: string; lastName: string };
}

function shape(doc: PopulatedClassDoc): PopulatedClass {
  return {
    id: String(doc._id),
    name: doc.name,
    classroomCode: doc.classroomCode,
    isHomeroom: doc.isHomeroom,
    grade: { id: String(doc.gradeId._id), name: doc.gradeId.name },
    teacher: {
      id: String(doc.teacherId._id),
      firstName: doc.teacherId.firstName,
      lastName: doc.teacherId.lastName,
    },
  };
}

export async function getMyStudentClasses(
  userId: string,
  schoolId: string,
): Promise<MyClassesResult> {
  const student = await Student.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
    isDeleted: false,
  })
    .select('classId')
    .lean();

  if (!student) {
    return { homeroom: null, subjectClasses: [] };
  }

  const homeroomDoc = student.classId
    ? await Class.findOne({
        _id: student.classId,
        schoolId,
        isDeleted: false,
      })
        .populate<{ teacherId: PopulatedClassDoc['teacherId'] }>('teacherId', 'firstName lastName')
        .populate<{ gradeId: PopulatedClassDoc['gradeId'] }>('gradeId', 'name')
        .lean<PopulatedClassDoc | null>()
    : null;

  return {
    homeroom: homeroomDoc ? shape(homeroomDoc) : null,
    // v1: always return an empty subjectClasses array. v2 will populate from
    // student.subjectClassIds once the join handler and consuming services
    // are updated. See spec section 3.
    subjectClasses: [],
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/modules/Student/__tests__/service-classes.test.ts
```

Expected: all five `getMyStudentClasses` tests PASS, plus the two earlier schema tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Student/service-classes.ts src/modules/Student/__tests__/service-classes.test.ts
git commit -m "feat(student): add getMyStudentClasses service for /me/classes"
```

---

### Task 3: Controller handler + route mount

**Files:**
- Modify: `../campusly-backend/src/modules/Student/controller.ts`
- Modify: `../campusly-backend/src/modules/Student/routes.ts`

- [ ] **Step 1: Add the controller handler**

In `../campusly-backend/src/modules/Student/controller.ts`, add a new import at the top:

```ts
import { getMyStudentClasses } from './service-classes.js';
```

Then add a new static method to `StudentController` (place it near the end of the class, before the closing brace):

```ts
static async getMyClasses(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) throw new ForbiddenError('Authentication required');
  if (!user.schoolId) throw new ForbiddenError('School context is required');
  const result = await getMyStudentClasses(user.id, user.schoolId);
  res.json(apiResponse(true, result));
}
```

- [ ] **Step 2: Mount the route**

In `../campusly-backend/src/modules/Student/routes.ts`, add a new route block. Place it before the existing `/export` block (so it's near the top, with the other self-service routes if any, or as a new section):

```ts
// ─── Self-service ───────────────────────────────────────────────────────────

router.get(
  '/me/classes',
  authenticate,
  authorize('student'),
  StudentController.getMyClasses,
);

// ─── CSV Export ─────────────────────────────────────────────────────────────
```

- [ ] **Step 3: Manually verify the route mounts**

Start the backend:

```bash
cd ../campusly-backend
npm run dev
```

In a separate terminal, log in as a student via the existing auth flow (or use a known student JWT) and call:

```bash
curl -H "Authorization: Bearer <student-jwt>" http://localhost:4500/api/students/me/classes
```

Expected: `200` with body `{"success":true,"data":{"homeroom":<object or null>,"subjectClasses":[]}}`.

If the student has no Student record, expect `{"homeroom":null,"subjectClasses":[]}`. If a parent or teacher hits this endpoint, expect `403` (the `authorize('student')` middleware rejects non-students).

- [ ] **Step 4: Stop the dev server and commit**

```bash
git add src/modules/Student/controller.ts src/modules/Student/routes.ts
git commit -m "feat(student): expose GET /api/students/me/classes"
```

---

## Frontend tasks

### Task 4: ROUTES constant entry

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add the route to the `ROUTES` object**

Open [`src/lib/constants.ts`](src/lib/constants.ts) and find the `// Student` block (around line 137). Add the new constant after `STUDENT_DASHBOARD`:

```ts
// Student
STUDENT_DASHBOARD: '/student',
STUDENT_CLASSES: '/student/classes',
STUDENT_HOMEWORK: '/student/homework',
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat(student): add STUDENT_CLASSES route constant"
```

---

### Task 5: Hook `useStudentClasses`

**Files:**
- Create: `src/hooks/useStudentClasses.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useStudentClasses.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

export interface StudentClass {
  id: string;
  name: string;
  classroomCode: string;
  isHomeroom: boolean;
  grade: { id: string; name: string };
  teacher: { id: string; firstName: string; lastName: string };
}

interface MyClassesResponse {
  homeroom: StudentClass | null;
  subjectClasses: StudentClass[];
}

interface UseStudentClassesResult {
  homeroom: StudentClass | null;
  subjectClasses: StudentClass[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useStudentClasses(): UseStudentClassesResult {
  const [homeroom, setHomeroom] = useState<StudentClass | null>(null);
  const [subjectClasses, setSubjectClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await apiClient.get('/students/me/classes');
      const data = unwrapResponse<MyClassesResponse>(res);
      setHomeroom(data.homeroom ?? null);
      setSubjectClasses(Array.isArray(data.subjectClasses) ? data.subjectClasses : []);
    } catch (err: unknown) {
      console.error('Failed to load student classes', err);
      setHomeroom(null);
      setSubjectClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { homeroom, subjectClasses, loading, refresh: load };
}
```

- [ ] **Step 2: Type-check the file**

```bash
npx tsc --noEmit --pretty false --incremental --tsBuildInfoFile node_modules/.cache/tsc-hook.tsbuildinfo
```

Expected: PASS, no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useStudentClasses.ts
git commit -m "feat(student): add useStudentClasses hook"
```

---

### Task 6: `ClassCard` component

**Files:**
- Create: `src/components/student/ClassCard.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/student/ClassCard.tsx`:

```tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, User } from 'lucide-react';
import type { StudentClass } from '@/hooks/useStudentClasses';

interface ClassCardProps {
  cls: StudentClass;
  variant?: 'homeroom' | 'subject';
}

export function ClassCard({ cls, variant = 'subject' }: ClassCardProps) {
  const isHomeroom = variant === 'homeroom';

  return (
    <Card
      className={
        isHomeroom
          ? 'border-primary/30 bg-primary/5'
          : undefined
      }
    >
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold truncate">{cls.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{cls.grade.name}</p>
          </div>
          {isHomeroom && (
            <Badge variant="secondary" className="shrink-0">
              Homeroom
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {cls.teacher.firstName} {cls.teacher.lastName}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <GraduationCap className="h-3.5 w-3.5" />
            Class code
          </span>
          <span className="font-mono text-sm tracking-wider">
            {cls.classroomCode}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit --pretty false --incremental --tsBuildInfoFile node_modules/.cache/tsc-hook.tsbuildinfo
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/student/ClassCard.tsx
git commit -m "feat(student): add ClassCard component"
```

---

### Task 7: Page `/student/classes`

**Files:**
- Create: `src/app/(dashboard)/student/classes/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/(dashboard)/student/classes/page.tsx`:

```tsx
'use client';

import { Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClassCard } from '@/components/student/ClassCard';
import { useStudentClasses } from '@/hooks/useStudentClasses';

export default function StudentClassesPage() {
  const { homeroom, loading } = useStudentClasses();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Classes"
        description="Your current class at school."
      />

      {homeroom ? (
        <ClassCard cls={homeroom} variant="homeroom" />
      ) : (
        <EmptyState
          icon={Users}
          title="You haven't joined a class yet"
          description="Use the join card on your dashboard with the code from your teacher."
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit --pretty false --incremental --tsBuildInfoFile node_modules/.cache/tsc-hook.tsbuildinfo
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/classes/page.tsx
git commit -m "feat(student): add /student/classes page"
```

---

### Task 8: STUDENT_NAV entry

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add the nav entry**

In [`src/lib/constants.ts`](src/lib/constants.ts), find the `STUDENT_NAV` array (around line 400). Locate the comment `// Phase 2 (module-gated)` block. Insert the new entry as the first item in that block, immediately before `Timetable`:

```ts
  // Phase 2 (module-gated)
  { label: 'My Classes',    href: ROUTES.STUDENT_CLASSES,       icon: Users,    module: 'academic' },
  { label: 'Timetable',     href: ROUTES.STUDENT_TIMETABLE,     icon: Clock,    module: 'academic' },
```

Verify the `Users` icon is already imported from `lucide-react` at the top of this file. If not, add it to the existing `lucide-react` import block (likely already present for other roles' nav entries — search the file for `Users,` to confirm).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit --pretty false --incremental --tsBuildInfoFile node_modules/.cache/tsc-hook.tsbuildinfo
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat(student): add My Classes to student sidebar"
```

---

### Task 9: Manual smoke test in the browser

**Files:** none (verification step)

- [ ] **Step 1: Start backend and frontend**

In two terminals:

```bash
# terminal 1 (backend)
cd ../campusly-backend
npm run dev
```

```bash
# terminal 2 (frontend)
cd ../campusly-frontend
npm run dev
```

- [ ] **Step 2: Log in as a student**

Open `http://localhost:3500/auth/login` and log in with a known student account (one that has an existing homeroom assigned).

- [ ] **Step 3: Verify the nav entry**

Confirm the sidebar shows **My Classes** under the academic group, with the Users icon. If the school does not have `academic` in `modulesEnabled`, the entry should not appear — verify by toggling on a school with the module enabled.

- [ ] **Step 4: Open the page and verify the homeroom card**

Click **My Classes**. Verify:
- Page header reads "My Classes".
- One card renders showing the homeroom name, grade, teacher full name (no honorific), and the classroom code in a monospaced chip.
- The "Homeroom" badge appears on the card.
- Card uses `border-primary/30 bg-primary/5` so it visually stands apart.

- [ ] **Step 5: Verify the empty state**

Log in as a student account that has no classId assigned (or temporarily clear `classId` on a test student in the database). Visit the page and verify the empty state renders with the Users icon, the title "You haven't joined a class yet", and the instructional description.

- [ ] **Step 6: Verify mobile responsiveness**

Open Chrome DevTools, switch to a 375×667 viewport, reload the page. Verify:
- Page header stacks above its description.
- Class card spans full width.
- All text truncates without overflow.
- No horizontal scrolling.

- [ ] **Step 7: Verify network shape**

Open DevTools Network tab, reload the page, find `students/me/classes`. Verify the response body is exactly:

```json
{
  "success": true,
  "data": {
    "homeroom": { "id": "…", "name": "…", "classroomCode": "…", "isHomeroom": true, "grade": { "id": "…", "name": "…" }, "teacher": { "id": "…", "firstName": "…", "lastName": "…" } },
    "subjectClasses": []
  }
}
```

If `subjectClasses` is anything other than `[]`, stop and re-check Task 2 (the v1 hard-coded empty array).

- [ ] **Step 8: No commit needed** — this is a verification-only step.

---

## Done criteria

- [ ] All five `getMyStudentClasses` service tests pass
- [ ] Both `Student.subjectClassIds` schema tests pass
- [ ] `GET /api/students/me/classes` returns the documented shape for a student with a homeroom, for one without, and for a request with no Student record
- [ ] `/student/classes` renders the homeroom card and the empty state correctly
- [ ] **My Classes** appears in the student sidebar when `academic` is enabled, hidden otherwise
- [ ] Mobile layout (375px) has no overflow
- [ ] No `apiClient` import outside `src/hooks/` and `src/lib/`
- [ ] No `any` introduced in any new file
- [ ] Both `subjectClassIds` definitions (schema + interface) match
- [ ] All new `Class.find*` calls filter `schoolId` + `isDeleted: false`
- [ ] All commits land directly on `master` (per project memory — no feature branches)

---

## Out of scope (v2 — separate spec)

Per the spec's "Future follow-ups" section, the following are deliberately deferred:

1. Branching `joinClassByCode` on `cls.isHomeroom` to support subject-class enrollment.
2. Updating the 15+ consuming services that filter on `Student.classId` only (Lesson access, Assignment access, Homework access, Academic gradebook publish, term-summary, subject-trend, AITools marking, Student dashboard/regenerate/credentials).
3. Rendering the "Subject classes" section on the page.
4. Updating JoinClassCard copy and toast logic.
5. Leave-class action / per-class detail page.

Do **not** implement these as part of v1.
