'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { PaperAssignment, PaperAssignmentMode } from '@/types/papers';

interface CreateAssignmentInput {
  classId: string;
  mode: PaperAssignmentMode;
  releaseAt?: string | null;
  dueAt?: string | null;
}

/**
 * Manage class assignments for a single paper. The list is loaded once on
 * mount and kept in sync via the create / remove mutations — both endpoints
 * return the full assignments array on success so we just replace state.
 */
export function usePaperAssignments(paperId: string | undefined): {
  assignments: PaperAssignment[];
  loading: boolean;
  mutating: boolean;
  addAssignment: (input: CreateAssignmentInput) => Promise<boolean>;
  removeAssignment: (assignmentId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
} {
  const [assignments, setAssignments] = useState<PaperAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const fetchAssignments = useCallback(async () => {
    if (!paperId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/question-bank/papers/${paperId}/assignments`);
      setAssignments(unwrapResponse<PaperAssignment[]>(res));
    } catch (err: unknown) {
      console.error('Failed to load paper assignments', err);
    } finally {
      setLoading(false);
    }
  }, [paperId]);

  useEffect(() => { void fetchAssignments(); }, [fetchAssignments]);

  const addAssignment = useCallback(async (input: CreateAssignmentInput): Promise<boolean> => {
    if (!paperId) return false;
    setMutating(true);
    try {
      const res = await apiClient.post(
        `/question-bank/papers/${paperId}/assignments`,
        input,
      );
      setAssignments(unwrapResponse<PaperAssignment[]>(res));
      toast.success(input.mode === 'digital'
        ? 'Paper assigned — class can take it on screen'
        : 'Paper assigned — ready to print');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not assign paper'));
      return false;
    } finally {
      setMutating(false);
    }
  }, [paperId]);

  const removeAssignment = useCallback(async (assignmentId: string): Promise<boolean> => {
    if (!paperId) return false;
    setMutating(true);
    try {
      const res = await apiClient.delete(
        `/question-bank/papers/${paperId}/assignments/${assignmentId}`,
      );
      setAssignments(unwrapResponse<PaperAssignment[]>(res));
      toast.success('Assignment removed');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not remove assignment'));
      return false;
    } finally {
      setMutating(false);
    }
  }, [paperId]);

  return {
    assignments,
    loading,
    mutating,
    addAssignment,
    removeAssignment,
    refetch: fetchAssignments,
  };
}
