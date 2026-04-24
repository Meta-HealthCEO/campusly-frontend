'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, MessageCircle, Smartphone } from 'lucide-react';
import type { MessageLogEntry, LogStatus, LogRecipient } from '@/components/communication/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkId: string | null;
  messageSubject?: string;
  loadLogs: (bulkId: string) => Promise<MessageLogEntry[]>;
}

type FilterKey = 'all' | 'sent' | 'failed' | 'retrying';

function statusBadgeVariant(
  status: LogStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'failed') return 'destructive';
  if (status === 'sent' || status === 'delivered' || status === 'read') return 'default';
  return 'secondary';
}

function channelIcon(channel: string) {
  if (channel === 'email') return <Mail className="h-3 w-3" />;
  if (channel === 'whatsapp') return <MessageCircle className="h-3 w-3" />;
  return <Smartphone className="h-3 w-3" />;
}

function recipientName(recipientId: MessageLogEntry['recipientId']): string {
  if (typeof recipientId === 'string') return recipientId || '—';
  const r = recipientId as LogRecipient;
  const full = [r.firstName, r.lastName].filter(Boolean).join(' ');
  return full || r.email || '—';
}

function recipientEmail(recipientId: MessageLogEntry['recipientId']): string | undefined {
  if (typeof recipientId === 'string') return undefined;
  return (recipientId as LogRecipient).email || undefined;
}

function logTimestamp(log: MessageLogEntry): string {
  const ts = log.readAt ?? log.deliveredAt ?? log.sentAt ?? log.createdAt;
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export function DeliveryDashboard({
  open,
  onOpenChange,
  bulkId,
  messageSubject,
  loadLogs,
}: Props) {
  const [logs, setLogs] = useState<MessageLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  useEffect(() => {
    if (!open || !bulkId) return;
    let cancelled = false;
    setLoading(true);
    setLogs([]);
    loadLogs(bulkId)
      .then((rows) => { if (!cancelled) setLogs(rows); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, bulkId, loadLogs]);

  const counts: Record<FilterKey, number> = {
    all: logs.length,
    sent: logs.filter(
      (l) => l.status === 'sent' || l.status === 'delivered' || l.status === 'read',
    ).length,
    failed: logs.filter((l) => l.status === 'failed').length,
    retrying: logs.filter((l) => l.status === 'retrying' || l.status === 'queued').length,
  };

  const filtered = logs.filter((l) => {
    if (filter === 'sent') return l.status === 'sent' || l.status === 'delivered' || l.status === 'read';
    if (filter === 'failed') return l.status === 'failed';
    if (filter === 'retrying') return l.status === 'retrying' || l.status === 'queued';
    return true;
  });

  const filterLabels: Record<FilterKey, string> = {
    all: 'All',
    sent: 'Delivered',
    failed: 'Failed',
    retrying: 'Pending',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">
            Delivery details{messageSubject ? ` — ${messageSubject}` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 pt-1 pb-2">
          {(['all', 'sent', 'failed', 'retrying'] as FilterKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={[
                'text-xs rounded-md px-3 py-1 border transition-colors',
                filter === k
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {filterLabels[k]} ({counts[k]})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {logs.length === 0 ? 'No delivery records found.' : 'No records match this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Recipient</th>
                    <th className="text-left px-3 py-2 font-medium">Channel</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 max-w-[180px]">
                        <div className="font-medium truncate">{recipientName(log.recipientId)}</div>
                        {recipientEmail(log.recipientId) && (
                          <div className="text-xs text-muted-foreground truncate">
                            {recipientEmail(log.recipientId)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                          {channelIcon(log.channel)}
                          {log.channel}
                        </div>
                      </td>
                      <td className="px-3 py-2 space-y-1">
                        <Badge
                          variant={statusBadgeVariant(log.status)}
                          className="text-xs capitalize"
                        >
                          {log.status}
                        </Badge>
                        {log.error && (
                          <div
                            className="text-xs text-destructive truncate max-w-[200px]"
                            title={log.error}
                          >
                            {log.error}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {logTimestamp(log)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
