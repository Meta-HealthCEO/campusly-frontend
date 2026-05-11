'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Trash2, Eye } from 'lucide-react';
import { useTeacherPapers } from '@/hooks/useTeacherPapers';
import type { Paper, PaperStatus } from '@/types/papers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

function statusVariant(status: PaperStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'finalised') return 'default';
  if (status === 'archived') return 'outline';
  return 'secondary';
}

function subjectName(paper: Paper): string {
  return typeof paper.subjectId === 'object' && paper.subjectId
    ? paper.subjectId.name
    : '';
}

function gradeName(paper: Paper): string {
  return typeof paper.gradeId === 'object' && paper.gradeId
    ? paper.gradeId.name
    : '';
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Papers"
        description="Generate, edit, and download CAPS-aligned papers and memos."
      >
        <Link href="/teacher/papers/new" className="inline-block">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Generate Paper
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1 flex-1 sm:max-w-sm">
          <label className="text-xs text-muted-foreground">Search</label>
          <Input
            value={filters.search ?? ''}
            onChange={(event) =>
              setFilters({
                ...filters,
                search: event.target.value || undefined,
              })
            }
            placeholder="Search paper title..."
          />
        </div>
        <div className="space-y-1 sm:w-44">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(value) => {
              const nextStatus = value && value !== 'all' ? value : undefined;
              setFilters({
                ...filters,
                status: nextStatus,
              });
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
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {papers.length} of {total} papers
      </p>

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
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper: Paper) => {
            const meta = [
              subjectName(paper),
              gradeName(paper),
              `Term ${paper.term}`,
              `${paper.totalMarks} marks`,
            ]
              .filter(Boolean)
              .join(' \u00B7 ');
            return (
              <Card key={paper._id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium truncate">{paper.title}</h3>
                    <Badge variant={statusVariant(paper.status)}>
                      {paper.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {meta}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/teacher/papers/${paper._id}`)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(paper._id)}
                      aria-label="Delete paper"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
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
