'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Clock, GraduationCap, Target, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudentRecommendations } from '@/hooks/useStudentMastery';
import type { Recommendation, RecommendationKind } from '@/types';

const KIND_ICON: Record<RecommendationKind, typeof Sparkles> = {
  homework_due_soon: Clock,
  test_coming_up: GraduationCap,
  weak_subject: BookOpen,
  weak_topic: Target,
};

const KIND_ACCENT: Record<RecommendationKind, string> = {
  homework_due_soon: 'text-amber-600 dark:text-amber-400',
  test_coming_up: 'text-rose-600 dark:text-rose-400',
  weak_subject: 'text-blue-600 dark:text-blue-400',
  weak_topic: 'text-violet-600 dark:text-violet-400',
};

/**
 * Surfaces the student's adaptive next-steps list — overdue homework, soon-due
 * tests, weak topics, and weak subjects — ranked by urgency. Each card links
 * straight to the relevant action surface.
 */
export function RecommendedWidget() {
  const { recommendations, loading } = useStudentRecommendations();
  const router = useRouter();

  if (loading) return null;
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            Recommended for you
          </CardTitle>
          <Link
            href="/student/ai-tutor"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Open Buddy
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.slice(0, 5).map((rec, i) => (
          <RecommendationCard
            key={i}
            rec={rec}
            onAction={() => router.push(rec.actionHref)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface RecommendationCardProps {
  rec: Recommendation;
  onAction: () => void;
}

function RecommendationCard({ rec, onAction }: RecommendationCardProps) {
  const Icon = KIND_ICON[rec.kind];
  const accent = KIND_ACCENT[rec.kind];

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3 transition hover:bg-accent/50">
      <div className={`mt-0.5 ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{rec.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{rec.subtitle}</p>
      </div>
      <Button size="sm" variant="ghost" onClick={onAction} className="shrink-0">
        {rec.actionLabel ?? 'Go'}
      </Button>
    </div>
  );
}
