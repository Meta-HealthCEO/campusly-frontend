'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ExternalLink, ClipboardList } from 'lucide-react';
import type { ContentResourceItem, ResourceSource, ResourceStatus, ResourceType } from '@/types';

interface Props {
  resources: ContentResourceItem[];
  onAssign: (resource: ContentResourceItem) => void;
}

const TYPE_LABEL: Record<ResourceType, string> = {
  lesson: 'Lesson',
  worksheet: 'Worksheet',
  activity: 'Activity',
  study_notes: 'Study Notes',
  worked_example: 'Worked Example',
  reading: 'Reading',
};

const SOURCE_LABEL: Record<ResourceSource, string> = {
  oer: 'OER',
  ai_generated: 'AI',
  teacher: 'Teacher',
  system: 'System',
  imported: 'Imported',
};

const STATUS_VARIANT: Record<ResourceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  pending_review: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const STATUS_LABEL: Record<ResourceStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function readName(field: string | { name: string } | null | undefined): string {
  if (!field) return '—';
  if (typeof field === 'string') return '—';
  return field.name ?? '—';
}

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ResourceListTable({ resources, onAssign }: Props) {
  const router = useRouter();

  const columns: ColumnDef<ContentResourceItem>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-medium text-primary line-clamp-2">{row.original.title}</span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => <Badge variant="outline">{TYPE_LABEL[row.original.type]}</Badge>,
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <span className="truncate block max-w-40">{readName(row.original.subjectId)}</span>
      ),
    },
    {
      id: 'grade',
      header: 'Grade',
      cell: ({ row }) => (
        <span className="truncate block max-w-32">{readName(row.original.gradeId)}</span>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs">
          {SOURCE_LABEL[row.original.source] ?? row.original.source}
        </Badge>
      ),
    },
    {
      id: 'updated',
      header: 'Updated',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>
          {STATUS_LABEL[row.original.status]}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Resource actions" />}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                render={<Link href={`/teacher/curriculum/preview/${row.original.id}`} />}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAssign(row.original)}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Assign as homework
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={resources}
      onRowClick={(r) => router.push(`/teacher/curriculum/preview/${r.id}`)}
    />
  );
}
