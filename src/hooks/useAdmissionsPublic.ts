'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import type {
  AdmissionSubmitResponse,
  AdmissionStatusCheckResponse,
  GradeCapacity,
} from '@/types/admissions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api';

/**
 * Public admissions hook — no auth required.
 * Uses raw axios (not apiClient) to avoid injecting auth headers.
 */
export function useAdmissionsPublic() {
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [capacity, setCapacity] = useState<GradeCapacity[]>([]);
  const [statusResult, setStatusResult] = useState<AdmissionStatusCheckResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<AdmissionSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCapacity = useCallback(async (schoolId: string) => {
    setCapacityLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/admissions/public/capacity/${schoolId}`);
      const raw = response.data?.data ?? response.data;
      setCapacity(Array.isArray(raw) ? raw as GradeCapacity[] : []);
    } catch (err: unknown) {
      console.error('Failed to fetch capacity', err);
      setError('Failed to load capacity information');
    } finally {
      setCapacityLoading(false);
    }
  }, []);

  const submitApplication = useCallback(async (formData: FormData) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/admissions/public/apply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = response.data?.data ?? response.data;
      setSubmitResult(data as AdmissionSubmitResponse);
      return data as AdmissionSubmitResponse;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      const msg = axiosErr.response?.data?.error
        ?? axiosErr.response?.data?.message
        ?? 'Failed to submit application';
      setError(msg);
      throw new Error(msg);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const checkStatus = useCallback(async (trackingToken: string) => {
    setChecking(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/admissions/public/status/${trackingToken}`);
      const data = response.data?.data ?? response.data;
      setStatusResult(data as AdmissionStatusCheckResponse);
      return data as AdmissionStatusCheckResponse;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      const msg = axiosErr.response?.data?.error
        ?? axiosErr.response?.data?.message
        ?? 'Application not found';
      setError(msg);
      setStatusResult(null);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  return {
    submitting,
    checking,
    capacityLoading,
    capacity,
    statusResult,
    submitResult,
    error,
    fetchCapacity,
    submitApplication,
    checkStatus,
  };
}
