import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  DigestPreference,
  UpdateDigestPreferencesInput,
  MorningDigest,
  EveningDigest,
  WeeklyDigest,
} from '@/types';

function mapPreference(raw: Record<string, unknown>): DigestPreference {
  return {
    id: (raw._id as string) ?? (raw.id as string) ?? '',
    parentId: (raw.parentId as string) ?? '',
    schoolId: (raw.schoolId as string) ?? '',
    dailyDigest: (raw.dailyDigest as boolean) ?? true,
    weeklyDigest: (raw.weeklyDigest as boolean) ?? true,
    digestChannel: (raw.digestChannel as DigestPreference['digestChannel']) ?? 'email',
    morningBriefTime: (raw.morningBriefTime as string) ?? '07:00',
    eveningBriefTime: (raw.eveningBriefTime as string) ?? '16:00',
  };
}

// ─── Preferences hook ──────────────────────────────────────────────────────

export function useDigestPreferences() {
  const user = useAuthStore((s) => s.user);
  const [preferences, setPreferences] = useState<DigestPreference | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/digest/preferences');
      setPreferences(mapPreference(unwrapResponse(res) as Record<string, unknown>));
    } catch {
      console.error('Failed to load digest preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  const updatePreferences = async (data: UpdateDigestPreferencesInput) => {
    const res = await apiClient.put('/digest/preferences', data);
    const mapped = mapPreference(unwrapResponse(res) as Record<string, unknown>);
    setPreferences(mapped);
    return mapped;
  };

  return { preferences, loading, fetchPreferences, updatePreferences };
}

// ─── Preview hooks ─────────────────────────────────────────────────────────

export function useDigestPreview(studentId: string) {
  const [morningDigest, setMorningDigest] = useState<MorningDigest | null>(null);
  const [eveningDigest, setEveningDigest] = useState<EveningDigest | null>(null);
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMorning = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/digest/preview/morning', { params: { studentId } });
      setMorningDigest(unwrapResponse(res) as MorningDigest);
    } catch {
      console.error('Failed to load morning digest');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const fetchEvening = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/digest/preview/evening', { params: { studentId } });
      setEveningDigest(unwrapResponse(res) as EveningDigest);
    } catch {
      console.error('Failed to load evening digest');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const fetchWeekly = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/digest/preview/weekly', { params: { studentId } });
      setWeeklyDigest(unwrapResponse(res) as WeeklyDigest);
    } catch {
      console.error('Failed to load weekly digest');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  return {
    morningDigest, eveningDigest, weeklyDigest, loading,
    fetchMorning, fetchEvening, fetchWeekly,
  };
}
