'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, ExternalLink, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import type { ContentResourceItem, PaperImportJob } from '@/types';

interface Props {
  job: PaperImportJob;
  sourceUrl: string;
}

export function ResultsList({ job, sourceUrl }: Props) {
  const { getResource } = useContentLibrary();
  const [resources, setResources] = useState<ContentResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fetched = await Promise.all(job.resultResourceIds.map((id) => getResource(id)));
      if (!cancelled) {
        setResources(fetched.filter((r): r is ContentResourceItem => r !== null));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job.resultResourceIds, getResource]);

  if (loading) return <LoadingSpinner />;
  if (resources.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No resources extracted"
        description="The conversion completed but produced no resources. Try a clearer scan."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">{job.source.filename}</p>
            <p className="text-xs text-muted-foreground">{job.source.pageCount} pages</p>
          </div>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Download className="mr-1 h-4 w-4" /> Download original
          </a>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          {resources.length} resource{resources.length === 1 ? '' : 's'} created
        </h3>
        <div className="space-y-2">
          {resources.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{r.type}</Badge>
                    {r.needsReview && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> Needs review
                      </Badge>
                    )}
                    {r.sourceImport && (
                      <Badge variant="outline">
                        Pages {r.sourceImport.pageRange.start}–{r.sourceImport.pageRange.end}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium truncate">{r.title}</p>
                </div>
                <Link
                  href={`/teacher/curriculum/preview/${r.id}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                >
                  Preview <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
