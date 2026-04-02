'use client';

import { CheckCircle, XCircle, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { PracticeAttempt } from '@/types';

interface PracticeResultsProps {
  attempt: PracticeAttempt;
}

export function PracticeResults({ attempt }: PracticeResultsProps) {
  const pct = attempt.totalMarks > 0
    ? Math.round((attempt.score / attempt.totalMarks) * 100)
    : 0;

  const correctCount = attempt.questions.filter((q) => q.isCorrect).length;
  const incorrectCount = attempt.questions.length - correctCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Results: {attempt.topic}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="text-center">
          <p className="text-4xl font-bold">
            {attempt.score}/{attempt.totalMarks}
          </p>
          <p className="text-lg text-muted-foreground">{pct}%</p>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Score</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-lg bg-emerald-500/10 p-3">
            <CheckCircle className="mx-auto h-5 w-5 text-emerald-600" />
            <p className="mt-1 font-medium">{correctCount} Correct</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-3">
            <XCircle className="mx-auto h-5 w-5 text-destructive" />
            <p className="mt-1 font-medium">{incorrectCount} Incorrect</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Question Summary</h4>
          {attempt.questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {q.isCorrect ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span className="truncate">Q{i + 1}: {q.questionText}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {q.isCorrect ? q.marks : 0}/{q.marks}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
