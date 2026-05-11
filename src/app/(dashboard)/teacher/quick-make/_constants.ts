import type { ResourceType, ContentBlockType } from '@/types';
import type { QuestionType, BloomsLevel, CapsLevel } from '@/types/question-bank';
import type { PaperDifficulty, PaperType } from '@/types/papers';
import {
  ClipboardList,
  FileQuestion,
  FileText,
  NotebookPen,
  Sparkles,
} from 'lucide-react';

export type CreationKind = 'resource' | 'homework' | 'paper' | 'lesson_plan' | 'questions';

export const STEPS = [
  { number: 1, label: 'Create' },
  { number: 2, label: 'Curriculum' },
  { number: 3, label: 'Details' },
  { number: 4, label: 'Generate' },
];

export const OUTPUTS: Array<{
  kind: CreationKind;
  title: string;
  description: string;
  destination: string;
  icon: typeof Sparkles;
  badge?: string;
}> = [
  {
    kind: 'lesson_plan',
    title: 'Lesson Plan',
    description: 'Plan objectives, activities, timing, resources, and homework ideas.',
    destination: 'Save now, print/export later',
    icon: NotebookPen,
    badge: 'Legacy — opens the new Lesson Workspace',
  },
  {
    kind: 'resource',
    title: 'Lesson Material',
    description: 'Create a lesson, worksheet, activity, study notes, or worked example.',
    destination: 'Printable/PDF-ready resource',
    icon: Sparkles,
    badge: 'AI',
  },
  {
    kind: 'homework',
    title: 'Homework',
    description: 'Create homework from the curriculum, then assign it to a class.',
    destination: 'Print/PDF first, assign online later',
    icon: ClipboardList,
    badge: 'AI',
  },
  {
    kind: 'paper',
    title: 'Test or Exam Paper',
    description: 'Generate a CAPS-aligned paper and memo from one or more topics.',
    destination: 'Paper PDF and Memo PDF',
    icon: FileText,
    badge: 'AI',
  },
  {
    kind: 'questions',
    title: 'Practice Questions',
    description: 'Create reusable questions for revision, homework, and future papers.',
    destination: 'Reusable for papers and revision',
    icon: FileQuestion,
    badge: 'AI',
  },
];

export const RESOURCE_TYPES: Array<{ value: ResourceType; label: string; description: string }> = [
  { value: 'lesson', label: 'Lesson', description: 'Explanations, examples, checks, and practice.' },
  { value: 'worksheet', label: 'Worksheet', description: 'Printable or assignable practice work.' },
  { value: 'activity', label: 'Activity', description: 'Classroom task, group work, or interactive activity.' },
  { value: 'study_notes', label: 'Study Notes', description: 'Structured revision notes for learners.' },
  { value: 'worked_example', label: 'Worked Example', description: 'Step-by-step model solution.' },
  { value: 'reading', label: 'Reading', description: 'Reading passage with optional comprehension content.' },
];

export const BLOCK_TYPES_BY_RESOURCE: Record<ResourceType, ContentBlockType[]> = {
  lesson: ['text', 'quiz', 'fill_blank', 'step_reveal', 'image'],
  worksheet: ['text', 'quiz', 'fill_blank', 'match_columns', 'ordering'],
  activity: ['text', 'quiz', 'fill_blank', 'match_columns', 'image'],
  study_notes: ['text', 'image', 'quiz', 'step_reveal'],
  worked_example: ['text', 'step_reveal', 'quiz', 'image'],
  reading: ['text', 'image', 'quiz'],
};

export const DIFFICULTIES = [
  { value: 1, label: 'Foundation' },
  { value: 3, label: 'Standard' },
  { value: 5, label: 'Advanced' },
];

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

export const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'structured', label: 'Structured' },
  { value: 'essay', label: 'Essay' },
  { value: 'match', label: 'Matching' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'calculation', label: 'Calculation' },
  { value: 'diagram_label', label: 'Diagram Labelling' },
  { value: 'case_study', label: 'Case Study' },
];

export const CAPS_LEVELS: Array<{ value: CapsLevel; label: string }> = [
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'routine', label: 'Routine Procedures' },
  { value: 'complex', label: 'Complex Procedures' },
  { value: 'problem_solving', label: 'Problem Solving' },
];

export const BLOOMS_LEVELS: Array<{ value: BloomsLevel; label: string }> = [
  { value: 'remember', label: 'Remember' },
  { value: 'understand', label: 'Understand' },
  { value: 'apply', label: 'Apply' },
  { value: 'analyse', label: 'Analyse' },
  { value: 'evaluate', label: 'Evaluate' },
  { value: 'create', label: 'Create' },
];

export function paperTypeLabel(value: PaperType): string {
  return PAPER_TYPES.find((type) => type.value === value)?.label ?? 'Paper';
}

export function buildPaperSections(totalMarks: number) {
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
    {
      title: 'Section A',
      instructions: 'Core knowledge and routine questions.',
      questionCount: Math.max(4, Math.round(sectionA / 4)),
      sectionMarks: sectionA,
    },
    {
      title: 'Section B',
      instructions: 'Application and structured questions.',
      questionCount: Math.max(2, Math.round(sectionB / 8)),
      sectionMarks: sectionB,
    },
    {
      title: 'Section C',
      instructions: 'Extended or higher-order question.',
      questionCount: Math.max(1, Math.round(sectionC / 12)),
      sectionMarks: sectionC,
    },
  ];
}
