'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wrench } from 'lucide-react';
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
import { useAssetMaintenance } from '@/hooks/useAssetMaintenance';
import { MaintenanceList, MaintenanceFormDialog } from '@/components/assets';
import type { AssetMaintenance, MaintenanceStatus, CreateMaintenancePayload } from '@/types';

type StatusFilter = 'all' | MaintenanceStatus;

export default function AssetMaintenancePage() {
  const {
    records,
    loading,
    fetchUpcoming,
    updateMaintenance,
  } = useAssetMaintenance();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingRecord, setEditingRecord] = useState<AssetMaintenance | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { fetchUpcoming(); }, [fetchUpcoming]);

  const filtered = statusFilter === 'all'
    ? records
    : records.filter((r) => r.status === statusFilter);

  const handleEdit = useCallback((record: AssetMaintenance) => {
    setEditingRecord(record);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async (data: CreateMaintenancePayload) => {
    if (!editingRecord) return;
    await updateMaintenance(editingRecord.id, data);
    await fetchUpcoming();
    setDialogOpen(false);
    setEditingRecord(null);
  }, [editingRecord, updateMaintenance, fetchUpcoming]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="View and update maintenance events across all assets"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance records"
          description={
            statusFilter === 'all'
              ? 'No maintenance events have been recorded yet.'
              : `No maintenance records with status "${statusFilter}".`
          }
        />
      ) : (
        <MaintenanceList
          records={filtered}
          onEdit={handleEdit}
        />
      )}

      <MaintenanceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editingRecord}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
