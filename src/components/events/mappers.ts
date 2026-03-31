import type {
  EventRecord,
  EventRsvp,
  EventTicket,
  EventSeat,
  EventCheckIn,
  EventGalleryImage,
  EventType,
  UserRef,
} from './types';

/** Map _id to id for a raw backend record */
export function mapId(raw: Record<string, unknown>): Record<string, unknown> {
  return { ...raw, id: (raw._id as string) ?? (raw.id as string) ?? '' };
}

export function mapEvent(e: Record<string, unknown>): EventRecord {
  const mapped = mapId(e);
  return {
    id: mapped.id as string,
    title: (mapped.title as string) ?? '',
    description: mapped.description as string | undefined,
    schoolId: (mapped.schoolId as string) ?? '',
    organizerId: mapped.organizerId as UserRef | undefined,
    eventType: (mapped.eventType as EventType) ?? 'other',
    date: (mapped.date as string) ?? '',
    startTime: (mapped.startTime as string) ?? '',
    endTime: (mapped.endTime as string) ?? '',
    venue: mapped.venue as string | undefined,
    capacity: mapped.capacity as number | undefined,
    rsvpRequired: (mapped.rsvpRequired as boolean) ?? false,
    rsvpDeadline: mapped.rsvpDeadline as string | undefined,
    ticketPrice: mapped.ticketPrice as number | undefined,
    isTicketed: (mapped.isTicketed as boolean) ?? false,
    galleryEnabled: (mapped.galleryEnabled as boolean) ?? false,
    isDeleted: (mapped.isDeleted as boolean) ?? false,
    createdAt: (mapped.createdAt as string) ?? '',
    updatedAt: (mapped.updatedAt as string) ?? '',
  };
}

export function mapRsvp(r: Record<string, unknown>): EventRsvp {
  const mapped = mapId(r);
  return {
    id: mapped.id as string,
    eventId: (mapped.eventId as string) ?? '',
    userId: mapped.userId as UserRef,
    status: (mapped.status as EventRsvp['status']) ?? 'maybe',
    notes: mapped.notes as string | undefined,
    headcount: (mapped.headcount as number) ?? 1,
    createdAt: (mapped.createdAt as string) ?? '',
  };
}

export function mapTicket(t: Record<string, unknown>): EventTicket {
  const mapped = mapId(t);
  return {
    id: mapped.id as string,
    eventId: (mapped.eventId as string) ?? '',
    schoolId: (mapped.schoolId as string) ?? '',
    userId: mapped.userId as UserRef | string,
    ticketType: (mapped.ticketType as string) ?? 'standard',
    price: (mapped.price as number) ?? 0,
    qrCode: (mapped.qrCode as string) ?? '',
    status: (mapped.status as EventTicket['status']) ?? 'active',
    purchasedAt: (mapped.purchasedAt as string) ?? '',
    createdAt: (mapped.createdAt as string) ?? '',
  };
}

export function mapSeat(s: Record<string, unknown>): EventSeat {
  const mapped = mapId(s);
  return {
    id: mapped.id as string,
    eventId: (mapped.eventId as string) ?? '',
    row: (mapped.row as string) ?? '',
    seatNumber: (mapped.seatNumber as number) ?? 0,
    label: mapped.label as string | undefined,
    status: (mapped.status as EventSeat['status']) ?? 'available',
    ticketId: (mapped.ticketId as string) ?? null,
  };
}

export function mapCheckIn(c: Record<string, unknown>): EventCheckIn {
  const mapped = mapId(c);
  return {
    id: mapped.id as string,
    eventId: (mapped.eventId as string) ?? '',
    ticketId: mapped.ticketId as EventTicket | string,
    checkedInAt: (mapped.checkedInAt as string) ?? '',
    checkedInBy: mapped.checkedInBy as UserRef | string,
  };
}

export function mapGalleryImage(g: Record<string, unknown>): EventGalleryImage {
  const mapped = mapId(g);
  return {
    id: mapped.id as string,
    eventId: (mapped.eventId as string) ?? '',
    imageUrl: (mapped.imageUrl as string) ?? '',
    caption: mapped.caption as string | undefined,
    uploadedBy: mapped.uploadedBy as UserRef | string,
    createdAt: (mapped.createdAt as string) ?? '',
  };
}

/** Extract arrays from paginated API responses */
export function extractArray<T>(
  raw: unknown,
  key: string,
  mapper: (item: Record<string, unknown>) => T
): T[] {
  const obj = raw as Record<string, unknown>;
  const arr = obj[key];
  if (Array.isArray(arr)) return arr.map((i) => mapper(i as Record<string, unknown>));
  if (Array.isArray(raw)) return (raw as Record<string, unknown>[]).map(mapper);
  return [];
}
