'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { CheckInPayload, AssetCondition } from '@/types';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  onSubmit: (data: CheckInPayload) => Promise<void>;
}

interface FormValues {
  conditionIn: AssetCondition | '';
  notes: string;
}

const defaultValues: FormValues = {
  conditionIn: '',
  notes: '',
};

const CONDITION_OPTIONS: { value: AssetCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
];

export function CheckInDialog({
  open, onOpenChange, assetName, onSubmit,
}: CheckInDialogProps) {
  const {
    register, handleSubmit, setValue, watch, reset, formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues });

  const conditionIn = watch('conditionIn');

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, reset]);

  const onFormSubmit = async (values: FormValues) => {
    const payload: CheckInPayload = {
      conditionIn: values.conditionIn || undefined,
      notes: values.notes.trim() || undefined,
    };
    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check In Asset</DialogTitle>
          <DialogDescription>
            Record the return of <span className="font-medium">{assetName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-2">
              <Label>Condition on Return</Label>
              <Select
                value={conditionIn || 'none'}
                onValueChange={(v: unknown) => setValue('conditionIn', v === 'none' ? '' : v as AssetCondition)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assessed</SelectItem>
                  {CONDITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes on return condition, any damage observed..."
                rows={4}
                {...register('notes')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Checking In...' : 'Confirm Check In'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
