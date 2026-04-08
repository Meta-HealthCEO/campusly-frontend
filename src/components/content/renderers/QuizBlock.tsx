'use client';

import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import type { ContentBlockItem, BlockInteractionState, AttemptResult } from '@/types';

/* ── Normalised quiz shape ─────────────────────────────────── */

interface NormalisedOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

interface NormalisedQuiz {
  question: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  options: NormalisedOption[];
  explanation: string;
}

/** Handles both legacy seed format and structured format */
function normaliseQuiz(raw: Record<string, unknown>): NormalisedQuiz {
  const question = (raw.question as string) ?? '';
  const explanation = (raw.explanation as string) ?? '';

  // Seed format: { question, options: string[], correctIndex: number }
  if (Array.isArray(raw.options) && typeof raw.options[0] === 'string') {
    const opts = raw.options as string[];
    const correctIdx = typeof raw.correctIndex === 'number' ? raw.correctIndex : -1;
    const labels = 'ABCDEFGHIJKLMNOP';
    return {
      question,
      type: 'mcq',
      explanation,
      options: opts.map((text, i) => ({
        label: labels[i] ?? String(i + 1),
        text,
        isCorrect: i === correctIdx,
      })),
    };
  }

  // Structured format: { question, type, options: { label, text, isCorrect }[] }
  if (Array.isArray(raw.options) && typeof raw.options[0] === 'object') {
    return {
      question,
      type: (raw.type as NormalisedQuiz['type']) ?? 'mcq',
      explanation,
      options: raw.options as NormalisedOption[],
    };
  }

  // True/False or short answer
  return {
    question,
    type: (raw.type as NormalisedQuiz['type']) ?? 'short_answer',
    explanation,
    options: [],
  };
}

/* ── Inline markdown renderer (for question & option text) ── */

function MathText({ children }: { children: string }) {
  return (
    <span className="inline [&_p]:inline [&_p]:m-0">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </span>
  );
}

/* ── Component ─────────────────────────────────────────────── */

interface QuizBlockProps {
  block: ContentBlockItem;
  onSubmit: (response: string) => Promise<AttemptResult>;
  interaction: BlockInteractionState;
}

export function QuizBlock({ block, onSubmit, interaction }: QuizBlockProps) {
  const quiz = useMemo<NormalisedQuiz>(() => {
    try { return normaliseQuiz(JSON.parse(block.content) as Record<string, unknown>); }
    catch { return { question: block.content, type: 'short_answer', options: [], explanation: '' }; }
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
      <div className="font-medium text-sm">
        <MathText>{quiz.question}</MathText>
      </div>

      {/* MCQ */}
      {quiz.type === 'mcq' && quiz.options.length > 0 && (
        <div className="space-y-2">
          {quiz.options.map((opt) => {
            const isSelected = selected === opt.label;
            const showCorrect = answered && opt.isCorrect;
            const showWrong = answered && isSelected && !opt.isCorrect;
            return (
              <label
                key={opt.label}
                className={`flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${
                  showCorrect ? 'border-primary bg-primary/10' :
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
                <span><MathText>{opt.text}</MathText></span>
                {showCorrect && <CheckCircle2 className="ml-auto size-4 text-primary" />}
                {showWrong && <XCircle className="ml-auto size-4 text-destructive" />}
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
          <Lightbulb className="size-4" />
          Show Hint ({hintsShown + 1}/{block.hints.length})
        </Button>
      )}
      {hintsShown > 0 && (
        <div className="space-y-1">
          {block.hints.slice(0, hintsShown).map((hint, i) => (
            <p key={i} className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              Hint {i + 1}: <MathText>{hint}</MathText>
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
        <div className={`rounded-lg p-3 text-sm ${interaction.correct ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
          <div className="flex items-center gap-2 font-medium">
            {interaction.correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {interaction.correct ? 'Correct!' : 'Incorrect'}
            <span className="ml-auto text-xs">
              Score: {interaction.attemptResult.score}/{interaction.attemptResult.maxScore}
            </span>
          </div>
          {(quiz.explanation || block.explanation) && (
            <div className="mt-2 text-xs opacity-80">
              <MathText>{quiz.explanation || block.explanation}</MathText>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
