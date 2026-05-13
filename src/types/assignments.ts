// Assignment — long-form, rubric-marked deliverables (essays, projects,
// research tasks). Mirror of campusly-backend/src/modules/Assignment/model.ts.
//
// Distinct from Homework (short, frequent, often auto-gradable) and from
// Paper (timed test/exam with memo). Rubric-based marking only.

export type AssignmentStatus = 'draft' | 'published' | 'archived';
export type AssignmentSubmissionFormat = 'file' | 'text' | 'both';
export type AssignmentLatePolicy = 'block' | 'penalty' | 'accept';
export type AssignmentSubmissionStatus =
  | 'submitted'
  | 'marking'
  | 'marked'
  | 'published';

export const ASSIGNMENT_LENGTHS = ['short', 'medium', 'long', 'project'] as const;
export type AssignmentLengthHint = (typeof ASSIGNMENT_LENGTHS)[number];

// ─── Rubric ─────────────────────────────────────────────────────────────────

export interface RubricCriterion {
  _id: string;
  name: string;
  description?: string;
  maxMarks: number;
}

/** Wire-format for rubric criteria on create/update — server assigns _id. */
export interface RubricCriterionInput {
  name: string;
  description?: string;
  maxMarks: number;
}

// ─── Class assignment subdoc ────────────────────────────────────────────────

export interface AssignmentClassPush {
  _id: string;
  classId: string | { _id: string; name: string };
  releaseAt: string | null;
  dueAt: string | null;
  assignedBy: string;
  assignedAt: string;
}

// ─── Populated refs ─────────────────────────────────────────────────────────

export interface PopulatedSubject {
  _id: string;
  name: string;
  code?: string;
}

export interface PopulatedGrade {
  _id: string;
  name: string;
}

export interface PopulatedCurriculumNode {
  _id: string;
  title: string;
  type?: string;
}

export interface PopulatedTeacher {
  _id: string;
  firstName: string;
  lastName: string;
}

// ─── Assignment ─────────────────────────────────────────────────────────────

export interface Assignment {
  _id: string;
  schoolId: string;
  teacherId: string | PopulatedTeacher;
  title: string;
  brief: string;
  subjectId: string | PopulatedSubject;
  gradeId: string | PopulatedGrade;
  curriculumNodeId?: string | PopulatedCurriculumNode | null;
  totalMarks: number;
  rubric: RubricCriterion[];
  submissionFormat: AssignmentSubmissionFormat;
  status: AssignmentStatus;
  assignedClasses: AssignmentClassPush[];
  latePolicy: AssignmentLatePolicy;
  latePenaltyPercent?: number;
  gradebookAutoPublish: boolean;
  assessmentId?: string | null;
  version: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Mutation inputs ────────────────────────────────────────────────────────

export interface CreateAssignmentInput {
  title: string;
  brief: string;
  subjectId: string;
  gradeId: string;
  curriculumNodeId?: string;
  totalMarks: number;
  rubric: RubricCriterionInput[];
  submissionFormat: AssignmentSubmissionFormat;
  latePolicy: AssignmentLatePolicy;
  latePenaltyPercent?: number;
  gradebookAutoPublish: boolean;
}

export interface UpdateAssignmentInput {
  title?: string;
  brief?: string;
  totalMarks?: number;
  rubric?: RubricCriterionInput[];
  submissionFormat?: AssignmentSubmissionFormat;
  status?: AssignmentStatus;
  latePolicy?: AssignmentLatePolicy;
  latePenaltyPercent?: number;
  gradebookAutoPublish?: boolean;
}

export interface CreateClassPushInput {
  classId: string;
  releaseAt?: string | null;
  dueAt?: string | null;
}

// ─── AI generation ──────────────────────────────────────────────────────────

export interface GenerateAssignmentRequest {
  subjectId: string;
  gradeId: string;
  curriculumNodeId?: string;
  totalMarks: number;
  lengthHint?: AssignmentLengthHint;
  criterionCount: number;
  /** The teacher's exact "what I want" prompt — required, ≥10 chars. */
  instructions: string;
}

export interface AIGeneratedAssignment {
  title: string;
  brief: string;
  rubric: RubricCriterionInput[];
  totalMarks: number;
}

// ─── Submission ─────────────────────────────────────────────────────────────

export interface SubmissionFile {
  filename: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

export interface SubmissionRubricMark {
  criterionId: string;
  awarded: number;
  feedback?: string;
}

export interface SubmissionLateAdjustment {
  rawMark: number;
  penaltyPercent: number;
  finalMark: number;
}

export interface PopulatedStudent {
  _id: string;
  admissionNumber?: string;
  userId?: { _id: string; firstName: string; lastName: string; email?: string };
}

export interface AssignmentSubmission {
  _id: string;
  assignmentId: string;
  studentId: string | PopulatedStudent;
  schoolId: string;
  classId: string | { _id: string; name: string };
  assignmentVersion: number;
  files: SubmissionFile[];
  textAnswer?: string;
  submittedAt: string;
  isLate: boolean;
  status: AssignmentSubmissionStatus;
  rubricMarks: SubmissionRubricMark[];
  totalMark?: number;
  teacherFeedback?: string;
  markedAt?: string;
  markedBy?: string | null | { _id: string; firstName: string; lastName: string };
  lateMarkAdjustment?: SubmissionLateAdjustment;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitAssignmentInput {
  files: Array<Omit<SubmissionFile, 'uploadedAt'>>;
  textAnswer?: string;
}

export interface MarkSubmissionInput {
  rubricMarks: Array<{ criterionId: string; awarded: number; feedback?: string }>;
  teacherFeedback?: string;
  publish?: boolean;
}

// ─── Student-side dashboard item ───────────────────────────────────────────

export interface StudentAssignmentItem extends Assignment {
  classAssignment: AssignmentClassPush | null;
  submission: {
    _id: string;
    status: AssignmentSubmissionStatus;
    submittedAt: string;
    totalMark?: number;
  } | null;
}
