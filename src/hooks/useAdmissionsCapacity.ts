'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { GradeCapacity } from '@/types/admissions';

interface CapacityUpdateEntry {
  grade: number;
  maxCapacity: number;
}

export function useAdmissionsCapacity() {
  const [capacities, setCapacities] = useState<GradeCapacity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCapacity = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admissions/capacity');
      const data = unwrapList<GradeCapacity>(response);
      setCapacities(data);
    } catch (err: unknown) {
      console.error('Failed to fetch capacity', err);
      toast.error('Failed to load capacity data');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCapacity = useCallback(async (grades: CapacityUpdateEntry[]) => {
    try {
      const response = await apiClient.put('/admissions/capacity', { grades });
      const data = unwrapResponse(response);
      toast.success('Capacity updated successfully');
      return data;
    } catch (err: unknown) {
      console.error('Failed to update capacity', err);
      toast.error('Failed to update capacity');
      throw err;
    }
  }, []);

  const offerToWaitlist = useCallback(async (grade: number) => {
    try {
      const response = await apiClient.post(`/admissions/capacity/${grade}/offer-waitlist`);
      const data = unwrapResponse(response);
      toast.success('Offer sent to waitlisted applicant');
      return data;
    } catch (err: unknown) {
      console.error('Failed to offer to waitlist', err);
      toast.error('Failed to send offer');
      throw err;
    }
  }, []);

  return {
    capacities,
    loading,
    fetchCapacity,
    updateCapacity,
    offerToWaitlist,
  };
}
