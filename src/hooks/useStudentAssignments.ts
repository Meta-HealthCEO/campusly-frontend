'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  Assignment,
  AssignmentSubmission,
  StudentAssignmentItem,
  SubmitAssignmentInput,
} from '@/types/assignments';

export function useStudentAssignments() {
  const [items, setItems] = useState<StudentAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
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
  }, []);

  useEffect(() => { void fetchAssignments(); }, [fetchAssignments]);

  const getById = useCallback(async (id: string): Promise<Assignment | null> => {
    try {
      const res = await apiClient.get(`/assignments/${id}`);
      return unwrapResponse<Assignment>(res);
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
