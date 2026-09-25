# Standalone teacher portal, ready for real users — design

**Date:** 2026-09-25 · **Status:** approved in conversation; fact-checked against the code (2026-09-25)
**Project 1 of 4** in the standalone programme: (1) standalone teacher portal → (2) student portal → (3) syllabus → (4) Coursera-quality lessons.

## Intent

Launch Campusly first as a product a teacher signs up for on their own (no school admin). Only quality features that a standalone teacher will actually use; everything else is hidden for them. Success: a teacher can sign up, verify their email, say what they teach, create a class, get learners in with a code, build and release an AI lesson unit, set homework and a test, mark with AI, see marks — without hitting a dead end, an error, or a school-only feature — and understands their free AI allowance and how to upgrade.

**Decided with the owner:**
- *Lessons* = the Coursera-style Units system (Course, `kind: 'class_unit'`), renamed "Lessons" for standalone teachers. The old lesson-plan tool is removed for them; existing standalone drafts there are not carried over (pre-launch).
- Set work = **Homework** (day-to-day, self-marking) + **Test papers** (formal, with memo). **Assignments** stops being a separate page: its essay/project brief with a rubric becomes a Homework type (see §2).
- **Textbooks** stay. The resource **Library** is hidden.
- **Parents** are not part of the standalone launch.
- **One AI allowance** for all AI actions (free ≈ 20/month; trial and Pro unlimited within fair use).
- A **simple register** (per-lesson attendance for the teacher's own groups) stays.

Out of scope here (later projects): the learner portal, syllabus pacing and mastery, lesson interactivity upgrades.

## 1. Navigation (standalone teachers only)

| Section | Items |
|---|---|
| Today | Today |
| Teach | Lessons (Units), Textbooks |
| Assess | Homework, Test papers, Marking, Gradebook |
| Class | My classes (groups, learners, join code), Register |
| Me | Billing, Settings |

- `STANDALONE_TEACHER_NAV` and `standalone-teacher-paths.ts` are the single source of truth; every allow-listed path has a page; dead entries (`/teacher/lesson-plans`, `/teacher/quick-make`) are removed.
- Pages outside the allow-list redirect a standalone teacher to Today (existing layout guard).
- Hidden for standalone: Assignments, old lesson plans (`/teacher/lessons*` lesson-plan pages), Library (`/teacher/curriculum/content`, `/preview`, `/import`), anything parent- or school-admin-facing. School teachers' navigation is unchanged.
- "Lessons" routes for standalone teachers point at the Units pages (`/teacher/courses…`); labels and page copy say "Lesson" / "lessons" for them.
- `STANDALONE_DEFAULT_MODULES` holds exactly the modules this nav needs. Today it is `auth, academic, ai_tools, teacher_workbench, learning, homework, attendance, incident_wellbeing, communication, courses`; `incident_wellbeing` and `communication` (no standalone page) come off. `learning` stays only if Project 2 needs it.

## 2. Assignments → a Homework type

Homework already drafts questions with AI ("Draft with AI", Phase 2D) and marks itself. What only Assignments has is an **essay/project brief with a rubric**: AI drafts the brief and rubric criteria (`Assignment/service-ai-generate.ts`), and the teacher marks per criterion (`rubricMarks`); marks publish to the Gradebook (`service-gradebook-publish.ts`).

- The Homework "New" flow offers three types: **Exercise** (questions), **Reading**, and **Project** (brief + rubric). Project is built on the existing Assignment backend — no data migration and no new model.
- The Homework list shows homework and projects together; a project opens the existing rubric marking screen.
- The separate Assignments nav item and list page go for standalone teachers. Existing assignment records stay and still show in the Gradebook.

## 3. Sign-up and onboarding

- **One sign-up path:** `/signup/teacher` (`POST /auth/signup/standalone-teacher`) is canonical. Today `/register-teacher` is a separate live form (`POST /auth/register-teacher`) linked from the login page and the teachers landing page (`StartFreeLink`); it becomes a redirect, those links move to `/signup/teacher`, and the `registerTeacher` backend path is removed once nothing calls it. The mobile app has no sign-up screen, so nothing else depends on either.
- **Email verification:** a verification token emailed at sign-up (and re-sendable); `User.emailVerifiedAt`. Unverified teachers can use the app, see a persistent banner, and are refused AI actions with a clear message ("Verify your email to use AI. Resend link."). Links expire after 24 h; resend is rate-limited; tokens are stored hashed. **Teachers who already exist when this ships count as verified** (backfill `emailVerifiedAt` = their `createdAt`), so nobody is locked out.
- **Onboarding (three steps, resumable, skippable only where noted):**
  1. **What you teach:** phase → grade(s) → subject(s) picked from the CAPS tree. This picker is **new** (today's onboarding takes typed grade and subject names and resolves them to CAPS best-effort). It saves through the existing `TeacherSettingsService.updateTeachingScope`, which validates the CAPS nodes, stores `User.teachingScope`, and materialises school Grade/Subject rows (needed by classes and Textbooks).
  2. **Your first class:** name + grade + subject (prefilled from step 1); shows the join code and a copyable "how learners join" message (learners self-register at `/register-student` with the code).
  3. **Your first lesson:** open the Units builder prefilled with that class and a CAPS topic from their scope. Skippable.
- Today's onboarding checklist reflects the same steps until done.
- Every empty state in the standalone nav names the next action.

## 4. One AI allowance

- **Ledger:** a new `AIUsage` record per AI action: `{ schoolId, userId, action, createdAt, meta }` where `action` ∈ unit_outline, unit_item, unit_rewrite, revision_item, paper, paper_regenerate, paper_diagram, homework_draft, homework_grade, project_draft, marking, memo (one per AI entry point reachable from the standalone nav — see Enforcement). One helper `recordAIUse` / `assertAIAllowance(user, action)` replaces the per-feature counters (`free-allowance.ts`, `consumeFreePaperGeneration`, `assertCourseGenerationAccess`, the daily unit cap interplay is kept as a separate per-day safety cap).
- **Limits:** Free = `FREE_AI_ACTIONS_PER_MONTH` (20) per calendar month (SAST); Trial and Pro = fair-use cap `PRO_AI_ACTIONS_PER_MONTH` (500). Counted per teacher's school (standalone school = the teacher). When a 14-day trial ends without a successful charge the subscription already drops to Free automatically (`handleChargeFailure`), so the Free limit applies from then on.
- **Enforcement:** today only units, paper generation and lesson-material papers are guarded; homework drafting and AI grading, assignment drafting, AI marking, memos, lesson chat and Library generation are not. For standalone schools:
  - every AI entry point reachable from the standalone nav — unit outline/items/rewrite/revision item, paper generate/regenerate/diagram, homework draft and AI grading, project (assignment) brief draft, AI marking and memo — calls `assertAIAllowance` before spending and records after success; failures (AI error) are not counted;
  - AI entry points behind pages hidden from standalone teachers (lesson-plan chat, Library generation, school-only modules) refuse standalone schools with 403, so the API can't be used to go around the allowance;
  - the existing per-day safety caps in `usageLimits.ts` (`maxAiGenerationsPerDay`, `maxPaperMarkingsPerDay`) stay.
  402 with a plain message and `{ used, limit, resetsAt }`.
- **Learners' AI tutor** (chat and practice) is unmetered today; it is **out of scope here** and is limited in Project 2 (student portal) with its own per-learner cap, not the teacher's allowance.
- **UI:** "12 of 20 AI actions left this month" in Billing and next to AI buttons when under 5 remain; the 402 opens one upgrade prompt (to `/my/billing`).
- School (non-standalone) schools keep their current behaviour.

## 5. Register (simple)

- Keep the existing per-class/period attendance page; add it to the standalone nav as "Register"; make sure it works with no timetable (period = the lesson number the teacher picks) and shows today's date by default.

## 6. Billing and readiness

- Verify the OneGate subscription flow end to end in sandbox (trial → pay → Pro active → webhook → renewal/cancel), document the required env vars, and show plan, renewal date and AI usage on `/my/billing`. PayFast stays (school fee payments), untouched.
- **Launch check (definition of done):** a scripted headless walkthrough signs up a fresh teacher (test mode), verifies email, completes onboarding, joins a learner with the code, builds and releases a lesson unit, sets homework and a test, marks, views the gradebook, hits the free allowance and sees the upgrade path — with no console errors, no failed API calls, and every page usable at 375 px wide.

## Risks and rulings

- Renaming Units to "Lessons" only for standalone teachers means copy is role-dependent; keep the label in one helper so it can't drift. Cost if wrong: confusing words in a few places.
- Email verification could block a teacher mid-onboarding; they can still do non-AI steps and resend. Cost if wrong: a support request.
- The fair-use Pro cap (500/month) is a guess; it's a constant. Cost if wrong: a heavy user hits it — we raise it.
- Hiding Library/lesson plans leaves backend routes mounted for schools; that's intended.

## Testing

TDD per task (backend vitest against Mongo; frontend vitest for pure helpers). New tests: allowance ledger and enforcement per AI action; verification tokens (issue, expire, resend, refuse AI when unverified); onboarding persists scope and creates the class; nav/allow-list consistency (every nav href allow-listed, every allow-listed path has a page); the headless launch walkthrough above as the final check.
