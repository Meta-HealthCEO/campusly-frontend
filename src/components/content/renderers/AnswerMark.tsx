import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANSWER_WORD, answerTone } from './answer-state';

interface AnswerMarkProps {
  correct: boolean;
  /** Inline marks (a blank inside a sentence) keep the word for screen readers only. */
  compact?: boolean;
  className?: string;
}

/** The icon and the word for a marked answer (Task 17): "Correct" or "Not quite", in the semantic colour. */
export function AnswerMark({ correct, compact = false, className }: AnswerMarkProps) {
  const Icon = correct ? CheckCircle2 : XCircle;
  const word = correct ? ANSWER_WORD.correct : ANSWER_WORD.incorrect;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs font-semibold', answerTone(correct), className)}>
      <Icon className="size-4" aria-hidden="true" />
      <span className={compact ? 'sr-only' : undefined}>{word}</span>
    </span>
  );
}
