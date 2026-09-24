# Teacher Phase 3F: One Quiz System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Campusly has one way to ask auto-marked questions: questions from the question bank. They are used as course quick checks, homework exercises, and lesson practice questions. The old Learning quiz, which stores its own copy of each question and only admins can build, retires:
- no new Learning quizzes or quiz-type homework can be made
- existing ones move to the question bank with a migration the school runs once
- what's already there keeps working until then

**Architecture:**
- Backend `Learning/quiz-migration.ts` is pure. It maps a Learning quiz's questions to question-bank documents and says which it can't move (matching questions).
- `scripts/migrate-learning-quizzes.ts` (`npm run migrate:learning-quizzes`) is a dry run by default; `--apply` writes. For each quiz:
  1. It finds a CAPS node for the quiz's subject and grade, using `service-academic-bridge`.
  2. It creates the questions.
  3. It moves quiz-type homework and homework templates to `exercise` with those questions.
  4. It moves lesson `quiz` materials to `practice_questions`.
  5. It closes the quiz and records `migratedQuestionIds`, so a re-run skips it.
- Refusals, with plain messages:
  - creating a Learning quiz (`POST /learning/quizzes`) returns 410
  - creating or updating homework (or a template) of type `quiz`
  - adding a lesson material of kind `quiz`
- Frontend: the homework wizard and list filter drop "Quiz". The admin Learning page's quiz tab says where quizzes went.

**Tech stack:** Express/Mongoose/zod/vitest; Next.js 16/React 19/vitest.

**Spec:** programme §2 ("three quiz systems"); §4 (Question bank: "Keep one"); §5, "What gets built": "one quiz system (the question bank plus course quiz attempts; the Learning quiz retires)".

## Global Constraints
- **Nothing breaks before the migration runs:** reading, taking and marking existing Learning quizzes and quiz homework keep working. Only creating new ones stops.
- **The migration is safe to run twice** (idempotent), is a dry run unless `--apply`, reports every quiz it can't move and why, and never deletes a quiz; it closes it.
- **School-scoped:** every query filters `schoolId` and `isDeleted: false`.
- **The `learning` module flag stays.** It also gates study materials, rubrics, submissions and learner progress.
- **Frontend rules (CLAUDE.md):** hooks make the API calls, files ≤ 350 lines, semantic tokens.

## Review Focus
1. **A quiz whose subject and grade have no CAPS node:** skipped and reported; its homework keeps working.
2. **A quiz with a matching or short-answer question:** matching is reported and left out (the quiz stays open if nothing could move); short answer becomes a short-answer question.
3. **Running the migration twice:** the second run changes nothing.
4. **A teacher with an old quiz-type homework open in the wizard:** saving it says plainly that quiz homework is now an exercise.
5. **A student mid-way through a quiz-type homework when the migration runs:** their submission still marks, or they get a clear message.

---

### Task 1: Map a Learning quiz to question-bank questions (backend, pure)
**Files:** Create `src/modules/Learning/quiz-migration.ts`; Test `src/modules/Learning/__tests__/quiz-migration.test.ts`.
- `questionsFromQuiz(quiz, ctx: { schoolId, subjectId, gradeId, curriculumNodeId, createdBy })` → `{ docs: QuestionDoc[], skipped: Array<{ index, reason }> }`.
  - mcq and true_false → type `mcq` / `true_false`, with options labelled A–E, `isCorrect`, and `answer` = the right option's text.
  - short_answer → `short_answer` with `answer` = correctAnswer.
  - matching → skipped: "Matching questions can't move to the question bank yet."
  - Every doc gets `marks` = points, `status: 'approved'`, `source: 'teacher'`, `tags: ['from_learning_quiz']`, and a cognitive level of knowledge/remember.
- `migrationPlan(quiz, links)` → a short line for the report ("Fractions (Grade 7 Maths): 8 questions, 2 homeworks, 1 lesson").
- [ ] RED → GREEN; commit.

### Task 2: The migration script (backend)
**Files:** Create `src/scripts/migrate-learning-quizzes.ts` with `migrateLearningQuizzes({ apply, schoolId? })` (the tested function) and a thin CLI; add the npm script; modify `Learning/model.ts` (`migratedQuestionIds`); Test `src/modules/Learning/__tests__/migrate-learning-quizzes.test.ts`.
- Tests (real Mongo):
  - A dry run changes nothing and reports the plan.
  - `--apply` creates the questions, moves homework, template and lesson material, and closes the quiz.
  - A second run is a no-op.
  - A quiz with no CAPS node is skipped with its reason, and its homework is untouched.
- [ ] RED → GREEN; commit.

### Task 3: Stop making new ones (backend)
**Files:** Modify `Learning/routes.ts` / `controller.ts` (create returns 410: "Quizzes are now made from the question bank. Set homework as an exercise, or add a quick check to a course."), `Homework/validation.ts` / `service.ts` (type `quiz` refused on create and update: "Quiz homework is now an exercise: pick questions from the question bank."), `Homework/template.service.ts`, `Lesson/validation.ts` (material kind `quiz` refused); Tests next to each.
- Existing read, submit and mark paths are unchanged, and their tests stay green.
- [ ] RED → GREEN; full backend suite; commit.

### Task 4: The teacher and admin screens (frontend)
**Files:** Modify `HomeworkWizardStep1.tsx` (no "Quiz"), `HomeworkListFilters.tsx`, `lib/homework-helpers.ts` (+ test), and the admin Learning page (the quiz tab becomes a short note pointing to the question bank and courses); delete the quiz builder components once nothing imports them.
- [ ] Browser: the homework wizard offers Exercise and the other types, but not Quiz; the admin Learning page shows the note; an existing quiz homework still opens.
- [ ] Commit.
