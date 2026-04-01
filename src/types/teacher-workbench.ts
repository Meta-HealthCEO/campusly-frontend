// ============================================================
// Teacher Workbench Types — Curriculum, Question Bank, Memos,
// Moderation, Term Planner, Marking Hub, Student 360, Dashboard
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
  name: string;
  subjectId: string;
  gradeId: string;
  schoolId: string;
  term: number;
  year: number;
  topics: CurriculumTopic[];
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumTopic {
  id: string;
  _id?: string;
  frameworkId: string;
  title: string;
  description?: string;
  cognitiveLevel: CognitiveLevel;
  estimatedHours: number;
  order: number;
  children?: CurriculumTopic[];
}

export interface CurriculumCoverage {
  id: string;
  _id?: string;
  topicId: string;
  classId: string;
  teacherId: string;
  status: CoverageStatus;
  coveredAt?: string;
  notes?: string;
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
  subjectId: string;
  gradeId: string;
  schoolId: string;
  topicId?: string;
  type: QuestionType;
  difficulty: Difficulty;
  cognitiveLevel: CognitiveLevel;
  source: QuestionSource;
  questionText: string;
  options?: MCQOption[];
  correctAnswer?: string;
  totalMarks: number;
  tags: string[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionFilters {
  subjectId?: string;
  gradeId?: string;
  topicId?: string;
  type?: QuestionType;
  difficulty?: Difficulty;
  cognitiveLevel?: CognitiveLevel;
  source?: QuestionSource;
  tags?: string[];
}

// ------------------------------------------------------------
// Paper Memo
// ------------------------------------------------------------

export interface MarkCriterion {
  criterion: string;
  marks: number;
}

export interface MemoAnswer {
  questionNumber: string;
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
  sections: MemoSection[];
  totalMarks: number;
  status: MemoStatus;
  createdById: string;
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
  submittedBy: string;
  submittedAt: string;
  moderatorId?: string;
  moderatedAt?: string;
  status: ModerationStatus;
  comments: string;
  moderationHistory: ModerationEntry[];
}

// ------------------------------------------------------------
// Term Planner
// ------------------------------------------------------------

export interface PlannedAssessment {
  id: string;
  _id?: string;
  title: string;
  type: AssessmentPlanType;
  plannedDate: string;
  marks: number;
  weight: number;
  topicIds: string[];
  assessmentId?: string;
  status: PlanStatus;
}

export interface AssessmentPlan {
  id: string;
  _id?: string;
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
  assessments: PlannedAssessment[];
}

export interface WeightingInfo {
  subjectId: string;
  subjectName: string;
  requiredWeight: number;
  actualWeight: number;
  totalWeight: number;
}

// ------------------------------------------------------------
// Marking Hub
// ------------------------------------------------------------

export interface MarkingItem {
  id: string;
  type: MarkingItemType;
  title: string;
  subjectName: string;
  className: string;
  dueDate: string;
  totalMarks: number;
  pendingCount: number;
  totalCount: number;
  priority: MarkingPriority;
}

// ------------------------------------------------------------
// Student 360
// ------------------------------------------------------------

export interface Student360Academic {
  termAverage: number;
  trend: 'up' | 'down' | 'stable';
  subjects: { subjectName: string; average: number }[];
  markHistory: { date: string; mark: number; assessmentName: string }[];
}

export interface Student360Attendance {
  rate: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  pattern?: string;
}

export interface Student360Behaviour {
  netMeritScore: number;
  recentIncidents: { date: string; description: string; severity: string }[];
  recentMerits: { date: string; description: string; points: number }[];
}

export interface Student360Homework {
  submissionRate: number;
  averageMark: number;
  lateCount: number;
  missingCount: number;
}

export interface Student360Communication {
  lastContactDate?: string;
  messageCountThisTerm: number;
}

export interface Student360Data {
  studentId: string;
  studentName: string;
  className: string;
  academic: Student360Academic;
  attendance: Student360Attendance;
  behaviour: Student360Behaviour;
  homework: Student360Homework;
  communication: Student360Communication;
}

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------

export interface WorkbenchActivity {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface WorkbenchDashboardData {
  coveragePercentage: number;
  questionCount: number;
  pendingModeration: number;
  markingItemsDue: number;
  recentActivity: WorkbenchActivity[];
}
