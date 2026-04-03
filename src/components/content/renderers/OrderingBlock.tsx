'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
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
            className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
              correctPositions
                ? correctPositions[pos]
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                  : 'border-destructive bg-destructive/10'
                : 'bg-background'
            }`}
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
                  className="h-7 w-7 p-0"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(pos, 1)}
                  disabled={pos === order.length - 1}
                  className="h-7 w-7 p-0"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {correctPositions && (
              correctPositions[pos]
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                : <XCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Hints */}
      {!answered && block.hints.length > 0 && hintsShown < block.hints.length && (
        <Button variant="ghost" size="sm" onClick={() => setHintsShown((p) => p + 1)} className="gap-1.5">
          <Lightbulb className="h-4 w-4" />
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
        <div className={`rounded-lg p-3 text-sm ${interaction.correct ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>
          <div className="flex items-center gap-2 font-medium">
            {interaction.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            Score: {interaction.attemptResult.score}/{interaction.attemptResult.maxScore}
          </div>
          {block.explanation && <p className="mt-2 text-xs opacity-80">{block.explanation}</p>}
        </div>
      )}
    </div>
  );
}
