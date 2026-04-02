'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

export interface SizeRecommendationResult {
  studentId: string;
  gradeName: string;
  recommendedSize: string;
}

export function useSizeRecommendation() {
  const [recommendation, setRecommendation] = useState<SizeRecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRecommendation = useCallback(async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/uniforms/size-recommendation/${studentId}`);
      const raw = unwrapResponse(res);
      setRecommendation(raw as SizeRecommendationResult);
    } catch {
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { recommendation, loading, fetchRecommendation };
}
