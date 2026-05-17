'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useStudentMastery } from '@/hooks/useStudentMastery';
import type { SubjectMastery } from '@/types';

/**
 * Compact mastery snapshot — shows each subject's combined score plus the
 * single weakest topic if one exists. Quiet utility, not a leaderboard.
 */
export function MasteryWidget() {
  const { mastery, loading } = useStudentMastery();

  if (loading) return null;
  if (mastery.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Topic mastery</CardTitle>
        <p className="text-xs text-muted-foreground">
          Combined from practice, homework, and tests
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {mastery.slice(0, 5).map((subject) => (
          <SubjectRow key={subject.subjectId} subject={subject} />
        ))}
      </CardContent>
    </Card>
  );
}

interface SubjectRowProps {
  subject: SubjectMastery;
}

function SubjectRow({ subject }: SubjectRowProps) {
  const score = subject.score ?? 0;
  const weakestTopic = subject.topics[0]; // already sorted weakest-first
  const trendIcon = score >= 60 ? TrendingUp : TrendingDown;
  const Trend = trendIcon;
  const tone =
    score >= 75
      ? 'text-emerald-600'
      : score >= 60
        ? 'text-foreground'
        : 'text-destructive';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/student/ai-tutor?subjectId=${subject.subjectId}`}
          className="text-sm font-medium truncate hover:text-primary"
        >
          {subject.subjectName}
        </Link>
        <span className={`text-sm font-medium inline-flex items-center gap-1 ${tone}`}>
          <Trend className="h-3.5 w-3.5" />
          {Math.round(score)}%
        </span>
      </div>
      <Progress value={score} className="h-1.5" />
      {weakestTopic && weakestTopic.score < 60 && (
        <p className="text-xs text-muted-foreground">
          Weakest: <span className="text-foreground">{weakestTopic.topic}</span> ({Math.round(weakestTopic.score)}%)
        </p>
      )}
    </div>
  );
}
