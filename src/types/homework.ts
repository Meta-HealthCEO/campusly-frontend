// ============================================================
// Homework Types
// ============================================================
//
// Module 1 (Lesson Plans) refactor: Homework is now a typed
// discriminated union — never free text. Each homework record
// points to a real entity (Quiz / ContentResource / Question[]).
//
// The legacy `HomeworkResource`, `HomeworkSubmission`, and
// `HomeworkTemplate` types are kept for consumers that still use
// them (submission flows, templates, resource viewer).
// ============================================================

import type { Student } from './common';
import type { Subject } from './academic';
import type { ContentBlockItem, ResourceType, ResourceStatus } from './content-library';
import type { QuestionType } from './question-bank';

// ─── Typed Homework (Module 1) ──────────────────────────────────────────────

export type HomeworkType = 'quiz' | 'reading' | 'exercise';

export interface StudentHomeworkQuestionOption {
  label: string;
  text: string;
}

export interface StudentHomeworkQuestion {
  _id: string;
  id: string;
  type: QuestionType;
  stem: string;
  media: Array<{ mediaType: string; url: string }>;
  diagram: unknown | null;
  options: StudentHomeworkQuestionOption[];
  marks: number;
}

export interface StudentHomeworkQuizQuestion {
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'matching';
  options: Array<{ text: string }>;
  points: number;
}

export interface StudentHomeworkQuiz {
  _id: string;
  id: string;
  title: string;
  questions: StudentHomeworkQuizQuestion[];
  totalPoints: number;
  shuffleQuestions?: boolean;
}

/** Shared base for every typed Homework document. */
interface HomeworkBase {
  _id: string;
  title: string;
  subjectId: string;
  classId: string;
  schoolId: string;
  teacherId: string;
  dueDate: string;
  totalMarks: number;
  status: 'assigned' | 'closed';
  attachments: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  latePolicy: 'block' | 'penalty' | 'accept';
  latePenaltyPercent?: number;
  gradebookAutoPublish: boolean;
  assessmentId?: string | null;
  version: number;
  comprehensionQuestionIds?: string[];
}

export interface QuizHomework extends HomeworkBase {
  type: 'quiz';
  quizId: string;
  quiz?: StudentHomeworkQuiz | null;
}

export interface ReadingHomework extends HomeworkBase {
  type: 'reading';
  contentResourceId: string;
  pageRange?: string | null;
  comprehensionQuestions?: StudentHomeworkQuestion[];
}

export interface ExerciseHomework extends HomeworkBase {
  type: 'exercise';
  exerciseQuestionIds: string[];
  exerciseQuestions?: StudentHomeworkQuestion[];
}

/** Discriminated union of all Homework variants. */
export type Homework = QuizHomework | ReadingHomework | ExerciseHomework;

// ─── Staged (unsaved) Homework ──────────────────────────────────────────────
//
// Used by the lesson-plan form to stage homework items before the
// parent LessonPlan is persisted. The backend's POST /lesson-plans
// endpoint accepts an array of these under `stagedHomework`.

export type StagedQuizHomework = {
  type: 'quiz';
  title: string;
  quizId: string;
  schoolId: string;
  subjectId: string;
  classId: string;
  dueDate: string;
  totalMarks: number;
};

export type StagedReadingHomework = {
  type: 'reading';
  title: string;
  contentResourceId: string;
  pageRange?: string;
  schoolId: string;
  subjectId: string;
  classId: string;
  dueDate: string;
  totalMarks: number;
};

export type StagedExerciseHomework = {
  type: 'exercise';
  title: string;
  exerciseQuestionIds: string[];
  schoolId: string;
  subjectId: string;
  classId: string;
  dueDate: string;
  totalMarks: number;
};

export type StagedHomework =
  | StagedQuizHomework
  | StagedReadingHomework
  | StagedExerciseHomework;

// ─── Legacy Homework Submission + Template + Resource ───────────────────────
//
// Kept for existing consumers (submission flow, template builder,
// ResourceHomeworkViewer). `HomeworkSubmission.homeworkId` is
// intentionally typed as a string ID rather than a populated record,
// decoupling submissions from the Homework shape change.

/** Populated resource attached to a homework assignment (legacy content-library flow). */
export interface HomeworkResource {
  id: string;
  title: string;
  type: ResourceType;
  status: ResourceStatus;
  blocks: ContentBlockItem[];
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  /** Lightweight summary of the parent Homework (fields guaranteed post-refactor). */
  homework?: {
    _id: string;
    title: string;
    subjectId: string;
    classId: string;
    dueDate: string;
    totalMarks: number;
    status: 'assigned' | 'closed';
  };
  studentId: string;
  student: Student;
  content?: string;
  attachments: string[];
  submittedAt: string;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  status: 'submitted' | 'graded' | 'late' | 'missing';
}

export interface TemplateAttachment {
  url: string;
  name: string;
}

export interface HomeworkTemplate {
  id: string;
  schoolId: string;
  teacherId: string;
  title: string;
  description?: string;
  subjectId: string;
  subject?: Subject;
  totalMarks: number;
  rubric?: string;
  attachments: TemplateAttachment[];
  createdAt: string;
}

// ─── Module 4: Submission discriminated union ──────────────────────────────

export type GradingStatus = 'pending' | 'graded' | 'failed';
export type GradingMethod = 'deterministic' | 'ai' | 'teacher' | 'pending';

export interface GradedAnswerBase {
  studentAnswer: string;
  questionSnapshot: string;
  awarded?: number;
  maxMarks: number;
  rationale?: string;
  gradingMethod: GradingMethod;
}

export interface QuizAnswer extends GradedAnswerBase {
  questionIndex: number;
}

export interface ExerciseAnswer extends GradedAnswerBase {
  questionId: string;
}

export interface ReadingAnswer extends GradedAnswerBase {
  questionId: string;
}

export interface LateMarkAdjustment {
  rawMark: number;
  penaltyPercent: number;
  finalMark: number;
}

export interface HomeworkSubmissionBase {
  _id: string;
  homeworkId: string;
  studentId: string;
  schoolId: string;
  homeworkVersion: number;
  submittedAt: string;
  isLate: boolean;
  gradingStatus: GradingStatus;
  gradingGeneration: number;
  mark?: number;
  maxMarks: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string | null;
  errorMessage?: string;
  lateMarkAdjustment?: LateMarkAdjustment;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizSubmission extends HomeworkSubmissionBase {
  type: 'quiz';
  answers: QuizAnswer[];
}

export interface ExerciseSubmission extends HomeworkSubmissionBase {
  type: 'exercise';
  answers: ExerciseAnswer[];
}

export interface ReadingSubmission extends HomeworkSubmissionBase {
  type: 'reading';
  markedReadAt: string;
  comprehensionAnswers: ReadingAnswer[];
}

export type StructuredHomeworkSubmission =
  | QuizSubmission
  | ExerciseSubmission
  | ReadingSubmission;

// ─── Submit payloads (mirror backend Zod schemas) ──────────────────────────

export type SubmitQuizPayload = {
  type: 'quiz';
  answers: Array<{ questionIndex: number; studentAnswer: string }>;
};

export type SubmitExercisePayload = {
  type: 'exercise';
  answers: Array<{ questionId: string; studentAnswer: string }>;
};

export type SubmitReadingPayload = {
  type: 'reading';
  markedReadAt: string;
  comprehensionAnswers: Array<{ questionId: string; studentAnswer: string }>;
};

export type SubmitHomeworkPayload =
  | SubmitQuizPayload
  | SubmitExercisePayload
  | SubmitReadingPayload;
