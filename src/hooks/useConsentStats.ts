import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConsentCompletionStats {
  totalTargeted: number;
  signed: number;
  declined: number;
  pending: number;
  completionPercentage: number;
}

export interface PendingParent {
  studentId: string;
  studentName: string;
}

// ─── Completion Stats Hook ───────────────────────────────────────────────────

export function useConsentCompletionStats(formId: string) {
  const [stats, setStats] = useState<ConsentCompletionStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/consent/forms/${formId}/stats`);
      const raw = unwrapResponse(res) as Record<string, unknown>;
      setStats({
        totalTargeted: (raw.totalTargeted as number) ?? 0,
        signed: (raw.signed as number) ?? 0,
        declined: (raw.declined as number) ?? 0,
        pending: (raw.pending as number) ?? 0,
        completionPercentage: (raw.completionPercentage as number) ?? 0,
      });
    } catch {
      console.error('Failed to load consent completion stats');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  return { stats, loading, fetchStats };
}

// ─── Pending Parents Hook ────────────────────────────────────────────────────

export function useConsentPendingParents(formId: string) {
  const [pendingParents, setPendingParents] = useState<PendingParent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingParents = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/consent/forms/${formId}/pending`);
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : [];
      setPendingParents(
        (arr as Record<string, unknown>[]).map((p) => ({
          studentId: (p.studentId as string) ?? '',
          studentName: (p.studentName as string) ?? '',
        })),
      );
    } catch {
      console.error('Failed to load pending parents');
    } finally {
      setLoading(false);
    }
  }, [formId]);

  return { pendingParents, loading, fetchPendingParents };
}

// ─── Export Hook ─────────────────────────────────────────────────────────────

export function useConsentExport() {
  const exportResponse = useCallback(
    async (formId: string, responseId: string) => {
      const res = await apiClient.get(
        `/consent/responses/${responseId}/export`,
        { params: { formId }, responseType: 'blob' },
      );
      const blob = new Blob([res.data as BlobPart], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `consent-response-${responseId}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [],
  );

  return { exportResponse };
}
