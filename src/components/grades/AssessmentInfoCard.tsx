'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, FileText, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Assessment } from '@/types';

interface Props {
  assessment: Assessment;
  onEdit: () => void;
  onDelete: (id: string) => Promise<void>;
}

function getSubjectName(a: Assessment): string {
  if (a.subject?.name) return a.subject.name;
  if (typeof a.subjectId === 'object' && a.subjectId !== null) {
    return ((a.subjectId as Record<string, unknown>).name as string) ?? '';
  }
  return '';
}

function getPaperId(a: Assessment): string | null {
  if (!a.paperId) return null;
  if (typeof a.paperId === 'string') return a.paperId;
  return a.paperId.id;
}

export function AssessmentInfoCard({ assessment, onEdit, onDelete }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const paperId = getPaperId(assessment);

  return (
    <>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{assessment.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {getSubjectName(assessment)} &middot; {assessment.type} &middot; Total: {assessment.totalMarks} marks &middot; Weight: {assessment.weight}%
            </p>
            {paperId && (
              <Link
                href={`/teacher/curriculum/assessments/${paperId}`}
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <FileText className="h-3 w-3" />
                View Paper
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={onEdit} title="Edit assessment">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Delete assessment"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Assessment"
        description={`Are you sure you want to delete "${assessment.name}"? This will also delete all marks. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => onDelete(assessment.id)}
      />
    </>
  );
}
