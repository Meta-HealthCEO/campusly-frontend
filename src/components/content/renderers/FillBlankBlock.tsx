'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import type { ContentBlockItem, BlockInteractionState, AttemptResult } from '@/types';

interface FillBlankData {
  text: string;
  blanks: string[];
}

interface FillBlankBlockProps {
  block: ContentBlockItem;
  onSubmit: (response: string) => Promise<AttemptResult>;
  interaction: BlockInteractionState;
}

export function FillBlankBlock({ block, onSubmit, interaction }: FillBlankBlockProps) {
  const data = useMemo<FillBlankData>(() => {
    try { return JSON.parse(block.content) as FillBlankData; }
    catch { return { text: block.content, blanks: [] }; }
  }, [block.content]);

  const blankCount = (data.text.match(/___/g) ?? []).length;
  const [answers, setAnswers] = useState<string[]>(Array(blankCount).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<boolean[] | null>(null);
  const [hintsShown, setHintsShown] = useState(interaction.hintsRevealed);

  const answered = interaction.answered;

  const updateAnswer = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = JSON.stringify(answers);
      await onSubmit(response);
      // Compare answers to blanks for local display
      const correctness = answers.map(
        (a, i) => a.trim().toLowerCase() === (data.blanks[i] ?? '').trim().toLowerCase()
      );
      setResults(correctness);
    } finally {
      setSubmitting(false);
    }
  };

  // Split text by ___ to interleave with inputs
  const segments = data.text.split('___');
  let blankIndex = 0;

  return (
    <div className="space-y-4">
      <div className="text-sm leading-relaxed flex flex-wrap items-center gap-1">
        {segments.map((segment, i) => {
          const currentBlankIdx = blankIndex;
          const showInput = i < segments.length - 1;
          if (showInput) blankIndex++;

          return (
            <span key={i} className="inline-flex items-center gap-1">
              <span>{segment}</span>
              {showInput && (
                <span className="inline-flex items-center gap-1">
                  <Input
                    value={answers[currentBlankIdx] ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateAnswer(currentBlankIdx, e.target.value)
                    }
                    disabled={answered}
                    className={`inline-block w-32 sm:w-40 h-8 text-sm ${
                      results
                        ? results[currentBlankIdx]
                          ? 'border-primary bg-primary/10'
                          : 'border-destructive bg-destructive/10'
                        : ''
                    }`}
                    placeholder={`blank ${currentBlankIdx + 1}`}
                  />
                  {results && (
                    results[currentBlankIdx]
                      ? <CheckCircle2 className="size-4 text-primary shrink-0" />
                      : <XCircle className="size-4 text-destructive shrink-0" />
                  )}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Correct answers after submission */}
      {answered && results && results.some((r) => !r) && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
          Correct answers: {data.blanks.join(', ')}
        </div>
      )}

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
        <Button
          onClick={handleSubmit}
          disabled={answers.some((a) => !a.trim()) || submitting}
          size="sm"
        >
          {submitting ? 'Checking...' : 'Submit'}
        </Button>
      )}

      {/* Result */}
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
