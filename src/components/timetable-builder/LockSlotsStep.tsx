'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Lock, Calendar } from 'lucide-react';
import { TimetableGrid } from './TimetableGrid';
import type {
  TimetableConfig, LockedSlot, SchoolClass, Subject, Teacher, TbTimetableEntry,
} from '@/types';

function teacherName(t: Teacher): string {
  return `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || 'Unknown';
}

interface LockSlotsStepProps {
  config: TimetableConfig | null;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  lockedSlots: LockedSlot[];
  onLock: (slot: LockedSlot) => void;
  onUnlock: (day: string, period: number) => void;
}

export function LockSlotsStep({
  config,
  classes,
  subjects,
  teachers,
  lockedSlots,
  onLock,
  onUnlock,
}: LockSlotsStepProps) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDay, setDialogDay] = useState('');
  const [dialogPeriod, setDialogPeriod] = useState(0);
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');

  const classSlots = lockedSlots.filter((s) => s.classId === selectedClassId);

  const entries: TbTimetableEntry[] = classSlots.map((s) => {
    const teacher = teachers.find((t) => t.id === s.teacherId);
    return {
      classId: s.classId,
      day: s.day,
      period: s.period,
      subjectId: s.subjectId,
      subjectName: subjects.find((sub) => sub.id === s.subjectId)?.name ?? 'Locked',
      teacherId: s.teacherId,
      teacherName: teacher ? teacherName(teacher) : '',
    };
  });

  function handleCellClick(day: string, period: number) {
    const existing = classSlots.find((s) => s.day === day && s.period === period);
    if (existing) {
      onUnlock(day, period);
      return;
    }
    setDialogDay(day);
    setDialogPeriod(period);
    setFormSubjectId('');
    setFormTeacherId('');
    setDialogOpen(true);
  }

  function handleLock() {
    if (!formSubjectId || !formTeacherId || !selectedClassId) return;
    onLock({
      classId: selectedClassId,
      day: dialogDay,
      period: dialogPeriod,
      subjectId: formSubjectId,
      teacherId: formTeacherId,
    });
    setDialogOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Class:</span>
        <Select value={selectedClassId} onValueChange={(v: unknown) => setSelectedClassId(v as string)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.gradeName ?? c.grade?.name ?? ''} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {classSlots.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            {classSlots.length} locked
          </div>
        )}
      </div>

      {!selectedClassId ? (
        <EmptyState
          icon={Calendar}
          title="Select a class"
          description="Choose a class to lock specific timetable slots."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Lock Slots — Click empty cells to lock, click locked cells to unlock
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TimetableGrid
              entries={entries}
              config={config}
              onCellClick={handleCellClick}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>
              Lock Slot — {dialogDay.charAt(0).toUpperCase() + dialogDay.slice(1)} P{dialogPeriod}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            <div>
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select value={formSubjectId || 'placeholder'} onValueChange={(v: unknown) => setFormSubjectId((v as string) === 'placeholder' ? '' : (v as string))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select subject</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teacher <span className="text-destructive">*</span></Label>
              <Select value={formTeacherId || 'placeholder'} onValueChange={(v: unknown) => setFormTeacherId((v as string) === 'placeholder' ? '' : (v as string))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select teacher</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{teacherName(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleLock} disabled={!formSubjectId || !formTeacherId}>
              <Lock className="mr-1 h-4 w-4" /> Lock Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
