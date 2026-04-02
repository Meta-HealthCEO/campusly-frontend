// Learning module frontend types (not in src/types/index.ts per task rules)

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'matching';
  options: QuizOption[];
  correctAnswer: string;
  points: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string | { _id: string; firstName: string; lastName: string; email: string };
  subjectId: string | { _id: string; name: string; code: string };
  classId: string | { _id: string; name: string };
  title: string;
  description?: string;
  type: 'mcq' | 'true_false' | 'mixed';
  questions: QuizQuestion[];
  totalPoints: number;
  timeLimit?: number;
  showInstantFeedback: boolean;
  allowRetry: boolean;
  attempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  dueDate?: string;
  status: 'draft' | 'published' | 'closed';
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface QuizAnswer {
  questionIndex: number;
  selectedOption?: number;
  textAnswer?: string;
  isCorrect?: boolean;
  pointsEarned?: number;
}

export interface QuizAttempt {
  id: string;
  _id?: string;
  quizId: string;
  studentId: string | { _id: string; userId: string };
  answers: QuizAnswer[];
  totalScore: number;
  percentage: number;
  startedAt: string;
  completedAt?: string;
  timeSpent?: number;
  attempt: number;
}

export interface QuizLeaderboardEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  bestScore: number;
  bestPercentage: number;
  attempts: number;
}

export interface QuizResultsResponse {
  attempts: QuizAttempt[];
  averageScore: number;
  submissionCount: number;
}

export interface CurriculumRef {
  subject: string;
  grade: string;
  term: string;
  topic: string;
}

export interface StudyMaterial {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string | { _id: string; firstName: string; lastName: string; email: string };
  subjectId: string | { _id: string; name: string; code: string };
  gradeId: string | { _id: string; name: string };
  term: number;
  topic: string;
  type: 'notes' | 'video' | 'link' | 'document' | 'past_paper';
  title: string;
  description?: string;
  fileUrl?: string;
  videoUrl?: string;
  externalLink?: string;
  tags: string[];
  curriculum: CurriculumRef;
  downloads: number;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RubricLevel {
  label: string;
  description: string;
  points: number;
}

export interface RubricCriterion {
  name: string;
  description: string;
  levels: RubricLevel[];
}

export interface Rubric {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string | { _id: string; firstName: string; lastName: string; email: string };
  name: string;
  subjectId?: string | { _id: string; name: string; code: string };
  criteria: RubricCriterion[];
  totalPoints: number;
  reusable: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RubricScore {
  criterionId: string;
  level: string;
  points: number;
}

export interface TeacherFeedback {
  comments: string;
  rubricScores: RubricScore[];
  audioFeedbackUrl?: string;
}

export interface PeerReview {
  reviewerId: string;
  rating: number;
  comments: string;
  reviewedAt: string;
}

export interface RevisionEntry {
  fileUrl: string;
  submittedAt: string;
  version: number;
}

export interface AssignmentSubmission {
  id: string;
  _id?: string;
  homeworkId: string;
  studentId: string | { _id: string; userId: string };
  schoolId: string;
  files: string[];
  submittedAt: string;
  isLate: boolean;
  mark?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string | { _id: string; firstName: string; lastName: string; email: string };
  isDraft: boolean;
  draftSavedAt?: string;
  plagiarismScore?: number;
  peerReviewEnabled: boolean;
  peerReviews: PeerReview[];
  teacherFeedback?: TeacherFeedback;
  revisionHistory: RevisionEntry[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AssignmentAnalytics {
  totalSubmissions: number;
  submissionRate: number;
  lateRate: number;
  averageMark: number;
  scoreDistribution: { range: string; count: number }[];
}

export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface StudentProgress {
  id: string;
  _id?: string;
  studentId: string;
  subjectId: string | { _id: string; name: string; code: string };
  schoolId: string;
  term: number;
  year: number;
  masteryPercentage: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  averageMark: number;
  trend: TrendDirection;
  strengths: string[];
  weaknesses: string[];
  lastUpdated: string;
}

export interface StrugglingStudent {
  studentId: string;
  subjectId: string;
  averageMark: number;
  trend: TrendDirection;
}

// Input types for create/update
export interface CreateQuizInput {
  schoolId: string;
  subjectId: string;
  classId: string;
  title: string;
  description?: string;
  type: 'mcq' | 'true_false' | 'mixed';
  questions: QuizQuestion[];
  totalPoints: number;
  timeLimit?: number;
  showInstantFeedback?: boolean;
  allowRetry?: boolean;
  attempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  dueDate?: string;
}

export interface CreateMaterialInput {
  schoolId: string;
  subjectId: string;
  gradeId: string;
  term: number;
  topic: string;
  type: 'notes' | 'video' | 'link' | 'document' | 'past_paper';
  title: string;
  description?: string;
  fileUrl?: string;
  videoUrl?: string;
  externalLink?: string;
  tags?: string[];
  curriculum: CurriculumRef;
}

export interface CreateRubricInput {
  schoolId: string;
  name: string;
  subjectId?: string;
  criteria: RubricCriterion[];
  totalPoints: number;
  reusable?: boolean;
}

export interface GradeSubmissionInput {
  comments: string;
  rubricScores?: RubricScore[];
  audioFeedbackUrl?: string;
  mark?: number;
}

// Helper to extract name from populated or raw ID fields
export function getPopulatedName(
  field: string | { _id: string; name: string; [key: string]: unknown } | undefined | null
): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.name ?? '';
}

export function getPopulatedId(
  field: string | { _id: string; [key: string]: unknown } | undefined | null
): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field._id ?? '';
}

export function getTeacherName(
  field: string | { firstName: string; lastName: string; [key: string]: unknown } | undefined | null
): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return `${field.firstName ?? ''} ${field.lastName ?? ''}`.trim();
}
