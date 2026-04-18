import { resolveField } from '@/lib/api-helpers';
import type { Student } from '@/types';

export function getStudentDisplayName(student: Student): {
  first: string;
  last: string;
  full: string;
} {
  const userObj = student.user ?? student.userId;
  const first =
    resolveField<string>(userObj, 'firstName')
    ?? resolveField<string>(student, 'firstName')
    ?? student.admissionNumber
    ?? '';
  const last =
    resolveField<string>(userObj, 'lastName')
    ?? resolveField<string>(student, 'lastName')
    ?? '';
  const full = `${first} ${last}`.trim();
  return { first, last, full: full || student.admissionNumber || 'Unknown Student' };
}

export function isPortalStudent(student: Student): boolean {
  return !!student.userId;
}
