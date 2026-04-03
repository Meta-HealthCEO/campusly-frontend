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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AssignPayload, AssignmentType } from '@/types';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName: string;
  onSubmit: (data: AssignPayload) => Promise<void>;
}

interface FormValues {
  assignedToType: AssignmentType;
  assignedTo: string;
  notes: string;
}

const defaultValues: FormValues = {
  assignedToType: 'user',
  assignedTo: '',
  notes: '',
};

const ASSIGNMENT_TYPE_OPTIONS: { value: AssignmentType; label: string }[] = [
  { value: 'user', label: 'User' },
  { value: 'department', label: 'Department' },
  { value: 'location', label: 'Location' },
  { value: 'class', label: 'Class' },
];

const PLACEHOLDER_BY_TYPE: Record<AssignmentType, string> = {
  user: 'Staff or student ID',
  department: 'Department ID',
  location: 'Location ID',
  class: 'Class ID',
};

export function AssignmentDialog({
  open, onOpenChange, assetName, onSubmit,
}: AssignmentDialogProps) {
  const {
    register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues });

  const assignedToType = watch('assignedToType');

  useEffect(() => {
    if (open) reset(defaultValues);
  }, [open, reset]);

  const onFormSubmit = async (values: FormValues) => {
    const payload: AssignPayload = {
      assignedTo: values.assignedTo.trim(),
      assignedToType: values.assignedToType,
      notes: values.notes.trim() || undefined,
    };
    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Asset</DialogTitle>
          <DialogDescription>
            Assign <span className="font-medium">{assetName}</span> to a user, department, location, or class.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-2">
              <Label>Assignment Type <span className="text-destructive">*</span></Label>
              <Select
                value={assignedToType}
                onValueChange={(v: unknown) => setValue('assignedToType', v as AssignmentType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">
                Target ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="assignedTo"
                placeholder={PLACEHOLDER_BY_TYPE[assignedToType]}
                {...register('assignedTo', { required: 'Target ID is required' })}
              />
              {errors.assignedTo && (
                <p className="text-xs text-destructive">{errors.assignedTo.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter the ID of the {assignedToType} to assign this asset to.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Reason for assignment, handover notes..."
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
              {isSubmitting ? 'Assigning...' : 'Assign Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
