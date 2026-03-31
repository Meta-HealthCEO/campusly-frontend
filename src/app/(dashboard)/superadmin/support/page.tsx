'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SupportQueue } from '@/components/superadmin/SupportQueue';
import { TicketThread } from '@/components/superadmin/TicketThread';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';
import type { SupportTicket } from '@/types';

export default function SuperAdminSupportPage() {
  const {
    tickets, ticketsLoading, fetchTickets,
    selectedTicket, setSelectedTicket,
    fetchTicketDetail, replyToTicket, updateTicketStatus,
  } = useSuperAdminStore();

  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    fetchTickets(params);
  }, [fetchTickets, statusFilter]);

  const handleSelect = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    fetchTicketDetail(ticket.id);
  };

  const handleReply = async (message: string) => {
    if (!selectedTicket) return;
    try {
      await replyToTicket(selectedTicket.id, message);
      toast.success('Reply sent');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to send reply';
      toast.error(msg);
    }
  };

  const handleStatusChange = async (status: SupportTicket['status']) => {
    if (!selectedTicket) return;
    try {
      await updateTicketStatus(selectedTicket.id, status);
      toast.success(`Ticket status updated to ${status.replace('_', ' ')}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to update ticket status';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title="Support" description="Manage tenant support tickets" />
        <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter((v as string) || 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 min-h-0 flex-1" style={{ minHeight: '500px' }}>
        <SupportQueue
          tickets={tickets}
          selectedId={selectedTicket?.id ?? ''}
          onSelect={handleSelect}
          loading={ticketsLoading}
        />

        {selectedTicket ? (
          <TicketThread
            ticket={selectedTicket}
            onReply={handleReply}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center text-muted-foreground rounded-lg border">
            <p>Select a ticket to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
