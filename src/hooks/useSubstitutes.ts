'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SchoolClass } from '@/types';

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
}

export interface SubstituteRecord {
  _id: string;
  originalTeacherId: { _id: string; firstName?: string; lastName?: string } | string;
  substituteTeacherId: { _id: string; firstName?: string; lastName?: string } | string;
  date: string;
  periods: number[];
  reason: string;
  classIds: ({ _id: string; name?: string } | string)[];
  approvedBy?: { firstName?: string; lastName?: string } | string;
  createdAt: string;
}

export interface SubstituteFormData {
  originalTeacherId: string;
  substituteTeacherId: string;
  date: string;
  reason: string;
  periods: number[];
  classIds: string[];
}

export function useSubstitutes() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<SubstituteRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubstitutes = useCallback(async (dateFilter?: string) => {
    try {
      const params: Record<string, string> = { schoolId: user?.schoolId ?? '' };
      if (dateFilter) params.date = new Date(dateFilter).toISOString();
      const res = await apiClient.get('/attendance/substitutes', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : raw.data ?? [];
      setRecords(arr);
    } catch {
      console.error('Failed to load substitute assignments');
    }
  }, [user?.schoolId]);

  const fetchSupportData = useCallback(async () => {
    try {
      const [staffRes, classesRes] = await Promise.allSettled([
        apiClient.get('/staff'),
        apiClient.get('/academic/classes'),
      ]);
      if (staffRes.status === 'fulfilled') {
        const d = unwrapResponse(staffRes.value);
        const arr = Array.isArray(d) ? d : d.data ?? [];
        setStaff(arr.map((s: Record<string, unknown>) => {
          const u = s.user as Record<string, unknown> | undefined;
          return {
            id: (s.id ?? s._id ?? s.userId) as string,
            firstName: (u?.firstName ?? s.firstName ?? '') as string,
            lastName: (u?.lastName ?? s.lastName ?? '') as string,
          };
        }));
      }
      if (classesRes.status === 'fulfilled') {
        const d = unwrapResponse(classesRes.value);
        const arr = Array.isArray(d) ? d : d.data ?? [];
        setClasses(arr.map((c: Record<string, unknown>) => ({
          ...c,
          id: (c.id ?? c._id) as string,
        })) as SchoolClass[]);
      }
    } catch {
      console.error('Failed to load support data');
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      await Promise.allSettled([
        fetchSubstitutes(),
        fetchSupportData(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchSubstitutes, fetchSupportData]);

  const createSubstitute = useCallback(async (data: SubstituteFormData) => {
    try {
      await apiClient.post('/attendance/substitutes', {
        ...data,
        schoolId: user?.schoolId,
      });
      toast.success('Substitute assigned');
      await fetchSubstitutes();
    } catch {
      toast.error('Failed to assign substitute');
    }
  }, [user?.schoolId, fetchSubstitutes]);

  const deleteSubstitute = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/attendance/substitutes/${id}`);
      toast.success('Substitute assignment deleted');
      await fetchSubstitutes();
    } catch {
      toast.error('Failed to delete assignment');
    }
  }, [fetchSubstitutes]);

  return {
    records, staff, classes, loading,
    fetchSubstitutes, initialize,
    createSubstitute, deleteSubstitute,
  };
}
