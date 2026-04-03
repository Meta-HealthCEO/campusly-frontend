'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { CostToCompanyReport } from '@/types';

export function usePayrollReports() {
  const [costToCompany, setCostToCompany] = useState<CostToCompanyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCostToCompany = useCallback(async (month: number, year: number) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/payroll/reports/cost-to-company', {
        params: { month, year },
      });
      setCostToCompany(unwrapResponse<CostToCompanyReport>(response));
    } catch (err: unknown) {
      console.error('Failed to fetch CTC report:', extractErrorMessage(err));
      setCostToCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportBankFile = useCallback(async (runId: string, format: 'acb' | 'csv') => {
    const response = await apiClient.get(`/payroll/runs/${runId}/bank-file`, {
      params: { format },
      responseType: 'blob',
    });
    const blob = new Blob([response.data as BlobPart], {
      type: format === 'csv' ? 'text/csv' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${runId}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const generateTaxCertificates = useCallback(async (taxYear: number, certificateType: 'IRP5' | 'IT3a') => {
    const response = await apiClient.post('/payroll/tax-certificates/generate', {
      taxYear,
      certificateType,
    });
    return unwrapResponse(response);
  }, []);

  const downloadTaxCertificate = useCallback(async (staffId: string, taxYear: number) => {
    const response = await apiClient.get(`/payroll/tax-certificates/${staffId}/${taxYear}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `IRP5-${taxYear}-${staffId}.pdf`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
  }, []);

  return {
    costToCompany, loading,
    fetchCostToCompany, exportBankFile,
    generateTaxCertificates, downloadTaxCertificate,
  };
}
