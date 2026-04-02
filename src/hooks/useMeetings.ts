'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  MeetingDay,
  MeetingSlot,
  MeetingDayStats,
  CreateMeetingDayPayload,
  BookSlotPayload,
} from '@/types';

export function useMeetings() {
  const [meetingDays, setMeetingDays] = useState<MeetingDay[]>([]);
  const [availableSlots, setAvailableSlots] = useState<MeetingSlot[]>([]);
  const [teacherSlots, setTeacherSlots] = useState<MeetingSlot[]>([]);
  const [parentBookings, setParentBookings] = useState<MeetingSlot[]>([]);
  const [meetingDayStats, setMeetingDayStats] = useState<MeetingDayStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMeetingDays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/meetings/days');
      setMeetingDays(unwrapList<MeetingDay>(res));
    } catch (err: unknown) {
      console.error('Failed to load meeting days', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createMeetingDay = useCallback(async (payload: CreateMeetingDayPayload) => {
    const res = await apiClient.post('/meetings/days', payload);
    const created = unwrapResponse<MeetingDay>(res);
    toast.success('Meeting day created!');
    return created;
  }, []);

  const generateSlots = useCallback(
    async (meetingDayId: string, teacherId: string, teacherName: string) => {
      const res = await apiClient.post('/meetings/slots/generate', {
        meetingDayId,
        teacherId,
        teacherName,
      });
      const slots = unwrapList<MeetingSlot>(res);
      toast.success(`${slots.length} slots generated`);
      return slots;
    },
    [],
  );

  const loadAvailableSlots = useCallback(
    async (meetingDayId: string, teacherId?: string) => {
      try {
        const params: Record<string, string> = { meetingDayId };
        if (teacherId) params.teacherId = teacherId;
        const res = await apiClient.get('/meetings/available', { params });
        setAvailableSlots(unwrapList<MeetingSlot>(res));
      } catch (err: unknown) {
        console.error('Failed to load available slots', err);
      }
    },
    [],
  );

  const loadTeacherSlots = useCallback(async (meetingDayId?: string) => {
    try {
      const params: Record<string, string> = {};
      if (meetingDayId) params.meetingDayId = meetingDayId;
      const res = await apiClient.get('/meetings/teacher/slots', { params });
      setTeacherSlots(unwrapList<MeetingSlot>(res));
    } catch (err: unknown) {
      console.error('Failed to load teacher slots', err);
    }
  }, []);

  const loadParentBookings = useCallback(async () => {
    try {
      const res = await apiClient.get('/meetings/parent/bookings');
      setParentBookings(unwrapList<MeetingSlot>(res));
    } catch (err: unknown) {
      console.error('Failed to load parent bookings', err);
    }
  }, []);

  const bookSlot = useCallback(async (slotId: string, payload: BookSlotPayload) => {
    const res = await apiClient.post(`/meetings/slots/${slotId}/book`, payload);
    toast.success('Slot booked successfully!');
    return unwrapResponse<MeetingSlot>(res);
  }, []);

  const cancelBooking = useCallback(async (slotId: string) => {
    await apiClient.patch(`/meetings/slots/${slotId}/cancel`);
    toast.success('Booking cancelled');
  }, []);

  const markComplete = useCallback(async (slotId: string, notes?: string) => {
    await apiClient.patch(`/meetings/slots/${slotId}/complete`, { notes });
    toast.success('Marked as complete');
  }, []);

  const loadStats = useCallback(async (meetingDayId: string) => {
    try {
      const res = await apiClient.get(`/meetings/days/${meetingDayId}/stats`);
      const stats = unwrapResponse<MeetingDayStats>(res);
      setMeetingDayStats(stats);
      return stats;
    } catch (err: unknown) {
      console.error('Failed to load stats', err);
      return null;
    }
  }, []);

  return {
    meetingDays,
    availableSlots,
    teacherSlots,
    parentBookings,
    meetingDayStats,
    loading,
    loadMeetingDays,
    createMeetingDay,
    generateSlots,
    loadAvailableSlots,
    loadTeacherSlots,
    loadParentBookings,
    bookSlot,
    cancelBooking,
    markComplete,
    loadStats,
    extractErrorMessage,
  };
}
