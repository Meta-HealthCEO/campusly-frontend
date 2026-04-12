import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { Course, Enrolment } from '@/types';

/**
 * Hook for the student catalog + my-courses pages. Loads both the
 * public catalog (published courses in the school) and the student's
 * own enrolments in parallel on mount.
 *
 * - `myEnrolments` — active + completed enrolments populated with their
 *   Course summary (title, slug, cover, etc.) so the card view doesn't
 *   need a second fetch.
 * - `catalog` — published courses visible to this school.
 * - `refresh()` — refetch both lists (useful after a teacher assigns
 *   a new course and the student lands back on the page).
 */
export function useStudentCourses() {
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [myEnrolments, setMyEnrolments] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await apiClient.get('/courses/catalog');
      setCatalog(unwrapList<Course>(res));
    } catch (err: unknown) {
      console.error('Failed to load catalog', err);
      toast.error(extractErrorMessage(err, 'Could not load the course catalog. Please refresh.'));
    }
  }, []);

  const fetchMyEnrolments = useCallback(async () => {
    try {
      const res = await apiClient.get('/enrolments/me');
      setMyEnrolments(unwrapList<Enrolment>(res));
    } catch (err: unknown) {
      // A user without a Student record (e.g. a teacher viewing this page
      // by accident) gets a 403. Don't spam them with a toast — just log.
      console.error('Failed to load my enrolments', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.allSettled([fetchCatalog(), fetchMyEnrolments()]);
  }, [fetchCatalog, fetchMyEnrolments]);

  useEffect(() => {
    void (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  return { catalog, myEnrolments, loading, refresh };
}
