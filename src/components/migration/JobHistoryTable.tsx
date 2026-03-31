'use client';

import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useMigrationStore } from '@/stores/useMigrationStore';
import { JobDetailDialog } from './JobDetailDialog';
import type { MigrationJob, MigrationStatus, PerformedByUser } from '@/types/migration';
import { SOURCE_SYSTEM_LABELS, STATUS_COLORS } from '@/types/migration';

const STATUS_OPTIONS: { value: MigrationStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'validating', label: 'Validating' },
  { value: 'importing', label: 'Importing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

function getPerformedByName(performedBy: MigrationJob['performedBy']): string {
  if (typeof performedBy === 'string') return performedBy;
  const user = performedBy as PerformedByUser;
  return `${user.firstName} ${user.lastName}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const columns: ColumnDef<MigrationJob, unknown>[] = [
  {
    accessorKey: 'uploadedFile.originalName',
    header: 'File Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.uploadedFile.originalName}</span>
    ),
  },
  {
    accessorKey: 'sourceSystem',
    header: 'Source',
    cell: ({ row }) => SOURCE_SYSTEM_LABELS[row.original.sourceSystem],
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={STATUS_COLORS[row.original.status]}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: 'totalRows',
    header: 'Total Rows',
    cell: ({ row }) =>
      row.original.validationResults?.totalRows?.toLocaleString() ?? '-',
  },
  {
    id: 'recordsCreated',
    header: 'Records Created',
    cell: ({ row }) => {
      const ir = row.original.importResults;
      if (!ir) return '-';
      return (
        ir.studentsCreated + ir.parentsCreated + ir.staffCreated + ir.gradesCreated
      ).toLocaleString();
    },
  },
  {
    id: 'performedBy',
    header: 'Performed By',
    cell: ({ row }) => getPerformedByName(row.original.performedBy),
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export function JobHistoryTable() {
  const {
    jobs,
    jobsLoading,
    jobsStatusFilter,
    setJobsStatusFilter,
    fetchHistory,
  } = useMigrationStore();
  const [selectedJob, setSelectedJob] = useState<MigrationJob | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleStatusChange = (val: unknown) => {
    const status = val as MigrationStatus | '';
    setJobsStatusFilter(status);
    fetchHistory({ status: status || undefined });
  };

  if (jobsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={jobsStatusFilter || undefined}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchHistory()}
        >
          Refresh
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={jobs}
        searchKey="uploadedFile.originalName"
        searchPlaceholder="Search by file name..."
        onRowClick={(row) => setSelectedJob(row)}
      />

      <JobDetailDialog
        open={!!selectedJob}
        onOpenChange={(open) => { if (!open) setSelectedJob(null); }}
        job={selectedJob}
      />
    </div>
  );
}
