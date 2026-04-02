'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

export function useActivityBooking() {
  const bookActivity = useCallback(async (activityId: string, studentId: string) => {
    await apiClient.post(`/after-care/activities/${activityId}/book`, { studentId });
    toast.success('Activity booked successfully');
  }, []);

  const cancelBooking = useCallback(async (activityId: string, studentId: string) => {
    await apiClient.delete(`/after-care/activities/${activityId}/book/${studentId}`);
    toast.success('Booking cancelled');
  }, []);

  return { bookActivity, cancelBooking };
}
