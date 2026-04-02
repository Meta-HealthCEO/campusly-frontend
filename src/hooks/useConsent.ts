import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ApiConsentForm, ApiConsentResponse } from '@/components/consent/types';
import { normalizeConsentForm, normalizeConsentResponse } from '@/components/consent/types';

/* ── Payload types ── */

export interface CreateConsentFormPayload {
  schoolId: string;
  title: string;
  type: string;
  createdBy: string;
  description?: string;
  expiryDate?: string;
  attachmentUrl?: string;
  requiresBothParents?: boolean;
}

export interface UpdateConsentFormPayload {
  title: string;
  type: string;
  description?: string;
  requiresBothParents: boolean;
  expiryDate?: string;
  attachmentUrl?: string;
}

export interface SubmitConsentResponsePayload {
  formId: string;
  studentId: string;
  parentId: string;
  response: 'granted' | 'denied';
  signature?: string;
  notes?: string;
}

export interface ConsentResponsesResult {
  responses: ApiConsentResponse[];
  total: number;
  totalPages: number;
}

/* ── Forms hook ── */

export function useConsentForms(typeFilter: string) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const userId = user?.id ?? '';
  const [forms, setForms] = useState<ApiConsentForm[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchForms = useCallback(async () => {
    if (!schoolId) return;
    try {
      const params: Record<string, string> = { schoolId };
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      const res = await apiClient.get('/consent/forms', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw)
        ? raw
        : ((raw as Record<string, unknown>).forms ??
            (raw as Record<string, unknown>).data ??
            []);
      setForms(
        (arr as Record<string, unknown>[]).map(normalizeConsentForm),
      );
    } catch {
      console.error('Failed to load consent forms');
    } finally {
      setLoading(false);
    }
  }, [schoolId, typeFilter]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  return { forms, loading, refetch: fetchForms, schoolId, userId };
}

/* ── Mutations hook ── */

export function useConsentMutations() {
  const createForm = async (payload: CreateConsentFormPayload): Promise<void> => {
    await apiClient.post('/consent/forms', payload);
  };

  const updateForm = async (formId: string, payload: UpdateConsentFormPayload): Promise<void> => {
    await apiClient.put(`/consent/forms/${formId}`, payload);
  };

  const deleteForm = async (formId: string): Promise<void> => {
    await apiClient.delete(`/consent/forms/${formId}`);
  };

  const submitResponse = async (payload: SubmitConsentResponsePayload): Promise<void> => {
    await apiClient.post('/consent/responses', payload);
  };

  const fetchResponses = async (
    formId: string,
    page: number,
    limit: number,
  ): Promise<ConsentResponsesResult> => {
    const res = await apiClient.get(
      `/consent/responses/form/${formId}`,
      { params: { page, limit } },
    );
    const raw = unwrapResponse(res);
    const arr = Array.isArray(raw)
      ? raw
      : (raw.responses ?? raw.data ?? []);
    const items = (arr as Record<string, unknown>[]).map(normalizeConsentResponse);
    return {
      responses: items,
      total: typeof raw.total === 'number' ? raw.total : items.length,
      totalPages: typeof raw.totalPages === 'number' ? raw.totalPages : 1,
    };
  };

  return { createForm, updateForm, deleteForm, submitResponse, fetchResponses };
}
