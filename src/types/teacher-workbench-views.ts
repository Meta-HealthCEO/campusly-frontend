// ============================================================
// Teacher Workbench Types — Marking Hub, Student 360, Dashboard
// ============================================================

import type { MarkingItemType, MarkingPriority } from './teacher-workbench';

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
  trend: 'improving' | 'declining' | 'stable';
  subjects: { name: string; mark: number; grade: string; classAvg: number }[];
  markHistory: { date: string; mark: number }[];
}

export interface Student360Attendance {
  rate: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  pattern: string | null;
}

export interface Student360Behaviour {
  netMeritScore: number;
  recentIncidents: { date: string; type: string; severity: string; description: string }[];
  recentMerits: { date: string; type: string; category: string; points: number; reason: string }[];
}

export interface Student360Homework {
  submissionRate: number;
  averageMark: number;
  lateCount: number;
  missingCount: number;
}

export interface Student360Communication {
  lastContactDate: string | null;
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
