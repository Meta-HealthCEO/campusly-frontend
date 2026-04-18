import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student } from '@/types';

interface MeritRecord {
  _id: string;
  studentId:
    | {
        _id: string;
        userId?: { firstName?: string; lastName?: string };
        admissionNumber?: string;
      }
    | string;
  awardedBy?: { firstName?: string; lastName?: string };
  type: 'merit' | 'demerit';
  points: number;
  category: string;
  reason: string;
  createdAt: string;
}

interface MeritFormData {
  studentId: string;
  type: 'merit' | 'demerit';
  points: number;
  category: string;
  reason: string;
}

interface MeritBalance {
  meritPoints: number;
  demeritPoints: number;
  netPoints: number;
}

export function useTeacherMerits() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<MeritRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedStudentBalance, setSelectedStudentBalance] = useState<MeritBalance | null>(null);

  const fetchMerits = useCallback(async () => {
    try {
      const params: Record<string, string> = {
        schoolId: user?.schoolId ?? '',
      };
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await apiClient.get('/attendance/merits', { params });
      setRecords(unwrapList<MeritRecord>(res));
    } catch {
      console.error('Failed to load merit records');
    }
  }, [user?.schoolId, typeFilter, categoryFilter]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [, studentsRes] = await Promise.allSettled([
          fetchMerits(),
          apiClient.get('/students'),
        ]);
        if (studentsRes.status === 'fulfilled') {
          setStudents(unwrapList<Student>(studentsRes.value));
        }
      } catch {
        console.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [fetchMerits]);

  useEffect(() => {
    if (!loading) {
      fetchMerits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, categoryFilter]);

  const fetchBalance = useCallback(
    async (studentId: string) => {
      try {
        const res = await apiClient.get(
          `/attendance/merits/balance/${studentId}`,
          { params: { schoolId: user?.schoolId ?? '' } },
        );
        setSelectedStudentBalance(unwrapResponse<MeritBalance>(res));
      } catch {
        toast.error('Failed to load merit balance');
        setSelectedStudentBalance(null);
      }
    },
    [user?.schoolId],
  );

  const createMerit = useCallback(
    async (data: MeritFormData) => {
      try {
        await apiClient.post('/attendance/merits', {
          ...data,
          schoolId: user?.schoolId,
        });
        toast.success('Merit/demerit recorded');
        await fetchMerits();
        return true;
      } catch {
        toast.error('Failed to record merit/demerit');
        return false;
      }
    },
    [user?.schoolId, fetchMerits],
  );

  return {
    records,
    students,
    loading,
    typeFilter,
    categoryFilter,
    setTypeFilter,
    setCategoryFilter,
    createMerit,
    fetchBalance,
    selectedStudentBalance,
  };
}

export type { MeritRecord, MeritFormData, MeritBalance };
