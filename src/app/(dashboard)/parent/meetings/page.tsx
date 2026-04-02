'use client';

import { useState, useEffect } from 'react';
import { CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { ParentBookingsCard } from '@/components/meetings/ParentBookingsCard';
import { AvailableSlotsList } from '@/components/meetings/AvailableSlotsList';
import { BookSlotDialog } from '@/components/meetings/BookSlotDialog';
import { useMeetings } from '@/hooks/useMeetings';
import { useCurrentParent } from '@/hooks/useCurrentParent';
import { useAuthStore } from '@/stores/useAuthStore';
import type { MeetingSlot } from '@/types';

export default function ParentMeetingsPage() {
  const { user } = useAuthStore();
  const { parent, children, loading: parentLoading } = useCurrentParent();
  const {
    meetingDays, availableSlots, parentBookings, loading,
    loadMeetingDays, loadAvailableSlots, loadParentBookings,
    bookSlot, cancelBooking, extractErrorMessage,
  } = useMeetings();

  const [selectedDayId, setSelectedDayId] = useState('');
  const [bookingSlot, setBookingSlot] = useState<MeetingSlot | null>(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);

  useEffect(() => {
    loadMeetingDays();
    loadParentBookings();
  }, [loadMeetingDays, loadParentBookings]);

  useEffect(() => {
    if (selectedDayId) loadAvailableSlots(selectedDayId);
  }, [selectedDayId, loadAvailableSlots]);

  const handleBook = (slot: MeetingSlot) => {
    setBookingSlot(slot);
    setBookDialogOpen(true);
  };

  const handleConfirmBooking = async (slotId: string, studentId: string, studentName: string) => {
    try {
      const parentName = user ? `${user.firstName} ${user.lastName}` : 'Parent';
      await bookSlot(slotId, { studentId, studentName, parentName });
      loadParentBookings();
      if (selectedDayId) loadAvailableSlots(selectedDayId);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to book slot'));
    }
  };

  const handleCancel = async (slotId: string) => {
    try {
      await cancelBooking(slotId);
      loadParentBookings();
      if (selectedDayId) loadAvailableSlots(selectedDayId);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to cancel booking'));
    }
  };

  const isLoading = loading || parentLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="Parent-Teacher Meetings" description="Book and manage meetings with teachers" />

      {isLoading && <LoadingSpinner />}

      {!isLoading && (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">My Bookings</h2>
            <ParentBookingsCard bookings={parentBookings} onCancel={handleCancel} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Book a Meeting</h2>
            <div className="space-y-2">
              <Label>Select Meeting Day</Label>
              <Select
                value={selectedDayId || 'none'}
                onValueChange={(val: unknown) => setSelectedDayId((val as string) === 'none' ? '' : val as string)}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Choose a meeting day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose a meeting day</SelectItem>
                  {meetingDays.map((day) => (
                    <SelectItem key={day.id} value={day.id}>
                      {day.name} — {day.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDayId && (
              <AvailableSlotsList
                slots={availableSlots}
                onBook={handleBook}
                selectedSlotId={bookingSlot?.id}
              />
            )}
          </section>

          <BookSlotDialog
            open={bookDialogOpen}
            onOpenChange={setBookDialogOpen}
            slot={bookingSlot}
            children={children}
            onConfirm={handleConfirmBooking}
          />
        </>
      )}
    </div>
  );
}
