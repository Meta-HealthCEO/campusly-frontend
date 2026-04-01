import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student360Data } from '@/types';

interface UseStudent360Return {
  data: Student360Data | null;
  loading: boolean;
}

export function useStudent360(studentId: string): UseStudent360Return {
  const { user } = useAuthStore();
  const [data, setData] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudent360 = useCallback(async () => {
    if (!studentId || !user?.schoolId) return;
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/teacher-workbench/student-360/${studentId}`,
        { params: { schoolId: user.schoolId } },
      );
      const result = unwrapResponse<Student360Data>(response);
      setData(result);
    } catch (err: unknown) {
      console.error('Failed to load student 360 data', err);
    } finally {
      setLoading(false);
    }
  }, [studentId, user?.schoolId]);

  useEffect(() => {
    fetchStudent360();
  }, [fetchStudent360]);

  return { data, loading };
}
