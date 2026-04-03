'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { IncidentTable } from '@/components/incidents/IncidentTable';
import { IncidentFilterBar } from '@/components/incidents/IncidentFilterBar';
import { IncidentReportDialog } from '@/components/incidents/IncidentReportDialog';
import { AlertTriangle, Plus, ShieldAlert, Search as SearchIcon, CheckCircle } from 'lucide-react';
import { useIncidents } from '@/hooks/useIncidents';
import { useIncidentReports } from '@/hooks/useIncidentReports';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Incident, CreateIncidentPayload } from '@/types';

export default function AdminIncidentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { incidents, total, loading, fetchIncidents, createIncident } = useIncidents();
  const { summary, fetchSummary } = useIncidentReports();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [reportOpen, setReportOpen] = useState(false);

  const loadData = useCallback(async () => {
    const filters: Record<string, string> = {};
    if (search) filters.search = search;
    if (status !== 'all') filters.status = status;
    if (type !== 'all') filters.type = type;
    if (severity !== 'all') filters.severity = severity;
    await fetchIncidents(filters);
  }, [search, status, type, severity, fetchIncidents]);

  useEffect(() => {
    loadData();
    fetchSummary();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timer);
  }, [search, status, type, severity]);

  const handleCreate = async (data: CreateIncidentPayload) => {
    await createIncident(data);
    await loadData();
    await fetchSummary();
  };

  const handleRowClick = (incident: Incident) => {
    router.push(`/admin/incidents/${incident.id}`);
  };

  if (loading && incidents.length === 0) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Incident Management" description="Report, investigate, and resolve school incidents">
        <Button onClick={() => setReportOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Report Incident
        </Button>
      </PageHeader>

      {summary && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Incidents" value={String(summary.totalIncidents)} icon={AlertTriangle} />
          <StatCard title="Open" value={String((summary.byStatus.reported ?? 0) + (summary.byStatus.investigating ?? 0))} icon={SearchIcon} />
          <StatCard title="Resolved" value={String(summary.byStatus.resolved ?? 0)} icon={CheckCircle} />
          <StatCard title="Avg Resolution" value={`${summary.averageResolutionDays} days`} icon={ShieldAlert} />
        </div>
      )}

      <IncidentFilterBar
        search={search} onSearchChange={setSearch}
        status={status} onStatusChange={setStatus}
        type={type} onTypeChange={setType}
        severity={severity} onSeverityChange={setSeverity}
      />

      {incidents.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No incidents" description="No incidents match your filters." />
      ) : (
        <IncidentTable incidents={incidents} onRowClick={handleRowClick} />
      )}

      <IncidentReportDialog open={reportOpen} onOpenChange={setReportOpen} onSubmit={handleCreate} />
    </div>
  );
}
