'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SuspendTenantDialogProps {
  tenantName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function SuspendTenantDialog({
  tenantName,
  open,
  onOpenChange,
  onConfirm,
}: SuspendTenantDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend Tenant</DialogTitle>
          <DialogDescription>
            Are you sure you want to suspend <strong>{tenantName}</strong>?
            All users will lose access until the school is reactivated.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="suspend-reason">Reason (required)</Label>
          <Textarea
            id="suspend-reason"
            placeholder="Enter the reason for suspension..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || submitting}
          >
            {submitting ? 'Suspending...' : 'Confirm Suspension'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
