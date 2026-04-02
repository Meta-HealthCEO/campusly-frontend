import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EventFeedbackItem {
  id: string;
  parentId: { _id: string; firstName: string; lastName: string } | string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface EventFeedbackResult {
  feedback: EventFeedbackItem[];
  averageRating: number;
  totalReviews: number;
}

export interface WaitlistEntry {
  id: string;
  parentId: { _id: string; firstName: string; lastName: string; email: string } | string;
  studentId?: { _id: string; firstName: string; lastName: string } | string;
  position: number;
  status: 'waiting' | 'offered' | 'accepted' | 'expired';
  createdAt: string;
}

// ─── Feedback Hook ───────────────────────────────────────────────────────────

export function useEventFeedback(eventId: string) {
  const [feedback, setFeedback] = useState<EventFeedbackItem[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchFeedback = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/events/${eventId}/feedback`);
      const raw = unwrapResponse(res) as Record<string, unknown>;
      const items = (raw.feedback ?? []) as Record<string, unknown>[];
      setFeedback(
        items.map((f) => ({
          id: (f._id as string) ?? (f.id as string) ?? '',
          parentId: f.parentId as EventFeedbackItem['parentId'],
          rating: (f.rating as number) ?? 0,
          comment: f.comment as string | undefined,
          createdAt: (f.createdAt as string) ?? '',
        })),
      );
      setAverageRating((raw.averageRating as number) ?? 0);
      setTotalReviews((raw.totalReviews as number) ?? 0);
    } catch {
      console.error('Failed to load event feedback');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const submitFeedback = useCallback(
    async (rating: number, comment?: string) => {
      await apiClient.post(`/events/${eventId}/feedback`, {
        eventId,
        rating,
        comment,
      });
    },
    [eventId],
  );

  return { feedback, averageRating, totalReviews, loading, fetchFeedback, submitFeedback };
}

// ─── Waitlist Hook ───────────────────────────────────────────────────────────

export function useEventWaitlist(eventId: string) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWaitlist = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/events/${eventId}/waitlist`);
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : [];
      setEntries(
        (arr as Record<string, unknown>[]).map((e) => ({
          id: (e._id as string) ?? (e.id as string) ?? '',
          parentId: e.parentId as WaitlistEntry['parentId'],
          studentId: e.studentId as WaitlistEntry['studentId'],
          position: (e.position as number) ?? 0,
          status: (e.status as WaitlistEntry['status']) ?? 'waiting',
          createdAt: (e.createdAt as string) ?? '',
        })),
      );
    } catch {
      console.error('Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const joinWaitlist = useCallback(
    async (studentId?: string) => {
      await apiClient.post(`/events/${eventId}/waitlist`, {
        eventId,
        studentId,
      });
    },
    [eventId],
  );

  return { entries, loading, fetchWaitlist, joinWaitlist };
}

// ─── iCal Hook ───────────────────────────────────────────────────────────────

export function useEventICal() {
  const downloadICal = useCallback(async (eventId: string, eventTitle: string) => {
    const res = await apiClient.get(`/events/${eventId}/ical`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data as BlobPart], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventTitle.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return { downloadICal };
}
