'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  AdmissionApplication,
  AdmissionsListResponse,
  AdmissionStatus,
  BulkActionResult,
} from '@/types/admissions';

interface AdmissionsFilters {
  status?: string;
  gradeApplyingFor?: number;
  yearApplyingFor?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useAdmissionsAdmin() {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<AdmissionApplication | null>(null);

  const fetchApplications = useCallback(async (filters: AdmissionsFilters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.gradeApplyingFor !== undefined) params.set('gradeApplyingFor', String(filters.gradeApplyingFor));
      if (filters.yearApplyingFor !== undefined) params.set('yearApplyingFor', String(filters.yearApplyingFor));
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const response = await apiClient.get(`/admissions/applications?${params.toString()}`);
      const data = unwrapResponse<AdmissionsListResponse>(response);
      setApplications(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      console.error('Failed to fetch applications', err);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApplication = useCallback(async (id: string) => {
    try {
      const response = await apiClient.get(`/admissions/applications/${id}`);
      const data = unwrapResponse<AdmissionApplication>(response);
      setSelectedApplication(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to fetch application', err);
      toast.error('Failed to load application details');
      return null;
    }
  }, []);

  const updateStatus = useCallback(async (
    id: string,
    status: AdmissionStatus,
    notes?: string,
    notifyParent?: boolean,
  ) => {
    const response = await apiClient.put(`/admissions/applications/${id}/status`, {
      status,
      notes,
      notifyParent,
    });
    const data = unwrapResponse<AdmissionApplication>(response);
    toast.success(`Application moved to ${status.replace('_', ' ')}`);
    return data;
  }, []);

  const scheduleInterview = useCallback(async (
    id: string,
    interviewData: {
      interviewDate: string;
      interviewType: 'in_person' | 'virtual';
      interviewerName: string;
      venue?: string;
      notes?: string;
      notifyParent?: boolean;
    },
  ) => {
    const response = await apiClient.put(`/admissions/applications/${id}/interview`, interviewData);
    const data = unwrapResponse<AdmissionApplication>(response);
    toast.success('Interview scheduled successfully');
    return data;
  }, []);

  const bulkAction = useCallback(async (
    applicationIds: string[],
    action: 'accepted' | 'rejected',
    notes?: string,
    notifyParents?: boolean,
  ) => {
    const response = await apiClient.post('/admissions/applications/bulk-action', {
      applicationIds,
      action,
      notes,
      notifyParents,
    });
    const data = unwrapResponse<BulkActionResult>(response);
    toast.success(`${data.updated} applications ${action}`);
    return data;
  }, []);

  const deleteApplication = useCallback(async (id: string) => {
    await apiClient.delete(`/admissions/applications/${id}`);
    toast.success('Application deleted');
  }, []);

  return {
    applications,
    total,
    loading,
    selectedApplication,
    setSelectedApplication,
    fetchApplications,
    fetchApplication,
    updateStatus,
    scheduleInterview,
    bulkAction,
    deleteApplication,
  };
}
