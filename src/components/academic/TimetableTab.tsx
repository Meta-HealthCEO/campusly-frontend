'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useClasses, useSubjects, useStaff, useTimetable } from '@/hooks/useAcademics';
import { useTimetableMutations } from '@/hooks/useAcademicMutations';
import { useCan } from '@/hooks/useCan';
import { useTimetableClashes } from '@/hooks/useTimetableClashes';
import { ClashDetector } from '@/components/academic/ClashDetector';
import type { TimetableSlot } from '@/types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri',
};

interface SlotForm {
  day: string; period: string; startTime: string; endTime: string;
  subjectId: string; teacherId: string; room: string;
}

export function TimetableTab() {
  const { classes } = useClasses();
  const { subjects } = useSubjects();
  const { staff } = useStaff();
  const { createSlot, deleteSlot } = useTimetableMutations();
  const { clashes, loading: clashLoading, hasChecked, checkClashes } = useTimetableClashes();
  const canManage = useCan('manage_academic_setup');

  const [selectedClassId, setSelectedClassId] = useState('');
  const { entries, loading, refetch } = useTimetable(selectedClassId || undefined);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SlotForm>({
    day: 'monday', period: '1', startTime: '07:45', endTime: '08:30',
    subjectId: '', teacherId: '', room: '',
  });

  function openCreate(day?: string, period?: number) {
    setForm({
      day: day ?? 'monday',
      period: String(period ?? 1),
      startTime: '07:45', endTime: '08:30',
      subjectId: '', teacherId: '', room: '',
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!selectedClassId) { toast.error('Select a class first'); return; }
    try {
      await createSlot({
        classId: selectedClassId,
        day: form.day,
        period: Number(form.period),
        startTime: form.startTime,
        endTime: form.endTime,
        subjectId: form.subjectId,
        teacherId: form.teacherId,
        room: form.room || undefined,
      });
      toast.success('Timetable slot created');
      setDialogOpen(false);
      refetch();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create slot. It may already exist for this period.'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSlot(id);
      toast.success('Slot deleted');
      refetch();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete slot'));
    }
  }

  const periods = [...new Set(entries.map((e) => e.period))].sort((a, b) => a - b);
  if (periods.length === 0) for (let i = 1; i <= 8; i++) periods.push(i);

  const getSlot = (day: string, period: number): TimetableSlot | undefined =>
    entries.find((e) => e.day === day && e.period === period);

  const getSubjectName = (slot: TimetableSlot): string => {
    if (slot.subject?.name) return slot.subject.name;
    if (typeof slot.subjectId === 'object' && slot.subjectId !== null) {
      return ((slot.subjectId as Record<string, unknown>).name as string) ?? 'Subject';
    }
    return 'Subject';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Class:</span>
          <Select value={selectedClassId} onValueChange={(v: unknown) => setSelectedClassId(v as string)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.grade?.name ?? ''} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedClassId && canManage && (
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="mr-1 h-4 w-4" /> Add Slot
          </Button>
        )}
      </div>

      <ClashDetector
        clashes={clashes}
        loading={clashLoading}
        hasChecked={hasChecked}
        onCheck={checkClashes}
      />

      {!selectedClassId ? (
        <EmptyState icon={Calendar} title="Select a class" description="Choose a class to view or edit its timetable." />
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-medium text-muted-foreground w-16">Period</th>
                  {DAYS.map((d) => (
                    <th key={d} className="p-2 text-left font-medium text-muted-foreground">{DAY_LABELS[d]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period} className="border-b last:border-0">
                    <td className="p-2 font-medium">P{period}</td>
                    {DAYS.map((day) => {
                      const slot = getSlot(day, period);
                      if (!slot) return (
                        <td key={day} className="p-1">
                          {canManage ? (
                            <button
                              onClick={() => openCreate(day, period)}
                              className="w-full rounded border border-dashed p-2 text-xs text-muted-foreground hover:bg-muted/50"
                            >+</button>
                          ) : (
                            <div className="w-full rounded border border-dashed p-2 text-xs text-muted-foreground/40" />
                          )}
                        </td>
                      );
                      return (
                        <td key={day} className="p-1">
                          <div className="rounded bg-primary/10 p-2 relative group">
                            <p className="text-xs font-medium">{getSubjectName(slot)}</p>
                            <p className="text-xs text-muted-foreground">{slot.startTime}-{slot.endTime}</p>
                            {slot.room && <p className="text-xs text-muted-foreground">{slot.room}</p>}
                            {canManage && (
                              <button
                                onClick={() => handleDelete(slot.id)}
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Timetable Slot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Day</Label>
                <Select value={form.day} onValueChange={(v: unknown) => setForm((f) => ({ ...f, day: v as string }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => <SelectItem key={d} value={d}>{DAY_LABELS[d]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Period</Label>
                <Input type="number" min={1} value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time</Label><Input value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} placeholder="07:45" /></div>
              <div><Label>End Time</Label><Input value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} placeholder="08:30" /></div>
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={form.subjectId} onValueChange={(v: unknown) => setForm((f) => ({ ...f, subjectId: v as string }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teacher</Label>
              <Select value={form.teacherId} onValueChange={(v: unknown) => setForm((f) => ({ ...f, teacherId: v as string }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Room (optional)</Label><Input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="B12" /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!form.subjectId || !form.teacherId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
