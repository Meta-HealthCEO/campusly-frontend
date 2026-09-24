# Teacher Phase 5 — Talk: class notices that reach people, one Parent meetings

> **For agentic workers:** executed inline with superpowers:executing-plans (the programme's chosen method). Steps use checkbox syntax.

**Goal:** A teacher can tell a whole class something and the learners and their parents actually get it; parent evenings work end to end from one "Parent meetings" entry.

**Architecture:** Keep two post models, each with one job — `Announcement` (the office: role audiences, scheduling, read analytics) and `NoticeBoardPost` (class/grade notices, posted by teachers). Both fan out in-app notifications when they go live. `Conference` is the one parent-evening engine; `Meetings` (0 documents) leaves every nav and its pages redirect.

**Tech Stack:** Express 5 + Mongoose 9 + zod + vitest (real Mongo); Next.js 16 + React 19 + vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-teacher-portal-programme.md` (Phase 5: t1 class announcements / notice board, t2 merge Meetings and Conferences). Research: scratchpad `phase5-research.md` + the Talk map in the session.

## Rulings made while planning

- Ruling: two post models, not one — Announcement and NoticeBoardPost already have correct, different access rules (4A/#19 fixed Announcement); merging them is a migration with nothing for the teacher — cost if wrong: two feeds to keep consistent.
- Ruling: no one-off ParentMeeting model — "Message a parent" (4A) covers ad hoc meetings — cost if wrong: no calendar slot for a one-off meeting.
- Ruling: Meetings backend stays mounted (unlinked) this phase; removal is its own change — cost if wrong: dead routes a little longer.
- Ruling: school-scope notice posts don't fan out (admins use Announcements for the whole school) — cost if wrong: a school-wide notice board post notifies no one.
- Ruling: the plan names test cases and assertions but not every line of implementation; the executor is the plan's author in the same session — cost if wrong: less for a different executor to go on.

## Global Constraints

- Every query filters `schoolId` and `isDeleted: false`; aggregation `$match` casts ObjectIds.
- Frontend: no `apiClient` in pages/components; no `any`; files ≤ 350 lines; `min-h-11` touch targets; semantic tokens; dialogs flex-col with sticky footer.
- Notifications are in-app `Notification` docs (`type: 'in_app'`), created with `insertMany`, and never fail the post (log and carry on).
- Copy: plain, active, sentence case; say who is told ("Learners in 1A and their parents are notified").

## Review Focus

1. A teacher posting to a class they don't teach — refused (existing `assertCanUseScope`), nobody notified.
2. A learner with no linked parent, a parent linked from only one side (childrenIds vs guardianIds) — parent still notified once, never twice.
3. A grade/class announcement — reaches only parents/learners in that grade/class, never other grades.
4. A parent booking a conference slot for someone else's child — refused, nothing booked.
5. Conferences pages with the module on — events actually list (the swallowed 400 is gone) and an error, if any, is shown.

---

### Task 1 (backend): notices and announcements reach people

**Files:** Create `src/modules/NoticeBoard/recipients.ts`, `src/modules/NoticeBoard/__tests__/notice-reach.test.ts`, `src/modules/Announcement/__tests__/announcement-reach.test.ts`. Modify `NoticeBoard/service.ts` (createPost), `Announcement/service.ts` (getActive, publish/create).

**Produces:** `audienceUserIds(schoolId, { classIds?, gradeIds? }, { learners, parents }) → Promise<string[]>` (distinct user ids; parents linked either way); `notifyUsers(schoolId, userIds, { title, message, data })`.

Tests (write first, watch fail):
- `a class notice notifies the class's learners and their parents once each` — class 1A: Lebo (parent P via childrenIds), Sipho (parent Q via guardianIds only), Jan in 1B. Thandi posts to 1A → Notifications for Lebo, Sipho, P, Q exactly once; none for Jan.
- `a teacher can't post to a class they don't teach, and nobody is notified`.
- `a grade announcement reaches that grade's parents and learners only` — publish `targetAudience: 'grade'`, targetId G1: parent of a G1 learner sees it in `getActive`, parent of a G2 learner doesn't; learner in G1 sees it.
- `publishing an announcement notifies its audience` — audience `parents` → every parent user in the school gets one notification; teachers get none.

### Task 2 (backend): conferences work end to end

**Files:** Modify `Conference/service-bookings.ts` (populate learner names through `userId`; parent-owns-child check using `verifyParentOwnsStudent` semantics), `Conference/validation.ts` only if needed. Test `Conference/__tests__/conference-bookings.test.ts`.

Tests:
- `a parent can't book a slot for a child who isn't theirs` → 403, no booking.
- `a parent linked only through guardianIds can book for their child`.
- `the teacher's schedule names the learner` → booking list returns `studentId.userId.firstName` (or flattened `studentName`) = 'Lebo'.

### Task 3 (backend): demo seed

`src/scripts/teacher-demo/seed-parent-evening.ts`: one open conference event next week, Thandi available 14:00–16:00 in 10-minute slots, one booking by Lebo's parent. Idempotent (fixed title). Called from `seed-teacher-demo.ts`.

### Task 4 (frontend): Talk nav and redirects

**Files:** `src/lib/nav/teacher-nav.ts`, parent/admin nav in `src/lib/constants.ts`, `next.config` redirects (or page-level `redirect()` as 4B did), `tests/teacher-nav.test.ts`.

- Talk = Messages, Class notices (`/teacher/notice-board`), Parent meetings (`/teacher/conferences`, `conference_booking`). "Announcements" (bulk email/SMS) leaves the nav; the Class notices page links to it when `communication` is on ("Email or SMS parents").
- Meetings leaves teacher, parent and admin navs; `/teacher/meetings`, `/parent/meetings`, `/admin/meetings` redirect to the matching conferences page.
- Test: `Talk shows Messages, Class notices and Parent meetings, in that order`; `no nav links to /meetings`.

### Task 5 (frontend): class notices page, student notice board

- Teacher notice board: the post dialog lists the teacher's classes first; under the scope picker: "Learners in {class} and their parents are notified." Empty state invites the first notice.
- `/student/notice-board` page (feed of `GET /notice-board/my-feed`), nav item in the student nav.
- Pure helper `noticeReachLine(scope, name)` in `src/lib/notice-board.ts` with tests.

### Task 6 (frontend): conferences fixed

- `useConferences.fetchEvents` stops sending `schoolId`; errors surface (`error` state rendered by the pages).
- `learnerName(booking)` helper in `src/lib/conference.ts` (reads `studentId.userId` or flattened name; falls back to "Learner") used by `TeacherScheduleView`; tests.
- Browser check: teacher sees the seeded parent evening with Lebo's booking named.

## Finish

Final whole-branch review (opus code-reviewer) → one fix pass → PRs (backend first) → merge → tracker t0–t2 done → full demo reseed → walkthrough report.
