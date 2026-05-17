'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Switch } from '@/components/ui/switch';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import type { Grade } from '@/types';

interface ClassFormData {
  name: string;
  gradeId: string;
  capacity: number;
  subjectId?: string | null;
  isHomeroom: boolean;
}

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; gradeId: string; capacity: number; subjectId?: string | null; isHomeroom: boolean }) => Promise<void>;
  grades: Grade[];
  initialData?: { name: string; gradeId: string; capacity: number; subjectId?: string | null; isHomeroom?: boolean };
  isLoading: boolean;
  copyMode?: 'class' | 'teachingGroup';
}

export function ClassFormDialog({
  open,
  onOpenChange,
  onSubmit,
  grades,
  initialData,
  isLoading,
  copyMode = 'class',
}: ClassFormDialogProps) {
  const isTeachingGroup = copyMode === 'teachingGroup';
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<ClassFormData>({
    defaultValues: {
      name: initialData?.name ?? '',
      gradeId: initialData?.gradeId ?? '',
      capacity: initialData?.capacity ?? 35,
      subjectId: initialData?.subjectId,
      isHomeroom: initialData?.isHomeroom ?? false,
    },
  });

  const selectedGradeId = watch('gradeId');
  const selectedSubjectId = watch('subjectId');
  const isHomeroom = watch('isHomeroom');
  const { subjects, loading: subjectsLoading } = useTeacherSubjects(open && selectedGradeId ? selectedGradeId : undefined);

  useEffect(() => {
    register('gradeId', { required: 'Grade is required' });
    register('subjectId');
  }, [register]);

  useEffect(() => {
    if (open) {
      reset({
        name: initialData?.name ?? '',
        gradeId: initialData?.gradeId ?? '',
        capacity: initialData?.capacity ?? 35,
        subjectId: initialData?.subjectId,
        isHomeroom: initialData?.isHomeroom ?? false,
      });
    }
  }, [open, initialData, reset]);

  useEffect(() => {
    if (!open || subjectsLoading || !selectedSubjectId) return;
    const subjectStillValid = (subjects ?? []).some((subject) => subject.id === selectedSubjectId);
    if (!subjectStillValid) {
      setValue('subjectId', undefined, { shouldDirty: true, shouldValidate: true });
    }
  }, [open, selectedSubjectId, setValue, subjects, subjectsLoading]);

  const [submitting, setSubmitting] = useState(false);

  const handleFormSubmit = async (data: ClassFormData) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload: { name: string; gradeId: string; capacity: number; subjectId?: string | null; isHomeroom: boolean } = {
        name: data.name,
        gradeId: data.gradeId,
        capacity: data.capacity,
        subjectId: data.subjectId && data.subjectId !== 'none' ? data.subjectId : null,
        isHomeroom: Boolean(data.isHomeroom),
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? isTeachingGroup ? 'Edit Teaching Group' : 'Edit Class'
              : isTeachingGroup ? 'Create Teaching Group' : 'Create Class'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 gap-4"
        >
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gradeId">
                Grade <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedGradeId ?? ''}
                onValueChange={(val: unknown) => {
                  const nextGradeId = val as string;
                  if (nextGradeId !== selectedGradeId) {
                    setValue('subjectId', undefined, { shouldDirty: true, shouldValidate: true });
                  }
                  setValue('gradeId', nextGradeId, { shouldDirty: true, shouldValidate: true });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gradeId && (
                <p className="text-xs text-destructive">Grade is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Subject{' '}
                <span className="text-muted-foreground text-xs">
                  {isTeachingGroup ? '(optional - use this to organise by subject)' : '(optional - leave blank for homeroom)'}
                </span>
              </Label>
              <Select
                value={selectedSubjectId ?? 'none'}
                onValueChange={(val: unknown) =>
                  setValue('subjectId', val === 'none' ? undefined : (val as string), { shouldDirty: true, shouldValidate: true })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isTeachingGroup ? 'No subject' : 'Homeroom (no subject)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isTeachingGroup ? 'No subject' : 'Homeroom (no subject)'}</SelectItem>
                  {(subjects ?? []).map((s: { id: string; name: string }) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!subjects || subjects.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  No subjects yet. Add subjects in Settings or during onboarding.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="className">
                {isTeachingGroup ? 'Group Name' : 'Class Name'} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="className"
                placeholder={isTeachingGroup ? 'e.g. Accounting A, Revision Group' : 'e.g. A, B, Red'}
                {...register('name', { required: isTeachingGroup ? 'Group name is required' : 'Class name is required' })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">{isTeachingGroup ? 'Expected Learners' : 'Capacity'}</Label>
              <Input
                id="capacity"
                type="number"
                {...register('capacity', {
                  valueAsNumber: true,
                  min: { value: 1, message: 'Expected learners must be at least 1' },
                  max: { value: 200, message: 'Expected learners cannot exceed 200' },
                })}
              />
              {errors.capacity && (
                <p className="text-xs text-destructive">{errors.capacity.message}</p>
              )}
              {isTeachingGroup && (
                <p className="text-xs text-muted-foreground">
                  You can leave this as an estimate. Learners can be added later when you want online assignments.
                </p>
              )}
            </div>

            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <Label htmlFor="isHomeroom" className="text-sm font-medium">
                  Set as my homeroom {isTeachingGroup ? 'group' : 'class'}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Only one {isTeachingGroup ? 'group' : 'class'} can be your homeroom at a time.
                </p>
              </div>
              <Switch
                id="isHomeroom"
                checked={isHomeroom}
                onCheckedChange={(checked: boolean) => setValue('isHomeroom', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || submitting}>
              {isLoading
                ? 'Saving...'
                : initialData
                  ? isTeachingGroup ? 'Update Group' : 'Update Class'
                  : isTeachingGroup ? 'Create Group' : 'Create Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
