'use client';

import type { CareerApplication } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Upload, CheckCircle2, ClipboardCopy } from 'lucide-react';

interface ApplicationTrackerProps {
  applications: CareerApplication[];
  onUpdateStatus: (id: string, status: string) => void;
  onUploadDocument: (id: string) => void;
  onPrefill?: (id: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'default' },
  acknowledged: { label: 'Acknowledged', variant: 'outline' },
  accepted: { label: 'Accepted', variant: 'default' },
  waitlisted: { label: 'Waitlisted', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

const PIPELINE_ORDER: CareerApplication['status'][] = [
  'draft',
  'submitted',
  'acknowledged',
  'accepted',
  'waitlisted',
  'rejected',
];

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };

  // Custom colours for accepted (emerald) and waitlisted (amber)
  let extraClass = '';
  if (status === 'accepted') {
    extraClass = 'bg-emerald-600 text-white';
  } else if (status === 'waitlisted') {
    extraClass = 'bg-amber-500 text-white';
  }

  return (
    <Badge variant={config.variant} className={extraClass}>
      {config.label}
    </Badge>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function ApplicationCard({
  app,
  onUpdateStatus,
  onUploadDocument,
  onPrefill,
}: {
  app: CareerApplication;
  onUpdateStatus: (id: string, status: string) => void;
  onUploadDocument: (id: string) => void;
  onPrefill?: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {app.universityLogo ? (
            <img
              src={app.universityLogo}
              alt={app.universityName ?? 'University'}
              className="h-10 w-10 rounded object-contain shrink-0"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground text-xs font-semibold shrink-0">
              {(app.universityName ?? 'U').charAt(0)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold truncate">
              {app.universityName ?? 'Unknown University'}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {app.programmeName ?? 'No programme'}
            </p>
          </div>

          <StatusBadge status={app.status} />
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {app.applicationReference && (
            <span>Ref: {app.applicationReference}</span>
          )}
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {app.documents.length} document{app.documents.length !== 1 ? 's' : ''}
          </span>
          <span>{formatDate(app.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {app.status === 'draft' && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onUpdateStatus(app.id, 'submitted')}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Mark Submitted
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUploadDocument(app.id)}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            Upload Document
          </Button>
          {onPrefill && (app.status === 'draft' || app.status === 'submitted') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPrefill(app.id)}
            >
              <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
              Pre-fill Data
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function groupByStatus(
  applications: CareerApplication[],
): Map<CareerApplication['status'], CareerApplication[]> {
  const groups = new Map<CareerApplication['status'], CareerApplication[]>();
  for (const app of applications) {
    const list = groups.get(app.status) ?? [];
    list.push(app);
    groups.set(app.status, list);
  }
  return groups;
}

export function ApplicationTracker({
  applications,
  onUpdateStatus,
  onUploadDocument,
  onPrefill,
}: ApplicationTrackerProps) {
  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-sm font-medium">No applications yet</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Start by creating a new application to track your progress.
        </p>
      </div>
    );
  }

  const grouped = groupByStatus(applications);

  return (
    <div className="space-y-8">
      {PIPELINE_ORDER.map((status) => {
        const group = grouped.get(status);
        if (!group || group.length === 0) return null;

        const config = STATUS_CONFIG[status];

        return (
          <section key={status}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold">{config?.label ?? status}</h3>
              <Badge variant="outline" className="text-xs">
                {group.length}
              </Badge>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onUpdateStatus={onUpdateStatus}
                  onUploadDocument={onUploadDocument}
                  onPrefill={onPrefill}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
