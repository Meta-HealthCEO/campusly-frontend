export type CurriculumPacingStatus = 'on_track' | 'slightly_behind' | 'significantly_behind';
export type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';
export type InterventionStatus = 'active' | 'acknowledged' | 'resolved';
export type BenchmarkComparisonStatus = 'above_target' | 'at_target' | 'below_target';

export interface PacingTopic {
  id: string;
  title: string;
  description: string;
  weekNumber: number;
  expectedStartDate: string;
  expectedEndDate: string;
  capsReference: string;
  status: TopicStatus;
  completedDate: string | null;
  percentComplete: number;
}

export interface CurriculumPlan {
  id: string;
  schoolId: string;
  subjectId: { id: string; name: string };
  gradeId: { id: string; name: string; level: number };
  term: number;
  year: number;
  topics: PacingTopic[];
  totalTopics: number;
  completedTopics: number;
  pacingStatus?: CurriculumPacingStatus;
  pacingPercent?: number;
  expectedPercent?: number;
  assignedTeacher?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanPayload {
  subjectId: string;
  gradeId: string;
  term: number;
  year: number;
  topics: {
    title: string;
    description?: string;
    weekNumber: number;
    expectedStartDate: string;
    expectedEndDate: string;
    capsReference?: string;
  }[];
}

export interface TopicUpdateEntry {
  topicId: string;
  status: TopicStatus;
  completedDate?: string;
  percentComplete?: number;
  notes?: string;
}

export interface PacingUpdatePayload {
  weekEnding: string;
  topicUpdates: TopicUpdateEntry[];
  overallNotes?: string;
  challengesFaced?: string;
  plannedContentDelivered?: number;
}

export interface PacingUpdate {
  id: string;
  planId: string;
  teacherId: { id: string; firstName: string; lastName: string };
  weekEnding: string;
  topicUpdates: TopicUpdateEntry[];
  overallNotes: string;
  challengesFaced: string;
  plannedContentDelivered: number;
  createdAt: string;
}

export interface NationalBenchmark {
  id: string;
  subjectId: { id: string; name: string };
  gradeId: { id: string; name: string; level: number };
  year: number;
  targetPassRate: number;
  targetAverageScore: number | null;
  source: string;
}

export interface CreateBenchmarkPayload {
  subjectId: string;
  gradeId: string;
  year: number;
  targetPassRate: number;
  targetAverageScore?: number;
  source?: string;
}

export interface BenchmarkComparison {
  subjectId: string;
  subjectName: string;
  gradeId: string;
  gradeName: string;
  targetPassRate: number;
  actualPassRate: number;
  passRateVariance: number;
  targetAverageScore: number | null;
  actualAverageScore: number | null;
  averageScoreVariance: number | null;
  totalLearners: number;
  passed: number;
  failed: number;
  status: BenchmarkComparisonStatus;
}

export interface CurriculumIntervention {
  id: string;
  planId: { id: string; subjectId: { name: string }; gradeId: { name: string } };
  teacherId: { id: string; firstName: string; lastName: string };
  reason: string;
  weeksBehind: number;
  pacingPercent: number;
  expectedPercent: number;
  status: InterventionStatus;
  notes: string;
  createdAt: string;
}

export interface PacingOverview {
  term: number;
  year: number;
  summary: {
    totalPlans: number;
    onTrack: number;
    slightlyBehind: number;
    significantlyBehind: number;
  };
  bySubject: {
    subjectId: string;
    subjectName: string;
    plans: number;
    avgPacingPercent: number;
    avgExpectedPercent: number;
    pacingStatus: CurriculumPacingStatus;
  }[];
  byGrade: {
    gradeId: string;
    gradeName: string;
    plans: number;
    avgPacingPercent: number;
    pacingStatus: CurriculumPacingStatus;
  }[];
  interventions: CurriculumIntervention[];
}

export interface PlanFilters {
  subjectId?: string;
  gradeId?: string;
  term?: number;
  year?: number;
  page?: number;
  limit?: number;
}
