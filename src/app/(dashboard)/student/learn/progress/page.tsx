'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MasteryProgressBar } from '@/components/content/MasteryProgressBar';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useStudentLearning } from '@/hooks/useStudentLearning';
import type { StudentMasteryItem } from '@/types';

function resolveNodeTitle(node: StudentMasteryItem['curriculumNodeId']): string {
  if (!node) return 'Unknown Topic';
  return typeof node === 'string' ? node : node.title;
}

export default function StudentProgressPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const { mastery, masteryLoading, fetchMyMastery } = useStudentLearning();

  useEffect(() => {
    if (student?.id) {
      fetchMyMastery(student.id);
    }
  }, [student?.id, fetchMyMastery]);

  // Summary stats
  const { avgMastery, totalAttempts } = useMemo(() => {
    if (mastery.length === 0) return { avgMastery: 0, totalAttempts: 0 };

    const sum = mastery.reduce(
      (acc: number, item: StudentMasteryItem) => acc + item.masteryLevel,
      0,
    );
    const attempts = mastery.reduce(
      (acc: number, item: StudentMasteryItem) => acc + item.attemptCount,
      0,
    );
    return {
      avgMastery: Math.round(sum / mastery.length),
      totalAttempts: attempts,
    };
  }, [mastery]);

  if (studentLoading || masteryLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/student/learn">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <PageHeader
            title="My Progress"
            description="Track your mastery across curriculum topics"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Target className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Mastery</p>
              <p className="text-2xl font-bold">{avgMastery}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Attempts</p>
              <p className="text-2xl font-bold">{totalAttempts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Topics Studied</p>
              <p className="text-2xl font-bold">{mastery.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mastery per node */}
      {mastery.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No mastery data yet"
          description="Complete lessons and activities to start building your mastery profile."
          action={
            <Link href="/student/learn">
              <Button>Browse Lessons</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {mastery.map((item: StudentMasteryItem) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium truncate">
                  {resolveNodeTitle(item.curriculumNodeId)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {item.attemptCount} attempt{item.attemptCount !== 1 ? 's' : ''} &middot;{' '}
                  {item.correctCount} correct
                </p>
              </CardHeader>
              <CardContent>
                <MasteryProgressBar
                  masteryLevel={item.masteryLevel}
                  label="Mastery"
                  showBreakdown
                  cognitiveBreakdown={item.cognitiveBreakdown}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
