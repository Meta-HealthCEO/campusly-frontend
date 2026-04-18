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
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import type { Grade } from '@/types';

interface ClassFormData {
  name: string;
  gradeId: string;
  capacity: number;
  subjectId?: string;
}

interface ClassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; gradeId: string; capacity: number; subjectId?: string }) => Promise<void>;
  grades: Grade[];
  initialData?: { name: string; gradeId: string; capacity: number; subjectId?: string };
  isLoading: boolean;
}

export function ClassFormDialog({
  open,
  onOpenChange,
  onSubmit,
  grades,
  initialData,
  isLoading,
}: ClassFormDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<ClassFormData>({
    defaultValues: initialData ?? { name: '', gradeId: '', capacity: 35 },
  });

  const selectedGradeId = watch('gradeId');
  // Fetch subjects filtered by the selected grade — only when the dialog is open
  const { subjects } = useTeacherSubjects(open && selectedGradeId ? selectedGradeId : undefined);

  useEffect(() => {
    if (open) {
      reset(initialData ?? { name: '', gradeId: '', capacity: 35 });
    }
  }, [open, initialData, reset]);

  const [submitting, setSubmitting] = useState(false);

  const handleFormSubmit = async (data: ClassFormData) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload: { name: string; gradeId: string; capacity: number; subjectId?: string } = {
        name: data.name,
        gradeId: data.gradeId,
        capacity: data.capacity,
      };
      if (data.subjectId && data.subjectId !== 'none') {
        payload.subjectId = data.subjectId;
      }
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
            {initialData ? 'Edit Class' : 'Create Class'}
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
                value={selectedGradeId}
                onValueChange={(val: unknown) =>
                  setValue('gradeId', val as string, { shouldValidate: true })
                }
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
                  (optional — leave blank for homeroom)
                </span>
              </Label>
              <Select
                onValueChange={(val: unknown) =>
                  setValue('subjectId', val === 'none' ? undefined : (val as string))
                }
                defaultValue={initialData?.subjectId ?? 'none'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Homeroom (no subject)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Homeroom (no subject)</SelectItem>
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
                Class Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="className"
                placeholder="e.g. A, B, Red"
                {...register('name', { required: 'Class name is required' })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                {...register('capacity', { valueAsNumber: true, min: 1 })}
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
                  ? 'Update Class'
                  : 'Create Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
