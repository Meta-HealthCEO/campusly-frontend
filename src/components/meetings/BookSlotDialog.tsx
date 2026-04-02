'use client';

import { useState } from 'react';
import { CalendarCheck, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { MeetingSlot, Student } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: MeetingSlot | null;
  children: Student[];
  onConfirm: (slotId: string, studentId: string, studentName: string) => Promise<void>;
}

export function BookSlotDialog({ open, onOpenChange, slot, children, onConfirm }: Props) {
  const [selectedChildId, setSelectedChildId] = useState('');
  const [booking, setBooking] = useState(false);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const handleConfirm = async () => {
    if (!slot || !selectedChild) return;
    setBooking(true);
    try {
      const name = `${selectedChild.firstName} ${selectedChild.lastName}`;
      await onConfirm(slot.id, selectedChild.id, name);
      setSelectedChildId('');
      onOpenChange(false);
    } finally {
      setBooking(false);
    }
  };

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Book Meeting Slot</DialogTitle>
          <DialogDescription>Confirm your meeting booking.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{slot.teacherName}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <span>{slot.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{slot.startTime} – {slot.endTime}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Which child is this meeting about? <span className="text-destructive">*</span></Label>
            <Select value={selectedChildId} onValueChange={(val: unknown) => setSelectedChildId(val as string)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select child" /></SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.firstName} {child.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedChildId || booking}>
            {booking ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
