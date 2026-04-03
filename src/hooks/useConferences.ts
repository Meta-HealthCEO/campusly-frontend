'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type {
  ConferenceEvent,
  ConferenceEventStatus,
  ConferenceTeacherAvailability,
  ConferenceBooking,
  WaitlistEntry,
  ConferenceReport,
  ConferenceEventFilters,
  BookingFilters,
  CreateConferenceEventPayload,
  ConferenceSetAvailabilityPayload,
  CreateBookingPayload,
  JoinWaitlistPayload,
} from '@/types';

export function useConferences() {
  // ─── Events ──────────────────────────────────────────────────────
  const [events, setEvents] = useState<ConferenceEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // ─── Availability ────────────────────────────────────────────────
  const [availability, setAvailability] = useState<ConferenceTeacherAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // ─── Bookings ────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<ConferenceBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [mySchedule, setMySchedule] = useState<ConferenceBooking[]>([]);
  const [myScheduleLoading, setMyScheduleLoading] = useState(false);

  // ─── Waitlist ────────────────────────────────────────────────────
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // ─── Report ──────────────────────────────────────────────────────
  const [report, setReport] = useState<ConferenceReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // ─── Event CRUD ──────────────────────────────────────────────────
  const fetchEvents = useCallback(async (filters?: ConferenceEventFilters) => {
    setEventsLoading(true);
    try {
      const response = await apiClient.get('/conferences/events', { params: filters });
      const list = unwrapList<ConferenceEvent>(response, 'events');
      setEvents(list);
    } catch (err: unknown) {
      console.error('Failed to fetch conference events:', extractErrorMessage(err));
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const createEvent = useCallback(async (data: CreateConferenceEventPayload) => {
    const response = await apiClient.post('/conferences/events', data);
    return unwrapResponse<ConferenceEvent>(response);
  }, []);

  const updateEvent = useCallback(async (id: string, data: Partial<CreateConferenceEventPayload>) => {
    const response = await apiClient.put(`/conferences/events/${id}`, data);
    return unwrapResponse<ConferenceEvent>(response);
  }, []);

  const updateEventStatus = useCallback(async (id: string, status: ConferenceEventStatus) => {
    await apiClient.patch(`/conferences/events/${id}/status`, { status });
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await apiClient.delete(`/conferences/events/${id}`);
  }, []);

  // ─── Availability ────────────────────────────────────────────────
  const fetchAvailability = useCallback(async (eventId: string, teacherId?: string) => {
    setAvailabilityLoading(true);
    try {
      const params = teacherId ? { teacherId } : undefined;
      const response = await apiClient.get(
        `/conferences/events/${eventId}/availability`,
        { params },
      );
      const list = unwrapList<ConferenceTeacherAvailability>(response);
      setAvailability(list);
    } catch (err: unknown) {
      console.error('Failed to fetch availability:', extractErrorMessage(err));
      setAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  const setTeacherAvailability = useCallback(async (eventId: string, data: ConferenceSetAvailabilityPayload) => {
    const response = await apiClient.post(
      `/conferences/events/${eventId}/availability`,
      data,
    );
    return unwrapResponse<ConferenceTeacherAvailability>(response);
  }, []);

  // ─── Bookings ────────────────────────────────────────────────────
  const fetchBookings = useCallback(async (eventId: string, filters?: BookingFilters) => {
    setBookingsLoading(true);
    try {
      const response = await apiClient.get('/conferences/bookings', {
        params: { eventId, ...filters },
      });
      const list = unwrapList<ConferenceBooking>(response, 'bookings');
      setBookings(list);
    } catch (err: unknown) {
      console.error('Failed to fetch bookings:', extractErrorMessage(err));
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const fetchMySchedule = useCallback(async (eventId: string) => {
    setMyScheduleLoading(true);
    try {
      const response = await apiClient.get('/conferences/bookings/my-schedule', {
        params: { eventId },
      });
      const list = unwrapList<ConferenceBooking>(response);
      setMySchedule(list);
    } catch (err: unknown) {
      console.error('Failed to fetch schedule:', extractErrorMessage(err));
      setMySchedule([]);
    } finally {
      setMyScheduleLoading(false);
    }
  }, []);

  const createBooking = useCallback(async (data: CreateBookingPayload) => {
    const response = await apiClient.post('/conferences/bookings', data);
    return unwrapResponse<ConferenceBooking>(response);
  }, []);

  const cancelBooking = useCallback(async (id: string) => {
    await apiClient.patch(`/conferences/bookings/${id}/cancel`);
  }, []);

  const updateBookingStatus = useCallback(async (id: string, status: 'completed' | 'no_show') => {
    await apiClient.patch(`/conferences/bookings/${id}/status`, { status });
  }, []);

  // ─── Waitlist ────────────────────────────────────────────────────
  const fetchWaitlist = useCallback(async (eventId: string, teacherId?: string) => {
    setWaitlistLoading(true);
    try {
      const params: Record<string, string> = { eventId };
      if (teacherId) params.teacherId = teacherId;
      const response = await apiClient.get('/conferences/waitlist', { params });
      const list = unwrapList<WaitlistEntry>(response);
      setWaitlist(list);
    } catch (err: unknown) {
      console.error('Failed to fetch waitlist:', extractErrorMessage(err));
      setWaitlist([]);
    } finally {
      setWaitlistLoading(false);
    }
  }, []);

  const joinWaitlist = useCallback(async (data: JoinWaitlistPayload) => {
    const response = await apiClient.post('/conferences/waitlist', data);
    return unwrapResponse<WaitlistEntry>(response);
  }, []);

  const leaveWaitlist = useCallback(async (id: string) => {
    await apiClient.delete(`/conferences/waitlist/${id}`);
  }, []);

  // ─── Reports ─────────────────────────────────────────────────────
  const fetchReport = useCallback(async (eventId: string) => {
    setReportLoading(true);
    try {
      const response = await apiClient.get(`/conferences/events/${eventId}/report`);
      setReport(unwrapResponse<ConferenceReport>(response));
    } catch (err: unknown) {
      console.error('Failed to fetch report:', extractErrorMessage(err));
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }, []);

  return {
    events, eventsLoading, fetchEvents,
    createEvent, updateEvent, updateEventStatus, deleteEvent,
    availability, availabilityLoading, fetchAvailability, setTeacherAvailability,
    bookings, bookingsLoading, fetchBookings,
    mySchedule, myScheduleLoading, fetchMySchedule,
    createBooking, cancelBooking, updateBookingStatus,
    waitlist, waitlistLoading, fetchWaitlist, joinWaitlist, leaveWaitlist,
    report, reportLoading, fetchReport,
  };
}
