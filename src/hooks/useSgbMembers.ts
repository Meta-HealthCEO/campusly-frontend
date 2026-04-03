import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SgbMember, InviteSgbMemberPayload } from '@/types';

export function useSgbMembers(statusFilter?: string) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [members, setMembers] = useState<SgbMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string> = { schoolId };
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get('/sgb/members', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : (raw.members ?? raw.data ?? []);
      setMembers(arr as SgbMember[]);
    } catch (err: unknown) {
      console.error('Failed to load SGB members', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, statusFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, refetch: fetchMembers, schoolId };
}

export function useSgbMemberMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const inviteMember = async (payload: InviteSgbMemberPayload): Promise<SgbMember> => {
    const res = await apiClient.post('/sgb/members/invite', payload);
    return unwrapResponse<SgbMember>(res);
  };

  const updateMember = async (id: string, data: Partial<SgbMember>): Promise<SgbMember> => {
    const res = await apiClient.put(`/sgb/members/${id}`, data);
    return unwrapResponse<SgbMember>(res);
  };

  const deleteMember = async (id: string): Promise<void> => {
    await apiClient.delete(`/sgb/members/${id}`);
  };

  return { inviteMember, updateMember, deleteMember, schoolId };
}
