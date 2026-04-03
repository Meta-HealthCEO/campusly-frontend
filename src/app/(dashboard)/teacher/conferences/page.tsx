'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useConferences } from '@/hooks/useConferences';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  ConferenceEventCard, TeacherAvailabilityForm, TeacherScheduleView,
} from '@/components/conference';
import { Button } from '@/components/ui/button';
import { CalendarDays, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { ConferenceEvent, AvailabilityWindow } from '@/types';

export default function TeacherConferencesPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const userId = user?.id ?? '';

  const {
    events, eventsLoading, fetchEvents,
    availability, availabilityLoading, fetchAvailability, setTeacherAvailability,
    mySchedule, myScheduleLoading, fetchMySchedule, updateBookingStatus,
  } = useConferences();

  const [selectedEvent, setSelectedEvent] = useState<ConferenceEvent | null>(null);
  const [view, setView] = useState<'list' | 'availability' | 'schedule'>('list');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (schoolId) fetchEvents({ schoolId, status: 'published' });
  }, [schoolId, fetchEvents]);

  useEffect(() => {
    if (selectedEvent && view === 'availability') {
      fetchAvailability(selectedEvent.id, userId);
    }
    if (selectedEvent && view === 'schedule') {
      fetchMySchedule(selectedEvent.id);
    }
  }, [selectedEvent, view, userId, fetchAvailability, fetchMySchedule]);

  const handleSetAvailability = useCallback(async (windows: AvailabilityWindow[]) => {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      await setTeacherAvailability(selectedEvent.id, { windows });
      toast.success('Availability set successfully');
      fetchAvailability(selectedEvent.id, userId);
    } catch (err: unknown) {
      toast.error('Failed to set availability');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [selectedEvent, setTeacherAvailability, fetchAvailability, userId]);

  const handleMarkStatus = useCallback(async (
    booking: { id: string },
    status: 'completed' | 'no_show',
  ) => {
    try {
      await updateBookingStatus(booking.id, status);
      toast.success(`Booking marked as ${status === 'no_show' ? 'no show' : status}`);
      if (selectedEvent) fetchMySchedule(selectedEvent.id);
    } catch (err: unknown) {
      toast.error('Failed to update booking');
      console.error(err);
    }
  }, [updateBookingStatus, selectedEvent, fetchMySchedule]);

  const myAvailability = availability.find(
    (a) => a.teacherId?.id === userId,
  );

  if (view === 'availability' && selectedEvent) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Set Availability — ${selectedEvent.title}`} description="Define your available time windows for this event">
          <Button variant="outline" size="sm" onClick={() => { setView('list'); setSelectedEvent(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </PageHeader>
        {availabilityLoading ? <LoadingSpinner /> : (
          <TeacherAvailabilityForm
            event={selectedEvent}
            initialWindows={myAvailability?.windows}
            onSubmit={handleSetAvailability}
            saving={saving}
          />
        )}
      </div>
    );
  }

  if (view === 'schedule' && selectedEvent) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Schedule — ${selectedEvent.title}`} description="Your bookings for this event">
          <Button variant="outline" size="sm" onClick={() => { setView('list'); setSelectedEvent(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </PageHeader>
        {myScheduleLoading ? <LoadingSpinner /> : (
          <TeacherScheduleView bookings={mySchedule} onMarkStatus={handleMarkStatus} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Conferences" description="View upcoming conferences and set your availability" />

      {eventsLoading ? <LoadingSpinner /> : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No conferences"
          description="No upcoming conferences to display."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <ConferenceEventCard
              key={ev.id}
              event={ev}
              actions={
                <div className="flex flex-wrap gap-1">
                  <button
                    className="text-sm text-primary hover:underline"
                    onClick={() => { setSelectedEvent(ev); setView('availability'); }}
                  >
                    Set Availability
                  </button>
                  <button
                    className="text-sm text-primary hover:underline"
                    onClick={() => { setSelectedEvent(ev); setView('schedule'); }}
                  >
                    View Schedule
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
