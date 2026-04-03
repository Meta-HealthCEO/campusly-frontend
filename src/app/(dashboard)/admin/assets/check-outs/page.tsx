'use client';

import { useEffect, useState, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssetCheckOuts } from '@/hooks/useAssetCheckOuts';
import type { CheckInPayload } from '@/types';
import { CheckOutList, CheckInDialog } from '@/components/assets';
import type { AssetCheckOut, CheckOutStatus } from '@/types';

type StatusFilter = 'all' | CheckOutStatus;

export default function AssetCheckOutsPage() {
  const {
    checkOuts,
    loading,
    fetchCheckOuts,
    checkIn,
  } = useAssetCheckOuts();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [checkInTarget, setCheckInTarget] = useState<AssetCheckOut | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);

  useEffect(() => { fetchCheckOuts(); }, [fetchCheckOuts]);

  const filtered = statusFilter === 'all'
    ? checkOuts
    : checkOuts.filter((c) => c.status === statusFilter);

  const handleCheckInClick = useCallback((assetId: string) => {
    const co = checkOuts.find((c) => {
      const aid = typeof c.assetId === 'object' ? c.assetId.id : c.assetId;
      return aid === assetId && c.status === 'checked_out';
    });
    if (co) { setCheckInTarget(co); setCheckInOpen(true); }
  }, [checkOuts]);

  const handleCheckIn = useCallback(async (id: string, data?: CheckInPayload) => {
    await checkIn(id, data ?? {});
    await fetchCheckOuts();
    setCheckInOpen(false);
    setCheckInTarget(null);
  }, [checkIn, fetchCheckOuts]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-Outs"
        description="Track active and past asset check-outs"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No check-outs found"
          description={
            statusFilter === 'all'
              ? 'No assets have been checked out yet.'
              : `No check-outs with status "${statusFilter}".`
          }
        />
      ) : (
        <CheckOutList
          checkOuts={filtered}
          onCheckIn={handleCheckInClick}
        />
      )}

      {checkInTarget && (
        <CheckInDialog
          open={checkInOpen}
          onOpenChange={setCheckInOpen}
          assetName={typeof checkInTarget.assetId === 'object' ? checkInTarget.assetId.name : ''}
          onSubmit={async (data) => {
            const assetId = typeof checkInTarget.assetId === 'object' ? checkInTarget.assetId.id : checkInTarget.assetId;
            await handleCheckIn(assetId, data);
          }}
        />
      )}
    </div>
  );
}
