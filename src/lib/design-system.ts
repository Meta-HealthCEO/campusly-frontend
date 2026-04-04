// ============================================================
// Design System — Centralized visual constants for the teacher portal
// ============================================================
//
// Import from this file instead of defining inline color maps.
// Usage: import { STATUS_STYLES, getStatusBadgeVariant } from '@/lib/design-system'
// ============================================================

import type { ResourceType, ResourceStatus, ContentBlockType } from '@/types';
import type { QuestionType, QuestionStatus, CapsLevel } from '@/types/question-bank';

// ─── Status Colors ─────────────────────────────────────────────────────────
// Used for resource status, question status, paper status, etc.

export const STATUS_STYLES = {
  draft: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'secondary' as const },
  pending_review: { bg: 'bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', badge: 'outline' as const },
  approved: { bg: 'bg-primary/10', text: 'text-primary', badge: 'default' as const },
  rejected: { bg: 'bg-destructive/10', text: 'text-destructive', badge: 'destructive' as const },
  published: { bg: 'bg-primary/10', text: 'text-primary', badge: 'default' as const },
  archived: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'secondary' as const },
  finalised: { bg: 'bg-primary/10', text: 'text-primary', badge: 'default' as const },
} as const;

// Typed maps for ResourceStatus and QuestionStatus (union subsets of STATUS_STYLES keys)

export const RESOURCE_STATUS_VARIANT: Record<ResourceStatus, 'secondary' | 'outline' | 'default' | 'destructive'> = {
  draft: 'secondary',
  pending_review: 'outline',
  approved: 'default',
  rejected: 'destructive',
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const QUESTION_STATUS_VARIANT: Record<QuestionStatus, 'secondary' | 'outline' | 'default' | 'destructive'> = {
  draft: 'secondary',
  pending_review: 'outline',
  approved: 'default',
  rejected: 'destructive',
};

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

// ─── Resource Type Icons & Labels ──────────────────────────────────────────

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  lesson: 'Lesson',
  study_notes: 'Study Notes',
  worksheet: 'Worksheet',
  worked_example: 'Worked Example',
  activity: 'Activity',
};

// ─── CAPS Cognitive Levels ─────────────────────────────────────────────────

export const CAPS_LEVEL_LABELS: Record<CapsLevel, string> = {
  knowledge: 'Knowledge',
  routine: 'Routine',
  complex: 'Complex',
  problem_solving: 'Problem Solving',
};

export const CAPS_LEVEL_COLORS: Record<CapsLevel, string> = {
  knowledge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  routine: 'bg-green-500/10 text-green-700 dark:text-green-400',
  complex: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  problem_solving: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

export const CAPS_LEVEL_CONFIG = {
  knowledge: { label: 'Knowledge', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', short: 'K' },
  routine: { label: 'Routine', color: 'bg-green-500/10 text-green-700 dark:text-green-400', short: 'R' },
  complex: { label: 'Complex', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400', short: 'C' },
  problem_solving: { label: 'Problem Solving', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400', short: 'PS' },
} as const;

export const CAPS_LEVEL_ORDER: CapsLevel[] = ['knowledge', 'routine', 'complex', 'problem_solving'];

// ─── Difficulty Levels ─────────────────────────────────────────────────────
// Numeric difficulty (1–5) used in QuestionItem and ContentResource

export const DIFFICULTY_CONFIG = {
  1: { label: 'Foundation', color: 'bg-green-500/10 text-green-700', dot: 'bg-green-500' },
  2: { label: 'Easy', color: 'bg-blue-500/10 text-blue-700', dot: 'bg-blue-500' },
  3: { label: 'Standard', color: 'bg-yellow-500/10 text-yellow-700', dot: 'bg-yellow-500' },
  4: { label: 'Challenging', color: 'bg-orange-500/10 text-orange-700', dot: 'bg-orange-500' },
  5: { label: 'Advanced', color: 'bg-red-500/10 text-red-700', dot: 'bg-red-500' },
} as const;

// Simplified three-level difficulty config used in the AI Studio ConfigStep
export const DIFFICULTY_LEVELS_SIMPLE = [
  { value: 1, label: 'Foundation', dot: 'bg-emerald-500' },
  { value: 3, label: 'Standard', dot: 'bg-amber-500' },
  { value: 5, label: 'Advanced', dot: 'bg-primary' },
] as const;

// ─── Question Types ────────────────────────────────────────────────────────

export const QUESTION_TYPE_ENTRIES: { value: QuestionType; label: string }[] = [
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

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = Object.fromEntries(
  QUESTION_TYPE_ENTRIES.map((qt) => [qt.value, qt.label]),
) as Record<QuestionType, string>;

// ─── Block Types ───────────────────────────────────────────────────────────

export const BLOCK_TYPE_LABELS: Record<ContentBlockType, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  quiz: 'Quiz',
  drag_drop: 'Drag & Drop',
  fill_blank: 'Fill Blank',
  match_columns: 'Match Columns',
  ordering: 'Ordering',
  hotspot: 'Hotspot',
  step_reveal: 'Step Reveal',
  code: 'Code',
};

export const BLOCK_TYPE_ENTRIES: { value: ContentBlockType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'fill_blank', label: 'Fill Blank' },
  { value: 'match_columns', label: 'Match Columns' },
  { value: 'ordering', label: 'Ordering' },
  { value: 'step_reveal', label: 'Step Reveal' },
  { value: 'code', label: 'Code' },
];

// ─── Spacing Constants ─────────────────────────────────────────────────────

export const SPACING = {
  page: 'space-y-6',
  section: 'space-y-4',
  compact: 'space-y-3',
  inline: 'gap-2',
  cardPadding: 'p-4',
  cardPaddingLarge: 'p-6',
} as const;

// ─── Helper Functions ──────────────────────────────────────────────────────

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const config = STATUS_STYLES[status as keyof typeof STATUS_STYLES];
  return config?.badge ?? 'secondary';
}

export function getStatusClasses(status: string): string {
  const config = STATUS_STYLES[status as keyof typeof STATUS_STYLES];
  return config ? `${config.bg} ${config.text}` : 'bg-muted text-muted-foreground';
}

export function getDifficultyLabel(level: number): string {
  return DIFFICULTY_CONFIG[level as keyof typeof DIFFICULTY_CONFIG]?.label ?? `Level ${level}`;
}

export function getCapsLevelClasses(level: CapsLevel): string {
  return CAPS_LEVEL_COLORS[level] ?? 'bg-muted text-muted-foreground';
}
