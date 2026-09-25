'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  AssignmentSubmission,
  StudentAssignmentItem,
  SubmitAssignmentInput,
} from '@/types/assignments';

/** `enabled: false` skips the list request (a school learner's Homework page lists no projects). */
export function useStudentAssignments(enabled = true) {
  const [items, setItems] = useState<StudentAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (!enabled) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await apiClient.get('/assignments/student/mine');
      setItems(unwrapResponse<StudentAssignmentItem[]>(res));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load assignments.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { void fetchAssignments(); }, [fetchAssignments]);

  const getById = useCallback(async (id: string): Promise<StudentAssignmentItem | null> => {
    try {
      const res = await apiClient.get(`/assignments/${id}`);
      return unwrapResponse<StudentAssignmentItem>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load assignment.'));
      return null;
    }
  }, []);

  const submit = useCallback(async (
    assignmentId: string,
    payload: SubmitAssignmentInput,
  ): Promise<AssignmentSubmission | null> => {
    try {
      const res = await apiClient.post(`/assignments/${assignmentId}/submit`, payload);
      const submission = unwrapResponse<AssignmentSubmission>(res);
      toast.success('Submitted');
      return submission;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to submit.'));
      return null;
    }
  }, []);

  return { items, loading, fetchAssignments, getById, submit };
}
