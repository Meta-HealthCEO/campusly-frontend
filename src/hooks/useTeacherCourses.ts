import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { Course, CourseStatus } from '@/types';

export interface CourseFilters {
  status?: CourseStatus;
  mine?: boolean;
  search?: string;
}

export interface CreateCourseInput {
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  subjectId?: string | null;
  gradeLevel?: number | null;
  tags?: string[];
  estimatedDurationHours?: number | null;
  passMarkPercent?: number;
  certificateEnabled?: boolean;
}

/**
 * Hook for the teacher course list page. Fetches the teacher's own
 * courses (plus any admin-visible ones based on role), exposes filter
 * state, and provides mutations for the lifecycle actions.
 */
export function useTeacherCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CourseFilters>({});

  const fetchCourses = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {};
      if (filters.status) params.status = filters.status;
      if (filters.mine !== undefined) params.mine = filters.mine;
      if (filters.search) params.search = filters.search;
      const res = await apiClient.get('/courses', { params });
      setCourses(unwrapList<Course>(res));
    } catch (err: unknown) {
      console.error('Failed to load courses', err);
      toast.error(extractErrorMessage(err, 'Could not load courses. Please refresh.'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const createCourse = useCallback(async (data: CreateCourseInput): Promise<Course | null> => {
    try {
      const res = await apiClient.post('/courses', data);
      const created = unwrapResponse<Course>(res);
      setCourses((prev) => [created, ...prev]);
      toast.success('Course created');
      return created;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create course'));
      return null;
    }
  }, []);

  const deleteCourse = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast.success('Course deleted');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete course'));
      return false;
    }
  }, []);

  const submitForReview = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await apiClient.post(`/courses/${id}/submit-for-review`);
      const updated = unwrapResponse<Course>(res);
      setCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success('Course submitted for review');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to submit course for review'));
      return false;
    }
  }, []);

  const publishCourse = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await apiClient.post(`/courses/${id}/publish`);
      const updated = unwrapResponse<Course>(res);
      setCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success('Course published');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to publish course'));
      return false;
    }
  }, []);

  const rejectCourse = useCallback(async (id: string, reviewNotes: string): Promise<boolean> => {
    try {
      const res = await apiClient.post(`/courses/${id}/reject`, { reviewNotes });
      const updated = unwrapResponse<Course>(res);
      setCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success('Course rejected with feedback');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to reject course'));
      return false;
    }
  }, []);

  const archiveCourse = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await apiClient.post(`/courses/${id}/archive`);
      const updated = unwrapResponse<Course>(res);
      setCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast.success('Course archived');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to archive course'));
      return false;
    }
  }, []);

  return {
    courses,
    loading,
    filters,
    setFilters,
    createCourse,
    deleteCourse,
    submitForReview,
    publishCourse,
    rejectCourse,
    archiveCourse,
    refresh: fetchCourses,
  };
}
