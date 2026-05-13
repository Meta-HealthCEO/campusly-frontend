'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, Eye, Users } from 'lucide-react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import type { Paper, PaperStatus } from '@/types/papers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';

function statusVariant(status: PaperStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'finalised') return 'default';
  if (status === 'archived') return 'outline';
  return 'secondary';
}

function subjectName(paper: Paper): string {
  return typeof paper.subjectId === 'object' && paper.subjectId ? paper.subjectId.name : '';
}

function gradeName(paper: Paper): string {
  return typeof paper.gradeId === 'object' && paper.gradeId ? paper.gradeId.name : '';
}

export default function TeacherPapersPage() {
  const router = useRouter();
  const {
    papers,
    loading,
    deletePaper,
    filters,
    setFilters,
    total,
  } = useTeacherPapers();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const hasActiveFilters = Boolean(filters.search || filters.status);

  const columns = useMemo<ColumnDef<Paper>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
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
      accessorKey: 'term',
      header: 'Term',
      cell: ({ row }) => `Term ${row.original.term}`,
    },
    {
      accessorKey: 'totalMarks',
      header: 'Marks',
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
      id: 'assignments',
      header: 'Classes',
      enableSorting: false,
      cell: ({ row }) => {
        const count = row.original.assignments?.length ?? 0;
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
              router.push(`/teacher/papers/${row.original._id}`);
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
            aria-label="Delete paper"
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
        title="Test Papers"
        description="Generate, edit, and assign CAPS-aligned papers. Assigned papers can be taken digitally or printed for the class."
      >
        <Link href="/teacher/papers/new" className="inline-block">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Generate Paper
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1 sm:w-44">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(value) => {
              const nextStatus = value && value !== 'all' ? value : undefined;
              setFilters({ ...filters, status: nextStatus });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="finalised">Finalised</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={() => setFilters({ page: 1, limit: 100 })}
          >
            Clear filters
          </Button>
        )}
        <p className="text-xs text-muted-foreground sm:ml-auto">
          Showing {papers.length} of {total} papers
        </p>
      </div>

      {papers.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasActiveFilters ? 'No papers found' : 'No papers yet'}
          description={
            hasActiveFilters
              ? 'Adjust the filters to see more papers.'
              : 'Generate your first CAPS-aligned paper with AI, then review and edit it.'
          }
          action={
            <Link href="/teacher/papers/new" className="inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate Paper
              </Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={papers}
          searchKey="title"
          searchPlaceholder="Search by title..."
          onRowClick={(p) => router.push(`/teacher/papers/${p._id}`)}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete this paper?"
        description="This will soft-delete the paper and its memo. It cannot be undone from the UI."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (confirmDeleteId) {
            await deletePaper(confirmDeleteId);
          }
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}
