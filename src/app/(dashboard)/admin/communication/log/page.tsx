'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { DeliveryLogDataTable } from '@/components/communication/DeliveryLogDataTable';
import { useDeliveryLog } from '@/hooks/useCommunicationAdmin';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import type { CommunicationChannel, DeliveryStatus, DeliveryLogFilters } from '@/types';

const channelOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Channels' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' },
];

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'opened', label: 'Opened' },
];

function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DeliveryLogPage() {
  const { logs, loading, page, totalPages, fetchLogs, retryMessage } = useDeliveryLog();

  const defaultEnd = useMemo(() => toLocalDate(new Date()), []);
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toLocalDate(d);
  }, []);

  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [search, setSearch] = useState('');

  const buildFilters = useCallback((p = 1): DeliveryLogFilters => {
    const filters: DeliveryLogFilters = { page: p };
    if (channel !== 'all') filters.channel = channel as CommunicationChannel;
    if (status !== 'all') filters.status = status as DeliveryStatus;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (search.trim()) filters.recipientSearch = search.trim();
    return filters;
  }, [channel, status, startDate, endDate, search]);

  useEffect(() => {
    fetchLogs(buildFilters(1));
  }, [fetchLogs, buildFilters]);

  const handlePageChange = (p: number) => {
    fetchLogs(buildFilters(p));
  };

  const handleRetry = async (logId: string) => {
    try {
      await retryMessage(logId);
      fetchLogs(buildFilters(page));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Retry failed');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Log" description="View and search all message delivery records" />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Channel</Label>
          <Select value={channel} onValueChange={(v: unknown) => setChannel(v as string)}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {channelOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v: unknown) => setStatus(v as string)}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
            className="w-full sm:w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
            className="w-full sm:w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recipient</Label>
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full sm:w-48"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState icon={Mail} title="No delivery logs" description="Logs will appear once messages are sent." />
      ) : (
        <DeliveryLogDataTable
          logs={logs}
          onRetry={handleRetry}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
