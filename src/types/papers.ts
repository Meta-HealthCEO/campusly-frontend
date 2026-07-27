// ============================================================
// Papers — Module 2 (Assessment Papers + Memos)
//
// Mirrors backend models exactly:
//   • IAssessmentPaper / IPaperSection / IPaperQuestion / IPaperQuestionDiagram
//     (campusly-backend/src/modules/QuestionBank/model-papers.ts)
//   • IPaperMemo / IMemoSection / IMemoAnswer / IMarkAllocation
//     (campusly-backend/src/modules/TeacherWorkbench/model.assessment.ts)
//
// NOTE: Several of these names (PaperType, PaperStatus, PaperMemo, MemoSection,
// MemoAnswer) overlap with `question-bank.ts` and `teacher-workbench.ts`. This
// file is intentionally NOT re-exported from `src/types/index.ts` — import
// directly from '@/types/papers' to avoid barrel-level name conflicts.
// ============================================================

// ─── Enums ───────────────────────────────────────────────────────────────────

export type PaperType =
  | 'class_test'
  | 'assignment'
  | 'mid_year'
  | 'trial'
  | 'final'
  | 'custom';

export type PaperDifficulty = 'easy' | 'medium' | 'hard';

export type PaperStatus = 'draft' | 'finalised' | 'archived';

export type DiagramRenderStatus = 'pending' | 'rendered' | 'failed';

// ─── Diagram ─────────────────────────────────────────────────────────────────

export interface PaperDiagram {
  tikz: string | null;
  caption?: string | null;
  svgUrl?: string | null;
  renderStatus: DiagramRenderStatus;
}

// ─── Question (discriminated union: BankRef XOR Inline) ──────────────────────

interface PaperQuestionBase {
  marks: number;
  position: number;
  modelAnswer?: string | null;
  markingGuideline?: string | null;
  options?: PaperQuestionOption[];
  diagram?: PaperDiagram | null;
}

export interface BankRefQuestion extends PaperQuestionBase {
  questionId: string | PopulatedPaperQuestionRef;
  /** Populated from question bank when read; not present on create */
  questionText?: string | null;
}

export interface InlineQuestion extends PaperQuestionBase {
  questionId: null;
  questionText: string;
}

export type PaperQuestion = BankRefQuestion | InlineQuestion;

// ─── Section ─────────────────────────────────────────────────────────────────

export interface PaperSection {
  title: string;
  instructions?: string | null;
  questions: PaperQuestion[];
}

// ─── Populated reference helpers ─────────────────────────────────────────────

export interface PopulatedSubject {
  _id: string;
  name: string;
  code?: string;
}

export interface PopulatedGrade {
  _id: string;
  name: string;
}

export interface PopulatedTopic {
  _id: string;
  title: string;
  code?: string;
}

export interface PopulatedCreator {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface PaperQuestionOption {
  label: string;
  text: string;
  isCorrect?: boolean;
}

export interface PopulatedPaperQuestionRef {
  _id: string;
  stem: string;
  type?: string;
  options?: PaperQuestionOption[];
  answer?: string;
  markingRubric?: string;
  // 'draft' / 'pending_review' / 'approved' / 'rejected' — used by the
  // paper-detail tab to show a "Save to bank" button only when the
  // question hasn't been committed yet.
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  source?: 'system' | 'ai_generated' | 'teacher';
}

// ─── CAPS compliance (optional snapshot stored alongside paper) ──────────────

export interface CapsComplianceReport {
  score?: number;
  report?: string;
}

// ─── Paper ───────────────────────────────────────────────────────────────────

export const PAPER_ASSIGNMENT_MODES = ['digital', 'paper'] as const;
export type PaperAssignmentMode = (typeof PAPER_ASSIGNMENT_MODES)[number];

export interface PaperAssignment {
  _id: string;
  classId: string;
  mode: PaperAssignmentMode;
  releaseAt: string | null;
  dueAt: string | null;
  assignedBy: string;
  assignedAt: string;
}


export interface Paper {
  _id: string;
  title: string;
  schoolId: string;
  subjectId: string | PopulatedSubject;
  gradeId: string | PopulatedGrade;
  topicIds: string[] | PopulatedTopic[];
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  totalMarks: number;
  difficulty: PaperDifficulty;
  aiGenerated: boolean;
  version: number;
  sections: PaperSection[];
  instructions?: string | null;
  status: PaperStatus;
  createdBy: string | PopulatedCreator;
  capsCompliance?: CapsComplianceReport | null;
  assignments?: PaperAssignment[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── PaperMemo ───────────────────────────────────────────────────────────────
// Mirrors IPaperMemo / IMemoSection / IMemoAnswer / IMarkAllocation exactly.

export interface MarkAllocation {
  criterion: string;
  marks: number;
}

export interface MemoAnswer {
  /** e.g. "1.1", "2.3" — string form, supports nested numbering */
  questionNumber: string;
  expectedAnswer: string;
  markAllocation: MarkAllocation[];
  commonMistakes?: string[];
  acceptableAlternatives?: string[];
}

export interface MemoSection {
  sectionTitle: string;
  answers: MemoAnswer[];
}

export type MemoStatus = 'draft' | 'final';

export interface PaperMemo {
  _id: string;
  paperId: string;
  schoolId: string;
  teacherId: string;
  sections: MemoSection[];
  totalMarks: number;
  status: MemoStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── AI generation request shape ─────────────────────────────────────────────

export interface AIPaperSectionConfig {
  title: string;
  instructions?: string;
  questionCount: number;
  sectionMarks: number;
}

export const PAPER_QUESTION_TYPES = [
  'mcq', 'short_answer', 'structured', 'essay', 'calculation',
] as const;
export type PaperQuestionType = (typeof PAPER_QUESTION_TYPES)[number];

export interface QuestionTypeWeight {
  type: PaperQuestionType;
  weight: number;
}

export interface PaperDefaults {
  questionTypeMix: QuestionTypeWeight[];
}

export interface GeneratePaperRequest {
  schoolId?: string;
  subjectId: string;
  gradeId: string;
  topicIds: string[];
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  totalMarks: number;
  difficulty: PaperDifficulty;
  title: string;
  sectionConfig: AIPaperSectionConfig[];
  instructions?: string;
  // Optional teacher-controlled question structure. Each entry weights one
  // paper question type as a percentage of total marks; sum must be ~100.
  questionTypeMix?: QuestionTypeWeight[];
  // Opt-in: seed the paper from previously-saved bank questions, then
  // AI-fill the deficit. Default false → every question is freshly authored
  // and saved as a draft (teacher commits to bank explicitly later).
  useExistingBank?: boolean;
}

// ─── Manual create / mutation inputs ─────────────────────────────────────────

export interface CreatePaperManualInput {
  title: string;
  schoolId?: string;
  subjectId: string;
  gradeId: string;
  topicIds: string[];
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  totalMarks: number;
  difficulty: PaperDifficulty;
  sections: Array<{ title: string; instructions?: string; questions: [] }>;
  instructions?: string;
}

export interface AddQuestionInput {
  questionId?: string;
  questionText?: string;
  marks: number;
  position: number;
  modelAnswer?: string;
  markingGuideline?: string;
  options?: PaperQuestionOption[];
  diagram?: { tikz: string; caption?: string };
}

// Submission / marking-roster types live in paper-submissions.ts.
export type * from './paper-submissions';
