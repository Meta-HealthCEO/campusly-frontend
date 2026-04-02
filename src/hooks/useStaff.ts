'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Teacher } from '@/types';
import type { StaffFormData } from '@/lib/validations';

export function useStaff() {
  const [staffList, setStaffList] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    try {
      const response = await apiClient.get('/staff');
      if (response.data) {
        const data = unwrapResponse(response);
        const arr = Array.isArray(data) ? data : data.staff ?? [];
        setStaffList(arr);
      }
    } catch {
      console.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  const createStaff = useCallback(async (data: StaffFormData) => {
    try {
      await apiClient.post('/staff', data);
      toast.success('Staff member added successfully!');
      await fetchStaff();
    } catch {
      toast.error('Failed to add staff member');
    }
  }, [fetchStaff]);

  return { staffList, loading, fetchStaff, createStaff };
}
