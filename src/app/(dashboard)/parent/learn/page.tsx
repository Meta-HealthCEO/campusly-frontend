'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Target, TrendingUp, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { MasteryProgressBar } from '@/components/content/MasteryProgressBar';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useStudentLearning } from '@/hooks/useStudentLearning';
import type { Student, StudentMasteryItem } from '@/types';

function resolveNodeTitle(node: StudentMasteryItem['curriculumNodeId']): string {
  if (!node) return 'Unknown Topic';
  return typeof node === 'string' ? node : node.title;
}

function getStudentName(student: Student): string {
  if (student.firstName || student.lastName) {
    return `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim();
  }
  if (student.user) {
    return `${student.user.firstName ?? ''} ${student.user.lastName ?? ''}`.trim();
  }
  return 'Your Child';
}

export default function ParentLearnPage() {
  const { children, loading: parentLoading } = useCurrentParent();
  const { mastery, masteryLoading, fetchMyMastery } = useStudentLearning();
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);

  // Select first child once loaded
  useEffect(() => {
    if (!parentLoading && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    }
  }, [parentLoading, children, selectedChild]);

  // Fetch mastery for selected child
  useEffect(() => {
    if (selectedChild?.id) {
      fetchMyMastery(selectedChild.id);
    }
  }, [selectedChild?.id, fetchMyMastery]);

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

  if (parentLoading) return <LoadingSpinner />;

  if (children.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No children found"
        description="No student records are linked to your account."
      />
    );
  }

  const childName = selectedChild ? getStudentName(selectedChild) : 'Child';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${childName}'s Learning Progress`}
        description="View your child's mastery across curriculum topics"
      />

      {/* Child selector (if multiple children) */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((child: Student) => (
            <Button
              key={child.id}
              variant={selectedChild?.id === child.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChild(child)}
            >
              {getStudentName(child)}
            </Button>
          ))}
        </div>
      )}

      {masteryLoading ? (
        <LoadingSpinner />
      ) : (
        <>
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
              description={`${childName} hasn't completed any learning activities yet.`}
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
                      {item.attemptCount} attempt{item.attemptCount !== 1 ? 's' : ''}{' '}
                      &middot; {item.correctCount} correct
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
        </>
      )}
    </div>
  );
}
