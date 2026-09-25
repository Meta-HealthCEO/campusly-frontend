// ============================================================
// Gradebook helpers — pure mark validation, stats, and payload
// mapping shared by useTeacherGrades. Extracted for testability
// and file-size budget.
// ============================================================

import { resolveField, resolveId } from '@/lib/api-helpers';
import type { Assessment } from '@/types';

export interface CreateAssessmentPayload {
  name: string;
  subjectId: string;
  classId: string;
  type: Assessment['type'];
  totalMarks: number;
  weight: number;
  term: number;
  date: string;
}

export interface UpdateAssessmentPayload {
  name?: string;
  subjectId?: string;
  type?: Assessment['type'];
  totalMarks?: number;
  weight?: number;
  term?: number;
  date?: string;
}

export interface MarkEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  /** Raw input value — empty string means "not captured". */
  mark: string;
  existingMark: number | null;
}

export interface ClassStats {
  average: number;
  highest: number;
  lowest: number;
  passCount: number;
  totalWithMarks: number;
}

export interface MarkValidationError {
  studentId: string;
  message: string;
}

export interface StudentMark {
  id: string;
  assessmentName: string;
  subjectName: string;
  mark: number;
  total: number;
  percentage: number;
  date: string;
}

const PASS_THRESHOLD_PERCENT = 50;

/** Validate typed marks against an assessment's total. Empty entries pass. */
export function validateMarkEntries(
  entries: MarkEntry[],
  totalMarks: number,
): MarkValidationError[] {
  const errors: MarkValidationError[] = [];
  for (const entry of entries) {
    if (entry.mark === '') continue;
    const num = Number(entry.mark);
    if (isNaN(num)) {
      errors.push({ studentId: entry.studentId, message: 'Must be a number' });
    } else if (num < 0) {
      errors.push({ studentId: entry.studentId, message: 'Cannot be negative' });
    } else if (num > totalMarks) {
      errors.push({
        studentId: entry.studentId,
        message: `Exceeds total (${totalMarks})`,
      });
    }
  }
  return errors;
}

/** Average / highest / lowest / pass-rate over the captured marks. */
export function computeClassStats(
  entries: MarkEntry[],
  totalMarks: number,
): ClassStats | null {
  if (entries.length === 0) return null;
  const validMarks = entries
    .filter((e) => e.mark !== '')
    .map((e) => Number(e.mark))
    .filter((n) => !isNaN(n));

  if (validMarks.length === 0) return null;

  const percentages = validMarks.map((m) => (m / totalMarks) * 100);
  const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

  return {
    average: Math.round(avg * 10) / 10,
    highest: Math.max(...validMarks),
    lowest: Math.min(...validMarks),
    passCount: percentages.filter((p) => p >= PASS_THRESHOLD_PERCENT).length,
    totalWithMarks: validMarks.length,
  };
}

/**
 * Build editable mark rows from the raw student list + existing marks,
 * keeping only students in the selected class.
 */
export function buildMarkEntries(
  students: Record<string, unknown>[],
  existingMarks: Record<string, number>,
  selectedClassId: string,
): MarkEntry[] {
  const classStudents = students.filter((s) => {
    const cid = resolveId(s.classId as string | { id?: string; _id?: string } | undefined);
    const others = Array.isArray(s.subjectClassIds) ? (s.subjectClassIds as unknown[]).map((id) => resolveId(id as string | { id?: string; _id?: string })) : [];
    // A learner is in the class through their own group or a group they joined (spec §3).
    return cid === selectedClassId || others.includes(selectedClassId);
  });

  return classStudents.map((s) => {
    const id = (s.id as string) ?? (s._id as string) ?? '';
    // A student's name may live on either `user` (populated) or
    // `userId` (populated under a different key) or directly on the
    // student root. `resolveField` walks these safely.
    const userObj = s.user ?? s.userId ?? s;
    return {
      studentId: id,
      firstName:
        resolveField<string>(userObj, 'firstName')
        ?? resolveField<string>(s, 'firstName')
        ?? '',
      lastName:
        resolveField<string>(userObj, 'lastName')
        ?? resolveField<string>(s, 'lastName')
        ?? '',
      admissionNumber: (s.admissionNumber as string) ?? '',
      mark:
        existingMarks[id] !== undefined
          ? String(existingMarks[id])
          : '',
      existingMark: existingMarks[id] ?? null,
    };
  });
}

/** Map raw per-student mark rows into display history entries. */
export function mapStudentHistory(raw: Record<string, unknown>[]): StudentMark[] {
  return raw.map((m) => {
    const assessment = m.assessmentId ?? m.assessment;
    const subject = m.subjectId ?? m.subject;
    const mark = (m.mark as number) ?? 0;
    const total = (m.total as number) ?? 0;
    return {
      id: (m.id as string) ?? (m._id as string) ?? '',
      assessmentName: resolveField<string>(assessment, 'name') ?? '',
      subjectName: resolveField<string>(subject, 'name') ?? '',
      mark,
      total,
      percentage: total > 0 ? Math.round((mark / total) * 100) : 0,
      date: (m.createdAt as string) ?? '',
    };
  });
}

/**
 * The term filter to show after adding an assessment: the current one if it
 * already includes the new assessment's term, otherwise that term.
 */
export function termViewShowing(selectedTerm: string, term: number): string {
  if (selectedTerm === 'year' || selectedTerm === String(term)) return selectedTerm;
  return String(term);
}

/** A subject chip that says "Set weightings" must open the weightings, not the trend chart. */
export function subjectChipOpens(missingWeighting: boolean): 'weightings' | 'trend' {
  return missingWeighting ? 'weightings' : 'trend';
}

/** What "Set weightings" does: open the editor for those who may save, else show the read-only tab. */
export function weightingAction(canEdit: boolean): 'dialog' | 'tab' {
  return canEdit ? 'dialog' : 'tab';
}

export interface InitialClassResolution {
  /** The class to land the gradebook on. Empty when the teacher has none. */
  classId: string;
  /** A class was requested and the teacher still teaches it. */
  matchedWanted: boolean;
  /** A class was requested but isn't in the teacher's list — the caller
   * should tell the teacher rather than silently landing elsewhere. */
  forcedClassMissing: boolean;
}

/**
 * Which class the gradebook should open on: a requested class (e.g. from a
 * "View in gradebook" link) when the teacher still teaches it, otherwise the
 * first class in their list. `forcedClassMissing` distinguishes "nothing was
 * requested" from "something was requested but isn't available" so the
 * caller can flag the latter instead of silently substituting a class.
 */
export function resolveInitialClass(
  classes: Array<{ id: string }>,
  wantedClassId: string | undefined,
): InitialClassResolution {
  if (classes.length === 0) {
    return { classId: '', matchedWanted: false, forcedClassMissing: false };
  }
  const matchedWanted = wantedClassId !== undefined && classes.some((c) => c.id === wantedClassId);
  if (matchedWanted) {
    return { classId: wantedClassId as string, matchedWanted: true, forcedClassMissing: false };
  }
  return {
    classId: classes[0].id,
    matchedWanted: false,
    forcedClassMissing: wantedClassId !== undefined,
  };
}
