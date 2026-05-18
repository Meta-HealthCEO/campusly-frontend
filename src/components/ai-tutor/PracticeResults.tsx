'use client';

import { CheckCircle, RotateCcw, Sparkles, Trophy, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { PracticeAttempt } from '@/types';

interface PracticeResultsProps {
  attempt: PracticeAttempt;
  onTryAgain?: () => void;
}

export function PracticeResults({ attempt, onTryAgain }: PracticeResultsProps) {
  const pct = attempt.totalMarks > 0
    ? Math.round((attempt.score / attempt.totalMarks) * 100)
    : 0;

  const correctCount = attempt.questions.filter((q) => q.isCorrect).length;
  const incorrectCount = attempt.questions.length - correctCount;
  const message = resultMessage(pct);
  const reviewHref = buildAuraReviewHref(attempt);

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="grid gap-5 border-b p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <Badge className="mb-3 bg-primary text-primary-foreground">
            <Trophy className="h-3 w-3" />
            Practice complete
          </Badge>
          <h2 className="text-2xl font-bold tracking-normal">{attempt.topic}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="rounded-lg border bg-background px-5 py-4 text-center">
          <p className="text-4xl font-bold">{pct}%</p>
          <p className="text-sm text-muted-foreground">{attempt.score}/{attempt.totalMarks} marks</p>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Score</span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <Progress value={pct} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-sm">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <CheckCircle className="mx-auto h-5 w-5 text-emerald-600" />
              <p className="mt-1 font-semibold">{correctCount} correct</p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <XCircle className="mx-auto h-5 w-5 text-destructive" />
              <p className="mt-1 font-semibold">{incorrectCount} to review</p>
            </div>
          </div>
        </div>

        <aside className="space-y-3 rounded-lg border bg-background p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Next step</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the explanations below, then ask Aura to re-teach any question you missed.
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            {onTryAgain && (
              <Button type="button" variant="outline" onClick={onTryAgain}>
                <RotateCcw className="h-4 w-4" />
                New drill
              </Button>
            )}
            <Link href={reviewHref}>
              <Button className="w-full">
                <Sparkles className="h-4 w-4" />
                Review with Aura
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function buildAuraReviewHref(attempt: PracticeAttempt, questionIndex?: number): string {
  const params = new URLSearchParams();
  params.set('mode', 'practice');
  params.set('subjectId', attempt.subjectId);
  params.set('topic', attempt.topic);

  const missedQuestions = attempt.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => question.isCorrect === false);
  const target = typeof questionIndex === 'number'
    ? attempt.questions[questionIndex]
    : missedQuestions[0]?.question;

  const context = target
    ? [
        `Help me review this ${attempt.topic} practice question.`,
        `Question: ${target.questionText}`,
        target.studentAnswer ? `My answer: ${target.studentAnswer}` : '',
        target.correctAnswer ? `Correct answer: ${target.correctAnswer}` : '',
        'Re-teach the idea briefly, then give me one similar question to try.',
      ].filter(Boolean).join('\n')
    : `Help me review ${attempt.topic}. Start with the most important concept, then give me one practice question.`;

  params.set('context', context);
  return `/student/ai-tutor?${params.toString()}`;
}

function resultMessage(pct: number): string {
  if (pct >= 85) return 'Excellent work. You are ready to stretch into harder questions.';
  if (pct >= 65) return 'Good progress. Review the misses, then try one more focused drill.';
  if (pct >= 45) return 'You have a base to build from. Focus on the explanations and try again.';
  return 'This is a starting point, not a verdict. Slow down, review the basics, and let Aura rebuild it with you.';
}
