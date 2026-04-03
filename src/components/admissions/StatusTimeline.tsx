'use client';

import { CheckCircle, Clock } from 'lucide-react';
import type { AdmissionStatusHistoryEntry } from '@/types/admissions';

interface Props {
  history: AdmissionStatusHistoryEntry[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export function StatusTimeline({ history }: Props) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No status history available.</p>;
  }

  return (
    <div className="relative space-y-4 pl-6">
      <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-border" />
      {history.map((entry: AdmissionStatusHistoryEntry, idx: number) => (
        <div key={`${entry.status}-${idx}`} className="relative flex items-start gap-3">
          <div className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-background border">
            {idx === history.length - 1 ? (
              <Clock className="h-3 w-3 text-primary" />
            ) : (
              <CheckCircle className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{statusLabel(entry.status)}</p>
            <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
            {entry.notes && (
              <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
