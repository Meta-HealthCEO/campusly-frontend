'use client';

import { Plus, Calendar, MapPin, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { mockEvents } from '@/lib/mock-data';
import { formatDate, formatCurrency } from '@/lib/utils';

const eventTypeStyles: Record<string, string> = {
  academic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sports: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cultural: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  social: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  meeting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Manage school events and activities">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </PageHeader>

      {mockEvents.length === 0 ? (
        <EmptyState icon={Calendar} title="No events" description="No events have been created yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockEvents.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-primary/5 p-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    {formatDate(event.startDate, 'EEEE')}
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {formatDate(event.startDate, 'dd')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.startDate, 'MMMM yyyy')}
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge className={eventTypeStyles[event.type] || ''}>
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {event.isAllDay
                      ? 'All Day'
                      : `${formatDate(event.startDate, 'HH:mm')} - ${formatDate(event.endDate, 'HH:mm')}`}
                  </div>
                  <div className="flex items-center gap-2">
                    {event.requiresConsent && (
                      <Badge variant="outline" className="text-xs">
                        Consent Required
                      </Badge>
                    )}
                    {event.ticketPrice && (
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(event.ticketPrice)}
                      </Badge>
                    )}
                    {event.maxAttendees && (
                      <Badge variant="outline" className="text-xs">
                        Max {event.maxAttendees}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
