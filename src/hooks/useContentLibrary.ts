import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  ContentResourceItem,
  ResourceFilters,
  CreateResourcePayload,
  UpdateResourcePayload,
  ReviewPayload,
  GenerateContentPayload,
} from '@/types';

const BASE = '/content-library/resources';

export function useContentLibrary() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [resources, setResources] = useState<ContentResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchResources = useCallback(
    async (filters?: ResourceFilters) => {
      if (!schoolId) return;
      setLoading(true);
      try {
        const params: Record<string, unknown> = { ...filters };
        const response = await apiClient.get(BASE, { params });
        const raw = response.data.data ?? response.data;
        if (Array.isArray(raw)) {
          setResources(raw as ContentResourceItem[]);
          setTotal(raw.length);
        } else if (typeof raw === 'object' && raw !== null) {
          const obj = raw as Record<string, unknown>;
          const arr = Array.isArray(obj.resources)
            ? (obj.resources as ContentResourceItem[])
            : unwrapList<ContentResourceItem>(response);
          setResources(arr);
          setTotal(typeof obj.total === 'number' ? obj.total : arr.length);
        }
      } catch (err: unknown) {
        console.error('Failed to load resources:', extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [schoolId],
  );

  const getResource = useCallback(
    async (id: string): Promise<ContentResourceItem | null> => {
      try {
        const response = await apiClient.get(`${BASE}/${id}`);
        return unwrapResponse<ContentResourceItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to load resource'));
        return null;
      }
    },
    [],
  );

  const createResource = useCallback(
    async (data: CreateResourcePayload): Promise<ContentResourceItem | null> => {
      try {
        const response = await apiClient.post(BASE, data);
        toast.success('Resource created');
        return unwrapResponse<ContentResourceItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to create resource'));
        return null;
      }
    },
    [schoolId],
  );

  const updateResource = useCallback(
    async (id: string, data: UpdateResourcePayload): Promise<ContentResourceItem | null> => {
      try {
        const response = await apiClient.put(`${BASE}/${id}`, data);
        toast.success('Resource updated');
        return unwrapResponse<ContentResourceItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to update resource'));
        return null;
      }
    },
    [],
  );

  const deleteResource = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiClient.delete(`${BASE}/${id}`);
        toast.success('Resource deleted');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to delete resource'));
        return false;
      }
    },
    [],
  );

  const submitForReview = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await apiClient.patch(`${BASE}/${id}/submit`);
        toast.success('Submitted for review');
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to submit for review'));
        return false;
      }
    },
    [],
  );

  const reviewResource = useCallback(
    async (id: string, data: ReviewPayload): Promise<boolean> => {
      try {
        await apiClient.patch(`${BASE}/${id}/review`, data);
        toast.success(`Resource ${data.action === 'approve' ? 'approved' : 'rejected'}`);
        return true;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to review resource'));
        return false;
      }
    },
    [],
  );

  const generateContent = useCallback(
    async (data: GenerateContentPayload): Promise<ContentResourceItem | null> => {
      try {
        const response = await apiClient.post(`${BASE}/generate`, data);
        toast.success('Content generated \u2014 saved as draft');
        return unwrapResponse<ContentResourceItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to generate content'));
        return null;
      }
    },
    [],
  );

  const refineResource = useCallback(
    async (id: string, instruction: string): Promise<ContentResourceItem | null> => {
      try {
        const response = await apiClient.post(`${BASE}/${id}/refine`, { instruction });
        return unwrapResponse<ContentResourceItem>(response);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to refine resource'));
        return null;
      }
    },
    [],
  );

  return {
    resources,
    total,
    loading,
    fetchResources,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    submitForReview,
    reviewResource,
    generateContent,
    refineResource,
  };
}
