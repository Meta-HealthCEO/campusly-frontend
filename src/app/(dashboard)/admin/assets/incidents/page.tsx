'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
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
import { useAssetIncidents } from '@/hooks/useAssetIncidents';
import { IncidentList, IncidentFormDialog } from '@/components/assets';
import type { AssetIncident, AssetIncidentType, AssetIncidentStatus } from '@/types';

type TypeFilter = 'all' | AssetIncidentType;
type StatusFilter = 'all' | AssetIncidentStatus;

export default function AssetIncidentsPage() {
  const {
    incidents,
    loading,
    fetchIncidents,
    updateIncident,
  } = useAssetIncidents();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingIncident, setEditingIncident] = useState<AssetIncident | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const filtered = incidents.filter((i) => {
    const typeMatch = typeFilter === 'all' || i.type === typeFilter;
    const statusMatch = statusFilter === 'all' || i.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const handleEdit = useCallback((incident: AssetIncident) => {
    setEditingIncident(incident);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async (data: Partial<AssetIncident>) => {
    if (!editingIncident) return;
    await updateIncident(editingIncident.id, data);
    await fetchIncidents();
    setDialogOpen(false);
    setEditingIncident(null);
  }, [editingIncident, updateIncident, fetchIncidents]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Incidents"
        description="View and manage loss, damage, and theft reports"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={typeFilter} onValueChange={(v: unknown) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="damage">Damage</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
            <SelectItem value="theft">Theft</SelectItem>
            <SelectItem value="vandalism">Vandalism</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No incidents found"
          description={
            typeFilter === 'all' && statusFilter === 'all'
              ? 'No asset incidents have been reported yet.'
              : 'No incidents match the selected filters.'
          }
        />
      ) : (
        <IncidentList
          incidents={filtered}
          onEdit={handleEdit}
        />
      )}

      <IncidentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        incident={editingIncident}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
