'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { EventRecord } from './types';

interface DeleteEventDialogProps {
  event: EventRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => Promise<void>;
  onSuccess?: () => void;
}

export function DeleteEventDialog({ event, open, onOpenChange, onDelete, onSuccess }: DeleteEventDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      await onDelete(event.id);
      toast.success('Event deleted');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete event';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Event</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{event?.title}</strong>? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
