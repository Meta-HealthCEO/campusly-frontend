import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student } from '@/types';

interface DisciplineRecord {
  _id: string;
  studentId:
    | {
        _id: string;
        userId?: { firstName?: string; lastName?: string };
        admissionNumber?: string;
      }
    | string;
  reportedBy?: { firstName?: string; lastName?: string };
  type: string;
  severity: string;
  description: string;
  status: string;
  outcome?: string;
  parentNotified?: boolean;
  createdAt: string;
}

interface DisciplineFormData {
  studentId: string;
  type: string;
  severity: string;
  description: string;
  actionTaken?: string;
  outcome?: string;
  parentNotified?: boolean;
}

export function useTeacherDiscipline() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await apiClient.get('/attendance/discipline', {
        params: { schoolId: user?.schoolId },
      });
      const arr = unwrapList<DisciplineRecord>(res);
      setRecords(arr);
    } catch {
      console.error('Failed to load discipline records');
    }
  }, [user?.schoolId]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [, studentsRes] = await Promise.allSettled([
          fetchRecords(),
          apiClient.get('/students'),
        ]);
        if (studentsRes.status === 'fulfilled') {
          const arr = unwrapList<Student>(studentsRes.value);
          setStudents(arr);
        }
      } catch {
        console.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [fetchRecords]);

  const createRecord = useCallback(
    async (data: DisciplineFormData) => {
      try {
        await apiClient.post('/attendance/discipline', {
          ...data,
          schoolId: user?.schoolId,
        });
        toast.success('Discipline record created');
        await fetchRecords();
        return true;
      } catch {
        toast.error('Failed to create discipline record');
        return false;
      }
    },
    [user?.schoolId, fetchRecords],
  );

  return { records, students, loading, createRecord };
}

export type { DisciplineRecord, DisciplineFormData };
