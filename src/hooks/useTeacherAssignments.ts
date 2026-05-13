'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  Assignment,
  AssignmentClassPush,
  AssignmentSubmission,
  AIGeneratedAssignment,
  CreateAssignmentInput,
  CreateClassPushInput,
  GenerateAssignmentRequest,
  MarkSubmissionInput,
  UpdateAssignmentInput,
} from '@/types/assignments';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useTeacherAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAssignments = useCallback(async (params?: Record<string, string | number>) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assignments', { params });
      const result = unwrapResponse<PaginatedResponse<Assignment>>(res);
      setAssignments(result.data);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load assignments.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const getById = useCallback(async (id: string): Promise<Assignment | null> => {
    try {
      const res = await apiClient.get(`/assignments/${id}`);
      return unwrapResponse<Assignment>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load assignment.'));
      return null;
    }
  }, []);

  const create = useCallback(async (data: CreateAssignmentInput): Promise<Assignment | null> => {
    try {
      const res = await apiClient.post('/assignments', data);
      const created = unwrapResponse<Assignment>(res);
      toast.success('Assignment created');
      return created;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create assignment.'));
      return null;
    }
  }, []);

  const update = useCallback(async (
    id: string,
    data: UpdateAssignmentInput,
  ): Promise<Assignment | null> => {
    try {
      const res = await apiClient.put(`/assignments/${id}`, data);
      return unwrapResponse<Assignment>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update assignment.'));
      return null;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/assignments/${id}`);
      toast.success('Assignment deleted');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete assignment.'));
      return false;
    }
  }, []);

  // ─── AI generation ─────────────────────────────────────────────────────

  const generateDraft = useCallback(async (
    payload: GenerateAssignmentRequest,
  ): Promise<AIGeneratedAssignment | null> => {
    try {
      const res = await apiClient.post('/assignments/generate', payload);
      return unwrapResponse<AIGeneratedAssignment>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'AI generation failed.'));
      return null;
    }
  }, []);

  // ─── Class push ─────────────────────────────────────────────────────────

  const listClassPushes = useCallback(async (
    id: string,
  ): Promise<AssignmentClassPush[]> => {
    const res = await apiClient.get(`/assignments/${id}/classes`);
    return unwrapResponse<AssignmentClassPush[]>(res);
  }, []);

  const addClassPush = useCallback(async (
    id: string,
    payload: CreateClassPushInput,
  ): Promise<AssignmentClassPush[] | null> => {
    try {
      const res = await apiClient.post(`/assignments/${id}/classes`, payload);
      const list = unwrapResponse<AssignmentClassPush[]>(res);
      toast.success('Assignment pushed to class');
      return list;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to push assignment to class.'));
      return null;
    }
  }, []);

  const removeClassPush = useCallback(async (
    id: string,
    classAssignmentId: string,
  ): Promise<AssignmentClassPush[] | null> => {
    try {
      const res = await apiClient.delete(
        `/assignments/${id}/classes/${classAssignmentId}`,
      );
      toast.success('Removed from class');
      return unwrapResponse<AssignmentClassPush[]>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to remove class assignment.'));
      return null;
    }
  }, []);

  // ─── Submissions ────────────────────────────────────────────────────────

  const listSubmissions = useCallback(async (
    id: string,
  ): Promise<AssignmentSubmission[]> => {
    try {
      const res = await apiClient.get(`/assignments/${id}/submissions`);
      return unwrapResponse<AssignmentSubmission[]>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load submissions.'));
      return [];
    }
  }, []);

  const getSubmission = useCallback(async (
    submissionId: string,
  ): Promise<AssignmentSubmission | null> => {
    try {
      const res = await apiClient.get(`/assignments/submissions/${submissionId}`);
      return unwrapResponse<AssignmentSubmission>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Could not load submission.'));
      return null;
    }
  }, []);

  const markSubmission = useCallback(async (
    submissionId: string,
    payload: MarkSubmissionInput,
  ): Promise<AssignmentSubmission | null> => {
    try {
      const res = await apiClient.post(
        `/assignments/submissions/${submissionId}/mark`,
        payload,
      );
      const updated = unwrapResponse<AssignmentSubmission>(res);
      toast.success(payload.publish ? 'Marks published' : 'Submission marked');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to mark submission.'));
      return null;
    }
  }, []);

  return {
    assignments,
    loading,
    fetchAssignments,
    getById,
    create,
    update,
    remove,
    generateDraft,
    listClassPushes,
    addClassPush,
    removeClassPush,
    listSubmissions,
    getSubmission,
    markSubmission,
  };
}
