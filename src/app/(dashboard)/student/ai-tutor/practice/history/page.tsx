'use client';

import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePracticeHistory } from '@/hooks/useStudentMastery';

function scoreTone(pct: number): 'default' | 'secondary' | 'destructive' {
  if (pct >= 75) return 'default';
  if (pct >= 50) return 'secondary';
  return 'destructive';
}

export default function PracticeHistoryPage() {
  const { history, total, page, limit, setPage, loading } = usePracticeHistory();

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/student/ai-tutor/practice"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to practice
      </Link>

      <PageHeader title="Practice history" description={`${total} past session${total === 1 ? '' : 's'}`} />

      {loading ? (
        <LoadingSpinner />
      ) : history.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No practice yet"
          description="Generate your first set of practice questions to see them here."
          action={
            <Link href="/student/ai-tutor/practice">
              <Button>Start practising</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {history.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{item.topic}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {item.subjectName} - Grade {item.grade}
                      </p>
                    </div>
                    <Badge variant={scoreTone(item.percentage)} className="shrink-0">
                      {item.score} / {item.totalMarks} ({item.percentage}%)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                  {item.completedAt
                    ? `Completed ${new Date(item.completedAt).toLocaleDateString()}`
                    : 'Not yet completed'}
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
