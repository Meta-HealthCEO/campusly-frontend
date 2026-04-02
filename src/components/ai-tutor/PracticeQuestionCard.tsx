'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PracticeQuestion } from '@/types';

interface PracticeQuestionCardProps {
  question: PracticeQuestion;
  index: number;
  onAnswer: (index: number, answer: string) => void;
  showResult: boolean;
}

export function PracticeQuestionCard({
  question,
  index,
  onAnswer,
  showResult,
}: PracticeQuestionCardProps) {
  const answered = question.studentAnswer !== undefined && question.studentAnswer !== '';

  return (
    <Card className={cn(
      showResult && question.isCorrect === true && 'border-emerald-500/50',
      showResult && question.isCorrect === false && 'border-destructive/50',
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">
            Question {index + 1}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({question.marks} mark{question.marks !== 1 ? 's' : ''})
            </span>
          </CardTitle>
          {showResult && (
            question.isCorrect ? (
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-destructive" />
            )
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{question.questionText}</p>

        {question.questionType === 'mcq' && question.options && (
          <RadioGroup
            value={question.studentAnswer ?? ''}
            onValueChange={(v: unknown) => onAnswer(index, v as string)}
            disabled={showResult}
          >
            {question.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={opt} id={`q${index}-opt${i}`} />
                <Label htmlFor={`q${index}-opt${i}`} className="text-sm font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.questionType === 'short_answer' && (
          <Input
            value={question.studentAnswer ?? ''}
            onChange={(e) => onAnswer(index, e.target.value)}
            placeholder="Type your answer..."
            disabled={showResult}
          />
        )}

        {question.questionType === 'true_false' && (
          <div className="flex gap-2">
            <Button
              variant={question.studentAnswer === 'True' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAnswer(index, 'True')}
              disabled={showResult}
            >
              True
            </Button>
            <Button
              variant={question.studentAnswer === 'False' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onAnswer(index, 'False')}
              disabled={showResult}
            >
              False
            </Button>
          </div>
        )}

        {showResult && (
          <div className={cn(
            'rounded-lg p-3 text-sm',
            question.isCorrect ? 'bg-emerald-500/10' : 'bg-destructive/10',
          )}>
            {!question.isCorrect && (
              <p className="font-medium">
                Correct answer: <span className="text-emerald-600">{question.correctAnswer}</span>
              </p>
            )}
            <p className="mt-1 text-muted-foreground">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
