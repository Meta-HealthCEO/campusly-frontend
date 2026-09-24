# Teacher Phase 3D: Unit Insight — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Once a unit is released, the teacher sees on the unit page who is where, who is stuck and why, and which quick-check questions the class gets wrong most.

**Architecture:**
- The backend's `GET /courses/:id/insight` builds everything from the existing Enrolment, LessonProgress and CourseQuizAttempt records, in unit order.
- The frontend shows an Insight section on the released unit page: learners (stuck first) and the most-missed questions.
- Pure helpers carry the stuck rules and ordering, so they're tested without a database.

**Tech stack:** Express/Mongoose/vitest; Next.js 16/React 19/vitest.

**Spec:** programme §5, teacher flow step 10: "Monitor: who's stuck and the most-missed questions. One click drafts a revision item." Drafting a revision item needs an AI key and the per-item AI actions, so it moves to 3B.

## Global Constraints
- Only the unit's owner, or an admin, principal or HOD, sees insight (`assertCanEditCourse`).
- Queries filter schoolId and isDeleted, and aggregations cast ObjectIds.
- A learner is **stuck** when they've failed the same quick check twice or more without passing it, or when they're active but have made no progress for 7 days or more.
- Frontend rules from CLAUDE.md: files ≤ 350 lines, semantic tokens, loading and empty states, mobile first.

## Review Focus
1. **A unit released to nobody yet**, or learners who haven't started: an empty state or "Not started", with no errors.
2. **A learner who passed on the third try:** not stuck.
3. **A question deleted after attempts:** it's left out, not shown blank.
4. **A learner who left the school** (Student deleted): left out.
5. **Another teacher's unit:** refused.

---

### Task 1: Stuck rules and ordering (backend, pure)
**Files:**
- Create: `src/modules/Course/insight.ts`, with `stuckReason(input)`, `mostMissed(attempts, questions, limit)` and `orderLearners`.
- Test: `src/modules/Course/__tests__/insight.test.ts`.
- [ ] Write the failing tests: two failed attempts means stuck; a pass after failures means not stuck; 7 days idle means stuck; completed means never stuck; most-missed is sorted by wrong %, then by attempts, and deleted questions are left out.
- [ ] Implement, and run the tests to green.
- [ ] Commit.

### Task 2: The insight endpoint and demo data (backend)
**Files:**
- Create: `src/modules/Course/service-insight.ts` (`UnitInsightService.get(courseId, schoolId, actor)`).
- Modify: the class-unit controller and routes, adding `GET /courses/:id/insight`.
- Modify: `src/scripts/teacher-demo/seed-course-unit.ts`. Jan is stuck on "Check: counting" after two failed tries; Lebo is at item 4.
- Test: `src/modules/Course/__tests__/unit-insight.test.ts`:
  - It returns learners in unit order with their current item, a stuck learner with the reason, and the most-missed questions.
  - It refuses another teacher's unit.
- [ ] Write the failing test, implement, and run it to green.
- [ ] Reset the demo unit and reseed.
- [ ] Commit.

### Task 3: The Insight section on the unit page (frontend)
**Files:**
- Create: `src/hooks/useUnitInsight.ts`
- Create: `src/lib/unit-insight.ts` (`stuckLabel`, `lastSeenLabel`) and `tests/unit-insight.test.ts`
- Create: `src/components/courses/unit/UnitInsight.tsx`
- Modify: `src/app/(dashboard)/teacher/courses/[id]/page.tsx`, to show the Insight section when released.
- [ ] Write the failing tests for the labels, then implement them.
- [ ] Browser as Thandi: the demo unit shows Jan "Stuck: failed Check: counting twice", Lebo on "What makes a pattern", and the most-missed questions with % wrong.
- [ ] Phone width.
- [ ] Run the full suite.
- [ ] Commit.
