'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface SubstituteDeclineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function SubstituteDeclineDialog({
  open, onOpenChange, onConfirm,
}: SubstituteDeclineDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason('');
      setError('');
      setSubmitting(false);
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    if (reason.trim().length === 0) {
      setError('Reason is required');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      handleOpenChange(false);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decline Substitute</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2 space-y-2">
          <Label htmlFor="decline-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="decline-reason"
            placeholder="Explain why this substitute assignment is being declined"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            rows={4}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Declining...' : 'Decline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
