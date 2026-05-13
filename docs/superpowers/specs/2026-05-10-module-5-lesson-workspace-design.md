# Module 5 — Lesson Workspace

**Date:** 2026-05-10
**Owner:** Shaun Schoeman
**Status:** Approved (proceeding to implementation plan)

---

## 1. Goal

Replace the disconnected AI Studio (5 separate output kinds living in isolation) with a unified **Lesson Workspace** where a Lesson is the container for typed materials. Teachers create a Lesson for a curriculum topic + class + date; AI scaffolds suggested objectives + per-phase materials; the teacher curates and generates each material from one place; the lesson exports as a Teacher Pack (with memos) and Student Pack (without).

This module fixes the "lesson plan is just a string list of resources" problem: the lesson now owns links to actual `ContentResource` / `Question` / `Quiz` / `Homework` / `AssessmentPaper` documents. Reading materials link to either internal CAPS textbooks (with chapter + page range) or external school-issued textbooks (publisher / ISBN / page reference + optional pasted excerpt for AI grounding).

The current AI Studio is rebranded **Quick Make** at `/teacher/quick-make` for power users who want to generate a single artifact without lesson ceremony. Existing module routes (`/teacher/papers/new`, `/teacher/homework/new`, etc.) keep working.

---

## 2. Locked decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Data model | A — extend `LessonPlan` → `Lesson` with `materials[]` |
| Material types in v1 | A — full set of 9 (reading, worksheet, activity, notes, worked_example, quiz, practice_questions, homework, paper) |
| Textbook integration | B + polymorphic source — reference + comprehension Qs, internal CAPS or external |
| Drawer UX | A — right-side drawer for material configuration |
| Material sharing | A — per-lesson, independent (no many-to-many in v1) |
| AI Studio fate | B — rebrand to "Quick Make"; workspace becomes primary path |
| Lesson outline structure | B — fixed pedagogical phases (Introduction → Direct Instruction → Practice → Assessment → Homework) |
| Print / export | C — Teacher Pack + Student Pack |
| Lifecycle | C — `draft` / `ready` / `taught` |
| AI generation scope | B — AI scaffolder on creation; per-material generation thereafter |

---

## 3. Architecture overview

```
                        ┌────────────────────────────────────────┐
                        │  Teacher                               │
                        └────────────────┬───────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  /teacher/lessons              /teacher/lessons/new          /teacher/quick-make
  (list / calendar)             (3-step creation flow)        (legacy AI Studio rebrand)
        │                                │
        └─────────────┬──────────────────┘
                      ▼
          /teacher/lessons/[id]
          (workspace — outline + 5 phase sections + drawer)
                      │
                      ▼
   ┌───────────────────────────────────────────────────┐
   │  Backend: Lesson module                           │
   │  • model.ts — Lesson + embedded ILessonMaterial   │
   │  • service-lesson.ts — CRUD + material ops        │
   │  • service-lesson-scaffold.ts — AI outline (NEW)  │
   │  • service-lesson-export.ts — PDF packs (NEW)     │
   │  • service-lesson-migration.ts — boot-time (NEW)  │
   │  • controller.ts / routes.ts                      │
   └─────────────────────┬─────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬────────────────┐
        ▼                ▼                ▼                ▼
   ContentResource   Question +       Homework         AssessmentPaper
   (worksheet,       Quiz             (Module 4)       (Module 2)
   activity, notes,
   worked_example)
```

Workspace owns nothing material-specific. It holds an array of polymorphic material refs and dispatches material creation / editing to the existing module services. AI scaffolder produces a *plan* (outline), not content; per-material generation is invoked when the teacher clicks "Generate" on a placeholder card.

---

## 4. Data model

### 4.1 `Lesson` (renamed from `LessonPlan`)

```ts
export type LessonStatus = 'draft' | 'ready' | 'taught';
export type LessonPhase = 'introduction' | 'direct_instruction' | 'practice' | 'assessment' | 'homework';
export type LessonMaterialKind =
  | 'reading' | 'worksheet' | 'activity' | 'notes' | 'worked_example'
  | 'quiz' | 'practice_questions' | 'homework' | 'paper';

export interface ILessonPhaseEntry {
  phase: LessonPhase;
  materialIds: string[];        // ordered list of material._id values
}

export interface ILesson extends Document {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  classId: Types.ObjectId;
  subjectId: Types.ObjectId;
  gradeId: Types.ObjectId;
  curriculumNodeId: Types.ObjectId;
  title: string;
  date: Date;
  durationMinutes: number;
  objectives: string[];
  phases: ILessonPhaseEntry[];   // length 5, one per LessonPhase, fixed order
  materials: ILessonMaterial[];  // discriminated subdocs
  status: LessonStatus;
  reflectionNotes?: string;
  aiGenerated: boolean;          // true if scaffolded by AI on creation
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.2 `ILessonMaterial` discriminated union

Shared base on every variant:

```ts
interface ILessonMaterialBase {
  _id: Types.ObjectId;             // local subdoc id, NOT the entity id
  kind: LessonMaterialKind;
  title: string;
  teacherNotes?: string;           // teacher's own annotation, never AI-generated
  generatedAt?: Date;              // null when material is still a placeholder
  createdAt: Date;
  updatedAt: Date;
}
```

Variants (each adds one or two fields):

```ts
interface IReadingMaterial extends ILessonMaterialBase {
  kind: 'reading';
  textbookRef: TextbookRef;
  comprehensionQuestionIds?: Types.ObjectId[];   // refs Question
}

interface IWorksheetMaterial extends ILessonMaterialBase {
  kind: 'worksheet';
  contentResourceId: Types.ObjectId;             // ref ContentResource
}

interface IActivityMaterial extends ILessonMaterialBase {
  kind: 'activity';
  contentResourceId: Types.ObjectId;
}

interface INotesMaterial extends ILessonMaterialBase {
  kind: 'notes';
  contentResourceId: Types.ObjectId;
}

interface IWorkedExampleMaterial extends ILessonMaterialBase {
  kind: 'worked_example';
  contentResourceId: Types.ObjectId;
}

interface IQuizMaterial extends ILessonMaterialBase {
  kind: 'quiz';
  quizId: Types.ObjectId;                        // ref Learning.Quiz
}

interface IPracticeQuestionsMaterial extends ILessonMaterialBase {
  kind: 'practice_questions';
  questionIds: Types.ObjectId[];                 // refs QuestionBank.Question
}

interface IHomeworkMaterial extends ILessonMaterialBase {
  kind: 'homework';
  homeworkId: Types.ObjectId;                    // ref Homework
}

interface IPaperMaterial extends ILessonMaterialBase {
  kind: 'paper';
  paperId: Types.ObjectId;                       // ref AssessmentPaper
}

type ILessonMaterial =
  | IReadingMaterial
  | IWorksheetMaterial
  | IActivityMaterial
  | INotesMaterial
  | IWorkedExampleMaterial
  | IQuizMaterial
  | IPracticeQuestionsMaterial
  | IHomeworkMaterial
  | IPaperMaterial;
```

### 4.3 `TextbookRef` (polymorphic)

```ts
export type TextbookRef =
  | InternalTextbookRef
  | ExternalTextbookRef;

interface InternalTextbookRef {
  source: 'internal';
  textbookId: Types.ObjectId;        // ref Textbook
  chapterId?: Types.ObjectId;        // ref Textbook.chapters[]._id (sub-doc id)
  pageStart?: number;
  pageEnd?: number;
  notes?: string;
}

interface ExternalTextbookRef {
  source: 'external';
  title: string;                     // e.g. "Oxford Mathematics Grade 11"
  publisher?: string;
  isbn?: string;
  pageStart?: number;
  pageEnd?: number;
  excerpt?: string;                  // teacher-pasted text for AI grounding (max 8000 chars)
  notes?: string;
}
```

### 4.4 Indexes

Preserve existing `LessonPlan` indexes, add:

```ts
lessonSchema.index({ teacherId: 1, date: 1 });        // existing — keep
lessonSchema.index({ schoolId: 1, classId: 1, date: 1 });   // existing — keep
lessonSchema.index({ curriculumNodeId: 1 });          // existing — keep
lessonSchema.index({ schoolId: 1, status: 1, date: 1 });    // NEW — for list filters
lessonSchema.index({ teacherId: 1, status: 1 });      // NEW — teacher's drafts
```

### 4.5 Migration (one-shot, idempotent, runs on backend boot)

`service-lesson-migration.ts` runs on app startup. Detects whether the migration has run via a sentinel doc in a `migrations` collection (`{ name: 'lesson-plan-to-lesson', completedAt }`). If not present:

1. Read all `LessonPlan` documents (non-deleted).
2. For each:
   - Build `phases` array: 5 entries, all empty `materialIds: []` to start.
   - Build `materials` array:
     - For each non-empty string in `LessonPlan.resources`, append a `notes`-kind material:
       ```ts
       { _id: new ObjectId(), kind: 'notes', title: 'Resource', teacherNotes: <string>, generatedAt: undefined, createdAt: <plan.createdAt>, updatedAt: <plan.updatedAt> }
       ```
       These go into the `direct_instruction` phase by default.
     - For each non-empty string in `LessonPlan.activities`, append a `notes`-kind material with `title: 'Activity'` and `teacherNotes: <string>`. These go into the `practice` phase by default.
       Note: notes-materials migrated from `resources`/`activities` have NO `contentResourceId` because we have no actual `ContentResource` to point at — the migration falls back to a synthetic shape. The frontend renders these as "Note" cards with the `teacherNotes` content. To keep the discriminated union strict, we DROP `contentResourceId` requirement on the `notes` variant — it becomes optional on `notes` (only). The UI surfaces the `teacherNotes` text directly when no `contentResourceId` exists.
       *Schema implication:* `INotesMaterial.contentResourceId` is `Types.ObjectId | undefined`. All other content-resource-backed kinds (`worksheet`, `activity`, `worked_example`) keep it required.
     - For each ObjectId in `LessonPlan.homeworkIds`, append a `homework`-kind material with `homeworkId: <id>`. These go into the `homework` phase by default.
   - Map old `LessonPlan.objectives: string[]` directly to new `Lesson.objectives: string[]` (same shape).
   - Set `status: 'draft'` if `date >= today`, else `'taught'` (assume past lessons happened).
   - Set `aiGenerated: false`.
   - Set `title: <plan.topic>` (LessonPlan had `topic`; Lesson has `title`).
3. Bulk insert into `lessons` collection with the same `_id` as the original `LessonPlan` (preserves URLs).
4. Soft-delete the original `LessonPlan` docs (`isDeleted: true`).
5. Insert sentinel `{ name: 'lesson-plan-to-lesson', completedAt: new Date() }`.

The legacy `LessonPlan` model file is kept (read-only) for the migration to reference; new code never imports it.

**Routes:** `/teacher/lesson-plans` and `/teacher/lesson-plans/[id]` issue a 308 redirect to `/teacher/lessons` and `/teacher/lessons/[id]` respectively (preserving deep-link bookmarks).

---

## 5. Backend services

### 5.1 `service-lesson.ts` (NEW, target ≤300 lines)

```ts
class LessonService {
  static async list(schoolId, filters: { teacherId?, classId?, subjectId?, status?, dateFrom?, dateTo?, search? }, page, limit): Promise<PaginatedResult<ILesson>>
  static async getById(id, schoolId): Promise<ILesson>
  static async create(data: CreateLessonInput, teacherId, schoolId): Promise<ILesson>
    // accepts optional `scaffoldedOutline?: { objectives[], phases[{phase, suggestions: Array<{kind, title, notes?}>}] }`
    // when present: writes objectives + creates one PLACEHOLDER material per suggestion (no entity refs yet)
    // when absent: empty objectives + 5 empty phases
  static async update(id, schoolId, data: UpdateLessonInput): Promise<ILesson>
  static async patchStatus(id, schoolId, newStatus: LessonStatus): Promise<ILesson>
    // validates transitions: draft → ready, ready → taught, draft → taught (skip), taught → ready (revoke). Reverse direction of any transition is allowed (teacher can demote ready → draft, taught → ready)
  static async delete(id, schoolId): Promise<void>
    // soft-delete the lesson only (sets isDeleted: true). Underlying material entities (ContentResource, Question, Homework, Paper, Quiz) are NOT cascaded — they remain intact in case the lesson is restored. Restoring a lesson re-exposes its materials. Pruning of orphan entities is a follow-up cleanup job, out of scope for v1.
}

// Material ops — separate top-level functions to keep service.ts under 350 lines
export async function addMaterial(lessonId, schoolId, kind: LessonMaterialKind, payload: AddMaterialPayload): Promise<ILessonMaterial>
  // For 'reading': creates the material subdoc only (no underlying entity); if comprehension Qs requested, generates them via service-homework-comprehension and stores IDs on comprehensionQuestionIds
  // For 'worksheet'|'activity'|'notes'|'worked_example': calls existing ContentLibrary.generateContent(payload), stores resource id
  // For 'practice_questions': calls existing QuestionBank.generateQuestions(payload), stores question ids
  // For 'quiz' (link-existing only in v1): accepts a quizId; v1 does NOT create new quizzes from the workspace (teacher creates them in Learning module first, then links)
  // For 'homework' (create-or-link): payload either has `existingHomeworkId` (link) OR `createPayload` (creates a new Homework via Module 4's createHomework flow); never both
  // For 'paper' (create-or-link): payload either has `existingPaperId` (link) OR `createPayload` (triggers Module 2's generatePaperWithAI); never both
  // Compensation: if Lesson update fails after entity create, soft-delete the entity (set isDeleted: true on the just-created ContentResource / Question / Homework / Paper)
export async function updateMaterial(lessonId, materialId, schoolId, patch: { title?, teacherNotes?, phase? }): Promise<ILessonMaterial>
export async function moveMaterial(lessonId, materialId, schoolId, toPhase: LessonPhase, toIndex: number): Promise<ILesson>
export async function deleteMaterial(lessonId, materialId, schoolId): Promise<void>
  // Soft-deletes the underlying entity (sets isDeleted: true on ContentResource/Question/etc.) AND removes the subdoc from the lesson
export async function regenerateMaterial(lessonId, materialId, schoolId, payload?: AddMaterialPayload): Promise<ILessonMaterial>
  // For content-backed kinds: creates a new ContentResource, swaps the materialId reference, soft-deletes the old resource
```

### 5.2 `service-lesson-scaffold.ts` (NEW, target ≤200 lines)

```ts
interface ScaffoldedOutline {
  objectives: string[];                          // 3-5 items
  phases: Array<{
    phase: LessonPhase;
    suggestions: Array<{
      kind: LessonMaterialKind;
      title: string;                             // suggested title for the placeholder card
      notes?: string;                            // teacher-facing hint about what the material should cover
    }>;
  }>;
}

export async function scaffoldLesson(input: {
  curriculumNodeId: string;
  classId: string;
  subjectId: string;
  gradeId: string;
  durationMinutes: number;
  hints?: string;                                // optional teacher-provided "focus on factorising"
  schoolId: string;
}): Promise<ScaffoldedOutline>
```

Implementation:
1. Load CurriculumNode + Subject + Grade for context.
2. Build a system prompt: "You are a CAPS-aligned South African secondary school teacher. Given a topic, grade, and duration, produce a lesson outline with 3-5 SMART objectives and a list of 1-3 suggested materials per pedagogical phase."
3. User prompt: topic title + code + grade level + duration + hints.
4. Call `AIService.generateJSON<ScaffoldedOutline>`.
5. Validate response against a Zod schema that enforces phase enum + kind enum + array bounds.
6. Return outline. NO database writes.

### 5.3 `service-lesson-export.ts` (NEW, target ≤300 lines)

```ts
export async function exportTeacherPack(lessonId: string, schoolId: string): Promise<Buffer>
export async function exportStudentPack(lessonId: string, schoolId: string): Promise<Buffer>
```

Implementation pattern (PDFKit, mirrors Module 2's paper PDF pipeline):
1. Load Lesson with all materials populated.
2. Initialise a PDFKit document.
3. **Cover page**: school name, lesson title, class, date, teacher, duration, status badge.
4. **Objectives section**: numbered list.
5. **Phases**: for each phase (in fixed order), if it has materials:
   - Phase header.
   - For each material in phase order:
     - Material card: title, teacher notes if any.
     - **Teacher Pack only**: full content + memo / answer key / model answer.
     - **Student Pack only**: content only (no memos), homework instructions only (no answers).
6. **Footer**: page numbers + lesson title.
7. Returns the buffer; controller streams as `application/pdf`.

Per-material rendering reuses existing PDFKit renderers from Modules 1-4:
- ContentResource → existing `renderContentResourcePDF` (extend to accept a `studentMode: boolean` flag).
- Question[] → existing question PDF helper from `service-paper-questions.ts`.
- Homework → existing homework print PDF.
- Paper → existing `service-pdf.ts` paper renderer.
- Reading (internal textbook) → fetch chapter content + render as inline section.
- Reading (external textbook) → render the textbook reference card only (publisher, ISBN, page range, excerpt if present).

### 5.4 Comprehension Q service extension (`service-homework-comprehension.ts` — extend Module 4)

Add a new entry point that accepts a `TextbookRef` directly:

```ts
export async function generateComprehensionFromTextbook(
  textbookRef: TextbookRef,
  schoolId: string,
  teacherId: string,
  subjectId: string,
  gradeId: string,
  curriculumNodeId: string,
  count = 4,
): Promise<Types.ObjectId[]>
```

Behaviour:
- **Internal**: load `Textbook` + the chapter at `chapterId`. Extract the page range from chapter content. Use existing `extractText` helper to feed Claude the chapter text within the page range.
- **External with excerpt**: pass the `excerpt` string as the source.
- **External without excerpt**: fall back to topic + page-range hint only ("Generate comprehension questions for Grade 11 Mathematics — Functions and Graphs, pages 87-92 of an external textbook"). Claude generates questions based on the topic, not the actual text.

Returns the new Question IDs (same shape as the existing `generateComprehensionQuestions`).

### 5.5 Existing services touched

- `service-homework.ts` (Module 4) — no breaking changes; the workspace's HomeworkDrawer calls existing `createHomework` + stores the returned ID on the material subdoc.
- `service-papers.ts` (Module 2) — no breaking changes; PaperDrawer calls existing `generatePaperWithAI`.
- `service-questions.ts` (QuestionBank) — no breaking changes; PracticeQuestionsDrawer calls existing `generateQuestions`.
- `service-content.ts` (ContentLibrary) — no breaking changes; Worksheet/Activity/Notes/WorkedExample drawers all call existing `generateContent`.

---

## 6. Backend routes

```
GET    /lessons                              → list with filters + pagination
GET    /lessons/:id                          → detail with populated materials (depth 1)
POST   /lessons/scaffold                     → AI outline only, no DB write
POST   /lessons                              → create lesson (optional scaffoldedOutline payload)
PUT    /lessons/:id                          → update metadata (title, date, duration, objectives)
PATCH  /lessons/:id/status                   → transition status
DELETE /lessons/:id                          → soft delete

POST   /lessons/:id/materials                → add material — discriminated body
PATCH  /lessons/:id/materials/:mid           → update material (title, teacherNotes)
PATCH  /lessons/:id/materials/:mid/move      → reorder (body: { toPhase, toIndex })
POST   /lessons/:id/materials/:mid/regenerate → regenerate underlying entity
DELETE /lessons/:id/materials/:mid           → remove material from lesson + soft-delete entity

GET    /lessons/:id/export/teacher           → Teacher Pack PDF stream
GET    /lessons/:id/export/student           → Student Pack PDF stream
```

All routes: `authenticate` + tenant filter `schoolId === req.user.schoolId`. Material ops also verify `lesson.teacherId === req.user.id` OR user has `isHOD`/`isSchoolPrincipal`.

---

## 7. Frontend — list page

**Route:** `/teacher/lessons` (rename of `/teacher/lesson-plans`)

**Layout:**
- `PageHeader` with title "Lessons" + "New Lesson" CTA → `/teacher/lessons/new`.
- Filter bar (extracted to `LessonListFilters.tsx`): class, subject, date range, status, search.
- View toggle: List / Calendar.
- **List view** (`LessonListTable.tsx`): table — title, class, subject, date, status, materials count, actions menu (Open / Clone / Delete).
- **Calendar view** (`LessonCalendar.tsx`): month grid, lesson cards on date squares (max 3 visible per day, "+N more" overflow). Status colours: amber=draft, blue=ready, green=taught.

**Hooks:**
- `useLessons({ filters, page, limit })` — paginated list.
- `useLessonMutations()` — clone + delete.

---

## 8. Frontend — creation flow

**Route:** `/teacher/lessons/new`

**Three steps in a single page:**

**Step 1 — Topic & class:**
- `CurriculumTreeBrowser` (existing) for topic selection.
- Class Select (filtered by teacher's teaching load).
- Date picker.
- Duration input.
- Optional title input (else defaults to topic title).

**Step 2 — AI hints (optional):**
- Textarea: "Anything specific to focus on? (Optional)".
- "Skip & generate" button that bypasses scaffolding entirely → creates an empty Lesson.
- "Scaffold with AI" button → Step 3.

**Step 3 — Scaffold preview:**
- Calls `POST /lessons/scaffold` → renders the returned outline in `LessonScaffoldPreview.tsx`.
- Preview shows objectives (editable inline) + per-phase suggestions (editable titles, removable cards).
- "Regenerate" button → re-calls scaffold endpoint with same input.
- "Create Lesson" button → POSTs `/lessons` with the (possibly edited) outline → redirects to workspace.

**Hook:** `useLessonScaffold()` exposes `{ scaffold(input), creating, error }`.

---

## 9. Frontend — workspace

**Route:** `/teacher/lessons/[id]`

**Two-column layout** (collapsible to single column on `<lg`):

**Left column (320px sticky):**
- `LessonOutline.tsx`:
  - Lesson title (editable on click).
  - Status pill (draft / ready / taught) with click-to-transition popover.
  - Class / subject / topic / date / duration metadata.
  - Objectives list (editable inline — add / remove / edit).
  - Phase nav: 5 buttons, each with material count, click to scroll-to-phase in right column.
  - "Mark as Taught" button (visible when status=ready and date<=today).
  - "Reflection notes" textarea (visible after status=taught).
  - "Export Teacher Pack" / "Export Student Pack" buttons.

**Right column (flex):**
- 5 phase sections stacked top-to-bottom in `LessonPhaseSection.tsx`:
  - Phase header (icon + name + material count).
  - List of `LessonMaterialCard.tsx` (drag-to-reorder within phase, drag-to-move across phases).
  - "+ Add material" button at the bottom of each phase → opens `<MaterialDrawer>` scoped to that phase.

**`LessonMaterialCard.tsx`** (one per material):
- Icon + kind label (e.g. "Reading", "Worksheet").
- Title (editable on click).
- Status pill: Placeholder (no `generatedAt`) / Generated / Linked.
- Teacher notes (collapsible).
- Action menu: Generate (if placeholder) / Regenerate / Edit / View / Print / Delete.
- "Generate" on a placeholder opens the appropriate drawer pre-filled with the material's title + notes.

**`<MaterialDrawer>`** (right-side slide-in):
- Step 1 (only when adding new): Type tile picker — 9 tiles with icon, name, brief description.
- Step 2: Type-specific configuration form. The form delegates to a kind-specific drawer component:

| Material kind | Drawer component | What it wraps |
|---|---|---|
| reading | `ReadingDrawer` | textbook source toggle (internal/external) → textbook+chapter+pages picker → comprehension toggle → optional excerpt textarea |
| worksheet | `WorksheetDrawer` | reuses ContentLibrary `generateContent` flow with `type: 'worksheet'` |
| activity | `ActivityDrawer` | same as worksheet, `type: 'activity'` |
| notes | `NotesDrawer` | same as worksheet, `type: 'study_notes'` |
| worked_example | `WorkedExampleDrawer` | same as worksheet, `type: 'worked_example'` |
| quiz | `QuizDrawer` | "Pick existing quiz from Learning module" picker (no in-drawer creation in v1) |
| practice_questions | `PracticeQuestionsDrawer` | reuses QuestionBank `generateQuestions` flow (count + type + cognitive level + difficulty) |
| homework | `HomeworkDrawer` | wraps Module 4's create-homework flow inline (drawer renders the 4 steps as a single scrollable form) |
| paper | `PaperDrawer` | wraps Module 2's paper generation inline (single form) |

All drawer components share `<MaterialDrawerShell>` (header + body + footer with Generate/Cancel) — kind-specific bodies plug in.

**State:** `useLessonWorkspaceStore` (Zustand) holds:
- `activePhase: LessonPhase | null`
- `drawerState: { open: boolean, kind: LessonMaterialKind | null, materialId: string | null }` (materialId set when editing/regenerating)
- `dirty: boolean` — for unsaved-changes warning on navigation
- Standard setters

---

## 10. Frontend — Quick Make rebrand

**Route:** `/teacher/quick-make` (was `/teacher/curriculum/ai-studio`)

**Changes:**
- Page title: "Quick Make" instead of "AI Studio".
- Description: "Generate a single material without creating a Lesson. For richer lesson management, use the Lesson Workspace →".
- Banner card at top: "Looking for the new Lesson Workspace? Plan a complete lesson with all materials in one place. [Open Workspace]" — links to `/teacher/lessons`.
- Lesson Plan tile: badge "Legacy — opens the new Lesson Workspace" (clicking it routes to `/teacher/lessons/new` instead of the old in-page wizard).
- The other 4 tiles (Lesson Material, Homework, Test/Exam Paper, Practice Questions) keep their existing wizard flows.
- Old `/teacher/curriculum/ai-studio` URL issues 308 redirect to `/teacher/quick-make`.
- Sidebar nav: "AI Studio" entry renamed to "Quick Make". New "Lessons" entry added above it.

---

## 11. Component inventory (frontend)

```
src/app/(dashboard)/teacher/lessons/
  page.tsx                                 list + calendar
  new/page.tsx                             3-step creation flow
  [id]/page.tsx                            workspace orchestrator

src/components/lessons/
  LessonListFilters.tsx                    filter bar
  LessonListTable.tsx                      list view
  LessonCalendar.tsx                       calendar view
  LessonOutline.tsx                        left column of workspace
  LessonPhaseSection.tsx                   right column phase block
  LessonMaterialCard.tsx                   one card per material
  LessonStatusPill.tsx                     status badge + transition popover
  LessonScaffoldPreview.tsx                step 3 of creation flow
  MaterialDrawerShell.tsx                  drawer wrapper (header + body + footer)
  MaterialTypePicker.tsx                   9 type tiles
  drawers/
    ReadingDrawer.tsx                      textbook source + page range + comprehension
    WorksheetDrawer.tsx
    ActivityDrawer.tsx
    NotesDrawer.tsx
    WorkedExampleDrawer.tsx
    QuizDrawer.tsx
    PracticeQuestionsDrawer.tsx
    HomeworkDrawer.tsx
    PaperDrawer.tsx
  TextbookSourcePicker.tsx                 internal textbook autocomplete + chapter + pages OR external title/publisher/ISBN

src/hooks/
  useLessons.ts                            list + filters
  useLesson.ts                             single + mutations + materials
  useLessonScaffold.ts                     AI outline call
  useLessonExport.ts                       PDF download trigger

src/stores/
  useLessonWorkspaceStore.ts               Zustand workspace state

src/types/
  lesson.ts                                ILesson + ILessonMaterial union + TextbookRef + payload types
```

---

## 12. Edge cases & risks

| Risk | Mitigation |
|---|---|
| Migration corrupts existing LessonPlan data | Run on a staging DB first; the migration is idempotent (sentinel doc) and writes to a new `lessons` collection without touching `lesson_plans` until the very last soft-delete step |
| AI scaffolder returns invalid material kinds | Zod schema rejects + retry once with stricter prompt; if still invalid, fall back to a default 5-phase template (intro: notes, direct: worked_example, practice: worksheet, assessment: practice_questions, homework: homework) |
| Material entity created but lesson save fails | Compensation in `addMaterial`: try/catch around `Lesson.findByIdAndUpdate` after entity creation; on throw, soft-delete the just-created entity |
| Soft-delete material → orphan ContentResource | Delete handler explicitly sets `isDeleted: true` on the entity. Material → entity is 1-to-1 in v1, so safe to cascade |
| Regenerate creates orphan old entity if save of new fails | Two-phase: create new entity → update material to point to new ID → soft-delete old entity. Each phase wraps in try/catch with explicit rollback |
| External textbook reading without excerpt → vague AI Qs | Frontend warns: "No excerpt provided. Comprehension questions will be based on the topic only and may not match the textbook." Toggle disabled by default for external without excerpt |
| Workspace edits are lost on navigation | Zustand store tracks `dirty` flag; `next/navigation` `useRouter` interceptor warns on unsaved changes. Material titles + teacher notes save via PATCH on blur (debounced 800ms) |
| Concurrent edits from two tabs | Last-write-wins on the lesson; per-material updates are scoped to that material's subdoc via `arrayFilters` so concurrent material adds don't conflict |
| Print export for lessons with 20+ materials is slow | Server-side stream the PDF; frontend shows a toast "Generating PDF..." with progress indicator; cap at 30 materials per export with a graceful "lesson too large to export — split into 2 lessons" error |
| Drag-and-drop reorder issues with embedded subdocs | Use `dnd-kit` (already in repo if any), persist via `PATCH /materials/:mid/move` — backend uses `arrayFilters` to update both source phase's `materialIds` and target phase's `materialIds` atomically in one `findOneAndUpdate` |
| Migration interferes with active production traffic | Run migration in a single backend instance (use a Mongo distributed lock via the `migrations` collection's unique index on `name`); other instances skip if sentinel exists |
| Existing AI Studio bookmarks 404 | 308 redirect from `/teacher/curriculum/ai-studio` → `/teacher/quick-make` |

---

## 13. Out of scope (v1 explicit non-goals)

- Sharing materials across lessons (Q5 deferred)
- Lesson templates ("Save this lesson as a template")
- Multi-class assignment (one lesson → many classes; Clone Lesson covers it)
- Custom phase names / reordering phases / adding phases
- Lesson video recording integration
- Online lesson delivery to students (assigning the whole lesson, not just homework)
- Co-teaching (one lesson, multiple teachers)
- HOD lesson observation / coaching layer
- Calendar drag-to-reschedule
- AI-generated reflection notes ("How did this lesson go?" auto-prompt)
- Bulk operations on lessons (bulk-mark-as-taught, bulk-clone)
- Lesson dependencies (lesson B builds on lesson A)
- Quiz creation inside the workspace (Quiz Drawer is link-existing only in v1)

---

## 14. Acceptance criteria

A teacher can:
1. Open `/teacher/lessons/new`, pick a curriculum topic + class + date, optionally enter AI hints, click Scaffold → see an outline preview → edit it → Create Lesson → land on the workspace with placeholder material cards in each phase.
2. Click "+ Add material" on the Practice phase → drawer opens → pick "Worksheet" → fill config → click Generate → drawer closes → worksheet card appears with status "Generated".
3. Add a Reading material that links to an internal CAPS textbook chapter → check the "Generate comprehension questions" toggle → comprehension Qs auto-generate as a child reference on the Reading material.
4. Add a Reading material with `source: external`, paste an excerpt, generate comprehension Qs from the excerpt.
5. Drag a material from one phase to another; persist via API.
6. Click "Export Teacher Pack" → receive a PDF with cover + objectives + per-phase sections + all material content + memos at the back.
7. Click "Export Student Pack" → receive a PDF with worksheets / activities / readings only — no memos, no answer keys.
8. Transition status: draft → ready (manual) → taught (auto-suggested when date ≤ today, manual confirm).
9. Navigate to `/teacher/lesson-plans` → redirected to `/teacher/lessons`.
10. Old LessonPlan documents appear in the new list with their `resources` migrated as `notes` materials and `homeworkIds` migrated as `homework` materials.
11. Open `/teacher/curriculum/ai-studio` → redirected to `/teacher/quick-make` with the rebrand UI.
12. Click "Lesson Plan" tile in Quick Make → routed to `/teacher/lessons/new` (the workspace creation flow).
13. Other Quick Make tiles (Lesson Material / Homework / Paper / Practice Questions) still produce single artifacts as before.

System invariants:
- Zero `apiClient` imports in components/pages.
- Zero `any` types.
- All files <350 lines.
- TypeScript clean both repos: `npx tsc --noEmit` returns nothing.
- All Lesson + Material backend queries filter by `schoolId`.
- All single-entity finds filter by `schoolId` (CLAUDE.md multi-tenancy rule).
- Migration is idempotent: re-running on a partially-migrated DB produces the same end state.

---

## 15. Implementation order (preview for plan)

Backend:
1. Lesson model: rename + extend schema with `materials[]`, `phases[]`, `status`, indexes.
2. Migration service: idempotent boot-time job that converts LessonPlan → Lesson.
3. Validation schemas (Zod v4) for create / update / scaffold / addMaterial / moveMaterial.
4. service-lesson.ts: CRUD + status transitions.
5. service-lesson.ts: addMaterial / updateMaterial / moveMaterial / deleteMaterial / regenerateMaterial.
6. service-lesson-scaffold.ts: AI outline service (no DB writes).
7. service-lesson-export.ts: Teacher Pack + Student Pack PDF pipelines.
8. Extend service-homework-comprehension.ts: TextbookRef-based generation.
9. Routes + controller for all endpoints.
10. Boot-time migration trigger + sentinel.

Frontend:
11. Types + hooks (useLessons, useLesson, useLessonScaffold, useLessonExport, useLessonWorkspaceStore).
12. List page (`/teacher/lessons`) with filters + table + calendar toggle.
13. Creation flow (`/teacher/lessons/new`) — 3 steps, scaffold preview.
14. Workspace orchestrator (`/teacher/lessons/[id]`) + LessonOutline + LessonPhaseSection + LessonMaterialCard.
15. MaterialDrawerShell + MaterialTypePicker.
16. Drawers (1/9): ReadingDrawer + TextbookSourcePicker.
17. Drawers (4/9): WorksheetDrawer + ActivityDrawer + NotesDrawer + WorkedExampleDrawer (share a base component).
18. Drawers (1/9): PracticeQuestionsDrawer.
19. Drawers (3/9): QuizDrawer (link-existing) + HomeworkDrawer + PaperDrawer (each wraps the existing module's flow).
20. Status pill + transitions + reflection notes UI.
21. Export buttons + PDF download handling.
22. Quick Make rebrand — route move + page edits + nav update + 308 redirects.
23. Legacy lesson-plans route redirects.
24. SoC sweep + size sweep + acceptance smoke (live walkthrough).

Estimated scope: ~24 tasks. Comparable to Module 4 (22 tasks).
