'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import type { QuizQuestionLite, QuizAttempt } from '@/types';

interface LessonQuizShellProps {
  lessonTitle: string;
  questions: QuizQuestionLite[];
  maxAttempts: number | null;
  onSubmit: (
    answers: { questionId: string; answer: unknown }[],
  ) => Promise<{ attempt: QuizAttempt; passed: boolean; canRetry: boolean } | null>;
}

/**
 * Quiz lesson UI. Renders each question with a type-specific input
 * (radio group for MCQ/true_false, text input for fill_blank),
 * collects answers into local state, and on submit calls the parent's
 * onSubmit which wraps useLessonPlayer.submitQuiz. Shows the result
 * after submission with per-question correctness indicators when
 * available and a retry button if the student can retry.
 */
export function LessonQuizShell({
  lessonTitle,
  questions,
  maxAttempts,
  onSubmit,
}: LessonQuizShellProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    attempt: QuizAttempt;
    passed: boolean;
    canRetry: boolean;
  } | null>(null);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    const res = await onSubmit(payload);
    setSubmitting(false);
    if (res) setResult(res);
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
  };

  const totalAnswered = Object.keys(answers).length;
  const canSubmit = totalAnswered === questions.length;

  // Build a map of questionId → attempt answer for per-question feedback
  // after submission.
  const answerResultById = new Map<
    string,
    { isCorrect: boolean; marks: number }
  >();
  if (result) {
    for (const a of result.attempt.answers) {
      answerResultById.set(a.questionId, { isCorrect: a.isCorrect, marks: a.marks });
    }
  }

  return (
    <div className="space-y-4">
      {/* Result banner */}
      {result && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-3">
              {result.passed ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive" />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-bold">
                  {result.passed ? 'Passed!' : 'Not quite yet'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  You scored {result.attempt.earnedMarks} / {result.attempt.totalMarks}
                  {' '}({result.attempt.percent}%)
                </p>
              </div>
              {!result.passed && result.canRetry && (
                <Button variant="outline" onClick={handleRetry}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              )}
            </div>
            {maxAttempts !== null && (
              <p className="text-xs text-muted-foreground">
                Attempt {result.attempt.attemptNumber} of {maxAttempts}
                {!result.canRetry && ' — no attempts remaining'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <h1 className="text-2xl font-bold">{lessonTitle}</h1>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question, i) => {
          const answered = answers[question.id];
          const resultForThis = answerResultById.get(question.id);
          return (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">Q{i + 1}.</span>
                  <span className="flex-1">{question.stem}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {question.marks} mark{question.marks === 1 ? '' : 's'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {renderQuestionInput(
                  question,
                  answered ?? '',
                  (v) => handleAnswerChange(question.id, v),
                  result !== null,
                )}
                {resultForThis && (
                  <div
                    className={
                      resultForThis.isCorrect
                        ? 'flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400'
                        : 'flex items-center gap-2 text-xs text-destructive'
                    }
                  >
                    {resultForThis.isCorrect ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" /> Incorrect
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit */}
      {!result && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {totalAnswered} of {questions.length} answered
          </span>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? 'Submitting...' : 'Submit quiz'}
          </Button>
        </div>
      )}
    </div>
  );
}

function renderQuestionInput(
  question: QuizQuestionLite,
  value: string,
  onChange: (v: string) => void,
  disabled: boolean,
) {
  if (question.type === 'mcq' || question.type === 'true_false') {
    return (
      <RadioGroup
        value={value}
        onValueChange={(v: unknown) => onChange(v as string)}
        disabled={disabled}
      >
        {question.options.map((opt) => (
          <div key={opt.label} className="flex items-start gap-2 rounded-md border p-3">
            <RadioGroupItem value={opt.label} id={`${question.id}-${opt.label}`} />
            <Label
              htmlFor={`${question.id}-${opt.label}`}
              className="flex-1 cursor-pointer text-sm font-normal"
            >
              <span className="font-semibold mr-2">{opt.label}.</span>
              {opt.text}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  if (question.type === 'fill_blank') {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer..."
        disabled={disabled}
      />
    );
  }

  return (
    <p className="text-xs text-muted-foreground italic">
      Unsupported question type: {question.type}
    </p>
  );
}
