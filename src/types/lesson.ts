// ============================================================
// Lesson Workspace Types (Module 5)
// ============================================================
//
// Replaces the legacy `lesson-plans.ts` shape (Module 1) with a
// workspace-centric model: every lesson has typed phases and a
// union of typed materials (reading / worksheet / quiz / etc.).
//
// `lesson-plans.ts` remains in place until Task 23 retires it.
// ============================================================

export type LessonStatus = 'draft' | 'ready' | 'taught';

export type LessonPhase =
  | 'introduction'
  | 'direct_instruction'
  | 'practice'
  | 'assessment'
  | 'homework';

export const LESSON_PHASES: LessonPhase[] = [
  'introduction',
  'direct_instruction',
  'practice',
  'assessment',
  'homework',
];

export type LessonMaterialKind =
  | 'reading'
  | 'worksheet'
  | 'activity'
  | 'notes'
  | 'worked_example'
  | 'quiz'
  | 'practice_questions'
  | 'homework'
  | 'paper';

// ─── Textbook references ────────────────────────────────────────────────────

export interface InternalTextbookRef {
  source: 'internal';
  textbookId: string;
  chapterId?: string;
  pageStart?: number;
  pageEnd?: number;
  notes?: string;
}

export interface ExternalTextbookRef {
  source: 'external';
  title: string;
  publisher?: string;
  isbn?: string;
  pageStart?: number;
  pageEnd?: number;
  excerpt?: string;
  notes?: string;
}

export type TextbookRef = InternalTextbookRef | ExternalTextbookRef;

// ─── Lesson materials (discriminated union by `kind`) ───────────────────────

interface LessonMaterialBase {
  _id: string;
  kind: LessonMaterialKind;
  title: string;
  teacherNotes?: string;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingMaterial extends LessonMaterialBase {
  kind: 'reading';
  textbookRef: TextbookRef;
  comprehensionQuestionIds?: string[];
}

export interface WorksheetMaterial extends LessonMaterialBase {
  kind: 'worksheet';
  contentResourceId: string;
}

export interface ActivityMaterial extends LessonMaterialBase {
  kind: 'activity';
  contentResourceId: string;
}

export interface NotesMaterial extends LessonMaterialBase {
  kind: 'notes';
  contentResourceId?: string;
}

export interface WorkedExampleMaterial extends LessonMaterialBase {
  kind: 'worked_example';
  contentResourceId: string;
}

export interface QuizMaterial extends LessonMaterialBase {
  kind: 'quiz';
  quizId: string;
}

export interface PracticeQuestionsMaterial extends LessonMaterialBase {
  kind: 'practice_questions';
  questionIds: string[];
}

export interface HomeworkMaterial extends LessonMaterialBase {
  kind: 'homework';
  homeworkId: string;
}

export interface PaperMaterial extends LessonMaterialBase {
  kind: 'paper';
  paperId: string;
}

export type LessonMaterial =
  | ReadingMaterial
  | WorksheetMaterial
  | ActivityMaterial
  | NotesMaterial
  | WorkedExampleMaterial
  | QuizMaterial
  | PracticeQuestionsMaterial
  | HomeworkMaterial
  | PaperMaterial;

// ─── Phases ─────────────────────────────────────────────────────────────────

export interface LessonPhaseEntry {
  phase: LessonPhase;
  materialIds: string[];
}

// ─── Lesson document ────────────────────────────────────────────────────────
//
// The relationship fields (teacherId / classId / subjectId / gradeId /
// curriculumNodeId) are `string | { populated subset }` because the
// list endpoint populates a shallow shape and the detail endpoint
// populates full objects. The union is intentional.

export interface Lesson {
  _id: string;
  schoolId: string;
  teacherId: string | { _id: string; firstName: string; lastName: string };
  classId: string | { _id: string; name: string };
  subjectId: string | { _id: string; name: string; code?: string };
  gradeId: string | { _id: string; name: string; level?: number };
  curriculumNodeId: string | { _id: string; title: string; code?: string };
  title: string;
  date: string;
  durationMinutes: number;
  objectives: string[];
  phases: LessonPhaseEntry[];
  materials: LessonMaterial[];
  status: LessonStatus;
  reflectionNotes?: string;
  aiGenerated: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── AI scaffolding ─────────────────────────────────────────────────────────

export interface ScaffoldedOutline {
  objectives: string[];
  phases: Array<{
    phase: LessonPhase;
    suggestions: Array<{ kind: LessonMaterialKind; title: string; notes?: string }>;
  }>;
}

// ─── API payloads ───────────────────────────────────────────────────────────

export interface CreateLessonPayload {
  classId: string;
  subjectId: string;
  gradeId: string;
  curriculumNodeId: string;
  title: string;
  date: string;
  durationMinutes: number;
  objectives?: string[];
  scaffoldedOutline?: ScaffoldedOutline;
}

export interface ScaffoldLessonPayload {
  curriculumNodeId: string;
  classId: string;
  subjectId: string;
  gradeId: string;
  durationMinutes: number;
  hints?: string;
}

export interface LessonsListResult {
  items: Lesson[];
  total: number;
  page: number;
  limit: number;
}
