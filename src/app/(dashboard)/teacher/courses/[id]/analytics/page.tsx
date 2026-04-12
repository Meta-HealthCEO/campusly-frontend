'use client';

import { useParams, useRouter } from 'next/navigation';
import { RefreshCw, ArrowLeft, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCardsSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsStatCards } from '@/components/courses/AnalyticsStatCards';
import { LessonDropOffChart } from '@/components/courses/LessonDropOffChart';
import { ClassBreakdownTable } from '@/components/courses/ClassBreakdownTable';
import { useCourseAnalytics } from '@/hooks/useCourseAnalytics';
import { ROUTES } from '@/lib/constants';

export default function CourseAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { data, loading, refreshing, refresh } = useCourseAnalytics(courseId);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Course Analytics"
          description="Enrolment, completion, and engagement metrics"
        />
        <StatCardsSkeleton count={4} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Course Analytics"
          description="Enrolment, completion, and engagement metrics"
        />
        <EmptyState
          icon={BarChart3}
          title="Analytics Unavailable"
          description="We couldn't load analytics for this course right now. Please refresh and try again."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Analytics"
        description="Enrolment, completion, and engagement metrics"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(ROUTES.TEACHER_COURSE_EDIT(courseId))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <AnalyticsStatCards data={data} />

      <Card>
        <CardHeader>
          <CardTitle>Lesson Drop-off</CardTitle>
        </CardHeader>
        <CardContent>
          <LessonDropOffChart data={data.perLessonDropOff} />
        </CardContent>
      </Card>

      {data.perClassBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per-Class Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassBreakdownTable data={data.perClassBreakdown} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
