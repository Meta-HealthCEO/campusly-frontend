# Teacher Phase 4B: One Behaviour Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher notes behaviour in one place and in a few seconds: a merit, a demerit, or an incident, for a learner, from the Behaviour page, the class roster, the register or the learner's profile. The learner's profile shows one timeline. Serious incidents and counsellor referrals keep their own workflows, one tap away.

**Architecture:**
- **Backend `Behaviour` module:**
  - `model.ts`: the `BehaviourEntry` model.
  - `behaviour-rules.ts` (pure): the checks, signed points, the summary and the timeline.
  - `service.ts`: create, list for a class, a learner's timeline, and undo within a day.
  - `routes.ts`, mounted at `/api/behaviour`.
- **Module gate:** the `attendance` module, like the Discipline and Merits it replaces. Incidents stay under `incident_wellbeing`.
- **Migration:** `npm run migrate:behaviour` folds old Merit and Discipline records into behaviour entries. It's a dry run unless `--apply`, and idempotent through `legacyId`.
- **The learner profile's behaviour section** reads the behaviour log.
- **Frontend:**
  - A `/teacher/behaviour` page with quick logging, the class's recent entries and totals, and links to "Report a serious incident" and "Refer to counsellor".
  - `LogBehaviourSheet`, reused from the roster row, the register row and the profile.
  - The Class nav shows one "Behaviour" item in place of Discipline, Merits, Incidents and Refer. The old Discipline and Merits routes redirect to Behaviour.

**Spec:** programme §4, Behaviour: "Merge four into one: one log (demerit, merit, incident), a learner timeline, 'Refer to counsellor', log from roster or register". Today: "log behaviour from a period".

## Global Constraints
- **A teacher logs and sees behaviour only for learners they teach** (register or timetable classes). Admins, principals and HODs see the whole school; counsellors keep Pastoral.
- **Learners and parents never list anyone else's behaviour.** A parent's view of their own child isn't part of this phase.
- **Every query filters `schoolId` and `isDeleted: false`;** undo is a soft delete.
- **Plain words, South African school vocabulary:** merit, demerit, incident, detention; points shown as +2 or −1.
- **Frontend rules (CLAUDE.md):** hooks make the API calls, files ≤ 350 lines, semantic tokens, 44px targets, dialogs with a sticky footer.

## Review Focus
1. **Logging for a learner the teacher doesn't teach:** refused in plain words, nothing saved.
2. **Double-tapping "Log"** on a slow phone: one entry, not two.
3. **Undo:** only the teacher who logged it, within a day; afterwards, a plain message.
4. **The migration run twice,** or with records whose learner has left: no duplicates; left learners are skipped and counted.
5. **A school with the attendance module off:** Behaviour isn't in the nav, and the API refuses like the other module-gated routes.

---

### Task 1: Behaviour rules (backend, pure)
**Files:** `src/modules/Behaviour/behaviour-rules.ts`; `__tests__/behaviour-rules.test.ts`.
- `checkEntry(input)` returns a clean entry or a plain refusal:
  - kinds are merit, demerit or incident
  - categories come from a fixed list
  - points are 1–5, signed by kind; incidents carry 0
  - a note is required for a demerit or incident
  - severity is low, medium or high (only for a demerit or incident)
- `behaviourSummary(entries)` returns `{ merits, demerits, incidents, net }`.
- `timeline(entries, referrals)` returns the two merged, newest first, each with a plain label.

### Task 2: Model, service, routes (backend)
**Files:** `Behaviour/model.ts`, `service.ts`, `controller.ts`, `routes.ts`, `validation.ts`; `app.ts` mount (module `attendance`); tests.
- `POST /behaviour`, `GET /behaviour?classId|studentId`, `GET /behaviour/student/:id`, `DELETE /behaviour/:id`.
- Teacher-teaches check (reuse the course unit's `teacherClassIds` via a shared helper).
- An idempotency key stops a double-tap from logging twice.

### Task 3: One view of a learner's behaviour; the migration (backend)
- The Student 360 `behaviour` section reads the log: recent entries plus the summary.
- `src/scripts/migrate-behaviour.ts` + `Behaviour/service-migration.ts` (tested).

### Task 4: The Behaviour page and the nav (frontend)
- `src/lib/behaviour.ts` (+ tests): labels, point formatting, the category list.
- `useBehaviour.ts`, `components/behaviour/*`, `/teacher/behaviour/page.tsx`.
- Nav and redirects.

### Task 5: Log from the roster, the register and the profile (frontend)
- `LogBehaviourSheet` on `RosterStudentRow`, attendance `StudentRow` and the profile's `LearnerActions`.
- The behaviour timeline card on the profile.
- [ ] Browser:
  - [ ] log a merit from the register and a demerit from the roster
  - [ ] both show on the profile timeline and the Behaviour page
  - [ ] undo within the day works
  - [ ] a learner not taught is refused
