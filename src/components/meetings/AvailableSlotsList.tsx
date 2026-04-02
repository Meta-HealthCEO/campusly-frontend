'use client';

import { useMemo } from 'react';
import { Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MeetingSlot } from '@/types';

interface Props {
  slots: MeetingSlot[];
  onBook: (slot: MeetingSlot) => void;
  selectedSlotId?: string;
}

export function AvailableSlotsList({ slots, onBook, selectedSlotId }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, MeetingSlot[]>();
    for (const slot of slots) {
      const key = slot.teacherName;
      const existing = map.get(key) ?? [];
      existing.push(slot);
      map.set(key, existing);
    }
    return Array.from(map.entries());
  }, [slots]);

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No available slots for this meeting day.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([teacherName, teacherSlots]) => (
        <Card key={teacherName}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{teacherName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {teacherSlots.map((slot) => {
                const isBooked = slot.status === 'booked' || slot.status === 'completed';
                const isSelected = slot.id === selectedSlotId;
                return (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : ''
                    } ${isBooked ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {slot.startTime} – {slot.endTime}
                      </span>
                    </div>
                    {isBooked ? (
                      <Badge variant="secondary">Booked</Badge>
                    ) : (
                      <Button size="sm" onClick={() => onBook(slot)}>
                        Book
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
