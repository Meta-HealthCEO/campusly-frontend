# Content Library Phase 2b — Student Interactive Views + Mastery Tracking

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build StudentAttempt/StudentMastery backend models, interactive block renderers for students, and student + parent learning views.

**Architecture:** New `StudentAttempt` and `StudentMastery` models in ContentLibrary module. Student-facing API endpoints for submitting attempts and viewing mastery. Frontend interactive block renderers that auto-grade and track progress. Student learning page to browse and interact with approved content. Parent read-only mastery view.

**Tech Stack:** Mongoose/MongoDB, Express, React 19 / Next.js, Tailwind CSS 4, shadcn components.

**Spec:** `docs/superpowers/specs/2026-04-03-curriculum-content-engine-design.md` — Layer 2 (StudentAttempt, StudentMastery, student/parent views)

---

## File Structure

### Backend — extend `campusly-backend/src/modules/ContentLibrary/`

| File | Responsibility |
|------|---------------|
| `model-tracking.ts` | StudentAttempt + StudentMastery Mongoose schemas |
| `service-attempts.ts` | Submit attempts, auto-grade, update mastery |
| `service-mastery.ts` | Mastery queries (student profile, class overview) |
| `controller-student.ts` | Student-facing HTTP handlers |
| `routes-student.ts` | Student routes (separate from teacher routes) |

### Frontend — `campusly-frontend/`

| File | Responsibility |
|------|---------------|
| `src/types/student-learning.ts` | Types for attempts, mastery, block interactions |
| `src/hooks/useStudentLearning.ts` | API calls for student content browsing + attempts |
| `src/components/content/renderers/TextBlock.tsx` | Markdown renderer with KaTeX |
| `src/components/content/renderers/QuizBlock.tsx` | MCQ/true-false/short-answer interactive |
| `src/components/content/renderers/FillBlankBlock.tsx` | Fill-in-the-blank interactive |
| `src/components/content/renderers/MatchColumnsBlock.tsx` | Column matching interactive |
| `src/components/content/renderers/OrderingBlock.tsx` | Sequence ordering interactive |
| `src/components/content/renderers/StepRevealBlock.tsx` | Step-by-step reveal |
| `src/components/content/renderers/BlockRenderer.tsx` | Routes block type → correct renderer |
| `src/components/content/MasteryProgressBar.tsx` | Mastery level visualization |
| `src/app/(dashboard)/student/learn/page.tsx` | Student topic browser |
| `src/app/(dashboard)/student/learn/[resourceId]/page.tsx` | Interactive lesson view |
| `src/app/(dashboard)/student/learn/progress/page.tsx` | Mastery dashboard |
| `src/app/(dashboard)/parent/learn/page.tsx` | Parent read-only mastery view |

---

## Task 1: Backend — StudentAttempt + StudentMastery Models

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/model-tracking.ts`

- [ ] **Step 1: Create the tracking models**

```typescript
// campusly-backend/src/modules/ContentLibrary/model-tracking.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── StudentAttempt ──────────────────────────────────────────────────────────

export interface IStudentAttempt extends Document {
  studentId: Types.ObjectId;
  contentResourceId: Types.ObjectId;
  blockId: string;
  curriculumNodeId: Types.ObjectId;
  cognitiveLevel: { caps: string; blooms: string } | null;
  correct: boolean;
  score: number;
  maxScore: number;
  timeSpentSeconds: number;
  hintsUsed: number;
  attemptNumber: number;
  response: string;
  schoolId: Types.ObjectId;
  createdAt: Date;
}

const studentAttemptSchema = new Schema<IStudentAttempt>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    contentResourceId: { type: Schema.Types.ObjectId, ref: 'ContentResource', required: true },
    blockId: { type: String, required: true },
    curriculumNodeId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', required: true },
    cognitiveLevel: {
      type: new Schema({ caps: String, blooms: String }, { _id: false }),
      default: null,
    },
    correct: { type: Boolean, required: true },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 0 },
    timeSpentSeconds: { type: Number, default: 0, min: 0 },
    hintsUsed: { type: Number, default: 0, min: 0 },
    attemptNumber: { type: Number, required: true, min: 1 },
    response: { type: String, default: '' },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

studentAttemptSchema.index({ studentId: 1, contentResourceId: 1, blockId: 1 });
studentAttemptSchema.index({ studentId: 1, curriculumNodeId: 1 });
studentAttemptSchema.index({ schoolId: 1, createdAt: -1 });

export const StudentAttempt = mongoose.model<IStudentAttempt>(
  'StudentAttempt',
  studentAttemptSchema,
);

// ─── StudentMastery ──────────────────────────────────────────────────────────

export interface ICognitiveBreakdown {
  knowledge: number;
  routine: number;
  complex: number;
  problemSolving: number;
}

export interface IStudentMastery extends Document {
  studentId: Types.ObjectId;
  curriculumNodeId: Types.ObjectId;
  schoolId: Types.ObjectId;
  masteryLevel: number;
  attemptCount: number;
  correctCount: number;
  lastAttemptAt: Date;
  cognitiveBreakdown: ICognitiveBreakdown;
  weakAreas: string[];
  updatedAt: Date;
}

const studentMasterySchema = new Schema<IStudentMastery>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    curriculumNodeId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    masteryLevel: { type: Number, default: 0, min: 0, max: 100 },
    attemptCount: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    cognitiveBreakdown: {
      type: new Schema<ICognitiveBreakdown>(
        {
          knowledge: { type: Number, default: 0, min: 0, max: 100 },
          routine: { type: Number, default: 0, min: 0, max: 100 },
          complex: { type: Number, default: 0, min: 0, max: 100 },
          problemSolving: { type: Number, default: 0, min: 0, max: 100 },
        },
        { _id: false },
      ),
      default: () => ({ knowledge: 0, routine: 0, complex: 0, problemSolving: 0 }),
    },
    weakAreas: { type: [String], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

studentMasterySchema.index({ studentId: 1, curriculumNodeId: 1 }, { unique: true });
studentMasterySchema.index({ schoolId: 1, curriculumNodeId: 1 });

export const StudentMastery = mongoose.model<IStudentMastery>(
  'StudentMastery',
  studentMasterySchema,
);
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/ContentLibrary/model-tracking.ts
git commit -m "feat(content-library): add StudentAttempt and StudentMastery models"
```

---

## Task 2: Backend — Attempt + Mastery Services

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/service-attempts.ts`
- Create: `campusly-backend/src/modules/ContentLibrary/service-mastery.ts`

- [ ] **Step 1: Create attempts service**

The service handles:
- `submitAttempt(studentId, schoolId, data)` — Creates attempt record, then calls mastery update
- Auto-grades by comparing response to block content (for quiz/fill_blank/match_columns/ordering)
- Calculates attempt number from previous attempts on same block
- After saving attempt, updates StudentMastery via upsert

Key auto-grading logic:
- Parse block content JSON to get correct answers
- Compare student response to correct answer
- For MCQ: check selected option matches isCorrect
- For fill_blank: check response matches blanks (case-insensitive, accept alternatives)
- For match_columns: check pairs match correctPairs
- For ordering: check order matches correctOrder
- For text/image/video/step_reveal: not graded (score = points = 0)

Mastery update: after each attempt, recalculate mastery level = (correctCount / attemptCount) * 100, update cognitive breakdown based on the attempt's cognitive level.

- [ ] **Step 2: Create mastery service**

The service handles:
- `getStudentMastery(studentId, schoolId, filters?)` — List mastery records for a student, optionally filtered by subject/grade
- `getClassMastery(schoolId, classId, filters?)` — Aggregate mastery across students in a class
- Populate curriculumNodeId for display

- [ ] **Step 3: Commit both services**

```bash
git add src/modules/ContentLibrary/service-attempts.ts src/modules/ContentLibrary/service-mastery.ts
git commit -m "feat(content-library): add attempt submission with auto-grading and mastery tracking"
```

---

## Task 3: Backend — Student Controller + Routes

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/controller-student.ts`
- Create: `campusly-backend/src/modules/ContentLibrary/routes-student.ts`
- Modify: `campusly-backend/src/app.ts`

- [ ] **Step 1: Create student controller**

Endpoints:
- `listApprovedResources(req, res)` — List approved resources visible to students (system + school)
- `getResource(req, res)` — Get single approved resource with blocks
- `submitAttempt(req, res)` — Submit attempt on a block
- `getMyMastery(req, res)` — Get current student's mastery records
- `getClassMastery(req, res)` — Get class mastery overview (for HOD/admin)

- [ ] **Step 2: Create student routes**

Base: `/api/content-library/student`
- GET `/resources` — list approved resources (student role)
- GET `/resources/:id` — get single resource (student role)
- POST `/resources/:id/attempt` — submit attempt (student role)
- GET `/mastery` — get my mastery (student role)
- GET `/mastery/class/:classId` — get class mastery (HOD/admin)

Add validation schemas for attempt submission and mastery queries.

- [ ] **Step 3: Register in app.ts**

```typescript
import contentLibraryStudentRoutes from './modules/ContentLibrary/routes-student.js';
app.use('/api/content-library/student', authenticate, contentLibraryStudentRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/ContentLibrary/controller-student.ts src/modules/ContentLibrary/routes-student.ts src/app.ts
git commit -m "feat(content-library): add student-facing routes for content, attempts, and mastery"
```

---

## Task 4: Frontend — Types + Hook

**Files:**
- Create: `campusly-frontend/src/types/student-learning.ts`
- Create: `campusly-frontend/src/hooks/useStudentLearning.ts`
- Modify: `campusly-frontend/src/types/index.ts`

- [ ] **Step 1: Create types**

```typescript
// Types for student learning interactions
export interface AttemptPayload {
  blockId: string;
  curriculumNodeId: string;
  response: string;
  timeSpentSeconds: number;
  hintsUsed: number;
}

export interface AttemptResult {
  id: string;
  correct: boolean;
  score: number;
  maxScore: number;
  attemptNumber: number;
  explanation: string;
}

export interface StudentMasteryItem {
  id: string;
  studentId: string;
  curriculumNodeId: string | { id: string; title: string; code: string; type: string };
  masteryLevel: number;
  attemptCount: number;
  correctCount: number;
  lastAttemptAt: string;
  cognitiveBreakdown: { knowledge: number; routine: number; complex: number; problemSolving: number };
  weakAreas: string[];
}

export interface BlockInteractionState {
  blockId: string;
  answered: boolean;
  correct: boolean | null;
  score: number;
  showExplanation: boolean;
  hintsRevealed: number;
}
```

- [ ] **Step 2: Create hook**

```typescript
// useStudentLearning hook
// Methods: fetchApprovedResources, getResource, submitAttempt, fetchMyMastery
// All calls to /content-library/student/*
```

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add src/types/student-learning.ts src/types/index.ts src/hooks/useStudentLearning.ts
git commit -m "feat(student-learning): add types and hook for student content interaction and mastery"
```

---

## Task 5: Frontend — Block Renderers

**Files:**
- Create: `campusly-frontend/src/components/content/renderers/TextBlock.tsx`
- Create: `campusly-frontend/src/components/content/renderers/QuizBlock.tsx`
- Create: `campusly-frontend/src/components/content/renderers/FillBlankBlock.tsx`
- Create: `campusly-frontend/src/components/content/renderers/MatchColumnsBlock.tsx`
- Create: `campusly-frontend/src/components/content/renderers/OrderingBlock.tsx`
- Create: `campusly-frontend/src/components/content/renderers/StepRevealBlock.tsx`
- Create: `campusly-frontend/src/components/content/renderers/BlockRenderer.tsx`

Each renderer:
- Accepts `block: ContentBlockItem`, `onAttempt: (blockId, response) => Promise<AttemptResult>`, `interaction: BlockInteractionState`
- Parses block.content (JSON for interactive, markdown for text)
- Shows interactive UI for student to answer
- On submit → calls onAttempt → shows result (correct/incorrect + explanation)
- Shows hints progressively

**BlockRenderer** routes block.type to the correct component. Unsupported types show a fallback "Content type not supported" message.

- [ ] **Step 1: Create all renderer files**
- [ ] **Step 2: Commit**

```bash
git add src/components/content/renderers/
git commit -m "feat(student-learning): add interactive block renderers (quiz, fill-blank, match, ordering, step-reveal)"
```

---

## Task 6: Frontend — MasteryProgressBar Component

**Files:**
- Create: `campusly-frontend/src/components/content/MasteryProgressBar.tsx`

Visual component showing mastery level with color coding:
- 0-39%: destructive (red)
- 40-69%: warning (amber)  
- 70-100%: success (green)
- Shows cognitive breakdown as mini bars if provided

- [ ] **Step 1: Create component**
- [ ] **Step 2: Commit**

```bash
git add src/components/content/MasteryProgressBar.tsx
git commit -m "feat(student-learning): add MasteryProgressBar visualization component"
```

---

## Task 7: Frontend — Student Learn Page (Topic Browser)

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/student/learn/page.tsx`

Page that shows:
1. Subject/grade filters (from academic API)
2. Grid of approved content resources as cards
3. Each card shows: title, type, difficulty stars, estimated time, curriculum node
4. Click navigates to `/student/learn/[resourceId]`

Uses `useStudentLearning().fetchApprovedResources()` for data.
Uses `useCurrentStudent()` for student context.

- [ ] **Step 1: Create page**
- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/student/learn/page.tsx"
git commit -m "feat(student-learning): add student topic browser page"
```

---

## Task 8: Frontend — Interactive Lesson View

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/student/learn/[resourceId]/page.tsx`

Page that:
1. Loads resource with blocks via `getResource(resourceId)`
2. Renders each block via `BlockRenderer`
3. Manages `BlockInteractionState` for each block
4. On attempt submission → calls API → updates state → shows result
5. Progress bar at top showing blocks completed / total
6. "Back to browse" link

- [ ] **Step 1: Create page**
- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/student/learn/[resourceId]/page.tsx"
git commit -m "feat(student-learning): add interactive lesson view with block rendering and attempt tracking"
```

---

## Task 9: Frontend — Student Mastery Dashboard

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/student/learn/progress/page.tsx`

Page showing:
1. Overall mastery summary (average across all nodes)
2. Grid of MasteryProgressBars per curriculum node
3. Cognitive breakdown chart (knowledge/routine/complex/problem-solving)
4. Weak areas highlighted

- [ ] **Step 1: Create page**
- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/student/learn/progress/page.tsx"
git commit -m "feat(student-learning): add student mastery dashboard"
```

---

## Task 10: Frontend — Parent Learning View

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/parent/learn/page.tsx`

Read-only view of child's mastery:
1. Uses parent → child resolution pattern (existing in codebase)
2. Shows same mastery data as student view
3. No interactive elements — just progress visualization

- [ ] **Step 1: Create page**
- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/parent/learn/page.tsx"
git commit -m "feat(student-learning): add parent read-only mastery view"
```

---

## Summary

| Task | What It Builds | Backend/Frontend |
|------|---------------|-----------------|
| 1 | StudentAttempt + StudentMastery models | Backend |
| 2 | Attempt + mastery services (auto-grading) | Backend |
| 3 | Student controller + routes + app registration | Backend |
| 4 | Frontend types + useStudentLearning hook | Frontend |
| 5 | 7 interactive block renderers | Frontend |
| 6 | MasteryProgressBar component | Frontend |
| 7 | Student topic browser page | Frontend |
| 8 | Interactive lesson view page | Frontend |
| 9 | Student mastery dashboard | Frontend |
| 10 | Parent read-only mastery view | Frontend |
