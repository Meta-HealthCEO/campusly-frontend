'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Payslip } from '@/types';

function triggerDownload(data: unknown, filename: string): void {
  const blob = new Blob([data as BlobPart]);
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(downloadUrl);
}

export function usePayslips() {
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPayslip = useCallback(async (runId: string, staffId: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/payroll/payslips/${runId}/${staffId}`);
      const data = unwrapResponse(response);
      setPayslip(data as Payslip);
    } catch (err: unknown) {
      console.error('Failed to load payslip', err);
      toast.error('Failed to load payslip');
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadPayslip = useCallback(async (runId: string, staffId: string): Promise<void> => {
    try {
      const response = await apiClient.get(
        `/payroll/payslips/${runId}/${staffId}/pdf`,
        { responseType: 'blob' },
      );
      triggerDownload(response.data, `payslip-${staffId}-${runId}.pdf`);
      toast.success('Payslip downloaded successfully');
    } catch (err: unknown) {
      console.error('Failed to download payslip', err);
      toast.error('Failed to download payslip');
    }
  }, []);

  const downloadBatchPayslips = useCallback(async (runId: string): Promise<void> => {
    try {
      const response = await apiClient.post(
        `/payroll/payslips/${runId}/batch-pdf`,
        {},
        { responseType: 'blob' },
      );
      triggerDownload(response.data, `payslips-batch-${runId}.zip`);
      toast.success('Batch payslips downloaded successfully');
    } catch (err: unknown) {
      console.error('Failed to download batch payslips', err);
      toast.error('Failed to download batch payslips');
    }
  }, []);

  return { payslip, loading, fetchPayslip, downloadPayslip, downloadBatchPayslips };
}
