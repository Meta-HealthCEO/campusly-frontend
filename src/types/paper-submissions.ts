// ============================================================
// Paper Submissions — student test-take, teacher review, and the
// per-paper marking roster. Split from papers.ts (re-exported there)
// to keep both files inside the 350-line budget.
// ============================================================

import type { PaperAssignmentMode } from './papers';

// ─── Student test-take + teacher review ────────────────────────────────────

export type SubmissionStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'graded'
  | 'published';

export interface AssignedPaperSummary {
  paperId: string;
  assignmentId: string;
  title: string;
  subjectName: string;
  gradeName: string;
  term: number;
  totalMarks: number;
  duration: number;
  mode: PaperAssignmentMode;
  releaseAt: string | null;
  dueAt: string | null;
  submissionStatus: SubmissionStatus;
  submissionId: string | null;
  submittedAt: string | null;
}

export interface StudentPaperOption {
  label: string;
  text: string;
}

export interface StudentPaperQuestion {
  questionNumber: string;
  questionText: string;
  marks: number;
  type: string;
  options: StudentPaperOption[];
  diagramSvgUrl: string | null;
}

export interface StudentPaperSection {
  title: string;
  instructions: string;
  questions: StudentPaperQuestion[];
}

export interface StudentPaperView {
  paperId: string;
  title: string;
  subjectName: string;
  gradeName: string;
  term: number;
  totalMarks: number;
  duration: number;
  paperVersion: number;
  sections: StudentPaperSection[];
}

export interface SubmissionAnswer {
  questionNumber: string;
  answer: string;
  selectedOption: string | null;
}

export interface SubmissionResult {
  submissionId: string;
  status: Exclude<SubmissionStatus, 'not_started'>;
  answers: SubmissionAnswer[];
  markingId: string | null;
  /** ISO timestamp stamped by the server when the submission was created. */
  startedAt: string | null;
}

export interface SubmissionSummary {
  submissionId: string;
  paperId: string;
  classId: string;
  studentId: string;
  studentName: string;
  status: Exclude<SubmissionStatus, 'not_started'>;
  submittedAt: string | null;
  markingId: string | null;
}

// ─── Per-paper marking workspace (roster) ─────────────────────────────────

export type PaperMarkingStatus =
  | 'processing'
  | 'completed'
  | 'needs_review'
  | 'failed'
  | 'published';

export interface RosterStudent {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  submission: {
    submissionId: string;
    status: Exclude<SubmissionStatus, 'not_started'>;
    submittedAt: string | null;
  } | null;
  marking: {
    markingId: string;
    status: PaperMarkingStatus;
    totalMarks: number;
    maxMarks: number;
    percentage: number;
    paperMismatch: boolean;
  } | null;
}

export interface RosterClass {
  classId: string;
  className: string;
  mode: PaperAssignmentMode;
  studentCount: number;
  students: RosterStudent[];
}

export interface PaperMarkingRoster {
  paperId: string;
  paperType: 'assessment';
  classes: RosterClass[];
}
