'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LessonStatusPill } from './LessonStatusPill';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Lesson } from '@/types/lesson';
import { MoreHorizontal, ExternalLink, Trash2 } from 'lucide-react';

interface Props {
  items: Lesson[];
  onDelete: (id: string) => Promise<void>;
}

function populatedName(field: Lesson['classId'] | Lesson['subjectId']): string {
  if (!field) return '—';
  if (typeof field === 'string') return field;
  return field.name ?? '—';
}

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function LessonListTable({ items, onDelete }: Props) {
  const [pendingDelete, setPendingDelete] = useState<Lesson | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await onDelete(pendingDelete._id);
    setPendingDelete(null);
  };

  const columns: ColumnDef<Lesson>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link
          href={`/teacher/lessons/${row.original._id}`}
          className="font-medium text-primary hover:underline truncate block max-w-80"
        >
          {row.original.title}
        </Link>
      ),
    },
    {
      id: 'class',
      header: 'Class',
      cell: ({ row }) => (
        <span className="truncate block max-w-40">
          {populatedName(row.original.classId)}
        </span>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <span className="truncate block max-w-40">
          {populatedName(row.original.subjectId)}
        </span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{formatDate(row.original.date)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <LessonStatusPill status={row.original.status} />,
    },
    {
      id: 'materials',
      header: 'Materials',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.materials?.length ?? 0}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label="Lesson actions" />}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              render={<Link href={`/teacher/lessons/${row.original._id}`} />}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setPendingDelete(row.original)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={items} />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete lesson?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" will be removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
