'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Quiz, QuizAttempt, QuizLeaderboardEntry } from './types';

interface QuizResultsProps {
  quiz: Quiz;
  result: QuizAttempt;
  leaderboard: QuizLeaderboardEntry[];
  onRetry?: () => void;
  canRetry: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function QuizResults({ quiz, result, leaderboard, onRetry, canRetry }: QuizResultsProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle>Quiz Results</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-4xl font-bold">{result.percentage}%</p>
            <p className="text-lg text-muted-foreground">
              Score: {result.totalScore}/{quiz.totalPoints}
            </p>
            {result.timeSpent !== undefined && (
              <p className="text-sm text-muted-foreground">
                Time taken: {formatTime(result.timeSpent)}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Attempt {result.attempt} of {quiz.attempts}
            </p>
            <Badge
              variant="secondary"
              className={result.percentage >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-destructive/10 text-destructive'}
            >
              {result.percentage >= 50 ? 'Passed' : 'Failed'}
            </Badge>
          </div>
          {canRetry && onRetry && (
            <Button onClick={onRetry} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Quiz (Attempt {result.attempt + 1} of {quiz.attempts})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Per-question breakdown */}
      {result.answers.map((a, i) => {
        const q = quiz.questions[a.questionIndex];
        if (!q) return null;
        return (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                {a.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{q.questionText}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.pointsEarned ?? 0}/{q.points} points
                  </p>
                </div>
              </div>
              {q.explanation && (
                <p className="text-sm text-muted-foreground ml-7">
                  <strong>Explanation:</strong> {q.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, idx) => (
                <div key={entry.studentId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-6 text-center">{idx + 1}</span>
                    <span>{entry.firstName} {entry.lastName}</span>
                  </div>
                  <span className="font-medium">{entry.bestPercentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
