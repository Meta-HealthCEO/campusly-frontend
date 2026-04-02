'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, AlertTriangle, Target } from 'lucide-react';
import { useCurrentStudent } from '@/hooks/useCurrentStudent';
import { useSubjectAdvisor } from '@/hooks/useSubjectAdvisor';
import { useAptitude } from '@/hooks/useAptitude';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SubjectAdvisorResults } from '@/components/careers/SubjectAdvisorResults';
import { SubjectImpactWarning } from '@/components/careers/SubjectImpactWarning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SubjectChoiceAdvisorPage() {
  const { student, loading: studentLoading } = useCurrentStudent();
  const {
    result,
    loading: advisorLoading,
    error,
  } = useSubjectAdvisor(student?.id ?? '');
  const {
    result: aptitudeResult,
    fetchResults,
  } = useAptitude();

  useEffect(() => {
    if (student?.id) {
      fetchResults(student.id);
    }
  }, [student?.id, fetchResults]);

  if (studentLoading || advisorLoading) {
    return <LoadingSpinner />;
  }

  const performanceEntries = result?.currentPerformance
    ? Object.entries(result.currentPerformance)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subject Choice Advisor"
        description="Get recommendations for your Grade 10 subject selection"
      />

      {/* Aptitude test prompt or result */}
      {!aptitudeResult ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
            <AlertTriangle className="h-8 w-8 text-muted-foreground shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="font-medium">Aptitude Test Not Completed</p>
              <p className="text-sm text-muted-foreground">
                Take the Aptitude Test first to get personalized recommendations
              </p>
            </div>
            <Button asChild>
              <Link href="/student/careers/aptitude">Take Aptitude Test</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Target className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm">
              Your top aptitude cluster:{' '}
              <Badge variant="secondary">{aptitudeResult.clusters?.[0]?.name ?? 'N/A'}</Badge>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current performance */}
      {performanceEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5" />
              Current Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
              {performanceEntries.map(([subject, percentage]: [string, number]) => (
                <div
                  key={subject}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <span className="text-sm truncate">{subject}</span>
                  <Badge variant="outline" className="ml-2 shrink-0">
                    {percentage}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {result?.warnings && (
        <SubjectImpactWarning warnings={result.warnings} />
      )}

      {/* Recommendations */}
      {result?.recommendations && result.recommendations.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recommended Subject Combinations</h2>
          <SubjectAdvisorResults recommendations={result.recommendations} />
        </div>
      ) : !error ? (
        <EmptyState
          icon={BookOpen}
          title="No Recommendations Yet"
          description="Subject recommendations will appear once your performance data and aptitude results are available."
        />
      ) : (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to Load Recommendations"
          description={error}
        />
      )}
    </div>
  );
}
