// ============================================================
// Conference Booking Types
// ============================================================

export type ConferenceEventStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
export type SlotStatus = 'available' | 'booked' | 'blocked';
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type WaitlistStatus = 'waiting' | 'offered' | 'expired';

export interface ConferenceEvent {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  venue?: string;
  slotDurationMinutes: number;
  breakBetweenMinutes: number;
  maxSlotsPerTeacher: number | null;
  maxBookingsPerParent: number | null;
  allowWaitlist: boolean;
  bookingOpensAt: string | null;
  bookingClosesAt: string | null;
  participatingTeacherIds: string[];
  status: ConferenceEventStatus;
  createdBy: string;
  isDeleted: boolean;
  totalSlots?: number;
  bookedSlots?: number;
  availableSlots?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityWindow {
  startTime: string;
  endTime: string;
  location?: string;
}

export interface TimeSlot {
  slotId: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  location?: string;
}

export interface ConferenceTeacherAvailability {
  id: string;
  eventId: string;
  teacherId: {
    id: string;
    firstName: string;
    lastName: string;
    department?: string;
  };
  schoolId: string;
  windows: AvailabilityWindow[];
  generatedSlots: TimeSlot[];
  slots?: TimeSlot[];
  totalSlots?: number;
  availableSlots?: number;
  bookedSlots?: number;
}

export interface ConferenceBooking {
  id: string;
  eventId: string;
  teacherId: { id: string; firstName: string; lastName: string };
  parentId: { id: string; firstName: string; lastName: string };
  studentId: { id: string; firstName: string; lastName: string };
  schoolId: string;
  slotId: string;
  slotStartTime: string;
  slotEndTime: string;
  location?: string;
  notes?: string;
  status: BookingStatus;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  eventId: string;
  teacherId: string;
  parentId: string;
  studentId: string;
  schoolId: string;
  position: number;
  preferredTimes: string[];
  status: WaitlistStatus;
  offeredSlotId?: string;
  offeredAt?: string;
  createdAt: string;
}

export interface ConferenceReport {
  totalTeachers: number;
  teachersWithAvailability: number;
  totalSlots: number;
  bookedSlots: number;
  bookingRate: number;
  cancelledBookings: number;
  noShows: number;
  noShowRate: number;
  waitlistEntries: number;
  averageBookingsPerParent: number;
  teacherUtilization: Array<{
    teacherId: string;
    teacherName: string;
    totalSlots: number;
    bookedSlots: number;
    utilizationRate: number;
  }>;
  bookingsByHour: Array<{
    hour: string;
    count: number;
  }>;
}

// ─── Payload types for mutations ──────────────────────────────

export interface CreateConferenceEventPayload {
  schoolId: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  venue?: string;
  slotDurationMinutes?: number;
  breakBetweenMinutes?: number;
  maxSlotsPerTeacher?: number | null;
  maxBookingsPerParent?: number | null;
  allowWaitlist?: boolean;
  bookingOpensAt?: string | null;
  bookingClosesAt?: string | null;
  participatingTeacherIds?: string[];
}

export interface ConferenceSetAvailabilityPayload {
  windows: AvailabilityWindow[];
}

export interface CreateBookingPayload {
  eventId: string;
  teacherId: string;
  slotId: string;
  studentId: string;
  notes?: string;
}

export interface JoinWaitlistPayload {
  eventId: string;
  teacherId: string;
  studentId: string;
  preferredTimes?: string[];
}

export interface ConferenceEventFilters {
  schoolId?: string;
  status?: ConferenceEventStatus;
  page?: number;
  limit?: number;
}

export interface BookingFilters {
  teacherId?: string;
  parentId?: string;
  status?: BookingStatus;
  page?: number;
  limit?: number;
}
