'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student } from '@/types';

export interface DisciplineRecord {
  _id: string;
  studentId: {
    _id: string;
    userId?: { firstName?: string; lastName?: string };
    admissionNumber?: string;
  } | string;
  reportedBy?: {
    firstName?: string;
    lastName?: string;
  };
  type: string;
  severity: string;
  description: string;
  status: string;
  outcome?: string;
  parentNotified?: boolean;
  createdAt: string;
}

export interface DisciplineFormInput {
  studentId: string;
  type: string;
  severity: string;
  description: string;
  actionTaken?: string;
  outcome?: string;
  parentNotified?: boolean;
}

export function useDiscipline() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async (filters?: {
    status?: string;
    type?: string;
  }) => {
    try {
      const params: Record<string, string> = { schoolId: user?.schoolId ?? '' };
      if (filters?.status) params.status = filters.status;
      if (filters?.type) params.type = filters.type;
      const res = await apiClient.get('/attendance/discipline', { params });
      const raw = unwrapResponse(res);
      const arr: DisciplineRecord[] = Array.isArray(raw) ? raw : raw.data ?? [];
      setRecords(arr);
    } catch {
      console.error('Failed to load discipline records');
    }
  }, [user?.schoolId]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await apiClient.get('/students');
      const d = unwrapResponse(res);
      const arr: Record<string, unknown>[] = Array.isArray(d) ? d : d.data ?? [];
      setStudents(arr.map((s: Record<string, unknown>) => ({
        ...s,
        id: (s.id ?? s._id) as string,
      })) as Student[]);
    } catch {
      console.error('Failed to load students');
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      await Promise.allSettled([fetchRecords(), fetchStudents()]);
    } finally {
      setLoading(false);
    }
  }, [fetchRecords, fetchStudents]);

  const createRecord = useCallback(async (data: DisciplineFormInput) => {
    try {
      await apiClient.post('/attendance/discipline', {
        ...data,
        schoolId: user?.schoolId,
      });
      toast.success('Discipline record created');
      await fetchRecords();
    } catch {
      toast.error('Failed to create discipline record');
    }
  }, [user?.schoolId, fetchRecords]);

  const deleteRecord = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/attendance/discipline/${id}`);
      toast.success('Discipline record deleted');
      await fetchRecords();
    } catch {
      toast.error('Failed to delete discipline record');
    }
  }, [fetchRecords]);

  return {
    records, students, loading,
    fetchRecords, initialize,
    createRecord, deleteRecord,
  };
}
