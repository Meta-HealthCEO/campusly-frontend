'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateSIPReviewPayload } from '@/types';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSIPReviewPayload) => Promise<void>;
}

interface FormValues {
  quarter: number;
  year: number;
  notes: string;
  completionPercent: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export function ReviewDialog({
  open,
  onOpenChange,
  onSubmit,
}: ReviewDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { quarter: 1, year: CURRENT_YEAR, completionPercent: 0 },
  });

  useEffect(() => {
    if (open) {
      reset({ quarter: 1, year: CURRENT_YEAR, notes: '', completionPercent: 0 });
    }
  }, [open, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await onSubmit({
        quarter: Number(values.quarter),
        year: Number(values.year),
        notes: values.notes,
        completionPercent: Number(values.completionPercent),
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Quarterly Review</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="review-quarter">
                  Quarter <span className="text-destructive">*</span>
                </Label>
                <Select
                  defaultValue="1"
                  onValueChange={(val: unknown) =>
                    setValue('quarter', Number(val as string))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="review-year">
                  Year <span className="text-destructive">*</span>
                </Label>
                <Select
                  defaultValue={String(CURRENT_YEAR)}
                  onValueChange={(val: unknown) =>
                    setValue('year', Number(val as string))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="review-completion">
                Completion % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="review-completion"
                type="number"
                min={0}
                max={100}
                {...register('completionPercent', {
                  required: 'Completion percent is required',
                  min: { value: 0, message: 'Minimum is 0' },
                  max: { value: 100, message: 'Maximum is 100' },
                })}
              />
              {errors.completionPercent && (
                <p className="text-xs text-destructive">
                  {errors.completionPercent.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="review-notes">
                Notes <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="review-notes"
                rows={4}
                placeholder="Review notes..."
                {...register('notes', { required: 'Notes are required' })}
              />
              {errors.notes && (
                <p className="text-xs text-destructive">{errors.notes.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
