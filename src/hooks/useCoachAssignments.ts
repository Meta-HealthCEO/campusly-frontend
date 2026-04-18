'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type {
  CoachAssignment,
  CreateCoachAssignmentInput,
  CoachRole,
} from '@/types/coach-assignment';

interface ListFilters {
  userId?: string;
  teamId?: string;
}

export function useCoachAssignments(filters: ListFilters = {}) {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const paramKey = JSON.stringify(filters);

  const fetchAssignments = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/coach-assignments', { params: filters });
      setAssignments(unwrapList<CoachAssignment>(res));
    } catch {
      console.error('Failed to load coach assignments');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, paramKey]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  return { assignments, loading, refetch: fetchAssignments };
}

export function useMyCoachAssignments() {
  const user = useAuthStore((s) => s.user);
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMine = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/coach-assignments/me');
      setAssignments(unwrapList<CoachAssignment>(res));
    } catch {
      console.error('Failed to load my coach assignments');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  return { assignments, loading, refetch: fetchMine };
}

export async function createCoachAssignment(
  input: CreateCoachAssignmentInput,
): Promise<CoachAssignment> {
  try {
    const res = await apiClient.post('/sports/coach-assignments', input);
    toast.success('Coach assigned');
    return unwrapResponse<CoachAssignment>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to assign coach';
    toast.error(message);
    throw err;
  }
}

export async function updateCoachAssignment(
  id: string,
  input: { role?: CoachRole; isActive?: boolean },
): Promise<CoachAssignment> {
  try {
    const res = await apiClient.put(`/sports/coach-assignments/${id}`, input);
    toast.success('Assignment updated');
    return unwrapResponse<CoachAssignment>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to update assignment';
    toast.error(message);
    throw err;
  }
}

export async function deleteCoachAssignment(id: string): Promise<void> {
  try {
    await apiClient.delete(`/sports/coach-assignments/${id}`);
    toast.success('Coach unassigned');
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to unassign coach';
    toast.error(message);
    throw err;
  }
}
