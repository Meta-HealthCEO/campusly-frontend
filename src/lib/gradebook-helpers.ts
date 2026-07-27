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
    const cid = resolveId(
      s.classId as string | { id?: string; _id?: string } | undefined,
    );
    return cid === selectedClassId;
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
