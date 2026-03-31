'use client';

import { useState } from 'react';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface ArchiveConfirmDialogProps {
  onConfirm: () => Promise<void>;
}

export function ArchiveConfirmDialog({ onConfirm }: ArchiveConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to archive items.';
      toast.error(msg);
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Archive className="mr-2 h-4 w-4" />
        Archive Old Items
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive Old Items</DialogTitle>
          <DialogDescription>
            This will archive all unclaimed found items that are older than 30 days.
            Archived items will be moved to the &ldquo;Archived&rdquo; tab and hidden
            from the parent gallery.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleArchive} disabled={archiving}>
            {archiving ? 'Archiving...' : 'Archive Items'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
