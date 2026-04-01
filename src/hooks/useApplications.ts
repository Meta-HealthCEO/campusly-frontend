import { useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { CareerApplication, Deadline } from '@/types';

export function useApplications(studentId: string) {
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!studentId) return;

    setLoading(true);
    setError(null);

    try {
      const [appsResult, deadlinesResult] = await Promise.allSettled([
        apiClient.get(`/careers/applications/student/${studentId}`),
        apiClient.get(`/careers/deadlines/student/${studentId}`),
      ]);

      if (appsResult.status === 'fulfilled') {
        const raw = unwrapResponse<CareerApplication[] | { items: CareerApplication[] }>(
          appsResult.value,
        );
        if (Array.isArray(raw)) {
          setApplications(raw);
        } else if (raw && typeof raw === 'object' && 'items' in raw) {
          setApplications(raw.items);
        } else {
          setApplications(unwrapList<CareerApplication>(appsResult.value, 'items'));
        }
      } else {
        console.error('Failed to load applications:', appsResult.reason);
      }

      if (deadlinesResult.status === 'fulfilled') {
        setDeadlines(unwrapList<Deadline>(deadlinesResult.value));
      } else {
        console.error('Failed to load deadlines:', deadlinesResult.reason);
      }

      // Set error only if both failed
      if (appsResult.status === 'rejected' && deadlinesResult.status === 'rejected') {
        setError('Failed to load applications and deadlines');
      }
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Failed to load application data');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createApplication = useCallback(
    async (programmeId: string, notes?: string): Promise<CareerApplication> => {
      const body: { programmeId: string; notes?: string } = { programmeId };
      if (notes) body.notes = notes;

      const response = await apiClient.post('/careers/applications', body);
      const created = unwrapResponse<CareerApplication>(response);
      await refetch();
      return created;
    },
    [refetch],
  );

  const updateApplication = useCallback(
    async (id: string, data: Partial<CareerApplication>): Promise<void> => {
      await apiClient.patch(`/careers/applications/${id}`, data);
      await refetch();
    },
    [refetch],
  );

  const uploadDocument = useCallback(
    async (
      applicationId: string,
      file: File,
      name: string,
      docType: string,
    ): Promise<void> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('type', docType);

      await apiClient.post(
        `/careers/applications/${applicationId}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      await refetch();
    },
    [refetch],
  );

  const getPrefill = useCallback(
    async (applicationId: string): Promise<Record<string, unknown>> => {
      const response = await apiClient.get(
        `/careers/applications/${applicationId}/prefill`,
      );
      return unwrapResponse<Record<string, unknown>>(response);
    },
    [],
  );

  return {
    applications,
    deadlines,
    loading,
    error,
    refetch,
    createApplication,
    updateApplication,
    uploadDocument,
    getPrefill,
  };
}
