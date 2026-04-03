import type {
  QuestionType,
  QuestionStatus,
  CapsLevel,
  BloomsLevel,
} from '@/types/question-bank';

// ─── Question Type Labels ───────────────────────────────────────────────────

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'structured', label: 'Structured' },
  { value: 'essay', label: 'Essay' },
  { value: 'match', label: 'Matching' },
  { value: 'fill_blank', label: 'Fill in Blank' },
  { value: 'calculation', label: 'Calculation' },
  { value: 'diagram_label', label: 'Diagram Label' },
  { value: 'case_study', label: 'Case Study' },
];

export const TYPE_LABELS: Record<QuestionType, string> = Object.fromEntries(
  QUESTION_TYPES.map((qt) => [qt.value, qt.label]),
) as Record<QuestionType, string>;

// ─── Status ─────────────────────────────────────────────────────────────────

export const STATUS_VARIANT: Record<
  QuestionStatus,
  'secondary' | 'outline' | 'default' | 'destructive'
> = {
  draft: 'secondary',
  pending_review: 'outline',
  approved: 'default',
  rejected: 'destructive',
};

export const STATUS_LABELS: Record<QuestionStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

// ─── CAPS Levels ────────────────────────────────────────────────────────────

export const CAPS_LEVELS: { value: CapsLevel; label: string }[] = [
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'routine', label: 'Routine' },
  { value: 'complex', label: 'Complex' },
  { value: 'problem_solving', label: 'Problem Solving' },
];

export const CAPS_LABELS: Record<CapsLevel, string> = {
  knowledge: 'Knowledge',
  routine: 'Routine',
  complex: 'Complex',
  problem_solving: 'Problem Solving',
};

export const CAPS_COLORS: Record<CapsLevel, string> = {
  knowledge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  routine: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  complex: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  problem_solving: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

// ─── Blooms Levels ──────────────────────────────────────────────────────────

export const BLOOMS_LEVELS: { value: BloomsLevel; label: string }[] = [
  { value: 'remember', label: 'Remember' },
  { value: 'understand', label: 'Understand' },
  { value: 'apply', label: 'Apply' },
  { value: 'analyse', label: 'Analyse' },
  { value: 'evaluate', label: 'Evaluate' },
  { value: 'create', label: 'Create' },
];
