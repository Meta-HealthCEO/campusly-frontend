import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Student } from '@/types';

export function useTeacherStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiClient.get('/students', { signal });
      setStudents(unwrapList<Student>(res));
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'CanceledError') return;
      console.error('Failed to load students', err);
      toast.error('Could not load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStudents(controller.signal);
    return () => controller.abort();
  }, [fetchStudents]);

  const deleteStudent = async (id: string) => {
    await apiClient.delete(`/students/${id}`);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    toast.success('Student removed');
  };

  return { students, loading, refetch: fetchStudents, deleteStudent };
}
