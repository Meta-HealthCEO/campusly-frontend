'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useConsentMutations } from '@/hooks/useConsent';
import type { ApiConsentForm } from './types';

interface DeleteConsentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ApiConsentForm | null;
  onSuccess: () => void;
}

export function DeleteConsentFormDialog({
  open, onOpenChange, form, onSuccess,
}: DeleteConsentFormDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const { deleteForm } = useConsentMutations();

  async function handleDelete() {
    if (!form) return;
    setDeleting(true);
    try {
      await deleteForm(form.id);
      toast.success('Consent form deleted successfully!');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to delete consent form';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Consent Form</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{form?.title}&quot;?
            Parents will no longer see this form. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
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
