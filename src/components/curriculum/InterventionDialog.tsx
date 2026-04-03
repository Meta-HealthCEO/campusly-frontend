'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CurriculumIntervention, InterventionStatus } from '@/types';

interface InterventionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intervention: CurriculumIntervention | null;
  onSubmit: (id: string, data: { status: InterventionStatus; notes?: string }) => Promise<void>;
}

const STATUS_OPTIONS: { value: InterventionStatus; label: string }[] = [
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
];

export function InterventionDialog({
  open,
  onOpenChange,
  intervention,
  onSubmit,
}: InterventionDialogProps) {
  const [status, setStatus] = useState<InterventionStatus>('acknowledged');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && intervention) {
      const next: InterventionStatus =
        intervention.status === 'active' ? 'acknowledged' : 'resolved';
      setStatus(next);
      setNotes(intervention.notes ?? '');
    }
  }, [open, intervention]);

  if (!intervention) return null;

  const teacherName = `${intervention.teacherId.firstName} ${intervention.teacherId.lastName}`;
  const subjectName = intervention.planId.subjectId.name;
  const gradeName = intervention.planId.gradeId.name;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(intervention.id, {
        status,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Update Intervention</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Read-only details */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Teacher</p>
                <p className="font-medium truncate">{teacherName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Subject / Grade</p>
                <p className="truncate">{subjectName} &middot; {gradeName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Weeks Behind</p>
                <p className="text-destructive font-semibold">{intervention.weeksBehind}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Pacing</p>
                <p>
                  <span className="text-destructive font-semibold">{intervention.pacingPercent}%</span>
                  <span className="text-muted-foreground"> / {intervention.expectedPercent}% expected</span>
                </p>
              </div>
            </div>
            {intervention.reason && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Reason</p>
                <p className="text-muted-foreground">{intervention.reason}</p>
              </div>
            )}
          </div>

          {/* Editable fields */}
          <div className="space-y-2">
            <Label htmlFor="intervention-status">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select
              value={status}
              onValueChange={(val: unknown) => setStatus(val as InterventionStatus)}
            >
              <SelectTrigger id="intervention-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intervention-notes">Notes</Label>
            <Textarea
              id="intervention-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context or action plan..."
              rows={4}
              className="w-full resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
