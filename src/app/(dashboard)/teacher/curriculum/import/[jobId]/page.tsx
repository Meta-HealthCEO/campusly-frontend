'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ChevronLeft, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { JobProgressView } from '@/components/paper-import/JobProgressView';
import { ResultsList } from '@/components/paper-import/ResultsList';
import { usePaperImport } from '@/hooks/usePaperImport';
import { usePaperImportPoll } from '@/hooks/usePaperImportPoll';
import { cn } from '@/lib/utils';

export default function ImportJobPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const { cancelJob, sourceUrl } = usePaperImport();
  const { job } = usePaperImportPoll(jobId);

  if (!job) return <LoadingSpinner />;

  async function handleCancel() {
    if (!confirm('Cancel this conversion?')) return;
    await cancelJob(jobId);
    toast.success('Conversion cancelled');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/teacher/curriculum/import/jobs"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <PageHeader title="Import status" />
        </div>
      </div>

      {(job.status === 'pending' || job.status === 'running') && (
        <JobProgressView job={job} onCancel={handleCancel} />
      )}

      {job.status === 'completed' && (
        <ResultsList job={job} sourceUrl={sourceUrl(jobId)} />
      )}

      {job.status === 'failed' && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h3 className="font-semibold">Conversion failed</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {job.error?.message ?? 'Something went wrong during conversion.'}
            </p>
            <Link
              href="/teacher/curriculum/import"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              <RotateCcw className="mr-1 h-4 w-4" /> Start over
            </Link>
          </CardContent>
        </Card>
      )}

      {job.status === 'cancelled' && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Badge variant="outline">Cancelled</Badge>
            <p className="text-sm text-muted-foreground">This conversion was cancelled.</p>
            <Link
              href="/teacher/curriculum/import"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Start a new import
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
