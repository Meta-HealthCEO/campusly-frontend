'use client';

import type { VideoProgress } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { History, CheckCircle2 } from 'lucide-react';

interface WatchHistoryTableProps {
  history: VideoProgress[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function WatchHistoryTable({ history }: WatchHistoryTableProps) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No watch history"
        description="Videos you watch will appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Video</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Last Watched</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((item) => {
            const pct = Math.min(100, Math.round(item.progressPercent));
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium truncate max-w-[180px] text-sm">
                  {item.videoId}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  {item.isCompleted ? (
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit text-xs">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-700">Yes</span>
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(item.lastWatchedAt)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
