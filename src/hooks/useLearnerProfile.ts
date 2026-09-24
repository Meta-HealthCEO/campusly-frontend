'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import type { LearnerProfileData } from '@/types/student-360';

export function useLearnerProfile() {
  const [profile, setProfile] = useState<LearnerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/reports/student/${studentId}/360`);
      setProfile(unwrapResponse<LearnerProfileData>(response));
    } catch (err: unknown) {
      console.error('Failed to load learner profile', err);
      setProfile(null);
      setError(extractErrorMessage(err, "We couldn't load this learner's profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, loadProfile };
}
