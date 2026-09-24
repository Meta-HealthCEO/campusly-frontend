'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useModule } from '@/hooks/useModule';
import { currentEnrolment } from '@/lib/learner-unit';
import type { Course, Enrolment } from '@/types';

export function courseOf(enrolment: Enrolment): Course | null {
  return typeof enrolment.courseId === 'string' ? null : enrolment.courseId;
}

export function courseIdOf(enrolment: Enrolment): string {
  return typeof enrolment.courseId === 'string' ? enrolment.courseId : enrolment.courseId.id;
}

/** The learner's units: what their teachers released to their class. */
export function useStudentUnits() {
  const { isModuleEnabled } = useModule();
  const enabled = isModuleEnabled('courses');
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setEnrolments([]);
      setFailed(false);
      setLoading(false);
      return;
    }
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
  }, [enabled]);

  useEffect(() => { void refresh(); }, [refresh]);

  /** The unit to pick up: the one actually in progress, not just the newest active enrolment. */
  const current = currentEnrolment(enrolments);

  return { enrolments, current, loading, failed, refresh };
}
