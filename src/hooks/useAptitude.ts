'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { AptitudeQuestionnaire, AptitudeResult } from '@/types';

interface AptitudeAnswer {
  questionId: string;
  value: number;
}

interface UseAptitudeReturn {
  questionnaire: AptitudeQuestionnaire | null;
  result: AptitudeResult | null;
  loading: boolean;
  error: string | null;
  fetchQuestions: () => Promise<void>;
  submitAnswers: (answers: AptitudeAnswer[]) => Promise<AptitudeResult>;
  fetchResults: (studentId: string) => Promise<void>;
}

export function useAptitude(): UseAptitudeReturn {
  const [questionnaire, setQuestionnaire] = useState<AptitudeQuestionnaire | null>(null);
  const [result, setResult] = useState<AptitudeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/careers/aptitude/questions');
      const data = unwrapResponse<AptitudeQuestionnaire>(response);
      setQuestionnaire(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load aptitude questions';
      setError(message);
      console.error('Failed to load aptitude questions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswers = useCallback(async (answers: AptitudeAnswer[]): Promise<AptitudeResult> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/careers/aptitude/submit', { answers });
      const data = unwrapResponse<AptitudeResult>(response);
      setResult(data);
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit aptitude answers';
      setError(message);
      console.error('Failed to submit aptitude answers:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResults = useCallback(async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/careers/aptitude/student/${studentId}/results`);
      const data = unwrapResponse<AptitudeResult>(response);
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load aptitude results';
      setError(message);
      console.error('Failed to load aptitude results:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    questionnaire,
    result,
    loading,
    error,
    fetchQuestions,
    submitAnswers,
    fetchResults,
  };
}
