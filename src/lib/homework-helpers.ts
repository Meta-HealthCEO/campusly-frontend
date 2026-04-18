import type { Homework, HomeworkSubmission, HomeworkType } from '@/types';

interface RawHomework {
  _id?: string;
  id?: string;
  title: string;
  type?: HomeworkType;
  quizId?: string | { _id: string } | null;
  contentResourceId?: string | { _id: string } | null;
  pageRange?: string | null;
  exerciseQuestionIds?: Array<string | { _id: string }>;
  subjectId: string | { _id: string; name?: string; code?: string };
  classId: string | { _id: string; name?: string };
  teacherId: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  schoolId?: string;
  dueDate: string;
  attachments?: string[];
  totalMarks?: number;
  status?: 'assigned' | 'closed' | string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface RawSubmission {
  _id?: string;
  id?: string;
  homeworkId: string | RawHomework;
  studentId: string | { _id: string; userId?: { firstName: string; lastName: string; email: string } };
  files?: string[];
  attachments?: string[];
  submittedAt: string;
  isLate?: boolean;
  mark?: number | null;
  grade?: number;
  feedback?: string | null;
  gradedAt?: string | null;
  gradedBy?: unknown;
  status?: string;
  content?: string;
  [key: string]: unknown;
}

/** Normalize a raw homework API object to match the frontend Homework type. */
export function normalizeHomework(raw: RawHomework): Homework {
  const subjectObj = typeof raw.subjectId === 'object' && raw.subjectId !== null
    ? raw.subjectId
    : undefined;
  const teacherObj = typeof raw.teacherId === 'object' && raw.teacherId !== null
    ? raw.teacherId
    : undefined;

  const status: 'assigned' | 'closed' =
    raw.status === 'closed' ? 'closed' : 'assigned';

  const base = {
    _id: raw._id ?? raw.id ?? '',
    title: raw.title,
    subjectId: typeof raw.subjectId === 'string' ? raw.subjectId : (subjectObj?._id ?? ''),
    classId: typeof raw.classId === 'string' ? raw.classId : ((raw.classId as { _id: string })?._id ?? ''),
    schoolId: raw.schoolId ?? '',
    teacherId: typeof raw.teacherId === 'string' ? raw.teacherId : (teacherObj?._id ?? ''),
    dueDate: raw.dueDate,
    totalMarks: raw.totalMarks ?? 0,
    status,
    attachments: raw.attachments ?? [],
    isDeleted: raw.isDeleted ?? false,
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  };

  const type: HomeworkType = raw.type ?? 'exercise';

  if (type === 'quiz') {
    const quizId = typeof raw.quizId === 'string'
      ? raw.quizId
      : (raw.quizId?._id ?? '');
    return { ...base, type: 'quiz', quizId };
  }

  if (type === 'reading') {
    const contentResourceId = typeof raw.contentResourceId === 'string'
      ? raw.contentResourceId
      : (raw.contentResourceId?._id ?? '');
    return {
      ...base,
      type: 'reading',
      contentResourceId,
      pageRange: raw.pageRange ?? null,
    };
  }

  const exerciseQuestionIds = (raw.exerciseQuestionIds ?? []).map((q) =>
    typeof q === 'string' ? q : q._id,
  );
  return { ...base, type: 'exercise', exerciseQuestionIds };
}

/** Normalize a raw submission from the API to the frontend HomeworkSubmission shape. */
export function normalizeSubmission(raw: RawSubmission): HomeworkSubmission {
  const mark = raw.mark ?? raw.grade;
  const files = raw.files ?? raw.attachments ?? [];

  // Derive status from backend fields
  let derivedStatus: HomeworkSubmission['status'] = 'submitted';
  if (mark !== undefined && mark !== null) {
    derivedStatus = 'graded';
  } else if (raw.isLate) {
    derivedStatus = 'late';
  }

  const homework = typeof raw.homeworkId === 'object' && raw.homeworkId !== null
    ? (() => {
        const h = normalizeHomework(raw.homeworkId as RawHomework);
        return {
          _id: h._id,
          title: h.title,
          subjectId: h.subjectId,
          classId: h.classId,
          dueDate: h.dueDate,
          totalMarks: h.totalMarks,
          status: h.status,
        };
      })()
    : undefined;

  return {
    id: raw._id ?? raw.id ?? '',
    homeworkId: typeof raw.homeworkId === 'string'
      ? raw.homeworkId
      : (raw.homeworkId as RawHomework)?._id ?? (raw.homeworkId as RawHomework)?.id ?? '',
    homework,
    studentId: typeof raw.studentId === 'string'
      ? raw.studentId
      : (raw.studentId as { _id: string })?._id ?? '',
    student: {} as HomeworkSubmission['student'],
    content: raw.content,
    attachments: files,
    submittedAt: raw.submittedAt,
    grade: mark !== null && mark !== undefined ? mark : undefined,
    feedback: raw.feedback ?? undefined,
    gradedAt: raw.gradedAt ?? undefined,
    status: derivedStatus,
  };
}
