'use client';

import Link from 'next/link';
import { CheckCircle, HelpCircle, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { AuraMarkdown } from './AuraMarkdown';
import { EquationText } from '@/components/shared/EquationText';
import type { PracticeQuestion } from '@/types';

interface PracticeQuestionCardProps {
  question: PracticeQuestion;
  index: number;
  onAnswer: (index: number, answer: string) => void;
  showResult: boolean;
  auraReviewHref?: string;
}

export function PracticeQuestionCard({
  question,
  index,
  onAnswer,
  showResult,
  auraReviewHref,
}: PracticeQuestionCardProps) {
  const awarded = question.marksAwarded ?? (question.isCorrect ? question.marks : 0);

  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border bg-card',
        showResult && question.isCorrect === true && 'border-emerald-500/60',
        showResult && question.isCorrect === false && 'border-destructive/60',
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Question {index + 1}</Badge>
            <Badge variant="secondary">
              {question.marks} mark{question.marks !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline">{questionTypeLabel(question.questionType)}</Badge>
          </div>
        </div>
        {showResult && (
          question.isCorrect ? (
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-destructive" />
          )
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="text-sm leading-relaxed">
          <AuraMarkdown content={question.questionText} />
        </div>

        {question.questionType === 'mcq' && (
          question.options && question.options.length > 0 ? (
            <RadioGroup
              value={question.studentAnswer ?? ''}
              onValueChange={(v: unknown) => onAnswer(index, v as string)}
              disabled={showResult}
              className="grid gap-2"
            >
              {question.options.map((opt, i) => {
                const selected = question.studentAnswer === opt;
                const correct = showResult && normalizeOption(opt) === normalizeOption(question.correctAnswer);
                const incorrectSelection = showResult && selected && !correct;
                return (
                  <label
                    key={`${opt}-${i}`}
                    htmlFor={`q${index}-opt${i}`}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 text-sm transition',
                      !showResult && 'hover:border-primary/50 hover:bg-accent',
                      selected && !showResult && 'border-primary bg-primary/5',
                      correct && 'border-emerald-500/60 bg-emerald-500/10',
                      incorrectSelection && 'border-destructive/60 bg-destructive/10',
                    )}
                  >
                    <RadioGroupItem value={opt} id={`q${index}-opt${i}`} className="mt-0.5" />
                    <span className="flex-1">
                      <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
                      <EquationText text={opt} />
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
              <HelpCircle className="mr-2 inline h-4 w-4" />
              This multiple-choice question did not include options. Type the answer below.
              <Input
                className="mt-3"
                value={question.studentAnswer ?? ''}
                onChange={(e) => onAnswer(index, e.target.value)}
                placeholder="Type your answer..."
                disabled={showResult}
              />
            </div>
          )
        )}

        {question.questionType === 'short_answer' && (
          <Textarea
            value={question.studentAnswer ?? ''}
            onChange={(e) => onAnswer(index, e.target.value)}
            placeholder="Type your answer. Explain your thinking if you can..."
            disabled={showResult}
            className="min-h-24 resize-y"
          />
        )}

        {question.questionType === 'true_false' && (
          <div className="flex gap-2">
            <Button
              variant={question.studentAnswer === 'True' ? 'default' : 'outline'}
              size="lg"
              onClick={() => onAnswer(index, 'True')}
              disabled={showResult}
            >
              True
            </Button>
            <Button
              variant={question.studentAnswer === 'False' ? 'default' : 'outline'}
              size="lg"
              onClick={() => onAnswer(index, 'False')}
              disabled={showResult}
            >
              False
            </Button>
          </div>
        )}

        {showResult && (
          <div
            className={cn(
              'rounded-lg border p-4 text-sm',
              question.isCorrect
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-destructive/40 bg-destructive/10',
            )}
          >
            <p className="font-semibold">
              {awarded} / {question.marks} marks
            </p>
            {!question.isCorrect && (
              <p className="mt-2 font-medium">
                Correct answer:{' '}
                <span className="text-emerald-700 dark:text-emerald-300">
                  <EquationText text={question.correctAnswer} />
                </span>
              </p>
            )}
            {question.feedback && (
              <p className="mt-2 text-foreground">
                <EquationText text={question.feedback} />
              </p>
            )}
            <div className="mt-3 border-t pt-3 text-muted-foreground">
              <AuraMarkdown content={question.explanation} />
            </div>
            {auraReviewHref && (
              <div className="mt-3 border-t pt-3">
                <Link href={auraReviewHref}>
                  <Button type="button" variant="outline" size="sm">
                    <Sparkles className="h-4 w-4" />
                    Ask Aura to re-teach this
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function questionTypeLabel(type: PracticeQuestion['questionType']): string {
  switch (type) {
    case 'mcq':
      return 'Multiple choice';
    case 'true_false':
      return 'True / false';
    default:
      return 'Short answer';
  }
}

function normalizeOption(value: string): string {
  return value.trim().toLowerCase().replace(/^[a-d][.)]\s*/, '');
}
