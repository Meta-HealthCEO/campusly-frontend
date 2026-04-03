'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  AssetSummaryReport,
  DepreciationReport,
  MaintenanceCostReport,
} from '@/types';

export function useAssetReports() {
  const [summary, setSummary] = useState<AssetSummaryReport | null>(null);
  const [depreciation, setDepreciation] = useState<DepreciationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assets/reports/summary');
      setSummary(unwrapResponse<AssetSummaryReport>(res));
    } catch (err: unknown) {
      console.error('Failed to fetch asset summary:', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepreciation = useCallback(async (asOfDate?: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assets/depreciation', {
        params: asOfDate ? { asOfDate } : undefined,
      });
      setDepreciation(unwrapResponse<DepreciationReport>(res));
    } catch (err: unknown) {
      console.error('Failed to fetch depreciation report:', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReplacementDue = useCallback(async (withinMonths = 12) => {
    const res = await apiClient.get('/assets/reports/replacement-due', {
      params: { withinMonths },
    });
    return unwrapResponse(res);
  }, []);

  const fetchMaintenanceCosts = useCallback(async (year: number): Promise<MaintenanceCostReport> => {
    const res = await apiClient.get('/assets/reports/maintenance-costs', { params: { year } });
    return unwrapResponse<MaintenanceCostReport>(res);
  }, []);

  const generateQrCode = useCallback(async (assetId: string): Promise<string> => {
    const res = await apiClient.get(`/assets/${assetId}/qr-code`);
    const raw = unwrapResponse<{ qrCode: string }>(res);
    return (raw as { qrCode: string }).qrCode;
  }, []);

  const generateBatchQrCodes = useCallback(async (assetIds: string[]): Promise<string> => {
    const res = await apiClient.post('/assets/qr-codes/batch', { assetIds });
    const raw = unwrapResponse<{ url: string }>(res);
    return (raw as { url: string }).url;
  }, []);

  return {
    summary,
    depreciation,
    loading,
    fetchSummary,
    fetchDepreciation,
    fetchReplacementDue,
    fetchMaintenanceCosts,
    generateQrCode,
    generateBatchQrCodes,
  };
}
