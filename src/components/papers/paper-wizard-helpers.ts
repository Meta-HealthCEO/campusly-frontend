// Presets + tiny resolvers for the paper wizard's metadata step.

import type { PaperType, PaperDifficulty } from '@/types/papers';
import type { SchoolClass } from '@/types';

export const PAPER_TYPES: Array<{
  value: PaperType;
  label: string;
  desc: string;
  marks: number;
  duration: number;
}> = [
  { value: 'class_test', label: 'Class Test', desc: 'Focused term assessment', marks: 50, duration: 60 },
  { value: 'assignment', label: 'Assignment', desc: 'Take-home or research task', marks: 40, duration: 60 },
  { value: 'mid_year', label: 'Mid-Year Exam', desc: 'Broader exam coverage', marks: 100, duration: 120 },
  { value: 'trial', label: 'Trial Exam', desc: 'High-stakes exam practice', marks: 150, duration: 180 },
  { value: 'final', label: 'Final Exam', desc: 'End-of-year assessment', marks: 150, duration: 180 },
  { value: 'custom', label: 'Custom', desc: 'Teacher-defined paper', marks: 50, duration: 60 },
];

export const LENGTH_PRESETS = [
  { label: 'Quick', marks: 30, duration: 30 },
  { label: 'Standard', marks: 50, duration: 60 },
  { label: 'Full', marks: 100, duration: 120 },
];

export const DIFFICULTY_OPTIONS: Array<{ value: PaperDifficulty; label: string; dot: string }> = [
  { value: 'easy', label: 'Foundation', dot: 'bg-emerald-500' },
  { value: 'medium', label: 'Standard', dot: 'bg-amber-500' },
  { value: 'hard', label: 'Advanced', dot: 'bg-foreground' },
];

export interface PaperMetadataState {
  title: string;
  subjectId: string;
  gradeId: string;
  topicIds: string[];
  term: number;
  year: number;
  paperType: PaperType;
  duration: number;
  totalMarks: number;
  difficulty: PaperDifficulty;
}

export type ClassWithGrade = Omit<SchoolClass, 'gradeId'> & {
  gradeId?: string | { id?: string; _id?: string; name?: string };
  gradeName?: string;
};

export type EntityWithId = {
  id?: string;
  _id?: string;
};

export function entityId(entity: EntityWithId): string {
  return entity.id ?? entity._id ?? '';
}

export function classGradeName(cls: ClassWithGrade): string {
  if (cls.grade?.name) return cls.grade.name;
  if (cls.gradeName) return cls.gradeName;
  if (typeof cls.gradeId === 'object' && cls.gradeId?.name) return cls.gradeId.name;
  return 'Grade';
}
