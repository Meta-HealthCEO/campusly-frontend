'use client';

import { useState } from 'react';
import { CheckCircle, Clock, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import type { MeetingSlot } from '@/types';

interface Props {
  slots: MeetingSlot[];
  onComplete: (slotId: string, notes?: string) => Promise<void>;
}

const statusStyles: Record<string, string> = {
  available: 'border-muted-foreground/30 bg-muted/30',
  booked: 'border-primary/40 bg-primary/5',
  completed: 'border-green-600/40 bg-green-50 dark:bg-green-950/20',
  cancelled: 'border-muted-foreground/20 bg-muted/10 opacity-50',
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  available: { label: 'Available', variant: 'outline' },
  booked: { label: 'Booked', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

export function TeacherScheduleView({ slots, onComplete }: Props) {
  const [completeDialogSlot, setCompleteDialogSlot] = useState<MeetingSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!completeDialogSlot) return;
    setSubmitting(true);
    try {
      await onComplete(completeDialogSlot.id, notes || undefined);
      setCompleteDialogSlot(null);
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No slots for this meeting day.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {slots.map((slot) => {
          const style = statusStyles[slot.status] ?? '';
          const badge = statusLabels[slot.status];
          return (
            <div
              key={slot.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border p-3 ${style}`}
            >
              <div className="flex items-center gap-2 min-w-0 shrink-0">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {slot.startTime} – {slot.endTime}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {slot.bookedBy ? (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{slot.bookedBy.parentName}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="truncate">{slot.bookedBy.studentName}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No booking</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                {slot.status === 'booked' && (
                  <Button size="sm" variant="outline" onClick={() => setCompleteDialogSlot(slot)}>
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />Complete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!completeDialogSlot} onOpenChange={(o) => { if (!o) setCompleteDialogSlot(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>Optional notes about this meeting</span>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Discussed homework performance..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogSlot(null)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={submitting}>
              {submitting ? 'Saving...' : 'Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
