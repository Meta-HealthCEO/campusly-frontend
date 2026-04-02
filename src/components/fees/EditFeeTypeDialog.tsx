'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useFeeTypeMutations, extractErrorMessage } from '@/hooks/useFeeMutations';
import { feeTypeSchema, type FeeTypeFormData } from '@/lib/validations';
import type { FeeType } from '@/types';

interface EditFeeTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeType: FeeType | null;
  onSuccess: () => void;
}

export function EditFeeTypeDialog({ open, onOpenChange, feeType, onSuccess }: EditFeeTypeDialogProps) {
  const { updateFeeType } = useFeeTypeMutations('');
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeeTypeFormData>({
    resolver: zodResolver(feeTypeSchema),
  });

  useEffect(() => {
    if (feeType && open) {
      reset({
        name: feeType.name,
        description: feeType.description ?? '',
        amount: feeType.amount,
        frequency: feeType.frequency,
        category: feeType.category,
      });
    }
  }, [feeType, open, reset]);

  const onSubmit = async (data: FeeTypeFormData) => {
    if (!feeType) return;
    const feeId = feeType._id ?? feeType.id;
    try {
      await updateFeeType(feeId, data);
      toast.success('Fee type updated successfully!');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update fee type'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Fee Type</DialogTitle>
          <DialogDescription>Update the fee type details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" {...register('name')} placeholder="Fee type name" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input id="edit-description" {...register('description')} placeholder="Description (optional)" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount (cents)</Label>
            <Input id="edit-amount" type="number" {...register('amount', { valueAsNumber: true })} placeholder="e.g. 450000" />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={feeType?.frequency}
              onValueChange={(val: unknown) => setValue('frequency', val as FeeTypeFormData['frequency'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once_off">Once Off</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="per_term">Per Term</SelectItem>
                <SelectItem value="per_year">Per Year</SelectItem>
              </SelectContent>
            </Select>
            {errors.frequency && <p className="text-xs text-destructive">{errors.frequency.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={feeType?.category}
              onValueChange={(val: unknown) => setValue('category', val as FeeTypeFormData['category'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tuition">Tuition</SelectItem>
                <SelectItem value="extramural">Extramural</SelectItem>
                <SelectItem value="camp">Camp</SelectItem>
                <SelectItem value="uniform">Uniform</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
