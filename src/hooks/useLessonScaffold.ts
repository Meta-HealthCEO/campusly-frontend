import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { ScaffoldedOutline, ScaffoldLessonPayload, Lesson, CreateLessonPayload } from '@/types/lesson';

export function useLessonScaffold() {
  const [scaffolding, setScaffolding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scaffold = useCallback(async (input: ScaffoldLessonPayload): Promise<ScaffoldedOutline> => {
    setScaffolding(true);
    try {
      const res = await apiClient.post('/lessons/scaffold', input);
      setError(null);
      return unwrapResponse<ScaffoldedOutline>(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to scaffold';
      setError(msg);
      throw err;
    } finally {
      setScaffolding(false);
    }
  }, []);

  const createLesson = useCallback(async (payload: CreateLessonPayload): Promise<Lesson> => {
    setCreating(true);
    try {
      const res = await apiClient.post('/lessons', payload);
      setError(null);
      return unwrapResponse<Lesson>(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create lesson';
      setError(msg);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  return { scaffold, createLesson, scaffolding, creating, error };
}
