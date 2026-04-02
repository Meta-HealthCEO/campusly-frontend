'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import type {
  SportCodeConfig, MatchStats, PlayerCard, PersonalBest,
  RecordMatchStatsPayload, RecordPersonalBestPayload,
} from '@/types/sport';

function unwrap<T>(res: { data: unknown }): T {
  const raw = res.data as Record<string, unknown>;
  return (raw.data ?? raw) as T;
}

function unwrapArr<T>(res: { data: unknown }): T[] {
  const raw = res.data as Record<string, unknown>;
  const d = raw.data ?? raw;
  if (Array.isArray(d)) return d as T[];
  const inner = (d as Record<string, unknown>).data;
  return Array.isArray(inner) ? (inner as T[]) : [];
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

  return {
    sportConfigs, matchStats, playerCard, playerCards, personalBests, loading,
    loadSportConfigs, getSportConfig, recordMatchStats, getMatchStats,
    loadPlayerCard, loadPlayerCards, loadPersonalBests, recordPersonalBest,
    recalculateCard,
  };
}
