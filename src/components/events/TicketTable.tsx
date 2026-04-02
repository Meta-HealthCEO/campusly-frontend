'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ticket, XCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { EventTicket, UserRef } from './types';

interface TicketTableProps {
  tickets: EventTicket[];
  loading: boolean;
  onCancel: (ticketId: string) => Promise<void>;
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  used: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-destructive/10 text-destructive',
};

function getUserName(user: UserRef | string): string {
  if (typeof user === 'string') return user;
  return `${user.firstName} ${user.lastName}`;
}

export function TicketTable({ tickets, loading, onCancel }: TicketTableProps) {
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (loading) return <LoadingSpinner />;

  if (tickets.length === 0) {
    return <EmptyState icon={Ticket} title="No Tickets" description="No tickets have been purchased for this event." />;
  }

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await onCancel(cancelId);
      toast.success('Ticket cancelled');
      setCancelId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to cancel ticket';
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holder</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>QR Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Purchased</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">{getUserName(ticket.userId)}</TableCell>
                <TableCell>{ticket.ticketType}</TableCell>
                <TableCell>{formatCurrency(ticket.price)}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {ticket.qrCode.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  <Badge className={statusStyles[ticket.status] ?? ''}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(ticket.purchasedAt, 'dd MMM yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  {ticket.status === 'active' && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setCancelId(ticket.id)}>
                      <XCircle className="mr-1 h-3.5 w-3.5" />Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cancel Ticket</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to cancel this ticket? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>No, keep it</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Yes, cancel ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
