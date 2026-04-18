'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type { FitnessSnapshot, AgeGroupBenchmark } from '@/types/fitness';

interface StudentBasic {
  id: string;
  _id?: string;
  admissionNumber: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  userId?: string | { firstName?: string; lastName?: string } | null;
}

export function useStudent(studentId: string) {
  const [student, setStudent] = useState<StudentBasic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/students/${studentId}`);
        const data = unwrapResponse<StudentBasic>(res);
        if (!cancelled) setStudent(data);
      } catch {
        if (!cancelled) setStudent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  return { student, loading };
}

export function usePlayerSnapshot(studentId: string, sportCode: string) {
  const [snapshot, setSnapshot] = useState<FitnessSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSnapshot = useCallback(async () => {
    if (!studentId || !sportCode) {
      setSnapshot(null);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.get(`/sports/players/${studentId}/fitness-snapshot`, {
        params: { sport: sportCode },
      });
      setSnapshot(unwrapResponse<FitnessSnapshot>(res));
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, sportCode]);

  useEffect(() => { fetchSnapshot(); }, [fetchSnapshot]);

  return { snapshot, loading, refetch: fetchSnapshot };
}

export function useBenchmarks(sportCode: string, ageGroup: string) {
  const [benchmarks, setBenchmarks] = useState<AgeGroupBenchmark[]>([]);

  useEffect(() => {
    if (!sportCode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/sports/benchmarks', {
          params: { sportCode, ageGroup },
        });
        if (!cancelled) setBenchmarks(unwrapList<AgeGroupBenchmark>(res));
      } catch {
        if (!cancelled) setBenchmarks([]);
      }
    })();
    return () => { cancelled = true; };
  }, [sportCode, ageGroup]);

  return benchmarks;
}
