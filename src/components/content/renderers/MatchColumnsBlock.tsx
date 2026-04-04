'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import type { ContentBlockItem, BlockInteractionState, AttemptResult } from '@/types';

interface MatchData {
  left: string[];
  right: string[];
  correctPairs: [number, number][];
}

interface MatchColumnsBlockProps {
  block: ContentBlockItem;
  onSubmit: (response: string) => Promise<AttemptResult>;
  interaction: BlockInteractionState;
}

export function MatchColumnsBlock({ block, onSubmit, interaction }: MatchColumnsBlockProps) {
  const data = useMemo<MatchData>(() => {
    try { return JSON.parse(block.content) as MatchData; }
    catch { return { left: [], right: [], correctPairs: [] }; }
  }, [block.content]);

  const [matches, setMatches] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Record<number, boolean> | null>(null);
  const [hintsShown, setHintsShown] = useState(interaction.hintsRevealed);

  const answered = interaction.answered;

  const handleSelect = (leftIdx: number, rightIdx: number) => {
    setMatches((prev) => ({ ...prev, [leftIdx]: rightIdx }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const pairs = Object.entries(matches).map(([l, r]) => [Number(l), r]);
      await onSubmit(JSON.stringify(pairs));
      // Local correctness check
      const correctMap: Record<number, boolean> = {};
      for (const [leftIdx, rightIdx] of Object.entries(matches)) {
        const li = Number(leftIdx);
        const isCorrect = data.correctPairs.some(
          ([cl, cr]) => cl === li && cr === rightIdx
        );
        correctMap[li] = isCorrect;
      }
      setResults(correctMap);
    } finally {
      setSubmitting(false);
    }
  };

  const allMatched = data.left.length > 0 && Object.keys(matches).length === data.left.length;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Match each item on the left with its pair on the right:</p>

      <div className="space-y-3">
        {data.left.map((item, leftIdx) => (
          <div key={leftIdx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className={`text-sm min-w-0 flex-1 truncate px-3 py-2 rounded border ${
              results
                ? results[leftIdx]
                  ? 'border-primary bg-primary/10'
                  : results[leftIdx] === false
                    ? 'border-destructive bg-destructive/10'
                    : ''
                : ''
            }`}>
              {item}
            </span>
            <span className="text-muted-foreground text-xs hidden sm:block">&rarr;</span>
            <div className="w-full sm:w-48">
              <Select
                value={matches[leftIdx] !== undefined ? String(matches[leftIdx]) : undefined}
                onValueChange={(val: unknown) => handleSelect(leftIdx, Number(val as string))}
                disabled={answered}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select match..." />
                </SelectTrigger>
                <SelectContent>
                  {data.right.map((rightItem, rightIdx) => (
                    <SelectItem key={rightIdx} value={String(rightIdx)}>
                      {rightItem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {results && (
              results[leftIdx]
                ? <CheckCircle2 className="size-4 text-primary shrink-0" />
                : results[leftIdx] === false
                  ? <XCircle className="size-4 text-destructive shrink-0" />
                  : null
            )}
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
        <Button onClick={handleSubmit} disabled={!allMatched || submitting} size="sm">
          {submitting ? 'Checking...' : 'Submit'}
        </Button>
      )}

      {answered && interaction.attemptResult && (
        <div className={`rounded-lg p-3 text-sm ${interaction.correct ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
          <div className="flex items-center gap-2 font-medium">
            {interaction.correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            Score: {interaction.attemptResult.score}/{interaction.attemptResult.maxScore}
          </div>
          {block.explanation && <p className="mt-2 text-xs opacity-80">{block.explanation}</p>}
        </div>
      )}
    </div>
  );
}
