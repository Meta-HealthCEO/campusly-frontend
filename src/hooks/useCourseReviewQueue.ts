import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { Course, CourseTree } from '@/types';

/**
 * Hook for the HOD / admin course review queue. Fetches all courses
 * currently in review state across the school, and exposes publish +
 * reject mutations. Also exposes a `fetchCoursePreview` helper that
 * the preview dialog uses to load the full module/lesson tree for a
 * single course.
 */
export function useCourseReviewQueue() {
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await apiClient.get('/courses', { params: { status: 'in_review' } });
      setItems(unwrapList<Course>(res));
    } catch (err: unknown) {
      console.error('Failed to load review queue', err);
      toast.error(extractErrorMessage(err, 'Could not load review queue. Please refresh.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const fetchCoursePreview = useCallback(async (id: string): Promise<CourseTree | null> => {
    try {
      const res = await apiClient.get(`/courses/${id}`);
      return unwrapResponse<CourseTree>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load course preview'));
      return null;
    }
  }, []);

  const publish = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.post(`/courses/${id}/publish`);
      setItems((prev) => prev.filter((c) => c.id !== id));
      toast.success('Course published');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to publish course'));
      return false;
    }
  }, []);

  const reject = useCallback(async (id: string, reviewNotes: string): Promise<boolean> => {
    try {
      await apiClient.post(`/courses/${id}/reject`, { reviewNotes });
      setItems((prev) => prev.filter((c) => c.id !== id));
      toast.success('Course rejected with feedback');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to reject course'));
      return false;
    }
  }, []);

  return { items, loading, fetchCoursePreview, publish, reject, refresh: fetchQueue };
}
