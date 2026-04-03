// ============================================================
// Department / HOD Oversight Types
// ============================================================

export interface Department {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  hodUserId: string | { id: string; firstName: string; lastName: string; email: string } | null;
  subjectIds: string[] | Array<{ id: string; name: string; code?: string }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Performance ───────────────────────────────────────────────────────────

export interface ClassPerformance {
  classId: string;
  className: string;
  teacherName: string;
  studentCount: number;
  averageMark: number;
  passRate: number;
  highestMark: number;
  lowestMark: number;
}

export interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  overallAverage: number;
  overallPassRate: number;
  classes: ClassPerformance[];
}

export interface DepartmentPerformance {
  departmentName: string;
  term: number;
  year: number;
  subjects: SubjectPerformance[];
}

// ─── Curriculum Pacing ─────────────────────────────────────────────────────

export type PacingStatus = 'ahead' | 'on_track' | 'behind' | 'significantly_behind';

export interface ClassPacing {
  classId: string;
  className: string;
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  actualProgress: number;
  expectedProgress: number;
  status: PacingStatus;
}

export interface TeacherSubjectPacing {
  subjectId: string;
  subjectName: string;
  classes: ClassPacing[];
}

export interface TeacherPacing {
  teacherId: string;
  teacherName: string;
  subjects: TeacherSubjectPacing[];
}

export interface DepartmentPacing {
  termWeeksElapsed: number;
  termTotalWeeks: number;
  expectedProgress: number;
  teachers: TeacherPacing[];
}

// ─── Moderation ────────────────────────────────────────────────────────────

export interface ModerationItem {
  id: string;
  paperId: string;
  paperTitle: string;
  subjectName: string;
  teacherName: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'changes_requested';
  totalMarks: number;
}

export interface ModerationQueue {
  items: ModerationItem[];
  total: number;
  page: number;
  limit: number;
}

// ─── Workload ──────────────────────────────────────────────────────────────

export interface WorkloadEntry {
  teacherId: string;
  teacherName: string;
  subjectCount: number;
  classCount: number;
  totalStudents: number;
  periodsPerWeek: number;
  assessmentsThisTerm: number;
  pendingMarking: number;
  observationsThisYear: number;
}

// ─── Observations ──────────────────────────────────────────────────────────

export type ObservationStatus = 'scheduled' | 'completed' | 'cancelled';

export type FocusArea =
  | 'lesson_planning'
  | 'learner_engagement'
  | 'assessment_practices'
  | 'classroom_management'
  | 'subject_knowledge'
  | 'differentiation'
  | 'use_of_resources'
  | 'questioning_techniques';

export interface ObservationScores {
  lesson_planning?: number;
  learner_engagement?: number;
  assessment_practices?: number;
  classroom_management?: number;
  subject_knowledge?: number;
  differentiation?: number;
  use_of_resources?: number;
  questioning_techniques?: number;
}

export interface TeacherObservation {
  id: string;
  departmentId: string;
  teacherId: string | { id: string; firstName: string; lastName: string };
  observerId: string | { id: string; firstName: string; lastName: string };
  classId: string | { id: string; name: string };
  subjectId: string | { id: string; name: string };
  scheduledDate: string;
  duration: number;
  status: ObservationStatus;
  focusAreas: FocusArea[];
  scores: ObservationScores | null;
  notes: string;
  recommendations: string;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateObservationPayload {
  teacherId: string;
  classId: string;
  subjectId: string;
  scheduledDate: string;
  duration?: number;
  focusAreas: FocusArea[];
}

export interface UpdateObservationPayload {
  status?: 'completed' | 'cancelled';
  scores?: ObservationScores;
  notes?: string;
  recommendations?: string;
  completedAt?: string;
}

// ─── Common Assessment Analysis ────────────────────────────────────────────

export interface GradeDistribution {
  level7: number;
  level6: number;
  level5: number;
  level4: number;
  level3: number;
  level2: number;
  level1: number;
}

export interface CommonAssessmentClass {
  classId: string;
  className: string;
  teacherName: string;
  studentCount: number;
  averageMark: number;
  passRate: number;
  medianMark: number;
  standardDeviation: number;
  distribution: GradeDistribution;
}

export interface CommonAssessmentResult {
  assessmentName: string;
  subjectName: string;
  totalMarks: number;
  date: string;
  classes: CommonAssessmentClass[];
}
