'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Lesson, LessonAssignment } from '@/types/lesson';
import { MoreHorizontal, ExternalLink, Trash2, Copy } from 'lucide-react';

interface Props {
  items: Lesson[];
  onDelete: (id: string) => Promise<void>;
  onClone?: (id: string) => Promise<unknown>;
}

function subjectName(lesson: Lesson): string {
  const direct = lesson.subjectId;
  if (direct && typeof direct !== 'string' && direct.name) return direct.name;
  const node = lesson.curriculumNodeId;
  if (node && typeof node !== 'string') {
    const nodeSubject = node.subjectId;
    if (nodeSubject && typeof nodeSubject !== 'string' && nodeSubject.title) {
      return nodeSubject.title;
    }
  }
  return '—';
}

function readClassName(rel: LessonAssignment['classId']): string {
  return typeof rel === 'string' ? rel : (rel.name ?? '—');
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

/** Comma-joined first 2 class names with "+N more" overflow. "—" if empty. */
function formatClasses(assignments: LessonAssignment[]): string {
  if (assignments.length === 0) return '—';
  const names = assignments.map((a) => readClassName(a.classId));
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

/** Earliest scheduledDate among 'planned' assignments. "—" if none. */
function nextScheduled(assignments: LessonAssignment[]): string {
  const planned = assignments
    .filter((a) => a.status === 'planned')
    .map((a) => new Date(a.scheduledDate).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  if (planned.length === 0) return '—';
  return formatDate(new Date(planned[0]).toISOString());
}

export function LessonListTable({ items, onDelete, onClone }: Props) {
  const router = useRouter();
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
        <span className="font-medium text-primary line-clamp-2">
          {row.original.title}
        </span>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <span className="truncate block max-w-40">
          {subjectName(row.original)}
        </span>
      ),
    },
    {
      id: 'classes',
      header: 'Classes',
      cell: ({ row }) => (
        <span className="truncate block max-w-48">
          {formatClasses(row.original.assignedClasses)}
        </span>
      ),
    },
    {
      id: 'nextScheduled',
      header: 'Next scheduled',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {nextScheduled(row.original.assignedClasses)}
        </span>
      ),
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
        <div onClick={(e) => e.stopPropagation()}>
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
              {onClone && (
                <DropdownMenuItem
                  onClick={() => void onClone(row.original._id)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setPendingDelete(row.original)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        onRowClick={(lesson) => router.push(`/teacher/lessons/${lesson._id}`)}
      />
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
