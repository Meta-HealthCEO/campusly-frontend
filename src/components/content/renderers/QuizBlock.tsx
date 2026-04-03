'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import type { ContentBlockItem, BlockInteractionState, AttemptResult } from '@/types';

interface QuizData {
  question: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  options?: { label: string; text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation?: string;
}

interface QuizBlockProps {
  block: ContentBlockItem;
  onSubmit: (response: string) => Promise<AttemptResult>;
  interaction: BlockInteractionState;
}

export function QuizBlock({ block, onSubmit, interaction }: QuizBlockProps) {
  const quiz = useMemo<QuizData>(() => {
    try { return JSON.parse(block.content) as QuizData; }
    catch { return { question: block.content, type: 'short_answer' }; }
  }, [block.content]);

  const [selected, setSelected] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [hintsShown, setHintsShown] = useState(interaction.hintsRevealed);

  const answered = interaction.answered;

  const handleSubmit = async () => {
    if (!selected.trim() || submitting) return;
    setSubmitting(true);
    try { await onSubmit(selected); }
    finally { setSubmitting(false); }
  };

  const revealHint = () => setHintsShown((prev) => Math.min(prev + 1, block.hints.length));

  return (
    <div className="space-y-4">
      <p className="font-medium text-sm">{quiz.question}</p>

      {/* MCQ */}
      {quiz.type === 'mcq' && quiz.options && (
        <div className="space-y-2">
          {quiz.options.map((opt) => {
            const isSelected = selected === opt.label;
            const showCorrect = answered && opt.isCorrect;
            const showWrong = answered && isSelected && !opt.isCorrect;
            return (
              <label
                key={opt.label}
                className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${
                  showCorrect ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' :
                  showWrong ? 'border-destructive bg-destructive/10' :
                  isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                } ${answered ? 'pointer-events-none' : ''}`}
              >
                <input
                  type="radio"
                  name={`quiz-${block.blockId}`}
                  value={opt.label}
                  checked={isSelected}
                  onChange={() => setSelected(opt.label)}
                  disabled={answered}
                  className="accent-primary"
                />
                <span className="font-medium">{opt.label}.</span>
                <span>{opt.text}</span>
                {showCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />}
                {showWrong && <XCircle className="ml-auto h-4 w-4 text-destructive" />}
              </label>
            );
          })}
        </div>
      )}

      {/* True/False */}
      {quiz.type === 'true_false' && (
        <div className="flex gap-3">
          {['True', 'False'].map((val) => {
            const isSelected = selected === val;
            const isCorrect = answered && interaction.correct !== null;
            return (
              <Button
                key={val}
                variant={isSelected ? (answered ? (isCorrect && interaction.correct ? 'default' : 'destructive') : 'default') : 'outline'}
                onClick={() => !answered && setSelected(val)}
                disabled={answered}
                className="flex-1"
              >
                {val}
              </Button>
            );
          })}
        </div>
      )}

      {/* Short Answer */}
      {quiz.type === 'short_answer' && (
        <Input
          placeholder="Type your answer..."
          value={selected}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelected(e.target.value)}
          disabled={answered}
          className="w-full"
        />
      )}

      {/* Hints */}
      {!answered && block.hints.length > 0 && hintsShown < block.hints.length && (
        <Button variant="ghost" size="sm" onClick={revealHint} className="gap-1.5">
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

      {/* Submit */}
      {!answered && (
        <Button onClick={handleSubmit} disabled={!selected.trim() || submitting} size="sm">
          {submitting ? 'Checking...' : 'Submit Answer'}
        </Button>
      )}

      {/* Result */}
      {answered && interaction.attemptResult && (
        <div className={`rounded-lg p-3 text-sm ${interaction.correct ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-destructive/10 text-destructive'}`}>
          <div className="flex items-center gap-2 font-medium">
            {interaction.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {interaction.correct ? 'Correct!' : 'Incorrect'}
            <span className="ml-auto text-xs">
              Score: {interaction.attemptResult.score}/{interaction.attemptResult.maxScore}
            </span>
          </div>
          {block.explanation && (
            <p className="mt-2 text-xs opacity-80">{block.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
