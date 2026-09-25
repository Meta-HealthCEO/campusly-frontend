'use client';

import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatusChip } from '@/components/shared/StatusChip';
import { SubjectWeightingDialog } from '@/components/grades/SubjectWeightingDialog';
import { useGradeWeightings } from '@/hooks/useGradeWeightings';
import { classSubjects, weightingChip, weightingLines, type WeightingLine } from '@/lib/weighting-summary';
import { cn } from '@/lib/utils';
import type { Subject } from '@/types';

interface Props {
  gradeId: string | null;
  subjects: Subject[];
  /** The term the gradebook is showing ('year' = none highlighted). */
  term: string;
  canEdit: boolean;
  /** Called after weightings are saved, so the class overview refreshes. */
  onSaved: () => void;
}

/** How each subject's term mark is built, per term. Editable only by those who may save. */
export function GradebookWeightingsTab({ gradeId, subjects, term, canEdit, onSaved }: Props) {
  const list = useMemo(() => classSubjects(subjects, gradeId), [subjects, gradeId]);
  const ids = useMemo(() => list.map((s: Subject) => s.id), [list]);
  const { matrices, failedSubjectIds, loading, refetch } = useGradeWeightings(gradeId, ids);
  const [editing, setEditing] = useState<string | null>(null);
  const currentTerm = Number(term);

  if (loading && matrices.size === 0) return <LoadingSpinner />;
  if (list.length === 0) {
    return <EmptyState icon={Scale} title="No subjects for this class" description="Subjects set up for this grade appear here." />;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Weightings set how tests, assignments and projects add up to a subject&apos;s term mark.
        {canEdit ? '' : ' Only your HOD or a school admin can change weightings.'}
      </p>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {list.map((subject: Subject) => {
            const lines = weightingLines(matrices.get(subject.id)?.terms ?? []);
            const current = lines.find((l: WeightingLine) => l.term === currentTerm);
            const chip = weightingChip(current, failedSubjectIds.has(subject.id));
            return (
              <div key={subject.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{subject.name}</p>
                    {chip ? <StatusChip status={chip.status} label={chip.label} /> : null}
                  </div>
                  <ul className="grid grid-cols-1 gap-x-6 gap-y-0.5 text-[13px] sm:grid-cols-2">
                    {lines.map((line: WeightingLine) => (
                      <li key={line.term} className={cn('text-muted-foreground', line.term === currentTerm && 'font-medium text-foreground')}>
                        <span className="font-heading tabular-nums">T{line.term}</span> · {line.text}
                      </li>
                    ))}
                  </ul>
                </div>
                {canEdit ? (
                  <Button variant="outline" size="sm" className="min-h-11 shrink-0 sm:min-h-8" onClick={() => setEditing(subject.id)}>
                    Edit
                  </Button>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
      {canEdit ? (
        <SubjectWeightingDialog
          open={editing !== null}
          onOpenChange={(open) => {
            if (open) return;
            setEditing(null);
            void refetch();
            onSaved();
          }}
          subjectId={editing}
          gradeId={gradeId}
        />
      ) : null}
    </div>
  );
}
