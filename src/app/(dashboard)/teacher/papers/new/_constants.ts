// Re-export the paper-specific constants used by the New Paper wizard.
// These are lifted from the Quick Make flow so we avoid a cross-folder import.

import type { PaperDifficulty, PaperType } from '@/types/papers';
import type { ContentBlockType } from '@/types';

export const PAPER_TYPES: Array<{ value: PaperType; label: string }> = [
  { value: 'class_test', label: 'Class Test' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'mid_year', label: 'Mid-Year Exam' },
  { value: 'trial', label: 'Trial Exam' },
  { value: 'final', label: 'Final Exam' },
  { value: 'custom', label: 'Custom Paper' },
];

export const PAPER_DIFFICULTIES: Array<{ value: PaperDifficulty; label: string }> = [
  { value: 'easy', label: 'Foundation' },
  { value: 'medium', label: 'Standard' },
  { value: 'hard', label: 'Advanced' },
];

export function paperTypeLabel(value: PaperType): string {
  return PAPER_TYPES.find((t) => t.value === value)?.label ?? 'Paper';
}

export function buildPaperSections(totalMarks: number): Array<{
  title: string;
  instructions: string;
  questionCount: number;
  sectionMarks: number;
}> {
  if (totalMarks <= 35) {
    return [{
      title: 'Section A',
      instructions: 'Answer all questions.',
      questionCount: Math.max(4, Math.round(totalMarks / 5)),
      sectionMarks: totalMarks,
    }];
  }
  const sectionA = Math.max(10, Math.round(totalMarks * 0.4));
  const sectionB = Math.max(10, Math.round(totalMarks * 0.4));
  const sectionC = Math.max(1, totalMarks - sectionA - sectionB);
  return [
    { title: 'Section A', instructions: 'Core knowledge and routine questions.', questionCount: Math.max(4, Math.round(sectionA / 4)), sectionMarks: sectionA },
    { title: 'Section B', instructions: 'Application and structured questions.', questionCount: Math.max(2, Math.round(sectionB / 8)), sectionMarks: sectionB },
    { title: 'Section C', instructions: 'Extended or higher-order question.', questionCount: Math.max(1, Math.round(sectionC / 12)), sectionMarks: sectionC },
  ];
}

// Silence unused-import error for ContentBlockType (used in quick-make only)
export type { ContentBlockType };
