'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { TimeSlot } from '@/types';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
}

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: TimeSlot | null;
  teacherName: string;
  children: Child[];
  onConfirm: (data: { slotId: string; studentId: string; notes: string }) => Promise<void>;
  saving: boolean;
}

export function BookingDialog({
  open,
  onOpenChange,
  slot,
  teacherName,
  children,
  onConfirm,
  saving,
}: BookingDialogProps) {
  const [studentId, setStudentId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setStudentId(children.length === 1 ? children[0].id : '');
      setNotes('');
    }
  }, [open, children]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot || !studentId) return;
    await onConfirm({ slotId: slot.slotId, studentId, notes });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Confirm Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-1">
            <p className="text-sm"><strong>Teacher:</strong> {teacherName}</p>
            {slot && (
              <p className="text-sm">
                <strong>Time:</strong> {slot.startTime} – {slot.endTime}
                {slot.location && <> | <strong>Room:</strong> {slot.location}</>}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="child-select">
              Child <span className="text-destructive">*</span>
            </Label>
            <Select value={studentId} onValueChange={(v: unknown) => setStudentId(v as string)}>
              <SelectTrigger id="child-select" className="w-full">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="booking-notes">Notes (optional)</Label>
            <Textarea
              id="booking-notes"
              placeholder="Topics you'd like to discuss..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !studentId}>
            {saving ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
