# Teacher Phase 4A: The Learner Profile Is the Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wherever a teacher sees a learner's name, one tap opens that learner's profile: the register, marking, the gradebook, a unit's class view, and messages. From the profile, the teacher can message the learner's parent or refer the learner to the counsellor without hunting for them in a picker.

**Architecture:**
- **Backend:**
  - The learner profile (`GET /reports/student/:id/360`) gains `parents: [{ userId, name }]` for staff viewers (names only, no contact details). They come from `Student.guardianIds`, which are Parent records with a `userId`.
  - The unit insight's learners gain `studentId`.
- **Frontend:**
  - `LearnerLink` (one component) links a name to `teacherLearnerProfilePath(studentId)`.
  - `recipientsFromStudent` (pure) fixes the Messages page's empty parent list: it read `parentIds`, but the API returns `guardianIds`.
  - The profile gets "Message a parent" (a `MessageParentDialog` sending through `useMessaging.createThread`) and "Refer to counsellor" (the existing `ReferralCreateDialog`, pre-filled).

**Tech stack:** Express/Mongoose/vitest; Next.js 16/React 19/vitest.

**Spec:** programme §3 (Class: "search opens the profile"); §4 Learner profile: "Wire up. Linked from roster, register, marking and behaviour; message the parent from it". Messages: "Open a thread from the Learner profile". Phase 5 t3 ("message a parent from the learner profile") is done here.

## Global Constraints
- **A teacher only reaches learners they teach:** the profile, messaging and referral access checks are unchanged.
- **Parents' contact details stay off the teacher's screen:** names only; messages go through Campusly.
- **Frontend rules (CLAUDE.md):** hooks make the API calls, files ≤ 350 lines, semantic tokens, 44px targets, dialogs with a sticky footer.

## Review Focus
1. **A learner with no parent linked:** "Message a parent" says there's no parent on record and how that gets fixed (the school office links parents); no broken dialog.
2. **A learner with two parents:** the teacher picks which parent; both names show.
3. **Any learner-name link where the row has no student id** (legacy data): the name shows as plain text, with no broken link.
4. **A teacher who doesn't teach the learner** (e.g. from a stale link): the profile's existing "We couldn't open this learner" state; messaging and referral are refused by the server.
5. **Sending a message fails:** the dialog stays open with the reason; nothing is lost.

---

### Task 1: Parents on the profile; learners' ids in the unit insight (backend)
**Files:**
- Modify `Report/services/student360.service.ts` and its types.
- Modify `Course/service-insight.ts` and `insight.ts`: `InsightLearner.studentId`.
- Tests: `Report/__tests__/student360-parents.test.ts`; update `Course/__tests__/unit-insight.test.ts`.
- [ ] RED → GREEN; commit.

### Task 2: The Messages page finds a learner's parents (frontend)
**Files:** Create `src/lib/message-recipients.ts` (`recipientsFromStudent(raw)` reads `guardianIds` and the older `parentIds`/`parents`); modify `useRecipientLookup.ts`; Test `tests/message-recipients.test.ts`.
- [ ] RED → GREEN; commit.

### Task 3: Learner names open the profile (frontend)
**Files:**
- Create `src/components/students/LearnerLink.tsx`.
- Use it in:
  - the register: `attendance/StudentRow.tsx`, `AttendanceHistoryTab.tsx`
  - marking: `HomeworkSubmissionsTable.tsx`, `GradingInterface.tsx`, `AssignmentSubmissionsTab.tsx`, `PaperDetailMarkingTab.tsx`
  - the gradebook: `TermSummaryTotalsTable.tsx`, `TermSummaryTestsTable.tsx` (the name links; the row still opens the term detail)
  - the unit insight: `UnitInsight.tsx`
  - messages: `ThreadList.tsx`, but only when the thread carries a student
- [ ] Browser: from the register, a submission, the gradebook and a unit's class view, the learner's name opens their profile.
- [ ] Commit.

### Task 4: Message a parent; refer to the counsellor (frontend)
**Files:**
- Create `src/components/students/MessageParentDialog.tsx` and `src/components/students/LearnerActions.tsx`.
- Modify `ReferralCreateDialog.tsx` (`defaultStudentId`), the profile page, and `types/student-360.ts`.
- Hooks: `useMessaging.createThread`, `usePastoralReferrals`.
- [ ] Browser: as Thandi, open a learner:
  - [ ] Message a parent: the parent is pre-picked and the send works; the thread shows in Messages.
  - [ ] Refer to counsellor: the learner is pre-filled.
  - [ ] A learner with no parent shows the no-parent message.
- [ ] Commit.
