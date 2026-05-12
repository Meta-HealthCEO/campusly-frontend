# Student Portal Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Phase 1 student portal that serves the teacher-centric standalone-teacher GTM — students log in, study their teacher's lessons (with all attached materials), do their homework, take their tests, and chat with the AI Tutor. All school-wide modules (sports, library, wallet, etc.) stay hidden until Phase 2.

**Architecture:** Lesson-centric hub replaces fragmented `/learn` + `/materials` + `/courses` + `/quizzes`. Tests and AI Tutor are rescued from existing scaffold (light touch only). New backend routes mounted at `/api/student/lessons` and `/api/student/dashboard`, all `schoolId`-scoped per multi-tenancy invariants. Module gating via existing `school.modulesEnabled` Redis cache keeps Phase 2 surfaces hidden behind a single `useStudentModules()` hook.

**Tech Stack:**
- **Backend:** Express 5 + Mongoose, vitest (integration tests against test MongoDB), Zod v4 validation, JWT auth.
- **Frontend:** Next.js 16 (App Router) + React 19, Zustand, Axios, Tailwind 4, base-ui (shadcn-style), Lucide icons. No frontend tests exist — frontend tasks use code + manual smoke verification.
- **Spec:** [docs/superpowers/specs/2026-05-13-student-portal-design.md](docs/superpowers/specs/2026-05-13-student-portal-design.md)

---

## Working directories

- Frontend repo: `c:\Users\shaun\campusly-frontend`
- Backend repo: `c:\Users\shaun\campusly-backend`

All paths below are repo-relative unless prefixed `BE:` (backend) or `FE:` (frontend).

## Conventions

- **Tests live alongside code:** `BE: src/modules/<Module>/__tests__/*.test.ts`. Run with `npm test` from the backend repo. Tests connect to MongoDB at `MONGODB_TEST_URI` (default `mongodb://localhost:27017/campusly-test`). A local Mongo must be running.
- **Commit cadence:** every task ends with a git commit. Use the existing message style: `feat(student): ...`, `fix(...): ...`, `test(...): ...`, `chore(...): ...`. All commits include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **No `any` types.** Use `unknown` + type guards or exact types.
- **CLAUDE.md landmines:** every `findOne`/`findOneAndUpdate` includes `schoolId` AND `isDeleted: false`. Aggregation `$match` on `schoolId` casts via `new mongoose.Types.ObjectId(schoolId)`. Zod imports from `'zod/v4'`.
- **Frontend separation:** hooks own all `apiClient` calls; pages/components do zero API I/O.

## File structure overview

### Backend — created

| File | Responsibility |
|---|---|
| `src/modules/Lesson/types-student.ts` | Student-facing DTOs (`StudentLessonSummary`, `StudentLessonDetail`, `StudentLessonMaterial`) |
| `src/modules/Lesson/validation-student.ts` | Zod schemas for student lesson query/params |
| `src/modules/Lesson/service-student.ts` | List + detail queries, populate logic |
| `src/modules/Lesson/controller-student.ts` | HTTP handlers |
| `src/modules/Lesson/routes-student.ts` | Router mount |
| `src/modules/Lesson/__tests__/service-student.test.ts` | Integration tests |
| `src/modules/Student/service-dashboard.ts` | Dashboard aggregator |
| `src/modules/Student/controller-dashboard.ts` | Dashboard HTTP handler |
| `src/modules/Student/routes-dashboard.ts` | Dashboard router mount |
| `src/modules/Student/__tests__/service-dashboard.test.ts` | Integration tests |
| `src/common/student-resolver.ts` | Shared helper: resolve current Student from `req.user.id` |
| `src/common/__tests__/student-resolver.test.ts` | Integration tests |

### Backend — modified

| File | Change |
|---|---|
| `src/app.ts` | Mount `/api/student/lessons` and `/api/student/dashboard` |
| `src/modules/Homework/controller.ts` (or service) | `GET /api/homework/:id` adds `sourceLesson: { id, title } | null` |
| `src/modules/Homework/__tests__/...` (new test) | Verify `sourceLesson` returned correctly |

### Frontend — created

| File | Responsibility |
|---|---|
| `src/types/lesson-student.ts` | DTO types mirroring backend |
| `src/hooks/useStudentLessons.ts` | List fetch + filters |
| `src/hooks/useStudentLesson.ts` | Detail fetch |
| `src/hooks/useStudentDashboard.ts` | Replaces existing hook |
| `src/hooks/useStudentModules.ts` | Nav gating |
| `src/hooks/useStudentHomework.ts` | Consolidated homework list + detail hook |
| `src/lib/student-nav.ts` | Single nav config array |
| `src/components/auth/RoleGuard.tsx` | Role-aware route guard |
| `src/components/student/StudentSidebar.tsx` | Desktop nav |
| `src/components/student/StudentBottomNav.tsx` | Mobile nav |
| `src/components/student/LessonCard.tsx` | List card |
| `src/components/student/LessonMaterialCard.tsx` | Detail card per material kind |
| `src/components/student/LessonResourceReader.tsx` | Modal viewer for ContentResource |
| `src/components/student/AskAITutorCTA.tsx` | Lesson-footer CTA |
| `src/components/student/HomeworkSection.tsx` | Collapsible section for list view |
| `src/components/learning/QuizPlayer.tsx` | Extracted reusable quiz player |
| `src/app/(dashboard)/student/layout.tsx` | Student-only layout shell |
| `src/app/(dashboard)/student/lessons/page.tsx` | List view |
| `src/app/(dashboard)/student/lessons/[id]/page.tsx` | Detail view |
| `src/app/(dashboard)/student/profile/page.tsx` | Profile page |

### Frontend — rewritten

| File | Change |
|---|---|
| `src/app/(dashboard)/student/page.tsx` | New dashboard layout, single hook |
| `src/app/(dashboard)/student/homework/page.tsx` | Sectioned IA |
| `src/app/(dashboard)/student/homework/[id]/page.tsx` | Typed submission flows + source-lesson backlink |

### Frontend — light touch

| File | Change |
|---|---|
| `src/app/(dashboard)/student/tests/page.tsx` | Wire into new layout |
| `src/app/(dashboard)/student/tests/[paperId]/page.tsx` | Accept `?from=lesson:[id]` |
| `src/app/(dashboard)/student/ai-tutor/page.tsx` | Accept `?subjectId=&context=` |
| `src/app/(dashboard)/student/ai-tutor/practice/page.tsx` | Wire into new layout |

### Frontend — deleted

| Path | Reason |
|---|---|
| `src/app/(dashboard)/student/learn/` (entire subtree) | Replaced by `/student/lessons` |
| `src/app/(dashboard)/student/materials/` | Replaced by `/student/lessons` |
| `src/app/(dashboard)/student/courses/` (entire subtree) | Replaced by `/student/lessons` |
| `src/app/(dashboard)/student/quizzes/` | Player extracted to component |
| `src/hooks/useStudentLearning.ts` | Backed deleted pages |
| `src/hooks/useStudentMaterials.ts` | Backed deleted pages |
| Other student-only hooks/types backing deleted pages | Cleanup |

---

# Phase 0 — Discover unknowns (no code change)

The spec listed 5 open questions. Resolve them before writing code.

### Task 0.1: Verify standalone-teacher `schoolId` model

**Files:**
- Read: `BE: src/modules/Student/model.ts`
- Read: `BE: src/modules/School/model.ts`
- Read: `BE: src/modules/Auth/controller.ts` (or wherever standalone-teacher signup lives)

- [ ] **Step 1: Confirm Student.schoolId is required for every Student**

Read `BE: src/modules/Student/model.ts`. Confirm `schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true }` or equivalent. If `required: true` is NOT set, this task uncovers a blocker — surface it to the user before proceeding.

- [ ] **Step 2: Identify how standalone teachers get a `schoolId`**

Search the backend for `standalone` in auth/signup code:
```
Grep: standalone in src/modules/Auth or src/modules/Student
```
Expected finding: either a synthetic `School` document is created during standalone teacher signup, OR the system creates one lazily. Document what you find in a comment at the top of `BE: src/common/student-resolver.ts` (created in Task A1) for the next engineer.

- [ ] **Step 3: Check what's in `school.modulesEnabled` for a standalone school**

If you can connect to the dev MongoDB, run a quick query against an existing standalone teacher's school doc. Otherwise read the seed/creation code. Record the finding in the same header comment in `BE: src/common/student-resolver.ts`. Phase 1 nav should work whether `modulesEnabled` is `[]` or `['academic']`.

No commit — this is discovery. Findings get documented in code in Task A1.

### Task 0.2: Verify homework→lesson backlink storage

**Files:**
- Read: `BE: src/modules/Homework/model.ts`
- Read: `BE: src/modules/Lesson/model.ts` (already known — has `materials[].homeworkId`)

- [ ] **Step 1: Check if Homework already has `lessonId`**

Read `BE: src/modules/Homework/model.ts`. If `lessonId` already exists, the backlink is free (denormalised). If not, decide:
- **Reverse lookup** (no schema change): query `Lesson.findOne({ schoolId, 'materials.homeworkId': homeworkId })` inside the homework GET handler. Simple, slightly slower (extra query per detail fetch).
- **Denormalise**: add `lessonId` to Homework schema + write it during lesson creation. Requires a one-time backfill migration for existing homework. More work.

**Decision for this plan:** use reverse lookup if `Homework.lessonId` doesn't exist. Document the choice in the Phase D task. If perf later proves an issue, denormalise as a follow-up.

No commit.

### Task 0.3: Verify quiz player existence

**Files:**
- Read: `FE: src/app/(dashboard)/student/quizzes/page.tsx`
- Search: `FE: src/components/` for any existing `QuizPlayer`-like component

- [ ] **Step 1: Find the existing quiz-taking implementation**

```
Glob: src/components/**/Quiz*.tsx
Grep: useState.*answer in src/app/(dashboard)/student/quizzes
```

Inspect the file(s) found. The reusable player will be either:
- **Extracted** from `student/quizzes/page.tsx` in Task G1 (most likely)
- **Already exists** as a component — task G1 then becomes a "wire it up" task

Document which path applies. No commit.

---

# Phase A — Backend foundation

### Task A1: Shared student resolver helper

**Files:**
- Create: `BE: src/common/student-resolver.ts`
- Create: `BE: src/common/__tests__/student-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

Create `BE: src/common/__tests__/student-resolver.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Student } from '../../modules/Student/model.js';
import { User } from '../../modules/Auth/model.js';
import { resolveStudentFromUserId } from '../student-resolver.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

beforeEach(async () => {
  await Student.deleteMany({});
  await User.deleteMany({});
});

describe('resolveStudentFromUserId', () => {
  it('returns the student linked to the user', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    await User.create({ _id: userId, email: 's@test.com', role: 'student', schoolId, password: 'x' });
    const student = await Student.create({
      schoolId, userId,
      gradeId: new mongoose.Types.ObjectId(),
      classId: new mongoose.Types.ObjectId(),
      admissionNumber: 'ADM-001',
      enrollmentStatus: 'active',
    });

    const resolved = await resolveStudentFromUserId(userId.toString());
    expect(resolved?._id.toString()).toBe(student._id.toString());
    expect(resolved?.schoolId.toString()).toBe(schoolId.toString());
  });

  it('returns null when no student is linked', async () => {
    const userId = new mongoose.Types.ObjectId();
    const resolved = await resolveStudentFromUserId(userId.toString());
    expect(resolved).toBeNull();
  });

  it('excludes soft-deleted students', async () => {
    const userId = new mongoose.Types.ObjectId();
    await Student.create({
      schoolId: new mongoose.Types.ObjectId(),
      userId,
      gradeId: new mongoose.Types.ObjectId(),
      classId: new mongoose.Types.ObjectId(),
      admissionNumber: 'ADM-002',
      enrollmentStatus: 'active',
      isDeleted: true,
    });
    const resolved = await resolveStudentFromUserId(userId.toString());
    expect(resolved).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm test -- src/common/__tests__/student-resolver.test.ts` from the backend repo.
Expected: FAIL — `Cannot find module '../student-resolver.js'`.

- [ ] **Step 3: Implement the helper**

Create `BE: src/common/student-resolver.ts`:

```ts
// Phase 0 discovery findings:
// - Student.schoolId is required (see model)
// - Standalone teacher signup creates a synthetic School doc (see <path discovered>)
// - modulesEnabled for standalone schools: <value discovered>
import { Student } from '../modules/Student/model.js';
import type { IStudent } from '../modules/Student/types.js';
import type { HydratedDocument } from 'mongoose';

export async function resolveStudentFromUserId(
  userId: string,
): Promise<HydratedDocument<IStudent> | null> {
  return Student.findOne({ userId, isDeleted: false });
}
```

Adjust the import path for `IStudent` if the type lives elsewhere — read `BE: src/modules/Student/model.ts` to confirm.

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- src/common/__tests__/student-resolver.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/common/student-resolver.ts src/common/__tests__/student-resolver.test.ts
git commit -m "$(cat <<'EOF'
feat(student): shared resolver mapping JWT user → Student doc

Used by /api/student/* routes to enforce multi-tenancy (resolves
schoolId + classId for the current student). Soft-deleted students
return null.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase B — Backend lesson endpoints

### Task B1: Student lesson DTOs + validation

**Files:**
- Create: `BE: src/modules/Lesson/types-student.ts`
- Create: `BE: src/modules/Lesson/validation-student.ts`

- [ ] **Step 1: Create DTO types**

Create `BE: src/modules/Lesson/types-student.ts`:

```ts
export interface StudentLessonSummary {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  scheduledDate: string;
  status: 'planned' | 'taught';
  materialCount: number;
  hasHomework: boolean;
  hasQuiz: boolean;
}

export interface StudentLessonMaterialBase {
  id: string;
  kind:
    | 'reading' | 'worksheet' | 'activity' | 'study_notes'
    | 'worked_example' | 'quiz' | 'practice_questions'
    | 'homework' | 'paper';
  title: string;
  teacherNotes?: string;
  phase: string;
}

export interface StudentLessonMaterial extends StudentLessonMaterialBase {
  contentResource?: { id: string; type: string; title: string; url?: string };
  quiz?: { id: string; title: string; questionCount: number };
  homework?: { id: string; title: string; dueAt?: string; status?: string };
  paper?: { paperId: string; title: string; releaseAt?: string; dueAt?: string };
  textbookRef?: {
    source: 'internal' | 'external';
    title?: string;
    pageStart?: number;
    pageEnd?: number;
    internalId?: string;
  };
  comprehensionQuestions?: Array<{ id: string; prompt: string }>;
}

export interface StudentLessonDetail extends StudentLessonSummary {
  objectives: string[];
  durationMinutes: number;
  materials: StudentLessonMaterial[];
}
```

- [ ] **Step 2: Create Zod schemas**

Create `BE: src/modules/Lesson/validation-student.ts`:

```ts
import { z } from 'zod/v4';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(objectIdRegex, 'invalid id');

export const studentLessonListQuerySchema = z.object({
  subjectId: objectId.optional(),
  status: z.enum(['planned', 'taught', 'all']).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const studentLessonParamSchema = z.object({
  id: objectId,
});

export type StudentLessonListQuery = z.infer<typeof studentLessonListQuerySchema>;
export type StudentLessonParam = z.infer<typeof studentLessonParamSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/Lesson/types-student.ts src/modules/Lesson/validation-student.ts
git commit -m "$(cat <<'EOF'
feat(lesson): student-facing DTO types and Zod validation

Defines StudentLessonSummary/Detail/Material shapes and query
schemas for the new /api/student/lessons routes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task B2: Lesson list service + tests

**Files:**
- Create: `BE: src/modules/Lesson/service-student.ts`
- Create: `BE: src/modules/Lesson/__tests__/service-student.test.ts`

- [ ] **Step 1: Write the failing test**

Create `BE: src/modules/Lesson/__tests__/service-student.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Lesson } from '../model.js';
import { Student } from '../../Student/model.js';
import { Class } from '../../Academic/model.js';
import { listLessonsForStudent } from '../service-student.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
beforeEach(async () => {
  await Lesson.deleteMany({});
  await Student.deleteMany({});
  await Class.deleteMany({});
});

async function seed() {
  const schoolId = new mongoose.Types.ObjectId();
  const classId = new mongoose.Types.ObjectId();
  const subjectId = new mongoose.Types.ObjectId();
  const teacherId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();
  await Student.create({
    _id: studentId, schoolId, classId,
    gradeId: new mongoose.Types.ObjectId(),
    admissionNumber: 'ADM-1', enrollmentStatus: 'active',
  });
  return { schoolId, classId, subjectId, teacherId, studentId };
}

describe('listLessonsForStudent', () => {
  it('returns only ready/taught lessons assigned to the student class', async () => {
    const { schoolId, classId, subjectId, teacherId, studentId } = await seed();
    // Visible: ready + assigned
    await Lesson.create({
      schoolId, teacherId, subjectId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Visible lesson', durationMinutes: 30,
      status: 'ready',
      assignedClasses: [{ classId, scheduledDate: new Date(), status: 'planned' }],
    });
    // Hidden: draft
    await Lesson.create({
      schoolId, teacherId, subjectId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Draft lesson', durationMinutes: 30,
      status: 'draft',
      assignedClasses: [{ classId, scheduledDate: new Date(), status: 'planned' }],
    });
    // Hidden: ready but assigned to different class
    await Lesson.create({
      schoolId, teacherId, subjectId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Wrong class', durationMinutes: 30,
      status: 'ready',
      assignedClasses: [{ classId: new mongoose.Types.ObjectId(), scheduledDate: new Date(), status: 'planned' }],
    });

    const student = await Student.findById(studentId);
    if (!student) throw new Error('seed failed');

    const result = await listLessonsForStudent(student, {});
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Visible lesson');
  });

  it('isolates lessons across schools (multi-tenancy)', async () => {
    const { classId, teacherId } = await seed();
    const otherSchoolId = new mongoose.Types.ObjectId();
    await Lesson.create({
      schoolId: otherSchoolId, teacherId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Other school lesson', durationMinutes: 30,
      status: 'ready',
      assignedClasses: [{ classId, scheduledDate: new Date(), status: 'planned' }],
    });

    const myStudent = await Student.findOne({ admissionNumber: 'ADM-1' });
    if (!myStudent) throw new Error('seed failed');
    const result = await listLessonsForStudent(myStudent, {});
    expect(result).toHaveLength(0);
  });

  it('filters by subjectId when provided', async () => {
    const { schoolId, classId, subjectId, teacherId, studentId } = await seed();
    await Lesson.create({
      schoolId, teacherId, subjectId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Match', durationMinutes: 30, status: 'ready',
      assignedClasses: [{ classId, scheduledDate: new Date(), status: 'planned' }],
    });
    await Lesson.create({
      schoolId, teacherId,
      subjectId: new mongoose.Types.ObjectId(),
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Different subject', durationMinutes: 30, status: 'ready',
      assignedClasses: [{ classId, scheduledDate: new Date(), status: 'planned' }],
    });

    const student = await Student.findById(studentId);
    if (!student) throw new Error('seed failed');
    const result = await listLessonsForStudent(student, { subjectId: subjectId.toString() });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Match');
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm test -- src/modules/Lesson/__tests__/service-student.test.ts`
Expected: FAIL — `Cannot find module '../service-student.js'`.

- [ ] **Step 3: Implement the service**

Create `BE: src/modules/Lesson/service-student.ts`:

```ts
import mongoose from 'mongoose';
import { Lesson } from './model.js';
import type { IStudent } from '../Student/types.js';
import type { HydratedDocument } from 'mongoose';
import type { StudentLessonSummary, StudentLessonListQuery } from './types-student.js';
import type { StudentLessonListQuery as Query } from './validation-student.js';

interface PopulatedSubjectLike { _id: mongoose.Types.ObjectId; name?: string; title?: string }

function lessonToSummary(
  doc: Record<string, unknown>,
  studentClassId: mongoose.Types.ObjectId,
): StudentLessonSummary {
  const assigned = (doc.assignedClasses as Array<{ classId: mongoose.Types.ObjectId; scheduledDate: Date; status: 'planned' | 'taught' }>)
    .find((a) => a.classId.toString() === studentClassId.toString());
  const materials = (doc.materials as Array<{ kind: string }>) ?? [];
  const subject = doc.subjectId as PopulatedSubjectLike | mongoose.Types.ObjectId | null;
  const subjectName = subject && typeof subject === 'object' && '_id' in subject
    ? (subject.name ?? subject.title ?? '')
    : '';
  const subjectId = subject && typeof subject === 'object' && '_id' in subject
    ? subject._id.toString()
    : (subject?.toString() ?? '');
  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    title: doc.title as string,
    subjectId,
    subjectName,
    scheduledDate: assigned?.scheduledDate.toISOString() ?? new Date().toISOString(),
    status: assigned?.status ?? 'planned',
    materialCount: materials.length,
    hasHomework: materials.some((m) => m.kind === 'homework'),
    hasQuiz: materials.some((m) => m.kind === 'quiz' || m.kind === 'practice_questions'),
  };
}

export async function listLessonsForStudent(
  student: HydratedDocument<IStudent>,
  query: Query,
): Promise<StudentLessonSummary[]> {
  const filter: Record<string, unknown> = {
    schoolId: student.schoolId,
    isDeleted: false,
    status: { $in: ['ready', 'taught'] },
    'assignedClasses.classId': student.classId,
  };
  if (query.subjectId) {
    filter.subjectId = new mongoose.Types.ObjectId(query.subjectId);
  }
  if (query.search) {
    filter.title = { $regex: query.search, $options: 'i' };
  }

  const docs = await Lesson.find(filter)
    .populate('subjectId', 'name title')
    .lean()
    .exec();

  const summaries = docs.map((d) => lessonToSummary(d, student.classId));

  if (query.status && query.status !== 'all') {
    return summaries.filter((s) => s.status === query.status);
  }

  // Sort: taught first (most recent), then planned (chronological).
  return summaries.sort((a, b) => {
    if (a.status === b.status) {
      return a.status === 'taught'
        ? new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
        : new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    }
    return a.status === 'taught' ? -1 : 1;
  });
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- src/modules/Lesson/__tests__/service-student.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/Lesson/service-student.ts src/modules/Lesson/__tests__/service-student.test.ts
git commit -m "$(cat <<'EOF'
feat(lesson): listLessonsForStudent service with multi-tenancy tests

Returns ready/taught lessons assigned to the student's class,
scoped by schoolId, supports subject + search + status filters.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task B3: Lesson detail service + tests

**Files:**
- Modify: `BE: src/modules/Lesson/service-student.ts` (add function)
- Modify: `BE: src/modules/Lesson/__tests__/service-student.test.ts` (add tests)

- [ ] **Step 1: Add failing tests**

Append to `BE: src/modules/Lesson/__tests__/service-student.test.ts` before the closing brace of the file:

```ts
import { getLessonForStudent } from '../service-student.js';

describe('getLessonForStudent', () => {
  it('returns lesson detail with materials populated', async () => {
    const { schoolId, classId, subjectId, teacherId, studentId } = await seed();
    const lesson = await Lesson.create({
      schoolId, teacherId, subjectId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Detailed lesson',
      objectives: ['Learn X', 'Learn Y'],
      durationMinutes: 45,
      status: 'ready',
      materials: [{ kind: 'reading', title: 'Read this' }],
      assignedClasses: [{ classId, scheduledDate: new Date(), status: 'planned' }],
    });

    const student = await Student.findById(studentId);
    if (!student) throw new Error('seed failed');
    const result = await getLessonForStudent(student, lesson._id.toString());
    expect(result).not.toBeNull();
    expect(result?.objectives).toEqual(['Learn X', 'Learn Y']);
    expect(result?.materials).toHaveLength(1);
    expect(result?.materials[0].kind).toBe('reading');
    expect(result?.materials[0].title).toBe('Read this');
  });

  it('returns null when lesson is from another school (multi-tenancy)', async () => {
    const { classId, teacherId, studentId } = await seed();
    const otherSchoolId = new mongoose.Types.ObjectId();
    const lesson = await Lesson.create({
      schoolId: otherSchoolId, teacherId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Other school', durationMinutes: 30, status: 'ready',
      assignedClasses: [{ classId, scheduledDate: new Date(), status: 'planned' }],
    });
    const student = await Student.findById(studentId);
    if (!student) throw new Error('seed failed');
    const result = await getLessonForStudent(student, lesson._id.toString());
    expect(result).toBeNull();
  });

  it('returns null when lesson is not assigned to the student class', async () => {
    const { schoolId, teacherId, studentId } = await seed();
    const lesson = await Lesson.create({
      schoolId, teacherId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Wrong class', durationMinutes: 30, status: 'ready',
      assignedClasses: [{ classId: new mongoose.Types.ObjectId(), scheduledDate: new Date(), status: 'planned' }],
    });
    const student = await Student.findById(studentId);
    if (!student) throw new Error('seed failed');
    const result = await getLessonForStudent(student, lesson._id.toString());
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm test -- src/modules/Lesson/__tests__/service-student.test.ts`
Expected: FAIL — `getLessonForStudent is not a function`.

- [ ] **Step 3: Implement the detail service**

Append to `BE: src/modules/Lesson/service-student.ts`:

```ts
import type { StudentLessonDetail, StudentLessonMaterial } from './types-student.js';

function materialToDto(
  mat: Record<string, unknown>,
  phase: string,
): StudentLessonMaterial {
  const base: StudentLessonMaterial = {
    id: (mat._id as mongoose.Types.ObjectId).toString(),
    kind: mat.kind as StudentLessonMaterial['kind'],
    title: mat.title as string,
    teacherNotes: mat.teacherNotes as string | undefined,
    phase,
  };

  const resource = mat.contentResourceId as Record<string, unknown> | mongoose.Types.ObjectId | undefined;
  if (resource && typeof resource === 'object' && '_id' in resource) {
    base.contentResource = {
      id: (resource._id as mongoose.Types.ObjectId).toString(),
      type: (resource.type as string) ?? 'unknown',
      title: (resource.title as string) ?? base.title,
      url: resource.url as string | undefined,
    };
  }

  const quiz = mat.quizId as Record<string, unknown> | mongoose.Types.ObjectId | undefined;
  if (quiz && typeof quiz === 'object' && '_id' in quiz) {
    const questions = (quiz.questions as unknown[]) ?? [];
    base.quiz = {
      id: (quiz._id as mongoose.Types.ObjectId).toString(),
      title: (quiz.title as string) ?? base.title,
      questionCount: questions.length,
    };
  }

  const homework = mat.homeworkId as Record<string, unknown> | mongoose.Types.ObjectId | undefined;
  if (homework && typeof homework === 'object' && '_id' in homework) {
    base.homework = {
      id: (homework._id as mongoose.Types.ObjectId).toString(),
      title: (homework.title as string) ?? base.title,
      dueAt: (homework.dueDate as Date | undefined)?.toISOString(),
      status: homework.status as string | undefined,
    };
  }

  const paper = mat.paperId as Record<string, unknown> | mongoose.Types.ObjectId | undefined;
  if (paper && typeof paper === 'object' && '_id' in paper) {
    base.paper = {
      paperId: (paper._id as mongoose.Types.ObjectId).toString(),
      title: (paper.title as string) ?? base.title,
      releaseAt: (paper.releaseAt as Date | undefined)?.toISOString(),
      dueAt: (paper.dueAt as Date | undefined)?.toISOString(),
    };
  }

  const textbook = mat.textbookRef as Record<string, unknown> | undefined;
  if (textbook) {
    base.textbookRef = {
      source: textbook.source as 'internal' | 'external',
      title: textbook.title as string | undefined,
      pageStart: textbook.pageStart as number | undefined,
      pageEnd: textbook.pageEnd as number | undefined,
      internalId: (textbook.textbookId as mongoose.Types.ObjectId | undefined)?.toString(),
    };
  }

  return base;
}

export async function getLessonForStudent(
  student: HydratedDocument<IStudent>,
  lessonId: string,
): Promise<StudentLessonDetail | null> {
  const doc = await Lesson.findOne({
    _id: lessonId,
    schoolId: student.schoolId,
    isDeleted: false,
    status: { $in: ['ready', 'taught'] },
    'assignedClasses.classId': student.classId,
  })
    .populate('subjectId', 'name title')
    .populate('materials.contentResourceId')
    .populate('materials.quizId', 'title questions')
    .populate('materials.homeworkId', 'title dueDate status')
    .populate('materials.paperId', 'title releaseAt dueAt')
    .lean()
    .exec();

  if (!doc) return null;

  const summary = lessonToSummary(doc as Record<string, unknown>, student.classId);
  const materials = (doc.materials as Array<Record<string, unknown>>) ?? [];
  const phaseLookup = new Map<string, string>();
  const phases = (doc.phases as Array<{ phase: string; materialIds: mongoose.Types.ObjectId[] }>) ?? [];
  for (const p of phases) {
    for (const mid of p.materialIds) phaseLookup.set(mid.toString(), p.phase);
  }

  return {
    ...summary,
    objectives: (doc.objectives as string[]) ?? [],
    durationMinutes: doc.durationMinutes as number,
    materials: materials.map((m) => materialToDto(m, phaseLookup.get((m._id as mongoose.Types.ObjectId).toString()) ?? '')),
  };
}
```

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- src/modules/Lesson/__tests__/service-student.test.ts`
Expected: PASS (6 tests total — 3 list + 3 detail).

- [ ] **Step 5: Commit**

```bash
git add src/modules/Lesson/service-student.ts src/modules/Lesson/__tests__/service-student.test.ts
git commit -m "$(cat <<'EOF'
feat(lesson): getLessonForStudent service with materials populated

Detail endpoint returns lesson with subject/quiz/homework/paper/
contentResource references resolved, scoped by schoolId + classId.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task B4: Controller + routes

**Files:**
- Create: `BE: src/modules/Lesson/controller-student.ts`
- Create: `BE: src/modules/Lesson/routes-student.ts`

- [ ] **Step 1: Implement the controller**

Create `BE: src/modules/Lesson/controller-student.ts`:

```ts
import type { Request, Response, NextFunction } from 'express';
import { resolveStudentFromUserId } from '../../common/student-resolver.js';
import { NotFoundError, UnauthorizedError } from '../../common/errors.js';
import { listLessonsForStudent, getLessonForStudent } from './service-student.js';
import {
  studentLessonListQuerySchema,
  studentLessonParamSchema,
} from './validation-student.js';

export class StudentLessonController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) throw new UnauthorizedError();
      const student = await resolveStudentFromUserId(req.user.id);
      if (!student) throw new NotFoundError('Student profile not found');

      const query = studentLessonListQuerySchema.parse(req.query);
      const lessons = await listLessonsForStudent(student, query);
      res.json({ success: true, data: lessons });
    } catch (err: unknown) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) throw new UnauthorizedError();
      const student = await resolveStudentFromUserId(req.user.id);
      if (!student) throw new NotFoundError('Student profile not found');

      const { id } = studentLessonParamSchema.parse(req.params);
      const lesson = await getLessonForStudent(student, id);
      if (!lesson) throw new NotFoundError('Lesson not found');
      res.json({ success: true, data: lesson });
    } catch (err: unknown) {
      next(err);
    }
  }
}
```

If your project's `errors.ts` uses different class names (e.g. `AppError.notFound()`), adapt — read `BE: src/common/errors.ts` first.

- [ ] **Step 2: Implement the router**

Create `BE: src/modules/Lesson/routes-student.ts`:

```ts
import { Router } from 'express';
import { authorize } from '../../middleware/rbac.js';
import { StudentLessonController } from './controller-student.js';

const router = Router();

router.use(authorize('student'));

router.get('/', StudentLessonController.list);
router.get('/:id', StudentLessonController.getById);

export default router;
```

Verify the `authorize` middleware exists at that path and accepts a role string — read `BE: src/middleware/rbac.ts` (or `src/middleware/auth.ts`) and adapt the import / signature if needed.

- [ ] **Step 3: Verify both files compile**

Run: `npx tsc --noEmit`
Expected: PASS with no errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add src/modules/Lesson/controller-student.ts src/modules/Lesson/routes-student.ts
git commit -m "$(cat <<'EOF'
feat(lesson): student controller + router for /api/student/lessons

GET / lists lessons, GET /:id returns detail. Both resolve current
student from JWT and enforce student-only role authorisation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task B5: Mount routes in app.ts

**Files:**
- Modify: `BE: src/app.ts`

- [ ] **Step 1: Read app.ts and find the right insertion spot**

Read `BE: src/app.ts`. Locate the block where `/api/students` and `/api/content-library/student` are mounted (around lines 131 and 205 per earlier exploration). The new mount goes near other `/api/student/*` mounts.

- [ ] **Step 2: Add the import and mount**

Add near the existing student-related imports (top of file):
```ts
import studentLessonRoutes from './modules/Lesson/routes-student.js';
```

Add near the other student route mounts:
```ts
app.use('/api/student/lessons', authenticate, studentLessonRoutes);
```

Note: **no `requireModule` gate** — Phase 1 standalone students have no school modules. Pattern matches `/api/students`.

- [ ] **Step 3: Smoke-test the endpoint**

Start the backend dev server: `npm run dev`. With a valid student JWT (any existing student account), curl:
```bash
curl -H "Authorization: Bearer <student-jwt>" http://localhost:4500/api/student/lessons
```
Expected: `{ "success": true, "data": [] }` (empty if no lessons assigned) or a populated array. **Not** a 401/403.

- [ ] **Step 4: Commit**

```bash
git add src/app.ts
git commit -m "$(cat <<'EOF'
feat(app): mount /api/student/lessons routes

Authenticated, no module gate — standalone-teacher students need
access without a school subscription.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase C — Backend dashboard endpoint

### Task C1: Dashboard service + tests

**Files:**
- Create: `BE: src/modules/Student/service-dashboard.ts`
- Create: `BE: src/modules/Student/__tests__/service-dashboard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `BE: src/modules/Student/__tests__/service-dashboard.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Student } from '../model.js';
import { Lesson } from '../../Lesson/model.js';
import { buildStudentDashboard } from '../service-dashboard.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
beforeEach(async () => {
  await Student.deleteMany({});
  await Lesson.deleteMany({});
});

describe('buildStudentDashboard', () => {
  it('returns the most recent taught lesson as recentLesson', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const classId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const student = await Student.create({
      schoolId, classId,
      gradeId: new mongoose.Types.ObjectId(),
      admissionNumber: 'ADM-D1', enrollmentStatus: 'active',
    });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await Lesson.create({
      schoolId, teacherId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Old taught', durationMinutes: 30, status: 'taught',
      assignedClasses: [{ classId, scheduledDate: lastWeek, status: 'taught' }],
    });
    await Lesson.create({
      schoolId, teacherId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Recent taught', durationMinutes: 30, status: 'taught',
      assignedClasses: [{ classId, scheduledDate: yesterday, status: 'taught' }],
    });

    const dashboard = await buildStudentDashboard(student);
    expect(dashboard.recentLesson?.title).toBe('Recent taught');
  });

  it('returns null for recentLesson when no taught lessons exist', async () => {
    const student = await Student.create({
      schoolId: new mongoose.Types.ObjectId(),
      classId: new mongoose.Types.ObjectId(),
      gradeId: new mongoose.Types.ObjectId(),
      admissionNumber: 'ADM-D2', enrollmentStatus: 'active',
    });
    const dashboard = await buildStudentDashboard(student);
    expect(dashboard.recentLesson).toBeNull();
  });

  it('counts lessons assigned this week', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const classId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const student = await Student.create({
      schoolId, classId,
      gradeId: new mongoose.Types.ObjectId(),
      admissionNumber: 'ADM-D3', enrollmentStatus: 'active',
    });
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await Lesson.create({
      schoolId, teacherId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Soon', durationMinutes: 30, status: 'ready',
      assignedClasses: [{ classId, scheduledDate: inThreeDays, status: 'planned' }],
    });
    await Lesson.create({
      schoolId, teacherId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Later', durationMinutes: 30, status: 'ready',
      assignedClasses: [{ classId, scheduledDate: inTwoWeeks, status: 'planned' }],
    });
    const dashboard = await buildStudentDashboard(student);
    expect(dashboard.counts.lessonsThisWeek).toBe(1);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm test -- src/modules/Student/__tests__/service-dashboard.test.ts`
Expected: FAIL — `Cannot find module '../service-dashboard.js'`.

- [ ] **Step 3: Implement the service**

Create `BE: src/modules/Student/service-dashboard.ts`:

```ts
import mongoose from 'mongoose';
import { Lesson } from '../Lesson/model.js';
import { Homework } from '../Homework/model.js'; // adjust path if needed
import { AssessmentPaper } from '../AssessmentPaper/model.js'; // adjust path if needed
import type { IStudent } from './types.js';
import type { HydratedDocument } from 'mongoose';

export interface StudentDashboardDto {
  recentLesson: { id: string; title: string; subject: string; scheduledDate: string } | null;
  nextHomework: { id: string; title: string; subject: string; dueAt: string } | null;
  nextTest:     { paperId: string; title: string; subject: string; releaseAt?: string; dueAt?: string } | null;
  counts: {
    lessonsThisWeek: number;
    homeworkDueThisWeek: number;
    testsScheduled: number;
    homeworkOverdue: number;
  };
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setHours(0, 0, 0, 0);
  date.setDate(diff);
  return date;
}

export async function buildStudentDashboard(
  student: HydratedDocument<IStudent>,
): Promise<StudentDashboardDto> {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Recent taught lesson (most recent assignment for this student's class)
  const recentLessonDoc = await Lesson.findOne({
    schoolId: student.schoolId,
    isDeleted: false,
    status: 'taught',
    'assignedClasses.classId': student.classId,
  })
    .populate('subjectId', 'name title')
    .sort({ 'assignedClasses.scheduledDate': -1 })
    .lean();

  // Count lessons assigned this week
  const lessonsThisWeek = await Lesson.countDocuments({
    schoolId: student.schoolId,
    isDeleted: false,
    status: { $in: ['ready', 'taught'] },
    'assignedClasses': {
      $elemMatch: {
        classId: student.classId,
        scheduledDate: { $gte: weekStart, $lt: weekEnd },
      },
    },
  });

  // Next homework due — verify Homework model fields with the existing module
  // before relying on these field names; adjust if Homework uses different keys.
  const nextHomeworkDoc = await Homework.findOne({
    schoolId: student.schoolId,
    isDeleted: false,
    classId: student.classId,
    dueDate: { $gte: now },
    // If homework is per-student-status, filter for "not submitted by this student"
    // using whatever pattern that module already uses.
  })
    .populate('subjectId', 'name title')
    .sort({ dueDate: 1 })
    .lean();

  const homeworkDueThisWeek = await Homework.countDocuments({
    schoolId: student.schoolId,
    isDeleted: false,
    classId: student.classId,
    dueDate: { $gte: weekStart, $lt: weekEnd },
  });

  const homeworkOverdue = await Homework.countDocuments({
    schoolId: student.schoolId,
    isDeleted: false,
    classId: student.classId,
    dueDate: { $lt: now },
    // submitted: false (or equivalent per the Homework model)
  });

  // Next test/paper assigned to this class
  const nextPaperDoc = await AssessmentPaper.findOne({
    schoolId: student.schoolId,
    isDeleted: false,
    'assignments.classId': student.classId,
    // status: 'assigned' or similar — adjust to module pattern
  })
    .populate('subjectId', 'name title')
    .sort({ 'assignments.releaseAt': 1 })
    .lean();

  const testsScheduled = await AssessmentPaper.countDocuments({
    schoolId: student.schoolId,
    isDeleted: false,
    'assignments.classId': student.classId,
    // status filter as above
  });

  function subjectName(s: unknown): string {
    if (s && typeof s === 'object' && '_id' in s) {
      const o = s as Record<string, unknown>;
      return (o.name as string) ?? (o.title as string) ?? '';
    }
    return '';
  }

  const recentAssignment = recentLessonDoc
    ? (recentLessonDoc.assignedClasses as Array<{ classId: mongoose.Types.ObjectId; scheduledDate: Date; status: string }>)
        .find((a) => a.classId.toString() === student.classId.toString())
    : null;

  return {
    recentLesson: recentLessonDoc ? {
      id: (recentLessonDoc._id as mongoose.Types.ObjectId).toString(),
      title: recentLessonDoc.title as string,
      subject: subjectName(recentLessonDoc.subjectId),
      scheduledDate: (recentAssignment?.scheduledDate ?? new Date()).toISOString(),
    } : null,
    nextHomework: nextHomeworkDoc ? {
      id: (nextHomeworkDoc._id as mongoose.Types.ObjectId).toString(),
      title: (nextHomeworkDoc.title as string) ?? '',
      subject: subjectName(nextHomeworkDoc.subjectId),
      dueAt: (nextHomeworkDoc.dueDate as Date).toISOString(),
    } : null,
    nextTest: nextPaperDoc ? {
      paperId: (nextPaperDoc._id as mongoose.Types.ObjectId).toString(),
      title: (nextPaperDoc.title as string) ?? '',
      subject: subjectName(nextPaperDoc.subjectId),
      // releaseAt/dueAt extraction depends on AssessmentPaper.assignments shape
    } : null,
    counts: {
      lessonsThisWeek,
      homeworkDueThisWeek,
      testsScheduled,
      homeworkOverdue,
    },
  };
}
```

**Before running tests:** open `BE: src/modules/Homework/model.ts` and `BE: src/modules/AssessmentPaper/model.ts` (find correct module names by `ls src/modules/`) and verify the field names used above (`dueDate`, `classId`, `assignments`, `releaseAt`). Adjust the service to match the real schema. Mark this in a code comment if any field maps differently.

- [ ] **Step 4: Run test, expect pass**

Run: `npm test -- src/modules/Student/__tests__/service-dashboard.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/Student/service-dashboard.ts src/modules/Student/__tests__/service-dashboard.test.ts
git commit -m "$(cat <<'EOF'
feat(student): dashboard aggregator service

Single-roundtrip dashboard DTO with recent lesson, next homework,
next test, and weekly counts. Replaces frontend fan-out across
3 hooks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task C2: Dashboard controller + route + mount

**Files:**
- Create: `BE: src/modules/Student/controller-dashboard.ts`
- Create: `BE: src/modules/Student/routes-dashboard.ts`
- Modify: `BE: src/app.ts`

- [ ] **Step 1: Create the controller**

Create `BE: src/modules/Student/controller-dashboard.ts`:

```ts
import type { Request, Response, NextFunction } from 'express';
import { resolveStudentFromUserId } from '../../common/student-resolver.js';
import { NotFoundError, UnauthorizedError } from '../../common/errors.js';
import { buildStudentDashboard } from './service-dashboard.js';

export class StudentDashboardController {
  static async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) throw new UnauthorizedError();
      const student = await resolveStudentFromUserId(req.user.id);
      if (!student) throw new NotFoundError('Student profile not found');
      const data = await buildStudentDashboard(student);
      res.json({ success: true, data });
    } catch (err: unknown) {
      next(err);
    }
  }
}
```

- [ ] **Step 2: Create the router**

Create `BE: src/modules/Student/routes-dashboard.ts`:

```ts
import { Router } from 'express';
import { authorize } from '../../middleware/rbac.js';
import { StudentDashboardController } from './controller-dashboard.js';

const router = Router();
router.use(authorize('student'));
router.get('/', StudentDashboardController.get);
export default router;
```

- [ ] **Step 3: Mount in app.ts**

Add to `BE: src/app.ts` imports:
```ts
import studentDashboardRoutes from './modules/Student/routes-dashboard.js';
```
Mount near `/api/student/lessons`:
```ts
app.use('/api/student/dashboard', authenticate, studentDashboardRoutes);
```

- [ ] **Step 4: Smoke test**

With backend running, curl:
```bash
curl -H "Authorization: Bearer <student-jwt>" http://localhost:4500/api/student/dashboard
```
Expected: `{ "success": true, "data": { "recentLesson": ..., "nextHomework": ..., "nextTest": ..., "counts": {...} } }`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Student/controller-dashboard.ts src/modules/Student/routes-dashboard.ts src/app.ts
git commit -m "$(cat <<'EOF'
feat(student): mount /api/student/dashboard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase D — Backend homework backlink

### Task D1: Add `sourceLesson` to GET /api/homework/:id

**Files:**
- Modify: `BE: src/modules/Homework/controller.ts` (or `service.ts` — whichever owns the detail handler)
- Modify (test): `BE: src/modules/Homework/__tests__/<existing or new>.test.ts`

- [ ] **Step 1: Find the homework detail handler**

Read `BE: src/modules/Homework/controller.ts` and `service.ts`. Locate the function that handles `GET /:id`. Note its current return shape.

- [ ] **Step 2: Write a failing test for `sourceLesson`**

Create or extend `BE: src/modules/Homework/__tests__/controller-detail.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Homework } from '../model.js';
import { Lesson } from '../../Lesson/model.js';
import { getHomeworkById } from '../service.js'; // or wherever the function lives — rename to whatever exists

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test');
  }
});
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
beforeEach(async () => {
  await Homework.deleteMany({});
  await Lesson.deleteMany({});
});

describe('getHomeworkById', () => {
  it('returns sourceLesson when homework is referenced by a lesson material', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    const classId = new mongoose.Types.ObjectId();
    const homework = await Homework.create({
      schoolId, teacherId, classId,
      title: 'Reading questions',
      type: 'reading',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      // ...other required fields per the real Homework schema
    });
    const lesson = await Lesson.create({
      schoolId, teacherId,
      curriculumNodeId: new mongoose.Types.ObjectId(),
      title: 'Source lesson', durationMinutes: 30, status: 'ready',
      materials: [{ kind: 'homework', title: 'HW', homeworkId: homework._id }],
      assignedClasses: [{ classId, scheduledDate: new Date(), status: 'planned' }],
    });

    const result = await getHomeworkById(schoolId.toString(), homework._id.toString());
    expect(result?.sourceLesson).toEqual({
      id: lesson._id.toString(),
      title: 'Source lesson',
    });
  });

  it('returns sourceLesson=null when no lesson references the homework', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const homework = await Homework.create({
      schoolId,
      teacherId: new mongoose.Types.ObjectId(),
      classId: new mongoose.Types.ObjectId(),
      title: 'Orphan', type: 'reading',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const result = await getHomeworkById(schoolId.toString(), homework._id.toString());
    expect(result?.sourceLesson).toBeNull();
  });
});
```

**Adjust** the function name `getHomeworkById` and the `Homework.create` fields to match what actually exists in the module.

- [ ] **Step 3: Run test, expect failure**

Run: `npm test -- src/modules/Homework/__tests__/controller-detail.test.ts`
Expected: FAIL — `sourceLesson` undefined or function signature mismatch.

- [ ] **Step 4: Add the reverse lookup**

In the existing detail handler (`BE: src/modules/Homework/service.ts` or wherever), after fetching the homework doc and before returning, add:

```ts
import { Lesson } from '../Lesson/model.js';
// ... inside the detail handler, after homework is loaded:
const sourceLessonDoc = await Lesson.findOne({
  schoolId,
  isDeleted: false,
  'materials.homeworkId': homework._id,
}).select('_id title').lean();

const sourceLesson = sourceLessonDoc
  ? { id: sourceLessonDoc._id.toString(), title: sourceLessonDoc.title as string }
  : null;

return { ...homeworkDto, sourceLesson };
```

Make sure the existing return type / DTO is extended to include `sourceLesson: { id: string; title: string } | null`.

- [ ] **Step 5: Run test, expect pass**

Run: `npm test -- src/modules/Homework/__tests__/controller-detail.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/modules/Homework/
git commit -m "$(cat <<'EOF'
feat(homework): include sourceLesson backlink in GET /api/homework/:id

Reverse-lookup via Lesson.materials[].homeworkId. Lets the student
homework detail page show 'From: [Lesson title]' breadcrumb.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase E — Frontend types

### Task E1: Mirror backend DTOs in frontend types

**Files:**
- Create: `FE: src/types/lesson-student.ts`
- Modify: `FE: src/types/index.ts` (add re-export)

- [ ] **Step 1: Create the types file**

Create `FE: src/types/lesson-student.ts`:

```ts
export interface StudentLessonSummary {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  scheduledDate: string;
  status: 'planned' | 'taught';
  materialCount: number;
  hasHomework: boolean;
  hasQuiz: boolean;
}

export type StudentLessonMaterialKind =
  | 'reading' | 'worksheet' | 'activity' | 'study_notes'
  | 'worked_example' | 'quiz' | 'practice_questions'
  | 'homework' | 'paper';

export interface StudentLessonMaterial {
  id: string;
  kind: StudentLessonMaterialKind;
  title: string;
  teacherNotes?: string;
  phase: string;
  contentResource?: { id: string; type: string; title: string; url?: string };
  quiz?: { id: string; title: string; questionCount: number };
  homework?: { id: string; title: string; dueAt?: string; status?: string };
  paper?: { paperId: string; title: string; releaseAt?: string; dueAt?: string };
  textbookRef?: {
    source: 'internal' | 'external';
    title?: string;
    pageStart?: number;
    pageEnd?: number;
    internalId?: string;
  };
  comprehensionQuestions?: Array<{ id: string; prompt: string }>;
}

export interface StudentLessonDetail extends StudentLessonSummary {
  objectives: string[];
  durationMinutes: number;
  materials: StudentLessonMaterial[];
}

export interface StudentLessonListFilters {
  subjectId?: string;
  status?: 'planned' | 'taught' | 'all';
  search?: string;
}

export interface StudentDashboardDto {
  recentLesson: { id: string; title: string; subject: string; scheduledDate: string } | null;
  nextHomework: { id: string; title: string; subject: string; dueAt: string } | null;
  nextTest:     { paperId: string; title: string; subject: string; releaseAt?: string; dueAt?: string } | null;
  counts: {
    lessonsThisWeek: number;
    homeworkDueThisWeek: number;
    testsScheduled: number;
    homeworkOverdue: number;
  };
}
```

- [ ] **Step 2: Re-export from barrel**

Append to `FE: src/types/index.ts`:
```ts
export * from './lesson-student';
```

- [ ] **Step 3: Commit**

```bash
git add src/types/lesson-student.ts src/types/index.ts
git commit -m "$(cat <<'EOF'
feat(types): student lesson + dashboard DTOs mirroring backend

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase F — Frontend foundation (hooks + layout)

### Task F1: `useStudentModules` hook

**Files:**
- Create: `FE: src/hooks/useStudentModules.ts`

- [ ] **Step 1: Implement the hook**

Create `FE: src/hooks/useStudentModules.ts`:

```ts
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse } from '@/lib/api-helpers';

export type ModuleKey =
  | 'academic' | 'communication' | 'library' | 'wallet' | 'tuck_shop'
  | 'achiever' | 'sports' | 'incident_wellbeing' | 'careers'
  | 'portfolio';

interface SchoolModulesPayload {
  modulesEnabled?: string[];
}

interface UseStudentModulesResult {
  phase: 'standalone' | 'school';
  enabled: Set<ModuleKey>;
  loading: boolean;
}

export function useStudentModules(): UseStudentModulesResult {
  const { user } = useAuthStore();
  const [enabled, setEnabled] = useState<Set<ModuleKey>>(new Set());
  const [phase, setPhase] = useState<'standalone' | 'school'>('standalone');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.schoolId) {
        if (!cancelled) { setPhase('standalone'); setEnabled(new Set()); setLoading(false); }
        return;
      }
      try {
        const response = await apiClient.get(`/schools/${user.schoolId}`);
        const school = unwrapResponse<SchoolModulesPayload>(response);
        const modules = (school.modulesEnabled ?? []) as ModuleKey[];
        if (!cancelled) {
          setEnabled(new Set(modules));
          setPhase(modules.length === 0 ? 'standalone' : 'school');
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setPhase('standalone'); setEnabled(new Set()); setLoading(false); }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [user?.schoolId]);

  return { phase, enabled, loading };
}
```

If `apiClient` lives at a different path, adjust the import. Check `FE: src/lib/` for the actual file.

- [ ] **Step 2: Smoke-check the file compiles**

Run: `npm run typecheck` (or `npx tsc --noEmit`) from the frontend repo.
Expected: PASS for this file.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useStudentModules.ts
git commit -m "$(cat <<'EOF'
feat(student): useStudentModules hook for Phase 1/2 nav gating

Reads school.modulesEnabled; returns empty set for standalone-teacher
students so Phase 2 items hide cleanly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task F2: `RoleGuard` component

**Files:**
- Create: `FE: src/components/auth/RoleGuard.tsx`

- [ ] **Step 1: Read the existing `AuthGuard` to mirror its pattern**

Read `FE: src/components/auth/AuthGuard.tsx` (if it exists — search if not). Note its structure: loading state, redirect when unauthenticated.

- [ ] **Step 2: Implement the role guard**

Create `FE: src/components/auth/RoleGuard.tsx`:

```tsx
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface RoleGuardProps {
  role: 'student' | 'teacher' | 'parent' | 'school_admin' | 'super_admin';
  redirectTo?: string;
  children: ReactNode;
}

export function RoleGuard({ role, redirectTo, children }: RoleGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== role) {
      router.replace(redirectTo ?? `/${user.role}`);
    }
  }, [loading, user, role, redirectTo, router]);

  if (loading || !user || user.role !== role) return <LoadingSpinner />;
  return <>{children}</>;
}
```

If `useAuthStore`'s shape differs (no `loading`, different role field name), adapt by reading the store first.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/RoleGuard.tsx
git commit -m "$(cat <<'EOF'
feat(auth): RoleGuard mirrors AuthGuard with per-role gating

Redirects non-matching roles to their own portal root.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task F3: Lesson + dashboard data hooks

**Files:**
- Create: `FE: src/hooks/useStudentLessons.ts`
- Create: `FE: src/hooks/useStudentLesson.ts`
- Create: `FE: src/hooks/useStudentDashboard.ts`

- [ ] **Step 1: Create the list hook**

Create `FE: src/hooks/useStudentLessons.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { StudentLessonSummary, StudentLessonListFilters } from '@/types';

interface UseStudentLessonsResult {
  lessons: StudentLessonSummary[];
  loading: boolean;
  refresh: (filters?: StudentLessonListFilters) => Promise<void>;
}

export function useStudentLessons(initial?: StudentLessonListFilters): UseStudentLessonsResult {
  const [lessons, setLessons] = useState<StudentLessonSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (filters?: StudentLessonListFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const f = filters ?? initial ?? {};
      if (f.subjectId) params.set('subjectId', f.subjectId);
      if (f.status) params.set('status', f.status);
      if (f.search) params.set('search', f.search);
      const qs = params.toString();
      const response = await apiClient.get(`/student/lessons${qs ? `?${qs}` : ''}`);
      setLessons(unwrapList<StudentLessonSummary>(response));
    } catch {
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, [initial]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { lessons, loading, refresh };
}
```

- [ ] **Step 2: Create the detail hook**

Create `FE: src/hooks/useStudentLesson.ts`:

```ts
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { StudentLessonDetail } from '@/types';

interface UseStudentLessonResult {
  lesson: StudentLessonDetail | null;
  loading: boolean;
}

export function useStudentLesson(id: string): UseStudentLessonResult {
  const [lesson, setLesson] = useState<StudentLessonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await apiClient.get(`/student/lessons/${id}`);
        if (!cancelled) setLesson(unwrapResponse<StudentLessonDetail>(response));
      } catch {
        if (!cancelled) setLesson(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  return { lesson, loading };
}
```

- [ ] **Step 3: Replace dashboard hook**

Create `FE: src/hooks/useStudentDashboard.ts` (overwrite the existing one — its old multi-hook fan-out is being replaced):

```ts
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { StudentDashboardDto } from '@/types';

interface UseStudentDashboardResult {
  dashboard: StudentDashboardDto | null;
  loading: boolean;
}

export function useStudentDashboard(): UseStudentDashboardResult {
  const [dashboard, setDashboard] = useState<StudentDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await apiClient.get('/student/dashboard');
        if (!cancelled) setDashboard(unwrapResponse<StudentDashboardDto>(response));
      } catch {
        if (!cancelled) setDashboard(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return { dashboard, loading };
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck` from frontend repo.
Expected: no errors in the three new files.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStudentLessons.ts src/hooks/useStudentLesson.ts src/hooks/useStudentDashboard.ts
git commit -m "$(cat <<'EOF'
feat(student): data hooks for lessons list/detail and dashboard

Single backend call per hook. Dashboard hook replaces previous
3-hook fan-out implementation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task F4: Student nav config

**Files:**
- Create: `FE: src/lib/student-nav.ts`

- [ ] **Step 1: Define the nav array**

Create `FE: src/lib/student-nav.ts`:

```ts
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, BookOpen, ClipboardList, FileText, Sparkles, User,
  Calendar, Award, Wallet, Library, Trophy, Activity, Heart,
  Briefcase, Folder, Video,
} from 'lucide-react';
import type { ModuleKey } from '@/hooks/useStudentModules';

export interface StudentNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module?: ModuleKey;
}

// Phase 1 — always visible
export const PHASE_1_NAV: StudentNavItem[] = [
  { label: 'Dashboard', href: '/student',            icon: LayoutDashboard },
  { label: 'Lessons',   href: '/student/lessons',    icon: BookOpen },
  { label: 'Homework',  href: '/student/homework',   icon: ClipboardList },
  { label: 'Tests',     href: '/student/tests',      icon: FileText },
  { label: 'AI Tutor',  href: '/student/ai-tutor',   icon: Sparkles },
  { label: 'Profile',   href: '/student/profile',    icon: User },
];

// Phase 2 — gated by module
export const PHASE_2_NAV: StudentNavItem[] = [
  { label: 'Timetable',     href: '/student/timetable',     icon: Calendar,  module: 'academic' },
  { label: 'Grades',        href: '/student/grades',        icon: Award,     module: 'academic' },
  { label: 'Wallet',        href: '/student/wallet',        icon: Wallet,    module: 'wallet' },
  { label: 'Library',       href: '/student/library',       icon: Library,   module: 'library' },
  { label: 'Achievements',  href: '/student/achievements',  icon: Trophy,    module: 'achiever' },
  { label: 'Sports',        href: '/student/sports',        icon: Activity,  module: 'sports' },
  { label: 'Wellbeing',     href: '/student/wellbeing',     icon: Heart,     module: 'incident_wellbeing' },
  { label: 'Careers',       href: '/student/careers',       icon: Briefcase, module: 'careers' },
  { label: 'Portfolio',     href: '/student/portfolio',     icon: Folder,    module: 'portfolio' },
  { label: 'Classroom',     href: '/student/classroom',     icon: Video,     module: 'academic' },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/student-nav.ts
git commit -m "$(cat <<'EOF'
feat(student): central nav config split by Phase 1 / Phase 2

Sidebar + bottom nav both consume this. Phase 2 entries carry a
module key for gating.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task F5: Student sidebar + bottom nav

**Files:**
- Create: `FE: src/components/student/StudentSidebar.tsx`
- Create: `FE: src/components/student/StudentBottomNav.tsx`

- [ ] **Step 1: Create the sidebar**

Create `FE: src/components/student/StudentSidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PHASE_1_NAV, PHASE_2_NAV, type StudentNavItem } from '@/lib/student-nav';
import { useStudentModules } from '@/hooks/useStudentModules';

function NavLink({ item, active }: { item: StudentNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={[
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      ].join(' ')}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function StudentSidebar() {
  const pathname = usePathname();
  const { enabled } = useStudentModules();
  const visiblePhase2 = PHASE_2_NAV.filter((i) => i.module && enabled.has(i.module));

  return (
    <nav className="hidden lg:flex w-60 shrink-0 flex-col gap-1 border-r p-4">
      {PHASE_1_NAV.map((i) => (
        <NavLink key={i.href} item={i} active={pathname === i.href || pathname.startsWith(`${i.href}/`)} />
      ))}
      {visiblePhase2.length > 0 && (
        <>
          <div className="my-2 text-xs uppercase tracking-wide text-muted-foreground px-3">More</div>
          {visiblePhase2.map((i) => (
            <NavLink key={i.href} item={i} active={pathname === i.href || pathname.startsWith(`${i.href}/`)} />
          ))}
        </>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Create the bottom nav (mobile)**

Create `FE: src/components/student/StudentBottomNav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PHASE_1_NAV } from '@/lib/student-nav';

export function StudentBottomNav() {
  const pathname = usePathname();
  // Mobile bottom nav shows only Phase 1 items (Phase 2 lives behind a "More" sheet in Phase 2)
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex border-t bg-background">
      {PHASE_1_NAV.map((i) => {
        const Icon = i.icon;
        const active = pathname === i.href || pathname.startsWith(`${i.href}/`);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={[
              'flex-1 flex flex-col items-center justify-center py-2 text-[10px] gap-0.5',
              active ? 'text-primary' : 'text-muted-foreground',
            ].join(' ')}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/student/StudentSidebar.tsx src/components/student/StudentBottomNav.tsx
git commit -m "$(cat <<'EOF'
feat(student): sidebar + bottom nav consuming central nav config

Phase 2 items appear only when their module is enabled.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task F6: Student layout shell

**Files:**
- Create: `FE: src/app/(dashboard)/student/layout.tsx`

- [ ] **Step 1: Implement the layout**

Create `FE: src/app/(dashboard)/student/layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { StudentSidebar } from '@/components/student/StudentSidebar';
import { StudentBottomNav } from '@/components/student/StudentBottomNav';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="student">
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
          {children}
        </main>
        <StudentBottomNav />
      </div>
    </RoleGuard>
  );
}
```

- [ ] **Step 2: Manual smoke**

Start dev server: `npm run dev`. Log in as a student. Navigate to `/student`. Expected: layout renders with sidebar on desktop / bottom nav on mobile; non-students get redirected.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/layout.tsx
git commit -m "$(cat <<'EOF'
feat(student): student-only layout shell with RoleGuard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase G — Lessons hub

### Task G1: Extract `QuizPlayer` component

**Files:**
- Read: `FE: src/app/(dashboard)/student/quizzes/page.tsx` (per Task 0.3 finding)
- Create: `FE: src/components/learning/QuizPlayer.tsx`

- [ ] **Step 1: Identify reusable quiz-taking logic**

Re-read `FE: src/app/(dashboard)/student/quizzes/page.tsx`. Identify:
- The answer-state shape
- The submit handler
- The result/feedback view

These become the player's internal state.

- [ ] **Step 2: Implement the player**

Create `FE: src/components/learning/QuizPlayer.tsx` as a self-contained component accepting:
```ts
interface QuizPlayerProps {
  quizId: string;
  mode: 'scored' | 'practice';
  onComplete?: (result: { score: number; total: number }) => void;
}
```

Body: fetches the quiz via existing endpoint, renders questions, accepts answers, submits and shows result. Pull the actual question-rendering JSX out of the existing `/student/quizzes/page.tsx`. Keep file under 350 lines — split into sub-components (`QuizQuestion.tsx`) if needed.

**If no existing quiz-taking implementation exists (Task 0.3 found none),** build minimally:
- Fetch quiz: `GET /api/quizzes/:id` (verify path against backend)
- Render: text question + MCQ radio options OR free-text textarea
- Submit: `POST /api/quizzes/:id/attempts`
- Show: score + per-question correct/incorrect feedback

- [ ] **Step 3: Manual smoke**

Drop `<QuizPlayer quizId="..." mode="scored" />` into a temporary route, verify it loads and submits.

- [ ] **Step 4: Commit**

```bash
git add src/components/learning/QuizPlayer.tsx
git commit -m "$(cat <<'EOF'
feat(learning): reusable QuizPlayer component

Extracted/built for use by lesson detail and homework detail pages.
Supports scored + practice modes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task G2: `LessonResourceReader` modal

**Files:**
- Create: `FE: src/components/student/LessonResourceReader.tsx`

- [ ] **Step 1: Implement the reader**

Create `FE: src/components/student/LessonResourceReader.tsx`:

```tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { StudentLessonMaterial } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: StudentLessonMaterial | null;
}

export function LessonResourceReader({ open, onOpenChange, material }: Props) {
  if (!material) return null;
  const resource = material.contentResource;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{material.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {!resource && (
            <p className="text-sm text-muted-foreground">No content attached to this material.</p>
          )}
          {resource?.type === 'video' && resource.url && (
            <video controls className="w-full rounded">
              <source src={resource.url} />
            </video>
          )}
          {resource?.type === 'pdf' && resource.url && (
            <iframe src={resource.url} className="w-full h-[60vh] rounded border" title={resource.title} />
          )}
          {resource?.type === 'link' && resource.url && (
            <a href={resource.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 text-primary hover:underline">
              <ExternalLink className="h-4 w-4" /> Open external link
            </a>
          )}
          {resource?.type === 'markdown' && (
            // Existing markdown renderer in the repo — search src/components for one.
            // Fall back to <pre> if none exists, with TODO marker for a future pass.
            <pre className="whitespace-pre-wrap text-sm">{/* markdown body */}</pre>
          )}
          {material.teacherNotes && (
            <div className="mt-4 rounded-md bg-muted p-3 text-sm">
              <strong>Teacher notes:</strong> {material.teacherNotes}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

If a markdown renderer (`react-markdown` etc.) is already used elsewhere — search `FE: src/components/` — wire it into the markdown branch.

- [ ] **Step 2: Commit**

```bash
git add src/components/student/LessonResourceReader.tsx
git commit -m "$(cat <<'EOF'
feat(student): LessonResourceReader modal for inline material viewing

Handles video/pdf/link/markdown branches. Used by the lesson
detail page when a reading/notes/worked-example card is opened.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task G3: `LessonCard` + `LessonMaterialCard` + `AskAITutorCTA`

**Files:**
- Create: `FE: src/components/student/LessonCard.tsx`
- Create: `FE: src/components/student/LessonMaterialCard.tsx`
- Create: `FE: src/components/student/AskAITutorCTA.tsx`

- [ ] **Step 1: Lesson card**

Create `FE: src/components/student/LessonCard.tsx`:

```tsx
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, BookOpen, ClipboardList, Sparkles } from 'lucide-react';
import type { StudentLessonSummary } from '@/types';

export function LessonCard({ lesson }: { lesson: StudentLessonSummary }) {
  return (
    <Link href={`/student/lessons/${lesson.id}`}>
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold truncate">{lesson.title}</h3>
            <Badge variant={lesson.status === 'taught' ? 'default' : 'secondary'} className="shrink-0 capitalize">
              {lesson.status === 'taught' ? 'Taught' : 'Upcoming'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{lesson.subjectName || 'Subject'}</Badge>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(lesson.scheduledDate).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> {lesson.materialCount} materials
            </span>
            {lesson.hasHomework && (
              <span className="inline-flex items-center gap-1">
                <ClipboardList className="h-3 w-3" /> Homework
              </span>
            )}
            {lesson.hasQuiz && (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Quiz
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Lesson material card**

Create `FE: src/components/student/LessonMaterialCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, BookOpen, Sparkles, ClipboardList, Pencil,
  ExternalLink, GraduationCap, Library,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { StudentLessonMaterial } from '@/types';
import { LessonResourceReader } from './LessonResourceReader';
import { QuizPlayer } from '@/components/learning/QuizPlayer';

const KIND_ICON: Record<StudentLessonMaterial['kind'], typeof FileText> = {
  reading: BookOpen, study_notes: FileText, worked_example: GraduationCap,
  worksheet: Pencil, activity: Pencil,
  quiz: Sparkles, practice_questions: Sparkles,
  homework: ClipboardList, paper: ClipboardList,
};

const KIND_LABEL: Record<StudentLessonMaterial['kind'], string> = {
  reading: 'Reading', study_notes: 'Notes', worked_example: 'Worked example',
  worksheet: 'Worksheet', activity: 'Activity',
  quiz: 'Quiz', practice_questions: 'Practice',
  homework: 'Homework', paper: 'Test paper',
};

export function LessonMaterialCard({ material, lessonId }: { material: StudentLessonMaterial; lessonId: string }) {
  const [readerOpen, setReaderOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const Icon = KIND_ICON[material.kind] ?? FileText;
  const label = KIND_LABEL[material.kind] ?? material.kind;

  const isReadable = ['reading', 'study_notes', 'worked_example'].includes(material.kind);
  const isWorksheet = ['worksheet', 'activity'].includes(material.kind);
  const isQuiz = ['quiz', 'practice_questions'].includes(material.kind);

  return (
    <>
      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{label}</Badge>
              {material.phase && <span className="text-xs text-muted-foreground">{material.phase}</span>}
            </div>
            <h4 className="text-sm font-medium truncate">{material.title}</h4>
            {material.teacherNotes && (
              <p className="text-xs text-muted-foreground line-clamp-2">{material.teacherNotes}</p>
            )}
            {material.textbookRef && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Library className="h-3 w-3" />
                {material.textbookRef.title} · pages {material.textbookRef.pageStart}–{material.textbookRef.pageEnd}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {isReadable && material.contentResource && (
                <Button size="sm" onClick={() => setReaderOpen(true)}>Open</Button>
              )}
              {isWorksheet && material.contentResource?.url && (
                <a href={material.contentResource.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Download
                  </Button>
                </a>
              )}
              {isQuiz && material.quiz && (
                <Button size="sm" onClick={() => setPlayerOpen(true)}>
                  {material.kind === 'practice_questions' ? 'Practice' : 'Start quiz'}
                </Button>
              )}
              {material.kind === 'homework' && material.homework && (
                <Link href={`/student/homework/${material.homework.id}?from=lesson:${lessonId}`}>
                  <Button size="sm" variant="outline">Open homework</Button>
                </Link>
              )}
              {material.kind === 'paper' && material.paper && (
                <Link href={`/student/tests/${material.paper.paperId}?from=lesson:${lessonId}`}>
                  <Button size="sm" variant="outline">Open test</Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <LessonResourceReader open={readerOpen} onOpenChange={setReaderOpen} material={material} />
      {isQuiz && material.quiz && (
        <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
          <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="truncate">{material.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-2">
              <QuizPlayer
                quizId={material.quiz.id}
                mode={material.kind === 'practice_questions' ? 'practice' : 'scored'}
                onComplete={() => setPlayerOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
```

- [ ] **Step 3: AI Tutor CTA**

Create `FE: src/components/student/AskAITutorCTA.tsx`:

```tsx
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AskAITutorCTA({ subjectId, context }: { subjectId?: string; context?: string }) {
  const params = new URLSearchParams();
  if (subjectId) params.set('subjectId', subjectId);
  if (context) params.set('context', context);
  const qs = params.toString();
  return (
    <Link href={`/student/ai-tutor${qs ? `?${qs}` : ''}`}>
      <Button variant="outline" className="inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4" /> Ask the AI Tutor about this lesson
      </Button>
    </Link>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/student/LessonCard.tsx src/components/student/LessonMaterialCard.tsx src/components/student/AskAITutorCTA.tsx
git commit -m "$(cat <<'EOF'
feat(student): lesson card + material card + AI tutor CTA components

LessonMaterialCard routes per-kind: reader modal for readings,
QuizPlayer for quizzes, links out to homework + tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task G4: Lessons list page

**Files:**
- Create: `FE: src/app/(dashboard)/student/lessons/page.tsx`

- [ ] **Step 1: Implement the page**

Create `FE: src/app/(dashboard)/student/lessons/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { LessonCard } from '@/components/student/LessonCard';
import { useStudentLessons } from '@/hooks/useStudentLessons';
import { useSubjects } from '@/hooks/useAcademics';
import type { StudentLessonListFilters } from '@/types';

export default function StudentLessonsPage() {
  const [filters, setFilters] = useState<StudentLessonListFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const { lessons, loading, refresh } = useStudentLessons(filters);
  const { subjects } = useSubjects();

  useEffect(() => { void refresh(filters); }, [filters, refresh]);

  return (
    <div className="space-y-6">
      <PageHeader title="Lessons" description="Study materials, quizzes, and activities your teacher has shared with you." />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search lessons..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setFilters((f) => ({ ...f, search: searchInput || undefined })); }}
            className="pl-9 w-full"
          />
        </div>
        <Select
          value={filters.subjectId ?? 'all'}
          onValueChange={(v: unknown) => setFilters((f) => ({ ...f, subjectId: v === 'all' ? undefined : (v as string) }))}
        >
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All subjects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v: unknown) => setFilters((f) => ({ ...f, status: v as StudentLessonListFilters['status'] }))}
        >
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="taught">Taught</SelectItem>
            <SelectItem value="planned">Upcoming</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <LoadingSpinner /> : lessons.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No lessons yet"
          description="Your teacher hasn't shared any lessons with you yet."
        />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => <LessonCard key={l.id} lesson={l} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

Navigate to `/student/lessons` as a logged-in student whose class has at least one `ready`/`taught` lesson. Expected: cards render, filters work, empty state shows when filters yield nothing.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/lessons/page.tsx
git commit -m "$(cat <<'EOF'
feat(student): lessons list page replacing /learn + /materials + /courses

Subject + status filters, search, taught-first sort.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task G5: Lessons detail page

**Files:**
- Create: `FE: src/app/(dashboard)/student/lessons/[id]/page.tsx`

- [ ] **Step 1: Implement the page**

Create `FE: src/app/(dashboard)/student/lessons/[id]/page.tsx`:

```tsx
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LessonMaterialCard } from '@/components/student/LessonMaterialCard';
import { AskAITutorCTA } from '@/components/student/AskAITutorCTA';
import { useStudentLesson } from '@/hooks/useStudentLesson';

export default function StudentLessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { lesson, loading } = useStudentLesson(id);

  if (loading) return <LoadingSpinner />;
  if (!lesson) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/student/lessons')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to lessons
        </Button>
        <p className="text-muted-foreground">Lesson not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => router.push('/student/lessons')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to lessons
      </Button>

      <PageHeader title={lesson.title} description={lesson.subjectName}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={lesson.status === 'taught' ? 'default' : 'secondary'} className="capitalize">
            {lesson.status === 'taught' ? 'Taught' : 'Upcoming'}
          </Badge>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {new Date(lesson.scheduledDate).toLocaleDateString()}
          </span>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {lesson.durationMinutes} min
          </span>
        </div>
      </PageHeader>

      {lesson.objectives.length > 0 && (
        <section className="rounded-lg border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold mb-2">Learning objectives</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {lesson.objectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Materials</h3>
        {lesson.materials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No materials attached yet.</p>
        ) : (
          <div className="space-y-3">
            {lesson.materials.map((m) => (
              <LessonMaterialCard key={m.id} material={m} lessonId={lesson.id} />
            ))}
          </div>
        )}
      </section>

      <div className="pt-2">
        <AskAITutorCTA subjectId={lesson.subjectId} context={lesson.title} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

Open a lesson card from the list. Verify: header renders, objectives section appears if present, material cards render with correct CTAs per kind, AI Tutor CTA deep-links with `subjectId` and `context` query params populated.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/lessons/[id]/page.tsx
git commit -m "$(cat <<'EOF'
feat(student): lesson detail page with kind-aware material cards

Header, objectives, materials (reader/quiz/links per kind), AI
Tutor CTA deep-linked with subject + lesson context.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase H — Dashboard rewrite

### Task H1: Dashboard page rewrite

**Files:**
- Modify (full rewrite): `FE: src/app/(dashboard)/student/page.tsx`

- [ ] **Step 1: Rewrite the dashboard**

Replace the entire contents of `FE: src/app/(dashboard)/student/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { BookOpen, ClipboardList, FileText, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatCard } from '@/components/shared/StatCard';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';

export default function StudentDashboard() {
  const { dashboard, loading } = useStudentDashboard();
  const { student } = useCurrentStudent();
  if (loading || !dashboard) return <LoadingSpinner />;

  const firstName = student?.user?.firstName ?? student?.firstName ?? 'Student';

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${firstName}!`} description={new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Most recent lesson</CardTitle></CardHeader>
          <CardContent>
            {dashboard.recentLesson ? (
              <Link href={`/student/lessons/${dashboard.recentLesson.id}`} className="block space-y-1 group">
                <p className="font-medium truncate group-hover:text-primary">{dashboard.recentLesson.title}</p>
                <p className="text-xs text-muted-foreground">{dashboard.recentLesson.subject}</p>
                <p className="text-xs text-muted-foreground">{new Date(dashboard.recentLesson.scheduledDate).toLocaleDateString()}</p>
              </Link>
            ) : <p className="text-sm text-muted-foreground">No lessons yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Next homework</CardTitle></CardHeader>
          <CardContent>
            {dashboard.nextHomework ? (
              <Link href={`/student/homework/${dashboard.nextHomework.id}`} className="block space-y-1 group">
                <p className="font-medium truncate group-hover:text-primary">{dashboard.nextHomework.title}</p>
                <p className="text-xs text-muted-foreground">{dashboard.nextHomework.subject}</p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Due {new Date(dashboard.nextHomework.dueAt).toLocaleDateString()}
                </p>
              </Link>
            ) : <p className="text-sm text-muted-foreground">All caught up.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Next test</CardTitle></CardHeader>
          <CardContent>
            {dashboard.nextTest ? (
              <Link href={`/student/tests/${dashboard.nextTest.paperId}`} className="block space-y-1 group">
                <p className="font-medium truncate group-hover:text-primary">{dashboard.nextTest.title}</p>
                <p className="text-xs text-muted-foreground">{dashboard.nextTest.subject}</p>
                {dashboard.nextTest.dueAt && (
                  <p className="text-xs text-muted-foreground">Due {new Date(dashboard.nextTest.dueAt).toLocaleDateString()}</p>
                )}
              </Link>
            ) : <p className="text-sm text-muted-foreground">No tests scheduled.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <StatCard title="Lessons this week" value={String(dashboard.counts.lessonsThisWeek)} icon={BookOpen} />
        <StatCard title="Homework due" value={String(dashboard.counts.homeworkDueThisWeek)} icon={ClipboardList} />
        <StatCard title="Tests scheduled" value={String(dashboard.counts.testsScheduled)} icon={FileText} />
        <StatCard
          title="Overdue"
          value={String(dashboard.counts.homeworkOverdue)}
          icon={AlertTriangle}
          valueClassName={dashboard.counts.homeworkOverdue > 0 ? 'text-destructive' : undefined}
        />
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-center justify-between p-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Need help with something?</p>
              <p className="text-xs text-muted-foreground">Your AI Tutor can explain any topic.</p>
            </div>
          </div>
          <Link href="/student/ai-tutor">
            <button className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Open AI Tutor
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
```

If `StatCard` doesn't accept `valueClassName`, drop that prop and wrap manually.

- [ ] **Step 2: Manual smoke**

Navigate to `/student`. Verify: 3 "Up next" cards render with data or empty states, counts row shows correct numbers, AI tutor CTA renders. With overdue homework, the count tile is red.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/page.tsx
git commit -m "$(cat <<'EOF'
feat(student): dashboard rewrite — single endpoint + lesson-centric UI

Three 'Up next' cards (lesson/homework/test), counts row, AI tutor
CTA. Drops module-gated panels (wallet/house/timetable) for Phase 1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase I — Homework rewrite

### Task I1: Consolidated homework hook + section component

**Files:**
- Create: `FE: src/hooks/useStudentHomework.ts`
- Create: `FE: src/components/student/HomeworkSection.tsx`

- [ ] **Step 1: Create the consolidated hook**

Create `FE: src/hooks/useStudentHomework.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';

// Adapt fields to actual backend Homework DTO — verify by reading
// src/types/homework.ts (if exists) or the backend response shape.
export interface StudentHomeworkItem {
  id: string;
  title: string;
  subject: string;
  subjectId?: string;
  type: 'quiz' | 'reading' | 'exercise';
  dueAt: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  mark?: number;
  totalMarks?: number;
  sourceLesson?: { id: string; title: string } | null;
}

export interface StudentHomeworkDetail extends StudentHomeworkItem {
  description?: string;
  resourceUrl?: string;
  quizId?: string;
}

export function useStudentHomeworkList() {
  const [items, setItems] = useState<StudentHomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/homework');
      setItems(unwrapList<StudentHomeworkItem>(response));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const grouped = useMemo(() => {
    const now = Date.now();
    return {
      overdue: items.filter((i) => i.status === 'pending' && new Date(i.dueAt).getTime() < now),
      dueThisWeek: items.filter((i) => {
        if (i.status !== 'pending') return false;
        const d = new Date(i.dueAt).getTime();
        return d >= now && d - now < 7 * 24 * 60 * 60 * 1000;
      }),
      submitted: items.filter((i) => i.status === 'submitted'),
      graded: items.filter((i) => i.status === 'graded'),
    };
  }, [items]);

  return { items, grouped, loading, refresh };
}

export function useStudentHomeworkDetail(id: string) {
  const [homework, setHomework] = useState<StudentHomeworkDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await apiClient.get(`/homework/${id}`);
        if (!cancelled) setHomework(unwrapResponse<StudentHomeworkDetail>(response));
      } catch {
        if (!cancelled) setHomework(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  return { homework, loading };
}
```

Verify backend endpoint shape — `GET /api/homework` may need a query param (e.g. `?studentId=` or rely on JWT). Adapt.

- [ ] **Step 2: Create the section component**

Create `FE: src/components/student/HomeworkSection.tsx`:

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StudentHomeworkItem } from '@/hooks/useStudentHomework';

interface Props {
  title: string;
  items: StudentHomeworkItem[];
  defaultOpen?: boolean;
  variant?: 'default' | 'destructive';
  empty?: ReactNode;
}

export function HomeworkSection({ title, items, defaultOpen = true, variant = 'default', empty }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (items.length === 0 && !empty) return null;
  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold',
          variant === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-muted',
        ].join(' ')}
      >
        <span>{title} ({items.length})</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-2">
          {items.length === 0 ? empty : items.map((hw) => (
            <Link key={hw.id} href={`/student/homework/${hw.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{hw.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{hw.subject}</span>
                      {hw.sourceLesson && <span>From: {hw.sourceLesson.title}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Due {new Date(hw.dueAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge variant={hw.status === 'graded' ? 'default' : 'outline'} className="capitalize shrink-0">
                    {hw.status === 'graded' && hw.mark != null ? `${hw.mark}/${hw.totalMarks ?? '?'}` : hw.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useStudentHomework.ts src/components/student/HomeworkSection.tsx
git commit -m "$(cat <<'EOF'
feat(student): consolidated homework hook + collapsible section component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task I2: Homework list page rewrite

**Files:**
- Modify (full rewrite): `FE: src/app/(dashboard)/student/homework/page.tsx`

- [ ] **Step 1: Rewrite the list page**

Replace contents of `FE: src/app/(dashboard)/student/homework/page.tsx`:

```tsx
'use client';

import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { HomeworkSection } from '@/components/student/HomeworkSection';
import { useStudentHomeworkList } from '@/hooks/useStudentHomework';

export default function StudentHomeworkPage() {
  const { grouped, loading, items } = useStudentHomeworkList();

  if (loading) return <LoadingSpinner />;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Homework" description="Track and submit your assignments." />
        <EmptyState icon={ClipboardList} title="No homework" description="You don't have any homework right now." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Track and submit your assignments." />
      <HomeworkSection title="Overdue" items={grouped.overdue} variant="destructive" defaultOpen />
      <HomeworkSection title="Due this week" items={grouped.dueThisWeek} defaultOpen />
      <HomeworkSection title="Submitted" items={grouped.submitted} defaultOpen={false} />
      <HomeworkSection title="Graded" items={grouped.graded} defaultOpen={false} />
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke**

Navigate to `/student/homework`. Verify sections render with correct counts, "Overdue" is red, source-lesson backlink appears on cards (if the seeded homework was linked from a lesson).

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/homework/page.tsx
git commit -m "$(cat <<'EOF'
feat(student): homework list — sectioned IA with overdue/due/submitted/graded

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task I3: Homework detail page rewrite

**Files:**
- Modify (full rewrite): `FE: src/app/(dashboard)/student/homework/[id]/page.tsx`

- [ ] **Step 1: Rewrite the detail page**

Replace contents of `FE: src/app/(dashboard)/student/homework/[id]/page.tsx`:

```tsx
'use client';

import { use, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { QuizPlayer } from '@/components/learning/QuizPlayer';
import { LessonResourceReader } from '@/components/student/LessonResourceReader';
import { useStudentHomeworkDetail } from '@/hooks/useStudentHomework';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

export default function StudentHomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLessonId = searchParams.get('from')?.startsWith('lesson:') ? searchParams.get('from')?.slice(7) : null;
  const { homework, loading } = useStudentHomeworkDetail(id);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (!homework) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/student/homework')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to homework
        </Button>
        <p className="text-muted-foreground">Homework not found.</p>
      </div>
    );
  }

  const isFinal = homework.status !== 'pending';

  async function submit() {
    setSubmitting(true);
    try {
      // Adapt POST shape to existing backend submission endpoint
      await apiClient.post(`/homework/${id}/submit`, {
        answer: homework?.type === 'exercise' ? answer : undefined,
        markedAsRead: homework?.type === 'reading' ? true : undefined,
      });
      toast.success('Submitted');
      router.push('/student/homework');
    } catch {
      toast.error('Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const backHref = fromLessonId ? `/student/lessons/${fromLessonId}` : '/student/homework';
  const backLabel = fromLessonId ? 'Back to lesson' : 'Back to homework';

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> {backLabel}
      </Button>

      <PageHeader title={homework.title} description={homework.subject}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isFinal ? 'default' : 'outline'} className="capitalize">{homework.status}</Badge>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> Due {new Date(homework.dueAt).toLocaleDateString()}
          </span>
          {homework.sourceLesson && !fromLessonId && (
            <a href={`/student/lessons/${homework.sourceLesson.id}`} className="text-xs text-primary hover:underline">
              From: {homework.sourceLesson.title}
            </a>
          )}
        </div>
      </PageHeader>

      {homework.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{homework.description}</p>
      )}

      {homework.type === 'quiz' && homework.quizId && (
        <QuizPlayer quizId={homework.quizId} mode="scored" />
      )}

      {homework.type === 'reading' && (
        <div className="space-y-3">
          {homework.resourceUrl && (
            <Button onClick={() => setReaderOpen(true)}>Open reading</Button>
          )}
          {!isFinal && (
            <Button onClick={submit} disabled={submitting}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as read
            </Button>
          )}
        </div>
      )}

      {homework.type === 'exercise' && (
        <div className="space-y-3">
          {homework.resourceUrl && (
            <Button variant="outline" onClick={() => setReaderOpen(true)}>Open instructions</Button>
          )}
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            readOnly={isFinal}
            placeholder="Type your answer here..."
            rows={8}
          />
          {!isFinal && (
            <Button onClick={submit} disabled={submitting || answer.trim().length === 0}>
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </div>
      )}

      {homework.status === 'graded' && homework.mark != null && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-semibold">Marked: {homework.mark} / {homework.totalMarks ?? '?'}</p>
        </div>
      )}

      <LessonResourceReader
        open={readerOpen}
        onOpenChange={setReaderOpen}
        material={homework.resourceUrl ? {
          id, kind: 'reading', title: homework.title, phase: '',
          contentResource: { id, type: 'link', title: homework.title, url: homework.resourceUrl },
        } : null}
      />
    </div>
  );
}
```

Adapt the submit endpoint (`/homework/${id}/submit`) and body shape to the existing backend route. Verify via `Glob` for `homework.*submit` in backend.

- [ ] **Step 2: Manual smoke**

From `/student/homework`, open a pending quiz-type homework → QuizPlayer renders. Open a reading-type → reader modal opens and "Mark as read" submits. Open an exercise-type → textarea + submit button. Source-lesson backlink links to lesson page. If opened via `?from=lesson:...`, back-link returns to that lesson.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/homework/[id]/page.tsx
git commit -m "$(cat <<'EOF'
feat(student): homework detail — typed flows + lesson backlink

Quiz uses QuizPlayer, reading uses reader modal + Mark as read,
exercise uses textarea + submit. ?from=lesson:[id] back-routes
to the parent lesson.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase J — Rescued surfaces (light touch)

### Task J1: Tests page — wire-up + `?from=lesson:[id]` back-link

**Files:**
- Modify: `FE: src/app/(dashboard)/student/tests/[paperId]/page.tsx`

- [ ] **Step 1: Add query-param back-link support**

Open `FE: src/app/(dashboard)/student/tests/[paperId]/page.tsx`. Add at the top of the component body (after `const router = useRouter();`):

```ts
import { useSearchParams } from 'next/navigation';
// ... inside component
const searchParams = useSearchParams();
const fromLessonId = searchParams.get('from')?.startsWith('lesson:') ? searchParams.get('from')?.slice(7) : null;
const backHref = fromLessonId ? `/student/lessons/${fromLessonId}` : '/student/tests';
const backLabel = fromLessonId ? 'Back to lesson' : 'Back to tests';
```

Replace the two existing "Back to tests" buttons with:
```tsx
<Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
  <ArrowLeft className="mr-1 h-4 w-4" /> {backLabel}
</Button>
```

Also update the `handleSubmit`'s final navigation:
```ts
router.push(fromLessonId ? `/student/lessons/${fromLessonId}` : '/student/tests');
```

- [ ] **Step 2: Verify tests page hooks still work**

Manual smoke: navigate to `/student/tests` — expected: list of assigned papers renders. Open one — expected: take-test UI renders, autosave fires, submit works.

If hooks fail, fix the endpoint paths only (no rewrite). Likely candidates: `/api/student/assignments`, `/api/papers/assigned`.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/tests/[paperId]/page.tsx
git commit -m "$(cat <<'EOF'
feat(student): tests detail supports ?from=lesson:[id] back-link

Contextual breadcrumb when test opened from a lesson page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task J2: AI Tutor — query-param support

**Files:**
- Modify: `FE: src/app/(dashboard)/student/ai-tutor/page.tsx`

- [ ] **Step 1: Add query-param consumption**

Open `FE: src/app/(dashboard)/student/ai-tutor/page.tsx`. Add at the top of the component:

```ts
import { useSearchParams } from 'next/navigation';
// ... inside component
const searchParams = useSearchParams();
const initialSubjectId = searchParams.get('subjectId') ?? '';
const initialContext = searchParams.get('context');
```

Initialize subject state from `initialSubjectId` instead of `''`. After conversation starts (or after subject selection), if `initialContext` is set and no conversation has been started yet, prefill it as the first user message OR pin it as a system context note. Simplest: pre-fill the chat input box with `"Help me understand: [context]"`.

Find the existing `setSelectedSubjectId('')` initial state and change to:
```ts
const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
```

If `subjects` populates and `initialSubjectId` is present, also fetch the subject name to populate `selectedSubjectName`:
```ts
useEffect(() => {
  if (initialSubjectId && subjects.length > 0) {
    const s = subjects.find((sub) => sub.id === initialSubjectId);
    if (s) setSelectedSubjectName(s.name);
  }
}, [initialSubjectId, subjects]);
```

For `initialContext`, pass it as an optional prop to `<ChatInterface ... initialPrompt={initialContext ?? undefined} />` (add the prop to ChatInterface if missing; just sets the textarea value).

- [ ] **Step 2: Manual smoke**

From a lesson detail page click the "Ask AI Tutor about this lesson" CTA. Expected: AI Tutor opens with subject pre-selected and chat input pre-filled with the lesson title context.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/ai-tutor/page.tsx
git commit -m "$(cat <<'EOF'
feat(student): AI tutor accepts ?subjectId= and ?context= query params

Enables lesson-page deep-link to pre-fill subject + opening context.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase K — Profile

### Task K1: Profile page

**Files:**
- Create: `FE: src/app/(dashboard)/student/profile/page.tsx`

- [ ] **Step 1: Implement the page**

Create `FE: src/app/(dashboard)/student/profile/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';

export default function StudentProfilePage() {
  const { user, loading } = useAuthStore();
  const { student } = useCurrentStudent();

  if (loading || !user) return <LoadingSpinner />;

  const className = student?.class?.name ?? '—';
  const teacherName = student?.class?.teacher?.firstName
    ? `${student.class.teacher.firstName} ${student.class.teacher.lastName ?? ''}`.trim()
    : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Profile" description="Your account details." />

      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {user.firstName} {user.lastName}</div>
          <div><span className="text-muted-foreground">Email:</span> {user.email}</div>
          <div><span className="text-muted-foreground">Class:</span> {className}</div>
          {teacherName && <div><span className="text-muted-foreground">Teacher:</span> {teacherName}</div>}
          <div className="pt-2">
            <Link href="/auth/reset-password">
              <Button variant="outline" size="sm">Change password</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

Preferences card (email opt-in, theme) is deferred to Phase 2 — no backend endpoint exists for student-self preference updates yet, and shipping local-only state would be a half-finished feature. Add the card when the preference endpoint lands.

- [ ] **Step 2: Manual smoke**

Navigate to `/student/profile`. Verify name/email/class render. Change password button links out.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/student/profile/page.tsx
git commit -m "$(cat <<'EOF'
feat(student): minimal profile page (account + preferences)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase L — Cleanup

### Task L1: Delete obsolete pages, hooks, types

**Files:**
- Delete: `FE: src/app/(dashboard)/student/learn/` (entire subtree)
- Delete: `FE: src/app/(dashboard)/student/materials/`
- Delete: `FE: src/app/(dashboard)/student/courses/` (entire subtree)
- Delete: `FE: src/app/(dashboard)/student/quizzes/` (entire subtree)
- Delete: `FE: src/hooks/useStudentLearning.ts` (if present)
- Delete: `FE: src/hooks/useStudentMaterials.ts` (if present)
- Delete: `FE: src/hooks/useStudentQuizzes.ts` (if present)
- Delete: `FE: src/hooks/useStudentCourses.ts` (if present)
- Delete: `FE: src/hooks/useStudentHomeworkDashboard.ts`
- Modify: `FE: src/hooks/useLearningApi.ts`, `FE: src/stores/useLearningStore.ts` (prune student-only slices if any)
- Modify: `FE: src/types/index.ts` (remove dead exports)

- [ ] **Step 1: Delete the page folders**

```bash
rm -rf src/app/\(dashboard\)/student/learn
rm -rf src/app/\(dashboard\)/student/materials
rm -rf src/app/\(dashboard\)/student/courses
rm -rf src/app/\(dashboard\)/student/quizzes
```

- [ ] **Step 2: Delete the hooks**

For each file listed above that exists, delete it. Use the Bash tool's `rm -f` or just delete via filesystem.

Then run a grep to find dangling imports of any deleted symbol:
```
Grep: from '@/hooks/useStudentLearning' OR from '@/hooks/useStudentMaterials' OR from '@/hooks/useStudentQuizzes' OR from '@/hooks/useStudentCourses' OR from '@/hooks/useStudentHomeworkDashboard'
```
Any import found means another file references the deleted hook — open it and fix (likely the rewritten dashboard / lessons / homework pages no longer need them, so the import is stale).

- [ ] **Step 3: Prune store/api slices**

Open `FE: src/hooks/useLearningApi.ts` and `FE: src/stores/useLearningStore.ts`. Remove any functions or store keys used only by the deleted student pages (check by greping uses across `src/`). Leave teacher-side code untouched. If the entire file is now teacher-only, that's fine — just don't delete it.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If errors point to imports of removed types, prune the `src/types/index.ts` re-exports accordingly.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(student): delete fragmented /learn /materials /courses /quizzes

Replaced by /student/lessons hub. Also drops the backing hooks
and dashboard fan-out hook, all consolidated into useStudentLessons
+ useStudentDashboard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

# Phase M — End-to-end smoke verification

### Task M1: Full happy-path walkthrough

**Goal:** prove the whole Phase 1 student experience works against real teacher data, end to end. No commit at the end unless bug fixes were needed.

- [ ] **Step 1: Prepare data**

As a standalone teacher (or any teacher) account, in another browser tab:
1. Create a class.
2. Add a student to the class (using whatever invite flow exists today — this is the spec's flagged prerequisite).
3. Create a lesson assigned to that class with at least: 1 reading material, 1 quiz material, 1 homework material (linked to a real Homework doc), and the lesson's `status` set to `ready`.
4. Assign a test paper to the class.
5. Mark the lesson as `taught` for the assignment in question.

- [ ] **Step 2: Log in as the student**

Open a fresh browser session and log in with the student's credentials.

Expected nav (Phase 1, six items): Dashboard, Lessons, Homework, Tests, AI Tutor, Profile. No sports/library/wallet etc.

- [ ] **Step 3: Walk the dashboard**

Visit `/student`. Expected:
- "Welcome back, [FirstName]" hero.
- Most recent lesson card shows the lesson just taught — clicking goes to detail.
- Next homework card shows the lesson's homework — clicking goes to detail.
- Next test card shows the assigned paper — clicking goes to test take page.
- Counts row: lessons this week ≥ 1, homework due ≥ 1, tests scheduled ≥ 1, overdue = 0.
- AI Tutor CTA renders.

- [ ] **Step 4: Walk the lesson hub**

Visit `/student/lessons`. Filter by subject — list narrows. Open the lesson — detail shows objectives, materials grouped by phase badge. Open the reading material via "Open" — reader modal shows content. Open the quiz material via "Start quiz" — QuizPlayer fetches and renders. Click the homework material's "Open homework" — routes to `/student/homework/[id]?from=lesson:[lessonId]` and the back-link reads "Back to lesson". Click the AI Tutor CTA — `/student/ai-tutor` opens with subject + lesson context pre-filled.

- [ ] **Step 5: Walk the homework flow**

Visit `/student/homework`. Sections render. Open the pending homework via the list view → typed body renders. Submit. Expected: returns to `/student/homework`, item moves to "Submitted" section, status badge updates after grading.

- [ ] **Step 6: Walk the test flow**

Visit `/student/tests`. Open the assigned paper. Answer 1 question, wait 30s — verify "Saving…" badge appears (autosave). Submit. Expected: returns to `/student/tests` and status reads "Submitted".

- [ ] **Step 7: Verify multi-tenancy isolation**

Sign in as a student from a DIFFERENT school. Visit `/student/lessons`. Expected: ZERO lessons from the original school appear. Try navigating to the URL `/student/lessons/[id]` with the original lesson's id. Expected: "Lesson not found." (404 from backend, handled by the page's null-fallback).

- [ ] **Step 8: Confirm parked pages are unreachable from nav**

Verify the sidebar/bottom nav does NOT show: sports, library, wallet, tuck shop, careers, wellbeing, achievements, portfolio, classroom, timetable, grades.

Direct URL `/student/library` still works (page hasn't been deleted, just unlinked). That's intentional — confirms the "park" pattern.

- [ ] **Step 9: Final commit if any fixes were needed**

If the walkthrough surfaced bugs, fix them with focused commits per bug — don't bundle into one giant commit.

---

# Done

All Phase 1 surfaces shipped. Phase 2 work consists of:
1. Flipping module flags on real schools.
2. Auditing each parked page (timetable, grades, etc.) for the same separation-of-concerns / mobile / token compliance the rest of the portal now follows.
3. Adding the Phase 2 nav items to `PHASE_2_NAV` (already wired — they appear automatically when their module flag flips on).

## Self-review checklist (for the engineer)

Before opening a PR, confirm:
- [ ] Every backend `findOne` includes `schoolId` + `isDeleted: false`.
- [ ] Every backend aggregation `$match` on `schoolId` casts via `new mongoose.Types.ObjectId(...)`.
- [ ] No frontend `apiClient` import outside of `src/hooks/` or `src/stores/`.
- [ ] No `text-red-*` — use `text-destructive`.
- [ ] No `catch (err)` without `: unknown`.
- [ ] All grids have mobile breakpoints (`sm:grid-cols-2 lg:grid-cols-3` etc.).
- [ ] All fixed widths are responsive (`w-full sm:w-40`).
- [ ] All files < 350 lines.
- [ ] No `any` types — `grep -nE ': any|as any' src/` returns nothing in new code.
- [ ] `npm test` (backend) — all new tests pass.
- [ ] Full Phase M walkthrough completed against real teacher data.
