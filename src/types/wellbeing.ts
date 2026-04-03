// ============================================================
// Wellbeing Types
// ============================================================

export type WellbeingQuestionType = 'scale' | 'multiple_choice' | 'text' | 'yes_no';

export type SurveyStatus = 'draft' | 'active' | 'closed';

export interface SurveyQuestion {
  text: string;
  type: WellbeingQuestionType;
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: Record<string, string>;
  options?: string[];
  required: boolean;
}

export interface WellbeingSurvey {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  isAnonymous: boolean;
  targetGrades: number[];
  status: SurveyStatus;
  startDate: string;
  endDate: string;
  questions: SurveyQuestion[];
  createdBy?: { id: string; firstName?: string; lastName?: string };
  responseCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyAnswer {
  questionIndex: number;
  value: string | number | boolean;
}

export interface CreateSurveyPayload {
  title: string;
  description?: string;
  isAnonymous?: boolean;
  targetGrades: number[];
  startDate: string;
  endDate: string;
  questions: Array<{
    text: string;
    type: WellbeingQuestionType;
    scaleMin?: number;
    scaleMax?: number;
    scaleLabels?: Record<string, string>;
    options?: string[];
    required?: boolean;
  }>;
}

export interface UpdateSurveyPayload extends Partial<CreateSurveyPayload> {
  status?: SurveyStatus;
}

export interface SubmitSurveyResponsePayload {
  answers: SurveyAnswer[];
}

export interface QuestionResult {
  questionIndex: number;
  text: string;
  type: WellbeingQuestionType;
  averageScore?: number;
  distribution?: Record<string, number>;
  responseCount?: number;
  responses?: string[] | null;
}

export interface SurveyResults {
  surveyId: string;
  title: string;
  responseCount: number;
  questions: QuestionResult[];
}

export interface MoodDashboardData {
  currentAverageMood: number;
  previousAverageMood: number;
  changePercent: number;
  safetyScore: number;
  trendData: Array<{
    date: string;
    averageMood: number;
    responseCount: number;
  }>;
  feelingDistribution: Record<string, number>;
  gradeBreakdown: Array<{
    grade: number;
    averageMood: number;
    responseRate: number;
  }>;
}
