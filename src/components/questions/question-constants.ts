import type {
  QuestionType,
  QuestionStatus,
  CapsLevel,
  BloomsLevel,
} from '@/types/question-bank';
import {
  QUESTION_TYPE_ENTRIES,
  QUESTION_TYPE_LABELS,
  QUESTION_STATUS_VARIANT,
  QUESTION_STATUS_LABELS,
  CAPS_LEVEL_LABELS,
  CAPS_LEVEL_COLORS,
  CAPS_LEVEL_ORDER,
} from '@/lib/design-system';

// ─── Question Type Labels ───────────────────────────────────────────────────
// Re-exported for backwards compatibility

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = QUESTION_TYPE_ENTRIES;

export const TYPE_LABELS: Record<QuestionType, string> = QUESTION_TYPE_LABELS;

// ─── Status ─────────────────────────────────────────────────────────────────

export const STATUS_VARIANT: Record<
  QuestionStatus,
  'secondary' | 'outline' | 'default' | 'destructive'
> = QUESTION_STATUS_VARIANT;

export const STATUS_LABELS: Record<QuestionStatus, string> = QUESTION_STATUS_LABELS;

// ─── CAPS Levels ────────────────────────────────────────────────────────────

export const CAPS_LEVELS: { value: CapsLevel; label: string }[] = CAPS_LEVEL_ORDER.map(
  (value) => ({ value, label: CAPS_LEVEL_LABELS[value] }),
);

export const CAPS_LABELS: Record<CapsLevel, string> = CAPS_LEVEL_LABELS;

export const CAPS_COLORS: Record<CapsLevel, string> = CAPS_LEVEL_COLORS;

// ─── Blooms Levels ──────────────────────────────────────────────────────────

export const BLOOMS_LEVELS: { value: BloomsLevel; label: string }[] = [
  { value: 'remember', label: 'Remember' },
  { value: 'understand', label: 'Understand' },
  { value: 'apply', label: 'Apply' },
  { value: 'analyse', label: 'Analyse' },
  { value: 'evaluate', label: 'Evaluate' },
  { value: 'create', label: 'Create' },
];
