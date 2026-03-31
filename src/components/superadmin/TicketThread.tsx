'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatRelativeDate } from '@/lib/utils';
import type { SupportTicket } from '@/types';

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

interface TicketThreadProps {
  ticket: SupportTicket;
  onReply: (message: string, isInternal?: boolean) => Promise<void>;
  onStatusChange: (status: SupportTicket['status']) => Promise<void>;
}

export function TicketThread({ ticket, onReply, onStatusChange }: TicketThreadProps) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const isClosed = ticket.status === 'closed';

  const handleSend = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      await onReply(reply.trim());
      setReply('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="lg:col-span-2 flex flex-col overflow-hidden">
      <CardHeader className="border-b pb-3 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{ticket.ticketNumber}</p>
            <CardTitle className="text-base mt-0.5">{ticket.subject}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ticket.tenantName} · {ticket.category}
              {ticket.assignedTo && (
                <span> · Assigned to {ticket.assignedTo}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={ticket.status}
              onValueChange={(val: unknown) =>
                onStatusChange(val as SupportTicket['status'])
              }
            >
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <span
              className={`text-xs font-semibold capitalize ${PRIORITY_STYLES[ticket.priority]}`}
            >
              {ticket.priority}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto py-4 space-y-3">
        {ticket.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Send the first reply below.
          </p>
        ) : (
          ticket.messages.map((msg) => (
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
                {msg.senderName}
                {msg.createdAt && ` · ${formatRelativeDate(msg.createdAt)}`}
              </span>
            </div>
          ))
        )}
      </CardContent>

      <div className="border-t p-3 space-y-2 shrink-0">
        <Textarea
          placeholder={isClosed ? 'This ticket is closed' : 'Type your reply...'}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
          className="resize-none"
          disabled={isClosed}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!reply.trim() || isClosed || sending}
          >
            <Send className="mr-2 h-3.5 w-3.5" />
            {sending ? 'Sending...' : 'Send Reply'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
