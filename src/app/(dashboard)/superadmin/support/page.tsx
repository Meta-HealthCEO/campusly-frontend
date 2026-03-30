'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { mockSupportTickets } from '@/lib/mock-data';
import { cn, formatRelativeDate } from '@/lib/utils';
import type { SupportTicket } from '@/types';
import { toast } from 'sonner';

const STATUS_STYLES: Record<SupportTicket['status'], string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-700',
};

const PRIORITY_STYLES: Record<SupportTicket['priority'], string> = {
  low: 'text-gray-500',
  normal: 'text-blue-500',
  high: 'text-amber-500',
  urgent: 'text-red-500',
};

export default function SuperAdminSupportPage() {
  const [selected, setSelected] = useState<SupportTicket>(mockSupportTickets[0]);
  const [reply, setReply] = useState('');

  const handleSend = () => {
    if (!reply.trim()) return;
    toast.success('Reply sent');
    setReply('');
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Support" description="Manage tenant support tickets" />

      <div className="grid gap-4 lg:grid-cols-3 min-h-0 flex-1" style={{ minHeight: '500px' }}>
        {/* Ticket list */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {mockSupportTickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelected(ticket)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors w-full',
                selected.id === ticket.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-tight line-clamp-2">{ticket.subject}</p>
                <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{ticket.tenantName}</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs font-medium capitalize ${PRIORITY_STYLES[ticket.priority]}`}>
                  {ticket.priority}
                </span>
                <span className="text-xs text-muted-foreground">{formatRelativeDate(ticket.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Ticket detail */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <CardHeader className="border-b pb-3 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground font-mono">{selected.ticketNumber}</p>
                <CardTitle className="text-base mt-0.5">{selected.subject}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.tenantName} · {selected.category}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[selected.status]}`}>
                  {selected.status.replace('_', ' ')}
                </span>
                <span className={`text-xs font-semibold capitalize ${PRIORITY_STYLES[selected.priority]}`}>
                  {selected.priority}
                </span>
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto py-4 space-y-3">
            {selected.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col gap-1 max-w-[85%]',
                  msg.senderRole === 'support' ? 'ml-auto items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-xl px-4 py-2.5 text-sm',
                    msg.senderRole === 'support'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {msg.body}
                </div>
                <span className="text-xs text-muted-foreground">
                  {msg.senderName} · {formatRelativeDate(msg.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>

          {/* Reply form */}
          <div className="border-t p-3 space-y-2 shrink-0">
            <Textarea
              placeholder="Type your reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSend} disabled={!reply.trim()}>
                <Send className="mr-2 h-3.5 w-3.5" /> Send Reply
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
