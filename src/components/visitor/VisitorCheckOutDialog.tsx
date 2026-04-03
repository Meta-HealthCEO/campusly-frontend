'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { VisitorRecord } from '@/types';

interface VisitorCheckOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitor: VisitorRecord | null;
  onConfirm: (id: string, notes?: string) => Promise<void>;
  saving: boolean;
}

export function VisitorCheckOutDialog({
  open, onOpenChange, visitor, onConfirm, saving,
}: VisitorCheckOutDialogProps) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) setNotes('');
  }, [open]);

  if (!visitor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Check Out Visitor</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">{visitor.firstName} {visitor.lastName}</p>
            <p className="text-xs text-muted-foreground">Pass: {visitor.passNumber}</p>
            <p className="text-xs text-muted-foreground">
              Checked in: {new Date(visitor.checkInTime).toLocaleTimeString()}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Checkout Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about the visit..."
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={() => onConfirm(visitor.id ?? visitor._id ?? '', notes || undefined)} disabled={saving}>
            {saving ? 'Checking out...' : 'Confirm Check Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
