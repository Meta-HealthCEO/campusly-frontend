'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnswerMark } from './AnswerMark';
import { answerEdge } from './answer-state';
import type { ContentBlockItem, BlockInteractionState, AttemptResult } from '@/types';

interface OrderingData {
  items: string[];
  correctOrder: number[];
}

interface OrderingBlockProps {
  block: ContentBlockItem;
  onSubmit: (response: string) => Promise<AttemptResult>;
  interaction: BlockInteractionState;
}

export function OrderingBlock({ block, onSubmit, interaction }: OrderingBlockProps) {
  const data = useMemo<OrderingData>(() => {
    try { return JSON.parse(block.content) as OrderingData; }
    catch { return { items: [], correctOrder: [] }; }
  }, [block.content]);

  // Track current order as array of original indices
  const [order, setOrder] = useState<number[]>(() => data.items.map((_, i) => i));
  const [submitting, setSubmitting] = useState(false);
  const [correctPositions, setCorrectPositions] = useState<boolean[] | null>(null);
  const [hintsShown, setHintsShown] = useState(interaction.hintsRevealed);

  const answered = interaction.answered;

  const moveItem = (fromIdx: number, direction: -1 | 1) => {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(JSON.stringify(order));
      // Check each position
      const posResults = order.map((origIdx, pos) => data.correctOrder[pos] === origIdx);
      setCorrectPositions(posResults);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Arrange the items in the correct order:</p>

      <div className="space-y-2">
        {order.map((origIdx, pos) => (
          <div
            key={origIdx}
            className={cn(
              'flex items-center gap-2 rounded-lg border p-3 text-sm',
              correctPositions ? answerEdge(Boolean(correctPositions[pos])) : 'bg-background',
            )}
          >
            <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">
              {pos + 1}.
            </span>
            <span className="flex-1 min-w-0 truncate">{data.items[origIdx]}</span>
            {!answered && (
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(pos, -1)}
                  disabled={pos === 0}
                  className="h-10 w-10 p-0 sm:h-7 sm:w-7"
                >
                  <ArrowUp className="size-4 sm:size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(pos, 1)}
                  disabled={pos === order.length - 1}
                  className="h-10 w-10 p-0 sm:h-7 sm:w-7"
                >
                  <ArrowDown className="size-4 sm:size-3.5" />
                </Button>
              </div>
            )}
            {correctPositions && <AnswerMark correct={Boolean(correctPositions[pos])} />}
          </div>
        ))}
      </div>

      {/* Hints */}
      {!answered && block.hints.length > 0 && hintsShown < block.hints.length && (
        <Button variant="ghost" size="sm" onClick={() => setHintsShown((p) => p + 1)} className="gap-1.5">
          <Lightbulb className="size-4" />
          Show Hint ({hintsShown + 1}/{block.hints.length})
        </Button>
      )}
      {hintsShown > 0 && (
        <div className="space-y-1">
          {block.hints.slice(0, hintsShown).map((hint, i) => (
            <p key={i} className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              Hint {i + 1}: {hint}
            </p>
          ))}
        </div>
      )}

      {!answered && (
        <Button onClick={handleSubmit} disabled={submitting} size="sm">
          {submitting ? 'Checking...' : 'Submit Order'}
        </Button>
      )}

      {answered && interaction.attemptResult && (
        <div className={cn('rounded-lg p-3 text-sm text-foreground', answerEdge(Boolean(interaction.correct)))}>
          <div className="flex items-center gap-2 font-medium">
            <AnswerMark correct={Boolean(interaction.correct)} className="text-sm" />
            <span className="ml-auto text-xs">
              Score: {interaction.attemptResult.score}/{interaction.attemptResult.maxScore}
            </span>
          </div>
          {block.explanation && <p className="mt-2 text-xs opacity-80">{block.explanation}</p>}
        </div>
      )}
    </div>
  );
}
