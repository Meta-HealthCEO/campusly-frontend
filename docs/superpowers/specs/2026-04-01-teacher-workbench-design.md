# TeacherOS (Teacher Workbench) — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Module:** `teacher_workbench` (bolt-on)

---

## 1. Overview

TeacherOS is a standalone module that automates the most time-consuming parts of a teacher's daily work: curriculum mapping, paper creation with memos, question banking, moderation, unified marking, term planning, and holistic student views.

### Design Decisions (from brainstorming)

- **Curriculum:** Multi-framework from day one (CAPS, IEB, Cambridge + custom). Topic trees scoped by framework + subject + grade.
- **Moderation:** Single-level (Teacher -> HOD). Schema stores `moderationHistory[]` so multi-level can be added later without migration.
- **Question content:** Text + image attachments + AI equation formatting. Teachers type equations in plain text, AI auto-detects and renders them at preview/print time using KaTeX.
- **Standalone value:** Works with minimal dependencies (auth, subjects, classes, students). Can be sold separately.

---

## 2. Architecture

### 2.1 Backend

Single new module: `TeacherWorkbench` at `src/modules/TeacherWorkbench/`.

```
src/modules/TeacherWorkbench/
  routes.ts           Express Router — all endpoints
  controller.ts       Static class methods per endpoint
  service.ts          Business logic + DB queries
  model.ts            Mongoose schemas & interfaces
  validation.ts       Zod schemas for request validation
```

Mounted in `app.ts`:
```typescript
app.use('/api/teacher-workbench', requireModule('teacher_workbench'), teacherWorkbenchRoutes);
```

Added to `BOLT_ON_MODULES` in `moduleConfig.ts`:
```typescript
'teacher_workbench'
```

### 2.2 Frontend

```
src/app/(dashboard)/teacher/workbench/
  page.tsx                          Workbench dashboard
  curriculum/page.tsx               Syllabus mapping & coverage
  question-bank/page.tsx            Reusable question library
  papers/builder/page.tsx           Enhanced paper builder
  papers/[id]/memo/page.tsx         Memo viewer/editor
  papers/moderation/page.tsx        HOD moderation queue
  marking-hub/page.tsx              Unified marking inbox
  planner/page.tsx                  Term assessment planner
  student-360/[id]/page.tsx         Holistic student view
```

### 2.3 New Hooks (all API calls live here, never in pages/components)

```
src/hooks/
  useWorkbenchDashboard.ts
  useCurriculum.ts
  useQuestionBank.ts
  usePaperMemo.ts
  usePaperModeration.ts
  useMarkingHub.ts
  useTermPlanner.ts
  useStudent360.ts
```

### 2.4 New Components

```
src/components/workbench/
  curriculum/
    TopicTree.tsx                   Expandable topic tree
    TopicNode.tsx                   Single topic node with status
    CoverageBar.tsx                 Progress bar per term
    CoveragePopover.tsx             Status update popover
  question-bank/
    QuestionCard.tsx                Question preview card
    QuestionForm.tsx                Create/edit question form
    QuestionFilters.tsx             Filter controls
  papers/
    PaperBuilderPanel.tsx           Center panel — paper being built
    QuestionBankBrowser.tsx         Left panel — bank browser
    PaperConfigPanel.tsx            Right panel — config + actions
    MemoSection.tsx                 Memo answer section
    MemoAnswerEditor.tsx            Inline answer editor
    ModerationCard.tsx              Paper in moderation queue
    ModerationReviewForm.tsx        HOD review form
  marking-hub/
    MarkingItemCard.tsx             Unified marking item card
    MarkingFilters.tsx              Filter controls
  planner/
    PlannerCalendar.tsx             Monthly calendar view
    WeightingSidebar.tsx            Weight progress bars
    ClashWarning.tsx                Date clash indicator
    AssessmentBlock.tsx             Calendar assessment block
  student-360/
    AcademicCard.tsx                Academic performance card
    AttendanceCard.tsx              Attendance summary card
    BehaviourCard.tsx               Behaviour/merits card
    HomeworkCard.tsx                Homework submission card
    CommunicationCard.tsx           Parent comms card
  WorkbenchStatCard.tsx             Dashboard stat card
  WorkbenchQuickAction.tsx          Dashboard quick action button
```

### 2.5 New Types

```
src/types/teacher-workbench.ts      All types for this module
```

Re-exported via `src/types/index.ts`.

---

## 3. Data Models

### 3.1 CurriculumFramework

```typescript
interface ICurriculumFramework extends Document {
  schoolId: Types.ObjectId;
  name: string;                    // "CAPS", "IEB", "Cambridge", or custom
  description: string;
  isDefault: boolean;              // One default per school
  createdBy: Types.ObjectId;       // User who created it
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `{ schoolId: 1, isDeleted: 1 }`

### 3.2 CurriculumTopic

```typescript
interface ICurriculumTopic extends Document {
  schoolId: Types.ObjectId;
  frameworkId: Types.ObjectId;
  subjectId: Types.ObjectId;
  gradeLevel: number;              // 1-12
  parentTopicId: Types.ObjectId | null;  // null = root
  name: string;
  description: string;
  term: number;                    // 1-4
  orderIndex: number;              // Sequencing within parent
  cognitiveLevel: CognitiveLevel;
  estimatedPeriods: number;        // Class periods to teach this
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type CognitiveLevel =
  | 'knowledge'
  | 'comprehension'
  | 'application'
  | 'analysis'
  | 'synthesis'
  | 'evaluation';
```

Indexes: `{ schoolId: 1, frameworkId: 1, subjectId: 1, gradeLevel: 1 }`, `{ parentTopicId: 1 }`

### 3.3 CurriculumCoverage

```typescript
interface ICurriculumCoverage extends Document {
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

type CoverageStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';
```

Indexes: `{ teacherId: 1, classId: 1, topicId: 1 }` (unique), `{ schoolId: 1, teacherId: 1 }`

### 3.4 Question

```typescript
interface IQuestion extends Document {
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
  images: string[];                // URLs to uploaded images
  options: MCQOption[];            // For MCQ type only
  tags: string[];
  source: QuestionSource;
  usageCount: number;
  lastUsedDate: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type QuestionType =
  | 'mcq'
  | 'structured'
  | 'essay'
  | 'true_false'
  | 'matching'
  | 'short_answer'
  | 'fill_in_blank';

type Difficulty = 'easy' | 'medium' | 'hard';

type QuestionSource = 'manual' | 'ai_generated' | 'imported';

interface MCQOption {
  label: string;                   // "A", "B", "C", "D"
  text: string;
  isCorrect: boolean;
}
```

Indexes: `{ schoolId: 1, subjectId: 1, gradeLevel: 1 }`, `{ schoolId: 1, teacherId: 1 }`, `{ schoolId: 1, topicId: 1 }`, `{ tags: 1 }`

### 3.5 PaperMemo

```typescript
interface IPaperMemo extends Document {
  paperId: Types.ObjectId;         // Links to GeneratedPaper
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  sections: MemoSection[];
  totalMarks: number;
  status: MemoStatus;
  createdAt: Date;
  updatedAt: Date;
}

type MemoStatus = 'draft' | 'final';

interface MemoSection {
  sectionTitle: string;
  answers: MemoAnswer[];
}

interface MemoAnswer {
  questionNumber: number;
  expectedAnswer: string;
  markAllocation: MarkCriterion[];
  commonMistakes: string[];
  acceptableAlternatives: string[];
}

interface MarkCriterion {
  criterion: string;               // "correct formula"
  marks: number;                   // 1
}
```

Indexes: `{ paperId: 1 }` (unique), `{ schoolId: 1, teacherId: 1 }`

### 3.6 PaperModeration

```typescript
interface IPaperModeration extends Document {
  paperId: Types.ObjectId;
  schoolId: Types.ObjectId;
  submittedBy: Types.ObjectId;     // Teacher
  submittedAt: Date;
  moderatorId: Types.ObjectId | null;  // HOD
  moderatedAt: Date | null;
  status: ModerationStatus;
  comments: string;
  moderationHistory: ModerationEntry[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type ModerationStatus = 'pending' | 'approved' | 'changes_requested';

interface ModerationEntry {
  status: ModerationStatus;
  comment: string;
  moderatorId: Types.ObjectId;
  date: Date;
}
```

Indexes: `{ schoolId: 1, status: 1 }`, `{ paperId: 1 }` (unique), `{ moderatorId: 1, status: 1 }`

### 3.7 AssessmentPlan

```typescript
interface IAssessmentPlan extends Document {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classId: Types.ObjectId;
  term: number;                    // 1-4
  year: number;
  plannedAssessments: PlannedAssessment[];
  createdAt: Date;
  updatedAt: Date;
}

interface PlannedAssessment {
  title: string;
  type: AssessmentType;
  plannedDate: Date;
  marks: number;
  weight: number;                  // Percentage of term mark
  topicIds: Types.ObjectId[];      // Curriculum topics assessed
  assessmentId: Types.ObjectId | null;  // Links to actual assessment once created
  status: PlanStatus;
}

type AssessmentType = 'test' | 'exam' | 'assignment' | 'practical' | 'project';
type PlanStatus = 'planned' | 'created' | 'completed';
```

Indexes: `{ schoolId: 1, classId: 1, term: 1, year: 1 }`, `{ teacherId: 1 }`

---

## 4. API Endpoints

All endpoints prefixed with `/api/teacher-workbench`. All require `authenticate` middleware. Teacher and school_admin roles unless noted otherwise.

### 4.1 Curriculum

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/curriculum/frameworks` | List frameworks for school | teacher, school_admin |
| POST | `/curriculum/frameworks` | Create framework | teacher, school_admin |
| GET | `/curriculum/topics` | List topics (query: frameworkId, subjectId, gradeLevel, term) | teacher, school_admin |
| POST | `/curriculum/topics` | Create topic | teacher, school_admin |
| PUT | `/curriculum/topics/:id` | Update topic | teacher, school_admin |
| DELETE | `/curriculum/topics/:id` | Soft delete topic | teacher, school_admin |
| POST | `/curriculum/topics/bulk` | Bulk import topics (JSON array) | teacher, school_admin |
| GET | `/curriculum/coverage` | Get coverage (query: teacherId, subjectId, classId) | teacher, school_admin |
| PATCH | `/curriculum/coverage/:topicId` | Update coverage status | teacher |
| GET | `/curriculum/coverage/report` | Coverage summary % per term | teacher, school_admin |

### 4.2 Question Bank

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/questions` | Search/filter questions (query: subjectId, gradeLevel, topicId, difficulty, cognitiveLevel, type, tags, search) | teacher, school_admin |
| POST | `/questions` | Create question | teacher, school_admin |
| GET | `/questions/:id` | Get question detail | teacher, school_admin |
| PUT | `/questions/:id` | Update question | teacher, school_admin |
| DELETE | `/questions/:id` | Soft delete | teacher, school_admin |
| POST | `/questions/import-from-paper/:paperId` | Extract questions from generated paper into bank | teacher, school_admin |

### 4.3 Paper Memo

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/memos/generate/:paperId` | AI generates memo for paper | teacher, school_admin |
| GET | `/memos/paper/:paperId` | Get memo for paper | teacher, school_admin |
| PUT | `/memos/:id` | Edit memo | teacher, school_admin |

### 4.4 Paper Moderation

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/moderation/submit/:paperId` | Teacher submits paper for HOD review | teacher |
| GET | `/moderation/queue` | HOD: get pending reviews for department | teacher, school_admin |
| GET | `/moderation/:paperId` | Get moderation status for paper | teacher, school_admin |
| POST | `/moderation/:paperId/review` | HOD: approve or request changes | teacher, school_admin |

### 4.5 Marking Hub

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/marking-hub/pending` | Aggregated pending marking items across homework, assessments, AI grading | teacher |

### 4.6 Term Planner

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/planner/:classId/:term/:year` | Get assessment plan | teacher, school_admin |
| POST | `/planner` | Create or update plan | teacher, school_admin |
| GET | `/planner/clashes/:classId/:date` | Check date clashes across subjects | teacher, school_admin |
| GET | `/planner/weightings/:subjectId` | Required vs actual weightings | teacher, school_admin |

### 4.7 Student 360

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/student-360/:studentId` | Aggregated student view | teacher, school_admin |

### 4.8 Dashboard

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/dashboard` | Workbench stats and recent activity | teacher, school_admin |

---

## 5. Frontend Pages

### 5.1 Workbench Dashboard (`/teacher/workbench`)

**Stats (4 cards):**
- Curriculum Coverage % (across all subjects)
- Questions in Bank (count)
- Papers Pending Moderation (count)
- Marking Items Due (count)

**Quick actions (4 buttons):**
- Build Paper -> `/teacher/workbench/papers/builder`
- Browse Questions -> `/teacher/workbench/question-bank`
- View Planner -> `/teacher/workbench/planner`
- Check Coverage -> `/teacher/workbench/curriculum`

**Recent activity feed:** Last 10 actions.

### 5.2 Curriculum Page (`/teacher/workbench/curriculum`)

**Two tabs:**

**Tab 1 — Topic Tree:**
- Filters: framework (select), subject (select), grade (select), class (select)
- Expandable tree view grouped by term
- Each node: topic name, cognitive level badge, estimated periods, status chip
- Click topic -> CoveragePopover: status selector, date picker, notes field, lesson plan link
- "Add Topic" button at each tree level
- "Bulk Import" button at top

**Tab 2 — Coverage Dashboard:**
- Progress bars per term (Term 1: 85%, Term 2: 42%, etc.)
- Expected pace line (based on school calendar)
- Per-subject breakdown if teacher teaches multiple subjects
- "Behind pace" / "On track" / "Ahead" status badge

### 5.3 Question Bank (`/teacher/workbench/question-bank`)

- **PageHeader** with "Add Question" button
- **Filters:** subject, grade, topic, difficulty, cognitive level, type, source, tags (free text search)
- **Question list:** cards showing question text (truncated), type badge, difficulty badge, marks, topic, usage count
- **Click card** -> expands to show full question, model answer, marking notes, images
- **Actions per card:** Edit, Delete, "Add to Paper" (if paper builder is open)
- **Create/Edit form** (dialog): all question fields with proper validation

### 5.4 Paper Builder (`/teacher/workbench/papers/builder`)

**Desktop: 3-column layout (responsive collapses to tabs on mobile)**

**Left — Question Bank Browser:**
- Compact filter bar (subject, topic, difficulty)
- Scrollable question cards
- Click to add question to current section

**Center — Paper Preview:**
- Paper title + metadata at top
- Sections (draggable to reorder)
- Questions within sections (draggable to reorder)
- Running totals: total marks, question count, estimated duration
- Remove question button per item
- Inline edit question text

**Right — Config + Actions:**
- Subject, grade, term, duration inputs
- Difficulty distribution display (easy/medium/hard pie)
- Cognitive level distribution display
- Action buttons:
  - "AI Fill Gaps" — analyses coverage gaps, suggests/generates questions
  - "Generate Memo" — triggers memo generation
  - "Submit for Moderation" — sends to HOD
  - "Save Draft" — saves current state
  - "Export PDF" — renders paper for printing

**Mobile: Tab switching between Bank, Paper, Config.**

### 5.5 Memo Page (`/teacher/workbench/papers/[id]/memo`)

- **PageHeader** with paper title, "Print Memo" button
- **Sections** mirroring paper structure
- Per question:
  - Question text (read-only, for reference)
  - Expected answer (editable textarea)
  - Mark allocation table (editable — add/remove criteria rows)
  - Common mistakes (editable list)
  - Acceptable alternatives (editable list)
  - "Regenerate Answer" button (AI re-generates for this question)
- **Status toggle:** Draft / Final
- **Equation rendering:** AI-detected equations shown with KaTeX formatting in preview mode

### 5.6 Moderation Queue (`/teacher/workbench/papers/moderation`)

**Two views based on role context:**

**Teacher view:**
- List of own submitted papers with status (pending / approved / changes_requested)
- Moderation comments visible
- "Resubmit" button for papers with changes requested

**HOD view (school_admin, or teacher whose `department` matches the paper's subject department):**
- List of pending papers for review
- Click to view paper + memo side by side
- Review form: approve / request changes + comment field
- Moderation history displayed as timeline
- HOD eligibility is determined by matching `Teacher.department` to the subject's department. School admins can moderate any paper.

### 5.7 Marking Hub (`/teacher/workbench/marking-hub`)

- **PageHeader** with "Marking Hub" title
- **Stats bar:** Total pending, Overdue count, Due today count
- **Filters:** type (homework | assessment | ai_grading | all), subject, priority
- **Sort:** by due date (default), by pending count
- **Item cards:** type badge, title, subject, class, due date, progress bar (marked/total), priority indicator
- **Click card** -> navigates to appropriate existing page:
  - homework -> `/teacher/homework/[id]`
  - assessment -> `/teacher/grades` (with class + assessment pre-selected)
  - ai_grading -> `/teacher/ai-tools/grading`

### 5.8 Term Planner (`/teacher/workbench/planner`)

- **Filters:** class (select), term (select), year (select)
- **Calendar view:** month grid with assessment blocks colour-coded by type
  - Blue = test, Purple = exam, Green = assignment, Orange = practical, Teal = project
- **Clash warnings:** red badge on dates with 2+ assessments for same class
- **Weighting sidebar (right):**
  - Per-subject progress bar showing formal weight vs required
  - Warning if total weight != 100%
  - Informal vs formal split indicator
- **Topic coverage indicator:** chips showing assessed vs unassessed topics
- **Add assessment:** click date -> form dialog (title, type, marks, weight, date, topics)
- **Edit assessment:** click existing block -> edit form
- **"Create Assessment"** button on planned items -> creates actual assessment in academic module

### 5.9 Student 360 (`/teacher/workbench/student-360/[id]`)

- **PageHeader** with student name + class
- **5 cards in responsive grid (2 cols on mobile, 3 cols on desktop):**

**Card 1 — Academic Performance:**
- Term average (large number)
- Trend indicator (arrow up/down/flat)
- Mini line chart of marks over time (Recharts)
- Subject breakdown table: subject, mark, grade, class avg

**Card 2 — Attendance:**
- Attendance rate % (large number with donut chart)
- Counts: present, absent, late, excused
- Pattern callout (e.g., "Frequently absent on Mondays")

**Card 3 — Behaviour:**
- Net merit score (merits - demerits)
- Recent incidents list (last 5)
- Recent merits list (last 5)

**Card 4 — Homework:**
- Submission rate %
- Average mark %
- Late submission count
- Missing submissions count

**Card 5 — Parent Communication:**
- Last contact date
- Messages sent this term (count)
- "Send Message" quick action button (navigates to communication page)

---

## 6. Navigation

### New ROUTES constants:
```typescript
TEACHER_WORKBENCH: '/teacher/workbench',
TEACHER_WORKBENCH_CURRICULUM: '/teacher/workbench/curriculum',
TEACHER_WORKBENCH_QUESTION_BANK: '/teacher/workbench/question-bank',
TEACHER_WORKBENCH_PAPER_BUILDER: '/teacher/workbench/papers/builder',
TEACHER_WORKBENCH_MODERATION: '/teacher/workbench/papers/moderation',
TEACHER_WORKBENCH_MARKING_HUB: '/teacher/workbench/marking-hub',
TEACHER_WORKBENCH_PLANNER: '/teacher/workbench/planner',
```

### New TEACHER_NAV entry:
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
}
```

Student 360 is accessed via links from other pages (class roster, gradebook, marking hub), not from the nav.

---

## 7. Separation of Concerns

Strictly following existing codebase rules:

- **Pages** (`src/app/`): Thin orchestrators. Compose components, call hooks. ZERO `apiClient` imports.
- **Components** (`src/components/workbench/`): Pure UI. Accept typed props. ZERO `apiClient` imports.
- **Hooks** (`src/hooks/`): ALL API calls. Business logic, data fetching, mutations.
- **Types** (`src/types/teacher-workbench.ts`): All interfaces and type unions.

### File size rule: Max 350 lines per file.

Components that might exceed this are pre-split:
- Paper builder page -> 3 panel components + page orchestrator
- Memo page -> MemoSection + MemoAnswerEditor + page orchestrator
- Student 360 -> 5 card components + page orchestrator
- Curriculum -> TopicTree + TopicNode + CoverageBar + CoveragePopover + page

---

## 8. Dependencies on Existing Modules

TeacherWorkbench reads from (but does not modify):
- **Academic** — classes, subjects, assessments, marks, timetable
- **Homework** — homework list, submissions
- **Attendance** — attendance records, discipline, merits, lesson plans
- **AITools** — generated papers, grading jobs
- **Communication** — message history (for Student 360)
- **Auth** — user, schoolId, role

The only writes to other modules:
- Creating an actual Assessment from a planned assessment (calls Academic service internally)

---

## 9. AI Integration Points

1. **Equation formatting** — at preview/print time, AI scans question text for mathematical notation and converts to KaTeX-renderable format
2. **Memo generation** — AI generates model answers, mark allocations, common mistakes for each question in a paper
3. **Question regeneration** — AI regenerates a single memo answer when teacher clicks "Regenerate"
4. **AI Fill Gaps** — in paper builder, AI analyses curriculum coverage of selected questions and generates new questions for uncovered topics/cognitive levels
5. **Import from paper** — AI parses an existing generated paper and extracts individual questions with metadata into the question bank

All AI calls route through the existing AITools service layer.

---

## 10. Responsive Design

All layouts follow mobile-first approach per CLAUDE.md:

- Paper builder: 3 columns on `lg:`, 2 on `md:`, tab-based on mobile
- Student 360: 3 columns on `lg:`, 2 on `sm:`, 1 on mobile
- Planner: calendar on `md:+`, list view on mobile
- All grids use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` pattern
- All fixed widths use `w-full sm:w-40` pattern
- All dialogs use `flex-col max-h-[85vh]` with sticky footer
- Touch targets minimum 44px on mobile
