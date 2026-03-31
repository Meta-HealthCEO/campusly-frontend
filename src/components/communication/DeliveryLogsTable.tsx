'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { StatusBadge } from './MessageBadges';
import { formatDate } from '@/lib/utils';
import type { MessageLogEntry, LogRecipient } from './types';

interface DeliveryLogsTableProps {
  logs: MessageLogEntry[];
  loading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getRecipientInfo(recipientId: MessageLogEntry['recipientId']): {
  name: string;
  email: string;
} {
  if (typeof recipientId === 'string') {
    return { name: recipientId, email: '' };
  }
  const r = recipientId as LogRecipient;
  return {
    name: `${r.firstName} ${r.lastName}`.trim(),
    email: r.email,
  };
}

export function DeliveryLogsTable({
  logs, loading, page, totalPages, onPageChange,
}: DeliveryLogsTableProps) {
  if (loading) return <LoadingSpinner size="sm" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Delivery Logs</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No delivery logs available.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const { name, email } = getRecipientInfo(log.recipientId);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{email}</TableCell>
                      <TableCell className="text-sm">{log.channel}</TableCell>
                      <TableCell><StatusBadge status={log.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.sentAt ? formatDate(log.sentAt, 'dd MMM yyyy HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
