'use client';

import { useRouter } from 'next/navigation';
import { FileText, Clock, CheckCircle2, Hourglass } from 'lucide-react';
import { useStudentAssignedPapers } from '@/hooks/useStudentTests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import type { AssignedPaperSummary, SubmissionStatus } from '@/types/papers';

interface StatusInfo {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  ctaLabel: string;
  ctaDisabled: boolean;
}

function statusInfo(status: SubmissionStatus): StatusInfo {
  switch (status) {
    case 'in_progress':
      return { label: 'In progress', variant: 'secondary', ctaLabel: 'Continue', ctaDisabled: false };
    case 'submitted':
      return { label: 'Submitted', variant: 'outline', ctaLabel: 'Submitted', ctaDisabled: true };
    case 'graded':
      return { label: 'Marked', variant: 'default', ctaLabel: 'View result', ctaDisabled: false };
    case 'published':
      return { label: 'On gradebook', variant: 'default', ctaLabel: 'View result', ctaDisabled: false };
    default:
      return { label: 'Available', variant: 'secondary', ctaLabel: 'Start test', ctaDisabled: false };
  }
}

export default function StudentTestsPage() {
  const router = useRouter();
  const { papers, loading } = useStudentAssignedPapers();

  if (loading) return <LoadingSpinner />;

  if (papers.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tests"
          description="Digital tests assigned to your class. Open one to take it on this device."
        />
        <EmptyState
          icon={FileText}
          title="No tests right now"
          description="When your teacher assigns a digital test it will show up here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tests"
        description="Digital tests assigned to your class. Open one to take it on this device."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {papers.map((p) => (
          <PaperCard
            key={`${p.paperId}-${p.assignmentId}`}
            paper={p}
            onOpen={() => router.push(`/student/tests/${p.paperId}`)}
          />
        ))}
      </div>
    </div>
  );
}

interface CardProps {
  paper: AssignedPaperSummary;
  onOpen: () => void;
}

function PaperCard({ paper, onOpen }: CardProps) {
  const info = statusInfo(paper.submissionStatus);
  const meta = [
    paper.subjectName,
    paper.gradeName,
    `Term ${paper.term}`,
    `${paper.totalMarks} marks`,
    `${paper.duration} min`,
  ].filter(Boolean).join(' \u00B7 ');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base truncate">{paper.title}</CardTitle>
          <Badge variant={info.variant} className="capitalize shrink-0">
            {info.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{meta}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {paper.releaseAt && (
            <span className="inline-flex items-center gap-1">
              <Hourglass className="h-3 w-3" /> Opens {new Date(paper.releaseAt).toLocaleString()}
            </span>
          )}
          {paper.dueAt && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Due {new Date(paper.dueAt).toLocaleString()}
            </span>
          )}
          {paper.submittedAt && (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Submitted {new Date(paper.submittedAt).toLocaleString()}
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={onOpen}
          disabled={info.ctaDisabled}
          variant={paper.submissionStatus === 'not_started' ? 'default' : 'outline'}
        >
          {info.ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
