'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useScheduleMutations, extractErrorMessage } from '@/hooks/useFeeMutations';
import type { FeeSchedule } from './FeeScheduleSection';

interface DeleteScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: FeeSchedule | null;
  onSuccess: () => void;
}

export function DeleteScheduleDialog({ open, onOpenChange, schedule, onSuccess }: DeleteScheduleDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const { deleteSchedule } = useScheduleMutations();

  const handleDelete = async () => {
    if (!schedule) return;
    const schedId = schedule._id ?? schedule.id;
    setDeleting(true);
    try {
      await deleteSchedule(schedId);
      toast.success('Schedule deleted successfully!');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete schedule'));
    } finally {
      setDeleting(false);
    }
  };

  const scheduleName = schedule
    ? typeof schedule.feeTypeId === 'object'
      ? schedule.feeTypeId.name
      : 'this schedule'
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Schedule</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the schedule for &quot;{scheduleName}&quot;?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
