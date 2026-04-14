'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CreateStructurePayload } from '@/types';

interface FormValues {
  name: string;
  subjectId: string;
  subjectNameFreetext: string;
  classId: string;
  term: string;
  academicYear: number;
}

const CURRENT_YEAR = new Date().getFullYear();

const FORM_DEFAULTS: FormValues = {
  name: '',
  subjectId: '',
  subjectNameFreetext: '',
  classId: '',
  term: '1',
  academicYear: CURRENT_YEAR,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateStructurePayload) => Promise<unknown>;
}

export function CreateStructureDialog({ open, onClose, onCreate }: Props) {
  const user = useAuthStore((s) => s.user);
  const isStandalone = (user as unknown as { isStandaloneTeacher?: boolean })?.isStandaloneTeacher === true;

  const { classes } = useTeacherClasses();
  const { subjects } = useTeacherSubjects();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ defaultValues: FORM_DEFAULTS });

  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      reset(FORM_DEFAULTS);
      setSubmitError('');
    }
  }, [open, reset]);

  const watchSubjectId = watch('subjectId');
  const watchClassId = watch('classId');
  const watchTerm = watch('term');

  const resolvedSubjectName = (): string => {
    if (isStandalone) return watch('subjectNameFreetext');
    const found = subjects.find((s) => s.id === watchSubjectId);
    return found?.name ?? '';
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitError('');
    try {
      const payload: CreateStructurePayload = {
        name: data.name,
        subjectId: isStandalone ? null : (data.subjectId || null),
        subjectName: resolvedSubjectName(),
        classId: isStandalone ? null : (data.classId || null),
        term: parseInt(data.term, 10),
        academicYear: data.academicYear,
      };
      await onCreate(payload);
      onClose();
    } catch (err: unknown) {
      setSubmitError((err as { message?: string })?.message ?? 'Failed to create structure');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Assessment Structure</DialogTitle>
          <DialogDescription>
            Set up a new term assessment structure for mark capturing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Name */}
            <div>
              <Label htmlFor="cs-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cs-name"
                placeholder="e.g. Grade 10 Maths – Term 2"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Subject */}
            {isStandalone ? (
              <div>
                <Label htmlFor="cs-subject-text">
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cs-subject-text"
                  placeholder="e.g. Mathematics"
                  {...register('subjectNameFreetext', { required: 'Subject is required' })}
                />
                {errors.subjectNameFreetext && (
                  <p className="text-xs text-destructive mt-1">{errors.subjectNameFreetext.message}</p>
                )}
              </div>
            ) : (
              <div>
                <Label>
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watchSubjectId}
                  onValueChange={(val: unknown) => setValue('subjectId', val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Class (hidden for standalone) */}
            {!isStandalone && (
              <div>
                <Label>Class</Label>
                <Select
                  value={watchClassId}
                  onValueChange={(val: unknown) => setValue('classId', val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select class (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Term + Academic Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  Term <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watchTerm}
                  onValueChange={(val: unknown) => setValue('term', val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((t) => (
                      <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cs-year">
                  Academic Year <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cs-year"
                  type="number"
                  min={2020}
                  max={2050}
                  {...register('academicYear', {
                    required: 'Year is required',
                    valueAsNumber: true,
                  })}
                />
                {errors.academicYear && (
                  <p className="text-xs text-destructive mt-1">{errors.academicYear.message}</p>
                )}
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-destructive">{submitError}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Structure'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
