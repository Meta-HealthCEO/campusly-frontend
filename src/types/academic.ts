// ============================================================
// Academic Types — Grade, Class, Subject, Assessment, Marks, Timetable
// ============================================================

import type { User, Teacher, Student } from './common';

export interface Grade {
  id: string;
  name: string;
  level: number;
  schoolId: string;
  classes: SchoolClass[];
}

export interface SchoolClass {
  id: string;
  name: string;
  gradeId: string;
  grade: Grade;
  gradeName?: string;
  teacherId: string;
  teacher: Teacher;
  capacity: number;
  studentCount: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  gradeId: string;
  teacherId: string;
  teacher: Teacher;
  isElective: boolean;
}

export interface TimetableSlot {
  id: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subject: Subject;
  classId: string;
  teacherId: string;
  room?: string;
}

export interface Assessment {
  id: string;
  name: string;
  type: 'test' | 'exam' | 'assignment' | 'project' | 'quiz';
  subjectId: string;
  subject: Subject;
  classId: string;
  totalMarks: number;
  weight: number;
  date: string;
  term: number;
}

// ─── Timetable Clash Types ──────────────────────────────────────────────────

export interface TimetableClashEntry {
  className: string;
  subject: string;
  classId: string;
}

export interface TimetableClash {
  type: 'teacher' | 'class';
  teacherName?: string;
  teacherId?: string;
  className?: string;
  classId?: string;
  day: string;
  period: number;
  conflictingEntries: TimetableClashEntry[];
}

export interface StudentGrade {
  id: string;
  studentId: string;
  student: Student;
  assessmentId: string;
  assessment: Assessment;
  marks: number;
  percentage: number;
  comment?: string;
  gradedById: string;
}
