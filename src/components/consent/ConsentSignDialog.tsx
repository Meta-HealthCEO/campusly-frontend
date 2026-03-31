'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { ConsentTypeBadge } from './ConsentTypeBadge';
import { ExternalLink } from 'lucide-react';
import apiClient from '@/lib/api-client';
import type { ApiConsentForm } from './types';

interface ConsentSignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ApiConsentForm | null;
  parentId: string;
  studentId: string;
  onSuccess: () => void;
}

export function ConsentSignDialog({
  open, onOpenChange, form, parentId, studentId, onSuccess,
}: ConsentSignDialogProps) {
  const [signature, setSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSign() {
    if (!form) return;
    setSubmitting(true);
    try {
      await apiClient.post('/consent/responses', {
        formId: form.id,
        studentId,
        parentId,
        response: 'granted',
        signature: signature.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Consent form signed successfully!');
      setSignature('');
      setNotes('');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to sign consent form';
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign Consent Form</DialogTitle>
          <DialogDescription>
            You are granting consent for the following form.
          </DialogDescription>
        </DialogHeader>
        {form && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{form.title}</h3>
                <ConsentTypeBadge type={form.type} />
              </div>
              {form.description && (
                <p className="text-sm text-muted-foreground">{form.description}</p>
              )}
              {form.attachmentUrl && (
                <a
                  href={form.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View attachment
                </a>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-sig">Typed Signature (optional)</Label>
              <Input
                id="cs-sig"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="e.g. S. Molefe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-notes">Notes (optional)</Label>
              <Textarea
                id="cs-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={submitting}>
            {submitting ? 'Signing...' : 'Grant Consent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
