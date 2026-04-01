'use client';

import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  StudentPortfolio,
  Extracurricular,
  CommunityServiceEntry,
} from '@/types';

interface UsePortfolioReturn {
  portfolio: StudentPortfolio | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addExtracurricular: (data: Omit<Extracurricular, 'verifiedBy'>) => Promise<void>;
  addCommunityService: (data: Omit<CommunityServiceEntry, 'verifiedBy'>) => Promise<void>;
  downloadTranscript: () => Promise<void>;
}

export function usePortfolio(studentId: string): UsePortfolioReturn {
  const [portfolio, setPortfolio] = useState<StudentPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/careers/portfolio/student/${studentId}`);
      const data = unwrapResponse<StudentPortfolio>(res);
      setPortfolio(data);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load portfolio');
      setError(msg);
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const addExtracurricular = useCallback(
    async (data: Omit<Extracurricular, 'verifiedBy'>) => {
      if (!studentId) return;
      try {
        await apiClient.post(
          `/careers/portfolio/student/${studentId}/extracurricular`,
          data,
        );
        await fetchPortfolio();
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Failed to add extracurricular');
        setError(msg);
        throw new Error(msg);
      }
    },
    [studentId, fetchPortfolio],
  );

  const addCommunityService = useCallback(
    async (data: Omit<CommunityServiceEntry, 'verifiedBy'>) => {
      if (!studentId) return;
      try {
        await apiClient.post(
          `/careers/portfolio/student/${studentId}/community-service`,
          data,
        );
        await fetchPortfolio();
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Failed to add community service');
        setError(msg);
        throw new Error(msg);
      }
    },
    [studentId, fetchPortfolio],
  );

  const downloadTranscript = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await apiClient.get(
        `/careers/portfolio/student/${studentId}/transcript`,
        { responseType: 'blob' },
      );
      const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'transcript.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to download transcript');
      setError(msg);
      throw new Error(msg);
    }
  }, [studentId]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return {
    portfolio,
    loading,
    error,
    refetch: fetchPortfolio,
    addExtracurricular,
    addCommunityService,
    downloadTranscript,
  };
}
