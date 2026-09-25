# Evidence and Diagnosis (Phase E) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every answered question from every per-question source becomes one idempotent `AnswerEvidence` row (learner, CAPS topic, cognitive level, marks, source, answer); every answer that lost marks gets an AI "why" from a shared, growing misconception taxonomy; the teacher and the learner see those reasons on marked work, and the teacher sees the class's top three.

**Architecture:** Backend first, in one new worktree built on Phase L-A. **E-A** fixes the capture gaps (paper questions keep topic/level through generation, editing, copying and save-to-bank) and the homework-quiz regrade bug, and adds the diagnosis model knob plus Message Batches to `AIService`. **E-B** adds the `Evidence` module: the record, pure helpers, one writer per source behind narrow hooks, the reconcile/backfill. **E-C** adds the global taxonomy, the per-school monthly pool, the diagnosis pipeline (write-time rules → per-school cache → pool → batched AI) with seeding, paper-question tagging and the weekly tidy. **E-D** adds the payoff APIs and the Phase R summary APIs. **E-E** (frontend, after the Blueprint merge) adds "Why marks were lost", "Where the class lost marks", the super-admin review page, the walkthrough and the machine gate.

**Tech Stack:** Backend Express 5 + Mongoose 9 + zod 4 (`zod/v4`) + BullMQ 5 + `@anthropic-ai/sdk` 0.80.0 (`client.messages.batches.create / retrieve / results`) + vitest/supertest on a real Mongo; frontend Next.js 16.2 + React 19 + Tailwind 4 + base-ui + vitest (node environment, pure helpers); Playwright for the walkthrough and the Phase D machine gate.

**Spec:** `docs/superpowers/specs/2026-09-25-evidence-diagnosis-design.md` (programme: `docs/superpowers/specs/2026-09-25-readiness-programme.md`, Phase E; Phase L plan: `docs/superpowers/plans/2026-09-25-learner-portal.md`)

## Global Constraints

**Where and how the work runs**
- **Backend (E-A … E-D):** a NEW worktree `C:\dev\campusly\.worktrees\backend-evidence` on branch `feat/evidence-diagnosis`, **branched from `origin/master` after L-A merges; rebase if needed** (L-A's fixture `src/test-utils/standalone-classroom.ts` is used from Task 7 and its `src/common/class-roster.ts` from Task 17). Tasks 1–6 need nothing from L and may start on `origin/master` (d9b1c42 at planning time) before L-A lands; rebase onto L-A before Task 7. Create with `git -C C:/dev/campusly/.worktrees/backend-master worktree add C:/dev/campusly/.worktrees/backend-evidence -b feat/evidence-diagnosis origin/master`, then a real `npm ci` inside it. **Never** a `node_modules` junction, **never** `git worktree remove` (memory `worktree-junction-danger`). Do not use `C:\dev\campusly\campusly-backend` (stale). `C:\dev\campusly\.worktrees\backend-learner` and `C:\dev\campusly\.worktrees\frontend-blueprint` are read-only references.
- **Compromise protocol:** before any fetch, run `git log --oneline origin/master -5` and compare with the last known tip (d9b1c42 "fix(ai): classify and log Anthropic errors, one retry layer, audio fails fast", plus the orchestrator's L-A merge); after a fetch, `git log --oneline master..origin/master` must show only commits you expect. Never `npm ci`/`npm install` or run code from an origin commit you can't account for. **No pushes** — pushing is the orchestrator's job.
- **Throwaway test Mongo (replica set) and Redis for this lane only:**
  ```bash
  docker run -d --name campusly-test-mongo-e -p 27077:27017 mongo:7 --replSet rs0
  docker exec campusly-test-mongo-e mongosh --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
  docker run -d --name campusly-test-redis-e -p 6394:6379 redis:7
  ```
  The URI needs `directConnection=true` (the set advertises `localhost:27017`).
- **Env file:** `C:\dev\campusly\test-evidence.env`, made from `C:\dev\campusly\test-dev.env` with LF endings and only `MONGODB_TEST_URI`, `MONGODB_URI` → `mongodb://127.0.0.1:27077/campusly-test?directConnection=true` and `REDIS_URL` → `redis://127.0.0.1:6394/5` changed. Outside both repos.
- **Test command (bash, from the backend worktree):** `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run <path>`. Full suite: same with no path.
- **Clean-up when the lane ends:** `docker rm -f campusly-test-mongo-e campusly-test-redis-e`. **Never touch `campusly-dev-*`, `ecomed-*`, `supabase_*` or `khula-*` containers.** A lane starts no server it does not stop in the same session.
- **Frontend (E-E):** only after `feat/blueprint-design-system` **and** Phase L-C have merged into frontend `master`; a new worktree `C:\dev\campusly\.worktrees\frontend-evidence` on `feat/evidence-diagnosis` from that master, real `npm ci`. Line numbers in E-E are from the Blueprint branch (3c7be6d) and may have moved: anchor on the quoted code, not the number.
- **Commits:** `LANE_SWEEP_OK=1 git commit -m "<conventional message>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` (the body ends with that line). No `--no-verify`.

**Code rules (every task)**
- Backend: every query filters `schoolId` (the taxonomy is the one global collection) and `isDeleted: false` where the model has it; aggregation `$match` casts ids with `new mongoose.Types.ObjectId(...)`; unique indexes are written with upserts, never bare `create`; schema and interface match field for field; `catch (err: unknown)`; no `any`; new files ≤ 300 lines, touched files ≤ 350.
- **Every evidence hook is `await`ed after the source's own save, inside `safeEvidence(...)`, which logs and never throws** — a learner's or teacher's request never fails because of evidence.
- **All model use goes through `AIService`** (`src/services/ai.service.ts`), on `config.anthropic.diagnosisModel` (`ANTHROPIC_DIAGNOSIS_MODEL`, default = `ANTHROPIC_MODEL`); sampling via `samplingParams` (`src/services/ai-model-capabilities.ts`), so current models get none; failures through `toAIError` (`src/services/ai-errors.ts`). Batch calls are exactly `client.messages.batches.create({ requests })`, `.retrieve(id)`, `for await (const r of await client.messages.batches.results(id))` (SDK 0.80.0). No model id literal outside `src/config/env.ts` (`src/config/__tests__/ai-model.test.ts`).
- **What leaves for the AI provider:** question stem, memo, guideline, marks, the marker's note and the learner's answer — never a name, id or school.
- Frontend (project `CLAUDE.md`): no `apiClient` in pages or components (hooks only); `import type`; `catch (err: unknown)`; mobile-first; 44 px targets on phones (`min-h-11`); dialogs flex-col with a sticky footer; every data view has loading, empty and error states.
- **Blueprint look (binding, Shaun — memory `campusly-no-tints`):** colour only in solid marks (8 px status dots, bars, icons, text, the one primary button); every surface neutral — white card, #F3F5FA ground, #EEF1F7 grey. **No tinted or pastel backgrounds, no `bg-*/10` washes, no pastel chips, no tinted banners.** Mastery colour only through the Blueprint utilities that resolve to the `--mastery-*` tokens: `bg-mark-weak` and `<Badge variant="weak">` (→ `--mark-weak` → `--mastery-weak-mark`). Never a hex or a palette class (`bg-orange-500`). Compose from Blueprint components (`Card`, `Badge`, `Button`, `ErrorState`, `EmptyState`, `Skeleton`, `DataTable`, `PageHeader`).
- School (non-standalone) users: no behaviour change except the new reasons UI and unmetered diagnosis.

**Numbers and copy (verbatim unless a ruling below changes it)**
- Pool per SAST month (plan ruling P4): `DIAGNOSIS_POOL_FREE = 150`, `DIAGNOSIS_POOL_PRO = 2000` (trial and past-due grace count as Pro via `isSubscriptionEntitled`). Shaun can change both at the Phase P gate.
- `LEARNER_MIN_CONFIDENCE = 0.6`; `MAX_ITEMS_PER_REQUEST = 10`; `SUBMIT_LIMIT = 2000` rows per submit run; `MAX_DIAGNOSIS_ATTEMPTS = 3`; `AUTO_MERGE_CONFIDENCE = 0.9`; answer text ≤ 2,000 chars; `markerNote` ≤ 500; explanation ≤ 240; labels ≤ 60; description ≤ 300.
- Eyebrows: "Why marks were lost" (teacher), "Why you lost marks" (learner). States: "Working out why…"; "Couldn't work out why"; "Check this mark: this answer may deserve credit"; **"No reason this time: this month's AI limit for reasons is used up"** (ruling P5); "Not right" → "Hidden from the learner · Undo"; "Low confidence".
- Class block: "Where the class lost marks"; "From 24 marked scripts · updated 10:42"; "11 learners"; "Also common: Arithmetic slip (6) · Not answered (4)"; "3 marks to check"; empty "Reasons appear here once scripts are marked."; no pattern "No shared patterns yet. Each reason so far is one learner's."; working "Working out why for 5 more answers…".

## Review Focus

1. **The paper editor saves whole sections without the new tag fields** (`PUT /question-bank/papers/:id` with `sections`, as the builder does today) → every unchanged inline question keeps its topic and level. Test in Task 1 (`keeps tags when the editor saves sections without them`).
2. **The AI echoes question numbers loosely** — `"Q2.3"`, `"Question 2.3"`, `"2.3."`, `" 2.3 "`, and one it invents (`"4"` on a paper with no section 4) → the first four match `2.3`; the invented one still writes a row with `topicFrom: 'none'` and is counted as unmatched. Tests in Task 5 (`normaliseQuestionNumber`) and Task 6 (`an unmatched number keeps its row without a topic`).
3. **The teacher changes one question's mark after reasons exist** → only that row's diagnosis resets; a dismissal on another row of the same script survives, and a re-sync with nothing changed changes nothing. Test in Task 6 (`updateMarking resets only the changed row`).
4. **Batch results come back out of order, with one errored, one expired and one whose text is not valid JSON** → each is matched by `custom_id`; the good ones become reasons; the others go back to `pending` with `attempts + 1`, and to `failed` at 3; the collect run never throws. Test in Task 15 (`collects out of order and survives bad items`).
5. **A standalone school runs out of pool in the middle of a run, at 23:30 UTC on the last day of a month** → keys up to the limit are submitted, the rest become `skipped_budget` (never `failed`), a school (non-standalone) is never limited, and the 23:30 UTC call on 30 September counts in October (SAST). Test in Task 10 (`skips over the pool, SAST month`).

## Plan rulings

Each: ruling — why — cost if wrong. The spec was fact-checked against backend `origin/master` d9b1c42 (`C:\dev\campusly\.worktrees\backend-aifix`), L-A on `feat/learner-portal` (7086473) and frontend Blueprint 3c7be6d.

- **P1 Base and conflicts.** E branches from `origin/master` after L-A merges; if L-B has merged too, rebase keeping both edits in `AITools/model.ts` (L-B adds cache-token fields at `:256, :271-274`; E adds enum values at `:250, :266-269`). E never edits `Homework/service.ts` (L-A A3/A13), `subscription/ai-usage.model.ts` or `ai-allowance.ts` (L-B B1/B2), or the `Homework/service-homework-submit.ts:236-238` lines L-B B5 changes (E's hook is at `:218`). — Narrow hook points (orchestrator). — A few-line rebase conflict.
- **P2 Model.** New config `ANTHROPIC_DIAGNOSIS_MODEL`, default = the resolved `ANTHROPIC_MODEL` (no new literal). `generateCompletionWithUsage` / `generateJSONWithUsage` take `options.model`. Sampling is already fixed on master (aa16867 `samplingParams`), so spec §10's last row ("temperature 400s on Sonnet 5") is resolved; E adds no check. — Model choice is Shaun's; a config change switches it. — None.
- **P3 Batches through AIService.** `AIService.createMessageBatch(requests)`, `retrieveMessageBatch(id)`, `messageBatchResults(id)` wrap `client.messages.batches.create / retrieve / results` (verified in `node_modules/@anthropic-ai/sdk/resources/messages/batches.d.ts` 0.80.0 and the bundled `claude-api/typescript/claude-api/batches.md`; the bundled `SKILL.md` is not present at that path). Errors go through `toAIError`. `custom_id` = `dx_<DiagnosisRequest _id>` (API limit: 1–64 chars of `[A-Za-z0-9_-]`); results are keyed by `custom_id` because order is not guaranteed. `ai.service.ts` is 323 lines; the wrappers keep it ≤ 350. — None.
- **P4 The pool is E's own ledger, and over it diagnosis is skipped.** `DiagnosisRequest` (one document per AI call) is the ledger; pool used = AI-diagnosed cache keys (items of `kind: 'diagnosis'` requests) + paper-tagging calls (1 each) of the school in the SAST month (`sastMonthWindow`, `subscription/ai-allowance.ts:45-53`). Constants above; metered only for `School.plan === 'standalone'` (teachers and coaches). Over the pool, the key's rows get `diagnosis.state: 'skipped_budget'` — not `paused`; the spec's resume-newest-first and 60-day rules are dropped. `npm run evidence:diagnose -- --apply --retry-skipped-budget` re-queues them when Shaun raises the pool. — Orchestrator instruction; keeps E off `AIUsage`/`ai-allowance.ts` (L-B's files), so the teacher allowance is untouched by construction and spec §6.7's "if E lands first" change is not needed. — Billing can't show diagnosis use from `AIUsage`; P reads `DiagnosisRequest`.
- **P5 States and rules.** `diagnosis.state ∈ none | pending | queued | ready | skipped | skipped_budget | failed | dismissed`. The no-AI rules run **when the row is written**, not in the job: full marks → `none`; blank answer → `ready` with `GEN.unanswered`; no topic → `skipped` (`no_topic`); else `pending`. Teacher copy for `skipped_budget` is the "No reason this time…" line above. — A blank answer shows "Not answered" at once. — None.
- **P6 Access follows each source's own read rule.** The spec's "author or class teacher, the rule the marking roster uses (`QuestionBank/routes.ts:257-261`)" is wrong: the roster and markings are readable by any `teacher | school_admin | super_admin` of the school (`AITools/routes.ts:163-177`; `QuestionBank/routes.ts:51, 257-261`). Tests use that rule; homework uses `homeworkAccessFilter` (`Homework/service-access.ts:42-53`); a learner's summaries need an admin role or a teacher of a class in L-A's `learnerClassIds(student)`. No capability keys, so neither `permissions.ts` changes. — Reasons are never stricter or looser than the marks they explain. — None.
- **P7 Generator tags.** The generator prompt describes only `topicIds[0]` (`service-paper-gen-helpers.ts:202-211`), so every AI-written question is about that topic; `toPaperQuestion` copies that node and the question's `capsLevel` (`tagFrom: 'generator'`); the Subject-id fallback (`:318-321`) becomes null. The spec's `topicCode` prompt change is dropped. **Flag (outside E):** multi-topic papers get AI questions for their first topic only — Phase M should fix the generator. — Changing the prompt changes what papers contain. — Multi-topic papers stay first-topic-heavy until M.
- **P8 Tags survive editing and copying.** `buildPaperSections` (`service-papers.ts:213-255`) rebuilds every question from the editor's payload, which has no tag fields, and `clonePaper` (`service-papers-helpers.ts:58-66`) lists fields by hand; both would drop tags. E carries tags over from the stored question at the same (section, position) with the same bank id / text, and the clone copies them. — Not in the spec; found in review. — None.
- **P9 Finalise tagging.** After `finalisePaper` sets `finalised` (`service-papers-pdf-finalise.ts:114-116`), `void tagPaperQuestions(paperId)` tags inline questions missing a topic or level with one direct call per paper (candidates: the paper's topics and their subtopics; a candidate titled like revision/examination/test is replaced by the subject's content topics); 1 unit of the pool; skipped silently when the pool is used. — Spec §4.2. — Some rows stay `no_topic`.
- **P10 Test writer.** Channel: images → `photo`; a `PaperSubmission` for (paper, learner) → `online`; else `typed_by_teacher`. `markedBy: 'teacher'` when a question's mark differs from `aiRawResult.questions` for that number (no new field). Only the newest non-failed marking per (paper, learner) writes; the rows of older ones are soft-deleted `superseded` (and an older marking re-synced by the backfill supersedes itself, never the newer one). `issueMarking` passes the learner it resolved (a body `studentId` is never stored on the marking, `service-marking-queries.ts:140-146`). Inline keys use `PaperMarking.paperVersion` (`model-marking.ts:41`). — Stateless and exact. — None.
- **P11 Homework hooks: two only.** After the submit upsert (`service-homework-submit.ts:218`) and after finalize (`service-homework-grading-runner.ts:280`). None in `gradeSubmission` or `regrade` (`Homework/service.ts`, edited by L-A): `totalOverridden` is derived at sync from `gradedBy` (set only by the teacher override, `service.ts:633`) and the daily reconcile catches overrides by `updatedAt`; a regrade's answers keep their old rows until finalize rewrites them. — Narrow hooks. — `totalOverridden` can lag ≤ 1 day.
- **P12 Regrade fix.** One helper `quizQuestionAsBankShape(qq)` in `service-homework-grading.ts` builds the question (with the quiz's own options) for both submit (`service-homework-submit.ts:166-169`) and the runner (`service-homework-grading-runner.ts:141-167`, which passes `options: []` today, so every regraded MCQ scores 0). Quiz rows use `Quiz.migratedQuestionIds[index]` for topic and level when present.
- **P13 Source details.** Quick checks write one row per **answered** question (unanswered ones are not stored, `Course/service-progress.ts:201-206`); `classId` = `course.scope.builtForClassId`. Library writes only graded interactive blocks (`quiz`, `fill_blank`, `match_columns`, `ordering`, `drag_drop`); `StudentAttempt` has no `isDeleted`; `classId` null. Practice maps its User id to a Student (`{ userId, schoolId, isDeleted: false }`, none → no rows), and a `subjectId` that is a CurriculumNode resolves the school Subject by `curriculumNodeId`.
- **P14 Packing per (school, topic).** Each request holds ≤ 10 unique cache keys of one school and one topic; `DiagnosisRequest.schoolId` is single (spec: `schoolIds[]`). — `AIUsageLog.teacherId` is required (`AITools/model.ts:255`) and the pool is per school. — A few % more input tokens.
- **P15 Logging.** `AIUsageLog.type` gains `evidence_diagnosis`, `misconception_seed`, `question_tagging`; `teacherId` = the owner of the request's first row source. The weekly tidy has no school, so it is logged only on `DiagnosisRequest`. Every AI call (all four kinds) writes a `DiagnosisRequest` with tokens, model and mode — the ledger the measurement reads (batch = half price).
- **P16 Fixture mode for the walkthrough.** `EVIDENCE_DIAGNOSIS_MODE = batch | direct | fixture` (default `batch`); `fixture` answers seed, diagnosis, tagging and tidy prompts with canned JSON and zero tokens, and is refused when `NODE_ENV=production`. No API key is configured locally (`test-dev.env` has none), so, as Phase L's R23 seeds AI-made work, the walkthrough seeds the AI **marking** (a seeded marking passes no hook), then runs the backend's own `migrate:evidence` and `evidence:diagnose` scripts with fixture replies; `EVIDENCE_DIAGNOSIS_ENABLED=false` switches diagnosis off. — Rules, cache, pool, ledger and writes all run for real; only the model's words are canned. — The model's judgement isn't exercised end to end; the §12 cost measurement needs a key on the dev copy (open question for Shaun).
- **P17 Jobs.** One BullMQ queue `evidence` with repeatable jobs `diagnosis-submit` (every 10 min), `diagnosis-collect` (every 2 min), `reconcile` (00:30 UTC = 02:30 SAST daily) and `taxonomy-tidy` (Mondays 01:00 UTC). In `direct`/`fixture` mode, submit collects inline. Requests still `submitted` 30 h after creation are treated as expired.
- **P18 Taxonomy scope.** Seeding runs when a topic with candidate rows has no active (`seeded | proposed | approved`) types. Un-merging a wrong auto-merge (spec §10) is out of scope: auto-merge applies only proposed → existing at ≥ 0.9, and a reviewer can merge or retire by hand. — YAGNI. — A wrong auto-merge needs a manual fix.
- **P19 Frontend slots.** `MarkingQuestionCard` gains an optional `footer` slot and the parents pass `LostMarksReason`; `PaperDetailMarkingTab.tsx` (322 lines) first extracts `MarkingClassCard.tsx`; `src/components/evidence` joins the `BLUEPRINT` list of `tests/no-tints.test.ts`. Component logic lives in pure helpers (`src/lib/evidence/*.ts`) because frontend vitest runs in node with `tests/**/*.test.ts` only.
- **P20 "3 marks to check" is a caption.** The class block shows the count; each flagged answer says "Check this mark" inside its script. — The spec's scroll to the first flagged script needs the API to name it; not worth a field before anyone asks. — The teacher opens scripts to find them.
- **P21 The walkthrough is its own spec,** `e2e/evidence-walkthrough.spec.ts`, run by the gate beside `standalone-launch.spec.ts` (spec §12 says "extending" it). — That spec is Phase L's and already long; E's check stays runnable alone. — None.
- **P22 Request sets.** Teacher homework reasons load only when a submission row is opened, and learner reasons only once a result exists, so the only page whose load set changes is the homework detail (`GET /evidence/class-misconceptions`); the Marking tab and the review page are new gate keys. Baselines are re-recorded only after the diff is confirmed to add `/api/evidence/*` keys alone.
- **P23 Summaries.** `weekly` lists only weeks with answers (oldest first, within 26 SAST weeks), not 26 buckets; library rows take the school Subject from the block's curriculum node (a resource's `subjectId` may be another school's or a system one). — R can pad weeks; library rows must count under the learner's subject. — R pads the gaps itself.
- **P24 Flags carried from the spec (outside E, unchanged):** one failed AI answer in homework is skipped yet the submission is finalised (`service-homework-grading-runner.ts:193-197`); `StudentMastery` and the tutor's free-text mastery stay until R; the moderation-approval finalise path does not trigger tagging (the backfill covers it).

---

## File structure

Backend (paths relative to the backend worktree):

| File | Responsibility |
|---|---|
| `src/modules/QuestionBank/paper-question-tags.ts` (new) | teacher tags, node visibility, carrying tags over an editor save |
| `src/modules/Evidence/types.ts` (new) | shared types: `EvidenceItem`, `EvidenceRecord`, `WriteResult`, states, sources |
| `src/modules/Evidence/model.ts` (new) | `AnswerEvidence` |
| `src/modules/Evidence/model-taxonomy.ts` (new) | `MisconceptionType`, `DiagnosisCache`, `DiagnosisRequest` |
| `src/modules/Evidence/taxonomy-generic.ts` (new) | the nine generic types as data; `ensureGenericTypes`, `genericTypeId` |
| `src/modules/Evidence/normalise.ts` (new) | answer normalisation, hash, cap, question numbers, cache key |
| `src/modules/Evidence/rules.ts` (new) | `initialDiagnosis` (write-time rules) |
| `src/modules/Evidence/topic-resolver.ts` (new) | node → topic/subtopic, cached per run |
| `src/modules/Evidence/write-rows.ts` (new) | idempotent replace-set upsert of one record's rows; `softDeleteRows`; `safeEvidence` |
| `src/modules/Evidence/writers/test-paper.ts`, `writers/test.ts` (new) | paper question lookup; `syncMarkingEvidence` |
| `src/modules/Evidence/writers/homework.ts` (new) | `syncHomeworkEvidence` |
| `src/modules/Evidence/writers/unit-check.ts`, `practice.ts`, `library.ts` (new) | the three simple sources |
| `src/modules/Evidence/reconcile.ts` (new) | walk sources since a date; source-deleted rows |
| `src/modules/Evidence/diagnosis-pool.ts` (new) | pool constants, usage, split |
| `src/modules/Evidence/ai-transport.ts`, `ai-fixture.ts` (new) | direct / batch / fixture sends; replies keyed by `custom_id` |
| `src/modules/Evidence/seed.ts`, `tagging.ts` (new) | topic seeding; paper-question tagging |
| `src/modules/Evidence/diagnosis-prompt.ts`, `question-context.ts`, `diagnosis-types.ts` (new) | prompt, context per question key, model output → type |
| `src/modules/Evidence/pipeline.ts` (new) | submit and collect |
| `src/modules/Evidence/tidy.ts`, `taxonomy-admin.ts` (new) | weekly merge; review actions |
| `src/modules/Evidence/access.ts`, `service-reasons.ts`, `service-class.ts`, `service-summary.ts`, `controller.ts`, `routes.ts`, `validation.ts` (new) | APIs |
| `src/jobs/evidence.job.ts` (new) | the `evidence` queue's worker and schedules |
| `src/scripts/evidence-args.ts`, `evidence-backfill.ts`, `evidence-tag-paper-questions.ts`, `evidence-diagnose.ts`, `evidence-seed-taxonomy.ts` (new) | the four npm scripts |
| `src/config/env.ts`, `src/services/ai.service.ts` (modify) | diagnosis model, evidence mode; batch wrappers |

Frontend (after the Blueprint + L-C merge): `src/types/evidence.ts`, `src/lib/evidence/reason-view.ts`, `src/lib/evidence/class-view.ts`, `src/hooks/useLostMarkReasons.ts`, `src/hooks/useClassMisconceptions.ts`, `src/hooks/useMisconceptionTypes.ts`, `src/components/evidence/LostMarksReason.tsx`, `src/components/evidence/ClassMisconceptions.tsx`, `src/components/evidence/MisconceptionTypeDialogs.tsx`, `src/components/papers/MarkingClassCard.tsx`, `src/app/(dashboard)/superadmin/misconceptions/page.tsx`, `e2e/support/evidence-seed.ts`, `e2e/support/evidence-journey.ts`.

---

# Phase E-A — capture fixes, the regrade bug, the diagnosis model and batches

Runs in `C:\dev\campusly\.worktrees\backend-evidence` (branch `feat/evidence-diagnosis`). Paths are relative to that worktree. Test command for every backend task: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run <path>`.

### Task 1: lane set-up; paper questions keep their topic and level

**Files:**
- Modify: `src/modules/QuestionBank/model-shared.ts` (add `CAPS_LEVELS`, `CapsLevel`, `PAPER_QUESTION_TAG_FROM`, `PaperQuestionTagFrom`)
- Modify: `src/modules/QuestionBank/model.ts:12-16` (re-export `CAPS_LEVELS`/`CapsLevel` from `model-shared.js`, plus `PaperQuestionTagFrom`)
- Modify: `src/modules/QuestionBank/model-papers.ts:33-42` (interface), `:148-167` (schema)
- Modify: `src/modules/QuestionBank/validation.ts:124-133` (`paperQuestionBaseShape`), `:322-335` (`updatePaperQuestionSchema`)
- Modify: `src/modules/QuestionBank/service-paper-gen-helpers.ts:357-368` (`toPaperQuestion`), `:456-462` (export `capsToDefaultBlooms`)
- Modify: `src/modules/QuestionBank/service-papers.ts:213-238` (`buildPaperSections`), `:483-486` (`updatePaper` carries tags), `createPaper` (node check)
- Modify: `src/modules/QuestionBank/service-papers-helpers.ts:58-66` (`clonePaper` copies tags and options)
- Modify: `src/modules/QuestionBank/service-paper-questions.ts:79-99` (add), `:137-160` (patch)
- Modify: `src/modules/QuestionBank/service-paper-question-bank.ts:86-98` (save to bank)
- Create: `src/modules/QuestionBank/paper-question-tags.ts`
- Test: `src/modules/QuestionBank/__tests__/paper-question-tags.test.ts`

**Interfaces:**
- Produces: `IPaperQuestion.curriculumNodeId?: Types.ObjectId | null`, `IPaperQuestion.capsLevel?: CapsLevel | null`, `IPaperQuestion.tagFrom?: 'generator' | 'teacher' | 'ai_tag' | null` (schema defaults null); `CAPS_LEVELS`, `CapsLevel`, `PAPER_QUESTION_TAG_FROM`, `PaperQuestionTagFrom` exported from both `model-shared.js` and `model.js`; `interface PaperQuestionTags { curriculumNodeId: ObjectId | null; capsLevel: CapsLevel | null; tagFrom: PaperQuestionTagFrom | null }`; `NO_TAGS`; `teacherTags(input, current?)`; `assertVisibleNode(nodeId, schoolId): Promise<void>` (400 "That curriculum topic is not available"); `carryQuestionTags(stored, next)` (returns new sections); `capsToDefaultBlooms(caps: CapsLevel): string` (now exported).
- API: `POST /question-bank/papers/:id/sections/:sectionIdx/questions` and `PATCH …/questions/:position` accept optional `curriculumNodeId` (ObjectId or null) and `capsLevel`; section payloads of `POST/PUT /question-bank/papers` accept both per question.

- [ ] **Step 1: Set up the lane (once)**

```bash
cd C:/dev/campusly/.worktrees/backend-master
git log --oneline origin/master -5     # compromise protocol: expect d9b1c42 (and the L-A merge once it lands); stop and report anything unexpected
git worktree add C:/dev/campusly/.worktrees/backend-evidence -b feat/evidence-diagnosis origin/master
cd C:/dev/campusly/.worktrees/backend-evidence && npm ci
docker run -d --name campusly-test-mongo-e -p 27077:27017 mongo:7 --replSet rs0
docker exec campusly-test-mongo-e mongosh --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
docker run -d --name campusly-test-redis-e -p 6394:6379 redis:7
sed -e 's#^MONGODB_TEST_URI=.*#MONGODB_TEST_URI=mongodb://127.0.0.1:27077/campusly-test?directConnection=true#' \
    -e 's#^MONGODB_URI=.*#MONGODB_URI=mongodb://127.0.0.1:27077/campusly-test?directConnection=true#' \
    -e 's#^REDIS_URL=.*#REDIS_URL=redis://127.0.0.1:6394/5#' C:/dev/campusly/test-dev.env | tr -d '\r' > C:/dev/campusly/test-evidence.env
set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/QuestionBank/__tests__/finalise-paths.test.ts
```
Expected: `rs.initiate` prints `{ ok: 1 }`; the last command ends with every test passed.

- [ ] **Step 2: Write the failing test**

```ts
// src/modules/QuestionBank/__tests__/paper-question-tags.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { AssessmentPaper, Question, type IQuestion } from '../model.js';
import { INLINE_ONLY_TAG, toPaperQuestion } from '../service-paper-gen-helpers.js';
import { PapersService } from '../service-papers.js';
import { clonePaper } from '../service-papers-helpers.js';
import { addQuestionToPaper } from '../service-paper-questions.js';
import { savePaperQuestionToBank } from '../service-paper-question-bank.js';
import { CurriculumNode } from '../../CurriculumStructure/model.js';
import type { AddQuestionToPaperInput, UpdatePaperInput } from '../validation.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
const schoolId = oid();
const teacherId = oid();

beforeAll(async () => { if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!); });
afterAll(async () => {
  await Promise.all([
    AssessmentPaper.deleteMany({ schoolId }), Question.deleteMany({ schoolId }), CurriculumNode.deleteMany({ code: /^E-TAGS-/ }),
  ]);
  await mongoose.disconnect();
});

async function topicNode(title = 'Functions'): Promise<Oid> {
  const id = oid();
  await CurriculumNode.collection.insertOne({
    _id: id, frameworkId: oid(), type: 'topic', parentId: null, title, code: `E-TAGS-${String(id)}`, description: '',
    metadata: {}, order: 0, schoolId: null, isDeleted: false, createdAt: new Date(), updatedAt: new Date(),
  });
  return id;
}

function generated(nodeId: Oid, subjectId: Oid): IQuestion {
  return {
    _id: oid(), curriculumNodeId: nodeId, subjectId, type: 'structured', stem: 'Find the inverse of f(x) = 2x.',
    options: [], answer: 'f^-1(x) = x/2', markingRubric: '', marks: 3,
    cognitiveLevel: { caps: 'complex', blooms: 'analyse' }, tags: [INLINE_ONLY_TAG],
  } as unknown as IQuestion;
}

async function draftPaper(topic: Oid): Promise<string> {
  const paper = await AssessmentPaper.create({
    schoolId, title: 'Functions test', subjectId: oid(), gradeId: oid(), topicIds: [topic], term: 1, year: 2026,
    paperType: 'class_test', duration: 30, totalMarks: 3, createdBy: teacherId,
    sections: [{ title: 'A', instructions: '', order: 0, questions: [{
      questionText: 'Find the inverse of f(x) = 2x.', marks: 3, position: 0, modelAnswer: 'x/2',
      curriculumNodeId: topic, capsLevel: 'complex', tagFrom: 'generator',
    }] }],
  });
  return String(paper._id);
}

describe('generated questions keep their tags', () => {
  it("keeps the generator's topic and level on an inline question", () => {
    const topic = oid();
    const pq = toPaperQuestion(generated(topic, oid()), 0);
    expect(String(pq.curriculumNodeId)).toBe(String(topic));
    expect(pq.capsLevel).toBe('complex');
    expect(pq.tagFrom).toBe('generator');
  });

  it('drops the Subject-id fallback but keeps the level', () => {
    const subjectId = oid();
    const pq = toPaperQuestion(generated(subjectId, subjectId), 0);
    expect(pq.curriculumNodeId).toBeNull();
    expect(pq.capsLevel).toBe('complex');
  });

  it('leaves a bank reference to the bank', () => {
    const bank = { ...generated(oid(), oid()), tags: [] } as unknown as IQuestion;
    const pq = toPaperQuestion(bank, 0);
    expect(pq.questionId).not.toBeNull();
    expect(pq.curriculumNodeId ?? null).toBeNull();
  });
});

describe('tags survive editing, copying and saving to the bank', () => {
  it('keeps tags when the editor saves sections without them', async () => {
    const topic = await topicNode();
    const paperId = await draftPaper(topic);
    const data = { sections: [{ title: 'A', instructions: '', questions: [
      { questionText: 'Find the inverse of f(x) = 2x.', marks: 3, position: 0, options: [] },
    ] }] } as unknown as UpdatePaperInput;
    await PapersService.updatePaper(paperId, String(schoolId), String(teacherId), 'teacher', data);
    const q = (await AssessmentPaper.findById(paperId).lean())!.sections[0].questions[0];
    expect(String(q.curriculumNodeId)).toBe(String(topic));
    expect(q.capsLevel).toBe('complex');
    expect(q.tagFrom).toBe('generator');
  });

  it('drops the old tags when the editor replaced the question', async () => {
    const paperId = await draftPaper(await topicNode());
    const data = { sections: [{ title: 'A', instructions: '', questions: [
      { questionText: 'A different question.', marks: 3, position: 0, options: [] },
    ] }] } as unknown as UpdatePaperInput;
    await PapersService.updatePaper(paperId, String(schoolId), String(teacherId), 'teacher', data);
    const q = (await AssessmentPaper.findById(paperId).lean())!.sections[0].questions[0];
    expect(q.curriculumNodeId ?? null).toBeNull();
  });

  it('a copied paper keeps its tags and its options', async () => {
    const topic = await topicNode();
    const paperId = await draftPaper(topic);
    await AssessmentPaper.updateOne({ _id: paperId }, { $set: { 'sections.0.questions.0.options': [
      { label: 'A', text: 'x/2', isCorrect: true }, { label: 'B', text: '2x', isCorrect: false },
    ] } });
    const copy = await clonePaper(paperId, String(schoolId), String(teacherId));
    const q = (await AssessmentPaper.findById(copy._id).lean())!.sections[0].questions[0];
    expect(String(q.curriculumNodeId)).toBe(String(topic));
    expect(q.options).toHaveLength(2);
  });

  it('a teacher can tag a question they add, and an unknown topic is refused', async () => {
    const topic = await topicNode('Sequences');
    const paperId = await draftPaper(await topicNode());
    const input = { questionText: 'Find T5 of 2; 5; 8', marks: 2, position: 1, options: [], curriculumNodeId: String(topic), capsLevel: 'routine' } as unknown as AddQuestionToPaperInput;
    const paper = await addQuestionToPaper(paperId, String(schoolId), 0, input, String(teacherId), 'teacher');
    const added = paper.sections[0].questions[1];
    expect(String(added.curriculumNodeId)).toBe(String(topic));
    expect(added.tagFrom).toBe('teacher');
    const bad = { ...input, curriculumNodeId: String(oid()) } as unknown as AddQuestionToPaperInput;
    await expect(addQuestionToPaper(paperId, String(schoolId), 0, bad, String(teacherId), 'teacher'))
      .rejects.toThrow('That curriculum topic is not available');
  });

  it("save to bank uses the question's own topic and level", async () => {
    const topic = await topicNode();
    const paperId = await draftPaper(await topicNode('Revision'));
    await AssessmentPaper.updateOne({ _id: paperId }, { $set: { 'sections.0.questions.0.curriculumNodeId': topic } });
    const { questionId } = await savePaperQuestionToBank(paperId, String(schoolId), 0, 0, String(teacherId));
    const saved = await Question.findById(questionId).lean();
    expect(String(saved!.curriculumNodeId)).toBe(String(topic));
    expect(saved!.cognitiveLevel.caps).toBe('complex');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/QuestionBank/__tests__/paper-question-tags.test.ts`
Expected: FAIL — the first test with `expected 'undefined' to be '<id>'`; the editor test with the tag missing; the add test with the tags not stored; the copy test with `expected [] to have a length of 2`.

- [ ] **Step 4: Implement**

`src/modules/QuestionBank/model-shared.ts` — append:

```ts
export const CAPS_LEVELS = ['knowledge', 'routine', 'complex', 'problem_solving'] as const;
export type CapsLevel = (typeof CAPS_LEVELS)[number];

/** Who set an inline paper question's topic and level (Phase E §4.2). */
export const PAPER_QUESTION_TAG_FROM = ['generator', 'teacher', 'ai_tag'] as const;
export type PaperQuestionTagFrom = (typeof PAPER_QUESTION_TAG_FROM)[number];
```

`src/modules/QuestionBank/model.ts:12-16` — replace the `CAPS_LEVELS` / `CapsLevel` definitions with:

```ts
export { CAPS_LEVELS, PAPER_QUESTION_TAG_FROM, type CapsLevel, type PaperQuestionTagFrom } from './model-shared.js';
import { CAPS_LEVELS, type CapsLevel } from './model-shared.js';
```

`src/modules/QuestionBank/model-papers.ts` — import `CAPS_LEVELS, PAPER_QUESTION_TAG_FROM, type CapsLevel, type PaperQuestionTagFrom` from `'./model-shared.js'`; add to `IPaperQuestion` (after `diagram`):

```ts
  /** Inline questions only: the question's own topic and level; null = unknown. Bank refs resolve through Question. */
  curriculumNodeId?: Types.ObjectId | null;
  capsLevel?: CapsLevel | null;
  tagFrom?: PaperQuestionTagFrom | null;
```

and to `paperQuestionSchema` (after `diagram`; Mongoose skips `enum` for null):

```ts
    curriculumNodeId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', default: null },
    capsLevel: { type: String, enum: CAPS_LEVELS, default: null },
    tagFrom: { type: String, enum: PAPER_QUESTION_TAG_FROM, default: null },
```

`src/modules/QuestionBank/validation.ts` — import `CAPS_LEVELS` from `'./model-shared.js'`; add to `paperQuestionBaseShape` and to `updatePaperQuestionSchema`:

```ts
  curriculumNodeId: objectIdSchema.nullable().optional(),
  capsLevel: z.enum(CAPS_LEVELS).nullable().optional(),
```

Create `src/modules/QuestionBank/paper-question-tags.ts`:

```ts
// src/modules/QuestionBank/paper-question-tags.ts
//
// An inline paper question's own topic and cognitive level (Phase E §4.2).
// Bank questions resolve both through Question. Tags are metadata: setting
// them never changes what the learner sees.
import mongoose from 'mongoose';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { BadRequestError } from '../../common/errors.js';
import type { CapsLevel, PaperQuestionTagFrom } from './model-shared.js';

type Oid = mongoose.Types.ObjectId;

export interface PaperQuestionTags {
  curriculumNodeId: Oid | null;
  capsLevel: CapsLevel | null;
  tagFrom: PaperQuestionTagFrom | null;
}

export const NO_TAGS: PaperQuestionTags = { curriculumNodeId: null, capsLevel: null, tagFrom: null };

interface TagInput { curriculumNodeId?: string | null; capsLevel?: CapsLevel | null }

/** What a teacher's add/patch leaves on the question: fields they sent replace, the rest stay. */
export function teacherTags(input: TagInput, current: PaperQuestionTags = NO_TAGS): PaperQuestionTags {
  const touched = input.curriculumNodeId !== undefined || input.capsLevel !== undefined;
  if (!touched) return current;
  const node = input.curriculumNodeId === undefined
    ? current.curriculumNodeId
    : input.curriculumNodeId === null ? null : new mongoose.Types.ObjectId(input.curriculumNodeId);
  const level = input.capsLevel === undefined ? current.capsLevel : input.capsLevel;
  return { curriculumNodeId: node, capsLevel: level, tagFrom: node || level ? 'teacher' : null };
}

/** Refuses a topic the school can't see: another school's custom node, or a deleted one. */
export async function assertVisibleNode(nodeId: string | null | undefined, schoolId: string): Promise<void> {
  if (!nodeId) return;
  const visible = await CurriculumNode.exists({
    _id: new mongoose.Types.ObjectId(nodeId),
    isDeleted: false,
    $or: [{ schoolId: null }, { schoolId: new mongoose.Types.ObjectId(schoolId) }],
  });
  if (!visible) throw new BadRequestError('That curriculum topic is not available');
}

interface TaggedQuestion {
  questionId?: Oid | null;
  questionText?: string | null;
  position: number;
  curriculumNodeId?: Oid | null;
  capsLevel?: CapsLevel | null;
  tagFrom?: PaperQuestionTagFrom | null;
}

const sameQuestion = (a: TaggedQuestion, b: TaggedQuestion): boolean =>
  String(a.questionId ?? '') === String(b.questionId ?? '') && (a.questionText ?? null) === (b.questionText ?? null);

/**
 * The paper editor saves whole sections without tag fields (service-papers.ts
 * buildPaperSections). A question still at the same place with the same bank
 * id and text keeps its stored tags; anything new or changed starts untagged.
 */
export function carryQuestionTags<Q extends TaggedQuestion, S extends { questions: Q[] }>(
  stored: ReadonlyArray<{ questions?: ReadonlyArray<TaggedQuestion> }>,
  next: readonly S[],
): S[] {
  return next.map((section: S, s: number) => ({
    ...section,
    questions: section.questions.map((q: Q) => {
      if (q.curriculumNodeId || q.capsLevel) return q;
      const old = stored[s]?.questions?.find((o: TaggedQuestion) => o.position === q.position);
      if (!old || !sameQuestion(old, q)) return q;
      return { ...q, curriculumNodeId: old.curriculumNodeId ?? null, capsLevel: old.capsLevel ?? null, tagFrom: old.tagFrom ?? null };
    }),
  }));
}
```

`src/modules/QuestionBank/service-paper-gen-helpers.ts` — make `capsToDefaultBlooms` exported and replace `toPaperQuestion`:

```ts
/** An AI-written question is about the topic its prompt described (topicIds[0]); never the Subject-id fallback. */
function generatorTags(q: IQuestion): Pick<IPaperQuestion, 'curriculumNodeId' | 'capsLevel' | 'tagFrom'> {
  const node = q.curriculumNodeId && String(q.curriculumNodeId) !== String(q.subjectId)
    ? (q.curriculumNodeId as mongoose.Types.ObjectId)
    : null;
  const level = q.cognitiveLevel?.caps ?? null;
  return { curriculumNodeId: node, capsLevel: level, tagFrom: node || level ? 'generator' : null };
}

export function toPaperQuestion(q: IQuestion, position: number): IPaperQuestion {
  const inline = isInlineOnly(q);
  return {
    questionId: inline ? null : (q._id as mongoose.Types.ObjectId),
    questionText: q.stem,
    options: q.options ?? [],
    marks: q.marks,
    position,
    modelAnswer: q.answer ?? null,
    markingGuideline: q.markingRubric ?? null,
    diagram: null,
    ...(inline ? generatorTags(q) : {}),
  };
}
```

`src/modules/QuestionBank/service-papers.ts` — import `carryQuestionTags, assertVisibleNode` from `'./paper-question-tags.js'`. In `buildPaperSections`, add to each question object (after `diagram`):

```ts
      curriculumNodeId: question.curriculumNodeId ? toObjectId(question.curriculumNodeId) : null,
      capsLevel: question.capsLevel ?? null,
      tagFrom: question.curriculumNodeId || question.capsLevel ? ('teacher' as const) : null,
```

Add beside it:

```ts
/** Every topic a section payload names must be one the school can see. */
async function assertSectionNodes(sections: Array<{ questions: IPaperQuestion[] }>, schoolId: string): Promise<void> {
  for (const node of sections.flatMap((s) => s.questions.map((q) => q.curriculumNodeId)).filter(Boolean)) {
    await assertVisibleNode(String(node), schoolId);
  }
}
```

In `createPaper`, right after `buildPaperSections(data)`: `await assertSectionNodes(sections, schoolId);`. In `updatePaper` (`:483-486`) replace the `if (data.sections)` block with:

```ts
    if (data.sections) {
      const { sections, actualMarks } = buildPaperSections(data);
      await assertSectionNodes(sections, schoolId);
      update.sections = carryQuestionTags(paper.sections ?? [], sections);
      update.totalMarks = actualMarks || data.totalMarks || 0;
    }
```

`src/modules/QuestionBank/service-papers-helpers.ts:58-66` — in `clonePaper`'s question map add:

```ts
        options: q.options ?? [],
        curriculumNodeId: q.curriculumNodeId ?? null,
        capsLevel: q.capsLevel ?? null,
        tagFrom: q.tagFrom ?? null,
```

`src/modules/QuestionBank/service-paper-questions.ts` — import `assertVisibleNode, teacherTags` from `'./paper-question-tags.js'`. In `addQuestionToPaper`, after `assertExactlyOneSource(input);` add `await assertVisibleNode(input.curriculumNodeId, schoolId);` and spread `...teacherTags(input)` into `newQuestion` (after `diagram`). In `updatePaperQuestion`, after the `markingGuideline` branch:

```ts
  if (patch.curriculumNodeId !== undefined || patch.capsLevel !== undefined) {
    await assertVisibleNode(patch.curriculumNodeId, schoolId);
    const current = {
      curriculumNodeId: question.curriculumNodeId ?? null,
      capsLevel: question.capsLevel ?? null,
      tagFrom: question.tagFrom ?? null,
    };
    Object.assign(question, teacherTags(patch, current));
  }
```

`src/modules/QuestionBank/service-paper-question-bank.ts:86-98` — import `capsToDefaultBlooms` from `'./service-paper-gen-helpers.js'`; in `Question.create`:

```ts
    curriculumNodeId: pq.curriculumNodeId ?? paper.topicIds?.[0] ?? paper.subjectId,
    …
    cognitiveLevel: { caps: pq.capsLevel ?? 'routine', blooms: capsToDefaultBlooms(pq.capsLevel ?? 'routine') },
```

- [ ] **Step 5: Run the tests and the type-check**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/QuestionBank && npx tsc --noEmit`
Expected: every QuestionBank file PASS (the 8 new tests included); `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/modules/QuestionBank
LANE_SWEEP_OK=1 git commit -m "feat(papers): inline questions keep their topic and level through generation, editing, copying and save-to-bank" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: a homework quiz regrade marks multiple choice against the quiz's options

**Files:**
- Modify: `src/modules/Homework/service-homework-grading.ts` (add `quizQuestionAsBankShape`)
- Modify: `src/modules/Homework/service-homework-submit.ts:166-169` (use it)
- Modify: `src/modules/Homework/service-homework-grading-runner.ts:141-167` (typed quiz list; use it)
- Test: `src/modules/Homework/__tests__/quiz-regrade.test.ts`

**Interfaces:**
- Produces: `interface QuizQuestionLike { questionText: string; questionType: string; options?: Array<{ text: string; isCorrect: boolean }>; correctAnswer: string; points: number }`; `quizQuestionAsBankShape(qq: QuizQuestionLike): IQuestion` (options labelled `A`, `B`, … in order).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Homework/__tests__/quiz-regrade.test.ts
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../service-homework-grading-ai.js', () => ({
  gradeWithAI: vi.fn(async () => ({ awarded: 1, rationale: 'Partly right', gradingMethod: 'ai' })),
}));

import { Homework, HomeworkSubmission } from '../model.js';
import { Quiz } from '../../Learning/model.js';
import { gradeSubmissionAsync } from '../service-homework-grading-runner.js';
import { quizQuestionAsBankShape } from '../service-homework-grading.js';

const oid = () => new mongoose.Types.ObjectId();
const schoolId = oid();

beforeAll(async () => { if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!); });
afterAll(async () => {
  await Promise.all([Homework.deleteMany({ schoolId }), HomeworkSubmission.deleteMany({ schoolId }), Quiz.deleteMany({ schoolId })]);
  await mongoose.disconnect();
});

describe('quizQuestionAsBankShape', () => {
  it("labels the quiz's own options A, B, … in order", () => {
    const q = quizQuestionAsBankShape({
      questionText: '2 + 2?', questionType: 'mcq', correctAnswer: '4', points: 2,
      options: [{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }],
    });
    expect(q.options).toEqual([{ label: 'A', text: '4', isCorrect: true }, { label: 'B', text: '5', isCorrect: false }]);
    expect(q.marks).toBe(2);
  });
});

describe('a regraded quiz homework', () => {
  it('gives a correct multiple-choice answer its marks', async () => {
    const quizId = oid();
    const homeworkId = oid();
    const submissionId = oid();
    const now = new Date();
    await Quiz.collection.insertOne({
      _id: quizId, schoolId, teacherId: oid(), subjectId: oid(), classId: oid(), title: 'Quick sums', type: 'mixed', totalPoints: 5,
      status: 'published', isDeleted: false, createdAt: now, updatedAt: now,
      questions: [
        { questionText: '2 + 2?', questionType: 'mcq', options: [{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }], correctAnswer: '4', points: 2 },
        { questionText: 'Explain why 0 is even.', questionType: 'short_answer', options: [], correctAnswer: 'It is divisible by 2', points: 3 },
      ],
    });
    await Homework.collection.insertOne({
      _id: homeworkId, title: 'Quick sums', type: 'quiz', quizId, exerciseQuestionIds: [], subjectId: oid(), classId: oid(), schoolId,
      teacherId: oid(), dueDate: now, totalMarks: 5, status: 'assigned', attachments: [], latePolicy: 'accept',
      gradebookAutoPublish: false, version: 1, isDeleted: false, createdAt: now, updatedAt: now,
    });
    // As Homework/service.ts regrade leaves it: every answer back to pending, generation bumped.
    await HomeworkSubmission.collection.insertOne({
      _id: submissionId, homeworkId, studentId: oid(), schoolId, type: 'quiz', homeworkVersion: 1, submittedAt: now, isLate: false,
      gradingStatus: 'pending', gradingGeneration: 2, maxMarks: 5, isDeleted: false, createdAt: now, updatedAt: now,
      answers: [
        { questionIndex: 0, studentAnswer: 'A', questionSnapshot: '2 + 2?', maxMarks: 2, gradingMethod: 'pending' },
        { questionIndex: 1, studentAnswer: 'It halves', questionSnapshot: 'Explain why 0 is even.', maxMarks: 3, gradingMethod: 'pending' },
      ],
    });

    await gradeSubmissionAsync(String(submissionId));

    const sub = await HomeworkSubmission.collection.findOne({ _id: submissionId });
    expect(sub?.answers[0].awarded).toBe(2);
    expect(sub?.answers[0].gradingMethod).toBe('deterministic');
    expect(sub?.gradingStatus).toBe('graded');
    expect(sub?.mark).toBe(3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Homework/__tests__/quiz-regrade.test.ts`
Expected: FAIL — `quizQuestionAsBankShape is not a function` (and, once it exists but the runner is unchanged, `expected 0 to be 2`).

- [ ] **Step 3: Implement**

`src/modules/Homework/service-homework-grading.ts` — add (import `mongoose`):

```ts
export interface QuizQuestionLike {
  questionText: string;
  questionType: string;
  options?: Array<{ text: string; isCorrect: boolean }>;
  correctAnswer: string;
  points: number;
}

/**
 * A Learning-quiz question in the bank question's shape, with the quiz's own
 * options labelled A, B, … so a multiple-choice answer is marked against them.
 * Used by submit and by the background runner (a regrade used to pass no
 * options, so every multiple-choice answer scored 0).
 */
export function quizQuestionAsBankShape(qq: QuizQuestionLike): IQuestion {
  const options = (qq.options ?? []).map((o: { text: string; isCorrect: boolean }, i: number) => ({
    label: String.fromCharCode(65 + i), text: o.text, isCorrect: o.isCorrect,
  }));
  return {
    _id: new mongoose.Types.ObjectId(), type: qq.questionType, stem: qq.questionText, answer: qq.correctAnswer,
    markingRubric: '', marks: qq.points, options,
  } as unknown as IQuestion;
}
```

`src/modules/Homework/service-homework-submit.ts:166-169` — replace the lines that build `options` and `fakeQ` with `const fakeQ = quizQuestionAsBankShape(qq);` (import it from `'./service-homework-grading.js'`).

`src/modules/Homework/service-homework-grading-runner.ts` — import `quizQuestionAsBankShape, type QuizQuestionLike` from `'./service-homework-grading.js'`; declare `let quizQuestions: QuizQuestionLike[] = [];` and replace the inline `fakeQ` object literal (`options: []`) with `const fakeQ = quizQuestionAsBankShape(qq);`.

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Homework && npx tsc --noEmit`
Expected: PASS for every Homework file; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Homework
LANE_SWEEP_OK=1 git commit -m "fix(homework): a quiz regrade marks multiple choice against the quiz's own options" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: the diagnosis model knob and Message Batches in AIService

**Files:**
- Modify: `src/config/env.ts:63-66` (`anthropic.diagnosisModel`; new `evidence` block)
- Modify: `src/services/ai.service.ts` (`Options.model`; `generateJSONWithUsage` options; `batchRequest`, `createMessageBatch`, `retrieveMessageBatch`, `messageBatchResults`)
- Modify: `src/config/__tests__/ai-model.test.ts` (diagnosis model default)
- Test: `src/services/__tests__/ai-batches.test.ts`

**Interfaces:**
- Produces: `config.anthropic.diagnosisModel: string`; `config.evidence: { mode: string; enabled: boolean }` (`EVIDENCE_DIAGNOSIS_MODE` default `'batch'`, `EVIDENCE_DIAGNOSIS_ENABLED` default true); `type Options = { maxTokens?: number; temperature?: number; model?: string }`; `AIService.generateJSONWithUsage<T>(system, user, options?: Options)`; `AIService.batchRequest(customId: string, system: string, user: string, options: { maxTokens: number; model?: string }): Anthropic.Messages.BatchCreateParams.Request`; `AIService.createMessageBatch(requests): Promise<Anthropic.Messages.MessageBatch>`; `AIService.retrieveMessageBatch(id): Promise<Anthropic.Messages.MessageBatch>`; `AIService.messageBatchResults(id): Promise<Anthropic.Messages.MessageBatchIndividualResponse[]>`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('Claude model', …)` of `src/config/__tests__/ai-model.test.ts`:

```ts
  it('diagnoses on the main model unless ANTHROPIC_DIAGNOSIS_MODEL is set', () => {
    if (process.env.ANTHROPIC_DIAGNOSIS_MODEL) return;
    expect(config.anthropic.diagnosisModel).toBe(config.anthropic.model);
  });
```

```ts
// src/services/__tests__/ai-batches.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { APIError } from '@anthropic-ai/sdk';

// Message Batches go through AIService like every other call: the configured
// diagnosis model, no sampling for current models, SDK errors turned into
// plain AI errors. The SDK is mocked; no network.
const h = vi.hoisted(() => ({
  create: vi.fn(),
  batchCreate: vi.fn(),
  batchRetrieve: vi.fn(),
  batchResults: vi.fn(),
  config: { anthropic: { apiKey: 'test-key', model: 'claude-sonnet-5', diagnosisModel: 'claude-sonnet-5' } },
}));

vi.mock('../../config/env.js', () => ({ config: h.config }));
vi.mock('../../common/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@anthropic-ai/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@anthropic-ai/sdk')>()),
  default: class {
    messages = { create: h.create, batches: { create: h.batchCreate, retrieve: h.batchRetrieve, results: h.batchResults } };
  },
}));

async function service(diagnosisModel: string): Promise<typeof import('../ai.service.js').AIService> {
  h.config.anthropic.diagnosisModel = diagnosisModel;
  vi.resetModules();
  return (await import('../ai.service.js')).AIService;
}

beforeEach(() => {
  for (const fn of [h.create, h.batchCreate, h.batchRetrieve, h.batchResults]) fn.mockReset();
});

describe('AIService Message Batches', () => {
  it('builds a request on the diagnosis model with no sampling for a current model', async () => {
    const ai = await service('claude-sonnet-5');
    expect(ai.batchRequest('dx_1', 'sys', 'user', { maxTokens: 900 })).toEqual({
      custom_id: 'dx_1',
      params: { model: 'claude-sonnet-5', max_tokens: 900, system: 'sys', messages: [{ role: 'user', content: 'user' }] },
    });
  });

  it('sends temperature 0 only to a model that accepts it', async () => {
    const ai = await service('claude-haiku-4-5');
    expect(ai.batchRequest('dx_2', 'sys', 'user', { maxTokens: 900 }).params).toMatchObject({ model: 'claude-haiku-4-5', temperature: 0 });
  });

  it('creates, retrieves and reads a batch through the SDK', async () => {
    const ai = await service('claude-sonnet-5');
    h.batchCreate.mockResolvedValue({ id: 'msgbatch_1', processing_status: 'in_progress' });
    h.batchRetrieve.mockResolvedValue({ id: 'msgbatch_1', processing_status: 'ended' });
    h.batchResults.mockResolvedValue((async function* lines() {
      yield { custom_id: 'dx_2', result: { type: 'expired' } };
      yield { custom_id: 'dx_1', result: { type: 'succeeded', message: { content: [{ type: 'text', text: '{}' }] } } };
    })());
    const request = ai.batchRequest('dx_1', 'sys', 'user', { maxTokens: 900 });

    expect((await ai.createMessageBatch([request])).id).toBe('msgbatch_1');
    expect(h.batchCreate).toHaveBeenCalledWith({ requests: [request] });
    expect((await ai.retrieveMessageBatch('msgbatch_1')).processing_status).toBe('ended');
    expect((await ai.messageBatchResults('msgbatch_1')).map((r) => r.custom_id)).toEqual(['dx_2', 'dx_1']);
  });

  it('turns an SDK failure into a plain AI error', async () => {
    const ai = await service('claude-sonnet-5');
    h.batchCreate.mockRejectedValue(
      APIError.generate(529, { type: 'error', error: { type: 'overloaded_error', message: 'x' } }, undefined, new Headers()),
    );
    await expect(ai.createMessageBatch([])).rejects.toMatchObject({ statusCode: 503, code: 'AI_BUSY' });
  });

  it('a completion can run on another model', async () => {
    const ai = await service('claude-sonnet-5');
    h.create.mockResolvedValue({ usage: { input_tokens: 1, output_tokens: 1 }, content: [{ type: 'text', text: '{"a":1}' }] });
    const { data } = await ai.generateJSONWithUsage<{ a: number }>('sys', 'user', { model: 'claude-haiku-4-5', maxTokens: 500 });
    expect(data.a).toBe(1);
    expect(h.create.mock.calls[0][0]).toMatchObject({ model: 'claude-haiku-4-5', max_tokens: 500 });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/services/__tests__/ai-batches.test.ts src/config/__tests__/ai-model.test.ts`
Expected: FAIL — `ai.batchRequest is not a function`; `expected undefined to be 'claude-sonnet-5'`.

- [ ] **Step 3: Implement**

`src/config/env.ts` — above `export const config`, add `const anthropicModel = getEnv('ANTHROPIC_MODEL', 'claude-sonnet-5');` and replace the `anthropic` block with:

```ts
  anthropic: {
    apiKey: getEnv('ANTHROPIC_API_KEY', ''),
    model: anthropicModel,
    // Diagnosis of lost marks, misconception seeding, paper tagging (Phase E). Shaun's choice; defaults to the main model.
    diagnosisModel: getEnv('ANTHROPIC_DIAGNOSIS_MODEL', anthropicModel),
  },

  evidence: {
    // batch (default, half price) | direct (plain Messages API) | fixture (canned replies; refused in production)
    mode: getEnv('EVIDENCE_DIAGNOSIS_MODE', 'batch'),
    enabled: getEnv('EVIDENCE_DIAGNOSIS_ENABLED', 'true') !== 'false',
  },
```

`src/services/ai.service.ts`:
- `type Options = { maxTokens?: number; temperature?: number; model?: string };`
- in `generateCompletionWithUsage`: `const model = options?.model ?? ANTHROPIC_MODEL;` and use `model` for both `model:` and `samplingParams(model, options?.temperature ?? 0.7)`.
- `static async generateJSONWithUsage<T>(systemPrompt: string, userPrompt: string, options?: Options)` passes `{ temperature: 0.3, ...options }` to `generateCompletionWithUsage`.
- after `firstText`, add:

```ts
const DIAGNOSIS_MODEL = config.anthropic.diagnosisModel;

/** One Message Batches call with the key check and plain AI errors; the SDK's own retries apply. */
async function batchCall<T>(path: string, run: (client: Anthropic) => Promise<T>): Promise<T> {
  try {
    return await run(getClient());
  } catch (err: unknown) {
    throw toAIError(err, { path, model: DIAGNOSIS_MODEL });
  }
}
```

- in the class, after `getTokenUsage`:

```ts
  /** One Message Batches request on the diagnosis model (or `options.model`), no sampling for current models. */
  static batchRequest(
    customId: string, systemPrompt: string, userPrompt: string, options: { maxTokens: number; model?: string },
  ): Anthropic.Messages.BatchCreateParams.Request {
    const model = options.model ?? DIAGNOSIS_MODEL;
    return {
      custom_id: customId,
      params: {
        model, max_tokens: options.maxTokens, ...samplingParams(model, 0),
        system: systemPrompt, messages: [{ role: 'user', content: userPrompt }],
      },
    };
  }

  static createMessageBatch(requests: Anthropic.Messages.BatchCreateParams.Request[]): Promise<Anthropic.Messages.MessageBatch> {
    return batchCall('createMessageBatch', (c) => c.messages.batches.create({ requests }));
  }

  static retrieveMessageBatch(batchId: string): Promise<Anthropic.Messages.MessageBatch> {
    return batchCall('retrieveMessageBatch', (c) => c.messages.batches.retrieve(batchId));
  }

  /** Every result line of an ended batch. Lines arrive in any order: match them by `custom_id`. */
  static messageBatchResults(batchId: string): Promise<Anthropic.Messages.MessageBatchIndividualResponse[]> {
    return batchCall('messageBatchResults', async (c) => {
      const lines: Anthropic.Messages.MessageBatchIndividualResponse[] = [];
      for await (const line of await c.messages.batches.results(batchId)) lines.push(line);
      return lines;
    });
  }
```

(If `tsc` does not resolve `Anthropic.Messages.BatchCreateParams.Request`, import the three types with `import type { BatchCreateParams, MessageBatch, MessageBatchIndividualResponse } from '@anthropic-ai/sdk/resources/messages/batches';` — the package exports `./resources/*` — and use them unqualified.)

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/services src/config && npx tsc --noEmit && wc -l src/services/ai.service.ts`
Expected: PASS (sampling-params, retries, errors, not-configured and the new batch tests); `tsc` prints nothing; `ai.service.ts` ≤ 350 lines.

- [ ] **Step 5: Commit**

```bash
git add src/config src/services
LANE_SWEEP_OK=1 git commit -m "feat(ai): a diagnosis model setting and Message Batches through AIService" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Phase E-B — the evidence record, the writers and the backfill

### Task 4: the evidence and taxonomy models, and the nine generic types

**Files:**
- Create: `src/modules/Evidence/types.ts`
- Create: `src/modules/Evidence/model.ts`
- Create: `src/modules/Evidence/model-taxonomy.ts`
- Create: `src/modules/Evidence/taxonomy-generic.ts`
- Modify: `src/common/utils.ts:56-111` (`'AnswerEvidence'` joins the cascade list)
- Test: `src/modules/Evidence/__tests__/models.test.ts`

**Interfaces:**
- Produces (types.ts): `type Oid`; `SOURCE_TYPES`/`SourceType` (`'test' | 'homework' | 'unit_check' | 'practice' | 'library'`); `TOPIC_FROM`/`TopicFrom`; `CHANNELS`/`Channel`; `ANSWER_KINDS`/`AnswerKind`; `MARKED_BY`/`MarkedBy`; `DIAGNOSIS_STATES`/`DiagnosisState`; `DELETED_REASONS`/`DeletedReason`; `interface EvidenceItem`; `interface EvidenceRecord`; `interface WriteResult`; `interface WriterOptions { dryRun?: boolean }`; `emptyResult()`.
- Produces (model.ts): `AnswerEvidence` model, `IAnswerEvidence`, `IEvidenceDiagnosis`.
- Produces (model-taxonomy.ts): `MisconceptionType` (`IMisconceptionType`, `TYPE_STATUSES`, `ACTIVE_TYPE_STATUSES = ['seeded','proposed','approved']`), `DiagnosisCache` (`IDiagnosisCache`), `DiagnosisRequest` (`IDiagnosisRequest`, `REQUEST_KINDS`, `REQUEST_MODES`).
- Produces (taxonomy-generic.ts): `GENERIC_TYPES`, `type GenericSlug`, `genericCode(slug)`, `ensureGenericTypes(): Promise<Map<GenericSlug, Oid>>`, `genericTypeId(slug): Promise<Oid>`, `resetGenericTypeCache()`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/models.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { AnswerEvidence } from '../model.js';
import { MisconceptionType } from '../model-taxonomy.js';
import { GENERIC_TYPES, ensureGenericTypes, genericTypeId, resetGenericTypeCache } from '../taxonomy-generic.js';
import { cascadeSoftDeleteSchool } from '../../../common/utils.js';

const oid = () => new mongoose.Types.ObjectId();
const schoolId = oid();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await AnswerEvidence.init();
});
beforeEach(() => resetGenericTypeCache());
afterAll(async () => {
  await AnswerEvidence.deleteMany({ schoolId });
  await mongoose.disconnect();
});

function row(itemKey: string) {
  return {
    schoolId, studentId: oid(), questionKey: 'q:x', topicFrom: 'none', cognitiveLevel: null,
    marksAwarded: 1, marksAvailable: 2, markedBy: 'ai', markerNote: '', markedAt: new Date(), status: 'provisional',
    source: { type: 'test', channel: 'online', recordId: recordId, parentId: oid(), itemKey, position: 0, attemptNumber: 1 },
    answer: { kind: 'typed', text: 'x', truncated: false, hash: 'h' },
    diagnosis: { state: 'pending', cacheKey: 'k' },
  };
}
const recordId = oid();

describe('the evidence models', () => {
  it('holds one row per (school, source, record, item)', async () => {
    await AnswerEvidence.create(row('1.1'));
    await expect(AnswerEvidence.create(row('1.1'))).rejects.toThrow(/E11000/);
  });

  it('seeds the nine generic types once and keeps a reviewer rename', async () => {
    const first = await ensureGenericTypes();
    await MisconceptionType.updateOne({ code: 'GEN.careless-arithmetic' }, { $set: { label: 'Slip in the working' } });
    resetGenericTypeCache();
    const second = await ensureGenericTypes();
    expect(first.size).toBe(GENERIC_TYPES.length);
    expect(String(second.get('unanswered'))).toBe(String(first.get('unanswered')));
    expect((await MisconceptionType.findOne({ code: 'GEN.careless-arithmetic' }).lean())?.label).toBe('Slip in the working');
    expect((await MisconceptionType.findOne({ code: 'GEN.possible-marking-error' }).lean())?.learnerVisible).toBe(false);
    expect(String(await genericTypeId('unanswered'))).toBe(String(first.get('unanswered')));
    await MisconceptionType.updateOne({ code: 'GEN.careless-arithmetic' }, { $set: { label: 'Arithmetic slip' } }); // later files read the label
  });

  it("goes with the school's cascade soft delete", async () => {
    await cascadeSoftDeleteSchool(String(schoolId));
    expect(await AnswerEvidence.countDocuments({ schoolId, isDeleted: false })).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/models.test.ts`
Expected: FAIL — `Cannot find module '../model.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/types.ts
//
// Shapes of the evidence stream (Phase E spec §3): one row per answered
// question per attempt, written by one writer per source.
import type { Types } from 'mongoose';
import type { CapsLevel } from '../QuestionBank/model-shared.js';

export type Oid = Types.ObjectId;
export type { CapsLevel };

export const SOURCE_TYPES = ['test', 'homework', 'unit_check', 'practice', 'library'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export const TOPIC_FROM = ['question', 'paper_question', 'block', 'practice', 'ai_tag', 'none'] as const;
export type TopicFrom = (typeof TOPIC_FROM)[number];
export const CHANNELS = ['online', 'photo', 'typed_by_teacher'] as const;
export type Channel = (typeof CHANNELS)[number];
export const ANSWER_KINDS = ['typed', 'choice', 'transcribed', 'structured'] as const;
export type AnswerKind = (typeof ANSWER_KINDS)[number];
export const MARKED_BY = ['deterministic', 'ai', 'teacher'] as const;
export type MarkedBy = (typeof MARKED_BY)[number];
export const DIAGNOSIS_STATES = ['none', 'pending', 'queued', 'ready', 'skipped', 'skipped_budget', 'failed', 'dismissed'] as const;
export type DiagnosisState = (typeof DIAGNOSIS_STATES)[number];
export const DELETED_REASONS = ['source_deleted', 'superseded', 'item_removed'] as const;
export type DeletedReason = (typeof DELETED_REASONS)[number];

/** One answered question as a source's writer sees it. */
export interface EvidenceItem {
  itemKey: string;
  position: number;
  questionKey: string;
  questionId: Oid | null;
  /** Any curriculum node; the row writer resolves it to a topic and subtopic. */
  nodeId: Oid | null;
  topicFrom: TopicFrom;
  cognitiveLevel: CapsLevel | null;
  marksAwarded: number;
  marksAvailable: number;
  answerText: string;
  answerKind: AnswerKind;
  markedBy: MarkedBy;
  markerNote: string;
}

/** What is the same for every item of one source record. */
export interface EvidenceRecord {
  schoolId: Oid;
  studentId: Oid;
  userId: Oid | null;
  classId: Oid | null;
  subjectId: Oid | null;
  gradeId: Oid | null;
  source: { type: SourceType; channel: Channel | null; recordId: Oid; parentId: Oid; attemptNumber: number };
  markedAt: Date;
  status: 'provisional' | 'final';
  finalAt: Date | null;
  totalOverridden: boolean;
}

export interface WriteResult {
  written: number;
  updated: number;
  unchanged: number;
  removed: number;
  withTopic: number;
  withLevel: number;
  skipped: Record<string, number>;
}

export interface WriterOptions { dryRun?: boolean }

export const emptyResult = (): WriteResult => ({
  written: 0, updated: 0, unchanged: 0, removed: 0, withTopic: 0, withLevel: 0, skipped: {},
});
```

```ts
// src/modules/Evidence/model.ts
//
// AnswerEvidence (spec §3): one row per answered question per attempt.
// Idempotent key: (school, source type, record, item). Soft delete only.
import mongoose, { Schema, Document, Types } from 'mongoose';
import { CAPS_LEVELS } from '../QuestionBank/model-shared.js';
import {
  ANSWER_KINDS, CHANNELS, DELETED_REASONS, DIAGNOSIS_STATES, MARKED_BY, SOURCE_TYPES, TOPIC_FROM,
  type AnswerKind, type CapsLevel, type Channel, type DeletedReason, type DiagnosisState, type MarkedBy,
  type SourceType, type TopicFrom,
} from './types.js';

export interface IEvidenceDiagnosis {
  state: DiagnosisState;
  typeId: Types.ObjectId | null;
  explanation: string;
  confidence: number | null;
  cacheKey: string;
  skippedReason: string | null;
  requestId: Types.ObjectId | null;
  attempts: number;
  diagnosedAt: Date | null;
  dismissedBy: Types.ObjectId | null;
  dismissedAt: Date | null;
}

export interface IAnswerEvidence extends Document {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  userId: Types.ObjectId | null;
  classId: Types.ObjectId | null;
  subjectId: Types.ObjectId | null;
  gradeId: Types.ObjectId | null;
  topicNodeId: Types.ObjectId | null;
  subtopicNodeId: Types.ObjectId | null;
  topicFrom: TopicFrom;
  cognitiveLevel: CapsLevel | null;
  marksAwarded: number;
  marksAvailable: number;
  source: {
    type: SourceType; channel: Channel | null; recordId: Types.ObjectId; parentId: Types.ObjectId;
    itemKey: string; position: number; attemptNumber: number;
  };
  questionKey: string;
  questionId: Types.ObjectId | null;
  answer: { kind: AnswerKind; text: string; truncated: boolean; hash: string };
  markedBy: MarkedBy;
  markerNote: string;
  markedAt: Date;
  status: 'provisional' | 'final';
  finalAt: Date | null;
  totalOverridden: boolean;
  diagnosis: IEvidenceDiagnosis;
  isDeleted: boolean;
  deletedReason: DeletedReason | null;
  createdAt: Date;
  updatedAt: Date;
}

const oidRef = (ref: string) => ({ type: Schema.Types.ObjectId, ref, default: null });

const diagnosisSchema = new Schema<IEvidenceDiagnosis>(
  {
    state: { type: String, enum: DIAGNOSIS_STATES, required: true },
    typeId: oidRef('MisconceptionType'),
    explanation: { type: String, default: '', maxlength: 240 },
    confidence: { type: Number, default: null, min: 0, max: 1 },
    cacheKey: { type: String, required: true },
    skippedReason: { type: String, default: null },
    requestId: oidRef('DiagnosisRequest'),
    attempts: { type: Number, default: 0, min: 0 },
    diagnosedAt: { type: Date, default: null },
    dismissedBy: oidRef('User'),
    dismissedAt: { type: Date, default: null },
  },
  { _id: false },
);

const answerEvidenceSchema = new Schema<IAnswerEvidence>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    userId: oidRef('User'),
    classId: oidRef('Class'),
    subjectId: oidRef('Subject'),
    gradeId: oidRef('Grade'),
    topicNodeId: oidRef('CurriculumNode'),
    subtopicNodeId: oidRef('CurriculumNode'),
    topicFrom: { type: String, enum: TOPIC_FROM, required: true },
    cognitiveLevel: { type: String, enum: CAPS_LEVELS, default: null },
    marksAwarded: { type: Number, required: true, min: 0 },
    marksAvailable: { type: Number, required: true, min: 0 },
    source: {
      type: { type: String, enum: SOURCE_TYPES, required: true },
      channel: { type: String, enum: CHANNELS, default: null },
      recordId: { type: Schema.Types.ObjectId, required: true },
      parentId: { type: Schema.Types.ObjectId, required: true },
      itemKey: { type: String, required: true },
      position: { type: Number, default: 0 },
      attemptNumber: { type: Number, default: 1, min: 1 },
    },
    questionKey: { type: String, required: true },
    questionId: oidRef('Question'),
    answer: {
      kind: { type: String, enum: ANSWER_KINDS, required: true },
      text: { type: String, default: '', maxlength: 2000 },
      truncated: { type: Boolean, default: false },
      hash: { type: String, required: true },
    },
    markedBy: { type: String, enum: MARKED_BY, required: true },
    markerNote: { type: String, default: '', maxlength: 500 },
    markedAt: { type: Date, required: true },
    status: { type: String, enum: ['provisional', 'final'], required: true },
    finalAt: { type: Date, default: null },
    totalOverridden: { type: Boolean, default: false },
    diagnosis: { type: diagnosisSchema, required: true },
    isDeleted: { type: Boolean, default: false },
    deletedReason: { type: String, enum: DELETED_REASONS, default: null },
  },
  { timestamps: true },
);

answerEvidenceSchema.index({ schoolId: 1, 'source.type': 1, 'source.recordId': 1, 'source.itemKey': 1 }, { unique: true });
answerEvidenceSchema.index({ schoolId: 1, studentId: 1, subjectId: 1, topicNodeId: 1, markedAt: -1 });
answerEvidenceSchema.index({ schoolId: 1, classId: 1, subjectId: 1, topicNodeId: 1 });
answerEvidenceSchema.index({ schoolId: 1, 'source.parentId': 1, classId: 1, isDeleted: 1 });
answerEvidenceSchema.index({ 'diagnosis.state': 1, markedAt: 1 }, { partialFilterExpression: { 'diagnosis.state': 'pending' } });
answerEvidenceSchema.index({ schoolId: 1, 'diagnosis.cacheKey': 1 });
answerEvidenceSchema.index({ schoolId: 1, 'diagnosis.typeId': 1 });

export const AnswerEvidence = mongoose.model<IAnswerEvidence>('AnswerEvidence', answerEvidenceSchema);
```

```ts
// src/modules/Evidence/model-taxonomy.ts
//
// The misconception taxonomy (global: curriculum knowledge, no learner data),
// the per-school diagnosis cache, and the ledger of every AI call Phase E makes.
import mongoose, { Schema, Document, Types } from 'mongoose';

export const TYPE_KINDS = ['misconception', 'procedural', 'generic'] as const;
export type TypeKind = (typeof TYPE_KINDS)[number];
export const TYPE_STATUSES = ['seeded', 'proposed', 'approved', 'merged', 'retired'] as const;
export type TypeStatus = (typeof TYPE_STATUSES)[number];
/** Usable in a diagnosis. */
export const ACTIVE_TYPE_STATUSES: readonly TypeStatus[] = ['seeded', 'proposed', 'approved'];
export const TYPE_ORIGINS = ['system', 'ai_seed', 'ai_proposed', 'reviewer'] as const;

export interface IMisconceptionType extends Document {
  code: string;
  kind: TypeKind;
  subjectNodeId: Types.ObjectId | null;
  topicNodeId: Types.ObjectId | null;
  /** Set only for a school's own custom topic node. */
  schoolId: Types.ObjectId | null;
  label: string;
  learnerLabel: string;
  description: string;
  status: TypeStatus;
  origin: (typeof TYPE_ORIGINS)[number];
  learnerVisible: boolean;
  mergedInto: Types.ObjectId | null;
  suggestedMergeInto: Types.ObjectId | null;
  suggestedMergeConfidence: number | null;
  useCount: number;
  lastUsedAt: Date | null;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ref = (to: string) => ({ type: Schema.Types.ObjectId, ref: to, default: null });

const misconceptionTypeSchema = new Schema<IMisconceptionType>(
  {
    code: { type: String, required: true, trim: true },
    kind: { type: String, enum: TYPE_KINDS, required: true },
    subjectNodeId: ref('CurriculumNode'),
    topicNodeId: ref('CurriculumNode'),
    schoolId: ref('School'),
    label: { type: String, required: true, maxlength: 60 },
    learnerLabel: { type: String, required: true, maxlength: 60 },
    description: { type: String, default: '', maxlength: 300 },
    status: { type: String, enum: TYPE_STATUSES, required: true },
    origin: { type: String, enum: TYPE_ORIGINS, required: true },
    learnerVisible: { type: Boolean, default: true },
    mergedInto: ref('MisconceptionType'),
    suggestedMergeInto: ref('MisconceptionType'),
    suggestedMergeConfidence: { type: Number, default: null },
    useCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    reviewedBy: ref('User'),
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
misconceptionTypeSchema.index({ code: 1 }, { unique: true });
misconceptionTypeSchema.index({ topicNodeId: 1, status: 1 });
misconceptionTypeSchema.index({ status: 1, createdAt: -1 });

export const MisconceptionType = mongoose.model<IMisconceptionType>('MisconceptionType', misconceptionTypeSchema);

export interface IDiagnosisCache extends Document {
  schoolId: Types.ObjectId;
  cacheKey: string;
  typeId: Types.ObjectId;
  explanation: string;
  confidence: number;
  requestId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const diagnosisCacheSchema = new Schema<IDiagnosisCache>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    cacheKey: { type: String, required: true },
    typeId: { type: Schema.Types.ObjectId, ref: 'MisconceptionType', required: true },
    explanation: { type: String, default: '', maxlength: 240 },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    requestId: ref('DiagnosisRequest'),
  },
  { timestamps: true },
);
diagnosisCacheSchema.index({ cacheKey: 1 }, { unique: true });
diagnosisCacheSchema.index({ schoolId: 1, typeId: 1 });

export const DiagnosisCache = mongoose.model<IDiagnosisCache>('DiagnosisCache', diagnosisCacheSchema);

export const REQUEST_KINDS = ['diagnosis', 'seed', 'tagging', 'tidy'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];
export const REQUEST_MODES = ['batch', 'direct', 'fixture'] as const;
export type RequestMode = (typeof REQUEST_MODES)[number];

export interface IDiagnosisRequest extends Document {
  kind: RequestKind;
  /** Null for platform work (pre-seeding, the weekly tidy). */
  schoolId: Types.ObjectId | null;
  topicNodeId: Types.ObjectId | null;
  paperId: Types.ObjectId | null;
  mode: RequestMode;
  batchId: string | null;
  state: 'submitted' | 'done' | 'failed';
  items: Array<{ ref: string; cacheKey: string }>;
  model: string;
  usage: { input: number; output: number };
  error: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const diagnosisRequestSchema = new Schema<IDiagnosisRequest>(
  {
    kind: { type: String, enum: REQUEST_KINDS, required: true },
    schoolId: ref('School'),
    topicNodeId: ref('CurriculumNode'),
    paperId: ref('AssessmentPaper'),
    mode: { type: String, enum: REQUEST_MODES, required: true },
    batchId: { type: String, default: null },
    state: { type: String, enum: ['submitted', 'done', 'failed'], required: true },
    items: { type: [{ ref: { type: String, required: true }, cacheKey: { type: String, required: true }, _id: false }], default: [] },
    model: { type: String, required: true },
    usage: { input: { type: Number, default: 0 }, output: { type: Number, default: 0 } },
    error: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
diagnosisRequestSchema.index({ schoolId: 1, kind: 1, createdAt: -1 });
diagnosisRequestSchema.index({ state: 1, kind: 1, batchId: 1 });
diagnosisRequestSchema.index({ 'items.cacheKey': 1, state: 1 });

export const DiagnosisRequest = mongoose.model<IDiagnosisRequest>('DiagnosisRequest', diagnosisRequestSchema);
```

```ts
// src/modules/Evidence/taxonomy-generic.ts
//
// The generic misconception types (spec §6.2), seeded as data. A reviewer's
// rename survives: seeding only inserts what is missing.
import { MisconceptionType } from './model-taxonomy.js';
import type { Oid } from './types.js';

export const GENERIC_TYPES = [
  { slug: 'unanswered', label: 'Not answered', learnerLabel: 'Not answered', description: 'No answer was given, or only the question was copied out.', learnerVisible: true },
  { slug: 'incomplete-answer', label: 'Answer incomplete', learnerLabel: 'Answer incomplete', description: 'Started on the right lines but stopped before the final answer or a required part.', learnerVisible: true },
  { slug: 'no-working', label: 'Working not shown', learnerLabel: 'Working not shown', description: 'A final answer without the steps the marks are given for.', learnerVisible: true },
  { slug: 'misread-question', label: 'Misread the question', learnerLabel: 'Misread the question', description: 'Answered a different question from the one asked, or used the wrong given value.', learnerVisible: true },
  { slug: 'careless-arithmetic', label: 'Arithmetic slip', learnerLabel: 'Arithmetic slip', description: 'The method is right but a calculation step went wrong.', learnerVisible: true },
  { slug: 'units-notation', label: 'Units or notation', learnerLabel: 'Units or notation', description: 'Missing or wrong units, symbols or notation.', learnerVisible: true },
  { slug: 'wrong-method', label: 'Wrong method', learnerLabel: 'Wrong method', description: 'A method that does not fit the question was used.', learnerVisible: true },
  { slug: 'imprecise-terminology', label: 'Term or definition not precise', learnerLabel: 'Term not precise', description: 'A term or definition is vague, incomplete or not the one required.', learnerVisible: true },
  { slug: 'possible-marking-error', label: 'Check this mark', learnerLabel: 'Check this mark', description: 'The answer may deserve more marks than it was given.', learnerVisible: false },
] as const;

export type GenericSlug = (typeof GENERIC_TYPES)[number]['slug'];
export const genericCode = (slug: GenericSlug): string => `GEN.${slug}`;

let cache: Map<GenericSlug, Oid> | null = null;

/** Inserts any missing generic type and returns slug → id. Cached for the process. */
export async function ensureGenericTypes(): Promise<Map<GenericSlug, Oid>> {
  if (cache) return cache;
  await MisconceptionType.bulkWrite(GENERIC_TYPES.map((t) => ({
    updateOne: {
      filter: { code: genericCode(t.slug) },
      update: { $setOnInsert: {
        code: genericCode(t.slug), kind: 'generic', subjectNodeId: null, topicNodeId: null, schoolId: null,
        label: t.label, learnerLabel: t.learnerLabel, description: t.description, status: 'approved', origin: 'system',
        learnerVisible: t.learnerVisible,
      } },
      upsert: true,
    },
  })));
  const docs = await MisconceptionType.find({ code: { $in: GENERIC_TYPES.map((t) => genericCode(t.slug)) } }).select('code').lean();
  cache = new Map(docs.map((d) => [d.code.slice(4) as GenericSlug, d._id as Oid]));
  return cache;
}

export async function genericTypeId(slug: GenericSlug): Promise<Oid> {
  const id = (await ensureGenericTypes()).get(slug);
  if (!id) throw new Error(`Generic misconception type ${slug} is missing`);
  return id;
}

/** Tests only: forget the ids (another test file may have wiped the collection). */
export function resetGenericTypeCache(): void {
  cache = null;
}
```

`src/common/utils.ts` — add `'AnswerEvidence',` to the `collections` list of `cascadeSoftDeleteSchool` (after `'Mark',`). The taxonomy, cache and request ledger have no `isDeleted`; they are not school data.

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/models.test.ts && npx tsc --noEmit`
Expected: PASS (3 tests); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/common/utils.ts
LANE_SWEEP_OK=1 git commit -m "feat(evidence): the AnswerEvidence record, the misconception taxonomy with its generic types, the cache and the AI ledger" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: pure helpers, write-time rules, the topic resolver and the row writer

**Files:**
- Create: `src/modules/Evidence/normalise.ts`
- Create: `src/modules/Evidence/rules.ts`
- Create: `src/modules/Evidence/topic-resolver.ts`
- Create: `src/modules/Evidence/write-rows.ts`
- Test: `src/modules/Evidence/__tests__/normalise.test.ts`, `src/modules/Evidence/__tests__/write-rows.test.ts`

**Interfaces:**
- Consumes: Task 4 (models, `genericTypeId`, types).
- Produces: `MAX_ANSWER_CHARS = 2000`, `MAX_NOTE_CHARS = 500`; `normaliseAnswer(text, kind): string`; `answerHash(text, kind): string` (sha256 hex of the normalised text); `capText(text, max): { text; truncated }`; `normaliseQuestionNumber(raw): string`; `isBlankAnswer(text): boolean`; `diagnosisCacheKey(schoolId: string, questionKey: string, hash: string, awarded: number, available: number): string`; `UNANSWERED_EXPLANATION`; `initialDiagnosis(input: RuleInput, unansweredTypeId: Oid): IEvidenceDiagnosis`; `type TopicResolver = (nodeId: Oid | null) => Promise<{ topicNodeId: Oid | null; subtopicNodeId: Oid | null }>`; `createTopicResolver(schoolId: Oid): TopicResolver`; `schoolSubjectForNode(schoolId: Oid, nodeId: Oid | null): Promise<Oid | null>`; `writeEvidenceRows(record: EvidenceRecord, items: readonly EvidenceItem[], options?: WriterOptions): Promise<WriteResult>`; `softDeleteRows(filter: Record<string, unknown>, reason: DeletedReason): Promise<number>`; `safeEvidence(label: string, run: () => Promise<unknown>): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/Evidence/__tests__/normalise.test.ts
import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import {
  answerHash, capText, diagnosisCacheKey, isBlankAnswer, normaliseAnswer, normaliseQuestionNumber,
} from '../normalise.js';
import { UNANSWERED_EXPLANATION, initialDiagnosis } from '../rules.js';

describe('normaliseQuestionNumber', () => {
  it.each(['Q2.3', 'Question 2.3', '2.3.', ' 2.3 ', 'q 2.3', 'Q.2.3'])('%s → 2.3', (raw) => {
    expect(normaliseQuestionNumber(raw)).toBe('2.3');
  });
});

describe('normaliseAnswer and answerHash', () => {
  it('ignores case, spacing round operators and a trailing full stop', () => {
    expect(normaliseAnswer('  X = 2 + 3y. ', 'typed')).toBe('x=2+3y');
    expect(answerHash('X = 2.', 'typed')).toBe(answerHash('x=2', 'typed'));
  });
  it('folds full-width characters (NFKC)', () => {
    expect(normaliseAnswer('ｘ＝２', 'typed')).toBe('x=2');
  });
  it('turns a choice into its upper-case label', () => {
    expect(normaliseAnswer(' b ', 'choice')).toBe('B');
  });
  it('caps long text and says so', () => {
    expect(capText('abc', 2)).toEqual({ text: 'ab', truncated: true });
    expect(capText('ab', 2)).toEqual({ text: 'ab', truncated: false });
  });
});

describe('diagnosisCacheKey', () => {
  it('is per school, question, answer and mark', () => {
    const k = diagnosisCacheKey('s1', 'q:1', 'h', 1, 3);
    expect(k).toBe(diagnosisCacheKey('s1', 'q:1', 'h', 1, 3));
    expect(k).not.toBe(diagnosisCacheKey('s2', 'q:1', 'h', 1, 3));
    expect(k).not.toBe(diagnosisCacheKey('s1', 'q:1', 'h', 2, 3));
  });
});

describe('initialDiagnosis (write-time rules)', () => {
  const unanswered = new mongoose.Types.ObjectId();
  const topic = new mongoose.Types.ObjectId();
  const base = { marksAwarded: 1, marksAvailable: 3, answerText: 'x = 4', topicNodeId: topic, cacheKey: 'k' };

  it('full marks: nothing to diagnose', () => {
    expect(initialDiagnosis({ ...base, marksAwarded: 3 }, unanswered).state).toBe('none');
  });
  it.each(['', '  ', 'No answer provided', '(no answer provided)'])('a blank answer (%j) is "Not answered" at once', (answerText) => {
    const d = initialDiagnosis({ ...base, answerText, marksAwarded: 0 }, unanswered);
    expect(d).toMatchObject({ state: 'ready', typeId: unanswered, explanation: UNANSWERED_EXPLANATION, confidence: 1 });
  });
  it('no topic: skipped, still counted at subject level', () => {
    expect(initialDiagnosis({ ...base, topicNodeId: null }, unanswered)).toMatchObject({ state: 'skipped', skippedReason: 'no_topic' });
  });
  it('otherwise waits for the job', () => {
    expect(initialDiagnosis(base, unanswered)).toMatchObject({ state: 'pending', cacheKey: 'k', attempts: 0 });
  });
  it('isBlankAnswer', () => {
    expect(isBlankAnswer('(blank)')).toBe(true);
    expect(isBlankAnswer('0')).toBe(false);
  });
});
```

```ts
// src/modules/Evidence/__tests__/write-rows.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { AnswerEvidence } from '../model.js';
import { CurriculumNode } from '../../CurriculumStructure/model.js';
import { Subject } from '../../Academic/model.js';
import { createTopicResolver, schoolSubjectForNode } from '../topic-resolver.js';
import { safeEvidence, writeEvidenceRows } from '../write-rows.js';
import { resetGenericTypeCache } from '../taxonomy-generic.js';
import type { EvidenceItem, EvidenceRecord } from '../types.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
const schoolId = oid();
const otherSchool = oid();
const nodes: Record<string, Oid> = {};

async function node(key: string, type: string, parentId: Oid | null, owner: Oid | null = null, subjectId: Oid | null = null): Promise<Oid> {
  const id = oid();
  await CurriculumNode.collection.insertOne({
    _id: id, frameworkId: oid(), type, parentId, title: key, code: `E-RW-${String(id)}`, description: '', metadata: {},
    order: 0, schoolId: owner, subjectId, isDeleted: false, createdAt: new Date(), updatedAt: new Date(),
  });
  nodes[key] = id;
  return id;
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  const subject = await node('Mathematics', 'subject', null);
  const topic = await node('Functions', 'topic', subject, null, subject);
  const sub = await node('Inverses', 'subtopic', topic, null, subject);
  await node('Find the inverse', 'outcome', sub, null, subject);
  await node('Custom', 'topic', null, otherSchool);
  await Subject.collection.insertOne({ _id: oid(), schoolId, name: 'Mathematics', curriculumNodeId: subject, isDeleted: false });
});
beforeEach(() => resetGenericTypeCache());
afterAll(async () => {
  await Promise.all([
    AnswerEvidence.deleteMany({ schoolId }), CurriculumNode.deleteMany({ code: /^E-RW-/ }), Subject.deleteMany({ schoolId }),
  ]);
  await mongoose.disconnect();
});

const recordId = oid();
const record = (overrides: Partial<EvidenceRecord> = {}): EvidenceRecord => ({
  schoolId, studentId: oid(), userId: null, classId: oid(), subjectId: oid(), gradeId: null,
  source: { type: 'test', channel: 'online', recordId, parentId: oid(), attemptNumber: 1 },
  markedAt: new Date('2026-09-20T08:00:00Z'), status: 'provisional', finalAt: null, totalOverridden: false, ...overrides,
});
const item = (itemKey: string, overrides: Partial<EvidenceItem> = {}): EvidenceItem => ({
  itemKey, position: 0, questionKey: `p:x:v1:${itemKey}`, questionId: null, nodeId: nodes.Inverses, topicFrom: 'paper_question',
  cognitiveLevel: 'routine', marksAwarded: 1, marksAvailable: 3, answerText: 'y = 2x', answerKind: 'typed', markedBy: 'ai',
  markerNote: 'Swapped x and y but did not solve for y.', ...overrides,
});

describe('createTopicResolver', () => {
  it('subtopic → its parent topic; outcome walks up; subject → none; another school’s node → none', async () => {
    const resolve = createTopicResolver(schoolId);
    expect(await resolve(nodes.Inverses)).toEqual({ topicNodeId: nodes.Functions, subtopicNodeId: nodes.Inverses });
    expect(await resolve(nodes['Find the inverse'])).toEqual({ topicNodeId: nodes.Functions, subtopicNodeId: nodes.Inverses });
    expect(await resolve(nodes.Functions)).toEqual({ topicNodeId: nodes.Functions, subtopicNodeId: null });
    expect(await resolve(nodes.Mathematics)).toEqual({ topicNodeId: null, subtopicNodeId: null });
    expect(await resolve(nodes.Custom)).toEqual({ topicNodeId: null, subtopicNodeId: null });
  });

  it("finds the school's Subject for a node", async () => {
    const subjectId = await schoolSubjectForNode(schoolId, nodes.Inverses);
    expect(subjectId).not.toBeNull();
  });
});

describe('writeEvidenceRows', () => {
  it('writes one row per item with topic, level and a pending diagnosis', async () => {
    const result = await writeEvidenceRows(record(), [item('1.1'), item('1.2', { marksAwarded: 3 })]);
    expect(result).toMatchObject({ written: 2, updated: 0, unchanged: 0, withTopic: 2, withLevel: 2 });
    const r = await AnswerEvidence.findOne({ schoolId, 'source.recordId': recordId, 'source.itemKey': '1.1' }).lean();
    expect(String(r!.topicNodeId)).toBe(String(nodes.Functions));
    expect(String(r!.subtopicNodeId)).toBe(String(nodes.Inverses));
    expect(r!.diagnosis.state).toBe('pending');
    expect(r!.answer).toMatchObject({ kind: 'typed', text: 'y = 2x', truncated: false });
  });

  it('writing the same set again changes nothing', async () => {
    const before = await AnswerEvidence.findOne({ schoolId, 'source.itemKey': '1.1' }).lean();
    const result = await writeEvidenceRows(record({ studentId: before!.studentId, classId: before!.classId, subjectId: before!.subjectId, source: { ...record().source, parentId: before!.source.parentId } }), [item('1.1'), item('1.2', { marksAwarded: 3 })]);
    expect(result).toMatchObject({ written: 0, updated: 0, unchanged: 2 });
    const after = await AnswerEvidence.findOne({ schoolId, 'source.itemKey': '1.1' }).lean();
    expect(after!.updatedAt.getTime()).toBe(before!.updatedAt.getTime());
  });

  it('a changed mark resets that diagnosis; an unchanged row keeps a dismissal', async () => {
    const one = await AnswerEvidence.findOne({ schoolId, 'source.itemKey': '1.1' }).lean();
    const rec = record({ studentId: one!.studentId, classId: one!.classId, subjectId: one!.subjectId, source: { ...record().source, parentId: one!.source.parentId } });
    await writeEvidenceRows(rec, [item('1.1'), item('1.2', { marksAwarded: 3 }), item('1.3')]);
    await AnswerEvidence.updateOne({ _id: one!._id }, { $set: { 'diagnosis.state': 'dismissed' } });
    await writeEvidenceRows(rec, [item('1.1'), item('1.2', { marksAwarded: 3 }), item('1.3', { marksAwarded: 2 })]);
    expect((await AnswerEvidence.findById(one!._id).lean())!.diagnosis.state).toBe('dismissed');
    const three = await AnswerEvidence.findOne({ schoolId, 'source.itemKey': '1.3' }).lean();
    expect(three!.marksAwarded).toBe(2);
    expect(three!.diagnosis.state).toBe('pending');
  });

  it('an item missing from the new set is soft-deleted, and comes back when it returns', async () => {
    const one = await AnswerEvidence.findOne({ schoolId, 'source.itemKey': '1.1' }).lean();
    const rec = record({ studentId: one!.studentId, classId: one!.classId, subjectId: one!.subjectId, source: { ...record().source, parentId: one!.source.parentId } });
    const removed = await writeEvidenceRows(rec, [item('1.1'), item('1.2', { marksAwarded: 3 })]);
    expect(removed.removed).toBe(1);
    expect(await AnswerEvidence.findOne({ schoolId, 'source.itemKey': '1.3' }).lean()).toMatchObject({ isDeleted: true, deletedReason: 'item_removed' });
    await writeEvidenceRows(rec, [item('1.1'), item('1.2', { marksAwarded: 3 }), item('1.3', { marksAwarded: 2 })]);
    expect(await AnswerEvidence.findOne({ schoolId, 'source.itemKey': '1.3' }).lean()).toMatchObject({ isDeleted: false, deletedReason: null });
  });

  it('skips items with no marks available, and counts rows without a topic', async () => {
    const result = await writeEvidenceRows(record({ source: { ...record().source, recordId: oid() } }), [
      item('a', { marksAvailable: 0 }), item('b', { nodeId: null, topicFrom: 'none' }),
    ]);
    expect(result.skipped).toEqual({ zero_marks: 1 });
    expect(result.withTopic).toBe(0);
  });

  it('a dry run writes nothing', async () => {
    const id = oid();
    const result = await writeEvidenceRows(record({ source: { ...record().source, recordId: id } }), [item('1.1')], { dryRun: true });
    expect(result.written).toBe(1);
    expect(await AnswerEvidence.countDocuments({ 'source.recordId': id })).toBe(0);
  });
});

describe('safeEvidence', () => {
  it('logs and swallows a failure so the request carries on', async () => {
    const run = vi.fn(async () => { throw new Error('boom'); });
    await expect(safeEvidence('test', run)).resolves.toBeUndefined();
    expect(run).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/normalise.test.ts src/modules/Evidence/__tests__/write-rows.test.ts`
Expected: FAIL — `Cannot find module '../normalise.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/normalise.ts
//
// Pure helpers (spec §3, §6.1): the same answer written differently hashes the
// same, so identical wrong answers share one diagnosis per school.
import crypto from 'node:crypto';
import type { AnswerKind } from './types.js';

export const MAX_ANSWER_CHARS = 2000;
export const MAX_NOTE_CHARS = 500;

const AROUND_OPERATORS = /\s*([=+\-×÷/^(),;])\s*/g;
const BLANK = new Set(['', 'no answer provided', '(no answer provided)', '(blank)', '[blank]']);

export function normaliseAnswer(text: string, kind: AnswerKind): string {
  const base = text.normalize('NFKC').trim();
  if (kind === 'choice') return base.toUpperCase();
  return base.toLowerCase().replace(/\s+/g, ' ').replace(AROUND_OPERATORS, '$1').replace(/\.$/, '');
}

export function answerHash(text: string, kind: AnswerKind): string {
  return crypto.createHash('sha256').update(normaliseAnswer(text, kind)).digest('hex');
}

export function capText(text: string, max: number): { text: string; truncated: boolean } {
  return text.length > max ? { text: text.slice(0, max), truncated: true } : { text, truncated: false };
}

/** "Q2.3", "Question 2.3", "2.3." and " 2.3 " → "2.3" (the paper's `section.position` label). */
export function normaliseQuestionNumber(raw: string): string {
  return raw.normalize('NFKC').replace(/^\s*(question|q)\.?\s*/i, '').replace(/\s+/g, '').replace(/\.+$/, '');
}

/** Empty, or the words a marker writes for an empty answer. */
export function isBlankAnswer(text: string): boolean {
  return BLANK.has(text.trim().toLowerCase());
}

/** The same answer to the same question at the same mark, in the same school, is diagnosed once. */
export function diagnosisCacheKey(schoolId: string, questionKey: string, hash: string, awarded: number, available: number): string {
  return crypto.createHash('sha256').update(`${schoolId}|${questionKey}|${hash}|${awarded}/${available}`).digest('hex');
}
```

```ts
// src/modules/Evidence/rules.ts
//
// The diagnosis a row is born with (plan ruling P5): the no-AI rules run when
// the row is written, so a blank answer reads "Not answered" at once.
import type { IEvidenceDiagnosis } from './model.js';
import { isBlankAnswer } from './normalise.js';
import type { Oid } from './types.js';

export const UNANSWERED_EXPLANATION = 'Have a go at every question: even a first step can earn marks.';

export interface RuleInput {
  marksAwarded: number;
  marksAvailable: number;
  answerText: string;
  topicNodeId: Oid | null;
  cacheKey: string;
}

export function initialDiagnosis(input: RuleInput, unansweredTypeId: Oid): IEvidenceDiagnosis {
  const base: IEvidenceDiagnosis = {
    state: 'pending', typeId: null, explanation: '', confidence: null, cacheKey: input.cacheKey, skippedReason: null,
    requestId: null, attempts: 0, diagnosedAt: null, dismissedBy: null, dismissedAt: null,
  };
  if (input.marksAwarded >= input.marksAvailable) return { ...base, state: 'none' };
  if (isBlankAnswer(input.answerText)) {
    return { ...base, state: 'ready', typeId: unansweredTypeId, explanation: UNANSWERED_EXPLANATION, confidence: 1, diagnosedAt: new Date() };
  }
  if (!input.topicNodeId) return { ...base, state: 'skipped', skippedReason: 'no_topic' };
  return base;
}
```

```ts
// src/modules/Evidence/topic-resolver.ts
//
// Any curriculum node → the topic (and subtopic) a row counts under (spec §3).
// A node the school can't see, or one above topic level, gives no topic.
import mongoose from 'mongoose';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { Subject } from '../Academic/model.js';
import type { Oid } from './types.js';

export interface ResolvedTopic { topicNodeId: Oid | null; subtopicNodeId: Oid | null }
export type TopicResolver = (nodeId: Oid | null) => Promise<ResolvedTopic>;

interface NodeLite { _id: Oid; type: string; parentId: Oid | null; subjectId: Oid | null }

const NONE: ResolvedTopic = { topicNodeId: null, subtopicNodeId: null };
const MAX_HOPS = 6;

function nodeLoader(schoolId: Oid): (id: Oid) => Promise<NodeLite | null> {
  const seen = new Map<string, Promise<NodeLite | null>>();
  return (id: Oid) => {
    const key = String(id);
    if (!seen.has(key)) {
      seen.set(key, CurriculumNode.findOne({
        _id: new mongoose.Types.ObjectId(key), isDeleted: false, $or: [{ schoolId: null }, { schoolId }],
      }).select('type parentId subjectId').lean().then((n) => (n as NodeLite | null)));
    }
    return seen.get(key)!;
  };
}

/** One resolver per writer run: every node is loaded once. */
export function createTopicResolver(schoolId: Oid): TopicResolver {
  const load = nodeLoader(schoolId);
  return async (nodeId: Oid | null): Promise<ResolvedTopic> => {
    if (!nodeId) return NONE;
    let node = await load(nodeId);
    for (let hop = 0; node && hop < MAX_HOPS; hop += 1) {
      if (node.type === 'topic') return { topicNodeId: node._id, subtopicNodeId: null };
      if (node.type === 'subtopic') {
        const parent = node.parentId ? await load(node.parentId) : null;
        return { topicNodeId: parent?.type === 'topic' ? parent._id : null, subtopicNodeId: node._id };
      }
      if (node.type !== 'outcome' || !node.parentId) return NONE;
      node = await load(node.parentId);
    }
    return NONE;
  };
}

/** The school's own Subject for a curriculum node (library blocks carry only the node). */
export async function schoolSubjectForNode(schoolId: Oid, nodeId: Oid | null): Promise<Oid | null> {
  if (!nodeId) return null;
  const node = await nodeLoader(schoolId)(nodeId);
  if (!node?.subjectId) return null;
  const subject = await Subject.findOne({ schoolId, curriculumNodeId: node.subjectId, isDeleted: false }).select('_id').lean();
  return (subject?._id as Oid | undefined) ?? null;
}
```

```ts
// src/modules/Evidence/write-rows.ts
//
// Writes the whole set of one source record's rows (spec §3): upsert each item
// by (school, source, record, item), soft-delete items no longer in the set,
// reset a row's diagnosis only when its answer, marks or topic changed.
import type { AnyBulkWriteOperation } from 'mongoose';
import { logger } from '../../common/logger.js';
import { AnswerEvidence, type IAnswerEvidence, type IEvidenceDiagnosis } from './model.js';
import { MAX_ANSWER_CHARS, MAX_NOTE_CHARS, answerHash, capText, diagnosisCacheKey } from './normalise.js';
import { initialDiagnosis } from './rules.js';
import { genericTypeId } from './taxonomy-generic.js';
import { createTopicResolver, type TopicResolver } from './topic-resolver.js';
import {
  emptyResult, type DeletedReason, type EvidenceItem, type EvidenceRecord, type Oid, type WriteResult, type WriterOptions,
} from './types.js';

type Lean = Pick<IAnswerEvidence, 'marksAwarded' | 'marksAvailable' | 'topicNodeId' | 'isDeleted' | 'status' | 'finalAt' | 'markedBy'
  | 'markerNote' | 'totalOverridden' | 'cognitiveLevel' | 'questionKey' | 'topicFrom' | 'classId' | 'subjectId'> & {
  _id: Oid; answer: { hash: string }; source: { itemKey: string; channel: string | null; position: number };
};

interface BuiltRow { fields: Record<string, unknown>; diagnosis: IEvidenceDiagnosis; topicNodeId: Oid | null; hash: string }

async function buildRow(record: EvidenceRecord, item: EvidenceItem, resolve: TopicResolver, unanswered: Oid): Promise<BuiltRow> {
  const topic = await resolve(item.nodeId);
  const answer = capText(item.answerText, MAX_ANSWER_CHARS);
  const hash = answerHash(item.answerText, item.answerKind);
  const cacheKey = diagnosisCacheKey(String(record.schoolId), item.questionKey, hash, item.marksAwarded, item.marksAvailable);
  const fields: Record<string, unknown> = {
    studentId: record.studentId, userId: record.userId, classId: record.classId, subjectId: record.subjectId, gradeId: record.gradeId,
    topicNodeId: topic.topicNodeId, subtopicNodeId: topic.subtopicNodeId,
    topicFrom: topic.topicNodeId ? item.topicFrom : 'none', cognitiveLevel: item.cognitiveLevel,
    marksAwarded: item.marksAwarded, marksAvailable: item.marksAvailable,
    'source.channel': record.source.channel, 'source.parentId': record.source.parentId,
    'source.position': item.position, 'source.attemptNumber': record.source.attemptNumber,
    questionKey: item.questionKey, questionId: item.questionId,
    answer: { kind: item.answerKind, text: answer.text, truncated: answer.truncated, hash },
    markedBy: item.markedBy, markerNote: item.markerNote.slice(0, MAX_NOTE_CHARS),
    markedAt: record.markedAt, status: record.status, finalAt: record.finalAt, totalOverridden: record.totalOverridden,
  };
  const diagnosis = initialDiagnosis({
    marksAwarded: item.marksAwarded, marksAvailable: item.marksAvailable, answerText: item.answerText,
    topicNodeId: topic.topicNodeId, cacheKey,
  }, unanswered);
  return { fields, diagnosis, topicNodeId: topic.topicNodeId, hash };
}

/** Answer, marks or topic changed: the old reason no longer applies. */
function diagnosisStale(prior: Lean, row: BuiltRow): boolean {
  return prior.answer.hash !== row.hash
    || prior.marksAwarded !== row.fields.marksAwarded
    || prior.marksAvailable !== row.fields.marksAvailable
    || String(prior.topicNodeId ?? '') !== String(row.topicNodeId ?? '');
}

/** Everything else a re-sync may change (status at issue, a teacher's mark, the marker's note). */
function sameDetails(prior: Lean, f: Record<string, unknown>): boolean {
  return prior.status === f.status
    && String(prior.finalAt?.getTime() ?? '') === String((f.finalAt as Date | null)?.getTime() ?? '')
    && prior.markedBy === f.markedBy && prior.markerNote === f.markerNote && prior.totalOverridden === f.totalOverridden
    && prior.cognitiveLevel === f.cognitiveLevel && prior.questionKey === f.questionKey && prior.topicFrom === f.topicFrom
    && prior.source.channel === f['source.channel'] && prior.source.position === f['source.position']
    && String(prior.classId ?? '') === String(f.classId ?? '') && String(prior.subjectId ?? '') === String(f.subjectId ?? '');
}

export async function writeEvidenceRows(
  record: EvidenceRecord, items: readonly EvidenceItem[], options: WriterOptions = {},
): Promise<WriteResult> {
  const result = emptyResult();
  const resolve = createTopicResolver(record.schoolId);
  const unanswered = await genericTypeId('unanswered');
  const key = { schoolId: record.schoolId, 'source.type': record.source.type, 'source.recordId': record.source.recordId };
  const existing = (await AnswerEvidence.find(key).lean()) as unknown as Lean[];
  const byItem = new Map(existing.map((r: Lean) => [r.source.itemKey, r]));
  const kept = new Set<string>();
  const ops: AnyBulkWriteOperation<IAnswerEvidence>[] = [];

  for (const item of items) {
    if (!(item.marksAvailable > 0)) {
      result.skipped.zero_marks = (result.skipped.zero_marks ?? 0) + 1;
      continue;
    }
    if (kept.has(item.itemKey)) continue;
    kept.add(item.itemKey);
    const row = await buildRow(record, item, resolve, unanswered);
    if (row.topicNodeId) result.withTopic += 1;
    if (item.cognitiveLevel) result.withLevel += 1;
    const prior = byItem.get(item.itemKey);
    const stale = !prior || diagnosisStale(prior, row);
    if (prior && !stale && !prior.isDeleted && sameDetails(prior, row.fields)) {
      result.unchanged += 1;
      continue;
    }
    if (prior) result.updated += 1;
    else result.written += 1;
    ops.push({
      updateOne: {
        filter: { ...key, 'source.itemKey': item.itemKey },
        update: { $set: { ...row.fields, isDeleted: false, deletedReason: null, ...(stale ? { diagnosis: row.diagnosis } : {}) } },
        upsert: true,
      },
    });
  }

  const gone = existing.filter((r: Lean) => !r.isDeleted && !kept.has(r.source.itemKey));
  result.removed = gone.length;
  if (options.dryRun) return result;
  if (ops.length > 0) await AnswerEvidence.bulkWrite(ops, { ordered: false });
  if (gone.length > 0) await softDeleteRows({ schoolId: record.schoolId, _id: { $in: gone.map((r: Lean) => r._id) } }, 'item_removed');
  return result;
}

/** Soft-deletes matching live rows with a reason; returns how many. */
export async function softDeleteRows(filter: Record<string, unknown>, reason: DeletedReason): Promise<number> {
  const res = await AnswerEvidence.updateMany({ ...filter, isDeleted: false }, { $set: { isDeleted: true, deletedReason: reason } });
  return res.modifiedCount;
}

/** Every hook: evidence never fails the learner's or teacher's request; the daily reconcile repairs a miss. */
export async function safeEvidence(label: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (err: unknown) {
    logger.error({ err, label }, '[Evidence] writing evidence failed; the daily reconcile will retry');
  }
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence && npx tsc --noEmit`
Expected: PASS (models, normalise, write-rows); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence
LANE_SWEEP_OK=1 git commit -m "feat(evidence): answer normalisation, write-time rules, topic resolution and the idempotent row writer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: tests and scripts write evidence (online, photographed, teacher edits, issue)

**Files:**
- Create: `src/modules/Evidence/writers/test-paper.ts`
- Create: `src/modules/Evidence/writers/test.ts`
- Create: `src/test-utils/evidence-fixtures.ts` (used by Tasks 6, 14, 16)
- Modify: `src/modules/AITools/service-marking-text.ts:123-124` (hook after the `completed` save)
- Modify: `src/modules/AITools/service-marking.ts:150-151` (hook after the terminal save)
- Modify: `src/modules/AITools/service-marking-queries.ts:89-90` (`updateMarking` hook), `:206` (`issueMarking` hook)
- Test: `src/modules/Evidence/__tests__/test-writer.test.ts`

**Interfaces:**
- Consumes: `writeEvidenceRows`, `softDeleteRows`, `safeEvidence`, `normaliseQuestionNumber` (Task 5); `IPaperQuestion` tags (Task 1).
- Produces: `interface PaperQuestionInfo { questionKey: string; questionId: Oid | null; nodeId: Oid | null; level: CapsLevel | null; topicFrom: TopicFrom; hasOptions: boolean }`; `interface PaperContext { subjectId: Oid | null; gradeId: Oid | null; questions: Map<string, PaperQuestionInfo>; keyFor(label: string): string }`; `loadPaperContext(marking): Promise<PaperContext | null>`; `WRITABLE_MARKING_STATUSES = ['completed', 'needs_review', 'published']`; `syncMarkingEvidence(markingId: string | Oid, options?: WriterOptions & { studentId?: string }): Promise<WriteResult | null>` (`result.skipped.unmatched_number` counts marked numbers not on the paper — the row is still written).
- Produces (fixture): `interface MarkedPaperFixture { schoolId; teacherId; classId; paperId; topicId; subtopicId; bankQuestionId; students: Oid[] }`; `seedMarkedPaper(input?: { schoolId?: Oid; teacherId?: Oid; classId?: Oid; students?: Oid[] }): Promise<MarkedPaperFixture>` (paper: section 1 = bank question on the subtopic + inline question tagged to the topic (`complex`); section 2 = untagged inline question); `seedMarking(fx, studentId, answers: Array<{ n: string; answer: string; awarded: number; max: number }>, extra?: Record<string, unknown>): Promise<Oid>` (a `completed` PaperMarking with `aiRawResult` equal to the marks); `cleanUpEvidenceFixtures(schoolId: Oid): Promise<void>`.

- [ ] **Step 1: Write the fixture and the failing test**

```ts
// src/test-utils/evidence-fixtures.ts
//
// A marked test the way the AI leaves it: a paper with a bank question, a
// tagged inline question and an untagged one; markings per learner.
import mongoose from 'mongoose';
import { AssessmentPaper, Question } from '../modules/QuestionBank/model.js';
import { PaperMarking } from '../modules/AITools/model-marking.js';
import { CurriculumNode } from '../modules/CurriculumStructure/model.js';
import { Student } from '../modules/Student/model.js';
import { AnswerEvidence } from '../modules/Evidence/model.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();

export interface MarkedPaperFixture {
  schoolId: Oid; teacherId: Oid; classId: Oid; paperId: Oid; topicId: Oid; subtopicId: Oid; bankQuestionId: Oid; students: Oid[];
}

async function node(type: string, title: string, parentId: Oid | null, subjectId: Oid | null): Promise<Oid> {
  const id = oid();
  await CurriculumNode.collection.insertOne({
    _id: id, frameworkId: oid(), type, parentId, title, code: `E-FX-${String(id)}`, description: '', metadata: {},
    order: 0, schoolId: null, subjectId, isDeleted: false, createdAt: new Date(), updatedAt: new Date(),
  });
  return id;
}

export async function seedMarkedPaper(input: { schoolId?: Oid; teacherId?: Oid; classId?: Oid; students?: Oid[] } = {}): Promise<MarkedPaperFixture> {
  const schoolId = input.schoolId ?? oid();
  const teacherId = input.teacherId ?? oid();
  const classId = input.classId ?? oid();
  const subject = await node('subject', 'Mathematics', null, null);
  const topicId = await node('topic', 'Functions', subject, subject);
  const subtopicId = await node('subtopic', 'Inverse functions', topicId, subject);
  const bank = await Question.create({
    curriculumNodeId: subtopicId, schoolId, subjectId: oid(), gradeId: oid(), type: 'short_answer',
    stem: 'Write down the inverse of f(x) = 3x.', answer: 'f^-1(x) = x/3', markingRubric: '1 mark for swapping, 1 for solving.',
    marks: 2, cognitiveLevel: { caps: 'routine', blooms: 'apply' }, status: 'approved', createdBy: teacherId,
  });
  const paper = await AssessmentPaper.create({
    schoolId, title: 'Functions test', subjectId: oid(), gradeId: oid(), topicIds: [topicId], term: 1, year: 2026,
    paperType: 'class_test', duration: 30, totalMarks: 8, status: 'finalised', createdBy: teacherId,
    sections: [
      { title: 'A', instructions: '', order: 0, questions: [
        { questionId: bank._id, questionText: null, marks: 2, position: 0 },
        { questionText: 'Is the inverse of y = x² a function? Explain.', marks: 3, position: 1, modelAnswer: 'No: it fails the vertical line test.',
          curriculumNodeId: topicId, capsLevel: 'complex', tagFrom: 'generator' },
      ] },
      { title: 'B', instructions: '', order: 1, questions: [
        { questionText: 'Sketch y = 2^x.', marks: 3, position: 0, modelAnswer: 'Exponential curve through (0;1).' },
      ] },
    ],
  });
  const students = input.students ?? [oid(), oid(), oid()];
  for (const studentId of students) {
    if (!(await Student.exists({ _id: studentId }))) {
      await Student.collection.insertOne({ _id: studentId, schoolId, classId, gradeId: oid(), admissionNumber: `E-${String(studentId)}`, isDeleted: false });
    }
  }
  return { schoolId, teacherId, classId, paperId: paper._id as Oid, topicId, subtopicId, bankQuestionId: bank._id as Oid, students };
}

export async function seedMarking(
  fx: MarkedPaperFixture, studentId: Oid, answers: Array<{ n: string; answer: string; awarded: number; max: number }>,
  extra: Record<string, unknown> = {},
): Promise<Oid> {
  const questions = answers.map((a) => ({
    questionNumber: a.n, studentAnswer: a.answer, correctAnswer: '', marksAwarded: a.awarded, maxMarks: a.max,
    feedback: a.awarded < a.max ? 'Not quite.' : 'Good.', rationale: a.awarded < a.max ? 'Method incomplete.' : 'Correct.',
  }));
  const total = answers.reduce((s, a) => s + a.awarded, 0);
  const max = answers.reduce((s, a) => s + a.max, 0);
  const m = await PaperMarking.create({
    paperId: fx.paperId, paperType: 'assessment', studentId, studentName: 'Learner', teacherId: fx.teacherId, schoolId: fx.schoolId,
    classId: fx.classId, imageCount: 0, totalMarks: total, maxMarks: max, percentage: Math.round((total / max) * 100), status: 'completed',
    questions, aiRawResult: { questions }, paperVersion: 1, images: [], ...extra,
  });
  return m._id as Oid;
}

export async function cleanUpEvidenceFixtures(schoolId: Oid): Promise<void> {
  await Promise.all([
    AssessmentPaper.deleteMany({ schoolId }), Question.deleteMany({ schoolId }), PaperMarking.deleteMany({ schoolId }),
    Student.deleteMany({ schoolId }), AnswerEvidence.deleteMany({ schoolId }), CurriculumNode.deleteMany({ code: /^E-FX-/ }),
  ]);
}
```

```ts
// src/modules/Evidence/__tests__/test-writer.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../../Academic/service-gradebook-publish.js', () => ({
  publishMarkToGradebook: vi.fn().mockResolvedValue(undefined),
  findOrCreateAssessmentForPaper: vi.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
}));

import { AnswerEvidence } from '../model.js';
import { PaperMarking } from '../../AITools/model-marking.js';
import { GeneratedPaper } from '../../AITools/model.js';
import { PaperSubmission } from '../../QuestionBank/model-submissions.js';
import { issueMarking, updateMarking } from '../../AITools/service-marking-queries.js';
import { syncMarkingEvidence } from '../writers/test.js';
import { resetGenericTypeCache } from '../taxonomy-generic.js';
import { cleanUpEvidenceFixtures, seedMarkedPaper, seedMarking, type MarkedPaperFixture } from '../../../test-utils/evidence-fixtures.js';

let fx: MarkedPaperFixture;
const rowsOf = (recordId: mongoose.Types.ObjectId) =>
  AnswerEvidence.find({ schoolId: fx.schoolId, 'source.recordId': recordId }).sort({ 'source.position': 1 }).lean();

const ANSWERS = [
  { n: 'Q1.1', answer: 'y = 3x', awarded: 1, max: 2 },
  { n: '1.2.', answer: 'No, it fails the vertical line test', awarded: 3, max: 3 },
  { n: 'Question 2.1', answer: '', awarded: 0, max: 3 },
  { n: '4', answer: 'extra working', awarded: 0, max: 1 },
];

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  fx = await seedMarkedPaper();
});
beforeEach(() => resetGenericTypeCache());
afterAll(async () => {
  await PaperSubmission.deleteMany({ schoolId: fx.schoolId });
  await GeneratedPaper.deleteMany({ schoolId: fx.schoolId });
  await cleanUpEvidenceFixtures(fx.schoolId);
  await mongoose.disconnect();
});

describe('syncMarkingEvidence', () => {
  it('writes a provisional row per marked answer with the question’s topic and level', async () => {
    const markingId = await seedMarking(fx, fx.students[0], ANSWERS);
    await syncMarkingEvidence(markingId);
    const [bank, inline, blank] = await rowsOf(markingId);
    expect(bank).toMatchObject({ questionKey: `q:${String(fx.bankQuestionId)}`, topicFrom: 'question', cognitiveLevel: 'routine', status: 'provisional' });
    expect(String(bank.topicNodeId)).toBe(String(fx.topicId));
    expect(String(bank.subtopicNodeId)).toBe(String(fx.subtopicId));
    expect(bank.diagnosis.state).toBe('pending');
    expect(inline).toMatchObject({ source: expect.objectContaining({ itemKey: '1.2' }), topicFrom: 'paper_question', cognitiveLevel: 'complex' });
    expect(inline.diagnosis.state).toBe('none');
    expect(blank).toMatchObject({ topicFrom: 'none', source: expect.objectContaining({ itemKey: '2.1', channel: 'typed_by_teacher' }) });
    expect(blank.diagnosis.state).toBe('ready');
  });

  it('an unmatched number keeps its row without a topic', async () => {
    const markingId = await seedMarking(fx, fx.students[1], ANSWERS);
    const result = await syncMarkingEvidence(markingId);
    expect(result?.skipped.unmatched_number).toBe(1);
    const rows = await rowsOf(markingId);
    expect(rows.find((r) => r.source.itemKey === '4')).toMatchObject({ topicFrom: 'none', questionKey: `p:${String(fx.paperId)}:v1:4` });
  });

  it('knows an online script from a photographed one', async () => {
    await PaperSubmission.collection.insertOne({ paperId: fx.paperId, studentId: fx.students[2], schoolId: fx.schoolId, status: 'submitted', answers: [], isDeleted: false });
    const online = await seedMarking(fx, fx.students[2], ANSWERS.slice(0, 1));
    await syncMarkingEvidence(online);
    expect((await rowsOf(online))[0].source.channel).toBe('online');
    const photo = await seedMarking(fx, fx.students[2], ANSWERS.slice(0, 1), { images: [{ filename: 'p1.jpg', mimeType: 'image/jpeg', sizeBytes: 10, pageNumber: 1 }] });
    await syncMarkingEvidence(photo);
    expect((await rowsOf(photo))[0]).toMatchObject({ source: expect.objectContaining({ channel: 'photo' }), answer: expect.objectContaining({ kind: 'transcribed' }) });
  });

  it('a newer marking supersedes the older one, never the other way round', async () => {
    const older = await seedMarking(fx, fx.students[0], ANSWERS);
    await syncMarkingEvidence(older);
    const newer = await seedMarking(fx, fx.students[0], ANSWERS);
    await syncMarkingEvidence(newer);
    await syncMarkingEvidence(older); // e.g. the backfill walks the older one later
    expect(await AnswerEvidence.countDocuments({ 'source.recordId': older, isDeleted: false })).toBe(0);
    expect(await AnswerEvidence.countDocuments({ 'source.recordId': newer, isDeleted: false })).toBe(4);
  });

  it('writes nothing for a marking still processing or failed', async () => {
    const failed = await seedMarking(fx, fx.students[1], ANSWERS, { status: 'failed' });
    expect(await syncMarkingEvidence(failed)).toBeNull();
    expect(await AnswerEvidence.countDocuments({ 'source.recordId': failed })).toBe(0);
  });

  it('a legacy generated paper writes rows with no topic, keyed g:<paper>:<number>', async () => {
    const paperId = new mongoose.Types.ObjectId();
    await GeneratedPaper.collection.insertOne({ _id: paperId, schoolId: fx.schoolId, subject: 'Mathematics', grade: 10, topic: 'Algebra', totalMarks: 4, isDeleted: false,
      sections: [{ title: 'A', questions: [{ questionNumber: 1, questionText: 'Solve 2x = 4', modelAnswer: 'x = 2', markingGuideline: '', marks: 4 }] }] });
    const m = await PaperMarking.create({ paperId, paperType: 'generated', studentId: fx.students[1], studentName: 'Learner', teacherId: fx.teacherId,
      schoolId: fx.schoolId, totalMarks: 1, maxMarks: 4, percentage: 25, status: 'completed', paperVersion: 1, images: [],
      questions: [{ questionNumber: '1', studentAnswer: 'x = 4', correctAnswer: 'x = 2', marksAwarded: 1, maxMarks: 4, feedback: '' }] });
    await syncMarkingEvidence(m._id);
    expect(await AnswerEvidence.findOne({ 'source.recordId': m._id }).lean()).toMatchObject({
      questionKey: `g:${String(paperId)}:1`, topicFrom: 'none', diagnosis: expect.objectContaining({ state: 'skipped', skippedReason: 'no_topic' }),
    });
  });
});

describe('the marking hooks', () => {
  it('updateMarking resets only the changed row', async () => {
    const student = new mongoose.Types.ObjectId();
    const markingId = await seedMarking(fx, student, ANSWERS);
    await syncMarkingEvidence(markingId);
    const first = (await rowsOf(markingId))[0];
    await AnswerEvidence.updateOne({ _id: first._id }, { $set: { 'diagnosis.state': 'dismissed' } });

    await updateMarking(String(markingId), String(fx.schoolId), { questions: [{ questionNumber: '4', marksAwarded: 1, maxMarks: 1 }] });

    const rows = await rowsOf(markingId);
    expect(rows[0].diagnosis.state).toBe('dismissed');
    expect(rows.find((r) => r.source.itemKey === '4')).toMatchObject({ marksAwarded: 1, markedBy: 'teacher', diagnosis: expect.objectContaining({ state: 'none' }) });
    const again = await syncMarkingEvidence(markingId);
    expect(again).toMatchObject({ written: 0, updated: 0, unchanged: 4 });
  });

  it('issue turns the rows final, dated when issued', async () => {
    const student = new mongoose.Types.ObjectId();
    const markingId = await seedMarking(fx, student, ANSWERS);
    await syncMarkingEvidence(markingId);
    await issueMarking(String(markingId), String(fx.schoolId), String(fx.teacherId), String(new mongoose.Types.ObjectId()));
    const issued = await PaperMarking.findById(markingId).lean();
    const rows = await rowsOf(markingId);
    expect(rows.every((r) => r.status === 'final')).toBe(true);
    expect(rows[0].finalAt?.getTime()).toBe(issued!.issuedAt!.getTime());
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/test-writer.test.ts`
Expected: FAIL — `Cannot find module '../writers/test.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/writers/test-paper.ts
//
// What a marked test's questions are (spec §2.2): the label `section.position`
// the AI echoes, and for each its question key, topic node and level.
import { AssessmentPaper, Question } from '../../QuestionBank/model.js';
import { GeneratedPaper } from '../../AITools/model.js';
import type { IPaperMarking } from '../../AITools/model-marking.js';
import type { CapsLevel, Oid, TopicFrom } from '../types.js';

export interface PaperQuestionInfo {
  questionKey: string;
  questionId: Oid | null;
  nodeId: Oid | null;
  level: CapsLevel | null;
  topicFrom: TopicFrom;
  hasOptions: boolean;
}

export interface PaperContext {
  subjectId: Oid | null;
  gradeId: Oid | null;
  questions: Map<string, PaperQuestionInfo>;
  /** The key of a question number that is not on the paper. */
  keyFor: (label: string) => string;
}

type MarkingLike = Pick<IPaperMarking, 'paperId' | 'paperType' | 'schoolId' | 'paperVersion'>;

async function assessmentContext(m: MarkingLike): Promise<PaperContext | null> {
  const paper = await AssessmentPaper.findOne({ _id: m.paperId, schoolId: m.schoolId, isDeleted: false })
    .select('sections subjectId gradeId').lean();
  if (!paper) return null;
  const bankIds = paper.sections.flatMap((s) => s.questions.map((q) => q.questionId).filter(Boolean));
  const bank = await Question.find({ _id: { $in: bankIds }, isDeleted: false, $or: [{ schoolId: m.schoolId }, { schoolId: null }] })
    .select('curriculumNodeId cognitiveLevel').lean();
  const bankById = new Map(bank.map((q) => [String(q._id), q]));
  const inlineKey = (label: string): string => `p:${String(m.paperId)}:v${m.paperVersion ?? 1}:${label}`;
  const questions = new Map<string, PaperQuestionInfo>();
  paper.sections.forEach((section, s) => {
    for (const pq of section.questions) {
      const label = `${s + 1}.${pq.position + 1}`;
      const hasOptions = (pq.options ?? []).length > 0;
      if (pq.questionId) {
        const q = bankById.get(String(pq.questionId));
        questions.set(label, {
          questionKey: `q:${String(pq.questionId)}`, questionId: pq.questionId as Oid, nodeId: (q?.curriculumNodeId as Oid | undefined) ?? null,
          level: (q?.cognitiveLevel?.caps as CapsLevel | undefined) ?? null, topicFrom: 'question', hasOptions,
        });
      } else {
        questions.set(label, {
          questionKey: inlineKey(label), questionId: null, nodeId: (pq.curriculumNodeId as Oid | null | undefined) ?? null,
          level: pq.capsLevel ?? null, topicFrom: pq.tagFrom === 'ai_tag' ? 'ai_tag' : 'paper_question', hasOptions,
        });
      }
    }
  });
  return { subjectId: paper.subjectId as Oid, gradeId: paper.gradeId as Oid, questions, keyFor: inlineKey };
}

async function generatedContext(m: MarkingLike): Promise<PaperContext | null> {
  const paper = await GeneratedPaper.findOne({ _id: m.paperId, schoolId: m.schoolId, isDeleted: false }).select('sections').lean();
  if (!paper) return null;
  const key = (label: string): string => `g:${String(m.paperId)}:${label}`;
  const questions = new Map<string, PaperQuestionInfo>();
  for (const section of paper.sections ?? []) {
    for (const q of section.questions ?? []) {
      const label = String(q.questionNumber);
      questions.set(label, { questionKey: key(label), questionId: null, nodeId: null, level: null, topicFrom: 'none', hasOptions: false });
    }
  }
  return { subjectId: null, gradeId: null, questions, keyFor: key };
}

export function loadPaperContext(m: MarkingLike): Promise<PaperContext | null> {
  return m.paperType === 'generated' ? generatedContext(m) : assessmentContext(m);
}
```

```ts
// src/modules/Evidence/writers/test.ts
//
// Tests and scripts (spec §4.1): one row per marked answer of the newest
// usable marking of a (paper, learner). Provisional until the teacher issues.
import mongoose from 'mongoose';
import { logger } from '../../../common/logger.js';
import { PaperMarking, type IPaperMarking } from '../../AITools/model-marking.js';
import { PaperSubmission } from '../../QuestionBank/model-submissions.js';
import { Student } from '../../Student/model.js';
import { normaliseQuestionNumber } from '../normalise.js';
import { softDeleteRows, writeEvidenceRows } from '../write-rows.js';
import { loadPaperContext, type PaperContext } from './test-paper.js';
import type { Channel, EvidenceItem, Oid, WriteResult, WriterOptions } from '../types.js';

export const WRITABLE_MARKING_STATUSES = ['completed', 'needs_review', 'published'] as const;
type Marking = IPaperMarking & { _id: Oid };

/** The AI's own mark per question number, to tell a teacher's change from the AI's. */
function aiMarks(raw: Record<string, unknown> | null): Map<string, number> {
  const questions = Array.isArray(raw?.questions) ? (raw.questions as Array<{ questionNumber?: unknown; marksAwarded?: unknown }>) : [];
  return new Map(questions
    .filter((q) => typeof q.marksAwarded === 'number')
    .map((q) => [normaliseQuestionNumber(String(q.questionNumber ?? '')), q.marksAwarded as number]));
}

async function channelOf(m: Marking, studentId: Oid): Promise<Channel> {
  if ((m.images ?? []).length > 0) return 'photo';
  const online = await PaperSubmission.exists({ schoolId: m.schoolId, paperId: m.paperId, studentId, isDeleted: false });
  return online ? 'online' : 'typed_by_teacher';
}

function itemsFor(m: Marking, paper: PaperContext, channel: Channel): { items: EvidenceItem[]; unmatched: number } {
  const ai = aiMarks(m.aiRawResult);
  let unmatched = 0;
  const items = m.questions.map((q, position): EvidenceItem => {
    const label = normaliseQuestionNumber(q.questionNumber);
    const info = paper.questions.get(label);
    if (!info) unmatched += 1;
    const aiMark = ai.get(label);
    return {
      itemKey: label, position, questionKey: info?.questionKey ?? paper.keyFor(label), questionId: info?.questionId ?? null,
      nodeId: info?.nodeId ?? null, topicFrom: info?.topicFrom ?? 'none', cognitiveLevel: info?.level ?? null,
      marksAwarded: q.marksAwarded, marksAvailable: q.maxMarks, answerText: q.studentAnswer ?? '',
      answerKind: channel === 'photo' ? 'transcribed' : info?.hasOptions ? 'choice' : 'typed',
      markedBy: aiMark !== undefined && aiMark !== q.marksAwarded ? 'teacher' : 'ai',
      markerNote: q.rationale || q.feedback || '',
    };
  });
  return { items, unmatched };
}

export async function syncMarkingEvidence(
  markingId: string | Oid, options: WriterOptions & { studentId?: string } = {},
): Promise<WriteResult | null> {
  const m = (await PaperMarking.findById(markingId).lean()) as Marking | null;
  if (!m) return null;
  const own = { schoolId: m.schoolId, 'source.type': 'test', 'source.recordId': m._id };
  if (m.isDeleted) {
    if (!options.dryRun) await softDeleteRows(own, 'source_deleted');
    return null;
  }
  if (!(WRITABLE_MARKING_STATUSES as readonly string[]).includes(m.status)) return null;
  const studentId = (m.studentId as Oid | undefined) ?? (options.studentId ? new mongoose.Types.ObjectId(options.studentId) : null);
  if (!studentId) return null;

  const newest = await PaperMarking.findOne({
    schoolId: m.schoolId, paperId: m.paperId, studentId, isDeleted: false, status: { $in: WRITABLE_MARKING_STATUSES },
  }).sort({ createdAt: -1 }).select('_id').lean();
  if (newest && String(newest._id) !== String(m._id)) {
    if (!options.dryRun) await softDeleteRows(own, 'superseded');
    return null;
  }
  const paper = await loadPaperContext(m);
  if (!paper) return null;
  if (!options.dryRun) {
    await softDeleteRows({
      schoolId: m.schoolId, 'source.type': 'test', 'source.parentId': m.paperId, studentId, 'source.recordId': { $ne: m._id },
    }, 'superseded');
  }

  const [student, channel] = await Promise.all([
    Student.findOne({ _id: studentId, schoolId: m.schoolId }).select('userId').lean(),
    channelOf(m, studentId),
  ]);
  const { items, unmatched } = itemsFor(m, paper, channel);
  if (unmatched > 0) logger.warn({ markingId: String(m._id), unmatched }, '[Evidence] marked question numbers not on the paper');
  const result = await writeEvidenceRows({
    schoolId: m.schoolId, studentId, userId: (student?.userId as Oid | undefined) ?? null, classId: (m.classId as Oid | null) ?? null,
    subjectId: paper.subjectId, gradeId: paper.gradeId,
    source: { type: 'test', channel, recordId: m._id, parentId: m.paperId as Oid, attemptNumber: 1 },
    markedAt: m.createdAt, status: m.issuedToStudent ? 'final' : 'provisional', finalAt: m.issuedToStudent ? (m.issuedAt ?? null) : null,
    totalOverridden: false,
  }, items, options);
  if (unmatched > 0) result.skipped.unmatched_number = unmatched;
  return result;
}
```

Hooks (import `safeEvidence` from `'../Evidence/write-rows.js'` and `syncMarkingEvidence` from `'../Evidence/writers/test.js'` in each file):

`src/modules/AITools/service-marking-text.ts` — after `await marking.save();` in the success path (just before `return toResult(marking);`):

```ts
    await safeEvidence('marking.text', () => syncMarkingEvidence(marking._id));
```

`src/modules/AITools/service-marking.ts` — after the success-path `await marking.save();` (before `return toResult(marking);`):

```ts
    await safeEvidence('marking.images', () => syncMarkingEvidence(marking._id));
```

`src/modules/AITools/service-marking-queries.ts` — in `updateMarking`, after `await marking.save();`:

```ts
  await safeEvidence('marking.update', () => syncMarkingEvidence(marking._id));
```

and in `issueMarking`, after `await marking.save();` (the one after `marking.issuedToStudent = true`):

```ts
  await safeEvidence('marking.issue', () => syncMarkingEvidence(marking._id, { studentId: resolvedStudentId }));
```

(Batch upload calls `markPaperFromImages` once per learner, `service-marking-batch-confirm.ts:87`, so it is covered.)

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence src/modules/AITools && npx tsc --noEmit`
Expected: PASS (the new file's 8 tests and every AITools file, including `issueMarking-notify-once` and `service-marking`); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/modules/AITools src/test-utils/evidence-fixtures.ts
LANE_SWEEP_OK=1 git commit -m "feat(evidence): marked tests and scripts write one row per answer; teacher edits and issue re-sync them" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: homework writes evidence (instant marks at submit, AI marks when graded)

**Files:**
- Create: `src/modules/Evidence/writers/homework.ts`
- Modify: `src/modules/Homework/service-homework-submit.ts:218` (hook right after `if (!updated) throw …`)
- Modify: `src/modules/Homework/service-homework-grading-runner.ts:280` (hook after the `graded` update succeeds)
- Test: `src/modules/Evidence/__tests__/homework-writer.test.ts`

**Interfaces:**
- Consumes: `writeEvidenceRows`, `softDeleteRows`, `safeEvidence` (Task 5); `standaloneClassroom`, `cleanUpClassrooms` (L-A `src/test-utils/standalone-classroom.ts`).
- Produces: `syncHomeworkEvidence(submissionId: string | Oid, options?: WriterOptions): Promise<WriteResult | null>` — rows for every answer that is not `pending` and has an `awarded` number; `itemKey` = questionId (exercise, reading) or `q<index>` (quiz); `status: 'final'`; `totalOverridden = Boolean(submission.gradedBy)` (ruling P11).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/homework-writer.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../../Homework/service-homework-grading-ai.js', () => ({
  gradeWithAI: vi.fn(async () => ({ awarded: 1, rationale: 'Named the rule but did not apply it.', gradingMethod: 'ai' })),
}));

import { AnswerEvidence } from '../model.js';
import { Homework, HomeworkSubmission } from '../../Homework/model.js';
import { HomeworkService } from '../../Homework/service.js';
import type { SubmitHomeworkInput } from '../../Homework/validation.js';
import { Question } from '../../QuestionBank/model.js';
import { Quiz } from '../../Learning/model.js';
import { CurriculumNode } from '../../CurriculumStructure/model.js';
import { syncHomeworkEvidence } from '../writers/homework.js';
import { resetGenericTypeCache } from '../taxonomy-generic.js';
import { cleanUpClassrooms, standaloneClassroom, type Classroom } from '../../../test-utils/standalone-classroom.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
let room: Classroom;
let topic: Oid;
let mcq: Oid;
let written: Oid;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  room = await standaloneClassroom();
  topic = oid();
  await CurriculumNode.collection.insertOne({ _id: topic, frameworkId: oid(), type: 'topic', parentId: null, title: 'Exponents', code: `E-HW-${String(topic)}`, description: '', metadata: {}, order: 0, schoolId: null, isDeleted: false, createdAt: new Date(), updatedAt: new Date() });
  const base = { curriculumNodeId: topic, schoolId: room.schoolId, subjectId: oid(), gradeId: oid(), status: 'approved', createdBy: room.teacherId };
  mcq = (await Question.create({ ...base, type: 'mcq', stem: '2^3 = ?', marks: 1, cognitiveLevel: { caps: 'knowledge', blooms: 'remember' },
    options: [{ label: 'A', text: '6', isCorrect: false }, { label: 'B', text: '8', isCorrect: true }], answer: 'B' }))._id as Oid;
  written = (await Question.create({ ...base, type: 'short_answer', stem: 'Simplify 2^3 × 2^4.', marks: 3, answer: '2^7', markingRubric: 'Add exponents.',
    cognitiveLevel: { caps: 'routine', blooms: 'apply' } }))._id as Oid;
});
beforeEach(() => resetGenericTypeCache());
afterAll(async () => {
  await Promise.all([CurriculumNode.deleteMany({ code: /^E-HW-/ }), Quiz.deleteMany({ schoolId: room.schoolId })]);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

async function exerciseHomework(): Promise<Oid> {
  const id = oid();
  await Homework.collection.insertOne({
    _id: id, title: 'Exponent laws', type: 'exercise', exerciseQuestionIds: [mcq, written], subjectId: oid(), classId: room.maths.id,
    schoolId: room.schoolId, teacherId: room.teacherId, dueDate: new Date(Date.now() + 86_400_000), totalMarks: 4, status: 'assigned',
    attachments: [], latePolicy: 'accept', gradebookAutoPublish: false, version: 1, isDeleted: false, createdAt: new Date(), updatedAt: new Date(),
  });
  return id;
}

const rowsFor = (submissionId: Oid) => AnswerEvidence.find({ 'source.recordId': submissionId, isDeleted: false }).lean();

describe('homework through the real submit and grading paths', () => {
  it('the instant answer is written at submit, the AI-marked one when it is graded', async () => {
    const thabo = await room.learner('Thabo', room.maths.id);
    const homeworkId = await exerciseHomework();
    const sub = await HomeworkService.submitHomework(String(homeworkId), String(thabo.studentId), String(room.schoolId), {
      type: 'exercise', answers: [{ questionId: String(mcq), studentAnswer: 'A' }, { questionId: String(written), studentAnswer: '2^12' }],
    } as SubmitHomeworkInput);
    const id = sub._id as Oid;
    await vi.waitFor(async () => expect(await rowsFor(id)).toHaveLength(2), { timeout: 5000 });
    const rows = await rowsFor(id);
    expect(rows.find((r) => r.source.itemKey === String(mcq))).toMatchObject({
      marksAwarded: 0, markedBy: 'deterministic', status: 'final', cognitiveLevel: 'knowledge', answer: expect.objectContaining({ kind: 'choice' }),
    });
    expect(rows.find((r) => r.source.itemKey === String(written))).toMatchObject({ marksAwarded: 1, markedBy: 'ai', markerNote: 'Named the rule but did not apply it.' });
    expect(String(rows[0].classId)).toBe(String(room.maths.id));
  });
});

describe('syncHomeworkEvidence', () => {
  async function submission(answers: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}): Promise<Oid> {
    const id = oid();
    await HomeworkSubmission.collection.insertOne({
      _id: id, homeworkId: await exerciseHomework(), studentId: oid(), schoolId: room.schoolId, type: 'exercise', homeworkVersion: 1,
      submittedAt: new Date(), isLate: false, gradingStatus: 'graded', gradingGeneration: 1, maxMarks: 4, isDeleted: false,
      createdAt: new Date(), updatedAt: new Date(), answers, ...extra,
    });
    return id;
  }
  const answer = (questionId: Oid, over: Record<string, unknown> = {}) => ({
    questionId, studentAnswer: 'x', questionSnapshot: 's', awarded: 0, maxMarks: 1, gradingMethod: 'deterministic', ...over,
  });

  it('a pending answer has no row: a resubmission drops it until it is marked again', async () => {
    const id = await submission([answer(mcq), answer(written, { awarded: 1, maxMarks: 3, gradingMethod: 'ai' })]);
    await syncHomeworkEvidence(id);
    await HomeworkSubmission.collection.updateOne({ _id: id }, { $set: { 'answers.1.gradingMethod': 'pending' }, $unset: { 'answers.1.awarded': '' } });
    const result = await syncHomeworkEvidence(id);
    expect(result?.removed).toBe(1);
    expect(await rowsFor(id)).toHaveLength(1);
  });

  it("flags rows when the teacher overrode the total", async () => {
    const id = await submission([answer(mcq)], { gradedBy: room.teacherId });
    await syncHomeworkEvidence(id);
    expect((await rowsFor(id))[0].totalOverridden).toBe(true);
  });

  it('a deleted submission soft-deletes its rows', async () => {
    const id = await submission([answer(mcq)]);
    await syncHomeworkEvidence(id);
    await HomeworkSubmission.collection.updateOne({ _id: id }, { $set: { isDeleted: true } });
    await syncHomeworkEvidence(id);
    expect(await AnswerEvidence.findOne({ 'source.recordId': id }).lean()).toMatchObject({ isDeleted: true, deletedReason: 'source_deleted' });
  });

  it('a quiz answer uses the migrated bank question when there is one', async () => {
    const quizId = oid();
    await Quiz.collection.insertOne({ _id: quizId, schoolId: room.schoolId, teacherId: room.teacherId, subjectId: oid(), classId: room.maths.id, title: 'Q', type: 'mixed',
      totalPoints: 2, status: 'closed', isDeleted: false, migratedQuestionIds: [mcq],
      questions: [{ questionText: '2^3 = ?', questionType: 'mcq', options: [], correctAnswer: '8', points: 1 }, { questionText: 'Why?', questionType: 'short_answer', options: [], correctAnswer: '', points: 1 }] });
    const homeworkId = oid();
    await Homework.collection.insertOne({ _id: homeworkId, title: 'Q', type: 'quiz', quizId, exerciseQuestionIds: [], subjectId: oid(), classId: room.maths.id,
      schoolId: room.schoolId, teacherId: room.teacherId, dueDate: new Date(), totalMarks: 2, status: 'assigned', attachments: [], latePolicy: 'accept',
      gradebookAutoPublish: false, version: 1, isDeleted: false });
    const id = oid();
    await HomeworkSubmission.collection.insertOne({ _id: id, homeworkId, studentId: oid(), schoolId: room.schoolId, type: 'quiz', homeworkVersion: 1, submittedAt: new Date(),
      isLate: false, gradingStatus: 'graded', gradingGeneration: 1, maxMarks: 2, isDeleted: false,
      answers: [
        { questionIndex: 0, studentAnswer: 'A', questionSnapshot: '2^3 = ?', awarded: 0, maxMarks: 1, gradingMethod: 'deterministic' },
        { questionIndex: 1, studentAnswer: 'dunno', questionSnapshot: 'Why?', awarded: 0, maxMarks: 1, gradingMethod: 'ai' },
      ] });
    await syncHomeworkEvidence(id);
    const rows = await rowsFor(id);
    expect(rows.find((r) => r.source.itemKey === 'q0')).toMatchObject({ questionKey: `q:${String(mcq)}`, topicFrom: 'question' });
    expect(rows.find((r) => r.source.itemKey === 'q1')).toMatchObject({ questionKey: `lq:${String(quizId)}:1`, topicFrom: 'none' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/homework-writer.test.ts`
Expected: FAIL — `Cannot find module '../writers/homework.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/writers/homework.ts
//
// Homework (spec §2.3, §4.1): final as soon as graded, no teacher step.
// Pending answers have no row; a teacher's total override flags the rows.
import { Homework, HomeworkSubmission } from '../../Homework/model.js';
import { Question } from '../../QuestionBank/model.js';
import { Quiz } from '../../Learning/model.js';
import { Student } from '../../Student/model.js';
import { softDeleteRows, writeEvidenceRows } from '../write-rows.js';
import type { CapsLevel, EvidenceItem, MarkedBy, Oid, WriteResult, WriterOptions } from '../types.js';

interface AnswerDoc {
  studentAnswer: string;
  awarded?: number;
  maxMarks: number;
  rationale?: string;
  gradingMethod: string;
  questionId?: Oid;
  questionIndex?: number;
}
interface BankLite { _id: Oid; curriculumNodeId: Oid; cognitiveLevel?: { caps?: string }; type: string }

const CHOICE_TYPES = new Set(['mcq', 'true_false']);

async function bankById(ids: Oid[]): Promise<Map<string, BankLite>> {
  if (ids.length === 0) return new Map();
  const docs = (await Question.find({ _id: { $in: ids }, isDeleted: false }).select('curriculumNodeId cognitiveLevel type').lean()) as unknown as BankLite[];
  return new Map(docs.map((q) => [String(q._id), q]));
}

function bankItem(itemKey: string, position: number, a: AnswerDoc, q: BankLite | undefined, questionKey: string): EvidenceItem {
  return {
    itemKey, position, questionKey, questionId: q?._id ?? null, nodeId: q?.curriculumNodeId ?? null,
    topicFrom: q ? 'question' : 'none', cognitiveLevel: (q?.cognitiveLevel?.caps as CapsLevel | undefined) ?? null,
    marksAwarded: a.awarded ?? 0, marksAvailable: a.maxMarks, answerText: a.studentAnswer ?? '',
    answerKind: q && CHOICE_TYPES.has(q.type) ? 'choice' : 'typed', markedBy: a.gradingMethod as MarkedBy, markerNote: a.rationale ?? '',
  };
}

export async function syncHomeworkEvidence(submissionId: string | Oid, options: WriterOptions = {}): Promise<WriteResult | null> {
  const sub = await HomeworkSubmission.findById(submissionId).lean();
  if (!sub) return null;
  const own = { schoolId: sub.schoolId, 'source.type': 'homework', 'source.recordId': sub._id };
  const homework = await Homework.findOne({ _id: sub.homeworkId, schoolId: sub.schoolId }).lean();
  if (sub.isDeleted || !homework || homework.isDeleted) {
    if (!options.dryRun) await softDeleteRows(own, 'source_deleted');
    return null;
  }
  const docs = sub as unknown as { answers?: AnswerDoc[]; comprehensionAnswers?: AnswerDoc[]; gradedBy?: Oid | null; gradedAt?: Date };
  const answers = (sub.type === 'reading' ? docs.comprehensionAnswers : docs.answers) ?? [];
  const graded = answers
    .map((a: AnswerDoc, position: number) => ({ a, position }))
    .filter(({ a }) => a.gradingMethod !== 'pending' && typeof a.awarded === 'number');

  let items: EvidenceItem[];
  if (sub.type === 'quiz') {
    const quiz = homework.quizId
      ? await Quiz.findOne({ _id: homework.quizId, schoolId: sub.schoolId }).select('migratedQuestionIds questions').lean()
      : null;
    const migrated = (quiz?.migratedQuestionIds ?? []) as Oid[];
    const bank = await bankById(migrated);
    items = graded.map(({ a, position }) => {
      const index = a.questionIndex ?? position;
      const q = migrated[index] ? bank.get(String(migrated[index])) : undefined;
      const item = bankItem(`q${index}`, position, a, q, q ? `q:${String(q._id)}` : `lq:${String(homework.quizId)}:${index}`);
      const quizType = quiz?.questions?.[index]?.questionType;
      return q ? item : { ...item, answerKind: quizType && CHOICE_TYPES.has(quizType) ? 'choice' : 'typed' };
    });
  } else {
    const bank = await bankById(graded.map(({ a }) => a.questionId).filter((id): id is Oid => Boolean(id)));
    items = graded.map(({ a, position }) =>
      bankItem(String(a.questionId), position, a, bank.get(String(a.questionId)), `q:${String(a.questionId)}`));
  }

  const student = await Student.findOne({ _id: sub.studentId, schoolId: sub.schoolId }).select('userId').lean();
  const when = docs.gradedAt ?? sub.submittedAt;
  return writeEvidenceRows({
    schoolId: sub.schoolId, studentId: sub.studentId, userId: (student?.userId as Oid | undefined) ?? null,
    classId: homework.classId, subjectId: homework.subjectId, gradeId: null,
    source: { type: 'homework', channel: null, recordId: sub._id as Oid, parentId: sub.homeworkId, attemptNumber: 1 },
    markedAt: when, status: 'final', finalAt: when, totalOverridden: Boolean(docs.gradedBy),
  }, items, options);
}
```

Hooks (import `safeEvidence` from `'../Evidence/write-rows.js'` and `syncHomeworkEvidence` from `'../Evidence/writers/homework.js'`):

`src/modules/Homework/service-homework-submit.ts` — directly after `if (!updated) throw new NotFoundError('Submission upsert failed');`:

```ts
  // Evidence for the instantly marked answers; AI-marked ones follow when graded (Phase E §4.1).
  await safeEvidence('homework.submit', () => syncHomeworkEvidence(updated._id));
```

`src/modules/Homework/service-homework-grading-runner.ts` — in `finalizeSubmission`, directly after `if (!updated) { … return; }`:

```ts
  await safeEvidence('homework.graded', () => syncHomeworkEvidence(submissionId));
```

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence src/modules/Homework && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/modules/Homework
LANE_SWEEP_OK=1 git commit -m "feat(evidence): homework writes a row per marked answer at submit and when the AI finishes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: unit quick checks, practice (with a node and level) and the content library write evidence

**Files:**
- Create: `src/modules/Evidence/writers/unit-check.ts`, `src/modules/Evidence/writers/practice.ts`, `src/modules/Evidence/writers/library.ts`
- Modify: `src/modules/Course/service-progress.ts:212-225` (hook after `QuizAttempt.create`)
- Modify: `src/modules/AITutor/validation.ts:62-72` (`curriculumNodeId` optional), `src/modules/AITutor/model.ts:105-172` (`IPracticeQuestion.capsLevel`, `IPracticeAttempt.curriculumNodeId`), `src/modules/AITutor/practice.service.ts:12-19, 39-83, 154-199, 268` (prompt asks `capsLevel`; sanitize keeps it; create stores the node; hook after submit)
- Modify: `src/modules/ContentLibrary/service-attempts.ts:239-255` (hook after `StudentAttempt.create`)
- Test: `src/modules/Evidence/__tests__/simple-writers.test.ts`

**Interfaces:**
- Consumes: `writeEvidenceRows`, `softDeleteRows`, `safeEvidence`, `schoolSubjectForNode` (Task 5).
- Produces: `syncQuickCheckEvidence(attemptId, options?)`, `syncPracticeEvidence(attemptId, options?)`, `syncLibraryEvidence(attemptId, options?)` — each `Promise<WriteResult | null>`; `GRADED_BLOCK_TYPES = ['quiz', 'fill_blank', 'match_columns', 'ordering', 'drag_drop']`; `generatePracticeSchema` gains `curriculumNodeId?: string`; `IPracticeAttempt.curriculumNodeId: ObjectId | null`; `IPracticeQuestion.capsLevel?: CapsLevel | null`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/simple-writers.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { AnswerEvidence } from '../model.js';
import { QuizAttempt, Course } from '../../Course/model.js';
import { Question } from '../../QuestionBank/model.js';
import { PracticeAttempt } from '../../AITutor/model.js';
import { PracticeService } from '../../AITutor/practice.service.js';
import { ContentResource } from '../../ContentLibrary/model.js';
import { StudentAttempt } from '../../ContentLibrary/model-tracking.js';
import { AttemptsService } from '../../ContentLibrary/service-attempts.js';
import type { SubmitAttemptInput } from '../../ContentLibrary/validation-student.js';
import { Student } from '../../Student/model.js';
import { CurriculumNode } from '../../CurriculumStructure/model.js';
import { generatePracticeSchema } from '../../AITutor/validation.js';
import { syncQuickCheckEvidence } from '../writers/unit-check.js';
import { syncPracticeEvidence } from '../writers/practice.js';
import { syncLibraryEvidence } from '../writers/library.js';
import { resetGenericTypeCache } from '../taxonomy-generic.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
const schoolId = oid();
const studentId = oid();
const userId = oid();
const topic = oid();
const now = new Date();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await CurriculumNode.collection.insertOne({ _id: topic, frameworkId: oid(), type: 'topic', parentId: null, title: 'Stoichiometry', code: `E-SW-${String(topic)}`, description: '', metadata: {}, order: 0, schoolId: null, isDeleted: false });
  await Student.collection.insertOne({ _id: studentId, schoolId, userId, classId: oid(), gradeId: oid(), admissionNumber: 'E-SW', isDeleted: false });
});
beforeEach(() => resetGenericTypeCache());
afterAll(async () => {
  await Promise.all([
    AnswerEvidence.deleteMany({ schoolId }), QuizAttempt.deleteMany({ schoolId }), Course.deleteMany({ schoolId }), Question.deleteMany({ schoolId }),
    PracticeAttempt.deleteMany({ schoolId }), ContentResource.deleteMany({ schoolId }), StudentAttempt.deleteMany({ schoolId }),
    Student.deleteMany({ schoolId }), CurriculumNode.deleteMany({ code: /^E-SW-/ }),
  ]);
  await mongoose.disconnect();
});

describe('unit quick checks', () => {
  it('writes one row per answered question, every retry separately', async () => {
    const q = await Question.create({ curriculumNodeId: topic, schoolId, subjectId: oid(), gradeId: oid(), type: 'mcq', stem: 'Moles in 18 g of water?', marks: 2,
      cognitiveLevel: { caps: 'routine', blooms: 'apply' }, options: [{ label: 'A', text: '1', isCorrect: true }, { label: 'B', text: '2', isCorrect: false }], status: 'approved', createdBy: oid() });
    const classId = oid();
    const course = await Course.collection.insertOne({ schoolId, title: 'Unit', subjectId: oid(), scope: { builtForClassId: classId }, isDeleted: false });
    const lessonId = oid();
    const attempt = (n: number, answer: string, marks: number) => QuizAttempt.create({ schoolId, enrolmentId: oid(), studentId, courseId: course.insertedId, lessonId,
      attemptNumber: n, answers: [{ questionId: q._id, answer, isCorrect: marks > 0, marks }], totalMarks: 2, earnedMarks: marks, percent: marks * 50, passed: marks > 0, submittedAt: now });
    const first = await attempt(1, 'B', 0);
    const second = await attempt(2, 'A', 2);
    await syncQuickCheckEvidence(first._id);
    await syncQuickCheckEvidence(second._id);
    const rows = await AnswerEvidence.find({ schoolId, 'source.type': 'unit_check' }).sort({ 'source.attemptNumber': 1 }).lean();
    expect(rows.map((r) => [r.source.attemptNumber, r.marksAwarded, r.diagnosis.state])).toEqual([[1, 0, 'pending'], [2, 2, 'none']]);
    expect(rows[0]).toMatchObject({ questionKey: `q:${String(q._id)}`, cognitiveLevel: 'routine', answer: expect.objectContaining({ kind: 'choice' }) });
    expect(String(rows[0].classId)).toBe(String(classId));
  });
});

describe('AI tutor practice', () => {
  it('accepts a curriculum node when practice is launched on a topic', () => {
    const parsed = generatePracticeSchema.parse({ subjectId: String(oid()), subjectName: 'Physical Sciences', grade: 11, topic: 'Stoichiometry', curriculumNodeId: String(topic) });
    expect(parsed.curriculumNodeId).toBe(String(topic));
  });

  it('writes rows on submit: with a node they have a topic, without one they count at subject level', async () => {
    const withNode = await PracticeAttempt.create({ schoolId, studentId: userId, subjectId: oid(), topic: 'Stoichiometry', grade: 11, totalMarks: 2, curriculumNodeId: topic,
      questions: [{ questionText: 'Mr of H2O?', questionType: 'mcq', options: ['16', '18'], correctAnswer: '18', explanation: 'H2 + O', marks: 1, capsLevel: 'knowledge' },
        { questionText: 'Moles in 36 g H2O?', questionType: 'mcq', options: ['1', '2'], correctAnswer: '2', explanation: 'n = m/M', marks: 1, capsLevel: 'routine' }] });
    await PracticeService.submitPractice(String(userId), String(schoolId), { attemptId: String(withNode._id), answers: [{ questionIndex: 0, answer: '16' }, { questionIndex: 1, answer: '2' }] });
    const rows = await AnswerEvidence.find({ schoolId, 'source.type': 'practice', 'source.recordId': withNode._id }).sort({ 'source.position': 1 }).lean();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ topicFrom: 'practice', cognitiveLevel: 'knowledge', marksAwarded: 0, questionKey: `pr:${String(withNode._id)}:0` });
    expect(String(rows[0].studentId)).toBe(String(studentId));

    const free = await PracticeAttempt.create({ schoolId, studentId: userId, subjectId: oid(), topic: 'my own words', grade: 11, totalMarks: 1,
      questions: [{ questionText: 'q', questionType: 'true_false', correctAnswer: 'True', explanation: 'e', marks: 1 }], completedAt: now });
    await PracticeAttempt.collection.updateOne({ _id: free._id }, { $set: { 'questions.0.studentAnswer': 'False', 'questions.0.marksAwarded': 0 } });
    await syncPracticeEvidence(free._id);
    expect(await AnswerEvidence.findOne({ 'source.recordId': free._id }).lean()).toMatchObject({ topicFrom: 'none', diagnosis: expect.objectContaining({ state: 'skipped', skippedReason: 'no_topic' }) });
  });
});

describe('content library', () => {
  it('writes graded interactive blocks and skips informational ones', async () => {
    const resource = await ContentResource.collection.insertOne({ schoolId, curriculumNodeId: topic, type: 'study_notes', format: 'interactive', title: 'Moles',
      gradeId: oid(), subjectId: oid(), term: 1, status: 'approved', createdBy: oid(), isDeleted: false, source: 'teacher', tags: [],
      blocks: [
        { blockId: 'b1', type: 'quiz', order: 0, content: JSON.stringify({ type: 'mcq', options: [{ label: 'A', isCorrect: false }, { label: 'B', isCorrect: true }] }), points: 1, curriculumNodeId: topic, cognitiveLevel: { caps: 'Routine', blooms: 'apply' } },
        { blockId: 'b2', type: 'text', order: 1, content: 'Read this.', points: 1 },
      ] });
    await AttemptsService.submitAttempt(String(studentId), String(schoolId), String(resource.insertedId), { blockId: 'b1', response: 'A', timeSpentSeconds: 10, hintsUsed: 0 } as SubmitAttemptInput);
    await AttemptsService.submitAttempt(String(studentId), String(schoolId), String(resource.insertedId), { blockId: 'b2', response: '', timeSpentSeconds: 5, hintsUsed: 0 } as SubmitAttemptInput);
    const rows = await AnswerEvidence.find({ schoolId, 'source.type': 'library' }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ questionKey: `cb:${String(resource.insertedId)}:b1`, topicFrom: 'block', cognitiveLevel: 'routine', marksAwarded: 0, marksAvailable: 1 });
    const text = await StudentAttempt.findOne({ schoolId, blockId: 'b2' }).lean();
    expect((await syncLibraryEvidence(text!._id))?.skipped).toEqual({ informational_block: 1 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/simple-writers.test.ts`
Expected: FAIL — `Cannot find module '../writers/unit-check.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/writers/unit-check.ts
//
// Course unit quick checks (spec §2.4): automatic, all-or-nothing marks; one
// row per answered question per attempt (retries are separate attempts).
import { Course, QuizAttempt } from '../../Course/model.js';
import { Question } from '../../QuestionBank/model.js';
import { Student } from '../../Student/model.js';
import { softDeleteRows, writeEvidenceRows } from '../write-rows.js';
import type { CapsLevel, EvidenceItem, Oid, WriteResult, WriterOptions } from '../types.js';

const CHOICE_TYPES = new Set(['mcq', 'true_false']);

export function answerAsText(answer: unknown): string {
  if (typeof answer === 'string') return answer;
  if (answer === null || answer === undefined) return '';
  return JSON.stringify(answer);
}

export async function syncQuickCheckEvidence(attemptId: string | Oid, options: WriterOptions = {}): Promise<WriteResult | null> {
  const attempt = await QuizAttempt.findById(attemptId).lean();
  if (!attempt) return null;
  if (attempt.isDeleted) {
    if (!options.dryRun) await softDeleteRows({ schoolId: attempt.schoolId, 'source.type': 'unit_check', 'source.recordId': attempt._id }, 'source_deleted');
    return null;
  }
  const [course, questions, student] = await Promise.all([
    Course.findOne({ _id: attempt.courseId, schoolId: attempt.schoolId }).select('subjectId scope').lean(),
    Question.find({ _id: { $in: attempt.answers.map((a) => a.questionId) }, isDeleted: false }).select('curriculumNodeId cognitiveLevel marks type').lean(),
    Student.findOne({ _id: attempt.studentId, schoolId: attempt.schoolId }).select('userId').lean(),
  ]);
  const byId = new Map(questions.map((q) => [String(q._id), q]));
  const items = attempt.answers.flatMap((a, position): EvidenceItem[] => {
    const q = byId.get(String(a.questionId));
    if (!q) return [];
    return [{
      itemKey: String(q._id), position, questionKey: `q:${String(q._id)}`, questionId: q._id as Oid, nodeId: q.curriculumNodeId as Oid,
      topicFrom: 'question', cognitiveLevel: (q.cognitiveLevel?.caps as CapsLevel | undefined) ?? null,
      marksAwarded: a.marks ?? 0, marksAvailable: q.marks, answerText: answerAsText(a.answer),
      answerKind: CHOICE_TYPES.has(q.type) ? 'choice' : 'typed', markedBy: 'deterministic', markerNote: '',
    }];
  });
  return writeEvidenceRows({
    schoolId: attempt.schoolId, studentId: attempt.studentId, userId: (student?.userId as Oid | undefined) ?? null,
    classId: (course?.scope?.builtForClassId as Oid | null | undefined) ?? null, subjectId: (course?.subjectId as Oid | undefined) ?? null, gradeId: null,
    source: { type: 'unit_check', channel: null, recordId: attempt._id as Oid, parentId: attempt.lessonId, attemptNumber: attempt.attemptNumber },
    markedAt: attempt.submittedAt, status: 'final', finalAt: attempt.submittedAt, totalOverridden: false,
  }, items, options);
}
```

```ts
// src/modules/Evidence/writers/practice.ts
//
// AI tutor practice (spec §2.5, §4.2): the attempt's student is a User; rows
// need the Student. With a curriculum node the rows have a topic; a free-text
// topic counts at subject level only.
import mongoose from 'mongoose';
import { PracticeAttempt } from '../../AITutor/model.js';
import { Subject } from '../../Academic/model.js';
import { Student } from '../../Student/model.js';
import { softDeleteRows, writeEvidenceRows } from '../write-rows.js';
import { emptyResult, type EvidenceItem, type Oid, type WriteResult, type WriterOptions } from '../types.js';

/** The school Subject, whether the attempt stored a Subject id or a CurriculumNode id (student-context.ts:90-108). */
async function schoolSubject(schoolId: Oid, id: Oid): Promise<Oid | null> {
  const direct = await Subject.findOne({ _id: id, schoolId, isDeleted: false }).select('_id').lean();
  if (direct) return direct._id as Oid;
  const byNode = await Subject.findOne({ schoolId, curriculumNodeId: id, isDeleted: false }).select('_id').lean();
  return (byNode?._id as Oid | undefined) ?? null;
}

export async function syncPracticeEvidence(attemptId: string | Oid, options: WriterOptions = {}): Promise<WriteResult | null> {
  const attempt = await PracticeAttempt.findById(attemptId).lean();
  if (!attempt) return null;
  if (attempt.isDeleted) {
    if (!options.dryRun) await softDeleteRows({ schoolId: attempt.schoolId, 'source.type': 'practice', 'source.recordId': attempt._id }, 'source_deleted');
    return null;
  }
  if (!attempt.completedAt) return null;
  const student = await Student.findOne({ userId: attempt.studentId, schoolId: attempt.schoolId, isDeleted: false }).select('_id').lean();
  if (!student) return { ...emptyResult(), skipped: { no_learner: 1 } };
  const nodeId = (attempt.curriculumNodeId as Oid | null | undefined) ?? null;
  const items = attempt.questions.flatMap((q, i): EvidenceItem[] => (q.studentAnswer === undefined ? [] : [{
    itemKey: `q${i}`, position: i, questionKey: `pr:${String(attempt._id)}:${i}`, questionId: null, nodeId,
    topicFrom: 'practice', cognitiveLevel: q.capsLevel ?? null,
    marksAwarded: q.marksAwarded ?? (q.isCorrect ? q.marks : 0), marksAvailable: q.marks, answerText: q.studentAnswer ?? '',
    answerKind: q.questionType === 'short_answer' ? 'typed' : 'choice',
    markedBy: q.questionType === 'short_answer' ? 'ai' : 'deterministic', markerNote: q.feedback ?? '',
  }]));
  return writeEvidenceRows({
    schoolId: attempt.schoolId, studentId: student._id as Oid, userId: attempt.studentId as Oid, classId: null,
    subjectId: await schoolSubject(attempt.schoolId as Oid, new mongoose.Types.ObjectId(String(attempt.subjectId))), gradeId: null,
    source: { type: 'practice', channel: null, recordId: attempt._id as Oid, parentId: attempt._id as Oid, attemptNumber: 1 },
    markedAt: attempt.completedAt, status: 'final', finalAt: attempt.completedAt, totalOverridden: false,
  }, items, options);
}
```

```ts
// src/modules/Evidence/writers/library.ts
//
// Content library (spec §2.6): only interactive blocks that are really
// marked. Text, image, video and step-reveal always score full marks, and
// hotspot and code always 0, so they are noise and write nothing.
import { ContentResource } from '../../ContentLibrary/model.js';
import { StudentAttempt } from '../../ContentLibrary/model-tracking.js';
import { Student } from '../../Student/model.js';
import { CAPS_LEVELS } from '../../QuestionBank/model-shared.js';
import { schoolSubjectForNode } from '../topic-resolver.js';
import { writeEvidenceRows } from '../write-rows.js';
import { emptyResult, type CapsLevel, type Oid, type WriteResult, type WriterOptions } from '../types.js';

export const GRADED_BLOCK_TYPES: readonly string[] = ['quiz', 'fill_blank', 'match_columns', 'ordering', 'drag_drop'];

/** Block levels are free text ("Routine", "problem solving"); keep only a CAPS level. */
function capsOf(raw: string | null | undefined): CapsLevel | null {
  const key = (raw ?? '').trim().toLowerCase().replace(/[\s-]+procedures?$/, '').replace(/[\s-]+/g, '_');
  return (CAPS_LEVELS as readonly string[]).includes(key) ? (key as CapsLevel) : null;
}

export async function syncLibraryEvidence(attemptId: string | Oid, options: WriterOptions = {}): Promise<WriteResult | null> {
  const attempt = await StudentAttempt.findById(attemptId).lean();
  if (!attempt) return null;
  const resource = await ContentResource.findOne({
    _id: attempt.contentResourceId, $or: [{ schoolId: null }, { schoolId: attempt.schoolId }],
  }).select('blocks').lean();
  const block = resource?.blocks.find((b) => b.blockId === attempt.blockId);
  if (!resource || !block || !GRADED_BLOCK_TYPES.includes(block.type)) return { ...emptyResult(), skipped: { informational_block: 1 } };
  const [student, subjectId] = await Promise.all([
    Student.findOne({ _id: attempt.studentId, schoolId: attempt.schoolId }).select('userId').lean(),
    schoolSubjectForNode(attempt.schoolId as Oid, attempt.curriculumNodeId as Oid),
  ]);
  return writeEvidenceRows({
    schoolId: attempt.schoolId as Oid, studentId: attempt.studentId as Oid, userId: (student?.userId as Oid | undefined) ?? null,
    classId: null, subjectId, gradeId: null,
    source: { type: 'library', channel: null, recordId: attempt._id as Oid, parentId: resource._id as Oid, attemptNumber: attempt.attemptNumber },
    markedAt: attempt.createdAt, status: 'final', finalAt: attempt.createdAt, totalOverridden: false,
  }, [{
    itemKey: attempt.blockId, position: 0, questionKey: `cb:${String(resource._id)}:${attempt.blockId}`, questionId: null,
    nodeId: attempt.curriculumNodeId as Oid, topicFrom: 'block', cognitiveLevel: capsOf(attempt.cognitiveLevel?.caps),
    marksAwarded: attempt.score, marksAvailable: attempt.maxScore, answerText: attempt.response ?? '',
    answerKind: block.type === 'quiz' ? 'choice' : 'structured', markedBy: 'deterministic', markerNote: '',
  }], options);
}
```

Practice capture (`src/modules/AITutor`):
- `validation.ts` `generatePracticeSchema`: add `curriculumNodeId: oid.optional(),`.
- `model.ts`: `IPracticeQuestion` gains `capsLevel?: CapsLevel | null;` (schema `capsLevel: { type: String, enum: CAPS_LEVELS, default: null }`); `IPracticeAttempt` gains `curriculumNodeId: Types.ObjectId | null;` (schema `curriculumNodeId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', default: null }`). Import `CAPS_LEVELS, type CapsLevel` from `'../QuestionBank/model-shared.js'`.
- `practice.service.ts`: `AIGeneratedQuestion` gains `capsLevel?: string`; the user prompt's JSON line becomes `'JSON format: [{ questionText, questionType, options?, correctAnswer, explanation, marks, capsLevel }] where capsLevel is knowledge | routine | complex | problem_solving'`; `sanitizeQuestion` returns `capsLevel: (CAPS_LEVELS as readonly string[]).includes(String(raw.capsLevel)) ? (raw.capsLevel as CapsLevel) : null`; `PracticeAttempt.create` adds `curriculumNodeId: input.curriculumNodeId ? new mongoose.Types.ObjectId(input.curriculumNodeId) : null`; after `await attempt.save();` in `submitPractice`: `await safeEvidence('practice.submit', () => syncPracticeEvidence(attempt._id));`.

Hooks:
- `src/modules/Course/service-progress.ts` — after `const attempt = await QuizAttempt.create({ … });`: `await safeEvidence('course.quick-check', () => syncQuickCheckEvidence(attempt._id));`
- `src/modules/ContentLibrary/service-attempts.ts` — after `const attempt = await StudentAttempt.create({ … });`: `await safeEvidence('library.attempt', () => syncLibraryEvidence(attempt._id));`

(each imports `safeEvidence` from `'../Evidence/write-rows.js'` and its writer from `'../Evidence/writers/<name>.js'`).

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence src/modules/AITutor src/modules/Course src/modules/ContentLibrary && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/modules/AITutor src/modules/Course src/modules/ContentLibrary
LANE_SWEEP_OK=1 git commit -m "feat(evidence): unit quick checks, tutor practice and library blocks write evidence; practice can carry a topic and level" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: `npm run migrate:evidence`, the daily reconcile, and the `evidence` queue

**Files:**
- Create: `src/modules/Evidence/reconcile.ts`
- Create: `src/scripts/evidence-args.ts`, `src/scripts/evidence-backfill.ts`
- Create: `src/jobs/evidence.job.ts`
- Modify: `src/jobs/queues.ts` (add `evidenceQueue`), `src/jobs/index.ts` (worker + schedule), `package.json` (script `"migrate:evidence": "tsx src/scripts/evidence-backfill.ts"`)
- Test: `src/modules/Evidence/__tests__/reconcile.test.ts`

**Interfaces:**
- Consumes: the five `sync*Evidence` writers (Tasks 6–8).
- Produces: `interface ReconcileOptions { apply: boolean; schoolId?: string; source?: SourceType; since?: Date }`; `interface SourceReport { records: number; written: number; updated: number; unchanged: number; removed: number; rows: number; withTopic: number; withLevel: number; skipped: Record<string, number> }`; `reconcileEvidence(options): Promise<Record<SourceType, SourceReport>>`; `interface EvidenceArgs { apply: boolean; direct: boolean; yes: boolean; retrySkippedBudget: boolean; school?: string; source?: SourceType; since?: Date; limit?: number; subject?: string }`; `parseEvidenceArgs(argv: readonly string[]): EvidenceArgs` (throws `Error` with a plain message on a bad value); `EVIDENCE_JOBS = { reconcile: 'reconcile' }` (Tasks 14 and 15 add names); `processEvidenceJob(name: string, now?: Date): Promise<unknown>`; `createEvidenceWorker(): Worker`; `scheduleEvidenceJobs(): Promise<void>`; `evidenceQueue`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/reconcile.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { AnswerEvidence } from '../model.js';
import { PaperMarking } from '../../AITools/model-marking.js';
import { reconcileEvidence } from '../reconcile.js';
import { resetGenericTypeCache } from '../taxonomy-generic.js';
import { parseEvidenceArgs } from '../../../scripts/evidence-args.js';
import { processEvidenceJob } from '../../../jobs/evidence.job.js';
import { cleanUpEvidenceFixtures, seedMarkedPaper, seedMarking, type MarkedPaperFixture } from '../../../test-utils/evidence-fixtures.js';

let fx: MarkedPaperFixture;
const ANSWERS = [{ n: '1.1', answer: 'y = 3x', awarded: 1, max: 2 }, { n: '1.2', answer: 'No', awarded: 1, max: 3 }];

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  fx = await seedMarkedPaper();
  for (const s of fx.students) await seedMarking(fx, s, ANSWERS);
});
beforeEach(() => resetGenericTypeCache());
afterAll(async () => {
  await cleanUpEvidenceFixtures(fx.schoolId);
  await mongoose.disconnect();
});

describe('reconcileEvidence (the backfill and the daily job)', () => {
  it('a dry run reports and writes nothing', async () => {
    const report = await reconcileEvidence({ apply: false, schoolId: String(fx.schoolId), source: 'test' });
    expect(report.test).toMatchObject({ records: 3, written: 6, rows: 6 });
    expect(report.test.withTopic).toBe(6);
    expect(await AnswerEvidence.countDocuments({ schoolId: fx.schoolId })).toBe(0);
  });

  it('applies, and a second run changes nothing', async () => {
    await reconcileEvidence({ apply: true, schoolId: String(fx.schoolId), source: 'test' });
    const again = await reconcileEvidence({ apply: true, schoolId: String(fx.schoolId), source: 'test' });
    expect(again.test).toMatchObject({ written: 0, updated: 0, unchanged: 6 });
  });

  it('only walks records changed since the date', async () => {
    const report = await reconcileEvidence({ apply: false, schoolId: String(fx.schoolId), source: 'test', since: new Date(Date.now() + 60_000) });
    expect(report.test.records).toBe(0);
  });

  it('soft-deletes rows whose marking was deleted', async () => {
    const marking = await PaperMarking.findOne({ schoolId: fx.schoolId, studentId: fx.students[0] });
    await PaperMarking.updateOne({ _id: marking!._id }, { $set: { isDeleted: true } });
    await reconcileEvidence({ apply: true, schoolId: String(fx.schoolId), source: 'test' });
    expect(await AnswerEvidence.countDocuments({ 'source.recordId': marking!._id, isDeleted: true, deletedReason: 'source_deleted' })).toBe(2);
  });

  it('the daily job reconciles the last two days', async () => {
    const report = (await processEvidenceJob('reconcile', new Date())) as Record<string, { records: number }>;
    expect(report.test.records).toBeGreaterThanOrEqual(3);
  });
});

describe('parseEvidenceArgs', () => {
  it('reads every flag', () => {
    const args = parseEvidenceArgs(['--apply', '--school=66f0c0ffee0000000000abcd', '--source=homework', '--since=2026-09-01', '--limit=50', '--direct', '--yes', '--retry-skipped-budget']);
    expect(args).toMatchObject({ apply: true, direct: true, yes: true, retrySkippedBudget: true, school: '66f0c0ffee0000000000abcd', source: 'homework', limit: 50 });
    expect(args.since?.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(parseEvidenceArgs([])).toMatchObject({ apply: false, direct: false });
  });

  it.each([['--school=abc', '--school needs a school id'], ['--source=gradebook', '--source must be one of'], ['--since=soon', '--since must be YYYY-MM-DD']])(
    '%s is refused, never widened', (flag, message) => {
      expect(() => parseEvidenceArgs([flag])).toThrow(message);
    },
  );
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/reconcile.test.ts`
Expected: FAIL — `Cannot find module '../reconcile.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/reconcile.ts
//
// Walks every source (or one) and runs the same writers the hooks run, so a
// backfill run twice changes nothing and the daily run repairs missed hooks
// and rows whose source was deleted (spec §5).
import type { Model } from 'mongoose';
import mongoose from 'mongoose';
import { PaperMarking } from '../AITools/model-marking.js';
import { HomeworkSubmission } from '../Homework/model.js';
import { QuizAttempt } from '../Course/model.js';
import { PracticeAttempt } from '../AITutor/model.js';
import { StudentAttempt } from '../ContentLibrary/model-tracking.js';
import { syncMarkingEvidence } from './writers/test.js';
import { syncHomeworkEvidence } from './writers/homework.js';
import { syncQuickCheckEvidence } from './writers/unit-check.js';
import { syncPracticeEvidence } from './writers/practice.js';
import { syncLibraryEvidence } from './writers/library.js';
import { SOURCE_TYPES, type Oid, type SourceType, type WriteResult, type WriterOptions } from './types.js';

export interface ReconcileOptions { apply: boolean; schoolId?: string; source?: SourceType; since?: Date }
export interface SourceReport {
  records: number; written: number; updated: number; unchanged: number; removed: number;
  rows: number; withTopic: number; withLevel: number; skipped: Record<string, number>;
}

interface SourceWalker {
  model: Model<never>;
  /** The timestamp that moves when the record changes. */
  changedAt: string;
  sync: (id: Oid, options: WriterOptions) => Promise<WriteResult | null>;
}

const WALKERS: Record<SourceType, SourceWalker> = {
  test: { model: PaperMarking as unknown as Model<never>, changedAt: 'updatedAt', sync: syncMarkingEvidence },
  homework: { model: HomeworkSubmission as unknown as Model<never>, changedAt: 'updatedAt', sync: syncHomeworkEvidence },
  unit_check: { model: QuizAttempt as unknown as Model<never>, changedAt: 'submittedAt', sync: syncQuickCheckEvidence },
  practice: { model: PracticeAttempt as unknown as Model<never>, changedAt: 'updatedAt', sync: syncPracticeEvidence },
  library: { model: StudentAttempt as unknown as Model<never>, changedAt: 'createdAt', sync: syncLibraryEvidence },
};

const emptyReport = (): SourceReport => ({ records: 0, written: 0, updated: 0, unchanged: 0, removed: 0, rows: 0, withTopic: 0, withLevel: 0, skipped: {} });

function add(report: SourceReport, r: WriteResult | null): void {
  report.records += 1;
  if (!r) return;
  report.written += r.written;
  report.updated += r.updated;
  report.unchanged += r.unchanged;
  report.removed += r.removed;
  report.rows += r.written + r.updated + r.unchanged;
  report.withTopic += r.withTopic;
  report.withLevel += r.withLevel;
  for (const [reason, n] of Object.entries(r.skipped)) report.skipped[reason] = (report.skipped[reason] ?? 0) + n;
}

export async function reconcileEvidence(options: ReconcileOptions): Promise<Record<SourceType, SourceReport>> {
  const reports = Object.fromEntries(SOURCE_TYPES.map((s) => [s, emptyReport()])) as Record<SourceType, SourceReport>;
  const sources = options.source ? [options.source] : [...SOURCE_TYPES];
  for (const source of sources) {
    const walker = WALKERS[source];
    const filter: Record<string, unknown> = {};
    if (options.schoolId) filter.schoolId = new mongoose.Types.ObjectId(options.schoolId);
    if (options.since) filter[walker.changedAt] = { $gte: options.since };
    const cursor = walker.model.find(filter).select('_id').sort({ _id: 1 }).lean().cursor();
    for await (const doc of cursor) {
      add(reports[source], await walker.sync((doc as { _id: Oid })._id, { dryRun: !options.apply }));
    }
  }
  return reports;
}
```

```ts
// src/scripts/evidence-args.ts
//
// Flags shared by the Phase E scripts. A bad value stops the run; it never
// widens it (a --school with no id must not mean every school).
import mongoose from 'mongoose';
import { SOURCE_TYPES, type SourceType } from '../modules/Evidence/types.js';

export interface EvidenceArgs {
  apply: boolean; direct: boolean; yes: boolean; retrySkippedBudget: boolean;
  school?: string; source?: SourceType; since?: Date; limit?: number; subject?: string;
}

function value(argv: readonly string[], name: string): string | undefined {
  const hit = argv.find((a: string) => a.startsWith(`--${name}=`));
  return hit === undefined ? undefined : hit.slice(name.length + 3);
}

export function parseEvidenceArgs(argv: readonly string[]): EvidenceArgs {
  const args: EvidenceArgs = {
    apply: argv.includes('--apply'), direct: argv.includes('--direct'), yes: argv.includes('--yes'),
    retrySkippedBudget: argv.includes('--retry-skipped-budget'),
  };
  const school = value(argv, 'school');
  if (school !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(school) || school.length !== 24) throw new Error('--school needs a school id');
    args.school = school;
  }
  const source = value(argv, 'source');
  if (source !== undefined) {
    if (!(SOURCE_TYPES as readonly string[]).includes(source)) throw new Error(`--source must be one of ${SOURCE_TYPES.join(', ')}`);
    args.source = source as SourceType;
  }
  const since = value(argv, 'since');
  if (since !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error('--since must be YYYY-MM-DD');
    args.since = new Date(`${since}T00:00:00.000Z`);
  }
  const limit = value(argv, 'limit');
  if (limit !== undefined) {
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1) throw new Error('--limit must be a whole number above 0');
    args.limit = n;
  }
  const subject = value(argv, 'subject');
  if (subject !== undefined) args.subject = subject;
  return args;
}
```

```ts
// src/scripts/evidence-backfill.ts
/**
 * Turns existing marked work into AnswerEvidence rows (Phase E §5).
 *
 *   npm run migrate:evidence                               # dry run: reports only
 *   npm run migrate:evidence -- --apply                    # writes
 *   npm run migrate:evidence -- --school=<id> --source=test --since=2026-01-01
 *
 * Order: migrate:paper-question-tags → migrate:evidence → evidence:diagnose.
 * Uses the same writers as the hooks, so running it twice changes nothing.
 */
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { logger } from '../common/logger.js';
import { reconcileEvidence } from '../modules/Evidence/reconcile.js';
import { parseEvidenceArgs } from './evidence-args.js';

const pct = (part: number, whole: number): string => (whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`);

async function main(): Promise<void> {
  const args = parseEvidenceArgs(process.argv.slice(2));
  await mongoose.connect(config.mongodb.uri);
  try {
    const reports = await reconcileEvidence({ apply: args.apply, schoolId: args.school, source: args.source, since: args.since });
    for (const [source, r] of Object.entries(reports)) {
      if (r.records === 0) continue;
      logger.info(
        { source, ...r },
        `${source}: ${r.records} records; rows written ${r.written}, updated ${r.updated}, unchanged ${r.unchanged}, removed ${r.removed}; `
        + `with a topic ${pct(r.withTopic, r.rows)}, with a level ${pct(r.withLevel, r.rows)}; skipped ${JSON.stringify(r.skipped)}`,
      );
    }
    logger.info(args.apply ? 'Evidence backfill applied.' : 'Dry run: nothing written. Run with --apply to write.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'migrate:evidence failed');
  process.exit(1);
});
```

```ts
// src/jobs/evidence.job.ts
//
// The `evidence` queue (plan ruling P17): the daily reconcile now; Tasks 14
// and 15 add diagnosis submit/collect and the weekly taxonomy tidy.
import { Worker, type Job } from 'bullmq';
import { logger } from '../common/logger.js';
import { evidenceQueue, redisConnection } from './queues.js';

const DAY_MS = 24 * 3600_000;

export const EVIDENCE_JOBS = {
  reconcile: 'reconcile',
} as const;

export async function processEvidenceJob(name: string, now: Date = new Date()): Promise<unknown> {
  switch (name) {
    case EVIDENCE_JOBS.reconcile: {
      const { reconcileEvidence } = await import('../modules/Evidence/reconcile.js');
      return reconcileEvidence({ apply: true, since: new Date(now.getTime() - 2 * DAY_MS) });
    }
    default:
      throw new Error(`Unknown evidence job ${name}`);
  }
}

export function createEvidenceWorker(): Worker {
  const worker = new Worker('evidence', (job: Job) => processEvidenceJob(job.name), { connection: redisConnection, concurrency: 1 });
  worker.on('failed', (job, err) => logger.error(`[Evidence] ${job?.name} failed: ${err.message}`));
  return worker;
}

export async function scheduleEvidenceJobs(): Promise<void> {
  await evidenceQueue.add(EVIDENCE_JOBS.reconcile, {}, { repeat: { pattern: '30 0 * * *' } }); // 02:30 SAST daily
  logger.info('[Evidence] repeatable jobs scheduled');
}
```

`src/jobs/queues.ts` — add:

```ts
// Phase E: reconcile, diagnosis submit/collect, taxonomy tidy.
export const evidenceQueue = new Queue('evidence', { connection: redisConnection, defaultJobOptions });
```

`src/jobs/index.ts` — after the course-generation worker: `const { createEvidenceWorker, scheduleEvidenceJobs } = await import('./evidence.job.js'); workers.push(createEvidenceWorker());` and after `await scheduleLostFoundArchive();`: `await scheduleEvidenceJobs();`.

`package.json` scripts: `"migrate:evidence": "tsx src/scripts/evidence-backfill.ts",`.

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence src/jobs && npx tsc --noEmit && npm run migrate:evidence -- --school=66f0c0ffee0000000000abcd`
Expected: PASS; `tsc` prints nothing; the script (against the throwaway Mongo) logs `Dry run: nothing written. Run with --apply to write.`

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/scripts src/jobs package.json
LANE_SWEEP_OK=1 git commit -m "feat(evidence): migrate:evidence backfill and a daily reconcile on the evidence queue" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Phase E-C — the pool, the AI transport, seeding, tagging, diagnosis and the tidy

### Task 10: the per-school monthly diagnosis pool

**Files:**
- Create: `src/modules/Evidence/diagnosis-pool.ts`
- Test: `src/modules/Evidence/__tests__/diagnosis-pool.test.ts`

**Interfaces:**
- Consumes: `DiagnosisRequest` (Task 4); `sastMonthWindow` (`subscription/ai-allowance.ts:45-53`); `isSubscriptionEntitled` (`subscription/entitlements.ts`).
- Produces: `DIAGNOSIS_POOL_FREE = 150`, `DIAGNOSIS_POOL_PRO = 2000`; `interface DiagnosisPool { metered: boolean; used: number; limit: number; resetsAt: Date | null }`; `diagnosisPool(schoolId: Oid | string, now?: Date): Promise<DiagnosisPool>`; `poolRemaining(pool): number` (`Infinity` when unmetered); `splitByPool<T>(keys: readonly T[], remaining: number): { take: T[]; skip: T[] }`; `markSkippedBudget(schoolId: Oid, cacheKeys: readonly string[]): Promise<number>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/diagnosis-pool.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { School } from '../../School/model.js';
import { Subscription } from '../../subscription/model.js';
import { AnswerEvidence } from '../model.js';
import { DiagnosisRequest } from '../model-taxonomy.js';
import {
  DIAGNOSIS_POOL_FREE, DIAGNOSIS_POOL_PRO, diagnosisPool, markSkippedBudget, poolRemaining, splitByPool,
} from '../diagnosis-pool.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
const schools: Oid[] = [];

async function school(plan: 'standalone' | 'school', sub?: Record<string, unknown>): Promise<Oid> {
  const id = oid();
  schools.push(id);
  await School.collection.insertOne({ _id: id, name: `E pool ${String(id)}`, plan, isDeleted: false });
  if (sub) await Subscription.collection.insertOne({ schoolId: id, ...sub });
  return id;
}

async function spent(schoolId: Oid, kind: 'diagnosis' | 'tagging', items: number, createdAt: Date, state = 'done'): Promise<void> {
  await DiagnosisRequest.collection.insertOne({
    kind, schoolId, mode: 'batch', state, model: 'm', usage: { input: 0, output: 0 }, createdAt, updatedAt: createdAt,
    items: Array.from({ length: items }, (_, i) => ({ ref: `a${i}`, cacheKey: `k${i}` })),
  });
}

beforeAll(async () => { if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!); });
afterAll(async () => {
  await Promise.all([
    School.deleteMany({ _id: { $in: schools } }), Subscription.deleteMany({ schoolId: { $in: schools } }),
    DiagnosisRequest.deleteMany({ schoolId: { $in: schools } }), AnswerEvidence.deleteMany({ schoolId: { $in: schools } }),
  ]);
  await mongoose.disconnect();
});

describe('diagnosisPool', () => {
  it('skips over the pool, SAST month', async () => {
    const s = await school('standalone');
    await spent(s, 'diagnosis', DIAGNOSIS_POOL_FREE - 1, new Date('2026-09-30T23:30:00Z')); // 01:30 on 1 October in SAST
    const october = await diagnosisPool(s, new Date('2026-10-05T10:00:00Z'));
    expect(october).toMatchObject({ metered: true, used: DIAGNOSIS_POOL_FREE - 1, limit: DIAGNOSIS_POOL_FREE });
    expect(splitByPool(['a', 'b', 'c'], poolRemaining(october))).toEqual({ take: ['a'], skip: ['b', 'c'] });
    expect((await diagnosisPool(s, new Date('2026-09-15T10:00:00Z'))).used).toBe(0);
  });

  it('a school (non-standalone) is never limited', async () => {
    const s = await school('school');
    await spent(s, 'diagnosis', 5000, new Date());
    const pool = await diagnosisPool(s);
    expect(pool.metered).toBe(false);
    expect(poolRemaining(pool)).toBe(Number.POSITIVE_INFINITY);
    expect(splitByPool(['a', 'b'], poolRemaining(pool))).toEqual({ take: ['a', 'b'], skip: [] });
  });

  it('a trial counts as Pro; tagging counts one per paper; a failed call counts nothing', async () => {
    const s = await school('standalone', { status: 'trialing', trialEndsAt: new Date(Date.now() + 7 * 86_400_000) });
    await spent(s, 'tagging', 0, new Date());
    await spent(s, 'diagnosis', 10, new Date());
    await spent(s, 'diagnosis', 10, new Date(), 'failed');
    expect(await diagnosisPool(s)).toMatchObject({ limit: DIAGNOSIS_POOL_PRO, used: 11 });
  });

  it('marks only pending rows of those keys skipped_budget', async () => {
    const s = await school('standalone');
    const base = { schoolId: s, studentId: oid(), questionKey: 'q', topicFrom: 'question', marksAwarded: 0, marksAvailable: 1, markedBy: 'ai',
      markedAt: new Date(), status: 'final', answer: { kind: 'typed', text: 'x', truncated: false, hash: 'h' } };
    await AnswerEvidence.create([
      { ...base, source: { type: 'test', recordId: oid(), parentId: oid(), itemKey: '1' }, diagnosis: { state: 'pending', cacheKey: 'K1' } },
      { ...base, source: { type: 'test', recordId: oid(), parentId: oid(), itemKey: '1' }, diagnosis: { state: 'ready', cacheKey: 'K1' } },
    ]);
    expect(await markSkippedBudget(s, ['K1'])).toBe(1);
    expect(await AnswerEvidence.countDocuments({ schoolId: s, 'diagnosis.state': 'skipped_budget', 'diagnosis.skippedReason': 'budget' })).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/diagnosis-pool.test.ts`
Expected: FAIL — `Cannot find module '../diagnosis-pool.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/diagnosis-pool.ts
//
// Diagnosis for standalone schools draws on its own monthly pool (spec §6.7,
// plan ruling P4), never on the teacher's AI actions. Used = AI-diagnosed
// cache keys + paper-tagging calls this SAST month. Over the pool, diagnosis
// is skipped (not failed). The numbers are Shaun's call at the Phase P gate.
import mongoose from 'mongoose';
import { School } from '../School/model.js';
import { Subscription } from '../subscription/model.js';
import { isSubscriptionEntitled } from '../subscription/entitlements.js';
import { sastMonthWindow } from '../subscription/ai-allowance.js';
import { AnswerEvidence } from './model.js';
import { DiagnosisRequest } from './model-taxonomy.js';
import type { Oid } from './types.js';

export const DIAGNOSIS_POOL_FREE = 150;
export const DIAGNOSIS_POOL_PRO = 2000;

export interface DiagnosisPool { metered: boolean; used: number; limit: number; resetsAt: Date | null }

export async function diagnosisPool(schoolId: Oid | string, now: Date = new Date()): Promise<DiagnosisPool> {
  const id = new mongoose.Types.ObjectId(String(schoolId));
  const school = await School.findOne({ _id: id, isDeleted: false }).select('plan').lean();
  if (school?.plan !== 'standalone') return { metered: false, used: 0, limit: Number.POSITIVE_INFINITY, resetsAt: null };
  const { start, end } = sastMonthWindow(now);
  const [sub, rows] = await Promise.all([
    Subscription.findOne({ schoolId: id }).select('status currentPeriodEnd trialEndsAt pastDueSince').lean(),
    DiagnosisRequest.aggregate<{ used: number }>([
      { $match: { schoolId: id, kind: { $in: ['diagnosis', 'tagging'] }, state: { $ne: 'failed' }, createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, used: { $sum: { $cond: [{ $eq: ['$kind', 'tagging'] }, 1, { $size: '$items' }] } } } },
    ]),
  ]);
  const limit = isSubscriptionEntitled(sub, now) ? DIAGNOSIS_POOL_PRO : DIAGNOSIS_POOL_FREE;
  return { metered: true, used: rows[0]?.used ?? 0, limit, resetsAt: end };
}

export function poolRemaining(pool: DiagnosisPool): number {
  return pool.metered ? Math.max(0, pool.limit - pool.used) : Number.POSITIVE_INFINITY;
}

/** The first `remaining` keys (oldest first) are diagnosed; the rest are skipped. */
export function splitByPool<T>(keys: readonly T[], remaining: number): { take: T[]; skip: T[] } {
  const n = Number.isFinite(remaining) ? remaining : keys.length;
  return { take: keys.slice(0, n), skip: keys.slice(n) };
}

export async function markSkippedBudget(schoolId: Oid, cacheKeys: readonly string[]): Promise<number> {
  if (cacheKeys.length === 0) return 0;
  const res = await AnswerEvidence.updateMany(
    { schoolId, 'diagnosis.cacheKey': { $in: [...cacheKeys] }, 'diagnosis.state': 'pending', isDeleted: false },
    { $set: { 'diagnosis.state': 'skipped_budget', 'diagnosis.skippedReason': 'budget' } },
  );
  return res.modifiedCount;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/diagnosis-pool.test.ts && npx tsc --noEmit`
Expected: PASS (4 tests); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence
LANE_SWEEP_OK=1 git commit -m "feat(evidence): a monthly diagnosis pool per standalone school; over it, reasons are skipped" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: the AI transport (batch, direct, fixture) and the call ledger

**Files:**
- Create: `src/modules/Evidence/ai-transport.ts`
- Create: `src/modules/Evidence/ai-fixture.ts`
- Create: `src/modules/Evidence/ledger.ts`
- Modify: `src/modules/AITools/model.ts:250, 266-269` (`AIUsageType` + enum gain `evidence_diagnosis`, `misconception_seed`, `question_tagging`)
- Test: `src/modules/Evidence/__tests__/ai-transport.test.ts`

**Interfaces:**
- Consumes: `AIService.generateCompletionWithUsage` (with `options.model`), `batchRequest`, `createMessageBatch`, `retrieveMessageBatch`, `messageBatchResults` (Task 3); `config.evidence.mode`, `config.anthropic.diagnosisModel`.
- Produces: `type PromptKind = 'diagnosis' | 'seed' | 'tagging' | 'tidy'`; `type TransportMode = 'batch' | 'direct' | 'fixture'`; `interface FixtureHint { refs?: string[]; codes?: string[] }`; `interface EvidencePrompt { customId: string; kind: PromptKind; system: string; user: string; maxTokens: number; hint: FixtureHint }`; `interface EvidenceReply { customId: string; ok: boolean; text: string; usage: { input: number; output: number }; error: string | null; retryable: boolean }`; `transportMode(): TransportMode` (throws when `fixture` in production); `sendDirect(prompt, mode?): Promise<EvidenceReply>`; `submitBatch(prompts): Promise<string>`; `collectBatch(batchId): Promise<{ ended: boolean; replies: EvidenceReply[] }>`; `parseReply<T>(text, schema: z.ZodType<T>): T | null`; `fixtureReply(prompt): EvidenceReply`; `FIXTURE_EXPLANATION`; `customIdFor(id: Oid): string` (`dx_<id>`); `openRequest(input): Promise<{ _id: Oid }>`; `closeRequest(id: Oid, reply: EvidenceReply, error?: string): Promise<void>` (`failed` only when no tokens were spent); `logAIUsage(schoolId, teacherId, type, usage): Promise<void>`; `sourceTeacherId(source, schoolId): Promise<Oid | null>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/ai-transport.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';

const h = vi.hoisted(() => ({
  config: { nodeEnv: 'test', anthropic: { diagnosisModel: 'claude-sonnet-5' }, evidence: { mode: 'batch', enabled: true } },
  completion: vi.fn(), batchRequest: vi.fn(), createBatch: vi.fn(), retrieveBatch: vi.fn(), batchResults: vi.fn(),
}));
vi.mock('../../../config/env.js', () => ({ config: h.config }));
vi.mock('../../../services/ai.service.js', () => ({
  AIService: {
    generateCompletionWithUsage: h.completion, batchRequest: h.batchRequest, createMessageBatch: h.createBatch,
    retrieveMessageBatch: h.retrieveBatch, messageBatchResults: h.batchResults,
  },
}));

import { AppError } from '../../../common/errors.js';
import { collectBatch, parseReply, sendDirect, submitBatch, transportMode, type EvidencePrompt } from '../ai-transport.js';
import { FIXTURE_EXPLANATION, fixtureReply } from '../ai-fixture.js';

const prompt = (over: Partial<EvidencePrompt> = {}): EvidencePrompt => ({
  customId: 'dx_1', kind: 'diagnosis', system: 'sys', user: 'user', maxTokens: 800, hint: { refs: ['a1', 'a2'], codes: ['T.sign-error'] }, ...over,
});

beforeEach(() => {
  for (const fn of [h.completion, h.batchRequest, h.createBatch, h.retrieveBatch, h.batchResults]) fn.mockReset();
  h.config.nodeEnv = 'test';
  h.config.evidence.mode = 'batch';
});

describe('transportMode', () => {
  it('defaults to batch and refuses fixture replies in production', () => {
    expect(transportMode()).toBe('batch');
    h.config.evidence.mode = 'fixture';
    expect(transportMode()).toBe('fixture');
    h.config.nodeEnv = 'production';
    expect(() => transportMode()).toThrow('EVIDENCE_DIAGNOSIS_MODE=fixture is for development and tests only');
  });
});

describe('sendDirect', () => {
  it('asks AIService on the diagnosis model', async () => {
    h.completion.mockResolvedValue({ text: '{"items":[]}', usage: { input_tokens: 900, output_tokens: 80 } });
    const reply = await sendDirect(prompt(), 'direct');
    expect(h.completion).toHaveBeenCalledWith('sys', 'user', { model: 'claude-sonnet-5', maxTokens: 800, temperature: 0 });
    expect(reply).toMatchObject({ ok: true, usage: { input: 900, output: 80 } });
  });

  it('a busy AI is a retryable failure; a rejected request is not', async () => {
    h.completion.mockRejectedValueOnce(new AppError('busy', 503, true, { code: 'AI_BUSY' }));
    expect(await sendDirect(prompt(), 'direct')).toMatchObject({ ok: false, error: 'AI_BUSY', retryable: true });
    h.completion.mockRejectedValueOnce(new AppError('no', 502, true, { code: 'AI_REQUEST_REJECTED' }));
    expect(await sendDirect(prompt(), 'direct')).toMatchObject({ ok: false, retryable: false });
  });

  it('fixture mode answers without calling the AI', async () => {
    const reply = await sendDirect(prompt(), 'fixture');
    expect(h.completion).not.toHaveBeenCalled();
    expect(JSON.parse(reply.text).items).toEqual([
      { ref: 'a1', code: 'T.sign-error', explanation: FIXTURE_EXPLANATION, confidence: 0.8, checkMark: false },
      { ref: 'a2', code: 'T.sign-error', explanation: FIXTURE_EXPLANATION, confidence: 0.8, checkMark: false },
    ]);
    expect(reply.usage).toEqual({ input: 0, output: 0 });
  });

  it.each(['seed', 'tagging', 'tidy'] as const)('fixture mode has a valid %s reply', (kind) => {
    expect(() => JSON.parse(fixtureReply(prompt({ kind })).text)).not.toThrow();
  });
});

describe('batches', () => {
  it('submits one request per prompt and returns the batch id', async () => {
    h.batchRequest.mockImplementation((id: string) => ({ custom_id: id }));
    h.createBatch.mockResolvedValue({ id: 'msgbatch_9' });
    expect(await submitBatch([prompt(), prompt({ customId: 'dx_2' })])).toBe('msgbatch_9');
    expect(h.createBatch).toHaveBeenCalledWith([{ custom_id: 'dx_1' }, { custom_id: 'dx_2' }]);
  });

  it('waits while the batch runs, then maps every line by custom_id', async () => {
    h.retrieveBatch.mockResolvedValueOnce({ processing_status: 'in_progress' });
    expect(await collectBatch('msgbatch_9')).toEqual({ ended: false, replies: [] });
    h.retrieveBatch.mockResolvedValueOnce({ processing_status: 'ended' });
    h.batchResults.mockResolvedValue([
      { custom_id: 'dx_3', result: { type: 'expired' } },
      { custom_id: 'dx_1', result: { type: 'succeeded', message: { content: [{ type: 'text', text: '{}' }], usage: { input_tokens: 5, output_tokens: 2 } } } },
      { custom_id: 'dx_2', result: { type: 'errored', error: { type: 'error', error: { type: 'invalid_request_error', message: 'bad' } } } },
    ]);
    const { replies } = await collectBatch('msgbatch_9');
    const byId = new Map(replies.map((r) => [r.customId, r]));
    expect(byId.get('dx_1')).toMatchObject({ ok: true, text: '{}', usage: { input: 5, output: 2 } });
    expect(byId.get('dx_2')).toMatchObject({ ok: false, error: 'invalid_request_error', retryable: false });
    expect(byId.get('dx_3')).toMatchObject({ ok: false, error: 'expired', retryable: true });
  });
});

describe('parseReply', () => {
  const schema = z.object({ a: z.number() });
  it('strips a code fence and validates', () => {
    expect(parseReply('```json\n{"a":1}\n```', schema)).toEqual({ a: 1 });
    expect(parseReply('{"a":"x"}', schema)).toBeNull();
    expect(parseReply('not json', schema)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/modules/Evidence/__tests__/ai-transport.test.ts`
Expected: FAIL — `Cannot find module '../ai-transport.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/ai-transport.ts
//
// Every Phase E model call goes through here and then AIService (plan
// rulings P2, P3, P16): Message Batches by default (half price), the plain
// Messages API in direct mode, canned replies in fixture mode (dev and tests).
import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod/v4';
import { config } from '../../config/env.js';
import { AppError } from '../../common/errors.js';
import { AIService } from '../../services/ai.service.js';
import { fixtureReply } from './ai-fixture.js';

export type PromptKind = 'diagnosis' | 'seed' | 'tagging' | 'tidy';
export type TransportMode = 'batch' | 'direct' | 'fixture';
/** What fixture mode needs to answer without reading the prompt. */
export interface FixtureHint { refs?: string[]; codes?: string[] }
export interface EvidencePrompt { customId: string; kind: PromptKind; system: string; user: string; maxTokens: number; hint: FixtureHint }
export interface EvidenceReply {
  customId: string; ok: boolean; text: string; usage: { input: number; output: number }; error: string | null; retryable: boolean;
}

const NO_USAGE = { input: 0, output: 0 };

export function transportMode(): TransportMode {
  const mode = config.evidence.mode;
  if (mode === 'fixture') {
    if (config.nodeEnv === 'production') throw new Error('EVIDENCE_DIAGNOSIS_MODE=fixture is for development and tests only');
    return 'fixture';
  }
  return mode === 'direct' ? 'direct' : 'batch';
}

export async function sendDirect(prompt: EvidencePrompt, mode: TransportMode = transportMode()): Promise<EvidenceReply> {
  if (mode === 'fixture') return fixtureReply(prompt);
  try {
    const { text, usage } = await AIService.generateCompletionWithUsage(prompt.system, prompt.user, {
      model: config.anthropic.diagnosisModel, maxTokens: prompt.maxTokens, temperature: 0,
    });
    return { customId: prompt.customId, ok: true, text, usage: { input: usage.input_tokens, output: usage.output_tokens }, error: null, retryable: false };
  } catch (err: unknown) {
    const code = err instanceof AppError ? String(err.code ?? 'AI_ERROR') : 'AI_ERROR';
    return { customId: prompt.customId, ok: false, text: '', usage: NO_USAGE, error: code, retryable: code !== 'AI_REQUEST_REJECTED' };
  }
}

export async function submitBatch(prompts: readonly EvidencePrompt[]): Promise<string> {
  const batch = await AIService.createMessageBatch(
    prompts.map((p: EvidencePrompt) => AIService.batchRequest(p.customId, p.system, p.user, { maxTokens: p.maxTokens })),
  );
  return batch.id;
}

function toReply(line: Anthropic.Messages.MessageBatchIndividualResponse): EvidenceReply {
  const r = line.result;
  if (r.type === 'succeeded') {
    const block = r.message.content.find((b) => b.type === 'text');
    return {
      customId: line.custom_id, ok: true, text: block?.type === 'text' ? block.text : '', error: null, retryable: false,
      usage: { input: r.message.usage?.input_tokens ?? 0, output: r.message.usage?.output_tokens ?? 0 },
    };
  }
  if (r.type === 'errored') {
    const type = r.error?.error?.type ?? 'errored';
    return { customId: line.custom_id, ok: false, text: '', usage: NO_USAGE, error: type, retryable: type !== 'invalid_request_error' };
  }
  return { customId: line.custom_id, ok: false, text: '', usage: NO_USAGE, error: r.type, retryable: true };
}

/** Until the batch has ended there is nothing to read; afterwards every line, in any order. */
export async function collectBatch(batchId: string): Promise<{ ended: boolean; replies: EvidenceReply[] }> {
  const batch = await AIService.retrieveMessageBatch(batchId);
  if (batch.processing_status !== 'ended') return { ended: false, replies: [] };
  return { ended: true, replies: (await AIService.messageBatchResults(batchId)).map(toReply) };
}

export function parseReply<T>(text: string, schema: z.ZodType<T>): T | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = schema.safeParse(JSON.parse(cleaned));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
```

(`AppError.code` is the stable code `aiAppError` sets — `common/errors.ts:11, 18`; `ai-errors.ts:31-34`.)

```ts
// src/modules/Evidence/ai-fixture.ts
//
// Canned model replies for EVIDENCE_DIAGNOSIS_MODE=fixture (plan ruling P16):
// the walkthrough runs the real pipeline without an API key. Zero tokens.
import type { EvidencePrompt, EvidenceReply } from './ai-transport.js';

export const FIXTURE_EXPLANATION = 'Check the step where this went wrong, then work it through again.';

const SEED_TYPES = [
  ['sign-error', 'procedural', 'Sign error', 'Got a sign wrong', 'A plus or minus sign is lost or flipped part-way through.'],
  ['wrong-formula', 'misconception', 'Wrong formula used', 'Used the wrong formula', 'A formula for a different quantity is used.'],
  ['step-skipped', 'procedural', 'A step is missing', 'Skipped a step', 'The answer jumps over a step the method needs.'],
  ['concept-confused', 'misconception', 'Two ideas confused', 'Mixed up two ideas', 'Two related ideas of the topic are treated as the same thing.'],
  ['graph-misread', 'procedural', 'Graph or table misread', 'Misread the graph', 'A value is read from the wrong place on a graph or table.'],
  ['rule-overused', 'misconception', 'Rule used where it does not apply', 'Used a rule too widely', 'A rule is applied outside the cases it covers.'],
  ['rounding-early', 'procedural', 'Rounded too early', 'Rounded too early', 'Values are rounded mid-way, so the final answer drifts.'],
  ['definition-partial', 'misconception', 'Definition only partly known', 'Definition not complete', 'A definition is stated with a key condition missing.'],
] as const;

function body(prompt: EvidencePrompt): unknown {
  const refs = prompt.hint.refs ?? [];
  const firstCode = prompt.hint.codes?.[0] ?? null;
  switch (prompt.kind) {
    case 'seed':
      return { types: SEED_TYPES.map(([slug, kind, label, learnerLabel, description]) => ({ slug, kind, label, learnerLabel, description })) };
    case 'diagnosis':
      return { items: refs.map((ref: string) => ({ ref, code: firstCode ?? 'GEN.incomplete-answer', explanation: FIXTURE_EXPLANATION, confidence: 0.8, checkMark: false })) };
    case 'tagging':
      return { items: refs.map((ref: string) => ({ ref, topicCode: firstCode, capsLevel: 'routine' })) };
    case 'tidy':
      return { pairs: [] };
  }
}

export function fixtureReply(prompt: EvidencePrompt): EvidenceReply {
  return { customId: prompt.customId, ok: true, text: JSON.stringify(body(prompt)), usage: { input: 0, output: 0 }, error: null, retryable: false };
}
```

```ts
// src/modules/Evidence/ledger.ts
//
// Every Phase E AI call is a DiagnosisRequest (plan ruling P15): the pool and
// the cost measurement read it. School-attributable calls also go to
// AIUsageLog, which needs a school and a teacher.
import mongoose from 'mongoose';
import { config } from '../../config/env.js';
import { AIUsageLog } from '../AITools/model.js';
import { PaperMarking } from '../AITools/model-marking.js';
import { Homework } from '../Homework/model.js';
import { School } from '../School/model.js';
import { DiagnosisRequest, type RequestKind, type RequestMode } from './model-taxonomy.js';
import type { EvidenceReply } from './ai-transport.js';
import type { Oid, SourceType } from './types.js';

export const customIdFor = (id: Oid): string => `dx_${String(id)}`;

export interface OpenRequestInput {
  kind: RequestKind; mode: RequestMode; schoolId: Oid | null;
  topicNodeId?: Oid | null; paperId?: Oid | null; items?: Array<{ ref: string; cacheKey: string }>;
}

export async function openRequest(input: OpenRequestInput): Promise<{ _id: Oid }> {
  const doc = await DiagnosisRequest.create({
    kind: input.kind, mode: input.mode, schoolId: input.schoolId, topicNodeId: input.topicNodeId ?? null, paperId: input.paperId ?? null,
    items: input.items ?? [], state: 'submitted', model: config.anthropic.diagnosisModel,
  });
  return { _id: doc._id as Oid };
}

/** `failed` only when nothing was spent; a reply we could not use still counts as spend. */
export async function closeRequest(id: Oid, reply: EvidenceReply, error?: string): Promise<void> {
  await DiagnosisRequest.updateOne({ _id: id }, { $set: {
    state: reply.ok ? 'done' : 'failed', usage: reply.usage, error: error ?? reply.error, completedAt: new Date(),
  } });
}

export async function logAIUsage(
  schoolId: Oid | null, teacherId: Oid | null, type: 'evidence_diagnosis' | 'misconception_seed' | 'question_tagging',
  usage: { input: number; output: number },
): Promise<void> {
  if (!schoolId || !teacherId || usage.input + usage.output === 0) return;
  await AIUsageLog.create({ schoolId, teacherId, type, tokensUsed: usage, aiModel: config.anthropic.diagnosisModel });
}

/** Whose work a row came from, for AIUsageLog: the marking or homework teacher, else the school's owner. */
export async function sourceTeacherId(source: { type: SourceType; recordId: Oid; parentId: Oid }, schoolId: Oid): Promise<Oid | null> {
  const sid = new mongoose.Types.ObjectId(String(schoolId));
  if (source.type === 'test') {
    const m = await PaperMarking.findOne({ _id: source.recordId, schoolId: sid }).select('teacherId').lean();
    if (m?.teacherId) return m.teacherId as Oid;
  }
  if (source.type === 'homework') {
    const hw = await Homework.findOne({ _id: source.parentId, schoolId: sid }).select('teacherId').lean();
    if (hw?.teacherId) return hw.teacherId as Oid;
  }
  const school = await School.findOne({ _id: sid }).select('ownerUserId').lean();
  return (school?.ownerUserId as Oid | undefined) ?? null;
}
```

`src/modules/AITools/model.ts` — append `| 'evidence_diagnosis' | 'misconception_seed' | 'question_tagging'` to `AIUsageType` and the same three strings to the schema `enum`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/modules/Evidence/__tests__/ai-transport.test.ts && npx tsc --noEmit`
Expected: PASS (11 tests); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/modules/AITools/model.ts
LANE_SWEEP_OK=1 git commit -m "feat(evidence): one AI transport for batch, direct and fixture replies, and a ledger of every call" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: seeding a topic's misconceptions, and `npm run evidence:seed-taxonomy`

**Files:**
- Create: `src/modules/Evidence/seed.ts`
- Create: `src/scripts/evidence-cost.ts`, `src/scripts/evidence-seed-taxonomy.ts`
- Modify: `src/scripts/evidence-args.ts` (`grounding?: string`), `package.json` (`"evidence:seed-taxonomy": "tsx src/scripts/evidence-seed-taxonomy.ts"`)
- Test: `src/modules/Evidence/__tests__/seed.test.ts`

**Interfaces:**
- Consumes: `sendDirect`, `parseReply`, `openRequest`, `closeRequest`, `customIdFor`, `logAIUsage`, `transportMode` (Task 11); `GENERIC_TYPES` (Task 4).
- Produces: `SEED_SYSTEM`; `SeedReplySchema`; `interface SeedContext { schoolId: Oid | null; teacherId: Oid | null; grounding?: string }`; `seedTopicTypes(topicNodeId: Oid, ctx: SeedContext): Promise<number>` (types added); `hasActiveTypes(topicNodeId: Oid): Promise<boolean>`; `ensureTopicTypes(topicNodeId, ctx): Promise<boolean>` (true when the topic has usable types after the call); `estimateRand(input: number, output: number, batch: boolean): number`; `EvidenceArgs.grounding?: string` (a path to a .txt file).

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/seed.test.ts
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../../../config/env.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../config/env.js')>();
  return { config: { ...real.config, evidence: { mode: 'fixture', enabled: true } } };
});

import { CurriculumNode } from '../../CurriculumStructure/model.js';
import { DiagnosisRequest, MisconceptionType } from '../model-taxonomy.js';
import { ensureTopicTypes, seedTopicTypes } from '../seed.js';
import { estimateRand } from '../../../scripts/evidence-cost.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
let topic: Oid;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  const subject = oid();
  topic = oid();
  await CurriculumNode.collection.insertMany([
    { _id: subject, frameworkId: oid(), type: 'subject', parentId: null, title: 'Mathematics', code: `E-SEED-${String(subject)}`, metadata: {}, order: 0, schoolId: null, isDeleted: false },
    { _id: topic, frameworkId: oid(), type: 'topic', parentId: subject, subjectId: subject, title: 'Functions', code: `E-SEED-${String(topic)}`,
      metadata: { capsReference: 'CAPS p.23', assessmentStandards: ['Determine inverses'] }, order: 0, schoolId: null, isDeleted: false },
  ]);
});
afterAll(async () => {
  await Promise.all([
    CurriculumNode.deleteMany({ code: /^E-SEED-/ }), MisconceptionType.deleteMany({ code: /^E-SEED-/ }), DiagnosisRequest.deleteMany({ topicNodeId: topic }),
  ]);
  await mongoose.disconnect();
});

describe('seeding a topic', () => {
  it('adds the topic’s types as seeded, coded <topic code>.<slug>, and records the call', async () => {
    const added = await seedTopicTypes(topic, { schoolId: null, teacherId: null });
    expect(added).toBe(8);
    const types = await MisconceptionType.find({ topicNodeId: topic }).lean();
    expect(types.every((t) => t.status === 'seeded' && t.origin === 'ai_seed' && t.code.startsWith(`E-SEED-${String(topic)}.`))).toBe(true);
    expect(await DiagnosisRequest.findOne({ kind: 'seed', topicNodeId: topic }).lean()).toMatchObject({ state: 'done', mode: 'fixture' });
  });

  it('seeds only once: a topic with types needs no call', async () => {
    const before = await DiagnosisRequest.countDocuments({ kind: 'seed', topicNodeId: topic });
    expect(await ensureTopicTypes(topic, { schoolId: null, teacherId: null })).toBe(true);
    expect(await DiagnosisRequest.countDocuments({ kind: 'seed', topicNodeId: topic })).toBe(before);
  });
});

describe('estimateRand', () => {
  it('halves the price in a batch', () => {
    expect(estimateRand(1_000_000, 0, false)).toBeCloseTo(2 * estimateRand(1_000_000, 0, true));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/seed.test.ts`
Expected: FAIL — `Cannot find module '../seed.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/seed.ts
//
// The first time a topic has a row to diagnose and no usable types, one
// direct call writes 8–15 topic types (spec §6.3). Platform cost: never
// counted in a school's pool; logged to AIUsageLog when a school triggered it.
import { z } from 'zod/v4';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { ACTIVE_TYPE_STATUSES, MisconceptionType } from './model-taxonomy.js';
import { GENERIC_TYPES } from './taxonomy-generic.js';
import { parseReply, sendDirect, transportMode } from './ai-transport.js';
import { closeRequest, customIdFor, logAIUsage, openRequest } from './ledger.js';
import type { Oid } from './types.js';

export const SEED_SYSTEM = [
  'You list the common misconceptions South African learners show on one CAPS topic, for a marking assistant.',
  'Return JSON only: {"types":[{"slug":"...","kind":"misconception|procedural","label":"...","learnerLabel":"...","description":"..."}]} with 8 to 15 items.',
  'kind: misconception = a wrong idea; procedural = a wrong or missing step.',
  'slug: 2-40 characters of lower-case letters, digits and hyphens.',
  'label: at most 60 characters, for teachers. learnerLabel: at most 60 characters, in plain words a learner understands.',
  'description: at most 300 characters: what the error looks like in an answer. Generalise; never quote a learner.',
  `Do not repeat these general types, which already exist: ${GENERIC_TYPES.map((t) => t.label).join('; ')}.`,
].join('\n');

const cap = (n: number) => z.string().min(2).transform((s: string) => s.slice(0, n));
export const SeedReplySchema = z.object({
  types: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
    kind: z.enum(['misconception', 'procedural']),
    label: cap(60), learnerLabel: cap(60), description: cap(300),
  })).min(1).max(15),
});

export interface SeedContext { schoolId: Oid | null; teacherId: Oid | null; grounding?: string }

export async function hasActiveTypes(topicNodeId: Oid): Promise<boolean> {
  return Boolean(await MisconceptionType.exists({ topicNodeId, status: { $in: ACTIVE_TYPE_STATUSES } }));
}

async function title(id: unknown): Promise<string> {
  if (!id) return '';
  const node = await CurriculumNode.findOne({ _id: id, isDeleted: false }).select('title').lean();
  return node?.title ?? '';
}

export async function seedTopicTypes(topicNodeId: Oid, ctx: SeedContext): Promise<number> {
  const topic = await CurriculumNode.findOne({ _id: topicNodeId, isDeleted: false }).lean();
  if (!topic) return 0;
  const [subject, grade, subtopics] = await Promise.all([
    title(topic.subjectId), title(topic.gradeId),
    CurriculumNode.find({ parentId: topic._id, type: 'subtopic', isDeleted: false }).select('title').lean(),
  ]);
  const user = [
    `Subject: ${subject}`, `Grade: ${grade}`, `Topic: ${topic.title}`,
    `Subtopics: ${subtopics.map((s) => s.title).join('; ') || 'none listed'}`,
    `CAPS reference: ${topic.metadata?.capsReference || 'none'}`,
    `Assessment standards: ${(topic.metadata?.assessmentStandards ?? []).join('; ') || 'none'}`,
    ...(ctx.grounding ? ['', 'Common errors reported by examiners (use them as grounding):', ctx.grounding.slice(0, 6000)] : []),
  ].join('\n');
  const mode = transportMode() === 'fixture' ? 'fixture' : 'direct';
  const request = await openRequest({ kind: 'seed', mode, schoolId: ctx.schoolId, topicNodeId });
  const reply = await sendDirect({ customId: customIdFor(request._id), kind: 'seed', system: SEED_SYSTEM, user, maxTokens: 2500, hint: {} }, mode);
  const parsed = reply.ok ? parseReply(reply.text, SeedReplySchema) : null;
  await closeRequest(request._id, reply, reply.ok && !parsed ? 'invalid_reply' : undefined);
  await logAIUsage(ctx.schoolId, ctx.teacherId, 'misconception_seed', reply.usage);
  if (!parsed) return 0;
  await MisconceptionType.bulkWrite(parsed.types.map((t) => ({
    updateOne: {
      filter: { code: `${topic.code}.${t.slug}` },
      update: { $setOnInsert: {
        code: `${topic.code}.${t.slug}`, kind: t.kind, subjectNodeId: topic.subjectId ?? null, topicNodeId: topic._id,
        schoolId: topic.schoolId ?? null, label: t.label, learnerLabel: t.learnerLabel, description: t.description,
        status: 'seeded', origin: 'ai_seed', learnerVisible: true,
      } },
      upsert: true,
    },
  })));
  return parsed.types.length;
}

/** Seed on first use (a direct call, so the next batch can use the codes). */
export async function ensureTopicTypes(topicNodeId: Oid, ctx: SeedContext): Promise<boolean> {
  if (await hasActiveTypes(topicNodeId)) return true;
  return (await seedTopicTypes(topicNodeId, ctx)) > 0;
}
```

```ts
// src/scripts/evidence-cost.ts
//
// Planning estimates for the configured model (spec §6.6: claude-sonnet-5 at
// $2 / $10 per million tokens) and R18 to the dollar. Printed before any
// --apply; the measured cost comes from DiagnosisRequest.usage.
export const USD_PER_MTOK_IN = 2;
export const USD_PER_MTOK_OUT = 10;
export const ZAR_PER_USD = 18;

export function estimateRand(inputTokens: number, outputTokens: number, batch: boolean): number {
  const usd = (inputTokens * USD_PER_MTOK_IN + outputTokens * USD_PER_MTOK_OUT) / 1_000_000;
  return Math.round(usd * ZAR_PER_USD * (batch ? 0.5 : 1) * 100) / 100;
}
```

`src/scripts/evidence-args.ts` — add `grounding?: string;` to `EvidenceArgs` and, in `parseEvidenceArgs`, `const grounding = value(argv, 'grounding'); if (grounding !== undefined) args.grounding = grounding;`.

```ts
// src/scripts/evidence-seed-taxonomy.ts
/**
 * Seeds misconception types for every topic of one or more subject nodes
 * ahead of use (spec §6.3). Platform cost; no school is charged.
 *
 *   npm run evidence:seed-taxonomy -- --subject=<subject node code>[,<code>…]            # dry run
 *   npm run evidence:seed-taxonomy -- --subject=<codes> --apply [--grounding=<file.txt>]
 */
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { logger } from '../common/logger.js';
import { CurriculumNode } from '../modules/CurriculumStructure/model.js';
import { hasActiveTypes, seedTopicTypes } from '../modules/Evidence/seed.js';
import { parseEvidenceArgs } from './evidence-args.js';
import { estimateRand } from './evidence-cost.js';

const SEED_INPUT_TOKENS = 900;
const SEED_OUTPUT_TOKENS = 1100;

async function main(): Promise<void> {
  const args = parseEvidenceArgs(process.argv.slice(2));
  if (!args.subject) throw new Error('--subject=<subject node code> is required');
  const grounding = args.grounding ? readFileSync(args.grounding, 'utf8') : undefined;
  await mongoose.connect(config.mongodb.uri);
  try {
    const subjects = await CurriculumNode.find({ code: { $in: args.subject.split(',') }, type: 'subject', isDeleted: false }).select('_id code').lean();
    const topics = await CurriculumNode.find({ subjectId: { $in: subjects.map((s) => s._id) }, type: 'topic', isDeleted: false }).select('_id title').lean();
    const todo: typeof topics = [];
    for (const t of topics) if (!(await hasActiveTypes(t._id))) todo.push(t);
    logger.info(`${todo.length} of ${topics.length} topics need types; estimated R${estimateRand(todo.length * SEED_INPUT_TOKENS, todo.length * SEED_OUTPUT_TOKENS, false)}.`);
    if (!args.apply) {
      logger.info('Dry run: nothing seeded. Run with --apply to seed.');
      return;
    }
    for (const t of todo) logger.info(`${t.title}: ${await seedTopicTypes(t._id, { schoolId: null, teacherId: null, grounding })} types`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'evidence:seed-taxonomy failed');
  process.exit(1);
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/scripts package.json
LANE_SWEEP_OK=1 git commit -m "feat(evidence): seed a topic's misconception types on first use, and evidence:seed-taxonomy to pre-seed" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: untagged paper questions are tagged at finalise, and `npm run migrate:paper-question-tags`

**Files:**
- Create: `src/modules/Evidence/tagging.ts`
- Create: `src/scripts/evidence-tag-paper-questions.ts`
- Modify: `src/modules/QuestionBank/service-papers-pdf-finalise.ts:114-116` (fire-and-forget after the `finalised` save)
- Modify: `package.json` (`"migrate:paper-question-tags": "tsx src/scripts/evidence-tag-paper-questions.ts"`)
- Test: `src/modules/Evidence/__tests__/tagging.test.ts`

**Interfaces:**
- Consumes: `diagnosisPool`, `poolRemaining` (Task 10); `sendDirect`, `parseReply`, `openRequest`, `closeRequest`, `customIdFor`, `logAIUsage`, `transportMode` (Task 11); `IPaperQuestion` tags (Task 1).
- Produces: `NON_CONTENT_TITLE = /\b(revision|examination|exam|test|assessment)\b/i`; `interface TopicCandidate { _id: Oid; code: string; title: string }`; `candidateTopics(paper: { schoolId: Oid; topicIds: Oid[] }): Promise<TopicCandidate[]>`; `interface TagOutcome { tagged: number; untagged: number; skipped: 'none' | 'budget' | 'no_candidates' | 'failed' | null }`; `tagPaperQuestions(paperId: string | Oid, options?: { dryRun?: boolean }): Promise<TagOutcome>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/tagging.test.ts
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../../../config/env.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../config/env.js')>();
  return { config: { ...real.config, evidence: { mode: 'fixture', enabled: true } } };
});

import { AssessmentPaper } from '../../QuestionBank/model.js';
import { CurriculumNode } from '../../CurriculumStructure/model.js';
import { School } from '../../School/model.js';
import { DiagnosisRequest } from '../model-taxonomy.js';
import { finalisePaper } from '../../QuestionBank/service-papers-pdf-finalise.js';
import { DIAGNOSIS_POOL_FREE } from '../diagnosis-pool.js';
import { candidateTopics, tagPaperQuestions } from '../tagging.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
const schoolId = oid();
const teacherId = oid();
const subject = oid();
const functions = oid();
const revision = oid();
const sequences = oid();

async function nodes(): Promise<void> {
  const n = (_id: Oid, type: string, title: string, parentId: Oid | null) => ({
    _id, type, title, parentId, subjectId: subject, frameworkId: oid(), code: `E-TAG-${title.replace(/\s/g, '')}-${String(_id)}`, metadata: {}, order: 0, schoolId: null, isDeleted: false,
  });
  await CurriculumNode.collection.insertMany([
    n(subject, 'subject', 'Mathematics', null), n(functions, 'topic', 'Functions', subject), n(sequences, 'topic', 'Number patterns', subject),
    n(revision, 'topic', 'Revision', subject), n(oid(), 'subtopic', 'Inverse functions', functions),
  ]);
}

async function paper(topicIds: Oid[], status = 'finalised'): Promise<Oid> {
  const p = await AssessmentPaper.create({
    schoolId, title: 'June test', subjectId: oid(), gradeId: oid(), topicIds, term: 2, year: 2026, paperType: 'class_test', duration: 60, totalMarks: 5,
    status, createdBy: teacherId,
    sections: [{ title: 'A', instructions: '', order: 0, questions: [
      { questionText: 'Find the inverse of y = 2x + 1.', marks: 3, position: 0, modelAnswer: 'y = (x - 1)/2' },
      { questionText: 'Give T10 of 3; 7; 11.', marks: 2, position: 1, modelAnswer: '39', capsLevel: 'routine', tagFrom: 'teacher' },
    ] }],
  });
  return p._id as Oid;
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await nodes();
  await School.collection.insertOne({ _id: schoolId, name: 'E tagging', plan: 'standalone', isDeleted: false });
});
afterAll(async () => {
  await Promise.all([
    AssessmentPaper.deleteMany({ schoolId }), CurriculumNode.deleteMany({ code: /^E-TAG-/ }), School.deleteMany({ _id: schoolId }),
    DiagnosisRequest.deleteMany({ schoolId }),
  ]);
  await mongoose.disconnect();
});

describe('candidateTopics', () => {
  it('a "Revision" topic is replaced by the subject’s content topics, with subtopics', async () => {
    const titles = (await candidateTopics({ schoolId, topicIds: [revision] })).map((c) => c.title).sort();
    expect(titles).toEqual(['Functions', 'Inverse functions', 'Number patterns']);
  });
});

describe('tagPaperQuestions', () => {
  it('fills only what is missing, marks it ai_tag, and costs one unit of the pool', async () => {
    const id = await paper([functions]);
    const outcome = await tagPaperQuestions(id);
    expect(outcome).toMatchObject({ tagged: 2, untagged: 0, skipped: null });
    const [first, second] = (await AssessmentPaper.findById(id).lean())!.sections[0].questions;
    expect(first).toMatchObject({ capsLevel: 'routine', tagFrom: 'ai_tag' });
    expect(first.curriculumNodeId).not.toBeNull();
    expect(second.tagFrom).toBe('teacher');
    expect(await DiagnosisRequest.countDocuments({ kind: 'tagging', paperId: id })).toBe(1);
    expect((await AssessmentPaper.findById(id).lean())!.version).toBe(1);
  });

  it('does nothing when every question is tagged, and skips when the pool is used', async () => {
    const id = await paper([functions]);
    await tagPaperQuestions(id);
    expect((await tagPaperQuestions(id)).skipped).toBe('none');
    await DiagnosisRequest.collection.insertOne({ kind: 'diagnosis', schoolId, mode: 'batch', state: 'done', model: 'm', createdAt: new Date(),
      items: Array.from({ length: DIAGNOSIS_POOL_FREE }, (_, i) => ({ ref: `a${i}`, cacheKey: `k${i}` })) });
    expect((await tagPaperQuestions(await paper([functions]))).skipped).toBe('budget');
  });

  it('finalising a paper tags it in the background', async () => {
    await DiagnosisRequest.deleteMany({ schoolId });
    const id = await paper([functions], 'draft');
    await AssessmentPaper.updateOne({ _id: id }, { $set: { 'sections.0.questions.1.curriculumNodeId': sequences } });
    await finalisePaper(String(id), String(schoolId), String(teacherId), 'teacher', false, true);
    await vi.waitFor(async () => {
      expect((await AssessmentPaper.findById(id).lean())!.sections[0].questions[0].tagFrom).toBe('ai_tag');
    }, { timeout: 5000 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/tagging.test.ts`
Expected: FAIL — `Cannot find module '../tagging.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/tagging.ts
//
// Inline paper questions still missing a topic or level are tagged with one
// call per paper (spec §4.2, plan ruling P9), counted as one unit of the
// school's pool. Only missing fields are filled; the paper version is not
// bumped (tags change nothing a learner sees).
import mongoose from 'mongoose';
import { z } from 'zod/v4';
import { AssessmentPaper } from '../QuestionBank/model.js';
import { CAPS_LEVELS } from '../QuestionBank/model-shared.js';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { diagnosisPool, poolRemaining } from './diagnosis-pool.js';
import { parseReply, sendDirect, transportMode } from './ai-transport.js';
import { closeRequest, customIdFor, logAIUsage, openRequest } from './ledger.js';
import type { Oid } from './types.js';

export const NON_CONTENT_TITLE = /\b(revision|examination|exam|test|assessment)\b/i;
export interface TopicCandidate { _id: Oid; code: string; title: string }
export interface TagOutcome { tagged: number; untagged: number; skipped: 'none' | 'budget' | 'no_candidates' | 'failed' | null }

const TaggingReplySchema = z.object({
  items: z.array(z.object({ ref: z.string(), topicCode: z.string().nullable(), capsLevel: z.enum(CAPS_LEVELS).nullable() })),
});

const TAGGING_SYSTEM = [
  'You tag school test questions with the CAPS topic they assess and their cognitive level.',
  'For each question choose exactly one topic code from the list (or null if none fits) and one level: knowledge | routine | complex | problem_solving.',
  'Return JSON only: {"items":[{"ref":"<ref>","topicCode":"<code or null>","capsLevel":"<level or null>"}]}.',
].join('\n');

interface NodeLite { _id: Oid; type: string; title: string; code: string; subjectId: Oid | null }

export async function candidateTopics(paper: { schoolId: Oid; topicIds: Oid[] }): Promise<TopicCandidate[]> {
  const visible = [{ schoolId: null }, { schoolId: paper.schoolId }];
  const picked = (await CurriculumNode.find({ _id: { $in: paper.topicIds }, isDeleted: false, $or: visible })
    .select('type title code subjectId').lean()) as unknown as NodeLite[];
  const content = picked.filter((n) => (n.type === 'topic' || n.type === 'subtopic') && !NON_CONTENT_TITLE.test(n.title));
  const other = picked.filter((n) => !content.includes(n));
  const extra = other.length === 0 ? [] : ((await CurriculumNode.find({
    subjectId: { $in: other.map((n) => n.subjectId).filter(Boolean) }, type: 'topic', isDeleted: false, $or: visible,
  }).select('type title code subjectId').lean()) as unknown as NodeLite[]).filter((n) => !NON_CONTENT_TITLE.test(n.title));
  const topics = [...content, ...extra];
  const subtopics = (await CurriculumNode.find({
    parentId: { $in: topics.filter((t) => t.type === 'topic').map((t) => t._id) }, type: 'subtopic', isDeleted: false, $or: visible,
  }).select('type title code subjectId').lean()) as unknown as NodeLite[];
  const seen = new Set<string>();
  return [...topics, ...subtopics].filter((n) => !seen.has(String(n._id)) && seen.add(String(n._id)))
    .map((n) => ({ _id: n._id, code: n.code, title: n.title }));
}

export async function tagPaperQuestions(paperId: string | Oid, options: { dryRun?: boolean } = {}): Promise<TagOutcome> {
  const paper = await AssessmentPaper.findOne({ _id: new mongoose.Types.ObjectId(String(paperId)), isDeleted: false });
  if (!paper) return { tagged: 0, untagged: 0, skipped: 'none' };
  const targets = paper.sections.flatMap((section, s) => section.questions
    .filter((q) => !q.questionId && q.questionText && (!q.curriculumNodeId || !q.capsLevel))
    .map((q) => ({ ref: `${s + 1}.${q.position + 1}`, q })));
  if (targets.length === 0) return { tagged: 0, untagged: 0, skipped: 'none' };
  if (options.dryRun) return { tagged: 0, untagged: targets.length, skipped: null };
  if (poolRemaining(await diagnosisPool(paper.schoolId)) < 1) return { tagged: 0, untagged: targets.length, skipped: 'budget' };
  const candidates = await candidateTopics({ schoolId: paper.schoolId, topicIds: paper.topicIds });
  if (candidates.length === 0) return { tagged: 0, untagged: targets.length, skipped: 'no_candidates' };

  const mode = transportMode() === 'fixture' ? 'fixture' : 'direct';
  const request = await openRequest({ kind: 'tagging', mode, schoolId: paper.schoolId, paperId: paper._id as Oid, items: [{ ref: 'paper', cacheKey: `tag:${String(paper._id)}` }] });
  const user = [
    'Topics:', ...candidates.map((c) => `- ${c.code}: ${c.title}`), '', 'Questions:',
    ...targets.map((t) => `[${t.ref}] ${String(t.q.questionText).slice(0, 800)}\nMemo: ${String(t.q.modelAnswer ?? '').slice(0, 400)}`),
  ].join('\n');
  const reply = await sendDirect({
    customId: customIdFor(request._id), kind: 'tagging', system: TAGGING_SYSTEM, user, maxTokens: 200 + 40 * targets.length,
    hint: { refs: targets.map((t) => t.ref), codes: candidates.map((c) => c.code) },
  }, mode);
  const parsed = reply.ok ? parseReply(reply.text, TaggingReplySchema) : null;
  await closeRequest(request._id, reply, reply.ok && !parsed ? 'invalid_reply' : undefined);
  await logAIUsage(paper.schoolId, paper.createdBy, 'question_tagging', reply.usage);
  if (!parsed) return { tagged: 0, untagged: targets.length, skipped: 'failed' };

  const nodeByCode = new Map(candidates.map((c) => [c.code, c._id]));
  let tagged = 0;
  for (const item of parsed.items) {
    const target = targets.find((t) => t.ref === item.ref);
    if (!target) continue;
    const node = item.topicCode ? nodeByCode.get(item.topicCode) : undefined;
    const fillNode = !target.q.curriculumNodeId && node;
    const fillLevel = !target.q.capsLevel && item.capsLevel;
    if (fillNode) target.q.curriculumNodeId = node;
    if (fillLevel) target.q.capsLevel = item.capsLevel;
    if (fillNode || fillLevel) {
      target.q.tagFrom = target.q.tagFrom ?? 'ai_tag';
      tagged += 1;
    }
  }
  paper.markModified('sections');
  await paper.save();
  return { tagged, untagged: targets.length - tagged, skipped: null };
}
```

`src/modules/QuestionBank/service-papers-pdf-finalise.ts` — import `safeEvidence` from `'../Evidence/write-rows.js'` and `tagPaperQuestions` from `'../Evidence/tagging.js'`; directly after `paper.status = 'finalised'; await paper.save();`:

```ts
    // Phase E §4.2: tag untagged inline questions in the background; never slows or fails the finalise.
    void safeEvidence('paper.tagging', () => tagPaperQuestions(paper._id));
```

(The moderation-approval finalise path is not hooked: standalone teachers finalise here, and `migrate:paper-question-tags` covers the rest.)

```ts
// src/scripts/evidence-tag-paper-questions.ts
/**
 * Tags inline questions on finalised papers that have markings (Phase E §5),
 * one AI call per paper, before the evidence backfill.
 *
 *   npm run migrate:paper-question-tags                        # dry run: papers, questions, estimated cost
 *   npm run migrate:paper-question-tags -- --apply [--yes]     # --yes is required above R50
 *   npm run migrate:paper-question-tags -- --school=<id>
 */
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { logger } from '../common/logger.js';
import { AssessmentPaper } from '../modules/QuestionBank/model.js';
import { PaperMarking } from '../modules/AITools/model-marking.js';
import { tagPaperQuestions } from '../modules/Evidence/tagging.js';
import { parseEvidenceArgs } from './evidence-args.js';
import { estimateRand } from './evidence-cost.js';

const MAX_UNCONFIRMED_RAND = 50;

async function main(): Promise<void> {
  const args = parseEvidenceArgs(process.argv.slice(2));
  await mongoose.connect(config.mongodb.uri);
  try {
    const school = args.school ? { schoolId: new mongoose.Types.ObjectId(args.school) } : {};
    const marked = await PaperMarking.distinct('paperId', { paperType: 'assessment', isDeleted: false, ...school });
    const papers = await AssessmentPaper.find({ _id: { $in: marked }, status: 'finalised', isDeleted: false, ...school }).select('_id title').lean();
    const plan: Array<{ id: mongoose.Types.ObjectId; title: string; questions: number }> = [];
    for (const p of papers) {
      const { untagged } = await tagPaperQuestions(p._id, { dryRun: true });
      if (untagged > 0) plan.push({ id: p._id as mongoose.Types.ObjectId, title: p.title, questions: untagged });
    }
    const questions = plan.reduce((s, p) => s + p.questions, 0);
    const rand = estimateRand(plan.length * 1200 + questions * 150, questions * 30, false);
    logger.info(`${plan.length} papers, ${questions} untagged questions; estimated R${rand}.`);
    if (!args.apply) {
      logger.info('Dry run: nothing tagged. Run with --apply to tag.');
      return;
    }
    if (rand > MAX_UNCONFIRMED_RAND && !args.yes) throw new Error(`Estimated R${rand} is above R${MAX_UNCONFIRMED_RAND}: add --yes to go ahead`);
    for (const p of plan) logger.info({ paper: p.title, ...(await tagPaperQuestions(p.id)) }, 'tagged');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'migrate:paper-question-tags failed');
  process.exit(1);
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence src/modules/QuestionBank && npx tsc --noEmit`
Expected: PASS (including `finalise-paths.test.ts`); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/modules/QuestionBank/service-papers-pdf-finalise.ts src/scripts package.json
LANE_SWEEP_OK=1 git commit -m "feat(evidence): tag untagged inline paper questions at finalise, and migrate:paper-question-tags for old papers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 14: the diagnosis prompt, question context and turning a reply into a type

**Files:**
- Create: `src/modules/Evidence/diagnosis-prompt.ts`
- Create: `src/modules/Evidence/question-context.ts`
- Create: `src/modules/Evidence/diagnosis-types.ts`
- Test: `src/modules/Evidence/__tests__/diagnosis-prompt.test.ts`

**Interfaces:**
- Consumes: `MisconceptionType`, `ACTIVE_TYPE_STATUSES` (Task 4); `ensureGenericTypes`, `genericTypeId`, `genericCode`, `GENERIC_TYPES` (Task 4).
- Produces: `MAX_ITEMS_PER_REQUEST = 10`; `DIAGNOSIS_SYSTEM`; `interface TopicBlock { subject: string; grade: string; topic: string; subtopics: string[]; types: Array<{ code: string; label: string; description: string }> }`; `interface DiagnosisPromptItem { ref: string; stem: string; memo: string; guideline: string; awarded: number; available: number; markerNote: string; answer: string }`; `diagnosisUserPrompt(topic, items): string`; `diagnosisMaxTokens(items: number): number`; `DiagnosisReplySchema`, `type DiagnosisReplyItem`; `interface QuestionContext { stem: string; memo: string; guideline: string }`; `parseQuestionKey(key)`; `questionContexts(keys, schoolId): Promise<Map<string, QuestionContext>>`; `interface TopicTaxonomy { topic: { _id: Oid; code: string; schoolId: Oid | null; subjectId: Oid | null }; byCode: Map<string, Oid>; block: TopicBlock }`; `topicTaxonomy(topicNodeId): Promise<TopicTaxonomy | null>`; `typeForItem(tax, item): Promise<Oid>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/diagnosis-prompt.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { CurriculumNode } from '../../CurriculumStructure/model.js';
import { AssessmentPaper, Question } from '../../QuestionBank/model.js';
import { Quiz } from '../../Learning/model.js';
import { MisconceptionType } from '../model-taxonomy.js';
import { resetGenericTypeCache, genericTypeId } from '../taxonomy-generic.js';
import { DIAGNOSIS_SYSTEM, DiagnosisReplySchema, diagnosisUserPrompt } from '../diagnosis-prompt.js';
import { questionContexts } from '../question-context.js';
import { topicTaxonomy, typeForItem } from '../diagnosis-types.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
const schoolId = oid();
const topic = oid();
const code = `E-DP-${String(topic)}`;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await CurriculumNode.collection.insertOne({ _id: topic, frameworkId: oid(), type: 'topic', parentId: null, title: 'Functions', code, metadata: {}, order: 0, schoolId: null, isDeleted: false });
  await MisconceptionType.create({ code: `${code}.domain-not-restricted`, kind: 'misconception', topicNodeId: topic, label: 'Domain not restricted on inverse',
    learnerLabel: "Didn't restrict the domain", description: 'Gives the inverse of a many-to-one function without restricting the domain.', status: 'seeded', origin: 'ai_seed' });
});
beforeEach(() => resetGenericTypeCache());
afterAll(async () => {
  await Promise.all([
    CurriculumNode.deleteMany({ code: /^E-DP-/ }), MisconceptionType.deleteMany({ code: new RegExp(`^${code}`) }),
    Question.deleteMany({ schoolId }), AssessmentPaper.deleteMany({ schoolId }), Quiz.deleteMany({ schoolId }),
  ]);
  await mongoose.disconnect();
});

describe('the prompt', () => {
  it('lists the general codes the model may choose, but not the ones decided by rule or flag', () => {
    expect(DIAGNOSIS_SYSTEM).toContain('GEN.careless-arithmetic');
    expect(DIAGNOSIS_SYSTEM).not.toContain('GEN.unanswered');
    expect(DIAGNOSIS_SYSTEM).not.toContain('GEN.possible-marking-error');
  });

  it('puts the topic block before the items, and every item has its ref, marks and answer', () => {
    const user = diagnosisUserPrompt(
      { subject: 'Mathematics', grade: 'Grade 12', topic: 'Functions', subtopics: ['Inverses'], types: [{ code: 'X.a', label: 'A', description: 'd' }] },
      [{ ref: 'a1', stem: 'Find f^-1', memo: 'x/3', guideline: '', awarded: 1, available: 2, markerNote: 'Swapped only', answer: 'y = 3x' }],
    );
    expect(user.indexOf('Topic codes:')).toBeLessThan(user.indexOf('[a1]'));
    expect(user).toContain('Marks: 1 of 2');
    expect(user).toContain("Learner's answer: y = 3x");
  });

  it('trims an over-long explanation instead of rejecting the reply, and rejects a bad confidence', () => {
    const long = 'x'.repeat(400);
    const ok = DiagnosisReplySchema.parse({ items: [{ ref: 'a1', code: 'X.a', explanation: long, confidence: 0.7 }] });
    expect(ok.items[0].explanation).toHaveLength(240);
    expect(ok.items[0].checkMark).toBe(false);
    expect(DiagnosisReplySchema.safeParse({ items: [{ ref: 'a1', explanation: 'e', confidence: 2 }] }).success).toBe(false);
  });
});

describe('questionContexts', () => {
  it('finds stem, memo and guideline for bank, paper, quiz keys; skips unknown ones', async () => {
    const q = await Question.create({ curriculumNodeId: topic, schoolId, subjectId: oid(), gradeId: oid(), type: 'short_answer', stem: 'Find f^-1(x) for f(x) = 3x',
      answer: 'x/3', markingRubric: 'Swap and solve', marks: 2, cognitiveLevel: { caps: 'routine', blooms: 'apply' }, createdBy: oid() });
    const paper = await AssessmentPaper.create({ schoolId, title: 'T', subjectId: oid(), gradeId: oid(), topicIds: [topic], term: 1, year: 2026, paperType: 'class_test',
      duration: 10, totalMarks: 3, createdBy: oid(), sections: [{ title: 'A', order: 0, questions: [{ questionText: 'Is y = x² one-to-one?', marks: 3, position: 0, modelAnswer: 'No', markingGuideline: 'Horizontal line test' }] }] });
    const quiz = await Quiz.collection.insertOne({ schoolId, questions: [{ questionText: '2 + 2', questionType: 'mcq', options: [], correctAnswer: '4', points: 1, explanation: 'Add' }] });
    const keys = [`q:${String(q._id)}`, `p:${String(paper._id)}:v1:1.1`, `lq:${String(quiz.insertedId)}:0`, 'zz:nope'];
    const ctx = await questionContexts(keys, schoolId);
    expect(ctx.get(keys[0])).toEqual({ stem: 'Find f^-1(x) for f(x) = 3x', memo: 'x/3', guideline: 'Swap and solve' });
    expect(ctx.get(keys[1])).toEqual({ stem: 'Is y = x² one-to-one?', memo: 'No', guideline: 'Horizontal line test' });
    expect(ctx.get(keys[2])).toEqual({ stem: '2 + 2', memo: '4', guideline: 'Add' });
    expect(ctx.has('zz:nope')).toBe(false);
  });
});

describe('typeForItem', () => {
  it('a listed code, a general code, a proposal, a check-mark flag, and an unknown code', async () => {
    const tax = (await topicTaxonomy(topic))!;
    const listed = await typeForItem(tax, { ref: 'a1', code: `${code}.domain-not-restricted`, explanation: 'e', confidence: 0.9, checkMark: false });
    expect(String(listed)).toBe(String(tax.byCode.get(`${code}.domain-not-restricted`)));
    expect(String(await typeForItem(tax, { ref: 'a1', code: 'GEN.careless-arithmetic', explanation: 'e', confidence: 0.9, checkMark: false })))
      .toBe(String(await genericTypeId('careless-arithmetic')));
    const proposed = await typeForItem(tax, { ref: 'a1', code: null, proposed: { slug: 'swapped-not-solved', kind: 'procedural', label: 'Swapped but did not solve', learnerLabel: 'Stopped after swapping', description: 'Swaps x and y, then stops.' }, explanation: 'e', confidence: 0.8, checkMark: false });
    expect(await MisconceptionType.findById(proposed).lean()).toMatchObject({ code: `${code}.swapped-not-solved`, status: 'proposed', origin: 'ai_proposed' });
    expect(String(await typeForItem(tax, { ref: 'a1', code: 'X.whatever', explanation: 'e', confidence: 0.9, checkMark: true })))
      .toBe(String(await genericTypeId('possible-marking-error')));
    expect(String(await typeForItem(tax, { ref: 'a1', code: 'X.unknown', explanation: 'e', confidence: 0.9, checkMark: false })))
      .toBe(String(await genericTypeId('incomplete-answer')));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/diagnosis-prompt.test.ts`
Expected: FAIL — `Cannot find module '../diagnosis-prompt.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/diagnosis-prompt.ts
//
// The diagnosis request (spec §6.5). The system prompt is identical for every
// request (a cacheable prefix); the user message is the topic block, then up
// to 10 answers. No names, ids or school ever go in.
import { z } from 'zod/v4';
import { GENERIC_TYPES, genericCode } from './taxonomy-generic.js';

export const MAX_ITEMS_PER_REQUEST = 10;

const CHOOSABLE_GENERIC = GENERIC_TYPES.filter((t) => t.slug !== 'unanswered' && t.slug !== 'possible-marking-error');

export const DIAGNOSIS_SYSTEM = [
  'You explain why a South African learner lost marks on one school test question at a time.',
  'For each item choose the single most specific code, from the topic codes or the general codes, that explains the lost marks.',
  'If no listed code fits, set "code" to null and propose one in "proposed": {"slug","kind","label","learnerLabel","description"}. kind is misconception or procedural; slug is lower-case letters, digits and hyphens; label and learnerLabel at most 60 characters; description at most 300 characters, generalised, never quoting the answer.',
  'explanation: one sentence to the learner, second person, at most 30 words: what went wrong and what to do instead. Do not mention marks, do not quote the answer back at length, never use a name.',
  'confidence: a number from 0 to 1, how sure you are.',
  'checkMark: true only when the answer seems to deserve the marks it lost.',
  'Return JSON only: {"items":[{"ref":"a1","code":"<code or null>","proposed":null,"explanation":"...","confidence":0.8,"checkMark":false}]}.',
  '',
  'General codes:',
  ...CHOOSABLE_GENERIC.map((t) => `- ${genericCode(t.slug)}: ${t.label}. ${t.description}`),
].join('\n');

export interface TopicBlock {
  subject: string; grade: string; topic: string; subtopics: string[];
  types: Array<{ code: string; label: string; description: string }>;
}

export interface DiagnosisPromptItem {
  ref: string; stem: string; memo: string; guideline: string; awarded: number; available: number; markerNote: string; answer: string;
}

export function diagnosisUserPrompt(topic: TopicBlock, items: readonly DiagnosisPromptItem[]): string {
  return [
    `Subject: ${topic.subject}`, `Grade: ${topic.grade}`, `Topic: ${topic.topic}`,
    `Subtopics: ${topic.subtopics.join('; ') || 'none listed'}`, '', 'Topic codes:',
    ...topic.types.map((t) => `- ${t.code}: ${t.label}. ${t.description}`), '', 'Items:',
    ...items.map((i) => [
      `[${i.ref}]`, `Question: ${i.stem}`, `Memo: ${i.memo || 'none'}`, `Marking guideline: ${i.guideline || 'none'}`,
      `Marks: ${i.awarded} of ${i.available}`, `Marker's note: ${i.markerNote || 'none'}`, `Learner's answer: ${i.answer || '(blank)'}`, '',
    ].join('\n')),
  ].join('\n');
}

export const diagnosisMaxTokens = (items: number): number => 200 + 120 * items;

const clip = (n: number) => z.string().transform((s: string) => s.slice(0, n));

export const DiagnosisReplySchema = z.object({
  items: z.array(z.object({
    ref: z.string(),
    code: z.string().nullable().optional(),
    proposed: z.object({
      slug: z.string(), kind: z.enum(['misconception', 'procedural']), label: clip(60), learnerLabel: clip(60), description: clip(300),
    }).nullable().optional(),
    explanation: clip(240),
    confidence: z.number().min(0).max(1),
    checkMark: z.boolean().default(false),
  })),
});
export type DiagnosisReplyItem = z.infer<typeof DiagnosisReplySchema>['items'][number];
```

```ts
// src/modules/Evidence/question-context.ts
//
// Stem, memo and guideline per question key (spec §6.5), resolved once per
// key per run from the key's owner: q: bank, p: paper, g: legacy paper,
// lq: Learning quiz, pr: practice, cb: library block.
import mongoose from 'mongoose';
import { AssessmentPaper, Question } from '../QuestionBank/model.js';
import { GeneratedPaper } from '../AITools/model.js';
import { Quiz } from '../Learning/model.js';
import { PracticeAttempt } from '../AITutor/model.js';
import { ContentResource } from '../ContentLibrary/model.js';
import type { Oid } from './types.js';

export interface QuestionContext { stem: string; memo: string; guideline: string }
type Kind = 'q' | 'p' | 'g' | 'lq' | 'pr' | 'cb';
interface ParsedKey { kind: Kind; id: string; rest: string[] }

const KINDS: readonly Kind[] = ['q', 'p', 'g', 'lq', 'pr', 'cb'];
const MAX = 1500;
const clip = (s: unknown): string => String(s ?? '').slice(0, MAX);

export function parseQuestionKey(key: string): ParsedKey | null {
  const [kind, id, ...rest] = key.split(':');
  if (!KINDS.includes(kind as Kind) || !id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return { kind: kind as Kind, id, rest };
}

interface Docs {
  q: Map<string, { stem: string; answer: string; markingRubric: string; options?: Array<{ label: string; text: string; isCorrect: boolean }> }>;
  p: Map<string, { sections: Array<{ questions: Array<{ position: number; questionText: string | null; modelAnswer: string | null; markingGuideline: string | null }> }> }>;
  g: Map<string, { sections: Array<{ questions: Array<{ questionNumber: number; questionText: string; modelAnswer: string; markingGuideline: string }> }> }>;
  lq: Map<string, { questions: Array<{ questionText: string; correctAnswer: string; explanation?: string }> }>;
  pr: Map<string, { questions: Array<{ questionText: string; correctAnswer: string; explanation: string }> }>;
  cb: Map<string, { blocks: Array<{ blockId: string; content: string }> }>;
}

function contextFor(p: ParsedKey, d: Docs): QuestionContext | null {
  const index = Number(p.rest[0]);
  switch (p.kind) {
    case 'q': {
      const q = d.q.get(p.id);
      const correct = q?.options?.find((o) => o.isCorrect);
      return q ? { stem: clip(q.stem), memo: clip(correct ? `${correct.label}. ${correct.text}` : q.answer), guideline: clip(q.markingRubric) } : null;
    }
    case 'p': {
      const [s, pos] = (p.rest[1] ?? '').split('.').map(Number);
      const pq = d.p.get(p.id)?.sections?.[s - 1]?.questions?.find((q) => q.position === pos - 1);
      return pq ? { stem: clip(pq.questionText), memo: clip(pq.modelAnswer), guideline: clip(pq.markingGuideline) } : null;
    }
    case 'g': {
      const q = d.g.get(p.id)?.sections?.flatMap((s) => s.questions).find((x) => x.questionNumber === index);
      return q ? { stem: clip(q.questionText), memo: clip(q.modelAnswer), guideline: clip(q.markingGuideline) } : null;
    }
    case 'lq': {
      const q = d.lq.get(p.id)?.questions?.[index];
      return q ? { stem: clip(q.questionText), memo: clip(q.correctAnswer), guideline: clip(q.explanation) } : null;
    }
    case 'pr': {
      const q = d.pr.get(p.id)?.questions?.[index];
      return q ? { stem: clip(q.questionText), memo: clip(q.correctAnswer), guideline: clip(q.explanation) } : null;
    }
    case 'cb': {
      const block = d.cb.get(p.id)?.blocks?.find((b) => b.blockId === p.rest[0]);
      return block ? { stem: clip(block.content), memo: '', guideline: '' } : null;
    }
  }
}

export async function questionContexts(keys: readonly string[], schoolId: Oid): Promise<Map<string, QuestionContext>> {
  const parsed = keys.map((k: string) => [k, parseQuestionKey(k)] as const)
    .filter((entry): entry is readonly [string, ParsedKey] => entry[1] !== null);
  const ids = (kind: Kind): mongoose.Types.ObjectId[] =>
    [...new Set(parsed.filter(([, p]) => p.kind === kind).map(([, p]) => p.id))].map((id: string) => new mongoose.Types.ObjectId(id));
  const visible = { $or: [{ schoolId }, { schoolId: null }] };
  const byId = <T>(docs: unknown[]): Map<string, T> => new Map((docs as Array<{ _id: unknown }>).map((d) => [String(d._id), d as T]));
  const [q, p, g, lq, pr, cb] = await Promise.all([
    Question.find({ _id: { $in: ids('q') }, ...visible }).select('stem answer markingRubric options').lean(),
    AssessmentPaper.find({ _id: { $in: ids('p') }, schoolId }).select('sections').lean(),
    GeneratedPaper.find({ _id: { $in: ids('g') }, schoolId }).select('sections').lean(),
    Quiz.find({ _id: { $in: ids('lq') }, schoolId }).select('questions').lean(),
    PracticeAttempt.find({ _id: { $in: ids('pr') }, schoolId }).select('questions').lean(),
    ContentResource.find({ _id: { $in: ids('cb') }, ...visible }).select('blocks').lean(),
  ]);
  const docs: Docs = { q: byId(q), p: byId(p), g: byId(g), lq: byId(lq), pr: byId(pr), cb: byId(cb) };
  const out = new Map<string, QuestionContext>();
  for (const [key, parsedKey] of parsed) {
    const ctx = contextFor(parsedKey, docs);
    if (ctx) out.set(key, ctx);
  }
  return out;
}
```

```ts
// src/modules/Evidence/diagnosis-types.ts
//
// A topic's usable codes, and turning one reply item into a type id
// (spec §6.4): a listed code; else the proposal, saved as `proposed` and used
// at once; a check-mark flag → GEN.possible-marking-error; anything else →
// GEN.incomplete-answer. A proposal that lands on a merged code follows it.
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { ACTIVE_TYPE_STATUSES, MisconceptionType } from './model-taxonomy.js';
import { ensureGenericTypes, genericCode, genericTypeId } from './taxonomy-generic.js';
import type { DiagnosisReplyItem, TopicBlock } from './diagnosis-prompt.js';
import type { Oid } from './types.js';

export interface TopicTaxonomy {
  topic: { _id: Oid; code: string; schoolId: Oid | null; subjectId: Oid | null };
  byCode: Map<string, Oid>;
  block: TopicBlock;
}

const SLUG = /^[a-z0-9-]{2,40}$/;
const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

async function titleOf(id: unknown): Promise<string> {
  if (!id) return '';
  return (await CurriculumNode.findOne({ _id: id, isDeleted: false }).select('title').lean())?.title ?? '';
}

export async function topicTaxonomy(topicNodeId: Oid): Promise<TopicTaxonomy | null> {
  const topic = await CurriculumNode.findOne({ _id: topicNodeId, isDeleted: false }).select('code title schoolId subjectId gradeId').lean();
  if (!topic) return null;
  const [types, generic, subject, grade, subtopics] = await Promise.all([
    MisconceptionType.find({ topicNodeId, status: { $in: ACTIVE_TYPE_STATUSES } }).select('code label description').sort({ createdAt: 1 }).lean(),
    ensureGenericTypes(), titleOf(topic.subjectId), titleOf(topic.gradeId),
    CurriculumNode.find({ parentId: topicNodeId, type: 'subtopic', isDeleted: false }).select('title').lean(),
  ]);
  const byCode = new Map<string, Oid>([
    ...[...generic.entries()].map(([slug, id]) => [genericCode(slug), id] as [string, Oid]),
    ...types.map((t) => [t.code, t._id as Oid] as [string, Oid]),
  ]);
  return {
    topic: { _id: topic._id as Oid, code: topic.code, schoolId: (topic.schoolId as Oid | null) ?? null, subjectId: (topic.subjectId as Oid | null) ?? null },
    byCode,
    block: {
      subject, grade, topic: topic.title, subtopics: subtopics.map((s) => s.title),
      types: types.map((t) => ({ code: t.code, label: t.label, description: t.description })),
    },
  };
}

export async function typeForItem(tax: TopicTaxonomy, item: DiagnosisReplyItem): Promise<Oid> {
  if (item.checkMark) return genericTypeId('possible-marking-error');
  const listed = item.code ? tax.byCode.get(item.code) : undefined;
  if (listed) return listed;
  if (!item.proposed) return genericTypeId('incomplete-answer');
  const p = item.proposed;
  const slug = SLUG.test(p.slug) ? p.slug : slugify(p.slug || p.label);
  const code = `${tax.topic.code}.${slug}`;
  const doc = await MisconceptionType.findOneAndUpdate(
    { code },
    { $setOnInsert: {
      code, kind: p.kind, subjectNodeId: tax.topic.subjectId, topicNodeId: tax.topic._id, schoolId: tax.topic.schoolId,
      label: p.label, learnerLabel: p.learnerLabel, description: p.description, status: 'proposed', origin: 'ai_proposed', learnerVisible: true,
    } },
    { upsert: true, new: true },
  ).lean();
  if (doc!.status === 'merged' && doc!.mergedInto) return doc!.mergedInto as Oid;
  if (doc!.status === 'retired') return genericTypeId('incomplete-answer');
  tax.byCode.set(code, doc!._id as Oid);
  return doc!._id as Oid;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/diagnosis-prompt.test.ts && npx tsc --noEmit`
Expected: PASS (6 tests); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence
LANE_SWEEP_OK=1 git commit -m "feat(evidence): the diagnosis prompt, question context per key, and reply items to misconception types" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 15: the diagnosis pipeline — submit, collect, the jobs and `npm run evidence:diagnose`

**Files:**
- Create: `src/modules/Evidence/pipeline-collect.ts`, `src/modules/Evidence/pipeline-submit.ts`
- Create: `src/scripts/evidence-diagnose.ts`
- Modify: `src/jobs/evidence.job.ts` (submit every 10 min, collect every 2 min), `package.json` (`"evidence:diagnose": "tsx src/scripts/evidence-diagnose.ts"`)
- Test: `src/modules/Evidence/__tests__/pipeline.test.ts`

**Interfaces:**
- Consumes: Tasks 10–14 (`diagnosisPool`, `splitByPool`, `markSkippedBudget`, `sendDirect`, `submitBatch`, `collectBatch`, `parseReply`, `openRequest`, `closeRequest`, `customIdFor`, `logAIUsage`, `sourceTeacherId`, `ensureTopicTypes`, `hasActiveTypes`, `topicTaxonomy`, `typeForItem`, `questionContexts`, `DIAGNOSIS_SYSTEM`, `diagnosisUserPrompt`, `diagnosisMaxTokens`, `DiagnosisReplySchema`, `MAX_ITEMS_PER_REQUEST`); `syncMarkingEvidence`, fixture (Task 6).
- Produces: `MAX_DIAGNOSIS_ATTEMPTS = 3`; `EXPIRE_AFTER_MS = 30 h`; `groupBy<T>(items, keyOf): Map<string, T[]>`; `bumpAttempts(schoolId, cacheKeys): Promise<void>`; `applyReply(requestId: Oid, reply: EvidenceReply): Promise<number>` (rows' keys made ready); `collectDiagnoses(now?): Promise<{ applied: number; waiting: number }>`; `SUBMIT_LIMIT = 2000`; `interface SubmitReport { candidates; cacheHits; joined; skippedBudget; seeded; requests; keys }`; `interface SubmitOptions { schoolId?: string; limit?: number; now?: Date; mode?: TransportMode; dryRun?: boolean }`; `submitDiagnoses(options?): Promise<SubmitReport>`; `EVIDENCE_JOBS.diagnosisSubmit = 'diagnosis-submit'`, `EVIDENCE_JOBS.diagnosisCollect = 'diagnosis-collect'`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/pipeline.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

const t = vi.hoisted(() => ({ direct: vi.fn(), submitBatch: vi.fn(), collectBatch: vi.fn() }));
vi.mock('../../../config/env.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../config/env.js')>();
  return { config: { ...real.config, evidence: { mode: 'fixture', enabled: true } } };
});
vi.mock('../ai-transport.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../ai-transport.js')>();
  return { ...real, sendDirect: t.direct, submitBatch: t.submitBatch, collectBatch: t.collectBatch };
});

import { AnswerEvidence } from '../model.js';
import { DiagnosisCache, DiagnosisRequest, MisconceptionType } from '../model-taxonomy.js';
import { AIUsageLog } from '../../AITools/model.js';
import { School } from '../../School/model.js';
import { fixtureReply } from '../ai-fixture.js';
import type { EvidencePrompt } from '../ai-transport.js';
import { syncMarkingEvidence } from '../writers/test.js';
import { writeEvidenceRows } from '../write-rows.js';
import { submitDiagnoses } from '../pipeline-submit.js';
import { collectDiagnoses } from '../pipeline-collect.js';
import { customIdFor } from '../ledger.js';
import { resetGenericTypeCache } from '../taxonomy-generic.js';
import { DIAGNOSIS_POOL_FREE } from '../diagnosis-pool.js';
import { cleanUpEvidenceFixtures, seedMarkedPaper, seedMarking, type MarkedPaperFixture } from '../../../test-utils/evidence-fixtures.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
let fx: MarkedPaperFixture;
const SAME_WRONG = [{ n: '1.1', answer: 'y = 3x', awarded: 1, max: 2 }];

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  fx = await seedMarkedPaper();
});
beforeEach(() => {
  resetGenericTypeCache();
  t.direct.mockReset().mockImplementation(async (p: EvidencePrompt) => fixtureReply(p));
  t.submitBatch.mockReset();
  t.collectBatch.mockReset();
});
afterAll(async () => {
  await Promise.all([
    DiagnosisRequest.deleteMany({}), DiagnosisCache.deleteMany({ schoolId: fx.schoolId }), AIUsageLog.deleteMany({ schoolId: fx.schoolId }),
    MisconceptionType.deleteMany({ topicNodeId: fx.topicId }), School.deleteMany({ name: /^E pipeline/ }),
  ]);
  await cleanUpEvidenceFixtures(fx.schoolId);
  await mongoose.disconnect();
});

const rowsOn = (n: string) => AnswerEvidence.find({ schoolId: fx.schoolId, 'source.itemKey': n, isDeleted: false }).lean();

describe('submitDiagnoses (direct and fixture)', () => {
  it('two learners with the same wrong answer buy one diagnosis; the topic is seeded first', async () => {
    for (const s of fx.students.slice(0, 2)) await syncMarkingEvidence(await seedMarking(fx, s, SAME_WRONG));
    const report = await submitDiagnoses({ schoolId: String(fx.schoolId), mode: 'fixture' });
    expect(report).toMatchObject({ candidates: 2, requests: 1, keys: 1, seeded: 1 });
    const rows = await rowsOn('1.1');
    expect(rows.map((r) => r.diagnosis.state)).toEqual(['ready', 'ready']);
    expect(String(rows[0].diagnosis.typeId)).toBe(String(rows[1].diagnosis.typeId));
    expect(await DiagnosisCache.countDocuments({ schoolId: fx.schoolId })).toBe(1);
    expect(await DiagnosisRequest.countDocuments({ kind: 'seed', topicNodeId: fx.topicId })).toBe(1);
  });

  it('a later identical answer is a cache hit, with no new request', async () => {
    await syncMarkingEvidence(await seedMarking(fx, fx.students[2], SAME_WRONG));
    const before = await DiagnosisRequest.countDocuments({ kind: 'diagnosis' });
    const report = await submitDiagnoses({ schoolId: String(fx.schoolId), mode: 'fixture' });
    expect(report).toMatchObject({ cacheHits: 1, requests: 0 });
    expect(await DiagnosisRequest.countDocuments({ kind: 'diagnosis' })).toBe(before);
  });

  it('packs at most 10 answers of one topic per request, and the prompt carries no ids', async () => {
    const items = Array.from({ length: 23 }, (_, i) => ({
      itemKey: `x${i}`, position: i, questionKey: `q:${String(fx.bankQuestionId)}`, questionId: fx.bankQuestionId, nodeId: fx.topicId,
      topicFrom: 'question' as const, cognitiveLevel: 'routine' as const, marksAwarded: 0, marksAvailable: 2, answerText: `wrong ${i}`,
      answerKind: 'typed' as const, markedBy: 'ai' as const, markerNote: '',
    }));
    await writeEvidenceRows({ schoolId: fx.schoolId, studentId: fx.students[0], userId: null, classId: fx.classId, subjectId: null, gradeId: null,
      source: { type: 'test', channel: 'online', recordId: oid(), parentId: fx.paperId, attemptNumber: 1 }, markedAt: new Date(), status: 'provisional',
      finalAt: null, totalOverridden: false }, items);
    const report = await submitDiagnoses({ schoolId: String(fx.schoolId), mode: 'fixture' });
    expect(report).toMatchObject({ keys: 23, requests: 3 });
    const sizes = (await DiagnosisRequest.find({ kind: 'diagnosis', schoolId: fx.schoolId }).sort({ createdAt: -1 }).limit(3).lean()).map((r) => r.items.length).sort();
    expect(sizes).toEqual([10, 10, 3]);
    for (const [prompt] of t.direct.mock.calls as Array<[EvidencePrompt]>) {
      if (prompt.kind === 'diagnosis') expect(prompt.user).not.toMatch(/[0-9a-f]{24}/);
    }
  });

  it('writes tokens to AIUsageLog against the marking teacher', async () => {
    t.direct.mockImplementation(async (p: EvidencePrompt) => ({ ...fixtureReply(p), usage: { input: 1900, output: 150 } }));
    await syncMarkingEvidence(await seedMarking(fx, oid(), [{ n: '1.1', answer: 'x = 3y', awarded: 0, max: 2 }]));
    await submitDiagnoses({ schoolId: String(fx.schoolId), mode: 'direct' });
    expect(await AIUsageLog.findOne({ schoolId: fx.schoolId, type: 'evidence_diagnosis' }).lean()).toMatchObject({ tokensUsed: { input: 1900, output: 150 } });
    expect(String((await AIUsageLog.findOne({ schoolId: fx.schoolId, type: 'evidence_diagnosis' }).lean())!.teacherId)).toBe(String(fx.teacherId));
  });

  it('over the pool, the rest are skipped, not failed', async () => {
    const pooled = await seedMarkedPaper();
    await School.collection.insertOne({ _id: pooled.schoolId, name: 'E pipeline pool', plan: 'standalone', isDeleted: false });
    await DiagnosisRequest.collection.insertOne({ kind: 'diagnosis', schoolId: pooled.schoolId, mode: 'batch', state: 'done', model: 'm', createdAt: new Date(),
      items: Array.from({ length: DIAGNOSIS_POOL_FREE - 1 }, (_, i) => ({ ref: `a${i}`, cacheKey: `k${i}` })) });
    await syncMarkingEvidence(await seedMarking(pooled, pooled.students[0], [{ n: '1.1', answer: 'one', awarded: 0, max: 2 }, { n: '1.2', answer: 'two', awarded: 0, max: 3 }]));
    const report = await submitDiagnoses({ schoolId: String(pooled.schoolId), mode: 'fixture' });
    expect(report).toMatchObject({ keys: 1, skippedBudget: 1 });
    const states = (await AnswerEvidence.find({ schoolId: pooled.schoolId }).lean()).map((r) => r.diagnosis.state).sort();
    expect(states).toEqual(['ready', 'skipped_budget']);
    await cleanUpEvidenceFixtures(pooled.schoolId);
  });
});

describe('batches', () => {
  it('queues the rows; a row written later joins the request already in flight', async () => {
    t.submitBatch.mockResolvedValue('msgbatch_1');
    await syncMarkingEvidence(await seedMarking(fx, oid(), [{ n: '1.1', answer: 'batch answer', awarded: 0, max: 2 }]));
    await submitDiagnoses({ schoolId: String(fx.schoolId), mode: 'batch' });
    const request = await DiagnosisRequest.findOne({ batchId: 'msgbatch_1' }).lean();
    expect(request).toMatchObject({ state: 'submitted', mode: 'batch' });
    await syncMarkingEvidence(await seedMarking(fx, oid(), [{ n: '1.1', answer: 'Batch answer.', awarded: 0, max: 2 }]));
    const report = await submitDiagnoses({ schoolId: String(fx.schoolId), mode: 'batch' });
    expect(report.joined).toBe(1);
    expect(t.submitBatch).toHaveBeenCalledTimes(1);
    expect((await AnswerEvidence.find({ 'diagnosis.requestId': request!._id }).lean()).map((r) => r.diagnosis.state)).toEqual(['queued', 'queued']);
  });

  it('collects out of order and survives bad items', async () => {
    const make = async (label: string) => {
      const cacheKey = `E-PIPE-${label}-${String(oid())}`;
      await AnswerEvidence.create({ schoolId: fx.schoolId, studentId: oid(), topicNodeId: fx.topicId, questionKey: 'q:x', topicFrom: 'question', marksAwarded: 0,
        marksAvailable: 1, markedBy: 'ai', markedAt: new Date(), status: 'final', answer: { kind: 'typed', text: label, truncated: false, hash: label },
        source: { type: 'test', recordId: oid(), parentId: oid(), itemKey: '1' }, diagnosis: { state: 'queued', cacheKey } });
      const r = await DiagnosisRequest.create({ kind: 'diagnosis', schoolId: fx.schoolId, topicNodeId: fx.topicId, mode: 'batch', batchId: 'msgbatch_2',
        state: 'submitted', model: 'm', items: [{ ref: 'a1', cacheKey }] });
      return { cacheKey, id: r._id as Oid };
    };
    const [good, errored, expired, garbled] = [await make('good'), await make('errored'), await make('expired'), await make('garbled')];
    const code = (await MisconceptionType.findOne({ topicNodeId: fx.topicId, status: 'seeded' }).lean())!.code;
    t.collectBatch.mockResolvedValue({ ended: true, replies: [
      { customId: customIdFor(garbled.id), ok: true, text: 'not json', usage: { input: 10, output: 5 }, error: null, retryable: false },
      { customId: customIdFor(expired.id), ok: false, text: '', usage: { input: 0, output: 0 }, error: 'expired', retryable: true },
      { customId: customIdFor(errored.id), ok: false, text: '', usage: { input: 0, output: 0 }, error: 'api_error', retryable: true },
      { customId: customIdFor(good.id), ok: true, text: JSON.stringify({ items: [{ ref: 'a1', code, explanation: 'Check the sign.', confidence: 0.9 }] }), usage: { input: 10, output: 5 }, error: null, retryable: false },
    ] });
    await expect(collectDiagnoses()).resolves.toMatchObject({ applied: 1 });
    const state = async (k: string) => (await AnswerEvidence.findOne({ 'diagnosis.cacheKey': k }).lean())!.diagnosis;
    expect(await state(good.cacheKey)).toMatchObject({ state: 'ready', explanation: 'Check the sign.' });
    for (const k of [errored.cacheKey, expired.cacheKey, garbled.cacheKey]) expect(await state(k)).toMatchObject({ state: 'pending', attempts: 1 });
    expect(await DiagnosisRequest.findById(garbled.id).lean()).toMatchObject({ state: 'done', error: 'invalid_reply' });
    expect(await DiagnosisRequest.findById(errored.id).lean()).toMatchObject({ state: 'failed' });
  });

  it('the third failure is final, and a batch still running after 30 hours counts as expired', async () => {
    const cacheKey = `E-PIPE-late-${String(oid())}`;
    await AnswerEvidence.create({ schoolId: fx.schoolId, studentId: oid(), topicNodeId: fx.topicId, questionKey: 'q:x', topicFrom: 'question', marksAwarded: 0,
      marksAvailable: 1, markedBy: 'ai', markedAt: new Date(), status: 'final', answer: { kind: 'typed', text: 'late', truncated: false, hash: 'late' },
      source: { type: 'test', recordId: oid(), parentId: oid(), itemKey: '1' }, diagnosis: { state: 'queued', cacheKey, attempts: 2 } });
    await DiagnosisRequest.collection.insertOne({ kind: 'diagnosis', schoolId: fx.schoolId, topicNodeId: fx.topicId, mode: 'batch', batchId: 'msgbatch_3',
      state: 'submitted', model: 'm', usage: { input: 0, output: 0 }, items: [{ ref: 'a1', cacheKey }], createdAt: new Date(Date.now() - 31 * 3600_000) });
    t.collectBatch.mockResolvedValue({ ended: false, replies: [] });
    await collectDiagnoses();
    expect((await AnswerEvidence.findOne({ 'diagnosis.cacheKey': cacheKey }).lean())!.diagnosis).toMatchObject({ state: 'failed', attempts: 3 });
  });
});
```


- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/pipeline.test.ts`
Expected: FAIL — `Cannot find module '../pipeline-submit.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/pipeline-collect.ts
//
// Every 2 minutes (spec §6.5): read ended batches, match results by
// custom_id, validate each item, write the cache, make every row with that
// cache key ready. Bad or missing items go back to pending; the third
// failure is final. Never throws for one bad item.
import { logger } from '../../common/logger.js';
import { AnswerEvidence } from './model.js';
import { DiagnosisCache, DiagnosisRequest, MisconceptionType } from './model-taxonomy.js';
import { collectBatch, parseReply, type EvidenceReply } from './ai-transport.js';
import { DiagnosisReplySchema } from './diagnosis-prompt.js';
import { topicTaxonomy, typeForItem } from './diagnosis-types.js';
import { closeRequest, customIdFor, logAIUsage, sourceTeacherId } from './ledger.js';
import type { Oid } from './types.js';

export const MAX_DIAGNOSIS_ATTEMPTS = 3;
export const EXPIRE_AFTER_MS = 30 * 3600_000;

export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) out.set(keyOf(item), [...(out.get(keyOf(item)) ?? []), item]);
  return out;
}

export async function bumpAttempts(schoolId: Oid | null, cacheKeys: readonly string[]): Promise<void> {
  if (!schoolId || cacheKeys.length === 0) return;
  const open = { schoolId, 'diagnosis.cacheKey': { $in: [...cacheKeys] }, 'diagnosis.state': { $in: ['queued', 'pending'] }, isDeleted: false };
  await AnswerEvidence.updateMany(open, { $inc: { 'diagnosis.attempts': 1 }, $set: { 'diagnosis.state': 'pending', 'diagnosis.requestId': null } });
  await AnswerEvidence.updateMany({ ...open, 'diagnosis.attempts': { $gte: MAX_DIAGNOSIS_ATTEMPTS } }, { $set: { 'diagnosis.state': 'failed' } });
}

export async function applyReply(requestId: Oid, reply: EvidenceReply): Promise<number> {
  const request = await DiagnosisRequest.findById(requestId).lean();
  if (!request || request.state !== 'submitted') return 0;
  const parsed = reply.ok ? parseReply(reply.text, DiagnosisReplySchema) : null;
  const tax = parsed && request.topicNodeId ? await topicTaxonomy(request.topicNodeId as Oid) : null;
  const done = new Set<string>();
  for (const item of tax && parsed ? parsed.items : []) {
    const entry = request.items.find((i) => i.ref === item.ref);
    if (!entry || done.has(entry.cacheKey)) continue;
    const typeId = await typeForItem(tax!, item);
    await DiagnosisCache.updateOne(
      { cacheKey: entry.cacheKey },
      { $setOnInsert: { schoolId: request.schoolId, cacheKey: entry.cacheKey, typeId, explanation: item.explanation, confidence: item.confidence, requestId } },
      { upsert: true },
    );
    const res = await AnswerEvidence.updateMany(
      { schoolId: request.schoolId, 'diagnosis.cacheKey': entry.cacheKey, 'diagnosis.state': { $in: ['queued', 'pending'] }, isDeleted: false },
      { $set: {
        'diagnosis.state': 'ready', 'diagnosis.typeId': typeId, 'diagnosis.explanation': item.explanation,
        'diagnosis.confidence': item.confidence, 'diagnosis.diagnosedAt': new Date(), 'diagnosis.requestId': requestId,
      } },
    );
    await MisconceptionType.updateOne({ _id: typeId }, { $inc: { useCount: res.modifiedCount }, $set: { lastUsedAt: new Date() } });
    done.add(entry.cacheKey);
  }
  await bumpAttempts(request.schoolId as Oid | null, request.items.map((i) => i.cacheKey).filter((k) => !done.has(k)));
  await closeRequest(requestId, reply, reply.ok && !parsed ? 'invalid_reply' : undefined);
  if (request.schoolId && reply.usage.input + reply.usage.output > 0) {
    const row = await AnswerEvidence.findOne({ schoolId: request.schoolId, 'diagnosis.cacheKey': { $in: request.items.map((i) => i.cacheKey) } })
      .select('source').lean();
    const teacherId = row ? await sourceTeacherId(row.source, request.schoolId as Oid) : null;
    await logAIUsage(request.schoolId as Oid, teacherId, 'evidence_diagnosis', reply.usage);
  }
  return done.size;
}

export async function collectDiagnoses(now: Date = new Date()): Promise<{ applied: number; waiting: number }> {
  const open = await DiagnosisRequest.find({ kind: 'diagnosis', state: 'submitted', mode: 'batch', batchId: { $ne: null } })
    .select('batchId createdAt').lean();
  let applied = 0;
  let waiting = 0;
  for (const [batchId, requests] of groupBy(open, (r) => String(r.batchId))) {
    let result: { ended: boolean; replies: EvidenceReply[] };
    try {
      result = await collectBatch(batchId);
    } catch (err: unknown) {
      logger.warn({ err, batchId }, '[Evidence] could not read a diagnosis batch; will try again');
      waiting += requests.length;
      continue;
    }
    const replies = new Map(result.replies.map((r) => [r.customId, r]));
    for (const r of requests) {
      const expired = !result.ended && now.getTime() - r.createdAt.getTime() > EXPIRE_AFTER_MS;
      if (!result.ended && !expired) {
        waiting += 1;
        continue;
      }
      const customId = customIdFor(r._id as Oid);
      const reply = replies.get(customId) ?? {
        customId, ok: false, text: '', usage: { input: 0, output: 0 }, error: expired ? 'expired' : 'missing', retryable: true,
      };
      applied += await applyReply(r._id as Oid, reply);
    }
  }
  return { applied, waiting };
}
```

```ts
// src/modules/Evidence/pipeline-submit.ts
//
// Every 10 minutes (spec §6.1, §6.5): pending rows → cache hits → rows that
// join a request already in flight → the school's pool → requests of ≤ 10
// unique answers of one school and topic → one Message Batch (or direct).
import mongoose from 'mongoose';
import { logger } from '../../common/logger.js';
import { AnswerEvidence } from './model.js';
import { DiagnosisCache, DiagnosisRequest } from './model-taxonomy.js';
import { diagnosisPool, markSkippedBudget, poolRemaining, splitByPool } from './diagnosis-pool.js';
import { ensureTopicTypes, hasActiveTypes } from './seed.js';
import { topicTaxonomy } from './diagnosis-types.js';
import { questionContexts } from './question-context.js';
import { DIAGNOSIS_SYSTEM, MAX_ITEMS_PER_REQUEST, diagnosisMaxTokens, diagnosisUserPrompt } from './diagnosis-prompt.js';
import { sendDirect, submitBatch, transportMode, type EvidencePrompt, type TransportMode } from './ai-transport.js';
import { customIdFor, openRequest, sourceTeacherId } from './ledger.js';
import { applyReply, groupBy } from './pipeline-collect.js';
import type { Oid, SourceType } from './types.js';

export const SUBMIT_LIMIT = 2000;

interface Candidate {
  _id: Oid; schoolId: Oid; topicNodeId: Oid | null; questionKey: string; marksAwarded: number; marksAvailable: number;
  markerNote: string; answer: { text: string }; diagnosis: { cacheKey: string }; source: { type: SourceType; recordId: Oid; parentId: Oid };
}
interface Outgoing { requestId: Oid; prompt: EvidencePrompt }

export interface SubmitReport { candidates: number; cacheHits: number; joined: number; skippedBudget: number; seeded: number; requests: number; keys: number }
export interface SubmitOptions { schoolId?: string; limit?: number; now?: Date; mode?: TransportMode; dryRun?: boolean }

const pendingOf = (schoolId: Oid, keys: string | { $in: string[] }) =>
  ({ schoolId, 'diagnosis.cacheKey': keys, 'diagnosis.state': 'pending', isDeleted: false });

async function cacheHits(byKey: Map<string, Candidate>, report: SubmitReport, dryRun: boolean): Promise<string[]> {
  const cached = await DiagnosisCache.find({ cacheKey: { $in: [...byKey.keys()] } }).lean();
  for (const c of cached) {
    report.cacheHits += 1;
    if (dryRun) continue;
    await AnswerEvidence.updateMany(pendingOf(c.schoolId as Oid, c.cacheKey), { $set: {
      'diagnosis.state': 'ready', 'diagnosis.typeId': c.typeId, 'diagnosis.explanation': c.explanation,
      'diagnosis.confidence': c.confidence, 'diagnosis.diagnosedAt': new Date(),
    } });
  }
  const hit = new Set(cached.map((c) => c.cacheKey));
  return [...byKey.keys()].filter((k) => !hit.has(k));
}

async function joinInFlight(keys: string[], byKey: Map<string, Candidate>, report: SubmitReport, dryRun: boolean): Promise<string[]> {
  const open = await DiagnosisRequest.find({ kind: 'diagnosis', state: 'submitted', 'items.cacheKey': { $in: keys } }).select('items').lean();
  const inFlight = new Map<string, Oid>();
  for (const r of open) for (const i of r.items) if (keys.includes(i.cacheKey)) inFlight.set(i.cacheKey, r._id as Oid);
  for (const [key, requestId] of inFlight) {
    report.joined += 1;
    if (!dryRun) await AnswerEvidence.updateMany(pendingOf(byKey.get(key)!.schoolId, key), { $set: { 'diagnosis.state': 'queued', 'diagnosis.requestId': requestId } });
  }
  return keys.filter((k) => !inFlight.has(k));
}

async function buildRequests(schoolId: Oid, keys: string[], byKey: Map<string, Candidate>, mode: TransportMode, report: SubmitReport): Promise<Outgoing[]> {
  const first = byKey.get(keys[0])!;
  const topicNodeId = first.topicNodeId as Oid;
  const teacherId = await sourceTeacherId(first.source, schoolId);
  const hadTypes = await hasActiveTypes(topicNodeId);
  if (!(await ensureTopicTypes(topicNodeId, { schoolId, teacherId }))) return []; // stays pending; the next run tries again
  if (!hadTypes) report.seeded += 1;
  const tax = await topicTaxonomy(topicNodeId);
  if (!tax) return [];
  const contexts = await questionContexts(keys.map((k) => byKey.get(k)!.questionKey), schoolId);
  const out: Outgoing[] = [];
  for (let i = 0; i < keys.length; i += MAX_ITEMS_PER_REQUEST) {
    const chunk = keys.slice(i, i + MAX_ITEMS_PER_REQUEST);
    const items = chunk.map((cacheKey, j) => ({ ref: `a${j + 1}`, cacheKey }));
    const request = await openRequest({ kind: 'diagnosis', mode, schoolId, topicNodeId, items });
    await AnswerEvidence.updateMany(pendingOf(schoolId, { $in: chunk }), { $set: { 'diagnosis.state': 'queued', 'diagnosis.requestId': request._id } });
    const promptItems = items.map(({ ref, cacheKey }) => {
      const row = byKey.get(cacheKey)!;
      const ctx = contexts.get(row.questionKey);
      return {
        ref, stem: ctx?.stem ?? '', memo: ctx?.memo ?? '', guideline: ctx?.guideline ?? '',
        awarded: row.marksAwarded, available: row.marksAvailable, markerNote: row.markerNote, answer: row.answer.text,
      };
    });
    out.push({ requestId: request._id, prompt: {
      customId: customIdFor(request._id), kind: 'diagnosis', system: DIAGNOSIS_SYSTEM, user: diagnosisUserPrompt(tax.block, promptItems),
      maxTokens: diagnosisMaxTokens(items.length), hint: { refs: items.map((x) => x.ref), codes: tax.block.types.map((x) => x.code) },
    } });
  }
  return out;
}

async function send(outgoing: Outgoing[], mode: TransportMode): Promise<void> {
  if (mode !== 'batch') {
    for (const o of outgoing) await applyReply(o.requestId, await sendDirect(o.prompt, mode));
    return;
  }
  try {
    const batchId = await submitBatch(outgoing.map((o) => o.prompt));
    await DiagnosisRequest.updateMany({ _id: { $in: outgoing.map((o) => o.requestId) } }, { $set: { batchId } });
  } catch (err: unknown) {
    logger.warn({ err }, '[Evidence] submitting the diagnosis batch failed; the rows go back to pending');
    for (const o of outgoing) {
      await applyReply(o.requestId, { customId: o.prompt.customId, ok: false, text: '', usage: { input: 0, output: 0 }, error: 'submit_failed', retryable: true });
    }
  }
}

export async function submitDiagnoses(options: SubmitOptions = {}): Promise<SubmitReport> {
  const report: SubmitReport = { candidates: 0, cacheHits: 0, joined: 0, skippedBudget: 0, seeded: 0, requests: 0, keys: 0 };
  const mode = options.mode ?? transportMode();
  const dryRun = options.dryRun ?? false;
  const filter: Record<string, unknown> = { 'diagnosis.state': 'pending', isDeleted: false };
  if (options.schoolId) filter.schoolId = new mongoose.Types.ObjectId(options.schoolId);
  const rows = (await AnswerEvidence.find(filter).sort({ markedAt: 1 }).limit(options.limit ?? SUBMIT_LIMIT)
    .select('schoolId topicNodeId questionKey marksAwarded marksAvailable markerNote answer diagnosis.cacheKey source').lean()) as unknown as Candidate[];
  report.candidates = rows.length;
  const byKey = new Map<string, Candidate>();
  for (const r of rows) if (!byKey.has(r.diagnosis.cacheKey)) byKey.set(r.diagnosis.cacheKey, r);
  const misses = await joinInFlight(await cacheHits(byKey, report, dryRun), byKey, report, dryRun);

  const outgoing: Outgoing[] = [];
  for (const keys of groupBy(misses, (k) => String(byKey.get(k)!.schoolId)).values()) {
    const schoolId = byKey.get(keys[0])!.schoolId;
    const { take, skip } = splitByPool(keys, poolRemaining(await diagnosisPool(schoolId, options.now)));
    report.skippedBudget += skip.length;
    if (!dryRun) await markSkippedBudget(schoolId, skip);
    for (const topicKeys of groupBy(take, (k) => String(byKey.get(k)!.topicNodeId)).values()) {
      report.keys += topicKeys.length;
      report.requests += Math.ceil(topicKeys.length / MAX_ITEMS_PER_REQUEST);
      if (!dryRun) outgoing.push(...(await buildRequests(schoolId, topicKeys, byKey, mode, report)));
    }
  }
  if (!dryRun && outgoing.length > 0) await send(outgoing, mode);
  return report;
}
```

`src/jobs/evidence.job.ts` — extend:

```ts
export const EVIDENCE_JOBS = {
  reconcile: 'reconcile',
  diagnosisSubmit: 'diagnosis-submit',
  diagnosisCollect: 'diagnosis-collect',
} as const;
```

and add to the `switch` in `processEvidenceJob` (import `config` from `'../config/env.js'`):

```ts
    case EVIDENCE_JOBS.diagnosisSubmit: {
      if (!config.evidence.enabled) return { skipped: 'EVIDENCE_DIAGNOSIS_ENABLED=false' };
      const { submitDiagnoses } = await import('../modules/Evidence/pipeline-submit.js');
      return submitDiagnoses({ now });
    }
    case EVIDENCE_JOBS.diagnosisCollect: {
      if (!config.evidence.enabled) return { skipped: 'EVIDENCE_DIAGNOSIS_ENABLED=false' };
      const { collectDiagnoses } = await import('../modules/Evidence/pipeline-collect.js');
      return collectDiagnoses(now);
    }
```

and to `scheduleEvidenceJobs`:

```ts
  await evidenceQueue.add(EVIDENCE_JOBS.diagnosisSubmit, {}, { repeat: { pattern: '*/10 * * * *' } });
  await evidenceQueue.add(EVIDENCE_JOBS.diagnosisCollect, {}, { repeat: { pattern: '*/2 * * * *' } });
```

```ts
// src/scripts/evidence-diagnose.ts
/**
 * Diagnoses rows that lost marks (Phase E §5, §6).
 *
 *   npm run evidence:diagnose                                  # dry run: candidates, cache hits, pool skips, requests, estimated cost
 *   npm run evidence:diagnose -- --apply                       # submits the normal way (batch: the collect job gathers results)
 *   npm run evidence:diagnose -- --apply --direct              # plain Messages API, results now (dev, e2e)
 *   npm run evidence:diagnose -- --apply --retry-skipped-budget --school=<id> --limit=500
 *
 * EVIDENCE_DIAGNOSIS_MODE=fixture answers with canned replies (never in production).
 */
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { logger } from '../common/logger.js';
import { AnswerEvidence } from '../modules/Evidence/model.js';
import { transportMode } from '../modules/Evidence/ai-transport.js';
import { submitDiagnoses } from '../modules/Evidence/pipeline-submit.js';
import { parseEvidenceArgs } from './evidence-args.js';
import { estimateRand } from './evidence-cost.js';

const FIXED_INPUT_PER_REQUEST = 1750;
const INPUT_PER_ANSWER = 370;
const OUTPUT_PER_ANSWER = 75;

async function main(): Promise<void> {
  const args = parseEvidenceArgs(process.argv.slice(2));
  const configured = transportMode();
  const mode = configured === 'fixture' ? 'fixture' : args.direct ? 'direct' : configured;
  await mongoose.connect(config.mongodb.uri);
  try {
    const school = args.school ? { schoolId: new mongoose.Types.ObjectId(args.school) } : {};
    if (args.apply && args.retrySkippedBudget) {
      const res = await AnswerEvidence.updateMany({ ...school, 'diagnosis.state': 'skipped_budget', isDeleted: false },
        { $set: { 'diagnosis.state': 'pending', 'diagnosis.skippedReason': null } });
      logger.info(`${res.modifiedCount} rows skipped for budget are pending again.`);
    }
    const report = await submitDiagnoses({ schoolId: args.school, limit: args.limit, mode, dryRun: !args.apply });
    const rand = estimateRand(report.requests * FIXED_INPUT_PER_REQUEST + report.keys * INPUT_PER_ANSWER, report.keys * OUTPUT_PER_ANSWER, mode === 'batch');
    logger.info({ ...report, mode }, `${report.candidates} rows lost marks; ${report.cacheHits} cache hits, ${report.joined} joined a request in flight, `
      + `${report.skippedBudget} over a school's pool; ${report.keys} answers in ${report.requests} requests; estimated R${rand}.`);
    if (!args.apply) logger.info('Dry run: nothing sent. Run with --apply to diagnose.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'evidence:diagnose failed');
  process.exit(1);
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence src/jobs && npx tsc --noEmit`
Expected: PASS (the pipeline file's 8 tests and every earlier Evidence file); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/jobs src/scripts package.json
LANE_SWEEP_OK=1 git commit -m "feat(evidence): diagnose lost marks in Message Batches, cached per school, inside the pool; evidence:diagnose" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 16: the weekly taxonomy tidy and the super-admin review API

**Files:**
- Create: `src/modules/Evidence/taxonomy-admin.ts`, `src/modules/Evidence/tidy.ts`
- Create: `src/modules/Evidence/validation.ts`, `src/modules/Evidence/controller-taxonomy.ts`, `src/modules/Evidence/routes.ts`
- Modify: `src/app.ts:229` (mount `/api/evidence`), `src/jobs/evidence.job.ts` (`taxonomy-tidy`, Mondays 01:00 UTC)
- Test: `src/modules/Evidence/__tests__/taxonomy.test.ts`

**Interfaces:**
- Consumes: `sendDirect`, `parseReply`, `transportMode`, `openRequest`, `closeRequest`, `customIdFor` (Task 11); models (Task 4); `genericTypeId`.
- Produces: `AUTO_MERGE_CONFIDENCE = 0.9`; `tidyTaxonomy(): Promise<{ topics: number; merged: number; suggested: number }>`; `mergeType(fromId: Oid, intoId: Oid, reviewerId: Oid | null): Promise<void>`; `approveType(id, reviewerId)`; `renameType(id, patch: { label?: string; learnerLabel?: string; description?: string }, reviewerId)`; `retireType(id, replacementId: Oid | null, reviewerId)`; `interface TypeListItem { id: string; code: string; kind: TypeKind; status: TypeStatus; label: string; learnerLabel: string; description: string; useCount: number; createdAt: string; subject: string; topic: string; suggestedMerge: { id: string; label: string; confidence: number } | null }`; `listTypes(filter: { status?: TypeStatus; topicNodeId?: string; limit?: number }): Promise<TypeListItem[]>`; router `evidenceRoutes` mounted at `/api/evidence` (`authenticate`); endpoints `GET /evidence/taxonomy?status=&topicNodeId=`, `PATCH /evidence/taxonomy/:id`, `POST /evidence/taxonomy/:id/approve`, `POST /evidence/taxonomy/:id/merge` `{ intoId }`, `POST /evidence/taxonomy/:id/retire` `{ replacementId? }` — all `authorize('super_admin')`; 204 on actions; `EVIDENCE_JOBS.taxonomyTidy = 'taxonomy-tidy'`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/taxonomy.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';

const t = vi.hoisted(() => ({ direct: vi.fn() }));
vi.mock('../ai-transport.js', async (importOriginal) => {
  const real = await importOriginal<typeof import('../ai-transport.js')>();
  return { ...real, sendDirect: t.direct, transportMode: () => 'direct' };
});

import app from '../../../app.js';
import { signTestToken } from '../../../test-utils/auth.js';
import { AnswerEvidence } from '../model.js';
import { DiagnosisCache, DiagnosisRequest, MisconceptionType } from '../model-taxonomy.js';
import { genericTypeId, resetGenericTypeCache } from '../taxonomy-generic.js';
import { tidyTaxonomy } from '../tidy.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
const topic = oid();
const schoolId = oid();
const admin = () => signTestToken({ id: oid(), role: 'super_admin', schoolId: oid(), isStandaloneTeacher: false, isSchoolPrincipal: false });
const teacher = () => signTestToken({ id: oid(), role: 'teacher', schoolId, isStandaloneTeacher: false, isSchoolPrincipal: false });
const type = (slug: string, status: string) => MisconceptionType.create({
  code: `E-TAX-${String(topic)}.${slug}`, kind: 'misconception', topicNodeId: topic, label: slug, learnerLabel: slug, description: slug, status,
  origin: status === 'proposed' ? 'ai_proposed' : 'ai_seed',
});
const rowWith = async (typeId: Oid) => {
  await AnswerEvidence.create({ schoolId, studentId: oid(), topicNodeId: topic, questionKey: 'q:x', topicFrom: 'question', marksAwarded: 0, marksAvailable: 1,
    markedBy: 'ai', markedAt: new Date(), status: 'final', answer: { kind: 'typed', text: 'x', truncated: false, hash: 'h' },
    source: { type: 'test', recordId: oid(), parentId: oid(), itemKey: '1' }, diagnosis: { state: 'ready', cacheKey: `c-${String(oid())}`, typeId } });
  await DiagnosisCache.create({ schoolId, cacheKey: `c-${String(oid())}`, typeId, explanation: 'e', confidence: 0.8 });
};

beforeAll(async () => { if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!); });
beforeEach(() => { resetGenericTypeCache(); t.direct.mockReset(); });
afterAll(async () => {
  await Promise.all([
    MisconceptionType.deleteMany({ code: /^E-TAX-/ }), AnswerEvidence.deleteMany({ schoolId }), DiagnosisCache.deleteMany({ schoolId }),
    DiagnosisRequest.deleteMany({ kind: 'tidy', topicNodeId: topic }),
  ]);
  await mongoose.disconnect();
});

describe('tidyTaxonomy', () => {
  it('merges a proposed duplicate at ≥ 0.9 and re-points rows and cache; anything less becomes a suggestion', async () => {
    const seeded = await type('sign-error', 'seeded');
    const dup = await type('lost-the-minus', 'proposed');
    const near = await type('negative-exponent', 'proposed');
    await rowWith(dup._id as Oid);
    t.direct.mockResolvedValue({ customId: 'x', ok: true, usage: { input: 10, output: 5 }, error: null, retryable: false, text: JSON.stringify({ pairs: [
      { from: dup.code, to: seeded.code, confidence: 0.95 }, { from: near.code, to: seeded.code, confidence: 0.6 },
    ] }) });
    expect(await tidyTaxonomy()).toMatchObject({ merged: 1, suggested: 1 });
    expect(await MisconceptionType.findById(dup._id).lean()).toMatchObject({ status: 'merged' });
    expect(await AnswerEvidence.countDocuments({ 'diagnosis.typeId': dup._id })).toBe(0);
    expect(await AnswerEvidence.countDocuments({ 'diagnosis.typeId': seeded._id })).toBe(1);
    expect(await DiagnosisCache.countDocuments({ typeId: seeded._id })).toBe(1);
    expect(String((await MisconceptionType.findById(near._id).lean())!.suggestedMergeInto)).toBe(String(seeded._id));
  });
});

describe('/api/evidence/taxonomy (super admin)', () => {
  it('a teacher is refused', async () => {
    await request(app).get('/api/evidence/taxonomy').set('Authorization', `Bearer ${teacher()}`).expect(403);
  });

  it('lists proposed types with the suggested merge, then approves, renames, merges and retires', async () => {
    const list = await request(app).get('/api/evidence/taxonomy?status=proposed').set('Authorization', `Bearer ${admin()}`).expect(200);
    const near = (list.body.data as Array<{ id: string; label: string; suggestedMerge: { label: string } | null }>).find((i) => i.label === 'negative-exponent');
    expect(near?.suggestedMerge?.label).toBe('sign-error');

    const extra = await type('powers-added', 'proposed');
    await request(app).post(`/api/evidence/taxonomy/${String(extra._id)}/approve`).set('Authorization', `Bearer ${admin()}`).expect(204);
    await request(app).patch(`/api/evidence/taxonomy/${String(extra._id)}`).set('Authorization', `Bearer ${admin()}`)
      .send({ label: 'Added the powers', learnerLabel: 'Added powers instead of multiplying' }).expect(204);
    expect(await MisconceptionType.findById(extra._id).lean()).toMatchObject({ status: 'approved', label: 'Added the powers' });

    await rowWith(extra._id as Oid);
    await request(app).post(`/api/evidence/taxonomy/${String(extra._id)}/retire`).set('Authorization', `Bearer ${admin()}`).send({}).expect(204);
    expect(await AnswerEvidence.countDocuments({ 'diagnosis.typeId': await genericTypeId('incomplete-answer'), schoolId })).toBe(1);

    await request(app).post(`/api/evidence/taxonomy/${near!.id}/merge`).set('Authorization', `Bearer ${admin()}`).send({ intoId: near!.id }).expect(400);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/taxonomy.test.ts`
Expected: FAIL — `Cannot find module '../tidy.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/taxonomy-admin.ts
//
// Review actions on the global taxonomy (spec §6.4, §8.3). The taxonomy holds
// no learner data and is shared by every school, so re-pointing rows and
// cache on a merge or retire deliberately crosses schools (the one place in
// Phase E a query is not scoped to a school).
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { AnswerEvidence } from './model.js';
import { ACTIVE_TYPE_STATUSES, DiagnosisCache, MisconceptionType, type TypeKind, type TypeStatus } from './model-taxonomy.js';
import { genericTypeId } from './taxonomy-generic.js';
import type { Oid } from './types.js';

async function activeType(id: Oid) {
  const doc = await MisconceptionType.findById(id).lean();
  if (!doc || !ACTIVE_TYPE_STATUSES.includes(doc.status)) throw new NotFoundError('Misconception type not found');
  return doc;
}

const reviewed = (reviewerId: Oid | null) => ({ reviewedBy: reviewerId, reviewedAt: reviewerId ? new Date() : null });

async function repoint(fromId: Oid, toId: Oid): Promise<void> {
  await AnswerEvidence.updateMany({ 'diagnosis.typeId': fromId }, { $set: { 'diagnosis.typeId': toId } });
  await DiagnosisCache.updateMany({ typeId: fromId }, { $set: { typeId: toId } });
}

export async function mergeType(fromId: Oid, intoId: Oid, reviewerId: Oid | null): Promise<void> {
  if (fromId.equals(intoId)) throw new BadRequestError('Choose a different type to merge into');
  const [from, into] = await Promise.all([activeType(fromId), activeType(intoId)]);
  if (from.kind === 'generic') throw new BadRequestError('General types stay as they are');
  if (into.kind !== 'generic' && String(into.topicNodeId) !== String(from.topicNodeId)) {
    throw new BadRequestError('Merge only into a type of the same topic, or a general one');
  }
  await repoint(fromId, intoId);
  await MisconceptionType.updateOne({ _id: fromId }, { $set: { status: 'merged', mergedInto: intoId, suggestedMergeInto: null, ...reviewed(reviewerId) } });
  await MisconceptionType.updateOne({ _id: intoId }, { $inc: { useCount: from.useCount } });
}

export async function approveType(id: Oid, reviewerId: Oid): Promise<void> {
  await activeType(id);
  await MisconceptionType.updateOne({ _id: id }, { $set: { status: 'approved', ...reviewed(reviewerId) } });
}

export async function renameType(id: Oid, patch: { label?: string; learnerLabel?: string; description?: string }, reviewerId: Oid): Promise<void> {
  await activeType(id);
  await MisconceptionType.updateOne({ _id: id }, { $set: { ...patch, ...reviewed(reviewerId) } });
}

export async function retireType(id: Oid, replacementId: Oid | null, reviewerId: Oid): Promise<void> {
  const doc = await activeType(id);
  if (doc.kind === 'generic') throw new BadRequestError('General types stay as they are');
  const replacement = replacementId ?? (await genericTypeId('incomplete-answer'));
  if (replacement.equals(id)) throw new BadRequestError('Choose a different type to replace it');
  await activeType(replacement);
  await repoint(id, replacement);
  await MisconceptionType.updateOne({ _id: id }, { $set: { status: 'retired', ...reviewed(reviewerId) } });
}

export interface TypeListItem {
  id: string; code: string; kind: TypeKind; status: TypeStatus; label: string; learnerLabel: string; description: string;
  useCount: number; createdAt: string; subject: string; topic: string;
  suggestedMerge: { id: string; label: string; confidence: number } | null;
}

export async function listTypes(filter: { status?: TypeStatus; topicNodeId?: string; limit?: number }): Promise<TypeListItem[]> {
  const query: Record<string, unknown> = { kind: { $ne: 'generic' } };
  if (filter.status) query.status = filter.status;
  if (filter.topicNodeId) query.topicNodeId = new mongoose.Types.ObjectId(filter.topicNodeId);
  const types = await MisconceptionType.find(query).sort({ createdAt: -1 }).limit(filter.limit ?? 200).lean();
  const nodeIds = [...new Set(types.flatMap((t) => [t.topicNodeId, t.subjectNodeId]).filter(Boolean).map(String))];
  const suggestionIds = types.map((t) => t.suggestedMergeInto).filter(Boolean);
  const [nodes, suggestions] = await Promise.all([
    CurriculumNode.find({ _id: { $in: nodeIds } }).select('title').lean(),
    MisconceptionType.find({ _id: { $in: suggestionIds } }).select('label').lean(),
  ]);
  const title = new Map(nodes.map((n) => [String(n._id), n.title]));
  const label = new Map(suggestions.map((s) => [String(s._id), s.label]));
  return types.map((t) => ({
    id: String(t._id), code: t.code, kind: t.kind, status: t.status, label: t.label, learnerLabel: t.learnerLabel, description: t.description,
    useCount: t.useCount, createdAt: t.createdAt.toISOString(), subject: title.get(String(t.subjectNodeId)) ?? '', topic: title.get(String(t.topicNodeId)) ?? '',
    suggestedMerge: t.suggestedMergeInto && label.has(String(t.suggestedMergeInto))
      ? { id: String(t.suggestedMergeInto), label: label.get(String(t.suggestedMergeInto))!, confidence: t.suggestedMergeConfidence ?? 0 }
      : null,
  }));
}
```

```ts
// src/modules/Evidence/tidy.ts
//
// Weekly (spec §6.4): for each topic with new proposals, one call lists the
// topic's types and returns duplicate pairs. A proposed → existing merge at
// ≥ 0.9 is applied; everything else becomes a suggestion for review.
// Platform cost: logged on DiagnosisRequest only (no school).
import { z } from 'zod/v4';
import { ACTIVE_TYPE_STATUSES, MisconceptionType } from './model-taxonomy.js';
import { parseReply, sendDirect, transportMode } from './ai-transport.js';
import { closeRequest, customIdFor, openRequest } from './ledger.js';
import { mergeType } from './taxonomy-admin.js';
import type { Oid } from './types.js';

export const AUTO_MERGE_CONFIDENCE = 0.9;

const TIDY_SYSTEM = [
  'You tidy a list of misconception types for one school topic.',
  'Find pairs that mean the same thing. "from" is the newer or narrower code, "to" the one to keep. Only pair codes from the list.',
  'Return JSON only: {"pairs":[{"from":"<code>","to":"<code>","confidence":0.0}]} (an empty list if there are none).',
].join('\n');

const TidyReplySchema = z.object({ pairs: z.array(z.object({ from: z.string(), to: z.string(), confidence: z.number().min(0).max(1) })) });

export async function tidyTaxonomy(): Promise<{ topics: number; merged: number; suggested: number }> {
  const topics = (await MisconceptionType.distinct('topicNodeId', { status: 'proposed', topicNodeId: { $ne: null } })) as Oid[];
  const mode = transportMode() === 'fixture' ? 'fixture' : 'direct';
  let merged = 0;
  let suggested = 0;
  for (const topicNodeId of topics) {
    const types = await MisconceptionType.find({ topicNodeId, status: { $in: ACTIVE_TYPE_STATUSES } }).select('code label description status').lean();
    if (types.length < 2) continue;
    const request = await openRequest({ kind: 'tidy', mode, schoolId: null, topicNodeId });
    const user = types.map((t) => `- ${t.code} [${t.status}]: ${t.label}. ${t.description}`).join('\n');
    const reply = await sendDirect({ customId: customIdFor(request._id), kind: 'tidy', system: TIDY_SYSTEM, user, maxTokens: 800, hint: {} }, mode);
    const parsed = reply.ok ? parseReply(reply.text, TidyReplySchema) : null;
    await closeRequest(request._id, reply, reply.ok && !parsed ? 'invalid_reply' : undefined);
    const byCode = new Map(types.map((t) => [t.code, t]));
    const gone = new Set<string>();
    for (const pair of parsed?.pairs ?? []) {
      const from = byCode.get(pair.from);
      const into = byCode.get(pair.to);
      if (!from || !into || from.code === into.code || gone.has(from.code) || gone.has(into.code)) continue;
      if (from.status === 'proposed' && into.status !== 'proposed' && pair.confidence >= AUTO_MERGE_CONFIDENCE) {
        await mergeType(from._id as Oid, into._id as Oid, null);
        gone.add(from.code);
        merged += 1;
      } else {
        await MisconceptionType.updateOne({ _id: from._id }, { $set: { suggestedMergeInto: into._id, suggestedMergeConfidence: pair.confidence } });
        suggested += 1;
      }
    }
  }
  return { topics: topics.length, merged, suggested };
}
```

```ts
// src/modules/Evidence/validation.ts
import { z } from 'zod/v4';
import { objectIdSchema } from '../../common/validation.js';
import { TYPE_STATUSES } from './model-taxonomy.js';

export const taxonomyListQuery = z.object({
  status: z.enum(TYPE_STATUSES).optional(),
  topicNodeId: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
export const idParams = z.object({ id: objectIdSchema });
export const renameTypeBody = z.object({
  label: z.string().trim().min(2).max(60).optional(),
  learnerLabel: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300).optional(),
}).strict().refine((b) => Object.keys(b).length > 0, { message: 'Change at least one field' });
export const mergeTypeBody = z.object({ intoId: objectIdSchema }).strict();
export const retireTypeBody = z.object({ replacementId: objectIdSchema.optional() }).strict();
```

```ts
// src/modules/Evidence/controller-taxonomy.ts
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { apiResponse } from '../../common/utils.js';
import { getUser } from '../../types/authenticated-request.js';
import { approveType, listTypes, mergeType, renameType, retireType } from './taxonomy-admin.js';
import type { TypeStatus } from './model-taxonomy.js';

const oid = (id: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(id);
const me = (req: Request): mongoose.Types.ObjectId => oid(getUser(req).id);

export const TaxonomyController = {
  async list(req: Request, res: Response): Promise<void> {
    const q = req.query as { status?: TypeStatus; topicNodeId?: string; limit?: number };
    res.json(apiResponse(true, await listTypes(q)));
  },
  async approve(req: Request, res: Response): Promise<void> {
    await approveType(oid(req.params.id as string), me(req));
    res.status(204).end();
  },
  async rename(req: Request, res: Response): Promise<void> {
    await renameType(oid(req.params.id as string), req.body as { label?: string; learnerLabel?: string; description?: string }, me(req));
    res.status(204).end();
  },
  async merge(req: Request, res: Response): Promise<void> {
    await mergeType(oid(req.params.id as string), oid((req.body as { intoId: string }).intoId), me(req));
    res.status(204).end();
  },
  async retire(req: Request, res: Response): Promise<void> {
    const { replacementId } = req.body as { replacementId?: string };
    await retireType(oid(req.params.id as string), replacementId ? oid(replacementId) : null, me(req));
    res.status(204).end();
  },
};
```

```ts
// src/modules/Evidence/routes.ts
//
// /api/evidence (Phase E §7). Mounted behind `authenticate`; every route names
// its roles. No capability keys (plan ruling P6).
import { Router } from 'express';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { TaxonomyController } from './controller-taxonomy.js';
import { idParams, mergeTypeBody, renameTypeBody, retireTypeBody, taxonomyListQuery } from './validation.js';

const router = Router();
const superAdmin = authorize('super_admin');

router.get('/taxonomy', superAdmin, validate({ query: taxonomyListQuery }), TaxonomyController.list);
router.patch('/taxonomy/:id', superAdmin, validate({ params: idParams, body: renameTypeBody }), TaxonomyController.rename);
router.post('/taxonomy/:id/approve', superAdmin, validate({ params: idParams }), TaxonomyController.approve);
router.post('/taxonomy/:id/merge', superAdmin, validate({ params: idParams, body: mergeTypeBody }), TaxonomyController.merge);
router.post('/taxonomy/:id/retire', superAdmin, validate({ params: idParams, body: retireTypeBody }), TaxonomyController.retire);

export default router;
```

`src/app.ts` — import `evidenceRoutes from './modules/Evidence/routes.js';` and after `app.use('/api/question-bank', authenticate, questionBankRoutes);`: `app.use('/api/evidence', authenticate, evidenceRoutes);`.

`src/jobs/evidence.job.ts` — add `taxonomyTidy: 'taxonomy-tidy'` to `EVIDENCE_JOBS`, the case:

```ts
    case EVIDENCE_JOBS.taxonomyTidy: {
      const { tidyTaxonomy } = await import('../modules/Evidence/tidy.js');
      return tidyTaxonomy();
    }
```

and the schedule `await evidenceQueue.add(EVIDENCE_JOBS.taxonomyTidy, {}, { repeat: { pattern: '0 1 * * 1' } });` (Mondays 03:00 SAST).

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence src/app.ts src/jobs
LANE_SWEEP_OK=1 git commit -m "feat(evidence): weekly taxonomy tidy and the super-admin review API (approve, rename, merge, retire)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Phase E-D — the APIs

### Task 17: "why marks were lost", dismiss/restore, and the class's top three

**Files:**
- Create: `src/modules/Evidence/access.ts`, `src/modules/Evidence/service-reasons.ts`, `src/modules/Evidence/service-class.ts`, `src/modules/Evidence/controller.ts`
- Modify: `src/modules/Evidence/validation.ts` (queries), `src/modules/Evidence/routes.ts` (four routes)
- Test: `src/modules/Evidence/__tests__/payoff-api.test.ts`

**Interfaces:**
- Consumes: `learnerClassIds` (L-A `src/common/class-roster.ts`); `homeworkAccessFilter` (`Homework/service-access.ts:42`); `resolveStudentForUser` (`AITools/service-student-ownership.ts`); `groupBy` (Task 15); fixtures `standaloneClassroom` (L-A) and `seedMarkedPaper`/`seedMarking` (Task 6).
- Produces: `STAFF_ROLES = ['teacher', 'school_admin', 'super_admin']`; `type Audience = 'teacher' | 'learner'`; `interface RecordAccess { schoolId: Oid; recordId: Oid; audience: Audience; source: 'test' | 'homework' }`; `recordAccess(user, source, recordId): Promise<RecordAccess>`; `parentAccess(user, parent: 'paper' | 'homework', parentId, classId): Promise<{ schoolId: Oid; parentId: Oid; classId: Oid }>`; `learnerAccess(user, studentId): Promise<{ schoolId: Oid; studentId: Oid }>`; `classAccess(user, classId): Promise<{ schoolId: Oid; classId: Oid }>`; `meAsLearner(user): Promise<{ schoolId: Oid; studentId: Oid }>` (all 404 "Not found" when refused); `LEARNER_MIN_CONFIDENCE = 0.6`; `type ReasonState = 'none' | 'working' | 'ready' | 'dismissed' | 'limit' | 'failed'`; `interface LostMarksReasonItem` (spec §7.1, with `state` using `limit` for the pool, ruling P5); `lostMarksReasons(access): Promise<{ items: LostMarksReasonItem[] }>`; `setDismissed(user, rowId, dismissed: boolean): Promise<void>`; `interface ClassMisconceptions` (spec §7.1); `classMisconceptions(a): Promise<ClassMisconceptions>`; `studentNames(schoolId, ids): Promise<Map<string, string>>`.
- API: `GET /api/evidence/reasons?source=test|homework&recordId=` (teacher, school_admin, super_admin, student) → `{ items }`; `POST /api/evidence/rows/:id/dismiss`, `POST /api/evidence/rows/:id/restore` (staff) → 204; `GET /api/evidence/class-misconceptions?parent=paper|homework&parentId=&classId=` (staff) → `ClassMisconceptions`.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/payoff-api.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../app.js';
import { signTestToken } from '../../../test-utils/auth.js';
import { cleanUpClassrooms, standaloneClassroom, type Classroom, type Learner } from '../../../test-utils/standalone-classroom.js';
import { cleanUpEvidenceFixtures, seedMarkedPaper, seedMarking, type MarkedPaperFixture } from '../../../test-utils/evidence-fixtures.js';
import { AnswerEvidence } from '../model.js';
import { MisconceptionType } from '../model-taxonomy.js';
import { PaperMarking } from '../../AITools/model-marking.js';
import { genericTypeId, resetGenericTypeCache } from '../taxonomy-generic.js';
import { syncMarkingEvidence } from '../writers/test.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
let room: Classroom;
let learners: Learner[];
let fx: MarkedPaperFixture;
const markings: Oid[] = [];
let typeA: Oid;
let typeB: Oid;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const reasons = (token: string, recordId: Oid) =>
  request(app).get(`/api/evidence/reasons?source=test&recordId=${String(recordId)}`).set(auth(token));
const row = (markingId: Oid, n: string) => AnswerEvidence.findOne({ 'source.recordId': markingId, 'source.itemKey': n });
const diagnose = (markingId: Oid, n: string, typeId: Oid, extra: Record<string, unknown> = {}) =>
  row(markingId, n).updateOne({ $set: { 'diagnosis.state': 'ready', 'diagnosis.typeId': typeId, 'diagnosis.explanation': 'Swap x and y, then solve for y.', 'diagnosis.confidence': 0.9, ...extra } });

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  room = await standaloneClassroom();
  learners = [await room.learner('Ayanda', room.maths.id), await room.learner('Bongi', room.maths.id), await room.learner('Carla', room.maths.id)];
  fx = await seedMarkedPaper({ schoolId: room.schoolId, teacherId: room.teacherId, classId: room.maths.id, students: learners.map((l) => l.studentId) });
  const answers = [
    { n: '1.1', answer: 'y = 3x', awarded: 1, max: 2 },
    { n: '1.2', answer: 'Yes', awarded: 0, max: 3 },
    { n: '2.1', answer: '', awarded: 0, max: 3 },
  ];
  for (const l of learners) {
    const id = await seedMarking(fx, l.studentId, answers);
    markings.push(id);
    await syncMarkingEvidence(id);
  }
  typeA = (await MisconceptionType.create({ code: `E-API-${String(oid())}.swap-only`, kind: 'procedural', topicNodeId: fx.topicId, label: 'Swapped but did not solve', learnerLabel: 'Stopped after swapping', description: 'd', status: 'seeded', origin: 'ai_seed' }))._id as Oid;
  typeB = (await MisconceptionType.create({ code: `E-API-${String(oid())}.one-to-one`, kind: 'misconception', topicNodeId: fx.topicId, label: 'Thinks every inverse is a function', learnerLabel: 'Inverse is not always a function', description: 'd', status: 'seeded', origin: 'ai_seed' }))._id as Oid;
  await diagnose(markings[0], '1.1', typeA);
  await diagnose(markings[1], '1.1', typeA);
  await diagnose(markings[2], '1.1', typeB);
  await diagnose(markings[0], '1.2', await genericTypeId('careless-arithmetic'), { 'diagnosis.confidence': 0.4 });
  await diagnose(markings[1], '1.2', await genericTypeId('possible-marking-error'));
  await row(markings[2], '1.2').updateOne({ $set: { 'diagnosis.state': 'skipped_budget' } });
});
beforeEach(() => resetGenericTypeCache());
afterAll(async () => {
  await MisconceptionType.deleteMany({ code: /^E-API-/ });
  await cleanUpEvidenceFixtures(room.schoolId);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

describe('GET /api/evidence/reasons', () => {
  it('the teacher sees every row of a script before issue, with teacher labels and states', async () => {
    const res = await reasons(room.teacherToken, markings[2]).expect(200);
    const byKey = new Map((res.body.data.items as Array<{ itemKey: string; state: string; reason: { label: string } | null }>).map((i) => [i.itemKey, i]));
    expect(byKey.get('1.1')).toMatchObject({ state: 'ready', reason: { label: 'Thinks every inverse is a function' } });
    expect(byKey.get('1.2')).toMatchObject({ state: 'limit', reason: null });
    expect(byKey.get('2.1')).toMatchObject({ state: 'ready', reason: { label: 'Not answered' } });
  });

  it('a learner sees nothing before issue, then only safe reasons of their own final rows', async () => {
    await reasons(learners[0].token, markings[0]).expect(404);
    await PaperMarking.updateOne({ _id: markings[0] }, { $set: { issuedToStudent: true, issuedAt: new Date(), status: 'published' } });
    await syncMarkingEvidence(markings[0]);
    const res = await reasons(learners[0].token, markings[0]).expect(200);
    const items = res.body.data.items as Array<{ itemKey: string; state: string; reason: Record<string, unknown> | null }>;
    expect(items.find((i) => i.itemKey === '1.1')).toMatchObject({ state: 'ready', reason: { label: 'Stopped after swapping', checkMark: false, lowConfidence: false } });
    expect(items.find((i) => i.itemKey === '1.2')).toMatchObject({ state: 'none', reason: null }); // low confidence
    expect(JSON.stringify(res.body)).not.toMatch(/markerNote|"confidence"|Swapped but did not solve/);
    await reasons(learners[1].token, markings[0]).expect(404);
  });

  it('a teacher of another school gets 404', async () => {
    const stranger = signTestToken({ id: oid(), role: 'teacher', schoolId: oid(), isStandaloneTeacher: true, isSchoolPrincipal: false });
    await reasons(stranger, markings[0]).expect(404);
  });
});

describe('dismiss and restore', () => {
  it('hides a reason from the learner and brings it back; a learner cannot do either', async () => {
    const r = await row(markings[0], '1.1').lean();
    await request(app).post(`/api/evidence/rows/${String(r!._id)}/dismiss`).set(auth(learners[0].token)).expect(403);
    await request(app).post(`/api/evidence/rows/${String(r!._id)}/dismiss`).set(auth(room.teacherToken)).expect(204);
    const learnerView = await reasons(learners[0].token, markings[0]).expect(200);
    expect((learnerView.body.data.items as Array<{ itemKey: string; state: string }>).find((i) => i.itemKey === '1.1')?.state).toBe('none');
    await request(app).post(`/api/evidence/rows/${String(r!._id)}/restore`).set(auth(room.teacherToken)).expect(204);
    expect((await row(markings[0], '1.1').lean())!.diagnosis.state).toBe('ready');
  });
});

describe('GET /api/evidence/class-misconceptions', () => {
  const url = () => `/api/evidence/class-misconceptions?parent=paper&parentId=${String(fx.paperId)}&classId=${String(room.maths.id)}`;

  it('ranks types shared by two or more learners, lists the general ones, counts marks to check', async () => {
    const res = await request(app).get(url()).set(auth(room.teacherToken)).expect(200);
    const data = res.body.data;
    expect(data.markedLearners).toBe(3);
    expect(data.top).toHaveLength(1);
    expect(data.top[0]).toMatchObject({ label: 'Swapped but did not solve', learners: 2, lostMarks: 2, questions: ['1.1'] });
    expect(data.top[0].students.map((s: { name: string }) => s.name).sort()).toEqual(['Ayanda Learner', 'Bongi Learner']);
    expect(data.generic.map((g: { label: string; learners: number }) => [g.label, g.learners])).toEqual([['Not answered', 3], ['Arithmetic slip', 1]]);
    expect(data.marksToCheck).toBe(1);
  });

  it('a dismissed reason does not count', async () => {
    const r = await row(markings[1], '1.1').lean();
    await request(app).post(`/api/evidence/rows/${String(r!._id)}/dismiss`).set(auth(room.teacherToken)).expect(204);
    const res = await request(app).get(url()).set(auth(room.teacherToken)).expect(200);
    expect(res.body.data.top).toEqual([]);
  });

  it('another school cannot read it', async () => {
    const stranger = signTestToken({ id: oid(), role: 'teacher', schoolId: oid(), isStandaloneTeacher: true, isSchoolPrincipal: false });
    await request(app).get(url()).set(auth(stranger)).expect(404);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/payoff-api.test.ts`
Expected: FAIL — `GET /api/evidence/reasons` answers 404 for the teacher (route missing).

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/access.ts
//
// Who may read what (plan ruling P6): each source's own read rule. Every
// refusal is a plain 404, so ids from another school reveal nothing.
import mongoose from 'mongoose';
import { NotFoundError } from '../../common/errors.js';
import { learnerClassIds } from '../../common/class-roster.js';
import type { AuthenticatedUser } from '../../types/authenticated-request.js';
import { PaperMarking } from '../AITools/model-marking.js';
import { resolveStudentForUser } from '../AITools/service-student-ownership.js';
import { AssessmentPaper } from '../QuestionBank/model.js';
import { Homework, HomeworkSubmission } from '../Homework/model.js';
import { homeworkAccessFilter } from '../Homework/service-access.js';
import { Class } from '../Academic/model.js';
import { Student } from '../Student/model.js';
import type { Oid } from './types.js';

export const STAFF_ROLES = ['teacher', 'school_admin', 'super_admin'] as const;
export type Audience = 'teacher' | 'learner';
export interface RecordAccess { schoolId: Oid; recordId: Oid; audience: Audience; source: 'test' | 'homework' }

const ADMIN_ROLES = new Set(['school_admin', 'super_admin']);
const oid = (id: string | Oid): Oid => new mongoose.Types.ObjectId(String(id));
const notFound = (): NotFoundError => new NotFoundError('Not found');

function schoolOf(user: AuthenticatedUser): Oid {
  if (!user.schoolId) throw notFound();
  return oid(user.schoolId);
}

export async function meAsLearner(user: AuthenticatedUser): Promise<{ schoolId: Oid; studentId: Oid }> {
  const schoolId = schoolOf(user);
  const me = await resolveStudentForUser(user.id, String(schoolId)).catch(() => null);
  if (!me) throw notFound();
  return { schoolId, studentId: oid(me.studentId) };
}

const homeworkScope = (user: AuthenticatedUser, schoolId: Oid) => homeworkAccessFilter({ ...user, schoolId: String(schoolId) });

export async function recordAccess(user: AuthenticatedUser, source: 'test' | 'homework', recordId: string): Promise<RecordAccess> {
  const schoolId = schoolOf(user);
  const id = oid(recordId);
  const asLearner = user.role === 'student';
  const me = asLearner ? await meAsLearner(user) : null;
  if (source === 'test') {
    const m = await PaperMarking.findOne({ _id: id, schoolId, isDeleted: false }).select('studentId issuedToStudent').lean();
    if (!m) throw notFound();
    if (me && (!m.issuedToStudent || String(m.studentId) !== String(me.studentId))) throw notFound();
  } else {
    const sub = await HomeworkSubmission.findOne({ _id: id, schoolId, isDeleted: false }).select('studentId homeworkId').lean();
    if (!sub) throw notFound();
    if (me && String(sub.studentId) !== String(me.studentId)) throw notFound();
    if (!me && !(await Homework.exists({ _id: sub.homeworkId, ...homeworkScope(user, schoolId) }))) throw notFound();
  }
  return { schoolId, recordId: id, audience: me ? 'learner' : 'teacher', source };
}

export async function parentAccess(
  user: AuthenticatedUser, parent: 'paper' | 'homework', parentId: string, classId: string,
): Promise<{ schoolId: Oid; parentId: Oid; classId: Oid }> {
  const schoolId = schoolOf(user);
  const ok = parent === 'paper'
    ? await AssessmentPaper.exists({ _id: oid(parentId), schoolId, isDeleted: false })
    : await Homework.exists({ _id: oid(parentId), classId: oid(classId), ...homeworkScope(user, schoolId) });
  if (!ok) throw notFound();
  return { schoolId, parentId: oid(parentId), classId: oid(classId) };
}

const isAdmin = (user: AuthenticatedUser): boolean => ADMIN_ROLES.has(user.role) || user.isSchoolPrincipal === true;

export async function learnerAccess(user: AuthenticatedUser, studentId: string): Promise<{ schoolId: Oid; studentId: Oid }> {
  const schoolId = schoolOf(user);
  const student = await Student.findOne({ _id: oid(studentId), schoolId, isDeleted: false }).select('classId subjectClassIds').lean();
  if (!student) throw notFound();
  if (!isAdmin(user)) {
    const teaches = await Class.exists({ _id: { $in: learnerClassIds(student) }, schoolId, teacherId: oid(user.id), isDeleted: false });
    if (!teaches) throw notFound();
  }
  return { schoolId, studentId: student._id as Oid };
}

export async function classAccess(user: AuthenticatedUser, classId: string): Promise<{ schoolId: Oid; classId: Oid }> {
  const schoolId = schoolOf(user);
  const filter: Record<string, unknown> = { _id: oid(classId), schoolId, isDeleted: false };
  if (!isAdmin(user)) filter.teacherId = oid(user.id);
  if (!(await Class.exists(filter))) throw notFound();
  return { schoolId, classId: oid(classId) };
}
```

```ts
// src/modules/Evidence/service-reasons.ts
//
// "Why marks were lost" per answer (spec §7.1, §8.1). The learner sees only
// their own final rows, with learner labels, and never a low-confidence,
// check-mark, teacher-only or dismissed reason.
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import type { AuthenticatedUser } from '../../types/authenticated-request.js';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { AnswerEvidence, type IAnswerEvidence } from './model.js';
import { MisconceptionType, type TypeKind } from './model-taxonomy.js';
import { recordAccess, type Audience, type RecordAccess } from './access.js';
import type { DiagnosisState, Oid } from './types.js';

export const LEARNER_MIN_CONFIDENCE = 0.6;
export type ReasonState = 'none' | 'working' | 'ready' | 'dismissed' | 'limit' | 'failed';

export interface LostMarksReasonItem {
  rowId: string; itemKey: string; position: number; marksAwarded: number; marksAvailable: number; state: ReasonState;
  reason: null | {
    typeId: string; label: string; learnerLabel: string; kind: TypeKind; topicTitle: string | null;
    explanation: string; lowConfidence: boolean; checkMark: boolean;
  };
}

const STATE: Record<DiagnosisState, ReasonState> = {
  none: 'none', pending: 'working', queued: 'working', ready: 'ready', skipped: 'none',
  skipped_budget: 'limit', failed: 'failed', dismissed: 'dismissed',
};

interface TypeLite { _id: Oid; code: string; kind: TypeKind; label: string; learnerLabel: string; learnerVisible: boolean }
type Row = Pick<IAnswerEvidence, 'marksAwarded' | 'marksAvailable' | 'topicNodeId'> & {
  _id: Oid; source: { itemKey: string; position: number }; diagnosis: { state: DiagnosisState; typeId: Oid | null; explanation: string; confidence: number | null };
};

function toItem(row: Row, type: TypeLite | undefined, topicTitle: string | null, audience: Audience): LostMarksReasonItem {
  const base = { rowId: String(row._id), itemKey: row.source.itemKey, position: row.source.position ?? 0, marksAwarded: row.marksAwarded, marksAvailable: row.marksAvailable };
  let state = STATE[row.diagnosis.state];
  if ((state === 'ready' || state === 'dismissed') && !type) state = 'none';
  const checkMark = type?.code === 'GEN.possible-marking-error';
  const lowConfidence = (row.diagnosis.confidence ?? 1) < LEARNER_MIN_CONFIDENCE;
  if (audience === 'learner') {
    const hidden = state === 'dismissed' || state === 'limit' || state === 'failed'
      || (state === 'ready' && (lowConfidence || checkMark || !type!.learnerVisible));
    if (hidden || state !== 'ready') return { ...base, state: hidden ? 'none' : state, reason: null };
    return { ...base, state, reason: {
      typeId: String(type!._id), label: type!.learnerLabel, learnerLabel: type!.learnerLabel, kind: type!.kind, topicTitle,
      explanation: row.diagnosis.explanation, lowConfidence: false, checkMark: false,
    } };
  }
  const reason = type && (state === 'ready' || state === 'dismissed') ? {
    typeId: String(type._id), label: type.label, learnerLabel: type.learnerLabel, kind: type.kind, topicTitle,
    explanation: row.diagnosis.explanation, lowConfidence, checkMark,
  } : null;
  return { ...base, state, reason };
}

export async function lostMarksReasons(access: RecordAccess): Promise<{ items: LostMarksReasonItem[] }> {
  const rows = (await AnswerEvidence.find({
    schoolId: access.schoolId, 'source.type': access.source, 'source.recordId': access.recordId, isDeleted: false,
    ...(access.audience === 'learner' ? { status: 'final' } : {}),
  }).sort({ 'source.position': 1 }).select('marksAwarded marksAvailable topicNodeId source diagnosis').lean()) as unknown as Row[];
  const typeIds = rows.map((r) => r.diagnosis.typeId).filter(Boolean);
  const topicIds = rows.map((r) => r.topicNodeId).filter(Boolean);
  const [types, topics] = await Promise.all([
    MisconceptionType.find({ _id: { $in: typeIds } }).select('code kind label learnerLabel learnerVisible').lean(),
    CurriculumNode.find({ _id: { $in: topicIds } }).select('title').lean(),
  ]);
  const typeById = new Map((types as unknown as TypeLite[]).map((t) => [String(t._id), t]));
  const topicTitle = new Map(topics.map((t) => [String(t._id), t.title]));
  return { items: rows.map((r) => toItem(
    r, r.diagnosis.typeId ? typeById.get(String(r.diagnosis.typeId)) : undefined,
    r.topicNodeId ? topicTitle.get(String(r.topicNodeId)) ?? null : null, access.audience,
  )) };
}

/** Teacher only (the route says so). Idempotent: dismissing a dismissed reason is fine. */
export async function setDismissed(user: AuthenticatedUser, rowId: string, dismissed: boolean): Promise<void> {
  if (!user.schoolId) throw new NotFoundError('Not found');
  const schoolId = new mongoose.Types.ObjectId(user.schoolId);
  const row = await AnswerEvidence.findOne({ _id: new mongoose.Types.ObjectId(rowId), schoolId, isDeleted: false }).select('source').lean();
  if (!row || (row.source.type !== 'test' && row.source.type !== 'homework')) throw new NotFoundError('Not found');
  await recordAccess(user, row.source.type, String(row.source.recordId));
  const res = await AnswerEvidence.updateOne(
    { _id: row._id, schoolId, 'diagnosis.state': { $in: ['ready', 'dismissed'] } },
    { $set: dismissed
      ? { 'diagnosis.state': 'dismissed', 'diagnosis.dismissedBy': new mongoose.Types.ObjectId(user.id), 'diagnosis.dismissedAt': new Date() }
      : { 'diagnosis.state': 'ready', 'diagnosis.dismissedBy': null, 'diagnosis.dismissedAt': null } },
  );
  if (res.matchedCount === 0) throw new BadRequestError('There is no reason on this answer to hide or show');
}
```

```ts
// src/modules/Evidence/service-class.ts
//
// "Where the class lost marks" (spec §7.1, §8.2): misconception and
// procedural types shared by two or more learners on this paper or homework
// in this class, top three; general types on one line; marks to check.
import { User } from '../Auth/model.js';
import { Student } from '../Student/model.js';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { AnswerEvidence } from './model.js';
import { MisconceptionType, type TypeKind } from './model-taxonomy.js';
import { groupBy } from './pipeline-collect.js';
import type { Oid } from './types.js';

export interface ClassMisconceptions {
  markedLearners: number;
  updatedAt: string;
  top: Array<{
    typeId: string; label: string; kind: 'misconception' | 'procedural'; topicTitle: string | null;
    learners: number; lostMarks: number; questions: string[];
    students: Array<{ studentId: string; name: string; recordId: string }>;
  }>;
  generic: Array<{ typeId: string; label: string; learners: number }>;
  marksToCheck: number;
  working: number;
}

interface Row {
  studentId: Oid; marksAwarded: number; marksAvailable: number; updatedAt: Date;
  source: { itemKey: string; recordId: Oid }; diagnosis: { state: string; typeId: Oid | null };
}

export async function studentNames(schoolId: Oid, ids: readonly Oid[]): Promise<Map<string, string>> {
  const students = await Student.find({ _id: { $in: ids }, schoolId }).select('userId admissionNumber').lean();
  const users = await User.find({ _id: { $in: students.map((s) => s.userId).filter(Boolean) } }).select('firstName lastName').lean();
  const userName = new Map(users.map((u) => [String(u._id), `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()]));
  return new Map(students.map((s) => [String(s._id), userName.get(String(s.userId)) || s.admissionNumber || 'Learner']));
}

const byLearnersThenMarks = (a: { learners: number; lostMarks: number }, b: { learners: number; lostMarks: number }): number =>
  b.learners - a.learners || b.lostMarks - a.lostMarks;

export async function classMisconceptions(a: { schoolId: Oid; parentId: Oid; classId: Oid }): Promise<ClassMisconceptions> {
  const rows = (await AnswerEvidence.find({ schoolId: a.schoolId, 'source.parentId': a.parentId, classId: a.classId, isDeleted: false })
    .select('studentId marksAwarded marksAvailable updatedAt source diagnosis').lean()) as unknown as Row[];
  const ready = rows.filter((r) => r.diagnosis.state === 'ready' && r.diagnosis.typeId);
  const types = await MisconceptionType.find({ _id: { $in: ready.map((r) => r.diagnosis.typeId) } }).select('code kind label topicNodeId').lean();
  const typeById = new Map(types.map((t) => [String(t._id), t]));
  const [names, topics] = await Promise.all([
    studentNames(a.schoolId, [...new Set(ready.map((r) => String(r.studentId)))].map((id) => ready.find((r) => String(r.studentId) === id)!.studentId)),
    CurriculumNode.find({ _id: { $in: types.map((t) => t.topicNodeId).filter(Boolean) } }).select('title').lean(),
  ]);
  const topicTitle = new Map(topics.map((t) => [String(t._id), t.title]));

  const summaries = [...groupBy(ready, (r) => String(r.diagnosis.typeId)).entries()].flatMap(([typeId, rs]) => {
    const type = typeById.get(typeId);
    if (!type) return [];
    const learners = [...new Set(rs.map((r) => String(r.studentId)))];
    return [{
      typeId, code: type.code, kind: type.kind as TypeKind, label: type.label, rows: rs.length,
      topicTitle: type.topicNodeId ? topicTitle.get(String(type.topicNodeId)) ?? null : null,
      learners: learners.length, lostMarks: rs.reduce((s, r) => s + (r.marksAvailable - r.marksAwarded), 0),
      questions: [...new Set(rs.map((r) => r.source.itemKey))].sort(),
      students: learners.map((id) => ({ studentId: id, name: names.get(id) ?? 'Learner', recordId: String(rs.find((r) => String(r.studentId) === id)!.source.recordId) })),
    }];
  });
  const checks = summaries.find((s) => s.code === 'GEN.possible-marking-error');
  const updated = rows.reduce((max, r) => Math.max(max, r.updatedAt.getTime()), 0);
  return {
    markedLearners: new Set(rows.map((r) => String(r.studentId))).size,
    updatedAt: new Date(updated || Date.now()).toISOString(),
    top: summaries.filter((s) => s.kind !== 'generic' && s.learners >= 2).sort(byLearnersThenMarks).slice(0, 3)
      .map(({ typeId, label, kind, topicTitle: t, learners, lostMarks, questions, students }) => ({
        typeId, label, kind: kind as 'misconception' | 'procedural', topicTitle: t, learners, lostMarks, questions, students,
      })),
    generic: summaries.filter((s) => s.kind === 'generic' && s !== checks).sort(byLearnersThenMarks).slice(0, 3)
      .map(({ typeId, label, learners }) => ({ typeId, label, learners })),
    marksToCheck: checks?.rows ?? 0,
    working: rows.filter((r) => r.diagnosis.state === 'pending' || r.diagnosis.state === 'queued').length,
  };
}
```

`src/modules/Evidence/validation.ts` — add:

```ts
export const reasonsQuery = z.object({ source: z.enum(['test', 'homework']), recordId: objectIdSchema });
export const classMisconceptionsQuery = z.object({ parent: z.enum(['paper', 'homework']), parentId: objectIdSchema, classId: objectIdSchema });
```

```ts
// src/modules/Evidence/controller.ts
import type { Request, Response } from 'express';
import { apiResponse } from '../../common/utils.js';
import { getUser } from '../../types/authenticated-request.js';
import { parentAccess, recordAccess } from './access.js';
import { lostMarksReasons, setDismissed } from './service-reasons.js';
import { classMisconceptions } from './service-class.js';

export const ReasonsController = {
  async reasons(req: Request, res: Response): Promise<void> {
    const { source, recordId } = req.query as { source: 'test' | 'homework'; recordId: string };
    res.json(apiResponse(true, await lostMarksReasons(await recordAccess(getUser(req), source, recordId))));
  },
  async dismiss(req: Request, res: Response): Promise<void> {
    await setDismissed(getUser(req), req.params.id as string, true);
    res.status(204).end();
  },
  async restore(req: Request, res: Response): Promise<void> {
    await setDismissed(getUser(req), req.params.id as string, false);
    res.status(204).end();
  },
  async classMisconceptions(req: Request, res: Response): Promise<void> {
    const q = req.query as { parent: 'paper' | 'homework'; parentId: string; classId: string };
    res.json(apiResponse(true, await classMisconceptions(await parentAccess(getUser(req), q.parent, q.parentId, q.classId))));
  },
};
```

`src/modules/Evidence/routes.ts` — import `ReasonsController` from `'./controller.js'`, `STAFF_ROLES` from `'./access.js'`, and `reasonsQuery, classMisconceptionsQuery` from `'./validation.js'`; add:

```ts
const staff = authorize(...STAFF_ROLES);

router.get('/reasons', authorize(...STAFF_ROLES, 'student'), validate({ query: reasonsQuery }), ReasonsController.reasons);
router.post('/rows/:id/dismiss', staff, validate({ params: idParams }), ReasonsController.dismiss);
router.post('/rows/:id/restore', staff, validate({ params: idParams }), ReasonsController.restore);
router.get('/class-misconceptions', staff, validate({ query: classMisconceptionsQuery }), ReasonsController.classMisconceptions);
```

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Evidence
LANE_SWEEP_OK=1 git commit -m "feat(evidence): reasons per answer for teacher and learner, dismiss and restore, and the class's top three" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 18: the evidence summary contract for Phase R

**Files:**
- Create: `src/modules/Evidence/summary-buckets.ts` (pure), `src/modules/Evidence/service-summary.ts`, `src/modules/Evidence/controller-summary.ts`
- Modify: `src/modules/Evidence/validation.ts`, `src/modules/Evidence/routes.ts` (five routes)
- Test: `src/modules/Evidence/__tests__/summary.test.ts`

**Interfaces:**
- Consumes: `learnerAccess`, `classAccess`, `meAsLearner`, `STAFF_ROLES` (Task 17).
- Produces: `interface Bucket { awarded: number; available: number; answers: number }`; `LEVEL_KEYS = [...CAPS_LEVELS, 'unknown']`; `WEEKS = 26`; `sastWeekStart(d: Date): string` (the SAST Monday, `YYYY-MM-DD`); `interface SummaryRow`; `interface TopicEvidence` and `interface LearnerTopicEvidence` exactly as spec §7.2 (`weekly` holds only weeks with answers, oldest first, within the last 26); `summariseTopics(rows: readonly SummaryRow[], lookups, options: { now: Date; countLearners: boolean; learnerView: boolean }): { topics: TopicEvidence[]; untagged: Bucket }`; `learnerTopics({ schoolId, studentId, subjectId, from?, to?, now?, learnerView? }): Promise<LearnerTopicEvidence>` (R calls this directly); `classTopics({ schoolId, classId, subjectId, now? }): Promise<ClassTopicEvidence>` (`learners` per topic and per misconception); `learnerRows({ schoolId, studentId, subjectId?, topicNodeId?, cursor?, limit, learnerView }): Promise<{ rows: EvidenceRowView[]; nextCursor: string | null }>`.
- API: `GET /api/evidence/learners/:studentId/topics?subjectId=&from=&to=` (staff with learner access); `GET /api/evidence/me/topics?subjectId=` (student); `GET /api/evidence/classes/:classId/topics?subjectId=` (staff with class access); `GET /api/evidence/learners/:studentId/rows?subjectId=&topicNodeId=&cursor=&limit=50`; `GET /api/evidence/me/rows?…`. Only **final**, non-deleted rows count; no weighting.

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Evidence/__tests__/summary.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../app.js';
import { signTestToken } from '../../../test-utils/auth.js';
import { Class } from '../../Academic/model.js';
import { CurriculumNode } from '../../CurriculumStructure/model.js';
import { AnswerEvidence } from '../model.js';
import { MisconceptionType } from '../model-taxonomy.js';
import { cleanUpClassrooms, standaloneClassroom, type Classroom, type Learner } from '../../../test-utils/standalone-classroom.js';
import { sastWeekStart } from '../summary-buckets.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();
let room: Classroom;
let thabo: Learner;
let otherTeacher: Oid;
const subjectId = oid();
const topic = oid();
const sub = oid();
let typeId: Oid;
const DAY = 24 * 3600_000;
const earlier = new Date(Date.now() - 3 * DAY);
const later = new Date(Date.now() - 1 * DAY);

async function row(over: Record<string, unknown>): Promise<void> {
  await AnswerEvidence.create({
    schoolId: room.schoolId, studentId: thabo.studentId, subjectId, classId: room.maths.id, topicNodeId: topic, subtopicNodeId: null,
    topicFrom: 'question', cognitiveLevel: 'routine', marksAwarded: 1, marksAvailable: 2, markedBy: 'ai', status: 'final',
    markedAt: earlier, questionKey: 'q:x', answer: { kind: 'typed', text: 'x', truncated: false, hash: 'h' },
    source: { type: 'test', recordId: oid(), parentId: oid(), itemKey: '1' }, diagnosis: { state: 'none', cacheKey: 'k' }, ...over,
  });
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  room = await standaloneClassroom();
  otherTeacher = oid();
  const shared = oid();
  await Class.collection.insertOne({ _id: shared, schoolId: room.schoolId, name: 'Extension', gradeId: oid(), teacherId: otherTeacher, isDeleted: false });
  thabo = await room.learner('Thabo', room.maths.id, [shared]);
  await CurriculumNode.collection.insertMany([
    { _id: topic, frameworkId: oid(), type: 'topic', parentId: null, title: 'Functions', code: `E-SUM-${String(topic)}`, metadata: {}, order: 0, schoolId: null, isDeleted: false },
    { _id: sub, frameworkId: oid(), type: 'subtopic', parentId: topic, title: 'Inverses', code: `E-SUM-${String(sub)}`, metadata: {}, order: 0, schoolId: null, isDeleted: false },
  ]);
  typeId = (await MisconceptionType.create({ code: `E-SUM-${String(topic)}.swap`, kind: 'procedural', topicNodeId: topic, label: 'Swapped only', learnerLabel: 'Stopped after swapping', description: 'd', status: 'seeded', origin: 'ai_seed' }))._id as Oid;
  await row({ subtopicNodeId: sub, diagnosis: { state: 'ready', cacheKey: 'k1', typeId } });
  await row({ cognitiveLevel: null, marksAwarded: 2, source: { type: 'homework', recordId: oid(), parentId: oid(), itemKey: 'a' }, markedAt: later });
  await row({ topicFrom: 'ai_tag', marksAwarded: 0, diagnosis: { state: 'dismissed', cacheKey: 'k2', typeId } });
  await row({ topicNodeId: null, topicFrom: 'none', marksAwarded: 1, marksAvailable: 3 });
  await row({ status: 'provisional', marksAwarded: 0, marksAvailable: 10 });
  await row({ isDeleted: true, marksAwarded: 0, marksAvailable: 10 });
});
afterAll(async () => {
  await Promise.all([CurriculumNode.deleteMany({ code: /^E-SUM-/ }), MisconceptionType.deleteMany({ code: /^E-SUM-/ })]);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

describe('sastWeekStart', () => {
  it('uses the SAST Monday: 22:30 UTC on a Sunday is already Monday', () => {
    expect(sastWeekStart(new Date('2026-09-27T22:30:00Z'))).toBe('2026-09-28');
    expect(sastWeekStart(new Date('2026-09-27T21:59:00Z'))).toBe('2026-09-21');
  });
});

describe('GET /api/evidence/learners/:id/topics', () => {
  const url = () => `/api/evidence/learners/${String(thabo.studentId)}/topics?subjectId=${String(subjectId)}`;

  it('sums only final, live rows: by level, by source, by week, by subtopic, with misconceptions and the untagged rest', async () => {
    const res = await request(app).get(url()).set('Authorization', `Bearer ${room.teacherToken}`).expect(200);
    const data = res.body.data;
    expect(data.untagged).toEqual({ awarded: 1, available: 3, answers: 1 });
    expect(data.topics).toHaveLength(1);
    const t = data.topics[0];
    expect(t).toMatchObject({ topicTitle: 'Functions', marksAwarded: 3, marksAvailable: 6, answers: 3 });
    expect(t.byLevel.routine).toEqual({ awarded: 1, available: 4, answers: 2 });
    expect(t.byLevel.unknown).toEqual({ awarded: 2, available: 2, answers: 1 });
    expect(t.bySource.homework).toEqual({ awarded: 2, available: 2, answers: 1 });
    expect(t.weekly.map((w: { weekStart: string }) => w.weekStart)).toEqual([...new Set([sastWeekStart(earlier), sastWeekStart(later)])]);
    expect(t.subtopics).toEqual([expect.objectContaining({ title: 'Inverses', answers: 1 })]);
    expect(t.misconceptions).toEqual([expect.objectContaining({ label: 'Swapped only', count: 1 })]);
    expect(t.aiTaggedShare).toBeCloseTo(1 / 3);
  });

  it("a teacher of the learner's second group may read; a teacher of neither may not", async () => {
    const second = signTestToken({ id: otherTeacher, role: 'teacher', schoolId: room.schoolId, isStandaloneTeacher: false, isSchoolPrincipal: false });
    await request(app).get(url()).set('Authorization', `Bearer ${second}`).expect(200);
    const none = signTestToken({ id: oid(), role: 'teacher', schoolId: room.schoolId, isStandaloneTeacher: false, isSchoolPrincipal: false });
    await request(app).get(url()).set('Authorization', `Bearer ${none}`).expect(404);
  });

  it('the learner reads their own, with learner labels', async () => {
    const res = await request(app).get(`/api/evidence/me/topics?subjectId=${String(subjectId)}`).set('Authorization', `Bearer ${thabo.token}`).expect(200);
    expect(res.body.data.topics[0].misconceptions[0].label).toBe('Stopped after swapping');
    await request(app).get(`/api/evidence/learners/${String(thabo.studentId)}/topics?subjectId=${String(subjectId)}`).set('Authorization', `Bearer ${thabo.token}`).expect(403);
  });

  it('the class view counts learners', async () => {
    const res = await request(app).get(`/api/evidence/classes/${String(room.maths.id)}/topics?subjectId=${String(subjectId)}`).set('Authorization', `Bearer ${room.teacherToken}`).expect(200);
    expect(res.body.data.topics[0]).toMatchObject({ learners: 1, answers: 3 });
  });

  it('drill-down rows page with a cursor', async () => {
    const res = await request(app).get(`/api/evidence/learners/${String(thabo.studentId)}/rows?subjectId=${String(subjectId)}&limit=2`).set('Authorization', `Bearer ${room.teacherToken}`).expect(200);
    expect(res.body.data.rows).toHaveLength(2);
    const next = await request(app).get(`/api/evidence/learners/${String(thabo.studentId)}/rows?subjectId=${String(subjectId)}&limit=2&cursor=${res.body.data.nextCursor}`).set('Authorization', `Bearer ${room.teacherToken}`).expect(200);
    expect(next.body.data.rows).toHaveLength(2);
    expect(next.body.data.nextCursor).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence/__tests__/summary.test.ts`
Expected: FAIL — `Cannot find module '../summary-buckets.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Evidence/summary-buckets.ts
//
// Pure summing for Phase R's evidence contract (spec §7.2). Raw sums only:
// weighting, decay and confidence are R's decisions.
import { CAPS_LEVELS } from '../QuestionBank/model-shared.js';
import { SOURCE_TYPES, type SourceType, type TopicFrom } from './types.js';
import type { TypeKind } from './model-taxonomy.js';

export interface Bucket { awarded: number; available: number; answers: number }
export const LEVEL_KEYS = [...CAPS_LEVELS, 'unknown'] as const;
export type LevelKey = (typeof LEVEL_KEYS)[number];
export const WEEKS = 26;
const SAST_MS = 2 * 3600_000;
const WEEK_MS = 7 * 24 * 3600_000;

export function sastWeekStart(d: Date): string {
  const local = new Date(d.getTime() + SAST_MS);
  const back = (local.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - back)).toISOString().slice(0, 10);
}

export interface SummaryRow {
  studentId: string; topicNodeId: string | null; subtopicNodeId: string | null; cognitiveLevel: string | null;
  sourceType: SourceType; marksAwarded: number; marksAvailable: number; markedAt: Date; topicFrom: TopicFrom;
  typeId: string | null; diagnosisState: string;
}

export interface TypeInfo { code: string; label: string; learnerLabel: string; kind: TypeKind; learnerVisible: boolean }
export interface Lookups { titles: Map<string, string>; codes: Map<string, string>; types: Map<string, TypeInfo> }

export interface TopicEvidence {
  topicNodeId: string; topicTitle: string; topicCode: string;
  marksAwarded: number; marksAvailable: number; answers: number; learners?: number;
  firstAnsweredAt: string; lastAnsweredAt: string;
  byLevel: Record<LevelKey, Bucket>;
  bySource: Record<SourceType, Bucket>;
  weekly: Array<{ weekStart: string } & Bucket>;
  subtopics: Array<{ subtopicNodeId: string; title: string } & Bucket>;
  misconceptions: Array<{ typeId: string; code: string; label: string; learnerLabel: string; kind: TypeKind; count: number; lastSeenAt: string }>;
  aiTaggedShare: number;
}

const empty = (): Bucket => ({ awarded: 0, available: 0, answers: 0 });
const add = (b: Bucket, r: SummaryRow): Bucket => ({ awarded: b.awarded + r.marksAwarded, available: b.available + r.marksAvailable, answers: b.answers + 1 });
const tally = (rows: readonly SummaryRow[]): Bucket => rows.reduce(add, empty());
const bucketsBy = (rows: readonly SummaryRow[], keyOf: (r: SummaryRow) => string | null): Map<string, SummaryRow[]> => {
  const out = new Map<string, SummaryRow[]>();
  for (const r of rows) {
    const k = keyOf(r);
    if (k !== null) out.set(k, [...(out.get(k) ?? []), r]);
  }
  return out;
};

function misconceptions(rows: readonly SummaryRow[], lookups: Lookups, countLearners: boolean, learnerView: boolean): TopicEvidence['misconceptions'] {
  const shown = rows.filter((r) => r.diagnosisState === 'ready' && r.typeId);
  return [...bucketsBy(shown, (r) => r.typeId).entries()].flatMap(([typeId, rs]) => {
    const t = lookups.types.get(typeId);
    if (!t || t.code === 'GEN.possible-marking-error' || (learnerView && !t.learnerVisible)) return [];
    const count = countLearners ? new Set(rs.map((r) => r.studentId)).size : rs.length;
    const last = Math.max(...rs.map((r) => r.markedAt.getTime()));
    return [{ typeId, code: t.code, label: learnerView ? t.learnerLabel : t.label, learnerLabel: t.learnerLabel, kind: t.kind, count, lastSeenAt: new Date(last).toISOString() }];
  }).sort((a, b) => b.count - a.count);
}

export function summariseTopics(
  rows: readonly SummaryRow[], lookups: Lookups, options: { now: Date; countLearners: boolean; learnerView: boolean },
): { topics: TopicEvidence[]; untagged: Bucket } {
  const since = options.now.getTime() - WEEKS * WEEK_MS;
  const topics = [...bucketsBy(rows, (r) => r.topicNodeId).entries()].map(([topicNodeId, rs]): TopicEvidence => {
    const times = rs.map((r) => r.markedAt.getTime());
    const total = tally(rs);
    return {
      topicNodeId, topicTitle: lookups.titles.get(topicNodeId) ?? '', topicCode: lookups.codes.get(topicNodeId) ?? '',
      marksAwarded: total.awarded, marksAvailable: total.available, answers: total.answers,
      ...(options.countLearners ? { learners: new Set(rs.map((r) => r.studentId)).size } : {}),
      firstAnsweredAt: new Date(Math.min(...times)).toISOString(), lastAnsweredAt: new Date(Math.max(...times)).toISOString(),
      byLevel: Object.fromEntries(LEVEL_KEYS.map((k) => [k, tally(rs.filter((r) => (r.cognitiveLevel ?? 'unknown') === k))])) as Record<LevelKey, Bucket>,
      bySource: Object.fromEntries(SOURCE_TYPES.map((s) => [s, tally(rs.filter((r) => r.sourceType === s))])) as Record<SourceType, Bucket>,
      weekly: [...bucketsBy(rs.filter((r) => r.markedAt.getTime() >= since), (r) => sastWeekStart(r.markedAt)).entries()]
        .sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, ws]) => ({ weekStart, ...tally(ws) })),
      subtopics: [...bucketsBy(rs, (r) => r.subtopicNodeId).entries()]
        .map(([subtopicNodeId, ss]) => ({ subtopicNodeId, title: lookups.titles.get(subtopicNodeId) ?? '', ...tally(ss) })),
      misconceptions: misconceptions(rs, lookups, options.countLearners, options.learnerView),
      aiTaggedShare: rs.filter((r) => r.topicFrom === 'ai_tag').length / rs.length,
    };
  }).sort((a, b) => a.topicTitle.localeCompare(b.topicTitle));
  return { topics, untagged: tally(rows.filter((r) => !r.topicNodeId)) };
}
```

```ts
// src/modules/Evidence/service-summary.ts
//
// Phase R reads these (spec §7.2); the HTTP endpoints return the same shapes.
import mongoose from 'mongoose';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { AnswerEvidence } from './model.js';
import { MisconceptionType } from './model-taxonomy.js';
import { summariseTopics, type Bucket, type Lookups, type SummaryRow, type TopicEvidence, type TypeInfo } from './summary-buckets.js';
import type { Oid, SourceType } from './types.js';

export interface LearnerTopicEvidence { studentId: string; subjectId: string; asOf: string; topics: TopicEvidence[]; untagged: Bucket }
export interface ClassTopicEvidence { classId: string; subjectId: string; asOf: string; topics: TopicEvidence[]; untagged: Bucket }
export interface EvidenceRowView {
  id: string; topicNodeId: string | null; subtopicNodeId: string | null; cognitiveLevel: string | null; topicFrom: string;
  marksAwarded: number; marksAvailable: number; source: { type: SourceType; itemKey: string }; markedAt: string; totalOverridden: boolean; answer: string;
}

interface Lean {
  _id: Oid; studentId: Oid; topicNodeId: Oid | null; subtopicNodeId: Oid | null; cognitiveLevel: string | null; topicFrom: SummaryRow['topicFrom'];
  marksAwarded: number; marksAvailable: number; markedAt: Date; totalOverridden: boolean;
  source: { type: SourceType; itemKey: string }; answer: { text: string }; diagnosis: { state: string; typeId: Oid | null };
}

const FIELDS = 'studentId topicNodeId subtopicNodeId cognitiveLevel topicFrom marksAwarded marksAvailable markedAt totalOverridden source answer diagnosis';

const toSummaryRow = (r: Lean): SummaryRow => ({
  studentId: String(r.studentId), topicNodeId: r.topicNodeId ? String(r.topicNodeId) : null, subtopicNodeId: r.subtopicNodeId ? String(r.subtopicNodeId) : null,
  cognitiveLevel: r.cognitiveLevel, sourceType: r.source.type, marksAwarded: r.marksAwarded, marksAvailable: r.marksAvailable,
  markedAt: r.markedAt, topicFrom: r.topicFrom, typeId: r.diagnosis.typeId ? String(r.diagnosis.typeId) : null, diagnosisState: r.diagnosis.state,
});

async function lookups(rows: readonly Lean[]): Promise<Lookups> {
  const nodeIds = [...new Set(rows.flatMap((r) => [r.topicNodeId, r.subtopicNodeId]).filter(Boolean).map(String))];
  const typeIds = [...new Set(rows.map((r) => r.diagnosis.typeId).filter(Boolean).map(String))];
  const [nodes, types] = await Promise.all([
    CurriculumNode.find({ _id: { $in: nodeIds } }).select('title code').lean(),
    MisconceptionType.find({ _id: { $in: typeIds } }).select('code label learnerLabel kind learnerVisible').lean(),
  ]);
  return {
    titles: new Map(nodes.map((n) => [String(n._id), n.title])),
    codes: new Map(nodes.map((n) => [String(n._id), n.code])),
    types: new Map(types.map((t) => [String(t._id), t as unknown as TypeInfo])),
  };
}

export async function learnerTopics(input: {
  schoolId: Oid; studentId: Oid; subjectId: Oid; from?: Date; to?: Date; now?: Date; learnerView?: boolean;
}): Promise<LearnerTopicEvidence> {
  const markedAt: Record<string, Date> = {};
  if (input.from) markedAt.$gte = input.from;
  if (input.to) markedAt.$lte = input.to;
  const rows = (await AnswerEvidence.find({
    schoolId: input.schoolId, studentId: input.studentId, subjectId: input.subjectId, status: 'final', isDeleted: false,
    ...(input.from || input.to ? { markedAt } : {}),
  }).select(FIELDS).lean()) as unknown as Lean[];
  const now = input.now ?? new Date();
  const { topics, untagged } = summariseTopics(rows.map(toSummaryRow), await lookups(rows), { now, countLearners: false, learnerView: input.learnerView ?? false });
  return { studentId: String(input.studentId), subjectId: String(input.subjectId), asOf: now.toISOString(), topics, untagged };
}

export async function classTopics(input: { schoolId: Oid; classId: Oid; subjectId: Oid; now?: Date }): Promise<ClassTopicEvidence> {
  const rows = (await AnswerEvidence.find({
    schoolId: input.schoolId, classId: input.classId, subjectId: input.subjectId, status: 'final', isDeleted: false,
  }).select(FIELDS).lean()) as unknown as Lean[];
  const now = input.now ?? new Date();
  const { topics, untagged } = summariseTopics(rows.map(toSummaryRow), await lookups(rows), { now, countLearners: true, learnerView: false });
  return { classId: String(input.classId), subjectId: String(input.subjectId), asOf: now.toISOString(), topics, untagged };
}

/** Newest first; the cursor is the last row's id (ids grow with time). */
export async function learnerRows(input: {
  schoolId: Oid; studentId: Oid; subjectId?: string; topicNodeId?: string; cursor?: string; limit: number; learnerView: boolean;
}): Promise<{ rows: EvidenceRowView[]; nextCursor: string | null }> {
  const filter: Record<string, unknown> = { schoolId: input.schoolId, studentId: input.studentId, status: 'final', isDeleted: false };
  if (input.subjectId) filter.subjectId = new mongoose.Types.ObjectId(input.subjectId);
  if (input.topicNodeId) filter.topicNodeId = new mongoose.Types.ObjectId(input.topicNodeId);
  if (input.cursor) filter._id = { $lt: new mongoose.Types.ObjectId(input.cursor) };
  const rows = (await AnswerEvidence.find(filter).sort({ _id: -1 }).limit(input.limit + 1).select(FIELDS).lean()) as unknown as Lean[];
  const page = rows.slice(0, input.limit);
  return {
    rows: page.map((r) => ({
      id: String(r._id), topicNodeId: r.topicNodeId ? String(r.topicNodeId) : null, subtopicNodeId: r.subtopicNodeId ? String(r.subtopicNodeId) : null,
      cognitiveLevel: r.cognitiveLevel, topicFrom: r.topicFrom, marksAwarded: r.marksAwarded, marksAvailable: r.marksAvailable,
      source: { type: r.source.type, itemKey: r.source.itemKey }, markedAt: r.markedAt.toISOString(), totalOverridden: r.totalOverridden, answer: r.answer.text,
    })),
    nextCursor: rows.length > input.limit ? String(page[page.length - 1]._id) : null,
  };
}
```

`src/modules/Evidence/validation.ts` — add:

```ts
export const topicsQuery = z.object({ subjectId: objectIdSchema, from: z.coerce.date().optional(), to: z.coerce.date().optional() });
export const studentParams = z.object({ studentId: objectIdSchema });
export const classParams = z.object({ classId: objectIdSchema });
export const rowsQuery = z.object({
  subjectId: objectIdSchema.optional(), topicNodeId: objectIdSchema.optional(), cursor: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
```

```ts
// src/modules/Evidence/controller-summary.ts
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { apiResponse } from '../../common/utils.js';
import { getUser } from '../../types/authenticated-request.js';
import { classAccess, learnerAccess, meAsLearner } from './access.js';
import { classTopics, learnerRows, learnerTopics } from './service-summary.js';

interface TopicsQuery { subjectId: string; from?: Date; to?: Date }
interface RowsQuery { subjectId?: string; topicNodeId?: string; cursor?: string; limit: number }
const oid = (id: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(id);

export const SummaryController = {
  async learnerTopics(req: Request, res: Response): Promise<void> {
    const a = await learnerAccess(getUser(req), req.params.studentId as string);
    const q = req.query as unknown as TopicsQuery;
    res.json(apiResponse(true, await learnerTopics({ ...a, subjectId: oid(q.subjectId), from: q.from, to: q.to })));
  },
  async myTopics(req: Request, res: Response): Promise<void> {
    const me = await meAsLearner(getUser(req));
    const q = req.query as unknown as TopicsQuery;
    res.json(apiResponse(true, await learnerTopics({ ...me, subjectId: oid(q.subjectId), from: q.from, to: q.to, learnerView: true })));
  },
  async classTopics(req: Request, res: Response): Promise<void> {
    const a = await classAccess(getUser(req), req.params.classId as string);
    const q = req.query as unknown as TopicsQuery;
    res.json(apiResponse(true, await classTopics({ ...a, subjectId: oid(q.subjectId) })));
  },
  async learnerRows(req: Request, res: Response): Promise<void> {
    const a = await learnerAccess(getUser(req), req.params.studentId as string);
    res.json(apiResponse(true, await learnerRows({ ...a, ...(req.query as unknown as RowsQuery), learnerView: false })));
  },
  async myRows(req: Request, res: Response): Promise<void> {
    const me = await meAsLearner(getUser(req));
    res.json(apiResponse(true, await learnerRows({ ...me, ...(req.query as unknown as RowsQuery), learnerView: true })));
  },
};
```

`src/modules/Evidence/routes.ts` — import `SummaryController` and the new schemas; add:

```ts
const learner = authorize('student');
router.get('/learners/:studentId/topics', staff, validate({ params: studentParams, query: topicsQuery }), SummaryController.learnerTopics);
router.get('/me/topics', learner, validate({ query: topicsQuery }), SummaryController.myTopics);
router.get('/classes/:classId/topics', staff, validate({ params: classParams, query: topicsQuery }), SummaryController.classTopics);
router.get('/learners/:studentId/rows', staff, validate({ params: studentParams, query: rowsQuery }), SummaryController.learnerRows);
router.get('/me/rows', learner, validate({ query: rowsQuery }), SummaryController.myRows);
```

- [ ] **Step 4: Run to verify it passes**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run src/modules/Evidence && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 5: Run the whole backend suite, then commit**

Run: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run && npx tsc --noEmit && npm run build`
Expected: every file PASS; `tsc` silent; `build` exits 0. Then:

```bash
git add src/modules/Evidence
LANE_SWEEP_OK=1 git commit -m "feat(evidence): the evidence summary contract for Phase R (learner, class, rows)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Phase E-E — frontend (after the Blueprint and L-C merges), the walkthrough and the gate

Runs in `C:\dev\campusly\.worktrees\frontend-evidence` (branch `feat/evidence-diagnosis` from frontend `master` once `feat/blueprint-design-system` and Phase L-C have merged). Test command: `npx vitest run <path>`; type-check `npx tsc --noEmit`. Line numbers below are from the Blueprint branch (3c7be6d); anchor on the quoted code.

### Task 19: "Why marks were lost" on every marked test answer

**Files:**
- Create: `src/types/evidence.ts`; Modify: `src/types/index.ts` (`export * from './evidence';`)
- Create: `src/lib/evidence/reason-view.ts`
- Create: `src/hooks/useLostMarkReasons.ts`
- Create: `src/components/evidence/LostMarksReason.tsx`
- Modify: `src/components/ai-tools/MarkingQuestionCard.tsx` (optional `footer` slot, last child of `CardContent`)
- Modify: `src/components/ai-tools/MarkingResults.tsx` (teacher reasons; reload after "Save")
- Modify: `src/components/student/StudentMarkingReview.tsx` (learner reasons)
- Modify: `tests/no-tints.test.ts` (`'src/components/evidence'` joins `BLUEPRINT`)
- Test: `tests/evidence-reason-view.test.ts`

**Interfaces:**
- Consumes: `GET /api/evidence/reasons`, `POST /api/evidence/rows/:id/dismiss|restore` (Task 17).
- Produces (types): `ReasonState`, `MisconceptionKind`, `LostMarksReason`, `LostMarksReasonItem`, `ReasonAudience = 'teacher' | 'learner'`, `EvidenceSource = 'test' | 'homework'`, `ClassMisconceptions`, `ClassMisconceptionRow`, `MisconceptionStatus`, `MisconceptionTypeItem` (the backend shapes of Tasks 16–17).
- Produces (lib): `REASON_COPY`; `interface ReasonView { kind: 'hidden' | 'working' | 'limit' | 'failed' | 'reason' | 'check' | 'dismissed'; eyebrow: string; label: string; explanation: string; caption: string | null; lowConfidence: boolean }`; `reasonView(item, audience): ReasonView`; `reasonKey(questionNumber: string): string` (the backend's `normaliseQuestionNumber`); `indexReasons(items): Map<string, LostMarksReasonItem>`.
- Produces (hook): `useLostMarkReasons(source: EvidenceSource, recordId: string | null | undefined): { items; loading; byKey: Map<string, LostMarksReasonItem>; reasonFor(questionNumber: string): LostMarksReasonItem | undefined; busyRow: string | null; reload(): Promise<void>; dismiss(rowId): Promise<void>; restore(rowId): Promise<void> }` (no request while `recordId` is empty).
- Produces (component): `<LostMarksReason item audience onDismiss? onRestore? busy? />`; `MarkingQuestionCard` prop `footer?: ReactNode`.

- [ ] **Step 1: Set up the frontend worktree (once)**

```bash
cd C:/dev/campusly/campusly-frontend
git log --oneline origin/master -5    # compromise protocol: the Blueprint and L-C merges on top; stop on anything unexpected
git worktree add C:/dev/campusly/.worktrees/frontend-evidence -b feat/evidence-diagnosis origin/master
cd C:/dev/campusly/.worktrees/frontend-evidence && npm ci && npx vitest run tests/no-tints.test.ts
```
Expected: `npm ci` completes; the no-tints test passes on the untouched tree.

- [ ] **Step 2: Write the failing test**

```ts
// tests/evidence-reason-view.test.ts
import { describe, expect, it } from 'vitest';
import { REASON_COPY, indexReasons, reasonKey, reasonView } from '../src/lib/evidence/reason-view';
import type { LostMarksReasonItem } from '../src/types/evidence';

const item = (over: Partial<LostMarksReasonItem> = {}): LostMarksReasonItem => ({
  rowId: 'r1', itemKey: '2.3', position: 0, marksAwarded: 1, marksAvailable: 3, state: 'ready',
  reason: { typeId: 't', label: 'Domain not restricted on inverse', learnerLabel: "Didn't restrict the domain", kind: 'misconception',
    topicTitle: 'Functions', explanation: 'Restrict the domain before you find the inverse.', lowConfidence: false, checkMark: false },
  ...over,
});

describe('reasonView', () => {
  it('shows the teacher label, caption and sentence under the teacher eyebrow', () => {
    expect(reasonView(item(), 'teacher')).toEqual({
      kind: 'reason', eyebrow: 'Why marks were lost', label: 'Domain not restricted on inverse',
      explanation: 'Restrict the domain before you find the inverse.', caption: 'Functions · topic misconception', lowConfidence: false,
    });
  });

  it('shows the learner label under the learner eyebrow, with no caption', () => {
    expect(reasonView(item(), 'learner')).toMatchObject({ kind: 'reason', eyebrow: 'Why you lost marks', label: "Didn't restrict the domain", caption: null });
  });

  it('full marks or no item: nothing at all', () => {
    expect(reasonView(item({ marksAwarded: 3 }), 'teacher').kind).toBe('hidden');
    expect(reasonView(undefined, 'teacher').kind).toBe('hidden');
  });

  it.each([
    ['working', 'working', 'working'],
    ['limit', 'limit', 'hidden'],
    ['failed', 'failed', 'hidden'],
    ['dismissed', 'dismissed', 'hidden'],
  ] as const)('state %s → teacher %s, learner %s', (state, teacher, learner) => {
    expect(reasonView(item({ state }), 'teacher').kind).toBe(teacher);
    expect(reasonView(item({ state }), 'learner').kind).toBe(learner);
  });

  it('the pool message and the check-mark line are for the teacher only', () => {
    expect(reasonView(item({ state: 'limit' }), 'teacher').explanation).toBe(REASON_COPY.limit);
    const check = item({ reason: { ...item().reason!, checkMark: true, kind: 'generic' } });
    expect(reasonView(check, 'teacher')).toMatchObject({ kind: 'check', label: REASON_COPY.check });
    expect(reasonView(check, 'learner').kind).toBe('hidden');
  });

  it('flags low confidence for the teacher and says "General" for general types', () => {
    const low = item({ reason: { ...item().reason!, lowConfidence: true, kind: 'generic' } });
    expect(reasonView(low, 'teacher')).toMatchObject({ lowConfidence: true, caption: 'General' });
  });
});

describe('reasonKey and indexReasons', () => {
  it.each(['Q2.3', 'Question 2.3', '2.3.', ' 2.3 '])('%s finds the row for 2.3', (n) => {
    expect(indexReasons([item()]).get(reasonKey(n))?.rowId).toBe('r1');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/evidence-reason-view.test.ts`
Expected: FAIL — `Failed to resolve import "../src/lib/evidence/reason-view"`.

- [ ] **Step 4: Implement**

```ts
// src/types/evidence.ts
// Phase E: reasons for lost marks and the class's top three (backend Evidence module).
export type EvidenceSource = 'test' | 'homework';
export type ReasonAudience = 'teacher' | 'learner';
export type ReasonState = 'none' | 'working' | 'ready' | 'dismissed' | 'limit' | 'failed';
export type MisconceptionKind = 'misconception' | 'procedural' | 'generic';
export type MisconceptionStatus = 'seeded' | 'proposed' | 'approved' | 'merged' | 'retired';

export interface LostMarksReason {
  typeId: string;
  label: string;
  learnerLabel: string;
  kind: MisconceptionKind;
  topicTitle: string | null;
  explanation: string;
  lowConfidence: boolean;
  checkMark: boolean;
}

export interface LostMarksReasonItem {
  rowId: string;
  itemKey: string;
  position: number;
  marksAwarded: number;
  marksAvailable: number;
  state: ReasonState;
  reason: LostMarksReason | null;
}

export interface ClassMisconceptionRow {
  typeId: string;
  label: string;
  kind: 'misconception' | 'procedural';
  topicTitle: string | null;
  learners: number;
  lostMarks: number;
  questions: string[];
  students: Array<{ studentId: string; name: string; recordId: string }>;
}

export interface ClassMisconceptions {
  markedLearners: number;
  updatedAt: string;
  top: ClassMisconceptionRow[];
  generic: Array<{ typeId: string; label: string; learners: number }>;
  marksToCheck: number;
  working: number;
}

export interface MisconceptionTypeItem {
  id: string;
  code: string;
  kind: MisconceptionKind;
  status: MisconceptionStatus;
  label: string;
  learnerLabel: string;
  description: string;
  useCount: number;
  createdAt: string;
  subject: string;
  topic: string;
  suggestedMerge: { id: string; label: string; confidence: number } | null;
}
```

```ts
// src/lib/evidence/reason-view.ts
//
// What the "why marks were lost" block shows for one answer (spec §8.1).
// Pure, so every state is tested without a DOM.
import type { LostMarksReason, LostMarksReasonItem, ReasonAudience } from '@/types/evidence';

export const REASON_COPY = {
  eyebrowTeacher: 'Why marks were lost',
  eyebrowLearner: 'Why you lost marks',
  working: 'Working out why…',
  limit: "No reason this time: this month's AI limit for reasons is used up",
  failed: "Couldn't work out why",
  check: 'Check this mark: this answer may deserve credit',
  hidden: 'Hidden from the learner',
  lowConfidence: 'Low confidence',
  notRight: 'Not right',
  undo: 'Undo',
} as const;

export interface ReasonView {
  kind: 'hidden' | 'working' | 'limit' | 'failed' | 'reason' | 'check' | 'dismissed';
  eyebrow: string;
  label: string;
  explanation: string;
  caption: string | null;
  lowConfidence: boolean;
}

function caption(r: LostMarksReason): string {
  if (r.kind === 'generic') return 'General';
  return `${r.topicTitle ?? 'Topic'} · ${r.kind === 'procedural' ? 'method step' : 'topic misconception'}`;
}

export function reasonView(item: LostMarksReasonItem | undefined, audience: ReasonAudience): ReasonView {
  const teacher = audience === 'teacher';
  const hidden: ReasonView = {
    kind: 'hidden', eyebrow: teacher ? REASON_COPY.eyebrowTeacher : REASON_COPY.eyebrowLearner,
    label: '', explanation: '', caption: null, lowConfidence: false,
  };
  if (!item || item.marksAwarded >= item.marksAvailable) return hidden;
  const r = item.reason;
  switch (item.state) {
    case 'working':
      return { ...hidden, kind: 'working', explanation: REASON_COPY.working };
    case 'limit':
      return teacher ? { ...hidden, kind: 'limit', explanation: REASON_COPY.limit } : hidden;
    case 'failed':
      return teacher ? { ...hidden, kind: 'failed', explanation: REASON_COPY.failed } : hidden;
    case 'dismissed':
      return teacher && r ? { ...hidden, kind: 'dismissed', label: r.label } : hidden;
    case 'ready':
      if (!r) return hidden;
      if (r.checkMark) return teacher ? { ...hidden, kind: 'check', label: REASON_COPY.check, explanation: r.explanation } : hidden;
      return {
        kind: 'reason', eyebrow: hidden.eyebrow, label: teacher ? r.label : r.learnerLabel, explanation: r.explanation,
        caption: teacher ? caption(r) : null, lowConfidence: teacher && r.lowConfidence,
      };
    default:
      return hidden;
  }
}

/** The same normalisation as the backend's normaliseQuestionNumber: "Q2.3", "2.3." → "2.3". */
export function reasonKey(questionNumber: string): string {
  return questionNumber.normalize('NFKC').replace(/^\s*(question|q)\.?\s*/i, '').replace(/\s+/g, '').replace(/\.+$/, '');
}

export function indexReasons(items: readonly LostMarksReasonItem[]): Map<string, LostMarksReasonItem> {
  return new Map(items.map((i: LostMarksReasonItem) => [i.itemKey, i]));
}
```

```ts
// src/hooks/useLostMarkReasons.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import { indexReasons, reasonKey } from '@/lib/evidence/reason-view';
import type { EvidenceSource, LostMarksReasonItem } from '@/types/evidence';

/** Reasons for one marked test or homework submission. No request until there is a record. */
export function useLostMarkReasons(source: EvidenceSource, recordId: string | null | undefined) {
  const [items, setItems] = useState<LostMarksReasonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    if (!recordId) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/evidence/reasons', { params: { source, recordId } });
      setItems(unwrapResponse<{ items: LostMarksReasonItem[] }>(res).items ?? []);
    } catch (err: unknown) {
      console.error('Failed to load reasons for lost marks', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [source, recordId]);

  useEffect(() => { void reload(); }, [reload]);

  const setDismissed = useCallback(async (rowId: string, dismissed: boolean): Promise<void> => {
    setBusyRow(rowId);
    try {
      await apiClient.post(`/evidence/rows/${rowId}/${dismissed ? 'dismiss' : 'restore'}`);
      setItems((prev: LostMarksReasonItem[]) => prev.map((i: LostMarksReasonItem) =>
        (i.rowId === rowId ? { ...i, state: dismissed ? 'dismissed' : 'ready' } : i)));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't change that reason. Try again."));
    } finally {
      setBusyRow(null);
    }
  }, []);

  const byKey = useMemo(() => indexReasons(items), [items]);
  const reasonFor = useCallback((questionNumber: string) => byKey.get(reasonKey(questionNumber)), [byKey]);

  return {
    items, loading, byKey, reasonFor, busyRow, reload,
    dismiss: (rowId: string) => setDismissed(rowId, true),
    restore: (rowId: string) => setDismissed(rowId, false),
  };
}
```

```tsx
// src/components/evidence/LostMarksReason.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { REASON_COPY, reasonView } from '@/lib/evidence/reason-view';
import type { LostMarksReasonItem, ReasonAudience } from '@/types/evidence';

interface Props {
  item: LostMarksReasonItem | undefined;
  audience: ReasonAudience;
  onDismiss?: (rowId: string) => void;
  onRestore?: (rowId: string) => void;
  busy?: boolean;
}

/**
 * Spec §8.1: under the answer, after a hairline, in the same card. Colour only
 * in the 8px solid dot (mastery "weak" token; the attention token for a mark
 * to check). No tinted surface.
 */
export function LostMarksReason({ item, audience, onDismiss, onRestore, busy = false }: Props) {
  const view = reasonView(item, audience);
  if (view.kind === 'hidden') return null;
  const teacher = audience === 'teacher';
  return (
    <section aria-label={view.eyebrow} className="mt-3 border-t border-border pt-3">
      <p className="text-eyebrow font-semibold uppercase tracking-wide text-muted-foreground">{view.eyebrow}</p>
      {view.kind === 'working' && (
        <div className="mt-2 space-y-1.5" aria-live="polite">
          <p className="text-body text-muted-foreground">{view.explanation}</p>
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      )}
      {(view.kind === 'limit' || view.kind === 'failed') && <p className="mt-2 text-body text-muted-foreground">{view.explanation}</p>}
      {(view.kind === 'reason' || view.kind === 'check') && (
        <>
          <p className="mt-2 flex items-start gap-2 text-body font-semibold text-foreground">
            <span aria-hidden="true" className={`mt-[7px] size-2 shrink-0 rounded-full ${view.kind === 'check' ? 'bg-attention' : 'bg-mark-weak'}`} />
            <span className="min-w-0 break-words">{view.label}</span>
          </p>
          <p className="mt-1 text-body text-muted-foreground">{view.explanation}</p>
          {teacher && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {view.caption && <span className="text-caption text-muted-foreground">{view.caption}</span>}
              {view.lowConfidence && <span className="text-caption text-muted-foreground">{REASON_COPY.lowConfidence}</span>}
              {onDismiss && item && (
                <Button type="button" variant="ghost" className="min-h-11 sm:min-h-8" disabled={busy} onClick={() => onDismiss(item.rowId)}>
                  {REASON_COPY.notRight}
                </Button>
              )}
            </div>
          )}
        </>
      )}
      {view.kind === 'dismissed' && item && (
        <p className="mt-2 flex flex-wrap items-center gap-x-1 text-body text-muted-foreground">
          <span className="line-through">{view.label}</span>
          <span>· {REASON_COPY.hidden} ·</span>
          <Button type="button" variant="link" className="h-auto min-h-11 p-0 sm:min-h-0" disabled={busy} onClick={() => onRestore?.(item.rowId)}>
            {REASON_COPY.undo}
          </Button>
        </p>
      )}
    </section>
  );
}
```

`src/components/ai-tools/MarkingQuestionCard.tsx` — import `type ReactNode` from `'react'`; add `footer?: ReactNode;` to the props and render `{footer}` as the last child of `<CardContent>` (after the `editable` block).

`src/components/ai-tools/MarkingResults.tsx` — import `useLostMarkReasons` and `LostMarksReason`; after the existing hooks: `const reasons = useLostMarkReasons('test', marking.id);`; in `handleSave` after `await onUpdateMarks(questions);` add `await reasons.reload();`; on `<MarkingQuestionCard …>` add:

```tsx
            footer={(
              <LostMarksReason
                item={reasons.reasonFor(q.questionNumber)}
                audience="teacher"
                onDismiss={(id) => void reasons.dismiss(id)}
                onRestore={(id) => void reasons.restore(id)}
                busy={reasons.busyRow !== null}
              />
            )}
```

`src/components/student/StudentMarkingReview.tsx` — `const reasons = useLostMarkReasons('test', marking.id);` and on its `<MarkingQuestionCard …>`: `footer={<LostMarksReason item={reasons.reasonFor(q.questionNumber)} audience="learner" />}`.

`tests/no-tints.test.ts` — add `'src/components/evidence'` to the `BLUEPRINT` directory list.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run tests/evidence-reason-view.test.ts tests/no-tints.test.ts tests/file-size.test.ts && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/types src/lib/evidence src/hooks/useLostMarkReasons.ts src/components/evidence src/components/ai-tools src/components/student/StudentMarkingReview.tsx tests
LANE_SWEEP_OK=1 git commit -m "feat(evidence): why marks were lost on each marked answer, for the teacher and the learner" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 20: reasons on homework (the teacher's table and the learner's results)

**Files:**
- Create: `src/components/homework/HomeworkAnswerDetails.tsx` (the `SubmissionDetails` function moved out of `HomeworkSubmissionsTable.tsx`, plus teacher reasons)
- Modify: `src/components/homework/HomeworkSubmissionsTable.tsx` (render `HomeworkAnswerDetails` with the submission id)
- Modify: `src/components/homework/ExerciseSubmissionForm.tsx`, `ReadingSubmissionForm.tsx`, `QuizSubmissionForm.tsx` (learner reasons under the "Awarded" line)
- Modify: `src/lib/evidence/reason-view.ts` (`homeworkItemKey`)
- Test: `tests/evidence-reason-view.test.ts` (append)

**Interfaces:**
- Consumes: `useLostMarkReasons`, `LostMarksReason` (Task 19).
- Produces: `homeworkItemKey(answer: { questionId?: string; questionIndex?: number }, index: number): string` (questionId for exercise/reading, `q<index>` for quiz — the backend's `itemKey`, Task 7); `<HomeworkAnswerDetails submissionId answers lateMarkAdjustment />`.

- [ ] **Step 1: Write the failing test** (append to `tests/evidence-reason-view.test.ts`, and add `homeworkItemKey` to its import)

```ts
describe('homeworkItemKey', () => {
  it('uses the question id for exercises and readings, q<index> for quizzes', () => {
    expect(homeworkItemKey({ questionId: '66f0c0ffee0000000000abcd' }, 3)).toBe('66f0c0ffee0000000000abcd');
    expect(homeworkItemKey({ questionIndex: 2 }, 5)).toBe('q2');
    expect(homeworkItemKey({}, 4)).toBe('q4');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/evidence-reason-view.test.ts`
Expected: FAIL — `homeworkItemKey is not a function` (or a missing-export error).

- [ ] **Step 3: Implement**

`src/lib/evidence/reason-view.ts` — append:

```ts
/** The backend's homework itemKey (Evidence/writers/homework.ts): the question id, or q<index> for a quiz. */
export function homeworkItemKey(answer: { questionId?: string; questionIndex?: number }, index: number): string {
  return answer.questionId ?? `q${answer.questionIndex ?? index}`;
}
```

```tsx
// src/components/homework/HomeworkAnswerDetails.tsx
'use client';

import { LostMarksReason } from '@/components/evidence/LostMarksReason';
import { useLostMarkReasons } from '@/hooks/useLostMarkReasons';
import { homeworkItemKey } from '@/lib/evidence/reason-view';
import type { GradedAnswerBase, StructuredHomeworkSubmission } from '@/types/homework';

type Answer = GradedAnswerBase & { questionId?: string; questionIndex?: number };

interface Props {
  submissionId: string;
  answers: Answer[];
  lateMarkAdjustment?: StructuredHomeworkSubmission['lateMarkAdjustment'];
}

/** One submission's answers in the teacher's table, each with why marks were lost. Loads only when opened. */
export function HomeworkAnswerDetails({ submissionId, answers, lateMarkAdjustment }: Props) {
  const reasons = useLostMarkReasons('homework', submissionId);
  return (
    <div className="p-4 space-y-2">
      {answers.map((a: Answer, i: number) => (
        <div key={i} className="rounded border bg-card p-3 text-sm space-y-1">
          <p className="font-medium break-words">{a.questionSnapshot}</p>
          <p className="text-muted-foreground">
            Student:{' '}
            <span className="break-words text-foreground">{a.studentAnswer || '(blank)'}</span>
          </p>
          <p>
            Awarded: {a.awarded ?? '—'} / {a.maxMarks}{' '}
            <span className="text-xs text-muted-foreground capitalize">({a.gradingMethod})</span>
          </p>
          {a.rationale && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">AI rationale</summary>
              <p className="whitespace-pre-wrap mt-1 pl-2 border-l-2 border-muted">{a.rationale}</p>
            </details>
          )}
          <LostMarksReason
            item={reasons.byKey.get(homeworkItemKey(a, i))}
            audience="teacher"
            onDismiss={(id) => void reasons.dismiss(id)}
            onRestore={(id) => void reasons.restore(id)}
            busy={reasons.busyRow !== null}
          />
        </div>
      ))}
      {lateMarkAdjustment && (
        <p className="text-xs text-muted-foreground">
          Late penalty: {lateMarkAdjustment.rawMark} → {lateMarkAdjustment.finalMark} ({lateMarkAdjustment.penaltyPercent}%)
        </p>
      )}
    </div>
  );
}
```

The answer markup above is `SubmissionDetails`'s, moved as it is (`HomeworkSubmissionsTable.tsx:225-252`). Delete `SubmissionDetails` from `HomeworkSubmissionsTable.tsx` and render `<HomeworkAnswerDetails submissionId={s._id} answers={answers} lateMarkAdjustment={s.lateMarkAdjustment} />` where it was used (the submission object in that row is `s`; its id field is the one the table already uses as the row key — `s._id` on the Blueprint branch).

Learner forms — each imports `useLostMarkReasons` and `LostMarksReason`:
- `ExerciseSubmissionForm.tsx`: after `const liveSub = …`: `const reasons = useLostMarkReasons('homework', liveSub?.gradingStatus === 'graded' ? submittedId : null);`; inside the `{la && ( … )}` block, after the "Awarded" `</div>`: `<LostMarksReason item={reasons.byKey.get(q.id)} audience="learner" />`.
- `ReadingSubmissionForm.tsx`: the same, keyed `q.id`.
- `QuizSubmissionForm.tsx`: the same, keyed `` `q${i}` `` (the question's index in the map).

(Hooks are called before any early `return` in each component.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests && npx tsc --noEmit`
Expected: PASS; `tsc` prints nothing; `HomeworkSubmissionsTable.tsx` is shorter than before.

- [ ] **Step 5: Commit**

```bash
git add src/components/homework src/lib/evidence tests
LANE_SWEEP_OK=1 git commit -m "feat(evidence): why marks were lost on homework, in the teacher's table and the learner's results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 21: "Where the class lost marks" on the Marking tab and the homework page

**Files:**
- Create: `src/lib/evidence/class-view.ts`, `src/hooks/useClassMisconceptions.ts`, `src/components/evidence/ClassMisconceptions.tsx`
- Create: `src/components/papers/MarkingClassCard.tsx` (the class `<Card>` of `PaperDetailMarkingTab.tsx:110-170` with `RosterRow`, `SubmissionPill`, `MarkingPill`, `modeLabel`, `markedCount` moved in unchanged)
- Modify: `src/components/papers/PaperDetailMarkingTab.tsx` (renders `MarkingClassCard`; now < 200 lines)
- Modify: `src/hooks/useTeacherHomeworkDetail.ts` (`classId` on the detail), `src/app/(dashboard)/teacher/homework/[id]/page.tsx` (block above the submissions card)
- Test: `tests/evidence-class-view.test.ts`

**Interfaces:**
- Consumes: `GET /api/evidence/class-misconceptions` (Task 17); types (Task 19).
- Produces: `type ClassViewState = 'empty' | 'no_pattern' | 'full'`; `classViewState(d)`; `classCaption(d, noun: 'script' | 'submission'): string`; `alsoCommon(generic): string | null`; `barWidth(learners, marked): string`; `learnersLabel(n)`; `questionsLabel(keys, parent)`; `marksToCheckLabel(n): string | null`; `useClassMisconceptions(parent, parentId, classId): { data: ClassMisconceptions | null; loading: boolean; error: boolean; reload(): Promise<void> }`; `<ClassMisconceptions parent parentId classId onOpenScript? />`; `<MarkingClassCard paperId cls focused onReview onUpload onType onBatch />`; `HomeworkDetail.classId: string`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/evidence-class-view.test.ts
import { describe, expect, it } from 'vitest';
import {
  alsoCommon, barWidth, classCaption, classViewState, learnersLabel, marksToCheckLabel, questionsLabel,
} from '../src/lib/evidence/class-view';
import type { ClassMisconceptions } from '../src/types/evidence';

const data = (over: Partial<ClassMisconceptions> = {}): ClassMisconceptions => ({
  markedLearners: 24, updatedAt: '2026-10-01T08:42:00.000Z', top: [], generic: [], marksToCheck: 0, working: 0, ...over,
});

describe('class view', () => {
  it('knows empty, no pattern yet, and full', () => {
    expect(classViewState(data({ markedLearners: 0 }))).toBe('empty');
    expect(classViewState(data())).toBe('no_pattern');
    expect(classViewState(data({ top: [{ typeId: 't', label: 'x', kind: 'procedural', topicTitle: null, learners: 2, lostMarks: 2, questions: ['2.1'], students: [] }] }))).toBe('full');
  });

  it('captions the count and SAST time, and the answers still being worked out', () => {
    expect(classCaption(data(), 'script')).toBe('From 24 marked scripts · updated 10:42');
    expect(classCaption(data({ markedLearners: 1, working: 5 }), 'submission')).toBe('From 1 marked submission · updated 10:42 · Working out why for 5 more answers…');
  });

  it('writes the plain lines', () => {
    expect(alsoCommon([{ typeId: 'a', label: 'Arithmetic slip', learners: 6 }, { typeId: 'b', label: 'Not answered', learners: 4 }]))
      .toBe('Also common: Arithmetic slip (6) · Not answered (4)');
    expect(alsoCommon([])).toBeNull();
    expect(barWidth(11, 24)).toBe('46%');
    expect(barWidth(1, 0)).toBe('0%');
    expect(learnersLabel(1)).toBe('1 learner');
    expect(learnersLabel(11)).toBe('11 learners');
    expect(questionsLabel(['2.1', '2.3'], 'paper')).toBe('Q2.1, Q2.3');
    expect(questionsLabel(['66f0c0ffee0000000000abcd'], 'homework')).toBe('1 question');
    expect(marksToCheckLabel(3)).toBe('3 marks to check');
    expect(marksToCheckLabel(0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/evidence-class-view.test.ts`
Expected: FAIL — `Failed to resolve import "../src/lib/evidence/class-view"`.

- [ ] **Step 3: Implement**

```ts
// src/lib/evidence/class-view.ts
//
// The plain words of "Where the class lost marks" (spec §8.2). Pure.
import type { ClassMisconceptions } from '@/types/evidence';

export type ClassViewState = 'empty' | 'no_pattern' | 'full';

export function classViewState(d: ClassMisconceptions): ClassViewState {
  if (d.markedLearners === 0) return 'empty';
  return d.top.length === 0 ? 'no_pattern' : 'full';
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** South Africa is UTC+2 all year; the caption shows SAST whatever the browser's zone. */
function sastTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 2 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function classCaption(d: ClassMisconceptions, noun: 'script' | 'submission'): string {
  const base = `From ${d.markedLearners} marked ${noun}${d.markedLearners === 1 ? '' : 's'} · updated ${sastTime(d.updatedAt)}`;
  return d.working > 0 ? `${base} · Working out why for ${d.working} more ${d.working === 1 ? 'answer' : 'answers'}…` : base;
}

export function alsoCommon(generic: ClassMisconceptions['generic']): string | null {
  if (generic.length === 0) return null;
  return `Also common: ${generic.map((g) => `${g.label} (${g.learners})`).join(' · ')}`;
}

export function barWidth(learners: number, marked: number): string {
  return `${marked > 0 ? Math.round((learners / marked) * 100) : 0}%`;
}

export const learnersLabel = (n: number): string => plural(n, 'learner');

export function questionsLabel(keys: readonly string[], parent: 'paper' | 'homework'): string {
  return parent === 'paper' ? keys.map((k: string) => `Q${k}`).join(', ') : plural(keys.length, 'question');
}

export function marksToCheckLabel(n: number): string | null {
  return n > 0 ? `${plural(n, 'mark')} to check` : null;
}
```

```ts
// src/hooks/useClassMisconceptions.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { ClassMisconceptions } from '@/types/evidence';

export function useClassMisconceptions(parent: 'paper' | 'homework', parentId: string | undefined, classId: string | undefined) {
  const [data, setData] = useState<ClassMisconceptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    if (!parentId || !classId) return;
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get('/evidence/class-misconceptions', { params: { parent, parentId, classId } });
      setData(unwrapResponse<ClassMisconceptions>(res));
    } catch (err: unknown) {
      console.error('Failed to load where the class lost marks', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [parent, parentId, classId]);

  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}
```

```tsx
// src/components/evidence/ClassMisconceptions.tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useClassMisconceptions } from '@/hooks/useClassMisconceptions';
import {
  alsoCommon, barWidth, classCaption, classViewState, learnersLabel, marksToCheckLabel, questionsLabel,
} from '@/lib/evidence/class-view';
import type { ClassMisconceptionRow } from '@/types/evidence';

interface Props {
  parent: 'paper' | 'homework';
  parentId: string;
  classId: string;
  /** Opens a learner's marked script (the paper's review dialog). */
  onOpenScript?: (recordId: string) => void;
}

function Row({ row, rank, marked, parent, onOpenScript }: { row: ClassMisconceptionRow; rank: number; marked: number; parent: Props['parent']; onOpenScript?: Props['onOpenScript'] }) {
  const [open, setOpen] = useState(false);
  const panelId = `class-lost-${row.typeId}`;
  return (
    <li className="py-3">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-start gap-3 rounded-control text-left">
        <span className="font-heading text-body tabular-nums text-muted-foreground">{rank}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <span className="min-w-0">
              <span className="block font-semibold text-foreground break-words">{row.label}</span>
              {row.topicTitle && <span className="block text-caption text-muted-foreground">{row.topicTitle}</span>}
            </span>
            <span className="shrink-0 font-heading text-small tabular-nums text-foreground">{learnersLabel(row.learners)}</span>
          </span>
          <span className="mt-2 block h-1.5 rounded-full bg-muted">
            <span className="block h-full rounded-full bg-mark-weak" style={{ width: barWidth(row.learners, marked) }} />
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="mt-2 space-y-1 pl-7 text-small">
          <p className="text-muted-foreground">{questionsLabel(row.questions, parent)}</p>
          <ul className="space-y-1">
            {row.students.map((s) => (
              <li key={s.studentId}>
                {onOpenScript ? (
                  <Button type="button" variant="link" className="h-auto min-h-11 p-0 sm:min-h-0" onClick={() => onOpenScript(s.recordId)}>{s.name}</Button>
                ) : (
                  <span>{s.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/** Spec §8.2. White card surface, colour only in the solid bar on a neutral track. */
export function ClassMisconceptions({ parent, parentId, classId, onOpenScript }: Props) {
  const { data, loading, error, reload } = useClassMisconceptions(parent, parentId, classId);
  const headingId = `class-lost-heading-${classId}`;
  return (
    <section aria-labelledby={headingId} className="border-t border-border px-4 py-4">
      <h3 id={headingId} className="font-heading text-h3 font-semibold">Where the class lost marks</h3>
      {loading && !data && (
        <div className="mt-3 space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}
      {error && !loading && <ErrorState message="Couldn't load where the class lost marks." onRetry={() => void reload()} />}
      {data && !error && (
        <>
          <p className="mt-1 text-caption text-muted-foreground">{classCaption(data, parent === 'paper' ? 'script' : 'submission')}</p>
          {classViewState(data) === 'empty' && <p className="mt-3 text-body text-muted-foreground">Reasons appear here once scripts are marked.</p>}
          {classViewState(data) === 'no_pattern' && <p className="mt-3 text-body text-muted-foreground">No shared patterns yet. Each reason so far is one learner&apos;s.</p>}
          {classViewState(data) === 'full' && (
            <ol className="mt-2 divide-y divide-border">
              {data.top.map((row, i) => <Row key={row.typeId} row={row} rank={i + 1} marked={data.markedLearners} parent={parent} onOpenScript={onOpenScript} />)}
            </ol>
          )}
          {alsoCommon(data.generic) && <p className="mt-2 text-small text-muted-foreground">{alsoCommon(data.generic)}</p>}
          {marksToCheckLabel(data.marksToCheck) && <p className="mt-1 text-small text-muted-foreground">{marksToCheckLabel(data.marksToCheck)}</p>}
        </>
      )}
    </section>
  );
}
```

```tsx
// src/components/papers/MarkingClassCard.tsx
'use client';

// One assigned class on the paper's Marking tab: header, where the class lost
// marks, then the roster. Extracted from PaperDetailMarkingTab (spec §8.2) so
// both files stay under 300 lines; the roster markup is unchanged.
import { Camera, CheckCircle2, ClipboardList, Keyboard, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClassMisconceptions } from '@/components/evidence/ClassMisconceptions';
import { LearnerLink } from '@/components/students/LearnerLink';
import { cn } from '@/lib/utils';
import type { PaperAssignmentMode, PaperMarkingStatus, RosterClass, RosterStudent, SubmissionStatus } from '@/types/papers';

interface Props {
  paperId: string;
  cls: RosterClass;
  focused: boolean;
  onReview: (markingId: string) => void;
  onUpload: (student: RosterStudent) => void;
  onType: (student: RosterStudent) => void;
  onBatch: () => void;
}

export function MarkingClassCard({ paperId, cls, focused, onReview, onUpload, onType, onBatch }: Props) {
  return (
    <Card id={`marking-class-${cls.classId}`} className={cn('scroll-mt-20', focused && 'ring-2 ring-primary/40')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" />{cls.className}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{modeLabel(cls.mode)}</Badge>
            <Badge variant="secondary">{markedCount(cls.students)}/{cls.studentCount} marked</Badge>
            {cls.mode === 'paper' && cls.students.length > 0 && (
              <Button size="sm" variant="outline" onClick={onBatch}><Users className="mr-1.5 h-3.5 w-3.5" />Batch upload</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <ClassMisconceptions parent="paper" parentId={paperId} classId={cls.classId} onOpenScript={onReview} />
      <CardContent className="p-0">
        {cls.students.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No students enrolled in this class yet.</p>
        ) : (
          <ul className="divide-y">
            {cls.students.map((s) => (
              <RosterRow key={s.studentId} student={s} mode={cls.mode} onReview={onReview} onUpload={() => onUpload(s)} onType={() => onType(s)} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface RowProps {
  student: RosterStudent;
  mode: PaperAssignmentMode;
  onReview: (markingId: string) => void;
  onUpload: () => void;
  onType: () => void;
}

function RosterRow({ student, mode, onReview, onUpload, onType }: RowProps) {
  const m = student.marking;
  const s = student.submission;
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <LearnerLink studentId={student.studentId} name={student.studentName} className="block font-medium truncate" />
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {student.admissionNumber && <span>{student.admissionNumber}</span>}
          {s && <SubmissionPill status={s.status} />}
          {m && <MarkingPill status={m.status} percentage={m.percentage} />}
          {!s && !m && <span className="text-muted-foreground">No work yet</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1 flex-wrap justify-end">
        {m ? (
          <Button variant="outline" size="sm" onClick={() => onReview(m.markingId)}>Review marking</Button>
        ) : (
          <>
            <Button variant={mode === 'paper' ? 'default' : 'outline'} size="sm" onClick={onUpload}>
              <Camera className="mr-1.5 h-3.5 w-3.5" /> Upload pages
            </Button>
            <Button variant="outline" size="sm" onClick={onType}>
              <Keyboard className="mr-1.5 h-3.5 w-3.5" /> Type answers
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function SubmissionPill({ status }: { status: Exclude<SubmissionStatus, 'not_started'> }) {
  const map: Record<typeof status, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    in_progress: { label: 'In progress', variant: 'outline' },
    submitted: { label: 'Submitted online', variant: 'secondary' },
    graded: { label: 'Graded', variant: 'default' },
    published: { label: 'Published', variant: 'default' },
  };
  const info = map[status];
  return <Badge variant={info.variant} className="text-[10px] capitalize">{info.label}</Badge>;
}

function MarkingPill({ status, percentage }: { status: PaperMarkingStatus; percentage: number }) {
  if (status === 'processing') {
    return <Badge variant="outline" className="text-[10px]"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Marking…</Badge>;
  }
  if (status === 'failed') return <Badge variant="destructive" className="text-[10px]">Marking failed</Badge>;
  if (status === 'needs_review') return <Badge variant="outline" className="text-[10px]">Needs review</Badge>;
  return <Badge variant="default" className="text-[10px]"><CheckCircle2 className="mr-1 h-3 w-3" /> {percentage}%</Badge>;
}

function modeLabel(mode: PaperAssignmentMode): string {
  return mode === 'digital' ? 'Digital' : 'Printed';
}

function markedCount(students: RosterStudent[]): number {
  return students.filter((s) => !!s.marking).length;
}
```

(These five are `PaperDetailMarkingTab.tsx:242-322` as they are on the Blueprint branch; if the merged file differs, move the merged versions, unchanged.)

`src/components/papers/PaperDetailMarkingTab.tsx` — replace the `roster.classes.map((cls) => (<Card …>…</Card>))` block with:

```tsx
      {roster.classes.map((cls) => (
        <MarkingClassCard
          key={cls.classId}
          paperId={paper._id}
          cls={cls}
          focused={cls.classId === focusClassId}
          onReview={(id) => setReviewMarkingId(id)}
          onUpload={(s) => setUploadTarget({ classId: cls.classId, studentId: s.studentId, studentName: s.studentName })}
          onType={(s) => setTextTarget({ classId: cls.classId, studentId: s.studentId, studentName: s.studentName })}
          onBatch={() => setBatchTarget({ classId: cls.classId, className: cls.className })}
        />
      ))}
```

and delete the moved helpers and now-unused imports.

`src/hooks/useTeacherHomeworkDetail.ts` — add `classId: string;` to `HomeworkDetail` and, in `setHomework({ … })`, `classId: String(classObj?.id ?? classObj?._id ?? (typeof raw.classId === 'string' ? raw.classId : '')),`.

`src/app/(dashboard)/teacher/homework/[id]/page.tsx` — directly above the "Submissions" `<Card>`:

```tsx
      {homework.classId && (
        <Card className="overflow-hidden p-0">
          <ClassMisconceptions parent="homework" parentId={homework.id} classId={homework.classId} />
        </Card>
      )}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests && npx tsc --noEmit && wc -l src/components/papers/PaperDetailMarkingTab.tsx src/components/papers/MarkingClassCard.tsx src/components/evidence/*.tsx`
Expected: PASS; `tsc` silent; every listed file ≤ 300 lines.

- [ ] **Step 5: Commit**

```bash
git add src/lib/evidence src/hooks src/components/evidence src/components/papers "src/app/(dashboard)/teacher/homework" tests
LANE_SWEEP_OK=1 git commit -m "feat(evidence): where the class lost marks, on the paper's Marking tab and the homework page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 22: the super-admin misconceptions review page

**Files:**
- Create: `src/lib/evidence/taxonomy-view.ts`, `src/hooks/useMisconceptionTypes.ts`, `src/components/evidence/MisconceptionTypeDialogs.tsx`, `src/components/evidence/MisconceptionTypesTable.tsx`, `src/app/(dashboard)/superadmin/misconceptions/page.tsx`
- Modify: `src/lib/routes.ts` (`SUPERADMIN_MISCONCEPTIONS: '/superadmin/misconceptions'`), `src/lib/constants.ts` (`SUPERADMIN_NAV` gains `{ label: 'Misconceptions', href: ROUTES.SUPERADMIN_MISCONCEPTIONS, icon: ListChecks }`)
- Test: `tests/evidence-taxonomy-view.test.ts`

**Interfaces:**
- Consumes: `GET/PATCH/POST /api/evidence/taxonomy…` (Task 16).
- Produces: `STATUS_LABEL: Record<MisconceptionStatus, string>`; `mergeTargets(types: readonly MisconceptionTypeItem[], current: MisconceptionTypeItem): MisconceptionTypeItem[]` (same topic, active, not itself); `suggestionLine(t): string | null` ("Suggested merge: <label> (92%)"); `useMisconceptionTypes(status: MisconceptionStatus | 'all'): { types; loading; error; reload; approve(id); rename(id, patch); merge(id, intoId); retire(id, replacementId?) }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/evidence-taxonomy-view.test.ts
import { describe, expect, it } from 'vitest';
import { STATUS_LABEL, mergeTargets, suggestionLine } from '../src/lib/evidence/taxonomy-view';
import type { MisconceptionTypeItem } from '../src/types/evidence';

const t = (id: string, topic: string, status: MisconceptionTypeItem['status'] = 'seeded'): MisconceptionTypeItem => ({
  id, code: `c.${id}`, kind: 'misconception', status, label: id, learnerLabel: id, description: '', useCount: 0, createdAt: '', subject: 'Maths', topic, suggestedMerge: null,
});

describe('taxonomy view', () => {
  it('offers only active types of the same topic to merge into', () => {
    const all = [t('a', 'Functions', 'proposed'), t('b', 'Functions'), t('c', 'Functions', 'retired'), t('d', 'Sequences')];
    expect(mergeTargets(all, all[0]).map((x) => x.id)).toEqual(['b']);
  });

  it('writes the suggestion line and the status labels', () => {
    expect(suggestionLine({ ...t('a', 'F'), suggestedMerge: { id: 'b', label: 'Sign error', confidence: 0.92 } })).toBe('Suggested merge: Sign error (92%)');
    expect(suggestionLine(t('a', 'F'))).toBeNull();
    expect(STATUS_LABEL.proposed).toBe('Proposed');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/evidence-taxonomy-view.test.ts`
Expected: FAIL — `Failed to resolve import "../src/lib/evidence/taxonomy-view"`.

- [ ] **Step 3: Implement**

```ts
// src/lib/evidence/taxonomy-view.ts
import type { MisconceptionStatus, MisconceptionTypeItem } from '@/types/evidence';

export const STATUS_LABEL: Record<MisconceptionStatus, string> = {
  seeded: 'Seeded', proposed: 'Proposed', approved: 'Approved', merged: 'Merged', retired: 'Retired',
};

const ACTIVE = new Set<MisconceptionStatus>(['seeded', 'proposed', 'approved']);

export function mergeTargets(types: readonly MisconceptionTypeItem[], current: MisconceptionTypeItem): MisconceptionTypeItem[] {
  return types.filter((x) => x.id !== current.id && x.topic === current.topic && ACTIVE.has(x.status));
}

export function suggestionLine(t: MisconceptionTypeItem): string | null {
  return t.suggestedMerge ? `Suggested merge: ${t.suggestedMerge.label} (${Math.round(t.suggestedMerge.confidence * 100)}%)` : null;
}
```

```ts
// src/hooks/useMisconceptionTypes.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapList } from '@/lib/api-helpers';
import type { MisconceptionStatus, MisconceptionTypeItem } from '@/types/evidence';

export function useMisconceptionTypes(status: MisconceptionStatus | 'all') {
  const [types, setTypes] = useState<MisconceptionTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get('/evidence/taxonomy', { params: status === 'all' ? {} : { status } });
      setTypes(unwrapList<MisconceptionTypeItem>(res));
    } catch (err: unknown) {
      console.error('Failed to load misconception types', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void reload(); }, [reload]);

  const act = useCallback(async (call: () => Promise<unknown>, done: string): Promise<void> => {
    try {
      await call();
      toast.success(done);
      await reload();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "That didn't work. Try again."));
      throw err;
    }
  }, [reload]);

  return {
    types, loading, error, reload,
    approve: (id: string) => act(() => apiClient.post(`/evidence/taxonomy/${id}/approve`), 'Approved'),
    rename: (id: string, patch: { label: string; learnerLabel: string; description: string }) =>
      act(() => apiClient.patch(`/evidence/taxonomy/${id}`, patch), 'Saved'),
    merge: (id: string, intoId: string) => act(() => apiClient.post(`/evidence/taxonomy/${id}/merge`, { intoId }), 'Merged'),
    retire: (id: string) => act(() => apiClient.post(`/evidence/taxonomy/${id}/retire`, {}), 'Retired'),
  };
}
```

```tsx
// src/components/evidence/MisconceptionTypeDialogs.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MisconceptionTypeItem } from '@/types/evidence';

interface RenameProps {
  type: MisconceptionTypeItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: { label: string; learnerLabel: string; description: string }) => Promise<void>;
}

export function RenameTypeDialog({ type, onOpenChange, onSave }: RenameProps) {
  const [label, setLabel] = useState('');
  const [learnerLabel, setLearnerLabel] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (type) { setLabel(type.label); setLearnerLabel(type.learnerLabel); setDescription(type.description); }
  }, [type]);
  const save = async (): Promise<void> => {
    if (!type) return;
    setSaving(true);
    try { await onSave(type.id, { label, learnerLabel, description }); onOpenChange(false); } catch { /* the hook toasted */ } finally { setSaving(false); }
  };
  return (
    <Dialog open={type !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader><DialogTitle>Rename misconception</DialogTitle></DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-1.5">
            <Label htmlFor="type-label">Label for teachers <span className="text-destructive">*</span></Label>
            <Input id="type-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type-learner-label">Label for learners <span className="text-destructive">*</span></Label>
            <Input id="type-learner-label" value={learnerLabel} maxLength={60} onChange={(e) => setLearnerLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="type-description">What it looks like in an answer</Label>
            <Textarea id="type-description" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving || label.trim().length < 2 || learnerLabel.trim().length < 2}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MergeProps {
  type: MisconceptionTypeItem | null;
  targets: MisconceptionTypeItem[];
  onOpenChange: (open: boolean) => void;
  onMerge: (id: string, intoId: string) => Promise<void>;
}

export function MergeTypeDialog({ type, targets, onOpenChange, onMerge }: MergeProps) {
  const [intoId, setIntoId] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (type) setIntoId(type.suggestedMerge?.id ?? ''); }, [type]);
  const merge = async (): Promise<void> => {
    if (!type || !intoId) return;
    setSaving(true);
    try { await onMerge(type.id, intoId); onOpenChange(false); } catch { /* the hook toasted */ } finally { setSaving(false); }
  };
  return (
    <Dialog open={type !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader><DialogTitle>Merge “{type?.label}” into…</DialogTitle></DialogHeader>
        <div className="flex-1 space-y-1.5 overflow-y-auto py-4">
          <Label htmlFor="merge-into">Keep this type</Label>
          <Select value={intoId || undefined} onValueChange={(v: unknown) => setIntoId(String(v))}>
            <SelectTrigger id="merge-into" className="w-full"><SelectValue placeholder="Choose a type of the same topic" /></SelectTrigger>
            <SelectContent>
              {targets.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-small text-muted-foreground">Every answer and cached reason moves to the type you keep.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void merge()} disabled={saving || !intoId}>Merge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

```tsx
// src/components/evidence/MisconceptionTypesTable.tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/shared/DataTable';
import { STATUS_LABEL, suggestionLine } from '@/lib/evidence/taxonomy-view';
import type { MisconceptionTypeItem } from '@/types/evidence';

interface Props {
  types: MisconceptionTypeItem[];
  onApprove: (t: MisconceptionTypeItem) => void;
  onRename: (t: MisconceptionTypeItem) => void;
  onMerge: (t: MisconceptionTypeItem) => void;
  onRetire: (t: MisconceptionTypeItem) => void;
}

export function MisconceptionTypesTable({ types, onApprove, onRename, onMerge, onRetire }: Props) {
  const columns: ColumnDef<MisconceptionTypeItem>[] = [
    { accessorKey: 'subject', header: 'Subject' },
    { accessorKey: 'topic', header: 'Topic' },
    {
      accessorKey: 'label', header: 'Label',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium break-words">{row.original.label}</p>
          {suggestionLine(row.original) && <p className="text-caption text-muted-foreground">{suggestionLine(row.original)}</p>}
        </div>
      ),
    },
    { accessorKey: 'kind', header: 'Kind', cell: ({ row }) => <span className="capitalize">{row.original.kind}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant="secondary">{STATUS_LABEL[row.original.status]}</Badge> },
    { accessorKey: 'useCount', header: 'Uses', cell: ({ row }) => <span className="tabular-nums">{row.original.useCount}</span> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('en-ZA') },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${row.original.label}`} className="size-11 sm:size-8" />}>
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.status === 'proposed' && <DropdownMenuItem onClick={() => onApprove(row.original)}>Approve</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => onRename(row.original)}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMerge(row.original)}>Merge into…</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRetire(row.original)}>Retire</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return <DataTable columns={columns} data={types} searchKey="label" />;
}
```

(`DropdownMenuTrigger` takes `render={<Button …/>}` as in `components/ai-tutor/AuraHeader.tsx:146`.)

```tsx
// src/app/(dashboard)/superadmin/misconceptions/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ListSkeleton } from '@/components/shared/skeletons';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MisconceptionTypesTable } from '@/components/evidence/MisconceptionTypesTable';
import { MergeTypeDialog, RenameTypeDialog } from '@/components/evidence/MisconceptionTypeDialogs';
import { useMisconceptionTypes } from '@/hooks/useMisconceptionTypes';
import { STATUS_LABEL, mergeTargets } from '@/lib/evidence/taxonomy-view';
import type { MisconceptionStatus, MisconceptionTypeItem } from '@/types/evidence';

type Filter = MisconceptionStatus | 'all';

export default function SuperAdminMisconceptionsPage() {
  const [status, setStatus] = useState<Filter>('proposed');
  const { types, loading, error, reload, approve, rename, merge, retire } = useMisconceptionTypes(status);
  const [renaming, setRenaming] = useState<MisconceptionTypeItem | null>(null);
  const [merging, setMerging] = useState<MisconceptionTypeItem | null>(null);
  const [retiring, setRetiring] = useState<MisconceptionTypeItem | null>(null);
  const targets = useMemo(() => (merging ? mergeTargets(types, merging) : []), [types, merging]);

  return (
    <div className="space-y-6">
      <PageHeader title="Misconceptions" description="The shared list of reasons learners lose marks. New proposals wait here for review." />
      <div className="w-full space-y-1.5 sm:w-56">
        <Label htmlFor="type-status">Show</Label>
        <Select value={status} onValueChange={(v: unknown) => setStatus(v as Filter)}>
          <SelectTrigger id="type-status" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {(Object.keys(STATUS_LABEL) as MisconceptionStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {loading && <ListSkeleton rows={6} withAvatar={false} />}
      {!loading && error && <ErrorState message="Couldn't load the misconception list." onRetry={() => void reload()} />}
      {!loading && !error && types.length === 0 && <EmptyState title="Nothing to review" description="New proposals from diagnosis appear here." />}
      {!loading && !error && types.length > 0 && (
        <MisconceptionTypesTable types={types} onApprove={(t) => void approve(t.id).catch(() => undefined)} onRename={setRenaming} onMerge={setMerging} onRetire={setRetiring} />
      )}
      <RenameTypeDialog type={renaming} onOpenChange={(o) => { if (!o) setRenaming(null); }} onSave={rename} />
      <MergeTypeDialog type={merging} targets={targets} onOpenChange={(o) => { if (!o) setMerging(null); }} onMerge={merge} />
      <ConfirmDialog
        open={retiring !== null}
        onOpenChange={(o) => { if (!o) setRetiring(null); }}
        title={`Retire “${retiring?.label ?? ''}”?`}
        description="Answers with this reason move to “Answer incomplete”. Use Merge to move them to a closer type instead."
        confirmLabel="Retire"
        variant="destructive"
        onConfirm={async () => { if (retiring) await retire(retiring.id); }}
      />
    </div>
  );
}
```

`src/lib/routes.ts` — add `SUPERADMIN_MISCONCEPTIONS: '/superadmin/misconceptions',`; `src/lib/constants.ts` — import `ListChecks` from `lucide-react` and append `{ label: 'Misconceptions', href: ROUTES.SUPERADMIN_MISCONCEPTIONS, icon: ListChecks }` to `SUPERADMIN_NAV`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests && npx tsc --noEmit`
Expected: PASS (including `nav-config` and `no-tints`); `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib src/hooks/useMisconceptionTypes.ts src/components/evidence "src/app/(dashboard)/superadmin/misconceptions" tests
LANE_SWEEP_OK=1 git commit -m "feat(evidence): super-admin review of the misconception list (approve, rename, merge, retire)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 23: the walkthrough, the machine gate and the measurement

**Files:**
- Modify: `e2e/support/db.ts` (export `withDb` and `userByEmail`)
- Create: `e2e/support/evidence-seed.ts`
- Create: `e2e/evidence-walkthrough.spec.ts`
- Modify: `e2e/support/session.ts` (`signInAsSuperAdmin`)
- Modify: `e2e/design-gate.spec.ts` (two tests: the paper's Marking tab and `/superadmin/misconceptions`)
- Modify: `scripts/design-gate.mjs` (the walkthrough step also runs `e2e/evidence-walkthrough.spec.ts`)
- Modify: `e2e/baselines/request-sets.json` (re-recorded only where the diff is new `/api/evidence/*` calls)
- Modify: `e2e/README.md` (the backend for this walkthrough is the E worktree; `E2E_BACKEND_DIR`)

**Interfaces:**
- Consumes: every backend task; Tasks 19–22; L-C's invite-link sign-up (`/register-student?code=`), `watchPage`, `overflowsSideways`, `signInAsStandaloneTeacher`, the gate's `sweep`.
- Produces: `interface DevGroup { id: ObjectId; code: string; name: string; schoolId: ObjectId; teacherId: ObjectId; gradeId: ObjectId }`; `devTeacherGroup(): Promise<DevGroup>`; `seedEvidenceTest(group): Promise<{ paperId: string; title: string; subjectId: string }>`; `seedEvidenceHomework(group): Promise<{ title: string }>`; `interface MarkedAnswer { n: string; answer: string; awarded: number; max: number }`; `seedAIMarkings(paperId, group, byEmail: Record<string, MarkedAnswer[]>): Promise<void>`; `runBackendScript(name: string, args: string[], env?: Record<string, string>): void`; `paperEvidence(paperId): Promise<{ rows: number; final: number; withTopic: number; withLevel: number; sharedKeys: number; requestsForShared: number }>`; `signInAsSuperAdmin(page): Promise<void>`.

- [ ] **Step 1: Write the seeders**

`e2e/support/db.ts` — put `export` in front of `async function withDb` and `async function userByEmail`.

```ts
// e2e/support/evidence-seed.ts
/**
 * Phase E walkthrough seeding, dev database only. No API key is configured
 * locally, so (as Phase L's walkthrough seeds AI-made work) this seeds the AI
 * marking of the learners' online test; the backend's own scripts then write
 * the evidence and diagnose it with EVIDENCE_DIAGNOSIS_MODE=fixture (plan
 * ruling P16). Collection names are Mongoose's defaults.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { ObjectId, type Db } from 'mongodb';
import { userByEmail, withDb } from './db';

const BACKEND_DIR = process.env.E2E_BACKEND_DIR ?? 'C:/dev/campusly/.worktrees/backend-evidence';

export interface DevGroup { id: ObjectId; code: string; name: string; schoolId: ObjectId; teacherId: ObjectId; gradeId: ObjectId }
export interface MarkedAnswer { n: string; answer: string; awarded: number; max: number }

/** The dev sign-in panel's standalone teacher (Lindiwe) and her first group. */
export async function devTeacherGroup(): Promise<DevGroup> {
  return withDb(async (db) => {
    const teacher = await db.collection('users').findOne({ isStandaloneTeacher: true, firstName: 'Lindiwe', isDeleted: false });
    if (!teacher) throw new Error('No dev standalone teacher: seed the dev database first');
    const group = await db.collection('classes').findOne(
      { schoolId: teacher.schoolId, isDeleted: false, classroomCode: { $exists: true } }, { sort: { createdAt: 1 } },
    );
    if (!group) throw new Error('The dev standalone teacher has no group');
    return { id: group._id, code: String(group.classroomCode), name: String(group.name), schoolId: teacher.schoolId, teacherId: teacher._id, gradeId: group.gradeId };
  });
}

async function contentTopic(db: Db): Promise<{ topic: ObjectId; subtopic: ObjectId | null }> {
  const topic = await db.collection('curriculumnodes').findOne({
    type: 'topic', schoolId: null, isDeleted: false, title: { $not: /revision|exam|test|assessment/i },
  });
  if (!topic) throw new Error('No CAPS topics in the dev database: run the CAPS import first');
  const sub = await db.collection('curriculumnodes').findOne({ type: 'subtopic', parentId: topic._id, isDeleted: false });
  return { topic: topic._id, subtopic: sub?._id ?? null };
}

/** A finalised online test for the group: one bank question and two tagged inline questions (labels 1.1, 1.2, 2.1). */
export async function seedEvidenceTest(group: DevGroup): Promise<{ paperId: string; title: string; subjectId: string }> {
  const title = `Algebra check ${randomBytes(2).toString('hex')}`;
  return withDb(async (db) => {
    const { topic, subtopic } = await contentTopic(db);
    const now = new Date();
    const subjectId = new ObjectId();
    const bank = await db.collection('questions').insertOne({
      curriculumNodeId: subtopic ?? topic, schoolId: group.schoolId, subjectId, gradeId: group.gradeId, type: 'short_answer',
      stem: 'Simplify 2x + 3x.', media: [], options: [], answer: '5x', markingRubric: 'Add like terms.', marks: 2,
      cognitiveLevel: { caps: 'knowledge', blooms: 'remember' }, difficulty: 2, tags: [], source: 'teacher', status: 'approved',
      createdBy: group.teacherId, isDeleted: false, createdAt: now, updatedAt: now,
    });
    const inline = (questionText: string, marks: number, position: number, modelAnswer: string, capsLevel: string) => ({
      questionId: null, questionText, options: [], marks, position, modelAnswer, markingGuideline: 'Method and answer.', diagram: null,
      curriculumNodeId: topic, capsLevel, tagFrom: 'generator',
    });
    const paper = await db.collection('assessmentpapers').insertOne({
      schoolId: group.schoolId, title, subjectId, gradeId: group.gradeId, topicIds: [topic], term: 3, year: now.getFullYear(),
      paperType: 'class_test', totalMarks: 7, duration: 20, instructions: '', capsCompliance: null, status: 'finalised', aiGenerated: false,
      difficulty: 'medium', version: 1, createdBy: group.teacherId, isDeleted: false, createdAt: now, updatedAt: now,
      sections: [
        { title: 'Section A', instructions: '', order: 0, questions: [
          { questionId: bank.insertedId, questionText: null, options: [], marks: 2, position: 0, modelAnswer: null, markingGuideline: null, diagram: null, curriculumNodeId: null, capsLevel: null, tagFrom: null },
          inline('Solve for x: 2x = 4.', 2, 1, 'x = 2', 'routine'),
        ] },
        { title: 'Section B', instructions: '', order: 1, questions: [inline('Explain why any non-zero number to the power 0 is 1.', 3, 0, 'a^n ÷ a^n = a^0 = 1', 'complex')] },
      ],
      assignments: [{ _id: new ObjectId(), classId: group.id, mode: 'digital', releaseAt: null, dueAt: new Date(now.getTime() + 3 * 86_400_000), assignedBy: group.teacherId, assignedAt: now }],
    });
    return { paperId: String(paper.insertedId), title, subjectId: String(subjectId) };
  });
}

/** An exercise of two multiple-choice bank questions for the group (marked instantly, no AI). */
export async function seedEvidenceHomework(group: DevGroup): Promise<{ title: string }> {
  const title = `Exponents practice ${randomBytes(2).toString('hex')}`;
  await withDb(async (db) => {
    const { topic } = await contentTopic(db);
    const now = new Date();
    const subjectId = new ObjectId();
    const mcq = (stem: string, right: string, wrong: string) => ({
      curriculumNodeId: topic, schoolId: group.schoolId, subjectId, gradeId: group.gradeId, type: 'mcq', stem, media: [],
      options: [{ label: 'A', text: right, isCorrect: true }, { label: 'B', text: wrong, isCorrect: false }], answer: 'A', markingRubric: '', marks: 1,
      cognitiveLevel: { caps: 'knowledge', blooms: 'remember' }, difficulty: 2, tags: [], source: 'teacher', status: 'approved',
      createdBy: group.teacherId, isDeleted: false, createdAt: now, updatedAt: now,
    });
    const qs = await db.collection('questions').insertMany([mcq('2^3 = ?', '8', '6'), mcq('5^0 = ?', '1', '0')]);
    await db.collection('homeworks').insertOne({
      title, type: 'exercise', exerciseQuestionIds: Object.values(qs.insertedIds), subjectId, classId: group.id, schoolId: group.schoolId,
      teacherId: group.teacherId, dueDate: new Date(now.getTime() + 3 * 86_400_000), totalMarks: 2, status: 'assigned', attachments: [],
      latePolicy: 'accept', gradebookAutoPublish: false, version: 1, isDeleted: false, createdAt: now, updatedAt: now,
    });
  });
  return { title };
}

/** Each learner's script as the AI marking would save it (markPaperFromText), newer than the failed attempt. */
export async function seedAIMarkings(paperId: string, group: DevGroup, byEmail: Record<string, MarkedAnswer[]>): Promise<void> {
  await withDb(async (db) => {
    for (const [email, answers] of Object.entries(byEmail)) {
      const user = await userByEmail(db, email);
      const [student, account] = await Promise.all([
        db.collection('students').findOne({ userId: user._id, isDeleted: false }),
        db.collection('users').findOne({ _id: user._id }),
      ]);
      if (!student) throw new Error(`No learner record for ${email}`);
      const questions = answers.map((a) => ({
        questionNumber: a.n, studentAnswer: a.answer, correctAnswer: '', marksAwarded: a.awarded, maxMarks: a.max,
        feedback: a.awarded < a.max ? (a.answer ? 'Not quite.' : 'No answer provided') : 'Correct.',
        rationale: a.awarded < a.max ? 'The method is incomplete.' : 'Full marks.',
      }));
      const total = answers.reduce((s, a) => s + a.awarded, 0);
      const max = answers.reduce((s, a) => s + a.max, 0);
      const now = new Date();
      await db.collection('papermarkings').insertOne({
        paperId: new ObjectId(paperId), paperType: 'assessment', studentId: student._id, studentName: `${account?.firstName ?? ''} ${account?.lastName ?? ''}`.trim(),
        teacherId: group.teacherId, schoolId: group.schoolId, classId: group.id, imageCount: 0, totalMarks: total, maxMarks: max,
        percentage: Math.round((total / max) * 1000) / 10, questions, status: 'completed', isDeleted: false, extractedHeader: null,
        paperMismatch: false, mismatchReason: null, aiRawResult: { questions }, images: [], paperVersion: 1, issuedToStudent: false,
        createdAt: now, updatedAt: now,
      });
    }
  });
}

/** Runs one of the backend's Phase E npm scripts in the E worktree (its .env points at the dev database). */
export function runBackendScript(name: string, args: string[], env: Record<string, string> = {}): void {
  execFileSync('npm', ['run', name, '--', ...args], {
    cwd: BACKEND_DIR, env: { ...process.env, ...env }, stdio: 'inherit', shell: process.platform === 'win32',
  });
}

/** The paper's evidence, and how many diagnosis requests carried the shared wrong answer. */
export async function paperEvidence(paperId: string): Promise<{
  rows: number; final: number; withTopic: number; withLevel: number; sharedKeys: number; requestsForShared: number;
}> {
  return withDb(async (db) => {
    const rows = await db.collection('answerevidences').find({ 'source.parentId': new ObjectId(paperId), isDeleted: false }).toArray();
    const typedWrong = rows.filter((r) => r.marksAwarded < r.marksAvailable && String(r.answer?.text ?? '').trim() !== '');
    const keys = [...new Set(typedWrong.map((r) => String(r.diagnosis.cacheKey)))];
    return {
      rows: rows.length,
      final: rows.filter((r) => r.status === 'final').length,
      withTopic: rows.filter((r) => r.topicNodeId).length,
      withLevel: rows.filter((r) => r.cognitiveLevel).length,
      sharedKeys: keys.length,
      requestsForShared: await db.collection('diagnosisrequests').countDocuments({ kind: 'diagnosis', 'items.cacheKey': { $in: keys } }),
    };
  });
}
```

`e2e/support/session.ts` — add:

```ts
/** The dev sign-in panel's super admin. */
export async function signInAsSuperAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('[aria-label="Development sign-in"]').getByRole('button', { name: /Super admin/ }).click();
  await page.waitForURL(/\/superadmin(\/|$)/);
}
```

- [ ] **Step 2: Write the walkthrough (spec §12)**

```ts
// e2e/evidence-walkthrough.spec.ts
//
// Phase E walkthrough (spec §12) at 375 px, no console errors, no failed API
// calls: three learners write a test online; the (seeded) AI marking becomes
// evidence; reasons appear for the teacher, one is dismissed, results are
// issued; the learner sees "Why you lost marks"; the class card shows the
// shared misconception; homework gets reasons too.
import { test, expect, type Browser, type Page } from '@playwright/test';
import { assertLocalUrl } from './support/local';
import { signInAsStandaloneTeacher } from './support/session';
import { overflowsSideways, watchPage, type Problem } from './support/watch';
import {
  devTeacherGroup, paperEvidence, runBackendScript, seedAIMarkings, seedEvidenceHomework, seedEvidenceTest, type MarkedAnswer,
} from './support/evidence-seed';

const stamp = Date.now();
const PHONE = { width: 375, height: 812 };
const learners = ['Ayanda', 'Bongi', 'Carla'].map((first) => ({
  first, email: `test+evidence-${first.toLowerCase()}-${stamp}@example.test`, password: 'Learner1-check',
}));
type Learner = (typeof learners)[number];
interface Session { page: Page; problems: Problem[] }

async function open(browser: Browser): Promise<Session> {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  return { page, problems: watchPage(page, () => []) };
}

async function join(browser: Browser, code: string, l: Learner): Promise<Session> {
  const s = await open(browser);
  await s.page.goto(`/register-student?code=${code.toLowerCase()}`);
  await s.page.getByLabel('First name').fill(l.first);
  await s.page.getByLabel('Last name').fill(`Evidence${stamp}`);
  await s.page.getByLabel('Email').fill(l.email);
  await s.page.getByLabel('Password', { exact: false }).first().fill(l.password);
  await s.page.getByLabel('Confirm password').fill(l.password);
  await s.page.getByRole('button', { name: 'Join Classroom' }).click();
  await s.page.waitForURL(/\/student$/);
  return s;
}

async function writeTest(page: Page, title: string, answers: readonly [string, string, string]): Promise<void> {
  await page.goto('/student/tests');
  await page.getByText(title).first().click();
  const start = page.getByRole('button', { name: /^Start/ });
  if (await start.count()) await start.click();
  for (let i = 0; i < answers.length; i += 1) await page.getByRole('textbox').nth(i).fill(answers[i]);
  await page.getByRole('button', { name: 'Submit test' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText(/submitted/i).first()).toBeVisible();
}

async function noSideways(page: Page, where: string): Promise<void> {
  expect(await overflowsSideways(page), `${where} scrolls sideways at 375 px`).toBe(false);
}

async function issueFrom(dialogScope: Page): Promise<void> {
  const review = dialogScope.getByRole('dialog').last();
  await review.getByRole('button', { name: 'Issue Result' }).click();
  await dialogScope.getByRole('dialog', { name: 'Issue result to student' }).getByRole('button', { name: 'Issue Result' }).click();
  await expect(dialogScope.getByText(/Issued/).first()).toBeVisible();
  await dialogScope.keyboard.press('Escape');
}

test('evidence and diagnosis: why marks were lost, the class top three, final evidence', async ({ browser, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  test.setTimeout(300_000);
  const group = await devTeacherGroup();
  const paper = await seedEvidenceTest(group);
  const school = `--school=${String(group.schoolId)}`;
  const sessions: Session[] = [];

  await test.step('three learners join and write the test online: two give the same wrong answer, one leaves a question blank', async () => {
    for (const l of learners) sessions.push(await join(browser, group.code, l));
    await writeTest(sessions[0].page, paper.title, ['5x', 'x = 8', 'Any number to the power 0 is 1']);
    await writeTest(sessions[1].page, paper.title, ['5x', 'x = 8', 'Any number to the power 0 is 1']);
    await writeTest(sessions[2].page, paper.title, ['5x', 'x = 2', '']);
    await noSideways(sessions[2].page, 'the submitted test');
  });

  await test.step('AI marking (seeded) → evidence and diagnosis through the real backend scripts; one diagnosis for the shared answer', async () => {
    const right: MarkedAnswer = { n: '1.1', answer: '5x', awarded: 2, max: 2 };
    const shared: MarkedAnswer[] = [right, { n: '1.2', answer: 'x = 8', awarded: 0, max: 2 }, { n: '2.1', answer: 'Any number to the power 0 is 1', awarded: 3, max: 3 }];
    await seedAIMarkings(paper.paperId, group, {
      [learners[0].email]: shared,
      [learners[1].email]: shared,
      [learners[2].email]: [right, { n: '1.2', answer: 'x = 2', awarded: 2, max: 2 }, { n: '2.1', answer: '', awarded: 0, max: 3 }],
    });
    runBackendScript('migrate:evidence', ['--apply', '--source=test', school]);
    runBackendScript('evidence:diagnose', ['--apply', school], { EVIDENCE_DIAGNOSIS_MODE: 'fixture' });
    const ev = await paperEvidence(paper.paperId);
    expect(ev).toMatchObject({ rows: 9, withTopic: 9, withLevel: 9, sharedKeys: 1, requestsForShared: 1 });
  });

  const teacher = await open(browser);
  await test.step('the teacher sees where the class lost marks, and why on each answer', async () => {
    await signInAsStandaloneTeacher(teacher.page);
    await teacher.page.goto(`/teacher/papers/${paper.paperId}?tab=marking&classId=${String(group.id)}`);
    const block = teacher.page.getByRole('region', { name: 'Where the class lost marks' }).first();
    await expect(block.getByText('2 learners')).toBeVisible();
    await expect(block.getByText('Also common: Not answered (1)')).toBeVisible();
    await block.getByRole('button', { expanded: false }).first().click();
    await expect(block.getByText('Q1.2')).toBeVisible();
    await noSideways(teacher.page, 'the Marking tab');

    await teacher.page.getByRole('listitem').filter({ hasText: learners[2].first }).getByRole('button', { name: 'Review marking' }).click();
    const carla = teacher.page.getByRole('dialog').last();
    await expect(carla.getByRole('region', { name: 'Why marks were lost' }).getByText('Not answered')).toBeVisible();
    await teacher.page.keyboard.press('Escape');
  });

  await test.step('the teacher dismisses one reason with "Not right" and issues two results', async () => {
    await teacher.page.getByRole('listitem').filter({ hasText: learners[0].first }).getByRole('button', { name: 'Review marking' }).click();
    const ayanda = teacher.page.getByRole('dialog').last();
    const reason = ayanda.getByRole('region', { name: 'Why marks were lost' }).first();
    await expect(reason).toBeVisible();
    await reason.getByRole('button', { name: 'Not right' }).click();
    await expect(ayanda.getByText('Hidden from the learner')).toBeVisible();
    await issueFrom(teacher.page);
    await teacher.page.getByRole('listitem').filter({ hasText: learners[1].first }).getByRole('button', { name: 'Review marking' }).click();
    await issueFrom(teacher.page);
    expect((await paperEvidence(paper.paperId)).final).toBe(6);
  });

  await test.step('the learner sees why they lost marks; the dismissed reason stays hidden', async () => {
    await sessions[1].page.goto(`/student/tests/${paper.paperId}`);
    await expect(sessions[1].page.getByRole('region', { name: 'Why you lost marks' }).first()).toBeVisible();
    await noSideways(sessions[1].page, 'the learner result');
    await sessions[0].page.goto(`/student/tests/${paper.paperId}`);
    await expect(sessions[0].page.getByText(/\d+ \/ 7/).first()).toBeVisible();
    await expect(sessions[0].page.getByRole('region', { name: 'Why you lost marks' })).toHaveCount(0);
  });

  await test.step('homework: an instantly marked exercise shows why marks were lost on the learner’s result', async () => {
    const hw = await seedEvidenceHomework(group);
    const page = sessions[2].page;
    await page.goto('/student/homework');
    await page.getByRole('link', { name: new RegExp(hw.title) }).first().click();
    await page.getByLabel('6', { exact: true }).check();
    await page.getByLabel('1', { exact: true }).check();
    await page.getByRole('button', { name: /^Submit/ }).click();
    await expect(page.getByText(/Awarded: 0 \/ 1/).first()).toBeVisible();
    runBackendScript('evidence:diagnose', ['--apply', school], { EVIDENCE_DIAGNOSIS_MODE: 'fixture' });
    await page.reload();
    await expect(page.getByRole('region', { name: 'Why you lost marks' }).first()).toBeVisible();
    await noSideways(page, 'the homework result');
  });

  expect([...teacher.problems, ...sessions.flatMap((s) => s.problems)], 'console errors and failed API calls').toEqual([]);
});
```

- [ ] **Step 3: Extend the machine gate**

`e2e/design-gate.spec.ts` — import `signInAsSuperAdmin` from `./support/session`; add:

```ts
test('evidence surfaces: the paper Marking tab and the misconceptions review page', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  await signInAsStandaloneTeacher(page);
  await page.goto('/teacher/papers');
  await settle(page);
  const hrefs = await page.locator('a[href]').evaluateAll((links: Element[]) => links.map((a: Element) => a.getAttribute('href') ?? ''));
  const paper = hrefs.find((h: string) => /^\/teacher\/papers\/(?!new$)[^/?#]+$/.test(h));
  if (paper) await test.step('paper: Marking tab', () => sweep(page, `${paper}?tab=marking`, 'detail:paper marking'));
});

test('super admin: misconceptions review', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  await signInAsSuperAdmin(page);
  await test.step('/superadmin/misconceptions', () => sweep(page, '/superadmin/misconceptions', '/superadmin/misconceptions'));
});
```

`scripts/design-gate.mjs` — in the "launch walkthrough on the production build" step, change the command to `sh('npx playwright test e2e/standalone-launch.spec.ts e2e/evidence-walkthrough.spec.ts');`.

`e2e/README.md` — under the stack notes: "Phase E's walkthrough runs the backend's `migrate:evidence` and `evidence:diagnose` scripts in `E2E_BACKEND_DIR` (default `C:/dev/campusly/.worktrees/backend-evidence`), whose `.env` must point at the dev database; the diagnose run uses `EVIDENCE_DIAGNOSIS_MODE=fixture` (no API key needed)."

- [ ] **Step 4: Run the walkthrough and the gate**

Start the stack as `e2e/README.md` says: backend from `C:\dev\campusly\.worktrees\backend-evidence` on 4500 (with `DEV_SIGN_IN=true`, `EVIDENCE_DIAGNOSIS_MODE=fixture`, its `.env` on the dev Mongo 27047 and dev Redis 6391); **the frontend is started by the gate itself on 3500** — keep 3500 free. Stop the backend when the lane ends.

Run: `npx playwright test e2e/design-gate.spec.ts`
Expected: the only soft failures are request-set diffs whose `added` entries are all `GET /api/evidence/…` (e.g. `detail:homework` gains `GET /api/evidence/class-misconceptions`) and "no baseline" for the two new keys. Anything else (sideways scroll, unnamed control, missing focus ring, a removed request) is a real fault: fix it test-first in the owning component, never by loosening the gate.

Run: `E2E_RECORD_BASELINE=1 npx playwright test e2e/design-gate.spec.ts -g "standalone teacher pages|evidence surfaces|super admin"` then `git diff e2e/baselines/request-sets.json`
Expected: the diff adds only `/api/evidence/` keys and the two new route keys.

Run: `npm run gate:design`
Expected: every stage green — vitest, tsc, file sizes (new ≤ 300, touched ≤ 350), production build, `/design` 404, the launch walkthrough **and** `evidence-walkthrough.spec.ts` (1 passed, no problems), the width/label/focus/request-set sweep at 320, 375, 768, 1024, 1280 and 1440 — and the summary line `Gate GREEN`.

- [ ] **Step 5: Backfill the dev copy and measure (with Shaun's key decision)**

In `C:\dev\campusly\.worktrees\backend-evidence` against the dev copy:

```bash
npm run migrate:paper-question-tags          # dry run: papers, untagged questions, estimated R — report it
npm run migrate:evidence                     # dry run: per-source counts and topic/level shares — report them
npm run migrate:evidence -- --apply          # no AI involved; safe on the dev copy
npm run evidence:diagnose                    # dry run: candidates, cache hits, pool skips, requests, estimated R
```

Only if Shaun has put an `ANTHROPIC_API_KEY` on the dev copy (open question 1): `npm run migrate:paper-question-tags -- --apply` (add `--yes` only if he accepts an estimate above R50), then `npm run evidence:diagnose -- --apply --direct --limit=100`, then measure:

```bash
mongosh "mongodb://127.0.0.1:27047/campusly-dev?directConnection=true" --quiet --eval '
  db.diagnosisrequests.aggregate([
    { $match: { kind: "diagnosis", mode: "direct", createdAt: { $gte: new Date(Date.now() - 3600e3) } } },
    { $group: { _id: null, answers: { $sum: { $size: "$items" } }, input: { $sum: "$usage.input" }, output: { $sum: "$usage.output" } } },
  ]).toArray()'
```

Report input/output tokens and rand per 100 AI-diagnosed answers (R18/$, $2/$10 per MTok for `claude-sonnet-5`; half for batch) against spec §6.6 (≈ R1.17 direct, ≈ R0.59 batch per 100 answers); within 50% passes. Without a key, report "not measured (no key)" — never run fixture mode against the dev copy (it would write canned tags and reasons into real data).

- [ ] **Step 6: Commit**

```bash
git add e2e scripts/design-gate.mjs
LANE_SWEEP_OK=1 git commit -m "test(e2e): the Phase E walkthrough at 375 px and the machine gate on the evidence surfaces" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase E finish

- [ ] Backend: `set -a; . C:/dev/campusly/test-evidence.env; set +a; npx vitest run && npx tsc --noEmit && npm run build` — all green. Frontend: `npm run gate:design` — `Gate GREEN`.
- [ ] One fresh review of both branches (superpowers:requesting-code-review), one fix pass, then hand to the orchestrator for the compromise protocol and the push. No pushes from this lane.
- [ ] `docker rm -f campusly-test-mongo-e campusly-test-redis-e`; stop any server this lane started. Leave both worktrees in place (no `git worktree remove`).
- [ ] Report to the orchestrator: commits, the dry-run numbers of Step 5, the measured tokens per 100 answers (or "not measured"), and lane-hours for the tracker.
