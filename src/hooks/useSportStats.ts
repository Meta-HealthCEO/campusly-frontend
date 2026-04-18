'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import type {
  SportCodeConfig, MatchStats, PlayerCard, PersonalBest,
  RecordMatchStatsPayload, RecordPersonalBestPayload,
  CareerStats, StudentMatchEntry, ParentSportsReport,
} from '@/types/sport';

function unwrap<T>(res: { data: unknown }): T {
  const raw = res.data as Record<string, unknown>;
  return (raw.data ?? raw) as T;
}

function unwrapArr<T>(res: { data: unknown }): T[] {
  const raw = res.data as Record<string, unknown>;
  const d = raw.data ?? raw;
  if (Array.isArray(d)) return d as T[];
  const obj = d as Record<string, unknown>;
  // Try common nested keys (cards, teams, fixtures, items, results, data)
  for (const key of ['data', 'cards', 'items', 'results', 'teams', 'fixtures', 'sessions']) {
    const v = obj[key];
    if (Array.isArray(v)) return v as T[];
  }
  // Last resort: first array-valued field
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}

export function useSportStats() {
  const [sportConfigs, setSportConfigs] = useState<SportCodeConfig[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [playerCard, setPlayerCard] = useState<PlayerCard | null>(null);
  const [playerCards, setPlayerCards] = useState<PlayerCard[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSportConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/configs');
      setSportConfigs(unwrapArr<SportCodeConfig>(res));
    } catch (err: unknown) {
      console.error('Failed to load sport configs', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getSportConfig = useCallback(async (code: string): Promise<SportCodeConfig | null> => {
    try {
      const res = await apiClient.get(`/sports/configs/${code}`);
      return unwrap<SportCodeConfig>(res);
    } catch (err: unknown) {
      console.error('Failed to load sport config', err);
      return null;
    }
  }, []);

  const recordMatchStats = useCallback(async (fixtureId: string, payload: RecordMatchStatsPayload) => {
    const res = await apiClient.post(`/sports/fixtures/${fixtureId}/stats`, payload);
    toast.success('Match stats recorded');
    return unwrap<MatchStats>(res);
  }, []);

  const getMatchStats = useCallback(async (fixtureId: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/sports/fixtures/${fixtureId}/stats`);
      const data = unwrap<MatchStats>(res);
      setMatchStats(data);
      return data;
    } catch (err: unknown) {
      setMatchStats(null);
      console.error('Failed to load match stats', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlayerCard = useCallback(async (studentId: string, sportCode: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/sports/players/${studentId}/card`, { params: { sportCode } });
      setPlayerCard(unwrap<PlayerCard>(res));
    } catch (err: unknown) {
      setPlayerCard(null);
      console.error('Failed to load player card', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlayerCards = useCallback(async (sportCode?: string, page?: number, limit?: number) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (sportCode) params.sportCode = sportCode;
      if (page) params.page = page;
      if (limit) params.limit = limit;
      const res = await apiClient.get('/sports/cards', { params });
      setPlayerCards(unwrapArr<PlayerCard>(res));
    } catch (err: unknown) {
      console.error('Failed to load player cards', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPersonalBests = useCallback(async (studentId: string, sportCode?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (sportCode) params.sportCode = sportCode;
      const res = await apiClient.get(`/sports/players/${studentId}/personal-bests`, { params });
      setPersonalBests(unwrapArr<PersonalBest>(res));
    } catch (err: unknown) {
      console.error('Failed to load personal bests', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const recordPersonalBest = useCallback(async (studentId: string, payload: RecordPersonalBestPayload) => {
    const res = await apiClient.post(`/sports/players/${studentId}/personal-best`, payload);
    toast.success('Personal best recorded');
    return unwrap<PersonalBest>(res);
  }, []);

  const recalculateCard = useCallback(async (studentId: string, sportCode: string) => {
    const res = await apiClient.post(`/sports/players/${studentId}/recalculate-card`, null, {
      params: { sportCode },
    });
    toast.success('Player card recalculated');
    return unwrap<PlayerCard>(res);
  }, []);

  const loadPlayerCardsByStudent = useCallback(async (studentId: string, sportCode?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (sportCode) params.sportCode = sportCode;
      const res = await apiClient.get(`/sports/players/${studentId}/card`, { params });
      const data = unwrap<PlayerCard | PlayerCard[]>(res);
      const cards = Array.isArray(data) ? data : [data];
      setPlayerCards(cards);
      return cards;
    } catch (err: unknown) {
      console.error('Failed to load player cards for student', err);
      setPlayerCards([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getPlayerCareerStats = useCallback(async (studentId: string, sportCode: string): Promise<CareerStats | null> => {
    try {
      const res = await apiClient.get(`/sports/players/${studentId}/stats`, { params: { sportCode } });
      return unwrap<CareerStats>(res);
    } catch (err: unknown) {
      console.error('Failed to load career stats', err);
      return null;
    }
  }, []);

  const getStudentMatchHistory = useCallback(async (studentId: string, sportCode: string): Promise<StudentMatchEntry[]> => {
    try {
      const res = await apiClient.get(`/sports/players/${studentId}/stats`, {
        params: { sportCode, include: 'matches' },
      });
      const data = unwrap<{ matches?: StudentMatchEntry[] }>(res);
      return data.matches ?? [];
    } catch (err: unknown) {
      console.error('Failed to load match history', err);
      return [];
    }
  }, []);

  const getParentSportsReport = useCallback(async (studentId: string): Promise<ParentSportsReport | null> => {
    try {
      const res = await apiClient.get(`/sports/ai/player/${studentId}/parent-report`);
      return unwrap<ParentSportsReport>(res);
    } catch (err: unknown) {
      console.error('Failed to load parent sports report', err);
      return null;
    }
  }, []);

  return {
    sportConfigs, matchStats, playerCard, playerCards, personalBests, loading,
    loadSportConfigs, getSportConfig, recordMatchStats, getMatchStats,
    loadPlayerCard, loadPlayerCards, loadPlayerCardsByStudent,
    loadPersonalBests, recordPersonalBest, recalculateCard,
    getPlayerCareerStats, getStudentMatchHistory, getParentSportsReport,
  };
}
