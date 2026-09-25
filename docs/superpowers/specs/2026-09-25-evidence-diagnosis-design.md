# Evidence and diagnosis — design (Phase E)

**Date:** 2026-09-25 · **Status:** draft by lane 3 for the orchestrator; fact-checked against backend master `56c2bef`, frontend main `0d42365` and the Blueprint branch `45317f6` · Phase E of the [readiness programme](2026-09-25-readiness-programme.md). Builds after Phase L ([learner portal](2026-09-25-standalone-learner-portal-design.md)), in the [Blueprint](2026-09-25-blueprint-design-system-design.md) look. Phase R is designed against §7. Inputs for R: [2026-09-25-phase-r-inputs.md](2026-09-25-phase-r-inputs.md).

Paths: backend paths are relative to `campusly-backend/src/modules/` unless they start with `src/`, `scripts/` or `node_modules/`; frontend paths are relative to `campusly-frontend/src/`. Line numbers are at the commits above.

## Intent

Every answered question becomes one evidence row: who answered, which CAPS topic and cognitive level it tests, the marks earned out of the marks available, where it came from, and what the learner wrote. For every answer that lost marks, AI says **why**, using a shared list of misconceptions for each subject and topic that grows over time. Phase R turns these rows into readiness.

Phase E's own visible payoff is small and immediate. On a marked test, script or homework, the teacher and the learner see why marks were lost on each answer, and the teacher sees the class's top three misconceptions on that test.

Success looks like this:
- The walkthrough in §12 passes at 375 px with no console errors and no failed API calls.
- The backfill turns existing marked work into evidence rows, with a dry run first.
- The measured AI cost per 100 answers is within 50% of the §6.6 estimate.

**Decided here (lane 3; the orchestrator confirms):**
- **One collection, one row per answered question per attempt.** The collection is `AnswerEvidence`. Each source's own service writes the rows right after it saves the mark, and writing twice gives the same result. The stream holds **per-question data or nothing**: sources that store only totals write no rows (§4.3).
- **Diagnosis is batched, cached and runs only on lost marks.** It runs on provisional marks, so the teacher sees reasons while reviewing. Learners see reasons only on final (issued) rows.
- **The misconception taxonomy is global data.** It is curriculum knowledge and holds no learner data. AI seeds it per topic the first time it is needed, AI proposals extend it, a weekly merge pass tidies it, and a super admin reviews it.
- **Diagnosis for standalone schools has its own monthly pool per school.** It is not taken from the teacher's AI actions (§6.7). The numbers are Shaun's decision at the Phase P gate.

Out of scope:
- readiness, mastery scores, predicted bands and paths (R)
- mock exams (M)
- reteach packs, briefings and notifications about misconceptions (P)
- explainers (V)
- parents
- any change to *how* a source marks, except the two capture fixes in §4.2 and the regrade bug in §10

## 2. Evidence-source audit

### 2.1 Summary

| Source | Record (collection) | Per-question marks | CAPS topic per question | Cognitive level per question | Learner's answer stored as | Per-question AI feedback | Final when |
|---|---|---|---|---|---|---|---|
| **Online test** (digital take, AI-marked) | `PaperSubmission` → `PaperMarking` | yes | bank questions yes; **inline questions no** | bank yes; inline no | typed text or MCQ label | `feedback` + `rationale` | teacher **issues** |
| **Photographed script** (AI marks handwriting) | `PaperMarking` (+ `MarkingBatch`) | yes | same as above | same as above | AI **transcription** of handwriting, plus archived page images (not split per question) | `feedback` + `rationale` | teacher **issues** |
| **Homework: exercise, reading** | `HomeworkSubmission` (`exercise` / `reading`) | yes | yes (via `Question`) | yes (via `Question`) | text | `rationale` | as soon as graded (AI or instant) |
| **Homework: quiz** | `HomeworkSubmission` (`quiz`) | yes | **no** (embedded quiz questions) | **no** | text / option | `rationale` | as soon as graded |
| **Course unit quick check** | `CourseQuizAttempt` | yes (earned only; max from `Question`) | yes (via `Question`) | yes (via `Question`) | option label or fill-blank text (`Mixed`) | none | at save (automatic marking) |
| **AI tutor practice** | `PracticeAttempt` | yes | **no**: free-text topic per attempt | **no** | text | `feedback` + `explanation` | at submit |
| **Content library** | `StudentAttempt` (one per block) | yes (all-or-nothing) | yes (`curriculumNodeId`) | yes (copied from block) | string (JSON-encoded for structured blocks) | none | at save (automatic marking) |
| **AI rubric grading** (essay) | `GradingJob` | per rubric criterion, not per question | no | no | `submissionText` | per criterion | teacher publishes |
| **Projects** | `TeacherAssignmentSubmission` | per rubric criterion | project-level `topicIds` only | no | files / text | per criterion | teacher marks |
| **Gradebook** | `Assessment` / `Mark` | **totals only** | no | no | none | none | on capture / publish |

### 2.2 Tests: online and photographed (the same marking record)

- **What the learner submits.** `PaperSubmission.answers[] {questionNumber, answer, selectedOption}` (`QuestionBank/model-submissions.ts:18-22, 43-50`), one per (paper, learner) (`:79-82`). Statuses are `in_progress → submitted → graded → published` (`:10-15`).
- **Question numbers.** A question's number is `section index + 1` "." `position + 1` (`QuestionBank/service-submissions-student.ts:258`). The marking memo uses the same convention (`AITools/service-marking.ts:229`).
- **Online marking.** On submit, `runAutoGrade` is fire-and-forget (`service-submissions-student.ts:384-401`). It calls `markPaperFromText` (`:403-422`); an MCQ answer is sent as its option label (`:415`). The AI's per-question JSON is written to `PaperMarking.questions[]` and the status set to `completed` (`AITools/service-marking-text.ts:99-107, 123`).
- **Photographed marking.** `markPaperFromImages` archives the page images (`AITools/service-marking.ts:80-84`) and asks the AI to transcribe and mark them, writing `[illegible]` where it cannot read (`:260-284`). It writes the same per-question shape (`:125-133`) and sets `needs_review` when the photographed paper is not the expected one (`:123`). Batch upload calls it once per learner (`AITools/service-marking-batch-confirm.ts:87`). Teacher-triggered marking spends the teacher's AI actions (`AITools/controller.ts:139, 179`; `controller-marking-batch.ts:50, 75, 84`).
- **Per-question fields.** `questionNumber, studentAnswer, correctAnswer, marksAwarded, maxMarks, feedback, rationale` (`AITools/model-marking.ts:3-11, 61-72`). There is no topic, level or question id on the marking. The link back to the question is the number the AI echoes.
- **Topic and level.** A paper question points to a bank `Question` or is **inline** (`questionId: null`, `QuestionBank/model-papers.ts:33-42`). A bank `Question` has a required `curriculumNodeId` and `cognitiveLevel {caps, blooms}`, with CAPS levels `knowledge | routine | complex | problem_solving` (`QuestionBank/model.ts:12-14, 128-142, 154`). **Inline questions carry neither.** This matters because the paper generator makes every AI-written question inline (`service-paper-gen-helpers.ts:249-253`). It builds them with a `capsLevel` and a node (`:320-338`, where the node is `topicIds[0]` even on multi-topic papers, or the *Subject* id when there are no topics), and then `toPaperQuestion` drops both (`:357-368`). "Save to bank" later defaults them to `topicIds[0]` and `routine` (`QuestionBank/service-paper-question-bank.ts:86-98`). The only topic data left on the paper is paper-level `topicIds` (`model-papers.ts:98, 242-250`).
- **Legacy `GeneratedPaper` markings** (`paperType: 'generated'`) have only a free-text `topic` and numeric question numbers (`AITools/model.ts:7-10, 36, 90`; `AITools/service-marking.ts:189-207`).
- **Teacher changes and issue.**
  - Before issue, `updateMarking` edits per-question marks and feedback; it refuses once the marking is published (`AITools/service-marking-queries.ts:47-92`, refusal at `:66-68`).
  - `issueMarking` publishes the **total** to the gradebook (`:183-191`), sets `published` and `issuedToStudent` (`:196-206`), and marks the submission `published` (`:209-217`).
  - Learners only ever read issued markings, with `aiRawResult` stripped (`AITools/controller-student-markings.ts:31-36, 97-103, 121`).
  - When a script is re-marked, the latest marking for each learner wins (`QuestionBank/service-paper-marking-workspace.ts:123-131`).

### 2.3 Homework

- **Types and links.** Homework types are `quiz | reading | exercise` (`Homework/model.ts:6, 37-41`). Exercise and reading questions are bank `Question` ids (`:45-54`). `subjectId` and `classId` live on the homework (`:55-56`), not on the submission.
- **Answer fields.** `studentAnswer, questionSnapshot, awarded, maxMarks, rationale, gradingMethod` (`:174-186`). Exercise and reading answers carry `questionId` (`:193-201`); quiz answers carry only `questionIndex` (`:188-191`) into the quiz's embedded questions, which have no topic or level (`Learning/model.ts:18-25`; optional `migratedQuestionIds` at `:101`). The code itself notes the gap: "homework records don't carry topic-level tags yet" (`AITutor/mastery.service.ts:12-13`).
- **One submission per learner.** One submission per (homework, learner) (`Homework/model.ts:230`), updated in place on resubmit (`service-homework-submit.ts:201-217`).
- **Marking.**
  - mcq, true_false and fill_blank are marked instantly (`service-homework-grading.ts:8-12`). Other types are sent for AI marking in the background (`service-homework-submit.ts:220-238`).
  - The background runner writes `awarded`, `rationale` and `gradingMethod` per answer (`service-homework-grading-runner.ts:184-203`).
  - It finalises `gradingStatus: 'graded'` (`:264-279`) with **no teacher step**, then auto-publishes the total (`:285-299`).
- **Teacher changes.**
  - The teacher override changes only the **total** (`Homework/service.ts:605-651`; body `{mark, feedback}` at `validation.ts:109-112`).
  - Regrade resets every answer to `pending` and re-runs AI (`service.ts:656-687`).

### 2.4 Course unit quick checks

- **Record.** `CourseQuizAttempt.answers[] {questionId, answer (Mixed), isCorrect, marks}` (`Course/model.ts:400-405, 423-431`), one attempt per try (`:451-454`).
- **Marking.** Automatic and all-or-nothing, for mcq, true_false and fill_blank only (`Course/service-progress.ts:544-561`), inside `submitQuizAttempt` (`:168-225`).
- **Links.** Questions are bank `Question`s, which give topic and level. The per-question maximum is `Question.marks`. Unanswered questions still count toward the total (`:201-206`).

### 2.5 AI tutor practice

- **Record.** `PracticeAttempt` embeds its generated questions with `marks, marksAwarded, isCorrect, studentAnswer, feedback, explanation` (`AITutor/model.ts:105-138`). `studentId` is a **User** id (`:160`), and `topic` is free text for the whole attempt (`:162`; `validation.ts:66`).
- **Marking.** Short answers are AI-marked; mcq and true/false are automatic (`AITutor/practice.service.ts:90-143, 253-260`). The mark is saved at submit (`:268`). Questions are generated, embedded and never saved to the bank (`:174-199`).
- **Subject link.** `subjectId` can be a CurriculumNode id rather than a Subject id (`AITutor/student-context.ts:90, 103-108`).

### 2.6 Content library

- **Record.** One `StudentAttempt` per block response, holding `curriculumNodeId` (required), `cognitiveLevel`, `correct/score/maxScore` and `response` (`ContentLibrary/model-tracking.ts:5-57`). It is written at `service-attempts.ts:239-255`.
- **Noise to exclude.** Text, image, video and step-reveal blocks always score full marks, and hotspot and code blocks always score 0 (`service-attempts.ts:158-169`).
- **StudentMastery.** Updated from these attempts (`:258-294`), and nothing else feeds it. The AI grade-attempt endpoint is stateless and stores nothing (`service-grade-attempt.ts:61-94`; `controller.ts:163-179`).

### 2.7 Totals-only and rubric sources

- **Gradebook.** `Mark` holds only `mark/total/percentage` (`Academic/model.ts:401-468`). `Assessment` has no topic or level (`:297-397`). Every publish path writes totals: papers (`Academic/service-gradebook-publish.ts:18-63`), homework (`:223-254`), projects (`:363-394`) and manual capture (`Academic/services/assessment.service.ts:156, 224`).
- **Rubric marking.** Projects mark per rubric criterion (`Assignment/model.ts:32-48, 184-189`) and have project-level `topicIds` (`:127-131`). AI essay grading (`GradingJob`) marks per criterion (`AITools/model.ts:119-246`; publish at `service-grading.ts:127-153`).

### 2.8 Curriculum and AI plumbing the design relies on

- **CurriculumNode.**
  - Types are `phase | grade | subject | term | topic | subtopic | outcome`.
  - It carries denormalised `subjectId` and `gradeId` refs pointing at *nodes*.
  - System nodes have `schoolId: null` (`CurriculumStructure/model.ts:5-12, 78-101`).
  - `metadata.cognitiveWeighting {knowledge, routine, complex, problemSolving}` exists (`:16-29, 57-76`) but is null on every seeded node (see the Phase R inputs).
  - The school `Subject` points at its node through `curriculumNodeId` (`Academic/model.ts:139, 190`).
- **AI.**
  - One model setting, `ANTHROPIC_MODEL`, defaulting to `claude-sonnet-5` (`src/config/env.ts:64`; `src/services/ai.service.ts:7`), with 5 concurrent calls (`:8`).
  - There is no batch method today. The installed SDK, `@anthropic-ai/sdk` 0.80.0, ships `messages.batches` (`node_modules/@anthropic-ai/sdk/resources/messages/batches.d.ts`).
  - Token logging goes to `AIUsageLog`, whose `teacherId` is required (`AITools/model.ts:250-283`).
  - The standalone allowance is `AIUsage` + `ai-allowance.ts`: Free 20 and Pro 500 actions per SAST month, counting **every** row of the school (`subscription/ai-allowance.ts:20-21, 47-68, 94-111`).
  - The Pro plan costs R149 a month (`subscription/seed.ts:42`).
- **Jobs.** Background jobs run on BullMQ and are all off when Redis is down (`src/jobs/index.ts:32-131`).

## 3. The `AnswerEvidence` record

New module `src/modules/Evidence/`. One document per answered question per attempt.

| Field | Type | Notes |
|---|---|---|
| `schoolId` | ObjectId → School, required | on every query |
| `studentId` | ObjectId → Student, required | practice maps its User id to a Student via `Student.findOne({userId, schoolId})` |
| `userId` | ObjectId → User, nullable | a learner added by the teacher may not have claimed an account yet (`Student/model.ts:31`) |
| `classId`, `subjectId`, `gradeId` | ObjectId, nullable | the school-side Class, Subject and Grade of the source |
| `topicNodeId` | ObjectId → CurriculumNode (`type: 'topic'`), nullable | see topic resolution below |
| `subtopicNodeId` | ObjectId → CurriculumNode (`type: 'subtopic'`), nullable | |
| `topicFrom` | `'question' \| 'paper_question' \| 'block' \| 'practice' \| 'ai_tag' \| 'none'` | how the topic was known; R can weigh AI tags lower |
| `cognitiveLevel` | `'knowledge' \| 'routine' \| 'complex' \| 'problem_solving' \| null` | the `CAPS_LEVELS` enum (`QuestionBank/model.ts:12-14`) |
| `marksAwarded`, `marksAvailable` | Number | `marksAvailable > 0`; rows with 0 available are not written |
| `source.type` | `'test' \| 'homework' \| 'unit_check' \| 'practice' \| 'library'` | |
| `source.channel` | `'online' \| 'photo' \| 'typed_by_teacher' \| null` | tests only: a `PaperSubmission` with no images is online; images is photo; otherwise the teacher typed it |
| `source.recordId` | ObjectId | PaperMarking, HomeworkSubmission, CourseQuizAttempt, PracticeAttempt or StudentAttempt |
| `source.parentId` | ObjectId | AssessmentPaper (or GeneratedPaper), Homework, course Lesson, PracticeAttempt or ContentResource; groups the class view |
| `source.itemKey` | string | test: normalised question number (`'2.3'`); homework exercise and reading: questionId; homework quiz: `q<index>`; quick check: questionId; practice: `q<index>`; library: blockId |
| `source.attemptNumber` | Number, default 1 | quick checks and library allow retries |
| `questionKey` | string | identifies *the same question* across learners (cache and class grouping). Bank question: `q:<questionId>`. Inline paper question: `p:<paperId>:v<version>:<itemKey>`. Homework quiz: `lq:<quizId>:<index>`. Library block: `cb:<resourceId>:<blockId>`. Practice: `pr:<attemptId>:<index>`, which never repeats. |
| `questionId` | ObjectId → Question, nullable | |
| `answer` | `{ kind: 'typed' \| 'choice' \| 'transcribed' \| 'structured', text (≤ 2,000 chars), truncated, hash }` | a capped copy, so diagnosis and R need no join back to six sources. Scripts also keep the pointer `source.recordId` (images live on the marking). |
| `markedBy` | `'deterministic' \| 'ai' \| 'teacher'` | teacher when the teacher changed this question's mark |
| `markerNote` | string ≤ 500 | the marker's `rationale` (or `feedback`), used as diagnosis context |
| `markedAt` | Date | |
| `status` | `'provisional' \| 'final'` | + `finalAt` |
| `totalOverridden` | Boolean | homework only: the teacher changed the total, not the questions (§4.4) |
| `diagnosis` | `{ state, typeId → MisconceptionType, explanation ≤ 240, confidence 0–1, cacheKey, skippedReason, diagnosedAt, dismissedBy, attempts }` | `state` is one of `none` (no marks lost), `pending`, `queued`, `ready`, `skipped`, `paused` (budget), `failed` or `dismissed` |
| `isDeleted` | Boolean | + `deletedReason: 'source_deleted' \| 'superseded' \| 'item_removed'` |
| timestamps | | |

**Idempotent upsert key (unique index, not partial):** `{ schoolId, 'source.type', 'source.recordId', 'source.itemKey' }`.
- A writer receives the **whole set of items for one record** and upserts each item with `bulkWrite`.
- Items of that record missing from the new set are soft-deleted with reason `item_removed` (replace-set semantics).
- An update that changes `answer.hash`, `marksAwarded` or `marksAvailable` resets `diagnosis` (see §6.1); otherwise the diagnosis is kept.

**Indexes:**
- `{ schoolId, studentId, subjectId, topicNodeId, markedAt: -1 }` (learner summaries)
- `{ schoolId, classId, subjectId, topicNodeId }` (class summaries)
- `{ schoolId, 'source.parentId', classId, isDeleted }` (class top three)
- `{ 'diagnosis.state', markedAt }`, partial on `state ∈ {pending, paused}` (job scan)
- `{ schoolId, 'diagnosis.typeId' }` (merges and counts)

**Topic resolution** (`Evidence/topic-resolver.ts`, cached per run). Load the node (`isDeleted: false`, `schoolId` null or the row's school), then:
- `subtopic` → subtopic is this node, topic is its parent when the parent is a `topic`
- `topic` → topic
- `outcome` → walk up to the first subtopic or topic
- `subject`, `term`, `grade`, `phase` or missing → null

A null topic means the row counts at subject level only.

**Answer normalisation** (`Evidence/normalise.ts`), used for the hash:
- NFKC, lower case, trimmed, whitespace collapsed
- spaces removed around `= + - × ÷ / ^ ( ) , ;`
- a trailing full stop dropped
- choice answers become the upper-case option label

## 4. How each source writes evidence

### 4.1 Hook points

Every writer is `await`ed after the source's own save, inside a `try/catch` that logs and never fails the learner's or teacher's request. A daily reconcile job (§5) catches anything a hook missed.

| Source | Hook (after) | Status written | Topic and level from |
|---|---|---|---|
| Test, online | `markPaperFromText` save (`AITools/service-marking-text.ts:124`) | provisional | paper question → bank `Question`, or the paper question's own tags (§4.2) |
| Test, photo | `markPaperFromImages` save (`AITools/service-marking.ts:151`); batch goes through the same function | provisional | same |
| Test, teacher edits | `updateMarking` save (`AITools/service-marking-queries.ts:90`) | provisional | same |
| Test, issue | `issueMarking` save (`AITools/service-marking-queries.ts:206`) | **final** (`finalAt = issuedAt`) | same |
| Homework, instant | `service-homework-submit.ts:225` (and after the upsert at `:218`, to drop superseded rows) | final | `Question` for exercise/reading; none for quiz |
| Homework, AI | after the `graded` update succeeds (`service-homework-grading-runner.ts:280`) | final | same |
| Homework, teacher total | `Homework/service.ts:634` | flags `totalOverridden` only | — |
| Homework, regrade | `Homework/service.ts:685` | pending answers' rows removed; rewritten at finalise | — |
| Quick check | `QuizAttempt.create` (`Course/service-progress.ts:212-225`) | final | the `questions` already loaded at `:168-172` |
| Practice | `attempt.save()` (`AITutor/practice.service.ts:268`) | final | `PracticeAttempt.curriculumNodeId` if present (§4.2), else none |
| Library | `StudentAttempt.create` (`ContentLibrary/service-attempts.ts:239-255`) | final | `curriculumNodeId` + `cognitiveLevel` on the attempt; only interactive graded blocks (not text/image/video/step_reveal, hotspot or code) |

**Test rules:**
- Markings with status `processing` or `failed`, or with no `studentId`, write nothing.
- The AI's `questionNumber` is normalised (drop "Q"/"Question", spaces, trailing dots) and matched to the `section + 1` "." `position + 1` label. A number that doesn't match writes a row with `topicFrom: 'none'`, and the unmatched count is logged per marking.
- When a new marking for the same (paper, learner) writes rows, the rows of older markings are soft-deleted with reason `superseded`. This matches `service-paper-marking-workspace.ts:123-131`.
- An answer the AI reports as unanswered (empty `studentAnswer` or "No answer provided") is written with `answer.text: ''`.
- Legacy `GeneratedPaper` markings write rows with `topicFrom: 'none'` and `questionKey: g:<paperId>:<n>`.

**Homework rule:** answers with `gradingMethod: 'pending'` are not written. A resubmission therefore removes its old AI-marked rows until the regrade lands.

### 4.2 Two capture fixes, so rows have a topic and level

1. **Paper questions keep their tags.** `IPaperQuestion` gains `curriculumNodeId: ObjectId | null`, `capsLevel: CapsLevel | null` and `tagFrom: 'generator' | 'teacher' | 'ai_tag' | null`, in both the interface and the schema (`QuestionBank/model-papers.ts:33-42, 148-167`).
   - `toPaperQuestion` copies the generator's node and level (`service-paper-gen-helpers.ts:357-368`), but never the Subject-id fallback (`:321-323`).
   - The generator prompt (`:264-270`) is given the paper's topic list with short codes and returns `topicCode` per question, so questions on a multi-topic paper get their own topic.
   - The add and patch question paths accept optional tags (`service-paper-questions.ts:79-86, 137-156`).
   - At **finalise**, any still-untagged questions are tagged with one AI call per paper. The candidates are the paper's topics and their subtopics; a candidate that is not a content topic (titles such as "Revision", "Trial Examination" or "Final NSC Examination") is replaced by the content topics of that subject and grade. The call is counted in the diagnosis pool (§6.7).
   - "Save to bank" uses these tags instead of `topicIds[0]` and `routine` (`service-paper-question-bank.ts:86-98`).
2. **Practice can carry a node.** `generatePracticeSchema` (`AITutor/validation.ts:62-72`) and `PracticeAttempt` gain an optional `curriculumNodeId`, and the generator returns `capsLevel` per question.
   - Today's free-text picker keeps working and writes rows with no topic.
   - R, M and P will pass the node when the path launches practice on a topic.

### 4.3 Sources that only have totals

The gradebook (`Mark`), project rubrics, AI essay rubrics (`GradingJob`) and marks captured by hand write **no evidence rows**:
- A total or a rubric criterion has no question, topic or level, so it cannot feed topic diagnosis.
- Mixing totals into the per-question stream would distort every per-topic sum.

If R wants term marks as context (e.g. "your term mark"), it reads `Mark` directly, labelled as such, and never blends them into topic mastery. A paper-mode test the teacher never AI-marks therefore produces no evidence. The teacher's marking tab already nudges AI marking, which does.

### 4.4 When a mark changes

- **Test before issue (`updateMarking`).** The writer re-syncs the rows.
  - `marksAwarded` changed and marks are still lost → `diagnosis` goes back to `pending`, and the new cache key usually hits if another learner gave the same answer.
  - Now full marks → `none`.
  - Nothing changed → the diagnosis, including a teacher's dismissal, is kept.
- **Test after issue.** Edits are refused today (`service-marking-queries.ts:66-68`). Re-issuing doesn't change questions, so final rows don't change.
- **Homework total override.** Rows keep the per-question awards (the questions are what was actually marked) and get `totalOverridden: true`, so R can give them less weight. There is no per-question override in homework (`Homework/service.ts:634`). Adding one is out of scope.
- **Homework regrade.** Pending answers' rows are removed; the finalise hook writes the new ones. A re-diagnosis happens only when the answer or marks changed, through the cache key.

## 5. Backfill and reconcile

- **`npm run migrate:paper-question-tags`** (`src/scripts/evidence-tag-paper-questions.ts`).
  - Dry run by default; `--apply` writes; `--school=<id>` to limit.
  - Tags inline questions on finalised papers that have markings: one AI call per paper, logged as `question_tagging`.
  - Prints papers, questions and the estimated cost before any call; with `--apply` it asks for `--yes` above R50.
- **`npm run migrate:evidence`** (`src/scripts/evidence-backfill.ts`).
  - Dry run by default; `--apply`; `--school`, `--source=test|homework|unit_check|practice|library`, `--since=YYYY-MM-DD`.
  - Walks PaperMarking (completed, needs_review or published; latest per learner and paper), graded HomeworkSubmissions, CourseQuizAttempts, completed PracticeAttempts and StudentAttempts.
  - Calls **the same writer functions** as the hooks, so running it twice changes nothing.
  - Prints per source: written, updated, unchanged, skipped (with reasons: no learner, unmatched number, informational block, zero marks available), plus the share of rows with a topic and with a level.
- **`npm run evidence:diagnose`** (`src/scripts/evidence-diagnose.ts`).
  - Dry run by default: rows that lost marks, rule-based diagnoses, expected cache hits, requests and **estimated cost**.
  - `--apply` submits through the normal job path; `--direct` uses the plain Messages API (dev and e2e); `--school`, `--limit`.
- **Order:** tag paper questions → evidence → diagnose.
- **Reconcile.** The evidence backfill runs daily as a repeatable job with `--since` set to 2 days ago. It also soft-deletes rows whose source record is soft-deleted (reason `source_deleted`), so every delete path is covered without touching each one. `AnswerEvidence` joins the school cascade list (`src/common/utils.ts:56-80`).

## 6. AI diagnosis of lost marks

### 6.1 What gets diagnosed

A row is a candidate when it lost marks, is not deleted, and its status is provisional or final. Provisional rows are diagnosed so the teacher sees reasons while reviewing; the learner never sees provisional rows. The job works through candidates in this order:

1. **Rules first, no AI.**
   - Empty answer → generic `unanswered`.
   - Full marks → `none`.
   - No topic → `skipped` (`no_topic`); these rows still count at subject level.
2. **Cache.** The key is `sha256(schoolId | questionKey | answer.hash | marksAwarded/marksAvailable)`. On a hit, copy `{typeId, explanation, confidence}` from `DiagnosisCache` and set `ready`. Identical wrong answers, which are common on MCQs and short numeric answers, are diagnosed once per school.
3. **Budget** (standalone schools, §6.7). Over the pool → `paused`.
4. **AI.** Cache misses, grouped by topic, are sent in packed batch requests (§6.5).

### 6.2 The taxonomy (`MisconceptionType`, global)

| Field | Notes |
|---|---|
| `code` | unique, stable. Topic types: `<topic node code>.<slug>`, e.g. `CAPS-MATHEMATICS-GR12-T1-FUNC.inverse-domain-not-restricted`. Generic types: `GEN.<slug>`. |
| `kind` | `misconception` (a wrong idea), `procedural` (a wrong or incomplete step), `generic` |
| `subjectNodeId`, `topicNodeId` | CurriculumNode ids; null for generic types |
| `label` | ≤ 60 chars, for teachers: "Domain not restricted on inverse" |
| `learnerLabel` | ≤ 60 chars, plain: "Didn't restrict the domain" |
| `description` | ≤ 300 chars: what it looks like in an answer. **Generalised, never a learner's words.** |
| `status` | `seeded` / `proposed` usable at once; `approved`; `merged` (+ `mergedInto`); `retired` |
| `origin` | `system`, `ai_seed`, `ai_proposed`, `reviewer` |
| `learnerVisible` | false only for `GEN.possible-marking-error` |
| `useCount`, `lastUsedAt`, `reviewedBy`, `reviewedAt`, timestamps | |

**Generic types** are seeded as data in `Evidence/taxonomy-generic.ts`. Each is listed below with its label and its learner-facing wording where that differs:
- `unanswered`: "Not answered", decided by rule
- `incomplete-answer`: "Answer incomplete"
- `no-working`: "Working not shown"
- `misread-question`: "Misread the question"
- `careless-arithmetic`: "Arithmetic slip"
- `units-notation`: "Units or notation"
- `wrong-method`: "Wrong method"
- `imprecise-terminology`: "Term or definition not precise"
- `possible-marking-error`: teacher only, "Check this mark". It is used when the diagnoser thinks the answer deserved more; the learner never sees it.

**Why global:** a misconception about inverse functions is the same in every school. Sharing the list lets counts compare across classes later (P, R), and it contains no learner data. Custom topic nodes a school creates (`schoolId` set) get their own types, visible only through that school's rows.

### 6.3 Seeding per subject and topic

- **When.** The first time a topic has a candidate row and no `seeded`/`approved` types, the job makes **one direct call** (not batched, so the next batch can use the codes).
- **Input.** Subject, grade, topic title, subtopic titles, `metadata.assessmentStandards` and `capsReference` (`CurriculumStructure/model.ts:23-29`), and the generic list.
- **Output.** 8–15 topic types with code slug, kind, both labels and a description.
- **Stored** as `seeded`, logged as `misconception_seed`.
- **Pre-seed.** `npm run evidence:seed-taxonomy -- --subject=<node code> [--apply]` seeds Grade 10–12 Mathematics, Physical Sciences and Accounting ahead of use. When Shaun supplies the DBE NSC diagnostic reports (Phase R inputs), their "common errors" sections are passed as grounding. That is the strongest source for real South African misconceptions.

### 6.4 New types, merging and review

- **Proposals.** The diagnosis prompt must choose one listed code or return `proposed {slug, kind, label, learnerLabel, description}`. A proposal is saved as `proposed` under that topic and used immediately for that row, so a new idea never blocks a result. Proposal text is length-capped and the prompt forbids quoting the answer.
- **Weekly tidy job (`evidence-taxonomy-tidy`).**
  - For each topic with new proposals, one AI call lists all the topic's types and returns duplicate pairs with a confidence.
  - A proposed→existing merge at confidence ≥ 0.9 is applied automatically.
  - Everything else goes to review.
- **Merge.** Sets `mergedInto` and re-points `AnswerEvidence.diagnosis.typeId` and `DiagnosisCache.typeId` with `updateMany`. Explanations are kept, since they were written for the answer.
- **Review.** One super-admin page, `/superadmin/misconceptions` (§8.3). The actions are approve, rename, merge into, and retire. Retiring sets rows' `typeId` to the topic's closest type chosen by the reviewer, or to `GEN.incomplete-answer`.

### 6.5 The pipeline and the prompt

- **Queue.** `evidence-diagnosis` in `src/jobs/queues.ts` with the same default options (`:18-23`). The worker is in `src/jobs/evidence-diagnosis.job.ts`.
- **Every 10 minutes (submit).**
  - Select up to 2,000 candidates oldest first, apply §6.1 steps 1–3, and dedupe misses by cache key.
  - Group the misses by topic and pack **up to 10 unique answers per request** (same topic, so they share one taxonomy block).
  - Create one Message Batch through new `AIService.createMessageBatch / retrieveMessageBatch / messageBatchResults` wrappers over `client.messages.batches.*`, on the configured model with no sampling parameters.
  - Save `DiagnosisRequest {batchId, customId, cacheKeys[], topicNodeId, schoolIds[], state}` and set the rows to `queued`.
- **Every 2 minutes (collect).**
  - For ended batches, stream the results and **key them by `custom_id`**, since results arrive in any order.
  - Validate each item with zod, as the marking services do (`AITools/validation-marking.ts`).
  - Write `DiagnosisCache`, then update all rows with that cache key to `ready`.
  - Errored or expired items go back to `pending` with `attempts + 1`; at 3 attempts the row becomes `failed`.
- **Direct mode.** `EVIDENCE_DIAGNOSIS_MODE=direct` sends the same requests through the plain Messages API. It is used for dev, e2e and the walkthrough. `EVIDENCE_DIAGNOSIS_ENABLED=false` switches diagnosis off entirely.
- **Request content.**
  - *System prompt:* role, rules and the output schema, then the generic list. *User message:* subject, grade, topic and subtopics, the topic's taxonomy (code, label, description), then up to 10 items.
  - Each item carries `ref`, question stem, model answer and marking guideline, marks awarded/available, the marker's note and the learner's answer.
  - **No names, ids or school.** The stem, memo and guideline come from the `questionKey` owner: bank `Question`, paper question, Learning quiz question, practice question or library block. They are resolved once per key per run.
- **Rules given to the model:**
  - Pick the single most specific code that explains the lost marks, or propose one.
  - `explanation`: one sentence to the learner, second person, ≤ 30 words. Say what went wrong and what to do instead. Don't mention marks, don't quote the answer back at length, and don't use the learner's name.
  - `confidence` 0–1.
  - `checkMark: true` when the answer seems to deserve the marks.
- **Output.** `{ items: [{ ref, code | proposed, explanation, confidence, checkMark }] }`.
- **Logging.** Each request is logged to `AIUsageLog` with the new type `evidence_diagnosis` and its token counts. The enum gains `evidence_diagnosis`, `misconception_seed` and `question_tagging` (`AITools/model.ts:250, 266-269`). `teacherId` is the teacher who owns the first row's source (paper `createdBy`, homework `teacherId`, class teacher for practice and library).

### 6.6 Cost per 100 answers (configured model)

Assumptions: 45 of 100 answers lose marks, 5 of them unanswered (rule, free); 15% of the remaining 40 hit the cache, leaving **34 AI-diagnosed answers in 4 packed requests**. Per request, a fixed ~1,750 input tokens (instructions + generic list + topic block + ~12 types). Per answer, ~370 input tokens (stem 90, memo and guideline 130, marks and marker note 60, answer 70, framing 20; photographed scripts ~420) and ~75 output tokens.

| Model (per MTok in/out) | Input tokens | Output tokens | Standard | Message Batches (−50%) |
|---|---|---|---|---|
| **`claude-sonnet-5` (configured, $2 / $10)** | 4 × 1,750 + 34 × 370 ≈ 19.6k → $0.039 | 34 × 75 + 80 ≈ 2.6k → $0.026 | **$0.065 ≈ R1.17** | **$0.033 ≈ R0.59** |
| `claude-haiku-4-5` (alternative, $1 / $5) | same | same | $0.033 ≈ R0.59 | $0.016 ≈ R0.29 |

The configured model at batch price comes to about **R0.017 per AI-diagnosed answer**. Not counted:
- *Prompt caching* of the fixed block. It is best-effort inside batches, and the block may be below the model's minimum cacheable prefix.
- *One-off costs.* Seeding is about $0.02 per topic (≈ $2.50 for Grade 10–12 Maths, Physical Sciences and Accounting). Tagging is about $0.02 per paper.

**Model choice is Shaun's.** The design uses whatever `ANTHROPIC_MODEL` says, so switching is a config change. Haiku halves the cost, but misconception labelling needs judgement on handwriting transcriptions and partial working. Measure on the walkthrough and backfill samples before deciding. The measured tokens per 100 answers go in the tracker at the end of E.

### 6.7 Where the spend is counted (proposal; decision for Shaun at the Phase P gate)

- **Not the teacher's AI actions.** Diagnosis is automatic, so the teacher never chooses to spend it. One class test (30 learners × 20 questions) produces ~270 lost-mark answers. Charging per answer, or even per test, would drain the Free allowance of 20 in a day and surprise Pro teachers.
- **A per-school monthly system pool.**
  - `AIUsage` gains `scope: 'system'`, alongside Phase L's `'teacher' | 'learner'` (learner spec §5), with action `diagnosis`.
  - One `AIUsage` document is written per AI-diagnosed cache key. Rule-based diagnoses and cache hits are free.
  - Paper-question tagging counts 1 per paper.
  - Proposed pool per SAST month: **Free 150, Pro 2,000** (trial counts as Pro, with the same entitlement rules). At the configured model and batch price, 2,000 answers ≈ $1.90 ≈ R35 at worst, about a quarter of the R149 Pro price. A typical Pro teacher uses less because of cache hits.
  - Over the pool, rows are `paused`: the teacher sees "Reasons paused until 1 Nov" and the learner sees nothing. Paused rows resume newest-first when the pool resets, and rows paused for more than 60 days become `skipped (budget)`.
- **School (non-standalone) users.** Unmetered, like all school AI today (`ai-allowance.ts:95, 109`), but logged, so the cost is known.
- **Seeding and the weekly tidy.** Platform cost; not charged to any school.
- **Dependency on Phase L.** L makes the teacher allowance count only `scope: 'teacher'`. If E lands first, E makes that change, because today `aiAllowance` counts every row of the school (`ai-allowance.ts:64`).

## 7. APIs

Mounted at `app.use('/api/evidence', authenticate, evidenceRoutes)` beside the question-bank mount (`src/app.ts:229`).

**Access rules:**
- *Teacher access to a record:* the paper's author or class teacher, or the homework's teacher, or a school admin role. It is the rule the marking roster uses (`QuestionBank/routes.ts:257-261`).
- *Teacher access to a learner:* the teacher teaches one of the learner's classes, using L's `learnerClassIds` (learner spec §3), or is a school admin role.
- *Learner:* the learner reads only their own **final** rows.
- *Scoping:* every query carries `schoolId`, and aggregations cast it to ObjectId.
- *Permissions:* if new capability keys are needed, both `permissions.ts` files and snapshots change together (frontend CLAUDE.md, item 11).

### 7.1 For the payoff

| Endpoint | Who | Returns |
|---|---|---|
| `GET /evidence/reasons?source=test\|homework&recordId=` | teacher (record access) or the owning learner | `{ items: LostMarksReasonItem[] }` |
| `POST /evidence/rows/:id/dismiss` · `POST /evidence/rows/:id/restore` | teacher (record access) | 204; a dismissed reason is hidden from the learner and doesn't count in the class view |
| `GET /evidence/class-misconceptions?parent=paper\|homework&parentId=&classId=` | teacher (class access) | `ClassMisconceptions` |

```ts
interface LostMarksReasonItem {
  rowId: string;
  itemKey: string;          // '2.3' for tests; questionId or 'q4' for homework
  position: number;         // index in the source's answers, for homework lists
  marksAwarded: number;
  marksAvailable: number;
  state: 'none' | 'working' | 'ready' | 'dismissed' | 'paused' | 'failed';
  reason: null | {
    typeId: string; label: string; learnerLabel: string;
    kind: 'misconception' | 'procedural' | 'generic';
    topicTitle: string | null;
    explanation: string;
    lowConfidence: boolean;  // confidence < 0.6
    checkMark: boolean;      // GEN.possible-marking-error
  };
}
```

**Learner view** (collapsed states):
- Only `none`, `working` and `ready`.
- `learnerLabel` in place of `label`.
- Low-confidence, check-mark and dismissed reasons become `none`.
- Provisional rows are never returned.

```ts
interface ClassMisconceptions {
  markedLearners: number;          // learners with evidence rows on this paper/homework in this class
  updatedAt: string;
  top: Array<{                     // misconception/procedural types shared by ≥ 2 learners; max 3,
    typeId: string; label: string; //   sorted by learners desc, then lost marks desc
    kind: 'misconception' | 'procedural';
    topicTitle: string | null;
    learners: number; lostMarks: number;
    questions: string[];           // item keys, e.g. ['2.1', '2.3']
    students: Array<{ studentId: string; name: string; recordId: string }>;
  }>;
  generic: Array<{ typeId: string; label: string; learners: number }>; // up to 3
  marksToCheck: number;            // rows with checkMark
  working: number;                 // rows still pending/queued
}
```

### 7.2 For Phase R (the evidence summary contract)

R's readiness model runs on the server and calls the service directly: `EvidenceSummary.learnerTopics({ schoolId, studentId, subjectId, from?, to? })`. The HTTP endpoints return the same shapes.

| Endpoint | Who |
|---|---|
| `GET /evidence/learners/:studentId/topics?subjectId=&from=&to=` | teacher (learner access) |
| `GET /evidence/me/topics?subjectId=` | the learner |
| `GET /evidence/classes/:classId/topics?subjectId=` | teacher (class access) |
| `GET /evidence/learners/:studentId/rows?subjectId=&topicNodeId=&cursor=&limit=50` · `GET /evidence/me/rows?…` | teacher / learner, for drill-down |

```ts
interface LearnerTopicEvidence {
  studentId: string; subjectId: string; asOf: string;
  topics: Array<{
    topicNodeId: string; topicTitle: string; topicCode: string;
    marksAwarded: number; marksAvailable: number; answers: number;
    firstAnsweredAt: string; lastAnsweredAt: string;           // recency
    byLevel: Record<'knowledge' | 'routine' | 'complex' | 'problem_solving' | 'unknown',
      { awarded: number; available: number; answers: number }>;
    bySource: Record<'test' | 'homework' | 'unit_check' | 'practice' | 'library',
      { awarded: number; available: number; answers: number }>;
    weekly: Array<{ weekStart: string; awarded: number; available: number; answers: number }>; // SAST Mondays, last 26 weeks
    subtopics: Array<{ subtopicNodeId: string; title: string; awarded: number; available: number; answers: number }>;
    misconceptions: Array<{ typeId: string; code: string; label: string; learnerLabel: string;
      kind: 'misconception' | 'procedural' | 'generic'; count: number; lastSeenAt: string }>;
    aiTaggedShare: number;   // share of rows whose topic came from 'ai_tag'
  }>;
  untagged: { awarded: number; available: number; answers: number }; // subject level only
}
```

**Summary rules:**
- Only **final**, non-deleted rows count.
- Rows are raw: no weighting, decay or confidence. Those are R's decisions.
- `totalOverridden` and `topicFrom` are exposed on rows so R can weigh them.
- The class shape is the same per topic, with `learners` in place of per-learner fields and misconceptions counted in learners.

## 8. Screens (Blueprint)

Rules for every screen here:
- Colour only in solid marks: 8px dots and solid bars in `mark-weak` (#EA580C) on neutral tracks. No tinted surfaces, pastel chips or `bg-x/10`.
- Surfaces are white cards on #F3F5FA.
- Hanken Grotesk for numbers (tabular), Source Sans 3 for text.
- Touch targets ≥ 44 px on phones.
- Every data view has designed loading, empty and error states.
- New files ≤ 300 lines.
- All API calls live in hooks (`useLostMarkReasons`, `useClassMisconceptions`, `useMisconceptionTypes`) with types in `types/evidence.ts`.

### 8.1 "Why marks were lost" on each answer (`components/evidence/LostMarksReason.tsx`)

**Where it appears:**
- inside `MarkingQuestionCard` (`components/ai-tools/MarkingQuestionCard.tsx`, 90 lines), which is used by the teacher's review (`MarkingResults`, `PaperMarkingReviewDialog`) and the learner's `StudentMarkingReview` (`:89-99`)
- in homework results: the teacher's `HomeworkSubmissionsTable` answer rows (`:241-247`) and the learner's read-only results in `ExerciseSubmissionForm` (`:95`), `QuizSubmissionForm` (`:121`) and `ReadingSubmissionForm` (`:110`)

The parent passes the matching `LostMarksReasonItem`.

**Layout:**
- It sits under the answer, after a hairline border-top, inside the same white card.
- Eyebrow: "Why marks were lost" for the teacher, "Why you lost marks" for the learner (11.5 px uppercase, muted).
- The label line is set like the Blueprint `weak` dot badge (`components/ui/badge-variants.ts`: 8 px solid dot, foreground text, no fill), but as a **wrapping** 15 px semibold line rather than a nowrap pill, so long labels work at 375 px.
- The explanation sentence follows, in 15 px muted text.
- Teacher-only additions:
  - a caption "Functions · topic misconception" (or "General")
  - "Low confidence" where it applies
  - a ghost **Not right** button (`min-h-11` on phones), which dismisses the reason and leaves "Hidden from the learner · Undo"

**States:**

| State | Teacher sees | Learner sees |
|---|---|---|
| `working` | "Working out why…" with one skeleton text line (no spinner) | same |
| `paused` | "Reasons paused until 1 Nov (this month's AI limit)" | nothing |
| `failed` | "Couldn't work out why" (the job retries on its own) | nothing |
| `checkMark` | "Check this mark: this answer may deserve credit" plus the sentence, instead of a misconception | never |
| full marks or no reason | nothing (no empty block) | nothing |

### 8.2 "Where the class lost marks" (`components/evidence/ClassMisconceptions.tsx`)

**Where it appears:**
- On the paper's **Marking** tab, inside each class card, between the header and the roster (`components/papers/PaperDetailMarkingTab.tsx:110-140`).
  - That file is 322 lines. The class card is first extracted to `MarkingClassCard.tsx` so both files stay under 300.
- On the teacher's homework detail page, above the submissions table.

**Layout:**
- Header: "Where the class lost marks" (17 px), with the caption "From 24 marked scripts · updated 10:42".
- Up to three rows. Each row has:
  - the rank numeral (Hanken, tabular, muted)
  - the label (semibold) with the topic as a caption beneath
  - on the right, "11 learners" (tabular)
  - under the text, a 6 px bar: neutral `bg-muted` track, solid `mark-weak` fill at `learners / markedLearners`. This is the same idiom as `components/readiness/MarksToGain.tsx`.
- Each row is a disclosure button. Opening it lists the learners (links to their marking review) and the questions ("Q2.1, Q2.3"), which is what the teacher needs to reteach.
- Below the rows, one muted line: "Also common: Arithmetic slip (6) · Not answered (4)". Then, if any, "3 marks to check", which scrolls to the first flagged script.
- At 375 px, the count moves under the label, and the bar spans the full width.

**States:**
- *Loading:* three skeleton rows matching the final layout.
- *Empty:* "Reasons appear here once scripts are marked."
- *No pattern yet:* "No shared patterns yet. Each reason so far is one learner's."
- *Still working:* "Working out why for 5 more answers…" in the caption.
- *Error:* `ErrorState` with Retry.

### 8.3 Super-admin review (`app/(dashboard)/superadmin/misconceptions/page.tsx`)

- One `DataTable` of types. Columns: subject, topic, label, kind, status, uses, created. It is filtered to `proposed` by default.
- Row actions: Approve, Rename (a dialog with both labels and the description), Merge into (a select of the same topic's types), Retire.
- The dialogs use the flex-col, sticky-footer pattern.
- Pending tidy-job merge suggestions show as a "Suggested merge" line on the row.
- There is no other admin UI.

## 9. Privacy, tenancy and soft delete

- **`schoolId` on every read, write and aggregation**, including job scans. Aggregations cast `schoolId` to an ObjectId.
- **No cross-school sharing of learner data.** `DiagnosisCache` is keyed with `schoolId`, and the taxonomy holds no learner words (§6.2, §6.4).
- **What leaves for the AI provider.** Answers of minors go to Anthropic without names or identifiers, as they already do for marking. The diagnosis prompt omits the learner's name, which today's marking prompt includes (`AITools/service-marking-text.ts:143`).
- **Learner endpoints** return only the learner's own final rows and learner-safe fields: no confidence, check-mark, dismissed or teacher-only types, and no `markerNote`.
- **Soft delete only.**
  - Rows are soft-deleted with a reason when their source is deleted, superseded or an item is removed.
  - Rows are covered by the school cascade (`src/common/utils.ts:56-80`).
  - Every query filters `isDeleted: false`.
  - Rows are never hard-deleted.
- **Retention.** Retention matches the source records. E adds none of its own.

## 10. Risks and rulings

| Ruling | Why | Cost if wrong |
|---|---|---|
| Per-question or nothing: totals-only sources write no rows | Totals can't say which topic was weak, and blending them skews every topic sum | R shows less evidence for teachers who only capture marks by hand. The fix is to AI-mark, which the marking tab already offers. |
| Inline paper questions get tags from the generator, the teacher, or one AI call at finalise; the backfill tags old papers | Most test questions are inline, and without tags most test evidence would have no topic | Some AI tags are wrong. `topicFrom: 'ai_tag'` lets R weigh them lower. Teachers can re-tag in the editor (a follow-up). |
| Script answers are matched by the AI's echoed question number | Nothing else links a marked answer to its question | Unmatched rows lose their topic. The backfill prints the unmatched share, and if it is above 5% the marking prompt gets "use exactly these numbers" (a one-line prompt change). |
| Diagnose provisional rows; learners see final only | The teacher's review is where "why" helps most | A reason may be re-bought after a mark change. The cache and the "only if changed" rule keep that rare. |
| Message Batches by default | Half the price; nobody is waiting on the second | Most batches finish within an hour, but can take up to 24 h. A learner may open a result that says "Working out why…". Direct mode is one env switch. |
| One global taxonomy, seeded by AI, extended by proposals, auto-merged at ≥ 0.9 confidence, reviewed by a super admin | Shared counts, and nothing is blocked | Duplicate types split the class top three until the tidy job merges them. A wrong auto-merge is undone by un-merging in review; the rows are re-pointed back from `DiagnosisRequest` history. |
| Learners see only reasons with confidence ≥ 0.6, and never "check this mark" | A wrong reason misleads a learner more than a missing one | Fewer reasons for learners. The threshold is a constant. |
| Homework teacher override touches the total only; rows keep per-question awards, flagged | Homework has no per-question override | Rows and total disagree for a few submissions; R can give flagged rows less weight. |
| Practice rows without a node are written but not diagnosed | Free-text topics can't be diagnosed against a taxonomy | Practice gives subject-level evidence only until R/M launch practice by node. |
| Quick checks and library attempts count every attempt as a row | They are genuine separate attempts; R decides recency | R must not double-count retries as mastery; `attemptNumber` is on every row. |
| `StudentMastery` and the tutor's free-text mastery stay as they are in E | Their readers are replaced by R's readiness model | For one phase there are two sources of truth. Nothing new reads the old ones. |
| Diagnosis spend is a system pool, not teacher actions (numbers for Shaun) | It is automatic and per answer | The numbers are estimates. A heavy class might pause reasons mid-month (raise the pool), or the cost may run over plan (lower it or switch model). |
| **Found in the audit, fixed in E:** homework regrade gives multiple-choice quiz answers 0, because the runner rebuilds quiz questions with `options: []` (`service-homework-grading-runner.ts:165`) | It would write wrong evidence | — |
| **Found, flagged (outside E):** one failed AI answer in homework is skipped, but the submission is still finalised as graded (`service-homework-grading-runner.ts:193-197`) | E writes no row for the pending answer | The learner's total is understated until a regrade. |
| **Found, flagged (outside E):** the bundled Claude API reference (cached 2026-06-24) says Sonnet 5 rejects `temperature` with a 400, yet `ai.service.ts:98, 140, 185` always send it on the default `claude-sonnet-5` | E's batch requests send no sampling parameters | If the reference is right, every existing AI call fails on the default model. **Check with one live call before E starts.** |

## 11. Testing

Test-first. Backend tests use vitest against Mongo (throwaway container with `MONGODB_TEST_URI`); frontend tests use vitest for pure helpers and components.

**Writers, one fixture per source:**
- test online with bank + tagged inline + untagged inline questions
- photographed script with an unmatched number and an `[illegible]` answer
- legacy generated paper
- homework exercise, reading and quiz (pending answers skipped)
- quick check retried twice
- practice with and without a node
- library, with informational, hotspot and code blocks excluded

**Idempotency and changes:**
- Running any writer twice gives identical rows.
- The backfill run twice changes nothing.
- A re-mark supersedes older markings.
- A removed item is soft-deleted.
- A resubmission drops AI rows until regraded.
- `updateMarking` resets the diagnosis only when the answer or marks changed.
- Issue flips provisional → final.

**Topic and tags:**
- the topic resolver on every node type
- generator tags survive `toPaperQuestion`
- multi-topic papers tag per question
- finalise tags leftovers
- "Save to bank" keeps the tags

**Diagnosis (AI mocked):**
- rules (unanswered, full marks, no topic)
- cache key and normalisation
- packing ≤ 10 per request, same topic
- batch results out of order, keyed by `custom_id`
- invalid JSON / expired → retry, then failed
- unknown code → proposal
- seeding on first use
- tidy auto-merge ≥ 0.9 re-points rows and cache
- pool: counts only AI-diagnosed keys, pauses over the limit, resumes newest-first, skips after 60 days; unlimited for school users; teacher allowance unaffected
- `AIUsageLog` rows written with tokens

**APIs:**
- another school's teacher gets 404
- a learner can't read another learner's rows or any provisional row
- learner fields are stripped
- dismiss and restore
- class top three: sorting, ≥ 2-learner rule, generic line, counts
- `learnerTopics` sums, levels, sources, weekly buckets (SAST), misconceptions, untagged
- aggregation ObjectId casting

**Frontend:**
- `LostMarksReason` in every state for both audiences
- `ClassMisconceptions` in loading, empty, no-pattern, error and full states, plus the disclosure
- the hooks' response mapping
- no palette classes in new files

## 12. Definition of done

**Machine gate** (red refuses hand-over):
- backend and frontend suites, type-check and `next build` green
- new files ≤ 300 lines, no touched file above 350
- zero palette classes, tints and resting shadows in new UI
- labels tied to controls, icon buttons named, focus ring visible
- no horizontal scroll at 320, 375, 768, 1024, 1280 and 1440 on the touched routes
- the request set of touched pages unchanged, except the new `/evidence/*` calls

**Walkthrough** (Playwright, extending `e2e/standalone-launch.spec.ts`, `EVIDENCE_DIAGNOSIS_MODE=direct`), run at 375 px with no console errors and no failed API calls:
1. A standalone teacher assigns a finalised test, with one bank question and AI-generated inline questions, to a class of three learners.
2. Each learner writes it online. Two give the same wrong answer to one question, and one leaves a question blank.
3. AI marks the scripts. On the Marking tab, the teacher opens a script and sees "Why marks were lost" on each answer that lost marks: a label and one sentence, with "Not answered" on the blank one.
4. The class card shows at least one misconception shared by two learners, with "2 learners" and question numbers. Only one AI diagnosis was bought for the shared wrong answer (cache hit, checked in `AIUsage`).
5. The teacher dismisses one reason with **Not right** and issues the results.
6. Evidence rows exist for every answered question, final, with the topic, level and marks (checked through `GET /evidence/learners/:id/topics`).
7. A learner opens the result and sees "Why you lost marks" on their answers, without the dismissed reason.
8. The same flow for one homework exercise shows reasons on the learner's result.

**Backfill on the dev copy:** dry-run output reviewed, applied, the topic-coverage share reported, and the diagnosis cost estimate printed before `--apply`.

**Measured:** tokens and rand per 100 answers from `AIUsageLog` on the walkthrough and a backfill sample, reported against §6.6. Lane-hours go on the tracker.

**Review:** one fresh review, one fix pass, the compromise protocol on push.

## Order of work

1. Capture fixes (§4.2) and the homework regrade fix.
2. `AnswerEvidence` + writers + hooks + reconcile + backfill.
3. Taxonomy + seeding + batch pipeline + cache + pool.
4. Payoff APIs + `LostMarksReason` + `ClassMisconceptions`.
5. R summary APIs.
6. Super-admin review page.
7. Walkthrough and measurement.
