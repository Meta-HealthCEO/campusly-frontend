'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api-client';
import { feeTypeSchema, type FeeTypeFormData } from '@/lib/validations';

interface CreateFeeTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSuccess: () => void;
}

export function CreateFeeTypeDialog({ open, onOpenChange, schoolId, onSuccess }: CreateFeeTypeDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeeTypeFormData>({
    resolver: zodResolver(feeTypeSchema),
  });

  const onSubmit = async (data: FeeTypeFormData) => {
    try {
      await apiClient.post('/fees/types', { ...data, schoolId });
      toast.success('Fee type added successfully!');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create fee type';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Fee Type
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Fee Type</DialogTitle>
          <DialogDescription>Create a new fee type for invoicing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} placeholder="Fee type name" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register('description')} placeholder="Description (optional)" />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (cents)</Label>
            <Input id="amount" type="number" {...register('amount', { valueAsNumber: true })} placeholder="e.g. 450000" />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select onValueChange={(val: unknown) => setValue('frequency', val as FeeTypeFormData['frequency'])}>
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
            <Select onValueChange={(val: unknown) => setValue('category', val as FeeTypeFormData['category'])}>
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
              {isSubmitting ? 'Adding...' : 'Add Fee Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
