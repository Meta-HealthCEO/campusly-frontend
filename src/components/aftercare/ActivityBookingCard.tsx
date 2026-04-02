'use client';

import { Users, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AfterCareActivity } from '@/hooks/aftercare-types';
import { getUserName } from '@/hooks/aftercare-types';

interface ActivityBookingCardProps {
  activity: AfterCareActivity;
  onBook: (activityId: string) => void;
  onCancel: (activityId: string) => void;
  isBooked: boolean;
  booking?: boolean;
}

export function ActivityBookingCard({
  activity,
  onBook,
  onCancel,
  isBooked,
  booking,
}: ActivityBookingCardProps) {
  const capacity = (activity as unknown as Record<string, unknown>).capacity as number ?? 0;
  const bookedCount = activity.studentIds?.length ?? 0;
  const isFull = capacity > 0 && bookedCount >= capacity;

  const capacityPercent = capacity > 0 ? Math.round((bookedCount / capacity) * 100) : 0;
  const capacityColor =
    capacityPercent >= 90
      ? 'bg-destructive/10 text-destructive'
      : capacityPercent >= 70
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate">{activity.name}</span>
          <Badge variant="secondary">{activity.activityType.replace('_', ' ')}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {activity.startTime} - {activity.endTime}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {getUserName(activity.supervisorId)}
          </div>
        </div>

        {activity.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
        )}

        {capacity > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{bookedCount}/{capacity} booked</span>
              <Badge className={capacityColor}>{capacityPercent}%</Badge>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  capacityPercent >= 90 ? 'bg-destructive' : capacityPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(capacityPercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          {isBooked ? (
            <Button variant="outline" size="sm" onClick={() => onCancel(activity.id)} disabled={booking}>
              {booking ? 'Cancelling...' : 'Cancel Booking'}
            </Button>
          ) : (
            <Button size="sm" onClick={() => onBook(activity.id)} disabled={isFull || booking}>
              {isFull ? 'Full' : booking ? 'Booking...' : 'Book'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
