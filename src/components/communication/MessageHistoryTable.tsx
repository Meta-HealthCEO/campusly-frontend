'use client';

import { Mail, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge, ChannelBadge } from './MessageBadges';
import { formatDate } from '@/lib/utils';
import type { BulkMessage, BulkMessageSender } from './types';

interface MessageHistoryTableProps {
  messages: BulkMessage[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetail: (message: BulkMessage) => void;
}

function getSenderName(sentBy: BulkMessage['sentBy']): string {
  if (typeof sentBy === 'string') return sentBy;
  const sender = sentBy as BulkMessageSender;
  return `${sender.firstName} ${sender.lastName}`.trim() || sender.email;
}

export function MessageHistoryTable({
  messages, loading, page, totalPages, onPageChange, onViewDetail,
}: MessageHistoryTableProps) {
  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sent Messages</CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No messages sent"
            description="Messages you send will appear here."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {msg.subject}
                    </TableCell>
                    <TableCell><ChannelBadge channel={msg.channel} /></TableCell>
                    <TableCell>{msg.totalRecipients}</TableCell>
                    <TableCell>{msg.delivered}</TableCell>
                    <TableCell><StatusBadge status={msg.status} /></TableCell>
                    <TableCell className="text-sm">
                      {getSenderName(msg.sentBy)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {msg.sentAt ? formatDate(msg.sentAt, 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => onViewDetail(msg)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
