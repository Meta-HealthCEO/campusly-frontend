import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { mapId, unwrapList } from '@/lib/api-helpers';
import type { Student } from '@/types';

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/students');
      const arr = unwrapList<Record<string, unknown>>(response, 'students');
      setStudents(arr.map((s) => mapId(s) as unknown as Student));
    } catch {
      console.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { students, loading, refetch: fetchStudents };
}

export async function fetchStudentById(id: string): Promise<Student | null> {
  try {
    const res = await apiClient.get(`/students/${id}`);
    const raw = res.data.data ?? res.data;
    const mapped = mapId(raw as Record<string, unknown>);
    return mapped as unknown as Student;
  } catch {
    console.error('Failed to load student');
    return null;
  }
}
