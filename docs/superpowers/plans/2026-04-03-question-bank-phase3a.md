# Question Bank Phase 3a — Backend + Teacher Question CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Question and AssessmentPaper backend models, question CRUD with review workflow, AI question generation, CAPS compliance checker, and teacher-facing question browser/editor UI.

**Architecture:** New `QuestionBank` backend module with Question model (10 question types, dual cognitive tagging, marks, media), AssessmentPaper model with sections/questions, compliance service. Frontend gets question browser, question form, and HOD question review.

**Tech Stack:** Mongoose/MongoDB, Zod v4, Express, Anthropic SDK, React 19 / Next.js, Tailwind CSS 4, shadcn.

**Spec:** `docs/superpowers/specs/2026-04-03-curriculum-content-engine-design.md` — Layer 3

**Phase 3a scope:** Question + AssessmentPaper models, question CRUD, review, AI generation, compliance service, teacher question browser/editor.
**Deferred to Phase 3b:** Paper assembly UI, AI paper generation, PDF generation, paper builder drag-and-drop.

---

## File Structure

### Backend — `campusly-backend/src/modules/QuestionBank/`

| File | Responsibility |
|------|---------------|
| `model.ts` | Question + AssessmentPaper + PaperSection + CapsComplianceReport schemas |
| `validation.ts` | Zod schemas for question CRUD, paper CRUD, generation, review, query |
| `service-questions.ts` | Question CRUD with role-based visibility + review |
| `service-generation.ts` | AI question generation via Anthropic SDK |
| `service-compliance.ts` | CAPS cognitive weighting compliance checker |
| `service-papers.ts` | Paper CRUD, add/remove questions, finalise, clone |
| `controller.ts` | HTTP handlers |
| `routes.ts` | Express router |

### Frontend — `campusly-frontend/`

| File | Responsibility |
|------|---------------|
| `src/types/question-bank.ts` | Types for Question, Paper, compliance, payloads |
| `src/hooks/useQuestionBank.ts` | API calls for questions + papers |
| `src/components/questions/QuestionCard.tsx` | Card showing question stem, type, marks, cognitive level |
| `src/components/questions/QuestionFormDialog.tsx` | Create/edit question with all fields |
| `src/components/questions/QuestionReviewDialog.tsx` | HOD review dialog |
| `src/components/questions/CompliancePanel.tsx` | Real-time CAPS compliance visualization |
| `src/app/(dashboard)/teacher/curriculum/questions/page.tsx` | Teacher question browser |
| `src/app/(dashboard)/teacher/curriculum/assessments/page.tsx` | Paper list + create |

---

## Task 1: Backend — Question + AssessmentPaper Models

**Files:**
- Create: `campusly-backend/src/modules/QuestionBank/model.ts`

Models to create:

**Question** with fields:
- curriculumNodeId (ObjectId ref CurriculumNode, required)
- schoolId (ObjectId ref School, nullable for system)
- subjectId (ObjectId ref Subject, required)
- gradeId (ObjectId ref Grade, required)
- type: enum [mcq, true_false, short_answer, structured, essay, match, fill_blank, calculation, diagram_label, case_study]
- stem (string, required, trim) — the question text
- media: array of subdoc { mediaType: enum [image, diagram, table], url: string }
- options: array of subdoc { label: string, text: string, isCorrect: boolean } (for MCQ/true_false)
- answer (string, default '') — model answer
- markingRubric (string, default '') — marking guide
- marks (number, required, min 1)
- cognitiveLevel: subdoc { caps: enum [knowledge, routine, complex, problem_solving], blooms: enum [remember, understand, apply, analyse, evaluate, create] }
- difficulty (number 1-5, default 3)
- tags (string array)
- source: enum [system, ai_generated, teacher]
- status: enum [draft, pending_review, approved, rejected]
- reviewedBy (ObjectId ref User, nullable)
- reviewedAt (Date, nullable)
- createdBy (ObjectId ref User, required)
- usageCount (number, default 0)
- isDeleted (boolean)
- timestamps

Indexes: (schoolId, status, isDeleted), (curriculumNodeId, isDeleted), (subjectId, gradeId, isDeleted), (cognitiveLevel.caps, isDeleted), (createdBy, status, isDeleted)

**AssessmentPaper** with fields:
- schoolId (ObjectId ref School, required)
- title (string, required)
- subjectId (ObjectId ref Subject, required)
- gradeId (ObjectId ref Grade, required)
- term (number 1-4)
- year (number)
- paperType: enum [class_test, assignment, mid_year, trial, final, custom]
- totalMarks (number, default 0)
- duration (number, minutes)
- sections: array of PaperSection subdoc
- instructions (string, default '')
- capsCompliance: CapsComplianceReport subdoc
- status: enum [draft, finalised, archived]
- createdBy (ObjectId ref User, required)
- isDeleted (boolean)
- timestamps

**PaperSection** subdoc: title, instructions, order, questions: PaperQuestion[]
**PaperQuestion** subdoc: questionId (ObjectId ref Question), questionNumber (string), marks (number), order
**CapsComplianceReport** subdoc: topicCoverage[], cognitiveDistribution, targetDistribution, compliant, violations[], difficultySpread

Commit: `git commit -m "feat(question-bank): add Question and AssessmentPaper models"`

---

## Task 2: Backend — Validation Schemas

**Files:**
- Create: `campusly-backend/src/modules/QuestionBank/validation.ts`

Schemas:
- `createQuestionSchema`: all question fields
- `updateQuestionSchema`: partial
- `reviewQuestionSchema`: { action: approve|reject, notes }
- `generateQuestionsSchema`: { curriculumNodeId, subjectId, gradeId, type, count (1-20), difficulty, cognitiveLevel }
- `questionQuerySchema`: filters (curriculumNodeId, type, cognitiveLevel.caps, difficulty, subjectId, gradeId, status, search, mine, marks range, page, limit)
- `createPaperSchema`: title, subjectId, gradeId, term, year, paperType, duration, instructions
- `updatePaperSchema`: partial of title, sections, instructions, duration
- `addQuestionToPaperSchema`: { sectionIndex, questionId, questionNumber, marks }
- `finalisePaperSchema`: {} (just triggers compliance check)
- `paperQuerySchema`: filters

Commit: `git commit -m "feat(question-bank): add Zod validation schemas"`

---

## Task 3: Backend — Question Service

**Files:**
- Create: `campusly-backend/src/modules/QuestionBank/service-questions.ts`

Methods:
- `listQuestions(schoolId, userId, userRole, filters)` — same visibility pattern as content library (system approved + school approved + own drafts, HOD sees pending_review)
- `getQuestion(id, schoolId, userId)` — single question
- `createQuestion(schoolId, userId, data)` — creates as draft
- `updateQuestion(id, schoolId, userId, data)` — creator can edit drafts
- `deleteQuestion(id, schoolId, userId, userRole)` — creator or admin
- `reviewQuestion(id, schoolId, reviewerId, data)` — HOD approve/reject
- `submitForReview(id, schoolId, userId)` — draft → pending_review

Commit: `git commit -m "feat(question-bank): add QuestionService with CRUD and review workflow"`

---

## Task 4: Backend — AI Generation + Compliance Services

**Files:**
- Create: `campusly-backend/src/modules/QuestionBank/service-generation.ts`
- Create: `campusly-backend/src/modules/QuestionBank/service-compliance.ts`

**Generation service:**
- `generateQuestions(schoolId, userId, data)` — generates N questions for a curriculum node
- Rate limit: 20/day per teacher (same as content library)
- Builds prompt with topic context, question type, difficulty, cognitive level
- Parses AI response into Question documents
- Saves as draft with source: 'ai_generated'

**Compliance service:**
- `calculateCompliance(paper)` — takes a paper with populated questions, returns CapsComplianceReport
- Sums marks per cognitive level, compares against target (from CurriculumNode metadata)
- ±5% tolerance
- Returns violations list and compliant boolean
- Also calculates topic coverage and difficulty spread

Commit: `git commit -m "feat(question-bank): add AI question generation and CAPS compliance checker"`

---

## Task 5: Backend — Paper Service

**Files:**
- Create: `campusly-backend/src/modules/QuestionBank/service-papers.ts`

Methods:
- `listPapers(schoolId, userId, userRole, filters)` — teacher sees own papers, HOD/admin see all school papers. Finalised papers only visible to creator + HOD + admin.
- `getPaper(id, schoolId, userId, userRole)` — with populated questions
- `createPaper(schoolId, userId, data)` — creates empty draft
- `updatePaper(id, schoolId, userId, data)` — update metadata/sections
- `addQuestion(id, schoolId, userId, data)` — add question to a section, recalculate compliance
- `removeQuestion(id, schoolId, userId, sectionIndex, questionOrder)` — remove, recalculate
- `finalisePaper(id, schoolId, userId)` — run compliance check, block if violations, set status finalised
- `clonePaper(id, schoolId, userId)` — clone as new draft

Commit: `git commit -m "feat(question-bank): add PaperService with CRUD, question management, and finalisation"`

---

## Task 6: Backend — Controller + Routes + Registration

**Files:**
- Create: `campusly-backend/src/modules/QuestionBank/controller.ts`
- Create: `campusly-backend/src/modules/QuestionBank/routes.ts`
- Modify: `campusly-backend/src/app.ts`

Controller handles all question and paper endpoints. Routes at `/api/question-bank`.

Route order (avoid shadowing):
- `/questions/generate` BEFORE `/questions/:id`
- `/papers/generate` BEFORE `/papers/:id`
- `/papers/:id/finalise`, `/papers/:id/compliance`, `/papers/:id/clone` BEFORE generic `/papers/:id`

Register: `app.use('/api/question-bank', authenticate, questionBankRoutes);`

Commit: `git commit -m "feat(question-bank): add controller, routes, and register /api/question-bank"`

---

## Task 7: Frontend — Types

**Files:**
- Create: `campusly-frontend/src/types/question-bank.ts`
- Modify: `campusly-frontend/src/types/index.ts`

Types for:
- QuestionType, QuestionSource, QuestionStatus, PaperType, PaperStatus
- CapsLevel, BloomsLevel
- QuestionMedia, QuestionOption, CognitiveLevelPair
- QuestionItem (full question with populated refs)
- PaperSectionItem, PaperQuestionItem
- CapsComplianceReport
- AssessmentPaperItem
- Payloads: CreateQuestion, UpdateQuestion, ReviewQuestion, GenerateQuestions, CreatePaper, UpdatePaper, AddQuestionToPaper
- Filters: QuestionFilters, PaperFilters

Commit: `git commit -m "feat(question-bank): add frontend types"`

---

## Task 8: Frontend — Hook

**Files:**
- Create: `campusly-frontend/src/hooks/useQuestionBank.ts`

Methods:
- Questions: fetchQuestions, getQuestion, createQuestion, updateQuestion, deleteQuestion, reviewQuestion, submitQuestionForReview, generateQuestions
- Papers: fetchPapers, getPaper, createPaper, updatePaper, addQuestionToPaper, removeQuestionFromPaper, finalisePaper, clonePaper, getCompliance

Commit: `git commit -m "feat(question-bank): add useQuestionBank hook"`

---

## Task 9: Frontend — QuestionCard + QuestionFormDialog + ReviewDialog

**Files:**
- Create: `campusly-frontend/src/components/questions/QuestionCard.tsx`
- Create: `campusly-frontend/src/components/questions/QuestionFormDialog.tsx`
- Create: `campusly-frontend/src/components/questions/QuestionReviewDialog.tsx`

**QuestionCard:** Shows truncated stem, question type badge, marks badge, cognitive level badge (CAPS), difficulty dots, status badge. Click handler.

**QuestionFormDialog:** Full form with: stem textarea, type selector, marks, difficulty, cognitive level (CAPS + Blooms dropdowns), options editor (for MCQ — add/remove options with isCorrect toggle), answer textarea, marking rubric textarea, media URL fields, tags input, subject/grade selectors, curriculum node picker.

**QuestionReviewDialog:** Same pattern as content ReviewDialog — shows question details, approve/reject buttons, notes field.

Commit: `git commit -m "feat(question-bank): add QuestionCard, QuestionFormDialog, and ReviewDialog components"`

---

## Task 10: Frontend — CompliancePanel

**Files:**
- Create: `campusly-frontend/src/components/questions/CompliancePanel.tsx`

Real-time compliance visualization showing:
1. Cognitive level distribution as horizontal bars (actual vs target, using destructive color for violations)
2. Total marks tally
3. Topic coverage checklist
4. Violations list with destructive text
5. Overall compliant/non-compliant badge

Props: `{ compliance: CapsComplianceReport | null, totalMarks: number, targetMarks: number }`

Commit: `git commit -m "feat(question-bank): add CompliancePanel for CAPS compliance visualization"`

---

## Task 11: Frontend — Teacher Question Browser Page

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/teacher/curriculum/questions/page.tsx`

Page with:
1. PageHeader
2. Filters: search, type, cognitive level, difficulty, status, subject, grade
3. "Create Question" and "Generate Questions" buttons
4. Grid of QuestionCards
5. Click opens question detail (edit dialog or navigate)
6. Loading + empty states

Commit: `git commit -m "feat(question-bank): add teacher question browser page"`

---

## Task 12: Frontend — Teacher Assessments Page (Paper List)

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/teacher/curriculum/assessments/page.tsx`

Page with:
1. PageHeader
2. List of papers as cards (title, subject, grade, term, status, marks, question count)
3. "Create Paper" button opens dialog for paper metadata
4. Click navigates to paper detail (Phase 3b — for now just shows paper info)
5. Loading + empty states

Commit: `git commit -m "feat(question-bank): add teacher assessments page with paper list"`

---

## Summary

| Task | What It Builds | Backend/Frontend |
|------|---------------|-----------------|
| 1 | Question + AssessmentPaper models | Backend |
| 2 | Validation schemas | Backend |
| 3 | QuestionService (CRUD + review) | Backend |
| 4 | AI generation + CAPS compliance | Backend |
| 5 | PaperService (CRUD + finalise + clone) | Backend |
| 6 | Controller + routes + registration | Backend |
| 7 | TypeScript types | Frontend |
| 8 | useQuestionBank hook | Frontend |
| 9 | QuestionCard + FormDialog + ReviewDialog | Frontend |
| 10 | CompliancePanel | Frontend |
| 11 | Teacher question browser page | Frontend |
| 12 | Teacher assessments page | Frontend |
