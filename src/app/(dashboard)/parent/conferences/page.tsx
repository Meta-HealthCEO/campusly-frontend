'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useConferences } from '@/hooks/useConferences';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ConferenceEventCard, SlotGrid, BookingDialog, BookingTable, WaitlistBadge,
} from '@/components/conference';
import { CalendarDays, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { ConferenceEvent, ConferenceTeacherAvailability, TimeSlot, ConferenceBooking } from '@/types';

interface ChildRecord {
  id: string;
  firstName: string;
  lastName: string;
}

export default function ParentConferencesPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const {
    events, eventsLoading, fetchEvents,
    availability, availabilityLoading, fetchAvailability,
    mySchedule, myScheduleLoading, fetchMySchedule,
    createBooking, cancelBooking,
    waitlist, waitlistLoading, fetchWaitlist, joinWaitlist, leaveWaitlist,
  } = useConferences();

  const [selectedEvent, setSelectedEvent] = useState<ConferenceEvent | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<ConferenceTeacherAvailability | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // TODO: In production, fetch actual children from /students filtered by parent
  // For now, use a placeholder that won't crash — the parent's own user info
  const children: ChildRecord[] = useMemo(() => {
    if (!user) return [];
    return [{ id: user.id, firstName: user.firstName ?? 'My', lastName: user.lastName ?? 'Child' }];
  }, [user]);

  useEffect(() => {
    if (schoolId) fetchEvents({ schoolId, status: 'published' });
  }, [schoolId, fetchEvents]);

  useEffect(() => {
    if (selectedEvent) {
      fetchAvailability(selectedEvent.id);
      fetchMySchedule(selectedEvent.id);
      fetchWaitlist(selectedEvent.id);
    }
  }, [selectedEvent, fetchAvailability, fetchMySchedule, fetchWaitlist]);

  const myBookedSlotIds = useMemo(() => {
    const set = new Set<string>();
    mySchedule
      .filter((b: ConferenceBooking) => b.status === 'confirmed')
      .forEach((b: ConferenceBooking) => set.add(b.slotId));
    return set;
  }, [mySchedule]);

  const handleSelectSlot = useCallback((teacher: ConferenceTeacherAvailability, slot: TimeSlot) => {
    setSelectedTeacher(teacher);
    setSelectedSlot(slot);
    setBookDialogOpen(true);
  }, []);

  const handleConfirmBooking = useCallback(async (data: {
    slotId: string; studentId: string; notes: string;
  }) => {
    if (!selectedEvent || !selectedTeacher) return;
    setSaving(true);
    try {
      await createBooking({
        eventId: selectedEvent.id,
        teacherId: selectedTeacher.teacherId.id,
        slotId: data.slotId,
        studentId: data.studentId,
        notes: data.notes || undefined,
      });
      toast.success('Booking confirmed!');
      setBookDialogOpen(false);
      fetchMySchedule(selectedEvent.id);
      fetchAvailability(selectedEvent.id);
    } catch (err: unknown) {
      toast.error('Failed to book slot');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [selectedEvent, selectedTeacher, createBooking, fetchMySchedule, fetchAvailability]);

  const handleCancel = useCallback(async (booking: ConferenceBooking) => {
    try {
      await cancelBooking(booking.id);
      toast.success('Booking cancelled');
      if (selectedEvent) {
        fetchMySchedule(selectedEvent.id);
        fetchAvailability(selectedEvent.id);
      }
    } catch (err: unknown) {
      toast.error('Failed to cancel booking');
      console.error(err);
    }
  }, [cancelBooking, selectedEvent, fetchMySchedule, fetchAvailability]);

  const handleJoinWaitlist = useCallback(async (teacher: ConferenceTeacherAvailability) => {
    if (!selectedEvent || children.length === 0) return;
    try {
      const result = await joinWaitlist({
        eventId: selectedEvent.id,
        teacherId: teacher.teacherId.id,
        studentId: children[0].id,
      });
      toast.success(`Added to waitlist (position ${result.position})`);
      fetchWaitlist(selectedEvent.id);
    } catch (err: unknown) {
      toast.error('Failed to join waitlist');
      console.error(err);
    }
  }, [selectedEvent, children, joinWaitlist, fetchWaitlist]);

  const handleLeaveWaitlist = useCallback(async (id: string) => {
    try {
      await leaveWaitlist(id);
      toast.success('Removed from waitlist');
      if (selectedEvent) fetchWaitlist(selectedEvent.id);
    } catch (err: unknown) {
      toast.error('Failed to leave waitlist');
      console.error(err);
    }
  }, [leaveWaitlist, selectedEvent, fetchWaitlist]);

  // ─── Event detail view ────────────────────────────────────────────
  if (selectedEvent) {
    return (
      <div className="space-y-6">
        <PageHeader title={selectedEvent.title} description="Browse teachers and book your slots">
          <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </PageHeader>

        {/* My Bookings */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">My Bookings</h3>
          {myScheduleLoading ? <LoadingSpinner /> : mySchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet for this event.</p>
          ) : (
            <BookingTable bookings={mySchedule} onCancel={handleCancel} showParent={false} />
          )}
        </div>

        {/* Waitlist */}
        {!waitlistLoading && waitlist.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">My Waitlist Entries</h3>
            <div className="flex flex-wrap gap-2">
              {waitlist.map((w) => (
                <div key={w.id} className="flex items-center gap-2">
                  <WaitlistBadge position={w.position} status={w.status} />
                  <Button size="sm" variant="ghost" className="text-destructive text-xs" onClick={() => handleLeaveWaitlist(w.id)}>
                    Leave
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teachers & Slots */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Available Teachers</h3>
          {availabilityLoading ? <LoadingSpinner /> : availability.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teachers have set availability yet.</p>
          ) : (
            <div className="space-y-4">
              {availability.map((ta) => {
                const slots = ta.slots ?? ta.generatedSlots ?? [];
                const hasAvailable = slots.some((s: TimeSlot) => s.status === 'available');
                return (
                  <Card key={ta.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{ta.teacherId.firstName} {ta.teacherId.lastName}</p>
                          {ta.teacherId.department && (
                            <p className="text-xs text-muted-foreground">{ta.teacherId.department}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {ta.availableSlots ?? slots.filter((s: TimeSlot) => s.status === 'available').length} available
                        </span>
                      </div>
                      {hasAvailable ? (
                        <SlotGrid
                          slots={slots}
                          onSelectSlot={(slot) => handleSelectSlot(ta, slot)}
                          myBookedSlotIds={myBookedSlotIds}
                        />
                      ) : selectedEvent.allowWaitlist ? (
                        <Button size="sm" variant="outline" onClick={() => handleJoinWaitlist(ta)}>
                          Join Waitlist
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">All slots booked.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <BookingDialog
          open={bookDialogOpen}
          onOpenChange={setBookDialogOpen}
          slot={selectedSlot}
          teacherName={selectedTeacher ? `${selectedTeacher.teacherId.firstName} ${selectedTeacher.teacherId.lastName}` : ''}
          children={children}
          onConfirm={handleConfirmBooking}
          saving={saving}
        />
      </div>
    );
  }

  // ─── Event list ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader title="Conferences" description="Book slots with your child's teachers" />

      {eventsLoading ? <LoadingSpinner /> : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No conferences"
          description="No upcoming conferences available for booking."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <ConferenceEventCard
              key={ev.id}
              event={ev}
              onClick={(e) => setSelectedEvent(e)}
              actions={
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}>
                  Book Slots
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
