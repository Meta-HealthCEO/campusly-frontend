import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface TeacherOnboardingStatus {
  /** Picked at least one CAPS grade with subjects (onboarding step 1). */
  hasScope: boolean;
  hasClass: boolean;
  hasStudent: boolean;
  hasFramework: boolean;
  hasFirstContent: boolean;
  /** Built a class unit, shown as a lesson (onboarding step 3). */
  hasUnit: boolean;
  dismissed: boolean;
}

const DEFAULT_STATUS: TeacherOnboardingStatus = {
  hasScope: false,
  hasClass: false,
  hasStudent: false,
  hasFramework: false,
  hasFirstContent: false,
  hasUnit: false,
  dismissed: false,
};

export function useOnboardingStatus() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const [status, setStatus] = useState<TeacherOnboardingStatus>(DEFAULT_STATUS);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const shouldFetch = isAuthenticated && user?.role === 'teacher' && user.isStandaloneTeacher === true;

    if (isAuthLoading) {
      setLoading(true);
      return;
    }

    if (!shouldFetch) {
      setStatus(DEFAULT_STATUS);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/auth/onboarding-status');
        const data = res.data?.data ?? res.data;
        if (cancelled) return;
        setStatus({
          hasScope: Boolean(data?.hasScope),
          hasClass: Boolean(data?.hasClass),
          hasStudent: Boolean(data?.hasStudent),
          hasFramework: Boolean(data?.hasFramework),
          hasFirstContent: Boolean(data?.hasFirstContent),
          hasUnit: Boolean(data?.hasUnit),
          dismissed: Boolean(data?.dismissed),
        });
      } catch (err: unknown) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setStatus(DEFAULT_STATUS);
          return;
        }
        setStatus(DEFAULT_STATUS);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading, user?.isStandaloneTeacher, user?.role, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k: number) => k + 1), []);

  const dismiss = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      await apiClient.post('/auth/onboarding-dismiss');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
    }
  }, [isAuthenticated]);

  return { status, loading, dismiss, refetch };
}
