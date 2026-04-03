'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { IncidentReportSummary } from '@/types';

export function useIncidentReports() {
  const [summary, setSummary] = useState<IncidentReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async (params?: {
    dateFrom?: string;
    dateTo?: string;
  }) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/incidents/reports/summary', { params });
      const data = unwrapResponse<IncidentReportSummary>(response);
      setSummary(data);
    } catch (err: unknown) {
      console.error('Failed to fetch incident report summary', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { summary, loading, fetchSummary };
}
