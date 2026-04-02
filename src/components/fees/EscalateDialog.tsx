'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useDebtMutations, extractErrorMessage } from '@/hooks/useFeeMutations';

interface EscalateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  studentName: string;
  onSuccess: () => void;
}

const stages = [
  { value: 'friendly_reminder', label: 'Friendly Reminder' },
  { value: 'warning_letter', label: 'Warning Letter' },
  { value: 'final_demand', label: 'Final Demand' },
  { value: 'legal_handover', label: 'Legal Handover' },
  { value: 'write_off', label: 'Write Off' },
];

export function EscalateDialog({
  open,
  onOpenChange,
  invoiceId,
  studentName,
  onSuccess,
}: EscalateDialogProps) {
  const [stage, setStage] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { escalateCollection } = useDebtMutations();

  const handleSubmit = async () => {
    if (!stage) {
      toast.error('Please select a collection stage');
      return;
    }
    setSubmitting(true);
    try {
      await escalateCollection({
        invoiceId,
        stage,
        notes: notes || undefined,
      });
      toast.success('Collection escalated successfully');
      setStage('');
      setNotes('');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to escalate collection'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escalate Collection</DialogTitle>
          <DialogDescription>
            Escalate collection for {studentName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Collection Stage</Label>
            <Select value={stage} onValueChange={(val: unknown) => setStage(val as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select stage..." />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="esc-notes">Notes (optional)</Label>
            <Textarea
              id="esc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Escalating...' : 'Escalate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
