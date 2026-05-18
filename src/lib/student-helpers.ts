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

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readId(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  const record = asRecord(value);
  return readString(record?.id) ?? readString(record?._id);
}

function validGradeLevel(level: number | undefined): number | undefined {
  return level !== undefined && level >= 1 && level <= 12 ? level : undefined;
}

function parseGradeLevel(value: unknown): number | undefined {
  const numeric = validGradeLevel(readNumber(value));
  if (numeric !== undefined) return numeric;

  const text = readString(value);
  if (!text) return undefined;

  const match = /\b(?:grade|gr)\s*(\d{1,2})\b/i.exec(text) ?? /\b(\d{1,2})\b/.exec(text);
  if (!match) return undefined;

  const parsed = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : undefined;
}

function nestedRecord(source: unknown, key: string): Record<string, unknown> | undefined {
  return asRecord(asRecord(source)?.[key]);
}

function gradeSources(student: unknown, classInfo?: unknown): Array<Record<string, unknown> | undefined> {
  const studentRecord = asRecord(student);
  const classRecord = asRecord(classInfo);
  const studentClass = nestedRecord(studentRecord, 'class') ?? nestedRecord(studentRecord, 'classId');

  return [
    nestedRecord(studentRecord, 'grade'),
    nestedRecord(studentRecord, 'gradeId'),
    nestedRecord(studentClass, 'grade'),
    nestedRecord(studentClass, 'gradeId'),
    nestedRecord(classRecord, 'grade'),
    nestedRecord(classRecord, 'gradeId'),
  ];
}

function classSources(student: unknown, classInfo?: unknown): Array<Record<string, unknown> | undefined> {
  const studentRecord = asRecord(student);
  return [
    asRecord(classInfo),
    nestedRecord(studentRecord, 'class'),
    nestedRecord(studentRecord, 'classId'),
  ];
}

/**
 * Backend Student responses populate `gradeId` in-place with the full Grade
 * document via Mongoose populate. The TypeScript type asserts `grade: Grade`
 * separately, but at runtime the data lives at `gradeId`. These helpers
 * narrow the populated object whichever shape the response actually has.
 */
export function resolveGradeLevel(
  student: unknown,
  classInfo?: unknown,
): number {
  if (!student) return 0;

  for (const source of gradeSources(student, classInfo)) {
    const level = validGradeLevel(readNumber(source?.level));
    if (level !== undefined) return level;
  }

  const studentRecord = asRecord(student);
  const textCandidates = [
    studentRecord?.gradeLevel,
    studentRecord?.currentGrade,
    studentRecord?.gradeName,
    ...gradeSources(student, classInfo).flatMap((source) => [source?.name, source?.label]),
    ...classSources(student, classInfo).flatMap((source) => [source?.name, source?.gradeName]),
  ];

  for (const candidate of textCandidates) {
    const level = parseGradeLevel(candidate);
    if (level !== undefined) return level;
  }

  return 0;
}

export function resolveGradeId(student: unknown, classInfo?: unknown): string {
  const studentRecord = asRecord(student);
  const classRecord = asRecord(classInfo);
  const studentClass = nestedRecord(studentRecord, 'class') ?? nestedRecord(studentRecord, 'classId');
  const candidates = [
    studentRecord?.gradeId,
    studentRecord?.grade,
    studentClass?.gradeId,
    studentClass?.grade,
    classRecord?.gradeId,
    classRecord?.grade,
    ...gradeSources(student, classInfo),
  ];

  for (const candidate of candidates) {
    const id = readId(candidate);
    if (id) return id;
  }

  return '';
}

export function resolveGradeName(
  student: unknown,
  classInfo?: unknown,
): string {
  if (!student) return '';

  for (const source of gradeSources(student, classInfo)) {
    const name = readString(source?.name);
    if (name) return name;
  }

  const level = resolveGradeLevel(student, classInfo);
  if (level >= 1) return `Grade ${level}`;

  return '';
}

export function resolveClassName(student: unknown, classInfo?: unknown): string {
  for (const source of classSources(student, classInfo)) {
    const name = readString(source?.name);
    if (name) return name;
  }
  return '';
}
