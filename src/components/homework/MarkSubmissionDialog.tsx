'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validateManualMark } from '@/lib/homework-grading';

export interface MarkTarget {
  submissionId: string;
  studentName: string;
  maxMarks: number;
  mark?: number | null;
  feedback?: string;
}

interface Props {
  target: MarkTarget | null;
  onOpenChange: (open: boolean) => void;
  onSave: (submissionId: string, mark: number, feedback?: string) => Promise<boolean>;
}

/** Enter or change one learner's homework mark by hand. */
export function MarkSubmissionDialog({ target, onOpenChange, onSave }: Props) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark {target?.studentName ?? ''}</DialogTitle>
        </DialogHeader>
        {target ? <MarkForm key={target.submissionId} target={target} onClose={() => onOpenChange(false)} onSave={onSave} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function MarkForm({ target, onClose, onSave }: { target: MarkTarget; onClose: () => void; onSave: Props['onSave'] }) {
  const [mark, setMark] = useState(target.mark === undefined || target.mark === null ? '' : String(target.mark));
  const [feedback, setFeedback] = useState(target.feedback ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const checked = validateManualMark(mark, target.maxMarks);
    if ('error' in checked) {
      setError(checked.error);
      return;
    }
    setSaving(true);
    const ok = await onSave(target.submissionId, checked.value, feedback.trim());
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto py-2">
        <div className="space-y-2">
          <Label htmlFor="manual-mark">
            Mark out of <span className="font-mono tabular-nums">{target.maxMarks}</span> <span className="text-destructive">*</span>
          </Label>
          <Input
            id="manual-mark"
            inputMode="decimal"
            value={mark}
            onChange={(e) => { setMark(e.target.value); setError(null); }}
            className="w-full font-mono sm:w-32"
            aria-invalid={error !== null}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual-feedback">Feedback for the learner (optional)</Label>
          <Textarea id="manual-feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving} className="min-h-11 sm:min-h-9">Cancel</Button>
        <Button onClick={() => void save()} disabled={saving} className="min-h-11 sm:min-h-9">Save mark</Button>
      </DialogFooter>
    </>
  );
}
