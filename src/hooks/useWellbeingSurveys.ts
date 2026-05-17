'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { normalizeWellbeingSurvey } from '@/lib/wellbeing-helpers';
import { toast } from 'sonner';
import type {
  WellbeingSurvey, SurveyResults,
  CreateSurveyPayload, UpdateSurveyPayload,
} from '@/types';

export function useWellbeingSurveys() {
  const [surveys, setSurveys] = useState<WellbeingSurvey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<WellbeingSurvey | null>(null);
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/wellbeing/surveys');
      const data = unwrapList<unknown>(response)
        .map(normalizeWellbeingSurvey)
        .filter((survey): survey is WellbeingSurvey => survey !== null);
      setSurveys(data);
    } catch (err: unknown) {
      console.error('Failed to fetch surveys', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSurvey = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get(`/wellbeing/surveys/${id}`);
      const data = normalizeWellbeingSurvey(unwrapResponse<unknown>(response));
      if (!data) throw new Error('Invalid survey response');
      setSelectedSurvey(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch survey', err);
      return null;
    }
  }, []);

  const createSurvey = useCallback(async (data: CreateSurveyPayload) => {
    const response = await apiClient.post('/wellbeing/surveys', data);
    toast.success('Survey created');
    const survey = normalizeWellbeingSurvey(unwrapResponse<unknown>(response));
    if (!survey) throw new Error('Invalid survey response');
    return survey;
  }, []);

  const updateSurvey = useCallback(async (id: string, data: UpdateSurveyPayload) => {
    const response = await apiClient.put(`/wellbeing/surveys/${id}`, data);
    toast.success('Survey updated');
    const survey = normalizeWellbeingSurvey(unwrapResponse<unknown>(response));
    if (!survey) throw new Error('Invalid survey response');
    return survey;
  }, []);

  const deleteSurvey = useCallback(async (id: string) => {
    await apiClient.delete(`/wellbeing/surveys/${id}`);
    toast.success('Survey deleted');
  }, []);

  const fetchResults = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get(`/wellbeing/surveys/${id}/results`);
      const data = unwrapResponse<SurveyResults>(response);
      setResults(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch survey results', err);
      return null;
    }
  }, []);

  return {
    surveys, selectedSurvey, results, loading,
    fetchSurveys, fetchSurvey, createSurvey, updateSurvey, deleteSurvey,
    fetchResults, setSelectedSurvey,
  };
}
