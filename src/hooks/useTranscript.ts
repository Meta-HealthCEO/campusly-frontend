import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { TranscriptData } from '@/types';

interface TranscriptState {
  transcript: TranscriptData | null;
  loading: boolean;
  error: string | null;
}

export function useTranscript(studentId: string) {
  const [state, setState] = useState<TranscriptState>({
    transcript: null,
    loading: true,
    error: null,
  });

  const loadTranscript = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await apiClient.get(`/students/${studentId}/transcript`);
      const data = unwrapResponse<TranscriptData>(res);
      setState({ transcript: data, loading: false, error: null });
    } catch {
      setState({ transcript: null, loading: false, error: 'Failed to load transcript' });
    }
  }, [studentId]);

  useEffect(() => {
    loadTranscript();
  }, [loadTranscript]);

  return { ...state, refetch: loadTranscript };
}
