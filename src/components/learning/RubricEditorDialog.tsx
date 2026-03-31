'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { Subject } from '@/types';
import type { CreateRubricInput, RubricCriterion, RubricLevel, Rubric } from './types';

interface RubricEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  schoolId: string;
  initialData?: Rubric | null;
  onSubmit: (data: CreateRubricInput) => Promise<void>;
}

function emptyLevel(): RubricLevel {
  return { label: '', description: '', points: 0 };
}

function emptyCriterion(): RubricCriterion {
  return { name: '', description: '', levels: [emptyLevel()] };
}

export function RubricEditorDialog({
  open, onOpenChange, subjects, schoolId, initialData, onSubmit,
}: RubricEditorDialogProps) {
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [reusable, setReusable] = useState(true);
  const [criteria, setCriteria] = useState<RubricCriterion[]>([emptyCriterion()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSubjectId(typeof initialData.subjectId === 'string' ? initialData.subjectId : initialData.subjectId?._id ?? '');
      setReusable(initialData.reusable);
      setCriteria(initialData.criteria.length > 0 ? initialData.criteria : [emptyCriterion()]);
    } else {
      setName(''); setSubjectId(''); setReusable(true); setCriteria([emptyCriterion()]);
    }
  }, [initialData, open]);

  const computedTotalPoints = criteria.reduce((sum, c) => {
    const maxLevel = c.levels.reduce((max, l) => Math.max(max, l.points), 0);
    return sum + maxLevel;
  }, 0);

  const updateCriterion = (idx: number, patch: Partial<RubricCriterion>) => {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const updateLevel = (cIdx: number, lIdx: number, patch: Partial<RubricLevel>) => {
    setCriteria((prev) =>
      prev.map((c, ci) =>
        ci === cIdx
          ? { ...c, levels: c.levels.map((l, li) => (li === lIdx ? { ...l, ...patch } : l)) }
          : c
      )
    );
  };

  const addCriterion = () => setCriteria((prev) => [...prev, emptyCriterion()]);
  const removeCriterion = (idx: number) => setCriteria((prev) => prev.filter((_, i) => i !== idx));

  const addLevel = (cIdx: number) => {
    setCriteria((prev) =>
      prev.map((c, i) => (i === cIdx ? { ...c, levels: [...c.levels, emptyLevel()] } : c))
    );
  };

  const removeLevel = (cIdx: number, lIdx: number) => {
    setCriteria((prev) =>
      prev.map((c, i) =>
        i === cIdx ? { ...c, levels: c.levels.filter((_, li) => li !== lIdx) } : c
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || criteria.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        schoolId,
        name,
        subjectId: subjectId || undefined,
        criteria,
        totalPoints: computedTotalPoints,
        reusable,
      });
      setName(''); setSubjectId(''); setReusable(true); setCriteria([emptyCriterion()]);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Rubric' : 'Create Rubric'}</DialogTitle>
          <DialogDescription>Build a reusable assessment rubric with criteria and levels.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rubric Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Essay Writing Rubric" required />
            </div>
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Select value={subjectId} onValueChange={(v: unknown) => setSubjectId(v as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Cross-subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="reusable" checked={reusable} onCheckedChange={(c) => setReusable(c === true)} />
            <Label htmlFor="reusable">Reusable (available to other teachers)</Label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Criteria</h4>
              <p className="text-sm text-muted-foreground">Total: {computedTotalPoints} pts</p>
            </div>
            {criteria.map((c, ci) => (
              <div key={ci} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium">Criterion {ci + 1}</h5>
                  {criteria.length > 1 && (
                    <Button type="button" size="xs" variant="outline" className="text-destructive" onClick={() => removeCriterion(ci)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={c.name} onChange={(e) => updateCriterion(ci, { name: e.target.value })} placeholder="Criterion name" />
                  <Input value={c.description} onChange={(e) => updateCriterion(ci, { description: e.target.value })} placeholder="Description" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Levels:</p>
                  {c.levels.map((l, li) => (
                    <div key={li} className="flex items-center gap-2">
                      <Input className="w-24" value={l.label} onChange={(e) => updateLevel(ci, li, { label: e.target.value })} placeholder="Label" />
                      <Input className="flex-1" value={l.description} onChange={(e) => updateLevel(ci, li, { description: e.target.value })} placeholder="Description" />
                      <Input className="w-20" type="number" value={l.points} onChange={(e) => updateLevel(ci, li, { points: Number(e.target.value) })} min={0} />
                      {c.levels.length > 1 && (
                        <Button type="button" size="xs" variant="outline" onClick={() => removeLevel(ci, li)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" size="xs" variant="outline" onClick={() => addLevel(ci)}>
                    <Plus className="mr-1 h-3 w-3" /> Add Level
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addCriterion}>
              <Plus className="mr-2 h-4 w-4" /> Add Criterion
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : initialData ? 'Update Rubric' : 'Create Rubric'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
