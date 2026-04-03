'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import type { CounselorSession, PastoralSessionType, ConfidentialityLevel } from '@/types';

interface Props {
  sessions: CounselorSession[];
  onView?: (session: CounselorSession) => void;
}

const SESSION_TYPE_LABELS: Record<PastoralSessionType, string> = {
  individual: 'Individual',
  group: 'Group',
  crisis: 'Crisis',
  follow_up: 'Follow-Up',
  consultation: 'Consultation',
};

function ConfidentialityBadge({ level }: { level: ConfidentialityLevel }) {
  const styles: Record<ConfidentialityLevel, string> = {
    standard: 'bg-muted text-muted-foreground',
    sensitive: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    restricted: 'bg-destructive/10 text-destructive',
  };
  const labels: Record<ConfidentialityLevel, string> = {
    standard: 'Standard',
    sensitive: 'Sensitive',
    restricted: 'Restricted',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

function SessionTypeBadge({ type }: { type: PastoralSessionType }) {
  const crisis = type === 'crisis';
  return (
    <Badge variant={crisis ? 'destructive' : 'outline'}>
      {SESSION_TYPE_LABELS[type]}
    </Badge>
  );
}

export function SessionLogList({ sessions, onView }: Props) {
  const columns = useMemo<ColumnDef<CounselorSession>[]>(() => [
    {
      accessorKey: 'studentId',
      header: 'Student',
      cell: ({ row }) => {
        const s = row.original.studentId;
        return <span className="font-medium truncate">{s.firstName} {s.lastName}</span>;
      },
    },
    {
      accessorKey: 'sessionDate',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.sessionDate).toLocaleDateString(),
    },
    {
      accessorKey: 'sessionType',
      header: 'Type',
      cell: ({ row }) => <SessionTypeBadge type={row.original.sessionType} />,
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => `${row.original.duration} min`,
    },
    {
      accessorKey: 'confidentialityLevel',
      header: 'Confidentiality',
      cell: ({ row }) => <ConfidentialityBadge level={row.original.confidentialityLevel} />,
    },
    {
      accessorKey: 'followUpDate',
      header: 'Follow-Up Date',
      cell: ({ row }) => row.original.followUpDate
        ? new Date(row.original.followUpDate).toLocaleDateString()
        : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => onView ? (
        <Button size="sm" variant="outline" onClick={() => onView(row.original)}>
          View
        </Button>
      ) : null,
    },
  ], [onView]);

  return (
    <DataTable
      columns={columns}
      data={sessions}
      searchKey="studentId"
      searchPlaceholder="Search sessions..."
    />
  );
}
