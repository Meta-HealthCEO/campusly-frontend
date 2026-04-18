'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type {
  FitnessTestResult,
  BiometricMeasurement,
  CreateFitnessTestInput,
  CreateBiometricInput,
} from '@/types/fitness';

interface TestFilters {
  studentId?: string;
  teamId?: string;
  testType?: string;
  from?: string;
  to?: string;
}

interface BiometricFilters {
  studentId?: string;
  from?: string;
  to?: string;
}

export function useFitnessTests(filters: TestFilters = {}) {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [tests, setTests] = useState<FitnessTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const paramKey = JSON.stringify(filters);

  const fetchTests = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/fitness/tests', { params: filters });
      setTests(unwrapList<FitnessTestResult>(res));
    } catch {
      console.error('Failed to load fitness tests');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, paramKey]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  return { tests, loading, refetch: fetchTests };
}

export async function createFitnessTest(
  input: CreateFitnessTestInput,
): Promise<FitnessTestResult> {
  try {
    const res = await apiClient.post('/sports/fitness/tests', input);
    toast.success('Fitness test recorded');
    return unwrapResponse<FitnessTestResult>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to record test';
    toast.error(message);
    throw err;
  }
}

export async function deleteFitnessTest(id: string): Promise<void> {
  try {
    await apiClient.delete(`/sports/fitness/tests/${id}`);
    toast.success('Fitness test deleted');
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to delete test';
    toast.error(message);
    throw err;
  }
}

export async function getPlayerProgression(
  studentId: string,
): Promise<Record<string, FitnessTestResult[]>> {
  const res = await apiClient.get(`/sports/fitness/players/${studentId}/progression`);
  return unwrapResponse<Record<string, FitnessTestResult[]>>(res);
}

export function useBiometrics(filters: BiometricFilters = {}) {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [measurements, setMeasurements] = useState<BiometricMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const paramKey = JSON.stringify(filters);

  const fetchMeasurements = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/fitness/biometrics', { params: filters });
      setMeasurements(unwrapList<BiometricMeasurement>(res));
    } catch {
      console.error('Failed to load biometrics');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, paramKey]);

  useEffect(() => { fetchMeasurements(); }, [fetchMeasurements]);

  return { measurements, loading, refetch: fetchMeasurements };
}

export async function createBiometric(
  input: CreateBiometricInput,
): Promise<BiometricMeasurement> {
  try {
    const res = await apiClient.post('/sports/fitness/biometrics', input);
    toast.success('Biometric recorded');
    return unwrapResponse<BiometricMeasurement>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to record biometric';
    toast.error(message);
    throw err;
  }
}

export async function deleteBiometric(id: string): Promise<void> {
  try {
    await apiClient.delete(`/sports/fitness/biometrics/${id}`);
    toast.success('Biometric deleted');
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to delete biometric';
    toast.error(message);
    throw err;
  }
}
