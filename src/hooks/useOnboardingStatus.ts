import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';

interface OnboardingStatus {
  hasClass: boolean;
  hasStudent: boolean;
  dismissed: boolean;
}

const DEFAULT_STATUS: OnboardingStatus = {
  hasClass: false,
  hasStudent: false,
  dismissed: false,
};

export function useOnboardingStatus() {
  const [status, setStatus] = useState<OnboardingStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiClient.get('/auth/onboarding-status');
        const data = res.data?.data ?? res.data;
        setStatus({
          hasClass: Boolean(data?.hasClass),
          hasStudent: Boolean(data?.hasStudent),
          dismissed: Boolean(data?.dismissed),
        });
      } catch (err: unknown) {
        console.error('Failed to fetch onboarding status', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const dismiss = useCallback(async () => {
    try {
      await apiClient.post('/auth/onboarding-dismiss');
    } catch (err: unknown) {
      console.error('Failed to dismiss onboarding', err);
    }
  }, []);

  return { status, loading, dismiss };
}
