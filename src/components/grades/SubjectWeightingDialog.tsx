'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Copy, Check } from 'lucide-react';
import {
  useSubjectWeightings,
  ASSESSMENT_TYPES,
  ASSESSMENT_TYPE_LABELS,
  type AssessmentType,
  type BucketRow,
  type TermBuckets,
} from '@/hooks/useSubjectWeightings';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string | null;
  gradeId: string | null;
}

// Local edit state: term → type → string. We hold strings (not numbers)
// so the inputs can be empty mid-edit without snapping to 0.
type EditState = Record<number, Partial<Record<AssessmentType, string>>>;

const TERMS = [1, 2, 3, 4] as const;

function termsToEditState(terms: TermBuckets[]): EditState {
  const out: EditState = {};
  for (const t of terms) {
    const inner: Partial<Record<AssessmentType, string>> = {};
    for (const b of t.buckets) {
      inner[b.assessmentType] = String(b.weightPercentage);
    }
    out[t.term] = inner;
  }
  return out;
}

function bucketsFromEdit(
  edit: Partial<Record<AssessmentType, string>> | undefined,
): BucketRow[] {
  return ASSESSMENT_TYPES.map((type) => {
    const raw = edit?.[type] ?? '';
    const num = raw === '' ? 0 : Number(raw);
    return {
      assessmentType: type,
      weightPercentage: Number.isFinite(num) ? num : 0,
    };
  });
}

function sumOf(edit: Partial<Record<AssessmentType, string>> | undefined): number {
  return bucketsFromEdit(edit).reduce((s, b) => s + b.weightPercentage, 0);
}

export function SubjectWeightingDialog({
  open, onOpenChange, subjectId, gradeId,
}: Props) {
  const { matrix, loading, saving, saveTerm } = useSubjectWeightings({
    subjectId: open ? subjectId : null,
    gradeId: open ? gradeId : null,
  });
  const [edit, setEdit] = useState<EditState>({});

  // Re-seed when matrix loads or dialog reopens. Including `open` ensures a
  // reopen with stale edits gets a fresh snapshot from the server.
  useEffect(() => {
    if (open && matrix) setEdit(termsToEditState(matrix.terms));
  }, [open, matrix]);

  function setBucket(term: number, type: AssessmentType, value: string) {
    setEdit((prev) => ({
      ...prev,
      [term]: { ...(prev[term] ?? {}), [type]: value },
    }));
  }

  // "Copy term 1 → all" is the most common school-config pattern: most
  // schools use the same mix every term. Saves four trips through the form.
  function copyTermToAll(sourceTerm: number) {
    const src = edit[sourceTerm];
    if (!src) return;
    setEdit((prev) => {
      const next: EditState = { ...prev };
      for (const t of TERMS) {
        if (t === sourceTerm) continue;
        next[t] = { ...src };
      }
      return next;
    });
  }

  async function onSaveTerm(term: number) {
    const buckets = bucketsFromEdit(edit[term]);
    try { await saveTerm(term, buckets); } catch { /* toast handled in hook */ }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Weightings{matrix ? ` — ${matrix.subjectName} · ${matrix.gradeName}` : ''}
          </DialogTitle>
          <DialogDescription>
            Set how each assessment type contributes to the term mark. Each
            term must sum to 100%. CAPS-style example: Tests 40, Exams 50,
            Assignments 10.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 space-y-3">
          {loading || !matrix ? (
            <div className="py-12 flex justify-center"><LoadingSpinner /></div>
          ) : (
            TERMS.map((term) => (
              <TermCard
                key={term}
                term={term}
                edit={edit[term]}
                saving={saving}
                onChange={(type, value) => setBucket(term, type, value)}
                onSave={() => onSaveTerm(term)}
                onCopyToAll={() => copyTermToAll(term)}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TermCardProps {
  term: number;
  edit: Partial<Record<AssessmentType, string>> | undefined;
  saving: boolean;
  onChange: (type: AssessmentType, value: string) => void;
  onSave: () => void | Promise<void>;
  onCopyToAll: () => void;
}

function TermCard({ term, edit, saving, onChange, onSave, onCopyToAll }: TermCardProps) {
  const sum = useMemo(() => sumOf(edit), [edit]);
  const sumOk = Math.abs(sum - 100) < 0.1;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Term {term}</p>
            <Badge
              variant={sumOk ? 'default' : 'destructive'}
              className="text-[10px]"
            >
              Sum {sum.toFixed(0)}%
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCopyToAll}
              className="h-8"
              title="Copy this term to all other terms"
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copy to all terms
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={!sumOk || saving}
              className="h-8"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </div>
        </div>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-5">
          {ASSESSMENT_TYPES.map((type) => (
            <div key={type} className="space-y-1">
              <Label
                htmlFor={`weight-${term}-${type}`}
                className="text-xs text-muted-foreground"
              >
                {ASSESSMENT_TYPE_LABELS[type]}
              </Label>
              <div className="relative">
                <Input
                  id={`weight-${term}-${type}`}
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  value={edit?.[type] ?? ''}
                  onChange={(e) => onChange(type, e.target.value)}
                  placeholder="0"
                  className={cn('pr-7', !sumOk && 'border-destructive/50')}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  %
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
