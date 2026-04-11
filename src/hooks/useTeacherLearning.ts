import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { SchoolClass, Homework } from '@/types';

export function useTeacherLearning() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);

  const loadData = useCallback(async () => {
    const results = await Promise.allSettled([
      apiClient.get('/academic/classes'),
      apiClient.get('/homework'),
    ]);
    if (results[0].status === 'fulfilled') {
      setClasses(unwrapList<SchoolClass>(results[0].value));
    } else {
      console.error('Failed to load classes', results[0].reason);
      toast.error('Could not load classes. Please refresh.');
    }
    if (results[1].status === 'fulfilled') {
      setHomework(unwrapList<Homework>(results[1].value));
    } else {
      console.error('Failed to load homework', results[1].reason);
      toast.error('Could not load homework. Please refresh.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { classes, homework };
}
