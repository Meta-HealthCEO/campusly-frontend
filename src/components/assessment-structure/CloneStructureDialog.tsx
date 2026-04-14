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
import type { ClonePayload } from '@/types';

interface FormValues {
  name: string;
  term: string;
  academicYear: number;
}

const CURRENT_YEAR = new Date().getFullYear();

interface Props {
  open: boolean;
  onClose: () => void;
  onClone: (payload: ClonePayload) => Promise<unknown>;
  currentName: string;
}

export function CloneStructureDialog({ open, onClose, onClone, currentName }: Props) {
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', term: '1', academicYear: CURRENT_YEAR },
  });

  const watchTerm = watch('term');

  useEffect(() => {
    if (open) {
      reset({ name: `${currentName} (copy)`, term: '1', academicYear: CURRENT_YEAR });
      setSubmitError('');
    }
  }, [open, currentName, reset]);

  const onSubmit = async (data: FormValues) => {
    setSubmitError('');
    try {
      const payload: ClonePayload = {
        name: data.name,
        term: parseInt(data.term, 10),
        academicYear: data.academicYear,
      };
      await onClone(payload);
      onClose();
    } catch (err: unknown) {
      setSubmitError((err as { message?: string })?.message ?? 'Failed to clone structure');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone Structure</DialogTitle>
          <DialogDescription>Copy this structure to a new term or year.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div>
              <Label htmlFor="csd-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="csd-name"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label>
                Term <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchTerm}
                onValueChange={(val: unknown) => setValue('term', val as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((t) => (
                    <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="csd-year">
                Year <span className="text-destructive">*</span>
              </Label>
              <Input
                id="csd-year"
                type="number"
                {...register('academicYear', {
                  required: 'Year is required',
                  valueAsNumber: true,
                  min: { value: 2020, message: 'Year must be 2020 or later' },
                })}
              />
              {errors.academicYear && (
                <p className="text-xs text-destructive mt-1">{errors.academicYear.message}</p>
              )}
            </div>

            {submitError && (
              <p className="text-xs text-destructive">{submitError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Cloning…' : 'Clone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
