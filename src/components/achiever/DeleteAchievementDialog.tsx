'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { ApiAchievement } from '@/hooks/useAchiever';

interface DeleteAchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement: ApiAchievement | null;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteAchievementDialog({ open, onOpenChange, achievement, onConfirm }: DeleteAchievementDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!achievement) return;
    setDeleting(true);
    try {
      await onConfirm(achievement._id);
      toast.success('Achievement deleted');
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete achievement';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Achievement</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{achievement?.title}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
