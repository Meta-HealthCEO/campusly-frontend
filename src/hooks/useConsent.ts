import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ApiConsentForm } from '@/components/consent/types';
import { normalizeConsentForm } from '@/components/consent/types';

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
      const raw = res.data.data ?? res.data;
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
