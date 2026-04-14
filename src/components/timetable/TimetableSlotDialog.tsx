'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { TimetableSlot, Subject, SchoolClass } from '@/types';
import type { PeriodTime } from '@/types/timetable-builder';
import type { CreateSlotPayload } from '@/hooks/useTeacherTimetableManager';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday',
};

interface FormValues {
  subjectId: string;
  classId: string;
  room: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: DayOfWeek;
  period: number;
  periodTime: PeriodTime | null;
  subjects: Subject[];
  classes: SchoolClass[];
  existingSlot: TimetableSlot | null;
  onSave: (data: CreateSlotPayload) => Promise<void>;
  onUpdate: (id: string, data: Partial<CreateSlotPayload>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/** Extract ID from a field that may be a populated object or a plain string. */
function resolveId(field: unknown): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object' && 'id' in field) return String((field as { id: string }).id);
  if (field && typeof field === 'object' && '_id' in field) return String((field as { _id: string })._id);
  return '';
}

export function TimetableSlotDialog({
  open, onOpenChange, day, period, periodTime,
  subjects, classes, existingSlot,
  onSave, onUpdate, onDelete,
}: Props) {
  const isEditing = Boolean(existingSlot);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { subjectId: '', classId: '', room: '' },
  });

  useEffect(() => {
    if (open) {
      if (existingSlot) {
        reset({
          subjectId: resolveId(existingSlot.subjectId),
          classId: resolveId(existingSlot.classId),
          room: existingSlot.room ?? '',
        });
      } else {
        reset({ subjectId: '', classId: '', room: '' });
      }
    }
  }, [open, existingSlot, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!periodTime) return;
    if (!values.subjectId) {
      toast.error('Please select a subject');
      return;
    }
    if (!values.classId) {
      toast.error('Please select a class');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateSlotPayload = {
        day,
        period,
        startTime: periodTime.startTime,
        endTime: periodTime.endTime,
        subjectId: values.subjectId,
        classId: values.classId,
        room: values.room || undefined,
      };
      if (existingSlot) {
        await onUpdate(existingSlot.id, payload);
      } else {
        await onSave(payload);
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSlot) return;
    setDeleting(true);
    try {
      await onDelete(existingSlot.id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  const timeLabel = periodTime
    ? `${periodTime.startTime} – ${periodTime.endTime}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Timetable Slot</DialogTitle>
          <DialogDescription>
            {DAY_LABELS[day]} &middot; Period {period} {timeLabel && `(${timeLabel})`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subjectId">Subject <span className="text-destructive">*</span></Label>
              <Select
                value={watch('subjectId') || undefined}
                onValueChange={(v: unknown) => setValue('subjectId', v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subjectId && (
                <p className="text-xs text-destructive">{errors.subjectId.message}</p>
              )}
            </div>

            {/* Class */}
            <div className="space-y-2">
              <Label htmlFor="classId">Class <span className="text-destructive">*</span></Label>
              <Select
                value={watch('classId') || undefined}
                onValueChange={(v: unknown) => setValue('classId', v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.classId && (
                <p className="text-xs text-destructive">{errors.classId.message}</p>
              )}
            </div>

            {/* Room */}
            <div className="space-y-2">
              <Label htmlFor="room">Room (optional)</Label>
              <Input
                id="room"
                placeholder="e.g. Room 12"
                {...register('room')}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            {isEditing && (
              <Button
                type="button" variant="destructive" onClick={handleDelete}
                disabled={deleting} className="sm:mr-auto"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEditing ? 'Update' : 'Add Slot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
