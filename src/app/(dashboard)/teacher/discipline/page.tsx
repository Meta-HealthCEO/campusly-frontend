'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/shared/skeletons';
import { Plus, Search, ShieldAlert } from 'lucide-react';
import { DisciplineTable } from '@/components/attendance/DisciplineTable';
import { DisciplineForm } from '@/components/attendance/DisciplineForm';
import { useTeacherDiscipline, type DisciplineRecord } from '@/hooks/useTeacherDiscipline';

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All severities' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'serious', label: 'Serious' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'reported', label: 'Reported' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'escalated', label: 'Escalated' },
];

function getStudentNameForRecord(record: DisciplineRecord): string {
  if (typeof record.studentId === 'object' && record.studentId !== null) {
    const u = record.studentId.userId;
    if (u) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return record.studentId.admissionNumber ?? '';
  }
  return '';
}

export default function TeacherDisciplinePage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');

  const { records, students, loading, createRecord, updateRecord } = useTeacherDiscipline();

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (severity !== 'all' && r.severity !== severity) return false;
      if (status !== 'all' && r.status !== status) return false;
      if (!q) return true;
      const name = getStudentNameForRecord(r).toLowerCase();
      const type = (r.type ?? '').toLowerCase();
      const desc = (r.description ?? '').toLowerCase();
      return name.includes(q) || type.includes(q) || desc.includes(q);
    });
  }, [records, search, severity, status]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateRecord(id, { status: newStatus });
  };

  const handleSubmit = async (data: {
    studentId: string;
    type: string;
    severity: string;
    description: string;
    actionTaken?: string;
    outcome?: string;
    parentNotified?: boolean;
  }) => {
    const success = await createRecord(data);
    if (success) setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discipline Records"
        description="Track and manage student discipline incidents"
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Incident
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student, type or description..."
                className="pl-9"
              />
            </div>
            <Select value={severity} onValueChange={(v: unknown) => setSeverity(v as string)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v: unknown) => setStatus(v as string)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Records */}
      {loading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : records.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No discipline records"
          description="No incidents have been logged yet. Click 'Log Incident' to record your first one."
        />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No matching records"
          description="Try adjusting your filters or search query."
        />
      ) : (
        <DisciplineTable records={filteredRecords} canDelete={false} onStatusChange={handleStatusChange} />
      )}

      <DisciplineForm
        open={open}
        onOpenChange={setOpen}
        students={students}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
