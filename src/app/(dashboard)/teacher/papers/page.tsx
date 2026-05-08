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
  const { papers, loading, deletePaper } = useTeacherPapers();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (loading) return <LoadingSpinner />;

  if (papers.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Test Papers"
          description="Generate and manage CAPS-aligned papers for your classes."
        />
        <EmptyState
          icon={FileText}
          title="No papers yet"
          description="Create your first paper — generate with AI from a CAPS topic, or start from scratch."
          action={
            <Link href="/teacher/papers/new" className="inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create your first paper
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Papers"
        description="Generate, edit, and download CAPS-aligned papers."
      >
        <Link href="/teacher/papers/new" className="inline-block">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Paper
          </Button>
        </Link>
      </PageHeader>

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

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete this paper?"
        description="This will soft-delete the paper and its memo. Cannot be undone via UI."
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
