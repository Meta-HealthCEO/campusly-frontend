import type { Homework, HomeworkSubmission, HomeworkResource } from '@/types';

interface RawResource {
  _id?: string;
  id?: string;
  title?: string;
  type?: string;
  status?: string;
  blocks?: unknown[];
}

interface RawHomework {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  subjectId: string | { _id: string; name: string; code?: string };
  classId: string | { _id: string; name: string };
  teacherId: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  resourceId?: string | RawResource | null;
  schoolId?: string;
  dueDate: string;
  attachments?: string[];
  totalMarks?: number;
  status?: string;
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

  // Map backend 'assigned' to frontend-compatible status
  const backendStatus = (raw.status ?? 'assigned') as string;
  const status = backendStatus === 'assigned' ? 'published' : backendStatus;

  // Resolve resourceId — may be a string ID or populated object
  let resourceId: string | undefined;
  let resource: HomeworkResource | undefined;
  if (raw.resourceId && typeof raw.resourceId === 'object') {
    const resObj = raw.resourceId as RawResource;
    resourceId = resObj._id ?? resObj.id;
    resource = {
      id: resObj._id ?? resObj.id ?? '',
      title: resObj.title ?? '',
      type: (resObj.type ?? 'lesson') as HomeworkResource['type'],
      status: (resObj.status ?? 'draft') as HomeworkResource['status'],
      blocks: (resObj.blocks ?? []) as HomeworkResource['blocks'],
    };
  } else if (typeof raw.resourceId === 'string') {
    resourceId = raw.resourceId;
  }

  return {
    id: raw._id ?? raw.id ?? '',
    title: raw.title,
    description: raw.description,
    subjectId: typeof raw.subjectId === 'string' ? raw.subjectId : (subjectObj?._id ?? ''),
    subject: subjectObj ? { id: subjectObj._id, name: subjectObj.name, code: subjectObj.code ?? '' } as Homework['subject'] : undefined,
    subjectName: subjectObj?.name,
    classId: typeof raw.classId === 'string' ? raw.classId : ((raw.classId as { _id: string })?._id ?? ''),
    teacherId: typeof raw.teacherId === 'string' ? raw.teacherId : (teacherObj?._id ?? ''),
    teacher: teacherObj
      ? ({
          id: teacherObj._id,
          user: { firstName: teacherObj.firstName ?? '', lastName: teacherObj.lastName ?? '' },
        } as unknown as Homework['teacher'])
      : undefined,
    resourceId,
    resource,
    dueDate: raw.dueDate,
    attachments: raw.attachments ?? [],
    status: status as Homework['status'],
    createdAt: raw.createdAt ?? '',
  };
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

  return {
    id: raw._id ?? raw.id ?? '',
    homeworkId: typeof raw.homeworkId === 'string'
      ? raw.homeworkId
      : (raw.homeworkId as RawHomework)?._id ?? (raw.homeworkId as RawHomework)?.id ?? '',
    homework: typeof raw.homeworkId === 'object' && raw.homeworkId !== null
      ? normalizeHomework(raw.homeworkId as RawHomework)
      : ({} as Homework),
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
