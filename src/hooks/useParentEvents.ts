import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { SchoolEvent } from '@/types';

interface ParentEventsResult {
  events: SchoolEvent[];
  loading: boolean;
  buyTicket: (eventId: string, quantity?: number) => Promise<void>;
}

export function useParentEvents(): ParentEventsResult {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiClient.get('/events');
        const arr = unwrapList<Record<string, unknown>>(res);
        const mapped: SchoolEvent[] = arr.map((e) => ({
          id: (e._id as string) ?? (e.id as string) ?? '',
          title: (e.title as string) ?? '',
          description: (e.description as string) ?? '',
          type: (e.type as SchoolEvent['type']) ?? 'academic',
          startDate: (e.startDate as string) ?? '',
          endDate: (e.endDate as string) ?? '',
          location: (e.location as string) ?? undefined,
          isAllDay: (e.isAllDay as boolean) ?? false,
          requiresConsent: (e.requiresConsent as boolean) ?? false,
          ticketPrice: (e.ticketPrice as number) ?? undefined,
          maxAttendees: (e.maxAttendees as number) ?? undefined,
          createdBy: (e.createdBy as string) ?? '',
        }));
        setEvents(mapped);
      } catch {
        console.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const buyTicket = useCallback(async (eventId: string, quantity = 1) => {
    try {
      await apiClient.post(`/events/${eventId}/tickets`, { quantity });
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Failed to purchase ticket'));
    }
  }, []);

  return { events, loading, buyTicket };
}
