'use client';

import { useState } from 'react';
import { CalendarClock, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChannelBadge } from './MessageBadges';
import type { BulkMessage } from './types';

interface ScheduledMessagesListProps {
  messages: BulkMessage[];
  loading: boolean;
  onCancel: (id: string) => Promise<boolean>;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day} at ${h}:${min}`;
}

export function ScheduledMessagesList({ messages, loading, onCancel }: ScheduledMessagesListProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await onCancel(id);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-amber-600" />
          Scheduled Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No Scheduled Messages"
            description="Messages you schedule for later will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium text-muted-foreground">Subject</th>
                  <th className="pb-2 text-left font-medium text-muted-foreground hidden sm:table-cell">
                    Channel
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground hidden sm:table-cell">
                    Recipients
                  </th>
                  <th className="pb-2 text-left font-medium text-muted-foreground">Scheduled For</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium truncate max-w-[160px]">{msg.subject}</p>
                    </td>
                    <td className="py-3 pr-4 hidden sm:table-cell">
                      <ChannelBadge channel={msg.channel} />
                    </td>
                    <td className="py-3 pr-4 hidden sm:table-cell text-muted-foreground">
                      {msg.totalRecipients} recipient{msg.totalRecipients !== 1 ? 's' : ''}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {msg.scheduledFor ? formatDateTime(msg.scheduledFor) : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={cancellingId === msg.id}
                        onClick={() => handleCancel(msg.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {cancellingId === msg.id ? 'Cancelling…' : 'Cancel'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
