# Learner portal for standalone teachers' learners — design

**Date:** 2026-09-25 · **Status:** design approved in conversation; owner delegated the spec review; fact-checked against the code (2026-09-25, 17 corrections applied)
**Project 2 of 4** in the standalone programme: (1) standalone teacher portal ✅ → (2) learner portal → (3) syllabus → (4) Coursera-quality lessons.

## Intent

A learner of a standalone (self-signed-up) teacher joins with the teacher's link or code, sees only what that teacher actually uses, receives every lesson, homework and test the teacher sets, and can ask the AI tutor within a limit the teacher's plan can afford. Nothing on the learner side is empty, broken, or talks about "school". Success: the launch walkthrough, extended with the learner's journey, passes at 375 px with no console errors and no failed API calls.

**Decided with the owner:**
- One learner account can belong to **several groups of the same teacher** (e.g. Lindiwe's Maths and Physical Sciences groups). A second teacher still means a second account.
- Learner AI has **its own limit, separate from the teacher's allowance**: a monthly **class pool** shared by the teacher's learners, with a **per-learner cap** inside it.

**Found in the audit, all fixed here:** sign-up can put the password in the URL; learners who join after a unit is released never get it; joining a second group replaces the first; learner AI is unmetered; the teacher's trial and billing banners show to learners; the dashboard's lesson cards read the old lesson-plan system and spin forever on error; the timetable shows a fake "P1 Subject"; the learner nav has 13–14 items, half always empty. (Shipped separately as a hotfix before this project: billing routes — checkout, cancel, resume, invoices — accepted any signed-in user of the school, so a learner could cancel their teacher's plan.)

Out of scope: a syllabus / topic-mastery view (Project 3); block interactivity, video, drag-and-drop, hotspot, homework items inside units (Project 4); one login across several teachers; parents; email verification for learners (many learners have no working email).

## 1. Knowing the learner is standalone

- `GET /auth/me` returns `user.isStandaloneLearner`, computed on the server: the user is a `student`, their school's `plan` is `'standalone'`, and the school's owner is a standalone **teacher** (standalone coach clubs also use `plan: 'standalone'` and are excluded). The frontend reads it through one helper, `useIsStandaloneLearner`.
- After learner sign-up the frontend refreshes the account (`refreshAccount()` in `registerStudent`, as teacher sign-up already does), so the flag is there on the first page.
- School learners' portal is unchanged.

## 2. Navigation and pages (standalone learners only)

| Item | Path | Notes |
|---|---|---|
| Today | `/student` | see below |
| Lessons | `/student/courses` | the teacher's Units, labelled "Lessons" (the old `/student/lessons` system is hidden) |
| Homework | `/student/homework` | projects (`GET /assignments/student/mine`) merged into the same list; a project opens `/student/assignments/[id]`, whose Back goes to Homework |
| Tests | `/student/tests` | |
| Marks | `/student/grades` | labelled "Marks" |
| AI tutor | `/student/ai-tutor` | practice and history pages allowed but not in the nav |
| Profile | `/student/profile` | my groups + join another group with a code |

- `STANDALONE_STUDENT_NAV` and a `standalone-student-paths` allow-list are the single source of truth (mirrors `STANDALONE_TEACHER_NAV` / `standalone-teacher-paths.ts`). Allow-listed: the paths above and their sub-pages (`/student/courses/**`, `/student/homework/**`, `/student/assignments/[id]`, `/student/tests/**`, `/student/ai-tutor/**`). Any other `/student/*` page redirects a standalone learner to Today (same layout-guard pattern as the teacher side). Test: every nav href is allow-listed and every allow-listed path has a page.
- **Hidden:** old Lessons, Assignments list (folded into Homework), Timetable, Classroom, Wellbeing, Notice board, My Classes (Profile shows groups), Progress, and every school-only page.
- **Today** shows: continue your current lesson (unit), next homework, next test, and "N tutor messages left this month". Not shown to standalone learners: the old lesson-plan cards ("Most recent lesson", "Lessons this week"), the join card (moves to Profile), and the Recommended/Mastery widgets (free-text topics; Project 3 replaces them with syllabus mastery). If the dashboard request fails, Today shows an error with Retry, never an endless spinner (all learners).
- **Profile** drops school wording ("Who you are at school", admission number) for standalone learners, lists all their groups with the teacher's name, and holds the join-with-code card. The page is already 341 lines: groups and joining are separate components.
- **Banners:** `TrialBanner` and `DunningBanner` show only to the billing owner (the same rule as the billing routes: standalone teacher or coach, school admin, principal).
- Empty states name what happens next ("When your teacher releases a lesson, it appears here").

## 3. Joining

- **Invite link:** the teacher's "how learners join" message and My classes offer `/register-student?code=<classroomCode>`; the page pre-fills the code (reading search params inside a `Suspense` boundary, as `/reset-password` does).
- **No password in the URL:** no auth form may submit natively before it is interactive. Every form that takes a password uses `method="post"` and keeps its submit button disabled until hydrated: `/register-student`, `/login`, `/signup/teacher`, `/signup/coach`, `/register` (`RegisterForm`), `/reset-password`, `/auth/change-password`. Test: none of them can produce a GET with a password in the query.
- **Existing email at sign-up:** today's message ("An account with this email already exists. Please sign in or ask your teacher to reset the portal password.") becomes "You already have an account. Sign in, then join with the code on your Profile." for the learner sign-up path.
- **Second group** (`POST /academic/classes/join`, from Profile):
  - code of another group **in the learner's school** → add it to `Student.subjectClassIds` (existing, indexed with `schoolId`, currently written by nothing and already read by `getMyStudentClasses`); `classId` stays;
  - code that exists **in another school** → 409 "This code is for another teacher's class. Each teacher's class needs its own account for now." (the lookup no longer stops at the learner's school, only to choose the message);
  - a group they are already in → 200 with "You're already in this group" (not 409);
  - capacity counts the class's roster by the rule below.
- **Leaving a second group:** the teacher's "remove from this group" on a learner who is in the group only through `subjectClassIds` removes that group, not the learner (today `DELETE /students/:id` soft-deletes the whole learner).
- **Who is in a class** — two helpers used everywhere below:
  - `classRosterFilter(classId)` for teacher-side reads: `classId` is the class **or** `subjectClassIds` contains it. Combined with other filters via `$and` (it must not overwrite an existing `$or`, e.g. the student search).
  - `learnerClassIds(student)` for learner-side access: `classId` ∪ `subjectClassIds`.
- **Call sites** (all reachable from the standalone portals; each gets a test; results grouped by `String(student.classId)` are regrouped per class):
  - learner side: homework list (`Homework/controller.ts`), detail (`Homework/service.ts`), submit (`service-homework-submit.ts`), dashboard counts (`service-homework-dashboards.ts`); `GET /student/dashboard` (`Student/service-dashboard.ts`); test papers list/view/start (`QuestionBank/service-submissions-student.ts` — a submission records the class the paper was assigned to, not `student.classId`); projects (`Assignment/service.ts` list/detail/submit);
  - teacher side: class rosters and counts (`Academic/services/grade.service.ts`), register save check (`Attendance/service.ts`), unit release count and enrolment (`Course/service-class-unit.ts`, `Course/service.ts`), gradebook (`Academic/services/assessment.service.ts`, `term-summary.service.ts`, and the frontend `lib/gradebook-helpers.ts` filter), marking queue (`TeacherWorkbench/services/marking-queue.db.ts`), paper marking workspace (`QuestionBank/service-paper-marking-workspace.ts`), batch marking (`AITools/service-marking-batch.ts`), class notifications (`Notification/service.ts`, which also gains the missing `schoolId` filter).

## 4. Lessons reach every learner

- **Enrol on join:** `enrolLearnerInReleasedUnits(studentId, classId)` enrols the learner in every unit whose `scope.classIds` contains the class. It reuses the bulk-upsert from `assignCourseToClass` (extracted), is idempotent, and never re-enrols a learner who has any enrolment row for that unit (including one the teacher dropped). Called from every way a learner enters a class: learner sign-up (new account **and** claiming a learner the teacher added), `POST /academic/classes/join`, `POST /students`, `POST /students/bulk-import`, and `PUT /students/:id` when `classId` changes.
- **Backfill:** `npm run migrate:unit-enrolments` (dry run by default, `--apply` to write) enrols existing learners missing units released to their classes.

## 5. Learner AI budget

- **Pool:** per standalone school per calendar month (SAST, the teacher allowance's window): `LEARNER_TUTOR_POOL_FREE = 100`, `LEARNER_TUTOR_POOL_PRO = 600` (Trial counts as Pro, same trial/cancel/past-due rules as the teacher allowance). **Per learner:** `LEARNER_TUTOR_CAP = 60` a month.
- **What counts (1 each):** a tutor message on any of the three send paths (`/ai-tutor/chat`, `/chat/stream`, image), which includes homework help in the AI drawer; and generating a practice set. Marking a practice set is not counted.
- **Not counted:** AI marking of a test submission. **Homework:** a submission gets an `aiMarkCount`; AI marks a learner's homework at most `HOMEWORK_AI_REMARKS = 3` times per homework; later resubmissions are saved and wait for the teacher (`gradingGeneration` can't be used — teacher grading bumps it too).
- **Ledger:** `AIUsage` gains `scope: 'teacher' | 'learner'` (default `'teacher'`) and an index on `{ schoolId, scope, userId, createdAt }`. The teacher allowance counts only `scope: 'teacher'` rows (today it counts every row of the school). Check before the call, record after success; a failed AI call is not counted; racing overshoot of a few messages is acceptable.
- **Refused:** 402 `code: 'LEARNER_AI_LIMIT'` with `{ used, limit, resetsAt, scope: 'learner' | 'class' }`, decided **before** the stream's SSE headers are sent. The frontend recognises it next to `AI_ALLOWANCE` (`lib/ai-allowance.ts`) and in the streaming hook (`useAITutor`), and shows the learner "You've used your 60 tutor messages this month" or "Your class has used this month's tutor messages", with the reset date and no upgrade button (a learner can't pay). The teacher's Billing shows "Learners' tutor messages: 212 of 600 used".
- **Cost:** tutor requests get prompt caching (new): the fixed instructions come first behind a cache breakpoint, the per-turn context (recent marks, page context) after it, and the conversation history cached. History stays at the last 20 messages. The model is whatever `ANTHROPIC_MODEL` says (default `claude-sonnet-5`); the estimate ≈ R0.18 a message with caching (Sonnet 5 at $2 / $10 per million tokens, ≈ R18/$) is to be confirmed from `AIUsageLog` token rows after launch.
- **Other learner AI:** `POST /content-library/grade-attempt` (old lesson materials only) gets a validation schema with length caps, and refuses standalone schools through the existing, unused `rejectStandalonePlan` middleware. Any other AI entry point a standalone learner can reach is either counted above or refused.
- School (non-standalone) learners keep their current behaviour.

## 6. Learners hear about new work

- A `notifyUsers(schoolId, userIds, notice)` helper (in-app) plus the roster rule of §3.
- Notified: homework created (`HomeworkService.create`); a unit released (`service-class-unit.ts` release); a project released (`addClassAssignment`); a test assigned in online mode that is already open (`service-paper-assignments.ts addAssignment` — a future `releaseAt` or paper mode sends nothing); homework or a project marked by the teacher (test results already notify).
- No email.

## Risks and rulings

- One email = one account (unique `User.email`), so a learner with two teachers needs two email addresses. Accepted; one login across teachers is out of scope. Cost if wrong: support questions from tutoring families.
- Answers inside lesson content blocks stay visible to a learner who inspects network traffic: those blocks are practice, marked in the browser, never counted; quick checks (counted) already hide answers. Cost if wrong: a learner can self-mark practice.
- Pool and cap numbers are estimates and constants. Cost if wrong: a class runs out early (raise) or costs more than planned (lower).
- The roster change touches about 20 call sites; one helper each side, a test per call site, and school learners' `subjectClassIds` are empty, so their rosters are unchanged.
- No learner email verification: a learner could join with someone else's email. Cost if wrong: that email can't sign up later (support resets it).

## Testing

TDD per task (backend vitest against Mongo, frontend vitest for pure helpers). New tests: `isStandaloneLearner` (teacher school yes, coach club no, school no); nav/allow-list consistency; `?code=` prefill; auth forms can't submit as GET; join second group (same school adds, other school refused with the message, repeat is a no-op, capacity counts both); leave a second group; `classRosterFilter` / `learnerClassIds` at each call site; enrol-on-join from each join path, no re-enrol of dropped, and the backfill script; learner tutor pool and cap (counts on all three send paths and practice generation, refuses before SSE, resets monthly, plan-dependent, teacher allowance unaffected); homework AI re-mark limit; grade-attempt validation and standalone refusal; notifications for each event; banners hidden for learners.

**Launch check (definition of done):** the Playwright walkthrough (`e2e/standalone-launch.spec.ts`) extends the teacher's journey with a learner who joins through the invite link, joins a second group, opens a lesson released before they joined, does homework, takes a test, sees the mark, and hits the tutor limit — at 375 px, no console errors, no failed API calls.
