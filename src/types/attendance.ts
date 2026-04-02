// ============================================================
// Attendance & Discipline Types
// ============================================================

import type { Student, User } from './common';

export interface Attendance {
  id: string;
  studentId: string;
  student: Student;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  period?: number;
  note?: string;
  markedById: string;
  markedBy: User;
}

export interface DisciplineRecord {
  id: string;
  studentId: string;
  student: Student;
  type: 'merit' | 'demerit';
  category: string;
  points: number;
  description: string;
  reportedById: string;
  reportedBy: User;
  date: string;
}

// ─── Chronic Absence Types ─────────────────────────────────────────────────

export interface ChronicAbsentee {
  studentId: string;
  studentName: string;
  gradeName: string;
  className: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  percentage: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface AttendancePattern {
  mostMissedDay: string | null;
  mostMissedPeriod: number | null;
  longestAbsenceStreak: number;
  currentStreak: number;
  monthlyBreakdown: Array<{
    month: string;
    present: number;
    absent: number;
    late: number;
    total: number;
    percentage: number;
  }>;
}
