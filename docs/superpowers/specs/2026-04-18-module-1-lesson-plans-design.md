# Module 1 — Lesson Plans (Production-Ready) — Design Spec

**Status:** Draft
**Date:** 2026-04-18
**Author:** Shaun + Claude
**Part of:** Teacher Portal Production-Readiness, module-by-module pass

## 1. Goal

Make lesson plans a production-ready spine of the teacher portal for a solo teacher: they can create a CAPS-aligned lesson, attach structured homework (quiz / reading / exercise — never free text), optionally AI-generate a draft, and download a properly-formatted PDF to use in class.

**Success criteria:**

- A solo teacher with one class can create a lesson plan start-to-finish in under 3 minutes, including AI assist.
- Every lesson plan is aligned to a CAPS curriculum node — no free-form "Maths — Fractions" lessons.
- Every homework attached to a lesson plan is a typed, structured `Homework` record (no free-text descriptions).
- PDF download is a clean, programmatically-laid-out document — not HTML-to-PDF — suitable for printing and sharing.
- Empty-state screens guide a fresh teacher through the prerequisites (create class, select grade/subject) without leaving the lesson-plan page.
- No `apiClient` imports leak into `/teacher/lesson-plans` pages or components.

## 2. Non-goals

Deferred to their own later modules:

- **Status workflow** (draft / published / archived). All plans go live on create. Revisit when multi-teacher schools become the target persona.
- **Clone / templates** — no "copy last year's plan" in this module. Defer to a Templates mini-module after Module 3.
- **Pacing integration** — attaching a lesson plan to a CAPS topic does not mark that topic as "covered." Deferred to a Curriculum Coverage module.
- **Version history** — updates overwrite. Deferred indefinitely.
- **Lesson plan sharing / collaboration** — each plan is private to its teacher. Deferred.
- **Building the Quiz module** — we reference the existing `Quiz` model ([Learning/model.ts:107](../../../../../../campusly-backend/src/modules/Learning/model.ts#L107)). Any work to build out quiz authoring UX is its own module.
- **Building the Question Bank** — we reference QuestionBank items for exercise-type homework. Question authoring UX is Module 4.

## 3. Core architectural decisions

### 3.1 PDF generation is programmatic (PDFKit), never HTML-to-PDF

Server-side only. Endpoint: `GET /lesson-plans/:id/pdf` returns `application/pdf`. Implementation: `pdfkit` (already a backend dependency). Frontend adds a single "Download PDF" button that streams the response.

**Why:** HTML-to-PDF (browser print, puppeteer, jsPDF with HTML) breaks on structured documents — page breaks land mid-section, typography is browser-dependent, headers don't pin. This is captured as a durable rule in user memory.

**Alternative rejected:** keeping `window.print()` as the primary artifact. Rejected — output quality is inconsistent across browsers and printers, and the product needs a professional-looking downloadable artifact for sharing with parents or archiving.

### 3.2 CAPS curriculum topic is required for every lesson plan

The lesson-plan form cannot be submitted without a `curriculumTopicId`. This is a bold product choice: it enforces the "CAPS is the spine" ethos from the first interaction.

**Why:** teachers who want "quick free-form" plans can use a plain notes app. Campusly's value is CAPS alignment, analytics, and structured data downstream. Letting plans exist without a topic would immediately fragment the data model.

**Alternative rejected:** leaving `curriculumTopicId` optional but hiding AI assist until it's set. Rejected — still leaves a class of plans that are dead-end data (can't be aligned, can't be measured, can't flow into pacing later).

**Escape hatch:** we carry a short `topic: string` field *in addition to* the required `curriculumTopicId`, letting teachers title the lesson in their own words ("Fractions — Practice" under the `Fractions` CAPS topic). This is a **display label**, not free-text content — it's analogous to a quiz title or homework title. The "nothing free text" principle applies to instructional *content* (homework tasks, question items, rubrics), not to human-readable labels.

### 3.3 Homework is always structured, never free text

Lesson plans no longer carry a `homework: string` field. They carry `homeworkIds: ObjectId[]`, each pointing to a typed `Homework` record. Each homework has a discriminator `type: 'quiz' | 'reading' | 'exercise'` and type-specific references to real entities.

**Why:** this is a cross-cutting platform principle (captured in user memory). Free-text homework is dead-end data — unable to be tracked, submitted, auto-graded, or analyzed. Structured homework unlocks submission tracking, AI grading, parent visibility, and completion analytics as downstream features.

**Blast radius:** the existing `Homework` model needs refactoring to add the discriminator + conditional refs. The database currently has zero `homework` documents, so this is a clean model change with no migration required.

### 3.4 Reflection notes stay private to the teacher

The `reflectionNotes` field remains free text (it is genuinely unstructured introspective content). It is **not** included in the downloadable PDF — the PDF is an artifact for use in class or sharing, not a journal.

## 4. Data model changes

### 4.1 `LessonPlan` ([campusly-backend/src/modules/LessonPlan/model.ts](../../../../../../campusly-backend/src/modules/LessonPlan/model.ts))

```ts
// Changed
curriculumTopicId: { type: ObjectId, ref: 'CurriculumNode', required: true }  // was optional

// Added
durationMinutes: { type: Number, default: 45, min: 5, max: 240 }
homeworkIds: { type: [ObjectId], ref: 'Homework', default: [] }

// Removed
homework: String  // was free-text; replaced by homeworkIds
```

All other fields unchanged (`teacherId`, `schoolId`, `subjectId`, `classId`, `date`, `topic`, `objectives[]`, `activities[]`, `resources[]`, `reflectionNotes`, `aiGenerated`, `isDeleted`, timestamps).

### 4.2 `Homework` ([campusly-backend/src/modules/Homework/model.ts](../../../../../../campusly-backend/src/modules/Homework/model.ts))

```ts
// Added (REQUIRED discriminator)
type: { type: String, enum: ['quiz', 'reading', 'exercise'], required: true }

// Added (type-specific refs, conditionally required)
quizId:             { type: ObjectId, ref: 'Quiz',            default: null }
contentResourceId:  { type: ObjectId, ref: 'ContentResource', default: null }
pageRange:          { type: String,   default: null }  // used with contentResourceId, e.g. "40-45"
exerciseQuestionIds:{ type: [ObjectId], ref: 'Question',      default: [] }

// Unchanged
title:       { type: String, required: true  }  // human-readable label for list UI

// Removed (enforces the "no free-text content" principle)
description: String   // was free-text instructions; instructions now live in the typed refs
resourceId:  ObjectId // superseded by contentResourceId
rubric:      String   // free text; revisit in a later module with structured rubrics
```

**Conditional validation** (in `validation.ts`, enforced at create and update):

- `type === 'quiz'` → `quizId` required, others null
- `type === 'reading'` → `contentResourceId` required, `pageRange` optional
- `type === 'exercise'` → `exerciseQuestionIds` required, min length 1

**Unchanged fields:** `classId`, `schoolId`, `teacherId`, `subjectId`, `dueDate`, `totalMarks`, `status`, `attachments`, `peerReviewEnabled`, `groupAssignment`, `maxFileSize`, `allowedFileTypes`, `isDeleted`, timestamps.

### 4.3 Migration

None required. Database currently holds 0 `lessonplans` and 0 `homeworks`. The model changes ship with the code. Mongoose strict mode will silently drop the removed fields (`homework`, `description`, `resourceId`, `rubric`) on any future save — acceptable because those fields are never populated in the current DB.

### 4.4 Transaction strategy

The MongoDB container (`campusly-mongo`) runs as a **standalone node**, not a replica set — so multi-document transactions are unavailable. All "atomic" create flows in this module must use **sequential creates with manual compensation**:

1. Create all staged Homework records first.
2. If any fails, soft-delete the ones already created and abort.
3. Create the LessonPlan with the resulting `homeworkIds`.
4. If the LessonPlan create fails, soft-delete the Homework records.

Implementation: a service helper `createLessonPlanWithStagedHomework(input, user)` in `LessonPlan/service.ts` that owns this compensation flow. No `mongoose.startSession()` / transactions anywhere.

## 5. Backend changes

### 5.1 Lesson plan endpoints ([campusly-backend/src/modules/LessonPlan/routes.ts](../../../../../../campusly-backend/src/modules/LessonPlan/routes.ts))

**Unchanged paths:**
- `POST /lesson-plans` — create
- `GET /lesson-plans` — list (paginated, filterable)
- `GET /lesson-plans/:id` — fetch one
- `PUT /lesson-plans/:id` — update
- `DELETE /lesson-plans/:id` — soft delete
- `POST /lesson-plans/ai-generate` — AI draft

**New path:**
- `GET /lesson-plans/:id/pdf` — stream PDF

**Validation updates** ([validation.ts](../../../../../../campusly-backend/src/modules/LessonPlan/validation.ts)):
- `curriculumTopicId` becomes required in create + update schemas
- `durationMinutes` optional, default 45, 5-240 range
- `homeworkIds` optional array of ObjectIds
- `homework` (free-text field) removed from schema

**AI generation** ([service-ai.ts](../../../../../../campusly-backend/src/modules/LessonPlan/service-ai.ts)):

The AI does **not** know the teacher's DB — it cannot output real `quizId` / `contentResourceId` / `questionIds`. It outputs **descriptive suggestions** that seed the HomeworkBuilder picker in the frontend. The teacher confirms each suggestion by picking a real entity (or skipping it).

Response shape:
```ts
type HomeworkSuggestion =
  | { type: 'quiz';     title: string; questionCount: number;             topicHint: string }
  | { type: 'reading';  title: string; pageRangeHint?: string;            topicHint: string }
  | { type: 'exercise'; title: string; questionCount: number;             topicHint: string }

// AI response:
{
  topic: string,
  objectives: string[],
  activities: string[],
  resources: string[],
  homeworkSuggestions: HomeworkSuggestion[]
}
```

- Prompt updated to request structured suggestions with `type`, `title`, and hints only — no fake IDs.
- Frontend pre-fills the HomeworkBuilder with suggestions; teacher must complete each by picking a real `Quiz` / `ContentResource` / `Question[]` before saving.
- Keep existing rate limit (30/hr/teacher) and model (`claude-sonnet-4-6`).

### 5.2 Homework endpoints ([campusly-backend/src/modules/Homework/routes.ts](../../../../../../campusly-backend/src/modules/Homework/routes.ts))

Paths unchanged. Validation updated to enforce the discriminator + conditional refs (see §4.2).

**New paths for an existing lesson plan** (routes live in `LessonPlan/routes.ts`, not Homework module — they are lesson-plan-scoped and update `homeworkIds`):
- `POST /lesson-plans/:id/homework` — create a typed Homework record and attach it to the plan; appends the new ID to the plan's `homeworkIds`
- `DELETE /lesson-plans/:id/homework/:homeworkId` — detach and soft-delete the Homework record; removes the ID from the plan's `homeworkIds`

**For new plans**, the `POST /lesson-plans` create endpoint accepts an optional `stagedHomework: Array<HomeworkInput>` field. On create, the backend follows the sequential create + manual compensation flow described in §4.4 (no transactions — DB is standalone).

**When to use each path (frontend decision tree):**
- New lesson plan (not yet saved) → stage homework in form state → submit all inline on `POST /lesson-plans`
- Existing plan, add homework → `POST /lesson-plans/:id/homework`
- Existing plan, remove homework → `DELETE /lesson-plans/:id/homework/:homeworkId`
- Lesson plan deletion cascade: when a lesson plan is soft-deleted, its attached Homework records are **also soft-deleted** (they can't exist orphaned — each homework is owned by one plan). Implementation: service-level cascade in `deleteLessonPlan`.

### 5.3 PDF generator

New file: `campusly-backend/src/modules/LessonPlan/pdf-generator.ts`

Pure function: `generateLessonPlanPdf(plan, school, teacher): Buffer`

**Layout:**
- Header: school name (bold, top-left), school logo if set (top-right), horizontal rule
- Title block: `plan.topic` (large), CAPS code + short reference (small, gray)
- Meta row: teacher name · class · subject · grade · ISO date · duration
- Section 1 — Lesson Objectives: bulleted list
- Section 2 — Activities: numbered list
- Section 3 — Resources: bulleted list
- Section 4 — Homework: grouped by type with type label ("Quiz:", "Reading:", "Exercise:"); each item shows its title + ref-specific details (page range for reading, question count for exercise)
- Reflection notes: **excluded**
- Footer: "Generated by Campusly" · `page X of Y`

**Styling:**
- A4, 15mm margins
- Base font: Helvetica (PDFKit built-in), body 11pt, headings 13pt bold
- Black text on white, gray `#666` for meta

**Controller** ([controller.ts](../../../../../../campusly-backend/src/modules/LessonPlan/controller.ts)):

```ts
async function getLessonPlanPdf(req, res) {
  const plan = await getLessonPlanById(req.params.id, req.user)  // enforces ownership via existing service
  const school = await School.findById(plan.schoolId)
  const teacher = await User.findById(plan.teacherId)
  const buffer = await generateLessonPlanPdf(plan, school, teacher)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="lesson-plan-${plan._id}.pdf"`)
  res.send(buffer)
}
```

**Authorization:**
- Route-level: existing `auth` middleware + `rbac(['teacher', 'school_admin', 'super_admin'])`.
- Ownership: the existing inline check at [LessonPlan/service.ts:94-95](../../../../../../campusly-backend/src/modules/LessonPlan/service.ts#L94-L95) (teacher must own the plan OR be a school admin) is duplicated in three places already (update, delete, and will be in PDF). This spec extracts it into a helper `assertLessonPlanAccess(plan, user)` in `LessonPlan/service.ts` and uses it from `updateLessonPlan`, `deleteLessonPlan`, `getLessonPlanPdf`, and the new attach/detach endpoints.

**Response strategy:** buffer the PDF in memory (typical lesson plan = 1–2 pages, well under 1 MB) and `res.send()`. Do not stream with `doc.pipe(res)` — error handling is harder when headers are already sent.

## 6. Frontend changes

### 6.1 Lesson-plan form — `src/components/lesson-plans/LessonPlanForm.tsx`

**Current violations** to fix:
- Curriculum topic dropdown is flat (all 100+ topics for a subject). Grade is **derived from the selected class** (each `Class` has a `gradeId`) — not a separate picker. The cascade is: **Class → (grade derived) → Subject filter → Topic searchable combobox**.
- `homework` `<Textarea>` removed entirely.
- AI button is always visible; disabled state shows tooltip "Select class, subject, date, and curriculum topic to enable AI."
- New `durationMinutes` number input, default 45.
- New `HomeworkBuilder` component in place of homework textarea.

**Field coherence rule:** when the teacher changes the selected `classId`, the form must clear `subjectId` and `curriculumTopicId` (different grade → different valid subjects → different valid topics). When they change `subjectId`, the form must clear `curriculumTopicId`. This is enforced in the form's effect hooks, and the backend double-checks on save (reject if topic's grade metadata doesn't match class's grade).

**`HomeworkBuilder` component** (new file `src/components/lesson-plans/HomeworkBuilder.tsx`):
- Shows list of attached homework as chip rows (title, type, remove button).
- "+ Add homework" button opens a typed picker dialog:
  - Step 1: pick type — Quiz / Reading / Exercise (three cards)
  - Step 2: depending on type, show the appropriate picker:
    - Quiz: search/select from existing `Quiz` records scoped to the plan's `schoolId` + `classId` + `subjectId` (Quiz has no `gradeId` — classId implies grade)
    - Reading: search/select `ContentResource` scoped to subject + grade, plus optional `pageRange` text field
    - Exercise: multi-select from Question Bank scoped to subject + grade
  - Step 3 (fields by type):
    - All types: `title` (required), `dueDate` (required)
    - `exercise`: `totalMarks` (required, number) — sum of selected question marks is the default
    - `quiz`: `totalMarks` is read-only, derived from the Quiz's `totalPoints`
    - `reading`: no `totalMarks` field (reading tasks aren't marked in this module)
- Confirm → for an existing plan: calls `POST /lesson-plans/:id/homework` and appends the result to the plan. For a new (unsaved) plan: stages the homework input in form state.

**Inline-vs-attach decision (frontend):**
- If the lesson plan has an `_id` (existing) → attach via `POST /lesson-plans/:id/homework`, refresh.
- If the lesson plan has no `_id` (being created) → stage in `form.stagedHomework[]`. On submit, `POST /lesson-plans` receives both the plan payload and the staged array; backend follows §4.4 compensation flow.

### 6.2 Detail dialog — `src/components/lesson-plans/LessonPlanDetailDialog.tsx`

- Replace `window.print()` button with a **"Download PDF"** button that calls `GET /lesson-plans/:id/pdf` and triggers a browser download.
- Remove all `print:*` CSS classes; they become dead code.
- Render structured homework list with type grouping (matches PDF layout).

### 6.3 List page — `src/app/(dashboard)/teacher/lesson-plans/page.tsx`

- New column: homework summary, rendered as compact text — e.g. `2 reading · 1 exercise`. No emojis.
- Empty state improved: if teacher has no classes, the empty state shows an inline "Create your first class" CTA that navigates to `/teacher/classes` with a return path.
- Empty state if classes exist but no plans: "Create your first lesson plan" primary button.

### 6.4 Hook — `src/hooks/useTeacherLessonPlans.ts`

- Add `downloadLessonPlanPdf(id: string): Promise<Blob>` method — calls the PDF endpoint with an Axios `responseType: 'blob'`, triggers a download.
- Add `attachHomework(planId, homeworkData)` and `detachHomework(planId, homeworkId)` methods.
- Extend AI-generate response handling: after receiving `homeworkSuggestions`, populate the staged-homework state in the form.
- **Separation of concerns:** all `apiClient` calls stay in this hook. Grep `src/app/(dashboard)/teacher/lesson-plans` and `src/components/lesson-plans` for `apiClient` imports and remove any.

### 6.5 Type updates — `src/types/`

- `LessonPlan` type: mark `curriculumTopicId` required, add `durationMinutes`, replace `homework: string` with `homeworkIds: string[]` (or populated `Homework[]` when detail fetched).
- New `Homework` type with discriminated union on `type`.

## 7. User flow (solo teacher happy path)

1. Teacher lands on `/teacher/lesson-plans` — empty state.
2. If no classes yet → inline CTA → teacher creates class in `/teacher/classes`, returns.
3. Clicks **New Lesson Plan**.
4. Picks class → grade is derived from the class → subject dropdown filters to subjects valid for that grade → topic searchable combobox filters to that subject's CAPS topics.
5. Enters date, lesson title, duration (default 45 min).
6. (Optional) Clicks **Generate with AI** → AI returns objectives, activities, resources, and homework **suggestions** (type + title + hints, no DB IDs).
7. Reviews AI output, edits objectives / activities / resources.
8. Homework section: for each AI suggestion, the HomeworkBuilder opens pre-filled with the suggested type and title — teacher picks a real Quiz / ContentResource / Question set to complete it. Or adds own homework from scratch via the builder.
9. Clicks **Create Plan** → backend follows §4.4 compensation flow: creates staged Homework records first, then the LessonPlan with `homeworkIds`. Rolls back if any step fails.
10. Back on list → clicks the plan row → detail dialog.
11. Clicks **Download PDF** → `GET /lesson-plans/:id/pdf` streams PDF, browser saves.
12. Teacher prints or brings laptop to class.

## 8. Risks

| Risk | Mitigation |
|---|---|
| MongoDB is standalone — no multi-doc transactions | Use sequential creates with manual compensation (§4.4). Never call `mongoose.startSession()`. |
| Quiz records don't exist yet — quiz picker shows 0 results | Acceptable on day 1. Teacher can still use reading/exercise types. Quiz authoring is a later module. |
| Question Bank is empty — exercise picker shows 0 results | Same. Teachers who want exercise-type homework will either use reading, or we accelerate Module 4 (Question Bank). |
| Content Library has 1,317 resources — picker performance | Pre-filter by current grade + subject server-side. Add text search. |
| AI hallucinates homework suggestions that don't map to real content | Suggestions are descriptive only (title, type, hints) — never IDs. Teacher must manually pick a real entity before saving. If no matching entity exists, they can skip the suggestion. |
| Teacher picks a curriculum topic then changes the class to a different grade | Form clears `subjectId` and `curriculumTopicId` on `classId` change (§6.1). Backend rejects save if topic's grade metadata doesn't match class's grade. |
| PDFKit font support for South African languages (isiZulu, Afrikaans diacritics) | Helvetica handles Latin-1 extended; confirm during implementation. If issues arise, switch to a bundled Unicode TTF (e.g., DejaVu Sans). |
| AI prompt change breaks existing flows | There are no existing integration tests for AI output. Manual smoke test during implementation. |
| Cascade-delete leaves orphan submissions | If a `HomeworkSubmission` exists for a Homework being soft-deleted, keep the submission (students' work shouldn't vanish). Mark the Homework as `isDeleted: true` but leave submissions readable from the grades module. |
| `Homework` refactor leaks schema changes to other modules that use the `Homework` model (e.g., submission flows) | DB has 0 homeworks, so no backfill needed. Grep consumers (`HomeworkSubmission`, existing `/teacher/homework` page, parent homework views) to confirm they only read fields that remain (`title`, `classId`, `subjectId`, `dueDate`, `totalMarks`, `status`). Consumers that read the removed `description`, `resourceId`, or `rubric` must be updated in-module before this lands. |

## 9. Testing

- **Backend:** service unit tests for `createLessonPlan` with required curriculum topic, PDF generator smoke test (buffer is non-empty, first bytes are `%PDF`), AI-generate structured homework shape assertion.
- **Frontend:** manual browser run — create a plan end-to-end, AI assist, download PDF, open the PDF, confirm layout.
- **DB verification:** `docker exec campusly-mongo mongosh campusly --eval "db.lessonplans.findOne()"` after smoke test.
- **Separation of concerns sweep:** `grep -r "apiClient" src/app/(dashboard)/teacher/lesson-plans src/components/lesson-plans` must return zero matches.

## 10. Out of scope for this spec (future modules)

- Module 2: Test / Paper Generation (AI-generate papers, PDF with diagrams via TikZ, memo export)
- Module 3: AI Marking — upload photo of handwritten paper → AI grades → push to gradebook
- Module 4: Question Bank build-out
- Module 5: Content Library polish
- Module 6: Assessment Structure polish
- Curriculum Coverage / Pacing (mark topic as covered from a lesson plan)
- Templates & Reuse (clone from prior year)
- Quiz module build-out

## 11. Acceptance criteria

- [ ] A solo teacher signing up from `/register-teacher` can create a CAPS-aligned lesson plan without leaving the lesson-plan page (or with a clear guided detour for missing classes)
- [ ] `curriculumTopicId` is enforced as required on create/update; backend rejects plans with no topic
- [ ] Changing `classId` in the form clears `subjectId` and `curriculumTopicId` automatically
- [ ] Backend rejects save if curriculum topic's grade metadata doesn't match the class's grade
- [ ] `homework`, `description`, `resourceId`, `rubric` fields are fully removed from models, validation, forms, and read paths
- [ ] A lesson plan with 3 homework items (one of each type) saves correctly and returns populated homework data on fetch
- [ ] Staged homework compensation works: if the LessonPlan create fails after Homework creates succeed, all the Homework records are soft-deleted before the error returns
- [ ] `GET /lesson-plans/:id/pdf` returns a valid PDF (starts with `%PDF`), shows homework grouped by type label, excludes reflection notes
- [ ] Soft-deleting a lesson plan cascades to soft-delete its attached Homework records, but preserves any `HomeworkSubmission` documents
- [ ] AI generate returns `homeworkSuggestions` (not free-text `homework`); frontend pre-fills HomeworkBuilder with each suggestion for the teacher to complete
- [ ] No `apiClient` imports exist under `/teacher/lesson-plans` pages or `lesson-plans` components
- [ ] Empty states are friendly and actionable (no blank screens, no "No data" dead ends)
- [ ] All changed files are under 350 lines; all `any` types replaced with exact types; no `text-red-*` classes
- [ ] `durationMinutes` is displayed on the list and in the PDF
