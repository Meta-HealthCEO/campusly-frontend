'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ConferenceStatusBadge } from './ConferenceStatusBadge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import type { ConferenceEvent } from '@/types';

interface ConferenceEventCardProps {
  event: ConferenceEvent;
  onClick?: (event: ConferenceEvent) => void;
  actions?: React.ReactNode;
}

export function ConferenceEventCard({ event, onClick, actions }: ConferenceEventCardProps) {
  const dateLabel = new Date(event.date).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const totalSlots = event.totalSlots ?? 0;
  const bookedSlots = event.bookedSlots ?? 0;
  const pct = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      onClick={onClick ? () => onClick(event) : undefined}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold truncate">{event.title}</h3>
          <ConferenceStatusBadge status={event.status} />
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {dateLabel}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {event.startTime} – {event.endTime}
          </span>
          {event.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {event.venue}
            </span>
          )}
        </div>

        {totalSlots > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{bookedSlots} / {totalSlots} slots booked</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {event.slotDurationMinutes}min slots, {event.breakBetweenMinutes}min breaks
        </div>

        {actions && (
          <div className="flex flex-wrap gap-2 pt-1">{actions}</div>
        )}
      </CardContent>
    </Card>
  );
}
