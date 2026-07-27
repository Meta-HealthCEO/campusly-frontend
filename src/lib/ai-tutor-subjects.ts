import type { CurriculumNodeItem, Subject } from '@/types';

interface TutorClassSubject {
  id: string;
  name: string;
  code?: string;
}

interface TutorClassGrade {
  id: string;
}

interface TutorClassTeacher {
  id: string;
}

interface TutorClassSubjectSource {
  grade: TutorClassGrade;
  subject?: TutorClassSubject | null;
  teacher: TutorClassTeacher;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readId(value: unknown): string {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return readString(record?.id) ?? readString(record?._id) ?? '';
}

function firstGradeId(subject: Subject): string {
  const record = subject as Subject & {
    grade?: unknown;
    gradeId?: unknown;
    gradeIds?: unknown[];
    grades?: unknown[];
  };
  const direct = readId(record.gradeId) || readId(record.grade);
  if (direct) return direct;

  const gradeIds = Array.isArray(record.gradeIds) ? record.gradeIds : [];
  const firstFromGradeIds = gradeIds.map(readId).find(Boolean);
  if (firstFromGradeIds) return firstFromGradeIds;

  const grades = Array.isArray(record.grades) ? record.grades : [];
  return grades.map(readId).find(Boolean) ?? '';
}

function normaliseSubject(subject: Subject): Subject | null {
  const id = readId(subject.id) || readId(subject._id);
  const name = readString(subject.name);
  if (!id || !name) return null;

  return {
    ...subject,
    id,
    name,
    code: subject.code ?? '',
    gradeId: firstGradeId(subject),
  };
}

function subjectIdentityKey(subject: Subject): string {
  return subject.name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function addSubject(
  byId: Map<string, Subject>,
  idByIdentity: Map<string, string>,
  subject: Subject,
  selectedSubjectId: string,
): void {
  const identity = subjectIdentityKey(subject);
  const existingId = idByIdentity.get(identity);

  if (existingId && existingId !== subject.id) {
    if (subject.id === selectedSubjectId) {
      byId.delete(existingId);
      byId.set(subject.id, subject);
      idByIdentity.set(identity, subject.id);
    }
    return;
  }

  byId.set(subject.id, subject);
  idByIdentity.set(identity, subject.id);
}

function subjectFromClass(cls: TutorClassSubjectSource | null): Subject | null {
  if (!cls) return null;
  const subject = cls.subject;
  if (!subject?.id || !subject.name) return null;

  return {
    id: subject.id,
    name: subject.name,
    code: subject.code ?? '',
    gradeId: cls.grade.id,
    teacherId: cls.teacher.id,
  } as Subject;
}

export function buildTutorSubjects(
  allSubjects: Subject[],
  homeroom: TutorClassSubjectSource | null,
  subjectClasses: TutorClassSubjectSource[],
  selectedSubjectId: string,
): Subject[] {
  const byId = new Map<string, Subject>();
  const idByIdentity = new Map<string, string>();
  const classSubjects = [homeroom, ...subjectClasses].map(subjectFromClass).filter(Boolean) as Subject[];

  // Always include the subjects the student is actually enrolled in via their
  // classes — these are the canonical "what I'm studying" set. The catalogue
  // query (allSubjects) returns whatever the admin has configured for the
  // grade, but it often misses subjects the student is actually taking when
  // the subject's gradeIds aren't populated, leaving the picker with a tiny
  // subset. Union them so the student sees everything available to them.
  for (const subject of classSubjects) addSubject(byId, idByIdentity, subject, selectedSubjectId);

  for (const subject of allSubjects) {
    const normalised = normaliseSubject(subject);
    if (normalised) addSubject(byId, idByIdentity, normalised, selectedSubjectId);
  }

  if (selectedSubjectId && !byId.has(selectedSubjectId)) {
    const selectedFromClass = classSubjects.find((subject) => subject.id === selectedSubjectId);
    if (selectedFromClass) addSubject(byId, idByIdentity, selectedFromClass, selectedSubjectId);
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function parseGradeLevelFromText(value: string | undefined): number {
  if (!value) return 0;
  const match = /\b(?:grade|gr)\s*(\d{1,2})\b/i.exec(value) ?? /\b(\d{1,2})\b/.exec(value);
  if (!match) return 0;
  const parsed = Number.parseInt(match[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : 0;
}

export function findCurriculumGradeNodeId(grades: CurriculumNodeItem[], gradeLevel: number): string {
  if (gradeLevel < 1) return '';
  return grades.find((grade) => parseGradeLevelFromText(grade.title) === gradeLevel)?.id ?? '';
}

export function curriculumSubjectsToTutorSubjects(nodes: CurriculumNodeItem[]): Subject[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.title,
    code: node.code ?? '',
    gradeId: node.gradeId ?? node.parentId ?? '',
    teacherId: '',
  } as Subject));
}
