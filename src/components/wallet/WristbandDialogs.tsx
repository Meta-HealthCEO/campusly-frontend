'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Link2, Unlink } from 'lucide-react';

// ---- Link Wristband Dialog ----

interface LinkWristbandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  onConfirm: (wristbandId: string) => Promise<void>;
}

export function LinkWristbandDialog({ open, onOpenChange, studentName, onConfirm }: LinkWristbandDialogProps) {
  const [wristbandId, setWristbandId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = wristbandId.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    await onConfirm(wristbandId.trim());
    setSubmitting(false);
    setWristbandId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setWristbandId(''); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Wristband - {studentName}</DialogTitle>
          <DialogDescription>
            Enter the wristband ID to link to this student.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="wristband-id">Wristband ID</Label>
            <Input
              id="wristband-id"
              type="text"
              placeholder="e.g. WB-00123"
              value={wristbandId}
              onChange={(e) => setWristbandId(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={!isValid || submitting} onClick={handleSubmit}>
            <Link2 className="h-4 w-4 mr-1" />
            {submitting ? 'Linking...' : 'Link Wristband'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Unlink Wristband Dialog ----

interface UnlinkWristbandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  wristbandId: string;
  onConfirm: () => Promise<void>;
}

export function UnlinkWristbandDialog({ open, onOpenChange, studentName, wristbandId, onConfirm }: UnlinkWristbandDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlink Wristband</DialogTitle>
          <DialogDescription>
            Remove wristband <strong>{wristbandId}</strong> from <strong>{studentName}</strong>?
            The student will no longer be able to use this wristband for purchases.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            <Unlink className="h-4 w-4 mr-1" />
            {submitting ? 'Unlinking...' : 'Unlink Wristband'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
