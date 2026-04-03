'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { LeavePolicy, LeaveReportSummary } from '@/types';

interface ReportParams {
  year?: number;
  startDate?: string;
  endDate?: string;
}

export function useLeaveAdmin() {
  // ─── Policy state ─────────────────────────────────────────────────
  const [policy, setPolicy] = useState<LeavePolicy | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);

  // ─── Report state ─────────────────────────────────────────────────
  const [report, setReport] = useState<LeaveReportSummary | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchPolicy = useCallback(async (schoolId: string) => {
    setPolicyLoading(true);
    try {
      const response = await apiClient.get('/leave/policy', { params: { schoolId } });
      const data = unwrapResponse<LeavePolicy>(response);
      setPolicy(data);
    } catch (err: unknown) {
      console.error('Failed to fetch leave policy:', extractErrorMessage(err));
      setPolicy(null);
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  const updatePolicy = useCallback(async (data: Partial<LeavePolicy> & { schoolId: string }) => {
    const response = await apiClient.put('/leave/policy', data);
    const updated = unwrapResponse<LeavePolicy>(response);
    setPolicy(updated);
    return updated;
  }, []);

  const fetchReport = useCallback(async (schoolId: string, params?: ReportParams) => {
    setReportLoading(true);
    try {
      const response = await apiClient.get('/leave/reports/summary', {
        params: { ...params, schoolId },
      });
      const data = unwrapResponse<LeaveReportSummary>(response);
      setReport(data);
    } catch (err: unknown) {
      console.error('Failed to fetch leave report:', extractErrorMessage(err));
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }, []);

  return {
    policy, policyLoading, fetchPolicy, updatePolicy,
    report, reportLoading, fetchReport,
  };
}
