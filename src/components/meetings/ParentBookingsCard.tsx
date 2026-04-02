'use client';

import { CalendarCheck, Clock, MapPin, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import type { MeetingSlot } from '@/types';

interface Props {
  bookings: MeetingSlot[];
  onCancel: (slotId: string) => void;
}

function isFuture(date: string, time: string): boolean {
  const now = new Date();
  const slotDate = new Date(`${date}T${time}`);
  return slotDate > now;
}

export function ParentBookingsCard({ bookings, onCancel }: Props) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No bookings yet"
        description="Book a meeting slot with a teacher below."
      />
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {bookings.map((slot) => {
        const canCancel = isFuture(slot.date, slot.startTime) && slot.status === 'booked';
        return (
          <Card key={slot.id} size="sm">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="truncate">{slot.teacherName}</span>
                <Badge variant={slot.status === 'completed' ? 'secondary' : 'default'}>
                  {slot.status === 'completed' ? 'Completed' : 'Upcoming'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarCheck className="h-4 w-4 shrink-0" />
                <span>{slot.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{slot.startTime} – {slot.endTime}</span>
              </div>
              {slot.bookedBy?.studentName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{slot.bookedBy.studentName}</span>
                </div>
              )}
              {slot.meetingType === 'virtual' && slot.meetingLink && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <a href={slot.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate">
                    Virtual Meeting Link
                  </a>
                </div>
              )}
              {canCancel && (
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onCancel(slot.id)}>
                  <X className="mr-1 h-3.5 w-3.5" />Cancel Booking
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
