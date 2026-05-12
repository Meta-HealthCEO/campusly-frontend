'use client';

import { useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useQuizPlayer } from '@/hooks/useQuizPlayer';
import { QuizAttemptUI } from './QuizAttemptUI';
import type { QuizAnswer, QuizAttempt } from './types';

export interface QuizPlayerResult {
  score: number;
  total: number;
}

interface QuizPlayerProps {
  quizId: string;
  mode: 'scored' | 'practice';
  onComplete?: (result: QuizPlayerResult) => void;
}

/**
 * Reusable wrapper around QuizAttemptUI. Fetches the quiz, handles
 * attempt submission, and surfaces a simple result callback. Lesson
 * detail and homework detail pages compose this rather than re-doing
 * the fetch/submit dance themselves.
 */
export function QuizPlayer({ quizId, mode, onComplete }: QuizPlayerProps) {
  const { quiz, loading, error, submitAttempt } = useQuizPlayer(quizId, mode);

  const handleSubmit = useCallback(
    async (
      answers: QuizAnswer[],
      startedAt: string,
      timeSpent?: number,
    ): Promise<QuizAttempt> => {
      const attempt = await submitAttempt(answers, startedAt, timeSpent);
      onComplete?.({
        score: attempt.totalScore ?? 0,
        total: quiz?.totalPoints ?? 0,
      });
      return attempt;
    },
    [submitAttempt, onComplete, quiz?.totalPoints],
  );

  if (loading) return <LoadingSpinner />;
  if (error || !quiz) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Quiz unavailable"
        description="We couldn't load this quiz. Try again later."
      />
    );
  }

  return <QuizAttemptUI quiz={quiz} onSubmit={handleSubmit} />;
}
