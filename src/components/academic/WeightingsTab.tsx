'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Trash2, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useSubjects, useGrades, useWeightings } from '@/hooks/useAcademics';
import { useWeightingMutations } from '@/hooks/useAcademicMutationsExtended';
import { useCan } from '@/hooks/useCan';
import type { Weighting } from '@/hooks/useAcademics';

const ASSESSMENT_TYPES = ['test', 'exam', 'assignment', 'practical', 'project'] as const;

export function WeightingsTab() {
  const { subjects } = useSubjects();
  const { grades } = useGrades();
  const { weightings, loading, refetch: fetchWeightings } = useWeightings();
  const { createWeighting, deleteWeighting } = useWeightingMutations();
  const canManage = useCan('manage_academic_setup');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    subjectId: '', gradeId: '', assessmentType: 'test', weightPercentage: '20', term: '1',
  });

  async function handleSubmit() {
    try {
      await createWeighting({
        subjectId: form.subjectId,
        gradeId: form.gradeId,
        assessmentType: form.assessmentType,
        weightPercentage: Number(form.weightPercentage),
        term: Number(form.term),
      });
      toast.success('Weighting created');
      setDialogOpen(false);
      fetchWeightings();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create weighting'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWeighting(id);
      toast.success('Weighting deleted');
      fetchWeightings();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete weighting'));
    }
  }

  const columns: ColumnDef<Weighting>[] = [
    { accessorKey: 'subjectName', header: 'Subject' },
    { accessorKey: 'gradeName', header: 'Grade' },
    { accessorKey: 'assessmentType', header: 'Type' },
    { id: 'weight', header: 'Weight', accessorFn: (row) => `${row.weightPercentage}%` },
    { accessorKey: 'term', header: 'Term' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => canManage ? (
        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(row.original.id)} aria-label="Delete weighting">
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      ) : null,
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button size="sm" onClick={() => { setForm({ subjectId: '', gradeId: '', assessmentType: 'test', weightPercentage: '20', term: '1' }); setDialogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add Weighting
          </Button>
        )}
      </div>

      {weightings.length === 0 ? (
        <EmptyState icon={Scale} title="No weightings" description="No subject weightings have been configured." />
      ) : (
        <DataTable columns={columns} data={weightings} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Subject Weighting</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Subject</Label>
              <Select value={form.subjectId} onValueChange={(v: unknown) => setForm((f) => ({ ...f, subjectId: v as string }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grade</Label>
              <Select value={form.gradeId} onValueChange={(v: unknown) => setForm((f) => ({ ...f, gradeId: v as string }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>{grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assessment Type</Label>
              <Select value={form.assessmentType} onValueChange={(v: unknown) => setForm((f) => ({ ...f, assessmentType: v as string }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{ASSESSMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Weight (%)</Label>
                <Input type="number" min={0} max={100} value={form.weightPercentage} onChange={(e) => setForm((f) => ({ ...f, weightPercentage: e.target.value }))} />
              </div>
              <div>
                <Label>Term</Label>
                <Input type="number" min={1} max={4} value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!form.subjectId || !form.gradeId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
