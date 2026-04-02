'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useClasses, useSubjects, useAssessments } from '@/hooks/useAcademics';
import { useAssessmentMutations } from '@/hooks/useAcademicMutations';
import { formatDate } from '@/lib/utils';
import type { Assessment } from '@/types';

const ASSESSMENT_TYPES = ['test', 'exam', 'assignment', 'practical', 'project'] as const;

interface AssessmentForm {
  name: string; subjectId: string; classId: string; type: string;
  totalMarks: string; weight: string; term: string; academicYear: string; date: string;
}

const TYPE_COLORS: Record<string, string> = {
  test: 'default', exam: 'destructive', assignment: 'secondary', practical: 'outline', project: 'outline',
};

function getTypeBadgeVariant(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  return (TYPE_COLORS[type] as 'default' | 'secondary' | 'destructive' | 'outline') ?? 'secondary';
}

export function AssessmentsTab() {
  const { classes } = useClasses();
  const { subjects } = useSubjects();
  const { createAssessment, updateAssessment, deleteAssessment } = useAssessmentMutations();

  const [filterClassId, setFilterClassId] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const { assessments, loading, refetch } = useAssessments({
    classId: filterClassId || undefined,
    term: filterTerm ? Number(filterTerm) : undefined,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [form, setForm] = useState<AssessmentForm>({
    name: '', subjectId: '', classId: '', type: 'test',
    totalMarks: '100', weight: '20', term: '1', academicYear: '2026', date: '',
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: '', subjectId: '', classId: '', type: 'test', totalMarks: '100', weight: '20', term: '1', academicYear: '2026', date: '' });
    setDialogOpen(true);
  }

  function openEdit(a: Assessment) {
    setEditing(a);
    const aRec = a as unknown as Record<string, unknown>;
    const subRef = aRec.subjectId as Record<string, unknown> | string | undefined;
    const clsRef = aRec.classId as Record<string, unknown> | string | undefined;
    const sid = typeof subRef === 'string' ? subRef : (subRef?._id as string) ?? '';
    const cid = typeof clsRef === 'string' ? clsRef : (clsRef?._id as string) ?? '';
    setForm({
      name: a.name, subjectId: sid, classId: cid, type: a.type,
      totalMarks: String(a.totalMarks), weight: String(a.weight),
      term: String(a.term), academicYear: String(aRec.academicYear ?? 2026),
      date: a.date ? a.date.substring(0, 10) : '',
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    try {
      const payload = {
        name: form.name, subjectId: form.subjectId, classId: form.classId,
        type: form.type, totalMarks: Number(form.totalMarks), weight: Number(form.weight),
        term: Number(form.term), academicYear: Number(form.academicYear),
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
      };
      if (editing) {
        await updateAssessment(editing.id, payload);
        toast.success('Assessment updated');
      } else {
        await createAssessment(payload);
        toast.success('Assessment created');
      }
      setDialogOpen(false);
      refetch();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save assessment'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAssessment(id);
      toast.success('Assessment deleted');
      refetch();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete assessment'));
    }
  }

  function getSubjectName(a: Assessment): string {
    if (a.subject?.name) return a.subject.name;
    if (typeof a.subjectId === 'object' && a.subjectId !== null) return ((a.subjectId as Record<string, unknown>).name as string) ?? '';
    return '';
  }

  function getClassName(a: Assessment): string {
    if (typeof a.classId === 'object' && a.classId !== null) return ((a.classId as Record<string, unknown>).name as string) ?? '';
    return '';
  }

  const columns: ColumnDef<Assessment>[] = [
    { accessorKey: 'name', header: 'Name' },
    { id: 'subject', header: 'Subject', accessorFn: (row) => getSubjectName(row) },
    { id: 'class', header: 'Class', accessorFn: (row) => getClassName(row) },
    {
      id: 'type', header: 'Type',
      cell: ({ row }) => <Badge variant={getTypeBadgeVariant(row.original.type)}>{row.original.type}</Badge>,
    },
    { accessorKey: 'totalMarks', header: 'Total' },
    { id: 'weight', header: 'Weight', accessorFn: (row) => `${row.weight}%` },
    { accessorKey: 'term', header: 'Term' },
    {
      id: 'date', header: 'Date',
      accessorFn: (row) => { try { return formatDate(row.date); } catch { return ''; } },
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)} aria-label="Edit assessment"><Pencil className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(row.original.id)} aria-label="Delete assessment"><Trash2 className="h-3 w-3 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={filterClassId} onValueChange={(v: unknown) => setFilterClassId(v as string)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.grade?.name ?? ''} {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTerm} onValueChange={(v: unknown) => setFilterTerm(v as string)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All terms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All terms</SelectItem>
            {[1, 2, 3, 4].map((t) => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> Add Assessment</Button>
      </div>

      <DataTable columns={columns} data={assessments} searchKey="name" searchPlaceholder="Search assessments..." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Assessment' : 'Add Assessment'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Term 1 Math Test" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Subject</Label>
                <Select value={form.subjectId} onValueChange={(v: unknown) => setForm((f) => ({ ...f, subjectId: v as string }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class</Label>
                <Select value={form.classId} onValueChange={(v: unknown) => setForm((f) => ({ ...f, classId: v as string }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.grade?.name ?? ''} {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v: unknown) => setForm((f) => ({ ...f, type: v as string }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSESSMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Total Marks</Label><Input type="number" min={1} value={form.totalMarks} onChange={(e) => setForm((f) => ({ ...f, totalMarks: e.target.value }))} /></div>
              <div><Label>Weight (%)</Label><Input type="number" min={0} max={100} value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} /></div>
              <div><Label>Term</Label><Input type="number" min={1} max={4} value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!form.name || !form.subjectId || !form.classId}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
