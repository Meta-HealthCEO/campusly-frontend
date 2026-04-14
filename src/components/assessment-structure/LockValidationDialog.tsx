'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { LockError } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  errors: LockError[];
}

export function LockValidationDialog({ open, onClose, errors }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            Cannot Lock — Missing Marks
          </DialogTitle>
          <DialogDescription>
            The following assessments have students with missing marks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues found.</p>
          ) : (
            <ul className="space-y-2">
              {errors.map((err, i) => (
                <li key={i} className="flex items-start justify-between gap-2 border rounded-md p-3">
                  <span className="text-sm font-medium truncate">{err.lineItem}</span>
                  <span className="text-sm text-destructive shrink-0 whitespace-nowrap">
                    {err.missingCount} student{err.missingCount !== 1 ? 's' : ''} missing
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
