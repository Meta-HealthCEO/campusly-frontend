// ─── Principal Dashboard Types ──────────────────────────────────────────────

export interface KpiMetric {
  current: number;
  previousTerm: number;
  changePercent: number;
}

export interface PrincipalKPIs {
  enrollment: KpiMetric;
  attendanceRate: KpiMetric;
  passRate: KpiMetric;
  feeCollectionRate: KpiMetric;
  teacherAttendanceRate: KpiMetric;
  homeworkCompletionRate: KpiMetric;
}

export interface BenchmarkTarget {
  district: number;
  national: number;
  schoolTarget: number;
}

export interface BenchmarkConfig {
  attendanceRate: BenchmarkTarget;
  passRate: BenchmarkTarget;
  feeCollectionRate: BenchmarkTarget;
  teacherAttendanceRate: BenchmarkTarget;
  homeworkCompletionRate: BenchmarkTarget;
}

export interface SchoolBenchmark {
  id: string;
  schoolId: string;
  benchmarks: BenchmarkConfig;
  annualBudget: number;
  monthlyExpenseEstimate: number;
  updatedAt: string;
}

export interface HeatmapGrade {
  gradeId: string;
  gradeName: string;
  averagePercent: number;
  studentCount: number;
  passRate: number;
}

export interface SubjectHeatmapEntry {
  subjectId: string;
  subjectName: string;
  grades: HeatmapGrade[];
}

export interface TermTrendPoint {
  term: number;
  attendance: number | null;
  passRate: number | null;
  feeCollection: number | null;
  teacherAttendance: number | null;
}

export interface TermTrendData {
  year: number;
  terms: TermTrendPoint[];
}

export interface TeacherPerformanceEntry {
  teacherIndex: number;
  subjectCount: number;
  classCount: number;
  averageClassPassRate: number;
  averageClassMark: number;
  homeworkSetCount: number;
  attendanceRate: number;
}

interface MonthlyBreakdown {
  month: number;
  revenue: number;
  budget: number;
}

interface RevenueVsBudget {
  totalRevenue: number;
  annualBudget: number;
  percentOfBudget: number;
  monthlyBreakdown: MonthlyBreakdown[];
}

interface OutstandingFeesAging {
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  overNinetyDays: number;
  total: number;
}

interface CashFlowProjection {
  month: string;
  projectedIncome: number;
  projectedExpenses: number;
  netCashFlow: number;
}

export interface FinancialHealth {
  revenueVsBudget: RevenueVsBudget;
  outstandingFeesAging: OutstandingFeesAging;
  cashFlowProjection: CashFlowProjection[];
}

export interface RiskAlertDetail {
  classId: string;
  className: string;
  subjectName: string;
  passRate: number;
}

export interface RiskAlert {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  count?: number;
  threshold?: number;
  currentValue?: number;
  details?: RiskAlertDetail[];
}

export interface RiskAlertResponse {
  alerts: RiskAlert[];
  generatedAt: string;
}
