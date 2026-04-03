'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { WellbeingSurvey, SubmitSurveyResponsePayload } from '@/types';

export function useStudentSurvey() {
  const [activeSurvey, setActiveSurvey] = useState<WellbeingSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const fetchActiveSurvey = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/wellbeing/surveys/active');
      const data = unwrapResponse<WellbeingSurvey | null>(response);
      setActiveSurvey(data);
    } catch (err: unknown) {
      console.error('Failed to fetch active survey', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitResponse = useCallback(async (
    surveyId: string, data: SubmitSurveyResponsePayload,
  ) => {
    await apiClient.post(`/wellbeing/surveys/${surveyId}/respond`, data);
    toast.success('Response submitted successfully');
    setSubmitted(true);
    setActiveSurvey(null);
  }, []);

  return { activeSurvey, loading, submitted, fetchActiveSurvey, submitResponse };
}
