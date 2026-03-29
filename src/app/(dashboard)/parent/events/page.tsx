'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Calendar, MapPin, Clock, Users, Ticket, Tag,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mockEvents } from '@/lib/mock-data';
import type { SchoolEvent } from '@/types';

const typeStyles: Record<string, string> = {
  academic: 'bg-blue-100 text-blue-800',
  sports: 'bg-emerald-100 text-emerald-800',
  cultural: 'bg-purple-100 text-purple-800',
  social: 'bg-amber-100 text-amber-800',
  meeting: 'bg-gray-100 text-gray-800',
};

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);

  const sortedEvents = [...mockEvents].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const handleBuyTicket = (event: SchoolEvent) => {
    setSelectedEvent(event);
    setTicketDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Events"
        description="Stay up to date with upcoming school events and activities."
      />

      {/* Events Grid */}
      {sortedEvents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedEvents.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <div
                className={`h-1.5 ${
                  typeStyles[event.type]
                    ?.replace('bg-', 'bg-')
                    .replace(/text-\S+/, '') ?? 'bg-gray-200'
                }`}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {event.description}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className={typeStyles[event.type] ?? ''}
                  >
                    {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      {formatDate(event.startDate, 'EEEE, dd MMMM yyyy')}
                    </span>
                  </div>
                  {!event.isAllDay && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>
                        {formatDate(event.startDate, 'HH:mm')} -{' '}
                        {formatDate(event.endDate, 'HH:mm')}
                      </span>
                    </div>
                  )}
                  {event.isAllDay && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>All Day Event</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.maxAttendees && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>Max {event.maxAttendees} attendees</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {event.requiresConsent && (
                      <Badge variant="outline" className="text-xs">
                        Consent Required
                      </Badge>
                    )}
                    {event.ticketPrice && (
                      <div className="flex items-center gap-1 text-sm">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCurrency(event.ticketPrice)}
                        </span>
                      </div>
                    )}
                  </div>
                  {event.ticketPrice && (
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => handleBuyTicket(event)}
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      Buy Ticket
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No upcoming events"
          description="There are no upcoming events at the moment. Check back later."
        />
      )}

      {/* Ticket Purchase Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent>
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>Purchase Ticket</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="font-medium">{selectedEvent.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedEvent.startDate, 'EEEE, dd MMMM yyyy')}
                  </p>
                  {selectedEvent.location && (
                    <p className="text-sm text-muted-foreground">
                      {selectedEvent.location}
                    </p>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Ticket Price
                  </span>
                  <span className="text-lg font-bold">
                    {formatCurrency(selectedEvent.ticketPrice ?? 0)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setTicketDialogOpen(false)}
                >
                  Confirm Purchase -{' '}
                  {formatCurrency(selectedEvent.ticketPrice ?? 0)}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
