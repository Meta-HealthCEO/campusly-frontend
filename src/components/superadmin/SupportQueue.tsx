'use client';

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
  urgent: 'text-destructive',
};

interface SupportQueueProps {
  tickets: SupportTicket[];
  selectedId: string;
  onSelect: (ticket: SupportTicket) => void;
  loading?: boolean;
}

export function SupportQueue({ tickets, selectedId, onSelect, loading }: SupportQueueProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 overflow-y-auto pr-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2 mb-1" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        No tickets found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1">
      {tickets.map((ticket) => (
        <button
          key={ticket.id}
          onClick={() => onSelect(ticket)}
          className={cn(
            'rounded-lg border p-3 text-left transition-colors w-full',
            selectedId === ticket.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight line-clamp-2">{ticket.subject}</p>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}
            >
              {ticket.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{ticket.tenantName}</p>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xs font-medium capitalize ${PRIORITY_STYLES[ticket.priority]}`}>
              {ticket.priority}
            </span>
            {ticket.createdAt && (
              <span className="text-xs text-muted-foreground">
                {formatRelativeDate(ticket.createdAt)}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
