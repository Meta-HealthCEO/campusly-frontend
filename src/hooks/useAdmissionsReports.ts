'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { AdmissionsReportSummary } from '@/types/admissions';

export function useAdmissionsReports() {
  const [summary, setSummary] = useState<AdmissionsReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async (yearApplyingFor?: number) => {
    setLoading(true);
    try {
      const params = yearApplyingFor ? `?yearApplyingFor=${yearApplyingFor}` : '';
      const response = await apiClient.get(`/admissions/reports/summary${params}`);
      const data = unwrapResponse<AdmissionsReportSummary>(response);
      setSummary(data);
    } catch (err: unknown) {
      console.error('Failed to fetch report', err);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  return { summary, loading, fetchSummary };
}
