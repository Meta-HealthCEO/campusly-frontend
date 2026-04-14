import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Subject } from '@/types';

/**
 * Returns subjects available to the calling teacher, optionally filtered
 * by grade. When `gradeId` is provided, only subjects whose `gradeIds`
 * array includes that grade are returned (backend filter). When omitted,
 * returns all subjects the teacher can access.
 *
 * The hook re-fetches whenever `gradeId` changes, so it can be driven
 * by a grade Select in a form — pick a grade, subjects update.
 */
export function useTeacherSubjects(gradeId?: string) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true);
      try {
        const params = gradeId ? { gradeId } : undefined;
        const res = await apiClient.get('/academic/subjects', { params });
        if (!cancelled) setSubjects(unwrapList<Subject>(res));
      } catch (err: unknown) {
        console.error('Failed to load teacher subjects', err);
        toast.error('Could not load subjects.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [gradeId]);

  return { subjects, loading };
}
