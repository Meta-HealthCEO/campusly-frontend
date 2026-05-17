'use client';

import Link from 'next/link';
import { BookOpen, ClipboardList, FileText, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatCard } from '@/components/shared/StatCard';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { JoinClassCard } from '@/components/student/JoinClassCard';
import { RecommendedWidget } from '@/components/student/RecommendedWidget';
import { MasteryWidget } from '@/components/student/MasteryWidget';

export default function StudentDashboard() {
  const { dashboard, loading, refresh } = useStudentDashboard();
  const { student } = useCurrentStudent();
  if (loading || !dashboard) return <LoadingSpinner />;

  const firstName =
    student?.user?.firstName ?? student?.firstName ?? 'Student';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}!`}
        description={new Date().toLocaleDateString('en-ZA', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      />

      <JoinClassCard onJoined={refresh} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Most recent lesson</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.recentLesson ? (
              <Link
                href={`/student/lessons/${dashboard.recentLesson.id}`}
                className="block space-y-1 group"
              >
                <p className="font-medium truncate group-hover:text-primary">
                  {dashboard.recentLesson.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dashboard.recentLesson.subject}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(dashboard.recentLesson.scheduledDate).toLocaleDateString()}
                </p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No lessons yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Next homework</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.nextHomework ? (
              <Link
                href={`/student/homework/${dashboard.nextHomework.id}`}
                className="block space-y-1 group"
              >
                <p className="font-medium truncate group-hover:text-primary">
                  {dashboard.nextHomework.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dashboard.nextHomework.subject}
                </p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Due{' '}
                  {new Date(dashboard.nextHomework.dueAt).toLocaleDateString()}
                </p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">All caught up.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Next test</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.nextTest ? (
              <Link
                href={`/student/tests/${dashboard.nextTest.paperId}`}
                className="block space-y-1 group"
              >
                <p className="font-medium truncate group-hover:text-primary">
                  {dashboard.nextTest.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dashboard.nextTest.subject}
                </p>
                {dashboard.nextTest.dueAt && (
                  <p className="text-xs text-muted-foreground">
                    Due {new Date(dashboard.nextTest.dueAt).toLocaleDateString()}
                  </p>
                )}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No tests scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <StatCard
          title="Lessons this week"
          value={String(dashboard.counts.lessonsThisWeek)}
          icon={BookOpen}
        />
        <StatCard
          title="Homework due"
          value={String(dashboard.counts.homeworkDueThisWeek)}
          icon={ClipboardList}
        />
        <StatCard
          title="Tests scheduled"
          value={String(dashboard.counts.testsScheduled)}
          icon={FileText}
        />
        <StatCard
          title="Overdue"
          value={String(dashboard.counts.homeworkOverdue)}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecommendedWidget />
        <MasteryWidget />
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-center justify-between p-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Need help with something?</p>
              <p className="text-xs text-muted-foreground">
                Your AI Tutor can explain any topic.
              </p>
            </div>
          </div>
          <Link href="/student/ai-tutor">
            <button className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Open AI Tutor
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
