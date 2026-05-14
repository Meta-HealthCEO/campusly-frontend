'use client';

import { use, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useStudentMarking } from '@/hooks/useStudentMarking';
import type { StudentMarkingDetail } from '@/hooks/useStudentMarking';
import { StudentMarkingReview } from '@/components/student/StudentMarkingReview';
import { StudentTestTakeView } from '@/components/student/StudentTestTakeView';
import { useStudentAssignedPapers } from '@/hooks/useStudentTests';

export default function StudentTestPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = use(params);
  const { getMarkingByPaper, getMarking } = useStudentMarking();
  const { papers, loading: papersLoading } = useStudentAssignedPapers();
  const [marking, setMarking] = useState<StudentMarkingDetail | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setResolving(true);
      const summary = await getMarkingByPaper(paperId);
      if (cancelled) return;
      if (summary) {
        const detail = await getMarking(summary.id);
        if (!cancelled) setMarking(detail);
      }
      if (!cancelled) setResolving(false);
    })();
    return () => { cancelled = true; };
  }, [paperId, getMarkingByPaper, getMarking]);

  if (resolving || papersLoading) return <LoadingSpinner />;

  // State 1: Issued — show the review
  if (marking) return <StudentMarkingReview marking={marking} />;

  // State 2: Submitted but not issued — show waiting card
  const paperEntry = papers.find((p) => p.paperId === paperId);
  if (
    paperEntry?.submissionStatus === 'submitted' ||
    paperEntry?.submissionStatus === 'graded' ||
    paperEntry?.submissionStatus === 'published'
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submitted — awaiting result</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {paperEntry.submittedAt
              ? `Submitted on ${new Date(paperEntry.submittedAt).toLocaleDateString()}. `
              : ''}
            Your teacher will mark and issue your result soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  // State 3: Not yet taken — show test-taking UI
  return <StudentTestTakeView paperId={paperId} />;
}
