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
import type { SIPPlan, CreateSIPPlanPayload } from '@/types';

interface SIPPlanCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SIPPlan | null;
  onSubmit: (data: CreateSIPPlanPayload) => Promise<void>;
  onUpdate?: (id: string, data: Partial<SIPPlan>) => Promise<void>;
}

interface FormValues {
  title: string;
  year: number;
  description: string;
  startDate: string;
  endDate: string;
}

export function SIPPlanCreateDialog({
  open, onOpenChange, plan, onSubmit, onUpdate,
}: SIPPlanCreateDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = plan !== null;

  useEffect(() => {
    if (open) {
      reset(
        plan
          ? {
              title: plan.title,
              year: plan.year,
              description: plan.description ?? '',
              startDate: plan.startDate.slice(0, 10),
              endDate: plan.endDate.slice(0, 10),
            }
          : { title: '', year: new Date().getFullYear(), description: '', startDate: '', endDate: '' },
      );
    }
  }, [open, plan, reset]);

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload: CreateSIPPlanPayload = {
        title: values.title,
        year: Number(values.year),
        description: values.description || undefined,
        startDate: values.startDate,
        endDate: values.endDate,
      };
      if (isEdit && onUpdate) {
        await onUpdate(plan.id, payload);
      } else {
        await onSubmit(payload);
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit SIP Plan' : 'Create SIP Plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label htmlFor="sip-title">Title <span className="text-destructive">*</span></Label>
              <Input id="sip-title" {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="sip-year">Year <span className="text-destructive">*</span></Label>
              <Input
                id="sip-year"
                type="number"
                {...register('year', { required: 'Year is required', min: { value: 2000, message: 'Invalid year' } })}
              />
              {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
            </div>
            <div>
              <Label htmlFor="sip-description">Description</Label>
              <Textarea id="sip-description" rows={3} {...register('description')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sip-start">Start Date <span className="text-destructive">*</span></Label>
                <Input
                  id="sip-start"
                  type="date"
                  {...register('startDate', { required: 'Start date is required' })}
                />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div>
                <Label htmlFor="sip-end">End Date <span className="text-destructive">*</span></Label>
                <Input
                  id="sip-end"
                  type="date"
                  {...register('endDate', { required: 'End date is required' })}
                />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
