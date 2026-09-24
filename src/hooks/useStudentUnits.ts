'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Course, Enrolment } from '@/types';

export function courseOf(enrolment: Enrolment): Course | null {
  return typeof enrolment.courseId === 'string' ? null : enrolment.courseId;
}

export function courseIdOf(enrolment: Enrolment): string {
  return typeof enrolment.courseId === 'string' ? enrolment.courseId : enrolment.courseId.id;
}

/** The learner's units: what their teachers released to their class. */
export function useStudentUnits() {
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const res = await apiClient.get('/enrolments/me');
      setEnrolments(unwrapList<Enrolment>(res));
      setFailed(false);
    } catch (err: unknown) {
      // A user without a learner record gets a 403 here; show the empty state, not a toast.
      console.error('Failed to load my units', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  /** The unit to pick up: the most recently released one still in progress. */
  const current = enrolments.find((e) => e.status === 'active') ?? null;

  return { enrolments, current, loading, failed, refresh };
}
