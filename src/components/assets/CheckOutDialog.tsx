'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CheckOutPayload } from '@/types';

interface CheckOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  onSubmit: (data: CheckOutPayload) => Promise<void>;
}

interface FormValues {
  borrowerId: string;
  purpose: string;
  expectedReturnDate: string;
  notes: string;
}

const defaultValues: FormValues = {
  borrowerId: '',
  purpose: '',
  expectedReturnDate: '',
  notes: '',
};

export function CheckOutDialog({
  open, onOpenChange, assetName, onSubmit,
}: CheckOutDialogProps) {
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues });

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, reset]);

  const onFormSubmit = async (values: FormValues) => {
    const payload: CheckOutPayload = {
      borrowerId: values.borrowerId.trim(),
      purpose: values.purpose.trim(),
      expectedReturnDate: values.expectedReturnDate,
      notes: values.notes.trim() || undefined,
    };
    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check Out Asset</DialogTitle>
          <DialogDescription>
            Check out <span className="font-medium">{assetName}</span> to a borrower.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="borrowerId">
                Borrower ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="borrowerId"
                placeholder="Staff or student ID"
                {...register('borrowerId', { required: 'Borrower ID is required' })}
              />
              {errors.borrowerId && (
                <p className="text-xs text-destructive">{errors.borrowerId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">
                Purpose <span className="text-destructive">*</span>
              </Label>
              <Input
                id="purpose"
                placeholder="e.g. Grade 10 Science lesson"
                {...register('purpose', { required: 'Purpose is required' })}
              />
              {errors.purpose && (
                <p className="text-xs text-destructive">{errors.purpose.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedReturnDate">
                Expected Return Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expectedReturnDate"
                type="date"
                {...register('expectedReturnDate', { required: 'Return date is required' })}
              />
              {errors.expectedReturnDate && (
                <p className="text-xs text-destructive">{errors.expectedReturnDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Condition at check-out, special instructions..."
                rows={3}
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Checking Out...' : 'Check Out'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
