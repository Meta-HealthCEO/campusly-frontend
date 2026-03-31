// Backend-aligned event types (do NOT modify src/types/index.ts)

export type EventType = 'sports_day' | 'concert' | 'parents_evening' | 'fundraiser' | 'excursion' | 'other';

export interface UserRef {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface EventRecord {
  id: string;
  title: string;
  description?: string;
  schoolId: string;
  organizerId?: UserRef;
  eventType: EventType;
  date: string;
  startTime: string;
  endTime: string;
  venue?: string;
  capacity?: number;
  rsvpRequired: boolean;
  rsvpDeadline?: string;
  ticketPrice?: number;
  isTicketed: boolean;
  galleryEnabled: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventRsvp {
  id: string;
  eventId: string;
  userId: UserRef;
  status: 'attending' | 'not_attending' | 'maybe';
  notes?: string;
  headcount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface EventTicket {
  id: string;
  eventId: string;
  schoolId: string;
  userId: UserRef | string;
  ticketType: string;
  price: number;
  qrCode: string;
  status: 'active' | 'used' | 'cancelled';
  purchasedAt: string;
  createdAt: string;
}

export interface EventSeat {
  id: string;
  eventId: string;
  row: string;
  seatNumber: number;
  label?: string;
  status: 'available' | 'reserved' | 'sold';
  ticketId: string | null;
}

export interface EventCheckIn {
  id: string;
  eventId: string;
  ticketId: EventTicket | string;
  checkedInAt: string;
  checkedInBy: UserRef | string;
}

export interface CheckInStats {
  totalTickets: number;
  checkedIn: number;
  activeTickets: number;
  cancelledTickets: number;
}

export interface EventGalleryImage {
  id: string;
  eventId: string;
  imageUrl: string;
  caption?: string;
  uploadedBy: UserRef | string;
  createdAt: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  schoolId: string;
  eventType: EventType;
  date: string;
  startTime: string;
  endTime: string;
  venue?: string;
  capacity?: number;
  rsvpRequired?: boolean;
  rsvpDeadline?: string;
  ticketPrice?: number;
  isTicketed?: boolean;
  galleryEnabled?: boolean;
}

export type UpdateEventInput = Partial<Omit<CreateEventInput, 'schoolId'>>;

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  sports_day: 'Sports Day',
  concert: 'Concert',
  parents_evening: "Parents' Evening",
  fundraiser: 'Fundraiser',
  excursion: 'Excursion',
  other: 'Other',
};

export const EVENT_TYPE_STYLES: Record<EventType, string> = {
  sports_day: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  concert: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  parents_evening: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  fundraiser: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  excursion: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};
