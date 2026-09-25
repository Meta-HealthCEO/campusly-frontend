'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import type { SubmissionCounts } from '@/hooks/useTeacherHomework';
import type { WorkRow } from '@/lib/work-list';

interface Props {
  items: WorkRow[];
  submissionCounts: Record<string, SubmissionCounts>;
}

export function HomeworkListTable({ items, submissionCounts }: Props) {
  const router = useRouter();

  const columns: ColumnDef<WorkRow>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-medium text-primary line-clamp-2 max-w-sm">
          {row.original.title}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={row.original.kind === 'project' ? 'border-accent-foreground/30 bg-accent text-accent-foreground' : 'capitalize'}
        >
          {row.original.typeLabel}
        </Badge>
      ),
    },
    {
      id: 'class',
      header: 'Class',
      cell: ({ row }) => <span className="truncate block max-w-40">{row.original.className || '—'}</span>,
    },
    {
      id: 'dueDate',
      header: 'Due',
      cell: ({ row }) => {
        const { dueDate, status } = row.original;
        if (!dueDate) return <span className="text-xs text-muted-foreground">Not set yet</span>;
        const overdue = new Date(dueDate) < new Date() && status === 'assigned';
        return (
          <span
            className={`whitespace-nowrap text-sm ${
              overdue ? 'text-destructive font-medium' : ''
            }`}
          >
            {formatDate(dueDate)}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'assigned' ? 'default' : 'outline'}
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'submissions',
      header: 'Submissions',
      cell: ({ row }) => {
        const counts = row.original.kind === 'homework' ? submissionCounts[row.original.id] : undefined;
        if (!counts) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="text-sm whitespace-nowrap">
            <span className="font-medium">{counts.graded}</span>
            <span className="text-muted-foreground"> / {counts.total} graded</span>
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Link href={row.original.href}>
            <Button variant="ghost" size="sm" aria-label={row.original.kind === 'project' ? 'Open project' : 'Open homework'}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      onRowClick={(r) => router.push(r.href)}
    />
  );
}
