'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api-client';
import type { ApiConsentForm } from './types';

interface ConsentDeclineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ApiConsentForm | null;
  parentId: string;
  studentId: string;
  onSuccess: () => void;
}

export function ConsentDeclineDialog({
  open, onOpenChange, form, parentId, studentId, onSuccess,
}: ConsentDeclineDialogProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleDecline() {
    if (!form) return;
    setSubmitting(true);
    try {
      await apiClient.post('/consent/responses', {
        formId: form.id,
        studentId,
        parentId,
        response: 'denied',
        notes: notes.trim() || undefined,
      });
      toast.success('Consent form declined.');
      setNotes('');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to decline consent form';
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already')) {
        toast.error('You have already responded to this form.');
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Decline Consent</DialogTitle>
          <DialogDescription>
            You are declining consent for &quot;{form?.title}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cd-notes">Reason / Notes (optional)</Label>
            <Textarea
              id="cd-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optionally provide a reason..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDecline}
            disabled={submitting}
          >
            {submitting ? 'Declining...' : 'Decline Consent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
