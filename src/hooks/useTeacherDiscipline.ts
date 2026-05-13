import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';

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
  const { students: teachingLoadStudents, loading: studentsLoading } = useTeacherClasses();
  // Hoist to a primitive so React Compiler can reason about callback
  // dependencies without flagging the optional-chain expression.
  const schoolId = user?.schoolId ?? '';
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await apiClient.get('/attendance/discipline');
      const arr = unwrapList<DisciplineRecord>(res);
      setRecords(arr);
    } catch (err: unknown) {
      console.warn('Failed to load discipline records', err);
      toast.error('Could not load discipline records. Please refresh.');
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      await fetchRecords();
      setLoading(false);
    }
    fetchData();
  }, [fetchRecords]);

  const createRecord = useCallback(
    async (data: DisciplineFormData) => {
      try {
        await apiClient.post('/attendance/discipline', {
          ...data,
          ...(schoolId ? { schoolId } : {}),
        });
        toast.success('Discipline record created');
        await fetchRecords();
        return true;
      } catch {
        toast.error('Failed to create discipline record');
        return false;
      }
    },
    [schoolId, fetchRecords],
  );

  const updateRecord = useCallback(
    async (id: string, data: Partial<DisciplineFormData & { status: string }>) => {
      try {
        await apiClient.put(`/attendance/discipline/${id}`, data);
        toast.success('Discipline record updated');
        await fetchRecords();
        return true;
      } catch {
        toast.error('Failed to update discipline record');
        return false;
      }
    },
    [fetchRecords],
  );

  return {
    records,
    students: teachingLoadStudents,
    loading: loading || studentsLoading,
    createRecord,
    updateRecord,
  };
}

export type { DisciplineRecord, DisciplineFormData };
