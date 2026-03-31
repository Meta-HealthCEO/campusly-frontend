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
import apiClient from '@/lib/api-client';
import type { FeeType } from '@/types';

interface DeleteFeeTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeType: FeeType | null;
  onSuccess: () => void;
}

export function DeleteFeeTypeDialog({ open, onOpenChange, feeType, onSuccess }: DeleteFeeTypeDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!feeType) return;
    const feeId = feeType._id ?? feeType.id;
    setDeleting(true);
    try {
      await apiClient.delete(`/fees/types/${feeId}`);
      toast.success('Fee type deleted successfully!');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete fee type';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Fee Type</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{feeType?.name}&quot;? This action cannot be undone.
            Existing invoices will not be affected.
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
