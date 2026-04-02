import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  mapEvent, mapRsvp, mapTicket, mapSeat, mapCheckIn, mapGalleryImage, extractArray,
} from '@/components/events/mappers';
import type {
  EventRecord,
  EventRsvp,
  EventTicket,
  EventSeat,
  EventCheckIn,
  CheckInStats,
  EventGalleryImage,
  CreateEventInput,
  UpdateEventInput,
  EventType,
  UserRef,
} from '@/components/events/types';

// ============== useEvents (list) ==============
export function useEvents(filterType?: EventType) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterType) params.eventType = filterType;
      const res = await apiClient.get('/events', { params });
      const raw = unwrapResponse(res);
      if (Array.isArray(raw)) {
        setEvents(raw.map((e: Record<string, unknown>) => mapEvent(e)));
      } else {
        const arr = (raw.events ?? raw.data ?? []) as Record<string, unknown>[];
        setEvents(arr.map(mapEvent));
      }
    } catch {
      console.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return { events, loading, refetch: fetchEvents };
}

// ============== useEventDetail ==============
export function useEventDetail(eventId: string) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    async function load() {
      try {
        const res = await apiClient.get(`/events/${eventId}`);
        const raw = unwrapResponse(res);
        setEvent(mapEvent(raw as Record<string, unknown>));
      } catch {
        console.error('Failed to load event');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  return { event, loading };
}

// ============== useEventCrud ==============
export function useEventCrud() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const createEvent = async (data: Omit<CreateEventInput, 'schoolId'>) => {
    const res = await apiClient.post('/events', { ...data, schoolId });
    const raw = unwrapResponse(res);
    return mapEvent(raw as Record<string, unknown>);
  };

  const updateEvent = async (id: string, data: UpdateEventInput) => {
    const res = await apiClient.put(`/events/${id}`, data);
    const raw = unwrapResponse(res);
    return mapEvent(raw as Record<string, unknown>);
  };

  const deleteEvent = async (id: string) => {
    await apiClient.delete(`/events/${id}`);
  };

  return { createEvent, updateEvent, deleteEvent, schoolId };
}

// ============== useEventRsvps ==============
export function useEventRsvps(eventId: string) {
  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRsvps = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/events/${eventId}/rsvps`);
      const raw = unwrapResponse(res);
      setRsvps(extractArray(raw, 'rsvps', mapRsvp));
    } catch {
      console.error('Failed to load RSVPs');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchRsvps(); }, [fetchRsvps]);
  return { rsvps, loading, refetch: fetchRsvps };
}

// ============== useEventTickets ==============
export function useEventTickets(eventId: string) {
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/events/${eventId}/tickets`);
      const raw = unwrapResponse(res);
      setTickets(extractArray(raw, 'tickets', mapTicket));
    } catch {
      console.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const cancelTicket = async (ticketId: string) => {
    await apiClient.patch(`/events/${eventId}/tickets/${ticketId}/cancel`);
    await fetchTickets();
  };

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  return { tickets, loading, refetch: fetchTickets, cancelTicket };
}

// ============== useEventSeats ==============
export function useEventSeats(eventId: string) {
  const [seats, setSeats] = useState<EventSeat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeats = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/events/${eventId}/seats`);
      const raw = unwrapResponse(res);
      setSeats(extractArray(raw, 'seats', mapSeat));
    } catch {
      console.error('Failed to load seats');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const createSeats = async (seatsData: { row: string; seatNumber: number; label?: string }[]) => {
    await apiClient.post(`/events/${eventId}/seats`, { seats: seatsData });
    await fetchSeats();
  };

  const reserveSeat = async (seatId: string, ticketId: string) => {
    await apiClient.patch(`/events/${eventId}/seats/${seatId}/reserve`, { ticketId });
    await fetchSeats();
  };

  const releaseSeat = async (seatId: string) => {
    await apiClient.patch(`/events/${eventId}/seats/${seatId}/release`);
    await fetchSeats();
  };

  useEffect(() => { fetchSeats(); }, [fetchSeats]);
  return { seats, loading, refetch: fetchSeats, createSeats, reserveSeat, releaseSeat };
}

// ============== useEventCheckIns ==============
export function useEventCheckIns(eventId: string) {
  const [checkIns, setCheckIns] = useState<EventCheckIn[]>([]);
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCheckIns = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/events/${eventId}/check-ins`);
      const raw = unwrapResponse(res);
      setCheckIns(extractArray(raw, 'checkIns', mapCheckIn));
    } catch {
      console.error('Failed to load check-ins');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchStats = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await apiClient.get(`/events/${eventId}/check-in/stats`);
      const raw = unwrapResponse(res);
      setStats(raw as CheckInStats);
    } catch {
      console.error('Failed to load check-in stats');
    }
  }, [eventId]);

  const checkIn = async (qrCode: string) => {
    const res = await apiClient.post(`/events/${eventId}/check-in`, { qrCode });
    const raw = unwrapResponse(res);
    const result = mapCheckIn(raw as Record<string, unknown>);
    await fetchCheckIns();
    await fetchStats();
    return result;
  };

  useEffect(() => { fetchCheckIns(); fetchStats(); }, [fetchCheckIns, fetchStats]);
  return { checkIns, stats, loading, refetch: fetchCheckIns, refetchStats: fetchStats, checkIn };
}

// ============== useEventGallery ==============
export function useEventGallery(eventId: string) {
  const [images, setImages] = useState<EventGalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const fetchGallery = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/events/${eventId}/gallery`);
      const raw = unwrapResponse(res);
      setImages(extractArray(raw, 'images', mapGalleryImage));
    } catch {
      console.error('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const uploadImage = async (imageUrl: string, caption?: string) => {
    await apiClient.post(`/events/${eventId}/gallery`, { schoolId, imageUrl, caption });
    await fetchGallery();
  };

  const deleteImage = async (imageId: string) => {
    await apiClient.delete(`/events/${eventId}/gallery/${imageId}`);
    await fetchGallery();
  };

  useEffect(() => { fetchGallery(); }, [fetchGallery]);
  return { images, loading, refetch: fetchGallery, uploadImage, deleteImage };
}

// ============== useQrTicketLookup ==============
export interface QrTicketResult {
  id: string;
  eventId: { _id: string; title: string; date: string; venue?: string } | string;
  userId: UserRef | string;
  ticketType: string;
  price: number;
  qrCode: string;
  status: string;
  purchasedAt: string;
}

export function useQrTicketLookup() {
  const lookupQrTicket = useCallback(async (qrCode: string): Promise<QrTicketResult> => {
    const res = await apiClient.get(`/events/tickets/qr/${qrCode.trim()}`);
    const raw = unwrapResponse(res);
    const r = raw as Record<string, unknown>;
    return {
      id: (r._id as string) ?? (r.id as string) ?? '',
      eventId: r.eventId as QrTicketResult['eventId'],
      userId: r.userId as UserRef | string,
      ticketType: (r.ticketType as string) ?? 'standard',
      price: (r.price as number) ?? 0,
      qrCode: (r.qrCode as string) ?? '',
      status: (r.status as string) ?? '',
      purchasedAt: (r.purchasedAt as string) ?? '',
    };
  }, []);

  return { lookupQrTicket };
}
