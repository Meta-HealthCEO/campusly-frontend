'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { DAY_LABELS, resolveId } from '@/components/timetable/timetable-helpers';
import type { TimetableSlot, Subject, SchoolClass, DayOfWeek } from '@/types';
import type { PeriodTime } from '@/types/timetable-builder';
import type { CreateSlotPayload } from '@/hooks/useTeacherTimetableManager';

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
  subjectsLoading: boolean;
  classesLoading: boolean;
  existingSlot: TimetableSlot | null;
  onSave: (data: CreateSlotPayload) => Promise<void>;
  onUpdate: (id: string, data: Partial<CreateSlotPayload>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function getClassGradeId(cls: SchoolClass | undefined): string {
  if (!cls) return '';
  return (
    resolveId((cls as unknown as { gradeId?: unknown }).gradeId) ||
    resolveId((cls as unknown as { grade?: unknown }).grade)
  );
}

function subjectMatchesGrade(subject: Subject, gradeId: string): boolean {
  if (!gradeId) return true;

  const gradeIds = (subject as unknown as { gradeIds?: unknown[] }).gradeIds;
  if (Array.isArray(gradeIds) && gradeIds.length > 0) {
    return gradeIds.some((id) => resolveId(id) === gradeId);
  }

  const subjectGradeId = resolveId((subject as unknown as { gradeId?: unknown }).gradeId);
  return subjectGradeId ? subjectGradeId === gradeId : true;
}

export function TimetableSlotDialog({
  open,
  onOpenChange,
  day,
  period,
  periodTime,
  subjects,
  classes,
  subjectsLoading,
  classesLoading,
  existingSlot,
  onSave,
  onUpdate,
  onDelete,
}: Props) {
  const isEditing = Boolean(existingSlot);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { subjectId: '', classId: '', room: '' },
  });

  const selectedClassId = watch('classId');
  const selectedSubjectId = watch('subjectId');
  const selectedClass = useMemo(
    () => classes.find((cls) => resolveId(cls) === selectedClassId),
    [classes, selectedClassId],
  );
  const selectedGradeId = getClassGradeId(selectedClass);
  const subjectOptions = useMemo(
    () => subjects.filter((subject) => subjectMatchesGrade(subject, selectedGradeId)),
    [subjects, selectedGradeId],
  );

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (existingSlot) {
      reset({
        subjectId: resolveId(existingSlot.subjectId),
        classId: resolveId(existingSlot.classId),
        room: existingSlot.room ?? '',
      });
    } else {
      reset({ subjectId: '', classId: '', room: '' });
    }
  }, [open, existingSlot, reset]);

  useEffect(() => {
    if (!selectedSubjectId) return;
    if (subjectOptions.some((subject) => resolveId(subject) === selectedSubjectId)) return;
    setValue('subjectId', '', { shouldValidate: true });
  }, [selectedSubjectId, subjectOptions, setValue]);

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
    if (!subjectOptions.some((subject) => resolveId(subject) === values.subjectId)) {
      toast.error('Select a subject that belongs to this class grade');
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
        room: values.room.trim() || undefined,
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
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(existingSlot.id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  const timeLabel = periodTime
    ? `${periodTime.startTime} - ${periodTime.endTime}`
    : '';

  const bothDoneLoading = !subjectsLoading && !classesLoading;
  const missingData = bothDoneLoading && (subjects.length === 0 || classes.length === 0);
  const stillLoading = subjectsLoading || classesLoading;

  const missingItems = [
    subjects.length === 0 ? 'subjects' : '',
    classes.length === 0 ? 'classes' : '',
  ].filter(Boolean).join(' and ');

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { setConfirmDelete(false); onOpenChange(v); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Timetable Slot</DialogTitle>
          <DialogDescription>
            {DAY_LABELS[day]} &middot; Period {period} {timeLabel && `(${timeLabel})`}
          </DialogDescription>
        </DialogHeader>

        {stillLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : missingData ? (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive space-y-2">
            <p className="font-medium">Setup required</p>
            <p>You need to add {missingItems} before creating timetable entries.</p>
          </div>
        ) : (
          <form
            key={existingSlot?.id ?? 'new'}
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1"
          >
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="classId">Class <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('classId') || ''}
                  onValueChange={(v: unknown) => setValue('classId', v as string, { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c: SchoolClass) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.classId && (
                  <p className="text-xs text-destructive">{errors.classId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjectId">Subject <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('subjectId') || ''}
                  onValueChange={(v: unknown) => setValue('subjectId', v as string, { shouldValidate: true })}
                  disabled={Boolean(selectedClassId) && subjectOptions.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((s: Subject) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClassId && subjectOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No subjects are linked to this class grade yet.
                  </p>
                )}
                {errors.subjectId && (
                  <p className="text-xs text-destructive">{errors.subjectId.message}</p>
                )}
              </div>

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
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="sm:mr-auto"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Remove?' : 'Remove'}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => { setConfirmDelete(false); onOpenChange(false); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || missingData || (Boolean(selectedClassId) && subjectOptions.length === 0)}>
                {submitting ? 'Saving...' : isEditing ? 'Update' : 'Add Slot'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
