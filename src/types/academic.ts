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
  type: 'test' | 'exam' | 'assignment' | 'practical' | 'project';
  subjectId: string;
  subject: Subject;
  classId: string | null;
  totalMarks: number;
  weight: number;
  date: string;
  term: number;
  paperId?: string | { id: string; title: string } | null;
  structureId?: string | null;
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

// ─── Transcript Types ──────────────────────────────────────────────────────

export interface TranscriptSubject {
  name: string;
  mark: number;
  total: number;
  percentage: number;
  symbol: string;
}

export interface TranscriptTerm {
  term: number;
  subjects: TranscriptSubject[];
  termAverage: number;
}

export interface TranscriptYear {
  year: number;
  terms: TranscriptTerm[];
}

export interface TranscriptData {
  student: {
    name: string;
    admissionNumber: string;
    currentGrade: string;
    dateOfBirth: string | null;
  };
  school: { name: string };
  years: TranscriptYear[];
  overallAverage: number;
  generatedAt: string;
}

// ─── Bulk Import Types ─────────────────────────────────────────────────────

export interface BulkImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface BulkImportValidationResult {
  valid: Record<string, string>[];
  errors: BulkImportRowError[];
  totalRows: number;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  validationErrors: BulkImportRowError[];
  totalRows: number;
}
