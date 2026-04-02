// ============================================================
// Homework Types
// ============================================================

import type { Student, Teacher } from './common';
import type { Subject } from './academic';

export interface Homework {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subject?: Subject;
  subjectName?: string;
  classId: string;
  teacherId: string;
  teacher?: Teacher;
  dueDate: string;
  attachments: string[];
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  homework: Homework;
  studentId: string;
  student: Student;
  content?: string;
  attachments: string[];
  submittedAt: string;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  status: 'submitted' | 'graded' | 'late' | 'missing';
}

// ─── Homework Templates ─────────────────────────────────────────────────────

export interface TemplateAttachment {
  url: string;
  name: string;
}

export interface HomeworkTemplate {
  id: string;
  schoolId: string;
  teacherId: string;
  title: string;
  description?: string;
  subjectId: string;
  subject?: Subject;
  totalMarks: number;
  rubric?: string;
  attachments: TemplateAttachment[];
  createdAt: string;
}
