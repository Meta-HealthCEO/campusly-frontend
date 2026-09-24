import { getStudentDisplayName } from '@/lib/student-helpers';
import type { Student } from '@/types';

/** "Welcome back, Lebo!" — the signed-in learner's first name, else the learner record's; never "Student". */
export function learnerGreeting(signedInFirstName: string | undefined, student: Student | null): string {
  const fromRecord = student ? getStudentDisplayName(student).first : '';
  const recordName = fromRecord && fromRecord !== student?.admissionNumber ? fromRecord : '';
  const name = (signedInFirstName ?? '').trim() || recordName.trim();
  return name ? `Welcome back, ${name}!` : 'Welcome back!';
}

/** Homework and tests past their due date that the learner hasn't handed in. */
export function learnerOverdue(counts: { homeworkOverdue: number; testsOverdue?: number }): number {
  return counts.homeworkOverdue + (counts.testsOverdue ?? 0);
}
