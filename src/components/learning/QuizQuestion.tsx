'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { QuizQuestion as QuizQuestionType } from './types';

interface QuizQuestionProps {
  question: QuizQuestionType;
  index: number;
  displayIndex: number;
  selectedOption?: number;
  textAnswer?: string;
  onAnswer: (questionIndex: number, selectedOption?: number, textAnswer?: string) => void;
  showFeedback: boolean;
  isCorrect?: boolean;
}

export function QuizQuestionCard({
  question,
  index,
  displayIndex,
  selectedOption,
  textAnswer,
  onAnswer,
  showFeedback,
  isCorrect,
}: QuizQuestionProps) {
  const hasAnswered = selectedOption !== undefined || (textAnswer !== undefined && textAnswer !== '');
  const disabled = showFeedback && hasAnswered;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            {showFeedback && hasAnswered && (
              isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              )
            )}
            <p className="font-medium text-sm">
              Q{displayIndex + 1}. {question.questionText}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">{question.points} pts</Badge>
        </div>

        {question.questionType === 'short_answer' ? (
          <Input
            value={textAnswer ?? ''}
            onChange={(e) => onAnswer(index, undefined, e.target.value)}
            placeholder="Type your answer..."
            disabled={disabled}
          />
        ) : question.questionType === 'true_false' ? (
          <div className="flex gap-3">
            {['True', 'False'].map((label, oi) => {
              const isSelected = selectedOption === oi;
              const optionCorrect = question.options[oi]?.isCorrect;
              let borderClass = isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50';
              if (showFeedback && hasAnswered) {
                if (optionCorrect) borderClass = 'border-emerald-500 bg-emerald-50';
                else if (isSelected && !optionCorrect) borderClass = 'border-destructive bg-destructive/5';
              }
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAnswer(index, oi)}
                  className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${borderClass} ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {question.options.map((opt, oi) => {
              const isSelected = selectedOption === oi;
              let borderClass = isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50';
              if (showFeedback && hasAnswered) {
                if (opt.isCorrect) borderClass = 'border-emerald-500 bg-emerald-50';
                else if (isSelected && !opt.isCorrect) borderClass = 'border-destructive bg-destructive/5';
              }
              return (
                <label
                  key={oi}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${borderClass} ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    name={`q-${index}`}
                    checked={isSelected}
                    onChange={() => onAnswer(index, oi)}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{opt.text}</span>
                </label>
              );
            })}
          </div>
        )}

        {showFeedback && hasAnswered && question.explanation && (
          <p className="text-sm text-muted-foreground border-t pt-2">
            <strong>Explanation:</strong> {question.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
