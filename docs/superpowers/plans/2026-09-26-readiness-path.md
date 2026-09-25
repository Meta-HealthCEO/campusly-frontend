# Readiness and the Path (Phase R) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Grade 12 learner in a subject with a verified exam blueprint sees a predicted mark band per paper, the exam map behind it, marks to gain, and at most three next actions a week. Their teacher sees the class's readiness, who needs what, and each learner's why. A super admin imports, verifies and publishes blueprints. Nothing reaches a learner from an unverified blueprint.

**Architecture:**
- **R-A** (backend, pure first) adds the `ExamBlueprint` model, a validator, an importer, and the draft Mathematics JSON. It also adds resolution: which blueprint applies to which learner and which school Subjects feed it.
- **R-A** also adds the engine, all pure functions: weights → per-topic stats → prediction, band, gate, levels and explanation → path ranking.
- **R-B** stores the result (`LearnerReadiness`, `ReadinessSnapshot`, `PathItem`) and keeps it fresh: recompute on read when stale, a debounced `readiness:recompute` job, a nightly run, and recompute on publish.
- **R-C** adds the learner, teacher and super-admin APIs, the `/auth/me` flag, and practice started from the path.
- **R-D** (frontend, after L-C merges) adds the learner readiness page, Today's next item, the teacher class and learner pages, the super-admin blueprint pages, nav, the walkthrough and the Phase D machine gate.

**Tech Stack:**
- **Backend:** Express 5, Mongoose 9, zod 4 (`zod/v4`), BullMQ 5, and vitest/supertest on a real Mongo.
- **Frontend:** Next.js 16.2, React 19, Tailwind 4, base-ui, and vitest (node environment, pure helpers and source scans).
- **End to end:** Playwright for the walkthrough and the gate.

**Spec:** `docs/superpowers/specs/2026-09-25-readiness-path-design.md`. Decisions are recorded in its §12 (2026-09-26). Related:
- programme: `docs/superpowers/specs/2026-09-25-readiness-programme.md`, Phase R
- Phase E spec: `docs/superpowers/specs/2026-09-25-evidence-diagnosis-design.md`
- Phase E plan: `docs/superpowers/plans/2026-09-25-evidence-diagnosis.md`
- inputs: `docs/superpowers/specs/2026-09-25-phase-r-inputs.md`

## Global Constraints

### Where and how the work runs

- **Backend (Tasks 1–13):** a NEW worktree `C:\dev\campusly\.worktrees\backend-readiness` on branch `feat/readiness-path`.
  - It branches from the **local** `feat/evidence-diagnosis` branch, because R imports E's `AnswerEvidence`, `MisconceptionType` and `CAPS_LEVELS` (plan ruling RP1).
  - Create it with `git -C C:/dev/campusly/.worktrees/backend-learner worktree add C:/dev/campusly/.worktrees/backend-readiness -b feat/readiness-path feat/evidence-diagnosis`, then run a real `npm ci` inside it.
  - **Never** make a `node_modules` junction. **Never** run `git worktree remove` (memory `worktree-junction-danger`).
  - Rebase onto `feat/evidence-diagnosis` whenever E reports new commits, and onto `origin/master` once E merges.
  - Do not use `C:\dev\campusly\campusly-backend` (stale). `.worktrees/backend-learner` (origin/master `7a68289`) and `.worktrees/backend-evidence` are **read-only** references. Never edit, stash or rebase them.
- **Frontend (Tasks 14–21):** only after Phase L-C (`feat/learner-screens`, which adds `STANDALONE_STUDENT_NAV`, `standalone-student-paths.ts` and `user-from-api.ts`) has merged into frontend `master`.
  - Use a new worktree `C:\dev\campusly\.worktrees\frontend-readiness` on `feat/readiness-path` from that master, with a real `npm ci`.
  - The Blueprint components and helpers (`src/components/readiness/*`, `src/lib/readiness/*`) are quoted from `origin/master` `32ceff5`. Anchor on the quoted code, not line numbers.
- **Compromise protocol:**
  - Before any fetch, run `git log --oneline origin/master -5` and compare it with the last known tip: backend `7a68289` "fix(signup): the existing-account message names the dashboard's join card"; frontend `32ceff5` "fix(tutor): a refused or failed tutor stream says why, in plain words"; plus the orchestrator's merges of L and E.
  - After a fetch, `git log --oneline master..origin/master` must show only commits you expect.
  - Never run `npm ci`/`npm install` or any code from an origin commit you can't account for.
  - **No pushes.** Pushing is the orchestrator's job.
- **Throwaway test Mongo (replica set) and Redis, for this lane only:**
  ```bash
  docker run -d --name campusly-test-mongo-r -p 27087:27017 mongo:7 --replSet rs0
  docker exec campusly-test-mongo-r mongosh --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
  docker run -d --name campusly-test-redis-r -p 6395:6379 redis:7
  ```
  The URI needs `directConnection=true`, because the set advertises `localhost:27017`.
- **Env file:** `C:\dev\campusly\test-readiness.env`. Make it from `C:\dev\campusly\test-dev.env` with LF endings, changing only these values; it lives outside both repos:
  - `MONGODB_TEST_URI` and `MONGODB_URI` → `mongodb://127.0.0.1:27087/campusly-test?directConnection=true`
  - `REDIS_URL` → `redis://127.0.0.1:6395/5`
- **Test command** (bash, from the backend worktree): `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run <path>`. For the full suite, drop the path.
- **Clean-up when the lane ends:** `docker rm -f campusly-test-mongo-r campusly-test-redis-r`.
  - **Never touch `campusly-dev-*`, `campusly-test-*-e`, `ecomed-*`, `supabase_*` or `khula-*` containers.**
  - A lane starts no server it does not stop in the same session.
- **Commits:** `LANE_SWEEP_OK=1 git commit -m "<conventional message>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`. The body ends with that line. No `--no-verify`.

### Code rules (every task)

**Backend:**
- Every query filters `schoolId`. `ExamBlueprint` is the one global collection; `CurriculumNode` and `MisconceptionType` are global and read-only here.
- Every query filters `isDeleted: false` where the model has it.
- Aggregation `$match` casts ids with `new mongoose.Types.ObjectId(...)`.
- Unique indexes are written with upserts, never a bare `create`.
- Schema and interface match field for field.
- `catch (err: unknown)`. No `any`.
- New files ≤ 300 lines; touched files ≤ 350.

**The engine** (`src/modules/Readiness/engine/*`) is pure: no Mongoose, no `Date.now()`. `now` and `asOf` are parameters, and every number comes from `constants.ts`.

**No AI in R.** The one AI call R starts is the existing practice generation, counted as one `practice_set` against the learner pool (spec §7).

**Learner-safe by construction:**
- Learner endpoints serve only blueprints where `isBlueprintVerified` holds.
- They return percentages and NSC levels, never marks (spec §12.3).
- Misconceptions appear only with learner labels, and only when `learnerVisible` and confident (≥ 0.6).

**Frontend** (project `CLAUDE.md`):
- No `apiClient` in pages or components; hooks only.
- `import type`; `catch (err: unknown)`.
- Mobile-first, with 44 px targets on phones (`min-h-11`).
- Dialogs are flex-col with a sticky footer.
- Every data view has loading, empty and error states.
- Component logic lives in pure helpers under `src/lib/readiness/`, because frontend vitest runs in node on `tests/**/*.test.ts` only.

**Blueprint look (binding, Shaun — memory `campusly-no-tints`):**
- Colour appears only in solid marks: exam-map tiles (`bg-tile-*` with `text-tile-*-ink`), mastery bars and 8 px dots (`bg-mark-*`), icons, text, and the one primary button.
- Every surface is neutral: white card, `#F3F5FA` ground, `#EEF1F7` grey.
- **No tinted or pastel backgrounds, no `bg-*/10` washes, no pastel chips, no tinted banners.**
- Mastery colour comes only through `masteryLevel()` and the Blueprint utilities. Never a hex or a palette class.
- Never re-type 60 or 70 in a component (`tests/readiness-components.test.ts`).
- Compose from Blueprint components: `Card`, `Badge`, `Button`, `Tabs`, `Sheet`, `Dialog`, `ErrorState`, `EmptyState`, `Skeleton`, `DataTable`, `PageHeader`, and the readiness set.

### Numbers and copy (verbatim from the spec)

- **Decay:** half-life 56 days, floor 0.2.
- **Source weights:** test 1.0, homework 0.7, unit check 0.6, practice 0.6, library 0.5.
- **Tag and override weights:** AI tag × 0.8; override × 0.5.
- **Topic status:** tested at ≥ 3 answers **and** ≥ 6 marks available; thin at ≥ 1 answer below that; untested at 0.
- **Spread:** τ = 0.05; mastery is clamped to 0.1–0.9 inside σ; untested and thin topics use W × 0.25; a thin level (effective < 3) adds x_L · T · 0.15.
- **Level adjustment:** shrink n/(n+6); cap ±10 points; skipped under 10 known-level answers.
- **Gate:** at least 20 answers **and** at least 50% of the paper's marks in tested topics (§12.2).
- **Band:** ±1σ, rounded to whole percent, clamped 0–100.
- **Default target:** the lowest of 30/40/50/60/70/80 strictly above the band's top; 80 when the top is ≥ 80.
- **NSC levels:** 7 ≥ 80, 6 ≥ 70, 5 ≥ 60, 4 ≥ 50, 3 ≥ 40, 2 ≥ 30, 1 below.
- **Path:**
  - 3 items per subject per SAST week, done at 4 new final answers on the topic, or when the topic reaches secure (≥ 70).
  - Misconception boost × 1.5 (twice or more in 21 days) / × 1.25 (once); only kinds `misconception | procedural`, confidence ≥ 0.6, learner-visible.
  - Proximity boost 1 + 0.5 × clamp((56 − daysToPaper)/56, 0, 1) × (W / largest W).
  - Every topic is due within 84 days of the paper.
  - 5 practice questions per set.
- **Jobs:**
  - recompute delay 120 s
  - nightly at `0 1 * * *` UTC (03:00 SAST): readiness with evidence in 180 days or viewed in 30
  - 12 weeks of history
  - class groups ≤ 5, from the last 42 days
  - pins ≤ 60 learners
- **Copy:**
  - "Exam readiness"
  - "Not enough evidence for a prediction yet"
  - "Why this range"
  - "This week"
  - "Done for this week"
  - "Nothing urgent this week"
  - "This predicts your exam mark, not your final mark, which also counts school-based assessment."
  - "Your teacher picked this for you."
  - "Draft blueprint: marks not yet checked against the 2026 Examination Guidelines"
  - "Class readiness"
  - "Who needs what"
  - "Readiness appears once this class's tests are marked"
  - "Your readiness starts with your first marked test in Mathematics."

## Review Focus

1. **A school with two Mathematics Subject rows**: one for Grade 11 linked to `…-MATHEMATICS-GR11`, one for Grade 12 linked to `…-MATHEMATICS-GR12`, plus a hand-made "Mathematical Literacy" and a hand-made "Mathematics" with no node link.
   - Expected: one readiness reads all three Mathematics rows' evidence, and Mathematical Literacy never joins.
   - Test: Task 3, `reads every Mathematics Subject of the school, never Mathematical Literacy`.
2. **A blueprint that is published but still has one topic `verified: false`.**
   - Expected: the learner API answers 404, the learner's `/auth/me` flag is false, `/readiness/me` has no `next`, and the teacher still sees the class page with `blueprint.verified: false`.
   - Test: Task 10, `an unverified published blueprint reaches no learner surface`; Task 12, `the teacher sees an unverified blueprint, flagged`.
3. **A learner retries the same quick-check question five times** (marks 0, 0, 0, 1, 1).
   - Expected: it counts as one answer, the latest, so the topic doesn't become "tested" from retries alone.
   - Test: Task 4, `retries of one question count once, the latest`.
4. **Clock edges.** Evidence and computes at 22:30 UTC on a Sunday belong to the SAST Monday: a new snapshot week and a new path week. A readiness computed at 21:59 UTC is stale again at 22:01 UTC, because a new SAST day has started.
   - Test: Task 4, `sastWeekStart and sastDay use Johannesburg time`; Task 7, `a compute after SAST midnight is a new day`; Task 8, `the path week turns at SAST midnight on Sunday`.
5. **A teacher pins a topic for 30 learners, two of whom are not on this class's roster.**
   - Expected: the whole request is refused with 404 and nothing is pinned. A learner is never half-pinned, and nobody can pin outside their class.
   - Test: Task 12, `a pin for a learner off the roster pins nobody`.

## Plan rulings

Each ruling states the ruling, then why, then the cost if wrong. The spec was fact-checked against backend `origin/master` `7a68289`, E's branch at `ba3e22e`/`8a12ed7`, frontend `origin/master` `32ceff5`, and L-C `55cd962`.

- **RP1 Base and E dependencies.** R's backend branches from E's branch. Each task names the E pieces it needs, marked **[needs E-n]**:
  - **Built on E's branch:** E-4 (`AnswerEvidence`, `MisconceptionType`, `CAPS_LEVELS` in `QuestionBank/model-shared.ts`) and E-6 (the test writer: `issuedToStudent` → `status: 'final'`, `markedAt = marking.createdAt`).
  - **Not yet built:**
    - **E-8:** practice `curriculumNodeId` on `generatePracticeSchema` and `PracticeAttempt`, plus the practice writer. Needed by Task 11.
    - **E-9:** `npm run migrate:evidence`. Needed by Task 21.
    - **E-17:** `Evidence/access.ts` with `learnerAccess`, `classAccess`, `meAsLearner`, `STAFF_ROLES` and `studentNames`. Needed by Tasks 10 and 12.
    - **E-hook:** E's final-evidence hook, which calls R's `enqueueReadinessRecompute`. Needed by Task 9, Step 6.
  - A task marked [needs E-n] starts only after E reports that piece.
  - Why: R can't read evidence without E's model, and the access rules must be E's (E plan P6) so reasons and readiness never disagree.
  - Cost if wrong: rebases as E moves; the model and writer are stable.
- **RP2 R does not use E's summary endpoints (E Task 18).** R reads rows itself (`readinessRows`), for the model and for "answers behind a topic", because decay, retries and weights need per-row data (spec §9). E-18 is **not** a dependency. — Cost if wrong: two readers of one collection. Both filter `status: 'final', isDeleted: false`.
- **RP3 The recompute contract.** R owns `enqueueReadinessRecompute(input: { schoolId: string; studentId: string; subjectId: string | null }): Promise<void>` in `src/modules/Readiness/recompute-queue.ts`:
  - It always marks the learner's readiness **stale** in Mongo.
  - Only when this process runs the workers does it add job **`readiness:recompute`**, with data `{ schoolId, studentId, subjectId }`, to queue `readiness`, using `jobId = rr_<school>_<student>_<subjectKey>` (BullMQ forbids `:` in ids) and a 120 s delay. That is the debounce. `setReadinessJobsEnabled(true)` is called from `setupWorkers`.
  - E names its hook in its next report; the only R work is to call this function from it (Task 9, Step 6).
  - Why: scripts (`migrate:evidence`) never hang on a missing Redis, and a read recomputes when stale, so correctness never needs Redis.
  - Cost if wrong: a hook that isn't wired leaves readiness at most a day stale, because the nightly run and the new-SAST-day check still recompute.
- **RP4 `LearnerReadiness.core` is `Schema.Types.Mixed`** holding the engine's `ReadinessCore`. This departs from spec §3.10's "explicit sub-schemas". It is a derived cache, recomputed from rows at any time, with one TypeScript owner (`engine/types`). It is always written whole with `$set`. — Cost if wrong: no DB-level validation of a cache; a bad write is fixed by the next recompute. Snapshots and path items keep explicit schemas.
- **RP5 SAST helpers are R's own** (`engine/sast.ts`). E's `sastWeekStart` (E-18) is not built. Task 4 pins the same cases as E-18's test (22:30 UTC Sunday → Monday). — Cost if wrong: none.
- **RP6 One published blueprint per (subjectKey, grade, examYear).** A partial unique index enforces it, and publish refuses another family with a `ConflictError`. The walkthrough's verified fixture uses family `E2E-FIXTURE-NSC-MATHEMATICS-GR12` and retires it at the end. — Why: resolution must be unambiguous. — Cost if wrong: none.
- **RP7 Verification gates learners.** `isBlueprintVerified` = every paper, topic and level has `verified: true` **and** every paper has an `examDate`. At compute, `LearnerReadiness.learnerVisible` is stored from it. The learner endpoints, `/auth/me`'s `readiness` flag and `/readiness/me`'s `next` all read it. — Cost if wrong: none; this is the spec's hard line.
- **RP8 Practice starts on the server.** `POST /readiness/me/path/:itemId/start` checks the item is the learner's. It then generates the practice through `PracticeService.generatePractice`, inside `withLearnerAIAllowance(actor, 'practice_set', …)`, and returns the attempt. It is idempotent while that attempt is unsubmitted. The practice page opens it with `?item=`.
  - Why: the item is checked server-side, the `.strict()` public schema needs no widening, and a double tap never spends twice.
  - Cost if wrong: the practice page has two ways in.
- **RP9 Nav gating is `user.readiness`,** filtered once in the dashboard layout by `withFeatures(items, user)` (new `src/lib/nav-features.ts`). It is not added to `NavAccess`, so `Sidebar`, `BottomNav` and their tests are unchanged. — Cost if wrong: a page opened by URL without the flag still works; the page itself 404s for a learner without readiness.
- **RP10 The walkthrough completes a path item with a second seeded, issued test,** not with practice. There is no API key locally, and E's fixture mode answers only diagnosis prompts. Start is covered by Task 11's tests with `AIService` mocked; the walkthrough checks the Start button's href only. — Cost if wrong: the practice round trip is not exercised end to end.
- **RP11 The draft JSON lives at `scripts/blueprints/nsc-mathematics-gr12-2026.json`,** with every value `verified: false` and `examDate: null`. Task 2's test validates it against the nodes in `scripts/output/caps-mathematics-gr1{0,1,2}.json` (no DB), and checks that it has no verified value and that its conflict notes are present. So the draft can't drift or be silently "verified" in git. — Cost if wrong: none.
- **RP12 Percentages are integers and marks have one decimal** in stored results. The engine computes at full precision. The learner view drops `lowMarks`, `highMarks` and `predictedMarks` (§12.3). — Cost if wrong: none.
- **RP13 Paging.** Class learners page with `page` and `limit` (limit ≤ 100). "Answers behind a topic" uses a cursor (the last row id). — Cost if wrong: none.
- **RP14 Access is by role, with no capability keys.** Routes use `authorize('student')`, `authorize(...STAFF_ROLES)` plus E's access helpers, or `authorize('super_admin')`. Note that `authorize` lets `super_admin` through every route (`src/middleware/rbac.ts:10`). Neither `permissions.ts` changes. — Cost if wrong: none.
- **RP15 The path's week is generated inside the recompute.** A recompute makes the week if it has no items yet, keyed by the SAST Monday. So the Monday nightly run and the first read of the week both produce it. — Cost if wrong: none.
- **RP16 The `thin` tile.** The frontend `ExamTopic` gains an optional `answers`, and `layoutExamMap` gives `level: 'thin'` to a topic with answers but no mastery. It is drawn like `untested` (dashed, neutral), with "*n* answers so far". — Cost if wrong: none.
- **RP17 Today's priority** (spec §5.2): homework or a test due today, tomorrow or overdue, then the top path item, then the old order. `TodayItem` gains an optional `dueSoon`, which the page sets from the due date, so L's existing `todayNextUp` tests pass unchanged. Today asks `GET /readiness/me` only when `user.readiness` is true, so the gate's request sets for learners without readiness don't change. — Cost if wrong: none.
- **RP18 The teacher's view of one learner is `/teacher/readiness/learners/[studentId]?subject=`,** not the spec's `/teacher/readiness/[classId]/learners/[studentId]` (§5.4). Access is by learner (E's `learnerAccess`), not by class, and this lets the learner profile link to it without knowing a class. Without `subject`, it defaults to `mathematics`, the only blueprint subject (§12.1). — Cost if wrong: a second subject needs a subject picker on that page.

## File structure

**Backend** (paths relative to the backend worktree):

| File | Responsibility |
|---|---|
| `src/modules/Readiness/types.ts` (new) | blueprint, engine-row and result shapes |
| `src/modules/Readiness/constants.ts` (new) | every number in "Numbers and copy" |
| `src/modules/Readiness/model-blueprint.ts` (new) | `ExamBlueprint` |
| `src/modules/Readiness/blueprint-validate.ts` (new, pure) | the file schema, `validateBlueprint`, `isBlueprintVerified`, `gradeOfCode`, `NON_CONTENT_TITLE` |
| `src/modules/Readiness/blueprint-service.ts` (new) | node loading, import as draft, publish, copy, verification patch |
| `src/modules/Readiness/blueprint-resolve.ts` (new) | a learner's grade, a Subject's family, the family's Subjects, the published blueprint |
| `src/modules/Readiness/engine/sast.ts`, `weights.ts`, `mapping.ts`, `aggregate.ts` (new, pure) | SAST days and weeks, row weight, retries, row → exam topic, per-topic stats |
| `src/modules/Readiness/engine/levels.ts`, `predict.ts`, `target.ts`, `explain.ts`, `readiness.ts` (new, pure) | level adjustment, band and gate, NSC levels and targets, explanation lines, `computeReadiness` |
| `src/modules/Readiness/engine/due.ts`, `path-rank.ts` (new, pure) | taught-by-now rule; ranking and why lines |
| `src/modules/Readiness/model-readiness.ts`, `model-path.ts` (new) | `LearnerReadiness`, `ReadinessSnapshot`, `PathItem` |
| `src/modules/Readiness/rows.ts` (new) | evidence rows → `EngineRow[]` |
| `src/modules/Readiness/service-compute.ts`, `snapshots.ts` (new) | recompute, freshness, the day snapshot, history, trend |
| `src/modules/Readiness/path-service.ts` (new) | week generation, completion, carry and expiry, pin, remove |
| `src/modules/Readiness/recompute-queue.ts`, `jobs.ts`, `discover.ts` (new) | enqueue and stale marks; job handlers; learners to (re)compute |
| `src/modules/Readiness/views.ts`, `service-learner.ts`, `path-start.ts`, `controller-learner.ts` (new) | learner-safe projection; learner APIs; practice from the path |
| `src/modules/Readiness/class-aggregate.ts`, `service-teacher.ts`, `controller-teacher.ts` (new) | class view, groups, learners, drill-down, pins |
| `src/modules/Readiness/controller-admin.ts`, `validation.ts`, `routes.ts` (new) | blueprint admin; schemas; `/api/readiness` |
| `src/modules/Auth/readiness-flag.ts` (new), `src/modules/Auth/controller.ts` (modify `getMe`) | `user.readiness` |
| `src/modules/AITutor/practice.service.ts`, `src/modules/AITutor/model.ts` (modify) | practice `focus` and `pathItemId` |
| `src/jobs/queues.ts`, `src/jobs/index.ts` (modify), `src/jobs/readiness.job.ts` (new) | the `readiness` queue, worker and nightly schedule |
| `src/app.ts`, `src/common/utils.ts` (modify) | mount `/api/readiness`; cascade list |
| `src/scripts/blueprint-import.ts`, `readiness-recompute.ts`, `readiness-calibrate.ts` (new), `package.json` (modify) | `blueprint:import`, `readiness:recompute`, `readiness:calibrate` |
| `scripts/blueprints/nsc-mathematics-gr12-2026.json` (new) | the draft Mathematics blueprint |
| `src/test-utils/readiness-fixture.ts` (new) | CAPS-like nodes, a Grade 12 school, blueprints, evidence rows |

**Frontend:**
- **Types:** `src/types/readiness.ts`.
- **Pure helpers** (`src/lib/readiness/`): `view.ts`, `class-view.ts`, `answers.ts`, `blueprint-admin.ts`; plus `src/lib/nav-features.ts`.
- **Changed helpers:** `src/lib/readiness/exam-map.ts`, `band.ts`, and `src/lib/standalone-today.ts`.
- **Hooks:** `useMyReadiness`, `useReadinessSubject`, `useReadinessActions`, `useReadinessClasses`, `useClassReadiness`, `useReadinessPins`, `useTopicAnswers`, `useBlueprints`, `useBlueprint`; `useAIPractice` gains `startPathItem`.
- **Components** (`src/components/readiness/`): `NotEnoughEvidence`, `ReadinessWhy`, `PathList`, `TopicSheet`, `PaperPanel`, `ReadinessSubjectView`, `LevelCountsBar`, `NeedGroups`, `ClassLearnerTable`, `PinTopicDialog`, `TopicAnswers`. `ExamMap`, `MarksToGain` and `ReadinessBand` change.
- **Admin components** (`src/components/readiness-admin/`): `ImportBlueprintDialog`, `BlueprintPaperCard`, `BlueprintReview`.
- **Pages:** `student/readiness` (index and `[subject]`), `teacher/readiness` (index, `[classId]`, `learners/[studentId]`), `superadmin/blueprints` (index and `[id]`).
- **End to end:** `e2e/support/readiness-seed.ts`, `e2e/readiness-walkthrough.spec.ts`.

---

# Phase R-A — blueprints, resolution and the engine

### Task 1: lane set-up; blueprint types, constants and the validator

**Files:**
- Create: `src/modules/Readiness/types.ts`, `src/modules/Readiness/constants.ts`, `src/modules/Readiness/blueprint-validate.ts`
- Test: `src/modules/Readiness/__tests__/blueprint-validate.test.ts`

**Interfaces:**
- Consumes: `CAPS_LEVELS`, `CapsLevel` (`src/modules/QuestionBank/model-shared.ts`, E branch); `SourceType`, `TopicFrom` (`src/modules/Evidence/types.ts`); `TypeKind` (`src/modules/Evidence/model-taxonomy.ts`).
- Produces:
  - Types: `MappedNode`, `BlueprintTopic`, `BlueprintPaper`, `BlueprintLevel`, `BlueprintSource`, `BlueprintData`, `EngineMisconception`, `EngineRow`, `TopicStatus`, `TopicMisconception`, `TopicResult`, `Band`, `LevelResult`, `PaperResult`, `ReadinessCore` (all in `types.ts`).
  - Every constant in `constants.ts`.
  - `blueprintFileSchema` and `type BlueprintFile`.
  - `interface NodeInfo { id: string; code: string; type: string; title: string; parentId: string | null; termNumber: number | null; system: boolean; deleted: boolean }`
  - `NON_CONTENT_TITLE`, `gradeOfCode(code: string): number | null`
  - `interface ValidationReport { errors: string[]; warnings: string[]; unverified: string[]; data: BlueprintData | null }`
  - `validateBlueprint(file: BlueprintFile, nodesByCode: ReadonlyMap<string, NodeInfo>, familyNodes: readonly NodeInfo[]): ValidationReport`
  - `isBlueprintVerified(bp: Pick<BlueprintData, 'papers' | 'cognitiveScheme'>): boolean`

- [ ] **Step 1: Create the worktree, the test database and the env file**

```bash
git -C C:/dev/campusly/.worktrees/backend-learner log --oneline -1 feat/evidence-diagnosis
git -C C:/dev/campusly/.worktrees/backend-learner worktree add C:/dev/campusly/.worktrees/backend-readiness -b feat/readiness-path feat/evidence-diagnosis
cd C:/dev/campusly/.worktrees/backend-readiness && npm ci
docker run -d --name campusly-test-mongo-r -p 27087:27017 mongo:7 --replSet rs0
docker exec campusly-test-mongo-r mongosh --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
docker run -d --name campusly-test-redis-r -p 6395:6379 redis:7
sed -e 's#^MONGODB_TEST_URI=.*#MONGODB_TEST_URI=mongodb://127.0.0.1:27087/campusly-test?directConnection=true#' \
    -e 's#^MONGODB_URI=.*#MONGODB_URI=mongodb://127.0.0.1:27087/campusly-test?directConnection=true#' \
    -e 's#^REDIS_URL=.*#REDIS_URL=redis://127.0.0.1:6395/5#' -e 's/\r$//' \
    C:/dev/campusly/test-dev.env > C:/dev/campusly/test-readiness.env
set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Evidence
```

Expected: the log line names E's tip, and `npm ci` completes. Evidence tests pass, which proves the base and the database.

- [ ] **Step 2: Write the failing test**

```ts
// src/modules/Readiness/__tests__/blueprint-validate.test.ts
import { describe, expect, it } from 'vitest';
import {
  NON_CONTENT_TITLE, blueprintFileSchema, gradeOfCode, isBlueprintVerified, validateBlueprint, type BlueprintFile, type NodeInfo,
} from '../blueprint-validate.js';

const node = (code: string, type: 'topic' | 'subtopic', title: string, parent: string | null = null, termNumber: number | null = 1): NodeInfo => ({
  id: `id-${code}`, code, type, title, parentId: parent ? `id-${parent}` : null, termNumber, system: true, deleted: false,
});
const NODES: NodeInfo[] = [
  node('X-MATHS-GR12-T1-FUNC', 'topic', 'Functions'),
  node('X-MATHS-GR12-T1-FUNC-01', 'subtopic', 'Inverses', 'X-MATHS-GR12-T1-FUNC'),
  node('X-MATHS-GR11-T2-FUNC', 'topic', 'Functions (including trig)', null, 2),
  node('X-MATHS-GR11-T2-FUNC-03', 'subtopic', 'Trigonometric graphs', 'X-MATHS-GR11-T2-FUNC', 2),
  node('X-MATHS-GR12-T1-TRIG', 'topic', 'Trigonometry'),
  node('X-MATHS-GR12-T4-REV', 'topic', 'Revision', null, 4),
  node('X-MATHS-GR11-T4-MEAS', 'topic', 'Measurement (Revision)', null, 4),
];
const byCode = new Map(NODES.map((n) => [n.code, n]));

function file(over: Partial<BlueprintFile> = {}): BlueprintFile {
  return blueprintFileSchema.parse({
    family: 'X-NSC-MATHS-GR12', examBody: 'DBE', qualification: 'NSC', session: 'november', subjectKey: 'X-MATHS', slug: 'maths',
    subjectTitle: 'Maths', grade: 12, examYear: 2026, sources: [],
    cognitiveScheme: { key: 'maths-4', levels: [
      { key: 'knowledge', label: 'Knowledge', percent: 20, fromStored: ['knowledge'] },
      { key: 'routine', label: 'Routine procedures', percent: 35, fromStored: ['routine'] },
      { key: 'complex', label: 'Complex procedures', percent: 30, fromStored: ['complex'] },
      { key: 'problem_solving', label: 'Problem solving', percent: 15, fromStored: ['problem_solving'] },
    ] },
    papers: [
      { key: 'P1', title: 'Paper 1', totalMarks: 50, durationMinutes: 60, topics: [
        { key: 'P1.FUNC', label: 'Functions', group: 'Functions', marks: 50, nodes: ['X-MATHS-GR12-T1-FUNC', 'X-MATHS-GR11-T2-FUNC'] },
      ] },
      { key: 'P2', title: 'Paper 2', totalMarks: 40, durationMinutes: 60, topics: [
        { key: 'P2.TRIG', label: 'Trigonometry', group: 'Trig', marks: 30, nodes: ['X-MATHS-GR12-T1-TRIG', 'X-MATHS-GR11-T2-FUNC-03'] },
        { key: 'P2.MEAS', label: 'Measurement', group: 'Trig', marks: 10, nodes: ['X-MATHS-GR11-T4-MEAS'] },
      ] },
    ],
    ...over,
  });
}

describe('validateBlueprint', () => {
  it('resolves nodes with their grade and term, and reports every unverified value', () => {
    const r = validateBlueprint(file(), byCode, NODES);
    expect(r.errors).toEqual([]);
    expect(r.data?.papers[0].topics[0].nodes).toEqual([
      { code: 'X-MATHS-GR12-T1-FUNC', nodeId: 'id-X-MATHS-GR12-T1-FUNC', level: 'topic', grade: 12, termNumber: 1 },
      { code: 'X-MATHS-GR11-T2-FUNC', nodeId: 'id-X-MATHS-GR11-T2-FUNC', level: 'topic', grade: 11, termNumber: 2 },
    ]);
    expect(r.unverified).toEqual(expect.arrayContaining(['P1: total, duration', 'P1: exam date missing', 'P2.TRIG: marks and nodes', 'Level knowledge: 20%']));
  });

  it('refuses topic marks that do not add up to the paper total, and levels that do not add up to 100', () => {
    const bad = file();
    const r = validateBlueprint({
      ...bad,
      papers: [{ ...bad.papers[0], totalMarks: 60 }, bad.papers[1]],
      cognitiveScheme: { ...bad.cognitiveScheme, levels: bad.cognitiveScheme.levels.map((l) => (l.key === 'knowledge' ? { ...l, percent: 25 } : l)) },
    }, byCode, NODES);
    expect(r.errors).toEqual(expect.arrayContaining(['P1: topic marks add up to 50, not 60', 'Cognitive levels add up to 105%, not 100%']));
    expect(r.data).toBeNull();
  });

  it('refuses unknown codes, another subject family, a code twice in one paper, and a date outside the exam year', () => {
    const base = file();
    const r = validateBlueprint({ ...base, papers: [
      { ...base.papers[0], examDate: '2027-11-02', topics: [{ ...base.papers[0].topics[0], nodes: ['X-MATHS-GR12-T1-FUNC', 'X-MATHS-GR12-T1-FUNC', 'Y-OTHER-GR12-T1'] }] },
      base.papers[1],
    ] }, new Map([...byCode, ['Y-OTHER-GR12-T1', node('Y-OTHER-GR12-T1', 'topic', 'Other')]]), NODES);
    expect(r.errors).toEqual(expect.arrayContaining([
      'P1: X-MATHS-GR12-T1-FUNC is mapped twice',
      'P1.FUNC: Y-OTHER-GR12-T1 is not a X-MATHS node',
      'P1: exam date 2027-11-02 is not in 2026',
    ]));
  });

  it('warns about content no paper maps, and about whole-title revision nodes, but not "(Revision)" content', () => {
    const r = validateBlueprint(file(), byCode, NODES);
    expect(r.warnings).toEqual([]);
    const withRev = file();
    withRev.papers[1].topics[1].nodes.push('X-MATHS-GR12-T4-REV');
    expect(validateBlueprint(withRev, byCode, NODES).warnings).toEqual(['P2.MEAS: X-MATHS-GR12-T4-REV "Revision" is not content']);
    const missing = file();
    missing.papers[1].topics[0].nodes = ['X-MATHS-GR12-T1-TRIG'];
    missing.papers[1].topics[1].nodes = ['X-MATHS-GR11-T4-MEAS'];
    expect(validateBlueprint(missing, byCode, NODES).warnings).toEqual([]);
    expect(NON_CONTENT_TITLE.test('Measurement (Revision)')).toBe(false);
    expect(NON_CONTENT_TITLE.test('Final NSC Examination')).toBe(true);
    expect(NON_CONTENT_TITLE.test('Revision and Trial Examination')).toBe(true);
  });

  it('warns about a content topic that neither it nor any subtopic of it maps', () => {
    const extra = [...NODES, node('X-MATHS-GR12-T3-STAT', 'topic', 'Statistics', null, 3)];
    expect(validateBlueprint(file(), new Map(extra.map((n) => [n.code, n])), extra).warnings)
      .toEqual(['Not in any paper: X-MATHS-GR12-T3-STAT "Statistics"']);
  });
});

describe('gradeOfCode and isBlueprintVerified', () => {
  it('reads the grade from a code', () => {
    expect(gradeOfCode('CAPS-MATHEMATICS-GR10-T2-FUNC-05')).toBe(10);
    expect(gradeOfCode('CAPS-GR12')).toBe(12);
    expect(gradeOfCode('CAPS-FET')).toBeNull();
  });

  it('is verified only when every paper, topic and level is, and every paper has a date', () => {
    const data = validateBlueprint(file(), byCode, NODES).data!;
    expect(isBlueprintVerified(data)).toBe(false);
    const all = {
      cognitiveScheme: { ...data.cognitiveScheme, levels: data.cognitiveScheme.levels.map((l) => ({ ...l, verified: true })) },
      papers: data.papers.map((p) => ({ ...p, verified: true, examDate: '2026-10-27', topics: p.topics.map((t) => ({ ...t, verified: true })) })),
    };
    expect(isBlueprintVerified(all)).toBe(true);
    expect(isBlueprintVerified({ ...all, papers: [{ ...all.papers[0], examDate: null }, all.papers[1]] })).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/blueprint-validate.test.ts`
Expected: FAIL, with `Cannot find module '../blueprint-validate.js'`.

- [ ] **Step 4: Implement**

```ts
// src/modules/Readiness/types.ts
//
// Shapes shared by the blueprint, the engine and the APIs (spec §2–§6).
import type { Types } from 'mongoose';
import type { CapsLevel } from '../QuestionBank/model-shared.js';
import type { SourceType, TopicFrom } from '../Evidence/types.js';
import type { TypeKind } from '../Evidence/model-taxonomy.js';

export type Oid = Types.ObjectId;
export type { CapsLevel, SourceType, TopicFrom, TypeKind };

export interface MappedNode { code: string; nodeId: string; level: 'topic' | 'subtopic'; grade: number; termNumber: number | null }
export interface BlueprintTopic {
  key: string; label: string; group: string; marks: number; tolerance: number | null;
  sourceRef: string; verified: boolean; note: string; nodes: MappedNode[];
}
export interface BlueprintPaper {
  key: string; title: string; totalMarks: number; durationMinutes: number;
  examDate: string | null; sitting: 'morning' | 'afternoon' | null; sourceRef: string; verified: boolean;
  topics: BlueprintTopic[];
}
export interface BlueprintLevel { key: string; label: string; percent: number; fromStored: CapsLevel[]; sourceRef: string; verified: boolean }
export interface BlueprintSource { ref: string; title: string; edition: string; publisher: string }
export interface BlueprintData {
  family: string; examBody: 'DBE'; qualification: 'NSC'; session: 'november';
  subjectKey: string; slug: string; subjectTitle: string; grade: number; examYear: number;
  sources: BlueprintSource[];
  cognitiveScheme: { key: string; levels: BlueprintLevel[] };
  papers: BlueprintPaper[];
}

/** The part of a ready diagnosis R uses (a row's misconception, E §6.2). */
export interface EngineMisconception {
  typeId: string; kind: TypeKind; label: string; learnerLabel: string; learnerVisible: boolean;
  confidence: number | null; topicNodeId: string | null;
}
/** One final evidence row as the engine sees it (spec §3.1). */
export interface EngineRow {
  id: string; topicNodeId: string | null; subtopicNodeId: string | null; cognitiveLevel: CapsLevel | null;
  marksAwarded: number; marksAvailable: number; markedAt: Date; sourceType: SourceType; attemptNumber: number;
  questionKey: string; topicFrom: TopicFrom; totalOverridden: boolean;
  recordId: string; parentId: string; itemKey: string;
  misconception: EngineMisconception | null;
}

export type TopicStatus = 'tested' | 'thin' | 'untested';
export interface TopicMisconception {
  typeId: string; kind: TypeKind; label: string; learnerLabel: string; learnerVisible: boolean; count: number; lastSeenAt: string;
}
export interface TopicResult {
  key: string; label: string; group: string; marks: number; status: TopicStatus;
  /** 0–100, whole percent, only when tested. */
  mastery: number | null;
  answers: number; effectiveAnswers: number; lastAnsweredAt: string | null;
  marksToGain: number | null; due: boolean;
  subtopics: Array<{ nodeId: string; title: string; mastery: number | null; answers: number }>;
  misconceptions: TopicMisconception[];
  bySource: Partial<Record<SourceType, { answers: number; mastery: number | null }>>;
}
export interface Band { low: number; high: number; mid: number; lowMarks: number; highMarks: number }
export interface LevelResult { key: string; label: string; examPercent: number; evidencePercent: number | null; mastery: number | null; answers: number }
export interface PaperResult {
  key: string; title: string; totalMarks: number; durationMinutes: number; examDate: string | null;
  state: 'predicted' | 'not_enough_evidence'; band: Band | null; predictedMarks: number; sigmaMarks: number;
  gate: { answers: number; answersNeeded: number; testedMarks: number; testedMarksNeeded: number };
  levels: LevelResult[]; adjustmentMarks: number | null;
  explanation: { learner: string[]; teacher: string[] };
  topics: TopicResult[];
}
export interface ReadinessCore {
  answers: number; unmappedAnswers: number;
  /** The learner's weighted average over tested topics, 0–100, or null. */
  average: number | null;
  lastMarkedAt: string | null;
  papers: PaperResult[];
  both: { state: PaperResult['state']; band: Band | null } | null;
  defaultTarget: number | null;
}
```

```ts
// src/modules/Readiness/constants.ts
//
// Every number of the readiness model and the path (spec §3–§4, decided §12). The one place they live.
import type { SourceType } from './types.js';

export const DECAY_HALF_LIFE_DAYS = 56;
export const DECAY_FLOOR = 0.2;
export const SOURCE_WEIGHT: Readonly<Record<SourceType, number>> = { test: 1, homework: 0.7, unit_check: 0.6, practice: 0.6, library: 0.5 };
export const AI_TAG_WEIGHT = 0.8;
export const OVERRIDE_WEIGHT = 0.5;

export const TESTED_MIN_ANSWERS = 3;
export const TESTED_MIN_MARKS = 6;
export const EXAM_DAY_SPREAD = 0.05;
export const UNTESTED_SPREAD = 0.25;
export const MASTERY_CLAMP_LOW = 0.1;
export const MASTERY_CLAMP_HIGH = 0.9;

export const LEVEL_SHRINK = 6;
export const LEVEL_CAP = 0.1;
export const LEVEL_MIN_KNOWN_ANSWERS = 10;
export const LEVEL_THIN_EFFECTIVE = 3;
export const LEVEL_UNKNOWN_SPREAD = 0.15;

export const GATE_MIN_ANSWERS = 20;
export const GATE_MIN_TESTED_SHARE = 0.5;
export const NSC_BOUNDARIES = [30, 40, 50, 60, 70, 80] as const;
/** Mirrors the frontend's MASTERY_THRESHOLDS (src/lib/readiness/mastery.ts). */
export const MASTERY_SECURE = 70;
export const MASTERY_BUILDING = 60;
export const MIN_CONFIDENCE = 0.6;
export const RECENT_DAYS = 56;

export const PATH_ITEMS_PER_WEEK = 3;
export const PATH_DONE_ANSWERS = 4;
export const MISCONCEPTION_WINDOW_DAYS = 21;
export const MISCONCEPTION_BOOST_REPEATED = 1.5;
export const MISCONCEPTION_BOOST_ONCE = 1.25;
export const PROXIMITY_WINDOW_DAYS = 56;
export const PROXIMITY_MAX_BOOST = 0.5;
export const ALL_DUE_WINDOW_DAYS = 84;
export const PRACTICE_QUESTIONS = 5;

export const RECOMPUTE_DELAY_MS = 120_000;
export const RECOMPUTE_CONCURRENCY = 5;
export const HISTORY_WEEKS = 12;
export const NIGHTLY_EVIDENCE_DAYS = 180;
export const NIGHTLY_VIEWED_DAYS = 30;
export const CLASS_GROUP_WINDOW_DAYS = 42;
export const CLASS_GROUPS_MAX = 5;
export const PIN_MAX_LEARNERS = 60;
```

```ts
// src/modules/Readiness/blueprint-validate.ts
//
// The blueprint file and its checks (spec §2.3). Pure: the caller loads the nodes.
import { z } from 'zod/v4';
import { CAPS_LEVELS } from '../QuestionBank/model-shared.js';
import type { BlueprintData, BlueprintPaper, BlueprintTopic, MappedNode } from './types.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[A-Z0-9-]{3,60}$/;

export const blueprintFileSchema = z.object({
  family: z.string().regex(KEY), examBody: z.literal('DBE'), qualification: z.literal('NSC'), session: z.literal('november'),
  subjectKey: z.string().regex(KEY), slug: z.string().regex(/^[a-z0-9-]{2,40}$/), subjectTitle: z.string().min(2).max(60),
  grade: z.number().int().min(10).max(12), examYear: z.number().int().min(2024).max(2100),
  sources: z.array(z.object({
    ref: z.string().min(1).max(20), title: z.string().min(1).max(200), edition: z.string().max(80), publisher: z.string().max(100),
  })).max(20),
  cognitiveScheme: z.object({
    key: z.string().min(1).max(40),
    levels: z.array(z.object({
      key: z.string().min(1).max(40), label: z.string().min(1).max(60), percent: z.number().min(0).max(100),
      fromStored: z.array(z.enum(CAPS_LEVELS)).min(1), sourceRef: z.string().max(80).default(''), verified: z.boolean().default(false),
    })).min(1).max(8),
  }),
  papers: z.array(z.object({
    key: z.string().regex(/^P[1-9]$/), title: z.string().min(1).max(60),
    totalMarks: z.number().int().positive(), durationMinutes: z.number().int().positive(),
    examDate: z.string().regex(DATE).nullable().default(null), sitting: z.enum(['morning', 'afternoon']).nullable().default(null),
    sourceRef: z.string().max(80).default(''), verified: z.boolean().default(false),
    topics: z.array(z.object({
      key: z.string().regex(/^P[1-9]\.[A-Z0-9]{2,12}$/), label: z.string().min(1).max(80), group: z.string().min(1).max(80),
      marks: z.number().int().positive(), tolerance: z.number().int().min(0).nullable().default(null),
      sourceRef: z.string().max(80).default(''), verified: z.boolean().default(false), note: z.string().max(400).default(''),
      nodes: z.array(z.string().min(3).max(80)).min(1),
    })).min(1),
  })).min(1).max(4),
}).strict();
export type BlueprintFile = z.infer<typeof blueprintFileSchema>;

export interface NodeInfo {
  id: string; code: string; type: string; title: string; parentId: string | null; termNumber: number | null; system: boolean; deleted: boolean;
}
export interface ValidationReport { errors: string[]; warnings: string[]; unverified: string[]; data: BlueprintData | null }

/** A whole title that is not content (spec §2.3). "Measurement (Revision)" is content. */
export const NON_CONTENT_TITLE = /^(revision|revision and trial examination|trial examination|final (nsc|ncs) examination|planning\b.*)$/i;

export function gradeOfCode(code: string): number | null {
  const m = code.match(/-GR(\d{1,2})(?=-|$)/);
  return m ? Number(m[1]) : null;
}

const dupes = (keys: readonly string[]): string[] => keys.filter((k: string, i: number) => keys.indexOf(k) !== i);

function resolveTopic(
  file: BlueprintFile, paperKey: string, topic: BlueprintFile['papers'][number]['topics'][number],
  byCode: ReadonlyMap<string, NodeInfo>, seen: Set<string>, mapped: Set<string>, errors: string[], warnings: string[],
): BlueprintTopic {
  const nodes = topic.nodes.flatMap((code: string): MappedNode[] => {
    if (seen.has(code)) {
      errors.push(`${paperKey}: ${code} is mapped twice`);
      return [];
    }
    seen.add(code);
    const node = byCode.get(code);
    if (!code.startsWith(`${file.subjectKey}-`)) {
      errors.push(`${topic.key}: ${code} is not a ${file.subjectKey} node`);
      return [];
    }
    if (!node || node.deleted || !node.system) {
      errors.push(`${topic.key}: no live system node ${code}`);
      return [];
    }
    if (node.type !== 'topic' && node.type !== 'subtopic') {
      errors.push(`${topic.key}: ${code} is a ${node.type}, not a topic or subtopic`);
      return [];
    }
    if (NON_CONTENT_TITLE.test(node.title.trim())) warnings.push(`${topic.key}: ${code} "${node.title}" is not content`);
    mapped.add(node.id);
    return [{ code, nodeId: node.id, level: node.type, grade: gradeOfCode(code) ?? file.grade, termNumber: node.termNumber }];
  });
  return {
    key: topic.key, label: topic.label, group: topic.group, marks: topic.marks, tolerance: topic.tolerance,
    sourceRef: topic.sourceRef, verified: topic.verified, note: topic.note, nodes,
  };
}

function coverageWarnings(familyNodes: readonly NodeInfo[], mapped: ReadonlySet<string>): string[] {
  const children = new Map<string, NodeInfo[]>();
  for (const n of familyNodes) if (n.parentId) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n]);
  return familyNodes
    .filter((n: NodeInfo) => !n.deleted && !NON_CONTENT_TITLE.test(n.title.trim()))
    .filter((n: NodeInfo) => !(mapped.has(n.id)
      || (n.type === 'subtopic' && n.parentId !== null && mapped.has(n.parentId))
      || (n.type === 'topic' && (children.get(n.id) ?? []).some((c: NodeInfo) => mapped.has(c.id)))))
    .map((n: NodeInfo) => `Not in any paper: ${n.code} "${n.title}"`);
}

export function validateBlueprint(
  file: BlueprintFile, nodesByCode: ReadonlyMap<string, NodeInfo>, familyNodes: readonly NodeInfo[],
): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unverified: string[] = [];
  const levelSum = file.cognitiveScheme.levels.reduce((s: number, l) => s + l.percent, 0);
  if (levelSum !== 100) errors.push(`Cognitive levels add up to ${levelSum}%, not 100%`);
  for (const k of dupes(file.cognitiveScheme.levels.map((l) => l.key))) errors.push(`Level key ${k} is used twice`);
  for (const k of dupes(file.papers.map((p) => p.key))) errors.push(`Paper key ${k} is used twice`);
  for (const k of dupes(file.papers.flatMap((p) => p.topics.map((t) => t.key)))) errors.push(`Topic key ${k} is used twice`);

  const mapped = new Set<string>();
  const papers = file.papers.map((paper): BlueprintPaper => {
    const sum = paper.topics.reduce((s: number, t) => s + t.marks, 0);
    if (sum !== paper.totalMarks) errors.push(`${paper.key}: topic marks add up to ${sum}, not ${paper.totalMarks}`);
    if (paper.examDate && Number(paper.examDate.slice(0, 4)) !== file.examYear) {
      errors.push(`${paper.key}: exam date ${paper.examDate} is not in ${file.examYear}`);
    }
    if (!paper.verified) unverified.push(`${paper.key}: total, duration`);
    if (!paper.examDate) unverified.push(`${paper.key}: exam date missing`);
    const seen = new Set<string>();
    const topics = paper.topics.map((t) => resolveTopic(file, paper.key, t, nodesByCode, seen, mapped, errors, warnings));
    for (const t of topics) if (!t.verified) unverified.push(`${t.key}: marks and nodes`);
    return {
      key: paper.key, title: paper.title, totalMarks: paper.totalMarks, durationMinutes: paper.durationMinutes,
      examDate: paper.examDate, sitting: paper.sitting, sourceRef: paper.sourceRef, verified: paper.verified, topics,
    };
  });
  for (const l of file.cognitiveScheme.levels) if (!l.verified) unverified.push(`Level ${l.key}: ${l.percent}%`);
  warnings.push(...coverageWarnings(familyNodes, mapped));

  const data: BlueprintData | null = errors.length > 0 ? null : {
    family: file.family, examBody: file.examBody, qualification: file.qualification, session: file.session,
    subjectKey: file.subjectKey, slug: file.slug, subjectTitle: file.subjectTitle, grade: file.grade, examYear: file.examYear,
    sources: file.sources, cognitiveScheme: file.cognitiveScheme, papers,
  };
  return { errors, warnings, unverified, data };
}

/** Learners see a blueprint only when every value is verified and every paper has a date (spec §2.4, ruling RP7). */
export function isBlueprintVerified(bp: Pick<BlueprintData, 'papers' | 'cognitiveScheme'>): boolean {
  return bp.cognitiveScheme.levels.every((l) => l.verified)
    && bp.papers.every((p) => p.verified && p.examDate !== null && p.topics.every((t) => t.verified));
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness && npx tsc --noEmit`
Expected: PASS (8 tests), and `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/modules/Readiness
LANE_SWEEP_OK=1 git commit -m "feat(readiness): blueprint types, the model's constants, and the blueprint validator (sums, codes, coverage, verification)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: the blueprint model, import as draft, publish, copy, verification, and the draft Mathematics file

**Files:**
- Create: `src/modules/Readiness/model-blueprint.ts`, `src/modules/Readiness/blueprint-service.ts`, `src/scripts/blueprint-import.ts`, `scripts/blueprints/nsc-mathematics-gr12-2026.json`, `src/test-utils/readiness-fixture.ts`
- Modify: `package.json` (add `"blueprint:import": "tsx src/scripts/blueprint-import.ts"`)
- Test: `src/modules/Readiness/__tests__/blueprint-service.test.ts`, `src/modules/Readiness/__tests__/draft-blueprint.test.ts`

**Interfaces:**
- Consumes: Task 1 (`blueprintFileSchema`, `validateBlueprint`, `isBlueprintVerified`, `NodeInfo`, `BlueprintData`); `CurriculumNode` (`src/modules/CurriculumStructure/model.ts`); `standaloneClassroom`, `cleanUpClassrooms`, `trackSchool` (`src/test-utils/standalone-classroom.ts`); `AnswerEvidence` (`src/modules/Evidence/model.ts`).
- Produces:
  - `interface IExamBlueprint extends Document, BlueprintData` with `{ status: 'draft' | 'published' | 'retired'; version: number; acknowledgedWarnings: string[]; publishedBy: Oid | null; publishedAt: Date | null; supersedes: Oid | null; isDeleted: boolean; createdAt: Date; updatedAt: Date }`, and `ExamBlueprint`.
  - `loadNodesFor(file: BlueprintFile): Promise<{ byCode: Map<string, NodeInfo>; family: NodeInfo[] }>`
  - `validateRaw(raw: unknown): Promise<ValidationReport & { parseErrors: string[] }>`
  - `importDraft(raw: unknown): Promise<{ report: ValidationReport & { parseErrors: string[] }; blueprint: IExamBlueprint | null; changed: boolean }>`
  - `publishBlueprint(id: string, byUserId: string, acknowledgeWarnings: boolean): Promise<IExamBlueprint>`
  - `copyBlueprint(id: string, examYear: number): Promise<IExamBlueprint>`
  - `interface VerificationPatch { papers?: Array<{ key: string; verified?: boolean; sourceRef?: string; examDate?: string | null; sitting?: 'morning' | 'afternoon' | null }>; topics?: Array<{ key: string; verified?: boolean; sourceRef?: string }>; levels?: Array<{ key: string; verified?: boolean; sourceRef?: string }> }`
  - `patchVerification(id: string, patch: VerificationPatch): Promise<IExamBlueprint>`
  - `blueprintData(doc: IExamBlueprint): BlueprintData`
  - **Fixture:** `interface ReadinessWorld { prefix: string; subjectKey: string; nodes: Record<string, Oid>; gradeNode: Oid; subjectNodes: { gr11: Oid; gr12: Oid; lit: Oid } }`
    - `makeCurriculum(): Promise<ReadinessWorld>` makes the nodes. Their codes are `${prefix}-MATHEMATICS-GR12-T1-FUNC` and so on, with keys `FUNC12`, `FUNC12_INV`, `CALC12`, `PROB12`, `TRIG12`, `STAT12`, `FUNC11`, `FUNC11_TRIG`, `REV12`.
    - `fixtureBlueprintFile(w: ReadinessWorld, over?: { verified?: boolean; examDates?: [string | null, string | null]; family?: string; examYear?: number }): BlueprintFile` builds P1 of 100 (FUNC 40, CALC 35, PROB 25) and P2 of 50 (TRIG 30, which includes the `FUNC11_TRIG` subtopic; STAT 20), with levels 20/35/30/15.
    - `publishFixture(w, over?): Promise<IExamBlueprint>`
    - `interface ReadinessRoom extends Classroom { world: ReadinessWorld; grade12: Oid; grade10: Oid; maths12: Oid; maths11: Oid; mathsLoose: Oid; mathsLit: Oid; g12: Group }`
    - `readinessRoom(w: ReadinessWorld): Promise<ReadinessRoom>` gives a standalone classroom with Grade 12 and Grade 10 `Grade` rows, four Subjects, a Grade 12 group `g12` and a Timetable row (teacher, `g12`, `maths12`).
    - `grade12Learner(room, first, subjectClassIds?): Promise<Learner>`: a learner in `g12`, with `gradeId = room.grade12`.
    - `evidence(room, learner, over): Promise<Oid>`: inserts one final `AnswerEvidence` row (defaults: `subjectId = room.maths12`, `topicNodeId = world.nodes.FUNC12`, level `routine`, 1/2 marks, `markedAt` now − 1 day, source `test`) and returns its id.
    - `cleanUpReadiness(w: ReadinessWorld): Promise<void>`

- [ ] **Step 1: Write the fixture**

```ts
// src/test-utils/readiness-fixture.ts
//
// Phase R test world: a small CAPS-like Mathematics tree (unique codes per run), a standalone classroom with
// Grade 12 and Grade 10 rows, four Subjects (two linked Mathematics, one loose "Mathematics", one Mathematical
// Literacy), blueprints, and final evidence rows. cleanUpReadiness() removes the nodes and blueprints it made;
// cleanUpClassrooms() removes every school-scoped document.
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { CurriculumNode } from '../modules/CurriculumStructure/model.js';
import { Class, Grade, Subject, Timetable } from '../modules/Academic/model.js';
import { Student } from '../modules/Student/model.js';
import { AnswerEvidence } from '../modules/Evidence/model.js';
import { ExamBlueprint, type IExamBlueprint } from '../modules/Readiness/model-blueprint.js';
import { blueprintFileSchema, type BlueprintFile } from '../modules/Readiness/blueprint-validate.js';
import { importDraft, publishBlueprint } from '../modules/Readiness/blueprint-service.js';
import { classroomCode, standaloneClassroom, type Classroom, type Group, type Learner } from './standalone-classroom.js';

type Oid = mongoose.Types.ObjectId;
const oid = (): Oid => new mongoose.Types.ObjectId();

export interface ReadinessWorld {
  prefix: string; subjectKey: string; nodes: Record<string, Oid>; gradeNode: Oid;
  subjectNodes: { gr11: Oid; gr12: Oid; lit: Oid };
}

export async function makeCurriculum(): Promise<ReadinessWorld> {
  const prefix = `RT${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const subjectKey = `${prefix}-MATHEMATICS`;
  const frameworkId = oid();
  const gradeNode = oid();
  const subjectNodes = { gr11: oid(), gr12: oid(), lit: oid() };
  const nodes: Record<string, Oid> = {};
  const now = new Date();
  const doc = (id: Oid, type: string, code: string, title: string, parentId: Oid | null, termNumber: number | null) => ({
    _id: id, frameworkId, type, code, title, parentId, termNumber, description: '', order: 0, schoolId: null, isDeleted: false,
    metadata: { weekNumbers: [], capsReference: '', assessmentStandards: [], notionalHours: 0, cognitiveWeighting: null },
    phaseId: null, gradeId: null, subjectId: null, createdAt: now, updatedAt: now,
  });
  const topic = (key: string, code: string, title: string, parent: Oid, term: number | null, type = 'topic') => {
    nodes[key] = oid();
    return doc(nodes[key], type, `${subjectKey}-${code}`, title, parent, term);
  };
  await CurriculumNode.collection.insertMany([
    doc(gradeNode, 'grade', `${prefix}-GR12`, 'Grade 12', null, null),
    doc(subjectNodes.gr12, 'subject', `${subjectKey}-GR12`, 'Mathematics', gradeNode, null),
    doc(subjectNodes.gr11, 'subject', `${subjectKey}-GR11`, 'Mathematics', null, null),
    doc(subjectNodes.lit, 'subject', `${prefix}-MATHEMATICAL-LITERACY-GR12`, 'Mathematical Literacy', gradeNode, null),
    topic('FUNC12', 'GR12-T1-FUNC', 'Functions', subjectNodes.gr12, 1),
    topic('CALC12', 'GR12-T2-CALC', 'Differential Calculus', subjectNodes.gr12, 2),
    topic('PROB12', 'GR12-T3-PROB', 'Counting and Probability', subjectNodes.gr12, 3),
    topic('TRIG12', 'GR12-T1-TRIG', 'Trigonometry', subjectNodes.gr12, 1),
    topic('STAT12', 'GR12-T3-STAT', 'Statistics', subjectNodes.gr12, 3),
    topic('FUNC11', 'GR11-T2-FUNC', 'Functions (including Trigonometric Functions)', subjectNodes.gr11, 2),
    topic('REV12', 'GR12-T4-REV', 'Revision', subjectNodes.gr12, 4),
  ]);
  await CurriculumNode.collection.insertMany([
    topic('FUNC12_INV', 'GR12-T1-FUNC-01', 'Inverse of a function', nodes.FUNC12, 1, 'subtopic'),
    topic('FUNC11_TRIG', 'GR11-T2-FUNC-03', 'Trigonometric graphs', nodes.FUNC11, 2, 'subtopic'),
  ]);
  return { prefix, subjectKey, nodes, gradeNode, subjectNodes };
}

export function fixtureBlueprintFile(
  w: ReadinessWorld,
  over: { verified?: boolean; examDates?: [string | null, string | null]; family?: string; examYear?: number } = {},
): BlueprintFile {
  const v = over.verified ?? false;
  const year = over.examYear ?? 2026;
  const [d1, d2] = over.examDates ?? [null, null];
  const c = (s: string) => `${w.subjectKey}-${s}`;
  return blueprintFileSchema.parse({
    family: over.family ?? `${w.prefix}-NSC-MATHEMATICS-GR12`, examBody: 'DBE', qualification: 'NSC', session: 'november',
    subjectKey: w.subjectKey, slug: `m${w.prefix.toLowerCase()}`, subjectTitle: 'Mathematics', grade: 12, examYear: year,
    sources: [{ ref: 'TEST', title: 'Test guidelines', edition: 'test', publisher: 'test' }],
    cognitiveScheme: { key: 'maths-4', levels: [
      { key: 'knowledge', label: 'Knowledge', percent: 20, fromStored: ['knowledge'], verified: v },
      { key: 'routine', label: 'Routine procedures', percent: 35, fromStored: ['routine'], verified: v },
      { key: 'complex', label: 'Complex procedures', percent: 30, fromStored: ['complex'], verified: v },
      { key: 'problem_solving', label: 'Problem solving', percent: 15, fromStored: ['problem_solving'], verified: v },
    ] },
    papers: [
      { key: 'P1', title: 'Paper 1', totalMarks: 100, durationMinutes: 120, examDate: d1, verified: v, topics: [
        { key: 'P1.FUNC', label: 'Functions and graphs', group: 'Functions and calculus', marks: 40, verified: v, nodes: [c('GR12-T1-FUNC'), c('GR11-T2-FUNC')] },
        { key: 'P1.CALC', label: 'Differential calculus', group: 'Functions and calculus', marks: 35, verified: v, nodes: [c('GR12-T2-CALC')] },
        { key: 'P1.PROB', label: 'Counting and probability', group: 'Probability', marks: 25, verified: v, nodes: [c('GR12-T3-PROB')] },
      ] },
      { key: 'P2', title: 'Paper 2', totalMarks: 50, durationMinutes: 60, examDate: d2, verified: v, topics: [
        { key: 'P2.TRIG', label: 'Trigonometry', group: 'Trigonometry and statistics', marks: 30, verified: v, nodes: [c('GR12-T1-TRIG'), c('GR11-T2-FUNC-03')] },
        { key: 'P2.STAT', label: 'Statistics', group: 'Trigonometry and statistics', marks: 20, verified: v, nodes: [c('GR12-T3-STAT')] },
      ] },
    ],
  });
}

/** Imports the fixture as a draft and publishes it (warnings acknowledged). */
export async function publishFixture(
  w: ReadinessWorld, over: Parameters<typeof fixtureBlueprintFile>[1] = {},
): Promise<IExamBlueprint> {
  const { blueprint } = await importDraft(fixtureBlueprintFile(w, over));
  if (!blueprint) throw new Error('fixture blueprint did not import');
  return publishBlueprint(String(blueprint._id), String(oid()), true);
}

export interface ReadinessRoom extends Classroom {
  world: ReadinessWorld; grade12: Oid; grade10: Oid; maths12: Oid; maths11: Oid; mathsLoose: Oid; mathsLit: Oid; g12: Group;
}

export async function readinessRoom(w: ReadinessWorld): Promise<ReadinessRoom> {
  const room = await standaloneClassroom();
  const now = new Date();
  const [grade12, grade10, maths12, maths11, mathsLoose, mathsLit] = [oid(), oid(), oid(), oid(), oid(), oid()];
  await Grade.collection.insertMany([
    { _id: grade12, schoolId: room.schoolId, name: 'Grade 12', orderIndex: 12, curriculumNodeId: w.gradeNode, isDeleted: false, createdAt: now, updatedAt: now },
    { _id: grade10, schoolId: room.schoolId, name: 'Grade 10', orderIndex: 10, curriculumNodeId: null, isDeleted: false, createdAt: now, updatedAt: now },
  ]);
  const subject = (_id: Oid, name: string, curriculumNodeId: Oid | null) => ({
    _id, schoolId: room.schoolId, name, code: name.slice(0, 4).toUpperCase(), gradeIds: [grade12], curriculumNodeId,
    paperDefaults: null, isDeleted: false, createdAt: now, updatedAt: now,
  });
  await Subject.collection.insertMany([
    subject(maths12, 'Mathematics', w.subjectNodes.gr12), subject(maths11, 'Mathematics', w.subjectNodes.gr11),
    subject(mathsLoose, 'mathematics', null), subject(mathsLit, 'Mathematical Literacy', null),
  ]);
  const g12: Group = { id: oid(), code: classroomCode(), name: 'Grade 12 Maths' };
  await Class.collection.insertOne({
    _id: g12.id, schoolId: room.schoolId, name: g12.name, gradeId: grade12, teacherId: room.teacherId, capacity: 40,
    classroomCode: g12.code, isHomeroom: false, isDeleted: false, createdAt: now, updatedAt: now,
  });
  await Timetable.collection.insertOne({
    schoolId: room.schoolId, classId: g12.id, subjectId: maths12, teacherId: room.teacherId, day: 'monday', period: 1,
    startTime: '08:00', endTime: '08:30', isDeleted: false, createdAt: now, updatedAt: now,
  });
  return { ...room, world: w, grade12, grade10, maths12, maths11, mathsLoose, mathsLit, g12 };
}

export async function grade12Learner(room: ReadinessRoom, first: string, subjectClassIds: Oid[] = []): Promise<Learner> {
  const l = await room.learner(first, room.g12.id, subjectClassIds);
  await Student.collection.updateOne({ _id: l.studentId }, { $set: { gradeId: room.grade12 } });
  return l;
}

export interface EvidenceOver {
  subjectId?: Oid; topicNodeId?: Oid | null; subtopicNodeId?: Oid | null; cognitiveLevel?: string | null;
  marksAwarded?: number; marksAvailable?: number; markedAt?: Date; sourceType?: string; topicFrom?: string;
  questionKey?: string; totalOverridden?: boolean; status?: 'final' | 'provisional'; attemptNumber?: number;
  diagnosis?: Record<string, unknown>; parentId?: Oid;
}

export async function evidence(room: ReadinessRoom, learner: Learner, over: EvidenceOver = {}): Promise<Oid> {
  const _id = oid();
  const markedAt = over.markedAt ?? new Date(Date.now() - 24 * 3600_000);
  await AnswerEvidence.collection.insertOne({
    _id, schoolId: room.schoolId, studentId: learner.studentId, userId: learner.userId, classId: room.g12.id,
    subjectId: over.subjectId ?? room.maths12, gradeId: room.grade12,
    topicNodeId: over.topicNodeId === undefined ? room.world.nodes.FUNC12 : over.topicNodeId,
    subtopicNodeId: over.subtopicNodeId ?? null, topicFrom: over.topicFrom ?? 'question',
    cognitiveLevel: over.cognitiveLevel === undefined ? 'routine' : over.cognitiveLevel,
    marksAwarded: over.marksAwarded ?? 1, marksAvailable: over.marksAvailable ?? 2,
    source: { type: over.sourceType ?? 'test', channel: 'online', recordId: oid(), parentId: over.parentId ?? oid(), itemKey: String(_id), position: 0, attemptNumber: over.attemptNumber ?? 1 },
    questionKey: over.questionKey ?? `q:${String(_id)}`, questionId: null,
    answer: { kind: 'typed', text: 'x', truncated: false, hash: 'h' }, markedBy: 'ai', markerNote: '', markedAt,
    status: over.status ?? 'final', finalAt: markedAt, totalOverridden: over.totalOverridden ?? false,
    diagnosis: { state: 'none', typeId: null, explanation: '', confidence: null, cacheKey: 'k', skippedReason: null, requestId: null, attempts: 0, diagnosedAt: null, dismissedBy: null, dismissedAt: null, ...(over.diagnosis ?? {}) },
    isDeleted: false, deletedReason: null, createdAt: markedAt, updatedAt: markedAt,
  });
  return _id;
}

export async function cleanUpReadiness(w: ReadinessWorld): Promise<void> {
  await Promise.all([
    CurriculumNode.deleteMany({ code: new RegExp(`^${w.prefix}-`) }),
    ExamBlueprint.deleteMany({ subjectKey: w.subjectKey }),
  ]);
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/modules/Readiness/__tests__/blueprint-service.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { ExamBlueprint } from '../model-blueprint.js';
import { copyBlueprint, importDraft, patchVerification, publishBlueprint, validateRaw } from '../blueprint-service.js';
import { isBlueprintVerified } from '../blueprint-validate.js';
import { cleanUpReadiness, fixtureBlueprintFile, makeCurriculum, type ReadinessWorld } from '../../../test-utils/readiness-fixture.js';

let w: ReadinessWorld;
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await ExamBlueprint.syncIndexes();
  w = await makeCurriculum();
});
afterAll(async () => {
  await cleanUpReadiness(w);
  await mongoose.disconnect();
});

describe('blueprint import, publish, copy and verification', () => {
  it('validates without writing, and reports parse errors plainly', async () => {
    const r = await validateRaw({ family: 'x' });
    expect(r.parseErrors.length).toBeGreaterThan(0);
    const ok = await validateRaw(fixtureBlueprintFile(w));
    expect(ok.errors).toEqual([]);
    expect(await ExamBlueprint.countDocuments({ subjectKey: w.subjectKey })).toBe(0);
  });

  it('imports as a draft, and importing the same file again changes nothing', async () => {
    const first = await importDraft(fixtureBlueprintFile(w));
    expect(first).toMatchObject({ changed: true });
    expect(first.blueprint).toMatchObject({ status: 'draft', version: 0 });
    const again = await importDraft(fixtureBlueprintFile(w));
    expect(again.changed).toBe(false);
    expect(String(again.blueprint?._id)).toBe(String(first.blueprint?._id));
  });

  it('refuses to import a file with errors', async () => {
    const bad = fixtureBlueprintFile(w);
    bad.papers[0].totalMarks = 99;
    const r = await importDraft(bad);
    expect(r.blueprint).toBeNull();
    expect(r.report.errors).toContain('P1: topic marks add up to 100, not 99');
  });

  it('publishes as version 1, then a new draft publishes as version 2 and retires version 1', async () => {
    const draft = await ExamBlueprint.findOne({ subjectKey: w.subjectKey, status: 'draft' });
    const v1 = await publishBlueprint(String(draft!._id), String(new mongoose.Types.ObjectId()), true);
    expect(v1).toMatchObject({ status: 'published', version: 1 });
    const file = fixtureBlueprintFile(w);
    file.papers[0].title = 'Paper One';
    const { blueprint } = await importDraft(file);
    const v2 = await publishBlueprint(String(blueprint!._id), String(new mongoose.Types.ObjectId()), true);
    expect(v2).toMatchObject({ status: 'published', version: 2 });
    expect(await ExamBlueprint.findById(v1._id).lean()).toMatchObject({ status: 'retired' });
  });

  it('refuses to publish with unacknowledged warnings, and refuses a second family for the same subject, grade and year', async () => {
    const warn = fixtureBlueprintFile(w, { family: `${w.prefix}-OTHER-FAMILY` });
    warn.papers[1].topics[1].nodes.push(`${w.subjectKey}-GR12-T4-REV`);
    const { blueprint } = await importDraft(warn);
    await expect(publishBlueprint(String(blueprint!._id), 'u', false)).rejects.toThrow(/warnings/);
    await expect(publishBlueprint(String(blueprint!._id), 'u', true)).rejects.toThrow(/already published/);
  });

  it('copies to another year with every value unverified and no dates', async () => {
    const published = await ExamBlueprint.findOne({ subjectKey: w.subjectKey, status: 'published' });
    const copy = await copyBlueprint(String(published!._id), 2027);
    expect(copy).toMatchObject({ status: 'draft', examYear: 2027, version: 0 });
    expect(copy.papers.every((p) => p.examDate === null && !p.verified && p.topics.every((t) => !t.verified))).toBe(true);
    await expect(copyBlueprint(String(published!._id), 2027)).rejects.toThrow(/draft for 2027 already exists/);
  });

  it('patches verification flags, sources and dates, and becomes verified only when all are set', async () => {
    const draft = await ExamBlueprint.findOne({ subjectKey: w.subjectKey, examYear: 2027, status: 'draft' });
    const all = {
      papers: [{ key: 'P1', verified: true, examDate: '2027-10-27', sitting: 'morning' as const }, { key: 'P2', verified: true, examDate: '2027-10-30' }],
      topics: ['P1.FUNC', 'P1.CALC', 'P1.PROB', 'P2.TRIG', 'P2.STAT'].map((key) => ({ key, verified: true, sourceRef: 'EG27 p.8' })),
      levels: ['knowledge', 'routine', 'complex'].map((key) => ({ key, verified: true })),
    };
    const almost = await patchVerification(String(draft!._id), all);
    expect(isBlueprintVerified(almost)).toBe(false);
    const done = await patchVerification(String(draft!._id), { levels: [{ key: 'problem_solving', verified: true }] });
    expect(isBlueprintVerified(done)).toBe(true);
    expect(done.papers[0].topics[0].sourceRef).toBe('EG27 p.8');
    await expect(patchVerification(String(draft!._id), { papers: [{ key: 'P1', examDate: '2028-01-01' }] })).rejects.toThrow(/not in 2027/);
  });

  it('refuses to edit a published blueprint once it is verified', async () => {
    const draft = await ExamBlueprint.findOne({ subjectKey: w.subjectKey, examYear: 2027, status: 'draft' });
    const published = await publishBlueprint(String(draft!._id), 'u', true);
    await expect(patchVerification(String(published._id), { topics: [{ key: 'P1.FUNC', verified: false }] })).rejects.toThrow(/verified and published/);
  });
});
```

```ts
// src/modules/Readiness/__tests__/draft-blueprint.test.ts
//
// The draft Mathematics blueprint (spec §2.6, ruling RP11) validates against the CAPS files the repo holds, and
// nothing in it is verified: it cannot reach a learner until Shaun's 2026 Examination Guidelines are checked.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { blueprintFileSchema, isBlueprintVerified, validateBlueprint, type NodeInfo } from '../blueprint-validate.js';

interface OutputNode { type: string; code: string; title: string; parentCode: string | null }
const nodes: NodeInfo[] = [10, 11, 12].flatMap((g: number) => {
  const file = JSON.parse(readFileSync(`scripts/output/caps-mathematics-gr${g}.json`, 'utf8')) as { nodes: OutputNode[] };
  return file.nodes.filter((n) => n.type === 'topic' || n.type === 'subtopic').map((n): NodeInfo => ({
    id: n.code, code: n.code, type: n.type, title: n.title, parentId: n.parentCode, termNumber: null, system: true, deleted: false,
  }));
});
const draft = blueprintFileSchema.parse(JSON.parse(readFileSync('scripts/blueprints/nsc-mathematics-gr12-2026.json', 'utf8')));
const report = validateBlueprint(draft, new Map(nodes.map((n) => [n.code, n])), nodes);

describe('the draft NSC Mathematics 2026 blueprint', () => {
  it('has no errors and maps every Grade 10–12 content topic exactly once', () => {
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it('adds up: Paper 1 and Paper 2 are 150 each, and the levels are 20/35/30/15', () => {
    expect(draft.papers.map((p) => [p.key, p.totalMarks, p.topics.reduce((s, t) => s + t.marks, 0)])).toEqual([['P1', 150, 150], ['P2', 150, 150]]);
    expect(draft.cognitiveScheme.levels.map((l) => l.percent)).toEqual([20, 35, 30, 15]);
  });

  it('is entirely unverified, has no exam dates, and carries the Paper 2 conflict note', () => {
    expect(isBlueprintVerified(report.data!)).toBe(false);
    expect(draft.papers.every((p) => !p.verified && p.examDate === null && p.topics.every((t) => !t.verified))).toBe(true);
    expect(draft.cognitiveScheme.levels.every((l) => !l.verified)).toBe(true);
    for (const key of ['P2.TRIG', 'P2.GEOM']) {
      expect(draft.papers[1].topics.find((t) => t.key === key)?.note).toMatch(/conflict/i);
    }
  });

  it('sends Grade 10–11 trigonometric graphs to Paper 2, not Paper 1', () => {
    const trig = draft.papers[1].topics.find((t) => t.key === 'P2.TRIG')!;
    expect(trig.nodes).toEqual(expect.arrayContaining(['CAPS-MATHEMATICS-GR10-T2-FUNC-05', 'CAPS-MATHEMATICS-GR11-T2-FUNC-06']));
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/blueprint-service.test.ts src/modules/Readiness/__tests__/draft-blueprint.test.ts`
Expected: FAIL, with `Cannot find module '../model-blueprint.js'` and `ENOENT … nsc-mathematics-gr12-2026.json`.

- [ ] **Step 4: Implement the model**

```ts
// src/modules/Readiness/model-blueprint.ts
//
// ExamBlueprint (spec §2.1): one document per subject family × exam year × version; global, no learner data.
import mongoose, { Schema, Document, Types } from 'mongoose';
import { CAPS_LEVELS } from '../QuestionBank/model-shared.js';
import type { BlueprintData, BlueprintLevel, BlueprintPaper, BlueprintSource, BlueprintTopic, MappedNode } from './types.js';

export const BLUEPRINT_STATUSES = ['draft', 'published', 'retired'] as const;
export type BlueprintStatus = (typeof BLUEPRINT_STATUSES)[number];

export interface IExamBlueprint extends Document, BlueprintData {
  status: BlueprintStatus;
  version: number;
  acknowledgedWarnings: string[];
  publishedBy: Types.ObjectId | null;
  publishedAt: Date | null;
  supersedes: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const nodeSchema = new Schema<MappedNode>({
  code: { type: String, required: true }, nodeId: { type: String, required: true },
  level: { type: String, enum: ['topic', 'subtopic'], required: true }, grade: { type: Number, required: true },
  termNumber: { type: Number, default: null },
}, { _id: false });
const topicSchema = new Schema<BlueprintTopic>({
  key: { type: String, required: true }, label: { type: String, required: true }, group: { type: String, required: true },
  marks: { type: Number, required: true, min: 1 }, tolerance: { type: Number, default: null },
  sourceRef: { type: String, default: '' }, verified: { type: Boolean, default: false }, note: { type: String, default: '' },
  nodes: { type: [nodeSchema], default: [] },
}, { _id: false });
const paperSchema = new Schema<BlueprintPaper>({
  key: { type: String, required: true }, title: { type: String, required: true },
  totalMarks: { type: Number, required: true, min: 1 }, durationMinutes: { type: Number, required: true, min: 1 },
  examDate: { type: String, default: null }, sitting: { type: String, enum: ['morning', 'afternoon', null], default: null },
  sourceRef: { type: String, default: '' }, verified: { type: Boolean, default: false },
  topics: { type: [topicSchema], default: [] },
}, { _id: false });
const levelSchema = new Schema<BlueprintLevel>({
  key: { type: String, required: true }, label: { type: String, required: true }, percent: { type: Number, required: true, min: 0, max: 100 },
  fromStored: { type: [String], enum: CAPS_LEVELS, default: [] }, sourceRef: { type: String, default: '' }, verified: { type: Boolean, default: false },
}, { _id: false });
const sourceSchema = new Schema<BlueprintSource>({
  ref: { type: String, required: true }, title: { type: String, required: true },
  edition: { type: String, default: '' }, publisher: { type: String, default: '' },
}, { _id: false });

const examBlueprintSchema = new Schema<IExamBlueprint>({
  family: { type: String, required: true, trim: true },
  examBody: { type: String, enum: ['DBE'], required: true },
  qualification: { type: String, enum: ['NSC'], required: true },
  session: { type: String, enum: ['november'], required: true },
  subjectKey: { type: String, required: true }, slug: { type: String, required: true }, subjectTitle: { type: String, required: true },
  grade: { type: Number, required: true }, examYear: { type: Number, required: true },
  sources: { type: [sourceSchema], default: [] },
  cognitiveScheme: {
    key: { type: String, required: true },
    levels: { type: [levelSchema], default: [] },
  },
  papers: { type: [paperSchema], default: [] },
  status: { type: String, enum: BLUEPRINT_STATUSES, required: true },
  version: { type: Number, default: 0 },
  acknowledgedWarnings: { type: [String], default: [] },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  publishedAt: { type: Date, default: null },
  supersedes: { type: Schema.Types.ObjectId, ref: 'ExamBlueprint', default: null },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

examBlueprintSchema.index({ family: 1, examYear: 1 }, { unique: true, partialFilterExpression: { status: 'draft', isDeleted: false } });
examBlueprintSchema.index({ subjectKey: 1, grade: 1, examYear: 1 }, { unique: true, partialFilterExpression: { status: 'published', isDeleted: false } });
examBlueprintSchema.index({ slug: 1, grade: 1, examYear: 1, status: 1 });

export const ExamBlueprint = mongoose.model<IExamBlueprint>('ExamBlueprint', examBlueprintSchema);
```

- [ ] **Step 5: Implement the service and the script**

```ts
// src/modules/Readiness/blueprint-service.ts
//
// Import as a draft, publish, copy to a new year, and the verification patch (spec §2.4). Numbers change only
// through the file; the patch touches flags, source references and dates, and never a verified published blueprint.
import mongoose from 'mongoose';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors.js';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { ExamBlueprint, type IExamBlueprint } from './model-blueprint.js';
import {
  blueprintFileSchema, isBlueprintVerified, validateBlueprint, type BlueprintFile, type NodeInfo, type ValidationReport,
} from './blueprint-validate.js';
import type { BlueprintData } from './types.js';

type RawNode = { _id: mongoose.Types.ObjectId; code: string; type: string; title: string; parentId: mongoose.Types.ObjectId | null; termNumber?: number | null; schoolId: mongoose.Types.ObjectId | null; isDeleted: boolean };
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toInfo = (n: RawNode): NodeInfo => ({
  id: String(n._id), code: n.code, type: n.type, title: n.title, parentId: n.parentId ? String(n.parentId) : null,
  termNumber: n.termNumber ?? null, system: n.schoolId === null, deleted: n.isDeleted,
});
const FIELDS = 'code type title parentId termNumber schoolId isDeleted';

export async function loadNodesFor(file: BlueprintFile): Promise<{ byCode: Map<string, NodeInfo>; family: NodeInfo[] }> {
  const codes = [...new Set(file.papers.flatMap((p) => p.topics.flatMap((t) => t.nodes)))];
  const [named, family] = await Promise.all([
    CurriculumNode.find({ code: { $in: codes } }).select(FIELDS).lean(),
    CurriculumNode.find({
      code: new RegExp(`^${escape(file.subjectKey)}-GR1[0-2]-`), type: { $in: ['topic', 'subtopic'] }, schoolId: null, isDeleted: false,
    }).select(FIELDS).lean(),
  ]);
  return {
    byCode: new Map((named as unknown as RawNode[]).map((n) => [n.code, toInfo(n)])),
    family: (family as unknown as RawNode[]).map(toInfo),
  };
}

export async function validateRaw(raw: unknown): Promise<ValidationReport & { parseErrors: string[] }> {
  const parsed = blueprintFileSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: [], warnings: [], unverified: [], data: null, parseErrors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  const { byCode, family } = await loadNodesFor(parsed.data);
  return { ...validateBlueprint(parsed.data, byCode, family), parseErrors: [] };
}

/** The data part of a stored blueprint, as plain JSON (for re-validation, comparison and the engine). */
export function blueprintData(doc: IExamBlueprint): BlueprintData {
  const o = doc.toObject() as unknown as BlueprintData;
  return {
    family: o.family, examBody: o.examBody, qualification: o.qualification, session: o.session, subjectKey: o.subjectKey,
    slug: o.slug, subjectTitle: o.subjectTitle, grade: o.grade, examYear: o.examYear, sources: o.sources,
    cognitiveScheme: { key: o.cognitiveScheme.key, levels: o.cognitiveScheme.levels }, papers: o.papers,
  };
}

/** Key-order-free JSON, so a stored document and a parsed file compare by content. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k: string) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}
const same = (a: BlueprintData, b: BlueprintData): boolean => stable(a) === stable(b);

export async function importDraft(raw: unknown): Promise<{
  report: ValidationReport & { parseErrors: string[] }; blueprint: IExamBlueprint | null; changed: boolean;
}> {
  const report = await validateRaw(raw);
  if (!report.data) return { report, blueprint: null, changed: false };
  const existing = await ExamBlueprint.findOne({ family: report.data.family, examYear: report.data.examYear, status: 'draft', isDeleted: false });
  if (existing && same(blueprintData(existing), report.data)) return { report, blueprint: existing, changed: false };
  const blueprint = await ExamBlueprint.findOneAndUpdate(
    { family: report.data.family, examYear: report.data.examYear, status: 'draft', isDeleted: false },
    { $set: { ...report.data, acknowledgedWarnings: [] }, $setOnInsert: { version: 0, publishedBy: null, publishedAt: null, supersedes: null } },
    { upsert: true, new: true },
  );
  return { report, blueprint, changed: true };
}

async function revalidate(doc: IExamBlueprint): Promise<ValidationReport> {
  const data = blueprintData(doc);
  const file = blueprintFileSchema.parse({ ...data, papers: data.papers.map((p) => ({ ...p, topics: p.topics.map((t) => ({ ...t, nodes: t.nodes.map((n) => n.code) })) })) });
  const { byCode, family } = await loadNodesFor(file);
  return validateBlueprint(file, byCode, family);
}

export async function publishBlueprint(id: string, byUserId: string, acknowledgeWarnings: boolean): Promise<IExamBlueprint> {
  const doc = await ExamBlueprint.findOne({ _id: id, status: 'draft', isDeleted: false });
  if (!doc) throw new NotFoundError('Draft blueprint not found');
  const report = await revalidate(doc);
  if (report.errors.length > 0) throw new BadRequestError(`This blueprint has errors: ${report.errors.join('; ')}`);
  if (report.warnings.length > 0 && !acknowledgeWarnings) throw new BadRequestError(`Acknowledge the warnings to publish: ${report.warnings.join('; ')}`);
  const other = await ExamBlueprint.findOne({
    subjectKey: doc.subjectKey, grade: doc.grade, examYear: doc.examYear, status: 'published', isDeleted: false, family: { $ne: doc.family },
  }).select('family').lean();
  if (other) throw new ConflictError(`${other.family} is already published for this subject, grade and year: retire it first`);
  const previous = await ExamBlueprint.findOne({ family: doc.family, examYear: doc.examYear, status: 'published', isDeleted: false });
  const top = await ExamBlueprint.findOne({ family: doc.family, examYear: doc.examYear, isDeleted: false }).sort({ version: -1 }).select('version').lean();
  if (previous) await ExamBlueprint.updateOne({ _id: previous._id }, { $set: { status: 'retired' } });
  doc.set({
    status: 'published', version: (top?.version ?? 0) + 1, acknowledgedWarnings: report.warnings,
    publishedBy: mongoose.Types.ObjectId.isValid(byUserId) ? new mongoose.Types.ObjectId(byUserId) : null,
    publishedAt: new Date(), supersedes: previous?._id ?? null,
  });
  await doc.save();
  return doc;
}

export async function copyBlueprint(id: string, examYear: number): Promise<IExamBlueprint> {
  const doc = await ExamBlueprint.findOne({ _id: id, isDeleted: false });
  if (!doc) throw new NotFoundError('Blueprint not found');
  const data = blueprintData(doc);
  if (await ExamBlueprint.exists({ family: data.family, examYear, status: 'draft', isDeleted: false })) {
    throw new ConflictError(`A draft for ${examYear} already exists`);
  }
  return ExamBlueprint.create({
    ...data, examYear, status: 'draft', version: 0, acknowledgedWarnings: [], publishedBy: null, publishedAt: null, supersedes: null,
    cognitiveScheme: { key: data.cognitiveScheme.key, levels: data.cognitiveScheme.levels.map((l) => ({ ...l, verified: false })) },
    papers: data.papers.map((p) => ({ ...p, verified: false, examDate: null, sitting: null, topics: p.topics.map((t) => ({ ...t, verified: false })) })),
  });
}

export interface VerificationPatch {
  papers?: Array<{ key: string; verified?: boolean; sourceRef?: string; examDate?: string | null; sitting?: 'morning' | 'afternoon' | null }>;
  topics?: Array<{ key: string; verified?: boolean; sourceRef?: string }>;
  levels?: Array<{ key: string; verified?: boolean; sourceRef?: string }>;
}

export async function patchVerification(id: string, patch: VerificationPatch): Promise<IExamBlueprint> {
  const doc = await ExamBlueprint.findOne({ _id: id, status: { $in: ['draft', 'published'] }, isDeleted: false });
  if (!doc) throw new NotFoundError('Blueprint not found');
  const data = blueprintData(doc);
  if (doc.status === 'published' && isBlueprintVerified(data)) {
    throw new BadRequestError('This blueprint is verified and published: copy it to change it');
  }
  const topicPatch = new Map((patch.topics ?? []).map((t) => [t.key, t]));
  const papers = data.papers.map((p) => {
    const pp = (patch.papers ?? []).find((x) => x.key === p.key);
    if (pp?.examDate && Number(pp.examDate.slice(0, 4)) !== data.examYear) {
      throw new BadRequestError(`${p.key}: exam date ${pp.examDate} is not in ${data.examYear}`);
    }
    return {
      ...p, ...(pp ? Object.fromEntries(Object.entries(pp).filter(([k]) => k !== 'key')) : {}),
      topics: p.topics.map((t) => ({ ...t, ...Object.fromEntries(Object.entries(topicPatch.get(t.key) ?? {}).filter(([k]) => k !== 'key')) })),
    };
  });
  const levels = data.cognitiveScheme.levels.map((l) => {
    const lp = (patch.levels ?? []).find((x) => x.key === l.key);
    return { ...l, ...(lp ? Object.fromEntries(Object.entries(lp).filter(([k]) => k !== 'key')) : {}) };
  });
  doc.set({ papers, cognitiveScheme: { key: data.cognitiveScheme.key, levels } });
  await doc.save();
  return doc;
}
```

```ts
// src/scripts/blueprint-import.ts
//
// npm run blueprint:import -- --file=scripts/blueprints/<family>-<year>.json [--apply]
// Dry run by default: prints the validation report. --apply saves the file as the family's draft for its year
// (never publishes; publishing is the super-admin page's job).
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { importDraft, validateRaw } from '../modules/Readiness/blueprint-service.js';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a: string) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function main(): Promise<void> {
  const file = arg('file');
  if (!file) throw new Error('Usage: npm run blueprint:import -- --file=<path> [--apply]');
  const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
  await mongoose.connect(config.mongodb.uri);
  const apply = process.argv.includes('--apply');
  const report = apply ? (await importDraft(raw)).report : await validateRaw(raw);
  const out = (title: string, lines: string[]) => console.log(`\n${title} (${lines.length})\n${lines.map((l) => `  - ${l}`).join('\n')}`);
  out('Parse errors', report.parseErrors);
  out('Errors', report.errors);
  out('Warnings', report.warnings);
  out('Unverified', report.unverified);
  console.log(apply ? (report.data ? '\nSaved as draft.' : '\nNot saved.') : '\nDry run: nothing saved (add --apply).');
  await mongoose.disconnect();
  if (report.parseErrors.length > 0 || report.errors.length > 0) process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

This connects the way `src/scripts/backfill-unit-enrolments.ts:52` does (`config.mongodb.uri`, `src/config/env.ts:25-26`).

- [ ] **Step 6: Write the draft Mathematics file (spec §2.6)**

```json
{
  "family": "NSC-MATHEMATICS-GR12",
  "examBody": "DBE",
  "qualification": "NSC",
  "session": "november",
  "subjectKey": "CAPS-MATHEMATICS",
  "slug": "mathematics",
  "subjectTitle": "Mathematics",
  "grade": 12,
  "examYear": 2026,
  "sources": [
    { "ref": "ATP12", "title": "Grade 12 Mathematics ATP (AI transcription in scripts/output/caps-mathematics-gr12.json, Term 4 description)", "edition": "undated, older than 2026", "publisher": "DBE" },
    { "ref": "GEN", "title": "Paper generator fallback weighting (src/modules/QuestionBank/service-paper-generation.ts)", "edition": "code constant", "publisher": "Campusly" },
    { "ref": "EG26", "title": "Mathematics Examination Guidelines Grade 12", "edition": "2026, not yet received", "publisher": "DBE" }
  ],
  "cognitiveScheme": {
    "key": "maths-4",
    "levels": [
      { "key": "knowledge", "label": "Knowledge", "percent": 20, "fromStored": ["knowledge"], "sourceRef": "GEN", "verified": false },
      { "key": "routine", "label": "Routine procedures", "percent": 35, "fromStored": ["routine"], "sourceRef": "GEN", "verified": false },
      { "key": "complex", "label": "Complex procedures", "percent": 30, "fromStored": ["complex"], "sourceRef": "GEN", "verified": false },
      { "key": "problem_solving", "label": "Problem solving", "percent": 15, "fromStored": ["problem_solving"], "sourceRef": "GEN", "verified": false }
    ]
  },
  "papers": [
    {
      "key": "P1", "title": "Paper 1", "totalMarks": 150, "durationMinutes": 180, "examDate": null, "sitting": null, "sourceRef": "ATP12", "verified": false,
      "topics": [
        { "key": "P1.ALG", "label": "Algebra, equations and inequalities", "group": "Algebra and patterns", "marks": 25, "tolerance": null, "sourceRef": "ATP12", "verified": false, "note": "",
          "nodes": ["CAPS-MATHEMATICS-GR10-T1-ALG", "CAPS-MATHEMATICS-GR10-T1-EXP", "CAPS-MATHEMATICS-GR11-T1-EXP", "CAPS-MATHEMATICS-GR11-T1-EQN"] },
        { "key": "P1.PATT", "label": "Number patterns, sequences and series", "group": "Algebra and patterns", "marks": 25, "tolerance": null, "sourceRef": "ATP12", "verified": false, "note": "",
          "nodes": ["CAPS-MATHEMATICS-GR10-T4-PATT", "CAPS-MATHEMATICS-GR11-T4-PATT", "CAPS-MATHEMATICS-GR12-T1-SEQ"] },
        { "key": "P1.FUNC", "label": "Functions and graphs", "group": "Functions and calculus", "marks": 35, "tolerance": null, "sourceRef": "ATP12", "verified": false,
          "note": "Grade 10–11 trigonometric-graph subtopics are mapped to P2.TRIG; check against EG26.",
          "nodes": ["CAPS-MATHEMATICS-GR10-T2-FUNC", "CAPS-MATHEMATICS-GR11-T2-FUNC", "CAPS-MATHEMATICS-GR12-T1-FUNC"] },
        { "key": "P1.CALC", "label": "Differential calculus", "group": "Functions and calculus", "marks": 35, "tolerance": null, "sourceRef": "ATP12", "verified": false,
          "note": "Includes GR12-T2-CALC-01 factor and remainder theorems; check which topic EG26 examines them under.",
          "nodes": ["CAPS-MATHEMATICS-GR12-T2-CALC"] },
        { "key": "P1.FIN", "label": "Finance, growth and decay", "group": "Finance and probability", "marks": 15, "tolerance": null, "sourceRef": "ATP12", "verified": false, "note": "",
          "nodes": ["CAPS-MATHEMATICS-GR10-T3-FIN", "CAPS-MATHEMATICS-GR11-T3-FIN", "CAPS-MATHEMATICS-GR12-T3-FIN"] },
        { "key": "P1.PROB", "label": "Counting and probability", "group": "Finance and probability", "marks": 15, "tolerance": null, "sourceRef": "ATP12", "verified": false, "note": "",
          "nodes": ["CAPS-MATHEMATICS-GR10-T3-PROB", "CAPS-MATHEMATICS-GR11-T3-PROB", "CAPS-MATHEMATICS-GR12-T3-PROB"] }
      ]
    },
    {
      "key": "P2", "title": "Paper 2", "totalMarks": 150, "durationMinutes": 180, "examDate": null, "sitting": null, "sourceRef": "ATP12", "verified": false,
      "topics": [
        { "key": "P2.ANAG", "label": "Analytical geometry", "group": "Geometry", "marks": 40, "tolerance": null, "sourceRef": "ATP12", "verified": false, "note": "",
          "nodes": ["CAPS-MATHEMATICS-GR10-T2-ANAG", "CAPS-MATHEMATICS-GR11-T2-ANAG", "CAPS-MATHEMATICS-GR12-T2-ANAG"] },
        { "key": "P2.GEOM", "label": "Euclidean geometry and measurement", "group": "Geometry", "marks": 40, "tolerance": null, "sourceRef": "ATP12", "verified": false,
          "note": "Conflict: the ATP transcription gives Euclidean Geometry 40; the CAPS table as recalled (not a repo source) gives Euclidean Geometry and Measurement 50 ± 3. EG26 decides.",
          "nodes": ["CAPS-MATHEMATICS-GR10-T2-GEOM", "CAPS-MATHEMATICS-GR11-T2-GEOM", "CAPS-MATHEMATICS-GR12-T2-GEOM", "CAPS-MATHEMATICS-GR10-T4-MEAS", "CAPS-MATHEMATICS-GR11-T4-MEAS"] },
        { "key": "P2.TRIG", "label": "Trigonometry", "group": "Trigonometry and statistics", "marks": 50, "tolerance": null, "sourceRef": "ATP12", "verified": false,
          "note": "Conflict: the ATP transcription gives Trigonometry 50; the CAPS table as recalled (not a repo source) gives 40 ± 3. EG26 decides.",
          "nodes": ["CAPS-MATHEMATICS-GR10-T1-TRIG", "CAPS-MATHEMATICS-GR10-T3-TRIG2D", "CAPS-MATHEMATICS-GR11-T1-TRIG", "CAPS-MATHEMATICS-GR11-T3-TRIG", "CAPS-MATHEMATICS-GR12-T1-TRIG",
                    "CAPS-MATHEMATICS-GR10-T2-FUNC-05", "CAPS-MATHEMATICS-GR10-T2-FUNC-06",
                    "CAPS-MATHEMATICS-GR11-T2-FUNC-03", "CAPS-MATHEMATICS-GR11-T2-FUNC-04", "CAPS-MATHEMATICS-GR11-T2-FUNC-05", "CAPS-MATHEMATICS-GR11-T2-FUNC-06"] },
        { "key": "P2.STAT", "label": "Statistics", "group": "Trigonometry and statistics", "marks": 20, "tolerance": null, "sourceRef": "ATP12", "verified": false, "note": "",
          "nodes": ["CAPS-MATHEMATICS-GR10-T3-STAT", "CAPS-MATHEMATICS-GR11-T3-STAT", "CAPS-MATHEMATICS-GR12-T3-STAT"] }
      ]
    }
  ]
}
```

Save it as `scripts/blueprints/nsc-mathematics-gr12-2026.json`. Add `"blueprint:import": "tsx src/scripts/blueprint-import.ts"` to `package.json`'s scripts.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing. If the draft test reports a warning such as `Not in any paper: CAPS-MATHEMATICS-GR12-T4-…`, a Grade 12 Term 4 content node exists that the spec's table missed. Map it in the JSON the way §2.6 maps its Grade 10–11 equivalent, and report it to the orchestrator.

- [ ] **Step 8: Commit**

```bash
git add src/modules/Readiness src/scripts/blueprint-import.ts src/test-utils/readiness-fixture.ts scripts/blueprints package.json
LANE_SWEEP_OK=1 git commit -m "feat(readiness): exam blueprints as data: import as draft, publish, copy, verify; the unverified draft for NSC Mathematics 2026" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: which blueprint applies, and which Subjects feed it

**Files:**
- Create: `src/modules/Readiness/blueprint-resolve.ts`, `src/modules/Readiness/engine/sast.ts`
- Test: `src/modules/Readiness/__tests__/blueprint-resolve.test.ts`

**Interfaces:**
- Consumes: Task 1 (`gradeOfCode`); Task 2 (`ExamBlueprint`, the fixture); `Grade`, `Subject`, `Class`, `Timetable` (`src/modules/Academic/model.ts`); `CurriculumNode`.
- Produces:
  - `engine/sast.ts`: `sastDay(d: Date): string`, `sastWeekStart(d: Date): string`, `sastYear(d: Date): number`, `sastMonth(d: Date): number`, `sastDayStart(day: string): Date`, `daysUntilDay(day: string, now: Date): number`, `DAY_MS`.
  - `familyOfCode(code: string): string | null`
  - `gradeNumberFor(schoolId: Oid, gradeId: Oid | null | undefined): Promise<number | null>`
  - `subjectFamily(schoolId: Oid, subjectId: Oid): Promise<{ subjectKey: string | null; title: string } | null>`
  - `familySubjectIds(schoolId: Oid, bp: { subjectKey: string; subjectTitle: string }): Promise<Oid[]>`
  - `publishedBlueprint(q: { subjectKey?: string; slug?: string; grade: number; examYear: number }): Promise<IExamBlueprint | null>`
  - `interface LearnerTarget { studentId: Oid; grade: number; blueprint: IExamBlueprint; subjectIds: Oid[] }`
  - `learnerTarget(schoolId: Oid, studentId: Oid, subjectKey: string, now: Date): Promise<LearnerTarget | null>`

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Readiness/__tests__/blueprint-resolve.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Student } from '../../Student/model.js';
import { ExamBlueprint } from '../model-blueprint.js';
import { familyOfCode, familySubjectIds, gradeNumberFor, learnerTarget, publishedBlueprint, subjectFamily } from '../blueprint-resolve.js';
import { sastDay, sastWeekStart, sastYear, daysUntilDay } from '../engine/sast.js';
import { cleanUpClassrooms } from '../../../test-utils/standalone-classroom.js';
import {
  cleanUpReadiness, grade12Learner, makeCurriculum, publishFixture, readinessRoom, type ReadinessRoom, type ReadinessWorld,
} from '../../../test-utils/readiness-fixture.js';

let w: ReadinessWorld;
let room: ReadinessRoom;
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await ExamBlueprint.syncIndexes();
  w = await makeCurriculum();
  room = await readinessRoom(w);
  await publishFixture(w, { examYear: 2026 });
});
afterAll(async () => {
  await cleanUpReadiness(w);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

describe('SAST calendar', () => {
  it('sastWeekStart and sastDay use Johannesburg time: 22:30 UTC on a Sunday is already Monday', () => {
    expect(sastWeekStart(new Date('2026-09-27T22:30:00Z'))).toBe('2026-09-28');
    expect(sastWeekStart(new Date('2026-09-27T21:59:00Z'))).toBe('2026-09-21');
    expect(sastDay(new Date('2026-12-31T22:30:00Z'))).toBe('2027-01-01');
    expect(sastYear(new Date('2026-12-31T22:30:00Z'))).toBe(2027);
    expect(daysUntilDay('2026-10-27', new Date('2026-09-27T22:30:00Z'))).toBe(29);
  });
});

describe('resolution', () => {
  it('reads a family from a subject node code', () => {
    expect(familyOfCode('CAPS-MATHEMATICS-GR12')).toBe('CAPS-MATHEMATICS');
    expect(familyOfCode('CAPS-MATHEMATICS-GR12-T1-FUNC')).toBeNull();
  });

  it('finds the grade by the node link, else by the name', async () => {
    expect(await gradeNumberFor(room.schoolId, room.grade12)).toBe(12);
    expect(await gradeNumberFor(room.schoolId, room.grade10)).toBe(10);
    expect(await gradeNumberFor(room.schoolId, new mongoose.Types.ObjectId())).toBeNull();
  });

  it("finds a Subject's family by its node, and a teaching group's CurriculumNode subject too", async () => {
    expect(await subjectFamily(room.schoolId, room.maths12)).toEqual({ subjectKey: w.subjectKey, title: 'Mathematics' });
    expect(await subjectFamily(room.schoolId, w.subjectNodes.gr12)).toEqual({ subjectKey: w.subjectKey, title: 'Mathematics' });
    expect(await subjectFamily(room.schoolId, room.mathsLit)).toEqual({ subjectKey: null, title: 'Mathematical Literacy' });
  });

  it('reads every Mathematics Subject of the school, never Mathematical Literacy', async () => {
    const ids = (await familySubjectIds(room.schoolId, { subjectKey: w.subjectKey, subjectTitle: 'Mathematics' })).map(String).sort();
    expect(ids).toEqual([room.maths12, room.maths11, room.mathsLoose].map(String).sort());
  });

  it('finds the published blueprint by subject key or slug', async () => {
    expect(await publishedBlueprint({ subjectKey: w.subjectKey, grade: 12, examYear: 2026 })).toMatchObject({ status: 'published' });
    expect(await publishedBlueprint({ slug: `m${w.prefix.toLowerCase()}`, grade: 12, examYear: 2026 })).toMatchObject({ status: 'published' });
    expect(await publishedBlueprint({ subjectKey: w.subjectKey, grade: 12, examYear: 2027 })).toBeNull();
  });

  it('gives a Grade 12 learner the blueprint for this SAST year, and a Grade 10 learner none', async () => {
    const thabo = await grade12Learner(room, 'Thabo');
    const t = await learnerTarget(room.schoolId, thabo.studentId, w.subjectKey, new Date('2026-09-26T10:00:00Z'));
    expect(t).toMatchObject({ grade: 12 });
    expect(t?.subjectIds).toHaveLength(3);
    await Student.collection.updateOne({ _id: thabo.studentId }, { $set: { gradeId: room.grade10 } });
    expect(await learnerTarget(room.schoolId, thabo.studentId, w.subjectKey, new Date('2026-09-26T10:00:00Z'))).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/blueprint-resolve.test.ts`
Expected: FAIL, with `Cannot find module '../blueprint-resolve.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Readiness/engine/sast.ts
//
// South African calendar days and weeks (UTC+2, no daylight saving), pure (ruling RP5).
const SAST_MS = 2 * 3600_000;
export const DAY_MS = 86_400_000;

export function sastDay(d: Date): string {
  return new Date(d.getTime() + SAST_MS).toISOString().slice(0, 10);
}

/** The SAST Monday of the week, YYYY-MM-DD. */
export function sastWeekStart(d: Date): string {
  const local = new Date(d.getTime() + SAST_MS);
  const back = (local.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - back)).toISOString().slice(0, 10);
}

export function sastYear(d: Date): number {
  return Number(sastDay(d).slice(0, 4));
}

export function sastMonth(d: Date): number {
  return Number(sastDay(d).slice(5, 7));
}

/** The instant a SAST day starts. */
export function sastDayStart(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) - SAST_MS);
}

/** Whole SAST days from today to `day`; negative once it has passed. */
export function daysUntilDay(day: string, now: Date): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${sastDay(now)}T00:00:00Z`)) / DAY_MS);
}
```

```ts
// src/modules/Readiness/blueprint-resolve.ts
//
// Which blueprint applies to a learner, and which school Subjects feed it (spec §2.5).
import mongoose from 'mongoose';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { Grade, Subject } from '../Academic/model.js';
import { Student } from '../Student/model.js';
import { ExamBlueprint, type IExamBlueprint } from './model-blueprint.js';
import { gradeOfCode } from './blueprint-validate.js';
import { sastYear } from './engine/sast.js';
import type { Oid } from './types.js';

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `CAPS-MATHEMATICS-GR12` → `CAPS-MATHEMATICS`; anything that isn't a subject node code → null. */
export function familyOfCode(code: string): string | null {
  const m = code.match(/^(.*)-GR\d{1,2}$/);
  return m ? m[1] : null;
}

export async function gradeNumberFor(schoolId: Oid, gradeId: Oid | null | undefined): Promise<number | null> {
  if (!gradeId) return null;
  const grade = await Grade.findOne({ _id: gradeId, schoolId, isDeleted: false }).select('name curriculumNodeId').lean();
  if (!grade) return null;
  if (grade.curriculumNodeId) {
    const node = await CurriculumNode.findOne({ _id: grade.curriculumNodeId, isDeleted: false }).select('code').lean();
    const fromCode = node ? gradeOfCode(node.code) : null;
    if (fromCode !== null) return fromCode;
  }
  const m = grade.name.match(/\b(\d{1,2})\b/);
  return m ? Number(m[1]) : null;
}

/** A school Subject's family; a teaching group's Timetable subject may be a CurriculumNode instead (grade.service.ts:55-60). */
export async function subjectFamily(schoolId: Oid, subjectId: Oid): Promise<{ subjectKey: string | null; title: string } | null> {
  const subject = await Subject.findOne({ _id: subjectId, schoolId, isDeleted: false }).select('name curriculumNodeId').lean();
  const nodeId = subject ? subject.curriculumNodeId : subjectId;
  const node = nodeId ? await CurriculumNode.findOne({ _id: nodeId, type: 'subject', isDeleted: false }).select('code title').lean() : null;
  if (!subject && !node) return null;
  const title = subject?.name ?? node?.title ?? '';
  if (node) return { subjectKey: familyOfCode(node.code), title };
  const byName = await ExamBlueprint.findOne({ subjectTitle: new RegExp(`^${escape(title.trim())}$`, 'i'), status: 'published', isDeleted: false })
    .select('subjectKey').lean();
  return { subjectKey: byName?.subjectKey ?? null, title };
}

/** Every school Subject in the family: linked to one of its subject nodes, or unlinked with exactly its title. */
export async function familySubjectIds(schoolId: Oid, bp: { subjectKey: string; subjectTitle: string }): Promise<Oid[]> {
  const nodes = await CurriculumNode.find({ type: 'subject', code: new RegExp(`^${escape(bp.subjectKey)}-GR\\d{1,2}$`), isDeleted: false })
    .select('_id').lean();
  const subjects = await Subject.find({
    schoolId, isDeleted: false,
    $or: [
      { curriculumNodeId: { $in: nodes.map((n) => n._id) } },
      { curriculumNodeId: null, name: new RegExp(`^${escape(bp.subjectTitle.trim())}$`, 'i') },
    ],
  }).select('_id').lean();
  return subjects.map((s) => s._id as Oid);
}

export async function publishedBlueprint(q: { subjectKey?: string; slug?: string; grade: number; examYear: number }): Promise<IExamBlueprint | null> {
  const key = q.subjectKey ? { subjectKey: q.subjectKey } : { slug: q.slug };
  return ExamBlueprint.findOne({ ...key, grade: q.grade, examYear: q.examYear, status: 'published', isDeleted: false });
}

export interface LearnerTarget { studentId: Oid; grade: number; blueprint: IExamBlueprint; subjectIds: Oid[] }

export async function learnerTarget(schoolId: Oid, studentId: Oid, subjectKey: string, now: Date): Promise<LearnerTarget | null> {
  const student = await Student.findOne({ _id: studentId, schoolId, isDeleted: false }).select('gradeId').lean();
  if (!student) return null;
  const grade = await gradeNumberFor(schoolId, student.gradeId as Oid);
  if (grade === null) return null;
  const blueprint = await publishedBlueprint({ subjectKey, grade, examYear: sastYear(now) });
  if (!blueprint) return null;
  const subjectIds = await familySubjectIds(schoolId, blueprint);
  return { studentId: new mongoose.Types.ObjectId(String(studentId)), grade, blueprint, subjectIds };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Readiness
LANE_SWEEP_OK=1 git commit -m "feat(readiness): which blueprint applies to a learner, and every school Subject in its family (never Mathematical Literacy)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: the engine, part 1: row weights, retries, mapping and per-topic stats

**Files:**
- Create: `src/modules/Readiness/engine/weights.ts`, `src/modules/Readiness/engine/mapping.ts`, `src/modules/Readiness/engine/aggregate.ts`
- Test: `src/modules/Readiness/__tests__/engine-aggregate.test.ts`, plus `src/modules/Readiness/__tests__/engine-helpers.ts`, a test helper (no tests of its own)

**Interfaces:**
- Consumes: Task 1 (`EngineRow`, `BlueprintData`, constants); Task 3 (`DAY_MS`).
- Produces:
  - `interface WeightParts { recency: number; source: number; tag: number; override: number; total: number }`
  - `recencyWeight(markedAt: Date, asOf: Date): number`, `rowWeight(row: EngineRow, asOf: Date): WeightParts`
  - `latestPerQuestion(rows: readonly EngineRow[], asOf: Date): EngineRow[]`
  - `interface TopicRef { paperKey: string; topicKey: string }`, `interface BlueprintIndex`, `blueprintIndex(bp: Pick<BlueprintData, 'papers'>): BlueprintIndex`, `examTopicsOf(index: BlueprintIndex, row: Pick<EngineRow, 'topicNodeId' | 'subtopicNodeId'>): TopicRef[]`
  - `schemeLevelOf(bp: Pick<BlueprintData, 'cognitiveScheme'>, stored: string | null): string | null`
  - `interface Bucket { wAwarded: number; wAvailable: number; effective: number; answers: number; marks: number }`, `emptyBucket()`, `addTo(b, row, weight): Bucket`, `share(b: Bucket | undefined): number | null`, `sumBuckets(bs: Iterable<Bucket>): Bucket`
  - `interface MisconceptionHit extends EngineMisconception { markedAt: Date }`
  - `interface TopicStats { total: Bucket; lastAnsweredAt: Date | null; byLevel: Map<string, Bucket>; bySource: Map<SourceType, Bucket>; subtopics: Map<string, Bucket>; hits: MisconceptionHit[] }`
  - `interface EvidenceStats { asOf: Date; answers: number; unmappedAnswers: number; lastMarkedAt: Date | null; topics: Map<string, Map<string, TopicStats>>; paperLevels: Map<string, Map<string, Bucket>>; paperRecent: Map<string, number>; subjectLevels: Map<string, Bucket> }`
  - `aggregateEvidence(rows: readonly EngineRow[], bp: BlueprintData, asOf: Date): EvidenceStats`
  - Test helper: `testBlueprint(examDates?): BlueprintData`, whose node ids are `n-func12`, `n-func11`, `n-func11-trig`, `n-calc12`, `n-prob12`, `n-trig12`, `n-stat12`; `row(over: Partial<EngineRow>): EngineRow`; `daysAgo(n)`; `AS_OF = new Date('2026-09-28T08:00:00Z')`.

- [ ] **Step 1: Write the test helper and the failing test**

```ts
// src/modules/Readiness/__tests__/engine-helpers.ts
//
// Pure fixtures for the engine tests: a two-paper blueprint shaped like the fixture world, and rows.
import type { BlueprintData, EngineRow } from '../types.js';

export const AS_OF = new Date('2026-09-28T08:00:00Z');
const DAY = 86_400_000;
export const daysAgo = (n: number): Date => new Date(AS_OF.getTime() - n * DAY);

type NodeSpec = [string, 'topic' | 'subtopic', number, number | null];
const topic = (key: string, label: string, group: string, marks: number, nodes: NodeSpec[]) => ({
  key, label, group, marks, tolerance: null, sourceRef: '', verified: true, note: '',
  nodes: nodes.map(([nodeId, level, grade, termNumber]: NodeSpec) => ({ code: nodeId.toUpperCase(), nodeId, level, grade, termNumber })),
});

export function testBlueprint(examDates: [string | null, string | null] = ['2026-10-27', '2026-10-30']): BlueprintData {
  return {
    family: 'T', examBody: 'DBE', qualification: 'NSC', session: 'november', subjectKey: 'T-MATHS', slug: 'maths',
    subjectTitle: 'Mathematics', grade: 12, examYear: 2026, sources: [],
    cognitiveScheme: { key: 'maths-4', levels: [
      { key: 'knowledge', label: 'Knowledge', percent: 20, fromStored: ['knowledge'], sourceRef: '', verified: true },
      { key: 'routine', label: 'Routine procedures', percent: 35, fromStored: ['routine'], sourceRef: '', verified: true },
      { key: 'complex', label: 'Complex procedures', percent: 30, fromStored: ['complex'], sourceRef: '', verified: true },
      { key: 'problem_solving', label: 'Problem solving', percent: 15, fromStored: ['problem_solving'], sourceRef: '', verified: true },
    ] },
    papers: [
      { key: 'P1', title: 'Paper 1', totalMarks: 100, durationMinutes: 120, examDate: examDates[0], sitting: null, sourceRef: '', verified: true, topics: [
        topic('P1.FUNC', 'Functions and graphs', 'Functions and calculus', 40, [['n-func12', 'topic', 12, 1], ['n-func11', 'topic', 11, 2]]),
        topic('P1.CALC', 'Differential calculus', 'Functions and calculus', 35, [['n-calc12', 'topic', 12, 2]]),
        topic('P1.PROB', 'Counting and probability', 'Probability', 25, [['n-prob12', 'topic', 12, 3]]),
      ] },
      { key: 'P2', title: 'Paper 2', totalMarks: 50, durationMinutes: 60, examDate: examDates[1], sitting: null, sourceRef: '', verified: true, topics: [
        topic('P2.TRIG', 'Trigonometry', 'Trigonometry and statistics', 30, [['n-trig12', 'topic', 12, 1], ['n-func11-trig', 'subtopic', 11, 2]]),
        topic('P2.STAT', 'Statistics', 'Trigonometry and statistics', 20, [['n-stat12', 'topic', 12, 3]]),
      ] },
    ],
  };
}

let seq = 0;
export function row(over: Partial<EngineRow> = {}): EngineRow {
  seq += 1;
  return {
    id: `r${seq}`, topicNodeId: 'n-func12', subtopicNodeId: null, cognitiveLevel: 'routine', marksAwarded: 1, marksAvailable: 2,
    markedAt: daysAgo(1), sourceType: 'test', attemptNumber: 1, questionKey: `q${seq}`, topicFrom: 'question', totalOverridden: false,
    recordId: `rec${seq}`, parentId: 'paper-1', itemKey: String(seq), misconception: null, ...over,
  };
}
```

```ts
// src/modules/Readiness/__tests__/engine-aggregate.test.ts
import { describe, expect, it } from 'vitest';
import { latestPerQuestion, recencyWeight, rowWeight } from '../engine/weights.js';
import { blueprintIndex, examTopicsOf } from '../engine/mapping.js';
import { aggregateEvidence, share } from '../engine/aggregate.js';
import { AS_OF, daysAgo, row, testBlueprint } from './engine-helpers.js';

describe('the weight of one answer (spec §3.2)', () => {
  it('halves every 8 weeks, down to a fifth', () => {
    expect(recencyWeight(daysAgo(0), AS_OF)).toBe(1);
    expect(recencyWeight(daysAgo(56), AS_OF)).toBeCloseTo(0.5, 10);
    expect(recencyWeight(daysAgo(112), AS_OF)).toBeCloseTo(0.25, 10);
    expect(recencyWeight(daysAgo(210), AS_OF)).toBe(0.2);
  });

  it('multiplies source, AI tag and teacher override', () => {
    expect(rowWeight(row({ markedAt: AS_OF, sourceType: 'homework', topicFrom: 'ai_tag', totalOverridden: true }), AS_OF))
      .toEqual({ recency: 1, source: 0.7, tag: 0.8, override: 0.5, total: expect.closeTo(0.28, 10) });
    expect(rowWeight(row({ markedAt: AS_OF, sourceType: 'library' }), AS_OF).total).toBe(0.5);
  });

  it('retries of one question count once, the latest', () => {
    const tries = [0, 0, 0, 1, 1].map((marks: number, i: number) => row({
      questionKey: 'qc:1', marksAwarded: marks, marksAvailable: 1, markedAt: daysAgo(5 - i), attemptNumber: i + 1, sourceType: 'unit_check',
    }));
    const kept = latestPerQuestion(tries, AS_OF);
    expect(kept).toHaveLength(1);
    expect(kept[0].attemptNumber).toBe(5);
    const stats = aggregateEvidence(tries, testBlueprint(), AS_OF);
    expect(stats.topics.get('P1')?.get('P1.FUNC')?.total.answers).toBe(1);
  });

  it('ignores rows marked after the as-of date', () => {
    expect(latestPerQuestion([row({ markedAt: new Date(AS_OF.getTime() + 1000) })], AS_OF)).toEqual([]);
  });
});

describe('rows to exam topics (spec §2.2)', () => {
  it('maps by the subtopic, wherever the blueprint maps it, before the topic', () => {
    const index = blueprintIndex(testBlueprint());
    expect(examTopicsOf(index, { topicNodeId: 'n-func11', subtopicNodeId: null })).toEqual([{ paperKey: 'P1', topicKey: 'P1.FUNC' }]);
    expect(examTopicsOf(index, { topicNodeId: 'n-func11', subtopicNodeId: 'n-func11-trig' })).toEqual([{ paperKey: 'P2', topicKey: 'P2.TRIG' }]);
    expect(examTopicsOf(index, { topicNodeId: 'n-func11', subtopicNodeId: 'n-other' })).toEqual([{ paperKey: 'P1', topicKey: 'P1.FUNC' }]);
    expect(examTopicsOf(index, { topicNodeId: null, subtopicNodeId: null })).toEqual([]);
  });

  it('counts a trig-graph row in Paper 2 only, and a row with no mapped topic as unmapped', () => {
    const stats = aggregateEvidence([
      row({ topicNodeId: 'n-func11', subtopicNodeId: 'n-func11-trig' }),
      row({ topicNodeId: null }),
      row({ topicNodeId: 'n-revision' }),
    ], testBlueprint(), AS_OF);
    expect(stats.topics.get('P2')?.get('P2.TRIG')?.total.answers).toBe(1);
    expect(stats.topics.get('P1')?.get('P1.FUNC')).toBeUndefined();
    expect(stats).toMatchObject({ answers: 3, unmappedAnswers: 2 });
  });
});

describe('per-topic stats', () => {
  it('sums weighted marks, answers, raw marks, levels, sources, subtopics and misconception hits', () => {
    const mc = {
      typeId: 't1', kind: 'misconception' as const, label: 'Domain not restricted', learnerLabel: "Didn't restrict the domain",
      learnerVisible: true, confidence: 0.8, topicNodeId: 'n-func12',
    };
    const stats = aggregateEvidence([
      row({ marksAwarded: 2, marksAvailable: 2, cognitiveLevel: 'knowledge', markedAt: AS_OF }),
      row({ marksAwarded: 0, marksAvailable: 4, cognitiveLevel: null, sourceType: 'homework', markedAt: AS_OF, subtopicNodeId: 'n-func12-inv', misconception: mc }),
    ], testBlueprint(), AS_OF);
    const f = stats.topics.get('P1')!.get('P1.FUNC')!;
    expect(f.total).toEqual({ wAwarded: 2, wAvailable: expect.closeTo(4.8, 10), effective: expect.closeTo(1.7, 10), answers: 2, marks: 6 });
    expect(share(f.total)).toBeCloseTo(2 / 4.8, 10);
    expect(f.byLevel.get('knowledge')?.answers).toBe(1);
    expect(f.byLevel.size).toBe(1);
    expect(f.bySource.get('homework')?.answers).toBe(1);
    expect(f.subtopics.get('n-func12-inv')?.answers).toBe(1);
    expect(f.hits).toEqual([{ ...mc, markedAt: AS_OF }]);
    expect(stats.paperLevels.get('P1')?.get('knowledge')?.answers).toBe(1);
    expect(stats.subjectLevels.get('knowledge')?.answers).toBe(1);
    expect(stats.paperRecent.get('P1')).toBe(2);
    expect(stats.lastMarkedAt).toEqual(AS_OF);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/engine-aggregate.test.ts`
Expected: FAIL, with `Cannot find module '../engine/weights.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Readiness/engine/weights.ts
//
// The weight of one answer (spec §3.2) and "the latest answer per question wins" (§3.1). Pure.
import { AI_TAG_WEIGHT, DECAY_FLOOR, DECAY_HALF_LIFE_DAYS, OVERRIDE_WEIGHT, SOURCE_WEIGHT } from '../constants.js';
import type { EngineRow } from '../types.js';
import { DAY_MS } from './sast.js';

export interface WeightParts { recency: number; source: number; tag: number; override: number; total: number }

export function recencyWeight(markedAt: Date, asOf: Date): number {
  const ageDays = Math.max(0, (asOf.getTime() - markedAt.getTime()) / DAY_MS);
  return Math.max(DECAY_FLOOR, 0.5 ** (ageDays / DECAY_HALF_LIFE_DAYS));
}

export function rowWeight(row: EngineRow, asOf: Date): WeightParts {
  const recency = recencyWeight(row.markedAt, asOf);
  const source = SOURCE_WEIGHT[row.sourceType];
  const tag = row.topicFrom === 'ai_tag' ? AI_TAG_WEIGHT : 1;
  const override = row.totalOverridden ? OVERRIDE_WEIGHT : 1;
  return { recency, source, tag, override, total: recency * source * tag * override };
}

/** Rows marked by `asOf`, one per question key: the latest answer (then the highest attempt) wins. */
export function latestPerQuestion(rows: readonly EngineRow[], asOf: Date): EngineRow[] {
  const latest = new Map<string, EngineRow>();
  for (const r of rows) {
    if (r.markedAt.getTime() > asOf.getTime()) continue;
    const prior = latest.get(r.questionKey);
    const newer = !prior || r.markedAt.getTime() > prior.markedAt.getTime()
      || (r.markedAt.getTime() === prior.markedAt.getTime() && r.attemptNumber > prior.attemptNumber);
    if (newer) latest.set(r.questionKey, r);
  }
  return [...latest.values()];
}
```

```ts
// src/modules/Readiness/engine/mapping.ts
//
// Evidence row → exam topic(s): the row's subtopic, wherever the blueprint maps it, wins over its topic (spec §2.2);
// otherwise the topic's mapping in each paper that maps it. Pure.
import type { BlueprintData, EngineRow } from '../types.js';

export interface TopicRef { paperKey: string; topicKey: string }
export interface BlueprintIndex { bySubtopic: ReadonlyMap<string, TopicRef[]>; byTopic: ReadonlyMap<string, TopicRef[]> }

export function blueprintIndex(bp: Pick<BlueprintData, 'papers'>): BlueprintIndex {
  const bySubtopic = new Map<string, TopicRef[]>();
  const byTopic = new Map<string, TopicRef[]>();
  for (const paper of bp.papers) {
    for (const topic of paper.topics) {
      for (const node of topic.nodes) {
        const into = node.level === 'subtopic' ? bySubtopic : byTopic;
        into.set(node.nodeId, [...(into.get(node.nodeId) ?? []), { paperKey: paper.key, topicKey: topic.key }]);
      }
    }
  }
  return { bySubtopic, byTopic };
}

export function examTopicsOf(index: BlueprintIndex, row: Pick<EngineRow, 'topicNodeId' | 'subtopicNodeId'>): TopicRef[] {
  const bySub = row.subtopicNodeId ? index.bySubtopic.get(row.subtopicNodeId) : undefined;
  if (bySub && bySub.length > 0) return bySub;
  return row.topicNodeId ? index.byTopic.get(row.topicNodeId) ?? [] : [];
}

/** The subject's own level for a stored CAPS level (inputs §3.4); Mathematics maps one to one. */
export function schemeLevelOf(bp: Pick<BlueprintData, 'cognitiveScheme'>, stored: string | null): string | null {
  if (!stored) return null;
  return bp.cognitiveScheme.levels.find((l) => (l.fromStored as readonly string[]).includes(stored))?.key ?? null;
}
```

```ts
// src/modules/Readiness/engine/aggregate.ts
//
// Final evidence rows → weighted stats per exam topic, per level and per paper (spec §3.1–§3.3). Pure.
import { RECENT_DAYS } from '../constants.js';
import type { BlueprintData, EngineMisconception, EngineRow, SourceType } from '../types.js';
import { blueprintIndex, examTopicsOf, schemeLevelOf } from './mapping.js';
import { DAY_MS } from './sast.js';
import { latestPerQuestion, rowWeight } from './weights.js';

export interface Bucket { wAwarded: number; wAvailable: number; effective: number; answers: number; marks: number }
export const emptyBucket = (): Bucket => ({ wAwarded: 0, wAvailable: 0, effective: 0, answers: 0, marks: 0 });

export function addTo(b: Bucket, row: EngineRow, weight: number): Bucket {
  return {
    wAwarded: b.wAwarded + weight * row.marksAwarded, wAvailable: b.wAvailable + weight * row.marksAvailable,
    effective: b.effective + weight, answers: b.answers + 1, marks: b.marks + row.marksAvailable,
  };
}

export function share(b: Bucket | undefined): number | null {
  return b && b.wAvailable > 0 ? b.wAwarded / b.wAvailable : null;
}

export function sumBuckets(bs: Iterable<Bucket>): Bucket {
  let out = emptyBucket();
  for (const b of bs) {
    out = {
      wAwarded: out.wAwarded + b.wAwarded, wAvailable: out.wAvailable + b.wAvailable, effective: out.effective + b.effective,
      answers: out.answers + b.answers, marks: out.marks + b.marks,
    };
  }
  return out;
}

export interface MisconceptionHit extends EngineMisconception { markedAt: Date }
export interface TopicStats {
  total: Bucket; lastAnsweredAt: Date | null;
  byLevel: Map<string, Bucket>; bySource: Map<SourceType, Bucket>; subtopics: Map<string, Bucket>;
  hits: MisconceptionHit[];
}
export interface EvidenceStats {
  asOf: Date; answers: number; unmappedAnswers: number; lastMarkedAt: Date | null;
  topics: Map<string, Map<string, TopicStats>>;
  paperLevels: Map<string, Map<string, Bucket>>;
  paperRecent: Map<string, number>;
  subjectLevels: Map<string, Bucket>;
}

const emptyTopic = (): TopicStats => ({
  total: emptyBucket(), lastAnsweredAt: null, byLevel: new Map(), bySource: new Map(), subtopics: new Map(), hits: [],
});

function bump<K>(m: Map<K, Bucket>, key: K, row: EngineRow, w: number): void {
  m.set(key, addTo(m.get(key) ?? emptyBucket(), row, w));
}

function withRow(s: TopicStats, row: EngineRow, w: number, level: string | null): TopicStats {
  if (level) bump(s.byLevel, level, row, w);
  bump(s.bySource, row.sourceType, row, w);
  if (row.subtopicNodeId) bump(s.subtopics, row.subtopicNodeId, row, w);
  return {
    ...s,
    total: addTo(s.total, row, w),
    lastAnsweredAt: !s.lastAnsweredAt || row.markedAt > s.lastAnsweredAt ? row.markedAt : s.lastAnsweredAt,
    hits: row.misconception ? [...s.hits, { ...row.misconception, markedAt: row.markedAt }] : s.hits,
  };
}

export function aggregateEvidence(rows: readonly EngineRow[], bp: BlueprintData, asOf: Date): EvidenceStats {
  const counted = latestPerQuestion(rows, asOf);
  const index = blueprintIndex(bp);
  const topics = new Map(bp.papers.map((p) => [p.key, new Map<string, TopicStats>()]));
  const paperLevels = new Map(bp.papers.map((p) => [p.key, new Map<string, Bucket>()]));
  const paperRecent = new Map(bp.papers.map((p) => [p.key, 0]));
  const subjectLevels = new Map<string, Bucket>();
  const recentFrom = asOf.getTime() - RECENT_DAYS * DAY_MS;
  let unmapped = 0;
  let last: Date | null = null;
  for (const r of counted) {
    const w = rowWeight(r, asOf).total;
    const level = schemeLevelOf(bp, r.cognitiveLevel);
    const refs = examTopicsOf(index, r);
    if (refs.length === 0) {
      unmapped += 1;
      continue;
    }
    for (const { paperKey, topicKey } of refs) {
      const paperTopics = topics.get(paperKey)!;
      paperTopics.set(topicKey, withRow(paperTopics.get(topicKey) ?? emptyTopic(), r, w, level));
      if (level) bump(paperLevels.get(paperKey)!, level, r, w);
      if (r.markedAt.getTime() >= recentFrom) paperRecent.set(paperKey, paperRecent.get(paperKey)! + 1);
    }
    if (level) bump(subjectLevels, level, r, w);
    if (!last || r.markedAt > last) last = r.markedAt;
  }
  return { asOf, answers: counted.length, unmappedAnswers: unmapped, lastMarkedAt: last, topics, paperLevels, paperRecent, subjectLevels };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/engine-aggregate.test.ts && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Readiness
LANE_SWEEP_OK=1 git commit -m "feat(readiness): the engine's evidence stats: recency and source weights, latest answer per question, subtopic-first mapping" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: the engine, part 2: prediction, band, gate, levels, targets, explanation (the golden example)

**Files:**
- Create: `src/modules/Readiness/engine/levels.ts`, `engine/predict.ts`, `engine/target.ts`, `engine/due.ts`, `engine/explain.ts`, `engine/readiness.ts`
- Test: `src/modules/Readiness/__tests__/engine-predict.test.ts`

**Interfaces:**
- Consumes: Task 4 (`Bucket`, `TopicStats`, `EvidenceStats`, `MisconceptionHit`, `aggregateEvidence`, `share`, `sumBuckets`, `emptyBucket`); Task 3 (`daysUntilDay`, `sastMonth`); Task 1 types and constants.
- Produces:
  - `interface LevelInput { key: string; label: string; examPercent: number; subject: Bucket | undefined; paper: Bucket | undefined }`
  - `interface LevelAdjustment { applied: boolean; points: number; marks: number; sigmaTerms: number[]; knownAnswers: number; hardExamPercent: number; hardEvidencePercent: number | null; hardLabel: string; levels: LevelResult[] }`
  - `levelAdjustment(inputs: readonly LevelInput[], totalMarks: number, mbar: number | null): LevelAdjustment`
  - `topicStatus(total: Bucket | undefined): TopicStatus`, `topicSigma(marks: number, mastery: number | null, effective: number): number`, `bandOf(predicted: number, sigma: number, total: number): Band`
  - `interface PaperPrediction { state: PaperResult['state']; predicted: number; sigma: number; untestedSigma: number; gate: PaperResult['gate']; tested: string[]; thin: string[]; untested: string[]; testedMarks: number }`
  - `predictPaper(paper: BlueprintPaper, topics: ReadonlyMap<string, TopicStats>, average: number | null, adjustment: LevelAdjustment): PaperPrediction`
  - `nscLevel(pct: number): number`, `defaultTarget(high: number | null): number | null`
  - `currentTerm(now: Date): number`, `topicDue(topic: BlueprintTopic, grade: number, now: Date, daysToPaper: number | null): boolean`
  - `interface ExplainInput { paper; prediction; adjustment; average: number | null; recent: number; thinAnswers: ReadonlyMap<string, number> }`, `explainPaper(input: ExplainInput, who: 'learner' | 'teacher'): string[]`
  - `interface ComputeOptions { asOf: Date; now: Date; grade: number; titles: ReadonlyMap<string, string> }`, `interface Computation { core: ReadinessCore; stats: EvidenceStats }`
  - `computeReadiness(rows: readonly EngineRow[], bp: BlueprintData, options: ComputeOptions): Computation`

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Readiness/__tests__/engine-predict.test.ts
import { describe, expect, it } from 'vitest';
import type { BlueprintPaper, BlueprintTopic } from '../types.js';
import { emptyBucket, type Bucket, type TopicStats } from '../engine/aggregate.js';
import { levelAdjustment } from '../engine/levels.js';
import { bandOf, predictPaper, topicStatus } from '../engine/predict.js';
import { defaultTarget, nscLevel } from '../engine/target.js';
import { currentTerm, topicDue } from '../engine/due.js';
import { explainPaper } from '../engine/explain.js';
import { computeReadiness } from '../engine/readiness.js';
import { AS_OF, daysAgo, row, testBlueprint } from './engine-helpers.js';

const bucket = (answers: number, marks: number, mastery: number, effective: number): Bucket =>
  ({ wAwarded: mastery * effective, wAvailable: effective, effective, answers, marks });
const stats = (total: Bucket): TopicStats => ({ total, lastAnsweredAt: AS_OF, byLevel: new Map(), bySource: new Map(), subtopics: new Map(), hits: [] });
const t = (key: string, label: string, marks: number): BlueprintTopic => ({ key, label, group: 'g', marks, tolerance: null, sourceRef: '', verified: true, note: '', nodes: [] });

/** Spec §3.8: Paper 1 of 150, four tested topics, Finance thin (2 answers), Probability untested. */
const PAPER: BlueprintPaper = {
  key: 'P1', title: 'Paper 1', totalMarks: 150, durationMinutes: 180, examDate: '2026-11-27', sitting: null, sourceRef: '', verified: true,
  topics: [t('P1.FUNC', 'Functions', 35), t('P1.CALC', 'Calculus', 35), t('P1.ALG', 'Algebra', 25), t('P1.PATT', 'Patterns', 25), t('P1.FIN', 'Finance', 15), t('P1.PROB', 'Probability', 15)],
};
const TOPICS = new Map<string, TopicStats>([
  ['P1.FUNC', stats(bucket(14, 40, 0.49, 10))], ['P1.CALC', stats(bucket(11, 30, 0.52, 8))],
  ['P1.ALG', stats(bucket(16, 40, 0.78, 12))], ['P1.PATT', stats(bucket(7, 20, 0.71, 5))], ['P1.FIN', stats(bucket(2, 4, 0.5, 1.5))],
]);
const lvl = (key: string, label: string, examPercent: number, mastery: number, effective: number, evidenceMarks: number, answers: number) => ({
  key, label, examPercent, subject: bucket(answers, answers * 2, mastery, effective), paper: { ...emptyBucket(), wAvailable: evidenceMarks, answers },
});
const LEVELS = [
  lvl('knowledge', 'Knowledge', 20, 0.8, 15, 30, 15), lvl('routine', 'Routine procedures', 35, 0.68, 20, 45, 20),
  lvl('complex', 'Complex procedures', 30, 0.46, 10, 20, 10), lvl('problem_solving', 'Problem solving', 15, 0.35, 3, 5, 3),
];

describe('the worked example (spec §3.8)', () => {
  const adj = levelAdjustment(LEVELS, 150, 0.63);
  const p = predictPaper(PAPER, TOPICS, 0.63, adj);

  it('adjusts by −3.6 points (−5.4 marks) for the level mix', () => {
    expect(adj.applied).toBe(true);
    expect(adj.points).toBeCloseTo(-0.035947, 5);
    expect(adj.marks).toBeCloseTo(-5.392, 3);
    expect(adj.sigmaTerms).toEqual([]);
    expect(adj.levels.map((l) => [l.key, l.evidencePercent, l.mastery])).toEqual([['knowledge', 30, 80], ['routine', 45, 68], ['complex', 20, 46], ['problem_solving', 5, 35]]);
  });

  it('predicts 86.1 marks with σ 11.9: band 49–65%, gate passed', () => {
    expect(p.predicted).toBeCloseTo(86.108, 3);
    expect(p.sigma).toBeCloseTo(11.869, 3);
    expect(p.state).toBe('predicted');
    expect(bandOf(p.predicted, p.sigma, 150)).toEqual({ low: 49, high: 65, mid: 57, lowMarks: 74.2, highMarks: 98 });
    expect(p.gate).toEqual({ answers: 50, answersNeeded: 20, testedMarks: 120, testedMarksNeeded: 75 });
    expect(p).toMatchObject({ tested: ['P1.FUNC', 'P1.CALC', 'P1.ALG', 'P1.PATT'], thin: ['P1.FIN'], untested: ['P1.PROB'] });
    expect(p.untestedSigma).toBeCloseTo(5.303, 3);
  });

  it('explains the range in plain lines, for the learner and for the teacher', () => {
    const input = { paper: PAPER, prediction: p, adjustment: adj, average: 0.63, recent: 31, thinAnswers: new Map([['P1.FIN', 2]]) };
    expect(explainPaper(input, 'learner')).toEqual([
      'Tested: 4 of 6 topics, 120 of 150 marks. Your weighted average across tested topics is 63%.',
      'Not yet tested: Probability (15 marks). Too few answers: Finance (15 marks, 2 answers). We assume your average for these, which widens the range by ±5 marks.',
      'Question levels: the exam has 45% complex procedures and problem solving questions; your work so far had 25%. This lowers the prediction by 5 marks.',
      'Evidence: 50 answers, 31 in the last 8 weeks. Tests count fully; homework and practice count a little less.',
    ]);
    expect(explainPaper(input, 'teacher')[0]).toBe('Tested: 4 of 6 topics, 120 of 150 marks. Their weighted average across tested topics is 63%.');
  });

  it('sets the default target to the next NSC boundary above the band, and names levels', () => {
    expect(defaultTarget(65)).toBe(70);
    expect(defaultTarget(80)).toBe(80);
    expect(defaultTarget(null)).toBeNull();
    expect([nscLevel(49), nscLevel(65), nscLevel(80), nscLevel(29), nscLevel(30)]).toEqual([3, 5, 7, 1, 2]);
  });
});

describe('boundaries', () => {
  it('a topic is tested at 3 answers and 6 marks, thin below, untested with none', () => {
    expect(topicStatus(undefined)).toBe('untested');
    expect(topicStatus(bucket(2, 10, 0.5, 2))).toBe('thin');
    expect(topicStatus(bucket(3, 5, 0.5, 3))).toBe('thin');
    expect(topicStatus(bucket(3, 6, 0.5, 3))).toBe('tested');
  });

  it('the gate needs 20 answers and half the marks tested', () => {
    const none = levelAdjustment(LEVELS, 150, null);
    const nineteen = new Map([['P1.FUNC', stats(bucket(19, 60, 0.5, 10))]]);
    expect(predictPaper(PAPER, nineteen, 0.5, none).state).toBe('not_enough_evidence');
    const seventy = new Map([['P1.FUNC', stats(bucket(10, 30, 0.5, 8))], ['P1.CALC', stats(bucket(10, 30, 0.5, 8))]]);
    expect(predictPaper(PAPER, seventy, 0.5, none).gate.testedMarks).toBe(70);
    expect(predictPaper(PAPER, seventy, 0.5, none).state).toBe('not_enough_evidence');
    const enough = new Map([...seventy, ['P1.FIN', stats(bucket(5, 10, 0.5, 4))]]);
    expect(predictPaper(PAPER, enough, 0.5, none).state).toBe('predicted');
  });

  it('skips the level adjustment under 10 known-level answers, and caps it at ±10 points', () => {
    const few = LEVELS.map((l) => ({ ...l, paper: { ...l.paper, answers: 2 } }));
    expect(levelAdjustment(few, 150, 0.63)).toMatchObject({ applied: false, points: 0, knownAnswers: 8 });
    const extreme = LEVELS.map((l) => ({ ...l, subject: bucket(100, 200, l.key === 'problem_solving' ? 0 : 1, 100) }));
    expect(levelAdjustment(extreme, 150, 0.9).points).toBeGreaterThanOrEqual(-0.1);
  });

  it('a level with fewer than 3 effective answers widens σ by x · T · 0.15', () => {
    const thinPs = LEVELS.map((l) => (l.key === 'problem_solving' ? { ...l, subject: bucket(2, 4, 0.3, 2) } : l));
    expect(levelAdjustment(thinPs, 150, 0.63).sigmaTerms).toEqual([expect.closeTo(0.15 * 150 * 0.15, 10)]);
  });

  it('clamps the band to 0–100', () => {
    expect(bandOf(148, 10, 150)).toMatchObject({ high: 100, highMarks: 150 });
    expect(bandOf(3, 10, 150)).toMatchObject({ low: 0, lowMarks: 0 });
  });
});

describe('taught by now (spec §4.1)', () => {
  const late: BlueprintTopic = { ...t('P1.PROB', 'Probability', 15), nodes: [{ code: 'P', nodeId: 'p', level: 'topic', grade: 12, termNumber: 3 }] };
  const earlierGrade: BlueprintTopic = { ...t('P1.ALG', 'Algebra', 25), nodes: [{ code: 'A', nodeId: 'a', level: 'topic', grade: 10, termNumber: 1 }] };

  it('uses the term by month', () => {
    expect([currentTerm(new Date('2026-02-10T08:00:00Z')), currentTerm(new Date('2026-06-30T08:00:00Z')), currentTerm(new Date('2026-10-01T08:00:00Z'))]).toEqual([1, 2, 4]);
  });

  it('a Grade 12 Term 3 topic is due from Term 4; an earlier-grade topic always; everything in the last 12 weeks', () => {
    expect(topicDue(late, 12, new Date('2026-02-10T08:00:00Z'), 260)).toBe(false);
    expect(topicDue(late, 12, new Date('2026-09-26T08:00:00Z'), 60)).toBe(true);
    expect(topicDue(late, 12, new Date('2026-09-26T08:00:00Z'), null)).toBe(false);
    expect(topicDue(late, 12, new Date('2026-10-05T08:00:00Z'), null)).toBe(true);
    expect(topicDue(earlierGrade, 12, new Date('2026-02-10T08:00:00Z'), 260)).toBe(true);
  });
});

describe('computeReadiness', () => {
  it('composes papers and topics; both papers only when both predict; the average and the default target', () => {
    const rows = Array.from({ length: 24 }, (_: unknown, i: number) => row({
      topicNodeId: i % 2 ? 'n-func12' : 'n-calc12', marksAwarded: i % 3 ? 2 : 0, marksAvailable: 2, markedAt: daysAgo(i),
      cognitiveLevel: (['knowledge', 'routine', 'complex', 'problem_solving'] as const)[i % 4],
    }));
    const { core } = computeReadiness(rows, testBlueprint(), { asOf: AS_OF, now: AS_OF, grade: 12, titles: new Map() });
    const p1 = core.papers[0];
    expect(p1.state).toBe('predicted');
    expect(p1.topics.map((x) => [x.key, x.status])).toEqual([['P1.FUNC', 'tested'], ['P1.CALC', 'tested'], ['P1.PROB', 'untested']]);
    expect(p1.topics[0].marksToGain).toBe(Math.round(40 * (100 - (p1.topics[0].mastery as number))) / 100);
    expect(core.papers[1].state).toBe('not_enough_evidence');
    expect(core.both).toBeNull();
    expect(core.average).toBeGreaterThan(0);
    expect(core.defaultTarget).not.toBeNull();
    expect(p1.explanation.learner).toHaveLength(4);
  });
});
```

`marksToGain` is W × (100 − mastery) / 100 to one decimal. That is the frontend's `marksToGain` (`src/lib/readiness/mastery.ts`) on the same whole-percent mastery.

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/engine-predict.test.ts`
Expected: FAIL, with `Cannot find module '../engine/levels.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Readiness/engine/levels.ts
//
// The cognitive-level adjustment (spec §3.5): move the prediction toward the paper's level mix. Pure.
import { LEVEL_CAP, LEVEL_MIN_KNOWN_ANSWERS, LEVEL_SHRINK, LEVEL_THIN_EFFECTIVE, LEVEL_UNKNOWN_SPREAD } from '../constants.js';
import type { LevelResult } from '../types.js';
import { share, type Bucket } from './aggregate.js';

export interface LevelInput { key: string; label: string; examPercent: number; subject: Bucket | undefined; paper: Bucket | undefined }
export interface LevelAdjustment {
  applied: boolean; points: number; marks: number; sigmaTerms: number[]; knownAnswers: number;
  hardExamPercent: number; hardEvidencePercent: number | null; hardLabel: string; levels: LevelResult[];
}

export function levelAdjustment(inputs: readonly LevelInput[], totalMarks: number, mbar: number | null): LevelAdjustment {
  const paperAvailable = inputs.reduce((s: number, l: LevelInput) => s + (l.paper?.wAvailable ?? 0), 0);
  const knownAnswers = inputs.reduce((s: number, l: LevelInput) => s + (l.paper?.answers ?? 0), 0);
  const applied = mbar !== null && paperAvailable > 0 && knownAnswers >= LEVEL_MIN_KNOWN_ANSWERS;
  let raw = 0;
  const levels = inputs.map((l: LevelInput): LevelResult => {
    const m = share(l.subject);
    const n = l.subject?.effective ?? 0;
    const e = paperAvailable > 0 ? (l.paper?.wAvailable ?? 0) / paperAvailable : null;
    if (applied && m !== null && e !== null) raw += (l.examPercent / 100 - e) * (n / (n + LEVEL_SHRINK)) * (m - (mbar as number));
    return {
      key: l.key, label: l.label, examPercent: l.examPercent, evidencePercent: e === null ? null : Math.round(e * 100),
      mastery: m === null ? null : Math.round(m * 100), answers: l.subject?.answers ?? 0,
    };
  });
  const points = applied ? Math.max(-LEVEL_CAP, Math.min(LEVEL_CAP, raw)) : 0;
  const sigmaTerms = inputs
    .filter((l: LevelInput) => (l.subject?.effective ?? 0) < LEVEL_THIN_EFFECTIVE)
    .map((l: LevelInput) => (l.examPercent / 100) * totalMarks * LEVEL_UNKNOWN_SPREAD);
  const hard = inputs.slice(-2);
  const hardAvailable = hard.reduce((s: number, l: LevelInput) => s + (l.paper?.wAvailable ?? 0), 0);
  return {
    applied, points, marks: points * totalMarks, sigmaTerms, knownAnswers,
    hardExamPercent: hard.reduce((s: number, l: LevelInput) => s + l.examPercent, 0),
    hardEvidencePercent: paperAvailable > 0 ? Math.round((hardAvailable / paperAvailable) * 100) : null,
    hardLabel: hard.map((l: LevelInput) => l.label.toLowerCase()).join(' and '),
    levels,
  };
}
```

```ts
// src/modules/Readiness/engine/predict.ts
//
// One paper's predicted mark, spread, band and gate (spec §3.3–§3.6). Pure.
import {
  EXAM_DAY_SPREAD, GATE_MIN_ANSWERS, GATE_MIN_TESTED_SHARE, MASTERY_CLAMP_HIGH, MASTERY_CLAMP_LOW,
  TESTED_MIN_ANSWERS, TESTED_MIN_MARKS, UNTESTED_SPREAD,
} from '../constants.js';
import type { Band, BlueprintPaper, PaperResult, TopicStatus } from '../types.js';
import { share, type Bucket, type TopicStats } from './aggregate.js';
import type { LevelAdjustment } from './levels.js';

export function topicStatus(total: Bucket | undefined): TopicStatus {
  if (!total || total.answers === 0) return 'untested';
  return total.answers >= TESTED_MIN_ANSWERS && total.marks >= TESTED_MIN_MARKS ? 'tested' : 'thin';
}

export function topicSigma(marks: number, mastery: number | null, effective: number): number {
  if (mastery === null || effective <= 0) return marks * UNTESTED_SPREAD;
  const m = Math.min(MASTERY_CLAMP_HIGH, Math.max(MASTERY_CLAMP_LOW, mastery));
  return marks * Math.sqrt((m * (1 - m)) / effective + EXAM_DAY_SPREAD ** 2);
}

const round1 = (x: number): number => Math.round(x * 10) / 10;
const pct = (x: number): number => Math.min(100, Math.max(0, x));

export function bandOf(predicted: number, sigma: number, total: number): Band {
  return {
    low: Math.round(pct(((predicted - sigma) / total) * 100)), high: Math.round(pct(((predicted + sigma) / total) * 100)),
    mid: Math.round(pct((predicted / total) * 100)),
    lowMarks: round1(Math.max(0, predicted - sigma)), highMarks: round1(Math.min(total, predicted + sigma)),
  };
}

export interface PaperPrediction {
  state: PaperResult['state']; predicted: number; sigma: number; untestedSigma: number; gate: PaperResult['gate'];
  tested: string[]; thin: string[]; untested: string[]; testedMarks: number;
}

export function predictPaper(
  paper: BlueprintPaper, topics: ReadonlyMap<string, TopicStats>, average: number | null, adjustment: LevelAdjustment,
): PaperPrediction {
  const mu = average ?? 0.5;
  let base = 0;
  let s2 = 0;
  let untestedS2 = 0;
  let testedMarks = 0;
  let answers = 0;
  const tested: string[] = [];
  const thin: string[] = [];
  const untested: string[] = [];
  for (const t of paper.topics) {
    const s = topics.get(t.key);
    const status = topicStatus(s?.total);
    answers += s?.total.answers ?? 0;
    if (status === 'tested' && s) {
      const m = share(s.total) as number;
      base += t.marks * m;
      s2 += topicSigma(t.marks, m, s.total.effective) ** 2;
      testedMarks += t.marks;
      tested.push(t.key);
    } else {
      const sigma = topicSigma(t.marks, null, 0);
      base += t.marks * mu;
      s2 += sigma ** 2;
      untestedS2 += sigma ** 2;
      (status === 'thin' ? thin : untested).push(t.key);
    }
  }
  for (const term of adjustment.sigmaTerms) s2 += term ** 2;
  const testedMarksNeeded = Math.ceil(paper.totalMarks * GATE_MIN_TESTED_SHARE);
  const passes = average !== null && answers >= GATE_MIN_ANSWERS && testedMarks >= testedMarksNeeded;
  return {
    state: passes ? 'predicted' : 'not_enough_evidence',
    predicted: Math.min(paper.totalMarks, Math.max(0, base + adjustment.marks)), sigma: Math.sqrt(s2), untestedSigma: Math.sqrt(untestedS2),
    gate: { answers, answersNeeded: GATE_MIN_ANSWERS, testedMarks, testedMarksNeeded }, tested, thin, untested, testedMarks,
  };
}
```

```ts
// src/modules/Readiness/engine/target.ts
//
// NSC achievement levels and the default target (spec §3.7, decided §12.3). Pure.
import { NSC_BOUNDARIES } from '../constants.js';

/** 7 ≥ 80, 6 ≥ 70, 5 ≥ 60, 4 ≥ 50, 3 ≥ 40, 2 ≥ 30, 1 below. */
export function nscLevel(pct: number): number {
  return NSC_BOUNDARIES.filter((b: number) => pct >= b).length + 1;
}

/** The lowest NSC boundary strictly above the band's top, capped at 80. */
export function defaultTarget(high: number | null): number | null {
  if (high === null) return null;
  return NSC_BOUNDARIES.find((b: number) => b > high) ?? 80;
}
```

```ts
// src/modules/Readiness/engine/due.ts
//
// "Your class should have covered this by now" (spec §4.1). Pure.
import { ALL_DUE_WINDOW_DAYS } from '../constants.js';
import type { BlueprintTopic } from '../types.js';
import { sastMonth } from './sast.js';

/** The school term by SAST month: Term 1 from January, 2 from April, 3 from July, 4 from October. */
export function currentTerm(now: Date): number {
  return Math.floor((sastMonth(now) - 1) / 3) + 1;
}

/** Due once every node of the learner's own grade is from an earlier term; always within 12 weeks of the paper. */
export function topicDue(topic: BlueprintTopic, grade: number, now: Date, daysToPaper: number | null): boolean {
  if (daysToPaper !== null && daysToPaper <= ALL_DUE_WINDOW_DAYS) return true;
  const term = currentTerm(now);
  return topic.nodes.filter((n) => n.grade === grade).every((n) => n.termNumber === null || n.termNumber < term);
}
```

```ts
// src/modules/Readiness/engine/explain.ts
//
// "Why this range" (spec §3.9): template lines, no AI. The learner reads "your", the teacher "their".
import { LEVEL_MIN_KNOWN_ANSWERS } from '../constants.js';
import type { BlueprintPaper } from '../types.js';
import type { LevelAdjustment } from './levels.js';
import type { PaperPrediction } from './predict.js';

export interface ExplainInput {
  paper: BlueprintPaper; prediction: PaperPrediction; adjustment: LevelAdjustment; average: number | null;
  recent: number; thinAnswers: ReadonlyMap<string, number>;
}

export function explainPaper(input: ExplainInput, who: 'learner' | 'teacher'): string[] {
  const { paper, prediction: p, adjustment: adj } = input;
  const Your = who === 'learner' ? 'Your' : 'Their';
  const your = Your.toLowerCase();
  const topic = (key: string) => paper.topics.find((x) => x.key === key)!;
  const lines = [
    `Tested: ${p.tested.length} of ${paper.topics.length} topics, ${p.testedMarks} of ${paper.totalMarks} marks.`
      + (input.average === null ? '' : ` ${Your} weighted average across tested topics is ${Math.round(input.average * 100)}%.`),
  ];
  const gaps = [
    p.untested.length > 0 ? `Not yet tested: ${p.untested.map((k: string) => `${topic(k).label} (${topic(k).marks} marks)`).join(', ')}.` : '',
    p.thin.length > 0
      ? `Too few answers: ${p.thin.map((k: string) => `${topic(k).label} (${topic(k).marks} marks, ${input.thinAnswers.get(k) ?? 0} answers)`).join(', ')}.`
      : '',
  ].filter(Boolean);
  if (gaps.length > 0) {
    lines.push(`${gaps.join(' ')} We assume ${your} average for these, which widens the range by ±${Math.round(p.untestedSigma)} marks.`);
  }
  if (!adj.applied) {
    lines.push(`Question levels: not enough level data yet (${adj.knownAnswers} of ${LEVEL_MIN_KNOWN_ANSWERS} answers with a level).`);
  } else if (Math.abs(adj.marks) < 0.5) {
    lines.push(`Question levels: ${your} work so far matches the exam's mix.`);
  } else {
    lines.push(`Question levels: the exam has ${adj.hardExamPercent}% ${adj.hardLabel} questions; ${your} work so far had ${adj.hardEvidencePercent}%. `
      + `This ${adj.marks < 0 ? 'lowers' : 'raises'} the prediction by ${Math.abs(Math.round(adj.marks))} marks.`);
  }
  lines.push(`Evidence: ${p.gate.answers} answers, ${input.recent} in the last 8 weeks. Tests count fully; homework and practice count a little less.`);
  return lines;
}
```

```ts
// src/modules/Readiness/engine/readiness.ts
//
// Rows + blueprint → the stored readiness (spec §3). Pure; `asOf` before `now` gives the history points (§3.10).
import { MIN_CONFIDENCE } from '../constants.js';
import type {
  BlueprintData, BlueprintTopic, EngineRow, PaperResult, ReadinessCore, SourceType, TopicMisconception, TopicResult,
} from '../types.js';
import { aggregateEvidence, share, sumBuckets, type Bucket, type EvidenceStats, type MisconceptionHit, type TopicStats } from './aggregate.js';
import { topicDue } from './due.js';
import { explainPaper } from './explain.js';
import { levelAdjustment } from './levels.js';
import { bandOf, predictPaper, topicStatus } from './predict.js';
import { daysUntilDay } from './sast.js';
import { defaultTarget } from './target.js';

export interface ComputeOptions { asOf: Date; now: Date; grade: number; titles: ReadonlyMap<string, string> }
export interface Computation { core: ReadinessCore; stats: EvidenceStats }

const round1 = (x: number): number => Math.round(x * 10) / 10;
const pctOf = (b: Bucket | undefined): number | null => {
  const s = share(b);
  return s === null ? null : Math.round(s * 100);
};

/** Topic misconceptions with confidence ≥ 0.6, never the generic ones (arithmetic slip, no working). */
function misconceptionsOf(hits: readonly MisconceptionHit[]): TopicMisconception[] {
  const byType = new Map<string, TopicMisconception>();
  for (const h of hits) {
    if (h.kind === 'generic' || (h.confidence ?? 0) < MIN_CONFIDENCE) continue;
    const prior = byType.get(h.typeId);
    const seen = h.markedAt.toISOString();
    byType.set(h.typeId, prior
      ? { ...prior, count: prior.count + 1, lastSeenAt: seen > prior.lastSeenAt ? seen : prior.lastSeenAt }
      : { typeId: h.typeId, kind: h.kind, label: h.label, learnerLabel: h.learnerLabel, learnerVisible: h.learnerVisible, count: 1, lastSeenAt: seen });
  }
  return [...byType.values()].sort((a, b) => b.count - a.count || b.lastSeenAt.localeCompare(a.lastSeenAt));
}

function topicResult(t: BlueprintTopic, s: TopicStats | undefined, due: boolean, titles: ReadonlyMap<string, string>): TopicResult {
  const status = topicStatus(s?.total);
  const mastery = status === 'tested' ? pctOf(s?.total) : null;
  return {
    key: t.key, label: t.label, group: t.group, marks: t.marks, status, mastery,
    answers: s?.total.answers ?? 0, effectiveAnswers: round1(s?.total.effective ?? 0), lastAnsweredAt: s?.lastAnsweredAt?.toISOString() ?? null,
    marksToGain: mastery === null ? null : round1((t.marks * (100 - mastery)) / 100), due,
    subtopics: [...(s?.subtopics ?? new Map<string, Bucket>())].map(([nodeId, b]) => ({
      nodeId, title: titles.get(nodeId) ?? '', mastery: b.answers >= 2 ? pctOf(b) : null, answers: b.answers,
    })),
    misconceptions: misconceptionsOf(s?.hits ?? []),
    bySource: Object.fromEntries([...(s?.bySource ?? new Map<SourceType, Bucket>())].map(([k, b]) => [k, { answers: b.answers, mastery: pctOf(b) }])),
  };
}

export function computeReadiness(rows: readonly EngineRow[], bp: BlueprintData, options: ComputeOptions): Computation {
  const stats = aggregateEvidence(rows, bp, options.asOf);
  const tested = [...stats.topics.values()].flatMap((m) => [...m.values()]).filter((s) => topicStatus(s.total) === 'tested').map((s) => s.total);
  const average = share(sumBuckets(tested));
  const mbar = share(sumBuckets(stats.subjectLevels.values()));
  const raw = bp.papers.map((paper) => {
    const topics = stats.topics.get(paper.key) ?? new Map<string, TopicStats>();
    const adjustment = levelAdjustment(bp.cognitiveScheme.levels.map((l) => ({
      key: l.key, label: l.label, examPercent: l.percent, subject: stats.subjectLevels.get(l.key), paper: stats.paperLevels.get(paper.key)?.get(l.key),
    })), paper.totalMarks, mbar);
    const prediction = predictPaper(paper, topics, average, adjustment);
    const daysToPaper = paper.examDate ? daysUntilDay(paper.examDate, options.now) : null;
    const thinAnswers = new Map(prediction.thin.map((k: string) => [k, topics.get(k)?.total.answers ?? 0]));
    const explainInput = { paper, prediction, adjustment, average, recent: stats.paperRecent.get(paper.key) ?? 0, thinAnswers };
    const result: PaperResult = {
      key: paper.key, title: paper.title, totalMarks: paper.totalMarks, durationMinutes: paper.durationMinutes, examDate: paper.examDate,
      state: prediction.state, band: prediction.state === 'predicted' ? bandOf(prediction.predicted, prediction.sigma, paper.totalMarks) : null,
      predictedMarks: round1(prediction.predicted), sigmaMarks: round1(prediction.sigma), gate: prediction.gate,
      levels: adjustment.levels, adjustmentMarks: adjustment.applied ? round1(adjustment.marks) : null,
      explanation: { learner: explainPaper(explainInput, 'learner'), teacher: explainPaper(explainInput, 'teacher') },
      topics: paper.topics.map((t) => topicResult(t, topics.get(t.key), topicDue(t, options.grade, options.now, daysToPaper), options.titles)),
    };
    return { result, predicted: prediction.predicted, sigma: prediction.sigma };
  });
  const allPredicted = raw.length > 1 && raw.every((p) => p.result.state === 'predicted');
  const both = allPredicted
    ? {
      state: 'predicted' as const,
      band: bandOf(raw.reduce((s, p) => s + p.predicted, 0), Math.sqrt(raw.reduce((s, p) => s + p.sigma ** 2, 0)), raw.reduce((s, p) => s + p.result.totalMarks, 0)),
    }
    : null;
  const highs = raw.map((p) => p.result.band?.high).filter((h): h is number => h !== undefined);
  const top = both?.band.high ?? (highs.length > 0 ? Math.max(...highs) : null);
  return {
    core: {
      answers: stats.answers, unmappedAnswers: stats.unmappedAnswers, average: average === null ? null : Math.round(average * 100),
      lastMarkedAt: stats.lastMarkedAt?.toISOString() ?? null, papers: raw.map((p) => p.result), both, defaultTarget: defaultTarget(top),
    },
    stats,
  };
}
```

`core.both` is `null` unless every paper is predicted (spec §3.7: it "shows only when both papers pass the gate").

- [ ] **Step 4: Run it to verify it passes**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/engine-predict.test.ts && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Readiness
LANE_SWEEP_OK=1 git commit -m "feat(readiness): predicted band, gate, level adjustment, NSC targets and plain explanations; the spec's worked example is the golden test" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: the engine, part 3: ranking the path

**Files:**
- Create: `src/modules/Readiness/engine/path-rank.ts`
- Test: `src/modules/Readiness/__tests__/engine-path.test.ts`

**Interfaces:**
- Consumes: Tasks 4–5 (`computeReadiness`, `EvidenceStats`, `MisconceptionHit`, `share`); `daysUntilDay`, `DAY_MS`; constants.
- Produces:
  - `interface PathCandidate { paperKey: string; paperTitle: string; topicKey: string; topicLabel: string; marks: number; action: 'practice' | 'check_in'; mastery: number | null; gain: number; score: number; misconception: { typeId: string; label: string; learnerLabel: string; count: number } | null; focusNodeId: string | null; lastAnsweredAt: string | null; why: string }`
  - `interface RankInput { core: ReadinessCore; stats: EvidenceStats; bp: BlueprintData; now: Date }`
  - `rankPath(input: RankInput): PathCandidate[]`
  - `boostingMisconception(hits: readonly MisconceptionHit[], now: Date): { typeId: string; label: string; learnerLabel: string; count: number; topicNodeId: string | null } | null`
  - `whyLine(c: Omit<PathCandidate, 'why' | 'score'>): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Readiness/__tests__/engine-path.test.ts
import { describe, expect, it } from 'vitest';
import { computeReadiness } from '../engine/readiness.js';
import { boostingMisconception, rankPath } from '../engine/path-rank.js';
import type { EngineMisconception, EngineRow } from '../types.js';
import { AS_OF, daysAgo, row, testBlueprint } from './engine-helpers.js';

const mc = (over: Partial<EngineMisconception> = {}): EngineMisconception => ({
  typeId: 't-domain', kind: 'misconception', label: 'Domain not restricted on inverse', learnerLabel: "Didn't restrict the domain",
  learnerVisible: true, confidence: 0.8, topicNodeId: 'n-func12', ...over,
});
/** `n` answers on a node, each `awarded` of 2 marks, one a day back from yesterday. */
const answers = (node: string, n: number, awarded: number, extra: Partial<EngineRow> = {}): EngineRow[] =>
  Array.from({ length: n }, (_: unknown, i: number) => row({ topicNodeId: node, marksAwarded: awarded, marksAvailable: 2, markedAt: daysAgo(i + 1), ...extra }));

function rank(rows: EngineRow[], now = AS_OF, dates: [string | null, string | null] = ['2026-11-27', '2026-11-30']) {
  const bp = testBlueprint(dates);
  const { core, stats } = computeReadiness(rows, bp, { asOf: now, now, grade: 12, titles: new Map() });
  return rankPath({ core, stats, bp, now });
}

describe('rankPath (spec §4.1)', () => {
  it('ranks by marks to gain, boosts a repeated misconception, and leaves secure topics out', () => {
    const rows = [
      ...answers('n-func12', 8, 1),
      row({ topicNodeId: 'n-func12', marksAwarded: 0, marksAvailable: 2, markedAt: daysAgo(2), misconception: mc() }),
      row({ topicNodeId: 'n-func12', marksAwarded: 0, marksAvailable: 2, markedAt: daysAgo(3), misconception: mc() }),
      ...answers('n-calc12', 8, 1),
      ...answers('n-trig12', 8, 2),
    ];
    const ranked = rank(rows);
    expect(ranked.map((c) => c.topicKey).slice(0, 2)).toEqual(['P1.FUNC', 'P1.CALC']);
    expect(ranked.find((c) => c.topicKey === 'P2.TRIG')).toBeUndefined();
    const f = ranked[0];
    expect(f).toMatchObject({ action: 'practice', misconception: { typeId: 't-domain', count: 2 }, focusNodeId: 'n-func12' });
    expect(f.score).toBeCloseTo(f.gain * 1.5, 10);
    expect(f.why).toBe(`Functions and graphs is 40 marks in Paper 1. You're at ${f.mastery}%, so up to ${Math.round(f.gain)} marks to gain. "Didn't restrict the domain" came up twice in the last 3 weeks.`);
  });

  it('does not boost a generic, low-confidence, hidden or old misconception', () => {
    const at = (over: Partial<EngineMisconception>, days = 2) => ({ ...mc(over), markedAt: daysAgo(days) });
    expect(boostingMisconception([at({ kind: 'generic' }), at({ confidence: 0.5 }), at({ learnerVisible: false }), at({}, 30)], AS_OF)).toBeNull();
    expect(boostingMisconception([at({})], AS_OF)).toMatchObject({ count: 1 });
  });

  it('offers a check-in for an untested topic only once it is taught, or in the last 12 weeks', () => {
    const rows = [...answers('n-func12', 10, 1), ...answers('n-calc12', 10, 1)];
    const feb = new Date('2026-02-16T08:00:00Z');
    const inFeb = rank(rows.map((r) => ({ ...r, markedAt: new Date(feb.getTime() - 86_400_000) })), feb);
    expect(inFeb.map((c) => c.topicKey)).not.toContain('P1.PROB');
    const prob = rank(rows).find((c) => c.topicKey === 'P1.PROB');
    expect(prob).toMatchObject({ action: 'check_in', mastery: null });
    expect(prob?.why).toBe("Counting and probability is 25 marks in Paper 1. Your class has covered it, but you haven't been tested on it yet. A short check shows where you stand.");
  });

  it('near the exam, lifts the biggest topics (up to × 1.5 on the day)', () => {
    const rows = [...answers('n-func12', 8, 1), ...answers('n-calc12', 8, 1)];
    const far = rank(rows, AS_OF, ['2026-12-31', null]);
    const onTheDay = rank(rows, AS_OF, ['2026-09-28', null]);
    const pick = (list: ReturnType<typeof rank>, key: string) => list.find((c) => c.topicKey === key)!;
    expect(pick(onTheDay, 'P1.FUNC').score / pick(far, 'P1.FUNC').score).toBeCloseTo(1.5, 5);
    expect(pick(onTheDay, 'P1.CALC').score / pick(far, 'P1.CALC').score).toBeCloseTo(1 + 0.5 * (35 / 40), 5);
  });

  it('aims practice at the weakest subtopic with two or more answers when no misconception applies', () => {
    const rows = [...answers('n-func12', 3, 2, { subtopicNodeId: 'n-inv' }), ...answers('n-func12', 3, 0, { subtopicNodeId: 'n-log' })];
    expect(rank(rows).find((c) => c.topicKey === 'P1.FUNC')?.focusNodeId).toBe('n-log');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/engine-path.test.ts`
Expected: FAIL, with `Cannot find module '../engine/path-rank.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Readiness/engine/path-rank.ts
//
// What to do next (spec §4.1–§4.4): rank exam topics by marks to gain, boosted for a recent misconception and
// for big topics near the exam; say why in one template line. Pure.
import {
  MASTERY_SECURE, MIN_CONFIDENCE, MISCONCEPTION_BOOST_ONCE, MISCONCEPTION_BOOST_REPEATED, MISCONCEPTION_WINDOW_DAYS,
  PROXIMITY_MAX_BOOST, PROXIMITY_WINDOW_DAYS,
} from '../constants.js';
import type { BlueprintData, BlueprintTopic, ReadinessCore } from '../types.js';
import { share, type Bucket, type EvidenceStats, type MisconceptionHit, type TopicStats } from './aggregate.js';
import { DAY_MS, daysUntilDay } from './sast.js';

export interface PathCandidate {
  paperKey: string; paperTitle: string; topicKey: string; topicLabel: string; marks: number;
  action: 'practice' | 'check_in'; mastery: number | null; gain: number; score: number;
  misconception: { typeId: string; label: string; learnerLabel: string; count: number } | null;
  focusNodeId: string | null; lastAnsweredAt: string | null; why: string;
}
export interface RankInput { core: ReadinessCore; stats: EvidenceStats; bp: BlueprintData; now: Date }

export function boostingMisconception(hits: readonly MisconceptionHit[], now: Date): {
  typeId: string; label: string; learnerLabel: string; count: number; topicNodeId: string | null;
} | null {
  const from = now.getTime() - MISCONCEPTION_WINDOW_DAYS * DAY_MS;
  const counts = new Map<string, { hit: MisconceptionHit; count: number; last: number }>();
  for (const h of hits) {
    if (h.kind === 'generic' || !h.learnerVisible || (h.confidence ?? 0) < MIN_CONFIDENCE || h.markedAt.getTime() < from) continue;
    const prior = counts.get(h.typeId);
    counts.set(h.typeId, { hit: h, count: (prior?.count ?? 0) + 1, last: Math.max(prior?.last ?? 0, h.markedAt.getTime()) });
  }
  const best = [...counts.values()].sort((a, b) => b.count - a.count || b.last - a.last)[0];
  return best
    ? { typeId: best.hit.typeId, label: best.hit.label, learnerLabel: best.hit.learnerLabel, count: best.count, topicNodeId: best.hit.topicNodeId }
    : null;
}

function focusNode(topic: BlueprintTopic, stats: TopicStats | undefined, mcNode: string | null): string | null {
  if (mcNode && topic.nodes.some((n) => n.nodeId === mcNode)) return mcNode;
  const weakest = [...(stats?.subtopics ?? new Map<string, Bucket>())]
    .filter(([, b]) => b.answers >= 2)
    .sort((a, b) => (share(a[1]) ?? 1) - (share(b[1]) ?? 1))[0];
  if (weakest) return weakest[0];
  const nodes = [...topic.nodes].sort((a, b) => b.grade - a.grade || (a.level === 'topic' ? -1 : 1));
  return nodes[0]?.nodeId ?? null;
}

const times = (n: number): string => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

export function whyLine(c: Omit<PathCandidate, 'why' | 'score'>): string {
  const head = `${c.topicLabel} is ${c.marks} marks in ${c.paperTitle}.`;
  if (c.action === 'check_in') {
    return `${head} Your class has covered it, but you haven't been tested on it yet. A short check shows where you stand.`;
  }
  if (c.misconception) {
    return `${head} You're at ${c.mastery}%, so up to ${Math.round(c.gain)} marks to gain. "${c.misconception.learnerLabel}" came up ${times(c.misconception.count)} in the last 3 weeks.`;
  }
  return `${head} You're at ${c.mastery}%: up to ${Math.round(c.gain)} marks to gain.`;
}

export function rankPath(input: RankInput): PathCandidate[] {
  const { core, stats, bp, now } = input;
  const average = core.average === null ? 0.5 : core.average / 100;
  const out: PathCandidate[] = [];
  for (const paper of bp.papers) {
    const result = core.papers.find((p) => p.key === paper.key);
    if (!result) continue;
    const days = paper.examDate ? daysUntilDay(paper.examDate, now) : null;
    const maxMarks = Math.max(...paper.topics.map((t) => t.marks));
    for (const topic of paper.topics) {
      const r = result.topics.find((x) => x.key === topic.key);
      if (!r) continue;
      if (r.status === 'tested' && (r.mastery ?? 0) >= MASTERY_SECURE) continue;
      if (r.status !== 'tested' && !r.due) continue;
      const s = stats.topics.get(paper.key)?.get(topic.key);
      const mc = r.status === 'tested' ? boostingMisconception(s?.hits ?? [], now) : null;
      const gain = r.status === 'tested' ? (topic.marks * (100 - (r.mastery ?? 0))) / 100 : topic.marks * (1 - average);
      const boost = mc ? (mc.count >= 2 ? MISCONCEPTION_BOOST_REPEATED : MISCONCEPTION_BOOST_ONCE) : 1;
      const proximity = days !== null && days <= PROXIMITY_WINDOW_DAYS
        ? 1 + PROXIMITY_MAX_BOOST * Math.min(1, Math.max(0, (PROXIMITY_WINDOW_DAYS - days) / PROXIMITY_WINDOW_DAYS)) * (topic.marks / maxMarks)
        : 1;
      const base: Omit<PathCandidate, 'why' | 'score'> = {
        paperKey: paper.key, paperTitle: paper.title, topicKey: topic.key, topicLabel: topic.label, marks: topic.marks,
        action: r.status === 'tested' ? 'practice' : 'check_in', mastery: r.mastery, gain,
        misconception: mc ? { typeId: mc.typeId, label: mc.label, learnerLabel: mc.learnerLabel, count: mc.count } : null,
        focusNodeId: focusNode(topic, s, mc?.topicNodeId ?? null), lastAnsweredAt: r.lastAnsweredAt,
      };
      out.push({ ...base, score: gain * boost * proximity, why: whyLine(base) });
    }
  }
  return out.sort((a, b) => b.score - a.score || b.marks - a.marks || (a.lastAnsweredAt ?? '').localeCompare(b.lastAnsweredAt ?? ''));
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Readiness
LANE_SWEEP_OK=1 git commit -m "feat(readiness): rank the path by marks to gain, boosted for repeated misconceptions and big topics near the exam, with a plain why" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Phase R-B — storage, freshness and the path

### Task 7: stored readiness, the evidence reader, recompute and freshness, snapshots, history and trend

**Files:**
- Create: `src/modules/Readiness/model-readiness.ts`, `src/modules/Readiness/rows.ts`, `src/modules/Readiness/snapshots.ts`, `src/modules/Readiness/service-compute.ts`
- Modify: `src/modules/Readiness/engine/sast.ts` (add `addDays`, `dayLabel`)
- Test: `src/modules/Readiness/__tests__/compute.test.ts`

**Interfaces:**
- Consumes: Task 2 (`blueprintData`, `ExamBlueprint`, the fixture); Task 3 (`learnerTarget`, `sastDay`, `sastWeekStart`, `sastDayStart`); Task 5 (`computeReadiness`, `Computation`); Task 1 (`isBlueprintVerified`); E-4 (`AnswerEvidence`, `MisconceptionType`).
- Produces:
  - `interface ILearnerReadiness`, `LearnerReadiness`; `interface SnapshotPaper`, `interface IReadinessSnapshot`, `ReadinessSnapshot`
  - `readinessRows(schoolId: Oid, studentId: Oid, subjectIds: readonly Oid[]): Promise<EngineRow[]>`, `nodeTitles(ids: readonly string[]): Promise<Map<string, string>>`
  - `interface ReadinessKey { schoolId: Oid; studentId: Oid; subjectKey: string }`
  - `writeDaySnapshot(key: ReadinessKey, core: ReadinessCore, now: Date, version: number): Promise<'written' | 'skipped'>`
  - `backfillHistory(key: ReadinessKey, rows: readonly EngineRow[], bp: BlueprintData, version: number, grade: number, now: Date): Promise<number>`
  - `interface TrendPoint { weekStart: string; label: string; papers: Record<string, number | null>; both: number | null; backfilled: boolean }`, `trendOf(key: ReadinessKey, weeks: number, now: Date): Promise<TrendPoint[]>`
  - `interface RecomputeResult { doc: ILearnerReadiness; computation: Computation; rows: EngineRow[]; bp: BlueprintData; grade: number }`
  - `recomputeReadiness(key: ReadinessKey, now?: Date): Promise<RecomputeResult | null>`, `ensureFresh(key: ReadinessKey, now?: Date): Promise<ILearnerReadiness | null>`
  - `addDays(day: string, n: number): string`, `dayLabel(day: string): string` (in `engine/sast.ts`)

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Readiness/__tests__/compute.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { ExamBlueprint } from '../model-blueprint.js';
import { LearnerReadiness, ReadinessSnapshot } from '../model-readiness.js';
import { ensureFresh, recomputeReadiness, type ReadinessKey } from '../service-compute.js';
import { trendOf, writeDaySnapshot } from '../snapshots.js';
import { Student } from '../../Student/model.js';
import { cleanUpClassrooms, type Learner } from '../../../test-utils/standalone-classroom.js';
import {
  cleanUpReadiness, evidence, grade12Learner, makeCurriculum, publishFixture, readinessRoom, type ReadinessRoom, type ReadinessWorld,
} from '../../../test-utils/readiness-fixture.js';

const NOW = new Date('2026-09-29T08:00:00Z'); // a Tuesday
const DAY = 86_400_000;
let w: ReadinessWorld;
let room: ReadinessRoom;
let thabo: Learner;
let key: ReadinessKey;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await Promise.all([ExamBlueprint.syncIndexes(), LearnerReadiness.syncIndexes(), ReadinessSnapshot.syncIndexes()]);
  w = await makeCurriculum();
  room = await readinessRoom(w);
  await publishFixture(w, { verified: true, examDates: ['2026-10-27', '2026-10-30'] });
  thabo = await grade12Learner(room, 'Thabo');
  key = { schoolId: room.schoolId, studentId: thabo.studentId, subjectKey: w.subjectKey };
  for (let i = 0; i < 24; i += 1) {
    await evidence(room, thabo, {
      topicNodeId: i % 2 ? w.nodes.FUNC12 : w.nodes.CALC12, marksAwarded: i % 3 ? 2 : 0, marksAvailable: 2,
      markedAt: new Date(NOW.getTime() - (i + 1) * DAY), subjectId: i % 5 === 0 ? room.maths11 : room.maths12,
      cognitiveLevel: (['knowledge', 'routine', 'complex', 'problem_solving'] as const)[i % 4],
    });
  }
  await evidence(room, thabo, { status: 'provisional', marksAwarded: 0, marksAvailable: 40, markedAt: new Date(NOW.getTime() - DAY) });
  await evidence(room, thabo, { subjectId: room.mathsLit, marksAwarded: 0, marksAvailable: 40, markedAt: new Date(NOW.getTime() - DAY) });
});
afterAll(async () => {
  await cleanUpReadiness(w);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

describe('recomputeReadiness', () => {
  it('reads final evidence from every Mathematics Subject, never provisional or Mathematical Literacy rows', async () => {
    const r = await recomputeReadiness(key, NOW);
    expect(r?.doc).toMatchObject({ learnerVisible: true, answers: 24, staleSince: null, computedDay: '2026-09-29', grade: 12 });
    expect(r?.doc.familySubjectIds).toHaveLength(3);
    expect(r?.doc.core?.papers[0].state).toBe('predicted');
    expect(r?.doc.core?.papers[0].topics[0].answers).toBe(12);
  });

  it('writes today\'s snapshot and the backfilled history once', async () => {
    const snaps = await ReadinessSnapshot.find({ schoolId: room.schoolId, studentId: thabo.studentId }).lean();
    expect(snaps.some((s) => s.day === '2026-09-29' && !s.backfilled)).toBe(true);
    expect(snaps.filter((s) => s.backfilled).map((s) => s.day)).toEqual(expect.arrayContaining(['2026-09-21', '2026-09-14']));
    expect(snaps.filter((s) => s.backfilled).every((s) => s.day === s.weekStart)).toBe(true);
    const before = snaps.length;
    await recomputeReadiness(key, new Date(NOW.getTime() + 3600_000));
    expect(await ReadinessSnapshot.countDocuments({ schoolId: room.schoolId, studentId: thabo.studentId })).toBe(before);
  });

  it('skips an unchanged day, but always writes a Monday', async () => {
    const doc = await LearnerReadiness.findOne(key).lean();
    expect(await writeDaySnapshot(key, doc!.core!, new Date('2026-09-30T08:00:00Z'), 1)).toBe('skipped');
    expect(await writeDaySnapshot(key, doc!.core!, new Date('2026-10-05T08:00:00Z'), 1)).toBe('written');
  });

  it('gives the trend one point per SAST week, oldest first', async () => {
    const points = await trendOf(key, 12, new Date('2026-10-05T08:00:00Z'));
    expect(points.map((p) => p.weekStart)).toEqual([...points.map((p) => p.weekStart)].sort());
    expect(points.at(-1)).toMatchObject({ weekStart: '2026-10-05', label: '5 Oct', backfilled: false });
    expect(typeof points.at(-1)?.papers.P1).toBe('number');
  });

  it('hides readiness when no blueprint applies any more (the learner moved to Grade 10)', async () => {
    const lebo = await grade12Learner(room, 'Lebo');
    await evidence(room, lebo, { markedAt: new Date(NOW.getTime() - DAY) });
    const k = { ...key, studentId: lebo.studentId };
    await recomputeReadiness(k, NOW);
    await Student.collection.updateOne({ _id: lebo.studentId }, { $set: { gradeId: room.grade10 } });
    expect(await recomputeReadiness(k, NOW)).toBeNull();
    expect(await LearnerReadiness.findOne(k).lean()).toMatchObject({ learnerVisible: false, core: null });
  });
});

describe('ensureFresh', () => {
  it('reuses a fresh result, and recomputes when stale', async () => {
    const first = await ensureFresh(key, NOW);
    const again = await ensureFresh(key, new Date(NOW.getTime() + 60_000));
    expect(again?.computedAt?.getTime()).toBe(first?.computedAt?.getTime());
    await LearnerReadiness.updateOne(key, { $set: { staleSince: new Date() } });
    const after = await ensureFresh(key, new Date(NOW.getTime() + 120_000));
    expect(after?.computedAt?.getTime()).toBe(NOW.getTime() + 120_000);
    expect(after?.staleSince).toBeNull();
  });

  it('a compute after SAST midnight is a new day', async () => {
    const late = await recomputeReadiness(key, new Date('2026-09-29T21:59:00Z'));
    expect(late?.doc.computedDay).toBe('2026-09-29');
    const next = await ensureFresh(key, new Date('2026-09-29T22:01:00Z'));
    expect(next?.computedDay).toBe('2026-09-30');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/compute.test.ts`
Expected: FAIL, with `Cannot find module '../model-readiness.js'`.

- [ ] **Step 3: Implement the models and the reader**

```ts
// src/modules/Readiness/model-readiness.ts
//
// LearnerReadiness (the latest result per learner and subject family; `core` is a derived cache, ruling RP4) and
// ReadinessSnapshot (at most one per learner, subject and SAST day, for the trend; spec §3.10).
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { ReadinessCore } from './types.js';

export interface ILearnerReadiness extends Document {
  schoolId: Types.ObjectId; studentId: Types.ObjectId; subjectKey: string; slug: string; subjectTitle: string;
  blueprintId: Types.ObjectId | null; blueprintVersion: number; examYear: number; grade: number;
  learnerVisible: boolean; familySubjectIds: Types.ObjectId[];
  core: ReadinessCore | null; answers: number; lastMarkedAt: Date | null;
  computedAt: Date | null; computedDay: string | null; staleSince: Date | null;
  target: number | null; historyVersion: number | null; lastViewedAt: Date | null;
  isDeleted: boolean; createdAt: Date; updatedAt: Date;
}

const learnerReadinessSchema = new Schema<ILearnerReadiness>({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectKey: { type: String, required: true }, slug: { type: String, required: true }, subjectTitle: { type: String, required: true },
  blueprintId: { type: Schema.Types.ObjectId, ref: 'ExamBlueprint', default: null },
  blueprintVersion: { type: Number, default: 0 }, examYear: { type: Number, required: true }, grade: { type: Number, required: true },
  learnerVisible: { type: Boolean, default: false },
  familySubjectIds: { type: [Schema.Types.ObjectId], ref: 'Subject', default: [] },
  core: { type: Schema.Types.Mixed, default: null },
  answers: { type: Number, default: 0 }, lastMarkedAt: { type: Date, default: null },
  computedAt: { type: Date, default: null }, computedDay: { type: String, default: null }, staleSince: { type: Date, default: null },
  target: { type: Number, default: null }, historyVersion: { type: Number, default: null }, lastViewedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
learnerReadinessSchema.index({ schoolId: 1, studentId: 1, subjectKey: 1 }, { unique: true });
learnerReadinessSchema.index({ schoolId: 1, studentId: 1, learnerVisible: 1, isDeleted: 1 });
learnerReadinessSchema.index({ isDeleted: 1, lastMarkedAt: 1 });
export const LearnerReadiness = mongoose.model<ILearnerReadiness>('LearnerReadiness', learnerReadinessSchema);

export interface SnapshotPaper {
  key: string; state: 'predicted' | 'not_enough_evidence'; low: number | null; high: number | null; mid: number | null;
  testedShare: number; answers: number;
}
export interface IReadinessSnapshot extends Document {
  schoolId: Types.ObjectId; studentId: Types.ObjectId; subjectKey: string; day: string; weekStart: string;
  blueprintVersion: number; papers: SnapshotPaper[]; both: { low: number; high: number; mid: number } | null;
  backfilled: boolean; isDeleted: boolean; createdAt: Date; updatedAt: Date;
}
const snapshotPaperSchema = new Schema<SnapshotPaper>({
  key: { type: String, required: true }, state: { type: String, enum: ['predicted', 'not_enough_evidence'], required: true },
  low: { type: Number, default: null }, high: { type: Number, default: null }, mid: { type: Number, default: null },
  testedShare: { type: Number, default: 0 }, answers: { type: Number, default: 0 },
}, { _id: false });
const readinessSnapshotSchema = new Schema<IReadinessSnapshot>({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectKey: { type: String, required: true }, day: { type: String, required: true }, weekStart: { type: String, required: true },
  blueprintVersion: { type: Number, default: 0 }, papers: { type: [snapshotPaperSchema], default: [] },
  both: { type: new Schema({ low: Number, high: Number, mid: Number }, { _id: false }), default: null },
  backfilled: { type: Boolean, default: false }, isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
readinessSnapshotSchema.index({ schoolId: 1, studentId: 1, subjectKey: 1, day: 1 }, { unique: true });
export const ReadinessSnapshot = mongoose.model<IReadinessSnapshot>('ReadinessSnapshot', readinessSnapshotSchema);
```

```ts
// src/modules/Readiness/rows.ts
//
// Final evidence rows of a learner in a subject family → EngineRow (spec §3.1, ruling RP2). One indexed read
// ({schoolId, studentId, subjectId, topicNodeId, markedAt}) plus the ready diagnoses' types.
import { AnswerEvidence } from '../Evidence/model.js';
import { MisconceptionType } from '../Evidence/model-taxonomy.js';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import type { CapsLevel, EngineRow, Oid, SourceType, TopicFrom, TypeKind } from './types.js';

interface Lean {
  _id: Oid; topicNodeId: Oid | null; subtopicNodeId: Oid | null; cognitiveLevel: CapsLevel | null;
  marksAwarded: number; marksAvailable: number; markedAt: Date; questionKey: string; topicFrom: TopicFrom; totalOverridden: boolean;
  source: { type: SourceType; recordId: Oid; parentId: Oid; itemKey: string; attemptNumber?: number };
  diagnosis: { state: string; typeId: Oid | null; confidence: number | null };
}
interface TypeLean { _id: Oid; kind: TypeKind; label: string; learnerLabel: string; learnerVisible: boolean; topicNodeId: Oid | null }

const FIELDS = 'topicNodeId subtopicNodeId cognitiveLevel marksAwarded marksAvailable markedAt questionKey topicFrom totalOverridden source diagnosis.state diagnosis.typeId diagnosis.confidence';

export async function readinessRows(schoolId: Oid, studentId: Oid, subjectIds: readonly Oid[]): Promise<EngineRow[]> {
  if (subjectIds.length === 0) return [];
  const rows = (await AnswerEvidence.find({
    schoolId, studentId, subjectId: { $in: subjectIds }, status: 'final', isDeleted: false,
  }).select(FIELDS).lean()) as unknown as Lean[];
  const typeIds = [...new Set(rows.filter((r) => r.diagnosis.state === 'ready' && r.diagnosis.typeId).map((r) => String(r.diagnosis.typeId)))];
  const types = typeIds.length === 0 ? [] : (await MisconceptionType.find({ _id: { $in: typeIds } })
    .select('kind label learnerLabel learnerVisible topicNodeId').lean()) as unknown as TypeLean[];
  const byId = new Map(types.map((t) => [String(t._id), t]));
  return rows.map((r): EngineRow => {
    const type = r.diagnosis.state === 'ready' && r.diagnosis.typeId ? byId.get(String(r.diagnosis.typeId)) : undefined;
    return {
      id: String(r._id), topicNodeId: r.topicNodeId ? String(r.topicNodeId) : null, subtopicNodeId: r.subtopicNodeId ? String(r.subtopicNodeId) : null,
      cognitiveLevel: r.cognitiveLevel, marksAwarded: r.marksAwarded, marksAvailable: r.marksAvailable, markedAt: r.markedAt,
      sourceType: r.source.type, attemptNumber: r.source.attemptNumber ?? 1, questionKey: r.questionKey, topicFrom: r.topicFrom,
      totalOverridden: r.totalOverridden, recordId: String(r.source.recordId), parentId: String(r.source.parentId), itemKey: r.source.itemKey,
      misconception: type ? {
        typeId: String(type._id), kind: type.kind, label: type.label, learnerLabel: type.learnerLabel, learnerVisible: type.learnerVisible,
        confidence: r.diagnosis.confidence, topicNodeId: type.topicNodeId ? String(type.topicNodeId) : null,
      } : null,
    };
  });
}

export async function nodeTitles(ids: readonly string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const nodes = await CurriculumNode.find({ _id: { $in: ids } }).select('title').lean();
  return new Map(nodes.map((n) => [String(n._id), n.title]));
}
```

- [ ] **Step 4: Implement snapshots and the compute service**

Add to `src/modules/Readiness/engine/sast.ts`:

```ts
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A YYYY-MM-DD day moved by whole days. */
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** "7 Sep" for a YYYY-MM-DD day. */
export function dayLabel(day: string): string {
  return `${Number(day.slice(8, 10))} ${MONTH_NAMES[Number(day.slice(5, 7)) - 1]}`;
}
```

```ts
// src/modules/Readiness/snapshots.ts
//
// The trend (spec §3.10): at most one snapshot per learner, subject and SAST day; an unchanged day is skipped
// except on Mondays; 12 past Mondays are backfilled "as of" that date, labelled.
import { HISTORY_WEEKS } from './constants.js';
import { ReadinessSnapshot, type IReadinessSnapshot, type SnapshotPaper } from './model-readiness.js';
import { computeReadiness } from './engine/readiness.js';
import { addDays, dayLabel, sastDay, sastDayStart, sastWeekStart } from './engine/sast.js';
import type { BlueprintData, EngineRow, Oid, ReadinessCore } from './types.js';

export interface ReadinessKey { schoolId: Oid; studentId: Oid; subjectKey: string }
type Payload = Pick<IReadinessSnapshot, 'papers' | 'both'>;

function payloadOf(core: ReadinessCore): Payload {
  return {
    papers: core.papers.map((p): SnapshotPaper => ({
      key: p.key, state: p.state, low: p.band?.low ?? null, high: p.band?.high ?? null, mid: p.band?.mid ?? null,
      testedShare: Math.round((p.gate.testedMarks / p.totalMarks) * 100), answers: p.gate.answers,
    })),
    both: core.both?.band ? { low: core.both.band.low, high: core.both.band.high, mid: core.both.band.mid } : null,
  };
}

const sameAs = (a: Payload, b: Payload): boolean =>
  JSON.stringify(a.papers.map((p) => [p.key, p.state, p.low, p.high])) === JSON.stringify(b.papers.map((p) => [p.key, p.state, p.low, p.high]))
  && (a.both?.mid ?? null) === (b.both?.mid ?? null);

export async function writeDaySnapshot(key: ReadinessKey, core: ReadinessCore, now: Date, version: number): Promise<'written' | 'skipped'> {
  const day = sastDay(now);
  const weekStart = sastWeekStart(now);
  const payload = payloadOf(core);
  const today = await ReadinessSnapshot.exists({ ...key, day, isDeleted: false });
  if (!today && day !== weekStart) {
    const previous = await ReadinessSnapshot.findOne({ ...key, day: { $lt: day }, isDeleted: false }).sort({ day: -1 }).lean();
    if (previous && sameAs(previous, payload)) return 'skipped';
  }
  await ReadinessSnapshot.updateOne(
    { ...key, day },
    { $set: { ...payload, weekStart, blueprintVersion: version, backfilled: false, isDeleted: false } },
    { upsert: true },
  );
  return 'written';
}

/** Past Mondays "as of" that Monday (00:00 SAST); a real snapshot on a Monday is never replaced. */
export async function backfillHistory(
  key: ReadinessKey, rows: readonly EngineRow[], bp: BlueprintData, version: number, grade: number, now: Date,
): Promise<number> {
  const thisMonday = sastWeekStart(now);
  let written = 0;
  for (let weeks = HISTORY_WEEKS; weeks >= 1; weeks -= 1) {
    const monday = addDays(thisMonday, -7 * weeks);
    const existing = await ReadinessSnapshot.findOne({ ...key, day: monday, isDeleted: false }).select('backfilled').lean();
    if (existing && !existing.backfilled) continue;
    const asOf = sastDayStart(monday);
    const { core } = computeReadiness(rows, bp, { asOf, now: asOf, grade, titles: new Map() });
    if (core.answers === 0) continue;
    await ReadinessSnapshot.updateOne(
      { ...key, day: monday },
      { $set: { ...payloadOf(core), weekStart: monday, blueprintVersion: version, backfilled: true, isDeleted: false } },
      { upsert: true },
    );
    written += 1;
  }
  return written;
}

export interface TrendPoint { weekStart: string; label: string; papers: Record<string, number | null>; both: number | null; backfilled: boolean }

export async function trendOf(key: ReadinessKey, weeks: number, now: Date): Promise<TrendPoint[]> {
  const from = addDays(sastWeekStart(now), -7 * (weeks - 1));
  const snaps = await ReadinessSnapshot.find({ ...key, day: { $gte: from }, isDeleted: false }).sort({ day: 1 }).lean();
  const byWeek = new Map<string, (typeof snaps)[number]>();
  for (const s of snaps) byWeek.set(s.weekStart, s);
  return [...byWeek.values()].map((s) => ({
    weekStart: s.weekStart, label: dayLabel(s.weekStart), papers: Object.fromEntries(s.papers.map((p) => [p.key, p.mid])),
    both: s.both?.mid ?? null, backfilled: s.backfilled,
  }));
}
```

```ts
// src/modules/Readiness/service-compute.ts
//
// Recompute and freshness (spec §3.10). A read recomputes when stale, when the SAST day has changed, or when
// the blueprint changed (new version, verification) — so correctness never depends on Redis (ruling RP3).
import { ExamBlueprint } from './model-blueprint.js';
import { LearnerReadiness, type ILearnerReadiness } from './model-readiness.js';
import { blueprintData } from './blueprint-service.js';
import { isBlueprintVerified } from './blueprint-validate.js';
import { learnerTarget } from './blueprint-resolve.js';
import { computeReadiness, type Computation } from './engine/readiness.js';
import { sastDay } from './engine/sast.js';
import { nodeTitles, readinessRows } from './rows.js';
import { backfillHistory, writeDaySnapshot, type ReadinessKey } from './snapshots.js';
import type { BlueprintData, EngineRow } from './types.js';

export type { ReadinessKey };
export interface RecomputeResult { doc: ILearnerReadiness; computation: Computation; rows: EngineRow[]; bp: BlueprintData; grade: number }

export async function recomputeReadiness(key: ReadinessKey, now: Date = new Date()): Promise<RecomputeResult | null> {
  const target = await learnerTarget(key.schoolId, key.studentId, key.subjectKey, now);
  if (!target) {
    await LearnerReadiness.updateOne(key, { $set: { learnerVisible: false, core: null, staleSince: null, computedAt: now, computedDay: sastDay(now) } });
    return null;
  }
  const bp = blueprintData(target.blueprint);
  const rows = await readinessRows(key.schoolId, key.studentId, target.subjectIds);
  const titles = await nodeTitles([...new Set(rows.map((r) => r.subtopicNodeId).filter((x): x is string => x !== null))]);
  const computation = computeReadiness(rows, bp, { asOf: now, now, grade: target.grade, titles });
  const version = target.blueprint.version;
  const doc = await LearnerReadiness.findOneAndUpdate(key, {
    $set: {
      slug: bp.slug, subjectTitle: bp.subjectTitle, blueprintId: target.blueprint._id, blueprintVersion: version, examYear: bp.examYear,
      grade: target.grade, learnerVisible: isBlueprintVerified(bp), familySubjectIds: target.subjectIds, core: computation.core,
      answers: computation.core.answers, lastMarkedAt: computation.stats.lastMarkedAt, computedAt: now, computedDay: sastDay(now),
      staleSince: null, isDeleted: false,
    },
    $setOnInsert: { target: null, historyVersion: null, lastViewedAt: null },
  }, { upsert: true, new: true });
  await writeDaySnapshot(key, computation.core, now, version);
  if (doc.historyVersion !== version) {
    await backfillHistory(key, rows, bp, version, target.grade, now);
    doc.historyVersion = version;
    await LearnerReadiness.updateOne({ _id: doc._id }, { $set: { historyVersion: version } });
  }
  return { doc, computation, rows, bp, grade: target.grade };
}

export async function ensureFresh(key: ReadinessKey, now: Date = new Date()): Promise<ILearnerReadiness | null> {
  const doc = await LearnerReadiness.findOne({ ...key, isDeleted: false });
  if (doc?.core && !doc.staleSince && doc.computedDay === sastDay(now) && doc.blueprintId) {
    const bp = await ExamBlueprint.findOne({ _id: doc.blueprintId, isDeleted: false });
    if (bp?.status === 'published' && bp.version === doc.blueprintVersion && isBlueprintVerified(blueprintData(bp)) === doc.learnerVisible) return doc;
  }
  const result = await recomputeReadiness(key, now);
  return result?.doc ?? null;
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/modules/Readiness
LANE_SWEEP_OK=1 git commit -m "feat(readiness): stored readiness per learner and subject, recompute when stale or on a new SAST day, daily snapshots and 12 weeks of history" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: the path: weekly items, completion by evidence, carry and expiry, teacher pins and removal

**Files:**
- Create: `src/modules/Readiness/model-path.ts`, `src/modules/Readiness/path-service.ts`
- Modify: `src/modules/Readiness/service-compute.ts` (call `refreshPath` at the end of `recomputeReadiness`)
- Test: `src/modules/Readiness/__tests__/path-service.test.ts`

**Interfaces:**
- Consumes: Task 6 (`rankPath`, `whyLine`, `PathCandidate`); Task 4 (`blueprintIndex`, `examTopicsOf`); Task 7 (`RecomputeResult`, `recomputeReadiness`, `ReadinessKey`); constants.
- Produces:
  - `PATH_STATES`, `PATH_ACTIONS`, `interface IPathItem` (with `issuedAt`: the `now` it was made for, which completion counts evidence after), `PathItem`
  - `refreshPath(result: RecomputeResult, key: ReadinessKey, now: Date): Promise<void>`
  - `interface PathItemView { id: string; rank: number; weekStart: string; paperKey: string; topicKey: string; topicLabel: string; action: IPathItem['action']; misconception: { typeId: string; label: string } | null; marksToGain: number | null; why: string; state: IPathItem['state']; pinned: boolean; startedAt: string | null; doneAt: string | null; score: number }`
  - `weekItems(key: ReadinessKey, now: Date): Promise<IPathItem[]>`, `toPathItemView(item: IPathItem): PathItemView`
  - `pinTopic(result: RecomputeResult, key: ReadinessKey, input: { topicKey: string; misconceptionTypeId: string | null; by: Oid; now: Date }): Promise<IPathItem>`
  - `removeItem(key: ReadinessKey, itemId: string, by: Oid): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Readiness/__tests__/path-service.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { ExamBlueprint } from '../model-blueprint.js';
import { LearnerReadiness, ReadinessSnapshot } from '../model-readiness.js';
import { PathItem } from '../model-path.js';
import { recomputeReadiness, type ReadinessKey } from '../service-compute.js';
import { pinTopic, removeItem, weekItems } from '../path-service.js';
import { cleanUpClassrooms, type Learner } from '../../../test-utils/standalone-classroom.js';
import {
  cleanUpReadiness, evidence, grade12Learner, makeCurriculum, publishFixture, readinessRoom, type ReadinessRoom, type ReadinessWorld,
} from '../../../test-utils/readiness-fixture.js';

const TUE = new Date('2026-09-29T08:00:00Z');
const DAY = 86_400_000;
let w: ReadinessWorld;
let room: ReadinessRoom;
let ayanda: Learner;
let key: ReadinessKey;

async function answers(node: mongoose.Types.ObjectId, n: number, awarded: number, at: Date, sourceType = 'test'): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    await evidence(room, ayanda, { topicNodeId: node, marksAwarded: awarded, marksAvailable: 2, markedAt: new Date(at.getTime() - i * 60_000), sourceType });
  }
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await Promise.all([ExamBlueprint.syncIndexes(), LearnerReadiness.syncIndexes(), ReadinessSnapshot.syncIndexes(), PathItem.syncIndexes()]);
  w = await makeCurriculum();
  room = await readinessRoom(w);
  await publishFixture(w, { verified: true, examDates: ['2026-10-27', '2026-10-30'] });
  ayanda = await grade12Learner(room, 'Ayanda');
  key = { schoolId: room.schoolId, studentId: ayanda.studentId, subjectKey: w.subjectKey };
  const before = new Date(TUE.getTime() - 2 * DAY);
  await answers(w.nodes.FUNC12, 8, 0, before);
  await answers(w.nodes.CALC12, 8, 1, before);
  await answers(w.nodes.TRIG12, 8, 1, before);
  await answers(w.nodes.STAT12, 8, 2, before);
});
afterAll(async () => {
  await cleanUpReadiness(w);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

describe('the weekly path (spec §4.3)', () => {
  it('makes up to three items for the SAST week, once', async () => {
    await recomputeReadiness(key, TUE);
    await recomputeReadiness(key, new Date(TUE.getTime() + 3600_000));
    const items = await weekItems(key, TUE);
    expect(items.map((i) => [i.rank, i.topicKey, i.state])).toEqual([[1, 'P1.FUNC', 'open'], [2, 'P1.CALC', 'open'], [3, 'P2.TRIG', 'open']]);
    expect(items.every((i) => i.weekStart === '2026-09-28')).toBe(true);
  });

  it('is done when four new final answers on the topic arrive from any source', async () => {
    await answers(w.nodes.CALC12, 3, 1, new Date(TUE.getTime() + 2 * 3600_000), 'homework');
    await recomputeReadiness(key, new Date(TUE.getTime() + 3 * 3600_000));
    expect((await weekItems(key, TUE)).find((i) => i.topicKey === 'P1.CALC')?.state).toBe('open');
    await answers(w.nodes.CALC12, 1, 1, new Date(TUE.getTime() + 4 * 3600_000), 'homework');
    await recomputeReadiness(key, new Date(TUE.getTime() + 5 * 3600_000));
    expect((await weekItems(key, TUE)).find((i) => i.topicKey === 'P1.CALC')).toMatchObject({ state: 'done', doneReason: 'evidence' });
  });

  it('does not refill mid-week', async () => {
    expect(await weekItems(key, TUE)).toHaveLength(3);
  });

  it('a teacher pin replaces the lowest open item, first in the week; removing hides it', async () => {
    const result = await recomputeReadiness(key, new Date(TUE.getTime() + 6 * 3600_000));
    const teacher = new mongoose.Types.ObjectId();
    const pinned = await pinTopic(result!, key, { topicKey: 'P1.PROB', misconceptionTypeId: null, by: teacher, now: new Date(TUE.getTime() + 6 * 3600_000) });
    expect(pinned.why.startsWith('Your teacher picked this for you. ')).toBe(true);
    const items = await weekItems(key, TUE);
    expect(items[0]).toMatchObject({ topicKey: 'P1.PROB', rank: 1 });
    expect(await PathItem.countDocuments({ ...key, state: 'replaced' })).toBe(1);
    await removeItem(key, String(pinned._id), teacher);
    expect((await weekItems(key, TUE)).map((i) => i.topicKey)).not.toContain('P1.PROB');
    await expect(removeItem(key, String(pinned._id), teacher)).rejects.toThrow(/not found/i);
  });

  it('the path week turns at SAST midnight on Sunday: open items still on top carry over, others expire', async () => {
    const sundayLate = new Date('2026-10-04T21:59:00Z');
    await recomputeReadiness(key, sundayLate);
    expect((await weekItems(key, sundayLate))[0].weekStart).toBe('2026-09-28');
    const monday = new Date('2026-10-04T22:01:00Z');
    await recomputeReadiness(key, monday);
    const next = await weekItems(key, monday);
    expect(next.every((i) => i.weekStart === '2026-10-05')).toBe(true);
    expect(next.length).toBeLessThanOrEqual(3);
    const func = await PathItem.find({ ...key, topicKey: 'P1.FUNC' }).lean();
    expect(func).toHaveLength(1);
    expect(func[0].weekStart).toBe('2026-10-05');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/path-service.test.ts`
Expected: FAIL, with `Cannot find module '../model-path.js'`.

- [ ] **Step 3: Implement**

```ts
// src/modules/Readiness/model-path.ts
//
// One item of a learner's weekly path (spec §4). Soft delete only; states never go back to open.
import mongoose, { Schema, Document, Types } from 'mongoose';

export const PATH_STATES = ['open', 'started', 'done', 'expired', 'removed', 'replaced'] as const;
export const PATH_ACTIONS = ['practice', 'check_in', 'explainer', 'mini_mock'] as const;

export interface IPathItem extends Document {
  schoolId: Types.ObjectId; studentId: Types.ObjectId; subjectKey: string; weekStart: string; rank: number;
  paperKey: string; topicKey: string; topicLabel: string; action: (typeof PATH_ACTIONS)[number];
  focusNodeId: string | null; misconceptionTypeId: Types.ObjectId | null; misconceptionLabel: string | null;
  marksToGain: number | null; score: number; why: string; state: (typeof PATH_STATES)[number];
  pinnedBy: Types.ObjectId | null; removedBy: Types.ObjectId | null; practiceAttemptId: Types.ObjectId | null;
  issuedAt: Date; startedAt: Date | null; doneAt: Date | null; doneReason: 'evidence' | 'secured' | null;
  isDeleted: boolean; createdAt: Date; updatedAt: Date;
}

const pathItemSchema = new Schema<IPathItem>({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectKey: { type: String, required: true }, weekStart: { type: String, required: true }, rank: { type: Number, required: true },
  paperKey: { type: String, required: true }, topicKey: { type: String, required: true }, topicLabel: { type: String, required: true },
  action: { type: String, enum: PATH_ACTIONS, required: true },
  focusNodeId: { type: String, default: null },
  misconceptionTypeId: { type: Schema.Types.ObjectId, ref: 'MisconceptionType', default: null },
  misconceptionLabel: { type: String, default: null },
  marksToGain: { type: Number, default: null }, score: { type: Number, default: 0 }, why: { type: String, required: true },
  state: { type: String, enum: PATH_STATES, default: 'open' },
  pinnedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  removedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  practiceAttemptId: { type: Schema.Types.ObjectId, ref: 'PracticeAttempt', default: null },
  issuedAt: { type: Date, required: true }, startedAt: { type: Date, default: null }, doneAt: { type: Date, default: null },
  doneReason: { type: String, enum: ['evidence', 'secured', null], default: null },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
pathItemSchema.index({ schoolId: 1, studentId: 1, subjectKey: 1, weekStart: 1 });
pathItemSchema.index({ schoolId: 1, studentId: 1, state: 1 });

export const PathItem = mongoose.model<IPathItem>('PathItem', pathItemSchema);
```

```ts
// src/modules/Readiness/path-service.ts
//
// The weekly path (spec §4.3–§4.5): at most three items per subject per SAST week; done when four new final
// answers on the topic arrive (any source) or the topic is secure; carried or expired at the week's turn;
// teachers pin (first, replacing the lowest open system item) and remove. Never refilled mid-week.
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { MASTERY_SECURE, PATH_DONE_ANSWERS, PATH_ITEMS_PER_WEEK } from './constants.js';
import { PathItem, type IPathItem } from './model-path.js';
import { rankPath, whyLine, type PathCandidate } from './engine/path-rank.js';
import { blueprintIndex, examTopicsOf } from './engine/mapping.js';
import { sastWeekStart } from './engine/sast.js';
import type { RecomputeResult } from './service-compute.js';
import type { ReadinessKey } from './snapshots.js';
import type { Oid } from './types.js';

const LIVE = ['open', 'started'] as const;
const SHOWN = ['open', 'started', 'done'] as const;

export interface PathItemView {
  id: string; rank: number; weekStart: string; paperKey: string; topicKey: string; topicLabel: string; action: IPathItem['action'];
  misconception: { typeId: string; label: string } | null; marksToGain: number | null; why: string; state: IPathItem['state'];
  pinned: boolean; startedAt: string | null; doneAt: string | null; score: number;
}

export function toPathItemView(i: IPathItem): PathItemView {
  return {
    id: String(i._id), rank: i.rank, weekStart: i.weekStart, paperKey: i.paperKey, topicKey: i.topicKey, topicLabel: i.topicLabel, action: i.action,
    misconception: i.misconceptionTypeId ? { typeId: String(i.misconceptionTypeId), label: i.misconceptionLabel ?? '' } : null,
    marksToGain: i.marksToGain, why: i.why, state: i.state, pinned: i.pinnedBy !== null,
    startedAt: i.startedAt?.toISOString() ?? null, doneAt: i.doneAt?.toISOString() ?? null, score: i.score,
  };
}

export async function weekItems(key: ReadinessKey, now: Date): Promise<IPathItem[]> {
  return PathItem.find({ ...key, weekStart: sastWeekStart(now), state: { $in: SHOWN }, isDeleted: false }).sort({ rank: 1 });
}

async function renumber(key: ReadinessKey, weekStart: string): Promise<void> {
  const items = await PathItem.find({ ...key, weekStart, state: { $in: SHOWN }, isDeleted: false });
  const ordered = [...items].sort((a, b) => Number(b.pinnedBy !== null) - Number(a.pinnedBy !== null) || b.score - a.score);
  await Promise.all(ordered.map((item, i) => PathItem.updateOne({ _id: item._id }, { $set: { rank: i + 1 } })));
}

async function completeItems(result: RecomputeResult, key: ReadinessKey, now: Date): Promise<void> {
  const live = await PathItem.find({ ...key, state: { $in: LIVE }, isDeleted: false });
  const index = blueprintIndex(result.bp);
  for (const item of live) {
    const topic = result.computation.core.papers.find((p) => p.key === item.paperKey)?.topics.find((t) => t.key === item.topicKey);
    const fresh = result.rows.filter((r) => r.markedAt > item.issuedAt && examTopicsOf(index, r).some((ref) => ref.topicKey === item.topicKey)).length;
    const secured = topic?.status === 'tested' && (topic.mastery ?? 0) >= MASTERY_SECURE;
    if (fresh >= PATH_DONE_ANSWERS || secured) {
      await PathItem.updateOne({ _id: item._id }, { $set: { state: 'done', doneAt: now, doneReason: fresh >= PATH_DONE_ANSWERS ? 'evidence' : 'secured' } });
    }
  }
}

function itemFields(c: PathCandidate, key: ReadinessKey, weekStart: string, rank: number, issuedAt: Date): Record<string, unknown> {
  return {
    ...key, weekStart, rank, issuedAt, paperKey: c.paperKey, topicKey: c.topicKey, topicLabel: c.topicLabel, action: c.action,
    focusNodeId: c.focusNodeId, misconceptionTypeId: c.misconception ? new mongoose.Types.ObjectId(c.misconception.typeId) : null,
    misconceptionLabel: c.misconception?.learnerLabel ?? null, marksToGain: c.mastery === null ? null : Math.round(c.gain * 10) / 10,
    score: c.score, why: c.why, state: 'open',
  };
}

async function ensureWeek(result: RecomputeResult, key: ReadinessKey, now: Date): Promise<void> {
  const weekStart = sastWeekStart(now);
  const thisWeek = await PathItem.find({ ...key, weekStart, isDeleted: false }).lean();
  if (thisWeek.some((i) => i.pinnedBy === null)) return;
  const ranked = rankPath({ core: result.computation.core, stats: result.computation.stats, bp: result.bp, now });
  const top = new Set(ranked.slice(0, PATH_ITEMS_PER_WEEK).map((c) => c.topicKey));
  const taken = new Set(thisWeek.filter((i) => (SHOWN as readonly string[]).includes(i.state)).map((i) => i.topicKey));
  const older = await PathItem.find({ ...key, weekStart: { $lt: weekStart }, state: { $in: LIVE }, isDeleted: false });
  for (const item of older) {
    if (top.has(item.topicKey) && !taken.has(item.topicKey)) {
      await PathItem.updateOne({ _id: item._id }, { $set: { weekStart } });
      taken.add(item.topicKey);
    } else {
      await PathItem.updateOne({ _id: item._id }, { $set: { state: 'expired' } });
    }
  }
  const fresh = ranked.filter((c) => !taken.has(c.topicKey)).slice(0, Math.max(0, PATH_ITEMS_PER_WEEK - taken.size));
  if (fresh.length > 0) await PathItem.insertMany(fresh.map((c, i) => itemFields(c, key, weekStart, taken.size + i + 1, now)));
  await renumber(key, weekStart);
}

export async function refreshPath(result: RecomputeResult, key: ReadinessKey, now: Date): Promise<void> {
  await completeItems(result, key, now);
  await ensureWeek(result, key, now);
}

export async function pinTopic(result: RecomputeResult, key: ReadinessKey, input: {
  topicKey: string; misconceptionTypeId: string | null; by: Oid; now: Date;
}): Promise<IPathItem> {
  const paper = result.computation.core.papers.find((p) => p.topics.some((t) => t.key === input.topicKey));
  const topic = paper?.topics.find((t) => t.key === input.topicKey);
  if (!paper || !topic) throw new BadRequestError('That exam topic is not in this subject\'s blueprint');
  const mc = input.misconceptionTypeId ? topic.misconceptions.find((m) => m.typeId === input.misconceptionTypeId) ?? null : null;
  if (input.misconceptionTypeId && !mc) throw new BadRequestError('That misconception has not come up on this topic');
  const average = (result.computation.core.average ?? 50) / 100;
  const gain = topic.mastery === null ? topic.marks * (1 - average) : (topic.marks * (100 - topic.mastery)) / 100;
  const candidate: Omit<PathCandidate, 'why' | 'score'> = {
    paperKey: paper.key, paperTitle: paper.title, topicKey: topic.key, topicLabel: topic.label, marks: topic.marks,
    action: topic.status === 'tested' ? 'practice' : 'check_in', mastery: topic.mastery, gain,
    misconception: mc ? { typeId: mc.typeId, label: mc.label, learnerLabel: mc.learnerLabel, count: mc.count } : null,
    focusNodeId: result.bp.papers.find((p) => p.key === paper.key)?.topics.find((t) => t.key === topic.key)?.nodes[0]?.nodeId ?? null,
    lastAnsweredAt: topic.lastAnsweredAt,
  };
  const why = `Your teacher picked this for you. ${whyLine(candidate)}`;
  const weekStart = sastWeekStart(input.now);
  const live = await PathItem.find({ ...key, weekStart, state: { $in: SHOWN }, isDeleted: false });
  const same = live.find((i) => i.topicKey === topic.key && i.state !== 'done');
  if (same) {
    same.set({ pinnedBy: input.by, why, misconceptionTypeId: mc ? new mongoose.Types.ObjectId(mc.typeId) : same.misconceptionTypeId, misconceptionLabel: mc?.learnerLabel ?? same.misconceptionLabel });
    await same.save();
    await renumber(key, weekStart);
    return same;
  }
  if (live.length >= PATH_ITEMS_PER_WEEK) {
    const lowest = live.filter((i) => i.pinnedBy === null && i.state === 'open').sort((a, b) => b.rank - a.rank)[0];
    if (lowest) await PathItem.updateOne({ _id: lowest._id }, { $set: { state: 'replaced' } });
  }
  const created = await PathItem.create({ ...itemFields({ ...candidate, why, score: Number.MAX_SAFE_INTEGER }, key, weekStart, 0, input.now), why, pinnedBy: input.by });
  await renumber(key, weekStart);
  return (await PathItem.findById(created._id))!;
}

export async function removeItem(key: ReadinessKey, itemId: string, by: Oid): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(itemId)) throw new NotFoundError('Path item not found');
  const res = await PathItem.updateOne(
    { _id: new mongoose.Types.ObjectId(itemId), ...key, state: { $in: LIVE }, isDeleted: false },
    { $set: { state: 'removed', removedBy: by } },
  );
  if (res.matchedCount === 0) throw new NotFoundError('Path item not found');
}
```

In `src/modules/Readiness/service-compute.ts`, import `refreshPath` from `./path-service.js`. Just before `return { doc, computation, rows, bp, grade: target.grade };` in `recomputeReadiness`, add:

```ts
  const result: RecomputeResult = { doc, computation, rows, bp, grade: target.grade };
  await refreshPath(result, key, now);
  return result;
```

Then delete the old `return` line. `path-service.ts` imports only the **type** `RecomputeResult` from `service-compute.ts`, so there is no runtime import cycle.

- [ ] **Step 4: Run it to verify it passes**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing. The first test's order follows from the evidence:
- The average is 32 of 64 marks = 0.5.
- P1 is 28 days away (proximity 1 + 0.25 × W/40) and P2 31 days away (1 + 0.223 × W/30).
- Functions: 40 × 1.0 × 1.25 = 50.
- Calculus: 35 × 0.5 × 1.219 = 21.3.
- Trigonometry: 30 × 0.5 × 1.223 = 18.3.
- Probability (untested, due within 84 days): 25 × 0.5 × 1.156 = 14.5.
- Statistics is secure and left out.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Readiness
LANE_SWEEP_OK=1 git commit -m "feat(readiness): the weekly path: three items, done by new evidence from any source, carried or expired at the SAST week's turn, teacher pins and removal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: keeping readiness fresh: the recompute contract, the queue and nightly job, discovery, the recompute script, the school cascade, and E's hook

**Files:**
- Create: `src/modules/Readiness/recompute-queue.ts`, `src/modules/Readiness/discover.ts`, `src/modules/Readiness/jobs.ts`, `src/jobs/readiness.job.ts`, `src/scripts/readiness-recompute.ts`
- Modify: `src/jobs/queues.ts` (add `readinessQueue`), `src/jobs/index.ts` (worker, nightly schedule, `setReadinessJobsEnabled(true)`), `src/common/utils.ts` (cascade list), `package.json` (`"readiness:recompute": "tsx src/scripts/readiness-recompute.ts"`)
- Test: `src/modules/Readiness/__tests__/freshness.test.ts`

**Interfaces:**
- Consumes: Task 3 (`subjectFamily`, `learnerTarget`); Task 7 (`recomputeReadiness`, `LearnerReadiness`); Task 2 (`blueprintData`, `isBlueprintVerified`); `redisConnection` (`src/jobs/queues.ts`); `cascadeSoftDeleteSchool` (`src/common/utils.ts:55`).
- Produces:
  - `RECOMPUTE_JOB = 'readiness:recompute'`, `NIGHTLY_JOB = 'readiness:nightly'`, `BLUEPRINT_JOB = 'readiness:blueprint'`
  - `setReadinessJobsEnabled(on: boolean): void`
  - `enqueueReadinessRecompute(input: { schoolId: string; studentId: string; subjectId: string | null }): Promise<void>` (the E-hook contract, ruling RP3)
  - `enqueueBlueprintRecompute(blueprintId: string): Promise<void>`
  - `learnersForBlueprint(bp: IExamBlueprint, schoolId?: Oid): Promise<ReadinessKey[]>`
  - `runReadinessJob(name: string, data: unknown, now?: Date): Promise<Record<string, number>>`, `runNightly(now: Date): Promise<{ recomputed: number }>`, `recomputeFamily(blueprintId: string, now: Date, schoolId?: Oid): Promise<{ learners: number; visible: number }>`
  - `readinessQueue`, `createReadinessWorker()`, `scheduleReadinessNightly()`

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Readiness/__tests__/freshness.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { readinessQueue } from '../../../jobs/queues.js';
import { cascadeSoftDeleteSchool } from '../../../common/utils.js';
import { ExamBlueprint } from '../model-blueprint.js';
import { LearnerReadiness } from '../model-readiness.js';
import { PathItem } from '../model-path.js';
import { enqueueReadinessRecompute, setReadinessJobsEnabled } from '../recompute-queue.js';
import { learnersForBlueprint } from '../discover.js';
import { runNightly, runReadinessJob } from '../jobs.js';
import { cleanUpClassrooms, type Learner } from '../../../test-utils/standalone-classroom.js';
import {
  cleanUpReadiness, evidence, grade12Learner, makeCurriculum, publishFixture, readinessRoom, type ReadinessRoom, type ReadinessWorld,
} from '../../../test-utils/readiness-fixture.js';

const DAY = 86_400_000;
/** These tests run on the real clock (the enqueue and the jobs use it), so the blueprint is for this SAST year. */
const YEAR = new Date(Date.now() + 2 * 3600_000).getUTCFullYear();
let w: ReadinessWorld;
let room: ReadinessRoom;
let other: ReadinessRoom;
let thabo: Learner;
let sipho: Learner;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await Promise.all([ExamBlueprint.syncIndexes(), LearnerReadiness.syncIndexes(), PathItem.syncIndexes()]);
  w = await makeCurriculum();
  room = await readinessRoom(w);
  other = await readinessRoom(w);
  await publishFixture(w, { verified: true, examYear: YEAR, examDates: [`${YEAR}-10-27`, `${YEAR}-10-30`] });
  thabo = await grade12Learner(room, 'Thabo');
  sipho = await grade12Learner(other, 'Sipho');
  await evidence(room, thabo, {});
  await evidence(other, sipho, { subjectId: other.maths12 });
});
afterEach(() => {
  vi.restoreAllMocks();
  setReadinessJobsEnabled(false);
});
afterAll(async () => {
  await cleanUpReadiness(w);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

const input = () => ({ schoolId: String(room.schoolId), studentId: String(thabo.studentId), subjectId: String(room.maths12) });

describe('enqueueReadinessRecompute (the E-hook contract, ruling RP3)', () => {
  it('marks the readiness stale and, with no workers in this process, enqueues nothing', async () => {
    const add = vi.spyOn(readinessQueue, 'add');
    await enqueueReadinessRecompute(input());
    expect(add).not.toHaveBeenCalled();
    expect(await LearnerReadiness.findOne({ schoolId: room.schoolId, studentId: thabo.studentId }).lean())
      .toMatchObject({ subjectKey: w.subjectKey, learnerVisible: true, staleSince: expect.any(Date) });
  });

  it('with workers running, adds one debounced job per learner and subject', async () => {
    setReadinessJobsEnabled(true);
    const add = vi.spyOn(readinessQueue, 'add').mockResolvedValue({} as never);
    await enqueueReadinessRecompute(input());
    expect(add).toHaveBeenCalledWith('readiness:recompute', input(), expect.objectContaining({
      jobId: `rr_${String(room.schoolId)}_${String(thabo.studentId)}_${w.subjectKey}`, delay: 120_000, removeOnComplete: true,
    }));
  });

  it('ignores a subject with no blueprint, and a missing subject', async () => {
    await enqueueReadinessRecompute({ ...input(), subjectId: String(room.mathsLit) });
    await enqueueReadinessRecompute({ ...input(), subjectId: null });
    expect(await LearnerReadiness.countDocuments({ schoolId: room.schoolId, studentId: thabo.studentId })).toBe(1);
  });
});

describe('jobs', () => {
  it('the recompute job computes and clears the stale mark', async () => {
    await runReadinessJob('readiness:recompute', input());
    expect(await LearnerReadiness.findOne({ schoolId: room.schoolId, studentId: thabo.studentId }).lean())
      .toMatchObject({ staleSince: null, core: expect.objectContaining({ answers: 1 }) });
  });

  it('finds every learner with evidence in the family across schools', async () => {
    const bp = await ExamBlueprint.findOne({ subjectKey: w.subjectKey, status: 'published' });
    const keys = (await learnersForBlueprint(bp!)).map((k) => `${String(k.schoolId)}:${String(k.studentId)}`).sort();
    expect(keys).toEqual([`${String(room.schoolId)}:${String(thabo.studentId)}`, `${String(other.schoolId)}:${String(sipho.studentId)}`].sort());
    expect(await learnersForBlueprint(bp!, other.schoolId)).toHaveLength(1);
  });

  it('the nightly run recomputes recent or viewed readiness and leaves old ones alone', async () => {
    const bp = await ExamBlueprint.findOne({ subjectKey: w.subjectKey, status: 'published' });
    await runReadinessJob('readiness:blueprint', { blueprintId: String(bp!._id) });
    const old = new Date(Date.now() - 200 * DAY);
    await LearnerReadiness.updateOne({ schoolId: other.schoolId, studentId: sipho.studentId }, { $set: { lastMarkedAt: old, lastViewedAt: null, staleSince: null } });
    const result = await runNightly(new Date());
    expect(result.recomputed).toBeGreaterThanOrEqual(1);
    const untouched = await LearnerReadiness.findOne({ schoolId: other.schoolId, studentId: sipho.studentId }).lean();
    expect(untouched?.lastMarkedAt?.getTime()).toBe(old.getTime());
  });

  it('refuses an unknown job name', async () => {
    await expect(runReadinessJob('readiness:unknown', {})).rejects.toThrow(/Unknown readiness job/);
  });
});

describe('the school cascade', () => {
  it('soft-deletes a school\'s readiness, snapshots and path items with it', async () => {
    await cascadeSoftDeleteSchool(String(other.schoolId));
    expect(await LearnerReadiness.countDocuments({ schoolId: other.schoolId, isDeleted: false })).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/freshness.test.ts`
Expected: FAIL, with `readinessQueue` not exported from `src/jobs/queues.ts`.

- [ ] **Step 3: Implement**

`src/jobs/queues.ts`, after the last queue:

```ts
export const readinessQueue = new Queue('readiness', {
  connection: redisConnection,
  defaultJobOptions,
});
```

```ts
// src/modules/Readiness/recompute-queue.ts
//
// The recompute contract (ruling RP3). E's final-evidence hook calls enqueueReadinessRecompute with the row's
// school, learner and subject. The stale mark is written always, so a read recomputes even with Redis down; the
// debounced job is added only in a process whose workers run (setupWorkers), so scripts never wait on Redis.
import mongoose from 'mongoose';
import { readinessQueue } from '../../jobs/queues.js';
import { RECOMPUTE_DELAY_MS } from './constants.js';
import { LearnerReadiness } from './model-readiness.js';
import { blueprintData } from './blueprint-service.js';
import { isBlueprintVerified } from './blueprint-validate.js';
import { learnerTarget, subjectFamily } from './blueprint-resolve.js';

export const RECOMPUTE_JOB = 'readiness:recompute';
export const NIGHTLY_JOB = 'readiness:nightly';
export const BLUEPRINT_JOB = 'readiness:blueprint';

let jobsEnabled = false;
export function setReadinessJobsEnabled(on: boolean): void {
  jobsEnabled = on;
}

const valid = (id: string | null): id is string => id !== null && mongoose.Types.ObjectId.isValid(id);
const oid = (id: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(id);

export async function enqueueReadinessRecompute(input: { schoolId: string; studentId: string; subjectId: string | null }): Promise<void> {
  if (!valid(input.schoolId) || !valid(input.studentId) || !valid(input.subjectId)) return;
  const schoolId = oid(input.schoolId);
  const studentId = oid(input.studentId);
  const family = await subjectFamily(schoolId, oid(input.subjectId));
  if (!family?.subjectKey) return;
  const now = new Date();
  const target = await learnerTarget(schoolId, studentId, family.subjectKey, now);
  if (!target) return;
  const bp = blueprintData(target.blueprint);
  await LearnerReadiness.updateOne({ schoolId, studentId, subjectKey: family.subjectKey }, {
    $set: { staleSince: now, isDeleted: false, learnerVisible: isBlueprintVerified(bp), slug: bp.slug, subjectTitle: bp.subjectTitle },
    $setOnInsert: {
      blueprintId: target.blueprint._id, blueprintVersion: 0, examYear: bp.examYear, grade: target.grade, familySubjectIds: target.subjectIds,
      core: null, answers: 0, lastMarkedAt: null, computedAt: null, computedDay: null, target: null, historyVersion: null, lastViewedAt: null,
    },
  }, { upsert: true });
  if (!jobsEnabled) return;
  await readinessQueue.add(RECOMPUTE_JOB, input, {
    jobId: `rr_${input.schoolId}_${input.studentId}_${family.subjectKey}`, delay: RECOMPUTE_DELAY_MS, removeOnComplete: true, removeOnFail: 100,
  });
}

export async function enqueueBlueprintRecompute(blueprintId: string): Promise<void> {
  if (!jobsEnabled) return;
  await readinessQueue.add(BLUEPRINT_JOB, { blueprintId }, { jobId: `rb_${blueprintId}_${Date.now()}`, removeOnComplete: true, removeOnFail: 100 });
}
```

```ts
// src/modules/Readiness/discover.ts
//
// Which learners a blueprint concerns: everyone with final evidence in one of the family's Subjects, school by
// school, plus everyone who already has readiness for it (so a retired blueprint hides theirs).
import mongoose from 'mongoose';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { Subject } from '../Academic/model.js';
import { AnswerEvidence } from '../Evidence/model.js';
import { LearnerReadiness } from './model-readiness.js';
import type { IExamBlueprint } from './model-blueprint.js';
import type { ReadinessKey } from './snapshots.js';
import type { Oid } from './types.js';

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function learnersForBlueprint(bp: IExamBlueprint, schoolId?: Oid): Promise<ReadinessKey[]> {
  const nodes = await CurriculumNode.find({ type: 'subject', code: new RegExp(`^${escape(bp.subjectKey)}-GR\\d{1,2}$`), isDeleted: false }).select('_id').lean();
  const subjects = await Subject.find({
    ...(schoolId ? { schoolId } : {}), isDeleted: false,
    $or: [{ curriculumNodeId: { $in: nodes.map((n) => n._id) } }, { curriculumNodeId: null, name: new RegExp(`^${escape(bp.subjectTitle)}$`, 'i') }],
  }).select('_id schoolId').lean();
  const bySchool = new Map<string, Oid[]>();
  for (const s of subjects) bySchool.set(String(s.schoolId), [...(bySchool.get(String(s.schoolId)) ?? []), s._id as Oid]);
  const keys = new Map<string, ReadinessKey>();
  for (const [school, subjectIds] of bySchool) {
    const sid = new mongoose.Types.ObjectId(school);
    const students = await AnswerEvidence.distinct('studentId', { schoolId: sid, subjectId: { $in: subjectIds }, status: 'final', isDeleted: false });
    for (const studentId of students) keys.set(`${school}:${String(studentId)}`, { schoolId: sid, studentId: studentId as Oid, subjectKey: bp.subjectKey });
  }
  const existing = await LearnerReadiness.find({ subjectKey: bp.subjectKey, isDeleted: false, ...(schoolId ? { schoolId } : {}) }).select('schoolId studentId').lean();
  for (const d of existing) keys.set(`${String(d.schoolId)}:${String(d.studentId)}`, { schoolId: d.schoolId as Oid, studentId: d.studentId as Oid, subjectKey: bp.subjectKey });
  return [...keys.values()];
}
```

```ts
// src/modules/Readiness/jobs.ts
//
// What the `readiness` queue runs. The nightly and blueprint jobs scan across schools (system jobs); every
// recompute they start is scoped to its own school.
import mongoose from 'mongoose';
import { DAY_MS } from './engine/sast.js';
import { NIGHTLY_EVIDENCE_DAYS, NIGHTLY_VIEWED_DAYS, RECOMPUTE_CONCURRENCY } from './constants.js';
import { ExamBlueprint } from './model-blueprint.js';
import { LearnerReadiness } from './model-readiness.js';
import { subjectFamily } from './blueprint-resolve.js';
import { learnersForBlueprint } from './discover.js';
import { BLUEPRINT_JOB, NIGHTLY_JOB, RECOMPUTE_JOB } from './recompute-queue.js';
import { recomputeReadiness } from './service-compute.js';
import type { ReadinessKey } from './snapshots.js';
import type { Oid } from './types.js';

async function inBatches<T>(items: readonly T[], size: number, run: (item: T) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(run));
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const idOf = (v: unknown): mongoose.Types.ObjectId | null =>
  typeof v === 'string' && mongoose.Types.ObjectId.isValid(v) ? new mongoose.Types.ObjectId(v) : null;

export async function runNightly(now: Date): Promise<{ recomputed: number }> {
  const docs = await LearnerReadiness.find({
    isDeleted: false,
    $or: [
      { lastMarkedAt: { $gte: new Date(now.getTime() - NIGHTLY_EVIDENCE_DAYS * DAY_MS) } },
      { lastViewedAt: { $gte: new Date(now.getTime() - NIGHTLY_VIEWED_DAYS * DAY_MS) } },
      { staleSince: { $ne: null } },
    ],
  }).select('schoolId studentId subjectKey').lean();
  const keys: ReadinessKey[] = docs.map((d) => ({ schoolId: d.schoolId as Oid, studentId: d.studentId as Oid, subjectKey: d.subjectKey }));
  await inBatches(keys, RECOMPUTE_CONCURRENCY, (k) => recomputeReadiness(k, now));
  return { recomputed: keys.length };
}

export async function recomputeFamily(blueprintId: string, now: Date, schoolId?: Oid): Promise<{ learners: number; visible: number }> {
  const bp = await ExamBlueprint.findOne({ _id: blueprintId, isDeleted: false });
  if (!bp) return { learners: 0, visible: 0 };
  const keys = await learnersForBlueprint(bp, schoolId);
  let visible = 0;
  await inBatches(keys, RECOMPUTE_CONCURRENCY, async (k) => {
    const r = await recomputeReadiness(k, now);
    if (r?.doc.learnerVisible) visible += 1;
  });
  return { learners: keys.length, visible };
}

export async function runReadinessJob(name: string, data: unknown, now: Date = new Date()): Promise<Record<string, number>> {
  if (name === RECOMPUTE_JOB && isRecord(data)) {
    const [schoolId, studentId, subjectId] = [idOf(data.schoolId), idOf(data.studentId), idOf(data.subjectId)];
    if (!schoolId || !studentId || !subjectId) return { recomputed: 0 };
    const family = await subjectFamily(schoolId, subjectId);
    if (!family?.subjectKey) return { recomputed: 0 };
    return { recomputed: (await recomputeReadiness({ schoolId, studentId, subjectKey: family.subjectKey }, now)) ? 1 : 0 };
  }
  if (name === NIGHTLY_JOB) return runNightly(now);
  if (name === BLUEPRINT_JOB && isRecord(data) && typeof data.blueprintId === 'string') return recomputeFamily(data.blueprintId, now);
  throw new Error(`Unknown readiness job ${name}`);
}
```

```ts
// src/jobs/readiness.job.ts
import { Worker, type Job } from 'bullmq';
import { logger } from '../common/logger.js';
import { readinessQueue, redisConnection } from './queues.js';

export function createReadinessWorker(): Worker {
  const worker = new Worker('readiness', async (job: Job) => {
    const { runReadinessJob } = await import('../modules/Readiness/jobs.js');
    return runReadinessJob(job.name, job.data);
  }, { connection: redisConnection, concurrency: 2 });
  worker.on('failed', (job, err) => {
    logger.error(`[Readiness] ${job?.name ?? 'job'} ${job?.id ?? ''} failed: ${err.message}`);
  });
  return worker;
}

/** 01:00 UTC = 03:00 SAST, after E's evidence reconcile (00:30 UTC). */
export async function scheduleReadinessNightly(): Promise<void> {
  await readinessQueue.add('readiness:nightly', {}, { repeat: { pattern: '0 1 * * *' } });
  logger.info('[Readiness] Nightly recompute scheduled');
}
```

`src/jobs/index.ts`:
- After `workers.push(createCourseGenerationWorker());`, add:

```ts
    const { createReadinessWorker } = await import('./readiness.job.js');
    workers.push(createReadinessWorker());
    const { setReadinessJobsEnabled } = await import('../modules/Readiness/recompute-queue.js');
    setReadinessJobsEnabled(true);
```

- After `await scheduleLostFoundArchive();`, add:

```ts
    const { scheduleReadinessNightly } = await import('./readiness.job.js');
    await scheduleReadinessNightly();
```

`src/common/utils.ts`: add `'LearnerReadiness'`, `'ReadinessSnapshot'` and `'PathItem'` to the `collections` list of `cascadeSoftDeleteSchool`. The test file imports `model-path.js`, so all three models are registered before the cascade runs.

```ts
// src/scripts/readiness-recompute.ts
//
// npm run readiness:recompute -- (--blueprint=<id> | --school=<id>) [--apply]
// Dry run by default: how many learners would be (re)computed. --apply recomputes them (no AI involved).
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { ExamBlueprint } from '../modules/Readiness/model-blueprint.js';
import { learnersForBlueprint } from '../modules/Readiness/discover.js';
import { recomputeFamily } from '../modules/Readiness/jobs.js';

function arg(name: string): string | undefined {
  const hit = process.argv.find((a: string) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function main(): Promise<void> {
  const blueprintArg = arg('blueprint');
  const schoolArg = arg('school');
  if (!blueprintArg && !schoolArg) throw new Error('Usage: npm run readiness:recompute -- (--blueprint=<id> | --school=<id>) [--apply]');
  await mongoose.connect(config.mongodb.uri);
  const school = schoolArg ? new mongoose.Types.ObjectId(schoolArg) : undefined;
  const blueprints = blueprintArg
    ? await ExamBlueprint.find({ _id: blueprintArg, isDeleted: false })
    : await ExamBlueprint.find({ status: 'published', isDeleted: false });
  for (const bp of blueprints) {
    if (process.argv.includes('--apply')) {
      console.log(bp.family, bp.examYear, await recomputeFamily(String(bp._id), new Date(), school));
    } else {
      console.log(bp.family, bp.examYear, `${(await learnersForBlueprint(bp, school)).length} learners (dry run; add --apply)`);
    }
  }
  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

Add `"readiness:recompute": "tsx src/scripts/readiness-recompute.ts"` to `package.json`.

- [ ] **Step 4: Run it to verify it passes**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Readiness src/jobs src/common/utils.ts src/scripts/readiness-recompute.ts package.json
LANE_SWEEP_OK=1 git commit -m "feat(readiness): the readiness:recompute contract, a debounced queue job, the nightly run, recompute on publish, and readiness:recompute" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: [needs E-hook] Wire E's final-evidence hook to `enqueueReadinessRecompute`**

This step waits for E's report that names its hook.

**If E's report says E calls R's function,** E adds the call itself, and this step is only a check. Run:

`grep -rn "enqueueReadinessRecompute" src/modules/Evidence`

Expected: one call, after a write of final rows, inside `safeEvidence`.

**If E's report says R wires it into E's writer,** add the following to `src/modules/Evidence/write-rows.ts`:

```ts
import { enqueueReadinessRecompute } from '../Readiness/recompute-queue.js';
```

Put the call at the end of `writeEvidenceRows`, just before `return result;`, after the soft-delete:

```ts
  if (record.status === 'final' && result.written + result.updated + result.removed > 0) {
    await safeEvidence('readiness', () => enqueueReadinessRecompute({
      schoolId: String(record.schoolId), studentId: String(record.studentId), subjectId: record.subjectId ? String(record.subjectId) : null,
    }));
  }
```

Test it in `src/modules/Readiness/__tests__/freshness.test.ts`:

```ts
it('a final evidence write marks the learner\'s readiness stale (E hook)', async () => {
  const { writeEvidenceRows } = await import('../../Evidence/write-rows.js');
  await LearnerReadiness.updateOne({ schoolId: room.schoolId, studentId: thabo.studentId }, { $set: { staleSince: null } });
  await writeEvidenceRows({
    schoolId: room.schoolId, studentId: thabo.studentId, userId: thabo.userId, classId: room.g12.id, subjectId: room.maths12, gradeId: room.grade12,
    source: { type: 'homework', channel: null, recordId: new mongoose.Types.ObjectId(), parentId: new mongoose.Types.ObjectId(), attemptNumber: 1 },
    markedAt: new Date(), status: 'final', finalAt: new Date(), totalOverridden: false,
  }, [{ itemKey: 'a', position: 0, questionKey: 'q:hook', questionId: null, nodeId: w.nodes.FUNC12, topicFrom: 'question', cognitiveLevel: 'routine',
    marksAwarded: 1, marksAvailable: 2, answerText: 'x', answerKind: 'typed', markedBy: 'deterministic', markerNote: '' }]);
  expect((await LearnerReadiness.findOne({ schoolId: room.schoolId, studentId: thabo.studentId }).lean())?.staleSince).toBeInstanceOf(Date);
});
```

If E names a different entry point, call `enqueueReadinessRecompute` from it with the same payload, and point this test at that entry point. Then run the Readiness and Evidence suites and commit:

```bash
LANE_SWEEP_OK=1 git commit -am "feat(readiness): E's final evidence marks the learner's readiness stale and queues a recompute" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Phase R-C — APIs

### Task 10: the learner APIs and the `/auth/me` readiness flag [needs E-17]

**Files:**
- Create: `src/modules/Readiness/views.ts`, `src/modules/Readiness/service-learner.ts`, `src/modules/Readiness/controller-learner.ts`, `src/modules/Readiness/validation.ts`, `src/modules/Readiness/routes.ts`, `src/modules/Auth/readiness-flag.ts`
- Modify: `src/app.ts` (import and mount `/api/readiness` after `/api/evidence`), `src/modules/Auth/controller.ts` (`readiness` on the user in login, `getMe` and `registerStudent`), `src/modules/Readiness/snapshots.ts` (`TrendPoint.papers` carries `{ low, high, mid }`)
- Test: `src/modules/Readiness/__tests__/learner-api.test.ts`, `src/modules/Auth/__tests__/readiness-flag.test.ts`

**Interfaces:**
- Consumes: **E-17** `meAsLearner(user): Promise<{ schoolId: Oid; studentId: Oid }>` (`src/modules/Evidence/access.ts`); Task 7 (`ensureFresh`, `LearnerReadiness`, `trendOf`); Task 8 (`weekItems`, `toPathItemView`, `PathItemView`); Task 5 (`nscLevel`); `getUser` (`src/types/authenticated-request.ts`); `apiResponse` (`src/common/utils.ts`); `authorize` and `validate`.
- Produces:
  - `interface PaperView`, `interface TopicView`, `interface ReadinessView`, `interface SubjectCard`
  - `learnerView(doc: ILearnerReadiness, items: readonly PathItemView[]): ReadinessView`, `teacherView(doc: ILearnerReadiness, items: readonly PathItemView[], verified: boolean): ReadinessView`
  - `myReadiness(me, now): Promise<{ subjects: SubjectCard[]; next: (PathItemView & { slug: string; subjectTitle: string }) | null }>`
  - `mySubject(me, slug, now): Promise<ReadinessView>`, `myTrend(me, slug, weeks, now): Promise<TrendPoint[]>`, `setMyTarget(me, slug, percent: number | null): Promise<void>`
  - `readinessFlag(user: { _id: unknown; role: string; schoolId?: unknown }): Promise<boolean>`
  - Routes: `GET /api/readiness/me`, `GET /api/readiness/me/subjects/:slug`, `GET /api/readiness/me/subjects/:slug/trend?weeks=`, `PUT /api/readiness/me/subjects/:slug/target`

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/Readiness/__tests__/learner-api.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../app.js';
import { MisconceptionType } from '../../Evidence/model-taxonomy.js';
import { ExamBlueprint } from '../model-blueprint.js';
import { LearnerReadiness, ReadinessSnapshot } from '../model-readiness.js';
import { PathItem } from '../model-path.js';
import { cleanUpClassrooms, type Learner } from '../../../test-utils/standalone-classroom.js';
import {
  cleanUpReadiness, evidence, grade12Learner, makeCurriculum, publishFixture, readinessRoom, type ReadinessRoom, type ReadinessWorld,
} from '../../../test-utils/readiness-fixture.js';

const YEAR = new Date(Date.now() + 2 * 3600_000).getUTCFullYear();
const DAY = 86_400_000;
let w: ReadinessWorld;
let draftWorld: ReadinessWorld;
let room: ReadinessRoom;
let draftRoom: ReadinessRoom;
let thabo: Learner;
let nomsa: Learner;
let slug: string;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await Promise.all([ExamBlueprint.syncIndexes(), LearnerReadiness.syncIndexes(), ReadinessSnapshot.syncIndexes(), PathItem.syncIndexes()]);
  w = await makeCurriculum();
  draftWorld = await makeCurriculum();
  room = await readinessRoom(w);
  draftRoom = await readinessRoom(draftWorld);
  const bp = await publishFixture(w, { verified: true, examYear: YEAR, examDates: [`${YEAR}-12-01`, `${YEAR}-12-04`] });
  slug = bp.slug;
  await publishFixture(draftWorld, { verified: false, examYear: YEAR });
  thabo = await grade12Learner(room, 'Thabo');
  nomsa = await grade12Learner(draftRoom, 'Nomsa');
  const shown = await MisconceptionType.create({ code: `${w.prefix}.shown`, kind: 'misconception', topicNodeId: w.nodes.FUNC12, label: 'Domain not restricted on inverse', learnerLabel: "Didn't restrict the domain", description: 'd', status: 'seeded', origin: 'ai_seed', learnerVisible: true });
  const hidden = await MisconceptionType.create({ code: `${w.prefix}.hidden`, kind: 'misconception', topicNodeId: w.nodes.FUNC12, label: 'Teacher-only type', learnerLabel: 'Hidden', description: 'd', status: 'seeded', origin: 'ai_seed', learnerVisible: false });
  for (let i = 0; i < 24; i += 1) {
    await evidence(room, thabo, {
      topicNodeId: i % 2 ? w.nodes.FUNC12 : w.nodes.CALC12, marksAwarded: i % 3 ? 2 : 0, marksAvailable: 2, markedAt: new Date(Date.now() - (i + 1) * 3600_000),
      diagnosis: i === 1 ? { state: 'ready', typeId: shown._id, confidence: 0.9 } : i === 3 ? { state: 'ready', typeId: hidden._id, confidence: 0.9 } : i === 5 ? { state: 'ready', typeId: shown._id, confidence: 0.4 } : {},
    });
    await evidence(draftRoom, nomsa, { topicNodeId: draftWorld.nodes.FUNC12, subjectId: draftRoom.maths12, markedAt: new Date(Date.now() - (i + 1) * DAY / 24) });
  }
  await LearnerReadiness.create([
    { schoolId: room.schoolId, studentId: thabo.studentId, subjectKey: w.subjectKey, slug, subjectTitle: 'Mathematics', examYear: YEAR, grade: 12, learnerVisible: true, staleSince: new Date() },
    { schoolId: draftRoom.schoolId, studentId: nomsa.studentId, subjectKey: draftWorld.subjectKey, slug: `m${draftWorld.prefix.toLowerCase()}`, subjectTitle: 'Mathematics', examYear: YEAR, grade: 12, staleSince: new Date() },
  ]);
});
afterAll(async () => {
  await MisconceptionType.deleteMany({ code: new RegExp(`^(${w.prefix}|${draftWorld.prefix})\\.`) });
  await Promise.all([cleanUpReadiness(w), cleanUpReadiness(draftWorld)]);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

const as = (l: Learner) => ({ Authorization: `Bearer ${l.token}` });

describe('GET /api/readiness/me/subjects/:slug', () => {
  it('shows the learner percentages and NSC levels, never marks, and only learner-safe reasons', async () => {
    const res = await request(app).get(`/api/readiness/me/subjects/${slug}`).set(as(thabo)).expect(200);
    const p1 = res.body.data.papers[0];
    expect(p1.state).toBe('predicted');
    expect(Object.keys(p1.band).sort()).toEqual(['high', 'low']);
    expect(p1.levelRange).toEqual({ low: expect.any(Number), high: expect.any(Number) });
    expect(p1).not.toHaveProperty('predictedMarks');
    expect(p1).not.toHaveProperty('adjustmentMarks');
    const func = p1.topics.find((t: { key: string }) => t.key === 'P1.FUNC');
    expect(func).not.toHaveProperty('effectiveAnswers');
    expect(func).not.toHaveProperty('bySource');
    expect(func.misconceptions).toEqual([expect.objectContaining({ label: "Didn't restrict the domain", count: 1 })]);
    expect(res.body.data.blueprint.verified).toBe(true);
    expect(res.body.data.target).toMatchObject({ kind: 'next_level' });
    expect(res.body.data.path.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body.data)).not.toMatch(/Teacher-only type|lowMarks|highMarks/);
  });

  it('answers 404 for a subject the learner has no readiness in', async () => {
    await request(app).get('/api/readiness/me/subjects/history').set(as(thabo)).expect(404);
  });
});

describe('an unverified published blueprint reaches no learner surface', () => {
  it('404 on the subject, nothing in the list, no next item, and the /auth/me flag is false', async () => {
    await request(app).get(`/api/readiness/me/subjects/m${draftWorld.prefix.toLowerCase()}`).set(as(nomsa)).expect(404);
    const me = await request(app).get('/api/readiness/me').set(as(nomsa)).expect(200);
    expect(me.body.data).toEqual({ subjects: [], next: null });
    const auth = await request(app).get('/api/auth/me').set(as(nomsa)).expect(200);
    expect(auth.body.data.user.readiness).toBe(false);
  });
});

describe('GET /api/readiness/me', () => {
  it('lists the learner\'s subjects with bands and levels, and the one next item for Today', async () => {
    const res = await request(app).get('/api/readiness/me').set(as(thabo)).expect(200);
    expect(res.body.data.subjects).toEqual([expect.objectContaining({ slug, subjectTitle: 'Mathematics' })]);
    expect(res.body.data.next).toMatchObject({ slug, subjectTitle: 'Mathematics', state: 'open', rank: 1 });
    const auth = await request(app).get('/api/auth/me').set(as(thabo)).expect(200);
    expect(auth.body.data.user.readiness).toBe(true);
  });
});

describe('target and trend', () => {
  it('takes an NSC boundary or null, and refuses anything else', async () => {
    await request(app).put(`/api/readiness/me/subjects/${slug}/target`).set(as(thabo)).send({ percent: 45 }).expect(400);
    await request(app).put(`/api/readiness/me/subjects/${slug}/target`).set(as(thabo)).send({ percent: 70 }).expect(204);
    const mine = await request(app).get(`/api/readiness/me/subjects/${slug}`).set(as(thabo)).expect(200);
    expect(mine.body.data.target).toEqual({ percent: 70, kind: 'mine' });
    await request(app).put(`/api/readiness/me/subjects/${slug}/target`).set(as(thabo)).send({ percent: null }).expect(204);
  });

  it('gives weekly points with each paper\'s range', async () => {
    const res = await request(app).get(`/api/readiness/me/subjects/${slug}/trend?weeks=12`).set(as(thabo)).expect(200);
    expect(res.body.data.points.at(-1).papers.P1).toEqual({ low: expect.any(Number), high: expect.any(Number), mid: expect.any(Number) });
    await request(app).get(`/api/readiness/me/subjects/${slug}/trend?weeks=99`).set(as(thabo)).expect(400);
  });

  it('refuses a teacher on the learner routes', async () => {
    await request(app).get('/api/readiness/me').set({ Authorization: `Bearer ${room.teacherToken}` }).expect(403);
  });
});
```

```ts
// src/modules/Auth/__tests__/readiness-flag.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { Class } from '../../Academic/model.js';
import { ExamBlueprint } from '../../Readiness/model-blueprint.js';
import { readinessFlag } from '../readiness-flag.js';
import { classroomCode, cleanUpClassrooms } from '../../../test-utils/standalone-classroom.js';
import { cleanUpReadiness, makeCurriculum, publishFixture, readinessRoom, type ReadinessRoom, type ReadinessWorld } from '../../../test-utils/readiness-fixture.js';

let w: ReadinessWorld;
let room: ReadinessRoom;
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await ExamBlueprint.syncIndexes();
  w = await makeCurriculum();
  room = await readinessRoom(w);
});
afterAll(async () => {
  await cleanUpReadiness(w);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

describe('readinessFlag for teachers', () => {
  it('is true for a teacher of a Grade 12 class once a Grade 12 blueprint is published', async () => {
    await publishFixture(w, { verified: false });
    expect(await readinessFlag({ _id: room.teacherId, role: 'teacher', schoolId: room.schoolId })).toBe(true);
  });

  it('is false for a teacher whose classes are all Grade 10', async () => {
    const other = new mongoose.Types.ObjectId();
    await Class.collection.insertOne({ schoolId: room.schoolId, name: 'G10', gradeId: room.grade10, teacherId: other, capacity: 30, classroomCode: classroomCode(), isHomeroom: false, isDeleted: false });
    expect(await readinessFlag({ _id: other, role: 'teacher', schoolId: room.schoolId })).toBe(false);
  });

  it('is false for other roles', async () => {
    expect(await readinessFlag({ _id: room.teacherId, role: 'parent', schoolId: room.schoolId })).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/learner-api.test.ts src/modules/Auth/__tests__/readiness-flag.test.ts`
Expected: FAIL, with `404` on `/api/readiness/me/subjects/…` (no route yet) and `Cannot find module '../readiness-flag.js'`.

- [ ] **Step 3: Implement the views**

In `src/modules/Readiness/snapshots.ts`, change `TrendPoint.papers` to `Record<string, { low: number | null; high: number | null; mid: number | null } | null>`. In `trendOf`, change the map to `papers: Object.fromEntries(s.papers.map((p) => [p.key, { low: p.low, high: p.high, mid: p.mid }]))`. Task 7's trend test keeps passing with `typeof points.at(-1)?.papers.P1?.mid`, so change that one assertion to read `.mid`.

```ts
// src/modules/Readiness/views.ts
//
// What each audience may see (spec §6, decided §12.3). The learner: percentages and NSC levels, never marks;
// misconceptions only learner-visible, under learner labels; the learner's explanation. The teacher: everything.
import type { ILearnerReadiness } from './model-readiness.js';
import type { PathItemView } from './path-service.js';
import { nscLevel } from './engine/target.js';
import type { Band, LevelResult, PaperResult, TopicResult } from './types.js';

export interface TopicView extends Omit<TopicResult, 'effectiveAnswers' | 'bySource' | 'misconceptions'> {
  misconceptions: Array<{ typeId: string; label: string; count: number; lastSeenAt: string }>;
  effectiveAnswers?: number; bySource?: TopicResult['bySource'];
}
export interface PaperView {
  key: string; title: string; totalMarks: number; durationMinutes: number; examDate: string | null; state: PaperResult['state'];
  band: Partial<Band> & { low: number; high: number } | null; levelRange: { low: number; high: number } | null;
  gate: PaperResult['gate']; levels: LevelResult[]; explanation: string[]; topics: TopicView[];
  predictedMarks?: number; adjustmentMarks?: number | null;
}
export interface ReadinessView {
  subject: { slug: string; title: string; grade: number };
  blueprint: { id: string; examYear: number; version: number; verified: boolean };
  computedAt: string | null; answers: number; unmappedAnswers: number;
  target: { percent: number; kind: 'mine' | 'next_level' } | null;
  papers: PaperView[]; both: { band: { low: number; high: number } & Partial<Band>; levelRange: { low: number; high: number } } | null;
  path: PathItemView[];
}
export interface SubjectCard {
  slug: string; subjectTitle: string; grade: number;
  papers: Array<{ key: string; title: string; examDate: string | null; state: PaperResult['state']; band: { low: number; high: number } | null; levelRange: { low: number; high: number } | null }>;
}

const levels = (b: { low: number; high: number } | null) => (b ? { low: nscLevel(b.low), high: nscLevel(b.high) } : null);

function topicFor(t: TopicResult, teacher: boolean): TopicView {
  const { effectiveAnswers, bySource, misconceptions, ...rest } = t;
  const shown = teacher ? misconceptions : misconceptions.filter((m) => m.learnerVisible);
  return {
    ...rest,
    misconceptions: shown.map((m) => ({ typeId: m.typeId, label: teacher ? m.label : m.learnerLabel, count: m.count, lastSeenAt: m.lastSeenAt })),
    ...(teacher ? { effectiveAnswers, bySource } : {}),
  };
}

function paperFor(p: PaperResult, teacher: boolean): PaperView {
  const band = p.band ? (teacher ? p.band : { low: p.band.low, high: p.band.high }) : null;
  return {
    key: p.key, title: p.title, totalMarks: p.totalMarks, durationMinutes: p.durationMinutes, examDate: p.examDate, state: p.state,
    band, levelRange: levels(p.band), gate: p.gate, levels: p.levels,
    explanation: teacher ? p.explanation.teacher : p.explanation.learner, topics: p.topics.map((t) => topicFor(t, teacher)),
    ...(teacher ? { predictedMarks: p.predictedMarks, adjustmentMarks: p.adjustmentMarks } : {}),
  };
}

function viewFor(doc: ILearnerReadiness, items: readonly PathItemView[], teacher: boolean, verified: boolean): ReadinessView {
  const core = doc.core;
  const target = doc.target ?? core?.defaultTarget ?? null;
  return {
    subject: { slug: doc.slug, title: doc.subjectTitle, grade: doc.grade },
    blueprint: { id: String(doc.blueprintId ?? ''), examYear: doc.examYear, version: doc.blueprintVersion, verified },
    computedAt: doc.computedAt?.toISOString() ?? null, answers: core?.answers ?? 0, unmappedAnswers: core?.unmappedAnswers ?? 0,
    target: target === null ? null : { percent: target, kind: doc.target !== null ? 'mine' : 'next_level' },
    papers: (core?.papers ?? []).map((p) => paperFor(p, teacher)),
    both: core?.both?.band
      ? { band: teacher ? core.both.band : { low: core.both.band.low, high: core.both.band.high }, levelRange: levels(core.both.band)! }
      : null,
    path: [...items],
  };
}

export const learnerView = (doc: ILearnerReadiness, items: readonly PathItemView[]): ReadinessView => viewFor(doc, items, false, true);
export const teacherView = (doc: ILearnerReadiness, items: readonly PathItemView[], verified: boolean): ReadinessView => viewFor(doc, items, true, verified);

export function subjectCard(doc: ILearnerReadiness): SubjectCard {
  return {
    slug: doc.slug, subjectTitle: doc.subjectTitle, grade: doc.grade,
    papers: (doc.core?.papers ?? []).map((p) => {
      const band = p.band ? { low: p.band.low, high: p.band.high } : null;
      return { key: p.key, title: p.title, examDate: p.examDate, state: p.state, band, levelRange: levels(band) };
    }),
  };
}
```

- [ ] **Step 4: Implement the learner service, controller, validation and routes**

```ts
// src/modules/Readiness/service-learner.ts
//
// The learner's readiness (spec §6.1). Only readiness on a verified blueprint is ever returned (ruling RP7).
import { NotFoundError } from '../../common/errors.js';
import { LearnerReadiness, type ILearnerReadiness } from './model-readiness.js';
import { ensureFresh } from './service-compute.js';
import { trendOf, type TrendPoint } from './snapshots.js';
import { toPathItemView, weekItems, type PathItemView } from './path-service.js';
import { learnerView, subjectCard, type ReadinessView, type SubjectCard } from './views.js';
import type { Oid } from './types.js';

export interface Me { schoolId: Oid; studentId: Oid }

async function visible(me: Me, slug: string, now: Date): Promise<ILearnerReadiness> {
  const doc = await LearnerReadiness.findOne({ ...me, slug, isDeleted: false }).select('subjectKey').lean();
  if (!doc) throw new NotFoundError('No readiness for this subject yet');
  const fresh = await ensureFresh({ ...me, subjectKey: doc.subjectKey }, now);
  if (!fresh?.learnerVisible || !fresh.core) throw new NotFoundError('No readiness for this subject yet');
  return fresh;
}

export async function myReadiness(me: Me, now: Date): Promise<{ subjects: SubjectCard[]; next: (PathItemView & { slug: string; subjectTitle: string }) | null }> {
  const docs = await LearnerReadiness.find({ ...me, learnerVisible: true, isDeleted: false }).select('subjectKey').lean();
  const subjects: SubjectCard[] = [];
  let next: (PathItemView & { slug: string; subjectTitle: string }) | null = null;
  for (const d of docs) {
    const key = { ...me, subjectKey: d.subjectKey };
    const fresh = await ensureFresh(key, now);
    if (!fresh?.learnerVisible || !fresh.core) continue;
    subjects.push(subjectCard(fresh));
    const open = (await weekItems(key, now)).filter((i) => i.state === 'open' || i.state === 'started').map(toPathItemView);
    const top = open.sort((a, b) => b.score - a.score)[0];
    if (top && (!next || top.score > next.score)) next = { ...top, slug: fresh.slug, subjectTitle: fresh.subjectTitle };
  }
  return { subjects, next };
}

export async function mySubject(me: Me, slug: string, now: Date): Promise<ReadinessView> {
  const doc = await visible(me, slug, now);
  await LearnerReadiness.updateOne({ _id: doc._id }, { $set: { lastViewedAt: now } });
  const items = await weekItems({ ...me, subjectKey: doc.subjectKey }, now);
  return learnerView(doc, items.map(toPathItemView));
}

export async function myTrend(me: Me, slug: string, weeks: number, now: Date): Promise<TrendPoint[]> {
  const doc = await visible(me, slug, now);
  return trendOf({ ...me, subjectKey: doc.subjectKey }, weeks, now);
}

export async function setMyTarget(me: Me, slug: string, percent: number | null): Promise<void> {
  const res = await LearnerReadiness.updateOne({ ...me, slug, learnerVisible: true, isDeleted: false }, { $set: { target: percent } });
  if (res.matchedCount === 0) throw new NotFoundError('No readiness for this subject yet');
}
```

```ts
// src/modules/Readiness/validation.ts
import { z } from 'zod/v4';
import { objectIdSchema } from '../../common/validation.js';

const slug = z.string().regex(/^[a-z0-9-]{2,40}$/);
export const slugParams = z.object({ slug });
export const trendQuery = z.object({ weeks: z.coerce.number().int().min(1).max(26).default(12) });
export const targetBody = z.object({ percent: z.union([z.literal(30), z.literal(40), z.literal(50), z.literal(60), z.literal(70), z.literal(80), z.null()]) }).strict();
export const itemParams = z.object({ itemId: objectIdSchema });
```

```ts
// src/modules/Readiness/controller-learner.ts
import type { Request, Response } from 'express';
import { apiResponse } from '../../common/utils.js';
import { getUser } from '../../types/authenticated-request.js';
import { meAsLearner } from '../Evidence/access.js';
import { myReadiness, mySubject, myTrend, setMyTarget } from './service-learner.js';

export const LearnerController = {
  async me(req: Request, res: Response): Promise<void> {
    res.json(apiResponse(true, await myReadiness(await meAsLearner(getUser(req)), new Date())));
  },
  async subject(req: Request, res: Response): Promise<void> {
    res.json(apiResponse(true, await mySubject(await meAsLearner(getUser(req)), req.params.slug as string, new Date())));
  },
  async trend(req: Request, res: Response): Promise<void> {
    const weeks = Number((req.query as { weeks?: number }).weeks ?? 12);
    res.json(apiResponse(true, { points: await myTrend(await meAsLearner(getUser(req)), req.params.slug as string, weeks, new Date()) }));
  },
  async target(req: Request, res: Response): Promise<void> {
    await setMyTarget(await meAsLearner(getUser(req)), req.params.slug as string, (req.body as { percent: number | null }).percent);
    res.status(204).end();
  },
};
```

```ts
// src/modules/Readiness/routes.ts
//
// /api/readiness (spec §6). Mounted behind `authenticate`; every route names its roles; no capability keys (ruling RP14).
import { Router } from 'express';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { LearnerController } from './controller-learner.js';
import { slugParams, targetBody, trendQuery } from './validation.js';

const router = Router();
const learner = authorize('student');

router.get('/me', learner, LearnerController.me);
router.get('/me/subjects/:slug', learner, validate({ params: slugParams }), LearnerController.subject);
router.get('/me/subjects/:slug/trend', learner, validate({ params: slugParams, query: trendQuery }), LearnerController.trend);
router.put('/me/subjects/:slug/target', learner, validate({ params: slugParams, body: targetBody }), LearnerController.target);

export default router;
```

`src/app.ts`: add `import readinessRoutes from './modules/Readiness/routes.js';` beside `evidenceRoutes`, and `app.use('/api/readiness', authenticate, readinessRoutes);` on the line after `app.use('/api/evidence', authenticate, evidenceRoutes);`.

- [ ] **Step 5: Implement the flag**

```ts
// src/modules/Auth/readiness-flag.ts
//
// `user.readiness` on /auth/me (ruling RP9): a learner with readiness on a verified blueprint; a teacher with a
// class in a grade that has a published blueprint. Everyone else: false.
import mongoose from 'mongoose';
import { Class } from '../Academic/model.js';
import { Student } from '../Student/model.js';
import { ExamBlueprint } from '../Readiness/model-blueprint.js';
import { LearnerReadiness } from '../Readiness/model-readiness.js';
import { gradeNumberFor } from '../Readiness/blueprint-resolve.js';

const asId = (v: unknown): mongoose.Types.ObjectId | null =>
  v && mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null;

export async function readinessFlag(user: { _id: unknown; role: string; schoolId?: unknown }): Promise<boolean> {
  const schoolId = asId(user.schoolId);
  const userId = asId(user._id);
  if (!schoolId || !userId) return false;
  if (user.role === 'student') {
    const student = await Student.findOne({ userId, schoolId, isDeleted: false }).select('_id').lean();
    if (!student) return false;
    return (await LearnerReadiness.exists({ schoolId, studentId: student._id, learnerVisible: true, isDeleted: false })) !== null;
  }
  if (user.role !== 'teacher') return false;
  const grades = (await ExamBlueprint.distinct('grade', { status: 'published', isDeleted: false })) as number[];
  if (grades.length === 0) return false;
  const classes = await Class.find({ schoolId, teacherId: userId, isDeleted: false }).select('gradeId').lean();
  for (const gradeId of new Set(classes.map((c) => String(c.gradeId)))) {
    const grade = await gradeNumberFor(schoolId, new mongoose.Types.ObjectId(gradeId));
    if (grade !== null && grades.includes(grade)) return true;
  }
  return false;
}
```

`src/modules/Auth/controller.ts`: import `readinessFlag` from `./readiness-flag.js`. In each of the three places that build `{ ...…, isStandaloneLearner: standaloneLearner }` (login `:32-34`, `getMe` `:183-186`, `registerStudent` `:200-202`), compute `const readiness = await readinessFlag(user);` beside `standaloneLearner`. Then add `readiness` to the user object, e.g. `user: { ...user.toJSON(), isStandaloneLearner: standaloneLearner, readiness }`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness src/modules/Auth && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.

- [ ] **Step 7: Commit**

```bash
git add src/modules/Readiness src/modules/Auth src/app.ts
LANE_SWEEP_OK=1 git commit -m "feat(readiness): the learner's readiness API (bands and NSC levels, never marks; verified blueprints only) and user.readiness on /auth/me" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: practice started from the path [needs E-8]

**Files:**
- Create: `src/modules/Readiness/path-start.ts`
- Modify: `src/modules/AITutor/practice.service.ts` (`generatePractice(userId, schoolId, input, options = {})`), `src/modules/AITutor/model.ts` (`pathItemId` on `IPracticeAttempt` and its schema), `src/modules/Readiness/controller-learner.ts` (`start`), `src/modules/Readiness/routes.ts` (`POST /me/path/:itemId/start`)
- Test: `src/modules/Readiness/__tests__/path-start.test.ts`

**Interfaces:**
- Consumes: **E-8** `curriculumNodeId?: string` on `GeneratePracticeInput` (`src/modules/AITutor/validation.ts`) and on `PracticeAttempt`; `withLearnerAIAllowance`, `learnerAIActorFor` (`src/modules/subscription/learner-ai.ts:64, 96`); `PracticeService` (`src/modules/AITutor/practice.service.ts:147`); Task 8 (`PathItem`); constants (`PRACTICE_QUESTIONS`).
- Produces:
  - `interface PracticeOptions { focus?: { label: string; description: string }; pathItemId?: string }`
  - `startPathItem(me: Me, userId: string, actor: LearnerAIActor, itemId: string, now: Date): Promise<IPracticeAttempt>`
  - Route: `POST /api/readiness/me/path/:itemId/start` → 201 with the practice attempt (the same shape as `POST /api/ai-tutor/practice`)

- [ ] **Step 1: Write the failing test**

```ts
// src/modules/Readiness/__tests__/path-start.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../app.js';
import { AIService } from '../../../services/ai.service.js';
import { AIUsage } from '../../subscription/ai-usage.model.js';
import { MisconceptionType } from '../../Evidence/model-taxonomy.js';
import { ExamBlueprint } from '../model-blueprint.js';
import { LearnerReadiness } from '../model-readiness.js';
import { PathItem } from '../model-path.js';
import { cleanUpClassrooms, type Learner } from '../../../test-utils/standalone-classroom.js';
import {
  cleanUpReadiness, evidence, grade12Learner, makeCurriculum, publishFixture, readinessRoom, type ReadinessRoom, type ReadinessWorld,
} from '../../../test-utils/readiness-fixture.js';

const YEAR = new Date(Date.now() + 2 * 3600_000).getUTCFullYear();
let w: ReadinessWorld;
let room: ReadinessRoom;
let thabo: Learner;
let lebo: Learner;
let itemId: string;
const questions = Array.from({ length: 5 }, (_: unknown, i: number) => ({
  questionText: `Q${i + 1}: find the inverse of f(x) = 2x + ${i}`, questionType: 'short_answer', correctAnswer: 'x', explanation: 'Swap and solve.', marks: 2,
}));

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await Promise.all([ExamBlueprint.syncIndexes(), LearnerReadiness.syncIndexes(), PathItem.syncIndexes()]);
  w = await makeCurriculum();
  room = await readinessRoom(w);
  const bp = await publishFixture(w, { verified: true, examYear: YEAR, examDates: [`${YEAR}-12-01`, `${YEAR}-12-04`] });
  thabo = await grade12Learner(room, 'Thabo');
  lebo = await grade12Learner(room, 'Lebo');
  // What E's hook (enqueueReadinessRecompute) would leave behind: readiness marked stale, visible on a verified blueprint.
  await LearnerReadiness.create({ schoolId: room.schoolId, studentId: thabo.studentId, subjectKey: w.subjectKey, slug: bp.slug, subjectTitle: 'Mathematics', examYear: YEAR, grade: 12, learnerVisible: true, staleSince: new Date() });
  const type = await MisconceptionType.create({ code: `${w.prefix}.dom`, kind: 'misconception', topicNodeId: w.nodes.FUNC12, label: 'Domain not restricted on inverse', learnerLabel: "Didn't restrict the domain", description: 'Gives the inverse without restricting the domain.', status: 'seeded', origin: 'ai_seed' });
  for (let i = 0; i < 10; i += 1) {
    await evidence(room, thabo, { topicNodeId: w.nodes.FUNC12, marksAwarded: 0, marksAvailable: 2, markedAt: new Date(Date.now() - (i + 1) * 3600_000), diagnosis: i < 2 ? { state: 'ready', typeId: type._id, confidence: 0.9 } : {} });
  }
  await request(app).get('/api/readiness/me').set({ Authorization: `Bearer ${thabo.token}` }).expect(200);
  const item = await PathItem.findOne({ schoolId: room.schoolId, studentId: thabo.studentId, topicKey: 'P1.FUNC' }).lean();
  itemId = String(item!._id);
});
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await MisconceptionType.deleteMany({ code: new RegExp(`^${w.prefix}\\.`) });
  await cleanUpReadiness(w);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

describe('POST /api/readiness/me/path/:itemId/start', () => {
  it('generates five questions on the topic, aimed at the misconception, counted once against the learner pool', async () => {
    const ai = vi.spyOn(AIService, 'generateJSONWithUsage').mockResolvedValue({ data: questions, usage: { input_tokens: 10, output_tokens: 10 } } as never);
    const res = await request(app).post(`/api/readiness/me/path/${itemId}/start`).set({ Authorization: `Bearer ${thabo.token}` }).expect(201);
    expect(res.body.data.questions).toHaveLength(5);
    expect(String(res.body.data.pathItemId)).toBe(itemId);
    expect(String(res.body.data.curriculumNodeId)).toBe(String(w.nodes.FUNC12));
    expect(ai.mock.calls[0][0]).toContain('Domain not restricted on inverse');
    expect(await PathItem.findById(itemId).lean()).toMatchObject({ state: 'started', practiceAttemptId: expect.anything() });
    expect(await AIUsage.countDocuments({ schoolId: room.schoolId, scope: 'learner', action: 'practice_set' })).toBe(1);
  });

  it('a second tap returns the same unsubmitted set and spends nothing', async () => {
    const ai = vi.spyOn(AIService, 'generateJSONWithUsage');
    const first = await PathItem.findById(itemId).lean();
    const res = await request(app).post(`/api/readiness/me/path/${itemId}/start`).set({ Authorization: `Bearer ${thabo.token}` }).expect(201);
    expect(String(res.body.data._id ?? res.body.data.id)).toBe(String(first!.practiceAttemptId));
    expect(ai).not.toHaveBeenCalled();
    expect(await AIUsage.countDocuments({ schoolId: room.schoolId, scope: 'learner', action: 'practice_set' })).toBe(1);
  });

  it("refuses another learner's item, and a finished one", async () => {
    await request(app).post(`/api/readiness/me/path/${itemId}/start`).set({ Authorization: `Bearer ${lebo.token}` }).expect(404);
    await PathItem.updateOne({ _id: itemId }, { $set: { state: 'done' } });
    await request(app).post(`/api/readiness/me/path/${itemId}/start`).set({ Authorization: `Bearer ${thabo.token}` }).expect(409);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/path-start.test.ts`
Expected: FAIL, with `404` on the start route.

- [ ] **Step 3: Implement**

`src/modules/AITutor/model.ts`:
- Add `pathItemId: Types.ObjectId | null;` to `IPracticeAttempt` after `gradingStartedAt`.
- Add `pathItemId: { type: Schema.Types.ObjectId, ref: 'PathItem', default: null },` to `practiceAttemptSchema` after `gradingStartedAt`.

`src/modules/AITutor/practice.service.ts`:
- Export `export interface PracticeOptions { focus?: { label: string; description: string }; pathItemId?: string }`.
- Change the signature to `static async generatePractice(userId: string, schoolId: string, input: GeneratePracticeInput, options: PracticeOptions = {}): Promise<IPracticeAttempt>`.
- In the `systemPrompt` array, before `'Return a JSON array of question objects.'`, add:

```ts
      ...(options.focus
        ? [`Aim at least two of the questions at this common mistake: ${options.focus.label}: ${options.focus.description}`,
          'Never name the mistake or say "misconception" in a question.']
        : []),
```

- In `PracticeAttempt.create({ … })`, add `pathItemId: options.pathItemId ?? null,`.

```ts
// src/modules/Readiness/path-start.ts
//
// Start a path item (spec §4.2, ruling RP8): the learner's own open item → one practice set of five questions on
// the item's node, aimed at its misconception; counted once against the learner pool; a second tap returns the
// same unsubmitted set.
import { ConflictError, NotFoundError } from '../../common/errors.js';
import { MisconceptionType } from '../Evidence/model-taxonomy.js';
import { PracticeAttempt, type IPracticeAttempt } from '../AITutor/model.js';
import { PracticeService } from '../AITutor/practice.service.js';
import { withLearnerAIAllowance, type LearnerAIActor } from '../subscription/learner-ai.js';
import { PRACTICE_QUESTIONS } from './constants.js';
import { LearnerReadiness } from './model-readiness.js';
import { PathItem } from './model-path.js';
import type { Me } from './service-learner.js';

export async function startPathItem(me: Me, userId: string, actor: LearnerAIActor, itemId: string, now: Date): Promise<IPracticeAttempt> {
  const item = await PathItem.findOne({ _id: itemId, ...me, isDeleted: false });
  if (!item) throw new NotFoundError('Path item not found');
  if (item.state !== 'open' && item.state !== 'started') throw new ConflictError('This item is finished');
  if (item.practiceAttemptId) {
    const existing = await PracticeAttempt.findOne({ _id: item.practiceAttemptId, schoolId: me.schoolId, isDeleted: false, completedAt: { $exists: false } });
    if (existing) return existing;
  }
  const readiness = await LearnerReadiness.findOne({ ...me, subjectKey: item.subjectKey, isDeleted: false }).select('familySubjectIds subjectTitle grade').lean();
  const subjectId = readiness?.familySubjectIds[0];
  if (!readiness || !subjectId) throw new NotFoundError('No readiness for this subject yet');
  const type = item.misconceptionTypeId
    ? await MisconceptionType.findOne({ _id: item.misconceptionTypeId }).select('label description').lean()
    : null;
  const attempt = await withLearnerAIAllowance(actor, 'practice_set', () => PracticeService.generatePractice(userId, String(me.schoolId), {
    subjectId: String(subjectId), subjectName: readiness.subjectTitle, grade: readiness.grade, topic: item.topicLabel,
    questionCount: PRACTICE_QUESTIONS, difficulty: 'mixed', questionTypes: ['mcq', 'short_answer'],
    ...(item.focusNodeId ? { curriculumNodeId: item.focusNodeId } : {}),
  }, { focus: type ? { label: type.label, description: type.description } : undefined, pathItemId: String(item._id) }));
  await PathItem.updateOne({ _id: item._id }, { $set: { state: 'started', startedAt: now, practiceAttemptId: attempt._id } });
  return attempt;
}
```

The spread `...(item.focusNodeId ? { curriculumNodeId: item.focusNodeId } : {})` compiles only once E-8 has added `curriculumNodeId` to `GeneratePracticeInput`. That is this task's E-8 dependency.

`src/modules/Readiness/controller-learner.ts`:
- Import `learnerAIActorFor` from `../subscription/learner-ai.js` and `startPathItem` from `./path-start.js`.
- Add to `LearnerController`:

```ts
  async start(req: Request, res: Response): Promise<void> {
    const me = await meAsLearner(getUser(req));
    const attempt = await startPathItem(me, getUser(req).id, await learnerAIActorFor(req), req.params.itemId as string, new Date());
    res.status(201).json(apiResponse(true, attempt, 'Practice ready'));
  },
```

`src/modules/Readiness/routes.ts`: import `itemParams`, and add `router.post('/me/path/:itemId/start', learner, validate({ params: itemParams }), LearnerController.start);`.

- [ ] **Step 4: Run it to verify it passes**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness src/modules/AITutor && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing. The AI tutor's existing practice tests still pass, because `options` defaults to `{}` and the prompt is unchanged without a focus.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Readiness src/modules/AITutor
LANE_SWEEP_OK=1 git commit -m "feat(readiness): start a path item: five practice questions on its topic, aimed at its misconception, counted once in the learner pool" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: the teacher APIs: class readiness, who needs what, learners, one learner's why, pins [needs E-17]

**Files:**
- Create: `src/modules/Readiness/class-aggregate.ts`, `src/modules/Readiness/teacher-classes.ts`, `src/modules/Readiness/service-teacher.ts`, `src/modules/Readiness/controller-teacher.ts`
- Modify: `src/modules/Readiness/validation.ts`, `src/modules/Readiness/routes.ts`
- Test: `src/modules/Readiness/__tests__/class-aggregate.test.ts`, `src/modules/Readiness/__tests__/teacher-api.test.ts`

**Interfaces:**
- Consumes:
  - **E-17:** `classAccess(user, classId): Promise<{ schoolId: Oid; classId: Oid }>`, `learnerAccess(user, studentId): Promise<{ schoolId: Oid; studentId: Oid }>`, `STAFF_ROLES`, `studentNames(schoolId: Oid, ids: Oid[]): Promise<Map<string, string>>`
  - `classRosterFilter` (`src/common/class-roster.ts:24`)
  - Tasks 3, 4, 7, 8, 10 (`gradeNumberFor`, `subjectFamily`, `publishedBlueprint`, `familySubjectIds`, `blueprintIndex`, `examTopicsOf`, `rowWeight`, `latestPerQuestion`, `ensureFresh`, `recomputeReadiness`, `readinessRows`, `weekItems`, `toPathItemView`, `pinTopic`, `removeItem`, `teacherView`, `nscLevel`)
- Produces:
  - `interface LearnerCore { studentId: string; name: string; core: ReadinessCore | null; mid4w: number | null }`
  - `interface ClassTopicRow`, `interface NeedGroup`, `interface ClassLearnerRow`, `interface ClassReadinessView`
  - `classTopicRows(learners, paperKey): ClassTopicRow[]`, `needGroups(learners, paperKey, now): NeedGroup[]`, `learnerRows(learners, paperKey): ClassLearnerRow[]`, `sortLearnerRows(rows, sort: 'band' | 'name' | 'change'): ClassLearnerRow[]`
  - `interface WeightedAnswer { id: string; markedAt: string; sourceType: SourceType; parentId: string; recordId: string; itemKey: string; marksAwarded: number; marksAvailable: number; level: string | null; counted: boolean; weight: WeightParts }`
  - Routes:
    - `GET /api/readiness/classes`
    - `GET /api/readiness/classes/:classId?subject=&paper=`
    - `GET /api/readiness/classes/:classId/learners?subject=&paper=&sort=&page=&limit=`
    - `GET /api/readiness/learners/:studentId?subject=`
    - `GET /api/readiness/learners/:studentId/trend?subject=&weeks=`
    - `GET /api/readiness/learners/:studentId/topics/:topicKey/answers?subject=&cursor=&limit=`
    - `POST /api/readiness/learners/:studentId/path`
    - `DELETE /api/readiness/learners/:studentId/path/:itemId`
    - `POST /api/readiness/classes/:classId/path`

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/Readiness/__tests__/class-aggregate.test.ts
import { describe, expect, it } from 'vitest';
import { classTopicRows, learnerRows, needGroups, sortLearnerRows, type LearnerCore } from '../class-aggregate.js';
import type { PaperResult, ReadinessCore, TopicResult } from '../types.js';

const NOW = new Date('2026-09-28T08:00:00Z');
const topic = (key: string, marks: number, mastery: number | null, misconceptions: TopicResult['misconceptions'] = []): TopicResult => ({
  key, label: key, group: 'g', marks, status: mastery === null ? 'untested' : 'tested', mastery, answers: mastery === null ? 0 : 5, effectiveAnswers: 5,
  lastAnsweredAt: null, marksToGain: mastery === null ? null : Math.round(marks * (100 - mastery)) / 100, due: true, subtopics: [], misconceptions, bySource: {},
});
const mc = (typeId: string) => ({ typeId, kind: 'misconception' as const, label: `T-${typeId}`, learnerLabel: `L-${typeId}`, learnerVisible: true, count: 1, lastSeenAt: '2026-09-20T08:00:00Z' });
const core = (mid: number | null, topics: TopicResult[]): ReadinessCore => ({
  answers: 30, unmappedAnswers: 0, average: 55, lastMarkedAt: null, both: null, defaultTarget: 60,
  papers: [{
    key: 'P1', title: 'Paper 1', totalMarks: 100, durationMinutes: 120, examDate: null, state: mid === null ? 'not_enough_evidence' : 'predicted',
    band: mid === null ? null : { low: mid - 5, high: mid + 5, mid, lowMarks: mid - 5, highMarks: mid + 5 }, predictedMarks: mid ?? 0, sigmaMarks: 5,
    gate: { answers: 30, answersNeeded: 20, testedMarks: 60, testedMarksNeeded: 50 }, levels: [], adjustmentMarks: null, explanation: { learner: [], teacher: [] }, topics,
  } satisfies PaperResult],
});
const learners: LearnerCore[] = [
  { studentId: 'a', name: 'Ayanda', core: core(45, [topic('FUNC', 40, 40, [mc('dom')]), topic('CALC', 35, 75), topic('PROB', 25, null)]), mid4w: 50 },
  { studentId: 'b', name: 'Bongi', core: core(62, [topic('FUNC', 40, 55, [mc('dom')]), topic('CALC', 35, 65), topic('PROB', 25, 80)]), mid4w: null },
  { studentId: 'c', name: 'Carla', core: core(null, [topic('FUNC', 40, null), topic('CALC', 35, null), topic('PROB', 25, null)]), mid4w: null },
  { studentId: 'd', name: 'Dumi', core: null, mid4w: null },
];

describe('class readiness (spec §5.3)', () => {
  it('averages tested mastery per topic and counts learners per level', () => {
    expect(classTopicRows(learners, 'P1').map((r) => [r.key, r.averageMastery, r.counts])).toEqual([
      ['FUNC', 48, { secure: 0, building: 0, weak: 2, untested: 2 }],
      ['CALC', 70, { secure: 1, building: 1, weak: 0, untested: 2 }],
      ['PROB', 80, { secure: 1, building: 0, weak: 0, untested: 3 }],
    ]);
  });

  it('groups learners who are weak on a topic or share a recent misconception, most marks at stake first', () => {
    const groups = needGroups(learners, 'P1', NOW);
    expect(groups.map((g) => [g.kind, g.key, g.learners.map((l) => l.name)])).toEqual([
      ['topic', 'FUNC', ['Ayanda', 'Bongi']],
      ['misconception', 'dom', ['Ayanda', 'Bongi']],
    ]);
    expect(groups[1]).toMatchObject({ label: 'T-dom', topicLabel: 'FUNC', marksAtStake: 40 });
  });

  it('lists learners by predicted band, lowest first; not enough evidence, then none, last', () => {
    const rows = sortLearnerRows(learnerRows(learners, 'P1'), 'band');
    expect(rows.map((r) => [r.name, r.state, r.change4w])).toEqual([
      ['Ayanda', 'predicted', -5], ['Bongi', 'predicted', null], ['Carla', 'not_enough_evidence', null], ['Dumi', 'no_evidence', null],
    ]);
    expect(rows[0].weakestTopic).toEqual({ key: 'FUNC', label: 'FUNC', mastery: 40 });
    expect(sortLearnerRows(rows, 'name')[0].name).toBe('Ayanda');
  });
});
```

```ts
// src/modules/Readiness/__tests__/teacher-api.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../app.js';
import { ExamBlueprint } from '../model-blueprint.js';
import { LearnerReadiness, ReadinessSnapshot } from '../model-readiness.js';
import { PathItem } from '../model-path.js';
import { cleanUpClassrooms, standaloneClassroom, type Classroom, type Learner } from '../../../test-utils/standalone-classroom.js';
import {
  cleanUpReadiness, evidence, grade12Learner, makeCurriculum, publishFixture, readinessRoom, type ReadinessRoom, type ReadinessWorld,
} from '../../../test-utils/readiness-fixture.js';

const YEAR = new Date(Date.now() + 2 * 3600_000).getUTCFullYear();
let w: ReadinessWorld;
let room: ReadinessRoom;
let stranger: Classroom;
let slug: string;
const learners: Learner[] = [];
const teacher = () => ({ Authorization: `Bearer ${room.teacherToken}` });

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await Promise.all([ExamBlueprint.syncIndexes(), LearnerReadiness.syncIndexes(), ReadinessSnapshot.syncIndexes(), PathItem.syncIndexes()]);
  w = await makeCurriculum();
  room = await readinessRoom(w);
  stranger = await standaloneClassroom('Other');
  slug = (await publishFixture(w, { verified: false, examYear: YEAR })).slug;
  const extra = await room.group('Extension');
  learners.push(await grade12Learner(room, 'Ayanda'), await grade12Learner(room, 'Bongi'));
  const second = await room.learner('Carla', extra.id, [room.g12.id]);
  await mongoose.connection.collection('students').updateOne({ _id: second.studentId }, { $set: { gradeId: room.grade12 } });
  learners.push(second);
  for (const [n, l] of learners.entries()) {
    for (let i = 0; i < 22; i += 1) {
      await evidence(room, l, { topicNodeId: i % 2 ? w.nodes.FUNC12 : w.nodes.CALC12, marksAwarded: (i + n) % 3 ? 1 : 0, marksAvailable: 2, markedAt: new Date(Date.now() - (i + 1) * 3600_000) });
    }
  }
});
afterAll(async () => {
  await cleanUpReadiness(w);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

describe('class readiness', () => {
  it('lists the teacher\'s class and subject pairs that have a blueprint', async () => {
    const res = await request(app).get('/api/readiness/classes').set(teacher()).expect(200);
    expect(res.body.data).toEqual([expect.objectContaining({ classId: String(room.g12.id), slug, learners: 3 })]);
  });

  it('the teacher sees an unverified blueprint, flagged, with every learner of the roster (second groups too)', async () => {
    const res = await request(app).get(`/api/readiness/classes/${String(room.g12.id)}?subject=${slug}&paper=P1`).set(teacher()).expect(200);
    const view = res.body.data;
    expect(view.blueprint.verified).toBe(false);
    expect(view.learners).toMatchObject({ total: 3, predicted: 3 });
    expect(view.topics.find((t: { key: string }) => t.key === 'P1.FUNC').counts.weak).toBe(3);
    expect(view.groups[0]).toMatchObject({ kind: 'topic', key: 'P1.FUNC' });
  });

  it('pages the learners, lowest band first', async () => {
    const res = await request(app).get(`/api/readiness/classes/${String(room.g12.id)}/learners?subject=${slug}&paper=P1&sort=band&page=2&limit=2`).set(teacher()).expect(200);
    expect(res.body.data).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(res.body.data.rows).toHaveLength(1);
  });

  it("answers 404 to another school's teacher", async () => {
    await request(app).get(`/api/readiness/classes/${String(room.g12.id)}?subject=${slug}`).set({ Authorization: `Bearer ${stranger.teacherToken}` }).expect(404);
    await request(app).get(`/api/readiness/learners/${String(learners[0].studentId)}?subject=${slug}`).set({ Authorization: `Bearer ${stranger.teacherToken}` }).expect(404);
  });
});

describe('one learner', () => {
  it('shows marks, effective answers and the teacher\'s explanation', async () => {
    const res = await request(app).get(`/api/readiness/learners/${String(learners[0].studentId)}?subject=${slug}`).set(teacher()).expect(200);
    const p1 = res.body.data.papers[0];
    expect(p1.band).toHaveProperty('lowMarks');
    expect(p1.topics[0]).toHaveProperty('effectiveAnswers');
    expect(p1.explanation[0]).toMatch(/Their weighted average/);
  });

  it('lists the answers behind a topic with their weights, a page at a time', async () => {
    const url = `/api/readiness/learners/${String(learners[0].studentId)}/topics/P1.FUNC/answers?subject=${slug}&limit=5`;
    const first = await request(app).get(url).set(teacher()).expect(200);
    expect(first.body.data.rows).toHaveLength(5);
    expect(first.body.data.rows[0]).toMatchObject({ counted: true, weight: { source: 1, tag: 1, override: 1 } });
    const next = await request(app).get(`${url}&cursor=${first.body.data.nextCursor}`).set(teacher()).expect(200);
    expect(next.body.data.rows[0].id).not.toBe(first.body.data.rows[0].id);
  });
});

describe('pins', () => {
  it('pins a topic for one learner, first in the week, and removes it', async () => {
    const res = await request(app).post(`/api/readiness/learners/${String(learners[0].studentId)}/path`).set(teacher()).send({ subject: slug, topicKey: 'P1.PROB' }).expect(201);
    expect(res.body.data).toMatchObject({ topicKey: 'P1.PROB', rank: 1, pinned: true });
    await request(app).delete(`/api/readiness/learners/${String(learners[0].studentId)}/path/${res.body.data.id}`).set(teacher()).expect(204);
  });

  it('a pin for a learner off the roster pins nobody', async () => {
    const outsider = await room.learner('Outsider', (await room.group('Other group')).id);
    const before = await PathItem.countDocuments({ pinnedBy: { $ne: null } });
    await request(app).post(`/api/readiness/classes/${String(room.g12.id)}/path`).set(teacher())
      .send({ subject: slug, topicKey: 'P1.CALC', studentIds: [String(learners[1].studentId), String(outsider.studentId)] }).expect(404);
    expect(await PathItem.countDocuments({ pinnedBy: { $ne: null } })).toBe(before);
    const ok = await request(app).post(`/api/readiness/classes/${String(room.g12.id)}/path`).set(teacher())
      .send({ subject: slug, topicKey: 'P1.CALC', studentIds: learners.map((l) => String(l.studentId)) }).expect(201);
    expect(ok.body.data).toEqual({ pinned: 3 });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/class-aggregate.test.ts src/modules/Readiness/__tests__/teacher-api.test.ts`
Expected: FAIL, with `Cannot find module '../class-aggregate.js'` and 404s on the teacher routes.

- [ ] **Step 3: Implement the pure class aggregation**

```ts
// src/modules/Readiness/class-aggregate.ts
//
// A class's readiness for one paper (spec §5.3): the class exam map (average tested mastery per topic and learners
// per level), "who needs what" (weak on the same topic, or the same misconception in 6 weeks), and the learner list.
import { CLASS_GROUPS_MAX, CLASS_GROUP_WINDOW_DAYS, MASTERY_BUILDING, MASTERY_SECURE } from './constants.js';
import { nscLevel } from './engine/target.js';
import { DAY_MS } from './engine/sast.js';
import type { Band, PaperResult, ReadinessCore, TopicResult } from './types.js';

export interface LearnerCore { studentId: string; name: string; core: ReadinessCore | null; mid4w: number | null }
export interface ClassTopicRow {
  key: string; label: string; group: string; marks: number; averageMastery: number | null;
  counts: { secure: number; building: number; weak: number; untested: number };
}
export interface NeedGroup {
  kind: 'topic' | 'misconception'; key: string; label: string; topicKey: string; topicLabel: string; marksAtStake: number;
  marksEach: number | null; learners: Array<{ studentId: string; name: string }>;
}
export interface ClassLearnerRow {
  studentId: string; name: string; state: PaperResult['state'] | 'no_evidence'; band: Band | null; levelRange: { low: number; high: number } | null;
  change4w: number | null; answers: number; weakestTopic: { key: string; label: string; mastery: number } | null;
}

const paperOf = (l: LearnerCore, key: string): PaperResult | undefined => l.core?.papers.find((p) => p.key === key);
const tested = (t: TopicResult | undefined): t is TopicResult & { mastery: number } => t?.status === 'tested' && t.mastery !== null;

export function classTopicRows(learners: readonly LearnerCore[], paperKey: string): ClassTopicRow[] {
  const template = learners.map((l) => paperOf(l, paperKey)).find(Boolean);
  if (!template) return [];
  return template.topics.map((t0) => {
    const ts = learners.map((l) => paperOf(l, paperKey)?.topics.find((t) => t.key === t0.key));
    const done = ts.filter(tested);
    const counts = {
      secure: done.filter((t) => t.mastery >= MASTERY_SECURE).length,
      building: done.filter((t) => t.mastery >= MASTERY_BUILDING && t.mastery < MASTERY_SECURE).length,
      weak: done.filter((t) => t.mastery < MASTERY_BUILDING).length,
      untested: learners.length - done.length,
    };
    const averageMastery = done.length === 0 ? null : Math.round(done.reduce((s, t) => s + t.mastery, 0) / done.length);
    return { key: t0.key, label: t0.label, group: t0.group, marks: t0.marks, averageMastery, counts };
  });
}

export function needGroups(learners: readonly LearnerCore[], paperKey: string, now: Date): NeedGroup[] {
  const topics = new Map<string, NeedGroup>();
  const types = new Map<string, NeedGroup>();
  const since = now.getTime() - CLASS_GROUP_WINDOW_DAYS * DAY_MS;
  for (const l of learners) {
    for (const t of paperOf(l, paperKey)?.topics ?? []) {
      const who = { studentId: l.studentId, name: l.name };
      if (tested(t) && t.mastery < MASTERY_BUILDING) {
        const g = topics.get(t.key) ?? { kind: 'topic', key: t.key, label: t.label, topicKey: t.key, topicLabel: t.label, marksAtStake: t.marks, marksEach: 0, learners: [] };
        topics.set(t.key, { ...g, marksEach: (g.marksEach ?? 0) + (t.marksToGain ?? 0), learners: [...g.learners, who] });
      }
      for (const m of t.misconceptions) {
        if (Date.parse(m.lastSeenAt) < since) continue;
        const g = types.get(m.typeId) ?? { kind: 'misconception', key: m.typeId, label: m.label, topicKey: t.key, topicLabel: t.label, marksAtStake: t.marks, marksEach: null, learners: [] };
        if (!g.learners.some((x) => x.studentId === l.studentId)) types.set(m.typeId, { ...g, learners: [...g.learners, who] });
      }
    }
  }
  const withAverage = [...topics.values()].map((g) => ({ ...g, marksEach: Math.round((g.marksEach ?? 0) / g.learners.length) }));
  return [...withAverage, ...types.values()]
    .filter((g) => g.learners.length >= 2)
    .sort((a, b) => b.learners.length * b.marksAtStake - a.learners.length * a.marksAtStake || (a.kind === 'topic' ? -1 : 1))
    .slice(0, CLASS_GROUPS_MAX);
}

export function learnerRows(learners: readonly LearnerCore[], paperKey: string): ClassLearnerRow[] {
  return learners.map((l) => {
    const p = paperOf(l, paperKey);
    const weakest = (p?.topics ?? []).filter(tested).sort((a, b) => a.mastery - b.mastery)[0];
    return {
      studentId: l.studentId, name: l.name, state: !p || p.gate.answers === 0 ? 'no_evidence' : p.state, band: p?.band ?? null,
      levelRange: p?.band ? { low: nscLevel(p.band.low), high: nscLevel(p.band.high) } : null,
      change4w: p?.band && l.mid4w !== null ? p.band.mid - l.mid4w : null, answers: p?.gate.answers ?? 0,
      weakestTopic: weakest ? { key: weakest.key, label: weakest.label, mastery: weakest.mastery } : null,
    };
  });
}

const STATE_ORDER: Record<ClassLearnerRow['state'], number> = { predicted: 0, not_enough_evidence: 1, no_evidence: 2 };

export function sortLearnerRows(rows: readonly ClassLearnerRow[], sort: 'band' | 'name' | 'change'): ClassLearnerRow[] {
  const byName = (a: ClassLearnerRow, b: ClassLearnerRow) => a.name.localeCompare(b.name);
  if (sort === 'name') return [...rows].sort(byName);
  if (sort === 'change') return [...rows].sort((a, b) => (a.change4w ?? Infinity) - (b.change4w ?? Infinity) || byName(a, b));
  return [...rows].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.band?.mid ?? 0) - (b.band?.mid ?? 0) || b.answers - a.answers || byName(a, b));
}
```

- [ ] **Step 4: Implement the teacher service, controller, validation and routes**

```ts
// src/modules/Readiness/teacher-classes.ts
//
// A teacher's (class, subject) pairs that have a published blueprint for the class's grade (spec §6.2).
import mongoose from 'mongoose';
import { Class, Timetable } from '../Academic/model.js';
import { Student } from '../Student/model.js';
import { classRosterFilter } from '../../common/class-roster.js';
import { gradeNumberFor, publishedBlueprint, subjectFamily } from './blueprint-resolve.js';
import { sastYear } from './engine/sast.js';
import type { Oid } from './types.js';

export interface ClassSubject { classId: string; className: string; slug: string; subjectTitle: string; grade: number; learners: number }

export async function teacherClassSubjects(schoolId: Oid, teacherId: Oid | null, now: Date): Promise<ClassSubject[]> {
  const rows = await Timetable.find({ schoolId, isDeleted: false, ...(teacherId ? { teacherId } : {}) }).select('classId subjectId').limit(500).lean();
  const pairs = new Map<string, { classId: Oid; subjectId: Oid }>();
  for (const r of rows) pairs.set(`${String(r.classId)}:${String(r.subjectId)}`, { classId: r.classId as Oid, subjectId: r.subjectId as Oid });
  const out: ClassSubject[] = [];
  for (const { classId, subjectId } of pairs.values()) {
    const cls = await Class.findOne({ _id: classId, schoolId, isDeleted: false }).select('name gradeId').lean();
    if (!cls) continue;
    const [grade, family] = await Promise.all([gradeNumberFor(schoolId, cls.gradeId as Oid), subjectFamily(schoolId, subjectId)]);
    if (grade === null || !family?.subjectKey) continue;
    const bp = await publishedBlueprint({ subjectKey: family.subjectKey, grade, examYear: sastYear(now) });
    if (!bp || out.some((o) => o.classId === String(classId) && o.slug === bp.slug)) continue;
    const learners = await Student.countDocuments(classRosterFilter(classId, { schoolId, isDeleted: false }));
    out.push({ classId: String(classId), className: cls.name, slug: bp.slug, subjectTitle: bp.subjectTitle, grade, learners });
  }
  return out;
}

export const asOid = (id: string): Oid => new mongoose.Types.ObjectId(id);
```

```ts
// src/modules/Readiness/service-teacher.ts
//
// The teacher's side (spec §5.3–§5.4, §6.2): class view, learners, one learner's why and the answers behind a
// topic, and pins. Access is E's (E plan P6): class access for class routes, learner access for learner routes.
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { classRosterFilter } from '../../common/class-roster.js';
import { Class } from '../Academic/model.js';
import { Student } from '../Student/model.js';
import { studentNames } from '../Evidence/access.js';
import { PIN_MAX_LEARNERS, RECOMPUTE_CONCURRENCY } from './constants.js';
import { ExamBlueprint } from './model-blueprint.js';
import { LearnerReadiness, ReadinessSnapshot } from './model-readiness.js';
import { PathItem } from './model-path.js';
import { blueprintData } from './blueprint-service.js';
import { isBlueprintVerified } from './blueprint-validate.js';
import { gradeNumberFor, learnerTarget, publishedBlueprint } from './blueprint-resolve.js';
import { classTopicRows, learnerRows, needGroups, sortLearnerRows, type ClassLearnerRow, type ClassTopicRow, type LearnerCore, type NeedGroup } from './class-aggregate.js';
import { blueprintIndex, examTopicsOf } from './engine/mapping.js';
import { addDays, sastDay, sastYear } from './engine/sast.js';
import { latestPerQuestion, rowWeight, type WeightParts } from './engine/weights.js';
import { pinTopic, removeItem, toPathItemView, weekItems, type PathItemView } from './path-service.js';
import { readinessRows } from './rows.js';
import { ensureFresh, recomputeReadiness } from './service-compute.js';
import { trendOf, type TrendPoint } from './snapshots.js';
import { teacherView, type ReadinessView } from './views.js';
import type { Oid, SourceType } from './types.js';

export interface ClassReadinessView {
  classId: string; className: string; subject: { slug: string; title: string; grade: number };
  blueprint: { id: string; examYear: number; version: number; verified: boolean };
  paper: { key: string; title: string; totalMarks: number; examDate: string | null };
  learners: { total: number; predicted: number; notEnough: number; noEvidence: number };
  medianMid: number | null; topics: ClassTopicRow[]; groups: NeedGroup[]; updatedAt: string;
}
export interface WeightedAnswer {
  id: string; markedAt: string; sourceType: SourceType; parentId: string; recordId: string; itemKey: string;
  marksAwarded: number; marksAvailable: number; level: string | null; counted: boolean; weight: WeightParts;
}

async function inBatches<T, R>(items: readonly T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += RECOMPUTE_CONCURRENCY) out.push(...(await Promise.all(items.slice(i, i + RECOMPUTE_CONCURRENCY).map(run))));
  return out;
}

/** The class, its grade's blueprint for the slug, and every learner of the roster with fresh readiness. */
async function classContext(schoolId: Oid, classId: Oid, slug: string, now: Date) {
  const cls = await Class.findOne({ _id: classId, schoolId, isDeleted: false }).select('name gradeId').lean();
  if (!cls) throw new NotFoundError('Not found');
  const grade = await gradeNumberFor(schoolId, cls.gradeId as Oid);
  const bp = grade === null ? null : await publishedBlueprint({ slug, grade, examYear: sastYear(now) });
  if (!bp || grade === null) throw new NotFoundError('No published blueprint for this class and subject');
  const roster = await Student.find(classRosterFilter(classId, { schoolId, isDeleted: false })).select('_id').lean();
  const ids = roster.map((s) => s._id as Oid);
  const names = await studentNames(schoolId, ids);
  const monthAgo = addDays(sastDay(now), -28);
  const learners: LearnerCore[] = await inBatches(ids, async (studentId) => {
    const doc = await ensureFresh({ schoolId, studentId, subjectKey: bp.subjectKey }, now);
    const old = await ReadinessSnapshot.findOne({ schoolId, studentId, subjectKey: bp.subjectKey, day: { $lte: monthAgo }, isDeleted: false }).sort({ day: -1 }).lean();
    return { studentId: String(studentId), name: names.get(String(studentId)) ?? 'Learner', core: doc?.core ?? null, mid4w: old?.papers[0]?.mid ?? null };
  });
  return { cls, grade, bp, learners };
}

export async function classView(schoolId: Oid, classId: Oid, slug: string, paperKey: string | undefined, now: Date): Promise<ClassReadinessView> {
  const { cls, grade, bp, learners } = await classContext(schoolId, classId, slug, now);
  const paper = bp.papers.find((p) => p.key === (paperKey ?? bp.papers[0].key));
  if (!paper) throw new BadRequestError('Unknown paper');
  const rows = learnerRows(learners, paper.key);
  const mids = rows.filter((r) => r.band).map((r) => r.band!.mid).sort((a, b) => a - b);
  return {
    classId: String(classId), className: cls.name, subject: { slug: bp.slug, title: bp.subjectTitle, grade },
    blueprint: { id: String(bp._id), examYear: bp.examYear, version: bp.version, verified: isBlueprintVerified(blueprintData(bp)) },
    paper: { key: paper.key, title: paper.title, totalMarks: paper.totalMarks, examDate: paper.examDate },
    learners: {
      total: rows.length, predicted: rows.filter((r) => r.state === 'predicted').length,
      notEnough: rows.filter((r) => r.state === 'not_enough_evidence').length, noEvidence: rows.filter((r) => r.state === 'no_evidence').length,
    },
    medianMid: mids.length === 0 ? null : mids[Math.floor(mids.length / 2)],
    topics: classTopicRows(learners, paper.key), groups: needGroups(learners, paper.key, now), updatedAt: now.toISOString(),
  };
}

export async function classLearners(schoolId: Oid, classId: Oid, q: { subject: string; paper?: string; sort: 'band' | 'name' | 'change'; page: number; limit: number }, now: Date): Promise<{ rows: ClassLearnerRow[]; total: number; page: number; limit: number }> {
  const { bp, learners } = await classContext(schoolId, classId, q.subject, now);
  const sorted = sortLearnerRows(learnerRows(learners, q.paper ?? bp.papers[0].key), q.sort);
  return { rows: sorted.slice((q.page - 1) * q.limit, q.page * q.limit), total: sorted.length, page: q.page, limit: q.limit };
}

async function learnerSubjectKey(schoolId: Oid, studentId: Oid, slug: string): Promise<string> {
  const doc = await LearnerReadiness.findOne({ schoolId, studentId, slug, isDeleted: false }).select('subjectKey').lean();
  if (doc) return doc.subjectKey;
  const bp = await ExamBlueprint.findOne({ slug, status: 'published', isDeleted: false }).select('subjectKey').lean();
  if (!bp) throw new NotFoundError('No readiness for this subject yet');
  return bp.subjectKey;
}

export async function learnerReadiness(schoolId: Oid, studentId: Oid, slug: string, now: Date): Promise<ReadinessView> {
  const subjectKey = await learnerSubjectKey(schoolId, studentId, slug);
  const doc = await ensureFresh({ schoolId, studentId, subjectKey }, now);
  if (!doc?.core) throw new NotFoundError('No readiness for this subject yet');
  const bp = await ExamBlueprint.findOne({ _id: doc.blueprintId, isDeleted: false });
  const items = await weekItems({ schoolId, studentId, subjectKey }, now);
  return teacherView(doc, items.map(toPathItemView), bp ? isBlueprintVerified(blueprintData(bp)) : false);
}

export async function learnerTrend(schoolId: Oid, studentId: Oid, slug: string, weeks: number, now: Date): Promise<TrendPoint[]> {
  return trendOf({ schoolId, studentId, subjectKey: await learnerSubjectKey(schoolId, studentId, slug) }, weeks, now);
}

export async function topicAnswers(schoolId: Oid, studentId: Oid, q: { subject: string; topicKey: string; cursor?: string; limit: number }, now: Date): Promise<{ rows: WeightedAnswer[]; nextCursor: string | null }> {
  const target = await learnerTarget(schoolId, studentId, await learnerSubjectKey(schoolId, studentId, q.subject), now);
  if (!target) throw new NotFoundError('No readiness for this subject yet');
  const bp = blueprintData(target.blueprint);
  const index = blueprintIndex(bp);
  const rows = (await readinessRows(schoolId, studentId, target.subjectIds))
    .filter((r) => examTopicsOf(index, r).some((ref) => ref.topicKey === q.topicKey))
    .sort((a, b) => b.markedAt.getTime() - a.markedAt.getTime() || b.id.localeCompare(a.id));
  const counted = new Set(latestPerQuestion(rows, now).map((r) => r.id));
  const start = q.cursor ? rows.findIndex((r) => r.id === q.cursor) + 1 : 0;
  const page = rows.slice(start, start + q.limit);
  return {
    rows: page.map((r) => ({
      id: r.id, markedAt: r.markedAt.toISOString(), sourceType: r.sourceType, parentId: r.parentId, recordId: r.recordId, itemKey: r.itemKey,
      marksAwarded: r.marksAwarded, marksAvailable: r.marksAvailable, level: r.cognitiveLevel, counted: counted.has(r.id), weight: rowWeight(r, now),
    })),
    nextCursor: start + q.limit < rows.length ? page[page.length - 1].id : null,
  };
}

async function pinOne(schoolId: Oid, studentId: Oid, slug: string, body: { topicKey: string; misconceptionTypeId?: string }, by: Oid, now: Date): Promise<PathItemView> {
  const key = { schoolId, studentId, subjectKey: await learnerSubjectKey(schoolId, studentId, slug) };
  const result = await recomputeReadiness(key, now);
  if (!result) throw new NotFoundError('No readiness for this subject yet');
  return toPathItemView(await pinTopic(result, key, { topicKey: body.topicKey, misconceptionTypeId: body.misconceptionTypeId ?? null, by, now }));
}

export async function pinForLearner(schoolId: Oid, studentId: Oid, body: { subject: string; topicKey: string; misconceptionTypeId?: string }, by: Oid, now: Date): Promise<PathItemView> {
  return pinOne(schoolId, studentId, body.subject, body, by, now);
}

export async function pinForClass(schoolId: Oid, classId: Oid, body: { subject: string; topicKey: string; misconceptionTypeId?: string; studentIds: string[] }, by: Oid, now: Date): Promise<{ pinned: number }> {
  const ids = [...new Set(body.studentIds)].slice(0, PIN_MAX_LEARNERS);
  const onRoster = await Student.countDocuments(classRosterFilter(classId, { schoolId, isDeleted: false, _id: { $in: ids } }));
  if (onRoster !== ids.length) throw new NotFoundError('Not found');
  for (const id of ids) await pinOne(schoolId, new mongoose.Types.ObjectId(id), body.subject, body, by, now);
  return { pinned: ids.length };
}

export async function removeForLearner(schoolId: Oid, studentId: Oid, itemId: string, by: Oid): Promise<void> {
  const item = mongoose.Types.ObjectId.isValid(itemId)
    ? await PathItem.findOne({ _id: itemId, schoolId, studentId, isDeleted: false }).select('subjectKey').lean()
    : null;
  if (!item) throw new NotFoundError('Path item not found');
  await removeItem({ schoolId, studentId, subjectKey: item.subjectKey }, itemId, by);
}
```

```ts
// src/modules/Readiness/controller-teacher.ts
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { apiResponse } from '../../common/utils.js';
import { getUser } from '../../types/authenticated-request.js';
import { classAccess, learnerAccess } from '../Evidence/access.js';
import { teacherClassSubjects } from './teacher-classes.js';
import {
  classLearners, classView, learnerReadiness, learnerTrend, pinForClass, pinForLearner, removeForLearner, topicAnswers,
} from './service-teacher.js';

const me = (req: Request) => new mongoose.Types.ObjectId(getUser(req).id);
const q = <T>(req: Request): T => req.query as unknown as T;

export const TeacherController = {
  async classes(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const schoolId = new mongoose.Types.ObjectId(String(user.schoolId));
    res.json(apiResponse(true, await teacherClassSubjects(schoolId, user.role === 'teacher' ? me(req) : null, new Date())));
  },
  async classView(req: Request, res: Response): Promise<void> {
    const a = await classAccess(getUser(req), req.params.classId as string);
    const query = q<{ subject: string; paper?: string }>(req);
    res.json(apiResponse(true, await classView(a.schoolId, a.classId, query.subject, query.paper, new Date())));
  },
  async classLearners(req: Request, res: Response): Promise<void> {
    const a = await classAccess(getUser(req), req.params.classId as string);
    res.json(apiResponse(true, await classLearners(a.schoolId, a.classId, q(req), new Date())));
  },
  async learner(req: Request, res: Response): Promise<void> {
    const a = await learnerAccess(getUser(req), req.params.studentId as string);
    res.json(apiResponse(true, await learnerReadiness(a.schoolId, a.studentId, q<{ subject: string }>(req).subject, new Date())));
  },
  async learnerTrend(req: Request, res: Response): Promise<void> {
    const a = await learnerAccess(getUser(req), req.params.studentId as string);
    const query = q<{ subject: string; weeks: number }>(req);
    res.json(apiResponse(true, { points: await learnerTrend(a.schoolId, a.studentId, query.subject, Number(query.weeks ?? 12), new Date()) }));
  },
  async answers(req: Request, res: Response): Promise<void> {
    const a = await learnerAccess(getUser(req), req.params.studentId as string);
    const query = q<{ subject: string; cursor?: string; limit: number }>(req);
    res.json(apiResponse(true, await topicAnswers(a.schoolId, a.studentId, { ...query, topicKey: req.params.topicKey as string }, new Date())));
  },
  async pinLearner(req: Request, res: Response): Promise<void> {
    const a = await learnerAccess(getUser(req), req.params.studentId as string);
    res.status(201).json(apiResponse(true, await pinForLearner(a.schoolId, a.studentId, req.body, me(req), new Date())));
  },
  async removeLearnerItem(req: Request, res: Response): Promise<void> {
    const a = await learnerAccess(getUser(req), req.params.studentId as string);
    await removeForLearner(a.schoolId, a.studentId, req.params.itemId as string, me(req));
    res.status(204).end();
  },
  async pinClass(req: Request, res: Response): Promise<void> {
    const a = await classAccess(getUser(req), req.params.classId as string);
    res.status(201).json(apiResponse(true, await pinForClass(a.schoolId, a.classId, req.body, me(req), new Date())));
  },
};
```

`src/modules/Readiness/validation.ts`, add:

```ts
const subject = slug;
export const classParams = z.object({ classId: objectIdSchema });
export const studentParams = z.object({ studentId: objectIdSchema });
export const studentItemParams = z.object({ studentId: objectIdSchema, itemId: objectIdSchema });
export const topicParams = z.object({ studentId: objectIdSchema, topicKey: z.string().regex(/^P[1-9]\.[A-Z0-9]{2,12}$/) });
export const classViewQuery = z.object({ subject, paper: z.string().regex(/^P[1-9]$/).optional() });
export const learnersQuery = classViewQuery.extend({
  sort: z.enum(['band', 'name', 'change']).default('band'), page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const learnerQuery = z.object({ subject });
export const learnerTrendQuery = z.object({ subject, weeks: z.coerce.number().int().min(1).max(26).default(12) });
export const answersQuery = z.object({ subject, cursor: objectIdSchema.optional(), limit: z.coerce.number().int().min(1).max(100).default(50) });
const pinBase = { subject, topicKey: z.string().regex(/^P[1-9]\.[A-Z0-9]{2,12}$/), misconceptionTypeId: objectIdSchema.optional() };
export const pinLearnerBody = z.object(pinBase).strict();
export const pinClassBody = z.object({ ...pinBase, studentIds: z.array(objectIdSchema).min(1).max(60) }).strict();
```

`src/modules/Readiness/routes.ts`: import `STAFF_ROLES` from `../Evidence/access.js`, `TeacherController` and the new schemas, then add:

```ts
const staff = authorize(...STAFF_ROLES);
router.get('/classes', staff, TeacherController.classes);
router.get('/classes/:classId', staff, validate({ params: classParams, query: classViewQuery }), TeacherController.classView);
router.get('/classes/:classId/learners', staff, validate({ params: classParams, query: learnersQuery }), TeacherController.classLearners);
router.post('/classes/:classId/path', staff, validate({ params: classParams, body: pinClassBody }), TeacherController.pinClass);
router.get('/learners/:studentId', staff, validate({ params: studentParams, query: learnerQuery }), TeacherController.learner);
router.get('/learners/:studentId/trend', staff, validate({ params: studentParams, query: learnerTrendQuery }), TeacherController.learnerTrend);
router.get('/learners/:studentId/topics/:topicKey/answers', staff, validate({ params: topicParams, query: answersQuery }), TeacherController.answers);
router.post('/learners/:studentId/path', staff, validate({ params: studentParams, body: pinLearnerBody }), TeacherController.pinLearner);
router.delete('/learners/:studentId/path/:itemId', staff, validate({ params: studentItemParams }), TeacherController.removeLearnerItem);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing. Check every new file with `wc -l src/modules/Readiness/*.ts`: all must be ≤ 300 lines. If `service-teacher.ts` is over 300, move `topicAnswers` and `WeightedAnswer` into `src/modules/Readiness/topic-answers.ts` (a pure move).

- [ ] **Step 6: Commit**

```bash
git add src/modules/Readiness
LANE_SWEEP_OK=1 git commit -m "feat(readiness): class readiness per paper, who needs what, learners by band, one learner's why and the answers behind a topic, and teacher pins" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: the super-admin blueprint API, and the calibration report

**Files:**
- Create: `src/modules/Readiness/controller-admin.ts`, `src/modules/Readiness/calibration.ts`, `src/scripts/readiness-calibrate.ts`
- Modify: `src/modules/Readiness/blueprint-service.ts` (export `reportFor(doc)`, the old `revalidate`), `src/modules/Readiness/validation.ts`, `src/modules/Readiness/routes.ts`, `package.json` (`"readiness:calibrate": "tsx src/scripts/readiness-calibrate.ts"`)
- Test: `src/modules/Readiness/__tests__/admin-api.test.ts`, `src/modules/Readiness/__tests__/calibration.test.ts`

**Interfaces:**
- Consumes: Task 2 (`validateRaw`, `importDraft`, `publishBlueprint`, `copyBlueprint`, `patchVerification`, `blueprintData`); Task 9 (`enqueueBlueprintRecompute`, `setReadinessJobsEnabled`, `learnersForBlueprint`); Task 7 (`readinessRows`, `ReadinessSnapshot`); `signTestToken`.
- Produces:
  - `reportFor(doc: IExamBlueprint): Promise<ValidationReport>`
  - Routes:
    - `GET /api/readiness/blueprints?status=&family=&examYear=&page=&limit=`
    - `GET /api/readiness/blueprints/:id` → `{ blueprint, report, verified }`
    - `POST /api/readiness/blueprints/validate`, `POST /api/readiness/blueprints/import`
    - `PATCH /api/readiness/blueprints/:id`
    - `POST /api/readiness/blueprints/:id/publish`, `POST /api/readiness/blueprints/:id/copy`
  - `testCoverage(topicMarks: ReadonlyMap<string, number>, hitTopics: ReadonlySet<string>, totalMarks: number): number`
  - `calibrate(results: ReadonlyArray<{ percent: number; band: { low: number; high: number } | null }>): { tests: number; inside: number; share: number | null }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/Readiness/__tests__/calibration.test.ts
import { describe, expect, it } from 'vitest';
import { calibrate, testCoverage } from '../calibration.js';

describe('calibration (spec §11)', () => {
  it('measures how much of a paper a test covered, by the marks of the topics it hit', () => {
    const marks = new Map([['P1.FUNC', 40], ['P1.CALC', 35], ['P1.PROB', 25]]);
    expect(testCoverage(marks, new Set(['P1.FUNC', 'P1.CALC']), 100)).toBe(0.75);
    expect(testCoverage(marks, new Set(['P1.FUNC', 'P1.CALC', 'P1.PROB']), 100)).toBe(1);
  });

  it('counts marks inside the band predicted the day before; tests with no band are not counted', () => {
    expect(calibrate([{ percent: 55, band: { low: 50, high: 60 } }, { percent: 70, band: { low: 50, high: 60 } }, { percent: 40, band: null }]))
      .toEqual({ tests: 2, inside: 1, share: 0.5 });
    expect(calibrate([])).toEqual({ tests: 0, inside: 0, share: null });
  });
});
```

```ts
// src/modules/Readiness/__tests__/admin-api.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../app.js';
import { signTestToken } from '../../../test-utils/auth.js';
import { readinessQueue } from '../../../jobs/queues.js';
import { ExamBlueprint } from '../model-blueprint.js';
import { setReadinessJobsEnabled } from '../recompute-queue.js';
import { cleanUpReadiness, fixtureBlueprintFile, makeCurriculum, type ReadinessWorld } from '../../../test-utils/readiness-fixture.js';

let w: ReadinessWorld;
const admin = { Authorization: `Bearer ${signTestToken({ role: 'super_admin', isStandaloneTeacher: false })}` };
const teacher = { Authorization: `Bearer ${signTestToken({ role: 'teacher', schoolId: new mongoose.Types.ObjectId() })}` };

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await ExamBlueprint.syncIndexes();
  w = await makeCurriculum();
});
afterEach(() => {
  vi.restoreAllMocks();
  setReadinessJobsEnabled(false);
});
afterAll(async () => {
  await cleanUpReadiness(w);
  await mongoose.disconnect();
});

describe('/api/readiness/blueprints (super admin only)', () => {
  it('refuses a teacher', async () => {
    await request(app).get('/api/readiness/blueprints').set(teacher).expect(403);
  });

  it('validates without writing, and imports as a draft', async () => {
    const v = await request(app).post('/api/readiness/blueprints/validate').set(admin).send(fixtureBlueprintFile(w)).expect(200);
    expect(v.body.data).toMatchObject({ errors: [], parseErrors: [] });
    expect(await ExamBlueprint.countDocuments({ subjectKey: w.subjectKey })).toBe(0);
    const i = await request(app).post('/api/readiness/blueprints/import').set(admin).send(fixtureBlueprintFile(w)).expect(201);
    expect(i.body.data.blueprint).toMatchObject({ status: 'draft' });
    const bad = fixtureBlueprintFile(w);
    bad.papers[0].totalMarks = 7;
    await request(app).post('/api/readiness/blueprints/import').set(admin).send(bad).expect(400);
  });

  it('lists and shows a blueprint with its report and verified state', async () => {
    const list = await request(app).get(`/api/readiness/blueprints?family=${w.prefix}-NSC-MATHEMATICS-GR12`).set(admin).expect(200);
    expect(list.body.data).toMatchObject({ total: 1 });
    const id = list.body.data.rows[0]._id;
    const one = await request(app).get(`/api/readiness/blueprints/${id}`).set(admin).expect(200);
    expect(one.body.data).toMatchObject({ verified: false, report: { errors: [] } });
  });

  it('patches flags, sources and dates, never marks', async () => {
    const draft = await ExamBlueprint.findOne({ subjectKey: w.subjectKey, status: 'draft' });
    await request(app).patch(`/api/readiness/blueprints/${String(draft!._id)}`).set(admin).send({ topics: [{ key: 'P1.FUNC', marks: 50 }] }).expect(400);
    const ok = await request(app).patch(`/api/readiness/blueprints/${String(draft!._id)}`).set(admin).send({ topics: [{ key: 'P1.FUNC', verified: true, sourceRef: 'EG26 p.9' }] }).expect(200);
    expect(ok.body.data.papers[0].topics[0]).toMatchObject({ verified: true, sourceRef: 'EG26 p.9' });
  });

  it('publishes (queuing a recompute of the family) and copies to another year', async () => {
    setReadinessJobsEnabled(true);
    const add = vi.spyOn(readinessQueue, 'add').mockResolvedValue({} as never);
    const draft = await ExamBlueprint.findOne({ subjectKey: w.subjectKey, status: 'draft' });
    const pub = await request(app).post(`/api/readiness/blueprints/${String(draft!._id)}/publish`).set(admin).send({ acknowledgeWarnings: true }).expect(200);
    expect(pub.body.data).toMatchObject({ status: 'published', version: 1 });
    expect(add).toHaveBeenCalledWith('readiness:blueprint', { blueprintId: String(draft!._id) }, expect.anything());
    const copy = await request(app).post(`/api/readiness/blueprints/${String(draft!._id)}/copy`).set(admin).send({ examYear: 2027 }).expect(201);
    expect(copy.body.data).toMatchObject({ status: 'draft', examYear: 2027 });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/calibration.test.ts src/modules/Readiness/__tests__/admin-api.test.ts`
Expected: FAIL, with `Cannot find module '../calibration.js'` and 404s on `/api/readiness/blueprints`.

- [ ] **Step 3: Implement**

In `src/modules/Readiness/blueprint-service.ts`, rename `revalidate` to `reportFor`, export it, and update its one caller in `publishBlueprint`.

```ts
// src/modules/Readiness/calibration.ts
//
// Is the band honest? (spec §11): for each marked test covering ≥ 80% of a paper by topic marks, whether the mark
// fell inside the band predicted the day before. Pure.
export function testCoverage(topicMarks: ReadonlyMap<string, number>, hitTopics: ReadonlySet<string>, totalMarks: number): number {
  let covered = 0;
  for (const key of hitTopics) covered += topicMarks.get(key) ?? 0;
  return totalMarks > 0 ? covered / totalMarks : 0;
}

export function calibrate(results: ReadonlyArray<{ percent: number; band: { low: number; high: number } | null }>): { tests: number; inside: number; share: number | null } {
  const counted = results.filter((r): r is { percent: number; band: { low: number; high: number } } => r.band !== null);
  const inside = counted.filter((r) => r.percent >= r.band.low && r.percent <= r.band.high).length;
  return { tests: counted.length, inside, share: counted.length === 0 ? null : inside / counted.length };
}
```

```ts
// src/modules/Readiness/controller-admin.ts
import type { Request, Response } from 'express';
import { apiResponse } from '../../common/utils.js';
import { BadRequestError, NotFoundError } from '../../common/errors.js';
import { getUser } from '../../types/authenticated-request.js';
import { ExamBlueprint } from './model-blueprint.js';
import { blueprintData, copyBlueprint, importDraft, patchVerification, publishBlueprint, reportFor, validateRaw } from './blueprint-service.js';
import { isBlueprintVerified } from './blueprint-validate.js';
import { enqueueBlueprintRecompute } from './recompute-queue.js';

export const AdminController = {
  async list(req: Request, res: Response): Promise<void> {
    const q = req.query as unknown as { status?: string; family?: string; examYear?: number; page: number; limit: number };
    const filter = { isDeleted: false, ...(q.status ? { status: q.status } : {}), ...(q.family ? { family: q.family } : {}), ...(q.examYear ? { examYear: q.examYear } : {}) };
    const [rows, total] = await Promise.all([
      ExamBlueprint.find(filter).sort({ examYear: -1, family: 1, version: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      ExamBlueprint.countDocuments(filter),
    ]);
    res.json(apiResponse(true, { rows, total, page: q.page, limit: q.limit }));
  },
  async one(req: Request, res: Response): Promise<void> {
    const doc = await ExamBlueprint.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) throw new NotFoundError('Blueprint not found');
    res.json(apiResponse(true, { blueprint: doc, report: await reportFor(doc), verified: isBlueprintVerified(blueprintData(doc)) }));
  },
  async validate(req: Request, res: Response): Promise<void> {
    res.json(apiResponse(true, await validateRaw(req.body)));
  },
  async import(req: Request, res: Response): Promise<void> {
    const { report, blueprint, changed } = await importDraft(req.body);
    if (!blueprint) throw new BadRequestError([...report.parseErrors, ...report.errors].join('; '));
    res.status(201).json(apiResponse(true, { blueprint, report, changed }));
  },
  async patch(req: Request, res: Response): Promise<void> {
    const doc = await patchVerification(req.params.id as string, req.body);
    if (doc.status === 'published') await enqueueBlueprintRecompute(String(doc._id));
    res.json(apiResponse(true, doc));
  },
  async publish(req: Request, res: Response): Promise<void> {
    const doc = await publishBlueprint(req.params.id as string, getUser(req).id, (req.body as { acknowledgeWarnings: boolean }).acknowledgeWarnings);
    await enqueueBlueprintRecompute(String(doc._id));
    res.json(apiResponse(true, doc));
  },
  async copy(req: Request, res: Response): Promise<void> {
    res.status(201).json(apiResponse(true, await copyBlueprint(req.params.id as string, (req.body as { examYear: number }).examYear)));
  },
};
```

`src/modules/Readiness/validation.ts`, add:

```ts
export const idParams = z.object({ id: objectIdSchema });
export const blueprintListQuery = z.object({
  status: z.enum(['draft', 'published', 'retired']).optional(), family: z.string().max(60).optional(),
  examYear: z.coerce.number().int().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
});
const flag = { verified: z.boolean().optional(), sourceRef: z.string().max(80).optional() };
export const verificationBody = z.object({
  papers: z.array(z.object({
    key: z.string().regex(/^P[1-9]$/), ...flag,
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), sitting: z.enum(['morning', 'afternoon']).nullable().optional(),
  }).strict()).optional(),
  topics: z.array(z.object({ key: z.string().regex(/^P[1-9]\.[A-Z0-9]{2,12}$/), ...flag }).strict()).optional(),
  levels: z.array(z.object({ key: z.string().min(1).max(40), ...flag }).strict()).optional(),
}).strict();
export const publishBody = z.object({ acknowledgeWarnings: z.boolean() }).strict();
export const copyBody = z.object({ examYear: z.number().int().min(2024).max(2100) }).strict();
```

`src/modules/Readiness/routes.ts`: import `AdminController` and the schemas. Add these **before** any route that has a `:param` at the same depth:

```ts
const superAdmin = authorize('super_admin');
router.get('/blueprints', superAdmin, validate({ query: blueprintListQuery }), AdminController.list);
router.post('/blueprints/validate', superAdmin, AdminController.validate);
router.post('/blueprints/import', superAdmin, AdminController.import);
router.get('/blueprints/:id', superAdmin, validate({ params: idParams }), AdminController.one);
router.patch('/blueprints/:id', superAdmin, validate({ params: idParams, body: verificationBody }), AdminController.patch);
router.post('/blueprints/:id/publish', superAdmin, validate({ params: idParams, body: publishBody }), AdminController.publish);
router.post('/blueprints/:id/copy', superAdmin, validate({ params: idParams, body: copyBody }), AdminController.copy);
```

```ts
// src/scripts/readiness-calibrate.ts
//
// npm run readiness:calibrate [-- --school=<id>]: for each published blueprint, every marked test (source type
// "test") covering ≥ 80% of a paper's topic marks, compared with that learner's band the day before. Read-only.
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { ExamBlueprint } from '../modules/Readiness/model-blueprint.js';
import { ReadinessSnapshot } from '../modules/Readiness/model-readiness.js';
import { blueprintData } from '../modules/Readiness/blueprint-service.js';
import { familySubjectIds } from '../modules/Readiness/blueprint-resolve.js';
import { learnersForBlueprint } from '../modules/Readiness/discover.js';
import { readinessRows } from '../modules/Readiness/rows.js';
import { blueprintIndex, examTopicsOf } from '../modules/Readiness/engine/mapping.js';
import { sastDay } from '../modules/Readiness/engine/sast.js';
import { calibrate, testCoverage } from '../modules/Readiness/calibration.js';

const COVERAGE = 0.8;

async function main(): Promise<void> {
  await mongoose.connect(config.mongodb.uri);
  const schoolArg = process.argv.find((a: string) => a.startsWith('--school='))?.slice(9);
  const school = schoolArg ? new mongoose.Types.ObjectId(schoolArg) : undefined;
  for (const doc of await ExamBlueprint.find({ status: 'published', isDeleted: false })) {
    const bp = blueprintData(doc);
    const index = blueprintIndex(bp);
    const results: Array<{ percent: number; band: { low: number; high: number } | null }> = [];
    for (const key of await learnersForBlueprint(doc, school)) {
      const rows = (await readinessRows(key.schoolId, key.studentId, await familySubjectIds(key.schoolId, bp))).filter((r) => r.sourceType === 'test');
      const byTest = new Map<string, typeof rows>();
      for (const r of rows) byTest.set(r.parentId, [...(byTest.get(r.parentId) ?? []), r]);
      for (const testRows of byTest.values()) {
        for (const paper of bp.papers) {
          const hit = new Set(testRows.flatMap((r) => examTopicsOf(index, r)).filter((ref) => ref.paperKey === paper.key).map((ref) => ref.topicKey));
          if (testCoverage(new Map(paper.topics.map((t) => [t.key, t.marks])), hit, paper.totalMarks) < COVERAGE) continue;
          const day = sastDay(new Date(Math.max(...testRows.map((r) => r.markedAt.getTime()))));
          const before = await ReadinessSnapshot.findOne({ ...key, day: { $lt: day }, isDeleted: false }).sort({ day: -1 }).lean();
          const p = before?.papers.find((x) => x.key === paper.key);
          const awarded = testRows.reduce((s, r) => s + r.marksAwarded, 0);
          const available = testRows.reduce((s, r) => s + r.marksAvailable, 0);
          results.push({ percent: available > 0 ? (awarded / available) * 100 : 0, band: p && p.low !== null && p.high !== null ? { low: p.low, high: p.high } : null });
        }
      }
    }
    console.log(doc.family, doc.examYear, calibrate(results));
  }
  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

Add `"readiness:calibrate": "tsx src/scripts/readiness-calibrate.ts"` to `package.json`.

- [ ] **Step 4: Run the tests to verify they pass, then the whole backend suite**

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run && npx tsc --noEmit && npm run build`
Expected: every file PASS, `tsc` silent, and `build` exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/modules/Readiness src/scripts/readiness-calibrate.ts package.json
LANE_SWEEP_OK=1 git commit -m "feat(readiness): super-admin blueprint API (validate, import, verify, publish, copy) and the readiness:calibrate report" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Phase R-D — frontend (after L-C merges into frontend `master`)

Frontend commands run from `C:\dev\campusly\.worktrees\frontend-readiness`. Unit tests: `npx vitest run <path>`. Type-check: `npx tsc --noEmit`.

### Task 14: frontend set-up; readiness types and view helpers; the `thin` tile; the next-level target sentence

**Files:**
- Create: `src/types/readiness.ts`, `src/lib/readiness/view.ts`
- Modify: `src/types/index.ts` (`export * from './readiness';`), `src/lib/readiness/exam-map.ts`, `src/components/readiness/ExamMap.tsx`, `src/components/readiness/MarksToGain.tsx`, `src/lib/readiness/band.ts`, `src/components/readiness/ReadinessBand.tsx`
- Test: `tests/readiness-view.test.ts` (new); `tests/exam-map.test.ts`, `tests/readiness-band.test.ts`, `tests/readiness-components.test.ts` (add cases)

**Interfaces:**
- Consumes: backend shapes from Tasks 10 and 12 (views, `PathItemView`, `TrendPoint`, class view types, `WeightedAnswer`); existing `ExamTopic`, `layoutExamMap`, `TILE_LABEL`, `bandSentence`, `masteryLevel`.
- Produces:
  - Types: `ReadinessTopic`, `ReadinessPaper`, `ReadinessBandValue`, `LevelRange`, `ReadinessPathItem`, `ReadinessView`, `ReadinessSubjectCard`, `MyReadiness`, `ReadinessTrendPoint`, `ClassSubjectPair`, `ClassReadinessTopic`, `ClassNeedGroup`, `ClassReadinessLearner`, `ClassReadinessView`, `ReadinessWeightedAnswer`, `ExamBlueprintRecord`, `BlueprintReport`
  - `ExamTopic.answers?: number`; `TileLevel` gains `'thin'`; `TILE_LABEL.thin = 'Too few answers'`; `ExamMapTile.answers: number`
  - `bandSentence({ low, high, target, targetKind?: 'mine' | 'next_level' })`
  - View helpers:
    - `toExamTopics(paper: ReadinessPaper): ExamTopic[]`
    - `levelText(r: LevelRange | null): string`, `bandLine(band: { low: number; high: number } | null, levels: LevelRange | null): string`
    - `nearestPaper(papers: readonly ReadinessPaper[], now: Date): string`, `examDateOf(day: string): Date`
    - `trendSeries(points: readonly ReadinessTrendPoint[], paperKey: string): { points: Array<{ label: string; value: number }>; label: string; backfilled: boolean }`
    - `gateLines(gate: ReadinessPaper['gate']): Array<{ label: string; value: number; max: number; percent: number }>`
    - `actionText(action: ReadinessPathItem['action']): string`, `pathStateText(item: ReadinessPathItem): string`
    - `practiceHref(itemId: string): string`, `nextUpFor(item: ReadinessPathItem): { eyebrow: string; title: string; detail: string; actionLabel: string; href: string }`

- [ ] **Step 1: Create the worktree once L-C has merged**

```bash
git -C C:/dev/campusly/campusly-frontend log --oneline -5 origin/master
git -C C:/dev/campusly/campusly-frontend worktree add C:/dev/campusly/.worktrees/frontend-readiness -b feat/readiness-path origin/master
cd C:/dev/campusly/.worktrees/frontend-readiness && npm ci
ls src/lib/nav/student-nav.ts src/lib/standalone-student-paths.ts src/lib/user-from-api.ts
npx vitest run
```

Expected:
- The log names the orchestrator's L-C merge.
- The three files exist. If one is missing, L-C has not merged: stop, and report to the orchestrator.
- `vitest` is green.

- [ ] **Step 2: Write the failing tests**

```ts
// tests/readiness-view.test.ts
import { describe, expect, it } from 'vitest';
import {
  actionText, bandLine, examDateOf, gateLines, levelText, nearestPaper, nextUpFor, pathStateText, toExamTopics, trendSeries,
} from '../src/lib/readiness/view';
import type { ReadinessPaper, ReadinessPathItem, ReadinessTrendPoint } from '../src/types/readiness';

const paper = (key: string, examDate: string | null, topics: ReadinessPaper['topics'] = []): ReadinessPaper => ({
  key, title: `Paper ${key.slice(1)}`, totalMarks: 150, durationMinutes: 180, examDate, state: 'predicted', band: { low: 49, high: 65 },
  levelRange: { low: 3, high: 5 }, gate: { answers: 11, answersNeeded: 20, testedMarks: 35, testedMarksNeeded: 75 }, levels: [], explanation: [], topics,
});
const topic = (key: string, status: 'tested' | 'thin' | 'untested', mastery: number | null, answers: number): ReadinessPaper['topics'][number] => ({
  key, label: key, group: 'Functions and calculus', marks: 35, status, mastery, answers, lastAnsweredAt: null, marksToGain: null, due: true, subtopics: [], misconceptions: [],
});
const item = (over: Partial<ReadinessPathItem> = {}): ReadinessPathItem => ({
  id: 'i1', rank: 1, weekStart: '2026-09-28', paperKey: 'P1', topicKey: 'P1.FUNC', topicLabel: 'Functions and graphs', action: 'practice',
  misconception: { typeId: 't', label: "Didn't restrict the domain" }, marksToGain: 18, why: 'Functions and graphs is 35 marks in Paper 1.',
  state: 'open', pinned: false, startedAt: null, doneAt: null, score: 20, ...over,
});

describe('readiness view helpers', () => {
  it('maps a paper to exam-map topics: mastery only when tested, answers for thin tiles', () => {
    expect(toExamTopics(paper('P1', null, [topic('A', 'tested', 49, 12), topic('B', 'thin', null, 2), topic('C', 'untested', null, 0)]))).toEqual([
      { id: 'A', name: 'A', section: 'Functions and calculus', marks: 35, mastery: 49, answers: 12 },
      { id: 'B', name: 'B', section: 'Functions and calculus', marks: 35, mastery: null, answers: 2 },
      { id: 'C', name: 'C', section: 'Functions and calculus', marks: 35, mastery: null, answers: 0 },
    ]);
  });

  it('writes a band as a range and NSC levels, never one mark (spec §12.3)', () => {
    expect(bandLine({ low: 49, high: 65 }, { low: 3, high: 5 })).toBe('49–65% · level 3–5');
    expect(levelText({ low: 4, high: 4 })).toBe('level 4');
    expect(bandLine(null, null)).toBe('');
  });

  it('opens on the paper with the nearest date still to come', () => {
    const now = new Date('2026-10-28T08:00:00Z');
    expect(nearestPaper([paper('P1', '2026-10-27'), paper('P2', '2026-10-30')], now)).toBe('P2');
    expect(nearestPaper([paper('P1', null), paper('P2', null)], now)).toBe('P1');
    expect(examDateOf('2026-10-27').toISOString()).toBe('2026-10-27T06:00:00.000Z');
  });

  it("plots the middle of the range per week and names the ranges, not a mark, for screen readers", () => {
    const points: ReadinessTrendPoint[] = [
      { weekStart: '2026-09-14', label: '14 Sep', papers: { P1: { low: 44, high: 58, mid: 51 } }, both: null, backfilled: true },
      { weekStart: '2026-09-21', label: '21 Sep', papers: { P1: null }, both: null, backfilled: false },
      { weekStart: '2026-09-28', label: '28 Sep', papers: { P1: { low: 49, high: 65, mid: 57 } }, both: null, backfilled: false },
    ];
    expect(trendSeries(points, 'P1')).toEqual({
      points: [{ label: '14 Sep', value: 51 }, { label: '28 Sep', value: 57 }],
      label: 'Your predicted range over 2 weeks: from 44–58% to 49–65%.', backfilled: true,
    });
  });

  it('shows progress to the gate', () => {
    expect(gateLines({ answers: 11, answersNeeded: 20, testedMarks: 35, testedMarksNeeded: 75 })).toEqual([
      { label: 'Answers', value: 11, max: 20, percent: 55 }, { label: 'Marks tested', value: 35, max: 75, percent: 47 },
    ]);
  });

  it('turns the top path item into the NextUp card', () => {
    expect(nextUpFor(item())).toEqual({
      eyebrow: 'This week · Practice · 5 questions', title: "Functions and graphs: Didn't restrict the domain",
      detail: 'Functions and graphs is 35 marks in Paper 1.', actionLabel: 'Start practice', href: '/student/ai-tutor/practice?item=i1',
    });
    expect(nextUpFor(item({ action: 'check_in', misconception: null })).actionLabel).toBe('Start check-in');
    expect(actionText('check_in')).toBe('Check-in · 5 questions');
    expect(pathStateText(item({ state: 'done', doneAt: '2026-09-29T10:00:00Z' }))).toBe('Done Tue');
    expect(pathStateText(item({ state: 'started' }))).toBe('Started');
  });
});
```

Add to `tests/exam-map.test.ts`:

```ts
describe('thin topics (Phase R ruling RP16)', () => {
  it('a topic with answers but no mastery is thin, not untested, and never a colour', () => {
    const [row] = layoutExamMap([{ id: 'fin', name: 'Finance', section: 'A', marks: 15, mastery: null, answers: 2 }]);
    expect(row.tiles[0]).toMatchObject({ level: 'thin', marksToGain: null, answers: 2 });
    expect(examMapLabel('Paper 1', [row])).toBe('Paper 1: 15 marks in 1 topic; 1 too few answers');
  });
});
```

Add to `tests/readiness-band.test.ts`:

```ts
it('names a default target "Next level", not "your target"', () => {
  expect(bandSentence({ low: 49, high: 65, target: 70, targetKind: 'next_level' })).toBe('Heading for 49–65%. Next level 70%: 5 points to go.');
});
```

Add to `tests/readiness-components.test.ts`:

```ts
it('a thin tile is drawn exactly like an untested one (Phase R ruling RP16)', () => {
  expect(read('ExamMap.tsx')).toMatch(/thin: 'border border-dashed border-border bg-card text-muted-foreground'/);
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run tests/readiness-view.test.ts tests/exam-map.test.ts tests/readiness-band.test.ts tests/readiness-components.test.ts`
Expected: FAIL, with `Cannot find module '../src/lib/readiness/view'` and `level: 'untested'` where `'thin'` is expected.

- [ ] **Step 4: Implement the types**

```ts
// src/types/readiness.ts
//
// Phase R API shapes (backend src/modules/Readiness/views.ts, path-service.ts, snapshots.ts, class-aggregate.ts).
export type ReadinessTopicStatus = 'tested' | 'thin' | 'untested';
export type ReadinessPaperState = 'predicted' | 'not_enough_evidence';
export type ReadinessSource = 'test' | 'homework' | 'unit_check' | 'practice' | 'library';
export interface LevelRange { low: number; high: number }
export interface ReadinessBandValue { low: number; high: number; mid?: number; lowMarks?: number; highMarks?: number }
export interface ReadinessTopic {
  key: string; label: string; group: string; marks: number; status: ReadinessTopicStatus; mastery: number | null; answers: number;
  lastAnsweredAt: string | null; marksToGain: number | null; due: boolean;
  subtopics: Array<{ nodeId: string; title: string; mastery: number | null; answers: number }>;
  misconceptions: Array<{ typeId: string; label: string; count: number; lastSeenAt: string }>;
  effectiveAnswers?: number; bySource?: Partial<Record<ReadinessSource, { answers: number; mastery: number | null }>>;
}
export interface ReadinessLevel { key: string; label: string; examPercent: number; evidencePercent: number | null; mastery: number | null; answers: number }
export interface ReadinessPaper {
  key: string; title: string; totalMarks: number; durationMinutes: number; examDate: string | null; state: ReadinessPaperState;
  band: ReadinessBandValue | null; levelRange: LevelRange | null;
  gate: { answers: number; answersNeeded: number; testedMarks: number; testedMarksNeeded: number };
  levels: ReadinessLevel[]; explanation: string[]; topics: ReadinessTopic[]; predictedMarks?: number; adjustmentMarks?: number | null;
}
export type ReadinessPathAction = 'practice' | 'check_in' | 'explainer' | 'mini_mock';
export type ReadinessPathState = 'open' | 'started' | 'done' | 'expired' | 'removed' | 'replaced';
export interface ReadinessPathItem {
  id: string; rank: number; weekStart: string; paperKey: string; topicKey: string; topicLabel: string; action: ReadinessPathAction;
  misconception: { typeId: string; label: string } | null; marksToGain: number | null; why: string; state: ReadinessPathState;
  pinned: boolean; startedAt: string | null; doneAt: string | null; score: number;
}
export interface ReadinessView {
  subject: { slug: string; title: string; grade: number };
  blueprint: { id: string; examYear: number; version: number; verified: boolean };
  computedAt: string | null; answers: number; unmappedAnswers: number;
  target: { percent: number; kind: 'mine' | 'next_level' } | null;
  papers: ReadinessPaper[]; both: { band: ReadinessBandValue; levelRange: LevelRange } | null; path: ReadinessPathItem[];
}
export interface ReadinessSubjectCard {
  slug: string; subjectTitle: string; grade: number;
  papers: Array<{ key: string; title: string; examDate: string | null; state: ReadinessPaperState; band: { low: number; high: number } | null; levelRange: LevelRange | null }>;
}
export interface MyReadiness { subjects: ReadinessSubjectCard[]; next: (ReadinessPathItem & { slug: string; subjectTitle: string }) | null }
export interface ReadinessTrendPoint {
  weekStart: string; label: string; papers: Record<string, { low: number | null; high: number | null; mid: number | null } | null>;
  both: number | null; backfilled: boolean;
}
export interface ClassSubjectPair { classId: string; className: string; slug: string; subjectTitle: string; grade: number; learners: number }
export interface ClassReadinessTopic {
  key: string; label: string; group: string; marks: number; averageMastery: number | null;
  counts: { secure: number; building: number; weak: number; untested: number };
}
export interface ClassNeedGroup {
  kind: 'topic' | 'misconception'; key: string; label: string; topicKey: string; topicLabel: string; marksAtStake: number;
  marksEach: number | null; learners: Array<{ studentId: string; name: string }>;
}
export interface ClassReadinessLearner {
  studentId: string; name: string; state: ReadinessPaperState | 'no_evidence'; band: ReadinessBandValue | null; levelRange: LevelRange | null;
  change4w: number | null; answers: number; weakestTopic: { key: string; label: string; mastery: number } | null;
}
export interface ClassReadinessView {
  classId: string; className: string; subject: { slug: string; title: string; grade: number };
  blueprint: ReadinessView['blueprint']; paper: { key: string; title: string; totalMarks: number; examDate: string | null };
  learners: { total: number; predicted: number; notEnough: number; noEvidence: number };
  medianMid: number | null; topics: ClassReadinessTopic[]; groups: ClassNeedGroup[]; updatedAt: string;
}
export interface ReadinessWeightedAnswer {
  id: string; markedAt: string; sourceType: ReadinessSource; parentId: string; recordId: string; itemKey: string;
  marksAwarded: number; marksAvailable: number; level: string | null; counted: boolean;
  weight: { recency: number; source: number; tag: number; override: number; total: number };
}
export interface BlueprintReport { errors: string[]; warnings: string[]; unverified: string[]; parseErrors?: string[] }
export interface ExamBlueprintRecord {
  _id: string; family: string; subjectTitle: string; slug: string; grade: number; examYear: number; version: number;
  status: 'draft' | 'published' | 'retired'; updatedAt: string;
  cognitiveScheme: { key: string; levels: Array<{ key: string; label: string; percent: number; sourceRef: string; verified: boolean }> };
  papers: Array<{
    key: string; title: string; totalMarks: number; durationMinutes: number; examDate: string | null; sitting: 'morning' | 'afternoon' | null;
    sourceRef: string; verified: boolean;
    topics: Array<{ key: string; label: string; marks: number; note: string; sourceRef: string; verified: boolean; nodes: Array<{ code: string }> }>;
  }>;
}
```

Add `export * from './readiness';` to `src/types/index.ts`.

- [ ] **Step 5: Implement the helpers and the `thin` tile**

```ts
// src/lib/readiness/view.ts
//
// Phase R screen helpers (pure; vitest runs in node). Learners see ranges and NSC levels, never one mark (§12.3).
import type { ExamTopic } from './exam-map';
import type { LevelRange, ReadinessPaper, ReadinessPathItem, ReadinessTrendPoint } from '@/types/readiness';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SAST_MS = 2 * 3600_000;

export function toExamTopics(paper: ReadinessPaper): ExamTopic[] {
  return paper.topics.map((t) => ({
    id: t.key, name: t.label, section: t.group, marks: t.marks, mastery: t.status === 'tested' ? t.mastery : null, answers: t.answers,
  }));
}

export function levelText(r: LevelRange | null): string {
  if (!r) return '';
  return r.low === r.high ? `level ${r.low}` : `level ${r.low}–${r.high}`;
}

export function bandLine(band: { low: number; high: number } | null, levels: LevelRange | null): string {
  return band ? `${band.low}–${band.high}% · ${levelText(levels)}` : '';
}

/** An exam day (YYYY-MM-DD, SAST) as the instant 08:00 SAST, for Countdown. */
export function examDateOf(day: string): Date {
  return new Date(Date.parse(`${day}T08:00:00Z`) - SAST_MS);
}

export function nearestPaper(papers: readonly ReadinessPaper[], now: Date): string {
  const ahead = papers
    .filter((p) => p.examDate !== null && examDateOf(p.examDate).getTime() >= now.getTime() - 86_400_000)
    .sort((a, b) => (a.examDate ?? '').localeCompare(b.examDate ?? ''));
  return ahead[0]?.key ?? papers[0]?.key ?? '';
}

export function trendSeries(points: readonly ReadinessTrendPoint[], paperKey: string): {
  points: Array<{ label: string; value: number }>; label: string; backfilled: boolean;
} {
  const kept = points.filter((p) => p.papers[paperKey]?.mid != null);
  const range = (p: ReadinessTrendPoint) => `${p.papers[paperKey]?.low}–${p.papers[paperKey]?.high}%`;
  return {
    points: kept.map((p) => ({ label: p.label, value: p.papers[paperKey]!.mid as number })),
    label: kept.length < 2 ? 'Your predicted range: not enough weeks for a trend yet.'
      : `Your predicted range over ${kept.length} weeks: from ${range(kept[0])} to ${range(kept[kept.length - 1])}.`,
    backfilled: kept.some((p) => p.backfilled),
  };
}

export function gateLines(gate: ReadinessPaper['gate']): Array<{ label: string; value: number; max: number; percent: number }> {
  const line = (label: string, value: number, max: number) => ({ label, value, max, percent: Math.min(100, Math.round((value / Math.max(1, max)) * 100)) });
  return [line('Answers', gate.answers, gate.answersNeeded), line('Marks tested', gate.testedMarks, gate.testedMarksNeeded)];
}

export function actionText(action: ReadinessPathItem['action']): string {
  if (action === 'check_in') return 'Check-in · 5 questions';
  if (action === 'explainer') return 'Explainer';
  if (action === 'mini_mock') return 'Mini-mock';
  return 'Practice · 5 questions';
}

export function pathStateText(item: ReadinessPathItem): string {
  if (item.state === 'done') {
    return item.doneAt ? `Done ${WEEKDAYS[new Date(Date.parse(item.doneAt) + SAST_MS).getUTCDay()]}` : 'Done';
  }
  return item.state === 'started' ? 'Started' : 'To do';
}

export const practiceHref = (itemId: string): string => `/student/ai-tutor/practice?item=${encodeURIComponent(itemId)}`;

export function nextUpFor(item: ReadinessPathItem): { eyebrow: string; title: string; detail: string; actionLabel: string; href: string } {
  return {
    eyebrow: `This week · ${actionText(item.action)}`,
    title: item.misconception ? `${item.topicLabel}: ${item.misconception.label}` : item.topicLabel,
    detail: item.why, actionLabel: item.action === 'check_in' ? 'Start check-in' : 'Start practice', href: practiceHref(item.id),
  };
}
```

`src/lib/readiness/exam-map.ts`:
- `ExamTopic` gains `/** Answers so far; a topic with answers but no mastery is "thin" (Phase R ruling RP16). */ answers?: number;`
- `export type TileLevel = MasteryLevel | 'thin' | 'untested';`
- `ExamMapTile` gains `answers: number;`
- `TILE_LABEL` becomes `{ ...MASTERY_LABEL, thin: 'Too few answers', untested: 'Not yet tested' }`.
- In `layoutExamMap`, compute the level as `tested ? masteryLevel(topic.mastery as number) : (topic.answers ?? 0) > 0 ? 'thin' : 'untested'`, and set `answers: topic.answers ?? 0`.
- In `examMapLabel`, change the level order to `(['weak', 'building', 'secure', 'thin', 'untested'] as const)`.

`src/components/readiness/ExamMap.tsx`:
- Add `thin: 'border border-dashed border-border bg-card text-muted-foreground',` to `TILE_CLASS`.
- In the value line, replace `{tile.mastery === null ? TILE_LABEL.untested : `${tile.mastery}%`}` with:

```tsx
{tile.mastery !== null ? `${tile.mastery}%` : tile.level === 'thin' ? `${tile.answers} ${tile.answers === 1 ? 'answer' : 'answers'} so far` : TILE_LABEL.untested}
```

`src/components/readiness/MarksToGain.tsx`:
- Add `thin: 'bg-transparent',` to `BAR`.
- Change the badge condition to `t.level === 'untested' || t.level === 'thin' ? <Badge variant="secondary">{TILE_LABEL[t.level]}</Badge> : <Badge variant={t.level}>{TILE_LABEL[t.level]}</Badge>`.
- Add an optional prop `onSelect?: (id: string) => void`, used by Task 15's topic sheet. When it is given, render the topic name as:

```tsx
<button type="button" onClick={() => onSelect(t.id)} className={cn('min-h-11 truncate text-left font-semibold hover:underline md:min-h-0', FOCUS_RING)}>{t.name}</button>
```

  Otherwise render the existing `<span>`. Import `FOCUS_RING` from `@/components/ui/focus`.

`src/lib/readiness/band.ts`:
- `ReadinessBandInput` gains `targetKind?: 'mine' | 'next_level'`.
- In `bandSentence`, when `input.targetKind === 'next_level'` and the band does not reach the target, return `${band} Next level ${g.targetAt}%: ${g.toTarget} points to go.`
- When it reaches the target, return `${band} At or past the next level, ${g.targetAt}%.`
- Otherwise keep the existing sentences.

`src/components/readiness/ReadinessBand.tsx`: accept `targetKind?: 'mine' | 'next_level'` and pass it to `bandSentence`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing. The existing exam-map, band and component tests still pass.

- [ ] **Step 7: Commit**

```bash
git add src tests
LANE_SWEEP_OK=1 git commit -m "feat(readiness): readiness types and view helpers; a thin tile for topics with too few answers; the next-level target sentence" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 15: hooks and the learner readiness components

**Files:**
- Create: `src/hooks/useMyReadiness.ts`, `src/hooks/useReadinessSubject.ts`, `src/hooks/useReadinessActions.ts`
- Create: `src/components/readiness/NotEnoughEvidence.tsx`, `ReadinessWhy.tsx`, `PathList.tsx`, `TopicSheet.tsx`, `PaperPanel.tsx`, `ReadinessSubjectView.tsx`
- Modify: `src/components/readiness/index.ts` (export the six new components)
- Test: `tests/readiness-screens.test.ts`

**Interfaces:**
- Consumes: Task 14 helpers and types; `apiClient` (`src/lib/api-client.ts`), `unwrapResponse` and `extractErrorMessage` (`src/lib/api-helpers.ts`); the readiness components.
- Produces:
  - `useMyReadiness(enabled?: boolean): { data: MyReadiness | null; loading: boolean; error: string | null; refresh: () => void }`
  - `useReadinessSubject(source: { kind: 'me'; slug: string } | { kind: 'learner'; studentId: string; slug: string }): { view: ReadinessView | null; trend: ReadinessTrendPoint[]; loading: boolean; error: string | null; refresh: () => void }`
  - `useReadinessActions(): { setTarget: (slug: string, percent: number | null) => Promise<boolean> }`
  - `<ReadinessSubjectView view trend now audience onStart? onRemove? headerSlot? />`

- [ ] **Step 1: Write the failing test**

```ts
// tests/readiness-screens.test.ts
import { describe, expect, it } from 'vitest';
import { findColourLiterals, findPaletteClasses, findTints } from '../src/lib/design/palette-scan';
import { readSource } from './support/source';

const COMPONENTS = ['NotEnoughEvidence.tsx', 'ReadinessWhy.tsx', 'PathList.tsx', 'TopicSheet.tsx', 'PaperPanel.tsx', 'ReadinessSubjectView.tsx']
  .map((f: string) => `src/components/readiness/${f}`);
const HOOKS = ['useMyReadiness.ts', 'useReadinessSubject.ts', 'useReadinessActions.ts'].map((f: string) => `src/hooks/${f}`);

describe('Phase R learner components (Blueprint rules, memory campusly-no-tints)', () => {
  it.each(COMPONENTS)('%s: no tints, no palette classes, no colour literals, no re-typed mastery thresholds, ≤ 300 lines, no apiClient', (file) => {
    const src = readSource(file);
    expect(findTints(src)).toEqual([]);
    expect(findPaletteClasses(src)).toEqual([]);
    expect(findColourLiterals(src)).toEqual([]);
    expect(src).not.toMatch(/[<>]=?\s*(60|70)\b/);
    expect(src.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(src).not.toMatch(/api-client/);
  });

  it('the learner view never prints marks (spec §12.3)', () => {
    const panel = readSource('src/components/readiness/PaperPanel.tsx');
    expect(panel).toMatch(/audience === 'teacher'[\s\S]*lowMarks/);
    expect(panel).not.toMatch(/predictedMarks/);
  });

  it('below the gate, progress bars are solid on a neutral track', () => {
    const src = readSource('src/components/readiness/NotEnoughEvidence.tsx');
    expect(src).toMatch(/bg-muted/);
    expect(src).toMatch(/bg-primary/);
    expect(src).toMatch(/role="progressbar"/);
  });

  it.each(HOOKS)('%s holds the API calls and types its errors', (file) => {
    const src = readSource(file);
    expect(src).toMatch(/catch \(err: unknown\)/);
    expect(src.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/readiness-screens.test.ts`
Expected: FAIL, with ENOENT for `src/components/readiness/NotEnoughEvidence.tsx`.

- [ ] **Step 3: Implement the hooks**

```ts
// src/hooks/useMyReadiness.ts
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { MyReadiness } from '@/types';

/** GET /readiness/me: the learner's subjects and Today's one item. Off (no request) unless the user has readiness. */
export function useMyReadiness(enabled = true): { data: MyReadiness | null; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<MyReadiness | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const refresh = useCallback(() => setKey((k: number) => k + 1), []);
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient.get('/readiness/me')
      .then((res) => { if (!cancelled) setData(unwrapResponse<MyReadiness>(res)); })
      .catch((err: unknown) => {
        console.error('Failed to load readiness', err);
        if (!cancelled) setError("Your readiness couldn't load. Check your connection and try again.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, key]);
  return { data, loading, error, refresh };
}
```

```ts
// src/hooks/useReadinessSubject.ts
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { ReadinessTrendPoint, ReadinessView } from '@/types';

export type ReadinessSource = { kind: 'me'; slug: string } | { kind: 'learner'; studentId: string; slug: string };

function urls(s: ReadinessSource): [string, string] {
  if (s.kind === 'me') return [`/readiness/me/subjects/${s.slug}`, `/readiness/me/subjects/${s.slug}/trend?weeks=12`];
  const q = `subject=${encodeURIComponent(s.slug)}`;
  return [`/readiness/learners/${s.studentId}?${q}`, `/readiness/learners/${s.studentId}/trend?${q}&weeks=12`];
}

/** One subject's readiness and its 12-week trend, for the learner or (teacher) for one learner. */
export function useReadinessSubject(source: ReadinessSource): {
  view: ReadinessView | null; trend: ReadinessTrendPoint[]; loading: boolean; error: string | null; refresh: () => void;
} {
  const [view, setView] = useState<ReadinessView | null>(null);
  const [trend, setTrend] = useState<ReadinessTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const refresh = useCallback(() => setKey((k: number) => k + 1), []);
  const [viewUrl, trendUrl] = urls(source);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([apiClient.get(viewUrl), apiClient.get(trendUrl)])
      .then(([v, t]) => {
        if (cancelled) return;
        setView(unwrapResponse<ReadinessView>(v));
        setTrend(unwrapResponse<{ points: ReadinessTrendPoint[] }>(t).points ?? []);
      })
      .catch((err: unknown) => {
        console.error('Failed to load subject readiness', err);
        if (!cancelled) { setView(null); setError("This readiness couldn't load. Check your connection and try again."); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [viewUrl, trendUrl, key]);
  return { view, trend, loading, error, refresh };
}
```

```ts
// src/hooks/useReadinessActions.ts
import { useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';

export function useReadinessActions(): { setTarget: (slug: string, percent: number | null) => Promise<boolean> } {
  const setTarget = useCallback(async (slug: string, percent: number | null) => {
    try {
      await apiClient.put(`/readiness/me/subjects/${slug}/target`, { percent });
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't save your target"));
      return false;
    }
  }, []);
  return { setTarget };
}
```

- [ ] **Step 4: Implement the components**

```tsx
// src/components/readiness/NotEnoughEvidence.tsx
import { gateLines } from '@/lib/readiness/view';
import type { ReadinessPaper } from '@/types';

/** Spec §3.6: below the gate, progress toward a prediction instead of a band. Solid bars on a neutral track. */
export function NotEnoughEvidence({ gate }: { gate: ReadinessPaper['gate'] }) {
  return (
    <div className="space-y-3">
      <p className="font-heading text-h3 font-semibold">Not enough evidence for a prediction yet</p>
      <ul className="space-y-3">
        {gateLines(gate).map((line) => (
          <li key={line.label} className="space-y-1.5">
            <div className="flex justify-between gap-3 text-sm">
              <span>{line.label}</span>
              <span className="tabular-nums text-muted-foreground">{line.value} of {line.max}</span>
            </div>
            <div role="progressbar" aria-label={line.label} aria-valuenow={line.value} aria-valuemin={0} aria-valuemax={line.max} className="h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${line.percent}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/components/readiness/ReadinessWhy.tsx
'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/components/ui/focus';

/** Spec §3.9: "Why this range", the explanation lines behind a disclosure. */
export function ReadinessWhy({ lines, defaultOpen = false }: { lines: readonly string[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  if (lines.length === 0) return null;
  return (
    <div>
      <button
        type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o: boolean) => !o)}
        className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-control text-sm font-semibold text-primary md:min-h-0', FOCUS_RING)}
      >
        Why this range
        <ChevronDown aria-hidden className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <ul id={id} className="mt-2 space-y-2 text-sm text-muted-foreground">
          {lines.map((l: string) => <li key={l}>{l}</li>)}
        </ul>
      ) : null}
    </div>
  );
}
```

```tsx
// src/components/readiness/PathList.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { actionText, pathStateText } from '@/lib/readiness/view';
import type { ReadinessPathItem } from '@/types';

interface PathListProps {
  items: readonly ReadinessPathItem[];
  /** The item shown as the page's NextUp; it gets no second Start button. */
  primaryId: string | null;
  onStart?: (id: string) => void;
  onRemove?: (id: string) => void;
}

const live = (i: ReadinessPathItem) => i.state === 'open' || i.state === 'started';

/** Spec §5.1: "This week", up to three items with their state. */
export function PathList({ items, primaryId, onStart, onRemove }: PathListProps) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nothing urgent this week.</p>;
  return (
    <div className="space-y-2">
      {items.every((i: ReadinessPathItem) => i.state === 'done') ? <p className="text-sm font-semibold">Done for this week</p> : null}
      <ul className="divide-y divide-border">
        {items.map((item: ReadinessPathItem) => (
          <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
                {actionText(item.action)}{item.pinned ? ' · From your teacher' : ''}
              </p>
              <p className="font-semibold">{item.topicLabel}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{item.why}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={item.state === 'done' ? 'success' : 'secondary'}>{pathStateText(item)}</Badge>
              {onStart && item.id !== primaryId && live(item) ? (
                <Button variant="ghost" className="min-h-11 md:min-h-0" onClick={() => onStart(item.id)} aria-label={`Start ${item.topicLabel}`}>Start</Button>
              ) : null}
              {onRemove && live(item) ? (
                <Button variant="ghost" className="min-h-11 md:min-h-0" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.topicLabel} from this week`}>Remove</Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/components/readiness/TopicSheet.tsx
'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { masteryLevel } from '@/lib/readiness/mastery';
import { TILE_LABEL } from '@/lib/readiness/exam-map';
import type { ReadinessTopic } from '@/types';

interface TopicSheetProps {
  topic: ReadinessTopic | null;
  onClose: () => void;
  onPractise?: (topicKey: string) => void;
  /** Teacher only: the answers behind this topic (Task 19). */
  children?: ReactNode;
}

const levelOf = (t: ReadinessTopic) => (t.status === 'tested' && t.mastery !== null ? masteryLevel(t.mastery) : t.status);

/** Spec §5.1: one topic's evidence: mastery, answers, when, misconceptions and subtopics. */
export function TopicSheet({ topic, onClose, onPractise, children }: TopicSheetProps) {
  return (
    <Sheet open={topic !== null} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto sm:mx-auto sm:max-w-xl">
        {topic ? (
          <>
            <SheetHeader>
              <SheetTitle>{topic.label}</SheetTitle>
              <SheetDescription>{topic.marks} marks in the exam · {topic.answers} {topic.answers === 1 ? 'answer' : 'answers'}</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={levelOf(topic) === 'thin' || levelOf(topic) === 'untested' ? 'secondary' : (levelOf(topic) as 'secure' | 'building' | 'weak')}>
                  {TILE_LABEL[levelOf(topic)]}
                </Badge>
                {topic.mastery !== null ? <span className="font-heading text-h3 font-semibold tabular-nums">{topic.mastery}%</span> : null}
                {topic.effectiveAnswers !== undefined ? <span className="text-sm text-muted-foreground">{topic.effectiveAnswers} weighted answers</span> : null}
              </div>
              {topic.misconceptions.length > 0 ? (
                <section className="space-y-1">
                  <h3 className="text-eyebrow font-semibold uppercase text-muted-foreground">Keeps coming up</h3>
                  <ul className="space-y-1 text-sm">
                    {topic.misconceptions.map((m) => <li key={m.typeId}>{m.label} <span className="text-muted-foreground">({m.count})</span></li>)}
                  </ul>
                </section>
              ) : null}
              {topic.subtopics.length > 0 ? (
                <section className="space-y-1">
                  <h3 className="text-eyebrow font-semibold uppercase text-muted-foreground">By subtopic</h3>
                  <ul className="divide-y divide-border text-sm">
                    {topic.subtopics.map((s) => (
                      <li key={s.nodeId} className="flex justify-between gap-3 py-2">
                        <span className="min-w-0 truncate">{s.title || 'Subtopic'}</span>
                        <span className="tabular-nums text-muted-foreground">{s.mastery === null ? `${s.answers} answers` : `${s.mastery}%`}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {children}
              {onPractise ? <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => onPractise(topic.key)}>Practise this topic</Button> : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
```

```tsx
// src/components/readiness/PaperPanel.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Countdown } from './Countdown';
import { ExamMap } from './ExamMap';
import { MarksToGain } from './MarksToGain';
import { NextUp } from './NextUp';
import { NotEnoughEvidence } from './NotEnoughEvidence';
import { ReadinessBand } from './ReadinessBand';
import { ReadinessWhy } from './ReadinessWhy';
import { TrendChart } from './TrendChart';
import { bandLine, examDateOf, nextUpFor, toExamTopics, trendSeries } from '@/lib/readiness/view';
import type { ReadinessPaper, ReadinessPathItem, ReadinessTrendPoint, ReadinessView } from '@/types';

interface PaperPanelProps {
  paper: ReadinessPaper; view: ReadinessView; trend: readonly ReadinessTrendPoint[]; now: Date;
  audience: 'learner' | 'teacher'; primary: ReadinessPathItem | null; onSelectTopic: (key: string) => void;
}

/** One paper (spec §5.1): countdown, next up, band or progress to the gate, why, exam map, marks to gain, trend. */
export function PaperPanel({ paper, view, trend, now, audience, primary, onSelectTopic }: PaperPanelProps) {
  const series = trendSeries(trend, paper.key);
  const marks = audience === 'teacher' && paper.band?.lowMarks !== undefined
    ? ` (${paper.band.lowMarks}–${paper.band.highMarks} of ${paper.totalMarks} marks)` : '';
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-6">
        {paper.examDate ? <Countdown paper={paper.title} examDate={examDateOf(paper.examDate)} now={now} /> : (
          <p className="text-sm text-muted-foreground">The {paper.title} date isn&apos;t set yet.</p>
        )}
        <Card>
          <CardContent className="space-y-3">
            {paper.state === 'predicted' && paper.band && view.target ? (
              <>
                <p className="font-heading text-h3 font-semibold tabular-nums">{bandLine(paper.band, paper.levelRange)}{marks}</p>
                <ReadinessBand low={paper.band.low} high={paper.band.high} target={view.target.percent} targetKind={view.target.kind} />
              </>
            ) : <NotEnoughEvidence gate={paper.gate} />}
            <ReadinessWhy lines={paper.explanation} defaultOpen={audience === 'teacher'} />
            <p className="text-caption text-muted-foreground">
              This predicts {audience === 'learner' ? 'your' : 'the'} exam mark, not {audience === 'learner' ? 'your' : 'the'} final mark, which also counts school-based assessment.
            </p>
          </CardContent>
        </Card>
        <ExamMap paper={paper.title} topics={toExamTopics(paper)} />
      </div>
      <div className="space-y-6">
        {audience === 'learner' && primary ? <NextUp {...nextUpFor(primary)} /> : null}
        <section aria-labelledby={`gain-${paper.key}`} className="space-y-2">
          <h2 id={`gain-${paper.key}`} className="font-heading text-h3 font-semibold">Marks to gain</h2>
          <MarksToGain topics={toExamTopics(paper)} onSelect={onSelectTopic} />
        </section>
      </div>
      <section aria-labelledby={`trend-${paper.key}`} className="space-y-2 lg:col-span-2">
        <h2 id={`trend-${paper.key}`} className="font-heading text-h3 font-semibold">Your range, week by week</h2>
        <TrendChart points={series.points} target={view.target?.percent} label={series.label} />
        <p className="text-caption text-muted-foreground">
          The middle of the predicted range, week by week.{series.backfilled ? " Earlier weeks: what we'd have predicted from the work marked by then." : ''}
        </p>
      </section>
    </div>
  );
}
```

```tsx
// src/components/readiness/ReadinessSubjectView.tsx
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ExamMap } from './ExamMap';
import { PaperPanel } from './PaperPanel';
import { PathList } from './PathList';
import { TopicSheet } from './TopicSheet';
import { bandLine, nearestPaper, toExamTopics } from '@/lib/readiness/view';
import type { ReadinessPathItem, ReadinessTopic, ReadinessTrendPoint, ReadinessView } from '@/types';

interface ReadinessSubjectViewProps {
  view: ReadinessView; trend: readonly ReadinessTrendPoint[]; now: Date; audience: 'learner' | 'teacher';
  onStart?: (itemId: string) => void; onRemove?: (itemId: string) => void; onPractise?: (topicKey: string) => void;
  /** Teacher: the answers behind the open topic (Task 19). */
  topicExtra?: (topicKey: string) => ReactNode;
}

const live = (i: ReadinessPathItem) => i.state === 'open' || i.state === 'started';

/** A subject's readiness (spec §5.1 learner, §5.4 teacher): paper tabs, the paper panel, this week, and the topic sheet. */
export function ReadinessSubjectView({ view, trend, now, audience, onStart, onRemove, onPractise, topicExtra }: ReadinessSubjectViewProps) {
  const [paperKey, setPaperKey] = useState(() => nearestPaper(view.papers, now));
  const [topicKey, setTopicKey] = useState<string | null>(null);
  const paper = view.papers.find((p) => p.key === paperKey) ?? view.papers[0];
  const primary = view.path.find(live) ?? null;
  const topic: ReadinessTopic | null = useMemo(
    () => view.papers.flatMap((p) => p.topics).find((t) => t.key === topicKey) ?? null, [view.papers, topicKey],
  );
  return (
    <div className="space-y-6">
      {view.papers.length > 1 ? (
        <Tabs value={paperKey} onValueChange={(v: unknown) => setPaperKey(String(v))}>
          <TabsList>
            {view.papers.map((p) => <TabsTrigger key={p.key} value={p.key}>{p.title}</TabsTrigger>)}
            <TabsTrigger value="both">Both</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
      {paperKey === 'both' ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-1">
              <p className="text-eyebrow font-semibold uppercase text-muted-foreground">Both papers</p>
              <p className="font-heading text-h3 font-semibold tabular-nums">
                {view.both ? bandLine(view.both.band, view.both.levelRange) : 'Needs a prediction on every paper first'}
              </p>
            </CardContent>
          </Card>
          {view.papers.map((p) => <ExamMap key={p.key} paper={p.title} topics={toExamTopics(p)} />)}
        </div>
      ) : paper ? (
        <PaperPanel paper={paper} view={view} trend={trend} now={now} audience={audience} primary={primary} onSelectTopic={setTopicKey} />
      ) : null}
      <section aria-labelledby="this-week" className="space-y-2">
        <h2 id="this-week" className="font-heading text-h3 font-semibold">This week</h2>
        <PathList items={view.path} primaryId={audience === 'learner' ? primary?.id ?? null : null} onStart={onStart} onRemove={onRemove} />
      </section>
      <TopicSheet topic={topic} onClose={() => setTopicKey(null)} onPractise={onPractise}>
        {topic && topicExtra ? topicExtra(topic.key) : null}
      </TopicSheet>
    </div>
  );
}
```

`src/components/readiness/index.ts`: add exports for `NotEnoughEvidence`, `ReadinessWhy`, `PathList`, `TopicSheet`, `PaperPanel` and `ReadinessSubjectView`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing. `tests/no-tints.test.ts` already scans `src/components/readiness` (its `BLUEPRINT` list), so the new files are covered.

- [ ] **Step 6: Commit**

```bash
git add src tests
LANE_SWEEP_OK=1 git commit -m "feat(readiness): the subject readiness view: paper tabs, band or progress to the gate, why this range, exam map, marks to gain, this week, trend" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 16: the learner's readiness pages, and Readiness in the nav (feature-gated)

**Files:**
- Create: `src/app/(dashboard)/student/readiness/page.tsx`, `src/app/(dashboard)/student/readiness/[subject]/page.tsx`, `src/lib/nav-features.ts`
- Modify:
  - `src/lib/constants.ts` (`NavFeature`, `NavItem.feature`, Readiness second in `STUDENT_NAV`)
  - `src/lib/nav/student-nav.ts` (Readiness second)
  - `src/lib/standalone-student-paths.ts` (`'/student/readiness'`)
  - `src/app/(dashboard)/layout.tsx` (`withFeatures`)
  - `src/types/common.ts` (`User.readiness?: boolean`)
  - `src/lib/user-from-api.ts` (`readiness: raw.readiness === true`)
- Test: `tests/nav-features.test.ts` (new); `tests/student-nav.test.ts`, `tests/user-from-api.test.ts` (update)

**Interfaces:**
- Consumes: Task 15 (`useMyReadiness`, `useReadinessSubject`, `ReadinessSubjectView`); `PageHeader`, `ErrorState`, `EmptyState`, `Skeleton`.
- Produces:
  - `type NavFeature = 'readiness'`; `NavItem.feature?: NavFeature`
  - `withFeatures(items: readonly NavItem[], user: Pick<User, 'readiness'> | null): NavItem[]`
  - Pages `/student/readiness` and `/student/readiness/[subject]`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/nav-features.test.ts
import { describe, expect, it } from 'vitest';
import { STUDENT_NAV } from '../src/lib/constants';
import { STANDALONE_STUDENT_NAV } from '../src/lib/nav/student-nav';
import { withFeatures } from '../src/lib/nav-features';

describe('Readiness in the learner nav (spec §5.6, ruling RP9)', () => {
  it('is second, and only for learners with readiness', () => {
    expect(withFeatures(STANDALONE_STUDENT_NAV, { readiness: true }).map((i) => i.label).slice(0, 4)).toEqual(['Today', 'Readiness', 'Lessons', 'Homework']);
    expect(withFeatures(STANDALONE_STUDENT_NAV, { readiness: false }).map((i) => i.label)).not.toContain('Readiness');
    expect(withFeatures(STANDALONE_STUDENT_NAV, null).map((i) => i.label)).not.toContain('Readiness');
  });

  it('school learners get it second too, behind the same flag', () => {
    expect(withFeatures(STUDENT_NAV, { readiness: true })[1].label).toBe('Readiness');
    expect(withFeatures(STUDENT_NAV, { readiness: false }).map((i) => i.label)).not.toContain('Readiness');
  });
});
```

In `tests/student-nav.test.ts`, replace the "has exactly the seven items" test with:

```ts
  it('has exactly the eight items, Readiness second', () => {
    expect(STANDALONE_STUDENT_NAV.map((i) => `${i.label}:${i.href}`)).toEqual([
      'Today:/student', 'Readiness:/student/readiness', 'Lessons:/student/courses', 'Homework:/student/homework', 'Tests:/student/tests',
      'Marks:/student/grades', 'AI tutor:/student/ai-tutor', 'Profile:/student/profile',
    ]);
  });
```

Add `'/student/readiness/mathematics'` to the list in "allows the sub-pages the spec lists".

In `tests/user-from-api.test.ts`, add:

```ts
it('reads readiness', () => {
  expect(userFromApi({ _id: 'u1', role: 'student', readiness: true }).readiness).toBe(true);
  expect(userFromApi({ _id: 'u1', role: 'student' }).readiness).toBe(false);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/nav-features.test.ts tests/student-nav.test.ts tests/user-from-api.test.ts`
Expected: FAIL, with `Cannot find module '../src/lib/nav-features'` and the seven-item list.

- [ ] **Step 3: Implement the nav**

`src/lib/constants.ts`:
- Above `interface NavItem`, add `export type NavFeature = 'readiness';`.
- In `NavItem`, add `/** Shown only when the signed-in user has this feature (Phase R ruling RP9). */ feature?: NavFeature;`.
- In `STUDENT_NAV`, insert `{ label: 'Readiness', href: '/student/readiness', icon: Target, feature: 'readiness' },` right after the Dashboard item. Import `Target` from `lucide-react` if it isn't already.

`src/lib/nav/student-nav.ts`: import `Target` from `lucide-react`, and insert `{ label: 'Readiness', href: '/student/readiness', icon: Target, feature: 'readiness' },` right after Today.

`src/lib/standalone-student-paths.ts`: add `'/student/readiness',` after `'/student'`.

```ts
// src/lib/nav-features.ts
//
// Nav items behind a user flag from /auth/me (Phase R ruling RP9): filtered once in the dashboard layout, so the
// sidebar, bottom nav and their tests see only what the user may open.
import type { NavItem } from './constants';
import type { User } from '@/types';

export function withFeatures(items: readonly NavItem[], user: Pick<User, 'readiness'> | null): NavItem[] {
  const on = (item: NavItem): boolean => !item.feature || (item.feature === 'readiness' && user?.readiness === true);
  return items.filter(on).map((item: NavItem) => (item.children ? { ...item, children: item.children.filter(on) } : item));
}
```

`src/app/(dashboard)/layout.tsx`: import `withFeatures`. In the `navItems` `useMemo`:
- Wrap each `return` value: `return withFeatures(STANDALONE_TEACHER_NAV, user);`, `return withFeatures(STANDALONE_STUDENT_NAV, user);`, and for the composed nav `return withFeatures(filterByPermission(moduleFiltered, hasPermission), user);`.
- Leave `if (!user) return ADMIN_NAV;` as it is.

`src/types/common.ts`: add `/** Phase R: the user has readiness to see (a learner on a verified blueprint; a teacher of a blueprint grade). */ readiness?: boolean;` to `User`.

`src/lib/user-from-api.ts`: add `readiness: raw.readiness === true,` after `isStandaloneLearner`.

- [ ] **Step 4: Implement the pages**

```tsx
// src/app/(dashboard)/student/readiness/page.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Target } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useMyReadiness } from '@/hooks/useMyReadiness';
import { bandLine, examDateOf } from '@/lib/readiness/view';
import { countdownText } from '@/lib/readiness/countdown';
import type { ReadinessSubjectCard } from '@/types';

/** Spec §5.1: straight to the only subject, or a list of subjects. */
export default function ReadinessIndexPage() {
  const { data, loading, error, refresh } = useMyReadiness();
  const router = useRouter();
  const only = data?.subjects.length === 1 ? data.subjects[0].slug : null;
  useEffect(() => { if (only) router.replace(`/student/readiness/${only}`); }, [only, router]);

  if (error) return <ErrorState title="Readiness couldn't load" message={error} onRetry={refresh} retrying={loading} />;
  if (loading || !data || only) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Grade 12" title="Exam readiness" description="Where you stand for each exam paper, and what to do this week." />
      {data.subjects.length === 0 ? (
        <EmptyState icon={Target} title="Your readiness starts with your first marked test" description="When your teacher marks a test in a subject with an exam blueprint, it appears here." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.subjects.map((s: ReadinessSubjectCard) => {
            const next = s.papers.find((p) => p.examDate) ?? s.papers[0];
            return (
              <li key={s.slug}>
                <Link href={`/student/readiness/${s.slug}`} className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Card className="transition-colors hover:bg-muted">
                    <CardContent className="space-y-1">
                      <p className="font-heading text-h3 font-semibold">{s.subjectTitle}</p>
                      {next?.examDate ? <p className="text-sm text-muted-foreground">{countdownText(next.title, examDateOf(next.examDate), new Date())}</p> : null}
                      {s.papers.map((p) => (
                        <p key={p.key} className="text-sm tabular-nums">{p.title}: {p.band ? bandLine(p.band, p.levelRange) : 'Not enough evidence yet'}</p>
                      ))}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/student/readiness/[subject]/page.tsx
'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Target } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { ReadinessSubjectView } from '@/components/readiness/ReadinessSubjectView';
import { useReadinessSubject } from '@/hooks/useReadinessSubject';
import { practiceHref } from '@/lib/readiness/view';

/** Spec §5.1: "Exam readiness" for one subject. */
export default function ReadinessSubjectPage() {
  const params = useParams();
  const slug = typeof params.subject === 'string' ? params.subject : '';
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const { view, trend, loading, error, refresh } = useReadinessSubject({ kind: 'me', slug });

  if (error) return <ErrorState title="Readiness couldn't load" message={error} onRetry={refresh} retrying={loading} />;
  if (loading || !view) {
    return <div className="space-y-4"><Skeleton className="h-10 w-56" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }
  const updated = view.computedAt ? new Date(view.computedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }) : null;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${view.subject.title} · Grade ${view.subject.grade}`} title="Exam readiness"
        description={`From ${view.answers} answers${updated ? ` · updated ${updated}` : ''}`}
      />
      {view.answers === 0 ? (
        <EmptyState icon={Target} title={`Your readiness starts with your first marked test in ${view.subject.title}.`} description="Until then, here is how the exam is built." />
      ) : null}
      <ReadinessSubjectView
        view={view} trend={trend} now={now} audience="learner" onStart={(id: string) => router.push(practiceHref(id))}
        onPractise={(key: string) => {
          const label = view.papers.flatMap((p) => p.topics).find((t) => t.key === key)?.label ?? '';
          router.push(`/student/ai-tutor/practice?topic=${encodeURIComponent(label)}`);
        }}
      />
    </div>
  );
}
```

For a learner with no evidence, the view keeps showing the exam map (all untested), the countdown and the gate's progress. That is the spec's "No evidence" state.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.
- The student-nav test "every allowed page exists" finds `src/app/(dashboard)/student/readiness/page.tsx`.
- The phone-tabs test "every link stays reachable" passes: `STANDALONE_STUDENT_NAV` now has eight items, with the first four as tabs.
- The design-scope closure (`tests/support/design-scope.ts`, learner pages) now includes the two pages. The no-tints and palette scanners cover them.

- [ ] **Step 6: Commit**

```bash
git add src tests
LANE_SWEEP_OK=1 git commit -m "feat(readiness): the learner's Exam readiness pages, and Readiness second in the learner nav for learners who have it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 17: Today's next item from the path, and practice opened from a path item

**Files:**
- Modify: `src/lib/standalone-today.ts`, `src/components/student/StandaloneToday.tsx`, `src/app/(dashboard)/student/page.tsx`, `src/hooks/useAIPractice.ts`, `src/app/(dashboard)/student/ai-tutor/practice/page.tsx`
- Test: `tests/standalone-today.test.ts` (add cases)

**Interfaces:**
- Consumes: Task 15 (`useMyReadiness`); Task 14 (`nextUpFor`, `bandLine`); Task 11's route `POST /readiness/me/path/:itemId/start`.
- Produces:
  - `TodayItem.dueSoon?: boolean`
  - `dueDays(iso: string, now: Date): number`
  - `interface TodayPath { eyebrow: string; title: string; detail: string; actionLabel: string; href: string }`
  - `todayNextUp({ unit, homework, test, path? })`
  - `StandaloneToday`'s prop `readinessLine?: { title: string; href: string } | null`
  - `useAIPractice().startPathItem(itemId: string): Promise<PracticeAttempt | null>`

- [ ] **Step 1: Write the failing tests**

Add to `tests/standalone-today.test.ts`:

```ts
describe('Today with readiness (Phase R spec §5.2, ruling RP17)', () => {
  const unit = { title: 'Forces', href: '/student/courses/c1', progressPercent: 40 };
  const path = { eyebrow: 'This week · Practice · 5 questions', title: 'Functions and graphs', detail: 'why', actionLabel: 'Start practice', href: '/student/ai-tutor/practice?item=i1' };

  it('counts SAST days to a due date, negative when overdue', () => {
    expect(dueDays('2026-09-26T08:00:00Z', now)).toBe(1);
    expect(dueDays('2026-09-22T08:00:00Z', now)).toBe(-3);
  });

  it('homework or a test due today, tomorrow or overdue comes first', () => {
    const dueHomework = { title: 'Waves', detail: 'Due tomorrow', href: '/student/homework/h1', dueSoon: true };
    expect(todayNextUp({ unit, homework: dueHomework, test: null, path })?.actionLabel).toBe('Open homework');
  });

  it('then the top path item, before the lesson under way', () => {
    expect(todayNextUp({ unit, homework: null, test: null, path })).toEqual(path);
  });

  it('without a path item, the old order stands', () => {
    expect(todayNextUp({ unit, homework: null, test: null, path: null })?.eyebrow).toBe('Continue your lesson');
  });

  it('asks for readiness only when the user has it, and opens practice from a path item', () => {
    expect(readSource('src/app/(dashboard)/student/page.tsx')).toMatch(/useMyReadiness\(user\?\.readiness === true\)/);
    const practice = readSource('src/app/(dashboard)/student/ai-tutor/practice/page.tsx');
    expect(practice).toMatch(/searchParams\.get\('item'\)/);
    expect(practice).toMatch(/startPathItem\(/);
    expect(readSource('src/hooks/useAIPractice.ts')).toMatch(/\/readiness\/me\/path\/\$\{encodeURIComponent\(itemId\)\}\/start/);
  });
});
```

Add `dueDays` to the file's import from `../src/lib/standalone-today`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/standalone-today.test.ts`
Expected: FAIL, with `dueDays is not a function`.

- [ ] **Step 3: Implement**

`src/lib/standalone-today.ts`:
- `TodayItem` gains `/** Due today, tomorrow or overdue (Phase R spec §5.2). */ dueSoon?: boolean;`.
- Add:

```ts
/** Whole SAST days from today to the due date; negative when overdue. */
export function dueDays(iso: string, now: Date): number {
  return Math.floor((new Date(iso).getTime() + SAST_OFFSET_MS) / DAY_MS) - Math.floor((now.getTime() + SAST_OFFSET_MS) / DAY_MS);
}

export type TodayPath = TodayNextUp;
```

- `todayNextUp`'s input gains `path?: TodayPath | null`. At the top of the function body, add:

```ts
  if (input.homework?.dueSoon) return { eyebrow: 'Next homework', title: input.homework.title, detail: input.homework.detail, actionLabel: 'Open homework', href: input.homework.href };
  if (input.test?.dueSoon) return { eyebrow: 'Next test', title: input.test.title, detail: input.test.detail, actionLabel: 'Open test', href: input.test.href };
  if (input.path) return input.path;
```

`src/components/student/StandaloneToday.tsx`: add the prop `readinessLine?: { title: string; href: string } | null` and import `Target` from `lucide-react`. After the homework and test rows, render:

```tsx
{readinessLine ? <Row icon={Target} label="Exam readiness" item={{ title: readinessLine.title, detail: 'Your range and this week', href: readinessLine.href }} empty="" /> : null}
```

`src/app/(dashboard)/student/page.tsx`:
- Import `useMyReadiness` and `nextUpFor` and `bandLine` from `@/lib/readiness/view`. Import `dueDays` beside `dueText`.
- After the other hooks, add `const readiness = useMyReadiness(user?.readiness === true);`.
- In the standalone branch:
  - Add `dueSoon: dueDays(dashboard.nextHomework.dueAt, now) <= 1` to the homework object.
  - Add `dueSoon: dashboard.nextTest.dueAt ? dueDays(dashboard.nextTest.dueAt, now) <= 1 : false` to the test object.
  - Pass `path: readiness.data?.next ? nextUpFor(readiness.data.next) : null` to `todayNextUp`.
  - Pass `readinessLine` to `StandaloneToday`: the first subject with a predicted paper, as `{ title: `${s.subjectTitle}: heading for ${bandLine(p.band, p.levelRange)}`, href: `/student/readiness/${s.slug}` }`, or `null`.
- In the school branch, directly under the `PageHeader`, add:

```tsx
{readiness.data?.next ? <NextUp {...nextUpFor(readiness.data.next)} /> : null}
```

  Import `NextUp` from `@/components/readiness/NextUp`.

`src/hooks/useAIPractice.ts`: add, and return it with the others:

```ts
  const startPathItem = useCallback(async (itemId: string) => {
    setGenerating(true);
    try {
      const res = await apiClient.post(`/readiness/me/path/${encodeURIComponent(itemId)}/start`);
      const raw = unwrapResponse(res);
      const attempt = { ...(raw as Record<string, unknown>), id: (raw._id as string) ?? (raw.id as string) } as unknown as PracticeAttempt;
      setCurrentAttempt(attempt);
      return attempt;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't start this practice"));
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);
```

`src/app/(dashboard)/student/ai-tutor/practice/page.tsx`:
- Add `useEffect` and `useRef` to the React import.
- Take `startPathItem` from `useAIPractice()`.
- After the existing hooks, add:

```tsx
  const itemId = searchParams.get('item');
  const startedFor = useRef<string | null>(null);
  useEffect(() => {
    // A path item (Phase R ruling RP8): the server makes the set once and returns the same one on a second call.
    if (!itemId || currentAttempt || startedFor.current === itemId) return;
    startedFor.current = itemId;
    void startPathItem(itemId);
  }, [itemId, currentAttempt, startPathItem]);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing. L's existing `todayNextUp` tests still pass, because `dueSoon` and `path` are optional. The dashboard, `StandaloneToday` and the practice page stay ≤ 350 lines (`wc -l`).

- [ ] **Step 5: Commit**

```bash
git add src tests
LANE_SWEEP_OK=1 git commit -m "feat(readiness): Today puts work due soon first, then the top path item; practice opens from a path item" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 18: the teacher's class readiness, and Readiness under Assess

**Files:**
- Create:
  - `src/lib/readiness/class-view.ts`
  - `src/hooks/useReadinessClasses.ts`, `src/hooks/useClassReadiness.ts`, `src/hooks/useReadinessPins.ts`
  - `src/components/readiness/LevelCountsBar.tsx`, `src/components/readiness/NeedGroups.tsx`, `src/components/readiness/ClassLearnerTable.tsx`
  - `src/app/(dashboard)/teacher/readiness/page.tsx`, `src/app/(dashboard)/teacher/readiness/[classId]/page.tsx`
- Modify: `src/lib/nav/teacher-nav.ts` (Readiness after Gradebook in both navs), `src/lib/standalone-teacher-paths.ts` (`'/teacher/readiness'`), `src/components/readiness/index.ts`
- Test: `tests/readiness-class-view.test.ts` (new); `tests/teacher-nav.test.ts` (add cases); `tests/readiness-screens.test.ts` (add the three components to `COMPONENTS`)

**Interfaces:**
- Consumes: Task 12's routes and shapes (Task 14 types); `ExamMap`, `Countdown`, `DataTable`; `withFeatures` (Task 16).
- Produces:
  - `countSegments(counts): Array<{ level: 'weak' | 'building' | 'secure' | 'untested'; percent: number }>`, `countsText(counts): string`, `groupLine(g: ClassNeedGroup): string`, `classExamTopics(topics: readonly ClassReadinessTopic[]): ExamTopic[]`, `changeText(change: number | null): string`, `learnerHref(studentId: string, slug: string): string`
  - `useReadinessClasses()`, `useClassReadiness(classId, slug, paper)` → `{ view, learners, total, loading, error, refresh, loadMore, hasMore }`
  - `useReadinessPins()` → `{ pinLearner(studentId, body), pinClass(classId, body), removeItem(studentId, itemId) }`
  - Pages `/teacher/readiness` and `/teacher/readiness/[classId]?subject=&paper=`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/readiness-class-view.test.ts
import { describe, expect, it } from 'vitest';
import { changeText, classExamTopics, countSegments, countsText, groupLine, learnerHref } from '../src/lib/readiness/class-view';

describe('class readiness helpers (spec §5.3)', () => {
  const counts = { secure: 5, building: 12, weak: 9, untested: 2 };

  it('splits the class into solid level segments, with untested as the neutral track', () => {
    expect(countSegments(counts)).toEqual([
      { level: 'weak', percent: 32.1 }, { level: 'building', percent: 42.9 }, { level: 'secure', percent: 17.9 }, { level: 'untested', percent: 7.1 },
    ]);
    expect(countsText(counts)).toBe('9 weak · 12 building · 5 secure · 2 not yet tested');
    expect(countsText({ secure: 0, building: 0, weak: 3, untested: 0 })).toBe('3 weak');
  });

  it('writes who needs what in one line', () => {
    expect(groupLine({ kind: 'topic', key: 'P1.FUNC', label: 'Functions and graphs', topicKey: 'P1.FUNC', topicLabel: 'Functions and graphs', marksAtStake: 35, marksEach: 17, learners: [{ studentId: 'a', name: 'A' }, { studentId: 'b', name: 'B' }] }))
      .toBe('2 learners weak · up to 17 marks each');
    expect(groupLine({ kind: 'misconception', key: 't', label: 'Domain not restricted on inverse', topicKey: 'P1.FUNC', topicLabel: 'Functions and graphs', marksAtStake: 35, marksEach: null, learners: [{ studentId: 'a', name: 'A' }, { studentId: 'b', name: 'B' }, { studentId: 'c', name: 'C' }] }))
      .toBe('3 learners · Functions and graphs');
  });

  it('maps class averages onto the exam map, and writes changes and links', () => {
    expect(classExamTopics([{ key: 'P1.FUNC', label: 'Functions', group: 'G', marks: 35, averageMastery: 48, counts }])).toEqual([
      { id: 'P1.FUNC', name: 'Functions', section: 'G', marks: 35, mastery: 48 },
    ]);
    expect([changeText(3), changeText(-5), changeText(0), changeText(null)]).toEqual(['+3', '−5', '0', '—']);
    expect(learnerHref('s1', 'mathematics')).toBe('/teacher/readiness/learners/s1?subject=mathematics');
  });
});
```

Add to `tests/teacher-nav.test.ts`:

```ts
it('files Readiness under Assess for both navs, behind the readiness flag (Phase R spec §5.6)', () => {
  for (const nav of [TEACHER_NAV, STANDALONE_TEACHER_NAV]) {
    const item = nav.find((i) => i.label === 'Readiness');
    expect(item).toMatchObject({ section: 'Assess', href: '/teacher/readiness', feature: 'readiness' });
    expect(nav.findIndex((i) => i.label === 'Readiness')).toBe(nav.findIndex((i) => i.label === 'Gradebook') + 1);
  }
  expect(isStandaloneTeacherPathAllowed('/teacher/readiness/abc')).toBe(true);
});
```

In `tests/readiness-screens.test.ts`, add `'LevelCountsBar.tsx', 'NeedGroups.tsx', 'ClassLearnerTable.tsx'` to `COMPONENTS`. Add `'useReadinessClasses.ts', 'useClassReadiness.ts', 'useReadinessPins.ts'` to `HOOKS`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/readiness-class-view.test.ts tests/teacher-nav.test.ts tests/readiness-screens.test.ts`
Expected: FAIL, with `Cannot find module '../src/lib/readiness/class-view'` and no Readiness item.

- [ ] **Step 3: Implement the helpers, hooks and components**

```ts
// src/lib/readiness/class-view.ts
//
// Class readiness helpers (Phase R spec §5.3). Pure.
import type { ExamTopic } from './exam-map';
import type { ClassNeedGroup, ClassReadinessTopic } from '@/types/readiness';

type Counts = ClassReadinessTopic['counts'];
const ORDER = ['weak', 'building', 'secure', 'untested'] as const;

export function countSegments(counts: Counts): Array<{ level: (typeof ORDER)[number]; percent: number }> {
  const total = ORDER.reduce((s: number, k) => s + counts[k], 0);
  return ORDER.filter((k) => counts[k] > 0).map((level) => ({ level, percent: Math.round((counts[level] / Math.max(1, total)) * 1000) / 10 }));
}

export function countsText(counts: Counts): string {
  const words: Record<(typeof ORDER)[number], string> = { weak: 'weak', building: 'building', secure: 'secure', untested: 'not yet tested' };
  return ORDER.filter((k) => counts[k] > 0).map((k) => `${counts[k]} ${words[k]}`).join(' · ');
}

export function groupLine(g: ClassNeedGroup): string {
  const n = `${g.learners.length} ${g.learners.length === 1 ? 'learner' : 'learners'}`;
  return g.kind === 'topic' ? `${n} weak · up to ${g.marksEach ?? 0} marks each` : `${n} · ${g.topicLabel}`;
}

export function classExamTopics(topics: readonly ClassReadinessTopic[]): ExamTopic[] {
  return topics.map((t) => ({ id: t.key, name: t.label, section: t.group, marks: t.marks, mastery: t.averageMastery }));
}

export function changeText(change: number | null): string {
  if (change === null) return '—';
  return change > 0 ? `+${change}` : change < 0 ? `−${Math.abs(change)}` : '0';
}

export const learnerHref = (studentId: string, slug: string): string =>
  `/teacher/readiness/learners/${encodeURIComponent(studentId)}?subject=${encodeURIComponent(slug)}`;
```

```ts
// src/hooks/useReadinessClasses.ts
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { ClassSubjectPair } from '@/types';

export function useReadinessClasses(): { pairs: ClassSubjectPair[]; loading: boolean; error: string | null; refresh: () => void } {
  const [pairs, setPairs] = useState<ClassSubjectPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const refresh = useCallback(() => setKey((k: number) => k + 1), []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient.get('/readiness/classes')
      .then((res) => { if (!cancelled) setPairs(unwrapList<ClassSubjectPair>(res)); })
      .catch((err: unknown) => {
        console.error('Failed to load readiness classes', err);
        if (!cancelled) setError("Your classes couldn't load. Check your connection and try again.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key]);
  return { pairs, loading, error, refresh };
}
```

```ts
// src/hooks/useClassReadiness.ts
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { ClassReadinessLearner, ClassReadinessView } from '@/types';

const LIMIT = 50;

export function useClassReadiness(classId: string, slug: string, paper: string | null) {
  const [view, setView] = useState<ClassReadinessView | null>(null);
  const [learners, setLearners] = useState<ClassReadinessLearner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const refresh = useCallback(() => setKey((k: number) => k + 1), []);
  const query = `subject=${encodeURIComponent(slug)}${paper ? `&paper=${paper}` : ''}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get(`/readiness/classes/${classId}?${query}`),
      apiClient.get(`/readiness/classes/${classId}/learners?${query}&sort=band&page=1&limit=${LIMIT}`),
    ])
      .then(([v, l]) => {
        if (cancelled) return;
        const list = unwrapResponse<{ rows: ClassReadinessLearner[]; total: number }>(l);
        setView(unwrapResponse<ClassReadinessView>(v));
        setLearners(list.rows ?? []);
        setTotal(list.total ?? 0);
        setPage(1);
      })
      .catch((err: unknown) => {
        console.error('Failed to load class readiness', err);
        if (!cancelled) { setView(null); setError("Class readiness couldn't load. Check your connection and try again."); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [classId, query, key]);

  const loadMore = useCallback(async () => {
    try {
      const res = await apiClient.get(`/readiness/classes/${classId}/learners?${query}&sort=band&page=${page + 1}&limit=${LIMIT}`);
      const list = unwrapResponse<{ rows: ClassReadinessLearner[] }>(res);
      setLearners((prev: ClassReadinessLearner[]) => [...prev, ...(list.rows ?? [])]);
      setPage((p: number) => p + 1);
    } catch (err: unknown) {
      console.error('Failed to load more learners', err);
    }
  }, [classId, query, page]);

  return { view, learners, total, loading, error, refresh, loadMore, hasMore: learners.length < total };
}
```

```ts
// src/hooks/useReadinessPins.ts
import { useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';

interface PinBody { subject: string; topicKey: string; misconceptionTypeId?: string }

export function useReadinessPins() {
  const pinLearner = useCallback(async (studentId: string, body: PinBody): Promise<boolean> => {
    try {
      await apiClient.post(`/readiness/learners/${studentId}/path`, body);
      toast.success('Pinned as this week\'s first item');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't pin that topic"));
      return false;
    }
  }, []);
  const pinClass = useCallback(async (classId: string, body: PinBody & { studentIds: string[] }): Promise<boolean> => {
    try {
      await apiClient.post(`/readiness/classes/${classId}/path`, body);
      toast.success(`Set as next practice for ${body.studentIds.length} learners`);
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't set that practice"));
      return false;
    }
  }, []);
  const removeItem = useCallback(async (studentId: string, itemId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/readiness/learners/${studentId}/path/${itemId}`);
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't remove that item"));
      return false;
    }
  }, []);
  return { pinLearner, pinClass, removeItem };
}
```

```tsx
// src/components/readiness/LevelCountsBar.tsx
import { cn } from '@/lib/utils';
import { countSegments, countsText } from '@/lib/readiness/class-view';
import type { ClassReadinessTopic } from '@/types';

/** Solid segments per mastery level on the neutral track; untested learners are the track itself (no fill). */
const SEGMENT = { weak: 'bg-mark-weak', building: 'bg-mark-building', secure: 'bg-mark-secure', untested: 'bg-transparent' } as const;

export function LevelCountsBar({ counts, label }: { counts: ClassReadinessTopic['counts']; label: string }) {
  const text = countsText(counts);
  return (
    <div className="space-y-1">
      <div role="img" aria-label={`${label}: ${text}`} className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {countSegments(counts).map((s) => <span key={s.level} className={cn('h-full', SEGMENT[s.level])} style={{ width: `${s.percent}%` }} />)}
      </div>
      <p className="text-caption text-muted-foreground">{text}</p>
    </div>
  );
}
```

```tsx
// src/components/readiness/NeedGroups.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/components/ui/focus';
import { Button } from '@/components/ui/button';
import { groupLine } from '@/lib/readiness/class-view';
import type { ClassNeedGroup } from '@/types';

interface NeedGroupsProps {
  groups: readonly ClassNeedGroup[];
  hrefFor: (studentId: string) => string;
  onPin?: (group: ClassNeedGroup) => void;
}

/** Spec §5.3 "Who needs what": up to five groups, most marks at stake first; open one to see who and to pin practice. */
export function NeedGroups({ groups, hrefFor, onPin }: NeedGroupsProps) {
  const [open, setOpen] = useState<string | null>(null);
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">No shared gaps yet: each weakness so far is one learner&apos;s.</p>;
  return (
    <ul className="divide-y divide-border">
      {groups.map((g: ClassNeedGroup) => {
        const id = `${g.kind}-${g.key}`;
        const expanded = open === id;
        return (
          <li key={id} className="py-2">
            <button type="button" aria-expanded={expanded} aria-controls={`${id}-who`} onClick={() => setOpen(expanded ? null : id)}
              className={cn('flex min-h-11 w-full items-center justify-between gap-3 rounded-control text-left', FOCUS_RING)}>
              <span className="min-w-0">
                <span className="block font-semibold">{g.label}</span>
                <span className="block text-sm text-muted-foreground">{groupLine(g)}</span>
              </span>
              <ChevronDown aria-hidden className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-180')} />
            </button>
            {expanded ? (
              <div id={`${id}-who`} className="space-y-3 pt-2">
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {g.learners.map((l) => <li key={l.studentId}><Link href={hrefFor(l.studentId)} className="text-primary underline-offset-4 hover:underline">{l.name}</Link></li>)}
                </ul>
                {onPin ? <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => onPin(g)}>Set as next practice for these learners</Button> : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
```

```tsx
// src/components/readiness/ClassLearnerTable.tsx
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { bandLine } from '@/lib/readiness/view';
import { changeText } from '@/lib/readiness/class-view';
import type { ClassReadinessLearner } from '@/types';

const COLUMNS: ColumnDef<ClassReadinessLearner>[] = [
  { accessorKey: 'name', header: 'Learner', cell: ({ row }) => <span className="font-semibold">{row.original.name}</span> },
  {
    id: 'band', header: 'Predicted',
    cell: ({ row }) => {
      const r = row.original;
      if (r.state === 'predicted' && r.band) return <span className="tabular-nums">{bandLine(r.band, r.levelRange)}</span>;
      return <span className="text-muted-foreground">{r.state === 'no_evidence' ? 'No evidence yet' : `Not enough evidence · ${r.answers} answers`}</span>;
    },
  },
  { id: 'change', header: 'Change, 4 weeks', cell: ({ row }) => <span className="tabular-nums">{changeText(row.original.change4w)}</span> },
  { accessorKey: 'answers', header: 'Answers', cell: ({ row }) => <span className="tabular-nums">{row.original.answers}</span> },
  { id: 'weakest', header: 'Weakest topic', cell: ({ row }) => row.original.weakestTopic ? `${row.original.weakestTopic.label} (${row.original.weakestTopic.mastery}%)` : '—' },
];

/** Spec §5.3: learners by predicted band, lowest first (the server's order); a row opens the learner. */
export function ClassLearnerTable({ rows, onOpen }: { rows: ClassReadinessLearner[]; onOpen: (studentId: string) => void }) {
  return <DataTable columns={COLUMNS} data={rows} onRowClick={(r: ClassReadinessLearner) => onOpen(r.studentId)} />;
}
```

- [ ] **Step 4: Implement the nav and the pages**

`src/lib/nav/teacher-nav.ts`: import `Gauge` from `lucide-react`. In **both** `TEACHER_NAV` and `STANDALONE_TEACHER_NAV`, insert right after the Gradebook item:

```ts
  { section: 'Assess', label: 'Readiness', href: '/teacher/readiness', icon: Gauge, feature: 'readiness' },
```

`src/lib/standalone-teacher-paths.ts`: add `'/teacher/readiness',` after `'/teacher/grades'`.

```tsx
// src/app/(dashboard)/teacher/readiness/page.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gauge } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useReadinessClasses } from '@/hooks/useReadinessClasses';
import type { ClassSubjectPair } from '@/types';

const hrefOf = (p: ClassSubjectPair) => `/teacher/readiness/${p.classId}?subject=${encodeURIComponent(p.slug)}`;

/** Spec §5.3: straight to the only class and subject, or a card per pair. */
export default function TeacherReadinessPage() {
  const { pairs, loading, error, refresh } = useReadinessClasses();
  const router = useRouter();
  const only = pairs.length === 1 ? hrefOf(pairs[0]) : null;
  useEffect(() => { if (only) router.replace(only); }, [only, router]);

  if (error) return <ErrorState title="Readiness couldn't load" message={error} onRetry={refresh} retrying={loading} />;
  if (loading || only) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-24 w-full" /></div>;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Assess" title="Readiness" description="Each class's readiness for the final exam, from its marked work." />
      {pairs.length === 0 ? (
        <EmptyState icon={Gauge} title="Readiness appears once this class's tests are marked" description="It covers Grade 12 subjects with an exam blueprint (Mathematics first)." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {pairs.map((p: ClassSubjectPair) => (
            <li key={`${p.classId}-${p.slug}`}>
              <Link href={hrefOf(p)} className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="transition-colors hover:bg-muted">
                  <CardContent className="space-y-1">
                    <p className="font-heading text-h3 font-semibold">{p.className}</p>
                    <p className="text-sm text-muted-foreground">{p.subjectTitle} · Grade {p.grade} · {p.learners} learners</p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/teacher/readiness/[classId]/page.tsx
'use client';

import { useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Gauge, Info } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassLearnerTable, Countdown, ExamMap, LevelCountsBar, NeedGroups } from '@/components/readiness';
import { useClassReadiness } from '@/hooks/useClassReadiness';
import { useReadinessPins } from '@/hooks/useReadinessPins';
import { classExamTopics, learnerHref } from '@/lib/readiness/class-view';
import { examDateOf } from '@/lib/readiness/view';
import type { ClassNeedGroup } from '@/types';

/** Spec §5.3: Class readiness for one paper. */
export default function ClassReadinessPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const classId = typeof params.classId === 'string' ? params.classId : '';
  const slug = search.get('subject') ?? 'mathematics';
  const paper = search.get('paper');
  const now = useMemo(() => new Date(), []);
  const { view, learners, total, loading, error, refresh, loadMore, hasMore } = useClassReadiness(classId, slug, paper);
  const { pinClass } = useReadinessPins();

  if (error) return <ErrorState title="Class readiness couldn't load" message={error} onRetry={refresh} retrying={loading} />;
  if (loading || !view) return <div className="space-y-4"><Skeleton className="h-10 w-56" /><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /></div>;
  const pin = async (g: ClassNeedGroup) => {
    const ok = await pinClass(classId, { subject: slug, topicKey: g.topicKey, ...(g.kind === 'misconception' ? { misconceptionTypeId: g.key } : {}), studentIds: g.learners.map((l) => l.studentId) });
    if (ok) refresh();
  };
  const updated = new Date(view.updatedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' });
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${view.className} · ${view.subject.title}`} title="Class readiness"
        description={`${view.learners.total} learners · ${view.learners.predicted} with a prediction · updated ${updated}`} />
      <Tabs value={view.paper.key} onValueChange={(v: unknown) => router.replace(`/teacher/readiness/${classId}?subject=${encodeURIComponent(slug)}&paper=${String(v)}`)}>
        <TabsList>{['P1', 'P2'].map((k) => <TabsTrigger key={k} value={k}>Paper {k.slice(1)}</TabsTrigger>)}</TabsList>
      </Tabs>
      {!view.blueprint.verified ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info aria-hidden className="size-4 shrink-0" />Draft blueprint: marks not yet checked against the {view.blueprint.examYear} Examination Guidelines
        </p>
      ) : null}
      {view.paper.examDate ? <Countdown paper={view.paper.title} examDate={examDateOf(view.paper.examDate)} now={now} /> : null}
      {view.learners.predicted + view.learners.notEnough === 0 ? (
        <EmptyState icon={Gauge} title="Readiness appears once this class's tests are marked" description="The exam map below shows how the paper is built." />
      ) : null}
      <ExamMap paper={`${view.paper.title} (class average)`} topics={classExamTopics(view.topics)} />
      <Card><CardContent className="space-y-4">
        <h2 className="font-heading text-h3 font-semibold">Topic breakdown</h2>
        <ul className="space-y-4">{view.topics.map((t) => (
          <li key={t.key} className="space-y-1">
            <div className="flex justify-between gap-3"><span className="font-semibold">{t.label}</span><span className="text-sm tabular-nums text-muted-foreground">{t.marks} marks</span></div>
            <LevelCountsBar counts={t.counts} label={t.label} />
          </li>
        ))}</ul>
      </CardContent></Card>
      <section aria-labelledby="who-needs-what" className="space-y-2">
        <h2 id="who-needs-what" className="font-heading text-h3 font-semibold">Who needs what</h2>
        <NeedGroups groups={view.groups} hrefFor={(id: string) => learnerHref(id, slug)} onPin={pin} />
      </section>
      <section aria-labelledby="learners" className="space-y-2">
        <h2 id="learners" className="font-heading text-h3 font-semibold">Learners</h2>
        <ClassLearnerTable rows={learners} onOpen={(id: string) => router.push(learnerHref(id, slug))} />
        {hasMore ? <Button variant="outline" className="min-h-11" onClick={() => void loadMore()}>Show more ({total - learners.length})</Button> : null}
      </section>
    </div>
  );
}
```

`src/components/readiness/index.ts`: export `LevelCountsBar`, `NeedGroups` and `ClassLearnerTable`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.
- The teacher-nav section-order test still passes, because Readiness sits inside Assess.
- The phone-tabs test for the standalone teacher still gives Today, Teach, Assess, Class and More, with More holding Billing and Settings.
- The design-scope closure now includes the teacher readiness pages.

- [ ] **Step 6: Commit**

```bash
git add src tests
LANE_SWEEP_OK=1 git commit -m "feat(readiness): Class readiness per paper (class exam map, topic breakdown, who needs what, learners by band) and Readiness under Assess" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 19: one learner for the teacher: the why, the answers behind a topic, pin and remove

**Files:**
- Create: `src/app/(dashboard)/teacher/readiness/learners/[studentId]/page.tsx`, `src/components/readiness/PinTopicDialog.tsx`, `src/components/readiness/TopicAnswers.tsx`, `src/hooks/useTopicAnswers.ts`, `src/lib/readiness/answers.ts`
- Modify: `src/app/(dashboard)/teacher/students/[id]/page.tsx` (an "Exam readiness" link when `user.readiness`), `src/components/readiness/index.ts`
- Test: `tests/readiness-answers.test.ts` (new); `tests/readiness-screens.test.ts` (add `PinTopicDialog.tsx`, `TopicAnswers.tsx` and `useTopicAnswers.ts`)

**Interfaces:**
- Consumes: Task 12's routes (the learner view, trend, answers, pins); Task 15 (`useReadinessSubject` with `kind: 'learner'`, `ReadinessSubjectView` with `onRemove` and `topicExtra`); Task 18 (`useReadinessPins`).
- Produces:
  - `answerSourceHref(a: ReadinessWeightedAnswer): string | null`, `answerLine(a: ReadinessWeightedAnswer): string`, `pinOptions(view: ReadinessView): Array<{ value: string; label: string; misconceptions: Array<{ value: string; label: string }> }>`
  - `useTopicAnswers(studentId, slug, topicKey)` → `{ rows, loading, error, loadMore, hasMore }`
  - Page `/teacher/readiness/learners/[studentId]?subject=`

- [ ] **Step 1: Write the failing test**

```ts
// tests/readiness-answers.test.ts
import { describe, expect, it } from 'vitest';
import { answerLine, answerSourceHref, pinOptions } from '../src/lib/readiness/answers';
import type { ReadinessView, ReadinessWeightedAnswer } from '../src/types/readiness';

const answer = (over: Partial<ReadinessWeightedAnswer> = {}): ReadinessWeightedAnswer => ({
  id: 'r1', markedAt: '2026-09-21T08:00:00Z', sourceType: 'test', parentId: 'p1', recordId: 'm1', itemKey: '2.3',
  marksAwarded: 1, marksAvailable: 4, level: 'complex', counted: true, weight: { recency: 0.5, source: 1, tag: 1, override: 1, total: 0.5 }, ...over,
});

describe('the answers behind a topic (spec §3.9)', () => {
  it('links tests and homework to their marked work, and nothing else', () => {
    expect(answerSourceHref(answer())).toBe('/teacher/papers/p1?tab=marking');
    expect(answerSourceHref(answer({ sourceType: 'homework' }))).toBe('/teacher/homework/p1');
    expect(answerSourceHref(answer({ sourceType: 'practice' }))).toBeNull();
  });

  it('says what each answer counts for, and why', () => {
    expect(answerLine(answer())).toBe('Test Q2.3 · 1 of 4 · counts 50% (4 weeks old)');
    expect(answerLine(answer({ sourceType: 'homework', weight: { recency: 1, source: 0.7, tag: 0.8, override: 1, total: 0.56 } })))
      .toBe('Homework Q2.3 · 1 of 4 · counts 56% (homework, AI-tagged topic)');
    expect(answerLine(answer({ counted: false }))).toBe('Test Q2.3 · 1 of 4 · not counted: a later answer to the same question counts');
  });

  it('offers every exam topic to pin, with the misconceptions seen on it', () => {
    const view = { papers: [{ key: 'P1', topics: [
      { key: 'P1.FUNC', label: 'Functions', misconceptions: [{ typeId: 't', label: 'Domain', count: 2, lastSeenAt: '' }] },
      { key: 'P1.CALC', label: 'Calculus', misconceptions: [] },
    ] }] } as unknown as ReadinessView;
    expect(pinOptions(view)).toEqual([
      { value: 'P1.FUNC', label: 'Functions', misconceptions: [{ value: 't', label: 'Domain' }] },
      { value: 'P1.CALC', label: 'Calculus', misconceptions: [] },
    ]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/readiness-answers.test.ts`
Expected: FAIL, with `Cannot find module '../src/lib/readiness/answers'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/readiness/answers.ts
//
// "Answers behind this topic" and the pin choices (Phase R spec §3.9, §4.5). Pure.
import type { ReadinessView, ReadinessWeightedAnswer } from '@/types/readiness';

const SOURCE: Record<ReadinessWeightedAnswer['sourceType'], string> = {
  test: 'Test', homework: 'Homework', unit_check: 'Quick check', practice: 'Practice', library: 'Library',
};

export function answerSourceHref(a: ReadinessWeightedAnswer): string | null {
  if (a.sourceType === 'test') return `/teacher/papers/${encodeURIComponent(a.parentId)}?tab=marking`;
  if (a.sourceType === 'homework') return `/teacher/homework/${encodeURIComponent(a.parentId)}`;
  return null;
}

export function answerLine(a: ReadinessWeightedAnswer): string {
  const head = `${SOURCE[a.sourceType]} Q${a.itemKey} · ${a.marksAwarded} of ${a.marksAvailable}`;
  if (!a.counted) return `${head} · not counted: a later answer to the same question counts`;
  const reasons = [
    a.weight.recency < 1 ? `${Math.round((Math.log(a.weight.recency) / Math.log(0.5)) * 8)} weeks old` : '',
    a.weight.source < 1 ? SOURCE[a.sourceType].toLowerCase() : '',
    a.weight.tag < 1 ? 'AI-tagged topic' : '',
    a.weight.override < 1 ? 'total changed by the teacher' : '',
  ].filter(Boolean);
  return `${head} · counts ${Math.round(a.weight.total * 100)}%${reasons.length > 0 ? ` (${reasons.join(', ')})` : ''}`;
}

export function pinOptions(view: ReadinessView): Array<{ value: string; label: string; misconceptions: Array<{ value: string; label: string }> }> {
  return view.papers.flatMap((p) => p.topics.map((t) => ({
    value: t.key, label: t.label, misconceptions: t.misconceptions.map((m) => ({ value: m.typeId, label: m.label })),
  })));
}
```

```ts
// src/hooks/useTopicAnswers.ts
import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { ReadinessWeightedAnswer } from '@/types';

type Page = { rows: ReadinessWeightedAnswer[]; nextCursor: string | null };

export function useTopicAnswers(studentId: string, slug: string, topicKey: string) {
  const [rows, setRows] = useState<ReadinessWeightedAnswer[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const base = `/readiness/learners/${studentId}/topics/${encodeURIComponent(topicKey)}/answers?subject=${encodeURIComponent(slug)}&limit=20`;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient.get(base)
      .then((res) => { if (!cancelled) { const p = unwrapResponse<Page>(res); setRows(p.rows ?? []); setCursor(p.nextCursor); } })
      .catch((err: unknown) => { console.error('Failed to load answers', err); if (!cancelled) setError("The answers couldn't load."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [base]);
  const loadMore = useCallback(async () => {
    if (!cursor) return;
    try {
      const p = unwrapResponse<Page>(await apiClient.get(`${base}&cursor=${cursor}`));
      setRows((prev: ReadinessWeightedAnswer[]) => [...prev, ...(p.rows ?? [])]);
      setCursor(p.nextCursor);
    } catch (err: unknown) {
      console.error('Failed to load more answers', err);
    }
  }, [base, cursor]);
  return { rows, loading, error, loadMore, hasMore: cursor !== null };
}
```

```tsx
// src/components/readiness/TopicAnswers.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopicAnswers } from '@/hooks/useTopicAnswers';
import { answerLine, answerSourceHref } from '@/lib/readiness/answers';
import type { ReadinessWeightedAnswer } from '@/types';

/** Spec §3.9: the answers behind one topic, each with what it counts for; links to the marked script or homework. */
export function TopicAnswers({ studentId, slug, topicKey }: { studentId: string; slug: string; topicKey: string }) {
  const { rows, loading, error, loadMore, hasMore } = useTopicAnswers(studentId, slug, topicKey);
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No answers on this topic yet.</p>;
  return (
    <section className="space-y-2">
      <h3 className="text-eyebrow font-semibold uppercase text-muted-foreground">Answers behind this topic</h3>
      <ul className="divide-y divide-border text-sm">
        {rows.map((a: ReadinessWeightedAnswer) => {
          const href = answerSourceHref(a);
          const when = new Date(a.markedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: 'Africa/Johannesburg' });
          return (
            <li key={a.id} className="flex flex-col gap-0.5 py-2">
              <span className="text-muted-foreground">{when}</span>
              {href ? <Link href={href} className="text-primary underline-offset-4 hover:underline">{answerLine(a)}</Link> : <span>{answerLine(a)}</span>}
            </li>
          );
        })}
      </ul>
      {hasMore ? <Button variant="ghost" className="min-h-11" onClick={() => void loadMore()}>Show more</Button> : null}
    </section>
  );
}
```

```tsx
// src/components/readiness/PinTopicDialog.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pinOptions } from '@/lib/readiness/answers';
import type { ReadinessView } from '@/types';

interface PinTopicDialogProps { view: ReadinessView; onPin: (topicKey: string, misconceptionTypeId: string | null) => Promise<boolean> }

/** Spec §4.5: a teacher pins an exam topic (optionally a misconception) as this week's first item. */
export function PinTopicDialog({ view, onPin }: PinTopicDialogProps) {
  const options = useMemo(() => pinOptions(view), [view]);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [mistake, setMistake] = useState('none');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setTopic(options[0]?.value ?? ''); setMistake('none'); } }, [open, options]);
  const chosen = options.find((o) => o.value === topic);
  const submit = async () => {
    setSaving(true);
    const ok = await onPin(topic, mistake === 'none' ? null : mistake);
    setSaving(false);
    if (ok) setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="min-h-11" />}>Pin a topic</DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader><DialogTitle>Pin a topic for this week</DialogTitle></DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-1.5">
            <Label htmlFor="pin-topic">Exam topic</Label>
            <Select value={topic} onValueChange={(v: unknown) => { setTopic(String(v)); setMistake('none'); }}>
              <SelectTrigger id="pin-topic" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pin-mistake">Aim at a misconception (optional)</Label>
            <Select value={mistake} onValueChange={(v: unknown) => setMistake(String(v))}>
              <SelectTrigger id="pin-mistake" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(chosen?.misconceptions ?? []).map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button className="min-h-11" disabled={!topic || saving} onClick={() => void submit()}>Pin as first this week</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

```tsx
// src/app/(dashboard)/teacher/readiness/learners/[studentId]/page.tsx
'use client';

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { PinTopicDialog, ReadinessSubjectView, TopicAnswers } from '@/components/readiness';
import { useReadinessSubject } from '@/hooks/useReadinessSubject';
import { useReadinessPins } from '@/hooks/useReadinessPins';

/** Spec §5.4: one learner's readiness for the teacher, with the why open, the answers behind each topic, and pins. */
export default function TeacherLearnerReadinessPage() {
  const params = useParams();
  const search = useSearchParams();
  const studentId = typeof params.studentId === 'string' ? params.studentId : '';
  const slug = search.get('subject') ?? 'mathematics';
  const now = useMemo(() => new Date(), []);
  const { view, trend, loading, error, refresh } = useReadinessSubject({ kind: 'learner', studentId, slug });
  const { pinLearner, removeItem } = useReadinessPins();

  if (error) return <ErrorState title="This learner's readiness couldn't load" message={error} onRetry={refresh} retrying={loading} />;
  if (loading || !view) return <div className="space-y-4"><Skeleton className="h-10 w-56" /><Skeleton className="h-64 w-full" /></div>;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${view.subject.title} · Grade ${view.subject.grade}`} title="Exam readiness" description={`From ${view.answers} answers`}>
        <PinTopicDialog view={view} onPin={async (topicKey: string, misconceptionTypeId: string | null) => {
          const ok = await pinLearner(studentId, { subject: slug, topicKey, ...(misconceptionTypeId ? { misconceptionTypeId } : {}) });
          if (ok) refresh();
          return ok;
        }} />
      </PageHeader>
      <ReadinessSubjectView
        view={view} trend={trend} now={now} audience="teacher"
        onRemove={async (itemId: string) => { if (await removeItem(studentId, itemId)) refresh(); }}
        topicExtra={(topicKey: string) => <TopicAnswers studentId={studentId} slug={slug} topicKey={topicKey} />}
      />
    </div>
  );
}
```

`src/components/readiness/index.ts`: export `PinTopicDialog` and `TopicAnswers`.

`src/app/(dashboard)/teacher/students/[id]/page.tsx`: read `const readiness = useAuthStore((s) => s.user?.readiness === true);` (import `useAuthStore` from `@/stores/useAuthStore`). Next to the page's existing header actions, add:

```tsx
{readiness ? <Link href={`/teacher/readiness/learners/${studentId}`} className={buttonVariants({ variant: 'outline' })}>Exam readiness</Link> : null}
```

With no `subject`, the page defaults to `mathematics`. That is the only blueprint subject (spec §12.1). When a second subject ships, the learner page lists the learner's subjects first.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add src tests
LANE_SWEEP_OK=1 git commit -m "feat(readiness): one learner for the teacher: why this range, the answers behind each topic with their weights, pin and remove" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 20: the super-admin blueprint pages (import, check value by value, date, publish, copy)

**Files:**
- Create:
  - `src/lib/readiness/blueprint-admin.ts`
  - `src/hooks/useBlueprints.ts`, `src/hooks/useBlueprint.ts`
  - `src/components/readiness-admin/ImportBlueprintDialog.tsx`, `src/components/readiness-admin/BlueprintPaperCard.tsx`, `src/components/readiness-admin/BlueprintReview.tsx`
  - `src/app/(dashboard)/superadmin/blueprints/page.tsx`, `src/app/(dashboard)/superadmin/blueprints/[id]/page.tsx`
- Modify: `src/lib/constants.ts` (`SUPERADMIN_NAV` gains Blueprints), `tests/no-tints.test.ts` and `tests/palette-scan.test.ts` (add `'src/components/readiness-admin'` and `'src/app/(dashboard)/superadmin/blueprints'` to their Blueprint folder lists)
- Test: `tests/blueprint-admin.test.ts` (new)

**Interfaces:**
- Consumes: Task 13's routes; `ExamBlueprintRecord`, `BlueprintReport`.
- Produces:
  - `verifiedCount(bp: ExamBlueprintRecord): { verified: number; total: number }`
  - `canPublish(bp, report, acknowledged: boolean): { ok: boolean; reason: string | null }`
  - `patchFrom(bp: ExamBlueprintRecord, edits: BlueprintEdits): VerificationPatch`
  - `interface BlueprintEdits { papers: Record<string, { verified?: boolean; sourceRef?: string; examDate?: string | null; sitting?: 'morning' | 'afternoon' | null }>; topics: Record<string, { verified?: boolean; sourceRef?: string }>; levels: Record<string, { verified?: boolean; sourceRef?: string }> }`
  - `useBlueprints()` → `{ rows, loading, error, refresh, importJson(text): Promise<{ ok: boolean; report: BlueprintReport | null }> }`
  - `useBlueprint(id)` → `{ record, report, verified, loading, error, refresh, save(patch), publish(ack), copy(year) }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/blueprint-admin.test.ts
import { describe, expect, it } from 'vitest';
import { canPublish, patchFrom, verifiedCount } from '../src/lib/readiness/blueprint-admin';
import type { ExamBlueprintRecord } from '../src/types/readiness';

const bp: ExamBlueprintRecord = {
  _id: 'b1', family: 'NSC-MATHEMATICS-GR12', subjectTitle: 'Mathematics', slug: 'mathematics', grade: 12, examYear: 2026, version: 0, status: 'draft', updatedAt: '',
  cognitiveScheme: { key: 'maths-4', levels: [{ key: 'knowledge', label: 'Knowledge', percent: 20, sourceRef: 'GEN', verified: false }] },
  papers: [{ key: 'P1', title: 'Paper 1', totalMarks: 150, durationMinutes: 180, examDate: null, sitting: null, sourceRef: 'ATP12', verified: false, topics: [
    { key: 'P1.FUNC', label: 'Functions and graphs', marks: 35, note: '', sourceRef: 'ATP12', verified: true, nodes: [{ code: 'CAPS-MATHEMATICS-GR12-T1-FUNC' }] },
  ] }],
};

describe('blueprint admin helpers (spec §5.5)', () => {
  it('counts verified values: every paper (with its date), topic and level', () => {
    expect(verifiedCount(bp)).toEqual({ verified: 1, total: 3 });
  });

  it('refuses to publish with errors, or with warnings not acknowledged', () => {
    expect(canPublish(bp, { errors: ['P1: …'], warnings: [], unverified: [] }, true)).toEqual({ ok: false, reason: 'Fix the errors first' });
    expect(canPublish(bp, { errors: [], warnings: ['Not in any paper: …'], unverified: [] }, false)).toEqual({ ok: false, reason: 'Acknowledge the warnings' });
    expect(canPublish(bp, { errors: [], warnings: [], unverified: [] }, false)).toEqual({ ok: true, reason: null });
    expect(canPublish({ ...bp, status: 'published' }, { errors: [], warnings: [], unverified: [] }, true)).toEqual({ ok: false, reason: 'Only a draft can be published' });
  });

  it('sends only what changed, never marks', () => {
    expect(patchFrom(bp, { papers: { P1: { examDate: '2026-10-27', verified: true } }, topics: { 'P1.FUNC': { sourceRef: 'EG26 p.8' } }, levels: {} }))
      .toEqual({ papers: [{ key: 'P1', examDate: '2026-10-27', verified: true }], topics: [{ key: 'P1.FUNC', sourceRef: 'EG26 p.8' }] });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/blueprint-admin.test.ts`
Expected: FAIL, with `Cannot find module '../src/lib/readiness/blueprint-admin'`.

- [ ] **Step 3: Implement the helpers and hooks**

```ts
// src/lib/readiness/blueprint-admin.ts
//
// Super-admin blueprint review (Phase R spec §5.5): what is verified, whether it may publish, and the patch
// (flags, source references, dates; never marks). Pure.
import type { BlueprintReport, ExamBlueprintRecord } from '@/types/readiness';

export interface BlueprintEdits {
  papers: Record<string, { verified?: boolean; sourceRef?: string; examDate?: string | null; sitting?: 'morning' | 'afternoon' | null }>;
  topics: Record<string, { verified?: boolean; sourceRef?: string }>;
  levels: Record<string, { verified?: boolean; sourceRef?: string }>;
}
export interface VerificationPatch {
  papers?: Array<{ key: string } & BlueprintEdits['papers'][string]>;
  topics?: Array<{ key: string } & BlueprintEdits['topics'][string]>;
  levels?: Array<{ key: string } & BlueprintEdits['levels'][string]>;
}

export function verifiedCount(bp: ExamBlueprintRecord): { verified: number; total: number } {
  const flags = [
    ...bp.papers.map((p) => p.verified && p.examDate !== null),
    ...bp.papers.flatMap((p) => p.topics.map((t) => t.verified)),
    ...bp.cognitiveScheme.levels.map((l) => l.verified),
  ];
  return { verified: flags.filter(Boolean).length, total: flags.length };
}

export function canPublish(bp: ExamBlueprintRecord, report: BlueprintReport, acknowledged: boolean): { ok: boolean; reason: string | null } {
  if (bp.status !== 'draft') return { ok: false, reason: 'Only a draft can be published' };
  if (report.errors.length > 0) return { ok: false, reason: 'Fix the errors first' };
  if (report.warnings.length > 0 && !acknowledged) return { ok: false, reason: 'Acknowledge the warnings' };
  return { ok: true, reason: null };
}

const entries = <T extends object>(rec: Record<string, T>): Array<{ key: string } & T> =>
  Object.entries(rec).filter(([, v]) => Object.keys(v).length > 0).map(([key, v]) => ({ key, ...v }));

export function patchFrom(_bp: ExamBlueprintRecord, edits: BlueprintEdits): VerificationPatch {
  const papers = entries(edits.papers);
  const topics = entries(edits.topics);
  const levels = entries(edits.levels);
  return { ...(papers.length ? { papers } : {}), ...(topics.length ? { topics } : {}), ...(levels.length ? { levels } : {}) };
}
```

```ts
// src/hooks/useBlueprints.ts
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import type { BlueprintReport, ExamBlueprintRecord } from '@/types';

export function useBlueprints() {
  const [rows, setRows] = useState<ExamBlueprintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const refresh = useCallback(() => setKey((k: number) => k + 1), []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient.get('/readiness/blueprints?limit=100')
      .then((res) => { if (!cancelled) setRows(unwrapResponse<{ rows: ExamBlueprintRecord[] }>(res).rows ?? []); })
      .catch((err: unknown) => { console.error('Failed to load blueprints', err); if (!cancelled) setError("Blueprints couldn't load."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key]);
  const importJson = useCallback(async (text: string, save: boolean): Promise<{ ok: boolean; report: BlueprintReport | null }> => {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch (err: unknown) {
      return { ok: false, report: { errors: [], warnings: [], unverified: [], parseErrors: [err instanceof Error ? err.message : 'Not valid JSON'] } };
    }
    try {
      const res = await apiClient.post(save ? '/readiness/blueprints/import' : '/readiness/blueprints/validate', body);
      const data = unwrapResponse<BlueprintReport & { report?: BlueprintReport }>(res);
      if (save) refresh();
      return { ok: true, report: data.report ?? data };
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'This blueprint has errors'));
      return { ok: false, report: null };
    }
  }, [refresh]);
  return { rows, loading, error, refresh, importJson };
}
```

```ts
// src/hooks/useBlueprint.ts
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import type { VerificationPatch } from '@/lib/readiness/blueprint-admin';
import type { BlueprintReport, ExamBlueprintRecord } from '@/types';

export function useBlueprint(id: string) {
  const [record, setRecord] = useState<ExamBlueprintRecord | null>(null);
  const [report, setReport] = useState<BlueprintReport | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const refresh = useCallback(() => setKey((k: number) => k + 1), []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient.get(`/readiness/blueprints/${id}`)
      .then((res) => {
        if (cancelled) return;
        const d = unwrapResponse<{ blueprint: ExamBlueprintRecord; report: BlueprintReport; verified: boolean }>(res);
        setRecord(d.blueprint);
        setReport(d.report);
        setVerified(d.verified);
      })
      .catch((err: unknown) => { console.error('Failed to load the blueprint', err); if (!cancelled) setError("This blueprint couldn't load."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, key]);
  const run = useCallback(async (label: string, call: () => Promise<unknown>): Promise<boolean> => {
    try {
      await call();
      toast.success(label);
      refresh();
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'That did not work'));
      return false;
    }
  }, [refresh]);
  return {
    record, report, verified, loading, error, refresh,
    save: (patch: VerificationPatch) => run('Saved', () => apiClient.patch(`/readiness/blueprints/${id}`, patch)),
    publish: (acknowledgeWarnings: boolean) => run('Published', () => apiClient.post(`/readiness/blueprints/${id}/publish`, { acknowledgeWarnings })),
    copy: (examYear: number) => run(`Copied to ${examYear}`, () => apiClient.post(`/readiness/blueprints/${id}/copy`, { examYear })),
  };
}
```

- [ ] **Step 4: Implement the components and pages**

```tsx
// src/components/readiness-admin/ImportBlueprintDialog.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BlueprintReport } from '@/types';

interface Props { onImport: (text: string, save: boolean) => Promise<{ ok: boolean; report: BlueprintReport | null }> }

/** Paste a blueprint file's JSON: Validate, then Save as draft. Numbers change only through the file (spec §2.4). */
export function ImportBlueprintDialog({ onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [report, setReport] = useState<BlueprintReport | null>(null);
  useEffect(() => { if (open) { setText(''); setReport(null); } }, [open]);
  const problems = report ? [...(report.parseErrors ?? []), ...report.errors] : [];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="min-h-11" />}>Import JSON</DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader><DialogTitle>Import a blueprint file</DialogTitle></DialogHeader>
        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          <Label htmlFor="blueprint-json">Blueprint JSON</Label>
          <Textarea id="blueprint-json" rows={12} className="font-mono text-caption" value={text} onChange={(e) => setText(e.target.value)} />
          {report ? (
            <div className="space-y-1 text-sm">
              {problems.map((p: string) => <p key={p} className="text-destructive">{p}</p>)}
              {problems.length === 0 ? <p>No errors. {report.warnings.length} warnings, {report.unverified.length} values still to verify.</p> : null}
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" disabled={!text} onClick={async () => setReport((await onImport(text, false)).report)}>Validate</Button>
          <Button className="min-h-11" disabled={!text || problems.length > 0} onClick={async () => { const r = await onImport(text, true); if (r.ok) setOpen(false); }}>Save as draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

```tsx
// src/components/readiness-admin/BlueprintPaperCard.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { BlueprintEdits } from '@/lib/readiness/blueprint-admin';
import type { ExamBlueprintRecord } from '@/types';

type Paper = ExamBlueprintRecord['papers'][number];
interface Props {
  paper: Paper; edits: BlueprintEdits; locked: boolean;
  onPaper: (key: string, v: BlueprintEdits['papers'][string]) => void;
  onTopic: (key: string, v: BlueprintEdits['topics'][string]) => void;
}

/** One paper: its date and sitting, and every topic's marks, nodes, note, source reference and Verified switch. */
export function BlueprintPaperCard({ paper, edits, locked, onPaper, onTopic }: Props) {
  const pe = edits.papers[paper.key] ?? {};
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-heading text-h3 font-semibold">{paper.title}</p>
            <p className="text-sm text-muted-foreground">{paper.totalMarks} marks · {paper.durationMinutes / 60} hours · source {paper.sourceRef || '—'}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label htmlFor={`${paper.key}-date`}>Exam date</Label>
              <Input id={`${paper.key}-date`} type="date" className="w-full sm:w-44" disabled={locked} value={pe.examDate ?? paper.examDate ?? ''} onChange={(e) => onPaper(paper.key, { ...pe, examDate: e.target.value || null })} />
            </div>
            <div className="flex min-h-11 items-center gap-2">
              <Switch id={`${paper.key}-ok`} disabled={locked} checked={pe.verified ?? paper.verified} onCheckedChange={(v: boolean) => onPaper(paper.key, { ...pe, verified: v })} />
              <Label htmlFor={`${paper.key}-ok`}>Total and duration verified</Label>
            </div>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {paper.topics.map((t) => {
            const te = edits.topics[t.key] ?? {};
            return (
              <li key={t.key} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="font-semibold">{t.label} <span className="tabular-nums text-muted-foreground">· {t.marks} marks</span></p>
                  <p className="text-caption text-muted-foreground">{t.nodes.length} curriculum nodes{t.note ? ` · ${t.note}` : ''}</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${t.key}-src`} className="sr-only">Source for {t.label}</Label>
                  <Input id={`${t.key}-src`} placeholder="EG26 p.8" disabled={locked} value={te.sourceRef ?? t.sourceRef} onChange={(e) => onTopic(t.key, { ...te, sourceRef: e.target.value })} />
                </div>
                <div className="flex min-h-11 items-center gap-2">
                  <Switch id={`${t.key}-ok`} disabled={locked} checked={te.verified ?? t.verified} onCheckedChange={(v: boolean) => onTopic(t.key, { ...te, verified: v })} />
                  <Label htmlFor={`${t.key}-ok`}>Verified</Label>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
```

```tsx
// src/components/readiness-admin/BlueprintReview.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BlueprintPaperCard } from './BlueprintPaperCard';
import { canPublish, patchFrom, verifiedCount, type BlueprintEdits, type VerificationPatch } from '@/lib/readiness/blueprint-admin';
import type { BlueprintReport, ExamBlueprintRecord } from '@/types';

interface Props {
  record: ExamBlueprintRecord; report: BlueprintReport; verified: boolean;
  onSave: (patch: VerificationPatch) => Promise<boolean>; onPublish: (ack: boolean) => Promise<boolean>; onCopy: (year: number) => Promise<boolean>;
}
const EMPTY: BlueprintEdits = { papers: {}, topics: {}, levels: {} };

/** Spec §5.5: the report, each value's Verified switch and source, dates, then Publish or Copy to next year. */
export function BlueprintReview({ record, report, verified, onSave, onPublish, onCopy }: Props) {
  const [edits, setEdits] = useState<BlueprintEdits>(EMPTY);
  const [ack, setAck] = useState(false);
  const locked = record.status !== 'draft' && verified;
  const count = verifiedCount(record);
  const gate = canPublish(record, report, ack);
  const dirty = Object.keys(patchFrom(record, edits)).length > 0;
  return (
    <div className="space-y-6">
      <Card><CardContent className="space-y-2 text-sm">
        <p className="font-semibold">{count.verified} of {count.total} values verified{verified ? ' · learners can see this blueprint' : ' · learners see nothing from it until every value is verified'}</p>
        {report.errors.map((e: string) => <p key={e} className="text-destructive">{e}</p>)}
        {report.warnings.map((w: string) => <p key={w}>{w}</p>)}
      </CardContent></Card>
      {record.papers.map((p) => (
        <BlueprintPaperCard key={p.key} paper={p} edits={edits} locked={locked}
          onPaper={(key, v) => setEdits((e) => ({ ...e, papers: { ...e.papers, [key]: v } }))}
          onTopic={(key, v) => setEdits((e) => ({ ...e, topics: { ...e.topics, [key]: v } }))} />
      ))}
      <Card><CardContent className="space-y-3">
        <p className="font-heading text-h3 font-semibold">Cognitive levels</p>
        <ul className="divide-y divide-border">{record.cognitiveScheme.levels.map((l) => (
          <li key={l.key} className="flex items-center justify-between gap-3 py-2">
            <span>{l.label} <span className="tabular-nums text-muted-foreground">· {l.percent}% · {l.sourceRef || '—'}</span></span>
            <span className="flex min-h-11 items-center gap-2">
              <Switch id={`lvl-${l.key}`} disabled={locked} checked={edits.levels[l.key]?.verified ?? l.verified}
                onCheckedChange={(v: boolean) => setEdits((e) => ({ ...e, levels: { ...e.levels, [l.key]: { ...e.levels[l.key], verified: v } } }))} />
              <Label htmlFor={`lvl-${l.key}`}>Verified</Label>
            </span>
          </li>
        ))}</ul>
      </CardContent></Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="outline" className="min-h-11" disabled={!dirty || locked} onClick={async () => { if (await onSave(patchFrom(record, edits))) setEdits(EMPTY); }}>Save checks</Button>
        {report.warnings.length > 0 && record.status === 'draft' ? (
          <span className="flex min-h-11 items-center gap-2"><Checkbox id="ack" checked={ack} onCheckedChange={(v: boolean) => setAck(v)} /><Label htmlFor="ack">I have read the warnings</Label></span>
        ) : null}
        <Button className="min-h-11" disabled={!gate.ok || dirty} title={gate.reason ?? undefined} onClick={() => void onPublish(ack)}>Publish</Button>
        <Button variant="ghost" className="min-h-11" onClick={() => void onCopy(record.examYear + 1)}>Copy to {record.examYear + 1}</Button>
      </div>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/superadmin/blueprints/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { ImportBlueprintDialog } from '@/components/readiness-admin/ImportBlueprintDialog';
import { useBlueprints } from '@/hooks/useBlueprints';
import { verifiedCount } from '@/lib/readiness/blueprint-admin';
import type { ExamBlueprintRecord } from '@/types';

const COLUMNS: ColumnDef<ExamBlueprintRecord>[] = [
  { accessorKey: 'subjectTitle', header: 'Subject' },
  { accessorKey: 'grade', header: 'Grade' },
  { accessorKey: 'examYear', header: 'Exam year' },
  { accessorKey: 'version', header: 'Version' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'verified', header: 'Verified', cell: ({ row }) => { const c = verifiedCount(row.original); return <span className="tabular-nums">{c.verified} of {c.total}</span>; } },
];

/** Spec §5.5: every blueprint; import a file's JSON as a draft. */
export default function BlueprintsPage() {
  const { rows, loading, error, refresh, importJson } = useBlueprints();
  const router = useRouter();
  if (error) return <ErrorState title="Blueprints couldn't load" message={error} onRetry={refresh} retrying={loading} />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Readiness" title="Exam blueprints" description="Marks per topic and paper, checked value by value against the Examination Guidelines.">
        <ImportBlueprintDialog onImport={importJson} />
      </PageHeader>
      {loading ? <Skeleton className="h-48 w-full" /> : rows.length === 0 ? (
        <EmptyState title="No blueprints yet" description="Import one with npm run blueprint:import, or paste its JSON here." />
      ) : <DataTable columns={COLUMNS} data={rows} onRowClick={(r: ExamBlueprintRecord) => router.push(`/superadmin/blueprints/${r._id}`)} />}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/superadmin/blueprints/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { BlueprintReview } from '@/components/readiness-admin/BlueprintReview';
import { useBlueprint } from '@/hooks/useBlueprint';

export default function BlueprintPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const { record, report, verified, loading, error, refresh, save, publish, copy } = useBlueprint(id);
  if (error) return <ErrorState title="This blueprint couldn't load" message={error} onRetry={refresh} retrying={loading} />;
  if (loading || !record || !report) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${record.family} · v${record.version} · ${record.status}`} title={`${record.subjectTitle} Grade ${record.grade}, ${record.examYear}`} />
      <BlueprintReview record={record} report={report} verified={verified} onSave={save} onPublish={publish}
        onCopy={async (year: number) => { const ok = await copy(year); if (ok) router.push('/superadmin/blueprints'); return ok; }} />
    </div>
  );
}
```

`src/lib/constants.ts`: add `{ label: 'Blueprints', href: '/superadmin/blueprints', icon: Map },` to `SUPERADMIN_NAV` after Support. Import `Map` from `lucide-react` as `Map as MapIcon`, and use `icon: MapIcon`, so it doesn't shadow the global `Map`.

`tests/no-tints.test.ts` and `tests/palette-scan.test.ts`: add `'src/components/readiness-admin'` and `'src/app/(dashboard)/superadmin/blueprints'` to their Blueprint folder lists.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS, and `tsc` prints nothing. Check every new file with `wc -l`: all ≤ 300 lines.

- [ ] **Step 6: Commit**

```bash
git add src tests
LANE_SWEEP_OK=1 git commit -m "feat(readiness): super-admin blueprints: import JSON as a draft, verify value by value, set dates, publish, copy to next year" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 21: the walkthrough, the Phase D machine gate, and the measurement [needs E-9]

**Files:**
- Create: `e2e/support/readiness-seed.ts`, `e2e/readiness-walkthrough.spec.ts`
- Modify:
  - `e2e/support/db.ts` (export `withDb` and `userByEmail`, if E-23 has not already)
  - `e2e/support/session.ts` (`signInAsSuperAdmin`, if E-23 has not already)
  - `e2e/support/design-routes.ts` (`'/teacher/readiness'` in `TEACHER_ROUTES`; `'/student/readiness'` in `LEARNER_ROUTES`)
  - `e2e/design-gate.spec.ts` (a super-admin readiness test)
  - `scripts/design-gate.mjs` (the walkthrough step also runs `e2e/readiness-walkthrough.spec.ts`)
  - `e2e/baselines/request-sets.json` (re-recorded only for the new keys)
  - `e2e/README.md`
- Backend: `src/modules/Readiness/__tests__/perf.test.ts` (new) in the backend worktree

**Interfaces:**
- Consumes: every task above; **E-9** `npm run migrate:evidence`; L-C's invite-link sign-up, `watchPage`, `overflowsSideways`, `signInAsStandaloneTeacher`; the gate's `sweep`.
- Produces:
  - `interface ReadinessGroup { id: ObjectId; code: string; schoolId: ObjectId; teacherId: ObjectId; gradeId: ObjectId; subjectId: ObjectId }`
  - `seedReadinessGroup(): Promise<ReadinessGroup>`
  - `publishFixtureBlueprint(): Promise<string>` (it clones the imported draft into `E2E-FIXTURE-NSC-MATHEMATICS-GR12`, verified, dated)
  - `retireFixtureBlueprint(): Promise<void>`
  - `interface Q { code: string; level: 'knowledge' | 'routine' | 'complex' | 'problem_solving'; awarded: number; max: number }`
  - `seedIssuedTest(group: ReadinessGroup, email: string, questions: Q[]): Promise<string>`
  - `runBackendScript(name, args, env?)`

- [ ] **Step 1: Write the seeders**

In `e2e/support/db.ts`, put `export` in front of `async function withDb` and `async function userByEmail`, unless E-23 already did. In `e2e/support/session.ts`, add `signInAsSuperAdmin` exactly as E plan Task 23 Step 1 shows, unless it is already there.

```ts
// e2e/support/readiness-seed.ts
/**
 * Phase R walkthrough seeding, dev database only (assertLocalUrl in db.ts). A Grade 12 Mathematics group for the dev
 * standalone teacher (Grade and Subject linked to the CAPS nodes), a verified *fixture* blueprint cloned from the
 * imported draft (family E2E-FIXTURE-…, retired at the end; the real draft stays an unverified draft), and issued AI
 * markings that the backend's own migrate:evidence turns into final evidence. Collection names are Mongoose defaults.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { ObjectId, type Db } from 'mongodb';
import { userByEmail, withDb } from './db';

const BACKEND_DIR = process.env.E2E_BACKEND_DIR ?? 'C:/dev/campusly/.worktrees/backend-readiness';
export const FIXTURE_FAMILY = 'E2E-FIXTURE-NSC-MATHEMATICS-GR12';

export interface ReadinessGroup { id: ObjectId; code: string; schoolId: ObjectId; teacherId: ObjectId; gradeId: ObjectId; subjectId: ObjectId }
export interface Q { code: string; level: 'knowledge' | 'routine' | 'complex' | 'problem_solving'; awarded: number; max: number }

async function node(db: Db, code: string): Promise<ObjectId> {
  const n = await db.collection('curriculumnodes').findOne({ code, isDeleted: false });
  if (!n) throw new Error(`No CAPS node ${code}: run the CAPS import on the dev database first`);
  return n._id as ObjectId;
}

export function runBackendScript(name: string, args: string[], env: Record<string, string> = {}): void {
  execFileSync('npm', ['run', name, '--', ...args], { cwd: BACKEND_DIR, env: { ...process.env, ...env }, stdio: 'inherit', shell: process.platform === 'win32' });
}

export async function seedReadinessGroup(): Promise<ReadinessGroup> {
  return withDb(async (db) => {
    const teacher = await db.collection('users').findOne({ isStandaloneTeacher: true, firstName: 'Lindiwe', isDeleted: false });
    if (!teacher) throw new Error('No dev standalone teacher: seed the dev database first');
    const now = new Date();
    const schoolId = teacher.schoolId as ObjectId;
    const [gradeNode, subjectNode] = await Promise.all([node(db, 'CAPS-GR12'), node(db, 'CAPS-MATHEMATICS-GR12')]);
    const gradeId = new ObjectId();
    const subjectId = new ObjectId();
    const id = new ObjectId();
    const code = randomBytes(3).toString('hex').toUpperCase();
    await db.collection('grades').insertOne({ _id: gradeId, schoolId, name: `Grade 12 R${code}`, orderIndex: 12, curriculumNodeId: gradeNode, isDeleted: false, createdAt: now, updatedAt: now });
    await db.collection('subjects').insertOne({ _id: subjectId, schoolId, name: 'Mathematics', code: `M${code}`, gradeIds: [gradeId], curriculumNodeId: subjectNode, paperDefaults: null, isDeleted: false, createdAt: now, updatedAt: now });
    await db.collection('classes').insertOne({ _id: id, schoolId, name: `Grade 12 Maths ${code}`, gradeId, teacherId: teacher._id, capacity: 40, classroomCode: code, isHomeroom: false, isDeleted: false, createdAt: now, updatedAt: now });
    await db.collection('timetables').insertOne({ schoolId, classId: id, subjectId, teacherId: teacher._id, day: 'friday', period: 19, startTime: '15:00', endTime: '15:30', isDeleted: false, createdAt: now, updatedAt: now });
    return { id, code, schoolId, teacherId: teacher._id as ObjectId, gradeId, subjectId };
  });
}

/** Imports the real draft (unverified), then publishes a verified clone under the fixture family, dated 60 and 63 days out. */
export async function publishFixtureBlueprint(): Promise<string> {
  runBackendScript('blueprint:import', ['--file=scripts/blueprints/nsc-mathematics-gr12-2026.json', '--apply']);
  return withDb(async (db) => {
    const draft = await db.collection('examblueprints').findOne({ family: 'NSC-MATHEMATICS-GR12', status: 'draft', isDeleted: false });
    if (!draft) throw new Error('The draft blueprint did not import');
    const year = new Date(Date.now() + 2 * 3600_000).getUTCFullYear();
    const day = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
    const other = await db.collection('examblueprints').findOne({ subjectKey: 'CAPS-MATHEMATICS', grade: 12, examYear: year, status: 'published', isDeleted: false, family: { $ne: FIXTURE_FAMILY } });
    if (other) throw new Error(`${String(other.family)} is published on the dev database: retire it before the walkthrough`);
    const { _id, ...rest } = draft;
    void _id;
    await db.collection('examblueprints').updateMany({ family: FIXTURE_FAMILY, status: 'published' }, { $set: { status: 'retired' } });
    const inserted = await db.collection('examblueprints').insertOne({
      ...rest, family: FIXTURE_FAMILY, examYear: year, status: 'published', version: 1, publishedAt: new Date(), acknowledgedWarnings: [],
      cognitiveScheme: { ...draft.cognitiveScheme, levels: draft.cognitiveScheme.levels.map((l: Record<string, unknown>) => ({ ...l, verified: true })) },
      papers: draft.papers.map((p: Record<string, unknown> & { key: string; topics: Array<Record<string, unknown>> }, i: number) => ({
        ...p, verified: true, examDate: day(60 + 3 * i), topics: p.topics.map((t) => ({ ...t, verified: true })),
      })),
    });
    return String(inserted.insertedId);
  });
}

export async function retireFixtureBlueprint(): Promise<void> {
  await withDb((db) => db.collection('examblueprints').updateMany({ family: FIXTURE_FAMILY, status: 'published' }, { $set: { status: 'retired' } }));
}

/** A finalised paper of inline questions tagged to CAPS nodes, and the learner's AI marking of it, issued. */
export async function seedIssuedTest(group: ReadinessGroup, email: string, questions: Q[]): Promise<string> {
  return withDb(async (db) => {
    const user = await userByEmail(db, email);
    const student = await db.collection('students').findOne({ userId: user._id, isDeleted: false });
    if (!student) throw new Error(`No learner record for ${email}`);
    const nodes = await Promise.all(questions.map((q) => node(db, q.code)));
    const now = new Date();
    const paperId = new ObjectId();
    await db.collection('assessmentpapers').insertOne({
      _id: paperId, schoolId: group.schoolId, title: `Readiness check ${randomBytes(2).toString('hex')}`, subjectId: group.subjectId, gradeId: group.gradeId,
      topicIds: [...new Set(nodes.map(String))].map((s) => new ObjectId(s)), term: 3, year: now.getFullYear(), paperType: 'class_test',
      totalMarks: questions.reduce((s, q) => s + q.max, 0), duration: 60, instructions: '', capsCompliance: null, status: 'finalised', aiGenerated: false,
      difficulty: 'medium', version: 1, createdBy: group.teacherId, isDeleted: false, createdAt: now, updatedAt: now,
      sections: [{ title: 'Section A', instructions: '', order: 0, questions: questions.map((q, i) => ({
        questionId: null, questionText: `Question ${i + 1}`, options: [], marks: q.max, position: i, modelAnswer: 'x', markingGuideline: 'Method and answer.',
        diagram: null, curriculumNodeId: nodes[i], capsLevel: q.level, tagFrom: 'generator',
      })) }],
      // No assignment: the learners never see these as tests to write (Today would put a test due today first).
      assignments: [],
    });
    const marked = questions.map((q, i) => ({
      questionNumber: `1.${i + 1}`, studentAnswer: q.awarded === q.max ? 'x' : 'y', correctAnswer: 'x', marksAwarded: q.awarded, maxMarks: q.max,
      feedback: q.awarded === q.max ? 'Correct.' : 'Not quite.', rationale: q.awarded === q.max ? 'Full marks.' : 'The method is incomplete.',
    }));
    const total = questions.reduce((s, q) => s + q.awarded, 0);
    const max = questions.reduce((s, q) => s + q.max, 0);
    await db.collection('papermarkings').insertOne({
      paperId, paperType: 'assessment', studentId: student._id, studentName: '', teacherId: group.teacherId, schoolId: group.schoolId, classId: group.id,
      imageCount: 0, totalMarks: total, maxMarks: max, percentage: Math.round((total / max) * 1000) / 10, questions: marked, status: 'published',
      isDeleted: false, extractedHeader: null, paperMismatch: false, mismatchReason: null, aiRawResult: { questions: marked }, images: [], paperVersion: 1,
      issuedToStudent: true, issuedAt: now, createdAt: now, updatedAt: now,
    });
    return String(paperId);
  });
}
```

- [ ] **Step 2: Write the walkthrough (spec §11)**

```ts
// e2e/readiness-walkthrough.spec.ts
//
// Phase R walkthrough (spec §11) at 375 px, no console errors, no failed API calls: a Grade 12 Mathematics group,
// issued AI markings → final evidence (the backend's migrate:evidence) → readiness (readiness:recompute). The learner
// sees Readiness, the band or progress to the gate, a thin tile and three path items; new evidence completes an item;
// the teacher sees the class, who needs what and one learner's answers, and pins a topic; the super admin sees the
// real draft unverified. The fixture blueprint is retired at the end.
import { test, expect, type Browser, type Page } from '@playwright/test';
import { assertLocalUrl } from './support/local';
import { signInAsStandaloneTeacher, signInAsSuperAdmin } from './support/session';
import { overflowsSideways, watchPage, type Problem } from './support/watch';
import {
  publishFixtureBlueprint, retireFixtureBlueprint, runBackendScript, seedIssuedTest, seedReadinessGroup, type Q, type ReadinessGroup,
} from './support/readiness-seed';

const stamp = Date.now();
const PHONE = { width: 375, height: 812 };
const FUNC = 'CAPS-MATHEMATICS-GR12-T1-FUNC';
const CALC = 'CAPS-MATHEMATICS-GR12-T2-CALC';
const ALG = 'CAPS-MATHEMATICS-GR11-T1-EQN';
const learners = ['Ayanda', 'Bongi'].map((first) => ({ first, email: `test+readiness-${first.toLowerCase()}-${stamp}@example.test`, password: 'Learner1-check' }));
interface Session { page: Page; problems: Problem[] }
const levels = ['knowledge', 'routine', 'complex', 'problem_solving'] as const;
const qs = (code: string, n: number, awarded: number): Q[] => Array.from({ length: n }, (_: unknown, i: number) => ({ code, level: levels[i % 4], awarded, max: 2 }));

async function open(browser: Browser): Promise<Session> {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  return { page, problems: watchPage(page, () => []) };
}

async function join(browser: Browser, group: ReadinessGroup, l: (typeof learners)[number]): Promise<Session> {
  const s = await open(browser);
  await s.page.goto(`/register-student?code=${group.code.toLowerCase()}`);
  await s.page.getByLabel('First name').fill(l.first);
  await s.page.getByLabel('Last name').fill(`Readiness${stamp}`);
  await s.page.getByLabel('Email').fill(l.email);
  await s.page.getByLabel('Password', { exact: false }).first().fill(l.password);
  await s.page.getByLabel('Confirm password').fill(l.password);
  await s.page.getByRole('button', { name: 'Join Classroom' }).click();
  await s.page.waitForURL(/\/student$/);
  return s;
}

function evidenceAndReadiness(group: ReadinessGroup): void {
  const school = `--school=${String(group.schoolId)}`;
  runBackendScript('migrate:evidence', ['--apply', '--source=test', school]);
  runBackendScript('readiness:recompute', [school, '--apply']);
}

async function noSideways(page: Page, where: string): Promise<void> {
  expect(await overflowsSideways(page), `${where} scrolls sideways at 375 px`).toBe(false);
}

test('readiness and the path: learner, teacher and super admin', async ({ browser, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  test.setTimeout(300_000);
  const group = await seedReadinessGroup();
  await publishFixtureBlueprint();
  const [ayanda, bongi] = [await join(browser, group, learners[0]), await join(browser, group, learners[1])];
  try {
    await test.step('marked tests become evidence and readiness', async () => {
      await seedIssuedTest(group, learners[0].email, [...qs(FUNC, 10, 0), ...qs(CALC, 8, 1), ...qs(ALG, 6, 2)]);
      await seedIssuedTest(group, learners[1].email, [...qs(FUNC, 4, 1), ...qs(ALG, 2, 1)]);
      evidenceAndReadiness(group);
    });

    await test.step('the learner has Readiness as a phone tab: band, why, exam map, marks to gain, three items', async () => {
      const p = ayanda.page;
      await p.reload();
      await p.getByRole('navigation').getByRole('link', { name: 'Readiness' }).click();
      await p.waitForURL(/\/student\/readiness\/mathematics$/);
      await expect(p.getByRole('heading', { name: 'Exam readiness' })).toBeVisible();
      await expect(p.getByText(/\d+–\d+% · level \d/).first()).toBeVisible();
      await expect(p.getByText(/days to Paper 1/).first()).toBeVisible();
      await p.getByRole('button', { name: 'Why this range' }).click();
      await expect(p.getByText(/^Tested: \d of 6 topics/)).toBeVisible();
      await expect(p.getByRole('img', { name: /Paper 1: 150 marks in 6 topics/ })).toBeVisible();
      const week = p.getByRole('region', { name: 'This week' });
      await expect(week.getByRole('listitem')).toHaveCount(3);
      await expect(p.getByRole('link', { name: 'Start practice' })).toHaveAttribute('href', /\/student\/ai-tutor\/practice\?item=/);
      await expect(p.getByText(/–[d.]+ of 150 marks)/)).toHaveCount(0);
      await noSideways(p, 'the readiness page');
    });

    await test.step('a learner with little evidence sees progress to the gate and a thin tile', async () => {
      const p = bongi.page;
      await p.goto('/student/readiness/mathematics');
      await expect(p.getByText('Not enough evidence for a prediction yet')).toBeVisible();
      await expect(p.getByRole('progressbar', { name: 'Answers' })).toBeVisible();
      await expect(p.getByText(/\d answers? so far/).first()).toBeVisible();
    });

    await test.step('four new answers on the top topic complete it; Today moves to the next item', async () => {
      await seedIssuedTest(group, learners[0].email, qs(FUNC, 4, 1));
      evidenceAndReadiness(group);
      const p = ayanda.page;
      await p.goto('/student/readiness/mathematics');
      await expect(p.getByRole('region', { name: 'This week' }).getByText(/^Done /).first()).toBeVisible();
      await p.goto('/student');
      await expect(p.getByText(/^This week · /)).toBeVisible();
    });

    const teacher = await open(browser);
    await test.step('the teacher: class map, topic breakdown, who needs what, learners; one learner\'s answers; a pin', async () => {
      const p = teacher.page;
      await signInAsStandaloneTeacher(p);
      await p.goto(`/teacher/readiness/${String(group.id)}?subject=mathematics`);
      await expect(p.getByRole('heading', { name: 'Class readiness' })).toBeVisible();
      await expect(p.getByRole('img', { name: /class average/ })).toBeVisible();
      await expect(p.getByRole('region', { name: 'Who needs what' }).getByText('Functions and graphs').first()).toBeVisible();
      await noSideways(p, 'class readiness');
      await p.getByRole('row', { name: new RegExp(learners[0].first) }).click();
      await p.waitForURL(/\/teacher\/readiness\/learners\//);
      await expect(p.getByText(/^Tested: \d of 6 topics, \d+ of 150 marks\. Their weighted average/)).toBeVisible();
      await p.getByRole('button', { name: 'Functions and graphs' }).first().click();
      await expect(p.getByText('Answers behind this topic')).toBeVisible();
      await expect(p.getByText(/Test Q1\.\d+ · \d of 2 · counts \d+%/).first()).toBeVisible();
      await p.keyboard.press('Escape');
      await p.getByRole('button', { name: 'Pin a topic' }).click();
      await p.getByRole('dialog').getByLabel('Exam topic').click();
      await p.getByRole('option', { name: 'Differential calculus' }).click();
      await p.getByRole('dialog').getByRole('button', { name: 'Pin as first this week' }).click();
      await expect(p.getByText(/From your teacher/).first()).toBeVisible();
    });

    await test.step('the learner sees the pin first', async () => {
      await ayanda.page.goto('/student/readiness/mathematics');
      await expect(ayanda.page.getByText('Your teacher picked this for you.', { exact: false }).first()).toBeVisible();
    });

    const admin = await open(browser);
    await test.step('the super admin sees the real draft unverified; learners see nothing from it', async () => {
      await signInAsSuperAdmin(admin.page);
      await admin.page.goto('/superadmin/blueprints');
      await admin.page.getByRole('row', { name: /Mathematics.*draft/ }).click();
      await expect(admin.page.getByText(/0 of \d+ values verified · learners see nothing from it/)).toBeVisible();
    });

    expect([ayanda, bongi, teacher, admin].flatMap((s) => s.problems), 'console errors and failed API calls').toEqual([]);
  } finally {
    await retireFixtureBlueprint();
  }
});
```

- [ ] **Step 3: Extend the machine gate**

- `e2e/support/design-routes.ts`: add `'/teacher/readiness'` to `TEACHER_ROUTES` and `'/student/readiness'` to `LEARNER_ROUTES`.
- `e2e/design-gate.spec.ts`: import `signInAsSuperAdmin`, and add:

```ts
test('super admin: exam blueprints', async ({ page, baseURL }) => {
  assertLocalUrl(baseURL ?? '', 'E2E_BASE_URL');
  await signInAsSuperAdmin(page);
  await test.step('/superadmin/blueprints', () => sweep(page, '/superadmin/blueprints', '/superadmin/blueprints'));
});
```

- `scripts/design-gate.mjs`: in the "launch walkthrough on the production build" step, run the walkthrough specs together:

```js
sh('npx playwright test e2e/standalone-launch.spec.ts e2e/evidence-walkthrough.spec.ts e2e/readiness-walkthrough.spec.ts');
```

  If E's walkthrough is not in this branch yet, list only the files that exist.
- `e2e/README.md`, under the stack notes: "Phase R's walkthrough runs the backend's `blueprint:import`, `migrate:evidence` and `readiness:recompute` in `E2E_BACKEND_DIR` (default `C:/dev/campusly/.worktrees/backend-readiness`), whose `.env` must point at the dev database. It publishes a verified fixture blueprint (`E2E-FIXTURE-NSC-MATHEMATICS-GR12`) and retires it at the end; the real draft stays an unverified draft."

- [ ] **Step 4: Measure the compute time (backend worktree)**

```ts
// src/modules/Readiness/__tests__/perf.test.ts
//
// Spec §11 "Measured": the compute time for a learner with 2,000 rows. Reported, not a CI gate (the bound is loose).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { AnswerEvidence } from '../../Evidence/model.js';
import { ExamBlueprint } from '../model-blueprint.js';
import { LearnerReadiness, ReadinessSnapshot } from '../model-readiness.js';
import { PathItem } from '../model-path.js';
import { recomputeReadiness } from '../service-compute.js';
import { cleanUpClassrooms } from '../../../test-utils/standalone-classroom.js';
import { cleanUpReadiness, grade12Learner, makeCurriculum, publishFixture, readinessRoom, type ReadinessWorld } from '../../../test-utils/readiness-fixture.js';

const NOW = new Date('2026-09-29T08:00:00Z');
let w: ReadinessWorld;
let key: { schoolId: mongoose.Types.ObjectId; studentId: mongoose.Types.ObjectId; subjectKey: string };

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!);
  await Promise.all([ExamBlueprint.syncIndexes(), LearnerReadiness.syncIndexes(), ReadinessSnapshot.syncIndexes(), PathItem.syncIndexes()]);
  w = await makeCurriculum();
  const room = await readinessRoom(w);
  await publishFixture(w, { verified: true, examDates: ['2026-10-27', '2026-10-30'] });
  const l = await grade12Learner(room, 'Perf');
  const nodes = [w.nodes.FUNC12, w.nodes.CALC12, w.nodes.PROB12, w.nodes.TRIG12, w.nodes.STAT12];
  const docs = Array.from({ length: 2000 }, (_: unknown, i: number) => {
    const at = new Date(NOW.getTime() - (i % 200) * 86_400_000);
    return {
      schoolId: room.schoolId, studentId: l.studentId, subjectId: room.maths12, topicNodeId: nodes[i % 5], subtopicNodeId: null, topicFrom: 'question',
      cognitiveLevel: ['knowledge', 'routine', 'complex', 'problem_solving'][i % 4], marksAwarded: i % 3, marksAvailable: 2, markedBy: 'ai', markerNote: '',
      source: { type: 'test', channel: 'online', recordId: new mongoose.Types.ObjectId(), parentId: new mongoose.Types.ObjectId(), itemKey: String(i), position: i, attemptNumber: 1 },
      questionKey: `perf:${i}`, questionId: null, answer: { kind: 'typed', text: 'x', truncated: false, hash: 'h' }, markedAt: at, status: 'final', finalAt: at,
      totalOverridden: false, diagnosis: { state: 'none', cacheKey: 'k', attempts: 0 }, isDeleted: false, createdAt: at, updatedAt: at,
    };
  });
  await AnswerEvidence.collection.insertMany(docs);
  key = { schoolId: room.schoolId, studentId: l.studentId, subjectKey: w.subjectKey };
  await recomputeReadiness(key, NOW);
});
afterAll(async () => {
  await cleanUpReadiness(w);
  await cleanUpClassrooms();
  await mongoose.disconnect();
});

describe('compute time', () => {
  it('reports p95 over 20 recomputes of a 2,000-row learner', async () => {
    const ms: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      const t = performance.now();
      await recomputeReadiness(key, new Date(NOW.getTime() + i * 1000));
      ms.push(performance.now() - t);
    }
    const p95 = [...ms].sort((a, b) => a - b)[18];
    console.log(`[readiness] recompute p95 ${p95.toFixed(1)} ms over 20 runs (2,000 rows)`);
    expect(p95).toBeLessThan(2000);
  });
});
```

Run: `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run src/modules/Readiness/__tests__/perf.test.ts`
Expected: PASS, printing `[readiness] recompute p95 … ms`. Report the number against spec §11's 150 ms target. If it is over, profile before changing any maths: history backfill runs once per version, so it is outside the timed loop.

- [ ] **Step 5: Run the walkthrough and the gate**

Start the stack as `e2e/README.md` describes:
- the backend from `C:\dev\campusly\.worktrees\backend-readiness` on 4500, with `DEV_SIGN_IN=true`, its `.env` pointing at the dev Mongo on 27047 and the dev Redis on 6391
- **the frontend is started by the gate itself on 3500**, so keep 3500 free

Stop the backend when the lane ends.

Run: `npx playwright test e2e/readiness-walkthrough.spec.ts`
Expected: 1 passed, no problems listed.

Run: `npx playwright test e2e/design-gate.spec.ts`
Expected: the only soft failures are "no baseline" for `/teacher/readiness`, `learner:/student/readiness` and `/superadmin/blueprints`. Any other failure is a real fault: sideways scroll, an unnamed control, a missing focus ring, or a changed request set on an existing page. Fix it test-first in the owning component, never by loosening the gate.

Run: `E2E_RECORD_BASELINE=1 npx playwright test e2e/design-gate.spec.ts -g "standalone teacher pages|standalone learner pages|super admin: exam blueprints"` then `git diff e2e/baselines/request-sets.json`
Expected: the diff adds only the three new route keys. No existing key changes: the gate's learner has no readiness, so Today makes no `/readiness/me` call.

Run: `npm run gate:design`
Expected: every stage green, ending with the summary line `Gate GREEN`. The stages are:
- vitest and tsc
- file sizes (new ≤ 300, touched ≤ 350)
- the production build, and `/design` returning 404
- the launch walkthrough and `readiness-walkthrough.spec.ts`
- the width, label, focus and request-set sweep at 320, 375, 768, 1024, 1280 and 1440

- [ ] **Step 6: Commit (frontend, then backend)**

```bash
git add e2e scripts/design-gate.mjs
LANE_SWEEP_OK=1 git commit -m "test(e2e): the Phase R walkthrough at 375 px (evidence to readiness, the path, the class, a pin) and the machine gate on the readiness surfaces" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

In the backend worktree:

```bash
git add src/modules/Readiness/__tests__/perf.test.ts
LANE_SWEEP_OK=1 git commit -m "test(readiness): report the recompute p95 for a 2,000-row learner" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Phase R finish

- [ ] **Backend:** `set -a; . C:/dev/campusly/test-readiness.env; set +a; npx vitest run && npx tsc --noEmit && npm run build`, all green. **Frontend:** `npm run gate:design` gives `Gate GREEN`.
- [ ] **Dry runs on the dev copy, backend worktree:**
  - `npm run blueprint:import -- --file=scripts/blueprints/nsc-mathematics-gr12-2026.json` prints 0 errors, 0 warnings and the unverified list.
  - `npm run readiness:recompute -- --blueprint=<draft id>` gives the learner count. The draft is not published, so nothing is computed from it.
  - `npm run readiness:calibrate` reports `tests: 0` until trials are marked.
  - Report all three results.
- [ ] **Review:** one fresh review of both branches (superpowers:requesting-code-review), then one fix pass. Hand to the orchestrator for the compromise protocol and the push. No pushes from this lane.
- [ ] **Clean-up:** `docker rm -f campusly-test-mongo-r campusly-test-redis-r`, and stop any server this lane started. Leave both worktrees in place (no `git worktree remove`).
- [ ] **Report to the orchestrator:**
  - commits
  - the perf p95
  - the dry-run outputs
  - which E pieces were waited on (E-8, E-9, E-17, E-hook) and when each landed
  - the lane-hours for the tracker
- [ ] **Blueprint verification for Shaun (not code).** When the 2026 Mathematics Examination Guidelines and the DBE timetable arrive, a super admin works through `/superadmin/blueprints/<draft>`:
  - Check each value against its page, and fix any number in the JSON file (then `blueprint:import --apply`).
  - Set the sources and both exam dates, switch every value to Verified, and publish.
  - Only then do learners see readiness (ruling RP7).
