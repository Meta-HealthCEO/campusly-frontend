'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventTypeBadge } from './EventTypeBadge';
import { MapPin, Clock, Users, Ticket, Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { EventRecord } from './types';

interface EventCardProps {
  event: EventRecord;
  showActions?: boolean;
  onEdit?: (event: EventRecord) => void;
  onDelete?: (event: EventRecord) => void;
  onClick?: (event: EventRecord) => void;
}

export function EventCard({ event, showActions, onEdit, onDelete, onClick }: EventCardProps) {
  return (
    <Card
      className={`overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={() => onClick?.(event)}
    >
      <CardContent className="p-0">
        <div className="bg-primary/5 p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {formatDate(event.date, 'EEEE')}
          </p>
          <p className="text-3xl font-bold text-primary">
            {formatDate(event.date, 'dd')}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDate(event.date, 'MMMM yyyy')}
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight">{event.title}</h3>
            <EventTypeBadge eventType={event.eventType} />
          </div>
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
          )}
          {event.venue && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {event.venue}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {event.startTime} - {event.endTime}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {event.rsvpRequired && (
              <Badge variant="outline" className="text-xs">RSVP Required</Badge>
            )}
            {event.isTicketed && event.ticketPrice != null && event.ticketPrice > 0 && (
              <Badge variant="outline" className="text-xs">
                <Ticket className="mr-1 h-3 w-3" />
                {formatCurrency(event.ticketPrice)}
              </Badge>
            )}
            {event.capacity != null && (
              <Badge variant="outline" className="text-xs">
                <Users className="mr-1 h-3 w-3" />
                Max {event.capacity}
              </Badge>
            )}
          </div>
          {showActions && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onEdit?.(event); }}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete?.(event); }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
