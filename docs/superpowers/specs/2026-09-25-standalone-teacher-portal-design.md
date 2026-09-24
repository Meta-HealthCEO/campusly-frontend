# Standalone teacher portal, ready for real users — design

**Date:** 2026-09-25 · **Status:** approved in conversation, awaiting written review
**Project 1 of 4** in the standalone programme: (1) standalone teacher portal → (2) student portal → (3) syllabus → (4) Coursera-quality lessons.

## Intent

Launch Campusly first as a product a teacher signs up for on their own (no school admin). Only quality features that a standalone teacher will actually use; everything else is hidden for them. Success: a teacher can sign up, verify their email, say what they teach, create a class, get learners in with a code, build and release an AI lesson unit, set homework and a test, mark with AI, see marks — without hitting a dead end, an error, or a school-only feature — and understands their free AI allowance and how to upgrade.

**Decided with the owner:**
- *Lessons* = the Coursera-style Units system (Course, `kind: 'class_unit'`), renamed "Lessons" for standalone teachers. The old lesson-plan tool is removed for them; existing standalone drafts there are not carried over (pre-launch).
- Set work = **Homework** (day-to-day, self-marking) + **Test papers** (formal, with memo). **Assignments** is merged into Homework and removed.
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
- `STANDALONE_DEFAULT_MODULES` holds exactly the modules this nav needs (courses on; unused ones off).

## 2. Assignments → Homework

- Anything Assignments can do that Homework can't (AI drafting from a topic/brief) moves into Homework's "Draft with AI"; the Assignments pages and nav go for standalone teachers.
- Existing assignment records stay in the database and remain visible in the Gradebook; no data migration.

## 3. Sign-up and onboarding

- **One sign-up path:** `/signup/teacher` (`POST /auth/signup/standalone-teacher`) is canonical; `/register-teacher` redirects to it; the duplicate `registerTeacher` backend path is removed once nothing calls it.
- **Email verification:** a verification token emailed at sign-up (and re-sendable); `User.emailVerifiedAt`. Unverified teachers can use the app, see a persistent banner, and are refused AI actions with a clear message ("Verify your email to use AI. Resend link."). Links expire after 24 h.
- **Onboarding (three steps, resumable, skippable only where noted):**
  1. **What you teach:** phase → grade(s) → subject(s) picked from the CAPS tree; saved to `User.teachingScope` (already exists) and materialised to school Grade/Subject rows (existing `materialise-from-curriculum`).
  2. **Your first class:** name + grade + subject (prefilled from step 1); shows the join code and a copyable "how learners join" message (learners self-register at `/register-student` with the code).
  3. **Your first lesson:** open the Units builder prefilled with that class and a CAPS topic from their scope. Skippable.
- Today's onboarding checklist reflects the same steps until done.
- Every empty state in the standalone nav names the next action.

## 4. One AI allowance

- **Ledger:** a new `AIUsage` record per AI action: `{ schoolId, userId, action, createdAt, meta }` where `action` ∈ unit_outline, unit_item, unit_rewrite, revision_item, paper, homework_draft, homework_grade, marking, lesson_chat (the full list is the set of AI entry points found in the plan). One helper `recordAIUse` / `assertAIAllowance(user, action)` replaces the per-feature counters (`free-allowance.ts`, `consumeFreePaperGeneration`, `assertCourseGenerationAccess`, the daily unit cap interplay is kept as a separate per-day safety cap).
- **Limits:** Free = `FREE_AI_ACTIONS_PER_MONTH` (20) per calendar month (SAST); Trial and Pro = fair-use cap `PRO_AI_ACTIONS_PER_MONTH` (500). Counted per teacher's school (standalone school = the teacher).
- **Enforcement:** every AI endpoint calls `assertAIAllowance` before spending and records after success; failures (AI error) are not counted. 402 with a plain message and `{ used, limit, resetsAt }`.
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
