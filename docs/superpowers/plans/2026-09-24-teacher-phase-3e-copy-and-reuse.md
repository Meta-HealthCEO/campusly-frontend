# Teacher Phase 3E: Copy and Reuse Units — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher never builds the same unit twice:
- copy any unit they can see to another class of the same grade, this term or next year
- browse the school library (every released unit in the school) and copy one to their own class

**Architecture:**
- Backend `service-unit-copy.ts` (`UnitCopyService.copy`, `UnitCopyService.library`). A copy is a deep copy: new Course, modules and lessons, plus new ContentResource and Question documents, because item edits write content in place and a question edit retires the old questions. The copy starts with its outline approved and its items as the source had them, ready to release. It records `copiedFrom`.
- Pure rules in `unit-copy.ts`: `copyTitle`, `canCopyFrom` (released units, or the teacher's own), `libraryEntry` (the shape the library lists).
- Routes: `POST /courses/:id/copy` and `GET /courses/library`.
- Frontend: `CopyUnitDialog` (class of the same grade, term, title) from the unit page; a "School library" tab on Courses listing released units with "Copy to my class".

**Tech stack:** Express/Mongoose/zod/vitest; Next.js 16/React 19/vitest.

**Spec:** programme §5 "What gets built": "copy a course to other classes or next year"; teacher flow step 9: "It's also saved to the school library."

## Global Constraints
- **School-scoped:** every query filters `schoolId` and `isDeleted: false`. A copy never crosses schools.
- **Who can copy:** any teacher in the school may copy a released unit; a unit that isn't released can be copied only by someone who can edit it (`assertCanEditCourse`). The target class must be one the teacher teaches (`assertTeachesClasses`) and must be the unit's grade.
- **Copies are independent:** editing, rewriting or deleting an item in one never changes the other.
- **No AI is spent:** a copy is `aiGenerated: false` and doesn't use a free teacher's allowance.
- **Nothing learner-side is copied:** no enrolments, progress, attempts or certificates.
- **Frontend rules (CLAUDE.md):** hooks make the API calls, files ≤ 350 lines, semantic tokens, 44px targets, dialogs with a sticky footer.

## Review Focus
1. **Editing the copy** (notes, steps, questions): the source is unchanged, and so are its learners' questions and insight.
2. **Copying a unit with a failed or unwritten item:** the copy shows the same state with Try again, and release stays blocked until it's fixed.
3. **Copying to a class of another grade, or a class the teacher doesn't teach:** a plain refusal, nothing created.
4. **Copying someone else's draft:** refused. Copying their released unit: allowed, and the copy is the copier's own.
5. **Library for a teacher with no released units in the school:** an empty state that says what the library is and how units get there.

---

### Task 1: Copy rules (backend, pure)
**Files:** Create `src/modules/Course/unit-copy.ts`; Test `src/modules/Course/__tests__/unit-copy.test.ts`.
- `copyTitle(sourceTitle, termNumber, sourceTerm)`: keeps the title; swaps "Term N" for the new term when the term changes.
- `canCopyFrom(course, actor)`: `{ ok: true } | { ok: false, reason }`; released (status published) → ok; own/editable → ok; otherwise "Only released units can be copied."
- `libraryEntry(course, counts)`: `{ id, title, gradeName, subjectName, termNumber, authorName, items, minutes, releasedAt, mine }`.
- [ ] RED → GREEN; commit.

### Task 2: Copy and library services and routes (backend)
**Files:** Create `service-unit-copy.ts`; modify `model.ts` (`copiedFrom`), `validation.ts` (`copyUnitSchema`: classId, termNumber 1–4, title optional), `routes.ts`, `controller-class-unit.ts`; Test `__tests__/unit-copy-service.test.ts`.
- Copy: source modules/lessons in order; each ContentResource cloned (blocks, type, tags + `class_unit`); each quick check's questions cloned; lessons keep itemKind, minutes, objectives, capsRef, brief, genStatus, genError, teacherEdited; failed/pending items keep their status (no generation is queued).
- Library: released class units in the school, newest first, with author name, grade, subject, item count and minutes; optional gradeId/subjectId filters.
- Tests: deep copy independence (edit copy's notes and questions → source unchanged); grade mismatch refused; not-taught class refused; someone else's draft refused; released unit by another teacher copied and owned by the copier; no enrolments copied; library lists only released class units of this school.
- [ ] RED → GREEN; Course suite green; commit.

### Task 3: Copy dialog and library (frontend)
**Files:** Create `src/lib/unit-library.ts` (+ test: `sameGradeClasses`, `copyDefaults`), `src/hooks/useUnitLibrary.ts`, `src/components/courses/unit/CopyUnitDialog.tsx`, `src/components/courses/UnitLibrary.tsx`; modify `useClassUnit.ts` (`copyUnit`), unit page (Copy button), Courses page (tabs: Your courses / School library).
- [ ] Browser: as Thandi, copy the demo unit to Grade 1 - A for Term 4 (her only Grade 1 class; this is the "next term or next year" case) → lands on the copy, titled "… Term 4", ready to release; edit a note in the copy → the source's note is unchanged; the library lists the source with "Copy to my class"; Grade R - A is not offered.
- [ ] Commit.
