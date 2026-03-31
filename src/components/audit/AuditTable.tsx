'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AuditActionBadge } from './AuditActionBadge';
import { AuditChangesExpander } from './AuditChangesExpander';
import { useAuditStore } from '@/stores/useAuditStore';
import type { AuditLog } from '@/stores/useAuditStore';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getUserName(log: AuditLog): string {
  if (!log.userId) return 'Unknown';
  return `${log.userId.firstName} ${log.userId.lastName}`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function AuditTable() {
  const { logs, total, loading, error, filters, setFilter, fetchLogs } =
    useAuditStore();

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handlePrevPage = () => {
    if (page > 1) {
      setFilter({ page: page - 1 });
      fetchLogs();
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setFilter({ page: page + 1 });
      fetchLogs();
    }
  };

  if (loading && logs.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={fetchLogs}>
          Retry
        </Button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No audit log entries found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log._id}>
                <TableCell className="text-xs">
                  {formatTimestamp(log.createdAt)}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{getUserName(log)}</p>
                    {log.userId?.email && (
                      <p className="text-xs text-muted-foreground">
                        {log.userId.email}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <AuditActionBadge action={log.action} />
                </TableCell>
                <TableCell className="text-sm">{log.entity}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {log.entityId ?? '-'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {log.ipAddress ?? '-'}
                </TableCell>
                <TableCell>
                  <AuditChangesExpander changes={log.changes} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} result{total !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
