// ============================================================
// Teacher Workbench Types — Curriculum, Question Bank, Memos,
// Moderation, Term Planner
// ============================================================

// ------------------------------------------------------------
// Enums / Unions
// ------------------------------------------------------------

export type CognitiveLevel =
  | 'knowledge'
  | 'comprehension'
  | 'application'
  | 'analysis'
  | 'synthesis'
  | 'evaluation';

export type CoverageStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped';

export type QuestionType =
  | 'mcq'
  | 'structured'
  | 'essay'
  | 'true_false'
  | 'matching'
  | 'short_answer'
  | 'fill_in_blank';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionSource = 'manual' | 'ai_generated' | 'imported';

export type MemoStatus = 'draft' | 'final';

export type ModerationStatus = 'pending' | 'approved' | 'changes_requested';

export type AssessmentPlanType =
  | 'test'
  | 'exam'
  | 'assignment'
  | 'practical'
  | 'project';

export type PlanStatus = 'planned' | 'created' | 'completed';

export type MarkingItemType = 'homework' | 'assessment' | 'ai_grading';

export type MarkingPriority = 'high' | 'medium' | 'low';

// ------------------------------------------------------------
// Curriculum
// ------------------------------------------------------------

export interface CurriculumFramework {
  id: string;
  _id?: string;
  schoolId: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdBy: string;
  gradeId: string;
  term: number;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumTopic {
  id: string;
  _id?: string;
  schoolId: string;
  frameworkId: string;
  subjectId: string;
  gradeLevel: number;
  parentTopicId?: string;
  name: string;
  title: string;
  description: string;
  term: number;
  orderIndex: number;
  cognitiveLevel: CognitiveLevel;
  estimatedPeriods: number;
  estimatedHours: number;
  children?: CurriculumTopic[];
}

export interface CurriculumCoverage {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string;
  topicId: string;
  classId: string;
  status: CoverageStatus;
  dateCovered: string | null;
  coveredAt: string | null;
  notes: string;
  linkedLessonPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoverageReport {
  term: number;
  totalTopics: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  skipped: number;
  percentage: number;
}

// ------------------------------------------------------------
// Question Bank
// ------------------------------------------------------------

export interface MCQOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface BankQuestion {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string;
  frameworkId: string;
  subjectId: string;
  gradeLevel: number;
  gradeId: string;
  topicId: string | null;
  questionText: string;
  questionType: QuestionType;
  /** Alias for questionType — used by some components */
  type: QuestionType;
  marks: number;
  /** Alias for marks — used by some components */
  totalMarks: number;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  modelAnswer: string;
  /** Alias for modelAnswer — used by some components */
  correctAnswer: string;
  markingNotes: string;
  images: string[];
  options: MCQOption[];
  tags: string[];
  source: QuestionSource;
  usageCount: number;
  lastUsedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionFilters {
  subjectId?: string;
  gradeLevel?: number;
  gradeId?: string;
  topicId?: string;
  difficulty?: Difficulty;
  cognitiveLevel?: CognitiveLevel;
  questionType?: QuestionType;
  /** Alias for questionType — used by some components */
  type?: QuestionType;
  source?: QuestionSource;
  tags?: string;
  search?: string;
}

// ------------------------------------------------------------
// Paper Memo
// ------------------------------------------------------------

export interface MarkCriterion {
  criterion: string;
  marks: number;
}

export interface MemoAnswer {
  questionNumber: number;
  expectedAnswer: string;
  markAllocation: MarkCriterion[];
  commonMistakes: string[];
  acceptableAlternatives: string[];
}

export interface MemoSection {
  sectionTitle: string;
  answers: MemoAnswer[];
}

export interface PaperMemo {
  id: string;
  _id?: string;
  paperId: string;
  schoolId: string;
  teacherId: string;
  sections: MemoSection[];
  totalMarks: number;
  status: MemoStatus;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------
// Paper Moderation
// ------------------------------------------------------------

export interface ModerationEntry {
  status: ModerationStatus;
  comment: string;
  moderatorId: string;
  date: string;
}

export interface PaperModeration {
  id: string;
  _id?: string;
  paperId: string;
  schoolId: string;
  submittedBy: string;
  submittedAt: string;
  moderatorId: string | null;
  moderatedAt: string | null;
  status: ModerationStatus;
  comments: string;
  moderationHistory: ModerationEntry[];
}

// ------------------------------------------------------------
// Term Planner
// ------------------------------------------------------------

export interface PlannedAssessment {
  title: string;
  type: AssessmentPlanType;
  plannedDate: string;
  marks: number;
  weight: number;
  topicIds: string[];
  assessmentId: string | null;
  status: PlanStatus;
}

export interface AssessmentPlan {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  term: number;
  year: number;
  plannedAssessments: PlannedAssessment[];
  createdAt: string;
  updatedAt: string;
}

export interface DateClash {
  date: string;
  assessments: { title: string; subjectName: string; type: AssessmentPlanType }[];
}

export interface WeightingInfo {
  subjectId: string;
  subjectName: string;
  requiredFormalWeight: number;
  actualFormalWeight: number;
  requiredInformalWeight: number;
  actualInformalWeight: number;
  totalWeight: number;
}
