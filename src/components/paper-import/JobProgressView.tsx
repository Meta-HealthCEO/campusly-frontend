'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PaperImportJob } from '@/types';

const STAGE_LABEL: Record<PaperImportJob['progress']['stage'], string> = {
  uploading: 'Preparing pages',
  segmenting: 'Detecting resource boundaries',
  transcribing: 'Transcribing pages',
  enhancing: 'Adding answers, hints, explanations',
  finalising: 'Saving resources',
};

interface Props {
  job: PaperImportJob;
  onCancel: () => void;
}

export function JobProgressView({ job, onCancel }: Props) {
  const pct =
    job.progress.pagesTotal > 0
      ? Math.round((job.progress.pagesDone / job.progress.pagesTotal) * 100)
      : 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{STAGE_LABEL[job.progress.stage]}</p>
            <p className="text-xs text-muted-foreground truncate">{job.progress.message}</p>
          </div>
          <Badge variant="outline">{job.status}</Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Page {job.progress.pagesDone} of {job.progress.pagesTotal || '—'}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          You can leave this page — we&apos;ll save the results to your{' '}
          <Link href="/teacher/curriculum/import/jobs" className="underline">
            Imports
          </Link>
          .
        </p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
