'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface AllergenWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorMessage: string;
  onOverride: () => void;
  submitting: boolean;
}

export function AllergenWarningDialog({
  open, onOpenChange, errorMessage, onOverride, submitting,
}: AllergenWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Allergen Conflict Detected
          </DialogTitle>
          <DialogDescription>
            {errorMessage}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">This requires staff authorization.</p>
          <p className="mt-1">
            Only proceed if you have verified with a parent or guardian that this override is acceptable.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel Order
          </Button>
          <Button
            variant="destructive"
            onClick={onOverride}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : 'Proceed with Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
