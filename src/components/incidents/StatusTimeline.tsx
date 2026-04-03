'use client';

import { IncidentStatusBadge } from './IncidentStatusBadge';
import type { StatusHistoryEntry } from '@/types';

interface StatusTimelineProps {
  history: StatusHistoryEntry[];
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-3">
      {history.map((entry, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
            {idx < history.length - 1 && (
              <div className="w-px flex-1 bg-border min-h-[20px]" />
            )}
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-center gap-2">
              <IncidentStatusBadge status={entry.status} />
              <span className="text-xs text-muted-foreground">
                {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {entry.changedBy && (
              <p className="text-xs text-muted-foreground mt-0.5">
                By {entry.changedBy.firstName} {entry.changedBy.lastName}
              </p>
            )}
            {entry.notes && (
              <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
