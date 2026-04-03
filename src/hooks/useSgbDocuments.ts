import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { SgbDocument, PolicyComplianceSummary } from '@/types';

export function useSgbDocuments(categoryFilter?: string) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [documents, setDocuments] = useState<SgbDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string> = { schoolId };
      if (categoryFilter && categoryFilter !== 'all') params.category = categoryFilter;
      const res = await apiClient.get('/sgb/documents', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : (raw.documents ?? raw.data ?? []);
      setDocuments(arr as SgbDocument[]);
    } catch (err: unknown) {
      console.error('Failed to load SGB documents', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, categoryFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, loading, refetch: fetchDocuments, schoolId };
}

export function useSgbDocumentMutations() {
  const uploadDocument = async (formData: FormData): Promise<SgbDocument> => {
    const res = await apiClient.post('/sgb/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapResponse<SgbDocument>(res);
  };

  const deleteDocument = async (id: string): Promise<void> => {
    await apiClient.delete(`/sgb/documents/${id}`);
  };

  const downloadDocument = (id: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4500/api';
    return `${baseUrl}/sgb/documents/${id}/download`;
  };

  return { uploadDocument, deleteDocument, downloadDocument };
}

export function useSgbCompliance() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [compliance, setCompliance] = useState<PolicyComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompliance = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sgb/policies/compliance', {
        params: { schoolId },
      });
      setCompliance(unwrapResponse<PolicyComplianceSummary>(res));
    } catch (err: unknown) {
      console.error('Failed to load compliance summary', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  return { compliance, loading, refetch: fetchCompliance };
}
