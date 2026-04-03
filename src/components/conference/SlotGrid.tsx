'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TimeSlot } from '@/types';

interface SlotGridProps {
  slots: TimeSlot[];
  onSelectSlot?: (slot: TimeSlot) => void;
  myBookedSlotIds?: Set<string>;
}

export function SlotGrid({ slots, onSelectSlot, myBookedSlotIds }: SlotGridProps) {
  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">No time slots available.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {slots.map((slot) => {
        const isMine = myBookedSlotIds?.has(slot.slotId);
        const isAvailable = slot.status === 'available';
        const isBooked = slot.status === 'booked';

        return (
          <Button
            key={slot.slotId}
            variant="outline"
            size="sm"
            disabled={!isAvailable && !isMine}
            onClick={() => {
              if (isAvailable && onSelectSlot) onSelectSlot(slot);
            }}
            className={cn(
              'justify-center text-xs h-auto py-2',
              isAvailable && 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
              isBooked && !isMine && 'border-muted bg-muted text-muted-foreground opacity-60',
              isMine && 'border-primary bg-primary/10 text-primary',
            )}
          >
            {slot.startTime} – {slot.endTime}
            {isMine && <span className="ml-1 text-[10px]">(yours)</span>}
          </Button>
        );
      })}
    </div>
  );
}
