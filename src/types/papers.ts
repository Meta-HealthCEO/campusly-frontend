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
  diagram?: PaperDiagram | null;
}

export interface BankRefQuestion extends PaperQuestionBase {
  questionId: string;
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

// ─── CAPS compliance (optional snapshot stored alongside paper) ──────────────

export interface CapsComplianceReport {
  score?: number;
  report?: string;
}

// ─── Paper ───────────────────────────────────────────────────────────────────

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

export interface GeneratePaperRequest {
  schoolId: string;
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
}

// ─── Manual create / mutation inputs ─────────────────────────────────────────

export interface CreatePaperManualInput {
  title: string;
  schoolId: string;
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
  diagram?: { tikz: string; caption?: string };
}
