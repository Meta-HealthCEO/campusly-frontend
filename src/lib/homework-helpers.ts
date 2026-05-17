import type {
  Homework,
  HomeworkSubmission,
  HomeworkType,
  StudentHomeworkQuestion,
  StudentHomeworkQuiz,
} from '@/types';

interface RawHomework {
  _id?: string;
  id?: string;
  title: string;
  type?: HomeworkType;
  quizId?: string | { _id?: string; id?: string } | null;
  quiz?: RawQuiz | null;
  contentResourceId?: string | { _id: string } | null;
  pageRange?: string | null;
  exerciseQuestionIds?: Array<string | RawQuestion>;
  exerciseQuestions?: RawQuestion[];
  comprehensionQuestionIds?: Array<string | RawQuestion>;
  comprehensionQuestions?: RawQuestion[];
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

interface RawQuestion {
  _id?: string;
  id?: string;
  type?: StudentHomeworkQuestion['type'];
  stem?: string;
  media?: StudentHomeworkQuestion['media'];
  diagram?: unknown | null;
  options?: Array<{ label?: string; text?: string }>;
  marks?: number;
}

interface RawQuiz {
  _id?: string;
  id?: string;
  title?: string;
  questions?: Array<{
    questionText?: string;
    questionType?: StudentHomeworkQuiz['questions'][number]['questionType'];
    options?: Array<{ text?: string }>;
    points?: number;
  }>;
  totalPoints?: number;
  shuffleQuestions?: boolean;
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

function readRefId(ref: string | { _id?: string; id?: string } | null | undefined): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref._id ?? ref.id ?? '';
}

function normalizeQuestion(raw: RawQuestion): StudentHomeworkQuestion {
  const id = raw._id ?? raw.id ?? '';
  return {
    _id: id,
    id,
    type: raw.type ?? 'short_answer',
    stem: raw.stem ?? '',
    media: Array.isArray(raw.media) ? raw.media : [],
    diagram: raw.diagram ?? null,
    options: Array.isArray(raw.options)
      ? raw.options.map((opt) => ({ label: opt.label ?? '', text: opt.text ?? '' }))
      : [],
    marks: raw.marks ?? 0,
  };
}

function normalizeQuestionList(raw: unknown): StudentHomeworkQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q): q is RawQuestion => typeof q === 'object' && q !== null)
    .map(normalizeQuestion);
}

function normalizeIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q) => (typeof q === 'string' ? q : readRefId(q as { _id?: string; id?: string })))
    .filter(Boolean);
}

function normalizeQuiz(raw: RawQuiz | null | undefined): StudentHomeworkQuiz | null {
  if (!raw) return null;
  const id = raw._id ?? raw.id ?? '';
  if (!id) return null;
  return {
    _id: id,
    id,
    title: raw.title ?? '',
    questions: Array.isArray(raw.questions)
      ? raw.questions.map((q) => ({
          questionText: q.questionText ?? '',
          questionType: q.questionType ?? 'short_answer',
          options: Array.isArray(q.options)
            ? q.options.map((opt) => ({ text: opt.text ?? '' }))
            : [],
          points: q.points ?? 0,
        }))
      : [],
    totalPoints: raw.totalPoints ?? 0,
    shuffleQuestions: raw.shuffleQuestions,
  };
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
    latePolicy: (raw.latePolicy as 'block' | 'penalty' | 'accept' | undefined) ?? 'block',
    latePenaltyPercent: typeof raw.latePenaltyPercent === 'number' ? raw.latePenaltyPercent : undefined,
    gradebookAutoPublish: typeof raw.gradebookAutoPublish === 'boolean' ? raw.gradebookAutoPublish : true,
    assessmentId: typeof raw.assessmentId === 'string' ? raw.assessmentId : null,
    version: typeof raw.version === 'number' ? raw.version : 1,
    comprehensionQuestionIds: normalizeIdList(raw.comprehensionQuestionIds),
  };

  const type: HomeworkType = raw.type ?? 'exercise';

  if (type === 'quiz') {
    const quizFromPayload = raw.quiz ?? (
      typeof raw.quizId === 'object' && raw.quizId !== null
        ? raw.quizId as RawQuiz
        : null
    );
    const quiz = normalizeQuiz(quizFromPayload);
    const quizId = readRefId(raw.quizId) || quiz?._id || '';
    return { ...base, type: 'quiz', quizId, quiz };
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
      comprehensionQuestions: normalizeQuestionList(
        raw.comprehensionQuestions ?? raw.comprehensionQuestionIds,
      ),
    };
  }

  const exerciseQuestionIds = normalizeIdList(raw.exerciseQuestionIds);
  return {
    ...base,
    type: 'exercise',
    exerciseQuestionIds,
    exerciseQuestions: normalizeQuestionList(raw.exerciseQuestions ?? raw.exerciseQuestionIds),
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
