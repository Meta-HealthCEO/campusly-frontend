# Teacher Phase 3A: AI Course Builder, Outline First — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher builds a class-paced unit with AI: they pick class, subject, term and CAPS topics, the AI drafts an outline, they approve it, the items are written in the background, and they release the unit to their class.

**Architecture:**
- Reuse the Course / CourseModule / CourseLesson models and add unit fields.
- The outline is one AI JSON call, normalised by a pure function.
- Item generation runs through a BullMQ `course-generation` queue, with an in-process fallback when Redis is down. It reuses the existing generators:
  - `GenerationService.generateContent` for notes and worked examples (saved to the school library as ContentResources)
  - `generateAIQuestions` for quick checks (question bank questions)
- The frontend adds a scope form at `/teacher/courses/new` and a unit page at `/teacher/courses/[id]`. The unit page covers outline review, generation progress, item preview and release.

**Tech stack:**
- Backend: Express 5, Mongoose 9, BullMQ, zod, vitest (real Mongo through `MONGODB_TEST_URI`).
- Frontend: Next.js 16, React 19, Tailwind 4, base-ui, vitest (node, `tests/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-09-24-teacher-portal-programme.md` §5 (the AI course builder) and §7 decisions 2–3. Research: `.superpowers/research/phase3-courses.md`.

## Global Constraints

- **Unit shape:**
  - A unit is made of modules, one per CAPS topic (ATP weeks come with the topic).
  - Each module holds 3–6 items of 5–10 minutes each.
  - Every item shows its minutes and a CAPS reference.
- **Item kinds in 3A:** Notes, Worked example and Quick check (3–5 auto-marked questions). Lesson, Video, Homework and Module quiz come in later phases.
- **Order:** the teacher approves the outline before anything else is generated. Teacher edits are never overwritten.
- **Availability:** class-paced units first. Courses are core for every teacher, and free standalone teachers get a limited allowance. 3A sets that allowance at **2 AI units**.
- **Backend rules:**
  - Every query filters `schoolId` and `isDeleted: false`.
  - Aggregations cast ObjectIds.
  - Unique indexes are upserted.
- **Frontend rules (CLAUDE.md):**
  - No apiClient in pages or components.
  - No `any`.
  - `catch (err: unknown)`.
  - Files ≤ 350 lines.
  - Teacher semantic colour tokens only (the colour guard test).
  - Mobile first.
  - Dialogs use flex-col with a sticky footer.
- **Copy:** plain words from the teacher's side of the screen, sentence case, no "Submit".

## Review Focus

1. **AI not set up, or the free allowance is used up, when drafting.** The teacher sees the plain message and can try again. No half-made outline is left behind.
2. **One item fails to generate.** The others still finish, the failed item says so with **Try again**, and the unit can't be released until it's fixed or removed.
3. **Redrafting an outline after edits.** It replaces the outline cleanly (the old modules and items are soft-deleted). It is refused once the outline is approved.
4. **Releasing to a class with no learners, or to a class that isn't the teacher's.** There's a clear refusal, and nothing is half-published.
5. **Redis down.** Generation still runs in-process, and progress still moves.

---

### Task 1: Unit fields and the pure outline normaliser (backend)

**Files:**
- Modify: `src/modules/Course/model.ts`: add enums and fields.
- Create: `src/modules/Course/outline.ts`
- Test: `src/modules/Course/__tests__/outline.test.ts`

**Interfaces:**
- Produces:
  - `ITEM_KINDS = ['notes','worked_example','quick_check']`
  - `ItemKind`
  - `OutlineTopic { id; title; description; capsReference; weekNumbers }`
  - `OutlineItem { kind; title; minutes; objectives; capsRef; brief }`
  - `OutlineModule { title; curriculumNodeId; weekNumbers; objectives; items }`
  - `normaliseOutline(raw: unknown, topics: OutlineTopic[]): OutlineModule[]`
  - `buildOutlinePrompt(scope: { subjectName; gradeName; termNumber }, topics): { system: string; user: string }`

**Model additions:**

- **Course:**
  - `kind: 'catalogue'|'class_unit'` (default `'catalogue'`)
  - `scope: { gradeId, subjectId, termNumber, topicNodeIds[], classIds[] } | null`
  - `outlineStatus: 'none'|'drafted'|'approved'` (default `'none'`)
  - `generation: { status: 'idle'|'queued'|'running'|'done'|'failed', total, done, failed, message, startedAt, finishedAt }`, with every field defaulted
  - `aiGenerated: boolean` (default false)
- **CourseModule:**
  - `objectives: string[]`
  - `curriculumNodeId: ObjectId|null` (ref `CurriculumNode`)
  - `weekNumbers: number[]`
- **CourseLesson:**
  - `itemKind: ItemKind|null`
  - `minutes: number|null`
  - `objectives: string[]`
  - `capsRef: string`
  - `brief: string`
  - `genStatus: 'pending'|'generating'|'ready'|'failed'|null`
  - `genError: string`
  - `teacherEdited: boolean`

**Normaliser rules:**
- The input is `{ modules: [{ title, topicIndex (1-based), objectives[], items: [{ kind, title, minutes, objectives[], brief }] }] }`.
- Drop a module whose `topicIndex` doesn't name a topic.
- Keep at most 8 modules and at most 6 items per module.
- Drop items with an unknown kind or an empty title.
- Round `minutes` and clamp it to 5–10. Missing minutes becomes 8.
- Trim strings. Objectives are strings only, 4 at most.
- `capsRef` is the topic's `capsReference` or its title. `curriculumNodeId` and `weekNumbers` come from the topic.
- Drop a module with no items left.
- No modules at all throws `BadRequestError("The AI outline came back empty. Try again.")`.

- [ ] **Step 1: Write the failing tests.**

```ts
import { describe, it, expect } from 'vitest';
import { normaliseOutline, buildOutlinePrompt, type OutlineTopic } from '../outline.js';

const topics: OutlineTopic[] = [
  { id: 't1', title: 'Numbers, Operations and Relationships', description: 'Count to 99', capsReference: 'NOR', weekNumbers: [1, 2, 3] },
  { id: 't2', title: 'Patterns', description: 'Number patterns', capsReference: '', weekNumbers: [4] },
];

describe('normaliseOutline', () => {
  it('maps modules to their CAPS topic and clamps items', () => {
    const out = normaliseOutline({ modules: [
      { title: ' Counting to 99 ', topicIndex: 1, objectives: ['Count forwards', 3], items: [
        { kind: 'notes', title: 'Counting in tens', minutes: 14, objectives: ['a'], brief: 'Tens' },
        { kind: 'quick_check', title: 'Check', minutes: 2, objectives: [], brief: '' },
        { kind: 'video', title: 'Nope', minutes: 5 },
      ] },
      { title: 'Patterns', topicIndex: 2, items: [{ kind: 'worked_example', title: 'Extend a pattern' }] },
    ] }, topics);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ title: 'Counting to 99', curriculumNodeId: 't1', weekNumbers: [1, 2, 3], objectives: ['Count forwards'] });
    expect(out[0].items.map((i) => [i.kind, i.minutes, i.capsRef])).toEqual([['notes', 10, 'NOR'], ['quick_check', 5, 'NOR']]);
    expect(out[1].items[0]).toMatchObject({ kind: 'worked_example', minutes: 8, capsRef: 'Patterns' });
  });

  it('drops modules that point at no topic, and caps sizes', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ title: `M${i}`, topicIndex: 1, items: Array.from({ length: 8 }, (_, j) => ({ kind: 'notes', title: `I${j}` })) }));
    const out = normaliseOutline({ modules: [{ title: 'Ghost', topicIndex: 7, items: [{ kind: 'notes', title: 'x' }] }, ...many] }, topics);
    expect(out).toHaveLength(8);
    expect(out[0].title).toBe('M0');
    expect(out[0].items).toHaveLength(6);
  });

  it('refuses an empty outline in plain words', () => {
    expect(() => normaliseOutline({ modules: [] }, topics)).toThrow('The AI outline came back empty. Try again.');
    expect(() => normaliseOutline('nonsense', topics)).toThrow('The AI outline came back empty. Try again.');
  });
});

describe('buildOutlinePrompt', () => {
  it('numbers the CAPS topics so the AI can point at them', () => {
    const { user, system } = buildOutlinePrompt({ subjectName: 'Mathematics', gradeName: 'Grade 1', termNumber: 3 }, topics);
    expect(user).toContain('1. Numbers, Operations and Relationships');
    expect(user).toContain('2. Patterns');
    expect(user).toContain('Grade 1 Mathematics, Term 3');
    expect(system).toContain('JSON');
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run src/modules/Course/__tests__/outline.test.ts`. Expected: FAIL, because `../outline.js` doesn't exist yet.
- [ ] **Step 3: Implement `outline.ts` and the model fields.** Import `BadRequestError` from `../../common/errors.js`. The prompt asks for JSON only, 3–6 items per module, one quick check per module, 5–10 minutes per item, South African CAPS wording, and a `brief` sentence per item.
- [ ] **Step 4: Run the tests again.** Expected: 4/4 PASS.
- [ ] **Step 5: Commit** `feat(courses): unit fields and the outline normaliser`.

### Task 2: Allowance, create a unit, draft and approve its outline (backend)

**Files:**
- Modify: `src/modules/subscription/free-allowance.ts`
- Modify: `src/modules/subscription/entitlements.ts`
- Create: `src/modules/Course/service-class-unit.ts`
- Modify: `src/modules/ContentLibrary/service-generation.ts`: an optional `opts?: { skipUsageLimit?: boolean }`
- Test: `src/modules/Course/__tests__/class-unit.test.ts`

**Interfaces:**
- Consumes: `normaliseOutline` and `buildOutlinePrompt` (Task 1).
- Produces:
  - `FREE_COURSE_UNITS = 2`
  - `FreeAllowance.courseUnits { limit; used; remaining }`
  - `assertCourseGenerationAccess(schoolId, isStandaloneTeacher)`, which throws `AppError("You've used your free AI units. Upgrade to Pro to keep building units.", 402)`
  - `ClassUnitService.create(schoolId, actor, { classId, subjectId, termNumber, topicNodeIds, title? })`
  - `ClassUnitService.draftOutline(courseId, schoolId, actor, isStandaloneTeacher)`
  - `ClassUnitService.approveOutline(courseId, schoolId, actor)`
  - `enqueueCourseGeneration({ courseId, schoolId, lessonId? })`, which Task 3 provides and this task imports

**Rules:**
- **Creating a unit:**
  - The class must belong to the school.
  - The title defaults to `"<Subject> · <Grade> · Term <n>"`.
  - The slug is the slugified title plus a 6-character suffix.
  - `kind: 'class_unit'`; `scope.gradeId` comes from the class.
- **Drafting:**
  - Refused when `outlineStatus === 'approved'`, with "This outline is approved. Its items are being written."
  - Checks the allowance first (units drafted by AI are counted from courses with `aiGenerated: true`, including deleted ones).
  - Checks `checkUsageLimit(schoolId,'maxAiGenerationsPerDay')` once.
  - Topics are the scope's CurriculumNodes, not deleted, in the order given.
  - The AI call is `AIService.generateJSON(system, user)`.
  - On any throw, nothing is written.
  - On success, the old modules and items are soft-deleted and new ones created. Quick checks become `type 'quiz'` with `passMarkPercent: 50`; other kinds are `type 'content'`.
  - Sets `outlineStatus 'drafted'` and `aiGenerated true`.
- **Approving:**
  - Requires `'drafted'`.
  - Sets every item's `genStatus` to `'pending'`, `outlineStatus` to `'approved'`, and `generation` to `{status:'queued', total, done:0, failed:0}`.
  - Then enqueues.
- **Access:** only the owner (or an admin, principal or HOD, per `assertCanEditCourse`) can draft or approve.

- [ ] **Step 1: Write the failing tests.** Use a real Mongo test database, `vi.spyOn(AIService, 'generateJSON')` and `vi.mock('../../../jobs/course-generation.job.js', () => ({ enqueueCourseGeneration: vi.fn() }))`. The cases:
  - Creating a unit gives it a `class_unit` kind and a default title.
  - Drafting writes modules and items from the AI JSON, soft-deleting a previous draft.
  - Drafting throws, and writes nothing, when the AI throws.
  - A free standalone teacher is refused once 2 AI units exist (402 message).
  - Approving marks the items pending and queues the generation job.
  - Drafting after approval is refused.
  - Another teacher can't draft someone else's unit.
- [ ] **Step 2: Run the tests.** Expected: FAIL, because the module doesn't exist.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(courses): create a class unit, draft its outline with AI, approve it`.

### Task 3: Background generation (backend)

**Files:**
- Create: `src/modules/Course/service-course-generation.ts`
- Create: `src/jobs/course-generation.job.ts`
- Modify: `src/jobs/queues.ts`: add `courseGenerationQueue`
- Modify: `src/jobs/index.ts`: register the worker
- Test: `src/modules/Course/__tests__/course-generation.test.ts`

**Interfaces:**
- Produces:
  - `runCourseGeneration(courseId, schoolId, lessonId?)`
  - `enqueueCourseGeneration(data)`, which tries the queue and falls back to running in-process when the queue add fails or Redis is unreachable

**Rules:**
- Items with `genStatus 'pending'` (only `lessonId` when one is given) and `teacherEdited false` are generated three at a time.
- **Notes** use `GenerationService.generateContent(schoolId, createdBy, { curriculumNodeId: module.curriculumNodeId, type: 'study_notes', gradeId, subjectId, term, blockTypes: ['text'], difficulty: 2, instructions }, { skipUsageLimit: true })`. The instructions carry the title, brief, minutes, grade and objectives. The result sets `contentResourceId`.
- **Worked examples** are the same with `type 'worked_example'` and `blockTypes ['text','step_reveal']`.
- **Quick checks** use `generateAIQuestions({ count: 4, questionTypes: ['mcq','true_false'], difficulty: 'easy', schoolId, teacherId: createdBy, subjectId, gradeId, curriculumNodeId, topicHint })`. The result sets `quizQuestionIds`.
- **Each item** goes `generating` → `ready`, or `failed` with `genError` set to the error message. The course's `generation.done` or `generation.failed` is incremented atomically (`$inc`).
- **Status:** `generation.status` is `'running'` while items are being written. At the end it is `'done'`, or `'failed'` when every item failed. `finishedAt` is set, and `message` summarises the run.
- **A single-item retry** (`lessonId`) first sets that item back to pending and takes it off the failed count.

- [ ] **Step 1: Write the failing tests.** Mock `GenerationService.generateContent` and `generateAIQuestions` with `vi.spyOn` and `vi.mock`. The cases:
  - Every pending item becomes ready, and the counts and done status are right.
  - One failure leaves the others ready, with `failed: 1` and the item's `genError` set.
  - `teacherEdited` items are skipped.
  - A single-item retry only touches that item and fixes the counts.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.** The job file creates a `course-generation` worker with concurrency 1, which calls `runCourseGeneration`.
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(courses): unit items are written in the background`.

### Task 4: Routes, preview, retry and release (backend)

**Files:**
- Modify: `src/modules/Course/validation.ts`
- Modify: `src/modules/Course/routes.ts`
- Modify: `src/modules/Course/controller.ts` (or create `controller-class-unit.ts` if the file grows past 300 lines)
- Modify: `src/modules/Course/service-class-unit.ts`
- Test: `src/modules/Course/__tests__/class-unit-release.test.ts`

**Routes** (teacher and admin roles, as the existing routes do):
- `POST /courses/class-units`: create.
- `POST /courses/:id/outline`: draft or redraft.
- `POST /courses/:id/outline/approve`
- `GET /courses/:id/generation`: `{ outlineStatus, generation, items: [{ id, genStatus, genError }] }`
- `POST /courses/:id/lessons/:lessonId/generate`: retry one item.
- `GET /courses/:id/lessons/:lessonId/preview`: the item's blocks or questions, for the teacher. It reuses the student `resolveLessonSource` without the enrolment check.
- `POST /courses/:id/release` with `{ classIds }`:
  - Owner, admin, principal or HOD only.
  - Allowed only for class units whose items are all `ready`.
  - Each class must belong to the school and have learners, checked before any change.
  - Sets `status 'published'`, `publishedBy` and `publishedAt`, then enrols each class through `assignCourseToClass`.
  - Returns `{ classes: [{ classId, newEnrolments }] }`.
- **Owners:** a teacher can publish their own class unit this way. Catalogue courses keep the review flow.

- [ ] **Step 1: Write the failing tests.** The cases:
  - Release refuses a unit with a failed item, with "1 item still needs attention".
  - Release refuses a class with no learners, and the unit stays a draft.
  - Release publishes and enrols a class.
  - Preview returns the notes' blocks.
  - Another teacher can't release someone else's unit.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests, plus the Course tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(courses): release a unit to classes; preview and retry items`.

### Task 5: Courses on by default, and a ready-made demo unit (backend)

**Files:**
- Modify: `src/common/moduleConfig.ts`: export `STANDALONE_DEFAULT_MODULES`, which includes `'courses'`.
- Modify: `src/modules/Auth/service.ts` and `src/modules/Auth/standalone.service.ts` to use it.
- Create: `scripts/enable-courses-module.ts` and the npm script `migrate:courses-module`. It adds `courses` to every school's `modulesEnabled` with `$addToSet` and prints the count.
- Create: `src/scripts/teacher-demo/course-content.ts`, hand-written, and extend `seed-teacher-demo.ts` to seed a released unit "Numbers to 99 · Grade 1 Mathematics · Term 3":
  - 2 modules with 3 items each: notes, worked example and quick check.
  - Real ContentResources and QB questions.
  - Released to Grade 1 - A.
  - Three learners with some progress.
- Test: `src/common/__tests__/module-config.test.ts`: `STANDALONE_DEFAULT_MODULES` includes `courses`.

- [ ] **Step 1: Write the failing test.**
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**, then run the migration and the seed on dev.
- [ ] **Step 4: Run the test.** Expected: PASS. Then run the seed; its log names the unit.
- [ ] **Step 5: Commit** `feat(courses): courses on for every school; demo unit for the walkthrough`.

### Task 6: Unit types and pure helpers (frontend)

**Files:**
- Modify: `src/types/courses.ts`: add `CourseKind`, `ItemKind`, `ItemGenStatus`, `UnitScope`, `GenerationState`, and the new fields on `Course`, `CourseModule` and `CourseLesson`, all optional.
- Modify: `src/types/subscription.ts`: `FreeAllowance.courseUnits?`
- Create: `src/lib/course-unit.ts`
- Test: `tests/course-unit.test.ts`

**Produces:**
- `ITEM_KIND_LABEL`
- `moduleMinutes(m)`
- `unitMinutes(course)`
- `generationSummary(g)`, which returns `{ label, percent, active }`:
  - queued → "Waiting to start"
  - running → "Writing items: 5 of 12 ready"
  - done → "All 12 items ready"
  - done with failures → "11 of 12 ready · 1 couldn't be written"
  - failed → "The items couldn't be written"
- `releaseBlocker(course)`, which returns `string | null`:
  - "Approve the outline first"
  - "Items are still being written"
  - "1 item needs attention"
  - null when the unit can be released
- `defaultUnitTitle(subjectName, gradeName, term)`

- [ ] **Step 1: Write the failing tests** for each helper, with concrete values as above.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(courses): unit helpers`.

### Task 7: New unit form (frontend)

**Files:**
- Create: `src/hooks/useClassUnit.ts`, with `createUnit`, `draftOutline`, `approveOutline`, `retryItem`, `releaseUnit` and `previewItem`. Errors surface the server's message through toast plus a returned error string.
- Create: `src/hooks/useUnitTopics.ts`, which loads `GET /curriculum-structure/nodes?type=topic&subjectId&gradeId&termNumber`.
- Create: `src/components/courses/unit/UnitScopeForm.tsx`, with these fields:
  - Class: the teacher's classes.
  - Subject: the class's grade's subjects.
  - Term.
  - CAPS topics: a checklist with each topic's weeks, all ticked by default, at most 8.
  - Title: prefilled, and editable.
- Create: `src/app/(dashboard)/teacher/courses/new/page.tsx`.
  - On **Draft the outline** it creates the unit and drafts, showing "Drafting your outline. This takes about 20 seconds."
  - It then goes to `/teacher/courses/[id]`.
  - If the draft fails after the create succeeded, it still goes to the unit page, which offers Draft again.
- Modify: `src/app/(dashboard)/teacher/courses/page.tsx`:
  - The primary **New unit with AI** button links to `/new`.
  - Class units open `/teacher/courses/[id]`.
  - Catalogue courses keep `/edit`.

- [ ] **Step 1:** Verify in the browser as Thandi: the form lists Grade 1 - A, Mathematics, Term 3 and the Term 3 CAPS topics.
- [ ] **Step 2:** Without an AI key, Draft goes to the unit page, which shows the plain "AI isn't set up" message and **Draft the outline**.
- [ ] **Step 3:** Run tsc, lint and the colour guard.
- [ ] **Step 4: Commit** `feat(courses): start a unit with AI from your class and CAPS topics`.

### Task 8: The unit page (frontend)

**Files:**
- Create: `src/app/(dashboard)/teacher/courses/[id]/page.tsx`. It's a thin page that uses `useCourseBuilder(courseId)` for the tree plus `useClassUnit`. Catalogue courses redirect to `/edit`.
- Create `src/components/courses/unit/`:
  - `UnitHeader.tsx`: title, scope line, total minutes, status chip.
  - `UnitOutline.tsx`: modules, each with its weeks and objectives, and item rows.
  - `UnitItemRow.tsx`: kind badge, title, minutes, CAPS ref, gen status, **Try again** and **Remove** (outline stage only).
  - `UnitGenerationBanner.tsx`: polls `GET /generation` every 3 seconds while active, then refreshes the tree when done.
  - `UnitItemPreview.tsx`: a Sheet that renders blocks with the shared `BlockRenderer` or lists the quick check questions with their answers.
  - `ReleaseUnitDialog.tsx`: class checkboxes, defaulting to the scope's classes, and **Release to N classes**.
- **States:**
  - No outline: **Draft the outline**.
  - Drafted: **Redraft** and **Approve and write the items**.
  - Approved: the banner and item statuses.
  - All ready and still a draft: **Release to class**.
  - Published: "Released to Grade 1 - A" with a link to the analytics.

- [ ] **Step 1:** Verify in the browser with the seeded demo unit: modules, items and minutes show, and the preview renders notes, a worked example and quick check questions.
- [ ] **Step 2:** Verify in the browser with a unit whose outline is drafted by a stubbed request (set `outlineStatus 'drafted'` in the dev DB): approving without an AI key marks items failed with **Try again**, and the banner says the items couldn't be written.
- [ ] **Step 3:** Run tsc, lint, the full vitest suite and the colour guard.
- [ ] **Step 4: Commit** `feat(courses): the unit page: outline, progress, preview, release`.

---

## Self-review

- **Spec §5, steps 1, 3, 4, 5 and 9:** Tasks 2–4 and 7–8.
  - Step 2 (sources) is optional in the spec and deferred to 3B.
  - Steps 6 (per-item AI actions) and 7 (completion rules) are 3B.
  - Step 8 (data check) is 3B.
  - Step 10 (monitor) is 3D.
- **Decision 3:** Task 2 sets the allowance and Task 5 turns the module on.
- **Review Focus:** cases 1–4 have tests in Tasks 2–4. Case 5 is covered by the in-process fallback in Task 3, checked by hand with Redis stopped.
