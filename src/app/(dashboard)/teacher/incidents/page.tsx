'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { TableSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { IncidentTable } from '@/components/incidents/IncidentTable';
import { IncidentFilterBar } from '@/components/incidents/IncidentFilterBar';
import { IncidentReportDialog } from '@/components/incidents/IncidentReportDialog';
import { AlertTriangle, Plus } from 'lucide-react';
import { useIncidents } from '@/hooks/useIncidents';
import { useRouter } from 'next/navigation';
import type { Incident, CreateIncidentPayload } from '@/types';

export default function TeacherIncidentsPage() {
  const router = useRouter();
  const { incidents, loading, fetchIncidents, createIncident } = useIncidents();

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

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timer);
  }, [search, status, type, severity]);

  const handleCreate = async (data: CreateIncidentPayload) => {
    await createIncident(data);
    await loadData();
  };

  const handleRowClick = (incident: Incident) => {
    router.push(`/teacher/incidents/${incident.id}`);
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Incidents" description="Report and track school incidents" />
        <TableSkeleton rows={6} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Incidents" description="Report and track school incidents">
        <Button onClick={() => setReportOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Report Incident
        </Button>
      </PageHeader>

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
