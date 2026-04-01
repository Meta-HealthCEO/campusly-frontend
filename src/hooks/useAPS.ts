import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type { APSResult, APSSimulationAdjustment, APSSimulationResult } from '@/types';

interface UseAPSReturn {
  aps: APSResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  simulate: (adjustments: APSSimulationAdjustment[]) => Promise<APSSimulationResult>;
}

export function useAPS(studentId: string): UseAPSReturn {
  const [aps, setAps] = useState<APSResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAPS = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/careers/aps/student/${studentId}`);
      const data = unwrapResponse<APSResult>(response);
      setAps(data);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load APS data');
      setError(msg);
      console.error('Failed to load APS data:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const simulate = useCallback(
    async (adjustments: APSSimulationAdjustment[]): Promise<APSSimulationResult> => {
      const response = await apiClient.post(
        `/careers/aps/student/${studentId}/simulate`,
        { adjustments },
      );
      return unwrapResponse<APSSimulationResult>(response);
    },
    [studentId],
  );

  useEffect(() => {
    fetchAPS();
  }, [fetchAPS]);

  return { aps, loading, error, refetch: fetchAPS, simulate };
}
