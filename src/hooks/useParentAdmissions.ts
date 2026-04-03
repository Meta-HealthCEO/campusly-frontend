'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { AdmissionApplication } from '@/types/admissions';

export function useParentAdmissions() {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyApplications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admissions/my-applications');
      const data = unwrapList<AdmissionApplication>(response);
      setApplications(data);
    } catch (err: unknown) {
      console.error('Failed to fetch applications', err);
      toast.error('Failed to load your applications');
    } finally {
      setLoading(false);
    }
  }, []);

  return { applications, loading, fetchMyApplications };
}
