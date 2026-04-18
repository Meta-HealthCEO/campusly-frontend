'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { addRecoveryLog } from '@/hooks/useInjuries';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  injuryId: string;
  onSuccess: () => void;
}

export function RecoveryLogDialog({ open, onOpenChange, injuryId, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState('');
  const [painLevel, setPainLevel] = useState('');
  const [mobilityScore, setMobilityScore] = useState('');
  const [activities, setActivities] = useState('');
  const [notes, setNotes] = useState('');
  const [nextMilestone, setNextMilestone] = useState('');

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${d}`);
    setPainLevel('');
    setMobilityScore('');
    setActivities('');
    setNotes('');
    setNextMilestone('');
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      toast.error('Date is required');
      return;
    }
    setSubmitting(true);
    try {
      const pain = painLevel ? Number.parseInt(painLevel, 10) : undefined;
      const mobility = mobilityScore ? Number.parseInt(mobilityScore, 10) : undefined;
      await addRecoveryLog(injuryId, {
        date: new Date(date).toISOString(),
        painLevel: Number.isFinite(pain) ? pain : undefined,
        mobilityScore: Number.isFinite(mobility) ? mobility : undefined,
        activitiesPerformed: activities
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        notes: notes.trim() || undefined,
        nextMilestone: nextMilestone.trim() || undefined,
      });
      onOpenChange(false);
      onSuccess();
    } catch {
      // toast handled in hook
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add recovery log</DialogTitle>
          <DialogDescription>Track progress on the player&apos;s recovery.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pain">Pain (0–10)</Label>
                <Input id="pain" type="number" min={0} max={10} value={painLevel} onChange={(e) => setPainLevel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobility">Mobility (0–10)</Label>
                <Input id="mobility" type="number" min={0} max={10} value={mobilityScore} onChange={(e) => setMobilityScore(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activities">Activities (comma-separated)</Label>
              <Input id="activities" value={activities} onChange={(e) => setActivities(e.target.value)} placeholder="e.g. stretching, light jog" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextMilestone">Next milestone</Label>
              <Input id="nextMilestone" value={nextMilestone} onChange={(e) => setNextMilestone(e.target.value)} placeholder="e.g. Jog pain-free by Friday" />
            </div>
          </div>
          <DialogFooter className="gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Add log'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
