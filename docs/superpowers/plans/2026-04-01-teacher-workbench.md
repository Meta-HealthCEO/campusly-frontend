# Teacher Workbench (TeacherOS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone teacher automation module covering curriculum mapping, question banking, paper building with memos, moderation, unified marking, term planning, and holistic student views.

**Architecture:** New backend module `TeacherWorkbench` at `/api/teacher-workbench` (Express + Mongoose), new frontend pages under `/teacher/workbench/` (Next.js + React), 8 new hooks for API calls, component library under `src/components/workbench/`. All following existing codebase patterns exactly.

**Tech Stack:** Express, Mongoose, Zod v4 validation, React 19, Zustand, Axios, TanStack Table, React Hook Form + Zod, Tailwind CSS 4, Recharts, Sonner toasts, KaTeX (new dep for equation rendering).

**Spec:** `docs/superpowers/specs/2026-04-01-teacher-workbench-design.md`

---

## File Structure

### Backend — New Files (campusly-backend)

| File | Responsibility |
|------|---------------|
| `src/modules/TeacherWorkbench/model.ts` | All 7 Mongoose schemas: CurriculumFramework, CurriculumTopic, CurriculumCoverage, Question, PaperMemo, PaperModeration, AssessmentPlan |
| `src/modules/TeacherWorkbench/validation.ts` | All Zod schemas for request validation |
| `src/modules/TeacherWorkbench/routes.ts` | Express Router with all endpoints |
| `src/modules/TeacherWorkbench/controller.ts` | Static controller class — request/response handling |
| `src/modules/TeacherWorkbench/service.ts` | Business logic, DB queries, cross-module reads |

### Backend — Modified Files

| File | Change |
|------|--------|
| `src/app.ts:46,115` | Add route import + mount |
| `src/common/moduleConfig.ts:34` | Add `'teacher_workbench'` to BOLT_ON_MODULES |

### Frontend — New Files (campusly-frontend)

| File | Responsibility |
|------|---------------|
| `src/types/teacher-workbench.ts` | All TypeScript interfaces/types for the module |
| `src/hooks/useWorkbenchDashboard.ts` | Dashboard stats + recent activity |
| `src/hooks/useCurriculum.ts` | Frameworks, topics, coverage CRUD |
| `src/hooks/useQuestionBank.ts` | Question CRUD + search/filter |
| `src/hooks/usePaperMemo.ts` | Memo generation + editing |
| `src/hooks/usePaperModeration.ts` | Submit/review/approve workflow |
| `src/hooks/useMarkingHub.ts` | Aggregated pending marking items |
| `src/hooks/useTermPlanner.ts` | Assessment plans, clashes, weightings |
| `src/hooks/useStudent360.ts` | Aggregated student data |
| `src/components/workbench/curriculum/TopicTree.tsx` | Expandable topic tree |
| `src/components/workbench/curriculum/TopicNode.tsx` | Single topic node with status |
| `src/components/workbench/curriculum/CoverageBar.tsx` | Progress bar per term |
| `src/components/workbench/curriculum/CoveragePopover.tsx` | Status update popover |
| `src/components/workbench/question-bank/QuestionCard.tsx` | Question preview card |
| `src/components/workbench/question-bank/QuestionForm.tsx` | Create/edit question dialog |
| `src/components/workbench/question-bank/QuestionFilters.tsx` | Filter controls |
| `src/components/workbench/papers/PaperBuilderPanel.tsx` | Center panel — paper being built |
| `src/components/workbench/papers/QuestionBankBrowser.tsx` | Left panel — question browser |
| `src/components/workbench/papers/PaperConfigPanel.tsx` | Right panel — config + actions |
| `src/components/workbench/papers/MemoSection.tsx` | Memo section display |
| `src/components/workbench/papers/MemoAnswerEditor.tsx` | Inline answer editor |
| `src/components/workbench/papers/ModerationCard.tsx` | Paper moderation card |
| `src/components/workbench/papers/ModerationReviewForm.tsx` | HOD review form |
| `src/components/workbench/marking-hub/MarkingItemCard.tsx` | Marking item card |
| `src/components/workbench/marking-hub/MarkingFilters.tsx` | Filter controls |
| `src/components/workbench/planner/PlannerCalendar.tsx` | Monthly calendar |
| `src/components/workbench/planner/WeightingSidebar.tsx` | Weight progress bars |
| `src/components/workbench/planner/AssessmentBlock.tsx` | Calendar assessment block |
| `src/components/workbench/planner/AssessmentFormDialog.tsx` | Add/edit assessment dialog |
| `src/components/workbench/student-360/AcademicCard.tsx` | Academic performance card |
| `src/components/workbench/student-360/AttendanceCard.tsx` | Attendance summary card |
| `src/components/workbench/student-360/BehaviourCard.tsx` | Behaviour/merits card |
| `src/components/workbench/student-360/HomeworkCard.tsx` | Homework submission card |
| `src/components/workbench/student-360/CommunicationCard.tsx` | Parent comms card |
| `src/app/(dashboard)/teacher/workbench/page.tsx` | Workbench dashboard |
| `src/app/(dashboard)/teacher/workbench/curriculum/page.tsx` | Curriculum page |
| `src/app/(dashboard)/teacher/workbench/question-bank/page.tsx` | Question bank page |
| `src/app/(dashboard)/teacher/workbench/papers/builder/page.tsx` | Paper builder page |
| `src/app/(dashboard)/teacher/workbench/papers/[id]/memo/page.tsx` | Memo page |
| `src/app/(dashboard)/teacher/workbench/papers/moderation/page.tsx` | Moderation page |
| `src/app/(dashboard)/teacher/workbench/marking-hub/page.tsx` | Marking hub page |
| `src/app/(dashboard)/teacher/workbench/planner/page.tsx` | Term planner page |
| `src/app/(dashboard)/teacher/workbench/student-360/[id]/page.tsx` | Student 360 page |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `src/lib/constants.ts:98,203` | Add ROUTES entries + TEACHER_NAV workbench group |
| `src/types/index.ts:23` | Add `export * from './teacher-workbench'` |

---

## Phase 1: Backend Foundation

### Task 1: Backend Models

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\model.ts`

- [ ] **Step 1: Create the TeacherWorkbench model file with all 7 schemas**

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Enums ─────────────────────────────────────────────────────────────────
export type CognitiveLevel =
  | 'knowledge'
  | 'comprehension'
  | 'application'
  | 'analysis'
  | 'synthesis'
  | 'evaluation';

export type CoverageStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export type QuestionType =
  | 'mcq'
  | 'structured'
  | 'essay'
  | 'true_false'
  | 'matching'
  | 'short_answer'
  | 'fill_in_blank';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionSource = 'manual' | 'ai_generated' | 'imported';
export type MemoStatus = 'draft' | 'final';
export type ModerationStatus = 'pending' | 'approved' | 'changes_requested';
export type AssessmentType = 'test' | 'exam' | 'assignment' | 'practical' | 'project';
export type PlanStatus = 'planned' | 'created' | 'completed';

// ─── CurriculumFramework ───────────────────────────────────────────────────
export interface ICurriculumFramework extends Document {
  schoolId: Types.ObjectId;
  name: string;
  description: string;
  isDefault: boolean;
  createdBy: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const curriculumFrameworkSchema = new Schema<ICurriculumFramework>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

curriculumFrameworkSchema.index({ schoolId: 1, isDeleted: 1 });

export const CurriculumFramework = mongoose.model<ICurriculumFramework>(
  'CurriculumFramework',
  curriculumFrameworkSchema,
);

// ─── CurriculumTopic ───────────────────────────────────────────────────────
export interface ICurriculumTopic extends Document {
  schoolId: Types.ObjectId;
  frameworkId: Types.ObjectId;
  subjectId: Types.ObjectId;
  gradeLevel: number;
  parentTopicId: Types.ObjectId | null;
  name: string;
  description: string;
  term: number;
  orderIndex: number;
  cognitiveLevel: CognitiveLevel;
  estimatedPeriods: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const curriculumTopicSchema = new Schema<ICurriculumTopic>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    frameworkId: { type: Schema.Types.ObjectId, ref: 'CurriculumFramework', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    gradeLevel: { type: Number, required: true, min: 1, max: 12 },
    parentTopicId: { type: Schema.Types.ObjectId, ref: 'CurriculumTopic', default: null },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    term: { type: Number, required: true, min: 1, max: 4 },
    orderIndex: { type: Number, default: 0 },
    cognitiveLevel: {
      type: String,
      enum: ['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation'],
      default: 'knowledge',
    },
    estimatedPeriods: { type: Number, default: 1, min: 1 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

curriculumTopicSchema.index({ schoolId: 1, frameworkId: 1, subjectId: 1, gradeLevel: 1 });
curriculumTopicSchema.index({ parentTopicId: 1 });

export const CurriculumTopic = mongoose.model<ICurriculumTopic>(
  'CurriculumTopic',
  curriculumTopicSchema,
);

// ─── CurriculumCoverage ────────────────────────────────────────────────────
export interface ICurriculumCoverage extends Document {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  topicId: Types.ObjectId;
  classId: Types.ObjectId;
  status: CoverageStatus;
  dateCovered: Date | null;
  notes: string;
  linkedLessonPlanId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const curriculumCoverageSchema = new Schema<ICurriculumCoverage>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'CurriculumTopic', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started',
    },
    dateCovered: { type: Date, default: null },
    notes: { type: String, default: '' },
    linkedLessonPlanId: { type: Schema.Types.ObjectId, ref: 'LessonPlan', default: null },
  },
  { timestamps: true },
);

curriculumCoverageSchema.index({ teacherId: 1, classId: 1, topicId: 1 }, { unique: true });
curriculumCoverageSchema.index({ schoolId: 1, teacherId: 1 });

export const CurriculumCoverage = mongoose.model<ICurriculumCoverage>(
  'CurriculumCoverage',
  curriculumCoverageSchema,
);

// ─── Question ──────────────────────────────────────────────────────────────
export interface IMCQOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface IQuestion extends Document {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  frameworkId: Types.ObjectId;
  subjectId: Types.ObjectId;
  gradeLevel: number;
  topicId: Types.ObjectId | null;
  questionText: string;
  questionType: QuestionType;
  marks: number;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  modelAnswer: string;
  markingNotes: string;
  images: string[];
  options: IMCQOption[];
  tags: string[];
  source: QuestionSource;
  usageCount: number;
  lastUsedDate: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mcqOptionSchema = new Schema<IMCQOption>(
  {
    label: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false },
);

const questionSchema = new Schema<IQuestion>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    frameworkId: { type: Schema.Types.ObjectId, ref: 'CurriculumFramework', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    gradeLevel: { type: Number, required: true, min: 1, max: 12 },
    topicId: { type: Schema.Types.ObjectId, ref: 'CurriculumTopic', default: null },
    questionText: { type: String, required: true },
    questionType: {
      type: String,
      enum: ['mcq', 'structured', 'essay', 'true_false', 'matching', 'short_answer', 'fill_in_blank'],
      required: true,
    },
    marks: { type: Number, required: true, min: 1 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    cognitiveLevel: {
      type: String,
      enum: ['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation'],
      required: true,
    },
    modelAnswer: { type: String, default: '' },
    markingNotes: { type: String, default: '' },
    images: [{ type: String }],
    options: [mcqOptionSchema],
    tags: [{ type: String }],
    source: { type: String, enum: ['manual', 'ai_generated', 'imported'], default: 'manual' },
    usageCount: { type: Number, default: 0 },
    lastUsedDate: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

questionSchema.index({ schoolId: 1, subjectId: 1, gradeLevel: 1 });
questionSchema.index({ schoolId: 1, teacherId: 1 });
questionSchema.index({ schoolId: 1, topicId: 1 });
questionSchema.index({ tags: 1 });

export const Question = mongoose.model<IQuestion>('Question', questionSchema);

// ─── PaperMemo ─────────────────────────────────────────────────────────────
export interface IMarkCriterion {
  criterion: string;
  marks: number;
}

export interface IMemoAnswer {
  questionNumber: number;
  expectedAnswer: string;
  markAllocation: IMarkCriterion[];
  commonMistakes: string[];
  acceptableAlternatives: string[];
}

export interface IMemoSection {
  sectionTitle: string;
  answers: IMemoAnswer[];
}

export interface IPaperMemo extends Document {
  paperId: Types.ObjectId;
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  sections: IMemoSection[];
  totalMarks: number;
  status: MemoStatus;
  createdAt: Date;
  updatedAt: Date;
}

const markCriterionSchema = new Schema<IMarkCriterion>(
  {
    criterion: { type: String, required: true },
    marks: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const memoAnswerSchema = new Schema<IMemoAnswer>(
  {
    questionNumber: { type: Number, required: true },
    expectedAnswer: { type: String, required: true },
    markAllocation: [markCriterionSchema],
    commonMistakes: [{ type: String }],
    acceptableAlternatives: [{ type: String }],
  },
  { _id: false },
);

const memoSectionSchema = new Schema<IMemoSection>(
  {
    sectionTitle: { type: String, required: true },
    answers: [memoAnswerSchema],
  },
  { _id: false },
);

const paperMemoSchema = new Schema<IPaperMemo>(
  {
    paperId: { type: Schema.Types.ObjectId, ref: 'GeneratedPaper', required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sections: [memoSectionSchema],
    totalMarks: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'final'], default: 'draft' },
  },
  { timestamps: true },
);

paperMemoSchema.index({ paperId: 1 }, { unique: true });
paperMemoSchema.index({ schoolId: 1, teacherId: 1 });

export const PaperMemo = mongoose.model<IPaperMemo>('PaperMemo', paperMemoSchema);

// ─── PaperModeration ───────────────────────────────────────────────────────
export interface IModerationEntry {
  status: ModerationStatus;
  comment: string;
  moderatorId: Types.ObjectId;
  date: Date;
}

export interface IPaperModeration extends Document {
  paperId: Types.ObjectId;
  schoolId: Types.ObjectId;
  submittedBy: Types.ObjectId;
  submittedAt: Date;
  moderatorId: Types.ObjectId | null;
  moderatedAt: Date | null;
  status: ModerationStatus;
  comments: string;
  moderationHistory: IModerationEntry[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const moderationEntrySchema = new Schema<IModerationEntry>(
  {
    status: { type: String, enum: ['pending', 'approved', 'changes_requested'], required: true },
    comment: { type: String, default: '' },
    moderatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
  },
  { _id: false },
);

const paperModerationSchema = new Schema<IPaperModeration>(
  {
    paperId: { type: Schema.Types.ObjectId, ref: 'GeneratedPaper', required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt: { type: Date, required: true },
    moderatorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'changes_requested'],
      default: 'pending',
    },
    comments: { type: String, default: '' },
    moderationHistory: [moderationEntrySchema],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

paperModerationSchema.index({ schoolId: 1, status: 1 });
paperModerationSchema.index({ paperId: 1 }, { unique: true });
paperModerationSchema.index({ moderatorId: 1, status: 1 });

export const PaperModeration = mongoose.model<IPaperModeration>(
  'PaperModeration',
  paperModerationSchema,
);

// ─── AssessmentPlan ────────────────────────────────────────────────────────
export interface IPlannedAssessment {
  title: string;
  type: AssessmentType;
  plannedDate: Date;
  marks: number;
  weight: number;
  topicIds: Types.ObjectId[];
  assessmentId: Types.ObjectId | null;
  status: PlanStatus;
}

export interface IAssessmentPlan extends Document {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classId: Types.ObjectId;
  term: number;
  year: number;
  plannedAssessments: IPlannedAssessment[];
  createdAt: Date;
  updatedAt: Date;
}

const plannedAssessmentSchema = new Schema<IPlannedAssessment>(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['test', 'exam', 'assignment', 'practical', 'project'],
      required: true,
    },
    plannedDate: { type: Date, required: true },
    marks: { type: Number, required: true, min: 1 },
    weight: { type: Number, required: true, min: 0, max: 100 },
    topicIds: [{ type: Schema.Types.ObjectId, ref: 'CurriculumTopic' }],
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', default: null },
    status: { type: String, enum: ['planned', 'created', 'completed'], default: 'planned' },
  },
  { _id: false },
);

const assessmentPlanSchema = new Schema<IAssessmentPlan>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    term: { type: Number, required: true, min: 1, max: 4 },
    year: { type: Number, required: true },
    plannedAssessments: [plannedAssessmentSchema],
  },
  { timestamps: true },
);

assessmentPlanSchema.index({ schoolId: 1, classId: 1, term: 1, year: 1 });
assessmentPlanSchema.index({ teacherId: 1 });

export const AssessmentPlan = mongoose.model<IAssessmentPlan>(
  'AssessmentPlan',
  assessmentPlanSchema,
);
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/model.ts
git commit -m "feat(teacher-workbench): add all 7 Mongoose schemas for workbench module"
```

---

### Task 2: Backend Validation Schemas

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\validation.ts`

- [ ] **Step 1: Create Zod validation schemas for all endpoints**

```typescript
import { z } from 'zod/v4';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(objectIdRegex, 'Invalid ObjectId format');

const cognitiveLevels = ['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation'] as const;
const questionTypes = ['mcq', 'structured', 'essay', 'true_false', 'matching', 'short_answer', 'fill_in_blank'] as const;
const difficulties = ['easy', 'medium', 'hard'] as const;
const assessmentTypes = ['test', 'exam', 'assignment', 'practical', 'project'] as const;

// ─── Curriculum ────────────────────────────────────────────────────────────
export const createFrameworkSchema = z.object({
  schoolId: objectId,
  name: z.string().min(1, 'Name is required').max(100).trim(),
  description: z.string().max(500).default(''),
  isDefault: z.boolean().default(false),
}).strict();

export const createTopicSchema = z.object({
  schoolId: objectId,
  frameworkId: objectId,
  subjectId: objectId,
  gradeLevel: z.number().int().min(1).max(12),
  parentTopicId: objectId.nullable().default(null),
  name: z.string().min(1, 'Name is required').max(200).trim(),
  description: z.string().max(1000).default(''),
  term: z.number().int().min(1).max(4),
  orderIndex: z.number().int().min(0).default(0),
  cognitiveLevel: z.enum(cognitiveLevels).default('knowledge'),
  estimatedPeriods: z.number().int().min(1).default(1),
}).strict();

export const updateTopicSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  term: z.number().int().min(1).max(4).optional(),
  orderIndex: z.number().int().min(0).optional(),
  cognitiveLevel: z.enum(cognitiveLevels).optional(),
  estimatedPeriods: z.number().int().min(1).optional(),
  parentTopicId: objectId.nullable().optional(),
}).strict();

export const bulkImportTopicsSchema = z.object({
  schoolId: objectId,
  frameworkId: objectId,
  subjectId: objectId,
  gradeLevel: z.number().int().min(1).max(12),
  topics: z.array(z.object({
    parentTopicId: objectId.nullable().default(null),
    name: z.string().min(1).max(200).trim(),
    description: z.string().max(1000).default(''),
    term: z.number().int().min(1).max(4),
    orderIndex: z.number().int().min(0).default(0),
    cognitiveLevel: z.enum(cognitiveLevels).default('knowledge'),
    estimatedPeriods: z.number().int().min(1).default(1),
  })).min(1, 'At least one topic required').max(200),
}).strict();

export const updateCoverageSchema = z.object({
  classId: objectId,
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']),
  dateCovered: z.string().datetime().nullable().default(null),
  notes: z.string().max(500).default(''),
  linkedLessonPlanId: objectId.nullable().default(null),
}).strict();

// ─── Question Bank ─────────────────────────────────────────────────────────
const mcqOptionSchema = z.object({
  label: z.string().min(1).max(5),
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean(),
});

export const createQuestionSchema = z.object({
  schoolId: objectId,
  frameworkId: objectId,
  subjectId: objectId,
  gradeLevel: z.number().int().min(1).max(12),
  topicId: objectId.nullable().default(null),
  questionText: z.string().min(1, 'Question text is required').max(5000),
  questionType: z.enum(questionTypes),
  marks: z.number().int().min(1).max(100),
  difficulty: z.enum(difficulties),
  cognitiveLevel: z.enum(cognitiveLevels),
  modelAnswer: z.string().max(5000).default(''),
  markingNotes: z.string().max(2000).default(''),
  images: z.array(z.string().url()).max(10).default([]),
  options: z.array(mcqOptionSchema).max(10).default([]),
  tags: z.array(z.string().max(50)).max(20).default([]),
  source: z.enum(['manual', 'ai_generated', 'imported']).default('manual'),
}).strict();

export const updateQuestionSchema = z.object({
  topicId: objectId.nullable().optional(),
  questionText: z.string().min(1).max(5000).optional(),
  questionType: z.enum(questionTypes).optional(),
  marks: z.number().int().min(1).max(100).optional(),
  difficulty: z.enum(difficulties).optional(),
  cognitiveLevel: z.enum(cognitiveLevels).optional(),
  modelAnswer: z.string().max(5000).optional(),
  markingNotes: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(10).optional(),
  options: z.array(mcqOptionSchema).max(10).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}).strict();

// ─── Paper Memo ────────────────────────────────────────────────────────────
const markCriterionSchema = z.object({
  criterion: z.string().min(1).max(500),
  marks: z.number().min(0),
});

const memoAnswerSchema = z.object({
  questionNumber: z.number().int().min(1),
  expectedAnswer: z.string().min(1).max(5000),
  markAllocation: z.array(markCriterionSchema).min(1),
  commonMistakes: z.array(z.string().max(500)).max(10).default([]),
  acceptableAlternatives: z.array(z.string().max(1000)).max(10).default([]),
});

const memoSectionSchema = z.object({
  sectionTitle: z.string().min(1).max(200),
  answers: z.array(memoAnswerSchema).min(1),
});

export const updateMemoSchema = z.object({
  sections: z.array(memoSectionSchema).min(1).optional(),
  status: z.enum(['draft', 'final']).optional(),
}).strict();

// ─── Paper Moderation ──────────────────────────────────────────────────────
export const reviewPaperSchema = z.object({
  status: z.enum(['approved', 'changes_requested']),
  comments: z.string().max(2000).default(''),
}).strict();

// ─── Term Planner ──────────────────────────────────────────────────────────
const plannedAssessmentSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  type: z.enum(assessmentTypes),
  plannedDate: z.string().datetime(),
  marks: z.number().int().min(1).max(500),
  weight: z.number().min(0).max(100),
  topicIds: z.array(objectId).max(50).default([]),
  assessmentId: objectId.nullable().default(null),
  status: z.enum(['planned', 'created', 'completed']).default('planned'),
});

export const createPlanSchema = z.object({
  schoolId: objectId,
  subjectId: objectId,
  classId: objectId,
  term: z.number().int().min(1).max(4),
  year: z.number().int().min(2020).max(2050),
  plannedAssessments: z.array(plannedAssessmentSchema).max(30),
}).strict();

// ─── Inferred Types ────────────────────────────────────────────────────────
export type CreateFrameworkInput = z.infer<typeof createFrameworkSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export type BulkImportTopicsInput = z.infer<typeof bulkImportTopicsSchema>;
export type UpdateCoverageInput = z.infer<typeof updateCoverageSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type UpdateMemoInput = z.infer<typeof updateMemoSchema>;
export type ReviewPaperInput = z.infer<typeof reviewPaperSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/validation.ts
git commit -m "feat(teacher-workbench): add Zod validation schemas for all endpoints"
```

---

### Task 3: Backend Service Layer

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\service.ts`

This is the largest backend file. It contains all business logic for the module. It reads from other modules (Academic, Homework, Attendance, AITools, Communication) but only writes to TeacherWorkbench collections.

- [ ] **Step 1: Create the service file**

The service is a static class `TeacherWorkbenchService` with methods grouped by domain. Each method follows the existing pattern: accepts typed params, queries with `schoolId` filter, returns typed results. Uses `paginationHelper` from `common/utils` for paginated lists. Uses `NotFoundError` from `common/errors` for missing records.

The file will be structured in sections matching the spec endpoints:
1. Dashboard — `getDashboard(teacherId, schoolId)`
2. Curriculum frameworks — `listFrameworks`, `createFramework`
3. Curriculum topics — `listTopics`, `createTopic`, `updateTopic`, `deleteTopic`, `bulkImportTopics`
4. Curriculum coverage — `getCoverage`, `updateCoverage`, `getCoverageReport`
5. Questions — `listQuestions`, `createQuestion`, `getQuestion`, `updateQuestion`, `deleteQuestion`, `importFromPaper`
6. Memos — `generateMemo`, `getMemoByPaper`, `updateMemo`
7. Moderation — `submitForModeration`, `getModerationQueue`, `getModerationStatus`, `reviewPaper`
8. Marking hub — `getPendingMarking`
9. Term planner — `getPlan`, `createOrUpdatePlan`, `checkClashes`, `getWeightings`
10. Student 360 — `getStudent360`

**Because this file would exceed 350 lines, split it into focused service files:**

Create `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\curriculum.service.ts`
Create `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\question.service.ts`
Create `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\memo.service.ts`
Create `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\moderation.service.ts`
Create `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\planner.service.ts`
Create `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\aggregation.service.ts` (dashboard, marking hub, student 360)
Create `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\index.ts` (barrel export)

Each service file follows the same pattern as `AIToolsService`:
- Class with static async methods
- Accepts typed params (from validation.ts)
- Returns typed results (from model.ts)
- Filters by `schoolId` and `isDeleted: false`
- Uses `paginationHelper` for list endpoints
- Throws `NotFoundError` for missing records
- Uses `Promise.all` for parallel queries

The exact code for each service file will be provided in the implementation steps below. The agent implementing each task should write the file following the patterns established in Task 1 and Task 2, plus the existing `AIToolsService` at `c:\Users\shaun\campusly-backend\src\modules\AITools\service.ts`.

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/services/
git commit -m "feat(teacher-workbench): add service layer split into focused domain files"
```

---

### Task 4: Backend Controller

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controller.ts`

- [ ] **Step 1: Create the controller with static methods for all endpoints**

Follows the exact pattern from `AIToolsController` and `HomeworkController`:
- Static async methods
- Extract `getUser(req)` for authenticated user
- Extract query params with `as string` casting
- Call service methods
- Return with `apiResponse(true, data, 'message')`
- Use `res.status(201)` for creates, `res.json()` for reads/updates

Methods needed (matching spec endpoints):
- `getDashboard`
- `listFrameworks`, `createFramework`
- `listTopics`, `createTopic`, `updateTopic`, `deleteTopic`, `bulkImportTopics`
- `getCoverage`, `updateCoverage`, `getCoverageReport`
- `listQuestions`, `createQuestion`, `getQuestion`, `updateQuestion`, `deleteQuestion`, `importFromPaper`
- `generateMemo`, `getMemoByPaper`, `updateMemo`
- `submitForModeration`, `getModerationQueue`, `getModerationStatus`, `reviewPaper`
- `getPendingMarking`
- `getPlan`, `createOrUpdatePlan`, `checkClashes`, `getWeightings`
- `getStudent360`

Since this exceeds 350 lines, split into:
- `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\curriculum.controller.ts`
- `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\question.controller.ts`
- `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\memo.controller.ts`
- `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\moderation.controller.ts`
- `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\planner.controller.ts`
- `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\aggregation.controller.ts`
- `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\index.ts`

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/controllers/
git commit -m "feat(teacher-workbench): add controller layer split by domain"
```

---

### Task 5: Backend Routes

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\routes.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\app.ts` (lines 46, 115)
- Modify: `c:\Users\shaun\campusly-backend\src\common\moduleConfig.ts` (line 34)

- [ ] **Step 1: Create routes.ts**

All routes follow the middleware chain pattern: `authenticate` -> `authorize(roles)` -> `validate(schema)` -> `Controller.method`.

```typescript
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  CurriculumController,
  QuestionController,
  MemoController,
  ModerationController,
  PlannerController,
  AggregationController,
} from './controllers/index.js';
import {
  createFrameworkSchema,
  createTopicSchema,
  updateTopicSchema,
  bulkImportTopicsSchema,
  updateCoverageSchema,
  createQuestionSchema,
  updateQuestionSchema,
  updateMemoSchema,
  reviewPaperSchema,
  createPlanSchema,
} from './validation.js';

const router = Router();
const roles = ['teacher', 'school_admin', 'super_admin'] as const;
const teacherOnly = ['teacher', 'super_admin'] as const;

// ─── Dashboard ─────────────────────────────────────────────────────────────
router.get('/dashboard', authenticate, authorize(...roles), AggregationController.getDashboard);

// ─── Curriculum Frameworks ─────────────────────────────────────────────────
router.get('/curriculum/frameworks', authenticate, authorize(...roles), CurriculumController.listFrameworks);
router.post('/curriculum/frameworks', authenticate, authorize(...roles), validate(createFrameworkSchema), CurriculumController.createFramework);

// ─── Curriculum Topics ─────────────────────────────────────────────────────
router.get('/curriculum/topics', authenticate, authorize(...roles), CurriculumController.listTopics);
router.post('/curriculum/topics', authenticate, authorize(...roles), validate(createTopicSchema), CurriculumController.createTopic);
router.put('/curriculum/topics/:id', authenticate, authorize(...roles), validate(updateTopicSchema), CurriculumController.updateTopic);
router.delete('/curriculum/topics/:id', authenticate, authorize(...roles), CurriculumController.deleteTopic);
router.post('/curriculum/topics/bulk', authenticate, authorize(...roles), validate(bulkImportTopicsSchema), CurriculumController.bulkImportTopics);

// ─── Curriculum Coverage ───────────────────────────────────────────────────
router.get('/curriculum/coverage', authenticate, authorize(...roles), CurriculumController.getCoverage);
router.patch('/curriculum/coverage/:topicId', authenticate, authorize(...teacherOnly), validate(updateCoverageSchema), CurriculumController.updateCoverage);
router.get('/curriculum/coverage/report', authenticate, authorize(...roles), CurriculumController.getCoverageReport);

// ─── Question Bank ─────────────────────────────────────────────────────────
router.get('/questions', authenticate, authorize(...roles), QuestionController.listQuestions);
router.post('/questions', authenticate, authorize(...roles), validate(createQuestionSchema), QuestionController.createQuestion);
router.get('/questions/:id', authenticate, authorize(...roles), QuestionController.getQuestion);
router.put('/questions/:id', authenticate, authorize(...roles), validate(updateQuestionSchema), QuestionController.updateQuestion);
router.delete('/questions/:id', authenticate, authorize(...roles), QuestionController.deleteQuestion);
router.post('/questions/import-from-paper/:paperId', authenticate, authorize(...roles), QuestionController.importFromPaper);

// ─── Paper Memo ────────────────────────────────────────────────────────────
router.post('/memos/generate/:paperId', authenticate, authorize(...roles), MemoController.generateMemo);
router.get('/memos/paper/:paperId', authenticate, authorize(...roles), MemoController.getMemoByPaper);
router.put('/memos/:id', authenticate, authorize(...roles), validate(updateMemoSchema), MemoController.updateMemo);

// ─── Paper Moderation ──────────────────────────────────────────────────────
router.post('/moderation/submit/:paperId', authenticate, authorize(...teacherOnly), ModerationController.submitForModeration);
router.get('/moderation/queue', authenticate, authorize(...roles), ModerationController.getModerationQueue);
router.get('/moderation/:paperId', authenticate, authorize(...roles), ModerationController.getModerationStatus);
router.post('/moderation/:paperId/review', authenticate, authorize(...roles), validate(reviewPaperSchema), ModerationController.reviewPaper);

// ─── Marking Hub ───────────────────────────────────────────────────────────
router.get('/marking-hub/pending', authenticate, authorize(...teacherOnly), AggregationController.getPendingMarking);

// ─── Term Planner ──────────────────────────────────────────────────────────
router.get('/planner/:classId/:term/:year', authenticate, authorize(...roles), PlannerController.getPlan);
router.post('/planner', authenticate, authorize(...roles), validate(createPlanSchema), PlannerController.createOrUpdatePlan);
router.get('/planner/clashes/:classId/:date', authenticate, authorize(...roles), PlannerController.checkClashes);
router.get('/planner/weightings/:subjectId', authenticate, authorize(...roles), PlannerController.getWeightings);

// ─── Student 360 ───────────────────────────────────────────────────────────
router.get('/student-360/:studentId', authenticate, authorize(...roles), AggregationController.getStudent360);

export default router;
```

- [ ] **Step 2: Add route import and mount to app.ts**

In `c:\Users\shaun\campusly-backend\src\app.ts`:
- After line 46 (last import), add: `import teacherWorkbenchRoutes from './modules/TeacherWorkbench/routes.js';`
- After line 115 (last app.use for ai-tools), add: `app.use('/api/teacher-workbench', requireModule('teacher_workbench'), teacherWorkbenchRoutes);`

- [ ] **Step 3: Add teacher_workbench to BOLT_ON_MODULES**

In `c:\Users\shaun\campusly-backend\src\common\moduleConfig.ts`:
- After line 34 (`'ai_tools',`), add: `'teacher_workbench',`

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/routes.ts src/app.ts src/common/moduleConfig.ts
git commit -m "feat(teacher-workbench): add routes, mount module, register in bolt-on modules"
```

---

## Phase 2: Frontend Foundation

### Task 6: Frontend Types

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\types\teacher-workbench.ts`
- Modify: `c:\Users\shaun\campusly-frontend\src\types\index.ts` (line 23)

- [ ] **Step 1: Create the types file**

All TypeScript interfaces matching the backend models, plus frontend-specific types for UI state. Follows the same pattern as `src/types/academic.ts` — `export interface` for objects, `export type` for unions.

```typescript
// ============================================================
// Teacher Workbench Types
// ============================================================

// ─── Enums / Unions ────────────────────────────────────────────────────────
export type CognitiveLevel =
  | 'knowledge'
  | 'comprehension'
  | 'application'
  | 'analysis'
  | 'synthesis'
  | 'evaluation';

export type CoverageStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export type QuestionType =
  | 'mcq'
  | 'structured'
  | 'essay'
  | 'true_false'
  | 'matching'
  | 'short_answer'
  | 'fill_in_blank';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionSource = 'manual' | 'ai_generated' | 'imported';
export type MemoStatus = 'draft' | 'final';
export type ModerationStatus = 'pending' | 'approved' | 'changes_requested';
export type AssessmentPlanType = 'test' | 'exam' | 'assignment' | 'practical' | 'project';
export type PlanStatus = 'planned' | 'created' | 'completed';
export type MarkingItemType = 'homework' | 'assessment' | 'ai_grading';
export type MarkingPriority = 'high' | 'medium' | 'low';

// ─── Curriculum ────────────────────────────────────────────────────────────
export interface CurriculumFramework {
  id: string;
  _id?: string;
  schoolId: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumTopic {
  id: string;
  _id?: string;
  schoolId: string;
  frameworkId: string;
  subjectId: string;
  gradeLevel: number;
  parentTopicId: string | null;
  name: string;
  description: string;
  term: number;
  orderIndex: number;
  cognitiveLevel: CognitiveLevel;
  estimatedPeriods: number;
  children?: CurriculumTopic[];
}

export interface CurriculumCoverage {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string;
  topicId: string;
  classId: string;
  status: CoverageStatus;
  dateCovered: string | null;
  notes: string;
  linkedLessonPlanId: string | null;
}

export interface CoverageReport {
  term: number;
  totalTopics: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  skipped: number;
  percentage: number;
}

// ─── Question Bank ─────────────────────────────────────────────────────────
export interface MCQOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface BankQuestion {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string;
  frameworkId: string;
  subjectId: string;
  gradeLevel: number;
  topicId: string | null;
  questionText: string;
  questionType: QuestionType;
  marks: number;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  modelAnswer: string;
  markingNotes: string;
  images: string[];
  options: MCQOption[];
  tags: string[];
  source: QuestionSource;
  usageCount: number;
  lastUsedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionFilters {
  subjectId?: string;
  gradeLevel?: number;
  topicId?: string;
  difficulty?: Difficulty;
  cognitiveLevel?: CognitiveLevel;
  questionType?: QuestionType;
  source?: QuestionSource;
  tags?: string;
  search?: string;
}

// ─── Paper Memo ────────────────────────────────────────────────────────────
export interface MarkCriterion {
  criterion: string;
  marks: number;
}

export interface MemoAnswer {
  questionNumber: number;
  expectedAnswer: string;
  markAllocation: MarkCriterion[];
  commonMistakes: string[];
  acceptableAlternatives: string[];
}

export interface MemoSection {
  sectionTitle: string;
  answers: MemoAnswer[];
}

export interface PaperMemo {
  id: string;
  _id?: string;
  paperId: string;
  schoolId: string;
  teacherId: string;
  sections: MemoSection[];
  totalMarks: number;
  status: MemoStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Paper Moderation ──────────────────────────────────────────────────────
export interface ModerationEntry {
  status: ModerationStatus;
  comment: string;
  moderatorId: string;
  date: string;
}

export interface PaperModeration {
  id: string;
  _id?: string;
  paperId: string;
  schoolId: string;
  submittedBy: string;
  submittedAt: string;
  moderatorId: string | null;
  moderatedAt: string | null;
  status: ModerationStatus;
  comments: string;
  moderationHistory: ModerationEntry[];
}

// ─── Term Planner ──────────────────────────────────────────────────────────
export interface PlannedAssessment {
  title: string;
  type: AssessmentPlanType;
  plannedDate: string;
  marks: number;
  weight: number;
  topicIds: string[];
  assessmentId: string | null;
  status: PlanStatus;
}

export interface AssessmentPlan {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  term: number;
  year: number;
  plannedAssessments: PlannedAssessment[];
  createdAt: string;
  updatedAt: string;
}

export interface DateClash {
  date: string;
  assessments: { title: string; subjectName: string; type: AssessmentPlanType }[];
}

export interface WeightingInfo {
  subjectId: string;
  subjectName: string;
  requiredFormalWeight: number;
  actualFormalWeight: number;
  requiredInformalWeight: number;
  actualInformalWeight: number;
  totalWeight: number;
}

// ─── Marking Hub ───────────────────────────────────────────────────────────
export interface MarkingItem {
  id: string;
  type: MarkingItemType;
  title: string;
  subjectName: string;
  className: string;
  dueDate: string;
  totalMarks: number;
  pendingCount: number;
  totalCount: number;
  priority: MarkingPriority;
}

// ─── Student 360 ───────────────────────────────────────────────────────────
export interface Student360Academic {
  termAverage: number;
  trend: 'improving' | 'declining' | 'stable';
  subjects: { name: string; mark: number; grade: string; classAvg: number }[];
  markHistory: { date: string; mark: number }[];
}

export interface Student360Attendance {
  rate: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  pattern: string | null;
}

export interface Student360Behaviour {
  netMeritScore: number;
  recentIncidents: { date: string; type: string; severity: string; description: string }[];
  recentMerits: { date: string; type: string; category: string; points: number; reason: string }[];
}

export interface Student360Homework {
  submissionRate: number;
  averageMark: number;
  lateCount: number;
  missingCount: number;
}

export interface Student360Communication {
  lastContactDate: string | null;
  messageCountThisTerm: number;
}

export interface Student360Data {
  studentId: string;
  studentName: string;
  className: string;
  academic: Student360Academic;
  attendance: Student360Attendance;
  behaviour: Student360Behaviour;
  homework: Student360Homework;
  communication: Student360Communication;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────
export interface WorkbenchDashboardData {
  coveragePercentage: number;
  questionCount: number;
  pendingModeration: number;
  markingItemsDue: number;
  recentActivity: WorkbenchActivity[];
}

export interface WorkbenchActivity {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}
```

- [ ] **Step 2: Add re-export to barrel file**

In `c:\Users\shaun\campusly-frontend\src\types\index.ts`, after the last export line, add:
```typescript
export * from './teacher-workbench';
```

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/types/teacher-workbench.ts src/types/index.ts
git commit -m "feat(teacher-workbench): add frontend TypeScript types for all workbench domains"
```

---

### Task 7: Navigation & Routes

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\lib\constants.ts` (lines 98, 203)

- [ ] **Step 1: Add ROUTES entries**

In the ROUTES object (before the closing `}`), add:
```typescript
// Teacher Workbench
TEACHER_WORKBENCH: '/teacher/workbench',
TEACHER_WORKBENCH_CURRICULUM: '/teacher/workbench/curriculum',
TEACHER_WORKBENCH_QUESTION_BANK: '/teacher/workbench/question-bank',
TEACHER_WORKBENCH_PAPER_BUILDER: '/teacher/workbench/papers/builder',
TEACHER_WORKBENCH_MODERATION: '/teacher/workbench/papers/moderation',
TEACHER_WORKBENCH_MARKING_HUB: '/teacher/workbench/marking-hub',
TEACHER_WORKBENCH_PLANNER: '/teacher/workbench/planner',
```

- [ ] **Step 2: Add TEACHER_NAV workbench entry**

Add a new nav item to the TEACHER_NAV array (before the closing `]`). This requires importing additional icons from lucide-react at the top of the file: `Wrench, LayoutDashboard, Database, FileEdit, CheckCircle, ClipboardCheck, CalendarDays`.

```typescript
{
  label: 'Workbench',
  href: ROUTES.TEACHER_WORKBENCH,
  icon: Wrench,
  badge: 'NEW',
  module: 'teacher_workbench',
  children: [
    { label: 'Overview', href: ROUTES.TEACHER_WORKBENCH, icon: LayoutDashboard },
    { label: 'Curriculum', href: ROUTES.TEACHER_WORKBENCH_CURRICULUM, icon: BookOpen },
    { label: 'Question Bank', href: ROUTES.TEACHER_WORKBENCH_QUESTION_BANK, icon: Database },
    { label: 'Paper Builder', href: ROUTES.TEACHER_WORKBENCH_PAPER_BUILDER, icon: FileEdit },
    { label: 'Moderation', href: ROUTES.TEACHER_WORKBENCH_MODERATION, icon: CheckCircle },
    { label: 'Marking Hub', href: ROUTES.TEACHER_WORKBENCH_MARKING_HUB, icon: ClipboardCheck },
    { label: 'Planner', href: ROUTES.TEACHER_WORKBENCH_PLANNER, icon: CalendarDays },
  ],
},
```

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/lib/constants.ts
git commit -m "feat(teacher-workbench): add routes and navigation entries"
```

---

## Phase 3: Curriculum Engine (Backend Services + Frontend)

### Task 8: Curriculum Backend Services

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\curriculum.service.ts`

- [ ] **Step 1: Implement CurriculumService**

Static class with methods:
- `listFrameworks(schoolId)` — query CurriculumFramework where schoolId matches and isDeleted is false
- `createFramework(data, teacherId)` — create with createdBy set to teacherId. If isDefault is true, unset other defaults first
- `listTopics(schoolId, filters)` — query CurriculumTopic with optional frameworkId, subjectId, gradeLevel, term filters. Sort by term then orderIndex
- `createTopic(data)` — create CurriculumTopic
- `updateTopic(id, data)` — findOneAndUpdate with { _id: id, isDeleted: false }
- `deleteTopic(id)` — soft delete, also soft delete child topics (where parentTopicId = id)
- `bulkImportTopics(data)` — insertMany with schoolId, frameworkId, subjectId, gradeLevel from parent data
- `getCoverage(teacherId, classId, subjectId, schoolId)` — query CurriculumCoverage, join with CurriculumTopic to get topic names
- `updateCoverage(teacherId, topicId, data)` — upsert: findOneAndUpdate with upsert:true using teacherId + topicId + classId as unique key
- `getCoverageReport(teacherId, subjectId, classId, schoolId)` — aggregate: count topics per term, count coverage statuses, calculate percentage

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/services/curriculum.service.ts
git commit -m "feat(teacher-workbench): implement curriculum service layer"
```

---

### Task 9: Curriculum Controller

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\curriculum.controller.ts`

- [ ] **Step 1: Implement CurriculumController**

Static class matching routes. Each method:
1. Extracts user via `getUser(req)`
2. Extracts query/body params
3. Calls CurriculumService
4. Returns with `apiResponse()`

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/controllers/curriculum.controller.ts
git commit -m "feat(teacher-workbench): implement curriculum controller"
```

---

### Task 10: Curriculum Frontend Hook

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useCurriculum.ts`

- [ ] **Step 1: Implement useCurriculum hook**

Follows the exact pattern from `useTeacherLessonPlans`:
- Imports: `{ useState, useEffect, useCallback }` from react, `apiClient` from `@/lib/api-client`, `{ unwrapList, unwrapResponse, extractErrorMessage }` from `@/lib/api-helpers`, `{ toast }` from `sonner`, `{ useAuthStore }` from `@/stores/useAuthStore`
- Type imports from `@/types`
- State: frameworks, topics, coverage, coverageReport, loading, selectedFramework, selectedSubject, selectedGrade, selectedClass
- Fetches: `fetchFrameworks`, `fetchTopics` (depends on filters), `fetchCoverage`, `fetchCoverageReport`
- Mutations: `createFramework`, `createTopic`, `updateTopic`, `deleteTopic`, `bulkImportTopics`, `updateCoverage`
- Returns all state + setters + mutations

API paths:
- `/teacher-workbench/curriculum/frameworks`
- `/teacher-workbench/curriculum/topics`
- `/teacher-workbench/curriculum/coverage`
- `/teacher-workbench/curriculum/coverage/report`
- `/teacher-workbench/curriculum/coverage/:topicId` (PATCH)

Also fetches subjects and classes from existing endpoints:
- `/academic/subjects`
- `/academic/classes`

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useCurriculum.ts
git commit -m "feat(teacher-workbench): implement useCurriculum hook"
```

---

### Task 11: Curriculum Components

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\curriculum\TopicNode.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\curriculum\TopicTree.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\curriculum\CoverageBar.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\curriculum\CoveragePopover.tsx`

- [ ] **Step 1: Create TopicNode component**

Props: `topic: CurriculumTopic`, `coverage: CurriculumCoverage | undefined`, `onUpdateCoverage: (topicId: string, data: {...}) => Promise<void>`, `onDelete: (id: string) => void`, `depth: number`

Renders a single topic with:
- Indentation based on depth
- ChevronRight icon (rotates when expanded) if topic has children
- Topic name, cognitive level badge (small colored badge), estimated periods text
- Coverage status chip (colored: green=completed, blue=in_progress, gray=not_started, amber=skipped)
- Click on status chip opens CoveragePopover

- [ ] **Step 2: Create TopicTree component**

Props: `topics: CurriculumTopic[]`, `coverageMap: Map<string, CurriculumCoverage>`, `onUpdateCoverage`, `onDeleteTopic`

Builds a tree from flat topics list using parentTopicId. Groups by term. Renders each term as a collapsible section with TopicNode components recursively.

- [ ] **Step 3: Create CoverageBar component**

Props: `report: CoverageReport`

Renders a horizontal progress bar with colored segments (green=completed, blue=in_progress, amber=skipped) and percentage label.

- [ ] **Step 4: Create CoveragePopover component**

Props: `topicId: string`, `currentCoverage: CurriculumCoverage | undefined`, `onSave: (topicId: string, data: {...}) => Promise<void>`, `trigger: ReactNode`

Uses Popover from `@/components/ui/popover`. Contains:
- Select for status
- Date input for dateCovered
- Textarea for notes
- Save button

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/workbench/curriculum/
git commit -m "feat(teacher-workbench): add curriculum UI components"
```

---

### Task 12: Curriculum Page

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\workbench\curriculum\page.tsx`

- [ ] **Step 1: Implement the curriculum page**

Thin orchestrator page:
- `'use client'`
- Uses `useCurriculum` hook
- Two tabs: "Topic Tree" and "Coverage Dashboard"
- Filter bar with framework, subject, grade, class selects
- Topic Tree tab renders `TopicTree` component
- Coverage Dashboard tab renders `CoverageBar` for each term from coverageReport
- "Add Topic" button opens a dialog with form fields
- "Bulk Import" button opens a dialog with JSON textarea
- Loading spinner when loading
- Empty state when no topics

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/workbench/curriculum/
git commit -m "feat(teacher-workbench): add curriculum page"
```

---

## Phase 4: Question Bank (Backend + Frontend)

### Task 13: Question Bank Backend Services

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\question.service.ts`

- [ ] **Step 1: Implement QuestionService**

Methods:
- `listQuestions(schoolId, filters, page, limit)` — paginated query with filters for subjectId, gradeLevel, topicId, difficulty, cognitiveLevel, questionType, source. Text search on questionText and tags. Sort by createdAt desc.
- `createQuestion(data, teacherId)` — create with teacherId
- `getQuestion(id)` — findOne with isDeleted:false, populate topicId and subjectId
- `updateQuestion(id, data)` — findOneAndUpdate
- `deleteQuestion(id)` — soft delete
- `importFromPaper(paperId, teacherId, schoolId)` — fetch GeneratedPaper by id, extract each question from sections, create Question records with source='imported'

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/services/question.service.ts
git commit -m "feat(teacher-workbench): implement question bank service"
```

---

### Task 14: Question Bank Controller

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\question.controller.ts`

- [ ] **Step 1: Implement QuestionController**

Same pattern as CurriculumController — static class, extract user/params, call service, return apiResponse.

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/controllers/question.controller.ts
git commit -m "feat(teacher-workbench): implement question bank controller"
```

---

### Task 15: Question Bank Frontend Hook

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useQuestionBank.ts`

- [ ] **Step 1: Implement useQuestionBank hook**

State: questions, loading, filters (QuestionFilters type), totalCount
Fetches: `fetchQuestions` (with filters as query params)
Mutations: `createQuestion`, `updateQuestion`, `deleteQuestion`, `importFromPaper`
Also fetches frameworks, subjects, topics for filter dropdowns.

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useQuestionBank.ts
git commit -m "feat(teacher-workbench): implement useQuestionBank hook"
```

---

### Task 16: Question Bank Components

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\question-bank\QuestionCard.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\question-bank\QuestionForm.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\question-bank\QuestionFilters.tsx`

- [ ] **Step 1: Create QuestionCard**

Props: `question: BankQuestion`, `onEdit: (q: BankQuestion) => void`, `onDelete: (id: string) => void`, `expanded: boolean`, `onToggle: () => void`

Collapsed: question text (truncated), type badge, difficulty badge, marks, topic name
Expanded: full question text, model answer, marking notes, images, options (for MCQ), tags

- [ ] **Step 2: Create QuestionForm**

Props: `open: boolean`, `onOpenChange`, `onSubmit`, `initialData?: BankQuestion`, `frameworks`, `subjects`, `topics`

Dialog with react-hook-form + zod validation. Fields for all question properties. MCQ options are dynamic add/remove rows. Image URLs as add/remove list.

- [ ] **Step 3: Create QuestionFilters**

Props: `filters: QuestionFilters`, `onFiltersChange`, `subjects`, `topics`, `frameworks`

Row of Select components for each filter dimension + SearchInput for text search.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/workbench/question-bank/
git commit -m "feat(teacher-workbench): add question bank UI components"
```

---

### Task 17: Question Bank Page

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\workbench\question-bank\page.tsx`

- [ ] **Step 1: Implement the question bank page**

Thin orchestrator:
- PageHeader with "Add Question" button
- QuestionFilters component
- List of QuestionCard components
- QuestionForm dialog for create/edit
- Loading spinner, empty state
- Delete confirmation

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/workbench/question-bank/
git commit -m "feat(teacher-workbench): add question bank page"
```

---

## Phase 5: Paper Memo + Moderation (Backend + Frontend)

### Task 18: Memo & Moderation Backend Services

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\memo.service.ts`
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\moderation.service.ts`

- [ ] **Step 1: Implement MemoService**

Methods:
- `generateMemo(paperId, teacherId, schoolId)` — fetch paper from GeneratedPaper, build AI prompt with all questions, call AIService to generate model answers + mark allocations, create PaperMemo record
- `getMemoByPaper(paperId)` — findOne by paperId
- `updateMemo(id, data)` — findOneAndUpdate

- [ ] **Step 2: Implement ModerationService**

Methods:
- `submitForModeration(paperId, teacherId, schoolId)` — create PaperModeration record with status='pending', submittedAt=now
- `getModerationQueue(schoolId, moderatorDepartment?)` — find pending moderations, optionally filtered by subject department matching
- `getModerationStatus(paperId)` — findOne by paperId with populate
- `reviewPaper(paperId, moderatorId, status, comments)` — update status, set moderatorId, moderatedAt, push to moderationHistory

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/services/memo.service.ts src/modules/TeacherWorkbench/services/moderation.service.ts
git commit -m "feat(teacher-workbench): implement memo and moderation services"
```

---

### Task 19: Memo & Moderation Controllers

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\memo.controller.ts`
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\moderation.controller.ts`

- [ ] **Step 1: Implement both controllers**

Same static class pattern.

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/controllers/memo.controller.ts src/modules/TeacherWorkbench/controllers/moderation.controller.ts
git commit -m "feat(teacher-workbench): implement memo and moderation controllers"
```

---

### Task 20: Memo & Moderation Frontend Hooks

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\usePaperMemo.ts`
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\usePaperModeration.ts`

- [ ] **Step 1: Implement usePaperMemo**

State: memo (PaperMemo | null), loading, generating, saving
Fetches: `fetchMemo(paperId)` — GET `/teacher-workbench/memos/paper/:paperId`
Mutations: `generateMemo(paperId)` — POST, `updateMemo(id, data)` — PUT, `regenerateAnswer(paperId, sectionIndex, questionIndex)` — calls AI endpoint

- [ ] **Step 2: Implement usePaperModeration**

State: moderations (PaperModeration[]), loading, submitting
Fetches: `fetchQueue()` — GET `/teacher-workbench/moderation/queue`, `fetchStatus(paperId)` — GET `/teacher-workbench/moderation/:paperId`
Mutations: `submitForModeration(paperId)` — POST, `reviewPaper(paperId, status, comments)` — POST

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/usePaperMemo.ts src/hooks/usePaperModeration.ts
git commit -m "feat(teacher-workbench): implement memo and moderation hooks"
```

---

### Task 21: Memo Components + Page

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\papers\MemoSection.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\papers\MemoAnswerEditor.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\workbench\papers\[id]\memo\page.tsx`

- [ ] **Step 1: Create MemoAnswerEditor**

Props: `answer: MemoAnswer`, `questionText: string`, `onChange: (updated: MemoAnswer) => void`, `onRegenerate: () => void`, `regenerating: boolean`

Renders: question text (read-only card), expected answer textarea, mark allocation table (editable rows with add/remove), common mistakes list (add/remove), acceptable alternatives list (add/remove), "Regenerate Answer" button.

- [ ] **Step 2: Create MemoSection**

Props: `section: MemoSection`, `questions: {questionNumber: number, questionText: string}[]`, `onChange: (updated: MemoSection) => void`, `onRegenerateAnswer: (questionNumber: number) => void`, `regeneratingQuestion: number | null`

Renders section title + list of MemoAnswerEditor components.

- [ ] **Step 3: Create Memo page**

Thin orchestrator using `usePaperMemo` hook. Shows PageHeader with paper title + "Print Memo" button + status toggle (Draft/Final). Renders MemoSection components. Save button. Loading/empty states.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/workbench/papers/MemoSection.tsx src/components/workbench/papers/MemoAnswerEditor.tsx src/app/\(dashboard\)/teacher/workbench/papers/
git commit -m "feat(teacher-workbench): add memo editor components and page"
```

---

### Task 22: Moderation Components + Page

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\papers\ModerationCard.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\papers\ModerationReviewForm.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\workbench\papers\moderation\page.tsx`

- [ ] **Step 1: Create ModerationCard**

Props: `moderation: PaperModeration`, `onClick: () => void`

Card showing paper subject, status badge (pending=amber, approved=green, changes_requested=destructive), submitted date, moderator name if reviewed, latest comment.

- [ ] **Step 2: Create ModerationReviewForm**

Props: `open: boolean`, `onOpenChange`, `onSubmit: (status, comments) => Promise<void>`, `submitting: boolean`

Dialog with radio group (Approve / Request Changes), textarea for comments, submit button.

- [ ] **Step 3: Create moderation page**

Two views based on context:
- Teacher view: list of own submitted papers with ModerationCard components
- HOD/admin view: pending queue with ModerationCard + click opens review form
- Uses `usePaperModeration` hook
- Tabs to switch between "My Papers" and "Review Queue" (if school_admin or HOD)

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/workbench/papers/ModerationCard.tsx src/components/workbench/papers/ModerationReviewForm.tsx src/app/\(dashboard\)/teacher/workbench/papers/moderation/
git commit -m "feat(teacher-workbench): add moderation components and page"
```

---

## Phase 6: Paper Builder (Frontend)

### Task 23: Paper Builder Components

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\papers\QuestionBankBrowser.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\papers\PaperBuilderPanel.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\papers\PaperConfigPanel.tsx`

- [ ] **Step 1: Create QuestionBankBrowser (left panel)**

Props: `questions: BankQuestion[]`, `filters: QuestionFilters`, `onFiltersChange`, `onAddQuestion: (q: BankQuestion) => void`, `loading: boolean`

Compact filter bar (subject, topic, difficulty selects), scrollable list of mini question cards with "+" button to add to paper.

- [ ] **Step 2: Create PaperBuilderPanel (center panel)**

Props: `sections: PaperBuilderSection[]`, `onRemoveQuestion`, `onReorderSections`, `onReorderQuestions`, `onEditQuestion`, `onAddSection`, `onRemoveSection`

Paper title at top. Sections as cards. Questions within sections as rows. Running totals bar (total marks, question count). Drag handles for reorder (can use simple up/down buttons instead of drag library to keep it simple).

Uses local type:
```typescript
interface PaperBuilderSection {
  id: string;
  title: string;
  questions: BankQuestion[];
}
```

- [ ] **Step 3: Create PaperConfigPanel (right panel)**

Props: `config: PaperConfig`, `onConfigChange`, `sections: PaperBuilderSection[]`, `onAIFillGaps`, `onGenerateMemo`, `onSubmitModeration`, `onSaveDraft`, `saving: boolean`

Config form (subject, grade, term, duration inputs). Difficulty distribution bar chart. Cognitive level distribution. Action buttons.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/workbench/papers/QuestionBankBrowser.tsx src/components/workbench/papers/PaperBuilderPanel.tsx src/components/workbench/papers/PaperConfigPanel.tsx
git commit -m "feat(teacher-workbench): add paper builder panel components"
```

---

### Task 24: Paper Builder Page

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\workbench\papers\builder\page.tsx`

- [ ] **Step 1: Implement paper builder page**

Orchestrator that:
- Uses `useQuestionBank` for the bank browser
- Manages local state for the paper being built (sections, questions)
- Uses `usePaperMemo` for memo generation
- Uses `usePaperModeration` for submission
- 3-column layout on lg: (QuestionBankBrowser | PaperBuilderPanel | PaperConfigPanel)
- Tab-based on mobile (Bank | Paper | Config)
- PageHeader with back button to workbench

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/workbench/papers/builder/
git commit -m "feat(teacher-workbench): add paper builder page"
```

---

## Phase 7: Marking Hub + Term Planner (Backend + Frontend)

### Task 25: Marking Hub & Planner Backend Services

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\aggregation.service.ts`
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\planner.service.ts`

- [ ] **Step 1: Implement AggregationService**

Methods:
- `getDashboard(teacherId, schoolId)` — parallel queries: count questions, count pending moderations, count marking items, get coverage %, get recent activity (last 10 created questions/memos/moderations sorted by date)
- `getPendingMarking(teacherId, schoolId)` — parallel queries to Homework (submissions where gradedAt is null for teacher's classes), Academic assessments (where teacher's class has students with no marks), AITools grading jobs (status='completed' not reviewed). Normalize into MarkingItem shape with priority based on due date.
- `getStudent360(studentId, schoolId)` — parallel queries to Academic (marks), Attendance (records), Discipline (incidents), Merits, Homework (submissions), Communication (messages). Aggregate into Student360Data shape.

- [ ] **Step 2: Implement PlannerService**

Methods:
- `getPlan(classId, term, year, schoolId)` — findOne AssessmentPlan, populate subject
- `createOrUpdatePlan(data, teacherId)` — upsert using schoolId+classId+subjectId+term+year as key
- `checkClashes(classId, date, schoolId)` — find all AssessmentPlans for classId that have plannedAssessments on the given date across all subjects
- `getWeightings(subjectId, schoolId)` — fetch SubjectWeighting config from Academic module, compare with actual planned weights

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/services/aggregation.service.ts src/modules/TeacherWorkbench/services/planner.service.ts
git commit -m "feat(teacher-workbench): implement aggregation and planner services"
```

---

### Task 26: Aggregation & Planner Controllers + Service Barrel

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\aggregation.controller.ts`
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\planner.controller.ts`
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\services\index.ts`
- Create: `c:\Users\shaun\campusly-backend\src\modules\TeacherWorkbench\controllers\index.ts`

- [ ] **Step 1: Implement both controllers**

Same static class pattern.

- [ ] **Step 2: Create barrel exports**

`services/index.ts`:
```typescript
export { CurriculumService } from './curriculum.service.js';
export { QuestionService } from './question.service.js';
export { MemoService } from './memo.service.js';
export { ModerationService } from './moderation.service.js';
export { PlannerService } from './planner.service.js';
export { AggregationService } from './aggregation.service.js';
```

`controllers/index.ts`:
```typescript
export { CurriculumController } from './curriculum.controller.js';
export { QuestionController } from './question.controller.js';
export { MemoController } from './memo.controller.js';
export { ModerationController } from './moderation.controller.js';
export { PlannerController } from './planner.controller.js';
export { AggregationController } from './aggregation.controller.js';
```

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/TeacherWorkbench/controllers/ src/modules/TeacherWorkbench/services/
git commit -m "feat(teacher-workbench): add remaining controllers and barrel exports"
```

---

### Task 27: Marking Hub Frontend

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useMarkingHub.ts`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\marking-hub\MarkingItemCard.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\marking-hub\MarkingFilters.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\workbench\marking-hub\page.tsx`

- [ ] **Step 1: Implement useMarkingHub hook**

State: items (MarkingItem[]), loading, filters (type, subject, priority), sortBy
Fetches: `fetchPending()` — GET `/teacher-workbench/marking-hub/pending`
Returns filtered + sorted items.

- [ ] **Step 2: Create MarkingItemCard**

Props: `item: MarkingItem`, `onClick: () => void`

Card with: type badge (colored by type), title, subject + class, due date, progress bar (pending/total), priority indicator (red dot for high, amber for medium).

- [ ] **Step 3: Create MarkingFilters**

Props: `filters`, `onFiltersChange`, `sortBy`, `onSortChange`

Row of selects for type, subject, priority + sort dropdown.

- [ ] **Step 4: Create marking hub page**

PageHeader with "Marking Hub" title. Stats bar (total pending, overdue, due today). MarkingFilters. List of MarkingItemCard components. Click navigates to appropriate existing page using router.push.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useMarkingHub.ts src/components/workbench/marking-hub/ src/app/\(dashboard\)/teacher/workbench/marking-hub/
git commit -m "feat(teacher-workbench): add marking hub hook, components, and page"
```

---

### Task 28: Term Planner Frontend

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useTermPlanner.ts`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\planner\PlannerCalendar.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\planner\WeightingSidebar.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\planner\AssessmentBlock.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\planner\AssessmentFormDialog.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\workbench\planner\page.tsx`

- [ ] **Step 1: Implement useTermPlanner hook**

State: plan (AssessmentPlan | null), clashes (DateClash[]), weightings (WeightingInfo[]), loading, saving
Fetches: `fetchPlan(classId, term, year)`, `checkClashes(classId, date)`, `fetchWeightings(subjectId)`
Mutations: `savePlan(data)` — POST `/teacher-workbench/planner`
Also fetches classes and subjects from existing endpoints.

- [ ] **Step 2: Create AssessmentBlock**

Props: `assessment: PlannedAssessment`, `onClick: () => void`

Small colored block for calendar: colored by type (blue=test, purple=exam, green=assignment, orange=practical, teal=project). Shows title + marks.

- [ ] **Step 3: Create PlannerCalendar**

Props: `assessments: PlannedAssessment[]`, `clashes: DateClash[]`, `currentMonth: Date`, `onMonthChange`, `onDateClick: (date: string) => void`, `onAssessmentClick: (assessment: PlannedAssessment) => void`

Monthly grid. Each day cell shows AssessmentBlock components. Clash dates get red border. Click empty date opens add form. Click assessment opens edit form.

On mobile: list view instead of grid (ordered by date).

- [ ] **Step 4: Create WeightingSidebar**

Props: `weightings: WeightingInfo[]`

Card with per-subject progress bars. Each bar shows actual weight vs required. Warning badge if total != 100%. Uses design tokens (not hardcoded colors).

- [ ] **Step 5: Create AssessmentFormDialog**

Props: `open`, `onOpenChange`, `onSubmit`, `initialData?: PlannedAssessment`, `topics: CurriculumTopic[]`

Dialog form with: title, type select, date picker, marks input, weight input, topics multi-select. Uses react-hook-form + zod.

- [ ] **Step 6: Create planner page**

PageHeader. Filter bar (class, term, year). Two-column layout on lg: (PlannerCalendar | WeightingSidebar). AssessmentFormDialog for add/edit. Loading/empty states.

- [ ] **Step 7: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useTermPlanner.ts src/components/workbench/planner/ src/app/\(dashboard\)/teacher/workbench/planner/
git commit -m "feat(teacher-workbench): add term planner hook, components, and page"
```

---

## Phase 8: Student 360 + Workbench Dashboard

### Task 29: Student 360 Frontend

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useStudent360.ts`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\student-360\AcademicCard.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\student-360\AttendanceCard.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\student-360\BehaviourCard.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\student-360\HomeworkCard.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\workbench\student-360\CommunicationCard.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\workbench\student-360\[id]\page.tsx`

- [ ] **Step 1: Implement useStudent360 hook**

State: data (Student360Data | null), loading
Fetches: `fetchStudent360(studentId)` — GET `/teacher-workbench/student-360/:studentId`

- [ ] **Step 2: Create AcademicCard**

Props: `data: Student360Academic`

Card with: term average (large text), trend indicator (arrow icon), mini Recharts LineChart of markHistory, subject breakdown table.

- [ ] **Step 3: Create AttendanceCard**

Props: `data: Student360Attendance`

Card with: attendance rate % (large text), Recharts PieChart (present/absent/late/excused), pattern callout text.

- [ ] **Step 4: Create BehaviourCard**

Props: `data: Student360Behaviour`

Card with: net merit score (large text, colored green if positive, destructive if negative), recent incidents list (last 5), recent merits list (last 5).

- [ ] **Step 5: Create HomeworkCard**

Props: `data: Student360Homework`

Card with: submission rate %, average mark %, late count, missing count. Simple stat grid.

- [ ] **Step 6: Create CommunicationCard**

Props: `data: Student360Communication`

Card with: last contact date, message count this term. "Send Message" button navigating to `/teacher/communication`.

- [ ] **Step 7: Create Student 360 page**

Uses `useStudent360` hook. PageHeader with student name + back button. 5-card responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Loading spinner. Empty state if student not found.

- [ ] **Step 8: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useStudent360.ts src/components/workbench/student-360/ src/app/\(dashboard\)/teacher/workbench/student-360/
git commit -m "feat(teacher-workbench): add student 360 hook, components, and page"
```

---

### Task 30: Workbench Dashboard

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useWorkbenchDashboard.ts`
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\workbench\page.tsx`

- [ ] **Step 1: Implement useWorkbenchDashboard hook**

State: data (WorkbenchDashboardData | null), loading
Fetches: `fetchDashboard()` — GET `/teacher-workbench/dashboard`

- [ ] **Step 2: Create workbench dashboard page**

PageHeader with "Teacher Workbench" title.
4 StatCard components: Coverage %, Question Count, Pending Moderation, Marking Due.
4 quick action cards (link to each main workbench page) using Card + Button components.
Recent activity feed (list of WorkbenchActivity items with timestamps).
Loading spinner. All responsive: `grid-cols-2 sm:grid-cols-2 lg:grid-cols-4` for stats, `grid-cols-1 sm:grid-cols-2` for quick actions.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useWorkbenchDashboard.ts src/app/\(dashboard\)/teacher/workbench/page.tsx
git commit -m "feat(teacher-workbench): add workbench dashboard hook and page"
```

---

## Phase 9: Integration & Verification

### Task 31: Final Wiring & Verification

**Files:**
- Verify: All barrel exports are correct
- Verify: Routes file imports all controllers correctly
- Verify: All pages render without TypeScript errors

- [ ] **Step 1: Verify backend compiles**

```bash
cd c:/Users/shaun/campusly-backend
npx tsc --noEmit
```

Fix any TypeScript errors.

- [ ] **Step 2: Verify frontend compiles**

```bash
cd c:/Users/shaun/campusly-frontend
npx next build
```

Fix any TypeScript errors or build errors.

- [ ] **Step 3: Verify all files are under 350 lines**

```bash
cd c:/Users/shaun/campusly-frontend
find src/components/workbench src/hooks/use*Workbench* src/hooks/use*Curriculum* src/hooks/use*Question* src/hooks/use*Paper* src/hooks/use*Moderation* src/hooks/use*Marking* src/hooks/use*Term* src/hooks/use*Student360* src/app/\(dashboard\)/teacher/workbench -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20
```

Split any files exceeding 350 lines.

- [ ] **Step 4: Verify no apiClient imports in pages or components**

```bash
cd c:/Users/shaun/campusly-frontend
grep -r "from.*api-client" src/app/\(dashboard\)/teacher/workbench/ src/components/workbench/ --include="*.tsx" --include="*.ts"
```

Should return zero results.

- [ ] **Step 5: Verify no `any` types**

```bash
cd c:/Users/shaun/campusly-frontend
grep -rn ": any\|as any" src/hooks/use*Workbench* src/hooks/use*Curriculum* src/hooks/use*Question* src/hooks/use*Paper* src/hooks/use*Moderation* src/hooks/use*Marking* src/hooks/use*Term* src/hooks/use*Student360* src/components/workbench/ src/app/\(dashboard\)/teacher/workbench/ src/types/teacher-workbench.ts --include="*.ts" --include="*.tsx"
```

Should return zero results.

- [ ] **Step 6: Final commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add -A
git commit -m "feat(teacher-workbench): final wiring and verification"
```
