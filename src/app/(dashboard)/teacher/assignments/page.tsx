'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ScrollText, Trash2, Eye, Users } from 'lucide-react';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import type { Assignment, AssignmentStatus } from '@/types/assignments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';

function statusVariant(status: AssignmentStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'published') return 'default';
  if (status === 'archived') return 'outline';
  return 'secondary';
}

function subjectName(a: Assignment): string {
  return typeof a.subjectId === 'object' && a.subjectId ? a.subjectId.name : '';
}

function gradeName(a: Assignment): string {
  return typeof a.gradeId === 'object' && a.gradeId ? a.gradeId.name : '';
}

export default function TeacherAssignmentsPage() {
  const router = useRouter();
  const { assignments, loading, fetchAssignments, remove } = useTeacherAssignments();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    void fetchAssignments(statusFilter !== 'all' ? { status: statusFilter } : undefined);
  }, [fetchAssignments, statusFilter]);

  const columns = useMemo<ColumnDef<Assignment>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      id: 'subject',
      header: 'Subject',
      accessorFn: (row) => subjectName(row),
    },
    {
      id: 'grade',
      header: 'Grade',
      accessorFn: (row) => gradeName(row),
    },
    {
      accessorKey: 'totalMarks',
      header: 'Marks',
    },
    {
      id: 'rubricCount',
      header: 'Criteria',
      enableSorting: false,
      cell: ({ row }) => row.original.rubric.length,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'classes',
      header: 'Classes',
      enableSorting: false,
      cell: ({ row }) => {
        const count = row.original.assignedClasses?.length ?? 0;
        if (count === 0) return <span className="text-xs text-muted-foreground">Unassigned</span>;
        return (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" /> {count} class{count === 1 ? '' : 'es'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/teacher/assignments/${row.original._id}`);
            }}
          >
            <Eye className="mr-1 h-3 w-3" /> Open
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteId(row.original._id);
            }}
            aria-label="Delete assignment"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ], [router]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Long-form deliverables marked against a rubric — essays, projects, research tasks. AI can draft the brief and rubric for you."
      >
        <Link href="/teacher/assignments/new" className="inline-block">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Assignment
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1 sm:w-44">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            value={statusFilter}
            onValueChange={(v: string | null) => setStatusFilter(v ?? 'all')}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {assignments.length} assignment{assignments.length === 1 ? '' : 's'}
        </p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={statusFilter !== 'all' ? 'No assignments found' : 'No assignments yet'}
          description={
            statusFilter !== 'all'
              ? 'Try a different status filter.'
              : 'Draft your first assignment with AI — pick a topic, tell the AI exactly what you want, then edit the brief and rubric.'
          }
          action={
            <Link href="/teacher/assignments/new" className="inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Assignment
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={assignments}
          searchKey="title"
          searchPlaceholder="Search by title..."
          onRowClick={(a) => router.push(`/teacher/assignments/${a._id}`)}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete this assignment?"
        description="This will soft-delete the assignment. Submissions stay on the gradebook history."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (confirmDeleteId) {
            const ok = await remove(confirmDeleteId);
            if (ok) void fetchAssignments();
          }
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}
