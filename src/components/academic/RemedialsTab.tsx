'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useSubjects, useRemedials } from '@/hooks/useAcademics';
import type { RemedialRecord } from '@/hooks/useAcademics';
import { formatDate } from '@/lib/utils';
import type { Student } from '@/types';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  identified: 'destructive' as 'default', in_progress: 'secondary', resolved: 'outline',
};

export function RemedialsTab() {
  const { subjects } = useSubjects();
  const { records, students, loading, refetch: fetchRecords, schoolId } = useRemedials();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RemedialRecord | null>(null);
  const [form, setForm] = useState({
    studentId: '', subjectId: '', identifiedDate: '',
    areas: '', interventions: '', progress: '',
    status: 'identified', reviewDate: '',
  });

  function openCreate() {
    setEditing(null);
    setForm({ studentId: '', subjectId: '', identifiedDate: new Date().toISOString().substring(0, 10), areas: '', interventions: '', progress: '', status: 'identified', reviewDate: '' });
    setDialogOpen(true);
  }

  function openEdit(r: RemedialRecord) {
    setEditing(r);
    setForm({
      studentId: r.studentId, subjectId: r.subjectId,
      identifiedDate: r.identifiedDate?.substring(0, 10) ?? '',
      areas: r.areas.join(', '), interventions: r.interventions.join(', '),
      progress: r.progress.join(', '), status: r.status,
      reviewDate: r.reviewDate?.substring(0, 10) ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const areasArr = form.areas.split(',').map((s) => s.trim()).filter(Boolean);
    const interventionsArr = form.interventions.split(',').map((s) => s.trim()).filter(Boolean);
    const progressArr = form.progress.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const payload = {
        studentId: form.studentId, subjectId: form.subjectId, schoolId,
        identifiedDate: new Date(form.identifiedDate).toISOString(),
        areas: areasArr, interventions: interventionsArr, progress: progressArr,
        status: form.status,
        reviewDate: form.reviewDate ? new Date(form.reviewDate).toISOString() : undefined,
      };
      if (editing) {
        await apiClient.put(`/academic/remedials/${editing.id}`, payload);
        toast.success('Remedial record updated');
      } else {
        await apiClient.post('/academic/remedials', payload);
        toast.success('Remedial record created');
      }
      setDialogOpen(false);
      fetchRecords();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save remedial record'));
    }
  }

  async function handleDelete(id: string) {
    try { await apiClient.delete(`/academic/remedials/${id}`); toast.success('Record deleted'); fetchRecords(); }
    catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete record'));
    }
  }

  function getStudentName(s: Student): string {
    const u = (s.user ?? (s.userId as unknown as Record<string, unknown> | undefined) ?? (s as unknown as Record<string, unknown>));
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  }

  const columns: ColumnDef<RemedialRecord>[] = [
    { accessorKey: 'studentName', header: 'Student' },
    { accessorKey: 'subjectName', header: 'Subject' },
    { id: 'date', header: 'Identified', accessorFn: (r) => { try { return formatDate(r.identifiedDate); } catch { return ''; } } },
    { id: 'status', header: 'Status', cell: ({ row }) => <Badge variant={STATUS_VARIANTS[row.original.status] ?? 'secondary'}>{row.original.status.replace('_', ' ')}</Badge> },
    { id: 'areas', header: 'Areas', accessorFn: (r) => r.areas.length },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(row.original)}><Pencil className="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
      </div>
    )},
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> Add Remedial</Button>
      </div>
      {records.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No remedial records" description="No remedial tracking records exist." />
      ) : (
        <DataTable columns={columns} data={records} searchKey="studentName" searchPlaceholder="Search student..." />
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Remedial Record' : 'Add Remedial Record'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Student</Label>
                <Select value={form.studentId} onValueChange={(v: unknown) => setForm((f) => ({ ...f, studentId: v as string }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{getStudentName(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={form.subjectId} onValueChange={(v: unknown) => setForm((f) => ({ ...f, subjectId: v as string }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Identified Date</Label><Input type="date" value={form.identifiedDate} onChange={(e) => setForm((f) => ({ ...f, identifiedDate: e.target.value }))} /></div>
              <div><Label>Status</Label><Select value={form.status} onValueChange={(v: unknown) => setForm((f) => ({ ...f, status: v as string }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="identified">Identified</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Areas of Concern (comma-separated)</Label><Textarea value={form.areas} onChange={(e) => setForm((f) => ({ ...f, areas: e.target.value }))} placeholder="Number operations, Fractions" /></div>
            <div><Label>Interventions (comma-separated)</Label><Textarea value={form.interventions} onChange={(e) => setForm((f) => ({ ...f, interventions: e.target.value }))} placeholder="Extra worksheets, Peer tutoring" /></div>
            <div><Label>Progress Notes (comma-separated)</Label><Textarea value={form.progress} onChange={(e) => setForm((f) => ({ ...f, progress: e.target.value }))} placeholder="Improved on fractions" /></div>
            <div><Label>Review Date (optional)</Label><Input type="date" value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSubmit} disabled={!form.studentId || !form.subjectId || !form.areas}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
