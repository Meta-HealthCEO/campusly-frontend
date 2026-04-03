'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookingStatusBadge } from './BookingStatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { CalendarDays, CheckCircle, XCircle } from 'lucide-react';
import type { ConferenceBooking } from '@/types';

interface TeacherScheduleViewProps {
  bookings: ConferenceBooking[];
  onMarkStatus?: (booking: ConferenceBooking, status: 'completed' | 'no_show') => void;
}

export function TeacherScheduleView({ bookings, onMarkStatus }: TeacherScheduleViewProps) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No bookings yet"
        description="You have no bookings for this event."
      />
    );
  }

  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const totalConfirmed = bookings.filter((b) => b.status !== 'cancelled').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{completedCount} / {totalConfirmed} completed</span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: totalConfirmed > 0 ? `${(completedCount / totalConfirmed) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {booking.slotStartTime} – {booking.slotEndTime}
                    </span>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Parent:</span>{' '}
                    {booking.parentId.firstName} {booking.parentId.lastName}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Student:</span>{' '}
                    {booking.studentId.firstName} {booking.studentId.lastName}
                  </p>
                  {booking.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {booking.notes}
                    </p>
                  )}
                  {booking.location && (
                    <p className="text-xs text-muted-foreground">{booking.location}</p>
                  )}
                </div>
                {booking.status === 'confirmed' && onMarkStatus && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMarkStatus(booking, 'completed')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Done
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => onMarkStatus(booking, 'no_show')}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> No Show
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
