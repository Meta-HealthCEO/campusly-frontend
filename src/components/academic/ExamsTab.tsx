'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pencil, Trash2, BookOpen, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useGrades, useSubjects, useStaff, useExams, useExamSlots } from '@/hooks/useAcademics';
import { useExamMutations, useExamSlotMutations } from '@/hooks/useAcademicMutationsExtended';
import { useCan } from '@/hooks/useCan';
import type { Exam, ExamSlot } from '@/hooks/useAcademics';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  scheduled: 'secondary', in_progress: 'default', completed: 'outline',
};

export function ExamsTab() {
  const { grades } = useGrades();
  const { subjects } = useSubjects();
  const { staff } = useStaff();
  const { createExam, updateExam, deleteExam } = useExamMutations();
  const { createExamSlot, deleteExamSlot } = useExamSlotMutations();
  const canManage = useCan('manage_academic_setup');

  const { exams, loading, refetch: fetchExams } = useExams();
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examForm, setExamForm] = useState({ name: '', term: '1', year: '2026', startDate: '', endDate: '', status: 'scheduled' });

  // Exam timetable state
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const { slots, loading: slotsLoading, refetch: refetchSlots } = useExamSlots(selectedExam?.id ?? null);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({
    subjectId: '', gradeId: '', date: '', startTime: '09:00', endTime: '11:00',
    venue: '', invigilator: '', duration: '120',
  });

  async function handleExamSubmit() {
    try {
      const payload = {
        name: examForm.name, term: Number(examForm.term), year: Number(examForm.year),
        startDate: new Date(examForm.startDate).toISOString(), endDate: new Date(examForm.endDate).toISOString(),
        status: examForm.status,
      };
      if (editingExam) {
        await updateExam(editingExam.id, payload);
        toast.success('Exam updated');
      } else {
        await createExam(payload);
        toast.success('Exam created');
      }
      setExamDialogOpen(false);
      fetchExams();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save exam'));
    }
  }

  async function handleExamDelete(id: string) {
    try { await deleteExam(id); toast.success('Exam deleted'); fetchExams(); }
    catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete exam'));
    }
  }

  async function handleSlotSubmit() {
    if (!selectedExam) return;
    try {
      await createExamSlot({
        examId: selectedExam.id, subjectId: slotForm.subjectId, gradeId: slotForm.gradeId,
        date: new Date(slotForm.date).toISOString(), startTime: slotForm.startTime, endTime: slotForm.endTime,
        venue: slotForm.venue, invigilator: slotForm.invigilator, duration: Number(slotForm.duration),
      });
      toast.success('Exam slot created');
      setSlotDialogOpen(false);
      refetchSlots();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create slot'));
    }
  }

  async function handleSlotDelete(id: string) {
    if (!selectedExam) return;
    try { await deleteExamSlot(id); toast.success('Slot deleted'); refetchSlots(); }
    catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete slot'));
    }
  }

  if (loading) return <LoadingSpinner />;

  if (selectedExam) {
    const slotCols: ColumnDef<ExamSlot>[] = [
      { id: 'date', header: 'Date', accessorFn: (r) => { try { return formatDate(r.date); } catch { return r.date; } } },
      { accessorKey: 'subjectName', header: 'Subject' },
      { accessorKey: 'gradeName', header: 'Grade' },
      { id: 'time', header: 'Time', accessorFn: (r) => `${r.startTime} - ${r.endTime}` },
      { accessorKey: 'venue', header: 'Venue' },
      { accessorKey: 'invigilatorName', header: 'Invigilator' },
      { id: 'dur', header: 'Duration', accessorFn: (r) => `${r.duration} min` },
      { id: 'actions', header: '', cell: ({ row }) => canManage ? (
        <Button variant="ghost" size="icon-sm" onClick={() => handleSlotDelete(row.original.id)} aria-label="Delete slot"><Trash2 className="h-3 w-3 text-destructive" /></Button>
      ) : null },
    ];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedExam(null)}>Back</Button>
          <h3 className="text-lg font-semibold">{selectedExam.name} - Exam Timetable</h3>
          {canManage && (
            <Button size="sm" onClick={() => { setSlotForm({ subjectId: '', gradeId: '', date: '', startTime: '09:00', endTime: '11:00', venue: '', invigilator: '', duration: '120' }); setSlotDialogOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Add Slot
            </Button>
          )}
        </div>
        {slotsLoading ? <LoadingSpinner /> : <DataTable columns={slotCols} data={slots} />}
        <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Add Exam Slot</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Subject</Label><Select value={slotForm.subjectId} onValueChange={(v: unknown) => setSlotForm((f) => ({ ...f, subjectId: v as string }))}><SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Grade</Label><Select value={slotForm.gradeId} onValueChange={(v: unknown) => setSlotForm((f) => ({ ...f, gradeId: v as string }))}><SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label>Date</Label><Input type="date" value={slotForm.date} onChange={(e) => setSlotForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Start</Label><Input value={slotForm.startTime} onChange={(e) => setSlotForm((f) => ({ ...f, startTime: e.target.value }))} /></div>
                <div><Label>End</Label><Input value={slotForm.endTime} onChange={(e) => setSlotForm((f) => ({ ...f, endTime: e.target.value }))} /></div>
                <div><Label>Duration (min)</Label><Input type="number" min={1} value={slotForm.duration} onChange={(e) => setSlotForm((f) => ({ ...f, duration: e.target.value }))} /></div>
              </div>
              <div><Label>Venue</Label><Input value={slotForm.venue} onChange={(e) => setSlotForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Hall A" /></div>
              <div><Label>Invigilator</Label><Select value={slotForm.invigilator} onValueChange={(v: unknown) => setSlotForm((f) => ({ ...f, invigilator: v as string }))}><SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <DialogFooter><Button onClick={handleSlotSubmit} disabled={!slotForm.subjectId || !slotForm.gradeId}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button size="sm" onClick={() => { setEditingExam(null); setExamForm({ name: '', term: '1', year: '2026', startDate: '', endDate: '', status: 'scheduled' }); setExamDialogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add Exam
          </Button>
        )}
      </div>
      {exams.length === 0 ? (
        <EmptyState icon={BookOpen} title="No exams" description="No exam periods have been created." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{exam.name}</span>
                  <Badge variant={STATUS_COLORS[exam.status] ?? 'secondary'}>{exam.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Term {exam.term} | {exam.year}</p>
                <p className="text-xs text-muted-foreground">
                  {(() => { try { return `${formatDate(exam.startDate)} - ${formatDate(exam.endDate)}`; } catch { return ''; } })()}
                </p>
                <div className="flex gap-1 pt-1">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedExam(exam); }}><Eye className="mr-1 h-3 w-3" /> Timetable</Button>
                  {canManage && (
                    <>
                      <Button variant="ghost" size="icon-sm" onClick={() => { setEditingExam(exam); setExamForm({ name: exam.name, term: String(exam.term), year: String(exam.year), startDate: exam.startDate?.substring(0, 10) ?? '', endDate: exam.endDate?.substring(0, 10) ?? '', status: exam.status }); setExamDialogOpen(true); }} aria-label="Edit exam"><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleExamDelete(exam.id)} aria-label="Delete exam"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingExam ? 'Edit Exam' : 'Add Exam'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={examForm.name} onChange={(e) => setExamForm((f) => ({ ...f, name: e.target.value }))} placeholder="Term 2 June Exams" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Term</Label><Input type="number" min={1} max={4} value={examForm.term} onChange={(e) => setExamForm((f) => ({ ...f, term: e.target.value }))} /></div>
              <div><Label>Year</Label><Input type="number" min={2000} value={examForm.year} onChange={(e) => setExamForm((f) => ({ ...f, year: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={examForm.startDate} onChange={(e) => setExamForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={examForm.endDate} onChange={(e) => setExamForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div><Label>Status</Label><Select value={examForm.status} onValueChange={(v: unknown) => setExamForm((f) => ({ ...f, status: v as string }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button onClick={handleExamSubmit} disabled={!examForm.name}>{editingExam ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
