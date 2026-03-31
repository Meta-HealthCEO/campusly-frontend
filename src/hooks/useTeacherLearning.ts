import { useState, useEffect, useCallback } from 'react';
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
    }
    if (results[1].status === 'fulfilled') {
      setHomework(unwrapList<Homework>(results[1].value));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { classes, homework };
}
