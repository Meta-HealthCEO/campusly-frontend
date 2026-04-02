'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  SportTeam, SportFixture, Season, MatchResult,
  PlayerAvailability, SeasonStanding, MvpTally, SportPlayer,
} from '@/types/sport';

function unwrapArray<T>(
  res: { data: unknown },
  key: string
): T[] {
  const raw = (res.data as Record<string, unknown>);
  const d = (raw.data ?? raw) as Record<string, unknown>;
  if (Array.isArray(d)) return d as T[];
  const arr = d[key] ?? d.data;
  return Array.isArray(arr) ? (arr as T[]) : [];
}

function unwrapSingle<T>(
  res: { data: unknown }
): T {
  const raw = (res.data as Record<string, unknown>);
  return (raw.data ?? raw) as T;
}

export function useTeams() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [teams, setTeams] = useState<SportTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/teams', { params: { schoolId } });
      setTeams(unwrapArray<SportTeam>(res, 'teams'));
    } catch {
      console.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  return { teams, loading, refetch: fetchTeams, schoolId };
}

export function useFixtures(teamId?: string) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [fixtures, setFixtures] = useState<SportFixture[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFixtures = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string> = { schoolId };
      if (teamId) params.teamId = teamId;
      const res = await apiClient.get('/sports/fixtures', { params });
      setFixtures(unwrapArray<SportFixture>(res, 'fixtures'));
    } catch {
      console.error('Failed to load fixtures');
    } finally {
      setLoading(false);
    }
  }, [schoolId, teamId]);

  useEffect(() => { fetchFixtures(); }, [fetchFixtures]);

  return { fixtures, loading, refetch: fetchFixtures, schoolId };
}

export function useSeasons() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSeasons = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/seasons', { params: { schoolId } });
      setSeasons(unwrapArray<Season>(res, 'seasons'));
    } catch {
      console.error('Failed to load seasons');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchSeasons(); }, [fetchSeasons]);

  return { seasons, loading, refetch: fetchSeasons, schoolId };
}

export function useStandings(seasonId: string | null) {
  const [standings, setStandings] = useState<SeasonStanding[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStandings = useCallback(async (recalculate = false) => {
    if (!seasonId) return;
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (recalculate) params.recalculate = 'true';
      const res = await apiClient.get(`/sports/seasons/${seasonId}/standings`, { params });
      const raw = (res.data as Record<string, unknown>);
      const d = raw.data ?? raw;
      setStandings(Array.isArray(d) ? (d as SeasonStanding[]) : []);
    } catch {
      console.error('Failed to load standings');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => { fetchStandings(); }, [fetchStandings]);

  return { standings, loading, fetchStandings };
}

export function useFixtureResult(fixtureId: string | null) {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchResult = useCallback(async () => {
    if (!fixtureId) { setResult(null); return; }
    try {
      setLoading(true);
      const res = await apiClient.get(`/sports/fixtures/${fixtureId}/result`);
      setResult(unwrapSingle<MatchResult>(res));
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => { fetchResult(); }, [fetchResult]);

  return { result, loading, refetch: fetchResult };
}

export function useAvailability(fixtureId: string | null) {
  const [availability, setAvailability] = useState<PlayerAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAvailability = useCallback(async () => {
    if (!fixtureId) { setAvailability([]); return; }
    try {
      setLoading(true);
      const res = await apiClient.get(`/sports/fixtures/${fixtureId}/availability`);
      const raw = (res.data as Record<string, unknown>);
      const d = raw.data ?? raw;
      setAvailability(Array.isArray(d) ? (d as PlayerAvailability[]) : []);
    } catch {
      console.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

  return { availability, loading, refetch: fetchAvailability };
}

export function useMvpVotes(fixtureId: string | null) {
  const [votes, setVotes] = useState<MvpTally[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVotes = useCallback(async () => {
    if (!fixtureId) { setVotes([]); return; }
    try {
      setLoading(true);
      const res = await apiClient.get(`/sports/fixtures/${fixtureId}/mvp`);
      const raw = (res.data as Record<string, unknown>);
      const d = raw.data ?? raw;
      setVotes(Array.isArray(d) ? d as MvpTally[] : []);
    } catch {
      console.error('Failed to load MVP votes');
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  useEffect(() => { fetchVotes(); }, [fetchVotes]);

  return { votes, loading, refetch: fetchVotes };
}

export function useStudentsList() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [students, setStudents] = useState<SportPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    async function fetch() {
      try {
        const res = await apiClient.get('/students', { params: { schoolId } });
        const raw = (res.data as Record<string, unknown>);
        const d = (raw.data ?? raw) as Record<string, unknown>;
        const arr = Array.isArray(d) ? d : (d.students ?? d.data ?? []);
        setStudents(
          (Array.isArray(arr) ? arr : []).map((s: Record<string, unknown>) => ({
            _id: (s._id as string) ?? (s.id as string) ?? '',
            firstName: (s.firstName as string) ?? '',
            lastName: (s.lastName as string) ?? '',
            userId: (s.userId as string) ?? '',
          }))
        );
      } catch {
        console.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [schoolId]);

  return { students, loading };
}

export function useStaffList() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [staff, setStaff] = useState<{ _id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    async function fetch() {
      try {
        const res = await apiClient.get('/staff', { params: { schoolId } });
        const raw = (res.data as Record<string, unknown>);
        const d = (raw.data ?? raw) as Record<string, unknown>;
        const arr = Array.isArray(d) ? d : (d.staff ?? d.data ?? []);
        setStaff(
          (Array.isArray(arr) ? arr : []).map((s: Record<string, unknown>) => ({
            _id: (s._id as string) ?? (s.id as string) ?? '',
            firstName: (s.firstName as string) ?? '',
            lastName: (s.lastName as string) ?? '',
            email: (s.email as string) ?? '',
          }))
        );
      } catch {
        console.error('Failed to load staff');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [schoolId]);

  return { staff, loading };
}

export function useFixtureResults(fixtures: { id: string }[]) {
  const [results, setResults] = useState<Map<string, Record<string, unknown>>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async () => {
    if (fixtures.length === 0) return;
    setLoading(true);
    const map = new Map<string, Record<string, unknown>>();
    const fetches = fixtures.map(async (f) => {
      try {
        const res = await apiClient.get(`/sports/fixtures/${f.id}/result`);
        const raw = res.data as Record<string, unknown>;
        const d = (raw.data ?? raw) as Record<string, unknown>;
        if (d && typeof d === 'object' && 'homeScore' in d) {
          map.set(f.id, d);
        }
      } catch {
        // no result for this fixture
      }
    });
    await Promise.all(fetches);
    setResults(map);
    setLoading(false);
  }, [fixtures]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return { results, loading, refetch: fetchResults };
}
