import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { SchoolClass } from '@/types';

interface JoinClassResult {
  class: SchoolClass;
  previousClassId: string | null;
  /** added: a second group (standalone classrooms); already: nothing changed; moved: a school learner's new class. */
  joined: 'moved' | 'added' | 'already';
  message: string;
}

interface UseJoinClassResult {
  join: (code: string) => Promise<JoinClassResult>;
  submitting: boolean;
}

export function useJoinClass(): UseJoinClassResult {
  const [submitting, setSubmitting] = useState(false);

  const join = useCallback(async (code: string): Promise<JoinClassResult> => {
    setSubmitting(true);
    try {
      const res = await apiClient.post('/academic/classes/join', { code: code.trim() });
      return unwrapResponse<JoinClassResult>(res);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Could not join class'));
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { join, submitting };
}
