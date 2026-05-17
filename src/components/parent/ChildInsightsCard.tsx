'use client';

import Link from 'next/link';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParentChildInsights } from '@/hooks/useParentChildInsights';

interface ChildInsightsCardProps {
  studentId: string;
  childFirstName: string;
}

/**
 * Privacy-respecting parent view of a child's current weak spots. Pulls from
 * the same combined-signal mastery service the student sees, but parents
 * never see the child's chat content with Buddy.
 */
export function ChildInsightsCard({ studentId, childFirstName }: ChildInsightsCardProps) {
  const { insights, loading } = useParentChildInsights(studentId);

  if (loading) return null;
  if (!insights) return null;

  const weakSubjects = insights.mastery.filter((s) => s.score != null && s.score < 60);
  const allTopics = insights.mastery
    .flatMap((s) => s.topics.map((t) => ({ ...t, subjectName: s.subjectName })))
    .filter((t) => t.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  if (weakSubjects.length === 0 && allTopics.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Where {childFirstName} could use support
        </CardTitle>
        <CardDescription>
          Combined from practice attempts, homework, and tests. Your child&apos;s chats with Buddy are private.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {weakSubjects.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Subjects to support
            </p>
            {weakSubjects.slice(0, 3).map((s) => (
              <div key={s.subjectId} className="flex items-center justify-between gap-2 rounded-md border bg-card p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.subjectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(s.score ?? 0)}% across {s.signalCount} data point
                    {s.signalCount === 1 ? '' : 's'}
                  </p>
                </div>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
            ))}
          </div>
        )}

        {allTopics.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Specific topics to revisit
            </p>
            <ul className="space-y-1">
              {allTopics.map((t, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    <span className="font-medium">{t.topic}</span>{' '}
                    <span className="text-xs text-muted-foreground">({t.subjectName})</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{Math.round(t.score)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href="/parent/ai-assistant">
          <Button variant="outline" className="w-full inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Discuss with the AI assistant
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
