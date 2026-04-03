'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { AdmissionStatus } from '@/types/admissions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationNumber: string;
  fromStatus: AdmissionStatus;
  toStatus: AdmissionStatus;
  onConfirm: (notes: string, notifyParent: boolean) => Promise<void>;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export function StatusUpdateDialog({
  open,
  onOpenChange,
  applicationNumber,
  fromStatus,
  toStatus,
  onConfirm,
}: Props) {
  const [notes, setNotes] = useState('');
  const [notifyParent, setNotifyParent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(notes, notifyParent);
      setNotes('');
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Status update failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Move Application</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Move <strong>{applicationNumber}</strong> from{' '}
            <strong>{statusLabel(fromStatus)}</strong> to{' '}
            <strong>{statusLabel(toStatus)}</strong>?
          </p>
          <div className="space-y-2">
            <Label htmlFor="statusNotes">Notes (optional)</Label>
            <Textarea
              id="statusNotes"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Add notes about this status change..."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="notifyParent"
              checked={notifyParent}
              onCheckedChange={(checked: boolean) => setNotifyParent(checked)}
            />
            <Label htmlFor="notifyParent">Notify parent by email</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Moving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
