// AI Tools module types (local to avoid modifying src/types/index.ts)

export interface PaperQuestion {
  questionNumber: number;
  questionText: string;
  marks: number;
  modelAnswer: string;
  markingGuideline: string;
}

export interface PaperSection {
  sectionLabel: string;
  questionType: string;
  questions: PaperQuestion[];
}

export interface GeneratedPaper {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string | { _id: string; firstName: string; lastName: string; email: string };
  subject: string;
  grade: number;
  term: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  duration: number;
  totalMarks: number;
  sections: PaperSection[];
  memorandum: string;
  status: 'generating' | 'ready' | 'edited';
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RubricCriterion {
  criterion: string;
  maxScore: number;
  description: string;
}

export interface CriteriaScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface AIResult {
  totalMark: number;
  maxMark: number;
  percentage: number;
  criteriaScores: CriteriaScore[];
  overallFeedback: string;
  strengths: string[];
  improvements: string[];
}

export interface TeacherOverride {
  finalMark: number;
  teacherNotes: string;
}

export interface GradingJob {
  id: string;
  _id?: string;
  schoolId: string;
  teacherId: string | { _id: string; firstName: string; lastName: string; email: string };
  assignmentId: string;
  studentId: string | { _id: string; firstName: string; lastName: string };
  submissionText: string;
  rubric: RubricCriterion[];
  aiResult: AIResult | null;
  teacherOverride: TeacherOverride | null;
  status: 'queued' | 'grading' | 'completed' | 'reviewed' | 'published';
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsageByType {
  type: 'paper_generation' | 'question_regeneration' | 'grading';
  count: number;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageStats {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byType: UsageByType[];
}

export interface GeneratePaperPayload {
  schoolId: string;
  subject: string;
  grade: number;
  term: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  duration: number;
  totalMarks: number;
}

export interface GradePayload {
  schoolId: string;
  assignmentId: string;
  studentId: string;
  submissionText: string;
  rubric: RubricCriterion[];
}

export interface BulkGradePayload {
  schoolId: string;
  assignmentId: string;
  submissions: Array<{ studentId: string; submissionText: string }>;
  rubric: RubricCriterion[];
}

export interface SectionConfig {
  id: string;
  type: string;
  marks: number;
  questionCount: number;
}
