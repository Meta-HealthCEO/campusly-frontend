export interface StudentLessonSummary {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  scheduledDate: string;
  status: 'planned' | 'taught';
  materialCount: number;
  hasHomework: boolean;
  hasQuiz: boolean;
}

export type StudentLessonMaterialKind =
  | 'reading' | 'worksheet' | 'activity' | 'study_notes'
  | 'worked_example' | 'quiz' | 'practice_questions'
  | 'homework' | 'paper';

export interface StudentContentBlock {
  blockId: string;
  type: string;
  order: number;
  content: string;
  curriculumNodeId: string | null;
  cognitiveLevel: { caps: string | null; blooms: string | null } | null;
  points: number;
  hints: string[];
  explanation: string;
  metadata: Record<string, unknown>;
}

export interface StudentLessonMaterial {
  id: string;
  kind: StudentLessonMaterialKind;
  title: string;
  teacherNotes?: string;
  phase: string;
  contentResource?: {
    id: string;
    type: string;
    title: string;
    url?: string;
    blocks?: StudentContentBlock[];
  };
  quiz?: { id: string; title: string; questionCount: number };
  homework?: { id: string; title: string; dueAt?: string; status?: string };
  paper?: { paperId: string; title: string; releaseAt?: string; dueAt?: string };
  textbookRef?: {
    source: 'internal' | 'external';
    title?: string;
    pageStart?: number;
    pageEnd?: number;
    internalId?: string;
  };
  comprehensionQuestions?: Array<{ id: string; prompt: string }>;
}

export interface StudentLessonDetail extends StudentLessonSummary {
  objectives: string[];
  durationMinutes: number;
  materials: StudentLessonMaterial[];
}

export interface StudentLessonListFilters {
  subjectId?: string;
  status?: 'planned' | 'taught' | 'all';
  search?: string;
}

export interface StudentDashboardDto {
  recentLesson: { id: string; title: string; subject: string; scheduledDate: string } | null;
  nextHomework: { id: string; title: string; subject: string; dueAt: string } | null;
  nextTest:     { paperId: string; title: string; subject: string; releaseAt?: string; dueAt?: string } | null;
  counts: {
    lessonsThisWeek: number;
    homeworkDueThisWeek: number;
    testsScheduled: number;
    homeworkOverdue: number;
  };
}
