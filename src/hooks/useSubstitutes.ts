'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  SchoolClass,
  SubstituteTeacher,
  SubstituteReasonCategory,
  SubstituteStatus,
  SuggestedSubstituteTeacher,
} from '@/types';

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
}

// Backwards-compat alias — existing code imports SubstituteRecord from this hook
export type SubstituteRecord = SubstituteTeacher;

export interface CreateSubstitutePayload {
  originalTeacherId: string;
  substituteTeacherId: string;
  date: string;
  reason: string;
  reasonCategory: SubstituteReasonCategory;
  isFullDay: boolean;
  periods: number[];
  classIds: string[];
  leaveRequestId?: string;
}

// Re-export the SuggestedTeacher type alias for backwards-compat
export type SuggestedTeacher = SuggestedSubstituteTeacher;

export interface FetchSubstitutesFilters {
  date?: string;
  status?: SubstituteStatus | 'all';
}

export function useSubstitutes() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<SubstituteTeacher[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubstitutes = useCallback(async (filters?: FetchSubstitutesFilters) => {
    try {
      const params: Record<string, string> = { schoolId: user?.schoolId ?? '' };
      if (filters?.date) params.date = new Date(filters.date).toISOString();
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      const res = await apiClient.get('/attendance/substitutes', { params });
      const raw = unwrapResponse<unknown>(res);
      const arr = Array.isArray(raw)
        ? raw
        : ((raw as { data?: SubstituteTeacher[] })?.data ?? []);
      setRecords(arr as SubstituteTeacher[]);
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
        const d = unwrapResponse<unknown>(staffRes.value);
        const arr = Array.isArray(d)
          ? d
          : ((d as { data?: unknown[] })?.data ?? []);
        setStaff((arr as Record<string, unknown>[]).map((s) => {
          const u = s.user as Record<string, unknown> | undefined;
          return {
            id: (s.id ?? s._id ?? s.userId) as string,
            firstName: (u?.firstName ?? s.firstName ?? '') as string,
            lastName: (u?.lastName ?? s.lastName ?? '') as string,
          };
        }));
      }
      if (classesRes.status === 'fulfilled') {
        const d = unwrapResponse<unknown>(classesRes.value);
        const arr = Array.isArray(d)
          ? d
          : ((d as { data?: unknown[] })?.data ?? []);
        setClasses((arr as Record<string, unknown>[]).map((c) => ({
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

  const createSubstitute = useCallback(async (data: CreateSubstitutePayload) => {
    try {
      await apiClient.post('/attendance/substitutes', {
        ...data,
        schoolId: user?.schoolId,
      });
      toast.success('Substitute assigned');
      await fetchSubstitutes();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to assign substitute'));
      throw err;
    }
  }, [user?.schoolId, fetchSubstitutes]);

  const updateSubstitute = useCallback(async (
    id: string,
    data: Partial<CreateSubstitutePayload>,
  ) => {
    try {
      await apiClient.put(`/attendance/substitutes/${id}`, data);
      toast.success('Substitute updated');
      await fetchSubstitutes();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update substitute'));
      throw err;
    }
  }, [fetchSubstitutes]);

  const approveSubstitute = useCallback(async (id: string) => {
    try {
      await apiClient.post(`/attendance/substitutes/${id}/approve`);
      toast.success('Substitute approved');
      await fetchSubstitutes();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to approve'));
      throw err;
    }
  }, [fetchSubstitutes]);

  const declineSubstitute = useCallback(async (id: string, reason: string) => {
    try {
      await apiClient.post(`/attendance/substitutes/${id}/decline`, { reason });
      toast.success('Substitute declined');
      await fetchSubstitutes();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to decline'));
      throw err;
    }
  }, [fetchSubstitutes]);

  const deleteSubstitute = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/attendance/substitutes/${id}`);
      toast.success('Substitute assignment deleted');
      await fetchSubstitutes();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete assignment'));
      throw err;
    }
  }, [fetchSubstitutes]);

  const fetchSuggestions = useCallback(async (
    date: string,
    periods: number[],
    originalTeacherId: string,
  ): Promise<SuggestedSubstituteTeacher[]> => {
    try {
      const res = await apiClient.get('/attendance/substitutes/suggestions', {
        params: { date, periods: periods.join(','), originalTeacherId },
      });
      return unwrapList<SuggestedSubstituteTeacher>(res);
    } catch {
      return [];
    }
  }, []);

  return {
    records, staff, classes, loading,
    fetchSubstitutes, initialize,
    createSubstitute, updateSubstitute,
    approveSubstitute, declineSubstitute,
    deleteSubstitute, fetchSuggestions,
  };
}
