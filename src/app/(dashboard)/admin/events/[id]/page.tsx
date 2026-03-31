'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Ticket } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EventTypeBadge } from '@/components/events/EventTypeBadge';
import { RsvpTable } from '@/components/events/RsvpTable';
import { TicketTable } from '@/components/events/TicketTable';
import { QrLookupPanel } from '@/components/events/QrLookupPanel';
import { SeatMap } from '@/components/events/SeatMap';
import { CheckInPanel } from '@/components/events/CheckInPanel';
import { EventGallery } from '@/components/events/EventGallery';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  useEventDetail,
  useEventRsvps,
  useEventTickets,
  useEventSeats,
  useEventCheckIns,
  useEventGallery,
} from '@/hooks/useEvents';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { event, loading } = useEventDetail(id);
  const { rsvps, loading: rsvpsLoading } = useEventRsvps(id);
  const { tickets, loading: ticketsLoading, cancelTicket } = useEventTickets(id);
  const { seats, loading: seatsLoading, createSeats, releaseSeat } = useEventSeats(id);
  const { checkIns, stats, loading: checkInsLoading, checkIn } = useEventCheckIns(id);
  const { images, loading: galleryLoading, uploadImage, deleteImage } = useEventGallery(id);

  if (loading) return <LoadingSpinner />;

  if (!event) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/admin/events')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Events
        </Button>
        <p className="text-muted-foreground">Event not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push('/admin/events')}>
        <ArrowLeft className="mr-2 h-4 w-4" />Back to Events
      </Button>

      <PageHeader title={event.title} description={event.description}>
        <EventTypeBadge eventType={event.eventType} />
      </PageHeader>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium">{formatDate(event.date, 'dd MMMM yyyy')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="text-sm font-medium">{event.startTime} - {event.endTime}</p>
            </div>
          </CardContent>
        </Card>
        {event.venue && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Venue</p>
                <p className="text-sm font-medium">{event.venue}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="text-sm font-medium">{event.capacity ?? 'Unlimited'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature badges */}
      <div className="flex flex-wrap gap-2">
        {event.rsvpRequired && <Badge variant="outline">RSVP Required</Badge>}
        {event.isTicketed && (
          <Badge variant="outline">
            <Ticket className="mr-1 h-3 w-3" />
            Ticketed - {event.ticketPrice != null ? formatCurrency(event.ticketPrice) : 'Free'}
          </Badge>
        )}
        {event.galleryEnabled && <Badge variant="outline">Gallery Enabled</Badge>}
        {event.organizerId && (
          <Badge variant="secondary">
            Organizer: {event.organizerId.firstName} {event.organizerId.lastName}
          </Badge>
        )}
      </div>

      {/* Tabbed Detail */}
      <Tabs defaultValue="rsvps">
        <TabsList>
          <TabsTrigger value="rsvps">RSVPs ({rsvps.length})</TabsTrigger>
          <TabsTrigger value="tickets">Tickets ({tickets.length})</TabsTrigger>
          <TabsTrigger value="seats">Seats ({seats.length})</TabsTrigger>
          <TabsTrigger value="checkin">Check-In</TabsTrigger>
          <TabsTrigger value="gallery">Gallery ({images.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rsvps" className="pt-4">
          <RsvpTable rsvps={rsvps} loading={rsvpsLoading} />
        </TabsContent>

        <TabsContent value="tickets" className="pt-4 space-y-4">
          <QrLookupPanel />
          <TicketTable tickets={tickets} loading={ticketsLoading} onCancel={cancelTicket} />
        </TabsContent>

        <TabsContent value="seats" className="pt-4">
          <SeatMap
            seats={seats}
            loading={seatsLoading}
            onCreateSeats={createSeats}
            onReleaseSeat={releaseSeat}
          />
        </TabsContent>

        <TabsContent value="checkin" className="pt-4">
          <CheckInPanel
            checkIns={checkIns}
            stats={stats}
            loading={checkInsLoading}
            onCheckIn={checkIn}
          />
        </TabsContent>

        <TabsContent value="gallery" className="pt-4">
          <EventGallery
            images={images}
            loading={galleryLoading}
            onUpload={uploadImage}
            onDelete={deleteImage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
