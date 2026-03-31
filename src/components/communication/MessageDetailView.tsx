'use client';

import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, ChannelBadge } from './MessageBadges';
import { DeliveryStatsPanel } from './DeliveryStatsPanel';
import { DeliveryLogsTable } from './DeliveryLogsTable';
import { useMessageDetail } from '@/hooks/useCommunication';
import { formatDate } from '@/lib/utils';
import type { BulkMessageSender } from './types';

interface MessageDetailViewProps {
  messageId: string;
  onBack: () => void;
}

export function MessageDetailView({ messageId, onBack }: MessageDetailViewProps) {
  const {
    message, stats, logs, logsPage, logsTotalPages, loading,
    fetchLogs,
  } = useMessageDetail(messageId);

  useEffect(() => {
    if (messageId) {
      fetchLogs(1);
    }
  }, [messageId, fetchLogs]);

  if (loading) return <LoadingSpinner />;

  if (!message) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-muted-foreground">Message not found.</p>
      </div>
    );
  }

  const senderName = typeof message.sentBy === 'string'
    ? message.sentBy
    : `${(message.sentBy as BulkMessageSender).firstName} ${(message.sentBy as BulkMessageSender).lastName}`.trim();

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Messages
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-lg">{message.subject}</CardTitle>
            <StatusBadge status={message.status} />
            <ChannelBadge channel={message.channel} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Sent by: <span className="font-medium text-foreground">{senderName}</span>
            </span>
            {message.sentAt && (
              <span className="text-muted-foreground">
                {formatDate(message.sentAt, 'dd MMM yyyy HH:mm')}
              </span>
            )}
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Recipients: {message.totalRecipients}</span>
            <span>Delivered: {message.delivered}</span>
            {message.failed > 0 && (
              <span className="text-destructive">Failed: {message.failed}</span>
            )}
          </div>
          <Separator />
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.body}
          </div>
        </CardContent>
      </Card>

      <DeliveryStatsPanel stats={stats} />

      <DeliveryLogsTable
        logs={logs}
        page={logsPage}
        totalPages={logsTotalPages}
        onPageChange={(p) => fetchLogs(p)}
      />
    </div>
  );
}
