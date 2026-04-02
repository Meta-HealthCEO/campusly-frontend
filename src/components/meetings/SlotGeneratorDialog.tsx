'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { MeetingDay, Teacher } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingDay: MeetingDay;
  teachers: Teacher[];
  onGenerate: (meetingDayId: string, teacherId: string, teacherName: string) => Promise<unknown>;
}

function calcSlotCount(start: string, end: string, duration: number): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  return totalMinutes > 0 ? Math.floor(totalMinutes / duration) : 0;
}

export function SlotGeneratorDialog({ open, onOpenChange, meetingDay, teachers, onGenerate }: Props) {
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [generating, setGenerating] = useState(false);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const slotCount = calcSlotCount(meetingDay.startTime, meetingDay.endTime, meetingDay.slotDuration);

  const handleGenerate = async () => {
    if (!selectedTeacher) return;
    setGenerating(true);
    try {
      const name = `${selectedTeacher.user.firstName} ${selectedTeacher.user.lastName}`;
      await onGenerate(meetingDay.id, selectedTeacher.id, name);
      onOpenChange(false);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate Slots</DialogTitle>
          <DialogDescription>
            Generate time slots for a teacher on {meetingDay.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Teacher <span className="text-destructive">*</span></Label>
            <Select value={selectedTeacherId} onValueChange={(val: unknown) => setSelectedTeacherId(val as string)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.user.firstName} {t.user.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTeacherId && (
            <p className="text-sm text-muted-foreground">
              This will create <span className="font-semibold">{slotCount}</span> slots
              ({meetingDay.slotDuration} min each, {meetingDay.startTime} – {meetingDay.endTime}).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={!selectedTeacherId || generating}>
            <Zap className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : 'Generate Slots'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
